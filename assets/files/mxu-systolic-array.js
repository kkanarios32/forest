/* Step-through figure for a weight-stationary systolic array — the dataflow an
 * MXU actually runs. Activations enter from the left on a staggered tape,
 * partial sums accumulate downward, finished dot products fall out the bottom.
 *
 * Mounts into every <div class="mxu-fig"> on the page and builds its own SVG, so
 * a tree carrying the figure only has to emit the empty div — see SXP6, which
 * pairs it with the <script> tag. Same three constraints as the ring
 * reduce-scatter figure in ring-reduce-scatter.js, and the same answers:
 *
 *   1. Forester embeds a tree's whole content into anything that transcludes or
 *      hover-previews it, so the figure can appear several times on one page.
 *      Nothing here may use a document-unique id, and the script may itself be
 *      loaded more than once — mounting is guarded and idempotent.
 *
 *   2. forester.js builds hover previews by cloning nodes already in the DOM. A
 *      clone carries markup but not listeners, so state lives in a data
 *      attribute on the root and one delegated listener drives the buttons.
 *
 *   3. The site ships XML and applies theme/*.xsl on the client, so this cannot
 *      assume an HTML document. Every element is built with createElementNS and
 *      classes are set with setAttribute — and, since XML knows no HTML entity
 *      names, the narration uses literal characters (× — −) and never &times;.
 *
 * Colors are the site palette from trees/evergreen/base-macros.tree, which is
 * the source of truth: \cal-question for a PE that is firing, \cal-example for a
 * finished dot product, \cal-neutral-rule for the resting hairline. Restated as
 * literals for the same reason theme/style.css restates them — neither file can
 * see the macros. Change them in both places or not at all.
 */
