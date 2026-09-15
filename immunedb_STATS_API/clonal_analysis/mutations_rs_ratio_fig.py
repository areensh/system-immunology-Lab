import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from collections import defaultdict
from stats_utils import add_significance

with open("mutation/data/mutations_rs_ratio_disease_tissue.json") as f:
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

# Collect NS/S per region per subject (blood only)
subj_mutations = defaultdict(lambda: {"disease": "",
    "cdr_r": None, "cdr_s": None, "fw_r": None, "fw_s": None})

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

    subj_mutations[rid]["disease"] = disease_group
    subj_mutations[rid]["cdr_r"] = vals_dict.get("CDR_replacement")
    subj_mutations[rid]["cdr_s"] = vals_dict.get("CDR_synonymous")
    subj_mutations[rid]["fw_r"] = vals_dict.get("FW_replacement")
    subj_mutations[rid]["fw_s"] = vals_dict.get("FW_synonymous")
    subj_mutations[rid]["cdr_nss_ratio"] = vals_dict.get("CDR_nss_ratio")
    subj_mutations[rid]["fw_nss_ratio"] = vals_dict.get("FW_nss_ratio")

disease_order = ["Severe", "Moderate", "Mild", "Recovered", "COVID Naive", "Healthy"]
disease_colors = {
    "Severe": "#b71c1c", "Moderate": "#e65100", "Mild": "#ff7043",
    "Recovered": "#43a047", "Healthy": "#1565c0", "COVID Naive": "#42a5f5",
}

# Use pre-computed per-clone NS/S ratio if available; fall back to ratio of averages
_has_ratio = any(info.get("cdr_nss_ratio") is not None for info in subj_mutations.values())
if _has_ratio:
    print("Using pre-computed per-clone NS/S ratios (average of ratios)")
else:
    print("WARNING: CDR_nss_ratio not in data — falling back to ratio of averages. Re-query the API to fix.")

# Group by disease
disease_data = defaultdict(lambda: {"cdr_r": [], "cdr_s": [], "fw_r": [], "fw_s": [], "cdr_ratio": [], "fw_ratio": []})
for rid, info in subj_mutations.items():
    d = info["disease"]
    if d not in disease_order:
        continue
    if info["cdr_r"] is not None:
        disease_data[d]["cdr_r"].append(info["cdr_r"])
        disease_data[d]["cdr_s"].append(info["cdr_s"])
        disease_data[d]["fw_r"].append(info["fw_r"])
        disease_data[d]["fw_s"].append(info["fw_s"])
        if _has_ratio:
            if info["cdr_nss_ratio"] is not None and info["cdr_nss_ratio"] > 0:
                disease_data[d]["cdr_ratio"].append(info["cdr_nss_ratio"])
            if info["fw_nss_ratio"] is not None and info["fw_nss_ratio"] > 0:
                disease_data[d]["fw_ratio"].append(info["fw_nss_ratio"])
        else:
            if info["cdr_s"] > 0:
                disease_data[d]["cdr_ratio"].append(info["cdr_r"] / info["cdr_s"])
            if info["fw_s"] > 0:
                disease_data[d]["fw_ratio"].append(info["fw_r"] / info["fw_s"])

print("Subjects per disease (blood only):")
for d in disease_order:
    n = len(disease_data[d]["cdr_r"])
    cdr_r = np.median(disease_data[d]["cdr_ratio"]) if disease_data[d]["cdr_ratio"] else 0
    fw_r = np.median(disease_data[d]["fw_ratio"]) if disease_data[d]["fw_ratio"] else 0
    print(f"  {d}: n={n}, median CDR NS/S={cdr_r:.2f}, median FW NS/S={fw_r:.2f}")

# ============================================================
# FIGURE: NS/S (R/S) ratio per region per disease category
# ============================================================
fig, axes = plt.subplots(1, 3, figsize=(24, 9))
# Title and subtitle removed for publication

rng = np.random.default_rng(42)

# Compute shared y-axis limits for panels A and B
all_ratio_vals = []
for d in disease_order:
    all_ratio_vals.extend(disease_data[d]["cdr_ratio"])
    all_ratio_vals.extend(disease_data[d]["fw_ratio"])
if all_ratio_vals:
    ratio_margin = (max(all_ratio_vals) - min(all_ratio_vals)) * 0.15
    shared_ratio_ylim = (min(all_ratio_vals) - ratio_margin, max(all_ratio_vals) + ratio_margin)
else:
    shared_ratio_ylim = None

# Panel A: CDR R/S ratio
ax = axes[0]
bp_data = [disease_data[d]["cdr_ratio"] if disease_data[d]["cdr_ratio"] else [0] for d in disease_order]
colors = [disease_colors[d] for d in disease_order]

bp = ax.boxplot(bp_data, positions=range(len(disease_order)), widths=0.5, patch_artist=True,
                showfliers=False, medianprops=dict(color="black", linewidth=2))
for i, patch in enumerate(bp["boxes"]):
    patch.set_facecolor(colors[i])
    patch.set_alpha(0.7)
