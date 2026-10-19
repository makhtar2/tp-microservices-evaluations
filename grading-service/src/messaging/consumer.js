const { getChannel, EXCHANGE } = require("./connection");
const { gradeSubmission } = require("../commands");

const QUEUE = "grading-service.submission-events";
const DEAD_LETTER_QUEUE = `${QUEUE}.dead-letters`;
const ROUTING_KEYS = ["submission.completed"];

// Consomme SubmissionCompleted (étape 1 de la Saga Soumission →
// Correction → Notification). Payload attendu :
// { submissionId, assessmentId, etudiantId, reponses: [{ questionId, reponse }] }.
async function startConsumer() {
  try {
    const channel = await getChannel();
    await channel.assertQueue(QUEUE, { durable: true });
    // Les messages dont le traitement échoue y sont conservés (avec l'erreur)
    // pour inspection et rejeu depuis l'interface RabbitMQ, au lieu d'être perdus.
    await channel.assertQueue(DEAD_LETTER_QUEUE, { durable: true });
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
        channel.sendToQueue(DEAD_LETTER_QUEUE, msg.content, {
          persistent: true,
          contentType: "application/json",
          headers: { "x-routing-key": msg.fields.routingKey, "x-error": err.message, "x-failed-at": new Date().toISOString() },
        });
        channel.ack(msg);
      }
    });

    console.log(`[grading-service] Abonné à ${ROUTING_KEYS.join(", ")} sur "${EXCHANGE}"`);
  } catch (err) {
    console.warn("[grading-service] Broker indisponible, consommation des événements désactivée :", err.message);
  }
}

module.exports = { startConsumer };
