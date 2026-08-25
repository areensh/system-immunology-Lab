import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from collections import defaultdict

with open("clone_size/data/clone_size_ALL_tissue.json") as f:
    data = json.load(f)

STUDY_MAP = [
    ("Covid19_db3", "CD1"), ("covid_db2", "CD2"), ("covid19", "CD3"),
    ("vaccine2", "CVX1"), ("covid_vaccine_new", "CVX2"),
    ("lp16", "HC1"),
]

EXCLUDE = {"lp16_Igblast-D159", "lp16_Igblast-D154", "lp16_Igblast-Hu-1",
           "covid_vaccine_new-Fb", "covid_vaccine_new-Water"}

BLOOD_TISSUES = {"blood", "Peripheral blood", "PBL", "PBMC"}

def get_study(rid):
    for prefix, short in STUDY_MAP:
        if prefix in rid:
            return short
    return None

# Collect clone sizes per subject (blood only)
subj_clones = defaultdict(lambda: {"study": "", "sizes": []})
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
    sv = entry["statistics"][0]["stats_value"]
    if not sv:
        continue
    subj_clones[rid]["study"] = study
    subj_clones[rid]["sizes"].append(sv[0]["count"])

# Compute Hill numbers per subject
def hill_numbers(sizes):
    sizes = np.array(sizes, dtype=float)
    total = sizes.sum()
    if total == 0:
        return 0, 0, 0
    p = sizes / total
    q0 = len(sizes)
    q1 = np.exp(-np.sum(p[p > 0] * np.log(p[p > 0])))
    q2 = 1.0 / np.sum(p ** 2) if np.sum(p ** 2) > 0 else 0
    return q0, q1, q2

studies_order = ["CD1", "CD2", "CD3", "CVX1", "CVX2", "HC1"]
study_colors = {
    "CD1": "#1565c0", "CD2": "#1976d2", "CD3": "#42a5f5",
    "CVX1": "#e65100", "CVX2": "#ff9800",
    "HC1": "#2e7d32",
}

study_hills = defaultdict(lambda: {"q0": [], "q1": [], "q2": []})
for rid, info in subj_clones.items():
    if not info["sizes"]:
        continue
    q0, q1, q2 = hill_numbers(info["sizes"])
    s = info["study"]
    study_hills[s]["q0"].append(q0)
    study_hills[s]["q1"].append(q1)
    study_hills[s]["q2"].append(q2)

print("Subjects per study (blood only):")
for s in studies_order:
    print(f"  {s}: {len(study_hills[s]['q0'])} subjects")

# ============================================================
# FIGURE 17: Hill numbers boxplots — Order 0, 1, 2
# ============================================================
fig, axes = plt.subplots(1, 3, figsize=(18, 7))
fig.suptitle("Clonal Diversity: Hill Numbers (Blood Only)", fontsize=20, fontweight="bold", y=0.98)
fig.text(0.5, 0.93, "Order 0 (richness), Order 1 (Shannon), Order 2 (Simpson) across 6 studies",
         ha="center", fontsize=13, color="gray")

titles = ["A. Order 0 (Richness)", "B. Order 1 (Shannon)", "C. Order 2 (Simpson)"]
keys = ["q0", "q1", "q2"]
rng = np.random.default_rng(42)

for panel_idx, (key, title) in enumerate(zip(keys, titles)):
    ax = axes[panel_idx]
    bp_data = [study_hills[s][key] if study_hills[s][key] else [0] for s in studies_order]
    colors = [study_colors[s] for s in studies_order]

    bp = ax.boxplot(bp_data, positions=range(len(studies_order)), widths=0.5, patch_artist=True,
                    showfliers=False, medianprops=dict(color="black", linewidth=2))
    for i, patch in enumerate(bp["boxes"]):
        patch.set_facecolor(colors[i])
        patch.set_alpha(0.7)

    for i, s in enumerate(studies_order):
        vals = study_hills[s][key]
        if vals:
            jitter = rng.uniform(-0.12, 0.12, len(vals))
            ax.scatter([i + j for j in jitter], vals, color=colors[i], s=25, alpha=0.7,
                       zorder=3, edgecolors="white", linewidth=0.5)

    ax.set_xticks(range(len(studies_order)))
    ax.set_xticklabels(studies_order, fontsize=12, fontweight="bold")
    ax.set_title(title, fontsize=15, fontweight="bold", loc="left")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    if panel_idx == 0:
        ax.set_ylabel("Number of Clones", fontsize=13, fontweight="bold")
    else:
        ax.set_ylabel("Effective Number of Clones", fontsize=13, fontweight="bold")

plt.tight_layout(rect=[0, 0, 1, 0.90])
plt.savefig("plots/17_diversity_hill_numbers.png", dpi=400, bbox_inches="tight", facecolor="white")
plt.close()
print("Saved: 17_diversity_hill_numbers.png")

# ============================================================
# FIGURE 18: Diversity profiles — q0 → q1 → q2
# ============================================================
fig, ax = plt.subplots(figsize=(10, 7))
ax.set_title("Diversity Profiles (Blood Only)", fontsize=18, fontweight="bold")
ax.text(0.5, 1.03, "Each thin line = one subject; thick line = study median",
        transform=ax.transAxes, ha="center", fontsize=12, color="gray")

x_pos = [0, 1, 2]
for s in studies_order:
    q0s = study_hills[s]["q0"]
    q1s = study_hills[s]["q1"]
    q2s = study_hills[s]["q2"]
    color = study_colors[s]

    for i in range(len(q0s)):
        ax.plot(x_pos, [q0s[i], q1s[i], q2s[i]], color=color, alpha=0.15, linewidth=0.8)

    if q0s:
        medians = [np.median(q0s), np.median(q1s), np.median(q2s)]
        ax.plot(x_pos, medians, color=color, linewidth=3, marker="o", markersize=8,
                label=f"{s} (n={len(q0s)})", zorder=5)

ax.set_xticks(x_pos)
ax.set_xticklabels(["q=0\n(Richness)", "q=1\n(Shannon)", "q=2\n(Simpson)"], fontsize=13)
ax.set_ylabel("Effective Number of Clones", fontsize=14, fontweight="bold")
ax.set_yscale("log")
ax.legend(fontsize=11, title="Study", title_fontsize=12, loc="upper right")
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)

plt.tight_layout()
plt.savefig("plots/18_diversity_profiles.png", dpi=400, bbox_inches="tight", facecolor="white")
plt.close()
print("Saved: 18_diversity_profiles.png")
