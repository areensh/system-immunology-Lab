const pptxgen = require("pptxgenjs");
const path = require("path");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";

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
  accent:    "E53E3E",
};

const FONT = "Calibri";
const FONT_TITLE = "Cambria";

const s = pres.addSlide();
s.background = { fill: C.bg };

// ===== TITLE =====
s.addText("IS-API v0.3.0 — Query Architecture", {
  x: 0.4, y: 0.2, w: 12.5, h: 0.5,
  fontSize: 20, fontFace: FONT_TITLE, color: C.navy, bold: true,
});

// ===== THREE COLUMNS: FILTERS → API → OUTPUTS =====

// --- COLUMN 1: METADATA FILTERS ---
const filterX = 0.3;
const filterW = 3.8;

// Column header
s.addShape(pres.ShapeType.roundRect, {
  x: filterX, y: 0.85, w: filterW, h: 0.45,
  fill: { color: C.navy }, rectRadius: 0.08,
});
s.addText("Metadata Filters (Input)", {
  x: filterX, y: 0.85, w: filterW, h: 0.45,
  fontSize: 13, fontFace: FONT, color: C.white, bold: true, align: "center", margin: 0,
});

// Study level
const studyY = 1.5;
s.addShape(pres.ShapeType.roundRect, {
  x: filterX, y: studyY, w: filterW, h: 1.15,
  fill: { color: C.tealLight }, line: { color: C.teal, width: 1.2 }, rectRadius: 0.08,
});
s.addText("Study Level", {
  x: filterX + 0.15, y: studyY + 0.08, w: filterW - 0.3, h: 0.3,
  fontSize: 11, fontFace: FONT, color: C.teal, bold: true, margin: 0,
});
s.addText([
  { text: "study_title", options: { fontFace: "Courier New", fontSize: 10, color: C.navy, bold: true } },
  { text: "  — which database(s) to query", options: { fontSize: 10, color: C.gray } },
  { text: "\n", options: { fontSize: 6 } },
  { text: "Relevant publications", options: { fontFace: "Courier New", fontSize: 10, color: C.navy, bold: true } },
  { text: "  — source study", options: { fontSize: 10, color: C.gray } },
], {
  x: filterX + 0.15, y: studyY + 0.38, w: filterW - 0.3, h: 0.7,
  margin: 0, lineSpacingMultiple: 1.2,
});

// Subject level
const subjY = 2.85;
s.addShape(pres.ShapeType.roundRect, {
  x: filterX, y: subjY, w: filterW, h: 1.45,
  fill: { color: C.greenLight }, line: { color: C.green, width: 1.2 }, rectRadius: 0.08,
});
s.addText("Subject Level", {
  x: filterX + 0.15, y: subjY + 0.08, w: filterW - 0.3, h: 0.3,
  fontSize: 11, fontFace: FONT, color: C.green, bold: true, margin: 0,
});
s.addText([
  { text: "disease_stage", options: { fontFace: "Courier New", fontSize: 10, color: C.navy, bold: true } },
  { text: "  — e.g. severe, mild, healthy", options: { fontSize: 10, color: C.gray } },
  { text: "\n", options: { fontSize: 6 } },
  { text: "sex", options: { fontFace: "Courier New", fontSize: 10, color: C.navy, bold: true } },
  { text: "  — Male, Female", options: { fontSize: 10, color: C.gray } },
  { text: "\n", options: { fontSize: 6 } },
  { text: "Age minimum", options: { fontFace: "Courier New", fontSize: 10, color: C.navy, bold: true } },
  { text: "  — numeric age", options: { fontSize: 10, color: C.gray } },
], {
  x: filterX + 0.15, y: subjY + 0.38, w: filterW - 0.3, h: 1.0,
  margin: 0, lineSpacingMultiple: 1.2,
});

