const { describe, it, beforeEach, afterEach, mock } = require("node:test");
const assert = require("node:assert/strict");
const amqp = require("amqplib");
const mongoose = require("mongoose");
const Submission = require("../src/models/Submission");
const OpenAssessment = require("../src/models/OpenAssessment");
const { openSubmission, saveAnswers, addFile, submit, ensureAccess, CommandError } = require("../src/commands");

// MongoDB est simulé (OpenAssessment / Submission) et RabbitMQ aussi :
// amqplib.connect renvoie un canal qui enregistre les messages publiés.
const HOUR = 60 * 60 * 1000;
let assessments;
let submissions;
const published = [];

const fakeChannel = {
  assertExchange: async () => {},
  publish: (exchange, routingKey, content) => {
    published.push({ exchange, routingKey, payload: JSON.parse(content.toString()) });
    return true;
  },
};

beforeEach(() => {
  assessments = new Map();
  submissions = new Map();
  published.length = 0;
  mock.method(amqp, "connect", async () => ({ createChannel: async () => fakeChannel }));
  mock.method(OpenAssessment, "findById", (id) => ({ lean: async () => assessments.get(id) || null }));
  mock.method(Submission, "findById", async (id) => submissions.get(String(id)) || null);
  mock.method(Submission, "create", async (fields) => {
    const existing = [...submissions.values()].find(
      (s) => s.assessmentId === fields.assessmentId && s.etudiantId === fields.etudiantId
    );
    if (existing) throw Object.assign(new Error("duplicate key"), { code: 11000 });
    const submission = new Submission(fields);
    submissions.set(submission.id, submission);
    return submission;
  });
  mock.method(Submission.prototype, "save", async function save() {
    submissions.set(this.id, this);
    return this;
  });
});

afterEach(() => mock.restoreAll());

function publishAssessment(id, { debut = -HOUR, fin = HOUR } = {}) {
  const now = Date.now();
  assessments.set(id, { _id: id, dateDebut: new Date(now + debut), dateFin: new Date(now + fin) });
}

function expire(id) {
  assessments.get(id).dateFin = new Date(Date.now() - 1000);
}

async function assertCommandError(promise, status, pattern) {
  await assert.rejects(promise, (err) => {
    assert.ok(err instanceof CommandError, err.message);
    assert.equal(err.status, status);
    if (pattern) assert.match(err.message, pattern);
    return true;
  });
}

describe("openSubmission", () => {
  it("ouvre une copie EN_COURS pour une évaluation publiée et ouverte", async () => {
    publishAssessment("a1");
    const submission = await openSubmission({ assessmentId: "a1", etudiantId: "e1" });
    assert.equal(submission.status, "EN_COURS");
    assert.deepEqual(submission.reponses.toObject(), []);
  });

  it("exige assessmentId et etudiantId", async () => {
    await assertCommandError(openSubmission({ assessmentId: "a1" }), 400);
    await assertCommandError(openSubmission({ etudiantId: "e1" }), 400);
  });

  it("refuse une évaluation non publiée", async () => {
    await assertCommandError(openSubmission({ assessmentId: "inconnue", etudiantId: "e1" }), 409, /non publiée/);
  });

  it("refuse avant la date de début", async () => {
    publishAssessment("a1", { debut: HOUR, fin: 2 * HOUR });
    await assertCommandError(openSubmission({ assessmentId: "a1", etudiantId: "e1" }), 409, /pas encore ouverte/);
  });

  it("refuse après la date de fin", async () => {
    publishAssessment("a1", { debut: -2 * HOUR, fin: -HOUR });
    await assertCommandError(openSubmission({ assessmentId: "a1", etudiantId: "e1" }), 409, /dépassée/);
  });

  it("refuse une seconde copie pour le même étudiant", async () => {
    publishAssessment("a1");
    await openSubmission({ assessmentId: "a1", etudiantId: "e1" });
    await assertCommandError(openSubmission({ assessmentId: "a1", etudiantId: "e1" }), 409, /existe déjà/);
  });
});

describe("saveAnswers (auto-save)", () => {
  it("fusionne les réponses par question", async () => {
    publishAssessment("a1");
    const { id } = await openSubmission({ assessmentId: "a1", etudiantId: "e1" });
    await saveAnswers(id, [
      { questionId: "q1", reponse: "A" },
      { questionId: "q2", reponse: "vrai" },
    ]);
    const submission = await saveAnswers(id, [{ questionId: "q1", reponse: "B" }]);
    assert.deepEqual(submission.toJSON().reponses, [
      { questionId: "q1", reponse: "B" },
      { questionId: "q2", reponse: "vrai" },
    ]);
  });

  it("refuse un format de réponses invalide", async () => {
    await assertCommandError(saveAnswers("x", "pas un tableau"), 400);
    await assertCommandError(saveAnswers("x", [{ reponse: "sans questionId" }]), 400);
  });

  it("renvoie null pour une copie inconnue ou un identifiant invalide", async () => {
    assert.equal(await saveAnswers(new mongoose.Types.ObjectId().toString(), []), null);
    assert.equal(await saveAnswers("pas-un-id", []), null);
  });

  it("refuse la copie hors délai et la passe en REFUSEE_HORS_DELAI", async () => {
    publishAssessment("a1");
    const { id } = await openSubmission({ assessmentId: "a1", etudiantId: "e1" });
    await saveAnswers(id, [{ questionId: "q1", reponse: "A" }]);
    expire("a1");
    await assertCommandError(saveAnswers(id, [{ questionId: "q1", reponse: "B" }]), 409, /refusée/);
    const submission = submissions.get(id);
    assert.equal(submission.status, "REFUSEE_HORS_DELAI");
    assert.equal(submission.reponses[0].reponse, "A");
  });
});

