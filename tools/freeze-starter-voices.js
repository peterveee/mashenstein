// Freeze the sounds the style packs are written for, into the STARTER table.
//
// ---- the problem this exists for ---------------------------------------------
//
// A pack named library presets: `bassVoice: 'roundMono'`. The library is editable — the
// desk's voice editor writes src/data/voices.js, which is the whole point of it — so
// "House Bass 1 is a square wave" was only true until somebody made it a sine. And not
// just for the songs already made: every song generated AFTER that edit would come out
// a sine too, because the pack was never holding a sound, it was holding a NAME, and
// the name resolved to whatever the library happened to hold at generate time.
//
// That is the failure. A starter is supposed to be a known-good place to start; a
// starter that quietly follows the library is a starter that can be broken from a
// panel three tabs away, by an edit that was about something else entirely.
//
// ---- what it does instead ------------------------------------------------------
//
// The packs name entries in STARTER, which is a COPY of the library taken at the moment
// this ran, and which nothing can write. `TABLES` in tools/lib/voices-source.js is the
// list of tables an editor may touch, and STARTER is not in it — so `tableOf` cannot
// find a starter id, `upsertPreset` has nowhere to put one, and the desk's /voice-save
// refuses one outright. Edit `Round Mono` all you like: the library entry changes, the
// starter beside it does not, and the next song generated in Electropop is the square
// it has always been.
//
// The copy is COMPLETE, deliberately, and for the same reason a song's own copy of a
// preset is complete — see registerSongVoice. A diff against the library entry would
// be a reference to the thing we are trying not to depend on.
//
// ---- running it ----------------------------------------------------------------
//
//     node tools/freeze-starter-voices.js          rewrite STARTER, repoint the packs
//     node tools/freeze-starter-voices.js --dry    say what it would do
//
// It is not part of a build and should almost never run. Running it RE-FREEZES: every
// starter is retaken from the library as it stands now, which is the one way a starter
// sound is ever meant to change, and it is why this is a script you type rather than a
// step that happens to you. After it, run tools/measure-voices.js — the new entries have
// no levels until something measures them.
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { emitEntry } from './lib/voices-source.js';
import { VOICES } from '../src/data/voices.js';
import { SONG_STYLES } from './lib/song-styles.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VOICES_FILE = join(ROOT, 'src/data/voices.js');
const STYLES_FILE = join(ROOT, 'tools/lib/song-styles.js');
const DRY = process.argv.includes('--dry');

/**
 * `roundMono` -> `stRoundMono`.
 *
 * A prefix rather than a suffix so the whole frozen set sorts together everywhere it
 * is listed, and a short one because these ids are read in the packs, on the strips
 * and in every generated song file.
 */
const starterId = (id) => `st${id[0].toUpperCase()}${id.slice(1)}`;

/** The label a strip shows. It has to say which of the two it is. */
const starterLabel = (label) => `${label} (starter)`;

// Every preset any pack names, in the order the packs name them — so the table reads
// as the packs do rather than as a hash order nobody chose.
const wanted = [];
for (const style of SONG_STYLES) {
  for (const [key, id] of Object.entries(style.bank)) {
    if (!key.endsWith('Voice') || wanted.includes(id)) continue;
    wanted.push(id);
  }
}

const missing = wanted.filter((id) => !VOICES[id]);
if (missing.length) {
  console.error(`the packs name ${missing.length} preset(s) that are not in the catalogue: ${missing.join(', ')}`);
  process.exit(1);
}
// A pack that already names a starter is a pack that has been through this before. Its
// sound is the frozen one, and re-freezing from it would be a copy of a copy.
const already = wanted.filter((id) => VOICES[id].starter);
const fresh = wanted.filter((id) => !VOICES[id].starter);

const entries = [];
for (const id of fresh) {
  const v = VOICES[id];
  if (v.kind === 'engine') {
    console.error(`${id} is an engine preset — a pack cannot name one, so it cannot be frozen either`);
    process.exit(1);
  }
  // `kind` is stated rather than derived: STARTER holds tone, noise and drum entries
  // together, so the table it sits in no longer says what builds it.
  entries.push(emitEntry(starterId(id), { ...v, label: starterLabel(v.label) },
    { derived: ['id', 'level', 'peak'] }));
}

const table = `const STARTER = {\n${entries.join('\n')}\n};`;
const src = readFileSync(VOICES_FILE, 'utf8');
if (!/const STARTER = \{[\s\S]*?\n\};/.test(src)) {
  console.error('src/data/voices.js has no STARTER table to write into.');
  process.exit(1);
}
const nextVoices = src.replace(/const STARTER = \{[\s\S]*?\n\};/, () => table);

// And the packs, repointed. Only the voice keys: a pack's `bank` also carries trims and
// echo settings, and this has no business in those.
let styles = readFileSync(STYLES_FILE, 'utf8');
let repointed = 0;
for (const id of fresh) {
  const re = new RegExp(`(\\w+Voice: )'${id}'`, 'g');
  styles = styles.replace(re, (_, key) => { repointed++; return `${key}'${starterId(id)}'`; });
}

console.log(`${wanted.length} preset(s) named by the packs`);
if (already.length) console.log(`  ${already.length} already frozen: ${already.join(', ')}`);
console.log(`  ${fresh.length} frozen into STARTER, ${repointed} pack reference(s) repointed`);
if (DRY) {
  console.log('\n--dry: nothing written.');
} else {
  writeFileSync(VOICES_FILE, nextVoices);
  writeFileSync(STYLES_FILE, styles);
  console.log('\nwrote src/data/voices.js and tools/lib/song-styles.js');
  console.log('now run: node tools/measure-voices.js   (the new entries have no levels yet)');
}
