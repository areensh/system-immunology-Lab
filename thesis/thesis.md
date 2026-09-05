---
title: "Identifying Differences in B Cell Receptor Repertoires Compared by Age, Gender and COVID-19 Infection Severity and Outcome — A New Bioinformatic Tool for Cross-Experiment Comparison and Validation"
author: "Areen Shtewe"
date: "2024"
geometry: margin=2.5cm
fontsize: 12pt
linestretch: 1.5
toc: true
toc-depth: 3
numbersections: true
---

\newpage

**Identifying Differences in B Cell Receptor Repertoires Compared by Age, Gender and COVID-19 Infection Severity and Outcome — A New Bioinformatic Tool for Cross-Experiment Comparison and Validation**

**By: Areen Shtewe**

**Supervised By: Prof. Uri Hershberg**

THESIS SUBMITTED IN PARTIAL FULFILLMENT OF THE REQUIREMENTS FOR THE MASTER'S DEGREE

University of Haifa

Faculty of Natural Science

Department of Human Biology

2024

\newpage

# Abstract

In the last decade, the field of Adaptive Immune Receptor Repertoire (AIRR) sequencing analysis has expanded rapidly. Advances in RNA and DNA sequencing techniques, longer read lengths, and reduced costs have made it feasible to sample individual repertoires for millions of sequences and clones. This growth has created a bioinformatic challenge: the ability to query across multiple experiments and laboratories to perform cross-population meta-analysis. To address this, I present the ImmuneDB Stats Application Programming Interface (IS-API), a tool that can rapidly scan multiple sequence databases and characterize the repertoire diversity of multiple individuals while comparing their basic repertoire characteristics and accounting for differing metadata (gender, age, disease state, vaccination background, tissue type, cell type, and others).

Building on our existing ImmuneDB AIRR-seq database infrastructure, I have designed, implemented, and tested IS-API version 0.3.0. This API enables querying across multiple studies and their individual ImmuneDB instances using Common Table Expression (CTE)-based SQL queries that ensure correct per-individual, per-tissue aggregation. In this way, we can leverage the abundance of existing, expensive studies and make queries across experiments and laboratories, taking advantage of the global reach of AIRR-seq. We can then characterize the datasets of interest or the subset repertoires therein for their mutation levels, clone size, diversity measures, selection patterns, and more.

To demonstrate the power of IS-API, I present here a cross-study analysis of COVID-19 BCR repertoires. Using the tool's metadata querying capabilities, I first characterize six COVID-19-related and healthy control studies encompassing 106 blood-derived repertoires from 94 individuals, then conduct a comparative clonal analysis of B cell receptor (BCR) repertoires across six disease categories — Severe, Moderate, Mild, Recovered, COVID Naive, and Healthy — examining clonal diversity (Hill numbers), clone size distributions, somatic hypermutation patterns (non-synonymous to synonymous ratios), CDR3 length distributions, V gene usage, and potential confounding by age and gender. Statistical comparisons employ Kruskal-Wallis tests across all groups with pairwise Mann-Whitney U tests and Bonferroni correction. This analysis reveals significant differences in clonal diversity and mutation patterns across disease severities, demonstrating both the biological insights and the practical utility of cross-study repertoire analysis with IS-API.

\newpage

# List of Tables

**Table 1.** Studies included in the analysis with individual metadata.

**Table 2.** Disease stage harmonization across studies.

**Table 3.** Individual counts per harmonized disease category.

**Table 4.** IS-API metadata endpoints.

**Table 5.** IS-API statistical endpoints — parameters, returns, and configurable options.

\newpage

# List of Figures

## Methods Figures

**Methods Figure 1.** IS-API pipeline: from raw DNA sequences to cross-study analysis.

**Methods Figure 2.** IS-API system architecture: client queries fan out to multiple ImmuneDB instances.

**Methods Figure 3.** Three-tier analysis approach: metadata, biological-statistical measurements, and specific biological questions.

## Metadata Figures

**Metadata Figure 1.** Sampling depth across studies: number of subjects per dataset and sequencing depth per subject.

**Metadata Figure 2.** Metadata availability per dataset — which metadata fields are present in each study.

**Metadata Figure 3.** Raw disease stage labels across studies (13 categories before harmonization).

**Metadata Figure 4.** Disease stage harmonization mapping from raw annotations to unified categories.

**Metadata Figure 5.** Demographics scatter plot: age by disease category, colored by dataset, shaped by sex.

**Metadata Figure 6.** Heatmap of individual counts across disease category, age group, and sex.

## Results Figures

**Figure 1.** Diversity profiles by disease stage.

**Figure 2.** Clone size distribution by disease stage.

**Figure 3.** Clone size: copies versus unique sequences by disease stage.

**Figure 4.** Clonal concentration (Top X) by disease stage.

**Figure 5.** CDR3 length by clone size and disease stage (expanded vs. rest).

**Figure 6.** CDR3 length distribution: all clones and expanded clones by disease stage.

**Figure 7.** CDR3 length of top 10 clones by disease stage.

**Figure 8.** CDR3 length range of top 10 clones by disease stage.

**Figure 9.** NS/S ratios and mutation counts by disease stage (all clones and expanded vs. rest).

**Figure 10.** V gene usage heatmap by disease stage.

**Figure 11.** Clonal metrics versus age by disease stage.

**Figure 12.** Clonal metrics by gender and disease stage.

**Figure 13.** Mutation level in top 10 clones stratified by sex and disease stage.

**Figure 14.** CDR3 length in top 10 clones stratified by sex and disease stage.

**Figure 15.** Within-individual clone count across tissues.

**Figure 16.** Within-individual clone size across tissues.

**Figure 17.** Within-individual tissue comparison (paired line plots).

\newpage

# Introduction

## B Cell Repertoire and Diversity

The adaptive immune system eliminates infections from the body and provides protection against re-infection upon subsequent encounters with the same pathogen. Key players of the adaptive immune system are B lymphocytes, which diversify their receptors through genetic rearrangement and, consequently, are able to recognize virtually any foreign antigen they encounter [1]. During development in the bone marrow, B cells undergo rearrangement of Variable (V), Diversity (D), and Joining (J) gene segments to create a wide diversity of B cell receptors (BCRs). According to the clonal selection theory [2], all receptors expressed by the same B cell share the same unique antigen-binding site. During an immune response, B cells undergo rapid cycles of proliferation and targeted somatic hypermutation (SHM) in both heavy (H) chain and light (L) chain variable region genes [3]. This process, termed affinity maturation, occurs within germinal centers and results in B cells with improved antigen binding affinity, leading to the creation of a diverse repertoire of clones — defined as a set of B cells derived from a single progenitor cell sharing a specific V(D)J rearrangement [4, 5].

The diversity of the immune repertoire is extremely high, with an estimated 10^11 different BCRs existing in a single individual [6]. While it is clear that the diversity of the immune system is fundamental to its function [1], the actual forms that immune repertoire diversity takes, in health and disease, have not been fully characterized [4]. Analyzing B cell repertoires helps understand how the immune system responds to infections, vaccinations, and diseases including cancer and autoimmune disorders [7]. Insights from repertoire studies guide the design of more effective vaccines by identifying specific mutations and the structural features of reactive antibody regions [8]. Additionally, tracking B cell repertoire changes and identifying characteristic patterns can be used for disease diagnosis, monitoring disease progression, predicting severity, and tailoring personalized treatments [9].

The antibody molecule consists of two identical heavy chains and two identical light chains. Each chain contains a variable region responsible for antigen recognition and a constant region that determines the antibody class (isotype). The variable region contains three complementarity-determining regions (CDR1, CDR2, CDR3) interspersed with four framework regions (FW1-FW4). The CDR3 region, formed at the junction of V, D, and J gene segments, is the most variable portion of the antibody and plays a central role in antigen binding specificity [10]. The length and amino acid composition of the CDR3 loop directly influence the range of antigens an antibody can recognize [11]. During affinity maturation, somatic hypermutation introduces point mutations primarily in the variable region, with a higher rate of non-synonymous (replacement) mutations in CDR regions reflecting positive selection for improved antigen binding, while framework regions tend to accumulate fewer replacement mutations to preserve structural integrity [12, 13].

## Repertoire Studies, Data Analysis, and Sharing

In the past few decades, many techniques have been developed for B cell repertoire AIRR sequence studies, allowing for detailed analysis of BCR diversity at an unprecedented scale [9]. High-throughput BCR repertoire sequencing was first described by Glanville et al. in 2009 [14], and since then the volume of available data has increased exponentially [15]. Recently, significant efforts have been made to move beyond the model where most AIRR-seq data are stored and curated by individual laboratories [16, 17].

A variety of tools, software platforms, and algorithms have been developed to store and analyze sequencing data [18, 19]. Data sharing fosters collaboration among researchers, enabling cross-study comparisons and accelerating discoveries. Sharing raw and processed data ensures that results can be validated and reproduced by other researchers, avoiding duplication of effort and maximizing the use of available data. Several public repositories and databases — including NCBI's Sequence Read Archive (SRA), the Immune Epitope Database (IEDB), and the iReceptor Gateway [17] — provide platforms for storing and sharing B cell repertoire data.

