library(jsonlite)
library(ggplot2)
library(dplyr)
library(tidyr)

json_all <- fromJSON("metadata_ALL.json", simplifyDataFrame = FALSE)

meta_long_list <- lapply(json_all$Result, function(entry) {
  rep <- entry$repertoire
  rid <- rep$repertoire_id
  keys <- trimws(rep$meta_key)
  vals <- trimws(rep$meta_value)
  data.frame(repertoire_id = rid, meta_key = keys, meta_value = vals, stringsAsFactors = FALSE)
})

df <- bind_rows(meta_long_list)
df$study <- sub("-.*", "", df$repertoire_id)

theme_set(theme_minimal(base_size = 16) + theme(
  plot.title = element_text(face = "bold", hjust = 0.5, size = 18),
  axis.title = element_text(size = 15), axis.text = element_text(size = 13),
  axis.text.x = element_text(angle = 30, hjust = 1, size = 14),
  legend.text = element_text(size = 13), legend.title = element_text(size = 14)
))

# Total subjects per study
total_per_study <- df %>% distinct(repertoire_id, study) %>% count(study, name = "total")
study_order <- total_per_study %>% arrange(-total) %>% pull(study)

key_fields <- c("disease_stage", "Age minimum", "sex")
field_labels <- c("disease_stage" = "Disease Stage", "Age minimum" = "Age", "sex" = "Sex")

# For each study x field: count reported
df_key <- df %>%
  filter(meta_key %in% key_fields) %>%
  distinct(repertoire_id, study, meta_key, meta_value) %>%
  mutate(is_reported = meta_value != "NA" & !is.na(meta_value)) %>%
  filter(is_reported) %>%
  distinct(repertoire_id, study, meta_key) %>%
  count(study, meta_key, name = "reported")

# Build grid of all study x field combos
all_combos <- expand.grid(study = unique(total_per_study$study),
                          meta_key = key_fields, stringsAsFactors = FALSE)

df_grid <- all_combos %>%
  left_join(total_per_study, by = "study") %>%
  left_join(df_key, by = c("study", "meta_key")) %>%
  mutate(reported = ifelse(is.na(reported), 0, reported),
         missing = total - reported)

df_plot4 <- df_grid %>%
  pivot_longer(cols = c("reported", "missing"), names_to = "status", values_to = "n") %>%
  filter(n > 0) %>%
  mutate(
    status = factor(status, levels = c("missing", "reported"), labels = c("Missing", "Reported")),
    field_label = factor(field_labels[meta_key], levels = c("Disease Stage", "Age", "Sex")),
    study = factor(study, levels = study_order)
  )

p4 <- ggplot(df_plot4, aes(x = study, y = n, fill = status)) +
  geom_col(position = "stack", color = "white", linewidth = 0.3) +
  geom_text(aes(label = n), position = position_stack(vjust = 0.5),
            size = 4.5, fontface = "bold") +
  facet_wrap(~field_label, ncol = 1) +
  labs(title = "Completeness of Key Clinical Variables per Dataset",
       x = "Dataset", y = "# Subjects", fill = "") +
  scale_fill_manual(values = c("Reported" = "#5B9BD5", "Missing" = "#D9D9D9")) +
  theme(legend.position = "bottom",
        strip.text = element_text(size = 15, face = "bold"))

ggsave("plots/04_key_variable_completeness.png", p4, width = 14, height = 12, dpi = 200)
cat("Saved: 04_key_variable_completeness.png\n")

# ============================================================
# FIGURE 5: Disease spectrum coverage
# ============================================================

df_disease <- df %>%
  filter(meta_key == "disease_stage", meta_value != "NA") %>%
  distinct(repertoire_id, study, meta_value) %>%
  rename(disease_raw = meta_value)

