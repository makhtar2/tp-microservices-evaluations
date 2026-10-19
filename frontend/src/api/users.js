import { api, withQuery } from "./client";

const BASE = "/api/users";

export function listUsers(params = {}) {
  return api.get(withQuery(BASE, params));
}

export function createUser(data) {
  return api.post(BASE, data);
}

export function updateUser(id, data) {
  return api.put(`${BASE}/${id}`, data);
}

export function setUserActive(id, active) {
  return api.patch(`${BASE}/${id}/status`, { active });
}
