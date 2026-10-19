import { getToken, clearSession } from "../auth/session";

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Émis quand la gateway refuse le token (absent, expiré) : l'AuthProvider
// renvoie alors vers la page de connexion.
export const SESSION_EXPIRED_EVENT = "evalio:session-expired";

async function request(path, options = {}) {
  const token = getToken();
  const isForm = options.body instanceof FormData;
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 401 && token) {
    clearSession();
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }

  if (response.status === 204) return null;

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(response.status, body?.message || body?.error || "Erreur inconnue");
  }

  return body;
}

export const api = {
  get: (path) => request(path),
  post: (path, data) => request(path, { method: "POST", body: data === undefined ? undefined : JSON.stringify(data) }),
  put: (path, data) => request(path, { method: "PUT", body: JSON.stringify(data) }),
  patch: (path, data) => request(path, { method: "PATCH", body: JSON.stringify(data) }),
  del: (path) => request(path, { method: "DELETE" }),
  upload: (path, formData) => request(path, { method: "POST", body: formData }),
};

// Construit une query string en ignorant les paramètres vides.
export function withQuery(path, params = {}) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""))
  ).toString();
  return query ? `${path}?${query}` : path;
}

export { ApiError };
