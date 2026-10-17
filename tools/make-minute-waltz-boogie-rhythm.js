// A separate cut of the current Desk edit, using Peter's bar 9–10 timing
// throughout the eight-bar main riff. The break and backing stay as saved.
import { existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as source from '../src/data/imported/chopin-minute-waltz-boogie-melody.js';
import { draftOf, readBarLane, barCount } from './lib/arrangement-edit.js';
import { songFile } from './lib/song-source.js';
import { writeImportedIndex } from './lib/imported-index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const id = 'chopin-minute-waltz-boogie-rhythm';
const path = join(root, 'src/data/imported', id + '.js');
if (existsSync(path) && !process.argv.includes('--force')) {
  throw new Error(path + ' already exists; use --force to deliberately regenerate it');
}

const bank = structuredClone(source.bank);
const arrangement = structuredClone(source.arrangement);
const draft = draftOf(source.bank, source.arrangement);
if (barCount(draft) !== 64) throw new Error('the saved Minute Waltz form is no longer 64 bars');

// The effective notes from the two bars Peter edited on the Desk live in
// hand-edited arrangement sections, not the original composition bank.
const templates = [8, 9].map((barIndex) => ({
  notes: readBarLane(source.bank, draft, barIndex, 'lead'),
  lengths: readBarLane(source.bank, draft, barIndex, 'leadLen'),
}));
const starts = templates.map(({ notes }) =>
  notes.flatMap((pitch, step) => pitch ? [step] : []));
if (JSON.stringify(starts) !== JSON.stringify([[0, 4, 6, 9, 11], [0, 2, 5, 7, 8, 11, 14]])) {
  throw new Error('Peter’s bars 9–10 have changed; review the rhythm before regenerating');
}

// Every odd/even bar of the main riff uses the two alternating attack/length
// patterns. Keep each bar's melodic contour when its note count differs:
// six-to-five omits a repeated approach; four-to-five repeats the passing note;
// even bars grow a short answer at the end, as Peter did with C in bar 10.
const raisedWholeTone = (hz) => hz * Math.pow(2, 2 / 12);
function fitPitches(pitches, count) {
  if (pitches.length === count) return pitches;
  if (count === 5 && pitches.length === 6) {
    return [pitches[0], pitches[1], pitches[2], pitches[3], pitches[5]];
  }
  if (count === 5 && pitches.length === 4) {
    return [pitches[0], pitches[1], pitches[2], pitches[2], pitches[3]];
  }
  if (count === 7 && pitches.length === 6) {
    return [...pitches, raisedWholeTone(pitches[5])];
  }
  if (count === 7 && pitches.length === 5) {
    return [...pitches, raisedWholeTone(pitches[4]),
      raisedWholeTone(raisedWholeTone(pitches[4]))];
  }
  throw new Error('unexpected main-riff note count: ' + pitches.length + ' for ' + count);
}

let changedBars = 0;
for (let barNumber = 1; barNumber <= 64; barNumber++) {
  if ((barNumber >= 33 && barNumber <= 40) || barNumber === 9 || barNumber === 10) continue;
  const template = templates[(barNumber - 1) % 2];
  const attacks = starts[(barNumber - 1) % 2];
  const pitches = readBarLane(source.bank, draft, barNumber - 1, 'lead').filter(Boolean);
  const fitted = fitPitches(pitches, attacks.length);
  const notes = Array(16).fill(null);
  const lengths = Array(16).fill(null);
  attacks.forEach((step, index) => {
    notes[step] = fitted[index];
    lengths[step] = template.lengths[step];
  });
  const bar = draft.plan[barNumber - 1];
  if (!bar || bar.sec == null || bar.sec >= bank.sections.length) {
    throw new Error('bar ' + barNumber + ' is no longer a bank section');
  }
  const section = bank.sections[bar.sec];
  const offset = bar.half * 16;
  for (const [key, values] of [['lead', notes], ['leadLen', lengths]]) {
    if (!section[key]) section[key] = Array(32).fill(null);
    section[key].splice(offset, 16, ...values);
  }
  changedBars++;
}

const title = 'MINUTE WALTZ · BOOGIE RHYTHM CUT';
const note = "A separate cut of Peter's edited MINUTE WALTZ · BOOGIE MELODY CUT.\n"
  + 'The entire eight-bar main riff uses the alternating attacks and expressive\n'
  + 'lengths Peter saved in bars 9–10. His original bar edits, mix,\n'
  + 'arrangement, dramatic intro, and swirling break remain intact.\n'
  + 'Source score: https://www.ibiblio.org/mutopia/cgibin/piece-info.cgi?id=483\n'
  + 'Regenerate from the current edited song with node tools/make-minute-waltz-boogie-rhythm.js --force.';
writeFileSync(path, songFile({ id, title, slug: id, group: 'imported', bank,
  mix: structuredClone(source.mix), arrangement, variants: structuredClone(source.variants),
  note, seed: source.seed, banger: structuredClone(source.banger) }));
writeImportedIndex(root);
console.log(id + ': applied Peter’s bar 9–10 rhythm through ' + changedBars + ' other main-riff bars');
