const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, HeadingLevel, ImageRun, BorderStyle,
  ShadingType, PageBreak, LevelFormat,
} = require("docx");

const FONT = "Times New Roman";
const SZ = 24; // 12pt
const SZ_SMALL = 20; // 10pt

function tr(text, opts = {}) {
  return new TextRun({ text, font: FONT, size: opts.size || SZ, bold: opts.bold, italics: opts.italics, underline: opts.underline });
}

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    children: [tr(text, { bold: true, size: level === HeadingLevel.HEADING_1 ? 28 : 26 })],
    spacing: { before: 240, after: 120 },
  });
}

function para(text, opts = {}) {
  const runs = [];
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  for (const p of parts) {
    if (p.startsWith("**") && p.endsWith("**")) {
      runs.push(tr(p.slice(2, -2), { bold: true, size: opts.size }));
    } else {
      runs.push(tr(p, { italics: opts.italics, size: opts.size }));
    }
  }
  return new Paragraph({
    children: runs,
    alignment: opts.alignment || AlignmentType.JUSTIFIED,
    spacing: { after: opts.after !== undefined ? opts.after : 120 },
    indent: opts.indent,
  });
}

function bulletPara(text, level = 0) {
  const runs = [];
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  for (const p of parts) {
    if (p.startsWith("**") && p.endsWith("**")) {
      runs.push(tr(p.slice(2, -2), { bold: true }));
    } else {
      runs.push(tr(p));
    }
  }
  return new Paragraph({
    children: runs,
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 60 },
    numbering: { reference: "bullets", level },
  });
}

function numberedPara(text, level = 0) {
  const runs = [];
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  for (const p of parts) {
    if (p.startsWith("**") && p.endsWith("**")) {
      runs.push(tr(p.slice(2, -2), { bold: true }));
    } else {
      runs.push(tr(p));
    }
  }
  return new Paragraph({
    children: runs,
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 80 },
    numbering: { reference: "numbered", level },
  });
}

function figPara(imgPath, w, h, caption) {
  const children = [];
  if (fs.existsSync(imgPath)) {
    children.push(new Paragraph({
      children: [new ImageRun({
        data: fs.readFileSync(imgPath),
        transformation: { width: w, height: h },
        type: "png",
      })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 60 },
    }));
  }
  if (caption) {
    children.push(new Paragraph({
      children: [tr(caption, { bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }));
  }
  return children;
}

function headerCell(text, width) {
  return new TableCell({
    children: [new Paragraph({
      children: [tr(text, { bold: true, size: SZ_SMALL })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
    })],
    width: { size: width, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: "D9E2F3" },
  });
}

function dataCell(text, width, opts = {}) {
  return new TableCell({
    children: [new Paragraph({
      children: [tr(String(text), { size: SZ_SMALL, bold: opts.bold })],
      alignment: opts.align || AlignmentType.CENTER,
      spacing: { after: 20 },
    })],
    width: { size: width, type: WidthType.DXA },
    shading: opts.shade ? { type: ShadingType.CLEAR, fill: opts.shade } : undefined,
  });
}

function makeTable(headers, rows, colWidths) {
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  const headerRow = new TableRow({
    children: headers.map((h, i) => headerCell(h, colWidths[i])),
    tableHeader: true,
  });
  const dataRows = rows.map(row => new TableRow({
    children: row.map((cell, i) => dataCell(cell, colWidths[i])),
  }));
  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: totalWidth, type: WidthType.DXA },
  });
}

function codeBlock(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: "Courier New", size: 18 })],
    spacing: { before: 60, after: 60 },
    indent: { left: 360 },
  });
}

