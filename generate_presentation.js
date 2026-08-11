const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";

// Color palette - Ocean/Teal for immunology
const C = {
  navy:      "1A2744",
  teal:      "028090",
  seafoam:   "00A896",
  mint:      "02C39A",
  white:     "FFFFFF",
  offWhite:  "F0F4F8",
  lightGray: "E2E8F0",
  darkGray:  "4A5568",
  midGray:   "718096",
  accent:    "E53E3E",
};

const FONT_TITLE = "Cambria";
const FONT_BODY = "Calibri";

const META_PLOTS = "immunedb_STATS_API/metadata/plots/";
const CLONE_PLOTS = "immunedb_STATS_API/clonal_analysis/plots/";

function imgData(relPath) {
  const full = path.join(__dirname, relPath);
  const ext = path.extname(full).slice(1).toLowerCase();
  const buf = fs.readFileSync(full);
  return `image/${ext === "jpg" ? "jpeg" : ext};base64,${buf.toString("base64")}`;
}

// ========== SLIDE 1: Title ==========
{
  const s = pres.addSlide();
  s.background = { fill: C.navy };

  s.addText("IS-API v0.3.0", {
    x: 0.8, y: 1.0, w: 11.5, h: 1.2,
    fontSize: 48, fontFace: FONT_TITLE, color: C.white,
    bold: true, align: "left",
  });
  s.addText("A RESTful Statistics API for Cross-Study\nImmune Repertoire Analysis", {
    x: 0.8, y: 2.3, w: 11.5, h: 1.2,
    fontSize: 24, fontFace: FONT_BODY, color: C.seafoam,
    align: "left", lineSpacingMultiple: 1.3,
  });
  s.addText("COVID-19 BCR Repertoire Use Case", {
    x: 0.8, y: 3.8, w: 11.5, h: 0.6,
    fontSize: 18, fontFace: FONT_BODY, color: C.midGray,
    italic: true, align: "left",
  });
  s.addText("System Immunology Lab", {
    x: 0.8, y: 5.5, w: 5, h: 0.5,
    fontSize: 16, fontFace: FONT_BODY, color: C.lightGray,
    align: "left",
  });
}

// ========== SLIDE 2: The Problem ==========
{
  const s = pres.addSlide();
  s.background = { fill: C.white };

  s.addText("The Challenge", {
    x: 0.8, y: 0.3, w: 11.5, h: 0.8,
    fontSize: 36, fontFace: FONT_TITLE, color: C.navy, bold: true,
  });

  const problems = [
    { icon: "🧬", title: "Data Heterogeneity", desc: "AIRR-seq studies use different metadata schemas, disease labels, and tissue types across repositories" },
    { icon: "🔍", title: "No Cross-Study Statistics", desc: "Existing tools (iReceptor, VDJServer) focus on sequence storage and retrieval, not comparative analysis" },
    { icon: "📊", title: "Manual Harmonization", desc: "Researchers must manually reconcile metadata before any cross-study comparison is possible" },
    { icon: "⏱️", title: "Reproducibility Gap", desc: "Ad-hoc analysis pipelines make it difficult to replicate findings across different cohorts" },
  ];

  problems.forEach((p, i) => {
    const yPos = 1.4 + i * 1.3;
    s.addShape(pres.ShapeType.roundRect, {
      x: 0.8, y: yPos, w: 11.5, h: 1.1,
      fill: { color: C.offWhite }, rectRadius: 0.1,
      shadow: { type: "outer", blur: 4, offset: 2, angle: 135, color: "000000", opacity: 0.1 },
    });
    s.addText(p.icon, {
      x: 1.0, y: yPos + 0.15, w: 0.8, h: 0.8,
      fontSize: 28, align: "center", margin: 0,
    });
    s.addText(p.title, {
      x: 2.0, y: yPos + 0.1, w: 4, h: 0.4,
      fontSize: 18, fontFace: FONT_BODY, color: C.navy, bold: true, margin: 0,
    });
    s.addText(p.desc, {
      x: 2.0, y: yPos + 0.5, w: 10, h: 0.5,
      fontSize: 14, fontFace: FONT_BODY, color: C.darkGray, margin: 0,
    });
  });
}

