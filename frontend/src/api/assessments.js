import { api } from "./client";

const BASE = "/api/assessments";

export function listAssessments(params = {}) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ""))
  ).toString();
  return api.get(query ? `${BASE}?${query}` : BASE);
}

export function getAssessment(id) {
  return api.get(`${BASE}/${id}`);
}

export function createAssessment(data) {
  return api.post(BASE, data);
}

export function publishAssessment(id) {
  return api.post(`${BASE}/${id}/publish`);
}

export function cancelAssessment(id) {
  return api.post(`${BASE}/${id}/cancel`);
}

export function getResults(id) {
  return api.get(`${BASE}/${id}/results`);
}
