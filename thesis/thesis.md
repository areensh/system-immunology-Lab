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

To demonstrate the power of IS-API, I present here a two-part analysis. First, I show the tool's metadata querying and cross-study exploration capabilities across six COVID-19-related and healthy control studies encompassing 106 blood-derived repertoires from 94 individuals. Second, I conduct a comparative clonal analysis of B cell receptor (BCR) repertoires across six disease categories — Severe, Moderate, Mild, Recovered, COVID Naive, and Healthy — examining clonal diversity (Hill numbers), clone size distributions, somatic hypermutation patterns (non-synonymous to synonymous ratios), CDR3 length distributions, V gene usage, and potential confounding by age and gender. Statistical comparisons employ Kruskal-Wallis tests across all groups with pairwise Mann-Whitney U tests and Bonferroni correction. This analysis reveals significant differences in clonal diversity and mutation patterns across disease severities, demonstrating both the biological insights and the practical utility of cross-study repertoire analysis with IS-API.

\newpage

# List of Tables

**Table 1.** Studies included in the analysis with individual metadata.

**Table 2.** IS-API metadata endpoints and example queries.

**Table 3.** IS-API biological/statistical endpoints and example queries.

**Table 4.** Disease stage harmonization across studies.

**Table 5.** Individual counts per harmonized disease category.

\newpage

# List of Figures

## Methods Figures

**Methods Figure 1.** IS-API pipeline: from raw DNA sequences to cross-study analysis.

**Methods Figure 2.** IS-API system architecture: client queries fan out to multiple ImmuneDB instances.

**Methods Figure 3.** Three-tier analysis approach: metadata, biological-statistical measurements, and specific biological questions.

## Part 1: IS-API Tool Capabilities

**Figure 1.** Clone count distribution by disease stage across all studies.

**Figure 2.** Fraction of top X clones out of total copies per individual by disease stage.

**Figure 3.** CDR3 length distribution by disease stage for top clones.

**Figure 4.** CDR3 length range by disease stage.

**Figure 5.** Total mutation level by disease stage.

**Figure 6.** Mutation level gradient across clone size ranks by disease stage.

**Figure 7.** CDR and FW region mutations by disease stage.

**Figure 8.** NS/S ratio by disease stage (overview).

**Figure 9.** Clone size distribution overview by disease stage.

**Figure 10.** Expanded clone count by disease stage.

**Figure 11.** Expanded clone size by disease stage.

**Figure 12.** Mutation level in top 10 clones by sex and disease stage.

**Figure 13.** CDR3 length in top 10 clones by sex and disease stage.

**Figure 14.** Within-individual clone count across tissues (cross-study comparison).

**Figure 15.** Within-individual clone size across tissues (cross-study comparison).

**Figure 16.** Within-individual tissue comparison (paired line plots).

## Part 2: COVID-19 Clonal Analysis

**Figure 17.** Clonal diversity: Hill numbers (Order 0, 1, 2) by disease stage.

**Figure 18.** Diversity profiles by disease stage.

**Figure 19.** Number of expanded clones at different expansion thresholds by disease stage.

**Figure 20.** Clone size distribution by disease stage (violin + boxplot and per-individual median).

**Figure 21.** Mutation analysis: NS/S ratio by region and disease stage.

**Figure 22.** CDR3 length distribution (mean and SD) by disease stage.

**Figure 23.** V gene usage heatmap by disease stage.

**Figure 24.** Clonal metrics versus age by disease stage.

**Figure 25.** Clonal metrics by gender and disease stage.

\newpage

# Introduction

## B Cell Repertoire and Diversity

The adaptive immune system eliminates infections from the body and provides protection against re-infection upon subsequent encounters with the same pathogen. Key players of the adaptive immune system are B lymphocytes, which diversify their receptors through genetic rearrangement and, consequently, are able to recognize virtually any foreign antigen they encounter [@Paul2013]. During development in the bone marrow, B cells undergo rearrangement of Variable (V), Diversity (D), and Joining (J) gene segments to create a wide diversity of B cell receptors (BCRs). According to the clonal selection theory [@Burnet1957], all receptors expressed by the same B cell share the same unique antigen-binding site. During an immune response, B cells undergo rapid cycles of proliferation and targeted somatic hypermutation (SHM) in both heavy (H) chain and light (L) chain variable region genes [@DiNoia2007]. This process, termed affinity maturation, occurs within germinal centers and results in B cells with improved antigen binding affinity, leading to the creation of a diverse repertoire of clones — defined as a set of B cells derived from a single progenitor cell sharing a specific V(D)J rearrangement [@Schwartz2013; @Hershberg2015].

The diversity of the immune repertoire is extremely high, with an estimated 10^11 different BCRs existing in a single individual [@Briney2019]. While it is clear that the diversity of the immune system is fundamental to its function [@Paul2013], the actual forms that immune repertoire diversity takes, in health and disease, have not been fully characterized [@Schwartz2013]. Analyzing B cell repertoires helps understand how the immune system responds to infections, vaccinations, and diseases including cancer and autoimmune disorders [@Yuuki2024]. Insights from repertoire studies guide the design of more effective vaccines by identifying specific mutations and the structural features of reactive antibody regions [@Victora2012]. Additionally, tracking B cell repertoire changes and identifying characteristic patterns can be used for disease diagnosis, monitoring disease progression, predicting severity, and tailoring personalized treatments [@Kim2019].

