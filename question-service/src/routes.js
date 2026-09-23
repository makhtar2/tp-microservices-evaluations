const { Router } = require("express");
const store = require("./store");

const router = Router();

router.get("/questions", (req, res) => {
  const { matiere, chapitre, difficulte, type, q } = req.query;
  res.json(store.list({ matiere, chapitre, difficulte, type, q }));
});

router.post("/questions", (req, res) => {
  const { enonce, type, matiere, chapitre, difficulte, points, reponses, correction } = req.body;
  if (!enonce || !type || !matiere || !difficulte || points === undefined) {
    return res.status(400).json({ message: "enonce, type, matiere, difficulte et points sont requis" });
  }
  const question = store.create({ enonce, type, matiere, chapitre, difficulte, points, reponses, correction });
  res.status(201).json(question);
});

router.get("/questions/:id", (req, res) => {
  const question = store.get(req.params.id);
  if (!question) return res.status(404).json({ message: "Question introuvable" });
  res.json(question);
});

router.put("/questions/:id", (req, res) => {
  const updated = store.update(req.params.id, req.body);
  if (!updated) return res.status(404).json({ message: "Question introuvable" });
  res.json(updated);
});

router.delete("/questions/:id", (req, res) => {
  const removed = store.remove(req.params.id);
  if (!removed) return res.status(404).json({ message: "Question introuvable" });
  res.status(204).send();
});

module.exports = router;
