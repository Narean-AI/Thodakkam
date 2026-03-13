const { generateMockInterviewQuestions } = require("../services/geminiService");

async function interviewAgent({ company, role }) {
  const questions = await generateMockInterviewQuestions({ company, role });

  return {
    questions
  };
}

module.exports = interviewAgent;
