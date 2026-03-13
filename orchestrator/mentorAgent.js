const performanceAgent = require("../agents/performanceAgent");
const trendAgent = require("../agents/trendAgent");
const riskAgent = require("../agents/riskAgent");
const strategyAgent = require("../agents/strategyAgent");
const interviewAgent = require("../agents/interviewAgent");
const { generateNextTasks } = require("../agents/autonomousCoachAgent");

async function mentorAgent({ company, role, scores, previousAnalysis, weakSubjects = [], strongSubjects = [], overallAccuracy = 0, avgSecondsPerQuestion = null, daysRequired = 30 }) {
  const actionsTaken = [];
  const goal = "Improve student placement readiness";

  const logAction = (action) => {
    actionsTaken.push(action);
  };

  logAction("Goal defined: Improve student placement readiness");

  const performanceAnalysis = await performanceAgent(scores);
  logAction("Ran performanceAgent");

  const companyTrends = await trendAgent({
    company,
    role,
    weakTopics: performanceAnalysis.weakTopics
  });
  logAction(`Ran trendAgent (${companyTrends.source || "fallback"})`);

  const riskAssessment = await riskAgent({
    weakTopics: performanceAnalysis.weakTopics,
    topInterviewTopics: companyTrends.topInterviewTopics,
    company,
    role
  });
  logAction("Ran riskAgent");

  const coachRecommendations = await generateNextTasks(
    performanceAnalysis.weakTopics,
    riskAssessment.riskLevel
  );
  logAction("Ran autonomousCoachAgent");

  let preparationStrategy = null;
  const shouldRunStrategy =
    riskAssessment.riskLevel !== "LOW" ||
    performanceAnalysis.weakTopics.length > 0 ||
    Boolean(previousAnalysis);

  if (shouldRunStrategy) {
    preparationStrategy = await strategyAgent({
      weakTopics: performanceAnalysis.weakTopics,
      weakSubjects,
      strongSubjects,
      overallAccuracy,
      avgSecondsPerQuestion,
      riskLevel: riskAssessment.riskLevel,
      company,
      role,
      previousPlan: previousAnalysis?.preparationStrategy?.preparationPlan || null,
      daysRequired
    });
    logAction("Ran strategyAgent (dynamic decision)");
  } else {
    logAction("Skipped strategyAgent (dynamic decision)");
  }

  let mockInterview = null;

  if (riskAssessment.riskLevel === "HIGH") {
    mockInterview = await interviewAgent({ company, role });
    logAction("Ran interviewAgent because riskLevel is HIGH");
  } else {
    logAction("Skipped interviewAgent because riskLevel is not HIGH");
  }

  return {
    goal,
    actionsTaken,
    performanceAnalysis,
    companyTrends,
    riskAssessment,
    preparationStrategy,
    mockInterview,
    coachRecommendations
  };
}

module.exports = mentorAgent;
