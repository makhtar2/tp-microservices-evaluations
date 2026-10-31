// Composants réutilisables : gabarits de slides, boîtes, flèches, cartes,
// captures encadrées. Toutes les mesures sont en pouces (format 16:9,
// 13,333 × 7,5).
const path = require("node:path");
const { COLORS, FONTS, PROJECT, SPEAKERS } = require("./theme");

const W = 13.333;
const H = 7.5;
const MARGIN = 0.6;
const CAPTURES = path.join(__dirname, "../assets/captures");

// Numérotation automatique : le total est connu une fois toutes les
// slides créées (voir finalize).
const pageNumbers = [];

// Style de puce commun : rond plein de la couleur d'accent, retrait serré.
function bullet(color) {
  return { code: "25CF", color, indent: 14 };
}

function shadow() {
  return { type: "outer", blur: 8, offset: 2, angle: 90, color: "0F1F1A", opacity: 0.12 };
}

function text(slide, value, opts) {
  // Une zone de taille négative rend le fichier illisible par PowerPoint.
  if (!(opts.w > 0 && opts.h > 0)) throw new Error(`Zone de texte invalide (${opts.w} × ${opts.h}) : ${JSON.stringify(value).slice(0, 60)}`);
  slide.addText(value, { fontFace: FONTS.body, color: COLORS.text, margin: 0, valign: "top", ...opts });
}

// Bandeau « Présenté par » en haut à droite, couleur du présentateur.
function speakerChip(pres, slide, key, { dark = false } = {}) {
  const speaker = SPEAKERS[key];
  const label = key === "tous" ? speaker.nom : `Présenté par ${speaker.nom}`;
  const w = 0.35 + label.length * 0.085;
  const x = W - MARGIN - w;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y: 0.42, w, h: 0.36, rectRadius: 0.18,
    fill: { color: dark ? COLORS.white : speaker.color, transparency: dark ? 88 : 0 },
    line: { color: speaker.color, width: dark ? 1 : 0 },
  });
  slide.addShape(pres.shapes.OVAL, { x: x + 0.13, y: 0.55, w: 0.1, h: 0.1, fill: { color: dark ? speaker.color : COLORS.white } });
  text(slide, label, {
    x: x + 0.28, y: 0.42, w: w - 0.32, h: 0.36, fontSize: 10.5, bold: true, valign: "middle",
    color: COLORS.white,
  });
}

function footer(pres, slide, { dark = false } = {}) {
  const color = dark ? "9FB8AF" : COLORS.muted;
  slide.addShape(pres.shapes.LINE, { x: MARGIN, y: H - 0.5, w: W - 2 * MARGIN, h: 0, line: { color: dark ? COLORS.deep2 : COLORS.line, width: 0.75 } });
  text(slide, PROJECT.footer, { x: MARGIN, y: H - 0.42, w: 7, h: 0.25, fontSize: 9, color });
  const number = { slide, color };
  pageNumbers.push(number);
}

// Slide de contenu : surtitre (partie), titre, présentateur, pied de page.
function contentSlide(pres, { part, title, speaker, notes }) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.bg };
  const accent = SPEAKERS[speaker].color;
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.12, h: H, fill: { color: accent }, line: { color: accent, width: 0 } });
  text(slide, part.toUpperCase(), {
    x: MARGIN, y: 0.42, w: 7.5, h: 0.3, fontSize: 10.5, bold: true, color: accent, charSpacing: 2,
  });
  text(slide, title, {
    x: MARGIN, y: 0.72, w: W - 2 * MARGIN - 0.2, h: 0.7, fontSize: 28, fontFace: FONTS.title, color: COLORS.ink,
    valign: "middle",
  });
  speakerChip(pres, slide, speaker);
  footer(pres, slide);
  if (notes) slide.addNotes(notes);
  return slide;
}

