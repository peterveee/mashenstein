/*
 * FRPP-6's exciter tables: the pluck, with the body already in it.
 *
 * ---- why the body lives in the pluck ------------------------------------------------
 *
 * String and body are both linear, so body(string(pluck)) and string(body(pluck)) are the
 * same signal. That is commuted synthesis (Smith; Karjalainen and Välimäki), the trick
 * behind every convincing waveguide guitar. It means the body — a bank of resonant
 * state-variable filters — is run ONCE, here, on the main thread when a patch installs,
 * and rendered into the excitation the core injects. The core then pays nothing per sample
 * for the body however many modes it has, which is why a body here can have twenty-one
 * modes where a per-sample one could afford three.
 *
 * What it gives up: turning BODY changes the next pluck, not one already ringing.
 *
 * The same modes run per sample in the core when `internal.bodyMethod` is 'lane' — the A/B
 * the Gate A auditions make, and the body a bowed string will need in Stage 3, since a
 * bow has no one-shot excitation to fold anything into. That makes the SVF here and the
 * SVF in dsp.js two copies of the same six lines. tests/frpp6-dsp.js holds them together:
 * the commuted render and the lane render of one pluck must agree to 1e-4, and they only
 * can if the two filters are the same filter.
 *
 * ---- why not in the worklet ---------------------------------------------------------
 *
 * Building these is tens of milliseconds, and the worklet is the audio thread. The tables
 * arrive at the core already built, as TNGR-2's wavetables do.
 */

import { FRPP6_BODY_SETS, FRPP6_BODY_MODE_KEYS, validateFrpp6, frpp6PlayOf, isFrpp6Sustained } from './schema.js';
import {
  driveCurveTable, DRIVE_HEADROOM, DRIVE_CURVE_POINTS, driveRef, DRIVE_REF_MIN, DRIVE_REF_MAX,
} from '../drive-curve.js';

/** Seeded, so a table is the same table on every machine and in every render. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The body's modes, as a flat [f, q, g, f, q, g, …] list at this rate: the three primary
 * modes (or the Advanced edits of them) and then the seeded cloud. SIZE scales every
 * frequency together, as a bigger box would. Modes above 0.45 of the rate are dropped.
 */
export function frpp6BodyModes(body, sampleRate) {
  const set = FRPP6_BODY_SETS[body?.type];
  if (!set) return new Float64Array(0);
  const size = body.size || 1;
  const out = [];
  const add = (f, q, g) => {
    const hz = f / size;
    if (hz < 0.45 * sampleRate && g > 0) out.push(hz, q, g);
  };
  // The three named modes, each as the set has it unless a pot pinned its hz or q, and
  // trimmed by its dB — the Body · Advanced door.
  set.primary.forEach(([f, q, g], i) => {
    const o = body[FRPP6_BODY_MODE_KEYS[i]] || {};
    add(o.hz ?? f, o.q ?? q, g * 10 ** ((o.db || 0) / 20));
  });
  const c = set.cloud;
  const rand = rng(c.seed);
  for (let i = 0; i < c.count; i++) {
    const at = (i + 0.5 + (rand() - 0.5) * 0.8) / c.count;
    const f = c.lo * (c.hi / c.lo) ** at;
    const g = c.gain * 10 ** ((c.tilt * Math.log2(f / c.lo)) / 20) * (0.6 + 0.8 * rand());
    add(f, c.q * (0.7 + 0.6 * rand()), g);
  }
  return new Float64Array(out);
}

/**
 * The TPT state-variable bandpass (Simper), normalised to unity at its peak: k·v1. The
 * same arithmetic, in the same order, as the lane body in dsp.js — see the header.
 */
function svfCoefs(f, q, sampleRate) {
  const g = Math.tan(Math.PI * f / sampleRate);
  const k = 1 / q;
  const a1 = 1 / (1 + g * (g + k));
  const a2 = g * a1;
  return { k, a1, a2, a3: g * a2 };
}

/** How long the slowest mode takes to fall 90 dB, capped: the table's tail. */
function bodyTail(modes) {
  let t60 = 0;
  for (let m = 0; m < modes.length; m += 3) {
    t60 = Math.max(t60, (6.91 * modes[m + 1]) / (Math.PI * modes[m]));
  }
  return Math.min(1.2, 1.5 * t60);
}

