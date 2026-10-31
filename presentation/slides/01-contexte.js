// Partie 1 — Contexte & besoins (Makhtar Wade).
// Source : docs/cahier-de-conception.md.
const { COLORS, FONTS, SPEAKERS } = require("../lib/theme");
const { W, MARGIN, text, contentSlide, sectionSlide, card, pill } = require("../lib/kit");

const SPEAKER = "wade";
const PART = "Partie 1 · Contexte & besoins";
const ACCENT = SPEAKERS[SPEAKER].color;

function problemSlide(pres) {
  const slide = contentSlide(pres, {
    part: PART,
    title: "Le besoin : gérer tout le cycle de vie d'une évaluation",
    speaker: SPEAKER,
    notes:
      "Un établissement veut une plateforme centralisée, modulaire et évolutive. Les enseignants constituent une banque " +
      "de questions, créent et publient des évaluations, puis corrigent. Les étudiants passent les évaluations et " +
      "consultent leurs résultats. La frise montre les 8 étapes du cycle de vie, de la question au résultat.",
  });
  const objectifs = [
    ["◆", "Centralisée", "Une seule plateforme pour enseignants, étudiants et administrateurs, accessible par le web."],
    ["▲", "Modulaire", "Chaque domaine métier est un service indépendant, développé et déployé séparément."],
    ["●", "Évolutive", "On ajoute ou on fait monter en charge un service sans toucher aux autres."],
  ];
  const cw = (W - 2 * MARGIN - 2 * 0.25) / 3;
  objectifs.forEach(([icon, titre, corps], i) => {
    card(pres, slide, { x: MARGIN + i * (cw + 0.25), y: 1.7, w: cw, h: 2.05, title: titre, body: corps, accent: ACCENT, icon, fontSize: 12.5 });
  });

  text(slide, "Cycle de vie couvert par la plateforme", { x: MARGIN, y: 4.3, w: 8, h: 0.35, fontSize: 13, bold: true, color: COLORS.ink });
  const etapes = ["Questions", "Construction", "Planification", "Publication", "Réalisation", "Soumission", "Correction", "Résultats"];
  const stepW = (W - 2 * MARGIN + 7 * 0.12) / 8;
  etapes.forEach((etape, i) => {
    const x = MARGIN + i * (stepW - 0.12);
    const shade = i < 4 ? COLORS.group1 : COLORS.group2;
    slide.addShape(i === 0 ? pres.shapes.PENTAGON : pres.shapes.CHEVRON, {
      x, y: 4.8, w: stepW, h: 1, fill: { color: shade, transparency: i % 2 ? 0 : 15 }, line: { color: COLORS.white, width: 1.5 },
    });
    // Décalage du texte : la pointe du chevron précédent mord sur la gauche.
    text(slide, etape, { x: x + (i === 0 ? 0.1 : 0.38), y: 4.8, w: stepW - (i === 0 ? 0.45 : 0.68), h: 1, fontSize: 11, bold: true, color: COLORS.white, align: "center", valign: "middle" });
  });
  pill(pres, slide, { x: MARGIN, y: 6.05, label: "Groupe 1 : questions et évaluations", color: COLORS.group1, w: 3.2 });
  pill(pres, slide, { x: MARGIN + 3.35, y: 6.05, label: "Groupe 2 : soumission, correction, utilisateurs, notifications", color: COLORS.group2, w: 5.1 });
}

