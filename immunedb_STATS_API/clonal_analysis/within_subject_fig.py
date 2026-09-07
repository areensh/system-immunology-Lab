import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import numpy as np
from collections import defaultdict

with open("clone_size/data/clone_size_ALL_tissue.json") as f:
    data = json.load(f)

STUDY_MAP = [
    ("lp16", "HC1"), ("sykesIgblast2020", "GT1"),
]

EXCLUDE = {"lp16_Igblast-D159", "lp16_Igblast-D154", "lp16_Igblast-Hu-1"}

def get_study(rid):
    for prefix, short in STUDY_MAP:
        if prefix in rid:
            return short
    return None

records = []
for entry in data["Result"]:
    rep = entry["repertoire"]
    rid = rep["repertoire_id"]
    study = get_study(rid)
    if not study:
        continue
    if rid in EXCLUDE:
        continue
    keys = rep["meta_key"]
    vals = rep["meta_value"]
    if isinstance(keys, list):
        meta = dict(zip(keys, vals))
    else:
        meta = {keys: vals}
    tissue = meta.get("tissue")
    if not tissue:
        continue
    sv = entry["statistics"][0]["stats_value"]
    if not sv:
        continue
    subj_name = rid.split("-", 1)[1] if "-" in rid else rid
    records.append({
        "subject": subj_name,
        "study": study,
        "tissue": tissue,
        "clone_id": sv[0]["clone_id"],
        "clone_size": sv[0]["count"],
    })

# Shared tissues between HC1 and GT1
hc1_tissues = set(r["tissue"] for r in records if r["study"] == "HC1")
gt1_tissues = set(r["tissue"] for r in records if r["study"] == "GT1")
shared_tissues = sorted(hc1_tissues & gt1_tissues)
print(f"HC1 tissues: {sorted(hc1_tissues)}")
print(f"GT1 tissues: {sorted(gt1_tissues)}")
print(f"Shared tissues: {shared_tissues}")

# Key tissues for HC1 (original set)
hc1_key_tissues = ["PBL", "BM", "SPL", "Lung", "Colon", "Ileum", "MLN"]
# Key tissues for GT1 — use tissues with multiple subjects
gt1_tissue_subjs = defaultdict(set)
for r in records:
    if r["study"] == "GT1":
        gt1_tissue_subjs[r["tissue"]].add(r["subject"])
gt1_key_tissues = sorted([t for t, s in gt1_tissue_subjs.items() if len(s) >= 2],
                         key=lambda t: -len(gt1_tissue_subjs[t]))
print(f"GT1 tissues with >=2 subjects: {gt1_key_tissues}")

# Tissues shared between studies for cross-study comparison
cross_tissues = [t for t in hc1_key_tissues if t in gt1_tissues]
print(f"Cross-study tissues: {cross_tissues}")

tissue_colors = {
    "PBL": "#2D6A8F", "PBMC": "#2D6A8F", "BM": "#b71c1c", "Bone Marrow": "#b71c1c",
    "SPL": "#7e57c2", "Spleen": "#7e57c2",
    "Lung": "#5B7C3A", "Colon": "#e65100", "Ileum": "#ff9800",
    "MLN": "#78909c", "Jejunum": "#d4a017", "Duodenum": "#8d6e63",
    "Rectum": "#c62828", "Bowel": "#ef6c00", "Small Intestine": "#ffa726",
    "Cecum_allograft": "#a1887f", "Colon_allograft": "#e65100",
    "Duodenum_allograft": "#8d6e63", "Ileum_allograft": "#ff9800",
    "Jejunum_allograft": "#d4a017", "MLN_allograft": "#78909c",
    "Stomach": "#5d4037", "Stomach_allograft": "#5d4037",
    "AxLN": "#455a64",
}

study_colors = {"HC1": "#2e7d32", "GT1": "#78909c"}

# Group by study, subject, tissue
subj_tissue_clones = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
for r in records:
    subj_tissue_clones[r["study"]][r["subject"]][r["tissue"]].append(r["clone_size"])

# ============================================================
# FIGURE 14: Clone count per tissue — HC1 subjects (faceted, uniform scale)
# ============================================================
hc1_subjects = sorted(subj_tissue_clones["HC1"].keys())
ncols = 3
nrows = (len(hc1_subjects) + ncols - 1) // ncols

# Find global max for uniform y-axis
global_max = 0
for subj in hc1_subjects:
    td = subj_tissue_clones["HC1"][subj]
    for t in hc1_key_tissues:
        if t in td:
            global_max = max(global_max, len(td[t]))

