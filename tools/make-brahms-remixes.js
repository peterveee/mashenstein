// Four distinct arrangements of the opening melody of Brahms' Wiegenlied, Op. 49 No. 4.
// Source: OpenScore/Lieder CC0 transcription, lc5701612.mscx. The original 3/4
// phrase is adapted to the Banger's 4/4 grid; pitch order and its repeated-note
// openings are retained. Run `node tools/make-brahms-remixes.js` to regenerate.
import { writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateBanger, validateRiff } from './lib/banger/index.js';
import { songFile } from './lib/song-source.js';
import { writeImportedIndex } from './lib/imported-index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bar = (events) => {
  const steps = Array(16).fill('.');
  for (const [at, note, length] of events) steps[at] = `${note}:${length}`;
  return steps.join(' ');
};
// The score's opening: G G | B♭ G G | B♭ | E♭ D C | C B♭ F G |
// A♭ F F G | A♭ F A♭ | D C B♭ D | E♭. Enharmonic sharps are used by the engine.
const melody = [
  bar([[8, 'G4', 2], [12, 'G4', 2]]),
  bar([[0, 'A#4', 6], [8, 'G4', 2], [12, 'G4', 4]]),
  bar([[0, 'A#4', 4], [8, 'G4', 2], [12, 'A#4', 2]]),
  bar([[0, 'D#5', 4], [4, 'D5', 6], [12, 'C5', 2]]),
  bar([[0, 'C5', 4], [4, 'A#4', 4], [8, 'F4', 2], [12, 'G4', 2]]),
  bar([[0, 'G#4', 4], [4, 'F4', 4], [8, 'F4', 2], [12, 'G4', 2]]),
  bar([[0, 'G#4', 4], [8, 'F4', 2], [12, 'G#4', 2]]),
  bar([[0, 'D5', 2], [2, 'C5', 2], [4, 'A#4', 4], [8, 'D5', 4], [12, 'D#5', 4]]),
];
// A second, deliberately off-beat voice answers the held notes and the holes
// between phrases. The Banger also writes a separate chord-aware counter-line;
// this one is the recurring, recognizable reply across all four remixes.
const answer = [
  bar([[3, 'F5', 2], [7, 'D5', 1]]),
  bar([[6, 'F5', 2], [10, 'D5', 2]]),
  bar([[4, 'F5', 2], [10, 'D5', 2]]),
  bar([[10, 'G4', 2], [14, 'A#4', 2]]),
  bar([[10, 'D5', 2], [14, 'F5', 2]]),
  bar([[10, 'C5', 2], [14, 'D5', 2]]),
  bar([[4, 'D5', 2], [10, 'F5', 2]]),
  bar([[6, 'G4', 2]]),
];
const riff = {
  version: 1, source: { id: 'brahms-wiegenlied-op49-4', title: 'Brahms: Wiegenlied, Op. 49 No. 4', from: 0, to: 7, bpm: 92 },
  bars: 8, grid: 16, stats: {},
  parts: [
    { key: 'lead', label: 'Lullaby melody', kind: 'melodic', role: 'hook', meanPitch: 70,
      voice: 'mrdrElectricGrand', voiceParams: null, engineKeys: null, strip: null, bars: melody },
    { key: 'lead2', label: 'After-hours answer', kind: 'melodic', role: 'counter', meanPitch: 73,
      voice: 'tngrIceBell', voiceParams: null, engineKeys: null, strip: null, bars: answer },
  ],
};
const issues = validateRiff(riff);
if (issues.length) throw new Error(issues.join('; '));

const versions = [
  { id: 'brahms-lullaby-italo', title: 'LULLABY AFTER DARK · ITALO DISCO', style: 'italo-disco', mood: 'boss', mode: 'harmonic', flavour: 'style', voice: 'bestRobotVox', answerVoice: 'tngrBerlinSignal', seed: 4904, form: 'club', bass: 'funk', chords: 'stabs', fill: 'passing' },
  { id: 'brahms-lullaby-synthwave', title: 'NEON GOODNIGHT · DARKSYNTH', style: 'synthwave', mood: 'dark', mode: 'phrygian', flavour: 'darksynth', voice: 'bestPwmHollowLead', answerVoice: 'tngrIceBell', seed: 4905, form: 'fakeout', bass: 'gallop', chords: 'stabs', fill: 'neighbour' },
  { id: 'brahms-lullaby-triphop', title: 'SLEEPWALK RADIO · TRIP-HOP', style: 'downtempo', mood: 'mystery', mode: 'harmonic', flavour: 'triphop', voice: 'mrdrMutedTrumpet', answerVoice: 'cryptTheremin', seed: 4906, form: 'groove', bass: 'funk', chords: 'piano', fill: 'passing' },
  { id: 'brahms-lullaby-jungle', title: 'ROCK-A-BYE BREAKS · JUNGLE', style: 'dnb', mood: 'boss', mode: 'harmonic', flavour: 'jungle', voice: 'tngrWireHarp', answerVoice: 'tngrIceBell', seed: 4907, form: 'club', bass: 'gallop', chords: 'stabs', fill: 'neighbour' },
];

for (const v of versions) {
  const path = join(root, 'src/data/imported', `${v.id}.js`);
  if (existsSync(path) && !process.argv.includes('--force')) {
    throw new Error(`${path} already exists; use --force to deliberately regenerate it`);
  }
  const voicedRiff = { ...riff, parts: riff.parts.map((part) => ({
    ...part, voice: part.role === 'hook' ? v.voice : v.answerVoice,
  })) };
  const out = generateBanger({ riff: voicedRiff, seed: v.seed, options: {
    style: v.style, flavour: v.flavour, mood: v.mood, mode: v.mode, riffNotes: 'fit',
    variation: 'wild', energy: 'maximum', length: 'custom', customBars: 64,
    form: { template: v.form, tuneFirst: true, drop2Way: 'answer', hardStop: true,
      falseEnding: v.id.endsWith('jungle'), keyLift: 'none' },
    parts: { bass: v.bass, chords: v.chords, sub: true, square: true, bell: true,
      octaveDouble: true, thirdBelow: true, arp: true, arpPattern: 'syncopated',
      choir: true, counter: true, fillIn: v.fill, fillEvery: '2', fillNotes: 'all' },
    drums: { fills: true, shaker: true, tambourine: true, ride: true },
  } });
  const note = `Based on Johannes Brahms' Wiegenlied (Lullaby and Goodnight), Op. 49 No. 4.\n`
    + `The public-domain opening melody is adapted from 3/4 to this 4/4 arrangement.\n`
    + `${out.summary.style} at ${out.summary.bpm} BPM; the melody is recast in ${v.mode} mode.\n`
    + `An off-beat answering voice, wild phrase variations and layered counter-lines play against the hook.\n`
    + `Source score: https://github.com/OpenScore/Lieder/blob/main/scores/Brahms,_Johannes/5_Lieder,_Op.49/4_Wiegenlied/lc5701612.mscx\n`
    + `Regenerate with node tools/make-brahms-remixes.js --force.`;
  writeFileSync(path, songFile({
    id: v.id, title: v.title, slug: v.id, group: 'imported', bank: out.bank,
    mix: out.mix, arrangement: out.arrangement, variants: null, note, seed: v.seed,
    banger: out.banger,
  }));
  console.log(`${v.id}: ${out.summary.style}, ${out.summary.bpm} BPM, ${out.summary.bars} bars, ${out.warnings.length} warnings`);
  for (const w of out.warnings) console.log(`  ${w}`);
}
writeImportedIndex(root);
