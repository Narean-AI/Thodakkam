const { getDb } = require('../config/db')

function classifyMistakeTypes({ avgAccuracy, avgSecondsPerQuestion, totalAttempts }) {
  const logic = Math.max(10, Math.min(70, 100 - avgAccuracy))
  const time = avgSecondsPerQuestion ? Math.max(10, Math.min(60, Math.round(avgSecondsPerQuestion / 2))) : 20
  const consistency = totalAttempts > 1 ? Math.max(10, Math.min(50, totalAttempts * 5)) : 15

  return [
    { name: 'Logic', value: logic },
    { name: 'Time Pressure', value: time },
    { name: 'Consistency', value: consistency }
  ]
}

function buildInsights({ avgAccuracy, avgSecondsPerQuestion, strongestSubjects = [], weakestSubjects = [] }) {
  const insights = []

  if (avgAccuracy >= 75) {
    insights.push('Strong baseline accuracy. Increase difficulty and timed pressure gradually.')
  } else if (avgAccuracy >= 50) {
    insights.push('Moderate accuracy. Focus on reviewing mistakes before increasing volume.')
  } else {
    insights.push('Low accuracy trend detected. Rebuild fundamentals before taking harder mocks.')
  }

  if (avgSecondsPerQuestion && avgSecondsPerQuestion > 90) {
    insights.push('You are likely overthinking under time pressure. Use shorter timed rounds.')
  } else if (avgSecondsPerQuestion && avgSecondsPerQuestion < 35) {
    insights.push('You may be rushing. Slow down slightly and verify answers before submission.')
  } else {
    insights.push('Speed is reasonably balanced. Maintain timed practice with error review.')
  }

  if (weakestSubjects.length > 0) {
    insights.push(`Primary improvement area: ${weakestSubjects[0].subject}.`)
  }

  if (strongestSubjects.length > 0) {
    insights.push(`Current strength: ${strongestSubjects[0].subject}. Use it to build confidence.`)
  }

  return insights.slice(0, 4)
}

function rebuildCognitiveProfile(userId) {
  const db = getDb()
  const rows = db.prepare(`
    SELECT test_title, score, total_questions, duration_seconds, avg_seconds_per_question, attempts, accuracy_percent, created_at
    FROM scoreboard
    WHERE user_id = ?
    ORDER BY created_at ASC
  `).all(userId)

  if (!rows.length) {
    return null
  }

  const totalQuestions = rows.reduce((sum, row) => sum + (row.total_questions || 0), 0)
  const totalScore = rows.reduce((sum, row) => sum + (row.score || 0), 0)
  const totalAttempts = rows.reduce((sum, row) => sum + (typeof row.attempts === 'number' ? row.attempts : 1), 0)
  const timedRows = rows.filter((row) => typeof row.avg_seconds_per_question === 'number' || typeof row.duration_seconds === 'number')
  const avgSecondsPerQuestion = timedRows.length
    ? Number((timedRows.reduce((sum, row) => sum + (row.avg_seconds_per_question || ((row.duration_seconds || 0) / Math.max(1, row.total_questions || 1))), 0) / timedRows.length).toFixed(2))
    : null
  const avgAccuracy = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0

  const bySubject = {}
  rows.forEach((row) => {
    const key = row.test_title || 'General Mock'
    if (!bySubject[key]) {
      bySubject[key] = { totalScore: 0, totalQuestions: 0, attempts: 0 }
    }
    bySubject[key].totalScore += row.score || 0
    bySubject[key].totalQuestions += row.total_questions || 0
    bySubject[key].attempts += 1
  })

  const subjectStats = Object.entries(bySubject).map(([subject, data]) => ({
    subject,
    avgScore: data.totalQuestions > 0 ? Math.round((data.totalScore / data.totalQuestions) * 100) : 0,
    attempts: data.attempts
  }))
  const strongestSubjects = [...subjectStats].sort((a, b) => b.avgScore - a.avgScore).slice(0, 3)
  const weakestSubjects = [...subjectStats].sort((a, b) => a.avgScore - b.avgScore).slice(0, 3)

  const profile = {
    userId,
    generatedAt: new Date().toISOString(),
    summary: {
      avgAccuracy,
      avgSecondsPerQuestion,
      totalAttempts,
      totalTests: rows.length
    },
    timePerQuestion: rows.map((row, index) => ({
      name: row.test_title || `Test ${index + 1}`,
      avg: typeof row.avg_seconds_per_question === 'number'
        ? row.avg_seconds_per_question
        : Math.round((row.duration_seconds || 0) / Math.max(1, row.total_questions || 1))
    })),
    mistakeTypes: classifyMistakeTypes({ avgAccuracy, avgSecondsPerQuestion, totalAttempts }),
    speedBalance: [
      { name: 'Overthink', v: avgSecondsPerQuestion ? Math.min(100, Math.round((avgSecondsPerQuestion / 120) * 100)) : 35 },
      { name: 'Rush', v: avgSecondsPerQuestion ? Math.max(0, 100 - Math.min(100, Math.round((avgSecondsPerQuestion / 120) * 100))) : 65 }
    ],
    strongestSubjects,
    weakestSubjects,
    insights: buildInsights({ avgAccuracy, avgSecondsPerQuestion, strongestSubjects, weakestSubjects })
  }

  db.prepare(`
    INSERT INTO cognitive(userId, data, created_at)
    VALUES(?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(userId) DO UPDATE SET
      data = excluded.data,
      created_at = CURRENT_TIMESTAMP
  `).run(userId, JSON.stringify(profile))

  return profile
}

function getOrCreateCognitiveProfile(userId) {
  const db = getDb()
  const row = db.prepare('SELECT data FROM cognitive WHERE userId = ?').get(userId)
  if (row?.data) {
    try {
      return JSON.parse(row.data)
    } catch (error) {
      return rebuildCognitiveProfile(userId)
    }
  }

  return rebuildCognitiveProfile(userId)
}

module.exports = {
  rebuildCognitiveProfile,
  getOrCreateCognitiveProfile
}