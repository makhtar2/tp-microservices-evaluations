// Partie 2 — Conception DDD & domaine Questions (Makhtar Wade).
// Sources : docs/ddd-analysis.md, docs/protos/question.proto, frontend/.
const { COLORS, FONTS, SPEAKERS } = require("../lib/theme");
const { W, MARGIN, text, contentSlide, sectionSlide, box, arrow, pill, card, bullets, screenshot } = require("../lib/kit");

const SPEAKER = "wade";
const PART = "Partie 2 · Conception DDD & domaine Questions";
const ACCENT = SPEAKERS[SPEAKER].color;
const TYPE_COLORS = { Cœur: COLORS.group1, Support: COLORS.muted, Générique: SPEAKERS.fatou.color };

function contextsSlide(pres) {
  const slide = contentSlide(pres, {
    part: PART,
    title: "Un Bounded Context = un microservice = une base",
    speaker: SPEAKER,
    notes:
      "L'analyse DDD a découpé le domaine en six sous-domaines. Quatre sont au cœur du métier, la gestion des " +
      "utilisateurs est un support et la notification est générique. Chaque Bounded Context devient un microservice " +
      "qui possède ses propres données : aucun modèle n'est partagé, les contextes n'échangent que des identifiants " +
      "et des événements.",
  });
  const contextes = [
    ["User", "Support", "user-service", "User, Role", "Authentification, comptes et rôles"],
    ["Question", "Cœur", "question-service", "Question, AnswerKey", "Banque de questions, sélection par critères"],
    ["Assessment", "Cœur", "assessment-service", "Assessment (agrégat), Schedule", "Construction, planification, publication"],
    ["Submission", "Cœur", "submission-service", "Submission (agrégat), FileDeposit", "Réalisation, dépôt, soumission horodatée"],
    ["Grading", "Cœur", "grading-service", "Grade (agrégat), Comment", "Correction automatique et manuelle"],
    ["Notification", "Générique", "notification-service", "Notification", "Diffusion des événements aux utilisateurs"],
  ];
  const gap = 0.22;
  const cw = (W - 2 * MARGIN - 2 * gap) / 3;
  const ch = 2.15;
  contextes.forEach(([nom, type, service, entites, role], i) => {
    const x = MARGIN + (i % 3) * (cw + gap);
    const y = 1.6 + Math.floor(i / 3) * (ch + 0.2);
    card(pres, slide, {
      x, y, w: cw, h: ch, title: `${nom} Context`, accent: TYPE_COLORS[type], fontSize: 11.5,
      body: [["Service", service], ["Entités", entites], ["Rôle", role]],
    });
    pill(pres, slide, { x: x + cw - 1.3, y: y + 0.24, label: type, color: TYPE_COLORS[type], w: 1.1 });
  });
  text(slide, [
    { text: "Pas de Shared Kernel : ", options: { bold: true, color: COLORS.ink } },
    { text: "les contextes s'échangent des identifiants (userId, questionId, assessmentId) et des événements, jamais leurs modèles internes.", options: { color: COLORS.text } },
  ], { x: MARGIN, y: 6.4, w: W - 2 * MARGIN, h: 0.4, fontSize: 12 });
}

