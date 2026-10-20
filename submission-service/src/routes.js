const fs = require("node:fs");
const { Router } = require("express");
const multer = require("multer");
const commands = require("./commands");
const { upload, MAX_FILE_SIZE } = require("./upload");
const { SUBMISSION_STATUSES } = require("./models/Submission");

const router = Router();
const NOT_FOUND = { message: "Soumission introuvable" };

// Identité vérifiée par l'api-gateway (absente pour un appel interne).
function caller(req) {
  return { userId: req.get("x-user-id"), role: req.get("x-user-role") };
}

function handleCommandError(res, error) {
  if (error instanceof commands.CommandError) {
    return res.status(error.status).json({ message: error.message });
  }
  console.error(error);
  return res.status(500).json({ message: `Erreur : ${error.message}` });
}

router.get("/submissions", async (req, res) => {
  const { assessmentId, status } = req.query;
  const { userId, role } = caller(req);
  // Un étudiant ne liste que ses propres copies.
  const etudiantId = role === "ETUDIANT" ? userId : req.query.etudiantId;
  if (status && !SUBMISSION_STATUSES.includes(status)) {
    return res.status(400).json({ message: `status doit valoir ${SUBMISSION_STATUSES.join(", ")}` });
  }
  const submissions = await commands.listSubmissions({ assessmentId, etudiantId, status });
  res.json(submissions);
});

router.post("/submissions", async (req, res) => {
  try {
    const submission = await commands.openSubmission(req.body, caller(req));
    res.status(201).json(submission);
  } catch (error) {
    handleCommandError(res, error);
  }
});

router.get("/submissions/:id", async (req, res) => {
  try {
    const submission = await commands.findSubmission(req.params.id);
    if (!submission) return res.status(404).json(NOT_FOUND);
    commands.ensureAccess(submission, caller(req));
    res.json(submission);
  } catch (error) {
    handleCommandError(res, error);
  }
});

router.put("/submissions/:id/answers", async (req, res) => {
  try {
    const submission = await commands.saveAnswers(req.params.id, req.body.reponses, caller(req));
    if (!submission) return res.status(404).json(NOT_FOUND);
    res.json(submission);
  } catch (error) {
    handleCommandError(res, error);
  }
});

router.post("/submissions/:id/files", (req, res) => {
  upload.single("file")(req, res, async (uploadError) => {
    if (uploadError instanceof multer.MulterError) {
      const message =
        uploadError.code === "LIMIT_FILE_SIZE"
          ? `Fichier trop volumineux (max ${MAX_FILE_SIZE / (1024 * 1024)} Mo)`
          : uploadError.message;
      return res.status(400).json({ message });
    }
    if (uploadError) return handleCommandError(res, uploadError);

    try {
      const fichier = await commands.addFile(req.params.id, req.file, caller(req));
      if (!fichier) {
        if (req.file) fs.rmSync(req.file.path, { force: true });
        return res.status(404).json(NOT_FOUND);
      }
      res.status(201).json(fichier);
    } catch (error) {
      // Dépôt refusé : on ne garde pas le fichier orphelin sur le disque.
      if (req.file) fs.rmSync(req.file.path, { force: true });
      handleCommandError(res, error);
    }
  });
});

router.post("/submissions/:id/submit", async (req, res) => {
  try {
    const submission = await commands.submit(req.params.id, caller(req));
    if (!submission) return res.status(404).json(NOT_FOUND);
    res.json(submission);
  } catch (error) {
    handleCommandError(res, error);
  }
});

// Resoumission autorisée par l'enseignant responsable : { dateLimite?, motif? }.
router.post("/submissions/:id/reopen", async (req, res) => {
  try {
    const { dateLimite, motif } = req.body || {};
    const submission = await commands.reopenSubmission(req.params.id, { dateLimite, motif }, caller(req));
    if (!submission) return res.status(404).json(NOT_FOUND);
    res.json(submission);
  } catch (error) {
    handleCommandError(res, error);
  }
});

module.exports = router;
