const express = require('express')
const aiController = require('../controllers/ai.controller')
const autonomousController = require('../controllers/autonomous.controller')
const { verifyToken } = require('../middleware/auth.middleware')
const { allowRoles } = require('../middleware/rbac.middleware')

const router = express.Router()

router.post('/ai/autonomous-plan', verifyToken, aiController.generateAutonomousPlan)
router.post('/ai/focus-insight', verifyToken, aiController.generateFocusInsight)
router.post('/ai/goals', verifyToken, autonomousController.createGoal)
router.get('/ai/goals', verifyToken, autonomousController.listGoals)
router.post('/ai/goals/process-now', verifyToken, allowRoles('admin', 'super_admin'), autonomousController.processNow)

module.exports = router