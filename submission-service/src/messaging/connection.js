const amqp = require("amqplib");

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";
const EXCHANGE = "evaluations.events";

let channelPromise = null;

// Même convention qu'assessment-service (voir docs/architecture.md) :
// connexion paresseuse et tolérante, le REST reste disponible si le
// broker ne l'est pas.
async function getChannel() {
  if (!channelPromise) {
    channelPromise = (async () => {
      const connection = await amqp.connect(RABBITMQ_URL);
      const channel = await connection.createChannel();
      await channel.assertExchange(EXCHANGE, "topic", { durable: true });
      return channel;
    })().catch((err) => {
      channelPromise = null;
      throw err;
    });
  }
  return channelPromise;
}

module.exports = { getChannel, EXCHANGE, RABBITMQ_URL };
