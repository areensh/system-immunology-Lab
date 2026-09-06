library(jsonlite)
library(ggplot2)
library(dplyr)
library(tidyr)

setwd("/home/user/system-immunology-Lab/immunedb_STATS_API/clonal_analysis")

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
    axis.title = element_text(size = 22, face = "bold"),
    axis.text = element_text(size = 20),
    axis.text.x = element_text(size = 20, angle = 20, hjust = 1),
    strip.text = element_text(face = "bold", size = 22),
    plot.title = element_blank(),
    plot.margin = margin(10, 15, 10, 15),
    legend.position = "bottom",
    legend.title = element_text(size = 20, face = "bold"),
    legend.text = element_text(size = 18),
    legend.key.size = unit(1, "cm"),
    legend.spacing.x = unit(0.3, "cm"),
    legend.margin = margin(10, 0, 5, 0)
  )
theme_set(base_theme)

mean_sd_stats <- function(x) {
  m <- mean(x); s <- sd(x)
  data.frame(y = m, ymin = m - s, ymax = m + s)
}

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

df_cc <- parse_clone_count("clone_count/data/clone_count_disease_tissue.json")
df_cc <- standard_filter(df_cc)
df_cc <- df_cc %>%
  group_by(repertoire_id, disease_cat, study) %>%
  summarise(clone_count = median(clone_count), .groups = "drop")

cat("Clone count subjects:", nrow(df_cc), "\n")

p1 <- ggplot(df_cc, aes(x = disease_cat, y = clone_count, fill = disease_cat)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA, linewidth = 0.6) +
  geom_jitter(width = 0.2, alpha = 0.6, size = 2.5) +
  stat_summary(fun = mean, geom = "point", shape = 18, size = 5, color = "red") +
  stat_summary(fun.data = mean_sd_stats, geom = "errorbar", width = 0.3, color = "red", linewidth = 0.7) +
  scale_fill_manual(values = disease_colors, guide = "none") +
  scale_y_log10(labels = scales::comma) +
  labs(x = NULL, y = "Clone Count (unique clones)") +
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

df_tx <- parse_topX("topX/data/topX_disease_tissue.json")
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
  labs(x = NULL, y = "Fraction of Total Copies",
       title = "Clonal Dominance: Top-X Clone Proportions by Disease Stage") +
  theme(axis.text.x = element_blank(), axis.ticks.x = element_blank(),
        axis.title.y = element_text(size = 18, face = "bold"),
        axis.text.y = element_text(size = 14),
        strip.text.x = element_text(face = "bold", size = 20, margin = margin(b = 4, t = 4)),
        strip.background = element_rect(fill = "grey90", color = NA),
        plot.title = element_text(size = 24, face = "bold", hjust = 0.5),
        legend.text = element_text(size = 16),
        legend.title = element_text(size = 17, face = "bold"),
        legend.key.size = unit(1.2, "lines"),
        legend.position = "right",
        plot.margin = margin(15, 25, 10, 25),
        panel.spacing = unit(0.8, "lines"))
ggsave("plots/02_topX_stacked_by_disease.png", p2, width = 26, height = 10, dpi = 600, bg = "white")
cat("Figure 2 saved.\n")

# ============================================================
# 3. CDR3 AA LENGTH BY DISEASE - Violin + Boxplot
# ============================================================
cat("\n=== CDR3 ===\n")
parse_cdr3 <- function(path) {
  raw <- fromJSON(path, simplifyDataFrame = FALSE)
  rows <- lapply(raw$Result, function(entry) {
    rep <- entry$repertoire
    keys <- trimws(rep$meta_key)
    vals <- trimws(rep$meta_value)
    sv <- entry$statistics[[1]]$stats_value
    ids <- sapply(sv, function(x) x$clone_id)
    i10 <- which(ids == "Top_10_AA"); i100 <- which(ids == "Top_100_AA"); i1000 <- which(ids == "Top_1000_AA")
    if (!length(i10) || !length(i100) || !length(i1000)) return(NULL)
    ds_idx <- which(keys == "disease_stage")
    tissue_idx <- which(keys == "tissue")
    data.frame(
      repertoire_id = rep$repertoire_id,
      top10_aa = sv[[i10]]$count, top100_aa = sv[[i100]]$count, top1000_aa = sv[[i1000]]$count,
      disease_raw = if (length(ds_idx)) vals[ds_idx] else NA_character_,
      tissue = if (length(tissue_idx)) vals[tissue_idx] else NA_character_,
      stringsAsFactors = FALSE
    )
  })
  bind_rows(rows[!sapply(rows, is.null)])
}

