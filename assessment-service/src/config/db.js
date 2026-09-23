const mongoose = require("mongoose");

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("[assessment-service] MongoDB connecté");
  } catch (err) {
    console.error("[assessment-service] Erreur de connexion MongoDB :", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
