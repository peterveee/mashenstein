// MAKE A BANGER — the file half. Writing a banger song, and keeping its takes.
//
// The music is generated in the page (tools/lib/banger/ is browser-safe, so the static
// mixer can make one too, and an edit to the generator needs a refresh rather than a
// server restart). This file only WRITES what the page made: a song in its own drawer,
// work/bangers/ (BANGER_DIR), its recipe in `export const banger` above the desk's marker.
//
// TAKES. Another Take re-rolls the same recipe with a new seed into the SAME song. The
// take it replaces is kept whole — music and all — as
// work/mix-history/banger-<id>-take-NNN.js. Whole, not the desk-tail snapshot every save
// writes: a take's MUSIC is above the marker, which is exactly the half the desk's own
// history never copies. A take file sits two folders down like the song it came from, so
// it is a byte copy that still imports, and Previous Take puts it back byte for byte.
//
// `tailHash` in the recipe is a hash of the desk tail as the take was written. When the
// file's tail no longer matches it, the take has been mixed — and the desk says so before
// anything replaces it.
import {
  readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync, rmSync, renameSync,
} from 'node:fs';
import { join, relative, sep } from 'node:path';
import { songFile, DESK_MARKER } from './song-source.js';
import { SCRATCH_DIR, BANGER_DIR, songFileIn } from './imported-index.js';
import { hashStr } from '../../src/engine/rng.js';
import { arrangementIssues } from '../../src/data/arrangements.js';
import { LANE_KEYS } from '../../src/engine/lanes.js';
import { validateRiff } from './banger/index.js';

export const BANGER_TAKE_DIR = 'work/mix-history';
/** A song in work/bangers/ (or work/scratch/) reaches the note helpers this way (see /new-song). */
export const SCRATCH_NOTES_PATH = '../../src/engine/notes.js';

const TAKE_RE = /^banger-(.+)-take-(\d{3,})\.js$/;
export const takeFileName = (id, n) => `banger-${id}-take-${String(n).padStart(3, '0')}.js`;

/** The hash of a song source's desk tail — what says a take has been mixed since. */
export function tailHashOf(src) {
  const at = src.indexOf(DESK_MARKER);
  return at < 0 ? null : hashStr(src.slice(at)).toString(16);
}

/**
 * Everything wrong with a generated banger the page sent, as sentences. The page made
 * it with the same generator, so this is a guard against a stale page or a hand-made
 * request, not a second opinion about the music.
 */
export function bangerIssues(generated) {
  const issues = [];
  if (!generated || typeof generated !== 'object') return ['no banger was sent'];
  const { bank, mix, arrangement, banger } = generated;
  if (!bank || !Array.isArray(bank.sections) || !Array.isArray(bank.order)) issues.push('the banger has no music');
  if (!banger || typeof banger !== 'object') issues.push('the banger has no recipe');
  else {
    issues.push(...validateRiff(banger.riff).map((s) => `riff: ${s}`));
    // The OPTIONS are the page's business, not this file's: the page made the banger with
    // them and has already checked them. This process may be running an older generator
    // than the page (the page is rebuilt on every load, this is not until a restart), so
    // judging a newer page's switches by older rules refused every banger the moment a
    // switch was added. It only has to be a set of options; what would break the FILE —
    // the riff, the arrangement — is still checked.
    if (!banger.options || typeof banger.options !== 'object' || Array.isArray(banger.options)) {
      issues.push('options: the recipe has no options');
    }
  }
  if (bank && Array.isArray(bank.sections)) {
    const laneKeys = [...new Set([...LANE_KEYS, ...((mix?.layers) || []).map((l) => l.key)])];
    issues.push(...arrangementIssues(bank, arrangement || null, laneKeys));
  }
  return issues;
}

/** The source of a banger song: the generated music, its recipe, its take number. */
export function bangerSource({ id, title, generated, take = 1, made = new Date().toISOString(), notesPath = SCRATCH_NOTES_PATH }) {
  const build = (tailHash) => songFile({
    id, title, slug: id, group: 'banger',
    bank: generated.bank, mix: generated.mix ?? null, arrangement: generated.arrangement ?? null,
    variants: null, note: generated.note, seed: generated.banger?.seed ?? null, notesPath,
    banger: { ...generated.banger, take, made, ...(tailHash ? { tailHash } : {}) },
  });
  // The tail does not depend on the recipe above it, so hashing the first build's tail
  // and building again with the hash in is exact.
  return build(tailHashOf(build(null)));
}

/** Where a banger song is (or will be) kept: where it already is, or the bangers' drawer. */
export const bangerPath = (root, id) => songFileIn(root, id) || join(root, BANGER_DIR, `${id}.js`);

