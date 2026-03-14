const plannerAgent = require("../agents/plannerAgent");
const researchAgent = require("../agents/researchAgent");
const executionAgent = require("../agents/executionAgent");
const reflectionAgent = require("../agents/reflectionAgent");
const placementLearningAgent = require("./placementLearningAgent");
const {
  saveRoadmap,
  saveObservation,
  getRecentObservations
} = require("../memory/agentMemory");
const {
  getStudentProgress,
  getTopicStats
} = require("../memory/progressMemory");

const MAX_ITERATIONS = 3;

function buildReasoningContext({ studentId, studentData, company, role, days, iteration, progressSummary }) {
  return {
    goal: "Generate placement preparation roadmap",
    studentId,
    studentData,
    company,
    role,
    days,
    iteration,
    progressSummary,
    recentObservations: getRecentObservations(5)
  };
}

function adaptStudentDataWithProgress(studentData = {}, topicStats = {}) {
  const adapted = { ...studentData };

  Object.entries(topicStats).forEach(([topic, stats]) => {
    const normalizedTopicScore = Math.max(0, Math.min(10, Number(stats.average || 0) / 10));
    const trendBonus = Number(stats.trend || 0) >= 10 ? 1 : 0;
    const current = Number(adapted[topic]);

    if (Number.isFinite(current)) {
      adapted[topic] = Math.max(0, Math.min(10, ((current + normalizedTopicScore) / 2) + trendBonus));
    } else {
      adapted[topic] = Math.max(0, Math.min(10, normalizedTopicScore + trendBonus));
    }
  });

  return adapted;
}

function buildProgressSummary(studentId) {
  const progress = getStudentProgress(studentId);
  const topicStats = getTopicStats(studentId);
  return {
    progress,
    topicStats,
    totalProgressEntries: progress.history.length,
    completedTaskCount: progress.completedTasks.length
  };
}

function chooseTool(reflection, phaseState) {
  if (!phaseState.plan) return "plannerAgent";
  if (!phaseState.researched) return "researchAgent";
  if (!phaseState.roadmap) return "executionAgent";
  if (!phaseState.agentState) return "placementLearningAgent";
  if (!reflection) return "reflectionAgent";
  if (reflection.needsImprovement) return "researchAgent";
  return "finalAnswer";
}

async function autonomousAgent({
  studentId = "anonymous",
  studentData = {},
  company = "Amazon",
  role = "Software Engineer",
  days = 30
} = {}) {
  const normalizedDays = Math.max(7, Number(days) || 30);
  const progressSummary = buildProgressSummary(studentId);
  const adaptedStudentData = adaptStudentDataWithProgress(studentData, progressSummary.topicStats);

  let plan = null;
  let researched = null;
  let roadmap = null;
  let reflection = null;
  let agentState = null;

  for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration += 1) {
    const context = buildReasoningContext({
      studentId,
      studentData: adaptedStudentData,
      company,
      role,
      days: normalizedDays,
      iteration,
      progressSummary
    });

    const phaseState = { plan, researched, roadmap, agentState };

    let currentTool;
    while ((currentTool = chooseTool(reflection, phaseState)) !== "finalAnswer") {
      if (currentTool === "plannerAgent") {
        plan = await plannerAgent(adaptedStudentData, company, role, normalizedDays);
        phaseState.plan = plan;
      } else if (currentTool === "researchAgent") {
        const inputPlan = phaseState.plan || plan || {
          company,
          role,
          days: normalizedDays,
          phases: []
        };
        researched = await researchAgent(inputPlan, company, role);
        phaseState.researched = researched;
      } else if (currentTool === "executionAgent") {
        const source = phaseState.researched || researched || plan;
        roadmap = executionAgent(source || {});
        phaseState.roadmap = roadmap;
      } else if (currentTool === "placementLearningAgent") {
        const placementState = placementLearningAgent({
          studentId,
          studentData: adaptedStudentData,
          company,
          role,
          days: normalizedDays,
          plan: phaseState.plan || plan || {},
          researchedPlan: phaseState.researched || researched || {},
          roadmap: phaseState.roadmap || roadmap || {},
          progressSummary
        });

        roadmap = placementState.roadmap;
        agentState = placementState.agentState;
        phaseState.roadmap = roadmap;
        phaseState.agentState = agentState;
      } else if (currentTool === "reflectionAgent") {
        reflection = await reflectionAgent(phaseState.roadmap || roadmap || {});
      }

      saveObservation({
        step: "execute",
        tool: currentTool,
        iteration,
        studentId,
        company,
        role,
        observation: currentTool === "placementLearningAgent"
          ? {
            currentCheckpoint: agentState?.currentCheckpoint?.topic || null,
            highRiskCheckpoints: agentState?.readinessSummary?.highRisk || 0,
            interventionCount: agentState?.interventionQueue?.length || 0
          }
          : reflection || {
          phases: (phaseState.plan || {}).phases?.length || 0,
          researchedPhases: (phaseState.researched || {}).phases?.length || 0,
          dailyPlanItems: (phaseState.roadmap || {}).dailyPlan?.length || 0
        },
        context
      });
    }

    if (!reflection || !reflection.needsImprovement) {
      break;
    }

    saveObservation({
      step: "repeat",
      iteration,
      studentId,
      company,
      role,
      reason: reflection.feedback,
      actions: reflection.actions || []
    });
  }

  const finalRoadmap = roadmap || executionAgent(researched || plan || {});
  const finalReflection = reflection || await reflectionAgent(finalRoadmap);

  const result = {
    goal: "Generate placement preparation roadmap",
    agentType: agentState?.agentType || "placement-learning-agent",
    studentId,
    company,
    role,
    days: normalizedDays,
    adaptedStudentData,
    agentState,
    checkpoints: Array.isArray(finalRoadmap.checkpoints) ? finalRoadmap.checkpoints : [],
    interventionQueue: Array.isArray(finalRoadmap.interventionQueue) ? finalRoadmap.interventionQueue : [],
    nextFocus: finalRoadmap.nextFocus || null,
    roadmap: finalRoadmap,
    reflection: finalReflection,
    generatedAt: new Date().toISOString()
  };

  saveRoadmap({
    studentId,
    company,
    role,
    days: normalizedDays,
    adaptedStudentData,
    reflection: finalReflection,
    roadmap: finalRoadmap,
    generatedAt: result.generatedAt
  });

  return result;
}

module.exports = autonomousAgent;