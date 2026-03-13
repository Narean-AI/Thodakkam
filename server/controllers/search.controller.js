const { getDb } = require('../config/db')
const path = require('path')
const fs = require('fs')
const { enqueueGoal } = require('../services/autonomousAgentRuntime')
const { rebuildCognitiveProfile } = require('../services/cognitiveProfileService')

const searchController = {
  search: (req, res) => {
    try {
      const { q, company, role, difficulty } = req.query
      const db = getDb()
      let sql = 'SELECT * FROM problems'
      const where = []
      const params = []
      
      if (q) {
        where.push('LOWER(title) LIKE ?')
        params.push(`%${q.toLowerCase()}%`)
      }
      if (company) {
        where.push('LOWER(company) LIKE ?')
        params.push(`%${company.toLowerCase()}%`)
      }
      if (difficulty) {
        where.push('difficulty = ?')
        params.push(difficulty)
      }
      
      if (where.length) sql += ' WHERE ' + where.join(' AND ')
      const results = db.prepare(sql).all(...params)
      // If user filtered by company/role/difficulty, aggregate related experience resources and mock questions
      let extras = null
      if (company || role || difficulty) {
        const expWhere = []
        const expParams = []
        if (company) { expWhere.push('LOWER(company) = ?'); expParams.push(company.toLowerCase()) }
        if (role) { expWhere.push('LOWER(role) = ?'); expParams.push(role.toLowerCase()) }
        if (difficulty) { expWhere.push('difficulty = ?'); expParams.push(difficulty) }
        const expSql = 'SELECT reference_link, resources, preparation_tips, questions FROM experiences' + (expWhere.length ? ' WHERE ' + expWhere.join(' AND ') : '')
        const exps = db.prepare(expSql).all(...expParams)

        const refsSet = new Set()
        const mockQuestions = []

        exps.forEach(e => {
          if (e.reference_link) refsSet.add(e.reference_link)
          if (e.resources) {
            // resources may be comma/newline separated
            e.resources.split(/[,\n]+/).map(s=>s.trim()).filter(Boolean).forEach(r=>refsSet.add(r))
          }
          if (e.preparation_tips) refsSet.add(e.preparation_tips)
          if (e.questions) {
            // split questions by newline or '||' or ';;'
            e.questions.split(/\n|\|\||;;|\r/).map(s=>s.trim()).filter(Boolean).forEach(qs => {
              if (!mockQuestions.includes(qs)) mockQuestions.push(qs)
            })
          }
        })

        extras = {
          resources: Array.from(refsSet),
          mockInterview: formatMockInterview(mockQuestions, difficulty)
        }
      }

      // Attach per-result extras: aggregate experiences for each result's company (+ optional role/difficulty)
      const resultStmt = db.prepare('SELECT reference_link, resources, preparation_tips, questions FROM experiences WHERE LOWER(company) = ?')
      results.forEach(r => {
        try {
          const companyName = (r.company || '').toString().toLowerCase()
          const exps = db.prepare('SELECT reference_link, resources, preparation_tips, questions, difficulty, role FROM experiences WHERE LOWER(company) = ?').all(companyName)
          const refsSet = new Set()
          const mockQuestions = []
          exps.forEach(e => {
            if (e.reference_link) refsSet.add(e.reference_link)
            if (e.resources) e.resources.split(/[,\n]+/).map(s=>s.trim()).filter(Boolean).forEach(x=>refsSet.add(x))
            if (e.preparation_tips) refsSet.add(e.preparation_tips)
            if (e.questions) e.questions.split(/\n|\|\||;;|\r/).map(s=>s.trim()).filter(Boolean).forEach(qs => { if (!mockQuestions.includes(qs)) mockQuestions.push(qs) })
          })
          r.extras = {
            resources: Array.from(refsSet),
            mockInterview: formatMockInterview(mockQuestions, r.difficulty || null),
            generatedPrompt: generateInterviewPrompt(r)
          }
        } catch (e) {
          r.extras = null
        }
      })

      res.json({ results, extras })
    } catch (err) {
      console.error(err)
      res.status(500).json({ message: 'Server error' })
    }
  },

  getTrends: (req, res) => {
    try {
      const db = getDb()
      const row = db.prepare('SELECT data FROM trends WHERE company = ?').get(req.params.company)
      if (!row) return res.status(404).json({ message: 'No trends data' })
      res.json(JSON.parse(row.data))
    } catch (err) {
      console.error(err)
      res.status(500).json({ message: 'Server error' })
    }
  }

  ,getCompanies: (req, res) => {
    try {
      const db = getDb()
      const rows = db.prepare('SELECT id, name FROM companies ORDER BY name').all()
      res.json({ companies: rows })
    } catch (err) {
      console.error(err)
      res.status(500).json({ message: 'Server error' })
    }
  }

  ,getRoles: (req, res) => {
    try {
      const db = getDb()
      const { company_id, company } = req.query
      let rows
      if (company_id) {
        rows = db.prepare('SELECT id, name FROM roles WHERE company_id = ? ORDER BY name').all(company_id)
      } else if (company) {
        rows = db.prepare('SELECT r.id, r.name FROM roles r JOIN companies c ON r.company_id = c.id WHERE LOWER(c.name) = ? ORDER BY r.name').all(company.toLowerCase())
      } else {
        rows = db.prepare('SELECT r.id, r.name, c.name as company FROM roles r JOIN companies c ON r.company_id = c.id ORDER BY c.name, r.name').all()
      }
      res.json({ roles: rows })
    } catch (err) {
      console.error(err)
      res.status(500).json({ message: 'Server error' })
    }
  }

  ,getDifficulties: (req, res) => {
    try {
      const db = getDb()
      const rows = db.prepare('SELECT id, level FROM difficulty_levels ORDER BY id').all()
      res.json({ difficulties: rows })
    } catch (err) {
      console.error(err)
      res.status(500).json({ message: 'Server error' })
    }
  }

  // Serve preparation assets from server/data/<company>/<role>.json
  ,getPrepAssets: (req, res) => {
    try {
      const company = (req.query.company || '').toString().trim()
      const role = (req.query.role || '').toString().trim()
      if (!company) return res.status(400).json({ message: 'company required' })

      const base = path.join(__dirname, '..', 'data')
      const companyDir = path.join(base, company.toLowerCase())

      const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

      const tryLoad = (p) => {
        try {
          if (fs.existsSync(p)) {
            const raw = fs.readFileSync(p, 'utf8')
            return JSON.parse(raw)
          }
        } catch (e) {
          return null
        }
        return null
      }

      // Try role file first (normalize role like 'Software Engineer (Common Role)' -> 'software_engineer')
      let out = null
      if (role) {
        const normalizedRole = role.replace(/\s*\(.*\)\s*/,'').trim()
        const baseSlug = slugify(normalizedRole)
        const candidates = [baseSlug, baseSlug.replace(/_common_role$/,''), 'software_engineer']
        for (const c of candidates) {
          const roleFile = path.join(companyDir, `${c}.json`)
          console.log('prep: trying', roleFile, 'exists?', fs.existsSync(roleFile))
          out = tryLoad(roleFile)
          if (out) break
        }
      }

      // If no role file, try company-level file named "company.json"
      if (!out) {
        const companyFile = path.join(companyDir, 'company.json')
        out = tryLoad(companyFile)
      }

      // Fallback: try to load role file from meta/ (e.g., server/data/google/... vs server/data/meta/...)
      if (!out) {
        const fallback = path.join(base, 'meta', `${slugify(role || 'software_engineer')}.json`)
        out = tryLoad(fallback)
      }

      if (!out) return res.status(404).json({ message: 'No preparation assets found' })
      
      // Transform: if array of MCQ objects, wrap in structure with mock_tests
      if (Array.isArray(out) && out.length > 0 && out[0].question) {
        out = {
          mock_tests: [{
            title: `${company} - ${role || 'Technical Interview'}`,
            questions: out.map(q => ({ text: q.question, options: q.options, answerIndex: q.options.indexOf(q.answer) }))
          }],
          interview_questions: [],
          hr_questions: [],
          aptitude_questions: [],
          logical_questions: [],
          technical_questions: []
        }
      }
      
      res.json(out)
    } catch (err) {
      console.error(err)
      res.status(500).json({ message: 'Server error' })
    }
  }
}

