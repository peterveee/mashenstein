/*
 * JMJR-4 — the renderer for robot-voice-ir/1, in native Web Audio nodes.
 *
 * Consumes the IR that syll.js compiles (and that the reference engine, robot_voice.py,
 * compiles identically) and builds a per-note graph. It holds no phoneme knowledge: every
 * target, envelope and level is in the IR. Live or offline, the same nodes.
 *
 * The reference and this renderer, and where they differ on purpose:
 *   source      OscillatorNode + PeriodicWave from the shared glottal model
 *   F1, F2      lowpass biquads in series, frequency and Q automated (a Klatt resonator to
 *               within 1.2 dB — and the Q of a LOWPASS biquad is in dB, not linear)
 *   F3..F5      bandpass biquads in parallel with the hybrid gains, scaled by the vowel
 *               dependence evaluated at the IR's breakpoints
 *   nasal       the Klatt resonator (a lowpass stood in for it once, and threw away the
 *               murmur at the wide bandwidth) times the anti-resonator, as ONE IIRFilterNode
 *               carrying their product, one wet path per place, crossfaded by the IR's
 *               nasal-zero envelope; at rest the dry path is the raw signal
 *   voice bar   a flow oscillator through a 300 Hz lowpass
 *   extras      noise through the event's bands, enveloped, added after the tract
 *   jitter      a bounded wander of the pitch: the shared seeded noise buffer played slow
 *               through a lowpass, summed into every source's frequency. The reference walks
 *               f0 per sample (a normalised random walk); lowpassed noise is that walk's
 *               shape, and it is three nodes per note-on rather than a per-sample loop.
 *               Seeded, so a stem is still byte-for-byte the lane inside the mix
 *
 * WHAT THIS RENDERER SHARES PER CONTEXT, and why. The prototype allocated a fresh
 * Box-Muller noise buffer per note (12 s of it) and ran a 96-harmonic DFT for the glottal
 * wave per note: Phase 0 measured that as 24–46 ms of main-thread build per note-on. Here
 * one seeded 4 s noise buffer serves every note of a context, each source starting at an
 * offset its seed picks, and the wave is memoised by (oq, tilt, f0, flow). Build fell to
 * 10–15 ms and the sound is the same to the ear; determinism is kept because the offset,
 * like everything else, comes from the seed.
 */

const RADIATION = 0.97;
const SKEW = 0.7;
const TILT_REF_HZ = 3000;
const NOISE_SECONDS = 4;

// ---- the glottal model, at the reference's own scale, memoised per context -----------
// The reference builds the flow at the engine's sample spacing, takes d[n] = flow[n] -
// R*flow[n-1], and divides by the PEAK of that full-band signal. Most of that peak is the
// closure spike, whose energy runs far above the 96 harmonics a PeriodicWave can carry, so
// letting the browser peak-normalise its truncated wave made every harmonic ~18 dB too
// loud. So: do exactly what the reference does over one period, DFT that, hand the
// coefficients over with normalisation off.
const waveMemo = new WeakMap();
export function glottalWave(ctx, oq, tiltDb, f0, useFlow = false) {
  let m = waveMemo.get(ctx);
  if (!m) { m = new Map(); waveMemo.set(ctx, m); }
  const key = `${oq.toFixed(3)}|${(tiltDb || 0).toFixed(2)}|${Math.round(f0)}|${useFlow ? 1 : 0}`;
  let w = m.get(key);
  if (!w) {
    const { re, im } = glottalHarmonics(ctx.sampleRate, oq, tiltDb, f0, useFlow);
    w = ctx.createPeriodicWave(re, im, { disableNormalization: true });
    m.set(key, w);
  }
  return w;
}
// The harmonic amplitudes the wave is built from. Not memoised here: the wave's memo is per
// context and rounds its pitch, and a second, global one would hand a note the harmonics
// of whichever nearby pitch played first, so a render would depend on its history.
// Formant tuning (see `tunedTract`) reads these too, and keeps its own exact-keyed memo.
export function glottalHarmonics(sr, oq, tiltDb, f0, useFlow = false) {
  const P = Math.max(64, Math.round(sr / f0));
  const H = 96;
  const tp = oq * SKEW;
  const tn = oq - tp;
  const flow = new Float64Array(P);
  let mean = 0;
  for (let i = 0; i < P; i++) {
    const p = i / P;
    flow[i] = p < tp ? 0.5 * (1 - Math.cos(Math.PI * p / tp)) : p < oq ? Math.cos(Math.PI * (p - tp) / (2 * tn)) : 0;
    mean += flow[i];
  }
  mean /= P;
  const sig = new Float64Array(P);
  let peak = 0;
  for (let i = 0; i < P; i++) {
    const f = flow[i] - mean;
    const fp = flow[(i + P - 1) % P] - mean;
    sig[i] = useFlow ? f : f - RADIATION * fp;
    peak = Math.max(peak, Math.abs(sig[i]));
  }
  const scale = useFlow ? 1 : 1 / (peak || 1);          // the reference's own normalisation
  let a = 0;
  if (tiltDb > 0 && !useFlow) {
    const g = Math.pow(10, -tiltDb / 20);
    const w0 = 2 * Math.PI * TILT_REF_HZ / sr;
    let lo = 0;
    let hi = 0.9999;
    for (let k = 0; k < 60; k++) {
      a = 0.5 * (lo + hi);
      const mag = (1 - a) / Math.sqrt(1 - 2 * a * Math.cos(w0) + a * a);
      if (mag > g) lo = a; else hi = a;
    }
  }
  const re = new Float32Array(H + 1);
  const im = new Float32Array(H + 1);
  for (let h = 1; h <= H; h++) {
    let c = 0;
    let s = 0;
    for (let i = 0; i < P; i++) { const th = 2 * Math.PI * h * i / P; c += sig[i] * Math.cos(th); s += sig[i] * Math.sin(th); }
    let mag = scale;
    if (a > 0) { const w = 2 * Math.PI * h * f0 / sr; mag *= (1 - a) / Math.sqrt(1 - 2 * a * Math.cos(w) + a * a); }
    re[h] = (2 * c / P) * mag;
    im[h] = (-2 * s / P) * mag;
  }
  return { re, im };
}

