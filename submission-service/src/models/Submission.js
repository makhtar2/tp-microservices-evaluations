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
    // Compensation de la Saga : renseigné quand grading-service abandonne la
    // correction automatique (grading.failed), effacé dès qu'elle aboutit.
    incidentCorrection: {
      type: new Schema({ message: String, survenuAt: Date }, { _id: false }),
      default: null,
    },
    // Résultat publié (result.published) : la copie ne peut plus être rouverte.
    resultatPublieAt: { type: Date, default: null },
    // Règle métier 3 : resoumission autorisée par l'enseignant responsable,
    // avec éventuellement une date limite propre à cette copie.
    resoumission: {
      type: new Schema(
        { autoriseePar: String, autoriseeAt: Date, dateLimite: Date, motif: String },
        { _id: false }
      ),
      default: null,
    },
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
