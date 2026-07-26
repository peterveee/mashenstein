// Offline WAV render of the procedural purchase/coin cues.
// Usage: node tools/render-sfx.js [outDir]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(join(fileURLToPath(import.meta.url), '..', '..'));
const outDir = resolve(process.argv[2] || join(root, 'audio', 'sfx-renders'));
const SR = 44100;
const TAIL = 0.04;

// This mirrors AudioSys.osc()/waka(): exponential attack and release, with
// the same oscillator types, frequencies, durations, gains, and offsets used
// by the live Web Audio implementation.
function expInterp(a, b, t) { return a * Math.pow(b / a, t); }
function wave(type, phase) {
  const p = phase - Math.floor(phase);
  if (type === 'square') return p < 0.5 ? 1 : -1;
  if (type === 'triangle') return p < 0.5 ? 4 * p - 1 : 3 - 4 * p;
  // 25% duty pulse — the live cue builds this as a PeriodicWave from the same
  // duty; here the naive edge is fine, it just aliases a little higher up.
  if (type === 'pulse') return p < 0.25 ? 1 : -1;
  return Math.sin(2 * Math.PI * p);
}

function tone(out, t0, dur, type, f0, f1, gain, hold = 0, filter = null) {
  const start = Math.floor(t0 * SR);
  const count = Math.ceil((dur + TAIL) * SR);
  let phase = 0;
  for (let i = 0; i < count && start + i < out.length; i++) {
    const t = i / SR;
    if (t > dur + 0.02) break;
    const f = f0 === f1 ? f0 : f0 * Math.pow(f1 / f0, Math.min(1, t / dur));
    phase += f / SR;
    let env;
    if (t < 0.008) env = expInterp(0.0001, gain, t / 0.008);
    else if (t < dur * hold) env = gain;
    else env = expInterp(gain, 0.0001, (t - dur * hold) / Math.max(1e-6, dur - dur * hold));
    const sample = wave(type, phase) * env;
    out[start + i] += filter ? filter(sample, t) : sample;
  }
}

