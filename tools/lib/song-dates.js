// When each desk song was made — what the song drawer's "Newest first" sorts by.
//
// Not the file's modified time. A desk save rewrites the song, and the tools that sweep
// the whole catalogue (a re-fade, a re-level) rewrite every file at once, so on any given
// day most of a shelf shares one mtime and "newest" would mean "touched by the last sweep".
//
// Birth time survives a rewrite in place — every song writer here writes in place — but
// not a move: the scratch drawer began as 98 songs moved out of src/data/imported/, and
// they all share that afternoon as a birthday. git remembers where each one first
// arrived. So a song's age is the EARLIER of the two: git for anything that was ever
// committed, the file itself for anything that never was.
import { execFile } from 'child_process';
import { promisify } from 'util';
import { statSync } from 'fs';
import { join } from 'path';
import { SONG_DIRS } from './imported-index.js';

// Where the game's own songs live: a cabinet or theme id is its file name here.
const BUILT_IN_DIR = 'src/data/songs';
const DIRS = [BUILT_IN_DIR, ...SONG_DIRS];

/** path -> ms of the commit that first added it, for every song file git has seen. */
async function firstCommitted(root) {
  let stdout = '';
  try {
    ({ stdout } = await promisify(execFile)('git',
      ['log', '--format=%x00%at', '--name-only', '--no-renames', '--diff-filter=A', '--', ...DIRS],
      { cwd: root, maxBuffer: 32 << 20 }));
  } catch {
    return new Map();                    // no git, or not a checkout: birth times alone
  }
  const first = new Map();
  let at = 0;
  for (const line of stdout.split('\n')) {
    if (line.startsWith('\0')) { at = Number(line.slice(1)) * 1000; continue; }
    // Newest commit first, so the last time a path turns up is the commit that added it
    // first — a song deleted and re-added keeps its original age.
    if (line) first.set(line, at);
  }
  return first;
}

/**
 * { id: ms } for every id that has a song file, or a commit that once added one.
 * An id with neither is left out, and the drawer lists it after the dated ones.
 */
export async function songCreatedDates(root, ids) {
  const committed = await firstCommitted(root);
  const out = {};
  for (const id of ids) {
    let at = Infinity;
    for (const dir of DIRS) {
      const rel = `${dir}/${id}.js`;
      if (committed.has(rel)) at = Math.min(at, committed.get(rel));
      try { at = Math.min(at, statSync(join(root, rel)).birthtimeMs); } catch { /* not here */ }
    }
    if (Number.isFinite(at) && at > 0) out[id] = Math.round(at);
  }
  return out;
}
