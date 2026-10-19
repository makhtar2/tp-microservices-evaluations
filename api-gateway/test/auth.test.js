const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { authenticate, requireRole } = require("../src/auth");

const SECRET = process.env.JWT_SECRET || "change-me-en-dev";

// Requête / réponse Express minimales pour tester les middlewares.
function request({ headers = {}, method = "GET", user } = {}) {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return { method, user, headers: lower, get: (name) => lower[name.toLowerCase()] };
}

function run(middleware, req) {
  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  let nextCalled = false;
  middleware(req, res, () => {
    nextCalled = true;
  });
  return { res, nextCalled };
}

const token = (claims, options) => jwt.sign(claims, SECRET, options);

describe("authenticate", () => {
  it("transmet l'identité du token aux services via X-User-Id / X-User-Role", () => {
    const req = request({ headers: { Authorization: `Bearer ${token({ sub: "u-1", role: "ETUDIANT" })}` } });
    const { nextCalled } = run(authenticate, req);
    assert.equal(nextCalled, true);
    assert.deepEqual(req.user, { id: "u-1", role: "ETUDIANT" });
    assert.equal(req.headers["x-user-id"], "u-1");
    assert.equal(req.headers["x-user-role"], "ETUDIANT");
  });

  it("écrase les en-têtes X-User-* envoyés par le client (usurpation)", () => {
    const req = request({
      headers: {
        Authorization: `Bearer ${token({ sub: "u-1", role: "ETUDIANT" })}`,
        "X-User-Id": "admin-1",
        "X-User-Role": "ADMINISTRATEUR",
      },
    });
    run(authenticate, req);
    assert.equal(req.headers["x-user-id"], "u-1");
    assert.equal(req.headers["x-user-role"], "ETUDIANT");
  });

  it("supprime les en-têtes X-User-* même quand la requête est refusée", () => {
    const req = request({ headers: { "X-User-Id": "admin-1", "X-User-Role": "ADMINISTRATEUR" } });
    const { res, nextCalled } = run(authenticate, req);
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
    assert.equal(req.headers["x-user-id"], undefined);
    assert.equal(req.headers["x-user-role"], undefined);
  });

  it("refuse un token expiré ou signé avec un autre secret", () => {
    const expire = token({ sub: "u-1", role: "ETUDIANT" }, { expiresIn: -10 });
    const falsifie = jwt.sign({ sub: "u-1", role: "ADMINISTRATEUR" }, "autre-secret");
    for (const t of [expire, falsifie]) {
      const { res } = run(authenticate, request({ headers: { Authorization: `Bearer ${t}` } }));
      assert.equal(res.statusCode, 401);
    }
  });
});

describe("requireRole", () => {
  const WRITES = ["POST", "PUT", "PATCH", "DELETE"];
  const staffWrites = requireRole(["ADMINISTRATEUR", "ENSEIGNANT"], WRITES);

  it("laisse un étudiant lire une ressource protégée en écriture", () => {
    const { nextCalled } = run(staffWrites, request({ method: "GET", user: { role: "ETUDIANT" } }));
    assert.equal(nextCalled, true);
  });

  it("interdit l'écriture à un étudiant", () => {
    for (const method of WRITES) {
      const { res, nextCalled } = run(staffWrites, request({ method, user: { role: "ETUDIANT" } }));
      assert.equal(nextCalled, false, method);
      assert.equal(res.statusCode, 403, method);
    }
  });

  it("autorise l'écriture à un enseignant", () => {
    const { nextCalled } = run(staffWrites, request({ method: "POST", user: { role: "ENSEIGNANT" } }));
    assert.equal(nextCalled, true);
  });

  it("sans liste de méthodes, s'applique à toutes les méthodes", () => {
    const staffOnly = requireRole(["ENSEIGNANT"]);
    const { res } = run(staffOnly, request({ method: "GET", user: { role: "ETUDIANT" } }));
    assert.equal(res.statusCode, 403);
  });
});
