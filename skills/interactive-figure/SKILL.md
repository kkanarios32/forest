---
name: interactive-figure
description: Port a standalone .html animation or interactive figure into the forest as a self-contained .js asset rethemed to the site palette, mounted from a tree, and transcluded where it belongs. Use whenever the user hands over an .html file with an embedded widget and asks to embed it, add it to a note, or "do the same" as a previous figure.
---

# Porting an interactive figure into the forest

A generated `.html` widget is written for a blank page. This forest is not a
blank page, and four of its properties will silently break a straight paste.
The job is not "inline the HTML" — it is to re-express the figure as a
self-contained script that survives all four, then find the tree it is an
argument for.

Worked precedents, in order of increasing complexity. Read the closest one
before writing anything; the comment headers explain the decisions:

| asset | tree | shape |
|---|---|---|
| `assets/files/ring-reduce-scatter.js` | `CAGW` | precomputed frames, Back/Next |
| `assets/files/mxu-systolic-array.js` | `SXP6` | SVG built node-by-node |
| `assets/files/kv-cache.js` | `TJLA` | derived state, timer, mode toggle |

## The four constraints

**1. The figure will appear more than once on a page.** Forester embeds a
tree's whole content into anything that transcludes or hover-previews it. Even
a tree's *own* page renders its body twice. So: **no document-unique ids**,
anywhere — not `getElementById`, not `<svg><marker id>`, not `<label for>`. Use
`data-*` attributes plus `root.querySelector` scoped to the mount. Confirm with
`grep -o 'yourfig' output/<ID>/index.xml | wc -l` after building.

**2. Hover previews are DOM clones.** `forester.js` clones nodes already in the
document. A clone carries markup but not event listeners, timers, or closure
state. So **all state lives in `data-*` attributes on the mount root**, the
render is a pure function of those attributes, and the controls run off *one*
listener delegated on `document`. Get this right and a cloned figure is live in
the preview for free, which is the point — the hover preview of the concept
becomes the figure, and it works.

**3. The page is XML with client-side XSLT.** `output/<ID>/index.html` is a
redirect to `index.xml`; the browser applies `theme/*.xsl` itself. The script
therefore cannot assume an HTML document:

- `document.createElementNS(XHTML, …)` — never `createElement`, which yields a
  null-namespace element that is not a stylesheet, script, or anything else.
- `el.setAttribute('class', …)` — never `.className`, which is undefined.
- No `classList`, `closest`, or `dataset`. Hand-roll `up()` and `hasClass()`;
  they are three lines each and are in all three precedents.
- **No HTML entity names.** `&times;` `&mdash;` `&nbsp;` are undefined in XML
  and will fail the parse. Use the literal characters `× — −  `.
- Anything assigned to `innerHTML` must be well-formed XML: every tag closed,
  every attribute quoted, no bare `&`.

**4. The script tag is not parser-inserted.** It arrives via an XSLT transform,
so `defer` carries no guarantee and `DOMContentLoaded` may already have passed.
Make mounting idempotent and ask three times:

```js
mountAll();
document.addEventListener('DOMContentLoaded', mountAll);
window.addEventListener('load', mountAll);
```

## Rethemeing

Generated widgets ship a design system that does not exist here. Expect to
delete: `--text-primary`, `--border`, `--surface-1`, `--font-sans`, a Google
Fonts `@import`, and a `@media (prefers-color-scheme: dark)` block. **The site
is light-only** — there are no dark rules in `theme/style.css`, so a dark block
is not a fallback, it is a second uncoordinated theme that will fire on half
your readers.

Map onto the palette in `trees/evergreen/base-macros.tree`, which is the source
of truth. Restate the values as literals in the JS with a comment saying so —
the same concession `theme/style.css` makes, for the same reason: neither file
can see the macros.

| role in the figure | ink | tint |
|---|---|---|
| active / in flight / recomputed now | `rgb(115,73,35)` | `rgb(251,241,234)` |
| settled / done / held / free | `rgb(38,97,69)` | `rgb(236,247,240)` |
| labels, muted chrome | `rgb(109,103,101)` | — |
| hairline rules, resting cell border | `rgb(219,216,215)` | — |
| button outline (fills on hover) | `rgb(51,64,90)` | page ground `#f6f4ee` |

Type: `var(--sans)` for chrome and labels, `var(--mono)` for anything naming an
index range or address, body serif for narration. **Size in `em`, never `rem`**
— the body `font-size` is a `clamp()` that the root does not track. A fixed
pixel grid (cells that are graphics, not type) may stay in `px`; say why in a
comment.