for i, d in enumerate(disease_order):
    vals = disease_data[d]["cdr_ratio"]
    if vals:
        jitter = rng.uniform(-0.12, 0.12, len(vals))
        ax.scatter([i + j for j in jitter], vals, color=colors[i], s=45, alpha=0.7,
                   zorder=3, edgecolors="white", linewidth=0.5)

ax.axhline(y=2, color="gray", linestyle="--", linewidth=1, alpha=0.5)
ax.set_xticks(range(len(disease_order)))
ax.set_xticklabels(disease_order, fontsize=20, fontweight="bold", rotation=25, ha="right")
ax.set_ylabel("NS/S Ratio", fontsize=24, fontweight="bold")
ax.set_title("A. CDR NS/S Ratio", fontsize=24, fontweight="bold", loc="left")
ax.tick_params(axis='y', labelsize=20)
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)
add_significance(ax, [disease_data[d]["cdr_ratio"] for d in disease_order], disease_order)
ax_cdr = ax

# Panel B: FW R/S ratio
ax = axes[1]
bp_data = [disease_data[d]["fw_ratio"] if disease_data[d]["fw_ratio"] else [0] for d in disease_order]

bp = ax.boxplot(bp_data, positions=range(len(disease_order)), widths=0.5, patch_artist=True,
                showfliers=False, medianprops=dict(color="black", linewidth=2))
for i, patch in enumerate(bp["boxes"]):
    patch.set_facecolor(colors[i])
    patch.set_alpha(0.7)
for i, d in enumerate(disease_order):
    vals = disease_data[d]["fw_ratio"]
    if vals:
        jitter = rng.uniform(-0.12, 0.12, len(vals))
        ax.scatter([i + j for j in jitter], vals, color=colors[i], s=45, alpha=0.7,
                   zorder=3, edgecolors="white", linewidth=0.5)

ax.axhline(y=2, color="gray", linestyle="--", linewidth=1, alpha=0.5)
ax.set_xticks(range(len(disease_order)))
ax.set_xticklabels(disease_order, fontsize=20, fontweight="bold", rotation=25, ha="right")
ax.set_ylabel("NS/S Ratio", fontsize=24, fontweight="bold")
ax.set_title("B. FW NS/S Ratio", fontsize=24, fontweight="bold", loc="left")
ax.tick_params(axis='y', labelsize=20)
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)
add_significance(ax, [disease_data[d]["fw_ratio"] for d in disease_order], disease_order)

# Force shared y-axis on both panels AFTER significance brackets are drawn
if shared_ratio_ylim:
    # Get the max y that either panel reached (including significance brackets)
    cdr_top = ax_cdr.get_ylim()[1]
    fw_top = ax.get_ylim()[1]
    final_top = max(cdr_top, fw_top, shared_ratio_ylim[1])
    final_bottom = min(shared_ratio_ylim[0], ax_cdr.get_ylim()[0], ax.get_ylim()[0])
    ax_cdr.set_ylim(final_bottom, final_top)
    ax.set_ylim(final_bottom, final_top)

# Panel C: Stacked bar — avg NS vs S per region per disease
ax = axes[2]
x = np.arange(len(disease_order))
w = 0.35

cdr_r_means = [np.mean(disease_data[d]["cdr_r"]) if disease_data[d]["cdr_r"] else 0 for d in disease_order]
cdr_s_means = [np.mean(disease_data[d]["cdr_s"]) if disease_data[d]["cdr_s"] else 0 for d in disease_order]
fw_r_means = [np.mean(disease_data[d]["fw_r"]) if disease_data[d]["fw_r"] else 0 for d in disease_order]
fw_s_means = [np.mean(disease_data[d]["fw_s"]) if disease_data[d]["fw_s"] else 0 for d in disease_order]

bars1 = ax.bar(x - w/2, cdr_r_means, w, label="CDR Replacement", color="#c62828", alpha=0.85)
ax.bar(x - w/2, cdr_s_means, w, bottom=cdr_r_means, label="CDR Synonymous", color="#ef9a9a", alpha=0.85)

bars3 = ax.bar(x + w/2, fw_r_means, w, label="FW Replacement", color="#1565c0", alpha=0.85)
ax.bar(x + w/2, fw_s_means, w, bottom=fw_r_means, label="FW Synonymous", color="#90caf9", alpha=0.85)

ax.set_xticks(x)
ax.set_xticklabels(disease_order, fontsize=20, fontweight="bold", rotation=25, ha="right")
ax.set_ylabel("Avg Mutation Count", fontsize=24, fontweight="bold")
ax.set_title("C. Mutation Counts by Region & Type", fontsize=24, fontweight="bold", loc="left")
ax.tick_params(axis='y', labelsize=20)
ax.legend(fontsize=20, loc="upper right")
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)

plt.tight_layout()
plt.savefig("plots/21a_mutations_all_clones.png", dpi=600, bbox_inches="tight", facecolor="white")
plt.close()
print("Saved: 21a_mutations_all_clones.png")
