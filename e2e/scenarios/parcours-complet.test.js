// Parcours nominal complet, à travers l'api-gateway :
// création → publication → soumission → correction → résultat.
const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const { ACCOUNTS, login, openSubmission, waitForGrading, eventually } = require("../lib/api");
const { uniqueSubject, createQuestionBank, totalPoints, perfectAnswers } = require("../lib/fixtures");

describe("Parcours complet d'une évaluation", () => {
  let enseignant;
  let etudiant;
  let bank;
  let assessment;
  let submission;
  const NOTE_OUVERTE = 4;

  before(async () => {
    enseignant = await login(ACCOUNTS.enseignant);
    etudiant = await login(ACCOUNTS.etudiant);
  });

  it("1. l'enseignant alimente la banque de questions (un étudiant ne le peut pas)", async () => {
    const subject = uniqueSubject("parcours");
    bank = await createQuestionBank(enseignant, subject);

    const res = await enseignant.get(`/api/questions?subject=${encodeURIComponent(subject)}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 4);

    const refus = await etudiant.post("/api/questions", { statement: "x", type: "QCM", subject, chapter: "x", difficulty: "FACILE", points: 1 });
    assert.equal(refus.status, 403);
  });

  it("2. l'enseignant crée l'évaluation par génération automatique (gRPC vers question-service)", async () => {
    const now = Date.now();
    const res = await enseignant.post("/api/assessments", {
      titre: "Parcours E2E",
      enseignantId: enseignant.user.id,
      matiere: bank.qcm.subject,
      generationAuto: {
        matiere: bank.qcm.subject,
        nombre: 4,
        repartitionDifficulte: { facile: 50, moyen: 25, difficile: 25 },
      },
      dateDebut: new Date(now - 60000).toISOString(),
      dateFin: new Date(now + 3600000).toISOString(),
      duree: 60,
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assessment = res.body;

    assert.equal(assessment.status, "BROUILLON");
    assert.deepEqual(
      [...assessment.questionIds].sort(),
      Object.values(bank).map((q) => q._id).sort(),
      "les 4 questions de la matière sont sélectionnées"
    );
    assert.equal(assessment.bareme, totalPoints(bank), "barème = somme des points des questions tirées");
  });

  it("3. un étudiant ne peut pas encore ouvrir de copie (évaluation non publiée)", async () => {
    const res = await etudiant.post("/api/submissions", { assessmentId: assessment._id, etudiantId: etudiant.user.id });
    assert.equal(res.status, 409);
    assert.equal(res.body.message, "Évaluation non publiée");
  });

  it("4. l'enseignant publie l'évaluation", async () => {
    const res = await enseignant.post(`/api/assessments/${assessment._id}/publish`);
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "PUBLIEE");

    const again = await enseignant.post(`/api/assessments/${assessment._id}/publish`);
    assert.equal(again.status, 409, "une évaluation ne se publie qu'une fois");
  });

  it("5. l'étudiant ouvre sa copie (AssessmentPublished reçu par submission-service)", async () => {
    const res = await openSubmission(etudiant, assessment._id);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    submission = res.body;
    assert.equal(submission.status, "EN_COURS");
    assert.equal(submission.etudiantId, etudiant.user.id);

    const doublon = await etudiant.post("/api/submissions", { assessmentId: assessment._id, etudiantId: etudiant.user.id });
    assert.equal(doublon.status, 409, "une seule copie par étudiant et par évaluation");
  });

  it("6. l'étudiant répond (sauvegarde automatique en plusieurs fois) et dépose un fichier", async () => {
    const [qcm, vraiFaux, courte, ouverte] = perfectAnswers(bank);

    let res = await etudiant.put(`/api/submissions/${submission.id}/answers`, { reponses: [qcm, { ...vraiFaux, reponse: "faux" }] });
    assert.equal(res.status, 200);
    // La seconde sauvegarde corrige une réponse et en ajoute d'autres sans perdre la première.
    res = await etudiant.put(`/api/submissions/${submission.id}/answers`, { reponses: [vraiFaux, courte, ouverte] });
    assert.equal(res.status, 200);
    assert.equal(res.body.reponses.length, 4);
    assert.equal(res.body.reponses.find((r) => r.questionId === bank.vraiFaux._id).reponse, "Vrai");

    const form = new FormData();
    form.append("file", new Blob(["annexe de la copie"], { type: "text/plain" }), "annexe.txt");
    const upload = await etudiant.upload(`/api/submissions/${submission.id}/files`, form);
    assert.equal(upload.status, 201, JSON.stringify(upload.body));
    assert.equal(upload.body.nomFichier, "annexe.txt");

    const fichier = await etudiant.get(`/api${upload.body.url}`);
    assert.equal(fichier.status, 200);
    assert.equal(fichier.body, "annexe de la copie");
  });

  it("7. l'étudiant soumet sa copie, qui n'est ensuite plus modifiable", async () => {
    const res = await etudiant.post(`/api/submissions/${submission.id}/submit`);
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "SOUMISE");
    assert.ok(res.body.soumiseAt);

    const resoumission = await etudiant.post(`/api/submissions/${submission.id}/submit`);
    assert.equal(resoumission.status, 409);
    const modification = await etudiant.put(`/api/submissions/${submission.id}/answers`, { reponses: [perfectAnswers(bank)[0]] });
    assert.equal(modification.status, 409);
  });

  it("8. grading-service corrige automatiquement (SubmissionCompleted), la question ouverte attend l'enseignant", async () => {
    const grading = await waitForGrading(enseignant, submission.id);

    assert.equal(grading.status, "CORRECTION_AUTO_PARTIELLE");
    assert.equal(grading.enseignantId, enseignant.user.id);
    const note = (q) => grading.notes.find((n) => n.questionId === q._id);
    assert.equal(note(bank.qcm).note, bank.qcm.points);
    assert.equal(note(bank.vraiFaux).note, bank.vraiFaux.points);
    assert.equal(note(bank.courte).note, bank.courte.points);
    assert.equal(note(bank.ouverte).note, null);
    assert.equal(grading.scoreTotal, totalPoints(bank) - bank.ouverte.points);

    const pending = await enseignant.get(`/api/gradings/pending?assessmentId=${assessment._id}`);
    assert.deepEqual(pending.body.map((g) => g.submissionId), [submission.id]);
  });

  it("9. aucun résultat n'est visible tant que la correction n'est pas validée", async () => {
    const res = await etudiant.get(`/api/assessments/${assessment._id}/results`);
    assert.equal(res.status, 200);
    assert.equal(res.body.nombreSoumissions, 0);
    assert.deepEqual(res.body.resultatsEtudiants, []);
  });

  it("10. l'enseignant corrige la question ouverte puis valide", async () => {
    const res = await enseignant.put(`/api/gradings/${submission.id}/questions/${bank.ouverte._id}`, {
      note: NOTE_OUVERTE,
      commentaire: "Bonne réponse, manque un exemple.",
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.status, "EN_CORRECTION_MANUELLE");

    const validation = await enseignant.post(`/api/gradings/${submission.id}/validate`);
    assert.equal(validation.status, 200);
    assert.equal(validation.body.status, "VALIDEE");
    assert.equal(validation.body.scoreTotal, totalPoints(bank) - bank.ouverte.points + NOTE_OUVERTE);

    const retouche = await enseignant.put(`/api/gradings/${submission.id}/questions/${bank.ouverte._id}`, { note: 5 });
    assert.equal(retouche.status, 409, "une correction validée n'est plus modifiable");
  });

  it("11. le résultat est publié dans le Read Model d'assessment-service (ResultPublished)", async () => {
    const expected = totalPoints(bank) - bank.ouverte.points + NOTE_OUVERTE;
    const results = await eventually("Publication du résultat", async () => {
      const res = await etudiant.get(`/api/assessments/${assessment._id}/results`);
      return { done: res.body?.nombreSoumissions === 1, value: res.body };
    });

    assert.equal(results.moyenne, expected);
    assert.deepEqual(results.resultatsEtudiants, [
      { etudiantId: etudiant.user.id, note: expected, resultPublished: true },
    ]);

    const detail = await enseignant.get(`/api/assessments/${assessment._id}`);
    assert.equal(detail.body.status, "CORRIGEE");
  });

  it("12. le Read Model se reconstruit à l'identique depuis l'Event Store", async () => {
    const before = await enseignant.get(`/api/assessments/${assessment._id}`);
    const rebuilt = await enseignant.post(`/api/assessments/${assessment._id}/rebuild`);
    assert.equal(rebuilt.status, 200);

    for (const field of ["status", "bareme", "questionIds", "resultatsEtudiants"]) {
      assert.deepEqual(rebuilt.body[field], before.body[field], field);
    }
  });
});
