library(jsonlite)
library(ggplot2)
library(dplyr)
library(tidyr)

setwd("/home/user/system-immunology-Lab/immunedb_STATS_API/clonal/results")

# ---- Common setup ----
map_disease <- function(ds) {
  ds <- trimws(ds)
  case_when(
    grepl("healthy", ds, ignore.case = TRUE) ~ "Healthy",
    grepl("naive", ds, ignore.case = TRUE) ~ "COVID Naive",
    grepl("non-severe", ds, ignore.case = TRUE) ~ "Mild",
    grepl("^mild$", ds, ignore.case = TRUE) ~ "Mild",
    grepl("recover", ds, ignore.case = TRUE) ~ "Recovered",
    grepl("^severe$", ds, ignore.case = TRUE) ~ "Severe",
    grepl("hypox", ds, ignore.case = TRUE) ~ "Severe",
    grepl("Stable|Improving", ds, ignore.case = TRUE) ~ "Moderate",
    TRUE ~ "Other"
  )
}

disease_order <- c("Severe", "Mild", "Moderate", "Recovered", "COVID Naive", "Healthy")

disease_colors <- c(
  "Severe" = "#d62728", "Mild" = "#aec7e8", "Moderate" = "#ff7f0e",
  "Recovered" = "#2ca02c", "COVID Naive" = "#1f77b4", "Healthy" = "#9467bd"
)

tier_colors <- c("Top 10" = "#d62728", "Top 100" = "#ff7f0e", "Top 1000" = "#2ca02c")
stacked_tier_colors <- c(
  "Top 10" = "#d62728", "Top 11-100" = "#ff7f0e",
  "Top 101-1000" = "#2ca02c", "Remaining" = "#aec7e8"
)

base_theme <- theme_bw(base_size = 26) +
  theme(
    plot.background = element_rect(fill = "white", color = NA),
    panel.background = element_rect(fill = "white", color = NA),
    legend.background = element_rect(fill = "white", color = NA),
    axis.title = element_text(size = 26, face = "bold"),
    axis.text = element_text(size = 20),
    axis.text.x = element_text(size = 20, angle = 20, hjust = 1),
    strip.text = element_text(face = "bold", size = 22),
    plot.title = element_text(size = 28, face = "bold", hjust = 0.5),
    plot.margin = margin(10, 15, 10, 15),
    legend.position = "bottom",
    legend.title = element_text(size = 20, face = "bold"),
    legend.text = element_text(size = 18),
    legend.key.size = unit(1, "cm"),
    legend.spacing.x = unit(0.3, "cm"),
    legend.margin = margin(10, 0, 5, 0)
  )
theme_set(base_theme)

# Standard exclusions and blood filter
standard_filter <- function(df) {
  df$study <- sub("-.*", "", df$repertoire_id)
  df$study <- case_when(
    df$study == "Covid19_db3" ~ "CD1",
    df$study == "covid_db2" ~ "CD2",
    df$study == "covid19" ~ "CD3",
    df$study == "vaccine2" ~ "CVX1",
    df$study == "covid_vaccine_new" ~ "CVX2",
    df$study == "lp16_Igblast" ~ "HC1",
    df$study == "sykesIgblast2020" ~ "GT1",
    TRUE ~ df$study
  )
  df <- df %>% filter(!repertoire_id %in% c(
    "covid_vaccine_new-Fb", "covid_vaccine_new-Water",
    "lp16_Igblast-D159", "lp16_Igblast-D154", "lp16_Igblast-Hu-1"))
  cd3_healthy <- df %>% filter(study == "CD3", grepl("healthy", disease_raw, ignore.case = TRUE)) %>%
    pull(repertoire_id) %>% unique()
  df <- df %>% filter(!repertoire_id %in% cd3_healthy)
  df <- df %>% filter(tissue %in% c("blood", "PBL", "Peripheral blood"))
  df$disease_cat <- factor(map_disease(df$disease_raw), levels = disease_order)
  df <- df %>% filter(!is.na(disease_cat))
  df
}

