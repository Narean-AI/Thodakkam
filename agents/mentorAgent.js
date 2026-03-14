const { GoogleGenerativeAI } = require("@google/generative-ai");
const tools = require("../tools/tools");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function mentorAgent(goal, context) {

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash"
  });

  let memory = [];
  let result = null;

  for (let step = 0; step < 4; step++) {

    const prompt = `
You are an AI mentor agent.

Goal:
${goal}

Context:
${JSON.stringify(context)}

Available tools:
${Object.keys(tools)}

Memory:
${JSON.stringify(memory)}

Decide the next tool to use.
Return JSON:
{
 "tool": "toolName",
 "input": {}
}
`;

    const response = await model.generateContent(prompt);

    const decision = JSON.parse(response.response.text());

    const toolResult = await tools[decision.tool](context);

    memory.push({
      step,
      tool: decision.tool,
      result: toolResult
    });

    result = toolResult;
  }

  return {
    goal,
    memory,
    finalResult: result
  };
}

module.exports = mentorAgent;