module.exports = searchController

// NOTE: prep handler moved above; leftover placeholder removed
// Helper: split questions into rounds and add suggested timers/prompts
function formatMockInterview(questions = [], difficulty = null) {
  if (!questions || !questions.length) return []
  // per-question suggested minutes by difficulty
  const perQ = difficulty === 'Hard' ? 25 : difficulty === 'Medium' ? 12 : 5
  const rounds = []
  const chunkSize = 3
  for (let i = 0; i < questions.length; i += chunkSize) {
    const slice = questions.slice(i, i + chunkSize)
    const items = slice.map(q => ({ text: q, suggestedMinutes: perQ }))
    const totalMinutes = items.reduce((s, it) => s + it.suggestedMinutes, 0)
    rounds.push({ title: `Round ${Math.floor(i / chunkSize) + 1}`, estimatedMinutes: totalMinutes, questions: items })
  }
  return rounds
}

// Helper: generate a short practice prompt for a problem/result
function generateInterviewPrompt(result) {
  if (!result) return ''
  const title = result.title || 'Problem'
  const company = result.company ? ` at ${result.company}` : ''
  const difficulty = result.difficulty ? ` (${result.difficulty})` : ''
  return `Practice prompt: You are interviewing${company}. Explain your approach and solve: ${title}${difficulty}. Speak aloud and time yourself according to round timers.`
}

