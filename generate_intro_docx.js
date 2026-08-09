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

  children.push(para(
    "Antibodies are composed of two identical heavy chains and two identical light chains, each containing variable and constant domains. The heavy chain variable domain includes three CDR loops (CDR1, CDR2, CDR3) interspersed with four framework regions (FW1-FW4) that provide structural scaffolding [1,2]. Class switch recombination further diversifies the effector functions of antibodies by changing the constant region isotype (IgM, IgG, IgA, IgE) without altering antigen specificity [17]. The interplay between V(D)J recombination, SHM, affinity maturation, and class switching generates the extraordinary diversity required for effective humoral immunity [6,8]."
  ));

  // ── Section 2: Repertoire analysis in health and disease ──
  children.push(heading("Immune Repertoire Analysis in Health and Disease", HeadingLevel.HEADING_2));

  children.push(para(
    "Analyzing B cell repertoires provides insight into how the immune system responds to infections, vaccinations, autoimmune disorders, and malignancies [18,19,20]. High-throughput BCR repertoire sequencing, first described at scale by Glanville et al. in 2009 [21], has since enabled the detailed characterization of repertoire diversity at unprecedented depth [22,23]. Repertoire profiling has revealed that aging is associated with reduced clonal diversity, increased oligoclonality, and altered SHM patterns [24,25,26]. Sex-based differences in immune repertoire composition have also been documented, though their functional significance remains incompletely understood [27,28]. These findings underscore the importance of accounting for demographic covariates when comparing repertoires across disease states."
  ));

  children.push(para(
    "The COVID-19 pandemic, caused by severe acute respiratory syndrome coronavirus 2 (SARS-CoV-2), provided a unique opportunity to study BCR repertoire responses across a spectrum of disease severities [29,30]. Infection with SARS-CoV-2 elicits clinical outcomes ranging from asymptomatic or mild illness to severe pneumonia, acute respiratory distress syndrome (ARDS), and death [31,32]. Multiple studies have demonstrated that disease severity correlates with distinct BCR repertoire features: individuals with severe COVID-19 tend to exhibit higher clonal expansion, altered SHM patterns, and skewed V-gene usage compared to those with mild disease or healthy controls [33,34,35,36]. However, these findings have largely emerged from single-cohort studies with limited sample sizes and heterogeneous methodologies, making cross-study comparison and validation difficult."
  ));

  // ── Section 3: Data sharing challenges ──
  children.push(heading("AIRR-Seq Data Sharing and Cross-Study Challenges", HeadingLevel.HEADING_2));

  children.push(para(
    "The growing volume of Adaptive Immune Receptor Repertoire sequencing (AIRR-seq) data has created both an opportunity and a challenge for the field. Public repositories such as NCBI's Sequence Read Archive (SRA) [37], the Immune Epitope Database (IEDB) [38], and the iReceptor Gateway [39,40] provide platforms for storing and accessing B cell repertoire data. The AIRR Community has developed standards and protocols (MiAIRR) to facilitate data interoperability across different repositories and analysis platforms [41,42]. Despite these advances, several barriers to effective cross-study analysis remain."
  ));

  children.push(para(
    "First, metadata schemas differ widely across studies: some report age as exact values, others as ranges or categories; sex annotations vary in format; and disease stage descriptors are study-specific, making direct comparison impossible without harmonization [43]. Second, many repositories store annotated sequences but lack clonal definitions that associate sequences with their lineage relationships and metadata context. For example, the iReceptor Gateway provides a powerful platform for collecting, accessing, and standardizing annotated AIRR-seq data from multiple studies [39,40], but it does not currently support clone-level queries associated with metadata, limiting the types of biological questions that can be addressed. Third, differences in library preparation protocols, sequencing platforms, and bioinformatic pipelines across studies introduce technical variability that can confound biological signal [22,44]."
  ));

  // ── Section 4: Existing tools and gap ──
  children.push(heading("Existing Computational Tools and Their Limitations", HeadingLevel.HEADING_2));

  children.push(para(
    "Several computational tools have been developed for AIRR-seq analysis, each addressing different aspects of the analytical pipeline. ImmuneDB [45] is a relational database and pipeline for storing and analyzing B and T cell receptor high-throughput sequencing data, providing clone identification, mutation analysis, and lineage reconstruction within individual databases. The Immcantation Framework [46] offers sophisticated packages for clonal analysis, lineage tree construction, and repertoire diversity quantification, but requires substantial preprocessing to match its input requirements. MiXCR [47] provides automated extraction of receptor sequences from raw data, while IgBLAST [48] performs V(D)J gene assignment and alignment. More recently, tools such as cAb-Rep [49] and the Observed Antibody Space (OAS) database [50] have curated large collections of annotated antibody sequences for structural and evolutionary studies."
  ));

  children.push(para(
    "While these tools excel at analyzing individual datasets, none provides an integrated solution for querying clone-level statistics across multiple ImmuneDB databases simultaneously while preserving metadata context. A researcher wishing to compare, for example, clonal expansion patterns between severe and mild COVID-19 across three independent studies must currently download each dataset, preprocess it into the required format for each tool, perform parallel analyses, and manually reconcile the results. This workflow is time-consuming, error-prone, and does not scale to the dozens of studies now available for any given disease."
  ));

  // ── Section 5: IS-API ──
  children.push(heading("The ImmuneDB Statistics API (IS-API)", HeadingLevel.HEADING_2));

  children.push(para(
    "To address this gap, we designed and implemented the ImmuneDB Statistics Application Programming Interface (IS-API, v0.3.0), a RESTful API layer built on top of the ImmuneDB infrastructure and aligned with the AIRR Data Commons (ADC) API standard [51]. IS-API enables researchers to make standardized queries across multiple ImmuneDB instances regardless of their physical location, simultaneously interrogating clone-level statistics and associated metadata across experiments and laboratories. The API operates on two analytical levels: (1) a metadata layer that characterizes the composition and availability of data across studies (e.g., number of individuals, disease categories, demographics), and (2) a biological layer that computes repertoire statistics (clone size, clone count, mutation levels, CDR3 lengths, region-specific mutation patterns, and replacement-to-silent mutation ratios) for any combination of metadata filters."
  ));

  children.push(para(
    "A key feature of IS-API is its metadata fingerprint grouping mechanism, which identifies unique combinations of metadata fields across individuals and samples, enabling consistent cross-database comparisons despite heterogeneous metadata schemas. This allows researchers to first characterize what data are available and identify potential confounders before performing biological analyses, addressing the common pitfall of drawing conclusions from inadequately characterized datasets."
  ));

  // ── Section 6: COVID-19 as use case ──
  children.push(heading("COVID-19 as a Use Case for Cross-Study Repertoire Analysis", HeadingLevel.HEADING_2));

  children.push(para(
    "To demonstrate the utility of IS-API, we applied it to a cross-study analysis of BCR repertoires in the context of COVID-19. The pandemic generated an unprecedented volume of AIRR-seq data from multiple independent studies, each characterizing different aspects of the immune response to SARS-CoV-2 [29,33,34,35,52,53,54]. By integrating data from 7 studies encompassing 103 individuals across 6 harmonized disease categories (Severe, n=27; Mild, n=41; Moderate, n=9; Recovered, n=12; COVID Naive, n=8; Healthy, n=6), we aimed to leverage the combined statistical power of multiple cohorts to identify repertoire features associated with disease severity."
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
    "**Aim 1. Characterize a set of biological parameters that describe BCR repertoires across disease severity.** We selected seven complementary measures that together capture the major axes of repertoire diversity: (i) clone size distribution, reflecting the degree of clonal expansion; (ii) clone count, reflecting overall clonal richness; (iii) top-X clone ratios (top 10, 100, 1000), capturing repertoire dominance by expanded clones; (iv) CDR3 length, which influences the breadth of antigen recognition and has been shown to differ between naive and antigen-experienced repertoires [14,15]; (v) total somatic mutation levels, reflecting the cumulative history of affinity maturation; (vi) mutation distribution across framework and CDR regions, providing insight into structural versus antigen-contact zone diversification; and (vii) replacement-to-silent (R/S) mutation ratios per region, a classical indicator of antigen-driven positive selection [11,12]. These parameters were chosen because each captures a distinct biological aspect of the immune response, and together they provide a multidimensional fingerprint of repertoire state [16]."
  ));

  children.push(aimPara(
    "**Aim 2. Compare repertoire diversity across disease severity, age, and sex using IS-API's cross-study querying capability.** By applying the parameters defined in Aim 1 across 103 individuals from 7 studies, we test whether IS-API can identify biologically meaningful patterns that are consistent across independent datasets. This aim also serves to validate IS-API as a tool: if the API correctly integrates heterogeneous data and the metadata harmonization is effective, the resulting analyses should reveal patterns consistent with known immunological principles (e.g., age-associated repertoire narrowing) while potentially uncovering novel severity-associated signatures."
  ));

  // ── References ──
  children.push(heading("References"));

  const refs = [
    // [1]
    "Paul WE. Fundamental Immunology. 7th ed. Philadelphia: Wolters Kluwer Health/Lippincott Williams & Wilkins; 2013.",
    // [2]
    "Murphy K, Weaver C. Janeway's Immunobiology. 9th ed. New York: Garland Science; 2016.",
    // [3]
    "Tonegawa S. Somatic generation of antibody diversity. Nature. 1983;302(5909):575-581. doi:10.1038/302575a0",
    // [4]
    "Schatz DG, Swanson PC. V(D)J recombination: mechanisms of initiation. Annu Rev Genet. 2011;45:167-202. doi:10.1146/annurev-genet-110410-132552",
    // [5]
    "Briney B, Inderbitzin A, Joyce C, Burton DR. Commonality despite exceptional diversity in the baseline human antibody repertoire. Nature. 2019;566(7744):393-397. doi:10.1038/s41586-019-0879-y",
    // [6]
    "Di Noia JM, Neuberger MS. Molecular mechanisms of antibody somatic hypermutation. Annu Rev Biochem. 2007;76:1-22. doi:10.1146/annurev.biochem.76.061705.090740",
    // [7]
    "Victora GD, Nussenzweig MC. Germinal centers. Annu Rev Immunol. 2012;30:429-457. doi:10.1146/annurev-immunol-020711-075032",
    // [8]
    "Victora GD, Nussenzweig MC. Germinal centers. Annu Rev Immunol. 2022;40:413-442. doi:10.1146/annurev-immunol-120419-022408",
    // [9]
    "Hershberg U, Prak ETL. The analysis of clonal expansions in normal and autoimmune B cell repertoires. Philos Trans R Soc Lond B Biol Sci. 2015;370(1676):20140239. doi:10.1098/rstb.2014.0239",
    // [10]
    "Rosenfeld AM, Meng W, Luning Prak ET, Hershberg U. ImmuneDB, a novel tool for the analysis, storage, and dissemination of immune repertoire sequencing data. Front Immunol. 2018;9:2107. doi:10.3389/fimmu.2018.02107",
    // [11]
    "Hershberg U, Uduman M, Shlomchik MJ, Kleinstein SH. Improved methods for detecting selection by mutation analysis of Ig V region sequences. Int Immunol. 2008;20(5):683-694. doi:10.1093/intimm/dxn026",
    // [12]
    "Uduman M, Shlomchik MJ, Vigneault F, Church GM, Kleinstein SH. Integrating B cell lineage information into statistical tests for detecting selection in Ig sequences. J Immunol. 2014;192(3):867-874. doi:10.4049/jimmunol.1301032",
    // [13]
    "Schwartz GW, Hershberg U. Germline amino acid diversity in B cell receptors is a good predictor of somatic selection pressures. Front Immunol. 2013;4:79. doi:10.3389/fimmu.2013.00079",
    // [14]
    "Saada R, Weinberger M, Shahaf G, Mehr R. Models for antigen receptor gene rearrangement: CDR3 length. Immunol Cell Biol. 2007;85(4):323-332. doi:10.1038/sj.icb.7100055",
    // [15]
    "Willis JR, Briney BS, DeLuca SL, Crowe JE Jr, Meiler J. Human germline antibody gene segments encode polyspecific antibodies. PLoS Comput Biol. 2013;9(4):e1003045. doi:10.1371/journal.pcbi.1003045",
    // [16]
    "Schwartz GW, Hershberg U. Conserved variation: identifying patterns of stability and variability in BCR and TCR V genes with different diversity and richness metrics. Phys Biol. 2013;10(3):035005. doi:10.1088/1478-3975/10/3/035005",
    // [17]
    "Stavnezer J, Guikema JEJ, Schrader CE. Mechanism and regulation of class switch recombination. Annu Rev Immunol. 2008;26:261-292. doi:10.1146/annurev.immunol.26.021607.090248",
    // [18]
    "Yuuki H, Itamiya T, Nagafuchi Y, Ota M, Fujio K. B cell receptor repertoire abnormalities in autoimmune disease. Front Immunol. 2024;15:1326823. doi:10.3389/fimmu.2024.1326823",
    // [19]
    "Kim D, Park D. Deep sequencing of B cell receptor repertoire. BMB Rep. 2019;52(9):540-547. doi:10.5483/BMBRep.2019.52.9.192",
    // [20]
    "Georgiou G, Ippolito GC, Beausang J, et al. The promise and challenge of high-throughput sequencing of the antibody repertoire. Nat Biotechnol. 2014;32(2):158-168. doi:10.1038/nbt.2782",
    // [21]
    "Glanville J, Zhai W, Berka J, et al. Precise determination of the diversity of a combinatorial antibody library gives insight into the human immunoglobulin repertoire. Proc Natl Acad Sci USA. 2009;106(48):20216-20221. doi:10.1073/pnas.0909775106",
    // [22]
    "Marks C, Deane CM. How repertoire data are changing antibody science. J Biol Chem. 2020;295(29):9823-9837. doi:10.1074/jbc.REV120.010181",
    // [23]
    "Yang X, Wang M, Wu J, et al. Large-scale analysis of 2,152 Ig-seq datasets reveals key features of B cell biology and the antibody repertoire. Cell Rep. 2021;35(6):109110. doi:10.1016/j.celrep.2021.109110",
    // [24]
    "de Bourcy CFA, Angel CJL, Vollmers C, Dekker CL, Davis MM, Quake SR. Phylogenetic analysis of the human antibody repertoire reveals quantitative signatures of immune senescence and aging. Proc Natl Acad Sci USA. 2017;114(5):1105-1110. doi:10.1073/pnas.1617959114",
    // [25]
    "Henry C, Zheng NY, Huang M, et al. Influenza virus vaccination elicits poorly adapted B cell responses in elderly individuals. Cell Host Microbe. 2019;25(3):357-366.e6. doi:10.1016/j.chom.2019.01.002",
    // [26]
    "Dunn-Walters DK. The ageing human B cell repertoire: a failure of selection? Clin Exp Immunol. 2016;183(1):50-56. doi:10.1111/cei.12700",
    // [27]
    "Klein SL, Flanagan KL. Sex differences in immune responses. Nat Rev Immunol. 2016;16(10):626-638. doi:10.1038/nri.2016.90",
    // [28]
    "Fink AL, Klein SL. The evolution of greater humoral immunity in females than males: implications for vaccine efficacy. Curr Opin Physiol. 2018;6:16-20. doi:10.1016/j.cophys.2018.03.010",
    // [29]
    "Hoehn KB, Ramanathan P, Unterman A, et al. Cutting edge: distinct B cell repertoires characterize patients with mild and severe COVID-19. J Immunol. 2021;206(12):2785-2790. doi:10.4049/jimmunol.2100135",
    // [30]
    "Kuri-Cervantes L, Pampena MB, Meng W, et al. Comprehensive mapping of immune perturbations associated with severe COVID-19. Sci Immunol. 2020;5(49):eabd7114. doi:10.1126/sciimmunol.abd7114",
    // [31]
    "Wu Z, McGoogan JM. Characteristics of and important lessons from the coronavirus disease 2019 (COVID-19) outbreak in China. JAMA. 2020;323(13):1239-1242. doi:10.1001/jama.2020.2648",
    // [32]
    "Guan WJ, Ni ZY, Hu Y, et al. Clinical characteristics of coronavirus disease 2019 in China. N Engl J Med. 2020;382(18):1708-1720. doi:10.1056/NEJMoa2002032",
    // [33]
    "Galson JD, Schaetzle S, Bashford-Rogers RJM, et al. Deep sequencing of B cell receptor repertoires from COVID-19 patients reveals strong convergent immune signatures. Front Immunol. 2020;11:605170. doi:10.3389/fimmu.2020.605170",
    // [34]
    "Montague Z, Lv H, Otwinowski J, et al. Dynamics of B-cell repertoires and emergence of cross-reactive responses in COVID-19 patients with different disease severity. Cell Rep. 2021;35(9):109173. doi:10.1016/j.celrep.2021.109173",
    // [35]
    "Nielsen SCA, Yang F, Jackson KJL, et al. Human B cell clonal expansion and convergent antibody responses to SARS-CoV-2. Cell Host Microbe. 2020;28(4):516-525.e5. doi:10.1016/j.chom.2020.09.002",
    // [36]
    "Robbiani DF, Gaebler C, Muecksch F, et al. Convergent antibody responses to SARS-CoV-2 in convalescent individuals. Nature. 2020;584(7821):437-442. doi:10.1038/s41586-020-2456-9",
    // [37]
    "Leinonen R, Sugawara H, Shumway M; International Nucleotide Sequence Database Collaboration. The Sequence Read Archive. Nucleic Acids Res. 2011;39(Database issue):D19-D21. doi:10.1093/nar/gkq1019",
    // [38]
    "Vita R, Mahajan S, Overton JA, et al. The Immune Epitope Database (IEDB): 2018 update. Nucleic Acids Res. 2019;47(D1):D339-D343. doi:10.1093/nar/gky1006",
    // [39]
    "Corrie BD, Marthandan N, Zimonja B, et al. iReceptor: a platform for querying and analyzing antibody/B-cell and T-cell receptor repertoire data across federated repositories. Immunol Rev. 2018;284(1):24-41. doi:10.1111/imr.12666",
    // [40]
    "The iReceptor Gateway. https://gateway.ireceptor.org",
    // [41]
    "Vander Heiden JA, Marquez S, Brochet X, et al. AIRR Community Standardized Representations for Annotated Immune Repertoires. Front Immunol. 2018;9:2206. doi:10.3389/fimmu.2018.02206",
    // [42]
    "Rubelt F, Busse CE, Bukhari SAC, et al. Adaptive immune receptor repertoire community recommendations for sharing immune-repertoire sequencing data. Nat Immunol. 2017;18(12):1274-1278. doi:10.1038/ni.3873",
    // [43]
    "Yaari G, Kleinstein SH. Practical guidelines for B-cell receptor repertoire sequencing analysis. Genome Med. 2015;7:121. doi:10.1186/s13073-015-0243-2",
    // [44]
    "Greiff V, Miho E, Coster L, et al. The biochemical structure of the adaptive immune receptor repertoire: methodological considerations and clinical implications. Front Hematol. 2023;2:1190216. doi:10.3389/frhem.2023.1190216",
    // [45]
    "Rosenfeld AM, Meng W, Luning Prak ET, Hershberg U. ImmuneDB: a system for the analysis and exploration of high-throughput adaptive immune receptor sequencing data. Bioinformatics. 2017;33(2):292-293. doi:10.1093/bioinformatics/btw593",
    // [46]
    "Gupta NT, Vander Heiden JA, Uduman M, Gadala-Maria D, Yaari G, Kleinstein SH. Change-O: a toolkit for analyzing large-scale B cell immunoglobulin repertoire sequencing data. Bioinformatics. 2015;31(20):3356-3358. doi:10.1093/bioinformatics/btv359",
    // [47]
    "Bolotin DA, Poslavsky S, Mitrophanov I, et al. MiXCR: software for comprehensive adaptive immunity profiling. Nat Methods. 2015;12(5):380-381. doi:10.1038/nmeth.3364",
    // [48]
    "Ye J, Ma N, Madden TL, Ostell JM. IgBLAST: an immunoglobulin variable domain sequence analysis tool. Nucleic Acids Res. 2013;41(W1):W34-W40. doi:10.1093/nar/gkt382",
    // [49]
    "Guo Y, Chen K, Kwong PD, Shapiro L, Sheng Z. cAb-Rep: a database of curated antibody repertoires for exploring antibody diversity and predicting antibody prevalence. Front Immunol. 2019;10:2365. doi:10.3389/fimmu.2019.02365",
    // [50]
    "Olsen TH, Boyles F, Deane CM. Observed Antibody Space: a diverse database of cleaned, annotated, and translated unpaired and paired antibody sequences. Protein Sci. 2022;31(1):141-146. doi:10.1002/pro.4205",
    // [51]
    "Christley S, Aguiar A, Brizuela M, et al. The ADC API: a web API for the programmatic query of the AIRR Data Commons. Front Big Data. 2020;3:22. doi:10.3389/fdata.2020.00022",
    // [52]
    "Goel RR, Apostolidis SA, Painter MM, et al. Distinct antibody and memory B cell responses in SARS-CoV-2 naive and recovered individuals following mRNA vaccination. Sci Immunol. 2021;6(58):eabi6950. doi:10.1126/sciimmunol.abi6950",
    // [53]
    "Gaebler C, Wang Z, Lorenzi JCC, et al. Evolution of antibody immunity to SARS-CoV-2. Nature. 2021;591(7851):639-644. doi:10.1038/s41586-021-03207-w",
    // [54]
    "Meng W, Zhang B, Schwartz GW, et al. An atlas of B-cell clonal distribution in the human body. Nat Biotechnol. 2017;35(9):879-884. doi:10.1038/nbt.3942",
  ];

  refs.forEach((ref, i) => {
    children.push(para(`${i + 1}. ${ref}`, { after: 60, alignment: AlignmentType.LEFT }));
  });

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
  fs.writeFileSync("Introduction_Section_v2.docx", buf);
  console.log(`Written Introduction_Section_v2.docx (${(buf.length / 1024).toFixed(0)} KB)`);
}

main().catch(console.error);
