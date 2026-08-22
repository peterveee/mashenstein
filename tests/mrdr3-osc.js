/*
 * The band-limited oscillator — docs/MRDR-3-worklet-spec.md §3.3.
 *
 * Tier B: not specified, so this cannot be a transcription and the sound will need the
 * ear before any preset crosses. What CAN be settled without the ear is whether the thing
 * is band-limited at all, whether it steps at a mip boundary, and whether it is
 * deterministic — and those are the three ways a wavetable oscillator goes wrong.
 *
 * Browserless on purpose: nothing here needs a browser, and §3.3's requirement is stated
 * against tests/mrdr3-dsp.js, which is the browserless half of the suite.
 *
 * The mip-boundary case is the one that matters most and the one a casual implementation
 * fails. Every modulation source in this synth — glide, vibrato, the pitch envelope, FM —
 * moves the instantaneous frequency, so a note sitting on a boundary crosses it
 * repeatedly. If levels are snapped rather than crossfaded, or normalised per level rather
 * than once for the pyramid, that crossing is a level step at the vibrato rate: a wobble
 * that is not in the vibrato and cannot be turned off.
 */
import {
  mrdr3Tables, MRDR3_TABLE_SIZE, MRDR3_LEVELS, MRDR3_MAX_PARTIALS,
} from '../src/engine/mrdr3/tables.js';
import { MRDR3_OSC_SOURCE } from '../src/engine/mrdr3/osc.js';
import { MRDR3_DSP_SOURCE } from '../src/engine/mrdr3/dsp.js';

// The pulse lives in the core rather than in osc.js, because it is a USE of the pyramid
// rather than a way of reading one. Lifted out by name so this suite can exercise it
// without standing up a whole synth.
const DSP_PULSE = MRDR3_DSP_SOURCE.slice(
  MRDR3_DSP_SOURCE.indexOf('function mrdr3Blep'),
  MRDR3_DSP_SOURCE.indexOf('function mrdr3PwmDuty'),
);

const O = new Function(`${MRDR3_OSC_SOURCE}; return { mrdr3Level, mrdr3Read };`)();

let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg));

const SR = 44100;
const STRIDE = MRDR3_TABLE_SIZE + 1;
const TABLES = mrdr3Tables([0.5, 0.25]);

/** Render `n` samples of one waveform at a fixed pitch. */
const render = (kind, hz, n, phase0 = 0) => {
  const data = TABLES.kinds[kind];
  const out = new Float64Array(n);
  let phase = phase0;
  const inc = hz / SR;
  const level = O.mrdr3Level(hz, SR, MRDR3_TABLE_SIZE, MRDR3_LEVELS);
  for (let i = 0; i < n; i++) {
    out[i] = O.mrdr3Read(data, STRIDE, MRDR3_TABLE_SIZE, level, phase);
    phase += inc;
    if (phase >= 1) phase -= 1;
  }
  return out;
};

/** Energy at a frequency, by direct correlation — enough to find an alias without an FFT. */
const energyAt = (buf, hz) => {
  let re = 0;
  let im = 0;
  const w = (2 * Math.PI * hz) / SR;
  for (let i = 0; i < buf.length; i++) { re += buf[i] * Math.cos(w * i); im += buf[i] * Math.sin(w * i); }
  return (2 * Math.sqrt(re * re + im * im)) / buf.length;
};

// ---- 1. the partials that should be there, are ------------------------------------
{
  const hz = 220;
  const buf = render('sawtooth', hz, 1 << 15);
  const h1 = energyAt(buf, hz);
  const h2 = energyAt(buf, hz * 2);
  const h3 = energyAt(buf, hz * 3);
  // A sawtooth's nth partial is 1/n of the first. Loose bounds: what is asserted is the
  // SHAPE, because the pyramid is peak-normalised and the absolute level is arbitrary.
  assert(Math.abs(h2 / h1 - 0.5) < 0.02 && Math.abs(h3 / h1 - 1 / 3) < 0.02,
    `a sawtooth's partials fall as 1/n (h2/h1 ${(h2 / h1).toFixed(3)}, h3/h1 ${(h3 / h1).toFixed(3)})`);
}

// ---- 2. and the ones that should not, are not -------------------------------------
//
// The whole purpose of the pyramid. A naive table read at a high pitch folds everything
// above Nyquist back down as inharmonic energy, and inharmonic energy is what aliasing
// SOUNDS like — a metallic shimmer that tracks the note the wrong way.
for (const hz of [2000, 5000, 9000]) {
  const buf = render('sawtooth', hz, 1 << 15);
  const h1 = energyAt(buf, hz);
  // Probe frequencies that are NOT harmonics of the note: anything here is folded.
  let worst = 0;
  for (const probe of [hz * 0.37, hz * 0.61, hz * 1.29, hz * 1.77]) {
    if (probe > SR * 0.5) continue;
    worst = Math.max(worst, energyAt(buf, probe) / h1);
  }
  assert(worst < 0.002,
    `sawtooth at ${hz}Hz has no inharmonic energy (worst ${(worst * 100).toFixed(3)}% of the fundamental)`);
}

