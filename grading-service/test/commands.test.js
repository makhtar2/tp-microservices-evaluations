const { describe, it, beforeEach, afterEach, mock } = require("node:test");
const assert = require("node:assert/strict");
const amqp = require("amqplib");
const Grading = require("../src/models/Grading");
const {
  gradeSubmission,
  retryPending,
  retry,
  gradeQuestion,
  validate,
  listPending,
  CommandError,
  MAX_ATTEMPTS,
} = require("../src/commands");

// MongoDB est simulé (exists / findById / save) et les appels REST vers
// assessment-service et question-service passent par un fetch simulé.
const QUESTIONS = {
  q1: { _id: "q1", type: "QCM", points: 4, answers: [{ text: "A", isCorrect: true }, { text: "B", isCorrect: false }] },
  q2: { _id: "q2", type: "VRAI_FAUX", points: 2, answers: { correctAnswer: true } },
  q3: { _id: "q3", type: "QUESTION_OUVERTE", points: 6 },
};

let stored;
const published = [];
const fakeChannel = {
  assertExchange: async () => {},
  publish: (exchange, routingKey, content) => published.push({ routingKey, payload: JSON.parse(content.toString()) }),
};

function remote({ questionIds, down = false }) {
  mock.method(globalThis, "fetch", async (url) => {
    if (down) throw new Error("connect ECONNREFUSED");
    if (url.includes("/assessments/")) {
      return Response.json({ _id: "ass-1", enseignantId: "ens-1", questionIds });
    }
    const id = decodeURIComponent(url.split("/").pop());
    return QUESTIONS[id] ? Response.json(QUESTIONS[id]) : new Response("", { status: 404 });
  });
}

beforeEach(() => {
  stored = null;
  published.length = 0;
  mock.method(amqp, "connect", async () => ({ createChannel: async () => fakeChannel }));
  mock.method(Grading, "find", async (filter) => (stored && stored.status === filter.status ? [stored] : []));
  mock.method(console, "error", () => {});
  mock.method(Grading, "exists", async () => stored !== null);
  mock.method(Grading, "findById", async () => stored);
  mock.method(Grading.prototype, "save", async function save() {
    stored = this;
    return this;
  });
});

afterEach(() => mock.restoreAll());

const submission = {
  submissionId: "sub-1",
  assessmentId: "ass-1",
  etudiantId: "etu-1",
  reponses: [
    { questionId: "q1", reponse: "A" },
    { questionId: "q2", reponse: "faux" },
    { questionId: "q3", reponse: "Une réponse rédigée" },
  ],
};

async function assertCommandError(promise, status) {
  await assert.rejects(promise, (err) => err instanceof CommandError && err.status === status);
}

describe("gradeSubmission (réaction à SubmissionCompleted)", () => {
  it("corrige automatiquement et laisse la question ouverte à corriger", async () => {
    remote({ questionIds: ["q1", "q2", "q3"] });
    const grading = await gradeSubmission(submission);
    assert.equal(grading.status, "CORRECTION_AUTO_PARTIELLE");
    assert.equal(grading.enseignantId, "ens-1");
    assert.deepEqual(grading.notes.map((n) => n.note), [4, 0, null]);
    assert.deepEqual(grading.notes.map((n) => n.correctionAutomatique), [true, true, false]);
    assert.equal(grading.scoreTotal, 4);
  });

  it("passe directement en attente de validation sans question ouverte", async () => {
    remote({ questionIds: ["q1", "q2"] });
    const grading = await gradeSubmission(submission);
    assert.equal(grading.status, "EN_CORRECTION_MANUELLE");
  });

  it("note 0 une question sans réponse", async () => {
    remote({ questionIds: ["q1"] });
    const grading = await gradeSubmission({ ...submission, reponses: [] });
    assert.equal(grading.notes[0].note, 0);
  });

  it("est idempotent : un événement rejoué est ignoré", async () => {
    remote({ questionIds: ["q1"] });
    await gradeSubmission(submission);
    assert.equal(await gradeSubmission(submission), null);
  });

  it("garde la copie EN_ATTENTE avec l'erreur si un service est injoignable", async () => {
    remote({ questionIds: ["q1"], down: true });
    const grading = await gradeSubmission(submission);
    assert.equal(grading.status, "EN_ATTENTE");
    assert.match(grading.lastError, /ECONNREFUSED/);
    assert.equal(stored, grading);
  });

  it("garde la copie EN_ATTENTE si une question n'existe plus", async () => {
    remote({ questionIds: ["q1", "supprimee"] });
    const grading = await gradeSubmission(submission);
    assert.equal(grading.status, "EN_ATTENTE");
    assert.match(grading.lastError, /HTTP 404/);
  });
});

