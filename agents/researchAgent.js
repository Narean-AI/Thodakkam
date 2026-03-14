const { ChatGroq } = require("@langchain/groq");

const PRIMARY_MODEL = process.env.GROQ_MODEL || "llama3-70b-8192";
const FALLBACK_MODEL = "llama-3.3-70b-versatile";

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

function fallbackResearch(plan = {}, company = "Amazon", role = "Software Engineer") {
  const trustedLinksByRole = {
    frontend: [
      "https://react.dev/learn",
      "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
      "https://www.frontendmentor.io/challenges"
    ],
    backend: [
      "https://roadmap.sh/backend",
      "https://www.geeksforgeeks.org/system-design-tutorial/",
      "https://www.hackerrank.com/domains/backend"
    ],
    data: [
      "https://www.hackerrank.com/domains/sql",
      "https://www.kaggle.com/learn",
      "https://www.geeksforgeeks.org/data-science-for-beginners/"
    ],
    general: [
      "https://leetcode.com/studyplan/top-interview-150/",
      "https://takeuforward.org/interviews/strivers-sde-sheet-top-coding-interview-problems/",
      "https://www.hackerrank.com/domains/algorithms"
    ]
  };

  const roleKey = String(role).toLowerCase().includes("front")
    ? "frontend"
    : String(role).toLowerCase().includes("back")
      ? "backend"
      : String(role).toLowerCase().includes("data")
        ? "data"
        : "general";

  const links = trustedLinksByRole[roleKey] || trustedLinksByRole.general;
  const phases = Array.isArray(plan.phases) ? plan.phases : [];

  const enrichedPhases = phases.map((phase, index) => ({
    ...phase,
    trendNotes: [`${company} interview focus: ${phase.topic}`],
    resources: [
      links[index % links.length],
      links[(index + 1) % links.length]
    ]
  }));

  return {
    company,
    role,
    days: plan.days || 30,
    phases: enrichedPhases,
    source: plan.source || "fallback"
  };
}

async function researchAgent(plan = {}, company = "Amazon", role = "Software Engineer") {
  const fallback = fallbackResearch(plan, company, role);
  if (!process.env.GROQ_API_KEY) {
    return fallback;
  }

  const prompt = `
You are a research agent for interview preparation.
Given roadmap phases for ${company} ${role}, add trend-aware notes and reliable practice resources.

Phases:
${JSON.stringify(plan?.phases || [], null, 2)}

Return ONLY valid JSON in this shape:
{
  "phases":[
    {
      "phase":1,
      "topic":"...",
      "startDay":1,
      "endDay":7,
      "goal":"...",
      "trendNotes":["..."],
      "resources":["https://...","https://..."]
    }
  ]
}

Use high-quality resources only (leetcode, hackerrank, geeksforgeeks, roadmap.sh, react.dev, MDN, kaggle).`;

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
      company,
      role,
      days: plan.days || 30,
      phases: parsed.phases,
      source: "ai"
    };
  } catch {
    return fallback;
  }
}

module.exports = researchAgent;
