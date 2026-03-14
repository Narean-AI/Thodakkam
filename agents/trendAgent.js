const companyTrends = require("../data/companyTrends");
const { generateTrendInsights } = require("../services/geminiService");

const difficultyMap = {
  Amazon: "HARD",
  Google: "HARD",
  Microsoft: "MEDIUM",
  Infosys: "MEDIUM",
  TCS: "MEDIUM",
  Meta: "HARD",
  Adobe: "MEDIUM",
  Flipkart: "MEDIUM"
};

function normalizeCompany(company) {
  return String(company || "").trim();
}

function normalizeTopics(topics = []) {
  const unique = new Map();
  topics
    .filter((topic) => typeof topic === "string" && topic.trim())
    .forEach((topic) => {
      const clean = topic.trim();
      const key = clean.toLowerCase();
      if (!unique.has(key)) {
        unique.set(key, clean);
      }
    });
  return Array.from(unique.values());
}

async function trendAgent(input, roleArg, weakTopicsArg = []) {
  const payload = typeof input === "object" && input !== null
    ? input
    : { company: input, role: roleArg, weakTopics: weakTopicsArg };

  const company = normalizeCompany(payload.company) || "Amazon";
  const role = payload.role || "Software Engineer";
  const weakTopics = Array.isArray(payload.weakTopics) ? payload.weakTopics : [];

  const fallbackTopics = normalizeTopics(companyTrends[company] || ["Arrays", "Graphs", "Dynamic Programming"]);
  const fallbackDifficulty = difficultyMap[company] || "MEDIUM";

  const aiInsights = await generateTrendInsights({
    company,
    role,
    weakTopics
  });

  const topInterviewTopics = aiInsights?.topInterviewTopics?.length
    ? normalizeTopics(aiInsights.topInterviewTopics).slice(0, 6)
    : fallbackTopics;

  const interviewDifficulty = aiInsights?.interviewDifficulty || fallbackDifficulty;
  const marketSignals = aiInsights?.marketSignals || [];
  const confidence = typeof aiInsights?.confidence === "number" ? aiInsights.confidence : 0;
  const source = aiInsights ? "ai" : "fallback";

  return {
    topInterviewTopics,
    interviewDifficulty,
    marketSignals,
    confidence,
    source
  };
}

module.exports = trendAgent;
