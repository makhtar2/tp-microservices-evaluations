import { api } from "./client";

// Renvoie { token, user } (user : id, email, nom, prenom, role).
export function login(email, password) {
  return api.post("/api/auth/login", { email, password });
}
