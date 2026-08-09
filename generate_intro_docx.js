const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel,
  LevelFormat,
} = require("docx");

const FONT = "Times New Roman";
const SZ = 24;

function tr(text, opts = {}) {
  return new TextRun({
    text,
    font: FONT,
    size: opts.size || SZ,
    bold: opts.bold,
    italics: opts.italics,
    superScript: opts.super,
  });
}

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    children: [tr(text, { bold: true, size: level === HeadingLevel.HEADING_1 ? 28 : 26 })],
    spacing: { before: 300, after: 150 },
  });
}

function para(text, opts = {}) {
  const runs = [];
  // Parse **bold**, *italic*, and [REF] markers
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\])/g);
  for (const p of parts) {
    if (p.startsWith("**") && p.endsWith("**")) {
      runs.push(tr(p.slice(2, -2), { bold: true }));
    } else if (p.startsWith("*") && p.endsWith("*") && !p.startsWith("**")) {
      runs.push(tr(p.slice(1, -1), { italics: true }));
    } else {
      runs.push(tr(p));
    }
  }
  return new Paragraph({
    children: runs,
    alignment: opts.alignment || AlignmentType.JUSTIFIED,
    spacing: { after: opts.after !== undefined ? opts.after : 160, line: 360 },
    indent: opts.indent,
  });
}

function aimPara(text) {
  const runs = [];
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  for (const p of parts) {
    if (p.startsWith("**") && p.endsWith("**")) {
      runs.push(tr(p.slice(2, -2), { bold: true }));
    } else if (p.startsWith("*") && p.endsWith("*") && !p.startsWith("**")) {
      runs.push(tr(p.slice(1, -1), { italics: true }));
    } else {
      runs.push(tr(p));
    }
  }
  return new Paragraph({
    children: runs,
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 100, line: 360 },
    indent: { left: 360 },
  });
}

