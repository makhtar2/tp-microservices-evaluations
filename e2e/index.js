// Point d'entrée des tests bout-en-bout : démarre une seule fois la
// plateforme complète, puis exécute tous les scénarios dans ce processus
// (ils partagent la stack et peuvent arrêter/redémarrer un service).
const { before, after } = require("node:test");
const { startStack, stopStack } = require("./lib/stack");

before(startStack, { timeout: 180000 });
after(stopStack, { timeout: 60000 });

require("./scenarios/parcours-complet.test");
require("./scenarios/echec-hors-delai.test");
require("./scenarios/echec-correction.test");
