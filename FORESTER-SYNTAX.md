# Forester syntax and usage

A working reference for the markup language used in this forest, distilled from
the trees under `trees/`. Forester is an OCaml CLI that compiles a directory of
`.tree` files into a cross-linked static site. Every `.tree` is both a *node*
(addressable by its short ID, e.g. `N7GP`) and a *fragment* (transcludable into
another tree). The site is just the transitive closure of nodes reachable from
`forest.toml`'s `home = "index"` under the `public` tag.

The language looks like LaTeX (backslash commands, brace-delimited arguments,
optional bracket arguments) but the runtime is a structured tree
builder rather than a typesetter. There is no top-level "document" — every
construct produces or consumes a tree node.

---

## 1. File anatomy

Trees live under `trees/`. Their file name *is* their ID (`B1RI.tree` → node
`B1RI`); links resolve by ID, not by path, so the directory layout is purely
organizational (`public/`, `daily/`, `refs/`, `research/`, `todo/`, `fleet/`,
`weeknotes/`). New IDs are generated with `forester new --random`; the wrapper
script `scripts/new <template>` writes one under `trees/public/` and appends
the matching `templates/<template>.tree`.

A typical authored tree starts with a frontmatter block of single-line
directives, then a body:

```
\import{base-macros}
\date{2026-05-12T22:46:40Z}
\tag{public}
\title{Dennard scaling}

\p{The observation that as transistor dimensions shrink by a factor
#{\alpha} ...}
```

There is no required ordering, but the convention is: `\import` first,
then `\date`, `\author`, `\title`, `\taxon`, `\tag` lines, then the body.

### Frontmatter directives

| Directive | Purpose |
|---|---|
| `\title{...}` | Display title. Links can appear inside (e.g. `\title{Notebook: [[billingsleyProbabilityMeasure1995]]}`). |
| `\author{kellenkanarios}` | Sets the canonical author. Forester resolves it to the corresponding `kellenkanarios.tree`. |
| `\date{YYYY-MM-DD}` or full ISO 8601 | Publication / authoring date. |
| `\taxon{Definition}` | Sets the node's *taxon* (its categorical label — Definition / Theorem / Reference / Person / Institute / Remark / Example / Problem / Solution / Question / Answer / Proof / Claim). Renders as the leading classifier in the title bar. |
| `\tag{name}` | Attaches a tag for later filtering and Datalog queries. Common tags here: `public`, `private`, `blog`, `note`, `top`, `margin`, `potw`, `upcoming`, `todo`, `talk`, plus topical tags like `prob`, `action-perception`. |
| `\meta{key}{value}` | Free-form metadata. Used for `\meta{external}{URL}` on Person/Institute cards, `\meta{author}{false}` to suppress the author line, `\meta{bibtex}{...}` on reference cards. |
| `\import{base-macros}` | Pulls in macro definitions from another tree by ID. Almost every authored tree imports `base-macros`. |
| `\xmlns:html{http://www.w3.org/1999/xhtml}` | Declares an XML namespace so raw `\<html:...>` elements can be emitted. |
| `\put\transclude/<key>{value}` | Sets a default rendering option for transclusions *inside this tree* (see §6). |

Two tags carry behavioral meaning:

- `public` — opt the node into the published site. The home page's
  Datalog (in `008M.tree`) recursively collects everything reachable
  from any `public`-tagged tree.
- `private` — kept local (daily logs, fleet notes, todo lists).

Everything else is data for queries.

---

## 2. Body content

### Paragraphs and inline formatting

`\p{...}` opens a paragraph. Plain text between commands is rendered as-is. Common inline marks:

| Markup | Output |
|---|---|
| `\strong{bold}` | bold |
| `\em{italic}` | italic |
| `\code{inline code}` | monospace |
| `\mark{highlight}` | yellow highlight (custom macro wrapping `<mark>`) |
| `[text](ID)` | link to another tree by ID, with custom link text |
| `[[ID]]` | wiki-style link; renders the target's title |
| `[external text](https://...)` | external URL link (same syntax as ID links — Forester picks based on the target) |

**Important link syntax constraint (project convention):** never write
`[[ID|alias]]`. Use `[text](ID)` for aliased links and `[[ID]]` for plain
title-rendered links. The two forms are equivalent except that `[[ID]]`
auto-uses the target's `\title`.

### Special-character escapes

Some characters need to be escaped because they have semantic meaning:

- `\#` — literal `#` (since `#{...}` is inline math)
- `\%` — literal `%` (since `%` starts a comment in some positions)
- `\<html:...>` — raw HTML element (see §10)

