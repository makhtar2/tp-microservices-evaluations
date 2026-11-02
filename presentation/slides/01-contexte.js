// Partie 1 — Contexte & besoins (Makhtar Wade).
// Source : docs/cahier-de-conception.md.
const { COLORS, FONTS, SPEAKERS } = require("../lib/theme");
const { W, MARGIN, text, contentSlide, sectionSlide, card, box, arrow, table } = require("../lib/kit");

const SPEAKER = "wade";
const PART = "Contexte et besoins";
const ACCENT = SPEAKERS[SPEAKER].color;

function problemSlide(pres) {
  const slide = contentSlide(pres, {
    part: PART,
    title: "Objectifs et cycle de vie",
    speaker: SPEAKER,
  });
  const objectifs = [
    ["Centralisée", "Une seule plateforme pour enseignants, étudiants et administrateurs, accessible par le web."],
    ["Modulaire", "Chaque domaine métier est un service indépendant, développé et déployé séparément."],
    ["Évolutive", "On ajoute ou on fait monter en charge un service sans toucher aux autres."],
  ];
  const cw = (W - 2 * MARGIN - 2 * 0.25) / 3;
  objectifs.forEach(([titre, corps], i) => {
    card(pres, slide, { x: MARGIN + i * (cw + 0.25), y: 1.7, w: cw, h: 2.05, title: titre, body: corps, accent: ACCENT, fontSize: 15 });
  });

  text(slide, "Cycle de vie couvert par la plateforme", { x: MARGIN, y: 4.3, w: 8, h: 0.35, fontSize: 13, bold: true, color: COLORS.ink });
  const etapes = ["Questions", "Construction", "Planification", "Publication", "Réalisation", "Soumission", "Correction", "Résultats"];
  const stepW = (W - 2 * MARGIN - 7 * 0.2) / 8;
  etapes.forEach((etape, i) => {
    const x = MARGIN + i * (stepW + 0.2);
    box(pres, slide, { x, y: 4.8, w: stepW, h: 0.8, label: etape, bold: false, fontSize: 12, fill: i < 4 ? COLORS.infoSoft : COLORS.warnSoft, line: i < 4 ? COLORS.group1 : COLORS.group2 });
    if (i < 7) arrow(pres, slide, x + stepW, 5.2, x + stepW + 0.2, 5.2, { color: COLORS.muted, width: 1 });
  });
  text(slide, [
    { text: "Groupe 1 ", options: { bold: true, color: COLORS.group1 } },
    { text: "questions et évaluations     ", options: { color: COLORS.text } },
    { text: "Groupe 2 ", options: { bold: true, color: COLORS.group2 } },
    { text: "soumission, correction, utilisateurs, notifications", options: { color: COLORS.text } },
  ], { x: MARGIN, y: 6.1, w: W - 2 * MARGIN, h: 0.3, fontSize: 10.5 });
}

function actorsSlide(pres) {
  const slide = contentSlide(pres, {
    part: PART,
    title: "Acteurs et fonctionnalités",
    speaker: SPEAKER,
  });
  const acteurs = [
    ["Enseignant", ["Banque de questions", "Créer, planifier, publier", "Corriger (auto + manuel)", "Autoriser une resoumission", "Consulter les résultats"]],
    ["Étudiant", ["Voir les évaluations ouvertes", "Répondre (sauvegarde auto)", "Déposer un devoir", "Soumettre avant l'échéance", "Consulter sa note publiée"]],
    ["Administrateur", ["Créer les comptes", "Attribuer les rôles", "Activer / désactiver", "Superviser la plateforme"]],
  ];
  const cw = (W - 2 * MARGIN - 2 * 0.25) / 3;
  acteurs.forEach(([titre, items], i) => {
    card(pres, slide, { x: MARGIN + i * (cw + 0.25), y: 1.6, w: cw, h: 2.5, title: titre, body: items, fontSize: 13 });
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
  const colW = [0.6, 3.75, 1.6];
  [fonctions.slice(0, 5), fonctions.slice(5)].forEach((lignes, i) => {
    table(slide, [["", "Fonctionnalité", "Service"], ...lignes.map(([code, libelle, service]) => [{ text: code, bold: true, color: COLORS.ink }, libelle, service])], {
      x: MARGIN + i * 6.183, y: 4.2, w: 5.95, colW, fontSize: 12.5, rowH: 0.41,
    });
  });
}

function rulesSlide(pres) {
  const slide = contentSlide(pres, {
    part: PART,
    title: "Règles métier",
    speaker: SPEAKER,
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
  table(slide, [
    ["", "Règle", "Détail", "Service"],
    ...regles.map(([titre, corps, service], i) => [String(i + 1), { text: titre, bold: true, color: COLORS.ink }, corps, service]),
  ], { x: MARGIN, y: 1.45, w: W - 2 * MARGIN, colW: [0.45, 3.75, 6.53, 1.4], fontSize: 13.5, rowH: 0.56 });
}

module.exports = (pres) => {
  sectionSlide(pres, {
    number: 1,
    title: "Contexte et besoins",
    speaker: SPEAKER,
    topics: ["Objectifs et cycle de vie", "Acteurs et fonctionnalités", "Règles métier"],
  });
  problemSlide(pres);
  actorsSlide(pres);
  rulesSlide(pres);
};