// Sample level
const sampY = 4.5;
s.addShape(pres.ShapeType.roundRect, {
  x: filterX, y: sampY, w: filterW, h: 1.45,
  fill: { color: C.orangeLight }, line: { color: C.orange, width: 1.2 }, rectRadius: 0.08,
});
s.addText("Sample Level", {
  x: filterX + 0.15, y: sampY + 0.08, w: filterW - 0.3, h: 0.3,
  fontSize: 11, fontFace: FONT, color: C.orange, bold: true, margin: 0,
});
s.addText([
  { text: "tissue", options: { fontFace: "Courier New", fontSize: 10, color: C.navy, bold: true } },
  { text: "  — blood, PBL, BM", options: { fontSize: 10, color: C.gray } },
  { text: "\n", options: { fontSize: 6 } },
  { text: "cell_subset", options: { fontFace: "Courier New", fontSize: 10, color: C.navy, bold: true } },
  { text: "  — e.g. naive B, memory B", options: { fontSize: 10, color: C.gray } },
], {
  x: filterX + 0.15, y: sampY + 0.38, w: filterW - 0.3, h: 1.0,
  margin: 0, lineSpacingMultiple: 1.2,
});

// "Within-individual" annotation
s.addText("Enables within-subject\ncomparisons (e.g. blood vs BM)", {
  x: filterX + 0.15, y: sampY + 0.95, w: filterW - 0.3, h: 0.4,
  fontSize: 9, fontFace: FONT, color: C.orange, italic: true, margin: 0,
});

// Combinable note at bottom
s.addShape(pres.ShapeType.roundRect, {
  x: filterX, y: 6.15, w: filterW, h: 0.55,
  fill: { color: C.lightGray }, line: { color: C.border, width: 0.8, dashType: "dash" }, rectRadius: 0.06,
});
s.addText("All filters are freely combinable.\nSet value to \"ALL\" to include all non-NA entries.", {
  x: filterX + 0.1, y: 6.15, w: filterW - 0.2, h: 0.55,
  fontSize: 9, fontFace: FONT, color: C.gray, italic: true, align: "center", margin: 0,
});

// --- CENTER COLUMN: API + DATABASES ---
const apiX = 4.65;
const apiW = 3.8;

// Arrow from filters to API
s.addShape(pres.ShapeType.rightArrow, {
  x: 4.15, y: 3.4, w: 0.45, h: 0.35,
  fill: { color: C.teal },
});

// API box
s.addShape(pres.ShapeType.roundRect, {
  x: apiX, y: 0.85, w: apiW, h: 0.45,
  fill: { color: C.teal }, rectRadius: 0.08,
});
s.addText("IS-API v0.3.0", {
  x: apiX, y: 0.85, w: apiW, h: 0.45,
  fontSize: 13, fontFace: FONT, color: C.white, bold: true, align: "center", margin: 0,
});

// Databases grid
const dbNames = [
  { id: "CD1", name: "Covid19_db3", n: 51 },
  { id: "CD2", name: "covid_db2", n: 19 },
  { id: "CD3", name: "covid19", n: 13 },
  { id: "CVX1", name: "vaccine2", n: 12 },
  { id: "CVX2", name: "covid_vaccine", n: 5 },
  { id: "HC1", name: "lp16_Igblast", n: 6 },
  { id: "GT1", name: "sykesIgblast", n: 15 },
];

const dbColors = ["#b71c1c", "#e65100", "#ff9800", "#7e57c2", "#9467bd", "#2e7d32", "#78909c"];

s.addText("7 ImmuneDB Instances", {
  x: apiX, y: 1.45, w: apiW, h: 0.3,
  fontSize: 11, fontFace: FONT, color: C.navy, bold: true, align: "center", margin: 0,
});

