// Copies: a whole song kept under a second name, promising nothing.
//
// "Save a copy…" is the desk's Save As. It writes a song file of its own — the music
// copied verbatim, the mix, arrangement and cabinet treatment the desk had at that
// moment — and marks it `group: "copy"`. What that group means is defined entirely by
// what it is NOT: no `alternateOf`, so nothing can promote it over another song; not in
// the generated game-alternates index, so the game bundle cannot see it; its own
// heading, so a shelf of snapshots never reads as a shelf of candidates.
//
// This suite pins those absences, because absences are what break silently. A copy that
// quietly acquired a parent would be one click from overwriting the song it was taken
// from — which is exactly the thing the copy exists to avoid.
//
// Like tests/song-alternates.js it works in a throwaway root, so the real catalogue is
// never touched and the serialisers under test are the desk's own.
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { songFile } from '../tools/lib/song-source.js';
import { readImported, writeImportedIndex } from '../tools/lib/imported-index.js';
import { writeSongFile } from '../tools/lib/song-file.js';
import { listTracks, registerTrack, resolveTrack, unregisterTrack } from '../src/data/tracks.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const temp = mkdtempSync(join(tmpdir(), 'mash-copies-'));
const imported = join(temp, 'src/data/imported');
const songs = join(temp, 'src/data/songs');
mkdirSync(imported, { recursive: true });
mkdirSync(songs, { recursive: true });
// The one dependency a written song file has, so the source is genuinely importable.
mkdirSync(join(temp, 'src/engine'), { recursive: true });
copyFileSync(join(process.cwd(), 'src/engine/notes.js'), join(temp, 'src/engine/notes.js'));

const BANK = {
  bpm: 120,
  bass: Array.from({ length: 32 }, (_, i) => (i % 8 === 0 ? 110 : null)),
  order: ['A'],
  sections: [{ id: 'A' }],
};
const MIX = { master: -2, lanes: { bass: { gain: -3, pan: 0.25 } } };
// A note edit lives here, not in the bank: the desk forks a bar into a layer section
// carrying `base`. So an arrangement that survives the copy IS the notes surviving it.
const ARRANGEMENT = {
  bpm: 128,
  order: ['A', 'A'],
  sections: [{ id: 'A2', base: 'A', bass: [220, null, null, null] }],
};
const VARIANTS = { neon: [{ when: 'always', patch: { master: -6 } }] };

try {
  // The song being copied: an ordinary game song, in the catalogue where built-ins live.
  writeFileSync(join(songs, 'neon.js'), songFile({
    id: 'neon', title: 'NEON BLASTERS', slug: 'neon-panic', group: 'cabinet',
    bank: BANK, mix: { master: 0 }, arrangement: null,
  }));
  const sourceBefore = readFileSync(join(songs, 'neon.js'), 'utf8');

  const copySource = songFile({
    id: 'neon-copy', title: 'NEON BLASTERS COPY', slug: 'neon-copy', group: 'copy',
    bank: BANK, mix: MIX, arrangement: ARRANGEMENT, variants: VARIANTS,
    note: 'A copy of NEON BLASTERS (neon), taken from the Song Mixer.',
  });
  writeFileSync(join(imported, 'neon-copy.js'), copySource);

  assert(!copySource.includes('alternateOf'),
    'a copy names no parent, so there is no song any button could write it over');

  const mod = await import(pathToFileURL(join(imported, 'neon-copy.js')).href);
  assert(mod.group === 'copy' && !('alternateOf' in mod),
    'the written copy loads as a module that says it is a copy and nothing else');
  assert(JSON.stringify(mod.bank.bass) === JSON.stringify(BANK.bass),
    'the copy carries the music verbatim, not a reference to the song it came from');
  assert(JSON.stringify(mod.mix) === JSON.stringify(MIX),
    'the mix on the desk is the mix the copy holds');
  assert(JSON.stringify(mod.arrangement) === JSON.stringify(ARRANGEMENT),
    'the arrangement lands whole — every bar edit and painted note with it');
  assert(JSON.stringify(mod.variants) === JSON.stringify(VARIANTS),
    'and the cabinet screen, so the snapshot is the whole song rather than the faders');
  assert(readFileSync(join(songs, 'neon.js'), 'utf8') === sourceBefore,
    'taking a copy leaves the song it was taken from byte-for-byte as it was');

  // The folder scan, which is the only thing that ever reads these files as text.
  const scanned = readImported(temp).find((e) => e.id === 'neon-copy');
  assert(scanned?.group === 'copy' && scanned?.writable && !scanned?.alternateOf,
    'the folder scan reports a copy as writable, grouped, and pointed at nothing');

  writeImportedIndex(temp);
  const indexSrc = readFileSync(join(imported, 'index.js'), 'utf8');
  assert(/"neon-copy":[^\n]*group: "copy"/.test(indexSrc) && !indexSrc.includes('alternateOf'),
    'the generated index carries the group through to registerTrack, and no parent');
  // THE one that matters. `group: "alternate"` is what lets a desk-made file into the
  // game's dev bundle; a copy must never be in that index, however it was made.
  const gameAlternatesSrc = readFileSync(join(temp, 'src/data/game-alternates.js'), 'utf8');
  assert(!gameAlternatesSrc.includes('neon-copy'),
    'a copy never reaches the game bundle — the alternates index does not import it');

  // The registry: what the desk's picker and every render tool actually see.
  registerTrack({
    id: 'neon-copy', bank: mod.bank, title: mod.title, slug: mod.slug,
    group: 'copy', writable: true,
  });
  const listed = listTracks().find((t) => t.id === 'neon-copy');
  assert(listed?.group === 'copy' && listed?.writable,
    'a copy is listed under its own heading and is a song the desk can save');
  assert(!resolveTrack('neon-copy')?.alternateOf,
    'resolveTrack hands back no parent, so "Save over …" is never offered on a copy');

  // A copy is an ordinary song from here on: mix it, save it, and it stays a copy.
  writeSongFile(temp, 'neon-copy', { mix: { master: -9 }, arrangement: ARRANGEMENT, variants: null });
  const afterSave = readFileSync(join(imported, 'neon-copy.js'), 'utf8');
  assert(afterSave.includes('export const group = "copy";') && !afterSave.includes('alternateOf'),
    'saving a copy leaves it a copy, still pointed at nothing');
  assert(readImported(temp).find((e) => e.id === 'neon-copy')?.group === 'copy',
    'and the folder still reads it as one');
  const afterMod = await import(`${pathToFileURL(join(imported, 'neon-copy.js')).href}?v=2`);
  assert(JSON.stringify(afterMod.bank.bass) === JSON.stringify(BANK.bass),
    'a save rewrites only the desk half, so the copied music is still there afterwards');
  assert(readFileSync(join(songs, 'neon.js'), 'utf8') === sourceBefore,
    'and mixing the copy still cannot reach the song it was copied from');
} finally {
  unregisterTrack('neon-copy');
  rmSync(temp, { recursive: true, force: true });
}

if (failed) process.exit(1);
console.log('\nsong copies: all checks passed');