/**
 * One burst, through the body, DC-blocked. `mix` 0 is the dry burst; 1 is all body.
 * The DC blocker is part of the table so that nothing with a mean ever enters a loop whose
 * gain is nearly one.
 */
function renderThroughBody(burst, modes, mix, sampleRate, tailSeconds) {
  const len = burst.length + Math.ceil(tailSeconds * sampleRate);
  const out = new Float64Array(len);
  for (let n = 0; n < burst.length; n++) out[n] = burst[n] * (modes.length ? 1 - mix : 1);
  if (modes.length && mix > 0) {
    for (let m = 0; m < modes.length; m += 3) {
      const { k, a1, a2, a3 } = svfCoefs(modes[m], modes[m + 1], sampleRate);
      const gain = mix * modes[m + 2] * k;
      let ic1 = 0;
      let ic2 = 0;
      for (let n = 0; n < len; n++) {
        const x = n < burst.length ? burst[n] : 0;
        const v3 = x - ic2;
        const v1 = a1 * ic1 + a2 * v3;
        const v2 = ic2 + a2 * ic1 + a3 * v3;
        ic1 = 2 * v1 - ic1;
        ic2 = 2 * v2 - ic2;
        out[n] += gain * v1;
      }
    }
  }
  return dcBlock(out, sampleRate);
}

function dcBlock(x, sampleRate) {
  const r = 1 - (2 * Math.PI * 25) / sampleRate;
  let x1 = 0;
  let y1 = 0;
  for (let n = 0; n < x.length; n++) {
    const y = x[n] - x1 + r * y1;
    x1 = x[n];
    y1 = y;
    x[n] = y;
  }
  return x;
}

const energyOf = (x) => {
  let e = 0;
  for (let n = 0; n < x.length; n++) e += x[n] * x[n];
  return e;
};
const scaled = (x, by) => {
  const out = new Float32Array(x.length);
  for (let n = 0; n < x.length; n++) out[n] = x[n] * by;
  return out;
};

/**
 * A pluck: one sample. HARDNESS is not in the table — it is a lowpass the core runs at
 * note-on with its cutoff a number of HARMONICS above the note, because a fingertip is a
 * width on the STRING, and a width on the string is a fixed fraction of its period
 * whatever the fret. Baked in as a fixed time it was a fixed frequency instead, and a soft
 * pluck could not reach a high note's own fundamental: nylon fell 30 dB up the neck.
 */
function pluckPulse() {
  return Float64Array.of(0, 1);
}

/** A strike: a hammer's push and rebound, short; HARDNESS is the same lowpass as a pluck's. */
function strikePulse(sampleRate) {
  const n = Math.max(4, Math.round(0.0004 * sampleRate));
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const p = (2 * Math.PI * i) / n;
    out[i] = Math.sin(p) * 0.5 * (1 - Math.cos(p));
  }
  return out;
}

/** A seeded white burst, LENGTH long: a quick rise and a raised-cosine fall over its last 30%. */
function noiseBurst(seconds, seed, sampleRate) {
  const n = Math.max(8, Math.round(seconds * sampleRate));
  const rise = Math.max(1, Math.round(0.0005 * sampleRate));
  const fall = Math.max(1, Math.round(n * 0.3));
  const rand = rng(seed);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let w = 1;
    if (i < rise) w = i / rise;
    const left = n - i;
    if (left < fall) w *= 0.5 * (1 - Math.cos((Math.PI * left) / fall));
    out[i] = (rand() * 2 - 1) * w;
  }
  return out;
}

/** The scratch of a muted chuck or a hand lifting off: 7 ms of noise with the low end gone. */
function scrapeBurst(seed, sampleRate) {
  const burst = noiseBurst(0.007, seed, sampleRate);
  const c = Math.exp((-2 * Math.PI * 1200) / sampleRate);
  let lp = 0;
  for (let i = 0; i < burst.length; i++) {
    lp = (1 - c) * burst[i] + c * lp;
    burst[i] -= lp;
  }
  return burst;
}

/**
 * FRET: the tick of a string landing on a fret — a 2.8 kHz ring with a grain of noise in
 * it, gone in a few milliseconds.
 *
 * Scaled to the ENERGY of the 0.6 ms tick Peter approved (23 Oct 2026), not to its peak.
 * That one was nearly a single spike: 39 dB of crest on a single note, which the level
 * system read as headroom and answered by playing the funk presets 8 dB down. Rung out over
 * 1.8 ms instead, the same energy arrives at well under half the peak.
 */
