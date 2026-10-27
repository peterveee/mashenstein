/*
 * FRPP-6's preset schema: defaults, validation, and the two tables the engine is built on —
 * the tunings its six strings are strung to, and the bodies a pluck is coloured by.
 *
 * FRPP-6 is a waveguide string: a delay line one period long, fed by a pluck and losing a
 * little of its top end every time round. The "6" is the six string slots a lane has, which
 * is also the hard ceiling on what a lane can cost. See the plan this was built from,
 * ~/.claude/plans/develop-a-physical-modeling-squishy-adleman.md, until a spec doc exists.
 *
 * This is the only place that knows what a stored `frpp6` block looks like, so the core can
 * assume its input is sane and the editor has one answer to "what does a fresh patch start
 * from". Every value is clamped here, not in the DSP: the audio thread never sees a NaN it
 * has to think about.
 *
 * Units are the ones a person reads: seconds for times (LENGTH is shown in ms but stored in
 * seconds, as every envelope time on the desk is), cents for TENSION, COURSE and DETUNE,
 * and 0–1 for everything that is an amount.
 */

export const FRPP6_STRINGS = 6;
// REED, SAX and JET were here until 23 Oct 2026 — see Frpp6Voice's `sustained` in dsp.js.
export const FRPP6_EXCITERS = ['pick', 'noise', 'impulse', 'bow'];
/** The three that keep driving the loop while the key is down (Stage 3, 23 Oct 2026). */
export const FRPP6_SUSTAINED = ['bow'];
export const isFrpp6Sustained = (type) => FRPP6_SUSTAINED.includes(type);
export const FRPP6_FILTER_TYPES = ['lowpass', 'highpass', 'bandpass'];
export const FRPP6_BODIES = ['steel', 'nylon', 'archtop', 'banjo', 'harp', 'violin', 'cello', 'soundboard', 'none'];
export const FRPP6_MODES = ['poly', 'mono', 'legato'];

/**
 * Open-string pitches, low string first, in MIDI note numbers (60 is C4, the spelling
 * src/engine/notes.js uses). FREE is no guitar at all: any pitch may take any slot, which
 * is what a harp, a koto or a synth pluck wants.
 */
export const FRPP6_TUNINGS = Object.freeze({
  standard: Object.freeze([40, 45, 50, 55, 59, 64]), // E2 A2 D3 G3 B3 E4
  dropD: Object.freeze([38, 45, 50, 55, 59, 64]),    // D2 A2 D3 G3 B3 E4
  openG: Object.freeze([38, 43, 50, 55, 59, 62]),    // D2 G2 D3 G3 B3 D4
  dadgad: Object.freeze([38, 45, 50, 55, 57, 62]),   // D2 A2 D3 G3 A3 D4
  free: null,
});
export const FRPP6_TUNING_NAMES = Object.keys(FRPP6_TUNINGS);

/**
 * What a string's gauge does to it, low string first. The three wound strings are darker
 * and stiffer than the three plain ones, which is most of why a guitar's low E and high E
 * sound like two different instruments played through one body.
 *
 *   stages  first-order dispersion allpasses the string gets when STIFF is above zero —
 *           the plain strings barely need any, so they barely pay for any
 *   stiff   how far STIFF reaches on this string
 *   damp    a multiplier on DAMP: below one is a darker string
 */
export const FRPP6_GAUGE = Object.freeze({
  stages: Object.freeze([4, 3, 3, 1, 1, 0]),
  stiff: Object.freeze([1, 0.95, 0.9, 0.55, 0.5, 0.45]),
  damp: Object.freeze([0.8, 0.85, 0.9, 1, 1.1, 1.2]),
  // FREE has no gauges: every slot is the same middle string.
  free: Object.freeze({ stages: 2, stiff: 0.8, damp: 1 }),
});

