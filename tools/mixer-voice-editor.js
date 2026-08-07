// The voice editor: a preset, on the desk, with its parameters as controls.
//
// The library was already data — src/engine/voices.js builds a Tone synth from an
// entry's `options` and branches on nothing, and `_playNoise` reads eight numbers off
// a noise entry — so a sound could always have been edited by typing into
// src/data/voices.js and reloading. User presets are the editable side of that
// catalogue; built-in library entries are copied before an edit can touch them. Either
// way the live user/song entry re-banks, so you hear the change through the channel
// strip while you are making it.
//
// ---- what makes this different from the effects rack -----------------------
//
// A fader edit is a MIX edit: it belongs to one song, it is saved into src/data/mix.js
// beside the song it was made for, and getting it wrong costs that song. A preset edit
// is a user-preset edit, or a song-local edit; built-in library entries are read-only.
// So:
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
// The same K-weighted mean the server measures a save with. Pure arithmetic, no node
// imports, so it bundles into the desk like anything else in tools/lib.
import { noteLevel } from './lib/loudness.js';
import { VoiceRack } from '../src/engine/voices.js';
// The fold mark, shared with the keyboard's, so the two put-away buttons on the
// library's workspace are provably one control rather than two that look alike.
import { foldIcon } from './mixer-voice-library.js';

const userTableFor = (kind) => kind === 'noise' ? 'USER_NOISE'
  : kind === 'drum' ? 'USER_DRUM' : 'USER_TONE';
const libraryTableFor = (kind) => kind === 'noise' ? 'NOISE'
  : kind === 'drum' ? 'DRUM' : 'TONE';
const escapeHtml = (text) => String(text)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const isLibraryPreset = (voice) => !!voice?.factory && !voice?.user && !voice?.songLocal;
const isUserPreset = (voice) => !!voice?.user && !voice?.songLocal;

/**
 * The synths a preset may name, which is what `VoiceRack.play` will dispatch on and not
 * one entry more.
 *
 * Two of them are not Tone classes at all: GameSynth and AdditiveSynth are native Web
 * Audio, dispatched by NAME in `play()` before the Tone allowlist is consulted, and they
 * read `$`-prefixed keys off the entry rather than an `options` bag. They lead the list
 * because that is the order the panels are worth reaching for, not because of what builds
 * them.
 *
 * The Tone ones have each been measured rendering under an OfflineAudioContext. Tone has
 * classes that work perfectly in a browser and render pure silence there — PluckSynth
 * is built on an AudioWorklet, PolySynth needs its first trigger at exactly t=0 — and
 * a preset built on one of those would sound right in this editor and be missing from
 * every WAV, stem and video. A dropdown rather than a text field is the cheap way to
 * make that unreachable.
 */
export const EDITABLE_SYNTHS = [
  'GameSynth', 'AdditiveSynth', 'MRDR-3',
  'Synth', 'MonoSynth', 'FMSynth', 'AMSynth', 'DuoSynth', 'MembraneSynth', 'MetalSynth',
];

// The three the engine plays ITSELF, rather than handing to a pooled Tone class. What
// they have in common that the panel cares about: their modulators are built per note-on,
// so a key measured from the start of a note — `vibrato.delay` — means something on these
// and nothing on the others, whose LFO free-runs in the pool.
const NATIVE_SYNTHS = ['GameSynth', 'AdditiveSynth', 'MRDR-3'];

// ---- measuring, in the page -------------------------------------------------

// The same note tools/measure-voices.js measures at, held for the same length. It
// does not have to match — see `estimate` for why the units cancel — but a number
// taken the same way as the one it is scaled against is one less thing to explain.
const MEASURE_NOTE = 110;                                  // A2
const MEASURE_DUR = 8 * ((60 / 120) / 4);                  // 8 steps at 120bpm = 1.0s
const MEASURE_TAIL = 11.5;                                 // 1s note + 10s release + margin

/**
 * Render one note of a preset offline, here in the page, and return what it reaches.
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
  // Both, because both are carried on the preset and both move when an envelope does:
  // `level` is what the engine plays it at, `peak` is what that costs in headroom.
  return { level: noteLevel([d], sampleRate), peak };
}

// ---- parameter descriptions -------------------------------------------------

// Short, because the value is read INSIDE the pot's ring — about five characters at
// this size. Units live on the label where they need saying, not on every reading.
const secs = (x) => (x < 1 ? `${Math.round(x * 1000)}ms` : `${x.toFixed(1)}s`);
const hz = (x) => (x >= 1000 ? `${(x / 1000).toFixed(1)}k` : String(Math.round(x)));
// Signed, because on a bipolar control the sign IS the reading: `+12` and `12` are the
// same number and opposite sounds.
const semis = (x) => `${x > 0 ? '+' : ''}${x.toFixed(1)}`;
// ...and the same sign on a control that only lands on whole semitones, where a
// trailing `.0` is a decimal place saying nothing. Cents are DETUNE's job.
const semiSteps = (x) => `${x > 0 ? '+' : ''}${x.toFixed(0)}`;
const fixed = (d) => (x) => x.toFixed(d);
const ENV_MAX_SECONDS = 10;
const ENV_TIME_SCALE = 2;

// Every envelope time uses the same ceiling, including native struck voices. Keeping
// the ceiling here prevents a new section from quietly growing a special-case range.
// The shared knob uses the same quadratic response for every envelope time, giving the
// milliseconds and short decays room without making the 10-second end unreachable.
const envTime = (path, label, min, step, fmt, def, unit = 's', when = null, opts = {}) =>
  n(path, label, min, ENV_MAX_SECONDS, step, fmt, def, unit, when,
    { ...opts, scale: ENV_TIME_SCALE });

// A pitch pot that has to cover the whole drum range at once — a 40 Hz sub and a 6 kHz
// zap are the same knob — and that is the envelope times' problem again: spread
// linearly, nine tenths of the travel sits above the register anything is actually
// tuned in, and the octave a kick lives in is a few pixels wide. So the same power
// response, steeper because the span is wider: the bottom two octaves get real
// distance and the ceiling is still at the stop. Steps of 1 Hz, because at 50 Hz five
// is a semitone and a half.
const OSC_HZ_MAX = 10000;
const OSC_HZ_SCALE = 3;
const oscHz = (path, label, def, opts = {}) =>
  n(path, label, 20, OSC_HZ_MAX, 1, hz, def, 'Hz', null, { scale: OSC_HZ_SCALE, ...opts });

// A CUTOFF is a cutoff wherever it appears, so it gets one range rather than the five it
// had grown — 40–12k on a layer, 20–18k on the game synth, 20–8k on a MonoSynth, 100–12k
// on a noise burst, 200–12k on the metal's highpass. The same knob position now means
// the same frequency on every panel, which is the whole point of a shared label. Same
// power response as the pitch pot above and for the same reason: linearly, everything
// under a kilohertz — which is most of what a filter is for — is a few pixels.
const CUTOFF_MAX = 18000;
const CUTOFF_SCALE = 3;
const cutoffHz = (path, label, def, when = null, opts = {}) =>
  n(path, label, 20, CUTOFF_MAX, 5, hz, def, 'Hz', when, { scale: CUTOFF_SCALE, ...opts });

// RESONANCE is a Q wherever it appears — the one pot that was a FREQUENCY is now called
// RES FREQ. The ceiling is the ring resonator's, which genuinely wants a Q of 110 where
// a filter wants 1; cubed, the bottom sixth of the travel still owns everything up to
// Q 2, and half of it covers the 0.1–15 a filter actually lives in.
const RES_Q_MAX = 120;
const RES_Q_SCALE = 3;
const resQ = (path, def, when = null, opts = {}) =>
  n(path, 'RESONANCE', 0.1, RES_Q_MAX, 0.05, fixed(2), def, '', when,
    { scale: RES_Q_SCALE, ...opts });

// Vibrato depth has the same shape of problem as the drum pitch pot, one range down:
// the pot runs to a full octave because the game synth is allowed to be a siren, but
// everything that sounds like an INSTRUMENT happens under half a semitone. Cubed, that
// bottom half-semitone owns a third of the sweep — near enough the same exponent, for
// near enough the same reason. See the row itself for what the numbers work out to.
const VIB_DEPTH_SCALE = 3;

// Humanising has the same shape of problem again, at the smallest scale on the desk:
// everything that reads as a PLAYER rather than a fault happens under a tenth.
const HUMANISE_SCALE = 3;

// Rates, depths and lengths that are not envelope TIMES but have the same crush at the
// bottom: a 5 Hz vibrato on a 60 Hz pot, a 1.2-second note on a 16-second one. Squared
// rather than cubed — these reach further up their range than an attack time does.
const SLOW_END_SCALE = 2;

// A filter envelope's depth has to reach right across the cutoff range: from the 40 Hz
// floor, opening the filter all the way is log2(20000/40) — nearly nine octaves — so the
// pot runs to ten and the whole range can be swept from anywhere in it. Almost every
// patch lives in the first two or three, though, which linearly would be a sliver either
// side of the detent. Same power response as the pots above, one range up, and BIPOLAR:
// applied about the centre so up and down taper alike and zero stays at twelve o'clock.
const ENV_OCT_MAX = 10;
const ENV_OCT_SCALE = 2;

// ---- the drum oscillator's pitch pair, the way Microtonic states it ----------
//
// A destination in hertz is the wrong number to hold in your hand. `52` means nothing
// until you have also read `190` off the pot beside it, the same drop is a different
// pair of numbers at every tuning, and moving the FREQUENCY silently rewrote how far
// the drum fell. So the panel states it the way the machine this section is modelled
// on does: a FREQUENCY, and an AMOUNT the pitch envelope moves it BY — signed, in
// semitones, zero at the centre detent, and unchanged when the tuning changes.
//
// The CATALOGUE still stores `osc.to` in hertz. That is what the engine ramps to, what
// every preset on file already holds, and what `_playDrum` reads without knowing this
// panel exists — so AMOUNT is a view of the ratio between the two, not a new field. A
// preset saved before this change reads back as whatever interval it always was.
const AMOUNT_SEMIS = 96;                 // ±8 octaves, which is Microtonic's own span
// The destination is a frequency an oscillator has to actually reach. Beyond the top
// of hearing there is nothing left to sweep to, and an exponential ramp cannot aim at
// zero — so the ratio is honoured until it runs out of audio band, then it stops.
const SWEEP_HZ_FLOOR = 1;
const SWEEP_HZ_CEIL = 20000;
const clampHz = (x) => Math.min(SWEEP_HZ_CEIL, Math.max(SWEEP_HZ_FLOOR, x));
const oscFrom = (v) => getAt(v, '$osc.from') ?? SECTION_DEFAULTS.osc.from;
const oscTo = (v) => getAt(v, '$osc.to') ?? SECTION_DEFAULTS.osc.to;
/** The interval between the oscillator's two frequencies, in semitones. */
const amountOf = (v) => 12 * Math.log2(clampHz(oscTo(v)) / Math.max(1e-6, oscFrom(v)));
/** ...and back: where a given AMOUNT lands from a given tuning. Two decimals, because
 *  a whole hertz is most of a semitone down at the bottom of the range. */
const toneAt = (from, semis) => Math.round(clampHz(from * 2 ** (semis / 12)) * 100) / 100;

const WAVES = ['sine', 'square', 'sawtooth', 'triangle', 'pwm', 'pulse'];
// The four an `OscillatorNode` takes. `pwm`, `pulse` and the voicing prefixes are
// Tone's vocabulary and THROW on a native oscillator, killing the note and every note
// after it on that lane — so the native panels draw from this list and never WAVES.
const NATIVE_WAVES = ['sine', 'square', 'sawtooth', 'triangle'];
// A layer oscillator additionally takes `noise` — the GameSynth's pitched noise (the
// seeded buffer through a bandpass that follows the note), as one layer of a stack:
// breath on a flute, sizzle under a lead. Its own list because the FM operator and the
// LFO draw from NATIVE_WAVES, and neither has a pitch a noise band could follow.
// A layer takes two waveforms an OscillatorNode does not have: `noise` (the seeded buffer
// through a band that follows the note) and `pulse` (a PeriodicWave at any duty, which is
// the square's whole family rather than the one member of it the node can make).
const LAYER_WAVES = [...NATIVE_WAVES, 'pulse', 'noise'];
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
// The seeded buffer's colours (see `_noise` in src/engine/voices.js) and the slopes a
// filter section can be cascaded to. White and -12 are what every preset written before
// these existed already has, so both lists start on the old behaviour.
const NOISE_COLORS = ['white', 'pink', 'brown', 'blue', 'violet'];
const SLOPES = [-12, -24, -48];
// `soft` where the curve is a hyperbolic tangent: FOLD and CRUSH say what you hear, and
// naming the third after the function that computes it was the odd one out. Stored as
// `soft`, so the file reads the way the pill does — `_driveCurve` branches on FOLD and
// CRUSH and lets everything else fall through to the same curve, which is also why any
// preset still carrying the old word renders identically.
const DRIVE_SHAPES = ['soft', 'fold', 'crush'];
// Attack and release take Tone's whole curve set; decay takes two and asserts on
// anything else — see `adsr`.
// Tone can do sine/cosine/bounce/ripple/step on attack and release, and decay types
// as "linear" | "exponential" and implements only those (a third value does not
// throw — that was checked — it is simply not handled, so decay comes out silently
// wrong). Across the whole catalogue only two presets ever reached for the extra
// attack/release shapes, so all three stages share the same two options now — a row
// of seven pills was most of the space a curve control cost.
const ENV_CURVES = ['linear', 'exponential'];

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
  pwm: 'PWM', pulse: 'PLS', noise: 'NOISE',
  exp: 'EXP', lin: 'LIN',
  linear: 'LIN', exponential: 'EXP',
  single: 'ONE', fat: 'FAT', am: 'AM', fm: 'FM',
  // Noise colours and shaper shapes — same reasoning, and `violet` is the one word
  // here nobody shortens the same way twice, so it is written down rather than cut.
  white: 'WHT', pink: 'PNK', brown: 'BRN', blue: 'BLU', violet: 'VIO',
  // SOFT, FOLD and CRUSH need no shortening — they fit as they are, and a pill that
  // reads the word the preset stores is one less thing to translate.
  // The LFO's two destinations. TREM rather than LEVL because tremolo is what an LFO on
  // the level IS, and the pill is the one place the word fits.
  filter: 'FILT', level: 'TREM',
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
const n = (path, label, min, max, step, fmt = fixed(2), def = min, unit = '', when = null, opts = {}) =>
  ({ kind: 'num', path, label, unit, min, max, step, fmt, def, when, ...opts });
/** A row of pills on a dotted path — see `pickRow`. `opts.trio` groups it with its
 * siblings of the same name into one third-width row — see `trioRow`. */
const pick = (path, label, options, def, when = null, opts = {}) =>
  ({ kind: 'pick', path, label, options, def, when, ...opts });

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
      // UNISON, the same word the layer cards use for the same idea — how many detuned
      // copies of the oscillator sound at once. STACK was this panel's private name for it.
      n(`${path}.count`, 'UNISON', 1, 8, 1, fixed(0), 3, '', (v) => readVoicing(v) === 'fat'),
      n(`${path}.spread`, 'SPREAD', 0, 100, 1, fixed(0), 20, 'ct', (v) => readVoicing(v) === 'fat'),
    ] : []),
  ];
};

/**
 * SUSTAIN, in the one unit the desk states levels in.
 *
 * Stored 0–1 everywhere — the ×100 is a VIEW, the same deal GATE makes with `len`. Its
 * own helper for the same reason `adsr` below is one: the layer cards wrote it out by
 * hand as a raw 0–1 and drifted, so the identical pot read `0.70` on one panel and
 * `70 %` on the next.
 */
const sustainPct = (path, def = 50, when = null) =>
  n(path, 'SUSTAIN', 0, 100, 1, fixed(0), def, '%', when,
    { read: (v) => (v != null ? v * 100 : undefined), write: (v) => v / 100 });

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
  // `startRow` so ATTACK — and the DECAY/SUSTAIN/RELEASE that auto-flow after it —
  // always lands as one clean row of four, whatever else the card put before it.
  // Without it, an oscillator's own pots (MRDR-3) or a WAVE/VOICING pair
  // (DuoSynth's voices) can leave the grid mid-row, and ADSR ends up split 2+2 with
  // a gap down one side instead of reading as a single block.
  envTime(`${path}.attack`, 'ATTACK', 0.001, 0.001, secs, 0.01, 's', null, { startRow: true }),
  envTime(`${path}.decay`, 'DECAY', 0.01, 0.01, secs, 0.2),
  ...(sustain ? [sustainPct(`${path}.sustain`)] : []),
  envTime(`${path}.release`, 'RELEASE', 0.01, 0.01, secs, 0.3),
  // The SHAPE of the ramp, not just its length — the difference between a stage
  // that fades and one that snaps. See the note on `ENV_CURVES` above for why all
  // three stages are linear/exponential only. `trio` puts the three on one row, a
  // third each, rather than three controls that happen to be adjacent.
  pick(`${path}.attackCurve`, 'ATK', ENV_CURVES, 'linear', null, { trio: 'curve' }),
  pick(`${path}.decayCurve`, 'DEC', ENV_CURVES, 'exponential', null, { trio: 'curve' }),
  pick(`${path}.releaseCurve`, 'REL', ENV_CURVES, 'exponential', null, { trio: 'curve' }),
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
/**
 * What stops a drum machine sounding like one, as three pots behind a switch.
 *
 * Every hit of a preset is the same waveform to the sample, and at sixteenths the ear
 * hears that as a machine gun rather than as a player. A real hat moves a decibel and a
 * few hertz per stroke. These are the sizes of those moves — and they are DETERMINISTIC
 * (see `hitRandom` in src/engine/voices.js): the variation comes from when the hit is
 * scheduled, so a stem still holds exactly the noise the full mix does.
 *
 * OPTIONAL, and three rows rather than five. A panel is pinned to a strip's width and
 * every always-on control is paid for by every preset that will never use it — so this
 * is a switch on a preset that wants feel, and the two per-TAP walks that used to sit
 * here live in the Taps card, where there is something for them to walk.
 *
 * Shared by every native panel, because a hat is as often a NOISE preset as a DRUM one
 * and "which table is it in" is not a reason for one to have feel and the other not.
 * Declared above SYNTH_GROUPS rather than beside the tables that first used it: a `const`
 * is in its temporal dead zone until its own line runs, so a group literal referencing it
 * from higher up the file would throw on import rather than when the panel was opened.
 */
const HUMANISE_GROUP = {
  // Named for the key it writes and for what every other synth calls this: FEEL was
  // ours alone, and a card whose title matches neither `humanize` in the file nor the
  // word on anyone else's panel is a control you have to be told about.
  // No switch. `vary` (src/engine/voices.js) returns exactly 1 at amount 0 and never even
  // calls `hitRandom`, on every play path there is — drum, noise, game and MRDR-3 alike —
  // so four zeroed amounts and no `humanize` key at all are bit-identical. A switch in
  // front of that was a control whose two states sounded the same, and the four pots
  // below it already say which kind of variation you want and how much.
  key: 'humanise', seedless: true,
  title: 'Humanise',
  // Four amounts and no single lead, so the fold tests all four: the card is doing
  // nothing only when none of them is. LEVEL VAR stays as the way back in — turn it up
  // and the other three arrive. Any one of them non-zero and the card is already open,
  // which is what stops the fold from hiding a control that is live.
  fold: (v) => ['gain', 'pitch', 'entry', 'filter']
    .every((k) => (getAt(v, `$humanize.${k}`) ?? 0) === 0),
  foldKeep: ['$humanize.gain'],
  // The same power response the envelope times and the pitch pots take, and for the
  // sharpest case of the same problem: humanising is a effect that lives in its first
  // tenth. Two per cent is a player, twenty is a fault, and spread linearly the whole
  // usable range was the first few pixels off the stop. Cubed, the bottom eighth of the
  // travel owns everything up to 0.06 and the stop is still at 0.5.
  rows: [
    n('$humanize.gain', 'LEVEL VAR', 0, 0.5, 0.01, fixed(2), 0, '',
      null, { scale: HUMANISE_SCALE }),
    // Stated in CENTS, the unit every other pitch on this desk is stated in — DETUNE,
    // SPREAD, VIB DEPTH. Stored as the 1 ± amount multiplier `vary` applies, so the pot
    // is a view of it the way GATE is a view of `len`. As a raw multiplier the useful
    // settings were both unreadable and unreachable: 0.005 is already ±8.6 cents, so
    // the two or three that read as a PLAYER rather than a detune sat below one step.
    n('$humanize.pitch', 'PITCH VAR', 0, 300, 1, fixed(0), 0, 'ct', null,
      { scale: HUMANISE_SCALE,
        read: (a) => (a != null ? 1200 * Math.log2(1 + a) : undefined),
        write: (c) => 2 ** (c / 1200) - 1,
        tip: 'How far each hit’s pitch wanders either side of the note — a few cents '
          + 'is a player, fifty is a fault' }),
    // Milliseconds of stagger between the UNISON voices of a note — the other half of an
    // ensemble, and the cheaper half: people do not come in together. Seconds under the
    // hood, shown in ms because the whole useful range is under fifty of them. Same seed
    // as VIB SPREAD, so a voice that is late is late in every layer at once.
    n('$humanize.entry', 'ENTRY', 0, 80, 1, fixed(0), 0, 'ms',
      (v) => v?.synth === 'MRDR-3',
      { read: (x) => (x != null ? x * 1000 : undefined), write: (x) => x / 1000,
        tip: 'How far apart the unison voices come in. A few milliseconds is a section '
          + 'breathing; fifty is a round' }),
    // FILTER, not TONE: what this varies is every filter CUTOFF in the voice — the
    // burst's, the body's, each layer's — through `_filterChain`'s per-hit `mul`.
    // TONE named one pot on the Drive card, which is the smallest thing it moves.
    n('$humanize.filter', 'FILTER VAR', 0, 0.5, 0.01, fixed(2), 0, '',
      null, { scale: HUMANISE_SCALE,
        tip: 'How much each hit’s filter cutoff moves — a real player never '
        + 'strikes twice with exactly the same tone' }),
  ],
};

