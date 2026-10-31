// Conclusion (Fatou Ngom) : principes démontrés, bilan, perspectives,
// questions.
const { COLORS, FONTS, PROJECT, SPEAKERS } = require("../lib/theme");
const { W, MARGIN, text, contentSlide, card, footer, speakerChip } = require("../lib/kit");

const SPEAKER = "fatou";
const PART = "Conclusion";
const ACCENT = SPEAKERS[SPEAKER].color;

function principlesSlide(pres) {
  const slide = contentSlide(pres, {
    part: PART,
    title: "Ce que le projet démontre : les principes des systèmes distribués",
    speaker: SPEAKER,
    notes:
      "Synthèse des six principes vus pendant la présentation. Chaque carte renvoie à une partie : base par service et " +
      "couplage faible (partie 3), sync/async (partie 3), tolérance aux pannes (partie 5), sécurité (parties 3 et 5), " +
      "déploiement indépendant (partie 6).",
  });
  const principes = [
    ["DB", "Une base par service", "Chaque service est seul propriétaire de ses données ; aucun accès direct à la base d'un autre."],
    ["⇄", "Couplage faible", "Les services publient des faits métier ; l'émetteur ignore qui les consomme."],
    ["↯", "Sync ou async selon le besoin", "gRPC quand on attend la réponse, événements sinon : pas de chaîne d'appels bloquants."],
    ["✚", "Tolérance aux pannes", "Broker absent : le REST continue. Service absent : relance, compensation, dead-letters."],
    ["◈", "Sécurité en deux niveaux", "La gateway authentifie et filtre par rôle ; chaque service applique ses règles fines."],
    ["▣", "Déploiement indépendant", "Un conteneur par service : on reconstruit, redémarre ou réplique un service seul."],
  ];
  const gap = 0.22;
  const cw = (W - 2 * MARGIN - 2 * gap) / 3;
  principes.forEach(([icon, titre, corps], i) => {
    card(pres, slide, {
      x: MARGIN + (i % 3) * (cw + gap), y: 1.6 + Math.floor(i / 3) * 2.5, w: cw, h: 2.3,
      title: titre, body: corps, accent: ACCENT, icon, fontSize: 12.5,
    });
  });
}

function bilanSlide(pres) {
  const slide = contentSlide(pres, {
    part: PART,
    title: "Bilan et perspectives",
    speaker: SPEAKER,
    notes:
      "Les chiffres résument le projet. Les perspectives montrent ce qu'on ferait pour passer en production : " +
      "orchestration Kubernetes, observabilité distribuée, pattern Outbox pour publier les événements de façon " +
      "atomique, disjoncteur sur l'appel gRPC, et retour de l'intégration continue.",
  });
  const chiffres = [
    ["6", "microservices", "+ gateway"],
    ["6", "bases MongoDB", "une par service"],
    ["3", "protocoles", "REST, gRPC, AMQP"],
    ["8", "événements", "16 liaisons"],
    ["274", "tests", "234 unit. + 40 e2e"],
    ["15", "conteneurs", "docker compose"],
  ];
  const sw = (W - 2 * MARGIN - 5 * 0.18) / 6;
  chiffres.forEach(([n, libelle, detail], i) => {
    const x = MARGIN + i * (sw + 0.18);
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.6, w: sw, h: 1.75, rectRadius: 0.08, fill: { color: COLORS.deep }, line: { color: COLORS.deep, width: 0 } });
    text(slide, n, { x, y: 1.7, w: sw, h: 0.8, fontSize: 34, bold: true, color: COLORS.mint, fontFace: FONTS.title, align: "center", valign: "middle" });
    text(slide, libelle, { x, y: 2.5, w: sw, h: 0.35, fontSize: 12.5, bold: true, color: COLORS.white, align: "center", valign: "middle" });
    text(slide, detail, { x, y: 2.85, w: sw, h: 0.3, fontSize: 9.5, color: "B7CCC4", align: "center", valign: "middle" });
  });

  const cw = (W - 2 * MARGIN - 0.25) / 2;
  card(pres, slide, {
    x: MARGIN, y: 3.65, w: cw, h: 2.45, title: "Ce que nous retenons", accent: ACCENT, fontSize: 11.5,
    body: [
      ["Découper par domaine", "le DDD donne des frontières de services naturelles"],
      ["Penser asynchrone", "les événements rendent le système plus robuste"],
      ["Prévoir l'échec", "relance, compensation et dead-letters dès la conception"],
      ["Tout automatiser", "tests, captures et validation de la documentation"],
    ],
  });
  card(pres, slide, {
    x: MARGIN + cw + 0.25, y: 3.65, w: cw, h: 2.45, title: "Perspectives", accent: COLORS.group1, fontSize: 11.5,
    body: [
      ["Kubernetes", "réplication et mise à l'échelle par service"],
      ["Observabilité", "traces distribuées (OpenTelemetry), logs centralisés"],
      ["Pattern Outbox", "écrire en base et publier l'événement de façon atomique"],
      ["Résilience", "disjoncteur (circuit breaker) sur l'appel gRPC, CI rétablie"],
    ],
  });
}

function questionsSlide(pres) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.deep };
  slide.addShape(pres.shapes.OVAL, { x: 8.9, y: -1.4, w: 6.2, h: 6.2, fill: { color: COLORS.deep2 }, line: { color: COLORS.deep2, width: 0 } });
  text(slide, "Merci", { x: MARGIN, y: 1.55, w: 8, h: 1.3, fontSize: 66, bold: true, color: COLORS.white, fontFace: FONTS.title });
  text(slide, "Questions ?", { x: MARGIN, y: 2.85, w: 8, h: 0.8, fontSize: 32, color: COLORS.mint, fontFace: FONTS.title });
  const membres = ["wade", "mbacke", "fallou", "bara", "aidara", "fatou"];
  membres.forEach((key, i) => {
    const s = SPEAKERS[key];
    const x = MARGIN + (i % 3) * 4.0;
    const y = 4.3 + Math.floor(i / 3) * 0.55;
    slide.addShape(pres.shapes.OVAL, { x, y: y + 0.1, w: 0.2, h: 0.2, fill: { color: s.color }, line: { color: s.color, width: 0 } });
    text(slide, s.nom, { x: x + 0.32, y, w: 3.6, h: 0.4, fontSize: 13, color: COLORS.white, valign: "middle" });
  });
  text(slide, [
    { text: "Code source  ", options: { bold: true, color: COLORS.mint } },
    { text: "github.com/makhtar2/tp-microservices-evaluations", options: { color: COLORS.white, fontFace: FONTS.code } },
  ], { x: MARGIN, y: 5.65, w: 9, h: 0.4, fontSize: 12 });
  text(slide, `${PROJECT.universite} · ${PROJECT.classe}`, { x: MARGIN, y: 6.1, w: 10, h: 0.35, fontSize: 11, color: "B7CCC4" });
  speakerChip(pres, slide, "tous", { dark: true });
  footer(pres, slide, { dark: true });
  slide.addNotes("Remercier le jury. Chacun répond aux questions sur la partie qu'il a présentée.");
}

module.exports = (pres) => {
  principlesSlide(pres);
  bilanSlide(pres);
  questionsSlide(pres);
};
