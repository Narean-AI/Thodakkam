const VERIFICATION_THRESHOLD = 0.7;

function normalizeTopicKey(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeScores(studentData = {}) {
  if (studentData && typeof studentData.scores === "object" && studentData.scores) {
    return studentData.scores;
  }

  return Object.entries(studentData || {}).reduce((accumulator, [topic, score]) => {
    const numeric = Number(score);
    if (Number.isFinite(numeric)) {
      accumulator[topic] = numeric;
    }
    return accumulator;
  }, {});
}

function clampRatio(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(1, numeric));
}

function toRatio(score) {
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) return null;
  if (numeric <= 10) return clampRatio(numeric / 10);
  return clampRatio(numeric / 100);
}

function buildTopicSignalMap(studentData = {}, topicStats = {}) {
  const scores = normalizeScores(studentData);
  const signalMap = new Map();

  Object.entries(scores).forEach(([topic, score]) => {
    const key = normalizeTopicKey(topic);
    signalMap.set(key, {
      topic,
      baselineScore: Number(score),
      stats: null
    });
  });

  Object.entries(topicStats || {}).forEach(([topic, stats]) => {
    const key = normalizeTopicKey(topic);
    const existing = signalMap.get(key) || {
      topic,
      baselineScore: null,
      stats: null
    };

    existing.topic = existing.topic || topic;
    existing.stats = stats;
    signalMap.set(key, existing);
  });

  return signalMap;
}

function computeReadiness(signal = {}) {
  const baselineRatio = toRatio(signal.baselineScore);
  const averageRatio = toRatio(signal.stats?.average);
  const latestRatio = toRatio(signal.stats?.latest);
  const attempts = Number(signal.stats?.attempts || 0);
  const trend = Number(signal.stats?.trend || 0);

  if (baselineRatio === null && averageRatio === null && latestRatio === null) {
    return 0.5;
  }

  const baselineWeight = baselineRatio === null ? 0 : 0.25;
  const averageWeight = averageRatio === null ? 0 : 0.35;
  const latestWeight = latestRatio === null ? 0 : 0.4;
  const totalWeight = baselineWeight + averageWeight + latestWeight || 1;

  const weighted = (
    ((baselineRatio || 0) * baselineWeight) +
    ((averageRatio || 0) * averageWeight) +
    ((latestRatio || 0) * latestWeight)
  ) / totalWeight;

  const trendBonus = attempts >= 2
    ? Math.max(-0.1, Math.min(0.1, trend / 100))
    : 0;

  return clampRatio(weighted + trendBonus);
}

function getRiskLevel(readinessScore, signal = {}) {
  const attempts = Number(signal.stats?.attempts || 0);
  const trend = Number(signal.stats?.trend || 0);

  if (readinessScore < 0.45 || (attempts >= 2 && trend <= -10)) {
    return "HIGH";
  }

  if (readinessScore < VERIFICATION_THRESHOLD) {
    return "MEDIUM";
  }

  return "LOW";
}

function buildCheckpoint(phase = {}, signal = {}, company, role, index) {
  const topic = phase.topic || signal.topic || `Topic ${index + 1}`;
  const readinessScore = computeReadiness(signal);
  const riskLevel = getRiskLevel(readinessScore, signal);
  const status = readinessScore >= VERIFICATION_THRESHOLD
    ? "ready"
    : readinessScore >= 0.5
      ? "in_progress"
      : "needs_intervention";

  const evidence = [];
  if (Number.isFinite(signal.baselineScore)) {
    evidence.push(`Baseline score: ${signal.baselineScore}`);
  }
  if (signal.stats?.attempts) {
    evidence.push(`Attempts: ${signal.stats.attempts}`);
    evidence.push(`Latest accuracy: ${Math.round(Number(signal.stats.latest || 0))}%`);
  }
  if (Number.isFinite(Number(signal.stats?.trend))) {
    const trend = Number(signal.stats.trend);
    evidence.push(`Trend: ${trend >= 0 ? "+" : ""}${Math.round(trend)} points`);
  }

  return {
    checkpointId: `placement-checkpoint-${index + 1}`,
    topic,
    title: `${topic} readiness for ${company} ${role}`,
    description: phase.goal || `Improve ${topic} for ${company} ${role}`,
    startDay: Number(phase.startDay || ((index * 7) + 1)),
    endDay: Number(phase.endDay || (index + 1) * 7),
    status,
    readinessScore: Number(readinessScore.toFixed(2)),
    verificationThreshold: VERIFICATION_THRESHOLD,
    riskLevel,
    criteria: [
      `Reach at least ${Math.round(VERIFICATION_THRESHOLD * 100)}% readiness on ${topic}`,
      `Complete the planned ${topic} practice block within days ${Number(phase.startDay || 1)}-${Number(phase.endDay || 7)}`,
      `Finish at least one timed assessment aligned to ${topic}`
    ],
    verificationMethod: signal.stats?.attempts
      ? "Use recent accuracy trend, attempts, and plan completion to verify readiness."
      : "Use baseline score and completion of the first timed assessment to verify readiness.",
    resources: Array.isArray(phase.resources) ? phase.resources.slice(0, 3) : [],
    evidence
  };
}

