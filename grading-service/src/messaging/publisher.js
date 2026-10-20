const { getChannel, EXCHANGE } = require("./connection");

async function publish(routingKey, payload) {
  try {
    const channel = await getChannel();
    channel.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(payload)), {
      contentType: "application/json",
      persistent: true,
    });
  } catch (err) {
    console.error(`[grading-service] Publication de "${routingKey}" impossible (broker indisponible) :`, err.message);
  }
}

// Payload aligné sur le consumer d'assessment-service :
// { assessmentId, etudiantId, note, commentaire?, scoreTotal }.
function resultPayload(grading) {
  return {
    submissionId: grading.submissionId,
    assessmentId: grading.assessmentId,
    etudiantId: grading.etudiantId,
    note: grading.scoreTotal,
    scoreTotal: grading.scoreTotal,
    occurredAt: new Date().toISOString(),
  };
}

function publishGradingCompleted(grading) {
  return publish("grading.completed", { ...resultPayload(grading), notes: grading.notes });
}

function publishResultPublished(grading) {
  return publish("result.published", resultPayload(grading));
}

// Compensation de la Saga : la correction automatique est abandonnée après
// plusieurs échecs. submission-service marque la copie, notification-service
// prévient l'étudiant et l'enseignant.
function publishGradingFailed(grading) {
  return publish("grading.failed", {
    submissionId: grading.submissionId,
    assessmentId: grading.assessmentId,
    etudiantId: grading.etudiantId,
    enseignantId: grading.enseignantId,
    attempts: grading.attempts,
    error: grading.lastError,
    occurredAt: new Date().toISOString(),
  });
}

module.exports = { publish, publishGradingCompleted, publishResultPublished, publishGradingFailed };
