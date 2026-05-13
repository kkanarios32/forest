---
name: ingest
description: Distribute fleeting notes from trees/fleet/ into the atomic-concept structure under trees/public/. Use when the user says "ingest fleet", "process my fleeting notes", "promote the fleet", or references one or more fleet trees that need to be integrated into the published forest. Splits multi-concept fleet notes into atomic trees, merges single-concept extensions into existing trees, and weaves links to related concepts.
---

# Ingest fleeting notes

Fleeting notes (`trees/fleet/*.tree`, `\tag{private}`) are long-form
scratch where ideas land before they have shape. Ingesting means
distributing each note's content into the public atomic-concept
structure: split multi-concept notes into atomic trees, merge
single-concept extensions into existing trees, and add prose links so
the new content joins the graph.

Pair this skill with `CLAUDE.md` (curation conventions, link rules,
stubbing workflow).

## Scope

- **Input:** one or more files under `trees/fleet/`, excluding
  `fleet.tree` itself. If the user names specific fleet IDs (e.g.
  "ingest NWRG"), process only those. Otherwise process every
  individually-tagged `\tag{private}` tree in `trees/fleet/`.
- **Output:** atomic trees under `trees/public/` (created or
  extended), updates to the relevant notebook trees, and `\tag{todo}`
  stubs for any not-yet-written concepts mentioned in the new prose.
- **Never touched:** `trees/refs/` (use the bibliography pipeline
  instead), `theme/`, `output/`.

## Steps

### 1. Survey the fleet

```bash
ls trees/fleet/*.tree
```

For each candidate file, read it. Note its `\title{...}` and the
body — fleet notes typically contain 1-5 distinct atomic concepts in
one long-form passage. Examples seen in practice:

- `NWRG` (GPU Register Scoreboard) covers: GPU scoreboard, CPU
  CAM-based issue queue / wakeup-select, ILP-vs-TLP tradeoff.
- `SKBY` (ROB vs. Store Buffer) covers: ROB commit semantics, store
  buffer drain, store-to-load forwarding, fence semantics.
- `W9U8` (Segmented Page Tables) covers: segmented page tables,
  hierarchical / multi-level page tables.

### 2. Atomize: identify concepts

For each fleet note, list the atomic concepts it contains. A concept
is atomic when:

- It has a name that would read well as a `\title{...}`.
- A single `\p{...}` opening sentence can orient a reader.
- It is composable — other trees might want to `\transclude` or link
  to it independently.

Err on the side of more atoms, not fewer. Per
`feedback_atomization.md`, "atomize aggressively" is the standing
preference.

### 3. Search for existing homes

For each atomic concept, check whether the forest already covers it.
Use the project's search tools:

```bash
scripts/has "register scoreboard"     # ripgrep across trees
scripts/hastags public note           # narrow to public notebook trees
scripts/fb                            # fzf over all titles
```

Classify each concept as one of:

- **EXTEND** — there is an existing public tree on this exact
  concept. The fleet prose adds depth, nuance, examples, or
  corrections to what is already there.
- **NEW** — no existing tree covers this concept. The fleet prose
  becomes the seed of a new atomic tree.
- **DROP** — the fleet prose duplicates existing content with no new
  signal. Discard it. (Note this explicitly in the plan; do not
  silently drop.)

### 4. Plan the distribution and confirm

Before any writes, present a plan to the user with this shape:

```
NWRG (GPU Register Scoreboard)
  ├─ NEW: "GPU register scoreboard" — taxon Definition,
  │       link to [[Q2DT]] (Locks), [[N7GP]] notebook
  ├─ EXTEND: existing 8C2H ("CPU issue queue") — add
  │       CAM/wakeup-select section, link to new scoreboard tree
  └─ NEW: "ILP vs TLP tradeoff" — taxon Remark, transclude from N7GP

SKBY (ROB vs. Store Buffer)
  ├─ EXTEND: existing ABCD ("Reorder buffer") — refine commit
  │       semantics paragraph
  └─ NEW: "Store buffer drain" — link to [[ABCD]], [[xxxx]] (TSO)

Stubs to create: [[??]] TSO memory model, [[??]] Store-to-load
forwarding
```

Wait for the user to approve, redirect, or amend. Do not write until
the plan is acknowledged.

### 5. Execute: extend existing trees

For each EXTEND target:

1. Read the current tree end-to-end.
2. Integrate the fleet prose into the existing flow. **Rewrite, do
   not append.** Per the Evolution principle in `knowledge.md`: no
   "update" sections, no disclaimers, no trailing addenda — the tree
   should read as a coherent whole reflecting the current best
   understanding.
3. Add `[[ID]]` links inline wherever the new prose mentions another
   concept that has (or should have) a tree. If a target tree does
   not exist, follow the stubbing workflow in step 7 before linking.
4. Update the tree's `\date{...}` to today if the change is
   substantive.

### 6. Execute: create new atomic trees

For each NEW concept:

1. Run the right template:
   - `scripts/new def` for definitions
   - `scripts/new thm` for theorems
   - `scripts/new prop` for propositions
   - `scripts/new lemma` for lemmas
   - `scripts/new blog` for blog-shaped explanatory pieces
   - For a generic concept-note with no special taxon, copy the
     `def.tree` template body and drop the `\taxon{Definition}` line,
     or use `scripts/new def` and edit the taxon afterward.
2. Set `\title{...}` to the concept name.
3. Set or adjust `\taxon{...}` (Definition / Theorem / proposition /
   omit for generic notes).
4. Add topical tags. At minimum `\tag{public}` (the template adds
   this). Add `\tag{note}` for notebook-style entries and any
   topical tag that an existing Datalog query relies on (`prob`,
   `action-perception`, etc.). Reuse before inventing — see
   `knowledge.md` § Tag vocabulary.
5. Write the body. Open with one orienting sentence in `\p{...}`,
   then port the fleet prose. Use `\section{...}{...}` only if the
   tree genuinely has sub-structure; otherwise keep it as flowing
   paragraphs. Use `\remark{...}` / `\example{...}` for asides that
   shouldn't clutter the TOC.

### 7. Weave links into the new and edited trees

For every public tree touched in steps 5 and 6, do a link sweep:

1. Read the tree's prose. For each proper noun, named pattern,
   library, theorem, or atomic concept mentioned, decide whether it
   deserves its own tree.
2. If a tree already exists, add `[[ID]]` (or `[text](ID)` when the
   title doesn't fit the sentence) inline at the mention.
3. If a tree does *not* yet exist but the concept deserves one,
   **stub it** before linking:
   ```bash
   scripts/new todo
   ```
   Then open the new `trees/public/<id>.tree` and set
   `\title{<Concept Name>}`. The template already provides
   `\import{base-macros}`, `\author{kellenkanarios}`, `\tag{todo}`.
   Leave the body empty. Now link to `[[<id>]]` from the original
   prose.
4. Never leave a dangling `[[??]]` placeholder in committed prose —
   every link must resolve to a real ID. (Search after editing:
   `grep -rn '\[\[??' trees/`.)
5. Forbidden form: `[[ID|alias]]`. Use `[alias](ID)` instead.

### 8. Wire new atoms into notebooks

A new atomic tree usually belongs in one or more notebook trees
(e.g. `N7GP` Computer Architecture, `0007` Probability and Measure).
For each new atomic tree:

1. Identify the right notebook by tag or topic.
2. Add a `\transclude{<new-id>}` line under the appropriate
   `\section{...}` block. If no fitting section exists, add a new
   `\section{Title}{ \transclude{<new-id>} }`.
3. If the new concept is a `\remark`-style aside, wrap the
   transclusion in a TOC-hiding scope:
   ```
   \scope{
     \put\transclude/toc{false}
     \transclude{<new-id>}
   }
   ```

### 9. Remove the fleet note

Once the fleet note's content has been fully distributed:

- If every atomic concept in the fleet note now lives in a public
  tree, **delete the fleet note**:
  ```bash
  rm trees/fleet/<id>.tree
  ```
  Then remove the matching `\transclude{<id>}` line from
  `trees/fleet/fleet.tree`.
- If some prose was kept as scratch (e.g. open questions, half-formed
  ideas), leave the fleet note in place but strip out the prose that
  has been promoted. The fleet note should always reflect what is
  *still* fleeting.

### 10. Build and verify

```bash
opam exec -- forester build forest.toml -vv 2>&1 | tail -40
```

Look for:

- Broken-link warnings (should be none — step 7 should have resolved
  them all).
- Build errors from malformed syntax.

If `scripts/fserve` is already running, the rebuild is automatic;
just refresh the browser.

### 11. Report

Tell the user, terse and structured:

```
Ingested: NWRG, SKBY, W9U8
Created (public): <id1> "GPU register scoreboard", <id2> "Store buffer drain", ...
Extended: 8C2H, ABCD, ...
Stubbed (todo): <id3> "TSO memory model", <id4> "Store-to-load forwarding"
Notebook updates: N7GP (+2 transcludes), 0007 (+1)
Removed: trees/fleet/NWRG.tree, trees/fleet/SKBY.tree, trees/fleet/W9U8.tree
```

Surface any open questions or judgment calls — e.g. a fleet concept
that overlaps two existing trees and could plausibly extend either.

## Common pitfalls

- **Appending instead of rewriting.** When extending an existing
  tree, do not tack the fleet prose on at the end. Integrate it into
  the existing flow so the tree still reads as a single coherent
  argument.
- **Under-atomizing.** A fleet note titled "X" may actually cover
  X, Y, and Z. Split. The fleet title is a starting hint, not a
  binding constraint on the output trees.
- **Leaving dangling links.** Every `[[ID]]` must resolve. Stub a
  todo tree (step 7) for any concept that should have a tree but
  doesn't, then link to the stub.
- **Forgetting the notebook wiring.** A new atomic tree that isn't
  transcluded from any notebook is an orphan — it exists but no one
  reaches it. Always do step 8.
- **Editing `trees/refs/` by hand.** References come from
  `tex/refs.bib` via `scripts/split_bib`. To add citation context,
  write a `\refnote` or `\refcard` in a separate tree.
