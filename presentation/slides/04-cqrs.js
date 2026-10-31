// Partie 4 — CQRS & Event Sourcing (Mouhamed Mbacke).
// Sources : assessment-service/src (commands, eventStore, projections,
// projectionUpdater, queries).
const { COLORS, FONTS, SPEAKERS } = require("../lib/theme");
const { W, MARGIN, text, contentSlide, sectionSlide, box, arrow, pill, card, screenshot } = require("../lib/kit");

const SPEAKER = "mbacke";
const PART = "Partie 4 · CQRS & Event Sourcing";
const ACCENT = SPEAKERS[SPEAKER].color;

function cqrsSlide(pres) {
  const slide = contentSlide(pres, {
    part: PART,
    title: "CQRS : un chemin pour écrire, un autre pour lire",
    speaker: SPEAKER,
    notes:
      "Dans assessment-service, les commandes et les requêtes ne passent pas par le même modèle. Une commande valide " +
      "les règles métier, par exemple : on ne publie pas une évaluation sans question ni barème. Si elle est acceptée, " +
      "elle n'écrit pas l'état : elle ajoute un événement dans l'Event Store. Le Read Model est mis à jour à partir de " +
      "cet événement, et toutes les lectures se font sur lui. Les événements venant de grading-service suivent le même " +
      "chemin.",
  });
  const y = 2.05;
  const h = 1.15;
  // Côté écriture.
  box(pres, slide, { x: MARGIN, y, w: 2.35, h, label: "Commandes", sub: "POST /assessments\nPUT · /schedule · /publish · /cancel", fill: COLORS.infoSoft, line: COLORS.group1, shadowed: false, fontSize: 13 });
  arrow(pres, slide, MARGIN + 2.35, y + h / 2, 3.45, y + h / 2, { color: COLORS.ink, width: 2 });
  box(pres, slide, { x: 3.45, y, w: 2.35, h, label: "Write Model", sub: "valide les règles métier\n(ex. publier : ≥ 1 question, barème > 0)", stripe: ACCENT, fontSize: 13 });
  arrow(pres, slide, 5.8, y + h / 2, 6.6, y + h / 2, { color: ACCENT, width: 2.25, label: "append", labelW: 0.75, labelOffset: -0.3 });
  // Event Store au centre.
  slide.addShape(pres.shapes.CAN, { x: 6.6, y: y - 0.25, w: 2.0, h: h + 0.5, fill: { color: ACCENT }, line: { color: ACCENT, width: 0 } });
  text(slide, [
    { text: "Event Store", options: { bold: true, fontSize: 13, breakLine: true } },
    { text: "append-only", options: { fontSize: 9.5 } },
  ], { x: 6.6, y: y + 0.05, w: 2.0, h: h + 0.2, color: COLORS.white, align: "center", valign: "middle" });
  arrow(pres, slide, 8.6, y + h / 2, 9.4, y + h / 2, { color: ACCENT, width: 2.25, label: "projection", labelW: 0.95, labelOffset: -0.3 });
  box(pres, slide, { x: 9.4, y, w: 3.33, h, label: "Read Model", sub: "état courant, prêt à lire\n(statut, résultats, statistiques)", stripe: COLORS.mongo, fontSize: 13 });
  // Côté lecture.
  arrow(pres, slide, 11.05, y + h + 0.95, 11.05, y + h, { color: COLORS.ink, width: 2 });
  box(pres, slide, { x: 9.4, y: y + h + 0.95, w: 3.33, h: 0.85, label: "Requêtes", sub: "GET /assessments · /:id · /:id/results", fill: COLORS.mintSoft, line: COLORS.mongo, shadowed: false, fontSize: 13 });

  // Entrées et sorties par le bus.
  box(pres, slide, { x: 3.45, y: y + h + 0.95, w: 5.15, h: 0.85, label: "RabbitMQ", sub: "entrants : grading.completed, result.published → enregistrés comme événements", fill: "FFEDD5", line: COLORS.rabbit, shadowed: false, fontSize: 12 });
  arrow(pres, slide, 7.6, y + h + 0.95, 7.6, y + h + 0.25, { color: COLORS.rabbit, width: 1.75 });
  arrow(pres, slide, 4.6, y + h, 4.6, y + h + 0.95, { color: COLORS.rabbit, width: 1.75 });
  text(slide, "publie AssessmentPublished", { x: 4.7, y: y + h + 0.3, w: 2.2, h: 0.3, fontSize: 9, bold: true, color: COLORS.rabbit });

  const atouts = [
    ["Lecture rapide", "le Read Model est déjà calculé, aucune reconstruction à chaque requête."],
    ["Écriture sûre", "les règles métier sont vérifiées à un seul endroit."],
    ["Historique complet", "rien n'est écrasé, tout est rejouable."],
  ];
  const cw = (W - 2 * MARGIN - 0.4) / 3;
  atouts.forEach(([titre, corps], i) => {
    card(pres, slide, { x: MARGIN + i * (cw + 0.2), y: 5.45, w: cw, h: 1.1, title: titre, body: corps, accent: ACCENT, fontSize: 11, titleSize: 12.5 });
  });
}

