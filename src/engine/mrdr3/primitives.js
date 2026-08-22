/*
 * The Tier-A ports: Web Audio nodes whose behaviour the specification defines, rewritten
 * as per-sample code. docs/MRDR-3-worklet-spec.md §3.1.
 *
 * These are not approximations of the native nodes and they are not new DSP. The Web
 * Audio API specifies the biquad transfer function and its coefficient formulae, the
 * WaveShaper's index map and interpolation, and the StereoPanner's equal-power law — so
 * the port has a formula-level reference rather than a listening description, and
 * `tests/mrdr3-primitives.js` holds each one to a MEASURED tolerance against the real
 * node rather than to an assumed one.
 *
 * "Specified" is not "bit-identical to Chromium": a conforming implementation may use a
 * different but equivalent filter form, a different coefficient precision, or a different
 * state update order. The bar is recorded, not assumed. What must be exact is the
 * worklet against the Node reference renderer, because those two run this same string.
 *
 * ---- the one that bites ----------------------------------------------------------
 *
 * `BiquadFilterNode.Q` IS IN DECIBELS for lowpass and highpass, and LINEAR for bandpass
 * and notch. That is in the specification and it is easy to miss — the Phase 0 spike
 * missed it, and used a linear Q for lowpass throughout
 * (work/local/mrdr3-spike-dsp.js). A resonant lowpass at Q=5 built the linear way is a
 * different filter from the one the engine has been playing for the whole life of this
 * library: 5 dB against 5. Nothing about that reads as wrong in isolation, which is
 * exactly why it needs a test rather than a careful author.
 */