df_cdr3 <- parse_cdr3("cdr3/data/CDR3_tissue_disease.json")
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
  stat_summary(fun = mean, geom = "point", shape = 18, size = 3, color = "red",
               position = position_dodge(width = 0.8)) +
  stat_summary(fun.data = mean_sd_stats, geom = "errorbar", width = 0.2, color = "red", linewidth = 0.5,
               position = position_dodge(width = 0.8)) +
  scale_fill_manual(values = tier_colors, name = "Clone Tier") +
  scale_color_manual(values = tier_colors, guide = "none") +
  labs(x = NULL, y = "Avg. CDR3 Length (AA)",
       title = "CDR3 AA Length by Disease Category") +
  theme(plot.title = element_text(size = 24, face = "bold", hjust = 0.5),
        axis.title = element_text(size = 18, face = "bold"),
        axis.text = element_text(size = 14),
        axis.text.x = element_text(size = 15, angle = 20, hjust = 1),
        legend.text = element_text(size = 15),
        legend.title = element_text(size = 16, face = "bold"),
        legend.key.size = unit(1.2, "lines"),
        legend.position = "right",
        plot.margin = margin(t = 15, r = 15, b = 10, l = 15))
ggsave("plots/03_cdr3_by_disease.png", p3, width = 16, height = 10, dpi = 600, bg = "white")
cat("Figure 3 saved.\n")

# CDR3 range plot - shows variability between tiers per subject
df_cdr3_range <- df_cdr3 %>%
  mutate(cdr3_range = top10_aa - top1000_aa)

p3b <- ggplot(df_cdr3_range, aes(x = disease_cat, y = cdr3_range, fill = disease_cat)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA, linewidth = 0.6) +
  geom_jitter(width = 0.2, alpha = 0.6, size = 2.5) +
  stat_summary(fun = mean, geom = "point", shape = 18, size = 5, color = "red") +
  stat_summary(fun.data = mean_sd_stats, geom = "errorbar", width = 0.3, color = "red", linewidth = 0.7) +
  scale_fill_manual(values = disease_colors, guide = "none") +
  geom_hline(yintercept = 0, linetype = "dashed", color = "grey50") +
  labs(x = NULL, y = "CDR3 Length Difference\n(Top10 - Top1000, AA)",
       title = "CDR3 Length Variability by Disease Category") +
  theme(plot.title = element_text(size = 18, face = "bold", hjust = 0.5),
        axis.title = element_text(size = 13, face = "bold"),
        axis.text = element_text(size = 12),
        axis.text.x = element_text(size = 12, angle = 20, hjust = 1),
        legend.text = element_text(size = 11),
        legend.title = element_text(size = 11, face = "bold"),
        plot.margin = margin(t = 15, r = 15, b = 10, l = 15))
ggsave("plots/04_cdr3_range_by_disease.png", p3b, width = 12, height = 8, dpi = 400, bg = "white")
cat("Figure 4 saved.\n")

# ============================================================
# 4. MUTATION LEVEL BY DISEASE - Violin + Boxplot
# ============================================================
cat("\n=== Mutation ===\n")
parse_mutation <- function(path) {
  raw <- fromJSON(path, simplifyDataFrame = FALSE)
  rows <- lapply(raw$Result, function(entry) {
    rep <- entry$repertoire
    keys <- trimws(rep$meta_key)
    vals <- trimws(rep$meta_value)
    sv <- entry$statistics[[1]]$stats_value
    ids <- sapply(sv, function(x) x$clone_id)
    i10 <- which(ids == "Top_10"); i100 <- which(ids == "Top_100"); i1000 <- which(ids == "Top_1000")
    if (!length(i10) || !length(i100) || !length(i1000)) return(NULL)
    ds_idx <- which(keys == "disease_stage")
    tissue_idx <- which(keys == "tissue")
    data.frame(
      repertoire_id = rep$repertoire_id,
      mut_top10 = sv[[i10]]$count, mut_top100 = sv[[i100]]$count, mut_top1000 = sv[[i1000]]$count,
      disease_raw = if (length(ds_idx)) vals[ds_idx] else NA_character_,
      tissue = if (length(tissue_idx)) vals[tissue_idx] else NA_character_,
      stringsAsFactors = FALSE
    )
  })
  bind_rows(rows[!sapply(rows, is.null)])
}

