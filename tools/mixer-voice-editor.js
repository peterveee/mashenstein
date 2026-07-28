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

const WAVES = ['sine', 'square', 'sawtooth', 'triangle'];
const FILTER_TYPES = ['lowpass', 'highpass', 'bandpass', 'notch'];

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
  exp: 'EXP', lin: 'LIN',
};

/**
 * A pot on a dotted path into `options`, with the default the engine would use.
 *
 * `unit` is appended to the label rather than to the reading. The value is drawn INSIDE
 * the pot's ring, where there is room for about five characters — so `2.9` goes in the
 * ring and `oct` goes on the label, which is where a hardware panel has always put it.
 */
const n = (path, label, min, max, step, fmt = fixed(2), def = min, unit = '') =>
  ({ kind: 'num', path, label, unit, min, max, step, fmt, def });
/** A row of pills on a dotted path — see `pickRow`. */
const pick = (path, label, options, def) => ({ kind: 'pick', path, label, options, def });

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
    { title: 'Oscillator', rows: [pick('oscillator.type', 'WAVE', WAVES, 'sine')] },
    { title: 'Envelope', rows: adsr('envelope') },
  ],
  MonoSynth: [
    { title: 'Oscillator', rows: [pick('oscillator.type', 'WAVE', WAVES, 'sawtooth')] },
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
    { title: 'Voice 1', rows: [pick('voice0.oscillator.type', 'WAVE', WAVES, 'sawtooth'), ...adsr('voice0.envelope')] },
    { title: 'Voice 2', rows: [pick('voice1.oscillator.type', 'WAVE', WAVES, 'square'), ...adsr('voice1.envelope')] },
  ],
  MembraneSynth: [
    { title: 'Drum', rows: [
      n('pitchDecay', 'PITCH DROP', 0.001, 0.5, 0.001, secs, 0.05),
      n('octaves', 'DEPTH', 0.5, 12, 0.1, fixed(1), 10, 'oct'),
    ] },
    { title: 'Oscillator', rows: [pick('oscillator.type', 'WAVE', WAVES, 'sine')] },
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
    onTip: 'take the body out — the burst on its own',
    offTip: 'put a pitched thump under the burst',
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
    onTip: 'take the pitched half out — noise only',
    offTip: 'put a pitched source under the noise',
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
    onTip: 'take the noise half out — the oscillator on its own',
    offTip: 'put the seeded noise source back in',
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
}) {
  // What is being edited: the live catalogue entry, plus what it looked like when the
  // panel opened. Edits go straight into VOICES[id] — that object IS what the engine
  // reads at play time, which is the whole reason a change is audible before it is
  // saved — so the baseline is the only way back.
  let state = null;

  const isOpen = () => !!state && el.classList.contains('show');

  /** The entry as it will be written: no id, kind or peak — those are derived on load. */
  const asPreset = (v) => {
    const { id, kind, peak, ...rest } = v;
    return JSON.parse(JSON.stringify(rest));
  };

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

  const numRow = (row) => {
    const cur = getAt(state.voice, row.path);
    const value = typeof cur === 'number' ? Math.min(row.max, Math.max(row.min, cur)) : row.def;
    const r = knob({
      min: row.min, max: row.max, step: row.step, value, reset: row.def, fmt: row.fmt,
      onInput: (x) => { setAt(state.voice, row.path, x); touched(); },
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
      r.wrap.title = `on file as ${cur}, which is outside this control's range —`
        + ' moving the pot will change it';
    }
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
    const cur = getAt(state.voice, row.path) ?? row.def;
    const wrap = document.createElement('div'); wrap.className = 'row segrow';
    // Named on the same LINE as its pills, every time — including the one that is the
    // only control in its group. `Oscillator` over an unlabelled row of waveforms read
    // as a heading with orphaned buttons under it; `WAVE  SIN SQR SAW TRI` reads as a
    // control, and it is the same shape as SHAPE, SLOPE, CARRIER and MODULATOR.
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
        setAt(state.voice, row.path, o);
        for (const other of seg.children) other.classList.toggle('on', other === b);
        touched();
      };
      seg.append(b);
    }
    wrap.append(seg);
    return wrap;
  };

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
    box.append(btn('−', -1, 'one fewer repeat'), readout, btn('+', 1, 'one more repeat'));
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
      r.wrap.title = 'how much quieter each repeat is than the one before it';
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
      sw.textContent = on ? 'on' : 'off';
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
    for (const row of group.rows) grid.append(row.kind === 'pick' ? pickRow(row) : numRow(row));
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
  function paintFoot() {
    if (!foot) return;
    foot.saveBtn.disabled = !state.dirty && !state.isNew;
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
      syn.title = 'the Tone class this preset is built from. Only the seven that have been'
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

    const shut = document.createElement('button');
    shut.className = 'veclose'; shut.textContent = '✕';
    shut.title = 'close the editor — unsaved changes stay on the sound until you revert';
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
    for (const g of [common, ...groups]) rack.append(groupCard(g));
    el.append(rack);

    // ---- the foot
    const bar = document.createElement('div'); bar.className = 'vefoot';

    const revert = document.createElement('button');
    revert.className = 'devlink'; revert.textContent = 'Revert';
    revert.title = 'put the sound back the way it was when this opened';
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
      // An estimate already in flight would land on the reverted sound and undo this.
      estimateSeq++;
      clearTimeout(estimateTimer);
      refresh(state.id); onChanged(); build();
      toast(`${state.voice.label} put back`);
    };

    const del = document.createElement('button');
    del.className = 'devlink vedanger'; del.textContent = 'Delete';
    del.title = 'remove this preset from src/data/voices.js';
    del.onclick = () => remove();

    const save = document.createElement('button');
    save.className = 'vesave'; save.textContent = 'Save to Library';
    save.title = 'name how it files and what it is for, then write it into'
      + ' src/data/voices.js and measure it — which is what sets its level on every lane';
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
  function openSaveSheet() {
    const v = state.voice;
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
    nameBox.placeholder = 'preset name';
    field('Name', nameBox);

    const cat = document.createElement('select');
    cat.className = 'fxsel';
    for (const c of VOICE_CATEGORIES) {
      const o = document.createElement('option');
      o.value = c; o.textContent = c;
      if (c === v.category) o.selected = true;
      cat.append(o);
    }
    field('Files under', cat).title = 'which column of the library it appears in — the'
      + ' SOUND, not the lane. A bass preset on a lead lane is still a lead.';

    const note = document.createElement('textarea');
    note.className = 'venote'; note.rows = 3;
    note.value = v.note || '';
    note.placeholder = 'what this sound is for — one line, shown under it in the picker';
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
      says.textContent = 'renders to nothing — saving will be refused';
      reading.textContent = 'silent';
    } else if (p < 0.02) {
      lvl.classList.add('bad');
      // The multiplier, because "0.0004" means nothing and "×530" means everything.
      says.textContent = `very quiet — its level gets scaled up about ${Math.round(0.2118 / p)}×.`
        + ' Check the envelope.';
    } else {
      says.textContent = state.measured ? 'measured' : 'estimated — measured properly on save';
    }
    lvl.append(reading, says);
    field('Level', lvl);

    const bar = document.createElement('div'); bar.className = 'vesheetfoot';
    const cancel = document.createElement('button');
    cancel.className = 'devlink'; cancel.textContent = 'Cancel';
    cancel.onclick = () => sheet.remove();
    const go = document.createElement('button');
    go.className = 'vesave'; go.textContent = 'Save to Library';
    const send = () => {
      if (!nameBox.value.trim()) { nameBox.focus(); return; }
      v.label = nameBox.value.trim();
      v.category = cat.value;
      v.note = note.value;
      sheet.remove();
      build();              // the header chip carries the category it was just given
      onChanged();          // and the picker files it under the same
      commit();
    };
    go.onclick = send;
    // Enter anywhere but the description sends it; the description is the one field
    // where a newline is a reasonable thing to want.
    sheet.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Escape') sheet.remove();
      else if (ev.key === 'Enter' && ev.target !== note) send();
    });
    bar.append(cancel, go);
    sheet.append(bar);
    el.append(sheet);
    // A new preset has a name to give it — that is the whole reason this sheet exists —
    // and an existing one is usually a confirm, so the button takes the focus and Enter
    // is the whole interaction.
    if (state.isNew) { nameBox.focus(); nameBox.select(); } else go.focus();
  }

  async function commit() {
    const v = state.voice;
    if (!v.label?.trim()) { toast('give it a name first'); return; }

    // A preset that has never been saved takes its id from its name, NOW — not from
    // the name it had when it was copied. `Round Mono copy` renamed to `Journey Bass`
    // and saved should be `journeyBass` in the file, not `roundMonoCopy` with someone
    // else's label on it.
    //
    // Only before the first save. Once the id is on disk it is what mixes and banks
    // name, and a rename is a label change: re-keying then would silence every song
    // playing it, which is precisely the trap `voiceOf` returning null is there for.
    if (state.isNew) {
      delete VOICES[state.id];              // or it counts as taken against itself
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
      if (moved) assign(state.laneKey, wanted);
    }

    const btn = foot.saveBtn;
    btn.disabled = true;
    const was = btn.textContent;
    btn.textContent = 'measuring…';
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
      toast(`could not save: ${err.message || err}`);
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
    if (!res.ok) { toast(`could not delete: ${await res.text()}`); return; }
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
    if (!from) { toast('no preset to edit'); return null; }
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
    if (!isNew) {
      fetch(`/voice-refs?id=${encodeURIComponent(id)}`)
        .then((r) => r.json())
        .then((out) => { if (state?.id === id) { state.used = out.used; build(); } })
        .catch(() => { /* the panel is just as usable without it */ });
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
    get editing() { return state?.id || null; },
    // Which strip the panel belongs beside — the desk re-places it there on every
    // rack repaint. See placeVoiceEditor.
    get laneKey() { return state?.laneKey || null; },
  };
}
