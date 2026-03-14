const { ChatGroq } = require("@langchain/groq");

async function coachAgent(plan, analysis) {
  if (!process.env.GROQ_API_KEY) {
    return `Coaching Guidance:\n- Follow the generated weekly plan strictly\n- Practice at least 2 timed sets daily\n- Track and fix repeated mistakes\n- Do 2 mock interviews per week`;
  }

  const model = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile"
  });

  const prompt = `
You are a mentor coach.

Plan:
${plan}

Student analysis:
${analysis}

Generate a detailed learning roadmap with tasks.
`;

  const result = await model.invoke(prompt);

  return result.content;
}

module.exports = coachAgent;