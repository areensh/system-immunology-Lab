library(jsonlite)
library(ggplot2)
library(dplyr)
library(tidyr)

# ============================================================
# HELPER: disease category mapping (same as metadata script)
# ============================================================
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

disease_order <- c("Healthy", "COVID Naive", "Mild", "Moderate", "Recovered", "Severe")
sex_colors <- c("Male" = "#4A90D9", "Female" = "#E85D75")

theme_set(theme_minimal(base_size = 13) +
  theme(
    plot.title = element_text(face = "bold", hjust = 0.5),
    axis.text.x = element_text(angle = 45, hjust = 1)
  ))

output_dir <- "plots/clonal"
dir.create(output_dir, showWarnings = FALSE, recursive = TRUE)

# ============================================================
# 1. CLONE COUNT
# ============================================================
cc_raw <- fromJSON("clone_count.json", simplifyDataFrame = FALSE)

cc_df <- do.call(rbind, lapply(cc_raw$Result, function(entry) {
  rep <- entry$repertoire
  keys <- trimws(rep$meta_key)
  vals <- trimws(rep$meta_value)
  count <- entry$statistics[[1]]$stats_value[[1]]$count
  data.frame(
    repertoire_id = rep$repertoire_id,
    age = as.numeric(vals[which(keys == "Age minimum")]),
    disease_stage = vals[which(keys == "disease_stage")],
    sex = vals[which(keys == "sex")],
    clone_count = count,
    stringsAsFactors = FALSE
  )
}))

cc_df$disease_category <- map_disease(cc_df$disease_stage)
cc_df$disease_category <- factor(cc_df$disease_category, levels = disease_order)
cc_df$sex_clean <- case_when(tolower(cc_df$sex) %in% c("male") ~ "Male",
                              tolower(cc_df$sex) %in% c("female") ~ "Female",
                              TRUE ~ NA_character_)
cc_df$age_group <- cut(cc_df$age, breaks = c(0, 30, 50, 65, 100),
                        labels = c("18-30", "31-50", "51-65", "66+"), include.lowest = TRUE)

# 1a. Clone count by disease category
p_cc_disease <- ggplot(cc_df, aes(x = disease_category, y = clone_count, fill = disease_category)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA) +
  geom_jitter(width = 0.2, alpha = 0.4, size = 1.5) +
  scale_y_log10() +
  labs(title = "Clone Count by Disease Category",
       x = "Disease Category", y = "Clone Count (log scale)") +
  theme(legend.position = "none")
ggsave(file.path(output_dir, "cc_by_disease.png"), p_cc_disease, width = 10, height = 6, dpi = 150)

# 1b. Clone count by sex
cc_sex <- cc_df %>% filter(!is.na(sex_clean))
p_cc_sex <- ggplot(cc_sex, aes(x = sex_clean, y = clone_count, fill = sex_clean)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA) +
  geom_jitter(width = 0.2, alpha = 0.4, size = 1.5) +
  scale_y_log10() +
  scale_fill_manual(values = sex_colors) +
  labs(title = "Clone Count by Sex", x = "Sex", y = "Clone Count (log scale)") +
  theme(legend.position = "none")
ggsave(file.path(output_dir, "cc_by_sex.png"), p_cc_sex, width = 7, height = 6, dpi = 150)

# 1c. Clone count by age group
cc_age <- cc_df %>% filter(!is.na(age_group))
p_cc_age <- ggplot(cc_age, aes(x = age_group, y = clone_count, fill = age_group)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA) +
  geom_jitter(width = 0.2, alpha = 0.4, size = 1.5) +
  scale_y_log10() +
  labs(title = "Clone Count by Age Group", x = "Age Group", y = "Clone Count (log scale)") +
  theme(legend.position = "none") +
  scale_fill_brewer(palette = "Blues")
ggsave(file.path(output_dir, "cc_by_age.png"), p_cc_age, width = 8, height = 6, dpi = 150)

# 1d. Clone count by disease x sex
cc_ds <- cc_df %>% filter(!is.na(sex_clean))
p_cc_dis_sex <- ggplot(cc_ds, aes(x = disease_category, y = clone_count, fill = sex_clean)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA) +
  geom_jitter(aes(color = sex_clean), position = position_jitterdodge(jitter.width = 0.15), alpha = 0.4, size = 1.5) +
  scale_y_log10() +
  scale_fill_manual(values = sex_colors) +
  scale_color_manual(values = sex_colors) +
  labs(title = "Clone Count by Disease Category and Sex",
       x = "Disease Category", y = "Clone Count (log scale)", fill = "Sex", color = "Sex")
ggsave(file.path(output_dir, "cc_by_disease_sex.png"), p_cc_dis_sex, width = 12, height = 6, dpi = 150)

# 1e. Clone count by disease x age group
cc_da <- cc_df %>% filter(!is.na(age_group))
p_cc_dis_age <- ggplot(cc_da, aes(x = disease_category, y = clone_count, fill = age_group)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA) +
  scale_y_log10() +
  scale_fill_brewer(palette = "YlOrRd") +
  labs(title = "Clone Count by Disease Category and Age Group",
       x = "Disease Category", y = "Clone Count (log scale)", fill = "Age Group")