// ---- the one noise generator, shared with the reference's noise_stream() -----------
// 32-bit LCG (1664525, 1013904223), Box-Muller in pairs, unit variance. The reference
// draws a fresh stream per event from its seed; here one buffer per context is drawn once
// and every source reads it from an offset the seed picks, which keeps a render
// deterministic without paying for the stream per note.
const noiseMemo = new WeakMap();
export function sharedNoise(ctx) {
  let b = noiseMemo.get(ctx);
  if (!b) { b = noiseBuffer(ctx, NOISE_SECONDS, 12345); noiseMemo.set(ctx, b); }
  return b;
}
export function noiseBuffer(ctx, seconds, seed = 12345) {
  const n = Math.ceil(ctx.sampleRate * seconds);
  const b = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = b.getChannelData(0);
  let s = seed >>> 0;
  const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return (s + 0.5) / 4294967296; };
  for (let i = 0; i < n; i += 2) {
    const u1 = rnd();
    const u2 = rnd();
    const r = Math.sqrt(-2 * Math.log(u1));
    d[i] = r * Math.cos(2 * Math.PI * u2);
    if (i + 1 < n) d[i + 1] = r * Math.sin(2 * Math.PI * u2);
  }
  return b;
}
const noiseOffset = (seed) => ((seed >>> 0) % (NOISE_SECONDS * 1000)) / 1000;
function noiseSource(ctx, seed) {
  const src = ctx.createBufferSource();
  src.buffer = sharedNoise(ctx);
  src.loop = true;
  return { src, offset: noiseOffset(seed) };
}

/*
 * Is every value this curve would ever schedule exactly zero?
 *
 * Resolved through the SAME transform `automate` will apply, because the level multipliers
 * live in the transform: `ir.aspiration.v` is a shape and `lv.asp_gain` is what turns it into
 * a gain, and either one being zero makes the branch silent. BREATH alone answers neither
 * question — a stop's release aspiration is written into the envelope whatever BREATH says,
 * which is why this reads the values rather than the pot.
 */
function alwaysZero(V, fn) {
  for (let i = 0; i < V.length; i++) if (fn(V[i], i) !== 0) return false;
  return true;
}

/*
 * The scheduled time of every breakpoint: t0 + T[i], nudged forward by 10 us wherever the IR
 * gave two points the same moment, because an AudioParam timeline must be strictly
 * increasing. Its own function because `automate` is no longer the only thing that needs to
 * know WHEN a curve's points land — stopping a source at the moment its gain reaches zero
 * for good has to name the same instant the automation does, not the unadjusted one.
 */
export function adjustedTimes(T, t0) {
  const n = T.length;
  const times = new Array(n);
  let last = -1;
  for (let i = 0; i < n; i++) {
    let t = t0 + T[i];
    if (t <= last) t = last + 1e-5;
    times[i] = t;
    last = t;
  }
  return times;
}

/*
 * When does this curve go silent for good?
 *
 * The last point whose TRANSFORMED value is nonzero, and then the point after it — which is
 * zero by construction, since nothing after the last nonzero point is nonzero. Null when the
 * curve never sounds (`alwaysZero` has already answered that) and null when it is still
 * sounding at its final point, because a curve that never returns to zero has no moment to
 * be stopped at and keeps the lifetime it was given.
 *
 * Reading the LAST nonzero point rather than the first zero is what makes an internal silent
 * gap safe: an H, silence, then another H is one curve with a zero in the middle, and this
 * returns the end of the SECOND one.
 */
export function silentFrom(T, V, t0, fn) {
  let last = -1;
  for (let i = V.length - 1; i >= 0; i--) if (fn(V[i], i) !== 0) { last = i; break; }
  if (last < 0 || last + 1 >= V.length) return null;
  return adjustedTimes(T, t0)[last + 1];
}

/*
 * breakpoints -> AudioParam automation; times are strictly increasing by construction.
 *
 * AND ONLY THE POINTS THAT MOVE. The IR's curves are mostly flat. F4 and F5 arrive as
 * `F.f3.map(() => c.f4)` — one constant repeated at every breakpoint. A vowel that does not
 * sweep gives F1..F3 two identical points. A line with no H and no stop in it gives an
 * aspiration envelope that is zero at every point. So the values are transformed first, and
 * then every maximal run of EXACTLY equal values keeps its first and last point and drops
 * only the interior ones. Between two equal points the ramp is already flat, so the curve is
 * identical at every instant, and so is what survives a `cancelScheduledValues` at any time.
 * Nothing near-equal is merged, no sloped point is removed, no curve is approximated:
 * [0,0,0,1] at [0,1,2,3] becomes [0,0,1] at [0,2,3], never [0,1] at [0,3], which would start
 * the rise a second early.
 *
 * AND NOTHING AFTER THE LAST MOVE. Interior plateaus keep both ends, because the point after
 * one is where the curve starts moving again. The FINAL plateau has nothing after it, and an
 * AudioParam holds its last value until something else is booked, so its closing ramp is a
 * ramp from v to v: an event that cannot change a sample. It is the commonest shape in the
 * IR — a vowel reaches its steady state and stays there — and it is the expensive one,
 * because that one trailing event is what keeps the param's timeline live for the whole
 * sustain and the filter on the per-sample path with it:
 *
 *   times  [0, .048, .08, .32]        keep  [0, .048, .08]
 *   values [200, 200, 750, 750]             [200, 200, 750]
 *
 * The ramp that REACHES 750 is kept — it is the move — and the value is 750 from .08 onward
 * either way. Only exact equality counts here too; nothing near-equal is merged.
 *
 * AND A CURVE THAT NEVER MOVES IS ONE EVENT. This is the part that pays, and it is not free.
 * An AudioParam carrying a live timeline is SAMPLE-ACCURATE: Chromium asks it for a value at
 * every one of the 48000 samples in a second and rebuilds the biquad's coefficients from that
 * value each time, to arrive at the same answer every time. A param with a single elapsed
 * setValueAtTime cannot move, so the coefficients are computed once per 128-sample quantum
 * and the filter runs through the vectorised path instead. Measured on the choir workloads:
 * 7 to 17 % of RENDER, which is the tax a note pays for its whole length, not a note-on
 * hiccup.
 *
 * WHAT IT COSTS, measured, not guessed. The two code paths are the same filter and they are
 * not the same arithmetic — the operations retire in a different order, so they round
 * differently, and a resonant filter feeds its own output back in, so the difference
 * compounds over a note. Against a frozen baseline (work/local/jmjr4-perf-2026-09-06): of
 * 160 full-buffer comparisons at both rates, 146 were unchanged and 14 moved by more than
 * 1e-5 — Small Voice, Choir Ooh, Doo-wop and Doo Wop Line, worst 1.5e-4 absolute. Against
 * each note's OWN peak that is 6e-5 to 2.4e-4, which is -72 to -84 dB, and it grows with
 * pitch because the tract rings longer up there. Peter listened to the
 * pairs in work/auditions/jmjr4/ and took the trade on 7 September 2026. It is written down
 * here because the next person to hold this file to a bit-exact null test needs to know that
 * this line is why, and that the answer is to re-baseline rather than to go looking for a bug.
 *
 * `.value` is still out, and for an unrelated reason: `retarget` and `nasalise` read
 * `param.value` when they glide (see `go`), and that reads the CONTROL-thread value — the
 * node's default, which no scheduled event touches. Assigning it would change the note a
 * morph glides away from.
 */
