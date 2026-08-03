// Writing one song's file — the desk's half of it.
//
// A song file is two halves: the music above `// ---- THE DESK WRITES BELOW HERE`,
// which is the composition and is never touched, and the mix and arrangement below
// it, which are rewritten whole on every save. So saving a song rewrites ONE file,
// and only the part of it the desk owns.
//
// This is what replaced writing src/data/mix.js: that file held thirty-four songs,
// so every save rewrote all of them and two desks could not save at once without one
// clobbering the other. A per-song file cannot have that problem.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { bankSource, DESK_MARKER } from './song-source.js';
// A mix is written by its own rules — defaults left out, so the file holds decisions
// and a save produces a diff of what changed. See mix-source.js.
import { mixEntrySource, variantsSource } from './mix-source.js';

export const songPath = (root, id) => join(root, 'src/data/songs', `${id}.js`);
export const scratchSongPath = (root, id) => join(root, 'src/data/imported', `${id}.js`);

/**
 * The editable source for a track, if it has one. Built-in songs live in the
 * catalogue; scratch songs use the same desk-owned tail beside MIDI imports.
 * Legacy MIDI banks deliberately return null because they have no marker and
 * saving them would silently throw away the distinction between composition and
 * imported source.
 */
export function writableSongPath(root, id) {
  const builtIn = songPath(root, id);
  if (existsSync(builtIn)) return builtIn;
  const scratch = scratchSongPath(root, id);
  if (!existsSync(scratch)) return null;
  const src = readFileSync(scratch, 'utf8');
  return src.includes(DESK_MARKER) ? scratch : null;
}

/**
 * The mix and arrangement a song file currently holds, without importing it —
 * used by nothing yet, but the read half of this pair belongs beside the write half.
 */
export function readSongFile(root, id) {
  const path = writableSongPath(root, id);
  if (!path) return null;
  return readFileSync(path, 'utf8');
}

/**
 * Rewrite one song's mix and arrangement, leaving its music exactly as it is.
 *
 * Refuses rather than guesses when the marker is missing: without it there is no way
 * to tell the composition from the generated half, and a save that guessed wrong
 * would overwrite the music. A song that has lost its marker is a song to fix by
 * hand, not one to write over.
 */
export function writeSongFile(root, id, { mix = null, arrangement = null, variants = null } = {}) {
  const path = writableSongPath(root, id);
  if (!path) throw new Error(`no writable song file for "${id}"`);
  const src = readFileSync(path, 'utf8');
  const at = src.indexOf(DESK_MARKER);
  if (at < 0) throw new Error(`${id}.js has no "${DESK_MARKER}" line — refusing to write over it`);

  // Everything below the marker is rewritten WHOLE, so anything the caller does not
  // hand over is not preserved — it is deleted. That is why /save re-reads what the
  // file already holds for the exports the patch does not mention: saving a fader must
  // not take the cabinet treatment with it.
  const body = `${DESK_MARKER} ----------------------------------------------\n`
    + `// Rewritten whole by the mixing desk. Nothing below this line is hand-edited.\n\n`
    + `export const mix = ${(mix && mixEntrySource(mix)) || 'null'};\n\n`
    + `export const arrangement = ${arrangement ? bankSource(arrangement) : 'null'};\n\n`
    + `export const variants = ${(variants && variantsSource(variants)) || 'null'};\n`;

  writeFileSync(path, src.slice(0, at) + body);
  return path;
}

/**
 * Copy aside what the desk is about to overwrite — and ONLY that.
 *
 * Not a byte copy of the song file. A song file imports the note helpers and the
 * shared constants by relative path, so a copy of one sitting in .mix-history/
 * cannot be loaded from there: the backup is unreadable exactly when it is needed,
 * which is how a morning's work on megamix nearly went for good.
 *
 * Everything below the desk's marker is plain data with no imports, and it is the
 * only half the desk can change — the music above it is never written. So the
 * snapshot is that half, standing alone, loadable by itself for ever.
 */
export function snapshotSongFile(root, id, dir, stamp) {
  const path = writableSongPath(root, id);
  if (!path) return null;
  const src = readFileSync(path, 'utf8');
  const at = src.indexOf(DESK_MARKER);
  if (at < 0) return null;
  mkdirSync(dir, { recursive: true });
  const name = `song-${stamp}-${id}.js`;
  writeFileSync(join(dir, name),
    `// ${id} — the mix and arrangement as they stood before a save at ${stamp}.\n`
    + `// Data only, no imports: a backup has to be readable on its own.\n`
    + `// Put it back with the desk's "Open an earlier version…".\n\n`
    + src.slice(at).replace(/^\/\/.*$/gm, '').trimStart());
  return name;
}
