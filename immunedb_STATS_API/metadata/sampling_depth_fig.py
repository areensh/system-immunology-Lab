import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from collections import defaultdict

# ---- Load metadata ----
with open("metadata/data/metadata_ALL.json") as f:
    meta_data = json.load(f)

# ---- Load clone size copies data for sequencing depth ----
with open("clonal_analysis/clone_size/data/clone_size_ALL_tissue_sex_age_with_GT1_copies.json") as f:
    copies_data = json.load(f)

STUDY_MAP = [
    ("Covid19_db3", "CD1"), ("covid_db2", "CD2"), ("covid19", "CD3"),
    ("vaccine2", "CVX1"), ("covid_vaccine_new", "CVX2"),
    ("lp16", "HC1"), ("sykesIgblast2020", "GT1"),
]

EXCLUDE = {"lp16_Igblast-D159", "lp16_Igblast-D154", "lp16_Igblast-Hu-1",
           "covid_vaccine_new-Fb", "covid_vaccine_new-Water"}

def get_study(rid):
    for prefix, short in STUDY_MAP:
        if prefix in rid:
            return short
    return None

# ---- Metadata: tissues, cell subsets per study ----
study_meta = defaultdict(lambda: {"subjects": set(), "tissues": set(), "cell_subsets": set(), "samples": 0})
study_subj_samples = defaultdict(lambda: defaultdict(int))
for entry in meta_data["Result"]:
    rep = entry["repertoire"]
    rid = rep["repertoire_id"]
    study = get_study(rid)
    if not study:
        continue
    if rid in EXCLUDE:
        continue
    keys = [k.strip() for k in rep.get("meta_key", [])]
    vals = [v.strip() for v in rep.get("meta_value", [])]
    meta = dict(zip(keys, vals))
    study_meta[study]["subjects"].add(rid)
    tissue = meta.get("tissue", "NA")
    if tissue != "NA":
        study_meta[study]["tissues"].add(tissue)
    cs = meta.get("cell_subset", "NA")
    if cs != "NA":
        study_meta[study]["cell_subsets"].add(cs)
    study_meta[study]["samples"] += 1
    study_subj_samples[study][rid] += 1

# ---- Enrich tissue counts from clone_size_ALL_tissue.json ----
with open("clonal_analysis/clone_size/data/clone_size_ALL_tissue.json") as f:
    tissue_data = json.load(f)
for entry in tissue_data["Result"]:
    rep = entry["repertoire"]
    rid = rep["repertoire_id"]
    study = get_study(rid)
    if not study:
        continue
    if rid in EXCLUDE:
        continue
    keys = [k.strip() for k in rep.get("meta_key", [])]
    vals = [v.strip() for v in rep.get("meta_value", [])]
    meta = dict(zip(keys, vals))
    tissue = meta.get("tissue", "NA")
    if tissue != "NA":
        study_meta[study]["tissues"].add(tissue)

# ---- Clone data: sequencing depth per subject (total copies) ----
# copies_data has CD1, CD2, CVX1, CVX2, HC1; tissue_data adds CD3, GT1 (unique only)
subj_depth = defaultdict(lambda: {"study": "", "n_clones": 0, "total_seqs": 0})
copies_subjects = set()
for entry in copies_data["Result"]:
    rep = entry["repertoire"]
    rid = rep["repertoire_id"]
    study = get_study(rid)
    if not study or rid in EXCLUDE:
        continue
    copies_subjects.add(rid)
    stats = entry.get("statistics", [])
    if stats and stats[0].get("stats_value"):
        sv = stats[0]["stats_value"][0]
        count = sv.get("count", 0)
        subj_depth[rid]["study"] = study
        subj_depth[rid]["n_clones"] += 1
        subj_depth[rid]["total_seqs"] += count
# Fill in studies missing from copies data (CD3, GT1) using tissue data
for entry in tissue_data["Result"]:
    rep = entry["repertoire"]
    rid = rep["repertoire_id"]
    study = get_study(rid)
    if not study or rid in EXCLUDE:
        continue
    if rid in copies_subjects:
        continue
    stats = entry.get("statistics", [])
    if stats and stats[0].get("stats_value"):
        sv = stats[0]["stats_value"][0]
        count = sv.get("count", 0)
        subj_depth[rid]["study"] = study
        subj_depth[rid]["n_clones"] += 1
        subj_depth[rid]["total_seqs"] += count

# Aggregate per study
study_depth = defaultdict(lambda: {"seqs_per_subj": [], "clones_per_subj": []})
for subj, info in subj_depth.items():
    s = info["study"]
    study_depth[s]["seqs_per_subj"].append(info["total_seqs"])
    study_depth[s]["clones_per_subj"].append(info["n_clones"])

