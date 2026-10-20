const mongoose = require("mongoose");
const { Schema } = mongoose;

// EN_ATTENTE : correction automatique pas encore faite (ou à relancer) ;
// ECHEC_CORRECTION : abandonnée après MAX_ATTEMPTS échecs (compensation).
const GRADING_STATUSES = [
  "EN_ATTENTE",
  "CORRECTION_AUTO_PARTIELLE",
  "EN_CORRECTION_MANUELLE",
  "VALIDEE",
  "ECHEC_CORRECTION",
];

// Une entrée par question de l'évaluation. `note` reste null tant que la
// question (ouverte) n'a pas été corrigée manuellement.
const questionNoteSchema = new Schema(
  {
    questionId: { type: String, required: true },
    type: { type: String },
    reponse: { type: String },
    pointsMax: { type: Number, default: 0 },
    note: { type: Number, default: null },
    commentaire: { type: String },
    correctionAutomatique: { type: Boolean, default: false },
  },
  { _id: false }
);

const gradingSchema = new Schema(
  {
    _id: { type: String }, // = submissionId
    assessmentId: { type: String, required: true, index: true },
    etudiantId: { type: String, required: true },
    enseignantId: { type: String, index: true },
    // Réponses reçues avec SubmissionCompleted, conservées pour pouvoir
    // relancer la correction automatique sans rappeler submission-service.
    reponses: { type: [{ _id: false, questionId: String, reponse: String }], default: [] },
    notes: { type: [questionNoteSchema], default: [] },
    scoreTotal: { type: Number, default: 0 },
    status: { type: String, enum: GRADING_STATUSES, default: "EN_ATTENTE", index: true },
    lastError: { type: String },
    attempts: { type: Number, default: 0 },
    validatedAt: { type: Date, default: null },
  },
  { timestamps: true, _id: false }
);

gradingSchema.methods.recomputeScore = function recomputeScore() {
  this.scoreTotal = this.notes.reduce((total, n) => total + (n.note || 0), 0);
};

gradingSchema.set("toJSON", {
  versionKey: false,
  transform: (doc, ret) => {
    ret.submissionId = ret._id;
    delete ret._id;
    return ret;
  },
});

const Grading = mongoose.model("Grading", gradingSchema);

module.exports = Grading;
module.exports.GRADING_STATUSES = GRADING_STATUSES;
