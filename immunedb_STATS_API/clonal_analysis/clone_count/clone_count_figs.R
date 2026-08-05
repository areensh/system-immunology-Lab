library(jsonlite)
library(ggplot2)
library(dplyr)
library(tidyr)

setwd("/home/user/system-immunology-Lab/immunedb_STATS_API/clonal/clone_count")

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

orig_colors <- c(
  "healthy"="#2ca02c", "COVID Naive"="#1f77b4",
  "mild"="#aec7e8", "non-severe"="#6baed6",
  "Early phase-Stable"="#e377c2", "Early phase-Improving"="#f7b6d2",
  "severe"="#d62728", "Early phase hypoxaemia"="#ff7f0e",
  "Recovered"="#bcbd22", "COVID recovered"="#dbdb8d",
  "Recovering post-ICU"="#8c564b", "Recovering post-ICU -Improving"="#c49c94",
  "Recovering without ICU-Improving"="#e7ba52"
)

sex_colors <- c("Male" = "#4A90D9", "Female" = "#E85D75")
age_colors <- c("18-30"="#C6DBEF","31-50"="#6BAED6","51-65"="#2171B5","66+"="#08306B")

compact_legend <- theme(
  legend.position = "bottom",
  legend.title = element_text(size = 11),
  legend.text = element_text(size = 9),
  legend.key.size = unit(0.4, "cm"),
  legend.spacing.x = unit(0.15, "cm"),
  legend.margin = margin(0, 0, 0, 0)
)

base_theme <- theme_minimal(base_size = 16) +
  theme(
    axis.title = element_text(size = 15),
    axis.text = element_text(size = 13),
    axis.text.x = element_text(angle = 30, hjust = 1),
    strip.text = element_text(face = "bold", size = 14),
    plot.margin = margin(10, 15, 10, 15)
  ) +
  compact_legend

theme_set(base_theme)

# ---- Helper to parse clone_count JSON (per-sample data) ----
parse_clone_count <- function(path) {
  raw <- fromJSON(path, simplifyDataFrame = FALSE)
  do.call(rbind, lapply(raw$Result, function(entry) {
    rep <- entry$repertoire
    keys <- trimws(rep$meta_key)
    vals <- trimws(rep$meta_value)
    cnt <- entry$statistics[[1]]$stats_value[[1]]$count

    age_idx <- which(keys == "Age minimum")
    ds_idx <- which(keys == "disease_stage")
    sex_idx <- which(keys == "sex")
    tissue_idx <- which(keys == "tissue")

    data.frame(
      repertoire_id = rep$repertoire_id,
      clone_count = cnt,
      age = if (length(age_idx)) as.numeric(vals[age_idx]) else NA_real_,
      disease_raw = if (length(ds_idx)) vals[ds_idx] else NA_character_,
      sex = if (length(sex_idx)) vals[sex_idx] else NA_character_,
      tissue = if (length(tissue_idx)) vals[tissue_idx] else NA_character_,
      stringsAsFactors = FALSE
    )
  }))
}

# Load disease+tissue (per-sample rows)
df <- parse_clone_count("data/clone_count_disease_tissue.json")

# Add from sex file
df_sex <- parse_clone_count("data/clone_count_sex_disease_tissue.json")
missing_sex <- df_sex %>% filter(!repertoire_id %in% df$repertoire_id)
if (nrow(missing_sex) > 0) df <- bind_rows(df, missing_sex)

# Add from age file
df_age <- parse_clone_count("data/clone_count_age_disease_tissue.json")

cat("Total rows before filtering:", nrow(df), "\n")

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

# Blood-only filter
df <- df %>% filter(tissue %in% c("blood","PBL","Peripheral blood"))

cat("After blood filter:", nrow(df), "rows,", length(unique(df$repertoire_id)), "subjects\n")

# Per-sample data: aggregate to one value per subject (median across samples)
df <- df %>%
  group_by(repertoire_id, disease_raw, study) %>%
  summarise(clone_count = median(clone_count), .groups = "drop")

# Merge sex from sex file (also per-sample, take first non-NA)
df_sex_blood <- df_sex %>%
  filter(tissue %in% c("blood","PBL","Peripheral blood")) %>%
  group_by(repertoire_id) %>%
  summarise(sex = first(na.omit(sex)), .groups = "drop")
df <- df %>% left_join(df_sex_blood, by = "repertoire_id")

# Merge age from age file
df_age_blood <- df_age %>%
  filter(tissue %in% c("blood","PBL","Peripheral blood")) %>%
  group_by(repertoire_id) %>%
  summarise(age = first(na.omit(age)), .groups = "drop")
df <- df %>% left_join(df_age_blood, by = "repertoire_id")

cat("After aggregation:", nrow(df), "subjects\n")

