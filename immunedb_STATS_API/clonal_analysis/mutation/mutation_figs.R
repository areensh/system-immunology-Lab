library(jsonlite)
library(ggplot2)
library(dplyr)
library(tidyr)

setwd("/home/user/system-immunology-Lab/immunedb_STATS_API/clonal/mutation")

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

tier_colors <- c("Top 10" = "#d62728", "Top 100" = "#ff7f0e", "Top 1000" = "#2ca02c")
sex_colors <- c("Male" = "#4A90D9", "Female" = "#E85D75")
age_colors <- c("18-30" = "#C6DBEF", "31-50" = "#6BAED6", "51-65" = "#2171B5", "66+" = "#08306B")

compact_legend <- theme(
  legend.position = "bottom",
  legend.title = element_text(size = 16, face = "bold"),
  legend.text = element_text(size = 14),
  legend.key.size = unit(0.6, "cm"),
  legend.spacing.x = unit(0.2, "cm"),
  legend.margin = margin(5, 0, 5, 0)
)

base_theme <- theme_bw(base_size = 20) +
  theme(
    plot.background = element_rect(fill = "white", color = NA),
    panel.background = element_rect(fill = "white", color = NA),
    legend.background = element_rect(fill = "white", color = NA),
    axis.title = element_text(size = 20, face = "bold"),
    axis.text = element_text(size = 16),
    strip.text = element_text(face = "bold", size = 18),
    plot.margin = margin(10, 15, 10, 15)
  ) +
  compact_legend

theme_set(base_theme)

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

    age_idx <- which(keys == "Age minimum")
    ds_idx <- which(keys == "disease_stage")
    sex_idx <- which(keys == "sex")
    tissue_idx <- which(keys == "tissue")

    data.frame(
      repertoire_id = rep$repertoire_id,
      mut_top10 = top10,
      mut_top100 = top100,
      mut_top1000 = top1000,
      age = if (length(age_idx)) as.numeric(vals[age_idx]) else NA_real_,
      disease_raw = if (length(ds_idx)) vals[ds_idx] else NA_character_,
      sex = if (length(sex_idx)) vals[sex_idx] else NA_character_,
      tissue = if (length(tissue_idx)) vals[tissue_idx] else NA_character_,
      stringsAsFactors = FALSE
    )
  }))
}

df <- parse_mutation("data/mutations_disease_tissue.json")

df_sex <- parse_mutation("data/mutations_sex_disease_tissue.json")
missing_sex <- df_sex %>% filter(!repertoire_id %in% df$repertoire_id)
if (nrow(missing_sex) > 0) df <- bind_rows(df, missing_sex)

df_age <- parse_mutation("data/mutations_age_disease_tissue.json")

cat("Total rows before filtering:", nrow(df), "\n")

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

df_sex_blood <- df_sex %>%
  filter(tissue %in% c("blood", "PBL", "Peripheral blood")) %>%
  group_by(repertoire_id) %>%
  summarise(sex = first(na.omit(sex)), .groups = "drop")
df <- df %>% left_join(df_sex_blood, by = "repertoire_id", suffix = c("", ".sex"))
df$sex <- ifelse(is.na(df$sex), df$sex.sex, df$sex)
df$sex.sex <- NULL

df_age_blood <- df_age %>%
  filter(tissue %in% c("blood", "PBL", "Peripheral blood")) %>%
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

df <- df %>%
  arrange(disease_cat, desc(mut_top10)) %>%
  mutate(subj_order = row_number())

make_mutation_long <- function(data) {
  data %>%
    select(repertoire_id, subj_order, disease_cat, disease_raw, sex_clean, age_group,
           mut_top10, mut_top100, mut_top1000) %>%
    pivot_longer(cols = starts_with("mut_"),
                 names_to = "tier", values_to = "mutation_count") %>%
    mutate(tier = case_when(
      tier == "mut_top10"   ~ "Top 10",
      tier == "mut_top100"  ~ "Top 100",
      tier == "mut_top1000" ~ "Top 1000"
    )) %>%
    mutate(tier = factor(tier, levels = c("Top 10", "Top 100", "Top 1000")))
}

df_long <- make_mutation_long(df)

