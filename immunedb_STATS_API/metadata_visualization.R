library(jsonlite)
library(ggplot2)
library(dplyr)
library(tidyr)

# --- Parse JSON ---
json_data <- fromJSON("metadata_sex_disease_age_subject.json", simplifyDataFrame = FALSE)

records <- lapply(json_data$Result, function(entry) {
  rep <- entry$repertoire
  keys <- trimws(rep$meta_key)
  vals <- trimws(rep$meta_value)
  # Handle mismatched lengths by padding with NA
  len <- length(keys)
  if (length(vals) < len) vals <- c(vals, rep(NA, len - length(vals)))
  if (length(vals) > len) vals <- vals[seq_len(len)]
  row <- setNames(as.list(vals), keys)
  row$repertoire_id <- rep$repertoire_id
  row
})

df <- bind_rows(records)

# Extract study (dataset) from repertoire_id prefix
df$study_raw <- sub("-.*", "", df$repertoire_id)

# Map to informative short titles based on paper PMIDs
study_labels <- c(
  "covid19"           = "Kuri-Cervantes 2020\n(Acute COVID-19)",
  "covid_vaccine_new" = "Goel 2021a\n(Vaccine + Recovery)",
  "covid_db2"         = "Galson 2020\n(Longitudinal COVID-19)",
  "Covid19_db3"       = "PMID:37153628\n(Mild vs Severe)",
  "vaccine2"          = "Goel 2021b\n(Naive vs Recovered Vaccine)",
  "lp16_Igblast"      = "Briney 2019\n(Healthy Multi-Tissue)"
)

df$study <- ifelse(df$study_raw %in% names(study_labels),
                   study_labels[df$study_raw],
                   df$study_raw)

# Clean columns
df$age <- as.numeric(df$`Age minimum`)
df$disease_stage <- df$disease_stage
df$sex <- tolower(df$sex)
df$subject <- df$subject_name

# Normalize disease_stage into broad categories
df$ds_trimmed <- trimws(df$disease_stage)
df$disease_category <- case_when(
  grepl("healthy", df$ds_trimmed, ignore.case = TRUE) ~ "Healthy",
  grepl("naive", df$ds_trimmed, ignore.case = TRUE) ~ "COVID Naive",
  grepl("non-severe", df$ds_trimmed, ignore.case = TRUE) ~ "Mild",
  grepl("^mild$", df$ds_trimmed, ignore.case = TRUE) ~ "Mild",
  grepl("recover", df$ds_trimmed, ignore.case = TRUE) ~ "Recovered",
  grepl("^severe$", df$ds_trimmed, ignore.case = TRUE) ~ "Severe",
  grepl("hypox", df$ds_trimmed, ignore.case = TRUE) ~ "Severe",
  grepl("Stable|Improving", df$ds_trimmed, ignore.case = TRUE) ~ "Moderate",
  df$ds_trimmed == "NA" | is.na(df$ds_trimmed) ~ "NA/Unknown",
  TRUE ~ "Other"
)

df$sex_clean <- case_when(
  df$sex %in% c("male") ~ "Male",
  df$sex %in% c("female") ~ "Female",
  TRUE ~ "NA/Unknown"
)

df$age_group <- cut(df$age,
  breaks = c(0, 30, 50, 65, 100),
  labels = c("18-30", "31-50", "51-65", "66+"),
  include.lowest = TRUE
)

theme_set(theme_minimal(base_size = 13) +
  theme(
    plot.title = element_text(face = "bold", hjust = 0.5),
    axis.text.x = element_text(angle = 45, hjust = 1)
  ))

output_dir <- "plots"
dir.create(output_dir, showWarnings = FALSE)

# ============================================================
# LEVEL 0: Metadata type breakdown per study (from ALL metadata)
# ============================================================

json_all <- fromJSON("metadata_ALL.json", simplifyDataFrame = FALSE)