df_mut <- parse_mutation("mutation/data/mutations_disease_tissue.json")
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
  stat_summary(fun = mean, geom = "point", shape = 18, size = 3, color = "red",
               position = position_dodge(width = 0.8)) +
  stat_summary(fun.data = mean_sd_stats, geom = "errorbar", width = 0.2, color = "red", linewidth = 0.5,
               position = position_dodge(width = 0.8)) +
  scale_fill_manual(values = tier_colors, name = "Clone Tier") +
  scale_color_manual(values = tier_colors, guide = "none") +
  labs(x = NULL, y = "Avg. Mutation Count") +
  theme()
ggsave("plots/05_mutation_by_disease.png", p4, width = 14, height = 8, dpi = 400, bg = "white")
cat("Figure 5 saved.\n")

# Mutation gradient (Top10 - Top1000) — shows selection intensity
df_mut_gradient <- df_mut %>%
  mutate(mut_gradient = mut_top10 - mut_top1000)

p4b <- ggplot(df_mut_gradient, aes(x = disease_cat, y = mut_gradient, fill = disease_cat)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA, linewidth = 0.6) +
  geom_jitter(width = 0.2, alpha = 0.6, size = 2.5) +
  stat_summary(fun = mean, geom = "point", shape = 18, size = 5, color = "red") +
  stat_summary(fun.data = mean_sd_stats, geom = "errorbar", width = 0.3, color = "red", linewidth = 0.7) +
  scale_fill_manual(values = disease_colors, guide = "none") +
  labs(x = NULL, y = "Mutation Difference (Top10 - Top1000)") +
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

# ============================================================
# 5. MUTATION BY REGION (CDR vs FW) BY DISEASE
# ============================================================
cat("\n=== Mutation by Region ===\n")
parse_mutation_region <- function(path) {
  raw <- fromJSON(path, simplifyDataFrame = FALSE)
  rows <- lapply(raw$Result, function(entry) {
    rep <- entry$repertoire
    keys <- trimws(rep$meta_key)
    vals <- trimws(rep$meta_value)
    sv <- entry$statistics[[1]]$stats_value
    ids <- sapply(sv, function(x) x$clone_id)
    i_cdr <- which(ids == "CDR"); i_fw <- which(ids == "FW")
    if (!length(i_cdr) || !length(i_fw)) return(NULL)
    ds_idx <- which(keys == "disease_stage")
    tissue_idx <- which(keys == "tissue")
    data.frame(
      repertoire_id = rep$repertoire_id,
      avg_cdr = sv[[i_cdr]]$count, avg_fw = sv[[i_fw]]$count,
      disease_raw = if (length(ds_idx)) vals[ds_idx] else NA_character_,
      tissue = if (length(tissue_idx)) vals[tissue_idx] else NA_character_,
      stringsAsFactors = FALSE
    )
  })
  bind_rows(rows[!sapply(rows, is.null)])
}

region_colors <- c("CDR" = "#e74c3c", "FW" = "#3498db")

df_region <- parse_mutation_region("mutation/data/mutations_region_disease_tissue.json")
df_region <- standard_filter(df_region)
cat("Mutation by region subjects:", nrow(df_region), "\n")

df_region_long <- df_region %>%
  select(repertoire_id, disease_cat, avg_cdr, avg_fw) %>%
  pivot_longer(cols = c(avg_cdr, avg_fw),
               names_to = "region", values_to = "mutation_count") %>%
  mutate(region = case_when(
    region == "avg_cdr" ~ "CDR",
    region == "avg_fw" ~ "FW"
  )) %>%
  mutate(region = factor(region, levels = c("CDR", "FW")))

