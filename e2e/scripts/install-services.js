// Installe les dépendances de chaque service backend (prérequis de `npm test`).
const { execSync } = require("node:child_process");
const path = require("node:path");

const SERVICES = [
  "api-gateway",
  "user-service",
  "question-service",
  "assessment-service",
  "submission-service",
  "grading-service",
  "notification-service",
];

for (const name of SERVICES) {
  console.log(`> npm ci (${name})`);
  execSync("npm ci --omit=dev --no-audit --no-fund", { cwd: path.resolve(__dirname, "../..", name), stdio: "inherit" });
}
