const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { authenticate, requireRole } = require("./auth");

const SERVICES = {
  user: process.env.USER_SERVICE_URL || "http://localhost:3001",
  question: process.env.QUESTION_SERVICE_URL || "http://localhost:3002",
  assessment: process.env.ASSESSMENT_SERVICE_URL || "http://localhost:3003",
  submission: process.env.SUBMISSION_SERVICE_URL || "http://localhost:3004",
  grading: process.env.GRADING_SERVICE_URL || "http://localhost:3005",
};

const STAFF = ["ADMINISTRATEUR", "ENSEIGNANT"];
const WRITES = ["POST", "PUT", "PATCH", "DELETE"];

// Routes exposées au frontend, toutes sous /api. `stripApi` retire le
// préfixe pour les services dont les routes n'en ont pas.
const ROUTES = [
  { prefix: "/api/auth", target: SERVICES.user, stripApi: true, public: true },
  { prefix: "/api/users", target: SERVICES.user, stripApi: true },
  { prefix: "/api/questions", target: SERVICES.question, stripApi: false, guard: requireRole(STAFF, WRITES) },
  { prefix: "/api/assessments", target: SERVICES.assessment, stripApi: true, guard: requireRole(STAFF, WRITES) },
  { prefix: "/api/submissions", target: SERVICES.submission, stripApi: true },
  { prefix: "/api/uploads", target: SERVICES.submission, stripApi: true },
  { prefix: "/api/gradings", target: SERVICES.grading, stripApi: true, guard: requireRole(STAFF) },
];

const app = express();
app.use(cors());
app.get("/health", (req, res) => res.json({ status: "ok", service: "api-gateway" }));

for (const route of ROUTES) {
  const middlewares = route.public ? [] : [authenticate];
  if (route.guard) middlewares.push(route.guard);

  const proxy = createProxyMiddleware({
    target: route.target,
    changeOrigin: true,
    // Monté sur `prefix`, Express a retiré le préfixe de req.url : on le
    // remet (sans /api si le service n'utilise pas ce préfixe).
    pathRewrite: (path) =>
      (route.stripApi ? route.prefix.replace(/^\/api/, "") : route.prefix) + path.replace(/^\/(?=\?|$)/, ""),
    on: {
      error: (err, req, res) => {
        console.error(`[api-gateway] ${route.target} injoignable :`, err.message);
        if (!res.headersSent) res.status(502).json({ message: "Service indisponible" });
      },
    },
  });

  app.use(route.prefix, ...middlewares, proxy);
}

app.use((req, res) => res.status(404).json({ message: "Route inconnue" }));

module.exports = app;