/**
 * The bodies, as modal sets. Every one is original — tuned by ear against what the
 * instrument family is known for, not measured off anyone's guitar — and none is a sample.
 *
 * `primary` is the three modes a player would name: the air in the box, then the top
 * plate, then the back. `cloud` is the dense rest of the wood: `count` modes spread
 * log-evenly between `lo` and `hi` with a seeded jitter, each a Q and a gain that falls by
 * `tilt` dB per octave. That cloud is what the commuted body can afford and a per-sample
 * body could not: it is rendered into the pluck once, when the patch is installed.
 */
export const FRPP6_BODY_SETS = Object.freeze({
  steel: { primary: [[98, 14, 1.0], [204, 20, 0.85], [390, 24, 0.5]],
    cloud: { count: 18, lo: 480, hi: 5200, q: 28, gain: 0.42, tilt: -3.5, seed: 11 } },
  nylon: { primary: [[102, 12, 0.95], [218, 16, 0.8], [410, 18, 0.45]],
    cloud: { count: 18, lo: 450, hi: 3600, q: 22, gain: 0.36, tilt: -5, seed: 23 } },
  archtop: { primary: [[128, 9, 0.55], [262, 13, 0.9], [520, 15, 0.6]],
    cloud: { count: 18, lo: 600, hi: 4200, q: 24, gain: 0.4, tilt: -3, seed: 37 } },
  banjo: { primary: [[310, 7, 0.9], [620, 9, 0.6], [1240, 12, 0.5]],
    cloud: { count: 18, lo: 900, hi: 7000, q: 18, gain: 0.55, tilt: -1.5, seed: 41 } },
  harp: { primary: [[150, 10, 0.7], [310, 12, 0.75], [620, 14, 0.5]],
    cloud: { count: 18, lo: 350, hi: 3000, q: 20, gain: 0.35, tilt: -4.5, seed: 53 } },
  // The bowed bodies run per sample on the lane (a bow has no one-shot pluck to fold a body
  // into), so they are a few modes each: the air, the top, and the two strongest wood modes.
  violin: { primary: [[275, 9, 0.9], [450, 12, 1.0], [700, 10, 0.5]],
    cloud: { count: 3, lo: 900, hi: 2800, q: 12, gain: 0.45, tilt: -3, seed: 61 } },
  cello: { primary: [[98, 8, 1.0], [180, 10, 0.9], [290, 9, 0.6]],
    cloud: { count: 3, lo: 400, hi: 1600, q: 11, gain: 0.45, tilt: -3, seed: 67 } },
  // A piano's soundboard (the piano trial, 27 Oct 2026; not on the desk's list yet): no air
  // in a box, just a big ribbed plate — a few broad low modes, then a dense, even cloud right
  // up the range, which is what makes a struck string sound like it is in a piano.
  soundboard: { primary: [[58, 5, 0.7], [112, 7, 0.9], [196, 9, 0.8]],
    cloud: { count: 60, lo: 150, hi: 7500, q: 30, gain: 0.5, tilt: -2, seed: 79 },
    // A board's response is mostly a diffuse, noisy tail rather than tones: seeded noise,
    // its lows ringing for t60Lo and its highs for t60Hi (tables.js renderThroughBody).
    diffuse: { gain: 1, t60Lo: 0.35, t60Hi: 0.06, split: 600, seed: 83 } },
  none: null,
});

const num = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const clamp = (value, lo, hi, fallback) => Math.min(hi, Math.max(lo, num(value, fallback)));
const oneOf = (value, list, fallback) => (list.includes(value) ? value : fallback);

