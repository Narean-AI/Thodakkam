/**
 * Database Strategy Utility
 * 
 * Supports two approaches for storing and retrieving student scoreboards:
 * 1. CENTRALIZED (current): Single scoreboard table with user_id column [RECOMMENDED]
 * 2. DISTRIBUTED: Separate database per student for complete isolation
 * 
 * Switch between strategies by changing DATABASE_STRATEGY constant
 */

const DATABASE_STRATEGY = 'CENTRALIZED' // 'CENTRALIZED' or 'DISTRIBUTED'

/**
 * Centralized Strategy - Single Table Approach
 * - All scores in one scoreboard table
 * - Students filtered by WHERE user_id = ?
 * - Admins see all scores
 * Pros: Simple, efficient, normalized
 */
const CENTRALIZED = {
  name: 'CENTRALIZED',
  description: 'Single scoreboard table with user_id column',
  saveScore: (db, userId, scoreData) => {
    // scoreData = { testTitle, company, role, score, totalQuestions, duration_seconds, avg_seconds_per_question, attempts, accuracy_percent }
    const stmt = db.prepare(`
      INSERT INTO scoreboard (test_title, company, role, score, total_questions, duration_seconds, avg_seconds_per_question, attempts, accuracy_percent, user_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    return stmt.run(
      scoreData.testTitle,
      scoreData.company || null,
      scoreData.role || null,
      scoreData.score,
      scoreData.totalQuestions,
      scoreData.duration_seconds || null,
      scoreData.avg_seconds_per_question || null,
      scoreData.attempts || 1,
      scoreData.accuracy_percent || null,
      userId
    )
  },
  getScoreboard: (db, userRole, userId) => {
    let results = []
    
    if (userRole === 'student') {
      results = db.prepare(`
        SELECT id, test_title, company, role, score, total_questions, created_at, user_id 
        FROM scoreboard 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT 100
      `).all(userId)
    } else if (userRole === 'admin' || userRole === 'super_admin') {
      results = db.prepare(`
        SELECT id, test_title, company, role, score, total_questions, created_at, user_id 
        FROM scoreboard 
        ORDER BY created_at DESC 
        LIMIT 500
      `).all()
    }
    
    return results
  }
}

/**
 * Distributed Strategy - Per-Student Database Approach
 * - Each student has separate SQLite file: db_student_{userId}.sqlite
 * - Admins must aggregate from all student databases
 * Pros: Complete isolation, can archive independently
 * Cons: Multiple DB handles, complex aggregation, slower admin queries
 * 
 * TODO: Implement this strategy if needed in future
 */
const DISTRIBUTED = {
  name: 'DISTRIBUTED',
  description: 'Separate database file per student for complete isolation',
  saveScore: (db, userId, scoreData) => {
    throw new Error('DISTRIBUTED strategy not yet implemented. Use CENTRALIZED instead.')
  },
  getScoreboard: (db, userRole, userId) => {
    throw new Error('DISTRIBUTED strategy not yet implemented. Use CENTRALIZED instead.')
  }
}

const strategies = {
  CENTRALIZED,
  DISTRIBUTED
}

function getStrategy() {
  const strategy = strategies[DATABASE_STRATEGY]
  if (!strategy) {
    throw new Error(`Unknown DATABASE_STRATEGY: ${DATABASE_STRATEGY}. Use CENTRALIZED or DISTRIBUTED.`)
  }
  return strategy
}

function getSaveScoreFunction() {
  return getStrategy().saveScore
}

function getScoreboardFunction() {
  return getStrategy().getScoreboard
}

module.exports = {
  DATABASE_STRATEGY,
  strategies,
  getStrategy,
  getSaveScoreFunction,
  getScoreboardFunction
}
