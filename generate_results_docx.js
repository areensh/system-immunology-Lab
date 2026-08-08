const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, ImageRun,
  HeadingLevel, AlignmentType, PageBreak,
  Table, TableRow, TableCell, WidthType, BorderStyle,
  ShadingType
} = require("docx");

const IMG_BASE_META = "immunedb_STATS_API/metadata/plots";
const IMG_BASE_CLONE = "immunedb_STATS_API/clonal_analysis/plots";

function img(dir, name, w, h) {
  return new ImageRun({
    data: fs.readFileSync(`${dir}/${name}`),
    transformation: { width: w, height: h },
    type: "png",
  });
}

const FONT = "Times New Roman";
const SZ = 24;
const SZ_SM = 22;
const SZ_CAP = 22;

function heading(text, level) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: level === HeadingLevel.HEADING_1 ? 32 : level === HeadingLevel.HEADING_2 ? 28 : 26, font: FONT })],
    heading: level,
    spacing: { before: 300, after: 150 },
  });
}

function para(text) {
  const runs = [];
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true, size: SZ, font: FONT }));
    } else {
      runs.push(new TextRun({ text: part, size: SZ, font: FONT }));
    }
  }
  return new Paragraph({ children: runs, spacing: { after: 120, line: 360 }, alignment: AlignmentType.JUSTIFIED });
}

function italic(text) {
  return new Paragraph({
    children: [new TextRun({ text, italics: true, size: SZ_CAP, font: FONT })],
    spacing: { before: 60, after: 200 },
  });
}

function figPara(dir, name, w, h) {
  return new Paragraph({
    children: [img(dir, name, w, h)],
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 60 },
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

const BORDER = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

function tableCell(text, opts = {}) {
  const bold = opts.bold || false;
  const shade = opts.shade || null;
  const shading = shade ? { type: ShadingType.CLEAR, fill: shade, color: shade } : undefined;
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text: String(text), bold, size: SZ_SM, font: FONT })],
      alignment: opts.align || AlignmentType.LEFT,
      spacing: { after: 40 },
    })],
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    borders: BORDERS,
    shading,
  });
}

function headerCell(text, width) {
  return tableCell(text, { bold: true, shade: "D9E2F3", width, align: AlignmentType.CENTER });
}

function dataCell(text, width) {
  return tableCell(text, { width, align: AlignmentType.CENTER });
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

function tableCaptionBold(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: SZ_SM, font: FONT })],
    spacing: { before: 200, after: 80 },
  });
}

const children = [];

// ===================== TITLE =====================
children.push(new Paragraph({
  children: [new TextRun({ text: "Results", bold: true, size: 36, font: FONT })],
  heading: HeadingLevel.HEADING_1,
  alignment: AlignmentType.CENTER,
  spacing: { after: 200 },
}));

// ===================== METADATA OVERVIEW =====================
children.push(heading("Metadata Overview", HeadingLevel.HEADING_2));
children.push(heading("1. Dataset Discovery", HeadingLevel.HEADING_3));

children.push(para(
  "The Statistics API provides a discovery-driven interface for exploring immune repertoire data. " +
  "As a first step, we queried the API to retrieve all available datasets in the system."
));
children.push(para(
  "The query returned 9 available datasets (Table 1), of which 2 are unpublished studies, therefore, " +
  "we queried metadata across seven immune repertoire datasets stored in an immunedb database system."
));

children.push(tableCaptionBold("Table 1. Datasets available in the iReceptor Statistics API."));
children.push(makeTable(
  ["Dataset", "Computer Name", "Study Title", "Relevant Publication"],
  [
    ["CD1", "Covid19_db3", "patterns in COVID-19", "PMID: 37153628"],
    ["CD2", "covid19-db2", "Convergent BCR signatures", "PMID: 33384691"],
    ["CD3", "Covid19", "Immune perturbations in severe COVID-19", "PMID: 32669287"],
    ["CVX1", "covid_vaccine2", "Durable vaccine immune memory", "PMID: 34648302"],
    ["CVX2", "covid_vaccine_new", "Vaccine BCR in naive/recovered", "PMID: 33858945"],
    ["HC1", "lp16_Igblast", "Clonal tissue atlas", "PMID: 28829438"],
    ["GT1", "sykesIgblast2020", "Gut transplant in children", "PMID: 38014202"],
    ["SD1", "Sjogren's disease", "unpublished", "unpublished"],
    ["FL1", "flu", "unpublished", "unpublished"],
  ],
  [1600, 2400, 3200, 2400]
));
children.push(para("CD = COVID disease, CVX = COVID vaccine, HC = healthy cohort, GT = gut transplant"));

// ===================== 2. METADATA EXPLORATION =====================
children.push(heading("2. Metadata Exploration", HeadingLevel.HEADING_2));

children.push(para(
  "Before performing statistical analyses, we explored the metadata structure of the selected datasets " +
  "using the API's metadata discovery endpoints. The /meta/categories/ endpoint returned the broad " +
  "categories of metadata available, and /meta/categories/:type returned the specific fields and " +
  "values within each category."
));

children.push(heading("2.1 Available Metadata Categories", HeadingLevel.HEADING_3));
children.push(para("The API exposed 5 metadata categories:"));
children.push(makeTable(
  ["#", "Category", "Values"],
  [
    ["1", "Study", "Study-level information (title, publications, lab)"],
    ["2", "Subject", "Subject demographics (age, sex, ID)"],
    ["3", "Diagnosis and Intervention", "Disease stage, diagnosis, treatments"],
    ["4", "Sample", "Sample collection details"],
    ["5", "Process", "Sequencing and processing parameters"],
  ],
  [800, 3200, 5600]
));

// ===================== 3. COHORT CHARACTERIZATION =====================
children.push(heading("3. Cohort Characterization", HeadingLevel.HEADING_2));

children.push(para(
  "To characterize the scope and composition of all datasets we queried using single command with " +
  "the IS-API, total of 121 subject records were retrieved from seven independent datasets: " +
  "CD1 (n=51), CD2 (n=19), GT1 (n=15), CD3 (n=13), CVX1 (n=12), HC1 (n=6), and CVX2 (n=5) (Figure 1)."
));

children.push(figPara(IMG_BASE_META, "01_subjects_per_dataset.png", 580, 340));
children.push(italic(
  "Figure 1. Distribution of participants across datasets. Bar chart showing the number of " +
  "participants contributed by each of the seven studies included in the analysis."
));

children.push(para(
  "**2. Metadata Availability**"
));
children.push(para(
  "To assess the scope of available annotations, we examined five metadata fields across all datasets: " +
  "Tissue, Sex, Disease Stage, Cell Subset, and Age (Figure 2). Tissue and Disease Stage were the " +
  "most consistently reported fields. Cell Subset was the sparsest, reported for only 21 of 121 " +
  "subjects across only three datasets."
));

children.push(figPara(IMG_BASE_META, "00_metadata_per_dataset.png", 580, 380));
children.push(italic(
  "Figure 2. Metadata availability across datasets. Grouped bar chart illustrating the count of " +
  "subjects with available records for five specific metadata categories — Tissue, Disease Stage, " +
  "Sex, Cell Subset, and Age — distributed among the seven studies."
));

children.push(para("**3. Selection of Key Clinical Variables**"));
children.push(para(
  "Among the available metadata fields, three were identified as most suitable for cross-study " +
  "clinical comparison: Disease Stage, Age, and Sex. These fields offer the best combination of " +
  "coverage and clinical relevance:"
));
children.push(para(
  "Disease Stage was reported for all subjects in 6 of 7 datasets (only GT1 lacked this field entirely). " +
  "This field enables stratification of subjects across a clinical severity spectrum."
));
children.push(para(
  "Age was reported for 115 of 121 subjects (95%). Missing values were concentrated among specific " +
  "subjects: H3, H4, H8 in CD3 (healthy controls); Cov7 and Cov1 in CD1."
));
children.push(para(
  "Sex was reported for 107 of 121 subjects (88.4%). The entire covid19 dataset (13 subjects) " +
  "lacked sex information."
));
children.push(para(
  "Cell Subset and Tissue were excluded as stratification variables. Cell Subset was too sparse " +
  "for meaningful cross-study comparison. Tissue was nearly uniform across COVID datasets " +
  "(blood/peripheral blood), providing no discriminatory power."
));
children.push(para(
  "Finally, we selected the COVID-19 datasets as a use case because repertoire studies in infectious " +
  "disease are a key application of AIRR-seq, and COVID-19 provides a well-characterized clinical " +
  "spectrum (naive, mild, severe, recovered) that allows us to demonstrate the analytical capabilities " +
  "of the platform across biologically meaningful comparisons."
));

