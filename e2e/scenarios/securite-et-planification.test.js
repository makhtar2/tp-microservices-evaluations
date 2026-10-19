// Règles d'accès appliquées par les services à partir de l'identité
// transmise par l'api-gateway, et publication planifiée d'une évaluation.
const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const { ACCOUNTS, login, createAndLogin, openSubmission, waitForGrading, eventually } = require("../lib/api");
const { uniqueSubject, createQuestionBank, createAssessment, createPublishedAssessment } = require("../lib/fixtures");

describe("Sécurité et planification", () => {
  let admin;
  let enseignant;
  let etudiant;
  let autreEtudiant;
  let bank;
  let autoBank; // sans question ouverte : la correction est entièrement automatique

  before(async () => {
    admin = await login(ACCOUNTS.admin);
    enseignant = await login(ACCOUNTS.enseignant);
    etudiant = await login(ACCOUNTS.etudiant);
    autreEtudiant = await createAndLogin(admin, { role: "ETUDIANT", prefix: "etudiant-securite" });
    bank = await createQuestionBank(enseignant, uniqueSubject("securite"));
    const { ouverte, ...auto } = bank;
    assert.ok(ouverte);
    autoBank = auto;
  });

  it("un étudiant lit l'énoncé des questions sans les bonnes réponses", async () => {
    const vueEtudiant = await etudiant.get(`/api/questions/${bank.qcm._id}`);
    assert.equal(vueEtudiant.status, 200);
    assert.deepEqual(vueEtudiant.body.answers, [{ text: "HTTP" }, { text: "FTP" }]);

    const courte = await etudiant.get(`/api/questions/${bank.courte._id}`);
    assert.equal(courte.body.answers, undefined);
    const ouverte = await etudiant.get(`/api/questions/${bank.ouverte._id}`);
    assert.equal(ouverte.body.correction, undefined);

    const vueEnseignant = await enseignant.get(`/api/questions/${bank.qcm._id}`);
    assert.equal(vueEnseignant.body.answers[0].isCorrect, true);
  });

  it("un brouillon reste invisible pour les étudiants", async () => {
    const brouillon = await createAssessment(enseignant, bank, { titre: "Brouillon secret" });
    assert.equal((await etudiant.get(`/api/assessments/${brouillon._id}`)).status, 404);
    const liste = await etudiant.get("/api/assessments");
    assert.ok(!liste.body.some((a) => a._id === brouillon._id));
    assert.equal((await enseignant.get(`/api/assessments/${brouillon._id}`)).status, 200);
  });

  it("l'enseignant responsable est celui du token, pas celui du corps de la requête", async () => {
    const res = await enseignant.post("/api/assessments", {
      titre: "Usurpation",
      enseignantId: "un-autre-enseignant",
      matiere: bank.qcm.subject,
      questionIds: [bank.qcm._id],
      bareme: 2,
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.enseignantId, enseignant.user.id);
  });

  it("un étudiant ne peut ni ouvrir, ni lire, ni modifier la copie d'un autre", async () => {
    const assessment = await createPublishedAssessment(enseignant, bank, { titre: "Copies séparées" });

    // etudiantId du corps ignoré : la copie est ouverte au nom du token.
    const res = await eventually("Ouverture de la copie", async () => {
      const r = await etudiant.post("/api/submissions", { assessmentId: assessment._id, etudiantId: autreEtudiant.user.id });
      return { done: !(r.status === 409 && r.body?.message === "Évaluation non publiée"), value: r };
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.etudiantId, etudiant.user.id);
    const copie = res.body;

    assert.equal((await autreEtudiant.get(`/api/submissions/${copie.id}`)).status, 403);
    const modif = await autreEtudiant.put(`/api/submissions/${copie.id}/answers`, {
      reponses: [{ questionId: bank.qcm._id, reponse: "FTP" }],
    });
    assert.equal(modif.status, 403);
    assert.equal((await autreEtudiant.post(`/api/submissions/${copie.id}/submit`)).status, 403);

    const liste = await autreEtudiant.get(`/api/submissions?assessmentId=${assessment._id}&etudiantId=${etudiant.user.id}`);
    assert.deepEqual(liste.body, [], "un étudiant ne liste que ses propres copies");
    assert.equal((await enseignant.get(`/api/submissions/${copie.id}`)).status, 200, "l'enseignant peut consulter");
  });

  it("un fichier exécutable est refusé", async () => {
    const assessment = await createPublishedAssessment(enseignant, bank, { titre: "Dépôt filtré" });
    const { body: copie } = await openSubmission(etudiant, assessment._id);
    const form = new FormData();
    form.append("file", new Blob(["MZ"], { type: "application/octet-stream" }), "devoir.exe");
    const res = await etudiant.upload(`/api/submissions/${copie.id}/files`, form);
    assert.equal(res.status, 400);
    assert.match(res.body.message, /non accepté/);
  });

  it("un étudiant ne voit que son propre résultat, avec la moyenne de la classe", async () => {
    const assessment = await createPublishedAssessment(enseignant, autoBank, { titre: "Résultats privés" });
    const reponses = {
      [etudiant.user.id]: [{ questionId: autoBank.qcm._id, reponse: "HTTP" }],
      [autreEtudiant.user.id]: [],
    };

    for (const eleve of [etudiant, autreEtudiant]) {
      const { body: copie } = await openSubmission(eleve, assessment._id);
      await eleve.put(`/api/submissions/${copie.id}/answers`, { reponses: reponses[eleve.user.id] });
      assert.equal((await eleve.post(`/api/submissions/${copie.id}/submit`)).status, 200);
      await waitForGrading(enseignant, copie.id);
      assert.equal((await enseignant.post(`/api/gradings/${copie.id}/validate`)).status, 200);
    }

    const resultats = await eventually("Résultats publiés", async () => {
      const r = await etudiant.get(`/api/assessments/${assessment._id}/results`);
      return { done: r.body?.nombreSoumissions === 2, value: r.body };
    });
    assert.deepEqual(
      resultats.resultatsEtudiants.map((r) => r.etudiantId),
      [etudiant.user.id],
      "seul le résultat de l'étudiant connecté est renvoyé"
    );
    assert.equal(resultats.resultatsEtudiants[0].note, 2);
    assert.equal(resultats.moyenne, 1);

    const vueEnseignant = await enseignant.get(`/api/assessments/${assessment._id}/results`);
    assert.equal(vueEnseignant.body.resultatsEtudiants.length, 2);
  });

  it("une évaluation planifiée est publiée automatiquement à la date prévue", async () => {
    const assessment = await createAssessment(enseignant, bank, { titre: "Publication planifiée" });
    const datePublication = new Date(Date.now() + 3000).toISOString();
    const res = await enseignant.post(`/api/assessments/${assessment._id}/schedule`, { datePublication });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.status, "PLANIFIEE");

    assert.equal((await etudiant.get(`/api/assessments/${assessment._id}`)).status, 404, "invisible avant publication");

    const publiee = await eventually(
      "Publication automatique",
      async () => {
        const r = await enseignant.get(`/api/assessments/${assessment._id}`);
        return { done: r.body?.status === "PUBLIEE", value: r.body };
      },
      { timeoutMs: 15000 }
    );
    assert.equal(publiee.status, "PUBLIEE");

    const copie = await openSubmission(etudiant, assessment._id);
    assert.equal(copie.status, 201, "AssessmentPublished a bien été émis vers submission-service");
  });

  it("la planification est refusée pour une date passée ou une évaluation sans question", async () => {
    const assessment = await createAssessment(enseignant, bank, { titre: "Planification invalide" });
    const passee = await enseignant.post(`/api/assessments/${assessment._id}/schedule`, {
      datePublication: new Date(Date.now() - 60000).toISOString(),
    });
    assert.equal(passee.status, 400);

    const vide = await createAssessment(enseignant, bank, { titre: "Vide", questionIds: [], bareme: 0 });
    const res = await enseignant.post(`/api/assessments/${vide._id}/schedule`, {
      datePublication: new Date(Date.now() + 60000).toISOString(),
    });
    assert.equal(res.status, 409);

    const parEtudiant = await etudiant.post(`/api/assessments/${assessment._id}/schedule`, {
      datePublication: new Date(Date.now() + 60000).toISOString(),
    });
    assert.equal(parEtudiant.status, 403);
  });
});