dbNames.forEach((db, i) => {
  const row = Math.floor(i / 2);
  const col = i % 2;
  const bx = apiX + 0.15 + col * 1.85;
  const by = 1.8 + row * 0.65;
  const bw = 1.7;
  const bh = 0.55;

  // Color accent bar
  s.addShape(pres.ShapeType.rect, {
    x: bx, y: by, w: 0.12, h: bh,
    fill: { color: dbColors[i].replace("#", "") },
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: bx, y: by, w: bw, h: bh,
    fill: { color: C.lightGray }, line: { color: C.border, width: 0.6 }, rectRadius: 0.06,
  });

  s.addText(db.id, {
    x: bx + 0.18, y: by + 0.03, w: bw - 0.25, h: 0.22,
    fontSize: 10, fontFace: FONT, color: C.navy, bold: true, margin: 0,
  });
  s.addText(`n=${db.n}`, {
    x: bx + 0.18, y: by + 0.28, w: bw - 0.25, h: 0.2,
    fontSize: 8.5, fontFace: FONT, color: C.midGray, margin: 0,
  });
});

// Total
s.addText("103 subjects total (blood/PBL)", {
  x: apiX, y: 4.45, w: apiW, h: 0.3,
  fontSize: 10, fontFace: FONT, color: C.teal, bold: true, align: "center", margin: 0,
});

// Processing description
s.addShape(pres.ShapeType.roundRect, {
  x: apiX + 0.2, y: 4.85, w: apiW - 0.4, h: 1.05,
  fill: { color: C.tealLight }, line: { color: C.teal, width: 0.8, dashType: "dash" }, rectRadius: 0.06,
});
s.addText("Processing", {
  x: apiX + 0.3, y: 4.9, w: apiW - 0.6, h: 0.22,
  fontSize: 10, fontFace: FONT, color: C.teal, bold: true, margin: 0,
});
s.addText([
  { text: "• Queries all databases in parallel\n", options: { fontSize: 9, color: C.gray } },
  { text: "• Filters by metadata key/value pairs\n", options: { fontSize: 9, color: C.gray } },
  { text: "• Groups results per subject\n", options: { fontSize: 9, color: C.gray } },
  { text: "• Returns unified JSON response", options: { fontSize: 9, color: C.gray } },
], {
  x: apiX + 0.3, y: 5.15, w: apiW - 0.6, h: 0.7,
  margin: 0, lineSpacingMultiple: 1.15,
});

// --- COLUMN 3: STATISTICAL OUTPUTS ---
const outX = 9.1;
const outW = 3.8;

// Arrow from API to outputs
s.addShape(pres.ShapeType.rightArrow, {
  x: 8.55, y: 3.4, w: 0.45, h: 0.35,
  fill: { color: C.teal },
});

// Column header
s.addShape(pres.ShapeType.roundRect, {
  x: outX, y: 0.85, w: outW, h: 0.45,
  fill: { color: C.navy }, rectRadius: 0.08,
});
s.addText("Statistical Outputs", {
  x: outX, y: 0.85, w: outW, h: 0.45,
  fontSize: 13, fontFace: FONT, color: C.white, bold: true, align: "center", margin: 0,
});

// Clone level
const cloneY = 1.5;
s.addShape(pres.ShapeType.roundRect, {
  x: outX, y: cloneY, w: outW, h: 1.35,
  fill: { color: "FFF3E0" }, line: { color: "E65100", width: 1.2 }, rectRadius: 0.08,
});
s.addText("Clone Level", {
  x: outX + 0.15, y: cloneY + 0.08, w: 1.5, h: 0.25,
  fontSize: 11, fontFace: FONT, color: "E65100", bold: true, margin: 0,
});
s.addText([
  { text: "clone_count", options: { fontFace: "Courier New", fontSize: 9.5, color: C.navy, bold: true } },
  { text: "\n  # distinct clones per subject\n", options: { fontSize: 8.5, color: C.gray } },
  { text: "clone_size", options: { fontFace: "Courier New", fontSize: 9.5, color: C.navy, bold: true } },
  { text: "\n  unique seqs per clone (≥20 threshold)\n", options: { fontSize: 8.5, color: C.gray } },
  { text: "topX_clone_size_copies", options: { fontFace: "Courier New", fontSize: 9.5, color: C.navy, bold: true } },
  { text: "\n  Top 10/100/1000 cumulative copies", options: { fontSize: 8.5, color: C.gray } },
], {
  x: outX + 0.15, y: cloneY + 0.32, w: outW - 0.3, h: 1.0,
  margin: 0, lineSpacingMultiple: 1.05,
});

