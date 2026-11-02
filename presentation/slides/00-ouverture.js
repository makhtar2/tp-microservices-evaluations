// Page de garde, plan et répartition du travail.
const fs = require("node:fs");
const path = require("node:path");
const { COLORS, FONTS, PROJECT, SPEAKERS } = require("../lib/theme");
const { OUVERTURE, PARTS, REALISATIONS } = require("../lib/plan");
const { W, text, contentSlide, table } = require("../lib/kit");

const LOGO = path.join(__dirname, "../assets/logo-ucak.png");

function titleSlide(pres) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.white };
  const center = (value, y, h, opts) => text(slide, value, { x: 1, y, w: W - 2, h, align: "center", valign: "middle", ...opts });

  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 7.3, w: W, h: 0.2, fill: { color: COLORS.deep }, line: { color: COLORS.deep, width: 0 } });
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 7.25, w: W, h: 0.05, fill: { color: COLORS.mint }, line: { color: COLORS.mint, width: 0 } });
  if (fs.existsSync(LOGO)) slide.addImage({ path: LOGO, x: (W - 2.288) / 2, y: 0.2, w: 2.288, h: 1.95 });
  center(PROJECT.universite, 2.17, 0.38, { fontSize: 20, fontFace: FONTS.title, color: COLORS.ink });
  center(PROJECT.classe, 2.54, 0.3, { fontSize: 15, color: COLORS.text });
  slide.addShape(pres.shapes.LINE, { x: 2, y: 2.95, w: W - 4, h: 0, line: { color: COLORS.mint, width: 1.5 } });

  center("Soutenance de projet", 3.02, 0.32, { fontSize: 14, color: COLORS.muted });
  center(PROJECT.titre, 3.32, 0.85, { fontSize: 32, fontFace: FONTS.title, color: COLORS.deep });
  slide.addShape(pres.shapes.LINE, { x: 2, y: 4.25, w: W - 4, h: 0, line: { color: COLORS.mint, width: 1.5 } });

  const membres = ["wade", "mbacke", "fallou", "bara", "aidara"];
  text(slide, [
    { text: "Réalisé par", options: { bold: true, color: COLORS.ink, breakLine: true } },
    ...membres.map((key) => ({ text: SPEAKERS[key].nom, options: { breakLine: true } })),
  ], { x: 2, y: 4.5, w: 5, h: 1.75, fontSize: 14 });
  text(slide, [
    { text: "Encadrement", options: { bold: true, color: COLORS.ink, breakLine: true } },
    { text: PROJECT.encadrement },
  ], { x: W - 7, y: 4.5, w: 5, h: 0.7, fontSize: 14, align: "right" });
  center(PROJECT.annee, 6.6, 0.35, { fontSize: 13, color: COLORS.muted });

  slide.addNotes("Présenter l'équipe, l'université et le sujet : une plateforme de gestion des évaluations construite en microservices.");
}

function planSlide(pres) {
  const slide = contentSlide(pres, {
    part: "Plan",
    title: "Plan",
    speaker: OUVERTURE.speaker,
    notes: "Annoncer le plan. Chaque membre présente la partie qu'il a réalisée.",
  });
  table(slide, [
    ["", "Partie", "Présentateur"],
    ...PARTS.map((p) => [String(p.n), p.titre.replace(" & ", " et "), SPEAKERS[p.speaker].nom]),
    ["", "Conclusion", `${SPEAKERS.mbacke.nom}, ${SPEAKERS.aidara.nom}`],
  ], { x: 1.2, y: 1.6, w: W - 2.4, colW: [0.6, 6.4, 3.933], fontSize: 16, rowH: 0.56 });
}

function teamSlide(pres) {
  const slide = contentSlide(pres, {
    part: "Plan",
    title: "Répartition du travail",
    speaker: OUVERTURE.speaker,
    notes: "Présenter rapidement chaque membre et ce qu'il a réalisé.",
  });
  const keys = ["wade", "mbacke", "fallou", "bara", "aidara"];
  table(slide, [
    ["Membre", "Groupe", "Réalisations"],
    ...keys.map((key) => [{ text: SPEAKERS[key].nom, bold: true, color: COLORS.ink }, SPEAKERS[key].groupe, REALISATIONS[key].join(" ; ")]),
  ], { x: 0.6, y: 1.5, w: W - 1.2, colW: [2.6, 1.1, 8.433], fontSize: 13, rowH: 0.88 });
}

module.exports = (pres) => {
  titleSlide(pres);
  planSlide(pres);
  teamSlide(pres);
};
