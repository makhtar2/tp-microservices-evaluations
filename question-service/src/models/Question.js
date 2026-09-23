const mongoose = require('mongoose');
const { Schema } = mongoose;

const QUESTION_TYPES = ['QCM', 'VRAI_FAUX', 'QUESTION_COURTE', 'QUESTION_OUVERTE'];
const DIFFICULTIES = ['FACILE', 'MOYEN', 'DIFFICILE'];

// La forme de `answers` dépend de `type` :
//   QCM              -> [{ text, isCorrect }]
//   VRAI_FAUX        -> { correctAnswer: boolean }
//   QUESTION_COURTE  -> { acceptedAnswers: [string] }
//   QUESTION_OUVERTE -> absent (pas de correction automatique possible)
const questionSchema = new Schema(
  {
    statement: { type: String, required: true },
    type: { type: String, enum: QUESTION_TYPES, required: true },
    subject: { type: String, required: true, index: true },
    chapter: { type: String, required: true, index: true },
    difficulty: { type: String, enum: DIFFICULTIES, required: true, index: true },
    points: { type: Number, required: true, min: 0 },
    answers: { type: Schema.Types.Mixed },
    correction: { type: String }, // guideline de correction (surtout pour QUESTION_OUVERTE)
    createdBy: { type: String },
  },
  { timestamps: true }
);

// Recherche texte libre sur l'énoncé (paramètre `search` de GET /questions)
questionSchema.index({ statement: 'text' });

const Question = mongoose.model('Question', questionSchema);

module.exports = Question;
module.exports.QUESTION_TYPES = QUESTION_TYPES;
module.exports.DIFFICULTIES = DIFFICULTIES;
