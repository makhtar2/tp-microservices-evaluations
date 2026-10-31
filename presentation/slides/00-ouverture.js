// Ouverture : titre, sommaire (déroulé par présentateur), équipe.
const { COLORS, FONTS, PROJECT, SPEAKERS } = require("../lib/theme");
const { PARTS, REALISATIONS } = require("../lib/plan");
const { W, MARGIN, bullet, text, contentSlide, footer, pill } = require("../lib/kit");

function initials(nom) {
  return nom.split(" ").filter((m) => m.length > 2 || m === m.toUpperCase()).slice(-2).map((m) => m[0]).join("");
}

function titleSlide(pres) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.deep };

  // Réseau de services stylisé autour du bus d'événements.
  const cx = 10.25;
  const cy = 3.55;
  const services = ["user", "question", "assessment", "submission", "grading", "notification"];
  const nodes = services.map((name, i) => {
    const angle = (-90 + i * 60) * (Math.PI / 180);
    return { name, x: cx + 2.15 * Math.cos(angle), y: cy + 2.15 * Math.sin(angle) };
  });
  nodes.forEach((n, i) => {
    const next = nodes[(i + 1) % nodes.length];
    slide.addShape(pres.shapes.LINE, {
      x: Math.min(n.x, next.x), y: Math.min(n.y, next.y), w: Math.abs(next.x - n.x), h: Math.abs(next.y - n.y),
      flipH: next.x < n.x, flipV: next.y < n.y, line: { color: COLORS.deep2, width: 1 },
    });
    slide.addShape(pres.shapes.LINE, {
      x: Math.min(n.x, cx), y: Math.min(n.y, cy), w: Math.abs(cx - n.x), h: Math.abs(cy - n.y),
      flipH: cx < n.x, flipV: cy < n.y, line: { color: COLORS.mint, width: 1.25, dashType: "dash" },
    });
  });
  slide.addShape(pres.shapes.OVAL, { x: cx - 0.85, y: cy - 0.85, w: 1.7, h: 1.7, fill: { color: COLORS.rabbit }, line: { color: "FDBA74", width: 3 } });
  text(slide, [
    { text: "RabbitMQ", options: { bold: true, fontSize: 13, color: COLORS.white, breakLine: true } },
    { text: "evaluations.events", options: { fontSize: 8, color: "FFEDD5", fontFace: FONTS.code } },
  ], { x: cx - 0.85, y: cy - 0.85, w: 1.7, h: 1.7, align: "center", valign: "middle" });
  nodes.forEach((n) => {
    slide.addShape(pres.shapes.OVAL, { x: n.x - 0.55, y: n.y - 0.55, w: 1.1, h: 1.1, fill: { color: COLORS.deep2 }, line: { color: COLORS.mint, width: 1.5 } });
    text(slide, n.name, { x: n.x - 0.6, y: n.y - 0.55, w: 1.2, h: 1.1, fontSize: 9.5, bold: true, color: COLORS.white, align: "center", valign: "middle" });
  });

  text(slide, PROJECT.universite.toUpperCase(), { x: MARGIN, y: 0.6, w: 7.2, h: 0.3, fontSize: 11, bold: true, color: COLORS.mint, charSpacing: 2 });
  text(slide, PROJECT.classe, { x: MARGIN, y: 0.92, w: 7.2, h: 0.3, fontSize: 12, color: "B7CCC4" });
  slide.addShape(pres.shapes.RECTANGLE, { x: MARGIN, y: 1.75, w: 0.9, h: 0.07, fill: { color: COLORS.mint }, line: { color: COLORS.mint, width: 0 } });
  text(slide, PROJECT.titre, { x: MARGIN, y: 1.95, w: 7.3, h: 1.9, fontSize: 38, color: COLORS.white, fontFace: FONTS.title, valign: "middle" });
  text(slide, PROJECT.sousTitre, { x: MARGIN, y: 3.9, w: 7.3, h: 0.4, fontSize: 16, color: "B7CCC4" });
  pill(pres, slide, { x: MARGIN, y: 4.5, label: "Projet Evalio", color: COLORS.mint, fontSize: 10.5, w: 1.5 });
  pill(pres, slide, { x: MARGIN + 1.65, y: 4.5, label: PROJECT.annee, color: "B7CCC4", fontSize: 10.5, w: 2.6 });

  const equipe = [
    ["Groupe 1", `${SPEAKERS.wade.nom} · ${SPEAKERS.mbacke.nom}`],
    ["Groupe 2", `${SPEAKERS.fallou.nom} · ${SPEAKERS.bara.nom} · ${SPEAKERS.aidara.nom}`],
    ["", SPEAKERS.fatou.nom],
  ];
  // Pas de fragment vide : PowerPoint refuse d'ouvrir un run sans texte.
  text(slide, equipe.flatMap(([groupe, noms]) => [
    ...(groupe ? [{ text: `${groupe}  `, options: { bold: true, color: COLORS.mint } }] : []),
    { text: noms, options: { color: COLORS.white, breakLine: true } },
  ]), { x: MARGIN, y: 5.35, w: 7.4, h: 1.2, fontSize: 12.5, paraSpaceAfter: 4 });

  footer(pres, slide, { dark: true });
  slide.addNotes(
    "Ouverture (Fatou Ngom). Présenter l'équipe, l'université et le sujet : une plateforme de gestion des évaluations " +
      "construite en microservices. Le schéma de droite résume l'idée centrale : six services autonomes qui communiquent " +
      "par un bus d'événements RabbitMQ."
  );
}

