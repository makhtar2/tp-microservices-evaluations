// Démarre la plateforme des tests e2e (MongoDB et RabbitMQ jetables, les
// 7 services, comptes de test) et la garde ouverte jusqu'à Ctrl+C. Plus
// léger que docker compose : utile pour une démo ou pour `npm run test:ui`,
// avec le frontend lancé par :
//   cd frontend && API_URL=http://127.0.0.1:4100 npm run dev
const { startStack, stopStack, GATEWAY_URL } = require("../lib/stack");

let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await stopStack();
  process.exit(0);
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

startStack()
  .then(() => console.log(`Plateforme prête : api-gateway sur ${GATEWAY_URL} (Ctrl+C pour arrêter)`))
  .catch(async (err) => {
    console.error(err);
    await stopStack().catch(() => {});
    process.exit(1);
  });