(function () {
  var SVG = 'http://www.w3.org/2000/svg';
  var XHTML = 'http://www.w3.org/1999/xhtml';

  var N = 4;   // side of the array — PEs are N × N
  var M = 4;   // samples streamed through it

  /* The pinned weights and the activations that stream past them. Small integers
     on purpose: the whole point of the figure is watching a running sum grow, so
     the arithmetic has to be checkable at a glance. */
  var W = [[1, 2, 0, 1], [3, 0, 1, 1], [0, 1, 2, 0], [2, 1, 1, 3]];
  var X = [[1, 0, 2, 1], [0, 3, 1, 2], [2, 1, 0, 1], [1, 1, 1, 0]];

  var SUB = ['₀', '₁', '₂', '₃'];

  /* Geometry, in viewBox units. CX/RY are the centres of the PE columns and
     rows, and everything else is placed against them — arrows, labels, the tape
     to the left and the outputs below all derive from these two arrays. */
  var CX = [274, 352, 430, 508];
  var RY = [88, 156, 224, 292];
  var PE_W = 60, PE_H = 56;
  var TAPE_X = 180, TAPE_STEP = 50, TAPE_W = 44, TAPE_H = 26;
  var OUT_Y = 344, OUT_W = 64, OUT_H = 30;

  var CSS = [
    '.mxu-fig{margin:1.6em 0}',
    '.mxu-fig-rule{width:7.8em;height:1px;background-color:rgb(219,216,215);margin-bottom:1.1em}',
    '.mxu-fig-label{font-family:var(--sans);font-size:.71em;font-weight:500;letter-spacing:.09em;text-transform:uppercase;color:rgb(109,103,101);margin:0 0 .5em}',
    '.mxu-fig-step{font-style:italic;letter-spacing:0;text-transform:none;color:rgb(109,103,101)}',
    '.mxu-fig-say{border-left:2px solid rgb(219,216,215);padding:.1em 0 .1em .9em;margin:0 0 1em;min-height:4.6em;font-size:.96em}',
    /* The array does not reflow, so below its natural width it scrolls. A
       systolic array squeezed narrow enough to fit a phone stops showing the one
       thing it is drawn to show, which is the diagonal. */
    '.mxu-fig-scroll{overflow-x:auto}',
    '.mxu-fig-svg{display:block;min-width:34em}',
    /* Resting PE: a hairline box and nothing else. Nothing is filled until it is
       doing something, which is what makes the firing diagonal legible. */
    '.mxu-fig .pe{fill:none;stroke:rgb(219,216,215);stroke-width:1}',
    '.mxu-fig .is-fire .pe{fill:rgb(251,241,234);stroke:rgb(115,73,35)}',
    '.mxu-fig .is-spent{opacity:.32}',
    /* The running sum is the number to read, so it is the larger of the two and
       set in the sans; the weight it multiplies by is an index label, and index
       labels are mono throughout the forest's figures. */
    '.mxu-fig .pv{font-family:var(--sans);font-size:15px;fill:rgb(109,103,101)}',
    '.mxu-fig .is-fire .pv{fill:rgb(115,73,35)}',
    '.mxu-fig .pw{font-family:var(--mono);font-size:11px;fill:rgb(109,103,101);opacity:.7}',
    '.mxu-fig .is-fire .pw{fill:rgb(115,73,35);opacity:1}',
    '.mxu-fig .lb{font-family:var(--mono);font-size:11px;fill:rgb(109,103,101)}',
    '.mxu-fig .wire{stroke:rgb(219,216,215);stroke-width:1;fill:none}',
    '.mxu-fig .tape{fill:none;stroke:rgb(219,216,215);stroke-width:1}',
    '.mxu-fig .out-box{fill:rgb(236,247,240);stroke:rgb(38,97,69);stroke-width:1}',
    '.mxu-fig .out-v{font-family:var(--sans);font-size:15px;fill:rgb(38,97,69)}',
    '.mxu-fig .out-t{font-family:var(--mono);font-size:11px;fill:rgb(38,97,69)}',
    '.mxu-fig .done{font-family:var(--mono);font-size:11px;fill:rgb(109,103,101);opacity:.62}',
    '.mxu-fig-bar{display:flex;align-items:center;gap:.7em;margin:1em 0 0}',
    '.mxu-fig-btn{padding:.4em .9em;border:1px solid rgb(51,64,90);border-radius:3px;background-color:transparent;color:rgb(51,64,90);font-family:var(--sans);font-size:.82em;line-height:1.35;cursor:pointer;transition:background-color 120ms ease,color 120ms ease}',
    '.mxu-fig-btn:hover{background-color:rgb(51,64,90);color:#f6f4ee}',
    '.mxu-fig-dots{font-family:var(--sans);font-size:.8em;letter-spacing:.18em;color:rgb(109,103,101)}',
    '.mxu-fig-stat{margin-left:auto;font-family:var(--sans);font-size:.78em;color:rgb(109,103,101)}',
    '.mxu-fig-key{display:flex;flex-wrap:wrap;gap:1.1em;margin:.9em 0 0;font-family:var(--sans);font-size:.72em;color:rgb(109,103,101)}',
    '.mxu-fig-sw{display:inline-block;width:.62em;height:.62em;border-radius:2px;border:1px solid;margin-right:.35em}',
    '.mxu-fig-sw.is-fire{border-color:rgb(115,73,35);background-color:rgb(251,241,234)}',
    '.mxu-fig-sw.is-done{border-color:rgb(38,97,69);background-color:rgb(236,247,240)}'
  ].join('\n');

  /* The partial sum PE(i, j) holds for sample m: the dot product of that sample
     with column j of W, taken down to row i. A PE adds one term to what arrives
     from above, which is exactly this sum truncated one row earlier. */
  function partial(m, i, j) {
    var s = 0;
    for (var k = 0; k <= i; k++) s += X[m][k] * W[k][j];
    return s;
  }

  /* Frame 0 is the weight load; frame f thereafter is cycle t = f - 1. */
  var SAY = [
    'Weights are pinned: PE(<em>i</em>, <em>j</em>) holds <em>w<sub>ij</sub></em> for the whole tile. To the left is the activation tape — each token is a value and the sample it belongs to. Row <em>i</em> is held back <em>i</em> cycles.',
    'Cycle 0. The first element of sample 0 crosses into PE(0,0): 1 × <em>w<sub>00</sub></em> = 1. Everything else on the tape is still waiting its turn.',
    'Cycle 1. Each activation advances one PE to the right per cycle; each partial sum advances one PE down. The firing set is the anti-diagonal <em>i + j = t</em>.',
    'Cycle 2. Watch the tape: the stagger is what makes <em>x<sub>k</sub></em> arrive at PE(<em>k</em>, <em>j</em>) on exactly the cycle the running sum for column <em>j</em> gets there. No buffers and no arbitration — the schedule is the wiring.',
    'Cycle 3. The first finished dot product falls out of column 0. It was never written anywhere: the sum accumulated as it fell through four PEs.',
    'Cycle 4. Peak occupancy, 12 of 16. The lower right is still filling while the upper left has already drained.',
    'Cycle 5. Steady state. Column <em>j</em> emits one output per cycle, running <em>j</em> cycles behind column 0 — the outputs come out skewed the same way the inputs went in.',
    'Cycle 6. The drain begins. The top-left PEs have seen all four samples, but they cannot be reused: their weights are still pinned for this tile.',
    'Cycle 7. Six PEs left with work, and the tape is empty.',
    'Cycle 8. Three.',
    'Cycle 9. The last MAC. 64 useful MACs over 10 cycles on 16 PEs is 40%, or <em>M / (M + 2N − 2)</em>. At <em>M</em> = 64 that is 91%; at <em>M</em> = 1 it is 14% — which is the fill bubble, and the whole reason a systolic array wants long sequences.'
  ];

  function el(tag, attrs, text) {
    var node = document.createElementNS(SVG, tag);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) node.setAttribute(k, attrs[k]);
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /* Arrowheads are drawn, not markered. A <marker> has to be referenced by id,
     and a document-unique id is exactly what this figure cannot have: two
     transclusions on one page would collide. Two segments and a chevron cost
     less than the caveat would. */
  function arrow(parent, x1, y1, x2, y2) {
    parent.appendChild(el('line', { 'class': 'wire', x1: x1, y1: y1, x2: x2, y2: y2 }));
    var head = y1 === y2
      ? 'M' + (x2 - 4) + ' ' + (y2 - 3) + 'L' + x2 + ' ' + y2 + 'L' + (x2 - 4) + ' ' + (y2 + 3)
      : 'M' + (x2 - 3) + ' ' + (y2 - 4) + 'L' + x2 + ' ' + y2 + 'L' + (x2 + 3) + ' ' + (y2 - 4);
    parent.appendChild(el('path', {
      'class': 'wire', d: head, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
    }));
  }

  function ensureStyle() {
    if (document.querySelector('style[data-mxu-fig]')) return;
    var node = document.createElementNS(XHTML, 'style');
    node.setAttribute('data-mxu-fig', '');
    node.textContent = CSS;
    var head = document.head || document.getElementsByTagName('head')[0] || document.documentElement;
    head.appendChild(node);
  }

  /* The chrome around the figure is ordinary markup and can go in as a string;
     the SVG is built node by node below, because innerHTML on an SVG element is
     namespace-sensitive and this may be an XML document. */
  function chrome() {
    return '<div class="mxu-fig-rule"></div>' +
      '<p class="mxu-fig-label">Weight-stationary MXU · <span class="mxu-fig-step"></span></p>' +
      '<div class="mxu-fig-say"></div>' +
      '<div class="mxu-fig-scroll"></div>' +
      '<div class="mxu-fig-bar">' +
      '<button type="button" class="mxu-fig-btn" data-mxu-nav="-1">Back</button>' +
      '<button type="button" class="mxu-fig-btn" data-mxu-nav="1"></button>' +
      '<span class="mxu-fig-dots"></span>' +
      '<span class="mxu-fig-stat"></span>' +
      '</div>' +
      '<div class="mxu-fig-key">' +
      '<span><span class="mxu-fig-sw is-fire"></span>firing — the large number is the running sum</span>' +
      '<span><span class="mxu-fig-sw is-done"></span>finished dot product</span>' +
      '</div>';
  }

  function buildSvg() {
    var svg = el('svg', {
      'class': 'mxu-fig-svg', width: '100%', viewBox: '0 0 680 412',
      role: 'img', 'aria-label':
        'A four by four grid of processing elements labelled with their pinned weights, ' +
        'a staggered activation tape entering from the left, and finished dot products ' +
        'dropping out of the bottom of each column.'
    });


    svg.appendChild(el('text', { 'class': 'lb', x: 30, y: 46 }, 'tape: value, sample'));
    for (var j = 0; j < N; j++) {
      svg.appendChild(el('text', { 'class': 'lb', x: CX[j], y: 46, 'text-anchor': 'middle' }, 'col ' + j));
    }

    // Filled on every render.
    svg.appendChild(el('g', { 'data-mxu-feed': '' }));

    for (var r = 0; r < N; r++) arrow(svg, 228, RY[r], 240, RY[r]);

    for (var i = 0; i < N; i++) {
      for (var c = 0; c < N; c++) {
        var g = el('g', { 'data-mxu-pe': i + '-' + c });
        g.appendChild(el('rect', {
          'class': 'pe', x: CX[c] - PE_W / 2, y: RY[i] - 28, width: PE_W, height: PE_H, rx: 6
        }));
        g.appendChild(el('text', {
          'class': 'pw', x: CX[c], y: RY[i] - 11, 'text-anchor': 'middle'
        }, 'w' + SUB[i] + SUB[c] + ' = ' + W[i][c]));
        g.appendChild(el('text', {
          'class': 'pv', x: CX[c], y: RY[i] + 11, 'text-anchor': 'middle'
        }, ''));
        svg.appendChild(g);
      }
    }

    for (r = 0; r < N; r++) {
      svg.appendChild(el('text', { 'class': 'lb', x: 558, y: RY[r] + 5 }, 'row ' + r));
    }
    for (j = 0; j < N; j++) arrow(svg, CX[j], 322, CX[j], 342);

    svg.appendChild(el('text', { 'class': 'lb', x: 228, y: 365, 'text-anchor': 'end' }, 'outputs'));
    svg.appendChild(el('g', { 'data-mxu-out': '' }));

    return svg;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function render(root) {
    var f = parseInt(root.getAttribute('data-mxu-step'), 10);
    if (!(f >= 0 && f < SAY.length)) f = 0;
    var t = f - 1;                       // frame 0 is the weight load
    var busy = 0, macs = 0, i, j, m;

    /* A PE fires for sample m = t - i - j: the activation had to walk j columns
       and the partial sum i rows to meet there. Past the last sample it is spent
       — still pinned, but with nothing left to do. */
    for (i = 0; i < N; i++) {
      for (j = 0; j < N; j++) {
        var g = root.querySelector('[data-mxu-pe="' + i + '-' + j + '"]');
        if (!g) continue;
        m = t - i - j;
        var live = t >= 0 && m >= 0 && m < M;
        g.setAttribute('class', live ? 'is-fire' : (m >= M ? 'is-spent' : ''));
        g.querySelector('.pv').textContent = live ? String(partial(m, i, j)) : '';
        if (live) busy++;
      }
    }

    var feed = root.querySelector('[data-mxu-feed]');
    clear(feed);
    for (var r = 0; r < N; r++) {
      for (m = 0; m < M; m++) {
        /* Row r is held back r cycles: that stagger is the entire schedule. */
        var d = m - (t - r);
        if (d < 1 || d > M) continue;
        var x = TAPE_X - TAPE_STEP * (d - 1), y = RY[r] - 13;
        feed.appendChild(el('rect', {
          'class': 'tape', x: x, y: y, width: TAPE_W, height: TAPE_H, rx: 5
        }));
        feed.appendChild(el('text', {
          'class': 'pv', x: x + 14, y: y + 18, 'text-anchor': 'middle'
        }, String(X[m][r])));
        feed.appendChild(el('text', {
          'class': 'lb', x: x + 32, y: y + 18, 'text-anchor': 'middle'
        }, 'm' + m));
      }
    }

    var out = root.querySelector('[data-mxu-out]');
    clear(out);
    for (j = 0; j < N; j++) {
      var om = t - (N - 1) - j;
      var done = [];
      for (var q = 0; q < M; q++) if (om >= q) done.push('m' + q + ':' + partial(q, N - 1, j));
      if (om >= 0 && om < M) {
        out.appendChild(el('rect', {
          'class': 'out-box', x: CX[j] - 32, y: OUT_Y, width: OUT_W, height: OUT_H, rx: 6
        }));
        out.appendChild(el('text', {
          'class': 'out-v', x: CX[j] - 8, y: 364, 'text-anchor': 'middle'
        }, String(partial(om, N - 1, j))));
        out.appendChild(el('text', {
          'class': 'out-t', x: CX[j] + 15, y: 364, 'text-anchor': 'middle'
        }, 'm' + om));
        done.pop();                       // the one in the box is not yet history
      }
      if (done.length) {
        out.appendChild(el('text', {
          'class': 'done', x: CX[j], y: 396, 'text-anchor': 'middle'
        }, done.join('  ')));
      }
    }

    for (var c = 0; c <= t; c++) {
      for (i = 0; i < N; i++) {
        for (j = 0; j < N; j++) {
          m = c - i - j;
          if (m >= 0 && m < M) macs++;
        }
      }
    }

    root.querySelector('.mxu-fig-step').textContent =
      t < 0 ? 'weight load' : 'cycle ' + t + ' of ' + (M + 2 * N - 3);
    root.querySelector('.mxu-fig-say').innerHTML = SAY[f];
    root.querySelector('.mxu-fig-stat').textContent =
      busy + '/' + (N * N) + ' firing · ' + macs + '/' + (M * N * N) + ' MACs';
    root.querySelector('.mxu-fig-dots').textContent =
      SAY.map(function (_, k) { return k === f ? '●' : '○'; }).join('');
    root.querySelector('[data-mxu-nav="1"]').textContent =
      f === SAY.length - 1 ? 'Restart' : 'Next';
  }

  function mount(root) {
    if (root.getAttribute('data-mxu-mounted') === '1') return;
    root.setAttribute('data-mxu-mounted', '1');
    root.innerHTML = chrome();
    root.querySelector('.mxu-fig-scroll').appendChild(buildSvg());
    if (root.getAttribute('data-mxu-step') === null) root.setAttribute('data-mxu-step', '0');
    render(root);
  }

  function mountAll() {
    ensureStyle();
    var nodes = document.querySelectorAll('.mxu-fig');
    for (var i = 0; i < nodes.length; i++) mount(nodes[i]);
  }

  function up(node, test) {
    for (; node && node.nodeType === 1; node = node.parentNode) if (test(node)) return node;
    return null;
  }

  function hasClass(node, name) {
    return (' ' + (node.getAttribute('class') || '') + ' ').indexOf(' ' + name + ' ') > -1;
  }

  if (!document.documentElement.hasAttribute('data-mxu-bound')) {
    document.documentElement.setAttribute('data-mxu-bound', '');
    document.addEventListener('click', function (ev) {
      var btn = up(ev.target, function (n) { return n.hasAttribute('data-mxu-nav'); });
      if (!btn) return;
      var root = up(btn, function (n) { return hasClass(n, 'mxu-fig'); });
      if (!root) return;
      var f = parseInt(root.getAttribute('data-mxu-step'), 10);
      if (!(f >= 0 && f < SAY.length)) f = 0;
      var step = parseInt(btn.getAttribute('data-mxu-nav'), 10);
      root.setAttribute('data-mxu-step', String((f + step + SAY.length) % SAY.length));
      render(root);
    });
  }

  mountAll();
  document.addEventListener('DOMContentLoaded', mountAll);
  window.addEventListener('load', mountAll);
})();