// ========== SLIDE 3: IS-API Solution ==========
{
  const s = pres.addSlide();
  s.background = { fill: C.white };

  s.addText("IS-API: The Solution", {
    x: 0.8, y: 0.3, w: 11.5, h: 0.8,
    fontSize: 36, fontFace: FONT_TITLE, color: C.navy, bold: true,
  });

  s.addText("A RESTful API built on ImmuneDB that enables standardized cross-study BCR analysis", {
    x: 0.8, y: 1.1, w: 11.5, h: 0.5,
    fontSize: 16, fontFace: FONT_BODY, color: C.darkGray, italic: true,
  });

  s.addImage({
    data: imgData("methods_fig2.png"),
    x: 0.5, y: 1.8, w: 5.5, h: 3.5,
  });

  const features = [
    { title: "Metadata-Driven Filtering", desc: "Query by disease stage, tissue, sex, age across all databases" },
    { title: "5 Statistical Endpoints", desc: "Clone count, clone size, CDR3 length, somatic mutations, Top-X analysis" },
    { title: "7 ImmuneDB Instances", desc: "COVID-19, vaccine, healthy, and transplant cohorts unified" },
    { title: "JSON Output", desc: "Structured responses for programmatic downstream analysis" },
  ];

  features.forEach((f, i) => {
    const yPos = 1.9 + i * 1.0;
    s.addShape(pres.ShapeType.rect, {
      x: 6.4, y: yPos, w: 0.15, h: 0.7,
      fill: { color: C.teal },
    });
    s.addText(f.title, {
      x: 6.8, y: yPos, w: 5.5, h: 0.35,
      fontSize: 15, fontFace: FONT_BODY, color: C.navy, bold: true, margin: 0,
    });
    s.addText(f.desc, {
      x: 6.8, y: yPos + 0.35, w: 5.5, h: 0.35,
      fontSize: 12, fontFace: FONT_BODY, color: C.darkGray, margin: 0,
    });
  });
}

// ========== SLIDE 4: Cohort Overview ==========
{
  const s = pres.addSlide();
  s.background = { fill: C.white };

  s.addText("Study Cohort", {
    x: 0.8, y: 0.3, w: 11.5, h: 0.8,
    fontSize: 36, fontFace: FONT_TITLE, color: C.navy, bold: true,
  });

  // Key stats
  const stats = [
    { num: "103", label: "Subjects" },
    { num: "7", label: "Databases" },
    { num: "6", label: "Disease\nCategories" },
    { num: "5", label: "Statistical\nEndpoints" },
  ];

  stats.forEach((st, i) => {
    const xPos = 0.8 + i * 3.0;
    s.addShape(pres.ShapeType.roundRect, {
      x: xPos, y: 1.2, w: 2.6, h: 1.4,
      fill: { color: i === 0 ? C.navy : C.offWhite },
      rectRadius: 0.1,
    });
    s.addText(st.num, {
      x: xPos, y: 1.25, w: 2.6, h: 0.85,
      fontSize: 44, fontFace: FONT_TITLE, bold: true,
      color: i === 0 ? C.seafoam : C.teal, align: "center", margin: 0,
    });
    s.addText(st.label, {
      x: xPos, y: 2.1, w: 2.6, h: 0.45,
      fontSize: 13, fontFace: FONT_BODY,
      color: i === 0 ? C.lightGray : C.darkGray, align: "center", margin: 0,
    });
  });

  s.addImage({
    data: imgData(META_PLOTS + "01_subjects_per_dataset.png"),
    x: 0.3, y: 2.9, w: 6.2, h: 4.0,
  });

  // Dataset table
  const rows = [
    ["Dataset", "Study", "n", "Disease"],
    ["CD1", "Covid19_db3", "51", "Mild, Severe"],
    ["CD2", "covid_db2", "19", "Severe, Moderate, Recovered"],
    ["CD3", "covid19", "13", "Mild, Severe, Healthy"],
    ["CVX1", "vaccine2", "12", "COVID Naive, Recovered"],
    ["CVX2", "covid_vaccine_new", "5", "Recovered"],
    ["HC1", "lp16_Igblast", "6", "Healthy"],
    ["GT1", "sykesIgblast2020", "15", "Transplant (excluded)"],
  ];

  rows.forEach((row, ri) => {
    const yPos = 3.05 + ri * 0.42;
    const isHeader = ri === 0;
    row.forEach((cell, ci) => {
      const widths = [0.8, 2.4, 0.5, 2.8];
      const xOff = widths.slice(0, ci).reduce((a, b) => a + b, 0);
      s.addText(cell, {
        x: 6.8 + xOff, y: yPos, w: widths[ci], h: 0.4,
        fontSize: 11, fontFace: FONT_BODY,
        color: isHeader ? C.white : C.darkGray,
        bold: isHeader,
        fill: { color: isHeader ? C.teal : (ri % 2 === 0 ? C.offWhite : C.white) },
        margin: [2, 4, 2, 4],
        valign: "middle",
      });
    });
  });
}