// ---- 3. no level STEP across a mip boundary ---------------------------------------
//
// The failure this is really about: two neighbouring pitches, either side of a boundary,
// must have the same amplitude. Per-level normalisation or a snapped level makes them
// differ, and a vibrato straddling the boundary then wobbles in LEVEL at the vibrato rate.
{
  const lowest = SR / MRDR3_TABLE_SIZE;
  let worstStep = 0;
  let worstAt = 0;
  for (let level = 1; level < 8; level++) {
    const boundary = lowest * (2 ** level);
    const below = render('sawtooth', boundary * 0.999, 1 << 14);
    const above = render('sawtooth', boundary * 1.001, 1 << 14);
    const rms = (b) => Math.sqrt(b.reduce((a, x) => a + x * x, 0) / b.length);
    const step = Math.abs(rms(above) / rms(below) - 1);
    if (step > worstStep) { worstStep = step; worstAt = boundary; }
  }
  assert(worstStep < 0.01,
    `crossing a mip boundary does not step the level (worst ${(worstStep * 100).toFixed(2)}% at ${worstAt.toFixed(0)}Hz)`);
}

// ---- 4. and the level moves CONTINUOUSLY, so a glide has no seam -------------------
//
// Measured on the ENVELOPE rather than on the samples, and that is not a convenience.
// A band-limited sawtooth built from this series has its discontinuity at phase 0.5 —
// the sum of (2/n*pi)(-1)^(n+1)sin(n*theta) is a ramp that resets at theta = pi, not at
// zero — so a per-sample jump test measures the waveform's own reset and says nothing
// about the level. What a mip seam actually looks like is a step in AMPLITUDE as the
// crossfade moves, so that is what is measured: a sliding RMS across a two-octave glide,
// which must not jump anywhere.
{
  const data = TABLES.kinds.sawtooth;
  const n = 1 << 15;
  const from = 400;
  const to = 1600;                       // across two boundaries
  const out = new Float64Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const hz = from * ((to / from) ** (i / n));
    const level = O.mrdr3Level(hz, SR, MRDR3_TABLE_SIZE, MRDR3_LEVELS);
    out[i] = O.mrdr3Read(data, STRIDE, MRDR3_TABLE_SIZE, level, phase);
    phase += hz / SR;
    if (phase >= 1) phase -= 1;
  }
  // Windows of 512 samples: long enough to hold several cycles at the lowest pitch here,
  // short enough that a boundary crossing lands inside one rather than being averaged away.
  const W = 512;
  const rms = [];
  for (let base = 0; base + W <= n; base += W) {
    let sum = 0;
    for (let i = base; i < base + W; i++) sum += out[i] * out[i];
    rms.push(Math.sqrt(sum / W));
  }
  const worstOf = (series) => {
    let w = 0;
    for (let i = 1; i < series.length; i++) w = Math.max(w, Math.abs(series[i] / series[i - 1] - 1));
    return w;
  };
  const worst = worstOf(rms);

  // THE CONTROL, and the reason this assertion means anything. A sliding RMS over a glide
  // varies for reasons that have nothing to do with the pyramid: the window holds a
  // changing number of cycles and never a whole number of them, so the measurement itself
  // wobbles by a few percent. Asserting a bare threshold on that would be asserting the
  // window size. So the same glide is rendered again ENTIRELY INSIDE one mip level, where
  // by construction there is no seam to find, and the two are compared. If crossing two
  // boundaries is no worse than not crossing any, the crossfade is doing its job.
  const flat = new Float64Array(n);
  phase = 0;
  const heldLevel = O.mrdr3Level(from, SR, MRDR3_TABLE_SIZE, MRDR3_LEVELS);
  for (let i = 0; i < n; i++) {
    const hz = from * ((to / from) ** (i / n));
    flat[i] = O.mrdr3Read(data, STRIDE, MRDR3_TABLE_SIZE, heldLevel, phase);
    phase += hz / SR;
    if (phase >= 1) phase -= 1;
  }
  const flatRms = [];
  for (let base = 0; base + W <= n; base += W) {
    let sum = 0;
    for (let i = base; i < base + W; i++) sum += flat[i] * flat[i];
    flatRms.push(Math.sqrt(sum / W));
  }
  const control = worstOf(flatRms);
  assert(worst < control * 1.5 + 0.005,
    `a glide across two mip boundaries is no less smooth than one inside a single level`
    + ` (${(worst * 100).toFixed(2)}% against a ${(control * 100).toFixed(2)}% control)`);
}

