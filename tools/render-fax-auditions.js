// Fax handshake screech — game SFX bake-off, 14 Oct 2026. Candidates only: nothing in the
// game plays these yet. Deterministic; every candidate is levelled to the same RMS.
// Usage: node tools/render-fax-auditions.js [outDir]   (default work/auditions/fax/)
//
// The real thing, for reference: the caller's CNG beep (1100 Hz), the answerer's CED tone
// (2100 Hz, phase-flipped every 450 ms on a modem), V.21 FSK at 300 baud (1650/1850 Hz — the
// warble), then training: scrambled data that sounds like hiss, all inside a 300–3400 Hz line.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, wavBuffer, rmsOf, dbfs } from './lib/wav.js';

const root = resolve(join(fileURLToPath(import.meta.url), '..', '..'));
const outDir = resolve(process.argv[2] || join(root, 'work', 'auditions', 'fax'));
const TARGET_RMS = 0.1; // -20 dBFS

let seed = 0x5eed1234;
const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return (((t ^ (t >>> 14)) >>> 0) / 4294967296); };
const buf = (sec) => new Float32Array(Math.ceil(sec * SR));
const fade = (i, n, a = 0.004, r = 0.01) => Math.min(1, i / (a * SR), (n - i) / (r * SR));

// A tone whose frequency (Hz) and level come from functions of time-in-the-tone.
function tone(out, at, dur, freq, { gain = 0.5, am = () => 1, wave = 'sine', phaseFlips = 0 } = {}) {
  const s0 = Math.floor(at * SR), n = Math.floor(dur * SR);
  let ph = 0;
  for (let i = 0; i < n && s0 + i < out.length; i++) {
    const t = i / SR;
    ph += freq(t) / SR;
    const flip = phaseFlips ? (Math.floor(t / phaseFlips) % 2) * 0.5 : 0;
    const p = ph + flip - Math.floor(ph + flip);
    const w = wave === 'square' ? (p < 0.5 ? 0.7 : -0.7) : Math.sin(2 * Math.PI * p);
    out[s0 + i] += w * gain * am(t) * fade(i, n);
  }
}
// FSK: random bits at `baud`, mark/space frequencies, continuous phase.
function fsk(out, at, dur, f0, f1, baud, gain = 0.5) {
  let bit = 0, next = 0;
  tone(out, at, dur, (t) => { if (t >= next) { bit = rnd() < 0.5 ? 1 : 0; next += 1 / baud; } return bit ? f1 : f0; }, { gain });
}
// Training hiss: noise with optional chatter (level re-drawn every `chop` s).
function hiss(out, at, dur, { gain = 0.4, chop = 0, swell = false } = {}) {
  const s0 = Math.floor(at * SR), n = Math.floor(dur * SR);
  let lvl = 1, next = 0;
  for (let i = 0; i < n && s0 + i < out.length; i++) {
    const t = i / SR;
    if (chop && t >= next) { lvl = 0.35 + 0.65 * rnd(); next += chop; }
    const sw = swell ? Math.min(1, t / (dur * 0.4)) : 1;
    out[s0 + i] += (rnd() * 2 - 1) * gain * lvl * sw * fade(i, n, 0.01, 0.03);
  }
}
// Biquad band-pass (RBJ), in place — the phone line.
function biquad(x, type, f, q) {
  const w = 2 * Math.PI * f / SR, a = Math.sin(w) / (2 * q), c = Math.cos(w);
  let b0, b1, b2;
  if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; } else { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
  const a0 = 1 + a, a1 = -2 * c, a2 = 1 - a;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const y = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x[i]; y2 = y1; y1 = y; x[i] = y; }
  return x;
}
const line = (x, drive = 0) => { biquad(x, 'hp', 300, 0.7); biquad(x, 'lp', 3400, 0.7); if (drive) for (let i = 0; i < x.length; i++) x[i] = Math.tanh(x[i] * (1 + drive)) / Math.tanh(1 + drive); return x; };