p7_cdr <- ggplot(df_region, aes(x = disease_cat, y = avg_cdr, fill = disease_cat)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA, linewidth = 0.6) +
  geom_jitter(width = 0.2, alpha = 0.6, size = 2.5) +
  stat_summary(fun = mean, geom = "point", shape = 18, size = 5, color = "red") +
  stat_summary(fun.data = mean_sd_stats, geom = "errorbar", width = 0.3, color = "red", linewidth = 0.7) +
  scale_fill_manual(values = disease_colors, guide = "none") +
  labs(x = NULL, y = "Avg. CDR Mutations per Clone") +
  theme()
ggsave("plots/07_cdr_mutations_by_disease.png", p7_cdr, width = 12, height = 8, dpi = 400, bg = "white")
cat("Figure 7a saved.\n")

p7_fw <- ggplot(df_region, aes(x = disease_cat, y = avg_fw, fill = disease_cat)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA, linewidth = 0.6) +
  geom_jitter(width = 0.2, alpha = 0.6, size = 2.5) +
  stat_summary(fun = mean, geom = "point", shape = 18, size = 5, color = "red") +
  stat_summary(fun.data = mean_sd_stats, geom = "errorbar", width = 0.3, color = "red", linewidth = 0.7) +
  scale_fill_manual(values = disease_colors, guide = "none") +
  labs(x = NULL, y = "Avg. FW Mutations per Clone") +
  theme()
ggsave("plots/07_fw_mutations_by_disease.png", p7_fw, width = 12, height = 8, dpi = 400, bg = "white")
cat("Figure 7b saved.\n")

cat("\n--- Mutation by Region (median) ---\n")
df_region %>% group_by(disease_cat) %>%
  summarise(n = n(), median_cdr = round(median(avg_cdr), 2),
            median_fw = round(median(avg_fw), 2),
            median_ratio = round(median(avg_cdr / avg_fw), 3),
            .groups = "drop") %>% print()

# ============================================================
# 6. R/S RATIO BY DISEASE (CDR and FW separately)
# ============================================================
cat("\n=== R/S Ratio ===\n")
parse_rs_ratio <- function(path) {
  raw <- fromJSON(path, simplifyDataFrame = FALSE)
  rows <- lapply(raw$Result, function(entry) {
    rep <- entry$repertoire
    keys <- trimws(rep$meta_key)
    vals <- trimws(rep$meta_value)
    sv <- entry$statistics[[1]]$stats_value
    ids <- sapply(sv, function(x) x$clone_id)
    get_val <- function(id) {
      i <- which(ids == id)
      if (length(i)) sv[[i]]$count else NA_real_
    }
    ds_idx <- which(keys == "disease_stage")
    tissue_idx <- which(keys == "tissue")
    data.frame(
      repertoire_id = rep$repertoire_id,
      cdr_r = get_val("CDR_replacement"), cdr_s = get_val("CDR_synonymous"),
      fw_r = get_val("FW_replacement"), fw_s = get_val("FW_synonymous"),
      disease_raw = if (length(ds_idx)) vals[ds_idx] else NA_character_,
      tissue = if (length(tissue_idx)) vals[tissue_idx] else NA_character_,
      stringsAsFactors = FALSE
    )
  })
  bind_rows(rows[!sapply(rows, is.null)])
}

df_rs <- parse_rs_ratio("mutation/data/mutations_rs_ratio_disease_tissue.json")
df_rs <- standard_filter(df_rs)
df_rs <- df_rs %>% mutate(
  cdr_rs = ifelse(cdr_s > 0, cdr_r / cdr_s, NA_real_),
  fw_rs = ifelse(fw_s > 0, fw_r / fw_s, NA_real_)
)
cat("R/S ratio subjects:", nrow(df_rs), "\n")

rs_colors <- c("CDR" = "#e74c3c", "FW" = "#3498db")

df_rs_long <- df_rs %>%
  select(repertoire_id, disease_cat, cdr_rs, fw_rs) %>%
  pivot_longer(cols = c(cdr_rs, fw_rs),
               names_to = "region", values_to = "rs_ratio") %>%
  mutate(region = case_when(
    region == "cdr_rs" ~ "CDR",
    region == "fw_rs" ~ "FW"
  )) %>%
  mutate(region = factor(region, levels = c("CDR", "FW")))

