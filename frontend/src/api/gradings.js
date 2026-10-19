import { api, withQuery } from "./client";

const BASE = "/api/gradings";

// Copies à corriger ou à valider ; includeFailed ajoute les corrections
// automatiques en attente ou abandonnées (à relancer).
export function listPending(params = {}) {
  return api.get(withQuery(`${BASE}/pending`, params));
}

export function getGrading(submissionId) {
  return api.get(`${BASE}/${submissionId}`);
}

export function gradeQuestion(submissionId, questionId, { note, commentaire }) {
  return api.put(`${BASE}/${submissionId}/questions/${questionId}`, { note, commentaire });
}

export function validateGrading(submissionId) {
  return api.post(`${BASE}/${submissionId}/validate`);
}

export function retryGrading(submissionId) {
  return api.post(`${BASE}/${submissionId}/retry`);
}
