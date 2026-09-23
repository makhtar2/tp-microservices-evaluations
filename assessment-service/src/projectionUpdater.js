const eventStore = require("./eventStore");
const AssessmentReadModel = require("./models/AssessmentReadModel");
const { applyEvent, reconstructState } = require("./projections/projectAssessment");

// Écrit un événement dans l'Event Store puis met à jour le Read Model en
// lui appliquant cet événement (projection incrémentale).
async function recordEvent(assessmentId, type, payload = {}) {
  const event = await eventStore.append(assessmentId, type, payload);
  const current = await AssessmentReadModel.findById(assessmentId).lean();
  const next = applyEvent(current, event.toObject());
  await AssessmentReadModel.findByIdAndUpdate(assessmentId, next, { upsert: true, new: true });
  return next;
}

// Reconstruction complète : rejoue tout l'historique d'une évaluation
// depuis l'Event Store pour re-matérialiser le Read Model (utile après
// un incident, ou pour vérifier que le Read Model est bien dérivé).
async function rebuildReadModel(assessmentId) {
  const events = await eventStore.getEvents(assessmentId);
  const state = reconstructState(events.map((event) => event.toObject()));
  if (state) {
    await AssessmentReadModel.findByIdAndUpdate(assessmentId, state, { upsert: true, new: true });
  }
  return state;
}

module.exports = { recordEvent, rebuildReadModel };
