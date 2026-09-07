import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from collections import defaultdict

# Load all data sources
with open("clone_size/data/clone_size_disease_stage_CTE.json") as f:
    clone_data = json.load(f)
with open("cdr3/data/CDR3_length_distribution.json") as f:
    cdr3_data = json.load(f)
with open("mutation/data/mutations_rs_ratio_disease_tissue.json") as f:
    mutation_data = json.load(f)
with open("cdr3/data/CDR3_sex_disease_tissue.json") as f:
    sex_data = json.load(f)
with open("cdr3/data/CDR3_age_disease_tissue.json") as f:
    age_data = json.load(f)

STUDY_MAP = [
    ("Covid19_db3", "CD1"), ("covid_db2", "CD2"), ("covid19", "CD3"),
    ("vaccine2", "CVX1"), ("covid_vaccine_new", "CVX2"),
    ("lp16", "HC1"),
]

EXCLUDE = {"lp16_Igblast-D159", "lp16_Igblast-D154", "lp16_Igblast-Hu-1",
           "covid_vaccine_new-Fb", "covid_vaccine_new-Water",
           "covid19-H3", "covid19-H4", "covid19-H8"}

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

disease_order = ["Severe", "Moderate", "Mild", "Recovered", "COVID Naive", "Healthy"]
disease_colors = {
    "Severe": "#b71c1c", "Moderate": "#e65100", "Mild": "#ff7043",
    "Recovered": "#43a047", "Healthy": "#1565c0", "COVID Naive": "#42a5f5",
}

def get_study(rid):
    for prefix, short in STUDY_MAP:
        if prefix in rid:
            return short
    return None

def parse_entry(entry):
    rep = entry["repertoire"]
    rid = rep["repertoire_id"]
    study = get_study(rid)
    if not study or rid in EXCLUDE:
        return None, None, None
    keys = rep.get("meta_key", [])
    vals = rep.get("meta_value", [])
    if isinstance(keys, list):
        meta = dict(zip(keys, vals))
    else:
        meta = {keys: vals}
    tissue = meta.get("tissue", "")
    if tissue not in BLOOD_TISSUES:
        return None, None, None
    disease = meta.get("disease_stage", "")
    disease_group = DISEASE_MAP.get(disease, disease)
    if disease_group not in disease_order:
        return None, None, None
    return rid, disease_group, meta

# 1. Extract sex per subject
sex_map = {}
for entry in sex_data["Result"]:
    rid, disease, meta = parse_entry(entry)
    if not rid:
        continue
    sex = meta.get("sex", "").capitalize()
    if sex in ("Male", "Female"):
        sex_map[rid] = sex

# 2. Extract age per subject
age_map = {}
for entry in age_data["Result"]:
    rid, disease, meta = parse_entry(entry)
    if not rid:
        continue
    age_str = meta.get("Age minimum", "")
    try:
        age_map[rid] = float(age_str)
    except (ValueError, TypeError):
        pass

# 3. Clone count (Order 0) per subject
clone_count = {}
subj_clones = defaultdict(lambda: {"disease": "", "sizes": []})
for entry in clone_data["Result"]:
    rid, disease, meta = parse_entry(entry)
    if not rid:
        continue
    sv = entry["statistics"][0]["stats_value"]
    if not sv:
        continue
    subj_clones[rid]["disease"] = disease
    subj_clones[rid]["sizes"].append(sv[0]["count"])

for rid, info in subj_clones.items():
    if info["sizes"]:
        clone_count[rid] = {"disease": info["disease"], "value": len(info["sizes"])}

# 4. Mean CDR3 length per subject
cdr3_mean = {}
for entry in cdr3_data["Result"]:
    rid, disease, meta = parse_entry(entry)
    if not rid:
        continue
    sv = entry["statistics"][0]["stats_value"]
    if not sv:
        continue
    vals_dict = {item["clone_id"]: item["count"] for item in sv}
    m = vals_dict.get("mean_cdr3_aa")
    if m is not None:
        cdr3_mean[rid] = {"disease": disease, "value": m}

# 5. CDR NS/S ratio per subject
cdr_nss = {}
for entry in mutation_data["Result"]:
    rid, disease, meta = parse_entry(entry)
    if not rid:
        continue
    sv = entry["statistics"][0]["stats_value"]
    if not sv:
        continue
    vals_dict = {item["clone_id"]: item["count"] for item in sv}
    r = vals_dict.get("CDR_replacement")
    s = vals_dict.get("CDR_synonymous")
    if r is not None and s is not None and s > 0:
        cdr_nss[rid] = {"disease": disease, "value": r / s}

print("Data availability:")
print(f"  Sex: {len(sex_map)}, Age: {len(age_map)}")
print(f"  Clone count: {len(clone_count)}, CDR3 mean: {len(cdr3_mean)}, CDR NS/S: {len(cdr_nss)}")

