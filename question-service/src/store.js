const crypto = require("node:crypto");

const questions = new Map();

function list({ matiere, chapitre, difficulte, type, q } = {}) {
  return [...questions.values()].filter((question) => {
    if (matiere && question.matiere !== matiere) return false;
    if (chapitre && question.chapitre !== chapitre) return false;
    if (difficulte && question.difficulte !== difficulte) return false;
    if (type && question.type !== type) return false;
    if (q && !question.enonce.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
}

function get(id) {
  return questions.get(id) || null;
}

function create(data) {
  const question = {
    id: crypto.randomUUID(),
    active: true,
    createdAt: new Date().toISOString(),
    ...data,
  };
  questions.set(question.id, question);
  return question;
}

function update(id, data) {
  const existing = questions.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...data, id: existing.id };
  questions.set(id, updated);
  return updated;
}

function remove(id) {
  const existing = questions.get(id);
  if (!existing) return false;
  existing.active = false;
  questions.set(id, existing);
  return true;
}

function selectByCriteria({ matiere, difficulte, nombre }) {
  const pool = list({ matiere, difficulte }).filter((question) => question.active);
  return pool.slice(0, nombre);
}

module.exports = { list, get, create, update, remove, selectByCriteria };
