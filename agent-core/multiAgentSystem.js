const coordinatorAgent = require("../agents/coordinatorAgent");
const analystAgent = require("../agents/analystAgent");
const plannerAgent = require("../agents/plannerAgent");
const coachAgent = require("../agents/coachAgent");

async function runMultiAgent(studentData, company, days) {

  const agents = {
    analystAgent,
    plannerAgent,
    coachAgent
  };

  const result = await coordinatorAgent(
    studentData,
    company,
    days,
    agents
  );

  return result;
}

module.exports = runMultiAgent;