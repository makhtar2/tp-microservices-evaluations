// Partie 6 — Déploiement & démonstration (Pape Makhtar Aidara).
// Sources : docker-compose.yml, Dockerfiles, README*, docs/,
// e2e/scripts/test-docs-and-docker.js, captures du parcours UI.
const { COLORS, FONTS, SPEAKERS } = require("../lib/theme");
const { W, MARGIN, text, contentSlide, sectionSlide, box, card, screenshot } = require("../lib/kit");

const SPEAKER = "aidara";
const PART = "Déploiement et démonstration";
const ACCENT = SPEAKERS[SPEAKER].color;

function dockerSlide(pres) {
  const slide = contentSlide(pres, {
    part: PART,
    title: "Déploiement avec Docker Compose",
    speaker: SPEAKER,
    notes:
      "Chaque service a son Dockerfile, et docker-compose orchestre les 15 conteneurs : RabbitMQ, six bases MongoDB, " +
      "six microservices, la gateway et le frontend, sur un réseau privé. Les bases et RabbitMQ ont des healthchecks : " +
      "les services ne démarrent que quand leurs dépendances sont prêtes. Seuls les ports utiles sont exposés. Les " +
      "données survivent aux redémarrages grâce aux volumes.",
  });
  const fx = MARGIN;
  const fw = 8.15;
  slide.addShape(pres.shapes.RECTANGLE, { x: fx, y: 1.6, w: fw, h: 4.95, fill: { color: COLORS.white }, line: { color: ACCENT, width: 1.25, dashType: "dash" } });
  text(slide, "réseau evaluations-net", { x: fx + 0.2, y: 1.68, w: 4, h: 0.3, fontSize: 10, bold: true, color: ACCENT, fontFace: FONTS.code });

  const couche = (y, titre, items, color, fill) => {
    text(slide, titre, { x: fx + 0.2, y, w: 2, h: 0.3, fontSize: 10.5, bold: true, color: COLORS.muted });
    const iw = (fw - 0.4 - (items.length - 1) * 0.12) / items.length;
    items.forEach((item, i) => {
      box(pres, slide, { x: fx + 0.2 + i * (iw + 0.12), y: y + 0.33, w: iw, h: 0.62, label: item, fill, line: color, color: COLORS.ink, fontSize: 9.5 });
    });
  };
  couche(2.05, "Interface", ["frontend :5173", "api-gateway :3000"], COLORS.group1, COLORS.infoSoft);
  couche(3.15, "Microservices", ["user", "question", "assessment", "submission", "grading", "notification"], COLORS.group2, COLORS.warnSoft);
  couche(4.25, "Données (healthcheck)", ["user-db", "question-db", "assessment-db", "submission-db", "grading-db", "notification-db"], COLORS.mongo, COLORS.mintSoft);
  couche(5.35, "Messagerie (healthcheck)", ["rabbitmq :5672, administration :15672"], COLORS.rabbit, "F8EFE7");

  const rx = fx + fw + 0.3;
  const rw = W - MARGIN - rx;
  text(slide, ["15 conteneurs", "8 volumes persistants", "7 healthchecks"].map((t) => ({ text: t, options: { bullet: { code: "2022", indent: 12 }, breakLine: true } })), { x: rx, y: 1.6, w: rw, h: 2.4, fontSize: 17, paraSpaceAfter: 8 });
  slide.addShape(pres.shapes.RECTANGLE, { x: rx, y: 4.35, w: rw, h: 2.2, fill: { color: "F4F5F3" }, line: { color: "F4F5F3", width: 0 } });
  text(slide, [
    { text: "# infrastructure d'abord", options: { color: COLORS.muted, breakLine: true } },
    { text: "docker compose up -d --wait \\", options: { breakLine: true } },
    { text: "  rabbitmq user-db … grading-db", options: { breakLine: true } },
    { text: "# puis tous les services", options: { color: COLORS.muted, breakLine: true } },
    { text: "docker compose up -d --build", options: { breakLine: true } },
    { text: "# comptes de démonstration", options: { color: COLORS.muted, breakLine: true } },
    { text: "docker compose exec user-service \\", options: { breakLine: true } },
    { text: "  npm run seed" },
  ], { x: rx + 0.2, y: 4.5, w: rw - 0.3, h: 1.95, fontSize: 10, fontFace: FONTS.code, color: COLORS.ink, valign: "middle" });
}