df_disease$disease_category <- case_when(
  grepl("healthy", df_disease$disease_raw, ignore.case = TRUE) ~ "Healthy",
  grepl("naive", df_disease$disease_raw, ignore.case = TRUE) ~ "COVID Naive",
  grepl("non-severe", df_disease$disease_raw, ignore.case = TRUE) ~ "Mild",
  grepl("^mild$", df_disease$disease_raw, ignore.case = TRUE) ~ "Mild",
  grepl("recover", df_disease$disease_raw, ignore.case = TRUE) ~ "Recovered",
  grepl("^severe$", df_disease$disease_raw, ignore.case = TRUE) ~ "Severe",
  grepl("hypox", df_disease$disease_raw, ignore.case = TRUE) ~ "Severe",
  grepl("Stable|Improving", df_disease$disease_raw, ignore.case = TRUE) ~ "Moderate",
  grepl("post-ICU", df_disease$disease_raw, ignore.case = TRUE) ~ "Moderate",
  TRUE ~ "Other"
)

df_disease$source_type <- ifelse(
  df_disease$study == "lp16_Igblast",
  "Non-COVID (lp16_Igblast)",
  "COVID datasets"
)

df_disease$disease_category <- factor(df_disease$disease_category,
  levels = c("Healthy", "COVID Naive", "Mild", "Moderate", "Severe", "Recovered"))

df_spectrum <- df_disease %>% count(disease_category, source_type, name = "n")

p5 <- ggplot(df_spectrum, aes(x = disease_category, y = n, fill = source_type)) +
  geom_col(position = "stack", color = "white", linewidth = 0.4) +
  geom_text(aes(label = n), position = position_stack(vjust = 0.5),
            size = 5.5, fontface = "bold") +
  labs(title = "Disease Spectrum Coverage: Cross-Study Cohort Assembly",
       subtitle = "Healthy controls from lp16_Igblast complement COVID-19 datasets",
       x = "Disease Category", y = "# Subjects", fill = "Source") +
  scale_fill_manual(values = c("COVID datasets" = "#fc8d62",
                               "Non-COVID (lp16_Igblast)" = "#66c2a5")) +
  theme(legend.position = "bottom",
        plot.subtitle = element_text(hjust = 0.5, size = 14, color = "grey30"))

ggsave("plots/05_disease_spectrum_coverage.png", p5, width = 13, height = 8, dpi = 200)
cat("Saved: 05_disease_spectrum_coverage.png\n")

# ============================================================
# FIGURE 6: Final assembled cohort
# ============================================================

selected_studies <- c("covid19", "covid_db2", "Covid19_db3", "vaccine2",
                      "covid_vaccine_new", "lp16_Igblast")

df_cohort <- df_disease %>% filter(study %in% selected_studies)
df_cohort_summary <- df_cohort %>% count(disease_category, study, name = "n")

study_colors <- c(
  "Covid19_db3" = "#66c2a5", "covid_db2" = "#fc8d62", "covid19" = "#8da0cb",
  "vaccine2" = "#e78ac3", "covid_vaccine_new" = "#a6d854", "lp16_Igblast" = "#ffd92f"
)

p6 <- ggplot(df_cohort_summary, aes(x = disease_category, y = n, fill = study)) +
  geom_col(position = "stack", color = "white", linewidth = 0.4) +
  geom_text(aes(label = n), position = position_stack(vjust = 0.5),
            size = 4.5, fontface = "bold") +
  labs(title = "Assembled Cohort: Disease Categories by Contributing Dataset",
       x = "Disease Category", y = "# Subjects", fill = "Dataset") +
  scale_fill_manual(values = study_colors) +
  theme(legend.position = "bottom")

ggsave("plots/06_assembled_cohort.png", p6, width = 14, height = 8, dpi = 200)
cat("Saved: 06_assembled_cohort.png\n")

cat("\n=== Assembled Cohort Summary ===\n")
cat("Total subjects:", nrow(df_cohort), "\n")
cat("Datasets:", length(unique(df_cohort$study)), "\n\n")
print(df_cohort %>% count(disease_category))
print(df_cohort %>% count(study))