// ========== SLIDE 5: Disease Harmonization ==========
{
  const s = pres.addSlide();
  s.background = { fill: C.white };

  s.addText("Disease Stage Harmonization", {
    x: 0.8, y: 0.3, w: 11.5, h: 0.8,
    fontSize: 36, fontFace: FONT_TITLE, color: C.navy, bold: true,
  });

  s.addText("13 original disease labels → 6 harmonized categories", {
    x: 0.8, y: 1.0, w: 11.5, h: 0.4,
    fontSize: 16, fontFace: FONT_BODY, color: C.darkGray, italic: true,
  });

  s.addImage({
    data: imgData(META_PLOTS + "02_disease_stage_raw.png"),
    x: 0.2, y: 1.5, w: 6.5, h: 3.6,
  });

  s.addImage({
    data: imgData(META_PLOTS + "04_disease_harmonized_with_labels.png"),
    x: 6.6, y: 1.5, w: 6.5, h: 3.6,
  });

  s.addText("Original Disease Labels by Dataset", {
    x: 0.5, y: 5.2, w: 6.0, h: 0.3,
    fontSize: 11, fontFace: FONT_BODY, color: C.midGray, italic: true, align: "center",
  });
  s.addText("Harmonized Categories with Original Label Breakdown", {
    x: 6.8, y: 5.2, w: 6.0, h: 0.3,
    fontSize: 11, fontFace: FONT_BODY, color: C.midGray, italic: true, align: "center",
  });

  // Exclusion note
  s.addText("Exclusions: 3 HC1 subjects (no age/sex), 2 CVX2 controls, GT1 transplant cohort. Blood/PBL tissue only.", {
    x: 0.8, y: 5.7, w: 11.5, h: 0.4,
    fontSize: 11, fontFace: FONT_BODY, color: C.midGray,
  });
}

// ========== SLIDE 6: Demographics ==========
{
  const s = pres.addSlide();
  s.background = { fill: C.white };

  s.addText("Participant Demographics", {
    x: 0.8, y: 0.3, w: 11.5, h: 0.8,
    fontSize: 36, fontFace: FONT_TITLE, color: C.navy, bold: true,
  });

  s.addImage({
    data: imgData(META_PLOTS + "05_demographics_scatter.png"),
    x: 0.5, y: 1.2, w: 8.5, h: 5.0,
  });

  // Key points
  const points = [
    "Age range: 18–87 years",
    "52 Male, 34 Female, 14 NA",
    "Median age: 48 years",
    "CD1 dominates Severe & Mild",
    "CVX1 = all COVID Naive",
    "HC1 = all Healthy controls",
  ];

  s.addShape(pres.ShapeType.roundRect, {
    x: 9.3, y: 1.3, w: 3.5, h: 4.5,
    fill: { color: C.offWhite }, rectRadius: 0.15,
  });

  s.addText("Key Demographics", {
    x: 9.5, y: 1.5, w: 3.1, h: 0.4,
    fontSize: 16, fontFace: FONT_BODY, color: C.navy, bold: true, margin: 0,
  });

  points.forEach((p, i) => {
    s.addText([{ text: p, options: { fontSize: 13, fontFace: FONT_BODY, color: C.darkGray, bullet: true } }], {
      x: 9.5, y: 2.1 + i * 0.55, w: 3.1, h: 0.45, margin: 0,
      paraSpaceAfter: 4,
    });
  });
}

