import { registerFzpp6Core } from './tables.js';

/*
 * FZPP-6's DSP core — the waveguide string, and the only copy of its mathematics.
 *
 * Held as source text for the reason TNGR-2's is (see the header of tngr2/dsp.js): the
 * worklet gets this string concatenated into its processor and loaded as a Blob, and Node
 * evaluates the same string once for the tests, the tools and the reference renderer
 * below. One string cannot drift from itself, and no page ever needs `unsafe-eval`.
 *
 * ---- the instrument ---------------------------------------------------------------
 *
 * Six string slots per lane. A note goes to the string a guitarist would put it on — the
 * highest whose open pitch is at or below it — unless that string was already taken by the
 * same chord, when it moves down one. Each slot owns two voices and ping-pongs between them,
 * so re-plucking a ringing string fades the old vibration out over 5 ms while the new one
 * starts on time, instead of either clicking or stealing the pluck's onset.
 *
 * A voice is one or two LINES (the second is COURSE: a unison pair or an octave string).
 * A line, per sample:
 *
 *     read the delay line   — Thiran first-order allpass for the fraction, or a 3rd-order
 *                             Lagrange read when the pitch moves (vibrato, glide, legato)
 *     dispersion            — 0–4 first-order allpasses: STIFF, scaled by string gauge
 *     loop lowpass          — g(1+a)/(1+a·z⁻¹), solved per note from two T60s: DECAY at the
 *                             fundamental and DAMP at 4 kHz, so a patch decays alike up the neck
 *     BUZZ                  — a one-sided fold against a curved bridge (jawari)
 *     + the excitation      — read from tables that already contain the body (tables.js)
 *     write, and output the written sample (PICKUP takes a comb of it instead)
 *
 * and then, per voice: the optional SVF FILTER with its envelope, the AMP envelope, a
 * steal fade, and SPREAD's pan. Per lane: the filter instead, when it is the same on every
 * string (see `collapsed`), the lane body when the A/B asks for it, and a 25 Hz DC blocker.
 *
 * ---- how it stays cheap -----------------------------------------------------------
 *
 * The block is cut at every 16th frame (the control grid) and at every event. Inside a cut,
 * each line runs one tight loop over the samples with its state in locals — not TNGR-2's
 * outer loop over samples calling a method per voice per sample. Everything that moves
 * slowly (envelopes, filter coefficients, the pitch target) is set at the grid and
 * interpolated across it; the loop filter and the tuning are re-solved every 64 frames, and
 * only on voices whose loop is actually changing. The grid is in ABSOLUTE frames, so a
 * render cut into 128-frame blocks and one cut into 997-frame blocks are the same samples.
 */

/**
 * The core, as source. Pure: no DOM, no Tone, no VoiceRack, and no worklet globals — the
 * rate is a constructor argument and the frame is passed in.
 */
