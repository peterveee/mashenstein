// The voice editor: a preset, on the desk, with its parameters as controls.
//
// The library was already data — src/engine/voices.js builds a Tone synth from an
// entry's `options` and branches on nothing, and `_playNoise` reads eight numbers off
// a noise entry — so a sound could always have been edited by typing into
// src/data/voices.js and reloading. This is that, with the reload taken out: an edit
// mutates the catalogue entry in place and re-banks, so you hear the change on the
// lane, in the song, through the channel strip, while you are making it.
//
// ---- what makes this different from the effects rack -----------------------
//
// A fader edit is a MIX edit: it belongs to one song, it is saved into src/data/mix.js
// beside the song it was made for, and getting it wrong costs that song. A preset edit
// is a LIBRARY edit — every song naming that preset changes with it. So:
//
//   · the editor says who else is playing it, before you touch anything
//   · a delete is refused while a song still names it, unless you say otherwise
//   · saving MEASURES, because a preset's level is derived from a measured peak and
//     an edit that moved the peak has changed how loud it is everywhere
//
// That last one is why Save takes a couple of seconds and why there is no way to skip
// it. `voiceGain()` divides the lane's target by `peak`; a stale peak is a preset that
// is quietly twice as loud as its neighbours in every render. The desk cannot measure
// it — the number comes from rendering the real engine offline — so the server does,
// and hands back the peak it wrote.
import * as Tone from 'tone';
import { VOICES, VOICE_CATEGORIES } from '../src/data/voices.js';
import { VoiceRack } from '../src/engine/voices.js';
// The fold mark, shared with the keyboard's, so the two put-away buttons on the
// library's workspace are provably one control rather than two that look alike.
import { foldIcon } from './mixer-voice-library.js';

/**
 * The synth classes a preset may name, which is the allowlist in src/engine/voices.js
 * and not one entry more.
 *
 * Everything here has been measured rendering under an OfflineAudioContext. Tone has
 * classes that work perfectly in a browser and render pure silence there — PluckSynth
 * is built on an AudioWorklet, PolySynth needs its first trigger at exactly t=0 — and
 * a preset built on one of those would sound right in this editor and be missing from
 * every WAV, stem and video. A dropdown rather than a text field is the cheap way to
 * make that unreachable.
 */
export const EDITABLE_SYNTHS = [
  'Synth', 'MonoSynth', 'FMSynth', 'AMSynth', 'DuoSynth', 'MembraneSynth', 'MetalSynth',
];

// ---- measuring, in the page -------------------------------------------------

// The same note tools/measure-voices.js measures at, held for the same length. It
// does not have to match — see `estimate` for why the units cancel — but a number
// taken the same way as the one it is scaled against is one less thing to explain.
const MEASURE_NOTE = 110;                                  // A2
const MEASURE_DUR = 8 * ((60 / 120) / 4);                  // 8 steps at 120bpm = 1.0s
const MEASURE_TAIL = 2.6;                                  // room for the release

/**
 * Render one note of a preset offline, here in the page, and return its peak.
 *
 * Built by the ENGINE'S OWN `VoiceRack`, not by a copy of it — the same class the
 * sequencer plays through, so a preset is measured by the thing that will play it and
 * there is no second construction to keep in step. That is also what makes this work
 * for noise presets, which are native nodes on the seeded buffer rather than a Tone
 * class: the rack already knows the difference.
 *
 * ---- the context swap -------------------------------------------------------
 *
 * `VoiceRack`'s constructor calls `Tone.setContext`, which is GLOBAL, and for the
 * length of that call Tone would build anything else on the offline context too. The
 * reason that is safe rather than a race: the swap is entirely SYNCHRONOUS. Building
 * the rack, playing the note and calling `startRendering` are one uninterrupted block,
 * and the global is restored before it ends. JavaScript is single-threaded, so the
 * sequencer's own scheduling callback cannot run inside it — there is no moment at
 * which anything could observe the wrong context. Measured with a 1ms watcher during
 * a render: it never saw one.
 *
 * The `finally` matters for the same reason. A throw between the swap and the restore
 * would leave the desk's Tone pointed at a dead offline context, and every note after
 * it silent.
 */
async function measureRaw(voiceId, noiseBuf, sampleRate = 44100) {
  const ctx = new OfflineAudioContext(1, Math.ceil(sampleRate * MEASURE_TAIL), sampleRate);
  const live = Tone.getContext();
  let rendering;
  try {
    const rack = new VoiceRack(ctx, noiseBuf);
    const dry = ctx.createGain();
    dry.connect(ctx.destination);
    // On the bass lane at unity, with no echo — the lane and level the server measures
    // at, so the two numbers are about the same thing.
    const ok = rack.play('bass', voiceId, MEASURE_NOTE, {
      time: 0, dur: MEASURE_DUR, gain: 1, dry, wet: null, echo: false,
    });
    if (!ok) return null;
    rendering = ctx.startRendering();
  } finally {
    Tone.setContext(live);          // the synchronous window closes here, always
  }
  const buf = await rendering;
  const d = buf.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < d.length; i++) { const a = d[i] < 0 ? -d[i] : d[i]; if (a > peak) peak = a; }
  return peak;
}

// ---- parameter descriptions -------------------------------------------------

// Short, because the value is read INSIDE the pot's ring — about five characters at
// this size. Units live on the label where they need saying, not on every reading.
const secs = (x) => (x < 1 ? `${Math.round(x * 1000)}ms` : `${x.toFixed(1)}s`);
const hz = (x) => (x >= 1000 ? `${(x / 1000).toFixed(1)}k` : String(Math.round(x)));
const fixed = (d) => (x) => x.toFixed(d);

const WAVES = ['sine', 'square', 'sawtooth', 'triangle', 'pwm', 'pulse'];
// Tone spells an oscillator's voicing as a PREFIX on its type: `fatsawtooth`,
// `amsine`, `fmsquare`. Two pills that compose into one string beat one pill row of
// every combination, which would be twenty-odd options in a control half a card wide.
const VOICINGS = ['single', 'fat', 'am', 'fm'];
const OSC_PREFIXES = ['fat', 'am', 'fm'];
// `pwm` and `pulse` are whole types rather than shapes, so nothing prefixes them.
const UNPREFIXABLE = ['pwm', 'pulse'];

const splitOsc = (type, fallback = 'sine') => {
  const t = String(type ?? fallback);
  // A type that is a bare VOICING is the signature of a bug that briefly wrote the
  // prefix on its own — `{ type: 'single' }`, which Tone rejects outright. Presets
  // saved that way are still in songs, so read them as "voicing lost, shape lost"
  // and hand back the default: the panel then shows something valid and the next
  // click writes a real waveform over it. The engine drops it too — see scrubOscTypes.
  if (VOICINGS.includes(t)) return { voicing: 'single', shape: fallback };
  if (UNPREFIXABLE.includes(t)) return { voicing: 'single', shape: t };
  for (const p of OSC_PREFIXES) if (t.startsWith(p)) return { voicing: p, shape: t.slice(p.length) };
  return { voicing: 'single', shape: t };
};
const joinOsc = (voicing, shape) =>
  (voicing === 'single' || UNPREFIXABLE.includes(shape) ? shape : voicing + shape);
const FILTER_TYPES = ['lowpass', 'highpass', 'bandpass', 'notch'];
// Attack and release take Tone's whole curve set; decay takes two and asserts on
// anything else — see `adsr`.
const ENV_CURVES = ['linear', 'exponential', 'sine', 'cosine', 'bounce', 'ripple', 'step'];
const DECAY_CURVES = ['linear', 'exponential'];

/**
 * What each option is called on a pill.
 *
 * A row of buttons only beats a dropdown while the whole row fits, and `sawtooth` and
 * `lowpass` across four options do not — at a strip's width the control would wrap to
 * three lines and cost more room than the menu it replaced. These are the abbreviations
 * every synth panel has used for forty years; the full word is on the tooltip.
 */
const SHORT = {
  lowpass: 'LP', highpass: 'HP', bandpass: 'BP', notch: 'NTCH',
  sine: 'SIN', square: 'SQR', sawtooth: 'SAW', triangle: 'TRI',
  pwm: 'PWM', pulse: 'PLS',
  exp: 'EXP', lin: 'LIN',
  // Curve names, cut to fit a pill. Seven of these sit in one control, so they
  // have to be short enough that the row does not outgrow half a card.
  linear: 'LIN', exponential: 'EXP', cosine: 'COS', bounce: 'BNCE',
  ripple: 'RPPL', step: 'STEP',
  single: 'ONE', fat: 'FAT', am: 'AM', fm: 'FM',
  // The mono pick stores a boolean, and `false`/`true` on a pill says nothing about
  // what it does to the sound.
  false: 'POLY', true: 'MONO',
};

/**
 * A pot on a dotted path into `options`, with the default the engine would use.
 *
 * `unit` is appended to the label rather than to the reading. The value is drawn INSIDE
 * the pot's ring, where there is room for about five characters — so `2.9` goes in the
 * ring and `oct` goes on the label, which is where a hardware panel has always put it.
 */
const n = (path, label, min, max, step, fmt = fixed(2), def = min, unit = '', when = null) =>
  ({ kind: 'num', path, label, unit, min, max, step, fmt, def, when });
/** A row of pills on a dotted path — see `pickRow`. */
const pick = (path, label, options, def, when = null) =>
  ({ kind: 'pick', path, label, options, def, when });

/**
 * The oscillator, as SHAPE plus VOICING plus the two controls a fat stack needs.
 *
 * `count` and `spread` only mean anything on a `fat*` type — Tone ignores them
 * everywhere else — so they carry a `when` and the panel greys them out until the
 * voicing is fat. Greyed rather than removed on purpose: a control that vanishes
 * takes its own explanation with it, and the row below jumps up into the gap while
 * you are still looking at where it used to be.
 */