metrics = [
    ("Clone Count (Order 0)", clone_count),
    ("Mean CDR3 Length (AA)", cdr3_mean),
    ("CDR NS/S Ratio", cdr_nss),
]

# ============================================================
# FIGURE A: Metrics vs Age (scatter, colored by disease)
# ============================================================
fig, axes = plt.subplots(1, 3, figsize=(24, 9))
fig.suptitle("Clonal Metrics vs Age by Disease Stage (Blood Only)",
             fontsize=20, fontweight="bold", y=1.0)
fig.text(0.5, 0.94, "Each dot = one subject, colored by disease stage",
         ha="center", fontsize=14, color="gray")

for idx, (metric_name, metric_dict) in enumerate(metrics):
    ax = axes[idx]
    for d in disease_order:
        ages = []
        vals = []
        for rid, info in metric_dict.items():
            if info["disease"] == d and rid in age_map:
                ages.append(age_map[rid])
                vals.append(info["value"])
        if ages:
            ax.scatter(ages, vals, color=disease_colors[d], s=40, alpha=0.75,
                       edgecolors="white", linewidth=0.5, label=f"{d} (n={len(ages)})",
                       zorder=3)
    ax.set_xlabel("Age", fontsize=13, fontweight="bold")
    ax.set_ylabel(metric_name, fontsize=13, fontweight="bold")
    ax.tick_params(axis='both', labelsize=11)
    panel = chr(65 + idx)
    ax.set_title(f"{panel}. {metric_name} vs Age", fontsize=14, fontweight="bold", loc="left")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    if idx == 0:
        ax.set_yscale("log")
    ax.legend(fontsize=11, loc="upper right")

plt.tight_layout(rect=[0, 0, 1, 0.88])
plt.savefig("plots/24_metrics_vs_age.png", dpi=600, bbox_inches="tight", facecolor="white")
plt.close()
print("Saved: 24_metrics_vs_age.png")

# ============================================================
# FIGURE B: Metrics vs Gender (boxplot per disease, split by sex)
# ============================================================
fig, axes = plt.subplots(1, 3, figsize=(24, 9))
fig.suptitle("Clonal Metrics by Gender and Disease Stage (Blood Only)",
             fontsize=20, fontweight="bold", y=1.0)
fig.text(0.5, 0.94, "Male vs Female within each disease stage",
         ha="center", fontsize=14, color="gray")

rng = np.random.default_rng(42)

for idx, (metric_name, metric_dict) in enumerate(metrics):
    ax = axes[idx]
    positions = []
    bp_data = []
    tick_positions = []
    tick_labels = []
    box_colors = []
    hatches = []

    pos = 0
    for d in disease_order:
        for si, sex in enumerate(["Male", "Female"]):
            vals = [info["value"] for rid, info in metric_dict.items()
                    if info["disease"] == d and rid in sex_map and sex_map[rid] == sex]
            if not vals:
                vals = [0]
            bp_data.append(vals)
            positions.append(pos)
            box_colors.append(disease_colors[d])
            hatches.append("" if sex == "Male" else "///")
            pos += 1
        tick_positions.append(pos - 1.5)
        tick_labels.append(d)
        pos += 0.5

    bp = ax.boxplot(bp_data, positions=positions, widths=0.6, patch_artist=True,
                    showfliers=False, medianprops=dict(color="black", linewidth=2))
    for i, patch in enumerate(bp["boxes"]):
        patch.set_facecolor(box_colors[i])
        patch.set_alpha(0.6 if hatches[i] else 0.8)
        if hatches[i]:
            patch.set_hatch(hatches[i])

    for i, vals in enumerate(bp_data):
        if vals and vals != [0]:
            jitter = rng.uniform(-0.1, 0.1, len(vals))
            ax.scatter([positions[i] + j for j in jitter], vals,
                       color=box_colors[i], s=20, alpha=0.7, zorder=3,
                       edgecolors="white", linewidth=0.3)

    ax.set_xticks(tick_positions)
    ax.set_xticklabels(tick_labels, fontsize=11, fontweight="bold", rotation=25, ha="right")
    ax.tick_params(axis='y', labelsize=11)
    panel = chr(65 + idx)
    ax.set_title(f"{panel}. {metric_name}", fontsize=14, fontweight="bold", loc="left")
    ax.set_ylabel(metric_name, fontsize=13, fontweight="bold")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    if idx == 0:
        ax.set_yscale("log")

# Custom legend for male/female
from matplotlib.patches import Patch
legend_elements = [Patch(facecolor="gray", alpha=0.8, label="Male"),
                   Patch(facecolor="gray", alpha=0.6, hatch="///", label="Female")]
axes[2].legend(handles=legend_elements, fontsize=12, loc="upper right")

plt.tight_layout(rect=[0, 0, 1, 0.88])
plt.savefig("plots/25_metrics_vs_gender.png", dpi=600, bbox_inches="tight", facecolor="white")
plt.close()
print("Saved: 25_metrics_vs_gender.png")
