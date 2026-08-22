/*
 * TNGR-2's DSP core — the synthesis mathematics, and the only copy of them.
 *
 * ---- why the maths is a string ------------------------------------------------
 *
 * The completion spec's hardest rule is §2's "do not maintain two approximate synths":
 * whatever the live worklet plays, the offline render must compute with the SAME code,
 * or a stem stops matching the mix it came from and no baseline can ever be trusted
 * again. That rule is easy to state and easy to break by accident, because an
 * AudioWorkletProcessor cannot see the modules around it — it runs in its own global
 * scope, reached only through a URL.
 *
 * So the core lives here as source text, and is used two ways from this one copy:
 *
 *   - the WORKLET gets it concatenated into its processor and loaded as a Blob, which is
 *     the loading strategy the §3 proof gate established (see proof.js for why a Blob
 *     rather than a second build output).
 *   - NODE — tests, tools, the offline reference renderer below — evaluates it once and
 *     imports the classes like any other module.
 *
 * The alternative, a second build entry point plus a checked-in generated copy, is the
 * arrangement that drifts: two files, one of them a build artifact nobody reads, and a
 * hash check standing between them and disaster. One string cannot drift from itself.
 *
 * `new Function` is only ever evaluated in Node here. The browser reaches this code
 * through the worklet, never through eval, so no page needs `unsafe-eval` in a CSP.
 *
 * ---- what is in it -------------------------------------------------------------
 *
 * Stage 2 of docs/TNGR-2-completion-spec.md §13: the voice allocator, the event queue,
 * the amp envelope and a placeholder oscillator, all sample-accurate and deterministic.
 * The oscillator is a plain sine and the filter a one-pole — stage 4 replaces the first
 * with the mipped table lookup of §6.2 and stage 6 the second with the stereo SVF of
 * §7.4. The SHAPE is what stage 2 is for: everything those stages need is already
 * threaded through, so they change the maths inside a voice without touching the
 * allocator, the queue, or the parity this file's tests establish.
 */

/**
 * The core, as source. Pure: no DOM, no Tone, no VoiceRack, no mixer or game state, and
 * no reference to `sampleRate`, `currentFrame` or any other worklet global — the rate is
 * a constructor argument and the frame is passed in, so the same class runs in Node.
 */
