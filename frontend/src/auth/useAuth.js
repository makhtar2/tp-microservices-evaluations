import { createContext, useContext } from "react";

export const AuthContext = createContext(null);

// { user, login(email, password), logout() } — voir AuthProvider.
export function useAuth() {
  return useContext(AuthContext);
}

// Page d'accueil de chaque rôle après connexion.
export function homePath(role) {
  return role === "ETUDIANT" ? "/mes-evaluations" : role === "ADMINISTRATEUR" ? "/utilisateurs" : "/";
}
