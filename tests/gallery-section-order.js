// Every lab section carries a date — when the question was opened — and the
// point of that date is that a scroll down the page reads oldest to newest.
// Both halves rot silently on their own: a new section pasted in without a
// date looks fine until someone wonders how stale it is, and a section
// appended out of order looks fine until the page it built the habit on no
// longer means anything. So this checks the actual claim gallery-entry.js
// makes to itself in its own comment above sectionEl(): every visible lab
// section has a date, and file order is non-decreasing by that date.
//
// Parsed with acorn, the same way tools/gallery-prune.js finds a section's
// own call — not regex, for the reason that tool gives: a 7000-line file full
// of template literals miscounts under anything less.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = join(root, 'tools/gallery-entry.js');

let failures = 0;
function ok(cond, msg) {
  if (cond) console.log(`ok: ${msg}`);
  else { console.error(`FAIL: ${msg}`); failures++; }
}

function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const n of node) walk(n, visit); return; }
  if (typeof node.type === 'string') visit(node);
  for (const key in node) {
    if (key === 'loc' || key === 'range') continue;
    const val = node[key];
    if (val && typeof val === 'object') walk(val, visit);
  }
}

const src = readFileSync(TARGET, 'utf8');
const ast = parse(src, { ecmaVersion: 2022, sourceType: 'module' });

// Where the lab half of the bundle starts — everything before this is the
// production reference gallery, which carries no dates and is not this file's
// business.
let labStart = null;
walk(ast, (n) => {
  if (labStart != null) return;
  if (n.type === 'ExpressionStatement' && n.expression.type === 'CallExpression'
      && n.expression.callee.type === 'Identifier' && n.expression.callee.name === 'beginLab') {
    labStart = n.start;
  }
});
ok(labStart != null, 'found the beginLab() call that starts the lab half');

// Sections retired from the chooser stay in source but never render, so they
// are exempt — nobody scrolls past a section that is not there.
const hidden = new Set();
walk(ast, (n) => {
  if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier'
      && n.id.name === 'HIDDEN_GALLERY_SECTIONS' && n.init?.type === 'NewExpression') {
    const arr = n.init.arguments[0];
    if (arr?.type === 'ArrayExpression') {
      for (const el of arr.elements) if (el?.type === 'Literal') hidden.add(el.value);
    }
  }
});
ok(hidden.size > 0, `found ${hidden.size} retired ids in HIDDEN_GALLERY_SECTIONS`);

// Direct section(id, title, note, date) / sectionEl(...) calls, and the one
// helper that wraps them — ideaSheet(id, title, blurb, date, ...). A future
// helper needs a line here too; there is no way to infer "this eventually
// calls section()" from source without knowing the shape.
const CALLEES = {
  section: { idArg: 0, dateArg: 3 },
  sectionEl: { idArg: 0, dateArg: 3 },
  ideaSheet: { idArg: 0, dateArg: 3 },
};

// A literal argument resolves itself; `sectionEl(secId, title, ...)` needs
// the plain `const secId = '...'` it was handed a scope up. Resolved per
// TOP-LEVEL block rather than globally — `secId` is reused as a local name
// in more than one section, and a flat name→value map would blur them.
function literalOf(node, localConsts) {
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node?.type === 'Identifier' && localConsts.has(node.name)) return localConsts.get(node.name);
  return null;
}

const found = [];
for (const top of ast.body) {
  const localConsts = new Map();
  walk(top, (n) => {
    if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier'
        && n.init?.type === 'Literal' && typeof n.init.value === 'string') {
      localConsts.set(n.id.name, n.init.value);
    }
  });
  walk(top, (n) => {
    if (n.type !== 'CallExpression' || n.callee.type !== 'Identifier') return;
    const shape = CALLEES[n.callee.name];
    if (!shape) return;
    const id = literalOf(n.arguments[shape.idArg], localConsts);
    if (id == null) return;
    const date = literalOf(n.arguments[shape.dateArg], localConsts);
    found.push({ id, date, start: n.start });
  });
}

const labSections = found
  .filter((f) => labStart != null && f.start > labStart && !hidden.has(f.id))
  .sort((a, b) => a.start - b.start);
ok(labSections.length > 0, `found ${labSections.length} visible lab sections`);

for (const s of labSections) {
  ok(!!s.date, `${s.id}: has a date`);
}

let prev = null;
for (const s of labSections) {
  if (!s.date) continue;
  const t = new Date(s.date).getTime();
  ok(Number.isFinite(t), `${s.id}: "${s.date}" parses as a date`);
  if (prev && Number.isFinite(t)) {
    ok(t >= prev.t, `${s.id} (${s.date}) is not before ${prev.id} (${prev.date}) — sections stay old to new`);
  }
  if (Number.isFinite(t)) prev = { t, id: s.id, date: s.date };
}

console.log(failures ? 'GALLERY SECTION ORDER: FAILED' : 'GALLERY SECTION ORDER: PASSED');
process.exit(failures ? 1 : 0);
