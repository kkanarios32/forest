/* Step-through figure for a ring reduce-scatter across four devices.
 *
 * Mounts into every <div class="rs-fig"> on the page and builds its own markup,
 * so a tree carrying the figure only has to emit the empty div — see CAGW, which
 * pairs it with the <script> tag. Two constraints shape the way this is written:
 *
 *   1. Forester embeds a tree's whole content into anything that transcludes or
 *      hover-previews it, so the figure can appear several times on one page.
 *      Nothing here may use a document-unique id, and the script may itself be
 *      loaded more than once — mounting is guarded and idempotent.
 *
 *   2. forester.js builds hover previews by cloning nodes that are already in
 *      the DOM. A clone carries markup but not event listeners, so state lives
 *      in a data attribute on the root and the buttons are driven by one
 *      delegated listener on the document. A cloned figure is then live for
 *      free, which is the whole point: the preview of ReduceScatter is the
 *      figure, and it should step.
 *
 * Colors are the site palette from trees/evergreen/base-macros.tree, which is
 * the source of truth: \cal-example for a chunk that is fully reduced,
 * \cal-question for one in flight, \cal-neutral-rule for the resting hairline.
 * Restated here as literals for the same reason theme/style.css restates them —
 * neither file can see the macros. Change them in both places or not at all.
 */
