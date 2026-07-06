library(jsonlite)
library(ggplot2)
library(dplyr)
library(tidyr)

setwd("/home/user/system-immunology-Lab/immunedb_STATS_API/clonal/cdr3")

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

tier_colors <- c(
  "Top 10"   = "#d62728",
  "Top 100"  = "#ff7f0e",
  "Top 1000" = "#2ca02c"
)

sex_colors <- c("Male" = "#4A90D9", "Female" = "#E85D75")
age_colors <- c("18-30"="#C6DBEF","31-50"="#6BAED6","51-65"="#2171B5","66+"="#08306B")

compact_legend <- theme(
  legend.position = "bottom",
  legend.title = element_text(size = 16, face = "bold"),
  legend.text = element_text(size = 14),
  legend.key.size = unit(0.6, "cm"),
  legend.spacing.x = unit(0.2, "cm"),
  legend.margin = margin(5, 0, 5, 0)
)

base_theme <- theme_minimal(base_size = 20) +
  theme(
    axis.title = element_text(size = 20, face = "bold"),
    axis.text = element_text(size = 16),
    axis.text.x = element_blank(),
    axis.ticks.x = element_blank(),
    strip.text = element_text(face = "bold", size = 18),
    plot.margin = margin(10, 15, 10, 15)
  ) +
  compact_legend

theme_set(base_theme)

# ---- Parse CDR3 JSON ----
parse_cdr3 <- function(path) {
  raw <- fromJSON(path, simplifyDataFrame = FALSE)
  do.call(rbind, lapply(raw$Result, function(entry) {
    rep <- entry$repertoire
    keys <- trimws(rep$meta_key)
    vals <- trimws(rep$meta_value)
    sv <- entry$statistics[[1]]$stats_value

    top10_aa <- sv[[which(sapply(sv, function(x) x$clone_id) == "Top_10_AA")]]$count
    top100_aa <- sv[[which(sapply(sv, function(x) x$clone_id) == "Top_100_AA")]]$count
    top1000_aa <- sv[[which(sapply(sv, function(x) x$clone_id) == "Top_1000_AA")]]$count

    age_idx <- which(keys == "Age minimum")
    ds_idx <- which(keys == "disease_stage")
    sex_idx <- which(keys == "sex")
    tissue_idx <- which(keys == "tissue")

    data.frame(
      repertoire_id = rep$repertoire_id,
      top10_aa = top10_aa,
      top100_aa = top100_aa,
      top1000_aa = top1000_aa,
      age = if (length(age_idx)) as.numeric(vals[age_idx]) else NA_real_,
      disease_raw = if (length(ds_idx)) vals[ds_idx] else NA_character_,
      sex = if (length(sex_idx)) vals[sex_idx] else NA_character_,
      tissue = if (length(tissue_idx)) vals[tissue_idx] else NA_character_,
      stringsAsFactors = FALSE
    )
  }))
}

# Load disease+tissue (most subjects)
df <- parse_cdr3("data/CDR3_tissue_disease.json")

# Add from sex file
df_sex <- parse_cdr3("data/CDR3_sex_disease_tissue.json")
missing_sex <- df_sex %>% filter(!repertoire_id %in% df$repertoire_id)
if (nrow(missing_sex) > 0) df <- bind_rows(df, missing_sex)

# Add from age file
df_age <- parse_cdr3("data/CDR3_age_disease_tissue.json")
df <- df %>% left_join(df_age %>% select(repertoire_id, age) %>% distinct(),
                        by = "repertoire_id", suffix = c("", ".age"))
df$age <- ifelse(is.na(df$age), df$age.age, df$age)
df$age.age <- NULL

# Merge sex from sex file
df <- df %>% left_join(df_sex %>% select(repertoire_id, sex) %>% distinct(),
                        by = "repertoire_id", suffix = c("", ".sex"))
df$sex <- ifelse(is.na(df$sex), df$sex.sex, df$sex)
df$sex.sex <- NULL

cat("Total entries:", nrow(df), "\n")

# Study labels
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

# Standard exclusions
df <- df %>% filter(!repertoire_id %in% c(
  "covid_vaccine_new-Fb","covid_vaccine_new-Water",
  "lp16_Igblast-D159","lp16_Igblast-D154","lp16_Igblast-Hu-1"))

cd3_healthy <- df %>% filter(study=="CD3", grepl("healthy",disease_raw,ignore.case=TRUE)) %>%
  pull(repertoire_id) %>% unique()
df <- df %>% filter(!repertoire_id %in% cd3_healthy)

# Blood-only
df <- df %>% filter(tissue %in% c("blood","PBL","Peripheral blood"))

df$disease_cat <- factor(map_disease(df$disease_raw), levels = disease_order)
df$sex_clean <- case_when(
  tolower(df$sex) %in% c("male") ~ "Male",
  tolower(df$sex) %in% c("female") ~ "Female",
  TRUE ~ NA_character_
)
df$age_group <- cut(df$age, breaks = c(0, 30, 50, 65, 100),
                    labels = c("18-30", "31-50", "51-65", "66+"), include.lowest = TRUE)

df <- df %>% filter(!is.na(disease_cat))
cat("After filtering:", nrow(df), "subjects\n")
cat("\nPer disease:\n")
df %>% count(disease_cat) %>% print()