export function automate(param, T, V, t0, fn = (v) => v) {
  const n = T.length;
  if (!n) return;
  // times first, in the original index order, with the existing ordering adjustment untouched
  const times = adjustedTimes(T, t0);
  // the TRANSFORMED values are the curve; the IR's own arrays are never touched
  const vals = new Array(n);
  for (let i = 0; i < n; i++) vals[i] = fn(V[i], i);
  param.setValueAtTime(vals[0], times[0]);
  // The last index whose value differs from the one before it. Everything after it is a
  // TERMINAL plateau and none of it is scheduled: an AudioParam holds its last value for
  // ever, so a ramp from v to v adds a booked event and changes nothing. Zero means the
  // curve never moves at all, which is the one-event case.
  let lastMove = 0;
  for (let i = n - 1; i >= 1; i--) if (vals[i] !== vals[i - 1]) { lastMove = i; break; }
  if (lastMove === 0) return;                            // one event: the param cannot move
  for (let i = 1; i <= lastMove; i++) {
    if (vals[i] === vals[i - 1] && vals[i + 1] === vals[i]) continue;   // interior to a flat run
    param.linearRampToValueAtTime(vals[i], times[i]);
  }
}

// the reference's vowel dependence for the hybrid upper branch, evaluated at a point
function resonatorMag(sr, f, bw, at) {
  const T = 1 / sr;
  const C = -Math.exp(-2 * Math.PI * bw * T);
  const B = 2 * Math.exp(-Math.PI * bw * T) * Math.cos(2 * Math.PI * f * T);
  const A = 1 - B - C;
  const w = 2 * Math.PI * at / sr;
  const zr = Math.cos(-w);
  const zi = Math.sin(-w);
  const z2r = zr * zr - zi * zi;
  const z2i = 2 * zr * zi;
  const dr = 1 - B * zr - C * z2r;
  const di = -B * zi - C * z2i;
  return A / Math.sqrt(dr * dr + di * di);
}

/*
 * FORMANT TUNING: what a soprano does, and why this synth has to.
 *
 * F1 and F2 are resonances at the vowel's own frequencies, and below F1 a note has several
 * harmonics under it to ring it. Once the fundamental climbs past F1 there is nothing left
 * under the resonance: the note falls down the lowpass slope and goes quiet. Measured
 * before this existed (work/local/jmjr4-pitch-level-probe.mjs, 29 September 2026), Choir
 * Aah was +7 dB at G5, where 784 Hz sits on its 750 Hz F1, then -15 dB by G6; the ooh
 * presets, F1 near 300 Hz, were already -10 dB by C5. A singer raises F1 to sit just above
 * the note, so this does too: F1 never goes below F1_TUNE times the fundamental.
 *
 * A resonance tuned onto the fundamental is louder than the vowel ever was, by up to 18 dB
 * measured, so the tract's output is also scaled by the power it delivers at the pitch
 * where tuning begins over the power it delivers here — both computed from the glottal
 * harmonics this note actually plays through the two resonators (Klatt's, which the
 * lowpass biquads match to within 1.2 dB). Level is flat from that pitch up and joins the
 * untuned voice there.
 *
 * F2 is kept at least F2_GAP above the tuned F1, or at the top of the range (C7 on an ooh,
 * F2 near 870 Hz) the second lowpass sits under the note and the same hole opens again.
 *
 * Switched on per note, applied per breakpoint: a note is tuned only once it is above every
 * F1 its IR visits, and then a spoken phrase, or a sung D before its vowel, has each of its
 * points tuned for what that point is. A note that is not tuned keeps the same frequencies
 * to the bit and a gain of exactly 1, so it renders as it did before this existed.
 */
const F1_TUNE = 1.1;
const F2_GAP = 1.3;
// |H| of a biquad b/a at `at` Hz
function biquadMag(sr, b, a, at) {
  const w = 2 * Math.PI * at / sr;
  const mag = (k) => Math.hypot(k[0] + k[1] * Math.cos(w) + k[2] * Math.cos(2 * w), k[1] * Math.sin(w) + k[2] * Math.sin(2 * w));
  return mag(b) / mag(a);
}
// |H| of Web Audio's bandpass (the spec's RBJ coefficients, 0 dB peak) at `at` Hz
function bandpassMag(sr, f, q, at) {
  const w0 = 2 * Math.PI * f / sr;
  const al = Math.sin(w0) / (2 * q);
  return biquadMag(sr, [al, 0, -al], [1 + al, -2 * Math.cos(w0), 1 - al], at);
}
/*
 * The power a note delivers through the tract, summed over the harmonics it actually has.
 * Both branches, as renderIr builds them: F1 x F2 at `tract_ref_gain`, and the parallel
 * F3/F4/F5 bandpasses scaled by the vowel dependence — the upper branch is what the top
 * octave lands on (C7 is 2 kHz, where F3 sits), so leaving it out over-boosted exactly
 * there. The branches and the bandpasses are summed as powers, not phases: up here a
 * formant holds one or two harmonics and their phases are anybody's.
 *
 * `nose`, when given, is a nasal path at that place: its pole, its notch (at the place it
 * is given, already moved if it is tuned) and the BUZZ shelf, in front of the tract.
 * f1, f2, f3 and the place are Hz after fscale.
 *
 * Exact keys, so the answer never depends on what was asked before; cleared when it grows,
 * since a session plays a bounded set of pitches through a bounded set of vowels.
 */
