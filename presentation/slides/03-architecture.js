// Partie 3 — Architecture distribuée (El Hadji Fallou Bousso).
// Sources : README.md, docs/architecture.md, api-gateway/, bindings RabbitMQ
// relevés sur la stack Docker.
const { COLORS, FONTS, SPEAKERS } = require("../lib/theme");
const { W, MARGIN, text, contentSlide, sectionSlide, box, arrow, pill, card, table, screenshot } = require("../lib/kit");

const SPEAKER = "fallou";
const PART = "Partie 3 · Architecture distribuée";
const ACCENT = SPEAKERS[SPEAKER].color;
const REST = "64748B";

function overviewSlide(pres) {
  const slide = contentSlide(pres, {
    part: PART,
    title: "Vue d'ensemble : 6 services, 6 bases, 1 bus",
    speaker: SPEAKER,
    notes:
      "Le navigateur ne connaît qu'une adresse : l'API Gateway. Elle vérifie le JWT et route vers le bon service. " +
      "Chaque service a sa propre base MongoDB : personne ne lit la base d'un autre. Les services se parlent de deux " +
      "façons : un seul appel synchrone (gRPC, assessment vers question) et des événements asynchrones sur RabbitMQ " +
      "pour tout le reste. notification-service n'a même pas d'API : il ne fait qu'écouter le bus.",
  });
  const sw = 1.8;
  const gap = (W - 2 * MARGIN - 6 * sw) / 5;
  const xs = Array.from({ length: 6 }, (_, i) => MARGIN + i * (sw + gap));
  const services = [
    ["user", ":3001", COLORS.group2],
    ["question", ":3002 · gRPC 50052", COLORS.group1],
    ["assessment", ":3003 · CQRS/ES", COLORS.group1],
    ["submission", ":3004", COLORS.group2],
    ["grading", ":3005", COLORS.group2],
    ["notification", "worker, sans port", COLORS.group2],
  ];
  const gwRight = xs[4] + sw;

  box(pres, slide, { x: 4.0, y: 1.5, w: 3.0, h: 0.5, label: "Navigateur · React (:5173)", fill: COLORS.infoSoft, line: COLORS.group1, shadowed: false, fontSize: 11 });
  arrow(pres, slide, 5.5, 2.0, 5.5, 2.35, { color: REST, width: 1.75 });
  box(pres, slide, { x: MARGIN, y: 2.35, w: gwRight - MARGIN, h: 0.55, label: "api-gateway :3000", sub: "vérification JWT · contrôle d'accès par rôle · routage /api/*", fill: COLORS.deep, line: COLORS.deep, color: COLORS.white, fontSize: 12 });

  const sy = 3.3;
  const sh = 0.8;
  services.forEach(([nom, sub, stripe], i) => {
    if (i < 5) arrow(pres, slide, xs[i] + sw / 2, 2.9, xs[i] + sw / 2, sy, { color: REST, width: 1.5 });
    box(pres, slide, { x: xs[i], y: sy, w: sw, h: sh, label: nom, sub, stripe, fontSize: 12 });
    // Base propre au service (Database per Service).
    slide.addShape(pres.shapes.CAN, { x: xs[i] + 0.5, y: 4.4, w: 0.8, h: 0.7, fill: { color: COLORS.mongo, transparency: 10 }, line: { color: COLORS.mongo, width: 0.75 } });
    text(slide, "Mongo", { x: xs[i] + 0.45, y: 4.62, w: 0.9, h: 0.4, fontSize: 8.5, bold: true, color: COLORS.white, align: "center", valign: "middle" });
    slide.addShape(pres.shapes.LINE, { x: xs[i] + sw / 2, y: sy + sh, w: 0, h: 4.4 - sy - sh, line: { color: COLORS.mongo, width: 1.25 } });
  });
  arrow(pres, slide, xs[2], sy + 0.4, xs[1] + sw, sy + 0.4, { color: COLORS.group1, width: 2.25 });
  text(slide, "gRPC", { x: xs[1] + sw - 0.1, y: sy - 0.28, w: gap + 0.2, h: 0.26, fontSize: 9, bold: true, color: COLORS.group1, align: "center" });

  // Bus d'événements.
  const busY = 5.75;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: MARGIN, y: busY, w: W - 2 * MARGIN, h: 0.6, rectRadius: 0.1, fill: { color: COLORS.rabbit }, line: { color: COLORS.rabbit, width: 0 }, shadow: undefined });
  text(slide, [
    { text: "RabbitMQ  ", options: { bold: true, fontSize: 13 } },
    { text: "exchange topic « evaluations.events » · 8 événements · 4 queues durables + dead-letters", options: { fontSize: 11 } },
  ], { x: MARGIN + 0.2, y: busY, w: W - 2 * MARGIN - 0.4, h: 0.6, color: COLORS.white, valign: "middle", align: "center" });
  [2, 3, 4, 5].forEach((i) => {
    arrow(pres, slide, xs[i] + 0.22, sy + sh, xs[i] + 0.22, busY, { color: COLORS.rabbit, width: 1.75, both: true });
  });

  const legende = [[REST, "REST / HTTP"], [COLORS.group1, "gRPC"], [COLORS.rabbit, "AMQP (événements)"], [COLORS.mongo, "Base dédiée"]];
  legende.forEach(([color, libelle], i) => {
    const y = 1.48 + (i % 2) * 0.3;
    const x = 8.1 + Math.floor(i / 2) * 2.35;
    slide.addShape(pres.shapes.LINE, { x, y: y + 0.13, w: 0.4, h: 0, line: { color, width: 2.25 } });
    text(slide, libelle, { x: x + 0.5, y, w: 1.8, h: 0.26, fontSize: 9.5, color: COLORS.text, valign: "middle" });
  });
}

