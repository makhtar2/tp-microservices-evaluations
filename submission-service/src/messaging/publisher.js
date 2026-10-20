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

// Refus automatique d'une copie hors délai (règle métier 2) : permet à
// notification-service de prévenir l'étudiant de l'échec du dépôt.
function publishSubmissionRejected(submission, motif) {
  return publish("submission.rejected", {
    submissionId: submission.id,
    assessmentId: submission.assessmentId,
    etudiantId: submission.etudiantId,
    motif,
    occurredAt: new Date().toISOString(),
  });
}

// Resoumission autorisée par l'enseignant (règle métier 3) : grading-service
// abandonne la correction en cours, notification-service prévient l'étudiant.
function publishSubmissionReopened(submission, dateLimite) {
  return publish("submission.reopened", {
    submissionId: submission.id,
    assessmentId: submission.assessmentId,
    etudiantId: submission.etudiantId,
    dateLimite: dateLimite || null,
    motif: submission.resoumission?.motif || null,
    occurredAt: new Date().toISOString(),
  });
}

module.exports = { publish, publishSubmissionCompleted, publishSubmissionRejected, publishSubmissionReopened };
