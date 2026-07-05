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

tier_colors <- c(
  "Top 10"       = "#d62728",
  "Top 11-100"   = "#ff7f0e",
  "Top 101-1000" = "#2ca02c",
  "Remaining"    = "#aec7e8"
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

base_theme <- theme_minimal(base_size = 14) +
  theme(
    axis.title = element_text(size = 14),
    axis.text = element_text(size = 10),
    axis.text.x = element_text(angle = 90, hjust = 1, vjust = 0.5, size = 7),
    strip.text = element_text(face = "bold", size = 13),
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

# ---- Compute stacked tiers (non-overlapping) ----
df <- df %>% mutate(
  tier_top10     = top10_pct,
  tier_11_100    = top100_pct - top10_pct,
  tier_101_1000  = top1000_pct - top100_pct,
  tier_remaining = 100 - top1000_pct
)

# Sort subjects by top10_pct within each disease category
df <- df %>%
  arrange(disease_cat, desc(top10_pct)) %>%
  mutate(subj_order = row_number())

# ---- Pivot to stacked long format ----
make_stacked_long <- function(data) {
  data %>%
    select(repertoire_id, subj_order, disease_cat, disease_raw, sex_clean, age_group,
           tier_top10, tier_11_100, tier_101_1000, tier_remaining) %>%
    pivot_longer(cols = starts_with("tier_"),
                 names_to = "tier", values_to = "pct") %>%
    mutate(tier = case_when(
      tier == "tier_top10"     ~ "Top 10",
      tier == "tier_11_100"    ~ "Top 11-100",
      tier == "tier_101_1000"  ~ "Top 101-1000",
      tier == "tier_remaining" ~ "Remaining"
    )) %>%
    mutate(tier = factor(tier, levels = c("Remaining", "Top 101-1000", "Top 11-100", "Top 10")))
}

df_stacked <- make_stacked_long(df)

# ============================================================
# Fig 10: Stacked Bar - TopX by Disease Category
# ============================================================
p10 <- ggplot(df_stacked,
              aes(x = reorder(repertoire_id, subj_order), y = pct, fill = tier)) +
  geom_bar(stat = "identity", width = 0.9) +
  facet_grid(~ disease_cat, scales = "free_x", space = "free_x") +
  scale_fill_manual(values = tier_colors, name = "Clone Tier") +
  scale_y_continuous(labels = function(x) paste0(x, "%"), expand = c(0, 0)) +
  coord_cartesian(ylim = c(0, 100)) +
  labs(x = NULL, y = "Fraction of Total Copies") +
  theme(axis.text.x = element_blank(), axis.ticks.x = element_blank())
ggsave("plots/10_topX_stacked_by_disease.png", p10, width = 18, height = 7, dpi = 300)
cat("\nFigure 10 (stacked) saved.\n")

# ============================================================
# Fig 11: Stacked Bar - TopX by Age Group + Disease
# ============================================================
df_age_plot <- df %>% filter(!is.na(age_group))
df_age_plot <- df_age_plot %>%
  arrange(disease_cat, age_group, desc(top10_pct)) %>%
  mutate(subj_order = row_number())

df_age_stacked <- make_stacked_long(df_age_plot)

p11 <- ggplot(df_age_stacked,
              aes(x = reorder(repertoire_id, subj_order), y = pct, fill = tier)) +
  geom_bar(stat = "identity", width = 0.9) +
  facet_grid(~ disease_cat + age_group, scales = "free_x", space = "free_x") +
  scale_fill_manual(values = tier_colors, name = "Clone Tier") +
  scale_y_continuous(labels = function(x) paste0(x, "%"), expand = c(0, 0)) +
  coord_cartesian(ylim = c(0, 100)) +
  labs(x = NULL, y = "Fraction of Total Copies") +
  theme(axis.text.x = element_blank(), axis.ticks.x = element_blank(),
        strip.text = element_text(size = 9),
        panel.spacing.x = unit(0.3, "lines"))
ggsave("plots/11_topX_stacked_by_age_disease.png", p11, width = 24, height = 7, dpi = 300)
cat("Figure 11 (stacked by age) saved.\n")

# ============================================================
# Fig 11b: Stacked Bar - TopX by Sex + Disease
# ============================================================
df_sex_plot <- df %>% filter(!is.na(sex_clean))
df_sex_plot <- df_sex_plot %>%
  arrange(disease_cat, sex_clean, desc(top10_pct)) %>%
  mutate(subj_order = row_number())

df_sex_stacked <- make_stacked_long(df_sex_plot)

p11b <- ggplot(df_sex_stacked,
               aes(x = reorder(repertoire_id, subj_order), y = pct, fill = tier)) +
  geom_bar(stat = "identity", width = 0.9) +
  facet_grid(~ disease_cat + sex_clean, scales = "free_x", space = "free_x") +
  scale_fill_manual(values = tier_colors, name = "Clone Tier") +
  scale_y_continuous(labels = function(x) paste0(x, "%"), expand = c(0, 0)) +
  coord_cartesian(ylim = c(0, 100)) +
  labs(x = NULL, y = "Fraction of Total Copies") +
  theme(axis.text.x = element_blank(), axis.ticks.x = element_blank(),
        strip.text = element_text(size = 10),
        panel.spacing.x = unit(0.3, "lines"))
ggsave("plots/11b_topX_stacked_by_sex_disease.png", p11b, width = 22, height = 7, dpi = 300)
cat("Figure 11b (stacked by sex) saved.\n")

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
