const { describe, it, beforeEach, afterEach, mock } = require("node:test");
const assert = require("node:assert/strict");
const AssessmentReadModel = require("../src/models/AssessmentReadModel");
const eventStore = require("../src/eventStore");
const { createAssessment, updateAssessment, publishAssessment, cancelAssessment, CommandError } = require("../src/commands");

// MongoDB est simulé : le Read Model courant est `current`, et chaque
// événement ajouté à l'Event Store est enregistré dans `appended`.
let current;
let appended;

beforeEach(() => {
  current = null;
  appended = [];
  mock.method(AssessmentReadModel, "findById", () => ({ lean: async () => current }));
  mock.method(AssessmentReadModel, "findByIdAndUpdate", async (id, next) => {
    current = next;
    return next;
  });
  mock.method(eventStore, "append", async (assessmentId, type, payload) => {
    const event = { assessmentId, type, payload };
    appended.push(event);
    return { toObject: () => event };
  });
});

afterEach(() => mock.restoreAll());

function assessment(overrides = {}) {
  return { _id: "a", titre: "T", status: "BROUILLON", questionIds: ["q1"], bareme: 10, ...overrides };
}

async function assertCommandError(promise, status) {
  await assert.rejects(promise, (err) => err instanceof CommandError && err.status === status);
}

describe("createAssessment", () => {
  it("exige titre, enseignantId et matiere", async () => {
    await assertCommandError(createAssessment({ titre: "T", matiere: "M" }), 400);
    await assertCommandError(createAssessment({ enseignantId: "e", matiere: "M" }), 400);
    await assertCommandError(createAssessment({ titre: "T", enseignantId: "e" }), 400);
    assert.equal(appended.length, 0);
  });

  it("enregistre un événement AssessmentCreated et renvoie un brouillon", async () => {
    const state = await createAssessment({ titre: "T", enseignantId: "e", matiere: "M", questionIds: ["q1"], bareme: 5 });
    assert.equal(appended.length, 1);
    assert.equal(appended[0].type, "AssessmentCreated");
    assert.deepEqual(appended[0].payload.questionIds, ["q1"]);
    assert.equal(state.status, "BROUILLON");
    assert.equal(state._id, appended[0].assessmentId);
  });

  it("génère un identifiant différent pour chaque évaluation", async () => {
    const a = await createAssessment({ titre: "A", enseignantId: "e", matiere: "M" });
    const b = await createAssessment({ titre: "B", enseignantId: "e", matiere: "M" });
    assert.notEqual(a._id, b._id);
  });
});

describe("updateAssessment", () => {
  it("renvoie null pour une évaluation inconnue", async () => {
    assert.equal(await updateAssessment("a", { titre: "X" }), null);
  });

  it("n'enregistre que les champs fournis", async () => {
    current = assessment();
    const state = await updateAssessment("a", { titre: "Nouveau titre", inconnu: "ignoré" });
    assert.deepEqual(appended[0].payload, { titre: "Nouveau titre" });
    assert.equal(state.titre, "Nouveau titre");
    assert.equal(state.bareme, 10);
  });

  for (const status of ["PUBLIEE", "ANNULEE", "CORRIGEE"]) {
    it(`refuse la modification d'une évaluation ${status}`, async () => {
      current = assessment({ status });
      await assertCommandError(updateAssessment("a", { titre: "X" }), 409);
      assert.equal(appended.length, 0);
    });
  }
});

describe("publishAssessment — règles de publication", () => {
  it("renvoie null pour une évaluation inconnue", async () => {
    assert.equal(await publishAssessment("a"), null);
  });

  it("refuse une évaluation sans question", async () => {
    current = assessment({ questionIds: [] });
    await assertCommandError(publishAssessment("a"), 409);
  });

  it("refuse une évaluation avec un barème total à 0", async () => {
    current = assessment({ bareme: 0 });
    await assertCommandError(publishAssessment("a"), 409);
  });

  it("refuse une évaluation déjà publiée", async () => {
    current = assessment({ status: "PUBLIEE" });
    await assertCommandError(publishAssessment("a"), 409);
    assert.equal(appended.length, 0);
  });
});

describe("cancelAssessment", () => {
  it("annule une évaluation publiée", async () => {
    current = assessment({ status: "PUBLIEE" });
    const state = await cancelAssessment("a");
    assert.equal(appended[0].type, "AssessmentCancelled");
    assert.equal(state.status, "ANNULEE");
  });

  it("refuse d'annuler un brouillon ou une évaluation déjà annulée", async () => {
    current = assessment({ status: "BROUILLON" });
    await assertCommandError(cancelAssessment("a"), 409);
    current = assessment({ status: "ANNULEE" });
    await assertCommandError(cancelAssessment("a"), 409);
    assert.equal(appended.length, 0);
  });
});
