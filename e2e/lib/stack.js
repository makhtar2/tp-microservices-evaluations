// Démarre la plateforme complète pour les tests bout-en-bout :
// infrastructure (MongoDB + RabbitMQ via docker compose), puis chaque
// service Node en processus enfant, sur des ports dédiés (pas de conflit
// avec une instance de développement déjà lancée).
const { spawn, execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const E2E_DIR = path.resolve(__dirname, "..");
const LOG_DIR = path.join(E2E_DIR, "logs");

const BASE_PORT = Number(process.env.E2E_BASE_PORT || 4100);
const MONGO_PORT = process.env.E2E_MONGO_PORT || "27018";
const RABBITMQ_PORT = process.env.E2E_RABBITMQ_PORT || "5673";
const GRPC_PORT = BASE_PORT + 62;
const JWT_SECRET = "secret-e2e";

const MONGO = (db) => `mongodb://127.0.0.1:${MONGO_PORT}/e2e_${db}`;
const RABBITMQ_URL = `amqp://127.0.0.1:${RABBITMQ_PORT}`;
const URL = (port) => `http://127.0.0.1:${port}`;

const PORTS = {
  gateway: BASE_PORT,
  user: BASE_PORT + 1,
  question: BASE_PORT + 2,
  assessment: BASE_PORT + 3,
  submission: BASE_PORT + 4,
  grading: BASE_PORT + 5,
};

const SERVICES = {
  "user-service": { port: PORTS.user, env: { MONGO_URI: MONGO("user"), JWT_SECRET } },
  "question-service": { port: PORTS.question, env: { MONGO_URI: MONGO("question"), GRPC_PORT } },
  "assessment-service": {
    port: PORTS.assessment,
    env: { MONGO_URI: MONGO("assessment"), QUESTION_SERVICE_GRPC_URL: `127.0.0.1:${GRPC_PORT}`, RABBITMQ_URL },
    subscribes: true,
  },
  "submission-service": {
    port: PORTS.submission,
    env: {
      MONGO_URI: MONGO("submission"),
      RABBITMQ_URL,
      UPLOAD_DIR: fs.mkdtempSync(path.join(os.tmpdir(), "e2e-uploads-")),
    },
    subscribes: true,
  },
  "grading-service": {
    port: PORTS.grading,
    env: {
      MONGO_URI: MONGO("grading"),
      RABBITMQ_URL,
      ASSESSMENT_SERVICE_URL: URL(PORTS.assessment),
      QUESTION_SERVICE_URL: URL(PORTS.question),
    },
    subscribes: true,
  },
  // Pas d'API REST : seul son abonnement RabbitMQ indique qu'il est prêt.
  "notification-service": { env: { MONGO_URI: MONGO("notification"), RABBITMQ_URL }, subscribes: true },
  "api-gateway": {
    port: PORTS.gateway,
    env: {
      JWT_SECRET,
      USER_SERVICE_URL: URL(PORTS.user),
      QUESTION_SERVICE_URL: URL(PORTS.question),
      ASSESSMENT_SERVICE_URL: URL(PORTS.assessment),
      SUBMISSION_SERVICE_URL: URL(PORTS.submission),
      GRADING_SERVICE_URL: URL(PORTS.grading),
    },
  },
};

const processes = new Map();
const useDocker = process.env.E2E_SKIP_INFRA !== "1";

function compose(...args) {
  execFileSync("docker", ["compose", "-f", path.join(E2E_DIR, "docker-compose.yml"), ...args], {
    stdio: "inherit",
    env: { ...process.env, E2E_MONGO_PORT: MONGO_PORT, E2E_RABBITMQ_PORT: RABBITMQ_PORT },
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitUntil(label, check, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check().catch(() => false)) return;
    await sleep(250);
  }
  throw new Error(`${label} : pas prêt après ${timeoutMs} ms (voir e2e/logs/)`);
}

async function startService(name) {
  const { port, env, subscribes } = SERVICES[name];
  const cwd = path.join(ROOT, name);
  if (!fs.existsSync(path.join(cwd, "node_modules"))) {
    throw new Error(`${name} : dépendances absentes, lancer \`npm install\` dans ${name}/ (ou \`npm run install:services\`)`);
  }

  const log = fs.createWriteStream(path.join(LOG_DIR, `${name}.log`), { flags: "a" });
  const child = spawn(process.execPath, ["src/server.js"], {
    cwd,
    env: { ...process.env, ...env, ...(port ? { PORT: port } : {}) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  for (const stream of [child.stdout, child.stderr]) {
    stream.on("data", (chunk) => {
      output += chunk;
      log.write(chunk);
    });
  }
  processes.set(name, child);

  if (port) {
    await waitUntil(name, async () => (await fetch(`${URL(port)}/health`)).ok);
  }
  // Les consommateurs ne réessaient pas de se connecter au broker : sans
  // abonnement effectif, les événements seraient perdus pour ce service.
  if (subscribes) {
    await waitUntil(`${name} (abonnement RabbitMQ)`, async () => {
      if (output.includes("Broker indisponible")) throw new Error(`${name} : broker injoignable`);
      return output.includes("Abonné à");
    });
  }
}

async function stopService(name) {
  const child = processes.get(name);
  if (!child) return;
  processes.delete(name);
  if (child.exitCode !== null) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill();
  await exited;
}

function seedUsers() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["src/scripts/seed.js"], {
      cwd: path.join(ROOT, "user-service"),
      env: { ...process.env, ...SERVICES["user-service"].env },
      stdio: "ignore",
    });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`seed user-service : code ${code}`))));
  });
}

async function startStack() {
  fs.rmSync(LOG_DIR, { recursive: true, force: true });
  fs.mkdirSync(LOG_DIR, { recursive: true });

  if (useDocker) {
    // `down` d'abord : repart d'une base vide si un run précédent a été interrompu.
    compose("down", "--volumes", "--remove-orphans");
    compose("up", "-d", "--wait", "--wait-timeout", "180");
  }

  // Démarrage en parallèle : aucun service n'a besoin d'un autre pour
  // démarrer (client gRPC, proxys et files RabbitMQ sont résolus à l'usage).
  await Promise.all([seedUsers(), ...Object.keys(SERVICES).map(startService)]);
}

async function stopStack() {
  for (const name of [...processes.keys()].reverse()) {
    await stopService(name);
  }
  if (useDocker && process.env.E2E_KEEP_INFRA !== "1") {
    compose("down", "--volumes", "--remove-orphans");
  }
}

module.exports = {
  GATEWAY_URL: URL(PORTS.gateway),
  startStack,
  stopStack,
  startService,
  stopService,
};