// Deterministic white noise + one-pole filters, mirroring AudioSys.noise() so
// cues that lean on noise (latch clacks, bell strikers) render something to
// audition. One-pole is unconditionally stable and coarser than the live
// biquad — this approximates the character, it does not match it exactly.
let noiseSeed = 0x9e3779b9;
function rnd() { // mulberry32 — seeded so renders stay deterministic
  noiseSeed = (noiseSeed + 0x6d2b79f5) | 0;
  let t = Math.imul(noiseSeed ^ (noiseSeed >>> 15), 1 | noiseSeed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
}
function noiseBurst(out, t0, dur, gain, type, freq) {
  const start = Math.floor(t0 * SR);
  const count = Math.ceil((dur + TAIL) * SR);
  const dt = 1 / SR;
  const rc = 1 / (2 * Math.PI * freq);
  const aLp = dt / (rc + dt);     // one-pole lowpass coefficient
  const aHp = rc / (rc + dt);     // one-pole highpass coefficient
  let lp = 0, prevIn = 0, prevHp = 0, bp = 0;
  for (let i = 0; i < count && start + i < out.length; i++) {
    const t = i / SR;
    if (t > dur + 0.02) break;
    const inp = rnd();
    lp += aLp * (inp - lp);
    const hp = aHp * (prevHp + inp - prevIn);
    prevIn = inp; prevHp = hp;
    // bandpass ≈ highpass then lowpass in series, a band centred near freq
    bp += aLp * (hp - bp);
    const filtered = type === 'highpass' ? hp : type === 'bandpass' ? bp : lp;
    const env = t < 0.008
      ? expInterp(0.0001, gain, t / 0.008)
      : expInterp(gain, 0.0001, (t - 0.008) / Math.max(1e-6, dur - 0.008));
    out[start + i] += filtered * env;
  }
}

// Mirror of AudioSys.pacDeath(): eleven stepped downward sweeps that lengthen
// and quieten as they go, then the two-tone drop. The frequency staircase and
// the per-cycle level sag are the point, so this renders the automation
// directly rather than going through tone().
function pacDeath(out, t0 = 0) {
  const CYCLES = 11, STEPS = 14;
  const peak0 = 0.15;
  let phase = 0, t = t0, prevGain = 0.0001;
  // One-pole lowpass tracking 6200Hz -> 2400Hz across the sweeps.
  let lp = 0;
  const sweepEnd = (() => {
    let e = t0;
    for (let i = 0; i < CYCLES; i++) e += 0.082 + 0.042 * (i / (CYCLES - 1));
    return e;
  })();
  for (let i = 0; i < CYCLES; i++) {
    const k = i / (CYCLES - 1);
    const top = 1560 * Math.pow(0.943, i);
    const bot = 470 * Math.pow(0.962, i);
    const dur = 0.082 + 0.042 * k;
    const peak = peak0 * (1 - 0.4 * k);
    const start = Math.floor(t * SR);
    const count = Math.floor(dur * SR);
    for (let n = 0; n < count && start + n < out.length; n++) {
      const u = n / count;                       // position within this sweep
      const step = Math.min(STEPS - 1, Math.floor(u * STEPS));
      const f = top * Math.pow(bot / top, step / (STEPS - 1));
      phase += f / SR;
      // attack on the first cycle only, then the sag down to half level
      let env;
      if (i === 0 && n < 0.005 * SR) env = expInterp(0.0001, peak, n / (0.005 * SR));
      else env = peak + (peak * 0.5 - peak) * Math.min(1, u / 0.93);
      prevGain = env;
      const cut = expInterp(6200, 2400, (t + n / SR - t0) / Math.max(1e-6, sweepEnd - t0));
      const a = (1 / SR) / (1 / (2 * Math.PI * cut) + 1 / SR);
      lp += a * (wave('pulse', phase) * env - lp);
      out[start + n] += lp;
    }
    t += dur;
  }
  // release
  const relStart = Math.floor(t * SR), relCount = Math.floor(0.02 * SR);
  for (let n = 0; n < relCount && relStart + n < out.length; n++) {
    phase += 840 / SR;
    out[relStart + n] += wave('pulse', phase) * expInterp(prevGain, 0.0001, n / relCount);
  }

  // The tail: penultimate drop, then the pluck that collapses to nothing.
  const tailAt = t + 0.07;
  tone(out, tailAt, 0.085, 'pulse', 190, 132, 0.2);
  tone(out, tailAt + 0.095, 0.15, 'pulse', 118, 38, 0.22);
  tone(out, tailAt + 0.095, 0.15, 'sine', 59, 24, 0.16);
}

function render(name) {
  // cash rings out longer than the other blips; give it room for the tail.
  const len = name === 'pacDeath' ? 1.9 : name === 'cash' ? 0.85 : 0.6;
  const out = new Float32Array(Math.ceil(len * SR));
  if (name === 'pacDeath') pacDeath(out, 0);
  else if (name === 'coin') {
    tone(out, 0, 0.06, 'square', 988, 988, 0.12);
    tone(out, 0.06, 0.07, 'square', 1319, 1319, 0.12);
  } else if (name === 'cash') {
    // Mirror of the in-game 'cash' cue: a mechanical latch clack ("cha") then
    // a bell on ideal free-bar partials (1 : 2.76 : 5.40 : 8.93) that rings out
    // ("ching"). Noise layers use the one-pole approximation above.
    const barModes = [[1, 0.5], [2.76, 0.34], [5.40, 0.2], [8.93, 0.12]];
    noiseBurst(out, 0, 0.035, 0.14, 'highpass', 3200); // latch click
    noiseBurst(out, 0, 0.05, 0.13, 'bandpass', 1800);  // mechanical rasp
    tone(out, 0, 0.07, 'square', 300, 175, 0.11);      // woody thunk
    for (const [ratio, amp] of barModes.slice(0, 3)) {
      tone(out, 0, 0.09 * (ratio < 3 ? 1 : 0.6), 'sine', 330 * ratio, 330 * ratio, 0.12 * amp);
    }
    const bell = 0.14;
    noiseBurst(out, bell, 0.012, 0.13, 'highpass', 7000); // striker
    for (const [ratio, amp] of barModes) {
      tone(out, bell, 0.62 * (ratio < 3 ? 1 : 0.55), 'sine', 784 * ratio, 784 * ratio, 0.18 * amp);
    }
  } else if (name === 'power') {
    [523, 659, 784, 1047].forEach((f, i) => tone(out, i * 0.07, 0.09, 'triangle', f, f, 0.15));
  } else if (name === 'waka') {
    const dur = 0.12;
    tone(out, 0, dur, 'square', 1000, 940, 0.13, 0.75, (sample, t) => {
      // The live cue's resonant low-pass is approximated here by a gentle
      // brightness envelope; the pitch/formant motion remains identical.
      const brightness = 0.72 + 0.28 * Math.sin(Math.PI * Math.min(1, t / dur));
      return sample * brightness;
    });
  } else throw new Error(`unknown cue: ${name}`);

  let peak = 0;
  for (const sample of out) peak = Math.max(peak, Math.abs(sample));
  const scale = peak > 0 ? Math.min(1, 0.9 / peak) : 1;
  const data = Buffer.alloc(out.length * 2);
  for (let i = 0; i < out.length; i++) {
    data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(out[i] * scale * 32767))), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVE', 8);
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SR, 24); header.writeUInt32LE(SR * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write('data', 36); header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

mkdirSync(outDir, { recursive: true });
for (const name of ['cash', 'power', 'coin', 'waka', 'pacDeath']) {
  const path = join(outDir, `${name}.wav`);
  writeFileSync(path, render(name));
  console.log(path);
}
