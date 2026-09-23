const { Router } = require("express");
const store = require("./store");
const { selectQuestions } = require("./questionClient");

const router = Router();

router.get("/assessments", (req, res) => {
  const { enseignantId, status } = req.query;
  res.json(store.list({ enseignantId, status }));
});

router.post("/assessments", async (req, res) => {
  const { titre, enseignantId, matiere, questionIds, generationAuto, dateDebut, dateFin, duree, consignes } = req.body;
  if (!titre || !enseignantId || !matiere) {
    return res.status(400).json({ message: "titre, enseignantId et matiere sont requis" });
  }

  let selectedQuestionIds = questionIds || [];
  if (generationAuto) {
    try {
      const questions = await selectQuestions(generationAuto);
      selectedQuestionIds = questions.map((question) => question.id);
    } catch (error) {
      return res.status(502).json({ message: `Génération automatique indisponible : ${error.message}` });
    }
  }

  const assessment = store.create({
    titre,
    enseignantId,
    matiere,
    questionIds: selectedQuestionIds,
    dateDebut,
    dateFin,
    duree,
    consignes,
  });
  res.status(201).json(assessment);
});

router.get("/assessments/:id", (req, res) => {
  const assessment = store.get(req.params.id);
  if (!assessment) return res.status(404).json({ message: "Évaluation introuvable" });
  res.json(assessment);
});

router.put("/assessments/:id", (req, res) => {
  const updated = store.update(req.params.id, req.body);
  if (updated === null) return res.status(404).json({ message: "Évaluation introuvable" });
  if (updated === "INVALID_STATUS") {
    return res.status(409).json({ message: "Modification impossible dans l'état courant" });
  }
  res.json(updated);
});

module.exports = router;
