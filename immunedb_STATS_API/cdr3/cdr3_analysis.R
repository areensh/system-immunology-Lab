library(jsonlite)
library(ggplot2)
library(dplyr)
library(tidyr)

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

output_dir <- "plots"
dir.create(output_dir, showWarnings = FALSE, recursive = TRUE)

raw <- fromJSON("data/CDR3_length.json", simplifyDataFrame = FALSE)

df <- do.call(rbind, lapply(raw$Result, function(entry) {
  rep <- entry$repertoire
  keys <- trimws(rep$meta_key)
  vals <- trimws(rep$meta_value)
  stat <- entry$statistics[[1]]

  rows <- lapply(stat$stats_value, function(sv) {
    data.frame(
      repertoire_id = rep$repertoire_id,
      age = as.numeric(vals[which(keys == "Age minimum")]),
      disease_stage = vals[which(keys == "disease_stage")],
      sex = vals[which(keys == "sex")],
      top_category = sv$clone_id,
      avg_cdr3_length = sv$count,
      stringsAsFactors = FALSE
    )
  })
  do.call(rbind, rows)
}))

df$disease_category <- map_disease(df$disease_stage)
df$disease_category <- factor(df$disease_category, levels = disease_order)
df$sex_clean <- case_when(tolower(df$sex) %in% c("male") ~ "Male",
                           tolower(df$sex) %in% c("female") ~ "Female",
                           TRUE ~ NA_character_)
df$age_group <- cut(df$age, breaks = c(0, 30, 50, 65, 100),
                     labels = c("18-30", "31-50", "51-65", "66+"), include.lowest = TRUE)
df$top_category <- factor(df$top_category, levels = c("Top_10_AA", "Top_100_AA", "Top_1000_AA"),
                           labels = c("Top 10", "Top 100", "Top 1000"))

# 1. CDR3 length by disease (faceted by top category)
p1 <- ggplot(df, aes(x = disease_category, y = avg_cdr3_length, fill = disease_category)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA) +
  geom_jitter(width = 0.2, alpha = 0.3, size = 1) +
  facet_wrap(~top_category) +
  labs(title = "Average CDR3 Length (AA) by Disease Category",
       x = "Disease Category", y = "Avg CDR3 Length (AA)") +
  theme(legend.position = "none")
ggsave(file.path(output_dir, "cdr3_by_disease.png"), p1, width = 14, height = 6, dpi = 150)

# 2. CDR3 length by sex (faceted)
df_sex <- df %>% filter(!is.na(sex_clean))
p2 <- ggplot(df_sex, aes(x = sex_clean, y = avg_cdr3_length, fill = sex_clean)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA) +
  geom_jitter(width = 0.2, alpha = 0.3, size = 1) +
  facet_wrap(~top_category) +
  scale_fill_manual(values = sex_colors) +
  labs(title = "Average CDR3 Length (AA) by Sex",
       x = "Sex", y = "Avg CDR3 Length (AA)") +
  theme(legend.position = "none")
ggsave(file.path(output_dir, "cdr3_by_sex.png"), p2, width = 12, height = 6, dpi = 150)

# 3. CDR3 length by age group (faceted)
df_age <- df %>% filter(!is.na(age_group))
p3 <- ggplot(df_age, aes(x = age_group, y = avg_cdr3_length, fill = age_group)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA) +
  geom_jitter(width = 0.2, alpha = 0.3, size = 1) +
  facet_wrap(~top_category) +
  scale_fill_brewer(palette = "Blues") +
  labs(title = "Average CDR3 Length (AA) by Age Group",
       x = "Age Group", y = "Avg CDR3 Length (AA)") +
  theme(legend.position = "none")
ggsave(file.path(output_dir, "cdr3_by_age.png"), p3, width = 12, height = 6, dpi = 150)

# 4. CDR3 length by disease x sex (Top 10 only)
df_ds_10 <- df %>% filter(top_category == "Top 10", !is.na(sex_clean))
p4 <- ggplot(df_ds_10, aes(x = disease_category, y = avg_cdr3_length, fill = sex_clean)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA) +
  geom_jitter(aes(color = sex_clean), position = position_jitterdodge(jitter.width = 0.15), alpha = 0.4, size = 1.5) +
  scale_fill_manual(values = sex_colors) +
  scale_color_manual(values = sex_colors) +
  labs(title = "Avg CDR3 Length (Top 10 Clones) by Disease Category and Sex",
       x = "Disease Category", y = "Avg CDR3 Length (AA)", fill = "Sex", color = "Sex")
ggsave(file.path(output_dir, "cdr3_top10_by_disease_sex.png"), p4, width = 12, height = 6, dpi = 150)

# 5. CDR3 length by disease x age (Top 10 only)
df_da_10 <- df %>% filter(top_category == "Top 10", !is.na(age_group))
p5 <- ggplot(df_da_10, aes(x = disease_category, y = avg_cdr3_length, fill = age_group)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA) +
  scale_fill_brewer(palette = "YlOrRd") +
  labs(title = "Avg CDR3 Length (Top 10 Clones) by Disease Category and Age Group",
       x = "Disease Category", y = "Avg CDR3 Length (AA)", fill = "Age Group")
ggsave(file.path(output_dir, "cdr3_top10_by_disease_age.png"), p5, width = 12, height = 6, dpi = 150)

# 6. Comparison across Top tiers (all in one plot, by disease)
p6 <- ggplot(df, aes(x = top_category, y = avg_cdr3_length, fill = disease_category)) +
  geom_boxplot(alpha = 0.7, outlier.shape = NA) +
  labs(title = "CDR3 Length Across Clone Tiers by Disease Category",
       x = "Clone Tier", y = "Avg CDR3 Length (AA)", fill = "Disease\nCategory")
ggsave(file.path(output_dir, "cdr3_tiers_by_disease.png"), p6, width = 12, height = 6, dpi = 150)

cat("CDR3 plots saved.\n")

# Summary stats
cat("\n========== CDR3 LENGTH SUMMARY ==========\n")
cat("N participants:", length(unique(df$repertoire_id)), "\n")
cat("\nBy disease and tier:\n")
df %>% group_by(disease_category, top_category) %>%
  summarise(n = n(), median = round(median(avg_cdr3_length), 1),
            mean = round(mean(avg_cdr3_length), 1), .groups = "drop") %>%
  pivot_wider(names_from = top_category, values_from = c(median, mean)) %>%
  print(width = 200)

cat("\nBy sex (Top 10):\n")
df %>% filter(top_category == "Top 10", !is.na(sex_clean)) %>%
  group_by(sex_clean) %>%
  summarise(n = n(), median = round(median(avg_cdr3_length), 1),
            mean = round(mean(avg_cdr3_length), 1), .groups = "drop") %>%
  print()

cat("\nAll CDR3 plots saved to:", normalizePath(output_dir), "\n")
