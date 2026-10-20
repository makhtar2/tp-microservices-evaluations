const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { applyEvent, reconstructState } = require("../src/projections/projectAssessment");

const ID = "ass-1";

function event(type, payload = {}) {
  return { assessmentId: ID, type, payload };
}

const created = event("AssessmentCreated", {
  titre: "Partiel Systèmes distribués",
  enseignantId: "ens-1",
  matiere: "Systèmes distribués",
  questionIds: ["q1", "q2"],
  bareme: 20,
  dateDebut: "2026-10-01T08:00:00Z",
  dateFin: "2026-10-01T10:00:00Z",
  duree: 120,
  consignes: "Sans documents",
});

describe("applyEvent", () => {
  it("AssessmentCreated initialise une évaluation en BROUILLON", () => {
    const state = applyEvent(null, created);
    assert.equal(state._id, ID);
    assert.equal(state.titre, "Partiel Systèmes distribués");
    assert.equal(state.enseignantId, "ens-1");
    assert.deepEqual(state.questionIds, ["q1", "q2"]);
    assert.equal(state.bareme, 20);
    assert.equal(state.status, "BROUILLON");
    assert.deepEqual(state.resultatsEtudiants, []);
  });

  it("AssessmentCreated applique des valeurs par défaut sans questions ni barème", () => {
    const state = applyEvent(null, event("AssessmentCreated", { titre: "T", enseignantId: "e", matiere: "m" }));
    assert.deepEqual(state.questionIds, []);
    assert.equal(state.bareme, 0);
  });

  it("AssessmentUpdated ne modifie que les champs du payload", () => {
    const state = applyEvent(applyEvent(null, created), event("AssessmentUpdated", { titre: "Examen final" }));
    assert.equal(state.titre, "Examen final");
    assert.equal(state.matiere, "Systèmes distribués");
    assert.equal(state.bareme, 20);
  });

  it("AssessmentPublished passe le statut à PUBLIEE", () => {
    const state = applyEvent(applyEvent(null, created), event("AssessmentPublished"));
    assert.equal(state.status, "PUBLIEE");
  });

  it("AssessmentScheduled passe le statut à PLANIFIEE avec la date de publication", () => {
    const state = applyEvent(applyEvent(null, created), event("AssessmentScheduled", { datePublication: "2026-10-01T07:00:00Z" }));
    assert.equal(state.status, "PLANIFIEE");
    assert.equal(state.datePublication, "2026-10-01T07:00:00Z");
  });

  it("AssessmentClosingSoonNotified mémorise l'envoi du rappel de clôture", () => {
    const state = applyEvent(applyEvent(null, created), event("AssessmentClosingSoonNotified", { notifiedAt: "2026-10-01T09:00:00Z" }));
    assert.equal(state.closingSoonNotifiedAt, "2026-10-01T09:00:00Z");
    assert.equal(state.status, "BROUILLON");
  });

  it("AssessmentCancelled passe le statut à ANNULEE", () => {
    const state = applyEvent(applyEvent(null, created), event("AssessmentCancelled"));
    assert.equal(state.status, "ANNULEE");
  });

  it("GradingCompleted ne rend aucun résultat visible", () => {
    const before = applyEvent(applyEvent(null, created), event("AssessmentPublished"));
    const after = applyEvent(before, event("GradingCompleted", { etudiantId: "etu-1", note: 15 }));
    assert.equal(after, before);
    assert.deepEqual(after.resultatsEtudiants, []);
  });

  it("ResultPublished ajoute le résultat de l'étudiant et passe à CORRIGEE", () => {
    const state = applyEvent(
      applyEvent(null, created),
      event("ResultPublished", { etudiantId: "etu-1", note: 15, commentaire: "Bien" })
    );
    assert.equal(state.status, "CORRIGEE");
    assert.deepEqual(state.resultatsEtudiants, [
      { etudiantId: "etu-1", note: 15, commentaire: "Bien", resultPublished: true },
    ]);
  });

  it("ResultPublished remplace le résultat existant du même étudiant", () => {
    let state = applyEvent(null, created);
    state = applyEvent(state, event("ResultPublished", { etudiantId: "etu-1", note: 10 }));
    state = applyEvent(state, event("ResultPublished", { etudiantId: "etu-2", note: 12 }));
    state = applyEvent(state, event("ResultPublished", { etudiantId: "etu-1", note: 14 }));
    assert.equal(state.resultatsEtudiants.length, 2);
    assert.equal(state.resultatsEtudiants.find((r) => r.etudiantId === "etu-1").note, 14);
  });

  it("ResultPublished ne modifie pas l'état précédent (immutabilité)", () => {
    const before = applyEvent(null, created);
    applyEvent(before, event("ResultPublished", { etudiantId: "etu-1", note: 10 }));
    assert.deepEqual(before.resultatsEtudiants, []);
    assert.equal(before.status, "BROUILLON");
  });

  it("ignore un type d'événement inconnu", () => {
    const state = applyEvent(null, created);
    assert.equal(applyEvent(state, event("SomethingElse", { titre: "x" })), state);
  });
});

describe("reconstructState", () => {
  it("renvoie null sans événement", () => {
    assert.equal(reconstructState([]), null);
  });

  it("rejoue tout l'historique d'une évaluation", () => {
    const state = reconstructState([
      created,
      event("AssessmentUpdated", { bareme: 25 }),
      event("AssessmentPublished"),
      event("GradingCompleted", { etudiantId: "etu-1" }),
      event("ResultPublished", { etudiantId: "etu-1", note: 18, commentaire: "Très bien" }),
    ]);
    assert.equal(state.bareme, 25);
    assert.equal(state.status, "CORRIGEE");
    assert.equal(state.resultatsEtudiants[0].note, 18);
  });

  it("donne le même état qu'une application incrémentale (rebuild du Read Model)", () => {
    const events = [created, event("AssessmentPublished"), event("ResultPublished", { etudiantId: "e", note: 9 })];
    let incremental = null;
    for (const e of events) incremental = applyEvent(incremental, e);
    assert.deepEqual(reconstructState(events), incremental);
  });
});
