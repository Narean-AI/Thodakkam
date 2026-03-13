const performanceAgent = require("../agents/performanceAgent");
const trendAgent = require("../agents/trendAgent");
const riskAgent = require("../agents/riskAgent");
const strategyAgent = require("../agents/strategyAgent");

async function runAgentSystem(studentData, company) {

  const goal = "Improve student placement readiness";

  const actions = [];

  const performance = performanceAgent(studentData);
  actions.push("performance analysis");

  const trend = trendAgent(company);
  actions.push("company trend analysis");

  const risk = riskAgent(
    performance.weakTopics,
    trend.topTopics
  );

  actions.push("risk detection");

  let strategy = null;

  if (risk.riskLevel === "HIGH") {
    strategy = strategyAgent(
      performance.weakTopics,
      risk.riskLevel
    );

    actions.push("strategy generation");
  }

  return {
    goal,
    actions,
    performance,
    trend,
    risk,
    strategy
  };
}

module.exports = runAgentSystem;