const { generateCoachTasks } = require("../services/geminiService");

function normalizeTopics(weakTopics = []) {
  return weakTopics.filter((topic) => typeof topic === "string" && topic.trim()).map((topic) => topic.trim());
}

function getTaskCountBounds(riskLevel) {
  if (riskLevel === "HIGH") {
    return { min: 4, max: 5 };
  }

  if (riskLevel === "MEDIUM") {
    return { min: 2, max: 3 };
  }

  return { min: 1, max: 2 };
}

function buildRuleBasedTasks(weakTopics = [], riskLevel = "LOW") {
  const topics = normalizeTopics(weakTopics);
  const focusArea = topics[0] || "Core Problem Solving";
  const candidateTasks = [];

  if (topics.length === 0) {
    if (riskLevel === "HIGH") {
      candidateTasks.push(
        "Solve 4 mixed DSA problems under 60 minutes",
        "Review recent coding mistakes and write corrected solutions",
        "Take a timed coding quiz tomorrow",
        "Schedule a full-length mock interview"
      );
    } else if (riskLevel === "MEDIUM") {
      candidateTasks.push(
        "Solve 2 mixed DSA problems and document approaches",
        "Take a short timed quiz on problem-solving patterns"
      );
    } else {
      candidateTasks.push("Solve 1 mixed revision problem and note key learnings");
    }
  } else {
    topics.forEach((topic) => {
      candidateTasks.push(`Solve 5 ${topic} problems`);
      candidateTasks.push(`Review core concepts and patterns in ${topic}`);
      candidateTasks.push(`Take a ${topic} quiz tomorrow`);
    });

    if (riskLevel === "HIGH") {
      candidateTasks.push("Schedule a mock interview focused on weak topics");
    } else if (riskLevel === "LOW") {
      candidateTasks.push("Do one reflective review session for improved consistency");
    }
  }

  const { min, max } = getTaskCountBounds(riskLevel);
  const nextTasks = candidateTasks.slice(0, max);

  while (nextTasks.length < min) {
    nextTasks.push(`Practice one additional ${focusArea} question with complexity analysis`);
  }

  return {
    nextTasks,
    focusArea
  };
}

async function generateNextTasks(weakTopics, riskLevel) {
  const fallback = buildRuleBasedTasks(weakTopics, riskLevel);
  const aiTasks = await generateCoachTasks({
    weakTopics: normalizeTopics(weakTopics),
    riskLevel
  });

  if (!aiTasks) {
    return fallback;
  }

  const { min, max } = getTaskCountBounds(riskLevel);
  const boundedTasks = aiTasks.nextTasks.slice(0, max);

  if (boundedTasks.length < min) {
    return fallback;
  }

  return {
    nextTasks: boundedTasks,
    focusArea: aiTasks.focusArea || fallback.focusArea
  };
}

module.exports = {
  generateNextTasks
};