`base-macros.tree` also defines `\lsquare`, `\rsquare`, `\lparen`, `\rparen`
for `[`, `]`, `(`, `)` when they would otherwise be parsed as argument
delimiters.

### Lists

```
\ul{
  \li{First bullet}
  \li{Second bullet}
}

\ol{
  \li{First numbered item}
  \li{Second numbered item}
}
```

Lists nest. List items can contain anything — paragraphs, math, code blocks,
sub-lists, transclusions.

### Verbatim / code blocks

```
\pre\verb<<<|
acquire(lock_ptr):
  while (true):
    test_and_set(old, lock_ptr)
    ...
<<<
```

`\verb<<<|...<<<` is a custom verbatim delimiter (so the body can contain
arbitrary backslashes, braces, etc.) — `<<<|` opens, `<<<` closes. `\pre`
wraps the result in a `<pre>` block. For very short verbatim snippets,
`\startverb...\stopverb` is the lower-level form.

### Horizontal rule

`\hr` — emits `<hr>` via the `base-macros` definition.

---

## 3. Math

Forester delegates math to KaTeX-style rendering, with two notations:

- **Inline math:** `#{...}` — e.g. `#{P = C V^2 f}`.
- **Display math:** `##{...}` — sets the body on its own line. Equivalent
  to `\[ ... \]` in LaTeX.

Inside math you write standard LaTeX (`\frac`, `\sum`, `\mathbf`, `\mathcal`,
`\sigma`, `\to`, etc.). The full LaTeX preamble is loaded via
`\import{latex-preamble}` from `base-macros.tree`.

Notable convention: math freely mixes with prose. A definition like

```
\p{A \em{field} is a set #{F} with operations #{+}, #{\cdot}.}
```

is normal. For multi-line derivations use `##{...}` between paragraphs.

To compile a longer LaTeX snippet (with the preamble), `\latex{...}` wraps it.

---

## 4. Sections and subtrees

A *subtree* is a nested tree node anchored inside the parent. `base-macros`
provides three closely related forms:

```
\subtree{ \title{...} ...body... }       % low-level
\subtree[id]{ ... }                       % low-level, explicit ID

\section{Title}{ ...body... }             % macro: titled subtree
\block{Title}{ ...body... }               % similar, used inside trees that
                                          % already have section structure
```

`\section` and `\block` are just convenience wrappers around `\subtree` that
set `\title{...}` for you. They produce a nested node with its own number,
table-of-contents entry, and stable URL.

### Taxon-flavored subtrees

The author rarely calls `\subtree` directly. Instead, `base-macros` defines a
family of "card" macros that produce a subtree with a fixed taxon and the
usual TOC/numbering tweaks:

| Macro | Taxon emitted |
|---|---|
| `\remark{body}` | Remark (excluded from TOC) |
| `\example{body}` | Example |
| `\claim{body}` | Claim |
| `\question{body}` | Question |
| `\answer{body}` | Answer |
| `\problem{body}` | Problem |
| `\solution{body}` | Solution |
| `\proof{body}` | Proof |
| `\note{name}{body}` | Plain titled note (no taxon) |
| `\card{taxon}{name}{body}` | Generic — `\card{Lemma}{...}{...}` |

Each wraps the body in `\scope{ \put\transclude/toc{false} \subtree{...} }`
so the auxiliary card doesn't clutter the TOC of the parent. Useful when you
want a labeled aside without inflating outline depth.

---

## 5. Tree taxonomies in this forest

The `\taxon{...}` of a tree determines its categorical label *and* its
default rendering. Conventions observed in this repo:

| Taxon | Templates / examples |
|---|---|
| (none — blog / notebook) | `templates/blog.tree`; top-level pages like `0002.tree` |
| `Definition` | `templates/def.tree`; e.g. `B1RI` (Inner Product) |
| `Theorem` | `templates/thm.tree`; e.g. `000S` (Additivity of Intervals) |
| `proposition` | `templates/prop.tree` |
| `Reference` | auto-generated by `scripts/split_bib` into `trees/refs/<key>.tree` |
| `Person` | `trees/public/people/*.tree` |
| `Institute` | `trees/public/institutions/*.tree` |
| Remark / Example / Problem / Solution / Question / Answer / Proof / Claim | inline via `\remark{}` etc. |

Person and institute cards are tiny:

```
\tag{public}
\title{Lei Ying}
\taxon{Person}
\meta{external}{https://leiying.engin.umich.edu/}
\meta{institution}{[[umich]]}
\meta{position}{Professor}
```