export const MRDR3_PRIMITIVES_SOURCE = `
// ---- BiquadFilterNode ------------------------------------------------------------
//
// The Audio EQ Cookbook forms the spec names, in direct form 1, one state set per
// channel. Coefficients are normalised by a0, as the spec does, so the difference
// equation needs no divide per sample.
var MRDR3_LOWPASS = 0, MRDR3_HIGHPASS = 1, MRDR3_BANDPASS = 2, MRDR3_NOTCH = 3;

var MRDR3_FILTER_KINDS = {
  lowpass: MRDR3_LOWPASS, highpass: MRDR3_HIGHPASS,
  bandpass: MRDR3_BANDPASS, notch: MRDR3_NOTCH,
};

function Mrdr3Biquad(rate) {
  this.rate = rate;
  this.kind = MRDR3_LOWPASS;
  // The last corner these coefficients were built for. NaN so the first build always runs.
  this.lastFreq = NaN;
  this.lastQ = NaN;
  this.b0 = 1; this.b1 = 0; this.b2 = 0; this.a1 = 0; this.a2 = 0;
  // Two channels' worth of history. A BiquadFilterNode handed a stereo signal runs the
  // same coefficients over independent state per channel, which is what makes it one
  // node rather than two — and what lets MRDR-3 put one filter after a stereo panner.
  //
  // FLAT SCALARS, not two-element arrays. The difference equation touches eight of these
  // per sample, and this is the innermost line in the whole synth — a typed array costs a
  // bounds check and an indirection through a separate heap object on each one, where a
  // plain double field is an unboxed slot in this object. Same numbers, same order.
  this.x1L = 0; this.x2L = 0; this.y1L = 0; this.y2L = 0;
  this.x1R = 0; this.x2R = 0; this.y1R = 0; this.y2R = 0;
}

/** Reset to the zero initial state a freshly built node has. */
Mrdr3Biquad.prototype.reset = function () {
  this.lastFreq = NaN;
  this.lastQ = NaN;
  this.x1L = 0; this.x2L = 0; this.y1L = 0; this.y2L = 0;
  this.x1R = 0; this.x2R = 0; this.y1R = 0; this.y2R = 0;
};

/**
 * Build coefficients for a corner and a Q.
 *
 * \`freq\` is the COMPUTED frequency — frequency x 2^(detune/1200) — because that is the
 * value the node filters at and the one a caller has already had to work out to modulate.
 */
Mrdr3Biquad.prototype.setCoeffs = function (freq, Q) {
  // An UNMODULATED filter asks for the same corner every sample — no envelope, no LFO,
  // just key follow, which is fixed for the note. Rebuilding identical coefficients is
  // pure waste, and skipping it is EXACT rather than approximate: same inputs, same
  // coefficients, so the difference equation sees no change at all.
  if (freq === this.lastFreq && Q === this.lastQ) return;
  this.lastFreq = freq;
  this.lastQ = Q;
  var nyquist = this.rate * 0.5;
  var f0 = freq / nyquist;              // normalised, as the spec states the formulae
  if (f0 < 0) f0 = 0; else if (f0 > 1) f0 = 1;
  var kind = this.kind;

  // The degenerate corners the spec calls out. At or past Nyquist a lowpass passes
  // everything and a highpass passes nothing; at zero the two swap. Handled explicitly
  // because the trigonometric form divides by zero there.
  if (f0 <= 0 || f0 >= 1) {
    var pass = (kind === MRDR3_LOWPASS && f0 >= 1) || (kind === MRDR3_HIGHPASS && f0 <= 0)
      || kind === MRDR3_NOTCH;
    this.b0 = pass ? 1 : 0; this.b1 = 0; this.b2 = 0; this.a1 = 0; this.a2 = 0;
    return;
  }

  var w0 = Math.PI * f0;
  var cw = Math.cos(w0);
  var sw = Math.sin(w0);
  var alpha;
  if (kind === MRDR3_LOWPASS || kind === MRDR3_HIGHPASS) {
    // Q IN DECIBELS. See the note at the top of this file — this is the line that makes
    // a resonant lowpass the filter the library was written against.
    //
    // The conversion is CACHED, and that is not a micro-optimisation: a filter under an
    // LFO rebuilds its coefficients every sample, and Q is the one input that has not
    // moved — it is fixed for the life of a note. Recomputing 10^(Q/20) per sample per
    // section per chord tone was pure waste, and skipping it is exact: same Q, same
    // number, so the coefficients below are bit-identical.
    if (Q !== this.lastQdb) { this.lastQdb = Q; this.qLinear = Math.pow(10, Q / 20); }
    alpha = sw / (2 * this.qLinear);
  } else {
    // Linear Q for bandpass and notch, and a floor so a Q of zero cannot divide by it.
    alpha = sw / (2 * (Q > 1e-6 ? Q : 1e-6));
  }
  var b0, b1, b2;
  var a0 = 1 + alpha;
  var a1 = -2 * cw;
  var a2 = 1 - alpha;
  if (kind === MRDR3_LOWPASS) {
    b0 = (1 - cw) * 0.5; b1 = 1 - cw; b2 = b0;
  } else if (kind === MRDR3_HIGHPASS) {
    b0 = (1 + cw) * 0.5; b1 = -(1 + cw); b2 = b0;
  } else if (kind === MRDR3_BANDPASS) {
    b0 = alpha; b1 = 0; b2 = -alpha;
  } else {
    b0 = 1; b1 = -2 * cw; b2 = 1;
  }
  var inv = 1 / a0;
  this.b0 = b0 * inv; this.b1 = b1 * inv; this.b2 = b2 * inv;
  this.a1 = a1 * inv; this.a2 = a2 * inv;
};

/*
 * One sample, one channel. Direct form 1, as the spec's difference equation states it.
 *
 * One method per channel rather than one taking an index: every caller knows which
 * channel it is on at the point it writes the line, so the index was a constant being
 * carried through a variable. The two bodies are the same equation over the same
 * coefficients — only the state fields differ.
 */
Mrdr3Biquad.prototype.stepL = function (x) {
  var y = this.b0 * x + this.b1 * this.x1L + this.b2 * this.x2L
    - this.a1 * this.y1L - this.a2 * this.y2L;
  this.x2L = this.x1L; this.x1L = x;
  this.y2L = this.y1L; this.y1L = y;
  return y;
};

Mrdr3Biquad.prototype.stepR = function (x) {
  var y = this.b0 * x + this.b1 * this.x1R + this.b2 * this.x2R
    - this.a1 * this.y1R - this.a2 * this.y2R;
  this.x2R = this.x1R; this.x1R = x;
  this.y2R = this.y1R; this.y1R = y;
  return y;
};

/** The two-channel form, for callers that carry the channel as a value. */
Mrdr3Biquad.prototype.step = function (x, ch) {
  return ch ? this.stepR(x) : this.stepL(x);
};

// ---- WaveShaperNode, oversample 'none' -------------------------------------------
//
// A table lookup with linear interpolation and clamped ends, exactly as the spec maps it.
// MRDR-3 sets no oversampling, so there is no resampling stage to model — the whole node
// is these six lines.
function mrdr3Shape(curve, x) {
  var n = curve.length;
  if (n === 0) return x;
  if (n === 1) return curve[0];
  var v = (n - 1) * 0.5 * (x + 1);
  if (v <= 0) return curve[0];
  if (v >= n - 1) return curve[n - 1];
  var k = v | 0;
  var f = v - k;
  return curve[k] + (curve[k + 1] - curve[k]) * f;
}

// ---- StereoPannerNode, mono input -------------------------------------------------
//
// The equal-power law the spec states. Mono in, because that is where MRDR-3 puts it:
// before the layer filter, on a single oscillator, so one panner costs a second channel
// rather than a second filter.
function mrdr3PanGains(pan, out) {
  var p = pan < -1 ? -1 : (pan > 1 ? 1 : pan);
  var x = (p + 1) * 0.25 * Math.PI;
  out[0] = Math.cos(x);
  out[1] = Math.sin(x);
  return out;
}
`;