// Get single problem detail
searchController.getProblem = (req, res) => {
  try {
    const db = getDb()
    const id = req.params.id
    const row = db.prepare('SELECT * FROM problems WHERE id = ?').get(id)
    if (!row) return res.status(404).json({ message: 'Problem not found' })

    // attach extras similar to per-result
    const companyName = (row.company || '').toLowerCase()
    const exps = db.prepare('SELECT reference_link, resources, preparation_tips, questions, difficulty, role FROM experiences WHERE LOWER(company) = ?').all(companyName)
    const refsSet = new Set()
    const mockQuestions = []
    exps.forEach(e => {
      if (e.reference_link) refsSet.add(e.reference_link)
      if (e.resources) e.resources.split(/[,\n]+/).map(s=>s.trim()).filter(Boolean).forEach(x=>refsSet.add(x))
      if (e.preparation_tips) refsSet.add(e.preparation_tips)
      if (e.questions) e.questions.split(/\n|\|\||;;|\r/).map(s=>s.trim()).filter(Boolean).forEach(qs => { if (!mockQuestions.includes(qs)) mockQuestions.push(qs) })
    })

    // include reference_links and mock_tests from meta tables
    const companyRow = db.prepare('SELECT id FROM companies WHERE LOWER(name) = ?').get(companyName)
    let metaRefs = []
    let metaMocks = []
    if (companyRow) {
      metaRefs = db.prepare('SELECT url, note FROM reference_links WHERE company_id = ? ORDER BY id').all(companyRow.id)
      metaMocks = db.prepare('SELECT title, content FROM mock_tests WHERE company_id = ? ORDER BY id').all(companyRow.id)
    }

    row.extras = {
      resources: Array.from(refsSet),
      mockInterview: formatMockInterview(mockQuestions, row.difficulty || null),
      generatedPrompt: generateInterviewPrompt(row),
      metaReferences: metaRefs,
      metaMockTests: metaMocks
    }

    res.json(row)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
}
// Save mock test result to scoreboard
searchController.saveScore = (req, res) => {
  try {
    const db = getDb()
    const { testTitle, company, role, score, totalQuestions, duration_seconds, avg_seconds_per_question, attempts, accuracy_percent } = req.body
    const userId = req.user?.id // Get userId from auth token

    if (!testTitle || score === undefined || !totalQuestions) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    // CENTRALIZED STRATEGY: Single scoreboard table with user_id column
    // Persist cognitive profiling fields when available
    const stmt = db.prepare(`INSERT INTO scoreboard (test_title, company, role, score, total_questions, duration_seconds, avg_seconds_per_question, attempts, accuracy_percent, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    const result = stmt.run(
      testTitle,
      company || null,
      role || null,
      score,
      totalQuestions,
      typeof duration_seconds === 'number' ? duration_seconds : null,
      typeof avg_seconds_per_question === 'number' ? avg_seconds_per_question : null,
      typeof attempts === 'number' ? attempts : (req.body.attemptNumber || 1),
      typeof accuracy_percent === 'number' ? accuracy_percent : (totalQuestions ? Math.round((score / totalQuestions) * 100) : null),
      userId || null
    )

    if (userId) {
      try {
        rebuildCognitiveProfile(userId)
      } catch (profileError) {
        console.error('Failed to rebuild cognitive profile after score save', profileError)
      }

      try {
        enqueueGoal({
          studentId: userId,
          goalType: 'refresh_roadmap',
          priority: 3,
          payload: {
            company: company || null,
            role: role || null,
            daysRequired: 30
          },
          maxRetries: 3
        })
      } catch (queueError) {
        console.error('Failed to enqueue autonomous goal after score save', queueError)
      }
    }

    res.json({ id: result.lastInsertRowid, message: 'Score saved' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
}

// Get scoreboard (role-based: students see only their own, admin/super_admin see all students)
// CENTRALIZED STRATEGY: Uses single scoreboard table with user_id filtering
// For alternative approach (per-student databases), see server/utils/databaseStrategy.js
searchController.getScoreboard = (req, res) => {
  try {
    const db = getDb()
    const userRole = req.user?.role
    const userId = req.user?.id
    
    let results = []
    
    if (userRole === 'student') {
      // Students see only their own scores
      results = db.prepare(`
        SELECT id, test_title, company, role, score, total_questions, created_at, user_id 
        FROM scoreboard 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT 100
      `).all(userId)
    } else if (userRole === 'admin' || userRole === 'super_admin') {
      // Admins/super_admins see all student scores
      results = db.prepare(`
        SELECT s.id, s.test_title, s.company, s.role, s.score, s.total_questions, s.created_at, s.user_id 
        FROM scoreboard s
        INNER JOIN users u ON u.id = s.user_id
        WHERE u.role = 'student'
        ORDER BY s.created_at DESC 
        LIMIT 500
      `).all()
    } else {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    
    // Aggregate by test_title (for students) or by userId then test_title (for admins)
    const aggregated = {}
    
    if (userRole === 'student') {
      // Students: group by test_title only
      results.forEach(r => {
        if (!aggregated[r.test_title]) {
          aggregated[r.test_title] = { 
            title: r.test_title, 
            company: r.company, 
            role: r.role, 
            userId: r.user_id,
            attempts: [] 
          }
        }
        aggregated[r.test_title].attempts.push({ score: r.score, total: r.total_questions, date: r.created_at })
      })
    } else {
      // Admins: group by userId first, then by test_title
      const byUser = {}
      results.forEach(r => {
        const uid = r.user_id || 'unknown'
        if (!byUser[uid]) byUser[uid] = {}
        
        const key = r.test_title
        if (!byUser[uid][key]) {
          byUser[uid][key] = { 
            title: r.test_title, 
            company: r.company, 
            role: r.role, 
            userId: uid,
            attempts: [] 
          }
        }
        byUser[uid][key].attempts.push({ score: r.score, total: r.total_questions, date: r.created_at })
      })
      
      // Flatten for response
      Object.values(byUser).forEach(userTests => {
        Object.values(userTests).forEach(test => {
          aggregated[`${test.userId}:${test.title}`] = test
        })
      })
    }
    
    res.json({ scoreboard: Object.values(aggregated), role: userRole })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
}

// Get company DNA (tech stack, recent interviews, quick links)
searchController.getCompanyDNA = (req, res) => {
  try {
    const { company: companyName } = req.params
    const db = getDb()
    
    if (!companyName) {
      return res.status(400).json({ message: 'Company name required' })
    }

    // Fetch recent interviews (7 most recent experiences)
    const recentInterviews = db.prepare(`
      SELECT id, role, difficulty, round, description, resources, tags, linkedin, created_at 
      FROM experiences 
      WHERE LOWER(company) = ? 
      ORDER BY created_at DESC 
      LIMIT 7
    `).all(companyName.toLowerCase())

    // Extract tech stack from tags and resources
    const techStack = new Set()
    const commonTechs = ['React', 'Node', 'SQL', 'Python', 'Java', 'AWS', 'Docker', 'Kubernetes', 'TypeScript', 'JavaScript', 'MongoDB', 'PostgreSQL', 'MySQL', 'Angular', 'Vue', 'Express', 'Django', 'Spring', 'Go', 'Rust']
    
    recentInterviews.forEach(exp => {
      if (exp.tags) {
        exp.tags.toLowerCase().split(/[,\s|;]+/).forEach(tag => {
          const cleaned = tag.trim()
          if (cleaned && commonTechs.some(t => cleaned.includes(t.toLowerCase()))) {
            techStack.add(cleaned.charAt(0).toUpperCase() + cleaned.slice(1))
          }
        })
      }
      if (exp.resources) {
        commonTechs.forEach(tech => {
          if (exp.resources.toLowerCase().includes(tech.toLowerCase())) {
            techStack.add(tech)
          }
        })
      }
    })

    // Count problems for this company
    const problemsCount = db.prepare('SELECT COUNT(*) as count FROM problems WHERE LOWER(company) LIKE ?').get(`%${companyName.toLowerCase()}%`).count

    // Count mock tests for this company
    const mockTestsCount = db.prepare('SELECT COUNT(*) as count FROM mock_tests WHERE company_id IN (SELECT id FROM companies WHERE LOWER(name) = ?)').get(companyName.toLowerCase()).count

    // Fetch all roles for this company
    const roles = db.prepare('SELECT DISTINCT role FROM experiences WHERE LOWER(company) = ? ORDER BY role').all(companyName.toLowerCase())

    const companyDNA = {
      company: companyName,
      techStack: Array.from(techStack).slice(0, 5), // Top 5 techs
      recentInterviews: recentInterviews.map(exp => ({
        id: exp.id,
        role: exp.role,
        difficulty: exp.difficulty || 'N/A',
        round: exp.round,
        description: exp.description,
        date: exp.created_at,
        linkedin: exp.linkedin
      })),
      quickLinks: {
        problemsCount,
        mockTestsCount,
        rolesAvailable: roles.map(r => r.role)
      },
      stats: {
        totalInterviewsLogged: recentInterviews.length > 0 ? db.prepare('SELECT COUNT(*) as count FROM experiences WHERE LOWER(company) = ?').get(companyName.toLowerCase()).count : 0
      }
    }

    res.json(companyDNA)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
}