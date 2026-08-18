const pptxgen = require("pptxgenjs");
const path = require("path");

const pres = new pptxgen();
pres.defineLayout({ name: "TALL", width: 13.33, height: 10 });
pres.layout = "TALL";

const C = {
  bg:        "FFFFFF",
  navy:      "1A2744",
  teal:      "2D6A8F",
  tealLight: "E8F1F8",
  green:     "5B7C3A",
  greenLight:"EDF4E5",
  orange:    "8C5A2E",
  orangeLight:"F8F0E6",
  purple:    "6B4C8A",
  purpleLight:"F0EAF5",
  gray:      "4A5B70",
  lightGray: "F3F5F9",
  border:    "D0D5DD",
  white:     "FFFFFF",
  midGray:   "718096",
  cloneOrange: "E65100",
  cloneBg:   "FFF3E0",
  mutGreen:  "388E3C",
  mutBg:     "E8F5E9",
  check:     "2D6A8F",
  checkBg:   "E8F1F8",
};

const FONT = "Calibri";
const FONT_TITLE = "Cambria";
const MONO = "Courier New";

const s = pres.addSlide();
s.background = { fill: C.bg };

// ================================================================
// PANEL A — Query Schema
// ================================================================
s.addText("A", {
  x: 0.25, y: 0.15, w: 0.35, h: 0.35,
  fontSize: 18, fontFace: FONT_TITLE, color: C.navy, bold: true, margin: 0,
});
s.addText("Query Architecture", {
  x: 0.6, y: 0.15, w: 5, h: 0.35,
  fontSize: 16, fontFace: FONT_TITLE, color: C.navy, bold: true, margin: 0,
});

// --- COLUMN 1: METADATA FILTERS ---
const fX = 0.3;
const fW = 3.6;

s.addShape(pres.ShapeType.roundRect, {
  x: fX, y: 0.65, w: fW, h: 0.38,
  fill: { color: C.navy }, rectRadius: 0.07,
});
s.addText("Metadata Filters (Input)", {
  x: fX, y: 0.65, w: fW, h: 0.38,
  fontSize: 12, fontFace: FONT, color: C.white, bold: true, align: "center", margin: 0,
});

// Study level
const syY = 1.15;
s.addShape(pres.ShapeType.roundRect, {
  x: fX, y: syY, w: fW, h: 0.7,
  fill: { color: C.tealLight }, line: { color: C.teal, width: 1 }, rectRadius: 0.06,
});
s.addText("Study Level", {
  x: fX + 0.12, y: syY + 0.05, w: 1.5, h: 0.2,
  fontSize: 10, fontFace: FONT, color: C.teal, bold: true, margin: 0,
});
s.addText([
  { text: "study_title", options: { fontFace: MONO, fontSize: 9, color: C.navy, bold: true } },
  { text: " — which database(s)   ", options: { fontSize: 9, color: C.gray } },
  { text: "Relevant publications", options: { fontFace: MONO, fontSize: 9, color: C.navy, bold: true } },
], {
  x: fX + 0.12, y: syY + 0.3, w: fW - 0.24, h: 0.35, margin: 0,
});

// Subject level
const sjY = 1.95;
s.addShape(pres.ShapeType.roundRect, {
  x: fX, y: sjY, w: fW, h: 0.95,
  fill: { color: C.greenLight }, line: { color: C.green, width: 1 }, rectRadius: 0.06,
});
s.addText("Subject Level", {
  x: fX + 0.12, y: sjY + 0.05, w: 1.5, h: 0.2,
  fontSize: 10, fontFace: FONT, color: C.green, bold: true, margin: 0,
});
s.addText([
  { text: "disease_stage", options: { fontFace: MONO, fontSize: 9, color: C.navy, bold: true } },
  { text: " — e.g. severe, mild, healthy\n", options: { fontSize: 9, color: C.gray } },
  { text: "sex", options: { fontFace: MONO, fontSize: 9, color: C.navy, bold: true } },
  { text: " — Male, Female     ", options: { fontSize: 9, color: C.gray } },
  { text: "Age minimum", options: { fontFace: MONO, fontSize: 9, color: C.navy, bold: true } },
  { text: " — numeric age", options: { fontSize: 9, color: C.gray } },
], {
  x: fX + 0.12, y: sjY + 0.3, w: fW - 0.24, h: 0.6, margin: 0, lineSpacingMultiple: 1.15,
});

