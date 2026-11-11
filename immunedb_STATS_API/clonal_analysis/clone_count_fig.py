import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from collections import defaultdict
from stats_utils import add_significance

with open("clone_size/data/clone_size_all_clones_blood_compact.json") as f:
    data = json.load(f)

disease_order = ["Severe", "Moderate", "Mild", "Recovered", "COVID Naive", "Healthy"]
disease_colors = {
    "Severe": "#b71c1c", "Moderate": "#e65100", "Mild": "#ff7043",
    "Recovered": "#43a047", "Healthy": "#1565c0", "COVID Naive": "#42a5f5",
}

# Clone count = number of unique clones per individual
clone_counts = defaultdict(list)
for rid, info in data.items():
    d = info["disease"]
    if d in disease_order:
        clone_counts[d].append(len(info["sizes"]))

fig, ax = plt.subplots(figsize=(12, 8))

bp_data = [clone_counts.get(d, []) for d in disease_order]
colors = [disease_colors[d] for d in disease_order]

bp = ax.boxplot(bp_data, positions=range(len(disease_order)), widths=0.5, patch_artist=True,
                showfliers=False, medianprops=dict(color="black", linewidth=2))
for i, patch in enumerate(bp["boxes"]):
    patch.set_facecolor(colors[i])
    patch.set_alpha(0.35)

rng = np.random.default_rng(42)
for i, d in enumerate(disease_order):
    vals = clone_counts.get(d, [])
    if vals:
        jitter = rng.uniform(-0.15, 0.15, len(vals))
        ax.scatter([i + j for j in jitter], vals, color=colors[i], s=60, alpha=0.85,
                   zorder=3, edgecolors="white", linewidth=0.5)

# Add sample sizes below x-axis
for i, d in enumerate(disease_order):
    n = len(clone_counts.get(d, []))
    ax.text(i, ax.get_ylim()[0], f"n={n}", ha="center", va="top", fontsize=14, color="gray")

ax.set_yscale("log")
ax.set_xticks(range(len(disease_order)))
ax.set_xticklabels(disease_order, fontsize=18, fontweight="bold", rotation=15, ha="right")
ax.set_ylabel("Clone Count (unique clones)", fontsize=22, fontweight="bold")
ax.tick_params(axis='y', labelsize=18)
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)

add_significance(ax, bp_data, disease_order, log_scale=True)

plt.tight_layout()
plt.savefig("plots/27_clone_count_by_disease.png", dpi=600, bbox_inches="tight", facecolor="white")
plt.close()
print("Saved: plots/27_clone_count_by_disease.png")
