const { Router } = require("express");
const mongoose = require("mongoose");
const User = require("./models/User");
const { ROLES } = require("./models/User");
const { signToken, authenticate, requireRole } = require("./auth");

const router = Router();
const NOT_FOUND = { message: "Utilisateur introuvable" };
const isAdmin = requireRole("ADMINISTRATEUR");

function findUser(id) {
  return mongoose.isValidObjectId(id) ? User.findById(id) : null;
}

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = email && password ? await User.findOne({ email: String(email).toLowerCase() }) : null;
  if (!user || !(await user.checkPassword(password))) {
    return res.status(401).json({ message: "Identifiants invalides" });
  }
  if (!user.active) {
    return res.status(401).json({ message: "Compte désactivé" });
  }
  res.json({ token: signToken(user), user });
});

// Liste : Administrateur (gestion des comptes) et Enseignant (ex. liste
// des étudiants d'une évaluation).
router.get("/users", authenticate, requireRole("ADMINISTRATEUR", "ENSEIGNANT"), async (req, res) => {
  const { role, active } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (active !== undefined) filter.active = active === "true";
  res.json(await User.find(filter).sort({ nom: 1, prenom: 1 }));
});

router.post("/users", authenticate, isAdmin, async (req, res) => {
  const { email, password, nom, prenom, role } = req.body;
  if (!email || !password || !nom || !prenom || !ROLES.includes(role)) {
    return res.status(400).json({ message: `email, password, nom, prenom et role (${ROLES.join(", ")}) sont requis` });
  }
  if (await User.exists({ email: String(email).toLowerCase() })) {
    return res.status(409).json({ message: "Email déjà utilisé" });
  }
  const user = new User({ email, nom, prenom, role });
  await user.setPassword(password);
  await user.save();
  res.status(201).json(user);
});

// Consultation : Administrateur, ou l'utilisateur lui-même.
router.get("/users/:id", authenticate, async (req, res) => {
  if (req.user.role !== "ADMINISTRATEUR" && req.user.id !== req.params.id) {
    return res.status(403).json({ message: "Accès refusé" });
  }
  const user = await findUser(req.params.id);
  if (!user) return res.status(404).json(NOT_FOUND);
  res.json(user);
});

router.put("/users/:id", authenticate, isAdmin, async (req, res) => {
  const { nom, prenom, role } = req.body;
  if (role !== undefined && !ROLES.includes(role)) {
    return res.status(400).json({ message: `role doit valoir ${ROLES.join(", ")}` });
  }
  const user = await findUser(req.params.id);
  if (!user) return res.status(404).json(NOT_FOUND);
  if (nom !== undefined) user.nom = nom;
  if (prenom !== undefined) user.prenom = prenom;
  if (role !== undefined) user.role = role;
  res.json(await user.save());
});

router.patch("/users/:id/status", authenticate, isAdmin, async (req, res) => {
  const { active } = req.body;
  if (typeof active !== "boolean") {
    return res.status(400).json({ message: "active (booléen) est requis" });
  }
  if (req.params.id === req.user.id && !active) {
    return res.status(400).json({ message: "Un administrateur ne peut pas désactiver son propre compte" });
  }
  const user = await findUser(req.params.id);
  if (!user) return res.status(404).json(NOT_FOUND);
  user.active = active;
  res.json(await user.save());
});

module.exports = router;
