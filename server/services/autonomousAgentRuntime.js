const { getDb } = require('../config/db')
const { generatePlanForStudent } = require('../controllers/ai.controller')

let workerTimer = null
let inProgress = false

function safeJsonParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback
  } catch (error) {
    return fallback
  }
}

function enqueueGoal({ studentId, goalType = 'refresh_roadmap', priority = 5, payload = {}, maxRetries = 3 }) {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO agent_goals (student_id, goal_type, status, priority, payload_json, retry_count, max_retries, next_run_at)
    VALUES (?, ?, 'queued', ?, ?, 0, ?, CURRENT_TIMESTAMP)
  `)

  const result = stmt.run(
    studentId,
    goalType,
    Number.isFinite(Number(priority)) ? Number(priority) : 5,
    JSON.stringify(payload || {}),
    Number.isFinite(Number(maxRetries)) ? Number(maxRetries) : 3
  )

  return {
    goalId: result.lastInsertRowid
  }
}

function listGoals({ studentId, isAdmin = false, status, limit = 30 }) {
  const db = getDb()
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 30))
  const where = []
  const params = []

  if (!isAdmin) {
    where.push('student_id = ?')
    params.push(studentId)
  } else if (studentId) {
    where.push('student_id = ?')
    params.push(studentId)
  }

  if (status) {
    where.push('status = ?')
    params.push(status)
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''
  return db.prepare(`
    SELECT id, student_id, goal_type, status, priority, retry_count, max_retries, next_run_at, started_at, completed_at, created_at, last_error
    FROM agent_goals
    ${whereClause}
    ORDER BY id DESC
    LIMIT ?
  `).all(...params, safeLimit)
}

async function executeGoal(goalRow) {
  const payload = safeJsonParse(goalRow.payload_json, {}) || {}

  switch (goalRow.goal_type) {
    case 'refresh_roadmap': {
      const roadmap = await generatePlanForStudent({
        studentId: goalRow.student_id,
        company: payload.company,
        role: payload.role,
        daysRequired: payload.daysRequired || 30
      })

      return {
        actionLog: `Generated roadmap for ${roadmap.company} ${roadmap.selectedRole}`,
        result: roadmap
      }
    }

    default:
      throw new Error(`Unsupported goal_type: ${goalRow.goal_type}`)
  }
}

async function processQueueOnce(maxItems = 1) {
  if (inProgress) {
    return { processed: 0, skipped: true }
  }

  inProgress = true
  const db = getDb()
  let processed = 0

  try {
    const safeMaxItems = Math.max(1, Math.min(20, Number(maxItems) || 1))

    for (let step = 0; step < safeMaxItems; step += 1) {
      const goal = db.prepare(`
        SELECT *
        FROM agent_goals
        WHERE status IN ('queued', 'retry')
          AND datetime(next_run_at) <= datetime('now')
        ORDER BY priority ASC, id ASC
        LIMIT 1
      `).get()

      if (!goal) {
        break
      }

      const nextAttempt = (goal.retry_count || 0) + 1
      db.prepare(`
        UPDATE agent_goals
        SET status = 'running', started_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(goal.id)

      try {
        const execution = await executeGoal(goal)

        db.prepare(`
          UPDATE agent_goals
          SET status = 'completed',
              result_json = ?,
              completed_at = CURRENT_TIMESTAMP,
              last_error = NULL
          WHERE id = ?
        `).run(JSON.stringify(execution.result || {}), goal.id)

        db.prepare(`
          INSERT INTO agent_runs(goal_id, attempt_number, status, action_log, error_message)
          VALUES (?, ?, 'completed', ?, NULL)
        `).run(goal.id, nextAttempt, execution.actionLog || 'Completed goal execution')

        processed += 1
      } catch (error) {
        const maxRetries = Number(goal.max_retries || 3)
        const canRetry = nextAttempt < maxRetries
        const nextStatus = canRetry ? 'retry' : 'failed'
        const nextRunAtExpr = canRetry ? "datetime('now', '+5 minutes')" : 'CURRENT_TIMESTAMP'

        db.prepare(`
          UPDATE agent_goals
          SET status = ?,
              retry_count = ?,
              last_error = ?,
              next_run_at = ${nextRunAtExpr},
              completed_at = CASE WHEN ? = 'failed' THEN CURRENT_TIMESTAMP ELSE completed_at END
          WHERE id = ?
        `).run(nextStatus, nextAttempt, error.message, nextStatus, goal.id)

        db.prepare(`
          INSERT INTO agent_runs(goal_id, attempt_number, status, action_log, error_message)
          VALUES (?, ?, ?, 'Execution failed', ?)
        `).run(goal.id, nextAttempt, nextStatus, error.message)

        processed += 1
      }
    }

    return { processed, skipped: false }
  } finally {
    inProgress = false
  }
}

function startAutonomousWorker(intervalMs = 15000) {
  if (workerTimer) {
    return
  }

  const safeInterval = Math.max(3000, Number(intervalMs) || 15000)
  workerTimer = setInterval(() => {
    processQueueOnce(3).catch((error) => {
      console.error('autonomous worker error', error)
    })
  }, safeInterval)
}

function stopAutonomousWorker() {
  if (!workerTimer) {
    return
  }

  clearInterval(workerTimer)
  workerTimer = null
}

module.exports = {
  enqueueGoal,
  listGoals,
  processQueueOnce,
  startAutonomousWorker,
  stopAutonomousWorker
}