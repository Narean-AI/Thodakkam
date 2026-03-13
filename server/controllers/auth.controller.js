const jwt = require('jsonwebtoken')
const User = require('../models/user.model')
const { SECRET } = require('../middleware/auth.middleware')
const { getDb } = require('../config/db')

const authController = {
  register: (req, res) => {
    try {
      const { name, email, password } = req.body
      if (!name || !email || !password) {
        return res.status(400).json({ message: 'Missing required fields' })
      }

      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' })
      }

      const existing = User.findByEmail(email)
      if (existing) return res.status(400).json({ message: 'Email already exists' })

      // create default student user (role assignment for admins is done via admin routes)
      User.create(name, email, password)
      res.json({ ok: true, message: 'User registered successfully' })
    } catch (err) {
      console.error(err)
      res.status(500).json({ message: 'Server error' })
    }
  },

  login: (req, res) => {
    try {
      const { email, password } = req.body
      if (!email || !password) {
        return res.status(400).json({ message: 'Missing email or password' })
      }

      const user = User.findByEmail(email)
      if (!user) return res.status(401).json({ message: 'User not found' })

      const ok = User.verifyPassword(password, user.password)
      if (!ok) return res.status(401).json({ message: 'Incorrect password' })

      try {
        const db = getDb()
        db.prepare('INSERT INTO user_login_events(user_id) VALUES (?)').run(user.id)
      } catch (trackingErr) {
        console.error('login tracking error:', trackingErr.message || trackingErr)
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role || 'student' }, SECRET, { expiresIn: '7d' })
      res.json({ token })
    } catch (err) {
      console.error(err)
      res.status(500).json({ message: 'Server error' })
    }
  }
}

module.exports = authController