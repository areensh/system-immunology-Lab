import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import numpy as np
from collections import defaultdict

with open("clone_size/data/clone_size_ALL_tissue.json") as f:
    data = json.load(f)

# Extract HC1 entries
records = []
for entry in data["Result"]:
    rep = entry["repertoire"]
    rid = rep["repertoire_id"]
    if "lp16" not in rid:
        continue
    keys = rep["meta_key"]
    vals = rep["meta_value"]
    tissue = None
    for k, v in zip(keys, vals):
        if k == "tissue":
            tissue = v
    if tissue is None:
        continue
    sv = entry["statistics"][0]["stats_value"][0]
    records.append({
        "subject": rid.replace("lp16_Igblast-", ""),
        "tissue": tissue,
        "clone_id": sv["clone_id"],
        "clone_size": sv["count"],
    })

key_tissues = ["PBL", "BM", "SPL", "Lung", "Colon", "Ileum", "MLN"]
records = [r for r in records if r["tissue"] in key_tissues]

tissue_colors = {
    "PBL": "#2D6A8F", "BM": "#b71c1c", "SPL": "#7e57c2",
    "Lung": "#5B7C3A", "Colon": "#e65100", "Ileum": "#ff9800", "MLN": "#78909c",
}

# Group by subject and tissue
subj_tissue_clones = defaultdict(lambda: defaultdict(list))
for r in records:
    subj_tissue_clones[r["subject"]][r["tissue"]].append(r["clone_size"])

subjects = sorted(subj_tissue_clones.keys())

# ============================================================
# FIGURE 1: Clone count per tissue per subject (faceted bar)
# ============================================================
fig, axes = plt.subplots(2, 3, figsize=(16, 11))
fig.suptitle("Within-Subject Comparison: Clone Count by Tissue",
             fontsize=20, fontweight="bold", y=0.98)
fig.text(0.5, 0.94,
         "HC1 healthy subjects — number of distinct clones (≥20 unique sequences) per tissue",
         ha="center", fontsize=13, color="gray")

for idx, subj in enumerate(subjects):
    ax = axes[idx // 3][idx % 3]
    tissue_data = subj_tissue_clones[subj]
    tissues_present = [t for t in key_tissues if t in tissue_data]
    counts = [len(tissue_data[t]) for t in tissues_present]
    colors = [tissue_colors[t] for t in tissues_present]

    bars = ax.bar(range(len(tissues_present)), counts, color=colors, edgecolor="white", linewidth=0.5)
    ax.set_xticks(range(len(tissues_present)))
    ax.set_xticklabels(tissues_present, rotation=30, ha="right", fontsize=11)
    ax.set_title(subj, fontsize=15, fontweight="bold")
    ax.set_ylabel("# Clones", fontsize=12)
    ax.set_ylim(0, None)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    for bar, c in zip(bars, counts):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + max(counts)*0.02,
                str(c), ha="center", va="bottom", fontsize=9, fontweight="bold")

plt.tight_layout(rect=[0, 0, 1, 0.92])
plt.savefig("plots/14_within_subject_clone_count.png", dpi=400, bbox_inches="tight", facecolor="white")
plt.close()
print("Saved: 14_within_subject_clone_count.png")

# ============================================================
# FIGURE 2: Clone size distribution per tissue (D207)
# ============================================================
subj = "D207"
tissue_data = subj_tissue_clones[subj]
tissues_present = [t for t in key_tissues if t in tissue_data]

fig, ax = plt.subplots(figsize=(13, 8))
positions = range(len(tissues_present))
bp_data = [tissue_data[t] for t in tissues_present]

vp = ax.violinplot(bp_data, positions=positions, showmeans=False, showmedians=False, showextrema=False, widths=0.7)
for i, body in enumerate(vp["bodies"]):
    body.set_facecolor(tissue_colors[tissues_present[i]])
    body.set_alpha(0.4)
    body.set_edgecolor(tissue_colors[tissues_present[i]])

bp = ax.boxplot(bp_data, positions=positions, widths=0.15, patch_artist=True,
                showfliers=False, zorder=3,
                medianprops=dict(color="black", linewidth=1.5))
for i, patch in enumerate(bp["boxes"]):
    patch.set_facecolor(tissue_colors[tissues_present[i]])
    patch.set_alpha(0.8)

# Mean diamonds
for i, t in enumerate(tissues_present):
    mean_val = np.mean(tissue_data[t])
    ax.scatter(i, mean_val, color="red", marker="D", s=50, zorder=4)

ax.set_yscale("log")
ax.set_xticks(positions)
ax.set_xticklabels(tissues_present, fontsize=13)
ax.set_ylabel("Clone Size (unique sequences per clone, log scale)", fontsize=14, fontweight="bold")
ax.set_xlabel("Tissue", fontsize=14, fontweight="bold")
ax.set_title("Within-Subject Clone Size Distribution: Subject D207",
             fontsize=18, fontweight="bold")
ax.text(0.5, 1.02, "Clone size across 7 tissues from one healthy individual",
        transform=ax.transAxes, ha="center", fontsize=13, color="gray")
ax.yaxis.set_major_formatter(ticker.FuncFormatter(lambda x, _: f"{x:,.0f}"))
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)

plt.tight_layout()
plt.savefig("plots/15_within_subject_clone_size_D207.png", dpi=400, bbox_inches="tight", facecolor="white")
plt.close()
print("Saved: 15_within_subject_clone_size_D207.png")

# ============================================================
# FIGURE 3: Median clone size per tissue - lines across subjects
# ============================================================
fig, ax = plt.subplots(figsize=(13, 8))

subj_colors = plt.cm.Set2(np.linspace(0, 1, len(subjects)))

for idx, subj in enumerate(subjects):
    tissue_data = subj_tissue_clones[subj]
    tissues_present = [t for t in key_tissues if t in tissue_data]
    x_pos = [key_tissues.index(t) for t in tissues_present]
    medians = [np.median(tissue_data[t]) for t in tissues_present]
    n_clones = [len(tissue_data[t]) for t in tissues_present]

    ax.plot(x_pos, medians, alpha=0.5, linewidth=1.2, color=subj_colors[idx])
    ax.scatter(x_pos, medians, s=[max(20, min(n*0.8, 200)) for n in n_clones],
               alpha=0.7, color=subj_colors[idx], label=subj, zorder=3, edgecolors="white", linewidth=0.5)

ax.set_yscale("log")
ax.set_xticks(range(len(key_tissues)))
ax.set_xticklabels(key_tissues, fontsize=13)
ax.set_ylabel("Median Clone Size (unique sequences, log scale)", fontsize=14, fontweight="bold")
ax.set_xlabel("Tissue", fontsize=14, fontweight="bold")
ax.set_title("Within-Subject Tissue Comparison: Median Clone Size",
             fontsize=18, fontweight="bold")
ax.text(0.5, 1.02, "Each line = one HC1 subject. Point size ∝ number of clones in that tissue.",
        transform=ax.transAxes, ha="center", fontsize=12, color="gray")
ax.legend(title="Subject", fontsize=11, title_fontsize=12, loc="upper right")
ax.yaxis.set_major_formatter(ticker.FuncFormatter(lambda x, _: f"{x:,.0f}"))
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)

plt.tight_layout()
plt.savefig("plots/16_within_subject_tissue_lines.png", dpi=400, bbox_inches="tight", facecolor="white")
plt.close()
print("Saved: 16_within_subject_tissue_lines.png")

print(f"\nSummary: {len(subjects)} subjects, {len(key_tissues)} tissues, {len(records)} total clones")
