import json
import csv
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.lines import Line2D

# All clones per tissue per HC1 subject
with open("clone_size/data/hc1_all_clones_by_tissue.json") as f:
    data = json.load(f)

THRESHOLD = 1  # clone size > 1 (at least 2 unique sequences)

hc1_subjects = sorted(data.keys())
hc1_key_tissues = ["PBL", "BM", "SPL", "Lung", "Colon", "Ileum", "Jejunum", "MLN"]

tissue_colors = {
    "PBL": "#c62828",
    "BM": "#e57373",
    "SPL": "#ff8a80",
    "Lung": "#e65100",
    "Colon": "#1565C0",
    "Ileum": "#42A5F5",
    "Jejunum": "#90CAF9",
    "MLN": "#212121",
}

tissue_markers = {
    "PBL": "o", "BM": "s", "SPL": "D", "Lung": "^",
    "Colon": "o", "Ileum": "s", "Jejunum": "D", "MLN": "v",
}

hc1_sample_counts = {}
with open("clone_size/data/hc1_samples_per_tissue.csv") as f:
    reader = csv.DictReader(f)
    for row in reader:
        hc1_sample_counts[(row["subject_name"], row["tissue"])] = int(row["num_samples"])

# Filter data: keep only clones with size > THRESHOLD
filtered = {}
for subj in data:
    filtered[subj] = {}
    for t in data[subj]:
        sizes = [s for s in data[subj][t] if s > THRESHOLD]
        if sizes:
            filtered[subj][t] = sizes

# Print summary
print(f"Threshold: clone size > {THRESHOLD}")
for subj in hc1_subjects:
    for t in hc1_key_tissues:
        orig = len(data[subj].get(t, []))
        filt = len(filtered[subj].get(t, []))
        print(f"  {subj}-{t}: {orig} -> {filt} clones ({filt/orig*100:.0f}%)" if orig else f"  {subj}-{t}: missing")

# ============================================================
# FIGURE 18: Clone count per tissue (normalized), thresholded
# ============================================================
fig, ax = plt.subplots(figsize=(14, 8))

rng = np.random.default_rng(42)
for i, subj in enumerate(hc1_subjects):
    for t in hc1_key_tissues:
        if t in filtered[subj]:
            n_samples = hc1_sample_counts.get((subj, t), 1)
            val = len(filtered[subj][t]) / n_samples
            jitter = rng.uniform(-0.25, 0.25)
            ax.scatter(i + jitter, val,
                       color=tissue_colors.get(t, "#999"),
                       marker=tissue_markers.get(t, "o"),
                       s=120, alpha=0.85, zorder=3,
                       edgecolors="white", linewidth=0.5)

ax.set_xticks(range(len(hc1_subjects)))
ax.set_xticklabels(hc1_subjects, fontsize=20, fontweight="bold")
ax.set_ylabel("Clones / Sample  (size > 1)", fontsize=22, fontweight="bold")
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
plt.savefig("plots/18_within_subject_clone_count_thresholded.png", dpi=600, bbox_inches="tight", facecolor="white")
plt.close()
print("\nSaved: 18_within_subject_clone_count_thresholded.png")

# ============================================================
# FIGURE 19: Median clone size per tissue, thresholded
# ============================================================
fig, ax = plt.subplots(figsize=(14, 8))

for i, subj in enumerate(hc1_subjects):
    for t in hc1_key_tissues:
        if t in filtered[subj] and filtered[subj][t]:
            val = np.median(filtered[subj][t])
            jitter = rng.uniform(-0.25, 0.25)
            ax.scatter(i + jitter, val,
                       color=tissue_colors.get(t, "#999"),
                       marker=tissue_markers.get(t, "o"),
                       s=120, alpha=0.85, zorder=3,
                       edgecolors="white", linewidth=0.5)

ax.set_xticks(range(len(hc1_subjects)))
ax.set_xticklabels(hc1_subjects, fontsize=20, fontweight="bold")
ax.set_ylabel("Median Clone Size  (size > 1)", fontsize=22, fontweight="bold")
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
plt.savefig("plots/19_within_subject_median_clone_size_thresholded.png", dpi=600, bbox_inches="tight", facecolor="white")
plt.close()
print("Saved: 19_within_subject_median_clone_size_thresholded.png")

# Median values for reference
print("\n=== Median clone sizes (thresholded) ===")
for subj in hc1_subjects:
    vals = []
    for t in hc1_key_tissues:
        if t in filtered[subj]:
            vals.append(f"{t}={np.median(filtered[subj][t]):.0f}")
    print(f"  {subj}: {'  '.join(vals)}")
