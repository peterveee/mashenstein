// Render the violin family so it can be heard rather than read.
//
// A pair of formant frequencies is not an instrument. These six presets differ from each
// other almost entirely in WHERE their body resonances sit — swap 460 Hz for 185 and the
// violin is a cello — so the only audition worth having plays THE SAME TUNE on each of
// them, transposed into each instrument's own register. Four files that are one melody
// four ways is the A/B that answers "is the cello a cello, or is it a violin an octave
// down"; four files playing four different tunes is four things you cannot compare.
//
// The two articulation patches get the phrase they are for instead: the section holds
// chords, because a section holding a chord is where vibrato spread proves it is a room
// full of players, and the marcato plays a detached rhythm, because that is the only
// thing it is good at.
//
// Usage: node tools/render-string-auditions.js
// Writes work/auditions/strings/<id>.wav
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { openRenderer } from './lib/render-bank-browser.js';
import { wavBuffer, dbfs } from './lib/wav.js';
import { VOICES, VOICE_LANES } from '../src/data/voices.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'work', 'auditions', 'strings');
mkdirSync(outDir, { recursive: true });

// Equal temperament from A4 = 440. Written as a function of semitones from A4 rather
// than as a table of note names, because every phrase below is stated in semitones so it
// can be moved bodily into another instrument's range.
const hz = (semisFromA4) => 440 * 2 ** (semisFromA4 / 12);

const rest = (n) => Array.from({ length: n }, () => null);
/** A phrase as [semitones-from-root, steps] pairs, padded to 32 steps. */
const phrase = (root0, pairs) => {
  const out = [];
  for (const [s, len] of pairs) {
    out.push(s == null ? null : (Array.isArray(s) ? s.map((x) => hz(root0 + x)) : hz(root0 + s)));
    out.push(...rest(len - 1));
  }
  while (out.length < 32) out.push(null);
  return out.slice(0, 32);
};

// THE TUNE. A minor-key cantabile line with two long notes in it, because the vibrato on
// every one of these patches waits between a tenth and half a second before it arrives —
// on quavers alone you would never hear the thing that makes them sound played. It ends
// held, so the release is audible too.
const TUNE = [
  [0, 4], [3, 2], [7, 2], [5, 4], [3, 4],
  [7, 2], [10, 2], [12, 6], [7, 2], [3, 4], [0, 8],
];

// Am – F – C – G, held. What a section does, and where an ensemble either sounds like
// sixteen players or like one player through a chorus.
const CHORDS = [
  [[0, 3, 7], 8], [[-4, 0, 3], 8], [[3, 7, 10], 8], [[-2, 2, 5], 8],
];

// On the string and off it again. Detached quavers with the beat left out of the middle
// of the bar, so the attack has to carry the rhythm on its own.
const MARCATO = [
  [0, 2], [0, 2], [7, 2], [null, 2], [5, 2], [5, 2], [3, 2], [null, 2],
  [0, 2], [0, 2], [7, 2], [null, 2], [10, 2], [7, 2], [0, 2], [null, 2],
];

// A4 is 0. Each instrument sits where it really sits: the violin's melody on the A and E
// strings, the viola a fifth below it, the cello an octave below THAT, and the bass an
// octave below the cello — which is also, near enough, how the four ranges actually
// stack. The lane is chosen the same way `render-best-auditions.js` chooses one: by
// where the preset's level was measured, so the audition is the level a song would get.
const PLAN = [
  { id: 'mrdrViolin', lane: 'lead', root: 0, steps: TUNE, dur: 1.6, bpm: 72 },
  { id: 'mrdrViola', lane: 'lead', root: -7, steps: TUNE, dur: 1.6, bpm: 72 },
  { id: 'mrdrCello', lane: 'lead', root: -19, steps: TUNE, dur: 1.8, bpm: 72 },
  { id: 'mrdrContrabass', lane: 'bass', root: -31, steps: TUNE, dur: 2, bpm: 72 },
  { id: 'mrdrViolinSection', lane: 'chords', root: -5, steps: CHORDS, dur: 8, bpm: 72 },
  { id: 'mrdrViolinMarcato', lane: 'lead', root: 0, steps: MARCATO, dur: 0.45, bpm: 100 },
];

const renderer = await openRenderer();
const takes = [];
try {
  for (const plan of PLAN) {
    const v = VOICES[plan.id];
    if (!v) { console.error(`${plan.id} is not in the catalogue`); process.exit(1); }
    const seam = VOICE_LANES[plan.lane];
    const bank = {
      bpm: plan.bpm,
      [plan.lane]: phrase(plan.root, plan.steps),
      [seam.voiceKey]: plan.id,
      [seam.durKey]: plan.dur,
    };
    // `tail` lets the longest release finish rather than being cut at the last step —
    // the contrabass holds for 0.72s after the note ends and the section for 0.95.
    const out = await renderer.render(bank, { repeat: 1, tail: 3, mix: null, trackId: null });
    takes.push({ v, plan, out });
    console.log(`${plan.id.padEnd(20)} ${plan.lane.padEnd(7)} rendered at ${dbfs(out.peak).padStart(10)}`);
  }
} finally {
  await renderer.close();
}

// ONE gain across the set, for the reason render-best-auditions.js states: the engine
// already levels every preset to its lane's measured energy, and normalising each file on
// its own would throw away exactly what that levelling is for. The four instruments are
// meant to arrive at the same loudness; their peaks differ because a marcato and a held
// chord have different crest factors, not different levels.
const loudest = Math.max(...takes.map((t) => t.out.peak));
const gain = loudest > 0 ? 0.89 / loudest : 1;
console.log(`\nmakeup ${(20 * Math.log10(gain)).toFixed(1)} dB across all ${takes.length},`
  + ' so the set stays balanced against itself');
for (const { v, plan, out } of takes) {
  writeFileSync(join(outDir, `${plan.id}.wav`), wavBuffer([out.outL, out.outR], gain));
  console.log(`${plan.id.padEnd(20)} ${plan.lane.padEnd(7)} ${dbfs(out.peak * gain).padStart(10)}  ${v.label}`);
}
console.log(`\nwork/auditions/strings/ — ${takes.length} files`);