ggsave(file.path(output_dir, "cc_by_disease_age.png"), p_cc_dis_age, width = 12, height = 6, dpi = 150)

cat("Clone count plots saved.\n")

# ============================================================
# 2. CLONE SIZE (from pre-processed CSV)
# ============================================================
cs_df <- read.csv("clone_size_summary.csv", stringsAsFactors = FALSE)
cs_df$disease_category <- map_disease(cs_df$disease_stage)
cs_df$disease_category <- factor(cs_df$disease_category, levels = disease_order)
cs_df$sex_clean <- case_when(tolower(cs_df$sex) %in% c("male") ~ "Male",
                              tolower(cs_df$sex) %in% c("female") ~ "Female",
                              TRUE ~ NA_character_)
cs_df$age_group <- cut(cs_df$age, breaks = c(0, 30, 50, 65, 100),
                        labels = c("18-30", "31-50", "51-65", "66+"), include.lowest = TRUE)

# 2a. Mean clone size by disease
p_cs_disease <- ggplot(cs_df, aes(x = disease_category, y = mean_clone_size, fill = disease_category)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA) +
  geom_jitter(width = 0.2, alpha = 0.4, size = 1.5) +
  scale_y_log10() +
  labs(title = "Mean Clone Size by Disease Category",
       x = "Disease Category", y = "Mean Clone Size (log scale)") +
  theme(legend.position = "none")
ggsave(file.path(output_dir, "cs_by_disease.png"), p_cs_disease, width = 10, height = 6, dpi = 150)

# 2b. Mean clone size by sex
cs_sex <- cs_df %>% filter(!is.na(sex_clean))
p_cs_sex <- ggplot(cs_sex, aes(x = sex_clean, y = mean_clone_size, fill = sex_clean)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA) +
  geom_jitter(width = 0.2, alpha = 0.4, size = 1.5) +
  scale_y_log10() +
  scale_fill_manual(values = sex_colors) +
  labs(title = "Mean Clone Size by Sex", x = "Sex", y = "Mean Clone Size (log scale)") +
  theme(legend.position = "none")
ggsave(file.path(output_dir, "cs_by_sex.png"), p_cs_sex, width = 7, height = 6, dpi = 150)

# 2c. Mean clone size by age group
cs_age <- cs_df %>% filter(!is.na(age_group))
p_cs_age <- ggplot(cs_age, aes(x = age_group, y = mean_clone_size, fill = age_group)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA) +
  geom_jitter(width = 0.2, alpha = 0.4, size = 1.5) +
  scale_y_log10() +
  labs(title = "Mean Clone Size by Age Group", x = "Age Group", y = "Mean Clone Size (log scale)") +
  theme(legend.position = "none") +
  scale_fill_brewer(palette = "Blues")
ggsave(file.path(output_dir, "cs_by_age.png"), p_cs_age, width = 8, height = 6, dpi = 150)

# 2d. Mean clone size by disease x sex
cs_ds <- cs_df %>% filter(!is.na(sex_clean))
p_cs_dis_sex <- ggplot(cs_ds, aes(x = disease_category, y = mean_clone_size, fill = sex_clean)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA) +
  geom_jitter(aes(color = sex_clean), position = position_jitterdodge(jitter.width = 0.15), alpha = 0.4, size = 1.5) +
  scale_y_log10() +
  scale_fill_manual(values = sex_colors) +
  scale_color_manual(values = sex_colors) +
  labs(title = "Mean Clone Size by Disease Category and Sex",
       x = "Disease Category", y = "Mean Clone Size (log scale)", fill = "Sex", color = "Sex")
ggsave(file.path(output_dir, "cs_by_disease_sex.png"), p_cs_dis_sex, width = 12, height = 6, dpi = 150)

cat("Clone size plots saved.\n")

# ============================================================
# 3. TOP X CLONE RATIO (fraction of total copies)
# ============================================================
tx_raw <- fromJSON("topX_copies.json", simplifyDataFrame = FALSE)

tx_df <- do.call(rbind, lapply(tx_raw$Result, function(entry) {
  rep <- entry$repertoire
  keys <- trimws(rep$meta_key)
  vals <- trimws(rep$meta_value)
  stat <- entry$statistics[[1]]
  total <- stat$total

  rows <- lapply(stat$stats_value, function(sv) {
    data.frame(
      repertoire_id = rep$repertoire_id,
      age = as.numeric(vals[which(keys == "Age minimum")]),
      disease_stage = vals[which(keys == "disease_stage")],
      sex = vals[which(keys == "sex")],
      top_category = sv$clone_id,
      copies = sv$count,
      total_copies = total,
      fraction = sv$count / total,
      stringsAsFactors = FALSE
    )
  })
  do.call(rbind, rows)
}))

tx_df$disease_category <- map_disease(tx_df$disease_stage)
tx_df$disease_category <- factor(tx_df$disease_category, levels = disease_order)
tx_df$sex_clean <- case_when(tolower(tx_df$sex) %in% c("male") ~ "Male",
                              tolower(tx_df$sex) %in% c("female") ~ "Female",
                              TRUE ~ NA_character_)