describe("gradeQuestion (correction manuelle)", () => {
  beforeEach(async () => {
    remote({ questionIds: ["q1", "q3"] });
    await gradeSubmission(submission);
  });

  it("note la question ouverte et recalcule le score", async () => {
    const grading = await gradeQuestion("sub-1", "q3", { note: 5, commentaire: "Bonne analyse" }, "ens-1");
    const q3 = grading.notes.find((n) => n.questionId === "q3");
    assert.equal(q3.note, 5);
    assert.equal(q3.commentaire, "Bonne analyse");
    assert.equal(grading.scoreTotal, 9);
    assert.equal(grading.status, "EN_CORRECTION_MANUELLE");
  });

  it("permet d'ajuster une note automatique", async () => {
    const grading = await gradeQuestion("sub-1", "q1", { note: 2 }, "ens-1");
    const q1 = grading.notes.find((n) => n.questionId === "q1");
    assert.equal(q1.note, 2);
    assert.equal(q1.correctionAutomatique, false);
  });

  it("renvoie null pour une copie inconnue", async () => {
    stored = null;
    assert.equal(await gradeQuestion("inconnue", "q1", { note: 1 }), null);
  });

  it("refuse une question absente de la copie", async () => {
    await assertCommandError(gradeQuestion("sub-1", "q99", { note: 1 }, "ens-1"), 404);
  });

  it("refuse une note hors barème ou non numérique", async () => {
    await assertCommandError(gradeQuestion("sub-1", "q3", { note: 7 }, "ens-1"), 400);
    await assertCommandError(gradeQuestion("sub-1", "q3", { note: -1 }, "ens-1"), 400);
    await assertCommandError(gradeQuestion("sub-1", "q3", { note: "5" }, "ens-1"), 400);
  });

  it("refuse un autre enseignant que le responsable", async () => {
    await assertCommandError(gradeQuestion("sub-1", "q3", { note: 3 }, "ens-2"), 403);
  });

  it("refuse une copie dont la correction automatique a échoué", async () => {
    stored.status = "EN_ATTENTE";
    await assertCommandError(gradeQuestion("sub-1", "q3", { note: 3 }, "ens-1"), 409);
  });
});

describe("validate", () => {
  beforeEach(async () => {
    remote({ questionIds: ["q1", "q3"] });
    await gradeSubmission(submission);
  });

  it("refuse tant qu'une question n'est pas notée", async () => {
    await assertCommandError(validate("sub-1", "ens-1"), 409);
    assert.equal(stored.status, "CORRECTION_AUTO_PARTIELLE");
  });

  it("refuse une copie déjà validée", async () => {
    stored.status = "VALIDEE";
    await assertCommandError(validate("sub-1", "ens-1"), 409);
  });

  it("refuse un autre enseignant que le responsable", async () => {
    await gradeQuestion("sub-1", "q3", { note: 3 }, "ens-1");
    await assertCommandError(validate("sub-1", "ens-2"), 403);
  });
});

