const { getChannel, EXCHANGE } = require("./connection");
const OpenAssessment = require("../models/OpenAssessment");
const { recordGradingIncident, clearGradingIncident } = require("../commands");

const QUEUE = "submission-service.assessment-events";
const DEAD_LETTER_QUEUE = `${QUEUE}.dead-letters`;
const ROUTING_KEYS = ["assessment.published", "grading.failed", "grading.completed"];

// AssessmentPublished tient à jour la liste locale des évaluations ouvertes
// (titre, période) : submission-service n'interroge jamais
// assessment-service en synchrone pour autoriser une copie.
// grading.failed / grading.completed : compensation de la Saga (incident de
// correction affiché sur la copie, puis effacé si la relance aboutit).
const HANDLERS = {
  "assessment.published": ({ assessmentId, titre, matiere, dateDebut, dateFin }) =>
    OpenAssessment.findByIdAndUpdate(
      assessmentId,
      { titre, matiere, dateDebut, dateFin, publishedAt: new Date() },
      { upsert: true }
    ),
  "grading.failed": recordGradingIncident,
  "grading.completed": clearGradingIncident,
};

function handleEvent(routingKey, payload) {
  const handler = HANDLERS[routingKey];
  return handler ? handler(payload) : null;
}

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
        await handleEvent(msg.fields.routingKey, JSON.parse(msg.content.toString()));
        channel.ack(msg);
      } catch (err) {
        console.error("[submission-service] Erreur de traitement d'un événement entrant :", err.message);
        channel.sendToQueue(DEAD_LETTER_QUEUE, msg.content, {
          persistent: true,
          contentType: "application/json",
          headers: { "x-routing-key": msg.fields.routingKey, "x-error": err.message, "x-failed-at": new Date().toISOString() },
        });
        channel.ack(msg);
      }
    });

    console.log(`[submission-service] Abonné à ${ROUTING_KEYS.join(", ")} sur "${EXCHANGE}"`);
  } catch (err) {
    console.warn("[submission-service] Broker indisponible, consommation des événements désactivée :", err.message);
  }
}

module.exports = { startConsumer, handleEvent, ROUTING_KEYS };