/** Write a banger song. Returns `{ file, path, source }`. */
export function writeBangerSong(root, { id, title, generated, take = 1, made }) {
  const path = bangerPath(root, id);
  mkdirSync(join(root, BANGER_DIR), { recursive: true });
  const source = bangerSource({ id, title, generated, take, made });
  writeFileSync(path, source);
  return { path, file: relative(root, path).split(sep).join('/'), source };
}

/**
 * Bangers made before they had a drawer of their own (2 Oct 2026) sat in work/scratch/
 * with the scratch songs. Move each one into BANGER_DIR, saying `group = "banger"` the
 * way a new one does — run by the desk as it starts, so a desk still running the older
 * code never sees a song vanish from under it. A file the scratch drawer holds under
 * some OTHER group (a copy, an audition) is not a banger's to move, and an id already
 * in BANGER_DIR is left where it is. Returns the ids moved.
 */
export function moveBangersOutOfScratch(root) {
  const from = join(root, SCRATCH_DIR);
  if (!existsSync(from)) return [];
  const moved = [];
  for (const file of readdirSync(from).sort()) {
    if (!file.endsWith('.js') || file === 'index.js') continue;
    const src = readFileSync(join(from, file), 'utf8');
    if (!/^export const banger\s*=/m.test(src)) continue;
    const group = /^export const group\s*=\s*("(?:\\.|[^"])*")\s*;?/m.exec(src);
    if (group && JSON.parse(group[1]) !== 'scratch') continue;
    const to = join(root, BANGER_DIR, file);
    if (existsSync(to)) continue;
    mkdirSync(join(root, BANGER_DIR), { recursive: true });
    renameSync(join(from, file), to);
    if (group) writeFileSync(to, src.replace(group[0], group[0].replace(group[1], '"banger"')));
    moved.push(file.slice(0, -3));
  }
  return moved;
}

/** The take numbers kept for a song, ascending. */
export function listTakes(root, id) {
  const dir = join(root, BANGER_TAKE_DIR);
  if (!existsSync(dir)) return [];
  const out = [];
  for (const f of readdirSync(dir)) {
    const m = TAKE_RE.exec(f);
    if (m && m[1] === id) out.push(Number(m[2]));
  }
  return out.sort((a, b) => a - b);
}

/** The current file kept aside as take `n` (replacing an older copy of that take). */
export function snapshotTake(root, id, n) {
  const dir = join(root, BANGER_TAKE_DIR);
  mkdirSync(dir, { recursive: true });
  const name = takeFileName(id, n);
  copyFileSync(bangerPath(root, id), join(dir, name));
  return name;
}

/** Take `n` put back as the song, byte for byte. */
export function restoreTake(root, id, n) {
  const from = join(root, BANGER_TAKE_DIR, takeFileName(id, n));
  if (!existsSync(from)) throw new Error(`take ${n} of ${id} is not kept`);
  copyFileSync(from, bangerPath(root, id));
}

/** Every kept take of a song gone — when the song itself is deleted. */
export function deleteTakes(root, id) {
  const dir = join(root, BANGER_TAKE_DIR);
  for (const n of listTakes(root, id)) rmSync(join(dir, takeFileName(id, n)), { force: true });
}

/**
 * Where a banger stands: which take it is, which takes exist, and whether this one has
 * been mixed since it was made.
 */
export function takesState(root, id, meta) {
  const src = readFileSync(bangerPath(root, id), 'utf8');
  const current = meta?.take ?? 1;
  const takes = [...new Set([...listTakes(root, id), current])].sort((a, b) => a - b);
  return {
    take: current,
    takes,
    mixed: !!meta?.tailHash && tailHashOf(src) !== meta.tailHash,
    previous: [...takes].reverse().find((n) => n < current) ?? null,
    next: takes.find((n) => n > current) ?? null,
  };
}

/**
 * Move a banger to another take. `direction` is `another` (write `generated` as a new
 * take), `previous` or `next` (put a kept one back). The take being left is always kept
 * first. Returns the take now current.
 */
export function moveTake(root, id, meta, { direction, generated = null, title }) {
  const state = takesState(root, id, meta);
  if (direction === 'another') {
    if (!generated) throw new Error('another take needs the new take');
    snapshotTake(root, id, state.take);
    const n = Math.max(...state.takes) + 1;
    writeBangerSong(root, { id, title, generated, take: n });
    return n;
  }
  const target = direction === 'previous' ? state.previous : direction === 'next' ? state.next : null;
  if (target == null) throw new Error(`there is no ${direction} take`);
  snapshotTake(root, id, state.take);
  restoreTake(root, id, target);
  return target;
}

/** The raw text of a kept take (for the tests). */
export const readTake = (root, id, n) => readFileSync(join(root, BANGER_TAKE_DIR, takeFileName(id, n)), 'utf8');
