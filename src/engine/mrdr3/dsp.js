/*
 * MRDR-3's DSP core — one source string, two hosts.
 *
 * docs/MRDR-3-worklet-spec.md §4. An AudioWorkletProcessor cannot import the modules
 * around it, so the obvious arrangement — a module for the browser and a copy for Node —
 * produces the one thing §2 forbids: two copies of the maths. Instead the core is a
 * STRING. The worklet gets it concatenated into its processor and loaded as a Blob; Node
 * evaluates it once and imports the classes. One string cannot drift from itself.
 *
 * What is in it, at the end of Phase 2, is the SHAPE of §5 rather than the whole synth:
 * the note-group structure, the allocator with its steal order, the frame-stamped event
 * queue, and one layer of band-limited oscillator through the global filter and VCA.
 * Layers, unison, PWM, sync, the LFOs and the drive are Phases 3 and 4. What is here is
 * built on the four Tier-A/B pieces that have already been measured against the real
 * nodes rather than on anything new.
 */
import { MRDR3_PARAMS_SOURCE } from './params.js';
import { MRDR3_PRIMITIVES_SOURCE } from './primitives.js';
import { MRDR3_OSC_SOURCE } from './osc.js';
import { MRDR3_ENV_SOURCE } from './env.js';

const CORE_SOURCE = `
// ---- the envelope: the SHARED builder, written into a timeline --------------------
//
// No longer a placeholder. mrdr3GateAdsrEvents is the same function the native path calls
// — reached here as generated source rather than as an import, because a processor cannot
// import — so the two backends draw one envelope shape and it cannot become an A/B
// difference. §3.2.
//
// The builder works in the CALLER's domain, so it is handed seconds (which is what a
// preset's attack and decay are) and its events are scaled to absolute frames on the way
// into the timeline. The note's own frame never goes through that arithmetic: it is added
// afterwards, so a note time is still rounded exactly once, at the controller boundary.
var MRDR3_FLOOR = 1e-4;
var MRDR3_MAX_UNISON = 4;

function mrdr3WriteEnvelope(param, startFrame, durSeconds, peak, e, freq, rate) {
  var built = mrdr3GateAdsrEvents(0, durSeconds, peak, e, false, freq);
  if (!built) {
    // A malformed preset leaves the note silent rather than taking the lane down with it.
    param.reset(0);
    return startFrame;
  }
  param.reset(0);
  var evs = built.events;
  for (var i = 0; i < evs.length; i++) {
    var ev = evs[i];
    var at = startFrame + ev.t * rate;
    if (ev.k === 'set') param.setValueAtTime(ev.v, at);
    else if (ev.k === 'lin') param.linearRampToValueAtTime(ev.v, at);
    else if (ev.k === 'exp') param.exponentialRampToValueAtTime(ev.v, at);
    else if (ev.k === 'cancel') param.cancelScheduledValues(at);
  }
  return startFrame + built.off * rate;
}

// ---- the moving pulse (§3.4, Tier C) -----------------------------------------------
//
// The one construction in this synth that is deliberately NOT a port. Natively a swept
// pulse is 'saw(t) - saw(t - delta)' with 'delta = duty / f(t)': two oscillators, a delay
// line, an inverter and a summing gain PER UNISON VOICE, plus a reciprocal ramp to stop a
// glided note starting at the wrong width, plus a 0.249s clamp on the delay line, and at
// duty 1.0 the two saws cancel and the layer drops out. It is the dearest single feature
// in the native path — +35 ms of wall time per audio second, measured — and every part of
// that apparatus exists to work around a delay line being the only way to sweep a width.
//
// Per sample the duty is a comparator threshold, so the whole apparatus goes: no delay
// line, no reciprocal correction, no clamp, and the cancellation cannot happen.
//
// A RAW COMPARATOR IS NOT ACCEPTABLE. A hard step between +1 and -1 has infinite
// bandwidth and folds everything above Nyquist back down as inharmonic hash. So both
// discontinuities are corrected — the one at phase 0 and the one at phase 'duty' — with
// polyBLEP: a two-sample polynomial that subtracts the aliasing a step contributes,
// applied only where the phase is within one sample of an edge.
//
// The DC term is removed as well. A pulse of duty d has mean 2d - 1, which swings with
// the modulation; leaving it in would put the LFO straight onto the layer's DC offset and
// through the drive as a thump. The native two-saw difference has exactly zero mean by
// construction, so removing it here is matching the native path, not improving on it.
// Kept for Phase 4: a hard-sync reset is a discontinuity with no two-saw identity behind
// it, so it needs a correction term rather than a second table read. Unused until then.
function mrdr3Blep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}

/**
 * One band-limited pulse sample at an arbitrary duty, as the DIFFERENCE OF TWO SAWS.
 *
 * 'pulse(p, d) = saw(p) - saw(p - d)' is exactly what the native path computes — and the
 * whole of what makes that expensive natively is that the only way to get 'saw(p - d)'
 * from a running OscillatorNode is a DelayNode, which brings the second oscillator, the
 * inverter, the summing gain, the reciprocal glide correction and the 0.249s clamp with
 * it. Per sample there is no delay: the phase is a number, so 'p - d' is a subtraction.
 *
 * Both reads come from the band-limited pyramid, so their difference is band-limited too,
 * with no correction term to tune. Measured against a pulse synthesised from every
 * partial that fits under Nyquist, and compared with the polyBLEP alternative §3.4
 * suggested:
 *
 *     110Hz d=0.50   polyBLEP 1.92%   saw-difference 1.82%
 *     440Hz d=0.15   polyBLEP 5.36%   saw-difference 5.04%
 *    5000Hz d=0.30   polyBLEP 11.92%  saw-difference 3.77%
 *
 * Equivalent where this library's PWM presets actually live — they are pads and basses —
 * and much better above, which is where a narrow duty puts its energy. The residual at
 * low pitches is the mip pyramid's own interpolation, not this: Chromium's oscillators
 * have the same property, because they are built the same way.
 *
 * The half-cycle offset lines the plateau up with the phase convention 'pulseTable' uses,
 * so a preset reads the same whether its width is static or moving.
 *
 * THIS TAKES MOVING PWM OUT OF TIER C. §3.4 listed it as a deliberate redesign needing
 * its own ear approval across 13 presets; built this way it is the same construction the
 * native path uses, minus an apparatus that existed only to work around a delay line.
 */
function mrdr3Pulse(data, stride, size, level, phase, duty) {
  var a = phase + 0.5;
  if (a >= 1) a -= 1;
  var b = a - duty;
  if (b < 0) b += 1;
  // The two reads share EVERYTHING except the phase: same pyramid, same pair of mip
  // levels, same crossfade weight between them. Calling mrdr3Read twice resolved all of
  // that twice — the clamp, both level offsets, the fraction — for two lookups that were
  // always going to want the identical answer. Resolved once here instead.
  var lo = level | 0;
  if (lo < 0) lo = 0; else if (lo > MRDR3_TOP_LEVEL) lo = MRDR3_TOP_LEVEL;
  var hi = lo + 1;
  if (hi > MRDR3_TOP_LEVEL) hi = MRDR3_TOP_LEVEL;
  var lf = level - lo;
  if (lf < 0) lf = 0; else if (lf > 1) lf = 1;
  var offLo = lo * stride;
  var offHi = hi * stride;

  var xa = a * size;
  var ia = xa | 0;
  var fa = xa - ia;
  var a0 = offLo + ia;
  var va = data[a0] + (data[a0 + 1] - data[a0]) * fa;
  if (lf > 0) {
    var a1 = offHi + ia;
    va += ((data[a1] + (data[a1 + 1] - data[a1]) * fa) - va) * lf;
  }

  var xb = b * size;
  var ib = xb | 0;
  var fb = xb - ib;
  var b0 = offLo + ib;
  var vb = data[b0] + (data[b0 + 1] - data[b0]) * fb;
  if (lf > 0) {
    var b1 = offHi + ib;
    vb += ((data[b1] + (data[b1 + 1] - data[b1]) * fb) - vb) * lf;
  }
  return vb - va;
}

/**
 * The width LFO, one per layer and shared by its unison stack.
 *
 * Shared deliberately: natively it is one modulator fanned across the voices, so the
 * stack breathes together. One per voice would be a chorus of independent pulse widths,
 * which is a different and much busier sound.
 */
function mrdr3PwmDuty(grp, li, spec, rate) {
  grp.pwmPhase[li] += spec.pwmRate / rate;
  if (grp.pwmPhase[li] >= 1) grp.pwmPhase[li] -= 1;
  if (grp.pwmOnset[li] < 1) {
    grp.pwmOnset[li] += grp.pwmOnsetStep[li];
    if (grp.pwmOnset[li] > 1) grp.pwmOnset[li] = 1;
  }
  var p = grp.pwmPhase[li];
  // sine and triangle are the only shapes the library asks for; anything else takes the
  // sine, which is what nativeWave's fallback does.
  var v = spec.pwmTri
    ? (p < 0.25 ? 4 * p : p < 0.75 ? 2 - 4 * p : 4 * p - 4)
    : Math.sin(6.283185307179586 * p);
  var duty = spec.width + spec.pwmSwing * v * grp.pwmOnset[li];
  // A duty at either limit has no pulse left in it. The native path bounds the SWING so
  // this cannot happen; the clamp is the belt to that braces.
  if (duty < 0.02) duty = 0.02; else if (duty > 0.98) duty = 0.98;
  return duty;
}

// ---- a 'through' layer's GATE ------------------------------------------------------
//
// vca:'through' takes the layer's own amp OUT: its oscillators sum at their LEVEL and the
// global VCA downstream shapes them — three VCOs into a mixer, one VCF, one VCA, the
// classic architecture this synth could describe in every respect except that a per-layer
// envelope used to be compulsory. What is left is a GATE, not an envelope: held flat, then
// taken to zero over 4ms so a stopped oscillator does not click.
function mrdr3WriteGate(param, startFrame, gateEnd, level, rate) {
  var lvl = level > MRDR3_FLOOR ? level : MRDR3_FLOOR;
  var fade = 0.004 * rate;
  param.reset(MRDR3_FLOOR);
  param.setValueAtTime(lvl, startFrame);
  param.setValueAtTime(lvl, gateEnd);
  param.linearRampToValueAtTime(MRDR3_FLOOR, gateEnd + fade);
  return gateEnd + fade;
}

/*
 * The pitch envelope, written into a timeline. Its own builder, and its own writer
 * because it speaks a third event kind ('target') the gain envelope never uses.
 *
 * Split out of Mrdr3Layer.start for the same reason mrdr3WriteEnvelope is a function: a
 * note-off REWRITES a note's envelopes for the length it turned out to have, and two
 * copies of this loop would be two chances for the released note to bend differently
 * from the one that ran its length. See Mrdr3Layer.release.
 */
function mrdr3WriteCentsEnv(param, startFrame, durSeconds, spec, rate) {
  param.reset(0);
  var built = mrdr3CentsEnvEvents(spec.pitchCents, spec.pitchEnv, 0, durSeconds, 0, 0);
  if (!built) return;
  for (var i = 0; i < built.events.length; i++) {
    var ev = built.events[i];
    var at = startFrame + ev.t * rate;
    if (ev.k === 'set') param.setValueAtTime(ev.v, at);
    else if (ev.k === 'lin') param.linearRampToValueAtTime(ev.v, at);
    else if (ev.k === 'target') param.setTargetAtTime(ev.v, at, ev.tau * rate);
  }
}

/**
 * A note's starting phase.
 *
 * ZERO, like the node it replaces. A Web Audio OscillatorNode always starts at phase 0, so
 * natively a chord's tones — and a layer's unison voices — leave together and sum
 * COHERENTLY at the onset before drifting apart, and that alignment is part of the sound
 * the library was authored and measured against. Measured: scattering a four-note pad's
 * tones cost 1.9 dB of onset that the preset's stored 'peak' already counts.
 *
 * Kept as a function because Phase 4's ensemble needs a deterministic per-unison offset
 * for its entry stagger, and that offset cannot come from a counter — state does not
 * survive a lane being rendered on its own, and a stem must contain the mix's sound.
 */
function mrdr3SeededPhase(eventId, index) {
  var h = 2166136261 ^ Math.imul((eventId | 0) + 1, 16777619);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= Math.imul((index | 0) + 1, 2654435761);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  return ((h >>> 8) & 0xffff) / 65536;
}

function Mrdr3Unison() {
  this.phase = 0; this.cents = 0; this.panL = 1; this.panR = 1; this.gain = 1;
  // When this voice's oscillator starts, absolutely. Before it the voice contributes
  // nothing AND does not advance — a stopped oscillator has no phase, so a staggered
  // voice still enters at phase zero, just later.
  this.from = 0;
  // The last cents this voice was asked for, and what they resolved to. A note with no
  // vibrato and no pitch LFO asks the same question 44100 times a second, and Math.pow
  // plus Math.log2 are not cheap questions. Comparing the SUMMED cents makes the cache
  // exact — identical input, identical output, no drift for the oracle to find.
  this.lastCents = NaN;
  this.hzNow = 0;
  this.levelNow = 0;
  // GLIDE: where this voice's pitch comes FROM and when it arrives. Declared here rather
  // than attached at note-on, so a voice keeps one shape for the whole render — an object
  // that grows a property mid-flight is an object the engine has to re-learn.
  this.glideFrom = 0;
  this.glideStart = 0;
  this.glideUntil = -1;
  // Where the MASTER is in its cycle, for a synced slave. The slave's phase is derived
  // from this rather than zeroed, so a reset lands where it happened instead of on the
  // sample boundary after it.
  this.masterPhase = 0;
}

// ---- a layer, for one tone -----------------------------------------------------------
//
// §5.1. The layer owns its gain envelope and its filter, and the filter is per LAYER and
// not per unison voice: a fat stack through one filter is a synth voice, through five it
// is a chorus of synths, and the engine voice being recreated had one.
function Mrdr3Layer(rate) {
  this.rate = rate;
  this.gain = new Mrdr3Param(MRDR3_FLOOR);
  this.filterEnv = new Mrdr3Param(0);
  this.unison = [];
  for (var i = 0; i < MRDR3_MAX_UNISON; i++) this.unison.push(new Mrdr3Unison());
  this.count = 1;
  this.filters = [new Mrdr3Biquad(rate), new Mrdr3Biquad(rate),
    new Mrdr3Biquad(rate), new Mrdr3Biquad(rate)];
  this.stages = 0;
  this.spec = null;
  this.off = 0;
  // WHERE THE NOTE BEGAN, and where its drawn length ends. A held note is booked for the
  // longest it could possibly last and ended by a note-off, and ending it means writing
  // the envelopes again for the length the note turned out to have — which cannot be done
  // from the release frame alone, because every one of those curves is drawn from the
  // note's own start. See release().
  this.startFrame = 0;
  this.endFrame = 0;
  this.hz = 440;
  this.track = 1;
  this.active = false;
  // Noise: the buffer this layer reads, one read position shared by the whole unison
  // stack (they are one source natively too), and the band that follows the note.
  this.noise = null;
  this.noisePos = 0;
  // The pitch envelope, in cents, and the FM operator — both per LAYER and both fanned
  // across the unison stack, which is the native path's arrangement and also the cheap
  // one: a pow and a sine per layer rather than per oscillator.
  this.pitchParam = new Mrdr3Param(0);
  this.pitchOn = false;
  this.fmParam = new Mrdr3Param(0);
  this.fmPhase = 0;
  this.fmInc = 0;
  this.fmDepth = 0;
  this.fmOn = false;
  // Does this layer put anything DIFFERENT on the two channels? Only a unison stack with
  // stereo width does — and when nothing does, the right channel is the left one, sample
  // for sample, so running a second filter cascade over it computes a number we already
  // have. See the mirror in process().
  this.stereo = false;
  // The corner this layer's cascade was last built for. Each section already refuses to
  // rebuild identical coefficients, but that refusal costs a call and two compares PER
  // SECTION per sample, and a static filter — twenty-six of the forty in the library have
  // no envelope depth — asked the same question for the whole life of every note. NaN so
  // the first sample of a note always builds.
  this.lastLfq = NaN;
  this.syncOn = false;
  this.syncRatio = 1;
  // The master's increment is the slave's DIVIDED by the ratio, and that division would
  // otherwise run once per sample per unison voice. The ratio is fixed for the note, so
  // its reciprocal is too.
  this.syncInv = 1;
  this.band = new Mrdr3Biquad(rate);
  this.makeup = 1;
}

Mrdr3Layer.prototype.start = function (spec, hz, frame, endFrame, rate, entryDelays) {
  this.spec = spec;
  this.active = true;
  this.hz = hz * spec.ratio;
  var count = spec.unison < 1 ? 1 : (spec.unison > MRDR3_MAX_UNISON ? MRDR3_MAX_UNISON : spec.unison);
  this.count = count;
  // 1/sqrt(count) so a stack arrives at the level one voice did — the same normalisation
  // the native path multiplies in.
  var norm = count > 1 ? 1 / Math.sqrt(count) : 1;
  // Width and unison both have to ask, exactly as the native path decides whether to build
  // a panner at all — so this is the same condition, named once and kept.
  var wide = count > 1 && spec.stereo > 0;
  this.stereo = wide;
  this.lastLfq = NaN;
  for (var u = 0; u < count; u++) {
    var v = this.unison[u];
    v.phase = 0;
    // Symmetric across the spread, as the native path places them: voice 0 flat, the last
    // sharp, the middle at centre.
    v.cents = spec.detune + (count > 1 ? spec.spread * (u / (count - 1) - 0.5) : 0);
    v.gain = norm;
    // ENTRY, in frames. Every unison voice including the first, because the native path
    // draws voice 0's stagger from the same table as the rest.
    v.from = frame + (entryDelays ? entryDelays[u] * rate : 0);
    v.lastCents = NaN;
    // Stereo placement, equal power, symmetric about the centre — and SKIPPED ENTIRELY at
    // zero width or one voice, which is not an optimisation but the sound.
    //
    // A StereoPanner at pan 0 does not pass a mono signal through: the equal-power law
    // puts cos(pi/4) = 0.707 on each side, and a mono source that is instead UP-MIXED
    // arrives at 1.0 on each. The native path builds no panner at all unless width and
    // unison both ask for one, so applying the law here made every mono layer in the
    // library 3 dB quiet — caught by the oracle going red on all fifteen pinned presets
    // at once, which is the only reason it was found before it reached a listening test.
    if (wide) {
      var pan = (u / (count - 1) - 0.5) * 2 * spec.stereo;
      var x = (pan + 1) * 0.25 * Math.PI;
      v.panL = Math.cos(x);
      v.panR = Math.sin(x);
    } else {
      v.panL = 1;
      v.panR = 1;
    }
  }
  // The width LFO starts with the note, and its onset fade is the same 'delay' the native
  // path ramps a gain over — so a pad that breathes in after a second still does.
  // The layer's own length: 'len' is a fraction of the DRAWN note, which is what makes one
  // layer live and die inside another.
  var span = (endFrame - frame) * (spec.len > 0 ? spec.len : 1);
  var layerEnd = frame + (span > 1 ? span : 1);
  this.startFrame = frame;
  this.endFrame = layerEnd;
  // The layer's own note length in SECONDS, which is the builder's domain.
  var layerSeconds = (layerEnd - frame) / rate;
  this.off = spec.through
    ? mrdr3WriteGate(this.gain, frame, layerEnd, spec.gain, rate)
    // The layer's TARGET frequency, not the note's: gateFloor asks how long a quarter of
    // THIS oscillator's cycle is, and a sub an octave down has the least of one to work
    // with. The native path passes the same thing for the same reason.
    : mrdr3WriteEnvelope(this.gain, frame, layerSeconds, spec.gain, spec.env, this.hz, rate);
  if (spec.noiseColour) {
    // A BANDPASS that follows the note, at the native path's own Q, with the bandwidth
    // makeup it derives: a bandpass keeps only its slice of the noise, the slice narrows
    // with the note, and the level goes as the square root of it — so a noise layer sits
    // at the level of the oscillators beside it at every pitch.
    var NOISE_Q = 2;
    var nyq = rate * 0.5;
    this.band.kind = 2;                       // bandpass
    this.band.reset();
    this.band.setCoeffs(this.hz, NOISE_Q);
    this.makeup = Math.sqrt(nyq / Math.max(20, this.hz / NOISE_Q));
    this.noisePos = 0;
  }
  // ---- the pitch envelope, in cents on top of the layer's own detune --------
  this.pitchOn = !!spec.pitchCents && !!spec.pitchEnv;
  if (this.pitchOn) mrdr3WriteCentsEnv(this.pitchParam, frame, layerSeconds, spec, rate);
  // ---- the FM operator: pitch fixed at the carrier's STARTING frequency ------
  //
  // Depth in hertz as a multiple of it, with its own envelope through the same builder —
  // a long decay is the modulation swelling across the note, which is what brass is.
  this.fmOn = spec.fmIndex > 0;
  if (this.fmOn) {
    this.fmPhase = 0;
    this.fmInc = (this.hz * spec.fmRatio) / rate;
    this.fmDepth = this.hz * spec.fmIndex;
    mrdr3WriteEnvelope(this.fmParam, frame, layerSeconds, 1, spec.fmEnv, this.hz, rate);
  }
  this.stages = spec.filterStages;
  if (this.stages) {
    this.track = spec.filterTrack > 0
      ? Math.pow(this.hz / 110, spec.filterTrack < 1 ? spec.filterTrack : 1) : 1;
    mrdr3WriteEnvelope(this.filterEnv, frame, layerSeconds, 1, spec.filterEnvShape, this.hz, rate);
    for (var k = 0; k < this.stages; k++) {
      this.filters[k].kind = spec.filterKind;
      this.filters[k].reset();
    }
  }
  return this.off;
};

/**
 * END THIS LAYER NOW — the key came up.
 *
 * A held note is booked for HOLD_SECONDS because nobody can know how long a finger will
 * stay down, and the envelopes are drawn ONCE at note-on across that whole length. So a
 * note-off cannot simply flip a flag: the automation it would have to interrupt is
 * already written, and the release it wants is at the far end of it.
 *
 * The envelopes are DRAWN AGAIN, for the length the note turned out to have. That is
 * exact rather than approximate, and it is the reason this is a rewrite rather than a
 * cancel-and-ramp: mrdr3GateAdsrEvents draws attack and decay from the note's own start,
 * so every event before the release is the same number it already was — nothing that has
 * already been rendered moves — and the release itself is the builder's own, with its
 * pinned gate edge and its authored curve, rather than a second dialect of release
 * invented here. §3.2's whole point is that there is one envelope shape in this project.
 *
 * A layer whose own 'len' ran out first is left alone: its release is already scheduled,
 * and a shorter note may cut a layer short but never lengthen it.
 */
Mrdr3Layer.prototype.release = function (frame, rate) {
  if (!this.active || !this.spec) return;
  var at = frame > this.startFrame ? frame : this.startFrame;
  if (at >= this.endFrame) return;
  this.endFrame = at;
  var spec = this.spec;
  var seconds = (at - this.startFrame) / rate;
  this.off = spec.through
    ? mrdr3WriteGate(this.gain, this.startFrame, at, spec.gain, rate)
    : mrdr3WriteEnvelope(this.gain, this.startFrame, seconds, spec.gain, spec.env, this.hz, rate);
  if (this.pitchOn) mrdr3WriteCentsEnv(this.pitchParam, this.startFrame, seconds, spec, rate);
  if (this.fmOn) {
    mrdr3WriteEnvelope(this.fmParam, this.startFrame, seconds, 1, spec.fmEnv, this.hz, rate);
  }
  if (this.stages) {
    mrdr3WriteEnvelope(this.filterEnv, this.startFrame, seconds, 1, spec.filterEnvShape,
      this.hz, rate);
  }
};

// ---- one sounding chord tone -----------------------------------------------------------
//
// §5.1: the tone owns the global filter and VCA because KEY FOLLOW reads THIS note's
// frequency — one filter shared across a chord is a paraphonic synth, which MRDR-3 is not.
function Mrdr3Tone(rate) {
  this.rate = rate;
  this.layers = [new Mrdr3Layer(rate), new Mrdr3Layer(rate), new Mrdr3Layer(rate)];
  this.used = 0;
  this.vca = new Mrdr3Param(MRDR3_FLOOR);
  this.filterEnv = new Mrdr3Param(0);
  this.filters = [new Mrdr3Biquad(rate), new Mrdr3Biquad(rate),
    new Mrdr3Biquad(rate), new Mrdr3Biquad(rate)];
  this.stages = 0;
  // True if ANY of this tone's layers puts something different on the two channels.
  // Conservative for the life of the note: a stereo layer that ends early leaves the tone
  // running two channels, which is correct, just no longer necessary.
  this.stereo = false;
  this.lastGfq = NaN;
  this.hasVca = true;
  this.track = 1;
  this.freq = 1150;
  this.q = 0.7;
  this.oct = 0;
  this.hz = 440;
  this.active = false;
  // The same three a layer keeps, and for the same reason — a note-off draws the global
  // VCA and filter envelopes again for the length the note turned out to have, and both
  // shapes live on the patch. See Mrdr3Layer.release.
  this.patch = null;
  this.startFrame = 0;
  this.endFrame = 0;
}

Mrdr3Tone.prototype.start = function (patch, hz, frame, endFrame, rate, noise, glide) {
  this.active = true;
  this.lastGfq = NaN;
  this.hz = hz;
  this.patch = patch;
  this.startFrame = frame;
  this.endFrame = endFrame;
  this.used = patch.layers.length < 3 ? patch.layers.length : 3;
  for (var i = 0; i < this.used; i++) {
    var lay = this.layers[i];
    var spec2 = patch.layers[i];
    lay.noise = spec2.noiseColour && noise ? (noise[spec2.noiseColour] || noise.white) : null;
    lay.start(spec2, hz, frame, endFrame, rate, patch.entryDelays, glide);
    // HARD SYNC. Osc 1 is always the master and the pill names which layers follow it; a
    // slave's own ratio decides how many of its cycles fit before each reset, which is
    // where the bright tearing spectrum comes from. Noise has no phase to reset.
    lay.syncOn = !!(patch.syncSlaves && patch.syncSlaves[i]) && !spec2.noiseColour && i > 0;
    if (lay.syncOn) {
      lay.syncRatio = spec2.ratio / (patch.masterRatio > 0.01 ? patch.masterRatio : 0.01);
      lay.syncInv = 1 / lay.syncRatio;
      for (var su = 0; su < lay.count; su++) lay.unison[su].masterPhase = 0;
    }
  }
  for (var j = this.used; j < 3; j++) this.layers[j].active = false;
  this.stereo = false;
  for (var k2 = 0; k2 < this.used; k2++) {
    var l2 = this.layers[k2];
    if (l2.stereo && !l2.noise) this.stereo = true;
  }
  // Both absent is the DEFAULT: a preset with no global block sums its layers straight
  // through, which is what _playLayer does and what fifteen presets are. A transparent VCA
  // would be a different sound — an envelope at unity still gates, and its release would
  // cut a layer whose own release is longer.
  this.hasVca = !!patch.vca;
  var noteSeconds = (endFrame - frame) / rate;
  if (this.hasVca) mrdr3WriteEnvelope(this.vca, frame, noteSeconds, 1, patch.vca, hz, rate);
  this.stages = patch.filterStages;
  if (this.stages) {
    this.freq = patch.filterFreq;
    this.q = patch.filterQ;
    this.oct = patch.filterOct;
    this.track = patch.filterTrack > 0
      ? Math.pow(hz / 110, patch.filterTrack < 1 ? patch.filterTrack : 1) : 1;
    mrdr3WriteEnvelope(this.filterEnv, frame, noteSeconds, 1, patch.filterEnvShape, hz, rate);
    for (var k = 0; k < this.stages; k++) {
      this.filters[k].kind = patch.filterKind;
      this.filters[k].reset();
    }
  }
};

/** END THIS TONE NOW — its layers, then the global pair. See Mrdr3Layer.release. */
Mrdr3Tone.prototype.release = function (frame, rate) {
  if (!this.active || !this.patch) return;
  var at = frame > this.startFrame ? frame : this.startFrame;
  if (at >= this.endFrame) return;
  this.endFrame = at;
  var seconds = (at - this.startFrame) / rate;
  for (var i = 0; i < this.used; i++) this.layers[i].release(at, rate);
  if (this.hasVca) {
    mrdr3WriteEnvelope(this.vca, this.startFrame, seconds, 1, this.patch.vca, this.hz, rate);
  }
  if (this.stages) {
    mrdr3WriteEnvelope(this.filterEnv, this.startFrame, seconds, 1,
      this.patch.filterEnvShape, this.hz, rate);
  }
};

// ---- the note group's shared modulators (§5.1) -------------------------------------
//
// One of each PER NOTE-ON, not per tone and not per unison voice, because that is what
// the native path builds and the difference is audible: a chord whose three tones each
// had their own vibrato is three singers disagreeing, where one modulator reaching all of
// them is one player's hand.
//
// The vibrato's RATES and PHASES are not computed here — they arrive on the patch, worked
// out once by the compile step from a fixed seed. That is what the frozen ensemble buys:
// every occurrence of a note is the same section rather than a solo, so the whole thing
// is a constant and the audio thread never needs a random number.
var MRDR3_TAU = 6.283185307179586;
// ---- how late is TOO late for a note-on --------------------------------------------
//
// A live lane is fed a quarter-second ahead, so a note that lands a few tens of
// milliseconds late is ordinary — a warming lane, a stalled main thread — and playing it
// is right. A note a second late is not late; it belongs to a moment that is gone, and it
// is only here because nothing pulled this node while the queue filled behind it. Chosen
// to sit clear of both: four times the lookahead, and a small fraction of any strand.
//
// This can only ever fire live. An offline render applies its schedule as the render
// advances, so the gap there is a fraction of one sample.
var MRDR3_STALE_SECONDS = 1;

/** sine, triangle or square, from a phase in [0,1). */
function mrdr3Shape2(p, tri, square) {
  if (square) return p < 0.5 ? 1 : -1;
  if (tri) return p < 0.25 ? 4 * p : (p < 0.75 ? 2 - 4 * p : 4 * p - 4);
  return Math.sin(MRDR3_TAU * p);
}

/**
 * Advance the group's modulators by one sample and leave their values on the group.
 *
 * Vibrato is written as a CENTS offset per unison index — index, not layer, because voice
 * 2 is the same singer in osc1, osc2 and osc3. Seeding per (layer, index) instead would
 * make one singer's formants wobble apart, which does not sound like a bigger choir; it
 * sounds like the voice coming apart.
 */
function mrdr3StepMods(grp, patch, rate, pwmAny) {
  var i;
  if (patch.vibDepth > 0) {
    if (grp.vibOnset < 1) {
      grp.vibOnset += grp.vibOnsetStep;
      if (grp.vibOnset > 1) grp.vibOnset = 1;
    }
    // Uncapped, as the native path is: the editor's pot travels to twelve semitones and a
    // clamp here would make most of it inert.
    var depth = patch.vibDepth * 100 * grp.vibOnset;
    var spread = patch.vibSpread > 0;
    for (i = 0; i < 4; i++) {
      if (i > 0 && !spread) {
        grp.vibCents[i] = grp.vibCents[0];
        grp.vibRatio[i] = grp.vibRatio[0];
        grp.vibLevel[i] = grp.vibLevel[0];
        continue;
      }
      grp.vibPhase[i] += patch.vibRates[i] / rate;
      if (grp.vibPhase[i] >= 1) grp.vibPhase[i] -= 1;
      grp.vibCents[i] = Math.sin(MRDR3_TAU * grp.vibPhase[i]) * depth;
      // ---- SEPARATED, and this is where vibrato stopped being expensive -------
      //
      // Summing the wobble into each oscillator's cents made every voice's pitch change
      // every sample, which defeats the per-voice cache and forces a Math.pow AND a
      // Math.log2 PER OSCILLATOR per sample. Measured: 1.4 to 2.4 ms per oscillator,
      // scaling linearly with the stack — 21.7 ms on sixteen of them.
      //
      // Both are separable. pow(2, (own + vib)/1200) is pow(2, own/1200) times
      // pow(2, vib/1200), and the first factor is CONSTANT for the life of a note. And a
      // mip level is a logarithm of frequency, so multiplying the frequency ADDS to the
      // level: log2(hz * r) = log2(hz) + log2(r), and log2(2^(vib/1200)) is vib/1200 with
      // no logarithm at all.
      //
      // So the group resolves one ratio and one level offset per unison index — four of
      // each per sample — and every oscillator downstream pays a multiply and an add.
      grp.vibRatio[i] = Math.pow(2, grp.vibCents[i] / 1200);
      grp.vibLevel[i] = grp.vibCents[i] / 1200;
    }
  }
  // The moving pulse width, one per layer index rather than one per tone. It sits with
  // the other shared modulators because that is what it is — see the note on the group's
  // pwm fields. Advancing here rather than inside the tone loop also fixes the order: the
  // accumulator steps once per sample whatever the chord is doing.
  if (pwmAny) {
    for (i = 0; i < patch.layers.length && i < 3; i++) {
      var ps = patch.layers[i];
      if (ps.pwmDepth > 0) grp.pwmDuty[i] = mrdr3PwmDuty(grp, i, ps, rate);
    }
  }
  if (patch.lfoDepth > 0) {
    if (grp.lfoOnset < 1) {
      grp.lfoOnset += grp.lfoOnsetStep;
      if (grp.lfoOnset > 1) grp.lfoOnset = 1;
    }
    grp.lfoPhase += patch.lfoRate / rate;
    if (grp.lfoPhase >= 1) grp.lfoPhase -= 1;
    var v = (patch.lfoHold
      ? mrdr3SampleHold(grp, patch, rate)
      : mrdr3Shape2(grp.lfoPhase, patch.lfoTri, patch.lfoSquare))
      * grp.lfoDepthScaled * grp.lfoOnset;
    // The units the destination takes: cents for a filter's detune (3600 at full — three
    // octaves either side of centre), cents for pitch (1200), and a BIPOLAR modulation
    // around the authored level for tremolo, so depth 0.5 swings .5 to 1.5 rather than
    // only pulling downward.
    grp.lfoFilter = patch.lfoTarget === 0 ? v : 0;
    // The same separation vibrato taught: a filter corner is base x 2^(cents/1200), and
    // the LFO's share of those cents is identical for every section of every tone. So it
    // becomes one ratio per sample for the whole group, and a filter with no envelope of
    // its own then needs no pow at all — which is most of them, because an LFO on the
    // filter is usually the ONLY thing moving it.
    grp.lfoFilterRatio = patch.lfoTarget === 0 ? Math.pow(2, v / 1200) : 1;
    grp.lfoTrem = patch.lfoTarget === 1 ? 1 + v : 1;
    grp.lfoPitch = patch.lfoTarget === 2 ? v : 0;
  }
}

/**
 * A value in [0,1) that depends only on WHEN a hit is scheduled.
 *
 * The engine's own 'hitRandom', for the one modulator that genuinely needs a per-note
 * value: sample-and-hold. Derived from the scheduled TIME rather than from a counter,
 * because a counter is state and state does not survive a lane being rendered on its own —
 * a stem must contain the same steps as the mix or the stems stop summing. Integer ops
 * only, which are bit-exact everywhere, where anything built on Math.sin would drift
 * between a browser and a headless render.
 */
function mrdr3HitRandom(time, salt) {
  var n = (Math.round(time * 48000) + Math.imul(salt, 2654435761)) | 0;
  n = (n ^ 61) ^ (n >>> 16);
  n = (n + (n << 3)) | 0;
  n ^= n >>> 4;
  n = Math.imul(n, 0x27d4eb2d);
  n ^= n >>> 15;
  return (n >>> 0) / 4294967296;
}

/**
 * Sample-and-hold: one deterministic value per period, held until the next.
 *
 * A true instantaneous step makes a filter or a gain JUMP, so the held values are slewed
 * over a small fraction of each period — the native path's own compromise, and the same
 * fraction. Not a smoothing of the shape: the value is still held flat for the rest of the
 * period, which is what makes it sound stepped rather than wobbly.
 */
function mrdr3SampleHold(grp, patch, rate) {
  var period = rate / patch.lfoRate;
  var slew = Math.min(0.02 * rate, period * 0.2);
  if (grp.shStep < 0 || grp.shFrame >= period) {
    grp.shFrame -= grp.shStep < 0 ? 0 : period;
    grp.shStep++;
    grp.shFrom = grp.shTo;
    grp.shTo = mrdr3HitRandom(grp.shTime + (grp.shStep / patch.lfoRate), 1907 + grp.shStep) * 2 - 1;
    if (grp.shStep === 0) grp.shFrom = grp.shTo;
  }
  grp.shFrame++;
  var t = grp.shFrame / slew;
  return t >= 1 ? grp.shTo : grp.shFrom + (grp.shTo - grp.shFrom) * t;
}

/**
 * HARD SYNC, exactly — §3.4's other Tier-C item.
 *
 * Natively a synced slave is one projected PeriodicWave at the MASTER's frequency, and a
 * synced slave WITH a pitch envelope is 32ms grains, each its own oscillator with its own
 * projected table, crossfaded over 4ms. Per sample it is one line: when the master's phase
 * wraps, the slave's phase goes to zero. The bend stops being a special case entirely —
 * the slave's ratio simply follows its envelope.
 *
 * NOT BAND-LIMITED YET, and that is stated rather than hidden. The reset is a
 * discontinuity with no two-saw identity to exploit, so unlike the moving pulse it needs
 * a correction term of its own — and a correction term that has not been measured is
 * decoration. What is here is the exact reset; tests/mrdr3-osc.js measures what it costs
 * against a properly band-limited reference, and that number decides whether a BLEP is
 * worth its complexity or whether the mip pyramid already carries it.
 *
 * The slave's phase comes from how far the master is PAST its wrap rather than being set
 * to zero outright: zeroing puts the reset on a sample boundary instead of where it
 * happened, and the sync edge then jitters with the note's pitch.
 */
function mrdr3SyncStep(uv, masterInc, slaveRatio, data, stride, size, level) {
  uv.masterPhase += masterInc;
  if (uv.masterPhase >= 1) {
    // THE RESET. The slave's phase is derived from how far the master is PAST its wrap,
    // not set to zero outright — otherwise the reset lands on a sample boundary rather
    // than where it actually happened, and the sync edge jitters with the note's pitch.
    uv.masterPhase -= 1;
    // A subtraction rather than a modulo. The % operator on doubles is a division, and this runs on
    // every master cycle of every synced oscillator; the value here is small by
    // construction — the master is only just past its wrap — so a single wrap is enough.
    var sp = uv.masterPhase * slaveRatio;
    if (sp >= 1) sp -= Math.floor(sp);
    uv.phase = sp;
  } else {
    uv.phase += masterInc * slaveRatio;
    if (uv.phase >= 1) uv.phase -= 1;
  }
  return mrdr3Read(data, stride, size, level, uv.phase);
}

// ---- MONO, LEGATO and GLIDE (§5.2) --------------------------------------------------
//
// The three are one mechanism seen from three angles, and the native path states the rule
// they share: a note only glides from, or hands its envelope to, a previous note that is
// STILL GATED. That is FINGERED portamento, and the distinction matters — "the last note"
// and "the last note ever" are different things, and a preset glided in from whatever the
// lane played bars of rest ago is the second one. Worst on a jump: the first note after a
// loop wrap or a seek arrives from the other side of it.
//
// A gate is not a release tail either. A note whose predecessor is still ringing out is
// not legato — it is a note after a rest with the room still sounding, and gliding into it
// is a different instrument.
//
// This lives per LANE rather than per group, because that is what it is about: which note
// this lane played last, and whether its key is still down.
function Mrdr3Last() {
  this.hz = 0;
  this.gateUntil = -1;
  this.group = null;
}

/**
 * A chord handed to a MONO preset sounds its LAST note.
 *
 * The same answer the pooled path gives, and what a hardware mono synth does with one.
 * Stacking all of them would make MONO mean two different things depending on which synth
 * was behind the pill.
 */
function mrdr3MonoNotes(hzs) {
  return hzs.length > 1 ? [hzs[hzs.length - 1]] : hzs;
}

// ---- the note group --------------------------------------------------------------------
//
// One per note-on message. Its tones sum HERE, into one bus, before anything downstream —
// what §5.1 protects, because at POST placement a chord's tones reach one drive shaper
// together and intermodulate, and much of what makes a stack read as one instrument is
// that summing.
function Mrdr3Group(rate, maxTones) {
  this.rate = rate;
  this.tones = [];
  for (var i = 0; i < maxTones; i++) this.tones.push(new Mrdr3Tone(rate));
  this.eventId = 0;
  this.gain = 1;
  this.active = false;
  this.age = 0;
  this.released = false;
  // The shared modulators. Four vibrato voices because MAX_UNISON is four and voice u
  // takes vibrato u in every layer at once.
  this.vibPhase = new Float64Array(4);
  this.vibCents = new Float64Array(4);
  // The same wobble, pre-resolved into what an oscillator actually needs: a frequency
  // multiplier and a mip-level offset. See mrdr3StepMods.
  this.vibRatio = new Float64Array(4);
  this.vibLevel = new Float64Array(4);
  this.vibOnset = 1;
  this.vibOnsetStep = 1;
  this.lfoPhase = 0;
  this.lfoOnset = 1;
  this.lfoOnsetStep = 1;
  this.lfoDepthScaled = 0;
  // PULSE WIDTH, one modulator per LAYER INDEX for the whole group — not one per tone.
  // Nothing about a moving width depends on pitch: the rate, the swing, the centre width
  // and the delay all come from the layer's spec, and every tone of a chord starts on the
  // same frame, so the three copies a triad used to run were three identical sines. This
  // is the same argument that moved vibrato up here, and it pays the same way: a string
  // section stops paying for the width modulation once per note.
  this.pwmPhase = new Float64Array(3);
  this.pwmOnset = new Float64Array(3);
  this.pwmOnsetStep = new Float64Array(3);
  this.pwmDuty = new Float64Array(3);
  // And the same question one level up, for the drive shaper and the tone filter.
  this.stereo = false;
  // Sample-and-hold: which step it is on, how far into it, and the two values it is
  // slewing between. 'shTime' is the note's own time, which is what makes the steps the
  // same in a stem as in the mix.
  this.shStep = -1;
  this.shFrame = 0;
  this.shFrom = 0;
  this.shTo = 0;
  this.shTime = 0;
  this.lfoFilter = 0;
  this.lfoFilterRatio = 1;
  this.lfoTrem = 1;
  this.lfoPitch = 0;
  // The drive's TONE filter — one per group, because the drive is one shaper the whole
  // note-on passes through (§5.1).
  this.tone = new Mrdr3Biquad(rate);
}

Mrdr3Group.prototype.start = function (patch, event, frame, rate, noise, glide) {
  this.eventId = event.eventId | 0;
  this.gain = event.velocity === undefined ? 1 : event.velocity;
  this.active = true;
  this.released = false;
  var hzs = event.hz && event.hz.length !== undefined ? event.hz : [event.hz];
  var durs = event.durFrames && event.durFrames.length !== undefined
    ? event.durFrames : [event.durFrames];
  // A chord handed to a MONO preset sounds its LAST note.
  if (patch.mono) hzs = mrdr3MonoNotes(hzs);
  // The modulators, reset with the note-on that owns them.
  for (var k = 0; k < 4; k++) {
    this.vibPhase[k] = patch.vibPhases ? patch.vibPhases[k] : 0;
    this.vibCents[k] = 0;
    this.vibRatio[k] = 1;
    this.vibLevel[k] = 0;
  }
  this.vibOnset = patch.vibDelay > 0 ? 0 : 1;
  this.vibOnsetStep = patch.vibDelay > 0 ? 1 / (patch.vibDelay * rate) : 1;
  this.lfoPhase = 0;
  this.lfoOnset = patch.lfoDelay > 0 ? 0 : 1;
  this.lfoOnsetStep = patch.lfoDelay > 0 ? 1 / (patch.lfoDelay * rate) : 1;
  this.lfoDepthScaled = patch.lfoTarget === 0 ? patch.lfoDepth * 3600
    : (patch.lfoTarget === 2 ? patch.lfoDepth * 1200 : patch.lfoDepth);
  this.lfoFilter = 0; this.lfoFilterRatio = 1; this.lfoTrem = 1; this.lfoPitch = 0;
  for (var w = 0; w < 3; w++) {
    var ls = patch.layers[w];
    this.pwmPhase[w] = 0;
    this.pwmOnset[w] = ls && ls.pwmDelay > 0 ? 0 : 1;
    this.pwmOnsetStep[w] = ls && ls.pwmDelay > 0 ? 1 / (ls.pwmDelay * rate) : 1;
    this.pwmDuty[w] = ls ? ls.width : 0.5;
  }
  this.shStep = -1; this.shFrame = 0; this.shFrom = 0; this.shTo = 0;
  this.shTime = frame / rate;
  if (patch.toneStages) {
    this.tone.kind = patch.toneKind;
    this.tone.reset();
    this.tone.setCoeffs(patch.toneFreq, patch.toneQ);
  }
  var n = hzs.length < this.tones.length ? hzs.length : this.tones.length;
  for (var i = 0; i < n; i++) {
    var dur = durs[i] === undefined ? durs[0] : durs[i];
    var end = frame + (dur > 0 ? dur : rate * 0.25);
    this.tones[i].start(patch, hzs[i], frame, end, rate, noise, glide);
  }
  for (var j = n; j < this.tones.length; j++) this.tones[j].active = false;
  this.stereo = false;
  for (var m = 0; m < n; m++) if (this.tones[m].stereo) this.stereo = true;
  return this;
};

/**
 * The key came up: release every tone, and remember that it happened.
 *
 * ONCE. A second note-off for the same event id — two fingers on one key, a stop behind a
 * note-off, a mono choke landing on a note already let go — would draw the envelopes for
 * a note shorter still, which restarts the fall from further along and is heard as the
 * release stuttering. The flag is also what §5.2 steals against, so it is set either way.
 */
Mrdr3Group.prototype.release = function (frame, rate) {
  if (!this.active) return false;
  if (this.released) return false;
  this.released = true;
  for (var i = 0; i < this.tones.length; i++) {
    if (this.tones[i].active) this.tones[i].release(frame, rate);
  }
  return true;
};

// ---- the core ---------------------------------------------------------------------------
function Mrdr3Core(opts) {
  this.rate = opts.rate;
  this.maxGroups = opts.maxGroups || 12;
  this.maxTones = opts.maxTones || 4;
  this.groups = [];
  for (var i = 0; i < this.maxGroups; i++) this.groups.push(new Mrdr3Group(this.rate, this.maxTones));
  this.events = [];
  this.next = 0;
  // Booking order, handed out by schedule(). See the panic branch in applyDue.
  this.seq = 0;
  this.tables = null;
  this.noise = null;
  this.stride = 0; this.size = 0; this.levels = 0;
  this.patch = null;
  this.age = 0; this.late = 0; this.steals = 0; this.dropped = 0;
  // How late a note-on may be and still be worth playing — see applyDue.
  this.staleFrames = Math.round(MRDR3_STALE_SECONDS * this.rate);
  // What this lane played last, and whether its key is still down. Per LANE, because that
  // is what mono, legato and glide are all about (§5.2).
  this.last = new Mrdr3Last();
}

Mrdr3Core.prototype.installTables = function (tables) {
  this.tables = tables;
  this.size = tables.size;
  this.levels = tables.levels;
  this.stride = tables.size + 1;
};

Mrdr3Core.prototype.installPatch = function (patch) { this.patch = patch; };

/**
 * The noise buffers, already coloured, handed over from the main thread.
 *
 * The processor never makes its own: a lane rendered on its own must contain the noise it
 * had inside the full mix, or stems stop summing (§5.3).
 */
Mrdr3Core.prototype.installNoise = function (buffers) { this.noise = buffers; };

Mrdr3Core.prototype.scheduleAll = function (events) {
  var list = events.slice();
  list.sort(function (a, b) { return a.frame - b.frame; });
  // ONE BOOKING, not one per event — see the panic branch in applyDue. A schedule handed
  // over at construction arrived together, so a panic written into it clears the whole of
  // it, including the notes written after it that it exists to cancel. Only what is posted
  // LATER, over the port, is booked after the panic and survives it.
  for (var i = 0; i < list.length; i++) list[i].seq = 0;
  this.seq = 1;
  this.events = list;
  this.next = 0;
};

Mrdr3Core.prototype.schedule = function (event) {
  // WHEN this event was booked, as distinct from when it sounds. A panic clears what the
  // transport had already booked and nothing that is booked after it, and frame order
  // cannot tell those apart: the queue is sorted by frame, so a note posted a moment
  // later for a moment further ahead sits behind a panic it has nothing to do with.
  event.seq = this.seq++;
  var i = this.events.length;
  while (i > 0 && this.events[i - 1].frame > event.frame) i--;
  this.events.splice(i, 0, event);
  // THE CURSOR MOVES WITH THE INSERT. Live events arrive in order almost always, so this
  // almost never fires — but 'almost' is doing real work: a seek, a loop wrap or a resume
  // can post a note for a frame behind one already queued, and an insert below the cursor
  // shifts every later event out from under it. The symptom is not a wrong note; it is a
  // lane that quietly replays or skips events from then on.
  if (i < this.next) this.next++;
  // Everything already spent is dead weight. Dropping it keeps the array bounded on a
  // desk that has been open all afternoon, and keeps the backward walk above short.
  if (this.next > 512) {
    this.events.splice(0, this.next);
    this.next = 0;
  }
};

/**
 * Find a group for a new note.
 *
 * §5.2's order: a free slot, then the oldest RELEASED group, then the oldest sounding one.
 * Stealing is group-aware on purpose — a chord is one event, so taking half of it would
 * leave a triad playing as an interval, which sounds like a bug in the arrangement rather
 * than like a voice limit.
 */
Mrdr3Core.prototype.claim = function () {
  var free = null, oldestReleased = null, oldest = null;
  for (var i = 0; i < this.groups.length; i++) {
    var g = this.groups[i];
    if (!g.active) { free = g; break; }
    if (g.released) {
      if (!oldestReleased || g.age < oldestReleased.age) oldestReleased = g;
    } else if (!oldest || g.age < oldest.age) oldest = g;
  }
  var slot = free || oldestReleased || oldest;
  if (slot && slot.active) this.steals++;
  return slot;
};

Mrdr3Core.prototype.applyDue = function (frame) {
  while (this.next < this.events.length && this.events[this.next].frame <= frame) {
    var e = this.events[this.next++];
    if (e.frame < frame) {
      this.late++;
      // ---- A NOTE THIS LATE IS DROPPED, NOT PLAYED -----------------------------
      //
      // The group start below stamps a note at the CURRENT frame, so a stale note-on is not
      // played late, it is played NOW at its full written length. One of those is a
      // flam. A queue of them is what a lane empties the instant it rejoins the render
      // graph after nothing has been pulling it — every bar it missed, arriving as one
      // chord, stealing groups from each other on the way. That is louder and stranger
      // than the silence it replaced, and it is not the music.
      //
      // Note-offs and panics are NEVER dropped, however stale: a note-off is what ends
      // something that may still be sounding, and dropping one leaves a held note
      // ringing with nothing left that can release it.
      if (e.type === 'noteOn' && frame - e.frame > this.staleFrames) { this.dropped++; continue; }
    }
    if (e.type === 'panic') {
      for (var i = 0; i < this.groups.length; i++) this.groups[i].active = false;
      // ---- AND EVERYTHING THE TRANSPORT HAD BOOKED, BUT ONLY THAT ---------------
      //
      // A transport that has stopped owes nothing to the notes it had booked, so they go
      // — along with everything already spent, because an events array that only ever
      // grows is a slow leak on a desk left open all day.
      //
      // What must survive is anything booked AFTER this panic was posted. A panic is
      // stamped at the moment it lands on the port and applied at the frame it names,
      // and the desk can book the next song's first notes inside that gap: a re-bank is
      // a dispose (which panics) followed immediately by a scheduling pass. Clearing the
      // array outright ate those notes, and a song that had just been switched to came in
      // a quarter of a second late for reasons nothing could see. Frame order cannot make
      // the distinction — the survivors are further ahead than the panic, which is
      // exactly why they sit behind it in the queue — so the BOOKING order does it.
      var keep = [];
      for (var q = this.next; q < this.events.length; q++) {
        if (this.events[q].seq > e.seq) keep.push(this.events[q]);
      }
      this.events = keep;
      this.next = 0;
      this.last.gateUntil = -1;
      this.last.group = null;
      continue;
    }
    if (e.type === 'noteOff') {
      // AT 'frame', NOT AT 'e.frame'. A note-off may be stale — it is never dropped, on
      // purpose — and drawing a release that finished in the past would step the note to
      // silence instead of fading it. The current sample is the earliest moment a release
      // can still be a release.
      for (var k = 0; k < this.groups.length; k++) {
        if (this.groups[k].active && this.groups[k].eventId === (e.eventId | 0)) {
          this.groups[k].release(frame, this.rate);
        }
      }
      continue;
    }
    if (e.type !== 'noteOn' || !this.patch || !this.tables) continue;
    var p = this.patch;
    // ---- MONO, LEGATO and GLIDE ------------------------------------------------
    //
    // FINGERED: a glide needs the previous note STILL GATED at this note-on. 'last'
    // outlives the note it describes — that is how MONO finds the note to choke — so an
    // ungated origin is not "the last note" but "the last note EVER", and a preset glided
    // in from whatever the lane played bars of rest ago is the second one.
    var glide = null;
    if (p.mono) {
      var gated = this.last.gateUntil > frame;
      if (gated && p.glideSeconds > 0) glide = { from: this.last.hz, frames: p.glideSeconds * this.rate };
      // THE CHOKE: a hardware mono synth cuts the note still ringing. Released rather
      // than stopped dead, so its own release fades it under the note replacing it —
      // which is what stops the two arriving as one click.
      if (gated && this.last.group && this.last.group.active) {
        this.last.group.release(frame, this.rate);
      }
    }
    var slot = this.claim();
    if (!slot) continue;
    slot.age = this.age++;
    slot.start(p, e, frame, this.rate, this.noise, glide);
    if (p.mono) {
      var lastHz = e.hz && e.hz.length !== undefined ? e.hz[e.hz.length - 1] : e.hz;
      var lastDur = e.durFrames && e.durFrames.length !== undefined
        ? e.durFrames[e.durFrames.length - 1] : e.durFrames;
      this.last.hz = lastHz;
      this.last.gateUntil = frame + (lastDur > 0 ? lastDur : 0);
      this.last.group = slot;
    }
  }
};

/**
 * Render 'count' frames from absolute frame 'frame' into 'out' at 'offset'.
 *
 * ---- channel discipline (§5.1) ------------------------------------------------------
 *
 * Everything up to the stereo placement is MONO; everything from it on is stereo. That is
 * where the native graph goes stereo, and it is the cheap arrangement: the unison
 * oscillators are the bulk of the cost and stay mono, while the layer filter, the global
 * filter and the VCA run two channels. A layer with no placement is mono end to end and
 * its two channels carry the same samples, which is what native up-mixing does.
 *
 * Block-size agnostic by construction: nothing reads the block length except the loop
 * bound, and every time is an absolute frame.
 */
Mrdr3Core.prototype.process = function (out, frame, count, offset) {
  var outL = out[0];
  var outR = out.length > 1 ? out[1] : null;
  // Silence is written only when there is nothing to write over it. The sample loop below
  // assigns every frame it is given, so pre-zeroing the block and then overwriting it was
  // two stores a sample for nothing; the one case that needs it is the early return.
  if (!this.tables || !this.patch) {
    for (var z = 0; z < count; z++) { outL[offset + z] = 0; if (outR) outR[offset + z] = 0; }
    return;
  }
  var rate = this.rate, size = this.size, stride = this.stride, levels = this.levels;
  var kinds = this.tables.kinds, pulses = this.tables.pulses;

  // ---- the coefficient update period -------------------------------------------
  //
  // 1 means every sample, which is what Chromium does for a modulated biquad and what
  // tests/mrdr3-primitives.js measured it against. Anything larger is an approximation
  // whose cost that suite also measures: at the modulation rates this library contains,
  // per-block(128) sits 1.6e-2 from the node at the fastest envelope and 2.7e-3 at a
  // typical one. It is a FIDELITY decision, not a free win, so it defaults to exact and
  // has to be asked for.
  var ctrl = this.patch.ctrl > 1 ? this.patch.ctrl : 1;

  // ---- has this patch any shared modulator at all? -----------------------------
  //
  // Half the library has none: 32 of the 68 presets carry no vibrato, no routable LFO
  // and no moving width, and for those mrdr3StepMods was a call per group per sample
  // that fell through every branch and returned. Asked once per block instead.
  var p0 = this.patch;
  var pwmAny = false;
  for (var q = 0; q < p0.layers.length && q < 3; q++) {
    if (p0.layers[q].pwmDepth > 0) { pwmAny = true; break; }
  }
  var hasMods = p0.vibDepth > 0 || p0.lfoDepth > 0 || pwmAny;
  // Hoisted: the pool is fixed for the block, and this is the outermost thing the sample
  // loop touches.
  var groups = this.groups;
  var nGroups = groups.length;
  // The two ceilings the oscillator loop clamps against — see the note there.
  var nyquist = rate * 0.5;
  var topLevel = levels - 1;

  for (var n = 0; n < count; n++) {
    var f = frame + n;
    this.applyDue(f);
    // Anchored to the absolute frame, not to the block, so the same note renders the same
    // samples whatever block size it is rendered at.
    var ctrlNow = ctrl === 1 || (f % ctrl) === 0;
    var mixL = 0, mixR = 0;

    for (var g = 0; g < nGroups; g++) {
      var grp = groups[g];
      if (!grp.active) continue;
      // One step per sample for the whole group, before any tone reads them.
      if (hasMods) mrdr3StepMods(grp, this.patch, rate, pwmAny);
      var groupL = 0, groupR = 0, groupSounding = false;

      for (var t = 0; t < grp.tones.length; t++) {
        var tone = grp.tones[t];
        if (!tone.active) continue;
        var toneL = 0, toneR = 0, toneSounding = false;

        for (var li = 0; li < tone.used; li++) {
          var lay = tone.layers[li];
          if (!lay.active) continue;
          if (f > lay.off) { lay.active = false; continue; }
          toneSounding = true;
          var spec = lay.spec;
          var amp = lay.gain.valueAt(f);
          var layL = 0, layR = 0;
          // ---- ONE CHANNEL WHEN THERE IS ONLY ONE -------------------------------
          //
          // Nothing below a stereo-spread unison stack is stereo: a mono layer's right
          // channel is its left, sample for sample, so summing it twice and then running
          // a second filter cascade over it computes a number already in hand. The
          // mirror happens once, after the layer's filter, and the same argument repeats
          // for the tone's cascade and the group's shaper.
          //
          // A noise layer is never stereo whatever its unison count says — it is one
          // source, not a stack, and the stack is what the width would have placed.
          var layStereo = lay.stereo && !lay.noise;
          // ---- a NOISE layer is one source, not a unison stack ------------------
          //
          // Natively it is one looping BufferSource through one tracking bandpass; the
          // unison count does not multiply it, because there is nothing to detune. So the
          // stack is skipped — but NOT the rest of the layer.
          //
          // It falls through to the layer's own filter deliberately. A noise layer is a
          // full member of the stack, not a special case with dead controls: the tracking
          // band gives it its pitch, and the layer FILTER is what shapes the breath into
          // a formant. Skipping that made bestChoirOoh's bow noise arrive raw instead of
          // through its 2250 Hz band — heard immediately as "too much noise", and worth
          // recording as the one defect a listening test caught that no measurement did:
          // it was only +1.0 dB, which reads as nothing.
          if (lay.noise) {
            var nb = lay.noise;
            var ns = nb[lay.noisePos] * lay.makeup;
            lay.noisePos++;
            if (lay.noisePos >= nb.length) lay.noisePos = 0;
            layL = lay.band.stepL(ns);
          } else {
          // ---- the layer's own modulators, once for the whole unison stack ----
          //
          // Both are per LAYER on the native path and both are here, for the same reason
          // vibrato is per group: one pow and one sine, not one per oscillator.
          var pitchRatio = 1;
          if (lay.pitchOn) pitchRatio = Math.pow(2, lay.pitchParam.valueAt(f) / 1200);
          var fmHz = 0;
          if (lay.fmOn) {
            lay.fmPhase += lay.fmInc;
            if (lay.fmPhase >= 1) lay.fmPhase -= 1;
            fmHz = Math.sin(MRDR3_TAU * lay.fmPhase) * lay.fmDepth * lay.fmParam.valueAt(f);
          }
          var moving = spec.pwmDepth > 0;
          // A MOVING width reads the sawtooth pyramid twice; a static one has its own
          // table at the authored duty, and a classic waveform its own.
          var data = moving ? kinds.sawtooth
            : (spec.duty ? (pulses[spec.duty] || kinds.square) : (kinds[spec.kind] || kinds.sawtooth));
          // One duty for the whole unison stack AND for every tone of the chord, as the
          // native path fans one modulator across both — resolved once per sample for the
          // group in mrdr3StepMods.
          var duty = moving ? grp.pwmDuty[li] : 0;

          for (var u = 0; u < lay.count; u++) {
            var uv = lay.unison[u];
            if (f < uv.from) continue;
            // Vibrato SUMS with the unison spread on the same detune, rather than
            // fighting it for the parameter — which is what lets a spread stack wobble
            // as a section instead of as one voice.
            // A GLIDE moves the note's own pitch, exponentially — constant semitones per
            // second is what a portamento IS. It rides UNDER the cents offsets rather
            // than through them, so a preset can arrive from the previous note AND bend on
            // the way, which the native path went to some trouble to make possible.
            var baseHz = lay.hz;
            if (f < uv.glideUntil) {
              var gt = (f - uv.glideStart) / (uv.glideUntil - uv.glideStart);
              baseHz = uv.glideFrom * Math.pow(lay.hz / uv.glideFrom, gt);
            }
            // The voice's OWN pitch — its detune and its share of the unison spread —
            // which does not move for the life of a note unless it is gliding. The wobble
            // rides on top as a multiply, and its mip level as an add.
            var cents = uv.cents + grp.lfoPitch;
            if (f < uv.glideUntil) {
              // Gliding: the cache cannot help, and must not be left holding a stale
              // frequency for the sample after the glide ends.
              uv.lastCents = NaN;
              uv.hzNow = baseHz * Math.pow(2, cents / 1200);
              uv.levelNow = mrdr3Level(uv.hzNow, rate, size, levels);
            } else if (cents !== uv.lastCents) {
              uv.lastCents = cents;
              uv.hzNow = lay.hz * Math.pow(2, cents / 1200);
              // The level follows the INSTANTANEOUS frequency, so nothing that moves
              // pitch can step across a mip boundary mid-note (§3.3).
              uv.levelNow = mrdr3Level(uv.hzNow, rate, size, levels);
            }
            // FM adds in HERTZ and the envelopes multiply in cents, which is the order a
            // Web Audio oscillator applies them: a connected frequency input sums, and
            // detune scales whatever that came to.
            var hz = (uv.hzNow + fmHz) * grp.vibRatio[u] * pitchRatio;
            // ---- THE TWO CLAMPS, AND WHY THEY ARE NOT OPTIONAL -------------------
            //
            // A frequency AT OR ABOVE THE SAMPLE RATE breaks the phase wrap below: that
            // wrap is a single subtraction, which is only enough while the increment is
            // under one cycle. Past it the phase runs away, the table index leaves the
            // table, and the read returns undefined — which is NaN, and a NaN reaching a
            // Web Audio graph silences everything downstream of it for the rest of the
            // session. Chromium does not recover from one and neither does the desk.
            //
            // Clamping to Nyquist is not a workaround: it is what an OscillatorNode does.
            // The specification clamps that node's computed frequency to [-Nyquist,
            // Nyquist], so this is the native behaviour, and it is only reachable at all
            // through a layer RATIO, a pitch envelope, deep FM or a transpose stacking on
            // top of an already high note. Reachable is enough — the failure is permanent.
            //
            // The MIP LEVEL needs its own clamp for the same reason and a different
            // route. mrdr3Level clamps to the top rung, but vibrato's level offset is
            // SEPARATED and added here, after that clamp — so a wobble on a note near the
            // top of the pyramid asks for rung 12 of twelve, and the crossfade reads off
            // the end of the table. Measured at level 11.00003, which is how small the
            // overshoot has to be.
            if (hz > nyquist) hz = nyquist; else if (hz < -nyquist) hz = -nyquist;
            var inc = hz / rate;
            var level = uv.levelNow + grp.vibLevel[u];
            if (level < 0) level = 0; else if (level > topLevel) level = topLevel;
            var v;
            if (lay.syncOn) {
              // The slave runs at the MASTER's rate for the purpose of resetting, and at
              // its own for the purpose of its waveform — which is the whole of hard sync.
              // The master runs at the slave's rate DIVIDED by the ratio, so a slave
              // tuned well below its master takes an increment larger than the slave's —
              // and can pass a whole cycle even with the slave clamped to Nyquist. The
              // accumulator is wrapped properly rather than by one subtraction.
              var minc = inc * lay.syncInv;
              uv.masterPhase += minc;
              if (uv.masterPhase >= 2 || uv.masterPhase < 0) {
                uv.masterPhase -= Math.floor(uv.masterPhase);
                uv.phase = uv.masterPhase * lay.syncRatio;
                if (uv.phase >= 1) uv.phase -= Math.floor(uv.phase);
              } else if (uv.masterPhase >= 1) {
                // THE RESET. The slave's phase is derived from how far the master is PAST
                // its wrap, not set to zero outright — otherwise the reset lands on a
                // sample boundary rather than where it actually happened, and the sync
                // edge jitters with the note's pitch.
                uv.masterPhase -= 1;
                var sp = uv.masterPhase * lay.syncRatio;
                if (sp >= 1) sp -= Math.floor(sp);
                uv.phase = sp;
              } else {
                uv.phase += inc;
                if (uv.phase >= 1) uv.phase -= 1; else if (uv.phase < 0) uv.phase += 1;
              }
              v = mrdr3Read(data, stride, size, level, uv.phase) * uv.gain;
            } else {
              v = (moving
                ? mrdr3Pulse(data, stride, size, level, uv.phase, duty)
                : mrdr3Read(data, stride, size, level, uv.phase)) * uv.gain;
              uv.phase += inc;
              // Both directions: deep FM can carry an instantaneous frequency negative,
              // and a phase that walks off the bottom indexes the table just as far out
              // of bounds as one that walks off the top.
              if (uv.phase >= 1) uv.phase -= 1; else if (uv.phase < 0) uv.phase += 1;
            }
            layL += v * uv.panL;
            // Measured both ways: skipping this on a mono layer beats doing it and letting
            // the mirror overwrite it, by about 7% on a mono preset. The branch predicts
            // perfectly — it is the same answer for the whole note.
            if (layStereo) layR += v * uv.panR;
          }
          }

          if (lay.stages) {
            if (ctrlNow) {
              // ONE target, every filter in the patch — the layers' and the global one.
              // A third pill naming which filter to breathe would be a routing choice
              // hiding on a modulation control.
              // The envelope's cents still need a pow; the LFO's do not.
              //
              // AT ZERO DEPTH THE ENVELOPE IS NOT READ AT ALL. Twenty-six of the forty
              // layer filters in the library have no envelope depth, and for those the
              // timeline was being walked once a sample to produce a number that was then
              // multiplied by zero. Skipping the read is exact — nothing else looks at
              // this param, so its cursor has nowhere to be.
              var lcents = spec.filterOct === 0
                ? 0 : spec.filterOct * 1200 * lay.filterEnv.valueAt(f);
              var lfq = spec.filterFreq * lay.track * grp.lfoFilterRatio
                * (lcents === 0 ? 1 : Math.pow(2, lcents / 1200));
              if (lfq !== lay.lastLfq) {
                lay.lastLfq = lfq;
                for (var lc = 0; lc < lay.stages; lc++) {
                  lay.filters[lc].setCoeffs(lfq, lc === 0 ? spec.filterQ : 0.7071);
                }
              }
            } else if (spec.filterOct !== 0) {
              lay.filterEnv.valueAt(f);
            }
            for (var ls = 0; ls < lay.stages; ls++) {
              var lf = lay.filters[ls];
              layL = lf.stepL(layL);
              if (layStereo) layR = lf.stepR(layR);
            }
          }
          if (!layStereo) layR = layL;
          toneL += layL * amp;
          toneR += layR * amp;
        }

        if (!toneSounding) { tone.active = false; continue; }
        groupSounding = true;

        if (tone.stages) {
          if (ctrlNow) {
            var gcents = tone.oct === 0
              ? 0 : tone.oct * 1200 * tone.filterEnv.valueAt(f);
            var gfq = tone.freq * tone.track * grp.lfoFilterRatio
              * (gcents === 0 ? 1 : Math.pow(2, gcents / 1200));
            if (gfq !== tone.lastGfq) {
              tone.lastGfq = gfq;
              for (var gc = 0; gc < tone.stages; gc++) {
                tone.filters[gc].setCoeffs(gfq, gc === 0 ? tone.q : 0.7071);
              }
            }
          } else if (tone.oct !== 0) {
            tone.filterEnv.valueAt(f);
          }
          for (var gs = 0; gs < tone.stages; gs++) {
            var gf2 = tone.filters[gs];
            toneL = gf2.stepL(toneL);
            if (tone.stereo) toneR = gf2.stepR(toneR);
          }
        }
        if (!tone.stereo) toneR = toneL;
        if (tone.hasVca) {
          var a = tone.vca.valueAt(f);
          toneL *= a; toneR *= a;
        }
        groupL += toneL;
        groupR += toneR;
      }

      if (!groupSounding) { grp.active = false; continue; }
      // ---- the group's own output chain ----------------------------------------
      //
      // Order is the native path's, and it is most of why DRIVE sounds like playing
      // rather than like a setting: the tones arrive at ONE shaper having already been
      // enveloped, so the curve hears a note rather than a level — and with the curve
      // normalised to full scale, drive doubles as a compressor there and flattens what
      // the VCA just drew. TONE sits AFTER the shaper because it is the drive's tone
      // control, taming the fizz the shaper added; in front it would be a second cutoff
      // wearing the drive's name.
      var p2 = this.patch;
      if (p2.lfoTarget === 1 && p2.lfoDepth > 0) {
        groupL *= grp.lfoTrem;
        groupR *= grp.lfoTrem;
      }
      if (p2.driveCurve) {
        groupL = mrdr3Shape(p2.driveCurve, groupL);
        if (grp.stereo) groupR = mrdr3Shape(p2.driveCurve, groupR);
        if (p2.toneStages) {
          groupL = grp.tone.stepL(groupL);
          if (grp.stereo) groupR = grp.tone.stepR(groupR);
        }
        if (!grp.stereo) groupR = groupL;
      }
      mixL += groupL * grp.gain;
      mixR += groupR * grp.gain;
    }
    outL[offset + n] = mixL;
    if (outR) outR[offset + n] = mixR;
  }
};

Mrdr3Core.prototype.health = function (frame) {
  var sounding = 0;
  for (var i = 0; i < this.groups.length; i++) if (this.groups[i].active) sounding++;
  return {
    type: 'health', frame: frame, groups: sounding,
    queued: this.events.length - this.next, late: this.late, steals: this.steals,
    dropped: this.dropped,
  };
};

`;

