---
name: atomize
description: Split long-form prose into atomic concept trees and wire them into the forest. Use when promoting a transient note out of trees/inbox/, processing a paper or lecture notes, or refactoring an existing tree that has grown to cover multiple concepts. Covers where the atom boundary falls, plus the mechanics of creating, stubbing, transcluding, and retiring the source note.
---

# Atomize: break notes into concept trees

## Guiding principles

**Parent notes should aggressively link / transclude atomic notes so that we can follow backlinks from the atomic notes to their place in a larger context**

**An atomic note MUST make sense on its own**

The forest's organizing principle is that every named concept lives in
its own tree, and composition happens via `\transclude` and `[[ID]]`
links. Atomization is the act of finding those concept boundaries
inside long-form prose (a transient note in `trees/inbox/`, a paper
summary, an oversized existing tree) and splitting accordingly.

Read this before promoting anything out of the inbox, or whenever an
existing tree starts feeling crowded. Pair with `CLAUDE.md` for syntax,
tag vocabulary, and the note pipeline. Spaced-repetition cards are a
different job — see the `cards` skill.

## What an atom is

A concept is the right granularity for its own tree when **all** of
these hold:

1. **It has a stable name.** The concept can be titled in 1-5 words
   (`MESI protocol`, `Store buffer`, `Borel's Normal Number
   Theorem`). If you cannot title it without using "and", "vs", or
   "with", it is probably two concepts.
2. **A single orienting sentence works.** You can write one
   `\p{...}` opener that tells a reader what the tree is about. If
   the opener needs to introduce two unrelated mechanisms before the
   "real" content starts, split.
3. **It is composable.** Another tree, now or in the future, might
   want to `\transclude` or `[[ID]]`-link this concept independently
   of any other. If the concept only makes sense in the context of
   one specific parent, it is probably a `\section` or `\remark`
   inside that parent, not its own tree.
4. **It has more than a sentence to say.** A tree with one
   declarative sentence and nothing else is a stub at best
   (`\tag{stub}`) and an over-atomization at worst. If you cannot
   imagine ever writing a second paragraph, fold it into the parent.

## Heuristics for spotting atom boundaries

**The "and" / "vs" test.** A title containing a conjunction is the
strongest signal of an under-atomized note. Examples:

- "ROB vs. Store Buffer" → split into `Reorder buffer (ROB)`,
  `Store buffer`. KEEP ROB VS. STORE BUFFER AS A PARENT NOTE THAT REFERENCES THE TWO NOTES. This is what enables more learning through context / backlinks.
- "LRU and Clock Algorithms" -> should be split into LRU and Clock algorithm, where the Clock algorithm can reference LRU.

**The "family" pattern.** When the prose introduces a *category* and
then walks through 2+ variants of it, atomize the family into:

- A parent tree with a brief intro `\p{...}` and `\transclude{...}`
  for each variant. Example: `Q2DT` (Locks) parent + `MJ5L`, `PXY9`,
  `V7KP`, `BJ7N`, `IN64` children.
- One child tree per variant.

The parent tree's prose is two or three sentences naming the family,
the dimensions along which variants differ, and the tradeoff. The
children carry the actual definitions and analyses.

**The "motivation → mechanism → consequence" arc.** Most well-written
transient notes follow this shape for a *single* concept:

```
Motivation: what problem does this solve?
Mechanism: how does it work?
Consequence: what are the implications / tradeoffs?
```

That arc is one atom, not three. Do **not** split a single concept's
motivation, mechanism, and consequences into separate trees.

**The cross-reference test.** If you find yourself wanting to link to
"the part of tree X that talks about Y", Y wants to be its own tree.
Forester links resolve at the tree level — sub-paragraph anchors do
not feel idiomatic in this forest.

**The repeat-mention test.** If a concept gets mentioned in two or
more existing evergreen trees, it deserves its own tree (so those
mentions can become links).

## Anti-patterns

**Over-atomization.**

- Splitting a definition from its canonical example. The example
  belongs inline or in an `\example{...}` card inside the definition
  tree.
