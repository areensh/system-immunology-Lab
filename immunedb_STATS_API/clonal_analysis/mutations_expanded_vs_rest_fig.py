import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from collections import defaultdict
from stats_utils import add_significance

with open("mutation/data/mutations_expanded_vs_rest_disease_tissue.json") as f:
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

subj_data = {}
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

    subj_data[rid] = {"disease": disease_group, **vals_dict}

disease_order = ["Severe", "Moderate", "Mild", "Recovered", "COVID Naive", "Healthy"]
disease_colors = {
    "Severe": "#b71c1c", "Moderate": "#e65100", "Mild": "#ff7043",
    "Recovered": "#43a047", "Healthy": "#1565c0", "COVID Naive": "#42a5f5",
}

disease_groups = defaultdict(list)
for rid, info in subj_data.items():
    d = info["disease"]
    if d in disease_order:
        disease_groups[d].append(info)

print("Subjects per disease (blood only):")
for d in disease_order:
    n = len(disease_groups[d])
    if n > 0:
        med_exp_cdr = np.median([s.get("expanded_cdr_nss_ratio", 0) or 0 for s in disease_groups[d]])
        med_rest_cdr = np.median([s.get("rest_cdr_nss_ratio", 0) or 0 for s in disease_groups[d]])
        print(f"  {d}: n={n}, median expanded CDR NS/S={med_exp_cdr:.2f}, median rest CDR NS/S={med_rest_cdr:.2f}")
    else:
        print(f"  {d}: n=0")

# ============================================================
# FIGURE: Expanded vs Rest NS/S Ratio Comparison
# ============================================================
fig, axes = plt.subplots(2, 2, figsize=(22, 18))
fig.suptitle("Mutation NS/S Ratio: Expanded (≥20) vs Rest Clones by Disease Stage (Blood Only)",
             fontsize=22, fontweight="bold", y=0.97)
fig.text(0.5, 0.935, "Per-clone NS/S ratios compared between expanded (≥20 unique sequences) and unexpanded clones",
         ha="center", fontsize=15, color="gray")

rng = np.random.default_rng(42)

# Panel A: CDR NS/S — Expanded vs Rest side by side
ax = axes[0, 0]
positions_exp = np.arange(len(disease_order)) * 2.5
positions_rest = positions_exp + 0.8
colors = [disease_colors[d] for d in disease_order]

exp_cdr = [[s.get("expanded_cdr_nss_ratio") for s in disease_groups[d]
            if s.get("expanded_cdr_nss_ratio") is not None and s.get("expanded_n", 0) > 0]
           or [0] for d in disease_order]
rest_cdr = [[s.get("rest_cdr_nss_ratio") for s in disease_groups[d]
             if s.get("rest_cdr_nss_ratio") is not None and s.get("rest_n", 0) > 0]
            or [0] for d in disease_order]

bp1 = ax.boxplot(exp_cdr, positions=positions_exp, widths=0.6, patch_artist=True,
                 showfliers=False, medianprops=dict(color="black", linewidth=2))
bp2 = ax.boxplot(rest_cdr, positions=positions_rest, widths=0.6, patch_artist=True,
                 showfliers=False, medianprops=dict(color="black", linewidth=2))
for i, patch in enumerate(bp1["boxes"]):
    patch.set_facecolor(colors[i])
    patch.set_alpha(0.85)
for i, patch in enumerate(bp2["boxes"]):
    patch.set_facecolor(colors[i])
    patch.set_alpha(0.35)
for i, d in enumerate(disease_order):
    vals_e = exp_cdr[i]
    if vals_e and vals_e != [0]:
        jitter = rng.uniform(-0.12, 0.12, len(vals_e))
        ax.scatter(positions_exp[i] + jitter, vals_e, color=colors[i], s=25, alpha=0.7,
                   zorder=3, edgecolors="white", linewidth=0.5)
    vals_r = rest_cdr[i]
    if vals_r and vals_r != [0]:
        jitter = rng.uniform(-0.12, 0.12, len(vals_r))
        ax.scatter(positions_rest[i] + jitter, vals_r, color=colors[i], s=25, alpha=0.4,
                   zorder=3, edgecolors="white", linewidth=0.5)

ax.axhline(y=1, color="gray", linestyle="--", linewidth=1, alpha=0.5)
ax.set_xticks(positions_exp + 0.4)
ax.set_xticklabels(disease_order, fontsize=13, fontweight="bold", rotation=25, ha="right")
ax.set_ylabel("NS/S Ratio", fontsize=15, fontweight="bold")
ax.set_title("A. CDR NS/S Ratio", fontsize=17, fontweight="bold", loc="left")
ax.legend([bp1["boxes"][0], bp2["boxes"][0]], ["Expanded (≥20)", "Rest"],
          fontsize=12, loc="upper right")
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)

# Panel B: FW NS/S — Expanded vs Rest side by side
ax = axes[0, 1]
exp_fw = [[s.get("expanded_fw_nss_ratio") for s in disease_groups[d]
           if s.get("expanded_fw_nss_ratio") is not None and s.get("expanded_n", 0) > 0]
          or [0] for d in disease_order]
rest_fw = [[s.get("rest_fw_nss_ratio") for s in disease_groups[d]
            if s.get("rest_fw_nss_ratio") is not None and s.get("rest_n", 0) > 0]
           or [0] for d in disease_order]