The antibody molecule consists of two identical heavy chains and two identical light chains. Each chain contains a variable region responsible for antigen recognition and a constant region that determines the antibody class (isotype). The variable region contains three complementarity-determining regions (CDR1, CDR2, CDR3) interspersed with four framework regions (FW1-FW4). The CDR3 region, formed at the junction of V, D, and J gene segments, is the most variable portion of the antibody and plays a central role in antigen binding specificity [@Xu2000]. The length and amino acid composition of the CDR3 loop directly influence the range of antigens an antibody can recognize [@Saada2007]. During affinity maturation, somatic hypermutation introduces point mutations primarily in the variable region, with a higher rate of non-synonymous (replacement) mutations in CDR regions reflecting positive selection for improved antigen binding, while framework regions tend to accumulate fewer replacement mutations to preserve structural integrity [@Hershberg2008; @Yaari2015].

## Repertoire Studies, Data Analysis, and Sharing

In the past few decades, many techniques have been developed for B cell repertoire AIRR sequence studies, allowing for detailed analysis of BCR diversity at an unprecedented scale [@Kim2019]. High-throughput BCR repertoire sequencing was first described by Glanville et al. in 2009 [@Glanville2009], and since then the volume of available data has increased exponentially [@Marks2020]. Recently, significant efforts have been made to move beyond the model where most AIRR-seq data are stored and curated by individual laboratories [@Corrie2018; @iReceptor].

A variety of tools, software platforms, and algorithms have been developed to store and analyze sequencing data [@Guo2019; @Olsen2022]. Data sharing fosters collaboration among researchers, enabling cross-study comparisons and accelerating discoveries. Sharing raw and processed data ensures that results can be validated and reproduced by other researchers, avoiding duplication of effort and maximizing the use of available data. Several public repositories and databases — including NCBI's Sequence Read Archive (SRA), the Immune Epitope Database (IEDB), and the iReceptor Gateway [@iReceptor] — provide platforms for storing and sharing B cell repertoire data.

The Adaptive Immune Receptor Repertoire (AIRR) Community has developed standards and protocols to facilitate data sharing and interoperability among different databases [@VanderHeiden2018]. Despite their contributions, these platforms still have challenges that limit B cell repertoire studies and data sharing. Technical challenges include sequencing errors and sample bias due to sampling methods. Data sharing challenges include the lack of uniform standards for data formatting and annotation, which can limit the integration and comparison of datasets from different studies. For example, the iReceptor Gateway provides an excellent platform for collecting, accessing, and standardizing annotated sequences from many different studies [@Corrie2018], but it lacks clonal definitions that can be associated with metadata and therefore does not support queries at the clone level. Many of these tools collect data across multiple studies but do not give the researcher the ability to investigate associated metadata alongside biological measures.

Several computational tools have been developed for repertoire analysis. The Immcantation Framework [@Gupta2015] provides sophisticated packages for defining and analyzing clones and building lineage trees. MiXCR [@Bolotin2015] offers comprehensive adaptive immunity profiling from raw sequences. IgBLAST [@Ye2013] enables immunoglobulin variable domain sequence analysis. More recently, nf-core/airrflow [@airrflow] has introduced a standardized Nextflow pipeline for AIRR-seq data processing, providing reproducible workflows from raw reads to annotated repertoires. While these tools enable researchers to perform various queries and analyses on individual datasets, they do not natively support queries across multiple databases that characterize repertoire diversity across many studies simultaneously.

We have previously developed ImmuneDB [@Rosenfeld2017], a relational database and pipeline to store and analyze B and T cell receptor high-throughput sequencing data. ImmuneDB integrates annotation, clonal assignment, mutation analysis, and basic statistical measures into a unified database structure. However, like other single-database tools, it does not enable researchers to make queries that characterize repertoire diversity across many studies or to investigate multiple metadata dimensions simultaneously.

## IS-API: Cross-Study Repertoire Analysis

Building on the ImmuneDB infrastructure, I have designed and implemented the multi-immune database statistics application programming interface (IS-API), aligned with the AIRR Data Commons (ADC) API [@Christley2020]. IS-API allows researchers to make queries across experiments and across laboratories, taking advantage of the global reach of AIRR-seq. Researchers can characterize multiple datasets or subset repertoires therein for their mutation levels, clone size, selection patterns, diversity measures, and metadata composition — all through a unified programmatic interface.

IS-API version 0.3.0 introduces several key improvements over earlier versions. Most importantly, it employs Common Table Expression (CTE)-based SQL queries (referred to as sampleMetaCTE) that ensure correct per-individual, per-tissue aggregation of statistics. This addresses a fundamental challenge in cross-study analysis: different studies may have different numbers of samples per individual and different tissue types, and naive aggregation can produce misleading results. The CTE approach first identifies the relevant samples for each individual matching the requested metadata filters, then aggregates clone-level statistics across those samples, ensuring that each individual contributes one data point regardless of their number of samples.

