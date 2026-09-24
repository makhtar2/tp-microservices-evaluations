const mongoose = require("mongoose");
const { Schema } = mongoose;

// Copie locale minimale des évaluations publiées, alimentée uniquement
// par l'événement AssessmentPublished (voir messaging/consumer.js).
const openAssessmentSchema = new Schema(
  {
    _id: { type: String }, // = assessmentId
    titre: { type: String },
    matiere: { type: String },
    dateDebut: { type: Date },
    dateFin: { type: Date },
    publishedAt: { type: Date },
  },
  { timestamps: true, _id: false }
);

const OpenAssessment = mongoose.model("OpenAssessment", openAssessmentSchema);

module.exports = OpenAssessment;
