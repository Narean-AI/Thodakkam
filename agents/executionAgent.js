function executionAgent(researchedPlan = {}) {
  const days = Number(researchedPlan.days) || 30;
  const phases = Array.isArray(researchedPlan.phases) ? researchedPlan.phases : [];

  const dailyPlan = Array.from({ length: days }, (_, i) => {
    const day = i + 1;
    const phase = phases.find((item) => day >= Number(item.startDay || 1) && day <= Number(item.endDay || days)) || phases[0] || { topic: "General Practice", resources: [] };

    return {
      day,
      focus: phase.topic || "General Practice",
      task: `Study ${phase.topic || "core topics"} (90 mins) + solve 2 timed problems + review mistakes`,
      practiceLink: Array.isArray(phase.resources) && phase.resources.length
        ? phase.resources[i % phase.resources.length]
        : "https://leetcode.com/studyplan/top-interview-150/"
    };
  });

  const milestones = phases.map((phase) => ({
    week: Math.max(1, Math.ceil(Number(phase.endDay || 7) / 7)),
    goal: phase.goal || `Complete ${phase.topic}`,
    topic: phase.topic
  }));

  const successCriteria = [
    "Complete at least 85% of daily tasks",
    "Finish all roadmap phases within planned day range",
    "Improve weakest topic accuracy by at least 15%"
  ];

  return {
    ...researchedPlan,
    weeklyMilestones: milestones,
    successCriteria,
    dailyPlan
  };
}

module.exports = executionAgent;