## COVID-19 as a Test Case for Cross-Study Analysis

The COVID-19 pandemic provides an ideal test case for cross-study repertoire analysis. Infection with SARS-CoV-2 causes a wide spectrum of disease severities, ranging from asymptomatic to critical illness [@Hoehn2021]. The observed variation in responses raises many questions regarding the causes of differential immunity and the diversity of the B cell repertoire in different individuals. The widespread interest in the immune response to SARS-CoV-2 has led to multiple independent sequencing studies of different stages of disease and recovery.

Sequencing data from multiple disease severity categories — as well as recovered, vaccinated, and healthy individuals — have been generated and stored in ImmuneDB databases. These datasets enable us to investigate the clonal and mutation characteristics of the BCR population and compare them across age, gender, and COVID-19 disease severity using IS-API. In this work, I have applied IS-API across six studies encompassing 106 blood-derived repertoires from 94 individuals annotated for disease stage, with subsets annotated for age and sex.

Previous studies have shown that severe COVID-19 is associated with reduced B cell diversity and altered clonal dynamics [@Hoehn2021; @Galson2020; @Nielsen2020]. However, these studies typically analyze individual cohorts in isolation. By applying IS-API to multiple studies simultaneously, we can assess whether patterns observed in one cohort replicate across others, providing more robust conclusions about the relationship between BCR repertoire characteristics and disease outcomes.

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

Data were collected from published studies with raw DNA AIRR BCR sequences from healthy and SARS-CoV-2-infected individuals at different stages of disease and recovery, as well as vaccinated individuals. After collecting the raw DNA sequences along with their metadata, we built standardized metadata sheets compliant with AIRR-seq data commons standards [@Rubelt2017] while allowing flexibility for experiment-specific fields. Each study was processed through the ImmuneDB pipeline — annotated with IgBLAST [@Ye2013] for germline assignment, clustered into clones, and stored with associated metadata in individual ImmuneDB database instances.

Seven studies were available through IS-API (**Table 1**):

**Table 1.** Datasets available through IS-API v0.3.0.

| Study ID | Description | N | PMID | Ref |
|---|---|---|---|---|
| CD1 | Severe, mild, and moderate COVID-19 from multiple hospital cohorts | 51 | 37153628 | [29, 30] |
| CD2 | Severe, non-severe, recovered, and healthy individuals | 19 | 33384691 | [31] |
| CD3 | Severe COVID-19 and healthy controls | 13 | 32669287 | [32] |
| CVX1 | COVID-19 mRNA vaccine study (recovered and naive vaccinees) | 12 | 34648302 | [33] |
| CVX2 | Second vaccine cohort with recovered individuals | 5 | 33858945 | — |
| HC1 | Healthy control organ donors, no COVID-19 or vaccination | 6 | 28829438 | [34] |
| GT1 | Pediatric gut transplant recipients | 7 | 38014202 | [47] |

## Individual Selection and Exclusions

An important feature of IS-API is its ability to selectively include or exclude specific individuals, studies, or metadata categories from the analysis. This enables researchers to exclude unpublished datasets, control samples (such as fibroblast or water controls used in sequencing quality assessment), and individuals with incomplete metadata — all through the query interface without modifying the underlying databases.

From the six studies, we identified 94 unique individuals with blood-derived samples. Five individuals were excluded due to data quality issues or ambiguous metadata: three from HC1 (individuals with incomplete sequencing data) and two from CVX2 (fibroblast and water sequencing controls). Three additional healthy individuals from CD3 lacked sex and age metadata; these were included in all analyses except the age and gender confounder analysis. After exclusions, 94 individuals contributed 106 blood-derived repertoires to the analysis (some individuals had multiple blood time points).

Blood-derived tissues were defined as: blood, Peripheral blood, PBL, and PBMC. Non-blood tissues (bone marrow, lymph node, lung, gut) were excluded from the cross-study comparison to ensure tissue homogeneity.

## Disease Stage Harmonization

Different studies used different terminology for disease stages. We harmonized these into six categories (**Table 4**):

- **Severe**: "severe", "Early phase hypoxaemia"
- **Moderate**: "Early phase-Stable", "Early phase-Improving"
- **Mild**: "mild", "non-severe"
- **Recovered**: "Recovering without ICU-Improving", "Recovering post-ICU -Improving", "Recovering post-ICU", "Recovered", "COVID recovered"
- **COVID Naive**: "COVID Naive" — vaccinated individuals with no history of COVID-19 infection
- **Healthy**: "healthy" — individuals with no history of COVID-19 infection or vaccination

