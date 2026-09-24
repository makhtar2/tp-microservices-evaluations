// Jeux de données des scénarios : une banque de 4 questions (un exemplaire
// de chaque type) propre à chaque test, et des évaluations construites dessus.
const assert = require("node:assert/strict");

const MINUTE = 60 * 1000;

// Une matière unique par appel isole les tests entre eux (la génération
// automatique tire les questions par matière).
function uniqueSubject(label) {
  return `E2E ${label} ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function createQuestionBank(enseignant, subject) {
  const specs = {
    qcm: {
      statement: "Quel protocole utilise REST ?",
      type: "QCM",
      difficulty: "FACILE",
      points: 2,
      answers: [
        { text: "HTTP", isCorrect: true },
        { text: "FTP", isCorrect: false },
      ],
    },
    vraiFaux: {
      statement: "gRPC utilise HTTP/2.",
      type: "VRAI_FAUX",
      difficulty: "FACILE",
      points: 1,
      answers: { correctAnswer: true },
    },
    courte: {
      statement: "Citez un broker de messages.",
      type: "QUESTION_COURTE",
      difficulty: "MOYEN",
      points: 2,
      answers: { acceptedAnswers: ["RabbitMQ", "Kafka"] },
    },
    ouverte: {
      statement: "Expliquez le pattern Saga.",
      type: "QUESTION_OUVERTE",
      difficulty: "DIFFICILE",
      points: 5,
      correction: "Transactions locales + compensation.",
    },
  };

  const bank = {};
  for (const [key, spec] of Object.entries(specs)) {
    const res = await enseignant.post("/api/questions", { ...spec, subject, chapter: "E2E", createdBy: enseignant.user.id });
    assert.equal(res.status, 201, `création de la question ${key} : ${JSON.stringify(res.body)}`);
    bank[key] = res.body;
  }
  return bank;
}

function totalPoints(bank) {
  return Object.values(bank).reduce((sum, q) => sum + q.points, 0);
}

// Réponses d'un étudiant parfait sur les questions auto-corrigées ;
// la question ouverte reçoit un texte libre.
function perfectAnswers(bank) {
  return [
    { questionId: bank.qcm._id, reponse: "http" },
    { questionId: bank.vraiFaux._id, reponse: "Vrai" },
    { questionId: bank.courte._id, reponse: "  rabbitmq " },
    { questionId: bank.ouverte._id, reponse: "Une suite de transactions locales avec compensation." },
  ];
}

// Évaluation construite manuellement à partir d'une banque existante.
async function createAssessment(enseignant, bank, overrides = {}) {
  const now = Date.now();
  const res = await enseignant.post("/api/assessments", {
    titre: "Évaluation E2E",
    enseignantId: enseignant.user.id,
    matiere: bank.qcm.subject,
    questionIds: Object.values(bank).map((q) => q._id),
    bareme: totalPoints(bank),
    dateDebut: new Date(now - MINUTE).toISOString(),
    dateFin: new Date(now + 60 * MINUTE).toISOString(),
    duree: 60,
    ...overrides,
  });
  assert.equal(res.status, 201, `création de l'évaluation : ${JSON.stringify(res.body)}`);
  return res.body;
}

async function createPublishedAssessment(enseignant, bank, overrides) {
  const assessment = await createAssessment(enseignant, bank, overrides);
  const res = await enseignant.post(`/api/assessments/${assessment._id}/publish`);
  assert.equal(res.status, 200, `publication : ${JSON.stringify(res.body)}`);
  return res.body;
}

module.exports = {
  MINUTE,
  uniqueSubject,
  createQuestionBank,
  totalPoints,
  perfectAnswers,
  createAssessment,
  createPublishedAssessment,
};
