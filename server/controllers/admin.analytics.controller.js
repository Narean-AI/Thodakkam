const { getDb } = require('../config/db')

function tableExists(db, tableName) {
  try {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName)
    return !!row
  } catch {
    return false
  }
}

function columnExists(db, tableName, columnName) {
  try {
    const cols = db.prepare(`PRAGMA table_info(${tableName})`).all()
    return cols.some((col) => col.name === columnName)
  } catch {
    return false
  }
}

const adminAnalyticsController = {
  // Get list of all students with their basic info
  getStudentsList: (req, res) => {
    try {
      const db = getDb()
      const students = db
        .prepare(
          `SELECT id, name, email FROM users WHERE role = 'student' ORDER BY id DESC`
        )
        .all()

      const enriched = students.map((student) => {
        const tests = db
          .prepare(`
            SELECT test_title, score, total_questions, created_at
            FROM scoreboard
            WHERE user_id = ?
            ORDER BY created_at DESC
          `)
          .all(student.id)

        const weeklyLogins = db
          .prepare(`
            SELECT COUNT(*) AS count
            FROM user_login_events
            WHERE user_id = ?
              AND date(login_at, 'localtime') >= date('now', 'localtime', '-6 days')
          `)
          .get(student.id)?.count || 0

        const weeklyActiveSeconds = db
          .prepare(`
            SELECT COALESCE(SUM(active_seconds), 0) AS total
            FROM user_activity_daily
            WHERE user_id = ?
              AND activity_date >= date('now', 'localtime', '-6 days')
          `)
          .get(student.id)?.total || 0

        const subjectMap = {}
        tests.forEach((test) => {
          const title = test.test_title || 'General'
          if (!subjectMap[title]) {
            subjectMap[title] = { score: 0, total: 0, attempts: 0 }
          }
          subjectMap[title].score += test.score || 0
          subjectMap[title].total += test.total_questions || 0
          subjectMap[title].attempts += 1
        })

        const subjectAverages = Object.entries(subjectMap).map(([subject, data]) => ({
          subject,
          avgScore: data.total > 0 ? Math.round((data.score / data.total) * 100) : 0,
          attempts: data.attempts
        }))

        const weakest = subjectAverages.length
          ? [...subjectAverages].sort((a, b) => a.avgScore - b.avgScore)[0]
          : null

        const testsAttended = [...new Set(tests.map((test) => test.test_title).filter(Boolean))].slice(0, 3)

        return {
          ...student,
          weeklyLogins,
          weeklyActiveSeconds,
          lowEngagement: weeklyLogins < 2,
          totalTests: tests.length,
          weakestSubject: weakest?.subject || null,
          weakestScore: weakest?.avgScore ?? null,
          testsAttended
        }
      })

      res.json({ students: enriched })
    } catch (err) {
      console.error(err)
      res.status(500).json({ message: 'Server error' })
    }
  },

  // Get performance data for a specific student
  getStudentPerformance: (req, res) => {
    try {
      const db = getDb()
      // Support both /analytics/students/:studentId (admin) and /analytics/my-profile (student)
      const targetStudentId = req.params.studentId || req.user.id
      console.log(`[Analytics] Fetching profile for student: ${targetStudentId}`)
      
      // Check authorization: allow if admin/super_admin OR if student viewing their own profile
      if (req.user.role === 'student' && req.user.id !== targetStudentId) {
        return res.status(403).json({ message: 'Forbidden' })
      }

      // Get student info
      const usersHasCreatedAt = columnExists(db, 'users', 'created_at')
      const student = usersHasCreatedAt
        ? db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ? AND role = ?').get(targetStudentId, 'student')
        : db.prepare('SELECT id, name, email FROM users WHERE id = ? AND role = ?').get(targetStudentId, 'student')
      if (!student) {
        return res.status(404).json({ message: 'Student not found' })
      }

      if (!student.created_at) {
        student.created_at = new Date().toISOString()
      }

      const hasLoginEvents = tableExists(db, 'user_login_events')
      const hasActivityDaily = tableExists(db, 'user_activity_daily')
      const hasDurationSeconds = columnExists(db, 'scoreboard', 'duration_seconds')

      const weeklyLogins = hasLoginEvents
        ? (db
          .prepare(`
            SELECT COUNT(*) AS count
            FROM user_login_events
            WHERE user_id = ?
              AND date(login_at, 'localtime') >= date('now', 'localtime', '-6 days')
          `)
          .get(targetStudentId)?.count || 0)
        : 0

      const todayActiveSeconds = hasActivityDaily
        ? (db
          .prepare(`
            SELECT COALESCE(SUM(active_seconds), 0) AS total
            FROM user_activity_daily
            WHERE user_id = ?
              AND activity_date = date('now', 'localtime')
          `)
          .get(targetStudentId)?.total || 0)
        : 0

      const weeklyActiveSeconds = hasActivityDaily
        ? (db
          .prepare(`
            SELECT COALESCE(SUM(active_seconds), 0) AS total
            FROM user_activity_daily
            WHERE user_id = ?
              AND activity_date >= date('now', 'localtime', '-6 days')
          `)
          .get(targetStudentId)?.total || 0)
        : 0

      const todayTestDurationSeconds = hasDurationSeconds
        ? (db
          .prepare(`
            SELECT COALESCE(SUM(duration_seconds), 0) AS total
            FROM scoreboard
            WHERE user_id = ?
              AND duration_seconds IS NOT NULL
              AND date(created_at, 'localtime') = date('now', 'localtime')
          `)
          .get(targetStudentId)?.total || 0)
        : 0

      const weeklyTestDurationSeconds = hasDurationSeconds
        ? (db
          .prepare(`
            SELECT COALESCE(SUM(duration_seconds), 0) AS total
            FROM scoreboard
            WHERE user_id = ?
              AND duration_seconds IS NOT NULL
              AND date(created_at, 'localtime') >= date('now', 'localtime', '-6 days')
          `)
          .get(targetStudentId)?.total || 0)
        : 0

      const todayEngagementSeconds = todayActiveSeconds + todayTestDurationSeconds
      const weeklyEngagementSeconds = weeklyActiveSeconds + weeklyTestDurationSeconds

      // Get test results for this student
      const scoreboardCols = [
        'id',
        'test_title',
        'company',
        'role',
        'score',
        'total_questions',
        columnExists(db, 'scoreboard', 'duration_seconds') ? 'duration_seconds' : 'NULL AS duration_seconds',
        columnExists(db, 'scoreboard', 'avg_seconds_per_question') ? 'avg_seconds_per_question' : 'NULL AS avg_seconds_per_question',
        columnExists(db, 'scoreboard', 'attempts') ? 'attempts' : '1 AS attempts',
        columnExists(db, 'scoreboard', 'accuracy_percent') ? 'accuracy_percent' : 'NULL AS accuracy_percent',
        'created_at'
      ]

      const testResults = db
        .prepare(
          `SELECT ${scoreboardCols.join(', ')} FROM scoreboard WHERE user_id = ? ORDER BY created_at DESC`
        )
        .all(targetStudentId)
      console.log(`[Analytics] Found ${testResults.length} test results for student ${targetStudentId}`)

      // Calculate statistics
      let totalTests = testResults.length
      let totalScore = 0
      let totalQuestions = 0
      let totalDurationSeconds = 0
      let durationQuestionCount = 0
      let totalAttempts = 0
      const subjectScores = {} // Track scores by test_title (subject)
      const companyTests = {} // Track tests by company
      const roleTests = {} // Track tests by role

      testResults.forEach((test) => {
        totalScore += test.score || 0
        totalQuestions += test.total_questions || 0
        if (typeof test.duration_seconds === 'number') {
          totalDurationSeconds += test.duration_seconds || 0
          durationQuestionCount += test.total_questions || 0
        }
        totalAttempts += (typeof test.attempts === 'number' ? test.attempts : 1)

        // Track by subject
        if (!subjectScores[test.test_title]) {
          subjectScores[test.test_title] = {
            attempts: 0,
            totalScore: 0,
            totalQuestions: 0,
            scores: []
          }
        }
        subjectScores[test.test_title].attempts += 1
        subjectScores[test.test_title].totalScore += test.score || 0
        subjectScores[test.test_title].totalQuestions += test.total_questions || 0
        subjectScores[test.test_title].scores.push({
          score: test.score,
          total: test.total_questions,
          percentage: Math.round(((test.score || 0) / (test.total_questions || 1)) * 100),
          date: test.created_at
        })

        // Track by company
        if (test.company) {
          if (!companyTests[test.company]) {
            companyTests[test.company] = { tests: 0, score: 0, total: 0 }
          }
          companyTests[test.company].tests += 1
          companyTests[test.company].score += test.score || 0
          companyTests[test.company].total += test.total_questions || 0
        }

        // Track by role
        if (test.role) {
          if (!roleTests[test.role]) {
            roleTests[test.role] = { tests: 0, score: 0, total: 0 }
          }
          roleTests[test.role].tests += 1
          roleTests[test.role].score += test.score || 0
          roleTests[test.role].total += test.total_questions || 0
        }
      })

      // Calculate average score percentage
      const avgScorePercentage = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0

      // Find weakest subjects (lowest average score)
      const weakestSubjects = Object.entries(subjectScores)
        .map(([subject, data]) => ({
          subject,
          avgScore: Math.round((data.totalScore / data.totalQuestions) * 100) || 0,
          attempts: data.attempts
        }))
        .sort((a, b) => a.avgScore - b.avgScore)
        .slice(0, 5) // Top 5 weakest

      // Strongest subjects
      const strongestSubjects = Object.entries(subjectScores)
        .map(([subject, data]) => ({
          subject,
          avgScore: Math.round((data.totalScore / data.totalQuestions) * 100) || 0,
          attempts: data.attempts
        }))
        .sort((a, b) => b.avgScore - a.avgScore)
        .slice(0, 5) // Top 5 strongest

      // Company performance
      const companyPerformance = Object.entries(companyTests).map(([company, data]) => ({
        company,
        avgScore: Math.round((data.score / data.total) * 100) || 0,
        tests: data.tests
      }))

      // Role performance
      const rolePerformance = Object.entries(roleTests).map(([role, data]) => ({
        role,
        avgScore: Math.round((data.score / data.total) * 100) || 0,
        tests: data.tests
      }))

      const avgSecondsPerQuestionOverall = durationQuestionCount > 0 ? Math.round((totalDurationSeconds / durationQuestionCount) * 100) / 100 : null

      res.json({
        student,
        summary: {
          totalTests,
          avgScorePercentage,
          totalScore,
          totalQuestions,
          avgSecondsPerQuestion: avgSecondsPerQuestionOverall,
          totalAttempts,
          weeklyLogins,
          todayActiveSeconds,
          weeklyActiveSeconds,
          todayEngagementSeconds,
          weeklyEngagementSeconds
        },
        testResults,
        subjectScores: Object.entries(subjectScores).map(([subject, data]) => ({
          subject,
          ...data,
          avgScore: Math.round((data.totalScore / data.totalQuestions) * 100) || 0
        })),
        weakestSubjects,
        strongestSubjects,
        companyPerformance,
        rolePerformance
      })
    } catch (err) {
      console.error(err)
      res.status(500).json({ message: 'Server error' })
    }
  },

  // Get overview statistics for all students
  getStudentsOverview: (req, res) => {
    try {
      const db = getDb()

      // Get all students
      const students = db.prepare('SELECT id, name, email FROM users WHERE role = ?').all('student')

      // Get aggregated stats
      const stats = students.map((student) => {
        const tests = db
          .prepare('SELECT score, total_questions FROM scoreboard WHERE user_id = ?')
          .all(student.id)

        const totalTests = tests.length
        let totalScore = 0
        let totalQuestions = 0

        tests.forEach((test) => {
          totalScore += test.score || 0
          totalQuestions += test.total_questions || 0
        })

        const avgScore = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0

        return {
          ...student,
          totalTests,
          avgScore
        }
      })

      res.json({ students: stats })
    } catch (err) {
      console.error(err)
      res.status(500).json({ message: 'Server error' })
    }
  }
}

module.exports = adminAnalyticsController
