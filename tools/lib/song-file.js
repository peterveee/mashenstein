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
import { join, relative } from 'path';
// `deskTail` is THE builder of the desk-owned half — creation (`songFile`) and save
// (here) write the identical shape, so neither can reformat the other's work. The mix
// serialisers this file used to import live behind it now; see the note over deskTail.
import { deskTail, DESK_MARKER } from './song-source.js';

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
export function writeSongFile(root, id, { mix = null, arrangement = null, variants = null, m8trx = null } = {}) {
  const path = writableSongPath(root, id);
  if (!path) throw new Error(`no writable song file for "${id}"`);
  const src = readFileSync(path, 'utf8');
  const at = src.indexOf(DESK_MARKER);
  if (at < 0) throw new Error(`${id}.js has no "${DESK_MARKER}" line — refusing to write over it`);

  // Everything below the marker is rewritten WHOLE, so anything the caller does not
  // hand over is not preserved — it is deleted. That is why /save re-reads what the
  // file already holds for the exports the patch does not mention: saving a fader must
  // not take the cabinet treatment with it.
  //
  // `deskTail` is shared with `songFile` — creation and save write the identical
  // shape, so the first save of a new song diffs as what changed, not as a reformat.
  const body = deskTail({ mix, arrangement, variants, m8trx });

  writeFileSync(path, src.slice(0, at) + body);
  return path;
}

/**
 * Copy aside what the desk is about to overwrite — and ONLY that.
 *
 * Not a byte copy of the song file. A song file imports the note helpers and the
 * shared constants by relative path, so a copy of one sitting in work/mix-history/
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
  const data = src.slice(at).replace(/^\/\/.*$/gm, '').trimStart();
  writeFileSync(join(dir, name),
    `// ${id} — the mix and arrangement as they stood before a save at ${stamp}.\n`
    + `// Put it back with the desk's "Open an earlier version…".\n\n`
    + notesImport(root, dir, data)
    + data);
  return name;
}

/**
 * The one import a snapshot may need, aimed from where the snapshot LIVES.
 *
 * An arrangement is not numbers. `bankSource` writes its note rows in the same
 * `seq('E2 . . .')` shorthand the banks are authored in, and that is a function — one
 * the song file imports two lines above the marker, which is exactly the half a
 * snapshot does not copy. So a snapshot of any song with a re-noted arrangement
 * threw `ReferenceError: seq is not defined` the moment you tried to open it: the
 * backup was unreadable precisely when it was wanted. It cost the SPEED ZONE mix.
 *
 * The header used to promise "no imports". It could not keep that promise and hold
 * an arrangement, so it makes a smaller one instead: at most this line, resolved
 * against the snapshot's own folder rather than copied from the song's, and written
 * only when the body actually calls a helper.
 *
 * The helper list is READ from notes.js rather than written out here. A hand-kept list
 * is the same bug waiting: add a shorthand to the note helpers, teach `bankSource` to
 * emit it, and every snapshot taken after that is unopenable again — discovered, as
 * this one was, on the day someone needs a backup. Reading the exports means the list
 * cannot fall behind. An unused import costs nothing; a missing one costs a mix.
 */
export function notesImport(root, dir, body) {
  const used = noteHelpers(root)
    .filter((fn) => new RegExp(`\\b${fn}\\(`).test(body));
  if (!used.length) return '';
  let rel = relative(dir, join(root, 'src/engine/notes.js')).split('\\').join('/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return `// The note shorthand the arrangement below is written in.\n`
    + `import { ${used.join(', ')} } from '${rel}';\n\n`;
}

/** Every function src/engine/notes.js exports, so the list above cannot go stale. */
let helperCache = null;
function noteHelpers(root) {
  if (helperCache) return helperCache;
  const src = readFileSync(join(root, 'src/engine/notes.js'), 'utf8');
  helperCache = [...src.matchAll(/^export function (\w+)/gm)].map((m) => m[1]);
  return helperCache;
}
