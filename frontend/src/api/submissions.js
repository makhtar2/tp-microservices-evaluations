import { api, withQuery } from "./client";

const BASE = "/api/submissions";

// Pour un étudiant, la gateway et submission-service ne renvoient que ses copies.
export function listSubmissions(params = {}) {
  return api.get(withQuery(BASE, params));
}

export function getSubmission(id) {
  return api.get(`${BASE}/${id}`);
}

// L'étudiant connecté est déduit du token : seul assessmentId est envoyé.
export function openSubmission(assessmentId) {
  return api.post(BASE, { assessmentId });
}

export function saveAnswers(id, reponses) {
  return api.put(`${BASE}/${id}/answers`, { reponses });
}

export function uploadFile(id, file) {
  const form = new FormData();
  form.append("file", file);
  return api.upload(`${BASE}/${id}/files`, form);
}

export function submitSubmission(id) {
  return api.post(`${BASE}/${id}/submit`);
}

// Les fichiers déposés (`/uploads/...`) sont servis via la gateway sous /api.
export function fileUrl(fichier) {
  return `/api${fichier.url}`;
}
