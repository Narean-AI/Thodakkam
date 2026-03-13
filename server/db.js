const Database = require('better-sqlite3')
const path = require('path')

const dbPath = path.join(__dirname, 'db.sqlite')
let db = null

function getDb() {
  if (!db) {
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
  }
  return db
}

async function init() {
  const db = getDb()

  // Enable foreign keys
  db.pragma('foreign_keys = ON')

  // Create tables if they don't exist
  db.exec(`
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
      round TEXT,
      questions TEXT,
      difficulty TEXT,
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
  `)

  // Migration: add linkedin/github columns if they don't exist
  try {
    db.exec(`ALTER TABLE experiences ADD COLUMN linkedin TEXT`)
  } catch (e) {
    // column already exists
  }
  try {
    db.exec(`ALTER TABLE experiences ADD COLUMN github TEXT`)
  } catch (e) {
    // column already exists
  }

  // Seed demo data if users table is empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count
  if (userCount === 0) {
    const bcrypt = require('bcryptjs')
    const demo_password = bcrypt.hashSync('demo123', 10)
    db.prepare('INSERT INTO users(id, name, email, password) VALUES(?, ?, ?, ?)')
      .run(['1', 'Demo User', 'demo@local', demo_password])

    // Seed cognitive data for demo user
    db.prepare('INSERT INTO cognitive(userId, data) VALUES(?, ?)')
      .run(['1', JSON.stringify({
        userId: '1',
        verbaScore: 68,
        logicScore: 72,
        spatialScore: 65,
        generalScore: 70,
        readiness: 68
      })])

    // Seed problems
    const problems = [
      { id: 'p1', title: 'Two Sum', company: 'Google', credibility: 95, difficulty: 'Easy' },
      { id: 'p2', title: 'Binary Tree Level Order Traversal', company: 'Microsoft', credibility: 90, difficulty: 'Medium' },
      { id: 'p3', title: 'Regular Expression Matching', company: 'Google', credibility: 85, difficulty: 'Hard' }
    ]
    const insertProblem = db.prepare('INSERT INTO problems(id, title, company, credibility, difficulty) VALUES(?, ?, ?, ?, ?)')
    for (const p of problems) {
      insertProblem.run([p.id, p.title, p.company, p.credibility, p.difficulty])
    }

    // Seed trends
    db.prepare('INSERT INTO trends(company, data) VALUES(?, ?)')
      .run(['Google', JSON.stringify({
        month: 'Jan',
        DSA: 45,
        Systems: 30,
        SQL: 25
      })])

    db.prepare('INSERT INTO trends(company, data) VALUES(?, ?)')
      .run(['Microsoft', JSON.stringify({
        month: 'Jan',
        DSA: 50,
        Systems: 35,
        SQL: 15
      })])
  }

  return {
    get: (sql, params) => {
      const stmt = db.prepare(sql)
      return stmt.get(...(Array.isArray(params) ? params : [params]))
    },
    all: (sql, params = []) => {
      const stmt = db.prepare(sql)
      return stmt.all(...params)
    },
    run: (sql, params = []) => {
      const stmt = db.prepare(sql)
      return stmt.run(...params)
    }
  }
}

module.exports = { init, getDb }
