const express = require("express");
const mentorAgent = require("../orchestrator/mentorAgent");

const router = express.Router();
const analysisMemory = new Map();

router.post("/analyze", async (req, res) => {
  try {
    const { company, role, scores, studentId = "default" } = req.body || {};

    if (!company || !role || !scores || typeof scores !== "object") {
      return res.status(400).json({
        error: "Invalid request body. Required: company, role, scores"
      });
    }

    const memoryKey = `${studentId}:${company}:${role}`;
    const previousAnalysis = analysisMemory.get(memoryKey) || null;

    const analysis = await mentorAgent({
      company,
      role,
      scores,
      previousAnalysis
    });

    analysisMemory.set(memoryKey, analysis);

    return res.json({
      goal: analysis.goal,
      actionsTaken: analysis.actionsTaken,
      performanceAnalysis: analysis.performanceAnalysis,
      companyTrends: analysis.companyTrends,
      riskAssessment: analysis.riskAssessment,
      preparationStrategy: analysis.preparationStrategy,
      mockInterview: analysis.mockInterview,
      coachRecommendations: analysis.coachRecommendations
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to analyze placement readiness",
      details: error.message
    });
  }
});

module.exports = router;
