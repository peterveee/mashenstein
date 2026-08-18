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
import { heavyUi } from './lib/heavy-ui.js';
// The fold mark, shared with the keyboard's, so the two put-away buttons on the
// library's workspace are provably one control rather than two that look alike.
import { foldIcon } from './mixer-voice-library.js';
// The families' display names, so the table dropdown reads 'Vowel Glass' rather than the
// stored id — the same names the catalogue states them in.
import { tngr2TableName } from '../src/engine/tngr2/families.js';
import { createUndoHistory } from './mixer-undo.js';

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
  'GameSynth', 'AdditiveSynth', 'MRDR-3', 'TNGR-2',
  'Synth', 'MonoSynth', 'FMSynth', 'AMSynth', 'DuoSynth', 'MembraneSynth', 'MetalSynth',
];

// The three the engine plays ITSELF, rather than handing to a pooled Tone class. What
// they have in common that the panel cares about: their modulators are built per note-on,
// so a key measured from the start of a note — `vibrato.delay` — means something on these
// and nothing on the others, whose LFO free-runs in the pool.
const NATIVE_SYNTHS = ['GameSynth', 'AdditiveSynth', 'MRDR-3', 'TNGR-2'];

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
export async function measureRaw(voiceId, noiseBuf, sampleRate = 44100) {
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
// A DECADE PER QUARTER TURN. An envelope time is heard as a ratio — 5ms to 10ms is the
// same step as 1s to 2s — so the travel is split by ratio and not by fraction of the
// ceiling: 1ms at the floor, 10ms at a quarter, 100ms at half, 1s at three quarters,
// ten seconds at the stop. Half the pot is now under a tenth of a second, which is
// where the sounds this desk makes actually live.
//
// A power curve was the previous answer and cannot do this. Steep enough to bring
// 100ms into reach it collapses everything below into a sliver thinner than the step —
// dead travel at exactly the end that needs the most — and shallow enough to avoid
// that it puts the milliseconds back in the first few pixels. So envelope times ask
// the shared knob for `taper: 'log'` instead of an exponent.
const ENV_TIME_TAPER = 'log';
// One millisecond, everywhere: both the smallest step and the floor the taper starts
// from. Below that is not a length anyone dials, it is a click, and the readout
// (`secs`) has no digit for it either.
const ENV_TIME_STEP = 0.001;
// The short time pots — a kick's drop, a strike — span a fraction of a second rather
// than ten, and are already dialled in milliseconds across their whole travel, so they
// keep the quadratic they had. Half a second at curve 2 puts 125ms at twelve o'clock,
// which is right for a range that never leaves the low hundreds.
const SHORT_TIME_SCALE = 2;

// Every envelope time uses the same ceiling, including native struck voices. Keeping
// the ceiling here prevents a new section from quietly growing a special-case range —
// and the STEP is here for the same reason: one millisecond on every envelope pot on
// the desk, so a decay can be nudged by a millisecond wherever it lives. The `min` is
// the only thing a caller still chooses, because it is the only thing that differs:
// zero where an OFF is meaningful, the 1ms floor where a stage of nothing is silence.
const envTime = (path, label, min, fmt, def, unit = 's', when = null, opts = {}) =>
  n(path, label, min, ENV_MAX_SECONDS, ENV_TIME_STEP, fmt, def, unit, when,
    { ...opts, taper: ENV_TIME_TAPER, floor: ENV_TIME_STEP });

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

/**
 * The drive's Tone filter is the last low-pass in the chain, so while the drive is ON it
 * is a ceiling: upstream filter controls can move above it while remaining perfectly
 * valid — and perfectly inaudible. Only a low-pass Tone is a ceiling; a hand-authored
 * high-pass/band-pass Tone has a different job and must not be rewritten by this
 * synchronisation.
 *
 * With DRIVE at zero the engine builds no tone filter at all, so there is no ceiling to
 * lift and lifting one anyway would edit a stored number that nothing reads — the panel
 * quietly rewriting a parameter it has just greyed out.
 */
const liftToneCeiling = (x, voice) => {
  if (!(x > 0) || !voice?.tone || !((voice.drive ?? 0) > 0)) return;
  if (voice.tone.type && voice.tone.type !== 'lowpass') return;
  const current = voice.tone.freq ?? CUTOFF_MAX;
  if (x > current) voice.tone.freq = Math.min(CUTOFF_MAX, x);
};

const liftMrdrToneCeiling = (x, voice) => {
  if (voice?.synth !== 'MRDR-3') return;
  liftToneCeiling(x, voice);
};

/**
 * Keep an Advanced Global Filter move above the final driven low-pass ceiling.
 *
 * The Drive/Tone filter is an independent section.  Lowering Global Filter must
 * therefore never create or lower Tone: otherwise switching Global Filter off
 * leaves a hidden low-pass at the muted cutoff and the sound cannot recover.
 * Existing Tone may be lifted for an upward Global Filter move, but is otherwise
 * left exactly as authored.
 */
const syncMrdrMasterTone = (x, voice) => {
  if (voice?.synth !== 'MRDR-3' || !((voice.drive ?? 0) > 0)) return;
  liftToneCeiling(x, voice);
};

const liftDrumTone = (x, voice) => {
  if (voice?.kind !== 'drum') return;
  liftToneCeiling(x, voice);
};

const mrdrFilterCutoff = (path, label, def, when = null) => cutoffHz(path, label, def, when, {
  after: liftMrdrToneCeiling,
});

const mrdrMasterFilterCutoff = (path, label, def) => cutoffHz(path, label, def, null, {
  after: syncMrdrMasterTone,
});

const mrdrFilterResonance = (path, freqPath, def) => resQ(path, def, null, {
  after: (_q, voice) => liftMrdrToneCeiling(getAt(voice, freqPath) ?? 1150, voice),
});

const mrdrFilterEnvAmount = (path, freqPath) => n(path, 'ENV AMOUNT', -ENV_OCT_MAX,
  ENV_OCT_MAX, 0.1, semis, 0, 'oct', null, {
    origin: 0,
    scale: ENV_OCT_SCALE,
    tip: 'How far the envelope moves the cutoff, in octaves — up or down',
    after: (x, voice) => liftMrdrToneCeiling(
      (getAt(voice, freqPath) ?? 1150) * 2 ** Math.max(0, x), voice,
    ),
  });

const drumFilterCutoff = (path, label, def) => cutoffHz(path, label, def, null, {
  after: liftDrumTone,
});

const drumFilterFrequency = (path, label, def) => oscHz(path, label, def, {
  after: liftDrumTone,
});

const drumFilterResonance = (path, freqPath, def) => resQ(path, def, null, {
  after: (_q, voice) => liftDrumTone(getAt(voice, freqPath), voice),
});

const drumRingResonance = (path, freqPath, def) => ringQ(path, def, null, {
  after: (_q, voice) => liftDrumTone(getAt(voice, freqPath), voice),
});

// RESONANCE is a Q wherever it appears — the one pot that was a FREQUENCY is now called
// RES FREQ. TWO ceilings, because there are two controls here wearing one name.
//
// A FILTER'S Q stops at 24. Every RESONANCE pot used to run to 120, which was the RING
// resonator's number: a struck body wants a Q around 110 where a filter wants 1, and the
// one range was stretched to cover both. Audited across the 358 library presets and every
// song's own `voiceParams` overrides, the highest Q on any filter in the catalogue is 16 —
// `bass303Bite`, which is the 303 squeal and the point of the control. So 24 is 1.5× the
// most anything asks for: nothing clamps, no preset moves, and a lowered maximum cannot
// quietly rewrite a stored value it can no longer represent.
//
// What it buys is the dial. Cubed against 120, Q 16 sat at 51% of the travel, so HALF the
// sweep was above anything ever used and the whole musical range was crushed into the
// bottom third — a pot you could not aim, which is what a lowpass whistling for the top
// half of its rotation means. Against 24: Q 1 at 34%, Q 8 at 69%, Q 16 at 87%.
//
// Cubic stays. The median stored Q is 1.0, so the resolution is wanted at the BOTTOM; if
// the top ever feels crushed the answer is `scale: 2`, and it is a one-character change.
const RES_Q_MAX = 24;
const RES_Q_SCALE = 3;
const resQ = (path, def, when = null, opts = {}) =>
  n(path, 'RESONANCE', 0.1, RES_Q_MAX, 0.05, fixed(2), def, '', when,
    { scale: RES_Q_SCALE, ...opts });

// THE RING resonator keeps the old range, because it is the control that always needed it.
// It is not a filter you sweep — it is the body a drum is struck on, and its Q IS the
// material: 28 is a woodblock, 40 a rim, 95 the metal tube `rimRing` is made of. Six
// presets use it and they span 28–110, so this ceiling is load-bearing rather than
// generous. Same label, same taper, same units — a different instrument.
const RING_Q_MAX = 120;
const ringQ = (path, def, when = null, opts = {}) =>
  n(path, 'RESONANCE', 0.1, RING_Q_MAX, 0.05, fixed(2), def, '', when,
    { scale: RES_Q_SCALE, ...opts });

// Vibrato depth has the same shape of problem as the drum pitch pot, one range down:
// the pot runs to a full octave because the game synth is allowed to be a siren, but
// everything that sounds like an INSTRUMENT happens under half a semitone. Cubed, that
// bottom half-semitone owns a third of the sweep — near enough the same exponent, for
// near enough the same reason. See the row itself for what the numbers work out to.
//
// One constant for all three faces of the control: Advanced's VIB DEPTH, DuoSynth's
// built-in VIBRATO, and the Quick pot. A taper is part of how a control READS, so the
// same key under the same finger has to move the same way whichever panel is open —
// Quick was the one that missed it, and a linear 0–12 put the entire library's range
// of depths (0.05–0.35 semitones) inside the first three percent of the travel.
const VIB_DEPTH_SCALE = 3;

// Humanising has the same shape of problem again, at the smallest scale on the desk:
// everything that reads as a PLAYER rather than a fault happens under a tenth.
const HUMANISE_SCALE = 3;

// Rates, depths and lengths that are not envelope TIMES but have the same crush at the
// bottom: a 5 Hz vibrato on a 60 Hz pot, a 1.2-second note on a 16-second one. Squared
// rather than cubed — these reach further up their range than an attack time does.
const SLOW_END_SCALE = 2;

// The modulators whose useful musical range lives BELOW 1 Hz on a pot that runs to eight
// or twelve — a sample-and-hold stepping under a bar, and a chorus, whose whole repertoire
// is the Juno's two speeds at 0.5 and 0.86 Hz. Cubic gives those slow settings physical
// room without changing the Hz value stored in the preset or the rate used by the engine.
//
// One constant rather than one per control, because it is one REASON. Linear, a chorus at
// its default 0.8 Hz sat at a tenth of the travel and the entire range anyone would set it
// to lived inside the first fifth — a pot you cannot aim. Cubed, 0.5 Hz is at 38%, 0.8 at
// 46% and 2 Hz at 63%, so the speeds a chorus actually has occupy the middle of the dial
// and the fast end is still there above them.
//
// Squared (`SLOW_END_SCALE`) is the neighbouring case and deliberately not this one: those
// rates reach further up their range, where these two never do.
const SLOW_LFO_RATE_SCALE = 3;

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

/**
 * The DRIVE's tone control: max is an actual bypass, not a filter at the ceiling.
 *
 * Gated on DRIVE at the helper rather than at each call site, because the gate is not a
 * layout choice — `_playLayer` and `_playDrum` build this filter only alongside the
 * shaper, so with DRIVE at zero the pot has no node to move and greying it out is the
 * only honest thing the panel can draw. A call site cannot opt out of that, so it does
 * not get the chance to. The Quick Cutoff macro is the broader control over those
 * filter sections and the Drive Tone when it is part of the signal.
 */
const drivenTone = (v) => (getAt(v, '$drive') ?? 0) > 0;
const writeTone = (x, voice) => {
  if (x >= CUTOFF_MAX) {
    // Bypass is reversible. A custom Q/type is part of the sound, so hold the whole
    // section instead of deleting it and guessing those values when the pot comes back.
    dropSection(voice, 'tone');
    return;
  }
  if (!voice.tone) addSection(voice, 'tone');
  voice.tone ||= {};
  voice.tone.type ||= 'lowpass';
  voice.tone.Q ??= 0.7;
  voice.tone.freq = x;
};
const toneRow = (path = '$tone.freq', label = 'TONE') => cutoffHz(path, label, 16000, drivenTone, {
  read: (raw, voice) => holdOn(voice, 'tone') !== undefined
    ? CUTOFF_MAX : raw ?? CUTOFF_MAX,
  write: (x, v) => {
    writeTone(x, v);
    return SKIP_WRITE;
  },
});

const WAVES = ['sine', 'square', 'sawtooth', 'triangle', 'pwm', 'pulse'];
// The four an `OscillatorNode` takes. `pwm`, `pulse` and the voicing prefixes are
// Tone's vocabulary and THROW on a native oscillator, killing the note and every note
// after it on that lane — so the native panels draw from this list and never WAVES.
const NATIVE_WAVES = ['sine', 'square', 'sawtooth', 'triangle'];
const MOD_LFO_WAVES = [...NATIVE_WAVES, 'samplehold'];
const LFO_TEMPO_DIVISIONS = ['1/64', '1/32', '1/16', '1/8', '1/4', '1/2'];
// A two-beat hold is useful on a smooth LFO, but too slow for the stepped S&H
// source. Keep the stored value compatible while removing that choice from its
// editor row.
const lfoTempoDivisions = (voice) => getAt(voice, '$layer.lfo.type') === 'samplehold'
  ? LFO_TEMPO_DIVISIONS.filter((division) => division !== '1/2')
  : LFO_TEMPO_DIVISIONS;
// A layer oscillator additionally takes `noise` — the GameSynth's pitched noise (the
// seeded buffer through a bandpass that follows the note), as one layer of a stack:
// breath on a flute, sizzle under a lead. Its own list because the FM operator and the
// ordinary LFO shapes draw from NATIVE_WAVES; the MRDR-3 Mod LFO adds `samplehold`
// separately because it is a stepped random source, not an OscillatorNode waveform.
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
// Where the shaper sits relative to MRDR-3's Global Filter and Global VCA. `post` first
// because it is the default and the chain every preset written before this one has: the
// summed stack filtered and enveloped, and THEN driven. Ordered signal-wise from the
// stage's point of view rather than alphabetically, and stated as two words with nothing
// implied — a bare PRE/POST pill with no third option cannot be read as a bypass.
const DRIVE_PLACES = ['post', 'pre'];
// What `buildChorus` falls back to for everything MIX does not say.
//
// Restated here rather than imported, for the reason the synth allowlist is: the engine
// module imports Tone and cannot be loaded in Node, so a panel that reached for it could
// not be tested at all. That makes this a duplicated number, and a duplicated number
// drifts — a row default out of step with the engine's `??` would open the pot at 0.8
// over a chorus already running at something else, which is the one lie a panel must
// never tell. tests/pot-coverage.js reads both and fails if they part company.
export const CHORUS_DEFAULTS = { rate: 0.8, depth: 0.5, width: 1 };
const chorused = (v) => (getAt(v, '$chorus.mix') ?? 0) > 0;
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
  // The LFO's three destinations. TREM rather than LEVL because tremolo is what an LFO on
  // the level IS, and the pill is the one place the word fits.
  filter: 'FILT', level: 'TREM', pitch: 'PITCH',
  free: 'FREE', tempo: 'TEMPO',
  // Tempo divisions read as the fractions the preset stores. 64TH/BEAT/2BEAT made the
  // row ask to be translated twice — once from the word, once back to the note value —
  // and the fractions are short enough that all six pills fit one line.
  '1/64': '1/64', '1/32': '1/32', '1/16': '1/16', '1/8': '1/8',
  '1/4': '1/4', '1/2': '1/2',
  '1bar': 'BAR', '2bar': '2BAR',
  poly: 'POLY', legato: 'LEGATO', mono: 'MONO', samplehold: 'S&H',
  off: 'OFF', '1+2': '1+2', '1+3': '1+3', '1+2+3': 'ALL',
};

const KEY_MODES = ['poly', 'legato', 'mono'];
const OSC_SYNC_MODES = ['off', '1+2', '1+3', '1+2+3'];
const isSyncedSlave = (voice, layer) => layer > 1 && (
  voice?.sync === '1+2+3' || voice?.sync === `1+${layer}`);
const keyMode = (voice) => KEY_MODES.includes(voice?.mode)
  ? voice.mode : (voice?.mono === true ? 'mono' : 'poly');
const writeKeyMode = (voice, mode) => {
  delete voice.mono;
  return mode;
};
const vibratoOn = (voice) => (voice?.vibrato?.depth ?? 0) > 0;
const hasUnison = (voice) => voice?.synth === 'MRDR-3'
  && ['osc1', 'osc2', 'osc3'].some((key) => (voice.layer?.[key]?.unison ?? 1) > 1);

/**
 * A pot on a dotted path into `options`, with the default the engine would use.
 *
 * `unit` is appended to the label rather than to the reading. The value is drawn INSIDE
 * the pot's ring, where there is room for about five characters — so `2.9` goes in the
 * ring and `oct` goes on the label, which is where a hardware panel has always put it.
 */
const n = (path, label, min, max, step, fmt = fixed(2), def = min, unit = '', when = null, opts = {}) =>
  ({ kind: 'num', path, label, unit, min, max, step, fmt, def, when, ...opts });
// A derived row can update or remove more than the leaf named by `path` — the pilot's
// Tone control removes the optional filter at its top detent, and the collective Quick
// controls rewrite several envelope leaves at once. Returning this sentinel keeps the
// shared widget path intact without writing a stale leaf back afterward.
const SKIP_WRITE = Symbol('skip-row-write');
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
      // To 12: Tone's FatOscillator takes any count, and `tpAlienChorus` is built on 10 of
      // them. An 8 stop did not save the CPU — the preset already spends it — it only
      // stopped the panel from admitting what the preset was.
      n(`${path}.count`, 'UNISON', 1, 12, 1, fixed(0), 3, '', (v) => readVoicing(v) === 'fat'),
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
  envTime(`${path}.attack`, 'ATTACK', 0.001, secs, 0.01, 's', null, { startRow: true }),
  envTime(`${path}.decay`, 'DECAY', 0.001, secs, 0.2),
  ...(sustain ? [sustainPct(`${path}.sustain`)] : []),
  envTime(`${path}.release`, 'RELEASE', 0.001, secs, 0.3),
  // The SHAPE of the ramp, not just its length — the difference between a stage
  // that fades and one that snaps. See the note on `ENV_CURVES` above for why all
  // three stages are linear/exponential only. `trio` puts the three on one row, a
  // third each, rather than three controls that happen to be adjacent.
  pick(`${path}.attackCurve`, 'ATK', ENV_CURVES, 'linear', null, { trio: 'curve' }),
  pick(`${path}.decayCurve`, 'DEC', ENV_CURVES, 'exponential', null, { trio: 'curve' }),
  pick(`${path}.releaseCurve`, 'REL', ENV_CURVES, 'exponential', null, { trio: 'curve' }),
];

/**
 * The filter controls on a Tone MonoSynth, optionally rooted under one of DuoSynth's
 * internal voices.  DuoSynth is two MonoSynths joined at the pitch input, so exposing
 * this same small set on both voices is the honest model: there is no separate Duo
 * filter hiding behind the two voice envelopes.
 */
const monoFilterRows = (prefix = '') => [
  pick(`${prefix}filter.type`, 'TYPE', FILTER_TYPES, 'lowpass'),
  pick(`${prefix}filter.rolloff`, 'SLOPE', [-12, -24, -48], -12),
  cutoffHz(`${prefix}filterEnvelope.baseFrequency`, 'CUTOFF', 200),
  resQ(`${prefix}filter.Q`, 1),
  // Tone's FrequencyEnvelope expresses its range as octaves above/below the base
  // frequency. Keep this bipolar, like the MRDR-3 filter envelope, so closing sweeps
  // are available as well as the familiar opening sweep.
  n(`${prefix}filterEnvelope.octaves`, 'ENV AMOUNT', -ENV_OCT_MAX, ENV_OCT_MAX, 0.1,
    semis, 0, 'oct', null, { origin: 0, scale: ENV_OCT_SCALE }),
];

const TNGR2_TABLE_IDS = ['basic', 'warmHarmonics', 'hollowPulse', 'sawForm', 'vowelAEIOU',
  'vowelGlass', 'choirBreath', 'crystal', 'alloy', 'bellFold', 'reedWire', 'organShift',
  'spectralPWM', 'octaveCascade', 'digitalSteps', 'darkToAir'];

/**
 * One TNGR-2 oscillator, in the order you reach for it rather than the order the preset
 * stores it: what it plays, where it is tuned, how wide it is, then what moves it.
 *
 * Written once because it was written twice — Osc A and Osc B are the same twelve
 * controls, and the pair had already drifted to different LEVEL defaults for no reason
 * other than which one a preset usually leans on. That difference is the one argument.
 *
 * `startRow` at the head of each group is what makes those groups visible: the strip
 * grid is four columns wide and a TABLE pick spans two, so without it TUNE and UNISON
 * run into each other's rows and the card reads as twelve unrelated knobs.
 */
/**
 * The three stage curves, as the trio MRDR-3's `adsr` builds — same labels, same two
 * options, same defaults, and behind the same door in the window. Three pills that are
 * set once and then never touched should not cost a full row on every envelope card.
 */
const tngrCurves = (path) => [
  pick(`${path}.attackCurve`, 'ATK', ENV_CURVES, 'linear', null, { trio: 'curve' }),
  pick(`${path}.decayCurve`, 'DEC', ENV_CURVES, 'exponential', null, { trio: 'curve' }),
  pick(`${path}.releaseCurve`, 'REL', ENV_CURVES, 'exponential', null, { trio: 'curve' }),
];