# Sort subjects by top10_aa within each disease category (descending)
df <- df %>%
  arrange(disease_cat, desc(top10_aa)) %>%
  mutate(subj_order = row_number())

# ---- Pivot to long for grouped bars ----
make_cdr3_long <- function(data) {
  data %>%
    select(repertoire_id, subj_order, disease_cat, disease_raw, sex_clean, age_group,
           top10_aa, top100_aa, top1000_aa) %>%
    pivot_longer(cols = c(top10_aa, top100_aa, top1000_aa),
                 names_to = "top_tier", values_to = "avg_cdr3_len") %>%
    mutate(top_tier = case_when(
      top_tier == "top10_aa" ~ "Top 10",
      top_tier == "top100_aa" ~ "Top 100",
      top_tier == "top1000_aa" ~ "Top 1000"
    )) %>%
    mutate(top_tier = factor(top_tier, levels = c("Top 10", "Top 100", "Top 1000")))
}

df_long <- make_cdr3_long(df)

# ============================================================
# Fig 12: CDR3 AA Length - Per-subject bars, faceted by tier (rows) and disease (cols)
# ============================================================
p12 <- ggplot(df_long,
              aes(x = reorder(repertoire_id, subj_order), y = avg_cdr3_len, fill = top_tier)) +
  geom_bar(stat = "identity", width = 0.9) +
  facet_grid(top_tier ~ disease_cat, scales = "free_x", space = "free_x") +
  scale_fill_manual(values = tier_colors, name = "Clone Tier") +
  scale_y_continuous(expand = c(0, 0)) +
  coord_cartesian(ylim = c(0, max(df_long$avg_cdr3_len, na.rm = TRUE) + 1)) +
  labs(x = NULL, y = "Average CDR3 Length (AA)") +
  theme(strip.text = element_text(face = "bold", size = 20))
ggsave("plots/12_cdr3_length_by_disease.png", p12, width = 14, height = 10, dpi = 400)
cat("\nFigure 12 saved.\n")

# ============================================================
# Fig 13: CDR3 AA Length - Per-subject bars by Age + Disease
# ============================================================
df_age_plot <- df %>% filter(!is.na(age_group))
df_age_plot <- df_age_plot %>%
  arrange(disease_cat, age_group, desc(top10_aa)) %>%
  mutate(subj_order = row_number())

df_age_long <- make_cdr3_long(df_age_plot)

p13 <- ggplot(df_age_long,
              aes(x = reorder(repertoire_id, subj_order), y = avg_cdr3_len, fill = top_tier)) +
  geom_bar(stat = "identity", width = 0.9) +
  facet_grid(top_tier ~ disease_cat + age_group, scales = "free_x", space = "free_x") +
  scale_fill_manual(values = tier_colors, name = "Clone Tier") +
  scale_y_continuous(expand = c(0, 0)) +
  coord_cartesian(ylim = c(0, max(df_age_long$avg_cdr3_len, na.rm = TRUE) + 1)) +
  labs(x = NULL, y = "Average CDR3 Length (AA)") +
  theme(strip.text = element_text(face = "bold", size = 14),
        panel.spacing.x = unit(0.3, "lines"))
ggsave("plots/13_cdr3_length_by_age_disease.png", p13, width = 18, height = 10, dpi = 400)
cat("Figure 13 saved.\n")

# ============================================================
# Fig 14: CDR3 AA Length - Per-subject bars by Sex + Disease
# ============================================================
df_sex_plot <- df %>% filter(!is.na(sex_clean))
df_sex_plot <- df_sex_plot %>%
  arrange(disease_cat, sex_clean, desc(top10_aa)) %>%
  mutate(subj_order = row_number())

df_sex_long <- make_cdr3_long(df_sex_plot)

p14 <- ggplot(df_sex_long,
              aes(x = reorder(repertoire_id, subj_order), y = avg_cdr3_len, fill = top_tier)) +
  geom_bar(stat = "identity", width = 0.9) +
  facet_grid(top_tier ~ disease_cat + sex_clean, scales = "free_x", space = "free_x") +
  scale_fill_manual(values = tier_colors, name = "Clone Tier") +
  scale_y_continuous(expand = c(0, 0)) +
  coord_cartesian(ylim = c(0, max(df_sex_long$avg_cdr3_len, na.rm = TRUE) + 1)) +
  labs(x = NULL, y = "Average CDR3 Length (AA)") +
  theme(strip.text = element_text(face = "bold", size = 16),
        panel.spacing.x = unit(0.3, "lines"))
ggsave("plots/14_cdr3_length_by_sex_disease.png", p14, width = 16, height = 10, dpi = 400)
cat("Figure 14 saved.\n")

# Summary stats
cat("\n========== CDR3 AA LENGTH SUMMARY ==========\n")
df %>%
  group_by(disease_cat) %>%
  summarise(
    n = n(),
    median_top10 = round(median(top10_aa), 2),
    median_top100 = round(median(top100_aa), 2),
    median_top1000 = round(median(top1000_aa), 2),
    .groups = "drop"
  ) %>%
  print()

cat("\nBy sex:\n")
df %>% filter(!is.na(sex_clean)) %>%
  group_by(disease_cat, sex_clean) %>%
  summarise(n = n(), median_top10 = round(median(top10_aa), 2),
            median_top100 = round(median(top100_aa), 2), .groups = "drop") %>%
  print()
