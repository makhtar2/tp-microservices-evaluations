const { getChannel, EXCHANGE } = require("./connection");
const OpenAssessment = require("../models/OpenAssessment");

const QUEUE = "submission-service.assessment-events";
const ROUTING_KEYS = ["assessment.published"];

// Consomme AssessmentPublished pour tenir à jour la liste locale des
// évaluations ouvertes (titre, période). submission-service n'interroge
// jamais assessment-service en synchrone pour autoriser une copie.
// Payload attendu : { assessmentId, titre, matiere, dateDebut, dateFin }.
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
        const { assessmentId, titre, matiere, dateDebut, dateFin } = JSON.parse(msg.content.toString());
        await OpenAssessment.findByIdAndUpdate(
          assessmentId,
          { titre, matiere, dateDebut, dateFin, publishedAt: new Date() },
          { upsert: true }
        );
        channel.ack(msg);
      } catch (err) {
        console.error("[submission-service] Erreur de traitement d'un événement entrant :", err.message);
        channel.nack(msg, false, false);
      }
    });

    console.log(`[submission-service] Abonné à ${ROUTING_KEYS.join(", ")} sur "${EXCHANGE}"`);
  } catch (err) {
    console.warn("[submission-service] Broker indisponible, consommation des événements désactivée :", err.message);
  }
}

module.exports = { startConsumer };
