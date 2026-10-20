const { describe, it, beforeEach, afterEach, mock } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Submission = require("../src/models/Submission");
const OpenAssessment = require("../src/models/OpenAssessment");
const { handleEvent, ROUTING_KEYS } = require("../src/messaging/consumer");

// Traitement des événements entrants, MongoDB simulé.
let submission;

beforeEach(() => {
  submission = new Submission({ assessmentId: "a1", etudiantId: "e1", status: "SOUMISE" });
  mock.method(Submission, "findById", async (id) => (String(id) === submission.id ? submission : null));
  mock.method(Submission.prototype, "save", async function save() {
    return this;
  });
});

afterEach(() => mock.restoreAll());

describe("handleEvent", () => {
  it("écoute la publication des évaluations, l'issue de la correction et des résultats", () => {
    assert.deepEqual(ROUTING_KEYS, ["assessment.published", "grading.failed", "grading.completed", "result.published"]);
  });

  it("assessment.published enregistre l'évaluation ouverte", async () => {
    let saved;
    mock.method(OpenAssessment, "findByIdAndUpdate", async (id, fields, options) => {
      saved = { id, fields, options };
    });
    await handleEvent("assessment.published", {
      assessmentId: "a1",
      titre: "T",
      enseignantId: "ens-1",
      dateFin: "2026-10-21T10:00:00Z",
    });
    assert.equal(saved.id, "a1");
    assert.equal(saved.fields.titre, "T");
    assert.equal(saved.fields.enseignantId, "ens-1");
    assert.equal(saved.options.upsert, true);
  });

  it("grading.failed signale l'incident sur la copie sans changer son statut", async () => {
    await handleEvent("grading.failed", { submissionId: submission.id, error: "HTTP 503" });
    assert.equal(submission.status, "SOUMISE");
    assert.equal(submission.incidentCorrection.message, "HTTP 503");
    assert.ok(submission.incidentCorrection.survenuAt instanceof Date);
  });

  it("grading.completed efface l'incident quand la relance aboutit", async () => {
    await handleEvent("grading.failed", { submissionId: submission.id, error: "HTTP 503" });
    await handleEvent("grading.completed", { submissionId: submission.id });
    assert.equal(submission.incidentCorrection, null);
  });

  it("result.published marque la copie comme corrigée définitivement", async () => {
    await handleEvent("result.published", { submissionId: submission.id, note: 4 });
    assert.ok(submission.resultatPublieAt instanceof Date);
  });

  it("ignore une copie inconnue ou un événement non géré", async () => {
    const autre = new mongoose.Types.ObjectId().toString();
    assert.equal(await handleEvent("grading.failed", { submissionId: autre }), null);
    assert.equal(await handleEvent("question.created", {}), null);
  });
});
