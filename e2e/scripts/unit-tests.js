// Lance les tests unitaires (`npm test`) de chaque service backend et
// affiche un récapitulatif. Aucun MongoDB ni RabbitMQ n'est nécessaire :
// les tests unitaires simulent la base et le broker.
const { spawnSync } = require("node:child_process");
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

const failed = [];

for (const name of SERVICES) {
  console.log(`\n> npm test (${name})`);
  const result = spawnSync("npm", ["test"], {
    cwd: path.resolve(__dirname, "../..", name),
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) failed.push(name);
}

console.log(`\nTests unitaires : ${SERVICES.length - failed.length}/${SERVICES.length} services OK`);
if (failed.length > 0) {
  console.error(`Échecs : ${failed.join(", ")}`);
  process.exit(1);
}
