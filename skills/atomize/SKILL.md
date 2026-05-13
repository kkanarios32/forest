---
name: atomize
description: Decide how to split a long-form note into atomic concept trees for the forest. Use when ingesting a fleet note, processing a paper, or refactoring an existing tree that has grown to cover multiple concepts. Provides rules, heuristics, anti-patterns, and worked examples for identifying the right atom boundary.
---

# Atomize: break notes into concept trees

## Guiding principles

**The main workflow we are trying to achieve with atomization is to build long-form notes strictly via transcluding atomic increments. Namely, if we ever want to look up a specific concept it must have an associated note. However, we also want centralized notes to accumulate related information for ease of studying.**

**Parent notes should aggressively link / transclude atomic notes so that we can follow backlinks from the atomic notes to their place in a larger context**

**An atomic note MUST make sense on its own**

The forest's organizing principle is that every named concept lives in
its own tree, and composition happens via `\transclude` and `[[ID]]`
links. Atomization is the act of finding those concept boundaries
inside long-form prose (a fleet note, a paper summary, an oversized
existing tree) and splitting accordingly.

Read this before the `atomize` step of any ingest, or whenever an
existing tree starts feeling crowded. Pair with `CLAUDE.md` for syntax
and conventions.

## What an atom is

A concept is the right granularity for its own tree when **all** of
these hold:

1. **It has a stable name.** The concept can be titled in 1-5 words
   (`MESI protocol`, `Store buffer drain`, `Borel's Normal Number
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
   (`\tag{todo}`) and an over-atomization at worst. If you cannot
   imagine ever writing a second paragraph, fold it into the parent.

## Heuristics for spotting atom boundaries

**The "and" / "vs" test.** A title containing a conjunction is the
strongest signal of an under-atomized note. Examples:

- "ROB vs. Store Buffer" → split into `Reorder buffer (ROB)`,
  `Store buffer`. Can keep ROB vs. Store buffer as a parent note that references the two notes.
- "LRU and Clock Algorithms" -> should be split into LRU and Clock algorithm, where the Clock algorithm can reference LRU.
- "Segmented Page Tables" → reads single but the body covers both
  segmented page tables *and* hierarchical/multi-level page tables.
  Two atoms.

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
fleet notes follow this shape for a *single* concept:

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
more existing public trees, it deserves its own tree (so those
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

**Open questions / half-formed intuitions.** Leave in the fleet note,
or promote to a `\tag{todo}` stub with the question as the
`\title{...}` and the intuition in the body. Do not atomize prose
that does not yet have a clear claim.

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
4. **Search for existing trees** with `scripts/has "<concept>"` for
   each candidate. Classify EXTEND vs NEW.
5. **Identify the parent notebook(s)** each new atom will be
   transcluded from. If no fitting notebook exists, that itself is a
   signal — either create one or transclude into an adjacent
   notebook's appropriate section.
6. **Present the plan** before writing (see the `ingest` skill's
   step 4 for the format).

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
