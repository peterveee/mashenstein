/*
 * The envelope, as ONE implementation that both backends run — docs/MRDR-3-worklet-spec.md §3.2.
 *
 * `gateAdsr` is the most carefully tuned arithmetic in this engine and none of the tuning
 * is obvious from its shape: an attack floored to a quarter of the note's own cycle, a
 * raised cosine in four linear segments so there is no corner for the ear to find, an
 * exponential hand-over at the lift so the authored curve survives without its crawl along
 * the bottom, a linear threshold that rises with the period, and a gate edge that pins the
 * exact level reached rather than assuming sustain. Writing that twice is how the two
 * backends would end up with envelopes that resemble each other, and §3.2 exists to stop
 * exactly that.
 *
 * So the builders live here, once, and produce a list of automation events. The native
 * path applies them to an AudioParam in seconds; the worklet core applies them to a
 * ParamTimeline in frames. Neither owns the shape.
 *
 * ---- how one function reaches two hosts without being written twice --------------
 *
 * An AudioWorkletProcessor cannot import, so the core has to be source TEXT. The obvious
 * ways to get text both fail here: a hand-written string cannot also be the function the
 * native path calls at full speed, and `new Function` on the main thread would make
 * `unsafe-eval` a requirement of the shipped page, which src/engine/mrdr3/dsp.js
 * explicitly promises it is not.
 *
 * `Function.prototype.toString()` is the way out. These are ordinary, linted, debuggable
 * functions that the native path calls directly, and the source string handed to the
 * worklet is generated FROM them at load. One definition, two hosts, no eval, and no
 * checked-in generated copy to drift.
 *
 * The price is a rule: **every function here must be self-contained.** No imports, no
 * module-scope constants, no closures — because `toString()` returns the function and
 * nothing around it, and a reference to anything outside would be undefined inside the
 * worklet. That is why the gate constants below are written as literals inside the
 * functions that use them rather than hoisted, which is the one place this file is
 * deliberately less tidy than it could be. tests/mrdr3-env.js evaluates the generated
 * string in a bare scope and compares it against the imported functions, so a closure
 * added by accident fails immediately rather than in a worklet.
 */

/**
 * The shortest attack a note at this frequency may have: a quarter of its own cycle.
 *
 * An authored zero still means "as immediate as this note can be" rather than a
 * scheduler-imposed fade-in — but a gate that opens in one sample on a 55 Hz note is a
 * step, and a step is broadband.
 */
export function mrdr3GateFloor(freq) {
  var GATE_MIN_ATTACK = 0.001;
  var GATE_MAX_ATTACK_FLOOR = 0.005;
  return freq > 0
    ? Math.min(GATE_MAX_ATTACK_FLOOR, Math.max(GATE_MIN_ATTACK, 0.25 / freq))
    : GATE_MIN_ATTACK;
}

/**
 * Below this an attack goes linear, because the CURVE of an attack briefer than one
 * period is not something the ear can hear — there is no waveform under it for the shape
 * to act on. The threshold rises with the period, capped, because at the bottom of the
 * keyboard a period is long enough that a curve across it really is somebody's swell.
 */
export function mrdr3GateLinUnder(freq) {
  var GATE_LIN_ATTACK = 0.004;
  var GATE_MAX_LIN_ATTACK = 0.015;
  return freq > 0
    ? Math.min(GATE_MAX_LIN_ATTACK, Math.max(GATE_LIN_ATTACK, 1 / freq))
    : GATE_LIN_ATTACK;
}

