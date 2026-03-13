const {
  enqueueGoal,
  listGoals,
  processQueueOnce
} = require('../services/autonomousAgentRuntime')

const autonomousController = {
  createGoal: (req, res) => {
    try {
      const user = req.user || {}
      const isAdmin = user.role === 'admin' || user.role === 'super_admin'
      const body = req.body || {}

      const studentId = isAdmin
        ? (body.studentId || user.id)
        : user.id

      if (!studentId) {
        return res.status(400).json({ message: 'studentId is required' })
      }

      const payload = {
        company: body.company,
        role: body.role,
        daysRequired: body.daysRequired || 30
      }

      const queued = enqueueGoal({
        studentId,
        goalType: body.goalType || 'refresh_roadmap',
        priority: body.priority || 5,
        payload,
        maxRetries: body.maxRetries || 3
      })

      return res.status(201).json({
        message: 'Autonomous goal queued',
        goalId: queued.goalId
      })
    } catch (error) {
      return res.status(500).json({
        message: 'Failed to queue autonomous goal',
        details: error.message
      })
    }
  },

  listGoals: (req, res) => {
    try {
      const user = req.user || {}
      const isAdmin = user.role === 'admin' || user.role === 'super_admin'

      const goals = listGoals({
        studentId: req.query.studentId || user.id,
        isAdmin,
        status: req.query.status,
        limit: req.query.limit
      })

      return res.json({ goals })
    } catch (error) {
      return res.status(500).json({
        message: 'Failed to list autonomous goals',
        details: error.message
      })
    }
  },

  processNow: async (req, res) => {
    try {
      const maxItems = req.body?.maxItems || 3
      const result = await processQueueOnce(maxItems)
      return res.json({
        message: 'Autonomous queue processed',
        ...result
      })
    } catch (error) {
      return res.status(500).json({
        message: 'Failed to process autonomous queue',
        details: error.message
      })
    }
  }
}

module.exports = autonomousController