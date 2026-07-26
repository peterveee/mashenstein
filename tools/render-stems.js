// Per-instrument WAV stems for one music bank, plus the matching MIDI.
//
// Every stem is written at the *mix's* normalisation gain, not its own. A stem
// normalised to its own peak would be loud and useless: the point of a stem is
// that dropping all of them on a timeline at unity gives you back the mix
// exactly, so the relative balance has to survive the export. Quiet lanes
// (a single sweep across two minutes) therefore land at a low peak on purpose —
// the printed dBFS column tells you which ones those are.
//
// Usage: node tools/render-stems.js [trackId|shop|megamix|hub|…] [repeats] [outDir]
// e.g.:  node tools/render-stems.js shop 1 dist/stems/shop-theme
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { renderBank, wavBuffer, rmsOf, activeLanes } from './lib/render-bank.js';
import { midiBuffer, MIDI_UNSUPPORTED_LANES } from './lib/render-midi-bank.js';
import { resolveOrExit } from './lib/tracks.js';

const [, , trackId = 'shop', repeatArg = '1', outArg = null] = process.argv;
const REPEAT = Math.max(1, parseInt(repeatArg, 10) || 1);
const track = resolveOrExit(trackId);
const DIR = outArg || `dist/stems/${track.slug}`;
mkdirSync(DIR, { recursive: true });

const dbfs = (v) => (v > 0 ? `${(20 * Math.log10(v)).toFixed(1)} dBFS` : '-inf');

// The full mix first: its peak sets the one gain every stem is written at.
const mix = renderBank(track.bank, { repeat: REPEAT });
const norm = mix.peak > 0 ? 0.9 / mix.peak : 1;
const mixName = '00-full-mix.wav';
writeFileSync(join(DIR, mixName), wavBuffer(mix.out, norm));

const lanes = activeLanes(track.bank, REPEAT);
const rows = [[mixName, dbfs(mix.peak * norm), dbfs(rmsOf(mix.out, norm))]];

const sum = new Float32Array(mix.out.length);
lanes.forEach((lane, i) => {
  const stem = renderBank(track.bank, { repeat: REPEAT, lanes: new Set([lane.key]) });
  for (let n = 0; n < sum.length; n++) sum[n] += stem.out[n];
  const file = `${String(i + 1).padStart(2, '0')}-${lane.label}.wav`;
  writeFileSync(join(DIR, file), wavBuffer(stem.out, norm));
  rows.push([file, dbfs(stem.peak * norm), dbfs(rmsOf(stem.out, norm))]);
});

// Guard the promise the folder makes. If the stems ever stop summing to the
// mix, the export is silently wrong and only an ear would catch it.
let residual = 0, energy = 0;
for (let n = 0; n < sum.length; n++) {
  residual += (sum[n] - mix.out[n]) ** 2;
  energy += mix.out[n] ** 2;
}
const residualDb = energy > 0 ? 10 * Math.log10(residual / energy) : -Infinity;

const midi = midiBuffer(track.bank, { repeat: REPEAT, title: track.title });
const midiName = `${track.slug}.mid`;
writeFileSync(join(DIR, midiName), midi.buffer);

const droppedFromMidi = lanes.map((l) => l.key).filter((k) => MIDI_UNSUPPORTED_LANES.includes(k));

const w = rows.reduce((m, r) => Math.max(m, r[0].length), 0);
console.log(`${DIR} — ${lanes.length} stems + full mix, ${mix.seconds.toFixed(1)}s, ${REPEAT}x form (${mix.blocks * 2} bars at ${track.bank.bpm}bpm)`);
for (const [file, peak, rms] of rows) console.log(`  ${file.padEnd(w)}  peak ${peak.padStart(10)}   rms ${rms}`);
console.log(`  ${midiName.padEnd(w)}  ${midi.trackNames.length} instrument tracks`);
console.log(`  stems sum to the mix at ${residualDb.toFixed(0)} dB residual (float rounding only)`);
if (midi.trimmed) console.log(`  midi: ${midi.trimmed} notes shortened to clear a same-pitch retrigger`);
if (midi.deadPitches) console.log(`  midi: ${midi.deadPitches} unparseable 0 Hz pitches dropped — the bank plays these silent too (see chordSeq)`);
if (droppedFromMidi.length) console.log(`  note: ${droppedFromMidi.join(', ')} is in the WAV stems but has no MIDI equivalent (unpitched noise)`);