bp1 = ax.boxplot(exp_fw, positions=positions_exp, widths=0.6, patch_artist=True,
                 showfliers=False, medianprops=dict(color="black", linewidth=2))
bp2 = ax.boxplot(rest_fw, positions=positions_rest, widths=0.6, patch_artist=True,
                 showfliers=False, medianprops=dict(color="black", linewidth=2))
for i, patch in enumerate(bp1["boxes"]):
    patch.set_facecolor(colors[i])
    patch.set_alpha(0.85)
for i, patch in enumerate(bp2["boxes"]):
    patch.set_facecolor(colors[i])
    patch.set_alpha(0.35)
for i, d in enumerate(disease_order):
    vals_e = exp_fw[i]
    if vals_e and vals_e != [0]:
        jitter = rng.uniform(-0.12, 0.12, len(vals_e))
        ax.scatter(positions_exp[i] + jitter, vals_e, color=colors[i], s=25, alpha=0.7,
                   zorder=3, edgecolors="white", linewidth=0.5)
    vals_r = rest_fw[i]
    if vals_r and vals_r != [0]:
        jitter = rng.uniform(-0.12, 0.12, len(vals_r))
        ax.scatter(positions_rest[i] + jitter, vals_r, color=colors[i], s=25, alpha=0.4,
                   zorder=3, edgecolors="white", linewidth=0.5)

ax.axhline(y=1, color="gray", linestyle="--", linewidth=1, alpha=0.5)
ax.set_xticks(positions_exp + 0.4)
ax.set_xticklabels(disease_order, fontsize=13, fontweight="bold", rotation=25, ha="right")
ax.set_ylabel("NS/S Ratio", fontsize=15, fontweight="bold")
ax.set_title("B. FW NS/S Ratio", fontsize=17, fontweight="bold", loc="left")
ax.legend([bp1["boxes"][0], bp2["boxes"][0]], ["Expanded (≥20)", "Rest"],
          fontsize=12, loc="upper right")
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)

# Panel C: Paired comparison — CDR expanded vs rest per disease
ax = axes[1, 0]
x = np.arange(len(disease_order))
w = 0.35

exp_cdr_medians = [np.median(exp_cdr[i]) if exp_cdr[i] != [0] else 0 for i in range(len(disease_order))]
rest_cdr_medians = [np.median(rest_cdr[i]) if rest_cdr[i] != [0] else 0 for i in range(len(disease_order))]

bars1 = ax.bar(x - w/2, exp_cdr_medians, w, label="Expanded CDR NS/S", color="#c62828", alpha=0.85)
bars2 = ax.bar(x + w/2, rest_cdr_medians, w, label="Rest CDR NS/S", color="#ef9a9a", alpha=0.85)

ax.axhline(y=1, color="gray", linestyle="--", linewidth=1, alpha=0.5)
ax.set_xticks(x)
ax.set_xticklabels(disease_order, fontsize=13, fontweight="bold", rotation=25, ha="right")
ax.set_ylabel("Median NS/S Ratio", fontsize=15, fontweight="bold")
ax.set_title("C. CDR NS/S: Expanded vs Rest (Medians)", fontsize=17, fontweight="bold", loc="left")
ax.legend(fontsize=12, loc="upper right")
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)

for bar in bars1:
    if bar.get_height() > 0:
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.05,
                f"{bar.get_height():.2f}", ha="center", fontsize=10, fontweight="bold")
for bar in bars2:
    if bar.get_height() > 0:
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.05,
                f"{bar.get_height():.2f}", ha="center", fontsize=10, fontweight="bold")

# Panel D: Paired comparison — FW expanded vs rest per disease
ax = axes[1, 1]
exp_fw_medians = [np.median(exp_fw[i]) if exp_fw[i] != [0] else 0 for i in range(len(disease_order))]
rest_fw_medians = [np.median(rest_fw[i]) if rest_fw[i] != [0] else 0 for i in range(len(disease_order))]

bars1 = ax.bar(x - w/2, exp_fw_medians, w, label="Expanded FW NS/S", color="#1565c0", alpha=0.85)
bars2 = ax.bar(x + w/2, rest_fw_medians, w, label="Rest FW NS/S", color="#90caf9", alpha=0.85)

ax.axhline(y=1, color="gray", linestyle="--", linewidth=1, alpha=0.5)
ax.set_xticks(x)
ax.set_xticklabels(disease_order, fontsize=13, fontweight="bold", rotation=25, ha="right")
ax.set_ylabel("Median NS/S Ratio", fontsize=15, fontweight="bold")
ax.set_title("D. FW NS/S: Expanded vs Rest (Medians)", fontsize=17, fontweight="bold", loc="left")
ax.legend(fontsize=12, loc="upper right")
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)

for bar in bars1:
    if bar.get_height() > 0:
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.05,
                f"{bar.get_height():.2f}", ha="center", fontsize=10, fontweight="bold")
for bar in bars2:
    if bar.get_height() > 0:
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.05,
                f"{bar.get_height():.2f}", ha="center", fontsize=10, fontweight="bold")

plt.tight_layout(rect=[0, 0, 1, 0.90])
plt.savefig("plots/21b_mutations_expanded_vs_rest.png", dpi=600, bbox_inches="tight", facecolor="white")
plt.close()
print("Saved: 21b_mutations_expanded_vs_rest.png")
