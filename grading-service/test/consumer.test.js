const { describe, it, before, after, mock } = require("node:test");
const assert = require("node:assert/strict");
const amqp = require("amqplib");
const { startConsumer } = require("../src/messaging/consumer");

// Canal RabbitMQ simulé : on récupère la fonction passée à consume() pour
// lui envoyer des messages, et on enregistre acks et envois en dead-letter.
const queues = [];
const bindings = [];
const acked = [];
const deadLetters = [];
let onMessage;

const channel = {
  assertExchange: async () => {},
  assertQueue: async (name, options) => queues.push({ name, options }),
  bindQueue: async (queue, exchange, key) => bindings.push(key),
  consume: (queue, fn) => {
    onMessage = fn;
  },
  ack: (msg) => acked.push(msg),
  nack: () => assert.fail("un message en échec ne doit plus être rejeté sans être conservé"),
  sendToQueue: (queue, content, options) => deadLetters.push({ queue, content: content.toString(), options }),
};

before(async () => {
  mock.method(console, "log", () => {});
  mock.method(console, "error", () => {});
  mock.method(amqp, "connect", async () => ({ createChannel: async () => channel }));
  await startConsumer();
});

after(() => mock.restoreAll());

describe("consumer grading-service", () => {
  it("déclare sa queue et sa queue de dead-letters, durables", () => {
    assert.deepEqual(
      queues.map((q) => [q.name, q.options.durable]),
      [
        ["grading-service.submission-events", true],
        ["grading-service.submission-events.dead-letters", true],
      ]
    );
    assert.deepEqual(bindings, ["submission.completed", "submission.reopened"]);
  });

  it("conserve un message illisible en dead-letter avec l'erreur, puis l'acquitte", async () => {
    const msg = { content: Buffer.from("{pas du json"), fields: { routingKey: "submission.completed" } };
    await onMessage(msg);

    assert.equal(deadLetters.length, 1);
    const [dl] = deadLetters;
    assert.equal(dl.queue, "grading-service.submission-events.dead-letters");
    assert.equal(dl.content, "{pas du json");
    assert.equal(dl.options.persistent, true);
    assert.equal(dl.options.headers["x-routing-key"], "submission.completed");
    assert.ok(dl.options.headers["x-error"]);
    assert.deepEqual(acked, [msg]);
  });
});
