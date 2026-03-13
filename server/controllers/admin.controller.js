const { getDb } = require('../config/db')
const User = require('../models/user.model')

const adminController = {
  listUsers: (req, res) => {
    try {
      const db = getDb()
      const q = (req.query.q || '').trim()
      const page = parseInt(req.query.page || '1', 10)
      const limit = parseInt(req.query.limit || '10', 10)
      const offset = Math.max(0, (page - 1) * limit)

      let where = ''
      const params = []
      if (q) {
        where = 'WHERE name LIKE ? OR email LIKE ?'
        params.push(`%${q}%`, `%${q}%`)
      }

      const totalRow = db.prepare(`SELECT COUNT(*) as count FROM users ${where}`).get(...params)
      const total = totalRow ? totalRow.count : 0

      const users = db.prepare(`SELECT id, name, email, role FROM users ${where} ORDER BY rowid DESC LIMIT ? OFFSET ?`).all(...params, limit, offset)
      res.json({ users, total, page, limit })
    } catch (e) {
      console.error('listUsers error:', e.message || e)
      res.status(500).json({ message: 'Server error' })
    }
  },

  createAdmin: (req, res) => {
    try {
      const { name, email, password } = req.body
      if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' })
      
      // Check if email already exists
      const db = getDb()
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
      if (existing) return res.status(400).json({ message: 'Email already exists' })
      
      // create with role 'admin'
      try {
        User.create(name, email, password, 'admin')
      } catch (err) {
        console.error('User.create error:', err.message || err)
        return res.status(400).json({ message: err.message || 'User creation failed' })
      }
      // return created user row (lookup by email)
      const user = db.prepare('SELECT id, name, email, role FROM users WHERE email = ?').get(email)
      return res.json({ ok: true, message: 'Admin created', user })
    } catch (e) {
      console.error('createAdmin error:', e.message || e)
      res.status(500).json({ message: e.message || 'Server error' })
    }
  },

  promoteToSuper: (req, res) => {
    try {
      const { userId } = req.params
      const db = getDb()
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run('super_admin', userId)
      res.json({ ok: true })
    } catch (e) {
      res.status(500).json({ message: 'Server error' })
    }
  }
,
  promoteToAdmin: (req, res) => {
    try {
      const { userId } = req.params
      const db = getDb()
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', userId)
      res.json({ ok: true })
    } catch (e) {
      res.status(500).json({ message: 'Server error' })
    }
  }
,
  demoteToStudent: (req, res) => {
    try {
      const { userId } = req.params
      // prevent super admin from demoting themselves
      if (req.user && req.user.id === userId) return res.status(400).json({ message: 'Cannot demote yourself' })
      const db = getDb()
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run('student', userId)
      res.json({ ok: true })
    } catch (e) {
      res.status(500).json({ message: 'Server error' })
    }
  },

  // Add new student
  addStudent: (req, res) => {
    try {
      const { name, email, password } = req.body
      if (!name || !email || !password) {
        return res.status(400).json({ message: 'Missing required fields (name, email, password)' })
      }

      const db = getDb()
      
      // Check if email already exists
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
      if (existing) {
        return res.status(400).json({ message: 'Email already exists' })
      }

      // Create student with role 'student'
      try {
        User.create(name, email, password, 'student')
      } catch (err) {
        console.error('User.create error:', err.message || err)
        return res.status(400).json({ message: err.message || 'Student creation failed' })
      }

      // Return created student
      const student = db.prepare('SELECT id, name, email, role FROM users WHERE email = ?').get(email)
      return res.json({ ok: true, message: 'Student added successfully', student })
    } catch (e) {
      console.error('addStudent error:', e.message || e)
      res.status(500).json({ message: 'Server error' })
    }
  },

  // Delete student (admin can delete students)
  deleteStudent: (req, res) => {
    try {
      const { studentId } = req.params
      if (!studentId) {
        return res.status(400).json({ message: 'Student ID required' })
      }

      const db = getDb()
      
      // Check if student exists
      const student = db.prepare('SELECT id, role FROM users WHERE id = ?').get(studentId)
      if (!student) {
        return res.status(404).json({ message: 'Student not found' })
      }

      if (student.role !== 'student') {
        return res.status(400).json({ message: 'Can only delete students, not admins' })
      }

      // Delete student (cascade will handle related records)
      db.prepare('DELETE FROM users WHERE id = ?').run(studentId)
      
      res.json({ ok: true, message: 'Student deleted successfully' })
    } catch (e) {
      console.error('deleteStudent error:', e.message || e)
      res.status(500).json({ message: 'Server error' })
    }
  },

  // Get all students (for admin panel)
  getStudents: (req, res) => {
    try {
      const db = getDb()
      const q = (req.query.q || '').trim()
      const page = parseInt(req.query.page || '1', 10)
      const limit = parseInt(req.query.limit || '20', 10)
      const offset = Math.max(0, (page - 1) * limit)

      let where = "WHERE role = 'student'"
      const params = []
      
      if (q) {
        where += ' AND (name LIKE ? OR email LIKE ?)'
        params.push(`%${q}%`, `%${q}%`)
      }

      const totalRow = db.prepare(`SELECT COUNT(*) as count FROM users ${where}`).get(...params)
      const total = totalRow ? totalRow.count : 0

      const students = db.prepare(`SELECT id, name, email, role FROM users ${where} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, limit, offset)
      res.json({ students, total, page, limit })
    } catch (e) {
      console.error('getStudents error:', e.message || e)
      res.status(500).json({ message: 'Server error' })
    }
  }
}

module.exports = adminController