const osc = (path, def = 'sine', { voicings = true } = {}) => {
  const readShape = (v) => splitOsc(getAt(v, `${path}.type`) ?? def, def).shape;
  const readVoicing = (v) => splitOsc(getAt(v, `${path}.type`) ?? def, def).voicing;
  return [
    { kind: 'pick', path: `${path}.type`, label: 'WAVE', options: WAVES, def,
      // Reads and writes only the SHAPE half, leaving whatever voicing is on the
      // preset alone — changing the waveform of a fat saw should keep it fat.
      read: readShape,
      write: (v, o) => joinOsc(readVoicing(v), o) },
    ...(voicings ? [
      // `derived`: this row and the WAVE row above write the SAME property, so a
      // fresh preset must take its type from one of them only. Without it
      // `defaultsFor` writes 'sine' and then 'single' over the top, and every new
      // preset is built on an oscillator type Tone has never heard of.
      { kind: 'pick', path: `${path}.type`, label: 'VOICING', options: VOICINGS, def: 'single',
        derived: true,
        read: readVoicing,
        write: (v, o) => joinOsc(o, readShape(v)) },
      n(`${path}.count`, 'STACK', 1, 8, 1, fixed(0), 3, '', (v) => readVoicing(v) === 'fat'),
      n(`${path}.spread`, 'SPREAD', 0, 100, 1, fixed(0), 20, 'cents', (v) => readVoicing(v) === 'fat'),
    ] : []),
  ];
};

/**
 * The four numbers every envelope has. Written once because they are written eight
 * times: a DuoSynth has two, an FM synth has one per operator, and typing the ranges
 * out each time is how the amp envelope and the filter envelope end up with different
 * attack ranges for no reason.
 *
 * MetalSynth's envelope genuinely has no sustain — it is a struck sound, and Tone's
 * class does not read one — so that is the one exception rather than a pot that
 * does nothing.
 */
const adsr = (path, { sustain = true } = {}) => [
  n(`${path}.attack`, 'ATTACK', 0.001, 2, 0.001, secs, 0.01),
  n(`${path}.decay`, 'DECAY', 0.01, 4, 0.01, secs, 0.2),
  ...(sustain ? [n(`${path}.sustain`, 'SUSTAIN', 0, 1, 0.01, fixed(2), 0.5)] : []),
  n(`${path}.release`, 'RELEASE', 0.01, 6, 0.01, secs, 0.3),
  // The SHAPE of the ramp, not just its length — the difference between a stage
  // that fades and one that snaps, bounces or steps. Tone has always taken these
  // and the rack has always passed them through; nothing here needed a knob.
  //
  // Attack and release take the full set; DECAY TAKES TWO. Not a simplification:
  // Tone types decayCurve as "linear" | "exponential" and implements only those.
  // A third value does NOT throw — that was checked — it is simply not handled,
  // so the decay comes out silently wrong, which is the worse of the two failures
  // and the reason this list is short rather than shared with the other two.
  pick(`${path}.attackCurve`, 'ATK CURVE', ENV_CURVES, 'linear'),
  pick(`${path}.decayCurve`, 'DEC CURVE', DECAY_CURVES, 'exponential'),
  pick(`${path}.releaseCurve`, 'REL CURVE', ENV_CURVES, 'exponential'),
];

/**
 * What each synth class offers, grouped the way you would reach for it: what makes
 * the sound, then what shapes it.
 *
 * These are not all of Tone's parameters. They are the ones the catalogue's ninety
 * presets actually use, which after a hundred entries is a decent definition of the
 * ones worth a control. Anything else a preset carries — `partials`, `releaseCurve`,
 * `portamento` on a preset that was typed in by hand — is left strictly alone: edits
 * are written to a PATH inside the options object, so a key with no control survives
 * being edited and saved rather than being quietly dropped.
 */
const SYNTH_GROUPS = {
  Synth: [
    { title: 'Oscillator', rows: osc('oscillator', 'sine') },
    { title: 'Envelope', rows: adsr('envelope') },
  ],
  MonoSynth: [
    { title: 'Oscillator', rows: osc('oscillator', 'sawtooth') },
    { title: 'Amp Envelope', rows: adsr('envelope') },
    // Where the filter SITS, all in one place: its shape and slope, the frequency it
    // starts from, how hard it resonates and how far it sweeps. `baseFrequency` and
    // `octaves` are Tone's, and Tone files them under the envelope — but they are not
    // timing, they are the range the envelope moves the filter ACROSS, and reading
    // them next to an attack in milliseconds told you nothing about either.
    { title: 'Filter', rows: [
      pick('filter.type', 'SHAPE', FILTER_TYPES, 'lowpass'),
      pick('filter.rolloff', 'SLOPE', [-12, -24, -48], -12),
      n('filterEnvelope.baseFrequency', 'FROM', 20, 8000, 10, hz, 200, 'Hz'),
      n('filter.Q', 'RESONANCE', 0, 20, 0.1, fixed(1), 1),
      n('filterEnvelope.octaves', 'SWEEP', 0, 8, 0.1, fixed(1), 2, 'oct'),
      // How the sweep is distributed across those octaves. 1 is linear in
      // frequency, which spends most of the move up where little is happening;
      // higher numbers weight it toward the bottom, where the ear is.
      n('filterEnvelope.exponent', 'CONTOUR', 0.5, 4, 0.1, fixed(1), 2),
    ] },
    // Left with what an envelope actually is: four times.
    { title: 'Filter Envelope', rows: adsr('filterEnvelope') },
  ],
  FMSynth: [
    { title: 'FM', rows: [
      n('harmonicity', 'RATIO', 0.25, 12, 0.005, fixed(3), 1),
      n('modulationIndex', 'INDEX', 0, 40, 0.1, fixed(1), 10),
    ] },
    { title: 'Oscillators', rows: [
      pick('oscillator.type', 'CARRIER', WAVES, 'sine'),
      pick('modulation.type', 'MODULATOR', WAVES, 'square'),
    ] },
    { title: 'Envelope', rows: adsr('envelope') },
    { title: 'Modulation Envelope', rows: adsr('modulationEnvelope') },
  ],
  AMSynth: [
    { title: 'AM', rows: [n('harmonicity', 'RATIO', 0.25, 12, 0.005, fixed(3), 1)] },
    { title: 'Oscillators', rows: [
      pick('oscillator.type', 'CARRIER', WAVES, 'sine'),
      pick('modulation.type', 'MODULATOR', WAVES, 'square'),
    ] },
    { title: 'Envelope', rows: adsr('envelope') },
    { title: 'Modulation Envelope', rows: adsr('modulationEnvelope') },
  ],
  DuoSynth: [
    { title: 'Duo', rows: [
      // The interesting range is the sliver either side of 1: two voices a few
      // thousandths apart is the detune this class is for, and a whole-number
      // harmonicity is an interval, which is a different instrument.
      n('harmonicity', 'DETUNE', 0.9, 2.1, 0.001, fixed(3), 1),
      n('vibratoAmount', 'VIBRATO', 0, 1, 0.01, fixed(2), 0.5),
      n('vibratoRate', 'VIB RATE', 0, 12, 0.1, fixed(1), 5, 'Hz'),
    ] },
    { title: 'Voice 1', rows: [...osc('voice0.oscillator', 'sawtooth'), ...adsr('voice0.envelope')] },
    { title: 'Voice 2', rows: [...osc('voice1.oscillator', 'square'), ...adsr('voice1.envelope')] },
  ],
  MembraneSynth: [
    { title: 'Drum', rows: [
      n('pitchDecay', 'PITCH DROP', 0.001, 0.5, 0.001, secs, 0.05),
      n('octaves', 'DEPTH', 0.5, 12, 0.1, fixed(1), 10, 'oct'),
    ] },
    // Shape only. A kick is one oscillator swept down by `pitchDecay`; a fat stack of
    // three detuned copies of it is a chord, not a drum.
    { title: 'Oscillator', rows: osc('oscillator', 'sine', { voicings: false }) },
    { title: 'Envelope', rows: adsr('envelope') },
  ],
  MetalSynth: [
    { title: 'Metal', rows: [
      n('harmonicity', 'RATIO', 1, 20, 0.1, fixed(1), 5.1),
      n('modulationIndex', 'INDEX', 1, 60, 0.5, fixed(1), 32),
      n('resonance', 'RESONANCE', 200, 8000, 50, hz, 4000, 'Hz'),
      n('octaves', 'SPREAD', 0.5, 4, 0.1, fixed(1), 1.5, 'oct'),
    ] },
    { title: 'Envelope', rows: adsr('envelope', { sustain: false }) },
  ],
};

/**
 * A noise preset: a filtered burst, an optional pitched thump under it, and optional
 * repeats. Defaults are `_playNoise`'s own `??` fallbacks, so a pot left alone
 * shows what the engine would actually do rather than a guess.
 *
 * `$`-paths throughout: `noise` and `body` live on the ENTRY, beside `taps`, the way
 * the engine reads them — not inside `options`, which is the Tone constructors' bag.
 */
const NOISE_GROUPS = [
  // Same order as the drum panel's sections: the pills, then LEVEL, then the rest.
  // Nothing is saved here — these groups are one pill and four knobs either way — but
  // LEVEL is in the same place in both editors, which is the whole of the point.
  { title: 'Burst', rows: [
    pick('$noise.type', 'SHAPE', FILTER_TYPES, 'bandpass'),
    n('$noise.gain', 'LEVEL', 0, 2, 0.01, fixed(2), 1),
    n('$noise.freq', 'FREQ', 100, 12000, 25, hz, 2600, 'Hz'),
    n('$noise.Q', 'RESONANCE', 0.1, 8, 0.1, fixed(1), 0.7),
    n('$noise.decay', 'DECAY', 0.005, 1, 0.005, secs, 0.09),
  ] },
  // The body is what tells a snare from a hiss, and plenty of presets genuinely have
  // none — a brush and a closed hat are all air. So it is a group you switch on.
  { title: 'Body', optional: 'body',
    onTip: 'Take the body out — the burst on its own',
    offTip: 'Put a pitched thump under the burst',
    rows: [
      pick('$body.type', 'WAVE', WAVES, 'triangle'),
      n('$body.gain', 'LEVEL', 0, 1, 0.005, fixed(3), 0.375),
      n('$body.from', 'PITCH', 30, 1200, 5, hz, 210, 'Hz'),
      n('$body.to', 'FALLS TO', 20, 1000, 5, hz, 140, 'Hz'),
      n('$body.decay', 'DECAY', 0.005, 0.5, 0.005, secs, 0.06),
    ] },
  { title: 'Taps', taps: true },
];