# ============================================================
# Fig 15: Mutation Level - Per-subject bars, faceted by tier (rows) and disease (cols)
# ============================================================
p15 <- ggplot(df_long,
              aes(x = reorder(repertoire_id, subj_order), y = mutation_count, fill = tier)) +
  geom_bar(stat = "identity", width = 0.9) +
  facet_grid(tier ~ disease_cat, scales = "free_x", space = "free_x") +
  scale_fill_manual(values = tier_colors, name = "Clone Tier") +
  scale_y_continuous(expand = c(0, 0)) +
  coord_cartesian(ylim = c(0, max(df_long$mutation_count, na.rm = TRUE) + 5)) +
  labs(x = NULL, y = "Avg. Mutation Count") +
  theme(strip.text.x = element_text(face = "bold", size = 14),
        strip.text.y = element_text(face = "bold", size = 14, angle = 0),
        axis.title.y = element_text(size = 18, face = "bold"),
        axis.text.x = element_blank(), axis.ticks.x = element_blank(),
        plot.margin = margin(10, 10, 30, 10),
        legend.position = "bottom",
        legend.box.margin = margin(10, 0, 0, 0),
        legend.title = element_text(size = 16, face = "bold"),
        legend.text = element_text(size = 14),
        legend.key.size = unit(0.8, "cm"))
ggsave("plots/15_mutation_by_disease.png", p15, width = 20, height = 11, dpi = 400, bg = "white")
cat("\nFigure 15 saved.\n")

# ============================================================
# Fig 16: Mutation Level - Per-subject bars by Age + Disease
# ============================================================
df_age_plot <- df %>% filter(!is.na(age_group))
df_age_plot <- df_age_plot %>%
  arrange(disease_cat, age_group, desc(mut_top10)) %>%
  mutate(subj_order = row_number())

df_age_long <- make_mutation_long(df_age_plot)

p16 <- ggplot(df_age_long,
              aes(x = reorder(repertoire_id, subj_order), y = mutation_count, fill = tier)) +
  geom_bar(stat = "identity", width = 0.9) +
  facet_grid(tier ~ disease_cat + age_group, scales = "free_x", space = "free_x") +
  scale_fill_manual(values = tier_colors, name = "Clone Tier") +
  scale_y_continuous(expand = c(0, 0)) +
  coord_cartesian(ylim = c(0, max(df_age_long$mutation_count, na.rm = TRUE) + 5)) +
  labs(x = NULL, y = "Avg. Mutation Count") +
  theme(axis.text.x = element_blank(), axis.ticks.x = element_blank(),
        strip.text.x = element_text(face = "bold", size = 13, angle = 90, hjust = 0, vjust = 0.5),
        strip.text.y = element_text(face = "bold", size = 14, angle = 0),
        strip.clip = "off",
        panel.spacing.x = unit(0.3, "lines"))
ggsave("plots/16_mutation_by_age_disease.png", p16, width = 18, height = 12, dpi = 400, bg = "white")
cat("Figure 16 saved.\n")

# ============================================================
# Fig 17: Mutation Level - Per-subject bars by Sex + Disease
# ============================================================
df_sex_plot <- df %>% filter(!is.na(sex_clean))
df_sex_plot <- df_sex_plot %>%
  arrange(disease_cat, sex_clean, desc(mut_top10)) %>%
  mutate(subj_order = row_number())

df_sex_long <- make_mutation_long(df_sex_plot)

p17 <- ggplot(df_sex_long,
              aes(x = reorder(repertoire_id, subj_order), y = mutation_count, fill = tier)) +
  geom_bar(stat = "identity", width = 0.9) +
  facet_grid(tier ~ disease_cat + sex_clean, scales = "free_x", space = "free_x") +
  scale_fill_manual(values = tier_colors, name = "Clone Tier") +
  scale_y_continuous(expand = c(0, 0)) +
  coord_cartesian(ylim = c(0, max(df_sex_long$mutation_count, na.rm = TRUE) + 5)) +
  labs(x = NULL, y = "Avg. Mutation Count") +
  theme(axis.text.x = element_blank(), axis.ticks.x = element_blank(),
        strip.text.x = element_text(face = "bold", size = 14, angle = 90, hjust = 0, vjust = 0.5),
        strip.text.y = element_text(face = "bold", size = 14, angle = 0),
        strip.clip = "off",
        panel.spacing.x = unit(0.3, "lines"))
ggsave("plots/17_mutation_by_sex_disease.png", p17, width = 16, height = 12, dpi = 400, bg = "white")
cat("Figure 17 saved.\n")

# Summary stats
cat("\n========== MUTATION LEVEL SUMMARY ==========\n")
df %>%
  group_by(disease_cat) %>%
  summarise(
    n = n(),
    median_top10 = round(median(mut_top10), 2),
    median_top100 = round(median(mut_top100), 2),
    median_top1000 = round(median(mut_top1000), 2),
    mean_top10 = round(mean(mut_top10), 2),
    mean_top100 = round(mean(mut_top100), 2),
    mean_top1000 = round(mean(mut_top1000), 2),
    .groups = "drop"
  ) %>%
  print()

cat("\nBy sex:\n")
df %>% filter(!is.na(sex_clean)) %>%
  group_by(disease_cat, sex_clean) %>%
  summarise(n = n(),
            median_top10 = round(median(mut_top10), 2),
            median_top100 = round(median(mut_top100), 2),
            .groups = "drop") %>%
  print()
