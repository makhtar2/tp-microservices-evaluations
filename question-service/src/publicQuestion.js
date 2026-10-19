// Vue d'une question pour un étudiant : l'énoncé et les options de QCM,
// mais jamais les bonnes réponses ni le guide de correction. Le rôle est
// celui transmis par l'api-gateway (en-tête X-User-Role) ; les appels
// internes (grading-service) n'en ont pas et reçoivent la question complète.
function forRole(question, role) {
  if (role !== "ETUDIANT") return question;

  const q = typeof question.toJSON === "function" ? question.toJSON() : { ...question };
  delete q.correction;
  if (q.type === "QCM" && Array.isArray(q.answers)) {
    q.answers = q.answers.map(({ text }) => ({ text }));
  } else {
    delete q.answers;
  }
  return q;
}

module.exports = { forRole };
