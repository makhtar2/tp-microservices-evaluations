const { describe, it, before, after, beforeEach, afterEach, mock } = require("node:test");
const assert = require("node:assert/strict");
const User = require("../src/models/User");
const { signToken } = require("../src/auth");
const app = require("../src/app");

// L'application Express tourne sur un port libre ; MongoDB est simulé en
// remplaçant les méthodes du modèle User.
let server;
let baseUrl;
let users;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

async function createUser(fields, password) {
  const user = new User({ nom: "Nom", prenom: "Prénom", ...fields });
  await user.setPassword(password);
  users.push(user);
  return user;
}

beforeEach(() => {
  users = [];
  mock.method(User, "findOne", async ({ email }) => users.find((u) => u.email === email) || null);
  mock.method(User, "exists", async ({ email }) => users.some((u) => u.email === email));
  mock.method(User, "findById", async (id) => users.find((u) => u.id === id) || null);
  mock.method(User.prototype, "save", async function save() {
    if (!users.includes(this)) users.push(this);
    return this;
  });
});

afterEach(() => mock.restoreAll());

function call(method, path, { body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(baseUrl + path, { method, headers, body: body && JSON.stringify(body) });
}

describe("POST /auth/login", () => {
  it("renvoie un token et l'utilisateur, sans le hash", async () => {
    await createUser({ email: "prof@ecole.sn", role: "ENSEIGNANT" }, "secret123");
    const res = await call("POST", "/auth/login", { body: { email: "PROF@ecole.sn", password: "secret123" } });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.token);
    assert.equal(body.user.role, "ENSEIGNANT");
    assert.equal(body.user.passwordHash, undefined);
  });

  it("refuse un mauvais mot de passe", async () => {
    await createUser({ email: "prof@ecole.sn", role: "ENSEIGNANT" }, "secret123");
    const res = await call("POST", "/auth/login", { body: { email: "prof@ecole.sn", password: "faux" } });
    assert.equal(res.status, 401);
  });

  it("refuse un email inconnu ou des champs manquants", async () => {
    assert.equal((await call("POST", "/auth/login", { body: { email: "x@y.z", password: "a" } })).status, 401);
    assert.equal((await call("POST", "/auth/login", { body: {} })).status, 401);
  });

  it("refuse un compte désactivé", async () => {
    await createUser({ email: "old@ecole.sn", role: "ETUDIANT", active: false }, "secret123");
    const res = await call("POST", "/auth/login", { body: { email: "old@ecole.sn", password: "secret123" } });
    assert.equal(res.status, 401);
    assert.match((await res.json()).message, /désactivé/);
  });
});

describe("POST /users (création de compte)", () => {
  const nouveau = { email: "etu@ecole.sn", password: "pass", nom: "Ndiaye", prenom: "Awa", role: "ETUDIANT" };

  it("est réservé à l'administrateur", async () => {
    const prof = await createUser({ email: "prof@ecole.sn", role: "ENSEIGNANT" }, "x");
    assert.equal((await call("POST", "/users", { body: nouveau })).status, 401);
    assert.equal((await call("POST", "/users", { body: nouveau, token: signToken(prof) })).status, 403);
  });

  it("crée le compte avec un mot de passe haché", async () => {
    const admin = await createUser({ email: "admin@ecole.sn", role: "ADMINISTRATEUR" }, "x");
    const res = await call("POST", "/users", { body: nouveau, token: signToken(admin) });
    assert.equal(res.status, 201);
    assert.equal((await res.json()).email, "etu@ecole.sn");
    const created = users.find((u) => u.email === "etu@ecole.sn");
    assert.equal(await created.checkPassword("pass"), true);
  });

  it("refuse un rôle invalide ou un champ manquant", async () => {
    const admin = await createUser({ email: "admin@ecole.sn", role: "ADMINISTRATEUR" }, "x");
    const token = signToken(admin);
    assert.equal((await call("POST", "/users", { body: { ...nouveau, role: "ROOT" }, token })).status, 400);
    assert.equal((await call("POST", "/users", { body: { ...nouveau, nom: undefined }, token })).status, 400);
  });

  it("refuse un email déjà utilisé", async () => {
    const admin = await createUser({ email: "admin@ecole.sn", role: "ADMINISTRATEUR" }, "x");
    const res = await call("POST", "/users", { body: { ...nouveau, email: "Admin@ecole.sn" }, token: signToken(admin) });
    assert.equal(res.status, 409);
  });
});

describe("GET /users/:id", () => {
  it("permet à un utilisateur de consulter son propre profil", async () => {
    const etu = await createUser({ email: "etu@ecole.sn", role: "ETUDIANT" }, "x");
    const res = await call("GET", `/users/${etu.id}`, { token: signToken(etu) });
    assert.equal(res.status, 200);
  });

  it("interdit de consulter le profil d'un autre utilisateur", async () => {
    const etu = await createUser({ email: "etu@ecole.sn", role: "ETUDIANT" }, "x");
    const autre = await createUser({ email: "autre@ecole.sn", role: "ETUDIANT" }, "x");
    const res = await call("GET", `/users/${autre.id}`, { token: signToken(etu) });
    assert.equal(res.status, 403);
  });

  it("renvoie 404 pour un identifiant invalide", async () => {
    const admin = await createUser({ email: "admin@ecole.sn", role: "ADMINISTRATEUR" }, "x");
    const res = await call("GET", "/users/pas-un-object-id", { token: signToken(admin) });
    assert.equal(res.status, 404);
  });
});

describe("PATCH /users/:id/status", () => {
  it("empêche un administrateur de désactiver son propre compte", async () => {
    const admin = await createUser({ email: "admin@ecole.sn", role: "ADMINISTRATEUR" }, "x");
    const res = await call("PATCH", `/users/${admin.id}/status`, { body: { active: false }, token: signToken(admin) });
    assert.equal(res.status, 400);
    assert.equal(admin.active, true);
  });

  it("désactive le compte d'un autre utilisateur", async () => {
    const admin = await createUser({ email: "admin@ecole.sn", role: "ADMINISTRATEUR" }, "x");
    const etu = await createUser({ email: "etu@ecole.sn", role: "ETUDIANT" }, "x");
    const res = await call("PATCH", `/users/${etu.id}/status`, { body: { active: false }, token: signToken(admin) });
    assert.equal(res.status, 200);
    assert.equal(etu.active, false);
  });

  it("exige un booléen", async () => {
    const admin = await createUser({ email: "admin@ecole.sn", role: "ADMINISTRATEUR" }, "x");
    const etu = await createUser({ email: "etu@ecole.sn", role: "ETUDIANT" }, "x");
    const res = await call("PATCH", `/users/${etu.id}/status`, { body: { active: "non" }, token: signToken(admin) });
    assert.equal(res.status, 400);
  });
});