const BODY_DEFAULT = { type: 'triangle', from: 210, to: 140, decay: 0.06, gain: 0.375 };

/**
 * A drum-synth preset: the Microtonic construction. Two sources, each with its own
 * envelope, summed into an optional drive — see `_playDrum`. Both sections can be
 * switched off (a tom is all osc, a clap all noise), so both are optional groups;
 * a preset with neither is silent, and a silent preset is refused at save.
 *
 * Defaults are `_playDrum`'s own `??` fallbacks, same rule as the noise groups.
 */
// ---- why the pills lead, and LEVEL after them -------------------------------
//
// The grid is four columns and a pill row spans all four, so a `pick` anywhere in the
// middle of the knobs BREAKS THE ROW: whatever knob follows it starts a fresh one with
// three empty columns beside it. With WAVE first and CURVE seventh, both sections came
// out five rows tall with DECAY and LEVEL each sitting alone on a row of four.
//
// So the two pills are adjacent — they cost two full rows wherever they go, and next to
// each other they read as the section's two shape choices — and the knobs run in one
// unbroken block behind them, which packs six into two rows and seven into two. Two
// rows saved off the panel, and LEVEL lands in the same place in every section rather
// than wherever its group happened to leave it.
const DRUM_GROUPS = [
  { title: 'Oscillator', optional: 'osc',
    onTip: 'Take the pitched half out — noise only',
    offTip: 'Put a pitched source under the noise',
    rows: [
      pick('$osc.type', 'WAVE', WAVES, 'sine'),
      pick('$osc.curve', 'CURVE', ['exp', 'lin'], 'exp'),
      n('$osc.gain', 'LEVEL', 0, 2, 0.01, fixed(2), 1),
      n('$osc.from', 'PITCH', 20, 4000, 5, hz, 190, 'Hz'),
      n('$osc.to', 'FALLS TO', 20, 2000, 5, hz, 52, 'Hz'),
      n('$osc.sweep', 'SWEEP', 0.005, 1, 0.005, secs, 0.07),
      n('$osc.attack', 'ATTACK', 0.001, 0.5, 0.001, secs, 0.001),
      n('$osc.decay', 'DECAY', 0.01, 2, 0.005, secs, 0.35),
    ] },
  { title: 'Noise', optional: 'noise',
    onTip: 'Take the noise half out — the oscillator on its own',
    offTip: 'Put the seeded noise source back in',
    rows: [
      pick('$noise.type', 'SHAPE', FILTER_TYPES, 'bandpass'),
      pick('$noise.curve', 'CURVE', ['exp', 'lin'], 'exp'),
      n('$noise.gain', 'LEVEL', 0, 2, 0.01, fixed(2), 1),
      n('$noise.freq', 'FREQ', 100, 12000, 25, hz, 2600, 'Hz'),
      n('$noise.to', 'SWEEPS TO', 100, 12000, 25, hz, 2600, 'Hz'),
      n('$noise.sweep', 'SWEEP', 0.005, 1.5, 0.005, secs, 0.12),
      n('$noise.Q', 'RESONANCE', 0.1, 12, 0.1, fixed(1), 0.7),
      n('$noise.attack', 'ATTACK', 0.001, 0.5, 0.001, secs, 0.001),
      n('$noise.decay', 'DECAY', 0.005, 1.5, 0.005, secs, 0.12),
    ] },
  { title: 'Drive', rows: [
    n('$drive', 'DRIVE', 0, 1, 0.01, fixed(2), 0),
  ] },
  { title: 'Taps', taps: true },
];

// What an optional section starts as when it is switched on, per key. The osc and
// noise defaults mirror `_playDrum`'s fallbacks the way BODY_DEFAULT mirrors
// `_playNoise`'s — switching a section on changes the sound the engine already
// implied, not to a new one.
const SECTION_DEFAULTS = {
  body: BODY_DEFAULT,
  osc: { type: 'sine', from: 190, to: 52, sweep: 0.07, decay: 0.35, curve: 'exp', gain: 1 },
  noise: { type: 'bandpass', freq: 2600, Q: 0.7, decay: 0.12, gain: 1 },
};

/**
 * The top section: what every preset has, whatever builds it.
 *
 * ---- why there is no GLIDE here ---------------------------------------------
 *
 * Every class in the allowlist extends Tone's `Monophonic`, which carries
 * `portamento`, so a glide control looks like two lines of work. It does nothing.
 * `Monophonic.setNote` only ramps when the note it is gliding FROM is still sounding:
 *
 *     if (this.portamento > 0 && this.getLevelAtTime(t) > 0.05)  ramp
 *     else                                                       setValueAtTime
 *
 * Portamento is a legato feature, and this rack has no legato: `play` round-robins
 * every note onto the next slot in the pool, whose previous note has long since
 * released, so the level at that moment is 0 and the second branch is always the one
 * taken. Measured — a rising line rendered at portamento 0 and 0.25 came out
 * SAMPLE-IDENTICAL, all 264,600 of them.
 *
 * Which also means the `portamento` already sitting in `tpBassy` and `tpBrassCircuit`
 * is doing nothing today. Making it real is an engine change — one slot per
 * monophonic lane and notes long enough to overlap — and it costs the release tails
 * the pool exists to protect.
 */
const commonRows = () => [
  // Steps, not seconds: the engine multiplies by the song's seconds-per-16th, so a
  // preset holds for the same musical length at any tempo.
  n('$dur', 'LENGTH', 0.25, 16, 0.05, fixed(2), 1, 'steps'),
  n('$velocity', 'VELOCITY', 0.05, 1, 0.01, fixed(2), 1),
  // Tuning. Two controls rather than one, because they are two jobs: TRANSPOSE moves
  // the instrument to where it belongs in the arrangement and wants to land exactly
  // on a semitone (a step of 1, so an octave is four detents of the wheel, not a
  // number you have to aim at); FINE is the couple of cents that makes two layered
  // voices beat instead of phase, and needs a step small enough that it could never
  // hit a clean octave by accident. Both are ratios in the rack, so they multiply
  // with the song's own pitch warp rather than fighting it.
  n('$transpose', 'TRANSPOSE', -24, 24, 1, fixed(0), 0, 'st'),
  n('$fine', 'FINE', -100, 100, 1, fixed(0), 0, 'cents'),
  // Vibrato that belongs to the SOUND rather than to the channel. The desk already
  // has a vibrato insert, and that is the right tool for "this channel wobbles";
  // this is for a wobble that should follow the preset onto any lane and into any
  // song. Depth 0 builds no node at all, so a preset that does not want one pays
  // nothing for the control existing.
  n('$vibrato.depth', 'VIB DEPTH', 0, 1, 0.01, fixed(2), 0),
  n('$vibrato.rate', 'VIB RATE', 0.1, 12, 0.1, fixed(1), 5, 'Hz',
    (v) => (v?.vibrato?.depth ?? 0) > 0),
  // Mono holds one instance for the whole lane, so a new note cuts the last one off
  // — and, because that instance remembers what it was playing, GLIDE finally has a
  // pitch to slide from. Glide is greyed until mono is on for exactly that reason:
  // set it on a polyphonic preset and every note lands on a fresh voice with nothing
  // to glide from, and the control does nothing at all.
  pick('$mono', 'VOICING', [false, true], false),
  n('$portamento', 'GLIDE', 0, 0.5, 0.005, secs, 0, '', (v) => v?.mono === true),
];

// ---- paths ------------------------------------------------------------------

// `$`-prefixed paths are on the entry itself (`dur`, `velocity`, `noise.freq`,
// `osc.type`); everything else is inside `options`, which is the bag Tone's
// constructors take. One resolver, so a row does not have to know which it is —
// and `$` paths dot the same way, because the entry's own sections are objects too.
const rootOf = (preset, path) => (path.startsWith('$') ? preset : (preset.options ||= {}));
const keysOf = (path) => (path.startsWith('$') ? path.slice(1).split('.') : path.split('.'));

function getAt(preset, path) {
  return keysOf(path).reduce((o, k) => (o == null ? undefined : o[k]), rootOf(preset, path));
}

function setAt(preset, path, value) {
  const ks = keysOf(path);
  let o = rootOf(preset, path);
  for (let i = 0; i < ks.length - 1; i++) o = (o[ks[i]] ||= {});
  o[ks[ks.length - 1]] = value;
}

/** An id from a label: `Round Mono` → `roundMono`, made unique against the catalogue. */
export function idFromLabel(label, taken = VOICES) {
  const words = String(label).replace(/[^A-Za-z0-9 ]+/g, ' ').trim().split(/\s+/);
  let base = words.map((w, i) => (i ? w[0].toUpperCase() + w.slice(1) : w.toLowerCase())).join('');
  if (!base || /^\d/.test(base)) base = `voice${base}`;
  let id = base;
  for (let i = 2; taken[id]; i++) id = `${base}${i}`;
  return id;
}

// ---- the panel --------------------------------------------------------------

/**
 * Build the editor against the desk's own helpers.
 *
 * Handed in rather than imported so this file stays a panel and not a second copy of
 * the desk: `knob` is the desk's own pot — the pan control's ring, sweeping from one
 * end instead of from the centre — so a preset's ATTACK behaves exactly like every
 * other rotary on the desk, down to shift-drag and click-the-number-to-type.
 */