fig, axes = plt.subplots(nrows, ncols, figsize=(20, 6 * nrows))
if nrows == 1:
    axes = [axes]
fig.suptitle("Within-Subject Comparison: Clone Count by Tissue (HC1)",
             fontsize=20, fontweight="bold", y=1.02)
fig.text(0.5, 0.97,
         "HC1 healthy subjects — number of distinct clones per tissue",
         ha="center", fontsize=14, color="gray")

for idx, subj in enumerate(hc1_subjects):
    ax = axes[idx // ncols][idx % ncols]
    td = subj_tissue_clones["HC1"][subj]
    tissues = [t for t in hc1_key_tissues if t in td]
    counts = [len(td[t]) for t in tissues]
    colors = [tissue_colors.get(t, "#999") for t in tissues]
    bars = ax.bar(range(len(tissues)), counts, color=colors, edgecolor="white", linewidth=0.5)
    ax.set_xticks(range(len(tissues)))
    ax.set_xticklabels(tissues, rotation=30, ha="right", fontsize=11)
    ax.set_title(subj, fontsize=15, fontweight="bold")
    ax.set_ylabel("# Clones", fontsize=12)
    ax.set_ylim(0, global_max * 1.12)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    for bar, c in zip(bars, counts):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + global_max*0.02,
                str(c), ha="center", va="bottom", fontsize=9, fontweight="bold")

