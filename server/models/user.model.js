const { getDb } = require('../config/db')
const bcrypt = require('bcryptjs')

const User = {
  findByEmail: (email) => {
    const db = getDb()
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  },

  findById: (id) => {
    const db = getDb()
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id)
  },

  create: (name, email, password, role = 'student') => {
    const db = getDb()
    const id = Date.now().toString()
    const hashed = bcrypt.hashSync(password, 10)
    return db.prepare('INSERT INTO users(id, name, email, password, role) VALUES(?, ?, ?, ?, ?)')
      .run(id, name, email, hashed, role)
  },

  verifyPassword: (password, hash) => {
    return bcrypt.compareSync(password, hash)
  }
}

module.exports = User