children.push(para(
  "Prior to grouping, we examined the original disease stage annotations as reported across the " +
  "five datasets (Figure 3). A total of 13 distinct disease stage labels were identified, reflecting " +
  "the heterogeneous nomenclature used across independent studies. The most frequent labels were " +
  "\"mild\" (n=39) and \"severe\" (n=20), both originating predominantly from the CD1 and CD3 datasets. " +
  "The CD2 dataset contributed more granular clinical descriptions, including \"Early phase-Stable\" (n=8), " +
  "\"Early phase hypoxaemia\" (n=7), \"Early phase-Improving\" (n=1), \"Recovering post-ICU\" (n=1), " +
  "\"Recovering post-ICU -Improving\" (n=1), and \"Recovering without ICU-Improving\" (n=1). The " +
  "vaccine-related datasets used distinct terminology: \"COVID Naive\" (n=8) and \"COVID recovered\" " +
  "(n=4) from CVX1, and \"Recovered\" (n=5) from CVX2. The CD3 dataset also included \"non-severe\" " +
  "(n=2) and \"healthy\" (n=3) labels."
));

children.push(figPara(IMG_BASE_META, "02_disease_stage_raw.png", 600, 360));
children.push(italic(
  "Figure 3. Distribution of original disease stage annotations. Bar chart illustrating the " +
  "frequency of the 13 distinct clinical labels identified across six studies. The GT1 dataset is " +
  "omitted due to a lack of available annotations. This disparate nomenclature highlights the " +
  "necessity of metadata standardization for robust meta-analytical comparisons."
));

children.push(para(
  "This variability in disease stage annotation across studies illustrates one of the key challenges " +
  "in cross-experiment meta-analysis of AIRR-seq data and highlights the need for standardized metadata " +
  "leading to a strong need and a core motivation for the IS-API tool. To enable meaningful comparisons, " +
  "these 13 labels were grouped into six disease categories as described below."
));

children.push(para(
  "The \"mild\" (n=39) and \"non-severe\" (n=2) labels were merged into a single **Mild** category " +
  "(n=41), as both describe participants with non-life-threatening COVID-19 symptoms. The **Severe** " +
  "category (n=27) combines \"severe\" (n=20) with \"Early phase hypoxaemia\" (n=7), as hypoxaemia " +
  "indicates significant respiratory compromise consistent with severe disease presentation. The " +
  "**Moderate** category (n=9) groups \"Early phase-Stable\" (n=8) and \"Early phase-Improving\" (n=1), " +
  "representing participants in the early phase of disease who did not develop hypoxaemia or require " +
  "intensive care. The **Recovered** category (n=12) merges five labels that all describe post-infection " +
  "status: \"Recovered\" (n=5), \"COVID recovered\" (n=4), \"Recovering post-ICU\" (n=1), \"Recovering " +
  "post-ICU -Improving\" (n=1), and \"Recovering without ICU-Improving\" (n=1). The **COVID Naive** " +
  "(n=8) label was retained as reported. The **Healthy** group required special handling: the CD3 " +
  "dataset contained three subjects labeled \"healthy\" (H3, H4, H8); however, these individuals were " +
  "recruited within the context of a COVID-19 study and may have been exposed to the virus, introducing " +
  "potential confounding. We therefore excluded these three subjects and instead used the dedicated " +
  "healthy cohort from the HC1 dataset (lp16_Igblast), which comprises six pre-pandemic healthy donors " +
  "with no known COVID-19 exposure, providing a cleaner baseline for comparison. This consolidation " +
  "reduces label fragmentation while preserving clinically meaningful distinctions between disease " +
  "severity levels."
));

children.push(para(
  "The Mild and Severe categories constitute the largest groups, together representing 66% of the " +
  "cohort, providing sufficient statistical power for comparisons between these two disease states. " +
  "The Moderate category (n=9) comprises participants from the CD2 dataset whose disease stage was " +
  "described as \"Early phase-Stable\" or \"Early phase-Improving,\" representing an intermediate " +
  "clinical presentation. The Recovered group includes individuals who had recovered from COVID-19 " +
  "infection prior to sample collection, while the COVID Naive group consists of individuals with " +
  "no prior SARS-CoV-2 infection, both drawn from vaccine-related studies."
));

children.push(figPara(IMG_BASE_META, "04_disease_harmonized_with_labels.png", 600, 380));
children.push(italic(
  "Figure 3a. Distribution of participants by disease category. Participants were classified into " +
  "six disease categories based on their reported disease stage. Mild (n=41) and Severe (n=27) " +
  "represent the two largest groups, followed by Recovered (n=12), Moderate (n=9), COVID Naive " +
  "(n=8), and Healthy (n=6)."
));

children.push(figPara(IMG_BASE_META, "05_demographics_scatter.png", 600, 380));
children.push(italic(
  "Figure 4. Participant demographics by clinical group. Visualization of the age and biological " +
  "sex across the standardized clinical classifications, with points representing individual " +
  "participants and colors indicating their source study. Point shape distinguishes reported sex " +
  "(circle for male, triangle for female, and cross for unrecorded). The Severe cohort displays " +
  "advanced age (median 61 years) and male predominance, whereas lower ages characterize the " +
  "Naive and Recovered categories. Annotations were available for 101/103 (age) and 92/103 (sex) subjects."
));

children.push(para(
  "Taken together, this metadata overview demonstrates both the strengths and limitations of the " +
  "assembled dataset. The expanded cohort of 103 participants across six datasets represents a " +
  "substantial resource for comparisons between Mild and Severe disease. However, the uneven " +
  "distribution of metadata across datasets, particularly the absence of sex data in the CD3 cohort " +
  "and the limited size of the Healthy control group (n=6 from HC1), must be considered when " +
  "interpreting subsequent biological analyses. Participants with missing metadata for the variable " +
  "of interest were excluded from the respective downstream analyses."
));

children.push(pageBreak());

// ===================== STATISTICAL ENDPOINTS =====================
children.push(heading("Statistical Endpoints", HeadingLevel.HEADING_2));

children.push(para(
  "Having characterized the cohort, we next queried the API to discover what statistical analyses " +
  "are available. The /clone endpoint returned the following:"
));

children.push(makeTable(
  ["#", "Endpoint", "Description", "Metric"],
  [
    ["1", "metaData", "Subject metadata (age, sex, disease stage)", "Counts and distributions"],
    ["2", "clone_count", "Number of unique clones per repertoire", "Clonal diversity"],
    ["3", "CDR3_length", "Average CDR3 amino acid length of top clones", "Structural features"],
    ["4", "mutation", "Somatic hypermutation statistics", "Mutation levels"],
  ],
  [800, 2000, 3600, 3200]
));

children.push(para(
  "The following sections present results from each statistical endpoint, organized by biological theme."
));

children.push(para(
  "Clonal analysis was performed on immune repertoire data from **103 subjects** across 7 studies " +
  "(CD1, CD2, CD3, CVX1, CVX2, HC1, GT1), using peripheral blood samples only. Subjects were " +
  "categorized into six disease groups: Severe (n=27), Mild (n=41), Moderate (n=9), Recovered (n=12), " +
  "COVID Naive (n=8), and Healthy (n=6). Disease labels from individual studies were harmonized into " +
  "these categories. Statistics were computed using the iReceptor Statistics API (v0.3.0) with a " +
  "metadata fingerprint grouping approach that correctly aggregates per-tissue data across samples. " +
  "All boxplots display the median (horizontal line), interquartile range (box), and mean ± standard " +
  "deviation (red diamond with error bars)."
));

