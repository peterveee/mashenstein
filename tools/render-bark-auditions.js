// Audition sweep: synthesised barks for the finish-line dog.
//
// Six candidates, each a different answer to "what does a hostile dog sound
// like in a game whose every cue is a chip synth". All of them are built from
// the same three parts a real bark has — a plosive burst of breath, a voiced
// body whose pitch falls as the jaw opens, and (on the mean ones) a growl
// tremor under the voice — and they differ in register, count and character:
//
//   bark-a-yip      small and sharp, a double yip. The least scary; the control.
//   bark-b-woof     one mid-sized woof, round and closed-mouthed.
//   bark-c-hound    the big chest. Low fundamental, long decay, breath under it.
//   bark-d-snarl    a growl that breaks into the bark — the "decided about you" one.
//   bark-e-double   two fast aggressive barks, the classic RUFF-RUFF.
//   bark-f-chip     overtly chiptune: 25% pulse and a hard sweep, kin to the
//                   game's existing cues rather than to a real animal.
//
// Deterministic: seeded noise, no Date, no Math.random — the same file every
// render, like every audition tool here.
//
// Usage: node tools/render-bark-auditions.js [outDir]   (default work/auditions/barks)
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { wavBuffer, SR } from './lib/wav.js';

const root = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));
const outDir = resolve(process.argv[2] || join(root, 'work', 'auditions', 'barks'));
mkdirSync(outDir, { recursive: true });

// ---- primitives -----------------------------------------------------------

let noiseSeed = 0x9e3779b9;
function rnd() { // mulberry32, reseeded per file so candidates don't share tails
  noiseSeed = (noiseSeed + 0x6d2b79f5) | 0;
  let t = Math.imul(noiseSeed ^ (noiseSeed >>> 15), 1 | noiseSeed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
}

// RBJ bandpass biquad — the closest thing to a mouth this file needs. A bark
// is a buzz shoved through one resonance; sweeping the centre upward as the
// jaw opens is what turns "buzzer" into "woof".
function bandpass(freq, q) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x, f = freq) => {
    const w = 2 * Math.PI * f / SR;
    const alpha = Math.sin(w) / (2 * q);
    const b0 = alpha, b2 = -alpha, a0 = 1 + alpha, a1 = -2 * Math.cos(w), a2 = 1 - alpha;
    const y = (b0 * x + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  };
}

function onePoleLP(freq) {
  const dt = 1 / SR, rc = 1 / (2 * Math.PI * freq), a = dt / (rc + dt);
  let y = 0;
  return (x) => (y += a * (x - y));
}

// One voiced bark: sawtooth (or pulse) fundamental falling f0->f1, growl AM,
// jaw formant opening over the first third, plosive noise burst on the attack.
function bark(out, t0, {
  dur = 0.14, f0 = 320, f1 = 140, wave = 'saw', duty = 0.25,
  growl = 0, growlHz = 32, formant0 = 500, formant1 = 1400, fq = 2.2,
  breath = 0.25, breathHz = 1800, plosive = 0.5, gain = 1,
}) {
  const start = Math.floor(t0 * SR);
  const count = Math.ceil((dur + 0.08) * SR);
  const mouth = bandpass(formant0, fq);
  const chest = onePoleLP(Math.max(f1 * 3, 200));
  const breathLP = onePoleLP(breathHz);
  let phase = 0;
  for (let i = 0; i < count && start + i < out.length; i++) {
    const t = i / SR;
    const k = Math.min(1, t / dur);
    const f = f0 * Math.pow(f1 / f0, k);
    phase += f / SR;
    const p = phase - Math.floor(phase);
    let v = wave === 'pulse' ? (p < duty ? 1 : -1) : 2 * p - 1;
    // jaw: the formant opens fast then relaxes — the "wo" of woof
    const open = Math.min(1, t / (dur * 0.3));
    const fc = formant0 + (formant1 - formant0) * open * (1 - 0.4 * k);
    v = mouth(v, fc) * 2.2 + chest(v) * 0.8;
    if (growl) v *= 1 - growl * 0.5 * (1 + Math.sin(2 * Math.PI * growlHz * t));
    // breath: filtered noise riding the same envelope, plus the plosive kick
    let env;
    if (t < 0.006) env = t / 0.006;
    else env = Math.pow(1 - Math.min(1, (t - 0.006) / (dur - 0.006)), 1.6);
    let n = breathLP(rnd()) * breath;
    if (t < 0.02) n += rnd() * plosive * (1 - t / 0.02);
    out[start + i] += (v + n) * env * gain;
  }
}

// A held growl: low saw through a closed mouth, tremor AM, no plosive.
function growl(out, t0, { dur = 0.3, f = 95, growlHz = 26, gain = 0.6 }) {
  const start = Math.floor(t0 * SR);
  const count = Math.ceil(dur * SR);
  const mouth = bandpass(260, 1.6);
  let phase = 0;
  for (let i = 0; i < count && start + i < out.length; i++) {
    const t = i / SR;
    phase += (f + Math.sin(2 * Math.PI * 4 * t) * 4) / SR;
    const p = phase - Math.floor(phase);
    let v = mouth(2 * p - 1) * 2.4;
    v *= 0.55 + 0.45 * Math.sin(2 * Math.PI * growlHz * t);
    const env = Math.min(1, t / 0.05) * Math.min(1, (dur - t) / 0.06);
    out[start + i] += v * env * gain;
  }
}