# ---- Build table data ----
studies_with_data = ["CD1", "CD2", "CD3", "CVX1", "CVX2", "HC1", "GT1"]

study_colors = {
    "CD1": "#1565c0", "CD2": "#1976d2", "CD3": "#42a5f5",
    "CVX1": "#e65100", "CVX2": "#ff9800",
    "HC1": "#2e7d32", "GT1": "#78909c",
}

# ============================================================
# FIGURE: Multi-panel sampling depth overview
# ============================================================
fig, axes = plt.subplots(1, 3, figsize=(18, 7))
fig.suptitle("Sampling Depth Across Studies", fontsize=20, fontweight="bold", y=0.98)
fig.text(0.5, 0.93, "Number of individuals, sequencing depth (total sequences per subject), and samples per subject",
         ha="center", fontsize=13, color="gray")

# Panel A: Subjects per study
ax = axes[0]
x_studies = studies_with_data
n_subjects = [len(study_meta[s]["subjects"]) if s in study_meta else 0 for s in x_studies]
colors = [study_colors.get(s, "#999") for s in x_studies]
bars = ax.bar(range(len(x_studies)), n_subjects, color=colors, edgecolor="white", linewidth=0.5)
for bar, n in zip(bars, n_subjects):
    ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.5,
            str(n), ha="center", va="bottom", fontsize=11, fontweight="bold")
ax.set_xticks(range(len(x_studies)))
ax.set_xticklabels(x_studies, fontsize=12, fontweight="bold")
ax.set_ylabel("Number of Subjects", fontsize=13, fontweight="bold")
ax.set_title("A. Subjects per Study", fontsize=15, fontweight="bold", loc="left")
ax.set_ylim(0, max(n_subjects) * 1.15)
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)

# Panel B: Sequencing depth (box plot of seqs per subject)
ax = axes[1]
bp_data = [study_depth[s]["seqs_per_subj"] if study_depth[s]["seqs_per_subj"] else [0] for s in x_studies]
bp = ax.boxplot(bp_data, positions=range(len(x_studies)), widths=0.5, patch_artist=True,
                showfliers=True, flierprops=dict(marker="o", markersize=4, alpha=0.5),
                medianprops=dict(color="black", linewidth=2))
for i, patch in enumerate(bp["boxes"]):
    patch.set_facecolor(colors[i])
    patch.set_alpha(0.7)

# Overlay individual points
for i, s in enumerate(x_studies):
    vals = study_depth[s]["seqs_per_subj"]
    jitter = np.random.default_rng(42).uniform(-0.12, 0.12, len(vals))
    ax.scatter([i + j for j in jitter], vals, color=colors[i], s=20, alpha=0.6, zorder=3, edgecolors="white", linewidth=0.3)

ax.set_yscale("log")
ax.set_xticks(range(len(x_studies)))
ax.set_xticklabels(x_studies, fontsize=12, fontweight="bold")
ax.set_ylabel("Total Sequences per Subject (log)", fontsize=13, fontweight="bold")
ax.set_title("B. Sequencing Depth", fontsize=15, fontweight="bold", loc="left")
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)

# Panel C: Samples per subject
ax = axes[2]
bp_data_c = [list(study_subj_samples[s].values()) if study_subj_samples[s] else [0] for s in x_studies]
bp_c = ax.boxplot(bp_data_c, positions=range(len(x_studies)), widths=0.5, patch_artist=True,
                  showfliers=True, flierprops=dict(marker="o", markersize=4, alpha=0.5),
                  medianprops=dict(color="black", linewidth=2))
for i, patch in enumerate(bp_c["boxes"]):
    patch.set_facecolor(colors[i])
    patch.set_alpha(0.7)

for i, s in enumerate(x_studies):
    vals = list(study_subj_samples[s].values())
    if vals:
        jitter = np.random.default_rng(42).uniform(-0.12, 0.12, len(vals))
        ax.scatter([i + j for j in jitter], vals, color=colors[i], s=20, alpha=0.6, zorder=3, edgecolors="white", linewidth=0.3)

ax.set_xticks(range(len(x_studies)))
ax.set_xticklabels(x_studies, fontsize=12, fontweight="bold")
ax.set_ylabel("Samples per Subject", fontsize=13, fontweight="bold")
ax.set_title("C. Samples per Subject", fontsize=15, fontweight="bold", loc="left")
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)

plt.tight_layout(rect=[0, 0, 1, 0.90])
plt.savefig("metadata/plots/06_sampling_depth.png", dpi=400, bbox_inches="tight", facecolor="white")
plt.close()
print("Saved: metadata/plots/06_sampling_depth.png")