/**
 * THE CONTROLS, and only these (Peter, 23 Oct 2026: "the editor is very complex, it is not
 * easy to work out what is going to change"). Twenty, each named for what you hear:
 *
 *   exciter  type (PICK / NOISE / STRIKE, and the sustained BOW: pressure, speed, noise),
 *            hardness (HARD: soft↔hard — the brightness of
 *            the pluck comes with it), position (WHERE), mix (SCRAPE), length (LENGTH)
 *   string   decay (RING), damp (HIGHS), stiffness (METAL), buzz (BUZZ),
 *            resonance (RESONANCE: the open strings ringing along) and drop (DROP: a fast
 *            first fall, then the long tail) — both on RING, 27 Oct 2026,
 *            pickup (acoustic, or a five-way switch: neck … bridge), double (off | shimmer | octave),
 *            sub (SUB: a sine an octave below, for basses — 27 Oct 2026)
 *   damping  mute, mutedBelow (CHUCK), lift, fret, squeak
 *   strings  tuning, tension (BEND)
 *   body     type, mix, size, wood (WOOD: the box's noisy tail, 27 Oct 2026) — and behind an ADVANCED door, the three named modes: air, top,
 *            back, each hz / q (unset: the body's own) and a dB trim (0: as the body has it)
 *   filter, filterEnv, amp — the standard cards
 *
 * And behind the PLUCK card's ADVANCED door (Peter, 23 Oct 2026: "an advanced panel that
 * has some additional fine tune elements so we can have more sophisticated presets without
 * overwhelming the user"), the fine-tuning a preset may want and a player rarely does:
 *
 *   exciter.velocity   VELOCITY      how much darker a soft note is
 *   string.keyFollow   RING FOLLOW   how much shorter high notes ring
 *   string.detune      DETUNE        the six strings out of tune with each other, cents
 *   string.shimmer     SHIMMER       how far apart DOUBLE's SHIMMER pair is, cents
 *   damping.settle     SETTLE        how long the bright edge of a pluck takes to settle
 *   strings.spread     STEREO        the strings across the stereo field
 *
 *   exciter.bright     BRIGHT        the pluck's brightness on its own; unset, it follows HARD
 *
 * VELOCITY, RING FOLLOW and STEREO came back out onto PLUCK, RING and CHARACTER the same
 * day: everyday ideas, not fine-tuning. `internal` can still set anything, for the tests.
 */
// A Strat's five-way switch, plus no pickup at all: positions 2 and 4 are the two in
// between, which the Gate A clean electric (0.35) and funk guitar (0.75) were set to.
export const FRPP6_PICKUPS = ['acoustic', 'neck', 'neckMiddle', 'middle', 'middleBridge', 'bridge'];
export const FRPP6_DOUBLES = ['off', 'shimmer', 'octave'];
// How METAL bends the overtones (27 Oct 2026, from the glass auditions). STRING: the same
// allpasses on every note — past METAL 1 a bar or a bell that changes note to note. PIANO: the
// stretch solved per note on a piano's curve (dsp.js frpp6DispersionC) — even, growing up the
// keyboard, glassy at the top. Lands on the piano trial's `internal.inharmonic`.
export const FRPP6_STRETCHES = ['string', 'piano'];
// What each pill is, in the core's units: a pickup's place along the string (0 is none),
// and the second string's interval in cents.
const PICKUP_AT = { acoustic: 0, neck: 0.15, neckMiddle: 0.35, middle: 0.55, middleBridge: 0.75, bridge: 0.95 };
const DOUBLE_CENTS = { off: 0, shimmer: 4, octave: 1200 };
const FIXED = { velocity: 0.5, keyFollow: 0.5, detune: 2, settle: 0, spread: 0.3, shimmer: 4 };
// BRIGHT, from HARD: fitted to the pairs the 25 Gate A patches were tuned with (within 0.05
// on all but two), so one pot moves both the way they were set by ear.
const brightOf = (hardness) => 0.4 + 0.5 * hardness;
const nearest = (table, value) => Object.keys(table).reduce((best, k) =>
  (Math.abs(table[k] - value) < Math.abs(table[best] - value) ? k : best), Object.keys(table)[0]);

