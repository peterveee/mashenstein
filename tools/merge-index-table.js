#!/usr/bin/env node
// Git merge driver for the generated archive indexes -- galleries/index.md and
// releases/index.md.
//
// Both files are a prose preamble followed by one markdown table row per
// archived snapshot, and both are written from scratch by their archive tool
// (tools/archive-gallery.js, tools/archive-release.js) from whatever is on
// disk. Two machines archiving independently therefore always collide on the
// last row, and a plain textual merge cannot tell an added row from a pruned
// one.
//
// `merge=union` is the usual reflex here and is wrong: when the two sides hold
// the same commit with different text -- which happens constantly, because a
// tool that cannot resolve a commit writes "(commit not in history)" in place
// of its subject -- union keeps both lines and the table grows a duplicate row.
//
// So merge the table as a SET of rows keyed by commit, three-way against the
// ancestor so pruning still works, and prefer a real subject over the
// placeholder. The preamble is merged separately and only conflicts when both
// sides genuinely edited it.
//
// Registered per clone (see `npm run setup`):
//   git config merge.index-table.driver 'node tools/merge-index-table.js %O %A %B'

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const [ancestorPath, oursPath, theirsPath] = process.argv.slice(2);
if (!ancestorPath || !oursPath || !theirsPath) {
  console.error('usage: merge-index-table.js <ancestor> <ours> <theirs>');
  process.exit(2);
}

const PLACEHOLDER = '(commit not in history)';

const read = (p) => {
  try {
    return readFileSync(p, 'utf8');
  } catch {
    return '';
  }
};

// A table starts at the header row and runs to the last line that looks like a
// row. Anything before is preamble, anything after is trailer; both are carried
// through untouched so this driver never has an opinion about the prose.
function parse(text) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => /^\|\s*Date\s*\|/.test(l));
  if (start === -1) return null;
  const sep = start + 1;
  if (!/^\|[\s|:-]+\|$/.test(lines[sep] || '')) return null;
  let end = sep + 1;
  while (end < lines.length && lines[end].startsWith('|')) end += 1;
  const rows = new Map();
  for (const line of lines.slice(sep + 1, end)) {
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    const commit = (cells[1] || '').replace(/`/g, '');
    if (!commit) continue;
    // Last writer wins within one file; the generator never emits duplicates.
    rows.set(commit, { line, cells });
  }
  return {
    preamble: lines.slice(0, start).join('\n'),
    header: lines.slice(start, sep + 1),
    rows,
    trailer: lines.slice(end).join('\n'),
  };
}

const ancestor = parse(read(ancestorPath));
const ours = parse(read(oursPath));
const theirs = parse(read(theirsPath));

// Not a table we understand -- leave the conflict for a human rather than
// guessing at a file this driver was not written for.
if (!ours || !theirs) process.exit(1);

const subjectOf = (row) => (row.cells[row.cells.length - 1] || '').trim();
const informative = (row) => subjectOf(row) !== PLACEHOLDER;

// Prefer whichever side actually resolved the commit. If both did and they
// still differ, ours wins -- the tie is cosmetic and an arbitrary but stable
// choice beats a conflict in a generated file.
function pick(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (a.line === b.line) return a;
  if (informative(a) && !informative(b)) return a;
  if (informative(b) && !informative(a)) return b;
  return a;
}

const base = ancestor ? ancestor.rows : new Map();
const keys = new Set([...ours.rows.keys(), ...theirs.rows.keys()]);
const merged = [];
for (const key of keys) {
  const o = ours.rows.get(key);
  const t = theirs.rows.get(key);
  // Present in the ancestor and gone on one side means that side pruned it.
  // Honour the prune; resurrecting old snapshots is how this table rots.
  if (base.has(key) && (!o || !t)) continue;
  merged.push(pick(o, t));
}

// Sort the way the archive tools do: by commit time, falling back to the date
// in the filename so a commit this clone cannot see still lands in the right
// place. Rows whose date cell is not a date (the screens.html row) pin last.
const when = (row) => {
  const commit = (row.cells[1] || '').replace(/`/g, '');
  try {
    const ct = Number(execFileSync('git', ['show', '-s', '--format=%ct', commit], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim());
    if (Number.isFinite(ct) && ct > 0) return ct;
  } catch { /* commit not present in this clone */ }
  const parsed = Date.parse(row.cells[0]);
  return Number.isFinite(parsed) ? parsed / 1000 : Infinity;
};

const sortKey = new Map(merged.map((r) => [r, when(r)]));
merged.sort((a, b) => (sortKey.get(a) - sortKey.get(b))
  || a.cells[1].localeCompare(b.cells[1]));

// The preamble is static prose. Take whichever side changed it; only a genuine
// two-sided edit is a conflict worth stopping for.
let preamble = ours.preamble;
let conflicted = false;
if (ours.preamble !== theirs.preamble) {
  if (ancestor && theirs.preamble === ancestor.preamble) preamble = ours.preamble;
  else if (ancestor && ours.preamble === ancestor.preamble) preamble = theirs.preamble;
  else conflicted = true;
}

const trailer = ours.trailer === theirs.trailer ? ours.trailer : ours.trailer;
const out = [preamble, ...ours.header, ...merged.map((r) => r.line), trailer]
  .join('\n').replace(/\n{3,}$/, '\n');
writeFileSync(oursPath, out);
process.exit(conflicted ? 1 : 0);
