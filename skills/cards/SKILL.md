---
name: cards
description: Convert an Anki CSV/TSV export into individual Forester card trees under trees/cards/, then link, stub, and transclude them into the forest. Use when the user says "turn this csv into card trees", "do the same with <export>.csv", "import these Anki cards", or hands over a Front/Back/Tags export that should become `\prompt` trees and sync back to Anki.
---

# CSV → card trees

An Anki export is a flat list of Q/A pairs. A card tree is a *named idea*
with a prompt attached, linked into the graph and transcluded where the
idea lives. The conversion is not a reformat — it is a promotion: the
export's HTML becomes Forester prose, every recurring concept becomes a
link, missing link targets become stubs, and each card lands in the
notebook or concept note it tests.

Pair with `CLAUDE.md` (§ Add a spaced-repetition card, § Linking) and
`FORESTER-SYNTAX.md`.

## Scope

- **Input:** one `.csv` / `.tsv` export at the repo root (Anki's own
  format: `#separator:`, `#html:true`, `#columns:Front,Back,Tags`
  preamble, then quoted rows).
- **Output:** one `trees/cards/<id>.tree` per row, stubs for missing
  link targets under `trees/evergreen/`, `\transclude` lines in the
  relevant notebook / concept trees, corrections to any existing tree
  the cards contradict, and an applied `scripts/anki-sync`.
- **Never touched:** `trees/refs/`, `output/`, `tex/generated/`,
  `notes-log.md`, and any `\meta{anki}{...}` value.

## Steps

### 1. Read the export whole

```bash
cat <export>.csv
```

Read every row before writing anything. Rows in one export are usually
one coherent chapter — knowing the whole set is what lets you name the
cards distinctly and spot which ones want the same links.

Note the `Tags` column: it carries the source (`scaling-book::transformers`,
`tpu`, `roofline`) and is the main evidence for which notebook the batch
belongs to. The tags themselves are **not** copied into the trees —
`scripts/anki-sync` re-tags every note `forest` + `forest-id-<id>`.

### 2. Name each card for its idea

```bash
scripts/new card <Name…>
```

The `\title` is the **idea the card turns on**, not the question
restated:

- ✅ `Decode is bounded by the weight read`
- ✅ `The merge under M is the visibility point`
- ✅ `A mesh axis may appear only once`
- ❌ `Question about matmul intensity`
- ❌ `200B params in bf16 across 32 v4p — latency?`

The name is what makes a deck scannable and what lets a concept note
link *this* card in prose. Names must be distinct across the batch; if
two rows want the same name, one of them is really about something else
— say what.

`scripts/new card` prints the path it created. Set `NEW_SKIP_REGISTRY=1`
when creating many in a row to skip the per-file `notes-log.md` rebuild.

### 3. Write `\prompt{question}{answer}`

The template leaves an empty `\prompt{}{}`. Argument 1 → Anki's Front,
argument 2 → Back. `\title` is never synced.

Translate the export's HTML into real Forester:

| Export | Tree |
| --- | --- |
| `<b>…</b>` | `\strong{…}` |
| `<i>…</i>` | `\em{…}` |
| `<code>…</code>` | `\code{…}` |
| `<br><br>` | a blank line (new paragraph) |
| `<ul><li>` / numbered prose | `\ul{\li{…}}` / `\ol{\li{…}}` |
| `\(…\)` | `#{…}` |
| a displayed formula | `##{…}` on its own line |
| `&rarr; &times; &asymp; &middot; &otimes; &Sigma; &mu; &frac14;` | `\to \times \approx \cdot \otimes \sum \mu` in math, or the literal word in prose |
| `&#7488;` and friends | the math they encode (`^{\top}`) |

Structure the answer the way it reads best — a two-line answer stays two
paragraphs; a "signature / when / cost / why" answer wants bold leads
(`\strong{Signature} …`) on separate paragraphs; an enumeration wants
`\ol`. Do not preserve the export's `<br>` soup as-is.

### 4. Pick the deck

`\meta{anki-deck}{<Deck>}` on the line under `\tag{card}`; omitting it
means the `Forest` deck. Choose by precedent, not by asking:

```bash
grep -rh 'anki-deck' trees/cards/ | sort | uniq -c
```

Anything from the scaling book / ML systems goes to `MLSys`; general
architecture cards have historically stayed in the default `Forest`. A
batch is all one deck unless the rows genuinely split.

### 5. Link every concept in prose