function communicationSlide(pres) {
  const slide = contentSlide(pres, {
    part: PART,
    title: "Trois styles de communication, chacun à sa place",
    speaker: SPEAKER,
    notes:
      "REST pour le frontend, parce que c'est universel et lisible. gRPC pour le seul appel inter-services synchrone, " +
      "parce que le contrat est typé et compact. AMQP pour tout le reste : l'asynchrone absorbe les pannes et les pics, " +
      "et permet d'ajouter un consommateur sans modifier le producteur.",
  });
  table(slide, [
    ["Style", "Technologie", "Utilisé pour", "Pourquoi"],
    [{ text: "REST", bold: true, color: REST }, "HTTP + JSON", "Navigateur → api-gateway → services", "Universel, lisible, contrats OpenAPI"],
    [{ text: "gRPC", bold: true, color: COLORS.group1 }, "HTTP/2 + Protobuf", "assessment → question (SelectQuestions)", "Contrat typé, binaire compact, réponse attendue"],
    [{ text: "AMQP", bold: true, color: COLORS.rabbit }, "RabbitMQ, exchange topic", "8 événements métier entre services", "Découplage, résilience, ajout de consommateurs"],
  ], { x: MARGIN, y: 1.65, w: W - 2 * MARGIN, colW: [1.3, 2.4, 4.3, 4.13], fontSize: 12.5, rowH: 0.55 });

  const cw = (W - 2 * MARGIN - 0.3) / 2;
  card(pres, slide, {
    x: MARGIN, y: 4.0, w: cw, h: 1.95, title: "Synchrone (REST, gRPC)", accent: COLORS.group1, fontSize: 12,
    body: [
      ["+", "réponse immédiate, simple à suivre"],
      ["−", "l'appelant attend : si le service appelé tombe, l'appel échoue"],
      ["→", "réservé aux cas où l'utilisateur attend un résultat"],
    ],
  });
  card(pres, slide, {
    x: MARGIN + cw + 0.3, y: 4.0, w: cw, h: 1.95, title: "Asynchrone (événements)", accent: COLORS.rabbit, fontSize: 12,
    body: [
      ["+", "le producteur continue même si un consommateur est en panne"],
      ["+", "les messages attendent dans des queues durables"],
      ["→", "cohérence à terme, gérée par la Saga (partie 5)"],
    ],
  });
  text(slide, [
    { text: "Règle retenue : ", options: { bold: true, color: ACCENT } },
    { text: "un appel synchrone seulement quand l'utilisateur attend la réponse ; sinon, un événement.", options: { color: COLORS.ink } },
  ], { x: MARGIN, y: 6.15, w: W - 2 * MARGIN, h: 0.4, fontSize: 13, align: "center" });
}