- Splitting a theorem from its proof. The proof goes in a
  `\proof{...}` card inside the `\taxon{Theorem}` tree.
- Splitting "X" and "details of X" — if the details only make sense
  in X's context, they stay in X.
- Creating a tree whose body is a single sentence with no future.

**Under-atomization.**

- A tree titled with "and" or "vs" (almost always two concepts).
- A tree where the table of contents has 3+ sibling `\section`s on
  distinct named concepts. Each section probably wants to be a
  separate tree, transcluded from a notebook.
- A tree growing past ~60 lines of body without using `\section{}` to
  expose structure. Either split, or restructure as a small notebook
  of transcluded atoms.
- "Comparison" trees that try to cover both compared things in one
  place. Atomize each side, then write a contrast `\remark` (or a
  short comparison tree that transcludes both).

**Pseudo-atomization.**

- Splitting a single concept into "intro" + "details" + "examples"
  trees. That's not atomization, it's discourse fragmentation —
  Forester's `\section`, `\remark`, `\example` cards handle this
  inside one tree.
- Creating a parent + N children where the parent says nothing the
  children don't already say. If the parent has no synthesis, the
  children should just be transcluded from the notebook directly.

## Edge cases

**Comparisons.** Two concepts best understood by contrast (TCP vs
UDP, ROB vs Store Buffer, segmented vs hierarchical page tables): can have a comparison tree that links two atomic notes. The atomic notes focus on each concept alone. Then an additional comparison note that links both, so that the comparison can be found via backlinks.

**Theorems with proofs.** One tree. `\taxon{Theorem}` for the
statement, `\proof{...}` card inside for the proof. Do not split.

**Definitions with motivating examples.** One tree. Use
`\example{...}` card for the example. Split only if the example is
itself a named concept that other trees will want to link.

**Algorithms / protocols with variants.** Family pattern: parent
tree + one child per variant. The parent's job is to say what the
family is *for* and what the variants trade off against each other.

**Long historical/narrative passages.** These are blog posts, not
atoms. Keep them as a single `\tag{blog}` tree; atomize only the
technical concepts that appear inside if they don't already have
trees.

**Open questions / half-formed intuitions.** Do not atomize prose that
does not yet have a clear claim. Either leave it in the transient note,
or — if the question is one the graph genuinely raises and should carry
— give it its own tree with `scripts/new question <title>`
(`\taxon{Question}`, `\tag{question}`), which lands it on the
[[OUTSTANDING]] index. It graduates by being answered: rewrite it as
the resulting claim and drop the tag.

**Lecture notes.** If you see splits by lecture number or some other arbitrary ordering discard it and instead compose into conceptual parent notes and atoms.

## Process

When given a long-form note to atomize, follow this order:

1. **Read end-to-end** before writing anything down.
2. **List candidate atoms** with provisional titles. Apply the four
   atom criteria (stable name, single orienting sentence, composable,
   has more than a sentence).
3. **Apply the anti-pattern checks.** Is anything you listed actually
   a `\section`, `\remark`, or `\example` belonging inside another
   atom? Is any candidate a comparison that should be split into its
   two halves?
4. **Search for existing trees.** For each candidate:
   ```bash
   scripts/has "<concept>"        # ripgrep across trees
   scripts/hastags public note    # narrow by tag combination
   scripts/fb                     # fzf over every title, opens in nvim
   ```
   Classify each as:
   - **EXTEND** — a tree already covers this exact concept; the new
     prose adds depth, nuance, or a correction.
   - **NEW** — nothing covers it; the prose seeds a new atomic tree.
   - **DROP** — duplicates existing content with no new signal. Say so
     explicitly in the plan; never drop silently.
5. **Identify the parent notebook(s)** each new atom will be
   transcluded from. If no fitting notebook exists, that itself is a
   signal — either create one or transclude into an adjacent
   notebook's appropriate section.
