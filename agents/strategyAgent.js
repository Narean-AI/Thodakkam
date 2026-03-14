const { generatePreparationStrategy, generateStructuredRoadmap } = require("../services/geminiService");

async function strategyAgent({
  weakTopics = [],
  weakSubjects = [],
  strongSubjects = [],
  overallAccuracy = 0,
  avgSecondsPerQuestion = null,
  riskLevel,
  company,
  role,
  previousPlan,
  daysRequired = 30
}) {
  // Try structured roadmap first — much more accurate
  const structuredRoadmap = await generateStructuredRoadmap({
    weakSubjects,
    strongSubjects,
    overallAccuracy,
    avgSecondsPerQuestion,
    company,
    role,
    daysRequired,
    riskLevel
  });

  if (structuredRoadmap) {
    return { preparationPlan: null, structuredRoadmap, source: "ai" };
  }

  // Fallback to legacy 7-day text plan
  const planResponse = await generatePreparationStrategy({
    weakTopics,
    riskLevel,
    company,
    role,
    previousPlan
  });

  return {
    preparationPlan: planResponse.preparationPlan,
    structuredRoadmap: null,
    source: planResponse.source || "fallback"
  };
}
module.exports = strategyAgent;