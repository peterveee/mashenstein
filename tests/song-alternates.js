// Alternates: a game song's music kept under another name until somebody decides.
//
// The desk's Save writes over the song it is on. An alternate is the other move — the
// same music, this mix and arrangement, its own file — and the whole feature rests on
// one line of source: `export const alternateOf`, written ABOVE the desk marker with
// the music. That is what the picker groups by and what "Save over …" aims at, so what
// this suite pins is that the line survives every hand the file passes through: the
// writer, the folder scan, the generated index, the registry, and — the one that would
// quietly break it — an ordinary save, which rewrites the whole tail of the file.
//
// Like tests/new-song.js this works in a throwaway root, so the real catalogue is never
// touched and the serialisers under test are the desk's own.
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { songFile } from '../tools/lib/song-source.js';
import { readImported, writeImportedIndex } from '../tools/lib/imported-index.js';
import { writableSongPath, writeSongFile } from '../tools/lib/song-file.js';
import { listTracks, registerTrack, resolveTrack, unregisterTrack } from '../src/data/tracks.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const temp = mkdtempSync(join(tmpdir(), 'mash-alternates-'));
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
const ARRANGEMENT = { bpm: 128, order: ['A', 'A'] };
const VARIANTS = { neon: [{ when: 'always', patch: { master: -6 } }] };

try {
  // The parent: an ordinary game song, in the catalogue where the built-ins live.
  writeFileSync(join(songs, 'neon.js'), songFile({
    id: 'neon', title: 'NEON BLASTERS', slug: 'neon-panic', group: 'cabinet',
    bank: BANK, mix: { master: 0 }, arrangement: null,
  }));

  const altSource = songFile({
    id: 'neon-alt', title: 'NEON BLASTERS ALT', slug: 'neon-alt', group: 'alternate',
    alternateOf: 'neon', bank: BANK, mix: MIX, arrangement: ARRANGEMENT, variants: VARIANTS,
    note: 'An alternate of NEON BLASTERS.',
  });
  writeFileSync(join(imported, 'neon-alt.js'), altSource);

  const markerAt = altSource.indexOf('// ---- THE DESK WRITES BELOW HERE');
  assert(altSource.includes('export const alternateOf = "neon";')
    && altSource.indexOf('export const alternateOf') < markerAt,
  'the parent is written above the desk marker, with the music rather than the mix');
  assert(altSource.includes('export const variants = {'),
    'an alternate carries the cabinet treatments it was forked with');

  const mod = await import(pathToFileURL(join(imported, 'neon-alt.js')).href);
  assert(mod.alternateOf === 'neon' && mod.group === 'alternate',
    'the written alternate loads as a module that names its group and its parent');
  assert(JSON.stringify(mod.mix) === JSON.stringify(MIX)
    && JSON.stringify(mod.arrangement) === JSON.stringify(ARRANGEMENT),
  'the mix and arrangement on the desk are what the alternate holds');
  assert(JSON.stringify(mod.bank.bass) === JSON.stringify(BANK.bass),
    "the alternate carries the parent's music verbatim, not a reference to it");

  // The folder scan, which is the only thing that ever reads these files as text.
  const scanned = readImported(temp).find((e) => e.id === 'neon-alt');
  assert(scanned?.group === 'alternate' && scanned?.alternateOf === 'neon' && scanned?.writable,
    'the folder scan reports an alternate as writable, grouped, and pointed at its parent');

  writeImportedIndex(temp);
  const indexSrc = readFileSync(join(imported, 'index.js'), 'utf8');
  assert(/"neon-alt":[^\n]*group: "alternate"[^\n]*alternateOf: "neon"/.test(indexSrc),
    'the generated index carries the parent through to registerTrack');
  const gameAlternatesSrc = readFileSync(join(temp, 'src/data/game-alternates.js'), 'utf8');
  assert(gameAlternatesSrc.includes("./imported/neon-alt.js")
    && gameAlternatesSrc.includes('GAME_ALT_NEON_ALT'),
  'the generated game-alternate index includes every saved alternate but no scratch bank');

  // The registry: what the desk's picker and every render tool actually see.
  registerTrack({
    id: 'neon-alt', bank: mod.bank, title: mod.title, slug: mod.slug,
    group: 'alternate', writable: true, alternateOf: 'neon',
  });
  assert(resolveTrack('neon-alt')?.alternateOf === 'neon',
    'resolveTrack hands the parent back, so "Save over …" never has to guess it');
  assert(listTracks().find((t) => t.id === 'neon-alt')?.group === 'alternate',
    'an alternate is listed under its own heading rather than falling out of the picker');

  // THE one that would break quietly. A save rewrites everything below the marker; the
  // parent lives above it, so an alternate that is mixed and saved must still be an
  // alternate afterwards — and must still be pointed at the same song.
  writeSongFile(temp, 'neon-alt', { mix: { master: -9 }, arrangement: null, variants: null });
  const afterSave = readFileSync(join(imported, 'neon-alt.js'), 'utf8');
  assert(afterSave.includes('export const alternateOf = "neon";'),
    'saving an alternate does not take its parent with it');
  assert(readImported(temp).find((e) => e.id === 'neon-alt')?.alternateOf === 'neon',
    'and the folder still reads it as an alternate of the same song');

  // Promotion: the alternate's decisions written into the parent's file, through the
  // same writer every save goes through. The music above the marker is not its business.
  const before = readFileSync(join(songs, 'neon.js'), 'utf8');
  assert(writableSongPath(temp, 'neon') === join(songs, 'neon.js'),
    'the parent of an alternate is a writable catalogue song');
  writeSongFile(temp, 'neon', { mix: MIX, arrangement: ARRANGEMENT, variants: VARIANTS });
  const after = readFileSync(join(songs, 'neon.js'), 'utf8');
  const music = (src) => src.slice(0, src.indexOf('// ---- THE DESK WRITES BELOW HERE'));
  assert(music(after) === music(before),
    'promoting an alternate leaves the song it lands on composed exactly as it was');
  const promoted = await import(`${pathToFileURL(join(songs, 'neon.js')).href}?v=2`);
  assert(JSON.stringify(promoted.mix) === JSON.stringify(MIX)
    && JSON.stringify(promoted.arrangement) === JSON.stringify(ARRANGEMENT)
    && JSON.stringify(promoted.variants) === JSON.stringify(VARIANTS),
  'and the game plays the alternate: mix, arrangement and cabinet screen all land');
  assert(!('alternateOf' in promoted),
    'the parent does not become an alternate of itself on the way');
} finally {
  unregisterTrack('neon-alt');
  rmSync(temp, { recursive: true, force: true });
}

if (failed) process.exit(1);
console.log('\nsong alternates: all checks passed');
