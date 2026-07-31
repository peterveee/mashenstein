// One scratch song per style pack, so a pack can be HEARD before its sounds are chosen.
//
// ---- what this is for ---------------------------------------------------------
//
// A pack's `bank` is its opening sound set — the kick, the bass, the chord voice a
// song arrives playing. Those were picked by reading the catalogue, and a preset list
// is not a thing anybody can have an opinion about: you find out that House's piano is
// wrong for House by hearing it under House's own chords at House's own tempo, on a
// strip you can swap.
//
// So this writes one full-band scratch song per pack, at a FIXED seed. The seed is the
// whole point of the file: re-run it after changing a pack's voices and the notes are
// the same notes, so the only thing that moved is the sound. A random seed each time
// would make every comparison an argument about the tune as well.
//
// These are ordinary scratch songs — writable, deletable from the desk, out of the
// game's catalogue. They are development scaffolding for choosing pack sounds and
// nothing depends on them existing.
//
// ---- the loop they belong to ---------------------------------------------------
//
//   1. node tools/style-auditions.js      one song per pack, then restart the desk
//   2. open one, swap voices on the strips until the pack sounds right, Save
//   3. node tools/adopt-style-voices.js --style <id>
//
// Step 3 is what makes a choice permanent: it freezes the sounds into STARTER and
// repoints the pack at them. Until then this song is just a song with a mix on it.
//
// ---- running it ----------------------------------------------------------------
//
//     node tools/style-auditions.js                  write the missing ones
//     node tools/style-auditions.js --style house    just that pack
//     node tools/style-auditions.js --reset          rewrite, DISCARDING saved mixes
//     node tools/style-auditions.js --dry            say what it would write
//
// A song that already exists is left alone by default, because the mix on it is the
// work: regenerating it would throw away the voice choices you opened the desk to
// make. `--reset` is how you go back to what the pack sounds like now.
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { newScratchSong } from './lib/new-song.js';
import { writeImportedIndex, IMPORTED_DIR } from './lib/imported-index.js';
import { SONG_STYLES, STYLE_BY_ID } from './lib/song-styles.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');
const RESET = process.argv.includes('--reset');
const flag = (name) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
};

/**
 * The seed every audition is generated at, and it must never change.
 *
 * Two songs written from the same pack at the same seed differ only in their sounds,
 * which is the comparison this whole file exists to make possible.
 */
export const AUDITION_SEED = 0x5a11d;

/** Eight bars: long enough for a progression to come round, short enough to loop on. */
const BARS = 8;

/** The id and file name a pack's audition gets. Derived, so the adopt tool can find it. */
export const auditionId = (styleId) => `audition-${styleId}`;

/**
 * The desk section these land in — "Style auditions", listed after the real material.
 *
 * Not `scratch`: eleven of them arriving in Scratch songs buries whatever you were
 * working on, and these are scaffolding for choosing pack sounds rather than songs
 * anybody is writing. Not `audition` either — that group is already the parked shop
 * theme candidates, which are a different thing with the same word on them.
 */
export const AUDITION_GROUP = 'styleAudition';

// Importable as well as runnable: tools/adopt-style-voices.js reads `auditionId` and
// the seed from here rather than restating either, and must not write songs by doing so.
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (!isMain) { /* imported for the two constants above */ } else {

const only = flag('--style');
if (only && !STYLE_BY_ID[only]) {
  console.error(`no style "${only}" — one of: ${SONG_STYLES.map((s) => s.id).join(', ')}`);
  process.exit(1);
}
const styles = only ? [STYLE_BY_ID[only]] : SONG_STYLES;

const wrote = [];
const kept = [];
for (const style of styles) {
  const id = auditionId(style.id);
  const file = join(ROOT, IMPORTED_DIR, `${id}.js`);
  if (existsSync(file) && !RESET) {
    kept.push(id);
    continue;
  }
  const spec = newScratchSong({
    id,
    slug: id,
    title: `${style.label} audition`,
    group: AUDITION_GROUP,
    style: style.id,
    // Full band or there is nothing to judge: a pack's balance is its kit against its
    // instruments, and half of it playing is half of the decision.
    template: 'full-band',
    bars: BARS,
    seed: AUDITION_SEED,
  });
  if (!DRY) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, spec.source);
  }
  wrote.push(`${id}  ${spec.key}  ${spec.bpm} BPM`);
}

if (wrote.length && !DRY) writeImportedIndex(ROOT);

for (const line of wrote) console.log(`  ${RESET ? 'rewrote' : 'wrote'}  ${line}`);
if (kept.length) {
  console.log(`  kept ${kept.length} existing: ${kept.join(', ')}`);
  console.log('       (--reset to regenerate them, which DISCARDS the mixes on them)');
}
if (DRY) {
  console.log('\n--dry: nothing written.');
} else if (wrote.length) {
  console.log(`\n${wrote.length} audition song(s) in ${IMPORTED_DIR}/.`);
  // The desk registers scratch songs in its own process at start-up, so a file written
  // from outside it is not in the track list of a desk that is already running.
  console.log('Restart the mixer desk to see them, then pick sounds and Save.');
  console.log('Then: node tools/adopt-style-voices.js --style <id>');
}

}

