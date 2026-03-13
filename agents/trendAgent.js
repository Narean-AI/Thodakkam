const companyTrends = require("../data/companyTrends");

const difficultyMap = {
  Amazon: "HARD",
  Google: "HARD",
  Microsoft: "MEDIUM",
  Infosys: "MEDIUM",
  TCS: "MEDIUM"
};

async function trendAgent(company) {
  const topInterviewTopics = companyTrends[company] || ["Arrays", "Graphs", "Dynamic Programming"];
  const interviewDifficulty = difficultyMap[company] || "MEDIUM";

  return {
    topInterviewTopics,
    interviewDifficulty
  };
}

module.exports = trendAgent;