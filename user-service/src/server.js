require("dotenv").config();

const connectDB = require("./config/db");
const app = require("./app");

const PORT = process.env.PORT || 3001;

(async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`user-service REST à l'écoute sur le port ${PORT}`);
  });
})();