The final cohort comprised: Severe (n=26), Moderate (n=9), Mild (n=30), Recovered (n=12), COVID Naive (n=8), and Healthy (n=9) (**Table 5**). It is important to note that the Recovered group includes both naturally recovered individuals (3 from CD2) and vaccinated individuals who had recovered from prior COVID-19 infection (5 from CVX2, 4 from CVX1). The COVID Naive group consists entirely of vaccinated individuals from CVX1 who had never been infected with SARS-CoV-2. The Healthy group consists of individuals with no known COVID-19 history and no vaccination (3 from CD3, 6 from HC1).

## IS-API Architecture and Implementation

The overall workflow for building and querying immune repertoire databases is illustrated in **Methods Figure 1**: raw DNA sequences (FASTA/Q or IgBLAST-annotated) are processed with uniform and consistent metadata into ImmuneDB databases, which are then queried through IS-API.

IS-API is a RESTful API written in Node.js [27] using the Express framework. It connects to multiple independent ImmuneDB MySQL database instances and executes queries across all of them in a single API call (**Methods Figure 2**). The five endpoint controllers — Metadata, Clones, Mutations, CDR3, and Gene Usage — each fan out to 1...N ImmuneDB instances and return results in a unified JSON format. The API is publicly available at https://github.com/DrexelSystemsImmunologyLab/IS-API.

The analysis approach follows a three-tier pyramid (**Methods Figure 3**): (1) Metadata investigation at the base — examining available studies, individuals, samples, and processes to understand the data landscape; (2) Biological-statistical measurements in the middle — computing clones, clone size, gene usage, and mutations across all kinds of metadata; and (3) Specific biological questions at the top — testing whether, for example, clone size differences correlate with disease stage.

All endpoints are designed as POST requests. The request body contains two objects in JSON format:

1. **repertoires**: specifies the metadata filters (e.g., disease_stage, tissue, sex, age)
2. **statistics**: specifies the statistical measure of interest

The response contains:

1. **Info**: project information (title, version, contacts)
2. **Result**: an array of objects, each containing the matched repertoire metadata and the computed statistics

The full set of available queries, organized by endpoint controller and statistic type, is shown in **Table 3**.

Version 0.3.0 introduced CTE-based queries (sampleMetaCTE) that first identify all samples matching the requested metadata for each individual, then aggregate statistics across those samples. This ensures correct per-individual results regardless of the number of samples or time points available.

## Statistical Endpoints

IS-API provides a flexible and dynamic set of endpoints across four controllers. Importantly, many parameters are not hard-coded — researchers can choose how to measure and filter clones according to their specific research question.

**Clone endpoints:**

- *clone_count*: Number of distinct clones per individual. The expansion threshold (default: 20 or more unique sequences) is configurable and can be adjusted to study clones at different levels of expansion.
- *clone_size*: Size of each clone, which can be measured in three different ways depending on the research question: by unique sequences (distinct sequences across an entire individual), by instances (distinct sequences within a single sample), or by copy number (the number of raw reads associated with an instance or unique sequence). This flexibility allows researchers to study clonal expansion from different perspectives — unique sequences reflect overall diversity across all samples, instances capture sample-level diversity, and copy number reflects the raw abundance of each sequence.
- *topX_clone_size_copies*: Cumulative sequence copies for the top 10, 100, and 1000 clones per individual, measuring repertoire concentration.

**Mutation endpoints:**

- *topX_mutation_level*: Average mutation count across the top clones per individual.
- *mutation_by_region*: Mutation counts split by CDR versus framework regions.
- *mutation_by_type*: Replacement versus silent mutation counts.
- *mutations_rs_ratio*: Non-synonymous (replacement) and synonymous (silent) mutation counts in CDR and framework (FW) regions per individual, enabling computation of NS/S ratios.

**CDR3 endpoints:**

- *topX_nt_AVG_CDR3_length*: Average CDR3 nucleotide length for the top 10, 100, and 1000 clones per individual.
- *topX_AA_AVG_CDR3_length*: Average CDR3 amino acid length for the top 10, 100, and 1000 clones per individual.
- *cdr3_length_distribution*: Mean, standard deviation, and clone count for CDR3 length in both amino acids and nucleotides per individual — providing a comprehensive view of CDR3 length properties across the entire clone repertoire, not just the top clones.

**V gene usage endpoint:**

- *v_gene_usage*: Clone count and total copies per V gene per individual.

## Biological Statistical Measures

For the COVID-19 clonal analysis, we computed the following measures per individual (blood samples only):

1. **Clonal diversity (Hill numbers)**: For each individual, we computed Hill numbers of orders 0, 1, and 2 from their clone size distribution. Order 0 (^0^D) equals clone richness (number of clones). Order 1 (^1^D = exp(Shannon entropy)) represents the effective number of equally abundant clones. Order 2 (^2^D = 1/Simpson concentration) reflects the effective number of dominant clones, giving more weight to abundant clones [@Tuomisto2010; @Schwartz2013b].

2. **Expanded clone count and size**: Number of clones exceeding expansion thresholds of 20, 50, and 100 unique sequences, and the median clone size per individual.

3. **NS/S mutation ratio**: The ratio of non-synonymous (replacement) to synonymous (silent) mutations, computed separately for CDR and framework regions. An NS/S ratio greater than 1 in CDR regions indicates positive selection for antigen binding; a ratio near 1 in framework regions indicates purifying selection to maintain structural integrity [@Hershberg2008].