The AIRR Community has developed standards and protocols to facilitate data sharing and interoperability among different databases [20]. Despite their contributions, these platforms still have challenges that limit B cell repertoire studies and data sharing. Technical challenges include sequencing errors and sample bias due to sampling methods. Data sharing challenges include the lack of uniform standards for data formatting and annotation, which can limit the integration and comparison of datasets from different studies. For example, the iReceptor Gateway provides an excellent platform for collecting, accessing, and standardizing annotated sequences from many different studies [16], but it lacks clonal definitions that can be associated with metadata and therefore does not support queries at the clone level. Many of these tools collect data across multiple studies but do not give the researcher the ability to investigate associated metadata alongside biological measures.

Several computational tools have been developed for repertoire analysis. The Immcantation Framework [21] provides sophisticated packages for defining and analyzing clones and building lineage trees. MiXCR [22] offers comprehensive adaptive immunity profiling from raw sequences. IgBLAST [23] enables immunoglobulin variable domain sequence analysis. More recently, nf-core/airrflow [48] has introduced a standardized Nextflow pipeline for AIRR-seq data processing, providing reproducible workflows from raw reads to annotated repertoires. While these tools enable researchers to perform various queries and analyses on individual datasets, they do not natively support queries across multiple databases that characterize repertoire diversity across many studies simultaneously.

We have previously developed ImmuneDB [24], a relational database and pipeline to store and analyze B and T cell receptor high-throughput sequencing data. ImmuneDB integrates annotation, clonal assignment, mutation analysis, and basic statistical measures into a unified database structure. However, like other single-database tools, it does not enable researchers to make queries that characterize repertoire diversity across many studies or to investigate multiple metadata dimensions simultaneously.

## IS-API: Cross-Study Repertoire Analysis

Building on the ImmuneDB infrastructure, I have designed and implemented the multi-immune database statistics application programming interface (IS-API), aligned with the AIRR Data Commons (ADC) API [25]. IS-API allows researchers to make queries across experiments and across laboratories, taking advantage of the global reach of AIRR-seq. Researchers can characterize multiple datasets or subset repertoires therein for their mutation levels, clone size, selection patterns, diversity measures, and metadata composition — all through a unified programmatic interface.

IS-API version 0.3.0 introduces several key improvements over earlier versions. Most importantly, it employs CTE-based SQL queries (referred to as sampleMetaCTE) that ensure correct per-individual, per-tissue aggregation of statistics. This addresses a fundamental challenge in cross-study analysis: different studies may have different numbers of samples per individual and different tissue types, and naive aggregation can produce misleading results. The CTE approach first identifies the relevant samples for each individual matching the requested metadata filters, then aggregates clone-level statistics across those samples, ensuring that each individual contributes one data point regardless of their number of samples.

## COVID-19 as a Test Case for Cross-Study Analysis

The COVID-19 pandemic provides an ideal test case for cross-study repertoire analysis. Infection with SARS-CoV-2 causes a wide spectrum of disease severities, ranging from asymptomatic to critical illness [28]. The observed variation in responses raises many questions regarding the causes of differential immunity and the diversity of the B cell repertoire in different individuals. The widespread interest in the immune response to SARS-CoV-2 has led to multiple independent sequencing studies of different stages of disease and recovery.

Sequencing data from multiple disease severity categories — as well as recovered, vaccinated, and healthy individuals — have been generated and stored in ImmuneDB databases. These datasets enable us to investigate the clonal and mutation characteristics of the BCR population and compare them across age, gender, and COVID-19 disease severity using IS-API. In this work, I have applied IS-API across six studies encompassing 106 blood-derived repertoires from 94 individuals annotated for disease stage, with subsets annotated for age and sex.

Previous studies have shown that severe COVID-19 is associated with reduced B cell diversity and altered clonal dynamics [28, 32, 31]. However, these studies typically analyze individual cohorts in isolation. By applying IS-API to multiple studies simultaneously, we can assess whether patterns observed in one cohort replicate across others, providing more robust conclusions about the relationship between BCR repertoire characteristics and disease outcomes.

\newpage

# Hypothesis and Aims

We hypothesize that the characteristics of an individual's B cell repertoire — including its diversity, clonal expansion patterns, mutation levels, and CDR3 properties — differ systematically across COVID-19 disease severities, and that these differences can be detected through cross-study analysis using IS-API. Specifically, we expect that individuals with severe disease will show altered repertoire characteristics compared to those with mild disease or healthy controls, potentially reflecting differences in germinal center activity, clonal selection, and affinity maturation.

To investigate this hypothesis, we set two aims:

**Aim 1: Demonstrate IS-API as a tool for cross-study repertoire exploration.**

Validate the IS-API tool by showing its ability to:

(i) Query and visualize metadata across multiple independent ImmuneDB databases, identifying the scope and limitations of available data.

(ii) Generate per-individual repertoire statistics (clone count, clone size, mutation levels, CDR3 lengths) from multiple studies through a unified interface.

(iii) Enable within-individual cross-tissue comparisons when multiple tissue samples are available.

**Aim 2: Conduct a comparative clonal analysis of BCR repertoires across COVID-19 disease severities.**

Using IS-API, compare repertoire characteristics across six disease categories (Severe, Moderate, Mild, Recovered, COVID Naive, and Healthy) using the following measures:

(i) Clonal diversity: Hill numbers of orders 0 (richness), 1 (Shannon entropy), and 2 (Simpson concentration).

(ii) Clone size distribution: median clone size per individual and distribution of expanded clones at multiple thresholds.

(iii) Somatic hypermutation: non-synonymous to synonymous (NS/S) mutation ratios in CDR and framework regions.

(iv) CDR3 length: mean and standard deviation of CDR3 amino acid length per individual.

(v) V gene usage: frequency of V gene families across disease categories.

(vi) Confounders: assessment of age and gender as potential confounding variables.

\newpage

# Materials and Methods

## Data Collection and Database Construction

Data were collected from published studies with raw DNA AIRR BCR sequences from healthy and SARS-CoV-2-infected individuals at different stages of disease and recovery, as well as vaccinated individuals. After collecting the raw DNA sequences along with their metadata, we built standardized metadata sheets compliant with AIRR-seq data commons standards [26] while allowing flexibility for experiment-specific fields. Each study was processed through the ImmuneDB pipeline — annotated with IgBLAST [23] for germline assignment, clustered into clones, and stored with associated metadata in individual ImmuneDB database instances.

Seven studies were available through IS-API (**Table 1**):

**Table 1.** Datasets available through IS-API v0.3.0.

| Study ID | Database | Description | N | PMID | Ref |
|---|---|---|---|---|---|
| CD1 | Covid19_db3 | Severe, mild, and moderate COVID-19 from multiple hospital cohorts | 51 | 37153628 | [29, 30] |
| CD2 | covid_db2 | Severe, non-severe, recovered, and healthy individuals | 19 | 33384691 | [31] |
| CD3 | covid19 | Severe COVID-19 and healthy controls | 13 | 32669287 | [32] |
| CVX1 | vaccine2 | COVID-19 mRNA vaccine study (recovered and naive vaccinees) | 12 | 34648302 | [49] |
| CVX2 | covid_vaccine_new | Second vaccine cohort with recovered individuals | 5 | 33858945 | [33] |
| HC1 | lp16 | Healthy control organ donors, no COVID-19 or vaccination | 6 | 28829438 | [34] |
| GT1 | sykesIgblast2020 | Pediatric gut transplant recipients | 7 | 38014202 | [47] |

## Individual Selection and Exclusions

An important feature of IS-API is its ability to selectively include or exclude specific individuals, studies, or metadata categories from the analysis. This enables researchers to exclude unpublished datasets, control samples (such as fibroblast or water controls used in sequencing quality assessment), and individuals with incomplete metadata — all through the query interface without modifying the underlying databases.

From the six studies, we identified 94 unique individuals with blood-derived samples. Five individuals were excluded due to data quality issues or ambiguous metadata: three from HC1 (individuals with incomplete sequencing data) and two from CVX2 (fibroblast and water sequencing controls). Three additional healthy individuals from CD3 lacked sex and age metadata; these were included in all analyses except the age and gender confounder analysis. After exclusions, 94 individuals contributed 106 blood-derived repertoires to the analysis (some individuals had multiple blood time points).

Blood-derived tissues were defined as: blood, Peripheral blood, PBL (peripheral blood lymphocytes), and PBMC (peripheral blood mononuclear cells). Non-blood tissues (bone marrow, lymph node, lung, gut) were excluded from the cross-study comparison to ensure tissue homogeneity.

## Disease Stage Harmonization

Different studies used different terminology for disease stages. We harmonized these into six categories (**Table 2**).

**Table 2.** Disease stage harmonization. Original labels from each study mapped to unified categories.