// ---- 5. determinism ----------------------------------------------------------------
{
  const a = render('square', 330, 4096);
  const b = render('square', 330, 4096);
  let same = true;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { same = false; break; }
  assert(same, 'two renders of one pitch are sample-identical');
  const rebuilt = mrdr3Tables([0.5]);
  let tablesSame = true;
  for (let i = 0; i < 4096; i++) {
    if (rebuilt.kinds.square[i] !== TABLES.kinds.square[i]) { tablesSame = false; break; }
  }
  assert(tablesSame, 'and the pyramid rebuilds bit-identically — a table is not a seed');
}

// ---- 6. the pulse keeps its rotation ------------------------------------------------
//
// `pulseTable`'s phi = pi*d rotation slides the plateau to START at phase 0. Without it a
// note gated on at phase 0 begins at most of full scale, and a zero-attack gate on that
// is the tick at note-on the native path went to some trouble to remove.
{
  const p = TABLES.pulses['0.2500'];
  assert(p && Math.abs(p[0]) < 0.45,
    `a 25% pulse starts near zero rather than at its plateau (${p ? p[0].toFixed(3) : 'missing'})`);
  const half = TABLES.pulses['0.5000'];
  // At 50% duty every even term vanishes and the rectangle IS a square — the arithmetic's
  // own check that the series is right.
  const sq = TABLES.kinds.square;
  let maxD = 0;
  for (let i = 0; i < MRDR3_TABLE_SIZE; i++) maxD = Math.max(maxD, Math.abs(Math.abs(half[i]) - Math.abs(sq[i])));
  assert(maxD < 0.02, `a 50% pulse is a square (max |difference| ${maxD.toFixed(4)})`);
}

