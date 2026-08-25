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
# FIGURE 14: Clone count per tissue — HC1 subjects (faceted)
# ============================================================
hc1_subjects = sorted(subj_tissue_clones["HC1"].keys())
ncols = 3
nrows = (len(hc1_subjects) + ncols - 1) // ncols
fig, axes = plt.subplots(nrows, ncols, figsize=(16, 5 * nrows))
if nrows == 1:
    axes = [axes]
fig.suptitle("Within-Subject Comparison: Clone Count by Tissue (HC1)",
             fontsize=20, fontweight="bold", y=0.98)
fig.text(0.5, 0.94,
         "HC1 healthy subjects — number of distinct clones per tissue",
         ha="center", fontsize=13, color="gray")

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
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    for bar, c in zip(bars, counts):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + max(counts)*0.02,
                str(c), ha="center", va="bottom", fontsize=9, fontweight="bold")

# Hide empty subplots
for idx in range(len(hc1_subjects), nrows * ncols):
    axes[idx // ncols][idx % ncols].set_visible(False)

plt.tight_layout(rect=[0, 0, 1, 0.92])
plt.savefig("plots/14_within_subject_clone_count.png", dpi=400, bbox_inches="tight", facecolor="white")
plt.close()
print("Saved: 14_within_subject_clone_count.png")

# ============================================================
# FIGURE 15: Clone size distribution — D207 (HC1) vs a GT1 subject
# ============================================================
# Pick GT1 subject with most tissues
gt1_subjects = subj_tissue_clones["GT1"]
gt1_best = max(gt1_subjects.keys(), key=lambda s: len(gt1_subjects[s]))
gt1_best_tissues = sorted(gt1_subjects[gt1_best].keys())
print(f"GT1 subject with most tissues: {gt1_best} ({len(gt1_best_tissues)} tissues: {gt1_best_tissues})")

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(20, 8))
fig.suptitle("Within-Subject Clone Size Distribution: HC1 vs GT1",
             fontsize=20, fontweight="bold", y=0.98)

# Panel A: D207 (HC1)
td = subj_tissue_clones["HC1"]["D207"]
tissues = [t for t in hc1_key_tissues if t in td]
bp_data = [td[t] for t in tissues]
positions = range(len(tissues))

vp = ax1.violinplot(bp_data, positions=positions, showmeans=False, showmedians=False, showextrema=False, widths=0.7)
for i, body in enumerate(vp["bodies"]):
    body.set_facecolor(tissue_colors.get(tissues[i], "#999"))
    body.set_alpha(0.4)
    body.set_edgecolor(tissue_colors.get(tissues[i], "#999"))
bp = ax1.boxplot(bp_data, positions=positions, widths=0.15, patch_artist=True,
                showfliers=False, zorder=3, medianprops=dict(color="black", linewidth=1.5))
for i, patch in enumerate(bp["boxes"]):
    patch.set_facecolor(tissue_colors.get(tissues[i], "#999"))
    patch.set_alpha(0.8)
for i, t in enumerate(tissues):
    ax1.scatter(i, np.mean(td[t]), color="red", marker="D", s=50, zorder=4)

ax1.set_yscale("log")
ax1.set_xticks(positions)
ax1.set_xticklabels(tissues, fontsize=12, rotation=30, ha="right")
ax1.set_ylabel("Clone Size (unique sequences, log scale)", fontsize=13, fontweight="bold")
ax1.set_xlabel("Tissue", fontsize=13, fontweight="bold")
ax1.set_title(f"A. HC1 — Subject D207", fontsize=16, fontweight="bold", loc="left")
ax1.yaxis.set_major_formatter(ticker.FuncFormatter(lambda x, _: f"{x:,.0f}"))
ax1.spines["top"].set_visible(False)
ax1.spines["right"].set_visible(False)

# Panel B: GT1 best subject
td2 = gt1_subjects[gt1_best]
tissues2 = gt1_best_tissues
bp_data2 = [td2[t] for t in tissues2]
positions2 = range(len(tissues2))

if any(len(d) >= 2 for d in bp_data2):
    vp2 = ax2.violinplot([d for d in bp_data2 if len(d) >= 2],
                         positions=[i for i, d in enumerate(bp_data2) if len(d) >= 2],
                         showmeans=False, showmedians=False, showextrema=False, widths=0.7)
    for body_idx, i in enumerate([i for i, d in enumerate(bp_data2) if len(d) >= 2]):
        vp2["bodies"][body_idx].set_facecolor(tissue_colors.get(tissues2[i], "#999"))
        vp2["bodies"][body_idx].set_alpha(0.4)
        vp2["bodies"][body_idx].set_edgecolor(tissue_colors.get(tissues2[i], "#999"))

bp2_valid = [i for i, d in enumerate(bp_data2) if len(d) >= 2]
if bp2_valid:
    bp2 = ax2.boxplot([bp_data2[i] for i in bp2_valid], positions=bp2_valid, widths=0.15,
                      patch_artist=True, showfliers=False, zorder=3,
                      medianprops=dict(color="black", linewidth=1.5))
    for j, i in enumerate(bp2_valid):
        bp2["boxes"][j].set_facecolor(tissue_colors.get(tissues2[i], "#999"))
        bp2["boxes"][j].set_alpha(0.8)

