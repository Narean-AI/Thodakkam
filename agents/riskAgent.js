const { reasonSkillGaps } = require("../services/geminiService");

function normalizeTopic(topic) {
  const normalized = String(topic).replace(/[^a-zA-Z]/g, "").toLowerCase();

  const aliasMap = {
    dp: "dynamicprogramming",
    dynamicprogramming: "dynamicprogramming",
    systemdesign: "systemdesign",
    systemsdesign: "systemdesign"
  };

  return aliasMap[normalized] || normalized;
}

async function riskAgent({ weakTopics = [], topInterviewTopics = [], company, role }) {
  const trendTopicMap = new Map(topInterviewTopics.map((topic) => [normalizeTopic(topic), topic]));

  const criticalTopics = weakTopics.filter((topic) => trendTopicMap.has(normalizeTopic(topic)));

  let riskLevel = "LOW";

  if (criticalTopics.length >= 2 || weakTopics.length >= 3) {
    riskLevel = "HIGH";
  } else if (criticalTopics.length === 1 || weakTopics.length > 0) {
    riskLevel = "MEDIUM";
  }

  const reasoning = await reasonSkillGaps({
    weakTopics,
    topInterviewTopics,
    company,
    role
  });

  return {
    riskLevel,
    criticalTopics,
    reasoning
  };
}

module.exports = riskAgent;