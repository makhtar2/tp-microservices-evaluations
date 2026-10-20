const { describe, it, afterEach, mock } = require("node:test");
const assert = require("node:assert/strict");
const AssessmentReadModel = require("../src/models/AssessmentReadModel");
const { getResults, listAssessments, getAssessment } = require("../src/queries");

// Le Read Model est simulé : findById(...).lean() renvoie le document fourni.
function readModelReturns(doc) {
  mock.method(AssessmentReadModel, "findById", () => ({ lean: async () => doc }));
}

afterEach(() => mock.restoreAll());

describe("getResults", () => {
  it("renvoie null pour une évaluation inconnue", async () => {
    readModelReturns(null);
    assert.equal(await getResults("inconnue"), null);
  });

  it("renvoie une moyenne nulle sans résultat publié", async () => {
    readModelReturns({ _id: "a", bareme: 20, resultatsEtudiants: [] });
    const results = await getResults("a");
    assert.equal(results.moyenne, 0);
    assert.equal(results.nombreSoumissions, 0);
    assert.deepEqual(results.repartitionNotes, []);
  });

  it("ignore les résultats non publiés", async () => {
    readModelReturns({
      _id: "a",
      bareme: 20,
      resultatsEtudiants: [
        { etudiantId: "e1", note: 10, resultPublished: true },
        { etudiantId: "e2", note: 20, resultPublished: false },
      ],
    });
    const results = await getResults("a");
    assert.equal(results.nombreSoumissions, 1);
    assert.equal(results.moyenne, 10);
    assert.deepEqual(results.resultatsEtudiants.map((r) => r.etudiantId), ["e1"]);
  });

  it("calcule la moyenne des notes publiées", async () => {
    readModelReturns({
      _id: "a",
      bareme: 20,
      resultatsEtudiants: [
        { etudiantId: "e1", note: 8, resultPublished: true },
        { etudiantId: "e2", note: 12, resultPublished: true },
        { etudiantId: "e3", note: 19, resultPublished: true },
      ],
    });
    assert.equal((await getResults("a")).moyenne, 13);
  });

  it("répartit les notes par tranche de pourcentage du barème", async () => {
    readModelReturns({
      _id: "a",
      bareme: 20,
      resultatsEtudiants: [
        { etudiantId: "e1", note: 2, resultPublished: true }, // 10 %
        { etudiantId: "e2", note: 5, resultPublished: true }, // 25 % (borne)
        { etudiantId: "e3", note: 14, resultPublished: true }, // 70 %
        { etudiantId: "e4", note: 15, resultPublished: true }, // 75 % (borne)
        { etudiantId: "e5", note: 20, resultPublished: true }, // 100 %
      ],
    });
    const { repartitionNotes } = await getResults("a");
    const parTranche = Object.fromEntries(repartitionNotes.map((r) => [r.tranche, r.effectif]));
    assert.deepEqual(parTranche, { "0-25%": 1, "25-50%": 1, "50-75%": 1, "75-100%": 2 });
  });

  it("ne renvoie à un étudiant que son propre résultat, avec les statistiques globales", async () => {
    readModelReturns({
      _id: "a",
      bareme: 20,
      status: "CORRIGEE",
      resultatsEtudiants: [
        { etudiantId: "e1", note: 10, resultPublished: true },
        { etudiantId: "e2", note: 20, resultPublished: true },
      ],
    });
    const results = await getResults("a", { role: "ETUDIANT", userId: "e1" });
    assert.deepEqual(results.resultatsEtudiants.map((r) => r.etudiantId), ["e1"]);
    assert.equal(results.moyenne, 15);
    assert.equal(results.nombreSoumissions, 2);
  });

  it("renvoie tous les résultats à un enseignant", async () => {
    readModelReturns({
      _id: "a",
      bareme: 20,
      status: "CORRIGEE",
      resultatsEtudiants: [
        { etudiantId: "e1", note: 10, resultPublished: true },
        { etudiantId: "e2", note: 20, resultPublished: true },
      ],
    });
    const results = await getResults("a", { role: "ENSEIGNANT", userId: "ens-1" });
    assert.equal(results.resultatsEtudiants.length, 2);
  });

  it("cache à un étudiant les résultats d'une évaluation non publiée", async () => {
    readModelReturns({ _id: "a", bareme: 20, status: "BROUILLON", resultatsEtudiants: [] });
    assert.equal(await getResults("a", { role: "ETUDIANT", userId: "e1" }), null);
  });

  it("classe tout en 0-25% si le barème est nul", async () => {
    readModelReturns({
      _id: "a",
      bareme: 0,
      resultatsEtudiants: [{ etudiantId: "e1", note: 5, resultPublished: true }],
    });
    const { repartitionNotes } = await getResults("a");
    assert.deepEqual(repartitionNotes, [{ tranche: "0-25%", effectif: 1 }]);
  });
});

describe("listAssessments / getAssessment — visibilité par rôle", () => {
  it("ne liste pour un étudiant que les évaluations publiées", async () => {
    let filter;
    mock.method(AssessmentReadModel, "find", (f) => {
      filter = f;
      return { lean: async () => [] };
    });
    await listAssessments({ role: "ETUDIANT" });
    assert.deepEqual(filter.status, { $in: ["PUBLIEE", "EN_COURS", "TERMINEE", "CORRIGEE"] });
  });

  it("ignore un filtre de statut BROUILLON demandé par un étudiant", async () => {
    let filter;
    mock.method(AssessmentReadModel, "find", (f) => {
      filter = f;
      return { lean: async () => [] };
    });
    await listAssessments({ role: "ETUDIANT", status: "BROUILLON" });
    assert.notEqual(filter.status, "BROUILLON");
  });

  it("ne filtre pas les statuts pour un enseignant", async () => {
    let filter;
    mock.method(AssessmentReadModel, "find", (f) => {
      filter = f;
      return { lean: async () => [] };
    });
    await listAssessments({ role: "ENSEIGNANT", enseignantId: "ens-1" });
    assert.deepEqual(filter, { enseignantId: "ens-1" });
  });

  it("cache un brouillon à un étudiant mais pas à l'enseignant", async () => {
    readModelReturns({ _id: "a", status: "BROUILLON" });
    assert.equal(await getAssessment("a", { role: "ETUDIANT" }), null);
    assert.equal((await getAssessment("a", { role: "ENSEIGNANT" }))._id, "a");
  });
});