function gatewaySlide(pres) {
  const slide = contentSlide(pres, {
    part: PART,
    title: "API Gateway et JWT : authentifier une fois, propager l'identité",
    speaker: SPEAKER,
    notes:
      "Le login passe par user-service, qui signe un JWT contenant l'identifiant et le rôle. Ensuite, chaque requête " +
      "porte ce jeton. La gateway le vérifie une seule fois, applique un contrôle par rôle sur la route, supprime les " +
      "en-têtes d'identité envoyés par le client (anti-usurpation) et transmet X-User-Id et X-User-Role. Le service " +
      "en aval n'a plus qu'à appliquer ses règles fines, par exemple : un étudiant ne lit que sa propre copie.",
  });
  const lanes = [
    ["Navigateur", 1.55, COLORS.group1],
    ["api-gateway", 4.85, COLORS.deep],
    ["user-service", 8.15, COLORS.group2],
    ["submission-service", 11.3, COLORS.group2],
  ];
  lanes.forEach(([nom, cx, color]) => {
    box(pres, slide, { x: cx - 1.0, y: 1.55, w: 2.0, h: 0.5, label: nom, fill: color, line: color, color: COLORS.white, fontSize: 11 });
    slide.addShape(pres.shapes.LINE, { x: cx, y: 2.05, w: 0, h: 4.75, line: { color: COLORS.line, width: 1.25, dashType: "dash" } });
  });
  const [nav, gw, user, sub] = lanes.map((l) => l[1]);
  const msg = (x1, x2, y, label, opts = {}) =>
    arrow(pres, slide, x1, y, x2, y, { color: opts.color || COLORS.ink, width: 1.5, dash: opts.dash, label, labelW: Math.abs(x2 - x1) - 0.2, labelOffset: -0.2, labelSize: 9.5 });

  msg(nav, gw, 2.55, "① POST /api/auth/login");
  msg(gw, user, 2.95, "route publique");
  msg(user, gw, 3.4, "② JWT signé { sub, role }", { dash: "dash", color: COLORS.group2 });
  msg(gw, nav, 3.4, "", { dash: "dash", color: COLORS.group2 });
  msg(nav, gw, 4.0, "③ GET /api/submissions + Bearer JWT");

  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: gw - 1.45, y: 4.2, w: 4.6, h: 1.2, rectRadius: 0.06, fill: { color: COLORS.warnSoft }, line: { color: ACCENT, width: 1 } });
  text(slide, [
    { text: "Dans la gateway", options: { bold: true, color: ACCENT, breakLine: true } },
    { text: "vérifie la signature et l'expiration du JWT", options: { bullet: { code: "25CF", color: ACCENT, indent: 12 }, breakLine: true } },
    { text: "contrôle d'accès par rôle sur la route", options: { bullet: { code: "25CF", color: ACCENT, indent: 12 }, breakLine: true } },
    { text: "supprime les X-User-* envoyés par le client", options: { bullet: { code: "25CF", color: ACCENT, indent: 12 }, breakLine: true } },
    { text: "ajoute X-User-Id et X-User-Role", options: { bullet: { code: "25CF", color: ACCENT, indent: 12 } } },
  ], { x: gw - 1.3, y: 4.26, w: 4.4, h: 1.1, fontSize: 10.5 });

  msg(gw, sub, 5.9, "④ GET /submissions + X-User-Id, X-User-Role");
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: sub - 1.55, y: 4.5, w: 2.25, h: 0.85, rectRadius: 0.06, fill: { color: COLORS.white }, line: { color: COLORS.group2, width: 1 } });
  text(slide, [
    { text: "Contrôle fin", options: { bold: true, color: COLORS.group2, breakLine: true } },
    { text: "un étudiant ne lit que sa propre copie", options: {} },
  ], { x: sub - 1.45, y: 4.55, w: 2.05, h: 0.75, fontSize: 10.5 });
  msg(sub, nav, 6.5, "⑤ 200 (ou 401 / 403)", { dash: "dash", color: COLORS.muted });
}