const powerMemo = new Map();
const AH = [750, 1200, 2500];
function tractPower(sr, c, f0, f1, f2, f3, bw, nose = null) {
  const key = `${sr}|${c.src}|${c.oq}|${c.tilt_db}|${c.nasal_buzz}|${f0}|${f1}|${f2}|${f3}|${nose}|${bw.join(',')}`;
  let p = powerMemo.get(key);
  if (p !== undefined) return p;
  const { re, im } = c.src === 'saw' ? { re: null, im: null } : glottalHarmonics(sr, c.oq, c.tilt_db || 0, f0);
  const fs = c.fscale;
  const upper = c.tract === 'hybrid' || c.tract === 'parallel';
  let dep = 0;
  const bands = [];
  if (upper) {
    const ref = resonatorMag(sr, AH[0], bw[0], AH[2]) * resonatorMag(sr, AH[1], bw[1], AH[2]);
    dep = Math.pow(resonatorMag(sr, f1 / fs, bw[0], f3 / fs) * resonatorMag(sr, f2 / fs, bw[1], f3 / fs) / ref, c.hybrid_dep_exp) * c.hybrid_high_gain;
    bands.push([f3, bw[2], c.gains[2]], [c.f4 * fs, bw[3], c.gains[3]]);
    if (c.f5) bands.push([c.f5[0] * fs, c.f5[1], c.hybrid_f5_gain]);
  }
  const buzzDb = nose != null ? (c.nasal_buzz_db ?? 22) * clamp01(c.nasal_buzz || 0) : 0;
  p = 0;
  for (let h = 1; h <= 96 && h * f0 < sr / 2; h++) {
    const at = h * f0;
    const s2 = re ? re[h] * re[h] + im[h] * im[h] : 1 / (h * h);
    const lo = c.tract_ref_gain * resonatorMag(sr, f1, bw[0], at) * resonatorMag(sr, f2, bw[1], at);
    let g2 = lo * lo;
    for (const [cf, b, g] of bands) { const m = dep * g * bandpassMag(sr, cf, cf / b, at); g2 += m * m; }
    if (nose != null) {
      let n = resonatorMag(sr, c.nasal_pole[0], c.nasal_pole[1], at) / resonatorMag(sr, nose, c.nasal_zero_bw, at);
      if (buzzDb > 0) n *= shelfMag(sr, c.nasal_buzz_hz ?? 400, buzzDb, at);
      g2 *= n * n;
    }
    p += s2 * g2;
  }
  if (powerMemo.size > 4096) powerMemo.clear();
  powerMemo.set(key, p);
  return p;
}
/** F1 and F2 (Hz, after fscale) as tuned for a note at `f0`, and the gain that levels it. */
export function tunedTract(sr, c, f0, f1, f2, f3, bw) {
  const floor = F1_TUNE * f0;
  if (!(floor > f1)) return { tuned: false, f1, f2, gain: 1 };
  const t2 = Math.max(f2, F2_GAP * floor);
  const from = f1 / F1_TUNE;
  const gain = Math.sqrt(tractPower(sr, c, from, f1, f2, f3, bw) / tractPower(sr, c, f0, floor, t2, f3, bw));
  return { tuned: true, f1: floor, f2: t2, gain };
}

/*
 * THE NOSE, TUNED THE SAME WAY. A nasal's anti-resonator is a notch 90 Hz wide at a fixed
 * place (1000 Hz for a live hum, the IR's own for a sung M), so a note climbing onto it is
 * cut out: Kazoo Lead was -7 dB at B5 against its neighbours. Once the note is within
 * Z_TUNE of the notch, the notch moves to Z_TUNE times the note, between the fundamental
 * and its octave, where there is no harmonic to cut.
 *
 * And each path is levelled on its own. `tunedTract`'s gain is the MOUTH's; a path through
 * the nose also has its pole, the notch and the BUZZ shelf in it, and at the top of the
 * range the shelf alone is 10 dB the oral model never sees — Hummer was +20 dB at C7. So
 * on a note with a nose, the mouth's gain goes on the dry path and each wet path carries
 * its own: the power it delivers where tuning began over the power it delivers here.
 * Absolute, not relative to the mouth's: it was once the wet path's gain divided by the
 * oral gain on `low`, and a morph from aah into a hum glides both, linearly, at once, and
 * the product of two linear glides bulged +7 dB half way. Paths levelled one by one sum
 * level whatever the mix of nose and mouth.
 *
 * A note the tuning never reaches gets exactly 1, as before.
 */
const Z_TUNE = 1.5;
const zeroPlace = (fz, f0) => Math.max(fz, Z_TUNE * f0);
// |H| of Web Audio's highshelf (the spec's RBJ coefficients, slope 1) at `at` Hz
function shelfMag(sr, f, db, at) {
  const A = Math.pow(10, db / 40);
  const w0 = 2 * Math.PI * f / sr;
  const cw = Math.cos(w0);
  const al = Math.sin(w0) / 2 * Math.SQRT2;
  const sa = 2 * Math.sqrt(A) * al;
  const b = [A * ((A + 1) + (A - 1) * cw + sa), -2 * A * ((A - 1) + (A + 1) * cw), A * ((A + 1) + (A - 1) * cw - sa)];
  const a = [(A + 1) - (A - 1) * cw + sa, 2 * ((A - 1) - (A + 1) * cw), (A + 1) - (A - 1) * cw - sa];
  return biquadMag(sr, b, a, at);
}
/**
 * The gain one nasal path at place `fz` needs, for a note at
 * `f0` holding the vowel (f1v, f2v, f3) — Hz after fscale — tuned as `oral` says.
 */
export function nasalTune(sr, c, f0, f1v, f2v, f3, fz, oral, bw) {
  const zeroTuned = Z_TUNE * f0 > fz;
  if (!oral.tuned && !zeroTuned) return 1;
  const from = Math.min(oral.tuned ? f1v / F1_TUNE : Infinity, zeroTuned ? fz / Z_TUNE : Infinity);
  const ref = tractPower(sr, c, from, f1v, f2v, f3, bw, fz);
  const now = tractPower(sr, c, f0, oral.f1, oral.f2, f3, bw, zeroPlace(fz, f0));
  return Math.sqrt(ref / now);
}

const clamp01 = (x) => Math.min(1, Math.max(0, x));

/**
 * The RMS of the jitter path at unit gain — white noise at playbackRate 0.05 through an 8 Hz
 * lowpass — measured once (work/local/jmjr4-jitter-probe.mjs) so JITTER's percent is a
 * percent of f0 rather than of whatever that chain happens to output. Its peak runs about
 * three times its RMS, so JITTER 2 % wanders by about a semitone at its worst.
 */
const JITTER_RMS = 0.1057;

/**
 * Build one IR into `opts.destination` starting at `opts.start`.
 *
 * opts.pitchShiftSt   play a compiled IR at another pitch without recompiling; only the
 *                     pitch points move, formants and timing stay
 * opts.nasalPlaces    anti-resonator places to build even when the IR never uses them,
 *                     so a live note can be nasalised later (a morph towards MMM)
 * opts.flutterSource  an AudioNode carrying the three flutter sines summed at unit
 *                     amplitude, shared by every singer of a note-on; absent, and the
 *                     note builds its own three when the IR asks for flutter
 * opts.unison         [{ ratio, oq }] — the UNISON sources: each a glottal oscillator at
 *                     the IR's pitch times `ratio`, with its own open quotient, all summed
 *                     into the ONE tract. A singer's cost is its tract (a probe put a
 *                     formant singer at ~0.3 % of a thread in a worklet, the same as these
 *                     native nodes), so four tracts per key was four notes per key; four
 *                     sources into one is a note and a bit, the way MRDR-3's unison is
 *                     oscillators into one filter. Absent, one source.
 *
 * Returns a handle: { end, nodes, sources, oscs, f1, f2, stop, retarget, nasalise,
 * nasalState, release }.
 */
