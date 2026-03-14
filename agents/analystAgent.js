const { ChatGroq } = require("@langchain/groq");

async function analystAgent(studentData) {
  if (!process.env.GROQ_API_KEY) {
    return JSON.stringify({
      strengths: ["Consistent practice foundation"],
      weaknesses: ["Needs deeper topic mastery"],
      improvementAreas: ["Daily timed coding drills", "Review mistakes and patterns"]
    });
  }

  const model = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile"
  });

  const prompt = `
Analyze this student's coding performance.

Data:
${JSON.stringify(studentData)}

Return:
- strengths
- weaknesses
- improvement areas
`;

  const result = await model.invoke(prompt);

  return result.content;
}

module.exports = analystAgent;