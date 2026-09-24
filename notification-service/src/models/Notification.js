const mongoose = require("mongoose");
const { Schema } = mongoose;

// Destinataire : un utilisateur précis (`userId`) ou tous les
// utilisateurs d'un rôle (`role`) quand l'événement ne cible personne en
// particulier (ex. publication d'une évaluation → tous les étudiants).
const notificationSchema = new Schema(
  {
    userId: { type: String, index: true },
    role: { type: String, enum: ["ADMINISTRATEUR", "ENSEIGNANT", "ETUDIANT"] },
    type: { type: String, required: true },
    titre: { type: String, required: true },
    message: { type: String, required: true },
    assessmentId: { type: String, index: true },
    lu: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