/**
 * The nine drawbars, labelled the way they are labelled on the console.
 *
 * Footages, not ratios: 8′ is the fundamental, 4′ the octave above it, 16′ the octave
 * below. Nobody who has touched one of these thinks in ratios, and the ratio is on the
 * tooltip for anybody who does. The order is the console's — see DRAWBAR_RATIOS in
 * src/engine/voices.js for why it does not ascend.
 */
const DRAWBAR_LABELS = ['16′', '5⅓′', '8′', '4′', '2⅔′', '2′', '1⅗′', '1⅓′', '1′'];
const DRAWBAR_RATIO_TEXT = ['×0.5', '×1.5', '×1', '×2', '×3', '×4', '×5', '×6', '×8'];

/**
 * The DEFAULTS are the engine's own plain registration, not zeroes.
 *
 * `defaultsFor` writes every row's `def` onto a preset that has just been switched to this
 * class, so a row defaulting to 0 is a bar pushed in — and nine of those is a synth that
 * makes no sound at all. Starting on the registration the organ lane has always played
 * means picking ADDITIVE from the dropdown hands you a drawbar organ, which is the same
 * rule the optional drum sections follow: switching something on gives you the sound the
 * engine already implied rather than silence to dig out of.
 */
const DRAWBAR_DEFAULTS = [0, 0, 1, 0.62, 0.32, 0.2, 0, 0.1, 0];

const drawbarRows = () => DRAWBAR_LABELS.map((label, i) => ({
  ...n(`$additive.bars.${i}`, label, 0, 1, 0.01, fixed(2), DRAWBAR_DEFAULTS[i]),
  // A bar at zero builds no oscillator at all, which is worth saying on the control:
  // pushing one fully in is out of the sound, not quiet in it.
  tip: `${DRAWBAR_RATIO_TEXT[i]} the note. Fully in builds no oscillator at all.`,
}));


/**
 * One MRDR-3 layer's cards: the main card, then Filter / Pitch / FM sub-cards.
 *
 * Sub-cards are titled with their OWNER — three cards all called "Filter" is a panel
 * where you cannot tell whose knob you are turning — and carry a group-level `when` so a
 * switched-off layer takes its sub-cards' title bars with it. Layers 2 and 3 are
 * optional the way the drum sections are; layer 1 is the voice and is always there.
 *
 * No pitch-wobble target on the LFO and no vibrato rows here: `$vibrato` in the Note
 * card is the pitch wobble, one key with one meaning on every preset in the library.
 */
/**
 * The pitch envelope's five rows, for any path that has one.
 *
 * One helper because GameSynth and every layer of a MRDR-3 now state the same idea
 * with the same keys: how far from its written pitch the note starts, and how it gets
 * there. AMOUNT is signed — the sign is the whole difference between a coin falling into
 * the note and a power-up climbing into it — and zero schedules nothing at all, which is
 * why there is no switch: zero already is one.
 *
 * ATTACK defaults to 0, unlike every other envelope here, because the arcade shape is a
 * note that is ALREADY away when it starts. A non-zero attack scoops out to the offset
 * first, which is a different and rarer gesture rather than the default one.
 */
const pitchEnvRows = (base) => [
  // AMOUNT FIRST, on a row of its own, and the four stages on the row under it.
  //
  // It is the switch — zero schedules nothing and greys the other four — so it is what
  // you reach for first and what everything below it depends on, and a control that
  // decides whether its neighbours mean anything reads wrong sitting after them. Putting
  // it above also leaves the ADSR whole: four stages, one row, in the order they happen,
  // exactly as the amp and filter cards draw them.
  n(`$${base}semitones`, 'AMOUNT', -48, 48, 1, semiSteps, 0, 'semi', null,
    { origin: 0,
      tip: 'How far from the written note this starts — +24 falls into the note like a '
        + 'coin, -36 climbs into it like a laser. Zero is no bend at all' }),
  // `startRow` on ATTACK is what keeps that promise: without it the four stages flow in
  // behind AMOUNT and the block splits 3+1 across two rows with a hole down one side.
  envTime(`$${base}attack`, 'ATTACK', 0, 0.005, secs, 0, 's',
    (v) => (getAt(v, `$${base}semitones`) ?? 0) !== 0, { startRow: true }),
  envTime(`$${base}decay`, 'DECAY', 0, 0.005, secs, 0.06, 's',
    (v) => (getAt(v, `$${base}semitones`) ?? 0) !== 0),
  sustainPct(`$${base}sustain`, 0, (v) => (getAt(v, `$${base}semitones`) ?? 0) !== 0),
  envTime(`$${base}release`, 'RELEASE', 0, 0.005, secs, 0.015, 's',
    (v) => (getAt(v, `$${base}semitones`) ?? 0) !== 0),
];

const layerGroups = () => {
  const groups = [];
  for (let i = 1; i <= 3; i++) {
    const p = `layer.osc${i}`;
    const on = i === 1 ? null : (v) => sectionOn(v, p);
    groups.push({
      // `key` is the card's name to another layout — see `fullLayout`. The TITLE is prose
      // and has been rewritten twice; a second surface that addressed cards by it would
      // break on a wording change, which is not a thing a wording change should be able
      // to do. Every group in this table carries one.
      key: `osc${i}`,
      title: `Osc ${i}`,
      // Three layers summed into one output is the sound you cannot take apart by ear.
      // S beside the switch plays this layer and nothing else — monitoring, never saved,
      // and gone when the panel closes. Layer 1 has no On/Off (it is the voice) but it
      // has this, because "what is osc 1 doing under the other two" is the same question.
      solo: `osc${i}`,
      ...(i === 1 ? {} : {
        optional: p,
        onTip: 'Take this layer out',
        offTip: i === 2 ? 'Add a second layer — a sub, an octave, a detuned double'
          : 'Add a third layer',
      }),
      rows: [
        // LEVEL leads every oscillator section on this desk. It is the one row that is
        // always there and always means the same thing — how much of this source is in
        // the sound — and a card that opens on it reads as a mixer channel, which is what
        // an oscillator section is.
        n(`$${p}.gain`, 'LEVEL', 0, 2, 0.01, fixed(2), i === 1 ? 1 : 0.3),
        pick(`$${p}.type`, 'WAVE', LAYER_WAVES, i === 1 ? 'square' : 'sine'),
        // After the wave rather than before it, because it only exists for one of them:
        // a row that is greyed on four waveforms out of six should not be the second thing
        // you read. PLS WIDTH, not WIDTH — with STEREO on the same card, an unqualified
        // "width" is the stereo field on every other desk in the world.
        //
        // 50% IS the square, and everything under it walks the even harmonics back in —
        // 20% reedy and hollow, 10% nasal and thin enough to cut through a full mix.
        n(`$${p}.width`, 'PLS WIDTH', 5, 95, 1, fixed(0), 50, '%',
          (v) => getAt(v, `$${p}.type`) === 'pulse',
          { read: (w) => (w != null ? w * 100 : undefined), write: (w) => w / 100,
            tip: 'The duty of the pulse — 50% is a square, and narrower is thinner and '
              + 'more nasal. Static unless the PWM card is switched on' }),
        // Beside PLS WIDTH for the same reason it sits after WAVE: each is the one extra
        // control its own waveform needs, and only one of them is ever live. Same label,
        // same five colours, same default as the drum and noise panels' COLOUR — a
        // pink layer and a pink drum have to mean the same filter.
        pick(`$${p}.color`, 'COLOUR', NOISE_COLORS, 'white',
          (v) => getAt(v, `$${p}.type`) === 'noise',
          { tip: 'The tilt of the noise — white is flat, pink and brown lean to the '
              + 'bottom, blue and violet to the top. The layer\'s bandpass still '
              + 'follows the note on top of it' }),
        // Stored as `ratio` — the multiplier the engine plays at — and shown in
        // semitones, the same deal AMOUNT makes with the drum's two frequencies: +12 is
        // an octave up whichever key you think in, and a doubling layer reads as the
        // interval it is. WHOLE semitones only — an interval is a musical unit, and
        // anything between two of them is detuning, which is the pot directly below
        // in the units detuning is actually stated in.
        // INTERVAL, not TRANSPOSE: this layer is not transposing anything, it is sitting
        // at an interval from the note — a sub at -12, a fifth at +7. TRANSPOSE is up in
        // the Note card, where it moves the whole preset, and two pots on one panel
        // cannot both be called it.
        n(`$${p}.ratio`, 'INTERVAL', -24, 24, 1, semiSteps, 0, 'semi', null, {
          origin: 0,
          tip: 'Where this layer sits against the note — -12 is a sub an octave down,'
            + ' +7 a fifth above, +12 a doubling octave',
          read: (ratio) => (ratio > 0 ? 12 * Math.log2(ratio) : 0),
          write: (x) => 2 ** (x / 12),
        }),
        n(`$${p}.detune`, 'DETUNE', -50, 50, 1, fixed(0), 0, 'ct'),
        // This layer's own note length, as a fraction of the drawn one — what makes
        // the engine voices themselves: bass80s' octave tick dies inside the note its
        // sub is still holding. Stated as a groove box states it, GATE %, because
        // that is the nearest thing on commercial gear to a control almost nothing
        // else has — and stored as the `len` multiplier the engine has always read,
        // shown ×100 the way SUSTAIN is.
        n(`$${p}.len`, 'GATE', 10, 200, 1, fixed(0), 100, '%',
          (v) => getAt(v, `$${p}.vca`) !== 'through',
          { read: (v) => v != null ? v * 100 : undefined, write: (v) => v / 100,
            tip: 'How long this layer’s note is, against the drawn one — 62% dies '
              + 'inside the note, 100% is the note as written, 108% overhangs it. '
              + 'The layer’s own envelope times are measured against it.' }),
        n(`$${p}.unison`, 'UNISON', 1, 5, 1, fixed(0), 1),
        n(`$${p}.spread`, 'SPREAD', 0, 100, 1, fixed(0), 20, 'ct',
          (v) => (getAt(v, `$${p}.unison`) ?? 1) > 1),
        // The third member of the unison family: SPREAD detunes the voices, STEREO places
        // them. Zero is where every preset written before this sits — one point in the
        // middle — and the engine builds no panner at all there.
        //
        // Worth knowing on a bass: voices detuned AND panned comb-filter against each
        // other when a phone folds them to mono. Spread the upper layers; leave the sub
        // centred, which is what `BEST Reese Bass` already does with its detune.
        n(`$${p}.stereo`, 'STEREO', 0, 1, 0.01, fixed(2), 0, '',
          (v) => (getAt(v, `$${p}.unison`) ?? 1) > 1,
          { tip: 'How far across the stereo field the unison voices stand — 0 is one '
              + 'point in the middle, 1 is hard left to hard right' }),
        // On all three cards, not just 2 and 3. Osc 1 delayed against the Global Filter
        // and Global Amp is a real sound rather than a no-op, and three cards where one
        // is missing a row reads as a bug in the panel. Zero on every layer, so the stack
        // still arrives together until somebody says otherwise.
        //
        // ONSET is what the modulator cards call their fade-in; this is not one. DELAY is
        // silence and then the layer's own attack, which no ATTACK setting can state.
        n(`$${p}.delay`, 'DELAY', 0, 500, 1, fixed(0), 0, 'ms', null,
          { read: (d) => (d != null ? d * 1000 : undefined), write: (d) => d / 1000,
            tip: 'How long after the note this layer enters. Its envelope starts when it '
              + 'does, so it keeps its attack and runs past the others — a bloom, not a '
              + 'slow fade-in' }),
      ],
    });
    groups.push({
      // Only a pulse has a width to move, so the card is not there on any other wave —
      // the same rule the WIDTH pot itself follows. Four rows in the LFO card's order and
      // the LFO card's units, because it IS an LFO; what makes it its own section rather
      // than a third target on the shared one is that each layer gets its OWN rate and
      // depth. Three widths breathing at three speeds is the Jupiter-8 answer, and it is
      // most of the difference between a stack that shimmers and one that pulses in
      // lockstep.
      // DEPTH IS THE SWITCH. `_playLayer` builds the modulator only at
      // `(pwm.depth ?? 0) > 0`, so a section switch beside it was a second way to say
      // the same thing — and two switches for one state is how you get a card that is
      // On with nothing happening. The depth pot's stop is off, and everything else on
      // the card keeps its setting there rather than being stashed and restored.
      key: `osc${i}.pwm`, seedless: true,
      title: `Osc ${i} · PWM`,
      when: (v) => (i === 1 || sectionOn(v, p)) && getAt(v, `$${p}.type`) === 'pulse',
      // At depth zero the width holds still and no modulator is built, so on the strip
      // the card folds to DEPTH alone rather than showing three greyed rows. See the
      // note on `groupCard`.
      fold: (v) => (getAt(v, `$${p}.pwm.depth`) ?? 0) === 0,
      foldKeep: [`$${p}.pwm.depth`],
      rows: [
        // Zero, not 0.5. With no switch in front of it this default is what a fresh
        // preset SOUNDS like, and a stack that arrives already shimmering is not a
        // starting point — see `applyDefaults`, which now seeds this card.
        n(`$${p}.pwm.depth`, 'DEPTH', 0, 1, 0.01, fixed(2), 0, '', null,
          { tip: 'How far the width swings either side of PLS WIDTH — clamped to what '
              + 'the centre leaves room for, so a 20% pulse cannot be driven to silence. '
              + 'Zero holds the width still and builds no modulator' }),
        pick(`$${p}.pwm.type`, 'WAVE', NATIVE_WAVES, 'sine',
          (v) => (getAt(v, `$${p}.pwm.depth`) ?? 0) > 0),
        // A DIFFERENT rate per layer, and that is the whole point of the card: three
        // widths breathing at three speeds is the Jupiter-8 answer, and it is most of the
        // difference between a stack that shimmers and one that pulses in lockstep. The
        // three numbers used to live in `SECTION_DEFAULTS` and arrive when the section was
        // switched on; with no switch left they belong on the row, or all three layers
        // would default to one rate and phase-lock.
        n(`$${p}.pwm.rate`, 'RATE', 0.05, 12, 0.01, fixed(2), [0.4, 0.53, 0.31][i - 1], 'Hz',
          (v) => (getAt(v, `$${p}.pwm.depth`) ?? 0) > 0,
          { scale: SLOW_END_SCALE,
            tip: 'How fast the width moves. Under 1 Hz is the string-machine drift; each '
              + 'layer starts on a slightly different rate so they never line up' }),
        envTime(`$${p}.pwm.delay`, 'ONSET', 0, 0.01, secs, 0, 's',
          (v) => (getAt(v, `$${p}.pwm.depth`) ?? 0) > 0),
      ],
    });
    // Pitch and FM come before the filter because that is the order the signal takes:
    // what the oscillator is doing, then what bends it, then what filters the result,
    // then what shapes its level. The envelope is LAST for the same reason — it is the
    // amplifier at the end, not the first thing you reach for.
    groups.push({
      // No switch, and no FROM/TO pair. The old card said "start at 0.5x and arrive at
      // 1x over a sweep", which is an envelope written as two multipliers and a time;
      // this is the same bend in the units the rest of the desk states pitch in, and
      // AMOUNT 0 is the off position for free.
      key: `osc${i}.pitch`,
      title: `Osc ${i} · Pitch Env`, when: on,
      rows: pitchEnvRows(`${p}.pitch.`),
    });
    groups.push({
      key: `osc${i}.fm`,
      title: `Osc ${i} · FM`, optional: `${p}.fm`, when: on,
      onTip: 'Take the modulator out',
      offTip: 'Bend this layer with a second oscillator — brass, bells, growl',
      rows: [
        pick(`$${p}.fm.type`, 'WAVE', NATIVE_WAVES, 'sine'),
        n(`$${p}.fm.ratio`, 'RATIO', 0.1, 12, 0.01, fixed(2), 1.4),
        n(`$${p}.fm.index`, 'INDEX', 0, 8, 0.05, fixed(2), 1),
        envTime(`$${p}.fm.attack`, 'ATTACK', 0.001, 0.001, secs, 0.001),
        envTime(`$${p}.fm.decay`, 'DECAY', 0, 0.01, secs, 1),
      ],
    });
    groups.push({
      key: `osc${i}.filter`,
      title: `Osc ${i} · Filter`, optional: `${p}.filter`, when: on,
      onTip: 'Take the filter out — the raw waveform',
      offTip: 'Filter this layer — its own cutoff, envelope, slope and key follow',
      // TYPE, SLOPE, CUTOFF, RESONANCE — the same names in the same order as every
      // other filter on the desk. No sweep pair here: this card speaks the software-
      // synth standard, where the cutoff sits still and the Filter Env card below is
      // what moves it. KEY FOLLOW is this card's own and sits last.
      rows: [
        pick(`$${p}.filter.type`, 'TYPE', FILTER_TYPES, 'lowpass'),
        pick(`$${p}.filter.slope`, 'SLOPE', SLOPES, -12),
        cutoffHz(`$${p}.filter.freq`, 'CUTOFF', 1150),
        resQ(`$${p}.filter.Q`, 1.15),
        // MonoSynth's row in MonoSynth's position — the range the envelope moves the
        // cutoff across belongs beside the cutoff. Bipolar where Tone's is positive-
        // only (a Tone limit, not a choice): negative closes down from above. Zero is
        // no envelope AT ALL — the engine schedules nothing — which is why there is
        // no on/off switch on the Filter Env card: zero already is it, for free.
        n(`$${p}.filter.env.octaves`, 'ENV AMOUNT', -ENV_OCT_MAX, ENV_OCT_MAX, 0.1, semis,
          0, 'oct', null,
          { origin: 0, scale: ENV_OCT_SCALE,
            tip: 'How far the envelope moves the cutoff, in octaves — up or down. '
              + 'Centre is no envelope at all; the far end will open a cutoff parked '
              + 'at the floor all the way' }),
        n(`$${p}.filter.track`, 'KEY FOLLOW', 0, 1, 0.01, fixed(2), 0),
      ],
    });
    groups.push({
      // MonoSynth's split, exactly: the range on the Filter card, the four times
      // here, always present while the filter is — an envelope is scheduling, not
      // nodes, so there is nothing for a switch to save. Defaults mirror the
      // engine's own `??` fallbacks, so a pot left alone says what already happens.
      key: `osc${i}.filterenv`,
      title: `Osc ${i} · Filter Env`,
      when: (v) => (i === 1 || sectionOn(v, p)) && sectionOn(v, `${p}.filter`),
      rows: [
        envTime(`$${p}.filter.env.attack`, 'ATTACK', 0.001, 0.001, secs, 0.01),
        envTime(`$${p}.filter.env.decay`, 'DECAY', 0, 0.01, secs, 1),
        // Live at every DECAY, as on the amp envelope: the cutoff settles at
        // ENV AMOUNT × SUSTAIN rather than returning all the way to the cutoff.
        sustainPct(`$${p}.filter.env.sustain`, 0),
        envTime(`$${p}.filter.env.release`, 'RELEASE', 0, 0.01, secs, 0.015),
      ],
    });
    groups.push({
      // The layer's own amplifier, on its own card at the END of its run — where an
      // envelope belongs on a panel laid out by signal flow, and where MonoSynth's Amp
      // Envelope sits too. Nothing moved but the card: every row keeps the key it has
      // always written, so no preset changes and nothing is re-measured.
      key: `osc${i}.amp`,
      title: `Osc ${i} · Amp`, when: on,
      rows: [
        // ENV or THROUGH. Through takes this layer's amp envelope out of the circuit and
        // hands its shaping to the Global Amp downstream — three oscillators into a mixer,
        // one filter, one envelope, which is the classic architecture and the one thing
        // this synth could not say while a per-layer envelope was compulsory.
        //
        // A pill rather than an On/Off switch because the envelope's four times live on
        // the layer itself rather than in a section of their own, and presence is what
        // every other switch on this panel means. This says which envelope is doing the
        // work, which is the actual question.
        pick(`$${p}.vca`, 'AMP', ['env', 'through'], 'env', null,
          { tip: 'ENV gives this layer its own amp envelope. THROUGH takes it out and lets '
              + 'the Global Amp shape the whole stack — the classic single-VCA synth' }),
        envTime(`$${p}.attack`, 'ATTACK', 0.001, 0.001, secs, 0.01,
          's', (v) => getAt(v, `$${p}.vca`) !== 'through'),
        envTime(`$${p}.decay`, 'DECAY', 0, 0.01, secs, 1,
          's', (v) => getAt(v, `$${p}.vca`) !== 'through'),
        // Live at every DECAY: sustain is WHERE the fall lands, not something a short
        // decay switches off. Zero reaches silence (struck, the default); 0.7 falls only
        // that far and releases from there.
        sustainPct(`$${p}.sustain`, 0, (v) => getAt(v, `$${p}.vca`) !== 'through'),
        envTime(`$${p}.release`, 'RELEASE', 0, 0.01, secs, 0.015,
          's', (v) => getAt(v, `$${p}.vca`) !== 'through'),
        // The same three pills every Tone envelope card ends on, in the native
        // path's own two words. DEC keeps the `curve` key the engine has
        // always read for the decay; the other two stages were exponential-only
        // until these existed, so all three default there. `trio` puts them on one
        // row — see the note on `adsr`'s own three.
        pick(`$${p}.attackCurve`, 'ATK', ['exp', 'lin'], 'exp', null, { trio: 'curve' }),
        pick(`$${p}.curve`, 'DEC', ['exp', 'lin'], 'exp', null, { trio: 'curve' }),
        pick(`$${p}.releaseCurve`, 'REL', ['exp', 'lin'], 'exp', null, { trio: 'curve' }),
      ],
    });
  }
  // ---- the global stage ------------------------------------------------------
  //
  // One filter and one amp envelope the whole stack passes through, after the three
  // layers and before Drive — where they sit on the panel is where they sit in the
  // signal. Both cards are switched OFF by default, and off is not "a filter doing
  // nothing": the engine builds no node at all, which is why every preset that shipped
  // before this sounds identical.
  //
  // Every row is the layer card's row with the path changed — the same helpers, the
  // same ranges, the same taper — so CUTOFF means one thing on this panel rather than
  // two things that look alike.
  groups.push({
    key: 'global.filter',
    title: 'Global · Filter', optional: 'global.filter',
    onTip: 'Take the shared filter out',
    offTip: 'One filter for the whole stack — three layers arriving at one cutoff',
    rows: [
      pick('$global.filter.type', 'TYPE', FILTER_TYPES, 'lowpass'),
      pick('$global.filter.slope', 'SLOPE', SLOPES, -12),
      cutoffHz('$global.filter.freq', 'CUTOFF', 1150),
      resQ('$global.filter.Q', 1.15),
      n('$global.filter.env.octaves', 'ENV AMOUNT', -ENV_OCT_MAX, ENV_OCT_MAX, 0.1, semis,
        0, 'oct', null,
        { origin: 0, scale: ENV_OCT_SCALE,
          tip: 'How far the envelope moves the shared cutoff, in octaves — up or down. '
            + 'Centre is no envelope at all' }),
      n('$global.filter.track', 'KEY FOLLOW', 0, 1, 0.01, fixed(2), 0),
    ],
  });
  groups.push({
    // The layer cards' split, exactly: the range on the Filter card, the four times
    // here, present while the filter is. An envelope is scheduling rather than nodes,
    // so there is nothing for a switch to save.
    key: 'global.filterenv',
    title: 'Global · Filter Env',
    when: (v) => sectionOn(v, 'global.filter'),
    rows: [
      envTime('$global.filter.env.attack', 'ATTACK', 0.001, 0.001, secs, 0.01),
      envTime('$global.filter.env.decay', 'DECAY', 0, 0.01, secs, 1),
      sustainPct('$global.filter.env.sustain', 0),
      envTime('$global.filter.env.release', 'RELEASE', 0, 0.01, secs, 0.015),
    ],
  });
  groups.push({
    // The note's OWN envelope, over all three layers at once — where a layer's Amp card
    // is that layer's alone and its GATE can end it early. No LEVEL row: the level is
    // the layers' and the strip's, and a third one here is how two of them end up wrong.
    key: 'global.vca',
    title: 'Global · Amp', optional: 'global.vca',
    onTip: 'Take the shared envelope out',
    offTip: 'One amp envelope over the whole stack — the note, not the layers',
    rows: [
      envTime('$global.vca.attack', 'ATTACK', 0.001, 0.001, secs, 0.01),
      envTime('$global.vca.decay', 'DECAY', 0, 0.01, secs, 1),
      sustainPct('$global.vca.sustain', 1),
      envTime('$global.vca.release', 'RELEASE', 0, 0.01, secs, 0.015),
      pick('$global.vca.attackCurve', 'ATK', ['exp', 'lin'], 'exp', null, { trio: 'curve' }),
      pick('$global.vca.curve', 'DEC', ['exp', 'lin'], 'exp', null, { trio: 'curve' }),
      pick('$global.vca.releaseCurve', 'REL', ['exp', 'lin'], 'exp', null, { trio: 'curve' }),
    ],
  });
  groups.push({
    // DEPTH is the switch here too — `_playLayer` builds no oscillator at zero. DEPTH
    // therefore leads the card, because it is the control that decides whether the other
    // four mean anything, and they grey behind it.
    key: 'lfo', seedless: true,
    title: 'LFO',
    fold: (v) => (getAt(v, '$layer.lfo.depth') ?? 0) === 0,
    foldKeep: ['$layer.lfo.depth'],
    rows: [
      // WAVE above TARGET: what the shape IS, then where it is pointed. It also matches
      // every other modulator card on the desk, all of which open on their waveform.
      pick('$layer.lfo.type', 'WAVE', NATIVE_WAVES, 'sine',
        (v) => (getAt(v, '$layer.lfo.depth') ?? 0) > 0),
      pick('$layer.lfo.target', 'TARGET', ['filter', 'level'], 'filter',
        (v) => (getAt(v, '$layer.lfo.depth') ?? 0) > 0),
      // DEPTH sits with the pots it governs rather than above the two choice rows. It is
      // still the switch — zero builds no LFO — and it is still what `fold` keeps, so on
      // the strip a dead card shows this row and nothing else. What changed is only that
      // the card's one row of knobs now reads DEPTH · RATE · ONSET, left to right, which
      // is the order you set them in.
      // Zero rather than 0.3: with no switch in front of the card this is what a fresh
      // preset sounds like, and every preset should not arrive breathing.
      n('$layer.lfo.depth', 'DEPTH', 0, 1, 0.01, fixed(2), 0, '', null,
        { startRow: true,
          tip: 'How far the LFO swings its target. Zero builds no LFO at all — pitch '
            + 'wobble is a different control, VIB DEPTH, up in Note' }),
      n('$layer.lfo.rate', 'RATE', 0.05, 12, 0.05, fixed(2), 0.5, 'Hz',
        (v) => (getAt(v, '$layer.lfo.depth') ?? 0) > 0),
      envTime('$layer.lfo.delay', 'ONSET', 0, 0.01, secs, 0, 's',
        (v) => (getAt(v, '$layer.lfo.depth') ?? 0) > 0),
    ],
  });
  return groups;
};

