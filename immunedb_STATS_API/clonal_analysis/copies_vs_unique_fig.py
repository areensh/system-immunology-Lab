import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from collections import defaultdict
from stats_utils import add_significance

# Load unique counts (disease_stage + tissue metadata)
with open("clone_size/data/clone_size_disease_tissue.json") as f:
    dt_data = json.load(f)

# Load copies counts (tissue + sex + age metadata)
with open("clone_size/data/clone_size_ALL_tissue_sex_age_with_GT1_copies.json") as f:
    copies_data = json.load(f)

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

# Build copies lookup: {(rid, clone_id): copies_count}
copies_lookup = {}
for entry in copies_data["Result"]:
    rep = entry["repertoire"]
    rid = rep["repertoire_id"]
    if get_study(rid) is None or rid in EXCLUDE:
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
    sv = entry["statistics"][0]["stats_value"]
    if not sv:
        continue
    for item in sv:
        copies_lookup[(rid, item["clone_id"])] = item["count"]

print(f"Copies lookup: {len(copies_lookup)} (rid, clone_id) entries")

# Build per-clone data from disease_tissue file (unique counts + disease metadata)
clone_records = []
subj_data = defaultdict(lambda: {"disease": "", "unique_list": [], "copies_list": []})

for entry in dt_data["Result"]:
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
    if disease_group not in disease_order:
        continue

    sv = entry["statistics"][0]["stats_value"]
    if not sv:
        continue

    for item in sv:
        cid = item["clone_id"]
        unique = item["count"]
        copies = copies_lookup.get((rid, cid))
        if copies is not None:
            clone_records.append({
                "rid": rid, "clone_id": cid,
                "unique": unique, "copies": copies,
                "disease": disease_group,
            })
            subj_data[rid]["disease"] = disease_group
            subj_data[rid]["unique_list"].append(unique)
            subj_data[rid]["copies_list"].append(copies)

print(f"Matched clones with both unique + copies: {len(clone_records)}")
for d in disease_order:
    n = sum(1 for r in clone_records if r["disease"] == d)
    ns = sum(1 for rid, info in subj_data.items() if info["disease"] == d)
    print(f"  {d}: {n} clones, {ns} subjects")

# ============================================================
# FIGURE: Copies vs Unique — 2 panels (A: per-clone scatter, B: per-subject median)
# ============================================================
fig, axes = plt.subplots(1, 2, figsize=(22, 11))
fig.suptitle("Clone Size: Copies vs Unique Sequences by Disease Stage (Blood Only)",
             fontsize=26, fontweight="bold", y=0.97)

rng = np.random.default_rng(42)

# Panel A: per-clone scatter (log-log)
ax = axes[0]
for d in disease_order:
    clones = [r for r in clone_records if r["disease"] == d]
    if not clones:
        continue
    uniq = [c["unique"] for c in clones]
    cop = [c["copies"] for c in clones]
    ax.scatter(uniq, cop, color=disease_colors[d], alpha=0.25, s=12,
               label=d, edgecolors="none", rasterized=True)

# Reference line y=x
lims = [1, max(max(r["copies"] for r in clone_records), max(r["unique"] for r in clone_records)) * 1.5]
ax.plot(lims, lims, "--", color="gray", alpha=0.5, linewidth=1.5)
ax.set_xscale("log")
ax.set_yscale("log")
ax.set_xlabel("Clone Size (unique sequences)", fontsize=18, fontweight="bold")
ax.set_ylabel("Clone Size (copies / raw reads)", fontsize=18, fontweight="bold")
ax.set_title("A. Copies vs Unique Sequences per Clone", fontsize=20, fontweight="bold", loc="left")
ax.legend(fontsize=14, title="Disease Stage", title_fontsize=15,
          loc="upper left", framealpha=0.9, edgecolor="gray", markerscale=3)
ax.tick_params(axis="both", labelsize=14)
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)

# Panel B: per-subject median scatter
ax = axes[1]
for d in disease_order:
    subjects = [(rid, info) for rid, info in subj_data.items() if info["disease"] == d]
    if not subjects:
        continue
    med_uniq = [np.median(info["unique_list"]) for _, info in subjects]
    med_cop = [np.median(info["copies_list"]) for _, info in subjects]
    ax.scatter(med_uniq, med_cop, color=disease_colors[d], alpha=0.8, s=80,
               label=f"{d} (n={len(subjects)})", edgecolors="white", linewidth=0.8, zorder=3)

lims2 = ax.get_xlim()
ax.plot([1, 1e5], [1, 1e5], "--", color="gray", alpha=0.5, linewidth=1.5)
ax.set_xscale("log")
ax.set_yscale("log")
ax.set_xlabel("Median Unique Sequences per Subject", fontsize=18, fontweight="bold")
ax.set_ylabel("Median Copies per Subject", fontsize=18, fontweight="bold")
ax.set_title("B. Per-Subject Median: Copies vs Unique", fontsize=20, fontweight="bold", loc="left")
ax.legend(fontsize=14, title="Disease Stage", title_fontsize=15,
          loc="upper left", framealpha=0.9, edgecolor="gray")
ax.tick_params(axis="both", labelsize=14)
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)

plt.tight_layout(rect=[0, 0, 1, 0.93])
plt.savefig("plots/26_copies_vs_unique.png", dpi=600, bbox_inches="tight", facecolor="white")
plt.close()
print("\nSaved: plots/26_copies_vs_unique.png")
