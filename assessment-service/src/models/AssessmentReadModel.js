const mongoose = require("mongoose");
const { Schema } = mongoose;

// Read Model : projection dérivée de l'Event Store, optimisée pour la
// consultation (liste, détail, résultats). Jamais écrite directement par
// une requête REST — uniquement par la projection des événements
// (voir projections/projectAssessment.js).
const resultatEtudiantSchema = new Schema(
  {
    etudiantId: { type: String, required: true },
    note: { type: Number },
    commentaire: { type: String },
    resultPublished: { type: Boolean, default: false },
  },
  { _id: false }
);

const assessmentReadModelSchema = new Schema(
  {
    _id: { type: String }, // = assessmentId
    titre: { type: String },
    enseignantId: { type: String },
    matiere: { type: String },
    questionIds: { type: [String], default: [] },
    bareme: { type: Number, default: 0 },
    dateDebut: { type: Date },
    dateFin: { type: Date },
    duree: { type: Number },
    consignes: { type: String },
    status: {
      type: String,
      enum: ["BROUILLON", "PLANIFIEE", "PUBLIEE", "EN_COURS", "TERMINEE", "CORRIGEE", "ANNULEE"],
      default: "BROUILLON",
    },
    resultatsEtudiants: { type: [resultatEtudiantSchema], default: [] },
  },
  { timestamps: true, _id: false }
);

const AssessmentReadModel = mongoose.model("AssessmentReadModel", assessmentReadModelSchema);

module.exports = AssessmentReadModel;