for i, t in enumerate(tissues2):
    if len(td2[t]) == 1:
        ax2.scatter(i, td2[t][0], color=tissue_colors.get(t, "#999"), s=60, zorder=4, edgecolors="black", linewidth=0.5)
    else:
        ax2.scatter(i, np.mean(td2[t]), color="red", marker="D", s=50, zorder=4)

ax2.set_yscale("log")
ax2.set_xticks(positions2)
ax2.set_xticklabels(tissues2, fontsize=10, rotation=45, ha="right")
ax2.set_ylabel("Clone Size (unique sequences, log scale)", fontsize=13, fontweight="bold")
ax2.set_xlabel("Tissue", fontsize=13, fontweight="bold")
ax2.set_title(f"B. GT1 — Subject {gt1_best}", fontsize=16, fontweight="bold", loc="left")
ax2.yaxis.set_major_formatter(ticker.FuncFormatter(lambda x, _: f"{x:,.0f}"))
ax2.spines["top"].set_visible(False)
ax2.spines["right"].set_visible(False)

plt.tight_layout(rect=[0, 0, 1, 0.94])
plt.savefig("plots/15_within_subject_clone_size_cross_study.png", dpi=400, bbox_inches="tight", facecolor="white")
plt.close()
print("Saved: 15_within_subject_clone_size_cross_study.png")

# ============================================================
# FIGURE 16: Median clone size lines — HC1 and GT1 together
# ============================================================
# Use tissues present in both studies
all_tissues = sorted(set(
    [t for s in subj_tissue_clones["HC1"].values() for t in s.keys()] +
    [t for s in subj_tissue_clones["GT1"].values() for t in s.keys()]
))
# Focus on tissues with data from multiple subjects in either study
common_tissues = []
for t in all_tissues:
    hc1_count = sum(1 for s in subj_tissue_clones["HC1"].values() if t in s)
    gt1_count = sum(1 for s in subj_tissue_clones["GT1"].values() if t in s)
    if hc1_count >= 2 or gt1_count >= 2:
        common_tissues.append(t)

fig, ax = plt.subplots(figsize=(14, 8))

for study in ["HC1", "GT1"]:
    subjects = sorted(subj_tissue_clones[study].keys())
    color = study_colors[study]
    for idx, subj in enumerate(subjects):
        td = subj_tissue_clones[study][subj]
        tissues = [t for t in common_tissues if t in td]
        if not tissues:
            continue
        x_pos = [common_tissues.index(t) for t in tissues]
        medians = [np.median(td[t]) for t in tissues]
        n_clones = [len(td[t]) for t in tissues]
        label = f"{study}: {subj}" if idx == 0 or True else None
        ax.plot(x_pos, medians, alpha=0.4, linewidth=1.0, color=color)
        ax.scatter(x_pos, medians,
                   s=[max(20, min(n*0.8, 200)) for n in n_clones],
                   alpha=0.6, color=color, zorder=3, edgecolors="white", linewidth=0.5)

# Legend: one entry per study
from matplotlib.lines import Line2D
legend_handles = [
    Line2D([0], [0], color=study_colors["HC1"], marker="o", markersize=8, linewidth=2, label="HC1 (healthy)"),
    Line2D([0], [0], color=study_colors["GT1"], marker="o", markersize=8, linewidth=2, label="GT1 (gut transplant)"),
]
ax.legend(handles=legend_handles, fontsize=12, title="Study", title_fontsize=13, loc="upper right")

ax.set_yscale("log")
ax.set_xticks(range(len(common_tissues)))
ax.set_xticklabels(common_tissues, fontsize=11, rotation=45, ha="right")
ax.set_ylabel("Median Clone Size (unique sequences, log scale)", fontsize=14, fontweight="bold")
ax.set_xlabel("Tissue", fontsize=14, fontweight="bold")
ax.set_title("Within-Subject Tissue Comparison: HC1 vs GT1",
             fontsize=18, fontweight="bold")
ax.text(0.5, 1.02, "Each line = one subject. Point size proportional to number of clones.",
        transform=ax.transAxes, ha="center", fontsize=12, color="gray")
ax.yaxis.set_major_formatter(ticker.FuncFormatter(lambda x, _: f"{x:,.0f}"))
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)

plt.tight_layout()
plt.savefig("plots/16_within_subject_tissue_lines.png", dpi=400, bbox_inches="tight", facecolor="white")
plt.close()
print("Saved: 16_within_subject_tissue_lines.png")

# Summary
hc1_recs = [r for r in records if r["study"] == "HC1"]
gt1_recs = [r for r in records if r["study"] == "GT1"]
print(f"\nSummary:")
print(f"  HC1: {len(hc1_subjects)} subjects, {len(hc1_recs)} clones")
print(f"  GT1: {len(gt1_subjects)} subjects, {len(gt1_recs)} clones")
