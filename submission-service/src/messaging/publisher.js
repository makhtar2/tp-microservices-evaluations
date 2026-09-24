const { getChannel, EXCHANGE } = require("./connection");

async function publish(routingKey, payload) {
  try {
    const channel = await getChannel();
    channel.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(payload)), {
      contentType: "application/json",
      persistent: true,
    });
  } catch (err) {
    console.error(`[submission-service] Publication de "${routingKey}" impossible (broker indisponible) :`, err.message);
  }
}

// Les réponses sont incluses dans l'événement pour que grading-service
// puisse lancer la correction automatique sans rappeler submission-service.
function publishSubmissionCompleted(submission) {
  return publish("submission.completed", {
    submissionId: submission.id,
    assessmentId: submission.assessmentId,
    etudiantId: submission.etudiantId,
    reponses: submission.reponses,
    fichiers: submission.fichiers,
    soumiseAt: submission.soumiseAt,
    occurredAt: new Date().toISOString(),
  });
}

module.exports = { publish, publishSubmissionCompleted };