df$disease_cat <- factor(map_disease(df$disease_raw), levels = disease_order)
df$sex_clean <- case_when(
  tolower(df$sex) %in% c("male") ~ "Male",
  tolower(df$sex) %in% c("female") ~ "Female",
  TRUE ~ NA_character_
)
df$age_group <- cut(df$age, breaks = c(0, 30, 50, 65, 100),
                    labels = c("18-30", "31-50", "51-65", "66+"), include.lowest = TRUE)

df <- df %>% filter(!is.na(disease_cat))
cat("\nSubjects per disease category:\n")
df %>% count(disease_cat) %>% print()

used_labels <- sort(unique(df$disease_raw))
orig_colors_used <- orig_colors[names(orig_colors) %in% used_labels]

# ============================================================
# Fig 07: Clone Count (Clonal Diversity) by Disease Category
# ============================================================
p07 <- ggplot(df, aes(x = disease_cat, y = clone_count, fill = disease_cat)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA, linewidth = 0.6) +
  geom_jitter(aes(color = disease_raw), width = 0.2, alpha = 0.7, size = 2.5) +
  stat_summary(fun = mean, geom = "point", shape = 18, size = 4, color = "red") +
  stat_summary(fun.data = function(x) {
    m <- mean(x); s <- sd(x)
    data.frame(y = m, ymin = m - s, ymax = m + s)
  }, geom = "errorbar", width = 0.3, color = "red", linewidth = 0.7) +
  scale_fill_brewer(palette = "Set3", guide = "none") +
  scale_color_manual(values = orig_colors_used, name = "Original Label") +
  guides(color = guide_legend(nrow = 2, override.aes = list(size = 3))) +
  labs(x = "Disease Category", y = "Clone Count (unique clones)")
ggsave("plots/07_clone_count_by_disease.png", p07, width = 12, height = 8, dpi = 200)
cat("\nFigure 07 saved.\n")

# ============================================================
# Fig 08: Clone Count by Age Group, faceted by Disease
# ============================================================
df_age_plot <- df %>% filter(!is.na(age_group))

p08 <- ggplot(df_age_plot, aes(x = age_group, y = clone_count, fill = age_group)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA, linewidth = 0.6) +
  geom_jitter(aes(color = disease_raw), width = 0.2, alpha = 0.7, size = 2.5) +
  stat_summary(fun = mean, geom = "point", shape = 18, size = 4, color = "red") +
  stat_summary(fun.data = function(x) {
    m <- mean(x); s <- sd(x)
    data.frame(y = m, ymin = m - s, ymax = m + s)
  }, geom = "errorbar", width = 0.3, color = "red", linewidth = 0.7) +
  facet_wrap(~disease_cat, nrow = 2, ncol = 3) +
  scale_fill_manual(values = age_colors, guide = "none") +
  scale_color_manual(values = orig_colors_used, name = "Original Label") +
  guides(color = guide_legend(nrow = 2, override.aes = list(size = 3))) +
  labs(x = "Age Group", y = "Clone Count (unique clones)")
ggsave("plots/08_clone_count_by_age_disease.png", p08, width = 14, height = 10, dpi = 200)
cat("Figure 08 saved.\n")

# ============================================================
# Fig 09: Clone Count by Sex, faceted by Disease
# ============================================================
df_sex_plot <- df %>% filter(!is.na(sex_clean))

p09 <- ggplot(df_sex_plot, aes(x = sex_clean, y = clone_count, fill = sex_clean)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA, linewidth = 0.6) +
  geom_jitter(aes(color = disease_raw), width = 0.2, alpha = 0.7, size = 2.5) +
  stat_summary(fun = mean, geom = "point", shape = 18, size = 4, color = "red") +
  stat_summary(fun.data = function(x) {
    m <- mean(x); s <- sd(x)
    data.frame(y = m, ymin = m - s, ymax = m + s)
  }, geom = "errorbar", width = 0.3, color = "red", linewidth = 0.7) +
  facet_wrap(~disease_cat, nrow = 2, ncol = 3) +
  scale_fill_manual(values = sex_colors, guide = "none") +
  scale_color_manual(values = orig_colors_used, name = "Original Label") +
  guides(color = guide_legend(nrow = 2, override.aes = list(size = 3))) +
  labs(x = "Sex", y = "Clone Count (unique clones)")
ggsave("plots/09_clone_count_by_sex_disease.png", p09, width = 14, height = 10, dpi = 200)
cat("Figure 09 saved.\n")

# Summary stats
cat("\n========== CLONE COUNT SUMMARY ==========\n")
df %>% group_by(disease_cat) %>%
  summarise(n = n(), median = median(clone_count), mean = round(mean(clone_count)),
            min = min(clone_count), max = max(clone_count), .groups = "drop") %>%
  print()

cat("\nBy sex:\n")
df %>% filter(!is.na(sex_clean)) %>%
  group_by(disease_cat, sex_clean) %>%
  summarise(n = n(), median = median(clone_count), .groups = "drop") %>%
  print()