/** The complete core: the measured pieces, then the synth built on them. */
export const MRDR3_DSP_SOURCE = [
  MRDR3_PARAMS_SOURCE, MRDR3_PRIMITIVES_SOURCE, MRDR3_OSC_SOURCE,
  // The envelope builders, generated from the very functions the NATIVE path calls —
  // see src/engine/mrdr3/env.js. This is the line that makes §3.2 true rather than
  // intended: there is one definition of this arithmetic in the project.
  MRDR3_ENV_SOURCE,
  CORE_SOURCE,
].join('\n');

// `new Function` runs in Node only — the browser always reaches this code through the
// worklet — so no page needs `unsafe-eval`.
const evaluated = new Function(`${MRDR3_DSP_SOURCE}
  return { Mrdr3Core, Mrdr3Group, Mrdr3Tone, Mrdr3Param, Mrdr3Biquad, mrdr3SeededPhase };`)();

export const {
  Mrdr3Core, Mrdr3Group, Mrdr3Tone, Mrdr3Param, Mrdr3Biquad, mrdr3SeededPhase,
} = evaluated;

/** Audio time to the integer frame the core counts in — at the boundary, once. */
export const frameAt = (seconds, sampleRate) => Math.max(0, Math.round(seconds * sampleRate));

/**
 * The deterministic reference render: the same core, in plain JS, with no browser.
 *
 * What makes "both hosts share the maths" a testable claim rather than an intention.
 * `blockSize` exists to be varied — rendering the same events at 128 and at 997 must give
 * identical samples, or something is reading a block boundary as if it were a time.
 */
export function renderMrdr3({
  events = [], seconds = 1, sampleRate = 44100, channels = 2, blockSize = 128,
  maxGroups = 12, maxTones = 4, tables = null, patch = null, noise = null, frameOffset = 0,
} = {}) {
  const frames = Math.max(0, Math.ceil(seconds * sampleRate));
  const out = [];
  for (let c = 0; c < channels; c++) out.push(new Float32Array(frames));
  const core = new Mrdr3Core({ rate: sampleRate, maxGroups, maxTones });
  if (tables) core.installTables(tables);
  if (noise) core.installNoise(noise);
  if (patch) core.installPatch(patch);
  core.scheduleAll(events);
  const size = Math.max(1, blockSize | 0);
  const base = Math.max(0, Math.round(frameOffset));
  for (let start = 0; start < frames; start += size) {
    core.process(out, base + start, Math.min(size, frames - start), start);
  }
  return { channels: out, sampleRate, frames, health: core.health(frames) };
}
