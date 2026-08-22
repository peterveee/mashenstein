/*
 * The automation timeline: an AudioParam's scheduling rules, evaluated per sample.
 *
 * docs/MRDR-3-worklet-spec.md §3.2, which calls this the single most load-bearing
 * decision in the project. The reason is not economy of code.
 *
 * `adsr`, `gateAdsr`, `centsEnv`, `gateCentsEnv`, `filterEnv`, `pitchEnv`, `pitchRamp`
 * and `releaseNow` in src/engine/voices.js are ALREADY pure functions from a preset
 * section to a list of automation events. They carry tuning nobody wants to re-derive and
 * nobody would get right twice: `gateFloor`'s per-frequency minimum attack, the
 * exponential hand-over at 1e-4 that keeps the authored curve while removing the crawl
 * along the bottom, the -120 dB sustain floor from the denormal fix, `attackCurve: 'lin'`,
 * and the mono choke sized to a cycle and a half of the note being cut.
 *
 * Give the worklet an object those functions can write into and the envelope shapes cross
 * to the new backend as the SAME arithmetic rather than as a second implementation that
 * resembles the first. Envelope shape then cannot be a source of A/B difference, which
 * removes it from the ear-approval list in §3.5 — and it stays removed for the whole of
 * the dual-path period, because both paths are running one set of builders.
 *
 * ---- what this is NOT ------------------------------------------------------------
 *
 * Not an AudioParam. It does not connect, it has no `.value` setter with side effects,
 * and it takes FRAMES rather than seconds — the conversion happens once at the controller
 * boundary (§6) so a note time is never rounded twice. Making it pretend to be an
 * AudioParam would invite the native path to be rewritten around it, and the native path
 * is the reference the whole migration is measured against.
 *
 * Not a modulation graph either. `computedAt` adds one summed input, which is the rule
 * the vibrato-into-detune and LFO-into-detune connections rely on, but WHAT is summed is
 * the core's business. A timeline that owned routing would own the synth.
 */