export const TNGR2_DSP_SOURCE = `
// A note's starting phase comes from its own identity, never from playback history: the
// same event renders the same phase in a stem and in the mix that stem belongs to, and
// again on the second render of either. This is the whole of §7.2's "seeded".
function tngr2SeededPhase(eventId, unisonIndex) {
  var h = 2166136261 ^ Math.imul((eventId | 0) + 1, 16777619);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= Math.imul((unisonIndex | 0) + 1, 2654435761);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  return ((h >>> 8) & 0xffff) / 65536;
}

/**
 * A deterministic value in [-1, 1) for a sample-and-hold step.
 *
 * Hashed from the step number and the note's identity rather than drawn from a random
 * source, because §12.1 requires sample-and-hold to be "repeatable and independent of
 * prior playback": a stem and the mix it belongs to must hold the same values, and so
 * must the second render of either.
 */
function tngr2Hold(step, seed) {
  var h = 2166136261 ^ Math.imul((step | 0) + 1, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  h ^= Math.imul((seed | 0) + 1, 668265263);
  h = Math.imul(h ^ (h >>> 16), 2654435761);
  return (((h >>> 8) & 0xffff) / 32768) - 1;
}

var TNGR2_STAGE_OFF = 0;
var TNGR2_STAGE_ATTACK = 1;
var TNGR2_STAGE_DECAY = 2;
var TNGR2_STAGE_SUSTAIN = 3;
var TNGR2_STAGE_RELEASE = 4;
// MONO's choke: on the way down to zero before the attack that follows it. See restrike().
var TNGR2_STAGE_RESTRIKE = 5;

// Below this a jump straight to zero is inaudible — about -80 dB — so the choke that
// covers the step is not worth the four milliseconds it would cost the strike.
var TNGR2_SILENT = 1e-4;

/*
 * The two envelope curves the desk offers, as a shaping of a stage's PROGRESS.
 *
 * A stage runs a counter from 0 to 1 and the curve decides what that means. Linear is the
 * counter itself. Exponential is the shape a real instrument has — a fall that drops fast
 * and then tapers, and a rise that starts gently and arrives quickly — which is why the
 * rest of the desk defaults decay and release to it and leaves attack linear.
 *
 * Shaped rather than computed as a true exponential because a stage has to END: e^-kt
 * never reaches zero, so a release built on it either stops early at some arbitrary floor
 * or holds a voice open for ever. This reaches its target exactly, on the sample the
 * counter says, which is what lets a note-off land where it was stamped.
 */
function tngr2Fall(p) { var q = 1 - p; return 1 - q * q; }
function tngr2Rise(p) { return p * p; }

/**
 * A linear-or-curved ADSR, evaluated one sample at a time.
 *
 * One implementation for all three envelopes — amp, filter and position. Writing it twice
 * is how the position envelope would end up with a subtly different decay from the amp's.
 *
 * Per sample rather than a scheduled curve because there is no AudioParam here to schedule
 * against — and because a per-sample envelope is what lets a note-off land on the exact
 * frame it was stamped with instead of at the top of a 128-sample quantum.
 */
function Tngr2Env(rate) {
  this.rate = rate;
  this.stage = TNGR2_STAGE_OFF;
  this.value = 0;
  this.sustain = 1;
  this.attackStep = 1;
  this.decayStep = 1;
  this.releaseStep = 1;
  this.chokeStep = 1;
  // How far through the current stage, 0 to 1, before the curve is applied.
  this.p = 0;
  this.from = 0;
  this.attackCurve = 0;
  this.decayCurve = 1;
  this.releaseCurve = 1;
}

var TNGR2_CURVES = { linear: 0, exponential: 1 };
var tngr2CurveOf = function (name, fallback) {
  return TNGR2_CURVES[name] !== undefined ? TNGR2_CURVES[name] : fallback;
};

Tngr2Env.prototype.gate = function gate(spec) {
  // A stage of zero seconds is a stage that happens in one sample, not one that divides
  // by zero. Every step below is clamped to at most a full traversal per sample.
  var rate = this.rate;
  this.sustain = Math.min(1, Math.max(0, spec.sustain));
  this.attackStep = spec.attack > 0 ? Math.min(1, 1 / (spec.attack * rate)) : 1;
  this.decayStep = spec.decay > 0 ? Math.min(1, 1 / (spec.decay * rate)) : 1;
  this.releaseStep = spec.release > 0 ? Math.min(1, 1 / (spec.release * rate)) : 1;
  this.attackCurve = tngr2CurveOf(spec.attackCurve, 0);
  this.decayCurve = tngr2CurveOf(spec.decayCurve, 1);
  this.releaseCurve = tngr2CurveOf(spec.releaseCurve, 1);
  // Retriggered from wherever the envelope stands, so a restrike does not click.
  this.from = this.value;
  this.p = 0;
  this.stage = TNGR2_STAGE_ATTACK;
};

Tngr2Env.prototype.release = function release() {
  if (this.stage === TNGR2_STAGE_OFF) return;
  this.from = this.value;
  this.p = 0;
  this.stage = TNGR2_STAGE_RELEASE;
};

/** Cut short without a click: finish wherever we are, over the given seconds. */
Tngr2Env.prototype.choke = function choke(seconds) {
  this.releaseStep = seconds > 0 ? Math.min(1, 1 / (seconds * this.rate)) : 1;
  this.releaseCurve = 0;
  this.from = this.value;
  this.p = 0;
  this.stage = TNGR2_STAGE_RELEASE;
};

/**
 * MONO's restrike: fall to silence over the anti-click fade, then run from zero.
 *
 * §7.1 asks MONO to "choke/retrigger", and the choke is the half that makes the retrigger
 * reliable. Re-gating alone starts the attack from wherever the envelope happens to stand,
 * so how much of a strike you hear depends entirely on how far the last note had fallen:
 * a pluck already down at a sustain of 0.08 leaps back to full and sounds struck, while a
 * pad sitting at a sustain of 1 has nothing above it to rise to and is not restruck at all
 * — the pitch changes and nothing else does. Coming down to zero first makes every
 * restrike the same strike, whatever the patch and whatever the note before it was doing.
 *
 * Unlike choke(), which is how a stolen voice dies, this one ends in ATTACK: the voice
 * plays on into the new note instead of being retired.
 */
Tngr2Env.prototype.restrike = function restrike(spec, seconds) {
  // The new note's ADSR is loaded first, so the attack that follows the fall is already
  // the one this note asked for.
  this.gate(spec);
  if (this.from <= TNGR2_SILENT) return;
  this.chokeStep = seconds > 0 ? Math.min(1, 1 / (seconds * this.rate)) : 1;
  this.stage = TNGR2_STAGE_RESTRIKE;
};

Tngr2Env.prototype.tick = function tick() {
  var stage = this.stage;
  if (stage === TNGR2_STAGE_OFF) return 0;
  if (stage === TNGR2_STAGE_ATTACK) {
    this.p += this.attackStep;
    if (this.p >= 1) {
      this.p = 0;
      this.value = 1;
      this.from = 1;
      this.stage = TNGR2_STAGE_DECAY;
    } else {
      var ap = this.attackCurve ? tngr2Rise(this.p) : this.p;
      this.value = this.from + (1 - this.from) * ap;
    }
  } else if (stage === TNGR2_STAGE_DECAY) {
    this.p += this.decayStep;
    if (this.p >= 1) {
      this.p = 0;
      this.value = this.sustain;
      this.stage = TNGR2_STAGE_SUSTAIN;
    } else {
      var dp = this.decayCurve ? tngr2Fall(this.p) : this.p;
      this.value = 1 - (1 - this.sustain) * dp;
    }
  } else if (stage === TNGR2_STAGE_RELEASE) {
    this.p += this.releaseStep;
    if (this.p >= 1) {
      this.p = 0;
      this.value = 0;
      this.stage = TNGR2_STAGE_OFF;
    } else {
      var rp = this.releaseCurve ? tngr2Fall(this.p) : this.p;
      this.value = this.from * (1 - rp);
    }
  } else if (stage === TNGR2_STAGE_RESTRIKE) {
    this.p += this.chokeStep;
    if (this.p >= 1) {
      // Silent — and the attack takes it from here, from zero, which is the whole point
      // of having come down. The stage never touches OFF, so the voice is never dropped
      // in the middle of its own restrike.
      this.p = 0;
      this.value = 0;
      this.from = 0;
      this.stage = TNGR2_STAGE_ATTACK;
    } else {
      // Linear, like choke(): a curve buys nothing across four milliseconds.
      this.value = this.from * (1 - this.p);
    }
  }
  return this.value;
};

Tngr2Env.prototype.done = function done() { return this.stage === TNGR2_STAGE_OFF; };

var TNGR2_LFO_SINE = 0;
var TNGR2_LFO_TRIANGLE = 1;
var TNGR2_LFO_SAW = 2;
var TNGR2_LFO_SQUARE = 3;
var TNGR2_LFO_HOLD = 4;

var TNGR2_LFO_SHAPES = {
  sine: TNGR2_LFO_SINE,
  triangle: TNGR2_LFO_TRIANGLE,
  saw: TNGR2_LFO_SAW,
  square: TNGR2_LFO_SQUARE,
  samplehold: TNGR2_LFO_HOLD
};

/**
 * One LFO, per voice.
 *
 * Per voice rather than per lane because §7.3 requires RETRIGGER, which only means
 * anything if a note owns its own phase. A free-running LFO is still supported: it takes
 * its phase from the transport frame, so it is continuous across notes AND identical in a
 * stem and in the mix — which a phase carried over from whatever played last would not be.
 */
function Tngr2Lfo(rate) {
  this.rate = rate;
  this.phase = 0;
  this.inc = 0;
  this.shape = TNGR2_LFO_SINE;
  this.value = 0;
  this.delayLeft = 0;
  this.delaySamples = 0;
  this.seed = 0;
  this.step = 0;
  this.held = 0;
}

Tngr2Lfo.prototype.gate = function gate(spec, startFrame, seed) {
  this.shape = spec.shape;
  this.inc = spec.hz / this.rate;
  this.delaySamples = spec.delaySamples;
  this.delayLeft = spec.delaySamples;
  this.seed = seed;
  // The first held value belongs to the first cycle, not to the second: starting at zero
  // would make every sample-and-hold LFO begin with a cycle of nothing.
  this.step = 0;
  this.held = tngr2Hold(0, seed);
  if (spec.retrigger) {
    this.phase = spec.phase;
  } else {
    // Locked to the transport, so a free LFO is where a global one would have been.
    var turns = startFrame * this.inc + spec.phase;
    this.phase = turns - Math.floor(turns);
  }
  this.value = 0;
};

Tngr2Lfo.prototype.advance = function advance(samples) {
  var count = Math.max(1, Math.round(samples || 1));
  // Only the value on the control grid is consumed. Jump to the phase of the last sample
  // in this span instead of evaluating the same sine on every intervening audio sample.
  var phase = this.phase;
  var crossed = 0;
  // Repeated addition is intentional: it lands on the exact phases the former per-sample
  // tick did, preserving the rendered samples while skipping only waveform evaluation.
  for (var skip = 1; skip < count; skip++) {
    phase += this.inc;
    if (phase >= 1) {
      crossed = Math.floor(phase);
      phase -= crossed;
      if (this.shape === TNGR2_LFO_HOLD) {
        this.step += crossed;
        this.held = tngr2Hold(this.step, this.seed);
      }
    }
  }
  var value;
  if (this.shape === TNGR2_LFO_SINE) {
    value = Math.sin(phase * 6.283185307179586);
  } else if (this.shape === TNGR2_LFO_TRIANGLE) {
    value = 1 - 4 * Math.abs(phase - 0.5);
  } else if (this.shape === TNGR2_LFO_SAW) {
    value = phase * 2 - 1;
  } else if (this.shape === TNGR2_LFO_SQUARE) {
    value = phase < 0.5 ? 1 : -1;
  } else {
    // One new value per cycle, hashed from the cycle number: deterministic, and the same
    // in every host and every render.
    value = this.held;
  }
  this.phase = phase + this.inc;
  if (this.phase >= 1) {
    crossed = Math.floor(this.phase);
    this.phase -= crossed;
    if (this.shape === TNGR2_LFO_HOLD) {
      this.step += crossed;
      this.held = tngr2Hold(this.step, this.seed);
    }
  }
  // DELAY fades the LFO in from the note's start, so a vibrato can arrive after the
  // attack rather than being present in it.
  var scale = 1;
  var delayAtLast = Math.max(0, this.delayLeft - (count - 1));
  if (delayAtLast > 0) {
    scale = 1 - delayAtLast / this.delaySamples;
  }
  this.delayLeft = Math.max(0, this.delayLeft - count);
  this.value = value * scale;
  return this.value;
};

Tngr2Lfo.prototype.tick = function tick() { return this.advance(1); };

/**
 * A topology-preserving-transform state variable filter, per channel.
 *
 * Chosen over a biquad because this one is stable while its cutoff is being modulated:
 * the coefficients are recomputed from a single tan() and the state stays bounded even at
 * the maximum resonance §7.4 requires it to survive. A direct-form biquad with an
 * envelope on its cutoff is the classic way to get a burst of noise on a filter sweep.
 *
 * After Zavalishin's TPT SVF. One instance per channel, so a stereo voice has two.
 */
function Tngr2Svf() {
  this.ic1 = 0;
  this.ic2 = 0;
  this.a1 = 0;
  this.a2 = 0;
  this.a3 = 0;
  this.k = 1;
  this.mode = 0;
}

Tngr2Svf.prototype.reset = function reset() { this.ic1 = 0; this.ic2 = 0; };

Tngr2Svf.prototype.setCoeffs = function setCoeffs(a1, a2, a3, k, mode) {
  this.a1 = a1;
  this.a2 = a2;
  this.a3 = a3;
  this.k = k;
  this.mode = mode;
};

Tngr2Svf.prototype.tick = function tick(input) {
  var v3 = input - this.ic2;
  var v1 = this.a1 * this.ic1 + this.a2 * v3;
  var v2 = this.ic2 + this.a2 * this.ic1 + this.a3 * v3;
  this.ic1 = 2 * v1 - this.ic1;
  this.ic2 = 2 * v2 - this.ic2;
  // Guard rather than trust: a denormal or a NaN arriving from a bad coefficient would
  // otherwise stay in the state for the life of the note. §7.4 requires finite output at
  // maximum modulation and resonance, and this is what makes that true by construction.
  if (!(this.ic1 === this.ic1) || !(this.ic2 === this.ic2)) { this.ic1 = 0; this.ic2 = 0; return 0; }
  // Lowpass first because lowpass is what the catalogue is: forty of the forty-three
  // presets, and it used to be the one tap that fell through all three comparisons to
  // reach its return. The mode cannot change while a note is sounding.
  if (this.mode === 0) return v2;
  if (this.mode === 1) return input - this.k * v1 - v2;
  if (this.mode === 2) return v1;
  return input - this.k * v1;
};

var TNGR2_FILTER_MODES = { lowpass: 0, highpass: 1, bandpass: 2, notch: 3 };

var TNGR2_SHAPE_SOFT = 0;
var TNGR2_SHAPE_FOLD = 1;
var TNGR2_SHAPE_CRUSH = 2;
var TNGR2_SHAPES = { soft: TNGR2_SHAPE_SOFT, fold: TNGR2_SHAPE_FOLD, crush: TNGR2_SHAPE_CRUSH };

/**
 * The three drive shapes, matching the curves MRDR-3 and the drum panel build.
 *
 * FOLD turns back on itself past the limit instead of flattening, so it adds harmonics
 * rather than removing them; CRUSH quantises the level, which is a different kind of
 * dirt again. SOFT is the saturator below.
 */
function tngr2Shape(x, amount, shape, steps) {
  if (shape === TNGR2_SHAPE_FOLD) {
    // Reflect repeatedly about +-1 so a hot signal folds rather than clipping.
    var d = x * (1 + amount * 6);
    for (var i = 0; i < 4; i++) {
      if (d > 1) d = 2 - d;
      else if (d < -1) d = -2 - d;
      else break;
    }
    return d;
  }
  if (shape === TNGR2_SHAPE_CRUSH) {
    // Level quantisation: from 16 steps down to 2 as the amount climbs. The step COUNT is
    // a property of the patch, not of the sample, so the compiler works it out once and
    // hands it in — this used to be two Math.rounds per channel per sample to arrive at
    // the same number the note started with.
    var q = Math.round(x * steps) / steps;
    return q > 1 ? 1 : (q < -1 ? -1 : q);
  }
  return tngr2Drive(x, amount);
}

/**
 * A bounded soft clip, for DRIVE.
 *
 * The Padé approximation of tanh, x(27+x^2)/(27+9x^2), which is smooth and cheap — but it
 * is only an approximation NEAR ZERO. It reaches exactly 1 at x = 3 and then turns around
 * and grows like x/9, so used unguarded it is not a limiter at all: a hot signal comes out
 * the other side louder and un-clipped. Clamped at +-3, where it meets +-1 continuously,
 * it is a real saturator with no discontinuity at the corner.
 */
function tngr2Drive(x, amount) {
  if (amount <= 0) return x;
  var d = x * (1 + amount * 3);
  if (d >= 3) return 1;
  if (d <= -3) return -1;
  var d2 = d * d;
  return (d * (27 + d2)) / (27 + 9 * d2);
}

/**
 * Which mip level a pitch may be read from without aliasing.
 *
 * The highest harmonic that still fits under Nyquist is (rate/2)/hz; the level whose
 * harmonic count is at or below that is the one to read. Returned as a float so the
 * caller can crossfade between neighbouring levels — §6.2 forbids an audible step at a
 * pitch boundary, and stepping is exactly what rounding this would produce.
 */
function tngr2MipLevel(hz, rate, harmonics, levels) {
  var fits = (rate * 0.5) / Math.max(1e-6, Math.abs(hz));
  if (fits >= harmonics) return 0;
  var level = Math.log2(harmonics / Math.max(1, fits));
  return Math.min(levels - 1, Math.max(0, level));
}

// ---- what moves a note ---------------------------------------------------------
//
// The position envelope and ONE LFO, both pointed at table POSITION, plus a dedicated
// vibrato on pitch for the shared Note-card control. That is what the bank uses: 57
// oscillators take the position envelope, 8 take the LFO, none uses vibrato.
//
// There was a general six-slot matrix here — §7.3 asked for one — and it went because
// nothing reached for it: across 43 presets it carried a single migrated value, and its
// real cost was not the slots but the machinery kept warm for them (two LFO sines and
// fourteen array writes per voice per sample, for values nobody read). A fixed model
// that says what it does is cheaper to run and much cheaper to read.

/**
 * A patch, compiled into the flat form a note-on can use without arithmetic.
 *
 * Everything that depends only on the PATCH — cents composed into a frequency ratio,
 * unison spread, the 1/sqrt(n) normalisation, equal-power pan gains, LFO rates, the mod
 * matrix — is computed once here. What is left for note-on is multiplying a ratio by the
 * note's own hertz. §7.4 forbids work in the steady-state loop; this is the same
 * principle one level up, since a lane playing sixteenth notes reaches note-on hundreds
 * of times a second.
 */
function tngr2CompilePatch(patch) {
  var p = patch || {};
  var envOf = function (spec, defSustain) {
    var e = spec || {};
    return {
      attack: Math.max(0, Number(e.attack) || 0),
      decay: Math.max(0, Number(e.decay) || 0),
      sustain: e.sustain != null ? Math.min(1, Math.max(0, Number(e.sustain))) : defSustain,
      release: Math.max(0, Number(e.release) || 0),
      // The stage curves travel with the times. Left out, every envelope on the synth is
      // linear however the panel is set.
      attackCurve: e.attackCurve,
      decayCurve: e.decayCurve,
      releaseCurve: e.releaseCurve
    };
  };
  var out = {
    mode: p.mode === 'mono' || p.mode === 'legato' ? p.mode : 'poly',
    glide: Math.max(0, Number(p.glide) || 0),
    amp: envOf(p.amp, 1),
    positionEnv: envOf(p.positionEnv, 0),
    filterEnv: envOf(p.filterEnv, 0),
    filterEnvAmount: Number(p.filterEnv && p.filterEnv.amount) || 0,
    cutoff: p.filter && p.filter.cutoff != null ? Math.max(20, Number(p.filter.cutoff)) : 18000,
    resonance: p.filter && p.filter.resonance != null
      ? Math.min(24, Math.max(0.1, Number(p.filter.resonance))) : 0.7,
    keyTrack: p.filter && p.filter.keyTrack != null
      ? Math.min(1, Math.max(0, Number(p.filter.keyTrack))) : 0,
    filterMode: TNGR2_FILTER_MODES[p.filter && p.filter.type] || 0,
    // -12 is one stage, -24 two, -48 four. Same three slopes the rest of the desk offers.
    stages: (function (slope) {
      var n = Math.abs(Number(slope) || 12);
      return n >= 48 ? 4 : (n >= 24 ? 2 : 1);
    }(p.filter && p.filter.slope)),
    seed: (Number(p.seed) || 0) | 0,
    // The shared Effects card — the same keys the drum and MRDR-3 panels write, so the
    // three pots are provably one control across the panels. PLACE decides whether the
    // shaper sits before the voice filter or after it, which is the only reading of
    // pre/post that means anything here: TNGR-2's filter is inside the voice.
    drive: {
      amount: Math.min(1, Math.max(0, Number(p.drive) || 0)),
      shape: TNGR2_SHAPES[p.shape] !== undefined ? TNGR2_SHAPES[p.shape] : TNGR2_SHAPE_SOFT,
      pre: p.drivePlace === 'pre',
      // TONE is a one-pole lowpass after the shaper, taming the harmonics it just made.
      tone: Math.min(20000, Math.max(20, Number(p.tone && p.tone.freq) || 18000))
    },
    // The shared Note-card vibrato: depth in SEMITONES, straight onto pitch. Its own
    // small path rather than a matrix slot, because it is one fixed job.
    vibrato: {
      depth: Math.min(24, Math.max(0, Number(p.vibrato && p.vibrato.depth) || 0)),
      hz: Math.min(64, Math.max(0.01, Number(p.vibrato && p.vibrato.rate) || 5)),
      delay: Math.max(0, Number(p.vibrato && p.vibrato.delay) || 0),
      delaySamples: 0
    },
    sources: [],
    lfos: []
  };
  // CRUSH's step count: constant for the life of the patch, so it is worked out here
  // rather than twice per sample inside the shaper. See tngr2Shape.
  out.drive.steps = Math.max(2, Math.round(16 - out.drive.amount * 14));
  var lfoSpecs = [p.lfo1];
  for (var li = 0; li < 1; li++) {
    var l = lfoSpecs[li] || {};
    out.lfos.push({
      shape: TNGR2_LFO_SHAPES[l.shape] !== undefined ? TNGR2_LFO_SHAPES[l.shape] : TNGR2_LFO_SINE,
      // A plain frequency. There is no tempo sync: the LFO here moves the table position,
      // which is a timbre, and a timbre that snaps to the beat is a rhythm the sequencer
      // already owns. The core never learns what a beat is.
      hz: Math.min(64, Math.max(0.01, Number(l.rate) || 1)),
      phase: Math.min(1, Math.max(0, Number(l.phase) || 0)),
      // No DELAY and no RETRIGGER on the position LFO: nothing used either, and an LFO
      // that starts with the note is what a player expects. The Lfo class keeps both,
      // because the shared Note-card VIBRATO still has a delay of its own.
      delaySamples: 0,
      delay: 0,
      retrigger: true
    });
  }
  var oscs = [p.oscA, p.oscB];
  for (var o = 0; o < oscs.length; o++) {
    var osc = oscs[o];
    if (!osc) continue;
    if (o > 0 && osc.on === false) continue;
    var level = osc.level != null ? Math.max(0, Number(osc.level)) : (o === 0 ? 0.8 : 0);
    if (!(level > 0)) continue;
    var count = Math.min(4, Math.max(1, Math.round(Number(osc.unison) || 1)));
    var spread = Math.min(50, Math.max(0, Number(osc.spread) || 0));
    var stereo = Math.min(1, Math.max(0, Number(osc.stereo) || 0));
    // No per-oscillator PAN: the lane has one, and STEREO already spreads a stack across
    // the field. Three ways to put a sound in the same place is two too many.
    // Tuning is composed in CENTS and converted once, per §7.2 — adding ratios instead
    // would make an octave plus a semitone something other than thirteen semitones.
    // INTERVAL is where this oscillator sits against the note, in semitones; DETUNE is
    // the cents either side of it. Same two controls, same names, as MRDR-3's layers.
    var cents = (Number(osc.interval) || 0) * 100 + (Number(osc.detune) || 0);
    for (var u = 0; u < count; u++) {
      var detune = count > 1 ? spread * (u / (count - 1) - 0.5) : 0;
      var pan = count > 1 ? ((u / (count - 1)) * 2 - 1) * stereo : 0;
      // Equal power across the pair, so a stack does not get louder as it widens.
      var angle = (pan + 1) * 0.7853981633974483;
      out.sources.push({
        table: osc.table || 'basic',
        position: Math.min(1, Math.max(0, Number(osc.position) || 0)),
        ratio: Math.pow(2, (cents + detune) / 1200),
        // 1/sqrt(unison): §7.2's normalisation, so four detuned copies of a wave are
        // about as loud as one rather than four times as loud.
        level: level / Math.sqrt(count),
        gainL: Math.cos(angle),
        gainR: Math.sin(angle),
        envAmount: Math.min(1, Math.max(-1, Number(osc.envAmount) || 0)),
        lfoAmount: Math.min(1, Math.max(-1, Number(osc.lfoAmount) || 0)),
        member: u,
        osc: o
      });
    }
  }
  /*
   * What this patch actually MOVES.
   *
   * Most presets move almost nothing: run unconditionally, an idle LFO still costs a sine
   * per voice per sample and an idle envelope a step, to arrive at the number the note
   * started with. The compiler works it out once and the voice skips the rest — a pure
   * optimisation, since every flag is derived from the patch.
   */
  var oscMoves = function (key) {
    for (var i = 0; i < out.sources.length; i++) if (out.sources[i][key]) return true;
    return false;
  };
  out.usesPosEnv = oscMoves('envAmount');
  out.usesLfo1 = oscMoves('lfoAmount');
  out.usesFilterEnv = out.filterEnvAmount !== 0;
  out.usesVibrato = out.vibrato.depth > 0;
  out.usesDrive = out.drive.amount > 0;
  // Whether anything the 16-frame grid applies — position, pitch, cutoff — can still be
  // moving after the note has started.
  out.gridMoves = out.usesPosEnv || out.usesLfo1 || out.usesFilterEnv || out.usesVibrato;
  return out;
}

var TNGR2_MAX_SOURCES = 8;

/** One oscillator of one note: a phase accumulator pointed at a family. */
function Tngr2Source() {
  this.phase = 0;
  this.inc = 0;
  this.baseInc = 0;
  this.family = null;
  this.lengths = null;
  this.strides = null;
  this.basePosition = 0;
  this.frameLow = 0;
  this.frameHigh = 0;
  this.frameMix = 0;
  this.mipLow = 0;
  this.mipHigh = 0;
  this.mipMix = 0;
  // The table arrays and frame bases selected by position/mip modulation. Refreshing
  // these on the 16-frame control grid removes family/stride lookups and two integer
  // multiplies from every oscillator sample without changing a single interpolation.
  this.dataLow = null;
  this.dataHigh = null;
  this.lengthLow = 0;
  this.lengthHigh = 0;
  this.baseLowA = 0;
  this.baseLowB = 0;
  this.baseHighA = 0;
  this.baseHighB = 0;
  this.gainL = 0;
  this.gainR = 0;
  this.envAmount = 0;
  this.lfoAmount = 0;
}

/**
 * The §6.2 read: linear inside a frame, linear across the adjacent frame PAIR, and a
 * crossfade between mip levels. Four reads, never the other thirty frames.
 */
Tngr2Source.prototype.read = function read() {
  if (!this.family) return 0;
  var x = this.phase * this.lengthLow;
  var i = x | 0;
  var frac = x - i;
  var data = this.dataLow;
  var a = this.baseLowA + i;
  var b = this.baseLowB + i;
  var low = data[a] + (data[a + 1] - data[a]) * frac;
  var high = data[b] + (data[b + 1] - data[b]) * frac;
  var raw = low + (high - low) * this.frameMix;
  // Crossfaded rather than switched: a glide across a level boundary must not step.
  if (this.mipMix > 0) {
    x = this.phase * this.lengthHigh;
    i = x | 0;
    frac = x - i;
    data = this.dataHigh;
    a = this.baseHighA + i;
    b = this.baseHighB + i;
    low = data[a] + (data[a + 1] - data[a]) * frac;
    high = data[b] + (data[b + 1] - data[b]) * frac;
    var upper = low + (high - low) * this.frameMix;
    raw += (upper - raw) * this.mipMix;
  }
  return raw;
};

Tngr2Source.prototype.refreshReadState = function refreshReadState() {
  if (!this.family || !this.lengths || !this.strides) return;
  var lowStride = this.strides[this.mipLow];
  var highStride = this.strides[this.mipHigh];
  this.dataLow = this.family[this.mipLow];
  this.dataHigh = this.family[this.mipHigh];
  this.lengthLow = this.lengths[this.mipLow];
  this.lengthHigh = this.lengths[this.mipHigh];
  this.baseLowA = this.frameLow * lowStride;
  this.baseLowB = this.frameHigh * lowStride;
  this.baseHighA = this.frameLow * highStride;
  this.baseHighB = this.frameHigh * highStride;
};

/** Point a source at the frame pair a position sits between. */
Tngr2Source.prototype.setPosition = function setPosition(position, span) {
  var p = position < 0 ? 0 : (position > 1 ? 1 : position);
  var framePos = p * span;
  var low = Math.floor(framePos);
  if (low >= span) low = span > 0 ? span - 1 : 0;
  this.frameLow = low;
  this.frameHigh = low + 1 <= span ? low + 1 : span;
  this.frameMix = framePos - low;
  this.refreshReadState();
};

/** Point a source at the mip pair its current pitch can afford. */
Tngr2Source.prototype.retune = function retune(rate, harmonics, levels) {
  var level = tngr2MipLevel(this.inc * rate, rate, harmonics, levels);
  this.mipLow = Math.floor(level);
  this.mipHigh = Math.min(levels - 1, this.mipLow + 1);
  this.mipMix = level - this.mipLow;
  this.refreshReadState();
};

/*
 * How often modulation is re-applied to the expensive destinations.
 *
 * Pitch needs a pow, the filter needs a tan, and a position change needs a floor and a
 * new frame pair — doing those every sample for eight sources across sixteen voices is
 * most of the CPU budget spent on resolution nobody can hear. They are recomputed every
 * 16 frames instead: 2.76 kHz at 44.1 kHz, which is far above the rate any of these
 * destinations moves at.
 *
 * The grid is aligned to the ABSOLUTE frame, not to the block, and that is the whole
 * reason this is safe: the frame mask is the same instant whether the host renders in
 * blocks of 128 or in one pass, so the parity tests still hold.
 *
 * LEVEL and AMP are deliberately NOT on the grid — they are a multiply, they cost
 * nothing, and stepping a gain at 2.76 kHz is audible as a buzz.
 */
var TNGR2_MOD_MASK = 15;

/**
 * One NOTE: up to eight oscillator sources under one amp envelope, two LFOs, a position
 * and filter envelope, and a stereo filter.
 *
 * Two oscillators times four unison members is the §7.2 maximum, and all eight are
 * allocated with the voice and reused — §7.4 forbids allocation in the steady-state loop,
 * and a chord arriving on the beat is exactly when a garbage collector is least welcome.
 */
function Tngr2Voice(rate) {
  this.rate = rate;
  this.env = new Tngr2Env(rate);
  this.posEnv = new Tngr2Env(rate);
  this.filterEnv = new Tngr2Env(rate);
  this.lfo1 = new Tngr2Lfo(rate);
  // The vibrato oscillator. Only ticked when a voice actually asks for depth.
  this.vib = new Tngr2Lfo(rate);
  // Up to four filter stages per channel. -12 dB/oct is one, -24 is two in series, -48
  // is four — the same way MRDR-3 builds a slope out of biquads in series. All
  // four exist for the life of the voice; the stage count says how many are in use.
  this.svfL = [new Tngr2Svf(), new Tngr2Svf(), new Tngr2Svf(), new Tngr2Svf()];
  this.svfR = [new Tngr2Svf(), new Tngr2Svf(), new Tngr2Svf(), new Tngr2Svf()];
  this.stages = 1;
  this.sources = [];
  for (var i = 0; i < TNGR2_MAX_SOURCES; i++) this.sources.push(new Tngr2Source());
  this.count = 0;
  this.active = false;
  this.eventId = -1;
  this.age = 0;
  this.hz = 0;
  this.level = 0;
  this.velocity = 1;
  // A MONO restrike's level, waiting for the sample the choke reaches silence. -1 is
  // "nothing waiting", which a velocity can never be.
  this.pendingLevel = -1;
  // ...and its PITCH, waiting for that same sample and for the same reason. See retarget.
  this.pitchDirty = false;
  this.keyTrack = 0;
  this.patch = null;
  this.gliding = false;
  this.glideStep = 1;
  this.glideLeft = 0;
  this.pitchMul = 1;
  // The drive tone filter's state. Declared HERE rather than at the first note-on that
  // needs it: a field that appears later changes the object's shape, and every voice in
  // the pool was paying that transition on its first note.
  this.toneL = 0;
  this.toneR = 0;
  this.toneCoeff = 0;
  // Position/filter envelopes become constant at sustain. These flags carry their last
  // change to the next control-grid frame, then let a held note stop recomputing the
  // exact same table positions and SVF coefficients thousands of times per second.
  this.posDirty = false;
  this.filterDirty = false;
  this.posLfoFrame = 0;
  this.vibFrame = 0;
  this.l = 0;
  this.r = 0;
  // Assigned by the core. Active voices stay in this slot order so summing remains
  // sample-identical while silent slots no longer cost a branch per sample.
  this.slot = -1;
  this.listed = false;
}

Tngr2Voice.prototype.start = function start(note, age, patch, tables, core, startFrame) {
  this.eventId = note.eventId;
  this.age = age;
  this.patch = patch;
  this.hz = Math.max(0, Number(note.hz) || 0);
  this.velocity = Math.min(1, Math.max(0, note.velocity != null ? Number(note.velocity) : 1));
  this.level = this.velocity;
  this.pendingLevel = -1;
  this.pitchDirty = false;
  // Key tracking, in octaves from middle C: what §7.4's filter keyTrack scales, and a
  // modulation source in its own right.
  this.keyTrack = Math.log2(Math.max(1e-6, this.hz) / 261.6255653005986);
  this.stages = patch.stages;
  for (var r = 0; r < 4; r++) { this.svfL[r].reset(); this.svfR[r].reset(); }
  this.toneL = 0;
  this.toneR = 0;
  this.toneCoeff = patch.drive.toneCoeff;
  this.gliding = false;
  this.glideStep = 1;
  this.glideLeft = 0;
  this.pitchMul = 1;
  this.posDirty = false;
  this.filterDirty = false;
  this.posLfoFrame = startFrame - 1;
  this.vibFrame = startFrame - 1;
  var specs = patch.sources;
  this.count = Math.min(TNGR2_MAX_SOURCES, specs.length);
  var span = tables ? tables.frames - 1 : 0;
  for (var s = 0; s < this.count; s++) {
    var spec = specs[s];
    var src = this.sources[s];
    src.baseInc = (this.hz * spec.ratio) / this.rate;
    src.inc = src.baseInc;
    src.gainL = spec.gainL * spec.level;
    src.gainR = spec.gainR * spec.level;
    src.envAmount = spec.envAmount;
    src.lfoAmount = spec.lfoAmount;
    src.basePosition = spec.position;
    src.family = core.familyFor(spec.table);
    src.lengths = tables ? tables.lengths : null;
    src.strides = tables ? tables.strides : null;
    if (tables) {
      src.setPosition(spec.position, span);
      src.retune(this.rate, tables.harmonics, tables.levels);
    }
    // ALWAYS SEEDED: a start phase drawn from the note's own identity, so a chord does not
    // comb-filter itself, two unison members never land on top of each other, and a stem
    // still matches the mix it came from. The other two modes were an expert choice with
    // one right answer — nothing in the bank ever picked either.
    src.phase = tngr2SeededPhase(note.eventId + patch.seed * 7919, s);
  }
  var seed = note.eventId + patch.seed * 31;
  this.lfo1.gate(patch.lfos[0], startFrame, seed);
  if (patch.usesVibrato) {
    this.vib.gate({
      shape: TNGR2_LFO_SINE, hz: patch.vibrato.hz, phase: 0,
      delaySamples: patch.vibrato.delaySamples, retrigger: true
    }, startFrame, seed + 977);
  }
  this.active = true;
  this.env.gate(patch.amp);
  this.posEnv.gate(patch.positionEnv);
  this.filterEnv.gate(patch.filterEnv);
  this.applyMod(0, tables, true);
};

/**
 * Take the patch the lane holds NOW.
 *
 * A voice binds to the patch it was born with, which is right for a note that is still
 * the note it started as. A MONO restrike is not: it is a new strike on a voice that
 * happens to be reused, and in MONO one voice can carry a whole part, so without this a
 * lane went on sounding like the patch that was loaded when its first note landed. Half
 * of it did move — retarget reads glide, source ratios and the envelopes off the current
 * patch — which is worse than neither, and it is why editing the panel over a playing
 * MONO lane only half worked. The liveness flags are the sharpest case: a position or
 * filter envelope switched on after the first note was gated and then never ticked,
 * because tick() asks the voice's own patch whether the patch uses one.
 *
 * Phase, filter and drive state are deliberately left alone: they are where the voice IS,
 * not what the patch says, and resetting them under a sounding note is a click. Only the
 * filter stages this patch newly brings into use are cleared, since those hold whatever
 * an earlier note left in them.
 */
Tngr2Voice.prototype.rebind = function rebind(patch, tables, core) {
  var was = this.stages;
  this.patch = patch;
  this.stages = patch.stages;
  this.toneCoeff = patch.drive.toneCoeff;
  for (var r = was; r < this.stages; r++) { this.svfL[r].reset(); this.svfR[r].reset(); }
  var specs = patch.sources;
  var span = tables ? tables.frames - 1 : 0;
  this.count = Math.min(TNGR2_MAX_SOURCES, specs.length);
  for (var s = 0; s < this.count; s++) {
    var spec = specs[s];
    var src = this.sources[s];
    src.gainL = spec.gainL * spec.level;
    src.gainR = spec.gainR * spec.level;
    src.envAmount = spec.envAmount;
    src.lfoAmount = spec.lfoAmount;
    src.basePosition = spec.position;
    src.family = core.familyFor(spec.table);
    src.lengths = tables ? tables.lengths : null;
    src.strides = tables ? tables.strides : null;
    if (tables) {
      src.setPosition(spec.position, span);
      src.retune(this.rate, tables.harmonics, tables.levels);
    }
  }
};

/**
 * Send a sounding voice to a new pitch.
 *
 * The regate flag is the whole difference between MONO and LEGATO: mono restarts the
 * envelopes on every new note, legato leaves them alone and only moves the pitch — §7.1.
 */
Tngr2Voice.prototype.retarget = function retarget(note, patch, regate, tables, core, fade) {
  var target = Math.max(1e-6, Number(note.hz) || 0);
  var from = Math.max(1e-6, this.hz);
  this.hz = target;
  this.keyTrack = Math.log2(target / 261.6255653005986);
  // Only when the lane has actually been given a different patch — which never happens
  // inside a render, so a bounce is sample-for-sample what it was.
  if (regate && this.patch !== patch) this.rebind(patch, tables, core);
  var samples = Math.round(patch.glide * this.rate);
  if (samples > 0 && Math.abs(Math.log2(target / from)) > 1e-9) {
    // One multiply per source per sample, which is an exponential — a glide that is
    // linear in PITCH rather than in hertz, so it sounds even across an octave.
    this.glideStep = Math.pow(target / from, 1 / samples);
    this.glideLeft = samples;
    this.gliding = true;
  } else {
    this.gliding = false;
    this.glideLeft = 0;
    for (var s = 0; s < this.count; s++) {
      this.sources[s].baseInc = (target * patch.sources[s].ratio) / this.rate;
    }
    // ...and it has to reach the oscillators THEMSELVES. baseInc is only the base; inc is
    // what a source actually reads, and applyPitch is the one thing that copies one to
    // the other. It runs on the grid for a GLIDE and for VIBRATO — and for neither of
    // those when a note is retargeted with glide at zero. Without this a MONO or LEGATO
    // lane with no glide never changed pitch at all: every note after the first played
    // the FIRST note's, for as long as the voice stayed active. It also re-picks the mip
    // level, which is the difference between the new pitch and the new pitch aliasing.
    this.pitchDirty = true;
  }
  if (regate) {
    // All three together, over the same fade, so they start the new note in step: an
    // amp that fell to zero while the filter envelope carried on sweeping would open the
    // strike into a filter already halfway through the last note's sweep.
    this.env.restrike(patch.amp, fade);
    this.posEnv.restrike(patch.positionEnv, fade);
    this.filterEnv.restrike(patch.filterEnv, fade);
    this.posDirty = patch.usesPosEnv;
    this.filterDirty = patch.usesFilterEnv;
    // The strike belongs to the new note, so it is struck at the new note's velocity —
    // but a gain swapped under a sounding envelope is a click, so it waits for the sample
    // the choke reaches silence. See tick(). Nothing to cover means nothing to wait for.
    this.velocity = Math.min(1, Math.max(0,
      note.velocity != null ? Number(note.velocity) : 1));
    if (this.env.stage === TNGR2_STAGE_RESTRIKE) this.pendingLevel = this.velocity;
    else { this.level = this.velocity; this.pendingLevel = -1; }
  }
  // WHEN the new pitch lands. LEGATO takes it at once — moving the pitch IS the note
  // change, and there is nothing else happening for it to interrupt. A MONO restrike
  // waits for the same sample the new LEVEL waits for: the one where the choke reaches
  // silence. Changing pitch inside the fall would chirp the note being replaced on its
  // way out, which is a sound in the middle of the choke that is there to have none.
  this.settlePitch(tables);
};

/**
 * Put a pending pitch on the oscillators, unless a choke is still running.
 *
 * Asked at the retarget and again on every tick, because whichever of the two the choke
 * ends on is the one that must land it — a strike at the old pitch is the failure this
 * exists to prevent, and so is a pitch that never arrives at all.
 */
Tngr2Voice.prototype.settlePitch = function settlePitch(tables) {
  if (!this.pitchDirty || this.env.stage === TNGR2_STAGE_RESTRIKE) return;
  this.applyPitch(tables);
  this.pitchDirty = false;
};

/**
 * Re-apply the expensive modulation destinations. Called on the 16-frame grid.
 *
 * Destination accumulation order, per §7.3: every enabled slot for a destination is
 * SUMMED first, and the total is then applied once to the base value the patch stored.
 * Summing means two slots pointed at one destination cooperate rather than the second
 * overwriting the first, and applying to the base means the modulation is never
 * compounded with its own previous output.
 */
Tngr2Voice.prototype.applyPitch = function applyPitch(tables) {
  var patch = this.patch;
  // PITCH, in semitones — vibrato only. One pow for the voice rather than one per source.
  var pitch = patch.usesVibrato ? this.vib.value * patch.vibrato.depth : 0;
  this.pitchMul = pitch !== 0 ? Math.pow(2, pitch / 12) : 1;
  for (var s = 0; s < this.count; s++) {
    var src = this.sources[s];
    src.inc = src.baseInc * this.pitchMul;
    if (tables) src.retune(this.rate, tables.harmonics, tables.levels);
  }
};

Tngr2Voice.prototype.applyPosition = function applyPosition(tables) {
  if (!tables) return;
  var span = tables.frames - 1;
  for (var s = 0; s < this.count; s++) {
    var src = this.sources[s];
    // The per-oscillator ENV MOVE and LFO MOVE amounts are what make this a wavetable
    // synth rather than a synth with a wavetable in it: each oscillator can be moved
    // through its family by a different amount from the same envelope and LFO.
    var position = src.basePosition
      + src.envAmount * this.posEnv.value
      + src.lfoAmount * this.lfo1.value;
    src.setPosition(position, span);
  }
};

Tngr2Voice.prototype.applyFilter = function applyFilter() {
  var patch = this.patch;
  // The FILTER: base cutoff, key tracking, its bipolar envelope in octaves, and whatever
  // the matrix adds — all in octaves, so they compose by addition.
  var octaves = patch.keyTrack * this.keyTrack
    + patch.filterEnvAmount * this.filterEnv.value;
  var cutoff = patch.cutoff * Math.pow(2, octaves);
  if (cutoff < 20) cutoff = 20;
  var nyquist = this.rate * 0.49;
  if (cutoff > nyquist) cutoff = nyquist;
  var q = patch.resonance;
  if (q < 0.1) q = 0.1;
  if (q > 24) q = 24;
  var g = Math.tan(Math.PI * cutoff / this.rate);
  for (var st = 0; st < this.stages; st++) {
    // RESONANCE belongs to the FIRST stage alone. The ones behind it carry the slope at a
    // flat Q — resonating every stage would multiply the peak into a whistle, which is
    // the rule MRDR-3 builds its cascades by.
    var k = st === 0 ? 1 / q : 1.4142135623730951;
    var a1 = 1 / (1 + g * (g + k));
    var a2 = g * a1;
    var a3 = g * a2;
    this.svfL[st].setCoeffs(a1, a2, a3, k, patch.filterMode);
    this.svfR[st].setCoeffs(a1, a2, a3, k, patch.filterMode);
  }
};

/** Apply every destination once at note-on, before later updates split by liveness. */
Tngr2Voice.prototype.applyMod = function applyMod(frame, tables, force) {
  this.applyPitch(tables);
  this.applyPosition(tables);
  this.applyFilter();
  void frame;
  void force;
};

Tngr2Voice.prototype.tick = function tick(frame, tables) {
  var amp = this.env.tick();
  if (this.env.done()) { this.active = false; this.l = 0; this.r = 0; return; }
  if (this.pendingLevel >= 0 && this.env.stage !== TNGR2_STAGE_RESTRIKE) {
    this.level = this.pendingLevel;
    this.pendingLevel = -1;
  }
  if (this.pitchDirty) this.settlePitch(tables);
  var patch = this.patch;
  var s;
  var src;
  // Only what this patch actually moves — see the liveness flags in tngr2CompilePatch.
  // An ADSR in sustain returns the same number forever. Unlike the amplitude envelope,
  // these two only feed control-rate destinations, so once their last change has landed
  // on the grid there is no work to do until note-off moves them into release.
  if (patch.usesPosEnv && this.posEnv.stage !== TNGR2_STAGE_SUSTAIN
      && this.posEnv.stage !== TNGR2_STAGE_OFF) {
    this.posEnv.tick();
    this.posDirty = true;
  }
  if (patch.usesFilterEnv && this.filterEnv.stage !== TNGR2_STAGE_SUSTAIN
      && this.filterEnv.stage !== TNGR2_STAGE_OFF) {
    this.filterEnv.tick();
    this.filterDirty = true;
  }
  var onGrid = patch.gridMoves && (frame & TNGR2_MOD_MASK) === 0;
  if (patch.usesLfo1 && onGrid) {
    this.lfo1.advance(frame - this.posLfoFrame);
    this.posLfoFrame = frame;
  }
  if (patch.usesVibrato && (onGrid || this.gliding)) {
    this.vib.advance(frame - this.vibFrame);
    this.vibFrame = frame;
  }
  if (this.gliding) {
    for (s = 0; s < this.count; s++) this.sources[s].baseInc *= this.glideStep;
    if (--this.glideLeft <= 0) this.gliding = false;
  }
  // The expensive destinations, on the absolute frame grid — see TNGR2_MOD_MASK. A patch
  // with nothing moving had them settled at note-on and cannot have changed since, so it
  // never comes back here at all.
  if (this.gliding || (onGrid && patch.usesVibrato)) this.applyPitch(tables);
  if (onGrid && (this.posDirty || patch.usesLfo1)) {
    this.applyPosition(tables);
    this.posDirty = false;
  }
  if (onGrid && this.filterDirty) {
    this.applyFilter();
    this.filterDirty = false;
  }
  var l = 0;
  var r = 0;
  // Tngr2Source.read, inlined. It is the same arithmetic in the same order — see the
  // method, which is kept beside it as the readable statement of what this is — but it
  // runs up to eight times per voice per sample, and at that rate the property loads and
  // the call itself are a measurable share of the whole engine.
  var sources = this.sources;
  var count = this.count;
  for (s = 0; s < count; s++) {
    src = sources[s];
    var raw;
    if (!src.family) raw = 0;
    else {
      var rphase = src.phase;
      var rframeMix = src.frameMix;
      var rx = rphase * src.lengthLow;
      var ri = rx | 0;
      var rfrac = rx - ri;
      var rdata = src.dataLow;
      var ra = src.baseLowA + ri;
      var rb = src.baseLowB + ri;
      var rlow = rdata[ra] + (rdata[ra + 1] - rdata[ra]) * rfrac;
      var rhigh = rdata[rb] + (rdata[rb + 1] - rdata[rb]) * rfrac;
      raw = rlow + (rhigh - rlow) * rframeMix;
      // Crossfaded rather than switched: a glide across a level boundary must not step.
      var rmip = src.mipMix;
      if (rmip > 0) {
        rx = rphase * src.lengthHigh;
        ri = rx | 0;
        rfrac = rx - ri;
        rdata = src.dataHigh;
        ra = src.baseHighA + ri;
        rb = src.baseHighB + ri;
        rlow = rdata[ra] + (rdata[ra + 1] - rdata[ra]) * rfrac;
        rhigh = rdata[rb] + (rdata[rb + 1] - rdata[rb]) * rfrac;
        var rupper = rlow + (rhigh - rlow) * rframeMix;
        raw += (rupper - raw) * rmip;
      }
    }
    var nextPhase = src.phase + src.inc;
    if (nextPhase >= 1) nextPhase -= 1;
    src.phase = nextPhase;
    l += raw * src.gainL;
    r += raw * src.gainR;
  }
  // LEVEL and AMP are per-sample multiplies: no grid, because stepping a gain buzzes.
  // PRE puts the shaper in front of the filter, so the filter tames what it made; POST
  // drives the filtered signal, which is the brighter, more obvious one of the two.
  var drive = patch.drive;
  if (patch.usesDrive && drive.pre) {
    l = tngr2Shape(l, drive.amount, drive.shape, drive.steps);
    r = tngr2Shape(r, drive.amount, drive.shape, drive.steps);
    this.toneL += this.toneCoeff * (l - this.toneL); l = this.toneL;
    this.toneR += this.toneCoeff * (r - this.toneR); r = this.toneR;
  }
  for (s = 0; s < this.stages; s++) {
    l = this.svfL[s].tick(l);
    r = this.svfR[s].tick(r);
  }
  if (patch.usesDrive && !drive.pre) {
    l = tngr2Shape(l, drive.amount, drive.shape, drive.steps);
    r = tngr2Shape(r, drive.amount, drive.shape, drive.steps);
    this.toneL += this.toneCoeff * (l - this.toneL); l = this.toneL;
    this.toneR += this.toneCoeff * (r - this.toneR); r = this.toneR;
  }
  var gain = amp * this.level;
  this.l = l * gain;
  this.r = r * gain;
};

/**
 * The lane engine: a frame-stamped event queue in front of a fixed pool of voices.
 *
 * One of these per lane and per context. It owns nothing about the browser, so the
 * worklet and the offline renderer drive it identically — which is the point.
 */
function Tngr2Core(options) {
  var opts = options || {};
  this.rate = opts.sampleRate || 44100;
  this.maxVoices = opts.maxVoices || 16;
  this.voices = [];
  for (var i = 0; i < this.maxVoices; i++) {
    var voice = new Tngr2Voice(this.rate);
    voice.slot = i;
    this.voices.push(voice);
  }
  // Fixed storage, kept in pool-slot order. This preserves the old floating-point sum
  // order exactly but avoids scanning all slots for every sample of a quiet lane.
  this.live = new Array(this.maxVoices);
  this.liveCount = 0;
  this.pending = [];
  this.pendingHead = 0;
  this.age = 0;
  this.late = 0;
  this.worstLate = 0;
  this.steals = 0;
  // How long a stolen voice is given to get out of the way. §7.1 asks for 3-5 ms.
  this.stealFade = 0.004;
  // Installed once per context by the host — never built here. See packTngr2Tables.
  this.tables = null;
  this.badTable = 0;
  this.missingTables = 0;
  this.nonFinite = 0;
  this.patch = tngr2CompilePatch(null);
  this.compileLfoDelays();
  // Which voice a mono or legato lane is currently speaking through.
  this.lastVoice = null;
}

/** LFO delay is in seconds on the patch and in samples in the LFO — resolved per rate. */
Tngr2Core.prototype.compileLfoDelays = function compileLfoDelays() {
  for (var i = 0; i < this.patch.lfos.length; i++) {
    this.patch.lfos[i].delaySamples = Math.round(this.patch.lfos[i].delay * this.rate);
  }
  this.patch.vibrato.delaySamples = Math.round(this.patch.vibrato.delay * this.rate);
  this.patch.drive.toneCoeff = 1 - Math.exp(-2 * Math.PI
    * Math.min(this.rate * 0.45, this.patch.drive.tone) / this.rate);
};

/**
 * Install the wavetable assets. Once per context, before anything is played.
 *
 * The core never builds a table: expansion is milliseconds of work and this may be the
 * audio thread. It only ever receives finished ones.
 */
Tngr2Core.prototype.installTables = function installTables(tables) {
  this.tables = tables && tables.families && tables.families.length ? tables : null;
};

/** Install a patch, compiled once. Notes bind to whatever is current at note-on. */
Tngr2Core.prototype.installPatch = function installPatch(patch) {
  this.installCompiledPatch(tngr2CompilePatch(patch));
};

/** Install an already-compiled patch without doing object/array work on the audio thread. */
Tngr2Core.prototype.installCompiledPatch = function installCompiledPatch(patch) {
  this.patch = patch || tngr2CompilePatch(null);
  this.compileLfoDelays();
};

/**
 * The packed levels for a family id, or basic when the id is not one we have.
 *
 * §8: an unknown table falls back to basic and is counted, and must never poison the
 * audio with NaN. Resolved at note-on, so the steady-state loop holds an array reference
 * and does no string lookup at all — §7.4's rule about the inner loop.
 */
Tngr2Core.prototype.familyFor = function familyFor(id) {
  if (!this.tables) { this.missingTables++; return null; }
  var at = this.tables.index[id];
  if (at === undefined) {
    this.badTable++;
    at = this.tables.index.basic;
  }
  return at === undefined ? null : this.tables.families[at];
};

/*
 * One queued event, always the same five fields in the same order.
 *
 * The copy exists because the caller's object came over a port and may be reused; the
 * FIXED SHAPE exists because a for-in copy built a differently-shaped object for every
 * message that happened to carry a different key, and those objects are then read on the
 * audio thread, sample by sample, at the moment a chord lands.
 *
 * releaseAtStart is set by a note-off that arrived in FRONT of this note-on rather than
 * behind it — see markEarlyOff. It is the only field written after the copy is made.
 *
 * This is the whole list of fields the core reads — see apply() and Tngr2Voice.start.
 * transportGeneration rides along unread, because the controller stamps it and a reader
 * added later should find it here rather than silently getting undefined. Anything NEW an
 * event needs to carry has to be added here too, or it will not survive the queue.
 */
function tngr2QueuedEvent(event, frame) {
  return {
    type: event.type,
    frame: frame,
    hz: event.hz,
    velocity: event.velocity,
    eventId: event.eventId,
    transportGeneration: event.transportGeneration,
    regate: event.regate,
    releaseAtStart: false
  };
}

// How far ahead markEarlyOff looks. Only the LIVE path can deliver a note-off in front of
// its note-on, and it holds a lookahead of events rather than a song — where an offline
// schedule holds tens of thousands and this runs on the audio thread.
var TNGR2_EARLY_OFF_SCAN = 64;

/** Queue one event, keeping the queue sorted by frame rather than by arrival. */
Tngr2Core.prototype.schedule = function schedule(event) {
  // Reclaim consumed live-event storage away from the per-sample loop. Most batches empty
  // completely; rolling schedules compact only when dead entries dominate the array.
  if (this.pendingHead === this.pending.length) {
    this.pending.length = 0;
    this.pendingHead = 0;
  } else if (this.pendingHead > 64 && this.pendingHead * 2 > this.pending.length) {
    this.pending.splice(0, this.pendingHead);
    this.pendingHead = 0;
  }
  var frame = Math.max(0, Math.round(event.frame || 0));
  var at = this.pending.length;
  while (at > this.pendingHead && this.pending[at - 1].frame > frame) at--;
  this.pending.splice(at, 0, tngr2QueuedEvent(event, frame));
};

Tngr2Core.prototype.scheduleAll = function scheduleAll(events) {
  // Offline schedules can contain a whole song. Clone once and use the engine's stable
  // sort instead of insertion-sorting the batch on the audio thread.
  if (this.pendingHead > 0) {
    this.pending.splice(0, this.pendingHead);
    this.pendingHead = 0;
  }
  for (var i = 0; i < events.length; i++) {
    var event = events[i];
    this.pending.push(tngr2QueuedEvent(event, Math.max(0, Math.round(event.frame || 0))));
  }
  this.pending.sort(function (a, b) { return a.frame - b.frame; });
};

/** Add a newly sounding pool voice without changing the historical slot sum order. */
Tngr2Core.prototype.markLive = function markLive(voice) {
  if (voice.listed) return;
  var at = this.liveCount;
  while (at > 0 && this.live[at - 1].slot > voice.slot) {
    this.live[at] = this.live[at - 1];
    at--;
  }
  this.live[at] = voice;
  this.liveCount++;
  voice.listed = true;
};

Tngr2Core.prototype.removeLive = function removeLive(at) {
  var voice = this.live[at];
  voice.listed = false;
  this.liveCount--;
  for (var i = at; i < this.liveCount; i++) this.live[i] = this.live[i + 1];
  this.live[this.liveCount] = null;
};

/** Let a voice go: all three envelopes together, which is what a note-off means. */
Tngr2Core.prototype.releaseVoice = function releaseVoice(voice) {
  voice.env.release();
  voice.posEnv.release();
  voice.filterEnv.release();
};

/**
 * A note-off that arrived in front of the note it ends.
 *
 * The desk schedules a previewed note AHEAD — previewNote stamps it at currentTime plus
 * 20ms — and a key held for less than that sends its note-off first. Applied as it stands
 * that note-off finds nothing to release, and the note-on behind it then sounds for ever:
 * the one failure a synth may not have. So the note-on is marked instead, and starts and
 * ends on its own frame.
 *
 * The desk no longer sends them — a held preview carries its note-on's lead across to the
 * release, see _releasePreview — and this stays because a hung note is not something to
 * leave resting on one caller getting its arithmetic right.
 *
 * A note-off matching nothing queued is left alone: that is the ORDINARY case in MONO,
 * where a restrike takes the previous note's identity with it, and nothing is waiting.
 */
Tngr2Core.prototype.markEarlyOff = function markEarlyOff(eventId) {
  var pending = this.pending;
  var limit = Math.min(pending.length, this.pendingHead + TNGR2_EARLY_OFF_SCAN);
  for (var i = this.pendingHead; i < limit; i++) {
    var queued = pending[i];
    if (queued.eventId === eventId && queued.type === 'noteOn') {
      queued.releaseAtStart = true;
      return;
    }
  }
};

/**
 * The voice a note-off is for: one carrying this identity that has not been let go yet.
 *
 * The RELEASE test is what stops a drone. Two notes on a lane can share an event id — the
 * desk builds one out of the note's time and pitch, so a part that plays the same note
 * twice at once has two, and even distinct notes can collide — and a voice stays active
 * through its whole release. Without the test, both note-offs found the FIRST of the two
 * and released it twice, and the second voice was never let go at all: it sat at its
 * sustain for the rest of the session. Skipping the ones already released hands the
 * second note-off the second voice, which is the one still waiting for it.
 *
 * Releasing a releasing voice was never right anyway — release() restarts the fall from
 * where it stands, so a repeated note-off lengthened the tail it was asking to end.
 */
Tngr2Core.prototype.findVoice = function findVoice(eventId) {
  for (var i = 0; i < this.voices.length; i++) {
    var voice = this.voices[i];
    if (voice.active && voice.eventId === eventId
        && voice.env.stage !== TNGR2_STAGE_RELEASE) return voice;
  }
  return null;
};

/**
 * Which voice a new note takes.
 *
 * §7.1's order: a free slot, then the quietest RELEASING voice — the one already on its
 * way out and least likely to be missed — and only then the oldest sounding voice.
 */
Tngr2Core.prototype.take = function take() {
  var i;
  for (i = 0; i < this.voices.length; i++) if (!this.voices[i].active) return this.voices[i];
  var quietest = null;
  for (i = 0; i < this.voices.length; i++) {
    var v = this.voices[i];
    if (v.env.stage !== TNGR2_STAGE_RELEASE) continue;
    if (!quietest || v.env.value < quietest.env.value) quietest = v;
  }
  if (quietest) { this.steals++; return quietest; }
  var oldest = this.voices[0];
  for (i = 1; i < this.voices.length; i++) if (this.voices[i].age < oldest.age) oldest = this.voices[i];
  this.steals++;
  return oldest;
};

Tngr2Core.prototype.apply = function apply(event, frame) {
  var patch = this.patch;
  var i;
  if (event.type === 'noteOn') {
    var mode = patch.mode;
    var held = this.lastVoice;
    var sounding = held && held.active;
    if (mode !== 'poly' && sounding) {
      // MONO re-gates the envelopes, LEGATO does not — the note is taken over rather than
      // struck again, which is the whole of the difference (§7.1).
      //
      // regate:false overrides that, in the one case where the mode is not the question:
      // a KEY COMING UP handing the note back to another key that is still down. Letting
      // go never starts a note, so the pitch moves and the envelopes stay where they are
      // whichever mode the lane is in. See _releasePreview in voices.js.
      var regate = event.regate === false ? false : mode === 'mono';
      held.retarget(event, patch, regate, this.tables, this, this.stealFade);
      held.eventId = event.eventId;
      held.age = ++this.age;
      if (event.releaseAtStart) this.releaseVoice(held);
      return;
    }
    var voice = this.take();
    voice.start(event, ++this.age, patch, this.tables, this, frame);
    this.markLive(voice);
    if (mode !== 'poly') this.lastVoice = voice;
    // The key was already up before this note was due — see markEarlyOff.
    if (event.releaseAtStart) this.releaseVoice(voice);
  } else if (event.type === 'noteOff') {
    var target = this.findVoice(event.eventId);
    if (target) this.releaseVoice(target);
    else this.markEarlyOff(event.eventId);
  } else if (event.type === 'panic') {
    for (i = 0; i < this.voices.length; i++) {
      if (this.voices[i].active) this.voices[i].env.choke(this.stealFade);
    }
    this.lastVoice = null;
    // Everything booked goes too: a panic that left the queue would play the rest of the
    // bar into the silence it was called to make.
    this.pending.length = 0;
    this.pendingHead = 0;
  }
};

/**
 * Render count frames into channels, starting at absolute frame startFrame.
 *
 * Events are applied at the sample they are stamped with, not at the top of the block.
 * That is what makes a render independent of block size — the worklet's 128 and the
 * reference renderer's whole-buffer call produce the same samples, which is the parity
 * the tests assert.
 */
Tngr2Core.prototype.process = function process(channels, startFrame, count, offset) {
  var out = offset || 0;
  var left = channels[0];
  var right = channels.length > 1 ? channels[1] : null;
  var tables = this.tables;
  var endFrame = startFrame + count;
  // Persistent lane nodes spend much of a song between notes. Clear a whole worklet
  // quantum natively instead of running 128 JS frames through an empty voice pool.
  if (this.liveCount === 0
      && (this.pendingHead >= this.pending.length || this.pending[this.pendingHead].frame >= endFrame)) {
    left.fill(0, out, out + count);
    if (right) right.fill(0, out, out + count);
    return;
  }
  // When the next event lands, held as a number. Reaching for it through the queue on
  // every sample was three property loads and two compares to be told "not yet" tens of
  // thousands of times a second; the answer only moves when an event actually fires.
  var pending = this.pending;
  var nextEventFrame = this.pendingHead < pending.length
    ? pending[this.pendingHead].frame : Infinity;
  for (var i = 0; i < count; i++) {
    var frame = startFrame + i;
    // Whether anything happened that could make the rest of this block silent. Only an
    // event or a voice dropping out can, so the idle test below is asked on those samples
    // instead of on all of them.
    var changed = false;
    if (frame >= nextEventFrame) {
      while (this.pendingHead < pending.length && pending[this.pendingHead].frame <= frame) {
        var event = pending[this.pendingHead++];
        if (event.frame < startFrame) {
          this.late++;
          var lateBy = startFrame - event.frame;
          if (lateBy > this.worstLate) this.worstLate = lateBy;
        }
        this.apply(event, frame);
      }
      // Applying an event can replace the queue outright — a panic clears it — so the
      // cursor and the array are both re-read here rather than carried across.
      pending = this.pending;
      nextEventFrame = this.pendingHead < pending.length
        ? pending[this.pendingHead].frame : Infinity;
      changed = true;
    }
    var l = 0;
    var r = 0;
    for (var v = 0; v < this.liveCount;) {
      var voice = this.live[v];
      voice.tick(frame, tables);
      if (!voice.active) { this.removeLive(v); changed = true; continue; }
      l += voice.l;
      r += voice.r;
      v++;
    }
    // The last guard before the buffer. Nothing upstream should be able to produce a
    // non-finite sample, and §7.4 says a bad one must never reach the output — so it is
    // counted and replaced rather than written.
    if (!(l === l)) { l = 0; this.nonFinite++; }
    if (!(r === r)) { r = 0; this.nonFinite++; }
    left[out + i] = l;
    if (right) right[out + i] = r;
    if (changed && this.liveCount === 0 && nextEventFrame >= endFrame) {
      left.fill(0, out + i + 1, out + count);
      if (right) right.fill(0, out + i + 1, out + count);
      return;
    }
  }
};

Tngr2Core.prototype.activeVoices = function activeVoices() {
  return this.liveCount;
};

Tngr2Core.prototype.sourceStreams = function sourceStreams() {
  var n = 0;
  for (var i = 0; i < this.liveCount; i++) n += this.live[i].count;
  return n;
};

Tngr2Core.prototype.health = function health(frame) {
  return {
    frame: frame,
    voices: this.activeVoices(),
    streams: this.sourceStreams(),
    queued: this.pending.length - this.pendingHead,
    late: this.late,
    worstLate: this.worstLate,
    steals: this.steals,
    badTable: this.badTable,
    missingTables: this.missingTables,
    nonFinite: this.nonFinite,
    tables: this.tables ? this.tables.families.length : 0
  };
};

`;

