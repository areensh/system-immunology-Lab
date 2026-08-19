library(jsonlite)
library(ggplot2)
library(dplyr)
library(tidyr)

setwd("/home/user/system-immunology-Lab/immunedb_STATS_API/clonal_analysis")

# Load clone size data with tissue
json_data <- fromJSON("clone_size/data/clone_size_ALL_tissue.json", simplifyDataFrame = FALSE)

# Extract HC1 (lp16) entries
records <- lapply(json_data$Result, function(entry) {
  rep <- entry$repertoire
  rid <- rep$repertoire_id
  if (!grepl("lp16", rid)) return(NULL)

  keys <- trimws(rep$meta_key)
  vals <- trimws(rep$meta_value)

  tissue_i <- which(keys == "tissue")
  tissue <- if (length(tissue_i)) vals[tissue_i[1]] else NA_character_

  clone_size <- entry$statistics[[1]]$stats_value[[1]]$count
  clone_id <- entry$statistics[[1]]$stats_value[[1]]$clone_id

  data.frame(
    subject = sub("lp16_Igblast-", "", rid),
    tissue = tissue,
    clone_id = clone_id,
    clone_size = clone_size,
    stringsAsFactors = FALSE
  )
})

df <- bind_rows(records)

# Focus on key tissues for clarity
key_tissues <- c("PBL", "BM", "SPL", "Lung", "Colon", "Ileum", "MLN")
df <- df %>% filter(tissue %in% key_tissues)

# Tissue display order (blood first, then organs)
df$tissue <- factor(df$tissue, levels = key_tissues)

tissue_colors <- c(
  "PBL"   = "#2D6A8F",
  "BM"    = "#b71c1c",
  "SPL"   = "#7e57c2",
  "Lung"  = "#5B7C3A",
  "Colon" = "#e65100",
  "Ileum" = "#ff9800",
  "MLN"   = "#78909c"
)

theme_set(theme_minimal(base_size = 16) + theme(
  plot.title = element_text(size = 18, face = "bold"),
  plot.subtitle = element_text(size = 13, color = "gray40"),
  axis.title = element_text(size = 14, face = "bold"),
  axis.text = element_text(size = 12),
  axis.text.x = element_text(angle = 30, hjust = 1),
  legend.text = element_text(size = 12),
  legend.title = element_text(size = 13, face = "bold"),
  strip.text = element_text(size = 14, face = "bold"),
  panel.grid.minor = element_blank()
))

# ============================================================
# FIGURE: Clone count per tissue per subject
# ============================================================
clone_counts <- df %>%
  group_by(subject, tissue) %>%
  summarise(n_clones = n(), .groups = "drop")

p1 <- ggplot(clone_counts, aes(x = tissue, y = n_clones, fill = tissue)) +
  geom_col(color = "white", linewidth = 0.3) +
  facet_wrap(~subject, scales = "free_y", ncol = 3) +
  scale_fill_manual(values = tissue_colors, guide = "none") +
  scale_y_continuous(expand = expansion(mult = c(0, 0.1))) +
  labs(
    title = "Within-Subject Comparison: Clone Count by Tissue",
    subtitle = "HC1 healthy subjects — number of distinct clones (≥20 unique sequences) per tissue",
    x = "Tissue", y = "Number of Distinct Clones"
  )

ggsave("plots/14_within_subject_clone_count.png", p1, width = 14, height = 10, dpi = 400, bg = "white")
cat("Saved: 14_within_subject_clone_count.png\n")

# ============================================================
# FIGURE: Clone size distribution per tissue (one subject example)
# ============================================================
# Use D207 as the richest example
df_d207 <- df %>% filter(subject == "D207")

p2 <- ggplot(df_d207, aes(x = tissue, y = clone_size, fill = tissue)) +
  geom_violin(alpha = 0.5, linewidth = 0.4, scale = "width") +
  geom_boxplot(width = 0.15, alpha = 0.8, outlier.shape = NA, linewidth = 0.5) +
  stat_summary(fun = mean, geom = "point", shape = 18, size = 3.5, color = "red") +
  scale_fill_manual(values = tissue_colors, guide = "none") +
  scale_y_log10(labels = scales::comma) +
  labs(
    title = "Within-Subject Clone Size Distribution: Subject D207",
    subtitle = "Clone size (unique sequences per clone) across 7 tissues from one healthy individual",
    x = "Tissue", y = "Clone Size (unique sequences per clone, log scale)"
  )

ggsave("plots/15_within_subject_clone_size_D207.png", p2, width = 12, height = 8, dpi = 400, bg = "white")
cat("Saved: 15_within_subject_clone_size_D207.png\n")

# ============================================================
# FIGURE: Median clone size per tissue across all HC1 subjects
# ============================================================
tissue_summary <- df %>%
  group_by(subject, tissue) %>%
  summarise(
    median_size = median(clone_size),
    mean_size = mean(clone_size),
    n_clones = n(),
    .groups = "drop"
  )

p3 <- ggplot(tissue_summary, aes(x = tissue, y = median_size)) +
  geom_line(aes(group = subject, color = subject), alpha = 0.4, linewidth = 0.8) +
  geom_point(aes(color = subject, size = n_clones), alpha = 0.8) +
  scale_y_log10(labels = scales::comma) +
  scale_size_continuous(range = c(2, 8), name = "# Clones") +
  labs(
    title = "Within-Subject Tissue Comparison: Median Clone Size",
    subtitle = "Each line = one HC1 subject. Point size = number of clones in that tissue.",
    x = "Tissue",
    y = "Median Clone Size (unique sequences, log scale)",
    color = "Subject"
  )

ggsave("plots/16_within_subject_tissue_lines.png", p3, width = 13, height = 8, dpi = 400, bg = "white")
cat("Saved: 16_within_subject_tissue_lines.png\n")

cat("\n=== Summary ===\n")
cat("Subjects:", length(unique(df$subject)), "\n")
cat("Tissues:", length(key_tissues), "\n")
cat("Total clones:", nrow(df), "\n")
print(clone_counts %>% group_by(tissue) %>% summarise(total = sum(n_clones), subjects = n()))