// ========== SLIDE 7: Clone Size Results ==========
{
  const s = pres.addSlide();
  s.background = { fill: C.white };

  s.addText("Clone Size Distribution", {
    x: 0.8, y: 0.3, w: 11.5, h: 0.8,
    fontSize: 36, fontFace: FONT_TITLE, color: C.navy, bold: true,
  });

  s.addText("Unique sequences per clone (clones with ≥20 unique sequences)", {
    x: 0.8, y: 1.0, w: 11.5, h: 0.4,
    fontSize: 14, fontFace: FONT_BODY, color: C.darkGray, italic: true,
  });

  s.addImage({
    data: imgData(CLONE_PLOTS + "08b_clone_size_distribution.png"),
    x: 0.3, y: 1.5, w: 7.5, h: 5.0,
  });

  // Key findings
  s.addShape(pres.ShapeType.roundRect, {
    x: 8.2, y: 1.5, w: 4.6, h: 4.8,
    fill: { color: C.offWhite }, rectRadius: 0.15,
  });

  s.addText("Key Findings", {
    x: 8.4, y: 1.7, w: 4.2, h: 0.4,
    fontSize: 16, fontFace: FONT_BODY, color: C.navy, bold: true, margin: 0,
  });

  const findings = [
    "COVID Naive shows highest median clone size and widest distribution",
    "Severe has the heaviest upper tail (max ~8,600 unique sequences)",
    "Mild shows most heterogeneous pattern across subjects",
    "Healthy (HC1) has compact distribution, consistent with diverse unexpanded repertoire",
    "All groups show right-skewed distributions on log scale",
  ];

  findings.forEach((f, i) => {
    s.addText([{ text: f, options: { fontSize: 12, fontFace: FONT_BODY, color: C.darkGray, bullet: true } }], {
      x: 8.4, y: 2.3 + i * 0.7, w: 4.2, h: 0.6, margin: 0,
      paraSpaceAfter: 4,
    });
  });
}

// ========== SLIDE 8: Clone Count ==========
{
  const s = pres.addSlide();
  s.background = { fill: C.white };

  s.addText("Clone Count by Disease Category", {
    x: 0.8, y: 0.3, w: 11.5, h: 0.8,
    fontSize: 36, fontFace: FONT_TITLE, color: C.navy, bold: true,
  });

  s.addText("Number of distinct clones per subject across disease severities", {
    x: 0.8, y: 1.0, w: 11.5, h: 0.4,
    fontSize: 14, fontFace: FONT_BODY, color: C.darkGray, italic: true,
  });

  s.addImage({
    data: imgData(CLONE_PLOTS + "01_clone_count_by_disease.png"),
    x: 0.3, y: 1.5, w: 7.5, h: 5.0,
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 8.2, y: 1.5, w: 4.6, h: 4.8,
    fill: { color: C.offWhite }, rectRadius: 0.15,
  });

  s.addText("Key Findings", {
    x: 8.4, y: 1.7, w: 4.2, h: 0.4,
    fontSize: 16, fontFace: FONT_BODY, color: C.navy, bold: true, margin: 0,
  });

  const ccFindings = [
    "Clone count reflects B cell diversity within each subject's repertoire",
    "Severe COVID patients show variable clone counts, reflecting heterogeneous immune responses",
    "Healthy controls (HC1) show consistently lower clone counts",
    "Higher clone counts in Mild/Recovered may indicate broader polyclonal activation",
  ];

  ccFindings.forEach((f, i) => {
    s.addText([{ text: f, options: { fontSize: 12, fontFace: FONT_BODY, color: C.darkGray, bullet: true } }], {
      x: 8.4, y: 2.3 + i * 0.8, w: 4.2, h: 0.7, margin: 0,
      paraSpaceAfter: 4,
    });
  });
}

// ========== SLIDE 9: Expanded Clones ==========
{
  const s = pres.addSlide();
  s.background = { fill: C.white };

  s.addText("Expanded Clones Analysis", {
    x: 0.8, y: 0.3, w: 11.5, h: 0.8,
    fontSize: 36, fontFace: FONT_TITLE, color: C.navy, bold: true,
  });

  s.addImage({
    data: imgData(CLONE_PLOTS + "10_expanded_clones_by_disease.png"),
    x: 0.3, y: 1.2, w: 6.0, h: 4.0,
  });

  s.addImage({
    data: imgData(CLONE_PLOTS + "11_expanded_clone_size_by_disease.png"),
    x: 6.5, y: 1.2, w: 6.0, h: 4.0,
  });

  s.addText("Count of Expanded Clones (>100 unique seqs)", {
    x: 0.5, y: 5.2, w: 5.8, h: 0.3,
    fontSize: 11, fontFace: FONT_BODY, color: C.midGray, italic: true, align: "center",
  });
  s.addText("Mean Size of Expanded Clones", {
    x: 6.7, y: 5.2, w: 5.8, h: 0.3,
    fontSize: 11, fontFace: FONT_BODY, color: C.midGray, italic: true, align: "center",
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 0.8, y: 5.6, w: 11.5, h: 1.2,
    fill: { color: C.offWhite }, rectRadius: 0.1,
  });
  s.addText("Expanded clones (>100 unique sequences) represent antigen-driven clonal expansion. Severe and COVID Naive groups show the highest expansion counts, while expanded clone size reveals the magnitude of individual clonal responses.", {
    x: 1.0, y: 5.7, w: 11.1, h: 1.0,
    fontSize: 13, fontFace: FONT_BODY, color: C.darkGray, margin: 0,
  });
}