Reuse the chrome the existing three share, so the figures read as a set: a short
rule, an uppercase sans label carrying the step, narration behind a 2px hairline
with a `min-height` so the layout does not hop, then the figure, then the
control bar, then a legend.

**Do not use `\embed`.** It emits `<html:embed>`, a nested browsing context that
inherits none of the site's variables, type, or measure — the figure would
arrive in browser defaults inside a box of its own.

**Styling stays in the JS, not in `base-macros`.** This is the exception
`CLAUDE.md` carves out for `\foldout`: the colors key off per-frame state that
no inline style can see. Say so in the file header.

**Autoplay is almost always wrong.** A page can hold several copies and a hover
preview can raise another. Default to paused with a Play button. If the figure
does animate, run **one** lazily-created `setInterval` on the document that
sweeps `.yourfig[data-…-play="1"]`, and clear it when nothing is playing — so a
page that merely *links* the tree ticks nothing, and a copy cloned mid-run is
picked up with no per-root bookkeeping. Stop at the last frame rather than
looping if the last frame carries the punchline.

## The tree side

The tree emits an empty mount and the script, nothing else:

```
% One or two sentences: what the figure is, why the styling lives in the
% script rather than base-macros, and that it is transclusion-safe.
\<html:div>[class]{yourfig}{}
\<html:script>[src]{\route-asset{assets/files/your-figure.js}}[defer]{}{}
```

Then find the right tree, and treat this as the real work — the figure is an
argument, and it belongs in the note making that argument.

- **Prefer promoting an existing thin tree** over creating a new one. `SXP6` was
  an image with no prose; `TJLA` was a borrowed GIF. Both became real notes
  around the figure: drop `\tag{stub}` if present, add a `\taxon`, add
  `\tag{note}`, and write the prose the figure illustrates.
- **Write the prose.** A figure with no argument around it is a decoration.
  Lead with an orienting `\p`, put the derivation or accounting the figure
  animates in the body, and link in prose per `CLAUDE.md`.
- **Stub anything you want to link that has no tree** (`scripts/new stub <Name>`).
  Do not link a `trees/cards/` tree from a public tree — cards are not
  `\tag{public}` and the link renders broken.
- **Replace what the figure supersedes.** If the tree carried a static image or
  borrowed GIF showing the same thing worse, drop it and tell the user the asset
  is now unreferenced. Keep it only if it shows a genuinely different variant,
  and say in the caption what the contrast is.
- **Transclude into the notebook**, in the section where it belongs and next to
  the trees that already discuss it. Check first whether the notebook already
  transcludes the cards or trees you were about to pull in — near-duplicate
  transclusions are the easiest mistake here. Prefer a prose link over a second
  transclusion.

## Forester traps that bite in this workflow

- `%` starts a comment — write `\%`. `#` starts math.
- **`#{40\%}` silently breaks.** Forester eats the backslash and emits a bare
  `%`, which KaTeX reads as a comment and swallows the rest of the line. Put
  percentages outside math: `40\%`.
- Never `[[ID|alias]]`. It is `[[ID]]` or `[text](ID)`.
- A linter in this repo rewrites punctuation on save — regular spaces around an
  arrow or colon become U+2009 thin spaces. If `Edit` fails with "String to
  replace not found" on a line containing `→` or `·`, that is why. Check with
  `python3 -c "print(repr(open(f).read()[a:b]))"` and edit via a Python
  heredoc with an `assert s.count(old) == 1` guard.

## Verifying without a browser

There is no headless browser on this machine, so verify at the logic level and
say so plainly in the summary rather than implying the figure was seen to run.

```
node --check assets/files/your-figure.js
node skills/interactive-figure/verify.mjs assets/files/your-figure.js yourfig
forester build
```

`verify.mjs` loads the script into a stub DOM, asserts it mounts and injects its
stylesheet, checks the mount is idempotent and the delegated listener binds once
across a double load, scans for HTML entity names and unsafe DOM calls, and
validates the generated markup as XML. It covers the plumbing. **It does not
cover the figure's own claims** — write those assertions yourself, against the
pure functions extracted from the source, and check every number quoted in the
narration against them. That is what caught the utilisation arithmetic in
`SXP6`, and it is the part that matters.

Then confirm the build:

```
forester build 2>&1 | grep -iA2 '<TREE-ID>'          # no broken-link warnings
cmp output/bafkr*.js assets/files/your-figure.js      # asset routed, content-addressed
xmllint --noout output/<TREE-ID>/index.xml
grep -o 'yourfig' output/<TREE-ID>/index.xml | wc -l  # expect >= 2 — see constraint 1
```

Leave the user's source `.html` in place; it is theirs to delete.
