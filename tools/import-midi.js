// CLI for the MIDI import. The conversion lives in lib/midi-import.js, shared with
// the mixing desk's Import MIDI button so both produce exactly the same bank.
//
// Every part of the file lands on a lane of its own — nothing is merged — so a track
// past the engine's six pitched lanes becomes a layer (`lead2`) and is listed below as
// a new strip. `--map` places a part by hand and takes a layer key as readily as a
// lane one, which is how you say "these two go under the organ, not the lead".
//
// Usage:
//   node tools/import-midi.js song.mid [--bpm=120] [--name="MY SONG"] [--out=path]
//   node tools/import-midi.js song.mid --map="Piano 1:chords,Fretless:bass" --dry
//   node tools/import-midi.js song.mid --map="Strings:organChords,Pad:organChords2"
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, basename, join } from 'path';
import { fileURLToPath } from 'url';
import { bankFromMidi } from './lib/midi-import.js';
import { writeImportedIndex, importId, slugFor, IMPORTED_DIR } from './lib/imported-index.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flags = {};
const positional = [];
for (const arg of argv) {
  const m = /^--([\w-]+)(?:=(.*))?$/.exec(arg);
  if (m) flags[m[1]] = m[2] === undefined ? true : m[2];
  else positional.push(arg);
}
// Rebuild the folder's index and stop. For when a bank in there has been renamed or
// deleted by hand and the list no longer matches what is on disk.
//
// Before the registry is loaded, deliberately: repairing a broken list must not need
// the broken list to load first.
if (flags.reindex) {
  const listed = writeImportedIndex(ROOT);
  console.log(`${IMPORTED_DIR}/index.js — ${listed.length} song${listed.length === 1 ? '' : 's'}`);
  for (const e of listed) console.log(`  ${e.id.padEnd(24)} ${e.title}`);
  process.exit(0);
}

const FILE = positional[0];
if (!FILE) {
  console.error('usage: node tools/import-midi.js song.mid [--bpm=N] [--name=TITLE] [--out=path] [--map=Track:lane,...] [--dry]');
  console.error('       node tools/import-midi.js --reindex   (rebuild src/data/imported/index.js)');
  process.exit(1);
}

// The filename becomes the track id, so it is slugified rather than kept as typed:
// importing SONG.MID twice edits one song called `song`, not two called SONG and
// song. Settled BEFORE the conversion now, because the bank writes its own id into
// the file the way every other song file does.
const { resolveTrack } = await import('./lib/tracks.js');
const id = importId(ROOT, slugFor(basename(FILE)), (x) => !!resolveTrack(x));

let out;
try {
  out = bankFromMidi(readFileSync(FILE), {
    id, name: flags.name, bpm: flags.bpm, map: flags.map, from: basename(FILE),
  });
} catch (err) {
  console.error(`${FILE}: ${err.message}`);
  process.exit(1);
}

console.log(FILE);
console.log(`  ${out.bpm} bpm${flags.bpm ? ' (from --bpm)' : out.fromFileTempo ? ' (from the file)' : ' (no tempo in the file — assumed)'}`
  + `, ${out.ppq} ppq, format ${out.format}`);
const layerKeys = new Set(out.layers.map((l) => l.key));
for (const a of out.assignments) {
  const layer = a.lane.split(' ').some((k) => layerKeys.has(k));
  console.log(`  ${a.name.padEnd(20)} -> ${a.lane.padEnd(14)} ${String(a.notes).padStart(4)} notes`
    + (layer ? '   (a new strip — give it a voice)' : ''));
}
console.log(`  ${out.blocks} blocks -> ${out.sections} unique section${out.sections === 1 ? '' : 's'}`
  + `, order [${out.order.join(', ')}]`);
// The grid it chose, and what it could not hold. Both matter and they are different
// things: a note that had to move is a note this song plays differently from the file,
// and `bestGrid === resolution` says no grid we have would have done better — the music
// is finer than the format goes (a 64th, a grace note, an unquantised performance).
console.log(`  grid ${out.resolution} steps/bar`
  + (out.resolution === 16 ? '' : ` (${out.tripletEvidence} triplet onsets no swing could produce)`));
if (out.moved) {
  console.log(`  ${out.moved} note${out.moved === 1 ? '' : 's'} moved onto that grid`
    + (out.unplaced && out.bestGrid === out.resolution
      ? ' — no grid this format has would hold them exactly'
      : out.bestGrid !== out.resolution ? ` — ${out.bestGrid} would fit more` : ''));
}
if (out.foreignDrums.length) {
  console.log(`  GM percussion outside our kit: ${out.foreignDrums.join(', ')}`);
}
if (out.unknownLanes.length) console.log(`  note: ${out.unknownLanes.join(', ')} is not a lane this engine plays`);
// Said plainly, because it is the one thing about a big import that surprises: the
// parts past the engine's six pitched lanes are all there, on lanes of their own, and
// they make no sound until a preset is chosen for each. Silence you can see beats a
// part quietly overwritten by the next one, which is what used to happen instead.
if (out.layers.length) {
  console.log(`  ${out.layers.length} part${out.layers.length === 1 ? '' : 's'} past the engine's own lanes `
    + `-> ${out.layers.map((l) => l.key).join(', ')}`);
  console.log('    they play nothing until you pick a voice for each on the desk');
}

// --out still puts the file wherever you say, and a bank outside the imported folder
// is just source — nothing lists it.
const OUT = flags.out || join(IMPORTED_DIR, `${id}.js`);
if (flags.dry) {
  console.log(`\n${out.source}`);
} else {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, out.source);
  console.log(`\nwrote ${OUT} — ${out.title}`);
  if (flags.out) {
    console.log('  outside src/data/imported, so it is not a track — move it there and'
      + ' run --reindex to play it');
  } else {
    writeImportedIndex(ROOT);
    console.log(`  it is a track now: ${id}`);
    console.log(`  hear it:   npm run mixer   (song picker -> imported)`);
    console.log(`  render it: node tools/render-track.js ${id}`);
  }
}