// Evaluated once, for Node — tests, tools and the reference renderer below. The browser
// never takes this path; it gets the same text through the worklet.
const evaluated = new Function(`${TNGR2_DSP_SOURCE}
return { Tngr2Core, Tngr2Voice, Tngr2Env, tngr2SeededPhase, tngr2CompilePatch };`)();

export const {
  Tngr2Core, Tngr2Voice, Tngr2Env, tngr2SeededPhase,
  tngr2CompilePatch: compileTngr2Patch,
} = evaluated;

/**
 * Audio time to the integer frame the core counts in.
 *
 * At the controller boundary, once. A note time left as a float until it reached the DSP
 * would be rounded there instead, and the same event would land on different samples in
 * two renders of one song.
 */
export const frameAt = (seconds, sampleRate) => Math.max(0, Math.round(seconds * sampleRate));

export const TNGR2_DEFAULT_ENV = Object.freeze({
  attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.3,
});

/**
 * The deterministic reference render: the same core, in plain JS, with no browser.
 *
 * This is what makes "live and offline share the maths" a testable claim rather than an
 * intention — tests/tngr2-dsp-parity.js renders the same events through the worklet and
 * through this, and requires the two to agree. It is also the fast path for everything
 * that wants to inspect TNGR-2's output without launching Chromium.
 *
 * `blockSize` exists to be varied: rendering the same events at 128 and at 1024 must
 * produce identical samples, or something is reading the block boundary as if it were a
 * time. The tests vary it for exactly that reason.
 */
export function renderTngr2({
  events = [], seconds = 1, sampleRate = 44100, channels = 2, blockSize = 128, maxVoices = 16,
  tables = null, patch = null, frameOffset = 0,
} = {}) {
  const frames = Math.max(0, Math.ceil(seconds * sampleRate));
  const out = [];
  for (let c = 0; c < channels; c++) out.push(new Float32Array(frames));
  const core = new Tngr2Core({ sampleRate, maxVoices });
  // Tables are handed in rather than imported, so this module stays free of the asset
  // layer and a caller can render against a stripped-down catalogue in a test.
  if (tables) core.installTables(tables);
  if (patch) core.installPatch(patch);
  core.scheduleAll(events);
  const size = Math.max(1, blockSize | 0);
  // The frame offset puts this render at its place on the transport — see the note in
  // worklet.js. Events carry absolute frames either way.
  const base = Math.max(0, Math.round(frameOffset));
  for (let start = 0; start < frames; start += size) {
    core.process(out, base + start, Math.min(size, frames - start), start);
  }
  return { channels: out, sampleRate, frames, health: core.health(frames) };
}
