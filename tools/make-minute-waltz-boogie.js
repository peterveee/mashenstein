// A second Minute Waltz remix: the same score-derived 4/4 phrase, pushed off
// the beat over 808 boogie, slap bass, clav chops and call-and-response horns.
// Source MIDI: https://www.ibiblio.org/mutopia/cgibin/piece-info.cgi?id=483
// Run `node tools/make-minute-waltz-boogie.js` to create the separate mixer song.
import { existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as club from '../src/data/imported/chopin-minute-waltz-club.js';
import { generateBanger, validateRiff } from './lib/banger/index.js';
import { songFile } from './lib/song-source.js';
import { writeImportedIndex } from './lib/imported-index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const id = 'chopin-minute-waltz-boogie';
const path = join(root, 'src/data/imported', `${id}.js`);
if (existsSync(path) && !process.argv.includes('--force')) {
  throw new Error(`${path} already exists; use --force to deliberately regenerate it`);
}
const bar = (events) => {
  const steps = Array(16).fill('.');
  for (const [at, note, length] of events) steps[at] = `${note}:${length}`;
  return steps.join(' ');
};
const syncopate = (line, barIndex) => {
  const hits = line.split(' ').flatMap((token, at) => token === '.' ? [] : [[at, ...token.split(':')]]);
  const shifted = hits.map(([at, note, length], i) => {
    // The famous first note and each high A-sharp entrance remain on the one.
    // Other attacks push into sixteenth off-beats, differently in alternate bars.
    const push = barIndex % 2 === 0 ? i > 0 : i % 2 === 0;
    const newAt = push ? Math.min(11, at + 1) : at;
    return [newAt, note, Math.min(Number(length || 1), Math.max(1, 13 - newAt))];
  });
  return bar(shifted);
};
const riff = structuredClone(club.banger.riff);
riff.source = { ...riff.source, id: 'chopin-minute-waltz-boogie-source', bpm: 116 };
for (const part of riff.parts) {
  if (part.role === 'hook') {
    part.label = 'Waltz off the beat';
    part.voice = 'bestRobotVox';
    part.bars = part.bars.map(syncopate);
  } else if (part.role === 'counter') {
    part.label = 'Horn replies';
    part.voice = 'bestPwmBrass';
  } else if (part.role === 'bass') {
    part.label = 'Slap-push bass cue';
    part.voice = 'bass80sFM';
    part.bars = part.bars.map((line) => {
      const rootNote = line.split(' ')[0].split(':')[0];
      const octave = rootNote.replace(/\d+$/, (n) => String(Number(n) + 1));
      return bar([[0, rootNote, 2], [3, octave, 1], [7, rootNote, 1],
        [10, octave, 2], [14, rootNote, 1]]);
    });
  }
}
const issues = validateRiff(riff);
if (issues.length) throw new Error(issues.join('; '));

const seed = 6427;
const out = generateBanger({ riff, seed, options: {
  style: 'electro-funk', flavour: 'boogie', mood: 'funky', mode: 'major', riffNotes: 'keep',
  variation: 'more', energy: 'huge', tempo: 'custom', bpm: 116,
  length: 'custom', customBars: 64,
  form: { template: 'club', tuneFirst: true, intro: true, build: true,
    breakdown: true, secondDrop: true, doubleDrop: false, keyLift: 'none',
    drop2Way: 'answer', hardStop: false, falseEnding: false },
  parts: { bass: 'funk', riffBass: 'replace', sub: false, chords: 'piano',
    square: false, bell: false, octaveDouble: false, thirdBelow: false,
    arp: true, arpPattern: 'syncopated', choir: false, counter: true,
    fillIn: 'neighbour', fillEvery: '4', fillNotes: '1', partSounds: 'style' },
  drums: { fills: true, rolls: false, crashes: true, impact: false,
    shaker: false, tambourine: true, congas: true, cowbell: true, ride: false },
  fx: { riser: false, filterBuild: true, stutter: false, pump: false,
    delayThrows: true },
  spot: { intoDrop: 'repeat', outOf: 'throw', quiet: 'none', ending: 'echo' },
} });
const title = 'MINUTE WALTZ · BOOGIE AFTER HOURS';
const note = `A separate 4/4 boogie remix of Chopin's Minute Waltz, Op. 64 No. 1.\n`
  + `The score-derived piano phrase from MINUTE WALTZ · FOUR TO THE FLOOR is pushed onto\n`
  + `sixteenth off-beats; an 808 groove, slap bass, clav and horns answer its gaps.\n`
  + `Source: https://www.ibiblio.org/mutopia/cgibin/piece-info.cgi?id=483\n`
  + `Regenerate with node tools/make-minute-waltz-boogie.js --force.`;
writeFileSync(path, songFile({ id, title, slug: id, group: 'imported',
  bank: out.bank, mix: out.mix, arrangement: out.arrangement, variants: null,
  note, seed, banger: out.banger }));
writeImportedIndex(root);
console.log(`${id}: ${out.summary.style} · ${out.summary.key} · ${out.summary.bpm} BPM · ${out.summary.bars} bars`);
console.log(out.form.map((f) => `${f.from}–${f.to} ${f.label}`).join(' · '));
for (const warning of out.warnings) console.log(`warning: ${warning}`);
