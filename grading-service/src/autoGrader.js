// Correction automatique d'une réponse selon le type de question
// (forme de `answers` : voir question-service/src/models/Question.js).
// Retourne la note obtenue, ou null si la question exige une correction
// manuelle (QUESTION_OUVERTE).

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

// QCM : la réponse est le texte de l'option choisie ; plusieurs options
// sont séparées par "|". Tout ou rien : l'ensemble choisi doit être
// exactement l'ensemble des options correctes.
function gradeQcm(question, reponse) {
  const correct = (question.answers || []).filter((a) => a.isCorrect).map((a) => normalize(a.text));
  const chosen = String(reponse ?? "").split("|").map(normalize).filter(Boolean);
  const ok = correct.length > 0 && chosen.length === correct.length && chosen.every((c) => correct.includes(c));
  return ok ? question.points : 0;
}

const TRUE_VALUES = new Set(["true", "vrai", "v", "1"]);
const FALSE_VALUES = new Set(["false", "faux", "f", "0"]);

function gradeVraiFaux(question, reponse) {
  const value = normalize(reponse);
  const given = TRUE_VALUES.has(value) ? true : FALSE_VALUES.has(value) ? false : null;
  return given !== null && given === question.answers?.correctAnswer ? question.points : 0;
}

function gradeQuestionCourte(question, reponse) {
  const accepted = (question.answers?.acceptedAnswers || []).map(normalize);
  return accepted.includes(normalize(reponse)) ? question.points : 0;
}

function gradeAnswer(question, reponse) {
  switch (question.type) {
    case "QCM":
      return gradeQcm(question, reponse);
    case "VRAI_FAUX":
      return gradeVraiFaux(question, reponse);
    case "QUESTION_COURTE":
      return gradeQuestionCourte(question, reponse);
    default:
      return null;
  }
}

module.exports = { gradeAnswer };
