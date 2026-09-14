import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

# Data from Table 5: disease categories and contributing studies
# with sequencing method annotation
disease_order = ["Severe", "Moderate", "Mild", "Recovered", "COVID Naive", "Healthy"]

# Study -> sequencing method mapping
study_method = {
    "CD1": "5'RACE + UMI",
    "CD2": "Multiplex PCR",
    "CD3": "Multiplex PCR",
    "CVX1": "5'RACE + UMI",
    "CVX2": "5'RACE + UMI",
    "HC1": "Multiplex PCR",
}

# Number of individuals per disease category per study (from Table 5)
disease_study_counts = {
    "Severe":      {"CD1": 11, "CD2": 8, "CD3": 7},
    "Moderate":    {"CD1": 9},
    "Mild":        {"CD1": 22, "CD2": 8},
    "Recovered":   {"CD2": 2, "CVX1": 5, "CVX2": 5},
    "COVID Naive": {"CVX1": 8},
    "Healthy":     {"CD3": 3, "HC1": 6},
}

# Aggregate by sequencing method
methods = ["5'RACE + UMI", "Multiplex PCR"]
method_colors = {"5'RACE + UMI": "#1565c0", "Multiplex PCR": "#e65100"}

disease_method_counts = {}
for d in disease_order:
    disease_method_counts[d] = {}
    for m in methods:
        disease_method_counts[d][m] = 0
    for study, count in disease_study_counts[d].items():
        m = study_method[study]
        disease_method_counts[d][m] += count

fig, ax = plt.subplots(figsize=(12, 8))

x = np.arange(len(disease_order))
bar_width = 0.55

bottom = np.zeros(len(disease_order))
for method in methods:
    vals = [disease_method_counts[d][method] for d in disease_order]
    bars = ax.bar(x, vals, bar_width, bottom=bottom, label=method,
                  color=method_colors[method], edgecolor="white", linewidth=0.8)
    for i, v in enumerate(vals):
        if v > 0:
            ax.text(x[i], bottom[i] + v / 2, str(v),
                    ha="center", va="center", fontsize=18, fontweight="bold",
                    color="white")
    bottom += vals

# Total labels on top
for i, d in enumerate(disease_order):
    total = sum(disease_method_counts[d].values())
    ax.text(x[i], total + 0.5, f"n={total}",
            ha="center", va="bottom", fontsize=18, fontweight="bold")

ax.set_xticks(x)
ax.set_xticklabels(disease_order, fontsize=22, fontweight="bold", rotation=25, ha="right")
ax.set_ylabel("Number of Individuals", fontsize=24, fontweight="bold")
ax.tick_params(axis="y", labelsize=20)
ax.legend(fontsize=20, title="Sequencing Method", title_fontsize=22,
          loc="upper right", framealpha=0.9, edgecolor="gray")
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)
ax.set_ylim(0, max(bottom) * 1.15)

plt.tight_layout()
plt.savefig("plots/04b_disease_by_seq_method.png", dpi=600, bbox_inches="tight", facecolor="white")
plt.close()
print("Saved: plots/04b_disease_by_seq_method.png")