4. **CDR3 length**: Mean and standard deviation of CDR3 amino acid length across all clones per individual.

5. **V gene usage**: Frequency of each V gene across individuals, filtered to V genes present at 1% or higher frequency in at least 85% of individuals.

## Statistical Analysis

All statistical comparisons were performed in Python using SciPy. For comparisons across the six disease categories, we used the Kruskal-Wallis H test (a non-parametric test for comparing distributions across multiple groups). When the Kruskal-Wallis test was significant (p < 0.05), pairwise comparisons were performed using the Mann-Whitney U test with Bonferroni correction for multiple testing. Significance levels are indicated as: * p < 0.05, ** p < 0.01, *** p < 0.001. Only pairs with sufficient sample sizes (n >= 3 per group) were tested.

## Visualization

Figures were generated using both R (ggplot2, dplyr, tidyr, jsonlite) and Python (matplotlib, numpy). The JSON-format API outputs were parsed and visualized with consistent color coding across all figures: Severe (dark red, #b71c1c), Moderate (dark orange, #e65100), Mild (salmon, #ff7043), Recovered (green, #43a047), COVID Naive (light blue, #42a5f5), and Healthy (dark blue, #1565c0). Boxplots show median, interquartile range, and whiskers extending to 1.5 times the interquartile range. Individual data points are overlaid with small random jitter for visibility. Statistical significance brackets are shown above the boxplots where pairwise comparisons reached significance after Bonferroni correction.

\newpage

# Results

## Part 1: IS-API Tool Capabilities

One of the main strengths of IS-API is that it enables researchers to conduct a high-level investigation of the available data and therefore refine their research questions — or at least become aware of potential pitfalls and weaknesses — before investing in detailed biological analysis. This investigation can be made through simple queries that execute within seconds through the IS-API metadata and statistical endpoints.

### Metadata Overview

In the first step, we used IS-API to query the metadata endpoint across all available databases. This immediately revealed the scope of data accessible through the tool: seven datasets totaling 121 individuals (**Metadata Figure 1**). The per-dataset breakdown shows that the largest study (CD1) contributes 51 individuals, while the smallest (CVX2) contributes 5.

Examining the metadata completeness across datasets (**Metadata Figure 2**) revealed important differences. While all datasets provide tissue and disease stage information, not all provide age or sex metadata — for example, CD3 has 13 individuals with tissue and disease stage data but only 10 with age information and no sex data. This kind of metadata investigation, available within seconds through IS-API, immediately alerts the researcher to the limitations of cross-study comparisons involving multiple metadata dimensions.

**Study selection and exclusions.** Based on the metadata overview, we excluded GT1 (pediatric gut transplant, n=15) from further analysis because it does not include COVID-19 disease stage metadata and represents a fundamentally different clinical context (pediatric transplant recipients). This left six COVID-19-related and healthy control datasets with 106 individuals.

**Disease category distribution.** Querying the disease_stage metadata field revealed 13 different raw disease labels across the six studies (**Metadata Figure 3**). These were harmonized into six categories as described in Methods. The harmonized distribution (**Metadata Figure 4**) shows that the cohort is dominated by Mild (n=41) and Severe (n=27) individuals, with smaller groups of NA/Unknown (n=15), Recovered (n=12), Healthy (n=9), Moderate (n=9), and COVID Naive (n=8). The stacked bar visualization also shows the contribution of each original study and label to the harmonized categories — for example, the Severe group includes individuals labeled "severe" from CD2 and "Early phase hypoxaemia" from CD1, while the Recovered group spans four different original labels across three studies (CD1, CD2, CVX1, CVX2). The 15 individuals with NA/Unknown disease stage (from GT1 and some CD3 individuals) were excluded from the disease-stage analysis.

**Demographics.** To assess whether age and gender could be examined alongside disease stage, we queried these metadata fields simultaneously. The demographics scatter plot (**Metadata Figure 5**) displays each individual by their disease category and age, colored by dataset and shaped by sex (circle = male, triangle = female, X = missing). This figure immediately reveals several important features of the data:

- Severe and Mild individuals span a wide age range (20-88 years), while Recovered and COVID Naive individuals tend to be younger (20-50 years).
- The Healthy group has a moderate age range (23-58 years).
- Sex data is missing for several individuals in CD3 (shown as X markers), limiting sex-stratified analyses in those disease categories.
- The dataset of origin is not uniformly distributed across disease categories — CD1 dominates the Severe and Mild groups, while CVX1 and CVX2 dominate the Recovered and COVID Naive groups.

**Cross-stratification: disease, age, and sex.** The heatmap of individual counts across disease category, age group, and sex (**Metadata Figure 6**) provides a comprehensive view of which comparisons are statistically feasible. The Mild group has the most balanced distribution across age and sex, while the Moderate group has only females aged 66+ and males spanning all age groups. The Healthy group has predominantly males aged 31-65, and the COVID Naive group consists entirely of young adults (18-30). These imbalances must be considered when interpreting disease-stage comparisons, as they could confound biological differences with demographic ones — a point we address directly in the confounder analysis (Figures 24-25).

### Querying Repertoire Statistics Across Studies

Having characterized the metadata landscape, we used IS-API's biological-statistical endpoints to query repertoire measures across all six studies, filtering for blood-derived samples and grouping by disease stage. The following figures demonstrate the breadth of questions that can be answered through the API.

**Clone count and clonal concentration.** Querying the clone_count endpoint revealed the number of distinct clones (with 20 or more unique sequences) per individual across disease categories (**Figure 1**). This provides an immediate overview of repertoire richness across the cohort. Querying the topX_clone_size_copies endpoint showed the fraction of total sequence copies accounted for by the top 10, 100, and 1000 clones (**Figure 2**), revealing the degree of oligoclonal dominance in each disease category.

**Clone size and expansion.** The clone_size endpoint returned the distribution of clone sizes across disease categories (**Figure 9**), the count of expanded clones per individual (**Figure 10**), and the size of expanded clones (**Figure 11**).

**CDR3 length in dominant clones.** The CDR3 endpoint returned the average CDR3 length (in amino acids) of the top 10 clones per individual (**Figure 3**), along with the range of CDR3 lengths (**Figure 4**). These figures illustrate how IS-API can characterize the antigen-binding loop properties of the most expanded clones across disease categories.

**Mutation levels and patterns.** The mutation endpoints provided multiple views of somatic hypermutation. The total mutation level in the top 10 clones per individual showed overall mutation load by disease category (**Figure 5**), while the mutation gradient across clone size ranks (top 10 vs. remaining top 100 vs. remaining top 1000) revealed how mutation accumulation varies with clonal expansion (**Figure 6**). Region-specific queries separated CDR from framework mutations (**Figure 7**), and the NS/S ratio endpoint provided an overview of selection pressure across disease categories (**Figure 8**).

**Sex-stratified analysis.** By combining disease_stage and sex metadata filters in a single query, IS-API enabled examination of mutation levels (**Figure 12**) and CDR3 lengths (**Figure 13**) in the top 10 clones, stratified by both sex and disease category. This demonstrates the API's ability to perform intersectional queries across multiple metadata dimensions.

### Within-Individual Cross-Tissue Analysis

IS-API's ability to query across multiple tissue types within the same individual provides a unique capability for studying tissue-specific repertoire characteristics. For individuals with samples from multiple tissues (e.g., blood and bone marrow in HC1, or blood and lung in CD1), we compared clone counts (**Figure 14**), clone sizes (**Figure 15**), and paired tissue measurements (**Figure 16**) within the same individual.

This within-individual comparison revealed that clone counts and sizes can differ substantially between tissues in the same individual, highlighting the importance of specifying tissue type when making cross-study comparisons. The observation that bone marrow and blood repertoires from the same individual can have different clonal profiles is consistent with the known compartmentalization of B cell populations [34, 41].

### Summary: Characterizing the Possibilities and Limitations of the Data

The metadata analysis enabled by IS-API revealed both the strengths and limitations of the available data. The strengths include a large cohort (94 individuals after exclusions) spanning six disease categories with data from six independent studies. The limitations include: (1) uneven sample sizes across disease categories, with Mild being the largest and COVID Naive the smallest; (2) incomplete sex metadata, particularly for CD3; (3) age distribution that is not uniform across disease categories, with severe individuals tending to be older; and (4) the Recovered group containing a mix of naturally recovered and vaccine-recovered individuals. These observations, all obtainable within minutes through IS-API queries, informed the design of the focused clonal analysis presented in Part 2.

## Part 2: COVID-19 Clonal Analysis

Having demonstrated IS-API's querying capabilities, we applied the tool to a focused clonal analysis of BCR repertoires across COVID-19 disease severities. All analyses in this section use blood-derived samples only, with individuals grouped into six harmonized disease categories: Severe (n=26), Moderate (n=9), Mild (n=30), Recovered (n=12), COVID Naive (n=8), and Healthy (n=9).

### Clonal Diversity Across Disease Severities

To assess overall clonal diversity, we computed Hill numbers of orders 0 (richness), 1 (Shannon), and 2 (Simpson) from the clone size distribution of each individual (**Figure 17**).

All three diversity measures showed significant differences across disease categories (Kruskal-Wallis p < 0.001 for all three orders). The most striking pattern was that Mild and Recovered individuals had the lowest diversity across all three orders, while COVID Naive and Healthy individuals had the highest. Severe individuals showed intermediate diversity with high variability.

Specifically, Order 0 (clone richness) was significantly higher in COVID Naive compared to Mild (p < 0.01) and Recovered (p < 0.001) individuals. The same pattern was evident in Order 1 (Shannon diversity), where COVID Naive and Healthy individuals had significantly higher effective clone numbers than Mild individuals (p < 0.01 and p < 0.001, respectively). Order 2 (Simpson diversity) similarly showed that Mild and Recovered individuals had repertoires dominated by fewer clones.

The diversity profiles (**Figure 18**), which plot all three Hill numbers for each individual with group medians highlighted, confirmed that the drop from Order 0 to Order 2 was steepest in disease groups (Severe, Moderate, Mild), indicating that these repertoires are dominated by a smaller number of large clones. In contrast, COVID Naive and Healthy individuals showed a more gradual decline, indicating a more even clone size distribution.

### Expanded Clones and Clone Size Distribution

We examined the number of expanded clones at three expansion thresholds: 20, 50, and 100 unique sequences per clone (**Figure 19**). At the lowest threshold (>20 unique sequences), 100% of individuals had at least one expanded clone. At the >50 threshold, some individuals in the Mild and Recovered groups had no expanded clones, while most COVID Naive and Healthy individuals retained multiple expanded clones. At the >100 threshold, the differences became more pronounced, with COVID Naive individuals consistently showing more expanded clones than disease groups.

The clone size distribution analysis (**Figure 20**) showed two complementary views. Panel A displayed the distribution of all individual clone sizes (log-transformed) as violin plots with overlaid boxplots, revealing that clone sizes were broadly similar across categories but with longer tails in the COVID Naive and Healthy groups. Panel B showed the median clone size per individual, which was significantly higher in COVID Naive individuals compared to the disease groups (Kruskal-Wallis p = 0.019).

### Somatic Hypermutation: NS/S Ratios

The ratio of non-synonymous to synonymous mutations (NS/S ratio) provides insight into the selection pressures acting on the B cell repertoire. We computed NS/S ratios separately for CDR and framework (FW) regions (**Figure 21**).

In CDR regions (Panel A), the NS/S ratio was consistently above 1.0 across all disease categories, indicating positive selection in CDR regions as expected for antigen-driven responses. The Kruskal-Wallis test showed significant differences across groups (p < 0.001). Mild individuals tended to have higher CDR NS/S ratios, suggesting stronger positive selection in this group, while Severe individuals showed more variable ratios.

In FW regions (Panel B), the NS/S ratio was generally lower than in CDR regions but still above 1.0, indicating some degree of replacement mutations in framework regions as well. The differences between groups were less pronounced in FW regions.

Panel C displayed the average mutation counts (non-synonymous and synonymous) as stacked bars for both CDR and FW regions across disease categories. This showed that the overall mutation burden was similar across groups, but the ratio of replacement to silent mutations differed, particularly in CDR regions.

### CDR3 Length Distribution

The CDR3 amino acid length distribution was analyzed per individual, with both the mean and standard deviation computed across all clones (**Figure 22**).

Mean CDR3 length showed significant variation across disease categories (Kruskal-Wallis p < 0.001, Panel A). Moderate individuals had the longest mean CDR3 lengths (median approximately 17.8 AA), while Mild and Healthy individuals had shorter CDR3 lengths (median approximately 17.0 AA). This is consistent with previous observations that actively responding repertoires may include clones with longer CDR3 loops, which can form more complex antigen-binding structures.

The standard deviation of CDR3 length (Panel B), reflecting within-individual variability, also differed across groups (Kruskal-Wallis p = 0.017). Severe individuals tended to have higher CDR3 length variability, suggesting a more heterogeneous repertoire in terms of CDR3 structure. A significant difference was observed between Moderate and Mild individuals (p < 0.05).

### V Gene Usage

To examine whether disease stage influences V gene segment usage, we analyzed the frequency of V genes across individuals using a heatmap (**Figure 23**). V genes were included if they were present at 1% or higher frequency in at least 85% of individuals, resulting in 16 V genes that met this criterion.

The heatmap revealed that certain V genes were consistently used at high frequency across all disease categories (e.g., IGHV4-34, IGHV3-23, IGHV4-59), reflecting the known preferential usage of these gene segments in human BCR repertoires. Visual inspection did not reveal strong disease-specific V gene usage patterns, suggesting that V gene usage is relatively stable across disease states and is more reflective of underlying germline genetics than disease-driven selection. This observation is consistent with the known stability of V gene usage across individuals and conditions [@Yang2021].

### Age and Gender as Potential Confounders

To assess whether age or gender could confound the disease-stage comparisons, we examined three key metrics — clone count, mean CDR3 length, and CDR NS/S ratio — in relation to age and gender. For this analysis, three healthy individuals from CD3 (H3, H4, H8) were excluded because they lacked age and sex metadata.

**Age (**Figure 24**).** Scatter plots of each metric against age showed no strong linear trends within any disease category. Clone count (Panel A, log scale) showed substantial variation within age groups but no systematic increase or decrease with age. Mean CDR3 length (Panel B) was similarly independent of age. The CDR NS/S ratio (Panel C) showed no age-dependent trend. These results suggest that age is not a major confounder in our disease-stage comparisons, though the limited age range within some disease categories (particularly Severe, where older individuals predominate) limits the power of this assessment.

**Gender (**Figure 25**).** Boxplots comparing male and female individuals within each disease category showed no systematic differences in clone count (Panel A, log scale), mean CDR3 length (Panel B), or CDR NS/S ratio (Panel C). The lack of sex-based differences is consistent with the literature for peripheral blood BCR repertoires, though our sample sizes within each sex-disease combination are limited, and subtle differences cannot be ruled out.

\newpage

# Discussion and Conclusions

## IS-API as a Tool for Cross-Study Repertoire Analysis

Large datasets have become essential in computational immunology, revealing patterns and trends that smaller, individual studies often miss. Recent high-throughput sequencing studies of B cell repertoires have shown promise in describing immune system dynamics across various conditions [@Briney2019; @Soto2019]. However, these studies frequently face limitations due to incomplete metadata, inconsistent data formatting, and the practical difficulty of combining datasets from different laboratories and sequencing platforms.

IS-API addresses these challenges by providing a unified interface for querying multiple ImmuneDB database instances simultaneously. The tool operates on two levels — metadata exploration and biological data analysis — enabling researchers to first understand the scope and limitations of available data before conducting statistical comparisons. This two-level approach is a key strength: by first querying metadata, researchers can identify potential confounders (such as uneven age or sex distributions), recognize missing data, and design their analyses accordingly.

The CTE-based query architecture introduced in version 0.3.0 represents a significant technical improvement. By ensuring correct per-individual, per-tissue aggregation, it eliminates a class of errors that can arise when individuals have different numbers of samples or when multiple tissue types are present. This is particularly important for cross-study analyses where sample structures vary across studies.

Compared to existing tools for cross-study immune repertoire analysis, IS-API offers several advantages. The iReceptor Gateway [@Corrie2018; @iReceptor] provides federated access to AIRR-seq data but operates at the sequence level rather than the clone level, making it difficult to perform clonal analyses. The AIRR Data Commons API [@Christley2020] provides standardized access to repertoire metadata but does not compute statistical summaries. The Immcantation Framework [@Gupta2015] provides sophisticated analysis tools but requires substantial preprocessing to combine data from different sources. IS-API fills the gap between data access and analysis by providing pre-computed, clone-level statistical summaries across multiple databases through a simple REST interface.

A limitation of IS-API is that it currently operates on pre-built ImmuneDB databases, meaning that researchers must first process their data through the ImmuneDB pipeline. Future work should explore integration with other database formats and with the broader AIRR Data Commons ecosystem. Additionally, while IS-API handles dozens of databases and hundreds of individuals efficiently, scaling to thousands of individuals may require optimization of database queries and potentially distributed computing approaches.

## COVID-19 Clonal Analysis: Biological Insights

The cross-study clonal analysis of BCR repertoires across COVID-19 disease severities revealed several notable patterns.

**Clonal diversity decreases in actively diseased individuals.** The Hill number analysis showed that individuals with Mild and Recovered COVID-19 had significantly lower clonal diversity than COVID Naive and Healthy individuals across all three diversity orders. This likely reflects the focusing of the B cell repertoire during and following an active immune response — antigen-driven clonal expansion leads to the dominance of a smaller number of clones, reducing overall diversity. The finding that Recovered individuals still show reduced diversity suggests that repertoire focusing persists beyond the acute phase of infection. Similar observations of reduced diversity during active immune responses have been reported in individual studies [@Hoehn2021; @Galson2020].

Interestingly, Severe individuals showed intermediate diversity with high variability. This could reflect the heterogeneous nature of severe COVID-19, which encompasses both individuals mounting strong but dysregulated immune responses (with low diversity) and individuals whose severe disease results from a failure to mount effective clonal expansion (with preserved but ineffective diversity).

**NS/S ratios indicate ongoing selection in disease states.** The CDR NS/S ratios above 1.0 across all disease categories confirm that positive selection is active in CDR regions, consistent with antigen-driven affinity maturation. The tendency for Mild individuals to show higher CDR NS/S ratios could indicate more efficient germinal center responses with stronger selection for improved antigen binding. In contrast, the more variable NS/S ratios in Severe individuals may reflect disrupted germinal center activity, which has been reported in severe COVID-19 [@Kaneko2020]. The framework NS/S ratios being lower than CDR ratios, yet still above 1.0, suggest some degree of structural adaptation beyond simple conservation.

**CDR3 length varies with disease severity.** The observation that Moderate individuals had the longest CDR3 lengths, while Mild and Healthy individuals had shorter CDR3 lengths, is consistent with the known association between longer CDR3 loops and broadly neutralizing antibody responses [@Saada2007]. Longer CDR3 regions can form more complex antigen-binding structures, potentially enabling recognition of diverse viral epitopes. The higher CDR3 length variability in Severe individuals may reflect a less focused, more heterogeneous response.

**V gene usage is relatively stable across disease states.** The lack of strong disease-specific V gene usage patterns is consistent with findings from large-scale repertoire studies showing that V gene usage is primarily determined by germline genetics rather than by antigen exposure or disease state [@Yang2021; @Briney2019]. While specific antibody lineages targeting SARS-CoV-2 epitopes may preferentially use certain V genes [@Robbiani2020], these represent a small fraction of the total repertoire and may not be detectable at the level of overall V gene frequency.

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
