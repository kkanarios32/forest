"""Shared visual theme for the weekly-review figures.

One editorial style for the whole report, modelled on a friendly-academic look:
a soft humanist font (Lato), the seaborn "deep" blue/green/orange palette, bars
with a darker same-hue outline and rounded corners, dashed horizontal gridlines,
arrow-tipped axes, and a bordered legend. The five sibling uv scripts (coding,
running, sleep, arbtt-plot, habitify) import this so the figures look like pages
of one document.

It is imported into those scripts' interpreters, so it only leans on
matplotlib/seaborn, which they already depend on.
"""

import colorsys

import matplotlib as mpl
from matplotlib.colors import LinearSegmentedColormap, to_rgba
from matplotlib.patches import FancyBboxPatch, Rectangle
import seaborn as sns

# --- palette: soft, light pastels with a friendly feel -----------------------
INK = "#555a60"          # titles, primary lines (soft charcoal, never black)
MUTED = "#7c828a"        # axis + tick labels
FAINT = "#a3a8af"        # captions, value annotations
GRID = "#e7e9ec"         # dashed gridlines
AXIS = "#aeb3ba"         # the arrowed axis lines (light)
ACCENT = "#7da7dd"       # single-series accent (light blue)
ACCENT_WARM = "#f0a878"  # contrast line (rolling averages) / soft orange
OTHER = "#cdd1d6"        # the "Other" bucket / de-emphasised series

QUAL = [
    "#7da7dd",  # light blue
    "#8fcda5",  # light green
    "#f3b58a",  # light orange
    "#ed9aa2",  # light rose
    "#b7abe0",  # light violet
    "#8fd3e0",  # light cyan
    "#e8d595",  # light gold
    "#c2c7cd",  # light gray
]

FONT_STACK = ["Work Sans", "DejaVu Sans", "Arial"]


def apply():
    """Install the theme into matplotlib's rcParams (call once per script)."""
    rc = {
        "font.family": "sans-serif",
        "font.sans-serif": FONT_STACK,
        "font.size": 11,
        "figure.facecolor": "white",
        "figure.dpi": 150,
        "savefig.facecolor": "white",
        "savefig.bbox": "tight",

        "axes.facecolor": "white",
        "axes.edgecolor": AXIS,
        "axes.linewidth": 1.0,
        "axes.spines.top": False,
        "axes.spines.right": False,
        "axes.axisbelow": True,
        "axes.titlesize": 14,
        "axes.titleweight": "bold",
        "axes.titlecolor": INK,
        "axes.titlepad": 10,
        "axes.titlelocation": "left",
        "axes.labelsize": 11,
        "axes.labelcolor": MUTED,

        "axes.grid": True,
        "axes.grid.axis": "y",
        "grid.color": GRID,
        "grid.linewidth": 1.0,
        "grid.linestyle": (0, (5, 4)),  # dashed

        "text.color": INK,
        "xtick.color": MUTED,
        "ytick.color": MUTED,
        "xtick.labelsize": 10.5,
        "ytick.labelsize": 10.5,
        "xtick.major.size": 0,
        "ytick.major.size": 0,
        "xtick.major.pad": 6,
        "ytick.major.pad": 4,

        "legend.fontsize": 10,
        "legend.title_fontsize": 10.5,
        "legend.frameon": True,
        "legend.fancybox": True,
        "legend.edgecolor": "#dcdee1",
        "legend.facecolor": "white",
        "legend.framealpha": 1.0,
        "legend.borderpad": 0.6,
        "legend.handlelength": 1.2,
        "legend.handleheight": 1.2,
        "legend.columnspacing": 1.3,
        "legend.labelspacing": 0.55,
    }
    sns.set_theme(context="paper", style="white", rc=rc, font_scale=1.0)
    mpl.rcParams.update(rc)  # reassert; seaborn overrides a few keys