// ─── Subject data (103 subjects after exclusions) ───
const subjects = [
  // CD1 (Covid19_db3) - 51 subjects, PMID: 37153628
  ["Cov1","CD1","PMID: 37153628","COVID-19","mild","NA","NA","blood"],
  ["Cov2","CD1","PMID: 37153628","COVID-19","mild","23","F","blood"],
  ["Cov4","CD1","PMID: 37153628","COVID-19","mild","58","M","blood"],
  ["Cov5","CD1","PMID: 37153628","COVID-19","mild","45","M","blood"],
  ["Cov6","CD1","PMID: 37153628","COVID-19","mild","55","M","blood"],
  ["Cov7","CD1","PMID: 37153628","COVID-19","severe","NA","M","blood"],
  ["Cov13","CD1","PMID: 37153628","COVID-19","mild","39","M","blood"],
  ["Cov14","CD1","PMID: 37153628","COVID-19","mild","31","F","blood"],
  ["Cov15","CD1","PMID: 37153628","COVID-19","mild","44","F","blood"],
  ["Cov16","CD1","PMID: 37153628","COVID-19","mild","43","F","blood"],
  ["Cov18","CD1","PMID: 37153628","COVID-19","mild","30","F","blood"],
  ["Cov19","CD1","PMID: 37153628","COVID-19","mild","59","F","blood"],
  ["Cov20","CD1","PMID: 37153628","COVID-19","mild","58","M","blood"],
  ["Cov21","CD1","PMID: 37153628","COVID-19","mild","68","M","blood"],
  ["Cov22","CD1","PMID: 37153628","COVID-19","severe","75","M","blood"],
  ["Cov24","CD1","PMID: 37153628","COVID-19","mild","61","F","blood"],
  ["Cov25","CD1","PMID: 37153628","COVID-19","mild","78","M","blood"],
  ["Cov26","CD1","PMID: 37153628","COVID-19","mild","61","M","blood"],
  ["Cov27","CD1","PMID: 37153628","COVID-19","mild","69","F","blood"],
  ["Cov28","CD1","PMID: 37153628","COVID-19","severe","49","M","blood"],
  ["Cov29","CD1","PMID: 37153628","COVID-19","severe","52","M","blood"],
  ["Cov30","CD1","PMID: 37153628","COVID-19","mild","57","M","blood"],
  ["Cov31","CD1","PMID: 37153628","COVID-19","severe","62","F","blood"],
  ["Cov32","CD1","PMID: 37153628","COVID-19","severe","86","M","blood"],
  ["Cov33","CD1","PMID: 37153628","COVID-19","mild","65","M","blood"],
  ["Cov34","CD1","PMID: 37153628","COVID-19","severe","69","M","blood"],
  ["Cov38","CD1","PMID: 37153628","COVID-19","mild","42","F","blood"],
  ["Cov39","CD1","PMID: 37153628","COVID-19","mild","18","M","blood"],
  ["Cov40","CD1","PMID: 37153628","COVID-19","mild","19","F","blood"],
  ["Cov43","CD1","PMID: 37153628","COVID-19","severe","53","F","blood"],
  ["Cov45","CD1","PMID: 37153628","COVID-19","mild","55","F","blood"],
  ["Cov49","CD1","PMID: 37153628","COVID-19","mild","49","F","blood"],
  ["Cov50","CD1","PMID: 37153628","COVID-19","mild","28","M","blood"],
  ["Cov51","CD1","PMID: 37153628","COVID-19","mild","47","F","blood"],
  ["Cov53","CD1","PMID: 37153628","COVID-19","severe","43","M","blood"],
  ["Cov56","CD1","PMID: 37153628","COVID-19","mild","48","F","blood"],
  ["Cov57","CD1","PMID: 37153628","COVID-19","mild","61","F","blood"],
  ["Cov58","CD1","PMID: 37153628","COVID-19","mild","26","F","blood"],
  ["Cov59","CD1","PMID: 37153628","COVID-19","mild","37","M","blood"],
  ["Cov60","CD1","PMID: 37153628","COVID-19","mild","51","M","blood"],
  ["Cov61","CD1","PMID: 37153628","COVID-19","mild","61","M","blood"],
  ["Cov62","CD1","PMID: 37153628","COVID-19","severe","34","M","blood"],
  ["Cov63","CD1","PMID: 37153628","COVID-19","severe","61","M","blood"],
  ["Cov64","CD1","PMID: 37153628","COVID-19","mild","58","F","blood"],
  ["Cov65","CD1","PMID: 37153628","COVID-19","mild","36","M","blood"],
  ["Cov66","CD1","PMID: 37153628","COVID-19","mild","27","M","blood"],
  ["Cov67","CD1","PMID: 37153628","COVID-19","mild","28","F","blood"],
  ["Cov68","CD1","PMID: 37153628","COVID-19","mild","55","F","blood"],
  ["Cov69","CD1","PMID: 37153628","COVID-19","mild","85","M","blood"],
  ["Cov70","CD1","PMID: 37153628","COVID-19","mild","34","M","blood"],
  ["Cov71","CD1","PMID: 37153628","COVID-19","severe","72","M","blood"],

  // CD2 (covid_db2) - 19 subjects, PMID: 33384691
  ["AT0008_0001","CD2","PMID: 33384691","COVID-19","Early phase hypoxaemia","32.7","F","Peripheral blood"],
  ["AT0008_0002","CD2","PMID: 33384691","COVID-19","Early phase-Stable","39.6","M","Peripheral blood"],
  ["AT0008_0003","CD2","PMID: 33384691","COVID-19","Early phase hypoxaemia","54.6","M","Peripheral blood"],
  ["AT0008_0004","CD2","PMID: 33384691","COVID-19","Early phase-Stable","78.5","M","Peripheral blood"],
  ["AT0008_0005","CD2","PMID: 33384691","COVID-19","Early phase-Stable","70.5","F","Peripheral blood"],
  ["AT0008_0006","CD2","PMID: 33384691","COVID-19","Recovering without ICU-Improving","39","M","Peripheral blood"],
  ["AT0008_0007","CD2","PMID: 33384691","COVID-19","Early phase-Improving","35.8","M","Peripheral blood"],
  ["AT0008_0008","CD2","PMID: 33384691","COVID-19","Early phase-Stable","51.7","M","Peripheral blood"],
  ["AT0008_0009","CD2","PMID: 33384691","COVID-19","Early phase hypoxaemia","76.3","M","Peripheral blood"],
  ["AT0008_0010","CD2","PMID: 33384691","COVID-19","Early phase-Stable","70.9","F","Peripheral blood"],
  ["AT0008_0011","CD2","PMID: 33384691","COVID-19","Early phase hypoxaemia","25.6","M","Peripheral blood"],
  ["AT0008_0012","CD2","PMID: 33384691","COVID-19","Early phase-Stable","87.4","F","Peripheral blood"],
  ["AT0008_0013","CD2","PMID: 33384691","COVID-19","Early phase-Stable","29.1","M","Peripheral blood"],
  ["AT0008_0014","CD2","PMID: 33384691","COVID-19","Early phase-Stable","49.4","M","Peripheral blood"],
  ["AT0008_0015","CD2","PMID: 33384691","COVID-19","Early phase hypoxaemia","35","M","Peripheral blood"],
  ["AT0008_0016","CD2","PMID: 33384691","COVID-19","Early phase hypoxaemia","58.6","F","Peripheral blood"],
  ["AT0008_0017","CD2","PMID: 33384691","COVID-19","Early phase hypoxaemia","42.3","F","Peripheral blood"],
  ["AT0008_0018","CD2","PMID: 33384691","COVID-19","Recovering post-ICU","37.2","M","Peripheral blood"],
  ["AT0008_0019","CD2","PMID: 33384691","COVID-19","Recovering post-ICU -Improving","40.1","M","Peripheral blood"],

  // CD3 (covid19) - 10 subjects (excl H3, H4, H8), PMID: 32669287
  ["M5","CD3","PMID: 32669287","COVID-19","non-severe","25","NA","blood"],
  ["M6","CD3","PMID: 32669287","COVID-19","non-severe","61","NA","blood"],
  ["M7","CD3","PMID: 32669287","COVID-19","severe","76","NA","blood"],
  ["S20","CD3","PMID: 32669287","COVID-19","severe","71","NA","blood"],
  ["S21","CD3","PMID: 32669287","COVID-19","severe","71","NA","blood"],
  ["S22","CD3","PMID: 32669287","COVID-19","severe","76","NA","blood"],
  ["S23","CD3","PMID: 32669287","COVID-19","severe","81","NA","blood"],
  ["S24","CD3","PMID: 32669287","COVID-19","severe","51","NA","blood"],
  ["S25","CD3","PMID: 32669287","COVID-19","severe","61","NA","blood"],
  ["S26","CD3","PMID: 32669287","COVID-19","severe","71","NA","blood"],

  // CVX1 (vaccine2) - 12 subjects, PMID: 34648302
  ["N1","CVX1","PMID: 34648302","COVID-19","COVID Naive","20","M","Peripheral blood"],
  ["N2","CVX1","PMID: 34648302","COVID-19","COVID Naive","30","M","Peripheral blood"],
  ["N3","CVX1","PMID: 34648302","COVID-19","COVID Naive","30","F","Peripheral blood"],
  ["N4","CVX1","PMID: 34648302","COVID-19","COVID Naive","30","F","Peripheral blood"],
  ["N5","CVX1","PMID: 34648302","COVID-19","COVID Naive","20","F","Peripheral blood"],
  ["N6","CVX1","PMID: 34648302","COVID-19","COVID Naive","20","M","Peripheral blood"],
  ["N7","CVX1","PMID: 34648302","COVID-19","COVID Naive","20","F","Peripheral blood"],
  ["N8","CVX1","PMID: 34648302","COVID-19","COVID Naive","20","M","Peripheral blood"],
  ["R1","CVX1","PMID: 34648302","COVID-19","COVID recovered","20","M","Peripheral blood"],
  ["R2","CVX1","PMID: 34648302","COVID-19","COVID recovered","20","M","Peripheral blood"],
  ["R3","CVX1","PMID: 34648302","COVID-19","COVID recovered","30","F","Peripheral blood"],
  ["R4","CVX1","PMID: 34648302","COVID-19","COVID recovered","30","M","Peripheral blood"],

  // CVX2 (covid_vaccine_new) - 5 subjects (excl Fb, Water), PMID: 33858945
  ["IHCV2020-005","CVX2","PMID: 33858945","COVID-19","Recovered","31","M","PBL"],
  ["IHCV2020-019","CVX2","PMID: 33858945","COVID-19","Recovered","23","M","PBL"],
  ["IHCV2020-020","CVX2","PMID: 33858945","COVID-19","Recovered","53","F","PBL"],
  ["IHCV2020-022","CVX2","PMID: 33858945","COVID-19","Recovered","43","F","PBL"],
  ["IHCV2020-029","CVX2","PMID: 33858945","COVID-19","Recovered","24","M","PBL"],

  // HC1 (lp16_Igblast) - 6 subjects (excl D159, D154, Hu-1), PMID: 28829438
  ["D145","HC1","PMID: 28829438","Healthy","healthy","58","M","BM"],
  ["D149","HC1","PMID: 28829438","Healthy","healthy","55","M","BM"],
  ["D168","HC1","PMID: 28829438","Healthy","healthy","56","F","BM"],
  ["D181","HC1","PMID: 28829438","Healthy","healthy","46","M","BM"],
  ["D182","HC1","PMID: 28829438","Healthy","healthy","46","M","BM"],
  ["D207","HC1","PMID: 28829438","Healthy","healthy","23","M","BM"],
];