export const MRDR3_PARAMS_SOURCE = `
var MRDR3_SET = 0;        // setValueAtTime
var MRDR3_LINEAR = 1;     // linearRampToValueAtTime
var MRDR3_EXP = 2;        // exponentialRampToValueAtTime
var MRDR3_TARGET = 3;     // setTargetAtTime

/**
 * One automated parameter.
 *
 * Events are kept in insertion order within a frame — a stable sort, deliberately: two
 * events stamped at the same frame must apply in the order they were written, which is
 * how "hold, then ramp from here" is spelled and how a choke lands after the value it
 * cancels.
 */
function Mrdr3Param(initial) {
  this.initial = initial || 0;
  this.events = [];
  this.seq = 0;
  // The render cursor. valueAt is called once per sample with a non-decreasing frame in
  // the hot path, so walking from where it left off makes it O(1) there; a frame that
  // goes backwards resets it, which is what a test or a re-render needs.
  this.cursor = 0;
  this.lastFrame = -1;
  // The summed modulation input. The core writes it; this only adds it.
  this.mod = 0;
  // The resolved segment — see valueAt. An empty range so the first call always resolves.
  this.segKind = 0; this.segFrom = 1; this.segTo = 0;
  this.segStart = 0; this.segSpan = 1; this.segA = 0; this.segB = 0;
  // What the segment's endpoints COME TO, resolved once when the segment is cached rather
  // than once per sample: a linear ramp wants the difference and an exponential one wants
  // the ratio, and neither moves inside the segment. Same doubles either way — the
  // quotient is computed once instead of every frame, not computed differently.
  this.segDelta = 0; this.segRatio = 1;
}

/** Nothing resolved is still valid once the events change. */
Mrdr3Param.prototype.dropCache = function () { this.segFrom = 1; this.segTo = 0; };

Mrdr3Param.prototype.reset = function (initial) {
  this.initial = initial === undefined ? this.initial : initial;
  this.events.length = 0;
  this.seq = 0;
  this.cursor = 0;
  this.lastFrame = -1;
  this.mod = 0;
  this.dropCache();
};

/**
 * Insert an event, keeping {frame, insertion} order.
 *
 * FRAMES ARE FLOATS HERE, and that is measured rather than stylistic. §6 converts a NOTE
 * time to an integer frame once, at the controller boundary, so an event never lands on
 * two different samples in two renders. An envelope's interior times are then derived
 * from that integer plus a duration in seconds — \`t + attack\` — and land wherever they
 * land. An AudioParam schedules those at their exact times, so rounding them here would
 * put every ramp endpoint up to half a sample away from the native path's.
 *
 * That is not a rounding nicety: measured, a set at 0.005s (220.5 frames) rounded to 221
 * shifted the ramp that followed it by 1.8e-4 — four thousand times the float32 floor the
 * rest of these ports reach — and a ramp whose endpoints quantised onto ONE frame
 * collapsed entirely, losing half its travel. Evaluation still happens at integer sample
 * indices; only the schedule keeps its precision.
 */
Mrdr3Param.prototype.push = function (kind, frame, value, tau) {
  var f = frame > 0 ? frame : 0;
  var e = { kind: kind, frame: f, value: value, tau: tau || 0, seq: this.seq++ };
  var i = this.events.length;
  while (i > 0 && (this.events[i - 1].frame > f)) { this.events[i] = this.events[i - 1]; i--; }
  this.events[i] = e;
  this.cursor = 0; this.lastFrame = -1;
  this.dropCache();
  return this;
};

Mrdr3Param.prototype.setValueAtTime = function (v, frame) {
  return this.push(MRDR3_SET, frame, v, 0);
};
Mrdr3Param.prototype.linearRampToValueAtTime = function (v, frame) {
  return this.push(MRDR3_LINEAR, frame, v, 0);
};
Mrdr3Param.prototype.exponentialRampToValueAtTime = function (v, frame) {
  return this.push(MRDR3_EXP, frame, v, 0);
};
Mrdr3Param.prototype.setTargetAtTime = function (v, frame, tauFrames) {
  return this.push(MRDR3_TARGET, frame, v, tauFrames);
};

/** Drop everything at or after \`frame\`, as cancelScheduledValues does. */
Mrdr3Param.prototype.cancelScheduledValues = function (frame) {
  var f = frame > 0 ? frame : 0;
  var keep = [];
  for (var i = 0; i < this.events.length; i++) {
    if (this.events[i].frame < f) keep.push(this.events[i]);
  }
  this.events = keep;
  this.cursor = 0; this.lastFrame = -1;
  this.dropCache();
  return this;
};

/**
 * Cancel the future but keep where the automation had got to.
 *
 * This is the whole of the mono choke, and the reason it exists rather than a
 * cancel-then-set: a note is scheduled up to a lookahead in the FUTURE, so pinning its
 * gain to the value it happens to hold NOW steps a note still climbing its attack up or
 * down before the fade. Holding takes the value the automation would have reached, which
 * is what "cut the note still ringing" has to mean.
 */
Mrdr3Param.prototype.cancelAndHoldAtTime = function (frame) {
  var f = frame > 0 ? frame : 0;
  var held = this.valueAt(f);
  // A ramp that SPANS this frame shapes the interval BEFORE it as well as after, so it
  // cannot simply be dropped: deleting it rewrites history, and the note's whole attack
  // changes retroactively. It is TRUNCATED instead — retargeted to end here, at the value
  // it had actually reached — which is what "hold what the automation would have reached"
  // means and why this is a different operation from cancel-then-set.
  //
  // Measured cost of getting it wrong: choking mid-decay was out by 3.3e-1, and a LEGATO
  // retarget followed by a release by 5.2e-1 — half of full scale, on the two gestures
  // this method exists for.
  var kept = [];
  var spanning = null;
  for (var i = 0; i < this.events.length; i++) {
    var e = this.events[i];
    if (e.frame < f) { kept.push(e); continue; }
    if (!spanning && (e.kind === MRDR3_LINEAR || e.kind === MRDR3_EXP)) spanning = e;
  }
  this.events = kept;
  this.cursor = 0; this.lastFrame = -1;
  this.dropCache();
  if (spanning) {
    // The truncated ramp keeps its kind, so an exponential stays exponential right up to
    // the moment it is cut.
    return this.push(spanning.kind, f, held, 0);
  }
  // NO ramp was in progress, so nothing is inserted — the preceding event stays the
  // anchor and this behaves as a plain cancel. Measured, not assumed: a hold during
  // SUSTAIN followed by a release ramp anchors that ramp at the SUSTAIN event rather than
  // at the hold, so the release begins its travel from where the note was held rather
  // than from the moment the key came up. Inserting an anchor here put the ported value
  // 3.6e-1 away from the node at the sample after the sustain began.
  return this;
};

/** The value an event settles on at its own frame — the anchor a following ramp runs from. */
function mrdr3EventValue(param, index) {
  var e = param.events[index];
  if (e.kind === MRDR3_TARGET) return mrdr3ValueAtIndex(param, index, e.frame);
  return e.value;
}

/** The automation value at \`frame\`, given that event \`index\` is the last one at or before it. */
function mrdr3ValueAtIndex(param, index, frame) {
  if (index < 0) return param.initial;
  var e = param.events[index];
  if (e.kind !== MRDR3_TARGET) return e.value;
  // setTargetAtTime: an exponential approach that never arrives. The value it starts from
  // is whatever the automation held at its own frame.
  var from = index > 0 ? mrdr3EventValue(param, index - 1) : param.initial;
  var tau = e.tau > 0 ? e.tau : 1e-9;
  return e.value + (from - e.value) * Math.exp(-(frame - e.frame) / tau);
}

/**
 * The automation value at an absolute frame, by the Web Audio rules.
 *
 * The only current-value read in the core. \`releaseNow\` snapshots it at the release frame
 * before it cancels and replaces what follows — it must never read a main-thread value
 * that describes a different render instant.
 */
/**
 * The value at an absolute frame, by the Web Audio rules.
 *
 * ---- the segment cache ------------------------------------------------------------
 *
 * Profiled at 19% of the core's whole render, which is what a general automation
 * evaluator costs when it is asked the same question 44100 times a second. The answer is
 * not to make it less general: between two adjacent events the shape is FIXED — a
 * constant, a lerp between two known points, or an exponential between them — so it is
 * resolved once and the per-sample path becomes a bounds check and the arithmetic.
 *
 * BIT-IDENTICAL by construction. The cached segment stores the same endpoints the walk
 * would find and computes the value with the same expression, so this is the same number
 * arrived at without re-deriving which events bracket the frame. Any drift here would
 * show up immediately as the oracle going red on all 36 pinned presets.
 */
Mrdr3Param.prototype.valueAt = function (frame) {
  // The fast path: still inside the segment resolved last time.
  if (frame >= this.segFrom && frame < this.segTo) {
    var k = this.segKind;
    if (k === 0) return this.segA;
    var t = (frame - this.segStart) / this.segSpan;
    if (k === 1) return this.segA + this.segDelta * t;
    if (k === 2) return this.segA * Math.pow(this.segRatio, t);
    // setTarget: an exponential approach that never arrives, so it is evaluated rather
    // than interpolated and only its endpoints are cached.
    return this.segB + (this.segA - this.segB) * Math.exp(-(frame - this.segStart) / this.segSpan);
  }
  var events = this.events;
  var n = events.length;
  if (n === 0) return this.initial;
  // Advance or reset the cursor.
  if (frame < this.lastFrame) this.cursor = 0;
  this.lastFrame = frame;
  var i = this.cursor;
  while (i < n && events[i].frame <= frame) i++;
  // i is the first event strictly AFTER frame; i-1 is the last at or before it.
  this.cursor = i > 0 ? i - 1 : 0;
  var prev = i - 1;
  var next = i < n ? events[i] : null;

  // Inside a ramp: the value is interpolated between the anchor and the ramp's target,
  // and the ramp OWNS the interval — it is the following event that shapes it, not the
  // preceding one.
  if (next && (next.kind === MRDR3_LINEAR || next.kind === MRDR3_EXP)) {
    var fromFrame = prev >= 0 ? events[prev].frame : 0;
    var fromValue = prev >= 0 ? mrdr3EventValue(this, prev) : this.initial;
    var span = next.frame - fromFrame;
    if (span <= 0) return next.value;
    var t = (frame - fromFrame) / span;
    if (t <= 0) return fromValue;
    if (t >= 1) return next.value;
    var exact;
    if (next.kind === MRDR3_LINEAR) {
      exact = fromValue + (next.value - fromValue) * t;
      this.cache(1, fromFrame, next.frame, fromFrame, span, fromValue, next.value);
    } else if (fromValue === 0 || (fromValue > 0) !== (next.value > 0)) {
      // An exponential ramp needs both endpoints non-zero and of one sign. The engine's
      // envelope builders already floor their values for exactly this reason; this is the
      // safety net, and it holds rather than producing a NaN that would reach the output.
      exact = fromValue;
      this.cache(0, fromFrame, next.frame, fromFrame, span, fromValue, fromValue);
    } else {
      exact = fromValue * Math.pow(next.value / fromValue, t);
      this.cache(2, fromFrame, next.frame, fromFrame, span, fromValue, next.value);
    }
    return exact;
  }
  // Not inside a ramp: the value holds from this event until the next one, whatever that
  // next one turns out to be — so the segment runs to it, or for ever if there is none.
  var until = next ? next.frame : Infinity;
  if (prev < 0) {
    this.cache(0, -Infinity, until, 0, 1, this.initial, this.initial);
    return this.initial;
  }
  var here = events[prev];
  if (here.kind === MRDR3_TARGET) {
    var start = prev > 0 ? mrdr3EventValue(this, prev - 1) : this.initial;
    var tau = here.tau > 0 ? here.tau : 1e-9;
    this.cache(3, here.frame, until, here.frame, tau, start, here.value);
    return here.value + (start - here.value) * Math.exp(-(frame - here.frame) / tau);
  }
  this.cache(0, here.frame, until, here.frame, 1, here.value, here.value);
  return here.value;
};

/** Remember the shape between two events, so the next sample is arithmetic and no search. */
Mrdr3Param.prototype.cache = function (kind, from, to, start, span, a, b) {
  this.segKind = kind;
  this.segFrom = from;
  this.segTo = to;
  this.segStart = start;
  this.segSpan = span;
  this.segA = a;
  this.segB = b;
  this.segDelta = b - a;
  this.segRatio = kind === 2 ? b / a : 1;
};

/** Automation plus whatever is modulating it — the rule an AudioParam's inputs follow. */
Mrdr3Param.prototype.computedAt = function (frame) {
  return this.valueAt(frame) + this.mod;
};
`;
