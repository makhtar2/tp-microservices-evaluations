// Composants des slides. Toutes les mesures sont en pouces (format 16:9,
// 13,333 × 7,5).
const path = require("node:path");
const { COLORS, FONTS, PROJECT, SPEAKERS } = require("./theme");

const W = 13.333;
const H = 7.5;
const MARGIN = 0.6;
const CAPTURES = path.join(__dirname, "../assets/captures");

// Style de puce commun : rond plein de la couleur d'accent, retrait serré.
function bullet(color) {
  return { code: "2022", color, indent: 12 };
}

function text(slide, value, opts) {
  // Une zone de taille négative rend le fichier illisible par PowerPoint.
  if (!(opts.w > 0 && opts.h > 0)) throw new Error(`Zone de texte invalide (${opts.w} × ${opts.h}) : ${JSON.stringify(value).slice(0, 60)}`);
  slide.addText(value, { fontFace: FONTS.body, color: COLORS.text, margin: 0, valign: "top", ...opts });
}

function footer(pres, slide, { speaker, part } = {}) {
  const y = H - 0.5;
  slide.addShape(pres.shapes.LINE, { x: MARGIN, y, w: W - 2 * MARGIN, h: 0, line: { color: COLORS.line, width: 0.5 } });
  if (part) text(slide, part, { x: MARGIN, y: y + 0.08, w: 6, h: 0.28, fontSize: 10, color: COLORS.muted, valign: "middle" });
  const nom = speaker ? `${SPEAKERS[speaker].nom}     ` : "";
  text(slide, `${nom}${pres.slides.length}`, { x: W - MARGIN - 5, y: y + 0.08, w: 5, h: 0.28, fontSize: 10, color: COLORS.muted, align: "right", valign: "middle" });
}

function contentSlide(pres, { part, title, speaker, notes }) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.white };
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: W, h: 0.12, fill: { color: COLORS.deep }, line: { color: COLORS.deep, width: 0 } });
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0.12, w: W, h: 0.05, fill: { color: COLORS.mint }, line: { color: COLORS.mint, width: 0 } });
  text(slide, title, { x: MARGIN, y: 0.42, w: W - 2 * MARGIN, h: 0.68, fontSize: 28, fontFace: FONTS.title, color: COLORS.deep, valign: "middle" });
  slide.addShape(pres.shapes.LINE, { x: MARGIN, y: 1.15, w: W - 2 * MARGIN, h: 0, line: { color: COLORS.mint, width: 1 } });
  footer(pres, slide, { speaker, part });
  if (notes) slide.addNotes(notes);
  return slide;
}

function sectionSlide(pres, { number, title, speaker, topics = [], notes }) {
  const slide = pres.addSlide();
  slide.background = { color: COLORS.white };
  footer(pres, slide, { speaker });
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 3.9, h: H, fill: { color: COLORS.deep }, line: { color: COLORS.deep, width: 0 } });
  slide.addShape(pres.shapes.RECTANGLE, { x: 3.9, y: 0, w: 0.07, h: H, fill: { color: COLORS.mint }, line: { color: COLORS.mint, width: 0 } });
  text(slide, "Partie", { x: 0, y: 2.35, w: 3.9, h: 0.45, fontSize: 20, color: "DCE6EE", fontFace: FONTS.title, align: "center", valign: "middle" });
  text(slide, String(number), { x: 0, y: 2.8, w: 3.9, h: 1.4, fontSize: 80, color: COLORS.white, fontFace: FONTS.title, align: "center", valign: "middle" });
  text(slide, title, { x: 4.6, y: 1.75, w: 8.1, h: 1.35, fontSize: 32, color: COLORS.deep, fontFace: FONTS.title, valign: "bottom" });
  slide.addShape(pres.shapes.LINE, { x: 4.6, y: 3.25, w: 8.1, h: 0, line: { color: COLORS.mint, width: 1.25 } });
  text(slide, topics.map((t) => ({ text: t, options: { breakLine: true } })), { x: 4.6, y: 3.45, w: 8.1, h: 2.6, fontSize: 18, color: COLORS.text, paraSpaceAfter: 6 });
  if (notes) slide.addNotes(notes);
  return slide;
}

// Boîte avec texte centré (services, étapes de diagramme).
function box(pres, slide, { x, y, w, h, label, sub, fill = COLORS.white, line = COLORS.line, color = COLORS.ink, fontSize = 12, bold = true }) {
  slide.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: line, width: 0.75 } });
  const runs = [{ text: label, options: { bold, fontSize, color, breakLine: Boolean(sub) } }];
  if (sub) runs.push({ text: sub, options: { fontSize: Math.max(9, fontSize - 2), color: color === COLORS.white ? "DCE6EE" : COLORS.muted } });
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

// Nom technique (événement, service) écrit sur le schéma, sans cadre.
function pill(pres, slide, { x, y, label, color = COLORS.deep, w, fontSize = 10, code = false }) {
  const width = w || 0.3 + label.length * 0.085;
  text(slide, label, { x, y, w: width, h: 0.28, fontSize, color, align: "center", valign: "middle", fontFace: code ? FONTS.code : FONTS.body });
  return width;
}

function card(pres, slide, { x, y, w, h, title, body = [], accent = COLORS.deep, fontSize = 12, titleSize = 14 }) {
  slide.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: COLORS.white }, line: { color: COLORS.line, width: 0.75 } });
  let top = y + 0.05;
  if (title) {
    slide.addShape(pres.shapes.RECTANGLE, { x, y, w, h: 0.5, fill: { color: COLORS.mintSoft }, line: { color: COLORS.line, width: 0.75 } });
    text(slide, title, { x: x + 0.18, y: top, w: w - 0.36, h: 0.4, fontSize: titleSize, bold: true, color: COLORS.ink, valign: "middle" });
    top += 0.55;
  }
  const items = Array.isArray(body) ? body : [body];
  if (items.length) {
    text(slide, bulletRuns(items, { accent, withBullets: Array.isArray(body) }), {
      x: x + 0.18, y: top, w: w - 0.36, h: y + h - top - 0.08, fontSize, paraSpaceAfter: 4,
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

function screenshot(pres, slide, { file, x, y, w, ratio = 1440 / 1000, caption }) {
  const h = w / ratio;
  slide.addImage({ path: path.join(CAPTURES, file), x, y, w, h });
  slide.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: COLORS.white, transparency: 100 }, line: { color: COLORS.line, width: 0.75 } });
  if (caption) text(slide, caption, { x, y: y + h + 0.05, w, h: 0.3, fontSize: 11, color: COLORS.muted, align: "center" });
  return h;
}

function table(slide, rows, { x, y, w, colW, fontSize = 11, rowH = 0.36 }) {
  const data = rows.map((row, r) =>
    row.map((cell) => {
      const value = typeof cell === "object" && cell !== null ? cell : { text: String(cell) };
      return {
        text: value.text,
        options: {
          bold: r === 0 || value.bold,
          color: r === 0 ? COLORS.white : value.color || COLORS.text,
          fill: { color: r === 0 ? COLORS.deep : COLORS.white },
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

module.exports = {
  W, H, MARGIN,
  bullet, bulletRuns, text, contentSlide, sectionSlide, footer,
  box, arrow, pill, card, bullets, screenshot, table,
};
