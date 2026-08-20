/* Plumbing checks for a forest interactive figure.
 *
 *   node .claude/skills/interactive-figure/verify.mjs <file.js> <root-class>
 *
 * Loads the script into a stub DOM standing in for the site's XML document and
 * asserts the things that are the same for every figure: it mounts, it injects
 * its stylesheet once, mounting twice is a no-op, loading the file twice binds
 * one listener, no HTML entity names or HTML-only DOM calls appear, and any
 * markup handed to innerHTML parses as XML.
 *
 * It says nothing about whether the figure is CORRECT. Write those assertions
 * yourself against the pure functions in the source — that is the part that
 * catches a wrong number in the narration.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const [file, rootClass] = process.argv.slice(2);
if (!file || !rootClass) {
  console.error('usage: verify.mjs <file.js> <root-class>   e.g. … kv-cache.js kv-fig');
  process.exit(2);
}

const src = fs.readFileSync(file, 'utf8');
let fails = 0;
const ok = (cond, msg) => {
  if (!cond) { console.error('  FAIL  ' + msg); fails++; }
  else console.log('  ok    ' + msg);
};

// ---- static scans -------------------------------------------------------
console.log('static scans');
const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

ok(!/&[a-zA-Z]+;/.test(code),
   'no HTML entity names (undefined in XML)');
ok(!/\bdocument\.createElement\s*\(/.test(code),
   'no createElement — must be createElementNS');
ok(!/\.className\b/.test(code),
   'no .className — must be setAttribute("class", …)');
ok(!/\.classList\b/.test(code),
   'no classList (not on XML elements here)');
ok(!/\.closest\s*\(/.test(code),
   'no closest (hand-roll the walk)');
ok(!/\.dataset\b/.test(code),
   'no dataset (use get/setAttribute)');
ok(!/getElementById|\bid\s*[:=]\s*['"]/.test(code),
   'no document-unique ids — the figure renders more than once per page');
ok(/window\.addEventListener\(\s*['"]load['"]/.test(code),
   'mounts on window load (the script is not parser-inserted)');
ok(!/prefers-color-scheme/.test(code),
   'no dark-mode block — the site is light-only');
for (const dead of ['--text-primary', '--border-strong', '--surface-1', '--font-sans',
                    'fonts.googleapis.com']) {
  ok(!src.includes(dead), `no leftover "${dead}" from the source design system`);
}

// ---- stub DOM -----------------------------------------------------------
const XHTML = 'http://www.w3.org/1999/xhtml';
let roots = [];
const styles = [];
const docListeners = [];

class El {
  constructor(tag, ns) { this.tag = tag; this.ns = ns; this.attrs = {}; this.kids = []; this.nodeType = 1; this._t = ''; this._h = null; this._q = {}; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  hasAttribute(k) { return k in this.attrs; }
  removeAttribute(k) { delete this.attrs[k]; }
  appendChild(c) { this.kids.push(c); if (c.tag === 'style') styles.push(c); return c; }
  addEventListener() {}
  get textContent() { return this._t; }
  set textContent(v) { this._t = String(v); }
  get innerHTML() { return this._h || ''; }
  set innerHTML(v) { this._h = String(v); }
  // Memoised so repeated lookups of the same selector see the same node, which
  // is what a real document does and what render() relies on.
  querySelector(sel) {
    if (!(sel in this._q)) this._q[sel] = new El('div', XHTML);
    return this._q[sel];
  }
  querySelectorAll() { return []; }
}

function makeRoot() {
  const r = new El('div', XHTML);
  r.attrs.class = rootClass;
  roots.push(r);
  return r;
}

const docEl = new El('html', XHTML);
const head = new El('head', XHTML);
const theRoot = makeRoot();

const document = {
  documentElement: docEl,
  head,
  createElementNS: (ns, tag) => new El(tag, ns),
  querySelector(sel) {
    const m = /^style\[([^\]]+)\]$/.exec(sel);
    if (m) return styles.find((s) => m[1] in s.attrs) || null;
    return null;
  },
  querySelectorAll(sel) {
    // Only the bare root-class selector matches; a stateful variant such as
    // `.fig[data-x-play="1"]` matches nothing, so a lazy timer stays stopped.
    return sel.trim() === '.' + rootClass ? roots : [];
  },
  addEventListener: (type) => docListeners.push(type),
  getElementsByTagName: () => [],
};

let intervals = 0;
const sandbox = {
  document,
  window: { addEventListener: () => {}, matchMedia: () => ({ matches: false }) },
  setInterval: () => { intervals++; return intervals; },
  clearInterval: () => {},
  setTimeout: (fn) => { fn(); return 0; },
  clearTimeout: () => {},
  console: { log() {}, warn() {}, error() {} },
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

console.log('\nmount');
vm.runInContext(src, sandbox, { filename: path.basename(file) });

ok(theRoot.getAttribute('class') === rootClass, `root kept its .${rootClass} class`);
ok(styles.length === 1, `injected exactly one stylesheet (got ${styles.length})`);
ok(styles.length === 1 && styles[0].textContent.length > 200, 'stylesheet is non-trivial');
ok(styles.length === 1 && styles[0].textContent.includes('.' + rootClass),
   'stylesheet scopes its rules under the root class');

const built = theRoot.innerHTML.length > 0 || theRoot.kids.length > 0;
ok(built, 'root was populated (innerHTML or appended children)');
const marked = Object.keys(theRoot.attrs).some((k) => /mounted/.test(k));
ok(marked, 'root carries a mounted-guard attribute');

// A second root appearing later (a transclusion, a hover-preview clone) must
// mount when the load handler fires again — simulated by re-running the file.
console.log('\nidempotence and duplicate load');
// DOMContentLoaded is re-registered on every load by design (mounting is
// idempotent); the delegated control listener is the one that must bind once.
const delegated = () => docListeners.filter((t) => t !== 'DOMContentLoaded');
const before = { html: theRoot.innerHTML, styles: styles.length, listeners: delegated().length };
const second = makeRoot();
vm.runInContext(src, sandbox, { filename: path.basename(file) + ' (2nd load)' });

ok(styles.length === before.styles, 'second load did not inject a second stylesheet');
ok(before.listeners === 1, `exactly one delegated control listener (got ${before.listeners})`);
ok(delegated().length === before.listeners,
   `second load did not bind another (${delegated().length} after reload)`);
ok(theRoot.innerHTML === before.html, 'already-mounted root was not rebuilt');
ok(second.innerHTML.length > 0 || second.kids.length > 0, 'a newly-added root did mount');
ok(intervals === 0, `no timer started at rest (got ${intervals}) — a page that only links the tree must not tick`);

// ---- markup must be well-formed XML -------------------------------------
console.log('\nmarkup');
if (!theRoot.innerHTML) {
  console.log('  --    no innerHTML used (built node-by-node) — nothing to parse');
} else {
  const tmp = path.join(os.tmpdir(), 'figverify-' + process.pid + '.xml');
  fs.writeFileSync(tmp, `<div xmlns="${XHTML}">${theRoot.innerHTML}</div>`);
  try {
    execFileSync('xmllint', ['--noout', tmp], { stdio: 'pipe' });
    ok(true, `markup parses as XML (${theRoot.innerHTML.length} bytes)`);
  } catch (e) {
    ok(false, 'markup does not parse as XML:\n' + String(e.stderr || e.message).trim());
  } finally { fs.unlinkSync(tmp); }

  const ids = [...theRoot.innerHTML.matchAll(/\sid="([^"]*)"/g)].map((m) => m[1]);
  ok(ids.length === 0, `markup declares no ids (found ${ids.length}: ${ids.slice(0, 5).join(', ')})`);

  const keys = [...theRoot.innerHTML.matchAll(/data-[a-z-]*(?:cell|c|pe|tok|out|feed)="([^"]+)"/g)]
    .map((m) => m[1]);
  if (keys.length) {
    ok(new Set(keys).size === keys.length,
       `${keys.length} data-keyed cells, all distinct within the mount`);
  }
}

console.log(fails ? `\n${fails} FAILED` : '\nPLUMBING OK — the figure\'s own claims are still unverified');
process.exit(fails ? 1 : 0);