function actorsSlide(pres) {
  const slide = contentSlide(pres, {
    part: PART,
    title: "Trois acteurs, dix fonctionnalités",
    speaker: SPEAKER,
    notes:
      "Trois rôles, chacun avec son propre espace dans l'interface. Les dix fonctionnalités F1 à F10 du cahier de " +
      "conception sont chacune portées par un service : c'est ce découpage qui donne l'architecture microservices.",
  });
  const acteurs = [
    ["E", "Enseignant", COLORS.group1, ["Banque de questions", "Créer, planifier, publier", "Corriger (auto + manuel)", "Autoriser une resoumission", "Consulter les résultats"]],
    ["É", "Étudiant", COLORS.group2, ["Voir les évaluations ouvertes", "Répondre (sauvegarde auto)", "Déposer un devoir", "Soumettre avant l'échéance", "Consulter sa note publiée"]],
    ["A", "Administrateur", ACCENT, ["Créer les comptes", "Attribuer les rôles", "Activer / désactiver", "Superviser la plateforme"]],
  ];
  const cw = (W - 2 * MARGIN - 2 * 0.25) / 3;
  acteurs.forEach(([icon, titre, color, items], i) => {
    card(pres, slide, { x: MARGIN + i * (cw + 0.25), y: 1.6, w: cw, h: 2.5, title: titre, body: items, accent: color, icon, fontSize: 11.5 });
  });

  const fonctions = [
    ["F1", "Utilisateurs, authentification, rôles", "user"],
    ["F2", "Banque de questions", "question"],
    ["F3", "Création d'une évaluation", "assessment"],
    ["F4", "Génération automatique (gRPC)", "assessment"],
    ["F5", "Planification et publication", "assessment"],
    ["F6", "Réalisation d'une évaluation", "submission"],
    ["F7", "Dépôt de devoir", "submission"],
    ["F8", "Correction automatique", "grading"],
    ["F9", "Correction manuelle", "grading"],
    ["F10", "Gestion des résultats", "assessment"],
  ];
  const colW = (W - 2 * MARGIN - 0.25) / 2;
  fonctions.forEach(([code, libelle, service], i) => {
    const x = MARGIN + Math.floor(i / 5) * (colW + 0.25);
    const y = 4.35 + (i % 5) * 0.47;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: colW, h: 0.4, rectRadius: 0.06, fill: { color: COLORS.white }, line: { color: COLORS.line, width: 0.75 } });
    text(slide, code, { x: x + 0.15, y, w: 0.55, h: 0.4, fontSize: 11, bold: true, color: ACCENT, valign: "middle" });
    text(slide, libelle, { x: x + 0.7, y, w: colW - 2.35, h: 0.4, fontSize: 11.5, color: COLORS.ink, valign: "middle" });
    const g1 = ["question", "assessment"].includes(service);
    pill(pres, slide, { x: x + colW - 1.5, y: y + 0.06, label: service, color: g1 ? COLORS.group1 : COLORS.group2, w: 1.35, code: true, fontSize: 9 });
  });
}

function rulesSlide(pres) {
  const slide = contentSlide(pres, {
    part: PART,
    title: "Huit règles métier, appliquées par les services",
    speaker: SPEAKER,
    notes:
      "Ces règles viennent du cahier de conception. L'étiquette indique le service qui les fait respecter : chaque " +
      "règle est garantie à un seul endroit, par le service propriétaire de la donnée.",
  });
  const regles = [
    ["Accès limité à la période planifiée", "Une évaluation n'est accessible qu'entre sa date de début et sa date de fin.", "submission"],
    ["Refus automatique hors délai", "Une soumission après la date de fin est refusée et l'étudiant est notifié.", "submission"],
    ["Une seule soumission", "Sauf resoumission autorisée explicitement par l'enseignant responsable.", "submission"],
    ["Publication contrôlée", "Au moins une question et un barème total supérieur à 0.", "assessment"],
    ["Correction automatique ciblée", "QCM, Vrai/Faux et question courte ; le reste est corrigé à la main.", "grading"],
    ["Résultat visible après publication", "L'étudiant ne voit sa note qu'après l'événement ResultPublished.", "assessment"],
    ["Correction réservée", "Seul l'enseignant responsable modifie une note ; l'administrateur ne corrige pas.", "grading"],
    ["Pas de suppression en cascade", "Une question retirée reste visible dans les évaluations passées.", "question"],
  ];
  const cw = (W - 2 * MARGIN - 0.25) / 2;
  regles.forEach(([titre, corps, service], i) => {
    const x = MARGIN + (i % 2) * (cw + 0.25);
    const y = 1.65 + Math.floor(i / 2) * 1.2;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: cw, h: 1.05, rectRadius: 0.08, fill: { color: COLORS.white }, line: { color: COLORS.line, width: 0.75 } });
    slide.addShape(pres.shapes.OVAL, { x: x + 0.2, y: y + 0.24, w: 0.56, h: 0.56, fill: { color: ACCENT }, line: { color: ACCENT, width: 0 } });
    text(slide, String(i + 1), { x: x + 0.2, y: y + 0.24, w: 0.56, h: 0.56, fontSize: 16, bold: true, color: COLORS.white, align: "center", valign: "middle", fontFace: FONTS.title });
    text(slide, titre, { x: x + 0.95, y: y + 0.13, w: cw - 2.6, h: 0.36, fontSize: 13, bold: true, color: COLORS.ink, valign: "middle" });
    text(slide, corps, { x: x + 0.95, y: y + 0.5, w: cw - 1.15, h: 0.45, fontSize: 11, color: COLORS.text });
    const g1 = ["question", "assessment"].includes(service);
    pill(pres, slide, { x: x + cw - 1.55, y: y + 0.17, label: service, color: g1 ? COLORS.group1 : COLORS.group2, w: 1.35, code: true, fontSize: 9 });
  });
}

module.exports = (pres) => {
  sectionSlide(pres, {
    number: 1,
    title: "Contexte & besoins",
    subtitle: "Pourquoi cette plateforme, pour qui, avec quelles règles",
    speaker: SPEAKER,
    topics: ["Le problème et les objectifs", "Les acteurs et les fonctionnalités", "Les règles métier"],
  });
  problemSlide(pres);
  actorsSlide(pres);
  rulesSlide(pres);
};
