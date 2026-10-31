// Partie 5 — Saga, fiabilité & tests (Mame Bara Samb).
// Sources : docs/architecture.md (Saga), grading-service (relance),
// submission-service (resoumission, dead-letters), frontend/, */test, e2e/.
const { COLORS, FONTS, SPEAKERS } = require("../lib/theme");
const { W, MARGIN, text, contentSlide, sectionSlide, box, arrow, pill, card, screenshot, table } = require("../lib/kit");

const SPEAKER = "bara";
const PART = "Partie 5 · Saga, fiabilité & tests";
const ACCENT = SPEAKERS[SPEAKER].color;

// Étape de Saga : service + action, reliée à la suivante par un événement.
function sagaStep(pres, slide, { x, y, w, service, action, color = COLORS.group2 }) {
  box(pres, slide, { x, y, w, h: 1.05, label: service, sub: action, stripe: color, fontSize: 12.5 });
}

function sagaSlide(pres) {
  const slide = contentSlide(pres, {
    part: PART,
    title: "La Saga chorégraphiée : Soumission → Correction → Notification",
    speaker: SPEAKER,
    notes:
      "Une soumission traverse trois services sans transaction distribuée. Pas de chef d'orchestre : chaque service " +
      "réagit à un événement et en publie un autre. C'est une Saga chorégraphiée. Chaque étape est locale et " +
      "idempotente : un événement rejoué ne crée pas de doublon. La cohérence est atteinte à terme.",
  });
  const y = 1.9;
  const w = 2.2;
  const xs = [MARGIN, 3.6, 6.6, 9.6];
  sagaStep(pres, slide, { x: xs[0], y, w, service: "Étudiant", action: "soumet sa copie", color: COLORS.group1 });
  sagaStep(pres, slide, { x: xs[1], y, w, service: "submission", action: "horodate, statut SOUMISE" });
  sagaStep(pres, slide, { x: xs[2], y, w, service: "grading", action: "correction automatique" });
  sagaStep(pres, slide, { x: xs[3], y, w: W - MARGIN - xs[3], service: "Enseignant", action: "corrige le reste, valide", color: COLORS.group1 });
  arrow(pres, slide, xs[0] + w, y + 0.52, xs[1], y + 0.52, { color: COLORS.ink, label: "REST", labelW: 0.6, labelOffset: -0.25 });
  arrow(pres, slide, xs[1] + w, y + 0.52, xs[2], y + 0.52, { color: COLORS.rabbit, width: 2.25 });
  arrow(pres, slide, xs[2] + w, y + 0.52, xs[3], y + 0.52, { color: COLORS.ink, label: "REST", labelW: 0.6, labelOffset: -0.25 });
  pill(pres, slide, { x: xs[1] + w - 0.15, y: y - 0.42, label: "submission.completed", color: COLORS.rabbit, code: true, fontSize: 9, w: 1.95 });

  // Fin de la Saga : deux événements, trois consommateurs.
  const y2 = 3.75;
  arrow(pres, slide, xs[3] + 1.5, y + 1.05, xs[3] + 1.5, y2 - 0.05, { color: COLORS.rabbit, width: 2.25 });
  pill(pres, slide, { x: xs[3] + 1.62, y: y + 1.25, label: "grading.completed", color: COLORS.rabbit, code: true, fontSize: 9, w: 1.5 });
  pill(pres, slide, { x: xs[3] + 1.62, y: y + 1.58, label: "result.published", color: COLORS.rabbit, code: true, fontSize: 9, w: 1.5 });
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: MARGIN, y: y2, w: W - 2 * MARGIN, h: 0.5, rectRadius: 0.1, fill: { color: COLORS.rabbit }, line: { color: COLORS.rabbit, width: 0 } });
  text(slide, "RabbitMQ · evaluations.events", { x: MARGIN, y: y2, w: W - 2 * MARGIN, h: 0.5, fontSize: 12, bold: true, color: COLORS.white, align: "center", valign: "middle" });
  const consommateurs = [
    ["assessment", "Read Model : note et statistiques"],
    ["submission", "copie marquée « résultat publié »"],
    ["notification", "prévient l'étudiant"],
  ];
  const cw = (W - 2 * MARGIN - 0.5) / 3;
  consommateurs.forEach(([service, action], i) => {
    const x = MARGIN + i * (cw + 0.25);
    arrow(pres, slide, x + cw / 2, y2 + 0.5, x + cw / 2, 4.65, { color: COLORS.rabbit, width: 1.75 });
    box(pres, slide, { x, y: 4.65, w: cw, h: 0.85, label: service, sub: action, stripe: i === 0 ? COLORS.group1 : COLORS.group2, fontSize: 12 });
  });
  const principes = [["Sans coordinateur", "chaque service réagit seul"], ["Transactions locales", "une base, une transaction"], ["Idempotence", "un événement rejoué est ignoré"]];
  principes.forEach(([titre, corps], i) => {
    const x = MARGIN + i * (cw + 0.25);
    text(slide, [
      { text: `${titre} · `, options: { bold: true, color: ACCENT } },
      { text: corps, options: { color: COLORS.text } },
    ], { x, y: 5.8, w: cw, h: 0.6, fontSize: 11.5, align: "center", valign: "middle" });
  });
}

