require("dotenv").config();

const connectDB = require("./config/db");
const { startConsumer } = require("./messaging/consumer");

// Pas d'API REST : le service ne fait que consommer des événements.
(async () => {
  await connectDB();
  await startConsumer();
})();