# ============================================================
# 1. CLONE COUNT (CLONAL DIVERSITY) BY DISEASE
# ============================================================
cat("=== Clone Count ===\n")
parse_clone_count <- function(path) {
  raw <- fromJSON(path, simplifyDataFrame = FALSE)
  do.call(rbind, lapply(raw$Result, function(entry) {
    rep <- entry$repertoire
    keys <- trimws(rep$meta_key)
    vals <- trimws(rep$meta_value)
    cnt <- entry$statistics[[1]]$stats_value[[1]]$count
    ds_idx <- which(keys == "disease_stage")
    tissue_idx <- which(keys == "tissue")
    data.frame(
      repertoire_id = rep$repertoire_id,
      clone_count = cnt,
      disease_raw = if (length(ds_idx)) vals[ds_idx] else NA_character_,
      tissue = if (length(tissue_idx)) vals[tissue_idx] else NA_character_,
      stringsAsFactors = FALSE
    )
  }))
}

df_cc <- parse_clone_count("../clone_count/data/clone_count_disease_tissue.json")
df_cc <- standard_filter(df_cc)
df_cc <- df_cc %>%
  group_by(repertoire_id, disease_cat, study) %>%
  summarise(clone_count = median(clone_count), .groups = "drop")

cat("Clone count subjects:", nrow(df_cc), "\n")

p1 <- ggplot(df_cc, aes(x = disease_cat, y = clone_count, fill = disease_cat)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA, linewidth = 0.6) +
  geom_jitter(width = 0.2, alpha = 0.6, size = 2.5) +
  stat_summary(fun = mean, geom = "point", shape = 18, size = 5, color = "black") +
  scale_fill_manual(values = disease_colors, guide = "none") +
  scale_y_log10(labels = scales::comma) +
  labs(x = NULL, y = "Clone Count (unique clones)", title = "Clonal Diversity") +
  theme()
ggsave("plots/01_clone_count_by_disease.png", p1, width = 12, height = 8, dpi = 400, bg = "white")
cat("Figure 1 saved.\n")

# ============================================================
# 2. TOP-X STACKED BARS BY DISEASE
# ============================================================
cat("\n=== TopX ===\n")
parse_topX <- function(path) {
  raw <- fromJSON(path, simplifyDataFrame = FALSE)
  do.call(rbind, lapply(raw$Result, function(entry) {
    rep <- entry$repertoire
    keys <- trimws(rep$meta_key)
    vals <- trimws(rep$meta_value)
    stat <- entry$statistics[[1]]
    total <- stat$total
    sv <- stat$stats_value
    top10 <- sv[[which(sapply(sv, function(x) x$clone_id) == "Top_10")]]$count
    top100 <- sv[[which(sapply(sv, function(x) x$clone_id) == "Top_100")]]$count
    top1000 <- sv[[which(sapply(sv, function(x) x$clone_id) == "Top_1000")]]$count
    ds_idx <- which(keys == "disease_stage")
    tissue_idx <- which(keys == "tissue")
    data.frame(
      repertoire_id = rep$repertoire_id, total_copies = total,
      top10 = top10, top100 = top100, top1000 = top1000,
      top10_pct = round(top10 / total * 100, 2),
      top100_pct = round(top100 / total * 100, 2),
      top1000_pct = round(top1000 / total * 100, 2),
      disease_raw = if (length(ds_idx)) vals[ds_idx] else NA_character_,
      tissue = if (length(tissue_idx)) vals[tissue_idx] else NA_character_,
      stringsAsFactors = FALSE
    )
  }))
}

df_tx <- parse_topX("../topX/data/topX_disease_tissue.json")
df_tx <- standard_filter(df_tx)
cat("TopX subjects:", nrow(df_tx), "\n")

