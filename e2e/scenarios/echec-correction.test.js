// Scénarios d'échec de la correction : question ouverte jamais corrigée,
// correction refusée (note invalide, mauvais enseignant, étudiant), et
// correction automatique impossible parce que question-service est tombé.
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { ACCOUNTS, login, createAndLogin, openSubmission, waitForGrading, sleep } = require("../lib/api");
const { uniqueSubject, createQuestionBank, totalPoints, perfectAnswers, createPublishedAssessment } = require("../lib/fixtures");
const { startService, stopService } = require("../lib/stack");

// Ouvre, remplit et soumet une copie parfaite ; renvoie la copie soumise.
async function submitPerfectCopy(etudiant, assessment, bank) {
  const copie = (await openSubmission(etudiant, assessment._id)).body;
  assert.equal(copie.status, "EN_COURS", JSON.stringify(copie));
  await etudiant.put(`/api/submissions/${copie.id}/answers`, { reponses: perfectAnswers(bank) });
  const res = await etudiant.post(`/api/submissions/${copie.id}/submit`);
  assert.equal(res.status, 200);
  return res.body;
}

describe("Échec : correction manquante", () => {
  let admin;
  let enseignant;
  let etudiant;

  before(async () => {
    admin = await login(ACCOUNTS.admin);
    enseignant = await login(ACCOUNTS.enseignant);
    etudiant = await login(ACCOUNTS.etudiant);
  });

  describe("question ouverte non corrigée", () => {
    let bank;
    let assessment;
    let copie;

    before(async () => {
      bank = await createQuestionBank(enseignant, uniqueSubject("correction-manquante"));
      assessment = await createPublishedAssessment(enseignant, bank);
      copie = await submitPerfectCopy(etudiant, assessment, bank);
      await waitForGrading(enseignant, copie.id);
    });

    it("la validation est refusée tant qu'une question n'a pas de note", async () => {
      const res = await enseignant.post(`/api/gradings/${copie.id}/validate`);
      assert.equal(res.status, 409);
      assert.equal(res.body.message, "Toutes les questions ne sont pas encore notées");

      const grading = await enseignant.get(`/api/gradings/${copie.id}`);
      assert.equal(grading.body.status, "CORRECTION_AUTO_PARTIELLE");
      assert.equal(grading.body.validatedAt, null);
    });

    it("la copie reste dans la liste des corrections en attente de l'enseignant", async () => {
      const res = await enseignant.get(`/api/gradings/pending?enseignantId=${enseignant.user.id}`);
      assert.ok(res.body.some((g) => g.submissionId === copie.id));
    });

    it("aucun résultat n'est publié pour l'étudiant", async () => {
      await sleep(500);
      const res = await etudiant.get(`/api/assessments/${assessment._id}/results`);
      assert.equal(res.body.nombreSoumissions, 0);
      const detail = await enseignant.get(`/api/assessments/${assessment._id}`);
      assert.equal(detail.body.status, "PUBLIEE");
    });

    it("une note hors barème est refusée et ne débloque pas la validation", async () => {
      const url = `/api/gradings/${copie.id}/questions/${bank.ouverte._id}`;
      for (const note of [-1, bank.ouverte.points + 1, "5"]) {
        const res = await enseignant.put(url, { note });
        assert.equal(res.status, 400, `note ${JSON.stringify(note)}`);
      }
      const inconnue = await enseignant.put(`/api/gradings/${copie.id}/questions/question-inexistante`, { note: 1 });
      assert.equal(inconnue.status, 404);

      const validation = await enseignant.post(`/api/gradings/${copie.id}/validate`);
      assert.equal(validation.status, 409);
    });

    it("seul l'enseignant responsable peut corriger ; un étudiant n'accède pas aux corrections", async () => {
      const autreEnseignant = await createAndLogin(admin, { role: "ENSEIGNANT", prefix: "autre-enseignant" });
      const url = `/api/gradings/${copie.id}/questions/${bank.ouverte._id}`;

      const res = await autreEnseignant.put(url, { note: 3 });
      assert.equal(res.status, 403);
      const validation = await autreEnseignant.post(`/api/gradings/${copie.id}/validate`);
      assert.equal(validation.status, 403);

      const parEtudiant = await etudiant.put(url, { note: 5 });
      assert.equal(parEtudiant.status, 403);
      const lecture = await etudiant.get(`/api/gradings/${copie.id}`);
      assert.equal(lecture.status, 403);
    });

    it("une fois la question corrigée, la validation publie enfin le résultat", async () => {
      const res = await enseignant.put(`/api/gradings/${copie.id}/questions/${bank.ouverte._id}`, { note: 0 });
      assert.equal(res.status, 200);
      const validation = await enseignant.post(`/api/gradings/${copie.id}/validate`);
      assert.equal(validation.status, 200);
      assert.equal(validation.body.scoreTotal, totalPoints(bank) - bank.ouverte.points);
    });
  });

  describe("question-service indisponible pendant la correction automatique", () => {
    let bank;
    let assessment;
    let copie;

    before(async () => {
      bank = await createQuestionBank(enseignant, uniqueSubject("service-indisponible"));
      assessment = await createPublishedAssessment(enseignant, bank);
      // La copie est ouverte et remplie normalement, puis question-service
      // tombe juste avant la soumission.
      const ouverte = (await openSubmission(etudiant, assessment._id)).body;
      await etudiant.put(`/api/submissions/${ouverte.id}/answers`, { reponses: perfectAnswers(bank) });
      await stopService("question-service");

      const res = await etudiant.post(`/api/submissions/${ouverte.id}/submit`);
      assert.equal(res.status, 200, "la soumission ne dépend pas de question-service");
      copie = res.body;
    });

    after(async () => {
      await startService("question-service");
    });

    it("la correction reste EN_ATTENTE avec l'erreur enregistrée, sans note", async () => {
      const grading = await waitForGrading(enseignant, copie.id);
      assert.equal(grading.status, "EN_ATTENTE");
      assert.ok(grading.lastError, "la cause de l'échec est conservée");
      assert.deepEqual(grading.notes, []);
      assert.equal(grading.scoreTotal, 0);
    });

    it("la copie reste soumise côté étudiant (pas de perte de la soumission)", async () => {
      const res = await etudiant.get(`/api/submissions/${copie.id}`);
      assert.equal(res.body.status, "SOUMISE");
      assert.equal(res.body.reponses.length, 4);
    });

    it("l'enseignant ne peut ni noter ni valider une copie non corrigée automatiquement", async () => {
      const note = await enseignant.put(`/api/gradings/${copie.id}/questions/${bank.ouverte._id}`, { note: 3 });
      assert.equal(note.status, 409);
      assert.equal(note.body.message, "La correction automatique n'a pas encore été effectuée");

      const validation = await enseignant.post(`/api/gradings/${copie.id}/validate`);
      assert.equal(validation.status, 409);
    });

    it("aucun résultat n'est publié", async () => {
      const res = await etudiant.get(`/api/assessments/${assessment._id}/results`);
      assert.equal(res.body.nombreSoumissions, 0);
    });
  });
});
