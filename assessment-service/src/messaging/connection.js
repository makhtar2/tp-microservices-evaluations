const amqp = require("amqplib");

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";
const EXCHANGE = "evaluations.events";

let channelPromise = null;

// Connexion paresseuse et tolérante : si le broker n'est pas disponible
// (ex. RabbitMQ pas encore démarré par l'équipe), les commandes REST
// restent utilisables — seule la publication/consommation d'événements
// est indisponible, avec un avertissement en log plutôt qu'un crash.
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