function render(name, seconds, build) {
  noiseSeed = 0x9e3779b9;
  const out = new Float32Array(Math.ceil(seconds * SR));
  build(out);
  let peak = 0;
  for (const s of out) peak = Math.max(peak, Math.abs(s));
  const file = join(outDir, `${name}.wav`);
  writeFileSync(file, wavBuffer(out, peak > 0 ? 0.85 / peak : 1));
  console.log(`${name}.wav  ${seconds.toFixed(2)}s`);
}

// ---- the candidates -------------------------------------------------------

render('bark-a-yip', 0.5, (out) => {
  bark(out, 0.02, { dur: 0.09, f0: 620, f1: 330, formant0: 900, formant1: 2200, breath: 0.2, plosive: 0.35, gain: 0.9 });
  bark(out, 0.2, { dur: 0.1, f0: 660, f1: 300, formant0: 900, formant1: 2300, breath: 0.2, plosive: 0.35 });
});

render('bark-b-woof', 0.45, (out) => {
  bark(out, 0.02, { dur: 0.17, f0: 300, f1: 120, formant0: 420, formant1: 1100, fq: 2.6, breath: 0.3, plosive: 0.5 });
});

render('bark-c-hound', 0.7, (out) => {
  bark(out, 0.02, { dur: 0.26, f0: 190, f1: 72, formant0: 300, formant1: 750, fq: 2.0, growl: 0.35, growlHz: 24, breath: 0.45, breathHz: 900, plosive: 0.6 });
});

render('bark-d-snarl', 0.85, (out) => {
  growl(out, 0.02, { dur: 0.34, f: 92, growlHz: 26, gain: 0.55 });
  bark(out, 0.34, { dur: 0.2, f0: 240, f1: 95, formant0: 340, formant1: 900, growl: 0.5, growlHz: 30, breath: 0.4, breathHz: 1100, plosive: 0.6 });
});

render('bark-e-double', 0.65, (out) => {
  bark(out, 0.02, { dur: 0.13, f0: 360, f1: 140, formant0: 500, formant1: 1300, growl: 0.25, growlHz: 34, breath: 0.3, plosive: 0.55, gain: 0.92 });
  bark(out, 0.24, { dur: 0.15, f0: 330, f1: 118, formant0: 470, formant1: 1250, growl: 0.3, growlHz: 34, breath: 0.3, plosive: 0.55 });
});

render('bark-f-chip', 0.55, (out) => {
  bark(out, 0.02, { dur: 0.1, f0: 700, f1: 180, wave: 'pulse', duty: 0.25, formant0: 800, formant1: 2400, fq: 1.4, breath: 0.12, plosive: 0.3, gain: 0.9 });
  bark(out, 0.21, { dur: 0.12, f0: 620, f1: 150, wave: 'pulse', duty: 0.25, formant0: 750, formant1: 2200, fq: 1.4, breath: 0.12, plosive: 0.3 });
});

// ---- round 2: the shipped cue's own shape, five ways ----------------------
//
// The first set above asked "what kind of animal". That is settled — bark
// only, no growl, pitched high enough to cut through a full mix without the
// song moving — so this set asks the remaining question: WHICH high double
// bark. Every one of these is the shipped engine cue (see 'dogBark' in
// engine/audio.js) with its two pitches and its gap changed, so whichever
// wins maps onto the two bark() lines there and nothing else.
//
// These deliberately go through the same synth as the set above rather than
// through the engine — tools/render-cues.js already renders the REAL cue, and
// what is wanted here is five variations sitting in one directory to be
// compared by ear. Expect the winner to need a listen through render-cues.js
// once it is wired, because the engine's filters are not these.
const engineBark = (out, t, f, gain = 1) => bark(out, t, {
  dur: 0.12, f0: f, f1: f * 0.38, wave: 'saw',
  formant0: f * 1.6, formant1: f * 4.4, fq: 1.8,
  breath: 0.3, breathHz: 2600, plosive: 0.5, gain,
});

// The cue as it stands today: 520 then 450, 190ms apart.
render('v2-a-shipped', 0.45, (out) => {
  engineBark(out, 0.02, 520);
  engineBark(out, 0.21, 450);
});

// HIGHER still, and tighter. The most urgent of the five — a small furious
// dog. Cuts through anything; the risk is that it reads as a yap.
render('v2-b-higher', 0.4, (out) => {
  engineBark(out, 0.02, 660);
  engineBark(out, 0.18, 570);
});

// SNAPPIER: the shipped pitches with the gap closed to 130ms, so the two
// barks land almost on top of each other. Reads as a lunge rather than as
// two events.
render('v2-c-snappy', 0.4, (out) => {
  engineBark(out, 0.02, 530);
  engineBark(out, 0.15, 440);
});

// BIGGER: down a third, and the second bark drops further — a heavier animal
// that still sits above the music. The closest of the five to the old cue
// without bringing the growl back.
render('v2-d-bigger', 0.5, (out) => {
  engineBark(out, 0.02, 430);
  engineBark(out, 0.22, 340);
});

// THREE barks, not two: the same high register, a fast triplet. The most
// aggressive reading of the same voice — a dog that will not stop.
render('v2-e-triple', 0.6, (out) => {
  engineBark(out, 0.02, 560, 0.95);
  engineBark(out, 0.17, 500, 0.9);
  engineBark(out, 0.32, 440);
});

console.log(`\n-> ${outDir}`);