export function createVoiceEditor({
  el, knob, toast, refresh, noiseBuf, sampleRate, onChanged, assign, close,
  // Where an edit goes when the preset belongs to a SONG rather than to the library.
  // A library preset is edited in the catalogue and written to voices.js by the panel's
  // own Save; a song's copy lives in that song's mix, so every touch has to reach the
  // draft or the desk would hold a mix that disagrees with the sound. See writeSongVoice.
  onEdit = () => {},
  // Copy what is on the panel into the song the lane belongs to — measured on the way
  // in, because a copy gets its level from a peak exactly as a library preset does.
  saveToSong = null,
  // Hold named songs on the sound this preset makes NOW, so an update to it leaves them
  // where they are. `(voiceId, preset, trackIds) => Promise<boolean>`; false means
  // nothing was written, and the save that asked for it is abandoned rather than going
  // ahead without the pin. See pinPresetInSongs.
  pinSongs = async () => true,
  // Whether this preset is now carrying changes that are on the sound and nowhere else.
  // The desk keeps the tally, because the panel forgets everything when it closes and
  // the loss happens later — on the reload after it. See dirtyLibraryVoices.
  onDirty = () => {},
}) {
  // What is being edited: the live catalogue entry, plus what it looked like when the
  // panel opened. Edits go straight into VOICES[id] — that object IS what the engine
  // reads at play time, which is the whole reason a change is audible before it is
  // saved — so the baseline is the only way back.
  let state = null;

  const isOpen = () => !!state && el.classList.contains('show');

  /** The entry as it will be written: no id, kind or peak — those are derived on load. */
  const asPreset = (v) => {
    const { id, kind, peak, songLocal, ...rest } = v;
    return JSON.parse(JSON.stringify(rest));
  };

  /**
   * The entry as a SONG carries it — the preset plus the two things voices.js would
   * otherwise stamp on it.
   *
   * `kind` comes from the table a preset is filed in and `peak` from measuring it, so
   * neither is written into the library file. A song's mix has no tables and no
   * measuring pass of its own, so a copy has to carry both or it arrives as a toneless
   * synth at the wrong level. `songLocal` is not carried: it describes where the entry
   * came from, and registerSongVoice is what says that.
   */
  const asSongPreset = (v) => ({ ...asPreset(v), kind: v.kind, peak: v.peak });

  /**
   * An edit landed: make it audible, and start working out what it did to the level.
   *
   * `refresh` drops the synths built from the old options — the only cache between
   * the catalogue and the sound — so the change is heard on the next note with no gap
   * and no restart. Everything else the note needs, level included, is read at
   * schedule time.
   *
   * The level itself is the slow half, so it is debounced away from the drag. A
   * measurement is ~10ms, which is fast enough to feel live and far too slow to run
   * per pointer-move: a slider drag is a hundred events, and ninety-nine of them are
   * answers nobody waited to hear.
   */
  const touched = () => {
    state.dirty = true;
    state.measured = false;      // the peak on file no longer describes this sound
    refresh(state.id);
    // A song's copy has no file behind it, so this IS its save: the draft mix is where
    // it lives, and an edit that never reached it would be lost on the next applyMix
    // — which re-registers the catalogue entry from the mix and would put the old
    // sound straight back over this one. No-op on a library preset.
    onEdit(state.id, asSongPreset(state.voice));
    onDirty(state.id, true);
    scheduleEstimate();
    paintFoot();
  };

  // ---- the live level ------------------------------------------------------

  let estimateTimer = null;
  let estimateSeq = 0;

  const scheduleEstimate = () => {
    clearTimeout(estimateTimer);
    estimateTimer = setTimeout(runEstimate, 80);
  };

  /**
   * What this edit did to the preset's loudness, as a RATIO.
   *
   * The peak on file is measured through the whole render pipeline, offline, on the
   * server; the peak measured here is the synth's own, in a bare context. They are not
   * the same number and never will be — `roundMono` is 0.9005 on file and renders 1.29
   * here. So the raw figure is never used directly. What is used is how much it MOVED:
   *
   *   peak ≈ peak-on-file × (raw now ÷ raw when this opened)
   *
   * Everything between the synth and the master is linear in the synth's output —
   * gains, pans, filters, sends — so the constant between the two scales divides out,
   * and what is left is right whatever that constant happens to be. The exception is
   * anything that is not linear, a limiter or a bus compressor; neither is in the path,
   * because the peaks on file are all measured with no mix at all.
   *
   * It is an estimate and it is labelled as one. Saving measures the real thing.
   */
  async function runEstimate() {
    if (!state || state.rawBaseline == null) return;
    const seq = ++estimateSeq;
    const { id } = state;
    let raw = null;
    try {
      raw = await measureRaw(id, noiseBuf(), sampleRate());
    } catch { /* an estimate is a nicety; the save is the measurement */ }
    // A drag fires these faster than they finish, and they do not finish in order.
    // Only the newest may write, or the level lands on whatever settled last.
    if (seq !== estimateSeq || state?.id !== id) return;
    if (raw == null) return;
    if (!(raw > 0)) {
      // Worth catching here rather than at save: this is the failure that is invisible
      // where you are standing, and now it is caught while you are still moving the
      // control that caused it.
      state.silent = true;
      paintFoot();
      return;
    }
    state.silent = false;
    state.voice.peak = state.peakBaseline * (raw / state.rawBaseline);
    state.estimated = true;
    // The level is part of the preset, so a song's copy has to carry the new one too —
    // this lands after `touched` wrote the shape, and the peak is the slow half.
    onEdit(state.id, asSongPreset(state.voice));
    // No refresh needed: `voiceGain` is read per note, so the next one is already at
    // the new level.
    paintFoot();
  }

  /** Take the current sound as the thing future estimates are measured against. */
  async function rebase() {
    try {
      const raw = await measureRaw(state.id, noiseBuf(), sampleRate());
      if (raw > 0) { state.rawBaseline = raw; state.peakBaseline = state.voice.peak; }
    } catch { /* leave the old baseline; a stale ratio beats none */ }
  }

  // ---- controls ------------------------------------------------------------

  // Rows that only apply under some condition, collected as the panel is built and
  // re-tested by `syncRows` whenever anything changes. Cleared per render, or a
  // reopened panel keeps testing guards against elements that are no longer on screen.
  let rowGuards = [];

  const numRow = (row) => {
    const cur = getAt(state.voice, row.path);
    const value = typeof cur === 'number' ? Math.min(row.max, Math.max(row.min, cur)) : row.def;
    const r = knob({
      min: row.min, max: row.max, step: row.step, value, reset: row.def, fmt: row.fmt,
      onInput: (x) => { setAt(state.voice, row.path, x); touched(); syncRows(); },
    });
    r.label.textContent = row.label;
    // The unit, quietly, after the name — `SWEEP oct`, `FROM Hz`. The reading itself
    // is inside the ring and has no room for it.
    if (row.unit) {
      const u = document.createElement('span');
      u.className = 'kunit';
      u.textContent = row.unit;
      r.label.append(' ', u);
    }
    // The stored value can sit outside the pot's range — a hand-written preset is not
    // bound by what this editor thinks is a sensible maximum — and clamping it into
    // view without saying so would silently change a sound by opening its editor.
    if (typeof cur === 'number' && cur !== value) {
      r.label.prepend('* ');
      r.wrap.title = `On file as ${cur}, which is outside this control's range —`
        + ' moving the pot will change it';
    }
    if (row.when) rowGuards.push({ el: r.wrap, when: row.when });
    return r.wrap;
  };

  /**
   * A choice, as a row of pills rather than a dropdown.
   *
   * Four filter shapes is not a list you scroll, it is a set you can see — and a
   * dropdown hides three of the four behind a click and a menu, which is a lot of
   * ceremony for a control whose whole content fits on one line. The set is small and
   * fixed, so it may as well all be on screen and one click from anywhere in it.
   */
  const pickRow = (row) => {
    // `read`/`write` let two controls share one stored property. The oscillator needs
    // it: Tone spells voicing as a prefix on the type (`fatsawtooth`), so SHAPE and
    // VOICING are two pills over one string, and each has to change its own half
    // without disturbing the other's.
    const cur = row.read ? row.read(state.voice) : (getAt(state.voice, row.path) ?? row.def);
    // Named ABOVE its pills and half a card wide, so a pair like CARRIER/MODULATOR
    // sits on one row instead of two — the same centred-name-over-control shape the
    // pots beside it use.
    //
    // This replaced a label on the same LINE as the pills, which was chosen because
    // `Oscillator` over an unlabelled row of waveforms had read as a heading with
    // orphaned buttons under it. That failure was a GROUP title being mistaken for a
    // control's name; here every pick carries its own name directly over its own
    // pills, so there is nothing left to mistake it for. A pick that is alone in its
    // group still takes the full width — see `.segwide`.
    const wrap = document.createElement('div');
    // WAVE is the exception to the standard half-width pick, and it earns it on option
    // count: every other pick in the panel offers two to four, and a waveform list is
    // six or seven — `SIN SQR SAW TRI PWM PLS` across half a card is seven pills of
    // twenty pixels, which is a row of abbreviations you decode rather than read.
    // CARRIER and MODULATOR hold the same list and are NOT excepted: they are a pair, so
    // they have each other to sit beside and halving them is what makes them read as a
    // pair rather than as two unrelated rows.
    const wave = row.label === 'WAVE';
    wrap.className = 'row segrow' + (row.wide ? ' segwide' : '') + (wave ? ' segwave' : '');
    const k = document.createElement('span'); k.className = 'k'; k.textContent = row.label;
    wrap.append(k);

    const seg = document.createElement('div'); seg.className = 'seg';
    // The current value leads the list if it is one this editor does not offer. Tone
    // takes `fmsquare5`, `pwm` and `amsine2`, and the imported presets use them; a
    // control that dropped the current value would rewrite the sound on open.
    const options = row.options.some((o) => String(o) === String(cur))
      ? row.options : [cur, ...row.options];
    for (const o of options) {
      const b = document.createElement('button');
      b.className = 'segbtn' + (String(o) === String(cur) ? ' on' : '');
      // Abbreviated, because the pills are what makes this fit: `lowpass` across four
      // options is wider than the panel. The full word is on the tooltip.
      b.textContent = SHORT[o] ?? String(o);
      b.title = String(o);
      b.onclick = () => {
        // Kept as a number where the catalogue holds one: `rolloff: '-24'` is not a
        // rolloff Tone recognises.
        setAt(state.voice, row.path, row.write ? row.write(state.voice, o) : o);
        for (const other of seg.children) other.classList.toggle('on', other === b);
        touched();
        // A pick can be what decides whether other rows apply — fat voicing turns the
        // stack controls on — so the panel re-reads its guards after every change.
        syncRows();
      };
      seg.append(b);
    }
    wrap.append(seg);
    if (row.when) rowGuards.push({ el: wrap, when: row.when });
    return wrap;
  };

  /**
   * Grey out the rows whose control does not currently apply.
   *
   * Disabled rather than removed, and rebuilt nowhere: taking a row out of the grid
   * would reflow everything under it while the pointer is still on the pill that did
   * it, and re-rendering the whole card on a pick would drop a pot mid-drag.
   */
  function syncRows() {
    for (const g of rowGuards) {
      const on = !!g.when(state.voice);
      g.el.classList.toggle('vedisabled', !on);
      for (const el of g.el.querySelectorAll('button, input')) el.disabled = !on;
    }
  }

  /**
   * The taps: one hit repeated a few milliseconds apart, each quieter than the last.
   *
   * A count and a spacing would be the obvious control and would be wrong — the claps
   * in the catalogue are unevenly spaced on purpose, and a UI that regenerated the
   * array would flatten `[0, 0.011, 0.023, 0.036]` into four equal gaps the moment you
   * opened it. So each tap keeps its own offset, and the stepper adds and removes from
   * the end.
   */
  const tapsGroup = () => {
    const grid = document.createElement('div'); grid.className = 'devgrid vetaps';
    const taps = state.voice.taps || [0];

    const head = document.createElement('div'); head.className = 'row veinline';
    const k = document.createElement('span'); k.className = 'k'; k.textContent = 'HITS';
    const box = document.createElement('div'); box.className = 'vestep';
    const readout = document.createElement('span'); readout.className = 'v';
    readout.textContent = String(taps.length);
    const step = (d) => {
      const list = (state.voice.taps || [0]).slice();
      if (d > 0) {
        // A new tap lands after the last by the gap the last one uses, so adding to a
        // clap keeps its rhythm instead of restarting it.
        const gap = list.length > 1 ? list[list.length - 1] - list[list.length - 2] : 0.012;
        list.push(Number((list[list.length - 1] + gap).toFixed(4)));
      } else if (list.length > 1) list.pop();
      else return;
      // One tap at zero is what every preset without a `taps` key already does, so it
      // is written as no key at all rather than as an array saying nothing.
      if (list.length <= 1) { delete state.voice.taps; delete state.voice.tapFalloff; }
      else {
        state.voice.taps = list;
        if (state.voice.tapFalloff == null) state.voice.tapFalloff = 0.78;
      }
      touched();
      build();
    };
    const btn = (text, d, title) => {
      const b = document.createElement('button');
      b.className = 'devlink'; b.textContent = text; b.title = title;
      b.onclick = () => step(d);
      return b;
    };
    box.append(btn('−', -1, 'One fewer repeat'), readout, btn('+', 1, 'One more repeat'));
    head.append(k, box);
    grid.append(head);

    if (taps.length > 1) {
      taps.slice(1).forEach((t, i) => {
        const r = knob({
          min: 0.002, max: 0.2, step: 0.001, value: t, reset: 0.012 * (i + 1),
          fmt: (x) => `${Math.round(x * 1000)}ms`,
          onInput: (x) => { state.voice.taps[i + 1] = x; touched(); },
        });
        r.label.textContent = `HIT ${i + 2}`;
        grid.append(r.wrap);
      });
      const r = knob({
        min: 0.2, max: 1, step: 0.01, value: state.voice.tapFalloff ?? 0.78, reset: 0.78,
        fmt: fixed(2),
        onInput: (x) => { state.voice.tapFalloff = x; touched(); },
      });
      r.label.textContent = 'FALLOFF';
      r.wrap.title = 'How much quieter each repeat is than the one before it';
      grid.append(r.wrap);
    } else {
      const note = document.createElement('div');
      note.className = 'devnote';
      note.textContent = 'One hit. Add a repeat or two a few milliseconds apart and it '
        + 'becomes a clap — which is all a clap is: one sound heard several times in a '
        + 'small room.';
      grid.append(note);
    }
    return grid;
  };

  const groupCard = (group) => {
    const card = document.createElement('div');
    card.className = 'device vegroup';
    const bar = document.createElement('div'); bar.className = 'devbar';
    const h = document.createElement('h4'); h.textContent = group.title;
    bar.append(h);

    // An optional group — the noise body — is switched on and off rather than always
    // present: a preset with `body: { gain: 0 }` still builds an oscillator per hit,
    // and "no body" is a different sound from "a body at zero".
    if (group.optional) {
      const on = state.voice[group.optional] !== undefined;
      const sw = document.createElement('button');
      sw.className = `devlink veswitch${on ? ' on' : ''}`;
      sw.textContent = on ? 'On' : 'Off';
      sw.title = on ? group.onTip : group.offTip;
      sw.onclick = () => {
        if (state.voice[group.optional]) delete state.voice[group.optional];
        else state.voice[group.optional] = { ...(SECTION_DEFAULTS[group.optional] || {}) };
        touched();
        build();
      };
      bar.append(sw);
      card.append(bar);
      if (!on) return card;
    } else card.append(bar);

    if (group.taps) { card.append(tapsGroup()); return card; }
    const grid = document.createElement('div'); grid.className = 'devgrid';
    // A group with a single pick in it gives that pick the whole width; a group with a
    // pair sits them side by side. Decided per GROUP rather than per row so a lone
    // WAVE never ends up half a card wide with nothing beside it.
    const picks = group.rows.filter((r) => r.kind === 'pick').length;
    for (const row of group.rows) {
      grid.append(row.kind === 'pick' ? pickRow({ ...row, wide: picks < 2 }) : numRow(row));
    }
    card.append(grid);
    return card;
  };

  /** A label in the strips' own idiom, for the things in the head that are not rows. */
  const synLabel = (text) => {
    const k = document.createElement('span');
    k.className = 'k vesublabel';
    k.textContent = text;
    return k;
  };

  // ---- chrome --------------------------------------------------------------

  let foot = null;

  /**
   * The foot has one job: whether there is anything to save.
   *
   * It used to carry the measured peak and an UNSAVED flag as well. The flag was the
   * save button said twice — the button is dark until there is something to write —
   * and the peak is a number you only act on at the moment you commit, so it moved to
   * the save sheet where it can say what to do about it. See `openSaveSheet`.
   */
  /** Is there a song this panel could copy the preset into? See saveToSong. */
  const canCopyToSong = () => !!(saveToSong && state?.laneKey && !state.voice?.songLocal);

  function paintFoot() {
    if (!foot) return;
    // An unedited preset has nothing to write to the LIBRARY — that is what the
    // disabled state has always said. It does have somewhere to go, though: copying
    // it into the song is a reasonable first move, made BEFORE any editing, so that
    // what follows lands on the song's own copy instead of on the shared preset. Left
    // disabled, the only way to reach that button was to dirty the library entry
    // first, which is precisely the thing a copy exists to avoid.
    //
    // And a library entry has one more thing to write with the sound untouched: its own
    // NAME. Renaming and re-filing live in the save sheet, and this button is the way
    // to the sheet — so on an unedited library preset the old rule made the one job you
    // open the library to do unreachable, unless you first changed a sound you did not
    // want to change. A song's own copy is excluded: its name is `bassVoice@plumber`,
    // which describes where it lives rather than what it is called.
    const canRefile = !state.isNew && !state.voice?.songLocal;
    foot.saveBtn.disabled = !state.dirty && !state.isNew && !canCopyToSong() && !canRefile;
    foot.saveBtn.textContent = canCopyToSong() ? 'Save…' : 'Save to Library';
    foot.saveBtn.title = !state.dirty && canRefile && !canCopyToSong()
      ? 'Rename this preset or file it under another category — the sound is unchanged'
      : 'Where this sound goes: into the song as its own copy, or into src/data/voices.js'
        + ' as a library preset every song can play';
  }

  function build() {
    el.textContent = '';
    const v = state.voice;

    // ---- head: what it is, then what builds it
    //
    // The name is a HEADING, not a field. Naming a preset only matters at the moment
    // it goes into the library, and that is what the save sheet is for — an input
    // sitting here made the panel look like a form for filling in rather than an
    // instrument for shaping. Styled and positioned as the channel strips' own header
    // so the two line up across the gap between them.
    const head = document.createElement('div'); head.className = 'vehead';
    const sub = document.createElement('div'); sub.className = 'vesub';

    const title = document.createElement('h3');
    title.className = 'vetitle';
    title.textContent = v.label || 'untitled';
    title.title = `${v.label} — rename it when you save it`;
    // The category, where a channel strip wears its group — same slot, same size,
    // same lane colour, so the panel's header reads as one of the rack's own.
    const tag = document.createElement('div');
    tag.className = 'vetag';
    tag.textContent = v.category || '';
    head.append(title, tag);

    if (v.kind === 'tone') {
      const syn = document.createElement('select'); syn.className = 'fxsel vesynth';
      syn.title = 'The Tone class this preset is built from. Only the seven that have been'
        + ' measured rendering offline are here — see src/engine/voices.js.';
      for (const s of EDITABLE_SYNTHS) {
        const o = document.createElement('option');
        o.value = s; o.textContent = s;
        if (s === v.synth) o.selected = true;
        syn.append(o);
      }
      syn.onchange = () => {
        // The options of one class mean nothing to another — a MonoSynth's filter
        // envelope is not a parameter an FMSynth has — so changing class starts from
        // that class's defaults rather than carrying the old keys across, where they
        // would sit in the file forever doing nothing.
        v.synth = syn.value;
        v.options = defaultsFor(syn.value);
        touched();
        build();
      };
      sub.append(synLabel('SYNTH'), syn);
    }
    // Nothing for the noise and drum kinds. There it was a label and a badge naming a
    // construction you cannot choose from here — a row of chrome at the top of a panel
    // pinned to a strip's width, and the cards below already say what the sound is made
    // of. The SYNTH row survives only where it is a CONTROL: the class dropdown.

    // No lane badge. It named the strip this was opened from, which was worth saying
    // when the panel floated over the desk — and is one label too many now that it is
    // sitting against that strip with its header lined up against it.

    // Closed, or folded away — two different acts, so two different marks.
    //
    // DOCKED, the panel does not go anywhere. Beside a strip it collapses back into the
    // strip it belongs to, which reopens it from the same `»` on its header; in the
    // library it folds to a rail and comes back on the preset it was already on. A ✕ in
    // either place is the button lying about what it does, and a ✕ is something you
    // hesitate over when you have work in the panel behind it. A chevron pointing the
    // way it collapses says put-away, and says which way.
    //
    // A lane key means it is sitting against that lane's strip — see placeVoiceEditor,
    // which docks it there or dismisses it, so there is no third state. `vedocked` is
    // the library's dock. Only the floating window, which has neither, actually closes.
    const shut = document.createElement('button');
    const folds = el.classList.contains('vedocked') || !!state.laneKey;
    shut.className = folds ? 'veclose vefold' : 'veclose popclose';
    // `«` — the mirror of the `»` that opened it. One pair, one meaning: this mark
    // reveals the editor, that one puts it away. Closing outright is a different act
    // and keeps the desk's standard ✕.
    if (folds) shut.append(foldIcon('left')); else shut.textContent = '✕';
    shut.title = state.laneKey
      ? 'Put the editor away — the » on the strip’s header brings it back'
      : folds
        ? 'Hide the editor — the rail down the side brings it back'
        : 'Close the editor — unsaved changes stay on the sound until you revert';
    shut.onclick = () => close();
    head.append(shut);
    el.append(head);
    // Only when it holds a control. An empty `.vesub` still costs its own margin, and
    // the whole point of dropping the badge was the vertical space it was spending.
    if (sub.childElementCount) el.append(sub);

    // ---- who else plays it
    if (state.used?.length) {
      const used = document.createElement('div');
      used.className = 'veused';
      used.textContent = `${state.used.length} song${state.used.length === 1 ? '' : 's'} play`
        + `${state.used.length === 1 ? 's' : ''} this: ${state.used.join(', ')}`;
      used.title = 'A preset is library-wide. Editing it changes these songs too —'
        + ' which is usually the point, and occasionally a surprise.';
      el.append(used);
    }

    // ---- the parameters
    const rack = document.createElement('div'); rack.className = 'verack';
    const common = { title: 'Note', rows: commonRows() };
    const groups = v.kind === 'noise' ? NOISE_GROUPS
      : v.kind === 'drum' ? DRUM_GROUPS
        : (SYNTH_GROUPS[v.synth] || []);
    // Guards belong to the panel being built, not to the one before it.
    rowGuards = [];
    for (const g of [common, ...groups]) rack.append(groupCard(g));
    syncRows();
    el.append(rack);

    // ---- the foot
    const bar = document.createElement('div'); bar.className = 'vefoot';

    const revert = document.createElement('button');
    revert.className = 'devlink'; revert.textContent = 'Revert';
    revert.title = 'Put the sound back the way it was when this opened';
    revert.onclick = () => {
      // `id` and `kind` are DERIVED — src/data/voices.js stamps them on load and the
      // baseline is a preset as it would be written to the file, so neither is in it.
      // Emptying the entry and refilling it from the baseline therefore dropped both,
      // which left a MonoSynth with no kind: the picker stopped filing it, the editor
      // drew it as a noise preset, and `voiceGain` lost the peak and re-levelled it.
      // They are properties of the catalogue, not of the edit, so they are held across.
      const { id, kind } = state.voice;
      Object.keys(state.voice).forEach((k) => delete state.voice[k]);
      Object.assign(state.voice, JSON.parse(JSON.stringify(state.baseline)), { id, kind });
      // Back to the level it opened at too. The baseline peak is the one the ratio has
      // been measuring against all along, so this is exactly where it started.
      state.voice.peak = state.peakBaseline;
      state.dirty = false;
      state.measured = !state.isNew;
      state.estimated = false;
      state.silent = false;
      // Put back is the other way to stop owing a save, and the desk's tally has to
      // hear about it or the reload guard goes on warning about a sound nobody changed.
      onDirty(state.id, false);
      onEdit(state.id, asSongPreset(state.voice));
      // An estimate already in flight would land on the reverted sound and undo this.
      estimateSeq++;
      clearTimeout(estimateTimer);
      refresh(state.id); onChanged(); build();
      toast(`${state.voice.label} put back`);
    };

    const del = document.createElement('button');
    del.className = 'devlink vedanger'; del.textContent = 'Delete';
    del.title = 'Remove this preset from src/data/voices.js';
    del.onclick = () => remove();

    const save = document.createElement('button');
    save.className = 'vesave'; save.textContent = 'Save to Library';
    save.title = 'Where this sound goes: into the song as its own copy, or into'
      + ' src/data/voices.js as a library preset every song can play';
    save.onclick = () => openSaveSheet();

    bar.append(revert, del, save);
    el.append(bar);
    foot = { saveBtn: save };
    paintFoot();
  }

  /** A fresh options object for a class, from the schema's own defaults. */
  function defaultsFor(synth) {
    const out = {};
    for (const g of SYNTH_GROUPS[synth] || []) {
      for (const row of g.rows || []) {
        if (row.path.startsWith('$')) continue;
        // `derived` shares a property with another row and must not write it twice;
        // `when` rows do not apply to a preset in its default state, and writing them
        // anyway puts `count`/`spread` into every preset that will never be fat.
        if (row.derived || row.when) continue;
        setAt({ options: out }, row.path, row.def);
      }
    }
    return out;
  }

  // ---- saving --------------------------------------------------------------

  /**
   * The save sheet: how the preset is FILED, asked at the moment it is filed.
   *
   * Category and description are not sound — you cannot hear either — and while they
   * sat in the panel they cost two rows of controls on every strip-width edit. They
   * belong to committing the thing, so they are asked once, here, over the controls.
   *
   * Prefilled and skippable in one keystroke: on an existing preset both already have
   * answers and Enter takes them. It is a confirmation, not a form.
   */
  async function openSaveSheet() {
    const v = state.voice;
    // Settle the "who plays this" question BEFORE the buttons are drawn — see `open`.
    // It is normally already answered by the time anyone reaches Save; this is for the
    // path that goes straight there, which is the library's right-click.
    if (state.used == null && !state.isNew && !v.songLocal && state.refs) {
      const id = state.id;
      try { await state.refs; } catch { /* the sheet says so below */ }
      if (!state || state.id !== id) return;   // moved on while we waited
    }
    el.querySelector('.vesheet')?.remove();
    const sheet = document.createElement('div');
    sheet.className = 'vesheet';

    const h = document.createElement('h4');
    h.textContent = state.isNew ? 'Save a new preset' : `Save ${v.label}`;
    sheet.append(h);

    const field = (label, control) => {
      const f = document.createElement('label');
      f.className = 'vefield';
      const k = document.createElement('span'); k.className = 'k'; k.textContent = label;
      f.append(k, control);
      sheet.append(f);
      return control;
    };

    const nameBox = document.createElement('input');
    nameBox.className = 'vename';
    nameBox.value = v.label || '';
    nameBox.placeholder = 'Preset name';
    field('Name', nameBox);

    const cat = document.createElement('select');
    cat.className = 'fxsel';
    for (const c of VOICE_CATEGORIES) {
      const o = document.createElement('option');
      o.value = c; o.textContent = c;
      if (c === v.category) o.selected = true;
      cat.append(o);
    }
    field('Files under', cat).title = 'Which column of the library it appears in — the'
      + ' SOUND, not the lane. A bass preset on a lead lane is still a lead.';

    const note = document.createElement('textarea');
    note.className = 'venote'; note.rows = 3;
    note.value = v.note || '';
    note.placeholder = 'What this sound is for — one line, shown under it in the picker';
    field('Description', note);

    // ---- the level, said here because here is where you can do something about it.
    //
    // A preset's loudness on every lane is `voiceGain`: the lane's target divided by
    // this peak. So the number itself is not the point — what it DOES to the level is,
    // and a peak near zero is not a quiet preset, it is one the engine multiplies by
    // hundreds, bringing whatever noise floor it has up with it.
    const p = Number(v.peak);
    const lvl = document.createElement('div');
    lvl.className = 'velevel';
    const reading = document.createElement('span');
    reading.className = 'velevelnum';
    reading.textContent = state.measured ? p.toFixed(4) : `≈ ${p.toFixed(4)}`;
    const says = document.createElement('span');
    says.className = 'velevelsays';
    if (state.silent || !(p > 0)) {
      lvl.classList.add('bad');
      says.textContent = 'Renders to nothing — saving will be refused';
      reading.textContent = 'Silent';
    } else if (p < 0.02) {
      lvl.classList.add('bad');
      // The multiplier, because "0.0004" means nothing and "×530" means everything.
      says.textContent = `Very quiet — its level gets scaled up about ${Math.round(0.2118 / p)}×.`
        + ' Check the envelope.';
    } else {
      says.textContent = state.measured ? 'Measured' : 'Estimated — measured properly on save';
    }
    lvl.append(reading, says);
    field('Level', lvl);

    // ---- what saving over it would reach.
    //
    // The panel says who plays a preset from the moment it opens, and that was not
    // enough: it is context while you are turning knobs, and the question it answers
    // only becomes a decision at the instant you press Save. So it is asked again here,
    // where the buttons are — and where the alternative to reaching six songs is one
    // click away rather than something you have to know about.
    //
    // Only on an existing library preset. A new one reaches nothing, and a song's own
    // copy reaches exactly the song it lives in, which is not news.
    let pinBoxes = [];
    const inLibrary = !state.isNew && !v.songLocal;
    // Three states, not two. "No songs play this" and "we could not find out" must not
    // look the same, because one of them is a reason to press Update without thinking
    // and the other is the opposite.
    const known = state.used != null;
    const reaches = inLibrary && known ? state.used : [];
    // Unsafe means: pressing Update might change songs you have not been told about.
    // An unknown answer counts, which is what makes the failure mode of the check
    // cautious rather than silent.
    const unsafe = inLibrary && (!known || reaches.length > 0);
    if (inLibrary && !known) {
      const warn = document.createElement('div');
      warn.className = 'vereach vereachunknown';
      warn.textContent = 'Could not check which songs play this';
      warn.title = 'The desk asks the server which songs name this preset, and the answer'
        + ' did not arrive. Updating would change every one of them, and there is no list'
        + ' to show you — so Save as new is the safe move until it can be checked.';
      sheet.append(warn);
    } else if (reaches.length) {
      const warn = document.createElement('div');
      warn.className = 'vereach';
      const n = reaches.length;
      const head = document.createElement('div');
      head.className = 'vereachhead';
      head.textContent = `Updating changes ${n} song${n === 1 ? '' : 's'}`;
      head.title = 'A preset is library-wide — these songs name this entry, so they play'
        + ' whatever it becomes. Nothing breaks and nothing goes silent; the sound simply'
        + ' moves under them.';
      warn.append(head);

      // A tick per song: keep this one on the sound it has, or let it follow.
      //
      // Unticked by default, which is what Update has always meant — the common edit is
      // a fix, and a fix is wanted everywhere. Ticking is the deliberate act, because
      // its consequence is the one that lasts: a pinned song stops tracking this preset
      // for good, so a fix made to it next month will not reach that song and nothing
      // will say why.
      for (const song of reaches) {
        const row = document.createElement('label');
        row.className = 'vereachrow';
        const box = document.createElement('input');
        box.type = 'checkbox';
        box.dataset.song = song;
        const name = document.createElement('span');
        name.className = 'vereachname';
        name.textContent = song;
        const what = document.createElement('span');
        what.className = 'vereachwhat';
        const paint = () => {
          what.textContent = box.checked ? 'Keeps the sound it has' : 'Follows the update';
          row.classList.toggle('pinned', box.checked);
        };
        box.onchange = paint;
        paint();
        row.title = `Ticked, ${song} gets its own copy of this sound and stops tracking`
          + ' the preset — later changes to it will not reach this song. Unticked, it'
          + ' plays whatever the preset becomes.';
        row.append(box, name, what);
        warn.append(row);
      }
      pinBoxes = [...warn.querySelectorAll('input[type=checkbox]')];
      sheet.append(warn);
    }

    const bar = document.createElement('div'); bar.className = 'vesheetfoot';
    const cancel = document.createElement('button');
    cancel.className = 'devlink'; cancel.textContent = 'Cancel';
    cancel.onclick = () => sheet.remove();

    // Take the name, category and description off the sheet and onto the entry. Both
    // destinations want them: the library files a preset by them, and a song's copy
    // carries them because they are what the strip and the picker read back.
    const takeFields = () => {
      if (!nameBox.value.trim()) { nameBox.focus(); return false; }
      v.label = nameBox.value.trim();
      v.category = cat.value;
      v.note = note.value;
      return true;
    };

    /**
     * The other destination: this song's own copy, rather than the library.
     *
     * Offered only on a panel that was opened from a lane, because a copy belongs to a
     * song and a lane is how it knows which — and hidden once the panel is ALREADY on
     * a song copy, where every edit has been going into the mix all along and there is
     * nothing left for a second button to do.
     */
    const toSong = document.createElement('button');
    toSong.className = 'devlink vesong';
    toSong.textContent = 'Save to Song';
    toSong.title = 'Copy this sound into the song as its own, leaving the library preset'
      + ' alone. It is measured on the way in, and saved with the song.';
    toSong.onclick = async () => {
      if (!takeFields()) return;
      sheet.remove();
      build();
      await saveToSong(state.laneKey, asSongPreset(v));
    };

    /**
     * A SECOND preset, leaving this one as it is.
     *
     * Offered on anything already in the library, not only on something in use: a
     * variant is a variant whether or not a song has got to it yet, and an option that
     * appears and disappears depending on how many songs happen to name the preset is
     * one you cannot learn.
     */
    const asNew = document.createElement('button');
    asNew.className = 'devlink venew';
    asNew.textContent = 'Save as new';
    asNew.title = 'Write this sound as its own preset under this name, and put the one it'
      + ' came from back exactly as it was — every song playing that keeps playing it';
    asNew.onclick = () => {
      if (!takeFields()) return;
      sheet.remove();
      forkToNew();
    };

    const go = document.createElement('button');
    go.className = 'vesave';
    // Named for what it does to the thing that already exists. "Save to Library" was
    // true and was not the point: the point is that this entry is about to become
    // something else, everywhere.
    go.textContent = state.isNew ? 'Save to Library' : 'Update';
    go.title = state.isNew
      ? 'Write this into src/data/voices.js as a library preset every song can play'
      : reaches.length
        ? `Change this preset in place — ${reaches.join(', ')}`
          + ` ${reaches.length === 1 ? 'plays' : 'play'} it and will follow`
        : inLibrary && !known
          ? 'Change this preset in place — but which songs play it could not be checked,'
            + ' so this may change songs that are not listed'
          : 'Change this preset in place, in src/data/voices.js';
    go.classList.toggle('vefar', unsafe);
    const send = async () => {
      if (!takeFields()) return;
      const pinning = pinBoxes.filter((b) => b.checked).map((b) => b.dataset.song);
      sheet.remove();
      build();              // the header chip carries the category it was just given
      onChanged();          // and the picker files it under the same
      // Pinned FIRST, and the library only if it worked.
      //
      // The order is the whole guarantee. Pin then update, and a failed update leaves
      // songs holding a copy of the sound they already made — identical, harmless.
      // Update then pin, and a failed pin leaves them following a change you had just
      // said they should not follow, which is the one outcome this exists to prevent.
      if (pinning.length) {
        // The sound as it was when this panel OPENED, not as it is now: what those
        // songs are being held at is what they sound like today, and the panel has been
        // editing the catalogue entry in place ever since.
        const held = { ...JSON.parse(JSON.stringify(state.baseline)), kind: v.kind, peak: state.peakBaseline };
        const ok = await pinSongs(state.id, held, pinning);
        if (!ok) {
          toast('Nothing was saved — the songs could not be pinned, so the preset was'
            + ' left alone too.', 5200);
          return;
        }
        toast(`${pinning.join(', ')} pinned to the current sound`, 3000);
      }
      commit();
    };
    go.onclick = send;
    // Enter anywhere but the description sends it; the description is the one field
    // where a newline is a reasonable thing to want.
    //
    // What Enter sends is the SAFE choice when there is an unsafe one. On a preset six
    // songs play, the fast path must not be the one that changes six songs — a sheet
    // that is a confirmation on most presets and a six-song edit on this one, from the
    // same keystroke, is a keystroke you have to stop and think about every time. Here
    // it forks; the update is a deliberate click.
    sheet.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Escape') { sheet.remove(); return; }
      if (ev.key !== 'Enter' || ev.target === note) return;
      if (unsafe) asNew.click(); else send();
    });
    // Least far-reaching first, in every combination. A song copy touches one song; a
    // fork touches nothing at all; an update touches every song naming the preset. So
    // the reversible ones lead and the far-reaching one is the deliberate reach past
    // them — and Enter, which is the fast path, takes the update only when there is
    // nothing for it to surprise.
    const offerFork = inLibrary;
    bar.append(cancel);
    if (canCopyToSong()) bar.append(toSong);
    if (offerFork) bar.append(asNew);
    bar.append(go);
    sheet.append(bar);
    el.append(sheet);
    // A new preset has a name to give it — that is the whole reason this sheet exists —
    // and an existing one is usually a confirm, so the button takes the focus and Enter
    // is the whole interaction. Where songs are in the way, the focused button is the
    // one that does not touch them, matching what Enter does above.
    if (state.isNew) { nameBox.focus(); nameBox.select(); }
    else if (unsafe) asNew.focus();
    else go.focus();
  }

  /**
   * Save the edit as a SECOND preset, leaving the one it came from as it was.
   *
   * The other answer to "this preset is in six songs". Updating in place is the right
   * thing when you are fixing a sound — every song using it wanted the fix. It is the
   * wrong thing when you are making a variant, and there was no way to say so: the only
   * Save wrote over the original, so the six songs got the new sound whether or not
   * that was the idea.
   *
   * The subtlety is that the editor has been mutating `VOICES[id]` IN PLACE all along —
   * that is what makes an edit audible before it is saved — so by the time you are
   * here, the original entry is already carrying your changes. Forking therefore has to
   * put it back as well as write the new one, or "leave the original alone" would leave
   * it alone only on disk, and every song in this session would go on playing the edit.
   */
  async function forkToNew() {
    const v = state.voice;
    if (!v.label?.trim()) { toast('Give it a name first'); return; }
    const fromId = state.id;
    const fromLabel = state.baseline.label || fromId;
    const newId = idFromLabel(v.label);
    if (newId === fromId) {
      // Same name, so the same key — there is no second preset to be had. Say which
      // thing to change rather than silently doing the destructive one.
      toast(`“${v.label}” is the name it already has. Give the new preset a different`
        + ' name, or use Update to change this one.');
      return;
    }

    // The new entry: the sound as it stands, under its own key. `kind` and `peak` come
    // across because both are derived on load and a fresh entry has neither yet — the
    // peak is a guess until the save measures it, exactly as it is for a copy.
    const made = {
      ...JSON.parse(JSON.stringify(asPreset(v))),
      id: newId, kind: v.kind, peak: v.peak,
    };

    // Put the original back — in memory, where every song on this desk reads it. Same
    // idiom as Revert: `id` and `kind` are properties of the catalogue rather than of
    // the edit, so they are held across the restore.
    const { id, kind } = v;
    Object.keys(v).forEach((k) => delete v[k]);
    Object.assign(v, JSON.parse(JSON.stringify(state.baseline)), { id, kind });
    v.peak = state.peakBaseline;
    onDirty(fromId, false);        // it is back to what the file holds, so nothing is owed
    refresh(fromId);               // and the next note it plays is the old sound again

    // Now move the panel onto the new preset and save that.
    VOICES[newId] = made;
    state.id = newId;
    state.voice = made;
    state.isNew = true;            // it has never been written, so `commit` files it fresh
    state.used = null;             // nothing plays it yet — that is the whole point
    state.baseline = asPreset(made);
    state.peakBaseline = made.peak;
    // A lane that was playing the old preset stays on it. Forking is explicitly about
    // NOT changing what anything already plays, and the lane is something that already
    // plays it — so unlike a rename, this does not repoint anything.
    await commit({ keepLane: true });
    // Said after the save, naming both, because the useful fact is what did NOT happen.
    toast(`${made.label} saved as a new preset — ${fromLabel} is untouched, and every`
      + ' song still plays it', 5200);
    build();
    onChanged();
  }

  async function commit({ keepLane = false } = {}) {
    const v = state.voice;
    if (!v.label?.trim()) { toast('Give it a name first'); return; }

    // A preset that has never been saved takes its id from its name, NOW — not from
    // the name it had when it was copied. `Round Mono copy` renamed to `Journey Bass`
    // and saved should be `journeyBass` in the file, not `roundMonoCopy` with someone
    // else's label on it.
    //
    // Only before the first save. Once the id is on disk it is what mixes and banks
    // name, and a rename is a label change: re-keying then would silence every song
    // playing it, which is precisely the trap `voiceOf` returning null is there for.
    //
    // A song's copy is on the same footing as a never-saved preset here, and for a
    // sharper reason: its id is `bassVoice@plumber`, which says which lane of which
    // song owns it. That is exactly the right name for a thing living in one song's
    // mix and exactly the wrong one for a library entry, so going to the library means
    // taking a library name. `assign` then repoints the lane at it, which drops the
    // copy — see setLaneVoice — so the sound has one home again rather than two.
    if (state.isNew || v.songLocal) {
      delete VOICES[state.id];              // or it counts as taken against itself
      delete v.songLocal;                   // it is about to be a library preset
      const wanted = idFromLabel(v.label);
      const moved = wanted !== state.id;
      state.id = wanted;
      v.id = wanted;
      // Into the catalogue BEFORE the lane is repointed at it: the desk looks the id
      // up to label the strip, and a lane pointed at a key that is not there yet is a
      // strip that cannot draw itself.
      VOICES[wanted] = v;
      // The lane it was made on is holding the old id, and nothing else is — a
      // never-saved preset has had one home since the moment it was copied.
      //
      // Except when the new preset is a FORK. There the lane is holding the preset this
      // one was split off from, which is a real library entry that is staying exactly as
      // it is — repointing the lane at the fork would change what the song plays, which
      // is the one thing forking exists to avoid.
      if (moved && !keepLane) assign(state.laneKey, wanted);
    }

    const btn = foot.saveBtn;
    btn.disabled = true;
    const was = btn.textContent;
    btn.textContent = 'Measuring…';
    try {
      const res = await fetch('/voice-save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: state.id,
          table: v.kind === 'noise' ? 'NOISE' : v.kind === 'drum' ? 'DRUM' : 'TONE',
          preset: asPreset(v),
        }),
      });
      if (!res.ok) { toast(await res.text()); return; }
      const out = await res.json();
      if (out.silent) {
        // The failure this whole pipeline exists to catch: it sounds fine here and
        // renders as nothing. Said plainly, because it does not look like a problem.
        toast(`${v.label} renders SILENT offline — not saved. It would sound right on`
          + ' the desk and be missing from every WAV, stem and video.');
        return;
      }
      // The server's number replaces the estimate — it is the one the game will use,
      // and any drift the ratio accumulated ends here.
      v.peak = out.peak;
      state.measured = true;
      state.estimated = false;
      state.dirty = false;
      state.isNew = false;
      onDirty(state.id, false);           // it is on disk now, so nothing is owed
      state.baseline = asPreset(v);
      // And this sound becomes what the next estimate is measured against, so edits
      // after a save scale from the peak that was just written rather than from the
      // one this panel opened on.
      await rebase();
      onChanged();
      // A peak this low is not a quiet preset — the level is DERIVED from it, so the
      // engine is about to multiply this sound by fifty or more, and anything in it
      // that was inaudible comes up with the rest.
      toast(out.quiet
        ? `${v.label} saved, but it measured at peak ${out.peak} — so its level will be`
          + ' scaled up hugely to reach the lane. Check its envelope.'
        : `${v.label} saved to src/data/voices.js — measured at peak ${out.peak}`,
      out.quiet ? 5200 : undefined);
    } catch (err) {
      toast(`Could not save: ${err.message || err}`);
    } finally {
      btn.textContent = was;
      paintFoot();
    }
  }

  async function remove() {
    const v = state.voice;
    if (state.isNew) {
      // Never written, so there is nothing on disk to delete — it just stops existing.
      delete VOICES[state.id];
      close(); onChanged(); refresh(state?.id);
      toast(`${v.label} discarded`);
      return;
    }
    const send = (force) => fetch('/voice-delete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: state.id, force }),
    });
    let res = await send(false);
    if (res.status === 409) {
      const { used } = await res.json();
      // eslint-disable-next-line no-alert
      const ok = confirm(`${used.length} song${used.length === 1 ? '' : 's'} play this preset:\n\n`
        + `  ${used.join('\n  ')}\n\n`
        + 'Deleting it does not break them — each one quietly goes back to the engine\'s '
        + 'own voice for that lane, which is a change you will only hear.\n\nDelete anyway?');
      if (!ok) return;
      res = await send(true);
    }
    if (!res.ok) { toast(`Could not delete: ${await res.text()}`); return; }
    delete VOICES[state.id];
    close(); onChanged(); refresh(state?.id);
    toast(`${v.label} removed from src/data/voices.js`);
  }

  // ---- opening -------------------------------------------------------------

  /**
   * Edit an existing preset, or start a new one from it.
   *
   * A new preset begins as a COPY rather than as an empty MonoSynth: sound design
   * from a blank envelope is a long way from anything usable, and the sound you were
   * just listening to is the best guess anyone can make about the one you want.
   */
  function open(voiceId, { isNew = false, laneKey = null, laneLabel = null } = {}) {
    const from = VOICES[voiceId];
    if (!from) { toast('No preset to edit'); return null; }
    if (from.kind === 'engine') {
      // Engine presets are bundles of the bank keys the hand-written voices in
      // scheduleStep read — `bassFilteredSaw`, `organPercussion` — not synths. What
      // they can be is a mix edit, not a library one; there is nothing here to build.
      toast(`${from.label} is one of the engine's own hand-written voices — a bundle of`
        + ' bank keys, not a synth. It has no parameters this editor can reach.');
      return null;
    }

    let id = voiceId;
    let voice = from;
    if (isNew) {
      const label = `${from.label} copy`;
      id = idFromLabel(label);
      voice = { ...JSON.parse(JSON.stringify(asPreset(from))), label, id, kind: from.kind, peak: from.peak };
      // Into the live catalogue at once, so the picker lists it and the lane can play
      // it before it has ever been saved. Discarding removes it again.
      VOICES[id] = voice;
    }

    state = {
      id, voice, laneKey, laneLabel, isNew,
      baseline: asPreset(voice),
      dirty: isNew,
      // A brand-new preset carries the peak of the one it was copied from, which is a
      // fair guess and is not a measurement. Say so rather than show a number.
      measured: !isNew,
      estimated: false,
      silent: false,
      used: null,
      // What the live level is worked out from — see `runEstimate`. Both are of the
      // sound as it is RIGHT NOW, before anything has been touched, which is the only
      // moment the peak on file and the sound in the room are known to agree.
      peakBaseline: voice.peak,
      rawBaseline: null,
    };
    build();
    el.classList.add('show');

    // The reference measurement, taken once. Until it lands there is no ratio to
    // scale by, so `runEstimate` leaves the level alone rather than guessing — which
    // is why it is fired here rather than lazily on the first edit.
    measureRaw(id, noiseBuf(), sampleRate())
      .then((raw) => { if (state?.id === id && raw > 0) state.rawBaseline = raw; })
      .catch(() => { /* no ratio; the level simply stays put until a save measures it */ });

    // Who else plays it, fetched after the panel is up: it is context, not a gate, and
    // the editor should not wait on the network to open.
    //
    // The promise is KEPT, though, because the save sheet does have to wait on it. There
    // the same answer stops being context and becomes the difference between changing
    // one preset and changing six songs — and a sheet that rendered before the fetch
    // landed would show no warning at all on exactly the presets that need one, which is
    // the worst possible way for it to be late.
    if (!isNew) {
      state.refs = fetch(`/voice-refs?id=${encodeURIComponent(id)}`)
        .then((r) => r.json())
        .then((out) => {
          if (state?.id === id) { state.used = out.used; build(); }
          return out.used;
        })
        .catch(() => {
          // Unknown, and it must not read as "nothing plays this". Left null so the
          // sheet says it could not check rather than quietly clearing the warning.
          if (state?.id === id) state.used = null;
          return null;
        });
    }
    return id;
  }

  /** Drop the editor's hold on a preset, leaving whatever is on it in place. */
  function forget() { state = null; foot = null; }

  return {
    open,
    isOpen,
    forget,
    close,
    /**
     * The save sheet, opened from outside.
     *
     * For the library's rename-and-refile, which is the same act as saving and must not
     * become a second way of doing it: `commit` is the one path to src/data/voices.js
     * and it MEASURES the preset on the way — a rename that skipped that would write an
     * entry whose peak no longer describes it. So the library asks for this sheet
     * rather than writing a name itself.
     */
    saveSheet() { if (state) openSaveSheet(); },
    get editing() { return state?.id || null; },
    // Which strip the panel belongs beside — the desk re-places it there on every
    // rack repaint. See placeVoiceEditor. Null when it was opened from the library,
    // which is what makes it a window instead of a rack item.
    get laneKey() { return state?.laneKey || null; },
  };
}
