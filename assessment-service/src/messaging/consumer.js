const { getChannel, EXCHANGE } = require("./connection");
const { recordEvent } = require("../projectionUpdater");

const QUEUE = "assessment-service.grading-events";
const ROUTING_KEYS = ["grading.completed", "result.published"];

// Consomme les événements publiés par grading-service pour alimenter le
// Read Model d'assessment-service (voir docs/architecture.md). Payload
// attendu : { assessmentId, etudiantId, note?, commentaire?, scoreTotal? }.
// Non bloquant : si le broker est indisponible, le service REST continue
// de fonctionner, seule l'alimentation du Read Model via événements est
// suspendue jusqu'au prochain redémarrage/reconnexion.
async function startConsumer() {
  try {
    const channel = await getChannel();
    await channel.assertQueue(QUEUE, { durable: true });
    // Un message à la fois : recordEvent lit puis réécrit le Read Model ;
    // traités en parallèle, GradingCompleted et ResultPublished d'une même
    // copie s'écrasaient (le résultat publié disparaissait du Read Model).
    await channel.prefetch(1);
    for (const routingKey of ROUTING_KEYS) {
      await channel.bindQueue(QUEUE, EXCHANGE, routingKey);
    }

    channel.consume(QUEUE, async (msg) => {
      if (!msg) return;
      try {
        const payload = JSON.parse(msg.content.toString());
        const type = msg.fields.routingKey === "grading.completed" ? "GradingCompleted" : "ResultPublished";
        await recordEvent(payload.assessmentId, type, payload);
        channel.ack(msg);
      } catch (err) {
        console.error("[assessment-service] Erreur de traitement d'un événement entrant :", err.message);
        channel.nack(msg, false, false);
      }
    });

    console.log(`[assessment-service] Abonné à ${ROUTING_KEYS.join(", ")} sur "${EXCHANGE}"`);
  } catch (err) {
    console.warn("[assessment-service] Broker indisponible, consommation des événements désactivée :", err.message);
  }
}

module.exports = { startConsumer };