// ========== SLIDE 10: R/S Ratio ==========
{
  const s = pres.addSlide();
  s.background = { fill: C.white };

  s.addText("Replacement/Silent Mutation Ratio", {
    x: 0.8, y: 0.3, w: 11.5, h: 0.8,
    fontSize: 36, fontFace: FONT_TITLE, color: C.navy, bold: true,
  });

  s.addText("R/S ratio as a measure of antigen-driven selection pressure", {
    x: 0.8, y: 1.0, w: 11.5, h: 0.4,
    fontSize: 14, fontFace: FONT_BODY, color: C.darkGray, italic: true,
  });

  s.addImage({
    data: imgData(CLONE_PLOTS + "08_rs_ratio_by_disease.png"),
    x: 0.3, y: 1.5, w: 7.5, h: 5.0,
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 8.2, y: 1.5, w: 4.6, h: 4.8,
    fill: { color: C.offWhite }, rectRadius: 0.15,
  });

  s.addText("Key Findings", {
    x: 8.4, y: 1.7, w: 4.2, h: 0.4,
    fontSize: 16, fontFace: FONT_BODY, color: C.navy, bold: true, margin: 0,
  });

  const rsFindings = [
    "R/S ratio > 1 indicates positive selection — replacement mutations are favored over silent ones",
    "Higher R/S in CDR regions vs framework reflects antigen-driven selection in binding sites",
    "COVID Naive and Recovered groups show elevated R/S ratios consistent with affinity maturation",
    "Healthy controls show baseline R/S levels expected for unselected repertoires",
  ];

  rsFindings.forEach((f, i) => {
    s.addText([{ text: f, options: { fontSize: 12, fontFace: FONT_BODY, color: C.darkGray, bullet: true } }], {
      x: 8.4, y: 2.3 + i * 0.8, w: 4.2, h: 0.7, margin: 0,
      paraSpaceAfter: 4,
    });
  });
}

// ========== SLIDE 11: Mutation Analysis ==========
{
  const s = pres.addSlide();
  s.background = { fill: C.white };

  s.addText("Somatic Hypermutation Analysis", {
    x: 0.8, y: 0.3, w: 11.5, h: 0.8,
    fontSize: 36, fontFace: FONT_TITLE, color: C.navy, bold: true,
  });

  s.addImage({
    data: imgData(CLONE_PLOTS + "05_mutation_by_disease.png"),
    x: 0.3, y: 1.2, w: 6.0, h: 4.0,
  });

  s.addImage({
    data: imgData(CLONE_PLOTS + "07_cdr_mutations_by_disease.png"),
    x: 6.5, y: 1.2, w: 6.0, h: 4.0,
  });

  s.addText("Mutation Count (Top 10 Clones)", {
    x: 0.5, y: 5.2, w: 5.8, h: 0.3,
    fontSize: 11, fontFace: FONT_BODY, color: C.midGray, italic: true, align: "center",
  });
  s.addText("CDR Region Mutations", {
    x: 6.7, y: 5.2, w: 5.8, h: 0.3,
    fontSize: 11, fontFace: FONT_BODY, color: C.midGray, italic: true, align: "center",
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 0.8, y: 5.6, w: 11.5, h: 1.2,
    fill: { color: C.offWhite }, rectRadius: 0.1,
  });
  s.addText("Mutation counts represent unique nucleotide positions differing from germline. Higher mutation in COVID Naive and Recovered groups suggests mature, affinity-selected B cell responses. CDR mutations indicate antigen-driven selection.", {
    x: 1.0, y: 5.7, w: 11.1, h: 1.0,
    fontSize: 13, fontFace: FONT_BODY, color: C.darkGray, margin: 0,
  });
}

