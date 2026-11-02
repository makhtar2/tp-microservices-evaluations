// Génère le support de soutenance : node build.js (ou npm run build).
// Chaque fichier de slides/ ajoute ses slides dans l'ordre du déroulé.
const fs = require("node:fs");
const path = require("node:path");
const PptxGenJS = require("pptxgenjs");
const { PROJECT } = require("./lib/theme");
const { setNotes } = require("./lib/kit");

const SECTIONS = [
  "00-ouverture",
  "01-contexte",
  "02-conception",
  "03-architecture",
  "04-cqrs",
  "05-saga",
  "06-deploiement",
  "07-conclusion",
];

// Chemin de sortie optionnel (node build.js <fichier>), utile quand le
// support est ouvert dans PowerPoint, qui verrouille le fichier.
const OUTPUT = path.resolve(process.argv[2] || path.join(__dirname, "Soutenance-Plateforme-Evaluations.pptx"));
const NOTES_FILE = path.join(__dirname, "lib/notes.json");

async function generate(fileName, notes) {
  setNotes(notes);
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_WIDE";
  pres.title = PROJECT.titre;
  pres.subject = PROJECT.classe;
  pres.company = PROJECT.universite;
  pres.author = "Équipe du projet Evalio";

  for (const section of SECTIONS) {
    const first = pres.slides.length + 1;
    require(`./slides/${section}`)(pres);
    console.log(`${section.padEnd(16)} slides ${first}-${pres.slides.length}`);
  }

  await pres.writeFile({ fileName });
  console.log(`Support généré : ${fileName}`);
}

(async () => {
  await generate(OUTPUT, {});
  if (fs.existsSync(NOTES_FILE)) {
    const notes = JSON.parse(fs.readFileSync(NOTES_FILE, "utf8"));
    await generate(OUTPUT.replace(/\.pptx$/, "-avec-notes.pptx"), notes);
  }
})();
