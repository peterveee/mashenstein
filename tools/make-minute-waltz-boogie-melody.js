// A separate, more recognisable melody cut of Peter's edited Boogie After Hours.
// It retains the saved backing, mix and arrangement; the score-derived hook
// gets a light rhythmic lift, and the intro and break gain melodic figures.
// Source score/MIDI: https://www.ibiblio.org/mutopia/cgibin/piece-info.cgi?id=483
// Run `node tools/make-minute-waltz-boogie-melody.js` to make the song.
import { existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as edited from '../src/data/imported/chopin-minute-waltz-boogie.js';
import * as scoreCut from '../src/data/imported/chopin-minute-waltz-club.js';
import { generateBanger, validateRiff } from './lib/banger/index.js';
import { songFile } from './lib/song-source.js';
import { writeImportedIndex } from './lib/imported-index.js';
import { n } from '../src/engine/notes.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const id = 'chopin-minute-waltz-boogie-melody';
const path = join(root, 'src/data/imported', `${id}.js`);
if (existsSync(path) && !process.argv.includes('--force')) {
  throw new Error(`${path} already exists; use --force to deliberately regenerate it`);
}
const riff = structuredClone(edited.banger.riff);
const originalHook = scoreCut.banger.riff.parts.find((part) => part.role === 'hook');
const hook = riff.parts.find((part) => part.role === 'hook');
if (!originalHook || !hook || originalHook.bars.length !== hook.bars.length) {
  throw new Error('the two Minute Waltz phrases no longer line up');
}
hook.label = 'Minute Waltz melody with a light sixteenth-step lilt';
// Keep the score's pitches and nearly all its attack grid. One short offbeat
// per bar lifts the recurring figure without the old wholesale displacement.
hook.bars = originalHook.bars.map((line, barIndex) => {
  const tokens = line.split(' ');
  const moves = [[8, 9], [4, 5], [8, 9], [6, 7], [8, 9], [4, 5], [8, 9], [4, 5]];
  const [from, to] = moves[barIndex % moves.length];
  if (tokens[from] !== '.' && tokens[to] === '.') {
    tokens[to] = tokens[from].replace(/:\d+$/, ':1');
    tokens[from] = '.';
  }
  return tokens.join(' ');
});
const issues = validateRiff(riff);
if (issues.length) throw new Error(issues.join('; '));

// Some keeps the written timing and permits a few melodic sequences. Turn off
// extra neighbour-note fills; the saved backing still supplies all its pushes.
const options = structuredClone(edited.banger.options);
options.variation = 'some';
options.parts.fillIn = 'off';
const generated = generateBanger({ riff, options, seed: edited.banger.seed });
if (generated.banger.laneOf.hook !== edited.banger.laneOf.hook
    || JSON.stringify(generated.bank.order) !== JSON.stringify(edited.bank.order)
    || generated.bank.sections.length !== edited.bank.sections.length) {
  throw new Error('the new hook does not fit the saved arrangement');
}

const bank = structuredClone(edited.bank);
const hookLane = edited.banger.laneOf.hook;
for (const key of [hookLane, `${hookLane}Len`, `${hookLane}Velocity`]) {
  if (Object.hasOwn(generated.bank, key)) bank[key] = structuredClone(generated.bank[key]);
  else delete bank[key];
  bank.sections.forEach((section, i) => {
    if (Object.hasOwn(generated.bank.sections[i], key)) {
      section[key] = structuredClone(generated.bank.sections[i][key]);
    } else delete section[key];
  });
}
// The otherwise sparse breakdown becomes an eight-bar miniature fantasia.
// An exposed opening grows into an upward rush at the end of the intro.
const setBar = (barNumber, lane, events) => {
  const section = bank.sections[Math.floor((barNumber - 1) / 2)];
  const offset = ((barNumber - 1) % 2) * 16;
  for (const key of [lane, `${lane}Len`]) {
    if (!section[key]) section[key] = Array(32).fill(null);
  }
  for (const [step, pitch, length = 1] of events) {
    section[lane][offset + step] = n(pitch);
    section[`${lane}Len`][offset + step] = length;
  }
};
const notes = (steps, pitches) =>
  steps.map((step, i) => [step, pitches[i % pitches.length]]);
setBar(1, 'lead4', notes([10, 12, 14], ['G#5', 'G5', 'G#5']));
setBar(2, 'lead4', notes([4, 7, 10, 12, 14], ['G5', 'G#5', 'A#5', 'C6', 'A#5']));
setBar(3, 'lead4', notes([1, 3, 6, 8, 10, 12, 14],
  ['G#5', 'C6', 'A#5', 'G#5', 'A#5', 'C6', 'C#6']));
setBar(4, 'lead4', notes([0, 2, 4, 6, 8, 10, 12, 13, 14, 15],
  ['A#5', 'C6', 'C#6', 'D#6', 'F6', 'F#6', 'G#6', 'A#6', 'C7', 'C#7']));

const breakArps = [
  [[3, 6, 9, 12, 14], ['G#4', 'C5', 'D#5', 'G#5', 'G5']],
  [[0, 2, 5, 7, 10, 12, 14], ['C6', 'G#5', 'D#5', 'C5', 'G#4', 'C5', 'D#5']],
  [[1, 3, 5, 8, 10, 12, 14], ['G4', 'A#4', 'D#5', 'G5', 'A#5', 'G5', 'D#5']],
  [[0, 2, 4, 6, 9, 11, 13, 15], ['G#4', 'C5', 'D#5', 'G#5', 'C6', 'G#5', 'D#5', 'C5']],
  [[0, 2, 3, 5, 7, 9, 11, 13, 15], ['G4', 'A#4', 'D#5', 'G5', 'A#5', 'D#6', 'A#5', 'G5', 'D#5']],
  [[0, 2, 4, 5, 7, 9, 11, 12, 14, 15], ['G#4', 'C5', 'D#5', 'G#5', 'C6', 'D#6', 'C6', 'G#5', 'D#5', 'C5']],
  [[0, 2, 3, 5, 6, 8, 10, 11, 13, 14], ['A#4', 'C5', 'D#5', 'F5', 'A#5', 'C6', 'D#6', 'F6', 'D#6', 'C6']],
  [[0, 2, 4, 6, 8, 10, 11, 12, 13, 14, 15], ['A#4', 'C5', 'C#5', 'D#5', 'F5', 'F#5', 'G#5', 'A#5', 'C6', 'C#6', 'D#6']],
];
breakArps.forEach(([steps, pitches], i) => setBar(33 + i, 'lead4', notes(steps, pitches)));
[
  [34, [[3, 'G#5'], [5, 'G5'], [7, 'G#5']]],
  [36, [[8, 'C6'], [10, 'A#5'], [12, 'G#5']]],
  [38, [[2, 'G5'], [4, 'G#5'], [6, 'C6'], [10, 'A#5']]],
  [40, [[5, 'A#5'], [7, 'C6'], [9, 'C#6'], [11, 'D#6']]],
].forEach(([barNumber, events]) => setBar(barNumber, 'lead6', events));

const mix = structuredClone(edited.mix);
// Peter muted the jerky hook in the source edit. The replacement must be heard;
// every other saved fader, voice, effect, mute and master setting is untouched.
if (mix.lanes?.[hookLane]) delete mix.lanes[hookLane].mute;

const title = 'MINUTE WALTZ · BOOGIE MELODY CUT';
const note = `A new cut of Peter's edited MINUTE WALTZ · BOOGIE AFTER HOURS.\n`
  + `The saved backing, mix and arrangement are copied from that song. The hook\n`
  + `lane follows the score's A-flat/G/A-flat circle and high answer with a few\n`
  + `short offbeat lifts. A rising arp intro and an eight-bar swirling break add drama.\n`
  + `The formerly muted hook is unmuted here so this new melody can be heard.\n`
  + `Source: https://www.ibiblio.org/mutopia/cgibin/piece-info.cgi?id=483\n`
  + `Regenerate from the current edited source with node tools/make-minute-waltz-boogie-melody.js --force.`;
writeFileSync(path, songFile({ id, title, slug: id, group: 'imported', bank,
  mix, arrangement: structuredClone(edited.arrangement), variants: structuredClone(edited.variants),
  note, seed: edited.seed, banger: generated.banger }));
writeImportedIndex(root);
console.log(`${id}: copied the edited mix and arrangement; replaced ${bank.sections.length} hook sections`);
for (const warning of generated.warnings) console.log(`warning: ${warning}`);