p8 <- ggplot(df_rs_long, aes(x = disease_cat, y = rs_ratio, fill = region)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA, linewidth = 0.5,
               position = position_dodge(width = 0.8)) +
  geom_point(aes(color = region), position = position_jitterdodge(jitter.width = 0.15, dodge.width = 0.8),
             alpha = 0.5, size = 1.5) +
  stat_summary(fun = mean, geom = "point", shape = 18, size = 3, color = "red",
               position = position_dodge(width = 0.8)) +
  stat_summary(fun.data = mean_sd_stats, geom = "errorbar", width = 0.2, color = "red", linewidth = 0.5,
               position = position_dodge(width = 0.8)) +
  scale_fill_manual(values = rs_colors, name = "Region") +
  scale_color_manual(values = rs_colors, guide = "none") +
  geom_hline(yintercept = 1, linetype = "dashed", color = "grey50") +
  labs(x = NULL, y = "R/S Ratio") +
  theme()
ggsave("plots/08_rs_ratio_by_disease.png", p8, width = 14, height = 8, dpi = 400, bg = "white")
cat("Figure 8 saved.\n")

cat("\n--- R/S Ratio (median) ---\n")
df_rs %>% group_by(disease_cat) %>%
  summarise(n = n(),
            median_cdr_rs = round(median(cdr_rs, na.rm = TRUE), 3),
            median_fw_rs = round(median(fw_rs, na.rm = TRUE), 3),
            .groups = "drop") %>% print()

# ============================================================
# 7. CLONE SIZE BY DISEASE (mean clone size per subject)
# ============================================================
cat("\n=== Clone Size ===\n")
parse_clone_size <- function(path) {
  raw <- fromJSON(path, simplifyDataFrame = FALSE)
  rows <- lapply(raw$Result, function(entry) {
    rep <- entry$repertoire
    keys <- trimws(rep$meta_key)
    vals <- trimws(rep$meta_value)
    clone_size <- entry$statistics[[1]]$stats_value[[1]]$count
    clone_id <- entry$statistics[[1]]$stats_value[[1]]$clone_id
    ds_idx <- which(keys == "disease_stage")
    tissue_idx <- which(keys == "tissue")
    data.frame(
      repertoire_id = rep$repertoire_id,
      clone_id = clone_id,
      clone_size = clone_size,
      disease_raw = if (length(ds_idx)) vals[ds_idx] else NA_character_,
      tissue = if (length(tissue_idx)) vals[tissue_idx] else NA_character_,
      stringsAsFactors = FALSE
    )
  })
  bind_rows(rows)
}

df_cs_raw <- parse_clone_size("clone_size/data/clone_size_disease_tissue.json")
df_cs_raw <- standard_filter(df_cs_raw)
cat("Clone size raw rows (clones):", nrow(df_cs_raw), "\n")

df_cs_subj <- df_cs_raw %>%
  group_by(repertoire_id, disease_cat, study) %>%
  summarise(
    mean_clone_size = mean(clone_size),
    median_clone_size = median(clone_size),
    total_clones = n(),
    highly_expanded = sum(clone_size > 100),
    highly_expanded_pct = round(sum(clone_size > 100) / n() * 100, 1),
    mean_expanded_size = ifelse(sum(clone_size > 100) > 0,
                                mean(clone_size[clone_size > 100]), NA_real_),
    .groups = "drop"
  )
cat("Clone size subjects:", nrow(df_cs_subj), "\n")

# Fig 8b: Clone size distribution (all clones) by disease
p8b <- ggplot(df_cs_raw, aes(x = disease_cat, y = clone_size, fill = disease_cat)) +
  geom_violin(alpha = 0.5, linewidth = 0.4, scale = "width") +
  geom_boxplot(width = 0.15, alpha = 0.8, outlier.shape = NA, linewidth = 0.5) +
  stat_summary(fun = mean, geom = "point", shape = 18, size = 4, color = "red") +
  scale_fill_manual(values = disease_colors, guide = "none") +
  scale_y_log10(labels = scales::comma) +
  labs(x = NULL, y = "Clone Size (unique sequences per clone)") +
  theme()