// ---- 7. the moving pulse, against a properly band-limited reference ----------------
//
// §3.4's Tier-C item, and the measurement that decided how to build it. The reference is
// a pulse synthesised from every partial that fits under Nyquist and not one above:
// anything a generator produces that is not that is error, and folded back it is audible
// error. Compared against the polyBLEP alternative the spec also proposed, so the choice
// stays visible rather than becoming a fact nobody can re-examine.
{
  const O2 = new Function(`${MRDR3_OSC_SOURCE}
    ${DSP_PULSE}
    ; return { mrdr3Pulse, mrdr3Blep, mrdr3Level, mrdr3Read };`)();
  const saw = TABLES.kinds.sawtooth;

  const ideal = (hz, duty, n) => {
    const out = new Float64Array(n);
    const maxN = Math.floor((SR * 0.5) / hz);
    const phi = Math.PI * duty;
    for (let k = 1; k <= maxN; k++) {
      const a = (4 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
      if (!a) continue;
      for (let i = 0; i < n; i++) {
        const th = (2 * Math.PI * k * hz * i) / SR;
        out[i] += a * (Math.cos(k * phi) * Math.cos(th) + Math.sin(k * phi) * Math.sin(th));
      }
    }
    return out;
  };
  const sawDiff = (hz, duty, n) => {
    const out = new Float64Array(n);
    let ph = 0;
    const inc = hz / SR;
    const lv = O2.mrdr3Level(hz, SR, MRDR3_TABLE_SIZE, MRDR3_LEVELS);
    for (let i = 0; i < n; i++) {
      out[i] = O2.mrdr3Pulse(saw, STRIDE, MRDR3_TABLE_SIZE, lv, ph, duty);
      ph += inc;
      if (ph >= 1) ph -= 1;
    }
    return out;
  };
  const raw = (hz, duty, n) => {
    const out = new Float64Array(n);
    let ph = 0;
    const inc = hz / SR;
    for (let i = 0; i < n; i++) {
      out[i] = (ph < duty ? 1 : -1) - (2 * duty - 1);
      ph += inc;
      if (ph >= 1) ph -= 1;
    }
    return out;
  };
  const rmsOf = (a) => Math.sqrt(a.reduce((s2, v) => s2 + v * v, 0) / a.length);
  // Scale-invariant: the constructions normalise differently and this is about SHAPE.
  const errOf = (a, b) => {
    const k = rmsOf(b) / rmsOf(a);
    return (rmsOf(a.map((v, i) => v * k - b[i])) / rmsOf(b)) * 100;
  };

  // The duties and pitches this library actually asks for: width 0.15 to 0.60, on pads
  // and basses. The 5kHz case is there because a narrow duty puts its energy high.
  for (const [hz, duty, bound] of [[110, 0.5, 3], [220, 0.15, 5], [440, 0.5, 5], [5000, 0.3, 6]]) {
    const n = 4096;
    const ref = ideal(hz, duty, n);
    const mine = errOf(sawDiff(hz, duty, n), ref);
    const naive = errOf(raw(hz, duty, n), ref);
    assert(mine < bound,
      `moving pulse at ${hz}Hz duty ${duty}: ${mine.toFixed(2)}% from a fully band-limited pulse`);
    assert(mine < naive * 0.6,
      `  ...and well under a raw comparator's ${naive.toFixed(2)}%`);
  }
}

// ---- 8. a noise layer is a full member of the stack ---------------------------------
//
// It goes through the layer's OWN filter, not just its tracking band. That is what shapes
// breath into a formant, and skipping it is the one defect in this project that a
// listening test caught and no measurement did — the level was +1.0 dB, which reads as
// nothing, and it sounded like "too much noise" because the bow was arriving raw instead
// of through its 2250 Hz band. Cheap to assert, invisible to review.
{
  const { compileMrdr3 } = await import('../src/engine/mrdr3/compile.js');
  const { renderMrdr3, frameAt } = await import('../src/engine/mrdr3/dsp.js');
  const { mrdr3NoiseSet } = await import('../src/engine/mrdr3/noise.js');
  const { VOICES } = await import('../src/data/voices.js');

  const NOISE = mrdr3NoiseSet(SR, ['white']);
  const bare = { attack: 0.01, decay: 0.2, sustain: 1, release: 0.1 };
  const layerOf = (filter) => ({
    kind: 'sawtooth', duty: null, noiseColour: 'white', ratio: 4, detune: 0, unison: 1,
    spread: 0, stereo: 0, gain: 1, len: 1, through: false, env: bare,
    width: 0.5, pwmDepth: 0, pwmRate: 0, pwmSwing: 0, pwmDelay: 0, pwmTri: false,
    filterStages: filter ? 1 : 0, filterKind: 2, filterFreq: 2250, filterQ: 4,
    filterTrack: 0, filterOct: 0,
    filterEnvShape: { attack: 0.01, decay: 0.2, sustain: 1, release: 0.1 },
  });
  const patchOf = (filter) => ({
    layers: [layerOf(filter)], vca: null, filterStages: 0, filterKind: 0, filterFreq: 1150,
    filterQ: 0.7, filterTrack: 0, filterOct: 0,
    filterEnvShape: { attack: 0.01, decay: 0.2, sustain: 1, release: 0.1 },
    driveCurve: null, toneStages: 0, toneKind: 0, toneFreq: 8000, toneQ: 0.7,
    vibDepth: 0, vibDelay: 0, vibSpread: 0, vibRates: [0, 0, 0, 0], vibPhases: [0, 0, 0, 0],
    entryDelays: [0, 0, 0, 0],
    lfoDepth: 0, lfoRate: 0, lfoDelay: 0, lfoTarget: 0, lfoTri: false, lfoSquare: false,
  });
  const renderOf = (filter) => renderMrdr3({
    events: [{ type: 'noteOn', frame: frameAt(0.02, SR), eventId: 1, hz: 220, durFrames: frameAt(0.8, SR), velocity: 1 }],
    seconds: 1, sampleRate: SR, tables: TABLES, noise: NOISE, patch: patchOf(filter),
  });
  const band = renderOf(true).channels[0];
  const raw = renderOf(false).channels[0];
  const rmsIn = (b2) => Math.sqrt(b2.reduce((a2, v) => a2 + v * v, 0) / b2.length);
  assert(rmsIn(raw) > 1e-4 && rmsIn(band) > 1e-4, 'a noise layer sounds either way');
  // A narrow band at 2250 keeps a slice; the same noise without it keeps everything, so
  // the filtered take must be markedly quieter. If the two are the same, the layer filter
  // is not in the noise path.
  assert(rmsIn(band) < rmsIn(raw) * 0.6,
    `a noise layer goes through its layer filter (${rmsIn(band).toFixed(4)} banded`
    + ` against ${rmsIn(raw).toFixed(4)} raw)`);
  // And the band is where it was asked for, not where the tracking band alone would put it.
  const at = (b2, hz) => {
    let re = 0; let im = 0; const w = (2 * Math.PI * hz) / SR;
    for (let i = 0; i < b2.length; i++) { re += b2[i] * Math.cos(w * i); im += b2[i] * Math.sin(w * i); }
    return Math.sqrt(re * re + im * im) / b2.length;
  };
  assert(at(band, 2250) > at(band, 500) * 2,
    'and the layer filter puts its energy where the preset asked (2250Hz over 500Hz)');
}

console.log(failed ? `\nMRDR-3 OSC: ${failed} FAILED` : '\nMRDR-3 OSC: OK');
process.exit(failed ? 1 : 0);
