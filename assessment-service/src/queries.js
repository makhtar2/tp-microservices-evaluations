const AssessmentReadModel = require("./models/AssessmentReadModel");

// Query : liste des évaluations (Read Model)
async function listAssessments({ enseignantId, status } = {}) {
  const filter = {};
  if (enseignantId) filter.enseignantId = enseignantId;
  if (status) filter.status = status;
  return AssessmentReadModel.find(filter).lean();
}

// Query : consultation d'une évaluation (Read Model)
async function getAssessment(assessmentId) {
  return AssessmentReadModel.findById(assessmentId).lean();
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
// correction est terminée côté grading-service).
async function getResults(assessmentId) {
  const assessment = await AssessmentReadModel.findById(assessmentId).lean();
  if (!assessment) return null;

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
    resultatsEtudiants: publies,
  };
}

module.exports = { listAssessments, getAssessment, getResults };
