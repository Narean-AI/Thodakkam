async function reflectionAgent(roadmap = {}) {
  const phases = Array.isArray(roadmap.phases) ? roadmap.phases : [];
  const dailyPlan = Array.isArray(roadmap.dailyPlan) ? roadmap.dailyPlan : [];
  const checkpoints = Array.isArray(roadmap.checkpoints) ? roadmap.checkpoints : [];
  const nextFocus = roadmap.nextFocus || null;
  const hasResources = phases.every((phase) => Array.isArray(phase.resources) && phase.resources.length > 0);
  const hasMilestones = Array.isArray(roadmap.weeklyMilestones) && roadmap.weeklyMilestones.length > 0;

  if (!phases.length) {
    return {
      needsImprovement: true,
      feedback: "Roadmap phases are missing",
      actions: ["Regenerate with clear phase breakdown"]
    };
  }

  if (!dailyPlan.length) {
    return {
      needsImprovement: true,
      feedback: "Daily execution plan is missing",
      actions: ["Generate daily tasks for all days"]
    };
  }

  if (dailyPlan.length < Math.min(7, Number(roadmap.days || 30))) {
    return {
      needsImprovement: true,
      feedback: "Daily plan is too short for meaningful preparation",
      actions: ["Extend plan coverage to full duration"]
    };
  }

  if (!hasResources) {
    return {
      needsImprovement: true,
      feedback: "Some phases are missing research resources",
      actions: ["Attach at least two resources per phase"]
    };
  }

  if (!hasMilestones) {
    return {
      needsImprovement: true,
      feedback: "Weekly milestones are missing",
      actions: ["Create weekly milestones from phase goals"]
    };
  }

  if (roadmap.agentType === "placement-learning-agent" && !checkpoints.length) {
    return {
      needsImprovement: true,
      feedback: "Placement checkpoints are missing from the agent state",
      actions: ["Build checkpoint verification state before finalizing the roadmap"]
    };
  }

  if (roadmap.agentType === "placement-learning-agent" && !nextFocus) {
    return {
      needsImprovement: true,
      feedback: "Next focus checkpoint is missing from the placement agent output",
      actions: ["Select the next checkpoint that needs verification or intervention"]
    };
  }

  return {
    needsImprovement: false,
    feedback: null,
    actions: []
  };
}

module.exports = reflectionAgent;