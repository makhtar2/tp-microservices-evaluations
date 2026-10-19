const AssessmentReadModel = require("./models/AssessmentReadModel");

// Un étudiant ne voit que les évaluations publiées (jamais un brouillon,
// une évaluation planifiée ou annulée).
const STATUTS_VISIBLES_ETUDIANT = ["PUBLIEE", "EN_COURS", "TERMINEE", "CORRIGEE"];

function isVisibleTo(assessment, role) {
  return role !== "ETUDIANT" || STATUTS_VISIBLES_ETUDIANT.includes(assessment.status);
}

// Query : liste des évaluations (Read Model)
async function listAssessments({ enseignantId, status, role } = {}) {
  const filter = {};
  if (enseignantId) filter.enseignantId = enseignantId;
  if (status) filter.status = status;
  if (role === "ETUDIANT") {
    filter.status = status && STATUTS_VISIBLES_ETUDIANT.includes(status) ? status : { $in: STATUTS_VISIBLES_ETUDIANT };
  }
  return AssessmentReadModel.find(filter).lean();
}

// Query : consultation d'une évaluation (Read Model)
async function getAssessment(assessmentId, { role } = {}) {
  const assessment = await AssessmentReadModel.findById(assessmentId).lean();
  return assessment && isVisibleTo(assessment, role) ? assessment : null;
}

function tranchePourcentage(note, bareme) {
  const pct = bareme > 0 ? (note / bareme) * 100 : 0;
  if (pct < 25) return "0-25%";
  if (pct < 50) return "25-50%";
  if (pct < 75) return "50-75%";
  return "75-100%";
}

// Query : GET /assessments/:id/results (Read Model)
// Ne remonte un résultat individuel que pour les étudiants dont
// ResultPublished a été reçu (règle métier : jamais avant, même si la
// correction est terminée côté grading-service). Un étudiant ne reçoit
// que les statistiques globales et son propre résultat (UC8).
async function getResults(assessmentId, { role, userId } = {}) {
  const assessment = await AssessmentReadModel.findById(assessmentId).lean();
  if (!assessment || !isVisibleTo(assessment, role)) return null;

  const publies = (assessment.resultatsEtudiants || []).filter((r) => r.resultPublished);
  const moyenne = publies.length > 0 ? publies.reduce((sum, r) => sum + r.note, 0) / publies.length : 0;

  const repartition = {};
  for (const r of publies) {
    const tranche = tranchePourcentage(r.note, assessment.bareme);
    repartition[tranche] = (repartition[tranche] || 0) + 1;
  }

  return {
    assessmentId,
    moyenne,
    nombreSoumissions: publies.length,
    repartitionNotes: Object.entries(repartition).map(([tranche, effectif]) => ({ tranche, effectif })),
    resultatsEtudiants: role === "ETUDIANT" ? publies.filter((r) => r.etudiantId === userId) : publies,
  };
}

module.exports = { listAssessments, getAssessment, getResults };
