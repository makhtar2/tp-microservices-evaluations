// Règle métier 3 : un étudiant ne soumet qu'une fois, sauf resoumission
// autorisée par l'enseignant responsable (POST /api/submissions/:id/reopen).
const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const { ACCOUNTS, login, createAndLogin, openSubmission, waitForGrading, eventually, sleep } = require("../lib/api");
const { MINUTE, uniqueSubject, createQuestionBank, perfectAnswers, createPublishedAssessment } = require("../lib/fixtures");

describe("Resoumission autorisée par l'enseignant", () => {
  let admin;
  let enseignant;
  let autreEnseignant;
  let etudiant;
  let bank;
  let autoBank; // sans question ouverte : la copie peut être validée aussitôt

  before(async () => {
    admin = await login(ACCOUNTS.admin);
    enseignant = await login(ACCOUNTS.enseignant);
    etudiant = await login(ACCOUNTS.etudiant);
    autreEnseignant = await createAndLogin(admin, { role: "ENSEIGNANT", prefix: "enseignant-resoumission" });
    bank = await createQuestionBank(enseignant, uniqueSubject("resoumission"));
    const { ouverte, ...auto } = bank;
    assert.ok(ouverte);
    autoBank = auto;
  });

  async function copieSoumise(questions, reponses) {
    const assessment = await createPublishedAssessment(enseignant, questions, { titre: "Resoumission" });
    const copie = (await openSubmission(etudiant, assessment._id)).body;
    assert.equal((await etudiant.put(`/api/submissions/${copie.id}/answers`, { reponses })).status, 200);
    assert.equal((await etudiant.post(`/api/submissions/${copie.id}/submit`)).status, 200);
    return copie;
  }

  it("seul l'enseignant responsable rouvre la copie, qui est corrigée à nouveau", async () => {
    const copie = await copieSoumise(bank, [{ questionId: bank.qcm._id, reponse: "FTP" }]);
    const premiere = await waitForGrading(enseignant, copie.id);
    assert.equal(premiere.notes.find((n) => n.questionId === bank.qcm._id).note, 0);

    // Une seule soumission sans autorisation.
    assert.equal((await etudiant.post(`/api/submissions/${copie.id}/submit`)).status, 409);
    for (const intrus of [etudiant, admin, autreEnseignant]) {
      assert.equal((await intrus.post(`/api/submissions/${copie.id}/reopen`, {})).status, 403, intrus.user.role);
    }

    const res = await enseignant.post(`/api/submissions/${copie.id}/reopen`, { motif: "Erreur de manipulation" });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.status, "EN_COURS");
    assert.equal(res.body.resoumission.autoriseePar, enseignant.user.id);
    assert.equal(res.body.resoumission.motif, "Erreur de manipulation");

    // grading-service abandonne la correction en cours (submission.reopened).
    await eventually("Correction abandonnée", async () => {
      const r = await enseignant.get(`/api/gradings/${copie.id}`);
      return { done: r.status === 404, value: r.status };
    });

    assert.equal((await etudiant.put(`/api/submissions/${copie.id}/answers`, { reponses: perfectAnswers(bank) })).status, 200);
    assert.equal((await etudiant.post(`/api/submissions/${copie.id}/submit`)).status, 200);
    const seconde = await waitForGrading(enseignant, copie.id);
    assert.equal(seconde.notes.find((n) => n.questionId === bank.qcm._id).note, bank.qcm.points);
  });

  it("rouvre une copie refusée hors délai avec une nouvelle date limite", async () => {
    const dateFin = new Date(Date.now() + 4000).toISOString();
    const assessment = await createPublishedAssessment(enseignant, bank, { titre: "Rendue en retard", dateFin });
    const copie = (await openSubmission(etudiant, assessment._id)).body;
    assert.equal(copie.status, "EN_COURS");
    await sleep(Math.max(new Date(dateFin) - Date.now(), 0) + 500);

    assert.equal((await etudiant.post(`/api/submissions/${copie.id}/submit`)).status, 409);
    assert.equal((await etudiant.get(`/api/submissions/${copie.id}`)).body.status, "REFUSEE_HORS_DELAI");

    // L'évaluation est terminée : une nouvelle date limite est obligatoire.
    const sansDate = await enseignant.post(`/api/submissions/${copie.id}/reopen`, {});
    assert.equal(sansDate.status, 400);
    assert.match(sansDate.body.message, /dateLimite/);

    const dateLimite = new Date(Date.now() + 10 * MINUTE).toISOString();
    const res = await enseignant.post(`/api/submissions/${copie.id}/reopen`, { dateLimite });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.resoumission.dateLimite, dateLimite);

    const soumise = await etudiant.post(`/api/submissions/${copie.id}/submit`);
    assert.equal(soumise.status, 200, JSON.stringify(soumise.body));
    assert.equal(soumise.body.status, "SOUMISE");
  });

  it("refuse de rouvrir une copie dont le résultat est publié", async () => {
    const copie = await copieSoumise(autoBank, perfectAnswers(bank).filter((r) => r.questionId !== bank.ouverte._id));
    await waitForGrading(enseignant, copie.id);
    assert.equal((await enseignant.post(`/api/gradings/${copie.id}/validate`)).status, 200);

    // submission-service apprend la publication par result.published.
    await eventually("Résultat publié reçu", async () => {
      const r = await etudiant.get(`/api/submissions/${copie.id}`);
      return { done: Boolean(r.body.resultatPublieAt), value: r.body };
    });
    const res = await enseignant.post(`/api/submissions/${copie.id}/reopen`, {});
    assert.equal(res.status, 409);
    assert.match(res.body.message, /résultat/);
  });
});