ggsave("plots/08b_clone_size_distribution.png", p8b, width = 12, height = 8, dpi = 400, bg = "white")
cat("Figure 8b saved.\n")

# Fig 9: Median clone size by disease (per subject)
p9 <- ggplot(df_cs_subj, aes(x = disease_cat, y = median_clone_size, fill = disease_cat)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA, linewidth = 0.6) +
  geom_jitter(width = 0.2, alpha = 0.6, size = 2.5) +
  stat_summary(fun = mean, geom = "point", shape = 18, size = 5, color = "red") +
  stat_summary(fun.data = mean_sd_stats, geom = "errorbar", width = 0.3, color = "red", linewidth = 0.7) +
  scale_fill_manual(values = disease_colors, guide = "none") +
  scale_y_log10(labels = scales::comma) +
  labs(x = NULL, y = "Median Clone Size per Subject (unique sequences)") +
  theme()
ggsave("plots/09_clone_size_by_disease.png", p9, width = 12, height = 8, dpi = 400, bg = "white")
cat("Figure 9 saved.\n")

# Fig 10: Number of highly expanded clones (size > 100) by disease
p10 <- ggplot(df_cs_subj, aes(x = disease_cat, y = highly_expanded + 1, fill = disease_cat)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA, linewidth = 0.6) +
  geom_jitter(width = 0.2, alpha = 0.6, size = 2.5) +
  stat_summary(fun = mean, geom = "point", shape = 18, size = 5, color = "red") +
  stat_summary(fun.data = mean_sd_stats, geom = "errorbar", width = 0.3, color = "red", linewidth = 0.7) +
  scale_fill_manual(values = disease_colors, guide = "none") +
  scale_y_log10(labels = function(x) round(x - 1)) +
  labs(x = NULL, y = "# Expanded Clones (size > 100)") +
  theme()
ggsave("plots/10_expanded_clones_by_disease.png", p10, width = 12, height = 8, dpi = 400, bg = "white")
cat("Figure 10 saved.\n")

# Fig 11: Median clone size of expanded clones only by disease
df_cs_expanded <- df_cs_subj %>% filter(!is.na(mean_expanded_size))

p11 <- ggplot(df_cs_expanded, aes(x = disease_cat, y = mean_expanded_size, fill = disease_cat)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA, linewidth = 0.6) +
  geom_jitter(width = 0.2, alpha = 0.6, size = 2.5) +
  stat_summary(fun = mean, geom = "point", shape = 18, size = 5, color = "red") +
  stat_summary(fun.data = mean_sd_stats, geom = "errorbar", width = 0.3, color = "red", linewidth = 0.7) +
  scale_fill_manual(values = disease_colors, guide = "none") +
  scale_y_log10(labels = scales::comma) +
  labs(x = NULL, y = "Mean Size of Expanded Clones (>100 copies)") +
  theme()
ggsave("plots/11_expanded_clone_size_by_disease.png", p11, width = 12, height = 8, dpi = 400, bg = "white")
cat("Figure 11 saved.\n")

cat("\n--- Clone Size Summary ---\n")
df_cs_subj %>% group_by(disease_cat) %>%
  summarise(n = n(),
            median_mean_cs = round(median(mean_clone_size), 1),
            median_expanded = median(highly_expanded),
            median_expanded_pct = round(median(highly_expanded_pct), 1),
            median_expanded_size = round(median(mean_expanded_size, na.rm = TRUE), 1),
            .groups = "drop") %>% print()

# ============================================================
# 8. SEX × DISEASE BREAKDOWNS (selected endpoints)
# ============================================================
cat("\n=== Sex x Disease Breakdowns ===\n")

meta_raw <- fromJSON("../metadata/data/metadata_ALL.json", simplifyDataFrame = FALSE)
meta_list <- lapply(meta_raw$Result, function(entry) {
  rep <- entry$repertoire
  keys <- trimws(rep$meta_key); vals <- trimws(rep$meta_value)
  sex_i <- which(keys == "sex"); age_i <- which(keys == "Age minimum")
  data.frame(
    repertoire_id = rep$repertoire_id,
    sex = if (length(sex_i)) vals[sex_i] else NA_character_,
    age = suppressWarnings(if (length(age_i)) as.numeric(vals[age_i]) else NA_real_),
    stringsAsFactors = FALSE
  )
})
meta_df <- bind_rows(meta_list) %>% distinct(repertoire_id, .keep_all = TRUE)
meta_df <- meta_df %>% filter(sex %in% c("male", "female", "Male", "Female"))
meta_df$sex <- ifelse(grepl("^[Mm]", meta_df$sex), "Male", "Female")