// Sample level
const smY = 3.0;
s.addShape(pres.ShapeType.roundRect, {
  x: fX, y: smY, w: fW, h: 0.95,
  fill: { color: C.orangeLight }, line: { color: C.orange, width: 1 }, rectRadius: 0.06,
});
s.addText("Sample Level", {
  x: fX + 0.12, y: smY + 0.05, w: 1.5, h: 0.2,
  fontSize: 10, fontFace: FONT, color: C.orange, bold: true, margin: 0,
});
s.addText([
  { text: "tissue", options: { fontFace: MONO, fontSize: 9, color: C.navy, bold: true } },
  { text: " — blood, PBL, BM     ", options: { fontSize: 9, color: C.gray } },
  { text: "cell_subset", options: { fontFace: MONO, fontSize: 9, color: C.navy, bold: true } },
  { text: " — naive B, memory B\n", options: { fontSize: 9, color: C.gray } },
  { text: "→ Enables within-subject comparisons (e.g. blood vs BM, naive vs memory)", options: { fontSize: 8.5, color: C.orange, italic: true } },
], {
  x: fX + 0.12, y: smY + 0.3, w: fW - 0.24, h: 0.6, margin: 0, lineSpacingMultiple: 1.15,
});

// Combinable note
s.addShape(pres.ShapeType.roundRect, {
  x: fX, y: 4.05, w: fW, h: 0.35,
  fill: { color: C.lightGray }, line: { color: C.border, width: 0.7, dashType: "dash" }, rectRadius: 0.05,
});
s.addText("All filters are freely combinable. \"ALL\" = all non-NA entries.", {
  x: fX + 0.1, y: 4.05, w: fW - 0.2, h: 0.35,
  fontSize: 8.5, fontFace: FONT, color: C.gray, italic: true, align: "center", margin: 0,
});

// --- ARROW 1 ---
s.addShape(pres.ShapeType.rightArrow, {
  x: 3.95, y: 2.45, w: 0.55, h: 0.4,
  fill: { color: C.teal },
});

// --- COLUMN 2: API + DATABASES ---
const aX = 4.6;
const aW = 3.8;

s.addShape(pres.ShapeType.roundRect, {
  x: aX, y: 0.65, w: aW, h: 0.38,
  fill: { color: C.teal }, rectRadius: 0.07,
});
s.addText("IS-API v0.3.0", {
  x: aX, y: 0.65, w: aW, h: 0.38,
  fontSize: 12, fontFace: FONT, color: C.white, bold: true, align: "center", margin: 0,
});

s.addText("7 ImmuneDB Instances", {
  x: aX, y: 1.15, w: aW, h: 0.25,
  fontSize: 10, fontFace: FONT, color: C.navy, bold: true, align: "center", margin: 0,
});

const dbs = [
  { id: "CD1", n: 51 }, { id: "CD2", n: 19 },
  { id: "CD3", n: 13 }, { id: "CVX1", n: 12 },
  { id: "CVX2", n: 5 }, { id: "HC1", n: 6 },
  { id: "GT1", n: 15 },
];
const dbCols = ["b71c1c","e65100","ff9800","7e57c2","9467bd","2e7d32","78909c"];

dbs.forEach((db, i) => {
  const row = Math.floor(i / 2);
  const col = i % 2;
  const bx = aX + 0.15 + col * 1.85;
  const by = 1.45 + row * 0.5;

  s.addShape(pres.ShapeType.roundRect, {
    x: bx, y: by, w: 1.7, h: 0.42,
    fill: { color: C.lightGray }, line: { color: C.border, width: 0.5 }, rectRadius: 0.05,
  });
  s.addShape(pres.ShapeType.rect, {
    x: bx, y: by, w: 0.1, h: 0.42,
    fill: { color: dbCols[i] },
  });
  s.addText(`${db.id}  (n=${db.n})`, {
    x: bx + 0.15, y: by, w: 1.5, h: 0.42,
    fontSize: 9, fontFace: FONT, color: C.navy, bold: true, margin: 0, valign: "middle",
  });
});

