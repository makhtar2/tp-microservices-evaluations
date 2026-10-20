const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const Grading = require("../src/models/Grading");

// Tests du modèle sans base de données : seules les méthodes et la
// validation Mongoose (validateSync) sont utilisées.

function newGrading(notes = []) {
  return new Grading({ _id: "sub-1", assessmentId: "ass-1", etudiantId: "etu-1", notes });
}

describe("Grading.recomputeScore", () => {
  it("additionne les notes de toutes les questions", () => {
    const grading = newGrading([
      { questionId: "q1", pointsMax: 4, note: 4 },
      { questionId: "q2", pointsMax: 2, note: 1.5 },
    ]);
    grading.recomputeScore();
    assert.equal(grading.scoreTotal, 5.5);
  });

  it("compte 0 pour les questions pas encore notées (note null)", () => {
    const grading = newGrading([
      { questionId: "q1", pointsMax: 4, note: 3 },
      { questionId: "q2", pointsMax: 5, note: null },
    ]);
    grading.recomputeScore();
    assert.equal(grading.scoreTotal, 3);
  });

  it("donne 0 pour une copie sans question", () => {
    const grading = newGrading();
    grading.recomputeScore();
    assert.equal(grading.scoreTotal, 0);
  });
});

describe("Grading — valeurs par défaut et validation", () => {
  it("démarre EN_ATTENTE, sans validation", () => {
    const grading = newGrading();
    assert.equal(grading.status, "EN_ATTENTE");
    assert.equal(grading.validatedAt, null);
    assert.equal(grading.scoreTotal, 0);
  });

  it("une note de question est null par défaut", () => {
    const grading = newGrading([{ questionId: "q1", pointsMax: 5 }]);
    assert.equal(grading.notes[0].note, null);
    assert.equal(grading.notes[0].correctionAutomatique, false);
  });

  it("refuse un statut inconnu", () => {
    const grading = newGrading();
    grading.status = "TERMINEE";
    const error = grading.validateSync();
    assert.ok(error?.errors.status);
  });

  it("exige assessmentId et etudiantId", () => {
    const error = new Grading({ _id: "sub-1" }).validateSync();
    assert.ok(error?.errors.assessmentId);
    assert.ok(error?.errors.etudiantId);
  });

  it("accepte tous les statuts du cycle de correction", () => {
    for (const status of Grading.GRADING_STATUSES) {
      const grading = newGrading();
      grading.status = status;
      assert.equal(grading.validateSync(), undefined, status);
    }
  });
});

describe("Grading — sérialisation JSON", () => {
  it("expose submissionId à la place de _id, sans __v", () => {
    const json = newGrading().toJSON();
    assert.equal(json.submissionId, "sub-1");
    assert.equal(json._id, undefined);
    assert.equal(json.__v, undefined);
  });
});
