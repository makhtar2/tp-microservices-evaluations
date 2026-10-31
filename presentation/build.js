// Génère le support de soutenance : node build.js (ou npm run build).
// Chaque fichier de slides/ ajoute ses slides dans l'ordre du déroulé.
const path = require("node:path");
const PptxGenJS = require("pptxgenjs");
const { PROJECT } = require("./lib/theme");
const { finalize } = require("./lib/kit");

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

const OUTPUT = path.join(__dirname, "Soutenance-Plateforme-Evaluations.pptx");

(async () => {
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_WIDE";
  pres.title = PROJECT.titre;
  pres.subject = PROJECT.classe;
  pres.company = PROJECT.universite;

  // Plage de slides de chaque section, reprise dans presentation/README.md.
  for (const section of SECTIONS) {
    const first = pres.slides.length + 1;
    require(`./slides/${section}`)(pres);
    console.log(`${section.padEnd(16)} slides ${first}-${pres.slides.length}`);
  }
  finalize();

  await pres.writeFile({ fileName: OUTPUT });
  console.log(`Support généré : ${OUTPUT}`);
})();
