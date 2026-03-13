const Database = require('better-sqlite3')
const path = require('path')
const bcrypt = require('bcryptjs')
const fs = require('fs')

const dbPath = path.join(__dirname, '..', 'db.sqlite')
if (!fs.existsSync(dbPath)) {
  console.error('DB not found at', dbPath)
  process.exit(2)
}

const db = new Database(dbPath)

// Ensure role column exists
try {
  db.prepare("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'student'").run()
} catch (e) {
  // ignore if column exists
}

const email = 'superadmin@local.com'
const passwordPlain = 'SuperAdmin123!'
const name = 'Default Super Admin'
const id = Date.now().toString()
const hashed = bcrypt.hashSync(passwordPlain, 10)

try {
  const existing = db.prepare('SELECT id, role FROM users WHERE email = ?').get(email)
  if (existing) {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run('super_admin', existing.id)
    console.log('Updated existing user to super_admin:', email)
  } else {
    db.prepare('INSERT INTO users(id, name, email, password, role) VALUES(?, ?, ?, ?, ?)')
      .run(id, name, email, hashed, 'super_admin')
    console.log('Created super_admin:', email)
  }
  console.log('Credentials - email:', email, 'password:', passwordPlain)
} catch (err) {
  console.error('Failed to create/update super admin:', err.message)
  process.exit(1)
}
