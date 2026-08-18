#!/usr/bin/env node
// Compact a desk-edited song: drop the section halves nothing plays, then narrow every
// lane to the coarsest grid the surviving notes still need.
//
// ---- why a song grows this ---------------------------------------------------------
//
// The importer slices music into TWO-BAR sections (`STEPS_PER_BLOCK`), and the desk
// edits ONE BAR at a time. A per-bar edit forks a new section — a whole two-bar object,
// `{ base: n, ...the lane you changed }` — and points only that bar at it, which is what
// `planToOrder` is writing when it emits `{ s, bars: 1, from }`. The fork's OTHER bar is
// a copy nothing references and nothing can reach, frozen at whatever was there when the
// fork happened. Quantise a track and every played bar comes out straight while its dead
// twin stays exactly as ragged as it was.
//
// The residue is not merely wasted bytes. `normaliseArrangementResolution` refuses to
// demote a song while any lane holds a note off the coarser grid, and it cannot tell a
// note from a note nothing plays — so one dead bar pins the whole song at its finest
// grid, and every scheduler tick that costs, forever.
//
// ---- what this does NOT do ----------------------------------------------------------
//
// It never changes a note the song plays. Every bar of the plan is rendered before and
// after and the two are compared; a single difference and nothing is written. The old
// file is snapshotted to work/mix-history/ first, the same drawer the desk uses.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve as resolvePath, dirname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolveSection, RESOLUTIONS, LEGACY_RESOLUTION } from '../src/data/arrangements.js';
import { songFile } from './lib/song-source.js';

const ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2).filter((a) => a !== '--write');
const WRITE = process.argv.includes('--write');
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
const layer = arrangement?.sections || [];
const merged = { ...bank, sections: [...bank.sections, ...layer] };
const order = arrangement?.order || bank.order || [];

const isLaneArray = (v) => Array.isArray(v) && v.length % 32 === 0
  && RESOLUTIONS.includes(v.length / 2);
const laneEntries = (sec) => Object.entries(sec).filter(([, v]) => isLaneArray(v));

/** The section chain a bar reads through: itself, then its base, then its base's base. */
const chainOf = (s) => {
  const out = []; const seen = new Set(); let cur = s;
  while (cur != null && !seen.has(cur) && cur >= 0 && cur < merged.sections.length) {
    seen.add(cur); out.push(cur); cur = merged.sections[cur].base;
  }
  return out;
};

/** Every (section, half) the plan puts on screen. A plain number is both halves. */
const planBars = [];
for (const e of order) {
  if (typeof e === 'number') { planBars.push({ s: e, half: 0 }, { s: e, half: 1 }); continue; }
  if (e?.s == null) continue;
  const from = e.from || 0;
  const bars = e.bars || 2;
  for (let h = from; h < from + bars && h < 2; h++) planBars.push({ s: e.s, half: h });
}

// ---- which halves of which lane, in which section, are load-bearing -----------------
//
// A lane is supplied by the FIRST section in the chain that HAS it — that is what the
// `{...base, ...child}` merge means — so the half is needed in that section and in no
// other. A lane the child overrides leaves the base's copy dead, which is most of them.
const needed = new Map();                       // sectionIdx -> Map(laneKey -> Set(half))
const need = (idx, key, half) => {
  if (!needed.has(idx)) needed.set(idx, new Map());
  const m = needed.get(idx);
  if (!m.has(key)) m.set(key, new Set());
  m.get(key).add(half);
};
// A lane's note LENGTHS are the exception: `bassLen[i]` is read only where `bass[i]`
// holds a note, so a length whose note has moved away — a quantise leaves these behind
// whenever the note lane is overridden by a fork and the length lane is not — is inert
// data that still counts as "written on an odd slot" and still pins the grid. Lengths
// are therefore kept per SLOT against the note lane as the bar actually resolves it,
// not per half like everything else.
const keptLen = new Map();                      // sectionIdx -> Map(lenKey -> Set(slot))
const keepLen = (idx, key, slot) => {
  if (!keptLen.has(idx)) keptLen.set(idx, new Map());
  const m = keptLen.get(idx);
  if (!m.has(key)) m.set(key, new Set());
  m.get(key).add(slot);
};
const isLenKey = (k) => /Len$/.test(k);
for (const { s, half } of planBars) {
  const chain = chainOf(s);
  const keys = new Set();
  for (const idx of chain) for (const [k] of laneEntries(merged.sections[idx])) keys.add(k);
  const resolved = resolveSection(merged, s);
  for (const key of keys) {
    const provider = chain.find((idx) => merged.sections[idx][key] !== undefined);
    if (provider == null) continue;
    if (!isLenKey(key)) { need(provider, key, half); continue; }
    const notes = resolved?.[key.replace(/Len$/, '')];
    const arr = merged.sections[provider][key];
    const perBar = arr.length / 2;
    // Without a note lane to check against there is nothing to call orphaned, so the
    // whole half is kept — the conservative answer, and the one that cannot lose data.
    if (!Array.isArray(notes) || notes.length !== arr.length) { need(provider, key, half); continue; }
    for (let i = half * perBar; i < (half + 1) * perBar; i++) {
      if (arr[i] != null && notes[i] != null) keepLen(provider, key, i);
    }
  }
}

