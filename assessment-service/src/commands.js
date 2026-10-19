const crypto = require("node:crypto");
const AssessmentReadModel = require("./models/AssessmentReadModel");
const { recordEvent } = require("./projectionUpdater");
const { selectQuestions } = require("./questionClient");
const { publishAssessmentPublished } = require("./messaging/publisher");

const STATUTS_MODIFIABLES = new Set(["BROUILLON", "PLANIFIEE"]);
const STATUTS_PUBLIABLES = new Set(["BROUILLON", "PLANIFIEE"]);
const STATUTS_PLANIFIABLES = new Set(["BROUILLON", "PLANIFIEE"]);
const STATUTS_ANNULABLES = new Set(["PLANIFIEE", "PUBLIEE"]);

class CommandError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Command : CreateAssessment
async function createAssessment(input) {
  const { titre, enseignantId, matiere, questionIds, generationAuto, bareme, dateDebut, dateFin, duree, consignes } = input;

  if (!titre || !enseignantId || !matiere) {
    throw new CommandError(400, "titre, enseignantId et matiere sont requis");
  }

  let selectedQuestionIds = questionIds || [];
  let computedBareme = bareme || 0;

  if (generationAuto) {
    const { questions } = await selectQuestions(generationAuto);
    selectedQuestionIds = questions.map((question) => question.id);
    computedBareme = questions.reduce((total, question) => total + (question.points || 0), 0);
  }

  const assessmentId = crypto.randomUUID();
  const state = await recordEvent(assessmentId, "AssessmentCreated", {
    titre,
    enseignantId,
    matiere,
    questionIds: selectedQuestionIds,
    bareme: computedBareme,
    dateDebut,
    dateFin,
    duree,
    consignes,
  });

  return state;
}

// Command : UpdateAssessment (uniquement à l'état BROUILLON ou PLANIFIEE)
async function updateAssessment(assessmentId, changes) {
  const current = await AssessmentReadModel.findById(assessmentId).lean();
  if (!current) return null;
  if (!STATUTS_MODIFIABLES.has(current.status)) {
    throw new CommandError(409, "Modification impossible dans l'état courant");
  }

  const { titre, matiere, questionIds, bareme, dateDebut, dateFin, duree, consignes } = changes;
  const payload = {};
  if (titre !== undefined) payload.titre = titre;
  if (matiere !== undefined) payload.matiere = matiere;
  if (questionIds !== undefined) payload.questionIds = questionIds;
  if (bareme !== undefined) payload.bareme = bareme;
  if (dateDebut !== undefined) payload.dateDebut = dateDebut;
  if (dateFin !== undefined) payload.dateFin = dateFin;
  if (duree !== undefined) payload.duree = duree;
  if (consignes !== undefined) payload.consignes = consignes;

  return recordEvent(assessmentId, "AssessmentUpdated", payload);
}

// Règle métier : impossible de publier (ou de planifier une publication)
// sans au moins une question et un barème total strictement positif.
function ensurePubliable(current) {
  if (!current.questionIds || current.questionIds.length === 0 || !current.bareme || current.bareme <= 0) {
    throw new CommandError(409, "Publication refusée : aucune question ou barème total à 0");
  }
}

// Command : ScheduleAssessment — publication automatique à `datePublication`
// (voir scheduler.js), afin que l'évaluation ne soit visible des étudiants
// qu'au bon moment. Replanifier une évaluation déjà PLANIFIEE est permis.
async function scheduleAssessment(assessmentId, { datePublication } = {}, now = new Date()) {
  const date = new Date(datePublication);
  if (!datePublication || Number.isNaN(date.getTime())) {
    throw new CommandError(400, "datePublication (date ISO) est requise");
  }
  if (date <= now) {
    throw new CommandError(400, "datePublication doit être dans le futur");
  }

  const current = await AssessmentReadModel.findById(assessmentId).lean();
  if (!current) return null;
  if (!STATUTS_PLANIFIABLES.has(current.status)) {
    throw new CommandError(409, "Planification impossible dans l'état courant");
  }
  ensurePubliable(current);
  if (current.dateFin && date >= new Date(current.dateFin)) {
    throw new CommandError(400, "datePublication doit précéder la date de fin de l'évaluation");
  }

  return recordEvent(assessmentId, "AssessmentScheduled", { datePublication: date.toISOString() });
}

// Command : PublishAssessment
async function publishAssessment(assessmentId) {
  const current = await AssessmentReadModel.findById(assessmentId).lean();
  if (!current) return null;
  if (!STATUTS_PUBLIABLES.has(current.status)) {
    throw new CommandError(409, "Publication impossible dans l'état courant");
  }
  ensurePubliable(current);

  const state = await recordEvent(assessmentId, "AssessmentPublished", {});
  await publishAssessmentPublished(state);
  return state;
}

// Command : CancelAssessment
async function cancelAssessment(assessmentId) {
  const current = await AssessmentReadModel.findById(assessmentId).lean();
  if (!current) return null;
  if (!STATUTS_ANNULABLES.has(current.status)) {
    throw new CommandError(409, "Annulation impossible dans l'état courant");
  }
  return recordEvent(assessmentId, "AssessmentCancelled", {});
}

module.exports = {
  createAssessment,
  updateAssessment,
  scheduleAssessment,
  publishAssessment,
  cancelAssessment,
  CommandError,
};
