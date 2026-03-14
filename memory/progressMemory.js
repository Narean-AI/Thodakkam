const studentProgressStore = new Map();
const MAX_PROGRESS_ENTRIES = 500;

function normalizeStudentId(studentId) {
  return String(studentId || "anonymous").trim();
}

function normalizeTopic(topic) {
  return String(topic || "general").trim().toLowerCase();
}

function normalizeScore(score) {
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, numeric));
}

function ensureStudentRecord(studentId) {
  const key = normalizeStudentId(studentId);
  if (!studentProgressStore.has(key)) {
    studentProgressStore.set(key, {
      studentId: key,
      history: [],
      completedTasks: []
    });
  }
  return studentProgressStore.get(key);
}

function trimHistory(record) {
  while (record.history.length > MAX_PROGRESS_ENTRIES) {
    record.history.shift();
  }
  while (record.completedTasks.length > MAX_PROGRESS_ENTRIES) {
    record.completedTasks.shift();
  }
}

function addProgressEntry({ studentId, topic, score }) {
  const record = ensureStudentRecord(studentId);
  const entry = {
    topic: normalizeTopic(topic),
    score: normalizeScore(score),
    timestamp: new Date().toISOString()
  };
  record.history.push(entry);
  trimHistory(record);
  return entry;
}

function addCompletedTask({ studentId, task, topic }) {
  const record = ensureStudentRecord(studentId);
  const entry = {
    task: String(task || "").trim(),
    topic: normalizeTopic(topic),
    completedAt: new Date().toISOString()
  };
  record.completedTasks.push(entry);
  trimHistory(record);
  return entry;
}

function getStudentProgress(studentId) {
  const record = ensureStudentRecord(studentId);
  return {
    studentId: record.studentId,
    history: [...record.history],
    completedTasks: [...record.completedTasks]
  };
}

function getTopicStats(studentId) {
  const { history } = getStudentProgress(studentId);
  const grouped = history.reduce((accumulator, entry) => {
    const topic = entry.topic;
    if (!accumulator[topic]) {
      accumulator[topic] = [];
    }
    accumulator[topic].push(entry.score);
    return accumulator;
  }, {});

  return Object.entries(grouped).reduce((stats, [topic, scores]) => {
    const total = scores.reduce((sum, value) => sum + value, 0);
    const average = total / scores.length;
    const first = scores[0];
    const latest = scores[scores.length - 1];
    stats[topic] = {
      average,
      latest,
      trend: latest - first,
      attempts: scores.length
    };
    return stats;
  }, {});
}

module.exports = {
  addProgressEntry,
  addCompletedTask,
  getStudentProgress,
  getTopicStats
};