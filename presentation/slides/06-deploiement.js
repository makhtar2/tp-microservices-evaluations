// Partie 6 — Déploiement & démonstration (Pape Makhtar Aidara).
// Sources : docker-compose.yml, Dockerfiles, README*, docs/,
// e2e/scripts/test-docs-and-docker.js, captures du parcours UI.
const { COLORS, FONTS, SPEAKERS } = require("../lib/theme");
const { W, MARGIN, text, contentSlide, sectionSlide, box, card, screenshot } = require("../lib/kit");

const SPEAKER = "aidara";
const PART = "Partie 6 · Déploiement & démonstration";
const ACCENT = SPEAKERS[SPEAKER].color;

function dockerSlide(pres) {
  const slide = contentSlide(pres, {
    part: PART,
    title: "Toute la plateforme en une commande : docker compose",
    speaker: SPEAKER,
    notes:
      "Chaque service a son Dockerfile, et docker-compose orchestre les 15 conteneurs : RabbitMQ, six bases MongoDB, " +
      "six microservices, la gateway et le frontend, sur un réseau privé. Les bases et RabbitMQ ont des healthchecks : " +
      "les services ne démarrent que quand leurs dépendances sont prêtes. Seuls les ports utiles sont exposés. Les " +
      "données survivent aux redémarrages grâce aux volumes.",
  });
  const fx = MARGIN;
  const fw = 8.15;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: fx, y: 1.6, w: fw, h: 4.95, rectRadius: 0.08, fill: { color: COLORS.white }, line: { color: ACCENT, width: 1.25, dashType: "dash" } });
  text(slide, "réseau evaluations-net", { x: fx + 0.2, y: 1.68, w: 4, h: 0.3, fontSize: 10, bold: true, color: ACCENT, fontFace: FONTS.code });

  const couche = (y, titre, items, color, fill) => {
    text(slide, titre, { x: fx + 0.2, y, w: 2, h: 0.3, fontSize: 10.5, bold: true, color: COLORS.muted });
    const iw = (fw - 0.4 - (items.length - 1) * 0.12) / items.length;
    items.forEach((item, i) => {
      box(pres, slide, { x: fx + 0.2 + i * (iw + 0.12), y: y + 0.33, w: iw, h: 0.62, label: item, fill, line: color, color: COLORS.ink, fontSize: 9.5, shadowed: false });
    });
  };
  couche(2.05, "Interface", ["frontend :5173", "api-gateway :3000"], COLORS.group1, COLORS.infoSoft);
  couche(3.15, "Microservices", ["user", "question", "assessment", "submission", "grading", "notification"], COLORS.group2, COLORS.warnSoft);
  couche(4.25, "Données (healthcheck)", ["user-db", "question-db", "assessment-db", "submission-db", "grading-db", "notification-db"], COLORS.mongo, COLORS.mintSoft);
  couche(5.35, "Messagerie (healthcheck)", ["rabbitmq :5672 · admin :15672"], COLORS.rabbit, "FFEDD5");

  const rx = fx + fw + 0.3;
  const rw = W - MARGIN - rx;
  const chiffres = [["15", "conteneurs"], ["8", "volumes persistants"], ["7", "healthchecks"]];
  chiffres.forEach(([n, libelle], i) => {
    const y = 1.6 + i * 0.85;
    text(slide, n, { x: rx, y, w: 0.85, h: 0.75, fontSize: 32, bold: true, color: ACCENT, fontFace: FONTS.title, valign: "middle", align: "right" });
    text(slide, libelle, { x: rx + 1.0, y, w: rw - 1.0, h: 0.75, fontSize: 13, color: COLORS.ink, valign: "middle" });
  });
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: rx, y: 4.35, w: rw, h: 2.2, rectRadius: 0.08, fill: { color: "0B1F1A" }, line: { color: "0B1F1A", width: 0 } });
  text(slide, [
    { text: "# infrastructure d'abord", options: { color: "7FA396", breakLine: true } },
    { text: "docker compose up -d --wait \\", options: { breakLine: true } },
    { text: "  rabbitmq user-db … grading-db", options: { breakLine: true } },
    { text: "# puis tous les services", options: { color: "7FA396", breakLine: true } },
    { text: "docker compose up -d --build", options: { breakLine: true } },
    { text: "# comptes de démonstration", options: { color: "7FA396", breakLine: true } },
    { text: "docker compose exec user-service \\", options: { breakLine: true } },
    { text: "  npm run seed" },
  ], { x: rx + 0.2, y: 4.5, w: rw - 0.3, h: 1.95, fontSize: 10, fontFace: FONTS.code, color: "E2ECE8", valign: "middle" });
}

