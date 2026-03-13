const express = require('express')
const adminController = require('../controllers/admin.controller')
const adminAnalyticsController = require('../controllers/admin.analytics.controller')
const { verifyToken } = require('../middleware/auth.middleware')
const { allowRoles } = require('../middleware/rbac.middleware')

const router = express.Router()

// Only super_admin can list users and promote
router.get('/users', verifyToken, allowRoles('super_admin'), adminController.listUsers)
router.post('/admins', verifyToken, allowRoles('super_admin'), adminController.createAdmin)
router.post('/promote/:userId', verifyToken, allowRoles('super_admin'), adminController.promoteToSuper)
router.post('/promote-admin/:userId', verifyToken, allowRoles('super_admin'), adminController.promoteToAdmin)

// Student management - admin and super_admin can add/delete/list students
router.get('/student-list', verifyToken, allowRoles('admin', 'super_admin'), adminController.getStudents)
router.post('/students', verifyToken, allowRoles('admin', 'super_admin'), adminController.addStudent)
router.delete('/students/:studentId', verifyToken, allowRoles('admin', 'super_admin'), adminController.deleteStudent)

// Analytics endpoints - accessible to admin and super_admin
// Must come BEFORE the :studentId route so it matches first
router.get('/analytics/my-profile', verifyToken, adminAnalyticsController.getStudentPerformance)
router.get('/analytics/students', verifyToken, allowRoles('admin', 'super_admin'), adminAnalyticsController.getStudentsList)
router.get('/analytics/students/overview', verifyToken, allowRoles('admin', 'super_admin'), adminAnalyticsController.getStudentsOverview)
router.get('/analytics/students/:studentId', verifyToken, allowRoles('admin', 'super_admin'), adminAnalyticsController.getStudentPerformance)

module.exports = router