function eventsSlide(pres) {
  const slide = contentSlide(pres, {
    part: PART,
    title: "Le bus d'événements : qui publie, qui écoute",
    speaker: SPEAKER,
    notes:
      "Un seul exchange de type topic. Chaque service consommateur déclare sa propre queue durable et s'abonne aux " +
      "clés de routage qui l'intéressent. Le tableau est relevé sur RabbitMQ en fonctionnement : 8 événements, 4 queues, " +
      "16 liaisons. Chaque queue a sa file de dead-letters : un message en échec n'est jamais perdu.",
  });
  const events = [
    ["assessment.published", "assessment", "submission, notification"],
    ["assessment.closing_soon", "assessment", "notification"],
    ["submission.completed", "submission", "grading, notification"],
    ["submission.rejected", "submission", "notification"],
    ["submission.reopened", "submission", "grading, notification"],
    ["grading.completed", "grading", "assessment, submission, notification"],
    ["result.published", "grading", "assessment, submission, notification"],
    ["grading.failed", "grading", "submission, notification"],
  ];
  table(slide, [
    ["Routing key", "Producteur", "Consommateurs"],
    ...events.map(([key, prod, cons]) => [{ text: key, code: true, color: COLORS.ink }, prod, cons]),
  ], { x: MARGIN, y: 1.6, w: 7.3, colW: [2.75, 1.45, 3.1], fontSize: 11, rowH: 0.47 });

  const h = screenshot(pres, slide, { file: "rabbitmq-queues-noms.png", x: 8.2, y: 1.6, w: 4.53, ratio: 1391 / 562, caption: "Queues relevées sur RabbitMQ, avec leurs dead-letters" });
  const faits = [["1", "exchange topic durable"], ["4", "queues + 4 dead-letters"], ["16", "liaisons clé → queue"]];
  faits.forEach(([chiffre, libelle], i) => {
    const x = 8.2 + i * 1.53;
    text(slide, chiffre, { x, y: 1.6 + h + 0.6, w: 1.45, h: 0.55, fontSize: 26, bold: true, color: COLORS.rabbit, fontFace: FONTS.title, align: "center" });
    text(slide, libelle, { x, y: 1.6 + h + 1.15, w: 1.45, h: 0.5, fontSize: 9.5, color: COLORS.muted, align: "center" });
  });
}

