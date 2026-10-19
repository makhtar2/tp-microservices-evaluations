const { describe, it, afterEach, mock } = require("node:test");
const assert = require("node:assert/strict");
const Question = require("../src/models/Question");
const { computeTargets, selectQuestions } = require("../src/grpc/selectQuestions");

afterEach(() => mock.restoreAll());

describe("computeTargets", () => {
  it("applique la répartition demandée", () => {
    assert.deepEqual(computeTargets(10, { easyPercent: 30, mediumPercent: 50, hardPercent: 20 }), {
      FACILE: 3,
      MOYEN: 5,
      DIFFICILE: 2,
    });
  });

  it("totalise toujours exactement le nombre demandé malgré les arrondis", () => {
    for (const count of [1, 3, 7, 11, 13]) {
      const t = computeTargets(count, { easyPercent: 33, mediumPercent: 33, hardPercent: 34 });
      assert.equal(t.FACILE + t.MOYEN + t.DIFFICILE, count, `count=${count}`);
    }
  });

  it("met tout en difficile sans répartition", () => {
    assert.deepEqual(computeTargets(4), { FACILE: 0, MOYEN: 0, DIFFICILE: 4 });
  });

  it("ne renvoie jamais de nombre négatif", () => {
    const t = computeTargets(3, { easyPercent: 60, mediumPercent: 60 });
    assert.ok(t.DIFFICILE >= 0);
  });
});

describe("selectQuestions", () => {
  // Simule la banque : chaque niveau en contient `available[niveau]`.
  function bank(available) {
    const calls = [];
    mock.method(Question, "aggregate", async (pipeline) => {
      const match = pipeline[0].$match;
      const size = pipeline[1].$sample.size;
      calls.push(match);
      const level = match.difficulty || "EXTRA";
      const n = Math.min(size, available[level] || 0);
      return Array.from({ length: n }, (_, i) => ({ _id: `${level}-${i}`, difficulty: level }));
    });
    return calls;
  }

  it("filtre sur la matière et les questions actives", async () => {
    const calls = bank({ FACILE: 5, MOYEN: 5, DIFFICILE: 5 });
    await selectQuestions({ subject: "Réseaux", count: 2, difficulty: { easyPercent: 50, mediumPercent: 50 } });
    for (const match of calls) {
      assert.equal(match.subject, "Réseaux");
      assert.equal(match.active, true);
      assert.equal(match.chapter, undefined);
    }
  });

  it("filtre sur les thèmes demandés", async () => {
    const calls = bank({ FACILE: 5 });
    await selectQuestions({ subject: "S", count: 1, difficulty: { easyPercent: 100 }, themes: ["gRPC", "REST"] });
    assert.deepEqual(calls[0].chapter, { $in: ["gRPC", "REST"] });
  });

  it("signale fullySatisfied quand la banque suffit", async () => {
    bank({ FACILE: 5, MOYEN: 5, DIFFICILE: 5 });
    const result = await selectQuestions({ subject: "S", count: 10, difficulty: { easyPercent: 30, mediumPercent: 50 } });
    assert.equal(result.fullySatisfied, true);
    assert.equal(result.questions.length, 10);
  });

  it("complète avec d'autres questions sans doublon si un niveau manque", async () => {
    const calls = bank({ FACILE: 1, MOYEN: 5, DIFFICILE: 5, EXTRA: 10 });
    const result = await selectQuestions({ subject: "S", count: 4, difficulty: { easyPercent: 50, mediumPercent: 50 } });
    assert.equal(result.fullySatisfied, false);
    assert.equal(result.questions.length, 4);
    const extra = calls.at(-1);
    assert.deepEqual(extra._id.$nin, ["FACILE-0", "MOYEN-0", "MOYEN-1"]);
  });

  it("renvoie moins de questions si la banque est trop pauvre", async () => {
    bank({});
    const result = await selectQuestions({ subject: "S", count: 3, difficulty: {} });
    assert.equal(result.fullySatisfied, false);
    assert.deepEqual(result.questions, []);
  });
});
