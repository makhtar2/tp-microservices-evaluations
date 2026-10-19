import { api } from "./client";

const BASE = "/api/questions";

export function listQuestions(params = {}) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ""))
  ).toString();
  return api.get(query ? `${BASE}?${query}` : BASE);
}

// Pour un étudiant, question-service ne renvoie pas les bonnes réponses.
export function getQuestion(id) {
  return api.get(`${BASE}/${id}`);
}

export function createQuestion(data) {
  return api.post(BASE, data);
}

export function deleteQuestion(id) {
  return api.del(`${BASE}/${id}`);
}