async function main() {
  const children = [];

  // ══════════════════════════════════════════════════════
  // INTRODUCTION
  // ══════════════════════════════════════════════════════
  children.push(heading("Introduction"));

  // ── Section 1: B cell biology and antibody development ──
  // (Reviewer point 1: missing paragraph on antibody development)
  children.push(heading("B Cells, Antibody Development, and Repertoire Diversity", HeadingLevel.HEADING_2));

  children.push(para(
    "The adaptive immune system provides targeted defense against pathogens and establishes immunological memory for long-term protection. Central to adaptive immunity are B lymphocytes, which produce antibodies (immunoglobulins) capable of recognizing a virtually unlimited range of antigens [1,2]. During B cell development in the bone marrow, the variable regions of immunoglobulin heavy and light chain genes are assembled through V(D)J recombination, a process in which variable (V), diversity (D), and joining (J) gene segments are stochastically rearranged to generate a highly diverse naive B cell receptor (BCR) repertoire [3,4]. This combinatorial diversity, together with junctional diversity introduced by random nucleotide additions and deletions at segment junctions, produces an estimated 10^11 or more distinct BCR specificities in a single individual [1,5]."
  ));

  children.push(para(
    "Upon encountering antigen, activated B cells migrate to germinal centers in secondary lymphoid organs, where they undergo rapid proliferation and somatic hypermutation (SHM). SHM introduces point mutations predominantly in the variable regions of both heavy and light chain genes, with mutations concentrated in the complementarity-determining regions (CDRs) that directly contact antigen [6,7]. B cells bearing receptors with improved antigen-binding affinity are positively selected through iterative rounds of mutation and selection, a process termed affinity maturation [8]. This process yields high-affinity antibodies and generates a diverse repertoire of B cell clones, defined as lineages of B cells descended from a single progenitor cell sharing the same V(D)J rearrangement [9,10]. The ratio of replacement (non-synonymous) to silent (synonymous) mutations in the CDRs versus framework regions provides a molecular signature of antigen-driven selection pressure [11,12]."
  ));

  children.push(para(
    "The structure of an antibody molecule reflects its dual function: the variable region, particularly the CDR3 loop of the heavy chain, determines antigen specificity, while the constant region mediates effector functions such as complement activation and Fc receptor binding [2,13]. CDR3 length is a critical determinant of the breadth of antigen recognition; longer CDR3 loops can access recessed epitopes on viral surfaces, while shorter loops may favor binding to flat protein surfaces [14,15]. Together, the diversity of clone sizes, mutation profiles, CDR3 lengths, and selection patterns constitute the \"shape\" of an individual's immune repertoire, which reflects both developmental history and immune experience [16]."
  ));

  // ── Section 2: Repertoire analysis in health and disease ──
  children.push(heading("Immune Repertoire Analysis in Health and Disease", HeadingLevel.HEADING_2));

  children.push(para(
    "Analyzing B cell repertoires provides insight into how the immune system responds to infections, vaccinations, autoimmune disorders, and malignancies [17,18,19]. High-throughput BCR repertoire sequencing, first described at scale by Glanville et al. in 2009 [20], has since enabled the detailed characterization of repertoire diversity at unprecedented depth [21,22]. Repertoire profiling has revealed that aging is associated with reduced clonal diversity, increased oligoclonality, and altered SHM patterns [23,24,25]. Sex-based differences in immune repertoire composition have also been documented, though their functional significance remains incompletely understood [26,27]. These findings underscore the importance of accounting for demographic covariates when comparing repertoires across disease states."
  ));

  children.push(para(
    "The COVID-19 pandemic, caused by severe acute respiratory syndrome coronavirus 2 (SARS-CoV-2), provided a unique opportunity to study BCR repertoire responses across a spectrum of disease severities [28,29]. Infection with SARS-CoV-2 elicits clinical outcomes ranging from asymptomatic or mild illness to severe pneumonia, acute respiratory distress syndrome (ARDS), and death [30,31]. Multiple studies have demonstrated that disease severity correlates with distinct BCR repertoire features: individuals with severe COVID-19 tend to exhibit higher clonal expansion, altered SHM patterns, and skewed V-gene usage compared to those with mild disease or healthy controls [32,33,34,35]. However, these findings have largely emerged from single-cohort studies with limited sample sizes and heterogeneous methodologies, making cross-study comparison and validation difficult."
  ));

  // ── Section 3: Data sharing challenges ──
  children.push(heading("AIRR-Seq Data Sharing and Cross-Study Challenges", HeadingLevel.HEADING_2));

  children.push(para(
    "The growing volume of Adaptive Immune Receptor Repertoire sequencing (AIRR-seq) data has created both an opportunity and a challenge for the field. Public repositories such as NCBI's Sequence Read Archive (SRA) [36], the Immune Epitope Database (IEDB) [37], and the iReceptor Gateway [38] provide platforms for storing and accessing B cell repertoire data. The AIRR Community has developed standards and protocols (MiAIRR) to facilitate data interoperability across different repositories and analysis platforms [39,40]. Despite these advances, several barriers to effective cross-study analysis remain."
  ));

  children.push(para(
    "First, metadata schemas differ widely across studies: some report age as exact values, others as ranges or categories; sex annotations vary in format; and disease stage descriptors are study-specific, making direct comparison impossible without harmonization [41]. Second, many repositories store annotated sequences but lack clonal definitions that associate sequences with their lineage relationships and metadata context. For example, the iReceptor Gateway provides a powerful platform for collecting, accessing, and standardizing annotated AIRR-seq data from multiple studies [38], but it does not currently support clone-level queries associated with metadata, limiting the types of biological questions that can be addressed. Third, differences in library preparation protocols, sequencing platforms, and bioinformatic pipelines across studies introduce technical variability that can confound biological signal [42,43]."
  ));

  // ── Section 4: Existing tools and gap ──
  children.push(heading("Existing Computational Tools and Their Limitations", HeadingLevel.HEADING_2));

  children.push(para(
    "Several computational tools have been developed for AIRR-seq analysis, each addressing different aspects of the analytical pipeline. ImmuneDB [44] is a relational database and pipeline for storing and analyzing B and T cell receptor high-throughput sequencing data, providing clone identification, mutation analysis, and lineage reconstruction within individual databases. The Immcantation Framework [45] offers sophisticated packages for clonal analysis, lineage tree construction, and repertoire diversity quantification, but requires substantial preprocessing to match its input requirements. MiXCR [46] provides automated extraction of receptor sequences from raw data, while IgBLAST [47] performs V(D)J gene assignment and alignment. More recently, tools such as cAb-Rep [48] and the Observed Antibody Space (OAS) database [49] have curated large collections of annotated antibody sequences for structural and evolutionary studies."
  ));

  children.push(para(
    "While these tools excel at analyzing individual datasets, none provides an integrated solution for querying clone-level statistics across multiple ImmuneDB databases simultaneously while preserving metadata context. A researcher wishing to compare, for example, clonal expansion patterns between severe and mild COVID-19 across three independent studies must currently download each dataset, preprocess it into the required format for each tool, perform parallel analyses, and manually reconcile the results. This workflow is time-consuming, error-prone, and does not scale to the dozens of studies now available for any given disease."
  ));

  // ── Section 5: IS-API ──
  children.push(heading("The ImmuneDB Statistics API (IS-API)", HeadingLevel.HEADING_2));

  children.push(para(
    "To address this gap, we designed and implemented the ImmuneDB Statistics Application Programming Interface (IS-API, v0.3.0), a RESTful API layer built on top of the ImmuneDB infrastructure and aligned with the AIRR Data Commons (ADC) API standard [50]. IS-API enables researchers to make standardized queries across multiple ImmuneDB instances regardless of their physical location, simultaneously interrogating clone-level statistics and associated metadata across experiments and laboratories. The API operates on two analytical levels: (1) a metadata layer that characterizes the composition and availability of data across studies (e.g., number of individuals, disease categories, demographics), and (2) a biological layer that computes repertoire statistics (clone size, clone count, mutation levels, CDR3 lengths, region-specific mutation patterns, and replacement-to-silent mutation ratios) for any combination of metadata filters."
  ));

  children.push(para(
    "A key feature of IS-API is its metadata fingerprint grouping mechanism, which identifies unique combinations of metadata fields across individuals and samples, enabling consistent cross-database comparisons despite heterogeneous metadata schemas. This allows researchers to first characterize what data are available and identify potential confounders before performing biological analyses, addressing the common pitfall of drawing conclusions from inadequately characterized datasets."
  ));

  // ── Section 6: COVID-19 as use case ──
  children.push(heading("COVID-19 as a Use Case for Cross-Study Repertoire Analysis", HeadingLevel.HEADING_2));

  children.push(para(
    "To demonstrate the utility of IS-API, we applied it to a cross-study analysis of BCR repertoires in the context of COVID-19. The pandemic generated an unprecedented volume of AIRR-seq data from multiple independent studies, each characterizing different aspects of the immune response to SARS-CoV-2 [28,32,33,34,51,52,53]. By integrating data from 7 studies encompassing 103 individuals across 6 harmonized disease categories (Severe, n=27; Mild, n=41; Moderate, n=9; Recovered, n=12; COVID Naive, n=8; Healthy, n=6), we aimed to leverage the combined statistical power of multiple cohorts to identify repertoire features associated with disease severity."
  ));

  children.push(para(
    "The selection of studies was guided by several criteria: (1) availability of raw AIRR-seq BCR sequences in public repositories, (2) clinical annotation of disease severity or COVID-19 status, (3) availability of demographic metadata (age, sex), and (4) compatibility with the ImmuneDB pipeline for standardized clone identification. While the abundance of COVID-19 AIRR-seq studies in the literature is large, many lack the metadata completeness or raw data accessibility required for inclusion in our framework. We acknowledge that the included studies differ in library preparation protocols, sequencing platforms, and geographic populations, which introduces technical variability. The IS-API's metadata characterization layer was specifically designed to identify such heterogeneity before biological analyses, allowing researchers to assess and account for these differences rather than ignoring them."
  ));

  // ── Section 7: Hypothesis and Aims ──
  // (Reviewer points 5, 22: rationale, clear purpose)
  children.push(heading("Hypothesis and Aims"));

  children.push(para(
    "This work has a dual purpose: first, to present and validate IS-API as a computational tool for cross-study immune repertoire analysis, and second, to apply it to characterize BCR repertoire features associated with COVID-19 disease severity, age, and sex. These two goals are complementary: the biological analysis serves as a rigorous test case for the tool, while the tool enables biological insights that would be difficult to obtain from any single study alone."
  ));

  children.push(para(
    "We hypothesize that the diversity and composition of an individual's BCR repertoire are associated with their clinical response to SARS-CoV-2 infection. Specifically, we expect that individuals with severe COVID-19 will exhibit distinct patterns of clonal expansion, somatic hypermutation, and CDR3 characteristics compared to those with mild disease, and that these patterns may be further modulated by age and sex. We further hypothesize that cross-study analysis, enabled by IS-API, will reveal repertoire signatures that are robust across independent cohorts, strengthening confidence in their biological significance."
  ));

  children.push(para("To test these hypotheses, we set the following aims:"));

  children.push(aimPara(
    "**Aim 1. Characterize a set of biological parameters that describe BCR repertoires across disease severity.** We selected seven complementary measures that together capture the major axes of repertoire diversity: (i) clone size distribution, reflecting the degree of clonal expansion; (ii) clone count, reflecting overall clonal richness; (iii) top-X clone ratios (top 10, 100, 1000), capturing repertoire dominance by expanded clones; (iv) CDR3 length, which influences the breadth of antigen recognition and has been shown to differ between naive and antigen-experienced repertoires [14,15]; (v) total somatic mutation levels, reflecting the cumulative history of affinity maturation; (vi) mutation distribution across framework and CDR regions, providing insight into structural versus antigen-contact zone diversification; and (vii) replacement-to-silent (R/S) mutation ratios per region, a classical indicator of antigen-driven positive selection [11,12]. These parameters were chosen because each captures a distinct biological aspect of the immune response, and together they provide a multidimensional fingerprint of repertoire state."
  ));

  children.push(aimPara(
    "**Aim 2. Compare repertoire diversity across disease severity, age, and sex using IS-API's cross-study querying capability.** By applying the parameters defined in Aim 1 across 103 individuals from 7 studies, we test whether IS-API can identify biologically meaningful patterns that are consistent across independent datasets. This aim also serves to validate IS-API as a tool: if the API correctly integrates heterogeneous data and the metadata harmonization is effective, the resulting analyses should reveal patterns consistent with known immunological principles (e.g., age-associated repertoire narrowing) while potentially uncovering novel severity-associated signatures."
  ));

  // ── Build document ──
  const doc = new Document({
    numbering: {
      config: [{
        reference: "bullets",
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: "•",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      }],
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
  fs.writeFileSync("Introduction_Section_v1.docx", buf);
  console.log(`Written Introduction_Section_v1.docx (${(buf.length / 1024).toFixed(0)} KB)`);
}

main().catch(console.error);
