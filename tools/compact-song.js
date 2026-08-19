#!/usr/bin/env node
// Compact a song file: empty the section bars the plan cannot reach, then narrow every
// lane to the coarsest grid the surviving music needs.
//
// The desk now does this on every save (see `compactArrangement` in lib/arrangement-edit.js
// and where mixer.js calls it), so a song edited from here on stays tidy by itself. This
// tool is for the ones already on disk, and it reaches one place the save path will not:
// the COMPOSITION above the desk marker. A save only owns the arrangement layer, so a
// song whose bank carries the residue — every song imported and edited before the save
// path learnt this — needs the bank rewritten too, and that is a deliberate act rather
// than something a save should do behind your back.
//
// Why the residue exists at all is written up over `blankUnplayedBars`.
//
// It never changes a note the song plays: every bar of the plan is rendered before and
// after and compared, and a single difference means nothing is written. The whole file is
// snapshotted to work/mix-history/ first — whole, because unlike the desk's own snapshot
// this rewrites the composition as well as the tail.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve as resolvePath, dirname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolveSection, expandOrder, RESOLUTIONS, LEGACY_RESOLUTION } from '../src/data/arrangements.js';
import { blankUnplayedBars } from './lib/arrangement-edit.js';
import { songFile } from './lib/song-source.js';

const ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!args.length) {
  console.error('usage: node tools/compact-song.js <song-file.js> [--write]');
  console.error('  without --write it reports what it would do and touches nothing');
  process.exit(1);
}
const FILE = resolvePath(args[0]);

const mod = await import(pathToFileURL(FILE).href);
const bank = mod.bank;
const arrangement = mod.arrangement;
if (!bank?.sections) { console.error(`${FILE}: no bank.sections — nothing to compact`); process.exit(1); }

// The order indexes ONE list: the bank's own sections with the arrangement layer's
// appended, exactly as `applyArrangement` builds it. `base` points into the same list.
const bankLen = bank.sections.length;
const merged = [...bank.sections, ...(arrangement?.sections || [])];
const order = arrangement?.order || bank.order || [];
const planBars = expandOrder(order, true).filter((b) => b.sec != null);

const isLaneArray = (v) => Array.isArray(v) && RESOLUTIONS.includes(v.length / 2);
const laneEntries = (sec) => Object.entries(sec).filter(([, v]) => isLaneArray(v));
const onsets = (sections) => sections.reduce((n, sec) => n + laneEntries(sec)
  .reduce((m, [, arr]) => m + arr.filter((v) => v != null).length, 0), 0);

/** The whole song as played: every bar, every lane, at sixteenths. */
const render = (sections) => planBars.map(({ sec: s, half }) => {
  const resolved = resolveSection({ sections }, s);
  const row = {};
  if (resolved) {
    for (const [k, v] of laneEntries(resolved)) {
      const perBar = v.length / 2;
      const stride = perBar / LEGACY_RESOLUTION;
      row[k] = Array.from({ length: LEGACY_RESOLUTION },
        (_, i) => v[half * perBar + i * stride] ?? null);
    }
  }
  return row;
});
const before = render(merged);

// ---- 1. empty the bars nothing reads ------------------------------------------------
const compacted = blankUnplayedBars(merged, order);

// ---- 2. the coarsest grid the survivors need ----------------------------------------
let target = LEGACY_RESOLUTION;
for (const sec of compacted) {
  for (const [, arr] of laneEntries(sec)) {
    const res = arr.length / 2;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] == null) continue;
      // The coarsest member of RESOLUTIONS that can still hold this slot.
      const fit = RESOLUTIONS.find((r) => (i * r) % res === 0);
      if (fit && fit > target) target = fit;
    }
  }
}
const narrow = (arr, res) => {
  const perBar = arr.length / 2;
  if (perBar === res) return arr;
  const stride = perBar / res;
  const out = [];
  for (let half = 0; half < 2; half++) {
    for (let i = 0; i < res; i++) out.push(arr[half * perBar + i * stride] ?? null);
  }
  return out;
};
const narrowed = compacted.map((sec) => {
  let touched = false;
  const out = { ...sec };
  for (const [key, arr] of laneEntries(sec)) {
    if (arr.length / 2 <= target) continue;
    out[key] = narrow(arr, target);
    touched = true;
  }
  return touched ? out : sec;
});

// ---- 3. prove nothing the song plays has moved --------------------------------------
const after = render(narrowed);
if (JSON.stringify(before) !== JSON.stringify(after)) {
  const bar = before.findIndex((_, i) => JSON.stringify(before[i]) !== JSON.stringify(after[i]));
  console.error(`REFUSED: bar ${bar} of the plan renders differently — nothing written.`);
  process.exit(1);
}

const live = before.reduce((n, row) => n + Object.values(row)
  .reduce((m, arr) => m + arr.filter((v) => v != null).length, 0), 0);
console.log(FILE);
console.log(`  ${planBars.length} bars, ${merged.length} sections`);
console.log(`  stored onsets ${onsets(merged)} -> ${onsets(narrowed)}`);
console.log(`  grid ${bank.resolution ?? LEGACY_RESOLUTION} -> ${target} slots/bar`);
console.log(`  every one of the ${live} onsets the song plays renders identically`);

if (!WRITE) { console.log('\n  (dry run — pass --write to apply)'); process.exit(0); }

// ---- 4. snapshot, then write --------------------------------------------------------
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
const histDir = join(ROOT, 'work/mix-history');
mkdirSync(histDir, { recursive: true });
const snap = join(histDir, `song-${stamp}-${mod.id}-precompact.js`);
// The note-shorthand import has to be re-aimed at the snapshot's own folder or the backup
// throws `seq is not defined` on the day it is wanted — the lesson `notesImport` records.
let rel = relative(histDir, join(ROOT, 'src/engine/notes.js')).split('\\').join('/');
if (!rel.startsWith('.')) rel = `./${rel}`;
writeFileSync(snap, readFileSync(FILE, 'utf8')
  .replace(/(from\s+')(?:\.\.\/)*(?:src\/)?engine\/notes\.js(')/, `$1${rel}$2`));

const nextBank = { ...bank, sections: narrowed.slice(0, bankLen) };
if (target === LEGACY_RESOLUTION) delete nextBank.resolution; else nextBank.resolution = target;
let nextArrangement = arrangement;
if (arrangement) {
  nextArrangement = { ...arrangement, sections: narrowed.slice(bankLen) };
  if (target === LEGACY_RESOLUTION) delete nextArrangement.resolution;
  else if ('resolution' in nextArrangement) nextArrangement.resolution = target;
}

writeFileSync(FILE, songFile({
  id: mod.id, title: mod.title, slug: mod.slug, group: mod.group,
  bank: nextBank, mix: mod.mix, arrangement: nextArrangement,
  variants: mod.variants, m8trx: mod.m8trx,
  note: mod.note, seed: mod.seed, alternateOf: mod.alternateOf,
}));
console.log(`\n  snapshot -> ${snap.replace(`${ROOT}/`, '')}`);
console.log(`  written  -> ${FILE.replace(`${ROOT}/`, '')}`);
