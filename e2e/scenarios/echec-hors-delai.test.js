// Scénarios d'échec liés aux dates de l'évaluation : copie ouverte trop
// tôt ou trop tard, dépôt de fichier et soumission après la date limite.
const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const { ACCOUNTS, login, createAndLogin, openSubmission, sleep } =require("../lib/api");
const { MINUTE, uniqueSubject, createQuestionBank, perfectAnswers, createPublishedAssessment } = require("../lib/fixtures");

// Marge laissée à l'étudiant pour ouvrir sa copie avant l'échéance.
const DELAI_MS = 5000;

describe("Échec : dépôt hors délai", () => {
  let admin;
  let enseignant;
  let etudiant;
  let bank;

  before(async () => {
    admin = await login(ACCOUNTS.admin);
    enseignant = await login(ACCOUNTS.enseignant);
    etudiant = await login(ACCOUNTS.etudiant);
    bank = await createQuestionBank(enseignant, uniqueSubject("hors-delai"));
  });

  it("refuse l'ouverture d'une copie avant la date de début", async () => {
    const assessment = await createPublishedAssessment(enseignant, bank, {
      dateDebut: new Date(Date.now() + 60 * MINUTE).toISOString(),
      dateFin: new Date(Date.now() + 120 * MINUTE).toISOString(),
    });

    const res = await openSubmission(etudiant, assessment._id);
    assert.equal(res.status, 409);
    assert.equal(res.body.message, "L'évaluation n'est pas encore ouverte");
  });

  it("refuse l'ouverture d'une copie après la date de fin", async () => {
    const assessment = await createPublishedAssessment(enseignant, bank, {
      dateDebut: new Date(Date.now() - 120 * MINUTE).toISOString(),
      dateFin: new Date(Date.now() - 60 * MINUTE).toISOString(),
    });

    const res = await openSubmission(etudiant, assessment._id);
    assert.equal(res.status, 409);
    assert.equal(res.body.message, "La date de fin de l'évaluation est dépassée");
  });

  describe("copie ouverte à temps mais rendue après la date limite", () => {
    let assessmentSoumission;
    let assessmentFichier;
    let copieSoumission;
    let copieFichier;
    let etudiant2;

    before(async () => {
      etudiant2 = await createAndLogin(admin, { role: "ETUDIANT", prefix: "etudiant-retard" });
      const dateFin = new Date(Date.now() + DELAI_MS).toISOString();
      assessmentSoumission = await createPublishedAssessment(enseignant, bank, { dateFin });
      assessmentFichier = await createPublishedAssessment(enseignant, bank, { dateFin });

      copieSoumission = (await openSubmission(etudiant, assessmentSoumission._id)).body;
      copieFichier = (await openSubmission(etudiant2, assessmentFichier._id)).body;
      assert.equal(copieSoumission.status, "EN_COURS");
      assert.equal(copieFichier.status, "EN_COURS");

      // Réponses enregistrées dans les temps.
      const res = await etudiant.put(`/api/submissions/${copieSoumission.id}/answers`, { reponses: perfectAnswers(bank) });
      assert.equal(res.status, 200);

      await sleep(Math.max(new Date(dateFin) - Date.now(), 0) + 500);
    });

    it("la soumission est refusée et la copie passe en REFUSEE_HORS_DELAI", async () => {
      const res = await etudiant.post(`/api/submissions/${copieSoumission.id}/submit`);
      assert.equal(res.status, 409);
      assert.equal(res.body.message, "Date limite dépassée : la copie est refusée");

      const copie = await etudiant.get(`/api/submissions/${copieSoumission.id}`);
      assert.equal(copie.body.status, "REFUSEE_HORS_DELAI");
      assert.equal(copie.body.soumiseAt, null);
      assert.equal(copie.body.reponses.length, 4, "les réponses enregistrées à temps sont conservées");
    });

    it("la copie refusée ne peut plus être modifiée ni soumise", async () => {
      const modification = await etudiant.put(`/api/submissions/${copieSoumission.id}/answers`, {
        reponses: [perfectAnswers(bank)[0]],
      });
      assert.equal(modification.status, 409);
      assert.match(modification.body.message, /REFUSEE_HORS_DELAI/);

      const resoumission = await etudiant.post(`/api/submissions/${copieSoumission.id}/submit`);
      assert.equal(resoumission.status, 409);
    });

    it("aucune correction n'est déclenchée pour une copie refusée", async () => {
      // SubmissionCompleted n'est jamais publié : grading-service ne crée rien.
      await sleep(1000);
      const res = await enseignant.get(`/api/gradings/${copieSoumission.id}`);
      assert.equal(res.status, 404);
    });

    it("le dépôt de fichier après la date limite est refusé et le fichier n'est pas conservé", async () => {
      const form = new FormData();
      form.append("file", new Blob(["trop tard"], { type: "text/plain" }), "retard.txt");
      const res = await etudiant2.upload(`/api/submissions/${copieFichier.id}/files`, form);
      assert.equal(res.status, 409);
      assert.equal(res.body.message, "Date limite dépassée : la copie est refusée");

      const copie = await etudiant2.get(`/api/submissions/${copieFichier.id}`);
      assert.equal(copie.body.status, "REFUSEE_HORS_DELAI");
      assert.deepEqual(copie.body.fichiers, []);
    });

    it("le résultat de l'évaluation ne compte aucune copie", async () => {
      const results = await enseignant.get(`/api/assessments/${assessmentSoumission._id}/results`);
      assert.equal(results.body.nombreSoumissions, 0);
    });
  });
});
