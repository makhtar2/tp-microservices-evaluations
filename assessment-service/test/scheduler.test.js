const { describe, it, beforeEach, afterEach, mock } = require("node:test");
const assert = require("node:assert/strict");
const AssessmentReadModel = require("../src/models/AssessmentReadModel");
const commands = require("../src/commands");
const projectionUpdater = require("../src/projectionUpdater");
const publisher = require("../src/messaging/publisher");
const { runScheduledTasks, CLOSING_SOON_MS } = require("../src/scheduler");

// Le Read Model est simulé par une liste d'évaluations ; find() applique
// les filtres utilisés par le scheduler (statut, dates, rappel déjà émis).
const NOW = new Date("2026-10-20T08:00:00Z");
const HOUR = 60 * 60 * 1000;
let assessments;
let published;
let closingSoon;
let recorded;

function matches(doc, filter) {
  if (filter.status && doc.status !== filter.status) return false;
  if (filter.datePublication && !(new Date(doc.datePublication) <= filter.datePublication.$lte)) return false;
  if (filter.dateFin) {
    const fin = new Date(doc.dateFin);
    if (!(fin > filter.dateFin.$gt && fin <= filter.dateFin.$lte)) return false;
  }
  if ("closingSoonNotifiedAt" in filter && doc.closingSoonNotifiedAt) return false;
  return true;
}

beforeEach(() => {
  assessments = [];
  published = [];
  closingSoon = [];
  recorded = [];
  mock.method(console, "error", () => {});
  mock.method(AssessmentReadModel, "find", (filter) => ({ lean: async () => assessments.filter((a) => matches(a, filter)) }));
  mock.method(commands, "publishAssessment", async (id) => {
    const a = assessments.find((x) => x._id === id);
    if (!a.questionIds?.length) throw new commands.CommandError(409, "Publication refusée");
    a.status = "PUBLIEE";
    published.push(id);
    return a;
  });
  mock.method(projectionUpdater, "recordEvent", async (id, type, payload) => {
    recorded.push({ id, type, payload });
    const a = assessments.find((x) => x._id === id);
    a.closingSoonNotifiedAt = payload.notifiedAt;
    return a;
  });
  mock.method(publisher, "publishAssessmentClosingSoon", async (a) => closingSoon.push(a._id));
});

afterEach(() => mock.restoreAll());

describe("runScheduledTasks — publication planifiée", () => {
  it("publie les évaluations dont la date de publication est atteinte", async () => {
    assessments = [
      { _id: "echue", status: "PLANIFIEE", datePublication: new Date(NOW - HOUR), questionIds: ["q1"] },
      { _id: "future", status: "PLANIFIEE", datePublication: new Date(NOW.getTime() + HOUR), questionIds: ["q1"] },
      { _id: "brouillon", status: "BROUILLON", questionIds: ["q1"] },
    ];
    const result = await runScheduledTasks(NOW);
    assert.deepEqual(result.published, ["echue"]);
    assert.deepEqual(published, ["echue"]);
  });

  it("continue avec les autres évaluations si une publication échoue", async () => {
    assessments = [
      { _id: "invalide", status: "PLANIFIEE", datePublication: new Date(NOW - HOUR), questionIds: [] },
      { _id: "valide", status: "PLANIFIEE", datePublication: new Date(NOW - HOUR), questionIds: ["q1"] },
    ];
    const result = await runScheduledTasks(NOW);
    assert.deepEqual(result.published, ["valide"]);
  });
});

describe("runScheduledTasks — AssessmentClosingSoon", () => {
  it("émet le rappel pour une évaluation publiée qui se termine bientôt", async () => {
    assessments = [{ _id: "a", status: "PUBLIEE", dateFin: new Date(NOW.getTime() + 2 * HOUR) }];
    const result = await runScheduledTasks(NOW);
    assert.deepEqual(result.closingSoon, ["a"]);
    assert.deepEqual(closingSoon, ["a"]);
    assert.equal(recorded[0].type, "AssessmentClosingSoonNotified");
  });

  it("n'émet le rappel qu'une seule fois", async () => {
    assessments = [{ _id: "a", status: "PUBLIEE", dateFin: new Date(NOW.getTime() + 2 * HOUR) }];
    await runScheduledTasks(NOW);
    await runScheduledTasks(new Date(NOW.getTime() + HOUR / 2));
    assert.deepEqual(closingSoon, ["a"]);
  });

  it("ignore une évaluation lointaine, terminée ou non publiée", async () => {
    assessments = [
      { _id: "lointaine", status: "PUBLIEE", dateFin: new Date(NOW.getTime() + CLOSING_SOON_MS + HOUR) },
      { _id: "terminee", status: "PUBLIEE", dateFin: new Date(NOW - HOUR) },
      { _id: "brouillon", status: "BROUILLON", dateFin: new Date(NOW.getTime() + HOUR) },
    ];
    const result = await runScheduledTasks(NOW);
    assert.deepEqual(result.closingSoon, []);
  });

  it("enregistre l'événement avant de publier le rappel", async () => {
    const order = [];
    projectionUpdater.recordEvent.mock.mockImplementation(async (id, type, payload) => {
      order.push("record");
      assessments[0].closingSoonNotifiedAt = payload.notifiedAt;
    });
    publisher.publishAssessmentClosingSoon.mock.mockImplementation(async () => order.push("publish"));
    assessments = [{ _id: "a", status: "PUBLIEE", dateFin: new Date(NOW.getTime() + HOUR) }];
    await runScheduledTasks(NOW);
    assert.deepEqual(order, ["record", "publish"]);
  });
});