function fretClick(sampleRate) {
  const shape = (tau, seconds) => {
    const n = Math.round(seconds * sampleRate);
    const rand = rng(0xf2e7);
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      out[i] = Math.sin(2 * Math.PI * 2800 * t) * Math.exp(-t / tau)
        + 0.3 * (rand() * 2 - 1) * Math.exp(-t / (tau * 0.67));
    }
    return out;
  };
  const approved = shape(0.0006, 0.004);
  let peak = 0;
  for (const v of approved) peak = Math.max(peak, Math.abs(v));
  const target = energyOf(approved) / (peak * peak);
  const wide = shape(0.0018, 0.012);
  return scaled(wide, Math.sqrt(target / energyOf(wide)));
}

/**
 * SQUEAK: fingers sliding along a wound string — 90 ms of noise through a resonant band
 * rising from 900 Hz to 2.6 kHz, swelling in and out. Peak 1; the core scales it.
 */
function fingerSqueak(sampleRate) {
  const n = Math.round(0.09 * sampleRate);
  const rand = rng(0x5e9a);
  const out = new Float32Array(n);
  let ic1 = 0;
  let ic2 = 0;
  for (let i = 0; i < n; i++) {
    const at = i / n;
    const { k, a1, a2, a3 } = svfCoefs(900 * (2600 / 900) ** at, 6, sampleRate);
    const v3 = (rand() * 2 - 1) - ic2;
    const v1 = a1 * ic1 + a2 * v3;
    const v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1;
    ic2 = 2 * v2 - ic2;
    out[i] = k * v1 * Math.sin(Math.PI * at) ** 1.5;
  }
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  for (let i = 0; i < n; i++) out[i] /= peak;
  return out;
}

export const FRPP6_NOISE_VARIANTS = 4;
export const FRPP6_SCRAPE_VARIANTS = 2;

/**
 * Every table a patch needs, at one rate — and only those: an IMPULSE patch builds no noise,
 * and no patch builds the scrape unless MUTED BELOW or LIFT can reach for it.
 *
 * Levels: the pulse and the scrape are scaled to unit energy, so BODY changes
 * the colour of a pluck rather than its loudness. A long NOISE burst gets more than unit
 * energy, growing with the square root of its length, so a bowed-length burst is not a
 * whisper beside a pluck. In lane mode each table is the DRY burst, scaled by the factor
 * its commuted twin needed, which is what makes the two renders comparable at all.
 */
export function buildFrpp6Tables(patch, sampleRate) {
  // A bowed string has no one-shot pluck to fold the body into: its body runs per sample on
  // the lane, from the few modes the VIOLIN and CELLO sets carry.
  const sustained = isFrpp6Sustained(patch.exciter.type);
  if (sustained) {
    const modes = frpp6BodyModes(patch.body, sampleRate);
    return { pulse: null, noise: [], scrape: [], fret: null, squeak: null, modes, tail: 0, lane: true };
  }
  const lane = patch.internal?.bodyMethod === 'lane';
  const modes = frpp6BodyModes(patch.body, sampleRate);
  const mix = patch.body.mix;
  const tail = modes.length ? bodyTail(modes) : 0;
  const make = (burst, targetEnergy) => {
    const wet = renderThroughBody(burst, modes, mix, sampleRate, tail);
    const factor = Math.sqrt(targetEnergy / Math.max(1e-30, energyOf(wet)));
    if (!lane) return scaled(wet, factor);
    // Padded to its twin's length first: the DC blocker's own tail is part of the table,
    // and cutting it off is a difference between the two that has nothing to do with bodies.
    const dry = new Float64Array(wet.length);
    dry.set(burst);
    return scaled(dcBlock(dry, sampleRate), factor);
  };
  const type = patch.exciter.type;
  const tables = { pulse: null, noise: [], scrape: [], fret: null, squeak: null, modes, tail, lane };
  if (type !== 'noise') {
    const pulse = type === 'impulse' ? strikePulse(sampleRate) : pluckPulse();
    tables.pulse = make(pulse, 1);
  }
  if (type !== 'impulse') {
    const length = patch.exciter.length;
    const energy = Math.max(1, Math.sqrt(length / 0.006));
    for (let v = 0; v < FRPP6_NOISE_VARIANTS; v++) {
      tables.noise.push(make(noiseBurst(length, 0x5eed + v * 7919, sampleRate), energy));
    }
  }
  if (patch.damping.mutedBelow > 0 || patch.damping.lift > 0) {
    for (let v = 0; v < FRPP6_SCRAPE_VARIANTS; v++) {
      tables.scrape.push(make(scrapeBurst(0xc4ac + v * 104729, sampleRate), 1));
    }
  }
  if (patch.damping.fret > 0) tables.fret = fretClick(sampleRate);
  if (patch.damping.squeak > 0) tables.squeak = fingerSqueak(sampleRate);
  return tables;
}