describe("addFile", () => {
  it("rattache le fichier à la copie avec son nom d'origine", async () => {
    publishAssessment("a1");
    const { id } = await openSubmission({ assessmentId: "a1", etudiantId: "e1" });
    const fichier = await addFile(id, { originalname: "rapport.pdf", filename: "1234.pdf" });
    assert.equal(fichier.nomFichier, "rapport.pdf");
    assert.equal(fichier.url, "/uploads/1234.pdf");
  });

  it("refuse une requête sans fichier", async () => {
    await assertCommandError(addFile("x", undefined), 400);
  });

  it("refuse un dépôt après l'échéance", async () => {
    publishAssessment("a1");
    const { id } = await openSubmission({ assessmentId: "a1", etudiantId: "e1" });
    expire("a1");
    await assertCommandError(addFile(id, { originalname: "r.pdf", filename: "r.pdf" }), 409);
    assert.equal(submissions.get(id).fichiers.length, 0);
  });
});

describe("submit", () => {
  it("passe la copie SOUMISE et publie submission.completed avec les réponses", async () => {
    publishAssessment("a1");
    const { id } = await openSubmission({ assessmentId: "a1", etudiantId: "e1" });
    await saveAnswers(id, [{ questionId: "q1", reponse: "A" }]);
    const submission = await submit(id);

    assert.equal(submission.status, "SOUMISE");
    assert.ok(submission.soumiseAt instanceof Date);
    assert.equal(published.length, 1);
    const [message] = published;
    assert.equal(message.exchange, "evaluations.events");
    assert.equal(message.routingKey, "submission.completed");
    assert.equal(message.payload.submissionId, id);
    assert.equal(message.payload.assessmentId, "a1");
    assert.equal(message.payload.etudiantId, "e1");
    assert.deepEqual(message.payload.reponses, [{ questionId: "q1", reponse: "A" }]);
  });

  it("refuse de soumettre deux fois la même copie", async () => {
    publishAssessment("a1");
    const { id } = await openSubmission({ assessmentId: "a1", etudiantId: "e1" });
    await submit(id);
    await assertCommandError(submit(id), 409, /SOUMISE/);
    assert.equal(published.length, 1);
  });

  it("ne publie rien pour une copie soumise hors délai", async () => {
    publishAssessment("a1");
    const { id } = await openSubmission({ assessmentId: "a1", etudiantId: "e1" });
    expire("a1");
    await assertCommandError(submit(id), 409);
    assert.equal(submissions.get(id).status, "REFUSEE_HORS_DELAI");
    assert.equal(published.length, 0);
  });
});

describe("contrôle d'accès selon l'identité transmise par l'api-gateway", () => {
  const etudiant = (userId) => ({ userId, role: "ETUDIANT" });
  const enseignant = { userId: "ens-1", role: "ENSEIGNANT" };

  it("ouvre toujours la copie au nom de l'étudiant connecté", async () => {
    publishAssessment("a1");
    const submission = await openSubmission({ assessmentId: "a1", etudiantId: "un-autre" }, etudiant("e1"));
    assert.equal(submission.etudiantId, "e1");
  });

  it("refuse qu'un enseignant ouvre une copie", async () => {
    publishAssessment("a1");
    await assertCommandError(openSubmission({ assessmentId: "a1", etudiantId: "e1" }, enseignant), 403);
  });

  it("refuse qu'un étudiant modifie, complète ou soumette la copie d'un autre", async () => {
    publishAssessment("a1");
    const { id } = await openSubmission({ assessmentId: "a1" }, etudiant("e1"));
    const intrus = etudiant("e2");
    await assertCommandError(saveAnswers(id, [{ questionId: "q1", reponse: "x" }], intrus), 403);
    await assertCommandError(addFile(id, { originalname: "r.pdf", filename: "r.pdf" }, intrus), 403);
    await assertCommandError(submit(id, intrus), 403);
    assert.equal(submissions.get(id).status, "EN_COURS");
    assert.equal(published.length, 0);
  });

  it("refuse qu'un enseignant modifie une copie", async () => {
    publishAssessment("a1");
    const { id } = await openSubmission({ assessmentId: "a1" }, etudiant("e1"));
    await assertCommandError(saveAnswers(id, [{ questionId: "q1", reponse: "x" }], enseignant), 403);
  });

  it("laisse l'étudiant propriétaire travailler sur sa copie", async () => {
    publishAssessment("a1");
    const { id } = await openSubmission({ assessmentId: "a1" }, etudiant("e1"));
    await saveAnswers(id, [{ questionId: "q1", reponse: "A" }], etudiant("e1"));
    assert.equal((await submit(id, etudiant("e1"))).status, "SOUMISE");
  });

  it("ensureAccess : lecture permise à l'enseignant, interdite à un autre étudiant", () => {
    const copie = { etudiantId: "e1" };
    assert.doesNotThrow(() => ensureAccess(copie, enseignant));
    assert.doesNotThrow(() => ensureAccess(copie, etudiant("e1")));
    assert.doesNotThrow(() => ensureAccess(copie, {}));
    assert.throws(() => ensureAccess(copie, etudiant("e2")), (err) => err.status === 403);
  });
});
