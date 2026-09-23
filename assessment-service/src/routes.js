const { Router } = require("express");
const commands = require("./commands");
const queries = require("./queries");
const { rebuildReadModel } = require("./projectionUpdater");

const router = Router();

function handleCommandError(res, error) {
  if (error instanceof commands.CommandError) {
    return res.status(error.status).json({ message: error.message });
  }
  console.error(error);
  return res.status(502).json({ message: `Erreur : ${error.message}` });
}

router.get("/assessments", async (req, res) => {
  const { enseignantId, status } = req.query;
  const assessments = await queries.listAssessments({ enseignantId, status });
  res.json(assessments);
});

router.post("/assessments", async (req, res) => {
  try {
    const assessment = await commands.createAssessment(req.body);
    res.status(201).json(assessment);
  } catch (error) {
    handleCommandError(res, error);
  }
});

router.get("/assessments/:id", async (req, res) => {
  const assessment = await queries.getAssessment(req.params.id);
  if (!assessment) return res.status(404).json({ message: "Évaluation introuvable" });
  res.json(assessment);
});

router.put("/assessments/:id", async (req, res) => {
  try {
    const updated = await commands.updateAssessment(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "Évaluation introuvable" });
    res.json(updated);
  } catch (error) {
    handleCommandError(res, error);
  }
});

router.post("/assessments/:id/publish", async (req, res) => {
  try {
    const published = await commands.publishAssessment(req.params.id);
    if (!published) return res.status(404).json({ message: "Évaluation introuvable" });
    res.json(published);
  } catch (error) {
    handleCommandError(res, error);
  }
});

router.post("/assessments/:id/cancel", async (req, res) => {
  try {
    const cancelled = await commands.cancelAssessment(req.params.id);
    if (!cancelled) return res.status(404).json({ message: "Évaluation introuvable" });
    res.json(cancelled);
  } catch (error) {
    handleCommandError(res, error);
  }
});

// Rejoue l'intégralité de l'Event Store d'une évaluation pour
// re-matérialiser le Read Model (reconstruction d'état, utile après un
// incident ou pour vérifier que le Read Model est bien dérivable).
router.post("/assessments/:id/rebuild", async (req, res) => {
  const state = await rebuildReadModel(req.params.id);
  if (!state) return res.status(404).json({ message: "Aucun événement pour cette évaluation" });
  res.json(state);
});

router.get("/assessments/:id/results", async (req, res) => {
  const results = await queries.getResults(req.params.id);
  if (!results) return res.status(404).json({ message: "Évaluation introuvable" });
  res.json(results);
});

module.exports = router;