function compensationSlide(pres) {
  const slide = contentSlide(pres, {
    part: PART,
    title: "Compensation : la Saga gère aussi les échecs",
    speaker: SPEAKER,
    notes:
      "Premier scénario : question-service tombe pendant une correction. La copie n'est pas perdue : elle reste " +
      "EN_ATTENTE et grading-service la relance toutes les 30 secondes. Après 5 échecs, elle passe en ECHEC_CORRECTION " +
      "et grading.failed déclenche la compensation : submission-service signale l'incident sur la copie, l'étudiant et " +
      "l'enseignant sont prévenus, et l'enseignant peut relancer. Deuxième scénario : hors délai, aucune correction " +
      "n'est lancée. Enfin, un message qui échoue n'est jamais perdu : il part dans une file de dead-letters.",
  });
  text(slide, "Correction automatique impossible (service distant en panne)", { x: MARGIN, y: 1.55, w: 9, h: 0.32, fontSize: 12.5, bold: true, color: COLORS.danger });
  const y = 2.0;
  const steps = [
    ["EN_ATTENTE", "relance toutes les 30 s", COLORS.warnSoft, COLORS.group2],
    ["ECHEC_CORRECTION", "après 5 tentatives", COLORS.dangerSoft, COLORS.danger],
    ["submission", "incident signalé sur la copie", COLORS.white, COLORS.group2],
    ["Enseignant", "POST /gradings/:id/retry", COLORS.infoSoft, COLORS.group1],
    ["grading.completed", "incident effacé", COLORS.mintSoft, COLORS.mongo],
  ];
  const sw = 2.15;
  const gap = (W - 2 * MARGIN - 5 * sw) / 4;
  steps.forEach(([label, sub, fill, line], i) => {
    const x = MARGIN + i * (sw + gap);
    box(pres, slide, { x, y, w: sw, h: 0.95, label, sub, fill, line, shadowed: false, fontSize: 11.5 });
    if (i < 4) arrow(pres, slide, x + sw, y + 0.47, x + sw + gap, y + 0.47, { color: i === 1 ? COLORS.rabbit : COLORS.ink, width: 1.75 });
  });
  // Étiquette centrée sous la flèche ECHEC_CORRECTION → submission.
  const failedX = MARGIN + 2 * sw + 1.5 * gap;
  pill(pres, slide, { x: failedX - 0.7, y: y + 1.08, label: "grading.failed", color: COLORS.rabbit, code: true, fontSize: 9, w: 1.4 });
  text(slide, "+ notification à l'étudiant et à l'enseignant", { x: failedX + 0.85, y: y + 1.08, w: 3.6, h: 0.28, fontSize: 9.5, italic: true, color: COLORS.muted, valign: "middle" });

  const cw = (W - 2 * MARGIN - 0.25) / 2;
  card(pres, slide, {
    x: MARGIN, y: 3.85, w: cw, h: 2.45, title: "Soumission hors délai", accent: COLORS.danger, fontSize: 11.5,
    body: [
      ["Statut", "REFUSEE_HORS_DELAI, la copie n'est plus modifiable"],
      ["Pas de correction", "submission.completed n'est pas publié"],
      ["Événement", "submission.rejected → l'étudiant est notifié"],
      ["Règle métier 2", "refus automatique, testé en e2e"],
    ],
  });
  card(pres, slide, {
    x: MARGIN + cw + 0.25, y: 3.85, w: cw, h: 2.45, title: "Files de dead-letters", accent: COLORS.rabbit, fontSize: 11.5,
    body: [
      ["Avant", "un message en erreur était rejeté puis perdu"],
      ["Maintenant", "copié dans <queue>.dead-letters puis acquitté"],
      ["Traçabilité", "en-têtes x-routing-key, x-error, x-failed-at"],
      ["Reprise", "inspecté et rejoué depuis l'interface RabbitMQ"],
    ],
  });
}