| Harmonized Category | Original Labels | Source Studies |
|---|---|---|
| Severe | "severe", "Early phase hypoxaemia" | CD1, CD2, CD3 |
| Moderate | "Early phase-Stable", "Early phase-Improving" | CD1 |
| Mild | "mild", "non-severe" | CD1, CD2 |
| Recovered | "Recovering without ICU-Improving", "Recovering post-ICU -Improving", "Recovering post-ICU", "Recovered", "COVID recovered" | CD1, CD2, CVX1, CVX2 |
| COVID Naive | "COVID Naive" | CVX1 |
| Healthy | "healthy" | CD3, HC1 |

The COVID Naive category refers to vaccinated individuals with no history of COVID-19 infection. The Healthy category refers to individuals with no history of COVID-19 infection or vaccination.

The final cohort composition is shown in **Table 3**.

**Table 3.** Individual counts per harmonized disease category.

| Disease Category | N | Contributing Studies | Notes |
|---|---|---|---|
| Severe | 26 | CD1, CD2, CD3 | |
| Moderate | 9 | CD1 | |
| Mild | 30 | CD1, CD2 | |
| Recovered | 12 | CD2, CVX1, CVX2 | Includes naturally recovered (3 from CD2) and vaccine-recovered (5 from CVX2, 4 from CVX1) |
| COVID Naive | 8 | CVX1 | Vaccinated, never infected with SARS-CoV-2 |
| Healthy | 9 | CD3, HC1 | No COVID-19 history, no vaccination (3 from CD3, 6 from HC1) |
| **Total** | **94** | | |

## IS-API Metadata Endpoints

IS-API provides metadata endpoints that allow researchers to explore the available data before conducting biological analyses (**Table 4**).

**Table 4.** IS-API metadata endpoints.

| Endpoint | Description | Example Query Filters |
|---|---|---|
| metadata | Returns available metadata fields and values per individual across all databases | database, tissue, disease_stage |
| subjects | Lists individuals matching specified metadata criteria | disease_stage, sex, age, tissue |
| samples | Lists samples (repertoires) per individual with associated metadata | tissue, cell_type, sample_processing |
| studies | Returns study-level information (title, lab, species, sequencing platform) | database name |

## IS-API Architecture and Implementation

The overall workflow for building and querying immune repertoire databases is illustrated in **Methods Figure 1**: raw DNA sequences (FASTA/Q or IgBLAST-annotated) are processed with uniform and consistent metadata into ImmuneDB databases, which are then queried through IS-API.

![Methods Figure 1. IS-API data preparation pipeline. Raw DNA sequences in FASTA/Q or IgBLAST-annotated format are combined with uniform and consistent metadata, then loaded into individual ImmuneDB database instances (one per study, dashed box). IS-API connects to all instances, enabling cross-study queries through a single interface.](../methods_fig1.png){ width=100% }

IS-API is a RESTful API written in Node.js [27] using the Express framework. It connects to multiple independent ImmuneDB MySQL database instances and executes queries across all of them in a single API call (**Methods Figure 2**). The five endpoint controllers — Metadata, Clones, Mutations, CDR3, and Gene Usage — each fan out to 1...N ImmuneDB instances and return results in a unified JSON format. The API is publicly available at https://github.com/DrexelSystemsImmunologyLab/IS-API.

![Methods Figure 2. IS-API system architecture. A client sends a request specifying an endpoint controller (Metadata, Clones, Mutations, CDR3, or Gene Usage) along with metadata filters. IS-API fans out the query to 1...N independent ImmuneDB MySQL database instances, aggregates the results, and returns a unified JSON output that can be further processed into graphical visualizations.](../methods_fig2.png){ width=100% }

The analysis approach follows a three-tier pyramid (**Methods Figure 2**): (1) Metadata investigation at the base — examining available studies, individuals, samples, and processes to understand the data landscape; (2) Biological-statistical measurements in the middle — computing clones, clone size, gene usage, and mutations across all kinds of metadata; and (3) Specific biological questions at the top — testing whether, for example, clone size differences correlate with disease stage.

![Methods Figure 3. Three-tier analysis approach. Tier 1 (base): metadata investigation — examining available studies, subjects, samples, and processing pipelines to assess data availability. Tier 2 (middle): biological-statistical measurements — computing clones, clone size, gene usage, and mutations across all kinds of metadata. Tier 3 (top): specific biological questions — testing targeted hypotheses such as whether clone size differences correlate with disease stage.](../methods_fig3.png){ width=100% }

All endpoints are designed as POST requests. The request body contains two JSON objects:

1. **repertoires**: specifies the metadata filters using two parallel arrays — `meta_key` and `meta_value`. Each entry in `meta_key` names a metadata dimension (e.g., `"disease_stage"`, `"tissue"`, `"sex"`), and the corresponding entry in `meta_value` specifies the desired value (e.g., `"severe"`, `"blood"`, `"M"`). Setting a value to `"ALL"` returns all non-NA values for that dimension. Multiple keys can be specified simultaneously to perform cross-stratified queries — for example, filtering by both disease stage and tissue in a single request.
2. **statistics**: an array containing the name of the statistical measure to compute (e.g., `["clone_count"]`). Some endpoints accept additional parameters such as `min_clone_size` for clone-size-stratified analyses.

An example POST request querying CDR3 length by clone size for blood samples across all disease stages:

```json
{
  "repertoires": {
    "meta_key": ["disease_stage", "tissue"],
    "meta_value": ["ALL", "blood"]
  },
  "statistics": ["cdr3_by_clone_size"],
  "min_clone_size": 20,
  "min_expanded_clones": 0
}
```

The response follows a standardized JSON structure:

```json
{
  "Info": {
    "title": "iReceptorPlus Statistics API",
    "version": "0.3.0",
    "description": "Statistics API for the iReceptor Plus platform"
  },
  "Result": [
    {
      "repertoire": {
        "repertoire_id": "covid19-S24",
        "meta_key": ["disease_stage", "tissue"],
        "meta_value": ["severe", "blood"]
      },
      "statistics": [
        {
          "statistic_name": "cdr3_by_clone_size",
          "total": null,
          "stats_value": [
            { "clone_id": "expanded_avg_cdr3", "count": 17.78 },
            { "clone_id": "expanded_n", "count": 1536 },
            { "clone_id": "rest_avg_cdr3", "count": 18.17 },
            { "clone_id": "rest_n", "count": 16579 }
          ]
        }
      ]
    }
  ]
}
```

Each entry in the `Result` array corresponds to one individual matching the metadata filters. The `repertoire` object echoes the matched metadata (database, individual identifier, and the key-value pairs), while the `statistics` array contains the computed values as name-value pairs in `stats_value`. This structure is consistent across all endpoints, enabling uniform parsing regardless of the statistic queried.

The full set of available statistical queries is detailed below in **Table 5**, organized by endpoint controller. All endpoints accept `meta_key` and `meta_value` arrays as their primary parameters for metadata filtering, enabling cross-stratified queries (e.g., mutation levels by disease stage and sex simultaneously). Version 0.3.0 introduced CTE-based queries (sampleMetaCTE) that first identify all samples matching the requested metadata for each individual, then aggregate statistics across those samples, ensuring correct per-individual results regardless of the number of samples or time points available.

**Table 5.** IS-API v0.3.0 statistical endpoints — parameters, returns, and configurable options.

| Controller | Statistic | Parameters | Returns (per individual) | Configurable |
|---|---|---|---|---|
| **Clones** | clone_count | meta_key, meta_value | Number of distinct clones exceeding the expansion threshold | Expansion threshold (default: ≥20 unique sequences) |
| | clone_size | meta_key, meta_value | Size of each clone as a distribution | Measure: unique sequences, instances, or copy number |
| | clone_size_copies | meta_key, meta_value | Size of each clone measured by raw read counts | — |
| | topX_clone_size_copies | meta_key, meta_value | Cumulative sequence copies for the top 10, 100, and 1000 clones | Top X rank |
| **Mutations** | topX_mutation_level | meta_key, meta_value | Average mutation count for the top 10, 100, and 1000 clones | Top X rank |
| | mutation_by_region | meta_key, meta_value | Average mutation count split by CDR and FW regions | — |
| | mutation_by_type | meta_key, meta_value | Average non-synonymous and synonymous mutation counts | — |
| | mutation_cdr_rs_ratio | meta_key, meta_value | NS and S mutation counts in CDR and FW regions separately | — |
| | mutation_rs_by_clone_size | meta_key, meta_value, min_clone_size, min_expanded_clones | NS and S counts in CDR and FW for expanded vs. rest clones | Clone size threshold (default: 20); minimum expanded clone count |
| **CDR3** | topX_nt_AVG_CDR3_length | meta_key, meta_value | Average CDR3 nucleotide length for the top 10, 100, and 1000 clones | Top X rank |
| | topX_AA_AVG_CDR3_length | meta_key, meta_value | Average CDR3 amino acid length for the top 10, 100, and 1000 clones | Top X rank |
| | cdr3_length_distribution | meta_key, meta_value | Mean, SD, and clone count for CDR3 length (AA and nt) | — |
| | cdr3_by_clone_size | meta_key, meta_value, min_clone_size, min_expanded_clones | Mean and SD of CDR3 length for expanded vs. rest clones | Clone size threshold (default: 20); minimum expanded clone count |
| **Gene Usage** | v_gene_usage | meta_key, meta_value | Clone count and total copies per V gene segment | — |

