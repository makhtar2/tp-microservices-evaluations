const { getChannel, EXCHANGE } = require("./connection");
const { gradeSubmission } = require("../commands");

const QUEUE = "grading-service.submission-events";
const ROUTING_KEYS = ["submission.completed"];

// Consomme SubmissionCompleted (étape 1 de la Saga Soumission →
// Correction → Notification). Payload attendu :
// { submissionId, assessmentId, etudiantId, reponses: [{ questionId, reponse }] }.
async function startConsumer() {
  try {
    const channel = await getChannel();
    await channel.assertQueue(QUEUE, { durable: true });
    for (const routingKey of ROUTING_KEYS) {
      await channel.bindQueue(QUEUE, EXCHANGE, routingKey);
    }

    channel.consume(QUEUE, async (msg) => {
      if (!msg) return;
      try {
        await gradeSubmission(JSON.parse(msg.content.toString()));
        channel.ack(msg);
      } catch (err) {
        console.error("[grading-service] Erreur de traitement d'un événement entrant :", err.message);
        channel.nack(msg, false, false);
      }
    });

    console.log(`[grading-service] Abonné à ${ROUTING_KEYS.join(", ")} sur "${EXCHANGE}"`);
  } catch (err) {
    console.warn("[grading-service] Broker indisponible, consommation des événements désactivée :", err.message);
  }
}

module.exports = { startConsumer };
