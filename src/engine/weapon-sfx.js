// Procedural synthesis for the hero weapon cues (launch + contact).
//
// This is the single source of truth for those sounds. It is pure, sample-rate-
// parameterised ESM with no Node or Web Audio dependency, so two very different
// callers can share the exact same recipes:
//   - the live game (src/engine/audio.js) renders the nine WIRED cues into
//     AudioBuffers at init and plays them procedurally — no assets fetched;
//   - tools/generate-weapon-sfx.js renders all thirty candidates to WAV for
//     auditioning.
// Because both derive from CUES here, the audition files can never drift from
// what the game actually plays.

function rngFor(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
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

function osc(out, SR, {
  start = 0, duration, f0, f1 = f0, gain = 0.3, type = 'sine',
  attack = 0.006, release = 0.75, tremolo = 0,
}) {
  const first = Math.floor(start * SR);
  const count = Math.min(out.length - first, Math.floor(duration * SR));
  let phase = 0;
  for (let i = 0; i < count; i++) {
    const p = i / Math.max(1, count - 1);
    const freq = f0 * Math.pow(Math.max(0.001, f1 / f0), p);
    phase += Math.PI * 2 * freq / SR;
    const trem = tremolo ? 0.72 + 0.28 * Math.sin(Math.PI * 2 * tremolo * i / SR) : 1;
    out[first + i] += wave(type, phase) * gain * envelope(i / SR, duration, attack, release) * trem;
  }
}

function noise(out, SR, {
  seed, start = 0, duration, gain = 0.25, cutoff = 1800,
  mode = 'lowpass', attack = 0.002, release = 0.9,
}) {
  const random = rngFor(seed);
  const first = Math.floor(start * SR);
  const count = Math.min(out.length - first, Math.floor(duration * SR));
  const alpha = 1 - Math.exp(-Math.PI * 2 * cutoff / SR);
  let low = 0;
  for (let i = 0; i < count; i++) {
    const raw = random() * 2 - 1;
    low += alpha * (raw - low);
    const sample = mode === 'highpass' ? raw - low : low;
    out[first + i] += sample * gain * envelope(i / SR, duration, attack, release);
  }
}

function impulse(out, SR, at, gain, width = 0.004) {
  const first = Math.floor(at * SR);
  const count = Math.floor(width * SR);
  for (let i = 0; i < count && first + i < out.length; i++) {
    const p = i / Math.max(1, count - 1);
    out[first + i] += (i % 2 ? -1 : 1) * gain * (1 - p);
  }
}

// Shared warmth + DC-removal + edge-fade + peak-normalise pass. Every cue runs
// through this, so a cue's per-layer gains are relative, not absolute — the
// output always peaks near 0.88. That is why audio.js can keep tuning weapon
// balance with WEAPON_AUDIO_GAIN rather than re-deriving levels here.
function normalize(out, SR) {
  const alpha = 1 - Math.exp(-Math.PI * 2 * 6200 / SR);
  let low = 0;
  for (let i = 0; i < out.length; i++) {
    low += alpha * (out[i] - low);
    out[i] = low * 0.82 + out[i] * 0.18;
  }
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

// [name, seconds, paint]. paint(out, SR) is bound to the primitives above.
// Only the nine named in CONTACT_CUE / LAUNCH_CUE are wired into gameplay; the
// rest exist so a choice can be made by ear via the audition set.
export const CUES = [
  ['01-b33p-laser-orb-pulse.wav', 0.27, (b, SR) => {
    osc(b, SR, { duration: 0.12, f0: 1180, f1: 520, gain: 0.35, type: 'square', tremolo: 42 });
    osc(b, SR, { duration: 0.22, f0: 480, f1: 180, gain: 0.42, type: 'sine' });
    osc(b, SR, { start: 0.025, duration: 0.15, f0: 1760, f1: 720, gain: 0.16, type: 'triangle' });
  }],
  ['02-b33p-laser-orb-bubble.wav', 0.34, (b, SR) => {
    osc(b, SR, { duration: 0.3, f0: 720, f1: 210, gain: 0.5, type: 'sine', tremolo: 18 });
    osc(b, SR, { duration: 0.15, f0: 1420, f1: 620, gain: 0.18, type: 'triangle' });
    impulse(b, SR, 0.008, 0.2);
  }],
  ['03-b33p-laser-orb-arcade.wav', 0.24, (b, SR) => {
    osc(b, SR, { duration: 0.08, f0: 1500, f1: 920, gain: 0.3, type: 'square' });
    osc(b, SR, { start: 0.055, duration: 0.17, f0: 820, f1: 280, gain: 0.38, type: 'triangle' });
    noise(b, SR, { seed: 3, duration: 0.055, gain: 0.09, cutoff: 4200, mode: 'highpass' });
  }],
  ['04-grumpos-axe-heavy-whoosh.wav', 0.38, (b, SR) => {
    noise(b, SR, { seed: 4, duration: 0.3, gain: 0.44, cutoff: 1050, mode: 'lowpass', attack: 0.06 });
    osc(b, SR, { start: 0.17, duration: 0.18, f0: 145, f1: 52, gain: 0.42, type: 'sine' });
    impulse(b, SR, 0.205, 0.28, 0.008);
  }],
  ['05-grumpos-axe-bright-cleave.wav', 0.31, (b, SR) => {
    noise(b, SR, { seed: 5, duration: 0.2, gain: 0.31, cutoff: 2800, mode: 'highpass', attack: 0.04 });
    osc(b, SR, { start: 0.1, duration: 0.19, f0: 1850, f1: 820, gain: 0.28, type: 'sine' });
    osc(b, SR, { start: 0.11, duration: 0.14, f0: 330, f1: 110, gain: 0.34, type: 'triangle' });
  }],
  ['06-lorenzo-wrench-clang.wav', 0.32, (b, SR) => {
    impulse(b, SR, 0.045, 0.42, 0.009);
    noise(b, SR, { seed: 6, start: 0.038, duration: 0.08, gain: 0.22, cutoff: 3200, mode: 'highpass' });
    osc(b, SR, { start: 0.045, duration: 0.26, f0: 1260, f1: 980, gain: 0.35, type: 'sine', tremolo: 31 });
    osc(b, SR, { start: 0.045, duration: 0.2, f0: 630, f1: 520, gain: 0.22, type: 'sine' });
  }],
  ['07-lorenzo-wrench-thunk.wav', 0.26, (b, SR) => {
    noise(b, SR, { seed: 7, duration: 0.11, gain: 0.4, cutoff: 720 });
    osc(b, SR, { duration: 0.22, f0: 210, f1: 62, gain: 0.48, type: 'sine' });
    osc(b, SR, { start: 0.018, duration: 0.18, f0: 840, f1: 510, gain: 0.18, type: 'triangle' });
  }],
  ['08-raymn-rocket-fist-launch.wav', 0.37, (b, SR) => {
    noise(b, SR, { seed: 8, duration: 0.3, gain: 0.31, cutoff: 2400, mode: 'highpass', attack: 0.025 });
    osc(b, SR, { duration: 0.32, f0: 190, f1: 520, gain: 0.4, type: 'saw', tremolo: 24 });
    impulse(b, SR, 0.012, 0.26);
  }],
  ['09-raymn-spring-fist.wav', 0.31, (b, SR) => {
    osc(b, SR, { duration: 0.27, f0: 230, f1: 740, gain: 0.48, type: 'triangle', tremolo: 32 });
    osc(b, SR, { start: 0.16, duration: 0.13, f0: 980, f1: 420, gain: 0.22, type: 'sine' });
    impulse(b, SR, 0.018, 0.2);
  }],
  ['10-gnash-spin-dash-motor.wav', 0.42, (b, SR) => {
    osc(b, SR, { duration: 0.38, f0: 95, f1: 360, gain: 0.4, type: 'saw', tremolo: 36 });
    noise(b, SR, { seed: 10, duration: 0.35, gain: 0.23, cutoff: 1900, mode: 'highpass', attack: 0.05 });
    osc(b, SR, { start: 0.1, duration: 0.25, f0: 420, f1: 690, gain: 0.18, type: 'square' });
  }],
  ['11-gnash-spin-dash-whirl.wav', 0.34, (b, SR) => {
    osc(b, SR, { duration: 0.3, f0: 180, f1: 880, gain: 0.38, type: 'triangle', tremolo: 48 });
    noise(b, SR, { seed: 11, duration: 0.28, gain: 0.25, cutoff: 3300, mode: 'highpass', attack: 0.045 });
  }],
  ['12-mochi-compress-squish.wav', 0.3, (b, SR) => {
    osc(b, SR, { duration: 0.25, f0: 520, f1: 105, gain: 0.52, type: 'sine' });
    noise(b, SR, { seed: 12, duration: 0.15, gain: 0.18, cutoff: 560 });
    impulse(b, SR, 0.165, 0.16);
  }],
  ['13-mochi-compress-spring.wav', 0.32, (b, SR) => {
    osc(b, SR, { duration: 0.28, f0: 760, f1: 155, gain: 0.45, type: 'triangle', tremolo: 22 });
    osc(b, SR, { start: 0.13, duration: 0.15, f0: 170, f1: 390, gain: 0.28, type: 'sine' });
  }],
  ['14-miss-chomp-hard-snap.wav', 0.28, (b, SR) => {
    impulse(b, SR, 0.055, 0.52, 0.012);
    noise(b, SR, { seed: 14, start: 0.05, duration: 0.16, gain: 0.42, cutoff: 820 });
    osc(b, SR, { start: 0.052, duration: 0.2, f0: 185, f1: 64, gain: 0.35, type: 'sine' });
  }],
  ['15-miss-chomp-arcade-bite.wav', 0.25, (b, SR) => {
    osc(b, SR, { duration: 0.07, f0: 520, f1: 260, gain: 0.36, type: 'square' });
    impulse(b, SR, 0.075, 0.42, 0.01);
    osc(b, SR, { start: 0.08, duration: 0.15, f0: 240, f1: 90, gain: 0.38, type: 'triangle' });
  }],
  ['16-fernwick-shield-roll.wav', 0.39, (b, SR) => {
    noise(b, SR, { seed: 16, duration: 0.34, gain: 0.26, cutoff: 2100, mode: 'highpass', attack: 0.06 });
    osc(b, SR, { duration: 0.34, f0: 135, f1: 460, gain: 0.36, type: 'triangle', tremolo: 28 });
    osc(b, SR, { start: 0.18, duration: 0.16, f0: 920, f1: 640, gain: 0.17, type: 'sine' });
  }],
  ['17-fernwick-shield-bash.wav', 0.29, (b, SR) => {
    noise(b, SR, { seed: 17, duration: 0.11, gain: 0.42, cutoff: 1700, mode: 'highpass' });
    osc(b, SR, { duration: 0.24, f0: 310, f1: 78, gain: 0.48, type: 'sine' });
    osc(b, SR, { start: 0.018, duration: 0.23, f0: 1120, f1: 760, gain: 0.2, type: 'sine', tremolo: 27 });
  }],
  ['18-grumpos-axe-throw-ring.wav', 0.36, (b, SR) => {
    noise(b, SR, { seed: 18, duration: 0.23, gain: 0.25, cutoff: 2400, mode: 'highpass', attack: 0.05 });
    osc(b, SR, { start: 0.08, duration: 0.26, f0: 980, f1: 720, gain: 0.34, type: 'sine', tremolo: 38 });
    osc(b, SR, { duration: 0.22, f0: 190, f1: 74, gain: 0.32, type: 'triangle' });
  }],
  ['19-contact-box-soft-thud.wav', 0.24, (b, SR) => {
    impulse(b, SR, 0.012, 0.3, 0.009);
    noise(b, SR, { seed: 19, duration: 0.13, gain: 0.34, cutoff: 480 });
    osc(b, SR, { duration: 0.2, f0: 145, f1: 58, gain: 0.48, type: 'sine' });
  }],
  ['20-contact-box-hard-knock.wav', 0.25, (b, SR) => {
    impulse(b, SR, 0.01, 0.45, 0.011);
    noise(b, SR, { seed: 20, duration: 0.1, gain: 0.32, cutoff: 1150 });
    osc(b, SR, { duration: 0.22, f0: 285, f1: 92, gain: 0.44, type: 'triangle' });
  }],
  ['21-contact-cardboard-crumple.wav', 0.38, (b, SR) => {
    noise(b, SR, { seed: 21, duration: 0.33, gain: 0.5, cutoff: 760, attack: 0.003, release: 0.92 });
    impulse(b, SR, 0.02, 0.23, 0.008);
    impulse(b, SR, 0.09, 0.14, 0.006);
    impulse(b, SR, 0.17, 0.1, 0.005);
    osc(b, SR, { duration: 0.24, f0: 120, f1: 48, gain: 0.25, type: 'sine' });
  }],
  ['22-contact-wood-crack.wav', 0.34, (b, SR) => {
    impulse(b, SR, 0.014, 0.52, 0.014);
    noise(b, SR, { seed: 22, duration: 0.2, gain: 0.4, cutoff: 1350 });
    osc(b, SR, { duration: 0.28, f0: 235, f1: 66, gain: 0.42, type: 'triangle' });
    impulse(b, SR, 0.085, 0.12, 0.006);
  }],
  ['23-contact-metal-clang.wav', 0.4, (b, SR) => {
    impulse(b, SR, 0.012, 0.34, 0.006);
    noise(b, SR, { seed: 23, duration: 0.065, gain: 0.23, cutoff: 2600, mode: 'highpass' });
    osc(b, SR, { duration: 0.36, f0: 760, f1: 610, gain: 0.38, type: 'sine', tremolo: 29 });
    osc(b, SR, { duration: 0.31, f0: 380, f1: 315, gain: 0.3, type: 'sine', tremolo: 23 });
  }],
  ['24-contact-metal-dull-bong.wav', 0.43, (b, SR) => {
    impulse(b, SR, 0.012, 0.32, 0.009);
    osc(b, SR, { duration: 0.39, f0: 310, f1: 205, gain: 0.5, type: 'sine', tremolo: 17 });
    osc(b, SR, { duration: 0.3, f0: 155, f1: 96, gain: 0.32, type: 'triangle' });
    noise(b, SR, { seed: 24, duration: 0.08, gain: 0.16, cutoff: 1700, mode: 'highpass' });
  }],
  ['25-contact-b33p-orb-pop.wav', 0.29, (b, SR) => {
    impulse(b, SR, 0.01, 0.28, 0.005);
    osc(b, SR, { duration: 0.25, f0: 620, f1: 105, gain: 0.48, type: 'sine', tremolo: 25 });
    osc(b, SR, { duration: 0.1, f0: 1320, f1: 540, gain: 0.2, type: 'square' });
    noise(b, SR, { seed: 25, duration: 0.08, gain: 0.12, cutoff: 3000, mode: 'highpass' });
  }],
  ['26-contact-grumpos-axe-chop.wav', 0.34, (b, SR) => {
    impulse(b, SR, 0.012, 0.5, 0.013);
    noise(b, SR, { seed: 26, duration: 0.22, gain: 0.44, cutoff: 980 });
    osc(b, SR, { duration: 0.27, f0: 205, f1: 58, gain: 0.46, type: 'triangle' });
    osc(b, SR, { start: 0.018, duration: 0.21, f0: 910, f1: 570, gain: 0.17, type: 'sine' });
  }],
  ['27-contact-lorenzo-wrench-hit.wav', 0.36, (b, SR) => {
    impulse(b, SR, 0.012, 0.38, 0.008);
    osc(b, SR, { duration: 0.33, f0: 690, f1: 510, gain: 0.4, type: 'sine', tremolo: 26 });
    osc(b, SR, { duration: 0.24, f0: 225, f1: 72, gain: 0.36, type: 'triangle' });
    noise(b, SR, { seed: 27, duration: 0.07, gain: 0.18, cutoff: 2300, mode: 'highpass' });
  }],
  ['28-contact-raymn-fist-impact.wav', 0.28, (b, SR) => {
    impulse(b, SR, 0.01, 0.48, 0.015);
    noise(b, SR, { seed: 28, duration: 0.16, gain: 0.4, cutoff: 720 });
    osc(b, SR, { duration: 0.24, f0: 175, f1: 45, gain: 0.52, type: 'sine' });
  }],
  ['29-contact-fernwick-shield-bonk.wav', 0.39, (b, SR) => {
    impulse(b, SR, 0.012, 0.39, 0.01);
    osc(b, SR, { duration: 0.35, f0: 470, f1: 290, gain: 0.43, type: 'sine', tremolo: 21 });
    osc(b, SR, { duration: 0.28, f0: 190, f1: 67, gain: 0.39, type: 'triangle' });
    noise(b, SR, { seed: 29, duration: 0.09, gain: 0.16, cutoff: 1900, mode: 'highpass' });
  }],
  ['30-contact-miss-chomp-crunch.wav', 0.33, (b, SR) => {
    impulse(b, SR, 0.016, 0.45, 0.014);
    noise(b, SR, { seed: 30, duration: 0.26, gain: 0.48, cutoff: 680 });
    osc(b, SR, { duration: 0.25, f0: 160, f1: 48, gain: 0.4, type: 'sine' });
    impulse(b, SR, 0.11, 0.13, 0.007);
  }],
];

// Hero -> cue name for the cues actually triggered in gameplay.
export const CONTACT_CUE = {
  b33p: '25-contact-b33p-orb-pop.wav',
  grumpos: '26-contact-grumpos-axe-chop.wav',
  lorenzo: '27-contact-lorenzo-wrench-hit.wav',
  raymn: '28-contact-raymn-fist-impact.wav',
  fernwick: '29-contact-fernwick-shield-bonk.wav',
  chompo: '30-contact-miss-chomp-crunch.wav',
};

export const LAUNCH_CUE = {
  b33p: '01-b33p-laser-orb-pulse.wav',
  raymn: '08-raymn-rocket-fist-launch.wav',
  grumpos: '18-grumpos-axe-throw-ring.wav',
};

const BY_NAME = new Map(CUES.map((cue) => [cue[0], cue]));

// Render one cue by name into a normalised Float32Array at the given rate.
export function renderCue(name, SR) {
  const cue = BY_NAME.get(name);
  if (!cue) throw new Error(`unknown weapon cue: ${name}`);
  const [, seconds, paint] = cue;
  // Float64 accumulation (not Float32): the layers and the normalise pass sum
  // in double precision, so int16 quantisation matches the original tool's
  // output exactly. AudioBuffer's channel is Float32 — the narrowing happens
  // once, at copy time, in the caller.
  const out = new Float64Array(Math.ceil(seconds * SR));
  paint(out, SR);
  normalize(out, SR);
  return out;
}