df_tx <- df_tx %>% mutate(
  tier_top10 = top10_pct,
  tier_11_100 = top100_pct - top10_pct,
  tier_101_1000 = top1000_pct - top100_pct,
  tier_remaining = 100 - top1000_pct
)
df_tx <- df_tx %>%
  arrange(disease_cat, desc(top10_pct)) %>%
  mutate(subj_order = row_number())

df_tx_long <- df_tx %>%
  select(repertoire_id, subj_order, disease_cat, tier_top10, tier_11_100, tier_101_1000, tier_remaining) %>%
  pivot_longer(cols = starts_with("tier_"), names_to = "tier", values_to = "pct") %>%
  mutate(tier = case_when(
    tier == "tier_top10" ~ "Top 10",
    tier == "tier_11_100" ~ "Top 11-100",
    tier == "tier_101_1000" ~ "Top 101-1000",
    tier == "tier_remaining" ~ "Remaining"
  )) %>%
  mutate(tier = factor(tier, levels = c("Remaining", "Top 101-1000", "Top 11-100", "Top 10")))

p2 <- ggplot(df_tx_long, aes(x = reorder(repertoire_id, subj_order), y = pct, fill = tier)) +
  geom_bar(stat = "identity", width = 0.9) +
  facet_grid(~ disease_cat, scales = "free_x", space = "free_x") +
  scale_fill_manual(values = stacked_tier_colors, name = "Clone Tier") +
  scale_y_continuous(labels = function(x) paste0(x, "%"), expand = c(0, 0)) +
  coord_cartesian(ylim = c(0, 100)) +
  labs(x = NULL, y = "Fraction of Total Copies", title = "Clonal Dominance") +
  theme(axis.text.x = element_blank(), axis.ticks.x = element_blank(),
        strip.text.x = element_text(face = "bold", size = 22))
ggsave("plots/02_topX_stacked_by_disease.png", p2, width = 16, height = 8, dpi = 400, bg = "white")
cat("Figure 2 saved.\n")

# ============================================================
# 3. CDR3 AA LENGTH BY DISEASE - Violin + Boxplot
# ============================================================
cat("\n=== CDR3 ===\n")
parse_cdr3 <- function(path) {
  raw <- fromJSON(path, simplifyDataFrame = FALSE)
  do.call(rbind, lapply(raw$Result, function(entry) {
    rep <- entry$repertoire
    keys <- trimws(rep$meta_key)
    vals <- trimws(rep$meta_value)
    sv <- entry$statistics[[1]]$stats_value
    top10 <- sv[[which(sapply(sv, function(x) x$clone_id) == "Top_10")]]$count
    top100 <- sv[[which(sapply(sv, function(x) x$clone_id) == "Top_100")]]$count
    top1000 <- sv[[which(sapply(sv, function(x) x$clone_id) == "Top_1000")]]$count
    ds_idx <- which(keys == "disease_stage")
    tissue_idx <- which(keys == "tissue")
    data.frame(
      repertoire_id = rep$repertoire_id,
      top10_aa = top10, top100_aa = top100, top1000_aa = top1000,
      disease_raw = if (length(ds_idx)) vals[ds_idx] else NA_character_,
      tissue = if (length(tissue_idx)) vals[tissue_idx] else NA_character_,
      stringsAsFactors = FALSE
    )
  }))
}

df_cdr3 <- parse_cdr3("../cdr3/data/CDR3_tissue_disease.json")
df_cdr3 <- standard_filter(df_cdr3)
cat("CDR3 subjects:", nrow(df_cdr3), "\n")

df_cdr3_long <- df_cdr3 %>%
  select(repertoire_id, disease_cat, top10_aa, top100_aa, top1000_aa) %>%
  pivot_longer(cols = c(top10_aa, top100_aa, top1000_aa),
               names_to = "tier", values_to = "cdr3_length") %>%
  mutate(tier = case_when(
    tier == "top10_aa" ~ "Top 10",
    tier == "top100_aa" ~ "Top 100",
    tier == "top1000_aa" ~ "Top 1000"
  )) %>%
  mutate(tier = factor(tier, levels = c("Top 10", "Top 100", "Top 1000")))

