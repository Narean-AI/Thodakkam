const { getDb } = require('../config/db')
const { verifyProfile } = require('../utils/profileVerification')
const { getOrCreateCognitiveProfile } = require('../services/cognitiveProfileService')

const userController = {
  verifyProfile: async (req, res) => {
    try {
      const { url, type } = req.body
      if (!url || !type) {
        return res.status(400).json({ message: 'Missing url or type' })
      }

      const result = await verifyProfile(url, type)

      if (!result.ok) {
        return res.status(400).json({ message: result.message })
      }

      return res.json({ ok: true, message: result.message, data: result.data || result.username })
    } catch (err) {
      console.error(err)
      res.status(500).json({ message: 'Server error during verification' })
    }
  },

  uploadExperience: async (req, res) => {
    try {
      const db = getDb()
      const { company, role, difficulty, description, reference_link, preparation_tips, resources, round, questions, tags, linkedin, github } = req.body

      if (!company || !role) {
        return res.status(400).json({ message: 'Company and role are required' })
      }

      if (!linkedin && !github) {
        return res.status(400).json({ message: 'Provide a LinkedIn or GitHub profile URL' })
      }

      // LinkedIn verification is optional for now; only verify GitHub when provided
      if (github) {
        const result = await verifyProfile(github, 'github')
        if (!result.ok) return res.status(400).json({ message: result.message })
      }

      const id = Date.now().toString()
      const created_at = new Date().toISOString()
      db.prepare('INSERT INTO experiences(id, company, role, difficulty, description, reference_link, preparation_tips, resources, round, questions, tags, linkedin, github, created_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, company, role, difficulty, description, reference_link, preparation_tips, resources, round, questions, tags, linkedin, github, created_at)

      const title = description || (questions || '').split('\n')[0] || role
      const cred = 70
      const diffLabel = difficulty ? (difficulty > 66 ? 'Hard' : difficulty > 33 ? 'Medium' : 'Easy') : 'Medium'
      db.prepare('INSERT OR IGNORE INTO problems(id, title, company, credibility, difficulty) VALUES(?, ?, ?, ?, ?)')
        .run(Date.now().toString() + ':p', title, company, cred, diffLabel)

      res.json({ ok: true })
    } catch (err) {
      console.error(err)
      res.status(500).json({ message: 'Server error' })
    }
  },

  listExperiences: (req, res) => {
    try {
      const db = getDb()
      const { company } = req.query
      let sql = 'SELECT id, company, role, difficulty, description, reference_link, preparation_tips, resources, round, questions, tags, linkedin, github, created_at FROM experiences'
      const params = []
      if (company) {
        sql += ' WHERE LOWER(company) LIKE ?'
        params.push(`%${company.toLowerCase()}%`)
      }
      sql += ' ORDER BY created_at DESC LIMIT 100'
      const rows = db.prepare(sql).all(...params)
      res.json({ results: rows })
    } catch (err) {
      console.error(err)
      res.status(500).json({ message: 'Server error' })
    }
  },

  getCognitiveProfile: (req, res) => {
    try {
      const profile = getOrCreateCognitiveProfile(req.params.userId)
      if (!profile) return res.status(404).json({ message: 'No cognitive data' })
      res.json(profile)
    } catch (err) {
      console.error(err)
      res.status(500).json({ message: 'Server error' })
    }
  },

  deleteExperience: (req, res) => {
    try {
      const db = getDb()
      const { id } = req.params
      if (!id) return res.status(400).json({ message: 'Experience ID required' })
      
      const result = db.prepare('DELETE FROM experiences WHERE id = ?').run(id)
      if (result.changes === 0) return res.status(404).json({ message: 'Experience not found' })
      
      res.json({ ok: true, message: 'Experience deleted' })
    } catch (err) {
      console.error('deleteExperience error:', err.message || err)
      res.status(500).json({ message: 'Server error' })
    }
  },

  trackActivity: (req, res) => {
    try {
      const db = getDb()
      const userId = req.user?.id
      if (!userId) return res.status(401).json({ message: 'Unauthorized' })

      const rawSeconds = Number(req.body?.seconds)
      const activeSeconds = Number.isFinite(rawSeconds)
        ? Math.max(15, Math.min(300, Math.round(rawSeconds)))
        : 60

      db.prepare(`
        INSERT INTO user_activity_daily(user_id, activity_date, active_seconds, updated_at)
        VALUES (?, date('now', 'localtime'), ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id, activity_date)
        DO UPDATE SET
          active_seconds = user_activity_daily.active_seconds + excluded.active_seconds,
          updated_at = CURRENT_TIMESTAMP
      `).run(userId, activeSeconds)

      return res.json({ ok: true })
    } catch (err) {
      console.error('trackActivity error:', err.message || err)
      return res.status(500).json({ message: 'Server error' })
    }
  }
}

module.exports = userController
