const Database = require('better-sqlite3')
const path = require('path')
const bcrypt = require('bcryptjs')
const fs = require('fs')

const dbPath = path.join(__dirname, '..', 'db.sqlite')
let db = null

function getDb() {
  if (!db) {
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
  }
  return db
}

async function initializeDatabase() {
  const database = getDb()

  // Create tables
  database.exec(`
    CREATE TABLE IF NOT EXISTS difficulty_levels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id),
      UNIQUE(company_id, name)
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS problems (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT,
      credibility INTEGER,
      difficulty TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS experiences (
      id TEXT PRIMARY KEY,
      company TEXT NOT NULL,
      role TEXT NOT NULL,
      difficulty TEXT,
      description TEXT,
      reference_link TEXT,
      preparation_tips TEXT,
      resources TEXT,
      round TEXT,
      questions TEXT,
      tags TEXT,
      linkedin TEXT,
      github TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cognitive (
      userId TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS trends (
      company TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reference_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER,
      role_id INTEGER,
      url TEXT NOT NULL,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id),
      FOREIGN KEY (role_id) REFERENCES roles(id)
    );

    CREATE TABLE IF NOT EXISTS mock_tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER,
      role_id INTEGER,
      title TEXT NOT NULL,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id),
      FOREIGN KEY (role_id) REFERENCES roles(id)
    );

    CREATE TABLE IF NOT EXISTS scoreboard (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_title TEXT NOT NULL,
      company TEXT,
      role TEXT,
      score INTEGER,
      total_questions INTEGER,
      attempt_number INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS agent_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT NOT NULL,
      goal_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      priority INTEGER NOT NULL DEFAULT 5,
      payload_json TEXT,
      result_json TEXT,
      last_error TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 3,
      next_run_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS agent_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id INTEGER NOT NULL,
      attempt_number INTEGER NOT NULL,
      status TEXT NOT NULL,
      action_log TEXT,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (goal_id) REFERENCES agent_goals(id)
    );

    CREATE TABLE IF NOT EXISTS user_login_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      login_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS user_activity_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      activity_date TEXT NOT NULL,
      active_seconds INTEGER NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, activity_date)
    );

    CREATE INDEX IF NOT EXISTS idx_agent_goals_status_next_run ON agent_goals(status, next_run_at);
    CREATE INDEX IF NOT EXISTS idx_agent_goals_student ON agent_goals(student_id);
    CREATE INDEX IF NOT EXISTS idx_agent_runs_goal ON agent_runs(goal_id);
    CREATE INDEX IF NOT EXISTS idx_user_login_events_user_time ON user_login_events(user_id, login_at);
    CREATE INDEX IF NOT EXISTS idx_user_activity_daily_user_date ON user_activity_daily(user_id, activity_date);
    /*
     * DATABASE DESIGN NOTES:
     * 
     * CURRENT APPROACH (RECOMMENDED):
     * - Single centralized 'scoreboard' table with 'user_id' column
     * - Students see only their own scores: WHERE user_id = ?
     * - Admins/super_admins see all student scores
     * - Pros: Normalized, efficient, easy to query & aggregate, professional design
     * - Cons: None significant
     * 
     * ALTERNATIVE APPROACH (if needed in future):
     * - Separate SQLite database per student: db_student_{userId}.sqlite
     * - Admin/super_admin aggregate data from all student databases
     * - Pros: Complete data isolation, can archive per-student databases independently
     * - Cons: Multiple file handles, slower admin queries, complex aggregation, harder maintenance
     * 
     * Current implementation uses the RECOMMENDED approach.
     * To switch to per-student databases, would need to:
     * 1. Modify saveScore() to determine student DB path: path.join(dbDir,'db_student_' + userId + '.sqlite')
     * 2. Modify getScoreboard() for admins to: scan for all db_student_*.sqlite files, open each, aggregate results
     * 3. Create/initialize student DB on first score save
     */
  `)

  // Migration: add columns if missing
  const addColumnIfNotExists = (tableName, columnName, columnType) => {
    try {
      database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`)
    } catch (e) {
      // column already exists
    }
  }

  // Add existing columns
  addColumnIfNotExists('experiences', 'linkedin', 'TEXT')
  addColumnIfNotExists('experiences', 'github', 'TEXT')

  // Add role column to users for RBAC (super_admin, admin, student)
  addColumnIfNotExists('users', 'role', "TEXT DEFAULT 'student'")

  // Add new columns
  addColumnIfNotExists('experiences', 'description', 'TEXT')
  addColumnIfNotExists('experiences', 'reference_link', 'TEXT')
  addColumnIfNotExists('experiences', 'preparation_tips', 'TEXT')
  addColumnIfNotExists('experiences', 'resources', 'TEXT')

  // Add userId column to scoreboard for tracking student performance
  addColumnIfNotExists('scoreboard', 'user_id', 'TEXT')
  // Add duration, attempts and accuracy columns for cognitive profiling
  addColumnIfNotExists('scoreboard', 'duration_seconds', 'INTEGER')
  addColumnIfNotExists('scoreboard', 'avg_seconds_per_question', 'REAL')
  addColumnIfNotExists('scoreboard', 'attempts', 'INTEGER')
  addColumnIfNotExists('scoreboard', 'accuracy_percent', 'REAL')

  // ======== SEED PREDEFINED DATA ========
  // Seed difficulty levels (only once) - use transaction for atomicity
  const difficultyCount = database.prepare('SELECT COUNT(*) as count FROM difficulty_levels').get().count
  if (difficultyCount === 0) {
    const stmtDifficulty = database.prepare('INSERT INTO difficulty_levels(level, description) VALUES(?, ?)')
    const difficulties = [
      ['Easy', 'Basic problems requiring fundamental knowledge'],
      ['Medium', 'Intermediate problems requiring applied concepts'],
      ['Hard', 'Advanced problems requiring deep expertise']
    ]
    const insertDifficulties = database.transaction((items) => {
      for (const [level, desc] of items) stmtDifficulty.run(level, desc)
    })
    insertDifficulties(difficulties)
  }

  // Seed companies and roles (only once) - transactional
  const companyCount = database.prepare('SELECT COUNT(*) as count FROM companies').get().count
  if (companyCount === 0) {
    const stmtCompany = database.prepare('INSERT INTO companies(name) VALUES(?)')
    const stmtRole = database.prepare('INSERT INTO roles(company_id, name) VALUES(?, ?)')

    const companiesData = [
      {
        name: 'Google',
        roles: ['Software Engineer (Common Role)', 'Machine Learning Engineer', 'Site Reliability Engineer']
      },
      {
        name: 'Amazon',
        roles: ['Software Engineer (Common Role)', 'Cloud Solutions Architect', 'Operations Manager']
      },
      {
        name: 'Meta',
        roles: ['Software Engineer (Common Role)', 'Data Scientist', 'AR/VR Developer']
      }
    ]

    const insertCompanies = database.transaction((companies) => {
      for (const company of companies) {
        const companyResult = stmtCompany.run(company.name)
        const companyId = companyResult.lastInsertRowid
        for (const role of company.roles) stmtRole.run(companyId, role)
      }
    })

    insertCompanies(companiesData)
  }

  // Seed references and mock tests from JSON asset file (if present)
  try {
    const assetsPath = path.join(__dirname, 'meta_assets.json')
    if (fs.existsSync(assetsPath)) {
      const raw = fs.readFileSync(assetsPath, 'utf8')
      const assets = JSON.parse(raw)

      const refCount = database.prepare('SELECT COUNT(*) as count FROM reference_links').get().count
      const mtCount = database.prepare('SELECT COUNT(*) as count FROM mock_tests').get().count

      if (refCount === 0 || mtCount === 0) {
        const stmtRef = database.prepare('INSERT INTO reference_links(company_id, role_id, url, note) VALUES(?, ?, ?, ?)')
        const stmtMock = database.prepare('INSERT INTO mock_tests(company_id, role_id, title, content) VALUES(?, ?, ?, ?)')

        const insertAssets = database.transaction((assetsObj) => {
          const companiesObj = assetsObj.companies || {}
          for (const [companyName, data] of Object.entries(companiesObj)) {
            const compRow = database.prepare('SELECT id FROM companies WHERE name = ?').get(companyName)
            if (!compRow) continue
            const cid = compRow.id

            ;(data.references || []).forEach(u => stmtRef.run(cid, null, u, null))
            ;(data.mock_tests || []).forEach(m => stmtMock.run(cid, null, m.title || '', m.content || ''))

            if (data.roles) {
              for (const [roleName, roleData] of Object.entries(data.roles)) {
                const roleRow = database.prepare('SELECT id FROM roles WHERE company_id = ? AND name = ?').get(cid, roleName)
                const rid = roleRow ? roleRow.id : null
                ;(roleData.references || []).forEach(u => stmtRef.run(cid, rid, u, null))
                ;(roleData.mock_tests || []).forEach(m => stmtMock.run(cid, rid, m.title || '', m.content || ''))
              }
            }
          }
        })

        insertAssets(assets)
      }
    }
  } catch (e) {
    console.error('meta assets seed failed', e)
  }

  // Seed demo user and sample data (only once)
  const userCount = database.prepare('SELECT COUNT(*) as count FROM users').get().count
  if (userCount === 0) {
    const demo_password = bcrypt.hashSync('demo123', 10)
    const stmtUser = database.prepare('INSERT INTO users(id, name, email, password) VALUES(?, ?, ?, ?)')
    stmtUser.run('1', 'Demo User', 'demo@local.com', demo_password)

    const stmtCognitive = database.prepare('INSERT INTO cognitive(userId, data) VALUES(?, ?)')
    stmtCognitive.run('1', JSON.stringify({
      userId: '1',
      verbaScore: 68,
      logicScore: 72,
      spatialScore: 65,
      generalScore: 70,
      readiness: 68
    }))

    const problems = [
      { id: 'p1', title: 'Two Sum', company: 'Google', credibility: 95, difficulty: 'Easy' },
      { id: 'p2', title: 'Binary Tree Level Order Traversal', company: 'Microsoft', credibility: 90, difficulty: 'Medium' },
      { id: 'p3', title: 'Regular Expression Matching', company: 'Google', credibility: 85, difficulty: 'Hard' }
    ]
    const stmtProblem = database.prepare('INSERT INTO problems(id, title, company, credibility, difficulty) VALUES(?, ?, ?, ?, ?)')
    problems.forEach(p => stmtProblem.run(p.id, p.title, p.company, p.credibility, p.difficulty))

    const stmtTrends = database.prepare('INSERT INTO trends(company, data) VALUES(?, ?)')
    stmtTrends.run('Google', JSON.stringify({
      month: 'Jan',
      DSA: 45,
      Systems: 30,
      SQL: 25
    }))
    stmtTrends.run('Microsoft', JSON.stringify({
      month: 'Jan',
      DSA: 50,
      Systems: 35,
      SQL: 15
    }))
  }

  // Migration: fix legacy demo email without domain (some older DBs used 'demo@local')
  try {
    const updated = database.prepare('UPDATE users SET email = ? WHERE email = ?').run('demo@local.com', 'demo@local')
    if (updated.changes) console.log('Updated legacy demo email to demo@local.com')
  } catch (e) {
    // ignore
  }

  return {
    get: (sql, params) => {
      const stmt = database.prepare(sql)
      return stmt.get(...(Array.isArray(params) ? params : [params]))
    },
    all: (sql, params = []) => {
      const stmt = database.prepare(sql)
      return stmt.all(...params)
    },
    run: (sql, params = []) => {
      const stmt = database.prepare(sql)
      return stmt.run(...params)
    }
  }
}

module.exports = { initializeDatabase, getDb }