require("dotenv").config();

const connectDB = require("./config/db");
const app = require("./app");
const { startConsumer } = require("./messaging/consumer");
const { retryPending } = require("./commands");

const PORT = process.env.PORT || 3005;
const RETRY_INTERVAL_MS = Number(process.env.GRADING_RETRY_INTERVAL_MS) || 30 * 1000;

(async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`grading-service REST à l'écoute sur le port ${PORT}`);
  });

  startConsumer();

  // Reprise des corrections restées EN_ATTENTE (service distant indisponible).
  setInterval(() => {
    retryPending().catch((err) => console.error("[grading-service] Relance des corrections en échec :", err.message));
  }, RETRY_INTERVAL_MS);
})();