(function () {
  var N = 4;                    // devices, and therefore chunks and steps-1
  var CHUNK_MB = 16;            // per-chunk payload quoted in the byte counter
  var ROWS = 4096;              // the buffer is [4096, 8192]; every cell spans all rows
  var COLS = 8192;

  var SUP = ['⁰', '¹', '²', '³'];   // A⁰ A¹ A² A³

  /* Column ranges, so a cell can name the slice of J it covers rather than an
     abstract chunk number. This is the point of the notation: {0,1} says which
     partials have been folded in but not what the cell *is*, and the whole
     lesson of a reduce-scatter is that the answer is A over one column range. */
  var COL_W = COLS / N;
  var RANGES = [];
  for (var r = 0; r < N; r++) RANGES.push((r * COL_W) + ':' + ((r + 1) * COL_W));

  function slice(c) { return '[:, ' + RANGES[c] + ']'; }
  function sum(set) { return set.map(function (v) { return 'A' + SUP[v]; }).join('+'); }

  var CSS = [
    '.rs-fig{margin:1.6em 0}',
    '.rs-fig-rule{width:7.8em;height:1px;background-color:rgb(219,216,215);margin-bottom:1.1em}',
    '.rs-fig-label{font-family:var(--sans);font-size:.71em;font-weight:500;letter-spacing:.09em;text-transform:uppercase;color:rgb(109,103,101);margin:0 0 .5em}',
    '.rs-fig-step{font-style:italic;letter-spacing:0;text-transform:none;color:rgb(109,103,101)}',
    /* The narration is prose, so it is set in the body serif behind the same
       hairline rule a \remark draws. min-height stops the grid from hopping as
       the text changes length between steps. */
    '.rs-fig-say{border-left:2px solid rgb(219,216,215);padding:.1em 0 .1em .9em;margin:0 0 1.3em;min-height:3.2em;font-size:.96em}',
    /* The grid scrolls rather than crushes: four cells plus a row label do not
       fit a phone, and a cell narrower than "[:, 2048:4096]" is worse than a
       scrollbar. The index ranges are what set the minimum now — they are the
       widest thing in the figure, and they are mono, which does not condense. */
    '.rs-fig-scroll{overflow-x:auto}',
    '.rs-fig-grid{display:grid;grid-template-columns:7.6em repeat(4,minmax(6.4em,1fr));gap:.45em;align-items:stretch;min-width:33em}',
    /* Anything naming an index range is mono, and everything else is not. The
       split is doing real work: it separates what a cell *covers* from what a
       cell *holds*, which are the two halves of the notation. */
    '.rs-fig-h{font-family:var(--mono);font-size:.68em;color:rgb(109,103,101);text-align:center;align-self:end}',
    '.rs-fig-r{font-family:var(--mono);font-size:.68em;color:rgb(109,103,101);display:flex;align-items:center;line-height:1.35}',
    '.rs-fig-sl{display:block;font-family:var(--mono);font-size:.62em;opacity:.62;margin-bottom:.15em}',
    '.rs-fig-sm{display:block;font-family:var(--sans);font-size:.78em}',
    '.rs-fig-c{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:.45em .3em;border:1px solid rgb(219,216,215);border-radius:3px;background-color:transparent;color:rgb(109,103,101);line-height:1.3;text-align:center;transition:background-color 160ms ease,border-color 160ms ease,color 160ms ease,opacity 160ms ease}',
    '.rs-fig-c.is-fly{border-color:rgb(115,73,35);background-color:rgb(251,241,234);color:rgb(115,73,35)}',
    '.rs-fig-c.is-done{border-color:rgb(38,97,69);background-color:rgb(236,247,240);color:rgb(38,97,69)}',
    '.rs-fig-c.is-gone{opacity:.32}',
    '.rs-fig-bar{display:flex;align-items:center;gap:.7em;margin:1.2em 0 0}',
    /* Outline at rest, fill on hover — the same weight as the subscribe button,
       and the same repair: a control does not inherit typography, so the font
       has to be restated or the browser supplies its own UI face. */
    '.rs-fig-btn{padding:.4em .9em;border:1px solid rgb(51,64,90);border-radius:3px;background-color:transparent;color:rgb(51,64,90);font-family:var(--sans);font-size:.82em;line-height:1.35;cursor:pointer;transition:background-color 120ms ease,color 120ms ease}',
    '.rs-fig-btn:hover{background-color:rgb(51,64,90);color:#f6f4ee}',
    '.rs-fig-dots{font-family:var(--sans);font-size:.8em;letter-spacing:.25em;color:rgb(109,103,101)}',
    '.rs-fig-bytes{margin-left:auto;font-family:var(--sans);font-size:.78em;color:rgb(109,103,101)}',
    '.rs-fig-key{display:flex;flex-wrap:wrap;gap:1.1em;margin:.9em 0 0;font-family:var(--sans);font-size:.72em;color:rgb(109,103,101)}',
    '.rs-fig-sw{display:inline-block;width:.62em;height:.62em;border-radius:2px;border:1px solid;margin-right:.35em}',
    '.rs-fig-sw.is-fly{border-color:rgb(115,73,35);background-color:rgb(251,241,234)}',
    '.rs-fig-sw.is-done{border-color:rgb(38,97,69);background-color:rgb(236,247,240)}'
  ].join('\n');

  /* ---- the schedule -------------------------------------------------------
   * Device b starts holding its own partial of every chunk. On step t it sends
   * chunk (b - 1 - t) mod N rightward to device b + 1, which folds the arriving
   * partial into its own copy. After N - 1 steps device b holds chunk b summed
   * over all N partials, and has forwarded everything else away. */
  function buildFrames() {
    var frames = [], state = [], dead = {}, b, c;

    for (b = 0; b < N; b++) {
      state[b] = [];
      for (c = 0; c < N; c++) state[b][c] = [b];
    }

    function snap(flying, label, text, bytes) {
      var copy = [], x, y;
      for (x = 0; x < N; x++) {
        copy[x] = [];
        for (y = 0; y < N; y++) copy[x][y] = state[x][y].slice();
      }
      var goneCopy = {};
      for (var k in dead) if (dead.hasOwnProperty(k)) goneCopy[k] = 1;
      frames.push({ cells: copy, fly: flying, gone: goneCopy, label: label, text: text, bytes: bytes });
    }

    snap({}, 'initial state',
      '<em>A<sup>b</sup></em> is device <em>b</em>’s local partial: a full <em>[' + ROWS + ', ' + COLS + ']</em> buffer covering every column, and valid over none of them alone. Each cell names the column range it covers and the partials summed into it so far.',
      '0 MB sent');

    for (var t = 0; t < N - 1; t++) {
      var flying = {}, sent = [];
      for (b = 0; b < N; b++) {
        var chunk = ((b - 1 - t) % N + N) % N;
        var to = (b + 1) % N;
        var payload = state[b][chunk].slice();

        flying[to + '-' + chunk] = 1;
        dead[b + '-' + chunk] = 1;
        sent.push('d' + b + '→d' + to + ' ' + slice(chunk));

        var merged = {};
        state[to][chunk].concat(payload).forEach(function (v) { merged[v] = 1; });
        state[to][chunk] = Object.keys(merged).map(Number).sort();
      }
      snap(flying, 'step ' + (t + 1) + ' of ' + (N - 1),
        'Each device ships one ' + CHUNK_MB + ' MB column slice rightward and its neighbour accumulates into the matching range — ' + sent.join(' · ') + '. Every link carries a slice in the same direction at the same time, which is why the ring costs one slice-time per step and not one buffer-time.',
        (t + 1) * CHUNK_MB + ' MB sent per device');
    }

    var last = frames[frames.length - 1];
    last.label = 'reduce-scatter complete';
    last.text = 'Device <em>b</em>’s row now has exactly one live cell: <em>Σ<sub>b</sub> A<sup>b</sup></em> restricted to <em>J[b·' + COL_W + ' : (b+1)·' + COL_W + ']</em>. That is <em>A[I<sub>x</sub>, J<sub>y</sub>]</em> — resident in ' + CHUNK_MB + ' MB where it began with ' + (N * CHUNK_MB) + ' MB.';

    return frames;
  }

  var FRAMES = buildFrames();

  /* createElementNS, not createElement, and setAttribute('class') below rather
     than .className. The site ships XML with an <?xml-stylesheet?> and the
     browser applies theme/*.xsl on the client, so this code cannot assume it is
     running against an HTML document — in an XML one, createElement produces a
     null-namespace element that is not a stylesheet at all, and .className is
     not defined. The namespaced calls are correct in both. */
  var XHTML = 'http://www.w3.org/1999/xhtml';

  function ensureStyle() {
    if (document.querySelector('style[data-rs-fig]')) return;
    var el = document.createElementNS(XHTML, 'style');
    el.setAttribute('data-rs-fig', '');
    el.textContent = CSS;
    var head = document.head || document.getElementsByTagName('head')[0] || document.documentElement;
    head.appendChild(el);
  }

  function markup() {
    var html = '<div class="rs-fig-rule"></div>' +
      '<p class="rs-fig-label">Ring reduce-scatter · <span class="rs-fig-step"></span></p>' +
      '<div class="rs-fig-say"></div>' +
      '<div class="rs-fig-scroll"><div class="rs-fig-grid">' +
      '<div></div>';

    for (var c = 0; c < N; c++) html += '<div class="rs-fig-h">J[' + RANGES[c] + ']</div>';
    for (var b = 0; b < N; b++) {
      html += '<div class="rs-fig-r">A' + SUP[b] + '[0:' + ROWS + ', :]</div>';
      /* Two spans per cell, filled by textContent on every render: the range it
         covers, then the partials folded into it. Building them once here and
         never touching innerHTML again matters because the transformed document
         may be XML, where innerHTML is parsed strictly. */
      for (c = 0; c < N; c++) {
        html += '<div class="rs-fig-c" data-rs-cell="' + b + '-' + c + '">' +
          '<span class="rs-fig-sl"></span><span class="rs-fig-sm"></span></div>';
      }
    }

    return html + '</div></div>' +
      '<div class="rs-fig-bar">' +
      '<button type="button" class="rs-fig-btn" data-rs-nav="-1">Back</button>' +
      '<button type="button" class="rs-fig-btn" data-rs-nav="1"></button>' +
      '<span class="rs-fig-dots"></span>' +
      '<span class="rs-fig-bytes"></span>' +
      '</div>' +
      '<div class="rs-fig-key">' +
      '<span><span class="rs-fig-sw is-fly"></span>on the wire this step</span>' +
      '<span><span class="rs-fig-sw is-done"></span>equals A over that range</span>' +
      '<span style="opacity:.55">faded — forwarded on, freed</span>' +
      '</div>';
  }

  function render(root) {
    var i = parseInt(root.getAttribute('data-rs-step'), 10);
    if (!(i >= 0 && i < FRAMES.length)) i = 0;
    var f = FRAMES[i];

    for (var b = 0; b < N; b++) {
      for (var c = 0; c < N; c++) {
        var key = b + '-' + c;
        var cell = root.querySelector('[data-rs-cell="' + key + '"]');
        if (!cell) continue;
        var set = f.cells[b][c];
        var cls = 'rs-fig-c';
        if (f.fly[key]) cls += ' is-fly';
        else if (set.length === N) cls += ' is-done';
        if (f.gone[key]) cls += ' is-gone';
        cell.setAttribute('class', cls);
        cell.querySelector('.rs-fig-sl').textContent = slice(c);
        cell.querySelector('.rs-fig-sm').textContent = sum(set);
      }
    }

    root.querySelector('.rs-fig-step').textContent = f.label;
    root.querySelector('.rs-fig-say').innerHTML = f.text;
    root.querySelector('.rs-fig-bytes').textContent = f.bytes;
    root.querySelector('.rs-fig-dots').textContent =
      FRAMES.map(function (_, k) { return k === i ? '●' : '○'; }).join('');
    root.querySelector('[data-rs-nav="1"]').textContent =
      i === FRAMES.length - 1 ? 'Restart' : 'Next';
  }

  function mount(root) {
    if (root.getAttribute('data-rs-mounted') === '1') return;
    root.setAttribute('data-rs-mounted', '1');
    root.innerHTML = markup();
    if (root.getAttribute('data-rs-step') === null) root.setAttribute('data-rs-step', '0');
    render(root);
  }

  function mountAll() {
    ensureStyle();
    var nodes = document.querySelectorAll('.rs-fig');
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

  /* One delegated listener, bound once however many times this file is loaded.
     Cloned figures in hover previews are driven by it without remounting. */
  if (!document.documentElement.hasAttribute('data-rs-bound')) {
    document.documentElement.setAttribute('data-rs-bound', '');
    document.addEventListener('click', function (ev) {
      var btn = up(ev.target, function (n) { return n.hasAttribute('data-rs-nav'); });
      if (!btn) return;
      var root = up(btn, function (n) { return hasClass(n, 'rs-fig'); });
      if (!root) return;
      var i = parseInt(root.getAttribute('data-rs-step'), 10);
      if (!(i >= 0 && i < FRAMES.length)) i = 0;
      var step = parseInt(btn.getAttribute('data-rs-nav'), 10);
      root.setAttribute('data-rs-step', String((i + step + FRAMES.length) % FRAMES.length));
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
