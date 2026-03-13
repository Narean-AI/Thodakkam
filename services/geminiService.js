const Groq = require("groq-sdk");

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const GROQ_MODEL_FALLBACKS = [
  GROQ_MODEL,
  "llama-3.3-70b-versatile",
  "llama-3.1-70b-versatile",
  "mixtral-8x7b-32768",
  "llama3-8b-8192"
];
const GROQ_TIMEOUT_MS = Number(process.env.GROQ_TIMEOUT_MS || 12000);
const GROQ_MAX_TOKENS = Number(process.env.GROQ_MAX_TOKENS || 1600);

function parseJsonFromText(text, fallback) {
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) return fallback;
    try { return JSON.parse(match[0]); } catch { return fallback; }
  }
}

async function promptGroq(prompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn("[Groq] GROQ_API_KEY not set — skipping AI call");
    return null;
  }

  const client = new Groq({ apiKey });
  const tried = new Set();

  for (const modelName of GROQ_MODEL_FALLBACKS) {
    if (!modelName || tried.has(modelName)) continue;
    tried.add(modelName);

    try {
      const request = client.chat.completions.create({
        model: modelName,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: GROQ_MAX_TOKENS
      });
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Groq request timeout")), GROQ_TIMEOUT_MS)
      );
      const result = await Promise.race([request, timeout]);
      const text = result?.choices?.[0]?.message?.content;
      if (text && String(text).trim()) return text;
    } catch (err) {
      try {
        const request = client.chat.completions.create({
          model: modelName,
          messages: [{ role: "user", content: `${prompt}\n\nReturn ONLY valid JSON. No markdown.` }],
          temperature: 0.2,
          max_tokens: GROQ_MAX_TOKENS
        });
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Groq request timeout")), GROQ_TIMEOUT_MS)
        );
        const result = await Promise.race([request, timeout]);
        const text = result?.choices?.[0]?.message?.content;
        if (text && String(text).trim()) return text;
      } catch (retryErr) {
        console.warn(`[Groq] Model ${modelName} failed: ${retryErr.message}`);
        continue;
      }
    }
  }

  return null;
}

function defaultPlan({ weakTopics, riskLevel }) {
  const focusTopics = weakTopics.length ? weakTopics : ["Core Problem Solving"];
  const roadmap = [];
  for (let day = 1; day <= 7; day++) {
    const topic = focusTopics[(day - 1) % focusTopics.length];
    const intensity = riskLevel === "HIGH" ? "high-intensity" : "focused";
    roadmap.push(`Day ${day}: ${intensity} practice on ${topic}, review mistakes, and do one timed mock round.`);
  }
  return roadmap;
}

async function generatePreparationStrategy({ weakTopics, riskLevel, company, role, previousPlan }) {
  const prompt = `You are a placement mentor. Create a 7-day preparation roadmap.
Return ONLY valid JSON in this exact shape:
{"preparationPlan":["Day 1: ...","Day 2: ...","Day 3: ...","Day 4: ...","Day 5: ...","Day 6: ...","Day 7: ..."]}

Context:
- Company: ${company}
- Role: ${role}
- Risk Level: ${riskLevel}
- Weak Topics: ${weakTopics.join(", ") || "None"}
- Previous Plan: ${previousPlan ? JSON.stringify(previousPlan) : "None"}

The plan must be adaptive, practical, and specific to weak topics.`;

  const text = await promptGroq(prompt);
  const parsed = parseJsonFromText(text, null);

  if (parsed && Array.isArray(parsed.preparationPlan) && parsed.preparationPlan.length === 7) {
    return { preparationPlan: parsed.preparationPlan, source: "ai" };
  }
  return { preparationPlan: defaultPlan({ weakTopics, riskLevel }), source: "fallback" };
}

async function generateMockInterviewQuestions({ company, role }) {
  const prompt = `Generate exactly 3 mock interview questions for ${company} ${role} role.
Return ONLY valid JSON: {"questions":["...","...","..."]}`;

  const text = await promptGroq(prompt);
  const parsed = parseJsonFromText(text, null);

  if (parsed && Array.isArray(parsed.questions) && parsed.questions.length >= 3) {
    return parsed.questions.slice(0, 3);
  }
  return [
    `Design a scalable ${role} service for ${company} that handles sudden traffic spikes.`,
    `Solve: Given an array, return the length of the longest subarray with sum <= K. Explain approach and complexity.`,
    `Describe a production bug you might face in distributed systems and how you would debug it.`
  ];
}

async function reasonSkillGaps({ weakTopics, topInterviewTopics, company, role }) {
  const prompt = `Reason briefly about placement skill gaps.
Return ONLY valid JSON: {"reasoning":"2-3 concise sentences"}

Company: ${company}
Role: ${role}
Weak Topics: ${weakTopics.join(", ") || "None"}
Top Interview Topics: ${topInterviewTopics.join(", ") || "None"}`;

  const text = await promptGroq(prompt);
  const parsed = parseJsonFromText(text, null);

  if (parsed && typeof parsed.reasoning === "string" && parsed.reasoning.trim()) {
    return parsed.reasoning.trim();
  }

  if (!weakTopics.length) {
    return "Current performance indicates low immediate risk. Keep practicing mixed-topic mocks to maintain consistency.";
  }
  const alignedGaps = weakTopics.filter(t =>
    topInterviewTopics.some(it => it.replace(/\s+/g, "").toLowerCase() === t.replace(/\s+/g, "").toLowerCase())
  );
  if (alignedGaps.length > 0) {
    return `Weakness in ${alignedGaps.join(", ")} directly overlaps with likely interview focus for ${company}, increasing interview risk for ${role}.`;
  }
  return `Weak areas (${weakTopics.join(", ")}) are currently outside key focus topics, so risk is moderate but still requires targeted revision.`;
}

