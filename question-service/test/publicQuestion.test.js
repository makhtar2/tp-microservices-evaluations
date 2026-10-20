const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const Question = require("../src/models/Question");
const { forRole } = require("../src/publicQuestion");

function question(fields) {
  return new Question({ statement: "?", subject: "S", chapter: "C", difficulty: "FACILE", points: 1, ...fields });
}

describe("forRole — vue étudiant d'une question", () => {
  it("garde les options d'un QCM sans dire lesquelles sont correctes", () => {
    const q = question({
      type: "QCM",
      answers: [
        { text: "HTTP", isCorrect: true },
        { text: "FTP", isCorrect: false },
      ],
    });
    assert.deepEqual(forRole(q, "ETUDIANT").answers, [{ text: "HTTP" }, { text: "FTP" }]);
  });

  it("retire la réponse d'un vrai/faux et les réponses acceptées d'une question courte", () => {
    const vf = forRole(question({ type: "VRAI_FAUX", answers: { correctAnswer: true } }), "ETUDIANT");
    const courte = forRole(question({ type: "QUESTION_COURTE", answers: { acceptedAnswers: ["RabbitMQ"] } }), "ETUDIANT");
    assert.equal(vf.answers, undefined);
    assert.equal(courte.answers, undefined);
  });

  it("retire le guide de correction", () => {
    const q = forRole(question({ type: "QUESTION_OUVERTE", correction: "Compensation" }), "ETUDIANT");
    assert.equal(q.correction, undefined);
    assert.equal(q.statement, "?");
  });

  it("ne modifie pas la question d'origine", () => {
    const q = question({ type: "VRAI_FAUX", answers: { correctAnswer: true } });
    forRole(q, "ETUDIANT");
    assert.deepEqual(q.answers, { correctAnswer: true });
  });

  it("renvoie la question complète aux enseignants et aux appels internes", () => {
    const q = question({ type: "VRAI_FAUX", answers: { correctAnswer: true }, correction: "x" });
    for (const role of ["ENSEIGNANT", "ADMINISTRATEUR", undefined]) {
      assert.equal(forRole(q, role), q, String(role));
    }
  });
});
