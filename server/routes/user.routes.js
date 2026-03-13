const express = require('express')
const { body, validationResult } = require('express-validator')
const userController = require('../controllers/user.controller')
const { verifyToken } = require('../middleware/auth.middleware')
const { allowRoles } = require('../middleware/rbac.middleware')

const router = express.Router()

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  next()
}

const validateExperience = [
  body('company').notEmpty().trim(),
  body('role').notEmpty().trim()
]

// Routes
router.post('/verify-profile', userController.verifyProfile)
router.post('/activity/ping', verifyToken, userController.trackActivity)
router.post('/experience', validateExperience, handleValidationErrors, userController.uploadExperience)
router.get('/experiences', userController.listExperiences)
router.get('/cognitive/:userId', userController.getCognitiveProfile)
router.delete('/experience/:id', verifyToken, allowRoles('admin', 'super_admin'), userController.deleteExperience)

module.exports = router