function securitySlide(pres) {
  const slide = contentSlide(pres, {
    part: PART,
    title: "Sécurité renforcée et resoumission autorisée",
    speaker: SPEAKER,
    notes:
      "Plusieurs failles ont été corrigées : un étudiant ne lit que sa propre copie, les bonnes réponses ne sont " +
      "jamais envoyées aux étudiants, les types de fichiers déposés sont filtrés, et assessment-service applique " +
      "l'identité transmise par la gateway. À droite, la règle métier 3 : l'enseignant responsable peut autoriser une " +
      "resoumission, avec une date limite propre à la copie. grading-service abandonne alors la correction non validée.",
  });
  card(pres, slide, {
    x: MARGIN, y: 1.6, w: 5.6, h: 4.95, title: "Durcissement de la sécurité", accent: ACCENT, fontSize: 12,
    body: [
      ["Copies", "un étudiant n'accède qu'à sa propre copie"],
      ["Questions", "les bonnes réponses ne sont jamais exposées aux étudiants"],
      ["Dépôts", "types de fichiers filtrés, taille limitée à 10 Mo"],
      ["Identité", "assessment-service applique l'identité transmise par la gateway"],
      ["Correction", "seul l'enseignant responsable note et valide (403 sinon)"],
      ["Usurpation", "les en-têtes X-User-* du client sont supprimés"],
    ],
  });
  const rx = MARGIN + 5.85;
  const rw = W - MARGIN - rx;
  text(slide, "Resoumission (règle métier 3)", { x: rx, y: 1.6, w: rw, h: 0.32, fontSize: 13, bold: true, color: COLORS.ink });
  const flux = [
    ["Enseignant responsable", "POST /submissions/:id/reopen"],
    ["submission", "copie → EN_COURS, date limite propre"],
    ["grading", "abandonne la correction non validée"],
  ];
  flux.forEach(([label, sub], i) => {
    const x = rx + i * (rw / 3);
    box(pres, slide, { x, y: 2.05, w: rw / 3 - 0.3, h: 0.95, label, sub, stripe: i === 0 ? COLORS.group1 : COLORS.group2, fontSize: 10.5 });
    if (i < 2) arrow(pres, slide, x + rw / 3 - 0.3, 2.52, x + rw / 3, 2.52, { color: i === 1 ? COLORS.rabbit : COLORS.ink, width: 1.75 });
  });
  pill(pres, slide, { x: rx + rw / 3 + 0.05, y: 3.12, label: "submission.reopened", color: COLORS.rabbit, code: true, fontSize: 9, w: 1.85 });
  text(slide, "Refusée si le résultat est déjà publié.", { x: rx + rw / 3 + 2.0, y: 3.1, w: 2.6, h: 0.32, fontSize: 9.5, italic: true, color: COLORS.muted });
  const sw = 3.9;
  screenshot(pres, slide, { file: "08-correction-copie.png", x: rx + (rw - sw) / 2, y: 3.6, w: sw, caption: "Page de correction : bouton « Autoriser une resoumission »" });
}

