// Client HTTP des tests : tout passe par l'api-gateway, comme le frontend,
// avec le JWT obtenu via /api/auth/login.
const { GATEWAY_URL } = require("./stack");

const ACCOUNTS = {
  admin: { email: "admin@evaluations.local", password: "admin123" },
  enseignant: { email: "enseignant@evaluations.local", password: "enseignant123" },
  etudiant: { email: "etudiant@evaluations.local", password: "etudiant123" },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(method, path, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method,
    headers,
    body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, body: data };
}

// Client lié à un utilisateur connecté : `user` (profil) + verbes HTTP.
function clientFor(token, user) {
  return {
    user,
    get: (path) => request("GET", path, { token }),
    post: (path, body) => request("POST", path, { token, body }),
    put: (path, body) => request("PUT", path, { token, body }),
    upload: (path, form) => request("POST", path, { token, form }),
  };
}

async function login({ email, password }) {
  const res = await request("POST", "/api/auth/login", { body: { email, password } });
  if (res.status !== 200) throw new Error(`Connexion impossible pour ${email} : HTTP ${res.status}`);
  return clientFor(res.body.token, res.body.user);
}

// Crée un compte via l'administrateur (ex. un second étudiant) et s'y connecte.
async function createAndLogin(admin, { role, prefix }) {
  const email = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@e2e.local`;
  const password = "motdepasse-e2e";
  const res = await admin.post("/api/users", { email, password, nom: prefix, prenom: "E2E", role });
  if (res.status !== 201) throw new Error(`Création de ${email} impossible : HTTP ${res.status}`);
  return login({ email, password });
}

// Les services communiquent par événements : on interroge jusqu'à ce que
// l'état attendu soit atteint (cohérence à terme).
async function eventually(label, fn, { timeoutMs = 10000, intervalMs = 200 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    last = await fn();
    if (last.done) return last.value;
    await sleep(intervalMs);
  }
  throw new Error(`${label} : état attendu non atteint après ${timeoutMs} ms (dernier : ${JSON.stringify(last?.value)})`);
}

// Ouvre une copie dès que submission-service a consommé AssessmentPublished.
// Renvoie la réponse finale, qu'elle soit un succès ou un refus métier.
function openSubmission(etudiant, assessmentId) {
  return eventually("Ouverture de la copie", async () => {
    const res = await etudiant.post("/api/submissions", { assessmentId, etudiantId: etudiant.user.id });
    const notYetReceived = res.status === 409 && res.body?.message === "Évaluation non publiée";
    return { done: !notYetReceived, value: res };
  });
}

// Attend que grading-service ait traité SubmissionCompleted.
function waitForGrading(enseignant, submissionId) {
  return eventually("Correction automatique", async () => {
    const res = await enseignant.get(`/api/gradings/${submissionId}`);
    return { done: res.status === 200, value: res.body };
  });
}

module.exports = { ACCOUNTS, request, login, createAndLogin, eventually, openSubmission, waitForGrading, sleep };
