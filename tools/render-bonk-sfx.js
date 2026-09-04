// Deterministic audition renders for the chase-copter's upward bonk.
// Usage: node tools/render-bonk-sfx.js [outDir]
//
// These are candidates only. The live game still uses its existing cue until one
// of the variants is chosen for the Rhythm Cabinet chase.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, wavBuffer, rmsOf, dbfs } from './lib/wav.js';

const root = resolve(join(fileURLToPath(import.meta.url), '..', '..'));
const outDir = resolve(process.argv[2] || join(root, 'audio', 'bonk-candidates'));
const DUR = 0.78;
const TAIL = 0.03;

function wave(type, phase) {
  const p = phase - Math.floor(phase);
  if (type === 'square') return p < 0.5 ? 1 : -1;
  if (type === 'pulse') return p < 0.25 ? 1 : -1;
  if (type === 'triangle') return p < 0.5 ? 4 * p - 1 : 3 - 4 * p;
  if (type === 'sawtooth') return 2 * p - 1;
  return Math.sin(2 * Math.PI * p);
}

function expInterp(a, b, t) { return a * Math.pow(b / a, Math.max(0, Math.min(1, t))); }
function smooth(t) { return t * t * (3 - 2 * t); }

function envelope(t, dur, attack, hold, curve = 1.35) {
  if (t < attack) return smooth(t / Math.max(1e-6, attack));
  const decayAt = Math.min(dur - 0.001, Math.max(attack, dur * hold));
  if (t <= decayAt) return 1;
  return Math.pow(Math.max(0, 1 - (t - decayAt) / Math.max(1e-6, dur - decayAt)), curve);
}

function addOsc(out, {
  at = 0, dur, type = 'sine', f0, f1 = f0, gain,
  attack = 0.004, hold = 0.05, curve = 1.35,
  vibratoHz = 0, vibratoDepth = 0, steps = 0,
}) {
  const start = Math.floor(at * SR);
  const count = Math.ceil((dur + TAIL) * SR);
  let phase = 0;
  for (let i = 0; i < count && start + i < out.length; i++) {
    const t = i / SR;
    if (t > dur + TAIL) break;
    const u = Math.min(1, t / dur);
    const stepped = steps ? Math.floor(u * steps) / steps : u;
    const base = f0 === f1 ? f0 : expInterp(f0, f1, stepped);
    const f = base * (1 + vibratoDepth * Math.sin(2 * Math.PI * vibratoHz * t));
    phase += Math.max(1, f) / SR;
    out[start + i] += wave(type, phase) * gain * envelope(t, dur, attack, hold, curve);
  }
}