/**
 * The gate-driven ADSR, as ordered automation events.
 *
 * Returns `{ events, off }`, or null when handed a non-finite number — the caller decides
 * what to do about that, because the two hosts want different things: the native path
 * warns and leaves the note silent rather than letting an AudioParam throw inside the
 * scheduling pass and kill every note after it.
 *
 * Times are in the caller's own domain. Pass seconds and every event carries seconds;
 * pass frames and a rate-scaled envelope and every event carries frames. The arithmetic
 * never asks which.
 *
 * The defaults use `== null` rather than `=== undefined` because that is what the `??`
 * they replaced meant: a preset carrying an explicit null must take the authored default,
 * not fall through to Math.max(floor, null). Caught by the null test moving in the
 * seventh decimal place, which is the whole reason that gate is a byte comparison.
 */
export function mrdr3GateAdsrEvents(t, end, peak, e, sustaining, freq) {
  if (!e) e = {};
  if (!Number.isFinite(t) || !Number.isFinite(end) || !Number.isFinite(peak)) return null;
  var level = Math.max(1e-4, peak);
  var minAttack = mrdr3GateFloor(freq);
  var attack = Math.max(minAttack, e.attack == null ? 0.01 : e.attack);
  var decay = Math.max(0, e.decay == null ? 0 : e.decay);
  var release = Math.max(0, e.release == null ? 0.015 : e.release);
  var sustain = Math.min(1, Math.max(0, e.sustain == null ? 0 : e.sustain));
  var held = Math.max(1e-4, level * sustain);
  var attackEnd = t + attack;
  var decayEnd = attackEnd + decay;

  var attackLin = e.attackCurve === 'lin'
    || attack <= Math.max(mrdr3GateLinUnder(freq), minAttack);
  // Where the authored exponential has itself reached after the lift. Handing over at its
  // own value keeps the curve EXACTLY the authored one — an exponential ramp between two
  // points of an exponential is that same exponential — and only replaces the crawl along
  // the bottom, which is the part no one authored and everyone hears.
  var expAt = function (u) { return 1e-4 * Math.pow(level / 1e-4, u); };
  var liftLevel = expAt(minAttack / attack);
  // A straight ramp out of silence has no step in it, but it does have a CORNER at each
  // end — the slope goes from nothing to everything in one sample — and a corner is a
  // discontinuity in the first derivative, which is broadband too, just quieter. A raised
  // cosine leaves under the note, arrives under it, and has no corner anywhere; four
  // linear segments approximate it closely enough that the residue drops to the noise.
  var RAISED_COS = [0.25, 0.5, 0.75, 1];
  var cosAt = function (u) {
    return 0.5 * (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, u))));
  };

  var levelAt = function (at) {
    var dt = Math.max(0, at - t);
    if (dt < attack) {
      var u = dt / attack;
      if (attackLin) return level * cosAt(u);
      if (dt < minAttack) return liftLevel * cosAt(dt / minAttack);
      return expAt(u);
    }
    if (decay > 0 && dt < attack + decay) {
      var v = (dt - attack) / decay;
      if (e.curve === 'lin') return level + (held - level) * v;
      return level * Math.pow(held / level, v);
    }
    return held;
  };

  var events = [];
  var i;
  // From actual zero, not 1e-4: the param starts where silence is.
  events.push({ k: 'set', v: 0, t: t });
  if (attackLin) {
    for (i = 0; i < RAISED_COS.length; i++) {
      events.push({ k: 'lin', v: level * cosAt(RAISED_COS[i]), t: t + attack * RAISED_COS[i] });
    }
  } else {
    for (i = 0; i < RAISED_COS.length; i++) {
      events.push({ k: 'lin', v: liftLevel * cosAt(RAISED_COS[i]), t: t + minAttack * RAISED_COS[i] });
    }
    events.push({ k: 'exp', v: level, t: attackEnd });
  }
  if (decay > 0) {
    events.push({ k: e.curve === 'lin' ? 'lin' : 'exp', v: held, t: decayEnd });
  } else {
    events.push({ k: 'set', v: held, t: attackEnd });
  }

  if (sustaining) {
    if (decayEnd < end) events.push({ k: 'set', v: held, t: end });
    return { events: events, off: end + release + 0.005 };
  }

  // Note-off may arrive before the attack or decay automation has reached its endpoint.
  // Cancel those future events and pin the exact level at the gate edge before starting
  // Release. Without this, a short note either releases from silence or leaves a future
  // decay ramp fighting the release ramp.
  var offAt = Math.max(t, end);
  // Floored: the attack starts from a true zero, and an exponential release ramp out of
  // exactly zero is not a ramp — it is a no-op that ends in a step.
  var current = Math.max(1e-4, levelAt(offAt));
  events.push({ k: 'cancel', t: offAt });
  events.push({ k: 'set', v: current, t: offAt });
  var off = offAt + release;
  if (release > 0) {
    events.push({ k: e.releaseCurve === 'lin' ? 'lin' : 'exp', v: 1e-4, t: off });
  }
  events.push({ k: 'lin', v: 0, t: off + 0.005 });
  return { events: events, off: off + 0.005 };
}

