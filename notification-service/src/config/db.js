const mongoose = require("mongoose");

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("[notification-service] MongoDB connecté");
  } catch (err) {
    console.error("[notification-service] Erreur de connexion MongoDB :", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