children.push(pageBreak());

// ===================== 1. CLONE SIZE =====================
children.push(heading("1. Clone Size Analysis", HeadingLevel.HEADING_2));

children.push(para(
  "Clone size, defined as the number of sequence copies per clone, reflects the degree of clonal " +
  "expansion in each subject's repertoire. Clone size analysis was performed on **96 of 103 subjects** " +
  "(seven CD1 Severe subjects—Cov14, Cov39, Cov45, Cov49, Cov60, Cov66, and Cov70—were not returned " +
  "by the API for the clone_size endpoint). All clones in this dataset have a minimum size of 21 " +
  "copies. We defined \"highly expanded\" clones as those with more than 100 copies and analyzed both " +
  "the number of expanded clones and the median clone size per subject."
));

children.push(heading("1.1 Number of Expanded Clones by Disease Category", HeadingLevel.HEADING_3));
children.push(para(
  "Figure 5 shows the number of expanded clones (size > 100) across disease categories. COVID Naive " +
  "subjects showed the highest counts of expanded clones (median 157, mean 157), consistent with " +
  "pre-existing clonal expansions unrelated to SARS-CoV-2 infection. Recovered subjects also exhibited " +
  "elevated counts (median 55, mean 65.2). The Mild group showed the most heterogeneous pattern: " +
  "18 of 34 subjects (53%) had zero expanded clones, yielding a median of 0, while the remaining 16 " +
  "subjects did have expanded clones—two CD3 subjects (M5 and M6) had particularly high counts (480 " +
  "and 178, respectively). The mean number of expanded clones for Mild subjects was 20.5, and the " +
  "mean proportion of expanded clones was 12.1%, comparable to other disease groups. This discrepancy " +
  "between median and mean reflects the influence of sequencing depth differences across studies: " +
  "CD1 subjects generally had fewer total clones returned by the API, making it less likely for any " +
  "individual clone to exceed the 100-copy threshold."
));

children.push(figPara(IMG_BASE_CLONE, "10_expanded_clones_by_disease.png", 560, 380));
children.push(italic(
  "Figure 5. Number of expanded clones (size > 100) by disease category. Box plots show median and " +
  "IQR; red diamond indicates mean with SD error bars. Y-axis on log10 scale (+1 offset)."
));

children.push(heading("1.2 Median Clone Size by Disease Category", HeadingLevel.HEADING_3));
children.push(para(
  "Figure 6 presents the median clone size per subject across disease categories. COVID Naive " +
  "subjects exhibited the highest median clone size (103 copies), approximately 2.8x higher than " +
  "Mild cases (37 copies). Recovered (73.5) and Moderate (69.5) groups showed intermediate expansion, " +
  "while Severe subjects had a median of 54.8 copies."
));

children.push(figPara(IMG_BASE_CLONE, "09_clone_size_by_disease.png", 560, 380));
children.push(italic("Figure 6. Median clone size per subject by disease category. Y-axis on log10 scale."));

children.push(tableCaptionBold("Table 2. Clone size summary statistics by disease category (n=96 subjects)."));
children.push(makeTable(
  ["Disease Category", "n", "Median Clone Size", "Median Expanded", "Mean Expanded", "Subjects w/ Expanded", "Mean Expanded %"],
  [
    ["Severe", "27*", "54.8", "3", "50.9", "22/27", "12.4%"],
    ["Mild", "34", "37.0", "0", "20.5", "16/34", "12.1%"],
    ["Moderate", "9", "69.5", "8", "12.4", "9/9", "14.0%"],
    ["Recovered", "12", "73.5", "55", "65.2", "12/12", "18.5%"],
    ["COVID Naive", "8", "103.0", "157", "157.0", "8/8", "31.5%"],
    ["Healthy", "6", "58.3", "12.5", "101.0", "6/6", "11.9%"],
  ],
  [1800, 600, 1600, 1400, 1400, 1600, 1400]
));
children.push(para(
  "*Note: 7 CD1 Severe subjects were not returned by the API for the clone_size endpoint, " +
  "reducing the Severe group from 27 to 20 subjects for this analysis."
));

children.push(heading("1.3 Mean Size of Expanded Clones", HeadingLevel.HEADING_3));
children.push(para(
  "Among subjects with expanded clones (size > 100), Figure 7 shows the mean size of those expanded " +
  "clones by disease category. The distributions were broadly similar across disease groups, indicating " +
  "that while the number of expanded clones varies substantially, the degree of expansion per clone " +
  "was broadly comparable."
));

children.push(figPara(IMG_BASE_CLONE, "11_expanded_clone_size_by_disease.png", 560, 380));
children.push(italic("Figure 7. Mean clone size of expanded clones (>100 copies) only, by disease category. Y-axis on log10 scale."));

children.push(para(
  "**Key finding:** COVID Naive individuals show the highest median clone size (103), 2.8x higher than " +
  "Mild cases (37). While the median expanded clone count for Mild is 0 (reflecting that 53% of Mild " +
  "subjects lack any clones above 100 copies), the mean expanded percentage (12.1%) is comparable to " +
  "Severe (12.4%) and Healthy (11.9%), indicating that when Mild subjects do have expanded clones, " +
  "the degree of expansion is similar. All Moderate, Recovered, COVID Naive, and Healthy subjects " +
  "had at least some expanded clones. COVID Naive subjects showed the highest proportion of expanded " +
  "clones (mean 31.5%), consistent with a repertoire shaped by extensive prior immune challenges."
));

children.push(pageBreak());

// ===================== 2. CLONE COUNT =====================
children.push(heading("2. Clonal Diversity (Clone Count)", HeadingLevel.HEADING_2));

children.push(para(
  "Clone count, representing the number of unique clones per subject, serves as a measure of clonal " +
  "diversity. Higher clone counts reflect greater repertoire diversity."
));

children.push(heading("2.1 Clone Count by Disease Category", HeadingLevel.HEADING_3));
children.push(para(
  "Figure 8 shows the distribution of unique clone counts across disease categories. Recovered and " +
  "COVID Naive subjects exhibited markedly higher clone counts (median 21,526 and 16,682, respectively) " +
  "compared to Mild (2,478) and Severe (5,089) groups, suggesting repertoire expansion following " +
  "infection or vaccination. The Healthy group showed high variability (range 650–61,136)."
));

children.push(figPara(IMG_BASE_CLONE, "01_clone_count_by_disease.png", 560, 380));
children.push(italic(
  "Figure 8. Clone count (number of unique clones) by disease category. Box plots show median and " +
  "IQR; red diamond indicates mean with SD error bars. Y-axis on log10 scale."
));

children.push(tableCaptionBold("Table 3. Clone count summary statistics by disease category."));
children.push(makeTable(
  ["Disease Category", "n", "Median", "Mean", "Min", "Max"],
  [
    ["Severe", "27", "5,089", "9,529", "1,319", "35,137"],
    ["Mild", "41", "2,478", "3,127", "95", "22,565"],
    ["Moderate", "9", "5,085", "9,327", "3,459", "22,480"],
    ["Recovered", "12", "21,527", "19,661", "5,713", "33,699"],
    ["COVID Naive", "8", "16,682", "18,086", "8,156", "29,178"],
    ["Healthy", "6", "1,707", "14,443", "650", "61,136"],
  ],
  [2000, 800, 1600, 1600, 1600, 1600]
));

children.push(para(
  "**Key finding:** Recovered and COVID Naive individuals have the highest clone counts (median ~17K–22K), " +
  "suggesting greater clonal diversity. Mild cases have the lowest (median ~2,478), likely reflecting " +
  "differences in sequencing depth across studies as well as biological differences in immune response magnitude."
));

children.push(pageBreak());

// ===================== 3. TOP-X =====================
children.push(heading("3. Top-X Clone Proportion Analysis", HeadingLevel.HEADING_2));

