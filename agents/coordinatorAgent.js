async function coordinatorAgent(studentData, company, days, agents) {

  const { analystAgent, plannerAgent, coachAgent } = agents;

  const analysis = await analystAgent(studentData);

  const plan = await plannerAgent(studentData, company, days);

  const roadmap = await coachAgent(plan, analysis);

  return {
    analysis,
    plan,
    roadmap
  };
}

module.exports = coordinatorAgent;