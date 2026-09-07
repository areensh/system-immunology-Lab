import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from collections import defaultdict
from stats_utils import add_significance

with open("cdr3/data/CDR3_length_distribution.json") as f:
    all_data = json.load(f)

with open("/root/.claude/uploads/9ad2f9ef-3c95-5d26-b4b3-317875003fae/3bac72cc-CDR3_dist_tissue_dissease_clone_size__threshold.json") as f:
    exp_data = json.load(f)

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

def parse_all_clones(data):
    subj = defaultdict(lambda: {"disease": "", "mean_aa": None, "sd_aa": None})
    for entry in data["Result"]:
        rep = entry["repertoire"]
        rid = rep["repertoire_id"]
        study = get_study(rid)
        if not study or rid in EXCLUDE:
            continue
        keys = rep.get("meta_key", [])
        vals = rep.get("meta_value", [])
        meta = dict(zip(keys, vals)) if isinstance(keys, list) else {keys: vals}
        if meta.get("tissue", "") not in BLOOD_TISSUES:
            continue
        disease = DISEASE_MAP.get(meta.get("disease_stage", ""), None)
        if disease is None:
            continue
        sv = entry["statistics"][0]["stats_value"]
        if not sv:
            continue
        vals_dict = {item["clone_id"]: item["count"] for item in sv}
        subj[rid]["disease"] = disease
        subj[rid]["mean_aa"] = vals_dict.get("mean_cdr3_aa")
        subj[rid]["sd_aa"] = vals_dict.get("sd_cdr3_aa")
    return subj

def parse_expanded(data):
    subj = defaultdict(lambda: {"disease": "", "mean_aa": None, "sd_aa": None})
    for entry in data["Result"]:
        rep = entry["repertoire"]
        rid = rep["repertoire_id"]
        study = get_study(rid)
        if not study or rid in EXCLUDE:
            continue
        keys = rep.get("meta_key", [])
        vals = rep.get("meta_value", [])
        meta = dict(zip(keys, vals)) if isinstance(keys, list) else {keys: vals}
        if meta.get("tissue", "") not in BLOOD_TISSUES:
            continue
        disease = DISEASE_MAP.get(meta.get("disease_stage", ""), None)
        if disease is None:
            continue
        sv = entry["statistics"][0]["stats_value"]
        if not sv:
            continue
        vals_dict = {item["clone_id"]: item["count"] for item in sv}
        n_exp = vals_dict.get("expanded_n", 0)
        if n_exp > 0:
            subj[rid]["disease"] = disease
            subj[rid]["mean_aa"] = vals_dict.get("expanded_avg_cdr3")
            subj[rid]["sd_aa"] = vals_dict.get("expanded_sd_cdr3")
    return subj

all_subj = parse_all_clones(all_data)
exp_subj = parse_expanded(exp_data)

disease_order = ["Severe", "Moderate", "Mild", "Recovered", "COVID Naive", "Healthy"]
disease_colors = {
    "Severe": "#b71c1c", "Moderate": "#e65100", "Mild": "#ff7043",
    "Recovered": "#43a047", "Healthy": "#1565c0", "COVID Naive": "#42a5f5",
}

def group_by_disease(subj_dict, field):
    result = defaultdict(list)
    for rid, info in subj_dict.items():
        d = info["disease"]
        if d in disease_order and info[field] is not None:
            result[d].append(info[field])
    return result

all_mean = group_by_disease(all_subj, "mean_aa")
all_sd = group_by_disease(all_subj, "sd_aa")
exp_mean = group_by_disease(exp_subj, "mean_aa")
exp_sd = group_by_disease(exp_subj, "sd_aa")

print("CDR3 Length Distribution (blood only):")
for d in disease_order:
    n = len(all_mean[d])
    m = np.median(all_mean[d]) if all_mean[d] else 0
    s = np.median(all_sd[d]) if all_sd[d] else 0
    print(f"  {d}: n={n}, median mean AA={m:.1f}, median SD AA={s:.1f}")

