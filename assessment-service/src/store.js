const crypto = require("node:crypto");

const assessments = new Map();

const STATUTS_MODIFIABLES = new Set(["BROUILLON", "PLANIFIEE"]);

function list({ enseignantId, status } = {}) {
  return [...assessments.values()].filter((assessment) => {
    if (enseignantId && assessment.enseignantId !== enseignantId) return false;
    if (status && assessment.status !== status) return false;
    return true;
  });
}

function get(id) {
  return assessments.get(id) || null;
}

function create(data) {
  const assessment = {
    id: crypto.randomUUID(),
    status: "BROUILLON",
    questionIds: [],
    createdAt: new Date().toISOString(),
    ...data,
  };
  assessments.set(assessment.id, assessment);
  return assessment;
}

function update(id, data) {
  const existing = assessments.get(id);
  if (!existing) return null;
  if (!STATUTS_MODIFIABLES.has(existing.status)) return "INVALID_STATUS";
  const updated = { ...existing, ...data, id: existing.id, status: existing.status };
  assessments.set(id, updated);
  return updated;
}

module.exports = { list, get, create, update };