**Configurable parameters.** IS-API is designed to give researchers control over key analysis parameters through the request body, rather than imposing fixed values. The configurable parameters include: (1) *clone_size* supports three measurement modes — unique sequences (distinct sequences across an entire individual, reflecting overall diversity), instances (distinct sequences within a single sample, capturing sample-level diversity), or copy number (raw read counts, reflecting sequence abundance); (2) the expansion threshold in *clone_count* and the clone-size-stratified endpoints (*cdr3_by_clone_size*, *mutation_rs_by_clone_size*) is set via the `min_clone_size` parameter (default: 20), allowing researchers to define what constitutes an "expanded" clone at any threshold; (3) a `min_expanded_clones` parameter filters out individuals with too few expanded clones at the chosen threshold; (4) the Top X ranks in the *topX* endpoints (default: 10, 100, 1000) can be adjusted to examine clones at different ranks of the size distribution; (5) all endpoints accept arbitrary `meta_key`/`meta_value` combinations for cross-stratified filtering.

CDR and FW region boundaries follow the ImmuneDB database schema, where CDR is defined as the sum of CDR1, CDR2, and CDR3 regions, and FW is defined as FW1 + FW2 + FW3 + FW4. These boundaries are determined by the upstream IgBLAST annotation and stored in the ImmuneDB `clone_stats.mutations` JSON field, so they are not adjustable at the API level.

## Biological Statistical Measures

IS-API returns per-individual, per-metadata-group measurements in a structured JSON format. Most of the biological measures used in this analysis are returned directly by the API endpoints, while some require additional client-side computation from the API output.

**Measures returned directly by the API:**

1. **Clone count and expanded clone count**: The *clone_count* endpoint returns the number of distinct clones exceeding the expansion threshold per individual. By adjusting the threshold, researchers can examine expansion at multiple levels (e.g., 20, 50, 100 unique sequences).

2. **Clone size distribution**: The *clone_size* endpoint returns the size of each clone per individual, providing the raw distribution from which any summary statistic can be derived.

3. **CDR3 length**: The *cdr3_length_distribution* endpoint returns mean and standard deviation of CDR3 length (both amino acid and nucleotide) per individual. The *topX* CDR3 endpoints return average CDR3 lengths for the top 10, 100, and 1000 clones. The *cdr3_by_clone_size* endpoint returns mean and standard deviation of CDR3 length separately for expanded and non-expanded clones.

4. **Mutation counts and NS/S ratios**: The mutation endpoints return per-individual averages of mutation counts split by region (CDR, FW) and type (NS, S). The *mutation_cdr_rs_ratio* endpoint provides NS and S counts in CDR and FW regions separately, from which NS/S ratios are computed. The *mutation_rs_by_clone_size* endpoint provides the same breakdown stratified by clone expansion status.

5. **V gene usage**: The *v_gene_usage* endpoint returns clone count and total copies per V gene segment per individual.

**Measures computed client-side from API output:**

6. **Clonal diversity (Hill numbers)**: From the clone size distribution returned by the API, we computed Hill numbers of orders 0, 1, and 2 for each individual. Order 0 (^0^D) equals clone richness (number of clones). Order 1 (^1^D = exp(Shannon entropy)) represents the effective number of equally abundant clones. Order 2 (^2^D = 1/Simpson concentration) reflects the effective number of dominant clones, giving more weight to abundant clones [35, 36].

**Beyond this analysis.** Several endpoints already return variance measures directly — for example, `cdr3_length_distribution` and `cdr3_by_clone_size` return the standard deviation of CDR3 length per individual, enabling immediate comparison of within-individual variability across groups. Because IS-API returns per-individual measurements across arbitrary metadata groupings, researchers can use the output as the starting point for a wide range of additional downstream analyses beyond those presented here. The clone size distributions can be used to compute coefficient of variation across individuals within a group, test for differences in distributional shape (not just central tendency), or fit parametric models of clonal expansion. The per-individual mutation and CDR3 data enable correlation analyses between measures (e.g., whether individuals with higher mutation loads also have shorter CDR3 lengths), regression models incorporating multiple covariates (age, sex, disease stage), and longitudinal tracking when time-series metadata is available. Cross-stratified queries (e.g., tissue × disease stage × sex) enable factorial designs that test for interaction effects. In general, any statistical question that can be framed in terms of per-individual repertoire measurements across metadata-defined groups can be addressed using the IS-API output.

## Statistical Analysis

All statistical comparisons were performed in Python using SciPy. For comparisons across the six disease categories, we used the Kruskal-Wallis H test (a non-parametric test for comparing distributions across multiple groups). When the Kruskal-Wallis test was significant (p < 0.05), pairwise comparisons were performed using the Mann-Whitney U test with Bonferroni correction for multiple testing. Significance levels are indicated as: * p < 0.05, ** p < 0.01, *** p < 0.001. Only pairs with sufficient sample sizes (n >= 3 per group) were tested.

## Visualization

