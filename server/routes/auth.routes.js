const express = require('express')
const { body, validationResult } = require('express-validator')
const authController = require('../controllers/auth.controller')

const router = express.Router()

// Validation middleware
const validateRegister = [
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').notEmpty().withMessage('Name is required').trim()
]

const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
]

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const details = errors.array()
    return res.status(400).json({
      message: details[0]?.msg || 'Invalid request data',
      errors: details
    })
  }
  next()
}

// Routes
router.post('/register', validateRegister, handleValidationErrors, authController.register)
router.post('/login', validateLogin, handleValidationErrors, authController.login)

module.exports = router
