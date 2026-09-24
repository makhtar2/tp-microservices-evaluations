// Traduit chaque événement métier en notification(s). Les payloads sont
// ceux définis par les services producteurs (voir docs/architecture.md).

function formatDate(value) {
  return value ? new Date(value).toLocaleString("fr-FR", { timeZone: "UTC" }) + " UTC" : "date non précisée";
}

const TEMPLATES = {
  "assessment.published": (e) => [
    {
      role: "ETUDIANT",
      type: "AssessmentPublished",
      titre: `Nouvelle évaluation : ${e.titre || e.assessmentId}`,
      message: `Ouverte du ${formatDate(e.dateDebut)} au ${formatDate(e.dateFin)}.`,
    },
  ],
  "assessment.closing_soon": (e) => [
    {
      role: "ETUDIANT",
      type: "AssessmentClosingSoon",
      titre: `Clôture imminente : ${e.titre || e.assessmentId}`,
      message: `L'évaluation se termine le ${formatDate(e.dateFin)}. Pensez à soumettre votre copie.`,
    },
  ],
  "submission.completed": (e) => [
    {
      userId: e.etudiantId,
      type: "SubmissionCompleted",
      titre: "Copie soumise",
      message: `Votre copie a bien été reçue le ${formatDate(e.soumiseAt)}.`,
    },
  ],
  "grading.completed": (e) => [
    {
      userId: e.etudiantId,
      type: "GradingCompleted",
      titre: "Copie corrigée",
      message: "La correction de votre copie est terminée. Le résultat sera visible dès sa publication.",
    },
  ],
  "result.published": (e) => [
    {
      userId: e.etudiantId,
      type: "ResultPublished",
      titre: "Résultat disponible",
      message: `Votre note : ${e.note ?? e.scoreTotal}.`,
    },
  ],
};

const ROUTING_KEYS = Object.keys(TEMPLATES);

function buildNotifications(routingKey, event) {
  const template = TEMPLATES[routingKey];
  if (!template) return [];
  return template(event).map((notification) => ({ ...notification, assessmentId: event.assessmentId }));
}

module.exports = { ROUTING_KEYS, buildNotifications };