let noiseState = 0x7f4a7c15;
function randomSigned() {
  noiseState = (noiseState + 0x6d2b79f5) | 0;
  let t = Math.imul(noiseState ^ (noiseState >>> 15), 1 | noiseState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
}

function addNoise(out, { at = 0, dur, gain, cutoff = 900, type = 'lowpass' }) {
  const start = Math.floor(at * SR);
  const count = Math.ceil((dur + TAIL) * SR);
  const dt = 1 / SR;
  const rc = 1 / (2 * Math.PI * cutoff);
  const a = dt / (rc + dt);
  let lp = 0, prevIn = 0, prevHp = 0;
  for (let i = 0; i < count && start + i < out.length; i++) {
    const t = i / SR;
    if (t > dur + TAIL) break;
    const input = randomSigned();
    lp += a * (input - lp);
    const hp = 0.96 * (prevHp + input - prevIn);
    prevIn = input; prevHp = hp;
    const filtered = type === 'highpass' ? hp : type === 'bandpass' ? lp - hp : lp;
    out[start + i] += filtered * gain * envelope(t, dur, 0.0015, 0, 1.8);
  }
}

function impact(out, weight = 1) {
  // The first 20ms is the "bonk". Every candidate then has a different spring
  // voice after it, so the attack stays readable while the variants remain easy
  // to compare in context.
  addNoise(out, { dur: 0.026, gain: 0.16 * weight, cutoff: 1100, type: 'lowpass' });
  addOsc(out, { dur: 0.13, type: 'sine', f0: 105 * weight, f1: 62 * weight, gain: 0.23, attack: 0.001, hold: 0.02, curve: 1.7 });
}

function rubberBoing() {
  const out = new Float32Array(Math.ceil(DUR * SR));
  impact(out, 1);
  addOsc(out, { at: 0.008, dur: 0.30, type: 'triangle', f0: 180, f1: 980, gain: 0.24, hold: 0.10, curve: 1.05 });
  addOsc(out, { at: 0.012, dur: 0.23, type: 'sine', f0: 360, f1: 1960, gain: 0.09, hold: 0.08, curve: 1.2 });
  addOsc(out, { at: 0.19, dur: 0.42, type: 'sine', f0: 940, f1: 500, gain: 0.13, hold: 0.02, vibratoHz: 9, vibratoDepth: 0.025, curve: 1.4 });
  return out;
}

function coilSpring() {
  const out = new Float32Array(Math.ceil(DUR * SR));
  impact(out, 0.95);
  addNoise(out, { at: 0.008, dur: 0.045, gain: 0.07, cutoff: 3400, type: 'bandpass' });
  addOsc(out, { at: 0.006, dur: 0.38, type: 'sawtooth', f0: 225, f1: 1170, gain: 0.17, hold: 0.13, curve: 1.1 });
  addOsc(out, { at: 0.01, dur: 0.30, type: 'sine', f0: 450, f1: 2340, gain: 0.09, hold: 0.08, curve: 1.15 });
  addOsc(out, { at: 0.16, dur: 0.54, type: 'sine', f0: 820, f1: 415, gain: 0.15, hold: 0.01, vibratoHz: 13, vibratoDepth: 0.035, curve: 1.15 });
  return out;
}

function cartoonBoink() {
  const out = new Float32Array(Math.ceil(DUR * SR));
  impact(out, 1.08);
  addNoise(out, { at: 0.002, dur: 0.018, gain: 0.10, cutoff: 4200, type: 'highpass' });
  addOsc(out, { at: 0.006, dur: 0.19, type: 'square', f0: 205, f1: 1450, gain: 0.16, hold: 0.07, curve: 1.1 });
  addOsc(out, { at: 0.015, dur: 0.33, type: 'triangle', f0: 1450, f1: 690, gain: 0.13, hold: 0.01, curve: 1.25 });
  addOsc(out, { at: 0.075, dur: 0.43, type: 'sine', f0: 680, f1: 350, gain: 0.11, hold: 0.01, vibratoHz: 8, vibratoDepth: 0.04, curve: 1.3 });
  return out;
}

function vacuumTwang() {
  const out = new Float32Array(Math.ceil(DUR * SR));
  addNoise(out, { dur: 0.065, gain: 0.19, cutoff: 620, type: 'lowpass' });
  addNoise(out, { at: 0.008, dur: 0.18, gain: 0.09, cutoff: 1600, type: 'bandpass' });
  addOsc(out, { dur: 0.19, type: 'triangle', f0: 92, f1: 59, gain: 0.27, attack: 0.002, hold: 0.05, curve: 1.4 });
  addOsc(out, { at: 0.012, dur: 0.43, type: 'sawtooth', f0: 165, f1: 760, gain: 0.14, hold: 0.08, curve: 1.2 });
  addOsc(out, { at: 0.025, dur: 0.34, type: 'sine', f0: 470, f1: 1320, gain: 0.08, hold: 0.05, curve: 1.25 });
  addOsc(out, { at: 0.16, dur: 0.52, type: 'sine', f0: 860, f1: 365, gain: 0.10, hold: 0.01, vibratoHz: 6, vibratoDepth: 0.03, curve: 1.25 });
  return out;
}

function arcadeUpswing() {
  const out = new Float32Array(Math.ceil(DUR * SR));
  impact(out, 0.92);
  addOsc(out, { at: 0.004, dur: 0.25, type: 'square', f0: 155, f1: 1080, gain: 0.17, hold: 0.06, steps: 12, curve: 1.15 });
  addOsc(out, { at: 0.018, dur: 0.16, type: 'pulse', f0: 310, f1: 2160, gain: 0.07, hold: 0.02, steps: 8, curve: 1.3 });
  addOsc(out, { at: 0.18, dur: 0.43, type: 'triangle', f0: 1040, f1: 520, gain: 0.12, hold: 0.01, steps: 10, curve: 1.35 });
  addOsc(out, { at: 0.27, dur: 0.31, type: 'square', f0: 520, f1: 260, gain: 0.06, hold: 0, steps: 6, curve: 1.4 });
  return out;
}

function heavyBounce() {
  const out = new Float32Array(Math.ceil(DUR * SR));
  addNoise(out, { dur: 0.075, gain: 0.22, cutoff: 330, type: 'lowpass' });
  addOsc(out, { dur: 0.22, type: 'sine', f0: 82, f1: 43, gain: 0.31, attack: 0.001, hold: 0.04, curve: 1.55 });
  addOsc(out, { at: 0.012, dur: 0.40, type: 'triangle', f0: 148, f1: 620, gain: 0.18, hold: 0.10, curve: 1.15 });
  addOsc(out, { at: 0.03, dur: 0.30, type: 'sine', f0: 296, f1: 1240, gain: 0.06, hold: 0.04, curve: 1.25 });
  addOsc(out, { at: 0.20, dur: 0.55, type: 'sine', f0: 600, f1: 275, gain: 0.12, hold: 0.01, vibratoHz: 5, vibratoDepth: 0.025, curve: 1.25 });
  addOsc(out, { at: 0.32, dur: 0.38, type: 'triangle', f0: 290, f1: 135, gain: 0.06, hold: 0, curve: 1.3 });
  return out;
}

const variants = [
  ['01_rubber_boing', rubberBoing],
  ['02_coil_spring', coilSpring],
  ['03_cartoon_boink', cartoonBoink],
  ['04_vacuum_twang', vacuumTwang],
  ['05_arcade_upswing', arcadeUpswing],
  ['06_heavy_bounce', heavyBounce],
];

mkdirSync(outDir, { recursive: true });
const rendered = variants.map(([name, make]) => {
  const samples = make();
  writeFileSync(join(outDir, `${name}.wav`), wavBuffer(samples));
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  return { name, samples, peak, rms: rmsOf(samples) };
});

// A single reel makes quick A/B comparison possible. Each candidate gets the
// same 0.78s slot followed by 0.22s of silence; the README has the timestamps.
const slot = Math.ceil((DUR + 0.22) * SR);
const reel = new Float32Array(slot * rendered.length);
for (let i = 0; i < rendered.length; i++) reel.set(rendered[i].samples, i * slot);
writeFileSync(join(outDir, '00_bonk_reel.wav'), wavBuffer(reel));

const report = rendered.map((r, i) =>
  `${i + 1}. ${r.name}: peak ${dbfs(r.peak)}, RMS ${dbfs(r.rms)}`).join('\n');
console.log(`Wrote ${rendered.length} bonk candidates plus 00_bonk_reel.wav to ${outDir}`);
console.log(report);