const C = {
  // 1. The whole call in about a second: beep, answer tone, warble, hiss.
  'a-full-handshake': () => { const o = buf(1.25); tone(o, 0, 0.14, () => 1100); tone(o, 0.2, 0.25, () => 2100, { phaseFlips: 0.09 }); fsk(o, 0.47, 0.32, 1650, 1850, 300, 0.45); hiss(o, 0.8, 0.42, { gain: 0.35, chop: 0.03 }); return line(o, 0.6); },
  // 2. Just the warble: V.21 FSK, the bit that sounds like a robot arguing.
  'b-fsk-warble': () => { const o = buf(0.7); fsk(o, 0, 0.7, 1650, 1850, 300, 0.5); return line(o, 0.4); },
  // 3. The answer tone with the modem's 15 Hz shimmer and phase flips — the long "eeee".
  'c-answer-tone-eee': () => { const o = buf(0.7); tone(o, 0, 0.7, () => 2100, { gain: 0.5, am: (t) => 0.8 + 0.2 * Math.sin(2 * Math.PI * 15 * t), phaseFlips: 0.15 }); return line(o, 0.8); },
  // 4. Training hiss with the two-tone "bong-bong" in front — the dial-up crunch.
  'd-bong-bong-crunch': () => { const o = buf(0.95); for (const at of [0, 0.18]) { tone(o, at, 0.12, () => 980, { gain: 0.3 }); tone(o, at, 0.12, () => 1180, { gain: 0.3 }); } hiss(o, 0.36, 0.58, { gain: 0.45, chop: 0.012 }); return line(o, 1.2); },
  // 5. Cartoon screech: two sines sweeping down through the line, rubbing, with hiss under.
  'e-skreee-down': () => { const o = buf(0.6); tone(o, 0, 0.6, (t) => 3200 * Math.pow(1300 / 3200, t / 0.6), { gain: 0.4 }); tone(o, 0, 0.6, (t) => 3290 * Math.pow(1260 / 3290, t / 0.6), { gain: 0.35 }); hiss(o, 0, 0.6, { gain: 0.12 }); return line(o, 1.5); },
  // 6. The screech rising instead — reads as "incoming!", more alarm than sigh.
  'f-skreee-up': () => { const o = buf(0.55); tone(o, 0, 0.55, (t) => 1200 * Math.pow(3000 / 1200, t / 0.55), { gain: 0.4 }); tone(o, 0, 0.55, (t) => 1240 * Math.pow(2900 / 1240, t / 0.55), { gain: 0.35 }); hiss(o, 0.25, 0.3, { gain: 0.15, swell: true }); return line(o, 1.5); },
  // 7. 8-bit: square waves flicking between the fax's own tones, fast, like a chip arpeggio.
  'g-chip-handshake': () => { const o = buf(0.7); const seq = [1100, 2100, 1650, 1850, 1100, 2100, 1850, 1650]; tone(o, 0, 0.7, (t) => seq[Math.floor(t / 0.035) % seq.length], { gain: 0.35, wave: 'square' }); hiss(o, 0.45, 0.25, { gain: 0.2, chop: 0.02 }); return line(o, 0.3); },
  // 8. Short and punchy: answer tone straight into crunch, under half a second.
  'h-short-blurt': () => { const o = buf(0.45); tone(o, 0, 0.16, () => 2100, { gain: 0.5, phaseFlips: 0.05 }); fsk(o, 0.15, 0.12, 1650, 1850, 300, 0.4); hiss(o, 0.25, 0.2, { gain: 0.45, chop: 0.015 }); return line(o, 1.0); },
};

mkdirSync(outDir, { recursive: true });
for (const [name, make] of Object.entries(C)) {
  seed = 0x5eed1234;
  const x = make();
  const g = TARGET_RMS / rmsOf(x);
  let peak = 0; for (let i = 0; i < x.length; i++) { x[i] *= g; peak = Math.max(peak, Math.abs(x[i])); }
  if (peak > 0.98) for (let i = 0; i < x.length; i++) x[i] *= 0.98 / peak;
  writeFileSync(join(outDir, `${name}.wav`), wavBuffer([x]));
  console.log(`${name.padEnd(22)} ${(x.length / SR).toFixed(2)}s  rms ${dbfs(rmsOf(x))}  peak ${dbfs(Math.min(peak, 0.98))}`);
}
console.log(`→ ${outDir}`);