// CDR3 level
const cdrY = 3.05;
s.addShape(pres.ShapeType.roundRect, {
  x: outX, y: cdrY, w: outW, h: 1.05,
  fill: { color: C.purpleLight }, line: { color: C.purple, width: 1.2 }, rectRadius: 0.08,
});
s.addText("CDR3 Level", {
  x: outX + 0.15, y: cdrY + 0.08, w: 1.5, h: 0.25,
  fontSize: 11, fontFace: FONT, color: C.purple, bold: true, margin: 0,
});
s.addText([
  { text: "topX_AA_AVG_CDR3_length", options: { fontFace: "Courier New", fontSize: 9.5, color: C.navy, bold: true } },
  { text: "\n  avg amino acid CDR3 length (top 10 clones)\n", options: { fontSize: 8.5, color: C.gray } },
  { text: "topX_nt_AVG_CDR3_length", options: { fontFace: "Courier New", fontSize: 9.5, color: C.navy, bold: true } },
  { text: "\n  avg nucleotide CDR3 length (top 10 clones)", options: { fontSize: 8.5, color: C.gray } },
], {
  x: outX + 0.15, y: cdrY + 0.32, w: outW - 0.3, h: 0.7,
  margin: 0, lineSpacingMultiple: 1.05,
});

// Mutation level
const mutY = 4.3;
s.addShape(pres.ShapeType.roundRect, {
  x: outX, y: mutY, w: outW, h: 1.85,
  fill: { color: "E8F5E9" }, line: { color: "388E3C", width: 1.2 }, rectRadius: 0.08,
});
s.addText("Mutation Level", {
  x: outX + 0.15, y: mutY + 0.08, w: 2, h: 0.25,
  fontSize: 11, fontFace: FONT, color: "388E3C", bold: true, margin: 0,
});
s.addText([
  { text: "topX_mutation_level", options: { fontFace: "Courier New", fontSize: 9.5, color: C.navy, bold: true } },
  { text: "\n  avg mutation count (top 10 clones)\n", options: { fontSize: 8.5, color: C.gray } },
  { text: "mutation_by_region", options: { fontFace: "Courier New", fontSize: 9.5, color: C.navy, bold: true } },
  { text: "\n  CDR vs FWR mutation counts\n", options: { fontSize: 8.5, color: C.gray } },
  { text: "mutation_by_type", options: { fontFace: "Courier New", fontSize: 9.5, color: C.navy, bold: true } },
  { text: "\n  Replacement vs Silent counts\n", options: { fontSize: 8.5, color: C.gray } },
  { text: "mutation_cdr_rs_ratio", options: { fontFace: "Courier New", fontSize: 9.5, color: C.navy, bold: true } },
  { text: "\n  R/S ratio for CDR and FWR", options: { fontSize: 8.5, color: C.gray } },
], {
  x: outX + 0.15, y: mutY + 0.32, w: outW - 0.3, h: 1.5,
  margin: 0, lineSpacingMultiple: 1.05,
});

// Bottom annotation
s.addText("Every combination of metadata filters × statistical output is a valid query. Results are returned per subject in a unified JSON schema across all databases.", {
  x: 0.4, y: 6.85, w: 12.5, h: 0.35,
  fontSize: 10, fontFace: FONT, color: C.midGray, italic: true, align: "center", margin: 0,
});

const outPath = path.join(__dirname, "IS-API_Schema_Fig.pptx");
pres.writeFile({ fileName: outPath }).then(() => {
  console.log("Saved:", outPath);
});