function lifecycleSlide(pres) {
  const slide = contentSlide(pres, {
    part: PART,
    title: "Soumission et correction : deux services, deux cycles de vie",
    speaker: SPEAKER,
    notes:
      "submission-service et grading-service ne partagent aucune donnée. La copie passe EN_COURS puis SOUMISE, ce qui " +
      "publie submission.completed. grading-service réagit : il corrige automatiquement les questions fermées, " +
      "l'enseignant corrige le reste puis valide, ce qui publie grading.completed et result.published. Les étiquettes " +
      "orange sont des événements : c'est le seul lien entre les deux cycles.",
  });
  const sh = 0.62;
  const state = (x, y, w, label, color, fill, sub) =>
    box(pres, slide, { x, y, w, h: sh, label, sub, fill: fill || COLORS.white, line: color, color: COLORS.ink, fontSize: 10.5, shadowed: false, radius: 0.3 });
  const event = (x, y, label, w) => pill(pres, slide, { x, y, label, color: COLORS.rabbit, code: true, fontSize: 9, w });
  const step = (x1, x2, y, label) => arrow(pres, slide, x1, y, x2, y, { color: COLORS.ink, label, labelW: 1.25, labelOffset: -0.47, labelSize: 9 });

  // submission-service.
  text(slide, "submission-service · la copie", { x: MARGIN, y: 1.6, w: 6, h: 0.3, fontSize: 12.5, bold: true, color: COLORS.group2 });
  const y1 = 2.35;
  state(MARGIN, y1, 2.3, "EN_COURS", COLORS.group2, COLORS.warnSoft, "réponses auto-enregistrées");
  step(MARGIN + 2.3, 4.1, y1 + sh / 2, "soumettre");
  state(4.1, y1, 1.9, "SOUMISE", COLORS.group2, COLORS.warnSoft);
  arrow(pres, slide, 6.0, y1 + sh / 2, 6.6, y1 + sh / 2, { color: COLORS.rabbit, width: 1.5 });
  event(6.65, y1 + 0.17, "submission.completed", 2.2);
  const y2 = 3.3;
  arrow(pres, slide, MARGIN + 1.15, y1 + sh, MARGIN + 1.15, y2, { color: COLORS.danger });
  text(slide, "date de fin dépassée", { x: MARGIN + 1.3, y: y1 + sh + 0.02, w: 1.9, h: 0.3, fontSize: 9, bold: true, color: COLORS.danger });
  state(MARGIN, y2, 2.9, "REFUSEE_HORS_DELAI", COLORS.danger, COLORS.dangerSoft);
  arrow(pres, slide, MARGIN + 2.9, y2 + sh / 2, 4.1, y2 + sh / 2, { color: COLORS.rabbit, width: 1.5 });
  event(4.15, y2 + 0.17, "submission.rejected", 2.05);

  // grading-service.
  slide.addShape(pres.shapes.LINE, { x: MARGIN, y: 4.3, w: W - 2 * MARGIN, h: 0, line: { color: COLORS.line, width: 1 } });
  text(slide, "grading-service · la correction", { x: MARGIN, y: 4.45, w: 6, h: 0.3, fontSize: 12.5, bold: true, color: COLORS.group2 });
  const gy = 5.3;
  event(MARGIN, gy + 0.17, "submission.completed", 2.2);
  arrow(pres, slide, MARGIN + 2.2, gy + sh / 2, MARGIN + 2.6, gy + sh / 2, { color: COLORS.rabbit, width: 1.5 });
  state(MARGIN + 2.6, gy, 2.75, "CORRECTION_AUTO_PARTIELLE", COLORS.group2);
  step(MARGIN + 5.35, MARGIN + 5.95, gy + sh / 2, "notes manuelles");
  state(MARGIN + 5.95, gy, 2.6, "EN_CORRECTION_MANUELLE", COLORS.group2);
  step(MARGIN + 8.55, MARGIN + 9.1, gy + sh / 2, "valider");
  state(MARGIN + 9.1, gy, 1.3, "VALIDEE", COLORS.mongo, COLORS.mintSoft);
  arrow(pres, slide, MARGIN + 10.4, gy + sh / 2, MARGIN + 10.65, gy + sh / 2, { color: COLORS.rabbit, width: 1.5 });
  event(MARGIN + 10.68, gy - 0.05, "grading.completed", 1.45);
  event(MARGIN + 10.68, gy + 0.37, "result.published", 1.45);
  text(slide, "Correction automatique dès réception (QCM, Vrai/Faux, question courte) ; questions ouvertes et devoirs corrigés par l'enseignant.", {
    x: MARGIN, y: gy + 0.8, w: 9.5, h: 0.35, fontSize: 10.5, color: COLORS.text,
  });

  // Encadré : le seul lien entre les deux services est l'événement.
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 9.3, y: 1.65, w: 3.43, h: 1.85, rectRadius: 0.08, fill: { color: COLORS.white }, line: { color: COLORS.rabbit, width: 1 } });
  text(slide, [
    { text: "Aucune donnée partagée", options: { bold: true, color: COLORS.rabbit, fontSize: 13, breakLine: true } },
    { text: "grading-service ne lit jamais la base de submission-service : les réponses voyagent dans l'événement submission.completed.", options: { fontSize: 11, color: COLORS.text, breakLine: true } },
    { text: "Échecs, relances et resoumission : partie 5.", options: { fontSize: 10, italic: true, color: COLORS.muted } },
  ], { x: 9.5, y: 1.8, w: 3.05, h: 1.6, paraSpaceAfter: 6 });
}

module.exports = (pres) => {
  sectionSlide(pres, {
    number: 3,
    title: "Architecture distribuée",
    subtitle: "Le cœur du module : des services autonomes qui coopèrent",
    speaker: SPEAKER,
    topics: ["Vue d'ensemble", "REST, gRPC et AMQP", "API Gateway et JWT", "Bus d'événements RabbitMQ", "Soumission et correction"],
  });
  overviewSlide(pres);
  communicationSlide(pres);
  gatewaySlide(pres);
  eventsSlide(pres);
  lifecycleSlide(pres);
};