tx_df$age_group <- cut(tx_df$age, breaks = c(0, 30, 50, 65, 100),
                        labels = c("18-30", "31-50", "51-65", "66+"), include.lowest = TRUE)
tx_df$top_category <- factor(tx_df$top_category, levels = c("Top_10", "Top_100", "Top_1000"))

# 3a. Top X fraction by disease (faceted by top category)
p_tx_disease <- ggplot(tx_df, aes(x = disease_category, y = fraction, fill = disease_category)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA) +
  geom_jitter(width = 0.2, alpha = 0.3, size = 1) +
  facet_wrap(~top_category) +
  labs(title = "Fraction of Top X Clones by Disease Category",
       x = "Disease Category", y = "Fraction of Total Copies") +
  theme(legend.position = "none")
ggsave(file.path(output_dir, "topX_by_disease.png"), p_tx_disease, width = 14, height = 6, dpi = 150)

# 3b. Top X fraction by sex (faceted)
tx_sex <- tx_df %>% filter(!is.na(sex_clean))
p_tx_sex <- ggplot(tx_sex, aes(x = sex_clean, y = fraction, fill = sex_clean)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA) +
  geom_jitter(width = 0.2, alpha = 0.3, size = 1) +
  facet_wrap(~top_category) +
  scale_fill_manual(values = sex_colors) +
  labs(title = "Fraction of Top X Clones by Sex",
       x = "Sex", y = "Fraction of Total Copies") +
  theme(legend.position = "none")
ggsave(file.path(output_dir, "topX_by_sex.png"), p_tx_sex, width = 12, height = 6, dpi = 150)

# 3c. Top X fraction by age group (faceted)
tx_age <- tx_df %>% filter(!is.na(age_group))
p_tx_age <- ggplot(tx_age, aes(x = age_group, y = fraction, fill = age_group)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA) +
  geom_jitter(width = 0.2, alpha = 0.3, size = 1) +
  facet_wrap(~top_category) +
  scale_fill_brewer(palette = "Blues") +
  labs(title = "Fraction of Top X Clones by Age Group",
       x = "Age Group", y = "Fraction of Total Copies") +
  theme(legend.position = "none")
ggsave(file.path(output_dir, "topX_by_age.png"), p_tx_age, width = 12, height = 6, dpi = 150)

# 3d. Top X fraction by disease x sex (Top_10 only for clarity)
tx_ds_10 <- tx_df %>% filter(top_category == "Top_10", !is.na(sex_clean))
p_tx_dis_sex <- ggplot(tx_ds_10, aes(x = disease_category, y = fraction, fill = sex_clean)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA) +
  geom_jitter(aes(color = sex_clean), position = position_jitterdodge(jitter.width = 0.15), alpha = 0.4, size = 1.5) +
  scale_fill_manual(values = sex_colors) +
  scale_color_manual(values = sex_colors) +
  labs(title = "Fraction of Top 10 Clones by Disease Category and Sex",
       x = "Disease Category", y = "Fraction of Total Copies", fill = "Sex", color = "Sex")
ggsave(file.path(output_dir, "top10_by_disease_sex.png"), p_tx_dis_sex, width = 12, height = 6, dpi = 150)

# 3e. Top X fraction by disease x age (Top_10 only)
tx_da_10 <- tx_df %>% filter(top_category == "Top_10", !is.na(age_group))
p_tx_dis_age <- ggplot(tx_da_10, aes(x = disease_category, y = fraction, fill = age_group)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA) +
  scale_fill_brewer(palette = "YlOrRd") +
  labs(title = "Fraction of Top 10 Clones by Disease Category and Age Group",
       x = "Disease Category", y = "Fraction of Total Copies", fill = "Age Group")
ggsave(file.path(output_dir, "top10_by_disease_age.png"), p_tx_dis_age, width = 12, height = 6, dpi = 150)

cat("Top X plots saved.\n")

# ============================================================
# SUMMARY STATS (for text verification)
# ============================================================
cat("\n========== CLONE COUNT SUMMARY ==========\n")
cat("N participants:", nrow(cc_df), "\n")
cat("By disease:\n")
cc_df %>% group_by(disease_category) %>%
  summarise(n = n(), median = median(clone_count), mean = round(mean(clone_count)), .groups = "drop") %>%
  print()

cat("\n========== CLONE SIZE SUMMARY ==========\n")
cat("N participants:", nrow(cs_df), "\n")
cat("By disease:\n")
cs_df %>% group_by(disease_category) %>%
  summarise(n = n(), median_mean_cs = round(median(mean_clone_size), 1), .groups = "drop") %>%
  print()

cat("\n========== TOP X SUMMARY (fractions) ==========\n")
tx_df %>% group_by(disease_category, top_category) %>%
  summarise(n = n(), median_frac = round(median(fraction), 3), .groups = "drop") %>%
  pivot_wider(names_from = top_category, values_from = c(n, median_frac)) %>%
  print()

cat("\nAll clonal analysis plots saved to:", normalizePath(output_dir), "\n")