def palette(n):
    """n qualitative colors, cycling the base palette if more are needed."""
    if n <= len(QUAL):
        return list(QUAL[:n])
    reps = (n // len(QUAL)) + 1
    return (QUAL * reps)[:n]


def darker(c, f=0.82):
    """A slightly deeper shade of a color, for soft bar outlines."""
    r, g, b, a = to_rgba(c)
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    r, g, b = colorsys.hls_to_rgb(h, max(0.0, l * f), s)
    return (r, g, b, a)


def sequential_cmap():
    """Light→medium blue colormap for heatmaps / continuous shading (airy)."""
    return LinearSegmentedColormap.from_list(
        "wk_seq", ["#f3f7fd", "#c2d8f0", "#93b8e3", "#5f8ecb"]
    )


def shades(n, light="#dbe8f7", dark="#6f9ad0"):
    """n ordered colors between two endpoints (for ordinal stacks, e.g. sleep)."""
    cmap = LinearSegmentedColormap.from_list("wk_shades", [light, dark])
    if n == 1:
        return [to_rgba(dark)]
    return [cmap(i / (n - 1)) for i in range(n)]


def style_axis(ax, grid="y"):
    """Dashed gridlines on one axis only, no tick marks."""
    ds = (0, (5, 4))
    if grid == "y":
        ax.grid(axis="y", color=GRID, linewidth=1.0, linestyle=ds)
        ax.grid(axis="x", visible=False)
    else:
        ax.grid(axis="x", color=GRID, linewidth=1.0, linestyle=ds)
        ax.grid(axis="y", visible=False)
    ax.set_axisbelow(True)
    ax.tick_params(length=0)
    for spine in ("top", "right"):
        ax.spines[spine].set_visible(False)


def arrows(ax, lw=1.3):
    """Replace the L-shaped axis spines with light arrow-tipped lines."""
    for s in ax.spines.values():
        s.set_visible(False)
    kw = dict(
        arrowprops=dict(arrowstyle="-|>", color=AXIS, linewidth=lw,
                        shrinkA=0, shrinkB=0, mutation_scale=12),
        xycoords="axes fraction", annotation_clip=False, zorder=5,
    )
    ax.annotate("", xy=(1.02, 0), xytext=(0, 0), **kw)   # x-axis →
    ax.annotate("", xy=(0, 1.05), xytext=(0, 0), **kw)   # y-axis ↑


def round_bars(ax, frac=0.16, max_pix=7, edge="hue", f=0.82, lw=1.3,
               horizontal=False):
    """Give bars subtly rounded corners. `edge` is "hue" (a soft darker outline),
    "white" (separators for stacked bars), or None. Call last, after limits are
    set. Corners are a small fraction of the thin side, capped to `max_pix` so
    bars stay rectangular rather than turning into capsules."""
    ax.figure.canvas.draw()
    x0, x1 = ax.get_xlim()
    y0, y1 = ax.get_ylim()
    ext = ax.get_window_extent()
    xperpix = (x1 - x0) / ext.width
    yperpix = (y1 - y0) / ext.height
    new = []
    for p in list(ax.patches):
        if not isinstance(p, Rectangle):
            continue
        x, y, w, h = p.get_x(), p.get_y(), p.get_width(), p.get_height()
        fc = p.get_facecolor()
        z = p.get_zorder()
        thin_pix = (abs(w) / xperpix) if not horizontal else (abs(h) / yperpix)
        long_pix = (abs(h) / yperpix) if not horizontal else (abs(w) / xperpix)
        # small corner: a fraction of the thin side, hard-capped in pixels.
        rad_pix = min(thin_pix * frac, max_pix, long_pix * 0.5)
        rs = rad_pix * xperpix          # rounding radius in x data units
        asp = yperpix / xperpix         # makes the y-corner match the x-corner
        if edge == "hue":
            ec, elw = darker(fc, f), lw
        elif edge == "white":
            ec, elw = "white", 1.1
        else:
            ec, elw = "none", 0
        fancy = FancyBboxPatch(
            (x, y), w, h,
            boxstyle=f"round,pad=0,rounding_size={rs}",
            mutation_aspect=asp, fc=fc, ec=ec, lw=elw, zorder=z,
        )
        p.remove()
        new.append(fancy)
    for fancy in new:
        ax.add_patch(fancy)


def suptitle(fig, title, subtitle=None, x=0.012, y=0.985):
    """Left-aligned figure title with an optional muted subtitle beneath it."""
    fig.suptitle(title, x=x, ha="left", fontsize=17, fontweight="bold",
                 color=INK, y=y)
    if subtitle:
        fig.text(x, y - 0.052, subtitle, ha="left", va="top",
                 fontsize=11, color=FAINT)
