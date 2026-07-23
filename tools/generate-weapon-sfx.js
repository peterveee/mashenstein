// Deterministic mono WAV audition set for MASHENSTEIN hero abilities.
// These are deliberately standalone candidates: generating them does not wire
// any sound into gameplay, so choices can be made by ear first.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 44100;
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../audio/weapon-candidates');

function rngFor(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function buffer(seconds) {
  return new Float64Array(Math.ceil(seconds * RATE));
}

function wave(type, phase) {
  const turn = phase / (Math.PI * 2);
  if (type === 'square') return Math.sin(phase) >= 0 ? 1 : -1;
  if (type === 'triangle') return 2 * Math.abs(2 * (turn - Math.floor(turn + 0.5))) - 1;
  if (type === 'saw') return 2 * (turn - Math.floor(turn + 0.5));
  return Math.sin(phase);
}

function envelope(t, duration, attack = 0.008, release = 0.7) {
  const a = Math.min(1, t / Math.max(0.0001, attack));
  const tailAt = duration * (1 - release);
  const r = t <= tailAt ? 1 : Math.max(0, (duration - t) / Math.max(0.0001, duration - tailAt));
  return a * r * r;
}

function osc(out, {
  start = 0, duration, f0, f1 = f0, gain = 0.3, type = 'sine',
  attack = 0.006, release = 0.75, tremolo = 0,
}) {
  const first = Math.floor(start * RATE);
  const count = Math.min(out.length - first, Math.floor(duration * RATE));
  let phase = 0;
  for (let i = 0; i < count; i++) {
    const p = i / Math.max(1, count - 1);
    const freq = f0 * Math.pow(Math.max(0.001, f1 / f0), p);
    phase += Math.PI * 2 * freq / RATE;
    const trem = tremolo ? 0.72 + 0.28 * Math.sin(Math.PI * 2 * tremolo * i / RATE) : 1;
    out[first + i] += wave(type, phase) * gain * envelope(i / RATE, duration, attack, release) * trem;
  }
}

function noise(out, {
  seed, start = 0, duration, gain = 0.25, cutoff = 1800,
  mode = 'lowpass', attack = 0.002, release = 0.9,
}) {
  const random = rngFor(seed);
  const first = Math.floor(start * RATE);
  const count = Math.min(out.length - first, Math.floor(duration * RATE));
  const alpha = 1 - Math.exp(-Math.PI * 2 * cutoff / RATE);
  let low = 0;
  for (let i = 0; i < count; i++) {
    const raw = random() * 2 - 1;
    low += alpha * (raw - low);
    const sample = mode === 'highpass' ? raw - low : low;
    out[first + i] += sample * gain * envelope(i / RATE, duration, attack, release);
  }
}

function impulse(out, at, gain, width = 0.004) {
  const first = Math.floor(at * RATE);
  const count = Math.floor(width * RATE);
  for (let i = 0; i < count && first + i < out.length; i++) {
    const p = i / Math.max(1, count - 1);
    out[first + i] += (i % 2 ? -1 : 1) * gain * (1 - p);
  }
}

function normalize(out) {
  // A gentle shared warmth pass stops short digital attacks becoming
  // top-heavy. The unfiltered share preserves just enough edge to locate the
  // hit, while most of the energy stays in the low/mid body.
  const alpha = 1 - Math.exp(-Math.PI * 2 * 6200 / RATE);
  let low = 0;
  for (let i = 0; i < out.length; i++) {
    low += alpha * (out[i] - low);
    out[i] = low * 0.82 + out[i] * 0.18;
  }
  // Remove any tiny DC bias, apply edge fades, then leave useful headroom.
  let mean = 0;
  for (const v of out) mean += v;
  mean /= out.length;
  const edge = Math.min(128, Math.floor(out.length / 4));
  let peak = 0;
  for (let i = 0; i < out.length; i++) {
    out[i] -= mean;
    const fadeIn = Math.min(1, i / edge);
    const fadeOut = Math.min(1, (out.length - 1 - i) / edge);
    out[i] *= Math.min(fadeIn, fadeOut);
    peak = Math.max(peak, Math.abs(out[i]));
  }
  const scale = peak ? 0.88 / peak : 1;
  for (let i = 0; i < out.length; i++) out[i] *= scale;
}

function wavBytes(samples) {
  normalize(samples);
  const bytes = Buffer.alloc(44 + samples.length * 2);
  bytes.write('RIFF', 0);
  bytes.writeUInt32LE(36 + samples.length * 2, 4);
  bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(RATE, 24);
  bytes.writeUInt32LE(RATE * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36);
  bytes.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    bytes.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), 44 + i * 2);
  }
  return bytes;
}

