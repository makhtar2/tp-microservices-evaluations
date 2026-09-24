const { Router } = require("express");
const commands = require("./commands");

const router = Router();
const NOT_FOUND = { message: "Correction introuvable" };

function handleCommandError(res, error) {
  if (error instanceof commands.CommandError) {
    return res.status(error.status).json({ message: error.message });
  }
  console.error(error);
  return res.status(500).json({ message: `Erreur : ${error.message}` });
}

// Déclarée avant /gradings/:submissionId pour ne pas être capturée par elle.
router.get("/gradings/pending", async (req, res) => {
  const { assessmentId, enseignantId } = req.query;
  res.json(await commands.listPending({ assessmentId, enseignantId }));
});

router.get("/gradings/:submissionId", async (req, res) => {
  const grading = await commands.findGrading(req.params.submissionId);
  if (!grading) return res.status(404).json(NOT_FOUND);
  res.json(grading);
});

router.put("/gradings/:submissionId/questions/:questionId", async (req, res) => {
  try {
    const { submissionId, questionId } = req.params;
    const grading = await commands.gradeQuestion(submissionId, questionId, req.body, req.get("x-user-id"));
    if (!grading) return res.status(404).json(NOT_FOUND);
    res.json(grading);
  } catch (error) {
    handleCommandError(res, error);
  }
});

router.post("/gradings/:submissionId/validate", async (req, res) => {
  try {
    const grading = await commands.validate(req.params.submissionId, req.get("x-user-id"));
    if (!grading) return res.status(404).json(NOT_FOUND);
    res.json(grading);
  } catch (error) {
    handleCommandError(res, error);
  }
});

module.exports = router;