// ========== SLIDE 12: CDR3 Length ==========
{
  const s = pres.addSlide();
  s.background = { fill: C.white };

  s.addText("CDR3 Length Analysis", {
    x: 0.8, y: 0.3, w: 11.5, h: 0.8,
    fontSize: 36, fontFace: FONT_TITLE, color: C.navy, bold: true,
  });

  s.addImage({
    data: imgData(CLONE_PLOTS + "03_cdr3_by_disease.png"),
    x: 0.3, y: 1.2, w: 6.0, h: 4.0,
  });

  s.addImage({
    data: imgData(CLONE_PLOTS + "04_cdr3_range_by_disease.png"),
    x: 6.5, y: 1.2, w: 6.0, h: 4.0,
  });

  s.addText("CDR3 Length (Top 10 Clones, AA)", {
    x: 0.5, y: 5.2, w: 5.8, h: 0.3,
    fontSize: 11, fontFace: FONT_BODY, color: C.midGray, italic: true, align: "center",
  });
  s.addText("CDR3 Length Range per Subject", {
    x: 6.7, y: 5.2, w: 5.8, h: 0.3,
    fontSize: 11, fontFace: FONT_BODY, color: C.midGray, italic: true, align: "center",
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 0.8, y: 5.6, w: 11.5, h: 1.2,
    fill: { color: C.offWhite }, rectRadius: 0.1,
  });
  s.addText("CDR3 lengths are relatively consistent across disease categories (~15–16 AA for top clones), suggesting the overall structural constraints on antigen binding are preserved. Greater CDR3 range diversity is observed in COVID Naive and Recovered groups.", {
    x: 1.0, y: 5.7, w: 11.1, h: 1.0,
    fontSize: 13, fontFace: FONT_BODY, color: C.darkGray, margin: 0,
  });
}

// ========== SLIDE 13: Summary ==========
{
  const s = pres.addSlide();
  s.background = { fill: C.navy };

  s.addText("Summary & Conclusions", {
    x: 0.8, y: 0.4, w: 11.5, h: 0.8,
    fontSize: 36, fontFace: FONT_TITLE, color: C.white, bold: true,
  });

  const conclusions = [
    { title: "IS-API enables cross-study analysis", desc: "Successfully harmonized 103 subjects across 7 databases with 6 disease categories through metadata-driven filtering" },
    { title: "Disease severity shapes BCR repertoire", desc: "Systematic differences in clone size, mutation burden, and CDR3 diversity across COVID-19 severity groups" },
    { title: "COVID Naive shows distinct expansion", desc: "Highest clonal expansion and mutation counts, suggesting pre-existing mature memory B cell responses" },
    { title: "Standardized API reduces barriers", desc: "Reproducible analysis pipeline replacing manual harmonization, enabling broader immunological studies" },
  ];

  conclusions.forEach((c, i) => {
    const yPos = 1.5 + i * 1.25;
    s.addShape(pres.ShapeType.roundRect, {
      x: 0.8, y: yPos, w: 11.5, h: 1.05,
      fill: { color: "1E3158" }, rectRadius: 0.1,
    });
    s.addShape(pres.ShapeType.rect, {
      x: 0.8, y: yPos, w: 0.12, h: 1.05,
      fill: { color: C.seafoam },
    });
    s.addText(c.title, {
      x: 1.2, y: yPos + 0.08, w: 10.8, h: 0.38,
      fontSize: 18, fontFace: FONT_BODY, color: C.seafoam, bold: true, margin: 0,
    });
    s.addText(c.desc, {
      x: 1.2, y: yPos + 0.5, w: 10.8, h: 0.45,
      fontSize: 14, fontFace: FONT_BODY, color: C.lightGray, margin: 0,
    });
  });

  s.addText("IS-API v0.3.0  |  System Immunology Lab", {
    x: 0.8, y: 6.5, w: 11.5, h: 0.4,
    fontSize: 12, fontFace: FONT_BODY, color: C.midGray, align: "center",
  });
}

const outPath = path.join(__dirname, "IS-API_Presentation.pptx");
pres.writeFile({ fileName: outPath }).then(() => {
  console.log("Saved:", outPath);
});
