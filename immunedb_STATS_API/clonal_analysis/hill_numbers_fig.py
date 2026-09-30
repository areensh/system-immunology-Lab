import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from collections import defaultdict
from stats_utils import add_significance

# Load pre-processed compact file with ALL clones (including singletons)
# per subject, blood only, exclusions applied
with open("clone_size/data/clone_size_all_clones_blood_compact.json") as f:
    subj_data = json.load(f)

disease_order = ["Severe", "Moderate", "Mild", "Recovered", "COVID Naive", "Healthy"]

disease_colors = {
    "Severe": "#b71c1c", "Moderate": "#e65100", "Mild": "#ff7043",
    "Recovered": "#43a047", "Healthy": "#1565c0", "COVID Naive": "#42a5f5",
}

# Compute Hill numbers per subject
def hill_numbers(sizes):
    sizes = np.array(sizes, dtype=float)
    total = sizes.sum()
    if total == 0:
        return 0, 0, 0
    p = sizes / total
    q0 = len(sizes)
    q1 = np.exp(-np.sum(p[p > 0] * np.log(p[p > 0])))
    q2 = 1.0 / np.sum(p ** 2) if np.sum(p ** 2) > 0 else 0
    return q0, q1, q2

# Group by disease stage
disease_hills = defaultdict(lambda: {"q0": [], "q1": [], "q2": []})
for rid, info in subj_data.items():
    if not info["sizes"]:
        continue
    q0, q1, q2 = hill_numbers(info["sizes"])
    d = info["disease"]
    if d in disease_order:
        disease_hills[d]["q0"].append(q0)
        disease_hills[d]["q1"].append(q1)
        disease_hills[d]["q2"].append(q2)

print("Subjects per disease stage (blood only):")
for d in disease_order:
    if d not in disease_hills:
        continue
    print(f"  {d}: {len(disease_hills[d]['q0'])} subjects")
    q0s = disease_hills[d]["q0"]
    q1s = disease_hills[d]["q1"]
    q2s = disease_hills[d]["q2"]
    print(f"    q0 median={np.median(q0s):.0f}, q1 median={np.median(q1s):.1f}, q2 median={np.median(q2s):.1f}")

# ============================================================
# FIGURE: Hill numbers boxplots — Order 0, 1, 2
# ============================================================
fig, axes = plt.subplots(1, 3, figsize=(24, 9))

titles = ["A. Order 0 (Richness)", "B. Order 1 (Shannon)", "C. Order 2 (Simpson)"]
keys = ["q0", "q1", "q2"]
rng = np.random.default_rng(42)

active_diseases = [d for d in disease_order if d in disease_hills]

for panel_idx, (key, title) in enumerate(zip(keys, titles)):
    ax = axes[panel_idx]
    bp_data = [disease_hills[d][key] if disease_hills[d][key] else [0] for d in active_diseases]
    colors = [disease_colors.get(d, "#999") for d in active_diseases]

    bp = ax.boxplot(bp_data, positions=range(len(active_diseases)), widths=0.5, patch_artist=True,
                    showfliers=False, medianprops=dict(color="black", linewidth=2))
    for i, patch in enumerate(bp["boxes"]):
        patch.set_facecolor(colors[i])
        patch.set_alpha(0.7)

    for i, d in enumerate(active_diseases):
        vals = disease_hills[d][key]
        if vals:
            jitter = rng.uniform(-0.12, 0.12, len(vals))
            ax.scatter([i + j for j in jitter], vals, color=colors[i], s=60, alpha=0.7,
                       zorder=3, edgecolors="white", linewidth=0.5)

    ax.set_xticks(range(len(active_diseases)))
    ax.set_xticklabels(active_diseases, fontsize=20, fontweight="bold", rotation=35, ha="right")
    ax.tick_params(axis='y', labelsize=20)
    ax.set_title(title, fontsize=24, fontweight="bold", loc="left")
    ax.set_yscale("log")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    if panel_idx == 0:
        ax.set_ylabel("Number of Clones (log)", fontsize=24, fontweight="bold")
    else:
        ax.set_ylabel("Effective Number of Clones (log)", fontsize=24, fontweight="bold")

    real_data = [disease_hills[d][key] for d in active_diseases]
    add_significance(ax, real_data, active_diseases, log_scale=True)

plt.tight_layout()
plt.savefig("plots/17_diversity_hill_numbers.png", dpi=600, bbox_inches="tight", facecolor="white")
plt.close()
print("Saved: 17_diversity_hill_numbers.png")

# ============================================================
# FIGURE: Diversity profiles — q0 → q1 → q2
# ============================================================
fig, ax = plt.subplots(figsize=(14, 10))

x_pos = [0, 1, 2]
for d in active_diseases:
    q0s = disease_hills[d]["q0"]
    q1s = disease_hills[d]["q1"]
    q2s = disease_hills[d]["q2"]
    color = disease_colors.get(d, "#999")

    for i in range(len(q0s)):
        ax.plot(x_pos, [q0s[i], q1s[i], q2s[i]], color=color, alpha=0.12, linewidth=1.0)

    if q0s:
        medians = [np.median(q0s), np.median(q1s), np.median(q2s)]
        ax.plot(x_pos, medians, color=color, linewidth=4, marker="o", markersize=10,
                label=f"{d} (n={len(q0s)})", zorder=5)

ax.set_xticks(x_pos)
ax.set_xticklabels(["q=0\n(Richness)", "q=1\n(Shannon)", "q=2\n(Simpson)"], fontsize=20)
ax.set_ylabel("Effective Number of Clones", fontsize=24, fontweight="bold")
ax.set_yscale("log")
ax.tick_params(axis='y', labelsize=20)
ax.legend(fontsize=20, title="Disease Stage", title_fontsize=22, loc="upper right",
          framealpha=0.9, edgecolor="gray")
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)

plt.tight_layout()
plt.savefig("plots/18_diversity_profiles.png", dpi=600, bbox_inches="tight", facecolor="white")
plt.close()
print("Saved: 18_diversity_profiles.png")
