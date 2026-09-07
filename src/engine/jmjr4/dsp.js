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
  if (!w) { w = buildGlottalWave(ctx, oq, tiltDb, f0, useFlow); m.set(key, w); }
  return w;
}
function buildGlottalWave(ctx, oq, tiltDb, f0, useFlow) {
  const sr = ctx.sampleRate;
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
  return ctx.createPeriodicWave(re, im, { disableNormalization: true });
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

  // ---- nasal stage -----------------------------------------------------------
  let tractSrc = tractIn;
  let dryPath = null;
  let wetPaths = [];
  const forced = (opts.nasalPlaces || []).map((v) => Math.round(v));
  if (ir.nasal_zero.active || forced.length) {
    const [fnp, bwp] = c.nasal_pole;
    const bwz = c.nasal_zero_bw;
    const T = 1 / sr;
    const targets = [...new Set([...ir.nasal_zero.v.filter((v) => v > fnp + 1).map((v) => Math.round(v)), ...forced])];
    const sum = ctx.createGain();
    const dry = ctx.createGain();
    tractIn.connect(dry); dry.connect(sum);
    const buzz = clamp01(c.nasal_buzz || 0);
    const wets = targets.map((fz) => {
      // y[n] = A x[n] + B y[n-1] + C y[n-2], the reference's own coefficients
      const pC = -Math.exp(-2 * Math.PI * bwp * T);
      const pB = 2 * Math.exp(-Math.PI * bwp * T) * Math.cos(2 * Math.PI * fnp * T);
      const pA = 1 - pB - pC;
      const C = -Math.exp(-2 * Math.PI * bwz * T);
      const B = 2 * Math.exp(-Math.PI * bwz * T) * Math.cos(2 * Math.PI * fz * T);
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
      tractIn.connect(nasal); tail.connect(g); g.connect(sum);
      nodes.push(nasal, g);
      return { fz, g };
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
  const F = ir.formants;
  const qdb = (f, b) => 20 * Math.log10(Math.max(1.0001, f / b));
  const f1 = ctx.createBiquadFilter();
  const f2 = ctx.createBiquadFilter();
  f1.type = f2.type = 'lowpass';
  automate(f1.frequency, F.t, F.f1, t0, (v) => v * fs); automate(f1.Q, F.t, F.f1, t0, (v) => qdb(v * fs, bw[0]));
  automate(f2.frequency, F.t, F.f2, t0, (v) => v * fs); automate(f2.Q, F.t, F.f2, t0, (v) => qdb(v * fs, bw[1]));
  tractSrc.connect(f1); f1.connect(f2);
  const low = ctx.createGain();
  low.gain.value = c.tract_ref_gain;
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
    const AH = [750, 1200, 2500];
    const ref = resonatorMag(sr, AH[0], bw[0], AH[2]) * resonatorMag(sr, AH[1], bw[1], AH[2]);
    const dep = F.t.map((_, i) => Math.pow(resonatorMag(sr, F.f1[i], bw[0], F.f3[i]) * resonatorMag(sr, F.f2[i], bw[1], F.f3[i]) / ref, c.hybrid_dep_exp));
    const depG = ctx.createGain();
    automate(depG.gain, F.t, dep, t0, (v) => v * c.hybrid_high_gain);
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
  const go = (param, v, t, tc, dur) => {
    param.cancelScheduledValues(t);
    if (dur > 0) { param.setValueAtTime(param.value, t); param.linearRampToValueAtTime(v, t + dur); } else param.setTargetAtTime(v, t, tc);
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
      const set = (node, hz, b, lowpass) => {
        go(node.frequency, hz * fs, t, tc, dur);
        go(node.Q, lowpass ? 20 * Math.log10(Math.max(1.0001, hz * fs / b)) : hz * fs / b, t, tc, dur);
      };
      set(f1, f[0], bw[0], true); set(f2, f[1], bw[1], true); if (f3node) set(f3node, f[2], bw[2], false);
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