// Disease harmonization map
function harmonize(study, stage) {
  const s = stage.toLowerCase();
  if (study === "HC1") return "Healthy";
  if (s.includes("naive")) return "COVID Naive";
  if (s.includes("recovered") || s === "recovered") return "Recovered";
  if (s.includes("post-icu")) return "Moderate";
  if (s.includes("recovering without icu")) return "Mild";
  if (s.includes("hypoxaemia")) return "Severe";
  if (s === "severe") return "Severe";
  if (s === "mild" || s === "non-severe") return "Mild";
  if (s.includes("stable") || s.includes("improving")) return "Mild";
  if (s.includes("covid recovered")) return "Recovered";
  return stage;
}

async function main() {
  const img1 = fs.readFileSync("methods_fig1.png");
  const img2 = fs.readFileSync("methods_fig2.png");
  const img3 = fs.readFileSync("methods_fig3.png");

  const children = [];

  // ── Title ──
  children.push(heading("Materials and Methods"));

  // ── Intro ──
  children.push(para("The iReceptor Statistics API (IS-API, v0.3.0) was developed based on ImmuneDB databases [REF]. The databases were built from raw AIRR-seq BCR sequences and their associated metadata, annotated and stored along with BCR-specific annotations such as germline and clone assignment, somatic hypermutation counts, and pre-calculated statistical measures. Each database holds data from a different study or experiment. A schematic view explaining the process prior to IS-API is shown in **Figure 1**."));

  // Figure 1
  children.push(...figPara("methods_fig1.png", 580, 270, "Figure 1. Pipeline from raw sequences to IS-API."));

  // ── Data collection ──
  children.push(heading("Collecting the Data and Creating the Databases", HeadingLevel.HEADING_2));
  children.push(para("Data were collected for healthy and diseased individuals from 7 published studies containing raw DNA AIRR BCR sequences. The collected data included diverse immune-response contexts: COVID-19 with different levels of disease severity, recovered, vaccinated, COVID-naive, and healthy individuals. Two additional databases (SD1 and FL1) were excluded from the current analysis as they contain unpublished data. The transplant dataset (GT1, sykesIgblast2020; PMID: 38014202) was also excluded as it falls outside the COVID-19 disease scope of this study. For study details, subject identifiers, and all other relevant metadata, see **Supplementary Table S1**."));

  children.push(para("To ensure a uniform metadata framework for cross-study analysis, we built a standardized metadata template that enforces compliance with the AIRR-seq data commons [REF] while providing flexibility to include study-specific fields. The IS-API uses a metadata fingerprint grouping mechanism that identifies unique combinations of metadata fields across subjects and samples, enabling consistent cross-database comparisons despite heterogeneous metadata schemas."));

  // ── Inclusion/Exclusion ──
  children.push(heading("Subject Selection and Exclusion Criteria", HeadingLevel.HEADING_2));
  children.push(para("From an initial pool of 126 subjects across all databases, the following exclusion criteria were applied to arrive at a final cohort of 103 subjects:"));
  children.push(bulletPara("**Tissue filter:** Only peripheral blood samples were retained (tissue labels: \"blood\", \"PBL\", \"Peripheral blood\"). The HC1 (lp16_Igblast) study uses bone marrow (BM) samples and was retained as the sole healthy control cohort."));
  children.push(bulletPara("**Non-biological controls:** Two entries from CVX2 (covid_vaccine_new) were removed: Fb (fibroblast control) and Water (negative control)."));
  children.push(bulletPara("**Insufficient data:** Three subjects from HC1 (lp16_Igblast) were excluded due to insufficient sequence data: D159, D154, and Hu-1."));
  children.push(bulletPara("**Healthy controls from COVID studies:** Three healthy subjects from CD3 (covid19) were excluded (H3, H4, H8), as their disease context differs from the dedicated healthy cohort (HC1)."));
  children.push(bulletPara("**Non-COVID datasets:** The GT1 (sykesIgblast2020) transplant dataset (16 subjects) was excluded as it falls outside the COVID-19 scope."));
  children.push(bulletPara("**Unpublished datasets:** SD1 and FL1 databases were excluded as they contain unpublished data."));
  children.push(para("The final cohort comprised 103 subjects across 7 studies (CD1: n=51, CD2: n=19, CD3: n=10, CVX1: n=12, CVX2: n=5, HC1: n=6)."));

  // ── Disease harmonization ──
  children.push(heading("Disease Harmonization", HeadingLevel.HEADING_2));
  children.push(para("The 103 subjects were originally labeled with 13 distinct disease stage descriptors across the 7 studies. To enable meaningful cross-study comparisons, a rule-based harmonization was applied to map these labels into 6 standardized disease categories:"));

  const harmRows = [
    ["Severe (n=27)", "\"severe\" (CD1, CD3), \"Early phase hypoxaemia\" (CD2)"],
    ["Mild (n=41)", "\"mild\", \"non-severe\" (CD1, CD3), \"Early phase-Stable\", \"Early phase-Improving\", \"Recovering without ICU-Improving\" (CD2)"],
    ["Moderate (n=9)", "\"Recovering post-ICU\", \"Recovering post-ICU -Improving\" (CD2)"],
    ["Recovered (n=12)", "\"Recovered\" (CVX2), \"COVID recovered\" (CVX1)"],
    ["COVID Naive (n=8)", "\"COVID Naive\" (CVX1)"],
    ["Healthy (n=6)", "\"healthy\" (HC1)"],
  ];
  const harmWidths = [2400, 7200];
  children.push(makeTable(["Harmonized Category", "Original Labels (Source Study)"], harmRows, harmWidths));
  children.push(para(""));

  children.push(para("This harmonization was guided by clinical severity: CD2 subjects with hypoxaemia were classified as Severe, those with stable or improving early-phase disease as Mild, and those recovering post-ICU as Moderate, reflecting an intermediate severity between acute illness and recovery."));

  // ── Hardware/Software ──
  children.push(heading("Computer Hardware and Software Requirements", HeadingLevel.HEADING_2));
  children.push(para("IS-API is written in Node.js [REF] using the Express framework [REF], which provides a flexible yet robust development environment that enables connecting to multiple ImmuneDB instances with relatively short response time. The API queries ImmuneDB databases that may be located on different servers across the internet, regardless of location, as long as their addresses are configured (**Figure 2**). Code, software, and library requirements can be found on GitHub [REF] in a public repository."));

  // Figure 2
  children.push(...figPara("methods_fig2.png", 560, 355, "Figure 2. IS-API architecture: client queries across multiple ImmuneDB databases."));

  // ── Building Endpoints ──
  children.push(heading("Building the Endpoints", HeadingLevel.HEADING_2));
  children.push(para("The questions that a researcher can ask using IS-API can be grouped into two levels: (1) metadata questions and (2) biological/research questions. Both levels, their endpoints, and example questions are listed in **Supplementary Table S2** and **Supplementary Table S3**, respectively. A conceptual hierarchy of the analytical layers is shown in **Figure 3**."));

  // Figure 3
  children.push(...figPara("methods_fig3.png", 480, 218, "Figure 3. Three-tier analytical hierarchy: metadata, biological measures, and specific questions."));

  // ── Biological endpoints ──
  children.push(heading("Specifying a Set of Biological Statistical Questions", HeadingLevel.HEADING_2));
  children.push(para("Each repertoire was characterized using the following measures:"));

  children.push(numberedPara("**Clone size (expanded clones):** The total number of unique sequences per clone across all samples in a subject. A clone was defined as \"highly expanded\" if it contained more than 100 copies. For each disease category, we reported the median clone size, the number and percentage of highly expanded clones, and the proportion of subjects with at least one expanded clone."));
  children.push(numberedPara("**Clone count:** The number of distinct clones per subject per sample."));
  children.push(numberedPara("**Top-X clone ratio:** The total sequence copies in the largest 10, 100, or 1,000 clones per subject, expressed as a proportion of total copies. This captures repertoire dominance by a small number of expanded clones."));
  children.push(numberedPara("**CDR3 length:** The average length (in amino acids) of the CDR3 region in the top 10, 100, or 1,000 largest clones per individual."));
  children.push(numberedPara("**Mutation level:** The average number of total unique somatic mutations per clone in the top 10, 100, or 1,000 largest clones per individual."));
  children.push(numberedPara("**Mutation by region:** The average number of mutations broken down by immunoglobulin framework (FW1, FW2, FW3) and complementarity-determining (CDR1, CDR2) regions for the top 10, 100, or 1,000 clones."));
  children.push(numberedPara("**Replacement-to-Silent (R/S) mutation ratio:** The ratio of replacement (non-synonymous) to silent (synonymous) mutations in each region (CDR1, CDR2, FW1, FW2, FW3), computed for the top 10, 100, or 1,000 clones per subject. This ratio reflects the degree of antigen-driven selection pressure on different parts of the antibody."));

  // ── Input/Output ──
  children.push(heading("Input and Output Structure", HeadingLevel.HEADING_2));
  children.push(para("All endpoints are designed as POST requests that enable sending data to and receiving data from the server. The request body is in JSON format and contains two objects:"));
  children.push(numberedPara("**Repertoire:** Holds information about the metadata of interest (e.g., tissue type, sample identifier)."));
  children.push(numberedPara("**Statistics:** Holds information about the statistical question of interest (e.g., clone size, mutation level)."));

  children.push(para("The following is an example of a POST request (input) to the clone endpoint, querying for clone size in tissue \"Lung\" for a specific sample:"));
  children.push(codeBlock("{"));
  children.push(codeBlock("  \"repertoires\": [{"));
  children.push(codeBlock("    \"repertoire\": {"));
  children.push(codeBlock("      \"meta_key\": \"tissue\","));
  children.push(codeBlock("      \"meta_value\": \"Lung\","));
  children.push(codeBlock("      \"sample_id\": \"1\""));
  children.push(codeBlock("    }"));
  children.push(codeBlock("  }],"));
  children.push(codeBlock("  \"statistics\": [\"Clone_size\"]"));
  children.push(codeBlock("}"));

  children.push(para("The response (output) is also in JSON format and includes two fields:"));
  children.push(numberedPara("**Info:** Information about the project (name, release version, contacts)."));
  children.push(numberedPara("**Result:** Contains the repertoire and statistics objects with the result values."));

  // ── Visualization ──
  children.push(heading("Visualization", HeadingLevel.HEADING_2));
  children.push(para("JSON format outputs were imported and parsed using R (v4.x). Graphs were generated using ggplot2 [REF] with a standardized theme (theme_bw, base size 26pt, axis titles 22pt bold, axis text 20pt) at 400 DPI resolution. Boxplots were overlaid with individual data points (jittered), and mean values with standard deviation error bars were displayed as red diamonds. All visualization code and library requirements can be found on GitHub [REF]."));

  // ── Page break before supplementary ──
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ── Supplementary Table S1 ──
  children.push(heading("Supplementary Tables", HeadingLevel.HEADING_1));
  children.push(para("**Supplementary Table S1.** Healthy and diseased subjects included in the analysis and their metadata (n=103).", { italics: false }));

  const s1Headers = ["#", "Subject", "Study", "Publication", "Disease Stage", "Harmonized", "Age", "Sex", "Tissue"];
  const s1Widths = [400, 1300, 700, 1400, 1800, 1100, 600, 500, 1200];
  const s1Rows = subjects.map((s, i) => [
    String(i + 1),
    s[0],
    s[1],
    s[2],
    s[4],
    harmonize(s[1], s[4]),
    s[5],
    s[6],
    s[7],
  ]);
  children.push(makeTable(s1Headers, s1Rows, s1Widths));
  children.push(para(""));

  // ── Supplementary Table S2 ──
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(para("**Supplementary Table S2.** Endpoints for metadata questions."));

  const s2Headers = ["Metadata Question", "Related Endpoint"];
  const s2Widths = [5400, 4200];
  const s2Rows = [
    ["How many studies? And which?", "POST /irplus/v1/stats/meta/metadata"],
    ["How many healthy/COVID/non-COVID subjects?", ""],
    ["What is the age of subjects?", ""],
    ["What is the sex of subjects?", ""],
    ["Subjects with disease / disease stage?", ""],
    ["How many samples in each subject?", ""],
    ["How many samples per gender/age/disease?", ""],
    ["Which cell subset?", ""],
    ["Which cell phenotype?", ""],
    ["Which sequencing platform?", ""],
    ["Which alignment method?", ""],
    ["What diseases in the data?", ""],
    ["What disease stages?", ""],
  ];
  children.push(makeTable(s2Headers, s2Rows, s2Widths));
  children.push(para(""));

  // ── Supplementary Table S3 ──
  children.push(para("**Supplementary Table S3.** Endpoints for biological/experimental questions."));

  const s3Headers = ["Category", "Biological Question", "Related Endpoint"];
  const s3Widths = [1400, 4500, 3700];
  const s3Rows = [
    ["Clones", "How many clones in a subject/sample/repertoire?", "POST /irplus/v1/stats/clone/count/"],
    ["", "What is the clone size distribution by disease?", ""],
    ["", "What is the ratio of top 10/100/1000 clones?", ""],
    ["Mutations", "Mutation level in expanded clones by disease?", "POST /irplus/v1/stats/clone/mutation"],
    ["", "Total unique mutations per clone in top X clones?", ""],
    ["", "Mutations per region (CDR1, CDR2, FW1, FW2, FW3)?", "POST /irplus/v1/stats/clone/mutation_by_region"],
    ["", "Replacement-to-Silent ratio per region?", "POST /irplus/v1/stats/clone/rs_ratio"],
    ["CDR3", "Distribution of CDR3 length (AA) in top X clones?", "POST /irplus/v1/stats/clone/CDR3_length"],
  ];
  children.push(makeTable(s3Headers, s3Rows, s3Widths));

  // ── Build Document ──
  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [{
            level: 0,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          }],
        },
        {
          reference: "numbered",
          levels: [{
            level: 0,
            format: LevelFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          }],
        },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
        },
      },
      children,
    }],
  });

  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync("Methods_Section_v2.docx", buf);
  console.log(`Written Methods_Section_v2.docx (${(buf.length / 1024).toFixed(0)} KB)`);
}

main().catch(console.error);
