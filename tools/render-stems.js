// Per-instrument WAV stems for one music bank, plus the matching MIDI.
//
// Rendered through THE GAME'S OWN ENGINE (headless Chromium), not the old JS
// mirror: the mirror's waveforms were not band-limited and it could not see
// src/data/mix.js, so its stems were both brighter than the game and unmixed.
//
// Every stem is written at the *mix's* normalisation gain, not its own. A stem
// normalised to its own peak would be loud and useless: the point of a stem is
// that dropping all of them on a timeline at unity gives you back the mix
// exactly, so the relative balance has to survive the export. Quiet lanes
// (a single sweep across two minutes) therefore land at a low peak on purpose —
// the printed dBFS column tells you which ones those are.
//
// Usage: node tools/render-stems.js [trackId|shop|megamix|hub|…] [repeats] [outDir]
// e.g.:  node tools/render-stems.js shop 1 work/stems/shop-theme
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { openRenderer } from './lib/render-bank-browser.js';
import { wavBuffer, rmsOf, dbfs } from './lib/wav.js';
import { activeLanes } from '../src/engine/lanes.js';
import { midiBuffer, MIDI_UNSUPPORTED_LANES } from './lib/render-midi-bank.js';
import { resolveOrExit } from './lib/tracks.js';
import { bpmOf } from '../src/data/arrangements.js';

const [, , trackId = 'shop', repeatArg = '1', outArg = null] = process.argv;
const REPEAT = Math.max(1, parseInt(repeatArg, 10) || 1);
const track = resolveOrExit(trackId);
const DIR = outArg || `work/stems/${track.slug}`;
mkdirSync(DIR, { recursive: true });

// One Chromium for the whole folder: a launch costs about a second and a twelve
// lane song is thirteen renders.
const renderer = await openRenderer();

// The full mix first. Written at unity, like every stem: the balance IS the export,
// and normalising to a peak would undo the mix that produced it.
const norm = 1;
const mix = await renderer.render(track.bank, { repeat: REPEAT, trackId: track.id });
const mixName = '00-full-mix.wav';
writeFileSync(join(DIR, mixName), wavBuffer([mix.outL, mix.outR], norm));

const lanes = activeLanes(track.bank, REPEAT);
const rows = [[mixName, dbfs(mix.peak * norm), dbfs(rmsOf(mix.outL, norm))]];

const sum = new Float32Array(mix.outL.length);
for (const [i, lane] of lanes.entries()) {
  const stem = await renderer.render(track.bank, {
    repeat: REPEAT, trackId: track.id, lanes: new Set([lane.key]),
  });
  for (let n = 0; n < sum.length; n++) sum[n] += stem.outL[n];
  const file = `${String(i + 1).padStart(2, '0')}-${lane.label}.wav`;
  writeFileSync(join(DIR, file), wavBuffer([stem.outL, stem.outR], norm));
  rows.push([file, dbfs(stem.peak * norm), dbfs(rmsOf(stem.outL, norm))]);
}
await renderer.close();

// Guard the promise the folder makes. If the stems ever stop summing to the
// mix, the export is silently wrong and only an ear would catch it.
let residual = 0, energy = 0;
for (let n = 0; n < sum.length; n++) {
  residual += (sum[n] - mix.outL[n]) ** 2;
  energy += mix.outL[n] ** 2;
}
const residualDb = energy > 0 ? 10 * Math.log10(residual / energy) : -Infinity;

const midi = midiBuffer(track.bank, { repeat: REPEAT, title: track.title, bpm: bpmOf(track.bank, track.id) });
const midiName = `${track.slug}.mid`;
writeFileSync(join(DIR, midiName), midi.buffer);

const droppedFromMidi = lanes.map((l) => l.key).filter((k) => MIDI_UNSUPPORTED_LANES.includes(k));

const w = rows.reduce((m, r) => Math.max(m, r[0].length), 0);
console.log(`${DIR} — ${lanes.length} stems + full mix, ${mix.seconds.toFixed(1)}s, ${REPEAT}x form (${mix.blocks * 2} bars at ${bpmOf(track.bank, track.id)}bpm)`);
for (const [file, peak, rms] of rows) console.log(`  ${file.padEnd(w)}  peak ${peak.padStart(10)}   rms ${rms}`);
console.log(`  ${midiName.padEnd(w)}  ${midi.trackNames.length} instrument tracks`);
console.log(`  stems sum to the mix at ${residualDb.toFixed(0)} dB residual (float rounding only)`);
if (midi.trimmed) console.log(`  midi: ${midi.trimmed} notes shortened to clear a same-pitch retrigger`);
if (midi.deadPitches) console.log(`  midi: ${midi.deadPitches} unparseable 0 Hz pitches dropped — the bank plays these silent too (see chordSeq)`);
if (droppedFromMidi.length) console.log(`  note: ${droppedFromMidi.join(', ')} is in the WAV stems but has no MIDI equivalent (unpitched noise)`);
