const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { signToken, authenticate, requireRole } = require("../src/auth");

const SECRET = process.env.JWT_SECRET || "change-me-en-dev";

// Requête / réponse Express minimales pour tester les middlewares.
function request(headers = {}, user) {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return { user, get: (name) => lower[name.toLowerCase()] };
}

function response() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function run(middleware, req) {
  const res = response();
  let nextCalled = false;
  middleware(req, res, () => {
    nextCalled = true;
  });
  return { res, nextCalled };
}

const user = { id: "u-1", role: "ENSEIGNANT", email: "prof@ecole.sn" };

describe("signToken", () => {
  it("place l'identifiant, le rôle et l'email dans le token", () => {
    const claims = jwt.verify(signToken(user), SECRET);
    assert.equal(claims.sub, "u-1");
    assert.equal(claims.role, "ENSEIGNANT");
    assert.equal(claims.email, "prof@ecole.sn");
  });

  it("donne une date d'expiration au token", () => {
    const claims = jwt.verify(signToken(user), SECRET);
    assert.ok(claims.exp > claims.iat);
  });
});

describe("authenticate", () => {
  it("accepte un token valide et expose l'utilisateur", () => {
    const req = request({ Authorization: `Bearer ${signToken(user)}` });
    const { res, nextCalled } = run(authenticate, req);
    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(req.user, user);
  });

  it("refuse une requête sans en-tête Authorization", () => {
    const { res, nextCalled } = run(authenticate, request());
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
  });

  it("refuse un autre schéma que Bearer", () => {
    const { res } = run(authenticate, request({ Authorization: `Basic ${signToken(user)}` }));
    assert.equal(res.statusCode, 401);
  });

  it("refuse un token signé avec un autre secret", () => {
    const token = jwt.sign({ sub: "u-1", role: "ADMINISTRATEUR" }, "autre-secret");
    const { res, nextCalled } = run(authenticate, request({ Authorization: `Bearer ${token}` }));
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
  });

  it("refuse un token expiré", () => {
    const token = jwt.sign({ sub: "u-1", role: "ETUDIANT" }, SECRET, { expiresIn: -10 });
    const { res } = run(authenticate, request({ Authorization: `Bearer ${token}` }));
    assert.equal(res.statusCode, 401);
    assert.match(res.body.message, /expiré/);
  });

  it("refuse un token mal formé", () => {
    const { res } = run(authenticate, request({ Authorization: "Bearer abc.def" }));
    assert.equal(res.statusCode, 401);
  });
});

describe("requireRole", () => {
  it("laisse passer un rôle autorisé", () => {
    const { nextCalled } = run(requireRole("ADMINISTRATEUR", "ENSEIGNANT"), request({}, user));
    assert.equal(nextCalled, true);
  });

  it("refuse un rôle non autorisé avec 403", () => {
    const { res, nextCalled } = run(requireRole("ADMINISTRATEUR"), request({}, { ...user, role: "ETUDIANT" }));
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
  });
});
