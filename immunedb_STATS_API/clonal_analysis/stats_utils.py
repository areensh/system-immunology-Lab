from scipy import stats
import numpy as np
from itertools import combinations

def add_significance(ax, data_by_group, group_labels, max_pairs=None, log_scale=False):
    """Add Kruskal-Wallis test and pairwise Mann-Whitney U with Bonferroni correction."""
    if max_pairs is None:
        max_pairs = 5

    valid = [(i, d) for i, d in enumerate(data_by_group) if len(d) >= 3]
    if len(valid) < 2:
        return

    valid_data = [d for _, d in valid]
    valid_idx = [i for i, _ in valid]

    kw_stat, kw_p = stats.kruskal(*valid_data)

    kw_text = f"Kruskal-Wallis p={'<0.001' if kw_p < 0.001 else f'{kw_p:.3f}'}"
    ax.text(0.02, 0.98, kw_text, transform=ax.transAxes, fontsize=8,
            verticalalignment='top', fontstyle='italic',
            bbox=dict(boxstyle='round,pad=0.3', facecolor='lightyellow', alpha=0.8))

    if kw_p >= 0.05:
        return

    pairs = list(combinations(range(len(valid_idx)), 2))
    p_values = []
    for i, j in pairs:
        _, p = stats.mannwhitneyu(valid_data[i], valid_data[j], alternative='two-sided')
        p_values.append((valid_idx[i], valid_idx[j], p))

    n_comparisons = len(p_values)
    significant = [(i, j, p * n_comparisons) for i, j, p in p_values
                   if p * n_comparisons < 0.05]
    significant.sort(key=lambda x: x[2])
    significant = significant[:max_pairs]

    if not significant:
        return

    y_lim = ax.get_ylim()
    if log_scale:
        y_max = y_lim[1]
        log_max = np.log10(y_max)
        log_min = np.log10(max(y_lim[0], 1e-10))
        log_range = log_max - log_min
        step = log_range * 0.07

        for k, (i, j, p_adj) in enumerate(significant):
            log_y = log_max + 0.02 * log_range + k * step
            y = 10 ** log_y
            y_tick = 10 ** (log_y - step * 0.15)
            if p_adj < 0.001:
                sig_text = "***"
            elif p_adj < 0.01:
                sig_text = "**"
            else:
                sig_text = "*"
            ax.plot([i, i, j, j], [y_tick, y, y, y_tick], color='black', linewidth=0.8)
            ax.text((i + j) / 2, y, sig_text, ha='center', va='bottom',
                    fontsize=9, fontweight='bold')

        new_top = 10 ** (log_max + 0.02 * log_range + len(significant) * step + step * 0.5)
        ax.set_ylim(top=new_top)
    else:
        y_max = y_lim[1]
        y_range = y_max - y_lim[0]
        step = y_range * 0.06
        bracket_y = y_max + y_range * 0.02

        for k, (i, j, p_adj) in enumerate(significant):
            y = bracket_y + k * step
            if p_adj < 0.001:
                sig_text = "***"
            elif p_adj < 0.01:
                sig_text = "**"
            else:
                sig_text = "*"
            ax.plot([i, i, j, j], [y - step * 0.15, y, y, y - step * 0.15],
                    color='black', linewidth=0.8)
            ax.text((i + j) / 2, y, sig_text, ha='center', va='bottom',
                    fontsize=9, fontweight='bold')

        new_top = bracket_y + len(significant) * step + step
        ax.set_ylim(top=new_top)