/** A fresh patch: a steel-string acoustic, picked, ringing for a few seconds. */
export const frpp6Defaults = () => ({
  exciter: { type: 'pick', hardness: 0.6, position: 0.18, mix: 0.25, length: 0.006, velocity: FIXED.velocity,
    pressure: 0.6, speed: 0.5, noise: 0.1 },
  string: { decay: 3.5, damp: 0.22, stiffness: 0.15, buzz: 0, pickup: 'acoustic', double: 'off', sub: 0, stretch: 'string',
    resonance: 0, drop: 0,
    keyFollow: FIXED.keyFollow, detune: FIXED.detune, shimmer: FIXED.shimmer },
  damping: { mute: 0, mutedBelow: 0, lift: 0, fret: 0, squeak: 0, settle: FIXED.settle },
  // Absent is OFF, as TNGR-2's Osc B is: a patch carries a filter or it does not.
  filter: null,
  filterEnv: { amount: 0, attack: 0.001, decay: 0.3, sustain: 0, release: 0.3 },
  amp: { attack: 0, decay: 0.3, sustain: 1, release: 0.3 },
  strings: { tuning: 'standard', tension: 6, spread: FIXED.spread },
  body: { type: 'steel', mix: 0.8, size: 1, wood: 0, air: modeDefaults(), top: modeDefaults(), back: modeDefaults() },
});
/** One named body mode, untouched: it follows the body set until a pot pins it. */
const modeDefaults = () => ({ hz: null, q: null, db: 0 });
/** The three named modes, in the order the sets list them. */
export const FRPP6_BODY_MODE_KEYS = ['air', 'top', 'back'];
const modeOf = (raw = {}) => ({
  hz: raw.hz == null ? null : clamp(raw.hz, 40, 4000, 200),
  q: raw.q == null ? null : clamp(raw.q, 2, 60, 12),
  db: clamp(raw.db, -18, 18, 0),
});

/**
 * Engine switches that are NOT preset controls: the A/B the Gate A auditions ran (the body
 * as a per-sample lane filter), and the stages the tests isolate.
 */
const internalOf = (raw = {}, pots = {}) => ({
  bodyMethod: raw.bodyMethod === 'lane' ? 'lane' : 'commuted',
  laneModes: Math.max(1, Math.min(64, Math.round(num(raw.laneModes, 3)))),
  collapse: raw.collapse !== false,
  forceAmp: raw.forceAmp === true,
  // The piano trial (27 Oct 2026) — no pot yet, so presets cannot reach them:
  //   unison       3 makes a SHIMMER pair a trio (dsp.js 'triple')
  //   stiffStages  dispersion allpasses on a FREE string (2 unset), up to 8
  //   stiffReach   how far METAL 1 bends each one (0.6 unset — every existing patch)
  //   sympathetic  the undamped strings under a held pedal, ringing along (0 is off)
  //   sympRing     how long they ring, seconds
  //   inharmonic   METAL follows a piano's stretch curve (dsp.js frpp6DispersionC)
  //   slots        strings on a FREE lane, 6 unset, up to 16
  //   ringScale    RING times this — a piano's C4 rings ~15 s, past RING's 10 s pot
  //   twoStage     UNISON 3's middle string decays this much faster and carries the
  //                attack: a piano's prompt sound, then its aftersound (0 is off)
  //   knock        the hammer and key's thump, straight to the output (0 is off)
  //   bodyNoise    a diffuse wood-noise tail on any body that has none of its own (0 is off)
  //   polarise     a plain string becomes its two polarisations, 0.3 ct apart, so
  //                TWO STAGE has two lines to work with
  unison: raw.unison === 3 ? 3 : 2,
  stiffStages: raw.stiffStages == null ? null : Math.max(0, Math.min(8, Math.round(num(raw.stiffStages, 2)))),
  stiffReach: clamp(raw.stiffReach, 0, 0.95, 0.6),
  // These five are where the RESONANCE, DROP and WOOD pots land (`pots`); a key set here
  // directly, as the auditions do, wins over the pot.
  sympathetic: clamp(raw.sympathetic ?? pots.sympathetic, 0, 2, 0),
  sympRing: clamp(raw.sympRing ?? pots.sympRing, 0.2, 30, 4),
  inharmonic: raw.inharmonic === true || (raw.inharmonic !== false && pots.inharmonic === true),
  slots: Math.max(6, Math.min(16, Math.round(num(raw.slots, 6)))),
  ringScale: clamp(raw.ringScale, 0.1, 10, 1),
  twoStage: clamp(raw.twoStage ?? pots.twoStage, 0, 1, 0),
  knock: clamp(raw.knock, 0, 4, 0),
  bodyNoise: clamp(raw.bodyNoise ?? pots.bodyNoise, 0, 2, 0),
  polarise: raw.polarise === true || (raw.polarise !== false && pots.polarise === true),
});