children.push(para(
  "The proportion of total repertoire copies held by the top expanded clones (Top 10, Top 100, and " +
  "Top 1000) provides a measure of clonal dominance. Higher proportions indicate that a small number " +
  "of clones dominate the repertoire."
));

children.push(heading("3.1 Top-X Proportion by Disease Category", HeadingLevel.HEADING_3));
children.push(para(
  "Figure 9 shows the proportion of total copies captured by the top 10, 100, and 1000 clones across " +
  "disease categories. Healthy subjects showed notably high Top 1000 concentration (median 99.3%), " +
  "indicating that nearly all copies belong to the top 1000 clones, consistent with a repertoire " +
  "dominated by relatively few expanded clones. Moderate disease subjects showed the highest Top 10 " +
  "dominance (median 23.1%)."
));

children.push(figPara(IMG_BASE_CLONE, "02_topX_stacked_by_disease.png", 620, 340));
children.push(italic(
  "Figure 9. Clonal dominance: fraction of total repertoire copies held by Top 10 (red), Top 11–100 " +
  "(orange), Top 101–1000 (green), and remaining (blue) clones per subject, faceted by disease " +
  "category and sorted by Top 10 dominance."
));

children.push(tableCaptionBold("Table 4. Median proportion of total copies held by top-X clones."));
children.push(makeTable(
  ["Disease Category", "n", "Top 10 (%)", "Top 100 (%)", "Top 1000 (%)"],
  [
    ["Severe", "27", "15.8", "34.4", "70.8"],
    ["Mild", "41", "10.6", "33.3", "75.2"],
    ["Moderate", "9", "23.1", "46.5", "74.5"],
    ["Recovered", "12", "13.7", "35.9", "62.0"],
    ["COVID Naive", "8", "9.6", "36.0", "74.0"],
    ["Healthy", "6", "16.9", "58.7", "99.3"],
  ],
  [2400, 800, 1600, 1800, 1800]
));

children.push(para("**Key findings:**"));
children.push(para(
  "Moderate disease shows the highest Top 10 dominance (23.1%), suggesting highly focused clonal " +
  "responses. Healthy subjects have the highest Top 1000 fraction (99.3%), indicating an oligoclonal " +
  "baseline repertoire. Mild cases show the lowest dominance across all tiers (10.5% Top 10), " +
  "consistent with a more polyclonal response. Recovered subjects show the lowest Top 1000 proportion " +
  "(62.0%), reflecting the broadest distribution of copies across a large and diverse repertoire."
));

children.push(pageBreak());

// ===================== 4. CDR3 =====================
children.push(heading("4. CDR3 Amino Acid Length Analysis", HeadingLevel.HEADING_2));

children.push(para(
  "The CDR3 (Complementarity-Determining Region 3) amino acid length is a key structural feature of " +
  "antibodies that influences antigen binding specificity. We analyzed the average CDR3 AA length of " +
  "the top expanded clones (Top 10, Top 100, and Top 1000) to examine whether disease severity is " +
  "associated with differences in CDR3 length of dominant clones."
));

children.push(heading("4.1 CDR3 Length by Disease Category", HeadingLevel.HEADING_3));
children.push(para(
  "Figure 10 shows the average CDR3 AA length of the top expanded clones across disease categories. " +
  "Severe cases exhibited the longest CDR3 lengths in Top 10 clones (median 17.7 AA), while Healthy " +
  "subjects showed the shortest (median 13.8 AA). This difference was most pronounced in the Top 10 " +
  "tier and diminished progressively with larger clone sets (Top 100, Top 1000), suggesting that the " +
  "most expanded clones in severe disease tend to use longer CDR3 regions."
));

children.push(figPara(IMG_BASE_CLONE, "03_cdr3_by_disease.png", 580, 380));
children.push(italic(
  "Figure 10. Average CDR3 amino acid length per subject for Top 10 (red), Top 100 (orange), and " +
  "Top 1000 (green) expanded clones, by disease category."
));

children.push(tableCaptionBold("Table 5. Median average CDR3 AA length of top-X clones by disease category."));
children.push(makeTable(
  ["Disease Category", "n", "Top 10 (AA)", "Top 100 (AA)", "Top 1000 (AA)"],
  [
    ["Severe", "27", "17.7", "17.0", "17.1"],
    ["Mild", "41", "16.3", "16.9", "16.9"],
    ["Moderate", "9", "17.3", "17.2", "17.5"],
    ["Recovered", "12", "16.3", "16.6", "17.0"],
    ["COVID Naive", "8", "15.8", "16.6", "16.9"],
    ["Healthy", "6", "13.8", "14.6", "16.1"],
  ],
  [2400, 800, 1600, 1800, 1800]
));

children.push(heading("4.2 CDR3 Length Difference (Top 10 vs. Top 1000)", HeadingLevel.HEADING_3));
children.push(para(
  "To quantify the selective pressure on CDR3 length among the most expanded clones, we computed " +
  "the difference in average CDR3 length between the Top 10 and Top 1000 clones per subject " +
  "(Figure 11). Severe subjects had a positive median difference (+1.2 AA), indicating that the " +
  "most expanded clones tend to have longer CDR3 regions. Healthy controls showed a negative " +
  "difference (−2.1 AA), suggesting their most expanded clones have shorter CDR3 sequences. " +
  "This CDR3 length gradient provides additional evidence that CDR3 length is a feature under " +
  "positive selection during severe COVID-19."
));

children.push(figPara(IMG_BASE_CLONE, "04_cdr3_range_by_disease.png", 560, 380));
children.push(italic(
  "Figure 11. CDR3 length difference between the Top 10 and Top 1000 clones per subject. " +
  "Dashed line indicates zero difference."
));

children.push(tableCaptionBold("Table 6. CDR3 length difference (Top 10 − Top 1000) by disease category."));
children.push(makeTable(
  ["Disease Category", "n", "Median Difference (AA)", "Mean Difference (AA)"],
  [
    ["Severe", "27", "+1.20", "+0.80"],
    ["Mild", "41", "−0.29", "−0.36"],
    ["Moderate", "9", "+0.06", "−0.16"],
    ["Recovered", "12", "−0.57", "−0.52"],
    ["COVID Naive", "8", "−0.93", "−1.18"],
    ["Healthy", "6", "−2.08", "−2.34"],
  ],
  [2400, 800, 3200, 3200]
));

children.push(para(
  "**Key finding:** Severe cases show the longest CDR3 in their top 10 clones (median 17.7 AA), " +
  "while Healthy subjects show the shortest (median 13.8 AA). CDR3 lengths converge across groups " +
  "at the Top 1000 level (~17.0–17.5 AA), indicating differences are driven by the most dominant clones. " +
  "The positive CDR3 length gradient in Severe subjects suggests selection for longer binding loops " +
  "during active infection."
));

children.push(pageBreak());

// ===================== 5. SOMATIC HYPERMUTATION =====================
children.push(heading("5. Somatic Hypermutation Analysis", HeadingLevel.HEADING_2));

children.push(para(
  "Somatic hypermutation (SHM) is a key process in antibody affinity maturation, introducing point " +
  "mutations in immunoglobulin variable regions. We analyzed the average number of mutations in " +
  "the top expanded clones (Top 10, Top 100, and Top 1000) per subject to examine whether disease " +
  "severity is associated with differences in mutation burden among dominant clones."
));

children.push(heading("5.1 Mutation Level by Disease Category", HeadingLevel.HEADING_3));
children.push(para(
  "Figure 12 shows the average mutation count of the top expanded clones across disease categories. " +
  "COVID Naive subjects exhibited the highest mutation levels in Top 10 clones (median 119.0), " +
  "followed by Recovered (median 107.0), suggesting extensive affinity maturation in subjects with " +
  "prior immune exposure. Mild subjects showed the lowest Top 10 mutation levels (median 48.6). The " +
  "difference between tiers was most pronounced in COVID Naive subjects, where Top 10 clones carried " +
  "substantially more mutations than Top 1000 clones, indicating strong selection of highly mutated " +
  "dominant clones."
));

