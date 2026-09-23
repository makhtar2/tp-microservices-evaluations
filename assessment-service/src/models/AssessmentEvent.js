const mongoose = require("mongoose");
const { Schema } = mongoose;

// Event Store simplifié : journal d'ajout seul (append-only), une entrée
// par événement métier survenu sur une évaluation. C'est la source de
// vérité ; le Read Model (AssessmentReadModel) est une projection dérivée,
// reconstructible à tout moment en rejouant ces événements dans l'ordre.
const EVENT_TYPES = [
  "AssessmentCreated",
  "AssessmentUpdated",
  "AssessmentPublished",
  "AssessmentCancelled",
  "GradingCompleted",
  "ResultPublished",
];

const assessmentEventSchema = new Schema(
  {
    assessmentId: { type: String, required: true, index: true },
    type: { type: String, enum: EVENT_TYPES, required: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    occurredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Ordre de rejeu = ordre d'écriture dans l'Event Store.
assessmentEventSchema.index({ assessmentId: 1, createdAt: 1 });

const AssessmentEvent = mongoose.model("AssessmentEvent", assessmentEventSchema);

module.exports = AssessmentEvent;
module.exports.EVENT_TYPES = EVENT_TYPES;
