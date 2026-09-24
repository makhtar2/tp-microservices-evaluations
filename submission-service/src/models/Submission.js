const mongoose = require("mongoose");
const { Schema } = mongoose;

const SUBMISSION_STATUSES = ["EN_COURS", "SOUMISE", "REFUSEE_HORS_DELAI", "ANNULEE"];

const reponseSchema = new Schema(
  {
    questionId: { type: String, required: true },
    reponse: { type: String },
  },
  { _id: false }
);

const fichierSchema = new Schema({
  nomFichier: { type: String, required: true },
  url: { type: String, required: true },
  deposedAt: { type: Date, default: Date.now },
});

const submissionSchema = new Schema(
  {
    assessmentId: { type: String, required: true, index: true },
    etudiantId: { type: String, required: true, index: true },
    reponses: { type: [reponseSchema], default: [] },
    fichiers: { type: [fichierSchema], default: [] },
    status: { type: String, enum: SUBMISSION_STATUSES, default: "EN_COURS", index: true },
    soumiseAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Une seule copie par étudiant et par évaluation.
submissionSchema.index({ assessmentId: 1, etudiantId: 1 }, { unique: true });

// Expose `id` au lieu de `_id` (cf. contrat OpenAPI), y compris pour les fichiers.
const toJSON = {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    delete ret._id;
    return ret;
  },
};
fichierSchema.set("toJSON", toJSON);
submissionSchema.set("toJSON", toJSON);

const Submission = mongoose.model("Submission", submissionSchema);

module.exports = Submission;
module.exports.SUBMISSION_STATUSES = SUBMISSION_STATUSES;