function contextMapSlide(pres) {
  const slide = contentSlide(pres, {
    part: PART,
    title: "Context Map : comment les contextes coopèrent",
    speaker: SPEAKER,
    notes:
      "Trois types de relations. En haut, tous les contextes se conforment au jeton JWT émis par user-service " +
      "(Conformist) : pas d'appel synchrone à chaque requête. Assessment est client de Question via gRPC " +
      "(Customer/Supplier). Tout le reste passe par des événements publiés (Published Language), ce qui découple " +
      "les services : l'émetteur ne connaît pas ses consommateurs.",
  });
  const bw = 2.05;
  const bh = 0.85;
  const rowY = 3.75;
  const xs = [0.75, 3.95, 7.15, 10.35];
  const noms = ["Question", "Assessment", "Submission", "Grading"];
  const groupes = [COLORS.group1, COLORS.group1, COLORS.group2, COLORS.group2];

  box(pres, slide, { x: 5.6, y: 1.6, w: bw, h: bh, label: "User", sub: "émet le JWT", stripe: COLORS.group2 });
  // Bus « Conformist » : chaque contexte valide localement le JWT.
  slide.addShape(pres.shapes.LINE, { x: xs[0] + bw / 2, y: 3.05, w: xs[3] - xs[0], h: 0, line: { color: COLORS.muted, width: 1.25, dashType: "dash" } });
  arrow(pres, slide, 5.6 + bw / 2, 1.6 + bh, 5.6 + bw / 2, 3.05, { dash: "dash", width: 1.25 });
  text(slide, "Conformist · JWT / claims", { x: 6.85, y: 2.55, w: 2.6, h: 0.3, fontSize: 9.5, bold: true, color: COLORS.muted });

  noms.forEach((nom, i) => {
    arrow(pres, slide, xs[i] + bw / 2, 3.05, xs[i] + bw / 2, rowY, { dash: "dash", width: 1.25 });
    box(pres, slide, { x: xs[i], y: rowY, w: bw, h: bh, label: nom, stripe: groupes[i] });
  });
  box(pres, slide, { x: 5.6, y: 5.75, w: bw, h: bh, label: "Notification", stripe: COLORS.group2 });

  arrow(pres, slide, xs[1], rowY + bh / 2, xs[0] + bw, rowY + bh / 2, { color: COLORS.group1, width: 2, label: "gRPC", labelW: 0.7, labelOffset: -0.3 });
  text(slide, "Customer / Supplier", { x: xs[0] + bw, y: rowY + bh / 2 + 0.08, w: xs[1] - xs[0] - bw, h: 0.3, fontSize: 8.5, color: COLORS.group1, align: "center" });
  arrow(pres, slide, xs[1] + bw, rowY + bh / 2, xs[2], rowY + bh / 2, { color: COLORS.rabbit, width: 2, label: "AssessmentPublished", labelW: 1.3, labelSize: 8, labelOffset: -0.3 });
  arrow(pres, slide, xs[2] + bw, rowY + bh / 2, xs[3], rowY + bh / 2, { color: COLORS.rabbit, width: 2, label: "SubmissionCompleted", labelW: 1.3, labelSize: 8, labelOffset: -0.3 });
  [1, 2, 3].forEach((i) => {
    arrow(pres, slide, xs[i] + bw / 2, rowY + bh, 5.6 + bw / 2 + (i - 2) * 0.6, 5.75, { color: COLORS.rabbit, width: 1.5 });
  });
  text(slide, "Published Language · événements", { x: 8.0, y: 5.95, w: 3.2, h: 0.3, fontSize: 9.5, bold: true, color: COLORS.rabbit });

  // Légende.
  const legende = [
    [COLORS.group1, "solid", "Appel synchrone (gRPC)"],
    [COLORS.rabbit, "solid", "Événement asynchrone (RabbitMQ)"],
    [COLORS.muted, "dash", "Jeton JWT validé localement"],
  ];
  legende.forEach(([color, dash, libelle], i) => {
    const y = 1.75 + i * 0.32;
    slide.addShape(pres.shapes.LINE, { x: 9.45, y: y + 0.13, w: 0.5, h: 0, line: { color, width: 2, dashType: dash } });
    text(slide, libelle, { x: 10.05, y, w: 2.7, h: 0.28, fontSize: 9.5, color: COLORS.text, valign: "middle" });
  });
}