describe("compensation de la Saga — relance et abandon de la correction automatique", () => {
  it("conserve les réponses pour pouvoir relancer la correction", async () => {
    remote({ questionIds: ["q1"], down: true });
    const grading = await gradeSubmission(submission);
    assert.equal(grading.attempts, 1);
    assert.deepEqual(grading.reponses.map((r) => r.questionId), ["q1", "q2", "q3"]);
  });

  it("retryPending corrige la copie dès que le service distant répond", async () => {
    remote({ questionIds: ["q1", "q2"], down: true });
    await gradeSubmission(submission);
    mock.restoreAll();
    remote({ questionIds: ["q1", "q2"] });
    mock.method(Grading, "find", async () => [stored]);
    mock.method(Grading.prototype, "save", async function save() {
      stored = this;
      return this;
    });
    const [grading] = await retryPending();
    assert.equal(grading.status, "EN_CORRECTION_MANUELLE");
    assert.equal(grading.attempts, 2);
    assert.equal(grading.lastError, undefined);
    assert.deepEqual(grading.notes.map((n) => n.note), [4, 0]);
  });

  it(`abandonne après ${MAX_ATTEMPTS} échecs et publie grading.failed`, async () => {
    remote({ questionIds: ["q1"], down: true });
    await gradeSubmission(submission);
    for (let i = 1; i < MAX_ATTEMPTS; i++) await retryPending();

    assert.equal(stored.status, "ECHEC_CORRECTION");
    assert.equal(stored.attempts, MAX_ATTEMPTS);
    assert.equal(published.length, 1);
    assert.equal(published[0].routingKey, "grading.failed");
    assert.equal(published[0].payload.submissionId, "sub-1");
    assert.equal(published[0].payload.etudiantId, "etu-1");
    assert.match(published[0].payload.error, /ECONNREFUSED/);

    assert.deepEqual(await retryPending(), [], "une copie abandonnée n'est plus relancée automatiquement");
  });

  it("refuse la correction manuelle d'une copie abandonnée", async () => {
    remote({ questionIds: ["q1"], down: true });
    await gradeSubmission(submission);
    stored.status = "ECHEC_CORRECTION";
    await assertCommandError(gradeQuestion("sub-1", "q1", { note: 1 }, "ens-1"), 409);
  });

  it("retry relance manuellement une copie abandonnée", async () => {
    remote({ questionIds: ["q1"], down: true });
    await gradeSubmission(submission);
    stored.status = "ECHEC_CORRECTION";
    stored.attempts = MAX_ATTEMPTS;
    globalThis.fetch.mock.mockImplementation(async (url) =>
      url.includes("/assessments/")
        ? Response.json({ _id: "ass-1", enseignantId: "ens-1", questionIds: ["q1"] })
        : Response.json(QUESTIONS.q1)
    );
    const grading = await retry("sub-1");
    assert.equal(grading.status, "EN_CORRECTION_MANUELLE");
    assert.equal(grading.attempts, 1);
  });

  it("retry refuse une copie déjà corrigée automatiquement", async () => {
    remote({ questionIds: ["q1"] });
    await gradeSubmission(submission);
    await assertCommandError(retry("sub-1"), 409);
  });

  it("retry renvoie null pour une copie inconnue", async () => {
    assert.equal(await retry("inconnue"), null);
  });
});

describe("listPending", () => {
  function captureFilter() {
    const calls = [];
    Grading.find.mock.mockImplementation((filter) => {
      calls.push(filter);
      return { sort: async () => [] };
    });
    return calls;
  }

  it("liste les copies à corriger manuellement ou à valider", async () => {
    const calls = captureFilter();
    await listPending({ enseignantId: "ens-1" });
    assert.deepEqual(calls[0], { status: { $in: ["CORRECTION_AUTO_PARTIELLE", "EN_CORRECTION_MANUELLE"] }, enseignantId: "ens-1" });
  });

  it("ajoute les corrections en attente ou abandonnées avec includeFailed", async () => {
    const calls = captureFilter();
    await listPending({ includeFailed: true });
    assert.deepEqual(calls[0].status.$in, [
      "CORRECTION_AUTO_PARTIELLE",
      "EN_CORRECTION_MANUELLE",
      "EN_ATTENTE",
      "ECHEC_CORRECTION",
    ]);
  });
});