# Hide empty subplots
for idx in range(len(hc1_subjects), nrows * ncols):
    axes[idx // ncols][idx % ncols].set_visible(False)

plt.tight_layout(rect=[0, 0, 1, 0.93])
plt.savefig("plots/14_within_subject_clone_count.png", dpi=600, bbox_inches="tight", facecolor="white")
plt.close()
print("Saved: 14_within_subject_clone_count.png")

# ============================================================
# FIGURE 15: Same-tissue comparison between HC1 D207 and GT1 subject
# ============================================================
# Find GT1 subject with most overlap in shared tissues
shared_tissues = ["Colon", "Ileum", "Jejunum", "MLN"]
gt1_subjects = subj_tissue_clones["GT1"]

gt1_best = None
gt1_best_count = 0
for subj, td in gt1_subjects.items():
    overlap = sum(1 for t in shared_tissues if t in td and len(td[t]) >= 5)
    if overlap > gt1_best_count:
        gt1_best_count = overlap
        gt1_best = subj
print(f"GT1 subject for comparison: {gt1_best} ({gt1_best_count} shared tissues with enough clones)")

# Use only tissues present in both subjects
hc1_subj = "D207"
td_hc1 = subj_tissue_clones["HC1"][hc1_subj]
td_gt1 = gt1_subjects[gt1_best]
compare_tissues = [t for t in shared_tissues if t in td_hc1 and t in td_gt1]
print(f"Tissues for comparison: {compare_tissues}")

fig, axes = plt.subplots(1, len(compare_tissues), figsize=(7 * len(compare_tissues), 9))
if len(compare_tissues) == 1:
    axes = [axes]
fig.suptitle(f"Cross-Study Tissue Comparison: HC1 (D207) vs GT1 ({gt1_best})",
             fontsize=20, fontweight="bold", y=1.02)
fig.text(0.5, 0.96, "Clone size distribution in matched tissues across two studies",
         ha="center", fontsize=14, color="gray")

for i, tissue in enumerate(compare_tissues):
    ax = axes[i]
    data_pair = [td_hc1[tissue], td_gt1[tissue]]
    labels = [f"HC1\nD207\n(n={len(data_pair[0])})", f"GT1\n{gt1_best}\n(n={len(data_pair[1])})"]
    colors_pair = [study_colors["HC1"], study_colors["GT1"]]

    # Violin + boxplot side by side
    if all(len(d) >= 2 for d in data_pair):
        vp = ax.violinplot(data_pair, positions=[0, 1], showmeans=False, showmedians=False,
                           showextrema=False, widths=0.6)
        for j, body in enumerate(vp["bodies"]):
            body.set_facecolor(colors_pair[j])
            body.set_alpha(0.35)
            body.set_edgecolor(colors_pair[j])

    bp = ax.boxplot(data_pair, positions=[0, 1], widths=0.2, patch_artist=True,
                    showfliers=False, zorder=3, medianprops=dict(color="black", linewidth=1.5))
    for j, patch in enumerate(bp["boxes"]):
        patch.set_facecolor(colors_pair[j])
        patch.set_alpha(0.8)

    for j, d in enumerate(data_pair):
        ax.scatter(j, np.mean(d), color="red", marker="D", s=50, zorder=4)

    ax.set_yscale("log")
    ax.set_xticks([0, 1])
    ax.set_xticklabels(labels, fontsize=11)
    ax.set_title(tissue, fontsize=16, fontweight="bold")
    if i == 0:
        ax.set_ylabel("Clone Size (unique sequences, log scale)", fontsize=13, fontweight="bold")
    ax.yaxis.set_major_formatter(ticker.FuncFormatter(lambda x, _: f"{x:,.0f}"))
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

plt.tight_layout(rect=[0, 0, 1, 0.91])
plt.savefig("plots/15_within_subject_clone_size_cross_study.png", dpi=600, bbox_inches="tight", facecolor="white")
plt.close()
print("Saved: 15_within_subject_clone_size_cross_study.png")

# ============================================================
# FIGURE 16: Median clone size by tissue — HC1 vs GT1 (grouped dots)
# ============================================================
# Only use tissues shared between both studies
compare_all_tissues = [t for t in shared_tissues
                       if any(t in s for s in subj_tissue_clones["HC1"].values())
                       and any(t in s for s in subj_tissue_clones["GT1"].values())]

fig, ax = plt.subplots(figsize=(14, 10))
rng = np.random.default_rng(42)

for ti, tissue in enumerate(compare_all_tissues):
    # HC1 subjects
    hc1_medians = []
    for subj, td in subj_tissue_clones["HC1"].items():
        if tissue in td:
            hc1_medians.append(np.median(td[tissue]))
    # GT1 subjects
    gt1_medians = []
    for subj, td in subj_tissue_clones["GT1"].items():
        if tissue in td:
            gt1_medians.append(np.median(td[tissue]))

    x_hc1 = ti - 0.15
    x_gt1 = ti + 0.15
    jitter_hc1 = rng.uniform(-0.06, 0.06, len(hc1_medians))
    jitter_gt1 = rng.uniform(-0.06, 0.06, len(gt1_medians))

    ax.scatter([x_hc1 + j for j in jitter_hc1], hc1_medians,
               color=study_colors["HC1"], s=60, alpha=0.7, zorder=3,
               edgecolors="white", linewidth=0.5)
    ax.scatter([x_gt1 + j for j in jitter_gt1], gt1_medians,
               color=study_colors["GT1"], s=60, alpha=0.7, zorder=3,
               edgecolors="white", linewidth=0.5)

    # Group medians
    if hc1_medians:
        ax.scatter(x_hc1, np.median(hc1_medians), color=study_colors["HC1"],
                   s=200, marker="_", linewidths=3, zorder=4)
    if gt1_medians:
        ax.scatter(x_gt1, np.median(gt1_medians), color=study_colors["GT1"],
                   s=200, marker="_", linewidths=3, zorder=4)

from matplotlib.lines import Line2D
legend_handles = [
    Line2D([0], [0], color=study_colors["HC1"], marker="o", markersize=8, linestyle="None", label="HC1 (healthy)"),
    Line2D([0], [0], color=study_colors["GT1"], marker="o", markersize=8, linestyle="None", label="GT1 (gut transplant)"),
]
ax.legend(handles=legend_handles, fontsize=12, title="Study", title_fontsize=13, loc="upper right")

ax.set_yscale("log")
ax.set_xticks(range(len(compare_all_tissues)))
ax.set_xticklabels(compare_all_tissues, fontsize=14, fontweight="bold")
ax.set_ylabel("Median Clone Size per Subject (log scale)", fontsize=14, fontweight="bold")
ax.set_xlabel("Tissue", fontsize=14, fontweight="bold")
ax.set_title("Cross-Study Tissue Comparison: Median Clone Size",
             fontsize=20, fontweight="bold", pad=35)
ax.text(0.5, 1.06, "Each dot = one subject's median clone size in that tissue. Bar = group median.",
        transform=ax.transAxes, ha="center", fontsize=13, color="gray")
ax.yaxis.set_major_formatter(ticker.FuncFormatter(lambda x, _: f"{x:,.0f}"))
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)

plt.tight_layout()
plt.savefig("plots/16_within_subject_tissue_lines.png", dpi=600, bbox_inches="tight", facecolor="white")
plt.close()
print("Saved: 16_within_subject_tissue_lines.png")

# Summary
hc1_recs = [r for r in records if r["study"] == "HC1"]
gt1_recs = [r for r in records if r["study"] == "GT1"]
print(f"\nSummary:")
print(f"  HC1: {len(set(r['subject'] for r in hc1_recs))} subjects, {len(hc1_recs)} clones")
print(f"  GT1: {len(set(r['subject'] for r in gt1_recs))} subjects, {len(gt1_recs)} clones")
