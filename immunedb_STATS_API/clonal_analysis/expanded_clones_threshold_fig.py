import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from collections import defaultdict
from stats_utils import add_significance

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

# Thresholds to test (data has HAVING > 20, so threshold 10 is incomplete)
thresholds = [20, 50, 100]

disease_order = ["Severe", "Moderate", "Mild", "Recovered", "COVID Naive", "Healthy"]
disease_colors = {
    "Severe": "#b71c1c", "Moderate": "#e65100", "Mild": "#ff7043",
    "Recovered": "#43a047", "Healthy": "#1565c0", "COVID Naive": "#42a5f5",
}

# For each threshold, compute clone count per subject and % with expanded clones
print("Threshold analysis:")
print(f"{'Threshold':>10} | {'Total Subj':>10} | {'With Expanded':>14} | {'%':>6}")
print("-" * 50)

threshold_results = {}
for t in thresholds:
    disease_counts = defaultdict(list)
    total_subj = 0
    subj_with_expanded = 0
    for rid, info in subj_data.items():
        if not info["sizes"] or not info["disease"]:
            continue
        if info["disease"] not in disease_order:
            continue
        n_expanded = sum(1 for s in info["sizes"] if s > t)
        disease_counts[info["disease"]].append(n_expanded)
        total_subj += 1
        if n_expanded > 0:
            subj_with_expanded += 1
    pct = 100 * subj_with_expanded / total_subj if total_subj > 0 else 0
    threshold_results[t] = disease_counts
    print(f"{t:>10} | {total_subj:>10} | {subj_with_expanded:>14} | {pct:>5.1f}%")

# ============================================================
# FIGURE: Clone count at different expansion thresholds
# ============================================================
fig, axes = plt.subplots(1, len(thresholds), figsize=(7 * len(thresholds), 7))
fig.suptitle("Number of Expanded Clones by Disease Stage (Blood Only)",
             fontsize=18, fontweight="bold", y=0.98)
fig.text(0.5, 0.93, "Clone count at different expansion thresholds (unique sequences)",
         ha="center", fontsize=13, color="gray")

rng = np.random.default_rng(42)

for ti, t in enumerate(thresholds):
    ax = axes[ti]
    disease_counts = threshold_results[t]
    bp_data = [disease_counts[d] if disease_counts[d] else [0] for d in disease_order]
    colors = [disease_colors.get(d, "#999") for d in disease_order]

    bp = ax.boxplot(bp_data, positions=range(len(disease_order)), widths=0.5, patch_artist=True,
                    showfliers=False, medianprops=dict(color="black", linewidth=2))
    for i, patch in enumerate(bp["boxes"]):
        patch.set_facecolor(colors[i])
        patch.set_alpha(0.7)

    for i, d in enumerate(disease_order):
        vals = disease_counts[d]
        if vals:
            jitter = rng.uniform(-0.12, 0.12, len(vals))
            ax.scatter([i + j for j in jitter], vals, color=colors[i], s=25, alpha=0.7,
                       zorder=3, edgecolors="white", linewidth=0.5)

    # Annotate subjects with 0 expanded clones (show count inside the plot area)
    for i, d in enumerate(disease_order):
        vals = disease_counts[d]
        n_zero = sum(1 for v in vals if v == 0)
        if n_zero > 0:
            ax.annotate(f"{n_zero} with 0", xy=(i, 0.8), fontsize=7, color="red",
                        fontweight="bold", ha="center", va="top",
                        bbox=dict(boxstyle="round,pad=0.15", fc="white", ec="red", alpha=0.8))

    ax.set_xticks(range(len(disease_order)))
    ax.set_xticklabels(disease_order, fontsize=9, fontweight="bold", rotation=35, ha="right")
    total_subj = sum(len(v) for v in disease_counts.values())
    with_exp = sum(sum(1 for v in vals if v > 0) for vals in disease_counts.values())
    pct = 100 * with_exp / total_subj if total_subj > 0 else 0
    ax.set_title(f"Threshold > {t}\n({with_exp}/{total_subj} subjects = {pct:.0f}%)",
                 fontsize=13, fontweight="bold")
    ax.set_ylabel("# Expanded Clones", fontsize=12, fontweight="bold")
    ax.set_yscale("log")
    ax.set_ylim(bottom=0.8)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    real_data = [disease_counts[d] for d in disease_order]
    add_significance(ax, real_data, disease_order, log_scale=True)

plt.tight_layout(rect=[0, 0, 1, 0.90])
plt.savefig("plots/19_expanded_clones_threshold.png", dpi=400, bbox_inches="tight", facecolor="white")
plt.close()
print("\nSaved: 19_expanded_clones_threshold.png")

# Recommend threshold
print("\nRecommendation:")
for t in thresholds:
    disease_counts = threshold_results[t]
    total = sum(len(v) for v in disease_counts.values())
    with_exp = sum(sum(1 for v in vals if v > 0) for vals in disease_counts.values())
    pct = 100 * with_exp / total if total > 0 else 0
    marker = " <-- use this" if pct >= 85 else ""
    print(f"  Threshold > {t}: {pct:.1f}% subjects have expanded clones{marker}")