/** One bar of one lane as sixteenths — the canonical shape both sides are compared in. */
const barAt = (arr, half) => {
  const perBar = arr.length / 2;
  const stride = perBar / LEGACY_RESOLUTION;
  const out = [];
  for (let i = 0; i < LEGACY_RESOLUTION; i++) out.push(arr[half * perBar + i * stride] ?? null);
  return out;
};
/** The whole song as played: every bar, every lane, at sixteenths. */
const render = (sections, plan) => plan.map(({ s, half }) => {
  const sec = resolveSection({ sections }, s);
  const row = {};
  if (sec) for (const [k, v] of laneEntries(sec)) row[k] = barAt(v, half);
  return row;
});
const before = render(merged.sections, planBars);

// ---- 1. blank the halves nothing reads ---------------------------------------------
let blanked = 0;
const compacted = merged.sections.map((sec, idx) => {
  const out = { ...sec };
  for (const [key, arr] of laneEntries(sec)) {
    const next = [...arr];
    if (isLenKey(key) && !needed.get(idx)?.has(key)) {
      const keep = keptLen.get(idx)?.get(key);
      for (let i = 0; i < next.length; i++) {
        if (next[i] != null && !keep?.has(i)) { next[i] = null; blanked++; }
      }
      out[key] = next;
      continue;
    }
    const halves = needed.get(idx)?.get(key);
    const perBar = arr.length / 2;
    for (const half of [0, 1]) {
      if (halves?.has(half)) continue;
      for (let i = half * perBar; i < (half + 1) * perBar; i++) {
        if (next[i] != null) { next[i] = null; blanked++; }
      }
    }
    out[key] = next;
  }
  return out;
});

// ---- 2. the coarsest grid the survivors need ----------------------------------------
const finestNeeded = () => {
  let want = LEGACY_RESOLUTION;
  for (const sec of compacted) {
    for (const [, arr] of laneEntries(sec)) {
      const res = arr.length / 2;
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] == null) continue;
        // The coarsest member of RESOLUTIONS that can still hold this slot.
        const fit = RESOLUTIONS.find((r) => (i * r) % res === 0);
        if (fit && fit > want) want = fit;
      }
    }
  }
  return want;
};
const target = finestNeeded();
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
  const out = { ...sec };
  for (const [key, arr] of laneEntries(sec)) {
    if (arr.length / 2 > target) out[key] = narrow(arr, target);
  }
  return out;
});

// ---- 3. prove nothing the song plays has moved --------------------------------------
const after = render(narrowed, planBars);
if (JSON.stringify(before) !== JSON.stringify(after)) {
  const bar = before.findIndex((_, i) => JSON.stringify(before[i]) !== JSON.stringify(after[i]));
  console.error(`REFUSED: bar ${bar} of the plan renders differently — nothing written.`);
  process.exit(1);
}

const liveNotes = before.reduce((n, row) => n + Object.values(row)
  .reduce((m, arr) => m + arr.filter((v) => v != null).length, 0), 0);
const rawBefore = merged.sections.reduce((n, sec) => n + laneEntries(sec)
  .reduce((m, [, arr]) => m + arr.filter((v) => v != null).length, 0), 0);
const rawAfter = narrowed.reduce((n, sec) => n + laneEntries(sec)
  .reduce((m, [, arr]) => m + arr.filter((v) => v != null).length, 0), 0);

console.log(FILE);
console.log(`  ${planBars.length} bars, ${merged.sections.length} sections`);
console.log(`  stored onsets ${rawBefore} -> ${rawAfter}   (${blanked} in bars nothing plays)`);
console.log(`  grid ${bank.resolution ?? LEGACY_RESOLUTION} -> ${target} slots/bar`);
console.log(`  every one of the ${liveNotes} onsets the song plays renders identically`);

if (!WRITE) { console.log('\n  (dry run — pass --write to apply)'); process.exit(0); }

// ---- 4. snapshot, then write --------------------------------------------------------
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', 'T');
const histDir = join(ROOT, 'work/mix-history');
mkdirSync(histDir, { recursive: true });
const snap = join(histDir, `song-${stamp}-${mod.id}-precompact.js`);
// The WHOLE file, not the desk tail: this rewrites the composition above the marker as
// well, so a tail-only snapshot would restore half of what it replaced. The note-shorthand
// import has to be re-aimed at the snapshot's own folder or the backup is a file that
// throws `seq is not defined` on the day it is wanted — the lesson `notesImport` records.
const notesRel = relative(histDir, join(ROOT, 'src/engine/notes.js')).split('\\').join('/');
writeFileSync(snap, readFileSync(FILE, 'utf8').replace(
  /(from\s+')(?:\.\.\/)*(?:src\/)?engine\/notes\.js(')/, `$1${notesRel.startsWith('.') ? notesRel : `./${notesRel}`}$2`));

const nextBank = { ...bank, sections: narrowed.slice(0, bankLen) };
if (target === LEGACY_RESOLUTION) delete nextBank.resolution; else nextBank.resolution = target;
const nextArrangement = arrangement
  ? { ...arrangement, sections: narrowed.slice(bankLen) } : null;
if (nextArrangement && 'resolution' in nextArrangement) {
  if (target === LEGACY_RESOLUTION) delete nextArrangement.resolution;
  else nextArrangement.resolution = target;
}

writeFileSync(FILE, songFile({
  id: mod.id, title: mod.title, slug: mod.slug, group: mod.group,
  bank: nextBank, mix: mod.mix, arrangement: nextArrangement,
  variants: mod.variants, m8trx: mod.m8trx,
  note: mod.note, seed: mod.seed, alternateOf: mod.alternateOf,
}));
console.log(`\n  snapshot -> ${snap.replace(`${ROOT}/`, '')}`);
console.log(`  written  -> ${FILE.replace(`${ROOT}/`, '')}`);
