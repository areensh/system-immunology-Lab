import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from collections import defaultdict

with open("clone_size/data/clone_size_disease_stage_CTE.json") as f:
    data = json.load(f)

STUDY_MAP = [
    ("Covid19_db3", "CD1"), ("covid_db2", "CD2"), ("covid19", "CD3"),
    ("vaccine2", "CVX1"), ("covid_vaccine_new", "CVX2"),
    ("lp16", "HC1"),
]

EXCLUDE = {"lp16_Igblast-D159", "lp16_Igblast-D154", "lp16_Igblast-Hu-1",
           "covid_vaccine_new-Fb", "covid_vaccine_new-Water"}

BLOOD_TISSUES = {"blood", "Peripheral blood", "PBL", "PBMC"}

DISEASE_MAP = {
    "severe": "Severe", "Early phase hypoxaemia": "Severe",
    "mild": "Mild", "non-severe": "Mild",
    "Early phase-Stable": "Moderate", "Early phase-Improving": "Moderate",
    "Recovering without ICU-Improving": "Moderate",
    "Recovering post-ICU -Improving": "Moderate", "Recovering post-ICU": "Moderate",
    "Recovered": "Recovered", "COVID recovered": "Recovered",
    "healthy": "Healthy", "COVID Naive": "COVID Naive",
}

def get_study(rid):
    for prefix, short in STUDY_MAP:
        if prefix in rid:
            return short
    return None

# Collect clone sizes per subject (blood only)
subj_data = defaultdict(lambda: {"disease": "", "sizes": []})
for entry in data["Result"]:
    rep = entry["repertoire"]
    rid = rep["repertoire_id"]
    study = get_study(rid)
    if not study or rid in EXCLUDE:
        continue
    keys = rep.get("meta_key", [])
    vals = rep.get("meta_value", [])
    if isinstance(keys, list):
        meta = dict(zip(keys, vals))
    else:
        meta = {keys: vals}
    tissue = meta.get("tissue", "")
    if tissue not in BLOOD_TISSUES:
        continue
    disease = meta.get("disease_stage", "")
    disease_group = DISEASE_MAP.get(disease, disease)
    sv = entry["statistics"][0]["stats_value"]
    if not sv:
        continue
    subj_data[rid]["disease"] = disease_group
    subj_data[rid]["sizes"].append(sv[0]["count"])

disease_order = ["Severe", "Moderate", "Mild", "Recovered", "Healthy", "COVID Naive"]
disease_colors = {
    "Severe": "#b71c1c", "Moderate": "#e65100", "Mild": "#ff7043",
    "Recovered": "#43a047", "Healthy": "#1565c0", "COVID Naive": "#42a5f5",
}

# Aggregate all clone sizes per disease category
disease_sizes = defaultdict(list)
disease_medians = defaultdict(list)
for rid, info in subj_data.items():
    if not info["sizes"] or info["disease"] not in disease_order:
        continue
    disease_sizes[info["disease"]].extend(info["sizes"])
    disease_medians[info["disease"]].append(np.median(info["sizes"]))

for d in disease_order:
    print(f"{d}: {len(disease_sizes[d])} clones, {len(disease_medians[d])} subjects, "
          f"median of medians={np.median(disease_medians[d]):.0f}")

# ============================================================
# FIGURE A: Clone size distribution — boxplot per disease category
# ============================================================
fig, axes = plt.subplots(1, 2, figsize=(16, 7))
fig.suptitle("Clone Size Distribution by Disease Stage (Blood Only)",
             fontsize=18, fontweight="bold", y=0.98)
fig.text(0.5, 0.93, "Expanded clones (unique sequences > 20)",
         ha="center", fontsize=13, color="gray")

# Panel A: All clone sizes pooled per disease (violin + boxplot)
ax = axes[0]
bp_data = [np.log10(np.array(disease_sizes[d])) for d in disease_order]
colors = [disease_colors[d] for d in disease_order]
rng = np.random.default_rng(42)

vp = ax.violinplot(bp_data, positions=range(len(disease_order)), showmeans=False,
                   showmedians=False, showextrema=False, widths=0.7)
for i, body in enumerate(vp["bodies"]):
    body.set_facecolor(colors[i])
    body.set_alpha(0.35)
    body.set_edgecolor(colors[i])

bp = ax.boxplot(bp_data, positions=range(len(disease_order)), widths=0.15, patch_artist=True,
                showfliers=False, medianprops=dict(color="black", linewidth=2))
for i, patch in enumerate(bp["boxes"]):
    patch.set_facecolor(colors[i])
    patch.set_alpha(0.8)

ax.set_xticks(range(len(disease_order)))
ax.set_xticklabels(disease_order, fontsize=10, fontweight="bold", rotation=25, ha="right")
ax.set_ylabel("Clone Size (log₁₀ unique sequences)", fontsize=13, fontweight="bold")
ax.set_title("A. Clone Size Distribution (all clones)", fontsize=14, fontweight="bold", loc="left")
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)

# Add n= labels
for i, d in enumerate(disease_order):
    ax.text(i, ax.get_ylim()[0] + 0.02, f"n={len(disease_sizes[d])}",
            ha="center", va="bottom", fontsize=8, color="gray")

# Panel B: Median clone size per subject
ax = axes[1]
bp_data2 = [disease_medians[d] for d in disease_order]

bp2 = ax.boxplot(bp_data2, positions=range(len(disease_order)), widths=0.5, patch_artist=True,
                 showfliers=False, medianprops=dict(color="black", linewidth=2))
for i, patch in enumerate(bp2["boxes"]):
    patch.set_facecolor(colors[i])
    patch.set_alpha(0.7)

for i, d in enumerate(disease_order):
    vals = disease_medians[d]
    if vals:
        jitter = rng.uniform(-0.12, 0.12, len(vals))
        ax.scatter([i + j for j in jitter], vals, color=colors[i], s=30, alpha=0.7,
                   zorder=3, edgecolors="white", linewidth=0.5)

ax.set_yscale("log")
ax.set_xticks(range(len(disease_order)))
ax.set_xticklabels(disease_order, fontsize=10, fontweight="bold", rotation=25, ha="right")
ax.set_ylabel("Median Clone Size per Subject (log)", fontsize=13, fontweight="bold")
ax.set_title("B. Median Clone Size per Subject", fontsize=14, fontweight="bold", loc="left")
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)

for i, d in enumerate(disease_order):
    ax.text(i, ax.get_ylim()[0] * 1.1, f"n={len(disease_medians[d])}",
            ha="center", va="bottom", fontsize=8, color="gray")

plt.tight_layout(rect=[0, 0, 1, 0.90])
plt.savefig("plots/20_clone_size_distribution.png", dpi=400, bbox_inches="tight", facecolor="white")
plt.close()
print("Saved: 20_clone_size_distribution.png")
