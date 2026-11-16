import json
import csv
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.lines import Line2D

# All clones (no threshold) per tissue per HC1 subject
with open("clone_size/data/hc1_all_clones_by_tissue.json") as f:
    data = json.load(f)

hc1_subjects = sorted(data.keys())
hc1_key_tissues = ["PBL", "BM", "SPL", "Lung", "Colon", "Ileum", "Jejunum", "MLN"]

tissue_colors = {
    "PBL": "#c62828",       # blood — dark red
    "BM": "#e57373",        # bone marrow — light red
    "SPL": "#ff8a80",       # spleen — pale red/salmon
    "Lung": "#e65100",      # lung — orange
    "Colon": "#1565C0",     # colon — dark blue
    "Ileum": "#42A5F5",     # ileum — medium blue
    "Jejunum": "#90CAF9",   # jejunum — light blue
    "MLN": "#212121",       # mesenteric lymph node — black
}

tissue_markers = {
    "PBL": "o", "BM": "s", "SPL": "D", "Lung": "^",
    "Colon": "o", "Ileum": "s", "Jejunum": "D", "MLN": "v",
}

# Load HC1 sample counts per tissue
hc1_sample_counts = {}
with open("clone_size/data/hc1_samples_per_tissue.csv") as f:
    reader = csv.DictReader(f)
    for row in reader:
        hc1_sample_counts[(row["subject_name"], row["tissue"])] = int(row["num_samples"])

# ============================================================
# FIGURE 14: Clone count per tissue (normalized by samples)
# ============================================================
fig, ax = plt.subplots(figsize=(14, 8))

rng = np.random.default_rng(42)
for i, subj in enumerate(hc1_subjects):
    for t in hc1_key_tissues:
        if t in data[subj]:
            n_samples = hc1_sample_counts.get((subj, t), 1)
            val = len(data[subj][t]) / n_samples
            jitter = rng.uniform(-0.25, 0.25)
            ax.scatter(i + jitter, val,
                       color=tissue_colors.get(t, "#999"),
                       marker=tissue_markers.get(t, "o"),
                       s=120, alpha=0.85, zorder=3,
                       edgecolors="white", linewidth=0.5)

ax.set_xticks(range(len(hc1_subjects)))
ax.set_xticklabels(hc1_subjects, fontsize=20, fontweight="bold")
ax.set_ylabel("Clones / Sample", fontsize=22, fontweight="bold")
ax.tick_params(axis='y', labelsize=18)
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)

legend_handles = [Line2D([0], [0], color=tissue_colors[t], marker=tissue_markers[t],
                         markersize=10, linestyle="None", markeredgecolor="white",
                         markeredgewidth=0.5, label=t)
                  for t in hc1_key_tissues]
ax.legend(handles=legend_handles, fontsize=14, title="Tissue", title_fontsize=16,
          loc="upper left", ncol=2, framealpha=0.9)

plt.tight_layout()
plt.savefig("plots/14_within_subject_clone_count.png", dpi=600, bbox_inches="tight", facecolor="white")
plt.close()
print("Saved: 14_within_subject_clone_count.png")

# ============================================================
# FIGURE 15: Median clone size per tissue
# ============================================================
fig, ax = plt.subplots(figsize=(14, 8))

for i, subj in enumerate(hc1_subjects):
    for t in hc1_key_tissues:
        if t in data[subj] and data[subj][t]:
            val = np.median(data[subj][t])
            jitter = rng.uniform(-0.25, 0.25)
            ax.scatter(i + jitter, val,
                       color=tissue_colors.get(t, "#999"),
                       marker=tissue_markers.get(t, "o"),
                       s=120, alpha=0.85, zorder=3,
                       edgecolors="white", linewidth=0.5)

ax.set_xticks(range(len(hc1_subjects)))
ax.set_xticklabels(hc1_subjects, fontsize=20, fontweight="bold")
ax.set_ylabel("Median Clone Size", fontsize=22, fontweight="bold")
ax.tick_params(axis='y', labelsize=18)
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)

legend_handles = [Line2D([0], [0], color=tissue_colors[t], marker=tissue_markers[t],
                         markersize=10, linestyle="None", markeredgecolor="white",
                         markeredgewidth=0.5, label=t)
                  for t in hc1_key_tissues]
ax.legend(handles=legend_handles, fontsize=14, title="Tissue", title_fontsize=16,
          loc="upper left", ncol=2, framealpha=0.9)

plt.tight_layout()
plt.savefig("plots/15_within_subject_median_clone_size.png", dpi=600, bbox_inches="tight", facecolor="white")
plt.close()
print("Saved: 15_within_subject_median_clone_size.png")

# Summary
for subj in hc1_subjects:
    total = sum(len(data[subj].get(t, [])) for t in hc1_key_tissues)
    print(f"  {subj}: {total} total clones across key tissues")