/**
 * A stored `frpp6` block to the complete patch the core plays. Never throws. The pills
 * become the core's numbers here, and the fixed values above fill the stages that have no
 * pot. A block saved before the pills existed — PICKUP and COURSE as numbers — lands on
 * the nearest pill.
 */
export function validateFrpp6(stored = {}) {
  const d = frpp6Defaults();
  const s = stored && typeof stored === 'object' ? stored : {};
  const ex = s.exciter || {};
  const st = s.string || {};
  const dm = s.damping || {};
  const fe = s.filterEnv || {};
  const am = s.amp || {};
  const ss = s.strings || {};
  const bo = s.body || {};
  const it = s.internal || {};
  const fi = s.filter && s.filter.on !== false ? s.filter : null;
  const pickup = typeof st.pickup === 'number' ? nearest(PICKUP_AT, st.pickup)
    : oneOf(st.pickup, FRPP6_PICKUPS, d.string.pickup);
  const double = typeof st.course === 'number'
    ? (st.course <= 0 ? 'off' : st.course < 300 ? 'shimmer' : 'octave')
    : oneOf(st.double, FRPP6_DOUBLES, d.string.double);
  const hardness = clamp(ex.hardness, 0, 1, d.exciter.hardness);
  // Ranges widened 27 Oct 2026 (Peter: "let's do all 5"): RING to 30 s, RESONANCE and WOOD
  // to 2, SIZE 0.25–4, WHERE down to 0.02. Every preset sat inside the old ranges.
  const decay = clamp(st.decay, 0.02, 30, d.string.decay);
  const resonance = clamp(st.resonance, 0, 2, 0);
  const drop = clamp(st.drop, 0, 1, 0);
  const wood = clamp(bo.wood, 0, 2, 0);
  // DROP needs two lines: a plain string becomes its two polarisations (dsp.js TWO STAGE).
  const polarise = it.polarise === true || (it.polarise !== false && drop > 0);
  return {
    exciter: {
      type: oneOf(ex.type, FRPP6_EXCITERS, d.exciter.type),
      mix: clamp(ex.mix, 0, 1, d.exciter.mix),
      length: clamp(ex.length, 0.001, 1, d.exciter.length),
      hardness,
      bright: clamp(it.bright ?? ex.bright, 0, 1, brightOf(hardness)),
      position: clamp(ex.position, 0.02, 0.5, d.exciter.position),
      velocity: clamp(it.velocity ?? ex.velocity, 0, 1, FIXED.velocity),
      // The bow's own pots.
      pressure: it.pressure != null ? clamp(it.pressure, 0, 3, 1) : clamp(ex.pressure, 0, 1, d.exciter.pressure),
      speed: clamp(ex.speed, 0, 1, d.exciter.speed),
      noise: clamp(ex.noise, 0, 1, d.exciter.noise),
    },
    string: {
      decay,
      resonance,
      drop,
      damp: clamp(st.damp, 0.02, 1, d.string.damp),
      // 0–2 (27 Oct 2026; was 0–1): above 1 the string turns to bar and bell — see dsp.js.
      stiffness: clamp(st.stiffness, 0, 2, d.string.stiffness),
      keyFollow: clamp(it.keyFollow ?? st.keyFollow, 0, 1, FIXED.keyFollow),
      detune: clamp(it.detune ?? st.detune, 0, 50, FIXED.detune),
      course: clamp(it.course, 0, 1200, double === 'shimmer'
        ? clamp(st.shimmer, 1, 50, FIXED.shimmer) : double === 'off' && polarise ? 0.3 : DOUBLE_CENTS[double]),
      buzz: clamp(st.buzz, 0, 1, d.string.buzz),
      sub: clamp(st.sub, 0, 1, d.string.sub),
      stretch: oneOf(st.stretch, FRPP6_STRETCHES, d.string.stretch),
      pickup: clamp(it.pickup, 0, 1, PICKUP_AT[pickup]),
    },
    damping: {
      settle: clamp(it.settle ?? dm.settle, 0, 10, FIXED.settle),
      mute: clamp(dm.mute, 0, 1, d.damping.mute),
      mutedBelow: clamp(dm.mutedBelow, 0, 1, d.damping.mutedBelow),
      lift: clamp(dm.lift, 0, 1, d.damping.lift),
      fret: clamp(dm.fret, 0, 1, d.damping.fret),
      squeak: clamp(dm.squeak, 0, 1, d.damping.squeak),
    },
    filter: fi ? {
      type: oneOf(fi.type, FRPP6_FILTER_TYPES, 'lowpass'),
      cutoff: clamp(fi.cutoff, 20, 18000, 2400),
      resonance: clamp(fi.resonance, 0.1, 24, 0.707),
      keyTrack: clamp(fi.keyTrack, 0, 1, 0),
    } : null,
    filterEnv: {
      amount: clamp(fe.amount, -10, 10, d.filterEnv.amount),
      // Envelope times to thirty seconds, the desk's ENV_MAX_SECONDS (27 Oct 2026; was ten).
      attack: clamp(fe.attack, 0, 30, d.filterEnv.attack),
      decay: clamp(fe.decay, 0.001, 30, d.filterEnv.decay),
      sustain: clamp(fe.sustain, 0, 1, d.filterEnv.sustain),
      release: clamp(fe.release, 0.001, 30, d.filterEnv.release),
    },
    amp: {
      attack: clamp(am.attack, 0, 30, d.amp.attack),
      decay: clamp(am.decay, 0.001, 30, d.amp.decay),
      sustain: clamp(am.sustain, 0, 1, d.amp.sustain),
      release: clamp(am.release, 0.005, 30, d.amp.release),
    },
    strings: {
      tuning: oneOf(ss.tuning, FRPP6_TUNING_NAMES, d.strings.tuning),
      tension: clamp(ss.tension, 0, 50, d.strings.tension),
      spread: clamp(it.spread ?? ss.spread, 0, 1, FIXED.spread),
    },
    body: {
      type: oneOf(bo.type, FRPP6_BODIES, d.body.type),
      mix: clamp(bo.mix, 0, 1, d.body.mix),
      size: clamp(bo.size, 0.25, 4, d.body.size),
      wood,
      air: modeOf(bo.air), top: modeOf(bo.top), back: modeOf(bo.back),
    },
    master: { gain: clamp(it.gain, 0, 4, 1) },
    internal: internalOf(it, { sympathetic: resonance, sympRing: decay, twoStage: drop, bodyNoise: wood,
      polarise: drop > 0, inharmonic: oneOf(st.stretch, FRPP6_STRETCHES, 'string') === 'piano' }),
  };
}

/**
 * The voice-level controls every synth shares, in the shape the core wants. KEY MODE,
 * GLIDE and VIBRATO live on the VOICE (`v.mode`, `v.portamento`, `v.vibrato`) because the
 * standard SETTINGS card edits them in one place for every engine — exactly as
 * `tngr2PatchForVoice` and `tngr2VibratoOf` read them. TRANSPOSE and FINE are applied by
 * the rack before a pitch ever reaches the core, so they are not here.
 */
export function frpp6PlayOf(voice = {}) {
  const vib = voice?.vibrato;
  const depth = Number(vib?.depth) || 0;
  return {
    mode: oneOf(voice?.mode, FRPP6_MODES, 'poly'),
    glide: Math.max(0, Math.min(10, Number(voice?.portamento) || 0)),
    vibrato: depth > 0 ? {
      depth: Math.min(24, depth),
      rate: Math.min(64, Math.max(0.01, Number(vib.rate ?? 5) || 0)),
      delay: Math.max(0, Number(vib.delay) || 0),
      type: vib.type === 'triangle' || vib.type === 'square' || vib.type === 'sawtooth'
        ? vib.type : 'sine',
    } : null,
  };
}