export const FZPP6_DSP_SOURCE = `
var FZPP6_STRING_COUNT = 6;
var FZPP6_CTRL = 16;                  // control grid, frames
var FZPP6_RETUNE = 64;                // loop filter and tuning re-solved this often
var FZPP6_WINDOW = 128;               // peak window: the retire test and TENSION's follower
var FZPP6_SILENT = 1e-5;              // -100 dB: below it for a whole window, a voice is gone
var FZPP6_FADE_SECONDS = 0.005;       // a re-pluck or a steal fades the old vibration over this
var FZPP6_CHORD_SECONDS = 0.06;       // notes this close together are one chord
var FZPP6_KEY_REF = 110;              // A2: where DECAY is measured and KEY FOLLOW pivots
var FZPP6_LEVEL_LO = 12;              // the level curve: MIDI 12 upward, every 4 semitones
var FZPP6_LEVEL_STEP = 4;             // (the same two numbers as tables.js)
// The excitation's overall scale. Set so a preset MEASURES beside the catalogue (~0.02,
// tools/measure-voices.js): at 0.32 they measured ~0.003, under the +12 dB ceiling on the
// boost voiceGain will give, and so would have played quiet.
var FZPP6_LEVEL = 2.5;
var FZPP6_DETUNE = [-0.6, 0.3, -0.2, 0.5, -0.4, 0.1];
var FZPP6_GAUGE_STAGES = [4, 3, 3, 1, 1, 0];
var FZPP6_GAUGE_STIFF = [1, 0.95, 0.9, 0.55, 0.5, 0.45];
var FZPP6_GAUGE_DAMP = [0.8, 0.85, 0.9, 1, 1.1, 1.2];
// The sustained exciters' output scales, set so a held note at PRESSURE 0.6 measures beside a
// pluck (the level system then levels every preset anyway). STK's models, which these follow
// (Cook & Scavone), put out velocities and pressures of a fraction of one.
// Measured through the real engine (tools/lib/measure-voice.js) a held note is shorter
// than a pluck's ring, so these sit higher than a Node rms match would put them: with them
// the catalogue's bowed and blown presets land where voiceGain's +12 dB boost reaches.
var FZPP6_BOW_OUT = 0.45;
var FZPP6_REED_OUT = 0.2;
var FZPP6_JET_OUT = 0.12;
var FZPP6_SAX_OUT = 0.2;
// The bow plays a constant 5 cents sharp of its loop (the friction junction's regime, the
// same at every pressure and pitch measured, 23 Oct 2026): its loop is that much longer.
var FZPP6_BOW_TUNE = 1.00289;
var FZPP6_TUNINGS = {
  standard: [40, 45, 50, 55, 59, 64], dropD: [38, 45, 50, 55, 59, 64],
  openG: [38, 43, 50, 55, 59, 62], dadgad: [38, 45, 50, 55, 57, 62]
};

function fzpp6Hash(a, b) {
  var h = 2166136261 ^ Math.imul((a | 0) + 1, 16777619);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= Math.imul((b | 0) + 1, 2654435761);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  return h >>> 0;
}

/** Phase delay, in samples at w, of the loop lowpass g(1+a)/(1+a z^-1). */
function fzpp6LpDelay(a, w) {
  return -Math.atan2(a * Math.sin(w), 1 + a * Math.cos(w)) / w;
}
/** Phase delay, in samples at w, of the first-order allpass (c + z^-1)/(1 + c z^-1). */
function fzpp6ApDelay(c, w) {
  return 1 - 2 * Math.atan2(c * Math.sin(w), 1 + c * Math.cos(w)) / w;
}

/**
 * The drive's table, read exactly as a WaveShaperNode reads one at oversample 'none' —
 * TNGR-2's tngr2Shape: linear interpolation, ends held, the input scaled into ±headroom.
 */
function fzpp6Shape(curve, x, scaleIn) {
  var n = curve.length;
  var v = (n - 1) * 0.5 * (x * scaleIn + 1);
  if (v <= 0) return curve[0];
  if (v >= n - 1) return curve[n - 1];
  var k = v | 0;
  return curve[k] + (curve[k + 1] - curve[k]) * (v - k);
}

/** One table read at a fractional position; nothing outside the table. */
function fzpp6Tap(t, p) {
  if (p < 0) return 0;
  var i = p | 0;
  var n = t.length;
  if (i >= n) return 0;
  var f = p - i;
  var a = t[i];
  return f === 0 ? a : a + ((i + 1 < n ? t[i + 1] : 0) - a) * f;
}

// ---- a line: one delay loop --------------------------------------------------------------

function Fzpp6Line(size) {
  this.buf = new Float32Array(size);
  this.mask = size - 1;
  this.reset();
}

Fzpp6Line.prototype.reset = function reset() {
  this.buf.fill(0);
  this.w = 0;
  this.lagrange = false;
  this.Dint = 2; this.tc = 0; this.tx1 = 0; this.ty1 = 0;
  this.D = 2; this.dD = 0;
  this.lg = 0; this.la = 0; this.lp1 = 0;
  this.ns = 0; this.dc = 0;
  this.x0 = 0; this.y0 = 0; this.x1 = 0; this.y1 = 0;
  this.x2 = 0; this.y2 = 0; this.x3 = 0; this.y3 = 0;
  this.fdel = 0;
  this.buzzH = 0; this.buzzR = 0.35;
  this.pickRatio = 0; this.pickN = 0;
  this.ein = 1;
  this.weight = 1;
  this.tuned = false;
  this.peak = 0;
};

/**
 * Solve this line's loop for a pitch and two decay times.
 *
 * The lowpass is fitted through two points — per-trip gain G0 at the fundamental (T60 =
 * t60) and Ghi at 4 kHz (T60 = t60hi) — which is a quadratic in a whose roots are each
 * other's reciprocal; the one inside the unit circle is the filter. Then the phase delays
 * of everything in the loop are added up AT THE FUNDAMENTAL and taken off the period, so
 * the note lands where it should whatever DAMP, STIFF and DECAY are doing. Thiran gets
 * the fraction, solved exactly at w0 rather than by the low-frequency approximation, which
 * is what holds E6 to the cent.
 */
Fzpp6Line.prototype.tune = function tune(f, sr, t60, t60hi, stages, dc) {
  var w0 = 2 * Math.PI * f / sr;
  var N = sr / f;
  var fhi = Math.min(4000, 0.42 * sr);
  var whi = 2 * Math.PI * fhi / sr;
  var G0 = Math.pow(10, -3 / (f * t60));
  var Ghi = Math.pow(10, -3 / (f * t60hi));
  var a = 0;
  var R = Ghi / G0;
  if (fhi > 1.5 * f && R < 0.999999) {
    var R2 = R * R;
    var A = R2 - 1;
    var B = 2 * (R2 * Math.cos(whi) - Math.cos(w0));
    var disc = B * B - 4 * A * A;
    if (disc > 0) {
      var s = Math.sqrt(disc);
      var r1 = (-B + s) / (2 * A);
      var r2 = (-B - s) / (2 * A);
      a = Math.abs(r1) < 1 ? r1 : r2;
      if (!(Math.abs(a) < 0.999)) a = 0;
    }
  }
  var g = G0 * Math.sqrt(1 + 2 * a * Math.cos(w0) + a * a) / (1 + a);
  if (g > 0.99999) g = 0.99999;
  this.lg = g * (1 + a);
  this.la = a;
  var fdel = fzpp6LpDelay(a, w0);
  var ns = dc < 0 ? stages : 0;
  var apd = ns > 0 ? fzpp6ApDelay(dc, w0) : 0;
  while (ns > 0 && N - fdel - ns * apd < 4) ns--;
  if (ns !== this.ns) { this.x0 = this.y0 = this.x1 = this.y1 = this.x2 = this.y2 = this.x3 = this.y3 = 0; }
  this.ns = ns;
  this.dc = dc;
  fdel += ns * apd;
  this.fdel = fdel;
  if (this.pickRatio > 0) this.pickN = Math.max(1, this.pickRatio * N);
  if (this.lagrange) {
    if (!this.tuned) { this.D = Math.max(2, N - fdel); this.dD = 0; }
  } else {
    var rem = N - fdel;
    var d = rem - this.Dint;
    if (!this.tuned || d < 0.3 || d > 1.7) {
      this.Dint = Math.max(1, Math.floor(rem - 0.5));
      d = rem - this.Dint;
    }
    var th = (1 - d) * w0 / 2;
    this.tc = Math.sin(th) / Math.sin(w0 - th);
  }
  this.tuned = true;
};

/** Aim this line's moving read at a plain delay D — the bow's nut side, the flute's jet. */
Fzpp6Line.prototype.aim = function aim(D) {
  this.lagrange = true;
  this.fdel = 0;
  if (!this.tuned) { this.D = Math.max(2, D); this.dD = 0; }
  this.tuned = true;
};

/**
 * Run n samples of this line. 'e' is the excitation, 'o' the voice's output scratch:
 * written when 'add' is false, added to when it is true (the second line of a COURSE).
 */
Fzpp6Line.prototype.run = function run(e, o, n, add) {
  var buf = this.buf, mask = this.mask, w = this.w;
  var lagr = this.lagrange, Dint = this.Dint, D = this.D, dD = this.dD;
  var tc = this.tc, tx1 = this.tx1, ty1 = this.ty1;
  var lg = this.lg, la = this.la, lp1 = this.lp1;
  var ns = this.ns, dc = this.dc;
  var x0 = this.x0, y0 = this.y0, x1 = this.x1, y1 = this.y1;
  var x2 = this.x2, y2 = this.y2, x3 = this.x3, y3 = this.y3;
  var bh = this.buzzH, br = this.buzzR;
  var pN = this.pickN, pick = this.pickRatio > 0;
  var ein = this.ein, wt = this.weight;
  var peak = this.peak;
  for (var i = 0; i < n; i++) {
    var r;
    if (lagr) {
      var di = D | 0;
      var x = D - di + 1;
      var s0 = buf[(w - di + 1) & mask], s1 = buf[(w - di) & mask];
      var s2 = buf[(w - di - 1) & mask], s3 = buf[(w - di - 2) & mask];
      var xm1 = x - 1, xm2 = x - 2, xm3 = x - 3;
      r = -xm1 * xm2 * xm3 / 6 * s0 + x * xm2 * xm3 / 2 * s1
        - x * xm1 * xm3 / 2 * s2 + x * xm1 * xm2 / 6 * s3;
      D += dD;
    } else {
      var rr = buf[(w - Dint) & mask];
      r = tc * rr + tx1 - tc * ty1;
      tx1 = rr; ty1 = r;
    }
    if (ns > 0) {
      var t = dc * r + x0 - dc * y0; x0 = r; y0 = t; r = t;
      if (ns > 1) {
        t = dc * r + x1 - dc * y1; x1 = r; y1 = t; r = t;
        if (ns > 2) {
          t = dc * r + x2 - dc * y2; x2 = r; y2 = t; r = t;
          if (ns > 3) { t = dc * r + x3 - dc * y3; x3 = r; y3 = t; r = t; }
        }
      }
    }
    var lp = lg * r - la * lp1;
    lp1 = lp;
    // The bridge: displacement past it folds back, losing a little each time. Passive —
    // |out| never exceeds |in| — so a loop near unity gain stays stable however hard it buzzes.
    if (bh > 0 && lp < -bh) lp = -bh - (lp + bh) * br;
    var s = lp + e[i] * ein;
    buf[w] = s;
    var out = s;
    if (pick) {
      var pi = pN | 0;
      var pf = pN - pi;
      out = s - (buf[(w - pi) & mask] * (1 - pf) + buf[(w - pi - 1) & mask] * pf);
    }
    w = (w + 1) & mask;
    var as = s < 0 ? -s : s;
    if (as > peak) peak = as;
    if (add) o[i] += out * wt; else o[i] = out * wt;
  }
  this.w = w; this.D = D;
  this.tx1 = tx1; this.ty1 = ty1; this.lp1 = lp1;
  this.x0 = x0; this.y0 = y0; this.x1 = x1; this.y1 = y1;
  this.x2 = x2; this.y2 = y2; this.x3 = x3; this.y3 = y3;
  this.peak = peak;
};

// ---- a voice: one pluck on one string ------------------------------------------------------

function Fzpp6Voice(core, string) {
  this.string = string;
  this.l1 = new Fzpp6Line(core.lineSize);
  this.l2 = new Fzpp6Line(core.lineSize);
  this.active = false;
  this.listed = false;
}

Fzpp6Voice.prototype.kill = function kill() {
  if (this.active) { this.l1.reset(); if (this.course || this.sustained) this.l2.reset(); }
  this.active = false;
};

Fzpp6Voice.prototype.fadeOut = function fadeOut(frames) {
  if (!this.active) return;
  if (this.fading && this.fadeGain <= 0) return;
  this.fading = true;
  this.fadeStep = Math.max(this.fadeStep || 0, (this.fadeGain > 0 ? this.fadeGain : 1) / Math.max(1, frames));
};

/** Pitch the voice is aiming at and what its loop currently holds — see Fzpp6Core.control. */
Fzpp6Voice.prototype.start = function start(core, hz, vel, eventId, frame, fromHz) {
  var p = core.patch;
  var sr = core.rate;
  var j = this.string;
  var free = !core.open;
  var cents = p.string.detune * FZPP6_DETUNE[j];
  var f = Math.min(sr / 5, Math.max(20, hz * Math.pow(2, cents / 1200)));
  var stages = free ? 2 : FZPP6_GAUGE_STAGES[j];
  var gStiff = free ? 0.8 : FZPP6_GAUGE_STIFF[j];
  var gDamp = free ? 1 : FZPP6_GAUGE_DAMP[j];
  var mute = p.damping.mute;

  this.active = true;
  this.fading = false; this.fadeGain = 1; this.fadeStep = 0;
  this.eventId = eventId;
  this.hz = hz;
  this.vel = vel;
  this.released = false;
  this.age = 0;
  this.lagrange = core.moving;
  this.stages = p.string.stiffness > 0 ? stages : 0;
  this.dc = -0.6 * p.string.stiffness * gStiff;
  this.chuck = p.damping.mutedBelow > 0 && vel < p.damping.mutedBelow;
  this.t60 = p.string.decay * Math.pow(FZPP6_KEY_REF / f, p.string.keyFollow) * (1 - 0.92 * mute);
  this.damp = Math.min(1, Math.max(0.02, p.string.damp * gDamp * (1 - 0.6 * mute)));
  if (this.chuck) { this.t60 = Math.min(this.t60, 0.03); this.damp = 0.25; }
  this.settleTau = p.damping.settle > 0 && !this.chuck ? p.damping.settle / 3 : 0;
  this.tension = this.chuck ? 0 : p.strings.tension * vel;
  this.tensionC = this.tension;
  this.attackPeak = 0; this.winPeak = 0; this.hold = 0;
  this.period = Math.ceil(sr / Math.min(f, fromHz > 0 ? fromHz : f));
  this.dynamic = this.settleTau > 0 || this.tension > 0 || this.lagrange;

  // Pitch, in octaves. GLIDE walks 'logPitch' to 'logTarget' at a constant rate.
  this.logTarget = Math.log2(f);
  var fromF = fromHz > 0 ? Math.min(sr / 5, Math.max(20, fromHz * Math.pow(2, cents / 1200))) : 0;
  this.logPitch = fromF > 0 && core.play.glide > 0 ? Math.log2(fromF) : this.logTarget;
  this.glideRate = core.play.glide > 0
    ? Math.abs(this.logTarget - this.logPitch) / (core.play.glide * sr) : 0;
  this.vibPhase = 0;

  // The lines.
  var c = p.string.course;
  this.course = c > 0;
  this.polar = c > 0 && c < 300;
  this.courseRatio = Math.pow(2, c / 1200);
  var buzzH = p.string.buzz > 0 ? 0.004 + 0.5 * (1 - p.string.buzz) * (1 - p.string.buzz) : 0;
  var pickRatio = p.string.pickup > 0 ? 0.28 - 0.22 * p.string.pickup : 0;
  var l1 = this.l1;
  l1.reset();
  l1.lagrange = this.lagrange;
  l1.buzzH = buzzH;
  l1.pickRatio = pickRatio;
  l1.weight = this.course ? (this.polar ? 0.82 : 0.92) : 1;
  var N1 = sr / f;
  if (this.course) {
    var l2 = this.l2;
    l2.reset();
    l2.lagrange = this.lagrange;
    l2.buzzH = buzzH;
    l2.pickRatio = pickRatio;
    l2.weight = this.polar ? 0.82 : 0.92;
    var N2 = N1 / this.courseRatio;
    l2.ein = this.polar ? 0.7 : 0.55 * Math.sqrt(N2 / N1);
    this.comb2 = Math.max(1, p.exciter.position * N2);
    this.e2Delay = this.polar ? 0 : Math.round(0.001 * sr);
  } else {
    this.comb2 = 0; this.e2Delay = 0;
  }
  this.retune(core);

  // A SUSTAINED exciter — BOW, REED or JET — drives the loop for as long as the key is held
  // (see runBow / runReed / runJet), on the AMP envelope as the player's pressure. Nothing
  // below about tables applies to it; its loops are aimed in 'retune'.
  var exType = p.exciter.type;
  this.sustained = exType === 'bow' || exType === 'reed' || exType === 'sax' || exType === 'jet';
  this.exType = exType;
  if (this.sustained) {
    this.lagrange = true;
    this.dynamic = true;
    this.course = false;
    this.polar = false;
    this.l1.reset(); this.l2.reset();
    this.l1.lagrange = true; this.l2.lagrange = true;
    this.l1.weight = 1; this.l2.weight = 1;
    // The bow/reed/jet's own noise: seeded from the event, so a stem is its mix.
    this.rng = (fzpp6Hash(eventId, j + 29) | 1) >>> 0;
    // PRESSURE, as each junction wants it: the reed speaks from about 0.4 and the jet from
    // about 0.95 (STK's maxPressure), so the pot's bottom is a breath that just sounds.
    // ...and stops short of where each chokes (the reed shuts at 1.0, the jet at 1.35).
    var pr = p.exciter.pressure;
    this.press = exType === 'reed' ? 0.5 + 0.4 * pr : exType === 'jet' ? 0.95 + 0.35 * pr : pr;
    this.noiseG = p.exciter.noise;
    // The bow's force: STK's slope, with its top held back — at 1 the lowest string fell
    // into a sub-harmonic (raucous) regime.
    this.bowSlope = 5 - 3 * pr;
    this.bowSpeed = 0.03 + 0.2 * p.exciter.speed;
    this.reedSlope = -0.44 + 0.26 * p.exciter.reed;
    // The sax's reed table slopes the other way (STK Saxofony: +0.3 where the clarinet's is
    // negative); REED runs it from soft to hard.
    // ...and it speaks along a diagonal (measured 23 Oct 2026): a stiffer reed needs less
    // breath and chokes sooner, about 0.4 above where it starts. So PRESSURE runs from just
    // speaking to just short of choking for whatever REED is set.
    this.saxSlope = 0.18 + 0.24 * p.exciter.reed;
    if (p.internal.saxSlope > 0) this.saxSlope = p.internal.saxSlope;
    if (exType === 'sax') {
      var threshold = 1.4 - 2.6 * this.saxSlope;
      // PRESSURE keeps to the middle of that band: at either edge the top of the board went
      // unstable (78 cents off at m77 just above the threshold, 23 Oct 2026).
      this.press = threshold + 0.12 + 0.16 * pr;
      if (p.internal.saxBreath > 0) this.press = p.internal.saxBreath;
    }
    // The bell: a LINEAR-PHASE lowpass on the bore's reflection — c·x[n-1] + h·(x[n] + x[n-2]),
    // one sample of delay at every frequency. A one-pole here delayed each harmonic
    // differently and the reed locked to whichever the bell favoured: the pitch drifted a
    // cent a semitone and jumped 30 cents at two places in the range. BELL runs from the
    // darkest this shape goes (an average of three) to no filter at all.
    this.bellK = 1 / 3 + (2 / 3) * p.exciter.bell;
    // The jet's length against the bore. Fixed: it IS the pitch — 10 cents per 0.01, with no
    // bore length that puts it right without pushing the regime into another mode (23 Oct
    // 2026) — so the pot it was came off and the flute plays in tune.
    this.jetRatio = 0.3;
    this.rx1 = 0; this.rx2 = 0; this.jdx = 0; this.jdy = 0;
    this.excT = null; this.excU = null; this.gT = 0; this.gU = 0;
    this.comb1 = 1; this.comb2 = 0; this.e2Delay = 0;
    this.bc = 1; this.bh = 1; this.pc = 0;
    this.b1 = this.b2 = this.h1 = this.h2 = this.q1 = this.q2 = 0;
    this.excPos = 0; this.excLen = 0; this.excOn = false;
    this.excFade = 1; this.excFadeK = 1;
    this.liftOn = false;
    this.nT = null; this.nPos = 0; this.nG = 0;
    this.sqT = null; this.sqPos = 0; this.sqG = 0;
    this.lev = FZPP6_LEVEL * core.levelAt(hz) * vel;
    this.level = core.noteLevel == null ? 1 : core.noteLevel;
    this.outK = exType === 'bow' ? FZPP6_BOW_OUT : exType === 'reed' ? FZPP6_REED_OUT
      : exType === 'sax' ? FZPP6_SAX_OUT : FZPP6_JET_OUT;
    this.retune(core);
    this.aStage = 0;
    this.aVal = 0;
    this.aInc = 0;
    this.fStage = p.filterEnv.attack > 0 ? 0 : 1;
    this.fVal = p.filterEnv.attack > 0 ? 0 : 1;
    this.fic1 = 0; this.fic2 = 0; this.dt1 = 0; this.dcx = 0; this.dcy = 0;
    this.fk = 1; this.fa1 = 0; this.fa2 = 0; this.fa3 = 0;
    var posS = p.strings.spread * (2 * j / (FZPP6_STRING_COUNT - 1) - 1) * 0.8;
    var thS = (posS + 1) * Math.PI / 4;
    this.pl = Math.cos(thS) * Math.SQRT2;
    this.pr = Math.sin(thS) * Math.SQRT2;
    return;
  }

  // The exciter.
  var t = core.tables;
  var variant = fzpp6Hash(eventId, j) & 3;
  var noise = t.noise.length ? t.noise[variant % t.noise.length] : null;
  // The note's LEVEL — the rack's gain, boosts and trims — is NOT in the excitation: it is
  // applied to the voice's output, after the DRIVE, so the shaper meets the string at the
  // string's own level on every lane (TNGR-2 does the same; see renderVoice).
  var lev = vel * Math.sqrt(N1 / (sr / FZPP6_KEY_REF)) * FZPP6_LEVEL * core.levelAt(hz);
  this.level = core.noteLevel == null ? 1 : core.noteLevel;
  this.lev = lev;
  var type = p.exciter.type;
  var T = null, U = null, gT = 0, gU = 0;
  if (this.chuck) {
    T = t.pulse; gT = 0.15;
    U = t.scrape.length ? t.scrape[0] : noise; gU = 0.9;
  } else if (type === 'pick') {
    T = t.pulse; gT = Math.cos(p.exciter.mix * Math.PI / 2);
    U = noise; gU = noise ? Math.sin(p.exciter.mix * Math.PI / 2) : 0;
  } else if (type === 'noise') {
    U = noise; gU = 1;
  } else {
    T = t.pulse; gT = 1;
  }
  this.excT = T; this.excU = U;
  this.gT = gT * lev; this.gU = gU * lev;
  this.comb1 = Math.max(1, p.exciter.position * N1);
  var fc = 250 * Math.pow(2, p.exciter.bright * 6.3)
    * Math.pow(2, -p.exciter.velocity * (1 - vel) * 3);
  this.bc = 1 - Math.exp(-2 * Math.PI * Math.min(fc, 0.45 * sr) / sr);
  // HARDNESS: a lowpass a number of harmonics above the note — 2 for the softest
  // fingertip, 62 for a hard plectrum — so it is the same pluck at every fret.
  var fh = f * (2 + 60 * p.exciter.hardness * p.exciter.hardness);
  // A PLUCK's shape. What a guitar sends out is the force at the bridge, and a plucked
  // string's falls at 6 dB an octave from its own fundamental: one pole AT the note. It is
  // also what spreads a pluck over about one period instead of one sample — without it a
  // hard pick on a bare electric was a click with a note behind it, 35 dB of crest factor.
  // A bowed NOISE burst is flatter and does not get it. The gain
  // puts back the level the pole takes, so a patch's overall loudness stays where it was.
  // A strike gets the same pole three harmonics up: a hammer is sharper than a pick, but
  // without any pole a dulcimer was 30 dB of crest factor — a tick, not a note.
  var shape = type === 'pick' || this.chuck ? f : type === 'impulse' ? 3 * f : 0;
  this.pc = shape > 0 ? 1 - Math.exp(-2 * Math.PI * Math.min(shape, 0.45 * sr) / sr) : 0;
  if (this.pc > 0) { this.gT /= Math.sqrt(this.pc); this.gU /= Math.sqrt(this.pc); }
  this.q1 = 0; this.q2 = 0;
  this.bh = 1 - Math.exp(-2 * Math.PI * Math.min(fh, 0.45 * sr) / sr);
  this.b1 = 0; this.b2 = 0; this.h1 = 0; this.h2 = 0;
  this.excPos = 0;
  this.excLen = Math.max(T ? T.length : 0, U ? U.length : 0)
    + Math.ceil(Math.max(this.comb1, this.comb2)) + this.e2Delay + 2;
  this.excOn = true;
  this.excFade = 1; this.excFadeK = 1;
  this.liftOn = false;
  this.nT = null; this.nPos = 0; this.nG = 0;
  this.sqT = null; this.sqPos = 0; this.sqG = 0;

  // AMP: 0 attack, 1 decay/sustain, 2 released (held — the string stops itself).
  this.aStage = p.amp.attack > 0 ? 0 : 1;
  this.aVal = p.amp.attack > 0 ? 0 : 1;
  this.aInc = 0;
  // FILTER ENV: 0 attack, 1 decay/sustain, 2 release.
  this.fStage = p.filterEnv.attack > 0 ? 0 : 1;
  this.fVal = p.filterEnv.attack > 0 ? 0 : 1;
  this.fic1 = 0; this.fic2 = 0; this.dt1 = 0; this.dcx = 0; this.dcy = 0;
  this.fk = 1; this.fa1 = 0; this.fa2 = 0; this.fa3 = 0;

  // SPREAD: low strings left, as the player hears them.
  var at = free ? j : j;
  var pos = p.strings.spread * (2 * at / (FZPP6_STRING_COUNT - 1) - 1) * 0.8;
  var th = (pos + 1) * Math.PI / 4;
  this.pl = Math.cos(th) * Math.SQRT2;
  this.pr = Math.sin(th) * Math.SQRT2;
};

/** The loop's decay right now: SETTLE easing off, MUTE, and a note-off's RELEASE. */
Fzpp6Voice.prototype.retune = function retune(core) {
  var sr = core.rate;
  if (this.sustained) return this.aimSustained(core, Math.pow(2, this.logPitch));
  var t60 = this.released ? Math.min(this.t60, core.patch.amp.release) : this.t60;
  var damp = this.damp;
  if (this.settleTau > 0) {
    damp += (Math.min(1, damp * 3) - damp) * Math.exp(-this.age / (this.settleTau * sr));
  }
  var cents = this.tensionC;
  var f = Math.pow(2, this.logPitch);
  // The Thiran path carries TENSION in the tuning; the Lagrange path carries it, with the
  // vibrato and the glide, in its moving read (see control), so its loop is solved at the
  // plain pitch.
  if (!this.lagrange && cents) f *= Math.pow(2, cents / 1200);
  var c1 = this.polar ? 0.8 : 1;
  this.l1.tune(f, sr, t60 * (this.course ? c1 : 1), t60 * damp * (this.course ? c1 : 1),
    this.stages, this.dc);
  if (this.course) {
    var c2 = this.polar ? 1.3 : 0.7;
    var d2 = this.polar ? 1 : 0.7;
    this.l2.tune(Math.min(sr / 5, f * this.courseRatio), sr, t60 * c2, t60 * damp * c2 * d2,
      this.polar ? this.stages : Math.min(1, this.stages), this.dc);
  }
};

/**
 * Where a sustained voice's loops have to be for a pitch f, as the read targets the moving
 * read walks to. BOW: the string split at the bow (WHERE) into a bridge side, which carries
 * the string's loss (RING, HIGHS), and a nut side. REED: a closed-open bore, half a period,
 * less what the bell filter and the reed junction delay. JET: the bore, a period less the
 * junction, and the jet a JET fraction of it.
 */
Fzpp6Voice.prototype.aimSustained = function aimSustained(core, f) {
  var sr = core.rate;
  var p = core.patch;
  f = Math.min(sr / 5, Math.max(20, f));
  var N = sr / f;
  var w0 = 2 * Math.PI * f / sr;
  var l1 = this.l1, l2 = this.l2;
  if (this.exType === 'bow') {
    var t60 = this.released ? Math.min(this.t60, p.amp.release) : this.t60;
    l1.tune(f, sr, t60, t60 * this.damp, 0, 0);
    var tot = Math.max(4, (N - l1.fdel) * FZPP6_BOW_TUNE);
    var beta = p.exciter.position;
    l1.fdel = 0; l1.tuned = false; l1.aim(beta * tot); this.aim1 = beta * tot;
    l2.aim((1 - beta) * tot); this.aim2 = (1 - beta) * tot;
  } else if (this.exType === 'sax') {
    // STK's Saxofony: the reed part-way along a FULL-period bore (WHERE), so the bore has
    // every harmonic where the clarinet's closed one has the odd ones.
    // Its regime plays sharp of the bore by 11 cents and then a further 1.7 − 1.9e-5·N²
    // samples (measured 23 Oct 2026, at the reed position the sax is fixed at): the bore is
    // that much longer. The reed sits a fifth of the way along: moving it changed the tuning
    // at the top of the board by 30 cents, which is a reason to fix it, not a pot.
    var boreS = Math.max(6, N * 1.0064 - 3 + 1.7 - 1.9e-5 * N * N);
    var pos = 0.2;
    this.aim1 = Math.max(3, (1 - pos) * boreS);
    this.aim2 = Math.max(3, pos * boreS);
    l1.aim(this.aim1);
    l2.aim(this.aim2);
  } else if (this.exType === 'reed') {
    // A closed-open bore: half a period, less the bell's one sample and the reed's half —
    // and less what the reed junction pulls the regime sharp by, measured 23 Oct 2026 as a
    // straight line in the bore's length (0.53 + 0.0027 per sample of bore, the same at
    // every pressure), which brings the whole range within a few cents.
    var half = N / 2;
    this.aim1 = Math.max(2, half - 1.5 + 0.53 + 0.0027 * half);
    l1.aim(this.aim1);
  } else {
    // STK's flute: the bore is a period and a half and the jet makes it overblow — the
    // note is the bore's second mode. The jet is a JET fraction of the bore. The jet's
    // regime plays 50 cents sharp of that bore at every pitch (measured 23 Oct 2026), so
    // the bore is that much longer.
    var bore = 1.5 * N * 1.0293 / 1.00347;
    // ...plus the small sharpness left at the top (32000/bore² cents, i.e. 18.5/bore samples).
    this.aim1 = Math.max(4, bore - 2 + 18.5 / bore);
    l1.aim(this.aim1);
    this.aim2 = Math.max(2, bore * this.jetRatio);
    l2.aim(this.aim2);
  }
  this.tuned = true;
};

Fzpp6Voice.prototype.release = function release(core) {
  if (this.released) return;
  var p = core.patch;
  var sr = core.rate;
  this.released = true;
  this.aStage = 2;
  this.aInc = 0;
  this.fStage = 2;
  this.retune(core);
  // The bow lifts, the breath stops: the pressure falls over RELEASE and the loop rings down
  // on its own loss. Nothing else of a note-off applies to a sustained voice.
  if (this.sustained) return;
  // Whatever of the pluck is still going in fades at the same rate the string now dies at,
  // so a chopped chord is chopped — the body's tail included — rather than ringing on.
  this.excFadeK = Math.pow(10, -3 / (p.amp.release * sr));
  if (p.damping.lift > 0 && core.tables.scrape.length) {
    this.liftT = core.tables.scrape[core.tables.scrape.length - 1];
    this.liftG = p.damping.lift * 0.5 * this.lev;
    this.liftPos = 0;
    this.liftOn = true;
  }
};

/** The pitch, in octaves, at 'ahead' frames from now: glide, vibrato and TENSION. */
Fzpp6Voice.prototype.pitchAhead = function pitchAhead(core, ahead) {
  var play = core.play;
  var sr = core.rate;
  if (this.glideRate > 0) {
    var step = this.glideRate * ahead;
    var d = this.logTarget - this.logPitch;
    this.logPitch = Math.abs(d) <= step ? this.logTarget : this.logPitch + (d > 0 ? step : -step);
    if (this.logPitch === this.logTarget) this.glideRate = 0;
  }
  var semis = this.tensionC / 100;
  var vib = play.vibrato;
  if (vib) {
    this.vibPhase += 2 * Math.PI * vib.rate * ahead / sr;
    if (this.vibPhase > 2 * Math.PI) this.vibPhase -= 2 * Math.PI;
    var ph = this.vibPhase;
    var wave;
    if (vib.type === 'triangle') wave = 1 - 4 * Math.abs(ph / (2 * Math.PI) - 0.5);
    else if (vib.type === 'square') wave = ph < Math.PI ? 1 : -1;
    else if (vib.type === 'sawtooth') wave = ph / Math.PI - 1;
    else wave = Math.sin(ph);
    var ramp = vib.delay > 0 ? Math.min(1, (this.age + ahead) / (vib.delay * sr)) : 1;
    semis += vib.depth * wave * ramp;
  }
  return this.logPitch + semis / 12;
};

/** Legato: a new note on a string still sounding — the fret moves, nothing is plucked. */
Fzpp6Voice.prototype.retarget = function retarget(core, hz, eventId) {
  var sr = core.rate;
  var cents = core.patch.string.detune * FZPP6_DETUNE[this.string];
  var f = Math.min(sr / 5, Math.max(20, hz * Math.pow(2, cents / 1200)));
  this.logTarget = Math.log2(f);
  this.hz = hz;
  this.eventId = eventId;
  if (core.play.glide > 0) {
    this.glideRate = Math.abs(this.logTarget - this.logPitch) / (core.play.glide * sr);
  } else {
    this.logPitch = this.logTarget;
    this.glideRate = 0;
  }
};

// ---- the sustained exciters -------------------------------------------------------------------
//
// Three physical junctions driving the loops, after STK's Bowed, Clarinet and Flute (Cook &
// Scavone): a bow-string friction table, a reed table, and a jet's cubic. Each runs as one
// tight loop with its state in locals, as the string does, and reads its delays through the
// moving (Lagrange) read, so glide, vibrato and legato move the pitch continuously. The
// pressure is the AMP envelope (ag, ai) times PRESSURE: the player leaning in and easing off.

function fzpp6Noise(v) {
  v.rng = (Math.imul(v.rng, 1664525) + 1013904223) >>> 0;
  return v.rng / 2147483648 - 1;
}

Fzpp6Voice.prototype.runBow = function runBow(o, n) {
  var l1 = this.l1, l2 = this.l2;
  var b1 = l1.buf, m1 = l1.mask, w1 = l1.w, D1 = l1.D, dD1 = l1.dD;
  var b2 = l2.buf, m2 = l2.mask, w2 = l2.w, D2 = l2.D, dD2 = l2.dD;
  var lg = l1.lg, la = l1.la, lp1 = l1.lp1;
  var slope = this.bowSlope, speed = this.bowSpeed, nz = this.noiseG * 0.02;
  var ag = this.aVal, ai = this.aInc;
  var peak = 0;
  for (var i = 0; i < n; i++) {
    var di = D1 | 0, x = D1 - di + 1;
    var xm1 = x - 1, xm2 = x - 2, xm3 = x - 3;
    var rb = -xm1 * xm2 * xm3 / 6 * b1[(w1 - di + 1) & m1] + x * xm2 * xm3 / 2 * b1[(w1 - di) & m1]
      - x * xm1 * xm3 / 2 * b1[(w1 - di - 1) & m1] + x * xm1 * xm2 / 6 * b1[(w1 - di - 2) & m1];
    di = D2 | 0; x = D2 - di + 1; xm1 = x - 1; xm2 = x - 2; xm3 = x - 3;
    var rn = -xm1 * xm2 * xm3 / 6 * b2[(w2 - di + 1) & m2] + x * xm2 * xm3 / 2 * b2[(w2 - di) & m2]
      - x * xm1 * xm3 / 2 * b2[(w2 - di - 1) & m2] + x * xm1 * xm2 / 6 * b2[(w2 - di - 2) & m2];
    D1 += dD1; D2 += dD2;
    // The bridge reflects through the string's loss; the nut reflects whole.
    var lp = lg * rb - la * lp1; lp1 = lp;
    var bridgeRefl = -lp;
    var nutRefl = -rn;
    var bowVel = speed * ag * (1 + nz * fzpp6Noise(this));
    var velDiff = bowVel - (bridgeRefl + nutRefl);
    var t = velDiff * slope + 0.001;
    if (t < 0) t = -t;
    t += 0.75;
    t = t * t; t = 1 / (t * t);
    if (t > 1) t = 1;
    var newVel = velDiff * t;
    b2[w2] = bridgeRefl + newVel;
    b1[w1] = nutRefl + newVel;
    w1 = (w1 + 1) & m1; w2 = (w2 + 1) & m2;
    ag += ai;
    var out = rb;
    o[i] = out;
    if (out < 0) out = -out;
    if (out > peak) peak = out;
  }
  l1.w = w1; l1.D = D1; l2.w = w2; l2.D = D2; l1.lp1 = lp1;
  this.aVal = ag;
  l1.peak = peak;
};

Fzpp6Voice.prototype.runReed = function runReed(o, n) {
  var l1 = this.l1;
  var b1 = l1.buf, m1 = l1.mask, w1 = l1.w, D1 = l1.D, dD1 = l1.dD;
  var c = this.bellK, h = (1 - c) * 0.5, x1 = this.rx1, x2 = this.rx2;
  var slope = this.reedSlope, press = this.press, nz = this.noiseG * 0.2;
  var ag = this.aVal, ai = this.aInc;
  var peak = 0;
  for (var i = 0; i < n; i++) {
    var di = D1 | 0, x = D1 - di + 1;
    var xm1 = x - 1, xm2 = x - 2, xm3 = x - 3;
    var r = -xm1 * xm2 * xm3 / 6 * b1[(w1 - di + 1) & m1] + x * xm2 * xm3 / 2 * b1[(w1 - di) & m1]
      - x * xm1 * xm3 / 2 * b1[(w1 - di - 1) & m1] + x * xm1 * xm2 / 6 * b1[(w1 - di - 2) & m1];
    D1 += dD1;
    var fl = c * x1 + h * (r + x2);
    x2 = x1; x1 = r;
    var breath = press * ag * (1 + nz * fzpp6Noise(this));
    var pd = -0.95 * fl - breath;
    var rt = 0.7 + slope * pd;
    if (rt > 1) rt = 1; else if (rt < -1) rt = -1;
    b1[w1] = breath + pd * rt;
    w1 = (w1 + 1) & m1;
    ag += ai;
    o[i] = r;
    var a = r < 0 ? -r : r;
    if (a > peak) peak = a;
  }
  l1.w = w1; l1.D = D1; this.rx1 = x1; this.rx2 = x2;
  this.aVal = ag;
  l1.peak = peak;
};

Fzpp6Voice.prototype.runSax = function runSax(o, n) {
  var l1 = this.l1, l2 = this.l2;
  var b1 = l1.buf, m1 = l1.mask, w1 = l1.w, D1 = l1.D, dD1 = l1.dD;
  var b2 = l2.buf, m2 = l2.mask, w2 = l2.w, D2 = l2.D, dD2 = l2.dD;
  var c = this.bellK, h = (1 - c) * 0.5, x1 = this.rx1, x2 = this.rx2;
  var slope = this.saxSlope, press = this.press, nz = this.noiseG * 0.2;
  var ag = this.aVal, ai = this.aInc;
  var peak = 0;
  for (var i = 0; i < n; i++) {
    var di = D1 | 0, x = D1 - di + 1;
    var xm1 = x - 1, xm2 = x - 2, xm3 = x - 3;
    var r0 = -xm1 * xm2 * xm3 / 6 * b1[(w1 - di + 1) & m1] + x * xm2 * xm3 / 2 * b1[(w1 - di) & m1]
      - x * xm1 * xm3 / 2 * b1[(w1 - di - 1) & m1] + x * xm1 * xm2 / 6 * b1[(w1 - di - 2) & m1];
    di = D2 | 0; x = D2 - di + 1; xm1 = x - 1; xm2 = x - 2; xm3 = x - 3;
    var r1 = -xm1 * xm2 * xm3 / 6 * b2[(w2 - di + 1) & m2] + x * xm2 * xm3 / 2 * b2[(w2 - di) & m2]
      - x * xm1 * xm3 / 2 * b2[(w2 - di - 1) & m2] + x * xm1 * xm2 / 6 * b2[(w2 - di - 2) & m2];
    D1 += dD1; D2 += dD2;
    // The bell end reflects through the lowpass, inverted; the mouthpiece end whole.
    var fl = c * x1 + h * (r0 + x2);
    x2 = x1; x1 = r0;
    var temp = -0.95 * fl;
    var out = temp - r1;
    var breath = press * ag * (1 + nz * fzpp6Noise(this));
    var pd = breath - out;
    var rt = 0.7 + slope * pd;
    if (rt > 1) rt = 1; else if (rt < -1) rt = -1;
    b2[w2] = temp;
    b1[w1] = breath - pd * rt - temp;
    w1 = (w1 + 1) & m1; w2 = (w2 + 1) & m2;
    ag += ai;
    out *= 0.3;
    o[i] = out;
    if (out < 0) out = -out;
    if (out > peak) peak = out;
  }
  l1.w = w1; l1.D = D1; l2.w = w2; l2.D = D2; this.rx1 = x1; this.rx2 = x2;
  this.aVal = ag;
  l1.peak = peak;
};

Fzpp6Voice.prototype.runJet = function runJet(o, n) {
  var l1 = this.l1, l2 = this.l2;
  var b1 = l1.buf, m1 = l1.mask, w1 = l1.w, D1 = l1.D, dD1 = l1.dD;
  var b2 = l2.buf, m2 = l2.mask, w2 = l2.w, D2 = l2.D, dD2 = l2.dD;
  var x1 = this.rx1, x2 = this.rx2, dx = this.jdx, dy = this.jdy;
  var press = this.press, nz = this.noiseG * 0.15;
  var ag = this.aVal, ai = this.aInc;
  var peak = 0;
  for (var i = 0; i < n; i++) {
    var di = D1 | 0, x = D1 - di + 1;
    var xm1 = x - 1, xm2 = x - 2, xm3 = x - 3;
    var rb = -xm1 * xm2 * xm3 / 6 * b1[(w1 - di + 1) & m1] + x * xm2 * xm3 / 2 * b1[(w1 - di) & m1]
      - x * xm1 * xm3 / 2 * b1[(w1 - di - 1) & m1] + x * xm1 * xm2 / 6 * b1[(w1 - di - 2) & m1];
    di = D2 | 0; x = D2 - di + 1; xm1 = x - 1; xm2 = x - 2; xm3 = x - 3;
    var jd = -xm1 * xm2 * xm3 / 6 * b2[(w2 - di + 1) & m2] + x * xm2 * xm3 / 2 * b2[(w2 - di) & m2]
      - x * xm1 * xm3 / 2 * b2[(w2 - di - 1) & m2] + x * xm1 * xm2 / 6 * b2[(w2 - di - 2) & m2];
    D1 += dD1; D2 += dD2;
    // The bore's end: a linear-phase lowpass reflection (see the reed's bell), inverted,
    // DC-blocked.
    var fl = 0.5 * x1 + 0.25 * (rb + x2);
    x2 = x1; x1 = rb;
    var temp = -fl;
    var yd = temp - dx + 0.995 * dy; dx = temp; dy = yd; temp = yd;
    var breath = press * ag * (1 + nz * fzpp6Noise(this));
    var pd = breath - 0.5 * temp;
    b2[w2] = pd;
    var jt = jd * (jd * jd - 1);
    if (jt > 1) jt = 1; else if (jt < -1) jt = -1;
    var pd2 = jt + 0.5 * temp;
    b1[w1] = pd2;
    w1 = (w1 + 1) & m1; w2 = (w2 + 1) & m2;
    ag += ai;
    var out = 0.3 * pd2;
    o[i] = out;
    if (out < 0) out = -out;
    if (out > peak) peak = out;
  }
  l1.w = w1; l1.D = D1; l2.w = w2; l2.D = D2; this.rx1 = x1; this.rx2 = x2; this.jdx = dx; this.jdy = dy;
  this.aVal = ag;
  l1.peak = peak;
};

// ---- the core ------------------------------------------------------------------------------

function Fzpp6Core(options) {
  var o = options || {};
  this.rate = o.sampleRate || 44100;
  // A power of two holding a 20 Hz period, so the read wraps with a mask.
  var need = Math.ceil(this.rate / 20) + 8;
  var size = 1;
  while (size < need) size <<= 1;
  this.lineSize = size;
  this.strings = [];
  this.voices = [];
  for (var i = 0; i < FZPP6_STRING_COUNT; i++) {
    var s = { index: i, cur: 0, pluckFrame: -1e15, voices: [] };
    for (var k = 0; k < 2; k++) {
      var v = new Fzpp6Voice(this, i);
      s.voices.push(v);
      this.voices.push(v);
    }
    this.strings.push(s);
  }
  this.e1 = new Float64Array(FZPP6_CTRL);
  this.e2 = new Float64Array(FZPP6_CTRL);
  this.o = new Float64Array(FZPP6_CTRL);
  this.pending = [];
  this.pendingHead = 0;
  this.fadeFrames = Math.round(FZPP6_FADE_SECONDS * this.rate);
  this.chordFrames = Math.round(FZPP6_CHORD_SECONDS * this.rate);
  this.dcR = 1 - 2 * Math.PI * 25 / this.rate;
  // The peak hold falls with a 50 ms time constant, sampled once a window.
  this.holdFall = Math.exp(-FZPP6_WINDOW / (0.05 * this.rate));
  this.dcX = [0, 0]; this.dcY = [0, 0];
  this.lf = [0, 0, 0, 0];
  this.laneIdle = true;
  this.quietUntil = 0;
  this.lastVoice = null;
  this.late = 0; this.worstLate = 0; this.steals = 0; this.nonFinite = 0;
  this.patch = null;
  this.noteLevel = 1;
}

/**
 * Install a compiled patch (tables.js 'compileFzpp6'): the clamped preset, its play
 * controls and its tables. A note already ringing keeps the loop it was solved with; the
 * next pluck gets the new patch.
 */
Fzpp6Core.prototype.installPatch = function installPatch(compiled) {
  this.patch = compiled;
  this.tables = compiled.tables;
  this.play = compiled.play || { mode: 'poly', glide: 0, vibrato: null };
  var tuning = FZPP6_TUNINGS[compiled.strings.tuning];
  this.open = null;
  if (tuning) {
    this.open = [];
    for (var i = 0; i < tuning.length; i++) this.open.push(440 * Math.pow(2, (tuning[i] - 69) / 12));
  }
  this.moving = !!this.play.vibrato || this.play.glide > 0 || this.play.mode === 'legato';
  this.drive = compiled.drive || null;
  this.driveTone = this.drive ? 1 - Math.exp(-2 * Math.PI * Math.min(this.drive.tone, 0.45 * this.rate) / this.rate) : 0;
  var f = compiled.filter;
  this.filterOn = !!f;
  // Not while the DRIVE is on: PRE and POST are the two sides of the FILTER, and a filter
  // collapsed onto the lane would sit after both.
  this.collapsed = !!f && compiled.internal.collapse && !compiled.drive
    && compiled.filterEnv.amount === 0 && f.keyTrack === 0;
  if (this.collapsed) {
    var c = this.svf(f.cutoff, f.resonance);
    this.lc = c;
  }
  // The lane body: the A/B, and nothing otherwise.
  this.laneBody = null;
  if (this.tables.lane && this.tables.modes.length) {
    var modes = this.tables.modes;
    var count = Math.min(modes.length / 3, compiled.internal.laneModes);
    var lb = { count: count, mix: compiled.body.mix, k: [], a1: [], a2: [], a3: [], g: [],
      st: new Float64Array(count * 4) };
    for (var m = 0; m < count; m++) {
      var co = this.svf(modes[m * 3], modes[m * 3 + 1]);
      lb.k.push(co.k); lb.a1.push(co.a1); lb.a2.push(co.a2); lb.a3.push(co.a3);
      lb.g.push(modes[m * 3 + 2]);
    }
    this.laneBody = lb;
  }
};

/** The measured level correction at this pitch (tables.js, EVEN UP THE NECK). */
Fzpp6Core.prototype.levelAt = function levelAt(hz) {
  var c = this.patch.levelCurve;
  if (!c || !c.length) return 1;
  var m = 69 + 12 * Math.log2(hz / 440);
  var x = (m - FZPP6_LEVEL_LO) / FZPP6_LEVEL_STEP;
  if (x <= 0) return c[0];
  if (x >= c.length - 1) return c[c.length - 1];
  var i = x | 0;
  return c[i] + (c[i + 1] - c[i]) * (x - i);
};

/** Back to silence: every voice gone, the queue empty, the lane's own filters cleared. */
Fzpp6Core.prototype.reset = function reset() {
  for (var i = 0; i < this.voices.length; i++) this.voices[i].kill();
  for (var j = 0; j < this.strings.length; j++) { this.strings[j].pluckFrame = -1e15; this.strings[j].cur = 0; }
  this.pending.length = 0;
  this.pendingHead = 0;
  this.dcX[0] = this.dcX[1] = this.dcY[0] = this.dcY[1] = 0;
  for (i = 0; i < 4; i++) this.lf[i] = 0;
  if (this.laneBody) this.laneBody.st.fill(0);
  this.laneIdle = true;
  this.lastVoice = null;
};

/** TPT SVF coefficients (Simper). The same six lines as tables.js — see its header. */
Fzpp6Core.prototype.svf = function svf(f, q) {
  var g = Math.tan(Math.PI * Math.min(f, 0.45 * this.rate) / this.rate);
  var k = 1 / q;
  var a1 = 1 / (1 + g * (g + k));
  var a2 = g * a1;
  return { k: k, a1: a1, a2: a2, a3: g * a2 };
};

Fzpp6Core.prototype.schedule = function schedule(event) {
  if (this.pendingHead === this.pending.length) {
    this.pending.length = 0;
    this.pendingHead = 0;
  } else if (this.pendingHead > 64 && this.pendingHead * 2 > this.pending.length) {
    this.pending.splice(0, this.pendingHead);
    this.pendingHead = 0;
  }
  var frame = Math.max(0, Math.round(event.frame || 0));
  var q = { type: event.type, frame: frame, eventId: event.eventId, hz: event.hz,
    velocity: event.velocity, level: event.level, durFrames: event.durFrames, releaseAtStart: false };
  var at = this.pending.length;
  while (at > this.pendingHead && this.pending[at - 1].frame > frame) at--;
  this.pending.splice(at, 0, q);
  if (event.type === 'noteOn' && event.durFrames > 0) {
    this.schedule({ type: 'noteOff', frame: frame + Math.round(event.durFrames), eventId: event.eventId });
  }
};

Fzpp6Core.prototype.scheduleAll = function scheduleAll(events) {
  if (this.pendingHead > 0) {
    this.pending.splice(0, this.pendingHead);
    this.pendingHead = 0;
  }
  for (var i = 0; i < events.length; i++) {
    var e = events[i];
    this.pending.push({ type: e.type, frame: Math.max(0, Math.round(e.frame || 0)),
      eventId: e.eventId, hz: e.hz, velocity: e.velocity, level: e.level, durFrames: e.durFrames,
      releaseAtStart: false });
    if (e.type === 'noteOn' && e.durFrames > 0) {
      this.pending.push({ type: 'noteOff', frame: Math.max(0, Math.round(e.frame || 0)) + Math.round(e.durFrames),
        eventId: e.eventId });
    }
  }
  this.pending.sort(function (a, b) { return a.frame - b.frame; });
};

/** Which string a note goes to — see the header. */
Fzpp6Core.prototype.assign = function assign(hz, frame) {
  var strings = this.strings;
  var since = frame - this.chordFrames;
  var j;
  if (this.open) {
    var idx = 0;
    for (j = 0; j < this.open.length; j++) if (this.open[j] <= hz * 1.0003) idx = j;
    for (j = idx; j >= 0; j--) if (strings[j].pluckFrame <= since) return j;
    return idx;
  }
  var best = -1;
  for (j = 0; j < strings.length; j++) {
    var v = strings[j].voices[strings[j].cur];
    if (!v.active && strings[j].pluckFrame <= since) return j;
  }
  // FREE and full: the oldest pluck, a released one first.
  var bestScore = Infinity;
  for (j = 0; j < strings.length; j++) {
    var cur = strings[j].voices[strings[j].cur];
    var score = strings[j].pluckFrame + (cur.active && !cur.released ? 1e12 : 0);
    if (score < bestScore) { bestScore = score; best = j; }
  }
  this.steals++;
  return best;
};

Fzpp6Core.prototype.pluck = function pluck(j, hz, vel, eventId, frame, fromHz, releaseAtStart) {
  var s = this.strings[j];
  var old = s.voices[s.cur];
  if (old.active) old.fadeOut(this.fadeFrames);
  s.cur ^= 1;
  var v = s.voices[s.cur];
  if (v.active) v.kill();
  v.start(this, hz, vel, eventId, frame, fromHz);
  this.handNoises(v, old, hz);
  s.pluckFrame = frame;
  this.laneIdle = false;
  // A voice begun between two grid lines gets its envelopes set up to the next one.
  var into = frame % FZPP6_CTRL;
  this.controlVoice(v, frame, FZPP6_CTRL - into, into === 0);
  if (releaseAtStart) v.release(this);
  return v;
};

/**
 * The fretting hand's own noises, decided at the moment a note begins.
 *
 *   FRET    a tick as a string is pressed onto a fret: on a fretted note whose string was
 *           open, muted, or held at another pitch. Never on a chuck — a chuck is unfretted.
 *   SQUEAK  fingers sliding along the string to a new fret: when a string that is still
 *           ringing moves to another pitch. Wound strings squeak most; plain ones a little over half as much.
 *
 * Their levels are fractions of FZPP6_LEVEL, so the balance between hand and string Peter
 * approved (23 Oct 2026) holds whatever the engine's overall scale is.
 *
 * Both go straight into the voice's output — the sound of the hand, not of the string — so
 * the FILTER and AMP still shape them, and a steal's fade takes them with it.
 */
Fzpp6Core.prototype.handNoises = function handNoises(v, old, hz) {
  var d = this.patch.damping;
  var t = this.tables;
  if (v.chuck) return;
  var moved = old && old.active && !old.chuck && Math.abs(12 * Math.log2(hz / old.hz)) >= 0.5;
  var wound = !this.open || v.string < 3 ? 1 : 0.6;
  if (d.fret > 0 && t.fret && (!old || !old.active || old.chuck || moved)) {
    v.nT = t.fret; v.nPos = 0; v.nG = d.fret * 1.125 * FZPP6_LEVEL * v.vel;
  }
  if (d.squeak > 0 && t.squeak && moved) {
    this.squeakOn(v, d.squeak * 0.75 * FZPP6_LEVEL * v.vel * wound);
  }
};

/**
 * Start a squeak, never the same one twice. A hand does not make an identical noise on
 * every shift, and one table played the same way each time was heard as a rhythm of its
 * own. So each squeak is read at its own rate — 0.7x to 1.4x, which moves both its length
 * and its pitch — and at its own level, both seeded from the event, so a render repeats.
 */
Fzpp6Core.prototype.squeakOn = function squeakOn(v, gain) {
  var h = fzpp6Hash(v.eventId, v.string + 17);
  v.sqT = this.tables.squeak;
  v.sqPos = 0;
  v.sqRate = 0.7 + 0.7 * ((h & 0xffff) / 65536);
  v.sqG = gain * (0.55 + 0.45 * ((h >>> 16) / 65536));
};

Fzpp6Core.prototype.markEarlyOff = function markEarlyOff(eventId) {
  var pending = this.pending;
  var limit = Math.min(pending.length, this.pendingHead + 64);
  for (var i = this.pendingHead; i < limit; i++) {
    if (pending[i].eventId === eventId && pending[i].type === 'noteOn') {
      pending[i].releaseAtStart = true;
      return;
    }
  }
};

Fzpp6Core.prototype.apply = function apply(event, frame) {
  var i;
  if (event.type === 'noteOn') {
    if (!this.patch) return;
    var list = Array.isArray(event.hz) ? event.hz : [event.hz];
    var hzs = [];
    for (i = 0; i < list.length; i++) if (list[i] > 0 && isFinite(list[i])) hzs.push(list[i]);
    if (!hzs.length) return;
    var vel = event.velocity == null ? 1 : Math.min(1, Math.max(0, Number(event.velocity) || 0));
    // LEVEL is how loud, VELOCITY how hard: the rack's gain and the note's strength are two
    // things here, because velocity also chooses a chuck (MUTED BELOW) and the brightness.
    this.noteLevel = event.level == null ? 1 : Math.min(8, Math.max(0, Number(event.level) || 0));
    var mode = this.play.mode;
    if (mode !== 'poly') {
      var top = Math.max.apply(null, hzs);
      var held = this.lastVoice;
      if (mode === 'legato' && held && held.active && !held.released && !held.fading) {
        var was = held.hz;
        held.retarget(this, top, event.eventId);
        // A slide is the hand moving along the string: it squeaks, and a hammer-on ticks.
        if (Math.abs(12 * Math.log2(top / was)) >= 0.5) {
          var dd = this.patch.damping;
          if (dd.squeak > 0 && this.tables.squeak) this.squeakOn(held, dd.squeak * 0.75 * FZPP6_LEVEL * held.vel);
          if (dd.fret > 0 && this.tables.fret && this.play.glide === 0) { held.nT = this.tables.fret; held.nPos = 0; held.nG = dd.fret * 1.125 * FZPP6_LEVEL * held.vel; }
        }
        if (event.releaseAtStart) held.release(this);
        return;
      }
      var from = held && held.active ? held.hz : 0;
      for (i = 0; i < this.voices.length; i++) {
        if (this.voices[i].active) this.voices[i].fadeOut(this.fadeFrames);
      }
      this.lastVoice = this.pluck(this.assign(top, frame), top, vel, event.eventId, frame, from,
        event.releaseAtStart);
      return;
    }
    // Highest first, so the top of a chord gets the top strings and a clash moves the
    // LOWER note down a string, as a hand would.
    hzs.sort(function (a, b) { return b - a; });
    for (i = 0; i < hzs.length; i++) {
      this.pluck(this.assign(hzs[i], frame), hzs[i], vel, event.eventId, frame, 0,
        event.releaseAtStart);
    }
  } else if (event.type === 'noteOff') {
    var found = false;
    for (i = 0; i < this.voices.length; i++) {
      var v = this.voices[i];
      if (v.active && !v.released && v.eventId === event.eventId) { v.release(this); found = true; }
    }
    if (!found) this.markEarlyOff(event.eventId);
  } else if (event.type === 'choke' || event.type === 'panic') {
    for (i = 0; i < this.voices.length; i++) this.voices[i].fadeOut(this.fadeFrames);
    this.lastVoice = null;
    if (event.type === 'panic') { this.pending.length = 0; this.pendingHead = 0; }
  }
};

/**
 * The control grid, for one voice: envelopes to the next grid line, the filter's
 * coefficients for this stretch, the moving read's target, and — on the coarser grids —
 * the loop's re-solve and the retire test.
 */
Fzpp6Core.prototype.controlVoice = function controlVoice(v, frame, n, onGrid) {
  var p = this.patch;
  var sr = this.rate;
  if (onGrid && frame % FZPP6_WINDOW === 0 && v.age > 0) {
    // A peak HOLD, not the window's own peak: a low string's first trips are a pulse
    // train with silence between the pulses longer than a window, and a window that
    // happened to fall in a gap must not read as a string that has died.
    v.hold = Math.max(v.winPeak, v.hold * this.holdFall);
    if (v.age <= 0.05 * sr + v.period && v.hold > v.attackPeak) v.attackPeak = v.hold;
    if (!v.excOn && !v.liftOn && !v.nT && !v.sqT && v.hold < FZPP6_SILENT && v.age > v.period + FZPP6_WINDOW) {
      v.kill();
      return;
    }
    v.winPeak = 0;
  }
  // AMP
  var a = v.aVal;
  var next = a;
  if (v.aStage === 0) {
    next = a + n / (p.amp.attack * sr);
    if (next >= 1) { next = 1; v.aStage = 1; }
  } else if (v.aStage === 1) {
    next = p.amp.sustain + (a - p.amp.sustain) * Math.exp(-n * 4.6 / (p.amp.decay * sr));
  } else if (v.sustained) {
    // The bow lifting, the breath stopping: the pressure falls to nothing over RELEASE.
    next = a * Math.exp(-n * 4.6 / (p.amp.release * sr));
    if (next < 1e-4) next = 0;
  }
  v.aInc = (next - a) / n;
  // FILTER and its envelope
  if (this.filterOn && !this.collapsed) {
    var fe = p.filterEnv;
    var fv = v.fVal;
    if (v.fStage === 0) {
      fv += n / (fe.attack * sr);
      if (fv >= 1) { fv = 1; v.fStage = 1; }
    } else if (v.fStage === 1) {
      fv = fe.sustain + (fv - fe.sustain) * Math.exp(-n * 4.6 / (fe.decay * sr));
    } else {
      fv *= Math.exp(-n * 4.6 / (fe.release * sr));
    }
    v.fVal = fv;
    var cut = p.filter.cutoff * Math.pow(2, fe.amount * fv
      + p.filter.keyTrack * Math.log2(v.hz / FZPP6_KEY_REF));
    var co = this.svf(Math.max(20, cut), p.filter.resonance);
    v.fk = co.k; v.fa1 = co.a1; v.fa2 = co.a2; v.fa3 = co.a3;
  }
  // TENSION follows the string's own amplitude: sharp while it is loud, settling as it fades.
  if (v.tension > 0 && onGrid && frame % FZPP6_RETUNE === 0 && v.attackPeak > 0) {
    v.tensionC = v.tension * Math.min(1, v.hold / v.attackPeak);
  }
  if (v.dynamic && onGrid && frame % FZPP6_RETUNE === 0 && v.age > 0) v.retune(this);
  // The moving read: where the delay must be by the next grid line.
  if (v.sustained) {
    var lps = v.pitchAhead(this, n);
    v.aimSustained(this, Math.pow(2, lps));
    v.l1.dD = (v.aim1 - v.l1.D) / n;
    if (v.exType !== 'reed') v.l2.dD = (v.aim2 - v.l2.D) / n;
  } else if (v.lagrange) {
    var lp = v.pitchAhead(this, n);
    var f1 = Math.min(sr / 5, Math.pow(2, lp));
    var l1 = v.l1;
    l1.dD = (Math.max(2, sr / f1 - l1.fdel) - l1.D) / n;
    if (v.course) {
      var l2 = v.l2;
      l2.dD = (Math.max(2, sr / Math.min(sr / 5, f1 * v.courseRatio) - l2.fdel) - l2.D) / n;
    }
  }
};

/** One voice, n frames (never past the next grid line), into the lane at 'at'. */
Fzpp6Core.prototype.renderVoice = function renderVoice(v, L, R, at, n) {
  var e1 = this.e1, e2 = this.e2, o = this.o;
  var i;
  if (v.sustained) {
    if (v.exType === 'bow') v.runBow(o, n);
    else if (v.exType === 'reed') v.runReed(o, n);
    else if (v.exType === 'sax') v.runSax(o, n);
    else v.runJet(o, n);
    var kS = v.lev * v.outK;
    for (i = 0; i < n; i++) o[i] *= kS;
  } else if (v.excOn || v.liftOn) {
    var T = v.excT, U = v.excU, gT = v.gT, gU = v.gU;
    var pos = v.excPos;
    var c1 = v.comb1, c2 = v.comb2, d2 = v.e2Delay;
    var bc = v.bc, b1 = v.b1, b2 = v.b2, fade = v.excFade, fk = v.excFadeK;
    var bh = v.bh, h1 = v.h1, h2 = v.h2;
    var pc = v.pc, q1 = v.q1, q2 = v.q2;
    var course = v.course;
    for (i = 0; i < n; i++) {
      var x = 0, y = 0;
      if (v.excOn) {
        if (T) x = gT * (fzpp6Tap(T, pos) - fzpp6Tap(T, pos - c1));
        if (U) x += gU * (fzpp6Tap(U, pos) - fzpp6Tap(U, pos - c1));
        if (course) {
          var p2 = pos - d2;
          if (T) y = gT * (fzpp6Tap(T, p2) - fzpp6Tap(T, p2 - c2));
          if (U) y += gU * (fzpp6Tap(U, p2) - fzpp6Tap(U, p2 - c2));
        }
        x *= fade; y *= fade;
        fade *= fk;
        pos++;
      }
      if (pc > 0) { q1 += pc * (x - q1); q2 += pc * (y - q2); x = q1; y = q2; }
      h1 += bh * (x - h1);
      h2 += bh * (y - h2);
      b1 += bc * (h1 - b1);
      b2 += bc * (h2 - b2);
      e1[i] = b1;
      e2[i] = b2;
      if (v.liftOn) {
        var lx = v.liftG * fzpp6Tap(v.liftT, v.liftPos++);
        e1[i] += lx;
        e2[i] += lx * 0.5;
        if (v.liftPos >= v.liftT.length) v.liftOn = false;
      }
    }
    v.excPos = pos; v.b1 = b1; v.b2 = b2; v.h1 = h1; v.h2 = h2; v.q1 = q1; v.q2 = q2; v.excFade = fade;
    if (v.excOn && pos >= v.excLen) v.excOn = false;
  } else {
    for (i = 0; i < n; i++) { e1[i] = 0; e2[i] = 0; }
  }
  if (!v.sustained) {
    v.l1.run(e1, o, n, false);
    if (v.course) v.l2.run(e2, o, n, true);
  }
  if (v.nT) {
    for (i = 0; i < n && v.nPos < v.nT.length; i++) o[i] += v.nG * v.nT[v.nPos++];
    if (v.nPos >= v.nT.length) v.nT = null;
  }
  if (v.sqT) {
    for (i = 0; i < n && v.sqPos < v.sqT.length - 1; i++) {
      o[i] += v.sqG * fzpp6Tap(v.sqT, v.sqPos);
      v.sqPos += v.sqRate;
    }
    if (v.sqPos >= v.sqT.length - 1) v.sqT = null;
  }
  var pk = v.l1.peak * (v.sustained ? v.lev * v.outK : 1);
  if (v.course && v.l2.peak > pk) pk = v.l2.peak;
  v.l1.peak = 0; v.l2.peak = 0;
  if (pk > v.winPeak) v.winPeak = pk;
  v.age += n;

  var filt = this.filterOn && !this.collapsed;
  var ftype = filt ? this.patch.filter.type : null;
  var k = v.fk, a1 = v.fa1, a2 = v.fa2, a3 = v.fa3, ic1 = v.fic1, ic2 = v.fic2;
  // A sustained voice spent its AMP envelope as the player's pressure inside the loop: its
  // output is not shaped by it again.
  var ag = v.sustained ? 1 : v.aVal, ai = v.sustained ? 0 : v.aInc;
  var fading = v.fading, fg = v.fadeGain, fs = v.fadeStep;
  var pl = v.pl, pr = v.pr;
  // DRIVE, per string, before the LEVEL: PRE ahead of the filter, POST after it — TNGR-2's
  // two places, on the same keys. The string is DC-blocked first: a pluck's first cycles
  // are one-sided, and a shaper fed that offset saturates asymmetrically — the lane's
  // blocker then swung the result 4 dB past the knee. Three ops, only while driven.
  var dr = this.drive;
  var pre = dr && dr.pre, post = dr && !dr.pre;
  var dtc = this.driveTone, dt1 = v.dt1, dcR = this.dcR, dcx = v.dcx, dcy = v.dcy;
  var lvl = v.level;
  for (i = 0; i < n; i++) {
    var s = o[i];
    if (pre) {
      var yb = s - dcx + dcR * dcy; dcx = s; dcy = yb;
      s = fzpp6Shape(dr.curve, yb, dr.scaleIn); dt1 += dtc * (s - dt1); s = dt1;
    }
    if (filt) {
      var v3 = s - ic2;
      var v1 = a1 * ic1 + a2 * v3;
      var v2 = ic2 + a2 * ic1 + a3 * v3;
      ic1 = 2 * v1 - ic1;
      ic2 = 2 * v2 - ic2;
      s = ftype === 'lowpass' ? v2 : ftype === 'highpass' ? s - k * v1 - v2 : k * v1;
    }
    if (post) {
      var yp = s - dcx + dcR * dcy; dcx = s; dcy = yp;
      s = fzpp6Shape(dr.curve, yp, dr.scaleIn); dt1 += dtc * (s - dt1); s = dt1;
    }
    s *= ag * lvl;
    ag += ai;
    if (fading) { s *= fg; fg -= fs; if (fg < 0) fg = 0; }
    L[at + i] += s * pl;
    if (R) R[at + i] += s * pr;
  }
  v.fic1 = ic1; v.fic2 = ic2; v.dt1 = dt1; v.dcx = dcx; v.dcy = dcy;
  if (!v.sustained) v.aVal = ag;
  v.fadeGain = fg;
  if (fading && fg <= 0) v.kill();
};

/** The lane's own stages over [at, at+n): collapsed filter, lane body, DC, level, guard. */
Fzpp6Core.prototype.renderLane = function renderLane(L, R, at, n) {
  var chans = R ? 2 : 1;
  var gain = this.patch ? this.patch.master.gain : 1;
  var lc = this.collapsed ? this.lc : null;
  var ftype = lc ? this.patch.filter.type : null;
  var lb = this.laneBody;
  // The lane's DC blocker stands down while the DRIVE is on: each string is blocked ahead
  // of its shaper then, and a blocker AFTER a shaper lifts the narrow side of the uneven
  // pulse a driven pluck becomes — the output read 3.5 dB over the knee the shaper can't
  // exceed. Removing the mean of a signal that has no mean is the one thing it must not do.
  var dcR = this.drive ? 0 : this.dcR;
  for (var c = 0; c < chans; c++) {
    var X = c === 0 ? L : R;
    var dx = this.dcX[c], dy = this.dcY[c];
    var ic1 = this.lf[c * 2], ic2 = this.lf[c * 2 + 1];
    for (var i = at; i < at + n; i++) {
      var s = X[i];
      if (lc) {
        var v3 = s - ic2;
        var v1 = lc.a1 * ic1 + lc.a2 * v3;
        var v2 = ic2 + lc.a2 * ic1 + lc.a3 * v3;
        ic1 = 2 * v1 - ic1;
        ic2 = 2 * v2 - ic2;
        s = ftype === 'lowpass' ? v2 : ftype === 'highpass' ? s - lc.k * v1 - v2 : lc.k * v1;
      }
      if (lb) {
        var wet = 0;
        var st = lb.st;
        for (var m = 0; m < lb.count; m++) {
          var o = (m * 2 + c) * 2;
          var b1 = st[o], b2 = st[o + 1];
          var u3 = s - b2;
          var u1 = lb.a1[m] * b1 + lb.a2[m] * u3;
          var u2 = b2 + lb.a2[m] * b1 + lb.a3[m] * u3;
          st[o] = 2 * u1 - b1;
          st[o + 1] = 2 * u2 - b2;
          wet += lb.g[m] * lb.k[m] * u1;
        }
        s = (1 - lb.mix) * s + lb.mix * wet;
      }
      var y = dcR > 0 ? s - dx + dcR * dy : s;
      dx = s; dy = y;
      y *= gain;
      if (!(y === y) || y === Infinity || y === -Infinity) { y = 0; this.nonFinite++; }
      X[i] = y;
    }
    this.dcX[c] = dx; this.dcY[c] = dy;
    this.lf[c * 2] = ic1; this.lf[c * 2 + 1] = ic2;
  }
};

Fzpp6Core.prototype.liveCount = function liveCount() {
  var n = 0;
  for (var i = 0; i < this.voices.length; i++) if (this.voices[i].active) n++;
  return n;
};

/**
 * Render count frames into channels, starting at absolute frame startFrame. Events land on
 * their own frame; the control grid is absolute; so the result is independent of how the
 * caller cuts its blocks.
 */
Fzpp6Core.prototype.process = function process(channels, startFrame, count, offset) {
  var base = offset || 0;
  var L = channels[0];
  var R = channels.length > 1 ? channels[1] : null;
  var endFrame = startFrame + count;
  var pending = this.pending;
  var nextEvent = this.pendingHead < pending.length ? pending[this.pendingHead].frame : Infinity;
  L.fill(0, base, base + count);
  if (R) R.fill(0, base, base + count);
  if (this.laneIdle && nextEvent >= endFrame) return;
  var f = startFrame;
  var i;
  while (f < endFrame) {
    if (f % FZPP6_CTRL === 0) {
      for (i = 0; i < this.voices.length; i++) {
        if (this.voices[i].active) this.controlVoice(this.voices[i], f, FZPP6_CTRL, true);
      }
    }
    if (f >= nextEvent) {
      while (this.pendingHead < this.pending.length && this.pending[this.pendingHead].frame <= f) {
        var ev = this.pending[this.pendingHead++];
        if (ev.frame < startFrame) {
          this.late++;
          if (startFrame - ev.frame > this.worstLate) this.worstLate = startFrame - ev.frame;
        }
        this.apply(ev, f);
      }
      pending = this.pending;
      nextEvent = this.pendingHead < pending.length ? pending[this.pendingHead].frame : Infinity;
    }
    var stop = f - (f % FZPP6_CTRL) + FZPP6_CTRL;
    if (nextEvent < stop) stop = nextEvent;
    if (endFrame < stop) stop = endFrame;
    var n = stop - f;
    var at = base + (f - startFrame);
    var live = 0;
    for (i = 0; i < this.voices.length; i++) {
      var v = this.voices[i];
      if (v.active) { this.renderVoice(v, L, R, at, n); live++; }
    }
    if (!this.laneIdle) this.renderLane(L, R, at, n);
    // The lane's own filters ring on for a moment after the last string; it goes idle on
    // the window grid, half a second after, with its state cleared.
    if (live > 0) this.quietUntil = stop + Math.round(0.5 * this.rate);
    else if (!this.laneIdle && stop % FZPP6_WINDOW === 0 && stop >= this.quietUntil) {
      this.laneIdle = true;
      this.dcX[0] = this.dcX[1] = this.dcY[0] = this.dcY[1] = 0;
      for (i = 0; i < 4; i++) this.lf[i] = 0;
      if (this.laneBody) this.laneBody.st.fill(0);
    }
    f = stop;
  }
};

/** Which string holds what — for the tests, and later the STRINGS card's readout. */
Fzpp6Core.prototype.stringReport = function stringReport() {
  var out = [];
  for (var i = 0; i < this.strings.length; i++) {
    var s = this.strings[i];
    var v = s.voices[s.cur];
    out.push({ index: i, active: v.active, hz: v.active ? v.hz : 0, released: v.active && v.released });
  }
  return out;
};

Fzpp6Core.prototype.health = function health(frame) {
  return {
    frame: frame,
    voices: this.liveCount(),
    queued: this.pending.length - this.pendingHead,
    late: this.late,
    worstLate: this.worstLate,
    steals: this.steals,
    nonFinite: this.nonFinite
  };
};
`;