s.addText("103 subjects total (blood/PBL)", {
  x: aX, y: 3.5, w: aW, h: 0.25,
  fontSize: 9.5, fontFace: FONT, color: C.teal, bold: true, align: "center", margin: 0,
});

// Processing
s.addShape(pres.ShapeType.roundRect, {
  x: aX + 0.15, y: 3.8, w: aW - 0.3, h: 0.6,
  fill: { color: C.tealLight }, line: { color: C.teal, width: 0.7, dashType: "dash" }, rectRadius: 0.05,
});
s.addText([
  { text: "• Queries all databases in parallel\n", options: { fontSize: 8.5, color: C.gray } },
  { text: "• Filters by metadata key/value\n", options: { fontSize: 8.5, color: C.gray } },
  { text: "• Returns unified JSON per subject", options: { fontSize: 8.5, color: C.gray } },
], {
  x: aX + 0.25, y: 3.85, w: aW - 0.5, h: 0.5, margin: 0, lineSpacingMultiple: 1.1,
});

// --- ARROW 2 ---
s.addShape(pres.ShapeType.rightArrow, {
  x: 8.45, y: 2.45, w: 0.55, h: 0.4,
  fill: { color: C.teal },
});

// --- COLUMN 3: STATISTICAL OUTPUTS ---
const oX = 9.1;
const oW = 3.9;

s.addShape(pres.ShapeType.roundRect, {
  x: oX, y: 0.65, w: oW, h: 0.38,
  fill: { color: C.navy }, rectRadius: 0.07,
});
s.addText("Statistical Outputs", {
  x: oX, y: 0.65, w: oW, h: 0.38,
  fontSize: 12, fontFace: FONT, color: C.white, bold: true, align: "center", margin: 0,
});

// Clone level
const cY = 1.15;
s.addShape(pres.ShapeType.roundRect, {
  x: oX, y: cY, w: oW, h: 0.95,
  fill: { color: C.cloneBg }, line: { color: C.cloneOrange, width: 1 }, rectRadius: 0.06,
});
s.addText("Clone Level", {
  x: oX + 0.12, y: cY + 0.05, w: 1.5, h: 0.2,
  fontSize: 10, fontFace: FONT, color: C.cloneOrange, bold: true, margin: 0,
});
s.addText([
  { text: "clone_count", options: { fontFace: MONO, fontSize: 9, color: C.navy, bold: true } },
  { text: "  # distinct clones\n", options: { fontSize: 8, color: C.gray } },
  { text: "clone_size", options: { fontFace: MONO, fontSize: 9, color: C.navy, bold: true } },
  { text: "  unique seqs/clone (≥20)\n", options: { fontSize: 8, color: C.gray } },
  { text: "topX_clone_size_copies", options: { fontFace: MONO, fontSize: 9, color: C.navy, bold: true } },
  { text: "  Top 10/100/1000", options: { fontSize: 8, color: C.gray } },
], {
  x: oX + 0.12, y: cY + 0.28, w: oW - 0.24, h: 0.65, margin: 0, lineSpacingMultiple: 1.05,
});

// CDR3 level
const cdY = 2.2;
s.addShape(pres.ShapeType.roundRect, {
  x: oX, y: cdY, w: oW, h: 0.7,
  fill: { color: C.purpleLight }, line: { color: C.purple, width: 1 }, rectRadius: 0.06,
});
s.addText("CDR3 Level", {
  x: oX + 0.12, y: cdY + 0.05, w: 1.5, h: 0.2,
  fontSize: 10, fontFace: FONT, color: C.purple, bold: true, margin: 0,
});
s.addText([
  { text: "topX_AA_AVG_CDR3_length", options: { fontFace: MONO, fontSize: 9, color: C.navy, bold: true } },
  { text: "  AA avg (top 10)\n", options: { fontSize: 8, color: C.gray } },
  { text: "topX_nt_AVG_CDR3_length", options: { fontFace: MONO, fontSize: 9, color: C.navy, bold: true } },
  { text: "  nt avg (top 10)", options: { fontSize: 8, color: C.gray } },
], {
  x: oX + 0.12, y: cdY + 0.28, w: oW - 0.24, h: 0.4, margin: 0, lineSpacingMultiple: 1.05,
});

