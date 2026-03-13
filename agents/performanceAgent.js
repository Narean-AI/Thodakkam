function formatTopic(topic) {
  const prettyTopic = topic
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim();

  const compact = prettyTopic.replace(/\s+/g, "").toLowerCase();

  if (compact === "dp") {
    return "Dynamic Programming";
  }

  return prettyTopic.replace(/\w\S*/g, (token) => token[0].toUpperCase() + token.slice(1).toLowerCase());
}

async function performanceAgent(scores = {}) {
  const entries = Object.entries(scores).filter(([, value]) => Number.isFinite(Number(value)));

  if (entries.length === 0) {
    return {
      strongTopics: [],
      weakTopics: [],
      averageScore: 0
    };
  }

  const normalized = entries.map(([topic, value]) => ({
    topic: formatTopic(topic),
    score: Number(value)
  }));

  const maxScore = Math.max(...normalized.map((item) => item.score));
  const weakThreshold = maxScore <= 10 ? 5 : 60;
  const strongThreshold = maxScore <= 10 ? 8 : 80;

  const weakTopics = normalized
    .filter((item) => item.score < weakThreshold)
    .map((item) => item.topic);

  const strongTopics = normalized
    .filter((item) => item.score >= strongThreshold)
    .map((item) => item.topic);

  const averageScore = Number(
    (normalized.reduce((sum, item) => sum + item.score, 0) / normalized.length).toFixed(2)
  );

  return {
    strongTopics,
    weakTopics,
    averageScore
  };
}

module.exports = performanceAgent;