sex_colors <- c("Female" = "#e74c3c", "Male" = "#3498db")

# Fig 12: Mutation Top10 by sex x disease
df_mut_sex <- df_mut %>% left_join(meta_df, by = "repertoire_id") %>% filter(!is.na(sex))
cat("Mutation by sex subjects:", nrow(df_mut_sex), "\n")

p12 <- ggplot(df_mut_sex, aes(x = disease_cat, y = mut_top10, fill = sex)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA, linewidth = 0.5,
               position = position_dodge(width = 0.8)) +
  geom_point(aes(color = sex), position = position_jitterdodge(jitter.width = 0.15, dodge.width = 0.8),
             alpha = 0.5, size = 1.5) +
  stat_summary(fun = mean, geom = "point", shape = 18, size = 3, color = "red",
               position = position_dodge(width = 0.8)) +
  stat_summary(fun.data = mean_sd_stats, geom = "errorbar", width = 0.2, color = "red", linewidth = 0.5,
               position = position_dodge(width = 0.8)) +
  scale_fill_manual(values = sex_colors, name = "Sex") +
  scale_color_manual(values = sex_colors, guide = "none") +
  labs(x = NULL, y = "Avg. Mutation Count\n(Top 10 Clones)",
       title = "Mutation Level in Top 10 Clones by Sex and Disease") +
  theme(plot.title = element_text(size = 18, face = "bold", hjust = 0.5),
        axis.title = element_text(size = 13, face = "bold"),
        axis.text = element_text(size = 12),
        axis.text.x = element_text(size = 12, angle = 20, hjust = 1),
        legend.text = element_text(size = 11),
        legend.title = element_text(size = 11, face = "bold"),
        plot.margin = margin(t = 15, r = 15, b = 10, l = 15))
ggsave("plots/12_mutation_top10_by_sex_disease.png", p12, width = 14, height = 8, dpi = 400, bg = "white")
cat("Figure 12 saved.\n")

# Fig 13: CDR3 Top10 by sex x disease
df_cdr3_sex <- df_cdr3 %>% left_join(meta_df, by = "repertoire_id") %>% filter(!is.na(sex))
cat("CDR3 by sex subjects:", nrow(df_cdr3_sex), "\n")

p13 <- ggplot(df_cdr3_sex, aes(x = disease_cat, y = top10_aa, fill = sex)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA, linewidth = 0.5,
               position = position_dodge(width = 0.8)) +
  geom_point(aes(color = sex), position = position_jitterdodge(jitter.width = 0.15, dodge.width = 0.8),
             alpha = 0.5, size = 1.5) +
  stat_summary(fun = mean, geom = "point", shape = 18, size = 3, color = "red",
               position = position_dodge(width = 0.8)) +
  stat_summary(fun.data = mean_sd_stats, geom = "errorbar", width = 0.2, color = "red", linewidth = 0.5,
               position = position_dodge(width = 0.8)) +
  scale_fill_manual(values = sex_colors, name = "Sex") +
  scale_color_manual(values = sex_colors, guide = "none") +
  labs(x = NULL, y = "Avg. CDR3 Length\n(AA, Top 10 Clones)",
       title = "CDR3 Length in Top 10 Clones by Sex and Disease") +
  theme(plot.title = element_text(size = 18, face = "bold", hjust = 0.5),
        axis.title = element_text(size = 13, face = "bold"),
        axis.text = element_text(size = 12),
        axis.text.x = element_text(size = 12, angle = 20, hjust = 1),
        legend.text = element_text(size = 11),
        legend.title = element_text(size = 11, face = "bold"),
        plot.margin = margin(t = 15, r = 15, b = 10, l = 15))
ggsave("plots/13_cdr3_top10_by_sex_disease.png", p13, width = 14, height = 8, dpi = 400, bg = "white")
cat("Figure 13 saved.\n")