children.push(figPara(IMG_BASE_CLONE, "05_mutation_by_disease.png", 580, 380));
children.push(italic(
  "Figure 12. Average mutation count per subject for Top 10 (red), Top 100 (orange), and Top 1000 " +
  "(green) expanded clones, by disease category."
));

children.push(tableCaptionBold("Table 7. Median average mutation count of top-X clones by disease category."));
children.push(makeTable(
  ["Disease Category", "n", "Top 10", "Top 100", "Top 1000"],
  [
    ["Severe", "27", "80.2", "33.5", "16.9"],
    ["Mild", "41", "48.6", "25.5", "15.0"],
    ["Moderate", "9", "74.8", "30.3", "13.0"],
    ["Recovered", "12", "107.0", "60.1", "23.5"],
    ["COVID Naive", "8", "119.0", "92.9", "27.3"],
    ["Healthy", "6", "78.9", "35.5", "12.7"],
  ],
  [2400, 800, 1600, 1800, 1800]
));

children.push(heading("5.2 Mutation Gradient (Top 10 − Top 1000)", HeadingLevel.HEADING_3));
children.push(para(
  "The mutation gradient—defined as the difference in average mutation count between the Top 10 " +
  "and Top 1000 clones—was positive across all disease categories (Figure 13), indicating that " +
  "more expanded clones consistently carry more mutations. COVID Naive subjects showed the steepest " +
  "gradient (median 92.2), while Mild subjects had the shallowest (median 33.2), suggesting a more " +
  "uniform mutation profile in mild disease."
));

children.push(figPara(IMG_BASE_CLONE, "06_mutation_gradient_by_disease.png", 560, 380));
children.push(italic(
  "Figure 13. Mutation gradient (Top 10 minus Top 1000 mutation count) by disease category, " +
  "reflecting selective enrichment of mutated clones."
));

children.push(tableCaptionBold("Table 8. Mutation gradient (Top 10 − Top 1000) by disease category."));
children.push(makeTable(
  ["Disease Category", "n", "Median Gradient", "Mean Gradient"],
  [
    ["Severe", "27", "58.5", "62.6"],
    ["Mild", "41", "33.2", "37.2"],
    ["Moderate", "9", "62.0", "73.2"],
    ["Recovered", "12", "81.2", "84.0"],
    ["COVID Naive", "8", "92.2", "99.4"],
    ["Healthy", "6", "68.1", "61.1"],
  ],
  [2400, 800, 2200, 2200]
));

children.push(pageBreak());

// ===================== 6. MUTATION BY REGION =====================
children.push(heading("6. Region-Specific Mutation Analysis (CDR vs. FW)", HeadingLevel.HEADING_2));

children.push(para(
  "To distinguish between antigen-driven selection and background mutation accumulation, we analyzed " +
  "mutation rates separately for complementarity-determining regions (CDR) and framework (FW) regions. " +
  "CDR mutations are concentrated at antigen-contact residues and are the primary target of " +
  "antigen-driven positive selection, while FW mutations reflect broader mutational processes and " +
  "are constrained by structural conservation requirements."
));

children.push(heading("6.1 CDR Mutations by Disease Category", HeadingLevel.HEADING_3));
children.push(para(
  "Figure 14 shows the average CDR mutations per clone by disease category. Mild subjects exhibited " +
  "the highest median CDR mutation rate (5.11 mutations per clone), followed by Severe (4.39) and " +
  "Healthy (4.23). COVID Naive subjects showed a median of 3.40, and Recovered 3.04."
));

children.push(figPara(IMG_BASE_CLONE, "07_cdr_mutations_by_disease.png", 560, 380));
children.push(italic("Figure 14. Average CDR region mutations per clone by disease category."));

children.push(heading("6.2 Framework Mutations by Disease Category", HeadingLevel.HEADING_3));
children.push(para(
  "Figure 15 shows the average FW mutations per clone. Framework mutations were consistently higher " +
  "than CDR mutations across all groups, reflecting the longer total length of FW regions. Mild " +
  "subjects had the highest FW mutations (median 11.3), while COVID Naive had the lowest (6.49)."
));

children.push(figPara(IMG_BASE_CLONE, "07_fw_mutations_by_disease.png", 560, 380));
children.push(italic("Figure 15. Average framework (FW) region mutations per clone by disease category."));

children.push(tableCaptionBold("Table 9. Median mutation by region and CDR/FW ratio by disease category."));
children.push(makeTable(
  ["Disease Category", "n", "Median CDR", "Median FW", "CDR/FW Ratio"],
  [
    ["Severe", "27", "4.39", "9.11", "0.433"],
    ["Mild", "41", "5.11", "11.30", "0.442"],
    ["Moderate", "9", "1.78", "8.53", "0.209"],
    ["Recovered", "12", "3.04", "8.51", "0.600"],
    ["COVID Naive", "8", "3.40", "6.49", "0.550"],
    ["Healthy", "6", "4.23", "7.37", "0.587"],
  ],
  [2000, 800, 1600, 1600, 1600]
));

children.push(para(
  "**Key finding:** The CDR-to-FW mutation ratio provides insight into the nature of selection. " +
  "Recovered subjects showed the highest ratio (0.600), indicative of stronger antigen-driven " +
  "selection relative to background mutation. Moderate subjects showed the lowest ratio (0.209), " +
  "suggesting a relatively higher proportion of background over antigen-driven mutations in " +
  "this group, potentially reflecting an earlier stage of the immune response."
));

children.push(pageBreak());

// ===================== 7. R/S RATIO =====================
children.push(heading("7. Replacement-to-Synonymous (R/S) Mutation Ratio", HeadingLevel.HEADING_2));

children.push(para(
  "The R/S ratio quantifies the balance between replacement (non-synonymous) and synonymous " +
  "mutations, serving as a direct proxy for positive selection pressure. An R/S ratio significantly " +
  "above 1.0 indicates that replacement mutations are enriched beyond what would be expected under " +
  "neutral evolution, consistent with antigen-driven selection. We computed R/S ratios separately " +
  "for CDR and FW regions."
));

children.push(heading("7.1 R/S Ratio by Disease Category", HeadingLevel.HEADING_3));
children.push(para(
  "Figure 16 shows the R/S ratio in CDR and FW regions across disease categories. CDR regions " +
  "exhibited markedly higher R/S ratios than framework regions across all disease categories, " +
  "consistent with CDR regions being the primary target of antigen-driven selection. The median " +
  "CDR R/S ratio ranged from 1.98 (Moderate) to 3.18 (Mild), all well above the neutral threshold " +
  "of 1.0. Framework R/S ratios were more constrained (range: 1.51–1.72), consistent with structural " +
  "conservation pressures."
));

children.push(figPara(IMG_BASE_CLONE, "08_rs_ratio_by_disease.png", 580, 380));
children.push(italic(
  "Figure 16. Replacement-to-synonymous (R/S) mutation ratio in CDR and FW regions by disease " +
  "category. Dashed line at R/S = 1.0 indicates neutral selection."
));

children.push(tableCaptionBold("Table 10. Median R/S ratio by region and disease category."));
children.push(makeTable(
  ["Disease Category", "n", "CDR R/S", "FW R/S"],
  [
    ["Severe", "27", "2.66", "1.58"],
    ["Mild", "41", "3.18", "1.58"],
    ["Moderate", "9", "1.98", "1.60"],
    ["Recovered", "12", "3.13", "1.61"],
    ["COVID Naive", "8", "3.04", "1.51"],
    ["Healthy", "6", "3.02", "1.72"],
  ],
  [2400, 800, 2200, 2200]
));

children.push(para(
  "**Key findings:** All disease categories show CDR R/S ratios well above 1.0, confirming " +
  "strong positive selection in antigen-binding regions. Mild subjects showed the highest CDR R/S " +
  "(3.18), suggesting efficient selection despite lower overall mutation burden. Moderate subjects " +
  "showed the lowest CDR R/S (1.98), which combined with their low CDR/FW mutation ratio (0.209), " +
  "suggests reduced antigen-driven selection relative to other disease groups, potentially reflecting " +
  "an earlier stage of the immune response where selection has not yet fully shaped the repertoire."
));

