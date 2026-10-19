const { getChannel, EXCHANGE } = require("./connection");
const Notification = require("../models/Notification");
const { ROUTING_KEYS, buildNotifications } = require("../templates");

const QUEUE = "notification-service.all-events";
const DEAD_LETTER_QUEUE = `${QUEUE}.dead-letters`;

// Dernière étape de la Saga : réagit aux 5 événements métier. L'envoi
// réel (email, push) est simulé par un log ; les notifications sont
// conservées en base pour consultation ultérieure.
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
        const notifications = buildNotifications(msg.fields.routingKey, JSON.parse(msg.content.toString()));
        await Notification.insertMany(notifications);
        for (const n of notifications) {
          console.log(`[notification-service] → ${n.userId || `tous les ${n.role}`} : ${n.titre} — ${n.message}`);
        }
        channel.ack(msg);
      } catch (err) {
        console.error("[notification-service] Erreur de traitement d'un événement entrant :", err.message);
        channel.sendToQueue(DEAD_LETTER_QUEUE, msg.content, {
          persistent: true,
          contentType: "application/json",
          headers: { "x-routing-key": msg.fields.routingKey, "x-error": err.message, "x-failed-at": new Date().toISOString() },
        });
        channel.ack(msg);
      }
    });

    console.log(`[notification-service] Abonné à ${ROUTING_KEYS.join(", ")} sur "${EXCHANGE}"`);
  } catch (err) {
    console.warn("[notification-service] Broker indisponible, consommation des événements désactivée :", err.message);
  }
}

module.exports = { startConsumer };