// Slide d'ouverture de partie, sur fond vert profond.
function sectionSlide(pres, { number, title, subtitle, speaker, topics = [], notes }) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.deep };
  const accent = SPEAKERS[speaker].color;
  slide.addShape(pres.shapes.OVAL, { x: 8.6, y: -1.6, w: 6.4, h: 6.4, fill: { color: COLORS.deep2 }, line: { color: COLORS.deep2, width: 0 } });
  slide.addShape(pres.shapes.OVAL, { x: 10.4, y: 3.9, w: 4, h: 4, fill: { color: COLORS.deep2, transparency: 40 }, line: { color: COLORS.deep2, width: 0 } });
  text(slide, String(number).padStart(2, "0"), {
    x: MARGIN, y: 1.25, w: 3, h: 1.4, fontSize: 88, bold: true, color: COLORS.mint, fontFace: FONTS.title,
  });
  text(slide, title, { x: MARGIN, y: 2.75, w: 8.5, h: 1, fontSize: 38, color: COLORS.white, fontFace: FONTS.title, valign: "middle" });
  if (subtitle) text(slide, subtitle, { x: MARGIN, y: 3.75, w: 8.5, h: 0.5, fontSize: 16, color: "B7CCC4" });
  topics.forEach((topic, i) => {
    const y = 4.6 + i * 0.42;
    slide.addShape(pres.shapes.OVAL, { x: MARGIN, y: y + 0.11, w: 0.14, h: 0.14, fill: { color: accent }, line: { color: accent, width: 0 } });
    text(slide, topic, { x: MARGIN + 0.3, y, w: 8, h: 0.36, fontSize: 14, color: "E2ECE8", valign: "middle" });
  });
  speakerChip(pres, slide, speaker, { dark: true });
  footer(pres, slide, { dark: true });
  if (notes) slide.addNotes(notes);
  return slide;
}

// Boîte avec texte centré (services, étapes de diagramme).
function box(pres, slide, { x, y, w, h, label, sub, fill = COLORS.white, line = COLORS.line, color = COLORS.ink, fontSize = 12, radius = 0.08, stripe, shadowed = true, bold = true }) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, rectRadius: radius, fill: { color: fill }, line: { color: line, width: 1 }, shadow: shadowed ? shadow() : undefined,
  });
  if (stripe) slide.addShape(pres.shapes.RECTANGLE, { x: x + 0.06, y, w: w - 0.12, h: 0.06, fill: { color: stripe }, line: { color: stripe, width: 0 } });
  const runs = [{ text: label, options: { bold, fontSize, color, breakLine: Boolean(sub) } }];
  if (sub) runs.push({ text: sub, options: { fontSize: Math.max(8, fontSize - 3), color: COLORS.muted } });
  text(slide, runs, { x: x + 0.05, y, w: w - 0.1, h, align: "center", valign: "middle" });
}

// Flèche droite de (x1, y1) à (x2, y2), avec étiquette optionnelle.
function arrow(pres, slide, x1, y1, x2, y2, { color = COLORS.muted, width = 1.5, dash, both = false, label, labelColor, labelOffset = 0, labelW = 2.4, labelSize = 9 } = {}) {
  slide.addShape(pres.shapes.LINE, {
    x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1),
    flipH: x2 < x1, flipV: y2 < y1,
    line: { color, width, dashType: dash, endArrowType: "triangle", beginArrowType: both ? "triangle" : undefined },
  });
  if (label) {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2 + labelOffset;
    text(slide, label, {
      x: mx - labelW / 2, y: my - 0.16, w: labelW, h: 0.3, fontSize: labelSize, align: "center", valign: "middle",
      color: labelColor || color, bold: true, fill: { color: COLORS.bg },
    });
  }
}

// Petite étiquette arrondie (statut, technologie, routing key).
function pill(pres, slide, { x, y, label, color = COLORS.deep, fill, w, fontSize = 9.5, code = false }) {
  const width = w || 0.3 + label.length * (code ? 0.085 : 0.075);
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w: width, h: 0.28, rectRadius: 0.14, fill: { color: fill || color, transparency: fill ? 0 : 85 }, line: { color, width: 0.75 },
  });
  text(slide, label, {
    x, y, w: width, h: 0.28, fontSize, bold: true, color, align: "center", valign: "middle", fontFace: code ? FONTS.code : FONTS.body,
  });
  return width;
}

