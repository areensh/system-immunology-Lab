import json
import csv
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import numpy as np
from collections import defaultdict
from matplotlib.lines import Line2D

with open("clone_size/data/clone_size_ALL_tissue.json") as f:
    data = json.load(f)

STUDY_MAP = [
    ("lp16", "HC1"), ("sykesIgblast2020", "GT1"),
]

EXCLUDE = {"lp16_Igblast-D159", "lp16_Igblast-D154", "lp16_Igblast-Hu-1"}

def get_study(rid):
    for prefix, short in STUDY_MAP:
        if prefix in rid:
            return short
    return None

records = []
for entry in data["Result"]:
    rep = entry["repertoire"]
    rid = rep["repertoire_id"]
    study = get_study(rid)
    if not study:
        continue
    if rid in EXCLUDE:
        continue
    keys = rep["meta_key"]
    vals = rep["meta_value"]
    if isinstance(keys, list):
        meta = dict(zip(keys, vals))
    else:
        meta = {keys: vals}
    tissue = meta.get("tissue")
    if not tissue:
        continue
    sv = entry["statistics"][0]["stats_value"]
    if not sv:
        continue
    subj_name = rid.split("-", 1)[1] if "-" in rid else rid
    records.append({
        "subject": subj_name,
        "study": study,
        "tissue": tissue,
        "clone_id": sv[0]["clone_id"],
        "clone_size": sv[0]["count"],
    })

hc1_key_tissues = ["PBL", "BM", "SPL", "Lung", "Colon", "Ileum", "Jejunum", "MLN"]

# NBT-style tissue colors: blood/lymphoid in reds/warm, gut in blues/cool
tissue_colors = {
    "PBL": "#c62828",       # blood — deep red
    "BM": "#e53935",        # bone marrow — red
    "SPL": "#AB47BC",       # spleen — purple
    "Lung": "#66BB6A",      # lung — green
    "Colon": "#1565C0",     # colon — dark blue
    "Ileum": "#1E88E5",     # ileum — blue
    "Jejunum": "#42A5F5",   # jejunum — light blue
    "MLN": "#78909c",       # mesenteric lymph node — grey
}

tissue_markers = {
    "PBL": "o", "BM": "s", "SPL": "D", "Lung": "^",
    "Colon": "o", "Ileum": "s", "Jejunum": "D", "MLN": "v",
}

# Load HC1 sample counts per tissue
hc1_sample_counts = {}
with open("clone_size/data/hc1_samples_per_tissue.csv") as f:
    reader = csv.DictReader(f)
    for row in reader:
        hc1_sample_counts[(row["subject_name"], row["tissue"])] = int(row["num_samples"])

# Group by study, subject, tissue
subj_tissue_clones = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
for r in records:
    subj_tissue_clones[r["study"]][r["subject"]][r["tissue"]].append(r["clone_size"])

hc1_subjects = sorted(subj_tissue_clones["HC1"].keys())
print(f"HC1 subjects: {hc1_subjects}")

# ============================================================
# FIGURE 14: Clone count per tissue — all HC1 donors as columns
# ============================================================
fig, ax = plt.subplots(figsize=(14, 8))

rng = np.random.default_rng(42)
for i, subj in enumerate(hc1_subjects):
    td = subj_tissue_clones["HC1"][subj]
    for t in hc1_key_tissues:
        if t in td:
            n_samples = hc1_sample_counts.get((subj, t), 1)
            val = len(td[t]) / n_samples
            jitter = rng.uniform(-0.08, 0.08)
            ax.scatter(i + jitter, val,
                       color=tissue_colors.get(t, "#999"),
                       marker=tissue_markers.get(t, "o"),
                       s=100, alpha=0.85, zorder=3,
                       edgecolors="white", linewidth=0.5)

ax.set_xticks(range(len(hc1_subjects)))
ax.set_xticklabels(hc1_subjects, fontsize=20, fontweight="bold")
ax.set_ylabel("Clones / Sample", fontsize=22, fontweight="bold")
ax.tick_params(axis='y', labelsize=18)
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)

legend_handles = [Line2D([0], [0], color=tissue_colors[t], marker=tissue_markers[t],
                         markersize=10, linestyle="None", markeredgecolor="white",
                         markeredgewidth=0.5, label=t)
                  for t in hc1_key_tissues]
ax.legend(handles=legend_handles, fontsize=14, title="Tissue", title_fontsize=16,
          loc="upper left", ncol=2, framealpha=0.9)

plt.tight_layout()
plt.savefig("plots/14_within_subject_clone_count.png", dpi=600, bbox_inches="tight", facecolor="white")
plt.close()
print("Saved: 14_within_subject_clone_count.png")

# ============================================================
# FIGURE 15: Median clone size per tissue — all HC1 donors as columns
# ============================================================
fig, ax = plt.subplots(figsize=(14, 8))

for i, subj in enumerate(hc1_subjects):
    td = subj_tissue_clones["HC1"][subj]
    for t in hc1_key_tissues:
        if t in td and td[t]:
            val = np.median(td[t])
            jitter = rng.uniform(-0.08, 0.08)
            ax.scatter(i + jitter, val,
                       color=tissue_colors.get(t, "#999"),
                       marker=tissue_markers.get(t, "o"),
                       s=100, alpha=0.85, zorder=3,
                       edgecolors="white", linewidth=0.5)

ax.set_xticks(range(len(hc1_subjects)))
ax.set_xticklabels(hc1_subjects, fontsize=20, fontweight="bold")
ax.set_ylabel("Median Clone Size", fontsize=22, fontweight="bold")
ax.tick_params(axis='y', labelsize=18)
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)

legend_handles = [Line2D([0], [0], color=tissue_colors[t], marker=tissue_markers[t],
                         markersize=10, linestyle="None", markeredgecolor="white",
                         markeredgewidth=0.5, label=t)
                  for t in hc1_key_tissues]
ax.legend(handles=legend_handles, fontsize=14, title="Tissue", title_fontsize=16,
          loc="upper left", ncol=2, framealpha=0.9)

plt.tight_layout()
plt.savefig("plots/15_within_subject_median_clone_size.png", dpi=600, bbox_inches="tight", facecolor="white")
plt.close()
print("Saved: 15_within_subject_median_clone_size.png")

# Summary
hc1_recs = [r for r in records if r["study"] == "HC1"]
gt1_recs = [r for r in records if r["study"] == "GT1"]
print(f"\nSummary:")
print(f"  HC1: {len(set(r['subject'] for r in hc1_recs))} subjects, {len(hc1_recs)} clones")
print(f"  GT1: {len(set(r['subject'] for r in gt1_recs))} subjects, {len(gt1_recs)} clones")