function docsSlide(pres) {
  const slide = contentSlide(pres, {
    part: PART,
    title: "Documentation et contrats : un projet reprenable",
    speaker: SPEAKER,
    notes:
      "Un système distribué n'est utilisable que si ses contrats sont écrits. Chaque service a son README (ports, " +
      "variables, événements), les API REST sont décrites en OpenAPI, le contrat gRPC est partagé. Et pour que la " +
      "documentation ne se périme pas, une suite de 110 vérifications contrôle les README, les liens entre documents, " +
      "les Dockerfiles, le docker-compose, ses services et ses volumes.",
  });
  const docs = [
    ["R", "README racine", ["architecture et matrice des ports", "comptes de test, démarrage Docker", "synthèse des API par service"]],
    ["7", "README par service", ["responsabilité, données possédées", "variables d'environnement", "événements publiés et consommés"]],
    ["{}", "Contrats d'API", ["OpenAPI : 5 services REST (docs/openapi)", "gRPC : docs/protos/question.proto", "convention de messaging RabbitMQ"]],
    ["D", "Conception", ["cahier de conception (UC, règles)", "analyse DDD et Context Map", "dossier d'architecture technique"]],
  ];
  const cw = 2.95;
  docs.forEach(([icon, titre, items], i) => {
    card(pres, slide, { x: MARGIN + (i % 2) * (cw + 0.2), y: 1.6 + Math.floor(i / 2) * 2.55, w: cw, h: 2.4, title: titre, body: items, accent: ACCENT, icon, fontSize: 10.5, titleSize: 12 });
  });

  // Résultat de la suite de validation.
  const vx = MARGIN + 2 * cw + 0.45;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: vx, y: 1.6, w: W - MARGIN - vx, h: 2.55, rectRadius: 0.08, fill: { color: "0B1F1A" }, line: { color: "0B1F1A", width: 0 } });
  text(slide, [
    { text: "$ node e2e/scripts/test-docs-and-docker.js", options: { color: COLORS.mint, breakLine: true } },
    { text: " ", options: { breakLine: true } },
    { text: "--- 1. DOCUMENTATION TECHNIQUE ---", options: { color: "7FA396", breakLine: true } },
    { text: "  ✅ [PASS] README présent : grading-service/README.md", options: { breakLine: true } },
    { text: "  ✅ [PASS] README racine inclut la section : \"Saga Métier\"", options: { breakLine: true } },
    { text: "--- 3. CONTENEURISATION (DOCKERFILES) ---", options: { color: "7FA396", breakLine: true } },
    { text: "  ✅ [PASS] Dockerfile définit CMD/ENTRYPOINT : api-gateway", options: { breakLine: true } },
    { text: "--- 4. FICHIER DOCKER-COMPOSE.YML ---", options: { color: "7FA396", breakLine: true } },
    { text: "  ✅ [PASS] docker compose config : syntaxe YAML et dépendances 100% valides", options: { breakLine: true } },
    { text: "  …", options: { breakLine: true } },
    { text: "RÉSULTAT : 110/110 tests réussis (0 échecs)", options: { bold: true, color: COLORS.mint } },
  ], { x: vx + 0.25, y: 1.75, w: W - MARGIN - vx - 0.4, h: 2.3, fontSize: 9, fontFace: FONTS.code, color: "E2ECE8" });
  text(slide, [
    { text: "Documentation vérifiée automatiquement : ", options: { bold: true, color: ACCENT } },
    { text: "un README manquant, un lien cassé, un Dockerfile incomplet ou un docker-compose invalide fait échouer la suite (6 familles de contrôles).", options: { color: COLORS.text } },
  ], { x: vx, y: 4.4, w: W - MARGIN - vx, h: 1.2, fontSize: 12 });
}