p3 <- ggplot(df_cdr3_long, aes(x = disease_cat, y = cdr3_length, fill = tier)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA, linewidth = 0.5,
               position = position_dodge(width = 0.8)) +
  geom_point(aes(color = tier), position = position_jitterdodge(jitter.width = 0.15, dodge.width = 0.8),
             alpha = 0.5, size = 1.5) +
  scale_fill_manual(values = tier_colors, name = "Clone Tier") +
  scale_color_manual(values = tier_colors, guide = "none") +
  labs(x = NULL, y = "Avg. CDR3 Length (AA)", title = "CDR3 Length by Disease") +
  theme()
ggsave("plots/03_cdr3_by_disease.png", p3, width = 14, height = 8, dpi = 400, bg = "white")
cat("Figure 3 saved.\n")

# CDR3 range plot - shows variability between tiers per subject
df_cdr3_range <- df_cdr3 %>%
  mutate(cdr3_range = top10_aa - top1000_aa)

p3b <- ggplot(df_cdr3_range, aes(x = disease_cat, y = cdr3_range, fill = disease_cat)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA, linewidth = 0.6) +
  geom_jitter(width = 0.2, alpha = 0.6, size = 2.5) +
  stat_summary(fun = mean, geom = "point", shape = 18, size = 5, color = "black") +
  scale_fill_manual(values = disease_colors, guide = "none") +
  geom_hline(yintercept = 0, linetype = "dashed", color = "grey50") +
  labs(x = NULL, y = "CDR3 Length Difference (Top10 - Top1000, AA)",
       title = "CDR3 Length Divergence: Top vs Broad Clones") +
  theme()
ggsave("plots/04_cdr3_range_by_disease.png", p3b, width = 12, height = 8, dpi = 400, bg = "white")
cat("Figure 4 saved.\n")

# ============================================================
# 4. MUTATION LEVEL BY DISEASE - Violin + Boxplot
# ============================================================
cat("\n=== Mutation ===\n")
parse_mutation <- function(path) {
  raw <- fromJSON(path, simplifyDataFrame = FALSE)
  do.call(rbind, lapply(raw$Result, function(entry) {
    rep <- entry$repertoire
    keys <- trimws(rep$meta_key)
    vals <- trimws(rep$meta_value)
    sv <- entry$statistics[[1]]$stats_value
    top10 <- sv[[which(sapply(sv, function(x) x$clone_id) == "Top_10")]]$count
    top100 <- sv[[which(sapply(sv, function(x) x$clone_id) == "Top_100")]]$count
    top1000 <- sv[[which(sapply(sv, function(x) x$clone_id) == "Top_1000")]]$count
    ds_idx <- which(keys == "disease_stage")
    tissue_idx <- which(keys == "tissue")
    data.frame(
      repertoire_id = rep$repertoire_id,
      mut_top10 = top10, mut_top100 = top100, mut_top1000 = top1000,
      disease_raw = if (length(ds_idx)) vals[ds_idx] else NA_character_,
      tissue = if (length(tissue_idx)) vals[tissue_idx] else NA_character_,
      stringsAsFactors = FALSE
    )
  }))
}

df_mut <- parse_mutation("../mutation/data/mutations_disease_tissue.json")
df_mut <- standard_filter(df_mut)
cat("Mutation subjects:", nrow(df_mut), "\n")

df_mut_long <- df_mut %>%
  select(repertoire_id, disease_cat, mut_top10, mut_top100, mut_top1000) %>%
  pivot_longer(cols = starts_with("mut_"),
               names_to = "tier", values_to = "mutation_count") %>%
  mutate(tier = case_when(
    tier == "mut_top10" ~ "Top 10",
    tier == "mut_top100" ~ "Top 100",
    tier == "mut_top1000" ~ "Top 1000"
  )) %>%
  mutate(tier = factor(tier, levels = c("Top 10", "Top 100", "Top 1000")))