Same discipline as anywhere in the forest, and it matters more here
because a card is read out of context:

- `[[ID]]` renders the target's **title**, so use it only where the
  title reads well inline. Writing `VMEM ([[GFK2]])` renders as
  "VMEM (VMEM)". Use `[VMEM](GFK2)` instead.
- `[display text](ID)` for everything else. **Never `[[ID|alias]]`.**
- Cards in the same batch link each other when they build on each other
  (`[case 3](KIRV)`, `[half the cost](MJ7A)`).

Find targets with `scripts/has "<concept>"` before assuming one is
missing.

### 6. Stub what is missing

```bash
scripts/new stub <Concept Name>
```

Then link the new id. Never leave a concept unlinked because its tree
does not exist yet — the stub is `\tag{stub}` + `\tag{public}`, ships
the name to the site as a live link target, and is promoted in place
later. Typical yield for a chapter-sized export is 3–5 stubs.

### 7. Reconcile the cards against existing trees

A card batch frequently contradicts a note written earlier from a worse
source. When it does, **fix the note** — per CLAUDE.md's Evolution
principle, rewrite the prose so the tree reads as a coherent whole. Do
not add an "update" paragraph, and do not quietly leave the two
disagreeing.

Seen in practice: `UNB6` claimed a store buffer slot is allocated at
commit (it is allocated at dispatch/rename; commit is only a state
transition); `OGCRP` claimed the MXU is 256×256 (it is 128×128, widening
to 256×256 only on v6e). Both were the note's error, not the card's.

Say in the report which trees you corrected and why.

### 8. Transclude the cards where they belong

A card that no tree transcludes is an orphan. Two homes:

- **The notebook**, under the section for that chapter:
  ```
  \section{Sharded Matrices and How to Multiply Them}{
    \put\transclude/toc{false}
    \transclude{QJX1}
    \transclude{JO4V}
  }
  ```
- **The concept note** the card tests, at the end of the tree — this is
  what makes a definition page double as a self-test.

`\put\transclude/toc{false}` keeps a run of cards out of the table of
contents. Re-read the notebook immediately before editing it: these
files get restructured by hand between sessions, and the right move is
to fill the section that is there, not to re-impose an earlier layout.

### 9. Build

```bash
opam exec -- forester build forest.toml 2>&1 | tail -20
```

Then spot-check one rendered card, especially any with heavy math:

```bash
sed -n '1,80p' output/<id>/index.xml
```

Confirm the KaTeX source survived (`\xrightarrow`, `\{U_X\}`, `\otimes`)
and that the answer sits inside the pink `jms-callout` wrapper.

### 10. Sync

```bash
scripts/anki-sync              # dry run — prints the plan
scripts/anki-sync --apply      # create/update, write \meta{anki} back
```

Needs Anki running with AnkiConnect on `localhost:8765`. The first apply
writes each note id into its tree as `\meta{anki}{<id>}`; never touch
that value by hand. A second run should report `0 to add` — if it does
not, a tree lost its meta or Anki lost the note.

### 11. Retire the export

Once every row is a tree, delete the `.csv` / `.tsv`. The trees are the
source of truth from that point; a stale export invites a second import.

### 12. Report

```
Converted: scaling_book_sharding_anki.csv (8 rows)
Cards (MLSys): QJX1 "An unsharded contracting axis needs no comms",
               JO4V "Gather before, or reduce after", …
Stubbed:       XGI0 Sharding, VSDZ AllGather, CAGW ReduceScatter, …
Transcluded:   TAAK § Sharded Matrices (+8)
Corrected:     OGCRP — MXU is 128×128, not 256×256
Synced:        8 added, 0 orphaned
Removed:       scaling_book_sharding_anki.csv
```

## Common pitfalls

- **Question in the title.** The `\title` is a name. If it ends in a
  question mark, it is wrong.
- **Redundant `[[ID]]`.** `MXU ([[OGCRP]])` renders "MXU (Matrix
  Multiply Unit (MXU))". Use `[MXU](OGCRP)`.
- **`\tag{public}` on a card.** Cards are off-site. The template gets
  this right; do not add it.
- **Leaving the export's HTML in place.** Entities and `<br>` in a tree
  are a failed conversion, not a shortcut.
- **Orphaned cards.** Step 8 is not optional.
- **Hand-editing `\meta{anki}`.** Ever.
- **One tree, two prompts.** One prompt per tree — the tree id *is* the
  card's identity. A row that wants two prompts is two rows.