function questionSlide(pres) {
  const slide = contentSlide(pres, {
    part: PART,
    title: "question-service : une banque, deux interfaces",
    speaker: SPEAKER,
    notes:
      "question-service gère la banque : quatre types de questions, filtres par matière, difficulté et thème, " +
      "archivage sans suppression en cascade. Pour générer une évaluation automatiquement, assessment-service appelle " +
      "SelectQuestions en gRPC : c'est le seul appel synchrone entre services, parce que l'enseignant attend la réponse. " +
      "Le contrat .proto est partagé dans docs/protos.",
  });
  card(pres, slide, {
    x: MARGIN, y: 1.6, w: 4.6, h: 4.95, title: "Banque de questions", accent: ACCENT, fontSize: 12,
    body: [
      ["REST", "CRUD sur /api/questions (port 3002)"],
      ["Filtres", "matière, difficulté, thème"],
      ["Archivage", "suppression douce, les évaluations passées restent intactes"],
      ["MongoDB", "base question_service, propre au service"],
      ["Confidentialité", "les bonnes réponses ne sont jamais renvoyées aux étudiants"],
    ],
  });
  ["QCM", "VRAI_FAUX", "QUESTION_COURTE", "QUESTION_OUVERTE"].forEach((type, i) => {
    pill(pres, slide, { x: MARGIN + 0.3 + (i % 2) * 2.05, y: 5.45 + Math.floor(i / 2) * 0.4, label: type, color: ACCENT, w: 1.95, code: true, fontSize: 9 });
  });
  text(slide, "Types de questions", { x: MARGIN + 0.3, y: 5.08, w: 3, h: 0.3, fontSize: 10.5, bold: true, color: COLORS.muted });

  // Génération automatique : enseignant → assessment → gRPC → question → MongoDB.
  const x0 = 5.55;
  const y0 = 1.75;
  box(pres, slide, { x: x0, y: y0, w: 1.7, h: 0.75, label: "Enseignant", sub: "interface", fill: COLORS.infoSoft, line: COLORS.group1, shadowed: false });
  box(pres, slide, { x: x0 + 2.45, y: y0, w: 1.95, h: 0.75, label: "assessment", sub: "port 3003", stripe: COLORS.group1 });
  box(pres, slide, { x: x0 + 5.15, y: y0, w: 1.95, h: 0.75, label: "question", sub: "gRPC 50052", stripe: COLORS.group1 });
  arrow(pres, slide, x0 + 1.7, y0 + 0.375, x0 + 2.45, y0 + 0.375, { color: COLORS.muted, label: "REST", labelW: 0.55, labelOffset: -0.25 });
  arrow(pres, slide, x0 + 4.4, y0 + 0.3, x0 + 5.15, y0 + 0.3, { color: COLORS.group1, width: 2 });
  arrow(pres, slide, x0 + 5.15, y0 + 0.5, x0 + 4.4, y0 + 0.5, { color: COLORS.group1, width: 1.25, dash: "dash" });
  text(slide, "SelectQuestions", { x: x0 + 4.2, y: y0 - 0.32, w: 1.2, h: 0.28, fontSize: 9, bold: true, color: COLORS.group1, align: "center" });

  // Extrait du contrat .proto.
  const code = [
    "service QuestionService {",
    "  rpc SelectQuestions (SelectQuestionsRequest)",
    "      returns (SelectQuestionsResponse);",
    "}",
    "message SelectQuestionsRequest {",
    "  string subject = 1;            // matière",
    "  int32 count = 2;               // nombre voulu",
    "  DifficultyDistribution difficulty = 3;  // % facile/moyen/difficile",
    "  repeated string themes = 4;",
    "}",
  ];
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x0, y: 2.85, w: 7.1, h: 2.65, rectRadius: 0.08, fill: { color: "0B1F1A" }, line: { color: "0B1F1A", width: 0 } });
  text(slide, "docs/protos/question.proto", { x: x0 + 0.25, y: 2.95, w: 4, h: 0.3, fontSize: 9, color: COLORS.mint, fontFace: FONTS.code });
  text(slide, code.join("\n"), { x: x0 + 0.25, y: 3.3, w: 6.7, h: 2.45, fontSize: 10.5, color: "E2ECE8", fontFace: FONTS.code });
  text(slide, [
    { text: "Pourquoi gRPC ici ? ", options: { bold: true, color: COLORS.ink } },
    { text: "l'enseignant attend la réponse, le contrat est typé et le binaire Protobuf est compact.", options: { color: COLORS.text } },
  ], { x: x0, y: 5.75, w: 7.1, h: 0.75, fontSize: 12.5 });
}

function frontendSlide(pres) {
  const slide = contentSlide(pres, {
    part: PART,
    title: "Frontend React : une seule porte d'entrée, l'API Gateway",
    speaker: SPEAKER,
    notes:
      "Le frontend est une application React construite avec Vite et Tailwind CSS. Le socle (structure, design, " +
      "pages Questions et Évaluations) a été posé au premier sprint, puis complété par Mame Bara Samb avec les vues " +
      "étudiant, correction et administration. Point clé pour l'architecture : le navigateur ne parle qu'à l'API Gateway, " +
      "jamais directement aux microservices.",
  });
  screenshot(pres, slide, { file: "03-selecteur-de-questions.png", x: MARGIN, y: 1.6, w: 5.95, caption: "Création d'une évaluation avec le sélecteur de questions" });
  screenshot(pres, slide, { file: "02-banque-de-questions.png", x: MARGIN + 6.2, y: 1.6, w: 5.95, caption: "Banque de questions" });
  const techs = ["React 19", "Vite", "Tailwind CSS v4", "Routes protégées par rôle", "Tous les appels via /api → api-gateway"];
  let x = MARGIN;
  techs.forEach((t) => {
    x += pill(pres, slide, { x, y: 6.45, label: t, color: ACCENT }) + 0.15;
  });
}

module.exports = (pres) => {
  sectionSlide(pres, {
    number: 2,
    title: "Conception DDD & domaine Questions",
    subtitle: "Du domaine métier au découpage en services",
    speaker: SPEAKER,
    topics: ["Sous-domaines et Bounded Contexts", "Context Map", "question-service et gRPC", "Frontend React"],
  });
  contextsSlide(pres);
  contextMapSlide(pres);
  questionSlide(pres);
  frontendSlide(pres);
};