That's enough for `[[leiying]]` to render a working link with hover preview.

---

## 6. Transclusion

`\transclude{ID}` embeds another tree *inline* at that point. The target's
title, taxon, numbering, and body are spliced in; this is the core
composition mechanism.

Transclusions inherit display options that can be configured per-call or
per-tree via `\put\transclude/<key>{value}`:

| Key | Effect |
|---|---|
| `\transclude/toc{true|false}` | Include the transcluded subtree in the parent's TOC. |
| `\transclude/numbered{true|false}` | Auto-number the transclusion. |
| `\transclude/expanded{true|false}` | Render expanded vs. collapsed by default. |
| `\transclude/metadata{true|false}` | Show authors, date, etc. on the transcluded block. |
| `\transclude/title{true|false}` | Show or hide the transcluded title. |

To scope option changes to a single transclusion (the most common pattern):

```
\scope{
  \put\transclude/toc{false}
  \put\transclude/numbered{false}
  \transclude{000N}
}
```

`\scope{...}` is a local environment — the `\put` only applies inside it.

### Composition patterns observed in this forest

- **Notebook page**: a `\tag{note}`-tagged `\tag{top}` tree like `N7GP`
  (Computer Architecture) is mostly a sequence of `\section{...}{...}`
  blocks, each containing `\transclude{...}` calls to atomized concept
  trees plus thin connective prose.
- **Notebook for a textbook**: e.g. `0007` for Billingsley's *Probability
  and Measure* — same structure, but transcluded children are
  taxon'd `Theorem` / `Definition`.
- **Index page**: `0002.tree` (Blog), `005G.tree` (Research Bible),
  `007L.tree` (Marginalia) — set `\put\transclude/expanded{false}` then
  either hand-list `\transclude{...}`s or use a Datalog query.
- **Daily logs**: `trees/daily/daily.tree` is a flat list of `\transclude`
  calls, one per day file.

---

## 7. References, citations, and the bibliography pipeline

The bibliography is sourced from `tex/refs.bib`. Running

```
scripts/split_bib
```

shells out to `pandoc` (must be installed), produces CSL-JSON, and writes
one tree per citekey under `trees/refs/<citekey>.tree`. Each generated file
has a JSON-array first line indicating which bib files it came from
(`% ["refs"]`), `\taxon{Reference}`, the canonical title, author/literal
entries, and the original BibTeX embedded via `\meta{bibtex}{\startverb ... \stopverb}`.

**Do not hand-edit `trees/refs/`** unless you change the first line to
contain `"manual"` — `split_bib` overwrites everything else.

### Citing in prose

`base-macros` defines:

- `\citek{citekey}` — inline citation link, rendering `[citekey]` styled
  as a reference. (Note: `base-macros` redefines `\citek` lower in the
  file with the simpler form; both produce a link.)
- `\citet{tid}{citekey}` — citation link with a tree-page anchor (used for
  "see [citekey, Theorem 3.2]" pointers).
- `\refnote{name}{citekey}{body}` — a titled note whose title carries an
  inline `\citek` link.
- `\refcard{taxon}{name}{citekey}{body}` — a subtree (card) with the given
  taxon, title with citation, and body. Useful for exercise solutions
  scoped to a specific reference.
- `\refcardt{taxon}{name}{tid}{citekey}{body}` — same, with a tree-page
  anchor; the canonical form used for `\refcardt{Exercise}{}{3.2}{...}`.

---

## 8. Macros and custom commands

`\def\name[arg1][arg2]{body}` defines a macro. The arguments are referenced
inside the body as `\arg1`, `\arg2`, ...; tokens like `\<html:span>` inside
the body produce raw HTML. Example from `base-macros.tree`:

```
\def\colblock[body]{
  \<html:div>[class]{jms-indent-block}[style]{
    margin-left: 1em;
    margin-bottom: 1em;
    border-left: 4px solid black;
    padding-left: 12px;
    background-color: whitesmoke;
    }{\body}
}
```

`\colblock{...}` then wraps its argument in that styled `<div>`.

Other useful macros from `base-macros.tree`:

- `\iblock{body}` — like `\colblock` but tagged `jms-indent-block`; used
  for highlighted callouts (e.g. daily Marcus Aurelius excerpts).
- `\irow{body}` — minimum-height row inside an `\iblock`.
- `\collapsed{title}{body}` — a subtree with TOC and expanded both off
  (a fold-out section).
- `\embed{src}` — `<embed>` an external HTML page.
- `\md{body}`, `\mdblock{title}{body}` — wrap body in a div the
  client-side markdown-it renderer will process (used for content
  imported as Markdown).