// Mutation level
const mY = 3.0;
s.addShape(pres.ShapeType.roundRect, {
  x: oX, y: mY, w: oW, h: 1.4,
  fill: { color: C.mutBg }, line: { color: C.mutGreen, width: 1 }, rectRadius: 0.06,
});
s.addText("Mutation Level", {
  x: oX + 0.12, y: mY + 0.05, w: 1.8, h: 0.2,
  fontSize: 10, fontFace: FONT, color: C.mutGreen, bold: true, margin: 0,
});
s.addText([
  { text: "topX_mutation_level", options: { fontFace: MONO, fontSize: 9, color: C.navy, bold: true } },
  { text: "  avg count (top 10)\n", options: { fontSize: 8, color: C.gray } },
  { text: "mutation_by_region", options: { fontFace: MONO, fontSize: 9, color: C.navy, bold: true } },
  { text: "  CDR vs FWR\n", options: { fontSize: 8, color: C.gray } },
  { text: "mutation_by_type", options: { fontFace: MONO, fontSize: 9, color: C.navy, bold: true } },
  { text: "  Replacement vs Silent\n", options: { fontSize: 8, color: C.gray } },
  { text: "mutation_cdr_rs_ratio", options: { fontFace: MONO, fontSize: 9, color: C.navy, bold: true } },
  { text: "  R/S ratio by region", options: { fontSize: 8, color: C.gray } },
], {
  x: oX + 0.12, y: mY + 0.28, w: oW - 0.24, h: 1.05, margin: 0, lineSpacingMultiple: 1.05,
});

// ================================================================
// PANEL B — Query Matrix Table
// ================================================================
const panelBY = 4.75;

s.addText("B", {
  x: 0.25, y: panelBY, w: 0.35, h: 0.35,
  fontSize: 18, fontFace: FONT_TITLE, color: C.navy, bold: true, margin: 0,
});
s.addText("Query Capability Matrix", {
  x: 0.6, y: panelBY, w: 6, h: 0.35,
  fontSize: 16, fontFace: FONT_TITLE, color: C.navy, bold: true, margin: 0,
});

s.addText("Every metadata filter combination can be paired with any statistical endpoint. Checkmarks indicate queries demonstrated in this study.", {
  x: 0.3, y: panelBY + 0.35, w: 12.7, h: 0.3,
  fontSize: 9.5, fontFace: FONT, color: C.midGray, italic: true, margin: 0,
});

// Table
const tX = 0.3;
const tY = panelBY + 0.75;
const rowH = 0.38;
const col0W = 2.8; // filter column
const colW = 1.32; // each stat column (8 columns)
const stats = [
  "Clone\nCount", "Clone\nSize", "Top-X\nCopies",
  "CDR3\nLength", "Mutation\nCount", "CDR vs\nFWR", "R vs S\nType", "R/S\nRatio"
];

// Color coding for stat column headers
const statColors = [
  C.cloneOrange, C.cloneOrange, C.cloneOrange,
  C.purple, C.mutGreen, C.mutGreen, C.mutGreen, C.mutGreen,
];
const statBgs = [
  C.cloneBg, C.cloneBg, C.cloneBg,
  C.purpleLight, C.mutBg, C.mutBg, C.mutBg, C.mutBg,
];

// Header row
s.addShape(pres.ShapeType.rect, {
  x: tX, y: tY, w: col0W, h: rowH + 0.1,
  fill: { color: C.navy },
});
s.addText("Metadata Filter\nCombination", {
  x: tX, y: tY, w: col0W, h: rowH + 0.1,
  fontSize: 9.5, fontFace: FONT, color: C.white, bold: true, align: "center", margin: [2, 4, 2, 4], valign: "middle",
});