const compiled = new Map();

/**
 * EVEN UP THE NECK.
 *
 * How loud a string sounds depends on how much of its pluck lands on its own harmonics, and
 * that changes with pitch: a body's energy sits low, BRIGHT rolls the top off, KEY FOLLOW
 * shortens high notes. Left alone a nylon patch fell 30 dB from E2 to E6. No closed form
 * covers all of that, so the patch is MEASURED: one note every four semitones, 0.3 s each,
 * through the real core, and the inverse is the level curve the core applies at note-on.
 * About 7 ms per patch, once, when it compiles. A2 is the anchor and keeps its level.
 *
 * The core is registered rather than imported, because this module runs on the main
 * thread and the core is source text: dsp.js registers its Node evaluation, and the live
 * controller registers the copy it loads as a module.
 */
let CalCore = null;
export function registerFrpp6Core(Core) {
  CalCore = Core;
  compiled.clear();
}
export const FRPP6_LEVEL_LO = 12;
export const FRPP6_LEVEL_STEP = 4;
const LEVEL_POINTS = 28;
const hzOfMidi = (midi) => 440 * 2 ** ((midi - 69) / 12);

function levelCurve(result, sampleRate) {
  const core = new CalCore({ sampleRate });
  // The string's level, not the hand's: FRET and SQUEAK are kept out of the measurement.
  // Undriven and in mono (spread 0), because the A2 peak this also takes is the DRIVE's
  // stage — the string as the shaper will meet it. The curve itself is pan-independent
  // either way: the pan law keeps L² + R² constant.
  core.installPatch({ ...result, damping: { ...result.damping, fret: 0, squeak: 0 },
    strings: { ...result.strings, spread: 0 }, drive: null,
    play: { mode: 'poly', glide: 0, vibrato: null }, levelCurve: null });
  const frames = Math.round(0.3 * sampleRate);
  const out = [new Float32Array(128), new Float32Array(128)];
  const rms = [];
  // A sustained exciter is measured over its held note less its attack; a pluck from the strike.
  const skip = isFrpp6Sustained(result.exciter.type) ? Math.round(0.15 * sampleRate) : 0;
  for (let k = 0; k < LEVEL_POINTS; k++) {
    const hz = Math.min(sampleRate / 5.5, hzOfMidi(FRPP6_LEVEL_LO + k * FRPP6_LEVEL_STEP));
    core.reset();
    core.scheduleAll([{ type: 'noteOn', frame: 0, eventId: 1, hz, velocity: 1 }]);
    let e = 0;
    for (let f = 0; f < frames + skip; f += 128) {
      const n = Math.min(128, frames + skip - f);
      core.process(out, f, n, 0);
      if (f >= skip) for (let i = 0; i < n; i++) e += out[0][i] * out[0][i] + out[1][i] * out[1][i];
    }
    rms.push(Math.sqrt(e / frames));
  }
  // The A2 peak, at level 1: where the drive's knee goes (frpp6DriveOf).
  core.reset();
  core.scheduleAll([{ type: 'noteOn', frame: 0, eventId: 1, hz: 110, velocity: 1 }]);
  let stringPeak = 0;
  for (let f = 0; f < frames + skip; f += 128) {
    const n = Math.min(128, frames + skip - f);
    core.process(out, f, n, 0);
    if (f >= skip) for (let i = 0; i < n; i++) { const a = Math.abs(out[0][i]); if (a > stringPeak) stringPeak = a; }
  }
  core.reset();
  const ref = rms[(45 - FRPP6_LEVEL_LO) / FRPP6_LEVEL_STEP | 0]
    + (rms[Math.ceil((45 - FRPP6_LEVEL_LO) / FRPP6_LEVEL_STEP)] - rms[(45 - FRPP6_LEVEL_LO) / FRPP6_LEVEL_STEP | 0])
      * (((45 - FRPP6_LEVEL_LO) / FRPP6_LEVEL_STEP) % 1);
  // Bounded, so a broken measurement cannot run away — but wide: a bow pressed hard is many
  // dB louder at the top of the board than at A2, and that is what this is for.
  return { curve: Float32Array.from(rms, (r) => Math.min(16, Math.max(1 / 32, r > 1e-9 ? ref / r : 1))), stringPeak };
}