function frontendSlide(pres) {
  const slide = contentSlide(pres, {
    part: PART,
    title: "Frontend React : une seule porte d'entrée, l'API Gateway",
    speaker: SPEAKER,
    notes:
      "Le frontend est une application React construite avec Vite et Tailwind CSS. Le socle (structure, design, " +
      "pages Questions et Évaluations) a été posé par Makhtar Wade au premier sprint, puis complété avec la connexion " +
      "réelle, les vues étudiant, correction et administration. Point clé pour l'architecture : le navigateur ne parle " +
      "qu'à l'API Gateway, jamais directement aux microservices.",
  });
  screenshot(pres, slide, { file: "03-selecteur-de-questions.png", x: MARGIN, y: 1.6, w: 5.95, caption: "Création d'une évaluation avec le sélecteur de questions" });
  screenshot(pres, slide, { file: "02-banque-de-questions.png", x: MARGIN + 6.2, y: 1.6, w: 5.95, caption: "Banque de questions" });
  const techs = ["React 19", "Vite", "Tailwind CSS v4", "Routes protégées par rôle", "Tous les appels via /api → api-gateway"];
  let x = MARGIN;
  techs.forEach((t) => {
    x += pill(pres, slide, { x, y: 6.45, label: t, color: ACCENT }) + 0.15;
  });
}

function testsSlide(pres) {
  const slide = contentSlide(pres, {
    part: PART,
    title: "274 tests automatisés, du service au parcours complet",
    speaker: SPEAKER,
    notes:
      "234 tests unitaires couvrent les sept services, avec node:test et sans dépendance. 40 tests de bout en bout " +
      "démarrent une infrastructure jetable (MongoDB et RabbitMQ sur d'autres ports), lancent les sept services et " +
      "passent par la gateway avec de vrais JWT, y compris en arrêtant question-service pour tester la compensation. " +
      "Enfin, un test pilote l'interface React dans Chrome : c'est lui qui a produit les captures de cette présentation.",
  });
  const data = [{
    name: "Tests unitaires",
    labels: ["grading", "assessment", "submission", "user", "api-gateway", "notification", "question"],
    values: [58, 53, 40, 33, 19, 17, 14],
  }];
  text(slide, "Tests unitaires par service (234)", { x: MARGIN, y: 1.55, w: 5.8, h: 0.32, fontSize: 12.5, bold: true, color: COLORS.ink });
  slide.addChart(pres.charts.BAR, data, {
    x: MARGIN, y: 1.9, w: 5.8, h: 4.6, barDir: "bar", chartColors: [ACCENT],
    catAxisLabelFontFace: FONTS.body, catAxisLabelFontSize: 11, catAxisLabelColor: COLORS.ink, catAxisOrientation: "maxMin",
    valAxisHidden: true, valGridLine: { style: "none" }, catAxisLineShow: false,
    showValue: true, dataLabelFontSize: 11, dataLabelColor: COLORS.ink, dataLabelPosition: "outEnd", barGapWidthPct: 45,
  });

  const rx = 6.75;
  const rw = W - MARGIN - rx;
  text(slide, "Scénarios bout-en-bout (40 tests)", { x: rx, y: 1.55, w: rw, h: 0.32, fontSize: 12.5, bold: true, color: COLORS.ink });
  table(slide, [
    ["Scénario", "Tests", "Vérifie"],
    [{ text: "parcours-complet", code: true }, "12", "création → publication → soumission → résultat"],
    [{ text: "echec-correction", code: true }, "10", "question-service arrêté, relance et compensation"],
    [{ text: "securite-et-planification", code: true }, "8", "rôles, accès aux copies, publication planifiée"],
    [{ text: "echec-hors-delai", code: true }, "7", "refus automatique et notification"],
    [{ text: "resoumission", code: true }, "3", "réouverture par l'enseignant responsable"],
  ], { x: rx, y: 1.95, w: rw, colW: [2.15, 0.65, 3.18], fontSize: 10, rowH: 0.5 });
  card(pres, slide, {
    x: rx, y: 5.15, w: rw, h: 1.4, title: "Infrastructure jetable", accent: ACCENT, fontSize: 10.5, titleSize: 12,
    body: "MongoDB et RabbitMQ dédiés (ports 27018 et 5673), 7 services lancés, vrais JWT via la gateway, puis tout est supprimé.",
  });
}

module.exports = (pres) => {
  sectionSlide(pres, {
    number: 5,
    title: "Saga, fiabilité & tests",
    subtitle: "Rester cohérent quand un service tombe, et le prouver",
    speaker: SPEAKER,
    topics: ["La Saga chorégraphiée", "Compensation et dead-letters", "Sécurité et resoumission", "Frontend React", "Tests unitaires et bout-en-bout"],
  });
  sagaSlide(pres);
  compensationSlide(pres);
  securitySlide(pres);
  frontendSlide(pres);
  testsSlide(pres);
};