function docsSlide(pres) {
  const slide = contentSlide(pres, {
    part: PART,
    title: "Documentation et contrats",
    speaker: SPEAKER,
    notes:
      "Chaque service a son README (ports, " +
      "variables, événements), les API REST sont décrites en OpenAPI, le contrat gRPC est partagé. Une " +
      "suite de 110 vérifications contrôle les README, les liens entre documents, " +
      "les Dockerfiles, le docker-compose, ses services et ses volumes.",
  });
  const docs = [
    ["README racine", ["architecture et matrice des ports", "comptes de test, démarrage Docker", "synthèse des API par service"]],
    ["README par service", ["responsabilité, données possédées", "variables d'environnement", "événements publiés et consommés"]],
    ["Contrats d'API", ["OpenAPI : 5 services REST (docs/openapi)", "gRPC : docs/protos/question.proto", "convention de messaging RabbitMQ"]],
    ["Conception", ["cahier de conception (UC, règles)", "analyse DDD et Context Map", "dossier d'architecture technique"]],
  ];
  const cw = 2.95;
  docs.forEach(([titre, items], i) => {
    card(pres, slide, { x: MARGIN + (i % 2) * (cw + 0.2), y: 1.6 + Math.floor(i / 2) * 2.55, w: cw, h: 2.4, title: titre, body: items, accent: ACCENT, fontSize: 12.5, titleSize: 13.5 });
  });

  const vx = MARGIN + 2 * cw + 0.45;
  card(pres, slide, {
    x: vx, y: 1.6, w: W - MARGIN - vx, h: 4.95, title: "Vérification de la documentation", fontSize: 13, titleSize: 14,
    body: [
      "Script : e2e/scripts/test-docs-and-docker.js",
      "Résultat : 110 vérifications, 0 échec",
      "Présence et contenu des README",
      "Liens relatifs entre les documents",
      "Dockerfiles",
      "Syntaxe du fichier docker-compose.yml",
      "Services et volumes déclarés",
    ],
  });
}

function demoSlide(pres) {
  const slide = contentSlide(pres, {
    part: PART,
    title: "Démonstration",
    speaker: SPEAKER,
    notes:
      "Pendant la démo live, suivre les quatre étapes du bas, en gardant ouverts RabbitMQ (onglet Queues) et les logs. " +
      "Plan B si le réseau ou Docker pose problème : lancer la suite e2e, qui rejoue le même parcours.",
  });
  const captures = [
    ["05-mes-evaluations.png", "Évaluations ouvertes, côté étudiant"],
    ["06-copie-en-cours.png", "Copie en cours"],
    ["09-correction-validee.png", "Correction validée"],
    ["11-utilisateurs.png", "Gestion des comptes"],
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
    slide.addShape(pres.shapes.RECTANGLE, { x, y: 4.75, w: ew, h: 1.75, fill: { color: COLORS.white }, line: { color: COLORS.line, width: 0.75 } });
    text(slide, `${n}. ${qui}`, { x: x + 0.18, y: 4.9, w: ew - 0.3, h: 0.4, fontSize: 14, bold: true, color: COLORS.ink, valign: "middle" });
    text(slide, quoi, { x: x + 0.18, y: 5.35, w: ew - 0.3, h: 1.05, fontSize: 13, color: COLORS.text });
  });
}

module.exports = (pres) => {
  sectionSlide(pres, {
    number: 6,
    title: "Déploiement et démonstration",
    speaker: SPEAKER,
    topics: ["Conteneurisation Docker", "Documentation et contrats", "Démonstration de l'interface"],
  });
  dockerSlide(pres);
  docsSlide(pres);
  demoSlide(pres);
};
