// Appels REST vers assessment-service et question-service, utilisés
// uniquement lors de la correction automatique (asynchrone, déclenchée
// par SubmissionCompleted).
const ASSESSMENT_SERVICE_URL = process.env.ASSESSMENT_SERVICE_URL || "http://localhost:3003";
const QUESTION_SERVICE_URL = process.env.QUESTION_SERVICE_URL || "http://localhost:3002";

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → HTTP ${res.status}`);
  return res.json();
}

function getAssessment(assessmentId) {
  return getJson(`${ASSESSMENT_SERVICE_URL}/assessments/${encodeURIComponent(assessmentId)}`);
}

function getQuestion(questionId) {
  return getJson(`${QUESTION_SERVICE_URL}/api/questions/${encodeURIComponent(questionId)}`);
}

module.exports = { getAssessment, getQuestion };
