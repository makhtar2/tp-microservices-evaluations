const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { gradeAnswer } = require("../src/autoGrader");

const qcm = {
  type: "QCM",
  points: 4,
  answers: [
    { text: "Paris", isCorrect: true },
    { text: "Lyon", isCorrect: false },
    { text: "Marseille", isCorrect: false },
  ],
};

const qcmMultiple = {
  type: "QCM",
  points: 3,
  answers: [
    { text: "REST", isCorrect: true },
    { text: "gRPC", isCorrect: true },
    { text: "FTP", isCorrect: false },
  ],
};

describe("gradeAnswer — QCM", () => {
  it("donne tous les points pour la bonne option", () => {
    assert.equal(gradeAnswer(qcm, "Paris"), 4);
  });

  it("donne 0 pour une mauvaise option", () => {
    assert.equal(gradeAnswer(qcm, "Lyon"), 0);
  });

  it("ignore la casse, les accents et les espaces", () => {
    const question = { ...qcm, answers: [{ text: "Évaluation", isCorrect: true }] };
    assert.equal(gradeAnswer(question, "  evaluation "), 4);
  });

  it("accepte plusieurs options séparées par | dans n'importe quel ordre", () => {
    assert.equal(gradeAnswer(qcmMultiple, "gRPC|REST"), 3);
  });

  it("est tout ou rien : une option correcte manquante donne 0", () => {
    assert.equal(gradeAnswer(qcmMultiple, "REST"), 0);
  });

  it("est tout ou rien : une option incorrecte en plus donne 0", () => {
    assert.equal(gradeAnswer(qcmMultiple, "REST|gRPC|FTP"), 0);
  });

  it("donne 0 sans réponse", () => {
    assert.equal(gradeAnswer(qcm, undefined), 0);
    assert.equal(gradeAnswer(qcm, ""), 0);
  });

  it("donne 0 si aucune option n'est marquée correcte", () => {
    const question = { ...qcm, answers: [{ text: "A", isCorrect: false }] };
    assert.equal(gradeAnswer(question, ""), 0);
  });
});

describe("gradeAnswer — VRAI_FAUX", () => {
  const vrai = { type: "VRAI_FAUX", points: 2, answers: { correctAnswer: true } };
  const faux = { type: "VRAI_FAUX", points: 2, answers: { correctAnswer: false } };

  it("accepte les différentes écritures de vrai", () => {
    for (const reponse of ["true", "vrai", "Vrai", "V", "1"]) {
      assert.equal(gradeAnswer(vrai, reponse), 2, reponse);
    }
  });

  it("accepte les différentes écritures de faux", () => {
    for (const reponse of ["false", "faux", "FAUX", "f", "0"]) {
      assert.equal(gradeAnswer(faux, reponse), 2, reponse);
    }
  });

  it("donne 0 pour la réponse inverse", () => {
    assert.equal(gradeAnswer(vrai, "faux"), 0);
    assert.equal(gradeAnswer(faux, "vrai"), 0);
  });

  it("donne 0 pour une valeur non reconnue", () => {
    assert.equal(gradeAnswer(vrai, "peut-être"), 0);
    assert.equal(gradeAnswer(faux, undefined), 0);
  });
});

describe("gradeAnswer — QUESTION_COURTE", () => {
  const question = {
    type: "QUESTION_COURTE",
    points: 1,
    answers: { acceptedAnswers: ["RabbitMQ", "Rabbit MQ"] },
  };

  it("accepte chacune des réponses attendues", () => {
    assert.equal(gradeAnswer(question, "RabbitMQ"), 1);
    assert.equal(gradeAnswer(question, "Rabbit MQ"), 1);
  });

  it("ignore la casse et les espaces autour", () => {
    assert.equal(gradeAnswer(question, "  rabbitmq "), 1);
  });

  it("donne 0 pour une autre réponse", () => {
    assert.equal(gradeAnswer(question, "Kafka"), 0);
  });

  it("donne 0 si aucune réponse acceptée n'est définie", () => {
    assert.equal(gradeAnswer({ type: "QUESTION_COURTE", points: 1, answers: {} }, "x"), 0);
  });
});

describe("gradeAnswer — QUESTION_OUVERTE", () => {
  it("renvoie null : la question exige une correction manuelle", () => {
    assert.equal(gradeAnswer({ type: "QUESTION_OUVERTE", points: 5 }, "Une longue réponse"), null);
  });
});
