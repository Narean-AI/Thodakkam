const performanceAgent = require("../agents/performanceAgent");
const trendAgent = require("../agents/trendAgent");
const riskAgent = require("../agents/riskAgent");
const strategyAgent = require("../agents/strategyAgent");

module.exports = {
  analyzePerformance: performanceAgent,
  getCompanyTrends: trendAgent,
  evaluateRisk: riskAgent,
  generateRoadmap: strategyAgent
};