stats.forEach((st, i) => {
  const cx = tX + col0W + i * colW;
  s.addShape(pres.ShapeType.rect, {
    x: cx, y: tY, w: colW, h: rowH + 0.1,
    fill: { color: statBgs[i] }, line: { color: C.border, width: 0.4 },
  });
  s.addText(st, {
    x: cx, y: tY, w: colW, h: rowH + 0.1,
    fontSize: 8.5, fontFace: FONT, color: statColors[i], bold: true, align: "center", margin: [1, 2, 1, 2], valign: "middle",
  });
});

// Data rows
const filters = [
  { label: "disease_stage", level: "Subject", checks: [1,1,1,1,1,1,1,1] },
  { label: "disease_stage + sex", level: "Subject", checks: [1,1,1,1,1,0,0,0] },
  { label: "disease_stage + age", level: "Subject", checks: [1,1,1,1,1,0,0,0] },
  { label: "tissue", level: "Sample", checks: [1,1,1,1,1,1,1,1] },
  { label: "disease_stage + tissue", level: "Subject + Sample", checks: [1,1,1,1,1,1,1,1] },
  { label: "disease + sex + tissue", level: "All levels", checks: [1,1,1,1,1,0,0,0] },
  { label: "disease + age + tissue", level: "All levels", checks: [1,1,1,1,1,0,0,0] },
  { label: "study_title", level: "Study", checks: [1,1,1,1,1,1,1,1] },
  { label: "tissue (within subject)", level: "Within-subject", checks: [1,1,1,1,1,1,1,1] },
];

// Level colors for row labels
const levelColors = {
  "Subject": C.green,
  "Sample": C.orange,
  "Subject + Sample": C.teal,
  "All levels": C.navy,
  "Study": C.teal,
  "Within-subject": C.orange,
};

filters.forEach((f, ri) => {
  const ry = tY + rowH + 0.1 + ri * rowH;
  const isAlt = ri % 2 === 0;

  // Filter name cell
  s.addShape(pres.ShapeType.rect, {
    x: tX, y: ry, w: col0W, h: rowH,
    fill: { color: isAlt ? C.lightGray : C.white }, line: { color: C.border, width: 0.3 },
  });

  // Level tag
  const lvlColor = levelColors[f.level] || C.gray;
  s.addText(f.label, {
    x: tX + 0.1, y: ry, w: col0W - 0.2, h: rowH,
    fontSize: 9, fontFace: MONO, color: C.navy, bold: true, margin: 0, valign: "middle",
  });

  // Check cells
  f.checks.forEach((ck, ci) => {
    const cx = tX + col0W + ci * colW;
    s.addShape(pres.ShapeType.rect, {
      x: cx, y: ry, w: colW, h: rowH,
      fill: { color: isAlt ? C.lightGray : C.white }, line: { color: C.border, width: 0.3 },
    });
    if (ck) {
      s.addText("✓", {
        x: cx, y: ry, w: colW, h: rowH,
        fontSize: 14, fontFace: FONT, color: C.teal, bold: true, align: "center", margin: 0, valign: "middle",
      });
    } else {
      s.addText("—", {
        x: cx, y: ry, w: colW, h: rowH,
        fontSize: 10, fontFace: FONT, color: C.border, align: "center", margin: 0, valign: "middle",
      });
    }
  });
});

// Footer note
const footY = tY + rowH + 0.1 + filters.length * rowH + 0.15;
s.addText([
  { text: "✓", options: { fontSize: 12, color: C.teal, bold: true } },
  { text: " = query demonstrated in this study.  ", options: { fontSize: 9, color: C.midGray } },
  { text: "—", options: { fontSize: 10, color: C.border, bold: true } },
  { text: " = valid query, not shown (data available via API).  All ", options: { fontSize: 9, color: C.midGray } },
  { text: "filter × statistic", options: { fontSize: 9, color: C.midGray, italic: true } },
  { text: " combinations are supported.", options: { fontSize: 9, color: C.midGray } },
], {
  x: 0.3, y: footY, w: 12.7, h: 0.35, margin: 0,
});

const outPath = path.join(__dirname, "IS-API_Schema_Fig.pptx");
pres.writeFile({ fileName: outPath }).then(() => {
  console.log("Saved:", outPath);
});