const sounds = [
  ['01-b33p-laser-orb-pulse.wav', 0.27, (b) => {
    osc(b, { duration: 0.12, f0: 1180, f1: 520, gain: 0.35, type: 'square', tremolo: 42 });
    osc(b, { duration: 0.22, f0: 480, f1: 180, gain: 0.42, type: 'sine' });
    osc(b, { start: 0.025, duration: 0.15, f0: 1760, f1: 720, gain: 0.16, type: 'triangle' });
  }],
  ['02-b33p-laser-orb-bubble.wav', 0.34, (b) => {
    osc(b, { duration: 0.3, f0: 720, f1: 210, gain: 0.5, type: 'sine', tremolo: 18 });
    osc(b, { duration: 0.15, f0: 1420, f1: 620, gain: 0.18, type: 'triangle' });
    impulse(b, 0.008, 0.2);
  }],
  ['03-b33p-laser-orb-arcade.wav', 0.24, (b) => {
    osc(b, { duration: 0.08, f0: 1500, f1: 920, gain: 0.3, type: 'square' });
    osc(b, { start: 0.055, duration: 0.17, f0: 820, f1: 280, gain: 0.38, type: 'triangle' });
    noise(b, { seed: 3, duration: 0.055, gain: 0.09, cutoff: 4200, mode: 'highpass' });
  }],
  ['04-grumpos-axe-heavy-whoosh.wav', 0.38, (b) => {
    noise(b, { seed: 4, duration: 0.3, gain: 0.44, cutoff: 1050, mode: 'lowpass', attack: 0.06 });
    osc(b, { start: 0.17, duration: 0.18, f0: 145, f1: 52, gain: 0.42, type: 'sine' });
    impulse(b, 0.205, 0.28, 0.008);
  }],
  ['05-grumpos-axe-bright-cleave.wav', 0.31, (b) => {
    noise(b, { seed: 5, duration: 0.2, gain: 0.31, cutoff: 2800, mode: 'highpass', attack: 0.04 });
    osc(b, { start: 0.1, duration: 0.19, f0: 1850, f1: 820, gain: 0.28, type: 'sine' });
    osc(b, { start: 0.11, duration: 0.14, f0: 330, f1: 110, gain: 0.34, type: 'triangle' });
  }],
  ['06-lorenzo-wrench-clang.wav', 0.32, (b) => {
    impulse(b, 0.045, 0.42, 0.009);
    noise(b, { seed: 6, start: 0.038, duration: 0.08, gain: 0.22, cutoff: 3200, mode: 'highpass' });
    osc(b, { start: 0.045, duration: 0.26, f0: 1260, f1: 980, gain: 0.35, type: 'sine', tremolo: 31 });
    osc(b, { start: 0.045, duration: 0.2, f0: 630, f1: 520, gain: 0.22, type: 'sine' });
  }],
  ['07-lorenzo-wrench-thunk.wav', 0.26, (b) => {
    noise(b, { seed: 7, duration: 0.11, gain: 0.4, cutoff: 720 });
    osc(b, { duration: 0.22, f0: 210, f1: 62, gain: 0.48, type: 'sine' });
    osc(b, { start: 0.018, duration: 0.18, f0: 840, f1: 510, gain: 0.18, type: 'triangle' });
  }],
  ['08-raymn-rocket-fist-launch.wav', 0.37, (b) => {
    noise(b, { seed: 8, duration: 0.3, gain: 0.31, cutoff: 2400, mode: 'highpass', attack: 0.025 });
    osc(b, { duration: 0.32, f0: 190, f1: 520, gain: 0.4, type: 'saw', tremolo: 24 });
    impulse(b, 0.012, 0.26);
  }],
  ['09-raymn-spring-fist.wav', 0.31, (b) => {
    osc(b, { duration: 0.27, f0: 230, f1: 740, gain: 0.48, type: 'triangle', tremolo: 32 });
    osc(b, { start: 0.16, duration: 0.13, f0: 980, f1: 420, gain: 0.22, type: 'sine' });
    impulse(b, 0.018, 0.2);
  }],
  ['10-gnash-spin-dash-motor.wav', 0.42, (b) => {
    osc(b, { duration: 0.38, f0: 95, f1: 360, gain: 0.4, type: 'saw', tremolo: 36 });
    noise(b, { seed: 10, duration: 0.35, gain: 0.23, cutoff: 1900, mode: 'highpass', attack: 0.05 });
    osc(b, { start: 0.1, duration: 0.25, f0: 420, f1: 690, gain: 0.18, type: 'square' });
  }],
  ['11-gnash-spin-dash-whirl.wav', 0.34, (b) => {
    osc(b, { duration: 0.3, f0: 180, f1: 880, gain: 0.38, type: 'triangle', tremolo: 48 });
    noise(b, { seed: 11, duration: 0.28, gain: 0.25, cutoff: 3300, mode: 'highpass', attack: 0.045 });
  }],
  ['12-mochi-compress-squish.wav', 0.3, (b) => {
    osc(b, { duration: 0.25, f0: 520, f1: 105, gain: 0.52, type: 'sine' });
    noise(b, { seed: 12, duration: 0.15, gain: 0.18, cutoff: 560 });
    impulse(b, 0.165, 0.16);
  }],
  ['13-mochi-compress-spring.wav', 0.32, (b) => {
    osc(b, { duration: 0.28, f0: 760, f1: 155, gain: 0.45, type: 'triangle', tremolo: 22 });
    osc(b, { start: 0.13, duration: 0.15, f0: 170, f1: 390, gain: 0.28, type: 'sine' });
  }],
  ['14-miss-chomp-hard-snap.wav', 0.28, (b) => {
    impulse(b, 0.055, 0.52, 0.012);
    noise(b, { seed: 14, start: 0.05, duration: 0.16, gain: 0.42, cutoff: 820 });
    osc(b, { start: 0.052, duration: 0.2, f0: 185, f1: 64, gain: 0.35, type: 'sine' });
  }],
  ['15-miss-chomp-arcade-bite.wav', 0.25, (b) => {
    osc(b, { duration: 0.07, f0: 520, f1: 260, gain: 0.36, type: 'square' });
    impulse(b, 0.075, 0.42, 0.01);
    osc(b, { start: 0.08, duration: 0.15, f0: 240, f1: 90, gain: 0.38, type: 'triangle' });
  }],
  ['16-fernwick-shield-roll.wav', 0.39, (b) => {
    noise(b, { seed: 16, duration: 0.34, gain: 0.26, cutoff: 2100, mode: 'highpass', attack: 0.06 });
    osc(b, { duration: 0.34, f0: 135, f1: 460, gain: 0.36, type: 'triangle', tremolo: 28 });
    osc(b, { start: 0.18, duration: 0.16, f0: 920, f1: 640, gain: 0.17, type: 'sine' });
  }],
  ['17-fernwick-shield-bash.wav', 0.29, (b) => {
    noise(b, { seed: 17, duration: 0.11, gain: 0.42, cutoff: 1700, mode: 'highpass' });
    osc(b, { duration: 0.24, f0: 310, f1: 78, gain: 0.48, type: 'sine' });
    osc(b, { start: 0.018, duration: 0.23, f0: 1120, f1: 760, gain: 0.2, type: 'sine', tremolo: 27 });
  }],
  ['18-grumpos-axe-throw-ring.wav', 0.36, (b) => {
    noise(b, { seed: 18, duration: 0.23, gain: 0.25, cutoff: 2400, mode: 'highpass', attack: 0.05 });
    osc(b, { start: 0.08, duration: 0.26, f0: 980, f1: 720, gain: 0.34, type: 'sine', tremolo: 38 });
    osc(b, { duration: 0.22, f0: 190, f1: 74, gain: 0.32, type: 'triangle' });
  }],
  ['19-contact-box-soft-thud.wav', 0.24, (b) => {
    impulse(b, 0.012, 0.3, 0.009);
    noise(b, { seed: 19, duration: 0.13, gain: 0.34, cutoff: 480 });
    osc(b, { duration: 0.2, f0: 145, f1: 58, gain: 0.48, type: 'sine' });
  }],
  ['20-contact-box-hard-knock.wav', 0.25, (b) => {
    impulse(b, 0.01, 0.45, 0.011);
    noise(b, { seed: 20, duration: 0.1, gain: 0.32, cutoff: 1150 });
    osc(b, { duration: 0.22, f0: 285, f1: 92, gain: 0.44, type: 'triangle' });
  }],
  ['21-contact-cardboard-crumple.wav', 0.38, (b) => {
    noise(b, { seed: 21, duration: 0.33, gain: 0.5, cutoff: 760, attack: 0.003, release: 0.92 });
    impulse(b, 0.02, 0.23, 0.008);
    impulse(b, 0.09, 0.14, 0.006);
    impulse(b, 0.17, 0.1, 0.005);
    osc(b, { duration: 0.24, f0: 120, f1: 48, gain: 0.25, type: 'sine' });
  }],
  ['22-contact-wood-crack.wav', 0.34, (b) => {
    impulse(b, 0.014, 0.52, 0.014);
    noise(b, { seed: 22, duration: 0.2, gain: 0.4, cutoff: 1350 });
    osc(b, { duration: 0.28, f0: 235, f1: 66, gain: 0.42, type: 'triangle' });
    impulse(b, 0.085, 0.12, 0.006);
  }],
  ['23-contact-metal-clang.wav', 0.4, (b) => {
    impulse(b, 0.012, 0.34, 0.006);
    noise(b, { seed: 23, duration: 0.065, gain: 0.23, cutoff: 2600, mode: 'highpass' });
    osc(b, { duration: 0.36, f0: 760, f1: 610, gain: 0.38, type: 'sine', tremolo: 29 });
    osc(b, { duration: 0.31, f0: 380, f1: 315, gain: 0.3, type: 'sine', tremolo: 23 });
  }],
  ['24-contact-metal-dull-bong.wav', 0.43, (b) => {
    impulse(b, 0.012, 0.32, 0.009);
    osc(b, { duration: 0.39, f0: 310, f1: 205, gain: 0.5, type: 'sine', tremolo: 17 });
    osc(b, { duration: 0.3, f0: 155, f1: 96, gain: 0.32, type: 'triangle' });
    noise(b, { seed: 24, duration: 0.08, gain: 0.16, cutoff: 1700, mode: 'highpass' });
  }],
  ['25-contact-b33p-orb-pop.wav', 0.29, (b) => {
    impulse(b, 0.01, 0.28, 0.005);
    osc(b, { duration: 0.25, f0: 620, f1: 105, gain: 0.48, type: 'sine', tremolo: 25 });
    osc(b, { duration: 0.1, f0: 1320, f1: 540, gain: 0.2, type: 'square' });
    noise(b, { seed: 25, duration: 0.08, gain: 0.12, cutoff: 3000, mode: 'highpass' });
  }],
  ['26-contact-grumpos-axe-chop.wav', 0.34, (b) => {
    impulse(b, 0.012, 0.5, 0.013);
    noise(b, { seed: 26, duration: 0.22, gain: 0.44, cutoff: 980 });
    osc(b, { duration: 0.27, f0: 205, f1: 58, gain: 0.46, type: 'triangle' });
    osc(b, { start: 0.018, duration: 0.21, f0: 910, f1: 570, gain: 0.17, type: 'sine' });
  }],
  ['27-contact-lorenzo-wrench-hit.wav', 0.36, (b) => {
    impulse(b, 0.012, 0.38, 0.008);
    osc(b, { duration: 0.33, f0: 690, f1: 510, gain: 0.4, type: 'sine', tremolo: 26 });
    osc(b, { duration: 0.24, f0: 225, f1: 72, gain: 0.36, type: 'triangle' });
    noise(b, { seed: 27, duration: 0.07, gain: 0.18, cutoff: 2300, mode: 'highpass' });
  }],
  ['28-contact-raymn-fist-impact.wav', 0.28, (b) => {
    impulse(b, 0.01, 0.48, 0.015);
    noise(b, { seed: 28, duration: 0.16, gain: 0.4, cutoff: 720 });
    osc(b, { duration: 0.24, f0: 175, f1: 45, gain: 0.52, type: 'sine' });
  }],
  ['29-contact-fernwick-shield-bonk.wav', 0.39, (b) => {
    impulse(b, 0.012, 0.39, 0.01);
    osc(b, { duration: 0.35, f0: 470, f1: 290, gain: 0.43, type: 'sine', tremolo: 21 });
    osc(b, { duration: 0.28, f0: 190, f1: 67, gain: 0.39, type: 'triangle' });
    noise(b, { seed: 29, duration: 0.09, gain: 0.16, cutoff: 1900, mode: 'highpass' });
  }],
  ['30-contact-miss-chomp-crunch.wav', 0.33, (b) => {
    impulse(b, 0.016, 0.45, 0.014);
    noise(b, { seed: 30, duration: 0.26, gain: 0.48, cutoff: 680 });
    osc(b, { duration: 0.25, f0: 160, f1: 48, gain: 0.4, type: 'sine' });
    impulse(b, 0.11, 0.13, 0.007);
  }],
];

fs.mkdirSync(OUT, { recursive: true });
for (const [name, seconds, paint] of sounds) {
  const samples = buffer(seconds);
  paint(samples);
  fs.writeFileSync(path.join(OUT, name), wavBytes(samples));
}
console.log(`Wrote ${sounds.length} WAV candidates to ${OUT}`);
