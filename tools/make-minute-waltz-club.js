// Chopin's Minute Waltz, Op. 64 No. 1, recast from 3/4 into a four-on-the-floor rave.
// The notes below were transcribed from Mutopia's public-domain MIDI (right hand,
// original bars 1–4 and 8–11). Each three-beat phrase occupies the first three
// beats of a 4/4 bar; a second voice answers on beat four.
// https://www.ibiblio.org/mutopia/cgibin/piece-info.cgi?id=483
// Run `node tools/make-minute-waltz-club.js` to create the song.
import { existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateBanger, validateRiff } from './lib/banger/index.js';
import { songFile } from './lib/song-source.js';
import { writeImportedIndex } from './lib/imported-index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const id = 'chopin-minute-waltz-club';
const path = join(root, 'src/data/imported', `${id}.js`);
if (existsSync(path) && !process.argv.includes('--force')) {
  throw new Error(`${path} already exists; use --force to deliberately regenerate it`);
}
const bar = (events) => {
  const steps = Array(16).fill('.');
  for (const [at, note, length] of events) steps[at] = `${note}:${length}`;
  return steps.join(' ');
};
// Original bars 1–4, then the upward rush of bar 8 and the high answer at 9–11.
// The original A-flat/G/A-flat/C/B-flat circle and chromatic high descent stay
// intact; only the extra fourth beat and club-level phrasing are new.
const melody = [
  bar([[0, 'G#4', 4], [4, 'G4', 2], [6, 'G#4', 2], [8, 'C5', 2], [10, 'A#4', 2]]),
  bar([[0, 'G4', 2], [2, 'G#4', 2], [4, 'A#4', 2], [6, 'G#4', 2], [8, 'C5', 2], [10, 'A#4', 2]]),
  bar([[0, 'G4', 2], [2, 'G#4', 2], [4, 'C5', 2], [6, 'A#4', 2], [8, 'G4', 2], [10, 'G#4', 2]]),
  bar([[0, 'A#4', 2], [2, 'C5', 2], [4, 'C#5', 2], [6, 'D#5', 2], [8, 'F5', 2], [10, 'F#5', 2]]),
  bar([[0, 'A#5', 6], [6, 'G#5', 2], [8, 'F#5', 2], [10, 'F5', 2]]),
  bar([[0, 'F5', 2], [2, 'D#5', 2], [4, 'D#5', 2], [6, 'D5', 2], [8, 'D#5', 4]]),
  bar([[0, 'A#5', 6], [6, 'G#5', 2], [8, 'F#5', 2], [10, 'F5', 2]]),
  bar([[0, 'F5', 2], [2, 'D#5', 2], [4, 'D5', 2], [6, 'D#5', 2], [8, 'F5', 2], [10, 'A#4', 2]]),
];
// A short off-beat reply keeps the extra beat musical, rather than making the
// source phrase sound like a waltz with an empty beat tacked on.
const answer = [
  bar([[13, 'G#5', 1], [15, 'G5', 1]]),
  bar([[13, 'C5', 1], [15, 'A#4', 1]]),
  bar([[13, 'C5', 1], [15, 'A#4', 1]]),
  bar([[13, 'G#5', 1], [15, 'A#5', 1]]),
  bar([[13, 'D#5', 1], [15, 'F5', 1]]),
  bar([[13, 'G#5', 1], [15, 'A#5', 1]]),
  bar([[13, 'D#5', 1], [15, 'F5', 1]]),
  bar([[13, 'G#4', 1], [15, 'C#5', 1]]),
];
const bass = ['C#2', 'C#2', 'C#2', 'G#1', 'G#1', 'G#1', 'C#2', 'G#1']
  .map((note) => bar([[0, note, 4], [8, note, 2]]));
const riff = {
  version: 1,
  source: { id: 'chopin-minute-waltz-op64-1', title: 'Chopin: Minute Waltz, Op. 64 No. 1', from: 0, to: 7, bpm: 170 },
  bars: 8, grid: 16, stats: {},
  parts: [
    { key: 'lead', label: 'Minute Waltz piano', kind: 'melodic', role: 'hook', meanPitch: 77,
      voice: 'mrdrPopGrand', voiceParams: null, engineKeys: null, strip: null, bars: melody },
    { key: 'lead2', label: 'The fourth-beat answer', kind: 'melodic', role: 'counter', meanPitch: 78,
      voice: 'tngrIceBell', voiceParams: null, engineKeys: null, strip: null, bars: answer },
    { key: 'bass', label: 'D-flat anchor', kind: 'melodic', role: 'bass', meanPitch: 37,
      voice: 'bass80sFM', voiceParams: null, engineKeys: null, strip: null, bars: bass },
  ],
};
const issues = validateRiff(riff);
if (issues.length) throw new Error(issues.join('; '));

const seed = 6401;
const out = generateBanger({ riff, seed, options: {
  style: 'rave', flavour: 'happy', mood: 'euphoric', mode: 'major', riffNotes: 'keep',
  variation: 'wild', energy: 'maximum', length: 'custom', customBars: 80,
  form: { template: 'fakeout', tuneFirst: true, intro: true, build: true,
    breakdown: true, keyLift: 'whole', hardStop: true, falseEnding: true },
  parts: { bass: 'rolling', riffBass: 'replace', sub: true, chords: 'piano', square: true,
    bell: true, octaveDouble: true, thirdBelow: true, arp: true,
    arpPattern: 'syncopated', choir: true, counter: true,
    fillIn: 'passing', fillEvery: '2', fillNotes: '2', partSounds: 'style' },
  drums: { fills: true, rolls: true, crashes: true, impact: true,
    shaker: true, tambourine: true, ride: true },
  spot: { intoDrop: 'machineGun', outOf: 'wash', quiet: 'echo', ending: 'tapeStop' },
} });
const title = 'MINUTE WALTZ · FOUR TO THE FLOOR';
const note = `Chopin's Minute Waltz (Valse Op. 64 No. 1) as an 80-bar, 4/4 happy-hardcore club banger.\n`
  + `The opening circle and high answering phrase are transcribed from Mutopia's public-domain MIDI,\n`
  + `then given a fourth beat, an off-beat reply, a fake drop, and a lifted final drop.\n`
  + `Source: https://www.ibiblio.org/mutopia/cgibin/piece-info.cgi?id=483\n`
  + `Regenerate with node tools/make-minute-waltz-club.js --force.`;
writeFileSync(path, songFile({
  id, title, slug: id, group: 'imported', bank: out.bank, mix: out.mix,
  arrangement: out.arrangement, variants: null, note, seed, banger: out.banger,
}));
writeImportedIndex(root);
console.log(`${id}: ${out.summary.style} · ${out.summary.key} · ${out.summary.bpm} BPM · ${out.summary.bars} bars`);
console.log(out.form.map((f) => `${f.from}–${f.to} ${f.label}`).join(' · '));
for (const warning of out.warnings) console.log(`warning: ${warning}`);