Figures were generated using both R (ggplot2, dplyr, tidyr, jsonlite) and Python (matplotlib, numpy). The JSON-format API outputs were parsed and visualized with consistent color coding across all figures: Severe (dark red, #b71c1c), Moderate (dark orange, #e65100), Mild (salmon, #ff7043), Recovered (green, #43a047), COVID Naive (light blue, #42a5f5), and Healthy (dark blue, #1565c0). Boxplots show median, interquartile range, and whiskers extending to 1.5 times the interquartile range. Individual data points are overlaid with small random jitter for visibility. Statistical significance brackets are shown above the boxplots where pairwise comparisons reached significance after Bonferroni correction.

\newpage

# Results

One of the main strengths of IS-API is that it enables researchers to conduct a high-level investigation of the available data and therefore refine their research questions — or at least become aware of potential pitfalls and weaknesses — before investing in detailed biological analysis. This investigation can be made through simple queries that execute within seconds through the IS-API metadata and statistical endpoints. In this section, we first present the metadata exploration that shaped our cohort, then report the cross-study clonal analysis of BCR repertoires across COVID-19 disease severities. All clonal analyses use blood-derived samples only, with individuals grouped into six harmonized disease categories: Severe (n=26), Moderate (n=9), Mild (n=30), Recovered (n=12), COVID Naive (n=8), and Healthy (n=9).

## Metadata Overview

In the first step, we used IS-API to query the metadata endpoint across all available databases. This immediately revealed the scope of data accessible through the tool: seven datasets totaling 121 individuals (**Metadata Figure 1**). The per-dataset breakdown shows that the largest study (CD1) contributes 51 individuals, while the smallest (CVX2) contributes 5.

![Metadata Figure 1. Sampling depth across studies. Left panel: number of subjects per dataset (bars). Right panel: sequencing depth (number of sequences) per subject within each dataset (dots). Study IDs: CD1–CD3 (COVID-19 cohorts), CVX1–CVX2 (vaccine cohorts), HC1 (healthy controls), GT1 (gut transplant).](../immunedb_STATS_API/metadata/plots/06_sampling_depth.png){ width=100% }

Examining the metadata completeness across datasets (**Metadata Figure 2**) revealed important differences. While all datasets provide tissue and disease stage information, not all provide age or sex metadata — for example, CD3 has 13 individuals with tissue and disease stage data but only 10 with age information and no sex data. This kind of metadata investigation, available within seconds through IS-API, immediately alerts the researcher to the limitations of cross-study comparisons involving multiple metadata dimensions.

![Metadata Figure 2. Metadata availability per dataset. Heatmap showing which metadata fields (tissue, disease stage, age, sex) are available for each individual across the seven datasets. Filled cells indicate data present; empty cells indicate missing data.](../immunedb_STATS_API/metadata/plots/00_metadata_per_dataset.png){ width=100% }

**Study selection and exclusions.** Based on the metadata overview, we excluded GT1 (pediatric gut transplant, n=15) from further analysis because it does not include COVID-19 disease stage metadata and represents a fundamentally different clinical context (pediatric transplant recipients). This left six COVID-19-related and healthy control datasets with 106 individuals.

**Disease category distribution.** Querying the disease_stage metadata field revealed 13 different raw disease labels across the six studies (**Metadata Figure 2**).

![Metadata Figure 3. Raw disease stage labels across studies. Bar chart showing the 13 original disease stage annotations as recorded in the source databases before harmonization. Each bar represents one label; colors indicate the contributing study. The Healthy group appears last.](../immunedb_STATS_API/metadata/plots/02_disease_stage_raw.png){ width=100% }

These were harmonized into six categories as described in Methods. The harmonized distribution (**Metadata Figure 3**) shows that the cohort is dominated by Mild (n=41) and Severe (n=27) individuals, with smaller groups of NA/Unknown (n=15), Recovered (n=12), Healthy (n=9), Moderate (n=9), and COVID Naive (n=8). The stacked bar visualization also shows the contribution of each original study and label to the harmonized categories — for example, the Severe group includes individuals labeled "severe" from CD2 and "Early phase hypoxaemia" from CD1, while the Recovered group spans four different original labels across three studies (CD1, CD2, CVX1, CVX2). The 15 individuals with NA/Unknown disease stage (from GT1 and some CD3 individuals) were excluded from the disease-stage analysis.

![Metadata Figure 4. Disease stage harmonization mapping. Stacked bar chart showing how the 13 raw disease labels were mapped to six harmonized categories (Severe, Moderate, Mild, Recovered, COVID Naive, Healthy). Colors represent original study labels; bar height shows the number of individuals per harmonized category. NA/Unknown individuals (n=15) shown separately.](../immunedb_STATS_API/metadata/plots/04_disease_harmonized_with_labels.png){ width=100% }

**Demographics.** To assess whether age and gender could be examined alongside disease stage, we queried these metadata fields simultaneously. The demographics scatter plot (**Metadata Figure 4**) displays each individual by their disease category and age, colored by dataset and shaped by sex (circle = male, triangle = female, X = missing). This figure immediately reveals several important features of the data:

- Severe and Mild individuals span a wide age range (20-88 years), while Recovered and COVID Naive individuals tend to be younger (20-50 years).
- The Healthy group has a moderate age range (23-58 years).
- Sex data is missing for several individuals in CD3 (shown as X markers), limiting sex-stratified analyses in those disease categories.
- The dataset of origin is not uniformly distributed across disease categories — CD1 dominates the Severe and Mild groups, while CVX1 and CVX2 dominate the Recovered and COVID Naive groups.

![Metadata Figure 5. Demographics scatter plot. Each dot represents one individual, positioned by disease category (x-axis) and age (y-axis). Colors indicate the source dataset; shapes indicate sex (circle = male, triangle = female, X = missing). Jitter applied to avoid overlap.](../immunedb_STATS_API/metadata/plots/05_demographics_scatter.png){ width=100% }

**Cross-stratification: disease, age, and sex.** The heatmap of individual counts across disease category, age group, and sex (**Metadata Figure 4**) provides a comprehensive view of which comparisons are statistically feasible. The Mild group has the most balanced distribution across age and sex, while the Moderate group has only females aged 66+ and males spanning all age groups. The Healthy group has predominantly males aged 31-65, and the COVID Naive group consists entirely of young adults (18-30). These imbalances must be considered when interpreting disease-stage comparisons, as they could confound biological differences with demographic ones — a point we address directly in the Confounder Analysis section (see Age and Gender Analysis in Results).

![Metadata Figure 6. Heatmap of individual counts across disease category, age group, and sex. Cell values show the number of individuals in each combination. Age groups: 18–30, 31–50, 51–65, 66+. Darker cells indicate more individuals. Empty cells represent combinations with no data, highlighting gaps that limit statistical power for stratified analyses.](../immunedb_STATS_API/metadata/plots/03e_heatmap_disease_age_sex.png){ width=100% }

## Clonal Diversity and Clone Count

To assess clonal diversity, we computed Hill numbers of orders 0 (richness), 1 (Shannon), and 2 (Simpson) from the clone size distribution of each individual. The diversity profiles (**Figure 1**) plot all three Hill numbers for each individual with group medians highlighted. All three diversity measures showed significant differences across disease categories (Kruskal-Wallis p < 0.001 for all three orders). The most striking pattern was that Mild and Recovered individuals had the lowest diversity across all three orders, while COVID Naive and Healthy individuals had the highest. Severe individuals showed intermediate diversity with high variability. The drop from Order 0 to Order 2 was steepest in disease groups (Severe, Moderate, Mild), indicating that these repertoires are dominated by a smaller number of large clones. In contrast, COVID Naive and Healthy individuals showed a more gradual decline, indicating a more even clone size distribution.

![Figure 1. Diversity profiles by disease stage. Each thin line represents one individual's Hill number profile from Order 0 to Order 2; thick lines show group medians. A steep drop indicates dominance by a few large clones; a gradual decline indicates a more even clone size distribution.](../immunedb_STATS_API/clonal_analysis/plots/18_diversity_profiles.png){ width=100% }

## Expanded Clones and Clone Size Distribution

**Expanded clone count.** We examined the number of expanded clones at three expansion thresholds: 20, 50, and 100 unique sequences per clone. At the lowest threshold (>20 unique sequences), 100% of individuals across all disease categories had at least one expanded clone, confirming that clonal expansion is a universal feature of BCR repertoires regardless of disease status. Raising the threshold to >50 unique sequences began to separate the groups: some individuals in the Mild and Recovered categories lost all expanded clones, while COVID Naive and Healthy individuals retained multiple expanded clones at this stricter cutoff. At the most stringent threshold (>100 unique sequences), the separation became more pronounced — COVID Naive individuals consistently maintained more highly expanded clones than all disease groups, and several Mild and Recovered individuals had none. This threshold-dependent pattern suggests that while low-level expansion is ubiquitous, sustained large-scale clonal expansion is more characteristic of non-disease repertoires.

**Clone size distribution.** The clone size distribution analysis (**Figure 2**) showed two complementary views. Panel A displayed the distribution of all individual clone sizes (log-transformed) as violin plots with overlaid boxplots, revealing that clone sizes were broadly similar across categories but with longer tails in the COVID Naive and Healthy groups. Panel B showed the median clone size per individual, which was significantly higher in COVID Naive individuals compared to the disease groups (Kruskal-Wallis p = 0.019).

![Figure 2. Clone size distribution by disease stage. Panel A: violin plots with overlaid boxplots of all individual clone sizes (log-transformed), showing the shape of each group's distribution. Panel B: median clone size per individual by disease category, with Kruskal-Wallis p-value annotated. Each dot represents one individual.](../immunedb_STATS_API/clonal_analysis/plots/20_clone_size_distribution.png){ width=100% }

**Clone size: unique sequences versus copies.** To understand the relationship between the two measures of clone size, we compared the number of unique sequences per clone with the total number of copies (raw reads) per clone (**Figure 3**). Panel A shows a strong positive correlation between unique sequences and copies across all disease categories, confirming that both measures capture the same underlying biological signal. Panel B shows the copy-to-unique ratio by disease stage — Mild individuals exhibited the highest and most variable ratios, while Recovered and COVID Naive individuals showed consistently low ratios. Panel C displays per-subject median values, revealing that disease groups (Severe, Moderate, Mild) tend to cluster with higher copy counts relative to unique sequences compared to non-disease groups.

![Figure 3. Clone size: copies versus unique sequences by disease stage. Panel A: scatter plot of copies (raw reads) vs. unique sequences per clone across all individuals and disease categories (log-log scale). Panel B: copy-to-unique ratio by disease stage. Panel C: per-subject median copies vs. median unique sequences, colored by disease category. Blood samples only.](../immunedb_STATS_API/clonal_analysis/plots/26_copies_vs_unique.png){ width=100% }

**Clonal concentration (Top X).** Querying the topX_clone_size_copies endpoint showed the fraction of total sequence copies accounted for by the top 10, 100, and 1000 clones (**Figure 4**), revealing the degree of oligoclonal dominance in each disease category.

![Figure 4. Clonal concentration: fraction of total sequence copies accounted for by the top 10, top 100, and top 1000 clones per individual, shown as stacked bars by disease stage. Higher values indicate greater oligoclonal dominance. Each bar represents one individual.](../immunedb_STATS_API/clonal_analysis/plots/02_topX_stacked_by_disease.png){ width=100% }

## Clone-Size-Stratified Analysis

Having established the clone size distribution and the expansion threshold of ≥20 unique sequences — chosen because at this threshold 100% of individuals across all disease categories retain at least one expanded clone (**Figure 2**, left panel), making it suitable for cross-group comparison — we next asked whether expanded and non-expanded clones differ in their molecular characteristics. IS-API's cdr3_by_clone_size and mutation_rs_by_clone_size endpoints enable this comparison directly, stratifying CDR3 length and mutation profiles by clone expansion status.

**CDR3 length by clone size.** Comparing CDR3 amino acid lengths between expanded clones (≥20 unique sequences) and non-expanded clones (<20 unique sequences) revealed that expanded clones tend to have shorter CDR3 regions (**Figure 5**). The difference was most pronounced in the Healthy group (expanded: 14.69 ± 1.49 AA vs. rest: 16.82 ± 1.14 AA). Among infected individuals, Severe cases exhibited the highest expanded-clone CDR3 lengths (17.99 ± 1.60 AA), closer to the non-expanded background, possibly reflecting recruitment of clones with diverse CDR3 structures during acute infection. Mild and Recovered individuals showed intermediate values, while COVID Naive individuals had expanded clones with CDR3 lengths similar to those observed in disease groups, consistent with vaccine-driven expansion of antigen-specific clones.

![Figure 5. CDR3 amino acid length by clone size and disease stage. Expanded clones (≥20 unique sequences, red) compared to non-expanded clones (<20, blue) across six disease categories. Error bars show standard deviation. Sample sizes annotated above each bar. Blood samples only; clone size threshold ≥20 unique sequences.](../immunedb_STATS_API/clonal_analysis/plots/09_cdr3_expanded_vs_rest.png){ width=100% }

**CDR3 length distribution: all clones versus expanded clones.** To place the expanded-clone CDR3 differences in context, we examined the full CDR3 length distribution per individual (**Figure 6**). Panels A and B show that across all clones, mean CDR3 length differed significantly across disease categories (Kruskal-Wallis p < 0.0001): Moderate individuals had the longest mean CDR3 lengths (median 17.8 AA), while Mild and Healthy individuals had shorter CDR3 (median ~17.0 AA). The standard deviation of CDR3 length also varied (p = 0.0009), with Severe individuals showing the highest within-individual variability. Panels C and D restrict the analysis to expanded clones (≥20 unique sequences). The disease-stage differences became more pronounced (Kruskal-Wallis p = 0.0008 for both mean and SD): Healthy individuals showed dramatically shorter expanded-clone CDR3 lengths (median 14.4 AA) compared to disease groups (16–18 AA), and Severe individuals had the highest expanded-clone CDR3 variability (median SD ~4.5 AA), suggesting a more structurally diverse set of expanded clones during acute infection.

![Figure 6. CDR3 amino acid length distribution by disease stage. Panels A–B: all clones — mean CDR3 length (A) and standard deviation (B) per individual. Panels C–D: expanded clones only (≥20 unique sequences) — mean CDR3 length (C) and standard deviation (D). Each dot represents one individual; boxplots show median and IQR. Kruskal-Wallis p-values annotated. Blood samples only.](../immunedb_STATS_API/clonal_analysis/plots/22_cdr3_length_distribution.png){ width=100% }

## CDR3 and Mutation Properties of Dominant Clones

**CDR3 length in dominant clones.** The CDR3 endpoint returned the average CDR3 length (in amino acids) of the top 10 clones per individual (**Figure 7**), along with the range of CDR3 lengths (**Figure 8**). These figures characterize the antigen-binding loop properties of the most expanded clones across disease categories.

![Figure 7. Mean CDR3 amino acid length of the top 10 clones per individual, grouped by disease stage. Each dot represents one individual; boxplots show median and IQR. CDR3 length reflects the antigen-binding loop size of the most expanded clones.](../immunedb_STATS_API/clonal_analysis/plots/03_cdr3_by_disease.png){ width=100% }

![Figure 8. CDR3 length range (max minus min amino acid length) of the top 10 clones per individual, grouped by disease stage. Larger ranges indicate greater CDR3 structural heterogeneity among the dominant clones.](../immunedb_STATS_API/clonal_analysis/plots/04_cdr3_range_by_disease.png){ width=100% }

**Selection pressure and mutation profile (NS/S ratios).** To analyze selection pressure and mutation burden, we computed NS/S ratios separately for CDR and framework (FW) regions across all clones and stratified by clone expansion status (**Figure 8**).

![Figure 9. Somatic hypermutation: NS/S ratios and mutation counts by disease stage. Top row (all clones): Panel A — CDR NS/S ratio per individual; Panel B — FW NS/S ratio (same y-axis scale as A); Panel C — average NS and S mutation counts as stacked bars for CDR and FW regions. Bottom row (expanded vs. rest): Panel D — CDR NS/S ratio for expanded (red, ≥20 unique sequences) versus non-expanded clones (blue, <20); Panel E — FW NS/S ratio (same y-axis scale as D); Panel F — average NS and S mutation counts by region and expansion group. Boxplots show median and IQR; dashed line marks NS/S = 1.0. Kruskal-Wallis p-values annotated. Blood samples only.](../immunedb_STATS_API/clonal_analysis/plots/21_mutations_rs_ratio.png){ width=100% }

Across all clones (Panels A–C), CDR NS/S ratios were consistently above 1.0 in all disease categories, confirming positive selection in antigen-binding regions. The Kruskal-Wallis test revealed significant differences across groups (p < 0.0001): Mild, Recovered, and COVID Naive individuals had higher median CDR NS/S ratios (~3.0–3.2), suggesting stronger positive selection, while Severe (2.66) and Moderate (2.03) cases showed lower ratios. FW NS/S ratios (Panel B) were markedly lower than CDR ratios (~1.4–1.6) and did not differ significantly across disease categories (p = 0.92), consistent with purifying selection maintaining framework structural integrity. The shared y-axis scale between Panels A and B makes this CDR–FW contrast immediately apparent.

When stratified by clone expansion status (Panels D–F), expanded clones showed lower CDR NS/S ratios than non-expanded clones in disease groups (e.g., Moderate expanded: 1.33 vs. rest: ~3.0), while maintaining higher FW NS/S ratios (Moderate expanded: 1.91 vs. rest: ~1.6). This pattern suggests that expanded clones accumulate proportionally more synonymous mutations in CDR regions — possibly reflecting ongoing somatic hypermutation — while their framework regions tolerate more replacement mutations than non-expanded clones. Panels C and F show that expanded clones carry substantially higher absolute mutation counts (10–60 average mutations) compared to non-expanded clones (2–8), confirming extensive somatic hypermutation in clonally expanded populations across all disease stages.

## V Gene Usage

To examine whether disease stage influences V gene segment usage, we analyzed the frequency of V genes across individuals using a heatmap (**Figure 10**).

![Figure 10. V gene usage heatmap by disease stage. Color intensity represents mean frequency of each V gene segment across individuals in each disease category. Only V genes present at ≥1% frequency in ≥85% of individuals are shown (16 genes). Rows: V gene segments; columns: disease categories.](../immunedb_STATS_API/clonal_analysis/plots/23_v_gene_usage_heatmap.png){ width=100% }

V genes were included if they were present at 1% or higher frequency in at least 85% of individuals, resulting in 16 V genes that met this criterion.

The heatmap revealed that certain V genes were consistently used at high frequency across all disease categories (e.g., IGHV4-34, IGHV3-23, IGHV4-59), reflecting the known preferential usage of these gene segments in human BCR repertoires. Visual inspection did not reveal strong disease-specific V gene usage patterns, suggesting that V gene usage is relatively stable across disease states and is more reflective of underlying germline genetics than disease-driven selection. This observation is consistent with the known stability of V gene usage across individuals and conditions [37].

## Age and Gender as Potential Confounders

To assess whether age or gender could confound the disease-stage comparisons, we examined three key metrics — clone count, mean CDR3 length, and CDR NS/S ratio — in relation to age and gender. For this analysis, three healthy individuals from CD3 (H3, H4, H8) were excluded because they lacked age and sex metadata.

![Figure 11. Clonal metrics versus age by disease stage. Panel A: clone count (log scale) vs. age. Panel B: mean CDR3 length vs. age. Panel C: CDR NS/S ratio vs. age. Each dot represents one individual, colored by disease category. Three CD3 healthy individuals (H3, H4, H8) excluded due to missing age/sex metadata.](../immunedb_STATS_API/clonal_analysis/plots/24_metrics_vs_age.png){ width=100% }

**Age (**Figure 11**).** Scatter plots of each metric against age showed no strong linear trends within any disease category. Clone count (Panel A, log scale) showed substantial variation within age groups but no systematic increase or decrease with age. Mean CDR3 length (Panel B) was similarly independent of age. The CDR NS/S ratio (Panel C) showed no age-dependent trend. These results suggest that age is not a major confounder in our disease-stage comparisons, though the limited age range within some disease categories (particularly Severe, where older individuals predominate) limits the power of this assessment.

![Figure 12. Clonal metrics by gender and disease stage. Panel A: clone count (log scale). Panel B: mean CDR3 length. Panel C: CDR NS/S ratio. Boxplots compare male and female individuals within each disease category.](../immunedb_STATS_API/clonal_analysis/plots/25_metrics_vs_gender.png){ width=100% }

**Gender (**Figure 12**).** Boxplots comparing male and female individuals within each disease category showed no systematic differences in clone count (Panel A, log scale), mean CDR3 length (Panel B), or CDR NS/S ratio (Panel C). The lack of sex-based differences is consistent with the literature for peripheral blood BCR repertoires, though our sample sizes within each sex-disease combination are limited, and subtle differences cannot be ruled out.

## Sex-Stratified Analysis

By combining disease_stage and sex metadata filters in a single query, IS-API enabled examination of mutation levels (**Figure 13**) and CDR3 lengths (**Figure 14**) in the top 10 clones, stratified by both sex and disease category. This demonstrates the API's ability to perform intersectional queries across multiple metadata dimensions.

![Figure 13. Mutation level in top 10 clones stratified by sex and disease stage. Male and female individuals compared within each disease category. Demonstrates IS-API's ability to perform intersectional queries across multiple metadata dimensions in a single API call.](../immunedb_STATS_API/clonal_analysis/plots/12_mutation_top10_by_sex_disease.png){ width=100% }

![Figure 14. CDR3 length in top 10 clones stratified by sex and disease stage. Mean CDR3 amino acid length of the top 10 clones per individual, grouped by sex within each disease category.](../immunedb_STATS_API/clonal_analysis/plots/13_cdr3_top10_by_sex_disease.png){ width=100% }

## Within-Individual Cross-Tissue Analysis

IS-API's ability to query across multiple tissue types within the same individual provides a unique capability for studying tissue-specific repertoire characteristics. For individuals with samples from multiple tissues (e.g., blood and bone marrow in HC1, or blood and lung in CD1), we compared clone counts (**Figure 15**), clone sizes (**Figure 16**), and paired tissue measurements (**Figure 17**) within the same individual.

![Figure 15. Within-individual clone count across tissues. For individuals with samples from multiple tissues (e.g., blood and bone marrow in HC1, blood and lung in CD1), clone counts are compared across tissue types within the same individual.](../immunedb_STATS_API/clonal_analysis/plots/14_within_subject_clone_count.png){ width=100% }

![Figure 16. Within-individual clone size across tissues. Clone size distributions compared between different tissue types within the same individual across studies.](../immunedb_STATS_API/clonal_analysis/plots/15_within_subject_clone_size_cross_study.png){ width=100% }

![Figure 17. Within-individual tissue comparison using paired line plots. Lines connect measurements from different tissues within the same individual, illustrating tissue-specific repertoire differences. Each line represents one individual sampled from multiple tissues.](../immunedb_STATS_API/clonal_analysis/plots/16_within_subject_tissue_lines.png){ width=100% }

This within-individual comparison revealed that clone counts and sizes can differ substantially between tissues in the same individual, highlighting the importance of specifying tissue type when making cross-study comparisons. The observation that bone marrow and blood repertoires from the same individual can have different clonal profiles is consistent with the known compartmentalization of B cell populations [34, 41].

\newpage

# Discussion and Conclusions

## IS-API as a Tool for Cross-Study Repertoire Analysis

Large datasets have become essential in computational immunology, revealing patterns and trends that smaller, individual studies often miss. Recent high-throughput sequencing studies of B cell repertoires have shown promise in describing immune system dynamics across various conditions [6, 40]. However, these studies frequently face limitations due to incomplete metadata, inconsistent data formatting, and the practical difficulty of combining datasets from different laboratories and sequencing platforms.

IS-API addresses these challenges by providing a unified interface for querying multiple ImmuneDB database instances simultaneously. The tool operates on two levels — metadata exploration and biological data analysis — enabling researchers to first understand the scope and limitations of available data before conducting statistical comparisons. This two-level approach is a key strength: by first querying metadata, researchers can identify potential confounders (such as uneven age or sex distributions), recognize missing data, and design their analyses accordingly.

The CTE-based query architecture introduced in version 0.3.0 represents a significant technical improvement. By ensuring correct per-individual, per-tissue aggregation, it eliminates a class of errors that can arise when individuals have different numbers of samples or when multiple tissue types are present. This is particularly important for cross-study analyses where sample structures vary across studies.

Compared to existing tools for cross-study immune repertoire analysis, IS-API offers several advantages. The iReceptor Gateway [16, 17] provides federated access to AIRR-seq data but operates at the sequence level rather than the clone level, making it difficult to perform clonal analyses. The AIRR Data Commons API [25] provides standardized access to repertoire metadata but does not compute statistical summaries. The Immcantation Framework [21] provides sophisticated analysis tools but requires substantial preprocessing to combine data from different sources. IS-API fills the gap between data access and analysis by providing pre-computed, clone-level statistical summaries across multiple databases through a simple REST interface.

A limitation of IS-API is that it currently operates on pre-built ImmuneDB databases, meaning that researchers must first process their data through the ImmuneDB pipeline. Future work should explore integration with other database formats and with the broader AIRR Data Commons ecosystem. Additionally, while IS-API handles dozens of databases and hundreds of individuals efficiently, scaling to thousands of individuals may require optimization of database queries and potentially distributed computing approaches.

## COVID-19 Clonal Analysis: Biological Insights

The cross-study clonal analysis of BCR repertoires across COVID-19 disease severities revealed several notable patterns.

**Clonal diversity decreases in actively diseased individuals.** The Hill number analysis showed that individuals with Mild and Recovered COVID-19 had significantly lower clonal diversity than COVID Naive and Healthy individuals across all three diversity orders. This likely reflects the focusing of the B cell repertoire during and following an active immune response — antigen-driven clonal expansion leads to the dominance of a smaller number of clones, reducing overall diversity. The finding that Recovered individuals still show reduced diversity suggests that repertoire focusing persists beyond the acute phase of infection. Similar observations of reduced diversity during active immune responses have been reported in individual studies [28, 32].

Interestingly, Severe individuals showed intermediate diversity with high variability. This could reflect the heterogeneous nature of severe COVID-19, which encompasses both individuals mounting strong but dysregulated immune responses (with low diversity) and individuals whose severe disease results from a failure to mount effective clonal expansion (with preserved but ineffective diversity).

**NS/S ratios indicate ongoing selection in disease states.** The CDR NS/S ratios above 1.0 across all disease categories confirm that positive selection is active in CDR regions, consistent with antigen-driven affinity maturation. The tendency for Mild individuals to show higher CDR NS/S ratios could indicate more efficient germinal center responses with stronger selection for improved antigen binding. In contrast, the more variable NS/S ratios in Severe individuals may reflect disrupted germinal center activity, which has been reported in severe COVID-19 [39]. The framework NS/S ratios being lower than CDR ratios, yet still above 1.0, suggest some degree of structural adaptation beyond simple conservation.

**CDR3 length varies with disease severity.** The observation that Moderate individuals had the longest CDR3 lengths, while Mild and Healthy individuals had shorter CDR3 lengths, is consistent with the known association between longer CDR3 loops and broadly neutralizing antibody responses [11]. Longer CDR3 regions can form more complex antigen-binding structures, potentially enabling recognition of diverse viral epitopes. The higher CDR3 length variability in Severe individuals may reflect a less focused, more heterogeneous response.

**V gene usage is relatively stable across disease states.** The lack of strong disease-specific V gene usage patterns is consistent with findings from large-scale repertoire studies showing that V gene usage is primarily determined by germline genetics rather than by antigen exposure or disease state [37, 6]. While specific antibody lineages targeting SARS-CoV-2 epitopes may preferentially use certain V genes [38], these represent a small fraction of the total repertoire and may not be detectable at the level of overall V gene frequency.

**Age and gender are not major confounders.** The lack of strong age or gender effects on clonal metrics within disease categories suggests that the observed differences between disease stages are not primarily driven by demographic confounders. However, this conclusion must be tempered by the limited sample sizes within each age-sex-disease combination and the uneven age distribution across disease categories (severe COVID-19 disproportionately affects older individuals).

## Limitations

Several limitations should be acknowledged. First, the cohort is heterogeneous in terms of sequencing platforms, library preparation methods, and sample processing across studies. While IS-API standardizes the analysis, upstream differences could introduce systematic biases. Second, the clone definition (based on shared V gene, J gene, and CDR3 similarity) may not perfectly capture biological clones across different analysis pipelines. Third, the threshold of 20 or more unique sequences for clone inclusion means that rare clones are excluded, which may bias diversity estimates. Fourth, the sample sizes within some disease categories (particularly Moderate with n=9 and COVID Naive with n=8) are small, limiting statistical power. Fifth, the Recovered group includes both naturally recovered and vaccine-recovered individuals, which may have different repertoire characteristics. Future work should aim to analyze these subgroups separately with larger cohorts.

## Conclusions

IS-API version 0.3.0 provides a practical and efficient tool for cross-study B cell repertoire analysis. By integrating metadata exploration with clone-level statistical queries across multiple databases, it enables researchers to conduct meta-analyses that would otherwise require substantial manual effort in data harmonization and processing. The COVID-19 analysis presented here demonstrates that cross-study approaches can reveal reproducible patterns in repertoire diversity, mutation, and CDR3 characteristics across disease severities — patterns that are consistent with known immunological mechanisms but are strengthened by the larger sample sizes achievable through data integration.

The tool and its cross-study analytical framework can be applied to any disease context where multiple AIRR-seq datasets are available, providing a template for systematic repertoire comparison. Future development will focus on expanding the range of statistical endpoints, improving scalability, and integrating with the broader AIRR Data Commons ecosystem to maximize the utility of the growing body of immune repertoire sequencing data.

\newpage

# References

1. Paul, W. E. (2013). *Fundamental Immunology*. Philadelphia: Wolters Kluwer Health/Lippincott Williams & Wilkins.

2. Burnet, F. M. (1957). A modification of Jerne's theory of antibody production using the concept of clonal selection. *Australian Journal of Science*, 20, 67-69.

3. Di Noia, J. M., & Neuberger, M. S. (2007). Molecular mechanisms of antibody somatic hypermutation. *Annual Review of Biochemistry*, 76, 1-22.

4. Schwartz, G. W., & Hershberg, U. (2013). Germline amino acid diversity in B cell receptors is a good predictor of somatic selection pressures. *Frontiers in Immunology*, 4, 79.

5. Hershberg, U., & Prak, E. T. L. (2015). The analysis of clonal expansions in normal and autoimmune B cell repertoires. *Philosophical Transactions of the Royal Society B*, 370(1676), 20140239.

6. Briney, B., Inderbitzin, A., Joyce, C., & Burton, D. R. (2019). Commonality despite exceptional diversity in the baseline human antibody repertoire. *Nature*, 566, 393-397.

7. Yuuki, H., Itamiya, T., Nagafuchi, Y., Ota, M., & Fujio, K. (2024). B cell receptor repertoire abnormalities in autoimmune disease. *Frontiers in Immunology*, 15.

8. Victora, G. D., & Nussenzweig, M. C. (2012). Germinal centers. *Annual Review of Immunology*, 30, 429-457.

9. Kim, D., & Park, D. (2019). Deep sequencing of B cell receptor repertoire. *BMB Reports*, 52(9), 540-547.

10. Xu, J. L., & Davis, M. M. (2000). Diversity in the CDR3 region of VH is sufficient for most antibody specificities. *Immunity*, 13(1), 37-45.

11. Saada, R., Weinberger, M., Shahaf, G., & Mehr, R. (2007). Models for antigen receptor gene rearrangement: CDR3 length. *Immunology and Cell Biology*, 85, 323-332.

12. Hershberg, U., Uduman, M., Shlomchik, M. J., & Kleinstein, S. H. (2008). Improved methods for detecting selection by mutation analysis of Ig V region sequences. *International Immunology*, 20(5), 683-694.

13. Yaari, G., Benichou, J. I., Vander Heiden, J. A., Kleinstein, S. H., & Louzoun, Y. (2015). The mutation patterns in B-cell immunoglobulin receptors reflect the influence of selection acting at multiple time-scales. *Philosophical Transactions of the Royal Society B*, 370(1676), 20140242.

14. Glanville, J., Zhai, W., Berka, J., et al. (2009). Precise determination of the diversity of a combinatorial antibody library gives insight into the human immunoglobulin repertoire. *Proceedings of the National Academy of Sciences*, 106(48), 20216-20221.

15. Marks, C., & Deane, C. M. (2020). How repertoire data are changing antibody science. *Journal of Biological Chemistry*, 295(29), 9823-9837.

16. Corrie, B. D., et al. (2018). iReceptor: a platform for querying and analyzing antibody/B-cell and T-cell receptor repertoire data across federated repositories. *Immunological Reviews*, 284, 24-41.

17. iReceptor Gateway. https://gateway.ireceptor.org

18. Guo, Y., Chen, K., Kwong, P. D., Shapiro, L., & Sheng, Z. (2019). cAb-Rep: a database of curated antibody repertoires for exploring B cell response and predicting antibody prevalence. *Frontiers in Immunology*, 10, 2365.

19. Olsen, T. H., Boyles, F., & Deane, C. M. (2022). Observed Antibody Space: A diverse database of cleaned, annotated, and translated unpaired and paired antibody sequences. *Protein Science*, 31, 141-146.

20. Vander Heiden, J. A., et al. (2018). AIRR Community Standardized Representations for Annotated Immune Repertoires. *Frontiers in Immunology*, 9, 2206.

21. Gupta, N. T., Vander Heiden, J. A., Uduman, M., Gadala-Maria, D., Yaari, G., & Kleinstein, S. H. (2015). Change-O: a toolkit for analyzing large-scale B cell immunoglobulin repertoire sequencing data. *Bioinformatics*, 31, 3356-3358.

22. Bolotin, D., Poslavsky, S., Mitrophanov, I., et al. (2015). MiXCR: software for comprehensive adaptive immunity profiling. *Nature Methods*, 12, 380-381.

23. Ye, J., Ma, N., Madden, T. L., & Ostell, J. M. (2013). IgBLAST: an immunoglobulin variable domain sequence analysis tool. *Nucleic Acids Research*, 41(W1), W34-W40.

24. Rosenfeld, A. M., Meng, W., Luning Prak, E. T., & Hershberg, U. (2017). ImmuneDB: a system for the analysis and exploration of high-throughput adaptive immune receptor sequencing data. *Bioinformatics*, 33(2), 292-293.

25. Christley, S., et al. (2020). The ADC API: a web API for the programmatic query of the AIRR Data Commons. *Frontiers in Big Data*, 3, 22.

26. Rubelt, F., Busse, C. E., Bukhari, S. A. C., et al. (2017). Adaptive immune receptor repertoire community recommendations for sharing immune-repertoire sequencing data. *Nature Immunology*, 18(12), 1274-1278.

27. Lambert, M., Surhone, L., Tennoe, M. T., & Henssonow, S. F. (2010). *Node.js*. Betascript Publishing.

28. Hoehn, K. B., et al. (2021). Cutting Edge: Distinct B Cell Repertoires Characterize Patients with Mild and Severe COVID-19. *Journal of Immunology*, 206(12), 2785-2790.

29. Kuri-Cervantes, L., Pampena, M. B., Meng, W., et al. (2020). Immunologic perturbations in severe COVID-19/SARS-CoV-2 infection. *bioRxiv*.

30. Montague, Z., et al. (2020). Dynamics of B-cell repertoires and emergence of cross-reactive responses in COVID-19 patients with different disease severity. *ArXiv*, arXiv:2007.06762v1.

31. Nielsen, S. C. A., Yang, F., Hoh, R. A., et al. (2020). B cell clonal expansion and convergent antibody responses to SARS-CoV-2. *Research Square*.

32. Galson, J. D., et al. (2020). Deep Sequencing of B Cell Receptor Repertoires From COVID-19 Patients Reveals Strong Convergent Immune Signatures. *Frontiers in Immunology*, 11, 605170.

33. Goel, R. R., et al. (2021). Distinct antibody and memory B cell responses in SARS-CoV-2 naïve and recovered individuals following mRNA vaccination. *Science Immunology*, 6(58), eabi6950.

34. Meng, W., Zhang, B., Schwartz, G. W., et al. (2017). An atlas of B-cell clonal distribution in the human body. *Nature Biotechnology*, 35, 879-884.

35. Tuomisto, H. (2010). A consistent terminology for quantifying species diversity? Yes, it does exist. *Oecologia*, 164, 853-860.

36. Schwartz, G. W., & Hershberg, U. (2013). Conserved variation: identifying patterns of stability and variability in BCR and TCR V genes with different diversity and richness metrics. *Physical Biology*, 10(3), 035005.

37. Yang, X., Wang, M., Wu, J., et al. (2021). Large-scale analysis of 2,152 Ig-seq datasets reveals key features of B cell biology and the antibody repertoire. *Cell Reports*, 35(6), 109110.

38. Robbiani, D. F., Gaebler, C., Muecksch, F., et al. (2020). Convergent antibody responses to SARS-CoV-2 in convalescent individuals. *Nature*, 584, 437-442.

39. Kaneko, N., Kuo, H. H., Boucau, J., et al. (2020). Loss of Bcl-6-expressing T follicular helper cells and germinal centers in COVID-19. *Cell*, 183(1), 143-157.

40. Soto, C., Bombardi, R. G., Branchizio, A., et al. (2019). High frequency of shared clonotypes in human B cell receptor repertoires. *Nature*, 566, 398-402.

41. Stern, J. N. H., et al. (2014). B cells populating the multiple sclerosis brain mature in the draining cervical lymph nodes. *Science Translational Medicine*, 6, 248ra107.

42. Gaebler, C., Wang, Z., Lorenzi, J. C. C., et al. (2021). Evolution of antibody immunity to SARS-CoV-2. *Nature*, 591, 639-644.

43. Henry, C., Zheng, N. Y., Huang, M., et al. (2019). Influenza Virus Vaccination Elicits Poorly Adapted B Cell Responses in Elderly Individuals. *Cell Host & Microbe*, 25, 357-366.

44. Matsumoto, R., Gray, J., Rybkina, K., et al. (2023). Induction of bronchus-associated lymphoid tissue is an early life adaptation for promoting human B cell immunity. *Nature Immunology*, 24, 1370-1381.

45. Yaari, G., & Kleinstein, S. H. (2015). Practical guidelines for B-cell receptor repertoire sequencing analysis. *Genome Medicine*, 7, 121.

46. Nielsen, S. C. A., Roskin, K. M., Jackson, K. J. L., et al. (2019). Shaping of infant B cell receptor repertoires by environmental factors and infectious disease. *Science Translational Medicine*, 11(481), eaat2004.

47. Fu, J., Hsiao, T., Waffarn, E., et al. (2023). Dynamic establishment and maintenance of the human intestinal B cell population and repertoire following transplantation. *medRxiv*, 2023.11.15.23298517.

48. Pejoski, D., Cuesta-Zuluaga, J., Gkoukou, E., et al. (2023). nf-core/airrflow: An adaptive immune receptor repertoire analysis workflow. *Bioinformatics*. https://github.com/nf-core/airrflow

49. Goel, R. R., Painter, M. M., Apostolidis, S. A., et al. (2021). mRNA vaccines induce durable immune memory to SARS-CoV-2 and variants of concern. *Science*, 374(6572), abm0829.