# Parse into long format to handle duplicate keys (e.g. multiple tissues per subject)
meta_long_list <- lapply(json_all$Result, function(entry) {
  rep <- entry$repertoire
  rid <- rep$repertoire_id
  keys <- trimws(rep$meta_key)
  vals <- trimws(rep$meta_value)
  data.frame(
    repertoire_id = rid,
    meta_key = keys,
    meta_value = vals,
    stringsAsFactors = FALSE
  )
})

df_meta_long <- bind_rows(meta_long_list)
df_meta_long$study_raw <- sub("-.*", "", df_meta_long$repertoire_id)
df_meta_long$study <- ifelse(df_meta_long$study_raw %in% names(study_labels),
                             study_labels[df_meta_long$study_raw],
                             df_meta_long$study_raw)

# --- Figure 0a: Tissue types per study ---
df_tissue <- df_meta_long %>%
  filter(meta_key == "tissue") %>%
  distinct(repertoire_id, study, meta_value) %>%
  count(study, meta_value)

p0a <- ggplot(df_tissue, aes(x = meta_value, y = n, fill = study)) +
  geom_col(position = "dodge") +
  geom_text(aes(label = n), position = position_dodge(width = 0.9), vjust = -0.3, size = 3) +
  labs(
    title = "Sample Tissue Types per Study",
    x = "Tissue", y = "# Subjects", fill = "Study"
  ) +
  scale_fill_brewer(palette = "Set2") +
  theme(
    axis.text.x = element_text(angle = 45, hjust = 1, size = 10),
    legend.position = "bottom",
    legend.text = element_text(size = 8)
  )

ggsave(file.path(output_dir, "00a_tissue_per_study.png"), p0a, width = 14, height = 7, dpi = 150)
cat("Saved: 00a_tissue_per_study.png\n")

# --- Figure 0b: Cell subset per study (only studies with reported values) ---
df_cell <- df_meta_long %>%
  filter(meta_key == "cell_subset", meta_value != "NA") %>%
  distinct(repertoire_id, study, meta_value) %>%
  count(study, meta_value)

if (nrow(df_cell) > 0) {
  p0b <- ggplot(df_cell, aes(x = meta_value, y = n, fill = study)) +
    geom_col(position = "dodge") +
    geom_text(aes(label = n), position = position_dodge(width = 0.9), vjust = -0.3, size = 3) +
    labs(
      title = "Cell Subset Types per Study (excluding NA)",
      x = "Cell Subset", y = "# Subjects", fill = "Study"
    ) +
    scale_fill_brewer(palette = "Set2") +
    theme(
      axis.text.x = element_text(angle = 45, hjust = 1, size = 8),
      legend.position = "bottom",
      legend.text = element_text(size = 8)
    )

  ggsave(file.path(output_dir, "00b_cell_subset_per_study.png"), p0b, width = 16, height = 7, dpi = 150)
  cat("Saved: 00b_cell_subset_per_study.png\n")
}

# --- Figure 0c: Summary table - which metadata fields each study has ---
df_meta_summary <- df_meta_long %>%
  filter(!meta_key %in% c("study_title", "subject_name", "Relevant publications")) %>%
  mutate(has_value = ifelse(meta_value == "NA" | is.na(meta_value), "Not reported", "Reported")) %>%
  distinct(repertoire_id, study, meta_key, has_value) %>%
  count(study, meta_key, has_value)

p0c <- ggplot(df_meta_summary, aes(x = meta_key, y = n, fill = has_value)) +
  geom_col(position = "stack") +
  facet_wrap(~study, scales = "free_y", ncol = 2) +
  geom_text(aes(label = n), position = position_stack(vjust = 0.5), size = 3) +
  labs(
    title = "Metadata Field Availability per Study",
    x = "Metadata Field", y = "# Subjects", fill = ""
  ) +
  scale_fill_manual(values = c("Reported" = "#5B9BD5", "Not reported" = "#D9D9D9")) +
  theme(
    axis.text.x = element_text(angle = 45, hjust = 1, size = 9),
    legend.position = "bottom",
    strip.text = element_text(size = 9)
  )