const tngrOsc = (key, level) => {
  const at = (leaf) => `$tngr2.${key}.${leaf}`;
  const stacked = (v) => (getAt(v, at('unison')) ?? 1) > 1;
  return [
    // Sixteen families: a dropdown rather than five wrapped lines of pills. The names
    // are Title Case in the menu, where there is room to read them.
    // The table has a line to itself: it is the one control that says what this
    // oscillator IS, and it is a name rather than a number.
    pick(at('table'), 'WAVE TABLE', TNGR2_TABLE_IDS, 'basic', null, {
      dropdown: true, optionLabel: tngr2TableName, startRow: true,
    }),
    // LEVEL is pulled out of the grid in the full window and laid along the top of the
    // card as a fader — see `fader` in mixer-synth-full.js. It stays an ordinary pot on
    // the strip, which has no room to lie one down.
    n(at('level'), 'LEVEL', 0, 1.5, 0.01, fixed(2), level, '', null, { startRow: true }),
    // MRDR-3's pair, under MRDR-3's names: where this oscillator sits against the note,
    // and the cents either side of it. INTERVAL rather than TRANSPOSE — TRANSPOSE is on
    // the Settings card and moves the whole preset, and two pots on one panel cannot both
    // be called it.
    n(at('interval'), 'INTERVAL', -24, 24, 1, semiSteps, 0, 'semi', null, {
      origin: 0, startRow: true,
      tip: 'Where this oscillator sits against the note — -12 is a sub an octave down,'
        + ' +7 a fifth above, +12 a doubling octave',
    }),
    n(at('detune'), 'DETUNE', -50, 50, 1, fixed(0), 0, 'ct', null, { origin: 0 }),
    // THE STACK: how many copies of this oscillator there are, how far apart they are
    // tuned, and how wide they sit. Two of the three are dead at UNISON 1, so they read as
    // one idea and are greyed as one.
    n(at('unison'), 'UNISON', 1, 4, 1, fixed(0), 1, '', null, { startRow: true }),
    n(at('spread'), 'SPREAD', 0, 50, 1, fixed(0), 12, 'ct', stacked),
    n(at('stereo'), 'STEREO', 0, 1, 0.01, fixed(2), 0, '', stacked),
    // AND THE MOVEMENT, LAST. Where in the table this oscillator starts, and how far it
    // travels from there: the envelope's amount and the LFO's. Those three are one idea —
    // a starting point and its journey — and reading them together is the whole of what
    // makes this a wavetable oscillator rather than one with a wavetable in it. At the
    // foot of the card because they are what you reach for once the sound is chosen, and
    // because a row of three under two rows of tuning is a card that reads downwards.
    //
    // No PHASE MODE and no PHASE: where in the cycle a note starts is always SEEDED from
    // the note's own identity — a chord does not comb-filter itself and a stem matches
    // its mix — which is what every preset in the bank used anyway.
    n(at('position'), 'POSITION', 0, 1, 0.01, fixed(2), 0, '', null, { startRow: true }),
    n(at('envAmount'), 'ENV MOVE', -1, 1, 0.01, fixed(2), 0),
    n(at('lfoAmount'), 'LFO MOVE', -1, 1, 0.01, fixed(2), 0),
  ];
};

/**
 * One TNGR-2 position LFO. Both are the same five controls, and the pair had drifted:
 * LFO 1's division pill was labelled SYNC — the same word as its own free/tempo switch
 * two pots away — while LFO 2's said DIV.
 *
 * RATE and DIVISION are the same control in two units, so each is greyed out when the
 * other is the one in use rather than left standing at a number nothing reads.
 */
const tngrLfo = (key, label, rate) => {
  const at = (leaf) => `$tngr2.${key}.${leaf}`;
  return [
    // What the LFO is, then how much and how fast. No DELAY and no RETRIGGER: nothing
    // used either, and an LFO that starts with the note is what a player expects.
    pick(at('shape'), `${label} WAVE`, ['sine', 'triangle', 'saw', 'square', 'samplehold'],
      'sine', null, { startRow: true }),
    n(at('amount'), `${label} AMT`, 0, 1, 0.01, fixed(2), 0, '', null, { startRow: true }),
    // No tempo sync: this LFO moves table POSITION, which is a timbre, and a timbre
    // snapped to the beat is a rhythm the sequencer already owns.
    n(at('rate'), `${label} RATE`, 0.01, 8, 0.01, fixed(2), rate, 'Hz'),
  ];
};


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
  envTime(`$${base}attack`, 'ATTACK', 0, secs, 0, 's',
    (v) => (getAt(v, `$${base}semitones`) ?? 0) !== 0, { startRow: true }),
  envTime(`$${base}decay`, 'DECAY', 0, secs, 0.06, 's',
    (v) => (getAt(v, `$${base}semitones`) ?? 0) !== 0),
  sustainPct(`$${base}sustain`, 0, (v) => (getAt(v, `$${base}semitones`) ?? 0) !== 0),
  envTime(`$${base}release`, 'RELEASE', 0, secs, 0.015, 's',
    (v) => (getAt(v, `$${base}semitones`) ?? 0) !== 0),
];

