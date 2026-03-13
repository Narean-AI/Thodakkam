const { generatePreparationStrategy } = require("../services/geminiService");

async function strategyAgent({ weakTopics = [], riskLevel, company, role, previousPlan }) {
  const preparationPlan = await generatePreparationStrategy({
    weakTopics,
    riskLevel,
    company,
    role,
    previousPlan
  });

  return {
    preparationPlan
  };
}

module.exports = strategyAgent;