- `\table{...}`, `\tr{...}`, `\td{...}`, `\th{...}` — short aliases for
  HTML table elements.
- `\closed-open{x}` / `\open-closed{x}` — interval notation `[x)` / `(x]`,
  defined in terms of the literal-bracket escapes.
- `\nowrap{body}` — wraps in `<span style="white-space: nowrap">`.
- `\tdtask{id}{body}` / `\tdtaskx{id}{body}` — list-item task / struck-through
  done task, used in daily todo sections.

To define new project-wide macros, edit `trees/public/base-macros.tree`.
Every authored tree imports it, so the new macro is immediately
available everywhere.

---

## 9. Figures, assets, and HTML escape hatch

Figures use `\figure{...}` (defined via raw HTML) plus `\<html:img>`:

```
\figure{
\<html:img>[width]{100\%}[src]{\route-asset{assets/img/mesi-protocol.png}}{}
\figcaption{MESI state machine.}
}
```

- `\route-asset{path}` resolves a path under `assets/` to a published URL.
  Assets live in `assets/` (declared in `forest.toml`).
- The figure caption is `\figcaption{...}` (note: not always emitted — many
  figures in this forest skip it).
- `\<html:tag>[attr]{value}...{body}` is the raw-HTML syntax: attribute
  pairs as `[name]{value}` repeated, then the element body as the final
  `{...}`.
- `\%` is the literal-percent escape (so `100\%` becomes `width: 100%`).

For things Forester has no macro for, drop into raw HTML this way — the
home page uses raw `<figure>`, `<img>`, `<figcaption>`, `<a>` for the
profile-photo block; comment threads on blog posts are loaded with a raw
`\<html:script>` tag pointing at utterances.es.

---

## 10. Datalog queries

Forester ships with a small Datalog engine for querying the forest graph.
`\query\datalog{...}` renders inline as a list of the tree IDs that
satisfy the query; `\execute\datalog{...}` registers a derivation rule
without rendering it (used in `008M.tree` to define the
`public-trees` relation).

Built-in relations include:

| Relation | Meaning |
|---|---|
| `\rel/has-tag ?X '{tagname}` | `?X` has tag `tagname` |
| `\rel/has-author ?X @{authorid}` | `?X` is authored by `authorid` |
| `\rel/is-reference ?X` | `?X` has `\taxon{Reference}` |
| `\rel/links-to ?X ?Y` | `?X` contains a link to `?Y` |
| `\rel/transcludes/transitive-closure ?X ?Y` | `?X` transitively transcludes `?Y` |
| `\rel/transcludes/reflexive-transitive-closure ?X ?Y` | as above, including `?X = ?Y` |

Quote constants with `'{...}`, author IDs with `@{...}`. Conjunction is
implicit (multiple lines = AND).

A typical user query:

```
\query\datalog{
  ?X -:
  {\rel/has-tag ?X '{blog}}
  {\rel/has-tag ?X '{upcoming}}
}
```

This renders a live list of all upcoming blog posts. Index pages
(`0002.tree`, `005G.tree`, `007L.tree`, `0015.tree`) lean heavily on
this — content is added simply by tagging a new tree with the right tag.

Custom relations are declared with `\def\rel/...{namespace.path}` and
populated with `\execute\datalog{ \rel/... ?X -: ... }`. The canonical
example is `008M.tree`, which defines `public-trees`, `public-refs`, and
`public` and then exports the whole set as JSON via
`\syndicate-query-as-json-blob{...}{...}`.

---

## 11. Syndication

Two builtins emit files alongside the per-tree HTML/XML:

- `\syndicate-current-tree-as-atom-feed` — emit an Atom feed for the
  current tree. Used by `0002.tree` (Blog) to expose
  `/0002/atom.xml`.
- `\syndicate-query-as-json-blob{name}{\datalog{...}}` — write the result
  of a query to `output/<name>.json`. `008M.tree` uses this to publish
  the set of public trees.

---

## 12. Templates

`templates/` holds skeleton bodies copied by `scripts/new <template>`:

| Template | Frontmatter it adds (after `\tag{public}`) | Body |
|---|---|---|
| `blog.tree` | `\author`, `\import`, `\tag{blog}`, `\tag{upcoming}` | trailing `\hr` + utterances comment script |
| `def.tree` | `\import`, `\taxon{Definition}` | empty |
| `prop.tree` | `\import`, `\taxon{proposition}` | empty |
| `thm.tree` | `\import`, `\taxon{Theorem}` | empty |
| `lemma.tree` | (single-line) | empty |
| `potw.tree` | `\import`, `\tag{potw}`, `\tag{public}` | TLDR/Contributions/Limitations sections |
| `daily.tree` | `\import`, `\author`, `\meta{author}{false}`, `\tag{private}` | Todos / Progress / Learn / Notebook sections |
| `todo.tree` | `\import`, `\author`, `\tag{todo}` | empty |

