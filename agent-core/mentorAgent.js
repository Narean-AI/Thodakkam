const autonomousAgent = require("./autonomousAgent");

async function mentorAgent(input) {
  return autonomousAgent(input);
}

module.exports = mentorAgent;
