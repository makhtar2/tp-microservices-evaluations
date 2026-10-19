const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");

// Un faux service en aval renvoie la requête qu'il a reçue (méthode,
// chemin, identité transmise) : on vérifie ainsi le routage de la gateway
// sans lancer les vrais microservices.
const SECRET = process.env.JWT_SECRET || "change-me-en-dev";
let upstream;
let gateway;
let baseUrl;

function echoServer(name) {
  return http.createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        service: name,
        method: req.method,
        url: req.url,
        userId: req.headers["x-user-id"],
        userRole: req.headers["x-user-role"],
      })
    );
  });
}

function listen(server) {
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));
}

before(async () => {
  upstream = {};
  for (const name of ["user", "question", "assessment", "submission", "grading"]) {
    upstream[name] = echoServer(name);
    const port = await listen(upstream[name]);
    process.env[`${name.toUpperCase()}_SERVICE_URL`] = `http://127.0.0.1:${port}`;
  }
  const app = require("../src/app");
  gateway = http.createServer(app);
  baseUrl = `http://127.0.0.1:${await listen(gateway)}`;
});

after(() => {
  gateway.close();
  for (const server of Object.values(upstream)) server.close();
});

const tokens = {
  etudiant: jwt.sign({ sub: "etu-1", role: "ETUDIANT" }, SECRET),
  enseignant: jwt.sign({ sub: "ens-1", role: "ENSEIGNANT" }, SECRET),
};

function call(method, path, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return fetch(baseUrl + path, { method, headers });
}

describe("api-gateway — routage", () => {
  const cases = [
    ["/api/auth/login", "user", "/auth/login"],
    ["/api/users/42", "user", "/users/42"],
    ["/api/questions?subject=Réseaux", "question", "/api/questions?subject=R%C3%A9seaux"],
    ["/api/questions/7", "question", "/api/questions/7"],
    ["/api/assessments", "assessment", "/assessments"],
    ["/api/assessments/a1/results", "assessment", "/assessments/a1/results"],
    ["/api/submissions?etudiantId=etu-1", "submission", "/submissions?etudiantId=etu-1"],
    ["/api/uploads/f.pdf", "submission", "/uploads/f.pdf"],
    ["/api/gradings/s1", "grading", "/gradings/s1"],
  ];

  for (const [path, service, expected] of cases) {
    it(`${path} → ${service}-service ${expected}`, async () => {
      const res = await call("GET", path, tokens.enseignant);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.service, service);
      assert.equal(body.url, expected);
    });
  }

  it("renvoie 404 pour une route inconnue", async () => {
    const res = await call("GET", "/api/inconnu", tokens.enseignant);
    assert.equal(res.status, 404);
  });

  it("répond sur /health sans authentification", async () => {
    const res = await call("GET", "/health");
    assert.deepEqual(await res.json(), { status: "ok", service: "api-gateway" });
  });
});

describe("api-gateway — authentification et rôles", () => {
  it("laisse passer /api/auth sans token", async () => {
    const res = await call("POST", "/api/auth/login");
    assert.equal(res.status, 200);
  });

  it("refuse les autres routes sans token", async () => {
    for (const path of ["/api/users", "/api/questions", "/api/assessments", "/api/submissions", "/api/gradings"]) {
      assert.equal((await call("GET", path)).status, 401, path);
    }
  });

  it("transmet l'identité vérifiée au service en aval", async () => {
    const body = await (await call("GET", "/api/submissions", tokens.etudiant)).json();
    assert.equal(body.userId, "etu-1");
    assert.equal(body.userRole, "ETUDIANT");
  });

  it("laisse un étudiant consulter les questions et évaluations", async () => {
    assert.equal((await call("GET", "/api/questions", tokens.etudiant)).status, 200);
    assert.equal((await call("GET", "/api/assessments", tokens.etudiant)).status, 200);
  });

  it("interdit à un étudiant de créer des questions ou des évaluations", async () => {
    assert.equal((await call("POST", "/api/questions", tokens.etudiant)).status, 403);
    assert.equal((await call("DELETE", "/api/assessments/a1", tokens.etudiant)).status, 403);
  });

  it("réserve la correction aux enseignants et administrateurs", async () => {
    assert.equal((await call("GET", "/api/gradings", tokens.etudiant)).status, 403);
    assert.equal((await call("GET", "/api/gradings", tokens.enseignant)).status, 200);
  });

  it("laisse un étudiant déposer sa copie", async () => {
    assert.equal((await call("POST", "/api/submissions", tokens.etudiant)).status, 200);
  });
});

describe("api-gateway — service indisponible", () => {
  it("renvoie 502 quand le service en aval ne répond pas", async () => {
    await new Promise((resolve) => upstream.grading.close(resolve));
    const res = await call("GET", "/api/gradings", tokens.enseignant);
    assert.equal(res.status, 502);
    assert.deepEqual(await res.json(), { message: "Service indisponible" });
  });
});
