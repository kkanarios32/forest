/* Step-through figure for autoregressive decoding with and without a KV cache.
 *
 * Mounts into every <div class="kv-fig"> on the page and builds its own markup,
 * so a tree carrying the figure only has to emit the empty div — see TJLA, which
 * pairs it with the <script> tag. The same two constraints as the ring
 * reduce-scatter and MXU figures shape how this is written:
 *
 *   1. Forester embeds a tree's whole content into anything that transcludes or
 *      hover-previews it, so the figure can appear several times on one page.
 *      Nothing here may use a document-unique id, and the script may itself be
 *      loaded more than once — mounting is guarded and idempotent.
 *
 *   2. forester.js builds hover previews by cloning nodes already in the DOM,
 *      and a clone carries markup but not event listeners or timers. So the
 *      whole visual state is a pure function of four data attributes on the
 *      root — token, phase, playing, cache-on — driven by one delegated click
 *      listener and one document-wide interval that sweeps whichever roots are
 *      currently playing. A cloned figure is live for free.
 *
 * It does not autoplay. The source figure did, but a page here can hold several
 * copies and a hover preview can raise another, and four animations running
 * under the reader's cursor is noise rather than explanation. Press Play.
 *
 * Colors are the site palette from trees/evergreen/base-macros.tree, which is
 * the source of truth: \cal-example for what the cache already holds (paid for,
 * settled), \cal-question for what this step recomputes, \cal-neutral-rule for
 * the resting hairline. Restated here as literals for the same reason
 * theme/style.css restates them — neither file can see the macros.
 */
