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
    plot.title = element_text(face = "bold", hjust = 0.5, size = 18),
    axis.title = element_text(size = 15),
    axis.text = element_text(size = 13),
    axis.text.x = element_text(angle = 30, hjust = 1),
    strip.text = element_text(face = "bold", size = 14),
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
# Merge age into main df
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

used_labels <- sort(unique(df$disease_raw))
orig_colors_used <- orig_colors[names(orig_colors) %in% used_labels]

# ---- Pivot to long for faceted boxplots ----
df_long <- df %>%
  select(repertoire_id, disease_cat, disease_raw, sex_clean, age_group,
         top10_aa, top100_aa, top1000_aa) %>%
  pivot_longer(cols = c(top10_aa, top100_aa, top1000_aa),
               names_to = "top_tier", values_to = "avg_cdr3_len") %>%
  mutate(top_tier = case_when(
    top_tier == "top10_aa" ~ "Top 10",
    top_tier == "top100_aa" ~ "Top 100",
    top_tier == "top1000_aa" ~ "Top 1000"
  )) %>%
  mutate(top_tier = factor(top_tier, levels = c("Top 10", "Top 100", "Top 1000")))

# ============================================================
# Fig 12: CDR3 AA Length by Disease Category (3 panels: Top10, Top100, Top1000)
# ============================================================
p12 <- ggplot(df_long, aes(x = disease_cat, y = avg_cdr3_len, fill = disease_cat)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA, linewidth = 0.6) +
  geom_jitter(aes(color = disease_raw), width = 0.2, alpha = 0.7, size = 2) +
  stat_summary(fun = mean, geom = "point", shape = 18, size = 4, color = "red") +
  stat_summary(fun.data = function(x) {
    m <- mean(x); s <- sd(x)
    data.frame(y = m, ymin = m - s, ymax = m + s)
  }, geom = "errorbar", width = 0.3, color = "red", linewidth = 0.7) +
  facet_wrap(~top_tier, nrow = 1) +
  scale_fill_brewer(palette = "Set3", guide = "none") +
  scale_y_continuous() +
  scale_color_manual(values = orig_colors_used, name = "Original Label") +
  guides(color = guide_legend(nrow = 2, override.aes = list(size = 3))) +
  labs(
    title = "Average CDR3 AA Length in Top Expanded Clones by Disease Category",
    x = "Disease Category", y = "Average CDR3 Length (AA)"
  )
ggsave("plots/12_cdr3_length_by_disease.png", p12, width = 18, height = 8, dpi = 200)
cat("\nFigure 12 saved.\n")

# ============================================================
# Fig 13: CDR3 AA Length by Age Group, faceted by Disease
# ============================================================
df_age_plot <- df %>% filter(!is.na(age_group))

df_age_long <- df_age_plot %>%
  select(repertoire_id, disease_cat, disease_raw, age_group,
         top10_aa, top100_aa, top1000_aa) %>%
  pivot_longer(cols = c(top10_aa, top100_aa, top1000_aa),
               names_to = "top_tier", values_to = "avg_cdr3_len") %>%
  mutate(top_tier = case_when(
    top_tier == "top10_aa" ~ "Top 10",
    top_tier == "top100_aa" ~ "Top 100",
    top_tier == "top1000_aa" ~ "Top 1000"
  )) %>%
  mutate(top_tier = factor(top_tier, levels = c("Top 10", "Top 100", "Top 1000")))

p13 <- ggplot(df_age_long, aes(x = age_group, y = avg_cdr3_len, fill = age_group)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA, linewidth = 0.6) +
  geom_jitter(aes(color = disease_raw), width = 0.2, alpha = 0.7, size = 2.5) +
  stat_summary(fun = mean, geom = "point", shape = 18, size = 4, color = "red") +
  stat_summary(fun.data = function(x) {
    m <- mean(x); s <- sd(x)
    data.frame(y = m, ymin = m - s, ymax = m + s)
  }, geom = "errorbar", width = 0.3, color = "red", linewidth = 0.7) +
  facet_grid(top_tier ~ disease_cat) +
  scale_fill_manual(values = age_colors, guide = "none") +
  scale_color_manual(values = orig_colors_used, name = "Original Label") +
  guides(color = guide_legend(nrow = 2, override.aes = list(size = 3))) +
  labs(
    title = "Average CDR3 AA Length by Age Group and Disease Category",
    x = "Age Group", y = "Average CDR3 Length (AA)"
  )
ggsave("plots/13_cdr3_length_by_age_disease.png", p13, width = 20, height = 14, dpi = 200)
cat("Figure 13 saved.\n")

# ============================================================
# Fig 14: CDR3 AA Length by Sex, faceted by Disease
# ============================================================
df_sex_plot <- df %>% filter(!is.na(sex_clean))

df_sex_long <- df_sex_plot %>%
  select(repertoire_id, disease_cat, disease_raw, sex_clean,
         top10_aa, top100_aa, top1000_aa) %>%
  pivot_longer(cols = c(top10_aa, top100_aa, top1000_aa),
               names_to = "top_tier", values_to = "avg_cdr3_len") %>%
  mutate(top_tier = case_when(
    top_tier == "top10_aa" ~ "Top 10",
    top_tier == "top100_aa" ~ "Top 100",
    top_tier == "top1000_aa" ~ "Top 1000"
  )) %>%
  mutate(top_tier = factor(top_tier, levels = c("Top 10", "Top 100", "Top 1000")))

p14 <- ggplot(df_sex_long, aes(x = sex_clean, y = avg_cdr3_len, fill = sex_clean)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA, linewidth = 0.6) +
  geom_jitter(aes(color = disease_raw), width = 0.2, alpha = 0.7, size = 2.5) +
  stat_summary(fun = mean, geom = "point", shape = 18, size = 4, color = "red") +
  stat_summary(fun.data = function(x) {
    m <- mean(x); s <- sd(x)
    data.frame(y = m, ymin = m - s, ymax = m + s)
  }, geom = "errorbar", width = 0.3, color = "red", linewidth = 0.7) +
  facet_grid(top_tier ~ disease_cat) +
  scale_fill_manual(values = sex_colors, guide = "none") +
  scale_color_manual(values = orig_colors_used, name = "Original Label") +
  guides(color = guide_legend(nrow = 2, override.aes = list(size = 3))) +
  labs(
    title = "Average CDR3 AA Length by Sex and Disease Category",
    x = "Sex", y = "Average CDR3 Length (AA)"
  )
ggsave("plots/14_cdr3_length_by_sex_disease.png", p14, width = 20, height = 14, dpi = 200)
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
