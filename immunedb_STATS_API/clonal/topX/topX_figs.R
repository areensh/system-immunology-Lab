library(jsonlite)
library(ggplot2)
library(dplyr)
library(tidyr)

setwd("/home/user/system-immunology-Lab/immunedb_STATS_API/clonal/topX")

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

# ---- Parse topX JSON ----
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

    age_idx <- which(keys == "Age minimum")
    ds_idx <- which(keys == "disease_stage")
    sex_idx <- which(keys == "sex")
    tissue_idx <- which(keys == "tissue")

    data.frame(
      repertoire_id = rep$repertoire_id,
      total_copies = total,
      top10 = top10,
      top100 = top100,
      top1000 = top1000,
      top10_pct = round(top10 / total * 100, 2),
      top100_pct = round(top100 / total * 100, 2),
      top1000_pct = round(top1000 / total * 100, 2),
      age = if (length(age_idx)) as.numeric(vals[age_idx]) else NA_real_,
      disease_raw = if (length(ds_idx)) vals[ds_idx] else NA_character_,
      sex = if (length(sex_idx)) vals[sex_idx] else NA_character_,
      tissue = if (length(tissue_idx)) vals[tissue_idx] else NA_character_,
      stringsAsFactors = FALSE
    )
  }))
}

df <- parse_topX("data/topX_disease_tissue.json")

df_sex <- parse_topX("data/topX_sex_disease_tissue.json")
missing_sex <- df_sex %>% filter(!repertoire_id %in% df$repertoire_id)
if (nrow(missing_sex) > 0) df <- bind_rows(df, missing_sex)

df_age <- parse_topX("data/topX_age_disease_tissue.json")

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

# Blood-only
df <- df %>% filter(tissue %in% c("blood","PBL","Peripheral blood"))

# Merge sex
df_sex_blood <- df_sex %>%
  filter(tissue %in% c("blood","PBL","Peripheral blood")) %>%
  group_by(repertoire_id) %>%
  summarise(sex = first(na.omit(sex)), .groups = "drop")
df <- df %>% left_join(df_sex_blood, by = "repertoire_id", suffix = c("", ".sex"))
df$sex <- ifelse(is.na(df$sex), df$sex.sex, df$sex)
df$sex.sex <- NULL

# Merge age
df_age_blood <- df_age %>%
  filter(tissue %in% c("blood","PBL","Peripheral blood")) %>%
  group_by(repertoire_id) %>%
  summarise(age = first(na.omit(age)), .groups = "drop")
df <- df %>% left_join(df_age_blood, by = "repertoire_id", suffix = c("", ".age"))
df$age <- ifelse(is.na(df$age), df$age.age, df$age)
df$age.age <- NULL

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
         top10_pct, top100_pct, top1000_pct) %>%
  pivot_longer(cols = c(top10_pct, top100_pct, top1000_pct),
               names_to = "top_tier", values_to = "pct") %>%
  mutate(top_tier = case_when(
    top_tier == "top10_pct" ~ "Top 10",
    top_tier == "top100_pct" ~ "Top 100",
    top_tier == "top1000_pct" ~ "Top 1000"
  )) %>%
  mutate(top_tier = factor(top_tier, levels = c("Top 10", "Top 100", "Top 1000")))

# ============================================================
# Fig 10: Top-X Clone Proportion by Disease Category
# ============================================================
p10 <- ggplot(df_long, aes(x = disease_cat, y = pct, fill = disease_cat)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA, linewidth = 0.6) +
  geom_jitter(aes(color = disease_raw), width = 0.2, alpha = 0.7, size = 2) +
  stat_summary(fun = mean, geom = "point", shape = 18, size = 4, color = "red") +
  stat_summary(fun.data = function(x) {
    m <- mean(x); s <- sd(x)
    data.frame(y = m, ymin = m - s, ymax = m + s)
  }, geom = "errorbar", width = 0.3, color = "red", linewidth = 0.7) +
  facet_wrap(~top_tier, nrow = 1) +
  scale_fill_brewer(palette = "Set3", guide = "none") +
  scale_color_manual(values = orig_colors_used, name = "Original Label") +
  guides(color = guide_legend(nrow = 2, override.aes = list(size = 3))) +
  labs(x = "Disease Category", y = "Proportion of Total Copies (%)")
ggsave("plots/10_topX_proportion_by_disease.png", p10, width = 18, height = 8, dpi = 200)
cat("\nFigure 10 saved.\n")

# ============================================================
# Fig 11: Top-X Clone Proportion by Age Group, faceted by Disease
# ============================================================
df_age_plot <- df %>% filter(!is.na(age_group))

df_age_long <- df_age_plot %>%
  select(repertoire_id, disease_cat, disease_raw, age_group,
         top10_pct, top100_pct, top1000_pct) %>%
  pivot_longer(cols = c(top10_pct, top100_pct, top1000_pct),
               names_to = "top_tier", values_to = "pct") %>%
  mutate(top_tier = case_when(
    top_tier == "top10_pct" ~ "Top 10",
    top_tier == "top100_pct" ~ "Top 100",
    top_tier == "top1000_pct" ~ "Top 1000"
  )) %>%
  mutate(top_tier = factor(top_tier, levels = c("Top 10", "Top 100", "Top 1000")))

p11 <- ggplot(df_age_long, aes(x = age_group, y = pct, fill = age_group)) +
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
  labs(x = "Age Group", y = "Proportion of Total Copies (%)")
ggsave("plots/11_topX_proportion_by_age_disease.png", p11, width = 20, height = 14, dpi = 200)
cat("Figure 11 saved.\n")

# ============================================================
# Fig 11b: Top-X Clone Proportion by Sex, faceted by Disease
# ============================================================
df_sex_plot <- df %>% filter(!is.na(sex_clean))

df_sex_long <- df_sex_plot %>%
  select(repertoire_id, disease_cat, disease_raw, sex_clean,
         top10_pct, top100_pct, top1000_pct) %>%
  pivot_longer(cols = c(top10_pct, top100_pct, top1000_pct),
               names_to = "top_tier", values_to = "pct") %>%
  mutate(top_tier = case_when(
    top_tier == "top10_pct" ~ "Top 10",
    top_tier == "top100_pct" ~ "Top 100",
    top_tier == "top1000_pct" ~ "Top 1000"
  )) %>%
  mutate(top_tier = factor(top_tier, levels = c("Top 10", "Top 100", "Top 1000")))

p11b <- ggplot(df_sex_long, aes(x = sex_clean, y = pct, fill = sex_clean)) +
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
  labs(x = "Sex", y = "Proportion of Total Copies (%)")
ggsave("plots/11b_topX_proportion_by_sex_disease.png", p11b, width = 20, height = 14, dpi = 200)
cat("Figure 11b saved.\n")

# Summary stats
cat("\n========== TOP-X CLONE PROPORTION SUMMARY ==========\n")
df %>%
  group_by(disease_cat) %>%
  summarise(
    n = n(),
    median_top10_pct = round(median(top10_pct), 2),
    median_top100_pct = round(median(top100_pct), 2),
    median_top1000_pct = round(median(top1000_pct), 2),
    .groups = "drop"
  ) %>%
  print()

cat("\nBy sex:\n")
df %>% filter(!is.na(sex_clean)) %>%
  group_by(disease_cat, sex_clean) %>%
  summarise(n = n(), median_top10_pct = round(median(top10_pct), 2),
            median_top100_pct = round(median(top100_pct), 2), .groups = "drop") %>%
  print()
