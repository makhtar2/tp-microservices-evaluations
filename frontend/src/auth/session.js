// Session de l'utilisateur connecté (JWT + profil renvoyés par
// /api/auth/login), conservée dans le navigateur pour survivre à un
// rechargement de page. Le stockage peut être indisponible (navigation
// privée stricte) : la session vit alors uniquement en mémoire.
const STORAGE_KEY = "evalio.session";

let current = read();

function read() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

export function getSession() {
  return current;
}

export function getToken() {
  return current?.token ?? null;
}

export function saveSession(session) {
  current = session;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // stockage indisponible : session en mémoire seulement
  }
}

export function clearSession() {
  current = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // rien à nettoyer
  }
}
