const mongoose = require("mongoose");
const Submission = require("./models/Submission");
const OpenAssessment = require("./models/OpenAssessment");
const { publishSubmissionCompleted } = require("./messaging/publisher");

class CommandError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function isPastDeadline(assessment, now = new Date()) {
  return Boolean(assessment && assessment.dateFin && now > assessment.dateFin);
}

async function findSubmission(submissionId) {
  if (!mongoose.isValidObjectId(submissionId)) return null;
  return Submission.findById(submissionId);
}

async function listSubmissions({ assessmentId, etudiantId, status }) {
  const filter = {};
  if (assessmentId) filter.assessmentId = assessmentId;
  if (etudiantId) filter.etudiantId = etudiantId;
  if (status) filter.status = status;
  return Submission.find(filter).sort({ createdAt: -1 });
}

// Ouvre une copie : l'évaluation doit avoir été publiée (reçue via
// AssessmentPublished) et être dans sa période active.
async function openSubmission({ assessmentId, etudiantId }) {
  if (!assessmentId || !etudiantId) {
    throw new CommandError(400, "assessmentId et etudiantId sont requis");
  }

  const assessment = await OpenAssessment.findById(assessmentId).lean();
  if (!assessment) {
    throw new CommandError(409, "Évaluation non publiée");
  }
  const now = new Date();
  if (assessment.dateDebut && now < assessment.dateDebut) {
    throw new CommandError(409, "L'évaluation n'est pas encore ouverte");
  }
  if (isPastDeadline(assessment, now)) {
    throw new CommandError(409, "La date de fin de l'évaluation est dépassée");
  }

  try {
    return await Submission.create({ assessmentId, etudiantId });
  } catch (err) {
    if (err.code === 11000) {
      throw new CommandError(409, "Une copie existe déjà pour cet étudiant sur cette évaluation");
    }
    throw err;
  }
}

// Charge une copie encore modifiable. Si la date limite est dépassée,
// la copie passe automatiquement en REFUSEE_HORS_DELAI (règle métier :
// refus automatique des dépôts hors délai).
async function loadModifiable(submissionId) {
  const submission = await findSubmission(submissionId);
  if (!submission) return null;

  if (submission.status !== "EN_COURS") {
    throw new CommandError(409, `La copie n'est plus modifiable (statut ${submission.status})`);
  }

  const assessment = await OpenAssessment.findById(submission.assessmentId).lean();
  if (isPastDeadline(assessment)) {
    submission.status = "REFUSEE_HORS_DELAI";
    await submission.save();
    throw new CommandError(409, "Date limite dépassée : la copie est refusée");
  }

  return submission;
}

// Auto-save : les réponses reçues remplacent celles de mêmes questionId,
// les autres réponses déjà enregistrées sont conservées.
async function saveAnswers(submissionId, reponses) {
  if (!Array.isArray(reponses) || reponses.some((r) => !r || !r.questionId)) {
    throw new CommandError(400, "reponses doit être un tableau de { questionId, reponse }");
  }

  const submission = await loadModifiable(submissionId);
  if (!submission) return null;

  const byQuestion = new Map(submission.reponses.map((r) => [r.questionId, r.reponse]));
  for (const { questionId, reponse } of reponses) {
    byQuestion.set(questionId, reponse);
  }
  submission.reponses = [...byQuestion].map(([questionId, reponse]) => ({ questionId, reponse }));

  return submission.save();
}

async function addFile(submissionId, file) {
  if (!file) {
    throw new CommandError(400, "Aucun fichier reçu (champ multipart `file`)");
  }

  const submission = await loadModifiable(submissionId);
  if (!submission) return null;

  submission.fichiers.push({ nomFichier: file.originalname, url: `/uploads/${file.filename}` });
  await submission.save();
  return submission.fichiers[submission.fichiers.length - 1];
}

// Soumission définitive : horodatage, statut SOUMISE, publication de
// SubmissionCompleted (déclenche la Saga côté grading-service).
async function submit(submissionId) {
  const submission = await loadModifiable(submissionId);
  if (!submission) return null;

  submission.status = "SOUMISE";
  submission.soumiseAt = new Date();
  await submission.save();

  await publishSubmissionCompleted(submission.toJSON());
  return submission;
}

module.exports = {
  CommandError,
  findSubmission,
  listSubmissions,
  openSubmission,
  saveAnswers,
  addFile,
  submit,
};
