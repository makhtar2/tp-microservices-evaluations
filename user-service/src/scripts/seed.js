// Crée les comptes de test (un par rôle) s'ils n'existent pas encore.
// Indispensable au premier démarrage : seul un Administrateur peut créer
// des utilisateurs via l'API. Usage : npm run seed
require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../models/User");

const TEST_ACCOUNTS = [
  { email: "admin@evaluations.local", password: "admin123", nom: "Admin", prenom: "Plateforme", role: "ADMINISTRATEUR" },
  { email: "enseignant@evaluations.local", password: "enseignant123", nom: "Diop", prenom: "Awa", role: "ENSEIGNANT" },
  { email: "etudiant@evaluations.local", password: "etudiant123", nom: "Ndiaye", prenom: "Moussa", role: "ETUDIANT" },
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  for (const { password, ...data } of TEST_ACCOUNTS) {
    if (await User.exists({ email: data.email })) {
      console.log(`= ${data.email} existe déjà`);
      continue;
    }
    const user = new User(data);
    await user.setPassword(password);
    await user.save();
    console.log(`+ ${data.email} / ${password} (${data.role})`);
  }
  await mongoose.disconnect();
})();
