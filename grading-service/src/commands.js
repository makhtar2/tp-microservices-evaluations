const Grading = require("./models/Grading");
const { gradeAnswer } = require("./autoGrader");
const { getAssessment, getQuestion } = require("./clients");
const { publishGradingCompleted, publishResultPublished } = require("./messaging/publisher");

const PENDING_STATUSES = ["CORRECTION_AUTO_PARTIELLE", "EN_CORRECTION_MANUELLE"];

class CommandError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Réaction à SubmissionCompleted : crée la correction et note
// automatiquement les questions QCM / Vrai-Faux / réponse courte.
// Idempotent : un événement rejoué pour une copie déjà reçue est ignoré.
// Si un service distant est indisponible, la copie reste EN_ATTENTE avec
// l'erreur (reprise à traiter par la compensation de la Saga).
async function gradeSubmission({ submissionId, assessmentId, etudiantId, reponses = [] }) {
  if (await Grading.exists({ _id: submissionId })) return null;

  const grading = new Grading({ _id: submissionId, assessmentId, etudiantId });
  try {
    const assessment = await getAssessment(assessmentId);
    const questions = await Promise.all((assessment.questionIds || []).map(getQuestion));
    const byQuestion = new Map(reponses.map((r) => [r.questionId, r.reponse]));

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
  } catch (err) {
    grading.status = "EN_ATTENTE";
    grading.lastError = err.message;
    console.error(`[grading-service] Correction automatique impossible pour ${submissionId} :`, err.message);
  }

  return grading.save();
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
  if (grading.status === "EN_ATTENTE") {
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

module.exports = { CommandError, gradeSubmission, findGrading, listPending, gradeQuestion, validate };
