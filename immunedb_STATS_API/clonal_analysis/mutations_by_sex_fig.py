import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from collections import defaultdict

with open("mutation/data/mutations_rs_ratio_disease_tissue.json") as f:
    all_data = json.load(f)
with open("mutation/data/mutations_expanded_vs_rest_disease_tissue.json") as f:
    exp_data = json.load(f)
with open("cdr3/data/CDR3_sex_disease_tissue.json") as f:
    sex_data = json.load(f)

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

# Extract sex per subject
sex_map = {}
for entry in sex_data["Result"]:
    rid, disease, meta = parse_entry(entry)
    if not rid:
        continue
    sex = meta.get("sex", "").capitalize()
    if sex in ("Male", "Female"):
        sex_map[rid] = sex

# Extract all-clones CDR and FW NS/S ratios per subject
all_cdr_nss = {}
all_fw_nss = {}
for entry in all_data["Result"]:
    rid, disease, meta = parse_entry(entry)
    if not rid:
        continue
    sv = entry["statistics"][0]["stats_value"]
    if not sv:
        continue
    vals_dict = {item["clone_id"]: item["count"] for item in sv}
    cdr_ratio = vals_dict.get("CDR_nss_ratio")
    if cdr_ratio is not None and cdr_ratio > 0:
        all_cdr_nss[rid] = {"disease": disease, "value": cdr_ratio}
    else:
        r = vals_dict.get("CDR_replacement")
        s = vals_dict.get("CDR_synonymous")
        if r is not None and s is not None and s > 0:
            all_cdr_nss[rid] = {"disease": disease, "value": r / s}
    fw_ratio = vals_dict.get("FW_nss_ratio")
    if fw_ratio is not None and fw_ratio > 0:
        all_fw_nss[rid] = {"disease": disease, "value": fw_ratio}
    else:
        r = vals_dict.get("FW_replacement")
        s = vals_dict.get("FW_synonymous")
        if r is not None and s is not None and s > 0:
            all_fw_nss[rid] = {"disease": disease, "value": r / s}

# Extract expanded-clones CDR and FW NS/S ratios per subject
exp_cdr_nss = {}
exp_fw_nss = {}
for entry in exp_data["Result"]:
    rid, disease, meta = parse_entry(entry)
    if not rid:
        continue
    sv = entry["statistics"][0]["stats_value"]
    if not sv:
        continue
    vals_dict = {item["clone_id"]: item["count"] for item in sv}
    n_exp = vals_dict.get("expanded_n", 0)
    if n_exp > 0:
        cdr_ratio = vals_dict.get("expanded_cdr_nss_ratio")
        if cdr_ratio is not None and cdr_ratio > 0:
            exp_cdr_nss[rid] = {"disease": disease, "value": cdr_ratio}
        fw_ratio = vals_dict.get("expanded_fw_nss_ratio")
        if fw_ratio is not None and fw_ratio > 0:
            exp_fw_nss[rid] = {"disease": disease, "value": fw_ratio}

print(f"Sex map: {len(sex_map)} individuals")
print(f"All CDR NS/S: {len(all_cdr_nss)}, All FW NS/S: {len(all_fw_nss)}")
print(f"Exp CDR NS/S: {len(exp_cdr_nss)}, Exp FW NS/S: {len(exp_fw_nss)}")

rng = np.random.default_rng(42)

# Compute shared y-axis limits across all four datasets
def get_shared_ylim(*dicts):
    all_vals = []
    for d in dicts:
        all_vals.extend(info["value"] for info in d.values())
    if not all_vals:
        return (0, 1)
    margin = (max(all_vals) - min(all_vals)) * 0.15
    return (min(all_vals) - margin, max(all_vals) + margin)

shared_ylim = get_shared_ylim(all_cdr_nss, all_fw_nss, exp_cdr_nss, exp_fw_nss)

def plot_sex_stratified(ax, metric_dict, disease_order, disease_colors, sex_map, rng, ylabel, title, ylim=None):
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
                       color=box_colors[i], s=50, alpha=0.7, zorder=3,
                       edgecolors="white", linewidth=0.5)

    ax.set_xticks(tick_positions)
    ax.set_xticklabels(tick_labels, fontsize=20, fontweight="bold", rotation=25, ha="right")
    ax.tick_params(axis='y', labelsize=20)
    ax.set_ylabel(ylabel, fontsize=24, fontweight="bold")
    ax.set_title(title, fontsize=24, fontweight="bold", loc="left")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.axhline(y=1.0, color="gray", linestyle="--", linewidth=1, alpha=0.5)
    if ylim:
        ax.set_ylim(ylim)

from matplotlib.patches import Patch

# Figure 14: All clones — CDR + FW NS/S by sex
fig, axes = plt.subplots(1, 2, figsize=(24, 10))
plot_sex_stratified(axes[0], all_cdr_nss, disease_order, disease_colors, sex_map, rng,
                    "CDR NS/S Ratio", "(A) CDR NS/S Ratio", ylim=shared_ylim)
plot_sex_stratified(axes[1], all_fw_nss, disease_order, disease_colors, sex_map, rng,
                    "FW NS/S Ratio", "(B) FW NS/S Ratio (same y-axis scale as A)", ylim=shared_ylim)
legend_elements = [Patch(facecolor="gray", alpha=0.8, label="Male"),
                   Patch(facecolor="gray", alpha=0.6, hatch="///", label="Female")]
axes[1].legend(handles=legend_elements, fontsize=20, loc="upper right")
plt.tight_layout()
plt.savefig("plots/28_nss_all_clones_by_sex.png", dpi=600, bbox_inches="tight", facecolor="white")
plt.close()
print("Saved: plots/28_nss_all_clones_by_sex.png")

# Figure 15: Expanded clones — CDR + FW NS/S by sex
fig, axes = plt.subplots(1, 2, figsize=(24, 10))
plot_sex_stratified(axes[0], exp_cdr_nss, disease_order, disease_colors, sex_map, rng,
                    "CDR NS/S Ratio", "(A) CDR NS/S Ratio", ylim=shared_ylim)
plot_sex_stratified(axes[1], exp_fw_nss, disease_order, disease_colors, sex_map, rng,
                    "FW NS/S Ratio", "(B) FW NS/S Ratio (same y-axis scale as A)", ylim=shared_ylim)
legend_elements = [Patch(facecolor="gray", alpha=0.8, label="Male"),
                   Patch(facecolor="gray", alpha=0.6, hatch="///", label="Female")]
axes[1].legend(handles=legend_elements, fontsize=20, loc="upper right")
plt.tight_layout()
plt.savefig("plots/29_nss_expanded_by_sex.png", dpi=600, bbox_inches="tight", facecolor="white")
plt.close()
print("Saved: plots/29_nss_expanded_by_sex.png")