p4 <- ggplot(df_mut_long, aes(x = disease_cat, y = mutation_count, fill = tier)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA, linewidth = 0.5,
               position = position_dodge(width = 0.8)) +
  geom_point(aes(color = tier), position = position_jitterdodge(jitter.width = 0.15, dodge.width = 0.8),
             alpha = 0.5, size = 1.5) +
  scale_fill_manual(values = tier_colors, name = "Clone Tier") +
  scale_color_manual(values = tier_colors, guide = "none") +
  labs(x = NULL, y = "Avg. Mutation Count", title = "Somatic Hypermutation by Disease") +
  theme()
ggsave("plots/05_mutation_by_disease.png", p4, width = 14, height = 8, dpi = 400, bg = "white")
cat("Figure 5 saved.\n")

# Mutation gradient (Top10 - Top1000) — shows selection intensity
df_mut_gradient <- df_mut %>%
  mutate(mut_gradient = mut_top10 - mut_top1000)

p4b <- ggplot(df_mut_gradient, aes(x = disease_cat, y = mut_gradient, fill = disease_cat)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA, linewidth = 0.6) +
  geom_jitter(width = 0.2, alpha = 0.6, size = 2.5) +
  stat_summary(fun = mean, geom = "point", shape = 18, size = 5, color = "black") +
  scale_fill_manual(values = disease_colors, guide = "none") +
  labs(x = NULL, y = "Mutation Difference (Top10 - Top1000)",
       title = "Mutation Selection Gradient") +
  theme()
ggsave("plots/06_mutation_gradient_by_disease.png", p4b, width = 12, height = 8, dpi = 400, bg = "white")
cat("Figure 6 saved.\n")

# ============================================================
# SUMMARY STATISTICS
# ============================================================
cat("\n\n========== SUMMARY STATISTICS ==========\n")
cat("\n--- Clone Count ---\n")
df_cc %>% group_by(disease_cat) %>%
  summarise(n = n(), median = median(clone_count), mean = round(mean(clone_count)),
            .groups = "drop") %>% print()

cat("\n--- TopX (median %) ---\n")
df_tx %>% group_by(disease_cat) %>%
  summarise(n = n(), top10_pct = round(median(top10_pct), 1),
            top100_pct = round(median(top100_pct), 1),
            top1000_pct = round(median(top1000_pct), 1), .groups = "drop") %>% print()

cat("\n--- CDR3 AA Length (median) ---\n")
df_cdr3 %>% group_by(disease_cat) %>%
  summarise(n = n(), top10 = round(median(top10_aa), 1),
            top100 = round(median(top100_aa), 1),
            top1000 = round(median(top1000_aa), 1), .groups = "drop") %>% print()

cat("\n--- CDR3 Range (Top10 - Top1000) ---\n")
df_cdr3_range %>% group_by(disease_cat) %>%
  summarise(n = n(), median_range = round(median(cdr3_range), 2),
            mean_range = round(mean(cdr3_range), 2), .groups = "drop") %>% print()

cat("\n--- Mutation Level (median) ---\n")
df_mut %>% group_by(disease_cat) %>%
  summarise(n = n(), top10 = round(median(mut_top10), 1),
            top100 = round(median(mut_top100), 1),
            top1000 = round(median(mut_top1000), 1), .groups = "drop") %>% print()

cat("\n--- Mutation Gradient (Top10 - Top1000) ---\n")
df_mut_gradient %>% group_by(disease_cat) %>%
  summarise(n = n(), median_gradient = round(median(mut_gradient), 1),
            mean_gradient = round(mean(mut_gradient), 1), .groups = "drop") %>% print()
