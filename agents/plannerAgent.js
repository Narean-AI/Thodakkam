const { ChatGroq } = require("@langchain/groq");

const PRIMARY_MODEL = process.env.GROQ_MODEL || "llama3-70b-8192";
const FALLBACK_MODEL = "llama-3.3-70b-versatile";

function normalizeScores(studentData = {}) {
  if (studentData && typeof studentData.scores === "object" && studentData.scores) {
    return studentData.scores;
  }

  const flat = {};
  Object.entries(studentData || {}).forEach(([key, value]) => {
    if (Number.isFinite(Number(value))) {
      flat[key] = Number(value);
    }
  });
  return flat;
}

function buildFallbackPlan(studentData, company, role, days) {
  const normalizedDays = Math.max(7, Number(days) || 30);
  const scores = normalizeScores(studentData);
  const weakTopics = Object.entries(scores)
    .sort((a, b) => Number(a[1]) - Number(b[1]))
    .slice(0, 4)
    .map(([topic]) => topic);

  const topics = weakTopics.length ? weakTopics : ["DSA", "System Design", "SQL", "Mock Interview"];
  const phaseSize = Math.max(3, Math.floor(normalizedDays / topics.length));

  const phases = topics.map((topic, index) => {
    const startDay = (index * phaseSize) + 1;
    const endDay = index === topics.length - 1 ? normalizedDays : Math.min(normalizedDays, (index + 1) * phaseSize);
    return {
      phase: index + 1,
      topic,
      startDay,
      endDay,
      goal: `Improve ${topic} performance for ${company} ${role}`
    };
  });

  return {
    company,
    role,
    days: normalizedDays,
    phases,
    source: "fallback"
  };
}

function parseJson(text, fallback) {
  try {
    return JSON.parse(String(text || ""));
  } catch {
    const match = String(text || "").match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) return fallback;
    try {
      return JSON.parse(match[0]);
    } catch {
      return fallback;
    }
  }
}

async function invokeWithModel(modelName, prompt) {
  const model = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: modelName,
    temperature: 0.2
  });
  return model.invoke(prompt);
}

async function plannerAgent(studentData = {}, company = "Amazon", role = "Software Engineer", days = 30) {
  const fallback = buildFallbackPlan(studentData, company, role, days);
  if (!process.env.GROQ_API_KEY) {
    return fallback;
  }

  const prompt = `
You are a planning agent.
Create a ${fallback.days}-day roadmap for ${company} ${role}.
Student scores: ${JSON.stringify(normalizeScores(studentData))}

Return ONLY valid JSON:
{
  "company":"${company}",
  "role":"${role}",
  "days":${fallback.days},
  "phases":[
    {"phase":1,"topic":"...","startDay":1,"endDay":7,"goal":"..."}
  ]
}
`;

  try {
    let result;
    try {
      result = await invokeWithModel(PRIMARY_MODEL, prompt);
    } catch {
      result = await invokeWithModel(FALLBACK_MODEL, prompt);
    }

    const parsed = parseJson(result.content, {});
    if (!Array.isArray(parsed.phases) || !parsed.phases.length) {
      return fallback;
    }
    return {
      company: parsed.company || company,
      role: parsed.role || role,
      days: Number(parsed.days) || fallback.days,
      phases: parsed.phases,
      source: "ai"
    };
  } catch {
    return fallback;
  }
}

module.exports = plannerAgent;