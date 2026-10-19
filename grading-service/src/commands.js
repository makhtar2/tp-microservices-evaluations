const Grading = require("./models/Grading");
const { gradeAnswer } = require("./autoGrader");
const { getAssessment, getQuestion } = require("./clients");
const { publishGradingCompleted, publishResultPublished, publishGradingFailed } = require("./messaging/publisher");

const PENDING_STATUSES = ["CORRECTION_AUTO_PARTIELLE", "EN_CORRECTION_MANUELLE"];
// Nombre de tentatives de correction automatique avant compensation.
const MAX_ATTEMPTS = Number(process.env.GRADING_MAX_ATTEMPTS) || 5;

class CommandError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Note automatiquement les questions QCM / Vrai-Faux / réponse courte à
// partir des réponses conservées sur la correction. En cas d'échec (service
// distant indisponible), la copie reste EN_ATTENTE avec l'erreur et sera
// relancée par retryPending ; après MAX_ATTEMPTS échecs, elle passe en
// ECHEC_CORRECTION et grading.failed est publié (compensation de la Saga).
async function autoGrade(grading) {
  grading.attempts = (grading.attempts || 0) + 1;
  try {
    const assessment = await getAssessment(grading.assessmentId);
    const questions = await Promise.all((assessment.questionIds || []).map(getQuestion));
    const byQuestion = new Map(grading.reponses.map((r) => [r.questionId, r.reponse]));

    grading.enseignantId = assessment.enseignantId;
    grading.notes = questions.map((question) => {
      const reponse = byQuestion.get(String(question._id));
      const note = gradeAnswer(question, reponse);
      return {
        questionId: String(question._id),
        type: question.type,
        reponse,
        pointsMax: question.points,
        note,
        correctionAutomatique: note !== null,
      };
    });
    grading.recomputeScore();
    // Aucune question manuelle : la copie attend seulement la validation.
    grading.status = grading.notes.some((n) => n.note === null) ? "CORRECTION_AUTO_PARTIELLE" : "EN_CORRECTION_MANUELLE";
    grading.lastError = undefined;
  } catch (err) {
    grading.lastError = err.message;
    grading.status = grading.attempts >= MAX_ATTEMPTS ? "ECHEC_CORRECTION" : "EN_ATTENTE";
    console.error(
      `[grading-service] Correction automatique impossible pour ${grading._id} (tentative ${grading.attempts}/${MAX_ATTEMPTS}) :`,
      err.message
    );
  }

  await grading.save();
  if (grading.status === "ECHEC_CORRECTION") {
    await publishGradingFailed(grading.toJSON());
  }
  return grading;
}

// Réaction à SubmissionCompleted : crée la correction puis tente la
// correction automatique. Idempotent : un événement rejoué pour une copie
// déjà reçue est ignoré.
async function gradeSubmission({ submissionId, assessmentId, etudiantId, reponses = [] }) {
  if (await Grading.exists({ _id: submissionId })) return null;

  const grading = new Grading({ _id: submissionId, assessmentId, etudiantId, reponses });
  return autoGrade(grading);
}

// Relance périodique des corrections restées EN_ATTENTE.
async function retryPending() {
  const waiting = await Grading.find({ status: "EN_ATTENTE" });
  const results = [];
  for (const grading of waiting) {
    results.push(await autoGrade(grading));
  }
  return results;
}

// Relance manuelle par l'enseignant d'une correction abandonnée
// (ECHEC_CORRECTION) ou en attente : le compteur de tentatives repart à 0.
async function retry(submissionId) {
  const grading = await Grading.findById(submissionId);
  if (!grading) return null;
  if (!["EN_ATTENTE", "ECHEC_CORRECTION"].includes(grading.status)) {
    throw new CommandError(409, "La correction automatique a déjà été effectuée");
  }
  grading.attempts = 0;
  return autoGrade(grading);
}

async function findGrading(submissionId) {
  return Grading.findById(submissionId);
}

async function listPending({ assessmentId, enseignantId }) {
  const filter = { status: { $in: PENDING_STATUSES } };
  if (assessmentId) filter.assessmentId = assessmentId;
  if (enseignantId) filter.enseignantId = enseignantId;
  return Grading.find(filter).sort({ createdAt: 1 });
}

function ensureEditable(grading, userId) {
  if (grading.status === "VALIDEE") {
    throw new CommandError(409, "La correction est déjà validée");
  }
  if (grading.status === "EN_ATTENTE" || grading.status === "ECHEC_CORRECTION") {
    throw new CommandError(409, "La correction automatique n'a pas encore été effectuée");
  }
  // Contrôle d'habilitation : actif dès qu'un appelant est identifié
  // (en-tête X-User-Id, qui sera posé par l'api-gateway).
  if (userId && grading.enseignantId && userId !== grading.enseignantId) {
    throw new CommandError(403, "Seul l'enseignant responsable de l'évaluation peut corriger cette copie");
  }
}

// Correction manuelle d'une question (ouverte, ou ajustement d'une note auto).
async function gradeQuestion(submissionId, questionId, { note, commentaire }, userId) {
  const grading = await findGrading(submissionId);
  if (!grading) return null;
  ensureEditable(grading, userId);

  const item = grading.notes.find((n) => n.questionId === questionId);
  if (!item) throw new CommandError(404, "Question introuvable dans cette copie");
  if (typeof note !== "number" || note < 0 || note > item.pointsMax) {
    throw new CommandError(400, `note doit être un nombre entre 0 et ${item.pointsMax}`);
  }

  item.note = note;
  item.commentaire = commentaire;
  item.correctionAutomatique = false;
  grading.recomputeScore();
  grading.status = "EN_CORRECTION_MANUELLE";
  return grading.save();
}

// Validation : publie GradingCompleted puis ResultPublished (le résultat
// devient visible côté assessment-service).
async function validate(submissionId, userId) {
  const grading = await findGrading(submissionId);
  if (!grading) return null;
  ensureEditable(grading, userId);

  if (grading.notes.some((n) => n.note === null)) {
    throw new CommandError(409, "Toutes les questions ne sont pas encore notées");
  }

  grading.status = "VALIDEE";
  grading.validatedAt = new Date();
  await grading.save();

  const payload = grading.toJSON();
  await publishGradingCompleted(payload);
  await publishResultPublished(payload);
  return grading;
}

module.exports = {
  CommandError,
  MAX_ATTEMPTS,
  gradeSubmission,
  retryPending,
  retry,
  findGrading,
  listPending,
  gradeQuestion,
  validate,
};
