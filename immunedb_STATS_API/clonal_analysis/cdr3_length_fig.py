import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from collections import defaultdict
from stats_utils import add_significance

with open("cdr3/data/CDR3_length_distribution.json") as f:
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
    "Recovering without ICU-Improving": "Recovered",
    "Recovering post-ICU -Improving": "Recovered", "Recovering post-ICU": "Recovered",
    "Recovered": "Recovered", "COVID recovered": "Recovered",
    "healthy": "Healthy", "COVID Naive": "COVID Naive",
}

def get_study(rid):
    for prefix, short in STUDY_MAP:
        if prefix in rid:
            return short
    return None

# Collect mean and SD per subject (blood only)
subj_cdr3 = defaultdict(lambda: {"disease": "", "mean_aa": None, "sd_aa": None,
    "mean_nt": None, "sd_nt": None})

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
    vals_dict = {item["clone_id"]: item["count"] for item in sv}

    subj_cdr3[rid]["disease"] = disease_group
    subj_cdr3[rid]["mean_aa"] = vals_dict.get("mean_cdr3_aa")
    subj_cdr3[rid]["sd_aa"] = vals_dict.get("sd_cdr3_aa")
    subj_cdr3[rid]["mean_nt"] = vals_dict.get("mean_cdr3_nt")
    subj_cdr3[rid]["sd_nt"] = vals_dict.get("sd_cdr3_nt")

disease_order = ["Severe", "Moderate", "Mild", "Recovered", "COVID Naive", "Healthy"]
disease_colors = {
    "Severe": "#b71c1c", "Moderate": "#e65100", "Mild": "#ff7043",
    "Recovered": "#43a047", "Healthy": "#1565c0", "COVID Naive": "#42a5f5",
}

# Group by disease
disease_data = defaultdict(lambda: {"mean_aa": [], "sd_aa": [], "mean_nt": [], "sd_nt": []})
for rid, info in subj_cdr3.items():
    d = info["disease"]
    if d not in disease_order:
        continue
    if info["mean_aa"] is not None:
        disease_data[d]["mean_aa"].append(info["mean_aa"])
        disease_data[d]["sd_aa"].append(info["sd_aa"])
        disease_data[d]["mean_nt"].append(info["mean_nt"])
        disease_data[d]["sd_nt"].append(info["sd_nt"])

print("CDR3 Length Distribution (blood only):")
for d in disease_order:
    n = len(disease_data[d]["mean_aa"])
    m = np.median(disease_data[d]["mean_aa"]) if disease_data[d]["mean_aa"] else 0
    s = np.median(disease_data[d]["sd_aa"]) if disease_data[d]["sd_aa"] else 0
    print(f"  {d}: n={n}, median mean AA={m:.1f}, median SD AA={s:.1f}")

# ============================================================
# FIGURE: CDR3 Length Mean and SD by Disease Stage
# ============================================================
fig, axes = plt.subplots(1, 2, figsize=(20, 9))
fig.suptitle("CDR3 Length Distribution by Disease Stage (Blood Only)",
             fontsize=24, fontweight="bold", y=0.98)
fig.text(0.5, 0.93, "Mean and standard deviation of CDR3 amino acid length per subject",
         ha="center", fontsize=16, color="gray")

rng = np.random.default_rng(42)

# Panel A: Mean CDR3 AA length
ax = axes[0]
bp_data = [disease_data[d]["mean_aa"] if disease_data[d]["mean_aa"] else [0] for d in disease_order]
colors = [disease_colors[d] for d in disease_order]

bp = ax.boxplot(bp_data, positions=range(len(disease_order)), widths=0.5, patch_artist=True,
                showfliers=False, medianprops=dict(color="black", linewidth=2))
for i, patch in enumerate(bp["boxes"]):
    patch.set_facecolor(colors[i])
    patch.set_alpha(0.7)
for i, d in enumerate(disease_order):
    vals = disease_data[d]["mean_aa"]
    if vals:
        jitter = rng.uniform(-0.12, 0.12, len(vals))
        ax.scatter([i + j for j in jitter], vals, color=colors[i], s=30, alpha=0.7,
                   zorder=3, edgecolors="white", linewidth=0.5)

ax.set_xticks(range(len(disease_order)))
ax.set_xticklabels(disease_order, fontsize=14, fontweight="bold", rotation=25, ha="right")
ax.set_ylabel("Mean CDR3 Length (AA)", fontsize=16, fontweight="bold")
ax.set_title("A. Mean CDR3 Length per Subject", fontsize=18, fontweight="bold", loc="left")
ax.tick_params(axis='y', labelsize=13)
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)
add_significance(ax, [disease_data[d]["mean_aa"] for d in disease_order], disease_order)

# Panel B: SD of CDR3 AA length
ax = axes[1]
bp_data = [disease_data[d]["sd_aa"] if disease_data[d]["sd_aa"] else [0] for d in disease_order]

bp = ax.boxplot(bp_data, positions=range(len(disease_order)), widths=0.5, patch_artist=True,
                showfliers=False, medianprops=dict(color="black", linewidth=2))
for i, patch in enumerate(bp["boxes"]):
    patch.set_facecolor(colors[i])
    patch.set_alpha(0.7)
for i, d in enumerate(disease_order):
    vals = disease_data[d]["sd_aa"]
    if vals:
        jitter = rng.uniform(-0.12, 0.12, len(vals))
        ax.scatter([i + j for j in jitter], vals, color=colors[i], s=30, alpha=0.7,
                   zorder=3, edgecolors="white", linewidth=0.5)

ax.set_xticks(range(len(disease_order)))
ax.set_xticklabels(disease_order, fontsize=14, fontweight="bold", rotation=25, ha="right")
ax.set_ylabel("SD of CDR3 Length (AA)", fontsize=16, fontweight="bold")
ax.set_title("B. CDR3 Length Variability per Subject", fontsize=18, fontweight="bold", loc="left")
ax.tick_params(axis='y', labelsize=13)
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)
add_significance(ax, [disease_data[d]["sd_aa"] for d in disease_order], disease_order)

plt.tight_layout(rect=[0, 0, 1, 0.90])
plt.savefig("plots/22_cdr3_length_distribution.png", dpi=600, bbox_inches="tight", facecolor="white")
plt.close()
print("Saved: 22_cdr3_length_distribution.png")