(function () {
  var WORDS = ['the', 'cat', 'sat', 'on', 'the', 'mat', 'and', 'purred'];
  var N = WORDS.length;         // sequence length
  var D = 6;                    // head dimension, drawn not computed
  var TICK = 750;               // ms per phase when playing

  /* Phases within token t, where `last` is the settle frame:
   *   0            the token arrives
   *   1            project it into k and v
   *   2            project the query
   *   3 .. 3+t     score sweep, one dot product per key
   *   4+t          the weighted sum over V
   *   5+t          settle — kept, or thrown away
   * so a token costs 6 + t frames, and the sweep is the term that grows. */
  function lastPhase(t) { return 5 + t; }

  var CSS = [
    '.kv-fig{margin:1.6em 0;--kv-cell:15px;--kv-gap:2px}',
    '.kv-fig-rule{width:7.8em;height:1px;background-color:rgb(219,216,215);margin-bottom:1.1em}',
    '.kv-fig-label{font-family:var(--sans);font-size:.71em;font-weight:500;letter-spacing:.09em;text-transform:uppercase;color:rgb(109,103,101);margin:0 0 .9em}',
    '.kv-fig-step{font-style:italic;letter-spacing:0;text-transform:none;color:rgb(109,103,101)}',
    /* The token strip is the input, so it sits above the rule that separates
       input from the arithmetic done on it. */
    '.kv-fig-toks{display:flex;flex-wrap:wrap;gap:.3em;padding-bottom:.9em;border-bottom:1px solid rgb(219,216,215);margin-bottom:1.1em}',
    '.kv-fig-tok{font-family:var(--sans);font-size:.72em;padding:.1em .45em;border:1px solid rgb(219,216,215);border-radius:2px;color:rgb(109,103,101);transition:color 160ms ease,border-color 160ms ease,background-color 160ms ease}',
    '.kv-fig-tok.is-seen{color:rgb(38,97,69);border-color:rgb(38,97,69)}',
    '.kv-fig-tok.is-now{color:#f6f4ee;background-color:rgb(115,73,35);border-color:rgb(115,73,35)}',
    /* Two stages, each an operand-operator-operand-equals-result row. They wrap
       on a narrow screen rather than scroll: unlike the ring grid there is no
       text inside a cell to crush, so a wrapped row still reads. */
    '.kv-fig-stage{display:flex;align-items:flex-end;flex-wrap:wrap;gap:.8em;margin-bottom:1.1em}',
    '.kv-fig-blk{display:flex;flex-direction:column;gap:.35em}',
    '.kv-fig-name{font-style:italic;font-size:.86em;white-space:nowrap;line-height:1.2}',
    '.kv-fig-name small{font-family:var(--sans);font-style:normal;font-size:.62em;letter-spacing:.08em;text-transform:uppercase;color:rgb(109,103,101);margin-left:.35em}',
    '.kv-fig-grid{display:grid;gap:var(--kv-gap)}',
    '.kv-fig-op{font-size:1em;color:rgb(109,103,101);padding-bottom:calc(var(--kv-cell) * 1.1)}',
    /* A cell is a graphic, not type, so it is sized in px: at 15px it reads at
       any body size the clamp() produces, and an em would drift the grid. */
    '.kv-fig-c{width:var(--kv-cell);height:var(--kv-cell);background-color:transparent;box-shadow:inset 0 0 0 1px rgb(219,216,215);transition:background-color 160ms linear,box-shadow 160ms linear}',
    '.kv-fig-c.is-held{background-color:rgb(236,247,240);box-shadow:inset 0 0 0 1px rgb(38,97,69)}',
    '.kv-fig-c.is-new{background-color:rgb(115,73,35);box-shadow:inset 0 0 0 1px rgb(115,73,35)}',
    '.kv-fig-c.is-read{box-shadow:inset 0 0 0 2px rgb(38,97,69)}',
    '.kv-fig-say{border-left:2px solid rgb(219,216,215);padding:.1em 0 .1em .9em;margin:0 0 1.2em;min-height:3.2em;font-size:.96em}',
    '.kv-fig-out{display:flex;flex-wrap:wrap;gap:1.6em;padding-top:.9em;border-top:1px solid rgb(219,216,215);margin-bottom:1.1em;font-family:var(--sans)}',
    '.kv-fig-dt{font-size:.62em;letter-spacing:.1em;text-transform:uppercase;color:rgb(109,103,101);margin-bottom:.2em}',
    '.kv-fig-dd{font-size:1.02em;font-variant-numeric:tabular-nums}',
    '.kv-fig-bar{display:flex;align-items:center;gap:.7em;flex-wrap:wrap;margin:1.2em 0 0}',
    /* Outline at rest, fill on hover — the same weight as the subscribe button,
       and the same repair: a control does not inherit typography, so the font
       has to be restated or the browser supplies its own UI face. */
    '.kv-fig-btn{padding:.4em .9em;border:1px solid rgb(51,64,90);border-radius:3px;background-color:transparent;color:rgb(51,64,90);font-family:var(--sans);font-size:.82em;line-height:1.35;cursor:pointer;transition:background-color 120ms ease,color 120ms ease}',
    '.kv-fig-btn:hover{background-color:rgb(51,64,90);color:#f6f4ee}',
    '.kv-fig-btn[aria-pressed="false"]{border-color:rgb(109,103,101);color:rgb(109,103,101)}',
    '.kv-fig-btn[aria-pressed="false"]:hover{background-color:rgb(109,103,101);color:#f6f4ee}',
    '.kv-fig-key{display:flex;flex-wrap:wrap;gap:1.1em;margin:.9em 0 0;font-family:var(--sans);font-size:.72em;color:rgb(109,103,101)}',
    '.kv-fig-sw{display:inline-block;width:.62em;height:.62em;border-radius:2px;border:1px solid;margin-right:.35em}',
    '.kv-fig-sw.is-held{border-color:rgb(38,97,69);background-color:rgb(236,247,240)}',
    '.kv-fig-sw.is-new{border-color:rgb(115,73,35);background-color:rgb(115,73,35)}',
    '@media (prefers-reduced-motion: reduce){.kv-fig-c,.kv-fig-tok{transition:none}}',
    '@media (max-width: 34em){.kv-fig{--kv-cell:11px}.kv-fig-op{padding-bottom:calc(var(--kv-cell) * .8)}}'
  ].join('\n');

  /* ---- the state, derived ------------------------------------------------
   * Everything below is a pure function of (t, phase, cache). Nothing
   * accumulates, which is what lets a clone with no history render correctly
   * and lets the cache toggle repaint without replaying the sequence. */

  /* Class for the K column / V row belonging to token j. */
  function kvClass(t, phase, cache, j) {
    if (j > t) return '';
    if (phase === 0) return (cache && j < t) ? 'is-held' : '';
    if (cache) {
      if (j < t) return 'is-held';
      return phase >= lastPhase(t) ? 'is-held' : 'is-new';
    }
    /* No cache: the whole prefix is rebuilt every step and then discarded. */
    return phase >= lastPhase(t) ? '' : 'is-new';
  }

  /* Scores and attention weights fill in left to right as the sweep runs. */
  function scoreClass(t, phase, j) {
    if (j > t || phase < 3) return '';
    if (phase >= lastPhase(t)) return 'is-held';
    return j <= phase - 3 ? 'is-new' : '';
  }

  /* The key currently being dotted against q. */
  function isRead(t, phase, j) {
    return phase >= 3 && phase <= 3 + t && j === phase - 3;
  }

  /* k/v pairs projected from the first token through now. With a cache that is
     one per token; without one it is the triangular number, which is the whole
     argument in a single expression. */
  function totalAt(t, phase, cache) {
    var done = phase >= 1 ? t + 1 : t;
    return cache ? done : done * (done + 1) / 2;
  }

  function ordinal(n) { return n === 1 ? '1 step' : n + ' steps'; }

  function say(t, phase, cache) {
    var last = lastPhase(t);
    if (phase === 0) {
      return 'Token <b>' + (t + 1) + '</b> arrives: <b>' + WORDS[t] + '</b>.';
    }
    if (phase === 1) {
      return cache
        ? 'One projection — <b>k<sub>t</sub></b> and <b>v<sub>t</sub></b>, appended to the cache. Everything to the left is already sitting there and does not depend on anything that has happened since.'
        : 'No cache, so every key and value in the prefix is rebuilt from the tokens: <b>' + (t + 1) + '</b> projections to admit one new token.';
    }
    if (phase === 2) {
      return 'Only the newest position needs a query. <b>q<sub>t</sub></b> is a single row either way — which is why decoding is a matrix–vector product and not a matmul.';
    }
    if (phase <= 3 + t) {
      var i = phase - 3;
      var age = t - i;
      return 'Attending to position <b>' + (i + 1) + '</b> — one dot product against a key that ' +
        (cache && age > 0
          ? 'was computed <b>' + ordinal(age) + '</b> ago and has not been touched since.'
          : 'was built a moment ago.');
    }
    if (phase === 4 + t) {
      return 'The weighted sum over <b>V</b> gives <b>o<sub>t</sub></b> — one row of output for one token of work.';
    }
    if (t === N - 1) {
      return cache
        ? 'Done: <b>' + N + '</b> tokens, <b>' + N + '</b> projections. Work per token is flat and the sequence length shows up only as memory, which grows by one k/v pair a step.'
        : 'Done: <b>' + N + '</b> tokens, <b>' + (N * (N + 1) / 2) + '</b> projections — the triangular number. Turn the cache on and the same sequence costs <b>' + N + '</b>.';
    }
    return cache
      ? '<b>k<sub>t</sub></b> and <b>v<sub>t</sub></b> stay resident. Nothing about them will change, so nothing about them is recomputed.'
      : 'Nothing is kept, so the next token pays for the whole prefix again. Work per token grows with the sequence rather than staying flat.';
  }

  /* createElementNS, not createElement, and setAttribute('class') below rather
     than .className. The site ships XML with an <?xml-stylesheet?> and the
     browser applies theme/*.xsl on the client, so this code cannot assume it is
     running against an HTML document — in an XML one, createElement produces a
     null-namespace element that is not a stylesheet at all, and .className is
     not defined. The namespaced calls are correct in both. */
  var XHTML = 'http://www.w3.org/1999/xhtml';

  function ensureStyle() {
    if (document.querySelector('style[data-kv-fig]')) return;
    var el = document.createElementNS(XHTML, 'style');
    el.setAttribute('data-kv-fig', '');
    el.textContent = CSS;
    var head = document.head || document.getElementsByTagName('head')[0] || document.documentElement;
    head.appendChild(el);
  }

  /* rows x cols of cells, tagged by the token index each one belongs to: down
     the rows for V, across the columns for K. */
  function grid(kind, rows, cols, cols_are_tokens) {
    var html = '<div class="kv-fig-grid" style="grid-template-columns:repeat(' +
      cols + ',var(--kv-cell))">';
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        html += '<div class="kv-fig-c" data-kv-c="' + kind + '-' +
          (cols_are_tokens ? c : r) + '-' + (cols_are_tokens ? r : c) + '"></div>';
      }
    }
    return html + '</div>';
  }

  function blk(name, note, body) {
    return '<div class="kv-fig-blk"><span class="kv-fig-name">' + name +
      (note ? '<small>' + note + '</small>' : '') + '</span>' + body + '</div>';
  }

  function stat(label, key) {
    return '<div><div class="kv-fig-dt">' + label +
      '</div><div class="kv-fig-dd" data-kv-stat="' + key + '"></div></div>';
  }

  function markup() {
    var toks = '<div class="kv-fig-toks">';
    for (var j = 0; j < N; j++) {
      toks += '<span class="kv-fig-tok" data-kv-tok="' + j + '">' + WORDS[j] + '</span>';
    }
    toks += '</div>';

    return '<div class="kv-fig-rule"></div>' +
      '<p class="kv-fig-label">KV cache during decoding · <span class="kv-fig-step"></span></p>' +
      toks +
      '<div class="kv-fig-stage">' +
        blk('q<sub>t</sub>', '', grid('q', 1, D, true)) +
        '<span class="kv-fig-op">×</span>' +
        blk('K<sup>⊤</sup>', 'keys', grid('k', D, N, true)) +
        '<span class="kv-fig-op">=</span>' +
        blk('s<sub>t</sub>', 'scores', grid('s', 1, N, true)) +
      '</div>' +
      '<div class="kv-fig-stage">' +
        blk('softmax(s<sub>t</sub>)', '', grid('w', 1, N, true)) +
        '<span class="kv-fig-op">×</span>' +
        blk('V', 'values', grid('v', N, D, false)) +
        '<span class="kv-fig-op">=</span>' +
        blk('o<sub>t</sub>', 'output', grid('o', 1, D, true)) +
      '</div>' +
      '<div class="kv-fig-out">' +
        stat('step', 'step') +
        stat('k/v pairs built this step', 'now') +
        stat('k/v pairs built so far', 'tot') +
      '</div>' +
      '<div class="kv-fig-say"></div>' +
      '<div class="kv-fig-bar">' +
        '<button type="button" class="kv-fig-btn" data-kv-act="play"></button>' +
        '<button type="button" class="kv-fig-btn" data-kv-act="step">Step</button>' +
        '<button type="button" class="kv-fig-btn" data-kv-act="reset">Restart</button>' +
        '<button type="button" class="kv-fig-btn" data-kv-act="cache" aria-pressed="true"></button>' +
      '</div>' +
      '<div class="kv-fig-key">' +
        '<span><span class="kv-fig-sw is-held"></span>held in cache</span>' +
        '<span><span class="kv-fig-sw is-new"></span>computed this step</span>' +
      '</div>';
  }

  function num(root, attr, fallback) {
    var v = parseInt(root.getAttribute(attr), 10);
    return isNaN(v) ? fallback : v;
  }

  function paint(root, sel, cls) {
    var el = root.querySelector(sel);
    if (el) el.setAttribute('class', 'kv-fig-c' + (cls ? ' ' + cls : ''));
  }

  function render(root) {
    var t = num(root, 'data-kv-t', 0);
    var phase = num(root, 'data-kv-phase', 0);
    var cache = root.getAttribute('data-kv-cache') !== '0';
    var last = lastPhase(t);
    if (t < 0 || t >= N) t = 0;
    if (phase < 0 || phase > last) phase = 0;

    var j, r;
    for (j = 0; j < N; j++) {
      var tok = root.querySelector('[data-kv-tok="' + j + '"]');
      if (tok) {
        tok.setAttribute('class', 'kv-fig-tok' +
          (j < t ? ' is-seen' : j === t ? ' is-now' : ''));
      }

      var kv = kvClass(t, phase, cache, j);
      var read = isRead(t, phase, j) ? ' is-read' : '';
      for (r = 0; r < D; r++) {
        paint(root, '[data-kv-c="k-' + j + '-' + r + '"]', kv + read);
        paint(root, '[data-kv-c="v-' + j + '-' + r + '"]', kv);
      }

      var sc = scoreClass(t, phase, j);
      paint(root, '[data-kv-c="s-' + j + '-0"]', sc);
      paint(root, '[data-kv-c="w-' + j + '-0"]', sc);
    }

    for (r = 0; r < D; r++) {
      paint(root, '[data-kv-c="q-' + r + '-0"]', phase >= 2 ? 'is-new' : '');
      paint(root, '[data-kv-c="o-' + r + '-0"]', phase >= 4 + t ? 'is-new' : '');
    }

    root.querySelector('.kv-fig-step').textContent =
      'step ' + (t + 1) + ' of ' + N + ' · cache ' + (cache ? 'on' : 'off');
    root.querySelector('.kv-fig-say').innerHTML = say(t, phase, cache);
    root.querySelector('[data-kv-stat="step"]').textContent = String(t + 1);
    root.querySelector('[data-kv-stat="now"]').textContent = String(cache ? 1 : t + 1);
    root.querySelector('[data-kv-stat="tot"]').textContent = String(totalAt(t, phase, cache));

    var playing = root.getAttribute('data-kv-play') === '1';
    var done = t === N - 1 && phase === last;
    root.querySelector('[data-kv-act="play"]').textContent =
      playing ? 'Pause' : done ? 'Replay' : 'Play';
    var btn = root.querySelector('[data-kv-act="cache"]');
    btn.setAttribute('aria-pressed', cache ? 'true' : 'false');
    btn.textContent = 'KV cache: ' + (cache ? 'on' : 'off');
  }

  function reset(root) {
    root.setAttribute('data-kv-t', '0');
    root.setAttribute('data-kv-phase', '0');
  }

  /* One frame forward. The sequence stops on its own at the end rather than
     looping: the last frame carries the count that is the point of the figure,
     and looping past it would erase it every eight seconds. */
  function advance(root) {
    var t = num(root, 'data-kv-t', 0);
    var phase = num(root, 'data-kv-phase', 0);
    if (t === N - 1 && phase === lastPhase(t)) {
      root.setAttribute('data-kv-play', '0');
      reset(root);
      return;
    }
    if (phase < lastPhase(t)) {
      root.setAttribute('data-kv-phase', String(phase + 1));
    } else {
      root.setAttribute('data-kv-t', String(t + 1));
      root.setAttribute('data-kv-phase', '0');
    }
  }

  function mount(root) {
    if (root.getAttribute('data-kv-mounted') === '1') return;
    root.setAttribute('data-kv-mounted', '1');
    root.innerHTML = markup();
    if (root.getAttribute('data-kv-t') === null) reset(root);
    if (root.getAttribute('data-kv-cache') === null) root.setAttribute('data-kv-cache', '1');
    root.setAttribute('data-kv-play', '0');
    render(root);
  }

  function mountAll() {
    ensureStyle();
    var nodes = document.querySelectorAll('.kv-fig');
    for (var i = 0; i < nodes.length; i++) mount(nodes[i]);
  }

  /* Element.closest by hand: it is defined on HTML elements, but this may be an
     XML document (see above), and the walk is three lines. */
  function up(node, test) {
    for (; node && node.nodeType === 1; node = node.parentNode) if (test(node)) return node;
    return null;
  }

  function hasClass(el, name) {
    return (' ' + (el.getAttribute('class') || '') + ' ').indexOf(' ' + name + ' ') > -1;
  }

  /* One interval for the whole document, started only when something is
     actually playing and stopped when nothing is. It sweeps roots by selector,
     so a figure cloned into a hover preview mid-run is picked up without any
     per-root bookkeeping — and nothing ticks on a page that merely links here. */
  var timer = null;

  function sweep() {
    var nodes = document.querySelectorAll('.kv-fig[data-kv-play="1"]');
    if (!nodes.length) { clearInterval(timer); timer = null; return; }
    for (var i = 0; i < nodes.length; i++) { advance(nodes[i]); render(nodes[i]); }
  }

  function ensureTimer() { if (!timer) timer = setInterval(sweep, TICK); }

  if (!document.documentElement.hasAttribute('data-kv-bound')) {
    document.documentElement.setAttribute('data-kv-bound', '');
    document.addEventListener('click', function (ev) {
      var btn = up(ev.target, function (n) { return n.hasAttribute('data-kv-act'); });
      if (!btn) return;
      var root = up(btn, function (n) { return hasClass(n, 'kv-fig'); });
      if (!root) return;
      var act = btn.getAttribute('data-kv-act');

      if (act === 'play') {
        var playing = root.getAttribute('data-kv-play') === '1';
        if (!playing && num(root, 'data-kv-t', 0) === N - 1 &&
            num(root, 'data-kv-phase', 0) === lastPhase(N - 1)) reset(root);
        root.setAttribute('data-kv-play', playing ? '0' : '1');
        if (!playing) ensureTimer();
      } else if (act === 'step') {
        root.setAttribute('data-kv-play', '0');
        advance(root);
      } else if (act === 'reset') {
        root.setAttribute('data-kv-play', '0');
        reset(root);
      } else if (act === 'cache') {
        /* Flipping the cache restarts, because the counters are cumulative over
           the sequence and half a run under each policy compares nothing. */
        root.setAttribute('data-kv-play', '0');
        root.setAttribute('data-kv-cache',
          root.getAttribute('data-kv-cache') === '0' ? '1' : '0');
        reset(root);
      }
      render(root);
    });
  }

  /* Mounting is idempotent, so this asks three times rather than reasoning about
     which one fires. A script inserted by an XSLT transform is not parser
     inserted, so `defer` on the tag carries no guarantee and DOMContentLoaded
     may already have gone by; `load` is the one the theme's own scripts use. */
  mountAll();
  document.addEventListener('DOMContentLoaded', mountAll);
  window.addEventListener('load', mountAll);
})();