ggsave(file.path(output_dir, "00c_metadata_availability.png"), p0c, width = 14, height = 10, dpi = 150)
cat("Saved: 00c_metadata_availability.png\n")

# ============================================================
# LEVEL 1: Subjects per study (dataset)
# ============================================================

p1 <- df %>%
  count(study) %>%
  ggplot(aes(x = reorder(study, -n), y = n, fill = study)) +
  geom_col(show.legend = FALSE) +
  geom_text(aes(label = n), vjust = -0.3, size = 4) +
  labs(title = "Number of Subjects per Study", x = "Study", y = "# Subjects") +
  scale_fill_brewer(palette = "Set2")

ggsave(file.path(output_dir, "01_subjects_per_dataset.png"), p1, width = 12, height = 6, dpi = 150)
cat("Saved: 01_subjects_per_dataset.png\n")

# ============================================================
# LEVEL 2: Subjects per metadata category
# ============================================================

# 2a. Disease category distribution
p2a <- df %>%
  count(disease_category) %>%
  ggplot(aes(x = reorder(disease_category, -n), y = n, fill = disease_category)) +
  geom_col(show.legend = FALSE) +
  geom_text(aes(label = n), vjust = -0.3, size = 4) +
  labs(title = "Number of Subjects per Disease Category", x = "Disease Category", y = "# Subjects") +
  scale_fill_brewer(palette = "Set3")

ggsave(file.path(output_dir, "02a_subjects_per_disease_category.png"), p2a, width = 10, height = 6, dpi = 150)
cat("Saved: 02a_subjects_per_disease_category.png\n")

# 2b. Sex distribution
p2b <- df %>%
  count(sex_clean) %>%
  ggplot(aes(x = sex_clean, y = n, fill = sex_clean)) +
  geom_col(show.legend = FALSE) +
  geom_text(aes(label = n), vjust = -0.3, size = 4) +
  labs(title = "Number of Subjects by Sex", x = "Sex", y = "# Subjects") +
  scale_fill_manual(values = c("Male" = "#4A90D9", "Female" = "#E85D75", "NA/Unknown" = "#AAAAAA"))

ggsave(file.path(output_dir, "02b_subjects_per_sex.png"), p2b, width = 7, height = 6, dpi = 150)
cat("Saved: 02b_subjects_per_sex.png\n")

# 2c. Age distribution histogram
df_age <- df %>% filter(!is.na(age))

p2c <- ggplot(df_age, aes(x = age)) +
  geom_histogram(binwidth = 5, fill = "#5B9BD5", color = "white", alpha = 0.85) +
  labs(title = "Age Distribution of Subjects", x = "Age", y = "# Subjects") +
  geom_vline(aes(xintercept = median(age, na.rm = TRUE)),
    color = "red", linetype = "dashed", linewidth = 1
  )

ggsave(file.path(output_dir, "02c_age_distribution.png"), p2c, width = 9, height = 6, dpi = 150)
cat("Saved: 02c_age_distribution.png\n")

# 2d. Age group bar chart
p2d <- df %>%
  filter(!is.na(age_group)) %>%
  count(age_group) %>%
  ggplot(aes(x = age_group, y = n, fill = age_group)) +
  geom_col(show.legend = FALSE) +
  geom_text(aes(label = n), vjust = -0.3, size = 4) +
  labs(title = "Subjects by Age Group", x = "Age Group", y = "# Subjects") +
  scale_fill_brewer(palette = "Blues")

ggsave(file.path(output_dir, "02d_subjects_per_age_group.png"), p2d, width = 7, height = 6, dpi = 150)
cat("Saved: 02d_subjects_per_age_group.png\n")

# ============================================================
# LEVEL 3: Metadata combinations (cross-tabulations)
# ============================================================