/**
 * The pitch envelope, in CENTS, as ordered automation events.
 *
 * The second shared builder, and it earns the same treatment as the first: it carries
 * decisions that are not obvious and would not survive being written twice. An attack
 * longer than the note is clamped to 45% of it, so a slow bend does not simply never
 * arrive. An attack of ZERO is not a one-millisecond ramp but a value that is simply THERE
 * at note-on — which is what a bend starting two octaves up and falling into the note is,
 * and a ramp instead would be a glide nobody asked for. And every value is `base` PLUS the
 * envelope, because the parameter already carries the layer's static detune and its unison
 * spread: automation REPLACES a param's value where a connected node sums with it, so
 * scheduling from zero would silently cancel them.
 *
 * `exp` on a stage is a `setTarget` approach pinned at its endpoint — an exponential that
 * has to ARRIVE, which e^-kt never does on its own.
 */
export function mrdr3CentsEnvEvents(cents, e, t, end, base, dfltAttack) {
  if (!cents) return null;
  var attack = Math.max(0, e.attack == null ? (dfltAttack == null ? 0.01 : dfltAttack) : e.attack);
  var sustain = Math.min(1, Math.max(0, e.sustain == null ? 0 : e.sustain));
  var peakAt = attack > 0
    ? t + Math.min(Math.max(0.001, attack), Math.max(0.001, (end - t) * 0.45))
    : t;
  var decayEnd = Math.min(end, peakAt + Math.max(0, e.decay == null ? 0 : e.decay));
  var events = [];
  var ramp = function (to, from, at, shape) {
    if (shape === 'exp' && at > from) {
      events.push({ k: 'target', v: to, t: from, tau: Math.max(0.0005, (at - from) / 4) });
      events.push({ k: 'set', v: to, t: at });
    } else {
      events.push({ k: 'lin', v: to, t: at });
    }
  };
  if (attack > 0) {
    events.push({ k: 'set', v: base, t: t });
    ramp(base + cents, t, peakAt, e.attackCurve);
  } else {
    events.push({ k: 'set', v: base + cents, t: t });
  }
  ramp(base + cents * sustain, peakAt, decayEnd, e.decayCurve);
  if (decayEnd < end) events.push({ k: 'set', v: base + cents * sustain, t: end });
  ramp(base, end, end + Math.max(0.001, e.release == null ? 0.015 : e.release), e.releaseCurve);
  return { events: events, off: end + Math.max(0.001, e.release == null ? 0.015 : e.release) };
}

/**
 * The source text of the builders, for the worklet.
 *
 * Generated from the functions themselves, so there is exactly one definition of this
 * arithmetic in the project and no way for a copy to fall behind. See the note at the top
 * about why these must stay self-contained.
 */
export const MRDR3_ENV_SOURCE = [
  mrdr3GateFloor, mrdr3GateLinUnder, mrdr3GateAdsrEvents, mrdr3CentsEnvEvents,
].map((fn) => fn.toString()).join('\n\n');
