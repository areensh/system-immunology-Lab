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
  const p = `${dir}/${name}`;
  return new ImageRun({
    data: fs.readFileSync(p),
    transformation: { width: w, height: h },
    type: "png",
  });
}

function heading(text, level) {
  return new Paragraph({ text, heading: level, spacing: { before: 300, after: 100 } });
}

function para(text, opts = {}) {
  const runs = [];
  if (typeof text === "string") {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    for (const part of parts) {
      if (part.startsWith("**") && part.endsWith("**")) {
        runs.push(new TextRun({ text: part.slice(2, -2), bold: true, size: 24, font: "Times New Roman" }));
      } else {
        runs.push(new TextRun({ text: part, size: 24, font: "Times New Roman", ...opts }));
      }
    }
  } else {
    runs.push(...text);
  }
  return new Paragraph({
    children: runs,
    spacing: { after: 120, line: 360 },
    alignment: AlignmentType.JUSTIFIED,
  });
}

function figCaption(num, text) {
  return new Paragraph({
    children: [
      new TextRun({ text: `Figure ${num}. `, bold: true, size: 22, font: "Times New Roman" }),
      new TextRun({ text, size: 22, font: "Times New Roman" }),
    ],
    spacing: { before: 60, after: 200 },
    alignment: AlignmentType.CENTER,
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

const children = [];

// ======== TITLE ========
children.push(new Paragraph({
  children: [new TextRun({
    text: "Results",
    bold: true, size: 32, font: "Times New Roman"
  })],
  heading: HeadingLevel.HEADING_1,
  alignment: AlignmentType.CENTER,
  spacing: { after: 300 },
}));

// ======== 1. COHORT OVERVIEW ========
children.push(heading("1. Cohort Assembly and Metadata Overview", HeadingLevel.HEADING_2));

children.push(para(
  "Using the iReceptor Statistics API (v0.3.0), we queried seven immune repertoire datasets " +
  "spanning COVID-19 disease severities and healthy controls. The initial query returned " +
  "metadata for all repertoires across these studies. After applying quality filters—removing " +
  "non-biological controls (covid_vaccine_new-Fb, covid_vaccine_new-Water), subjects with " +
  "insufficient data (lp16_Igblast-D159, lp16_Igblast-D154, lp16_Igblast-Hu-1), and restricting " +
  "to peripheral blood samples only—we assembled a final cohort of **103 subjects** across **6 datasets**."
));

children.push(para(
  "An important cohort design decision involved the healthy control group. The covid19 dataset (CD3) " +
  "contained three subjects labeled as \"healthy\" (H3, H4, H8); however, these individuals were " +
  "recruited within the context of a COVID-19 study and may have been exposed to the virus, " +
  "introducing potential confounding. We therefore excluded these three subjects from the " +
  "healthy control group and instead used the dedicated healthy cohort from the lp16_Igblast " +
  "dataset (HC1), which comprises six pre-pandemic healthy donors with no known COVID-19 exposure, " +
  "providing a cleaner baseline for comparison."
));

children.push(para(
  "The 13 raw disease labels across datasets were harmonized into six standardized categories: " +
  "**Severe** (n=27), **Mild** (n=41), **Moderate** (n=9), **Recovered** (n=12), **COVID Naive** (n=8), " +
  "and **Healthy** (n=6). This harmonization mapped labels such as \"Early phase hypoxaemia\" to Severe, " +
  "\"non-severe\" to Mild, and \"Early phase-Stable/Improving\" to Moderate, enabling cross-dataset " +
  "comparisons despite heterogeneous annotation practices."
));

children.push(para(
  "Figure 1 shows the number of subjects contributed by each dataset. Figures 2–3 illustrate " +
  "the raw disease stage distribution and the harmonized disease spectrum across the assembled cohort, " +
  "including the contribution from the HC1 healthy controls."
));

// Metadata figures
children.push(figPara(IMG_BASE_META, "01_subjects_per_dataset.png", 580, 380));
children.push(figCaption(1, "Number of subjects per dataset after quality filtering."));

children.push(figPara(IMG_BASE_META, "02_disease_stage_raw.png", 600, 400));
children.push(figCaption(2, "Distribution of raw disease stage labels across all datasets, colored by severity gradient."));

children.push(figPara(IMG_BASE_META, "04_disease_harmonized_with_labels.png", 600, 400));
children.push(figCaption(3, "Harmonized disease categories with mapping from original labels."));

children.push(figPara(IMG_BASE_META, "03_disease_spectrum_with_HC1.png", 580, 370));
children.push(figCaption(4, "Disease spectrum coverage showing COVID dataset and HC1 healthy control contributions."));

children.push(pageBreak());

// Demographics
children.push(heading("1.1 Demographic Characteristics", HeadingLevel.HEADING_3));

children.push(para(
  "Demographic metadata availability varied across studies. Figure 5 summarizes the sex and " +
  "age group distributions where reported. Figure 6 shows the cross-tabulation of disease " +
  "categories by sex, while Figure 7 presents the age distribution by disease category."
));

children.push(figPara(IMG_BASE_META, "02b_subjects_per_sex.png", 500, 350));
children.push(figCaption(5, "Distribution of subjects by sex across the cohort."));

children.push(figPara(IMG_BASE_META, "03a_disease_by_sex.png", 580, 380));
children.push(figCaption(6, "Disease category breakdown by sex."));

children.push(figPara(IMG_BASE_META, "03d_age_by_disease_boxplot.png", 580, 380));
children.push(figCaption(7, "Age distribution across disease categories."));

children.push(pageBreak());

// ======== 2. CLONAL ANALYSIS ========
children.push(heading("2. Clonal Analysis by Disease Severity", HeadingLevel.HEADING_2));

children.push(para(
  "All clonal analysis endpoints were computed via the iReceptor Statistics API using metadata " +
  "fingerprint grouping, which enables disease-stratified analysis across federated datasets. " +
  "Unless otherwise noted, all analyses include **103 subjects** across six disease categories. " +
  "Clone size analysis is based on **96 subjects** (seven CD1 subjects—Cov14, Cov39, Cov45, " +
  "Cov49, Cov60, Cov66, and Cov70—were not returned by the API for this endpoint). All " +
  "boxplots display the median (horizontal line), interquartile range (box), and mean ± standard " +
  "deviation (red diamond with error bars)."
));

// 2.1 Clone Count
children.push(heading("2.1 Clonal Diversity (Clone Count)", HeadingLevel.HEADING_3));

children.push(para(
  "Clone count, representing the number of unique clonal lineages per subject, serves as a " +
  "measure of B-cell repertoire diversity. As shown in Figure 8, Recovered subjects exhibited " +
  "the highest median clone count (21,527), followed by COVID Naive (16,682), suggesting that " +
  "prior SARS-CoV-2 exposure drives clonal diversification. In contrast, Mild subjects showed " +
  "the lowest median clone count (2,478), consistent with a less pronounced immune response. " +
  "Severe and Moderate groups displayed intermediate diversity (median 5,089 and 5,085, respectively), " +
  "with substantial inter-subject variability."
));

children.push(figPara(IMG_BASE_CLONE, "01_clone_count_by_disease.png", 560, 380));
children.push(figCaption(8, "Unique clone count (clonal diversity) by disease category. Y-axis on log10 scale."));

children.push(pageBreak());

// 2.2 TopX
children.push(heading("2.2 Clonal Dominance (Top-X Proportions)", HeadingLevel.HEADING_3));

children.push(para(
  "To assess clonal dominance, we quantified the proportion of total immunoglobulin copies " +
  "accounted for by the top 10, top 100, and top 1,000 most expanded clones per subject. " +
  "Figure 9 presents the stacked composition for each subject, grouped by disease category."
));

children.push(para(
  "Healthy controls showed the most oligoclonal repertoires, with the top 1,000 clones accounting " +
  "for a median 99.3% of total copies. The Moderate group exhibited the highest median top-10 " +
  "dominance (23.1%), indicating concentrated clonal expansion. Mild subjects displayed the " +
  "lowest top-10 proportion (10.6%), consistent with more polyclonal repertoires. Recovered " +
  "subjects showed relatively low top-1,000 dominance (62.0%), indicating the most evenly " +
  "distributed repertoires among the disease groups."
));

children.push(figPara(IMG_BASE_CLONE, "02_topX_stacked_by_disease.png", 620, 340));
children.push(figCaption(9, "Stacked bar representation of clonal dominance showing the fraction of total copies from the top 10, 11–100, 101–1000, and remaining clones per subject, grouped by disease category."));

children.push(pageBreak());

// 2.3 CDR3
children.push(heading("2.3 CDR3 Length Analysis", HeadingLevel.HEADING_3));

children.push(para(
  "CDR3 region length is a key determinant of antigen-binding specificity. We examined the " +
  "average CDR3 amino acid length across the top 10, top 100, and top 1,000 most expanded " +
  "clones per subject. As shown in Figure 10, CDR3 lengths were generally consistent across " +
  "clone tiers and disease categories, ranging from approximately 14–18 amino acids."
));

children.push(para(
  "Notably, Severe subjects exhibited the longest median CDR3 in their top-10 clones (17.7 AA), " +
  "compared to Healthy controls (13.8 AA). This pattern was less pronounced in less expanded " +
  "tiers (top 100 and top 1,000), where CDR3 lengths converged across disease groups. The " +
  "CDR3 length difference between top-10 and top-1,000 clones (Figure 11) reveals that Severe " +
  "subjects had a positive median difference (+1.2 AA), indicating that the most expanded " +
  "clones tend to have longer CDR3 regions, while Healthy controls showed a negative difference " +
  "(−2.1 AA), suggesting their most expanded clones have shorter CDR3 sequences."
));

children.push(figPara(IMG_BASE_CLONE, "03_cdr3_by_disease.png", 580, 380));
children.push(figCaption(10, "Average CDR3 amino acid length by clone tier (Top 10, Top 100, Top 1000) across disease categories."));

children.push(figPara(IMG_BASE_CLONE, "04_cdr3_range_by_disease.png", 560, 380));
children.push(figCaption(11, "CDR3 length difference between the top 10 and top 1000 clones per subject, reflecting selective pressure on CDR3 length in the most expanded clones. Dashed line indicates zero difference."));

children.push(pageBreak());

// 2.4 Somatic Hypermutation
children.push(heading("2.4 Somatic Hypermutation", HeadingLevel.HEADING_3));

children.push(para(
  "Somatic hypermutation (SHM) levels reflect the degree of affinity maturation in B-cell " +
  "clones. Figure 12 presents the average mutation count across clone tiers by disease " +
  "category. COVID Naive subjects showed the highest median mutation levels across all tiers " +
  "(top 10: 119.0, top 100: 92.9, top 1000: 27.3), consistent with extensive affinity " +
  "maturation from prior immune challenges. Recovered subjects also exhibited elevated " +
  "mutation (top 10: 107.0), suggesting ongoing or recent germinal center activity."
));

children.push(para(
  "The mutation gradient (Figure 13)—defined as the difference in average mutation count " +
  "between the top 10 and top 1,000 clones—was positive across all disease categories, " +
  "indicating that more expanded clones consistently carry more mutations. COVID Naive " +
  "subjects showed the steepest gradient (median 92.2), while Mild subjects had the " +
  "shallowest (median 33.2), suggesting a more uniform mutation profile in mild disease."
));

children.push(figPara(IMG_BASE_CLONE, "05_mutation_by_disease.png", 580, 380));
children.push(figCaption(12, "Average somatic hypermutation count by clone tier across disease categories."));

children.push(figPara(IMG_BASE_CLONE, "06_mutation_gradient_by_disease.png", 560, 380));
children.push(figCaption(13, "Mutation gradient (Top 10 minus Top 1000 mutation count) by disease category, reflecting selective enrichment of mutated clones."));

children.push(pageBreak());

// 2.5 Mutation by Region
children.push(heading("2.5 Region-Specific Mutation (CDR vs. FW)", HeadingLevel.HEADING_3));

children.push(para(
  "To distinguish between antigen-driven selection (reflected in CDR mutations) and " +
  "background mutation accumulation (reflected in framework mutations), we analyzed mutation " +
  "rates separately for CDR and FW regions. As shown in Figures 14–15, FW regions consistently " +
  "carried more mutations than CDR regions across all disease categories, consistent with the " +
  "longer total length of framework regions."
));

children.push(para(
  "Mild subjects exhibited the highest median CDR mutation rate (5.11 mutations per clone), " +
  "followed by Severe (4.39) and Healthy (4.23). Framework mutations were highest in Mild " +
  "(11.3) and Severe (9.11) groups. The CDR-to-FW mutation ratio was lowest in Moderate " +
  "subjects (0.209), suggesting a relatively higher proportion of background over antigen-driven " +
  "mutations, while Recovered subjects showed the highest ratio (0.600), indicative of " +
  "stronger antigen-driven selection."
));

children.push(figPara(IMG_BASE_CLONE, "07_cdr_mutations_by_disease.png", 560, 380));
children.push(figCaption(14, "Average CDR region mutations per clone by disease category."));

children.push(figPara(IMG_BASE_CLONE, "07_fw_mutations_by_disease.png", 560, 380));
children.push(figCaption(15, "Average framework (FW) region mutations per clone by disease category."));

children.push(pageBreak());

// 2.6 R/S Ratio
children.push(heading("2.6 Replacement-to-Synonymous (R/S) Mutation Ratio", HeadingLevel.HEADING_3));

children.push(para(
  "The R/S ratio quantifies the balance between replacement (non-synonymous) and synonymous " +
  "mutations, serving as a proxy for positive selection pressure. An R/S ratio significantly " +
  "above 1 suggests antigen-driven selection. As shown in Figure 16, CDR regions exhibited " +
  "markedly higher R/S ratios than framework regions across all disease categories, consistent " +
  "with CDR regions being the primary target of antigen-driven selection."
));

children.push(para(
  "The median CDR R/S ratio ranged from 1.98 (Moderate) to 3.18 (Mild), all well above 1.0, " +
  "confirming strong positive selection in CDR regions. Framework R/S ratios were more " +
  "constrained (range: 1.51–1.72), consistent with structural conservation pressures. " +
  "The dashed line in Figure 16 indicates an R/S ratio of 1.0 (neutral selection). " +
  "Notably, Moderate subjects showed the lowest CDR R/S ratio (1.98), which, combined with " +
  "their low CDR-to-FW mutation ratio (Section 2.5), suggests reduced antigen-driven " +
  "selection relative to other disease groups."
));

children.push(figPara(IMG_BASE_CLONE, "08_rs_ratio_by_disease.png", 580, 380));
children.push(figCaption(16, "Replacement-to-synonymous (R/S) mutation ratio in CDR and FW regions by disease category. Dashed line at R/S = 1.0 indicates neutral selection."));

children.push(pageBreak());

// 2.7 Clone Size
children.push(heading("2.7 Clone Size Distribution", HeadingLevel.HEADING_3));

children.push(para(
  "Clone size analysis was performed on **96 of 103 subjects** (seven CD1 Severe subjects " +
  "were not returned by the API for the clone_size endpoint). Clone size represents the " +
  "number of copies (sequences) per clonal lineage, with all clones in this dataset having " +
  "a minimum size of 21 copies. We defined \"highly expanded\" clones as those with more " +
  "than 100 copies."
));

children.push(para(
  "Figure 17 presents the median clone size per subject across disease categories. COVID Naive " +
  "subjects exhibited the highest median clone size (103 copies), followed by Recovered (73.5) " +
  "and Moderate (69.5) groups. Mild subjects had the lowest median clone size (37 copies), " +
  "consistent with their lower clonal dominance observed in the Top-X analysis."
));

children.push(para(
  "The number of highly expanded clones (>100 copies) varied dramatically across disease " +
  "categories (Figure 18). COVID Naive subjects had the most expanded clones (median 157), " +
  "while Mild subjects had a median of 0 expanded clones, indicating that most Mild subjects " +
  "lack clones exceeding the 100-copy threshold. Among subjects with expanded clones, " +
  "Figure 19 shows the mean size of those expanded clones, with similar distributions across " +
  "disease categories."
));

children.push(figPara(IMG_BASE_CLONE, "09_clone_size_by_disease.png", 560, 380));
children.push(figCaption(17, "Median clone size (copies per clone) by disease category. Y-axis on log10 scale."));

children.push(figPara(IMG_BASE_CLONE, "10_expanded_clones_by_disease.png", 560, 380));
children.push(figCaption(18, "Number of highly expanded clones (>100 copies) per subject by disease category. Y-axis on log10 scale (+1 offset)."));

children.push(figPara(IMG_BASE_CLONE, "11_expanded_clone_size_by_disease.png", 560, 380));
children.push(figCaption(19, "Mean clone size of highly expanded clones (>100 copies) only, by disease category. Y-axis on log10 scale."));

children.push(pageBreak());

// ======== 3. SUMMARY ========
children.push(heading("3. Summary of Key Findings", HeadingLevel.HEADING_2));

children.push(para(
  "This study demonstrates the utility of the iReceptor Statistics API for federated immune " +
  "repertoire analysis across seven heterogeneous datasets. Key findings by disease category:"
));

const summaryPoints = [
  "**Severe (n=27):** High clone count variability with intermediate diversity (median 5,089 clones). Longest CDR3 in top-10 clones (17.7 AA) with positive CDR3 length gradient, suggesting selection for longer binding loops. Moderate mutation levels and R/S ratios.",
  "**Mild (n=41):** Lowest clonal diversity (median 2,478), lowest clone size (median 37 copies), and fewest expanded clones (median 0), consistent with a limited immune response. Shallowest mutation gradient but highest CDR R/S ratio (3.18), suggesting efficient but narrow selection.",
  "**Moderate (n=9):** Highest top-10 dominance (23.1%), indicating concentrated clonal expansion. Lowest CDR R/S ratio (1.98) and CDR-to-FW mutation ratio (0.209), suggesting relatively less antigen-driven selection compared to other groups.",
  "**Recovered (n=12):** Highest clonal diversity (median 21,527 clones) with the most evenly distributed repertoires (lowest top-1000 dominance at 62.0%). High mutation levels and highest CDR-to-FW ratio (0.600), indicating sustained affinity maturation following infection.",
  "**COVID Naive (n=8):** Highest mutation levels across all tiers, steepest mutation gradient (92.2), and most expanded clones (median 157), reflecting a repertoire shaped by prior immune challenges unrelated to COVID-19.",
  "**Healthy (n=6):** Drawn from the HC1 pre-pandemic cohort to avoid confounding. Most oligoclonal repertoires (top-1000 at 99.3%) with shortest CDR3 in top clones (13.8 AA) and negative CDR3 length gradient (−2.1 AA).",
];

for (const point of summaryPoints) {
  children.push(para(point));
}

children.push(para(
  "Across all analyses, clone size data was available for 96 of 103 subjects, with seven " +
  "CD1 Severe subjects absent from the API response for that endpoint. All other endpoints " +
  "(clone count, CDR3 length, Top-X proportions, somatic hypermutation, regional mutation, " +
  "and R/S ratio) were available for the full 103-subject cohort."
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
  console.log("Done: Results_Section_v3.docx");
});
