// The Doubler, on a part, so it can be heard rather than read off a bench.
//
// tools/measure-doubler.js proves the effect does what it claims to a hundredth of a
// cent. That is a different question from whether it sounds like a second take, and
// only one of the two can be settled by looking at numbers — so this renders Plumber's
// lead through the real engine at a spread of settings, back to back with the dry, into
// one reel. A/B is the whole point: each doubled pass is preceded by the untouched lane
// so the comparison is two seconds apart rather than two files apart.
//
// The last two passes put the effect in a full mix, because a doubler that sounds
// wonderful soloed and vanishes under drums has still failed.
//
// Usage: node tools/render-doubler-audition.js [outPath]
// Writes dist/doubler-audition.wav
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { openRenderer, SR } from './lib/render-bank-browser.js';
import { wavBuffer, rmsOf, dbfs } from './lib/wav.js';
import { resolveTrack } from '../src/data/tracks.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = resolve(process.argv[2] || join(root, 'work', 'auditions', 'misc', 'doubler-audition.wav'));

const TRACK = 'plumber';
const LANE = 'lead';
const GAP_S = 0.6;

// A lane on its own, so the effect is not competing with a mix for attention.
const SOLO = new Set([LANE]);

/** One pass: what to call it, what to gate to, and what the lane's chain is. */
const PASSES = [
  { label: 'LEAD, DRY', lanes: SOLO, fx: null },
  { label: 'LEAD + DOUBLER, defaults (9ct, 18ms, width 0.85)', lanes: SOLO, fx: {} },
  { label: 'LEAD, DRY', lanes: SOLO, fx: null },
  { label: 'LEAD + DOUBLER, wide (14ct, width 1)', lanes: SOLO, fx: { detune: 14, width: 1, wet: 0.55 } },
  { label: 'LEAD, DRY', lanes: SOLO, fx: null },
  // The reason the two pans exist — see the note Peter asked for them in.
  { label: 'LEAD + DOUBLER, HARD SPLIT: dry left, doubles right',
    lanes: SOLO, fx: { dryPan: -1, wetPan: 1, width: 0, wet: 0.5 } },
  { label: 'LEAD, DRY', lanes: SOLO, fx: null },
  { label: 'LEAD + DOUBLER, heavy (25ct, drift 0.7, wet 0.7)',
    lanes: SOLO, fx: { detune: 25, depth: 0.7, frequency: 0.6, wet: 0.7 } },
  { label: 'LEAD + DOUBLER, tight and nearly dry (5ct, 12ms, wet 0.3)',
    lanes: SOLO, fx: { detune: 5, delayMs: 12, wet: 0.3 } },
  { label: 'FULL MIX, DRY', lanes: null, fx: null },
  { label: 'FULL MIX + DOUBLER on the lead, defaults', lanes: null, fx: {} },
];

const track = resolveTrack(TRACK);
const bank = track.bank || track;

const L = [];
const R = [];
const index = [];
const silence = Math.round(GAP_S * SR);

const renderer = await openRenderer();
try {
  for (const pass of PASSES) {
    // `mix: null` for the dry passes and a mix carrying ONLY the doubler for the wet
    // ones, so what is being compared is the effect and nothing else — the song's own
    // saved mix would otherwise change under the comparison as it is edited.
    const mix = pass.fx ? { lanes: { [LANE]: { effects: [{ id: 'doubler', params: pass.fx }] } } } : null;
    const { outL, outR, peak } = await renderer.render(bank, {
      repeat: 1, lanes: pass.lanes, mix, trackId: null, tail: 1.5,
    });
    index.push({
      label: pass.label,
      start: L.length / SR,
      seconds: outL.length / SR,
      peak,
      rms: (rmsOf(outL) + rmsOf(outR)) / 2,
    });
    for (let i = 0; i < outL.length; i++) { L.push(outL[i]); R.push(outR[i]); }
    for (let i = 0; i < silence; i++) { L.push(0); R.push(0); }
  }
} finally {
  await renderer.close();
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, wavBuffer([Float32Array.from(L), Float32Array.from(R)]));

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
console.log(`\n${outPath.replace(root + '/', '')}  —  ${mmss(L.length / SR)}\n`);
for (const e of index) {
  console.log(`  ${mmss(e.start).padStart(5)}  ${dbfs(e.peak).padStart(10)} peak`
    + `  ${dbfs(e.rms).padStart(10)} rms   ${e.label}`);
}
console.log('');
