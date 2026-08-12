"""Shared visual theme for the weekly-review figures.

One editorial style for the whole report, keyed to the site's warm "vellum"
palette: a cream ground, brown/olive/tan accents, bars with a darker same-hue
outline and rounded corners, dashed horizontal gridlines, arrow-tipped axes,
and a bordered legend. The five sibling uv scripts (coding,
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

# --- palette: warm "vellum" site tones ---------------------------------------
CREAM = "#faf8f2"        # the card / page ground everything sits on
INK = "#2c2a26"          # titles, primary lines (warm near-black)
MUTED = "#96938b"        # axis + tick labels
FAINT = "#b0aca3"        # captions, value annotations
GRID = "#e7e4dc"         # dashed gridlines
AXIS = "#cfc9bd"         # the arrowed axis lines (warm, light)
ACCENT = "#7a5a2b"       # single-series accent (brown)
ACCENT_WARM = "#5f6b3c"  # contrast line (rolling averages) / olive
OTHER = "#ded9cc"        # the "Other" bucket / de-emphasised series (warm gray)

QUAL = [
    "#7a5a2b",  # brown
    "#5f6b3c",  # olive
    "#b2926a",  # tan
    "#9c6b4f",  # terracotta
    "#8a8567",  # sage
    "#c2a878",  # sand
    "#6f7d8c",  # slate (a cool note for relief)
    "#c9c2b4",  # warm gray
]

FONT_STACK = ["Work Sans", "DejaVu Sans", "Arial"]


def apply():
    """Install the theme into matplotlib's rcParams (call once per script)."""
    rc = {
        "font.family": "sans-serif",
        "font.sans-serif": FONT_STACK,
        "font.size": 11,
        # Transparent grounds: the figures sit on the site's white page, so a
        # cream fill would read as a tinted box rather than a region of the page.
        "figure.facecolor": "none",
        "figure.dpi": 150,
        "savefig.facecolor": "none",
        "savefig.transparent": True,
        "savefig.bbox": "tight",

        "axes.facecolor": "none",
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
        "legend.edgecolor": "#e7e4dc",
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
        "wk_seq", ["#f4efe4", "#d9c6a3", "#b2926a", "#7a5a2b"]
    )


def shades(n, light="#ece3d2", dark="#7a5a2b"):
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
