const performanceAgent = require("../agents/performanceAgent");
const trendAgent = require("../agents/trendAgent");
const riskAgent = require("../agents/riskAgent");
const strategyAgent = require("../agents/strategyAgent");

async function runAgentPipeline(studentData, company) {

  const performance = performanceAgent(studentData);

  const trend = trendAgent(company);

  const risk = riskAgent(
    performance.weakTopics,
    trend.topTopics
  );

  const strategy = strategyAgent(
    performance.weakTopics,
    risk.riskLevel
  );

  return {
    performance,
    trend,
    risk,
    strategy
  };
}

module.exports = runAgentPipeline;