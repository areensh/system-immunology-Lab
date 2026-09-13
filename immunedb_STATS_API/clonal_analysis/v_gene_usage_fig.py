import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from collections import defaultdict
from scipy.cluster.hierarchy import linkage, dendrogram, leaves_list
from scipy.spatial.distance import pdist

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

subjects_in_order = {rid: info for rid, info in subj_vgenes.items()
                     if info["disease"] in disease_order}
n_subjects = len(subjects_in_order)
print(f"Total blood subjects: {n_subjects}")

all_genes = set()
for info in subjects_in_order.values():
    for g, freq in info["freq"].items():
        if freq >= 1.0:
            all_genes.add(g)

gene_subject_count = defaultdict(int)
for info in subjects_in_order.values():
    for g in all_genes:
        if info["freq"].get(g, 0) >= 1.0:
            gene_subject_count[g] += 1

for threshold_pct in [100, 85]:
    threshold_n = n_subjects * threshold_pct / 100
    selected = sorted([g for g, c in gene_subject_count.items() if c >= threshold_n])
    print(f"\nThreshold {threshold_pct}% ({threshold_n:.0f}/{n_subjects} subjects): "
          f"{len(selected)} V genes")
    for g in selected:
        pct_present = gene_subject_count[g] / n_subjects * 100
        print(f"  {g}: present in {gene_subject_count[g]}/{n_subjects} ({pct_present:.0f}%)")

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

# Build list of subjects (unsorted — clustering will determine order)
subject_list = list(subjects_in_order.items())

# Build matrix (genes × subjects)
matrix = np.zeros((len(selected_genes), len(subject_list)))
for j, (rid, info) in enumerate(subject_list):
    for i, gene in enumerate(selected_genes):
        matrix[i, j] = info["freq"].get(gene, 0)

# ============================================================
# Hierarchical clustering of INDIVIDUALS (columns) by V gene usage
# ============================================================
if len(subject_list) > 2:
    col_dist = pdist(matrix.T, metric="euclidean")
    col_linkage = linkage(col_dist, method="ward")
    col_order = leaves_list(col_linkage)
else:
    col_order = np.arange(len(subject_list))
    col_linkage = None

# Hierarchical clustering of V genes (rows)
if len(selected_genes) > 1:
    row_dist = pdist(matrix, metric="euclidean")
    row_linkage = linkage(row_dist, method="ward")
    row_order = leaves_list(row_linkage)
else:
    row_order = np.arange(len(selected_genes))
    row_linkage = None

clustered_genes = [selected_genes[i] for i in row_order]
clustered_subjects = [subject_list[i] for i in col_order]
clustered_matrix = matrix[np.ix_(row_order, col_order)]

# Check clustering vs disease
print("\nClustering order of individuals:")
for rid, info in clustered_subjects:
    print(f"  {info['study']}:{rid[:30]:30s} -> {info['disease']}")

# ============================================================
# FIGURE: V Gene Usage Heatmap — Individuals Clustered
# ============================================================
fig_height = max(14, len(selected_genes) * 0.85 + 5)
fig = plt.figure(figsize=(26, fig_height))

gs = fig.add_gridspec(3, 3,
                      width_ratios=[0.08, 0.08, 1],
                      height_ratios=[0.03, 1, 0.02],
                      hspace=0.03, wspace=0.01,
                      top=0.90, bottom=0.10, left=0.03, right=0.95)

ax_colorbar_top = fig.add_subplot(gs[0, 2])
ax_dendro_row = fig.add_subplot(gs[1, 0])
ax_dendro_col_placeholder = fig.add_subplot(gs[1, 1])
ax = fig.add_subplot(gs[1, 2])
cax = fig.add_subplot(gs[2, 2])

fig.suptitle("V Gene Usage Heatmap — Individuals Clustered by V Gene Profile (Blood Only)",
             fontsize=24, fontweight="bold", y=0.97)
fig.text(0.5, 0.935,
         f"Hierarchical clustering (Ward linkage, Euclidean distance) of {n_subjects} individuals "
         f"using {len(selected_genes)} V genes (≥1% in ≥{used_threshold} of subjects)",
         ha="center", fontsize=16, color="gray")

# Disease color bar at top
disease_colors_arr = [disease_colors[info["disease"]] for _, info in clustered_subjects]
ax_colorbar_top.imshow([range(len(clustered_subjects))], aspect="auto",
                       cmap=matplotlib.colors.ListedColormap(disease_colors_arr),
                       interpolation="nearest")
ax_colorbar_top.set_xticks([])
ax_colorbar_top.set_yticks([])
ax_colorbar_top.set_ylabel("Disease", fontsize=12, fontweight="bold", rotation=0,
                           ha="right", va="center")
for spine in ax_colorbar_top.spines.values():
    spine.set_visible(False)

# Row dendrogram (V genes)
if row_linkage is not None:
    dendrogram(row_linkage, orientation="left", ax=ax_dendro_row,
               no_labels=True, color_threshold=0,
               above_threshold_color="#555555", leaf_rotation=0)
ax_dendro_row.set_xticks([])
ax_dendro_row.set_yticks([])
for spine in ax_dendro_row.spines.values():
    spine.set_visible(False)
ax_dendro_row.invert_yaxis()

# Hide the placeholder axis for column dendrogram space
ax_dendro_col_placeholder.set_visible(False)

# Heatmap
im = ax.imshow(clustered_matrix, aspect="auto", cmap="YlOrRd", interpolation="nearest")

# Y-axis: V gene names on the right
ax.yaxis.tick_right()
ax.set_yticks(range(len(clustered_genes)))
ax.set_yticklabels(clustered_genes, fontsize=15, fontweight="bold")
ax.tick_params(axis='y', length=0, pad=8)

# X-axis: no individual labels (too many), clustering order is the point
ax.set_xticks([])
ax.set_xlabel(f"Individuals (n={n_subjects}), ordered by hierarchical clustering",
              fontsize=16, fontweight="bold", labelpad=8)

# Frequency colorbar — position manually below heatmap
cax.set_position([0.45, 0.04, 0.30, 0.012])
cbar = plt.colorbar(im, cax=cax, orientation="horizontal")
cbar.set_label("V Gene Frequency (%)", fontsize=14, fontweight="bold")
cbar.ax.tick_params(labelsize=12)

# Disease legend (bottom left)
from matplotlib.patches import Patch
legend_elements = [Patch(facecolor=disease_colors[d], label=d) for d in disease_order]
fig.legend(handles=legend_elements, loc="lower left", bbox_to_anchor=(0.03, 0.015),
           ncol=len(disease_order), fontsize=13, frameon=True, framealpha=0.9,
           edgecolor="black", handlelength=1.5, handleheight=1.2)

plt.savefig("plots/23_v_gene_usage_heatmap.png", dpi=600, bbox_inches="tight", facecolor="white")
plt.close()
print(f"\nSaved: 23_v_gene_usage_heatmap.png")