const layerGroups = () => {
  const groups = [];
  for (let i = 1; i <= 3; i++) {
    const p = `layer.osc${i}`;
    const on = i === 1 ? null : (v) => sectionOn(v, p);
    const free = (v) => (i === 1 || sectionOn(v, p)) && !isSyncedSlave(v, i);
    groups.push({
      // `key` is the card's name to another layout — see `fullLayout`. The TITLE is prose
      // and has been rewritten twice; a second surface that addressed cards by it would
      // break on a wording change, which is not a thing a wording change should be able
      // to do. Every group in this table carries one.
      key: `osc${i}`,
      title: `Osc ${i}`,
      layerCopy: i,
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
      when: (v) => free(v) && getAt(v, `$${p}.type`) === 'pulse',
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
        envTime(`$${p}.pwm.delay`, 'ONSET', 0, secs, 0, 's',
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
      title: `Osc ${i} · FM`, optional: `${p}.fm`, when: free,
      onTip: 'Take the modulator out',
      offTip: 'Bend this layer with a second oscillator — brass, bells, growl',
      rows: [
        pick(`$${p}.fm.type`, 'WAVE', NATIVE_WAVES, 'sine'),
        n(`$${p}.fm.ratio`, 'RATIO', 0.1, 12, 0.01, fixed(2), 1.4),
        n(`$${p}.fm.index`, 'INDEX', 0, 8, 0.05, fixed(2), 1),
        envTime(`$${p}.fm.attack`, 'ATTACK', 0.001, secs, 0.001),
        envTime(`$${p}.fm.decay`, 'DECAY', 0, secs, 1),
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
        mrdrFilterCutoff(`$${p}.filter.freq`, 'CUTOFF', 1150),
        mrdrFilterResonance(`$${p}.filter.Q`, `$${p}.filter.freq`, 1.15),
        // MonoSynth's row in MonoSynth's position — the range the envelope moves the
        // cutoff across belongs beside the cutoff. Bipolar where Tone's is positive-
        // only (a Tone limit, not a choice): negative closes down from above. Zero is
        // no envelope AT ALL — the engine schedules nothing — which is why there is
        // no on/off switch on the Filter Env card: zero already is it, for free.
        mrdrFilterEnvAmount(`$${p}.filter.env.octaves`, `$${p}.filter.freq`),
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
        envTime(`$${p}.filter.env.attack`, 'ATTACK', 0, secs, 0.01),
        envTime(`$${p}.filter.env.decay`, 'DECAY', 0, secs, 1),
        // Live at every DECAY, as on the amp envelope: the cutoff settles at
        // ENV AMOUNT × SUSTAIN rather than returning all the way to the cutoff.
        sustainPct(`$${p}.filter.env.sustain`, 0),
        envTime(`$${p}.filter.env.release`, 'RELEASE', 0, secs, 0.015),
      ],
    });
    groups.push({
      // The layer's own amplifier, on its own card at the END of its run — where an
      // envelope belongs on a panel laid out by signal flow, and where MonoSynth's Amp
      // Envelope sits too. Nothing moved but the card: every row keeps the key it has
      // always written, so no preset changes and nothing is re-measured.
      key: `osc${i}.amp`,
      title: `Osc ${i} · Amp`, when: on,
      // THROUGH is the amp envelope's OFF state. Keep the AMP selector itself live, but
      // make the stage controls, curves and full-window graph inert until ENV is chosen.
      bodyWhen: (v) => getAt(v, `$${p}.vca`) !== 'through',
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
        envTime(`$${p}.attack`, 'ATTACK', 0, secs, 0.01,
          's', (v) => getAt(v, `$${p}.vca`) !== 'through'),
        envTime(`$${p}.decay`, 'DECAY', 0, secs, 1,
          's', (v) => getAt(v, `$${p}.vca`) !== 'through'),
        // Live at every DECAY: sustain is WHERE the fall lands, not something a short
        // decay switches off. Zero reaches silence (struck, the default); 0.7 falls only
        // that far and releases from there.
        sustainPct(`$${p}.sustain`, 0, (v) => getAt(v, `$${p}.vca`) !== 'through'),
        envTime(`$${p}.release`, 'RELEASE', 0, secs, 0.015,
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
      mrdrMasterFilterCutoff('$global.filter.freq', 'CUTOFF', 1150),
      mrdrFilterResonance('$global.filter.Q', '$global.filter.freq', 1.15),
      mrdrFilterEnvAmount('$global.filter.env.octaves', '$global.filter.freq'),
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
      envTime('$global.filter.env.attack', 'ATTACK', 0, secs, 0.01),
      envTime('$global.filter.env.decay', 'DECAY', 0, secs, 1),
      sustainPct('$global.filter.env.sustain', 0),
      envTime('$global.filter.env.release', 'RELEASE', 0, secs, 0.015),
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
      envTime('$global.vca.attack', 'ATTACK', 0, secs, 0.01),
      envTime('$global.vca.decay', 'DECAY', 0, secs, 1),
      sustainPct('$global.vca.sustain', 1),
      envTime('$global.vca.release', 'RELEASE', 0, secs, 0.015),
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
    title: 'Mod LFO',
    fold: (v) => (getAt(v, '$layer.lfo.depth') ?? 0) === 0,
    foldKeep: ['$layer.lfo.depth'],
    rows: [
      // WAVE above TARGET: what the shape IS, then where it is pointed. It also matches
      // every other modulator card on the desk, all of which open on their waveform.
      pick('$layer.lfo.type', 'WAVE', MOD_LFO_WAVES, 'sine',
        (v) => (getAt(v, '$layer.lfo.depth') ?? 0) > 0),
      pick('$layer.lfo.target', 'TARGET', ['filter', 'level', 'pitch'], 'filter',
        (v) => (getAt(v, '$layer.lfo.depth') ?? 0) > 0),
      pick('$layer.lfo.sync', 'SYNC', ['free', 'tempo'], 'free',
        (v) => (getAt(v, '$layer.lfo.depth') ?? 0) > 0),
      pick('$layer.lfo.division', 'DIV', LFO_TEMPO_DIVISIONS, '1/4',
        (v) => (getAt(v, '$layer.lfo.depth') ?? 0) > 0
          && getAt(v, '$layer.lfo.sync') === 'tempo',
        { optionsFor: lfoTempoDivisions }),
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
            + 'LFO movement is separate from VIB DEPTH, up in Note' }),
      n('$layer.lfo.rate', 'RATE', 0.05, 12, 0.05, fixed(2), 0.5, 'Hz',
        (v) => (getAt(v, '$layer.lfo.depth') ?? 0) > 0
          && getAt(v, '$layer.lfo.sync') !== 'tempo',
        { scale: (v) => getAt(v, '$layer.lfo.type') === 'samplehold'
          ? SLOW_LFO_RATE_SCALE : 1 }),
      envTime('$layer.lfo.delay', 'ONSET', 0, secs, 0, 's',
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
   * EFFECTS is the card the drum panel calls Drive, plus the two things a melodic stack
   * has that a one-shot does not: somewhere to PUT the drive, and a chorus. SHAPE, DRIVE
   * and TONE keep the drum's exact keys, labels and order, so those three pots are
   * provably one control across the two panels rather than two that look alike — the card
   * around them is wider here because there is more in it, not because they differ.
   */
  'MRDR-3': [
    ...layerGroups(),
    { key: 'effects', title: 'Effects', rows: [
      pick('$shape', 'SHAPE', DRIVE_SHAPES, 'soft'),
      // WHERE the shaper sits relative to the Global Filter and Global VCA — see
      // `drivePre` in `_playLayer`. POST is the chain this synth has always built and
      // stays the default; PRE moves the shaper and TONE together in front of the global
      // stage. Two options, so it takes two of the card's four columns and DRIVE and TONE
      // finish the row it starts.
      //
      // Greyed with DRIVE at zero for the reason `toneRow` is: with no shaper there is
      // nothing to place, so the pill would be a routing choice over an absent node.
      //
      // It also has nothing to say on a preset with NO global stage — the engine ignores
      // it there, because there is nothing to be pre or post OF — but the pill stays live
      // rather than greying on that too. A control that vanishes when the Global Filter
      // is switched off and comes back holding its old value reads as a bug from either
      // end, and the honest fix is that PRE on a stack with no global stage is simply
      // POST, which is exactly what you hear.
      pick('$drivePlace', 'PLACE', DRIVE_PLACES, 'post', drivenTone, { startRow: true }),
      n('$drive', 'DRIVE', 0, 1, 0.01, fixed(2), 0),
      toneRow('$tone.freq', 'TONE'),
      // ---- Chorus 2 ----------------------------------------------------------
      //
      // MIX first and on a fresh row, because it is the switch: the engine builds no
      // chorus at zero, exactly as it builds no LFO at DEPTH zero. The three that shape
      // it grey out behind it, so the card never shows four live pots for a stage that
      // is not in the signal.
      //
      // RATE, DEPTH and WIDTH carry the engine's own fallbacks as their defaults, so
      // winding MIX up hands you the chorus the engine already implied rather than
      // silence to dig out of — the rule the optional sections follow, kept by a row
      // default here because MIX-is-the-switch means there is no section to seed.
      n('$chorus.mix', 'CHORUS', 0, 1, 0.01, fixed(2), 0, '', null, { startRow: true }),
      // Cubed, for the reason written over `SLOW_LFO_RATE_SCALE`: a chorus lives under
      // 1 Hz, and linear it opened on the tenth of the travel where nothing can be aimed.
      // The range is the strip's own Chorus 2 insert's, unchanged — same control, same
      // stops — so only how the travel maps to it moved.
      n('$chorus.rate', 'RATE', 0.05, 8, 0.01, fixed(2), CHORUS_DEFAULTS.rate, 'Hz', chorused,
        { scale: SLOW_LFO_RATE_SCALE }),
      n('$chorus.depth', 'DEPTH', 0, 1, 0.01, fixed(2), CHORUS_DEFAULTS.depth, '', chorused),
      n('$chorus.width', 'WIDTH', 0, 1, 0.01, fixed(2), CHORUS_DEFAULTS.width, '', chorused),
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
      envTime('$additive.attack', 'ATTACK', 0.001, secs, 0.01),
      // Zero reads as NOTE rather than 0ms: it is the arcade shape — an exponential fall
      // across the whole note — and a magic value you can see on the dial is a detent
      // rather than a secret. SUSTAIN stays live with it: a decay that runs to the end of
      // the note has no plateau to hold, but the fall still lands ON the sustain level.
      envTime('$additive.decay', 'DECAY', 0, secs, 1),
      sustainPct('$additive.sustain', 0),
      envTime('$additive.release', 'RELEASE', 0, secs, 0.015),
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
        envTime('$additive.pitch.sweep', 'SWEEP TIME', 0.001, secs, 0.1),
      ] },
    // The percussion register: one louder partial struck on the attack and gone long
    // before the note is. Always dry, so repeated off-beat stabs stay crisp.
    { title: 'Percussion', optional: 'additive.perc',
      onTip: 'Take the key-attack pip out',
      offTip: 'Strike one partial on the attack — the Hammond percussion register',
      rows: [
        n('$additive.perc.ratio', 'HARMONIC', 1, 8, 1, fixed(0), 3, '×'),
        n('$additive.perc.gain', 'LEVEL', 0, 2, 0.01, fixed(2), 0.72),
        envTime('$additive.perc.attack', 'ATTACK', 0.001, secs, 0.002),
        // Seconds, not a fraction of the note: a real percussion register is a circuit
        // constant — fast or slow whatever the player holds.
        envTime('$additive.perc.decay', 'DECAY', 0.001, secs, 0.08),
      ] },
    HUMANISE_GROUP,
  ],
  GameSynth: [
    { title: 'Game Synth', rows: [
      // `noise` is a fifth WAVEFORM rather than a fifth preset kind: it swaps the
      // oscillator for the seeded buffer through a bandpass that tracks the note, so
      // every other control on the panel goes on meaning what it meant.
      { kind: 'pick', path: '$waveform', label: 'WAVE', options: ['sine', 'square', 'sawtooth', 'triangle', 'noise'], def: 'square' },
      envTime('$attack', 'ATTACK', 0.001, secs, 0.01),
      envTime('$release', 'RELEASE', 0, secs, 0.015),
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
        envTime('$filter.sweep', 'SWEEP TIME', 0.001, secs, 0.12, 's',
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
    { title: 'Filter', rows: monoFilterRows() },
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
      n('harmonicity', 'RATIO', 0.9, 2.1, 0.0001, fixed(4), 1, '', null, {
        // Near-unison Duo patches live in the first few thousandths above 1. A cubic
        // response puts that useful range under the hand instead of spending almost all
        // of the knob on octave-ish intervals, while the four-decimal step keeps 1.003
        // (about +5.2 cents on voice 1) directly reachable by drag or type-in.
        scale: 3,
        tip: 'Voice 1 pitch ÷ Voice 0 pitch. 1.000 = unison; 1.003 ≈ +5.2 cents.',
      }),
      n('vibratoAmount', 'VIBRATO', 0, 1, 0.01, fixed(2), 0.5, '', null,
        { scale: VIB_DEPTH_SCALE }),
      n('vibratoRate', 'VIB RATE', 0.1, 60, 0.1, fixed(1), 5, 'Hz', null,
        { scale: SLOW_END_SCALE }),
    ] },
    { title: 'Voice 1', rows: [...osc('voice0.oscillator', 'sawtooth'), ...adsr('voice0.envelope')] },
    { title: 'Voice 1 Filter', rows: [
      ...monoFilterRows('voice0.'),
      ...adsr('voice0.filterEnvelope'),
    ] },
    { title: 'Voice 2', rows: [...osc('voice1.oscillator', 'square'), ...adsr('voice1.envelope')] },
    { title: 'Voice 2 Filter', rows: [
      ...monoFilterRows('voice1.'),
      ...adsr('voice1.filterEnvelope'),
    ] },
  ],
  MembraneSynth: [
    { title: 'Drum', rows: [
      // The two halves of a kick's drop, named for which half each is: HOW FAR, and HOW
      // FAST. They were the wrong way round — `pitchDecay` is a time and wore the name
      // that sounds like a distance, while `octaves`, the distance, was called DEPTH.
      n('octaves', 'PITCH DROP', 0.5, 12, 0.1, fixed(1), 10, 'oct', null,
        { scale: SLOW_END_SCALE }),
      n('pitchDecay', 'DROP TIME', 0.001, 0.5, 0.001, secs, 0.05, 's', null,
        { scale: SHORT_TIME_SCALE }),
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
      // To 12k, not 8k. `triangleDing` and `stTriangleDing` both ring at 9000 — a ding is
      // a high, thin body, which is the point of them — and at an 8000 ceiling the pot sat
      // on its end stop showing them a number neither one holds.
      n('resonance', 'RES FREQ', 200, 12000, 50, hz, 4000, 'Hz'),
      // The same `octaves` key MembraneSynth has, doing the same job: how far the
      // envelope drags the pitch. One key, one name, on both panels.
      n('octaves', 'PITCH DROP', 0.5, 4, 0.1, fixed(1), 1.5, 'oct', null,
        { scale: SLOW_END_SCALE }),
    ] },
    { title: 'Envelope', rows: adsr('envelope', { sustain: false }) },
  ],
  'TNGR-2': [
    { key: 'oscA', title: 'Osc A · Wave Table', rows: tngrOsc('oscA', 0.8) },
    { key: 'oscB', title: 'Osc B · Wave Table', optional: 'tngr2.oscB', onTip: 'Add the second wavetable oscillator', offTip: 'Take Osc B out of the mix', rows: tngrOsc('oscB', 0.3) },
    { key: 'motion', title: 'Motion', rows: [
      // An ordinary ADSR. There was a HOLD stage — the position walk sitting at the top
      // of its travel before falling back — and it went: no preset in the bank used it,
      // and it was the only hold on any melodic engine, so it was a stage to explain
      // rather than a shape anyone wanted.
      envTime('$tngr2.positionEnv.attack', 'ATTACK', 0, secs, 0.01, 's', null, { startRow: true }),
      envTime('$tngr2.positionEnv.decay', 'DECAY', 0, secs, 1),
      sustainPct('$tngr2.positionEnv.sustain', 0),
      envTime('$tngr2.positionEnv.release', 'RELEASE', 0, secs, 0.3),
      ...tngrCurves('$tngr2.positionEnv'),
      ...tngrLfo('lfo1', 'LFO', 0.2),
    ] },
    { key: 'filter', title: 'Filter', rows: [
      pick('$tngr2.filter.type', 'TYPE', ['lowpass', 'highpass', 'bandpass', 'notch'], 'lowpass'),
      // The desk's three slopes, in MRDR-3's position and with its options: -12 is one
      // filter stage, -24 two in series, -48 four. Resonance stays on the first stage
      // alone, or a cascade turns its peak into a whistle.
      pick('$tngr2.filter.slope', 'SLOPE', SLOPES, -24),
      cutoffHz('$tngr2.filter.cutoff', 'CUTOFF', 9000),
      resQ('$tngr2.filter.resonance', 2.4),
      // MRDR-3's order, and MRDR-3's words: the range the envelope moves the cutoff
      // across belongs beside the cutoff, and KEY FOLLOW after it. Same label, same
      // bipolar octaves, same taper and tooltip — one control across the two panels
      // rather than two that resemble each other.
      //
      // There is no DRIVE here any more either: the shaper is on the Effects card with a
      // PLACE pill saying whether it sits before this filter or after it, which is one
      // control saying one thing instead of two that could disagree.
      // No `startRow`: the four pots flow as ONE row, the way MRDR-3's filter card reads.
      n('$tngr2.filterEnv.amount', 'ENV AMOUNT', -ENV_OCT_MAX, ENV_OCT_MAX, 0.1, semis, 0,
        'oct', null, {
          origin: 0,
          scale: ENV_OCT_SCALE,
          tip: 'How far the envelope moves the cutoff, in octaves — up or down',
        }),
      n('$tngr2.filter.keyTrack', 'KEY FOLLOW', 0, 1, 0.01, fixed(2), 0),
    ] },
    // MRDR-3's split, exactly: the RANGE on the Filter card, the four times on their own
    // card beside it. An envelope is scheduling rather than nodes, so there is nothing
    // for a switch to save and ENV AMOUNT at zero already is one.
    { key: 'filterenv', title: 'Filter Env', rows: [
      envTime('$tngr2.filterEnv.attack', 'ATTACK', 0, secs, 0.01, 's', null, { startRow: true }),
      envTime('$tngr2.filterEnv.decay', 'DECAY', 0, secs, 1),
      // Live at every DECAY, as on the amp envelope: the cutoff settles at
      // ENV AMOUNT x SUSTAIN rather than returning all the way to the cutoff.
      sustainPct('$tngr2.filterEnv.sustain', 0),
      envTime('$tngr2.filterEnv.release', 'RELEASE', 0, secs, 0.015),
      ...tngrCurves('$tngr2.filterEnv'),
    ] },
    { key: 'amp', title: 'Amp / Voice', rows: [
      envTime('$tngr2.amp.attack', 'ATTACK', 0, secs, 0.01, 's', null, { startRow: true }),
      envTime('$tngr2.amp.decay', 'DECAY', 0, secs, 1),
      sustainPct('$tngr2.amp.sustain', 0.8),
      envTime('$tngr2.amp.release', 'RELEASE', 0, secs, 0.25),
      ...tngrCurves('$tngr2.amp'),
    ] },
    // The same card MRDR-3 and the drum panel carry, on the same voice-level keys — so
    // SHAPE, DRIVE and TONE are provably one control across the three panels rather than
    // three that look alike. PLACE means what it means on MRDR-3: where the shaper sits
    // relative to the filter. Here that filter is inside the voice, so the shaper is too;
    // the chorus is a lane effect and is built after the lane's node.
    { key: 'effects', title: 'Effects', rows: [
      pick('$shape', 'SHAPE', DRIVE_SHAPES, 'soft'),
      pick('$drivePlace', 'PLACE', DRIVE_PLACES, 'post', drivenTone, { startRow: true }),
      n('$drive', 'DRIVE', 0, 1, 0.01, fixed(2), 0),
      toneRow('$tone.freq', 'TONE'),
      n('$chorus.mix', 'CHORUS', 0, 1, 0.01, fixed(2), 0, '', null, { startRow: true }),
      n('$chorus.rate', 'RATE', 0.05, 8, 0.01, fixed(2), CHORUS_DEFAULTS.rate, 'Hz', chorused,
        { scale: SLOW_LFO_RATE_SCALE }),
      n('$chorus.depth', 'DEPTH', 0, 1, 0.01, fixed(2), CHORUS_DEFAULTS.depth, '', chorused),
      n('$chorus.width', 'WIDTH', 0, 1, 0.01, fixed(2), CHORUS_DEFAULTS.width, '', chorused),
    ] },
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
    // The drum panel's Noise card exactly — same three keys, so the same order: what the
    // noise IS, then the filter over it, in one pair. COLOUR sat BETWEEN TYPE and SLOPE
    // here, which split the one question this card asks twice down the middle with an
    // unrelated one. See the note there.
    pick('$noise.color', 'COLOUR', NOISE_COLORS, 'white'),
    pick('$noise.type', 'TYPE', FILTER_TYPES, 'bandpass', null, { startRow: true }),
    pick('$noise.slope', 'SLOPE', SLOPES, -12),
    drumFilterCutoff('$noise.freq', 'CUTOFF', 2600),
    // Up to 24, where it once stopped at 8. A bandpass does not RING below about ten —
    // it only colours — and a ringing filter is what a rim, a clave and the body of a
    // snare are made of. The pot could not reach the sound. The loudest thing here is
    // `engineCrash` at 15.9, so 24 keeps that headroom without the dead half `resQ` had
    // while it shared the ring resonator's range.
    drumFilterResonance('$noise.Q', '$noise.freq', 0.7),
    envTime('$noise.decay', 'DECAY', 0.001, secs, 0.09),
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
      envTime('$body.decay', 'DECAY', 0.001, secs, 0.06),
    ] },
  HUMANISE_GROUP,
  { title: 'Taps', taps: true },
];

const BODY_DEFAULT = { type: 'triangle', from: 210, to: 140, decay: 0.06, gain: 0.375 };

/**
 * How deep the drum's FM switch comes on — a colour, not a different instrument.
 *
 * INDEX is depth in HERTZ stated as a multiple of the carrier (see `_playDrum`): at 1 the
 * modulator swings the oscillator by its whole starting frequency either way. That is
 * not a strong setting, it is total — measured on `dsKick`, `dsSnare` and `dsRim`, an
 * index of 1 at the default 1.4 ratio changes about half the render's own energy
 * (−6 dB of difference against the unmodulated hit), and a kick comes back as a clang.
 * The switch was seeded there, so throwing it did not add FM to the drum, it replaced
 * the drum. Nobody switches a section on to hear a different preset.
 *
 * 0.2 is the same sound with an edge on it — around −15 to −19 dB of difference on those
 * three, which is a timbre you can hear arrive and still recognise the drum through. From
 * there the pot goes to 8, and the two presets in the catalogue that actually use drum FM
 * (`rimClang`, `clapFm`) sit at 2.2 for thirty milliseconds, which is what the top of that
 * range is FOR.
 *
 * Zero was the other candidate and is what the section-default rule below would say on
 * its own — the engine implies no modulator at all. It is rejected because it makes the
 * switch inaudible, and a control that does nothing when you throw it is the same bug
 * reported from the other end.
 */
const FM_INDEX_SEED = 0.2;

/**
 * A KLNG8 preset: the Microtonic construction. Two sources, each with its own
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
  { key: 'osc', title: 'Oscillator', optional: 'osc',
    onTip: 'Take the pitched half out — noise only',
    offTip: 'Put a pitched source under the noise',
    rows: [
      n('$osc.gain', 'LEVEL', 0, 2, 0.01, fixed(2), 1),
      pick('$osc.type', 'WAVE', WAVES, 'sine'),
      // `door: 'curve'` — behind the card's curve button in the full window, drawn as the
      // shapes they are, exactly as MRDR-3's stage curves. A curve is set once and then
      // never touched, and two of them were costing two full-width rows on the card with
      // the most in it. On the STRIP they stay ordinary rows: there is no header there to
      // hang a door on. See `curvePanel`.
      pick('$osc.curve', 'CURVE', ['exp', 'lin'], 'exp', null, { door: 'curve' }),
      // Named for the RATE knob it shapes rather than called a second CURVE: this one is
      // the pitch drop, the one above it is the level. `snap` is the analogue drum
      // machine's own pitch envelope — hardest at the start, settled before the tail —
      // and it is the difference between a kick that clicks and one that goes boing.
      pick('$osc.pitchCurve', 'RATE CURVE', ['exp', 'lin', 'snap'], 'exp', null,
        { door: 'curve' }),
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
      // From zero, in milliseconds. The floor was 5ms in 5ms steps, and the two cowbells
      // sweep in 4 — under the pot's bottom AND off its grid, so the panel could neither
      // show what they hold nor put it back. `pitchRamp` reads whatever is stored, so the
      // range was the only thing saying 4ms was impossible.
      envTime('$osc.sweep', 'SWEEP TIME', 0, secs, 0.07, 's', null,
        { tip: 'How long the pitch takes to travel the AMOUNT' }),
      // Zero is a real setting here, not an absent one: `env()` reads `sec.attack ?? 0.001`,
      // so a stored 0 is honoured and means no ramp at all — which is what the three VL-1
      // pipe voices are. A 1ms floor made that unreachable and unshowable.
      //
      // `startRow` on every drum ATTACK, for the reason `adsr` has it: the envelope is a
      // BLOCK — attack, hold, decay, sag — and flowed in behind however many pots the
      // source happened to leave on the line, it broke across two rows at one card width
      // and read as one continuous smear at another. On its own row it is the same four
      // controls in the same place on all five sections, whatever sits above them.
      //
      // `foot` is the same claim made one level up, and only the full window can honour
      // it: the envelope is the LAST block on the card, so it hangs from the floor rather
      // than from whatever the source rows above it happened to leave. Five sections of
      // very different lengths then read their envelopes off ONE line across the band —
      // the alignment `startRow` gives the block inside a card, given to the band. The
      // strip ignores it and draws one continuous grid, because a scroll has no floor to
      // hang from. See `foot` in `buildDrumFullLayout`.
      envTime('$osc.attack', 'ATTACK', 0, secs, 0.001, 's', null,
        { startRow: true, foot: true }),
      envTime('$osc.hold', 'HOLD', 0, secs, 0),
      envTime('$osc.decay', 'DECAY', 0.001, secs, 0.35),
      // The two-stage decay, as one pot: the level the section drops to in the first
      // 20ms before the rest of DECAY carries it down. Zero is one plain decay, which
      // is what every preset written before this had. It is what makes a drum read as
      // STRUCK — one exponential is either a transient or a tail and cannot be both.
      n('$osc.sag', 'SAG', 0, 1, 0.01, fixed(2), 0),
    ] },
  // The modulator, and the reason one oscillator can be a cowbell or a rim: a second
  // oscillator bending the first one's pitch faster than the ear can follow, which is
  // heard as a timbre rather than as a wobble.
  { key: 'osc.fm', title: 'FM', optional: 'osc.fm',
    onTip: 'Take the modulator out — the oscillator on its own',
    offTip: 'Bend the oscillator with a second one — clangs, bells, rims',
    rows: [
      pick('$osc.fm.type', 'WAVE', WAVES, 'sine'),
      n('$osc.fm.ratio', 'RATIO', 0.1, 12, 0.01, fixed(2), 1.4),
      // Resets to what the switch seeds — see FM_INDEX_SEED. A double-click that landed
      // somewhere the switch never goes would make "put it back" a third value.
      n('$osc.fm.index', 'INDEX', 0, 8, 0.05, fixed(2), FM_INDEX_SEED),
      envTime('$osc.fm.attack', 'ATTACK', 0.001, secs, 0.001, 's', null,
        { startRow: true, foot: true }),
      envTime('$osc.fm.decay', 'DECAY', 0.001, secs, 0.35),
    ] },
  { key: 'noise', title: 'Noise', optional: 'noise',
    onTip: 'Take the noise half out — the oscillator on its own',
    offTip: 'Put the seeded noise source back in',
    rows: [
      n('$noise.gain', 'LEVEL', 0, 2, 0.01, fixed(2), 1),
      // COLOUR FIRST, directly under LEVEL — where WAVE sits on the Oscillator and on
      // Metal, and for the same reason: it is the one pick that says what the source IS,
      // and the filter under it is what is then DONE to it. It was last on the card, below
      // the filter, which read as though the noise were being coloured after it had been
      // shaped — backwards from both the signal path and every other source card here.
      //
      // TYPE and SLOPE stay ADJACENT, and TYPE starts a fresh line so that COLOUR cannot
      // take it as a partner. They are one question asked twice — what shape of filter,
      // and how steeply — so the full window pairs them onto one line the way it does on
      // every other filter card on the desk, and it can only pair rows that are
      // neighbours: without the break, COLOUR would pair with TYPE and leave SLOPE
      // stranded on a line of its own. COLOUR wants the whole width for its five words
      // anyway. See `pairChoices` and `startRow`.
      pick('$noise.color', 'COLOUR', NOISE_COLORS, 'white'),
      pick('$noise.type', 'TYPE', FILTER_TYPES, 'bandpass', null, { startRow: true }),
      pick('$noise.slope', 'SLOPE', SLOPES, -12),
      pick('$noise.curve', 'CURVE', ['exp', 'lin'], 'exp', null, { door: 'curve' }),
      drumFilterCutoff('$noise.freq', 'CUTOFF', 2600),
      drumFilterCutoff('$noise.to', 'SWEEP TO', 2600),
      envTime('$noise.sweep', 'SWEEP TIME', 0.001, secs, 0.12),
      drumFilterResonance('$noise.Q', '$noise.freq', 0.7),
      // Floor 0.1ms, not 1ms: the engine takes `attack` raw (`sec.attack ?? 0.001`
      // is a fallback, not a clamp), and `dsKickHard` ships 0.343ms — a pot that
      // cannot reach a factory preset's own value rewrites it on first touch, which
      // is exactly what tests/pot-coverage.js exists to forbid.
      envTime('$noise.attack', 'ATTACK', 0.0001, secs, 0.001, 's', null,
        { startRow: true, foot: true }),
      envTime('$noise.hold', 'HOLD', 0, secs, 0),
      envTime('$noise.decay', 'DECAY', 0.001, secs, 0.12),
      n('$noise.sag', 'SAG', 0, 1, 0.01, fixed(2), 0),
    ] },
  // A click into a very narrow filter: struck, then ringing. Where the noise section
  // is a burst you shape, this is a PITCH that arrives already decaying — the rim, the
  // clave, the wood block, the shell under a snare.
  { key: 'ring', title: 'Ring', optional: 'ring',
    onTip: 'Take the resonator out',
    offTip: 'Strike a resonant filter — rims, claves, shells',
    rows: [
      n('$ring.gain', 'LEVEL', 0, 2, 0.01, fixed(2), 1),
      pick('$ring.type', 'TYPE', FILTER_TYPES, 'bandpass'),
      pick('$ring.curve', 'CURVE', ['exp', 'lin'], 'exp', null, { door: 'curve' }),
      drumFilterFrequency('$ring.freq', 'FREQUENCY', 400),
      drumFilterFrequency('$ring.to', 'SWEEP TO', 400),
      // The one that changes what it IS rather than how it sounds: a couple of
      // milliseconds is a stick, twenty is a mallet, past fifty it is a burst again.
      n('$ring.hit', 'STRIKE', 0.0005, 0.05, 0.0005, secs, 0.002, 's', null,
        { scale: SHORT_TIME_SCALE }),
      // `ringQ`, not `resQ` — this is the one RESONANCE on the desk that runs to 120,
      // because here the Q is the MATERIAL rather than a filter setting. See its note.
      drumRingResonance('$ring.Q', '$ring.freq', 40),
      envTime('$ring.attack', 'ATTACK', 0.001, secs, 0.001, 's', null,
        { startRow: true, foot: true }),
      envTime('$ring.decay', 'DECAY', 0.001, secs, 0.25),
      n('$ring.sag', 'SAG', 0, 1, 0.01, fixed(2), 0),
    ] },
  // Six squares at inharmonic ratios through a highpass — the 808's cymbal circuit.
  { key: 'metal', title: 'Metal', optional: 'metal',
    onTip: 'Take the cluster out',
    offTip: 'Add a cluster of inharmonic squares — hats, cowbells, cymbals',
    rows: [
      n('$metal.gain', 'LEVEL', 0, 2, 0.01, fixed(2), 1),
      pick('$metal.wave', 'WAVE', WAVES, 'square'),
      pick('$metal.filter', 'TYPE', FILTER_TYPES, 'highpass'),
      drumFilterFrequency('$metal.freq', 'FREQUENCY', 800),
      // 0 collapses the cluster onto one note and 2 pulls the partials twice as far
      // apart as the 808's. Everything between is a different metal.
      // PARTIAL SPREAD rather than SPREAD: everywhere else on the desk SPREAD is unison
      // detune in cents, and this pulls a bank of partials apart by a ratio.
      n('$metal.spread', 'PARTIAL SPREAD', 0, 2, 0.01, fixed(2), 1),
      n('$metal.count', 'PARTIALS', 1, 6, 1, fixed(0), 6),
      drumFilterCutoff('$metal.hp', 'CUTOFF', 3000),
      drumFilterResonance('$metal.Q', '$metal.hp', 0.7),
      envTime('$metal.attack', 'ATTACK', 0.001, secs, 0.001, 's', null,
        { startRow: true, foot: true }),
      envTime('$metal.decay', 'DECAY', 0.001, secs, 0.2),
      n('$metal.sag', 'SAG', 0, 1, 0.01, fixed(2), 0),
    ] },
  { key: 'drive', title: 'Drive', rows: [
    pick('$shape', 'SHAPE', DRIVE_SHAPES, 'soft'),
    n('$drive', 'DRIVE', 0, 1, 0.01, fixed(2), 0),
    // After the shaper, not before: what it is for is the fizz the drive just added.
      toneRow('$tone.freq', 'TONE'),
  ] },
  HUMANISE_GROUP,
  { key: 'taps', title: 'Taps', taps: true },
];

// What an optional section starts as when it is switched on, per key. The osc and
// noise defaults mirror `_playDrum`'s fallbacks the way BODY_DEFAULT mirrors
// `_playNoise`'s — switching a section on changes the sound the engine already
// implied, not to a new one.
const SECTION_DEFAULTS = {
  body: BODY_DEFAULT,
  osc: { type: 'sine', from: 190, to: 52, sweep: 0.07, decay: 0.35, curve: 'exp', gain: 1 },
  noise: { type: 'bandpass', freq: 2600, Q: 0.7, decay: 0.12, gain: 1 },
  ring: { type: 'bandpass', freq: 400, Q: 40, hit: 0.002, attack: 0.001, decay: 0.25, curve: 'exp', gain: 1 },
  metal: { wave: 'square', freq: 800, spread: 1, count: 6, hp: 3000, Q: 0.7, attack: 0.001, decay: 0.2, gain: 1 },
  // The modulator hangs off the oscillator rather than off the entry, which is the one
  // section here whose key is a path — see `addSection`. Its depth is the one value in
  // this table that cannot come from an engine fallback, because the engine's fallback
  // for a missing modulator is no modulator — see FM_INDEX_SEED for what it opens on
  // instead and why.
  'osc.fm': { type: 'sine', ratio: 1.4, index: FM_INDEX_SEED, decay: 0.35 },
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
  // broken switch. A newly enabled shared amp starts with instant attack, no decay or
  // release, and full sustain. The engine can still be given a real envelope immediately
  // after that, but merely enabling the card must not colour the sound.
  'global.vca': { attack: 0, decay: 0, sustain: 1, release: 0 },
  // TNGR-2's second oscillator. It needs an entry for the same reason `global.vca` does,
  // one step worse: with none, switching Osc B on wrote an empty object, and the engine's
  // fallback level for the SECOND oscillator is zero — so the card appeared, every pot
  // read a plausible number, and nothing could be heard until LEVEL was touched. A switch
  // that does nothing visible is a switch that reads as broken. These are the row
  // defaults, so the card and the sound agree the moment it comes on.
  'tngr2.oscB': { table: 'basic', position: 0, level: 0.3, unison: 1 },
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

/** Copy one MRDR-3 oscillator, including optional sections currently bypassed. */
export function copyLayerData(voice, from, to) {
  if (!voice?.layer || from === to || ![1, 2, 3].includes(from)
    || ![1, 2, 3].includes(to)) return false;
  const sourceKey = `layer.osc${from}`;
  const targetKey = `layer.osc${to}`;
  const source = voice.layer[`osc${from}`];
  const holds = voice[HELD] || {};
  if (source === undefined && holds[sourceKey] === undefined) return false;

  if (source === undefined) delete voice.layer[`osc${to}`];
  else voice.layer[`osc${to}`] = copy(source);

  const nextHolds = {};
  for (const [key, value] of Object.entries(holds)) {
    if (key === targetKey || key.startsWith(`${targetKey}.`)) continue;
    if (key === sourceKey || key.startsWith(`${sourceKey}.`)) {
      nextHolds[key.replace(sourceKey, targetKey)] = copy(value);
    } else {
      nextHolds[key] = value;
    }
  }
  if (Object.keys(nextHolds).length) voice[HELD] = nextHolds;
  else delete voice[HELD];
  return true;
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
 *   KEY MODE and GLIDE      `play` reads `v.mode` after it has already dispatched noise,
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
 * Portamento is a legato feature, and a polyphonic preset has no legato: `play`
 * round-robins every note onto the next slot in the pool, whose previous note has long
 * since released, so there is nothing to glide from. Measured — a rising line rendered
 * at portamento 0 and 0.25 came out SAMPLE-IDENTICAL, all 264,600 of them. A non-poly
 * mode is what fixed it: one instance for the whole lane, which remembers what it was
 * playing. Hence the `when`.
 *
 * And the second gate is in the engine rather than here, because it is about the NOTE
 * rather than the preset: a glide happens only when a note starts while the previous one
 * is STILL GATED. That is fingered portamento, it is what both `play` and `_playLayer`
 * test, and it is why a mono line with rests in it slides between its slurred notes and
 * lands cleanly on the ones after a gap.
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
 * The Note card's two choice rows, and then its vibrato, in that order.
 *
 * The card reads in three blocks: the pots — level, tuning and GLIDE — then the two
 * choices that say how a sustained note is played, and then the one thing that is not a
 * property of the note at all but something done TO it, vibrato. Note length moved to
 * the piano roll, where it is edited per note instead of per preset.
 *
 * GLIDE is deliberately NOT named here, and that omission is the whole of what puts it
 * in the top row of pots: a path in this list goes last, a path that is absent keeps its
 * declaration order, so `$portamento` lands directly after `$fine` however far down the
 * file it happens to be written.
 *
 * Ordered HERE rather than by moving the declarations, because KEY MODE and OSC SYNC do
 * not share a condition with the vibrato rows that follow them. Re-ordering the built
 * list changes where a row sits and nothing about when it exists.
 */
const NOTE_TAIL = ['$mode', '$sync'];
const noteOrder = (rows) => {
  const tail = [...NOTE_TAIL, ...rows.filter((r) => r.part === 'vibrato').map((r) => r.path)];
  const moved = new Set(tail);
  return [
    ...rows.filter((r) => !moved.has(r.path)),
    // `filter(Boolean)`: a non-pooled path has no GLIDE, so the tail names rows that are
    // legitimately absent.
    ...tail.map((p) => rows.find((r) => r.path === p)).filter(Boolean),
  ];
};

const commonRows = (voice = {}) => noteOrder(withParts([
  // The one row here every path honours: `trim` is folded into the note's gain in
  // scheduleStep, BEFORE the rack is asked to play anything, so it lands on a hat
  // exactly as it lands on a lead. Which is why it is also the only thing left on a
  // one-shot's Note card (plus KLNG8's sound-level TUNE directly below it).
  n('$trim', 'TRIM', -6, 6, 0.1, fixed(1), 0, 'dB'),
  // Drum tuning is a property of the sound, not of the note that triggers it. It is
  // optional and neutral at zero so existing drums remain source-identical until touched.
  ...(voice.kind === 'drum'
    ? [n('$tune', 'TUNE', -24, 24, 1, semiSteps, 0, 'st')]
    : []),
  // Everything from here to the vibrato is about the sustained note's pitch and entry,
  // which is why a one-shot has none of it. See `isOneShot`.
  ...(isOneShot(voice) ? [] : [
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
    // A fresh row, so the four VIB pots read as the block they are. A patch with no OSC
    // SYNC leaves KEY MODE holding half a line by itself, and without this VIB DEPTH
    // flows into the other half — the vibrato beginning mid-row beside a heading it has
    // nothing to do with, which is the interleaving that moving it down here undid.
    // DuoSynth already owns a real vibrato LFO inside Tone.DuoSynth. Showing the generic
    // `$vibrato` rows here as well made two different pitch modulators look like one
    // feature, and editing both could stack them. Keep the Duo controls on its own card;
    // every other synth uses the shared preset-vibrato layer below.
    ...(voice.synth === 'DuoSynth' ? [] : [
      n('$vibrato.depth', 'VIB DEPTH', 0, 12, 0.01, fixed(2), 0, 'semi',
        null, { scale: VIB_DEPTH_SCALE, startRow: true }),
      n('$vibrato.rate', 'VIB RATE', 0.1, 60, 0.1, fixed(1), 5, 'Hz',
        vibratoOn, { scale: SLOW_END_SCALE }),
      // The third of the three, beside the two it belongs with rather than stranded on one
      // synth's own card — and ONLY on the paths that have one.
      //
      // Every native path ramps the vibrato depth up from nothing over this, measured from
      // its own note-on. The Tone path cannot: its LFO is a `Tone.Vibrato` living in the
      // pool, free-running across notes, with no note-on for a delay to be measured from
      // and no fade parameter to write one into. It was greyed there for a while, which is
      // what this window does with a control that is momentarily inapplicable — but greyed
      // says "turn something else on and this comes alive", and on a Tone synth nothing
      // ever will. So it is not built at all: the row is absent from the panel rather than
      // present and permanently dead.
      ...(NATIVE_SYNTHS.includes(voice?.synth)
        ? [envTime('$vibrato.delay', 'VIB DELAY', 0, secs, 0, 's', vibratoOn)]
        : []),
      // The ensemble control. At zero every unison voice wobbles at one rate in one phase,
      // which is one singer through a chorus however many oscillators are running; wound up,
      // each voice takes its own rate and its own starting phase and the stack becomes a
      // SECTION. Scattered per unison index rather than per layer, deliberately — voice 2 is
      // the same singer in every layer, because a person has one larynx feeding all of their
      // formants, and scattering per layer pulls one voice apart instead of adding voices.
      //
      // MRDR-3 with unison: it is the only path that builds multiple vibrato voices to
      // de-correlate. A single-voice MRDR-3 patch and the pooled classes have nothing for
      // SPREAD to separate.
      n('$vibrato.spread', 'VIB SPREAD', 0, 1, 0.01, fixed(2), 0, '',
        (v) => vibratoOn(v) && hasUnison(v),
        { tip: 'How far the unison voices drift apart in rate and phase — 0 is one wobble '
            + 'on every voice, 1 is a room full of singers who are not counting together' }),
    ]),
  ]),
  // LEGATO and MONO hold one instance for the whole lane, so GLIDE has a pitch to slide
  // from. LEGATO keeps the current envelope running across an overlapping note; MONO
  // starts the new envelope again. POLY gets a fresh pooled slot and has no legato
  // origin, so GLIDE is absent there.
  //
  // What the two share, and what makes GLIDE mean one thing on both, is that the slide
  // is FINGERED on either of them: a note glides only when it begins while the previous
  // note is still gated. The same overlap that hands LEGATO its envelope is the overlap
  // that gives MONO a pitch to come from.
  //
  // Both are absent, not greyed, on the paths that cannot honour them — a drum has no
  // pool to hold one instance of and no Tone synth to carry a portamento. MRDR-3 is
  // the one NATIVE path where they work: `_playLayer` keeps a glide origin per
  // (lane, voice) and chokes the note still ringing, which is exactly what the pills
  // promise. See `isPooled`.
  ...(isPooled(voice) || voice?.synth === 'MRDR-3' || voice?.synth === 'TNGR-2' ? [
    // KEY MODE, not VOICING: the Tone oscillator cards already spend VOICING on
    // single/fat/am/fm, which is a different question from how many notes sound at once.
    pick('$mode', 'KEY MODE', KEY_MODES, 'poly', null, {
      read: keyMode,
      write: writeKeyMode,
    }),
    // Drawn in the TOP row of pots, beside TRIM/TRANSPOSE/FINE, which is where `noteOrder`
    // puts it — see `NOTE_TAIL`. Four pots is exactly a row, so the card opens with one
    // full line of knobs and the choice rows below it are choices and nothing else.
    // It sat under KEY MODE before, on a fresh row of its own: a single pot on a line
    // that a greyed-out POLY patch left looking like a gap in the card.
    n('$portamento', 'GLIDE', 0, 0.5, ENV_TIME_STEP, secs, 0, '', (v) => keyMode(v) !== 'poly',
      {
        scale: SHORT_TIME_SCALE,
        tip: 'How long the pitch takes to slide from the note before. FINGERED, like the '
          + 'switch on a mono synth: a note only glides when it starts while the previous '
          + 'one is still sounding its length, so slurred notes slide and a note after a '
          + 'rest lands on its own pitch. Draw the notes overlapping in the roll to hear it.',
      }),
  ] : []),
  ...(voice?.synth === 'MRDR-3' ? [
    pick('$sync', 'OSC SYNC', OSC_SYNC_MODES, 'off', null, {
      tip: 'Osc 1 is the master. 1+2 resets Osc 2 from Osc 1; 1+3 resets Osc 3; '
        + 'ALL resets both slaves. A slave interval sets the hard-sync overtone shape; '
        + 'Pitch Env remains available for animated sync sweeps, while FM and PWM are '
        + 'unavailable on a synced slave.',
    }),
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
 * Asked for a POOLED preset, so `mode` and `portamento` count as common: they are shown
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

// ---- the pilot Quick surfaces ----------------------------------------------

const QUICK_SYNTHS = new Set(['MRDR-3', 'TNGR-2', 'drum']);
/**
 * The presets built for a Quick surface — which are exactly the presets that have a
 * full window behind it. One set, because the two go together: a Quick surface is only
 * worth drawing when there is somewhere to put the controls it leaves out, and the
 * ADVANCED button that opens that window is gated on this. Exported so the desk can ask
 * the same question before offering **Edit Advanced** — see `editVoice` in
 * tools/mixer-entry.js.
 */
export const isQuickVoice = (voice) => QUICK_SYNTHS.has(voice?.kind === 'drum' ? 'drum' : voice?.synth);

const stageDefault = (stage) => ({ attack: 0.01, decay: 1, release: 0.015 }[stage] ?? 0);

/** The VCA stages that actually shape an enabled MRDR-3 layer or global stack. */
const mrdrStagePaths = (voice, stage) => {
  const out = [];
  for (let i = 1; i <= 3; i++) {
    const base = `$layer.osc${i}`;
    if (!getAt(voice, base) || getAt(voice, `${base}.vca`) === 'through') continue;
    out.push({ path: `${base}.${stage}`, def: stageDefault(stage) });
  }
  if (sectionOn(voice, 'global.vca')) {
    out.push({ path: `$global.vca.${stage}`, def: stageDefault(stage) });
  }
  return out;
};

/** Drum source amplitude stages; FM and the fixed knock transient are intentionally out. */
const drumStagePaths = (voice, stage) => {
  const defs = { osc: 0.35, noise: 0.12, ring: 0.25, metal: 0.2 };
  const out = [];
  for (const key of Object.keys(defs)) {
    if (!getAt(voice, `$${key}`)) continue;
    out.push({ path: `$${key}.${stage}`, def: defs[key] });
  }
  if (stage === 'decay' && voice.noise && Array.isArray(voice.tapDecays)) {
    voice.tapDecays.forEach((_, i) => out.push({
      path: `$tapDecays.${i}`, def: voice.noise?.decay ?? defs.noise,
    }));
  }
  return out;
};

const collectiveRead = (voice, paths) => paths.length
  ? Math.max(...paths.map(({ path, def }) => getAt(voice, path) ?? def))
  : 0;

const collectiveRow = (path, label, stage, pathsOf, { min = 0, def = 0 } = {}) => {
  // A macro position must describe one sound, independent of how the knob got there.
  // Capture the authored envelope once and calculate every later position from that
  // baseline. Rescaling the last result would accumulate rounding and make x -> y -> z
  // differ from x -> z. The WeakMap keeps editor-only state out of saved voice data.
  const baselines = new WeakMap();
  const capture = (voice, paths) => {
    const values = paths.map(({ path: itemPath, def: itemDef }) => {
      const raw = getAt(voice, itemPath);
      return { path: itemPath, present: raw !== undefined, value: raw ?? itemDef };
    });
    return {
      anchor: values.length ? Math.max(...values.map((item) => item.value)) : 0,
      values,
      projected: null,
    };
  };
  return envTime(path, label, min, secs, def, 's', null, {
    read: (_raw, voice) => collectiveRead(voice, pathsOf(voice, stage)),
    write: (x, voice) => {
      const paths = pathsOf(voice, stage);
      let baseline = baselines.get(voice);
      // Advanced can remain open beside Quick. If it changed a constituent stage since
      // this macro's last write, that new authored shape becomes the baseline instead of
      // being overwritten by stale editor state.
      const changedElsewhere = baseline?.projected && (
        paths.length !== baseline.projected.length
        || paths.some(({ path: itemPath }, i) => {
          const expected = baseline.projected[i];
          const raw = getAt(voice, itemPath);
          return expected?.path !== itemPath || raw !== expected.value;
        })
      );
      if (!baseline || changedElsewhere) {
        baseline = capture(voice, paths);
        baselines.set(voice, baseline);
      }

      if (Math.abs(x - baseline.anchor) < 1e-9) {
        for (const item of baseline.values) {
          if (item.present) setAt(voice, item.path, item.value);
          else deleteAt(voice, item.path);
        }
        baselines.delete(voice);
        return SKIP_WRITE;
      }

      const ratio = baseline.anchor > 0 ? x / baseline.anchor : 0;
      const projected = [];
      for (const item of baseline.values) {
        const next = baseline.anchor > 0 ? item.value * ratio : x;
        // Scaled proportionally, a short stage under a macro pulled right down lands on
        // a length no pot on the panel can reach or show — a third of a millisecond,
        // written by a knob and then invisible to the knob that owns it. So a stage that
        // is still ON is held at the same 1ms floor its own pot has; a stage the ratio
        // takes to nothing is still allowed to be nothing.
        const scaled = Math.min(ENV_MAX_SECONDS, Math.max(0, next));
        const value = scaled > 0 && scaled < ENV_TIME_STEP ? ENV_TIME_STEP : scaled;
        setAt(voice, item.path, value);
        projected.push({ path: item.path, value });
      }
      baseline.projected = projected;
      return SKIP_WRITE;
    },
  });
};

// ---- the Quick Cutoff macro ---------------------------------------------
//
// Cutoff is not another stored preset parameter. It is a view over the filter
// frequencies that are actually in this native voice, just as the Quick envelope pots are
// views over several VCA stages. A voice can have three layer filters, a Global Filter and
// a Drive Tone; one of those being changed in Advanced must be reflected by the one pot.
//
// The aggregate is the lowest active cutoff. In a chain that is the effective ceiling, and
// in a layered voice it is the darkest component the macro has to account for. Moving the
// macro scales every included frequency by the same ratio, in octaves, so the filter
// relationships stay intact. A drum filter's sweep destination travels with its cutoff;
// filter-envelope amounts, Q, type and slope deliberately do not.
const TONE_ENGINE_DEFAULT_FREQ = 8000;
const quickCutoffTarget = (path, def, { companions = [], section = null } = {}) => ({
  path, def, companions, section,
});

const mrdrCutoffTargets = (voice) => {
  const targets = [];
  for (let i = 1; i <= 3; i++) {
    const base = `layer.osc${i}`;
    if (!sectionOn(voice, base) || (getAt(voice, `$${base}.gain`) ?? 1) <= 0) continue;
    if (sectionOn(voice, `${base}.filter`)) {
      targets.push(quickCutoffTarget(`$${base}.filter.freq`, 1150));
    }
  }
  if (sectionOn(voice, 'global.filter')) {
    targets.push(quickCutoffTarget('$global.filter.freq', 1150));
  }
  if (drivenTone(voice) && sectionOn(voice, 'tone')) {
    targets.push(quickCutoffTarget('$tone.freq', TONE_ENGINE_DEFAULT_FREQ, { section: 'tone' }));
  }
  // Keep the useful legacy capability for a driven, otherwise unfiltered patch: the first
  // Quick CUTOFF move can create the Drive Tone. Once any real
  // filter is present, creating a new post-drive node behind the user's back would make a
  // collective control unexpectedly change the signal topology.
  if (!targets.length && drivenTone(voice)) {
    targets.push(quickCutoffTarget('$tone.freq', CUTOFF_MAX, { section: 'tone' }));
  }
  return targets;
};

const drumCutoffTargets = (voice) => {
  const targets = [];
  if (sectionOn(voice, 'noise')) {
    targets.push(quickCutoffTarget('$noise.freq', 2600, {
      companions: [{ path: '$noise.to', def: 2600 }],
    }));
  }
  if (sectionOn(voice, 'metal')) {
    targets.push(quickCutoffTarget('$metal.hp', 3000, {
      companions: [{ path: '$metal.hpTo', def: 3000 }],
    }));
  }
  // Ring FREQ and Metal FREQ are pitched resonators/oscillator bases, not filter
  // controls. TUNE owns those values; CUTOFF owns only their actual filter cutoffs.
  if (drivenTone(voice) && sectionOn(voice, 'tone')) {
    targets.push(quickCutoffTarget('$tone.freq', TONE_ENGINE_DEFAULT_FREQ, { section: 'tone' }));
  }
  if (!targets.length && drivenTone(voice)) {
    targets.push(quickCutoffTarget('$tone.freq', CUTOFF_MAX, { section: 'tone' }));
  }
  return targets;
};

const quickCutoffTargets = (voice) => voice?.kind === 'drum'
  ? drumCutoffTargets(voice)
  : voice?.synth === 'MRDR-3' ? mrdrCutoffTargets(voice) : [];

const quickCutoffValue = (voice, target) => {
  const raw = getAt(voice, target.path);
  const value = Number(raw ?? target.def);
  return Number.isFinite(value) ? Math.min(CUTOFF_MAX, Math.max(20, value)) : target.def;
};

const quickCutoffRead = (voice, targets = quickCutoffTargets(voice)) => {
  if (!targets.length) return CUTOFF_MAX;
  return Math.min(...targets.map((target) => quickCutoffValue(voice, target)));
};

const quickCutoffItems = (voice, targets) => targets.flatMap((target) => {
  const paths = [
    { path: target.path, def: target.def, required: true },
    ...target.companions.map((item) => ({ ...item, required: false })),
  ];
  return paths.map((item) => {
    const raw = getAt(voice, item.path);
    return {
      path: item.path,
      value: Number.isFinite(Number(raw))
        ? Math.min(CUTOFF_MAX, Math.max(20, Number(raw))) : item.def,
      raw,
      present: raw !== undefined,
      required: item.required,
      section: target.section,
    };
  });
});

const quickCutoffProjection = (voice, targets) => quickCutoffItems(voice, targets)
  .map(({ path, raw, present }) => ({ path, raw, present }));

const sameQuickCutoffProjection = (voice, targets, projection) => {
  const current = quickCutoffProjection(voice, targets);
  return current.length === projection.length && current.every((item, i) => {
    const expected = projection[i];
    return item.path === expected.path && item.present === expected.present
      && item.raw === expected.raw;
  });
};

const quickCutoffRow = () => {
  const baselines = new WeakMap();
  const capture = (voice, targets) => ({
    anchor: quickCutoffRead(voice, targets),
    values: quickCutoffItems(voice, targets),
    sections: targets.filter((target) => target.section).map((target) => ({
      key: target.section,
      present: sectionOn(voice, target.section),
      held: holdOn(voice, target.section) ? copy(holdOn(voice, target.section)) : null,
    })),
    projected: null,
  });
  const restore = (voice, baseline) => {
    for (const item of baseline.values) {
      if (item.present) setAt(voice, item.path, item.raw);
      else deleteAt(voice, item.path);
    }
    for (const section of baseline.sections) {
      if (section.present) continue;
      deleteAt(voice, `$${section.key}`);
      if (section.held) (voice[HELD] ||= {})[section.key] = copy(section.held);
      else releaseHold(voice, section.key);
    }
  };

  // CUTOFF, not BRIGHTNESS. The panel speaks the standard synth vocabulary the rest of
  // the desk is written in, and a filter frequency knob is a CUTOFF wherever it appears.
  // What is different here is the SCOPE, not the parameter: Quick is the whole-voice view,
  // so its CUTOFF moves every active filter — the layer filters, the global filter and
  // the Drive Tone — by a shared ratio, where the Advanced card's CUTOFF moves the one
  // filter that card is about. Scope is what Quick and Advanced already differ by on
  // ATTACK, DECAY and RELEASE, and it needs no second name here either.
  return cutoffHz('$quick.cutoff', 'CUTOFF', CUTOFF_MAX,
    (voice) => quickCutoffTargets(voice).length > 0, {
      read: (_raw, voice) => quickCutoffRead(voice),
      write: (x, voice) => {
        const targets = quickCutoffTargets(voice);
        if (!targets.length) return SKIP_WRITE;
        let baseline = baselines.get(voice);
        const changedElsewhere = baseline?.projected
          && !sameQuickCutoffProjection(voice, targets, baseline.projected);
        if (!baseline || changedElsewhere) {
          baseline = capture(voice, targets);
          baselines.set(voice, baseline);
        }

        if (Math.abs(x - baseline.anchor) < 1e-9) {
          restore(voice, baseline);
          baselines.delete(voice);
          return SKIP_WRITE;
        }

        const ratio = baseline.anchor > 0 ? x / baseline.anchor : 1;
        for (const target of targets) {
          if (target.section && !sectionOn(voice, target.section)) {
            addSection(voice, target.section);
            if (target.section === 'tone') {
              voice.tone ||= {};
              voice.tone.type ||= 'lowpass';
              voice.tone.Q ??= 0.7;
            }
          }
        }
        for (const item of baseline.values) {
          // A missing companion means the engine is not sweeping to a second point. Keep
          // it absent; the primary cutoff is always written because it is the macro's
          // actual target, even when the engine was using its default.
          if (!item.required && !item.present) continue;
          const next = Math.min(CUTOFF_MAX, Math.max(20, item.value * ratio));
          setAt(voice, item.path, next);
        }
        baseline.projected = quickCutoffProjection(voice, targets);
        return SKIP_WRITE;
      },
    });
};

const neutralGlobalFilter = (voice) => {
  const tone = getAt(voice, '$tone.freq') ?? CUTOFF_MAX;
  return {
    type: 'lowpass', slope: -12, freq: Math.min(8000, Math.max(20, tone)), Q: 0.7,
    env: { octaves: 0 },
  };
};

// A Quick move may have to create the optional Global Filter before it can write Sweep
// or Resonance. Remember the exact seed under the engine-ignored bypass bag; when both
// macros return to neutral and the section is still that seed, remove it again. If the
// user changed anything else in Advanced, it no longer matches and is kept.
const QUICK_FILTER_HOLD = '$quick.global.filter';
const ensureGlobalFilter = (voice) => {
  if (!sectionOn(voice, 'global.filter')) {
    const seed = neutralGlobalFilter(voice);
    voice.global = { ...(voice.global || {}), filter: seed };
    (voice[HELD] ||= {})[QUICK_FILTER_HOLD] = copy(seed);
  }
  voice.global.filter ||= neutralGlobalFilter(voice);
  voice.global.filter.env ||= { octaves: 0 };
  return voice.global.filter;
};

const releaseQuickFilterIfSeed = (voice) => {
  const seed = holdOn(voice, QUICK_FILTER_HOLD);
  const filter = voice.global?.filter;
  if (!seed || !filter || JSON.stringify(filter) !== JSON.stringify(seed)) return;
  delete voice.global.filter;
  if (!Object.keys(voice.global).length) delete voice.global;
  releaseHold(voice, QUICK_FILTER_HOLD);
};

// ENV AMOUNT, the Roland name the Advanced Global Filter card already uses for this
// exact key. Quick writes `global.filter.env.octaves` and so does that card, so the two
// faces of one parameter must read the same — a Quick pot called FILTER SWEEP was a
// second name for a control the user can see spelled ENV AMOUNT one tab away.
// No `oct` after the name. Quick's four columns are 79px wide and the unit is what
// pushed ENV AMOUNT past the end of one; the octaves are still what the pot counts, and
// the Advanced card it mirrors still spells the unit out on a card wide enough to hold it.
const quickEnvAmount = () => n('$quick.envAmount', 'ENV AMOUNT', -ENV_OCT_MAX,
  ENV_OCT_MAX, 0.1, semis, 0, '', null, {
    origin: 0, scale: ENV_OCT_SCALE,
    read: (_raw, voice) => voice.global?.filter?.env?.octaves ?? 0,
    write: (x, voice) => {
      if (x === 0 && !sectionOn(voice, 'global.filter')) return SKIP_WRITE;
      const filter = ensureGlobalFilter(voice);
      filter.env.octaves = x;
      releaseQuickFilterIfSeed(voice);
      return SKIP_WRITE;
    },
  });

const quickResonance = () => resQ('$quick.resonance', 0.7, null, {
  read: (_raw, voice) => voice.global?.filter?.Q ?? 0.7,
  write: (x, voice) => {
    if (x === 0.7 && !sectionOn(voice, 'global.filter')) return SKIP_WRITE;
    const filter = ensureGlobalFilter(voice);
    filter.Q = x;
    releaseQuickFilterIfSeed(voice);
    return SKIP_WRITE;
  },
});

/**
 * Eight, said once.
 *
 * The Quick pot and the Taps card's stepper are two ways to the same key, so a ceiling
 * either one of them did not share would be a control that stops where the other one
 * carries on — the pot clamped here, the stepper counting past it, and a preset the pot
 * could no longer show. Past it the repeats are a roll rather than a clap, and that is
 * what a rate is for.
 *
 * SIX, down from eight. The catalogue's longest is `noiseSweep` at exactly six, so no
 * preset loses a tap it already has, and six is what the card can hold at a glance: the
 * table splits into two blocks of three, which fits the drawer without scrolling. Seven
 * and eight were reachable and never reached — and a ceiling nothing uses is a ceiling
 * that only ever costs the layout.
 */
const MAX_TAPS = 6;
const tapCount = (voice) => Array.isArray(voice.taps) && voice.taps.length ? voice.taps.length : 1;

/**
 * What the full window's TAPS door is called — the count, when there is one to say.
 *
 * `TAPS` at a single tap and `TAPS 3` at three. A door that always read TAPS would hide
 * the one thing about this card you need without opening it: whether the sound is one tap
 * or a clap. A door that always carried a number would put `TAPS 1` on ninety percent of
 * the catalogue, which is a count of nothing dressed as a setting.
 *
 * Written once and used twice — the layout names the button, and the popover renames it
 * in place when the stepper inside changes the count without a re-layout. Two spellings
 * of the same rule is how the button and the panel behind it come to disagree.
 */
const tapsDoorLabel = (voice) => (tapCount(voice) > 1 ? `TAPS ${tapCount(voice)}` : 'TAPS');
const QUICK_TAPS_HOLD = '$quick.taps';
const setTapCount = (voice, target) => {
  const count = Math.max(1, Math.min(MAX_TAPS, Math.round(target)));
  const before = tapCount(voice);
  if (count < before && !holdOn(voice, QUICK_TAPS_HOLD)) {
    (voice[HELD] ||= {})[QUICK_TAPS_HOLD] = {
      taps: copy(voice.taps || [0]),
      tapFalloff: voice.tapFalloff,
      hadTapFalloff: Object.hasOwn(voice, 'tapFalloff'),
    };
  }
  const held = holdOn(voice, QUICK_TAPS_HOLD);
  const list = (voice.taps || [0]).slice();
  while (list.length < count) {
    const authored = held?.taps?.[list.length];
    if (authored != null) list.push(authored);
    else {
      const gap = list.length > 1 ? list.at(-1) - list.at(-2) : 0.012;
      list.push(Number((list.at(-1) + gap).toFixed(4)));
    }
  }
  list.length = count;
  if (count === 1) {
    delete voice.taps;
    delete voice.tapFalloff;
  } else {
    voice.taps = list;
    if (voice.tapFalloff == null) {
      if (held?.hadTapFalloff) voice.tapFalloff = held.tapFalloff;
      else voice.tapFalloff = 0.78;
    }
  }
  if (held && count >= held.taps.length) {
    if (held.hadTapFalloff) voice.tapFalloff = held.tapFalloff;
    else delete voice.tapFalloff;
    releaseHold(voice, QUICK_TAPS_HOLD);
  }
};

export const quickRows = (voice) => {
  if (voice.kind === 'drum') {
    const rows = [
      n('$trim', 'LEVEL', -6, 6, 0.1, fixed(1), 0, 'dB'),
      ...(getAt(voice, '$osc') || getAt(voice, '$ring') || getAt(voice, '$metal')
        ? [n('$tune', 'TUNE', -24, 24, 1, semiSteps, 0, 'st')]
        : []),
      collectiveRow('$quick.attack', 'ATTACK', 'attack', drumStagePaths,
        { min: 0.001, def: 0.001 }),
      collectiveRow('$quick.decay', 'DECAY', 'decay', drumStagePaths,
        { min: 0, def: 0.12 }),
      quickCutoffRow(),
      ...(getAt(voice, '$osc') ? [n('$knock', 'PUNCH', 0, 1, 0.01, fixed(2), 0)] : []),
      n('$drive', 'DRIVE', 0, 1, 0.01, fixed(2), 0),
      n('$quick.taps', 'TAPS', 1, MAX_TAPS, 1, (x) => String(Math.round(x)), 1, '', null, {
        read: (_raw, v) => tapCount(v),
        write: (x, v) => { setTapCount(v, x); return SKIP_WRITE; },
      }),
    ];
    return rows;
  }

  if (voice.synth === 'TNGR-2') {
    return [
      n('$trim', 'LEVEL', -6, 6, 0.1, fixed(1), 0, 'dB'),
      n('$tngr2.quick.position', 'POSITION', 0, 1, 0.01, fixed(2), 0, '', null, {
        read: (_raw, v) => Number(v.tngr2?.oscA?.position ?? 0),
        write: (x, v) => {
          v.tngr2 ||= {}; v.tngr2.oscA ||= {}; v.tngr2.oscB ||= {};
          const a = Number(v.tngr2.oscA.position ?? 0);
          const b = Number(v.tngr2.oscB.position ?? a);
          const delta = Number(x) - a;
          v.tngr2.oscA.position = Number(x);
          v.tngr2.oscB.position = Math.min(1, Math.max(0, b + delta));
          return SKIP_WRITE;
        },
      }),
      n('$tngr2.quick.motion', 'MOTION', 0, 1, 0.01, fixed(2), 0, '', null, {
        read: (_raw, v) => Math.max(Math.abs(Number(v.tngr2?.oscA?.envAmount ?? 0)), Math.abs(Number(v.tngr2?.oscA?.lfoAmount ?? 0))),
        write: (x, v) => {
          v.tngr2 ||= {}; v.tngr2.oscA ||= {};
          const env = Number(v.tngr2.oscA.envAmount ?? 0);
          const lfo = Number(v.tngr2.oscA.lfoAmount ?? 0);
          const current = Math.max(Math.abs(env), Math.abs(lfo));
          const target = Math.max(0, Math.min(1, Number(x) || 0));
          if (current < 0.0001) {
            // An Init patch has no motion to scale. Give the first positive move a
            // deterministic ENV destination rather than multiplying zero by a ratio.
            v.tngr2.oscA.envAmount = target;
            v.tngr2.oscA.lfoAmount = 0;
          } else {
            const ratio = target / current;
            v.tngr2.oscA.envAmount = Math.max(-1, Math.min(1, env * ratio));
            v.tngr2.oscA.lfoAmount = Math.max(-1, Math.min(1, lfo * ratio));
          }
          return SKIP_WRITE;
        },
      }),
      n('$tngr2.filter.cutoff', 'BRIGHTNESS', 20, 18000, 1, hz, 8000, 'Hz'),
      envTime('$tngr2.amp.attack', 'ATTACK', 0, secs, 0.01),
      envTime('$tngr2.amp.release', 'RELEASE', 0, secs, 0.25),
    ];
  }

  return [
    n('$trim', 'LEVEL', -6, 6, 0.1, fixed(1), 0, 'dB'),
    collectiveRow('$quick.attack', 'ATTACK', 'attack', mrdrStagePaths,
      { min: 0.001, def: 0.01 }),
    collectiveRow('$quick.decay', 'DECAY', 'decay', mrdrStagePaths,
      { min: 0, def: 1 }),
    collectiveRow('$quick.release', 'RELEASE', 'release', mrdrStagePaths,
      { min: 0, def: 0.015 }),
    quickCutoffRow(),
    quickResonance(),
    quickEnvAmount(),
    // The same key, the same range and the same taper the Advanced VIB DEPTH pot has —
    // every other Quick pot inherits its curve from the helper it shares with Advanced
    // (`envTime`, `cutoffHz`, `resQ`), and this one is written out longhand, so it has
    // to say so. Cubed, 0.1 semitones sits a fifth of the way round instead of at one
    // percent, which is the difference between aiming a singer's wobble and jumping
    // clean over it with the smallest move the mouse can make.
    n('$vibrato.depth', 'VIBRATO', 0, 12, 0.01, fixed(2), 0, 'semi', null,
      { scale: VIB_DEPTH_SCALE }),
  ];
};

/**
 * The strip surface for the current preset.
 *
 * This is deliberately resolved from the voice on every build. A lane can move from
 * MRDR-3's compact Quick surface to a GameSynth/Tone surface without changing the
 * editor element, so retaining the previous surface here would leave the old controls
 * attached to the new sound.
 */
export function stripPanelSpec(voice = {}) {
  const common = { title: isOneShot(voice) ? 'Level' : 'Note', rows: commonRows(voice) };
  const groups = voice.kind === 'noise' ? NOISE_GROUPS
    : voice.kind === 'drum' ? DRUM_GROUPS
      : (SYNTH_GROUPS[voice.synth] || []);
  if (isQuickVoice(voice)) {
    return { mode: 'quick', groups: [{ title: 'Quick', rows: quickRows(voice) }] };
  }
  return { mode: 'detailed', groups: [common, ...groups] };
}

// ---- the full-window layout -------------------------------------------------

/**
 * WHERE EVERY CONTROL SITS IN THE FULL-WINDOW EDITOR.
 *
 * The strip has no layout worth the name: it stacks the cards in declaration order down a
 * 366px column and scrolls. A window six columns wide has to say which card goes where,
 * and that is a second arrangement of the same 169 controls — which is exactly the kind of
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
 *   · the oscillator card is SPLIT. Everything that balances one layer against the other
 *     two — level, interval, detune, unison, gate, delay — goes up into the layer's own
 *     cell at the top of the window, where all three stand side by side. WAVE and COLOUR
 *     stay down in a card of their own, because they are the question the modulator
 *     sections answer and they were being asked a row away from it.
 *   · that card carries the modulator the wave actually has: PWM as a sub-section on a
 *     pulse, FM as a sub-section on the other five. The one that does not apply is behind
 *     the header's door (FM, on a pulse) or absent (PWM, on anything else) — never a rule
 *     over five dead controls.
 *   · PLS WIDTH is PULLED out of the oscillator's rows into the PWM sub-section — the one
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
 * Ordered by what they are, not by the panel's order: where it sits (INTERVAL, DETUNE),
 * how many of it there are (UNISON, SPREAD, STEREO), and when it plays (GATE, DELAY).
 *
 * WAVE and COLOUR are NOT here. They went down to the OSC card, where the modulation that
 * acts on the wave — PWM on a pulse, FM on everything else — now sits directly under them:
 * choosing a waveform and shaping it is one question, and it was being asked in two cells.
 * What the cell has instead is the wave's NAME in its header (`LAYER 1 · SQUARE`), so the
 * three layers still compare at a glance without carrying the picker three times over.
 */
const MIXER_ROWS = ['ratio', 'detune', 'unison', 'spread', 'stereo', 'len', 'delay'];

/**
 * THE KLNG8'S FULL WINDOW: six tall columns, one band, no scroll.
 *
 * It was nine cards on three bands, each card a third of the window wide. A third of
 * 1600px is 525 pixels, which is eight pot columns — so every section drew its four
 * source pots and its four envelope pots on ONE line, and the four that shape the level
 * over time sat in the same undifferentiated row as the four that say what is being
 * shaped. Wide cards did that; nothing else. The same eight pots in a 259px column are
 * two rows of four, with the envelope on its own (see `startRow` on every drum ATTACK),
 * and the card is read down the way a signal path is read.
 *
 * So the cards halve in width and roughly double in height, and the window holds them
 * side by side in one band instead of stacking three bands of squat ones. Two joins make
 * six columns out of nine cards, and both are the same move the MRDR-3 window already
 * makes — a section that only ever qualifies another section is a sub-section OF it, not
 * a card of its own:
 *
 *   · FM goes under the OSCILLATOR it bends. It is the modulator of that one source and
 *     nothing else, exactly as PWM and FM hang off an MRDR-3 layer's wave.
 *   · DRIVE and HUMANISE go under MASTER. Both act on the finished hit rather than on
 *     any one source, which is what MASTER is: trim, tune, and what happens to the sum.
 *
 * TAPS keeps its own card because it is not a set of rows — it builds its own body, one
 * knob per repeat, and its length is the number of hits.
 */
function buildDrumFullLayout(voice, problems) {
  const { common, groups } = panelSpec(voice);
  const byKey = new Map(groups.map((g) => [g.key, g]));
  const placed = new Map();
  const seen = new Set();
  for (const r of [...common.rows, ...groups.flatMap((g) => g.rows || [])]) seen.add(r.path);

  const take = (key) => {
    const g = key === 'note' ? common : byKey.get(key);
    if (!g) {
      problems.push(`no card keyed '${key}'`);
      return { key, title: key, rows: [], group: { key, title: key } };
    }
    for (const r of g.rows || []) placed.set(r.path, [...(placed.get(r.path) || []), key]);
    return { key, title: key === 'note' ? 'MASTER' : g.title, group: g, rows: g.rows || [] };
  };
  /**
   * The same card, taken as a SUB-SECTION of another one: a labelled rule and the rows
   * under it. `rule` is the name it wears there — upper case, the way every rule on this
   * window is written — and the GROUP travels with it, so the section keeps its own
   * switch and its own on/off tips rather than becoming rows nobody can turn off.
   *
   * Its rows are the card's own, marked placed by `take` on the way through: a section
   * moved into another card is still placed exactly once, and the walk below still
   * catches it if it is ever placed twice or dropped.
   */
  const asSub = (key) => {
    const card = take(key);
    return { rule: String(card.title).toUpperCase(), group: card.group, rows: card.rows };
  };

  /**
   * TAPS, as a door in the Master card's header rather than a column of its own.
   *
   * It is the one card here that is not part of the signal path — every other column is
   * something the sound goes THROUGH, where this is how many times the whole of it is
   * played. It is also the card most presets have nothing in: fifteen drums in the
   * catalogue use taps and every other one is a single hit, so a sixth of the window was
   * a header and a sentence saying "not this one" on every kick, hat and rim.
   *
   * The COUNT rides on the button — `TAPS` at one hit, `TAPS 3` at three — so what the
   * door hides is the detail and never the fact. That is the job `.sflit`'s dot does for
   * FM, done with the number itself, because here there is a number to do it with.
   *
   * `take` on the way past is what keeps the completeness walk honest: the group is
   * placed exactly once whether it ends up in a cell or behind a button.
   */
  const tapsDoor = () => ({ ...take('taps'), taps: true, label: tapsDoorLabel(voice) });

  /**
   * The envelope, cut off the end of a card's rows and hung from its floor.
   *
   * `foot` marks where the block starts — every drum ATTACK carries it, and the block
   * runs from there to the end of the section. Split out, it is drawn as a grid of its
   * own, and the card's spare height opens ABOVE it instead of below: five sections of
   * very different lengths then read their envelopes off ONE line across the band. It is
   * the alignment `startRow` already gives the block inside its own card, given to the
   * band — which was the last thing on this window still landing wherever the rows above
   * it happened to stop.
   *
   * A card with no `foot` row is returned untouched, which is Master and every card on
   * the MRDR-3 window: an envelope is not a thing every section has.
   */
  const splitFoot = (card) => {
    const at = (card.rows || []).findIndex((r) => r.foot);
    if (at < 0) return card;
    return { ...card, rows: card.rows.slice(0, at), foot: card.rows.slice(at) };
  };

  // One band, six columns, one card each.
  //
  // EVERY card reads from the TOP (`top`) and SPREADS what is left over (`spread`), where
  // the MRDR-3 window hangs everything from the bottom. There, a band is three cards of
  // roughly the same length, so one baseline serves the lot. Here the band is the whole
  // instrument: an oscillator runs to twice the height of the Metal card beside it, and
  // bottom-aligning would push each card's contents down by however much shorter than the
  // oscillator it happens to be, opening the gap under six different headers.
  //
  // So the blocks divide the slack between them instead of banking it. A card is a title,
  // its source rows, whatever sub-sections it carries and its envelope; each block hangs
  // off the one above with an equal share of the spare height, and the LAST one lands on
  // the floor. Which does two things at once: Master's DRIVE and HUMANISE stop huddling
  // under the header with two hundred pixels of nothing beneath them, and every envelope
  // in the band comes to rest on the same line. See `.sfspread`.
  //
  // `flowSub` stays on, and it is what makes the spread possible rather than a leftover:
  // it turns OFF the `sffoot` pin, which banks every spare pixel above the FIRST
  // sub-section — the opposite of dividing it, and the reason Master's two rules sat
  // where they did.
  //
  // `curves: true` on the three cards carrying one: CURVE and RATE CURVE go behind the
  // header's curve door, drawn as the shapes they are, the way MRDR-3's stage curves do.
  //
  // FM HAS A COLUMN OF ITS OWN, directly after the oscillator it bends. It was a
  // sub-section pinned under OSC — five pots and a rule below eleven of the oscillator's,
  // on the one card already twice the length of any other — and it was down there because
  // the band was full. Taps behind a door is what freed the column, and a modulator with
  // its own wave, ratio, index and envelope reads as a section rather than as an appendix
  // now that it has one.
  const top = { top: true, flowSub: true, spread: true };
  const bands = [
    { name: 'chain',
      cols: 6,
      cells: [
        { kind: 'card', span: 1, curves: true, card: splitFoot({ ...take('osc'), ...top }) },
        { kind: 'card', span: 1, card: splitFoot({ ...take('osc.fm'), ...top }) },
        { kind: 'card', span: 1, curves: true, card: splitFoot({ ...take('noise'), ...top }) },
        { kind: 'card', span: 1, curves: true, card: splitFoot({ ...take('ring'), ...top }) },
        { kind: 'card', span: 1, card: splitFoot({ ...take('metal'), ...top }) },
        { kind: 'card',
          span: 1,
          card: { ...take('note'),
            ...top,
            sub: [asSub('drive'), asSub('humanise')],
            panels: [tapsDoor()] } },
      ] },
  ];

  const label = (path) => [...common.rows, ...groups.flatMap((g) => g.rows || [])]
    .find((r) => r.path === path)?.label ?? '?';
  for (const path of seen) {
    if (!placed.has(path)) problems.push(`UNPLACED  ${label(path)}  ${path}`);
  }
  for (const [path, where] of placed) {
    if (where.length > 1) problems.push(`PLACED ${where.length}×  ${label(path)}  ${path}  (${where.join(', ')})`);
    if (!seen.has(path)) problems.push(`PLACED BUT NOT A ROW  ${path}`);
  }
  return { synth: 'KLNG8', kind: 'drum', layer: 1, total: seen.size, bands };
}

export function fullLayout(voice = {}, { layer = 1 } = {}) {
  const problems = [];
  const built = buildFullLayout(voice, layer, problems);
  if (problems.length) {
    throw new Error(`fullLayout(${voice.synth || voice.kind}): ${problems.length} problem(s)\n  `
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

// TNGR-2 has two oscillator cards plus motion, filter and amp/voice. Keep this layout
// deliberately data-driven: panelSpec is the ownership list, and this walk makes every
// control appear exactly once in the full-window surface.
function buildTngr2FullLayout(voice, problems) {
  const { common, groups } = panelSpec(voice);
  const placed = new Map();
  const seen = new Set([...common.rows, ...groups.flatMap((g) => g.rows || [])].map((r) => r.path));
  const take = (group, key) => {
    const rows = group.rows || [];
    for (const row of rows) placed.set(row.path, [...(placed.get(row.path) || []), key]);
    return { key, title: group.title || key, group, rows };
  };
  // The three cards whose whole job is a shape get that shape drawn: MOTION and AMP are
  // envelopes, FILTER is a response curve. Same widgets MRDR-3 uses, bound to these rows.
  // MOTION's envelope has no release stage — the position walk holds where its decay
  // leaves it — and the FILTER card has no SLOPE pill, because a native biquad has one
  // slope. Both are declined cleanly by `byLabel`; see `mixer-synth-full.js`.
  const GRAPHS = { motion: 'env', filter: 'filter', filterenv: 'env', amp: 'env' };
  /*
   * THREE ROWS, NOT EIGHT COLUMNS.
   *
   * A card in its own column is as tall as the tallest card in the band and as narrow as
   * an eighth of the window — which on eight cards meant eight thin strips of mostly air,
   * each with its four pots stacked in a single file down the bottom. The cards go in
   * rows instead: wider, so a card's own grid fits more pots across and needs fewer lines
   * to hold them, and shorter, because a band is only as tall as its own contents.
   *
   * Grouped by what you reach for together — the two oscillators, then what moves and
   * shapes them, then how they come out and how the note behaves.
   */
  const byKey = new Map(groups.map((group) => [group.key || group.title, group]));
  // Graphs at the default height — the one MRDR-3 draws at. Bigger was tried and is too
  // much: a curve twice the height of the pots under it stops being a readout of the
  // card and starts being the card.
  // The two oscillator cards lay their LEVEL along the top as a fader, the way MRDR-3's
  // layers do — the same pot, lying down, with the width to be aimed.
  const FADERS = { oscA: 'LEVEL', oscB: 'LEVEL' };
  // The three envelope cards put their stage curves behind a door, as MRDR-3 does.
  const CURVED = new Set(['motion', 'filterenv', 'amp']);
  // A COLUMN IS AS WIDE AS THE ROW IT HAS TO FIT, AND NO WIDER.
  //
  // The band's track is ONE POT WIDE and fixed, and a cell spans as many tracks as its
  // widest row has knobs. So every pot on the window sits on the same pitch whichever card
  // it is in, and the window is the sum of those tracks and nothing else.
  //
  // FOUR ACROSS EVERYWHERE. The oscillators used to want five, which made them a column
  // wider than anything else; broken into three rows — tuning, stack, movement — their
  // longest line is four as well, which is what an ADSR is. Four equal columns, and the
  // window came in by a further pot.
  const potsFor = () => 4;
  const cell = (key, group) => ({
    kind: 'card',
    span: potsFor(),
    graph: GRAPHS[key] || null,
    fader: FADERS[key] || null,
    curves: CURVED.has(key),
    // Card WIDTH, in pots to a row: the oscillators take five, so INTERVAL, DETUNE,
    // POSITION and the two MOVE amounts read as one line; everything else takes four,
    // which is what an ADSR is. A card that fits its own longest row exactly is one
    // that never wraps a control onto a line of its own.
    // The oscillators bottom-align their grid like every other card on the band, so their
    // last pot row lands on the same line as the filter's CUTOFF and the envelopes' ATTACK.
    // They were hung from the top for a while, back when they were a full-height column
    // and bottom-aligning banked the whole of that spare height in one gap under the
    // fader. Three pot rows instead of five, in a card half the height, and the slack is
    // now the breathing room the fader wanted anyway.
    card: SPLIT[key]
      ? splitAt({ ...take(group, key), pots: potsFor(), top: true, spread: true }, SPLIT[key])
      : { ...take(group, key), pots: potsFor() },
  });
  /*
   * TWO BLOCKS TO A CARD, WITH THE SLACK BETWEEN THEM.
   *
   * SETTINGS and EFFECTS are each two unrelated things sharing a frame: how the preset is
   * tuned and played, and then its vibrato; what the drive IS, and then its chorus. Run
   * together as one list they read as one list, and the reader has to find the seam.
   *
   * So each is hung from the top and its second half pinned to the floor, and the card's
   * spare height becomes the rule between them. Split by LABEL and only here, because it
   * is this window's arrangement rather than a property of the rows — the strip shows the
   * same controls as one list and is right to.
   */
  const splitAt = (card, label) => {
    const at = (card.rows || []).findIndex((r) => r.label === label);
    if (at < 0) return card;
    return { ...card, rows: card.rows.slice(0, at), foot: card.rows.slice(at) };
  };
  const SPLIT = { note: 'VIB DEPTH', effects: 'CHORUS' };
  // SETTINGS is titled from FULL_TITLES like every other window card, so it says the same
  // word here as it does on MRDR-3 rather than the strip's 'Note' — this card is
  // everything about how the preset is PLAYED.
  const settings = {
    kind: 'card',
    span: 4,
    card: splitAt(
      { ...take(common, 'note'), title: FULL_TITLES.note, pots: 4, top: true, spread: true },
      SPLIT.note,
    ),
  };
  /*
   * ONE ROW OF FOUR COLUMNS, EVERY ONE OF THEM A PAIR.
   *
   * The oscillators used to take a full-height column each, on the belief that they would
   * fill it. Measured, they do not: an oscillator card is about the same height as one
   * envelope card, so a column of its own was a card and an equal amount of air, and the
   * band was as tall as the PAIRS beside it either way.
   *
   * So they pair with each other, like everything else: four columns, each a thing and
   * the thing that shapes it. The columns are NOT equal and the band does NOT fill the
   * window — see `potsFor` and `.sfband-tngr2`. Sixteen fixed tracks of one pot each, four
   * to a column; the band takes the width it needs and gives the remainder of the screen
   * back.
   */
  const stack = (...keys) => ({
    kind: 'stack',
    span: potsFor(),
    cards: keys.map((key) => (key === 'note' ? settings : cell(key, byKey.get(key)))),
  });
  const cells = [
    stack('oscA', 'oscB'),
    // FILTER over MOTION, so the filter and its envelope sit side by side on the top row
    // and are read as the one thing they are. What moves the table is underneath it, the
    // amp envelope under the filter's, and how the preset is played beside what is done
    // to it after.
    stack('filter', 'motion'),
    stack('filterenv', 'amp'),
    stack('note', 'effects'),
  ];
  // ONE POT WIDE, and the number lives here rather than in the stylesheet because the
  // keyboard under the band is sized from it too — see `--sf-boardw` in `createSynthFull`.
  const bands = [{
    name: 'tngr2', track: 70, cols: cells.reduce((n, c) => n + c.span, 0), cells,
  }];
  for (const path of seen) {
    if (!placed.has(path)) problems.push(`UNPLACED ${path}`);
  }
  for (const [path, where] of placed) {
    if (where.length > 1) problems.push(`PLACED ${where.length}× ${path}`);
  }
  return { synth: 'TNGR-2', total: seen.size, bands };
}

function buildFullLayout(voice, layer, problems) {
  if (voice.kind === 'drum') return buildDrumFullLayout(voice, problems);
  if (voice.synth === 'TNGR-2') return buildTngr2FullLayout(voice, problems);
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
    const oscKey = `osc${N}`;
    const width = takeRow(oscKey, `$${p}.width`, `${oscKey}.pwm`);
    const wave = takeRow(oscKey, `$${p}.type`, oscKey);
    const colour = takeRow(oscKey, `$${p}.color`, oscKey);
    const pwm = take(`${oscKey}.pwm`);
    const fm = take(`${oscKey}.fm`);
    const osc = byKey.get(oscKey);
    // WHICH MODULATOR THIS CARD IS ABOUT, decided by the wave you picked.
    //
    // A pulse is the only wave with a width to move, so PWM is real on exactly one of the
    // six and dead on the other five. FM is real on all six. Rather than show both — one
    // of them greyed most of the time — the card shows the one that applies IN THE GRID
    // and puts the other behind the door:
    //
    //   pulse   → PWM's five controls under the wave, FM behind the header's FM button
    //   anything else → FM's five under the wave, and no PWM at all
    //
    // Both are still TAKEN either way, so the exactly-once walk sees them whatever the
    // preset's wave is — this decides where they are DRAWN, not whether they exist.
    const isPulse = getAt(voice, `$${p}.type`) === 'pulse';
    // `when` dropped: it is the layer's own on/off, and the card above already greys as a
    // whole on an off layer. Left on, the section would vanish out of a card that is
    // otherwise still standing there saying what it would say.
    const fmSection = { rule: 'FM', ...fm,
      group: { ...fm.group, when: (v) => !isSyncedSlave(v, N) } };
    // PWM in FM's shape: the modulator's own WAVE first, then its four pots in one row.
    // The pick came third in the panel's order, which put two pots above it and two below
    // and cost the card a whole extra row of height for four controls — and the two
    // sections sitting in the same place on the same card read as one thing when their
    // rows are in the same order. PLS WIDTH leads the pots because it is what the other
    // three move.
    const pwmPick = pwm.rows.find((r) => r.kind === 'pick');
    const pwmSection = { rule: 'PWM', ...pwm,
      rows: [pwmPick, width, ...pwm.rows.filter((r) => r !== pwmPick)].filter(Boolean) };
    return [
      // The oscillator card is what a layer IS: the wave, and the thing modulating it.
      //
      // Everything else the strip's Osc card held — level, interval, detune, unison, gate,
      // delay — is up in the layer's own cell, where all three layers stand side by side
      // and you build the stack by comparing them. What could not go up is the pair of
      // questions that only make sense against a WAVE: the wave itself, its noise colour,
      // and whichever modulator applies to it. So they came down here together.
      { kind: 'card', span: 1, layer: N,
        card: {
          key: `${oscKey}.wave`,
          title: `OSC ${N}`,
          // FOUR POTS ACROSS, not the window's usual three.
          //
          // This is the only card that carries a modulator's whole set of four under a
          // rule, and at three columns those four are 3+1 — a row and a half of pots for
          // a section, twice over if the wave ever changed under you. The columns are
          // narrower (a 46px pot in ~52px rather than ~58) which is a tighter fit for a
          // label; every label in here is short enough for it, and the ones that are not
          // ellipsis to a tooltip exactly as they do everywhere else. The rest of the
          // window keeps its three: those cards hold envelopes, and ATTACK DECAY SUSTAIN
          // RELEASE reads better as 3+1 than squeezed.
          grid: 4,
          // And read from the TOP. This card's height changes with the wave you pick —
          // PWM's five rows, or FM's five, or neither on a layer that is off — so there is
          // no fixed row of pots for the band's baseline to line up with, and bottom-
          // aligning it left the wave picker sitting under a card's worth of air.
          top: true,
          // The osc group, minus its switch: the layer's on/off is already a capsule in
          // the cell above, and the same state offered twice is how the two get out of
          // step in your head. `when` stays, so an off layer greys the card out.
          group: { ...osc, optional: null,
            when: N === 1 ? null : (v) => sectionOn(v, p) },
          rows: [wave, colour].filter(Boolean),
          // FM in the grid on five waves out of six, behind the door on the sixth — where
          // PWM has the room and FM is the second modulator rather than the only one.
          panels: isPulse ? [{ label: 'FM', title: `Osc ${N} · FM`, ...fm }] : [],
          // PWM is listed either way and drops itself: its group's `when` is "the wave is
          // a pulse", which is the same test `isPulse` makes, so the renderer skips it on
          // the other five waves. Listing it unconditionally keeps the card's row count
          // equal to the controls it OWNS rather than to the ones it happens to be
          // showing — which is what tests/synth-full-layout.js counts.
          sub: isPulse ? [pwmSection] : [pwmSection, fmSection],
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

  // Every layer is walked, so the check covers all 169 controls — but only the selected
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
    // The wave is a READING here, and not even a row — the picker is down on the OSC card
    // now, and this is its name in the cell's header so the three layers still say what
    // they are side by side. A path rather than a row because nothing in the cell writes
    // it; naming the path keeps the renderer from hard-coding `layer.oscN.type` itself.
    return { kind: 'mixer', span: 1, layer: N, group: g, fader, rows,
      wavePath: `$layer.osc${N}.type` };
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
    // Effects last, which is where it happens: it is the only card on this band that is
    // not part of the voice's own shaping but the stages AFTER it — the whole stack
    // summed, then pushed, then widened. Ending the row on it reads left-to-right as the
    // signal actually runs, and it stays true with PLACE set to PRE: what moves in front
    // of the global stage is the drive, not the card.
    { kind: 'card', span: 1, card: take('effects') },
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

function deleteAt(preset, path) {
  const ks = keysOf(path);
  let o = rootOf(preset, path);
  for (let i = 0; i < ks.length - 1; i++) {
    o = o?.[ks[i]];
    if (o == null) return;
  }
  delete o[ks[ks.length - 1]];
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
  // Optional-section toggles and filter-envelope zero crossings change the native MRDR
  // graph/trajectory rather than a live Tone parameter. Hosts use this seam to clear
  // already-queued audition notes so the next hit is an unmistakable read of the
  // bypassed filter/VCA/envelope, without stopping the song or standalone scheduler.
  onSectionChange = () => {},
  onBlank = () => {},
  ask = null,
  isDevUser = () => false,
  // Whether there is anywhere to file a preset. False on the deployed desk, which has no
  // server behind it: the save and delete routes are the only two things in this panel
  // that leave the page, and without them the footer is Revert. Everything else here —
  // every pot, every pill, every bypass — is local and works exactly the same.
  canFile = () => true,
  // Live level compensation is useful when a desk has no safety limiter, but it is
  // distracting in a protected audition path: every edit can otherwise rewrite the
  // gain used by the next note. Hosts may supply a function so the policy follows the
  // current master-limiter state rather than being copied into the editor.
  liveCompensation = true,
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
  // The full-window header can move to another preset without importing the catalogue.
  // These callbacks are deliberately supplied by the host: the Song Mixer needs lane
  // rebinding, while the standalone page needs a session-only copy.
  listPresets = () => [],
  selectPreset = null,
  sharePreset = null,
  auditionNote = () => {},
  releaseAudition = () => {},
  panicAudition = () => {},
  midiState = () => ({ on: false, inputs: [] }),
  toggleMidi = async () => false,
  midiAdapter = null,
}) {
  // What is being edited: the live catalogue entry, plus what it looked like when the
  // panel opened. Edits go straight into VOICES[id] — that object IS what the engine
  // reads at play time, which is the whole reason a change is audible before it is
  // saved — so the baseline is the only way back.
  let state = null;
  const liveCompensationOn = () => typeof liveCompensation === 'function'
    ? !!liveCompensation() : !!liveCompensation;

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

  // Undo stores the editable sound plus its measured loudness. Runtime identity stays on
  // the live object, while the level/peak travel with the snapshot so undo does not make a
  // preset temporarily jump to the wrong gain while its next estimate is pending.
  //
  // AND THE HISTORY IS THE PRESET'S, NOT THE PANEL'S. It is dropped wherever the panel
  // stops describing the same sound — a different preset opened, the panel blanked, the
  // preset let go — so ⌘Z can never reach back past the thing on screen and step an
  // earlier preset backwards behind your back. `open`, `blank` and `forget` are the three
  // doors, and all three reset. Null snapshots are what a blank panel captures: there is
  // no preset, so there is nothing to go back to.
  const historySnapshot = () => (state?.voice ? {
    voice: asPreset(state.voice),
    level: state.voice.level,
    peak: state.voice.peak,
    measured: state.measured,
    estimated: state.estimated,
    silent: state.silent,
  } : null);
  const undoHistory = createUndoHistory({
    capture: historySnapshot,
    restore: (snapshot) => {
      if (!snapshot || !state?.voice) return;
      replaceVoiceContents(state.voice, snapshot.voice);
      state.voice.level = snapshot.level;
      state.voice.peak = snapshot.peak;
      state.measured = snapshot.measured;
      state.estimated = snapshot.estimated;
      state.silent = snapshot.silent;
    },
  });
  const historyChanged = () => full?.syncHistory();
  const matchesBaseline = () => JSON.stringify(asPreset(state.voice))
    === JSON.stringify(state.baseline)
    && state.voice.level === state.levelBaseline
    && state.voice.peak === state.peakBaseline;

  /** Put the live sound back exactly where this editor opened it. */
  const discardChanges = () => {
    if (!state?.voice || matchesBaseline()) return false;
    replaceVoiceContents(state.voice, state.baseline);
    state.voice.level = state.levelBaseline;
    state.voice.peak = state.peakBaseline;
    state.dirty = false;
    state.measured = !state.isNew;
    state.estimated = false;
    state.silent = false;
    undoHistory.reset();
    historyChanged();
    estimateSeq++;
    clearTimeout(estimateTimer);
    if (state.voice.songLocal) VOICES[state.id] = state.voice;
    refresh(state.id);
    onEdit(state.id, asSongPreset(state.voice), { undo: false });
    onDirty(state.id, false);
    panicAudition();
    onChanged();
    build({ keepScroll: false });
    full?.onVoiceChanged();
    return true;
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
    state.measured = false;      // the level on file no longer describes this sound
    undoHistory.touch();
    historyChanged();
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
    if (gesturing) editDeferred = true;
    else onEdit(state.id, asSongPreset(state.voice));
    onDirty(state.id, true);
    scheduleEstimate();
    paintFoot();
  };

  // ---- the live level ------------------------------------------------------

  let estimateTimer = null;
  let estimateSeq = 0;
  // Whether a control is under the hand right now. Every pot brackets its gesture with
  // `onStart`/`onEnd` (see `numRow`), so this is true from the pointer going down to it
  // coming up — including the whole of a drag that is sitting still against a stop.
  let gesturing = false;
  // A song-owned voice is persisted with a synchronous clone + localStorage write.
  // Keep the live VOICES object moving under the hand, but do that heavier book-keeping
  // once per gesture rather than once per pointer pixel.
  let editDeferred = false;

  /**
   * Re-measure the level, once the hand is off the control.
   *
   * The 80 ms debounce alone was not enough, and the way it failed is the one the ear
   * notices: a drag that has run a pot to its stop stops CHANGING while it is still
   * being held — you are past the end of the travel, the value cannot move, and the
   * pointer moves are no longer edits. The timer fired into the middle of the gesture,
   * a fresh level landed under the hand, and the next note came out at a loudness
   * nobody had asked for. At an ATTACK's ten-second stop, where one second of render
   * reads as near-silence, that was tens of decibels of it. See MAX_LEVEL_BOOST in
   * src/data/voices.js, which is the other half of this: the ceiling that means a bad
   * measurement can no longer be dangerous, only wrong.
   *
   * So the estimate waits for the gesture to end. Nothing else changes: a pill, a type-in
   * or a click still measures on its own 80 ms, because those have no hold to wait for.
   */
  let estimateDeferred = false;
  const scheduleEstimate = () => {
    clearTimeout(estimateTimer);
    if (!liveCompensationOn()) { estimateDeferred = false; return; }
    // `endGesture` schedules it on the way out — but only if an edit actually landed,
    // so a pot that was grabbed and let go without moving costs no render.
    if (gesturing) { estimateDeferred = true; return; }
    estimateTimer = setTimeout(runEstimate, 80);
  };

  const beginGesture = () => { gesturing = true; undoHistory.begin(); };
  const endGesture = () => {
    undoHistory.end();
    if (!gesturing) return;
    gesturing = false;
    if (editDeferred) {
      editDeferred = false;
      onEdit(state.id, asSongPreset(state.voice));
    }
    if (!estimateDeferred) return;
    estimateDeferred = false;
    scheduleEstimate();
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
    if (!liveCompensationOn() || !state || state.rawBaseline == null) return;
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
      undoHistory.sync();
      historyChanged();
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
    undoHistory.sync();
    historyChanged();
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
      // A full-window card stays in the grid when its section is OFF.  Unlike a row
      // guard, this has to cover controls added after the card body is built (graphs,
      // sub-sections and popovers), while leaving only the card's own re-enable switch
      // usable.  `panel` is deliberately separate from `push`: it must not re-enable a
      // row that another guard has disabled when the panel itself is live again.
      panel: (el, when, keep = () => false) => list.push({ el, when, panel: true, keep }),
      clear: () => { list.length = 0; },
      drop: () => { guardSets.delete(set); },
      sync: () => {
        for (const g of list) {
          const on = !!g.when(state.voice);
          if (g.panel) {
            g.el.classList.toggle('vepaneloff', !on);
            for (const control of g.el.querySelectorAll('button, input, select, textarea')) {
              const allowed = on || g.keep(control);
              if (!allowed) {
                control.disabled = true;
                control.dataset.vePanelDisabled = '1';
              } else if (control.dataset.vePanelDisabled === '1') {
                control.disabled = false;
                delete control.dataset.vePanelDisabled;
              }
            }
            continue;
          }
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
  const numRow = (row, guards = rowGuards, onChange = null) => {
    const raw = getAt(state.voice, row.path);
    const cur = row.read ? row.read(raw, state.voice) : raw;
    const value = typeof cur === 'number' ? Math.min(row.max, Math.max(row.min, cur)) : row.def;
    const scale = typeof row.scale === 'function' ? row.scale(state.voice) : row.scale;
    const r = knob({
      min: row.min, max: row.max, step: row.step, value, reset: row.def, fmt: row.fmt,
      scale, origin: row.origin, taper: row.taper, floor: row.floor,
      onStart: beginGesture, onEnd: endGesture,
      onInput: (x) => {
        const previous = getAt(state.voice, row.path);
        const next = row.write ? row.write(x, state.voice) : x;
        if (next !== SKIP_WRITE) setAt(state.voice, row.path, next);
        // `raw` is what the path held BEFORE this move: an `after` that has to keep a
        // RELATION intact needs both ends of the change, and by now the voice only
        // carries the new one.
        row.after?.(x, state.voice, raw);
        touched();
        // Filter ENV AMOUNT is the envelope's OFF state. Only crossing zero is a
        // topology/audition boundary; ordinary bipolar amount drags remain live and do
        // not repeatedly cut the note under the pointer. This applies equally to every
        // layer filter and the shared global filter because they share this path shape.
        const current = getAt(state.voice, row.path);
        if (row.path?.endsWith('.filter.env.octaves')
          && (Math.abs(Number(previous) || 0) > 1e-9)
            !== (Math.abs(Number(current) || 0) > 1e-9)) {
          onSectionChange(row.path);
        }
        syncRows();
        onChange?.();
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
  const buildSeg = (row, cur, onChange = null) => {
    const seg = document.createElement('div'); seg.className = 'seg';
    // The current value leads the list if it is one this editor does not offer. Tone
    // takes `fmsquare5`, `pwm` and `amsine2`, and the imported presets use them; a
    // control that dropped the current value would rewrite the sound on open.
    const offered = row.optionsFor ? row.optionsFor(state.voice) : row.options;
    const options = offered.some((o) => String(o) === String(cur))
      ? offered : [cur, ...offered];
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
        undoHistory.begin();
        setAt(state.voice, row.path, row.write ? row.write(state.voice, o) : o);
        for (const other of seg.children) other.classList.toggle('on', other === b);
        touched();
        // A pick can be what decides whether other rows apply — fat voicing turns the
        // stack controls on — so the panel re-reads its guards after every change.
        syncRows();
        // AMP is the per-layer VCA routing switch (ENV ↔ THROUGH). It rewires the
        // native note graph just like an optional filter toggle, so do not leave an
        // already-queued audition note speaking through the old topology.
        if (row.path?.endsWith('.vca')) onSectionChange(row.path);
        onChange?.();
        undoHistory.end();
      };
      seg.append(b);
    }
    return seg;
  };

  /**
   * A pick with too many options to be pills: a dropdown instead.
   *
   * Sixteen wavetable families laid out as pills is five wrapped lines of shouting
   * capitals — a third of the card spent saying what it could be, to show one thing it
   * IS. A closed dropdown says the current value in one line and puts the rest a click
   * away, which is the right trade the moment a list stops being scannable at a glance.
   *
   * Built on `details`/`summary` so it opens, closes and takes the keyboard without any
   * of that being written here, and styled as the preset picker in the window header is —
   * one dropdown in this desk, not two that resemble each other.
   */
  const dropRow = (row, guards = rowGuards, onChange = null) => {
    const cur = row.read ? row.read(state.voice) : (getAt(state.voice, row.path) ?? row.def);
    const wrap = document.createElement('div');
    wrap.className = 'row segrow vedroprow'
      + (row.wide === false ? '' : ' segwide')
      + (row.startRow ? ' rowstart' : '');
    if (row.tip) wrap.title = row.tip;
    const k = document.createElement('span'); k.className = 'k'; k.textContent = row.label;
    const drop = document.createElement('details');
    drop.className = 'vedrop';
    const summary = document.createElement('summary');
    const label = (option) => (row.optionLabel ? row.optionLabel(option) : String(option));
    summary.textContent = label(cur);
    drop.append(summary);
    const menu = document.createElement('div');
    menu.className = 'vedropmenu';
    for (const option of row.options) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'vedropoption' + (option === cur ? ' on' : '');
      item.textContent = label(option);
      item.onclick = () => {
        drop.open = false;
        if (option === cur) return;
        kit.pickWrite(row, option);
        // The whole panel repaints on a pick, as it does for pills: a table change can
        // grey other rows out. See `pickWrite`.
        onChange?.();
      };
      menu.append(item);
    }
    drop.append(menu);
    // Click anywhere else closes it — a details left open under a card that has since
    // repainted is a menu floating over controls it no longer belongs to.
    drop.addEventListener('toggle', () => {
      if (!drop.open) return;
      const shut = (e) => {
        if (drop.contains(e.target)) return;
        drop.open = false;
        document.removeEventListener('pointerdown', shut, true);
      };
      document.addEventListener('pointerdown', shut, true);
    });
    wrap.append(k, drop);
    if (row.when) guards.push(wrap, row.when);
    return { wrap, row };
  };

  const pickRow = (row, guards = rowGuards, onChange = null) => {
    if (row.dropdown) return dropRow(row, guards, onChange);
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
    // `startRow` means the same thing on a pick as it does on a pot: begin a fresh line.
    // A half-width pick flows in beside whatever came before it, and two picks that are
    // one question in two halves — TYPE and SLOPE — have to be the pair that lands
    // together rather than whichever two the flow happened to leave adjacent.
    wrap.className = 'row segrow' + (row.wide ? ' segwide' : '') + (wave ? ' segwave' : '')
      + (row.startRow ? ' rowstart' : '');
    if (row.tip) wrap.title = row.tip;
    const k = document.createElement('span'); k.className = 'k'; k.textContent = row.label;
    wrap.append(k, buildSeg(row, cur, onChange));
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
  const trioRow = (rows, guards = rowGuards, onChange = null) => {
    const wrap = document.createElement('div');
    wrap.className = 'row segrow segtrio';
    for (const row of rows) {
      const cur = row.read ? row.read(state.voice) : (getAt(state.voice, row.path) ?? row.def);
      const col = document.createElement('div'); col.className = 'segtriocol';
      const k = document.createElement('span'); k.className = 'k'; k.textContent = row.label;
      col.append(k, buildSeg(row, cur, onChange));
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

  // Every pot the strip is currently drawing, so the other surface can move them.
  const stripPots = [];

  /**
   * Re-read the strip's pots from the voice.
   *
   * The two surfaces share one `state.voice` and one write path, but not one set of
   * needles: a knob only moves when something tells it to, and the full window tells its
   * own. So an edit made in the window left the strip showing the values it was built
   * with — and because the Quick surface is macros OVER the advanced values (BRIGHTNESS
   * IS the filter cutoff), the whole panel read as though it were still on the preset you
   * opened rather than the one you are editing.
   *
   * Display only: this never writes, so there is no loop between the surfaces. A derived
   * row is re-read through its own `read`, which is what makes a macro follow the four
   * advanced controls underneath it.
   */
  function syncValues() {
    if (!state) return;
    for (const { row, set } of stripPots) {
      if (!set) continue;
      const raw = getAt(state.voice, row.path);
      const shown = row.read ? row.read(raw, state.voice) : raw;
      set(shown === undefined ? row.def : shown);
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
   *
   * ---- ONE ROW PER HIT ---------------------------------------------------------
   *
   * Everything under the stepper used to flow into the card's pot grid as one stream —
   * HIT 2, HIT 3, HIT 4, FALLOFF, PITCH, TONE, LEVEL 1…4, DECAY 1…4 — seventeen knobs
   * wrapping across four columns on a four-hit clap. Hit 2's timing sat above hit 1's
   * level, LEVEL 4 and DECAY 1 came out neighbours, and every column landed somewhere
   * new the moment the count changed. But the data is a TABLE: the same three numbers
   * per hit, however many hits there are. So it is drawn as one — a row per hit, a
   * column per number, the names said ONCE at the head rather than stamped onto
   * seventeen rings.
   *
   * WHICH columns exist is per PATH, not per card. `_playAdditive` never reads
   * `tapTone`, `_playNoise` never reads `tapDetune`, and a drum built from oscillators
   * alone has no noise decay to override — a pot on a path that cannot hear it is worse
   * than an absent one, because you spend an afternoon believing it. See `TAP_KEYS`: a
   * pooled Tone clap gets the timing column and nothing else.
   *
   * FALLOFF, PITCH and TONE stay OUT of the table, under a rule of their own. They are
   * not per-hit values but ratios BETWEEN hits — one number shaping the whole run — and
   * a column of them would be the same figure copied down the page.
   *
   * `repaint` is the surface that asked, exactly as it is for every other card — see
   * `groupCard`. It is the whole card that changes when the count does: the readout, the
   * rows, the walks and every per-hit pot appear and disappear with it, so the stepper
   * cannot redraw itself in place. Calling the strip's `build` directly is what it used
   * to do, and the strip is the surface this is least often reached from — a KLNG8
   * strip opens on Quick, and in the full window the card lives behind the Master card's
   * TAPS door, which redraws its own popover body so the panel does not shut under the
   * button you just pressed.
   */
  const tapsGroup = (repaint = build) => {
    const wrap = document.createElement('div'); wrap.className = 'vetaps';
    const taps = state.voice.taps || [0];
    const tapKeys = TAP_KEYS(state.voice);
    const many = taps.length > 1;

    // One markup for both surfaces, dressed by each in its own language for a choice —
    // the strip's boxed pills, the window's line of words over a hairline. That split is
    // `renderPick`'s, and a count from one to eight is the same kind of question a pick
    // asks, so it takes the same answer. What it must NOT do is carry `.segrow` or
    // `.sfchoice` itself: those two are what the surfaces put on their own picks, and
    // wearing one of them would make TAPS a strip control sitting on the window's card.
    // See the stepper's block in mixer-shell.html, which is also where the layout this
    // replaces is written up.
    const head = document.createElement('div'); head.className = 'row vesteprow';
    const k = document.createElement('span'); k.className = 'k'; k.textContent = 'TAPS';
    k.title = `How many times the sound is heard — one to ${MAX_TAPS}`;
    const box = document.createElement('div'); box.className = 'vestep';
    const readout = document.createElement('span'); readout.className = 'v';
    readout.textContent = String(taps.length);
    const step = (d) => {
      const list = (state.voice.taps || [0]).slice();
      if (d > 0) {
        if (list.length >= MAX_TAPS) return;
        // A new tap lands after the last by the gap the last one uses, so adding to a
        // clap keeps its rhythm instead of restarting it.
        const gap = list.length > 1 ? list[list.length - 1] - list[list.length - 2] : 0.012;
        list.push(Number((list[list.length - 1] + gap).toFixed(4)));
      } else if (list.length > 1) list.pop();
      else return;
      undoHistory.begin();
      // One tap at zero is what every preset without a `taps` key already does, so it
      // is written as no key at all rather than as an array saying nothing.
      if (list.length <= 1) { delete state.voice.taps; delete state.voice.tapFalloff; }
      else {
        state.voice.taps = list;
        if (state.voice.tapFalloff == null) state.voice.tapFalloff = 0.78;
      }
      touched();
      repaint();
      undoHistory.end();
    };
    // Dead at the ends rather than inert: a button that can still be pressed and does
    // nothing is a control you have to test to learn the range of.
    const btn = (text, d, title) => {
      const b = document.createElement('button');
      b.className = 'vestepbtn'; b.textContent = text; b.title = title;
      b.disabled = taps.length + d < 1 || taps.length + d > MAX_TAPS;
      b.onclick = () => step(d);
      return b;
    };
    box.append(btn('−', -1, 'One fewer repeat'), readout, btn('+', 1, 'One more repeat'));
    head.append(k, box);
    wrap.append(head);

    // FALLOFF and the per-hit LEVEL pots below read the same thing — a hit's level — so
    // dragging one has to move the other or the card contradicts itself mid-drag. Set by
    // the LEVEL column, and a no-op until then. `syncTimes` is the same arrangement
    // between SPREAD and the TIME column.
    let syncLevels = () => {};
    let syncTimes = () => {};
    // The other direction of the same pair: a hit dragged past the end of the run moves
    // where the run ENDS, which is what SPREAD reads. Without this it keeps the reading it
    // was built with, and the next spread scales the sound back to a number that stopped
    // being true several drags ago.
    let syncSpread = () => {};

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
    const near = (a, b) => Math.abs(a - b) < 1e-6;
    const overrideCol = (ov) => ({
      key: ov.key, label: ov.label, tip: ov.tip, dflt: ov.dflt,
      pot: (i) => knob({
        min: ov.min, max: ov.max, step: ov.step, fmt: ov.fmt, reset: ov.dflt(i),
        taper: ov.taper, floor: ov.floor,
        value: state.voice[ov.key]?.[i] ?? ov.dflt(i),
        onStart: beginGesture, onEnd: endGesture,
        onInput: (x) => {
          const list = Array.from({ length: taps.length },
            (_, j) => state.voice[ov.key]?.[j] ?? ov.dflt(j));
          list[i] = x;
          if (list.every((y, j) => near(y, ov.dflt(j)))) delete state.voice[ov.key];
          else state.voice[ov.key] = list.map((y) => Number(y.toFixed(4)));
          touched();
        },
      }),
    });
    const held = (key) => Array.isArray(state.voice[key]);
    const columns = [
      // The first hit is the sound itself, at nothing past nothing — an offset pot on it
      // would delay the whole preset, which is a different control on a different card.
      // So the column exists from two hits up and row 1 shows the zero it is fixed at.
      many && {
        key: 'taps', label: 'TIME', tip: 'How long after the first tap this one lands',
        pot: (i) => (i === 0 ? null : knob({
          min: 0.002, max: 0.2, step: 0.001, value: taps[i], reset: 0.012 * i,
          fmt: (x) => `${Math.round(x * 1000)}ms`,
          onStart: beginGesture, onEnd: endGesture,
          onInput: (x) => { state.voice.taps[i] = x; syncSpread(); touched(); },
        })),
      },
      tapKeys.gains && (many || held('tapGains')) && overrideCol({
        key: 'tapGains', label: 'LEVEL', min: 0, max: 2, step: 0.005, fmt: fixed(3),
        dflt: (i) => (state.voice.tapFalloff ?? 1) ** i,
        tip: 'This tap\'s own level, in place of the falloff',
      }),
      // A tap's DECAY is an envelope time like any other, so it takes the envelope
      // taper and the same 1ms floor — a clap's tail is dialled in the tens of
      // milliseconds, which linear travel across 600ms cannot resolve.
      tapKeys.decays && (many || held('tapDecays')) && overrideCol({
        key: 'tapDecays', label: 'DECAY', min: ENV_TIME_STEP, max: 0.6, fmt: secs,
        step: ENV_TIME_STEP, taper: ENV_TIME_TAPER, floor: ENV_TIME_STEP,
        dflt: () => decayDflt,
        tip: 'This tap\'s own length, in place of the section decay',
      }),
    ].filter(Boolean);

    // ---- the table -------------------------------------------------------------
    // One flat grid rather than a row element per hit: a row of pots and the name of the
    // column above it only line up if they are in the same grid, and a wrapper per row
    // would put them in one grid each. `--tapcols` is the only thing the layout needs
    // from here — the widths live in the stylesheet, with the pot size they have to clear.
    //
    // ---- and TWO OF THEM, side by side, where the surface is wide enough ---------
    //
    // Six hits down one column is six rows of pots plus the ratios under them, which is
    // taller than the room a popover has under its card — so the foot of the card was
    // being scrolled to. Split in half it is three rows, and the drawer holds the whole
    // of Taps at once.
    //
    // WHICH SURFACE IT IS is not asked and must not be: this card is on the strip too,
    // where 366px has no room for two of anything. So the blocks are built either way and
    // the STYLESHEET decides — `.vetaprows` wraps, and a block's flex-basis is wide enough
    // that two only fit side by side in the window's wide drawer. One list of hits, two
    // shapes, no branch on where it is being drawn.
    //
    // Balanced rather than filled: 5 hits is 3 + 2, not 3 + 2 with the second column
    // looking like an afterthought — and at 3 or fewer there is no second block at all,
    // because a column of one is a column that reads as a mistake.
    if (columns.length) {
      const levels = [];
      const times = [];
      const levelCol = columns.find((c) => c.key === 'tapGains');
      const timeCol = columns.find((c) => c.key === 'taps');
      const perBlock = taps.length > 3 ? Math.ceil(taps.length / 2) : taps.length;
      const tables = document.createElement('div'); tables.className = 'vetaprows';
      for (let from = 0; from < taps.length; from += perBlock) {
        const table = document.createElement('div'); table.className = 'vetaptable';
        table.style.setProperty('--tapcols', String(columns.length));
        const corner = document.createElement('span');
        corner.className = 'vetapn vetaphead'; corner.textContent = '';
        table.append(corner);
        // Each block carries the column names again. They are the names of the pots under
        // THEM — a heading that only appears over the left-hand block is a heading the
        // right-hand block is not under.
        for (const col of columns) {
          const h = document.createElement('span');
          h.className = 'vetaphead'; h.textContent = col.label; h.title = col.tip;
          table.append(h);
        }
        for (let i = from; i < Math.min(from + perBlock, taps.length); i++) {
          const n = document.createElement('span');
          n.className = 'vetapn'; n.textContent = String(i + 1);
          n.title = i === 0 ? 'The tap itself' : `Repeat ${i}`;
          table.append(n);
          for (const col of columns) {
            const pot = col.pot(i);
            if (!pot) {
              const fixedCell = document.createElement('span');
              fixedCell.className = 'vetapfixed'; fixedCell.textContent = '0ms';
              fixedCell.title = 'The first tap is the sound itself — it lands on the beat';
              table.append(fixedCell);
              continue;
            }
            // The name is in the column head, once. Left on the pot it would be the same
            // three words down every row — seventeen labels to say three things.
            pot.label.remove();
            pot.wrap.title = col.tip;
            table.append(pot.wrap);
            if (col === levelCol) levels.push([i, pot.set]);
            if (col === timeCol) times.push([i, pot.set]);
          }
        }
        tables.append(table);
      }
      // Only while the preset is still deriving them from the falloff. Once it lists its
      // own levels, the falloff is not what those hits are playing at any more, and
      // dragging it must not quietly rewrite them. Across BOTH blocks — `levels` is one
      // list of every level pot drawn, whichever column it ended up in.
      if (levelCol) {
        syncLevels = () => {
          if (!state.voice.tapGains) levels.forEach(([i, set]) => set(levelCol.dflt(i)));
        };
      }
      // SPREAD and the TIME column are two grips on one list, so dragging one has to move
      // the other for the same reason FALLOFF moves LEVEL: a card that contradicts itself
      // mid-drag is worse than a card with one control fewer. Display only — the values
      // are already written by the time this runs.
      if (timeCol) {
        syncTimes = () => times.forEach(([i, set]) => set(state.voice.taps?.[i] ?? 0));
      }
      wrap.append(tables);
    }

    // ---- across the taps -------------------------------------------------------
    // All three are per-TAP ratios and all three are meaningless with a single tap, so
    // this is where they belong: a section that only exists once there is something to
    // repeat. A clap made of one sound four times is a stutter; a real one is four hands,
    // each landing a shade lower and duller than the last.
    if (many) {
      const rule = document.createElement('div'); rule.className = 'vetaprule';
      const ruleName = document.createElement('span');
      ruleName.className = 'k'; ruleName.textContent = 'ACROSS THE TAPS';
      rule.append(ruleName, document.createElement('i'));
      wrap.append(rule);
      const walks = document.createElement('div'); walks.className = 'devgrid vetapwalks';

      /**
       * SPREAD: the whole run, wider or tighter, in one gesture.
       *
       * The other three ratios say what changes from hit to hit — level, pitch, colour —
       * and the timing was the one dimension you could only edit hit by hit, in a column
       * of pots, while the thing you are actually listening for is how WIDE the clap is.
       * It is also the control that wants a drag: a clap tightening into a flam is a
       * sound you find by ear, not by typing three numbers.
       *
       * IT READS THE END OF THE RUN and writes all of them. Not a ratio — a ratio would
       * have to be stored to have a position, and `taps` already IS the value; a
       * `tapSpread` key beside it that no engine path reads would be a second source of
       * truth for the same milliseconds. So the pot reads what it can point at (where the
       * run ends) and writes the rest proportionally, the way AMOUNT reads semitones off a
       * pair of frequencies. Same trick, same reason.
       *
       * The end of the run is the LATEST hit, not the last-numbered one. They are the same
       * on every preset in the catalogue, and they come apart the moment someone drags hit
       * 2 past hit 4 — which the per-hit pots allow, and which is a real if odd sound. Read
       * from the last INDEX, that case scales the latest hit past the 200ms ceiling every
       * other tap pot stops at, the clamp flattens it, and the shape does not come back
       * when you scale down again. Read from the latest, the biggest number in the run is
       * the one pinned to the pot, everything else is a fraction of it, and nothing can
       * reach the ceiling before the pot does.
       *
       * PROPORTIONALLY is the whole point. The claps in the catalogue are unevenly spaced
       * on purpose — `clapRoom` is 0, 14, 37, 58, 83ms, which is a hall, not a metronome —
       * so this scales the gaps it finds rather than evening them out. A control that set
       * one gap for all of them would destroy an authored rhythm the moment it was touched.
       *
       * The baseline is captured at pointer-down and every position is computed from THAT,
       * not from the last frame: scaling the live values would compound the 1ms rounding
       * all the way down a drag, so a sweep out and back would not land where it started.
       */
      const spreadMin = 0.002;
      const spreadMax = 0.2;
      const runEnd = (list) => Math.max(0, ...(list || []).slice(1));
      let spreadBase = null;
      const spread = knob({
        min: spreadMin, max: spreadMax, step: 0.001, reset: 0.012 * (taps.length - 1),
        value: Math.min(spreadMax, Math.max(spreadMin, runEnd(taps) || spreadMin)),
        fmt: (x) => `${Math.round(x * 1000)}ms`,
        onStart: () => { spreadBase = (state.voice.taps || []).slice(); beginGesture(); },
        onEnd: () => { spreadBase = null; endGesture(); },
        onInput: (x) => {
          const base = spreadBase || (state.voice.taps || []).slice();
          const end = runEnd(base);
          const list = base.map((t, i) => {
            if (i === 0) return 0;
            // The latest hit lands exactly where the pot says, so the pot can read itself
            // back with no rounding between them. Everything else keeps its share of the
            // run — or, where the taps are stacked at zero and there is no shape to keep,
            // spaces out evenly rather than refusing to move.
            if (end > 0 && t === end) return x;
            const share = end > 0 ? t / end : i / (base.length - 1);
            return Number(Math.max(spreadMin, Math.min(spreadMax, share * x)).toFixed(4));
          });
          state.voice.taps = list;
          syncTimes();
          touched();
        },
      });
      // Display only, and never while this knob is the one being dragged — `spreadBase` is
      // the flag for that, and writing to a pot mid-gesture would fight the pointer.
      syncSpread = () => {
        if (!spreadBase) spread.set(Math.min(spreadMax, Math.max(spreadMin, runEnd(state.voice.taps))));
      };
      spread.label.textContent = 'SPREAD';
      spread.wrap.title = 'How far the whole run reaches — where the last tap lands. '
        + 'The taps between keep their spacing, so an uneven clap stays uneven';
      walks.append(spread.wrap);

      const falloff = knob({
        min: 0.2, max: 1, step: 0.01, value: state.voice.tapFalloff ?? 0.78, reset: 0.78,
        fmt: fixed(2),
        onStart: beginGesture, onEnd: endGesture,
        onInput: (x) => { state.voice.tapFalloff = x; syncLevels(); touched(); },
      });
      falloff.label.textContent = 'FALLOFF';
      falloff.wrap.title = 'How much quieter each repeat is than the one before it';
      walks.append(falloff.wrap);
      // Per PATH, like the columns above: `_playAdditive` never reads `tapTone` and
      // `_playNoise` never reads `tapDetune`. See `TAP_KEYS`.
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
          onStart: beginGesture, onEnd: endGesture,
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
        walks.append(w.wrap);
      }
      wrap.append(walks);
    } else {
      const note = document.createElement('div');
      note.className = 'devnote';
      note.textContent = 'One tap. Add a repeat or two a few milliseconds apart and it '
        + 'becomes a clap — which is all a clap is: one sound heard several times in a '
        + 'small room.';
      wrap.append(note);
    }
    return wrap;
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
    onChange = null,
  } = {}) => {
    const card = document.createElement('div');
    card.className = 'device vegroup';
    const bar = document.createElement('div'); bar.className = 'devbar';
    const h = document.createElement('h4'); h.textContent = group.title;
    bar.append(h);

    // THE HEADER IS THE SWITCH, on a card that has one.
    //
    // `.devbar` came with `cursor: grab` because on the DESK a device header is a handle —
    // that is how the rack is reordered. Nothing in these two windows drags, so the hand
    // was promising a gesture that does not exist. What the header can honestly offer is
    // the switch already sitting in it: a 20x11 capsule is a small target for a control
    // that turns a whole section on, and the title bar above it is a large one.
    //
    // Looked up at CLICK time rather than closed over, because the full window empties
    // this bar and rebuilds it in its own terms — `.sfsw` capsules where the strip has
    // `.veswitch` — and a listener on the element itself survives that. First switch in
    // the bar, which is the card's own section rather than any second switch beside it.
    //
    // Anything you can press is exempt: the switch (whose own handler runs), the solo
    // button, the panel doors, the tab strip. A header click is what is left over.
    bar.onclick = (ev) => {
      if (ev.target.closest('button, select, input, .sftabs, .sfpanelwrap')) return;
      bar.querySelector('.veswitch, .sfsw')?.click();
    };

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
        undoHistory.begin();
        if (on) dropSection(state.voice, group.optional);
        else addSection(state.voice, group.optional);
        touched();
        onSectionChange(group.optional);
        repaint();
        undoHistory.end();
      };
      bar.append(sw);
      card.append(bar);
      if (!on && !dimOff) return card;
      if (!on) card.classList.add('sfoff');
    } else card.append(bar);

    // In a fixed window an OFF card remains visible for layout stability.  Its title and
    // switch stay visible, but the body (including controls appended by the full-window
    // renderer after this function returns) must be inert.  A parent GROUP condition is
    // included so a child card of an OFF oscillator cannot be edited through its own
    // optional switch while the oscillator itself is unavailable.
    const panelOn = (v) => (!group.optional || sectionOn(v, group.optional))
      && (!group.when || group.when(v))
      && (!group.bodyWhen || group.bodyWhen(v));
    const panelKeep = (control) => {
      // The switch is the only way back.  When a parent group is OFF there is no local
      // way back, so even a nested switch remains inert until its parent returns.
      if (group.when && !group.when(state.voice)) return false;
      if (control.classList.contains('veswitch') || control.classList.contains('sfsw')) {
        return true;
      }
      return !!control.closest('[data-ve-panel-keep]');
    };
    if (dimOff) {
      guards.panel(card, panelOn, panelKeep);
    }

    if (group.layerCopy) {
      const select = document.createElement('select');
      select.className = 'velayercopyselect';
      select.title = 'Copy the entire layer from another layer';
      // Hidden, for the reason the full window's copy menu hides it: COPY names the
      // control, and a name listed among the choices is a row that does nothing and takes
      // the native menu's checkmark with it. It still labels the closed control.
      const placeholder = document.createElement('option');
      placeholder.textContent = 'COPY';
      placeholder.value = '';
      placeholder.hidden = true;
      placeholder.selected = true;
      select.append(placeholder);
      for (const other of [1, 2, 3].filter((n) => n !== group.layerCopy)) {
        const option = document.createElement('option');
        option.value = String(other);
        option.textContent = `Copy from Layer ${other}`;
        select.append(option);
      }
      select.onchange = (ev) => {
        ev.stopPropagation();
        const from = Number(select.value);
        select.value = '';
        if (from) kit.copyLayer(from, group.layerCopy);
      };
      select.onclick = (ev) => ev.stopPropagation();
      bar.append(select);
    }

    if (group.taps) { card.append(tapsGroup(repaint)); return card; }
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
        grid.append(trioRow(batch, guards, onChange));
        continue;
      }
      const handle = row.kind === 'pick'
        ? (renderPick
          ? { wrap: renderPick(row), row }
          : pickRow({ ...row, wide: picks < 2 }, guards, onChange))
        : numRow(row, guards, onChange);
      const { wrap } = handle;
      if (group.bodyWhen && row.label === 'AMP') wrap.dataset.vePanelKeep = '1';
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
    if (!dimOff && group.bodyWhen) {
      // The strip collapses optional cards, but an AMP card remains so its ENV/THROUGH
      // selector can bring the envelope back. Guard each other body row instead of the
      // whole card, keeping that selector interactive while the envelope is THROUGH.
      for (const child of grid.children) {
        if (!child.hasAttribute('data-ve-panel-keep')) guards.push(child, panelOn);
      }
    }
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
    // Nothing is being edited now, so there is nothing to undo. Cleared AFTER `state`,
    // so the empty snapshot it takes is the blank panel's rather than the preset's.
    undoHistory.reset();
    historyChanged();
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
    // The strip's own pots, by the row that draws them. Collected because the OTHER
    // surface can move the same value: the full window writes straight into
    // `state.voice`, and without this the strip keeps drawing what it drew — which reads
    // as the panel being stuck on the preset you opened. See `syncValues`.
    stripPots.length = 0;
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
    // WHICH CHANNEL, back on the caption. It was dropped while the panel lived docked
    // against its strip — the strip's own head was six pixels away and said it — and the
    // panel is a free window again, so the only thing on it naming the channel is this
    // line. Without it a desk with eight tracks on one preset family gives you a window
    // called "Round Bass" and no way to tell which of them you are about to change.
    tag.textContent = `${state.laneLabel ? `${state.laneLabel} · ` : ''}`
      + `${v.category || ''}${v.category ? ' ' : ''}`
      + `(${libraryOwner ? 'Library' : 'User'})`;
    head.append(title, tag);

    if (v.kind === 'tone') {
      // Opened from a CHANNEL the class is a FACT, not a control.
      //
      // Changing it throws every card below the head away and seeds that class's
      // defaults — a different sound in the lane, from a dropdown sitting one row under
      // the preset's name. That is a library act: pick the construction when you build
      // the preset. On the desk the channel is playing this preset in this song, and the
      // panel there is for shaping what is already there. So on a lane the class reads
      // as the badge the drum kind already wears.
      if (state.laneKey) {
        const kind = document.createElement('span');
        kind.className = 'vesynth veclass';
        kind.textContent = v.synth;
        kind.title = `${v.synth} — the Tone class this preset is built from. Change it in`
          + ' the library, where the preset is built, not on the strip playing it.';
        sub.append(synLabel('SYNTH'), kind);
      } else {
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
          undoHistory.begin();
          v.synth = syn.value;
          applyDefaults(v, syn.value);
          touched();
          undoHistory.end();
          // Every card below the head is a different card now, so the old offset means
          // nothing — back to the top with it.
          build({ keepScroll: false });
        };
        sub.append(synLabel('SYNTH'), syn);
      }
      // The way into the full window, on the SYNTH row rather than in the header.
      //
      // The header is `display: block` with two centred lines and an absolutely
      // positioned ✕ in its one free corner, so anything put there is either squeezed
      // between the lines or fighting the close button. `.vesub` is a real flex row, it
      // renders for every `kind: 'tone'` preset, and it is hidden in neither home. It is
      // also already the row that says what builds this sound.
      if (createFull && isQuickVoice(v) && fullLayout(v)) {
        const open = document.createElement('button');
        open.className = 'devlink veopen';
        open.textContent = 'ADVANCED';
        open.title = `Open the full-window ${v.synth} editor — every control on one screen`;
        open.onclick = () => openFull();
        sub.append(open);
      }
    }
    if (v.kind === 'drum' && createFull && fullLayout(v)) {
      const kind = document.createElement('span');
      kind.className = 'vesynth veclass';
      kind.textContent = 'KLNG8';
      sub.append(synLabel('SYNTH'), kind);
      const open = document.createElement('button');
      open.className = 'devlink veopen';
      open.textContent = 'ADVANCED';
      open.title = 'Open the full-window KLNG8 editor — every control on one screen';
      open.onclick = () => openFull();
      sub.append(open);
    }
    // Nothing for the noise and drum kinds. There it was a label and a badge naming a
    // construction you cannot choose from here — a row of chrome at the top of a panel
    // pinned to a strip's width, and the cards below already say what the sound is made
    // of. The SYNTH row survives only where it is a CONTROL: the class dropdown.

    // Closed, or folded away — two different acts, so two different marks.
    //
    // ONLY THE LIBRARY'S DOCK FOLDS. There it collapses to a rail and comes back on the
    // preset it was already on, so a ✕ would be the button lying about what it does —
    // and a ✕ is something you hesitate over with work in the panel behind it. A chevron
    // pointing the way it collapses says put-away, and says which way.
    //
    // A channel's editor used to fold too, back into the strip it was docked against,
    // with the `»` on that strip's header to bring it out again. Both are gone: it is a
    // free window over the desk, nothing on the strip reopens it, and the honest mark
    // for a window with no home to return to is the desk's standard ✕.
    const shut = document.createElement('button');
    const folds = el.classList.contains('vedocked');
    shut.className = folds ? 'veclose vefold' : 'veclose popclose';
    if (folds) shut.append(foldIcon('left')); else shut.textContent = '✕';
    shut.title = folds
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
    const surface = stripPanelSpec(v);
    // Guards belong to the panel being built, not to the one before it. The strip's set
    // only — the full window clears its own when it re-renders.
    rowGuards.clear();
    // A group-level `when` folds a card away entirely — title bar included. The layer
    // panel is the reason: a switched-off Osc 2 must take its Filter/Pitch/FM sub-cards
    // with it, or the rack shows three orphaned title bars for a layer that is not
    // there. Per-ROW `when` greys; per-GROUP `when` removes, and `build` reruns on
    // every section toggle so the cards come back the moment the layer does.
    if (surface.mode === 'quick') {
      rack.classList.add('vequickrack');
    }
    for (const g of surface.groups) {
      if (g.when && !g.when(v)) continue;
      rack.append(groupCard(g, { onRow: (h) => { if (h.set) stripPots.push(h); } }));
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
      undoHistory.reset();
      historyChanged();
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
        const next = row.write
          ? (row.kind === 'pick' ? row.write(voice, row.def) : row.write(row.def, voice))
          : row.def;
        if (next !== SKIP_WRITE) setAt(voice, row.path, next);
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

    // A preset switch is a hard boundary for audition state. The keyboard may have
    // notes whose physical release belongs to the old sound, and a MIDI port may never
    // deliver that release after the lane is rebound; close both before changing the
    // catalogue object so nothing from the old preset rings through the new one.
    panicAudition();

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
    undoHistory.reset();
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
    //
    // `rawBaseline` has exactly one reader, and `runEstimate` is the same gate: where
    // live compensation is off — the MRDR-3 playground, which holds its level for the
    // session because it auditions through a permanent limiter — nothing will ever
    // consume this, and rendering the preset offline to seed it is seconds of silence
    // on every preset the user opens.
    if (liveCompensationOn()) {
      measureRaw(id, noiseBuf(), sampleRate())
        .then((raw) => { if (state?.id === id && raw.level > 0) state.rawBaseline = raw; })
        .catch(() => { /* no ratio; the level simply stays put until a save measures it */ });
    }

    return id;
  }

  /**
   * Drop the editor's hold on a preset, leaving whatever is on it in place.
   *
   * State goes first, so the window's `onFullClosed` finds nothing to repaint: the strip
   * is being taken down, and rebuilding it on the way out would be a panel drawn for
   * one frame and then removed.
   */
  function forget() {
    state = null;
    // Before the window goes: `syncHistory` repaints its UNDO button, and a window that
    // has already been emptied has no button to repaint.
    undoHistory.reset();
    historyChanged();
    foot = null;
    full?.close();
  }

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
  // Optional sections are bypassed by moving their last live snapshot into `bypassed`.
  // The engine correctly stops reading that snapshot, but the full editor's charts are
  // read-only views and should still show the sound that will come back when the section
  // is re-enabled rather than falling through to a factory default curve.
  const heldValue = (voice, path) => {
    const clean = String(path || '').replace(/^\$/, '');
    const parts = clean.split('.').filter(Boolean);
    const bag = voice?.bypassed;
    for (let i = parts.length; i > 0; i--) {
      let value = bag?.[parts.slice(0, i).join('.')];
      if (value === undefined) continue;
      for (const leaf of parts.slice(i)) value = value?.[leaf];
      return value;
    }
    return undefined;
  };
  const undoEdit = () => {
    if (!state?.voice || !undoHistory.undo()) return false;
    state.dirty = !matchesBaseline();
    if (state.voice?.songLocal) VOICES[state.id] = state.voice;
    estimateSeq++;
    clearTimeout(estimateTimer);
    refresh(state.id);
    // The song's copy has to follow the preset back — but SILENTLY. A song-local edit
    // rides into the mix as a `voiceParams` write, which is an undoable desk step of its
    // own; letting the undo push another one would leave the desk's history holding two
    // entries for a change that netted zero, and a later desk ⌘Z re-applying the edit
    // this one just took back. Undoing in the editor stays in the editor.
    onEdit(state.id, asSongPreset(state.voice), { undo: false });
    onDirty(state.id, state.dirty);
    if (!state.measured) scheduleEstimate();
    paintFoot();
    repaintBoth();
    toast('Undid the last edit');
    return true;
  };
  const kit = {
    // ---- reading -------------------------------------------------------------
    voice: () => state?.voice ?? null,
    id: () => state?.id ?? null,
    label: () => state?.voice?.label || state?.id || '',
    engine: () => {
      const v = state?.voice;
      return v?.kind === 'drum' ? 'drum' : v?.synth || null;
    },
    presets: () => listPresets({
      engine: state?.voice?.kind === 'drum' ? 'drum' : state?.voice?.synth,
      laneKey: state?.laneKey || null,
      keep: state?.id || null,
    }),
    dirty: () => !!state?.dirty && !matchesBaseline(),
    discard: discardChanges,
    confirmDiscard: () => ask
      ? ask('Discard preset edits?', '<p>This sound has unsaved changes. Discard them and switch presets?</p>', 'Discard')
      : Promise.resolve(true),
    selectPreset: (id) => selectPreset?.(id, {
      dirty: !!state?.dirty && !matchesBaseline(),
      current: state?.id || null,
      engine: state?.voice?.kind === 'drum' ? 'drum' : state?.voice?.synth,
      laneKey: state?.laneKey || null,
    }),
    share: () => sharePreset?.({
      id: state?.id || null,
      voice: state?.voice ? asPreset(state.voice) : null,
      engine: state?.voice?.kind === 'drum' ? 'drum' : state?.voice?.synth,
    }),
    shareEnabled: () => typeof sharePreset === 'function',
    audition: (midi, opts) => auditionNote(midi, opts),
    releaseAudition: (opts) => releaseAudition(opts),
    panicAudition,
    midiState,
    toggleMidi,
    midiAdapter,
    get: (path) => (state ? getAt(state.voice, path) : undefined),
    /** A row's value in the POT's units, which is not always the stored one. */
    read: (row) => {
      const raw = getAt(state.voice, row.path);
      const value = raw === undefined ? heldValue(state.voice, row.path) : raw;
      return row.read ? row.read(value, state.voice) : value;
    },
    layout: (opts) => (state ? fullLayout(state.voice, opts) : null),
    sectionOn: (key) => sectionOn(state.voice, key),
    // The full window's controls bracket their gestures through these, so a drag out
    // there holds the level estimate off exactly the way the strip's own pots do.
    beginUndo: beginGesture,
    endUndo: endGesture,
    canUndo: () => undoHistory.canUndo(),
    undo: undoEdit,
    copyLayer: (from, to) => {
      undoHistory.begin();
      if (from === to || !copyLayerData(state.voice, from, to)) {
        undoHistory.end();
        return false;
      }
      touched();
      undoHistory.end();
      repaintBoth();
      return true;
    },
    /**
     * Switch a section on or off — the same bypass-and-restore the strip's own switch
     * does, not a second implementation of it. Off stashes the subtree in
     * `voice.bypassed` so On puts it back exactly as it was; half of sound design is
     * taking a part out to hear what it was doing.
     */
    toggleSection: (key) => {
      undoHistory.begin();
      if (sectionOn(state.voice, key)) dropSection(state.voice, key);
      else addSection(state.voice, key);
      touched();
      onSectionChange(key);
      repaintBoth();
      undoHistory.end();
    },

    // ---- writing — this panel's own path, not a second one -------------------
    write: (row, x) => {
      undoHistory.begin();
      const raw = getAt(state.voice, row.path);
      const next = row.write ? row.write(x, state.voice) : x;
      if (next !== SKIP_WRITE) setAt(state.voice, row.path, next);
      row.after?.(x, state.voice, raw);
      touched();
      syncRows();
      syncValues();
    },
    /** A pick's write, which takes its arguments the other way round — see `buildSeg`. */
    pickWrite: (row, option) => {
      undoHistory.begin();
      setAt(state.voice, row.path, row.write ? row.write(state.voice, option) : option);
      touched();
      if (row.path?.endsWith('.vca')) onSectionChange(row.path);
      syncRows();
      syncValues();
      undoHistory.end();
    },
    /**
     * Two parameters in one gesture — an envelope handle moving DECAY and SUSTAIN, a
     * response handle moving CUTOFF and RESONANCE. One `touched()` for the pair, because
     * `touched` re-banks the voice, tells the song, marks the desk dirty and schedules a
     * measurement, and doing all four twice per pointermove is a drag that stutters.
     */
    writeMany: (pairs) => {
      undoHistory.begin();
      const raws = pairs.map(([row]) => getAt(state.voice, row.path));
      pairs.forEach(([row, x], i) => {
        const next = row.write ? row.write(x, state.voice) : x;
        if (next !== SKIP_WRITE) setAt(state.voice, row.path, next);
        row.after?.(x, state.voice, raws[i]);
      });
      touched();
      syncRows();
      syncValues();
    },

    // ---- widgets — the SAME builders the strip draws -------------------------
    // `tapsGroup` is handed over whole rather than as rows, because it is the one card
    // whose CONTENTS depend on a value it also edits: a row list built before the stepper
    // was pressed describes a different number of hits. It takes the repaint that suits
    // the surface asking — the strip rebuilds its panel, the window's door redraws only
    // the popover body, so pressing + does not shut the panel it was pressed in.
    knob, numRow, pickRow, dropRow, trioRow, groupCard, tapsGroup, short: SHORT,
    tapCount: () => tapCount(state?.voice || {}),
    tapsDoorLabel: () => tapsDoorLabel(state?.voice || {}),
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
    onFullClosed: () => {
      if (!state) return;
      if (fullStandalone) {
        fullStandalone = false;
        dropSolo();
        const dismiss = close;
        dismiss();
        return;
      }
      build();
    },
  };

  /** Open the full window on a preset that has one. Built once, on the first ask. */
  let fullStandalone = false;
  function openFull(layer = 1, options = {}) {
    if (!state || !createFull) return;
    fullStandalone = !!options.standalone;
    // The full-window editor is a big synchronous build on the sequencer's thread —
    // queue audio past it and record what the stall was for. See lib/heavy-ui.js.
    heavyUi('open full synth editor', () => {
      full ||= createFull({ kit });
      full.open(layer, options);
    });
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
    get dirty() { return !!state?.dirty && !matchesBaseline(); },
    /**
     * The preset OBJECT the panel is drawing, not just its id.
     *
     * A song-local copy is keyed by lane and song — `bassVoice@neon` — so the id stays
     * the same when the lane is put on a different preset, and `registerSongVoice` writes
     * a brand-new object under it. An id comparison therefore reads "same preset" across
     * a change of synth class entirely, and the panel goes on drawing an object nothing
     * plays any more. The object is what the panel is actually holding, so the object is
     * what tells you whether it is still current. See syncVoiceEditorToLane.
     */
    get voice() { return state?.voice || null; },
    get librarySource() { return state?.librarySource || null; },
    // Which strip the panel belongs beside — the desk re-places it there on every
    // rack repaint. See placeVoiceEditor. Null when it was opened from the library,
    // which is what makes it a window instead of a rack item.
    get laneKey() { return state?.laneKey || null; },
  };
}