function buildIntervention(checkpoint = {}) {
  const dayRange = `days ${checkpoint.startDay}-${checkpoint.endDay}`;
  const baseTasks = [
    `Revisit ${checkpoint.topic} core patterns during ${dayRange}`,
    `Solve 3 timed ${checkpoint.topic} problems and log mistakes`,
    `Take one verification quiz for ${checkpoint.topic}`
  ];

  if (checkpoint.riskLevel === "HIGH") {
    baseTasks.unshift(`Run a focused recovery session for ${checkpoint.topic} before moving to the next phase`);
  }

  return {
    checkpointId: checkpoint.checkpointId,
    topic: checkpoint.topic,
    priority: checkpoint.riskLevel,
    reason: `${checkpoint.topic} is below the ${Math.round(VERIFICATION_THRESHOLD * 100)}% readiness threshold`,
    tasks: baseTasks,
    recommendedResources: checkpoint.resources,
    targetReadinessScore: VERIFICATION_THRESHOLD
  };
}

function buildReadinessSummary(checkpoints = []) {
  return checkpoints.reduce((summary, checkpoint) => {
    summary.total += 1;
    summary[checkpoint.status] += 1;
    if (checkpoint.riskLevel === "HIGH") {
      summary.highRisk += 1;
    }
    return summary;
  }, {
    total: 0,
    ready: 0,
    in_progress: 0,
    needs_intervention: 0,
    highRisk: 0
  });
}

function placementLearningAgent({
  studentId = "anonymous",
  studentData = {},
  company = "Amazon",
  role = "Software Engineer",
  days = 30,
  plan = {},
  researchedPlan = {},
  roadmap = {},
  progressSummary = {}
} = {}) {
  const phases = Array.isArray(researchedPlan.phases)
    ? researchedPlan.phases
    : Array.isArray(plan.phases)
      ? plan.phases
      : [];
  const signalMap = buildTopicSignalMap(studentData, progressSummary.topicStats || {});

  const checkpoints = phases.map((phase, index) => {
    const signal = signalMap.get(normalizeTopicKey(phase.topic)) || {
      topic: phase.topic,
      baselineScore: null,
      stats: null
    };
    return buildCheckpoint(phase, signal, company, role, index);
  });

  const interventionQueue = checkpoints
    .filter((checkpoint) => checkpoint.status !== "ready")
    .map(buildIntervention);
  const nextCheckpoint = checkpoints.find((checkpoint) => checkpoint.status !== "ready") || checkpoints[0] || null;
  const readinessSummary = buildReadinessSummary(checkpoints);

  const topicSignals = checkpoints.map((checkpoint) => ({
    topic: checkpoint.topic,
    readinessScore: checkpoint.readinessScore,
    riskLevel: checkpoint.riskLevel,
    status: checkpoint.status
  }));

  return {
    roadmap: {
      ...roadmap,
      agentType: "placement-learning-agent",
      checkpoints,
      interventionQueue,
      nextFocus: nextCheckpoint ? {
        checkpointId: nextCheckpoint.checkpointId,
        topic: nextCheckpoint.topic,
        title: nextCheckpoint.title,
        status: nextCheckpoint.status,
        readinessScore: nextCheckpoint.readinessScore,
        dayRange: {
          startDay: nextCheckpoint.startDay,
          endDay: nextCheckpoint.endDay
        }
      } : null,
      readinessSummary,
      mentorLoop: {
        verificationThreshold: VERIFICATION_THRESHOLD,
        sequence: ["plan", "research", "execute", "verify", "intervene"],
        lastUpdated: new Date().toISOString()
      }
    },
    agentState: {
      agentType: "placement-learning-agent",
      studentId,
      company,
      role,
      days,
      verificationThreshold: VERIFICATION_THRESHOLD,
      checkpoints,
      topicSignals,
      readinessSummary,
      currentCheckpoint: nextCheckpoint,
      interventionQueue
    }
  };
}

module.exports = placementLearningAgent;