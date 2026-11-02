// Conclusion : principes appliqués, bilan et perspectives, remerciements.
const { COLORS, FONTS } = require("../lib/theme");
const { CONCLUSION } = require("../lib/plan");
const { addNotes, W, H, MARGIN, text, contentSlide, card, table } = require("../lib/kit");

const PART = "Conclusion";
const [PRINCIPES, BILAN] = CONCLUSION;

function principlesSlide(pres) {
  const slide = contentSlide(pres, {
    part: PART,
    title: "Principes des systèmes distribués appliqués",
    speaker: PRINCIPES.speaker,
  });
  table(slide, [
    ["Principe", "Dans le projet"],
    ["Une base par service", "Chaque service est seul propriétaire de ses données. Aucun service ne lit la base d'un autre."],
    ["Couplage faible", "Les services publient des événements. L'émetteur ne connaît pas ses consommateurs."],
    ["Synchrone ou asynchrone", "gRPC quand on attend la réponse, événements dans les autres cas."],
    ["Tolérance aux pannes", "Si le broker est absent, le REST continue. Si un service est absent : relance, compensation, dead-letters."],
    ["Sécurité à deux niveaux", "La gateway authentifie et filtre par rôle. Chaque service applique ses règles fines."],
    ["Déploiement indépendant", "Un conteneur par service : on peut reconstruire ou redémarrer un service seul."],
  ], { x: MARGIN, y: 1.5, w: W - 2 * MARGIN, colW: [3.4, 8.733], fontSize: 15, rowH: 0.68 });
}

function bilanSlide(pres) {
  const slide = contentSlide(pres, {
    part: PART,
    title: "Bilan et perspectives",
    speaker: BILAN.speaker,
  });
  const cw = (W - 2 * MARGIN - 0.3) / 2;
  card(pres, slide, {
    x: MARGIN, y: 1.5, w: cw, h: 4.9, title: "Bilan", fontSize: 15, titleSize: 17,
    body: [
      "6 microservices et une API Gateway",
      "6 bases MongoDB, une par service",
      "REST, gRPC et AMQP",
      "8 événements métier",
      "234 tests unitaires et 40 tests de bout en bout",
      "15 conteneurs avec Docker Compose",
    ],
  });
  card(pres, slide, {
    x: MARGIN + cw + 0.3, y: 1.5, w: cw, h: 4.9, title: "Perspectives", fontSize: 15, titleSize: 17,
    body: [
      "Kubernetes pour la réplication des services",
      "Traces distribuées (OpenTelemetry) et logs centralisés",
      "Pattern Outbox pour publier les événements de façon atomique",
      "Disjoncteur (circuit breaker) sur l'appel gRPC",
      "Remise en place de l'intégration continue",
    ],
  });
}

function thanksSlide(pres) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.deep };
  text(slide, "Merci pour votre aimable attention", { x: 1, y: H / 2 - 0.6, w: W - 2, h: 1.2, fontSize: 36, fontFace: FONTS.title, color: COLORS.white, align: "center", valign: "middle" });
  addNotes(pres, slide);
}

module.exports = (pres) => {
  principlesSlide(pres);
  bilanSlide(pres);
  thanksSlide(pres);
};