const SYNTH_GROUPS = {
  /**
   * Layered: up to three oscillator sections, each a complete voice — the shape every
   * hand-written melodic voice in scheduleStep has, editable. See `_playLayer`.
   *
   * Drive is the drum panel's card on the same entry keys, so the two panels' DRIVE
   * pots are provably one control rather than two that look alike.
   */
  'MRDR-3': [
    ...layerGroups(),
    { key: 'drive', title: 'Drive', rows: [
      pick('$shape', 'SHAPE', DRIVE_SHAPES, 'soft'),
      // A fresh row. SHAPE is three words, so it takes three of the card's four columns
      // and leaves exactly one — into which DRIVE would fall, stranded beside a choice
      // row with TONE alone underneath it. The two pots belong together.
      n('$drive', 'DRIVE', 0, 1, 0.01, fixed(2), 0, '', null, { startRow: true }),
      cutoffHz('$tone.freq', 'TONE', 16000),
    ] },
    // No Taps card. A tap is one HIT repeated milliseconds later — a clap, a flam —
    // and no software synth puts that on a melodic voice: the strip's delay insert is
    // the tool for a slapback, which is why the finale and walking basses had their
    // written-in `bassRepeat` taken out. `_playLayer` does not read `taps` either —
    // a card removed while the engine still honoured the key would be exactly the
    // hidden parameter tests/pot-coverage.js exists to catch.
    HUMANISE_GROUP,
  ],
  /**
   * Additive: a stack of sine partials, which is the drawbar organ and — once the
   * partials come off the harmonic series — a good deal more. See `_playAdditive`.
   *
   * DRAWBARS leads because it is the sound; everything under CHARACTER is a way of
   * bending that stack away from being an organ, and the envelope is the same four
   * numbers every panel here has.
   */
  AdditiveSynth: [
    { title: 'Drawbars', rows: drawbarRows() },
    { title: 'Character', rows: [
      pick('$additive.type', 'WAVE', ['sine', 'triangle'], 'sine'),
      // The two knobs that stop this being only an organ, and each is one control where
      // the honest version is nine — see the note over `_playAdditive`.
      n('$additive.stretch', 'STRETCH', 0, 0.3, 0.002, fixed(3), 0),
      n('$additive.damp', 'DAMP', 0, 3, 0.05, fixed(2), 0),
      n('$additive.count', 'PARTIALS', 1, 9, 1, fixed(0), 9),
    ] },
    { title: 'Envelope', rows: [
      envTime('$additive.attack', 'ATTACK', 0.001, 0.001, secs, 0.01),
      // Zero reads as NOTE rather than 0ms: it is the arcade shape — an exponential fall
      // across the whole note — and a magic value you can see on the dial is a detent
      // rather than a secret. SUSTAIN stays live with it: a decay that runs to the end of
      // the note has no plateau to hold, but the fall still lands ON the sustain level.
      envTime('$additive.decay', 'DECAY', 0, 0.01, secs, 1),
      sustainPct('$additive.sustain', 0),
      envTime('$additive.release', 'RELEASE', 0, 0.01, secs, 0.015),
      // The same three-pill trio MRDR-3 and every Tone envelope end on. `curve`
      // keeps its historical name and its decay meaning — see the note over the
      // engine's own `adsr` — so every stack on file reads back unchanged; the other
      // two default to the exponential shape they always had before they were
      // separate keys.
      pick('$additive.attackCurve', 'ATK', ['exp', 'lin'], 'exp', null, { trio: 'curve' }),
      pick('$additive.curve', 'DEC', ['exp', 'lin'], 'exp', null, { trio: 'curve' }),
      pick('$additive.releaseCurve', 'REL', ['exp', 'lin'], 'exp', null, { trio: 'curve' }),
    ] },
    // Every partial bends together, keeping its ratio — a registration arriving rather
    // than a chord sliding apart. This is what `organSwoop` is.
    { title: 'Pitch', optional: 'additive.pitch',
      onTip: 'Take the bend out — the stack arrives at pitch',
      offTip: 'Bend the whole registration into the note',
      rows: [
        pick('$additive.pitch.curve', 'RATE CURVE', ['exp', 'lin', 'snap'], 'exp'),
        n('$additive.pitch.from', 'FROM', 0.25, 4, 0.0001, fixed(4), 1, '×'),
        n('$additive.pitch.to', 'TO', 0.25, 4, 0.0001, fixed(4), 1, '×'),
        envTime('$additive.pitch.sweep', 'SWEEP TIME', 0.01, 0.01, secs, 0.1),
      ] },
    // The percussion register: one louder partial struck on the attack and gone long
    // before the note is. Always dry, so repeated off-beat stabs stay crisp.
    { title: 'Percussion', optional: 'additive.perc',
      onTip: 'Take the key-attack pip out',
      offTip: 'Strike one partial on the attack — the Hammond percussion register',
      rows: [
        n('$additive.perc.ratio', 'HARMONIC', 1, 8, 1, fixed(0), 3, '×'),
        n('$additive.perc.gain', 'LEVEL', 0, 2, 0.01, fixed(2), 0.72),
        envTime('$additive.perc.attack', 'ATTACK', 0.001, 0.001, secs, 0.002),
        // Seconds, not a fraction of the note: a real percussion register is a circuit
        // constant — fast or slow whatever the player holds.
        envTime('$additive.perc.decay', 'DECAY', 0.005, 0.005, secs, 0.08),
      ] },
    HUMANISE_GROUP,
  ],
  GameSynth: [
    { title: 'Game Synth', rows: [
      // `noise` is a fifth WAVEFORM rather than a fifth preset kind: it swaps the
      // oscillator for the seeded buffer through a bandpass that tracks the note, so
      // every other control on the panel goes on meaning what it meant.
      { kind: 'pick', path: '$waveform', label: 'WAVE', options: ['sine', 'square', 'sawtooth', 'triangle', 'noise'], def: 'square' },
      envTime('$attack', 'ATTACK', 0.001, 0.001, secs, 0.01),
      envTime('$release', 'RELEASE', 0, 0.001, secs, 0.015),
    ] },
    // What turns a waveform into an arcade cabinet: WHERE the note comes in from.
    // Defaults to off, so the presets that ship on this path are untouched.
    //
    // AMOUNT is signed on purpose — the sign is the entire difference between a coin
    // (falling into the note) and a power-up (climbing into it), and a magnitude pot
    // beside a direction switch would be two controls saying one thing.
    //
    // The SAME five rows the layer cards' Pitch Env has, on the same key names, because
    // it is the same idea: how far the note starts from where it is written, and how it
    // gets there. This panel used to say SWEEP / SWEEP TIME / SWEEP CURVE, which was one
    // ramp with no sustain and no release and a third name for an envelope.
    //
    // No DEPTH or RATE rows here: `commonRows` already has VIB DEPTH and VIB RATE on
    // these very keys, for every preset. `_playGame` now reads them like every other
    // path, so a preset's wobble means one thing wherever it is played.
    { title: 'Pitch Env', rows: pitchEnvRows('pitch.') },
    // A tone filter, between the source and the envelope. Switched OFF and absent by
    // default rather than present at a wide-open 20 kHz: an absent section builds no
    // node at all, so every preset that shipped before it is untouched, and "no filter"
    // stays a different thing from "a filter doing nothing" — the same rule the drum
    // panel's optional sections follow.
    //
    // Same keys as the noise and drum voices, because it is the same `_filterChain`:
    // TYPE and SLOPE are the filter, CUTOFF is where it starts, SWEEP TO and SWEEP are
    // where it goes and how long it takes. That last pair is the point of having it
    // here — a static cutoff is a tone control, but a cutoff falling into a noise burst
    // is an explosion, and one climbing out of a square is a power-up.
    { title: 'Filter', optional: 'filter',
      onTip: 'Take the filter out — the raw waveform',
      offTip: 'Shape the waveform through a filter, and sweep it',
      rows: [
        pick('$filter.type', 'TYPE', FILTER_TYPES, 'lowpass'),
        pick('$filter.slope', 'SLOPE', SLOPES, -12),
        cutoffHz('$filter.freq', 'CUTOFF', 4000),
        resQ('$filter.Q', 0.7),
        // `to` equal to `freq` is what "no sweep" looks like to `_filterChain`, so the
        // pot below it stays greyed until the two differ and the ramp actually exists.
        cutoffHz('$filter.to', 'SWEEP TO', 4000),
        envTime('$filter.sweep', 'SWEEP TIME', 0.005, 0.005, secs, 0.12, 's',
          (v) => v?.filter?.to != null && v.filter.to !== v.filter.freq),
      ] },
  ],
  Synth: [
    { title: 'Oscillator', rows: osc('oscillator', 'sine') },
    { title: 'Envelope', rows: adsr('envelope') },
  ],
  MonoSynth: [
    { title: 'Oscillator', rows: osc('oscillator', 'sawtooth') },
    { title: 'Amp Envelope', rows: adsr('envelope') },
    // Where the filter SITS, all in one place: its type and slope, the cutoff it
    // starts from, how hard it resonates and how far the envelope opens it.
    // `baseFrequency` and `octaves` are Tone's, and Tone files them under the
    // envelope — but they are not timing, they are the range the envelope moves
    // the filter ACROSS, and reading them next to an attack in milliseconds
    // told you nothing about either.
    { title: 'Filter', rows: [
      pick('filter.type', 'TYPE', FILTER_TYPES, 'lowpass'),
      pick('filter.rolloff', 'SLOPE', [-12, -24, -48], -12),
      cutoffHz('filterEnvelope.baseFrequency', 'CUTOFF', 200),
      resQ('filter.Q', 1),
      // Filter envelope depth — the Roland ENV AMOUNT, in octaves. Zero is no
      // modulation (the envelope does nothing and the filter stays at CUTOFF).
      // Tone.js only sweeps UP from the cutoff, so this is positive-only
      // where a Roland's ENV AMOUNT would be bipolar — and the same ten-octave
      // reach and taper the layer card has, so the two pots read alike.
      n('filterEnvelope.octaves', 'ENV AMOUNT', 0, ENV_OCT_MAX, 0.1, fixed(1), 0, 'oct',
        null, { scale: ENV_OCT_SCALE }),
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
      n('harmonicity', 'RATIO', 0.9, 2.1, 0.001, fixed(3), 1),
      n('vibratoAmount', 'VIBRATO', 0, 1, 0.01, fixed(2), 0.5, '', null,
        { scale: VIB_DEPTH_SCALE }),
      n('vibratoRate', 'VIB RATE', 0.1, 60, 0.1, fixed(1), 5, 'Hz', null,
        { scale: SLOW_END_SCALE }),
    ] },
    { title: 'Voice 1', rows: [...osc('voice0.oscillator', 'sawtooth'), ...adsr('voice0.envelope')] },
    { title: 'Voice 2', rows: [...osc('voice1.oscillator', 'square'), ...adsr('voice1.envelope')] },
  ],
  MembraneSynth: [
    { title: 'Drum', rows: [
      // The two halves of a kick's drop, named for which half each is: HOW FAR, and HOW
      // FAST. They were the wrong way round — `pitchDecay` is a time and wore the name
      // that sounds like a distance, while `octaves`, the distance, was called DEPTH.
      n('octaves', 'PITCH DROP', 0.5, 12, 0.1, fixed(1), 10, 'oct', null,
        { scale: SLOW_END_SCALE }),
      n('pitchDecay', 'DROP TIME', 0.001, 0.5, 0.001, secs, 0.05, 's', null,
        { scale: ENV_TIME_SCALE }),
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
      // Tone's `resonance` is a FREQUENCY — where the metal body rings — not a Q. Every
      // other pot on the desk called RESONANCE is a Q, so this one says which it is.
      n('resonance', 'RES FREQ', 200, 8000, 50, hz, 4000, 'Hz'),
      // The same `octaves` key MembraneSynth has, doing the same job: how far the
      // envelope drags the pitch. One key, one name, on both panels.
      n('octaves', 'PITCH DROP', 0.5, 4, 0.1, fixed(1), 1.5, 'oct', null,
        { scale: SLOW_END_SCALE }),
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
  // Same order as the drum panel's sections: LEVEL, then the pills, then the rest.
  // Nothing is saved by it — these groups are one pill and four knobs either way — but
  // LEVEL is in the same place in every editor, which is the whole of the point.
  //
  // It LEADS rather than following the pills because it is the row every oscillator
  // section on this desk has, and the only one that means the same thing on all of them:
  // how much of this source is in the sound. A card that opens on it reads as a mixer
  // channel, which is what an oscillator section is.
  { title: 'Burst', rows: [
    n('$noise.gain', 'LEVEL', 0, 2, 0.01, fixed(2), 1),
    pick('$noise.type', 'TYPE', FILTER_TYPES, 'bandpass'),
    pick('$noise.color', 'COLOUR', NOISE_COLORS, 'white'),
    pick('$noise.slope', 'SLOPE', SLOPES, -12),
    cutoffHz('$noise.freq', 'CUTOFF', 2600),
    // Up to 40, where it used to stop at 8. A bandpass does not RING below about ten —
    // it only colours — and a ringing filter is what a rim, a clave and the body of a
    // snare are made of. The pot could not reach the sound.
    resQ('$noise.Q', 0.7),
    envTime('$noise.decay', 'DECAY', 0.005, 0.005, secs, 0.09),
  ] },
  // The body is what tells a snare from a hiss, and plenty of presets genuinely have
  // none — a brush and a closed hat are all air. So it is a group you switch on.
  { title: 'Body', optional: 'body',
    onTip: 'Take the body out — the burst on its own',
    offTip: 'Put a pitched thump under the burst',
    rows: [
      n('$body.gain', 'LEVEL', 0, 2, 0.005, fixed(3), 0.375),
      pick('$body.type', 'WAVE', WAVES, 'triangle'),
      // Up to 4 kHz, where these stopped at 1200 and 1000. A body is not always a thump:
      // under a hat it is the metallic ping, and its harmonics have to land in the band
      // the burst occupies or it is a knock underneath rather than a part of the sound.
      oscHz('$body.from', 'FREQUENCY', 210),
      oscHz('$body.to', 'SWEEP TO', 140),
      envTime('$body.decay', 'DECAY', 0.005, 0.005, secs, 0.06),
    ] },
  HUMANISE_GROUP,
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
// So the pills are adjacent — they cost their rows wherever they go, and next to each
// other they read as the section's shape choices, the two envelope shapes and the wave —
// and the knobs run in one unbroken block behind them, which packs six into two rows and
// seven into two. Rows saved off the panel, and LEVEL lands in the same place in every
// section rather than wherever its group happened to leave it.
const DRUM_GROUPS = [
  { title: 'Oscillator', optional: 'osc',
    onTip: 'Take the pitched half out — noise only',
    offTip: 'Put a pitched source under the noise',
    rows: [
      n('$osc.gain', 'LEVEL', 0, 2, 0.01, fixed(2), 1),
      pick('$osc.type', 'WAVE', WAVES, 'sine'),
      pick('$osc.curve', 'CURVE', ['exp', 'lin'], 'exp'),
      // Named for the RATE knob it shapes rather than called a second CURVE: this one is
      // the pitch drop, the one above it is the level. `snap` is the analogue drum
      // machine's own pitch envelope — hardest at the start, settled before the tail —
      // and it is the difference between a kick that clicks and one that goes boing.
      pick('$osc.pitchCurve', 'RATE CURVE', ['exp', 'lin', 'snap'], 'exp'),
      // The engine kick's mid punch, as a level and nothing else — a fixed 300→180 Hz
      // triangle, up in 4ms and gone in 50. It is the second oscillator a kick needs
      // and the only one, so it is a pot rather than a section. Zero builds nothing.
      n('$knock', 'KNOCK', 0, 1, 0.01, fixed(2), 0),
      oscHz('$osc.from', 'FREQUENCY', 190, {
        // Tuning a drum is not the same gesture as changing how far it falls, so the
        // destination travels with the tuning and AMOUNT stays where it was put. Without
        // this, dragging FREQUENCY up flattens the drop to nothing on the way.
        after: (now, v, was) => {
          if (!(was > 0) || !(now > 0)) return;
          setAt(v, '$osc.to', toneAt(now, 12 * Math.log2(clampHz(oscTo(v)) / was)));
        },
      }),
      // The pitch envelope's DEPTH, and the one control here that is not stored as it is
      // shown — see the block above `AMOUNT_SEMIS`. Up as readily as down: a drum whose
      // pitch rises is half the rims and every zap.
      n('$osc.to', 'AMOUNT', -AMOUNT_SEMIS, AMOUNT_SEMIS, 0.5, semis, 0, 'semi', null, {
        origin: 0,
        tip: 'How far the pitch envelope moves the tuning, in semitones — up as readily'
          + ' as down. Centre is no sweep at all',
        read: (_to, v) => amountOf(v),
        write: (x, v) => toneAt(oscFrom(v), x),
      }),
      // How long the pitch takes to get there — the third of the trio, and an envelope
      // time like any other, so it takes the shared ten-second ceiling and the shared
      // response. Past about a second it stops being a drum's drop and becomes a siren,
      // which is a sound this section could not previously make.
      envTime('$osc.sweep', 'SWEEP TIME', 0.005, 0.005, secs, 0.07, 's', null,
        { tip: 'How long the pitch takes to travel the AMOUNT' }),
      envTime('$osc.attack', 'ATTACK', 0.001, 0.001, secs, 0.001),
      envTime('$osc.hold', 'HOLD', 0, 0.001, secs, 0),
      envTime('$osc.decay', 'DECAY', 0.01, 0.005, secs, 0.35),
      // The two-stage decay, as one pot: the level the section drops to in the first
      // 20ms before the rest of DECAY carries it down. Zero is one plain decay, which
      // is what every preset written before this had. It is what makes a drum read as
      // STRUCK — one exponential is either a transient or a tail and cannot be both.
      n('$osc.sag', 'SAG', 0, 1, 0.01, fixed(2), 0),
    ] },
  // The modulator, and the reason one oscillator can be a cowbell or a rim: a second
  // oscillator bending the first one's pitch faster than the ear can follow, which is
  // heard as a timbre rather than as a wobble.
  { title: 'FM', optional: 'osc.fm',
    onTip: 'Take the modulator out — the oscillator on its own',
    offTip: 'Bend the oscillator with a second one — clangs, bells, rims',
    rows: [
      pick('$osc.fm.type', 'WAVE', WAVES, 'sine'),
      n('$osc.fm.ratio', 'RATIO', 0.1, 12, 0.01, fixed(2), 1.4),
      n('$osc.fm.index', 'INDEX', 0, 8, 0.05, fixed(2), 1),
      envTime('$osc.fm.attack', 'ATTACK', 0.001, 0.001, secs, 0.001),
      envTime('$osc.fm.decay', 'DECAY', 0.005, 0.005, secs, 0.35),
    ] },
  { title: 'Noise', optional: 'noise',
    onTip: 'Take the noise half out — the oscillator on its own',
    offTip: 'Put the seeded noise source back in',
    rows: [
      n('$noise.gain', 'LEVEL', 0, 2, 0.01, fixed(2), 1),
      pick('$noise.type', 'TYPE', FILTER_TYPES, 'bandpass'),
      pick('$noise.curve', 'CURVE', ['exp', 'lin'], 'exp'),
      pick('$noise.color', 'COLOUR', NOISE_COLORS, 'white'),
      pick('$noise.slope', 'SLOPE', SLOPES, -12),
      cutoffHz('$noise.freq', 'CUTOFF', 2600),
      cutoffHz('$noise.to', 'SWEEP TO', 2600),
      envTime('$noise.sweep', 'SWEEP TIME', 0.005, 0.005, secs, 0.12),
      resQ('$noise.Q', 0.7),
      envTime('$noise.attack', 'ATTACK', 0.001, 0.001, secs, 0.001),
      envTime('$noise.hold', 'HOLD', 0, 0.001, secs, 0),
      envTime('$noise.decay', 'DECAY', 0.005, 0.005, secs, 0.12),
      n('$noise.sag', 'SAG', 0, 1, 0.01, fixed(2), 0),
    ] },
  // A click into a very narrow filter: struck, then ringing. Where the noise section
  // is a burst you shape, this is a PITCH that arrives already decaying — the rim, the
  // clave, the wood block, the shell under a snare.
  { title: 'Ring', optional: 'ring',
    onTip: 'Take the resonator out',
    offTip: 'Strike a resonant filter — rims, claves, shells',
    rows: [
      n('$ring.gain', 'LEVEL', 0, 2, 0.01, fixed(2), 1),
      pick('$ring.type', 'TYPE', FILTER_TYPES, 'bandpass'),
      pick('$ring.curve', 'CURVE', ['exp', 'lin'], 'exp'),
      oscHz('$ring.freq', 'FREQUENCY', 400),
      oscHz('$ring.to', 'SWEEP TO', 400),
      // The one that changes what it IS rather than how it sounds: a couple of
      // milliseconds is a stick, twenty is a mallet, past fifty it is a burst again.
      n('$ring.hit', 'STRIKE', 0.0005, 0.05, 0.0005, secs, 0.002, 's', null,
        { scale: ENV_TIME_SCALE }),
      resQ('$ring.Q', 40),
      envTime('$ring.decay', 'DECAY', 0.005, 0.005, secs, 0.25),
      n('$ring.sag', 'SAG', 0, 1, 0.01, fixed(2), 0),
    ] },
  // Six squares at inharmonic ratios through a highpass — the 808's cymbal circuit.
  { title: 'Metal', optional: 'metal',
    onTip: 'Take the cluster out',
    offTip: 'Add a cluster of inharmonic squares — hats, cowbells, cymbals',
    rows: [
      n('$metal.gain', 'LEVEL', 0, 2, 0.01, fixed(2), 1),
      pick('$metal.wave', 'WAVE', WAVES, 'square'),
      pick('$metal.filter', 'TYPE', FILTER_TYPES, 'highpass'),
      oscHz('$metal.freq', 'FREQUENCY', 800),
      // 0 collapses the cluster onto one note and 2 pulls the partials twice as far
      // apart as the 808's. Everything between is a different metal.
      // PARTIAL SPREAD rather than SPREAD: everywhere else on the desk SPREAD is unison
      // detune in cents, and this pulls a bank of partials apart by a ratio.
      n('$metal.spread', 'PARTIAL SPREAD', 0, 2, 0.01, fixed(2), 1),
      n('$metal.count', 'PARTIALS', 1, 6, 1, fixed(0), 6),
      cutoffHz('$metal.hp', 'CUTOFF', 3000),
      resQ('$metal.Q', 0.7),
      envTime('$metal.decay', 'DECAY', 0.005, 0.005, secs, 0.2),
      n('$metal.sag', 'SAG', 0, 1, 0.01, fixed(2), 0),
    ] },
  { title: 'Drive', rows: [
    pick('$shape', 'SHAPE', DRIVE_SHAPES, 'soft'),
    n('$drive', 'DRIVE', 0, 1, 0.01, fixed(2), 0),
    // After the shaper, not before: what it is for is the fizz the drive just added.
    cutoffHz('$tone.freq', 'TONE', 16000),
  ] },
  HUMANISE_GROUP,
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
  ring: { type: 'bandpass', freq: 400, Q: 40, hit: 0.002, decay: 0.25, curve: 'exp', gain: 1 },
  metal: { wave: 'square', freq: 800, spread: 1, count: 6, hp: 3000, Q: 0.7, decay: 0.2, gain: 1 },
  // The modulator hangs off the oscillator rather than off the entry, which is the one
  // section here whose key is a path — see `addSection`.
  'osc.fm': { type: 'sine', ratio: 1.4, index: 1, decay: 0.35 },
  // No `humanize` here any more, and no `layer.lfo` or `layer.oscN.pwm` below: those
  // three cards lost their switch, because their DEPTH pot at zero already was one. A
  // section with no switch is never added, so a default for adding it would be a value
  // nothing could reach. Their starting points live on the rows instead — which is where
  // the per-layer PWM rates had to go, or three layers would all breathe in step.
  //
  // The additive sections, same rule: `_playAdditive`'s own `??` fallbacks, so switching
  // one on starts from the sound the engine already implied. `pitch` opens on a fourth
  // below, which is `organSwoop`'s own interval; `perc` on the third harmonic, which is
  // the Hammond's.
  'additive.pitch': { from: 0.7492, to: 1, sweep: 0.1 },
  'additive.perc': { ratio: 3, gain: 0.72, attack: 0.002, decay: 0.08 },
  // The game synth's tone filter opens WIDE and flat — a lowpass at 4 kHz with no
  // resonance and `to` equal to `freq`, so switching it on takes nothing away and
  // sweeps nowhere. Every other section here starts from the sound the engine already
  // implied; this one has no such sound to start from, so it starts from silence's
  // opposite: audibly the raw waveform, with all six pots ready to move.
  filter: { type: 'lowpass', slope: -12, freq: 4000, to: 4000, Q: 0.7, sweep: 0.12 },
  // The layer sections. Osc 2 and 3 switch on as USEFUL layers — a sub and an octave,
  // the two the engine voices actually stack — not as silence to dig out of. The
  // per-layer filter opens on the filtered saw's own numbers, the pitch bend on an
  // octave rise, the FM on `_playDrum`'s operator defaults (decay 0 here: modulation
  // across the note, which is what a melodic voice wants where a drum wants a strike).
  layer: {},
  'layer.osc2': { type: 'sine', ratio: 0.5, gain: 0.3, decay: 1 },
  'layer.osc3': { type: 'triangle', ratio: 2, gain: 0.25, len: 0.62, decay: 1 },
  // No `to`/`sweep` here. The layer card speaks the software-synth standard — a cutoff
  // that sits still and a Filter Env that moves it — and `_playLayer` hands the chain
  // only type/slope/freq/Q. Seeding the sweep pair wrote two keys into every preset that
  // switched a filter on, which no pot could show and no path could read.
  'layer.osc1.filter': { type: 'lowpass', freq: 1150, Q: 1.15 },
  'layer.osc2.filter': { type: 'lowpass', freq: 1150, Q: 1.15 },
  'layer.osc3.filter': { type: 'lowpass', freq: 1150, Q: 1.15 },
  'layer.osc1.fm': { type: 'sine', ratio: 1.4, index: 1, decay: 1 },
  'layer.osc2.fm': { type: 'sine', ratio: 1.4, index: 1, decay: 1 },
  'layer.osc3.fm': { type: 'sine', ratio: 1.4, index: 1, decay: 1 },
  // The global stage. The filter seeds as a layer filter does, for the same reasons and
  // with the same two keys left out.
  'global.filter': { type: 'lowpass', freq: 1150, Q: 1.15 },
  // The VCA seeds NEUTRAL rather than from `adsr`'s own fallbacks, which is the one place
  // that rule would do harm: those fallbacks are `sustain: 0` with `decay: 0`, so a stack
  // whose VCA was switched on would fall silent the instant it was struck and read as a
  // broken switch. `sustain: 1` holds the note at full through its length and lets go over
  // 15ms — an envelope that changes nothing until you move it, which is what switching a
  // section ON should sound like. Same principle as osc2/3 seeding a useful second layer
  // rather than silence.
  'global.vca': { attack: 0.01, decay: 0, sustain: 1, release: 0.015 },
};

// ---- optional sections -------------------------------------------------------
//
// A section is present or absent, never present-and-zeroed: `body: { gain: 0 }` still
// builds an oscillator per hit, and "no body" is a different sound from "a body at
// zero". Switching one on for the FIRST time seeds it from `_playDrum`'s own fallbacks,
// so it starts as the sound the engine already implied rather than as a new one.
//
// But a switch you have already used is a BYPASS, not a delete. Off has to be something
// you can undo — half of sound design is taking a part out to hear what it was doing —
// and a section that came back holding factory defaults instead of the two minutes of
// tuning you had just put into it made Off a decision you could not take back. So what
// is switched off is HELD, and On puts it back exactly as it was left.
//
// ---- where the hold lives ---------------------------------------------------
//
// On the preset, under `bypassed`, and therefore in voices.js. It cannot live in the
// panel: the panel forgets everything on a reload, which would make "as I left it" true
// for an afternoon and false the next morning — and a hold that survives a reload has
// to be written down somewhere, and the preset is the only thing that gets written.
//
// It cannot live in the SECTION either, as `osc: { off: true }`, because presence IS the
// switch everywhere downstream: `_playDrum` builds an oscillator for any `osc` it finds,
// and a section that is switched off but still audible is the one outcome worse than
// forgetting. `bypassed` is a key the engine never reads, holding sections that are not
// where the engine looks — so the sound of a preset with holds in it is the sound of the
// same preset with them stripped out, which is what makes this safe.
//
// Keyed by the section's PATH, so `osc` and `osc.fm` are separate holds. It travels with
// the preset by construction: a copy, a Save as New and a song's own version of a sound
// are all deep copies of the entry, and each carries what its switches were holding.
const sectionOn = (voice, key) => getAt(voice, `$${key}`) !== undefined;

const HELD = 'bypassed';
const holdOn = (voice, key) => voice?.[HELD]?.[key];
const copy = (o) => JSON.parse(JSON.stringify(o));

function addSection(voice, key) {
  const parts = key.split('.');
  for (let i = 0; i < parts.length; i++) {
    const path = parts.slice(0, i + 1).join('.');
    if (getAt(voice, `$${path}`) !== undefined) continue;
    const held = holdOn(voice, path);
    setAt(voice, `$${path}`, held ? copy(held) : { ...(SECTION_DEFAULTS[path] || {}) });
    // What has just been put back is live again, and the copy that was held is now the
    // stale one. A nested hold is NOT released with it: a preset can have had its FM
    // switched off first and its oscillator second, and each remembers its own.
    releaseHold(voice, path);
  }
}

function dropSection(voice, key) {
  const parts = key.split('.');
  const owner = parts.length > 1 ? getAt(voice, `$${parts.slice(0, -1).join('.')}`) : voice;
  if (!owner) return;
  const leaf = parts[parts.length - 1];
  // Whatever was in it, including any section nested inside it — an oscillator switched
  // off takes its modulator with it, and both come back together.
  if (owner[leaf] !== undefined) (voice[HELD] ||= {})[key] = copy(owner[leaf]);
  delete owner[leaf];
}

/** Drop one hold, and the whole bag with the last of them: a preset that has never used
 *  a switch carries no `bypassed` key, and one that has stopped using them stops too. */
function releaseHold(voice, key) {
  const bag = voice?.[HELD];
  if (!bag) return;
  delete bag[key];
  if (!Object.keys(bag).length) delete voice[HELD];
}

/**
 * Whether a preset is a ONE-SHOT: a noise burst or a drum, which is over when it is
 * over and has no note to be over the length of.
 *
 * The dispatch says it outright. `play` hands the pitched paths everything —
 * `{ freq, time, dur, gain, detune, … }` — and hands these two:
 *
 *     if (v.kind === 'noise') return this._playNoise(v, { time, gain, dry, wet, echo });
 *     if (v.kind === 'drum')  return this._playDrum(v,  { time, gain, dry, wet, echo });
 *
 * No `freq`, no `dur`, no `detune`. So LENGTH and FIXED LENGTH have no note length to
 * set, TRANSPOSE and FINE have no note to shift — neither method calls `pitchShift` —
 * and VIB DEPTH and VIB RATE have no oscillator to bend, because neither reads
 * `v.vibrato` at all. Six pots that could not move a sample on a hat.
 *
 * What a one-shot's length and pitch actually are is already on its own panel, per
 * section: DECAY, HOLD and SWEEP set how long it rings, PITCH and FALLS TO set where.
 * That is not a workaround for the missing controls — it is why they are missing. A
 * drum's pitch belongs to the drum, not to the note that triggered it.
 */
const isOneShot = (v) => v?.kind === 'noise' || v?.kind === 'drum';

/**
 * Whether a preset is played through the POOL — one Tone class from `SYNTHS`, built
 * once and retriggered — or built from native nodes per note.
 *
 * The line `play()` itself draws: a noise or drum entry, GameSynth, AdditiveSynth and
 * MRDR-3 all return before the pool is consulted. MRDR-3 is nonetheless the
 * one NATIVE path where VOICING and GLIDE work — `_playLayer` keeps a glide origin per
 * (lane, voice) and chokes the previous note, which is what those controls promise.
 * On the other native paths they still cannot move a sample — see `commonRows`.
 */
const POOLED_SYNTHS = EDITABLE_SYNTHS.filter((s) => !NATIVE_SYNTHS.includes(s));
const isPooled = (v) => !isOneShot(v) && POOLED_SYNTHS.includes(v?.synth);

/**
 * WHICH TAP KEYS EACH PATH READS — the taps card, per path, from the engine outwards.
 *
 * `taps` is not a percussion feature: `play` reads `v.taps` and `v.tapFalloff` for every
 * pooled Tone class, one slot per repeat, and five presets in the catalogue use it there
 * (`clapMetal`, `clapFm`, `buzzRoll`, `snareFlam`, `stSnareFlam` — four MetalSynths and an
 * FMSynth). The card was on the noise, drum and additive panels only, so those five
 * carried a tap array nothing on screen could show or change.
 *
 * The WALKS are the other half of the same rule, in the other direction: a card that draws
 * every knob everywhere would put a TONE pot on AdditiveSynth, whose path never reads
 * `tapTone`, and a pot that cannot move a sample is worse than an absent one because you
 * spend an afternoon believing it. So each path states what it reads:
 *
 *   pooled Tone   taps, tapFalloff                     `play`
 *   noise         + tapGains, tapDecays, tapTone        `_playNoise`
 *   drum          + tapGains, tapDecays, tapTone,       `_playDrum`
 *                   tapDetune
 *   AdditiveSynth + tapDetune                           `_playAdditive`
 *   GameSynth     none — no card at all                 `_playGame` has no tap loop
 *   MRDR-3    none — no card at all                 `_playLayer` has no tap loop
 *
 * MRDR-3 is deliberate rather than missing: a tap is one hit repeated milliseconds
 * later — a clap, a flam — which is a percussion idea, and on a melodic voice the
 * slapback it gives you belongs on the strip's delay insert. Every preset in the
 * catalogue that uses taps is a clap, a snare flam or a buzz roll, including the five
 * built on pooled Tone classes; the class does not decide whether a preset is melodic.
 *
 * `bigRoomClap` is the inverse mistake already on file: a noise preset carrying
 * `tapDetune: 0.94`, which `_playNoise` does not read. Left alone rather than "fixed" —
 * teaching the path to read it would add a pitch walk to a shipped sound.
 */
const TAP_KEYS = (v) => ({
  gains: isOneShot(v),
  // A drum reads `tapDecays` INSIDE its noise section — no section, nothing to override,
  // so on a drum built from oscillators alone the pot would be inert.
  decays: isOneShot(v) && (v?.kind !== 'drum' || !!v?.noise),
  tone: isOneShot(v),
  detune: v?.kind === 'drum',
});

/**
 * The top section: what every preset has, whatever builds it.
 *
 * ---- and what only SOME of them have -----------------------------------------
 *
 * "Common" used to mean every row here appeared on every panel, which is only honest
 * while every row reaches every path. Two groups do not:
 *
 *   VOICING and GLIDE      `play` reads `v.mono` after it has already dispatched noise,
 *                          drum, GameSynth and AdditiveSynth away, and `portamento` is
 *                          a Tone constructor option on paths that build no Tone
 *                          objects at all. Gated on `isPooled`.
 *   LENGTH · FIXED LENGTH  the note itself, which a one-shot is never handed — see
 *   TRANSPOSE · FINE       `isOneShot` for the dispatch line that proves it. Gated on
 *   VIB DEPTH · VIB RATE   that, which leaves a drum's Note card holding TRIM alone.
 *
 * Absent rather than greyed, the same way MembraneSynth has no VOICING pills and
 * MetalSynth's envelope has no SUSTAIN — a control that can never apply is removed,
 * where one that does not apply YET is greyed.
 *
 * ---- what GLIDE is gated on twice --------------------------------------------
 *
 * `Monophonic.setNote` only ramps when the note it is gliding FROM is still sounding:
 *
 *     if (this.portamento > 0 && this.getLevelAtTime(t) > 0.05)  ramp
 *     else                                                       setValueAtTime
 *
 * Portamento is a legato feature, and a polyphonic preset has no legato: `play`
 * round-robins every note onto the next slot in the pool, whose previous note has long
 * since released, so the level at that moment is 0 and the second branch is always the
 * one taken. Measured — a rising line rendered at portamento 0 and 0.25 came out
 * SAMPLE-IDENTICAL, all 264,600 of them. Mono is what fixed it: one instance for the
 * whole lane, which remembers what it was playing. Hence the `when`.
 *
 * ---- and why VELOCITY is not here at all -------------------------------------
 *
 * Because nothing reads it. `$velocity` was written by this panel and by nothing else:
 * the level a note plays at is `voiceGain(v, lane) × laneTrim × trim`, all of it read
 * in scheduleStep, and no path in the rack looks at a preset's own velocity — not the
 * pooled one, not the native ones, not `_playNoise` or `_playDrum`. Not one preset in
 * the catalogue carries the key either, so removing the pot drops a control that had
 * never moved a sample rather than a feature. TRIM is the control that does this job.
 */
/**
 * Which half of the Note card a row belongs to.
 *
 * The strip draws all eleven as one card, because at 366px a second card is a second
 * header and a scroll further down. A wider layout splits them — the vibrato four are an
 * LFO on the pitch, and the rest are how long the note is and where it lands — so the
 * split is recorded HERE, on the row, rather than as a list of paths in the other file.
 * Tagged after the fact rather than threaded through eleven call sites: `part` is not a
 * property of the control, it is a property of where it gets drawn.
 */
const VIBRATO_PART = new Set([
  '$vibrato.depth', '$vibrato.rate', '$vibrato.delay', '$vibrato.spread',
]);
const withParts = (rows) => rows.map((r) => (
  { ...r, part: VIBRATO_PART.has(r.path) ? 'vibrato' : 'settings' }));

/**
 * The Note card's last three rows, and then its vibrato, in that order.
 *
 * The card reads in four blocks: what the note IS (length, trim, tuning), how it is PLAYED
 * (key mode, glide, and the absolute length that overrides all of it), and then the one
 * thing that is not a property of the note at all but something done TO it — vibrato.
 *
 * Ordered HERE rather than by moving the declarations, because these rows do not share a
 * condition: FIXED LENGTH is on every pitched preset, GLIDE and KEY MODE only on the paths
 * that can honour them. Moving FIXED LENGTH down beside GLIDE in the source would move it
 * inside GLIDE's `isPooled` test and quietly take it off half the catalogue. Re-ordering
 * the built list changes where a row sits and nothing about when it exists.
 *
 * It also keeps each declaration next to its own reasoning — the DEPTH taper, the SPREAD
 * note about one larynx, why the FIXED LENGTH ceiling is 4 — which is worth more beside
 * the pot than a hundred lines lower beside a pot it has nothing to do with.
 */
const NOTE_TAIL = ['$mono', '$portamento', '$fixedLength'];
const noteOrder = (rows) => {
  const tail = [...NOTE_TAIL, ...rows.filter((r) => r.part === 'vibrato').map((r) => r.path)];
  const moved = new Set(tail);
  return [
    ...rows.filter((r) => !moved.has(r.path)),
    // `filter(Boolean)`: a one-shot has no `$fixedLength` row and a non-pooled path has no
    // GLIDE, so the tail names rows that are legitimately absent.
    ...tail.map((p) => rows.find((r) => r.path === p)).filter(Boolean),
  ];
};

const commonRows = (voice = {}) => noteOrder(withParts([
  // Steps, not seconds: the engine multiplies by the song's seconds-per-16th, so a
  // preset holds for the same musical length at any tempo.
  // The hand-written engine voices use sub-quarter-step stabs, and Tone's release
  // continues after the requested note length. Keep the editor below 0.25 steps so
  // a preset can be made as short as those voices rather than sounding automatically
  // longer just because it is a library preset. At 120 BPM, 0.05 steps is 6.25ms.
  // GameSynth is not excluded, though a preview does ignore it: `_playGame` is handed a
  // fixed 4 s so the decay has room to reach silence. In a SONG it reads `dur` like every
  // other path, and eight presets on that path are in the catalogue — hiding the row made
  // a length that governs them unreachable, which is a bigger lie than a pot you cannot
  // hear while auditioning. See tests/pot-coverage.js.
  ...(isOneShot(voice) ? [] : [n('$dur', 'LENGTH', 0.05, 16, 0.01, fixed(2), 1, 'steps', null,
    { scale: SLOW_END_SCALE })]),
  // The one row here every path honours: `trim` is folded into the note's gain in
  // scheduleStep, BEFORE the rack is asked to play anything, so it lands on a hat
  // exactly as it lands on a lead. Which is why it is also the only thing left on a
  // one-shot's Note card.
  n('$trim', 'TRIM', -6, 6, 0.1, fixed(1), 0, 'dB'),
  // Everything from here to the vibrato is about the NOTE — how long it lasts and what
  // pitch it lands on — which is why a one-shot has none of it. See `isOneShot`.
  // GameSynth is NOT excluded from this block, unlike LENGTH above, because `_playGame`
  // reads every key in it: `fixedLength` in `noteSeconds` before dispatch, transpose and
  // fine through `VoiceRack.pitchShift`, and vibrato depth/rate on its own LFO. All eight
  // GameSynth presets in the catalogue carry a `fixedLength` — hiding the row hid a value
  // that was already governing them in every song, and left the panel's own VIB DELAY row
  // greyed forever behind a depth no control could set.
  ...(isOneShot(voice) ? [] : [
    // An absolute duration in seconds that overrides LENGTH and the tempo both — see
    // `noteSeconds` in src/engine/audio.js, which returns it verbatim and stops. `0` is
    // "not set" rather than "no length", which is why the pot bottoms out at nothing.
    //
    // The ceiling is 4 rather than 2 because a SOUND EFFECT is what this control is for
    // once it is longer than a note — an explosion, a siren, a power-down — and those run
    // past two seconds. `squareTone21` was already pinned at the old ceiling. Raising a
    // maximum moves no preset: every stored value is what it was, there is simply more
    // travel above it. Common to every PITCHED synth, because `fixedLength` is read in
    // `noteSeconds` before the voice is dispatched and so has never been one path's.
    n('$fixedLength', 'FIXED LENGTH', 0, 4, 0.001, fixed(3), 0, 'sec', null,
      { scale: ENV_TIME_SCALE }),
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
    //
    // Both pots run far past what an instrument does, because the game synth is not an
    // instrument. One unit of DEPTH is 100 cents on the native paths, so the top of the
    // pot is a full octave of wobble — a siren rather than a singer — and the musical
    // range (an instrument lives around 0.1–0.3) sits in the bottom twentieth. RATE runs
    // to 60 Hz, which stops being a wobble somewhere around 20 and becomes timbre: at
    // audio rate the LFO is frequency modulation and the sidebands are the sound.
    //
    // Which is why DEPTH is the one pot here with a CUBIC response, the same one the
    // drum pitch pot uses for the same reason: linearly, the whole singing range was
    // four percent of the travel, so the smallest move the mouse can make jumped clean
    // over it and the pot only ever read as "off" or "seasick". Cubed, 0–0.5 semitones
    // gets a third of the sweep and the octave is still at the stop. It changes no
    // stored value — only where on the ring a given one sits.
    //
    // The bottom of a long pot is reachable rather than fiddly: shift-drag is a fifth of
    // the travel and clicking the number types an exact one. And raising a maximum moves
    // no preset — every stored value is what it was, there is simply more travel above
    // it — which is the same trade FIXED LENGTH made when its ceiling went to four.
    // A fresh row, so the four VIB pots read as the block they are. Flowing in behind
    // GLIDE, the vibrato began mid-row under a heading it has nothing to do with — and
    // the whole point of moving it to the bottom was to stop it being interleaved.
    n('$vibrato.depth', 'VIB DEPTH', 0, 12, 0.01, fixed(2), 0, 'semi',
      null, { scale: VIB_DEPTH_SCALE, startRow: true }),
    n('$vibrato.rate', 'VIB RATE', 0.1, 60, 0.1, fixed(1), 5, 'Hz',
      (v) => (v?.vibrato?.depth ?? 0) > 0, { scale: SLOW_END_SCALE }),
    // The third of the three, beside the two it belongs with rather than stranded on one
    // synth's own card. Every NATIVE path measures the onset from its own note-on and so
    // honours it; the Tone path's LFO lives in the pool and free-runs across notes, with
    // no note-on for a delay to be measured from — hence the `when`, which greys it there
    // rather than offering a control that would silently do nothing.
    envTime('$vibrato.delay', 'VIB DELAY', 0, 0.01, secs, 0, 's',
      (v) => (v?.vibrato?.depth ?? 0) > 0 && NATIVE_SYNTHS.includes(v?.synth)),
    // The ensemble control. At zero every unison voice wobbles at one rate in one phase,
    // which is one singer through a chorus however many oscillators are running; wound up,
    // each voice takes its own rate and its own starting phase and the stack becomes a
    // SECTION. Scattered per unison index rather than per layer, deliberately — voice 2 is
    // the same singer in every layer, because a person has one larynx feeding all of their
    // formants, and scattering per layer pulls one voice apart instead of adding voices.
    //
    // MRDR-3 only: it is the one path that builds a modulator per voice. The pooled
    // classes share a single LFO in the pool and GameSynth has one oscillator to detune,
    // so there is nothing there to de-correlate.
    n('$vibrato.spread', 'VIB SPREAD', 0, 1, 0.01, fixed(2), 0, '',
      (v) => (v?.vibrato?.depth ?? 0) > 0 && v?.synth === 'MRDR-3',
      { tip: 'How far the unison voices drift apart in rate and phase — 0 is one wobble '
          + 'on every voice, 1 is a room full of singers who are not counting together' }),
  ]),
  // Mono holds one instance for the whole lane, so a new note cuts the last one off
  // — and, because that instance remembers what it was playing, GLIDE finally has a
  // pitch to slide from. Glide is greyed until mono is on for exactly that reason:
  // set it on a polyphonic preset and every note lands on a fresh voice with nothing
  // to glide from, and the control does nothing at all.
  //
  // Both are absent, not greyed, on the paths that cannot honour them — a drum has no
  // pool to hold one instance of and no Tone synth to carry a portamento. MRDR-3 is
  // the one NATIVE path where they work: `_playLayer` keeps a glide origin per
  // (lane, voice) and chokes the note still ringing, which is exactly what the pills
  // promise. See `isPooled`.
  ...(isPooled(voice) || voice?.synth === 'MRDR-3' ? [
    // KEY MODE, not VOICING: the Tone oscillator cards already spend VOICING on
    // single/fat/am/fm, which is a different question from how many notes sound at once.
    pick('$mono', 'KEY MODE', [false, true], false),
    // A fresh row, which is what leaves KEY MODE alone on its own. KEY MODE is a choice
    // row and takes three of the card's four columns, so without this GLIDE drops into
    // the one column left over and the played-how block starts halfway along a line.
    n('$portamento', 'GLIDE', 0, 0.5, 0.005, secs, 0, '', (v) => v?.mono === true,
      { scale: ENV_TIME_SCALE, startRow: true }),
  ] : []),
]));

/**
 * The `$` sections that belong to a SYNTH CLASS rather than to every preset.
 *
 * Switching class replaces `options` wholesale, and these are the native half of the same
 * idea: a preset that was an additive stack and is now a MonoSynth should not still be
 * carrying nine drawbars. Derived from the panels themselves so a new class widens the set
 * on its own rather than needing a second list kept in step.
 *
 * Minus whatever `commonRows` also owns — `vibrato` is on the GameSynth panel (for its
 * DELAY, which only that path can honour) AND on every preset, and wiping a preset's
 * vibrato because you changed its oscillator class would be a change to the sound nobody
 * asked for.
 *
 * Asked for a POOLED preset, so `mono` and `portamento` count as common: they are shown
 * on seven of the nine classes, and switching a MonoSynth to an FMSynth must not throw
 * away a voicing that means the same thing on both.
 */
const SYNTH_SECTIONS = (() => {
  const common = new Set(commonRows({ synth: 'Synth' })
    .filter((r) => r.path.startsWith('$'))
    .map((r) => r.path.slice(1).split('.')[0]));
  const owned = new Set(Object.values(SYNTH_GROUPS)
    .flatMap((groups) => groups.flatMap((g) => g.rows || []))
    .filter((r) => r.path.startsWith('$'))
    .map((r) => r.path.slice(1).split('.')[0]));
  return [...owned].filter((k) => !common.has(k));
})();

/**
 * EVERY PRESET KEY THIS PANEL PUTS A CONTROL ON, for one voice.
 *
 * Exported for tests/pot-coverage.js, which reads the engine's own `v.<key>` accesses out
 * of src/engine/voices.js and src/engine/audio.js and asserts the two sets match: a key a
 * play path reads and this panel does not draw is a preset setting nobody can see (which
 * is how eight GameSynth `fixedLength`s, five pooled tap arrays and `clapEngine`'s whole
 * shape went missing), and a control this panel draws that no path reads is a pot that
 * cannot move a sample. Both are the same bug seen from either end, and neither is
 * catchable by looking at one file.
 *
 * ROOT keys only — `vibrato.rate` counts as `vibrato` — because that is the granularity
 * the engine's reads have too: `_playGame` takes `v.vibrato` and picks it apart itself.
 * Non-`$` rows are Tone constructor options, which reach the rack inside `options`.
 */
export function panelKeys(voice = {}) {
  const keys = new Set();
  const groups = voice.kind === 'noise' ? NOISE_GROUPS
    : voice.kind === 'drum' ? DRUM_GROUPS
      : (SYNTH_GROUPS[voice.synth] || []);
  const add = (row) => {
    if (!row?.path) return;
    keys.add(row.path.startsWith('$') ? row.path.slice(1).split('.')[0] : 'options');
  };
  commonRows(voice).forEach(add);
  for (const g of groups) {
    // An optional section's key can itself be a path — the drum's `osc.fm`, the additive's
    // `additive.perc` — and the root is the granularity the engine's reads have.
    if (g.optional) keys.add(g.optional.split('.')[0]);
    if (g.taps) {
      keys.add('taps');
      keys.add('tapFalloff');
      const t = TAP_KEYS(voice);
      if (t.gains) keys.add('tapGains');
      if (t.decays) keys.add('tapDecays');
      if (t.tone) keys.add('tapTone');
      if (t.detune) keys.add('tapDetune');
    }
    (g.rows || []).flat(Infinity).forEach(add);
  }
  return keys;
}

/**
 * THE PANEL'S STRUCTURE, as data — every card and every row, for one preset.
 *
 * Exported beside `panelKeys` and for the same reason: another file needs to know what
 * this one draws, and the only honest way to tell it is to hand over the definition
 * rather than a description of it. `tools/build-synth-design-handoff.js` turns this into
 * the control inventory a UI is designed against, so a card added here arrives in that
 * brief without anyone having to remember to write it down a second time.
 *
 * The common card is returned with the title `buildPanel` gives it, so a brief cannot
 * call it Note where the desk calls it Level. `pillLabels` comes along for the same
 * reason: a pick's OPTIONS are what it stores, and the two-to-five letters actually
 * printed on the pill are what a layout has to leave room for.
 */
export function panelSpec(voice = {}) {
  const groups = voice.kind === 'noise' ? NOISE_GROUPS
    : voice.kind === 'drum' ? DRUM_GROUPS
      : (SYNTH_GROUPS[voice.synth] || []);
  return {
    common: { title: isOneShot(voice) ? 'Level' : 'Note', rows: commonRows(voice) },
    groups,
    pillLabels: SHORT,
  };
}

// ---- the full-window layout -------------------------------------------------

/**
 * WHERE EVERY CONTROL SITS IN THE FULL-WINDOW EDITOR.
 *
 * The strip has no layout worth the name: it stacks the cards in declaration order down a
 * 366px column and scrolls. A window six columns wide has to say which card goes where,
 * and that is a second arrangement of the same 166 controls — which is exactly the kind of
 * second list that drifts. A card added to `layerGroups()` and forgotten here would be a
 * control the engine reads and nothing draws, and `tests/pot-coverage.js` cannot see it:
 * that test works at ROOT-key granularity (`vibrato.rate` counts as `vibrato`), so a
 * missing leaf hides behind the dozen siblings that share its root.
 *
 * So the layout does not list controls. It lists CARDS, by `key`, and takes their rows
 * from the panel definition — and then checks itself:
 *
 *     every row in panelSpec() appears exactly once as a live control
 *
 * A read-only projection (the mixer strip's five readouts) does not count as the
 * placement; it must name a row that is live somewhere else. Anything unplaced, placed
 * twice, or named but nonexistent throws, with the path and the label.
 *
 * The layout regroups the panel in four places, all deliberate, all recorded here rather
 * than in the renderer:
 *
 *   · the oscillator card is GONE — its rows are the layer's own cell at the top of the
 *     window, where all three layers stand side by side, and the column it used to take
 *     belongs to FM, which was behind a door on it
 *   · PWM becomes a sub-section inside that FM card
 *   · PLS WIDTH is PULLED out of the oscillator's rows into that sub-section — the one
 *     control that lives in a different card here than it does on the strip. Same key,
 *     same label, same range; only the neighbours change.
 *
 * `take` can still halve a card by `part` (see `withParts`, which tags the Note card's
 * rows), and the renderer can still put several cards in one slot as tabs. Neither is
 * used at the moment. Both are how this layout absorbed a change of mind once already.
 */
// Keyed by the CARD's key, which for a split card is `<group>.<part>`. Only the cards
// whose window name differs from their strip name are listed; everything else keeps the
// title it already has, so the two surfaces read alike by default rather than by effort.
const FULL_TITLES = {
  // The strip calls it Note, after the row it opens on. Here it is the card that holds
  // everything about how the preset is PLAYED — length, transpose, glide, vibrato — which
  // is not one row's worth of name.
  note: 'SETTINGS',
  'note.settings': 'SETTINGS',
  'note.vibrato': 'VIBRATO',
};

/**
 * What a layer's own cell holds, besides its level.
 *
 * Everything that says what the layer IS rather than what it does in detail — and that is
 * now the whole of the oscillator section. Live controls, not readings: with three cells
 * side by side this is the row where you build the stack, and "what are these three doing
 * against each other" is a question you cannot ask a card that shows one layer at a time.
 *
 * Ordered by what they are, not by the panel's order: what it makes (WAVE, COLOUR), where
 * it sits (INTERVAL, DETUNE), how many of it there are (UNISON, SPREAD, STEREO), and when
 * it plays (GATE, DELAY). COLOUR rides ON the wave row rather than taking a column of its
 * own — see `mixCell`.
 */
const MIXER_ROWS = ['type', 'color', 'ratio', 'detune', 'unison', 'spread', 'stereo',
  'len', 'delay'];

export function fullLayout(voice = {}, { layer = 1 } = {}) {
  const problems = [];
  const built = buildFullLayout(voice, layer, problems);
  if (problems.length) {
    throw new Error(`fullLayout(${voice.synth}): ${problems.length} problem(s)\n  `
      + problems.join('\n  '));
  }
  return built;
}

/**
 * The same walk, reporting instead of throwing — for `tests/synth-full-layout.js`, which
 * wants every problem at once rather than the first one.
 */
export function checkFullLayout(voice = {}) {
  const problems = [];
  buildFullLayout(voice, 1, problems);
  return problems;
}

function buildFullLayout(voice, layer, problems) {
  if (voice.synth !== 'MRDR-3') return null;
  const { common, groups } = panelSpec(voice);
  const byKey = new Map(groups.map((g) => [g.key, g]));
  const placed = new Map();   // path -> [where, …]
  const seen = new Set();     // every path the panel defines

  for (const r of [...common.rows, ...groups.flatMap((g) => g.rows || [])]) seen.add(r.path);

  /** Take a card's rows, minus anything pulled out of it, and mark them placed. */
  const take = (key, { part = null, pull = [] } = {}) => {
    const g = key === 'note' ? common : byKey.get(key);
    if (!g) { problems.push(`no card keyed '${key}'`); return { key, title: key, rows: [] }; }
    const drop = new Set(pull);
    const rows = (g.rows || []).filter((r) => (
      (!part || r.part === part) && !drop.has(r.path)));
    for (const r of rows) placed.set(r.path, [...(placed.get(r.path) || []), key]);
    const cardKey = part ? `${key}.${part}` : key;
    return { key: cardKey, title: FULL_TITLES[cardKey] || g.title, group: g, rows };
  };
  /** One named row out of a card, for a `pull`. */
  const takeRow = (key, path, into) => {
    const g = byKey.get(key);
    const row = (g?.rows || []).find((r) => r.path === path);
    if (!row) { problems.push(`no row '${path}' on card '${key}' to pull into '${into}'`); return null; }
    placed.set(path, [...(placed.get(path) || []), into]);
    return row;
  };

  // ---- one layer's five cells ------------------------------------------------
  const layerCells = (N) => {
    const p = `layer.osc${N}`;
    const widthPath = `$${p}.width`;
    const width = takeRow(`osc${N}`, widthPath, `osc${N}.pwm`);
    const pwm = take(`osc${N}.pwm`);
    return [
      // The oscillator card is GONE, and this is what took its column. Every row it held
      // now lives in the layer's own cell at the top of the window — where all three
      // layers are side by side — except PLS WIDTH, which belongs to the PWM sub-section
      // below. That left a card with a header, a door and nothing between them, so the
      // door was opened instead: FM is the card now.
      //
      // It keeps the modulator's own on/off in its header, because that is the FM group's
      // switch and it always was; only the popover is gone.
      { kind: 'card', span: 1, layer: N,
        card: {
          ...take(`osc${N}.fm`),
          // The one section that is ABSENT rather than greyed when it does not apply —
          // a pulse is the only wave with a width, so on the other five there is nothing
          // for the sub-section to be about. It sits at the BOTTOM of the card, so
          // nothing below it can move when it comes and goes. It stays here rather than
          // following the oscillator up: PWM is four pots and a wave, which is a card's
          // worth of controls, and the cell above has no room for it.
          sub: [{ rule: 'PWM', ...pwm, rows: [width, ...pwm.rows].filter(Boolean) }],
        } },
      // AMOUNT is back where the panel puts it. It was pulled onto the oscillator card as
      // "where this oscillator sits" — but that card is gone, and on a cell full of
      // intervals and detunes a third pitch pot in semitones reads as a third interval.
      // It is the depth of THIS envelope, so it sits under this envelope's graph.
      { kind: 'card', span: 1, layer: N, graph: 'env', card: take(`osc${N}.pitch`) },
      { kind: 'card', span: 1, layer: N, graph: 'filter', card: take(`osc${N}.filter`) },
      { kind: 'card', span: 1, layer: N, graph: 'env', card: take(`osc${N}.filterenv`) },
      // The curve trio is only real where the engine reads it. `adsr()` honours
      // attackCurve/curve/releaseCurve; `centsEnv`, which runs the pitch and filter
      // envelopes, is linear-only — so those two cards get the graph and no curve panel.
      { kind: 'card', span: 1, layer: N, graph: 'env', curves: true, card: take(`osc${N}.amp`) },
    ];
  };

  // Every layer is walked, so the check covers all 166 controls — but only the selected
  // layer's cells are returned, because that is the band that is on screen.
  const perLayer = [1, 2, 3].map(layerCells);

  // SETTINGS ends the layer band, in the sixth column the five layer cards leave over.
  //
  // It is NOT a layer card — it is the note, over the whole preset — so it is taken ONCE,
  // out here, rather than inside `layerCells`, which runs three times. Taken in there it
  // would place its rows three times over and the completeness walk would call it a
  // duplicate, which is exactly the sort of thing that walk is for.
  //
  // The Note card is whole again too, vibrato included. It was split in two so VIBRATO
  // could share a slot with the other small sections; with those out on their own there
  // is nothing to share with, so the split bought nothing and cost the one thing a split
  // always costs: two headers where the panel has one. `part` and `withParts` stay — a
  // card that wants halving later still can.
  const settings = { kind: 'card', span: 1, card: take('note') };

  // ---- the mixer band: read-only projections, not placements -----------------
  const mixer = [1, 2, 3].map((N) => {
    const g = byKey.get(`osc${N}`);
    // All PLACEMENTS, not projections: these controls live here and nowhere else.
    const fader = takeRow(`osc${N}`, `$layer.osc${N}.gain`, `mixer${N}`);
    const rows = MIXER_ROWS
      .map((leaf) => takeRow(`osc${N}`, `$layer.osc${N}.${leaf}`, `mixer${N}`))
      .filter(Boolean);
    if (!fader) problems.push(`mixer cell ${N} has no LEVEL row to drive`);
    return { kind: 'mixer', span: 1, layer: N, group: g, fader, rows };
  });

  // ---- the shared stage ------------------------------------------------------
  //
  // Ordered to LINE UP WITH THE LAYER BAND ABOVE, not left-to-right by signal. The last
  // three columns are filter, filter envelope and amp in both rows, so the shared stage
  // reads as what it is — the same three stages again, once for the whole stack — and
  // your eye compares a layer's filter with the global one by looking straight down.
  // LFO and Drive take the column under Pitch Env, which is where the room is.
  const shared = [
    // One card each, rather than four tabs in one slot. Tabs cost a click and hide three
    // sections behind the one showing — fine when the alternative was four headers for
    // sixteen controls in a six-column band, and not fine now the band has room.
    { kind: 'card', span: 1, card: take('humanise') },
    { kind: 'card', span: 1, card: take('lfo') },
    { kind: 'card', span: 1, graph: 'filter', card: take('global.filter') },
    { kind: 'card', span: 1, graph: 'env', card: take('global.filterenv') },
    { kind: 'card', span: 1, graph: 'env', curves: true, card: take('global.vca') },
    // Drive last, which is where it happens: it is the only card on this band that is not
    // part of the voice's own shaping but a stage AFTER it — the whole stack summed, then
    // pushed. Ending the row on it reads left-to-right as the signal actually runs.
    { kind: 'card', span: 1, card: take('drive') },
  ];

  // ---- the check -------------------------------------------------------------
  const label = (path) => [...common.rows, ...groups.flatMap((g) => g.rows || [])]
    .find((r) => r.path === path)?.label ?? '?';
  for (const path of seen) {
    if (!placed.has(path)) problems.push(`UNPLACED  ${label(path)}  ${path}`);
  }
  for (const [path, where] of placed) {
    if (where.length > 1) problems.push(`PLACED ${where.length}×  ${label(path)}  ${path}  (${where.join(', ')})`);
    if (!seen.has(path)) problems.push(`PLACED BUT NOT A ROW  ${path}`);
  }
  // No projections left to check: the mixer cells hold live controls now, and every one
  // of them goes through `takeRow`, so the placed-exactly-once walk above already covers
  // them. If a read-only reading comes back, it checks here.

  const total = seen.size;
  return {
    synth: voice.synth,
    layer,
    total,
    // `cols` is the band's own grid, not one number for the window: three layers side by
    // side want thirds, and five cards want fifths, and forcing both onto a six-column
    // grid is what left the filters double-width in the first place. The renderer sets it
    // as a custom property and `tests/synth-full-layout.js` checks each band's spans add
    // up to it — a band that does not is a hole or an overflow.
    bands: [
      { name: 'mixer', cols: 3, cells: mixer },
      { name: 'layer', cols: 6, cells: [...perLayer[layer - 1], settings] },
      { name: 'shared', cols: 6, cells: shared },
    ],
  };
}

// ---- paths ------------------------------------------------------------------

// `$`-prefixed paths are on the entry itself (`dur`, `trim`, `noise.freq`,
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
  // An all-digit key means the container is a LIST, not an object. `additive.bars.3` is the
  // fourth drawbar, and building `{ '3': … }` for it would round-trip through the source
  // emitter as an object and read back as a preset with no bars — silent, and silent in a
  // way that looks like the engine rather than like the editor.
  for (let i = 0; i < ks.length - 1; i++) o = (o[ks[i]] ||= (/^\d+$/.test(ks[i + 1]) ? [] : {}));
  o[ks[ks.length - 1]] = value;
}

/**
 * Swap a live catalogue entry's CONTENTS for another preset's, in place.
 *
 * In place because `VOICES[id]` is the object the engine holds: replacing the binding
 * would leave every rack that already resolved it playing the old sound. So the entry is
 * emptied and refilled, and the nine RUNTIME properties are carried across by hand.
 *
 * They have to be, because they are DERIVED — src/data/voices.js and registerSongVoice
 * stamp them on load, and a preset as it would be written to the file has none of them.
 * Two of the nine have bitten:
 *
 *   · `kind` first. Dropping it left a MonoSynth with no kind — the picker stopped filing
 *     it, the editor drew it as a noise preset, and `voiceGain` re-levelled it.
 *   · `songLocal` is worse, because it is silent until the next save. A song's own copy is
 *     keyed `chordsVoice@bitter-lullaby`, and `commit` reads the flag to know that going
 *     to the library means taking a library NAME first. Without it the copy looks like an
 *     ordinary preset, and Save posts that id to /voice-save — where `upsertPreset`
 *     rejects it as not usable as an identifier, which is the first anyone hears of it.
 *
 * Extracted from `restore()` so that everything which swaps a whole preset does it the one
 * correct way. Revert is the first caller; A/B is the next.
 */
function replaceVoiceContents(voice, preset) {
  const { id, kind, songLocal, starter, factory, user, draft, songOrigin, songSourceId } = voice;
  Object.keys(voice).forEach((k) => delete voice[k]);
  Object.assign(voice, JSON.parse(JSON.stringify(preset)), { id, kind });
  if (songLocal) voice.songLocal = true;
  if (starter) voice.starter = true;
  if (factory) voice.factory = true;
  if (user) voice.user = true;
  if (draft) voice.draft = true;
  if (songOrigin) voice.songOrigin = songOrigin;
  if (songSourceId) voice.songSourceId = songSourceId;
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

/** The raw id a label would produce, without checking whether it's taken. */
function rawId(label) {
  const words = String(label).replace(/[^A-Za-z0-9 ]+/g, ' ').trim().split(/\s+/);
  let base = words.map((w, i) => (i ? w[0].toUpperCase() + w.slice(1) : w.toLowerCase())).join('');
  if (!base || /^\d/.test(base)) base = `voice${base}`;
  return base;
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
  // Solo one layer of a stack for listening — `(voiceId, layerKey, on) => void`, and
  // `null` to drop them all. Monitoring state that belongs to the ENGINE rather than to
  // this panel, because the panel forgets everything when it closes and a solo left
  // ringing behind it would be a preset that plays wrong with no visible reason why.
  // Defaulted to a no-op so a desk built without one still opens.
  setLayerSolo = () => {},
  onBlank = () => {},
  ask = null,
  isDevUser = () => false,
  // Whether there is anywhere to file a preset. False on the deployed desk, which has no
  // server behind it: the save and delete routes are the only two things in this panel
  // that leave the page, and without them the footer is Revert. Everything else here —
  // every pot, every pill, every bypass — is local and works exactly the same.
  canFile = () => true,
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
  // The full-window editor's factory, or null on a desk that has none. Handed in rather
  // than imported for the reason everything else here is: this file is a panel, and the
  // window is a different panel over the same preset. Called ONCE, lazily, the first time
  // EDIT is pressed — a desk that never opens it never builds it. See openFull.
  createFull = null,
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

  // Which layers are soloed on the panel right now. Held here rather than on the preset
  // for the reason every solo everywhere is held off to one side: it is a thing you are
  // doing to LISTEN, not a thing the sound is. Dropped whenever the panel opens
  // something else or closes, so it can never outlive the reason it was switched on.
  const soloed = new Set();
  const dropSolo = () => {
    if (!soloed.size) return;
    soloed.clear();
    setLayerSolo(null, null, false);
  };
  // Every way out of the panel goes through here, so there is one place that guarantees
  // no solo is left ringing behind a panel that is no longer on screen to show it.
  // The full window goes with it. There is no state of its own to lose — it draws the
  // same preset this panel does — and a modal left over a panel that is no longer there
  // would be an editor for nothing.
  const closePanel = () => { full?.close(); dropSolo(); close(); };

  const isOpen = () => !!state && el.classList.contains('show');

  /** The entry as it will be written: runtime identity and measurements are derived. */
  const asPreset = (v) => {
    const {
      id, kind, level, peak, songLocal, factory, user, draft, songOrigin, songSourceId,
      ...rest
    } = v;
    return JSON.parse(JSON.stringify(rest));
  };

  /**
   * The entry as a SONG carries it — the preset plus the two things voices.js would
   * otherwise stamp on it.
   *
   * `kind` comes from the table a preset is filed in, `level` and `peak` from measuring
   * it, so none of the three is written into the library file. A song's mix has no
   * tables and no measuring pass of its own, so a copy has to carry all three or it
   * arrives as a toneless synth at the wrong level. `songLocal` is not carried: it
   * describes where the entry came from, and registerSongVoice is what says that.
   */
  const asSongPreset = (v) => ({
    ...asPreset(v), kind: v.kind, level: v.level, peak: v.peak,
    ...(v.songOrigin ? { songOrigin: v.songOrigin } : {}),
    ...(v.songSourceId ? { songSourceId: v.songSourceId } : {}),
  });

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
    state.measured = false;      // the level on file no longer describes this sound
    // Applying a song mix re-registers its copy and may replace VOICES[state.id]
    // while this panel is still holding the previous object. Put the object being
    // edited back on the live id before refresh() reads it, or the controls move on
    // a detached copy while the rack keeps building from the old parameters.
    if (state.voice?.songLocal) VOICES[state.id] = state.voice;
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
   * The numbers on file are measured through the whole render pipeline, offline, on the
   * server; what is measured here is the synth's own output, in a bare context. They are
   * not the same numbers and never will be — `roundMono` peaks at 1.18 on file and 1.29
   * here. So the raw figures are never used directly. What is used is how much they
   * MOVED:
   *
   *   level ≈ level-on-file × (raw level now ÷ raw level when this opened)
   *
   * and the same again for the peak. Everything between the synth and the master is
   * linear in the synth's output — gains, pans, filters, sends — so the constant between
   * the two scales divides out, and what is left is right whatever that constant happens
   * to be. The exception is anything that is not linear, a limiter or a bus compressor;
   * neither is in the path, because the numbers on file are all measured with no mix at
   * all. The K-weighting the level carries is a pair of filters, so it is linear too.
   *
   * One caveat the peak did not have: this renders the preset for a fixed length, where
   * the file measures it for its own `dur`. A `dur` edit therefore does not show up in
   * the estimate. It shows up on save, which is the measurement that counts.
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
    if (!(raw.level > 0)) {
      // Worth catching here rather than at save: this is the failure that is invisible
      // where you are standing, and now it is caught while you are still moving the
      // control that caused it.
      state.silent = true;
      paintFoot();
      return;
    }
    state.silent = false;
    // Both numbers ride their own ratio. They do not move together — an envelope that
    // holds longer changes the energy and leaves the peak where it was, which is the
    // whole reason the level is measured separately from the peak.
    state.voice.level = state.levelBaseline * (raw.level / state.rawBaseline.level);
    state.voice.peak = state.peakBaseline * (raw.peak / state.rawBaseline.peak);
    state.estimated = true;
    // The level is part of the preset, so a song's copy has to carry the new one too —
    // this lands after `touched` wrote the shape, and the level is the slow half.
    onEdit(state.id, asSongPreset(state.voice));
    // No refresh needed: `voiceGain` is read per note, so the next one is already at
    // the new level.
    paintFoot();
  }

  /** Take the current sound as the thing future estimates are measured against. */
  async function rebase() {
    try {
      const raw = await measureRaw(state.id, noiseBuf(), sampleRate());
      if (raw.level > 0) {
        state.rawBaseline = raw;
        state.levelBaseline = state.voice.level;
        state.peakBaseline = state.voice.peak;
      }
    } catch { /* leave the old baseline; a stale ratio beats none */ }
  }

  // ---- controls ------------------------------------------------------------

  // Rows that only apply under some condition, collected as a surface is built and
  // re-tested whenever anything changes. Cleared per render, or a reopened panel keeps
  // testing guards against elements that are no longer on screen.
  //
  // A SET PER SURFACE, because there is more than one now. The strip and the full window
  // draw the same rows from the same definitions into two different elements, and each
  // has to forget its own on its own repaint: one shared list would mean the strip's next
  // build wiped the full window's guards and left half its panel stuck at whatever it
  // last looked like. Every live set is re-tested together by `syncAll`, since they are
  // all reading the one `state.voice`.
  //
  // A guard either GREYS its row or HIDES it, and both are a class toggled on every
  // write — never a rebuild. That is the whole point: `build()` would destroy the pot
  // that is being dragged, and the two things a control most needs to do while you drag
  // it are stay under the pointer and keep taking the drag. So a card that grows when a
  // value leaves zero grows by un-hiding rows it already drew.
  const guardSets = new Set();
  function guardSet() {
    const list = [];
    const set = {
      push: (el, when, hide = false) => list.push({ el, when, hide }),
      clear: () => { list.length = 0; },
      drop: () => { guardSets.delete(set); },
      sync: () => {
        for (const g of list) {
          const on = !!g.when(state.voice);
          g.el.classList.toggle(g.hide ? 'vehidden' : 'vedisabled', !on);
          // A hidden row's controls are out of the tab order too — `display: none` does
          // that on its own, so only the greyed ones need saying.
          if (g.hide) continue;
          for (const el of g.el.querySelectorAll('button, input')) el.disabled = !on;
        }
      },
    };
    guardSets.add(set);
    return set;
  }
  // The strip's own. The full window asks for its own through the kit.
  const rowGuards = guardSet();

  // `read`/`write` take the whole voice beside the value, because a pot is not always a
  // view of one stored number: AMOUNT is the RATIO of the oscillator's two frequencies,
  // so it cannot be read without the other one. `after` is the other half of that —
  // FREQUENCY has to carry the destination with it, or moving it would change an
  // interval the user set on a different pot.
  // `guards` is which surface is asking — the strip's set by default, the full window's
  // when it builds. See `guardSet`.
  const numRow = (row, guards = rowGuards) => {
    const raw = getAt(state.voice, row.path);
    const cur = row.read ? row.read(raw, state.voice) : raw;
    const value = typeof cur === 'number' ? Math.min(row.max, Math.max(row.min, cur)) : row.def;
    const r = knob({
      min: row.min, max: row.max, step: row.step, value, reset: row.def, fmt: row.fmt,
      scale: row.scale, origin: row.origin,
      onInput: (x) => {
        setAt(state.voice, row.path, row.write ? row.write(x, state.voice) : x);
        // `raw` is what the path held BEFORE this move: an `after` that has to keep a
        // RELATION intact needs both ends of the change, and by now the voice only
        // carries the new one.
        row.after?.(x, state.voice, raw);
        touched();
        syncRows();
      },
    });
    r.label.textContent = row.label;
    // Forces this pot to the start of a fresh grid row regardless of what filled the
    // row above it — see `.rowstart` and the note on `adsr`'s ATTACK.
    if (row.startRow) r.wrap.classList.add('rowstart');
    // The unit, quietly, after the name — `SWEEP oct`, `FROM Hz`. The reading itself
    // is inside the ring and has no room for it.
    if (row.unit) {
      const u = document.createElement('span');
      u.className = 'kunit';
      u.textContent = row.unit;
      r.label.append(' ', u);
    }
    if (row.tip) r.wrap.title = row.tip;
    // The stored value can sit outside the pot's range — a hand-written preset is not
    // bound by what this editor thinks is a sensible maximum — and clamping it into
    // view without saying so would silently change a sound by opening its editor. Set
    // after the row's own tip, because this is the more urgent of the two.
    if (typeof cur === 'number' && cur !== value) {
      r.label.prepend('* ');
      // In the POT's unit, not the file's: a derived control stores hertz and reads
      // semitones, and "on file as 10000.0" under a knob marked `semi` says nothing.
      r.wrap.title = `On file as ${row.fmt(cur)}, which is outside this control's range —`
        + ' moving the pot will change it';
    }
    if (row.when) guards.push(r.wrap, row.when);
    // `set` comes back with the element so a second grip on the same control — an
    // envelope handle dragging DECAY — can move this pot's needle as it goes. It is
    // display-only (`knob`'s `set` does not fire `onInput`), so there is no loop.
    return { wrap: r.wrap, set: r.set, row };
  };

  /**
   * A choice, as a row of pills rather than a dropdown.
   *
   * Four filter shapes is not a list you scroll, it is a set you can see — and a
   * dropdown hides three of the four behind a click and a menu, which is a lot of
   * ceremony for a control whose whole content fits on one line. The set is small and
   * fixed, so it may as well all be on screen and one click from anywhere in it.
   */
  // The pill box itself — shared by a lone pick and by each third of a `trioRow`, so
  // the two only ever differ in what wraps them.
  const buildSeg = (row, cur) => {
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
      // Uppercased when there is no abbreviation for it, so a pill is never the one
      // lowercase word in a row of capitals — `noise` beside SIN SQR SAW TRI was
      // exactly that, and an imported Tone type (`fmsquare5`) would have been next.
      b.textContent = SHORT[o] ?? String(o).toUpperCase();
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
    return seg;
  };

  const pickRow = (row, guards = rowGuards) => {
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
    wrap.append(k, buildSeg(row, cur));
    if (row.when) guards.push(wrap, row.when);
    return { wrap, row };
  };

  /**
   * Three picks that share a `trio` tag (currently just ATK/DEC/REL CURVE), laid out
   * as one full-width row split evenly three ways instead of each claiming its own
   * half- or whole-card slot — three toggles read as one control cut three ways
   * rather than three controls that happen to be adjacent, and it is a third the
   * height a `pickRow` per stage cost.
   */
  const trioRow = (rows, guards = rowGuards) => {
    const wrap = document.createElement('div');
    wrap.className = 'row segrow segtrio';
    for (const row of rows) {
      const cur = row.read ? row.read(state.voice) : (getAt(state.voice, row.path) ?? row.def);
      const col = document.createElement('div'); col.className = 'segtriocol';
      const k = document.createElement('span'); k.className = 'k'; k.textContent = row.label;
      col.append(k, buildSeg(row, cur));
      wrap.append(col);
      if (row.when) guards.push(col, row.when);
    }
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
    if (!state) return;
    for (const set of guardSets) set.sync();
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
    const tapKeys = TAP_KEYS(state.voice);

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

    // FALLOFF and the per-hit LEVEL pots below read the same thing — a hit's level — so
    // dragging one has to move the other or the card contradicts itself mid-drag. Set by
    // the LEVEL loop, and a no-op until then.
    let syncLevels = () => {};

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
        onInput: (x) => { state.voice.tapFalloff = x; syncLevels(); touched(); },
      });
      r.label.textContent = 'FALLOFF';
      r.wrap.title = 'How much quieter each repeat is than the one before it';
      grid.append(r.wrap);
      // The other two walks, beside the one that was always here. All three are per-TAP
      // ratios and all three are meaningless with a single hit, so this is where they
      // belong: a card that only exists once there is something to repeat. A clap made
      // of one sound four times is a stutter; a real one is four hands, each landing a
      // shade lower and duller than the last.
      //
      // Per PATH, though, not per card: `_playAdditive` never reads `tapTone` and
      // `_playNoise` never reads `tapDetune`, and a pot on a path that cannot hear it is
      // worse than no pot at all. See `TAP_KEYS`.
      for (const walk of [
        { key: 'tapDetune', label: 'PITCH', min: 0.8, max: 1.25, step: 0.005, fmt: fixed(3),
          on: tapKeys.detune,
          tip: 'How far each repeat is pitched from the one before it' },
        { key: 'tapTone', label: 'TONE', min: 0.6, max: 1.4, step: 0.01, fmt: fixed(2),
          on: tapKeys.tone,
          tip: 'How much duller — or brighter — each repeat is than the one before it' },
      ].filter((w) => w.on)) {
        const w = knob({
          min: walk.min, max: walk.max, step: walk.step, reset: 1, fmt: walk.fmt,
          value: state.voice[walk.key] ?? 1,
          // Exactly 1 is no walk at all, and a preset that does not walk should not
          // carry a key saying so — same rule `taps` itself follows above.
          onInput: (x) => {
            if (x === 1) delete state.voice[walk.key];
            else state.voice[walk.key] = x;
            touched();
          },
        });
        w.label.textContent = walk.label;
        w.wrap.title = walk.tip;
        grid.append(w.wrap);
      }
    } else {
      const note = document.createElement('div');
      note.className = 'devnote';
      note.textContent = 'One hit. Add a repeat or two a few milliseconds apart and it '
        + 'becomes a clap — which is all a clap is: one sound heard several times in a '
        + 'small room.';
      grid.append(note);
    }

    /**
     * The two per-HIT overrides, which the falloff and the walks cannot say.
     *
     * `_playNoise` and `_playDrum` read `tapGains[i]` in place of `tapFalloff ** i` and
     * `tapDecays[i]` in place of the noise section's own decay. The engine's own clap is
     * the sound that needs them — three bursts at 0.16, 0.16 and 0.26, the LAST the
     * loudest and four times the length, which is two slaps and then the room. No curve
     * through those points is a falloff, so `clapEngine` states them outright. It was the
     * one preset in the catalogue whose shape the panel could not draw at all.
     *
     * An array, so a knob writes the WHOLE list: materialised from what each hit is
     * sounding at now, so moving hit 3 leaves 1 and 2 where they were rather than
     * snapping them to a default. Back to the derived values on every hit and the key
     * goes away again — the rule `taps` and the walks already follow.
     *
     * From two hits up, and before that only if a value is already on file. With ONE hit
     * `tapGains[0]` is the preset's level and `tapDecays[0]` is its decay — both already
     * pots on the panel above, reaching the same sound — so this is a duplicate rather
     * than a hidden capability. A stored array still draws, because a value that exists
     * has to be visible somewhere.
     */
    const decayDflt = state.voice.kind === 'drum'
      ? (state.voice.noise?.decay ?? 0.12)
      : (state.voice.noise?.decay ?? 0.09);
    for (const ov of [
      { key: 'tapGains', label: 'LEVEL', on: tapKeys.gains, min: 0, max: 2, step: 0.005,
        fmt: fixed(3), dflt: (i) => (state.voice.tapFalloff ?? 1) ** i,
        tip: 'This hit\'s own level, in place of the falloff' },
      { key: 'tapDecays', label: 'DECAY', on: tapKeys.decays,
        min: 0.005, max: 0.6, step: 0.001, fmt: secs, dflt: () => decayDflt,
        tip: 'This hit\'s own length, in place of the section decay' },
    ]) {
      const stored = state.voice[ov.key];
      if (!ov.on || (taps.length < 2 && !Array.isArray(stored))) continue;
      const near = (a, b) => Math.abs(a - b) < 1e-6;
      const pots = [];
      for (let i = 0; i < taps.length; i++) {
        const w = knob({
          min: ov.min, max: ov.max, step: ov.step, fmt: ov.fmt, reset: ov.dflt(i),
          value: state.voice[ov.key]?.[i] ?? ov.dflt(i),
          onInput: (x) => {
            const list = Array.from({ length: taps.length },
              (_, j) => state.voice[ov.key]?.[j] ?? ov.dflt(j));
            list[i] = x;
            if (list.every((y, j) => near(y, ov.dflt(j)))) delete state.voice[ov.key];
            else state.voice[ov.key] = list.map((y) => Number(y.toFixed(4)));
            touched();
          },
        });
        w.label.textContent = `${ov.label} ${i + 1}`;
        w.wrap.title = ov.tip;
        grid.append(w.wrap);
        pots.push([i, w.set]);
      }
      // Only while the preset is still deriving them from the falloff. Once it lists its
      // own levels, the falloff is not what those hits are playing at any more, and
      // dragging it must not quietly rewrite them.
      if (ov.key === 'tapGains') {
        syncLevels = () => {
          if (!state.voice.tapGains) pots.forEach(([i, set]) => set(ov.dflt(i)));
        };
      }
    }
    return grid;
  };

  /**
   * One card: a title bar with whatever switches it has, and a grid of its rows.
   *
   * `guards` and `repaint` are which surface is asking. The full window hands in its own
   * guard set and its own repaint, so a switch or a solo thrown on one card redraws both
   * panels rather than only the one under the pointer.
   *
   * `dimOff` is the one place the two surfaces genuinely differ. On the strip an
   * off section collapses to its title bar, because the panel is a scroll and the
   * space is worth reclaiming. In a fixed grid cell that leaves an empty box, so the
   * window greys the body instead and keeps it in place — the same rule it follows for
   * a greyed ROW, and for the same reason: nothing moves under the pointer.
   *
   * ---- and the cards that fold instead ---------------------------------------
   *
   * The three sections whose DEPTH pot is their switch — PWM, the LFO, Humanise — have
   * no On/Off to collapse them any more, and left alone they cost the strip nine rows of
   * controls doing nothing on every preset that never uses them. That is a real price on
   * a panel whose whole problem is that it scrolls.
   *
   * So they FOLD, on the strip only, by the same test the engine uses: `group.fold(voice)`
   * is true when the section is doing nothing at all. A folded card keeps its title bar
   * and the rows named in `group.foldKeep` — which must include the control that brings
   * it back, or there is no way to turn an LFO on. Wind DEPTH up and the card grows.
   *
   * The window does not fold; it greys, like everything else in a grid that must not
   * lurch.
   */
  // `renderPick` lets a surface dress a CHOICE differently without changing what a choice
  // is. The window draws them as a line of words where the strip draws a box of pills —
  // same options, same order, same write path, forty fewer pixels a card. Pots are not
  // negotiable in the same way: one knob, one feel, everywhere.
  const groupCard = (group, {
    guards = rowGuards, repaint = build, dimOff = false, onRow = null, renderPick = null,
  } = {}) => {
    const card = document.createElement('div');
    card.className = 'device vegroup';
    const bar = document.createElement('div'); bar.className = 'devbar';
    const h = document.createElement('h4'); h.textContent = group.title;
    bar.append(h);

    // S, beside the On/Off — the desk's own solo gesture one level down, and the same
    // contract: monitoring, never written to the preset, gone when the panel closes.
    // It does NOT mark the preset dirty, because it has not changed the sound: it has
    // changed what you are listening to.
    if (group.solo) {
      const lit = soloed.has(group.solo);
      const s = document.createElement('button');
      s.className = `devlink vesolo${lit ? ' on' : ''}`;
      s.textContent = 'S';
      s.title = lit ? 'Stop soloing this layer'
        : soloed.size ? 'Add this layer to what you are hearing'
          : 'Hear this layer on its own — monitoring, never saved';
      s.onclick = () => {
        if (lit) soloed.delete(group.solo); else soloed.add(group.solo);
        setLayerSolo(state?.voice?.id ?? null, group.solo, !lit);
        repaint();
      };
      bar.append(s);
    }

    // An optional group — the noise body — is switched on and off rather than always
    // present: a preset with `body: { gain: 0 }` still builds an oscillator per hit,
    // and "no body" is a different sound from "a body at zero".
    if (group.optional) {
      const on = sectionOn(state.voice, group.optional);
      const sw = document.createElement('button');
      sw.className = `devlink veswitch${on ? ' on' : ''}`;
      sw.textContent = on ? 'On' : 'Off';
      // A held section says so on the way back in. Off is a bypass once you have used
      // it, and a switch that looks identical either way gives you no reason to believe
      // that — which is exactly when you leave it on and mute the pots by hand instead.
      const held = !on && holdOn(state.voice, group.optional) !== undefined;
      sw.title = on ? group.onTip : held ? 'Put it back as you left it' : group.offTip;
      sw.onclick = () => {
        if (on) dropSection(state.voice, group.optional);
        else addSection(state.voice, group.optional);
        touched();
        repaint();
      };
      bar.append(sw);
      card.append(bar);
      if (!on && !dimOff) return card;
      if (!on) card.classList.add('sfoff');
    } else card.append(bar);

    if (group.taps) { card.append(tapsGroup()); return card; }
    // Folding, on the strip only. Every row is DRAWN; the ones that are not `foldKeep`
    // carry a hide-guard, so the card closes and opens as the value crosses zero without
    // anything being rebuilt. `foldKeep` rows come first in the row order deliberately —
    // the pot you are dragging must not move when the rows below it appear.
    const rows = group.rows;
    const folding = !dimOff && group.fold ? group.fold : null;
    const grid = document.createElement('div'); grid.className = 'devgrid';
    // A group with a single pick in it gives that pick the whole width; a group with a
    // pair sits them side by side. Decided per GROUP rather than per row so a lone
    // WAVE never ends up half a card wide with nothing beside it. Trio members are
    // excluded — they claim a full row together regardless of what else is in the
    // group — see `trioRow`.
    const picks = rows.filter((r) => r.kind === 'pick' && !r.trio).length;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.kind === 'pick' && row.trio) {
        const batch = [row];
        while (rows[i + 1]?.trio === row.trio) batch.push(rows[++i]);
        grid.append(trioRow(batch, guards));
        continue;
      }
      const handle = row.kind === 'pick'
        ? (renderPick ? { wrap: renderPick(row), row } : pickRow({ ...row, wide: picks < 2 }, guards))
        : numRow(row, guards);
      const { wrap } = handle;
      // Hand the row back to whoever asked for the card. The full window wants the pot's
      // `set` so a second grip on the same control — an envelope handle dragging DECAY —
      // can move the needle as it goes. Display-only, so there is no loop.
      onRow?.(handle);
      if (folding && !group.foldKeep.includes(row.path)) {
        guards.push(wrap, (v) => !folding(v), true);
      }
      grid.append(wrap);
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
  /** Always false: opening from a lane now auto-copies into the song. */
  const canCopyToSong = () => false;

  function paintFoot() {
    if (!foot) return;
    // Only the library is a save target now. Opening from a lane auto-copies into
    // the song, so the voice is always song-local by the time the panel appears.
    // A library entry can still be renamed/refiled even when the sound is unchanged.
    const library = isLibraryPreset(state.voice);
    const libraryUpdate = !!state.libraryUpdate;
    const libraryDraft = !!state.librarySource;
    const devLibrary = isDevUser() && library && !libraryDraft;
    const canRefile = !state.isNew && !state.voice?.songLocal && (!library || libraryUpdate);
    const dev = isDevUser();
    foot.revertBtn.disabled = dev ? !state.dirty : false;
    if (foot.saveBtn) {
      foot.saveBtn.disabled = !state.dirty && !state.isNew && !canRefile && library && !libraryUpdate;
      foot.saveBtn.textContent = devLibrary
        ? 'Save'
        : libraryDraft || library ? 'Save as New' : 'Save';
      foot.saveBtn.title = devLibrary
        ? 'Save this library preset — choose Update or Save as New'
        : libraryDraft || (library && !libraryUpdate)
        ? 'Save a copy as an editable user preset; the read-only library preset stays unchanged'
        : state.voice?.songLocal
          ? 'Save this song-local copy — choose Save as New or Update'
        : !state.dirty && canRefile
          ? 'Rename this preset or file it under another category — the sound is unchanged'
          : 'Write this into the user preset collection';
    }
    if (foot.saveNewBtn) foot.saveNewBtn.disabled = false;
    if (foot.updateBtn) foot.updateBtn.disabled = false;
  }

  /** Keep the library editor present when there is no active preset to show. */
  function blank() {
    clearTimeout(estimateTimer);
    estimateSeq++;
    onBlank();
    state = { blank: true, id: null, voice: null, laneKey: null, librarySource: null };
    foot = null;
    el.classList.add('show');
    build({ keepScroll: false });
  }

  /**
   * Draw the panel.
   *
   * `keepScroll` is the reader's place in the rack, and it is kept by default. A rebuild
   * replaces `.verack` — the one element that scrolls — and a fresh element starts at the
   * top, so switching a section On threw the panel back to its header, away from the very
   * controls the switch had just revealed. The offset belongs to the person reading the
   * panel, not to the element drawing it, so it is carried across.
   *
   * It is dropped only where the panel stops being the same panel: a new preset, or a new
   * synth class, where every card below the head is a different card and an inherited
   * offset would land you somewhere arbitrary.
   */
  function build({ keepScroll = true } = {}) {
    const wasAt = keepScroll ? el.querySelector('.verack')?.scrollTop || 0 : 0;
    el.textContent = '';
    foot = null;
    if (state?.blank) {
      const head = document.createElement('div'); head.className = 'vehead';
      const title = document.createElement('h3');
      title.className = 'vetitle'; title.textContent = 'No preset selected';
      title.title = 'Choose a preset from the library to edit it';
      const tag = document.createElement('div');
      tag.className = 'vetag'; tag.textContent = 'Library';
      const shut = document.createElement('button');
      const folds = el.classList.contains('vedocked');
      shut.className = folds ? 'veclose vefold' : 'veclose popclose';
      if (folds) shut.append(foldIcon('left')); else shut.textContent = '✕';
      shut.title = folds ? 'Hide the editor — the rail brings it back' : 'Close the editor';
      shut.onclick = () => closePanel();
      head.append(title, tag, shut);
      const empty = document.createElement('div');
      empty.className = 'veblank';
      empty.textContent = 'Choose a preset from the library to edit it.';
      el.append(head, empty);
      return;
    }
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
    const libraryOwner = !!state.librarySource || !!state.libraryNew
      || isLibraryPreset(v) || v.songOrigin === 'library';
    tag.textContent = `${v.category || ''}${v.category ? ' ' : ''}`
      + `(${libraryOwner ? 'Library' : 'User'})`;
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
        applyDefaults(v, syn.value);
        touched();
        // Every card below the head is a different card now, so the old offset means
        // nothing — back to the top with it.
        build({ keepScroll: false });
      };
      sub.append(synLabel('SYNTH'), syn);
      // The way into the full window, on the SYNTH row rather than in the header.
      //
      // The header is `display: block` with two centred lines and an absolutely
      // positioned ✕ in its one free corner — and beside a strip both lines are
      // `visibility: hidden` under the shared `.voicepairhead`, so anything put there is
      // either invisible or fighting the close button. `.vesub` is a real flex row, it
      // renders for every `kind: 'tone'` preset, and it is hidden in none of the three
      // homes. It is also already the row that says what builds this sound.
      if (createFull && fullLayout({ synth: v.synth })) {
        const open = document.createElement('button');
        open.className = 'devlink veopen';
        open.textContent = 'EDIT';
        open.title = `Open the full-window ${v.synth} editor — every control on one screen`;
        open.onclick = () => openFull();
        sub.append(open);
      }
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
    shut.onclick = () => closePanel();
    head.append(shut);
    el.append(head);
    // Only when it holds a control. An empty `.vesub` still costs its own margin, and
    // the whole point of dropping the badge was the vertical space it was spending.
    if (sub.childElementCount) el.append(sub);

    // ---- the parameters
    const rack = document.createElement('div'); rack.className = 'verack';
    // "Note" is the wrong word for a card that no longer says anything about one. A
    // one-shot is left with TRIM, which is a level — so the heading says LEVEL, and the
    // panel stops implying there is a note length and a tuning somewhere further down.
    const common = { title: isOneShot(v) ? 'Level' : 'Note', rows: commonRows(v) };
    const groups = v.kind === 'noise' ? NOISE_GROUPS
      : v.kind === 'drum' ? DRUM_GROUPS
        : (SYNTH_GROUPS[v.synth] || []);
    // Guards belong to the panel being built, not to the one before it. The strip's set
    // only — the full window clears its own when it re-renders.
    rowGuards.clear();
    // A group-level `when` folds a card away entirely — title bar included. The layer
    // panel is the reason: a switched-off Osc 2 must take its Filter/Pitch/FM sub-cards
    // with it, or the rack shows three orphaned title bars for a layer that is not
    // there. Per-ROW `when` greys; per-GROUP `when` removes, and `build` reruns on
    // every section toggle so the cards come back the moment the layer does.
    for (const g of [common, ...groups]) {
      if (g.when && !g.when(v)) continue;
      rack.append(groupCard(g));
    }
    syncRows();
    el.append(rack);

    // ---- the foot
    const bar = document.createElement('div'); bar.className = 'vefoot';

    const restore = ({ closeAfter = false } = {}) => {
      // The nine runtime properties are carried across for us — see
      // `replaceVoiceContents`, which is this block, named, so A/B can use it too.
      replaceVoiceContents(state.voice, state.baseline);
      // Back to the level it opened at too. The baselines are what the ratios have
      // been measuring against all along, so this is exactly where it started.
      state.voice.level = state.levelBaseline;
      state.voice.peak = state.peakBaseline;
      // The holds come and go with it, at no cost: `bypassed` is part of the preset, so
      // the baseline either had it or did not, and Put Back is already the whole answer.
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
      const restoreId = state.id;
      const wasNew = state.isNew;
      refresh(restoreId);
      if (closeAfter && wasNew) {
        // A USER library edit is a temporary draft. Cancelling it must not leave that
        // draft in the live catalogue for the next library click to find.
        delete VOICES[restoreId];
        refresh(restoreId);
      }
      onChanged();
      if (closeAfter) {
        if (state.laneKey) closePanel();
        else blank();
      } else {
        build();
        toast(`${state.voice.label} put back`);
      }
    };

    const revert = document.createElement('button');
    revert.className = 'devlink';
    const userLibraryCancel = !isDevUser() && !state.laneKey;
    revert.textContent = userLibraryCancel ? 'Cancel' : 'Revert';
    revert.title = userLibraryCancel
      ? 'Cancel this edit without saving it'
      : 'Put the sound back the way it was when this opened';
    revert.onclick = () => restore({ closeAfter: userLibraryCancel });

    const del = document.createElement('button');
    del.className = 'devlink vedanger';
    del.textContent = 'Delete';
    del.title = isLibraryPreset(v)
      ? 'Delete this library preset permanently'
      : state.isNew
        ? 'Delete this unsaved user preset'
        : 'Delete this user preset permanently';
    del.onclick = () => remove();

    const save = document.createElement('button');
    save.className = 'vesave'; save.textContent = 'Save';
    save.title = 'Where this sound goes: into the song as its own copy, or into'
      + ' the editable USER_* preset tables';

    const saveNew = document.createElement('button');
    saveNew.className = 'devlink venew';
    saveNew.textContent = 'Save as New';
    saveNew.title = 'Save a copy as a new editable user preset';
    saveNew.onclick = () => openSaveSheet('new');

    const update = document.createElement('button');
    update.className = 'vesave';
    update.textContent = 'Update';
    update.title = 'Save changes to this editable user preset';
    update.onclick = () => openSaveSheet('update');

    save.onclick = () => openSaveSheet();

    bar.append(revert);
    // Filing a preset needs a server to file it in, and the deployed desk has none: the
    // POST comes back as somebody's 404 page, which is a perfectly successful fetch
    // carrying an error, and the raw HTML used to land in a toast. Revert alone, then —
    // which is the whole footer that still means anything there. Editing is untouched: a
    // preset opened from a strip is copied into the song, and the song's own Save keeps
    // it. Companion to the `if (STATIC)` block in mixer-entry.js, which hides the rest of
    // the server-backed controls; this one lives here because the buttons are built here.
    const filing = canFile();
    // A regular user's library copy is temporary editor state, not a user preset, so
    // it has no Delete action. Devs may delete library presets; both roles may delete
    // saved user presets. Song-local copies belong to their channel strip instead.
    const canDelete = !state.laneKey && !state.librarySource
      && (isUserPreset(v) || (isDevUser() && isLibraryPreset(v)));
    // Deleting posts as well, so it goes the same way as the saves do.
    if (filing && canDelete) bar.append(del);
    const userLibraryEditor = !isDevUser() && !state.laneKey;
    const showUpdate = filing && userLibraryEditor && !state.isNew && isUserPreset(v)
      && !state.librarySource;
    if (filing && userLibraryEditor) {
      // USER library drafts can only be filed as a new user preset. Saved user
      // presets expose both choices: fork it, or update it in place.
      bar.append(saveNew);
      if (showUpdate) bar.append(update);
    } else if (filing) {
      // DEV keeps the compact Revert / Save workflow; its save sheet offers Update
      // and Save as New where both are meaningful.
      bar.append(save);
    }
    el.append(bar);
    foot = {
      saveBtn: filing && !userLibraryEditor ? save : null,
      saveNewBtn: filing && userLibraryEditor ? saveNew : null,
      updateBtn: showUpdate ? update : null,
      revertBtn: revert,
    };
    paintFoot();

    // Last, not at the append: the rack takes its height from what is left over after
    // the head and the foot, so putting it back before the foot is in would measure the
    // scroll against a taller box and clamp the offset short. A rebuild that dropped
    // rows — a section switched Off — clamps here on its own, which is right: there is
    // no longer that far to scroll.
    if (wasAt) rack.scrollTop = wasAt;
  }

  /**
   * Put a preset onto a class's own defaults, having just been switched to it.
   *
   * Both halves of the schema, which is the change: a Tone class reads an `options` bag and
   * the native ones read `$`-prefixed keys off the ENTRY, and this used to seed only the
   * first. That was survivable while GameSynth was the only native class — `_playGame` has
   * a `??` fallback for everything, so a preset with none of its keys written still made a
   * noise — but an additive stack with no `bars` is not a synth with defaults, it is a
   * synth that makes no sound at all, and "I picked it from the dropdown and got silence"
   * is not a thing anybody should have to debug.
   *
   * Optional sections are skipped: they are switched on deliberately, and seeding their
   * rows would write the section into the preset and leave every switch showing On.
   *
   * So are `seedless` ones, for the other half of the same reason. PWM, the LFO and
   * Humanise have no switch — their DEPTH pot at zero IS off, and the engine builds
   * nothing there — so seeding them would write `{ depth: 0 }` into every preset that
   * will never use them: keys that do nothing, in a source file people read. An absent
   * block and a zeroed one are the same sound, and the absent one is the one worth
   * writing.
   */
  function applyDefaults(voice, synth) {
    // The options of one class mean nothing to another, and neither do its `$` sections —
    // an additive preset's drawbars are not something a MonoSynth has any use for. Both
    // are cleared, so switching class cannot leave keys in the file doing nothing forever.
    voice.options = {};
    for (const key of SYNTH_SECTIONS) delete voice[key];
    for (const g of SYNTH_GROUPS[synth] || []) {
      if (g.optional || g.seedless || g.taps) continue;
      for (const row of g.rows || []) {
        // `derived` shares a property with another row and must not write it twice;
        // `when` rows do not apply to a preset in its default state, and writing them
        // anyway puts `count`/`spread` into every preset that will never be fat.
        if (row.derived || row.when) continue;
        // `def` is in the POT's units, not the preset's — SUSTAIN reads 0-100 % over a
        // stored 0-1, and a row with a `write` is exactly the row where those differ.
        // Seeding the raw default put `sustain: 50` into the options bag, and Tone's
        // assertRange threw the moment the rack built a Synth from it. The pot's own
        // conversion is the one that belongs here, called the way each kind calls it:
        // numbers take (value, voice), pickers take (voice, option).
        setAt(voice, row.path, row.write
          ? (row.kind === 'pick' ? row.write(voice, row.def) : row.write(row.def, voice))
          : row.def);
      }
    }
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
  async function openSaveSheet(action = 'choose') {
    const v = state.voice;
    const nameClash = (wanted) => {
      const clash = VOICES[wanted];
      // Updating a preset under its current name is not a collision, even if the
      // catalogue object was rebuilt and is no longer the same object by reference.
      return clash && wanted !== state.id && clash !== state.voice;
    };
    // Remove any existing save sheet from the body (not from el — the sheet is
    // a fixed overlay now, not a child of the editor panel).
    document.querySelector('.vesheet-backdrop')?.remove();
    const backdrop = document.createElement('div');
    backdrop.className = 'vesheet-backdrop';
    // Pointer-down, not click: a drag to select text in the name field can end
    // with mouseup on the backdrop, which would make a click listener see the
    // backdrop as target and dismiss the sheet mid-edit.
    backdrop.addEventListener('pointerdown', (ev) => { if (ev.target === backdrop) backdrop.remove(); });
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
    // this level. So the number itself is not the point — what it DOES to the gain is,
    // and a level near zero is not a quiet preset, it is one the engine multiplies by
    // hundreds, bringing whatever noise floor it has up with it.
    //
    // The ENERGY of one note, not its peak: see the note over `voiceGain`. It reads
    // an order of magnitude smaller than the peak this used to show, which is why the
    // reading carries more decimals than a peak needed.
    const p = Number(v.level);
    const lvl = document.createElement('div');
    lvl.className = 'velevel';
    const reading = document.createElement('span');
    reading.className = 'velevelnum';
    reading.textContent = state.measured ? p.toFixed(5) : `≈ ${p.toFixed(5)}`;
    const says = document.createElement('span');
    says.className = 'velevelsays';
    if (state.silent || !(p > 0)) {
      lvl.classList.add('bad');
      says.textContent = 'Renders to nothing — saving will be refused';
      reading.textContent = 'Silent';
    } else if (p < 0.0004) {
      lvl.classList.add('bad');
      // The multiplier, because "0.00002" means nothing and "×530" means everything.
      says.textContent = `Very quiet — it gets scaled up about ${Math.round(0.0129 / p)}×.`
        + ' Check the envelope.';
    } else {
      says.textContent = state.measured ? 'Measured' : 'Estimated — measured properly on save';
    }
    lvl.append(reading, says);
    field('Level', lvl);

    // ---- what saving over it would reach.
    //
    // Save as new is always available except on a brand-new unsaved preset —
    // there's nothing to fork FROM. A song-local copy can be forked into the
    // library just as well as a library preset can.
    const offerFork = !state.isNew;
    // Regular users can only fork library presets; a dev user may also update one.
    const isLibrary = isLibraryPreset(v);
    const canUpdateLibrary = !!state.libraryUpdate;
    // A song-local copy normally belongs only to the current song. If it was made from
    // a USER preset, however, Update is allowed to write back to that source preset;
    // a copy of a Library preset can only be saved as new.
    const songUserSource = !!(v.songLocal && v.songOrigin === 'user' && v.songSourceId
      && isUserPreset(VOICES[v.songSourceId]));
    const canUpdate = !state.isNew && (v.songLocal
      ? songUserSource
      : !isLibrary || canUpdateLibrary);
    const libraryDraft = state.isNew && !!state.librarySource;
    const canSubmit = libraryDraft || state.isNew || canUpdate;
    // The DEV Save button opens the chooser. USER gets separate footer buttons, so
    // each one opens only the action it names. A library draft is already the new
    // object being filed, while a saved user preset needs forkToNew for a copy.
    const showAsNew = offerFork && action !== 'update' && !(action === 'new' && state.isNew);
    const showCommit = canSubmit && (action !== 'new' || state.isNew);

    const bar = document.createElement('div'); bar.className = 'vesheetfoot';
    const cancel = document.createElement('button');
    cancel.className = 'devlink'; cancel.textContent = 'Cancel';
    cancel.onclick = () => backdrop.remove();

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
     * A SECOND preset, leaving this one as it is.
     */
    const asNew = document.createElement('button');
    asNew.className = 'devlink venew';
    asNew.textContent = 'Save as New';
    asNew.title = isLibrary && canUpdateLibrary
      ? 'Save a copy as a new library preset; the current preset stays unchanged'
      : 'Save a copy as an editable user preset; the current preset stays unchanged';
    asNew.onclick = () => {
      if (!takeFields()) return;
      const wanted = rawId(nameBox.value.trim());
      if (nameClash(wanted)) {
        nameBox.focus();
        nameBox.select();
        nameBox.style.borderColor = 'var(--solo)';
        if (!sheet.querySelector('.venamewarn')) {
          const w = document.createElement('div');
          w.className = 'venamewarn';
          w.textContent = 'Please choose a unique name';
          w.style.cssText = 'font-size:9px;color:var(--solo);margin-top:2px;';
          nameBox.after(w);
        }
        return;
      }
      backdrop.remove();
      forkToNew();
    };

    const go = document.createElement('button');
    go.className = 'vesave';
    go.textContent = libraryDraft ? 'Save as New' : state.isNew ? 'Save'
      : 'Update';
    go.title = libraryDraft
      ? 'Save this edited library copy as an editable user preset'
      : state.isNew
      ? 'Write this into the user preset collection'
      : isLibrary && canUpdateLibrary
        ? 'Write this change back to the library preset'
      : isLibrary
        ? 'Write this change back to the built-in library preset'
      : songUserSource
        ? 'Write this change back to the user preset this song copy came from'
      : 'Change this editable user preset in place';
    const send = async () => {
      if (!takeFields()) return;
      const wanted = rawId(nameBox.value.trim());
      if (nameClash(wanted)) {
        nameBox.focus();
        nameBox.select();
        nameBox.style.borderColor = 'var(--solo)';
        if (!sheet.querySelector('.venamewarn')) {
          const w = document.createElement('div');
          w.className = 'venamewarn';
          w.textContent = 'Please choose a unique name';
          w.style.cssText = 'font-size:9px;color:var(--solo);margin-top:2px;';
          nameBox.after(w);
        }
        return;
      }
      backdrop.remove();
      build();              // the header chip carries the category it was just given
      onChanged();          // and the picker files it under the same
      commit();
    };
    go.onclick = send;
    // Enter anywhere but the description sends it; the description is the one field
    // where a newline is a reasonable thing to want.
    sheet.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Escape') { backdrop.remove(); return; }
      if (ev.key !== 'Enter' || ev.target === note) return;
      if (showAsNew && !showCommit) asNew.click();
      else if (showCommit) send();
    });
    bar.append(cancel);
    if (showAsNew) bar.append(asNew);
    if (showCommit) bar.append(go);
    sheet.append(bar);
    backdrop.append(sheet);
    document.body.append(backdrop);
    // A new preset has a name to give it — that is the whole reason this sheet exists —
    // and an existing one is usually a confirm, so the button takes the focus and Enter
    // is the whole interaction. Library presets only offer duplication.
    if (state.isNew) { nameBox.focus(); nameBox.select(); }
    else if (showAsNew && !showCommit) asNew.focus();
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
    // Check the RAW id — idFromLabel would silently pick roundMono2.
    const base = rawId(v.label);
    if (base === fromId || (VOICES[base] && VOICES[base] !== v)) {
      toast(`"${v.label}" is already taken. Give the new preset a different name.`);
      return;
    }
    const newId = idFromLabel(v.label);  // safe: collision-free after the check
    const makeLibrary = isDevUser() && isLibraryPreset(v) && !state.librarySource;

    // The new entry: the sound as it stands, under its own key. `kind`, `level` and
    // `peak` come across because all three are derived on load and a fresh entry has
    // none of them yet — the two numbers are a guess until the save measures them,
    // exactly as they are for a copy.
    const made = {
      ...JSON.parse(JSON.stringify(asPreset(v))),
      id: newId, kind: v.kind, level: v.level, peak: v.peak,
      ...(makeLibrary ? { factory: true, draft: true } : { user: true }),
    };

    // Put the original back — in memory, where every song on this desk reads it. A
    // library click starts with a hidden draft, though, and that draft has no original
    // catalogue entry to restore; remove it instead so Save as New cannot leave a
    // second `Round Mono copy` behind.
    const { id, kind, songLocal, starter, factory, user, draft } = v;
    if (draft) {
      delete VOICES[fromId];
    } else {
      Object.keys(v).forEach((k) => delete v[k]);
      Object.assign(v, JSON.parse(JSON.stringify(state.baseline)), { id, kind });
      // Held across for the same reason Revert holds them — see the note there.
      if (songLocal) v.songLocal = true;
      if (starter) v.starter = true;
      if (factory) v.factory = true;
      if (user) v.user = true;
      v.level = state.levelBaseline;
      v.peak = state.peakBaseline;
    }
    onDirty(fromId, false);        // it is back to what the file holds, so nothing is owed
    if (!draft) refresh(fromId);   // and the next note it plays is the old sound again

    // Now move the panel onto the new preset and save that.
    VOICES[newId] = made;
    state.id = newId;
    state.voice = made;
    state.isNew = true;            // it has never been written, so `commit` files it fresh
    state.libraryNew = makeLibrary;
    state.libraryUpdate = makeLibrary;
    state.used = null;             // nothing plays it yet — that is the whole point
    state.baseline = asPreset(made);
    state.levelBaseline = made.level;
    state.peakBaseline = made.peak;
    // A lane that was playing the old preset stays on it — unless forking FROM a
    // strip, where the strip IS the thing being worked on and should show the new
    // name as soon as the save lands. The sound does not change: `made` is exactly
    // the parameters the strip was already playing through its song-local copy.
    if (state.laneKey && assign) assign(state.laneKey, newId);
    // Repoint before commit's onChanged rebuild. Otherwise the rebuild briefly draws
    // the lane against its restored source copy, then assign() switches it again after
    // the save completes — an audible/visual detour through the original patch.
    await commit({ keepLane: true });
    // Said after the save, naming both, because the useful fact is what did NOT happen.
    toast(`${made.label} saved as a new preset`, 3000);
    build();
    onChanged();
  }

  async function commit({ keepLane = false } = {}) {
    const v = state.voice;
    // Backstop for the footer, which does not offer a save at all without somewhere to
    // put it. Here as well as there because this is the function that leaves the page,
    // and a future caller reaching it another way should not discover the 404 the hard
    // way. See `canFile`.
    if (!canFile()) {
      toast('Presets are saved with the song here — this desk has no library to file them in.', 4000);
      return;
    }
    if (!v.label?.trim()) { toast('Give it a name first'); return; }
    // Library presets are read-only for regular users. A dev user may update one in
    // place; the server repeats this check so a stale or hand-written client cannot.
    if (isLibraryPreset(v) && !state.isNew && !state.libraryUpdate) {
      toast('Library presets cannot be overwritten. Duplicate this sound to create your own.', 4000);
      return;
    }

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
    const songUserUpdate = !state.isNew && v.songLocal && v.songOrigin === 'user'
      && v.songSourceId && isUserPreset(VOICES[v.songSourceId]);
    if ((state.isNew || v.songLocal) && !songUserUpdate) {
      // A regular copy becomes a user preset. A dev fork of a library preset stays in
      // the read-only library table, under a new name; the server enforces that role.
      const saveAsLibrary = !!state.libraryNew;
      delete VOICES[state.id];              // or it counts as taken against itself
      delete v.songLocal;                    // it is about to live in USER_*
      if (saveAsLibrary) {
        delete v.user;
        v.factory = true;
      } else {
        delete v.factory;
        v.user = true;
      }
      // Check the RAW id — not idFromLabel which would silently pick roundMono2.
      const base = rawId(v.label);
      if (VOICES[base] && VOICES[base] !== v) {
        VOICES[state.id] = v;
        v.songLocal = true;
        toast(`"${v.label}" is already taken. Please choose a unique name.`);
        return;
      }
      const wanted = idFromLabel(v.label);  // safe: collision-free after the check
      const moved = wanted !== state.id;
      state.id = wanted;
      v.id = wanted;
      // Into the catalogue BEFORE the lane is repointed at it: the desk looks the id
      // up to label the strip, and a lane pointed at a key that is not there yet is a
      // strip that cannot draw itself.
      VOICES[wanted] = v;
      // The lane it was made on is holding the old id, and nothing else is — a
      // never-saved preset has had one home since the moment it was copied.
      if (moved && !keepLane) assign(state.laneKey, wanted);
    }

    const saveId = songUserUpdate ? v.songSourceId : state.id;
    const btn = foot.saveBtn || foot.updateBtn || foot.saveNewBtn;
    btn.disabled = true;
    const was = btn.textContent;
    btn.textContent = 'Measuring…';
    try {
      const res = await fetch('/voice-save', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...((state.libraryUpdate || state.libraryNew) ? { 'x-mixer-role': 'dev' } : {}),
        },
        body: JSON.stringify({
          id: saveId,
          table: (state.libraryNew || (state.libraryUpdate && isLibraryPreset(v)))
            ? libraryTableFor(v.kind) : userTableFor(v.kind),
          library: !!state.libraryNew,
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
      // The server's numbers replace the estimates — they are the ones the game will
      // use, and any drift the ratios accumulated ends here.
      v.level = out.level;
      v.peak = out.peak;
      if (songUserUpdate && VOICES[saveId]) {
        // The lane keeps its song-local copy, but Update also refreshes the USER
        // preset that copy came from so the next song can use the edited version.
        const source = VOICES[saveId];
        const saved = JSON.parse(JSON.stringify(asPreset(v)));
        Object.keys(source).forEach((k) => delete source[k]);
        Object.assign(source, saved, {
          id: saveId, kind: v.kind, user: true, level: v.level, peak: v.peak,
        });
        refresh(saveId);
      }
      delete v.draft;
      state.measured = true;
      state.estimated = false;
      state.dirty = false;
      state.isNew = false;
      state.libraryNew = false;
      state.librarySource = null;
      state.libraryUpdate = isDevUser() && isLibraryPreset(v);
      onDirty(state.id, false);           // it is on disk now, so nothing is owed
      state.baseline = asPreset(v);
      // And this sound becomes what the next estimate is measured against, so edits
      // after a save scale from the numbers that were just written rather than from
      // the ones this panel opened on.
      await rebase();
      onChanged();
      // A level this low is not a quiet preset — the gain is DERIVED from it, so the
      // engine is about to multiply this sound by fifty or more, and anything in it
      // that was inaudible comes up with the rest.
      toast(out.quiet
        ? `${v.label} saved, but it measured at level ${out.level} — so it will be`
          + ' scaled up hugely to reach the lane. Check its envelope.'
        : `${v.label} saved to src/data/voices.js — measured at level ${out.level}`,
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
    // Same backstop as `commit`: deleting reaches /voice-delete, and there is no server
    // to answer it on the deployed desk. The footer already withholds the button.
    if (!canFile()) return;
    const library = isLibraryPreset(v) && !state.librarySource;
    const devLibrary = isDevUser() && library;
    if (state.isNew && !devLibrary) {
      // Never written, so there is nothing on disk to delete — discard it directly.
      // This includes the temporary editable copy made from a read-only library sound.
      const id = state.id;
      const libraryWindow = !state.laneKey;
      delete VOICES[state.id];
      refresh(id);
      if (libraryWindow) { blank(); onChanged(); }
      else { closePanel(); onChanged(); }
      toast(`${v.label} discarded`);
      return;
    }
    if (!isUserPreset(v) && !devLibrary) {
      toast('Only user presets can be deleted.');
      return;
    }
    if (!ask) { toast('Delete confirmation is unavailable.'); return; }
    const ok = await ask(
      `Delete ${library ? 'library' : 'user'} preset "${v.label}"?`,
      '<b>This cannot be undone.</b>',
      'Delete',
    );
    if (!ok) return;
    if (state.isNew) {
      const id = state.id;
      delete VOICES[id];
      refresh(id);
      blank();
      onChanged();
      toast(`${v.label} discarded`);
      return;
    }
    const send = (force) => fetch('/voice-delete', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(devLibrary ? { 'x-mixer-role': 'dev' } : {}),
      },
      body: JSON.stringify({ id: state.id, force }),
    });
    let res = await send(false);
    if (res.status === 409) {
      const { used } = await res.json();
      const songs = used.map((song) => `<b>${escapeHtml(song)}</b>`).join('<br>');
      const okUsed = await ask(
        `Delete ${library ? 'library' : 'user'} preset "${v.label}"?`,
        `${used.length} song${used.length === 1 ? '' : 's'} play this preset:<br><br>${songs}`
          + '<br><br>Deleting it does not break them — each one quietly goes back to the '
          + 'engine\'s own voice for that lane.<br><br><b>This cannot be undone.</b>',
        'Delete',
      );
      if (!okUsed) return;
      res = await send(true);
    }
    if (!res.ok) { toast(`Could not delete: ${await res.text()}`); return; }
    const id = state.id;
    const libraryWindow = !state.laneKey;
    delete VOICES[id];
    refresh(id);
    if (libraryWindow) { blank(); onChanged(); }
    else { closePanel(); onChanged(); }
    toast(`${v.label} removed from ${library ? 'library' : 'user presets'}`);
  }

  // ---- opening -------------------------------------------------------------

  /**
   * Edit an existing preset, or start a new one from it.
   *
   * A new preset begins as a COPY rather than as an empty MonoSynth: sound design
   * from a blank envelope is a long way from anything usable, and the sound you were
   * just listening to is the best guess anyone can make about the one you want.
   */
  function open(voiceId, {
    isNew = false, laneKey = null, laneLabel = null, allowLibraryUpdate = false,
  } = {}) {
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

    // Every shipped library sound opens only as a COPY. The source tables are the
    // reference library and are intentionally immutable; user presets are the only
    // entries that can be edited in place.
    const libraryUpdate = !!allowLibraryUpdate && isDevUser() && isLibraryPreset(from) && !isNew;
    if (isLibraryPreset(from) && !isNew && !libraryUpdate) {
      toast(`${from.label} is a library sound — duplicate it to make an editable user preset.`, 5200);
      return null;
    }

    let id = voiceId;
    let voice = from;
    if (!laneKey) {
      // Library copies are editor drafts, not presets. They must not accumulate in
      // the catalogue when the user clicks through several library rows.
      for (const [draftId, draftVoice] of Object.entries(VOICES)) {
        if (draftVoice?.draft) delete VOICES[draftId];
      }
    }
    if (isNew) {
      const label = `${from.label} copy`;
      id = idFromLabel(label);
      voice = {
        ...JSON.parse(JSON.stringify(asPreset(from))),
        label, id, kind: from.kind, user: true, draft: true,
        level: from.level, peak: from.peak,
      };
      // Into the live catalogue at once, so the editor/bench can play it before it has
      // ever been saved. The `draft` marker keeps it out of the preset library.
      VOICES[id] = voice;
    }

    // A solo belongs to the preset you were listening to. Opening another one takes it
    // with it, or the new stack plays with a layer missing and nothing on screen says so.
    dropSolo();

    state = {
      id, voice, laneKey, laneLabel, isNew,
      libraryUpdate,
      libraryNew: false,
      librarySource: isNew && !laneKey ? voiceId : null,
      baseline: asPreset(voice),
      dirty: false,
      // A brand-new preset carries the peak of the one it was copied from, which is a
      // fair guess and is not a measurement. Say so rather than show a number.
      measured: !isNew,
      estimated: false,
      silent: false,
      used: null,
      // What the live level is worked out from — see `runEstimate`. Both are of the
      // sound as it is RIGHT NOW, before anything has been touched, which is the only
      // moment the peak on file and the sound in the room are known to agree.
      levelBaseline: voice.level,
      peakBaseline: voice.peak,
      rawBaseline: null,
    };
    // A different preset opens at its top, not where the last one happened to be left.
    build({ keepScroll: false });
    el.classList.add('show');
    // If the full window is up, re-aim it at whatever this is now — a lane follow or a
    // library click lands here, and it may be a different preset or a different synth
    // class entirely. It re-renders on a preset that still has a full layout, and closes
    // on one that does not: an editor left pointing at a sound nothing is playing is
    // worse than no editor.
    full?.onVoiceChanged();

    // The reference measurement, taken once. Until it lands there is no ratio to
    // scale by, so `runEstimate` leaves the level alone rather than guessing — which
    // is why it is fired here rather than lazily on the first edit.
    measureRaw(id, noiseBuf(), sampleRate())
      .then((raw) => { if (state?.id === id && raw.level > 0) state.rawBaseline = raw; })
      .catch(() => { /* no ratio; the level simply stays put until a save measures it */ });

    return id;
  }

  /**
   * Drop the editor's hold on a preset, leaving whatever is on it in place.
   *
   * State goes first, so the window's `onFullClosed` finds nothing to repaint: the strip
   * is being taken down, and rebuilding it on the way out would be a panel drawn for
   * one frame and then removed.
   */
  function forget() { state = null; foot = null; full?.close(); }

  // ---- the full window -------------------------------------------------------

  /**
   * WHAT THE FULL-WINDOW EDITOR IS HANDED.
   *
   * `tools/mixer-synth-full.js` is a LAYOUT and not a second copy of this panel, in the
   * same way this panel is a panel and not a second copy of the desk — see the note over
   * `createVoiceEditor`, which takes `knob` and `ask` and `toast` handed in for exactly
   * this reason.
   *
   * The rule that makes two surfaces safe: the kit is the only handle the other file has
   * on a preset. It never imports VOICES, never calls `setAt`, and never sees `state`. So
   * there is one `state.voice`, one `touched()`, and nothing to keep in step — a repaint
   * redraws both from the same object, because there is only the one object.
   */
  let full = null;
  const repaintBoth = () => { build(); full?.render(); };
  const kit = {
    // ---- reading -------------------------------------------------------------
    voice: () => state?.voice ?? null,
    id: () => state?.id ?? null,
    label: () => state?.voice?.label || state?.id || '',
    get: (path) => (state ? getAt(state.voice, path) : undefined),
    /** A row's value in the POT's units, which is not always the stored one. */
    read: (row) => {
      const raw = getAt(state.voice, row.path);
      return row.read ? row.read(raw, state.voice) : raw;
    },
    layout: (opts) => (state ? fullLayout(state.voice, opts) : null),
    sectionOn: (key) => sectionOn(state.voice, key),
    /**
     * Switch a section on or off — the same bypass-and-restore the strip's own switch
     * does, not a second implementation of it. Off stashes the subtree in
     * `voice.bypassed` so On puts it back exactly as it was; half of sound design is
     * taking a part out to hear what it was doing.
     */
    toggleSection: (key) => {
      if (sectionOn(state.voice, key)) dropSection(state.voice, key);
      else addSection(state.voice, key);
      touched();
      repaintBoth();
    },

    // ---- writing — this panel's own path, not a second one -------------------
    write: (row, x) => {
      setAt(state.voice, row.path, row.write ? row.write(x, state.voice) : x);
      touched();
      syncRows();
    },
    /** A pick's write, which takes its arguments the other way round — see `buildSeg`. */
    pickWrite: (row, option) => {
      setAt(state.voice, row.path, row.write ? row.write(state.voice, option) : option);
      touched();
      syncRows();
    },
    /**
     * Two parameters in one gesture — an envelope handle moving DECAY and SUSTAIN, a
     * response handle moving CUTOFF and RESONANCE. One `touched()` for the pair, because
     * `touched` re-banks the voice, tells the song, marks the desk dirty and schedules a
     * measurement, and doing all four twice per pointermove is a drag that stutters.
     */
    writeMany: (pairs) => {
      for (const [row, x] of pairs) {
        setAt(state.voice, row.path, row.write ? row.write(x, state.voice) : x);
      }
      touched();
      syncRows();
    },

    // ---- widgets — the SAME builders the strip draws -------------------------
    knob, numRow, pickRow, trioRow, groupCard, short: SHORT,
    guards: guardSet,
    sync: syncRows,
    repaint: repaintBoth,

    // ---- monitoring and chrome ----------------------------------------------
    soloOn: (layerKey) => soloed.has(layerKey),
    setSolo: (layerKey, on) => {
      if (on) soloed.add(layerKey); else soloed.delete(layerKey);
      setLayerSolo(state?.voice?.id ?? null, layerKey, on);
      repaintBoth();
    },
    soloText: () => (soloed.size
      ? `SOLO — ${[...soloed].map((k) => k.replace('osc', 'LAYER ')).join(', ')}` : ''),
    closeFull: () => full?.close(),
    toast,

    /**
     * The window has gone; put the strip back in agreement with the preset.
     *
     * The two surfaces share the VALUE — one `state.voice` — but not the DOM, and a pot
     * or a pill only repaints the one you touched: `numRow`'s `onInput` and `buildSeg`'s
     * `onclick` call `touched()` and `syncRows()`, not `build()`, precisely so a control
     * does not reflow under the pointer that is dragging it. So an hour in the window
     * leaves the strip drawing the sound as it was an hour ago.
     *
     * It only matters at one moment — when the strip is visible again — so that is when
     * it is done, rather than rebuilding a hidden panel on every keystroke. No-op once
     * the preset has been let go, which is the `forget()` path.
     */
    onFullClosed: () => { if (state) build(); },
  };

  /** Open the full window on a preset that has one. Built once, on the first ask. */
  function openFull(layer = 1) {
    if (!state || !createFull) return;
    full ||= createFull({ kit });
    full.open(layer);
  }

  return {
    open,
    blank,
    isOpen,
    forget,
    openFull,
    closeFull: () => full?.close(),
    get fullOpen() { return !!full?.isOpen(); },
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
    get librarySource() { return state?.librarySource || null; },
    // Which strip the panel belongs beside — the desk re-places it there on every
    // rack repaint. See placeVoiceEditor. Null when it was opened from the library,
    // which is what makes it a window instead of a rack item.
    get laneKey() { return state?.laneKey || null; },
  };
}