function agendaSlide(pres) {
  const slide = contentSlide(pres, {
    part: "Déroulé de la soutenance",
    title: "Six parties, six présentateurs",
    speaker: "fatou",
    notes:
      "Annoncer le déroulé : chaque membre présente la partie qu'il a réalisée. Durée totale d'environ 23 minutes, " +
      "démonstration comprise, puis questions.",
  });
  const colW = (W - 2 * MARGIN - 5 * 0.18) / 6;
  PARTS.forEach((part, i) => {
    const speaker = SPEAKERS[part.speaker];
    const x = MARGIN + i * (colW + 0.18);
    const y = 1.75;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y, w: colW, h: 4.75, rectRadius: 0.08, fill: { color: COLORS.white }, line: { color: COLORS.line, width: 0.75 },
    });
    slide.addShape(pres.shapes.RECTANGLE, { x, y, w: colW, h: 0.09, fill: { color: speaker.color }, line: { color: speaker.color, width: 0 } });
    text(slide, String(part.n).padStart(2, "0"), { x: x + 0.2, y: y + 0.25, w: 1, h: 0.6, fontSize: 30, bold: true, color: speaker.color, fontFace: FONTS.title });
    text(slide, `${part.minutes} min`, { x: x + colW - 1.05, y: y + 0.35, w: 0.85, h: 0.3, fontSize: 10, color: COLORS.muted, align: "right" });
    text(slide, part.titre, { x: x + 0.2, y: y + 0.95, w: colW - 0.35, h: 0.75, fontSize: 13.5, bold: true, color: COLORS.ink, valign: "top" });
    text(slide, part.sujets.map((s) => ({ text: s, options: { bullet: bullet(speaker.color), breakLine: true } })), {
      x: x + 0.2, y: y + 1.75, w: colW - 0.3, h: 2.1, fontSize: 10.5, paraSpaceAfter: 4,
    });
    slide.addShape(pres.shapes.LINE, { x: x + 0.2, y: y + 3.95, w: colW - 0.4, h: 0, line: { color: COLORS.line, width: 0.75 } });
    text(slide, speaker.nom, { x: x + 0.2, y: y + 4.02, w: colW - 0.3, h: 0.6, fontSize: 10.5, bold: true, color: speaker.color, valign: "middle" });
  });
  text(slide, [
    { text: "Conclusion  ", options: { bold: true, color: COLORS.ink } },
    { text: `bilan et perspectives (${SPEAKERS.fatou.nom}), puis questions du jury à toute l'équipe.`, options: { color: COLORS.muted } },
  ], { x: MARGIN, y: 6.6, w: W - 2 * MARGIN, h: 0.3, fontSize: 11.5 });
}

function teamSlide(pres) {
  const slide = contentSlide(pres, {
    part: "L'équipe",
    title: "Qui a fait quoi",
    speaker: "fatou",
    notes:
      "Présenter rapidement chaque membre et ses réalisations. La répartition de la présentation suit exactement ce " +
      "tableau : chacun présente ce qu'il a construit.",
  });
  const keys = ["wade", "mbacke", "fallou", "bara", "aidara", "fatou"];
  const gap = 0.22;
  const cw = (W - 2 * MARGIN - 2 * gap) / 3;
  const ch = 2.42;
  keys.forEach((key, i) => {
    const speaker = SPEAKERS[key];
    const part = PARTS.find((p) => p.speaker === key);
    const x = MARGIN + (i % 3) * (cw + gap);
    const y = 1.6 + Math.floor(i / 3) * (ch + 0.2);
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y, w: cw, h: ch, rectRadius: 0.08, fill: { color: COLORS.white }, line: { color: COLORS.line, width: 0.75 },
    });
    slide.addShape(pres.shapes.OVAL, { x: x + 0.2, y: y + 0.2, w: 0.62, h: 0.62, fill: { color: speaker.color }, line: { color: speaker.color, width: 0 } });
    text(slide, initials(speaker.nom), { x: x + 0.2, y: y + 0.2, w: 0.62, h: 0.62, fontSize: 14, bold: true, color: COLORS.white, align: "center", valign: "middle" });
    text(slide, speaker.nom, { x: x + 0.95, y: y + 0.18, w: cw - 1.1, h: 0.36, fontSize: 14, bold: true, color: COLORS.ink, valign: "middle" });
    text(slide, `${speaker.groupe} · Partie ${part.n} : ${part.titre}`, {
      x: x + 0.95, y: y + 0.52, w: cw - 1.1, h: 0.3, fontSize: 9.5, color: speaker.color, bold: true, valign: "middle",
    });
    text(slide, REALISATIONS[key].map((r) => ({ text: r, options: { bullet: bullet(speaker.color), breakLine: true } })), {
      x: x + 0.22, y: y + 0.98, w: cw - 0.4, h: ch - 1.08, fontSize: 10.5, paraSpaceAfter: 3,
    });
  });
}

module.exports = (pres) => {
  titleSlide(pres);
  agendaSlide(pres);
  teamSlide(pres);
};