export function renderIr(ctx, ir, opts = {}) {
  const t0 = opts.start ?? ctx.currentTime;
  const dest = opts.destination ?? ctx.destination;
  const c = ir.controls;
  const sr = ctx.sampleRate;
  const irSr = ir.sample_rate || sr;      // the rate the IR's SAMPLE counts are in
  const total = ir.total_seconds;
  const fs = c.fscale;
  const bw = c.bw || [100, 140, 200, 250];
  const lv = ir.levels || {};
  const nodes = [];
  const sources = [];
  // Every source's booked end. A later stop() REPLACES an earlier one (the spec's rule),
  // so a release that stopped every source at the note's end was un-stopping the burst
  // noise and the voice-bar oscillator booked to end at 70 ms, and they ran the whole
  // note: a third of a held doo in the shipped-path bench. A source is only ever
  // re-stopped EARLIER than it was booked, never later.
  const ends = new Map();
  const book = (n, t) => { n.stop(t); ends.set(n, t); };
  const cut = (n, t) => { if (t < (ends.get(n) ?? Infinity)) { try { n.stop(t); ends.set(n, t); } catch { /* already stopped */ } } };
  // The sources that end themselves early (a burst, the voice bar, a burst's modulator):
  // cut with the rest here, but NOT on the handle's `sources`, which the rack's held-note
  // record and its panic stop at the note's end — the same later-stop trap.
  const brief = [];
  const ps = Math.pow(2, (opts.pitchShiftSt || 0) / 12);
  const pitchT = ir.pitch.map((p) => p[0]);
  const pitchV = ir.pitch.map((p) => p[1] * ps);
  const meanF0 = pitchV.reduce((s, v) => s + v, 0) / pitchV.length;

  // ---- source ------------------------------------------------------------
  const unison = opts.unison?.length ? opts.unison : [{ ratio: 1, oq: c.oq }];
  const mainOscs = unison.map(({ ratio = 1, oq = c.oq }) => {
    const o = ctx.createOscillator();
    if (c.src === 'saw') o.type = 'sawtooth'; else o.setPeriodicWave(glottalWave(ctx, oq, c.tilt_db || 0, meanF0 * ratio));
    automate(o.frequency, pitchT, pitchV, t0, (v) => v * ratio);
    o.jmjr4Ratio = ratio;   // a glide or a bend lands each source on its own detune
    return o;
  });
  const osc = mainOscs[0];
  // Klatt's flutter: three slow sines, a bounded wander of a held pitch. The reference
  // multiplies f0 by (1 + flutter*(sum)/3); here they sum into the frequency param at the
  // mean pitch, the same thing to within the contour's own movement.
  if (c.flutter > 0) {
    const amt = ctx.createGain();
    amt.gain.value = meanF0 * c.flutter / 3;
    if (opts.flutterSource) opts.flutterSource.connect(amt);
    else {
      for (const hz of [12.7, 7.1, 4.7]) {
        const l = ctx.createOscillator(); l.frequency.value = hz; l.connect(amt);
        l.start(t0); book(l, t0 + total + 0.05); nodes.push(l); sources.push(l);
      }
    }
    for (const o of mainOscs) amt.connect(o.frequency);
    nodes.push(amt);
  }
  // JITTER: the wander flutter is not. Flutter repeats — three fixed sines — so it reads as
  // a voice that cannot hold still; this does not repeat, so it reads as a voice that is not
  // well. Noise played at a twentieth of its rate through an 8 Hz lowpass is the reference's
  // bounded random walk to within its own normalisation, and `JITTER_RMS` is what that walk
  // measures at unit gain, so the pot's percent is a percent of f0 either way.
  if (c.jitter > 0) {
    const jn = noiseSource(ctx, ir.seed + 4099);
    jn.src.playbackRate.value = 0.05;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 8; lp.Q.value = 0.7;
    const amt = ctx.createGain();
    amt.gain.value = meanF0 * c.jitter / JITTER_RMS;
    jn.src.connect(lp); lp.connect(amt);
    for (const o of mainOscs) amt.connect(o.frequency);
    jn.src.start(t0, jn.offset); book(jn.src, t0 + total + 0.05);
    nodes.push(jn.src, lp, amt); sources.push(jn.src);
  }
  // The sources sum here, scaled so N detuned sources carry the power of one: the levels
  // compiled into the IR (aspiration, bursts, the bar) are relative to ONE source.
  const voicing = ctx.createGain();
  voicing.gain.value = 0;
  const unisonScale = 1 / Math.sqrt(mainOscs.length);
  automate(voicing.gain, ir.voicing.t, ir.voicing.v, t0, (v) => v * unisonScale);
  for (const o of mainOscs) o.connect(voicing);

  // ---- aspiration, when the note has any -----------------------------------------
  // 13 of the 19 sung presets in the bank have an aspiration envelope that is zero at every
  // breakpoint: a line with no H and no stop in it puts nothing there (see syll.js — a vowel
  // writes `bp(aT, av, ..., 0)`). Built anyway, that is a looping BufferSource reading the
  // shared noise buffer and a GainNode multiplying it by zero, for the whole length of every
  // note. Omitted, the tract's summing point simply has one fewer input, and x + 0 is x.
  //
  // NOTHING can turn it back on later: the handle's live controls are `retarget` (F1/F2/F3),
  // `nasalise` (the wet/dry pair), `release` (the phrase gate) and `stop`, and the rack's
  // vibrato reaches `oscs`, which a BufferSource is not. So a branch that is zero at build is
  // zero for the note's life.
  const aspGain = (v) => v * (lv.asp_gain ?? 0.25 * 0.35);
  const hasAsp = !alwaysZero(ir.aspiration.v, aspGain);
  const noiseN = hasAsp ? noiseSource(ctx, ir.seed) : null;
  let asp = null;
  // AND WHEN THE BREATH IS OVER, THE NOISE STOPS. A sung syllable's aspiration is the
  // release of its stop consonant: a D writes 0.32 at the burst and 0.09 into the vowel, and
  // then the vowel writes zero and holds zero for the whole of the rest of the note (see
  // syll.js). On a held pad that is 30 seconds of a looping BufferSource being multiplied by
  // nothing. The source is booked to stop at the moment the curve reaches zero for good —
  // the LAST nonzero point's successor, so a second H later in the line keeps it alive — and
  // the gain arrives at that instant by a ramp, so there is nothing to click. Downstream
  // stays connected: the tract is still ringing and has to be allowed to decay.
  let aspStop = null;
  if (hasAsp) {
    asp = ctx.createGain();
    asp.gain.value = 0;
    automate(asp.gain, ir.aspiration.t, ir.aspiration.v, t0, aspGain);
    noiseN.src.connect(asp);
    aspStop = silentFrom(ir.aspiration.t, ir.aspiration.v, t0, aspGain);
  }

  const tractIn = ctx.createGain();
  voicing.connect(tractIn);
  if (asp) asp.connect(tractIn);

  // FORMANT TUNING (see tunedTract). A note is tuned once it is above every F1 its IR
  // visits — not before, or a D's 200 Hz closure would retune a note whose vowel is still
  // well above it — and then per breakpoint. The IR repeats its points, so each distinct
  // pair is worked out once. Worked out here, ahead of the nose, because the nasal paths
  // are levelled against it (see nasalTune).
  const F = ir.formants;
  const tuneMemo = new Map();
  const tuneNote = F1_TUNE * meanF0 > Math.max(...F.f1) * fs;
  const tuning = F.t.map((_, i) => {
    if (!tuneNote) return { tuned: false, f1: F.f1[i] * fs, f2: F.f2[i] * fs, gain: 1 };
    const k = `${F.f1[i]}|${F.f2[i]}|${F.f3[i]}`;
    if (!tuneMemo.has(k)) tuneMemo.set(k, tunedTract(sr, c, meanF0, F.f1[i] * fs, F.f2[i] * fs, F.f3[i] * fs, bw));
    return tuneMemo.get(k);
  });
  const heldF = [F.f1[F.f1.length - 1] * fs, F.f2[F.f2.length - 1] * fs, F.f3[F.f3.length - 1] * fs];

  // ---- nasal stage -----------------------------------------------------------
  let tractSrc = tractIn;
  let dryPath = null;
  let dryComp = null;
  let wetPaths = [];
  const forced = (opts.nasalPlaces || []).map((v) => Math.round(v));
  if (ir.nasal_zero.active || forced.length) {
    const [fnp, bwp] = c.nasal_pole;
    const bwz = c.nasal_zero_bw;
    const T = 1 / sr;
    const targets = [...new Set([...ir.nasal_zero.v.filter((v) => v > fnp + 1).map((v) => Math.round(v)), ...forced])];
    const sum = ctx.createGain();
    const dry = ctx.createGain();
    // the mouth's own level (see Z_TUNE's note): on this path, not on `low`, on a note
    // with a nose; exactly 1 on a note the tuning never reaches
    dryComp = ctx.createGain();
    tractIn.connect(dry); dry.connect(dryComp); dryComp.connect(sum);
    nodes.push(dryComp);
    const buzz = clamp01(c.nasal_buzz || 0);
    const wets = targets.map((fz) => {
      // y[n] = A x[n] + B y[n-1] + C y[n-2], the reference's own coefficients
      const pC = -Math.exp(-2 * Math.PI * bwp * T);
      const pB = 2 * Math.exp(-Math.PI * bwp * T) * Math.cos(2 * Math.PI * fnp * T);
      const pA = 1 - pB - pC;
      // the notch moves off a note that has climbed onto it (see Z_TUNE); `fz` stays the
      // path's name, which the envelope and `nasalise` find it by
      const C = -Math.exp(-2 * Math.PI * bwz * T);
      const B = 2 * Math.exp(-Math.PI * bwz * T) * Math.cos(2 * Math.PI * zeroPlace(fz, meanF0) * T);
      const A = 1 - B - C;
      // ONE filter, not two in series. The resonator pA/(1 - pB z^-1 - pC z^-2) and the
      // anti-resonator (1 - B z^-1 - C z^-2)/A are both linear and time-invariant, so their
      // product is a single 3-tap-over-3-tap IIR — the numerators multiply, the denominators
      // multiply, and the anti-resonator's denominator is 1. Same transfer function, one
      // node's worth of graph and one node's worth of state.
      const nasal = ctx.createIIRFilter([pA / A, -pA * B / A, -pA * C / A], [1, -pB, -pC]);
      const g = ctx.createGain();
      g.gain.value = 0;
      // BUZZ: a shelf on what comes out of the nose, in the wet path only
      let tail = nasal;
      if (buzz > 0) {
        const sh = ctx.createBiquadFilter();
        sh.type = 'highshelf';
        sh.frequency.value = c.nasal_buzz_hz ?? 400;
        sh.gain.value = (c.nasal_buzz_db ?? 22) * buzz;
        nasal.connect(sh); tail = sh; nodes.push(sh);
      }
      // the path's own level (see nasalTune), after the nose and before the crossfade;
      // exactly 1 on a note the tuning never reaches
      const comp = ctx.createGain();
      const level = nasalTune(sr, c, meanF0, heldF[0], heldF[1], heldF[2], fz, tuning[tuning.length - 1], bw);
      comp.gain.value = level;
      tractIn.connect(nasal); tail.connect(comp); comp.connect(g); g.connect(sum);
      nodes.push(nasal, comp, g);
      return { fz, g, comp, level };
    });
    const zt = ir.nasal_zero.t;
    const zv = ir.nasal_zero.v;
    const nearest = (v) => targets.reduce((best, fz) => (Math.abs(fz - v) < Math.abs(best - v) ? fz : best), targets[0]);
    const owner = zv.map((v, i) => {
      if (v > fnp + 1) return nearest(v);
      for (let j = i + 1; j < zv.length; j++) if (zv[j] > fnp + 1) return nearest(zv[j]);
      for (let j = i - 1; j >= 0; j--) if (zv[j] > fnp + 1) return nearest(zv[j]);
      return targets[0];
    });
    for (const w of wets) {
      automate(w.g.gain, zt, zv, t0, (v, i) => (owner[i] === w.fz ? clamp01((v - fnp) / (w.fz - fnp)) : 0));
    }
    automate(dry.gain, zt, zv, t0, (v, i) => 1 - clamp01((v - fnp) / (owner[i] - fnp)));
    dryPath = dry; wetPaths = wets;
    tractSrc = sum;
    nodes.push(dry, sum);
  }

  // ---- tract: F1, F2 in series; F3, F4, F5 in parallel ---------------------
  const qdb = (f, b) => 20 * Math.log10(Math.max(1.0001, f / b));
  const f1 = ctx.createBiquadFilter();
  const f2 = ctx.createBiquadFilter();
  f1.type = f2.type = 'lowpass';
  automate(f1.frequency, F.t, F.f1, t0, (v, i) => tuning[i].f1); automate(f1.Q, F.t, F.f1, t0, (v, i) => qdb(tuning[i].f1, bw[0]));
  automate(f2.frequency, F.t, F.f2, t0, (v, i) => tuning[i].f2); automate(f2.Q, F.t, F.f2, t0, (v, i) => qdb(tuning[i].f2, bw[1]));
  tractSrc.connect(f1); f1.connect(f2);
  const low = ctx.createGain();
  const anyTuned = tuning.some((x) => x.tuned);
  // the mouth's tuning gain: on `low` when there is no nose, on the dry path when there is
  // (and then `low` and the upper branch leave it alone, or the wet paths would get it too)
  const oralGain = dryComp ? dryComp.gain : low.gain;
  const oralRef = dryComp ? 1 : c.tract_ref_gain;
  const upperTune = (i) => (dryComp ? 1 : tuning[i].gain);
  if (dryComp) low.gain.value = c.tract_ref_gain;
  if (anyTuned) automate(oralGain, F.t, F.f1, t0, (v, i) => oralRef * tuning[i].gain);
  else oralGain.value = oralRef;
  // where F1, F2 and `low` sit once the IR's curves are over: a morph glides on from here
  let held = tuning[tuning.length - 1];
  let lowGain = oralRef * held.gain;
  f2.connect(low);

  const out = ctx.createGain();
  low.connect(out);
  let f3node = null;
  if (c.tract === 'hybrid' || c.tract === 'parallel') {
    const upper = ctx.createGain();
    const highF = [[F.f3, bw[2], c.gains[2]], [F.f3.map(() => c.f4), bw[3], c.gains[3]]];
    if (c.f5) highF.push([F.f3.map(() => c.f5[0]), c.f5[1], c.hybrid_f5_gain]);
    for (const [vals, b, g] of highF) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      automate(bp.frequency, F.t, vals, t0, (v) => v * fs); automate(bp.Q, F.t, vals, t0, (v) => v * fs / b);
      const gg = ctx.createGain();
      gg.gain.value = g;
      tractSrc.connect(bp); bp.connect(gg); gg.connect(upper); nodes.push(bp, gg);
      if (!f3node) f3node = bp;
    }
    const ref = resonatorMag(sr, AH[0], bw[0], AH[2]) * resonatorMag(sr, AH[1], bw[1], AH[2]);
    const dep = F.t.map((_, i) => {
      const [d1, d2] = tuning[i].tuned ? [tuning[i].f1 / fs, tuning[i].f2 / fs] : [F.f1[i], F.f2[i]];
      return Math.pow(resonatorMag(sr, d1, bw[0], F.f3[i]) * resonatorMag(sr, d2, bw[1], F.f3[i]) / ref, c.hybrid_dep_exp);
    });
    const depG = ctx.createGain();
    automate(depG.gain, F.t, dep, t0, (v, i) => v * c.hybrid_high_gain * upperTune(i));
    upper.connect(depG); nodes.push(upper, depG);
    // The mouth is shut during a nasal, so most of the upper branch is not there; BUZZ
    // decides how much comes back. Off the nasal envelope, which is on its own time grid.
    let upperOut = depG;
    if (ir.nasal_zero.active) {
      const fnp = c.nasal_pole[0];
      const span = Math.max(1e-6, Math.max(...ir.nasal_zero.v) - fnp);
      const hi = (c.nasal_high ?? 0.15) + ((c.nasal_high_max ?? 1.4) - (c.nasal_high ?? 0.15)) * clamp01(c.nasal_buzz || 0);
      const nh = ctx.createGain();
      nh.gain.value = 1;
      automate(nh.gain, ir.nasal_zero.t, ir.nasal_zero.v, t0, (v) => 1 - clamp01((v - fnp) / span) * (1 - hi));
      depG.connect(nh); upperOut = nh; nodes.push(nh);
    }
    upperOut.connect(out);
  }

  // ---- voice bar: the flow itself, low-passed ------------------------------
  if (ir.voicebar.v.some((v) => v > 0)) {
    const flowOsc = ctx.createOscillator();
    flowOsc.setPeriodicWave(glottalWave(ctx, c.oq, 0, meanF0, true));
    automate(flowOsc.frequency, pitchT, pitchV, t0);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 300; lp.Q.value = -3.0;  // dB: Butterworth
    const bg = ctx.createGain();
    bg.gain.value = 0;
    automate(bg.gain, ir.voicebar.t, ir.voicebar.v, t0, (v) => v * (lv.bar_gain ?? 0.02));
    flowOsc.connect(lp); lp.connect(bg); bg.connect(out);
    // The bar sounds only while a closure holds (a D's first 50 ms), so the oscillator
    // stops once the bar has faded rather than running the note's whole length: left
    // running, it cost a third of a held doo in the shipped-path bench (jmjr4-ablate).
    const lastBar = ir.voicebar.v.reduce((m, v, i) => (v > 0 ? i : m), -1);
    const barEnd = lastBar + 1 < ir.voicebar.t.length ? t0 + ir.voicebar.t[lastBar + 1] + 0.02 : t0 + total + 0.05;
    flowOsc.start(t0); book(flowOsc, Math.min(barEnd, t0 + total + 0.05));
    nodes.push(flowOsc, lp, bg); brief.push(flowOsc);
  }

  // ---- extras: bursts and frication, after the tract ------------------------
  // A whole event whose final gain is exactly zero is silence with a graph behind it. The
  // index is the one the IR gave it either way: the seed is `ir.seed + 17 * (i + 1)` and the
  // level is `extra_gains[i]`, so skipping one must not renumber the ones that remain, and
  // `forEach`'s index is the IR's own.
  ir.extras.forEach((e, i) => {
    const eg = (lv.extra_gains && lv.extra_gains[i]) ?? 0.001;
    if (eg === 0) return;
    const start = t0 + e.start / irSr;
    const dur = e.samples / irSr;
    const en = noiseSource(ctx, ir.seed + 17 * (i + 1));
    const sum = ctx.createGain();
    for (const [cc, qq, w] of e.spec) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = cc; bp.Q.value = qq;
      const gg = ctx.createGain();
      gg.gain.value = w;
      en.src.connect(bp); bp.connect(gg); gg.connect(sum); nodes.push(bp, gg);
    }
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, start);
    const [kind, p1, p2] = e.shape;
    if (kind === 'asr') {
      const a = Math.min(p1, dur * 0.45);
      const r = Math.min(p2, dur * 0.45);
      env.gain.linearRampToValueAtTime(1, start + a);
      env.gain.setValueAtTime(1, start + dur - r);
      env.gain.linearRampToValueAtTime(0, start + dur);
    } else {
      const a = Math.min(p1, dur * 0.3);
      env.gain.linearRampToValueAtTime(1, start + a);
      env.gain.setTargetAtTime(0.0, start + a, Math.max(1e-3, p2) / Math.log(100));
    }
    const g = ctx.createGain();
    g.gain.value = eg;
    if (e.voiced) {
      const mod = ctx.createOscillator();
      mod.setPeriodicWave(glottalWave(ctx, c.oq, 0, meanF0, true));
      automate(mod.frequency, pitchT, pitchV, t0);
      const mg = ctx.createGain();
      mg.gain.value = 0.65; mod.connect(mg); mg.connect(env.gain);
      env.gain.setValueAtTime(0.35 + 0.325, start);
      mod.start(start); book(mod, start + dur + 0.02); nodes.push(mod, mg); brief.push(mod);
    }
    sum.connect(env); env.connect(g); g.connect(out);
    en.src.start(start, en.offset); book(en.src, start + dur + 0.005);
    nodes.push(en.src, sum, env, g); brief.push(en.src);
  });

  // ---- declination and the phrase gate ------------------------------------
  const decl = ctx.createGain();
  decl.gain.setValueAtTime(0, t0);
  decl.gain.linearRampToValueAtTime(1, t0 + 0.003);
  decl.gain.linearRampToValueAtTime(0.8, t0 + total - 0.01);
  decl.gain.linearRampToValueAtTime(0, t0 + total);
  out.connect(decl); decl.connect(dest);

  for (const o of mainOscs) { o.start(t0); book(o, t0 + total + 0.05); }
  // The booked end is the note's, or the moment the breath goes silent for good if that is
  // sooner. `book` and not `cut`: this IS the first booking, and everything that stops this
  // source afterwards — a note-off, a panic, the rack's own stop — goes through `cut`, which
  // only ever brings a stop forward.
  if (noiseN) {
    const end = t0 + total + 0.05;
    noiseN.src.start(t0, noiseN.offset);
    book(noiseN.src, aspStop != null ? Math.min(aspStop, end) : end);
  }
  nodes.push(...mainOscs, voicing, tractIn, f1, f2, low, out, decl);
  if (noiseN) nodes.push(noiseN.src, asp);
  sources.push(...mainOscs);
  if (noiseN) sources.push(noiseN.src);
  const oscs = [...mainOscs, ...nodes.filter((n) => n instanceof OscillatorNode && !mainOscs.includes(n) && n.frequency.value > 20)];
  const go = (param, v, t, tc, dur, from) => {
    param.cancelScheduledValues(t);
    if (dur > 0) { param.setValueAtTime(from ?? param.value, t); param.linearRampToValueAtTime(v, t + dur); } else param.setTargetAtTime(v, t, tc);
  };
  return {
    end: t0 + total,
    nodes,
    gate: decl.gain,
    sources,
    oscs,
    f1,
    f2,
    stop(t) { for (const n of [...sources, ...brief]) cut(n, t ?? ctx.currentTime); },
    // live vowel morph on a held note: move F1..F3 to a new target (Hz, before fscale).
    // `tc` is an exponential time constant (a pot nudge); `dur` is a linear glide that takes
    // exactly that long (MORPH TIME on a new note)
    retarget(f, t = ctx.currentTime, tc = 0.04, dur = 0) {
      const q = (at, b, lowpass) => (lowpass ? 20 * Math.log10(Math.max(1.0001, at / b)) : at / b);
      const set = (node, at, b, lowpass, from) => {
        go(node.frequency, at, t, tc, dur, from);
        go(node.Q, q(at, b, lowpass), t, tc, dur, from == null ? undefined : q(from, b, lowpass));
      };
      // Re-tuned on the vowel it is going to. A glide reads `param.value` for where it starts,
      // which is the biquad's default 350 Hz, not the vowel (see `automate`): harmless on a
      // note under its vowel, and kept there, but a tuned note gliding up from 350 falls
      // straight back into the hole tuning fills. So a tuned glide starts from where the
      // note is held. The gain is only booked when it moves, so a morph between two vowels
      // the note sits under leaves `low` a constant.
      const tt = tunedTract(sr, c, meanF0, f[0] * fs, f[1] * fs, f[2] * fs, bw);
      const from = tt.tuned || held.tuned ? held : null;
      set(f1, tt.f1, bw[0], true, from?.f1); set(f2, tt.f2, bw[1], true, from?.f2);
      if (f3node) set(f3node, f[2] * fs, bw[2], false);
      const g = oralRef * tt.gain;
      if (g !== lowGain) { go(oralGain, g, t, tc, dur, lowGain); lowGain = g; }
      for (const w of wetPaths) {
        const level = nasalTune(sr, c, meanF0, f[0] * fs, f[1] * fs, f[2] * fs, w.fz, tt, bw);
        if (level !== w.level) { go(w.comp.gain, level, t, tc, dur, w.level); w.level = level; }
      }
      held = tt;
    },
    // live nasality on a held note: crossfade the dry tract against the pole/zero path at
    // `place` (Hz), 0 = oral, 1 = fully the nasal. Same timing arguments as retarget.
    nasalise(place, amount, t = ctx.currentTime, tc = 0.04, dur = 0) {
      const wet = wetPaths.find((w) => w.fz === Math.round(place));
      if (!wet || !dryPath) return false;
      const a = clamp01(amount);
      go(wet.g.gain, a, t, tc, dur); go(dryPath.gain, 1 - a, t, tc, dur);
      for (const w of wetPaths) if (w !== wet) go(w.g.gain, 0, t, tc, dur);
      return true;
    },
    nasalState() { return dryPath ? { dry: dryPath.gain.value, wet: wetPaths.map((w) => [w.fz, w.g.gain.value]) } : null; },
    // a note-off: fade the phrase gate over `rel` seconds and stop every source after it.
    // No timer and no disconnect: a stopped graph with nothing feeding it is collected.
    release(t, rel = 0.15) {
      decl.gain.cancelScheduledValues(t);
      decl.gain.setValueAtTime(Math.max(1e-4, decl.gain.value), t);
      decl.gain.linearRampToValueAtTime(0, t + rel);
      const end = t + rel + 0.02;
      for (const n of [...sources, ...brief]) cut(n, end);
    },
  };
}

/** Render one IR to a Float32Array, offline, at `sampleRate`. For tests and auditions. */
export async function renderOffline(ir, sampleRate = 44100, opts = {}) {
  const frames = Math.ceil(ir.samples * sampleRate / ir.sample_rate);
  const ctx = new OfflineAudioContext(1, frames, sampleRate);
  renderIr(ctx, ir, { ...opts, start: 0, destination: ctx.destination });
  const buf = await ctx.startRendering();
  return buf.getChannelData(0);
}
