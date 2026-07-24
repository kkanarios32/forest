"""Habits completion grid, drawable onto a caller-supplied Axes.

One binary cell per scheduled habit-day: completed (solid) or a light,
hairline-outlined miss. Day labels sit above the grid; the per-day completed
counts sit in a footer row below it (the day-axis story). No header, no row
totals, no grand total — the figure that hosts this owns titling.

The Habitify v2 API reports a scheduled day as "completed" or "inprogress"
only — there is no failed/skipped/null state, so a scheduled miss cannot be
split into "not done" vs "not logged". A habit-day that is not scheduled simply
does not appear in that day's journal; that absence renders as an empty cell and
is excluded from the counts.
"""

import os
import statistics
import sys
import time
from datetime import date, timedelta

import pandas as pd
import requests
from matplotlib.patches import FancyBboxPatch

API = "https://api.habitify.me/v2"
KEY_FILE = os.path.join(
    os.environ.get("XDG_CONFIG_HOME", os.path.expanduser("~/.config")),
    "habitify",
    "apikey",
)
DOW = ["Fri", "Sat", "Sun", "Mon", "Tue", "Wed", "Thu"]  # review week: Fri -> Thu

INK = "#0b0b0b"          # primary — the outlier day count only
SECONDARY = "#4a4742"    # habit labels
MUTED = "#898781"        # day labels + counts
HIT = "#C0522C"          # completed cell (solid coral, shares the running palette)
MISS_FILL = "#F6E7DF"    # not-completed cell fill (light warm tint)
HAIRLINE = (11 / 255, 11 / 255, 11 / 255, 0.12)  # inset outline on miss cells

CELL = 0.86
RADIUS = 0.11


def get_key():
    key = os.environ.get("HABITIFY_API_KEY")
    if key:
        return key.strip()
    with open(KEY_FILE) as f:
        return f.readline().strip()


TRANSIENT = {429, 500, 502, 503, 504}   # rate-limit / server hiccups worth a retry


def fetch_journal(key, day, retries=5):
    """One day's journal, retrying transient 5xx/429/network errors with
    exponential backoff. Habitify returns intermittent 503s, especially across
    the seven back-to-back calls a week needs."""
    for attempt in range(retries):
        try:
            r = requests.get(
                f"{API}/habits/journal",
                params={"date": day.strftime("%Y-%m-%d")},
                headers={"X-API-Key": key},
                timeout=15,
            )
            if r.status_code in TRANSIENT:
                raise requests.HTTPError(f"{r.status_code} {r.reason}", response=r)
            r.raise_for_status()
            return r.json().get("data", [])
        except requests.RequestException as e:
            if attempt == retries - 1:
                raise
            wait = 1.5 * (2 ** attempt)   # 1.5, 3, 6, 12s
            print(f"habitify {day}: {e} — retry in {wait:.0f}s", file=sys.stderr)
            time.sleep(wait)


def fetch():
    """The current review week's records (one row per scheduled habit-day)."""
    today = date.today()
    # The review week runs Friday -> Thursday and ends on the most recent
    # Thursday, so a mid-week run shows the last completed week, never today's
    # partial day.
    thursday = today - timedelta(days=((today.weekday() - 3) % 7 or 7))
    start = thursday - timedelta(days=6)  # the preceding Friday
    key = get_key()
    records = []
    for i in range(7):
        day = start + timedelta(days=i)
        for h in fetch_journal(key, day):
            status = (h.get("status") or "").lower()
            records.append(
                {"habit": h["name"], "dow": day.strftime("%a"),
                 "hit": 1 if "complet" in status else 0}
            )
    return pd.DataFrame(records)


def _sentence_case(s):
    return s[:1].upper() + s[1:].lower() if s else s


def _cell(ax, ci, ri, fc, ec, lw):
    ax.add_patch(FancyBboxPatch(
        (ci - CELL / 2, ri - CELL / 2), CELL, CELL,
        boxstyle=f"round,pad=0,rounding_size={RADIUS}",
        mutation_aspect=1, facecolor=fc, edgecolor=ec, linewidth=lw, zorder=3,
    ))


def draw(ax, df, label_fontsize=12):
    """Render the grid onto `ax`. `ax` is left cleared of spines/ticks."""
    ax.set_aspect("equal")
    ax.set_anchor("C")   # centre the grid vertically so it aligns with running
    ax.axis("off")

    if df is None or df.empty:
        ax.text(0.5, 0.5, "No habit data this week", ha="center", va="center",
                color=MUTED, fontsize=13, transform=ax.transAxes)
        return

    hit = df.pivot_table(index="habit", columns="dow", values="hit",
                         aggfunc="max").reindex(columns=DOW)
    completed = hit.sum(axis=1)
    order = sorted(hit.index, key=lambda h: (-int(completed[h]), h))
    col_done = [int(hit[d].sum()) for d in DOW]
    med = statistics.median(col_done)

    ncol, nrow = len(DOW), len(order)
    ax.set_xlim(-0.5, ncol - 0.5)
    ax.set_ylim(nrow - 0.5 + 1.5, -1.35)      # inverted; day row above, counts below

    y_day = -0.92
    y_count = nrow - 0.5 + 0.55

    for ci, day in enumerate(DOW):
        ax.text(ci, y_day, day, ha="center", va="center", fontsize=12,
                color=MUTED)
        outlier = (med - col_done[ci]) > 2
        ax.text(ci, y_count, str(col_done[ci]), ha="center", va="center",
                fontsize=12, fontweight=500 if outlier else 400,
                color=INK if outlier else MUTED)

    for ri, habit in enumerate(order):
        for ci, day in enumerate(DOW):
            v = hit.loc[habit, day]
            if pd.isna(v):
                continue
            if v >= 1:
                _cell(ax, ci, ri, HIT, "none", 0)
            else:
                _cell(ax, ci, ri, MISS_FILL, HAIRLINE, 1.0)
        ax.text(ncol - 0.5 + 0.35, ri, _sentence_case(habit), ha="left",
                va="center", fontsize=label_fontsize, color=SECONDARY)