function demoSlide(pres) {
  const slide = contentSlide(pres, {
    part: PART,
    title: "Démonstration : le parcours complet, en direct",
    speaker: SPEAKER,
    notes:
      "Ces captures ont été prises automatiquement par le test d'interface, sur la stack Docker. Pendant la démo live, " +
      "suivre les quatre étapes du bas, en gardant ouverts RabbitMQ (onglet Queues) et les logs. Plan B si le réseau " +
      "ou Docker pose problème : lancer la suite e2e, qui rejoue le même parcours.",
  });
  const captures = [
    ["05-mes-evaluations.png", "Étudiant : évaluations ouvertes"],
    ["06-copie-en-cours.png", "Étudiant : copie en cours"],
    ["09-correction-validee.png", "Enseignant : correction validée"],
    ["11-utilisateurs.png", "Administrateur : comptes"],
  ];
  const gap = 0.2;
  const sw = (W - 2 * MARGIN - 3 * gap) / 4;
  captures.forEach(([file, caption], i) => {
    screenshot(pres, slide, { file, x: MARGIN + i * (sw + gap), y: 1.6, w: sw, caption });
  });
  const etapes = [
    ["1", "Enseignant", "crée une évaluation avec le sélecteur et la publie"],
    ["2", "Étudiant", "répond, dépose un fichier, soumet"],
    ["3", "Enseignant", "corrige la question ouverte et valide"],
    ["4", "Panne", "docker compose stop question-service, puis relance"],
  ];
  const ew = (W - 2 * MARGIN - 3 * gap) / 4;
  etapes.forEach(([n, qui, quoi], i) => {
    const x = MARGIN + i * (ew + gap);
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 4.75, w: ew, h: 1.75, rectRadius: 0.08, fill: { color: COLORS.white }, line: { color: COLORS.line, width: 0.75 } });
    slide.addShape(pres.shapes.OVAL, { x: x + 0.2, y: 4.95, w: 0.5, h: 0.5, fill: { color: i === 3 ? COLORS.danger : ACCENT }, line: { color: ACCENT, width: 0 } });
    text(slide, n, { x: x + 0.2, y: 4.95, w: 0.5, h: 0.5, fontSize: 15, bold: true, color: COLORS.white, align: "center", valign: "middle" });
    text(slide, qui, { x: x + 0.85, y: 4.95, w: ew - 1, h: 0.5, fontSize: 13, bold: true, color: COLORS.ink, valign: "middle" });
    text(slide, quoi, { x: x + 0.2, y: 5.55, w: ew - 0.35, h: 0.85, fontSize: 11, color: COLORS.text });
  });
  text(slide, "Captures prises automatiquement par le test d'interface (Chrome headless) sur la stack Docker.", {
    x: MARGIN, y: 4.3, w: W - 2 * MARGIN, h: 0.3, fontSize: 10.5, color: ACCENT, bold: true, align: "center",
  });
}

module.exports = (pres) => {
  sectionSlide(pres, {
    number: 6,
    title: "Déploiement & démonstration",
    subtitle: "Conteneuriser, documenter, montrer que tout fonctionne",
    speaker: SPEAKER,
    topics: ["Conteneurisation Docker", "Documentation et contrats", "Démonstration de l'interface"],
  });
  dockerSlide(pres);
  docsSlide(pres);
  demoSlide(pres);
};