function eventSourcingSlide(pres) {
  const slide = contentSlide(pres, {
    part: PART,
    title: "Event Sourcing : l'historique est la source de vérité",
    speaker: SPEAKER,
    notes:
      "L'Event Store est un journal en ajout seul : une ligne par fait métier. L'état d'une évaluation n'est jamais " +
      "stocké comme vérité : il est calculé en appliquant les événements dans l'ordre, avec une fonction pure applyEvent. " +
      "Conséquence : la route POST /assessments/:id/rebuild peut effacer et reconstruire le Read Model à tout moment, " +
      "par exemple après un incident. On l'a testé de bout en bout.",
  });
  const events = [
    ["AssessmentCreated", "BROUILLON"],
    ["AssessmentUpdated", "BROUILLON"],
    ["AssessmentScheduled", "PLANIFIEE"],
    ["AssessmentPublished", "PUBLIEE"],
    ["AssessmentClosingSoonNotified", "PUBLIEE"],
    ["GradingCompleted", "rien de visible"],
    ["ResultPublished", "+ résultat étudiant"],
  ];
  text(slide, "Le journal d'une évaluation", { x: MARGIN, y: 1.6, w: 5, h: 0.3, fontSize: 12.5, bold: true, color: COLORS.ink });
  slide.addShape(pres.shapes.LINE, { x: MARGIN + 0.22, y: 2.15, w: 0, h: 4.3, line: { color: ACCENT, width: 2 } });
  events.forEach(([type, etat], i) => {
    const y = 2.05 + i * 0.63;
    slide.addShape(pres.shapes.OVAL, { x: MARGIN + 0.1, y: y + 0.13, w: 0.24, h: 0.24, fill: { color: COLORS.white }, line: { color: ACCENT, width: 2.5 } });
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: MARGIN + 0.55, y, w: 3.35, h: 0.5, rectRadius: 0.06, fill: { color: COLORS.white }, line: { color: COLORS.line, width: 0.75 } });
    text(slide, type, { x: MARGIN + 0.7, y, w: 3.15, h: 0.5, fontSize: 10.5, fontFace: FONTS.code, color: COLORS.ink, valign: "middle" });
    text(slide, `→ ${etat}`, { x: MARGIN + 4.0, y, w: 1.9, h: 0.5, fontSize: 10, bold: true, color: ACCENT, valign: "middle" });
  });

  // Extrait de la projection.
  const code = [
    "// projections/projectAssessment.js",
    "function applyEvent(state, event) {",
    "  switch (event.type) {",
    "    case \"AssessmentCreated\":",
    "      return { ...payload, status: \"BROUILLON\" };",
    "    case \"AssessmentPublished\":",
    "      return { ...state, status: \"PUBLIEE\" };",
    "    // ...",
    "  }",
    "}",
    "const reconstructState = (events) =>",
    "  events.reduce(applyEvent, null);",
  ];
  const cx = 6.75;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx, y: 1.6, w: W - MARGIN - cx, h: 2.85, rectRadius: 0.08, fill: { color: "0B1F1A" }, line: { color: "0B1F1A", width: 0 } });
  text(slide, code.join("\n"), { x: cx + 0.25, y: 1.75, w: W - MARGIN - cx - 0.4, h: 3.0, fontSize: 10.5, fontFace: FONTS.code, color: "E2ECE8" });

  card(pres, slide, {
    x: cx, y: 4.65, w: W - MARGIN - cx, h: 1.9, title: "POST /assessments/:id/rebuild", accent: ACCENT, fontSize: 11.5,
    body: [
      "rejoue tout l'historique depuis l'Event Store et re-matérialise le Read Model",
      "testé de bout en bout : création → publication → résultat → reconstruction",
    ],
  });
}

function readModelSlide(pres) {
  const slide = contentSlide(pres, {
    part: PART,
    title: "Le Read Model en action : publication et résultats",
    speaker: SPEAKER,
    notes:
      "À gauche, la liste des évaluations de l'enseignant : le statut « Publiée » vient du Read Model, mis à jour par " +
      "l'événement AssessmentPublished. À droite, les résultats de l'étudiant : la note et la moyenne de la classe ne " +
      "s'affichent qu'après ResultPublished, conformément à la règle métier 6. La requête /results calcule aussi la " +
      "répartition des notes par tranches.",
  });
  screenshot(pres, slide, { file: "04-evaluation-publiee.png", x: MARGIN, y: 1.6, w: 5.95, caption: "Enseignant : statut « Publiée » lu dans le Read Model" });
  screenshot(pres, slide, { file: "10-mes-resultats.png", x: MARGIN + 6.2, y: 1.6, w: 5.95, caption: "Étudiant : note et moyenne visibles après ResultPublished" });
  const faits = ["GET /:id/results", "moyenne de la classe", "répartition par tranches de 25 %", "résultats publiés uniquement", "un étudiant ne voit que sa note"];
  let x = MARGIN;
  faits.forEach((f, i) => {
    x += pill(pres, slide, { x, y: 6.45, label: f, color: ACCENT, code: i === 0 }) + 0.15;
  });
}

module.exports = (pres) => {
  sectionSlide(pres, {
    number: 4,
    title: "CQRS & Event Sourcing",
    subtitle: "assessment-service : séparer écriture et lecture, garder tout l'historique",
    speaker: SPEAKER,
    topics: ["Séparation écriture / lecture", "Event Store et reconstruction", "Le Read Model en action"],
  });
  cqrsSlide(pres);
  eventSourcingSlide(pres);
  readModelSlide(pres);
};
