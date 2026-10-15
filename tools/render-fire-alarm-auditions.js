// Fire alarm — office-2's payoff cue, game SFX bake-off, 15 Oct 2026. Candidates only: the game
// plays 'fireBell' (src/engine/audio.js) until one is picked. Deterministic; every candidate is
// levelled to the same RMS so they are compared on character, not loudness.
// Usage: node tools/render-fire-alarm-auditions.js [outDir]   (default work/auditions/fire-alarm/)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, wavBuffer, rmsOf, dbfs } from './lib/wav.js';

const root = resolve(join(fileURLToPath(import.meta.url), '..', '..'));
const outDir = resolve(process.argv[2] || join(root, 'work', 'auditions', 'fire-alarm'));
const TARGET_RMS = 0.1; // -20 dBFS

const buf = (sec) => new Float32Array(Math.ceil(sec * SR));
const fade = (i, n, a = 0.004, r = 0.01) => Math.min(1, i / (a * SR), (n - i) / (r * SR));
const wave = (kind, p) => {
  p -= Math.floor(p);
  if (kind === 'square') return p < 0.5 ? 0.7 : -0.7;
  if (kind === 'saw') return 2 * p - 1;
  if (kind === 'tri') return 1 - 4 * Math.abs(p - 0.5);
  return Math.sin(2 * Math.PI * p);
};
// A tone whose frequency and level are functions of time-in-the-tone.
function tone(out, at, dur, freq, { gain = 0.5, am = () => 1, kind = 'sine', a = 0.004, r = 0.01 } = {}) {
  const s0 = Math.floor(at * SR), n = Math.floor(dur * SR);
  let ph = 0;
  for (let i = 0; i < n && s0 + i < out.length; i++) {
    const t = i / SR;
    ph += freq(t) / SR;
    out[s0 + i] += wave(kind, ph) * gain * am(t) * fade(i, n, a, r);
  }
}
// One strike of a bell: inharmonic partials, each decaying at its own rate.
const BELL = [[1, 1, 3.2], [2.76, 0.55, 5], [5.4, 0.35, 8], [8.93, 0.2, 12]];
function strike(out, at, f, gain, len = 0.12) {
  for (const [ratio, g, decay] of BELL) {
    tone(out, at, len, () => f * ratio, { gain: gain * g, am: (t) => Math.exp(-t * decay * 6), a: 0.0008, r: 0.004 });
  }
}
function soft(x, drive) { for (let i = 0; i < x.length; i++) x[i] = Math.tanh(x[i] * (1 + drive)) / Math.tanh(1 + drive); return x; }

const C = {
  // A. The school/office bell: a clapper hammering a gong about eighteen times a second.
  'a-clapper-bell': () => { const o = buf(1.9); for (let i = 0; i < 32; i++) strike(o, i * 0.055, 880, 0.5, 0.09); return o; },
  // B. A bigger, lower bell, slower clapper — the old corridor bell, more ring per hit.
  'b-big-bell': () => { const o = buf(2.1); for (let i = 0; i < 20; i++) strike(o, i * 0.09, 620, 0.55, 0.2); return o; },
  // C. Hi-lo two-tone siren, the European evacuation alarm.
  'c-hi-lo': () => { const o = buf(2.0); for (let i = 0; i < 8; i++) tone(o, i * 0.25, 0.25, () => (i % 2 ? 770 : 960), { gain: 0.4, kind: 'square', a: 0.002, r: 0.002 }); return soft(o, 0.6); },
  // D. Slow whoop: a rising sweep, repeated — the classic office tannoy alarm.
  'd-slow-whoop': () => { const o = buf(2.1); for (let i = 0; i < 3; i++) tone(o, i * 0.7, 0.62, (t) => 500 + 700 * (t / 0.62), { gain: 0.4, kind: 'square', a: 0.01, r: 0.03 }); return soft(o, 0.5); },
  // E. Temporal-three: three horn blasts and a pause, the North American evacuate pattern.
  'e-temporal-three': () => { const o = buf(2.0); for (let i = 0; i < 3; i++) { const at = i * 0.5; tone(o, at, 0.36, () => 520, { gain: 0.3, kind: 'saw', r: 0.01 }); tone(o, at, 0.36, () => 1040, { gain: 0.18, kind: 'square', r: 0.01 }); } return soft(o, 1.4); },
  // F. Electronic yelp: fast sweeps up, frantic.
  'f-yelp': () => { const o = buf(1.8); for (let i = 0; i < 12; i++) tone(o, i * 0.15, 0.15, (t) => 650 + 900 * (t / 0.15), { gain: 0.4, kind: 'tri', a: 0.002, r: 0.004 }); return soft(o, 0.8); },
  // G. Buzzer horn: a harsh 3-pulse klaxon, the cheap panel sounder.
  'g-buzzer': () => { const o = buf(1.7); for (let i = 0; i < 3; i++) { tone(o, i * 0.55, 0.42, () => 330, { gain: 0.35, kind: 'square' }); tone(o, i * 0.55, 0.42, () => 349, { gain: 0.3, kind: 'square' }); } return soft(o, 2.2); },
  // H. 8-bit: the bell played on a chip — a square arpeggio flicking between two notes.
  'h-chip-alarm': () => { const o = buf(1.8); const seq = [1318, 1046]; tone(o, 0, 1.8, (t) => seq[Math.floor(t / 0.06) % 2], { gain: 0.35, kind: 'square', am: (t) => (Math.floor(t / 0.48) % 2 ? 0.55 : 1) }); return o; },
  // I. Bell and whoop together: the bell rings, the siren rises under it.
  'i-bell-and-whoop': () => { const o = buf(2.0); for (let i = 0; i < 34; i++) strike(o, i * 0.055, 960, 0.35, 0.08); tone(o, 0.1, 1.8, (t) => 420 + 260 * ((t % 0.9) / 0.9), { gain: 0.2, kind: 'square', a: 0.02, r: 0.05 }); return soft(o, 0.4); },
};

mkdirSync(outDir, { recursive: true });
for (const [name, make] of Object.entries(C)) {
  const x = make();
  const g = TARGET_RMS / rmsOf(x);
  let peak = 0; for (let i = 0; i < x.length; i++) { x[i] *= g; peak = Math.max(peak, Math.abs(x[i])); }
  if (peak > 0.98) for (let i = 0; i < x.length; i++) x[i] *= 0.98 / peak;
  writeFileSync(join(outDir, `${name}.wav`), wavBuffer([x]));
  console.log(`${name.padEnd(20)} ${(x.length / SR).toFixed(2)}s  rms ${dbfs(rmsOf(x))}  peak ${dbfs(Math.min(peak, 0.98))}`);
}
console.log(`→ ${outDir}`);
