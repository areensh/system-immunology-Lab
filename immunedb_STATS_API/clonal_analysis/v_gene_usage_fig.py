import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from collections import defaultdict

with open("v_gene/data/v_gene_usage_disease_tissue.json") as f:
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

# Collect V gene counts per subject (blood only)
subj_vgenes = {}
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

    gene_counts = {item["clone_id"]: item["count"] for item in sv}
    total = sum(gene_counts.values())
    if total == 0:
        continue
    gene_freq = {g: c / total * 100 for g, c in gene_counts.items()}

    subj_vgenes[rid] = {"disease": disease_group, "freq": gene_freq, "study": study}

disease_order = ["Severe", "Moderate", "Mild", "Recovered", "COVID Naive", "Healthy"]
disease_colors = {
    "Severe": "#b71c1c", "Moderate": "#e65100", "Mild": "#ff7043",
    "Recovered": "#43a047", "Healthy": "#1565c0", "COVID Naive": "#42a5f5",
}

# Filter subjects to disease categories we care about
subjects_in_order = {rid: info for rid, info in subj_vgenes.items()
                     if info["disease"] in disease_order}
n_subjects = len(subjects_in_order)
print(f"Total blood subjects: {n_subjects}")

# Step 1: Find V genes >= 1% in each person who has them
# Step 2: Keep V genes present in >= threshold% of people
all_genes = set()
for info in subjects_in_order.values():
    for g, freq in info["freq"].items():
        if freq >= 1.0:
            all_genes.add(g)

# Count how many subjects have each gene at >= 1%
gene_subject_count = defaultdict(int)
for info in subjects_in_order.values():
    for g in all_genes:
        if info["freq"].get(g, 0) >= 1.0:
            gene_subject_count[g] += 1

# Try both thresholds
for threshold_pct in [100, 85]:
    threshold_n = n_subjects * threshold_pct / 100
    selected = sorted([g for g, c in gene_subject_count.items() if c >= threshold_n])
    print(f"\nThreshold {threshold_pct}% ({threshold_n:.0f}/{n_subjects} subjects): "
          f"{len(selected)} V genes")
    for g in selected:
        pct_present = gene_subject_count[g] / n_subjects * 100
        print(f"  {g}: present in {gene_subject_count[g]}/{n_subjects} ({pct_present:.0f}%)")

# Use 85% threshold (fall back to 100% if list is reasonable)
threshold_100 = sorted([g for g, c in gene_subject_count.items()
                        if c >= n_subjects])
threshold_85 = sorted([g for g, c in gene_subject_count.items()
                       if c >= n_subjects * 0.85])

if len(threshold_100) >= 5:
    selected_genes = threshold_100
    used_threshold = "100%"
else:
    selected_genes = threshold_85
    used_threshold = "85%"

print(f"\nUsing {used_threshold} threshold: {len(selected_genes)} V genes")

# Sort subjects by disease group
sorted_subjects = []
for d in disease_order:
    group = [(rid, info) for rid, info in subjects_in_order.items() if info["disease"] == d]
    group.sort(key=lambda x: x[0])
    sorted_subjects.extend(group)

# Build heatmap matrix (genes × subjects)
matrix = np.zeros((len(selected_genes), len(sorted_subjects)))
for j, (rid, info) in enumerate(sorted_subjects):
    for i, gene in enumerate(selected_genes):
        matrix[i, j] = info["freq"].get(gene, 0)

# Disease group boundaries for annotation
group_boundaries = []
group_centers = []
idx = 0
for d in disease_order:
    n = sum(1 for _, info in sorted_subjects if info["disease"] == d)
    if n > 0:
        group_boundaries.append(idx + n)
        group_centers.append((idx + idx + n) / 2)
    idx += n

# ============================================================
# FIGURE: V Gene Usage Heatmap
# ============================================================
fig_height = max(8, len(selected_genes) * 0.4 + 3)
fig, ax = plt.subplots(figsize=(20, fig_height))
fig.suptitle(f"V Gene Usage Heatmap by Disease Stage (Blood Only)",
             fontsize=18, fontweight="bold", y=0.98)
fig.text(0.5, 0.95,
         f"V genes present at ≥1% frequency in ≥{used_threshold} of subjects (n={n_subjects})",
         ha="center", fontsize=13, color="gray")

im = ax.imshow(matrix, aspect="auto", cmap="YlOrRd", interpolation="nearest")
cbar = plt.colorbar(im, ax=ax, shrink=0.8, pad=0.02)
cbar.set_label("V Gene Frequency (%)", fontsize=12, fontweight="bold")

# Y-axis: gene names
ax.set_yticks(range(len(selected_genes)))
ax.set_yticklabels(selected_genes, fontsize=9, fontweight="bold")

# X-axis: disease group labels
ax.set_xticks([c for c in group_centers])
ax.set_xticklabels([d for d in disease_order
                    if sum(1 for _, info in sorted_subjects if info["disease"] == d) > 0],
                   fontsize=11, fontweight="bold", rotation=25, ha="right")

# Draw vertical lines at group boundaries
for b in group_boundaries[:-1]:
    ax.axvline(x=b - 0.5, color="white", linewidth=2)

# Color bar at top showing disease group
for j, (rid, info) in enumerate(sorted_subjects):
    color = disease_colors.get(info["disease"], "#999")
    ax.plot(j, -0.7, marker="s", markersize=4, color=color, clip_on=False)

plt.tight_layout(rect=[0, 0, 1, 0.93])
plt.savefig("plots/23_v_gene_usage_heatmap.png", dpi=400, bbox_inches="tight", facecolor="white")
plt.close()
print(f"\nSaved: 23_v_gene_usage_heatmap.png")