children.push(pageBreak());

// ===================== 8. SEX AND AGE STRATIFICATION =====================
children.push(heading("8. Sex and Age Stratification of Selected Findings", HeadingLevel.HEADING_2));

children.push(para(
  "To examine whether the disease-associated patterns identified above are modulated by sex or age, " +
  "we performed stratified analyses on the endpoints showing the most biologically interesting " +
  "variation. Sex data was available for 92 of 103 subjects (the entire CD3 dataset of 13 subjects " +
  "lacked sex annotations). Age data was available for 101 of 103 subjects."
));

children.push(heading("8.1 Somatic Hypermutation by Sex and Disease", HeadingLevel.HEADING_3));
children.push(para(
  "Figure 17 shows the average mutation count of the top 10 clones stratified by sex within each " +
  "disease category. The most striking sex difference emerged in the Moderate group: females showed " +
  "substantially higher Top 10 mutation levels (median 113.0) compared to males (71.3), a 1.6-fold " +
  "difference. This suggests that Moderate females may have more mature, affinity-selected repertoires " +
  "than their male counterparts, though the small subgroup size (n=3 female, n=6 male) warrants " +
  "cautious interpretation. In the Recovered group, the pattern reversed: males showed higher " +
  "mutation levels (120.0) than females (101.0). The mutation gradient (Top 10 − Top 1000) " +
  "reinforced this pattern, with Moderate females showing a much steeper gradient (99.6) than males " +
  "(60.6), indicating stronger selection of highly mutated dominant clones among Moderate females. " +
  "Mild, Severe, and COVID Naive groups showed minimal sex differences in mutation burden."
));

children.push(figPara(IMG_BASE_CLONE, "12_mutation_top10_by_sex_disease.png", 580, 380));
children.push(italic(
  "Figure 17. Average mutation count of Top 10 clones by sex and disease category. " +
  "Box plots show median and IQR; red diamond indicates mean with SD error bars."
));

children.push(tableCaptionBold("Table 11. Median mutation count (Top 10) and gradient by sex and disease category."));
children.push(makeTable(
  ["Disease Category", "Sex", "n", "Median Mut (Top 10)", "Median Gradient"],
  [
    ["Severe", "Female", "5", "86.0", "58.5"],
    ["Severe", "Male", "14", "82.1", "60.5"],
    ["Mild", "Female", "19", "46.2", "32.2"],
    ["Mild", "Male", "19", "48.6", "33.4"],
    ["Moderate", "Female", "3", "113.0", "99.6"],
    ["Moderate", "Male", "6", "71.3", "60.6"],
    ["Recovered", "Female", "3", "101.0", "76.6"],
    ["Recovered", "Male", "9", "120.0", "89.7"],
    ["COVID Naive", "Female", "4", "115.0", "85.9"],
    ["COVID Naive", "Male", "4", "121.0", "92.2"],
    ["Healthy", "Female", "1", "82.1", "74.1"],
    ["Healthy", "Male", "5", "75.8", "64.4"],
  ],
  [1800, 1000, 600, 2200, 2000]
));

children.push(heading("8.2 CDR3 Length by Sex and Disease", HeadingLevel.HEADING_3));
children.push(para(
  "Figure 18 shows CDR3 amino acid length of the top 10 clones by sex and disease category. Two " +
  "disease categories showed notable sex-associated differences with opposite directionality. In " +
  "Recovered subjects, males had substantially longer Top 10 CDR3 (median 17.2 AA) compared to " +
  "females (15.1 AA), a difference of 2.1 AA. Conversely, in COVID Naive subjects, females showed " +
  "longer CDR3 (17.1 AA) than males (14.6 AA), a 2.5 AA difference in the opposite direction. " +
  "These opposing patterns suggest that the sex-associated CDR3 length differences may reflect " +
  "different antigen exposure histories or immune response kinetics rather than a universal " +
  "sex-dependent effect on CDR3 selection. Severe, Mild, and Moderate groups showed modest or no " +
  "sex differences in CDR3 length."
));

children.push(figPara(IMG_BASE_CLONE, "13_cdr3_top10_by_sex_disease.png", 580, 380));
children.push(italic(
  "Figure 18. Average CDR3 amino acid length of Top 10 clones by sex and disease category."
));

children.push(tableCaptionBold("Table 12. Median CDR3 AA length (Top 10) by sex and disease category."));
children.push(makeTable(
  ["Disease Category", "Sex", "n", "Median CDR3 (AA)"],
  [
    ["Severe", "Female", "5", "17.5"],
    ["Severe", "Male", "14", "17.9"],
    ["Mild", "Female", "19", "16.3"],
    ["Mild", "Male", "19", "16.5"],
    ["Moderate", "Female", "3", "17.8"],
    ["Moderate", "Male", "6", "17.0"],
    ["Recovered", "Female", "3", "15.1"],
    ["Recovered", "Male", "9", "17.2"],
    ["COVID Naive", "Female", "4", "17.1"],
    ["COVID Naive", "Male", "4", "14.6"],
    ["Healthy", "Female", "1", "12.8"],
    ["Healthy", "Male", "5", "14.5"],
  ],
  [2400, 1200, 800, 2400]
));

children.push(heading("8.3 Age-Associated Patterns", HeadingLevel.HEADING_3));
children.push(para(
  "Age-stratified analysis revealed one particularly noteworthy pattern in the Severe disease group. " +
  "Clonal diversity decreased sharply with age: the youngest Severe subject (18–30) had 18,401 unique " +
  "clones, compared to a median of 7,678 (31–50), 3,423 (51–65), and 1,941 (66+). This age-related " +
  "decline was paralleled by mutation burden: Top 10 mutation count dropped from 118.0 in the " +
  "youngest age group to 43.0 in subjects aged 66+, consistent with immunosenescence limiting the " +
  "capacity for affinity maturation during severe disease."
));
children.push(para(
  "Interestingly, the CDR R/S ratio in Severe subjects showed the opposite trend, increasing " +
  "from 1.90 (18–30) to 3.39 (66+). This suggests that while older Severe patients accumulate " +
  "fewer total mutations, the mutations they do acquire are more strongly enriched for replacement " +
  "changes in CDR regions—possibly reflecting a more constrained but targeted selection process. " +
  "In Mild subjects, CDR3 length showed an age-dependent increase (16.3 AA at 18–30 to 18.5 AA " +
  "at 66+), a pattern not seen in other disease categories."
));

children.push(tableCaptionBold("Table 13. Age-stratified clone count, mutation, and R/S ratio in Severe subjects."));
children.push(makeTable(
  ["Age Group", "n", "Median Clone Count", "Median Mut (Top 10)", "Median CDR R/S"],
  [
    ["18-30", "1", "18,401", "118.0", "1.90"],
    ["31-50", "6", "7,678", "80.5", "2.43"],
    ["51-65", "6", "3,423", "84.4", "2.89"],
    ["66+", "5", "1,941", "43.0", "3.39"],
  ],
  [1800, 800, 2400, 2400, 2200]
));

children.push(para(
  "No consistent age-dependent trends were observed in other disease categories, and the uneven " +
  "distribution of subjects across age groups limits the power of age-stratified comparisons. " +
  "Notably, all COVID Naive subjects were in the 18–30 age group, precluding age-stratified " +
  "analysis for this category."
));

children.push(pageBreak());

// ===================== SUMMARY =====================
children.push(heading("9. Summary of Results", HeadingLevel.HEADING_2));

children.push(para(
  "This study analyzed B-cell receptor (BCR) repertoire characteristics across 103 subjects from " +
  "seven independent immune repertoire datasets, encompassing a spectrum of COVID-19 disease " +
  "severities as well as healthy and COVID-naive controls. Using the iReceptor Statistics API " +
  "(v0.3.0), we examined seven complementary dimensions of clonal architecture: clone size and " +
  "expansion, clonal diversity, clonal dominance (top-X clone proportions), CDR3 amino acid length, " +
  "somatic hypermutation levels, region-specific mutation (CDR vs. FW), and replacement-to-synonymous " +
  "(R/S) mutation ratios, with selected sex and age stratifications. The following summarizes the " +
  "principal findings across these analyses."
));