/**
 * A voice (or a bare `frpp6` block) to what the core installs: the clamped patch, the
 * voice-level play controls beside it, and its tables at this rate. Memoised per patch and
 * rate, because a song plays the same preset on many notes and a lane rebuild should not
 * rebuild tables that have not changed.
 */
/**
 * The shared Effects card's DRIVE, SHAPE, PLACE and TONE, as the core plays them: the same
 * keys and the same curve every other synth's pot uses (src/engine/drive-curve.js), and
 * the same rule — the knee at the sound's own peak, so DRIVE changes the character and not
 * the level (the 9 Oct 2026 staging; see `driveRef`).
 *
 * THE STAGE: the string's own peak, measured by the engine itself when the patch compiles
 * (`levelCurve` below renders an A2 at level 1, hand noises off, spread 0 — exactly what
 * the shaper is fed). Not the stored `peak` the other synths use: that is measured with
 * the hand noises in, and the funk guitar's fret tick peaks 12 dB above its string, which
 * put the knee 12 dB above anything the string could reach and turned DRIVE into a volume
 * pot. Measured through the engine it is self-consistent by construction, and the level
 * curve runs BEFORE the drive, so every note up the neck meets the knee the same way. A
 * host with no core registered falls back to `driveRef`; CRUSH is not staged (a quantiser
 * changes no level). The 32k-point table is built here, on the main thread, once per patch.
 */
function frpp6DriveOf(voice, stringPeak) {
  const amount = Math.min(1, Math.max(0, Number(voice?.drive) || 0));
  if (!(amount > 0)) return null;
  const ref = voice?.shape === 'crush' || !(stringPeak > 0) ? driveRef(voice)
    : Math.min(DRIVE_REF_MAX, Math.max(DRIVE_REF_MIN, stringPeak));
  const curve = driveCurveTable(amount, voice.shape, DRIVE_HEADROOM, DRIVE_CURVE_POINTS);
  for (let i = 0; i < curve.length; i++) curve[i] *= ref;
  return {
    curve,
    scaleIn: 1 / (ref * DRIVE_HEADROOM),
    // PRE drives each string before its FILTER, POST after it — per string either way, as
    // on TNGR-2. (It drove the lane's SUM for a day: the strings of a chord distorting
    // together, as through an amp — but the sum carries every note's own level, and the
    // knee has to meet the string at the string's level, on every lane.)
    pre: voice.drivePlace === 'pre',
    tone: Math.min(20000, Math.max(20, Number(voice.tone?.freq) || 18000)),
  };
}

export function compileFrpp6(voiceOrStored, sampleRate) {
  const isVoice = voiceOrStored && voiceOrStored.frpp6 !== undefined;
  const stored = isVoice ? voiceOrStored.frpp6 : voiceOrStored;
  const voice = isVoice ? voiceOrStored : {};
  const play = frpp6PlayOf(voice);
  const driveKey = [voice.drive, voice.shape, voice.drivePlace, voice.tone?.freq, voice.peak];
  const key = `${sampleRate}|${!!CalCore}|${JSON.stringify(stored)}|${JSON.stringify(play)}|${JSON.stringify(driveKey)}`;
  const hit = compiled.get(key);
  if (hit) return hit;
  const patch = validateFrpp6(stored);
  const result = { ...patch, play, drive: null, sampleRate,
    tables: buildFrpp6Tables(patch, sampleRate), levelCurve: null, stringPeak: 0 };
  if (CalCore) {
    const cal = levelCurve(result, sampleRate);
    result.levelCurve = cal.curve;
    result.stringPeak = cal.stringPeak;
  }
  // After the calibration, which it depends on — and which must not see it.
  result.drive = frpp6DriveOf(voice, result.stringPeak);
  if (compiled.size > 64) compiled.delete(compiled.keys().next().value);
  compiled.set(key, result);
  return result;
}

/** For callers that want the play controls on a bare block (the auditions, the tests). */
export function compileFrpp6With(stored, sampleRate, play = {}) {
  return compileFrpp6({ frpp6: stored, ...play }, sampleRate);
}
