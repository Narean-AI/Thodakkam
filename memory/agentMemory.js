const roadmapMemory = [];
const observationMemory = [];

const MAX_ROADMAP_ITEMS = 100;
const MAX_OBSERVATION_ITEMS = 300;

function trimStore(store, maxItems) {
  while (store.length > maxItems) {
    store.shift();
  }
}

function saveRoadmap(entry) {
  roadmapMemory.push({
    ...entry,
    timestamp: new Date().toISOString()
  });
  trimStore(roadmapMemory, MAX_ROADMAP_ITEMS);
}

function saveObservation(observation) {
  observationMemory.push({
    ...observation,
    timestamp: new Date().toISOString()
  });
  trimStore(observationMemory, MAX_OBSERVATION_ITEMS);
}

function getRoadmapMemory() {
  return [...roadmapMemory];
}

function getObservationMemory() {
  return [...observationMemory];
}

function getRecentObservations(count = 5) {
  const safeCount = Math.max(1, Number(count) || 5);
  return observationMemory.slice(-safeCount);
}

module.exports = {
  saveRoadmap,
  saveObservation,
  getRoadmapMemory,
  getObservationMemory,
  getRecentObservations
};