children.push(heading("9.1 Clonal Expansion and Clone Size", HeadingLevel.HEADING_3));
children.push(para(
  "Clone size analysis (96 subjects) revealed that COVID Naive subjects harbored the highest " +
  "numbers of expanded clones (size > 100; median 157) and the largest median clone size (103 copies). " +
  "Recovered subjects also showed elevated expansion (median 55 expanded clones), consistent with a " +
  "mature post-infection repertoire. The Mild group showed the most heterogeneous expansion pattern: " +
  "while 53% of Mild subjects had zero expanded clones (median 0), those who did have expanded clones " +
  "showed comparable expansion proportions (mean 12.1%) to Severe (12.4%) and Healthy (11.9%). This " +
  "heterogeneity is partly driven by differences in sequencing depth across studies. All Moderate, " +
  "Recovered, COVID Naive, and Healthy subjects had at least some expanded clones. Seven CD1 Severe " +
  "subjects were unavailable for clone size analysis."
));

children.push(heading("9.2 Clonal Diversity", HeadingLevel.HEADING_3));
children.push(para(
  "Clonal diversity, measured by the total number of unique clones per subject, varied markedly " +
  "across disease categories. Recovered subjects exhibited the highest median clone count (21,526), " +
  "followed by COVID Naive (16,682), while Mild subjects had the lowest (2,478). Severe subjects " +
  "showed an intermediate median of 5,089. The elevated clone counts in Recovered and COVID Naive " +
  "groups suggest that immune exposure—whether through natural infection and recovery or pre-existing " +
  "immunity—drives substantial repertoire diversification. The Healthy group displayed high " +
  "variability (range 650–61,136), potentially reflecting heterogeneous prior immune histories."
));

children.push(heading("9.3 Clonal Dominance (Top-X Clone Proportions)", HeadingLevel.HEADING_3));
children.push(para(
  "Healthy subjects showed strikingly high Top 1000 concentration (median 99.3%), indicating that " +
  "nearly all sequence copies belonged to the top 1000 clones. This is consistent with a small, " +
  "highly concentrated repertoire dominated by a limited number of expanded clones. Moderate disease " +
  "subjects exhibited the highest Top 10 dominance (median 23.1%), suggesting that a few clones " +
  "undergo particularly aggressive expansion during moderate-severity COVID-19. Recovered subjects " +
  "showed a relatively low Top 1000 proportion (62.0%), reflecting the broader distribution of " +
  "copies across a large and diverse repertoire."
));

children.push(heading("9.4 CDR3 Amino Acid Length", HeadingLevel.HEADING_3));
children.push(para(
  "CDR3 length analysis of the top expanded clones revealed a gradient associated with disease " +
  "severity. Severe cases exhibited the longest CDR3 regions in their Top 10 clones (median 17.7 AA), " +
  "while Healthy subjects showed the shortest (median 13.8 AA). This difference was most pronounced " +
  "in the Top 10 tier and diminished progressively with larger clone sets (Top 100 and Top 1000), " +
  "suggesting that the most aggressively expanded clones in severe disease tend to utilize longer " +
  "CDR3 regions. Longer CDR3 loops can form more complex antigen-binding surfaces, which may reflect " +
  "the selection of antibodies targeting specific SARS-CoV-2 epitopes during severe infection. " +
  "The positive CDR3 length gradient in Severe (+1.2 AA) vs. negative in Healthy (−2.1 AA) " +
  "further supports this interpretation."
));

children.push(heading("9.5 Somatic Hypermutation", HeadingLevel.HEADING_3));
children.push(para(
  "Somatic hypermutation (SHM) analysis revealed substantial variation in mutation burden across " +
  "disease categories. COVID Naive subjects showed the highest mutation levels in their Top 10 " +
  "clones (median 119.0 mutations), followed by Recovered subjects (median 107.0). Mild subjects " +
  "exhibited the lowest Top 10 mutation levels (median 48.6). The elevated mutation burden in COVID " +
  "Naive and Recovered groups is consistent with extensive affinity maturation driven by prior or " +
  "resolved immune responses. The steep mutation gradient between Top 10 and Top 1000 was " +
  "particularly pronounced in COVID Naive subjects (119.0 vs. 27.3), indicating that the most " +
  "expanded clones are highly selected, affinity-matured antibodies."
));

children.push(heading("9.6 Region-Specific Mutation and R/S Ratios", HeadingLevel.HEADING_3));
children.push(para(
  "Analysis of mutation distribution across antibody regions revealed that FW regions consistently " +
  "carried more total mutations than CDR regions, reflecting their longer combined length. However, " +
  "the CDR-to-FW mutation ratio varied meaningfully across disease categories, with Recovered " +
  "subjects showing the highest ratio (0.600) and Moderate subjects the lowest (0.209), suggesting " +
  "differences in the balance between antigen-driven and background mutation."
));
children.push(para(
  "R/S ratio analysis confirmed strong positive selection in CDR regions across all disease " +
  "categories (median CDR R/S: 1.98–3.18), well above the neutral threshold of 1.0. Framework " +
  "R/S ratios were more constrained (1.51–1.72), consistent with structural conservation. Notably, " +
  "Mild subjects showed the highest CDR R/S ratio (3.18) despite having the lowest overall mutation " +
  "burden, suggesting efficient but narrow antigen-driven selection. Moderate subjects showed the " +
  "lowest CDR R/S (1.98), consistent with a less mature selection profile."
));

children.push(heading("9.7 Sex and Age Effects", HeadingLevel.HEADING_3));
children.push(para(
  "Sex-stratified analysis of 92 subjects with sex annotations revealed selectively notable " +
  "differences. The most striking finding was among Moderate subjects, where females showed " +
  "substantially higher Top 10 mutation levels (113.0 vs. 71.3) and a steeper mutation gradient " +
  "(99.6 vs. 60.6) compared to males, suggesting more mature affinity selection in this small " +
  "subgroup (n=3F, n=6M). CDR3 length showed sex-dependent patterns with opposite directionality " +
  "in Recovered (males longer: 17.2 vs. 15.1 AA) and COVID Naive (females longer: 17.1 vs. 14.6 AA), " +
  "suggesting sex-associated CDR3 differences are context-dependent rather than universal. " +
  "Clone count, Top-X proportions, and R/S ratios showed minimal sex differences across all " +
  "disease categories."
));
children.push(para(
  "Age-stratified analysis in Severe subjects revealed a clear gradient: clonal diversity decreased " +
  "with age (18,401 clones at 18–30 to 1,941 at 66+), as did mutation burden (118.0 to 43.0), " +
  "while the CDR R/S ratio increased (1.90 to 3.39). This pattern is consistent with " +
  "immunosenescence limiting repertoire diversity and mutation accumulation, while the increased " +
  "R/S ratio suggests more targeted selection in older patients. These observations warrant " +
  "validation in larger, age-balanced cohorts."
));

children.push(heading("9.8 Methodological Considerations", HeadingLevel.HEADING_3));
children.push(para(
  "This analysis leveraged the iReceptor Statistics API (v0.3.0), which provides a standardized " +
  "framework for computing repertoire statistics across federated datasets. The metadata fingerprint " +
  "grouping approach ensures correct per-tissue aggregation of samples, enabling consistent " +
  "cross-study comparisons. Disease labels from individual studies were harmonized into six " +
  "categories using a rule-based mapping, which, while necessary for cross-dataset comparison, " +
  "may obscure clinically meaningful differences within broad categories. Three CD3 healthy subjects " +
  "were excluded due to potential COVID-19 exposure confounding; the HC1 pre-pandemic cohort " +
  "(n=6) was used as the healthy baseline instead. The restriction to peripheral blood samples " +
  "provides a consistent tissue context but does not capture tissue-resident B-cell populations."
));
children.push(para(
  "Several limitations should be noted. First, sample sizes within some subgroups (Healthy n=6, " +
  "COVID Naive n=8, Moderate n=9) are small, and sex-stratified subgroups are even smaller. " +
  "Second, clone size data was available for only 96 of 103 subjects (seven CD1 Severe subjects " +
  "were absent from the API response). Third, the datasets were generated using different " +
  "sequencing protocols and bioinformatics pipelines, which may introduce batch effects. Fourth, " +
  "disease category confounds with study of origin, and age confounds with disease severity " +
  "(Severe skews older), which are important considerations for all cross-study comparisons."
));