// Carte : titre + corps (texte ou puces), liseré de couleur à gauche.
function card(pres, slide, { x, y, w, h, title, body = [], accent = COLORS.deep, fontSize = 12, titleSize = 14, icon }) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, rectRadius: 0.08, fill: { color: COLORS.white }, line: { color: COLORS.line, width: 0.75 }, shadow: shadow(),
  });
  slide.addShape(pres.shapes.RECTANGLE, { x, y: y + 0.12, w: 0.07, h: h - 0.24, fill: { color: accent }, line: { color: accent, width: 0 } });
  let top = y + 0.2;
  if (icon) {
    slide.addShape(pres.shapes.OVAL, { x: x + 0.25, y: top, w: 0.46, h: 0.46, fill: { color: accent, transparency: 85 }, line: { color: accent, width: 0 } });
    text(slide, icon, { x: x + 0.25, y: top, w: 0.46, h: 0.46, fontSize: 15, bold: true, color: accent, align: "center", valign: "middle" });
  }
  if (title) {
    text(slide, title, {
      x: x + (icon ? 0.82 : 0.28), y: top, w: w - (icon ? 1 : 0.45), h: icon ? 0.46 : 0.4, fontSize: titleSize, bold: true,
      color: COLORS.ink, valign: "middle",
    });
    top += icon ? 0.62 : 0.48;
  }
  const items = Array.isArray(body) ? body : [body];
  if (items.length) {
    text(slide, bulletRuns(items, { accent, withBullets: Array.isArray(body) }), {
      x: x + 0.28, y: top, w: w - 0.45, h: y + h - top - 0.12, fontSize, paraSpaceAfter: 5,
    });
  }
}

// Puces : chaque élément est un texte, ou [mot en gras, suite].
function bulletRuns(items, { accent, withBullets = true }) {
  const runs = [];
  for (const item of items) {
    const [strong, rest] = Array.isArray(item) ? item : [null, item];
    const marker = withBullets ? bullet(accent) : false;
    if (strong) {
      runs.push({ text: `${strong} `, options: { bold: true, color: COLORS.ink, bullet: marker } });
      runs.push({ text: rest, options: { breakLine: true } });
    } else {
      runs.push({ text: rest, options: { bullet: marker, breakLine: true } });
    }
  }
  return runs;
}

// Liste à puces libre (sans carte).
function bullets(slide, items, { x, y, w, h, fontSize = 14, accent = COLORS.deep, color = COLORS.text }) {
  text(slide, bulletRuns(items, { accent }), { x, y, w, h, fontSize, color, paraSpaceAfter: 8 });
}

// Capture d'écran encadrée (fenêtre de navigateur stylisée), ratio conservé.
function screenshot(pres, slide, { file, x, y, w, ratio = 1440 / 1000, caption }) {
  const h = w / ratio;
  const bar = 0.24;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h: h + bar, rectRadius: 0.06, fill: { color: COLORS.white }, line: { color: COLORS.line, width: 0.75 }, shadow: shadow(),
  });
  ["F87171", "FBBF24", "34D399"].forEach((c, i) => {
    slide.addShape(pres.shapes.OVAL, { x: x + 0.12 + i * 0.16, y: y + 0.075, w: 0.09, h: 0.09, fill: { color: c }, line: { color: c, width: 0 } });
  });
  slide.addImage({ path: path.join(CAPTURES, file), x: x + 0.02, y: y + bar, w: w - 0.04, h: h - 0.02 });
  if (caption) {
    text(slide, caption, { x, y: y + h + bar + 0.06, w, h: 0.3, fontSize: 10.5, color: COLORS.muted, align: "center", italic: true });
  }
  return h + bar;
}

// Tableau sobre : en-tête vert profond, lignes alternées.
function table(slide, rows, { x, y, w, colW, fontSize = 11, rowH = 0.36, headerFill = COLORS.deep }) {
  const data = rows.map((row, r) =>
    row.map((cell) => {
      const value = typeof cell === "object" && cell !== null ? cell : { text: String(cell) };
      return {
        text: value.text,
        options: {
          bold: r === 0 || value.bold,
          color: r === 0 ? COLORS.white : value.color || COLORS.text,
          fill: { color: r === 0 ? headerFill : r % 2 ? COLORS.white : "EEF2EF" },
          fontFace: value.code ? FONTS.code : FONTS.body,
          ...value.options,
        },
      };
    })
  );
  slide.addTable(data, {
    x, y, w, colW, fontFace: FONTS.body, fontSize, rowH, valign: "middle", margin: [0.04, 0.1, 0.04, 0.1],
    border: { type: "solid", pt: 0.5, color: COLORS.line },
  });
}

// Écrit les numéros « n / total » une fois toutes les slides créées.
function finalize() {
  const total = pageNumbers.length;
  pageNumbers.forEach(({ slide, color }, i) => {
    text(slide, `${String(i + 1).padStart(2, "0")} / ${total}`, {
      x: W - MARGIN - 1.5, y: H - 0.42, w: 1.5, h: 0.25, fontSize: 9, color, align: "right",
    });
  });
}

module.exports = {
  W, H, MARGIN,
  bullet, bulletRuns, shadow, text, contentSlide, sectionSlide, speakerChip, footer,
  box, arrow, pill, card, bullets, screenshot, table, finalize,
};