async function generateCoachTasks({ weakTopics, riskLevel }) {
  const prompt = `Student weak in ${weakTopics.join(", ") || "general problem solving"}. Risk level: ${riskLevel}.
Suggest specific coding practice tasks.
Return ONLY valid JSON: {"nextTasks":["task 1","task 2","task 3"],"focusArea":"single topic"}

Task count: HIGH=4-5, MEDIUM=2-3, LOW=1-2.`;

  const text = await promptGroq(prompt);
  const parsed = parseJsonFromText(text, null);

  if (!parsed || !Array.isArray(parsed.nextTasks) || typeof parsed.focusArea !== "string") return null;
  return {
    nextTasks: parsed.nextTasks.filter(t => typeof t === "string" && t.trim()).map(t => t.trim()),
    focusArea: parsed.focusArea.trim()
  };
}

async function generateTrendInsights({ company, role, weakTopics = [] }) {
  const prompt = `You are an interview trend analyst.
Return ONLY valid JSON:
{"topInterviewTopics":["topic1","topic2","topic3"],"interviewDifficulty":"HARD","marketSignals":["signal 1","signal 2"],"confidence":0.8}

Company: ${company}
Role: ${role || "Software Engineer"}
Student weak topics: ${weakTopics.join(", ") || "None"}

Rules:
- topInterviewTopics: 3-6 concise topics
- interviewDifficulty: exactly HARD, MEDIUM, or LOW
- marketSignals: 2-4 concise trend observations
- confidence: number 0-1`;

  const text = await promptGroq(prompt);
  const parsed = parseJsonFromText(text, null);

  if (!parsed || !Array.isArray(parsed.topInterviewTopics) || typeof parsed.interviewDifficulty !== "string") return null;

  const topInterviewTopics = parsed.topInterviewTopics
    .filter(t => typeof t === "string" && t.trim()).map(t => t.trim()).slice(0, 6);
  if (topInterviewTopics.length < 3) return null;

  const difficulty = String(parsed.interviewDifficulty || "").toUpperCase();
  if (!["HARD", "MEDIUM", "LOW"].includes(difficulty)) return null;

  const marketSignals = Array.isArray(parsed.marketSignals)
    ? parsed.marketSignals.filter(s => typeof s === "string" && s.trim()).map(s => s.trim()).slice(0, 4)
    : [];

  const rawConf = Number(parsed.confidence);
  const confidence = Number.isFinite(rawConf) ? Math.max(0, Math.min(1, rawConf)) : 0.5;

  return { topInterviewTopics, interviewDifficulty: difficulty, marketSignals, confidence };
}

async function generateStructuredRoadmap({
  weakSubjects = [],
  strongSubjects = [],
  overallAccuracy = 0,
  avgSecondsPerQuestion = null,
  company,
  role,
  daysRequired = 30,
  riskLevel = "MEDIUM"
}) {
  const totalTopics = Math.min(4, Math.max(1, weakSubjects.length));
  const blockSize = Math.max(3, Math.floor(daysRequired / totalTopics));
  const totalWeeks = Math.max(1, Math.ceil(daysRequired / 7));

  const weakList = weakSubjects.length
    ? weakSubjects.map(s => `  - ${s.subject}: ${s.avgScore}% accuracy (${s.attempts} test${s.attempts === 1 ? "" : "s"})`).join("\n")
    : "  - General Problem Solving: no data yet";

  const strongList = strongSubjects.length
    ? strongSubjects.map(s => `  - ${s.subject}: ${s.avgScore}% accuracy`).join("\n")
    : "  - None identified yet";

  const speedNote = avgSecondsPerQuestion
    ? `${avgSecondsPerQuestion}s per question (target: ${Math.max(30, avgSecondsPerQuestion - 10)}s)`
    : "unknown";

  const prompt = `Return ONLY JSON matching this shape exactly:
{"topics":[{"topic":"","day":1,"endDay":${blockSize},"subtopics":["","","",""],"suggestedTests":["","",""],"dailyGoal":""}],"weeklyMilestones":[{"week":1,"goal":"","tests":3}],"successCriteria":["","",""]}

Build a ${daysRequired}-day roadmap for ${company} ${role}.
Profile: accuracy ${overallAccuracy}%, speed ${speedNote}, risk ${riskLevel}.
Weak topics:\n${weakList}
Strong topics:\n${strongList}

Rules:
- topics count = ${totalTopics}
- weeks count = ${totalWeeks}
- use specific technical subtopics/tests (not generic)
- day ranges must cover 1..${daysRequired}
- include numeric targets in successCriteria`;

  const text = await promptGroq(prompt);
  const parsed = parseJsonFromText(text, null);

  if (
    parsed &&
    Array.isArray(parsed.topics) && parsed.topics.length > 0 &&
    Array.isArray(parsed.weeklyMilestones) &&
    Array.isArray(parsed.successCriteria)
  ) {
    return parsed;
  }
  return null;
}

module.exports = {
  generatePreparationStrategy,
  generateMockInterviewQuestions,
  reasonSkillGaps,
  generateCoachTasks,
  generateStructuredRoadmap,
  generateTrendInsights
};
