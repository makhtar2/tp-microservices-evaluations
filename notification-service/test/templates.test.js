const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { ROUTING_KEYS, buildNotifications } = require("../src/templates");

describe("ROUTING_KEYS", () => {
  it("couvre les 5 événements métier, le refus de dépôt et l'échec de correction", () => {
    assert.deepEqual([...ROUTING_KEYS].sort(), [
      "assessment.closing_soon",
      "assessment.published",
      "grading.completed",
      "grading.failed",
      "result.published",
      "submission.completed",
      "submission.rejected",
    ]);
  });
});

describe("buildNotifications", () => {
  it("renvoie une liste vide pour un événement inconnu", () => {
    assert.deepEqual(buildNotifications("question.created", { assessmentId: "a" }), []);
  });

  it("rattache chaque notification à l'évaluation de l'événement", () => {
    for (const key of ROUTING_KEYS) {
      const notifications = buildNotifications(key, { assessmentId: "a-42", etudiantId: "e", note: 1 });
      assert.ok(notifications.length > 0, key);
      for (const n of notifications) assert.equal(n.assessmentId, "a-42", key);
    }
  });

  it("assessment.published notifie tous les étudiants avec la période d'ouverture", () => {
    const [n] = buildNotifications("assessment.published", {
      assessmentId: "a",
      titre: "Partiel",
      dateDebut: "2026-10-01T08:00:00Z",
      dateFin: "2026-10-01T10:00:00Z",
    });
    assert.equal(n.role, "ETUDIANT");
    assert.equal(n.userId, undefined);
    assert.equal(n.type, "AssessmentPublished");
    assert.equal(n.titre, "Nouvelle évaluation : Partiel");
    assert.match(n.message, /01\/10\/2026 08:00:00 UTC/);
    assert.match(n.message, /01\/10\/2026 10:00:00 UTC/);
  });

  it("assessment.published sans date limite ne parle pas de « date non précisée »", () => {
    const [n] = buildNotifications("assessment.published", { assessmentId: "a", titre: "TP" });
    assert.equal(n.message, "Ouverte dès maintenant, sans date limite.");
  });

  it("assessment.published avec seulement une date de fin donne la date limite", () => {
    const [n] = buildNotifications("assessment.published", {
      assessmentId: "a",
      dateFin: "2026-10-01T10:00:00.000Z",
    });
    assert.equal(n.message, "À rendre avant le 01/10/2026 10:00:00 UTC.");
  });

  it("assessment.published avec seulement une date de début l'indique", () => {
    const [n] = buildNotifications("assessment.published", {
      assessmentId: "a",
      dateDebut: "2026-10-01T08:00:00.000Z",
    });
    assert.equal(n.message, "Ouverte à partir du 01/10/2026 08:00:00 UTC, sans date limite.");
  });

  it("utilise l'identifiant de l'évaluation quand le titre manque", () => {
    const [n] = buildNotifications("assessment.closing_soon", { assessmentId: "a-7" });
    assert.equal(n.titre, "Clôture imminente : a-7");
    assert.match(n.message, /date non précisée/);
  });

  it("submission.completed notifie l'étudiant concerné", () => {
    const [n] = buildNotifications("submission.completed", {
      assessmentId: "a",
      etudiantId: "etu-1",
      soumiseAt: "2026-10-01T09:30:00Z",
    });
    assert.equal(n.userId, "etu-1");
    assert.equal(n.type, "SubmissionCompleted");
    assert.match(n.message, /09:30:00 UTC/);
  });

  it("submission.rejected prévient l'étudiant de l'échec de son dépôt", () => {
    const [n] = buildNotifications("submission.rejected", { assessmentId: "a", etudiantId: "etu-1", motif: "HORS_DELAI" });
    assert.equal(n.userId, "etu-1");
    assert.equal(n.type, "SubmissionRejected");
    assert.match(n.message, /date limite/);
  });

  it("grading.failed prévient l'étudiant et l'enseignant responsable", () => {
    const [etudiant, enseignant] = buildNotifications("grading.failed", {
      assessmentId: "a",
      submissionId: "sub-1",
      etudiantId: "etu-1",
      enseignantId: "ens-1",
      error: "HTTP 503",
    });
    assert.equal(etudiant.userId, "etu-1");
    assert.equal(enseignant.userId, "ens-1");
    assert.equal(enseignant.role, undefined);
    assert.match(enseignant.message, /sub-1.*HTTP 503/);
  });

  it("grading.failed prévient tous les enseignants si le responsable est inconnu", () => {
    const [, enseignant] = buildNotifications("grading.failed", { assessmentId: "a", etudiantId: "etu-1" });
    assert.equal(enseignant.role, "ENSEIGNANT");
  });

  it("grading.completed ne révèle pas la note avant publication", () => {
    const [n] = buildNotifications("grading.completed", { assessmentId: "a", etudiantId: "etu-1", scoreTotal: 17 });
    assert.equal(n.userId, "etu-1");
    assert.doesNotMatch(n.message, /17/);
  });

  it("result.published donne la note, ou le score total à défaut", () => {
    const [avecNote] = buildNotifications("result.published", { assessmentId: "a", etudiantId: "e", note: 15 });
    assert.equal(avecNote.message, "Votre note : 15.");
    const [avecScore] = buildNotifications("result.published", { assessmentId: "a", etudiantId: "e", scoreTotal: 12 });
    assert.equal(avecScore.message, "Votre note : 12.");
  });

  it("result.published affiche une note de 0", () => {
    const [n] = buildNotifications("result.published", { assessmentId: "a", etudiantId: "e", note: 0, scoreTotal: 9 });
    assert.equal(n.message, "Votre note : 0.");
  });
});
