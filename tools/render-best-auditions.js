// Render the BEST presets so they can be heard rather than read.
//
// A table of formant frequencies is not a voice. This plays each of the ten through the
// real engine — the same offline render every WAV, stem and video uses — on a phrase that
// suits what it is: the choirs and pads sing a four-chord progression, the leads play a
// melody, the basses play a line. A pad judged on one note tells you nothing about a pad.
//
// Usage: node tools/render-best-auditions.js
// Writes work/auditions/best/<id>.wav
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { openRenderer } from './lib/render-bank-browser.js';
import { wavBuffer, dbfs } from './lib/wav.js';
import { VOICES, VOICE_LANES } from '../src/data/voices.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'work', 'auditions', 'best');
mkdirSync(outDir, { recursive: true });

// Equal temperament from A4 = 440, so the phrases below read as note names rather than as
// a column of decimals nobody can check.
const N = {
  F2: 87.31, G2: 98, A2: 110, C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196,
  A3: 220, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392,
  A4: 440, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880,
};

const rest = (n) => Array.from({ length: n }, () => null);
/** A phrase as [value, steps] pairs, padded to 32 steps. */
const phrase = (pairs) => {
  const out = [];
  for (const [v, len] of pairs) { out.push(v); out.push(...rest(len - 1)); }
  while (out.length < 32) out.push(null);
  return out.slice(0, 32);
};

// Am – F – C – G, two bars each way. Held chords, because that is what a choir does and
// it is where a formant stack proves it is a vowel rather than a filter setting.
const CHORDS = phrase([
  [[N.A3, N.C4, N.E4], 8], [[N.F3, N.A3, N.C4], 8],
  [[N.C4, N.E4, N.G4], 8], [[N.G3, N.B3, N.D4], 8],
]);

// A melody over the same changes, ending on the tonic so the release is audible.
const LEAD = phrase([
  [N.A4, 4], [N.C5, 2], [N.E5, 2], [N.D5, 4], [N.C5, 4],
  [N.E5, 2], [N.G5, 2], [N.A5, 4], [N.E5, 4], [N.A4, 6],
]);

// A line with an octave jump and a walk, so glide and the filter envelope both show.
const BASS = phrase([
  [N.A2, 2], [N.A2, 2], [N.A3, 2], [N.A2, 2],
  [N.F2, 2], [N.F2, 2], [N.F3, 2], [N.F2, 2],
  [N.C3, 2], [N.C3, 2], [N.G2, 2], [N.G2, 2],
  [N.G2, 2], [N.G3, 2], [N.G2, 2], [N.A2, 2],
]);

// Which phrase each preset gets, by what it is. Category is the honest signal here: a
// Bass belongs on the bass lane at the bass lane's measured level, and auditioning it
// anywhere else auditions a number that will not apply.
const PLAN = {
  Bass: { lane: 'bass', steps: BASS, dur: 2, bpm: 100 },
  Lead: { lane: 'lead', steps: LEAD, dur: 4, bpm: 100 },
  Pad: { lane: 'chords', steps: CHORDS, dur: 8, bpm: 76 },
  Orch: { lane: 'chords', steps: CHORDS, dur: 8, bpm: 76 },
  FX: { lane: 'lead', steps: LEAD, dur: 4, bpm: 100 },
};

const best = Object.values(VOICES).filter((v) => v.id.startsWith('best'));
if (!best.length) { console.error('no BEST presets in the catalogue'); process.exit(1); }

const renderer = await openRenderer();
const takes = [];
try {
  for (const v of best) {
    const plan = PLAN[v.category] || PLAN.Lead;
    const seam = VOICE_LANES[plan.lane];
    const bank = {
      bpm: plan.bpm,
      [plan.lane]: plan.steps,
      [seam.voiceKey]: v.id,
      [seam.durKey]: plan.dur,
    };
    // `repeat: 1` is one pass of the 32 steps; the tail is what lets a two-second
    // release finish rather than being cut off at the last step.
    const out = await renderer.render(bank, { repeat: 1, tail: 3, mix: null, trackId: null });
    takes.push({ v, plan, out });
    console.log(`${v.id.padEnd(18)} ${plan.lane.padEnd(7)} rendered at ${dbfs(out.peak).padStart(10)}`);
  }
} finally {
  await renderer.close();
}

// ONE gain across the whole set, not one per file.
//
// The engine plays every preset at its lane's measured energy target, so these come out
// where they would sit in a song — around -20 dBFS, which is correct and quiet to listen
// to. Normalising each file on its own would throw away exactly what that leveling is
// for: the choir and the bass are meant to arrive at the same loudness, and their peaks
// differ because a pad and a bass have different crest factors, not different levels.
// So the loudest take sets the gain and every file takes the same one.
const loudest = Math.max(...takes.map((t) => t.out.peak));
const gain = loudest > 0 ? 0.89 / loudest : 1;
console.log(`\nmakeup ${(20 * Math.log10(gain)).toFixed(1)} dB across all ${takes.length},`
  + ' so the set stays balanced against itself');
for (const { v, plan, out } of takes) {
  writeFileSync(join(outDir, `${v.id}.wav`), wavBuffer([out.outL, out.outR], gain));
  console.log(`${v.id.padEnd(18)} ${plan.lane.padEnd(7)} ${dbfs(out.peak * gain).padStart(10)}  ${v.label}`);
}
console.log(`\nwork/auditions/best/ — ${takes.length} files`);