// Evaluated once, for Node — tests, tools and the reference renderer. The browser never
// takes this path; it gets the same text through the worklet.
const evaluated = new Function(`${FZPP6_DSP_SOURCE}
return { Fzpp6Core, Fzpp6Line, Fzpp6Voice, fzpp6LpDelay, fzpp6ApDelay };`)();

export const { Fzpp6Core, Fzpp6Line, Fzpp6Voice, fzpp6LpDelay, fzpp6ApDelay } = evaluated;

// Node has the core, so Node-side compiles get their level curve. See tables.js.
registerFzpp6Core(Fzpp6Core);

/** Audio time to the integer frame the core counts in — at the boundary, once. */
export const frameAt = (seconds, sampleRate) => Math.max(0, Math.round(seconds * sampleRate));

/**
 * The deterministic reference render: the same core, in plain JS, with no browser. Takes a
 * patch already compiled at this rate (tables.js `compileFzpp6`). `blockSize` exists to be
 * varied — 128 and 997 must give the same samples.
 */
export function renderFzpp6({
  events = [], seconds = 1, sampleRate = 44100, channels = 2, blockSize = 128,
  patch = null, frameOffset = 0, core: given = null,
} = {}) {
  const frames = Math.max(0, Math.ceil(seconds * sampleRate));
  const out = [];
  for (let c = 0; c < channels; c++) out.push(new Float32Array(frames));
  const core = given || new Fzpp6Core({ sampleRate });
  if (patch) core.installPatch(patch);
  core.scheduleAll(events);
  const size = Math.max(1, blockSize | 0);
  const base = Math.max(0, Math.round(frameOffset));
  for (let start = 0; start < frames; start += size) {
    core.process(out, base + start, Math.min(size, frames - start), start);
  }
  return { channels: out, sampleRate, frames, health: core.health(frames), core };
}
