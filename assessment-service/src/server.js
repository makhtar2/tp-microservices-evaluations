require("dotenv").config();

const connectDB = require("./config/db");
const app = require("./app");
const { startConsumer } = require("./messaging/consumer");

const PORT = process.env.PORT || 3003;

(async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`assessment-service REST à l'écoute sur le port ${PORT}`);
  });

  startConsumer();
})();