children.push(pageBreak());

// ===================== DISCUSSION =====================
children.push(heading("10. Discussion", HeadingLevel.HEADING_2));

children.push(para(
  "This study presents a comprehensive clonal analysis of B-cell receptor repertoires across " +
  "COVID-19 disease severities, leveraging the iReceptor Statistics API (v0.3.0) to aggregate " +
  "and analyze data from seven independent datasets comprising 103 subjects. By examining multiple " +
  "complementary dimensions of clonal architecture—clone size, diversity, dominance, CDR3 length, " +
  "somatic hypermutation, region-specific mutation, and R/S ratios—we reveal distinct immunological " +
  "signatures associated with different stages and outcomes of SARS-CoV-2 infection."
));

children.push(heading("10.1 Distinct Clonal Architectures Across Disease States", HeadingLevel.HEADING_3));
children.push(para(
  "Our findings reveal that the clonal landscape of the B-cell repertoire undergoes characteristic " +
  "remodeling during and after SARS-CoV-2 infection. Subjects with active disease (Severe and " +
  "Moderate) exhibited moderate clonal diversity but high clonal dominance, with a small number " +
  "of clones capturing a disproportionate fraction of the repertoire. This pattern is consistent " +
  "with antigen-driven clonal selection during acute infection, where B cells recognizing viral " +
  "epitopes undergo rapid expansion at the expense of overall repertoire diversity. In contrast, " +
  "Recovered and COVID Naive subjects displayed markedly higher clone counts (medians of 21,526 " +
  "and 16,682, respectively) with lower Top 10 dominance, reflecting a more diversified repertoire " +
  "shaped by completed or pre-existing immune responses."
));
children.push(para(
  "The Healthy group presented a distinctive profile: low median clone counts (1,707) but " +
  "extremely high Top 1000 concentration (99.3%), indicating that in the absence of active " +
  "infection, the repertoire is compact and dominated by a limited set of expanded clones. " +
  "The high variability in this group (clone count range 650–61,136) likely reflects heterogeneous " +
  "prior immune histories among healthy donors."
));

children.push(heading("10.2 CDR3 Length as a Severity-Associated Feature", HeadingLevel.HEADING_3));
children.push(para(
  "The observation that Severe subjects had the longest CDR3 regions in their top expanded clones " +
  "(median 17.7 AA for Top 10) while Healthy subjects had the shortest (13.8 AA) suggests that " +
  "CDR3 length is a feature under selection during severe COVID-19. Longer CDR3 loops provide " +
  "greater structural diversity for antigen recognition and can form extended binding surfaces " +
  "capable of accessing recessed or complex epitopes on viral proteins. The progressive attenuation " +
  "of this CDR3 length difference in larger clone sets (Top 100, Top 1000) indicates that the " +
  "selection pressure favoring longer CDR3 loops operates most strongly on the handful of most " +
  "dominant clones, rather than shaping the entire repertoire."
));

children.push(heading("10.3 Somatic Hypermutation and Affinity Maturation", HeadingLevel.HEADING_3));
children.push(para(
  "The mutation analysis provides insight into the maturation state of expanded clones across " +
  "disease categories. The markedly elevated mutation levels in COVID Naive (median 119.0 for " +
  "Top 10) and Recovered (107.0) subjects suggest that these groups harbor clones that have " +
  "undergone extensive affinity maturation through iterative germinal center reactions. For COVID " +
  "Naive subjects, the high mutation burden likely reflects memory B cells from prior coronavirus " +
  "exposures or other infections. For Recovered subjects, it indicates successful completion of " +
  "the germinal center response following SARS-CoV-2 infection."
));
children.push(para(
  "The relatively lower mutation levels in Mild (48.6) and Severe (80.2) subjects during active " +
  "disease may reflect the contribution of newly recruited, less-mutated B cells to the expanded " +
  "clone pool. In severe disease, the immune response may rely more heavily on extrafollicular " +
  "B-cell activation pathways that bypass germinal centers and produce less-mutated antibodies. " +
  "The steep intra-subject gradient between Top 10 and Top 1000 mutation levels—most pronounced " +
  "in COVID Naive subjects (119.0 vs. 27.3)—demonstrates that the most dominant clones are " +
  "preferentially drawn from the highly mutated, affinity-matured compartment."
));

children.push(heading("10.4 Region-Specific Mutation and Selection Pressure", HeadingLevel.HEADING_3));
children.push(para(
  "The analysis of CDR vs. FW mutation distribution and R/S ratios adds a new dimension to our " +
  "understanding of selection pressure across disease states. The uniformly elevated CDR R/S ratios " +
  "(1.98–3.18) across all disease categories confirm that antigen-driven positive selection is active " +
  "in CDR regions regardless of disease severity. However, the variation in CDR-to-FW mutation " +
  "ratios across groups reveals differences in the nature of selection. Recovered subjects' high " +
  "CDR/FW ratio (0.600) suggests that a greater proportion of their total mutations are concentrated " +
  "in antigen-binding regions, consistent with a mature, antigen-selected repertoire. Moderate " +
  "subjects' low CDR/FW ratio (0.209) and lowest CDR R/S (1.98) may indicate that selection has " +
  "not yet fully shaped the repertoire in these patients, who were in the early phase of disease."
));

children.push(heading("10.5 Integration of Clonal Features", HeadingLevel.HEADING_3));
children.push(para(
  "Considered together, the seven clonal dimensions paint a coherent picture of repertoire dynamics " +
  "during COVID-19. Severe disease is characterized by moderate diversity, high clonal dominance, " +
  "long CDR3 regions, and intermediate mutation levels—a profile consistent with an active, " +
  "antigen-driven response recruiting both newly activated and partially matured B cells. Mild " +
  "disease shows a more restricted repertoire (lowest diversity, fewest expanded clones) with " +
  "lower dominance and mutation levels but the highest CDR R/S ratio, suggesting efficient but " +
  "narrow selection. Recovered subjects exhibit the hallmarks of a completed immune response: " +
  "high diversity, moderate dominance, elevated mutation levels, and the highest CDR/FW ratio. " +
  "COVID Naive subjects show the highest mutation burden, most expanded clones, and steepest " +
  "mutation gradient, consistent with a well-established memory compartment from prior exposures."
));

children.push(heading("10.6 Conclusions", HeadingLevel.HEADING_3));
children.push(para(
  "In conclusion, our multi-dimensional clonal analysis reveals disease severity-associated " +
  "signatures in the B-cell receptor repertoire during COVID-19. Severe disease is characterized " +
  "by high clonal dominance with long CDR3 regions and intermediate mutation levels, while " +
  "recovery is associated with high diversity and extensively mutated clones with strong " +
  "antigen-driven selection. The addition of region-specific mutation and R/S ratio analyses " +
  "provides direct evidence of positive selection in CDR regions across all disease states, with " +
  "the intensity and maturity of selection varying by disease category. The iReceptor Statistics " +
  "API framework enables standardized cross-study comparisons that could be extended to other " +
  "infectious diseases and vaccine responses, providing a scalable approach to immune repertoire " +
  "profiling in multi-center studies."
));

// ======== BUILD DOC ========
const doc = new Document({
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync("Results_Section_v3.docx", buf);
  console.log("Done: Results_Section_v3.docx (" + Math.round(buf.length / 1024) + " KB)");
});