6. **Present the plan** before writing:
   ```
   inbox/NWRG (GPU Register Scoreboard)
     ├─ NEW: "GPU register scoreboard" — \taxon{Definition},
     │       links [[Q2DT]], transcluded from N7GP
     ├─ EXTEND: 8C2H "CPU issue queue" — add CAM/wakeup-select,
     │       link the new scoreboard tree
     └─ DROP: the ILP/TLP paragraph — already in [[XXXX]]

   Stubs to create: Total Store Order, Store-to-load forwarding
   ```
   Wait for approval, redirection, or amendment. Do not write until the
   plan is acknowledged.

## Execute

### Extend an existing tree

Read the target end-to-end, then **rewrite, do not append.** Per
CLAUDE.md's Evolution principle: no "update" sections, no disclaimers,
no trailing addenda — the tree reads as a coherent whole reflecting the
current best understanding. Bump `\date{...}` if the change is
substantive.

### Create a new atom

```bash
scripts/new def <Title>     # or thm, prop, lemma, blog, potw, question
```

Writes `trees/evergreen/<id>.tree` with `\import{base-macros}`,
`\author`, `\title`, `\taxon`, and `\tag{public}` already in place.
Open with one orienting sentence in `\p{...}`, then port the prose. Use
`\section{...}{...}` only if the tree genuinely has sub-structure;
`\remark{...}` / `\example{...}` for asides that shouldn't clutter the
TOC. Add topical tags that an existing Datalog query relies on — reuse
before inventing.

### Weave the links

For every tree touched, sweep the prose: each named concept, theorem,
or pattern that has — or should have — a tree gets a link, inline,
where it is mentioned. `[[ID]]` renders the target's title; use
`[text](ID)` when the title doesn't fit the sentence. **Never
`[[ID|alias]]`.** Trailing "see also" lists are a smell.

For a concept with no tree yet, stub it *before* linking:

```bash
scripts/new stub <Concept Name>
```

`\tag{stub}` + `\tag{public}`, title only, no body — the concept name
ships to the site as a live link target, lands in `inbox.md` ranked by
inbound links, and is promoted **in place** later (write the body, drop
`\tag{stub}` and the `\stub` line, add a taxon). Never leave a dangling
`[[??]]`:

```bash
grep -rn '\[\[??' trees/
```

### Wire atoms into notebooks

An atom no tree transcludes is an orphan. Add `\transclude{<new-id>}`
under the right `\section{...}` of the notebook. For `\remark`-style
asides, hide them from the TOC:

```
\scope{
  \put\transclude/toc{false}
  \transclude{<new-id>}
}
```

Re-read the notebook immediately before editing — these get
restructured by hand between sessions, and the job is to fill the
section that is there, not re-impose an earlier layout.

### Retire the source

If the transient note's content is now fully distributed, delete it:

```bash
rm trees/inbox/<id>.tree
```

If some prose is still genuinely unformed (open questions, half-formed
intuitions), leave the note in place and strip only what was promoted —
a transient note should always reflect what is *still* transient.
`scripts/promote` does the mechanical half (flip `\tag{transient}` to
`\tag{public}`, move to `trees/evergreen/`) when the note is one atom
that just needs rewriting in place.

### Build and report

```bash
opam exec -- forester build forest.toml 2>&1 | tail -40
```

Then, terse and structured:

```
Atomized: inbox/NWRG, inbox/SKBY
Created:  <id1> "GPU register scoreboard", <id2> "Store buffer drain"
Extended: 8C2H, ABCD
Stubbed:  <id3> Total Store Order, <id4> Store-to-load forwarding
Notebooks: N7GP (+2), 0007 (+1)
Removed:  trees/inbox/NWRG.tree
```

Surface the judgment calls — a concept that could plausibly extend
either of two trees, a DROP you were unsure about.

## Quick checklist

Before promoting a candidate to its own tree, confirm:

- [ ] Title is 1-5 words, no "and" / "vs".
- [ ] A single `\p{...}` opener orients a reader.
- [ ] At least one other existing or planned tree will link to it.
- [ ] The body will be at least a paragraph, ideally several.
- [ ] It is not a proof of something, a canonical example of something,
      or a section of something that already has a tree.
- [ ] If splitting a comparison: each side passes the checklist on its
      own.
- [ ] It is transcluded from at least one notebook, and every concept it
      names is linked or stubbed.
