const AssessmentEvent = require("./models/AssessmentEvent");

async function append(assessmentId, type, payload = {}) {
  const event = await AssessmentEvent.create({ assessmentId, type, payload });
  return event;
}

async function getEvents(assessmentId) {
  return AssessmentEvent.find({ assessmentId }).sort({ createdAt: 1 });
}

module.exports = { append, getEvents };
