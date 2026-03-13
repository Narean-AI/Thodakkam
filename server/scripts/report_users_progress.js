const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const dbPath = path.join(__dirname, '..', 'db.sqlite')
if (!fs.existsSync(dbPath)) {
  console.error('DB not found at', dbPath)
  process.exit(2)
}

const db = new Database(dbPath, { readonly: true })

function getUsers() {
  const cols = db.prepare("PRAGMA table_info(users)").all().map(r => r.name)
  const desired = ['id', 'name', 'email', 'role', 'created_at']
  const selectCols = desired.filter(c => cols.includes(c))
  const sql = 'SELECT ' + selectCols.join(', ') + ' FROM users ORDER BY rowid'
  return db.prepare(sql).all()
}

function getCognitive(userId) {
  const row = db.prepare('SELECT data FROM cognitive WHERE userId = ?').get(userId)
  if (!row || !row.data) return null
  try { return JSON.parse(row.data) } catch (e) { return { raw: row.data } }
}

function main() {
  const users = getUsers()
  const out = users.map(u => {
    return Object.assign({}, u, { cognitive: getCognitive(u.id) })
  })
  console.log(JSON.stringify({ users: out, note: 'cognitive entries from cognitive table' }, null, 2))
}

main()