# 3a. Disease category × Sex
p3a <- df %>%
  count(disease_category, sex_clean) %>%
  ggplot(aes(x = disease_category, y = n, fill = sex_clean)) +
  geom_col(position = "dodge") +
  geom_text(aes(label = n), position = position_dodge(width = 0.9), vjust = -0.3, size = 3.5) +
  labs(title = "Disease Category by Sex", x = "Disease Category", y = "# Subjects", fill = "Sex") +
  scale_fill_manual(values = c("Male" = "#4A90D9", "Female" = "#E85D75", "NA/Unknown" = "#AAAAAA"))

ggsave(file.path(output_dir, "03a_disease_by_sex.png"), p3a, width = 11, height = 6, dpi = 150)
cat("Saved: 03a_disease_by_sex.png\n")

# 3b. Disease category × Age group
p3b <- df %>%
  filter(!is.na(age_group)) %>%
  count(disease_category, age_group) %>%
  ggplot(aes(x = disease_category, y = n, fill = age_group)) +
  geom_col(position = "dodge") +
  geom_text(aes(label = n), position = position_dodge(width = 0.9), vjust = -0.3, size = 3) +
  labs(title = "Disease Category by Age Group", x = "Disease Category", y = "# Subjects", fill = "Age Group") +
  scale_fill_brewer(palette = "YlOrRd")

ggsave(file.path(output_dir, "03b_disease_by_age_group.png"), p3b, width = 12, height = 6, dpi = 150)
cat("Saved: 03b_disease_by_age_group.png\n")

# 3c. Study × Disease category (stacked)
p3c <- df %>%
  count(study, disease_category) %>%
  ggplot(aes(x = reorder(study, -n, sum), y = n, fill = disease_category)) +
  geom_col() +
  labs(title = "Dataset Composition by Disease Category", x = "Dataset", y = "# Subjects", fill = "Disease\nCategory") +
  scale_fill_brewer(palette = "Set3")

ggsave(file.path(output_dir, "03c_study_by_disease.png"), p3c, width = 10, height = 6, dpi = 150)
cat("Saved: 03c_study_by_disease.png\n")

# 3d. Age × Disease category (boxplot)
p3d <- df_age %>%
  ggplot(aes(x = disease_category, y = age, fill = disease_category)) +
  geom_boxplot(alpha = 0.7, show.legend = FALSE) +
  geom_jitter(width = 0.2, alpha = 0.4, size = 1.5) +
  labs(title = "Age Distribution by Disease Category", x = "Disease Category", y = "Age") +
  scale_fill_brewer(palette = "Set3")

ggsave(file.path(output_dir, "03d_age_by_disease_boxplot.png"), p3d, width = 11, height = 6, dpi = 150)
cat("Saved: 03d_age_by_disease_boxplot.png\n")

# 3e. Heatmap: Disease category × Sex × Age group (count)
p3e <- df %>%
  filter(!is.na(age_group), sex_clean != "NA/Unknown") %>%
  count(disease_category, sex_clean, age_group) %>%
  ggplot(aes(x = age_group, y = disease_category, fill = n)) +
  geom_tile(color = "white", linewidth = 0.5) +
  geom_text(aes(label = n), size = 4) +
  facet_wrap(~sex_clean) +
  labs(
    title = "Subject Counts: Disease Category x Age Group x Sex",
    x = "Age Group", y = "Disease Category", fill = "Count"
  ) +
  scale_fill_gradient(low = "#FFF7BC", high = "#D95F0E")

ggsave(file.path(output_dir, "03e_heatmap_disease_age_sex.png"), p3e, width = 12, height = 7, dpi = 150)
cat("Saved: 03e_heatmap_disease_age_sex.png\n")

# ============================================================
# Summary table
# ============================================================
cat("\n========== DATA SUMMARY ==========\n")
cat("Total subjects:", nrow(df), "\n")
cat("Datasets:", paste(unique(df$study), collapse = ", "), "\n")
cat("\nPer dataset:\n")
print(table(df$study))
cat("\nDisease categories:\n")
print(table(df$disease_category))
cat("\nSex:\n")
print(table(df$sex_clean))
cat("\nAge (non-NA):\n")
print(summary(df_age$age))
cat("\nAll plots saved to:", normalizePath(output_dir), "\n")