`scripts/new` runs `forester new --random --dest=...`, then appends
`\tag{public}` and the chosen template body. So the resulting tree has a
random 4-char ID under `trees/public/`, with all the right boilerplate.

---

## 13. Authoring patterns specific to this forest

These conventions emerge from `CLAUDE.md` and the existing trees:

- **Atomization.** Concept-level ideas get their own tree (e.g. `30XT`
  MESI, `8C2H` Snoop-based coherence). A "notebook" tree like `N7GP`
  is mostly `\section{...}{ \transclude{ID} ... }` blocks. Avoid
  packing multiple distinct concepts into one tree — split and transclude.
- **Active prose linking.** When you mention another concept, link it.
  `[[Q2DT]]` (Locks) inline in a sentence is preferred to a trailing
  "see also." Forester renders hover-previews automatically.
- **TOC discipline.** Anything that doesn't deserve its own outline entry
  (asides, remarks, proofs in the middle of a discussion) should be a
  `\remark{...}`-style card. They use `\put\transclude/toc{false}` and
  fall out of the TOC.
- **Daily / fleeting notes are private.** `templates/daily.tree` is
  `\tag{private}`. Fleet notes (`trees/fleet/*.tree`) are also private.
  These don't appear on the published site.
- **References are not hand-written.** Add the entry to `tex/refs.bib` and
  re-run `scripts/split_bib`. If you need bespoke commentary on a
  reference, write a separate `\refnote` or `\refcard` in another tree
  rather than editing the auto-generated card.

---

## 14. Build, preview, and tooling

The repo's `forest.toml` is the entry point:

```
[forest]
trees  = ["/home/kellen/Projects/forest/trees"]
assets = ["assets"]
home   = "index"
url    = "https://kellenkanarios.com/"
```

Common commands (all assume the `opam` switch `forester` is active, and
`$FORESTDIR` points at the repo root):

```bash
opam exec -- forester build forest.toml -vv   # one-shot build → output/
scripts/mkprivate                              # same, via wrapper
scripts/fserve                                 # tmux + entr + http.server on :1234
scripts/qthome                                 # open home page in qutebrowser
scripts/new blog                               # new public blog post from template
scripts/fb                                     # fzf over trees by title → nvim
scripts/has "query"                            # ripgrep across trees
scripts/hastags public blog                    # trees having ALL listed tags
scripts/split_bib                              # refs.bib → trees/refs/*.tree
scripts/fize path/to/file.tree                 # convert LaTeX snippets to Forester
weekly/init_weekly                             # pull metrics → trees/weeknotes/
```

`output/` is gitignored. The `theme/` directory is a git submodule
(`kkanarios32/forester-base-theme`) holding XSL/CSS — clone the repo with
`--recurse-submodules`, and only touch `theme/` if you actually need a
theme change (most page-level tweaks belong in `base-macros.tree`).

---

## 15. Quick reference card

| Want to... | Write... |
|---|---|
| New tree, taxon'd as Definition | `scripts/new def` |
| New blog post | `scripts/new blog` |
| Link to another tree (use its title) | `[[ID]]` |
| Link to another tree (custom text) | `[text](ID)` |
| External link | `[label](https://...)` |
| Inline math | `#{x^2 + y^2}` |
| Display math | `##{...}` |
| Bold / italic / code | `\strong{}` / `\em{}` / `\code{}` |
| Bullet / numbered list | `\ul{ \li{...} }` / `\ol{ \li{...} }` |
| Verbatim block | `\pre\verb<<<|  ...  <<<` |
| Image | `\<html:img>[src]{\route-asset{assets/img/foo.png}}{}` |
| Section | `\section{Title}{ body }` |
| Aside / remark | `\remark{...}` |
| Embed another tree | `\transclude{ID}` |
| Hide transclusion from TOC | wrap in `\scope{ \put\transclude/toc{false} \transclude{ID} }` |
| Cite a paper | `\citek{citekey}` |
| Query all `tag` trees | `\query\datalog{ ?X -: {\rel/has-tag ?X '{tag}} }` |
| Add a macro globally | edit `trees/public/base-macros.tree` |
