const express = require('express')
const searchController = require('../controllers/search.controller')
const { verifyToken } = require('../middleware/auth.middleware')

const router = express.Router()

// Routes
router.get('/search', searchController.search)
router.get('/trends/:company', searchController.getTrends)
// Meta endpoints for frontend selects
router.get('/meta/companies', searchController.getCompanies)
router.get('/meta/roles', searchController.getRoles)
router.get('/meta/difficulties', searchController.getDifficulties)
// Problem detail
router.get('/problems/:id', searchController.getProblem)
// Preparation assets (company/role JSON files)
router.get('/prep', searchController.getPrepAssets)
// Scoreboard - protected by auth to track user performance
router.post('/scoreboard', verifyToken, searchController.saveScore)
router.get('/scoreboard', verifyToken, searchController.getScoreboard)
// Company DNA (tech stack, recent interviews, quick links)
router.get('/company-dna/:company', searchController.getCompanyDNA)
module.exports = router