print("\nExpanded clones CDR3:")
for d in disease_order:
    n = len(exp_mean[d])
    m = np.median(exp_mean[d]) if exp_mean[d] else 0
    s = np.median(exp_sd[d]) if exp_sd[d] else 0
    print(f"  {d}: n={n}, median mean AA={m:.1f}, median SD AA={s:.1f}")

rng = np.random.default_rng(42)

def boxplot_panel(ax, data_dict, title, ylabel):
    bp_data = [data_dict.get(d, []) if data_dict.get(d, []) else [0] for d in disease_order]
    colors = [disease_colors[d] for d in disease_order]
    bp = ax.boxplot(bp_data, positions=range(len(disease_order)), widths=0.5, patch_artist=True,
                    showfliers=False, medianprops=dict(color="black", linewidth=2))
    for i, patch in enumerate(bp["boxes"]):
        patch.set_facecolor(colors[i])
        patch.set_alpha(0.7)
    for i, d in enumerate(disease_order):
        vals = data_dict.get(d, [])
        if vals:
            jitter = rng.uniform(-0.12, 0.12, len(vals))
            ax.scatter([i + j for j in jitter], vals, color=colors[i], s=45, alpha=0.7,
                       zorder=3, edgecolors="white", linewidth=0.5)
    ax.set_xticks(range(len(disease_order)))
    ax.set_xticklabels(disease_order, fontsize=16, fontweight="bold", rotation=25, ha="right")
    ax.set_ylabel(ylabel, fontsize=18, fontweight="bold")
    ax.set_title(title, fontsize=20, fontweight="bold", loc="left")
    ax.tick_params(axis='y', labelsize=15)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    add_significance(ax, [data_dict.get(d, []) for d in disease_order], disease_order)

# ============================================================
# FIGURE 7a: All clones — CDR3 length mean + SD
# ============================================================
fig, axes = plt.subplots(1, 2, figsize=(22, 10))
fig.suptitle("CDR3 Length Distribution — All Clones by Disease Stage (Blood Only)",
             fontsize=24, fontweight="bold", y=0.98)
fig.text(0.5, 0.93, "Mean and variability of CDR3 amino acid length per subject",
         ha="center", fontsize=16, color="gray")

boxplot_panel(axes[0], all_mean, "A. Mean CDR3 Length per Subject", "Mean CDR3 Length (AA)")
boxplot_panel(axes[1], all_sd, "B. CDR3 Length Variability per Subject", "SD of CDR3 Length (AA)")

plt.tight_layout(rect=[0, 0, 1, 0.90])
plt.savefig("plots/22a_cdr3_length_all_clones.png", dpi=600, bbox_inches="tight", facecolor="white")
plt.close()
print("Saved: 22a_cdr3_length_all_clones.png")

# ============================================================
# FIGURE 7b: Expanded clones — CDR3 length mean + SD
# ============================================================
fig, axes = plt.subplots(1, 2, figsize=(22, 10))
fig.suptitle("CDR3 Length Distribution — Expanded Clones by Disease Stage (Blood Only)",
             fontsize=24, fontweight="bold", y=0.98)
fig.text(0.5, 0.93, "Expanded clones (≥20 unique sequences) — CDR3 length per subject",
         ha="center", fontsize=16, color="gray")

boxplot_panel(axes[0], exp_mean, "A. Mean CDR3 Length (Expanded Clones)", "Mean CDR3 Length (AA)")
boxplot_panel(axes[1], exp_sd, "B. CDR3 Length Variability (Expanded Clones)", "SD of CDR3 Length (AA)")

plt.tight_layout(rect=[0, 0, 1, 0.90])
plt.savefig("plots/22b_cdr3_length_expanded.png", dpi=600, bbox_inches="tight", facecolor="white")
plt.close()
print("Saved: 22b_cdr3_length_expanded.png")
