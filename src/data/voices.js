// The voice library: every sound a melodic lane can be played by, as one table.
//
// Two kinds live here, deliberately side by side:
//
//   engine — the game's own hand-written voices. `bassFilteredSaw` and `bass80s` and
//            the drawbar organ have always been in `scheduleStep`, reachable only by
//            typing the right key into a bank by hand. They are presets here, and
//            they need no engine code at all: a preset IS the set of bank keys, and
//            `applyMix` has always merged a song's `voice` block onto its bank.
//   tone   — a Tone.js synth built from `options`. New sounds are an entry in this
//            file rather than another `else if` in a 590-line function that has to
//            stay sample-identical for every song already balanced against it.
//
// **Nothing in the game uses one.** A lane plays what it always played unless a bank,
// a section, or a song's `voice` block in src/data/mix.js names a preset — see
// VOICE_LANES. That is not politeness, it is the null test: the default path has to
// stay untouched down to the sample, and it does.
//
// ---- Voices are NOT tied to a lane ------------------------------------------
//
// A bass preset on the lead lane is a lead. `category` is for finding things in the
// picker, not for restricting them. The only entries carrying a `lanes` list are the
// few engine ones that are genuinely lane-specific code paths — `bassFilteredSaw`
// lives inside `if (b.bass)` and moving it to the lead is an engine change, not a
// data one — and the picker says so rather than hiding them.

/**
 * The lanes that can take a voice, and the bank keys each one uses.
 *
 * `voiceKey` is what opts the lane in: `{ bassVoice: 'roundMono' }`, on a bank, on a
 * section, or in a mix's `voice` block. All three merge onto the bank before the
 * sequencer runs, so the seam needed no new plumbing to be per-section, saveable and
 * editable on the desk.
 *
 * `gainKey`/`durKey` are the lane's own level and length keys, and a bank that sets
 * one still wins — a song that has been dialled in keeps its numbers when it changes
 * voice. `typeKey` is the oscillator-type key the hand-written voice reads, which is
 * what lets a plain waveform preset be lane-agnostic; the two lanes with no type key
 * have a fixed timbre in the engine (twinkle is always a sine and its octave, the
 * organ is always drawbars) and simply offer no engine waveform presets.
 *
 * `target` is the peak that lane's own voice reaches at its authored gain. Every
 * preset is scaled to it, which is the only way a level can mean the same thing on
 * six lanes whose engine gains span 0.009 to 0.1. Measured — see tools/measure-voices.js.
 */
export const VOICE_LANES = {
  bass: {
    voiceKey: 'bassVoice', gainKey: 'bassGain', durKey: 'bassDur', typeKey: 'bassType', label: 'bass',
  },
  lead: {
    voiceKey: 'leadVoice', gainKey: 'leadGain', durKey: 'leadDur', typeKey: 'leadType', label: 'lead',
  },
  leadHarm: {
    voiceKey: 'leadHarmVoice', gainKey: 'harmGain', durKey: 'harmDur', typeKey: 'harmType',
    // The engine puts the parallel-3rds partner at 0.04 against the lead's 0.06,
    // because a harmony arriving at the same level as the melody stops being one. label: 'harmony',
  },
  twinkle: {
    voiceKey: 'twinkleVoice', gainKey: 'twinkleGain', durKey: 'twinkleDur', label: 'twinkle',
  },
  chords: {
    voiceKey: 'chordsVoice', gainKey: 'chordGain', durKey: 'chordDur', typeKey: 'chordType', label: 'chords',
  },
  organChords: {
    voiceKey: 'organChordsVoice', gainKey: 'organGain', durKey: 'organDur',
    // The organ's 0.009 is PER DRAWBAR — five partials sum well above it. Measured
    // rather than reasoned about, like every other number in this column. label: 'organ',
  },

  // ---- the lanes that had no seam -----------------------------------------
  //
  // These four play a NOTE PER STEP, exactly as the melodic lanes above do, and there
  // was no reason beyond history for them to be the only strips on the desk where you
  // cannot choose a sound. Every one of them was a hand-written voice with no way in.
  //
  // `organGliss` and `keyGliss` turn ONE step into eight discrete scale notes, so their
  // branches play the preset eight times at rising offsets — `playVoice` has taken a
  // per-call `delay` since `bassRepeat`, and a run is a ghost note eight times over.
  // `gliss` is one note that glides an octave into the target: a preset plays it
  // straight, and gets the glide back when it has a pitch envelope of its own.
  // `sweeps` holds a marker rather than a pitch, so it carries its own note the way the
  // percussion lanes below do.
  //
  // `durKey` is required whether or not the hand-written voice reads it — `presetKeys`
  // takes each lane's key prefix from it. Where the engine reads the same key (all but
  // `voxDur` and `shoutDur`) the two paths agree; where it does not, the key sets the
  // length of a PRESET on that lane and the hand-written voice keeps its own.
  organSwoop: {
    voiceKey: 'organSwoopVoice', gainKey: 'organSwoopGain', durKey: 'organSwoopDur',
    label: 'organ swoop',
  },
  electroFx: {
    voiceKey: 'electroFxVoice', gainKey: 'electroFxGain', durKey: 'electroFxDur',
    label: 'electro fx',
  },
  // The engine's own vox hardcodes its level (0.55) and its length, so both keys here
  // are the preset's alone. Stated rather than omitted so the lane reads like every
  // other one on the desk.
  vox: {
    voiceKey: 'voxVoice', gainKey: 'voxGain', durKey: 'voxDur', label: 'vox',
  },
  shout: {
    voiceKey: 'shoutVoice', gainKey: 'shoutGain', durKey: 'shoutDur', label: 'shout',
  },
  // One note that glides an octave up into the target over three beats, with its own
  // panned taps. A preset plays the target straight — the glide belongs to the
  // hand-written body, and a preset gets it back the day it has a pitch envelope.
  gliss: {
    voiceKey: 'glissVoice', gainKey: 'glissGain', durKey: 'glissDur', label: 'gliss',
  },
  // The two runs. `dur` here is ONE note of the eight, not the length of the run — the
  // run's own span stays the bank's (`organGlissSpan`, or three beats for keyGliss),
  // because that is the gesture rather than the sound.
  organGliss: {
    voiceKey: 'organGlissVoice', gainKey: 'organGlissGain', durKey: 'organGlissDur',
    label: 'organ gliss',
  },
  keyGliss: {
    voiceKey: 'keyGlissVoice', gainKey: 'keyGlissGain', durKey: 'keyGlissDur',
    label: 'key gliss',
  },
  // Air rather than pitch: the bank marks WHERE a sweep happens and the engine's own
  // voice decides what one sounds like, so — like the kit below — the lane carries the
  // note a synth is struck at. Low, because a sweep is felt rather than heard.
  sweeps: {
    voiceKey: 'sweepsVoice', gainKey: 'sweepGain', durKey: 'sweepDur',
    noteKey: 'sweepsNote', note: 220, label: 'sweeps',
  },

  // ---- percussion ---------------------------------------------------------
  // A drum lane holds booleans, not frequencies: the bank says a hit happens here,
  // and the engine's own kick decides what a hit sounds like. A synth needs a pitch,
  // so each lane carries the note its voice is struck at — roughly where that drum
  // sits, and the preset's own envelope does the rest. Change it per song with the
  // lane's `...Note` key if a kick wants to be tuned to the bass.
  //
  // `trim` is the other half, and the reason these lanes read differently from the
  // melodic ones. A drum lane has no `gainKey` — its level is not one number on the
  // bank but a PRODUCT of the kit's trims, which is how a song tucks its whole kit
  // down (`drumGain`) and then leans on one piece of it (`kickGain`). The
  // hand-written voices have always multiplied these; see the lane blocks in
  // scheduleStep. Each entry is `[key, default]`, and `laneTrim` divides by the
  // default because that is the state LANE_TARGETS was measured in — so a bank that
  // names none of them scales by exactly 1 and nothing moves.
  kick: { voiceKey: 'kickVoice', durKey: 'kickDur', noteKey: 'kickNote', note: 55, label: 'kick',
    trim: [['kickGain', 1], ['drumGain', 1]] },
  snare: { voiceKey: 'snareVoice', durKey: 'snareDur', noteKey: 'snareNote', note: 190, label: 'snare',
    trim: [['drumGain', 1]] },
  clap: { voiceKey: 'clapVoice', durKey: 'clapDur', noteKey: 'clapNote', note: 320, label: 'clap',
    trim: [['clapGain', 1], ['drumGain', 1]] },
  // rim and crash carry a default that is NOT 1 — the engine reads `b.rimGain ?? 0.21`
  // and `b.crashGain ?? 0.15`, so those are the levels their targets were measured at.
  rim: { voiceKey: 'rimVoice', durKey: 'rimDur', noteKey: 'rimNote', note: 420, label: 'rim',
    trim: [['rimGain', 0.21], ['drumGain', 1]] },
  hats: { voiceKey: 'hatsVoice', durKey: 'hatsDur', noteKey: 'hatsNote', note: 800, label: 'hats',
    trim: [['drumGain', 1]] },
  ohats: { voiceKey: 'ohatsVoice', durKey: 'ohatsDur', noteKey: 'ohatsNote', note: 800, label: 'open hats',
    trim: [['drumGain', 1]] },
  crash: { voiceKey: 'crashVoice', durKey: 'crashDur', noteKey: 'crashNote', note: 520, label: 'crash',
    trim: [['crashGain', 0.15], ['drumGain', 1]] },
  tom: { voiceKey: 'tomVoice', durKey: 'tomDur', noteKey: 'tomNote', note: 130, label: 'tom',
    trim: [['drumGain', 1]] },
};

/** Lanes whose bank holds booleans rather than frequencies. */
export const PERCUSSION_LANES = ['kick', 'snare', 'clap', 'rim', 'hats', 'ohats', 'crash', 'tom'];

// A newly added step-sequencer channel must make a sound before it has been
// customised. `tom` is the neutral authored percussion preset already used by the
// canonical eighth lane; keeping the id here lets the engine repair older mixer
// drafts that created an independent lane without naming any voice at all.
export const DEFAULT_ADDED_PERCUSSION_VOICE = 'tom';

/**
 * Lanes whose bank holds an ARRAY of frequencies per step — a chord, not a note.
 *
 * The third of the three step shapes, and the one that bites: a bare number on one of
 * these throws inside scheduleStep and takes the whole render page with it, which is
 * why tools/measure-voices.js has carried its own copy of this list. Anything building
 * a bank a step at a time needs to know which lane is which, so the list lives here
 * with the other two.
 */
export const CHORD_LANES = ['chords', 'organChords'];

/**
 * Pitched lanes that still hold ONE thing per step, and not because of the synth.
 *
 * The gesture lanes build a node graph whose timing lives inside the gesture, so a step
 * is the start of a shape rather than a note — two of them are not a chord, they are two
 * overlapping sweeps. `vox` and `shout` pick a WORD by step and key the formant path to
 * it. These are the same lanes the piano roll declines to draw (`GESTURE_LANES` there)
 * plus the two it draws but cannot give a length to.
 */
export const MONO_LANES = [
  'organGliss', 'organSwoop', 'keyGliss', 'gliss', 'electroFx', 'sweeps', 'vox', 'shout',
];

/**
 * ---- Layer lanes -----------------------------------------------------------
 *
 * Duplicating a track on the desk makes a LAYER: the same notes, on their own strip,
 * played by a different preset — which is how you get a sub under a bass or a pad
 * under a chord part without writing the part twice.
 *
 * A layer's key is its source lane plus an ordinal — `bass` duplicates to `bass2`,
 * then `bass3`. No lane in LANES ends in a digit, so the split back is unambiguous
 * and a layer can be resolved to what it copies from the key ALONE, wherever the key
 * turns up: the bank, a mix entry, a strip, a saved file. That is the whole reason
 * the key carries the source rather than a lookup table doing it.
 */
const LAYER_KEY = /^(.+?)(\d+)$/;

/** The lane a key belongs to: itself, or the lane a layer is a copy of. */
export function baseLane(laneKey) {
  if (VOICE_LANES[laneKey]) return laneKey;
  const m = LAYER_KEY.exec(laneKey || '');
  return m && VOICE_LANES[m[1]] ? m[1] : laneKey;
}

/** Is this key a duplicate of another lane rather than a lane of its own? */
export const isLayer = (laneKey) => !VOICE_LANES[laneKey] && baseLane(laneKey) !== laneKey;

/**
 * A lane's voice seam — where its voice, length, gain and note live on a bank.
 *
 * For a real lane this is the VOICE_LANES entry, unchanged. For a layer it is the
 * same seam with its own bank keys (`bass2Voice`, `bass2Dur`, …), so a layer's voice
 * is chosen, saved and read exactly the way every other lane's is, and setting one
 * can never reach across into the lane it was copied from.
 *
 * Every lane the engine ships now has one, the gestures included: the glisses, sweeps
 * and vocal one-shots kept their hand-written bodies AND gained a seam, so a preset can
 * be put on one and the engine steps aside (`!voiced('vox', …)` in scheduleStep). What
 * returns null is a key that is not a lane and not a layer of one — a layer of nothing
 * is silence.
 */
export function seamFor(laneKey) {
  const direct = VOICE_LANES[laneKey];
  if (direct) return direct;
  const m = LAYER_KEY.exec(laneKey || '');
  const base = m && VOICE_LANES[m[1]];
  if (!base) return null;
  return {
    ...base,
    voiceKey: `${laneKey}Voice`,
    gainKey: `${laneKey}Gain`,
    durKey: `${laneKey}Dur`,
    // Only where the source lane has one: a layer of the organ has no waveform key
    // for the same reason the organ has none, and inventing one would offer waveform
    // presets on a lane that cannot play them.
    typeKey: base.typeKey ? `${laneKey}Type` : undefined,
    noteKey: base.noteKey ? `${laneKey}Note` : undefined,
    label: `${base.label} ${m[2]}`,
  };
}

/**
 * How loud a preset should come out, on a given lane.
 *
 * A Tone synth's own output for the same note is not a constant — measured through the
 * render pipeline, a Synth peaks at 0.99, a MonoSynth 0.92, a DuoSynth 1.56, an FMSynth
 * 0.32 and an AMSynth 0.19 — so a hand-written gain would mean five different
 * loudnesses. Each preset carries a MEASURED level instead and the gain is derived:
 * scale it so it lands where that lane's own voice lands.
 *
 * ---- why the measurement is energy and not peak ------------------------------
 *
 * This divided PEAK by peak until the generated styles were measured against the
 * voices they replaced. The engine's hand-written voices are all blips: `play()` ramps
 * exponentially to near zero across the whole note, so most of a note is its decay.
 * Tone's synths SUSTAIN. Matched at the peak, one note of `monoBright` on the lead lane
 * measured 5.5 LU LOUDER than the lead it stood in for, and one note of `hatTick` on
 * the hats lane 5.4 LU quieter — an eleven-decibel spread opened up between two lanes
 * of one song without a single number in the song changing. The kit sank, the leads
 * shouted, and every `musicTrim` and `drumGain` set before that was calibrating a
 * balance that no longer existed.
 *
 * Peak is the wrong number and this repo already says so, at the top of
 * tools/lib/loudness.js. A preset's `level` is the K-weighted RMS of one note as it is
 * actually played — its envelope and its own `dur` included — and a lane's target is
 * the same measurement of that lane's hand-written voice. Dividing one by the other is
 * "arrive with the energy the voice you replaced arrived with", which is a thing a
 * listener can hear, where an equal peak is not.
 *
 * `peak` is still measured and still carried: it is what says a preset will use more
 * headroom than the lane it lands on, and it is the fallback for a saved song copy
 * from before levels existed. See LANE_TARGETS.
 */
export function voiceGain(voice, laneKey) {
  // A layer aims at the same place its source lane does — it is the same part, and
  // the point of the level being derived is that a new sound lands near where the
  // one beside it sits rather than at whatever its own output happens to be.
  const target = LANE_TARGETS[baseLane(laneKey)];
  if (!target) return 0;
  // A copy a song saved before the library was measured this way carries a peak and no
  // level. Level it the old way rather than at `target.level / 1`, which is 30-odd dB
  // of wrong and would read as the preset having broken.
  if (!(voice.level > 0)) return target.peak / (voice.peak > 0 ? voice.peak : 1);
  return target.level / voice.level;
}

/**
 * The kit trims a bank applies to one drum lane, as a scale on `voiceGain`.
 *
 * A melodic lane states its level in one key and `voiceGain` steps aside when it does
 * — "a bank that has been dialled in keeps its numbers". A drum lane has no such key:
 * its level is the PRODUCT of the kit's trims (`drumGain` under the whole kit,
 * `kickGain`/`clapGain`/`rimGain`/`crashGain` on one piece of it), which the
 * hand-written voices multiply in and a preset had no way to see. So a song that
 * tucked its kit down got that duck on the engine's own kick and full level on any
 * preset chosen in its place — megamix's clap ran 17 dB hot, which is most of what
 * its -16.5 dB fader was holding back.
 *
 * Relative to each key's DEFAULT, because that is the state the lane's target was
 * measured in (tools/measure-voices.js renders one note with no trims set). A bank
 * naming none of them scales by 1, which is why this moved nothing in the songs that
 * play the hand-written kit.
 *
 * Read per note off the section-merged bank, like every other bank key, so a preset
 * follows per-section trim changes the way the hand-written voice always has.
 */
export function laneTrim(bank, laneKey) {
  const seam = seamFor(laneKey);
  if (!seam?.trim || !bank) return 1;
  let scale = 1;
  for (const [key, dflt] of seam.trim) {
    const v = bank[key] ?? dflt;
    // A zero default would be a lane with no reference level to be relative to, and a
    // zero trim is a muted lane — which is a legal thing for a song to ask for.
    if (dflt > 0) scale *= v / dflt;
  }
  return scale;
}

// Noise presets — the snares, claps, hats and shakers. Built from native nodes on the
// engine's own SEEDED noise buffer (`AudioSys.noiseBuf`), not from `Tone.Noise`: Tone
// fills its buffer from `Math.random` at construction, so two renders of a song would
// not match and stems would stop summing to the mix. The engine solved this for its
// own snare; these use the same buffer, so they are as deterministic as everything
// else and render offline like everything else.
//
//   noise  the burst: filter type, frequency, Q, and how fast it decays
//   body   an optional pitched thump under it — what tells a snare from a hiss
//   taps   optional repeats, milliseconds apart. A clap is one hit heard four times
//          in a small room, and `tapFalloff` is how much quieter each one is.
const NOISE = {
  snareCrisp: { label: 'Snare', category: 'Snare', dur: 1,
    note: 'The engine’s own snare as a preset: a bright noise band, a short decay and '
      + 'a hint of body. The one every song already uses.',
    noise: { type: 'bandpass', freq: 2600, Q: 0.7, decay: 0.09 },
    body: { type: 'triangle', from: 210, to: 140, decay: 0.06, gain: 0.375 } },
  snareFat: { label: 'Fat Snare', category: 'Snare', dur: 1,
    note: 'Lower band, longer tail and much more body — a snare that carries a '
      + 'backbeat on its own rather than sitting on top of one.',
    noise: { type: 'bandpass', freq: 1700, Q: 0.5, decay: 0.16 },
    body: { type: 'triangle', from: 180, to: 110, decay: 0.11, gain: 0.6 } },
  snareTight: { label: 'Tight Snare', category: 'Snare', dur: 1,
    note: 'Gated: cut off almost before it starts. Sits under a busy hat pattern '
      + 'without smearing it.',
    noise: { type: 'bandpass', freq: 3200, Q: 1.1, decay: 0.045 },
    body: { type: 'triangle', from: 240, to: 170, decay: 0.03, gain: 0.3 } },
  snareBrush: { label: 'Brush', category: 'Snare', dur: 1,
    note: 'All air and no crack — a highpassed sweep with no body at all. The quiet '
      + 'backbeat for the lounge themes.',
    noise: { type: 'highpass', freq: 4200, Q: 0.4, decay: 0.13 } },
  snareRim: { label: 'Rimshot', category: 'Snare', dur: 1,
    note: 'Narrow, high and instant, with a hard pitched knock. The stick rather '
      + 'than the skin.',
    noise: { type: 'bandpass', freq: 5000, Q: 3, decay: 0.03 },
    body: { type: 'square', from: 420, to: 320, decay: 0.02, gain: 0.5 } },

  clap808: { label: 'Clap', category: 'Clap', dur: 1,
    note: 'Four bursts a few milliseconds apart, each quieter than the last — which '
      + 'is all a clap is: one hit heard several times in a small room.',
    noise: { type: 'bandpass', freq: 1900, Q: 1.4, decay: 0.11 },
    taps: [0, 0.011, 0.023, 0.036], tapFalloff: 0.78 },
  clapTight: { label: 'Tight Clap', category: 'Clap', dur: 1,
    note: 'Three closer, shorter bursts. Reads as one hand rather than a room full.',
    noise: { type: 'bandpass', freq: 2400, Q: 2, decay: 0.055 },
    taps: [0, 0.008, 0.016], tapFalloff: 0.7 },
  clapRoom: { label: 'Big Room Clap', category: 'Clap', dur: 1,
    note: 'Five bursts spread wider with a long tail on the last — a hall, not a booth. Wants '
      + 'space in the arrangement.',
    noise: { type: 'bandpass', freq: 1500, Q: 0.9, decay: 0.5, gain: 0.88 },
    taps: [0, 0.014, 0.037, 0.058, 0.083], tapFalloff: 0.89 },

  hatClosed: { label: 'Closed Hat', category: 'Hats', dur: 0.5,
    note: 'A very short highpassed tick. The cheapest sound in the library and the '
      + 'one you need most of.',
    noise: { type: 'highpass', freq: 7000, Q: 0.7, decay: 0.028 } },
  hatOpen: { label: 'Open Hat', category: 'Hats', dur: 2,
    note: 'The same band left to ring for a third of a second.',
    noise: { type: 'highpass', freq: 6500, Q: 0.7, decay: 0.33 } },
  hatPedal: { label: 'Pedal Hat', category: 'Hats', dur: 0.5,
    note: 'Duller and lower — the hat closing under a foot rather than being struck.',
    noise: { type: 'bandpass', freq: 4000, Q: 1.6, decay: 0.05 } },

  // A matched pair: same band, same body, one short and one left ringing. A closed and
  // an open hat that do not share a timbre read as two players, which is the thing a
  // kit is not — so the only differences here are the decay and the tiny drop in cutoff
  // a real hat has when it is not clamped shut.
  hatFoil: { label: '= Foil Hat', category: 'Hats', homeLane: 'hats', dur: 0.5,
    note: 'Thinner and brighter than the plain closed hat, with a barely-there metallic '
      + 'ping under the air. Sixteenths of it sit above a mix rather than in it.',
    noise: { type: 'highpass', freq: 9200, Q: 0.9, decay: 0.021 },
    // A square at 1150 puts its harmonics at 3.4k, 5.7k and 8k — the ping is those,
    // not the fundamental, which is why the body pitch reads low for a hat. Kept
    // inside the desk's own PITCH range (30–1200 Hz) so the pot can reach it.
    body: { type: 'square', from: 1150, to: 980, decay: 0.014, gain: 0.045 } },
  hatFoilOpen: { label: '= Foil Open Hat', category: 'Hats', homeLane: 'ohats', dur: 2,
    note: 'The Foil hat unclamped: the same band a shade lower, ringing for a quarter '
      + 'of a second, with the ping stretched to match.',
    noise: { type: 'highpass', freq: 8400, Q: 0.9, decay: 0.27 },
    body: { type: 'square', from: 3100, to: 2600, decay: 0.05, gain: 0.045 } },
  shaker: { label: 'Shaker', category: 'Perc', dur: 0.5,
    note: 'A soft band with no attack to speak of. Sixteenths of this sit under '
      + 'anything without competing.',
    noise: { type: 'bandpass', freq: 6000, Q: 1.1, decay: 0.06 } },
  tambourine: { label: 'Tambourine', category: 'Perc', dur: 1,
    note: 'Bright, jangly and slightly longer, with a touch of pitch in it.',
    noise: { type: 'highpass', freq: 5200, Q: 0.6, decay: 0.14 },
    body: { type: 'square', from: 900, to: 780, decay: 0.05, gain: 0.12 } },
  noiseSweep: { label: 'Noise Hit', category: 'FX', dur: 2,
    note: 'A wide unfiltered burst with a long fall. Not a drum so much as an '
      + 'impact — good on a crash lane, or on a downbeat that needs an edge.',
    noise: { type: 'lowpass', freq: 9000, Q: 0.3, decay: 0.45 } },

};

// Drum-synth presets — the Microtonic construction, played by `_playDrum` in
// src/engine/voices.js. Where a NOISE preset is a burst with a thump under it, one of
// these is a drum designed as two equal sources, each with its own envelope:
//
//   osc    the pitched half: waveform, `from` falling to `to` Hz over `sweep`
//          seconds, then attack / decay / curve ('exp' struck, 'lin' gated) / gain
//   noise  the seeded buffer through a filter whose cutoff can itself sweep
//          (`freq` to `to`), with the same envelope keys
//   drive  0–1, a tanh shaper over the summed sections — inside the voice, before
//          the level, so a preset drives the same however loud its lane is
//
// Either section can be left out — a tom is all osc, a clap all noise — and `taps`
// works here the way it works everywhere. Same seeded buffer as the NOISE table, so
// renders stay deterministic and stems still sum to the mix.
const DRUM = {
  dsKick: { label: 'DS Kick', category: 'Kick', dur: 1,
    note: 'The drum-synth 808: a sine dropping an octave and a half into a long sub '
      + 'tail, with a filtered click on the front and a little drive to round it.',
    osc: { type: 'sine', from: 165, to: 48, sweep: 0.045, decay: 0.45, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 3200, Q: 0.7, decay: 0.015, gain: 0.4 },
    drive: 0.2 },
  dsKickHard: { label: 'DS Hard Kick', category: 'Kick', dur: 1,
    note: 'Faster drop, shorter tail, and pushed hard into the shaper — the kick for '
      + 'a mix where the soft one disappears.',
    osc: { type: 'sine', from: 230, to: 55, sweep: 0.03, decay: 0.22, curve: 'exp', gain: 1 },
    noise: { type: 'bandpass', freq: 1100, Q: 1, decay: 0.018, gain: 0.6 },
    drive: 0.55 },
  dsSnare: { label: 'DS Snare', category: 'Snare', dur: 1,
    note: 'The two-source snare: a triangle knock falling a fourth under a wide band '
      + 'of noise that rings a little longer than the body does.',
    osc: { type: 'triangle', from: 210, to: 165, sweep: 0.04, decay: 0.11, curve: 'exp', gain: 0.7 },
    noise: { type: 'bandpass', freq: 2100, Q: 0.8, decay: 0.17, gain: 1 },
    drive: 0.18 },
  dsSnareCrack: { label: 'DS Crack Snare', category: 'Snare', dur: 1,
    note: 'Tight and driven: a short square knock, highpassed air, everything over '
      + 'in a tenth of a second. The backbeat for fast songs.',
    osc: { type: 'square', from: 255, to: 200, sweep: 0.025, decay: 0.05, curve: 'exp', gain: 0.55 },
    noise: { type: 'highpass', freq: 2900, Q: 0.8, decay: 0.085, gain: 1 },
    drive: 0.35 },
  dsClap: { label: 'DS Clap', category: 'Clap', dur: 1,
    note: 'Four bursts through a band that slides DOWN as it decays — the room going '
      + 'dull after the hit, which is what the filter sweep is for.',
    noise: { type: 'bandpass', freq: 1550, to: 1050, sweep: 0.12, Q: 1.3, decay: 0.15, gain: 1 },
    taps: [0, 0.01, 0.021, 0.033], tapFalloff: 0.8 },
  dsHatClosed: { label: 'DS Closed Hat', category: 'Hats', dur: 0.5,
    note: 'A resonant highpassed tick — sharper than the plain closed hat, closer to '
      + 'metal without being metal.',
    noise: { type: 'highpass', freq: 7800, Q: 1.2, decay: 0.032, gain: 1 } },
  dsHatOpen: { label: 'DS Open Hat', category: 'Hats', dur: 2,
    note: 'The same band left ringing for most of half a second.',
    noise: { type: 'highpass', freq: 6800, Q: 1, decay: 0.42, gain: 1 } },

  // Two more matched pairs, both built on the one thing the drum-synth has that the
  // noise table does not: a cutoff that MOVES while the hit decays. That sweep is most
  // of what separates a hat from a burst of hiss — a struck cymbal brightens for the
  // first few milliseconds and then darkens for the rest of its life, and a fixed
  // filter can only ever do one of those.
  hatSnap: { label: '= Snap Hat', category: 'Hats', homeLane: 'hats', dur: 0.5,
    note: 'The cutoff climbs an octave as it decays, so the tick opens rather than just '
      + 'stopping — a chirp too fast to hear as one. Driven a little to keep the front edge.',
    noise: { type: 'highpass', freq: 6200, to: 11000, sweep: 0.028, Q: 1.6, decay: 0.03, gain: 1 },
    drive: 0.3 },
  hatSnapOpen: { label: '= Snap Open Hat', category: 'Hats', homeLane: 'ohats', dur: 2,
    note: 'The same hat held open: the sweep runs the other way over four tenths of a '
      + 'second, so the wash goes dull as it dies the way a real cymbal does.',
    noise: { type: 'highpass', freq: 8000, to: 5200, sweep: 0.4, Q: 1.2, decay: 0.42, gain: 1 },
    drive: 0.25 },
  hatGrit: { label: '= Grit Hat', category: 'Hats', homeLane: 'hats', dur: 0.5,
    note: 'A resonant band with a square oscillator sitting in it, pushed hard into the '
      + 'shaper. Dirty and mid-forward — the hat for a mix where the bright ones vanish.',
    osc: { type: 'square', from: 3900, to: 1950, sweep: 0.006, decay: 0.028, curve: 'lin', gain: 0.16 },
    noise: { type: 'bandpass', freq: 5600, to: 3600, sweep: 0.05, Q: 4.5, decay: 0.038, gain: 1 },
    drive: 0.5 },
  hatGritOpen: { label: '= Grit Open Hat', category: 'Hats', homeLane: 'ohats', dur: 2,
    note: 'The Grit hat let go: half a second of resonant sizzle falling away to a low '
      + 'band, with the square knock still on the front.',
    osc: { type: 'square', from: 3900, to: 1950, sweep: 0.01, decay: 0.055, curve: 'lin', gain: 0.13 },
    noise: { type: 'bandpass', freq: 5600, to: 2600, sweep: 0.45, Q: 4.2, decay: 0.5, gain: 1 },
    drive: 0.5 },

  dsShaker: { label: 'DS Shaker', category: 'Perc', dur: 0.5,
    note: 'The one drum here with an ATTACK: the noise fades in over twenty '
      + 'milliseconds, which is the whole difference between a shaker and a hat.',
    noise: { type: 'bandpass', freq: 6300, Q: 1.4, attack: 0.018, decay: 0.05, gain: 1 } },
  dsTom: { label: 'DS Tom', category: 'Tom', homeLane: 'tom', dur: 1,
    note: 'A sine falling an octave over a tenth of a second with a soft lowpassed '
      + 'skin sound on the front. Tune it with the lane note key.',
    osc: { type: 'sine', from: 220, to: 105, sweep: 0.11, decay: 0.32, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 1400, Q: 0.7, decay: 0.03, gain: 0.18 },
    drive: 0.12 },
  dsRim: { label: 'DS Rim', category: 'Perc', dur: 0.5,
    note: 'A driven square knock and a narrow band of air, both gone in thirty milliseconds. '
      + 'The stick sound the engine’s rim approximates, synthesised.',
    osc: { type: 'square', from: 460, to: 635, sweep: 0.012, decay: 0.12, curve: 'exp', gain: 0.13 },
    noise: { type: 'bandpass', freq: 4300, Q: 2.2, decay: 0.235, gain: 0.44 },
    drive: 0.24 },
  vl1Pi: { label: 'VL-1 Pi', category: 'Perc', homeLane: 'rim', dur: 0.5,
    note: 'A very short, high square-wave tick: the thinner, sharper of the VL-1 rhythm '
      + 'sounds, with a slight high-pass edge and a twenty-millisecond decay.',
    osc: { type: 'square', from: 1000, to: 1000, attack: 0, decay: 0.02, curve: 'exp', gain: 1 },
    tone: { type: 'highpass', freq: 800, Q: 0.7 } },
  vl1Po: { label: 'VL-1 Po', category: 'Perc', homeLane: 'rim', dur: 0.5,
    note: 'A short, filtered square-wave pop: the lower VL-1 rhythm sound, gone in about '
      + 'thirty milliseconds.',
    osc: { type: 'square', from: 500, to: 500, attack: 0, decay: 0.03, curve: 'exp', gain: 1 },
    tone: { type: 'lowpass', freq: 2500, Q: 0.7 } },
  vl1Sha: { label: 'VL-1 Sha', category: 'Perc', homeLane: 'rim', dur: 0.5,
    note: 'The VL-1’s longer shhh: seeded white noise through a high-pass filter, with a '
      + 'clean one-hundred-sixty-millisecond decay.',
    noise: { type: 'highpass', freq: 3000, Q: 0.7, decay: 0.16, gain: 1 } },
  dsZap: { label: 'DS Zap', category: 'FX', dur: 1,
    note: 'A sawtooth falling five octaves in under a tenth of a second, driven — '
      + 'the laser tom every drum synth ships and every second track uses once.',
    osc: { type: 'sawtooth', from: 1900, to: 50, sweep: 0.085, decay: 0.1, curve: 'exp', gain: 1 },
    drive: 0.5 },
  // ---- the sections the drum synth grew ------------------------------------
  //
  // Everything below uses something `_playDrum` could not do until it did: a struck
  // RESONATOR (a click into a filter narrow enough to ring, which is what a rim, a
  // clave and a snare shell all are), an FM MODULATOR on the oscillator, a METAL
  // cluster of inharmonic squares, coloured noise, filter slopes past 12 dB, and
  // per-hit variation that is deterministic because it is derived from the schedule.
  //
  // They are here as much to be read as to be played: each one is the smallest preset
  // that shows what one of those does.
  rimRing: { label: '= Ring Rim', category: 'Perc', homeLane: 'rim', dur: 0.5,
    note: 'A stick crack over a filter narrow enough to ring — the pitch is the '
      + 'resonance, not an oscillator, so it arrives already dying. The rim the old '
      + 'construction could only approximate.',
    noise: { type: 'highpass', freq: 3800, slope: -24, color: 'violet', decay: 0.008, gain: 0.28 },
    ring: { freq: 1720, Q: 110, hit: 0.0015, decay: 0.13, gain: 1.1 },
    drive: 0.15 },
  rimWood: { label: '= Wood Rim', category: 'Perc', homeLane: 'rim', dur: 0.5,
    note: 'Lower and rounder, struck with a softer stick: a square knock on the front '
      + 'and a shell ringing under it. Sits where a wood block sits without being one.',
    osc: { type: 'square', from: 1900, to: 1750, sweep: 0.006, decay: 0.012, curve: 'lin', gain: 0.16 },
    ring: { freq: 780, Q: 80, hit: 0.004, decay: 0.2, gain: 1.2 },
    tone: { freq: 7000 } },
  rimClang: { label: '= Clang Rim', category: 'Perc', homeLane: 'rim', dur: 0.5,
    note: 'One oscillator bent by another at an unmusical ratio, then folded. Metal '
      + 'rather than wood — the rim for a song with no acoustic pretensions at all.',
    osc: { type: 'square', from: 520, to: 470, sweep: 0.02, decay: 0.11, curve: 'exp', gain: 0.8,
      fm: { type: 'sine', ratio: 3.7, index: 2.2, decay: 0.03 } },
    noise: { type: 'highpass', freq: 5200, slope: -24, decay: 0.02, gain: 0.3 },
    drive: 0.25, shape: 'fold' },
  hatCluster: { label: '= Cluster Hat', category: 'Hats', homeLane: 'hats', dur: 0.5,
    note: 'Six inharmonic squares through a steep highpass — the 808 cymbal circuit, '
      + 'natively, at about half the cost of the Tone class that hides the same ratios.',
    metal: { freq: 540, spread: 1, count: 6, hp: 8200, Q: 0.8, slope: -24, decay: 0.042 },
    humanize: { gain: 0.08 } },
  hatClusterOpen: { label: '= Cluster Open Hat', category: 'Hats', homeLane: 'ohats', dur: 2,
    note: 'The same six partials held for half a second, with the highpass a little '
      + 'lower so the body of the cluster comes through as it rings.',
    metal: { freq: 540, spread: 1, count: 6, hp: 6800, Q: 0.9, slope: -24, decay: 0.46 },
    humanize: { gain: 0.06 } },
  snarePink: { label: '= Pink Snare', category: 'Snare', homeLane: 'snare', dur: 1,
    note: 'Pink noise instead of white, so the body is in the noise rather than borrowed '
      + 'from the oscillator under it. Varies a little per hit, which is what a snare '
      + 'played by hands does.',
    osc: { type: 'triangle', from: 205, to: 160, sweep: 0.035, decay: 0.1, curve: 'exp', gain: 0.7 },
    noise: { type: 'bandpass', freq: 2200, Q: 1.1, color: 'pink', slope: -24, decay: 0.16, gain: 1 },
    drive: 0.2,
    humanize: { gain: 0.12, filter: 0.08 } },
  clapHands: { label: '= Hands Clap', category: 'Clap', homeLane: 'clap', dur: 1,
    note: 'Four bursts that each land a shade duller than the last, none of them quite '
      + 'the same twice. The tap walk and the per-hit variation are the whole idea: it '
      + 'is four hands rather than one sound repeated.',
    noise: { type: 'bandpass', freq: 1800, to: 1200, sweep: 0.14, Q: 1.5, decay: 0.14, gain: 1 },
    humanize: { gain: 0.18, filter: 0.12 },
    taps: [0, 0.009, 0.019, 0.031], tapFalloff: 0.82, tapTone: 0.93 },
  kickCrush: { label: '= Crushed Kick', category: 'Kick', homeLane: 'kick', dur: 1,
    note: 'An ordinary 808 drop through the bit crusher, with the tone control pulling '
      + 'the top off what that adds. Hardware, rather than a distortion pedal.',
    osc: { type: 'sine', from: 190, to: 48, sweep: 0.04, decay: 0.3, curve: 'exp', gain: 1 },
    drive: 0.45, shape: 'crush',
    tone: { freq: 5200 } },

  // ---- the engine's own kit, as data ---------------------------------------
  //
  // Not new sounds: the three hand-written drums in `scheduleStep` that the drum synth
  // could NOT state until it grew a knock, a two-stage decay, a sagging cluster and the
  // long buffer. Each is that engine block transcribed — same frequencies, same times,
  // same relative levels — which is the only way to answer "can this construction make
  // the kit the game already has" with something other than an opinion.
  //
  // The hat, open hat, snare, clap and tom needed nothing: `snareCrisp` has always been
  // the engine's snare, and the others are one filtered burst or one pitch drop.
  //
  // Levels are stated RELATIVE to each preset's loudest section, because a preset is
  // levelled by measurement (see `voiceGain`) rather than by the engine's own gains.
  kickEngine: { label: '= Engine Kick', category: 'Kick', homeLane: 'kick', dur: 1,
    note: 'The game’s own kick, written down: a sine dropping 165 to 48 Hz with a short '
      + 'highpassed beater click and the 300 Hz knock that lets it read on a phone.',
    osc: { type: 'sine', from: 165, to: 48, sweep: 0.05, attack: 0.006, decay: 0.305, curve: 'exp', gain: 1 },
    knock: 0.4,
    noise: { type: 'highpass', freq: 1900, Q: 1, decay: 0.0198, gain: 0.31 } },
  // The same kick at the two tunings the game actually plays it at. `Arcade Kick`,
  // `Shop Kick` and `Megamix Kick` are ENGINE presets — two bank keys each, `kickTail`
  // and `kickKnock`, which is all the hand-written kick has to be tuned by — so a song
  // could have those tunings and could not edit them. These are the same three sounds
  // as drum-synth presets, where every part of them is on a knob.
  //
  // Only the tail and the knock differ, because only they ever did: `kickGain` scales
  // the whole stack equally, so the click stays at 0.31 of the body throughout, and a
  // level belongs on the fader rather than in a preset.
  //
  // ---- why these two carry a trim and the arcade one does not ------------------
  //
  // A shorter kick has less ENERGY, and energy is what the library levels by: every
  // preset is scaled so it arrives where the lane's own voice arrives, and the kick
  // lane's target was measured at the DEFAULT tuning. So a faithful transcription of a
  // shorter kick gets normalised straight back up to the length it was written to be
  // shorter than — measured, 1.26 dB for the shop and 1.76 for the megamix.
  //
  // `trim` is the one control that sits after that normalisation, so it is the only way
  // a preset can say "quieter than the voice I replace". Nothing to do with taste: the
  // numbers are measured.
  //
  // They are measured AT THE SONG'S OWN KIT TRIMS rather than at unity, and the two
  // differ — 1.76 dB at unity against 1.15 under megamix's `kickGain 0.8 × drumGain
  // 0.53`. Neither envelope is scale-invariant: both ramp to an ABSOLUTE floor (the
  // engine's 0.001, `env`'s 0.0001), so playing either quieter also makes it shorter,
  // and by different amounts. There is no one number that is right at every level. The
  // song these were transcribed from is where they have to be right, so that is where
  // they were measured; anywhere else they run a little hot.
  kickShop: { label: '= Shop Kick', category: 'Kick', homeLane: 'kick', dur: 1,
    note: 'The engine kick as the shop and the Gary themes tune it: the sub ring cut '
      + 'short and the knock halved, so a busy bar does not become one long boom.',
    osc: { type: 'sine', from: 165, to: 48, sweep: 0.05, attack: 0.006, decay: 0.2287, curve: 'exp', gain: 1 },
    knock: 0.202,
    noise: { type: 'highpass', freq: 1900, Q: 1, decay: 0.0198, gain: 0.31 },
    trim: -0.42 },
  kickMegamix: { label: '= Megamix Kick', category: 'Kick', homeLane: 'kick', dur: 1,
    note: 'The hardest front of the three and the shortest tail — it has to cut through '
      + 'every other cabinet playing at once.',
    osc: { type: 'sine', from: 165, to: 48, sweep: 0.05, attack: 0.006, decay: 0.1982, curve: 'exp', gain: 1 },
    knock: 0.227,
    noise: { type: 'highpass', freq: 1900, Q: 1, decay: 0.0198, gain: 0.31 },
    trim: -1.15 },
  snareEngine: { label: '= Engine Snare', category: 'Snare', homeLane: 'snare', dur: 1,
    note: 'The game’s own snare: a 2.6 kHz band of noise with a triangle body falling '
      + '210 to 140 Hz under it. The backbeat every song was balanced against.',
    osc: { type: 'triangle', from: 210, to: 140, sweep: 0.05, decay: 0.1031, curve: 'exp', gain: 0.375 },
    noise: { type: 'bandpass', freq: 2600, Q: 0.7, decay: 0.1437, gain: 1 } },
  clapEngine: { label: '= Engine Clap', category: 'Clap', homeLane: 'clap', dur: 1,
    note: 'The game’s own clap: three highpassed bursts twelve milliseconds apart, the '
      + 'LAST of them the loudest and four times as long — two slaps, then the room.',
    noise: { type: 'highpass', freq: 1500, Q: 1, decay: 0.0544, gain: 1 },
    taps: [0, 0.012, 0.024], tapGains: [1, 1, 1.625], tapDecays: [0.0544, 0.0544, 0.2092] },
  hatEngine: { label: '= Engine Hat', category: 'Hats', homeLane: 'hats', dur: 0.5,
    note: 'The game’s own closed hat, exactly: noise above 5.2 kHz, gone in fifty '
      + 'milliseconds. The tick under two thirds of the soundtrack.',
    noise: { type: 'highpass', freq: 5200, Q: 1, decay: 0.0932, gain: 1 } },
  ohatEngine: { label: '= Engine Open Hat', category: 'Hats', homeLane: 'ohats', dur: 2,
    note: 'The game’s own open hat: the same noise a thousand hertz lower, left to '
      + 'sizzle for a fifth of a second.',
    noise: { type: 'highpass', freq: 4200, Q: 1, decay: 0.4232, gain: 1 } },
  tomEngine: { label: '= Engine Tom', category: 'Tom', homeLane: 'tom', dur: 1,
    note: 'The game’s own tom: a triangle falling most of an octave onto the lane’s own '
      + 'note. Tuned by the lane, the way the engine tunes it.',
    osc: { type: 'triangle', from: 234, to: 130, sweep: 0.08, attack: 0.004, decay: 0.4606, curve: 'exp', gain: 1 } },
  rimEngine: { label: '= Engine Rim', category: 'Perc', homeLane: 'rim', dur: 0.5,
    note: 'The game’s own rimshot: three inharmonic squares sagging as they ring through '
      + 'a narrow band, a stick snap over the top and a woody tonk underneath — with the '
      + 'two-stage decay that makes it a strike rather than a fade.',
    osc: { type: 'triangle', from: 430, to: 300, sweep: 0.05, decay: 0.0833, curve: 'exp', gain: 0.38 },
    noise: { type: 'highpass', freq: 3200, Q: 1, decay: 0.0165, gain: 0.45 },
    metal: { wave: 'square', freq: 1720, to: 1617, sweep: 0.06, ratios: [1, 1.5291, 1.9477], count: 3,
      filter: 'bandpass', hp: 1750, Q: 3.6, decay: 0.1, sag: 0.16, sagAt: 0.02, gain: 1 } },
  crashEngine: { label: '= Engine Crash', category: 'Crash', homeLane: 'crash', dur: 5,
    note: 'The game’s own crash: bright on the transient and darkening as it falls, a '
      + 'lowpass closing from 9 kHz to 1.1 over the whole hit. Long enough that it plays '
      + 'off the 2.5-second buffer rather than looping the short one.',
    noise: { type: 'lowpass', freq: 9000, to: 1100, sweep: 1.25, Q: 0.7, attack: 0.005, decay: 1.5743, gain: 1 },
    tone: { type: 'highpass', freq: 1200, Q: 1 } },
  // The crash is the ONE engine drum whose length is tempo-relative — `spb * crashDur`,
  // where every other block is written in absolute seconds. So a crash preset is only
  // the engine's crash at one tempo and one `crashDur`: the one above is 5 steps at 120
  // (megamix), and this is the finale's 7 steps at 126, which is 833ms rather than 1250.
  // A third song wanting a third length needs a third preset, or the lane keeps the
  // hand-written crash, which reads the tempo for itself.
  crashFinale: { label: '= Finale Crash', category: 'Crash', homeLane: 'crash', dur: 7,
    note: 'The finale’s crash: the same closing lowpass as the engine’s, two thirds the '
      + 'length, because the finale runs at 126 and asks for seven steps of it.',
    noise: { type: 'lowpass', freq: 9000, to: 1100, sweep: 0.8333, Q: 0.7, attack: 0.005, decay: 1.0495, gain: 1 },
    tone: { type: 'highpass', freq: 1200, Q: 1 } },

  dsCrackSnare2: { label: 'DS Crack Snare 2', category: 'Snare', dur: 1,
    note: 'Tight and driven: a short square knock, highpassed air, everything over in a tenth '
      + 'of a second. The backbeat for fast songs.',
    osc: { type: 'square', from: 255, to: 440, sweep: 0.025, decay: 0.05, curve: 'exp', gain: 0.55 },
    noise: { type: 'highpass', freq: 2900, Q: 0.8, decay: 0.3, gain: 1 },
    drive: 0.35 },
  dsClosedHat2: { label: 'DS Closed Hat 3', category: 'Hats', dur: 0.5,
    note: 'A resonant highpassed tick — sharper than the plain closed hat, closer to metal '
      + 'without being metal.',
    noise: { type: 'highpass', freq: 6275, Q: 5.1, decay: 0.3, gain: 1.72, to: 2800, sweep: 0.31 } },
  engineCrash: { label: '= Engine Crash', category: 'Crash', homeLane: 'crash', dur: 5,
    note: 'The game’s own crash: bright on the transient and darkening as it falls, a lowpass '
      + 'closing from 9 kHz to 1.1 over the whole hit. Long enough that it plays off the '
      + '2.5-second buffer rather than looping the short one.',
    osc: { type: 'sine', from: 190, to: 52, sweep: 0.07, decay: 0.35, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 9000, to: 4600, sweep: 1.25, Q: 15.9, attack: 0.005, decay: 1.44, gain: 1, hold: 0.181, sag: 0.26 },
    ring: { type: 'bandpass', freq: 3885, Q: 40, hit: 0.0185, decay: 0.25, curve: 'exp', gain: 1, sag: 0.48, to: 3960 },
    metal: { wave: 'square', freq: 800, spread: 1, count: 6, hp: 3000, Q: 0.7, decay: 0.2, gain: 1 },
    drive: 0.63, shape: 'crush',
    tone: { type: 'highpass', freq: 7300 },
    humanize: { gain: 0.18, filter: 0.15, pitch: 0.08 },
    starter: false },

  // ---- requested machine auditions ---------------------------------------
  // These are deliberately all drum-synth entries: the family resemblance is in
  // the construction, not just in the label. They are starting points for listening,
  // not claims of component-level recreations of the original hardware.
  ds909Kick: { label: '=909 Kick', category: 'Kick', homeLane: 'kick', dur: 2,
    note: 'A compact 909-style kick: hard beater click, fast pitch drop and a firm '
      + 'low body that stays out of the sub for the next bass note.',
    osc: { type: 'sine', from: 185, to: 45, sweep: 0.035, attack: 0.001, decay: 0.42, curve: 'exp', gain: 1 },
    noise: { type: 'highpass', freq: 2600, Q: 1.2, decay: 0.012, gain: 0.34 },
    drive: 0.28 },
  ds909KickPunch: { label: '=909 Kick Punch', category: 'Kick', homeLane: 'kick', dur: 1,
    note: 'A shorter, louder 909-style kick with a more obvious front edge and a '
      + 'tighter tail for four-on-the-floor patterns.',
    osc: { type: 'sine', from: 225, to: 52, sweep: 0.025, attack: 0.001, decay: 0.24, curve: 'exp', gain: 1 },
    noise: { type: 'bandpass', freq: 1450, Q: 1.1, decay: 0.018, gain: 0.52 },
    drive: 0.42 },
  ds909Snare: { label: '=909 Snare', category: 'Snare', homeLane: 'snare', dur: 1,
    note: 'A bright 909-style snare: a pitched shell under a wide, slightly metallic noise '
      + 'burst with enough decay to carry a backbeat.',
    osc: { type: 'triangle', from: 135, to: 285, sweep: 0.03, decay: 0.165, curve: 'exp', gain: 0.72, hold: 0 },
    knock: 1,
    noise: { type: 'bandpass', freq: 1950, Q: 0.8, decay: 0.88, gain: 1.62, hold: 0.019, attack: 0.001, color: 'white', slope: -24, sweep: 0.155 },
    drive: 0.42, shape: 'fold',
    trim: 1.6 },
  ds909SnareCrack: { label: '=909 Snare Crack', category: 'Snare', homeLane: 'snare', dur: 1,
    note: 'A sharper 909-style snare variant with a square shell and high-passed '
      + 'wire noise for a more aggressive dance-floor backbeat.',
    osc: { type: 'square', from: 260, to: 190, sweep: 0.022, decay: 0.06, curve: 'exp', gain: 0.5 },
    noise: { type: 'highpass', freq: 3100, Q: 0.9, decay: 0.12, gain: 1 },
    drive: 0.34 },
  ds909Clap: { label: '=909 Clap', category: 'Clap', homeLane: 'clap', dur: 1,
    note: 'A dry 909-style clap built from four close bursts, with a bright first hit '
      + 'and a short room-like tail on the last hand.',
    noise: { type: 'bandpass', freq: 1850, to: 1200, sweep: 0.11, Q: 1.5, decay: 0.14, gain: 1 },
    taps: [0, 0.009, 0.019, 0.032], tapFalloff: 0.82 },
  ds909Hat: { label: '=909 Hat', category: 'Hats', homeLane: 'hats', dur: 0.5,
    note: 'A crisp 909-style closed hat: bright metallic air with a quick filter '
      + 'movement that leaves room for fast sixteenths.',
    noise: { type: 'highpass', freq: 7200, to: 10500, sweep: 0.018, Q: 1.5, decay: 0.035, gain: 1 },
    drive: 0.24 },
  ds909OpenHat: { label: '=909 Open Hat', category: 'Hats', homeLane: 'ohats', dur: 2,
    note: 'The open partner to =909 Hat: the same bright attack opening into a '
      + 'controlled metallic wash instead of a long cymbal tail.',
    noise: { type: 'highpass', freq: 7600, to: 5200, sweep: 0.35, Q: 1.2, decay: 0.38, gain: 1 },
    drive: 0.2 },
  ds909Tom: { label: '=909 Tom', category: 'Tom', homeLane: 'tom', dur: 1,
    note: 'A tuned 909-style tom with a clean electronic pitch fall and a small '
      + 'low skin click at the front of the note.',
    osc: { type: 'sine', from: 260, to: 125, sweep: 0.08, decay: 0.34, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 1500, Q: 0.8, decay: 0.025, gain: 0.2 },
    drive: 0.12 },
  ds909Rim: { label: '=909 Rim', category: 'Perc', homeLane: 'rim', dur: 0.5,
    note: 'A hard 909-style rim hit: a short square tick over a narrow resonant '
      + 'ring that makes the stick sound cut through a busy pattern.',
    osc: { type: 'square', from: 980, to: 760, sweep: 0.008, decay: 0.03, curve: 'lin', gain: 0.22 },
    noise: { type: 'highpass', freq: 4300, Q: 2.2, decay: 0.018, gain: 0.36 },
    ring: { freq: 1650, Q: 95, hit: 0.001, decay: 0.1, gain: 1 },
    drive: 0.2 },
  ds909Crash: { label: '=909 Crash', category: 'Crash', homeLane: 'crash', dur: 5,
    note: 'A bright 909-style crash with a dense front and a high end that darkens '
      + 'as it decays, intended for phrase changes rather than every bar.',
    noise: { type: 'lowpass', freq: 9200, to: 2400, sweep: 0.9, Q: 0.8, decay: 1.35, gain: 1 },
    metal: { wave: 'square', freq: 610, spread: 1, count: 6, hp: 3300, Q: 0.8, decay: 0.65, gain: 0.8 },
    drive: 0.28 },

  dsCr78Kick: { label: '=CR78 Kick', category: 'Kick', homeLane: 'kick', dur: 1,
    note: 'A small, soft CR78-style kick with a short low thump and a little wooden '
      + 'front edge rather than a long club sub.',
    osc: { type: 'sine', from: 135, to: 55, sweep: 0.02, attack: 0.001, decay: 0.22, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 1100, Q: 0.8, decay: 0.02, gain: 0.26 } },
  dsCr78Snare: { label: '=CR78 Snare', category: 'Snare', homeLane: 'snare', dur: 1,
    note: 'A polite CR78-style snare with a low paper-like body and a muted noise '
      + 'burst that sits behind a melody instead of dominating it.',
    osc: { type: 'triangle', from: 175, to: 125, sweep: 0.025, decay: 0.09, curve: 'exp', gain: 0.62 },
    noise: { type: 'bandpass', freq: 1450, Q: 0.8, decay: 0.1, gain: 0.72 } },
  dsCr78Hat: { label: '=CR78 Hat', category: 'Hats', homeLane: 'hats', dur: 0.5,
    note: 'A dry, dusty CR78-style hat with a lower cutoff and a short envelope that '
      + 'keeps the machine pulse present without sounding glossy.',
    noise: { type: 'highpass', freq: 4800, Q: 0.7, decay: 0.055, gain: 0.8 } },
  dsCr78Clap: { label: '=CR78 Clap', category: 'Clap', homeLane: 'clap', dur: 1,
    note: 'A small CR78-style handclap made from three close, slightly dull bursts '
      + 'with more box than brightness.',
    noise: { type: 'bandpass', freq: 1250, to: 900, sweep: 0.08, Q: 1.1, decay: 0.1, gain: 0.82 },
    taps: [0, 0.012, 0.026], tapFalloff: 0.7 },
  dsCr78Cowbell: { label: '=CR78 Cowbell', category: 'Perc', homeLane: 'tom', dur: 1,
    note: 'A compact CR78-style cowbell with a square attack and a restrained resonant '
      + 'ring, tuned to stay characterful without taking over the kit.',
    osc: { type: 'square', from: 540, to: 505, sweep: 0.004, decay: 0.13, curve: 'exp', gain: 0.5 },
    ring: { freq: 820, Q: 28, hit: 0.001, decay: 0.2, gain: 0.82 },
    drive: 0.12 },
  dsCr78Tom: { label: '=CR78 Tom', category: 'Tom', homeLane: 'tom', dur: 1,
    note: 'A rounded CR78-style tom with a short pitch drop, tuned for simple fills '
      + 'and little call-and-response figures.',
    osc: { type: 'sine', from: 220, to: 145, sweep: 0.055, decay: 0.28, curve: 'exp', gain: 1 } },

  ds808Kick: { label: '=808 Kick', category: 'Kick', homeLane: 'kick', dur: 3,
    note: 'A long 808-style sub kick: deep sine drop, soft front click and a tail '
      + 'that can become the bass line when it is tuned in a pattern.',
    osc: { type: 'sine', from: 170, to: 36, sweep: 0.06, attack: 0.001, decay: 0.78, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 2200, Q: 0.7, decay: 0.02, gain: 0.25 },
    drive: 0.12 },
  ds808Snare: { label: '=808 Snare', category: 'Snare', homeLane: 'snare', dur: 1,
    note: 'A round 808-style snare with a low electronic shell under a broad, slightly '
      + 'darker noise body than the sharper 909 family.',
    osc: { type: 'triangle', from: 190, to: 145, sweep: 0.035, decay: 0.13, curve: 'exp', gain: 0.62 },
    noise: { type: 'bandpass', freq: 1750, Q: 0.7, decay: 0.18, gain: 1 },
    drive: 0.16 },
  ds808Clap: { label: '=808 Clap', category: 'Clap', homeLane: 'clap', dur: 1,
    note: 'A wide 808-style clap with a low, roomy burst and four taps that spread '
      + 'into a soft machine-room tail.',
    noise: { type: 'bandpass', freq: 1450, to: 950, sweep: 0.16, Q: 1, decay: 0.18, gain: 1 },
    taps: [0, 0.012, 0.027, 0.046], tapFalloff: 0.86 },
  ds808Hat: { label: '=808 Hat', category: 'Hats', homeLane: 'hats', dur: 0.5,
    note: 'The characteristic 808-style closed cymbal: six inharmonic metal partials '
      + 'through a highpass, clipped to a very short electronic tick.',
    metal: { freq: 540, spread: 1, count: 6, hp: 7600, Q: 0.9, slope: -24, decay: 0.04 },
    humanize: { gain: 0.05 } },
  ds808OpenHat: { label: '=808 Open Hat', category: 'Hats', homeLane: 'ohats', dur: 2,
    note: 'The open 808-style cymbal partner: the same inharmonic cluster left ringing '
      + 'with a lower filter so its body is audible as it fades.',
    metal: { freq: 540, spread: 1, count: 6, hp: 6100, Q: 0.9, slope: -24, decay: 0.42 },
    humanize: { gain: 0.04 } },
  ds808Cowbell: { label: '=808 Cowbell', category: 'Perc', homeLane: 'tom', dur: 1,
    note: 'A bright 808-style cowbell with two inharmonic struck tones, a hard attack '
      + 'and the unmistakable short metallic ring.',
    osc: { type: 'square', from: 540, to: 510, sweep: 0.004, decay: 0.11, curve: 'exp', gain: 0.55 },
    ring: { freq: 805, Q: 34, hit: 0.001, decay: 0.18, gain: 1 },
    drive: 0.18 },
  ds808Tom: { label: '=808 Tom', category: 'Tom', homeLane: 'tom', dur: 2,
    note: 'A deep 808-style tom with a long sine drop and a clean, rounded tail for '
      + 'syncopated fills and tuned percussion lines.',
    osc: { type: 'sine', from: 215, to: 92, sweep: 0.1, decay: 0.48, curve: 'exp', gain: 1 },
    drive: 0.1 },
  // ---- re-voiced from Tone classes -----------------------------------------
  //
  // These four were a MetalSynth and an FMSynth carrying `taps`, back when the pooled
  // path honoured them. A clap and a flam are percussion whatever generates them, so
  // they are built here now, where the repeat lives — the metal bank for the struck
  // ones, an FM operator on the oscillator for the dry one.
  snareFlam: { label: 'Flam Snare', category: 'Snare', dur: 1,
    note: 'Two strikes 22ms apart — the drummer’s flam, which reads as one hit with '
      + 'a thicker front.',
    noise: { type: 'bandpass', freq: 1600, to: 1150, sweep: 0.1, Q: 1.3, decay: 0.14, gain: 1 },
    metal: { wave: 'square', freq: 760, spread: 1, count: 6, hp: 3200, Q: 0.8, decay: 0.12, gain: 0.55 },
    taps: [0, 0.022], tapFalloff: 0.85 },
  clapMetal: { label: 'Metal Clap', category: 'Clap', dur: 1,
    note: 'The clap shape — four strikes a few milliseconds apart — on struck metal '
      + 'instead of noise. Harder and more electronic than the real thing.',
    noise: { type: 'bandpass', freq: 2100, to: 1500, sweep: 0.08, Q: 1.5, decay: 0.09, gain: 0.85 },
    metal: { wave: 'square', freq: 900, spread: 1, count: 6, hp: 3800, Q: 0.8, decay: 0.08, gain: 0.7 },
    taps: [0, 0.012, 0.025, 0.038], tapFalloff: 0.76 },
  clapFm: { label: 'FM Clap', category: 'Clap', dur: 1,
    note: 'Three short FM cracks in quick succession. Drier than the metal clap and '
      + 'easier to fit under a vocal.',
    osc: { type: 'sine', from: 330, to: 250, sweep: 0.025, decay: 0.07, curve: 'exp', gain: 0.7,
      fm: { type: 'square', ratio: 5.1, index: 2.2, decay: 0.03 } },
    noise: { type: 'bandpass', freq: 1750, to: 1250, sweep: 0.06, Q: 1.4, decay: 0.06, gain: 0.6 },
    taps: [0, 0.01, 0.021], tapFalloff: 0.74 },
  buzzRoll: { label: 'Buzz Roll', category: 'Perc', dur: 1,
    note: 'Six strikes across a sixteenth, dying away — a drag, or a machine failing '
      + 'to start.',
    noise: { type: 'bandpass', freq: 1900, to: 1550, sweep: 0.04, Q: 1.7, decay: 0.05, gain: 0.75 },
    metal: { wave: 'square', freq: 800, spread: 1, count: 6, hp: 3400, Q: 0.8, decay: 0.045, gain: 0.65 },
    taps: [0, 0.008, 0.016, 0.024, 0.032, 0.04], tapFalloff: 0.84 },
};

// Measured, by tools/measure-voices.js — do not hand-edit any of the three blocks.
//
// LANE_TARGETS is what ONE note of that lane's own hand-written voice reaches through
// the render pipeline; LEVELS and PEAKS are what one note of each preset reaches at
// unity. `voiceGain` divides target by preset, so a preset arrives where the voice it
// replaces arrived. Per note, deliberately: a chord sums, and it sums the same way for
// both, so a per-chord target would come out three times too loud.
//
//   level   the K-weighted RMS of the whole render — energy, the number `voiceGain`
//           divides. See the note there for why it is not the peak.
//   peak    the sample peak. Not the level any more; it is what says a preset spends
//           more headroom than the lane it lands on, and what an unmeasured song copy
//           falls back to.
const LANE_TARGETS = {
  bass: { level: 0.012909, peak: 0.2118 },
  lead: { level: 0.006496, peak: 0.1251 },
  leadHarm: { level: 0.004459, peak: 0.0834 },
  twinkle: { level: 0.003194, peak: 0.0365 },
  chords: { level: 0.008161, peak: 0.1115 },
  organChords: { level: 0.002979, peak: 0.034 },
  organSwoop: { level: 0.002201, peak: 0.0393 },
  electroFx: { level: 0.000384, peak: 0.0071 },
  vox: { level: 0.004592, peak: 0.2422 },
  shout: { level: 0.006171, peak: 0.2112 },
  gliss: { level: 0.020371, peak: 0.1039 },
  organGliss: { level: 0.002002, peak: 0.0474 },
  keyGliss: { level: 0.006408, peak: 0.072 },
  sweeps: { level: 0.000529, peak: 0.007 },
  kick: { level: 0.0136, peak: 0.3315 },
  snare: { level: 0.004801, peak: 0.1615 },
  clap: { level: 0.007988, peak: 0.1627 },
  rim: { level: 0.006472, peak: 0.1977 },
  hats: { level: 0.003575, peak: 0.1127 },
  ohats: { level: 0.006729, peak: 0.1147 },
  crash: { level: 0.007996, peak: 0.1357 },
  tom: { level: 0.009485, peak: 0.1824 }
};

// Categories, in picker order. Sound type, not lane — see the note at the top.
export const VOICE_CATEGORIES = [
  'Bass', 'Lead', 'Pad', 'Keys', 'Pluck', 'Organ', 'Bells', 'Orch', 'FX',
  // The kit, split by what a drum IS rather than lumped together. The lane you opened
  // puts its own kind first, but the seven drum groups stay together in the picker.
  'Kick', 'Snare', 'Hats', 'Clap', 'Tom', 'Crash', 'Perc',
];

const LEGACY_CATEGORY = {
  Basses: 'Bass', Leads: 'Lead', Pads: 'Pad', Plucks: 'Pluck', Organs: 'Organ',
  'Bells & Mallets': 'Bells', 'Brass & Strings': 'Orch', 'Rough & Electric': 'FX',
  Kicks: 'Kick', Snares: 'Snare', Claps: 'Clap', Hats: 'Hats', Percussion: 'Perc',
};

const LEGACY_ROLE_IDS = {
  Tom: new Set(['engTom', 'tom', 'dsTom', 'tomEngine', 'ds909Tom', 'dsCr78Tom', 'ds808Tom']),
  Crash: new Set(['engCrash', 'engFinaleCrash', 'metalCrash', 'crashEngine', 'crashFinale', 'engineCrash', 'ds909Crash']),
  FX: new Set(['zap', 'stZap', 'dsZap']),
  Orch: new Set(['breathPad', 'tpAlienChorus', 'tpDelicateWind', 'stBreathPad']),
  Perc: new Set(['dsCr78Cowbell', 'ds808Cowbell']),
};

const CATEGORY_FOR_HOME_LANE = {
  kick: 'Kick', snare: 'Snare', clap: 'Clap', hats: 'Hats', ohats: 'Hats',
  tom: 'Tom', crash: 'Crash', rim: 'Perc',
};

/** Normalize category metadata from old song-local preset snapshots. */
export function normalizeVoiceCategory(voice) {
  const old = voice?.category;
  const category = LEGACY_CATEGORY[old] || old;
  const id = voice?.id || '';
  for (const [role, ids] of Object.entries(LEGACY_ROLE_IDS)) {
    if (ids.has(id)) return role;
  }
  if (old === 'Audition') {
    if (/cowbell/i.test(voice?.label || '')) return 'Perc';
    return CATEGORY_FOR_HOME_LANE[voice?.homeLane] || 'Bass';
  }
  return category;
}

// Why there is no noise-based drum here — no snare with a real snap, no closed hat
// that hisses. `Tone.Noise` fills its buffer from `Math.random` at construction, so
// two renders of the same song would not be sample-identical, and stems would stop
// summing to the mix — the property tools/lib/render-bank-browser.js relies on to
// apportion a clipping peak between lanes. The drums here are oscillator-based
// (MembraneSynth, MetalSynth), which is why they read as 808 rather than acoustic.
// A seeded noise buffer, the way AudioSys.noiseBuf already is, is what unlocks the
// rest — see the note in src/engine/voices.js.

// Engine presets — the game's own voices, named. `bank` is merged onto the bank for
// the lane it is chosen on; `osc` sets that lane's own oscillator-type key, which is
// what makes a plain waveform work on any lane rather than only on the one whose key
// it was written for. No `peak`: an engine preset plays at the lane's authored gain,
// because it IS the lane's authored voice.
//
// Two kinds of engine preset, and the difference is what `quoted` marks.
//
// The engine's OWN are constructions: the filtered saw, the 80s stack, the drawbars,
// the four waveforms, the arcade kit. They are what `scheduleStep` can be asked to
// do, so they are offered whether or not a song happens to be sitting on one — a
// capability with nobody using it is still a capability.
//
// A QUOTATION is a sound copied off a particular song, and it is only worth its row
// in the picker while that song still makes it. Retune the finale's stab and `Finale
// Saw Stab` stops being the finale's saw stab; it becomes a name for a sound nothing
// in the game plays, sitting in the picker looking like provenance. So a quotation is
// offered only while a cabinet or a game theme still plays it, which is decided in
// src/data/voices-in-play.js — this file imports nothing and stays a leaf.
const quoted = (table) => Object.fromEntries(
  Object.entries(table).map(([id, v]) => [id, { ...v, quoted: true }]),
);

const ENGINE = {
  engSquare: { label: 'Square', category: 'Lead', osc: 'square',
    note: 'The arcade default — what most lanes play if nothing says otherwise.' },
  engSaw: { label: 'Sawtooth', category: 'Lead', osc: 'sawtooth',
    note: 'Brighter and harsher, all harmonics present. The Speed Zone lead.' },
  engTriangle: { label: 'Triangle', category: 'Lead', osc: 'triangle',
    note: 'Soft and hollow, almost a flute. Frost Fortress and Crypt Shift.' },
  engSine: { label: 'Sine', category: 'Keys', osc: 'sine',
    note: 'One harmonic and nothing else. Disappears in a busy mix, which is '
      + 'sometimes exactly the job.' },
  engFilteredSaw: {
    label: 'Filtered Saw', category: 'Bass', lanes: ['bass'],
    bank: { bassFilteredSaw: true },
    note: 'Saw through a resonant lowpass that shuts as the note decays. Bright '
      + 'edge, round body, quiet sine sub underneath.',
  },
  engFilteredSawOpen: {
    label: 'Filtered Saw, Open', category: 'Bass', lanes: ['bass'],
    bank: { bassFilteredSaw: true, bassFilterOpen: 2200, bassFilterClose: 520, bassFilterQ: 1.6 },
    note: 'The same, with the filter opening further and resonating harder — more '
      + 'growl, less weight.',
  },
  eng80s: {
    label: '80s Bass', category: 'Bass', lanes: ['bass'],
    bank: { bass80s: true },
    note: 'Square body, sine sub, and a real octave layer above — built to survive '
      + 'a phone speaker that cannot reproduce the fundamental.',
  },
  eng80sSaw: {
    label: '80s Bass, Saw', category: 'Bass', lanes: ['bass'],
    bank: { bass80s: true, bass80sBodyType: 'sawtooth' },
    note: 'The same construction with a sawtooth body: harder, more front.',
  },
  engBright: {
    label: 'Bright Octave', category: 'Lead',
    bank: { leadBright: true },
    note: 'The lane’s own waveform with a quiet octave sine laid on top. Adds air '
      + 'without changing the character underneath.',
  },
  engDrawbar: {
    label: 'Drawbar Organ', category: 'Organ', lanes: ['organChords'],
    bank: {},
    note: 'Sine partials at 8′, 4′, 2⅔′, 2′ and 1⅓′ — the organ lane’s own voice.',
  },
  engDrawbarBright: {
    label: 'Drawbar Organ, Bright', category: 'Organ', lanes: ['organChords'],
    bank: { organBright: true },
    note: 'The upper drawbars pulled further out. Cuts through where the soft '
      + 'registration sits under everything.',
  },
  engDrawbarPerc: {
    label: 'Drawbar + Percussion', category: 'Organ', lanes: ['organChords'],
    bank: { organPercussion: true },
    note: 'Hammond-style key-attack pip on the third harmonic, kept dry so repeated '
      + 'off-beat stabs stay crisp.',
  },

  // ---- The songs' own voicings --------------------------------------------
  // Mined from the banks: these are the sounds tuned by ear over the project, which
  // until now could only be had by copying keys out of cabinets.js. Named for where
  // they come from. Levels are deliberately absent — a preset is a timbre, and the
  // fader is where a level belongs.
  ...quoted({
    engTitleBass: { label: 'Title Bass', category: 'Bass', lanes: ['bass'],
      bank: { bassType: 'sine', bassAttack: 0.18, bassDur: 7.4 },
      note: 'The nocturne bass from the title theme: a sine so slow to arrive it is felt '
        + 'before it is heard, and it holds for most of two bars.' },
    engFinaleBass: { label: 'Finale Bass', category: 'Bass', lanes: ['bass'],
      bank: { bassType: 'square', bassAttack: 0.001, bassDur: 0.95 },
      note: 'Short, hard and square — the house-arrangement bass from the finale, one '
        + 'note per step with no overlap.' },
    engFinaleBassRepeat: { label: 'Finale Bass, Ghosted', category: 'Bass', lanes: ['bass'],
      bank: { bassType: 'sawtooth', bassDur: 3.2, bassRepeat: 3, bassRepeatDur: 0.7, bassRepeatGain: 0.38 },
      note: 'Sawtooth with a written-in slapback three steps later — a delay locked to '
        + 'the grid, with no tail. The finale’s lift.' },
    engMegamixBass: { label: 'Megamix Bass', category: 'Bass', lanes: ['bass'],
      bank: {
        bassFilteredSaw: true, bassFilterOpen: 820, bassFilterClose: 260, bassFilterQ: 0.9,
        bassFilteredSawSubGain: 0.21, bassEcho: false,
      },
      note: 'The filtered saw dialled darker and rounder than default, with the sub '
        + 'brought up. Holds a mix together under everything else in the megamix.' },
    engShopBass: { label: 'Shop Bass', category: 'Bass', lanes: ['bass'],
      bank: {
        bassFilteredSaw: true, bassFilterOpen: 1100, bassFilterClose: 310, bassFilterQ: 1.1,
        bassFilteredSawSubGain: 0.22, bassType: 'sine', bassAttack: 0.003, bassDur: 1.08, bassEcho: false,
      },
      note: 'The shop theme’s filtered saw: brighter than the megamix’s and shorter, so '
        + 'it bounces rather than sustains.' },
    engLoungeBass: { label: 'Lounge Bass', category: 'Bass', lanes: ['bass'],
      bank: { bassType: 'triangle', bassDur: 1.25 },
      note: 'Soft triangle, no filter, one note per beat. Dolores’ counter music.' },
    engWalkingBass: { label: 'Walking Bass', category: 'Bass', lanes: ['bass'],
      bank: { bassType: 'sine', bassDur: 1.85, bassRepeat: 3, bassRepeatDur: 0.55, bassRepeatGain: 0.22 },
      note: 'Sine with a quiet ghost note three steps behind — the shuffle in Gary’s '
        + 'pawn-shop themes.' },
    engBright80sBass: { label: '80s Bass, Shop', category: 'Bass', lanes: ['bass'],
      bank: { bass80s: true, bassType: 'triangle', bassAttack: 0.003, bassDur: 0.94, bassRepeat: 0 },
      note: 'The 80s stack with a triangle body and a very short note — the bright-organ '
        + 'shop auditions.' },

    engTitleLead: { label: 'Title Lead', category: 'Lead', lanes: ['lead'],
      bank: { leadType: 'sine', leadAttack: 0.16, leadDur: 5.5 },
      note: 'A sine that swells in over a sixth of a second and holds. The title theme, '
        + 'remembered from an empty arcade.' },
    engFinaleLead: { label: 'Finale Lead', category: 'Lead', lanes: ['lead'],
      bank: { leadType: 'sawtooth', leadAttack: 0.006, leadDur: 1.7 },
      note: 'Sawtooth, fast attack, overlapping notes. The finale’s hook.' },
    engMegamixLead: { label: 'Megamix Lead', category: 'Lead', lanes: ['lead'],
      bank: { leadType: 'triangle', leadAttack: 0.008, leadDur: 1.25 },
      note: 'Triangle with a little length on it — soft enough to sit inside a mix '
        + 'carrying every other cabinet at once.' },
    engShopLead: { label: 'Shop Lead', category: 'Lead', lanes: ['lead'],
      bank: { leadType: 'triangle', leadAttack: 0.012, leadBright: true, leadBrightGain: 0.16, leadDur: 1.55 },
      note: 'Triangle with the octave-sine brightener on top: the shop’s lead, which '
        + 'needs air to read over the organ.' },
    engCounterLead: { label: 'Counter Lead', category: 'Lead', lanes: ['lead'],
      bank: { leadType: 'triangle', leadAttack: 0.006, leadDur: 0.82 },
      note: 'Short triangle stabs — Dolores’ side of the shop auditions.' },

    engTitleHarm: { label: 'Title Harmony', category: 'Lead', lanes: ['leadHarm'],
      bank: { harmType: 'triangle', harmAttack: 0.28, harmDur: 6.2 },
      note: 'The slowest voice in the game: a triangle taking more than a quarter of a '
        + 'second to arrive, under the title lead.' },
    engSineHarm: { label: 'Sine Harmony', category: 'Lead', lanes: ['leadHarm'],
      bank: { harmType: 'sine', harmDur: 1.35 },
      note: 'A plain sine third. Adds width to a lead without adding harmonics to fight '
        + 'with it — the shop themes’ partner voice.' },

    engTitleChords: { label: 'Title Chords', category: 'Pad', lanes: ['chords'],
      bank: { chordType: 'triangle', chordAttack: 0.35, chordDur: 7.6 },
      note: 'Held triangle chords with a third of a second of attack. A pad in all but '
        + 'name, and the title theme’s bed.' },
    engFinaleStab: { label: 'Finale Stab', category: 'Keys', lanes: ['chords'],
      bank: { chordType: 'square', chordAttack: 0.005, chordDur: 0.32 },
      note: 'A square chord lasting a third of a step. The house stab.' },
    engFinaleSawStab: { label: 'Finale Saw Stab', category: 'Keys', lanes: ['chords'],
      bank: { chordType: 'sawtooth', chordDur: 0.28 },
      note: 'The same shape with a sawtooth — harder, and the brightest chord in the '
        + 'game.' },
    engShopComp: { label: 'Shop Comping', category: 'Keys', lanes: ['chords'],
      bank: { chordType: 'triangle', chordAttack: 0.02, chordDur: 1.75 },
      note: 'Triangle chords with room to ring — the retail-jazz comping under the shop '
        + 'themes.' },

    engShopOrgan: { label: 'Shop Organ', category: 'Organ', lanes: ['organChords'],
      bank: {
        organBright: true, organPercussion: true, organAttack: 0.004, organDur: 1.02,
        organEcho: false, organPercussionDur: 0.52, organPercussionGain: 0.9,
      },
      note: 'Bright drawbars, key-click percussion, short and dry. The shop theme’s '
        + 'organ, and the most worked-on sound in the game.' },
    engLayawayOrgan: { label: 'Layaway Organ', category: 'Organ', lanes: ['organChords'],
      bank: {
        organBright: true, organPercussion: true, organAttack: 0.002, organDur: 0.58,
        organEcho: false, organPercussionDur: 0.34, organPercussionGain: 0.82,
      },
      note: 'The same registration cut much shorter — chops rather than chords.' },
    engHeldOrgan: { label: 'Held Organ', category: 'Organ', lanes: ['organChords'],
      bank: { organAttack: 0.045, organDur: 7.4, organEcho: true },
      note: 'Soft drawbars held across two bars, with the echo on. The organ as a bed '
        + 'rather than a rhythm part.' },

    engTitleTwinkle: { label: 'Title Twinkle', category: 'Bells', lanes: ['twinkle'],
      bank: { twinkleAttack: 0.06, twinkleDur: 7 },
      note: 'Long, soft and slow to arrive. The title theme’s dissolving high end.' },
    engShopTwinkle: { label: 'Shop Twinkle', category: 'Bells', lanes: ['twinkle'],
      bank: { twinkleAttack: 0.003, twinkleDur: 0.62 },
      note: 'Short and immediate — a ping rather than a shimmer.' },
  }),

  // ---- the engine's own kit, named ----------------------------------------
  //
  // A drum lane with nothing set drew `ENGINE`, and on a kit that is nearly every
  // drum lane there is: the presets below this block are all song-specific tunings,
  // so a bank that had never been tuned matched none of them and the strip withheld
  // what it knew. These eight are the untuned sounds themselves — what scheduleStep
  // plays for a bare `kick: [...]` — written down so the strip can say so.
  //
  // Five of them set no bank keys because there are none to set: the snare, clap,
  // hats and rimshot bodies read nothing but their gain trims, so every bank ever
  // written plays exactly this and there is no version of it to choose. They are
  // `nameOnly` for that reason — the picker's own `Engine default` row is already
  // the way back to them, and an entry that wrote nothing would be a decision the
  // strip lights up as a change.
  //
  // The three that DO have knobs are ordinary choosable presets stating their
  // defaults, which is what lets a shop-kick bank be put back to the plain one.
  // `ENGINE_DEFAULTS` is what makes an unset key and a key set to its default read
  // as the same thing, in both directions.
  engKick: { label: 'Arcade Kick', category: 'Kick', lanes: ['kick'],
    bank: { kickTail: 0.2, kickKnock: 1 },
    note: 'The engine’s own 808, stacked the way an 808 stacks: a sine body dropping '
      + '165Hz to 48Hz in 50ms and ringing for a fifth of a second, a 2ms high-passed '
      + 'click on the front, and a 300Hz triangle knock that cuts through the bass.' },
  engSnare: { label: 'Arcade Snare', category: 'Snare', lanes: ['snare'], nameOnly: true,
    note: 'The engine’s own crack — a 2.6kHz noise band gone in 90ms with a triangle '
      + 'body falling 210Hz to 140Hz under it. Crisp rather than acoustic; there is '
      + 'no bank key that changes it.' },
  engClap: { label: 'Arcade Clap', category: 'Clap', lanes: ['clap'], nameOnly: true,
    note: 'Three high-passed noise bursts 12ms apart, the last one louder and four '
      + 'times as long — the stagger is what reads as hands rather than one hit.' },
  engHat: { label: 'Arcade Hat', category: 'Hats', lanes: ['hats'], nameOnly: true,
    note: 'Noise above 5.2kHz, gone in 50ms. The tick the whole kit keeps time to.' },
  engOpenHat: { label: 'Arcade Open Hat', category: 'Hats', lanes: ['ohats'], nameOnly: true,
    note: 'The closed hat’s noise with the cutoff dropped to 4.2kHz and the decay let '
      + 'out to 220ms — the same cymbal, unclamped.' },
  engRim: { label: 'Arcade Rim', category: 'Perc', lanes: ['rim'], nameOnly: true,
    note: 'A stick off the rim in three layers: a high-passed snap, three detuned '
      + 'square partials ringing through a narrow bandpass and sagging as they go, '
      + 'and a woody 430Hz tonk underneath. Out in 75ms, with the ring alone trailing '
      + 'into the echo.' },
  engTom: { label: 'Arcade Tom', category: 'Tom', lanes: ['tom'],
    bank: { tomDur: 0.28 },
    note: 'A triangle dropping most of an octave onto the lane’s own note — rounded '
      + 'like a membrane, with just enough edge to read above the bass.' },
  engCrash: { label: 'Arcade Crash', category: 'Crash', lanes: ['crash'],
    bank: { crashDur: 5, crashOpen: 9000, crashClose: 1100 },
    note: 'Looped noise under a lowpass that closes from 9kHz to 1.1kHz across five '
      + 'steps, which is what makes it decay like a cymbal instead of stopping like a '
      + 'burst of static. The low end is filtered out so it stays thin.' },

  ...quoted({
    engShopKick: { label: 'Shop Kick', category: 'Kick', lanes: ['kick'],
      bank: { kickTail: 0.15, kickKnock: 0.5 },
      note: 'The engine’s 808 with the sub ring shortened and the front knock up, so a '
        + 'busy bar does not become one long boom. The shop and Gary themes.' },
    engCounterKick: { label: 'Counter Kick', category: 'Kick', lanes: ['kick'],
      bank: { kickTail: 0.12, kickKnock: 0.38 },
      note: 'Shorter still and softer on the front — Dolores’ themes, where the kick '
        + 'keeps time rather than carrying weight.' },
    engMegamixKick: { label: 'Megamix Kick', category: 'Kick', lanes: ['kick'],
      bank: { kickTail: 0.13, kickKnock: 0.56 },
      note: 'The hardest front of the three, and a short tail: it has to cut through '
        + 'every other cabinet playing at once.' },
    engFinaleCrash: { label: 'Finale Crash', category: 'Crash', lanes: ['crash'],
      bank: { crashDur: 7 },
      note: 'The long crash from the finale — near two bars of decay, where the engine’s '
        + 'default is a short splash.' },
  }),
};

// Tone presets. `options` goes to the class constructor verbatim — Tone's own docs
// are the reference. `peak` is measured (tools/measure-voices.js); `dur` is a note
// length in 16th steps, and the envelope's release rings on past it.
const TONE = {
  // ---- Bass ---------------------------------------------------------------
  roundMono: { label: 'Round Mono 2', category: 'Bass', synth: 'MonoSynth', dur: 1.8,
    note: 'Saw through a lowpass that closes as the note decays — the classic synth bass.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.001, decay: 1.24, sustain: 0.29, release: 0.8 },
      filter: { type: 'lowpass', Q: 2.9, rolloff: -24 },
      filterEnvelope: { attack: 0.001, decay: 1.22, sustain: 0.13, release: 0.3, baseFrequency: 110, octaves: 3.9 },
    } },
  fmGrowl: { label: 'FM Growl', category: 'Bass', synth: 'FMSynth', dur: 1.8,
    note: 'Modulated sine with a hard edge on the attack. Cuts through a busy kit.',
    options: {
      harmonicity: 1.5, modulationIndex: 6,
      oscillator: { type: 'sine' }, modulation: { type: 'square' },
      envelope: { attack: 0.005, decay: 0.25, sustain: 0.5, release: 0.3 },
      modulationEnvelope: { attack: 0.002, decay: 0.18, sustain: 0.1, release: 0.2 },
    } },
  subSine: { label: 'Sub Sine', category: 'Bass', synth: 'Synth', dur: 2.2,
    note: 'Pure weight, no harmonics. Wants room underneath it and a lead up top.',
    options: { oscillator: { type: 'sine' }, envelope: { attack: 0.012, decay: 0.3, sustain: 0.8, release: 0.4 } } },
  acidSquelch: { label: 'Acid Squelch', category: 'Bass', synth: 'MonoSynth', dur: 1.2,
    note: 'High resonance and a fast filter sweep — the 303 move. Short notes only.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.002, decay: 0.1, sustain: 0.3, release: 0.1 },
      filter: { type: 'lowpass', Q: 8, rolloff: -24 },
      filterEnvelope: { attack: 0.002, decay: 0.09, sustain: 0.1, release: 0.15, baseFrequency: 180, octaves: 4 },
    } },
  rubberBass: { label: 'Rubber', category: 'Bass', synth: 'MonoSynth', dur: 1.6,
    note: 'Triangle through a soft filter with a slow-ish attack. Bounces rather than punches.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.02, decay: 0.49, sustain: 0.6, release: 0.3 },
      filter: { type: 'lowpass', Q: 3, rolloff: -12 },
      filterEnvelope: { attack: 0.023, decay: 0.2, sustain: 0.3, release: 0.3, baseFrequency: 100, octaves: 4.6, attackCurve: 'exponential' },
    },
    transpose: -12 },
  clangBass: { label: 'Clang', category: 'Bass', synth: 'FMSynth', dur: 1.4,
    note: 'Inharmonic FM — metal in the attack, pitch underneath. Reads as industrial.',
    options: {
      harmonicity: 3.01, modulationIndex: 12,
      oscillator: { type: 'square' }, modulation: { type: 'sawtooth' },
      envelope: { attack: 0.002, decay: 0.3, sustain: 0.2, release: 0.2 },
      modulationEnvelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
    } },
  detuneBass: { label: 'Wide Detune', category: 'Bass', synth: 'DuoSynth', dur: 1.8,
    note: 'Two monosynths a few cents apart. Big, and the dearest bass here.',
    options: {
      harmonicity: 1.008, vibratoAmount: 0.02, vibratoRate: 3,
      voice0: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.008, decay: 0.2, sustain: 0.7, release: 0.3 } },
      voice1: { oscillator: { type: 'square' }, envelope: { attack: 0.012, decay: 0.2, sustain: 0.7, release: 0.3 } },
    } },

  // ---- Lead ---------------------------------------------------------------
  monoBright: { label: 'Bright Mono', category: 'Lead', synth: 'MonoSynth', dur: 1.2,
    note: 'Square through an opening filter: the arcade lead with an envelope the raw oscillator cannot give it.',
    options: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.004, decay: 0.15, sustain: 0.6, release: 0.2 },
      filter: { type: 'lowpass', Q: 2, rolloff: -12 },
      filterEnvelope: { attack: 0.002, decay: 0.12, sustain: 0.4, release: 0.25, baseFrequency: 600, octaves: 3.2 },
    } },
  amHollow: { label: 'AM Hollow', category: 'Lead', synth: 'AMSynth', dur: 1.2,
    note: 'Ring-modulated and slightly out of tune with itself. Reads as a voice rather than a synth.',
    options: {
      harmonicity: 2,
      oscillator: { type: 'square' }, modulation: { type: 'sine' },
      envelope: { attack: 0.008, decay: 0.2, sustain: 0.6, release: 0.3 },
      modulationEnvelope: { attack: 0.05, decay: 0.2, sustain: 0.5, release: 0.3 },
    } },
  duoDetune: { label: 'Duo Detune', category: 'Lead', synth: 'DuoSynth', dur: 1.4,
    note: 'A detuned pair under a slow vibrato. The widest lead here, and two synths per note.',
    options: {
      harmonicity: 1.005, vibratoAmount: 0.12, vibratoRate: 5,
      voice0: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.02, decay: 0.2, sustain: 0.7, release: 0.4 } },
      voice1: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.03, decay: 0.2, sustain: 0.7, release: 0.4 } },
    } },
  glassLead: { label: 'Glass', category: 'Lead', synth: 'FMSynth', dur: 1.2,
    note: 'High harmonicity, short modulation — thin and clear, sits over a dense mix.',
    options: {
      harmonicity: 5, modulationIndex: 3,
      oscillator: { type: 'sine' }, modulation: { type: 'sine' },
      envelope: { attack: 0.004, decay: 0.2, sustain: 0.5, release: 0.3 },
      modulationEnvelope: { attack: 0.002, decay: 0.15, sustain: 0.1, release: 0.2 },
    } },
  reedLead: { label: 'Reed', category: 'Orch', synth: 'MonoSynth', dur: 1.6,
    note: 'Slow attack into a narrow filter — a clarinet-ish breath rather than a stab.',
    options: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.06, decay: 0.1, sustain: 0.8, release: 0.3 },
      filter: { type: 'lowpass', Q: 1, rolloff: -12 },
      filterEnvelope: { attack: 0.08, decay: 0.2, sustain: 0.6, release: 0.3, baseFrequency: 400, octaves: 2 },
    } },
  screamLead: { label: 'Scream', category: 'FX', synth: 'MonoSynth', dur: 1.2,
    note: 'Resonance up near self-oscillation. Unsubtle on purpose.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.003, decay: 0.1, sustain: 0.7, release: 0.2 },
      filter: { type: 'lowpass', Q: 12, rolloff: -24 },
      filterEnvelope: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.2, baseFrequency: 800, octaves: 3 },
    } },
  vibratoLead: { label: 'Vibrato Voice', category: 'Lead', synth: 'DuoSynth', dur: 1.8,
    note: 'Heavy, slow vibrato on a near-unison pair — the closest thing here to someone singing.',
    options: {
      harmonicity: 1.002, vibratoAmount: 0.35, vibratoRate: 5.5,
      voice0: { oscillator: { type: 'triangle' }, envelope: { attack: 0.05, decay: 0.2, sustain: 0.8, release: 0.4 } },
      voice1: { oscillator: { type: 'sine' }, envelope: { attack: 0.07, decay: 0.2, sustain: 0.8, release: 0.4 } },
    } },

  // ---- Keys ---------------------------------------------------------------
  fmKeys: { label: 'FM Keys', category: 'Keys', synth: 'FMSynth', dur: 2.6,
    note: 'Struck keys, percussive enough to keep a stab from smearing into the next bar.',
    options: {
      harmonicity: 2, modulationIndex: 4,
      oscillator: { type: 'sine' }, modulation: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.8, sustain: 0.1, release: 0.8 },
      modulationEnvelope: { attack: 0.004, decay: 0.4, sustain: 0.05, release: 0.5 },
    } },
  epiano: { label: 'Electric Piano', category: 'Keys', synth: 'FMSynth', dur: 3,
    note: 'The Rhodes shape: bell in the attack, sine underneath, long decay.',
    options: {
      harmonicity: 3, modulationIndex: 10,
      oscillator: { type: 'sine' }, modulation: { type: 'sine' },
      envelope: { attack: 0.002, decay: 1.2, sustain: 0.06, release: 1 },
      modulationEnvelope: { attack: 0.001, decay: 0.25, sustain: 0.01, release: 0.3 },
    } },
  clav: { label: 'Clavinet', category: 'Keys', synth: 'MonoSynth', dur: 1,
    note: 'Short, hard and bandpassed. Funk comping — it wants sixteenths.',
    options: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.12, sustain: 0.05, release: 0.1 },
      filter: { type: 'bandpass', Q: 3, rolloff: -12 },
      filterEnvelope: { attack: 0.001, decay: 0.08, sustain: 0.2, release: 0.1, baseFrequency: 700, octaves: 2.5 },
    } },
  toyPiano: { label: 'Toy Piano', category: 'Bells', synth: 'FMSynth', dur: 2,
    note: 'Inharmonic and small, with a knock in the attack. Cardboard Kingdom material.',
    options: {
      harmonicity: 4.02, modulationIndex: 6,
      oscillator: { type: 'triangle' }, modulation: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.5, sustain: 0.02, release: 0.5 },
      modulationEnvelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
    } },
  softKeys: { label: 'Soft Keys', category: 'Keys', synth: 'Synth', dur: 2.4,
    note: 'A triangle with a gentle envelope. Does its job and gets out of the way.',
    options: { oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.5, sustain: 0.3, release: 0.6 } } },

  // ---- Pad ----------------------------------------------------------------
  padTriangle: { label: 'Triangle Pad', category: 'Pad', synth: 'Synth', dur: 3.2,
    note: 'Slow in, slow out. The attack is heard as an arrival, so it wants held sections.',
    options: { oscillator: { type: 'triangle' }, envelope: { attack: 0.12, decay: 0.4, sustain: 0.7, release: 0.9 } } },
  warmPad: { label: 'Warm Pad', category: 'Pad', synth: 'MonoSynth', dur: 4,
    note: 'Saw behind a filter that opens slowly. The most ordinary pad there is, and it works.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.25, decay: 0.4, sustain: 0.8, release: 1.2 },
      filter: { type: 'lowpass', Q: 1, rolloff: -12 },
      filterEnvelope: { attack: 0.5, decay: 0.5, sustain: 0.7, release: 1, baseFrequency: 200, octaves: 2.6 },
    } },
  glassPad: { label: 'Glass Pad', category: 'Pad', synth: 'AMSynth', dur: 4,
    note: 'Ring modulation over a long swell — shimmering rather than warm.',
    options: {
      harmonicity: 3.01,
      oscillator: { type: 'sine' }, modulation: { type: 'sine' },
      envelope: { attack: 0.3, decay: 0.5, sustain: 0.7, release: 1.4 },
      modulationEnvelope: { attack: 0.6, decay: 0.4, sustain: 0.6, release: 1 },
    } },
  breathPad: { label: 'Breath', category: 'Orch', synth: 'DuoSynth', dur: 4.5,
    note: 'Two slightly detuned voices swelling together. Big and slow; expensive per note.',
    options: {
      harmonicity: 1.01, vibratoAmount: 0.08, vibratoRate: 2.5,
      voice0: { oscillator: { type: 'triangle' }, envelope: { attack: 0.35, decay: 0.4, sustain: 0.8, release: 1.4 } },
      voice1: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.5, decay: 0.4, sustain: 0.7, release: 1.6 } },
    } },

  // ---- Organ --------------------------------------------------------------
  amOrgan: { label: 'AM Organ', category: 'Organ', synth: 'AMSynth', dur: 2.6,
    note: 'Held and slightly beating, the way an organ with two drawbars out is.',
    options: {
      harmonicity: 1,
      oscillator: { type: 'square' }, modulation: { type: 'sine' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.9, release: 0.35 },
      modulationEnvelope: { attack: 0.1, decay: 0.1, sustain: 0.8, release: 0.3 },
    } },
  fullOrgan: { label: 'Full Organ', category: 'Organ', synth: 'FMSynth', dur: 3,
    note: 'All stops out: harmonically dense and completely flat in level, like a key held down.',
    options: {
      harmonicity: 2, modulationIndex: 2,
      oscillator: { type: 'square' }, modulation: { type: 'square' },
      envelope: { attack: 0.01, decay: 0.01, sustain: 1, release: 0.2 },
      modulationEnvelope: { attack: 0.01, decay: 0.01, sustain: 1, release: 0.2 },
    } },
  reedOrgan: { label: 'Reed Organ', category: 'Organ', synth: 'MonoSynth', dur: 3,
    note: 'A wheezier, narrower organ — harmonium rather than Hammond.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.04, decay: 0.05, sustain: 0.95, release: 0.3 },
      filter: { type: 'bandpass', Q: 2, rolloff: -12 },
      filterEnvelope: { attack: 0.05, decay: 0.1, sustain: 0.8, release: 0.3, baseFrequency: 500, octaves: 1.5 },
    } },

  // ---- Bells --------------------------------------------------------------
  fmBell: { label: 'FM Bell', category: 'Bells', synth: 'FMSynth', dur: 1.2,
    note: 'Struck and metallic, decaying rather than held — a bell at long lengths.',
    options: {
      harmonicity: 3, modulationIndex: 8,
      oscillator: { type: 'sine' }, modulation: { type: 'sine' },
      envelope: { attack: 0.003, decay: 0.6, sustain: 0.05, release: 0.6 },
      modulationEnvelope: { attack: 0.002, decay: 0.35, sustain: 0.02, release: 0.4 },
    } },
  celeste: { label: 'Celeste', category: 'Bells', synth: 'FMSynth', dur: 4,
    note: 'Small, high and pure, with a very long tail. Made for the twinkle lane.',
    options: {
      harmonicity: 7, modulationIndex: 4,
      oscillator: { type: 'sine' }, modulation: { type: 'sine' },
      envelope: { attack: 0.001, decay: 1.6, sustain: 0.01, release: 1.6 },
      modulationEnvelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.4 },
    } },
  marimba: { label: 'Marimba', category: 'Bells', synth: 'FMSynth', dur: 1.4,
    note: 'Wooden and short. The mallet is the whole sound; there is no sustain to speak of.',
    options: {
      harmonicity: 4, modulationIndex: 3,
      oscillator: { type: 'sine' }, modulation: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.35 },
      modulationEnvelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
    } },
  tubularBell: { label: 'Tubular Bell', category: 'Bells', synth: 'MetalSynth', dur: 4,
    note: 'Metal partials, long ring. Loud and inharmonic — one per bar is plenty.',
    options: {
      harmonicity: 5.1, modulationIndex: 20, resonance: 3000, octaves: 1.2,
      envelope: { attack: 0.001, decay: 1.8, release: 1.2 },
    } },
  musicBox: { label: 'Music Box', category: 'Bells', synth: 'FMSynth', dur: 3,
    note: 'Thin, high and slightly sour, with the click of the comb in the attack.',
    options: {
      harmonicity: 6.03, modulationIndex: 7,
      oscillator: { type: 'sine' }, modulation: { type: 'square' },
      envelope: { attack: 0.001, decay: 1, sustain: 0.01, release: 1 },
      modulationEnvelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.1 },
    } },

  // ---- Pluck --------------------------------------------------------------
  synthPluck: { label: 'Synth Pluck', category: 'Pluck', synth: 'MonoSynth', dur: 0.9,
    note: 'Filter slams shut immediately. Short, bright, and gone.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.18 },
      filter: { type: 'lowpass', Q: 4, rolloff: -24 },
      filterEnvelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1, baseFrequency: 300, octaves: 4 },
    } },
  harpPluck: { label: 'Harp', category: 'Pluck', synth: 'Synth', dur: 2,
    note: 'A triangle with no sustain at all — the string is let go the moment it is struck.',
    options: { oscillator: { type: 'triangle' }, envelope: { attack: 0.002, decay: 0.7, sustain: 0, release: 0.7 } } },
  koto: { label: 'Koto', category: 'Pluck', synth: 'FMSynth', dur: 1.6,
    note: 'Bright inharmonic pluck with a fast decay. Reads as a struck string.',
    options: {
      harmonicity: 2.51, modulationIndex: 9,
      oscillator: { type: 'triangle' }, modulation: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.5, sustain: 0.02, release: 0.4 },
      modulationEnvelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.15 },
    } },

  // ---- Orch ---------------------------------------------------------------
  brassStab: { label: 'Brass Stab', category: 'Orch', synth: 'MonoSynth', dur: 1.4,
    note: 'Filter rises through the note the way a horn section leans into one.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.03, decay: 0.15, sustain: 0.7, release: 0.2 },
      filter: { type: 'lowpass', Q: 2, rolloff: -12 },
      filterEnvelope: { attack: 0.12, decay: 0.2, sustain: 0.7, release: 0.2, baseFrequency: 300, octaves: 3 },
    } },
  synthStrings: { label: 'Synth Strings', category: 'Orch', synth: 'DuoSynth', dur: 4,
    note: 'The string-machine sound: two detuned saws, slow on, slow off.',
    options: {
      harmonicity: 1.006, vibratoAmount: 0.05, vibratoRate: 4,
      voice0: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.2, decay: 0.3, sustain: 0.85, release: 1 } },
      voice1: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.3, decay: 0.3, sustain: 0.85, release: 1.2 } },
    } },
  hornSwell: { label: 'Horn Swell', category: 'Orch', synth: 'FMSynth', dur: 3,
    note: 'Slow crescendo with the harmonics arriving after the fundamental, as a brass note does.',
    options: {
      harmonicity: 1, modulationIndex: 5,
      oscillator: { type: 'sawtooth' }, modulation: { type: 'sine' },
      envelope: { attack: 0.15, decay: 0.2, sustain: 0.8, release: 0.5 },
      modulationEnvelope: { attack: 0.4, decay: 0.3, sustain: 0.7, release: 0.4 },
    } },

  // ---- FX -----------------------------------------------------------------
  buzzSaw: { label: 'Buzz Saw', category: 'FX', synth: 'MonoSynth', dur: 1.2,
    note: 'Filter wide open, no envelope on it. Raw, and deliberately unmusical.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0.9, release: 0.1 },
      filter: { type: 'highpass', Q: 1, rolloff: -12 },
      filterEnvelope: { attack: 0.001, decay: 0.05, sustain: 1, release: 0.1, baseFrequency: 80, octaves: 0.2 },
    } },
  metalHit: { label: 'Metal Hit', category: 'FX', synth: 'MetalSynth', dur: 1,
    note: 'Clang with no pitch centre worth speaking of. Percussion that follows the notes.',
    options: {
      harmonicity: 12, modulationIndex: 32, resonance: 800, octaves: 1.5,
      envelope: { attack: 0.001, decay: 0.3, release: 0.2 },
    } },
  drumTone: { label: 'Drum Tone', category: 'FX', synth: 'MembraneSynth', dur: 1,
    note: 'A pitched drum — the note bends down into a thud. Tuned toms from a melody line.',
    options: {
      pitchDecay: 0.05, octaves: 4,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.4 },
    } },
  ringMod: { label: 'Ring Mod', category: 'FX', synth: 'AMSynth', dur: 1.4,
    note: 'Inharmonic ring modulation — the pitch is in there but so is a second one.',
    options: {
      harmonicity: 2.47,
      oscillator: { type: 'sawtooth' }, modulation: { type: 'square' },
      envelope: { attack: 0.004, decay: 0.2, sustain: 0.6, release: 0.3 },
      modulationEnvelope: { attack: 0.004, decay: 0.2, sustain: 0.6, release: 0.3 },
    } },
  hardFm: { label: 'Hard FM', category: 'FX', synth: 'FMSynth', dur: 1.2,
    note: 'Modulation index high enough to be noise with a pitch in it.',
    options: {
      harmonicity: 1.41, modulationIndex: 24,
      oscillator: { type: 'sawtooth' }, modulation: { type: 'sawtooth' },
      envelope: { attack: 0.002, decay: 0.25, sustain: 0.4, release: 0.2 },
      modulationEnvelope: { attack: 0.002, decay: 0.2, sustain: 0.3, release: 0.2 },
    } },


  // ---- Tone drums, by kind ------------------------------------------------
  // MembraneSynth (a pitch drop into a body) and MetalSynth (inharmonic partials) are
  // the two deterministic percussion classes — no noise, so they read as electronic
  // rather than acoustic, which is exactly what an 808 is. `taps` gives the clap
  // shape without noise: the same strike heard several times, each quieter.
  kickDeep: { label: 'Deep Kick', category: 'Kick', synth: 'MembraneSynth', dur: 3,
    note: 'A long, slow pitch drop into a sub that outlasts the bar. One per phrase, '
      + 'or it turns the low end to mud.',
    options: { pitchDecay: 0.12, octaves: 8, oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 1.1, sustain: 0, release: 1 } } },
  kickPunch: { label: 'Punch Kick', category: 'Kick', synth: 'MembraneSynth', dur: 1.2,
    note: 'Triangle body and a fast drop — more middle than an 808, so it survives '
      + 'a mix with a busy bass under it.',
    options: { pitchDecay: 0.025, octaves: 5, oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.28, sustain: 0, release: 0.25 } } },
  kickDirty: { label: 'Dirty Kick', category: 'Kick', synth: 'MembraneSynth', dur: 1.2,
    note: 'A square body makes the drop buzz on the way down. Distorted without a '
      + 'distortion on it.',
    options: { pitchDecay: 0.05, octaves: 6, oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.3 } } },
  kickThud: { label: 'Thud', category: 'Kick', synth: 'MembraneSynth', dur: 1,
    note: 'Barely any pitch movement — a dull knock rather than a boom. Sits under '
      + 'a mix instead of leading it.',
    options: { pitchDecay: 0.01, octaves: 1.5, oscillator: { type: 'sine' },
      envelope: { attack: 0.002, decay: 0.2, sustain: 0, release: 0.18 } } },

  snareFm: { label: 'FM Snare', category: 'Snare', synth: 'FMSynth', dur: 1,
    note: 'High modulation index and a fast decay: enough inharmonic clatter to read '
      + 'as a snare without a grain of noise in it.',
    options: { harmonicity: 3.7, modulationIndex: 28,
      oscillator: { type: 'square' }, modulation: { type: 'sawtooth' },
      envelope: { attack: 0.001, decay: 0.14, sustain: 0, release: 0.12 },
      modulationEnvelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.06 } } },
  snareTrash: { label: 'Trash Snare', category: 'Snare', synth: 'MetalSynth', dur: 1.4,
    note: 'Dense, ringing and slightly too long. Industrial — it wants a slow tempo '
      + 'and a lot of space.',
    options: { harmonicity: 6.4, modulationIndex: 40, resonance: 1200, octaves: 2,
      envelope: { attack: 0.001, decay: 0.3, release: 0.2 } } },


  hatTick: { label: 'Metal Tick', category: 'Hats', synth: 'MetalSynth', dur: 0.5,
    note: 'The shortest thing in the library — a metallic tick with no ring at all.',
    options: { harmonicity: 14, modulationIndex: 36, resonance: 6000, octaves: 1,
      envelope: { attack: 0.001, decay: 0.02, release: 0.01 } } },
  hatSizzle: { label: 'Sizzle Hat', category: 'Hats', synth: 'MetalSynth', dur: 1.5,
    note: 'Higher resonance and a longer tail: a hat left slightly open, buzzing '
      + 'rather than ringing.',
    options: { harmonicity: 10, modulationIndex: 44, resonance: 7000, octaves: 1.8,
      envelope: { attack: 0.001, decay: 0.22, release: 0.16 } } },

  // `homeLane` is the lane tools/measure-voices.js measures a preset ON. It matters
  // only on the kit, where the LANE supplies the note: the Perc category covers
  // both the claves and the drums, and measuring a taiko at the rim lane's 420 Hz
  // levels it against a pitch nobody strikes it at. Everything without one is measured
  // where its category says — see HOME_LANES in the tool.
  conga: { label: 'Conga', category: 'Perc', homeLane: 'tom', synth: 'MembraneSynth', dur: 1.2,
    note: 'A tuned hand drum: enough pitch left in it to play a line rather than '
      + 'keep time.',
    options: { pitchDecay: 0.06, octaves: 1.4, oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.25 } } },
  taiko: { label: 'KW Blip', category: 'Perc', homeLane: 'tom', synth: 'MembraneSynth', dur: 2.4,
    note: 'Like a kraftwerk percussion blip',
    options: {
      pitchDecay: 0.037,
      octaves: 6.3,
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.001, decay: 0.16, sustain: 0, release: 0.3 },
    } },
  clave: { label: 'Clave', category: 'Perc', synth: 'FMSynth', dur: 0.6,
    note: 'A hard, high, completely dry click with a pitch to it. Cuts through '
      + 'anything at almost no level.',
    options: { harmonicity: 3.02, modulationIndex: 8,
      oscillator: { type: 'sine' }, modulation: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.04 },
      modulationEnvelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.02 } } },
  agogo: { label: 'Agogo', category: 'Perc', synth: 'MetalSynth', dur: 1.4,
    note: 'A struck bell with two clear partials and a medium ring — a cowbell with '
      + 'better manners.',
    options: { harmonicity: 4.2, modulationIndex: 12, resonance: 3200, octaves: 0.9,
      envelope: { attack: 0.001, decay: 0.24, release: 0.18 } } },
  triangleDing: { label: 'Triangle', category: 'Perc', homeLane: 'tom', synth: 'MetalSynth', dur: 6,
    note: 'Very high, very thin, and rings for bars. One on a downbeat is plenty.',
    options: { harmonicity: 16, modulationIndex: 18, resonance: 9000, octaves: 0.6,
      envelope: { attack: 0.001, decay: 2.6, release: 2 } } },
  // ---- Drum sources --------------------------------------------------------
  // Struck at the lane's own note (VOICE_LANES), because a drum lane holds booleans.
  // All oscillator-based: see the note by VOICE_CATEGORIES for why none of these
  // hiss. They go on a melodic lane perfectly well, and a tuned kick following a
  // bass line is a real sound rather than a mistake.
  kick808: { label: '808 Kick', category: 'Kick', synth: 'MembraneSynth', dur: 2,
    note: 'Sine with a deep pitch drop into a long sub. The 808, which is what the '
      + 'engine’s own kick is modelled on.',
    options: {
      pitchDecay: 0.05, octaves: 6,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.5 },
    } },
  kickTight: { label: 'Tight Kick', category: 'Kick', synth: 'MembraneSynth', dur: 1,
    note: 'The same shape with the tail cut short — for a busy bar where a long '
      + 'boom would smear into the next hit.',
    options: {
      pitchDecay: 0.02, octaves: 4,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.16, sustain: 0, release: 0.16 },
    } },
  kickClick: { label: 'Click Kick', category: 'Kick', synth: 'MembraneSynth', dur: 1,
    note: 'A square body makes the attack a knock rather than a thump. Reads on a '
      + 'phone speaker where a sub does not.',
    options: {
      pitchDecay: 0.03, octaves: 5,
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.3 },
    } },
  tom: { label: 'Tom', category: 'Tom', homeLane: 'tom', synth: 'MembraneSynth', dur: 1.6,
    note: 'A shallower pitch drop leaves the note audible — a drum you can write a '
      + 'melody on.',
    options: {
      pitchDecay: 0.1, octaves: 2,
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.4 },
    } },
  metalSnare: { label: 'Metal Snare', category: 'Snare', synth: 'MetalSynth', dur: 1,
    note: 'Inharmonic partials in place of a wire snare. Electronic, not acoustic.',
    options: {
      harmonicity: 8, modulationIndex: 22, resonance: 1600, octaves: 1.4,
      envelope: { attack: 0.001, decay: 0.16, release: 0.1 },
    } },
  metalHatClosed: { label: 'Closed Metal Hat', category: 'Hats', synth: 'MetalSynth', dur: 0.5,
    note: 'Short and bright. Six oscillators per hit, so it is not the cheap option '
      + 'at sixteenths.',
    options: {
      harmonicity: 12, modulationIndex: 32, resonance: 4000, octaves: 1.5,
      envelope: { attack: 0.001, decay: 0.05, release: 0.02 },
    } },
  metalHatOpen: { label: 'Open Metal Hat', category: 'Hats', synth: 'MetalSynth', dur: 2,
    note: 'The same struck metal left to ring.',
    options: {
      harmonicity: 12, modulationIndex: 32, resonance: 4000, octaves: 1.5,
      envelope: { attack: 0.001, decay: 0.5, release: 0.4 },
    } },
  // The fourth pair, and the only one that is really six oscillators rather than
  // filtered air: harmonicity 5.1 is the inharmonic ratio the 808 built its hat from,
  // and it is why this reads as a machine's cymbal where the noise pairs read as a
  // stick on metal. Both halves carry identical partials — only the envelope differs,
  // which is what a pedal does to a real hat.
  hat808: { label: '= 808 Hat', category: 'Hats', homeLane: 'hats', synth: 'MetalSynth', dur: 0.5,
    note: 'The drum-machine closed hat: six detuned squares through a high resonance, '
      + 'gone in forty milliseconds. Metallic in a way no filtered noise gets to.',
    options: {
      harmonicity: 5.1, modulationIndex: 32, resonance: 7200, octaves: 1.2,
      envelope: { attack: 0.001, decay: 0.04, release: 0.02 },
    } },
  hat808Open: { label: '= 808 Open Hat', category: 'Hats', homeLane: 'ohats', synth: 'MetalSynth', dur: 2,
    note: 'The same six partials left to ring for half a second. The open hat that '
      + 'answers = 808 Hat — use them as a pair or neither.',
    options: {
      harmonicity: 5.1, modulationIndex: 32, resonance: 7200, octaves: 1.2,
      envelope: { attack: 0.001, decay: 0.44, release: 0.32 },
    } },

  metalCrash: { label: 'Metal Crash', category: 'Crash', homeLane: 'crash', synth: 'MetalSynth', dur: 6,
    note: 'Long, dense and loud. One per section, not one per bar.',
    options: {
      harmonicity: 5.1, modulationIndex: 40, resonance: 3000, octaves: 2,
      envelope: { attack: 0.001, decay: 2.4, release: 1.6 },
    } },
  cowbell: { label: 'Cowbell', category: 'Perc', synth: 'MetalSynth', dur: 0.8,
    note: 'Two fixed partials and a fast decay. It is the 808 cowbell, and it is '
      + 'never subtle.',
    options: {
      harmonicity: 3.5, modulationIndex: 16, resonance: 2200, octaves: 0.6,
      envelope: { attack: 0.001, decay: 0.12, release: 0.08 },
    } },
  woodBlock: { label: 'Wood Block', category: 'Perc', synth: 'FMSynth', dur: 0.6,
    note: 'A short knock with almost no tail. Good for rim, and for a tick that '
      + 'keeps time without taking up room.',
    options: {
      harmonicity: 4.5, modulationIndex: 14,
      oscillator: { type: 'sine' }, modulation: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.06 },
      modulationEnvelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.03 },
    } },
  zap: { label: 'Zap', category: 'FX', synth: 'MembraneSynth', dur: 0.6,
    note: 'A pitch drop so fast it is heard as a click with a direction. Laser, or '
      + 'a very electronic rim.',
    options: {
      pitchDecay: 0.008, octaves: 8,
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.08 },
    } },
  // ---- From Tonejs/Presets ------------------------------------------------
  // The official Tone.js sound-design collection (github.com/Tonejs/Presets,
  // archived 2020). Its files are plain JSON in exactly the shape `options` takes,
  // so these are the authors' values verbatim — only `volume` is dropped, because a
  // level here is measured by tools/measure-voices.js rather than authored, and the
  // two would fight over the same thing. `origin` records where each came from.
  //
  // They reach for oscillator types the hand-written presets above do not:
  // `fatsawtooth` and `fatsine4` (detuned stacks), `pwm` and `pulse` (moving duty
  // cycle), `partials` (explicit harmonic series), `fmsquare5`/`amsine2` (modulated
  // waveforms). That is most of what they add over what was already here.
  //
  // The four NoiseSynth presets in that repo are deliberately NOT here: Tone's noise
  // randomises its buffer read-offset on every trigger (Noise.js:98), so two hits in
  // one render differ, let alone two renders. Our own noise presets use the engine's
  // seeded buffer instead — see the NOISE table.
  tpBah: { label: 'Bah', category: 'Lead', synth: 'MonoSynth', dur: 1.4,
    note: "A bandpassed saw with a vowel in it — the filter sits where a voice’s formant would. Tone.js’s own preset.",
    origin: "Tonejs/Presets MonoSynth/Bah",
    options: {"oscillator":{"type":"sawtooth"},"filter":{"Q":2,"type":"bandpass","rolloff":-24},"envelope":{"attack":0.01,"decay":0.1,"sustain":0.2,"release":0.6},"filterEnvelope":{"attack":0.02,"decay":0.4,"sustain":1,"release":0.7,"releaseCurve":"linear","baseFrequency":20,"octaves":5}} },
  tpBassGuitar: { label: 'Bass Guitar', category: 'Bass', synth: 'MonoSynth', dur: 1.8,
    note: "An FM square through a lowpass, voiced to sit where a plucked electric bass sits.",
    origin: "Tonejs/Presets MonoSynth/BassGuitar",
    options: {"oscillator":{"type":"fmsquare5","modulationType":"triangle","modulationIndex":2,"harmonicity":0.501},"filter":{"Q":1,"type":"lowpass","rolloff":-24},"envelope":{"attack":0.01,"decay":0.1,"sustain":0.4,"release":2},"filterEnvelope":{"attack":0.01,"decay":0.1,"sustain":0.8,"release":1.5,"baseFrequency":50,"octaves":4.4}} },
  tpBassy: { label: 'Bassy', category: 'Bass', synth: 'MonoSynth', dur: 1.8,
    note: "Built from explicit partials rather than a waveform name, with a resonant lowpass over it. Fat and slightly hollow.",
    origin: "Tonejs/Presets MonoSynth/Bassy",
    options: {"portamento":0.08,"oscillator":{"partials":[2,1,3,2,0.4]},"filter":{"Q":4,"type":"lowpass","rolloff":-48},"envelope":{"attack":0.04,"decay":0.06,"sustain":0.4,"release":1},"filterEnvelope":{"attack":0.01,"decay":0.1,"sustain":0.6,"release":1.5,"baseFrequency":50,"octaves":3.4}} },
  tpBrassCircuit: { label: 'Brass Circuit', category: 'Orch', synth: 'MonoSynth', dur: 1.6,
    note: "A slow filter swell over a saw — the horn-section lean, done with an envelope.",
    origin: "Tonejs/Presets MonoSynth/BrassCircuit",
    options: {"portamento":0.01,"oscillator":{"type":"sawtooth"},"filter":{"Q":2,"type":"lowpass","rolloff":-24},"envelope":{"attack":0.1,"decay":0.1,"sustain":0.6,"release":0.5},"filterEnvelope":{"attack":0.05,"decay":0.8,"sustain":0.4,"release":1.5,"baseFrequency":2000,"octaves":1.5}} },
  tpCoolGuy: { label: 'Cool Guy', category: 'Lead', synth: 'MonoSynth', dur: 1.4,
    note: "Pulse-width modulation: the waveform’s duty cycle moves under the note, which reads as chorus without one.",
    origin: "Tonejs/Presets MonoSynth/CoolGuy",
    options: {"oscillator":{"type":"pwm","modulationFrequency":1},"filter":{"Q":6,"rolloff":-24},"envelope":{"attack":0.025,"decay":0.3,"sustain":0.9,"release":2},"filterEnvelope":{"attack":0.245,"decay":0.131,"sustain":0.5,"release":2,"baseFrequency":20,"octaves":7.2}} },
  tpPianoetta: { label: 'Pianoetta', category: 'Keys', synth: 'MonoSynth', dur: 2.2,
    note: "A square through a gentle lowpass with a piano-ish decay. Toy upright rather than grand.",
    origin: "Tonejs/Presets MonoSynth/Pianoetta",
    options: {"oscillator":{"type":"square"},"filter":{"Q":2,"type":"lowpass","rolloff":-12},"envelope":{"attack":0.005,"decay":3,"sustain":0,"release":0.45},"filterEnvelope":{"attack":0.001,"decay":0.32,"sustain":0.9,"release":3,"baseFrequency":700,"octaves":2.3}} },
  tpPizz: { label: 'Pizz', category: 'Pluck', synth: 'MonoSynth', dur: 0.8,
    note: "Highpassed and cut off immediately — pizzicato strings, all attack and no body.",
    origin: "Tonejs/Presets MonoSynth/Pizz",
    options: {"oscillator":{"type":"sawtooth"},"filter":{"Q":3,"type":"highpass","rolloff":-12},"envelope":{"attack":0.01,"decay":0.3,"sustain":0,"release":0.9},"filterEnvelope":{"attack":0.01,"decay":0.1,"sustain":0,"release":0.1,"baseFrequency":800,"octaves":-1.2}} },
  tpAlienChorus: { label: 'Alien Chorus', category: 'Orch', synth: 'Synth', dur: 4,
    note: "Ten detuned sines spread across sixty cents. Enormous, and the dearest preset in the library by some way.",
    origin: "Tonejs/Presets Synth/AlienChorus",
    options: {"oscillator":{"type":"fatsine4","spread":60,"count":10},"envelope":{"attack":0.4,"decay":0.01,"sustain":1,"attackCurve":"exponential","releaseCurve":"exponential","release":0.4}} },
  tpDelicateWind: { label: 'Delicate Wind Part', category: 'Orch', synth: 'Synth', dur: 5,
    note: "Two full seconds of attack. Not a note so much as a slow arrival — it needs a held section to be heard at all.",
    origin: "Tonejs/Presets Synth/DelicateWindPart",
    options: {"portamento":0,"oscillator":{"type":"square4"},"envelope":{"attack":2,"decay":1,"sustain":0.2,"release":2}} },
  tpDropPulse: { label: 'Drop Pulse', category: 'Pluck', synth: 'Synth', dur: 0.9,
    note: "A narrow pulse wave with a fast decay. Thin, hard and very retro.",
    origin: "Tonejs/Presets Synth/DropPulse",
    options: {"oscillator":{"type":"pulse","width":0.8},"envelope":{"attack":0.01,"decay":0.05,"sustain":0.2,"releaseCurve":"exponential","release":0.4}} },
  tpLectric: { label: 'Lectric', category: 'Lead', synth: 'Synth', dur: 1.4,
    note: "Portamento of 0.2 means every note slides into the next. A lead that will not sit still.",
    origin: "Tonejs/Presets Synth/Lectric",
    options: {"portamento":0.2,"oscillator":{"type":"sawtooth"},"envelope":{"attack":0.03,"decay":0.1,"sustain":0.2,"release":0.02}} },
  tpMarimba: { label: 'Marimba', category: 'Bells', synth: 'Synth', dur: 2,
    note: "Odd partials only, struck and left to ring. Woodier than the FM marimba beside it.",
    origin: "Tonejs/Presets Synth/Marimba",
    options: {"oscillator":{"partials":[1,0,2,0,3]},"envelope":{"attack":0.001,"decay":1.2,"sustain":0,"release":1.2}} },
  tpSteelpan: { label: 'Steelpan', category: 'Bells', synth: 'Synth', dur: 2.4,
    note: "A custom partial set, detuned three ways. Metallic and warm at once.",
    origin: "Tonejs/Presets Synth/Steelpan",
    options: {"oscillator":{"type":"fatcustom","partials":[0.2,1,0,0.5,0.1],"spread":40,"count":3},"envelope":{"attack":0.001,"decay":1.6,"sustain":0,"release":1.6}} },
  tpSuperSaw: { label: 'Super Saw', category: 'Lead', synth: 'Synth', dur: 1.4,
    note: "Three sawtooths thirty cents apart — the trance lead, and the widest single sound here.",
    origin: "Tonejs/Presets Synth/SuperSaw",
    options: {"oscillator":{"type":"fatsawtooth","count":3,"spread":30},"envelope":{"attack":0.01,"decay":0.1,"sustain":0.5,"release":0.4,"attackCurve":"exponential"}} },
  tpTreeTrunk: { label: 'Tree Trunk', category: 'Pluck', synth: 'Synth', dur: 1,
    note: "A short sine knock with a little sustain behind it. Hollow and wooden.",
    origin: "Tonejs/Presets Synth/TreeTrunk",
    options: {"oscillator":{"type":"sine"},"envelope":{"attack":0.001,"decay":0.1,"sustain":0.1,"release":1.2}} },
  tpElectricCello: { label: 'Electric Cello', category: 'Orch', synth: 'FMSynth', dur: 3,
    note: "High modulation index over a triangle: bowed rather than struck, with a bite on the attack.",
    origin: "Tonejs/Presets FMSynth/ElectricCello",
    options: {"harmonicity":3.01,"modulationIndex":14,"oscillator":{"type":"triangle"},"envelope":{"attack":0.2,"decay":0.3,"sustain":0.1,"release":1.2},"modulation":{"type":"square"},"modulationEnvelope":{"attack":0.01,"decay":0.5,"sustain":0.2,"release":0.1}} },
  tpKalimba: { label: 'Kalimba', category: 'Bells', synth: 'FMSynth', dur: 2.4,
    note: "Harmonicity 8 and almost no modulation — a thumb piano’s clean, high, quick ring.",
    origin: "Tonejs/Presets FMSynth/Kalimba",
    options: {"harmonicity":8,"modulationIndex":2,"oscillator":{"type":"sine"},"envelope":{"attack":0.001,"decay":2,"sustain":0.1,"release":2},"modulation":{"type":"square"},"modulationEnvelope":{"attack":0.002,"decay":0.2,"sustain":0,"release":0.2}} },
  tpThinSaws: { label: 'Thin Saws', category: 'Lead', synth: 'FMSynth', dur: 1.4,
    note: "Harmonicity below 1, so the modulator sits under the carrier. Reedy and narrow.",
    origin: "Tonejs/Presets FMSynth/ThinSaws",
    options: {"harmonicity":0.5,"modulationIndex":1.2,"oscillator":{"type":"fmsawtooth","modulationType":"sine","modulationIndex":20,"harmonicity":3},"envelope":{"attack":0.05,"decay":0.3,"sustain":0.1,"release":1.2},"modulation":{"volume":0,"type":"triangle"},"modulationEnvelope":{"attack":0.35,"decay":0.1,"sustain":1,"release":0.01}} },
  tpHarmonics: { label: 'Harmonics', category: 'Organ', synth: 'AMSynth', dur: 2.6,
    note: "Ring modulation at almost exactly four times the carrier — the partials line up, so it reads as an organ stop.",
    origin: "Tonejs/Presets AMSynth/Harmonics",
    options: {"harmonicity":3.999,"oscillator":{"type":"square"},"envelope":{"attack":0.03,"decay":0.3,"sustain":0.7,"release":0.8},"modulation":{"volume":12,"type":"square6"},"modulationEnvelope":{"attack":2,"decay":3,"sustain":0.8,"release":0.1}} },
  tpTiny: { label: 'Tiny', category: 'Keys', synth: 'AMSynth', dur: 1.6,
    note: "A tiny detuned AM sine. Small, clean and easy to place under anything.",
    origin: "Tonejs/Presets AMSynth/Tiny",
    options: {"harmonicity":2,"oscillator":{"type":"amsine2","modulationType":"sine","harmonicity":1.01},"envelope":{"attack":0.006,"decay":4,"sustain":0.04,"release":1.2},"modulation":{"volume":13,"type":"amsine2","modulationType":"sine","harmonicity":12},"modulationEnvelope":{"attack":0.006,"decay":0.2,"sustain":0.2,"release":0.4}} },
  roundMono2: { label: 'Plain Square', category: 'Lead', synth: 'Synth', dur: 7.7,
    note: 'Simple Square Tone',
    options: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.39, sustain: 0.06, release: 0.14 },
    } },
  toneSquare: { label: 'Square Tone', category: 'Lead', synth: 'GameSynth', dur: 1,
    note: 'A direct single-oscillator square-wave replacement for the engine voice.',
    options: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0, sustain: 1, release: 0.01, attackCurve: 'exponential' },
    },
    fixedLength: 0.144,
    waveform: 'square',
    attack: 0.001,
    release: 0.089,
    trim: 0.8,
    vibrato: { depth: 0, rate: 10.9 },
    mono: false,
    portamento: 0 },
  toneSawtooth: { label: 'Sawtooth Tone', category: 'Lead', synth: 'GameSynth', dur: 1.2,
    note: 'A direct single-oscillator sawtooth replacement for the engine voice.',
    fixedLength: 0.063, waveform: 'sawtooth', attack: 0.01, release: 0.015, trim: 0 },
  toneTriangle: { label: 'Triangle Tone', category: 'Lead', synth: 'GameSynth', dur: 1.2,
    note: 'A direct single-oscillator triangle replacement for the engine voice.',
    fixedLength: 0.063, waveform: 'triangle', attack: 0.01, release: 0.015, trim: 0 },
  toneSine: { label: 'Sine Tone', category: 'Keys', synth: 'GameSynth', dur: 1.2,
    note: 'A direct single-oscillator sine replacement for the engine voice.',
    fixedLength: 0.063, waveform: 'sine', attack: 0.01, release: 0.015, trim: 0 },
  squareTone2: { label: 'Square Tone', category: 'Lead', synth: 'GameSynth', dur: 1,
    note: 'A direct single-oscillator square-wave replacement for the engine voice.',
    options: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0, sustain: 1, release: 0.01, attackCurve: 'exponential' },
    },
    fixedLength: 0.132,
    waveform: 'square',
    attack: 0.001,
    release: 0.089,
    trim: 0,
    vibrato: { depth: 0, rate: 10.9 },
    mono: false,
    portamento: 0,
    starter: false,
    transpose: 0 },
  fmGrowl2: { label: 'FM Growl', category: 'Bass', synth: 'FMSynth', dur: 1.8,
    note: 'Modulated sine with a hard edge on the attack. Cuts through a busy kit.',
    options: {
      harmonicity: 1.5,
      modulationIndex: 6,
      oscillator: { type: 'sine' },
      modulation: { type: 'square' },
      envelope: { attack: 0.005, decay: 0.25, sustain: 0.5, release: 0.3 },
      modulationEnvelope: { attack: 0.002, decay: 1.02, sustain: 0.1, release: 0.2 },
    },
    starter: false,
    mono: false },
  softKeys2: { label: 'Soft Keys', category: 'Keys', synth: 'Synth', dur: 2.4,
    note: 'A triangle with a gentle envelope. Does its job and gets out of the way.',
    options: {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.5, sustain: 0.3, release: 0.6 },
    },
    starter: false },
  kalimba: { label: 'Kalimba', category: 'Bells', synth: 'FMSynth', dur: 2.4,
    note: 'Harmonicity 8 and almost no modulation — a thumb piano’s clean, high, quick ring.',
    origin: 'Tonejs/Presets FMSynth/Kalimba',
    options: {
      harmonicity: 8,
      modulationIndex: 2,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 2, sustain: 0.1, release: 2 },
      modulation: { type: 'square' },
      modulationEnvelope: { attack: 0.002, decay: 0.2, sustain: 0, release: 0.2 },
    } },
  softKeys3: { label: 'Soft Keys', category: 'Keys', synth: 'Synth', dur: 2.4,
    note: 'A triangle with a gentle envelope. Does its job and gets out of the way.',
    options: {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.5, sustain: 0.3, release: 0.6 },
    },
    starter: false },

  // ---- AdditiveSynth ---------------------------------------------------------
  //
  // A stack of sine partials at drawbar ratios, each with its own level, under one
  // envelope — see `_playAdditive` in src/engine/voices.js. `bars` is nine levels in
  // CONSOLE order (16′, 5⅓′, 8′, 4′, 2⅔′, 2′, 1⅗′, 1⅓′, 1′), so a registration reads the
  // way it would be written on the instrument; a bar at zero builds no oscillator at all.
  //
  // The first five recreate the engine's own `organChords` voice, which is five sines and
  // nothing else (audio.js ~2439). Its two registrations are all a song can ask for today
  // — `organBright` is a boolean — so the whole point of these is that the levels between
  // them are now reachable. Transcribed from the engine's numbers with one deliberate
  // difference: the percussion decay is in SECONDS here where the engine's is in steps.
  // A real percussion register is a circuit constant, fast or slow whatever the player
  // holds; the engine only made it tempo-relative because everything in `play` was. The
  // values below are the engine's own at the tempo each voice is actually heard at.
  //
  // The last two are here to show the thing is not only an organ: `stretch` spreads the
  // partials off the harmonic series and `damp` makes the top of the stack decay first,
  // which between them are the difference between a Hammond and a struck bar.
  addDrawbar: { label: 'Drawbar Organ', category: 'Organ', homeLane: 'organChords',
    synth: 'AdditiveSynth', dur: 7.2,
    note: 'Sine partials at 8′, 4′, 2⅔′, 2′ and 1⅓′ — the organ lane’s own voice, with '
      + 'the drawbars finally out where you can reach them.',
    additive: { bars: [0, 0, 1, 0.62, 0.32, 0.2, 0, 0.1, 0], attack: 0.035, decay: 7.2 } },
  addDrawbarBright: { label: 'Drawbar Organ, Bright', category: 'Organ', homeLane: 'organChords',
    synth: 'AdditiveSynth', dur: 7.2,
    note: 'The upper drawbars pulled further out. Cuts through where the soft '
      + 'registration sits under everything.',
    additive: { bars: [0, 0, 1, 0.78, 0.48, 0.3, 0, 0.16, 0], attack: 0.035, decay: 7.2 } },
  addDrawbarPerc: { label: 'Drawbar + Percussion', category: 'Organ', homeLane: 'organChords',
    synth: 'AdditiveSynth', dur: 7.2,
    note: 'Bright registration with a third-harmonic pip on the key attack, kept dry so '
      + 'repeated off-beat stabs stay crisp.',
    additive: { bars: [0, 0, 1, 0.78, 0.48, 0.3, 0, 0.16, 0], attack: 0.035, decay: 7.2,
      perc: { ratio: 3, gain: 0.72, attack: 0.002, decay: 0.078 } } },
  addShopOrgan: { label: 'Shop Organ', category: 'Organ', homeLane: 'organChords',
    synth: 'AdditiveSynth', dur: 1.02,
    note: 'The shop theme’s own: bright, percussive, short and dry — comping rather than '
      + 'holding, so it sits under the lead instead of over it.',
    additive: { bars: [0, 0, 1, 0.78, 0.48, 0.3, 0, 0.16, 0], attack: 0.004, decay: 1.02,
      echo: false, perc: { ratio: 3, gain: 0.9, attack: 0.002, decay: 0.072 } } },
  addSwoop: { label: 'Organ Swoop', category: 'Organ', homeLane: 'organChords',
    synth: 'AdditiveSynth', dur: 3.2,
    note: 'Every partial bends up a fourth into the note together, so the registration '
      + 'arrives rather than slides apart. The dance-mix transition.',
    additive: { bars: [0, 0, 1, 0.5, 0.22, 0, 0, 0, 0], attack: 0.012, decay: 3.2,
      pitch: { from: 0.7492, to: 1, sweep: 3.2 } } },
  addBell: { label: 'Struck Bell', category: 'Bells', homeLane: 'twinkle',
    synth: 'AdditiveSynth', dur: 8,
    note: 'The same stack pulled off the harmonic series and damped from the top down. '
      + 'Inharmonic and struck is a bell; either one alone is a siren or an organ.',
    additive: { bars: [0.3, 0.15, 1, 0.7, 0.45, 0.3, 0.2, 0.15, 0.1],
      attack: 0.001, decay: 8, release: 0.35, stretch: 0.06, damp: 1.4 } },
  addGlassPad: { label: 'Glass Pad', category: 'Pad', homeLane: 'chords',
    synth: 'AdditiveSynth', dur: 8,
    note: 'Barely stretched and lightly damped, arriving slowly — the top of the stack '
      + 'thins out as it holds, which is what stops an additive pad sounding like an organ.',
    additive: { bars: [0.2, 0, 1, 0.55, 0.2, 0.28, 0, 0.12, 0.08],
      attack: 0.35, decay: 8.3, sustain: 0.6, release: 1.2, stretch: 0.012, damp: 0.4 } },
  shopOrgan2: { label: 'Shop Organ 2', category: 'Organ', homeLane: 'organChords', synth: 'AdditiveSynth', dur: 6.92,
    note: 'The shop theme’s own: bright, percussive, short and dry — comping rather than '
      + 'holding, so it sits under the lead instead of over it.',
    additive: {
      bars: [0, 0, 1, 0.78, 0.48, 0.53, 0.01, 0.46, 0.23],
      attack: 0.004,
      decay: 6.92,
      echo: false,
      perc: { ratio: 7, gain: 2, attack: 0.002, decay: 0.072 },
      type: 'sine',
      stretch: 0,
    },
    starter: false,
    trim: 3,
    fixedLength: 1.103 },
  squareOrgan: { label: 'Square Organ', category: 'Organ', synth: 'GameSynth', dur: 1,
    note: 'A direct single-oscillator square-wave replacement for the engine voice.',
    options: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0, sustain: 1, release: 0.01, attackCurve: 'exponential' },
    },
    fixedLength: 0.463,
    waveform: 'square',
    attack: 0.011,
    release: 0.089,
    trim: 0.8,
    vibrato: { depth: 0, rate: 5 },
    mono: false,
    portamento: 0,
    starter: false,
    filter: { type: 'lowpass', slope: -12, freq: 10840, to: 1420, Q: 3.4, sweep: 0.12 } },

  // ---- requested 80s bass auditions --------------------------------------
  bass80sMono: { label: '=BASS 80s Mono', category: 'Bass', synth: 'MonoSynth', dur: 1.8,
    note: 'A brassy 80s mono bass: sawtooth into a fast low-pass sweep with a short '
      + 'pluck at the front and a solid held bottom.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.004, decay: 0.38, sustain: 0.42, release: 0.22 },
      filter: { type: 'lowpass', Q: 2.4, rolloff: -24 },
      filterEnvelope: { attack: 0.002, decay: 0.28, sustain: 0.18, release: 0.2, baseFrequency: 110, octaves: 3.8 },
    } },
  bass80sFM: { label: '=BASS 80s FM', category: 'Bass', synth: 'FMSynth', dur: 1.8,
    note: 'A bright digital 80s bass: a sine body with a square modulator, tuned for '
      + 'the glassy attack of an FM workstation under a pop groove.',
    options: {
      harmonicity: 1.5,
      modulationIndex: 7,
      oscillator: { type: 'sine' },
      modulation: { type: 'square' },
      envelope: { attack: 0.003, decay: 0.34, sustain: 0.36, release: 0.24 },
      modulationEnvelope: { attack: 0.002, decay: 0.18, sustain: 0.22, release: 0.16 },
    } },
  bass80sDuo: { label: '=BASS 80s Duo', category: 'Bass', synth: 'DuoSynth', dur: 2,
    note: 'A wide 80s chorus-style bass: detuned saw and square voices with a gentle '
      + 'vibrato that gives a mono line a larger stereo-era silhouette.',
    options: {
      harmonicity: 1.006,
      vibratoAmount: 0.025,
      vibratoRate: 3.2,
      voice0: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.006, decay: 0.28, sustain: 0.55, release: 0.3 } },
      voice1: { oscillator: { type: 'square' }, envelope: { attack: 0.01, decay: 0.32, sustain: 0.42, release: 0.34 } },
    } },
  bass80sSynth: { label: '=BASS 80s Synth', category: 'Bass', synth: 'Synth', dur: 1.6,
    note: 'A clean 80s synth bass with a pulse-like square tone, quick decay and a '
      + 'small release that keeps repeated eighth notes from becoming clicks.',
    options: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.003, decay: 0.32, sustain: 0.28, release: 0.2 },
    } },

  // ---- requested TB-303-style acid bass auditions -----------------------
  // These use MonoSynth's saw/square, resonant low-pass, filter envelope and
  // portamento controls as style starting points rather than hardware copies.
  bass303Squelch: { label: '=303 Squelch', category: 'Bass', synth: 'MonoSynth', dur: 1.1,
    note: 'A tight TB-303-style acid bass with a sharp resonant squelch, fast filter snap and a little glide.',
    options: {
      portamento: 0.045,
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.002, decay: 0.12, sustain: 0.25, release: 0.1 },
      filter: { type: 'lowpass', Q: 14, rolloff: -24 },
      filterEnvelope: { attack: 0.001, decay: 0.1, sustain: 0.08, release: 0.12, baseFrequency: 110, octaves: 4.5 },
    } },
  bass303Rubber: { label: '=303 Rubber', category: 'Bass', synth: 'MonoSynth', dur: 1.35,
    note: 'A rubbery TB-303-style square bass with a rounded pluck, resonant vowel and smooth acid glide.',
    options: {
      portamento: 0.065,
      oscillator: { type: 'square' },
      envelope: { attack: 0.003, decay: 0.2, sustain: 0.32, release: 0.14 },
      filter: { type: 'lowpass', Q: 10, rolloff: -24 },
      filterEnvelope: { attack: 0.002, decay: 0.16, sustain: 0.12, release: 0.16, baseFrequency: 145, octaves: 3.6 },
    } },
  bass303DeepGlide: { label: '=303 Deep Glide', category: 'Bass', synth: 'MonoSynth', dur: 1.7,
    note: 'A darker TB-303-style saw bass with a long low glide, restrained resonance and a weighty held tail.',
    options: {
      portamento: 0.12,
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.004, decay: 0.32, sustain: 0.42, release: 0.22 },
      filter: { type: 'lowpass', Q: 8, rolloff: -24 },
      filterEnvelope: { attack: 0.003, decay: 0.28, sustain: 0.16, release: 0.22, baseFrequency: 85, octaves: 3.2 },
    } },
  bass303Bite: { label: '=303 Bite', category: 'Bass', synth: 'MonoSynth', dur: 0.95,
    note: 'A percussive TB-303-style square bite with a hard filter accent for clipped, driving acid phrases.',
    options: {
      portamento: 0.025,
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0.18, release: 0.08 },
      filter: { type: 'lowpass', Q: 16, rolloff: -24 },
      filterEnvelope: { attack: 0.001, decay: 0.07, sustain: 0.05, release: 0.1, baseFrequency: 125, octaves: 5 },
    } },
  bass303Pulse: { label: '=303 Pulse', category: 'Bass', synth: 'MonoSynth', dur: 1.25,
    note: 'A lively TB-303-style saw pulse with medium resonance, a bright accent and just enough sustain for riffs.',
    options: {
      portamento: 0.04,
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.002, decay: 0.17, sustain: 0.3, release: 0.12 },
      filter: { type: 'lowpass', Q: 12, rolloff: -48 },
      filterEnvelope: { attack: 0.001, decay: 0.14, sustain: 0.1, release: 0.14, baseFrequency: 100, octaves: 4.2 },
    } },

  // ---- MRDR-3 ------------------------------------------------------------
  //
  // Up to three oscillator layers, each a complete voice — see `_playLayer` in
  // src/engine/voices.js. These are the hand-written melodic voices of scheduleStep
  // TRANSCRIBED, not approximated: the layer ratios, levels, lengths and attacks are the
  // engine's own numbers, so a strip can A/B `layerBass80s` against `80s Bass` and hear
  // whether the recreation holds. The engine voices stay; these are the editable copies.
  //
  // No MELODIC_TRIM in any of them — the rack path never applies it and `voiceGain`
  // levels by measurement, so only the RATIOS between layers carry meaning.
  layerBass80s: { label: 'Layer 80s Bass', category: 'Bass', synth: 'MRDR-3', dur: 1.8,
    note: 'The engine’s 80s bass as editable layers: square body, sine sub an octave '
      + 'down, and a short triangle octave above that carries it on phone speakers.',
    layer: {
      osc1: { type: 'square', ratio: 1, gain: 0.78, attack: 0.004, decay: 1.8 },
      osc2: { type: 'sine', ratio: 0.5, gain: 0.34, len: 1.08, attack: 0.006, decay: 1.944 },
      osc3: { type: 'triangle', ratio: 2, gain: 0.34, len: 0.62, attack: 0.003, decay: 1.116 },
    } },
  layerFilteredSaw: { label: 'Layer Filtered Saw', category: 'Bass', synth: 'MRDR-3', dur: 1.8,
    note: 'The engine’s filtered saw as editable layers: the resonant lowpass shutting '
      + 'across the note is finally a knob, and the sine sub underneath is a layer.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 1, attack: 0.006, decay: 1.8,
        // The old freq/to/sweep pair (1150 → 320 across the note), restated in the
        // filter-envelope language: the cutoff sits at the floor and the envelope
        // opens it log2(1150/320) octaves, decaying across the note — the identical
        // exponential trajectory, spelled the way every software synth spells it.
        filter: { type: 'lowpass', freq: 320, Q: 1.15,
          env: { octaves: 1.845, attack: 0.001, decay: 1.8, sustain: 0 } } },
      osc2: { type: 'sine', ratio: 0.5, gain: 0.22, len: 1.05, attack: 0.008, decay: 1.89 },
    } },
  layerLeadBright: { label: 'Layer Bright Lead', category: 'Lead', synth: 'MRDR-3', dur: 1.2,
    note: 'The bright-octave lead as layers: the lane’s square with a quiet octave sine '
      + 'on top, adding air without changing the character underneath.',
    layer: {
      osc1: { type: 'square', ratio: 1, gain: 1, attack: 0.01, decay: 1.2 },
      osc2: { type: 'sine', ratio: 2, gain: 0.16, len: 0.68, attack: 0.004, decay: 0.816 },
    } },
  layerTwinkle: { label: 'Layer Twinkle', category: 'Keys', synth: 'MRDR-3', dur: 6,
    note: 'The twinkle lane’s own voice: a sine and its octave, the octave fading first.',
    layer: {
      osc1: { type: 'sine', ratio: 1, gain: 1, attack: 0.035, decay: 6 },
      osc2: { type: 'sine', ratio: 2, gain: 0.28, len: 0.65, attack: 0.02, decay: 3.9 },
    } },

  // The songs' own voicings, from the quoted() block — the organ ones live on
  // AdditiveSynth already. The two that carried a written-in slapback (`bassRepeat`)
  // are their base timbre here: that ghost note was a stand-in from before the desk
  // had a delay, and the strip's delay insert is the tool for it now.
  layerTitleBass: { label: 'Layer Title Bass', category: 'Bass', synth: 'MRDR-3', dur: 7.4,
    note: 'The title theme’s nocturne bass: a sine so slow to arrive it is felt before '
      + 'it is heard, holding for most of two bars.',
    layer: { osc1: { type: 'sine', ratio: 1, gain: 1, attack: 0.18, decay: 7.4 } } },
  layerFinaleBass: { label: 'Layer Finale Bass', category: 'Bass', synth: 'MRDR-3', dur: 0.95,
    note: 'Short, hard and square — the house-arrangement bass, one note per step.',
    layer: { osc1: { type: 'square', ratio: 1, gain: 1, attack: 0.001, decay: 0.95 } } },
  layerFinaleBassGhost: { label: 'Layer Finale Bass, Long', category: 'Bass', synth: 'MRDR-3', dur: 3.2,
    note: 'The finale’s ghosted saw as its base timbre. The slapback it carried in the '
      + 'engine was a delay written into the notes — use the strip’s delay insert.',
    layer: { osc1: { type: 'sawtooth', ratio: 1, gain: 1, attack: 0.01, decay: 3.2 } } },
  layerWalkingBass: { label: 'Layer Walking Bass', category: 'Bass', synth: 'MRDR-3', dur: 1.85,
    note: 'The pawn-shop walking sine as its base timbre — its shuffle ghost was a '
      + 'written-in delay; the strip’s delay insert says it better.',
    layer: { osc1: { type: 'sine', ratio: 1, gain: 1, attack: 0.01, decay: 1.85 } } },
  layerMegamixBass: { label: 'Layer Megamix Bass', category: 'Bass', synth: 'MRDR-3', dur: 1.8,
    note: 'The filtered saw dialled darker and rounder, sub brought up — what holds the '
      + 'megamix together under everything else.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 1, attack: 0.006, decay: 1.8,
        filter: { type: 'lowpass', freq: 260, Q: 0.9,
          env: { octaves: 1.657, attack: 0.001, decay: 1.8, sustain: 0 } } },
      osc2: { type: 'sine', ratio: 0.5, gain: 0.21, len: 1.05, attack: 0.008, decay: 1.89 },
    } },
  layerShopBass: { label: 'Layer Shop Bass', category: 'Bass', synth: 'MRDR-3', dur: 1.08,
    note: 'The shop theme’s filtered saw: brighter and shorter than the megamix’s, so '
      + 'it bounces rather than sustains.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 1, attack: 0.003, decay: 1.08,
        filter: { type: 'lowpass', freq: 310, Q: 1.1,
          env: { octaves: 1.827, attack: 0.001, decay: 1.08, sustain: 0 } } },
      osc2: { type: 'sine', ratio: 0.5, gain: 0.22, len: 1.05, attack: 0.008, decay: 1.134 },
    } },
  layerLoungeBass: { label: 'Layer Lounge Bass', category: 'Bass', synth: 'MRDR-3', dur: 1.25,
    note: 'Soft triangle, no filter, one note per beat — Dolores’ counter music.',
    layer: { osc1: { type: 'triangle', ratio: 1, gain: 1, attack: 0.01, decay: 1.25 } } },
  layerBright80sBass: { label: 'Layer 80s Bass, Shop', category: 'Bass', synth: 'MRDR-3', dur: 0.94,
    note: 'The 80s stack with a triangle body and a very short note — the bright-organ '
      + 'shop auditions.',
    layer: {
      osc1: { type: 'triangle', ratio: 1, gain: 0.78, attack: 0.003, decay: 0.94 },
      osc2: { type: 'sine', ratio: 0.5, gain: 0.34, len: 1.08, attack: 0.006, decay: 1.0152 },
      osc3: { type: 'triangle', ratio: 2, gain: 0.34, len: 0.62, attack: 0.003, decay: 0.5828 },
    } },
  layerTitleLead: { label: 'Layer Title Lead', category: 'Lead', synth: 'MRDR-3', dur: 5.5,
    note: 'A sine that swells in over a sixth of a second and holds — the title theme, '
      + 'remembered from an empty arcade.',
    layer: { osc1: { type: 'sine', ratio: 1, gain: 1, attack: 0.16, decay: 5.5 } } },
  layerFinaleLead: { label: 'Layer Finale Lead', category: 'Lead', synth: 'MRDR-3', dur: 1.7,
    note: 'Sawtooth, fast attack, overlapping notes — the finale’s hook.',
    layer: { osc1: { type: 'sawtooth', ratio: 1, gain: 1, attack: 0.006, decay: 1.7 } } },
  layerMegamixLead: { label: 'Layer Megamix Lead', category: 'Lead', synth: 'MRDR-3', dur: 1.25,
    note: 'Triangle with a little length on it — soft enough to sit inside a mix '
      + 'carrying every other cabinet at once.',
    layer: { osc1: { type: 'triangle', ratio: 1, gain: 1, attack: 0.008, decay: 1.25 } } },
  layerShopLead: { label: 'Layer Shop Lead', category: 'Lead', synth: 'MRDR-3', dur: 1.55,
    note: 'Triangle with the octave-sine brightener on top: the shop’s lead, which '
      + 'needs air to read over the organ.',
    layer: {
      osc1: { type: 'triangle', ratio: 1, gain: 1, attack: 0.012, decay: 1.55 },
      osc2: { type: 'sine', ratio: 2, gain: 0.16, len: 0.68, attack: 0.004, decay: 1.054 },
    } },
  layerCounterLead: { label: 'Layer Counter Lead', category: 'Lead', synth: 'MRDR-3', dur: 0.82,
    note: 'Short triangle stabs — Dolores’ side of the shop auditions.',
    layer: { osc1: { type: 'triangle', ratio: 1, gain: 1, attack: 0.006, decay: 0.82 } } },
  layerTitleHarm: { label: 'Layer Title Harmony', category: 'Lead', synth: 'MRDR-3', dur: 6.2,
    note: 'The slowest voice in the game: a triangle taking more than a quarter of a '
      + 'second to arrive, under the title lead.',
    layer: { osc1: { type: 'triangle', ratio: 1, gain: 1, attack: 0.28, decay: 6.2 } } },
  layerSineHarm: { label: 'Layer Sine Harmony', category: 'Lead', synth: 'MRDR-3', dur: 1.35,
    note: 'A plain sine third — width for a lead without harmonics to fight it.',
    layer: { osc1: { type: 'sine', ratio: 1, gain: 1, attack: 0.01, decay: 1.35 } } },
  layerTitleChords: { label: 'Layer Title Chords', category: 'Pad', synth: 'MRDR-3', dur: 7.6,
    note: 'Held triangle chords with a third of a second of attack — a pad in all but '
      + 'name, and the title theme’s bed.',
    layer: { osc1: { type: 'triangle', ratio: 1, gain: 1, attack: 0.35, decay: 7.6 } } },
  layerFinaleStab: { label: 'Layer Finale Stab', category: 'Keys', synth: 'MRDR-3', dur: 0.32,
    note: 'A square chord lasting a third of a step — the house stab.',
    layer: { osc1: { type: 'square', ratio: 1, gain: 1, attack: 0.005, decay: 0.32 } } },
  layerFinaleSawStab: { label: 'Layer Finale Saw Stab', category: 'Keys', synth: 'MRDR-3', dur: 0.28,
    note: 'The same shape with a sawtooth — harder, and the brightest chord in the game.',
    layer: { osc1: { type: 'sawtooth', ratio: 1, gain: 1, attack: 0.01, decay: 0.28 } } },
  layerShopComp: { label: 'Layer Shop Comping', category: 'Keys', synth: 'MRDR-3', dur: 1.75,
    note: 'Triangle chords with room to ring — retail-jazz comping under the shop themes.',
    layer: { osc1: { type: 'triangle', ratio: 1, gain: 1, attack: 0.02, decay: 1.75 } } },

  // The demonstrator: the two controls no engine recreation exercises — unison and the
  // routable LFO — in one preset, so both have a sound in the library showing them.
  layerDreamPad: { label: 'Layer Dream Pad', category: 'Pad', synth: 'MRDR-3', dur: 8,
    note: 'Three detuned saws through a lowpass the LFO breathes open and shut, with a '
      + 'sine sub holding the floor — nothing in the engine could say this.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.8, attack: 0.4, decay: 8.6, sustain: 0.7,
        release: 0.9, unison: 3, spread: 14,
        filter: { type: 'lowpass', freq: 900, Q: 1.2 } },
      osc2: { type: 'sine', ratio: 0.5, gain: 0.35, attack: 0.3, decay: 8.5, sustain: 0.8,
        release: 0.7 },
      lfo: { type: 'sine', rate: 0.5, depth: 0.35, target: 'filter', delay: 0.6 },
    } },
  // The global stage's demonstrator, as `layerDreamPad` is unison and the filter LFO's.
  // Three layers with no filters of their own arriving at ONE cutoff and ONE envelope is
  // the thing this synth could not say before: a stack whose character is the filter over
  // all of it rather than three sounds that happen to be playing together. Take the
  // global filter out and it is three saws; put it back and it is an instrument.
  //
  // The blip on osc1 is the pitch envelope in its ordinary use — two semitones falling
  // into the note over 40 ms, which is a brass player's attack and reads as articulation
  // rather than as a pitch effect.
  layerBrassStack: { label: 'Layer Brass Stack', category: 'Orch', synth: 'MRDR-3', dur: 2.4,
    note: 'Three saws with no filters of their own, arriving at one shared lowpass that '
      + 'opens across the note — the stack reads as one horn section rather than three '
      + 'oscillators. A two-semitone blip gives it its attack.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.46, attack: 0.02, decay: 0.5, sustain: 0.8,
        release: 0.12, unison: 2, spread: 11,
        pitch: { semitones: 2, decay: 0.04 } },
      osc2: { type: 'sawtooth', ratio: 2, gain: 0.2, len: 0.9, attack: 0.03, decay: 0.5,
        sustain: 0.7, release: 0.1 },
      osc3: { type: 'square', ratio: 0.5, gain: 0.19, attack: 0.02, decay: 0.6, sustain: 0.75,
        release: 0.12 },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 420, Q: 1.1, track: 0.35,
        env: { octaves: 3.4, attack: 0.03, decay: 0.45, sustain: 0.3, release: 0.12 } },
      vca: { attack: 0.02, decay: 0.4, sustain: 0.78, release: 0.14 },
    },
    tone: { freq: 9500 } },

  // ---- BEST: what this synth can do that nothing else here can -----------------
  //
  // Ten patches built to show the stack off rather than to fill a lane. Most of them
  // turn on one idea: a layer filter with KEY FOLLOW at zero does not track the note, so
  // it is a FORMANT — a fixed resonance the pitch moves under. Three layers is three
  // formants, which is a vowel, which is a voice. That is how a singer works and it is
  // what no single-filter synth in this catalogue can say.
  //
  // The vowels below are the published formant tables: /a/ 800·1150·2900 Hz,
  // /u/ 320·800·2250, /o/ 500·1000·2450. Sawtooth sources, because a vowel needs
  // harmonics for the resonances to find.

  bestChoirAah: { label: 'BEST Choir Aah', category: 'Orch', synth: 'MRDR-3', dur: 8,
    note: 'Three static bandpass formants on the /a/ vowel — 800, 1150 and 2900 Hz — with '
      + 'the pitch moving underneath them. Delayed vibrato and a slow swell do the rest: '
      + 'this is how a voice works, not an impression of one.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.9, attack: 0.35, decay: 1.2, sustain: 0.85,
        release: 0.9, attackCurve: 'lin', unison: 3, spread: 9, stereo: 0.8,
        filter: { type: 'bandpass', slope: -12, freq: 800, Q: 7, track: 0 } },
      osc2: { type: 'sawtooth', ratio: 1, gain: 0.55, detune: 6, attack: 0.42, decay: 1.4,
        sustain: 0.8, release: 0.9, attackCurve: 'lin', unison: 2, spread: 13, stereo: 0.7,
        filter: { type: 'bandpass', slope: -12, freq: 1150, Q: 9, track: 0 } },
      osc3: { type: 'sawtooth', ratio: 1, gain: 0.3, detune: -7, attack: 0.5, decay: 1.6,
        sustain: 0.7, release: 1, attackCurve: 'lin', unison: 2, spread: 16, stereo: 0.9,
        filter: { type: 'bandpass', slope: -12, freq: 2900, Q: 11, track: 0 } },
      lfo: { type: 'sine', rate: 0.7, depth: 0.14, target: 'level', delay: 0.9 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 3800, Q: 0.7, track: 0.3,
        env: { octaves: 1.3, attack: 0.6, decay: 1.6, sustain: 0.55, release: 0.9 } },
      vca: { attack: 0.45, decay: 1.6, sustain: 0.88, release: 1.2, attackCurve: 'lin' },
    },
    drive: 0.08, shape: 'soft',
    humanize: { entry: 0.022 },
    vibrato: { depth: 0.18, rate: 5.2, delay: 0.6, spread: 0.75 } },

  bestChoirOoh: { label: 'BEST Choir Ooh', category: 'Orch', synth: 'MRDR-3', dur: 8,
    note: 'The /u/ vowel — 320, 800 and 2250 Hz — rounder and darker than the aah, with a '
      + 'band of noise sitting where the breath is. Two singers, slightly out of tune with '
      + 'each other, which is what makes a section sound like more than one person.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 1, attack: 0.5, decay: 1.5, sustain: 0.88,
        release: 1.1, attackCurve: 'lin', unison: 3, spread: 11, stereo: 0.55,
        filter: { type: 'bandpass', slope: -12, freq: 320, Q: 6, track: 0 } },
      osc2: { type: 'sawtooth', ratio: 1, gain: 0.5, detune: -9, attack: 0.55, decay: 1.6,
        sustain: 0.82, release: 1.1, attackCurve: 'lin', unison: 2, spread: 15, stereo: 0.8,
        filter: { type: 'bandpass', slope: -12, freq: 800, Q: 8, track: 0 } },
      // The breath. A noise layer is a full member of the stack here — its band follows
      // the note, so it sits with the voice rather than hissing across the top of it.
      osc3: { type: 'noise', ratio: 4, gain: 0.1, attack: 0.7, decay: 2, sustain: 0.5,
        release: 1.2, attackCurve: 'lin',
        filter: { type: 'bandpass', slope: -12, freq: 2250, Q: 4, track: 0 } },
      lfo: { type: 'sine', rate: 0.55, depth: 0.12, target: 'level', delay: 1.1 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 2600, Q: 0.8, track: 0.3,
        env: { octaves: 1.1, attack: 0.8, decay: 2, sustain: 0.5, release: 1 } },
      vca: { attack: 0.6, decay: 2, sustain: 0.9, release: 1.4, attackCurve: 'lin' },
    },
    drive: 0.06, shape: 'soft',
    humanize: { entry: 0.034 },
    vibrato: { depth: 0.14, rate: 4.8, delay: 0.8, spread: 0.85 } },

  bestVoiceBox70s: { label: 'BEST Voice Box 70s', category: 'Lead', synth: 'MRDR-3', dur: 2.2,
    note: 'The tube-in-the-mouth lead off a 1976 record. Two formants moving in OPPOSITE '
      + 'directions — one opening, one closing — is a mouth changing shape, and the LFO on '
      + 'top is it doing that over and over. Mono with a short glide, because a talk box is '
      + 'played one note at a time.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 1, attack: 0.008, decay: 0.5, sustain: 0.85,
        release: 0.12,
        filter: { type: 'bandpass', slope: -12, freq: 700, Q: 9, track: 0,
          env: { octaves: 1.7, attack: 0.04, decay: 0.55, sustain: 0.35, release: 0.2 } } },
      // Bipolar ENV AMOUNT earning its keep: this one CLOSES from above while the one
      // above opens. Two resonances crossing is the whole sound.
      osc2: { type: 'sawtooth', ratio: 1, gain: 0.75, detune: 5, attack: 0.012, decay: 0.6,
        sustain: 0.8, release: 0.12,
        filter: { type: 'bandpass', slope: -12, freq: 1900, Q: 13, track: 0,
          env: { octaves: -1.3, attack: 0.06, decay: 0.65, sustain: 0.4, release: 0.2 } } },
      // A narrow pulse rather than a square: the even harmonics a 22% duty brings back are
      // most of what makes a talk box read as a REED rather than as a filtered synth.
      osc3: { type: 'pulse', width: 0.22, ratio: 0.5, gain: 0.28, attack: 0.006, decay: 0.5,
        sustain: 0.7, release: 0.1,
        // Slow and shallow: a talk box breathes because the player's mouth never holds
        // still, and this is that, not an effect.
        pwm: { type: 'sine', rate: 0.9, depth: 0.35, delay: 0.1 } },
      lfo: { type: 'triangle', rate: 2.6, depth: 0.42, target: 'filter', delay: 0.12 },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 2400, Q: 1.6, track: 0.4,
        env: { octaves: 1.4, attack: 0.02, decay: 0.4, sustain: 0.45, release: 0.15 } },
      vca: { attack: 0.01, decay: 0.4, sustain: 0.85, release: 0.16 },
    },
    drive: 0.42, shape: 'soft', tone: { freq: 7200 },
    vibrato: { depth: 0.12, rate: 5.5, delay: 0.35 },
    mono: true, portamento: 0.055 },

  bestRobotVox: { label: 'BEST Robot Vox', category: 'FX', synth: 'MRDR-3', dur: 2,
    note: 'A vocoder that never met a singer: square carrier, an FM operator buzzing the '
      + 'formants, and the /o/ vowel held rigid over the top. The pitch envelope drops a '
      + 'semitone into every note, which is the machine deciding what it meant to say.',
    layer: {
      osc1: { type: 'square', ratio: 1, gain: 0.9, attack: 0.004, decay: 0.3, sustain: 0.9,
        release: 0.08,
        pitch: { semitones: -1, decay: 0.05 },
        filter: { type: 'bandpass', slope: -12, freq: 500, Q: 10, track: 0 },
        fm: { type: 'square', ratio: 2.01, index: 0.6, attack: 0.002, decay: 0.25 } },
      osc2: { type: 'sawtooth', ratio: 1, gain: 0.6, detune: 8, attack: 0.005, decay: 0.35,
        sustain: 0.85, release: 0.08,
        filter: { type: 'bandpass', slope: -12, freq: 1000, Q: 12, track: 0 } },
      osc3: { type: 'sawtooth', ratio: 1, gain: 0.35, detune: -6, attack: 0.006, decay: 0.4,
        sustain: 0.75, release: 0.08,
        filter: { type: 'bandpass', slope: -12, freq: 2450, Q: 14, track: 0 } },
      lfo: { type: 'square', rate: 7.5, depth: 0.3, target: 'level', delay: 0.05 },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 3000, Q: 1.2, track: 0.35,
        env: { octaves: 1.2, attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.1 } },
      vca: { attack: 0.004, decay: 0.3, sustain: 0.88, release: 0.1 },
    },
    drive: 0.5, shape: 'fold', tone: { freq: 6400 } },

  bestVowelPad: { label: 'BEST Vowel Pad', category: 'Pad', synth: 'MRDR-3', dur: 8,
    note: 'A pad that keeps talking. Three formants with slow, deep filter movement under '
      + 'one shared lowpass, so the vowel drifts between /o/ and /a/ across a held chord — '
      + 'unison on every layer, which is nine oscillators wide.',
    layer: {
      osc1: { type: 'pulse', width: 0.5, ratio: 1, gain: 0.8, attack: 1.1, decay: 2.5,
        sustain: 0.85, release: 1.8, attackCurve: 'lin', unison: 3, spread: 18, stereo: 0.75,
        pwm: { type: 'sine', rate: 0.21, depth: 0.6, delay: 0.8 },
        filter: { type: 'bandpass', slope: -12, freq: 520, Q: 5, track: 0,
          env: { octaves: 0.9, attack: 1.6, decay: 3, sustain: 0.6, release: 1.5 } } },
      osc2: { type: 'pulse', width: 0.43, ratio: 1, detune: 11, gain: 0.5, attack: 1.3,
        decay: 2.8, sustain: 0.8, release: 2, attackCurve: 'lin', unison: 3, spread: 24, stereo: 0.65,
        pwm: { type: 'sine', rate: 0.32, depth: 0.55, delay: 0.8 },
        filter: { type: 'bandpass', slope: -12, freq: 1080, Q: 7, track: 0,
          env: { octaves: -0.8, attack: 1.8, decay: 3.2, sustain: 0.5, release: 1.5 } } },
      osc3: { type: 'triangle', ratio: 0.5, gain: 0.45, detune: -5, attack: 1, decay: 3,
        sustain: 0.9, release: 2.2, attackCurve: 'lin', unison: 2, spread: 9 },
      lfo: { type: 'sine', rate: 0.22, depth: 0.5, target: 'filter', delay: 1.5 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 1900, Q: 1.1, track: 0.3,
        env: { octaves: 2.2, attack: 2, decay: 4, sustain: 0.55, release: 2 } },
      vca: { attack: 1.2, decay: 3, sustain: 0.9, release: 2.4, attackCurve: 'lin' },
    },
    drive: 0.1, shape: 'soft',
    humanize: { entry: 0.03 },
    vibrato: { depth: 0.08, rate: 3.4, delay: 1.8, spread: 0.5 } },

  bestMegaSawLead: { label: 'BEST Mega Saw Lead', category: 'Lead', synth: 'MRDR-3', dur: 1.6,
    note: 'Eleven oscillators. Two unison saws a fifth apart, a sub under them, all through '
      + 'one shared filter that opens across every note — the shared stage is the whole '
      + 'point, because eleven separate filters would be eleven sounds instead of one.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.85, attack: 0.006, decay: 0.5, sustain: 0.8,
        release: 0.18, unison: 5, spread: 26, stereo: 0.5 },
      osc2: { type: 'sawtooth', ratio: 1.4983, gain: 0.4, attack: 0.01, decay: 0.5,
        sustain: 0.7, release: 0.18, unison: 5, spread: 34, stereo: 0.65 },
      osc3: { type: 'pulse', width: 0.5, ratio: 0.5, gain: 0.42, attack: 0.004, decay: 0.6,
        sustain: 0.85, release: 0.16,
        // A square that drifts. Free width where a twelfth oscillator would have cost a
        // whole voice, and under eleven saws it reads as depth rather than as movement.
        pwm: { type: 'sine', rate: 0.42, depth: 0.5, delay: 0.1 } },
      lfo: { type: 'sine', rate: 5.4, depth: 0.12, target: 'filter', delay: 0.4 },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 380, Q: 2.2, track: 0.5,
        env: { octaves: 4.6, attack: 0.012, decay: 0.55, sustain: 0.42, release: 0.22 } },
      vca: { attack: 0.006, decay: 0.5, sustain: 0.85, release: 0.24 },
    },
    drive: 0.34, shape: 'soft', tone: { freq: 12000 },
    vibrato: { depth: 0.1, rate: 5.6, delay: 0.5 } },

  bestHeroLead: { label: 'BEST Hero Lead', category: 'Lead', synth: 'MRDR-3', dur: 2.4,
    note: 'The one that plays the theme over the credits. Mono with a real glide, and a '
      + 'two-semitone blip into every note — the pitch envelope and the portamento running '
      + 'at once, which they could not do until they stopped sharing a parameter.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.9, attack: 0.02, decay: 0.6, sustain: 0.85,
        release: 0.3, unison: 3, spread: 14,
        pitch: { semitones: 2, decay: 0.055 } },
      osc2: { type: 'triangle', ratio: 2, gain: 0.3, len: 0.85, attack: 0.03, decay: 0.5,
        sustain: 0.6, release: 0.25,
        fm: { type: 'sine', ratio: 3.01, index: 0.9, attack: 0.004, decay: 0.18 } },
      osc3: { type: 'sawtooth', ratio: 0.5, gain: 0.45, detune: -4, attack: 0.02, decay: 0.7,
        sustain: 0.9, release: 0.3 },
      lfo: { type: 'sine', rate: 0.35, depth: 0.25, target: 'filter', delay: 0.6 },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 620, Q: 1.9, track: 0.55,
        env: { octaves: 3.8, attack: 0.05, decay: 0.9, sustain: 0.5, release: 0.35 } },
      vca: { attack: 0.02, decay: 0.8, sustain: 0.9, release: 0.4, attackCurve: 'lin' },
    },
    drive: 0.26, shape: 'soft', tone: { freq: 11000 },
    vibrato: { depth: 0.16, rate: 5.1, delay: 0.45 },
    mono: true, portamento: 0.07 },

  bestScreamerLead: { label: 'BEST Screamer Lead', category: 'Lead', synth: 'MRDR-3', dur: 1.4,
    note: 'Cuts through anything. An FM operator at a deliberately inharmonic ratio puts a '
      + 'metallic edge on the saw, the fold shaper turns level into a different sound '
      + 'rather than a louder one, and the filter envelope snaps shut behind each note.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.95, attack: 0.003, decay: 0.35,
        sustain: 0.72, release: 0.14, unison: 4, spread: 20,
        fm: { type: 'square', ratio: 2.47, index: 1.4, attack: 0.001, decay: 0.12 } },
      osc2: { type: 'square', ratio: 1, gain: 0.4, detune: 12, attack: 0.004, decay: 0.3,
        sustain: 0.6, release: 0.12 },
      osc3: { type: 'sawtooth', ratio: 0.5, gain: 0.35, attack: 0.003, decay: 0.4,
        sustain: 0.8, release: 0.14 },
      lfo: { type: 'sine', rate: 6.2, depth: 0.18, target: 'filter', delay: 0.25 },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 900, Q: 3.4, track: 0.45,
        env: { octaves: 3.2, attack: 0.004, decay: 0.28, sustain: 0.3, release: 0.16 } },
      vca: { attack: 0.003, decay: 0.35, sustain: 0.78, release: 0.18 },
    },
    drive: 0.62, shape: 'fold', tone: { freq: 9000 },
    vibrato: { depth: 0.2, rate: 6.4, delay: 0.3 } },

  bestMonsterBass: { label: 'BEST Monster Bass', category: 'Bass', synth: 'MRDR-3', dur: 1.8,
    note: 'A sine sub holding the floor, a saw doing the work and a square an octave up for '
      + 'the teeth, all arriving at one filter that slams open and shut on every note. The '
      + 'growl is the shared envelope, not three envelopes that happen to agree.',
    layer: {
      osc1: { type: 'sine', ratio: 0.5, gain: 1, attack: 0.004, decay: 0.9, sustain: 0.95,
        release: 0.12 },
      osc2: { type: 'sawtooth', ratio: 1, gain: 0.8, attack: 0.004, decay: 0.7, sustain: 0.7,
        release: 0.12, unison: 2, spread: 12 },
      osc3: { type: 'square', ratio: 2, gain: 0.22, len: 0.55, attack: 0.003, decay: 0.25,
        sustain: 0.3, release: 0.08 },
      lfo: { type: 'sine', rate: 0.5, depth: 0.2, target: 'filter', delay: 0.2 },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 90, Q: 3.8, track: 0.4,
        env: { octaves: 4.2, attack: 0.008, decay: 0.42, sustain: 0.22, release: 0.14 } },
      vca: { attack: 0.004, decay: 0.9, sustain: 0.92, release: 0.16 },
    },
    drive: 0.4, shape: 'soft', tone: { freq: 5200 },
    mono: true, portamento: 0.035 },

  bestReeseBass: { label: 'BEST Reese Bass', category: 'Bass', synth: 'MRDR-3', dur: 2,
    note: 'Two saws detuned far enough to beat against each other — the 1988 Reese — with a '
      + 'clean sine sub underneath so the low end survives the interference. The LFO walks '
      + 'the shared filter, which is what turns a held note into a moving one.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.9, detune: 14, attack: 0.006, decay: 1,
        sustain: 0.9, release: 0.2, unison: 2, spread: 8 },
      osc2: { type: 'sawtooth', ratio: 1, gain: 0.9, detune: -14, attack: 0.006, decay: 1,
        sustain: 0.9, release: 0.2, unison: 2, spread: 8 },
      // Clean and undetuned: the beating belongs above it, and a sub that beats is a sub
      // that disappears on a phone.
      osc3: { type: 'sine', ratio: 0.5, gain: 0.75, attack: 0.005, decay: 1.2, sustain: 0.95,
        release: 0.18 },
      lfo: { type: 'triangle', rate: 0.9, depth: 0.55, target: 'filter', delay: 0.1 },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 160, Q: 4.5, track: 0.35,
        env: { octaves: 3, attack: 0.02, decay: 0.8, sustain: 0.35, release: 0.25 } },
      vca: { attack: 0.006, decay: 1.2, sustain: 0.94, release: 0.24 },
    },
    drive: 0.3, shape: 'soft', tone: { freq: 4800 },
    mono: true, portamento: 0.05 },

  // ---- BEST: the pulse-width family --------------------------------------------
  //
  // Ten more, all built on the one thing a table cannot do: a width that MOVES. Each
  // layer carries its own PWM rate, which is the whole point — three widths drifting at
  // 0.28, 0.37 and 0.19 Hz never line up, and that non-repeating interference is what a
  // string machine is. Give all three the same rate and the stack breathes in lockstep,
  // which sounds like one oscillator getting fatter rather than like a section.

  bestPwmStrings: { label: 'BEST PWM Strings', category: 'Orch', synth: 'MRDR-3', dur: 8,
    note: 'The string machine. Two pulses whose widths drift at 0.28 and 0.37 Hz — rates '
      + 'chosen not to line up — over a clean saw sub. The shimmer is the two widths '
      + 'passing through each other, which is why they must never share a rate.',
    layer: {
      osc1: { type: 'pulse', width: 0.5, ratio: 1, gain: 0.5, attack: 0.5, decay: 2,
        sustain: 0.85, release: 1.2, attackCurve: 'lin', unison: 2, spread: 9, stereo: 0.85,
        pwm: { type: 'sine', rate: 0.28, depth: 0.62, delay: 0 } },
      osc2: { type: 'pulse', width: 0.46, ratio: 1, detune: -7, gain: 0.42, attack: 0.6,
        decay: 2.2, sustain: 0.82, release: 1.3, attackCurve: 'lin', unison: 2, spread: 13, stereo: 0.7,
        pwm: { type: 'sine', rate: 0.37, depth: 0.58, delay: 0 } },
      osc3: { type: 'sawtooth', ratio: 0.5, gain: 0.2, attack: 0.45, decay: 2.4,
        sustain: 0.9, release: 1.2, attackCurve: 'lin' },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 2400, Q: 0.8, track: 0.3,
        env: { octaves: 1.4, attack: 0.8, decay: 2.4, sustain: 0.6, release: 1 } },
      vca: { attack: 0.55, decay: 2.4, sustain: 0.9, release: 1.5, attackCurve: 'lin' },
    },
    vibrato: { depth: 0.07, rate: 4.2, delay: 1.4 } },

  bestPwmBrass: { label: 'BEST PWM Brass', category: 'Orch', synth: 'MRDR-3', dur: 2.4,
    note: 'The Jupiter brass stab: a pulse leaning on a saw, the width moving fast enough '
      + 'to be heard inside a short note, and the shared filter opening three octaves as '
      + 'the section leans in.',
    layer: {
      osc1: { type: 'pulse', width: 0.42, ratio: 1, gain: 0.9, attack: 0.03, decay: 0.7,
        sustain: 0.8, release: 0.25,
        pwm: { type: 'sine', rate: 0.85, depth: 0.4, delay: 0.05 } },
      osc2: { type: 'sawtooth', ratio: 1, detune: 7, gain: 0.6, attack: 0.04, decay: 0.7,
        sustain: 0.75, release: 0.25, unison: 2, spread: 11 },
      osc3: { type: 'pulse', width: 0.5, ratio: 0.5, gain: 0.4, attack: 0.03, decay: 0.8,
        sustain: 0.85, release: 0.22,
        pwm: { type: 'sine', rate: 0.61, depth: 0.35, delay: 0.05 } },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 520, Q: 1.8, track: 0.5,
        env: { octaves: 3.2, attack: 0.07, decay: 0.75, sustain: 0.45, release: 0.3 } },
      vca: { attack: 0.025, decay: 0.8, sustain: 0.85, release: 0.32, attackCurve: 'lin' },
    },
    drive: 0.22, shape: 'soft', tone: { freq: 11000 },
    vibrato: { depth: 0.11, rate: 5, delay: 0.5 } },

  bestPwmPadWide: { label: 'BEST PWM Pad Wide', category: 'Pad', synth: 'MRDR-3', dur: 8,
    note: 'Three pulses at three rates, all of them slow and deep, through one filter the '
      + 'LFO also breathes. Nothing in it repeats inside a bar — the widest, least static '
      + 'thing this synth can make.',
    layer: {
      osc1: { type: 'pulse', width: 0.5, ratio: 1, gain: 0.46, attack: 1.4, decay: 3,
        sustain: 0.88, release: 2.2, attackCurve: 'lin', unison: 2, spread: 14, stereo: 0.9,
        pwm: { type: 'sine', rate: 0.19, depth: 0.7, delay: 0.4 } },
      osc2: { type: 'pulse', width: 0.44, ratio: 1, detune: 9, gain: 0.36, attack: 1.6,
        decay: 3.2, sustain: 0.85, release: 2.4, attackCurve: 'lin', unison: 2, spread: 22, stereo: 0.8,
        pwm: { type: 'triangle', rate: 0.27, depth: 0.66, delay: 0.6 } },
      osc3: { type: 'pulse', width: 0.55, ratio: 0.5, detune: -6, gain: 0.29, attack: 1.2,
        decay: 3.4, sustain: 0.9, release: 2.6, attackCurve: 'lin',
        pwm: { type: 'sine', rate: 0.13, depth: 0.6, delay: 0.8 } },
      lfo: { type: 'sine', rate: 0.16, depth: 0.4, target: 'filter', delay: 1.2 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 1600, Q: 1, track: 0.28,
        env: { octaves: 2.4, attack: 2.2, decay: 4, sustain: 0.6, release: 2.2 } },
      vca: { attack: 1.6, decay: 3.5, sustain: 0.92, release: 2.8, attackCurve: 'lin' },
    },
    vibrato: { depth: 0.06, rate: 3, delay: 2.2 } },

  bestPwmBass: { label: 'BEST PWM Bass', category: 'Bass', synth: 'MRDR-3', dur: 1.8,
    note: 'A moving pulse body over a sine sub that is deliberately left ALONE — modulate '
      + 'the sub and the weight goes with it. Everything above 100 Hz drifts; the bottom '
      + 'octave does not move at all.',
    layer: {
      osc1: { type: 'pulse', width: 0.38, ratio: 1, gain: 0.85, attack: 0.005, decay: 0.8,
        sustain: 0.8, release: 0.14,
        pwm: { type: 'sine', rate: 0.24, depth: 0.45, delay: 0 } },
      osc2: { type: 'sine', ratio: 0.5, gain: 1, attack: 0.004, decay: 1, sustain: 0.95,
        release: 0.14 },
      osc3: { type: 'pulse', width: 0.28, ratio: 1, detune: -9, gain: 0.4, attack: 0.006,
        decay: 0.7, sustain: 0.7, release: 0.12,
        pwm: { type: 'sine', rate: 0.33, depth: 0.4, delay: 0 } },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 140, Q: 3.2, track: 0.4,
        env: { octaves: 3.6, attack: 0.01, decay: 0.5, sustain: 0.3, release: 0.16 } },
      vca: { attack: 0.005, decay: 1, sustain: 0.93, release: 0.18 },
    },
    drive: 0.3, shape: 'soft', tone: { freq: 5600 },
    mono: true, portamento: 0.04 },

  bestPwmGrowlBass: { label: 'BEST PWM Growl Bass', category: 'Bass', synth: 'MRDR-3', dur: 1.6,
    note: 'Fast, deep width modulation straight into the fold shaper. The width moving '
      + 'under a folded signal is not a wobble on top of a sound, it is a different sound '
      + 'every few milliseconds. Nasty on purpose.',
    layer: {
      osc1: { type: 'pulse', width: 0.5, ratio: 1, gain: 0.9, attack: 0.004, decay: 0.5,
        sustain: 0.75, release: 0.12,
        pwm: { type: 'triangle', rate: 5.2, depth: 0.75, delay: 0.02 } },
      osc2: { type: 'pulse', width: 0.35, ratio: 1, detune: 11, gain: 0.6, attack: 0.005,
        decay: 0.5, sustain: 0.7, release: 0.12,
        pwm: { type: 'sine', rate: 3.7, depth: 0.6, delay: 0.02 } },
      osc3: { type: 'sine', ratio: 0.5, gain: 0.85, attack: 0.004, decay: 0.8, sustain: 0.9,
        release: 0.12 },
      lfo: { type: 'sine', rate: 3.1, depth: 0.35, target: 'filter', delay: 0.05 },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 160, Q: 4.6, track: 0.35,
        env: { octaves: 3.8, attack: 0.006, decay: 0.35, sustain: 0.28, release: 0.14 } },
      vca: { attack: 0.004, decay: 0.7, sustain: 0.88, release: 0.16 },
    },
    drive: 0.66, shape: 'fold', tone: { freq: 4200 },
    mono: true, portamento: 0.03 },

  bestPwmHollowLead: { label: 'BEST PWM Hollow Lead', category: 'Lead', synth: 'MRDR-3', dur: 1.8,
    note: 'The Oberheim hollow lead: two narrow pulses around a quarter duty, the width '
      + 'moving just fast enough to shimmer without turning into a wobble. Mono with a '
      + 'short glide, because this is a one-finger sound.',
    layer: {
      osc1: { type: 'pulse', width: 0.26, ratio: 1, gain: 0.9, attack: 0.012, decay: 0.6,
        sustain: 0.82, release: 0.2, unison: 2, spread: 10,
        pwm: { type: 'sine', rate: 1.1, depth: 0.5, delay: 0.15 } },
      osc2: { type: 'pulse', width: 0.3, ratio: 1, detune: -8, gain: 0.6, attack: 0.015,
        decay: 0.6, sustain: 0.78, release: 0.2,
        pwm: { type: 'sine', rate: 1.4, depth: 0.45, delay: 0.15 } },
      osc3: { type: 'sawtooth', ratio: 0.5, gain: 0.4, attack: 0.01, decay: 0.7,
        sustain: 0.85, release: 0.2 },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 800, Q: 2.4, track: 0.5,
        env: { octaves: 3, attack: 0.02, decay: 0.6, sustain: 0.5, release: 0.25 } },
      vca: { attack: 0.012, decay: 0.7, sustain: 0.88, release: 0.28 },
    },
    drive: 0.3, shape: 'soft', tone: { freq: 10000 },
    vibrato: { depth: 0.15, rate: 5.4, delay: 0.4 },
    mono: true, portamento: 0.06 },

  bestPwmReedLead: { label: 'BEST PWM Reed Lead', category: 'Lead', synth: 'MRDR-3', dur: 2,
    note: 'A 15% pulse through a static bandpass at 1.6 kHz — the formant trick and the '
      + 'moving width in one patch. The resonance stays put while the duty walks under '
      + 'it, which is what a double reed does.',
    layer: {
      osc1: { type: 'pulse', width: 0.15, ratio: 1, gain: 1, attack: 0.02, decay: 0.6,
        sustain: 0.85, release: 0.18,
        pwm: { type: 'sine', rate: 0.75, depth: 0.5, delay: 0.2 },
        filter: { type: 'bandpass', slope: -12, freq: 1600, Q: 8, track: 0,
          env: { octaves: 0.8, attack: 0.04, decay: 0.6, sustain: 0.5, release: 0.2 } } },
      osc2: { type: 'pulse', width: 0.22, ratio: 1, detune: 6, gain: 0.45, attack: 0.025,
        decay: 0.6, sustain: 0.8, release: 0.18,
        pwm: { type: 'sine', rate: 0.53, depth: 0.45, delay: 0.2 },
        filter: { type: 'bandpass', slope: -12, freq: 700, Q: 6, track: 0 } },
      osc3: { type: 'triangle', ratio: 0.5, gain: 0.3, attack: 0.02, decay: 0.7,
        sustain: 0.8, release: 0.16 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 3200, Q: 0.9, track: 0.4,
        env: { octaves: 1.6, attack: 0.05, decay: 0.7, sustain: 0.55, release: 0.2 } },
      vca: { attack: 0.02, decay: 0.7, sustain: 0.88, release: 0.22 },
    },
    drive: 0.24, shape: 'soft', tone: { freq: 9000 },
    vibrato: { depth: 0.17, rate: 5.6, delay: 0.35 } },

  bestPwmClav: { label: 'BEST PWM Clav', category: 'Keys', synth: 'MRDR-3', dur: 1.2,
    note: 'Percussive and narrow: a 15% pulse with a filter envelope that shuts almost as '
      + 'fast as it opens. The PWM is shallow and quick — on a note this short it reads as '
      + 'the string still ringing rather than as modulation.',
    layer: {
      osc1: { type: 'pulse', width: 0.15, ratio: 1, gain: 1, attack: 0.002, decay: 0.28,
        sustain: 0.25, release: 0.1,
        pwm: { type: 'sine', rate: 2.4, depth: 0.3, delay: 0 } },
      osc2: { type: 'pulse', width: 0.22, ratio: 2, len: 0.6, detune: 8, gain: 0.32,
        attack: 0.002, decay: 0.18, sustain: 0.15, release: 0.08,
        pwm: { type: 'sine', rate: 3.1, depth: 0.28, delay: 0 } },
      osc3: { type: 'sawtooth', ratio: 0.5, gain: 0.3, attack: 0.002, decay: 0.3,
        sustain: 0.2, release: 0.08 },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 700, Q: 3.6, track: 0.55,
        env: { octaves: 3.4, attack: 0.003, decay: 0.22, sustain: 0.14, release: 0.1 } },
      vca: { attack: 0.002, decay: 0.3, sustain: 0.3, release: 0.12 },
    },
    drive: 0.38, shape: 'soft', tone: { freq: 12000 } },

  bestPwmChoir: { label: 'BEST PWM Choir', category: 'Orch', synth: 'MRDR-3', dur: 8,
    note: 'The /a/ formants again, but over pulses whose widths drift instead of over '
      + 'plain saws. The vowel is held by the filters; the moving source is what turns one '
      + 'singer into a section, and it is doing the job the chorus pedal does on a Juno.',
    layer: {
      osc1: { type: 'pulse', width: 0.5, ratio: 1, gain: 0.9, attack: 0.4, decay: 1.4,
        sustain: 0.85, release: 1, attackCurve: 'lin', unison: 2, spread: 8, stereo: 0.75,
        pwm: { type: 'sine', rate: 0.24, depth: 0.6, delay: 0.5 },
        filter: { type: 'bandpass', slope: -12, freq: 800, Q: 7, track: 0 } },
      osc2: { type: 'pulse', width: 0.44, ratio: 1, detune: 7, gain: 0.55, attack: 0.5,
        decay: 1.6, sustain: 0.8, release: 1, attackCurve: 'lin',
        pwm: { type: 'sine', rate: 0.35, depth: 0.55, delay: 0.5 },
        filter: { type: 'bandpass', slope: -12, freq: 1150, Q: 9, track: 0 } },
      osc3: { type: 'pulse', width: 0.55, ratio: 1, detune: -8, gain: 0.3, attack: 0.55,
        decay: 1.8, sustain: 0.72, release: 1.1, attackCurve: 'lin',
        pwm: { type: 'sine', rate: 0.17, depth: 0.5, delay: 0.5 },
        filter: { type: 'bandpass', slope: -12, freq: 2900, Q: 11, track: 0 } },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 3600, Q: 0.7, track: 0.3,
        env: { octaves: 1.2, attack: 0.7, decay: 1.8, sustain: 0.55, release: 1 } },
      vca: { attack: 0.5, decay: 1.8, sustain: 0.88, release: 1.3, attackCurve: 'lin' },
    },
    drive: 0.08, shape: 'soft',
    humanize: { entry: 0.02 },
    vibrato: { depth: 0.16, rate: 5, delay: 0.7, spread: 0.6 } },

  bestClassicMono: { label: 'BEST Classic Mono', category: 'Lead', synth: 'MRDR-3', dur: 2,
    note: 'Three oscillators into a mixer, one filter, one envelope — the architecture every '
      + 'classic mono synth has and the one this stack could not describe until its layers '
      + 'could give up their own amps. Every AMP reads THROUGH: the Global Amp is the only '
      + 'envelope in the patch.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.8, vca: 'through' },
      // The classic detuned second, and a square an octave down for the bottom — the two
      // moves every three-oscillator patch starts from.
      osc2: { type: 'sawtooth', ratio: 1, detune: 7, gain: 0.65, vca: 'through' },
      osc3: { type: 'square', ratio: 0.5, gain: 0.5, vca: 'through' },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 320, Q: 2.6, track: 0.5,
        env: { octaves: 3.6, attack: 0.01, decay: 0.55, sustain: 0.4, release: 0.2 } },
      vca: { attack: 0.012, decay: 0.6, sustain: 0.8, release: 0.22 },
    },
    drive: 0.28, shape: 'soft', tone: { freq: 10000 },
    vibrato: { depth: 0.12, rate: 5.2, delay: 0.4 },
    mono: true, portamento: 0.05 },

  bestPwmDrift: { label: 'BEST PWM Drift', category: 'FX', synth: 'MRDR-3', dur: 8,
    note: 'Very slow, very deep, and detuned far enough that nothing in it lines up twice. '
      + 'Three widths at 0.07, 0.11 and 0.05 Hz — periods of fourteen, nine and twenty '
      + 'seconds — so the texture never repeats inside anything you would write.',
    layer: {
      osc1: { type: 'pulse', width: 0.5, ratio: 1, gain: 0.46, attack: 2, decay: 4,
        sustain: 0.9, release: 3, attackCurve: 'lin', unison: 3, spread: 26, stereo: 0.95,
        pwm: { type: 'sine', rate: 0.07, depth: 0.8, delay: 0 } },
      osc2: { type: 'pulse', width: 0.4, ratio: 1.5, detune: 14, gain: 0.29, attack: 2.4,
        decay: 4.5, sustain: 0.85, release: 3.4, attackCurve: 'lin', unison: 2, spread: 34,
        pwm: { type: 'triangle', rate: 0.11, depth: 0.75, delay: 0 } },
      osc3: { type: 'pulse', width: 0.6, ratio: 0.5, detune: -17, gain: 0.32, attack: 1.8,
        decay: 5, sustain: 0.92, release: 3.6, attackCurve: 'lin',
        pwm: { type: 'sine', rate: 0.05, depth: 0.7, delay: 0 } },
      lfo: { type: 'sine', rate: 0.09, depth: 0.55, target: 'filter', delay: 2 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 1200, Q: 1.4, track: 0.25,
        env: { octaves: 2.8, attack: 3, decay: 6, sustain: 0.6, release: 3 } },
      vca: { attack: 2.2, decay: 5, sustain: 0.94, release: 3.6, attackCurve: 'lin' },
    },
    vibrato: { depth: 0.05, rate: 2.2, delay: 3 } },
};

// User presets live in their own tables rather than beside the built-in library.
// The split is intentional: entries in TONE/NOISE/DRUM are shipped library sounds
// and must remain read-only, while these tables are the desk's editable collection.
// They start empty in source control and are populated by the mixer when a user saves
// a new sound. Keeping the kind in the table name means loading remains as simple as
// the library tables above and the source writer can preserve the same readable shape.
const USER_TONE = {
  amHollow2: { label: 'AM Hollow 2', category: 'Lead', synth: 'AMSynth', dur: 1.2,
    note: 'Ring-modulated and slightly out of tune with itself. Reads as a voice rather than a '
      + 'synth.',
    options: {
      harmonicity: 2,
      oscillator: { type: 'square' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.008, decay: 0.2, sustain: 0.6, release: 0.3 },
      modulationEnvelope: { attack: 0.05, decay: 0.2, sustain: 0.5, release: 0.3 },
    } },
  sawtoothTone2: { label: 'Sawtooth Tone2', category: 'Lead', synth: 'GameSynth', dur: 1.2,
    note: 'A direct single-oscillator sawtooth replacement for the engine voice.',
    fixedLength: 0.063,
    waveform: 'sawtooth',
    attack: 0.01,
    release: 0.015,
    trim: 0,
    starter: false },
  sintone: { label: 'Sintone', category: 'Lead', synth: 'GameSynth', dur: 1,
    note: 'A direct single-oscillator square-wave replacement for the engine voice.',
    options: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0, sustain: 1, release: 0.01, attackCurve: 'exponential' },
    },
    fixedLength: 0.144,
    waveform: 'sine',
    attack: 0.001,
    release: 0.089,
    trim: 0.8,
    vibrato: { depth: 0, rate: 10.9 },
    mono: false,
    portamento: 0,
    starter: false },
  roundBass: { label: 'Round Bass', category: 'Bass', synth: 'MonoSynth', dur: 1.8,
    note: 'Saw through a lowpass that closes as the note decays — the classic synth bass.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.001, decay: 1.24, sustain: 0.29, release: 0.8 },
      filter: { type: 'lowpass', Q: 2.9, rolloff: -24 },
      filterEnvelope: { attack: 0.001, decay: 1.22, sustain: 0.13, release: 0.3, baseFrequency: 110, octaves: 3.9 },
    },
    starter: false },
};
const USER_NOISE = {
  bigRoomClap: { label: 'Big Room Clap', category: 'Clap', dur: 1,
    note: 'Five bursts spread wider with a long tail on the last — a hall, not a booth. Wants '
      + 'space in the arrangement.',
    noise: { type: 'bandpass', freq: 1500, Q: 0.9, decay: 0.355, gain: 0.88 },
    taps: [0, 0.014, 0.028, 0.048], tapFalloff: 0.82, tapDetune: 0.94, tapTone: 0.97,
    starter: false,
    trim: 3 },
};
const USER_DRUM = {
  vl1Pi2: { label: 'VL-1 Pi 2', category: 'Perc', homeLane: 'rim', dur: 0.5,
    note: 'A very short, high square-wave tick: the thinner, sharper of the VL-1 rhythm '
      + 'sounds, with a slight high-pass edge and a twenty-millisecond decay.',
    osc: { type: 'square', from: 1000, to: 1000, attack: 0, decay: 0.15, curve: 'exp', gain: 1, hold: 0, pitchCurve: 'snap' },
    tone: { type: 'highpass', freq: 800, Q: 0.7 },
    starter: false },
};

// Measured levels, filled in by tools/measure-voices.js. Kept beside the options they
// belong to rather than in a generated file: a preset and its level are one thing,
// and a second file would be one more thing to forget to regenerate.
//
// The K-weighted RMS of one note at unity, on the lane the preset is FOR — see
// HOME_LANES in the tool. `voiceGain` divides the lane's target by this. An id missing
// from here falls back to its peak, which is what the library was levelled by before
// and is close enough to keep a sound audible until the tool is run again.
const LEVELS = {
  roundMono: 0.075557, fmGrowl: 0.023982, subSine: 0.11677,
  acidSquelch: 0.06367, rubberBass: 0.056514, clangBass: 0.020067,
  detuneBass: 0.161441, monoBright: 0.087427, amHollow: 0.01455,
  duoDetune: 0.114131, glassLead: 0.020582, reedLead: 0.114797,
  screamLead: 0.112678, vibratoLead: 0.183201, fmKeys: 0.021576,
  epiano: 0.023667, clav: 0.005047, toyPiano: 0.013277, softKeys: 0.060456,
  padTriangle: 0.101497, warmPad: 0.104127, glassPad: 0.021327,
  breathPad: 0.119482, amOrgan: 0.026762, fullOrgan: 0.062627,
  reedOrgan: 0.027077, fmBell: 0.018029, celeste: 0.024454, marimba: 0.013661,
  tubularBell: 0.27894, musicBox: 0.020825, synthPluck: 0.028111,
  harpPluck: 0.04711, koto: 0.013469, brassStab: 0.060669,
  synthStrings: 0.148374, hornSwell: 0.025887, buzzSaw: 0.078515,
  metalHit: 0.192047, drumTone: 0.049339, ringMod: 0.009345, hardFm: 0.013983,
  kickDeep: 0.068639, kickPunch: 0.030431, kickDirty: 0.054799,
  kickThud: 0.027204, snareFm: 0.012453, snareTrash: 0.17919, hatTick: 0.024818,
  hatSizzle: 0.049903, conga: 0.04311, taiko: 0.026424, clave: 0.006432,
  agogo: 0.168082, triangleDing: 0.149995, kick808: 0.048859,
  kickTight: 0.029608, kickClick: 0.048943, tom: 0.040735, metalSnare: 0.142494,
  metalHatClosed: 0.03987, metalHatOpen: 0.111269, hat808: 0.024918,
  hat808Open: 0.073498, metalCrash: 0.196216, cowbell: 0.121817,
  woodBlock: 0.008281, zap: 0.019997, tpBah: 0.005703, tpBassGuitar: 0.085495,
  tpBassy: 0.097032, tpBrassCircuit: 0.060105, tpCoolGuy: 0.246214,
  tpPianoetta: 0.111126, tpPizz: 0.017563, tpAlienChorus: 0.076996,
  tpDelicateWind: 0.050353, tpDropPulse: 0.030211, tpLectric: 0.031326,
  tpMarimba: 0.056977, tpSteelpan: 0.029149, tpSuperSaw: 0.024461,
  tpTreeTrunk: 0.028838, tpElectricCello: 0.020704, tpKalimba: 0.028046,
  tpThinSaws: 0.017535, tpHarmonics: 0.022885, tpTiny: 0.009049,
  roundMono2: 0.061825, toneSquare: 0.028709, toneSawtooth: 0.009859,
  toneTriangle: 0.011842, toneSine: 0.014616, squareTone2: 0.027512,
  fmGrowl2: 0.023796, softKeys2: 0.060456, kalimba: 0.028046,
  softKeys3: 0.060456, addDrawbar: 0.074276, addDrawbarBright: 0.084924,
  addDrawbarPerc: 0.086139, addShopOrgan: 0.036063, addSwoop: 0.041428,
  addBell: 0.087375, addGlassPad: 0.214438, shopOrgan2: 0.108558,
  squareOrgan: 0.055124, bass80sMono: 0.065969, bass80sFM: 0.021042,
  bass80sDuo: 0.137751, bass80sSynth: 0.072658, bass303Squelch: 0.16325,
  bass303Rubber: 0.1299, bass303DeepGlide: 0.15706, bass303Bite: 0.1863,
  bass303Pulse: 0.518813, layerBass80s: 0.027581, layerFilteredSaw: 0.01933,
  layerLeadBright: 0.028371, layerTwinkle: 0.053344, layerTitleBass: 0.057193,
  layerFinaleBass: 0.02488, layerFinaleBassGhost: 0.027966,
  layerWalkingBass: 0.028444, layerMegamixBass: 0.019186,
  layerShopBass: 0.017873, layerLoungeBass: 0.019108,
  layerBright80sBass: 0.010901, layerTitleLead: 0.04926,
  layerFinaleLead: 0.018712, layerMegamixLead: 0.018333,
  layerShopLead: 0.021288, layerCounterLead: 0.016176, layerTitleHarm: 0.042832,
  layerSineHarm: 0.024241, layerTitleChords: 0.047374,
  layerFinaleStab: 0.013372, layerFinaleSawStab: 0.005614,
  layerShopComp: 0.023028, layerDreamPad: 0.094772, snareCrisp: 0.01243,
  snareFat: 0.018183, snareTight: 0.007868, snareBrush: 0.034296,
  snareRim: 0.008436, clap808: 0.010142, clapTight: 0.006178,
  clapRoom: 0.027296, hatClosed: 0.013707, hatOpen: 0.056805,
  hatPedal: 0.007613, hatFoil: 0.010984, hatFoilOpen: 0.04672, shaker: 0.010801,
  tambourine: 0.034897, noiseSweep: 0.044325, dsKick: 0.054285,
  dsKickHard: 0.067073, dsSnare: 0.027926, dsSnareCrack: 0.054138,
  dsClap: 0.011273, dsHatClosed: 0.015363, dsHatOpen: 0.054488,
  hatSnap: 0.031197, hatSnapOpen: 0.094985, hatGrit: 0.045446,
  hatGritOpen: 0.090448, dsShaker: 0.017053, dsTom: 0.047463, dsRim: 0.018473,
  vl1Pi: 0.014004, vl1Po: 0.014353, vl1Sha: 0.034957, dsZap: 0.056003,
  rimRing: 0.005348, rimWood: 0.004971, rimClang: 0.047909, hatCluster: 0.01563,
  hatClusterOpen: 0.055057, snarePink: 0.026481, clapHands: 0.011519,
  kickCrush: 0.032487, kickEngine: 0.03437, kickShop: 0.030652,
  kickMegamix: 0.029193, snareEngine: 0.015394, clapEngine: 0.052286,
  hatEngine: 0.02664, ohatEngine: 0.056556, tomEngine: 0.036372,
  rimEngine: 0.032346, crashEngine: 0.077097, crashFinale: 0.06291,
  dsCrackSnare2: 0.101559, dsClosedHat2: 0.090277, engineCrash: 0.246364,
  ds909Kick: 0.058672, ds909KickPunch: 0.059112, ds909Snare: 0.129815,
  ds909SnareCrack: 0.063039, ds909Clap: 0.011164, ds909Hat: 0.028418,
  ds909OpenHat: 0.080241, ds909Tom: 0.049216, ds909Rim: 0.019144,
  ds909Crash: 0.167746, dsCr78Kick: 0.026188, dsCr78Snare: 0.011842,
  dsCr78Hat: 0.016717, dsCr78Clap: 0.006511, dsCr78Cowbell: 0.023967,
  dsCr78Tom: 0.034507, ds808Kick: 0.055838, ds808Snare: 0.026153,
  ds808Clap: 0.014409, ds808Hat: 0.01638, ds808OpenHat: 0.056353,
  ds808Cowbell: 0.028111, ds808Tom: 0.055444, snareFlam: 0.037641,
  clapMetal: 0.041919, clapFm: 0.018663, buzzRoll: 0.036629, amHollow2: 0.01455,
  sawtoothTone2: 0.00986, sintone: 0.023613, roundBass: 0.075557,
  bigRoomClap: 0.018347, vl1Pi2: 0.040498, stKickPunch: 0.030431,
  stSnareCrisp: 0.01243, stHatTick: 0.024818, stRoundMono: 0.075557,
  stFmKeys: 0.021576, stMonoBright: 0.087427, stKickDeep: 0.068639,
  stSnareBrush: 0.034296, stTaiko: 0.026424, stSubSine: 0.11677,
  stReedOrgan: 0.027077, stVibratoLead: 0.183201, stKickTight: 0.029608,
  stSnareRim: 0.008436, stClave: 0.006432, stTpBassGuitar: 0.085495,
  stClav: 0.005047, stSynthPluck: 0.028111, stKickThud: 0.027204,
  stSnareFat: 0.018183, stHatPedal: 0.007613, stDsRim: 0.018473,
  stRubberBass: 0.056514, stEpiano: 0.023667, stCeleste: 0.024454,
  stHatClosed: 0.013707, stHatOpen: 0.056805, stDetuneBass: 0.161441,
  stWarmPad: 0.104127, stDuoDetune: 0.114131, stWoodBlock: 0.008281,
  stTriangleDing: 0.149995, stGlassPad: 0.021327, stMusicBox: 0.020825,
  stSnareFlam: 0.037641, stSynthStrings: 0.148374, stReedLead: 0.114797,
  stHatSizzle: 0.049903, stFmGrowl: 0.023982, stAmOrgan: 0.026762,
  stGlassLead: 0.020582, stClapRoom: 0.027297, stTpBassy: 0.097032,
  stTpPianoetta: 0.111126, stTpBah: 0.005703, stKickDirty: 0.054799,
  stClapTight: 0.006178, stMetalHatClosed: 0.03987, stCowbell: 0.121817,
  stAcidSquelch: 0.06367, stBreathPad: 0.119482, stTpLectric: 0.031326,
  stKickClick: 0.048943, stClap808: 0.010142, stDsHatClosed: 0.015363,
  stZap: 0.019997, stPadTriangle: 0.101497, stFmBell: 0.018029,
  stAmHollow: 0.01455, layerBrassStack: 0.055873, bestChoirAah: 0.018996,
  bestChoirOoh: 0.040225, bestVoiceBox70s: 0.112372, bestRobotVox: 0.076267,
  bestVowelPad: 0.049641, bestMegaSawLead: 0.135751, bestHeroLead: 0.161303,
  bestScreamerLead: 0.132717, bestMonsterBass: 0.122239,
  bestReeseBass: 0.151935, bestPwmStrings: 0.088856, bestPwmBrass: 0.175298,
  bestPwmPadWide: 0.096921, bestPwmBass: 0.151505, bestPwmGrowlBass: 0.123668,
  bestPwmHollowLead: 0.166614, bestPwmReedLead: 0.053483, bestPwmClav: 0.08838,
  bestPwmChoir: 0.030764, bestPwmDrift: 0.115573, bestClassicMono: 0.15511
};

// Measured peaks, the same renders. No longer what a preset is levelled by: what it is
// read for now is headroom — a preset whose peak is far above its lane's target spends
// the mix's ceiling on one transient — and being the fallback above.
const PEAKS = {
  roundMono: 1.183, fmGrowl: 0.216, subSine: 0.6891, acidSquelch: 1.6469,
  rubberBass: 0.9084, clangBass: 0.2115, detuneBass: 1.5362, monoBright: 0.8807,
  amHollow: 0.1073, duoDetune: 1.3948, glassLead: 0.2129, reedLead: 0.8357,
  screamLead: 2.1142, vibratoLead: 1.3321, fmKeys: 0.2185, epiano: 0.2199,
  clav: 0.2594, toyPiano: 0.2149, softKeys: 0.6896, padTriangle: 0.6968,
  warmPad: 0.7232, glassPad: 0.1228, breathPad: 0.8623, amOrgan: 0.111,
  fullOrgan: 0.2204, reedOrgan: 0.4084, fmBell: 0.2199, celeste: 0.2195,
  marimba: 0.2153, tubularBell: 2.5384, musicBox: 0.219, synthPluck: 1.1918,
  harpPluck: 0.6946, koto: 0.2181, brassStab: 0.752, synthStrings: 1.0717,
  hornSwell: 0.2168, buzzSaw: 1.1884, metalHit: 4.4308, drumTone: 0.6917,
  ringMod: 0.1355, hardFm: 0.2094, kickDeep: 0.6962, kickPunch: 0.6908,
  kickDirty: 0.6824, kickThud: 0.6766, snareFm: 0.2085, snareTrash: 3.4164,
  hatTick: 1.3077, hatSizzle: 0.9276, conga: 0.6946, taiko: 0.6398,
  clave: 0.2031, agogo: 3.4757, triangleDing: 1.5756, kick808: 0.6886,
  kickTight: 0.6956, kickClick: 0.6794, tom: 0.6918, metalSnare: 3.0459,
  metalHatClosed: 1.4218, metalHatOpen: 1.448, hat808: 0.9311,
  hat808Open: 1.1697, metalCrash: 2.3556, cowbell: 3.0877, woodBlock: 0.2198,
  zap: 0.6253, tpBah: 0.1386, tpBassGuitar: 0.7916, tpBassy: 1.3042,
  tpBrassCircuit: 1.0582, tpCoolGuy: 2.9141, tpPianoetta: 0.886, tpPizz: 1.0667,
  tpAlienChorus: 0.9626, tpDelicateWind: 0.2183, tpDropPulse: 0.7,
  tpLectric: 0.6403, tpMarimba: 0.6906, tpSteelpan: 0.2812, tpSuperSaw: 0.2661,
  tpTreeTrunk: 0.6572, tpElectricCello: 0.2173, tpKalimba: 0.2195,
  tpThinSaws: 0.2098, tpHarmonics: 0.1082, tpTiny: 0.1531, roundMono2: 0.6477,
  toneSquare: 0.5952, toneSawtooth: 0.3623, toneTriangle: 0.55,
  toneSine: 0.5712, squareTone2: 0.595, fmGrowl2: 0.2158, softKeys2: 0.6896,
  kalimba: 0.2195, softKeys3: 0.6896, addDrawbar: 1.0762,
  addDrawbarBright: 1.3327, addDrawbarPerc: 1.3427, addShopOrgan: 1.2633,
  addSwoop: 0.9216, addBell: 1.4954, addGlassPad: 1.3288, shopOrgan2: 1.9706,
  squareOrgan: 0.9273, bass80sMono: 1.1324, bass80sFM: 0.2208,
  bass80sDuo: 1.5251, bass80sSynth: 0.6689, bass303Squelch: 2.4717,
  bass303Rubber: 2.0323, bass303DeepGlide: 1.7497, bass303Bite: 2.7534,
  bass303Pulse: 5.2676, layerBass80s: 0.5483, layerFilteredSaw: 0.6922,
  layerLeadBright: 0.6639, layerTwinkle: 0.7244, layerTitleBass: 0.6858,
  layerFinaleBass: 0.5947, layerFinaleBassGhost: 0.634,
  layerWalkingBass: 0.6626, layerMegamixBass: 0.6564, layerShopBass: 0.6832,
  layerLoungeBass: 0.6409, layerBright80sBass: 0.2844, layerTitleLead: 0.6837,
  layerFinaleLead: 0.4918, layerMegamixLead: 0.5667, layerShopLead: 0.5726,
  layerCounterLead: 0.6449, layerTitleHarm: 0.688, layerSineHarm: 0.649,
  layerTitleChords: 0.6742, layerFinaleStab: 0.5946, layerFinaleSawStab: 0.1832,
  layerShopComp: 0.6838, layerDreamPad: 0.7522, snareCrisp: 0.4818,
  snareFat: 0.6748, snareTight: 0.4079, snareBrush: 0.8667, snareRim: 0.5163,
  clap808: 0.241, clapTight: 0.1875, clapRoom: 0.3999, hatClosed: 0.6646,
  hatOpen: 0.866, hatPedal: 0.2987, hatFoil: 0.6239, hatFoilOpen: 0.8071,
  shaker: 0.4339, tambourine: 0.8986, noiseSweep: 0.813, dsKick: 0.7,
  dsKickHard: 0.7, dsSnare: 0.6935, dsSnareCrack: 0.7, dsClap: 0.2885,
  dsHatClosed: 0.7135, dsHatOpen: 0.8873, hatSnap: 0.7, hatSnapOpen: 0.7,
  hatGrit: 0.6977, hatGritOpen: 0.6988, dsShaker: 0.5496, dsTom: 0.7,
  dsRim: 0.4228, vl1Pi: 1.0879, vl1Po: 0.6836, vl1Sha: 0.8505, dsZap: 0.7,
  rimRing: 0.371, rimWood: 0.1411, rimClang: 0.7, hatCluster: 0.8142,
  hatClusterOpen: 1.0755, snarePink: 0.7266, clapHands: 0.2871,
  kickCrush: 0.6934, kickEngine: 0.7966, kickShop: 0.7085, kickMegamix: 0.709,
  snareEngine: 0.5414, clapEngine: 1.0679, hatEngine: 0.8382,
  ohatEngine: 0.9765, tomEngine: 0.6757, rimEngine: 1.0751, crashEngine: 1.0299,
  crashFinale: 0.9676, dsCrackSnare2: 0.7, dsClosedHat2: 1.9163,
  engineCrash: 1.4514, ds909Kick: 0.7, ds909KickPunch: 0.7, ds909Snare: 0.7,
  ds909SnareCrack: 0.7, ds909Clap: 0.2804, ds909Hat: 0.7, ds909OpenHat: 0.7,
  ds909Tom: 0.7, ds909Rim: 0.5504, ds909Crash: 0.7, dsCr78Kick: 0.6899,
  dsCr78Snare: 0.4701, dsCr78Hat: 0.6253, dsCr78Clap: 0.1997,
  dsCr78Cowbell: 0.4482, dsCr78Tom: 0.6969, ds808Kick: 0.7, ds808Snare: 0.7,
  ds808Clap: 0.3172, ds808Hat: 0.7687, ds808OpenHat: 1.0138,
  ds808Cowbell: 0.5426, ds808Tom: 0.6991, snareFlam: 2.1394, clapMetal: 1.6986,
  clapFm: 0.5222, buzzRoll: 2.217, amHollow2: 0.1073, sawtoothTone2: 0.3623,
  sintone: 0.6504, roundBass: 1.183, bigRoomClap: 0.3542, vl1Pi2: 1.4428,
  stKickPunch: 0.6908, stSnareCrisp: 0.4818, stHatTick: 1.3077,
  stRoundMono: 1.183, stFmKeys: 0.2185, stMonoBright: 0.8807,
  stKickDeep: 0.6962, stSnareBrush: 0.8667, stTaiko: 0.6398, stSubSine: 0.6891,
  stReedOrgan: 0.4084, stVibratoLead: 1.3321, stKickTight: 0.6956,
  stSnareRim: 0.5163, stClave: 0.2031, stTpBassGuitar: 0.7916, stClav: 0.2594,
  stSynthPluck: 1.1918, stKickThud: 0.6766, stSnareFat: 0.6748,
  stHatPedal: 0.2987, stDsRim: 0.4228, stRubberBass: 0.9084, stEpiano: 0.2199,
  stCeleste: 0.2195, stHatClosed: 0.6646, stHatOpen: 0.866,
  stDetuneBass: 1.5362, stWarmPad: 0.7232, stDuoDetune: 1.3948,
  stWoodBlock: 0.2198, stTriangleDing: 1.5756, stGlassPad: 0.1228,
  stMusicBox: 0.219, stSnareFlam: 2.1394, stSynthStrings: 1.0717,
  stReedLead: 0.8357, stHatSizzle: 0.9276, stFmGrowl: 0.216, stAmOrgan: 0.111,
  stGlassLead: 0.2129, stClapRoom: 0.3999, stTpBassy: 1.3042,
  stTpPianoetta: 0.886, stTpBah: 0.1386, stKickDirty: 0.6824,
  stClapTight: 0.1875, stMetalHatClosed: 1.4218, stCowbell: 3.0877,
  stAcidSquelch: 1.6469, stBreathPad: 0.8623, stTpLectric: 0.6403,
  stKickClick: 0.6794, stClap808: 0.241, stDsHatClosed: 0.7135, stZap: 0.6253,
  stPadTriangle: 0.6968, stFmBell: 0.2199, stAmHollow: 0.1073,
  layerBrassStack: 0.7916, bestChoirAah: 0.1507, bestChoirOoh: 0.2362,
  bestVoiceBox70s: 0.9051, bestRobotVox: 0.6322, bestVowelPad: 0.3766,
  bestMegaSawLead: 0.8528, bestHeroLead: 0.8382, bestScreamerLead: 0.9931,
  bestMonsterBass: 0.7453, bestReeseBass: 0.856, bestPwmStrings: 0.6256,
  bestPwmBrass: 0.8444, bestPwmPadWide: 0.7295, bestPwmBass: 0.8703,
  bestPwmGrowlBass: 0.9256, bestPwmHollowLead: 0.8795, bestPwmReedLead: 0.636,
  bestPwmClav: 0.9564, bestPwmChoir: 0.2033, bestPwmDrift: 0.8248,
  bestClassicMono: 0.8586
};

/**
 * The STARTER table — the sounds the New Song generator is written for, frozen.
 *
 * A copy of the library, taken once, that nothing can edit. It exists because a style
 * pack used to name mutable library presets: "the House bass is a square" stayed true
 * only until somebody made it a sine, and then every song generated from then on came
 * out a sine too. A pack was never holding a sound, it was holding a NAME, and the name
 * resolved to whatever the library held that afternoon.
 *
 * So the packs name these instead. `TABLES` and `USER_TABLES` in
 * tools/lib/voices-source.js are the tables an editor may write, and this is not in
 * either one: `tableOf` cannot find a starter id, `upsertPreset` has nowhere to put
 * one, and the desk's /voice-save refuses one by name. Editing or duplicating a library
 * sound leaves `stRoundMono` alone, which
 * is the point — the shipped library remains unchanged, and every song already naming
 * a library preset goes on following that reference sound.
 *
 * COMPLETE copies, not diffs, for the same reason a song's own copy is complete: a diff
 * would be a reference to the thing this exists not to depend on. They state their own
 * `kind`, because unlike TONE, NOISE and DRUM this table holds all three.
 *
 * Written by tools/freeze-starter-voices.js, which is a script you type on purpose and
 * almost never run — re-running it RE-FREEZES from the library as it stands, which is
 * the one way a starter sound is ever meant to change.
 */
const STARTER = {
  stKickPunch: { label: 'Punch Kick (starter)', category: 'Kick', kind: 'tone', synth: 'MembraneSynth', dur: 1.2,
    note: 'Triangle body and a fast drop — more middle than an 808, so it survives a mix with '
      + 'a busy bass under it.',
    options: {
      pitchDecay: 0.025,
      octaves: 5,
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.28, sustain: 0, release: 0.25 },
    } },
  stSnareCrisp: { label: 'Snare (starter)', category: 'Snare', kind: 'noise', dur: 1,
    note: 'The engine’s own snare as a preset: a bright noise band, a short decay and a hint '
      + 'of body. The one every song already uses.',
    noise: { type: 'bandpass', freq: 2600, Q: 0.7, decay: 0.09 },
    body: { type: 'triangle', from: 210, to: 140, decay: 0.06, gain: 0.375 } },
  stHatTick: { label: 'Metal Tick (starter)', category: 'Hats', kind: 'tone', synth: 'MetalSynth', dur: 0.5,
    note: 'The shortest thing in the library — a metallic tick with no ring at all.',
    options: {
      harmonicity: 14,
      modulationIndex: 36,
      resonance: 6000,
      octaves: 1,
      envelope: { attack: 0.001, decay: 0.02, release: 0.01 },
    } },
  stRoundMono: { label: 'Round Mono 2 (starter)', category: 'Bass', kind: 'tone', synth: 'MonoSynth', dur: 1.8,
    note: 'Saw through a lowpass that closes as the note decays — the classic synth bass.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.001, decay: 1.24, sustain: 0.29, release: 0.8 },
      filter: { type: 'lowpass', Q: 2.9, rolloff: -24 },
      filterEnvelope: { attack: 0.001, decay: 1.22, sustain: 0.13, release: 0.3, baseFrequency: 110, octaves: 3.9 },
    } },
  stFmKeys: { label: 'FM Keys (starter)', category: 'Keys', kind: 'tone', synth: 'FMSynth', dur: 2.6,
    note: 'Struck keys, percussive enough to keep a stab from smearing into the next bar.',
    options: {
      harmonicity: 2,
      modulationIndex: 4,
      oscillator: { type: 'sine' },
      modulation: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.8, sustain: 0.1, release: 0.8 },
      modulationEnvelope: { attack: 0.004, decay: 0.4, sustain: 0.05, release: 0.5 },
    } },
  stMonoBright: { label: 'Bright Mono (starter)', category: 'Lead', kind: 'tone', synth: 'MonoSynth', dur: 1.2,
    note: 'Square through an opening filter: the arcade lead with an envelope the raw '
      + 'oscillator cannot give it.',
    options: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.004, decay: 0.15, sustain: 0.6, release: 0.2 },
      filter: { type: 'lowpass', Q: 2, rolloff: -12 },
      filterEnvelope: { attack: 0.002, decay: 0.12, sustain: 0.4, release: 0.25, baseFrequency: 600, octaves: 3.2 },
    } },
  stKickDeep: { label: 'Deep Kick (starter)', category: 'Kick', kind: 'tone', synth: 'MembraneSynth', dur: 3,
    note: 'A long, slow pitch drop into a sub that outlasts the bar. One per phrase, or it '
      + 'turns the low end to mud.',
    options: {
      pitchDecay: 0.12,
      octaves: 8,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 1.1, sustain: 0, release: 1 },
    } },
  stSnareBrush: { label: 'Brush (starter)', category: 'Snare', kind: 'noise', dur: 1,
    note: 'All air and no crack — a highpassed sweep with no body at all. The quiet backbeat '
      + 'for the lounge themes.',
    noise: { type: 'highpass', freq: 4200, Q: 0.4, decay: 0.13 } },
  stTaiko: { label: 'KW Blip (starter)', category: 'Perc', kind: 'tone', homeLane: 'tom', synth: 'MembraneSynth', dur: 2.4,
    note: 'Like a kraftwerk percussion blip',
    options: {
      pitchDecay: 0.037,
      octaves: 6.3,
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.001, decay: 0.16, sustain: 0, release: 0.3 },
    } },
  stSubSine: { label: 'Sub Sine (starter)', category: 'Bass', kind: 'tone', synth: 'Synth', dur: 2.2,
    note: 'Pure weight, no harmonics. Wants room underneath it and a lead up top.',
    options: {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.012, decay: 0.3, sustain: 0.8, release: 0.4 },
    } },
  stReedOrgan: { label: 'Reed Organ (starter)', category: 'Organ', kind: 'tone', synth: 'MonoSynth', dur: 3,
    note: 'A wheezier, narrower organ — harmonium rather than Hammond.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.04, decay: 0.05, sustain: 0.95, release: 0.3 },
      filter: { type: 'bandpass', Q: 2, rolloff: -12 },
      filterEnvelope: { attack: 0.05, decay: 0.1, sustain: 0.8, release: 0.3, baseFrequency: 500, octaves: 1.5 },
    } },
  stVibratoLead: { label: 'Vibrato Voice (starter)', category: 'Lead', kind: 'tone', synth: 'DuoSynth', dur: 1.8,
    note: 'Heavy, slow vibrato on a near-unison pair — the closest thing here to someone singing.',
    options: {
      harmonicity: 1.002,
      vibratoAmount: 0.35,
      vibratoRate: 5.5,
      voice0: { oscillator: { type: 'triangle' }, envelope: { attack: 0.05, decay: 0.2, sustain: 0.8, release: 0.4 } },
      voice1: { oscillator: { type: 'sine' }, envelope: { attack: 0.07, decay: 0.2, sustain: 0.8, release: 0.4 } },
    } },
  stKickTight: { label: 'Tight Kick (starter)', category: 'Kick', kind: 'tone', synth: 'MembraneSynth', dur: 1,
    note: 'The same shape with the tail cut short — for a busy bar where a long boom would '
      + 'smear into the next hit.',
    options: {
      pitchDecay: 0.02,
      octaves: 4,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.16, sustain: 0, release: 0.16 },
    } },
  stSnareRim: { label: 'Rimshot (starter)', category: 'Snare', kind: 'noise', dur: 1,
    note: 'Narrow, high and instant, with a hard pitched knock. The stick rather than the skin.',
    noise: { type: 'bandpass', freq: 5000, Q: 3, decay: 0.03 },
    body: { type: 'square', from: 420, to: 320, decay: 0.02, gain: 0.5 } },
  stClave: { label: 'Clave (starter)', category: 'Perc', kind: 'tone', synth: 'FMSynth', dur: 0.6,
    note: 'A hard, high, completely dry click with a pitch to it. Cuts through anything at '
      + 'almost no level.',
    options: {
      harmonicity: 3.02,
      modulationIndex: 8,
      oscillator: { type: 'sine' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.04 },
      modulationEnvelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.02 },
    } },
  stTpBassGuitar: { label: 'Bass Guitar (starter)', category: 'Bass', kind: 'tone', synth: 'MonoSynth', dur: 1.8,
    note: 'An FM square through a lowpass, voiced to sit where a plucked electric bass sits.',
    origin: 'Tonejs/Presets MonoSynth/BassGuitar',
    options: {
      oscillator: { type: 'fmsquare5', modulationType: 'triangle', modulationIndex: 2, harmonicity: 0.501 },
      filter: { Q: 1, type: 'lowpass', rolloff: -24 },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.4, release: 2 },
      filterEnvelope: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 1.5, baseFrequency: 50, octaves: 4.4 },
    } },
  stClav: { label: 'Clavinet (starter)', category: 'Keys', kind: 'tone', synth: 'MonoSynth', dur: 1,
    note: 'Short, hard and bandpassed. Funk comping — it wants sixteenths.',
    options: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.12, sustain: 0.05, release: 0.1 },
      filter: { type: 'bandpass', Q: 3, rolloff: -12 },
      filterEnvelope: { attack: 0.001, decay: 0.08, sustain: 0.2, release: 0.1, baseFrequency: 700, octaves: 2.5 },
    } },
  stSynthPluck: { label: 'Synth Pluck (starter)', category: 'Pluck', kind: 'tone', synth: 'MonoSynth', dur: 0.9,
    note: 'Filter slams shut immediately. Short, bright, and gone.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.18 },
      filter: { type: 'lowpass', Q: 4, rolloff: -24 },
      filterEnvelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1, baseFrequency: 300, octaves: 4 },
    } },
  stKickThud: { label: 'Thud (starter)', category: 'Kick', kind: 'tone', synth: 'MembraneSynth', dur: 1,
    note: 'Barely any pitch movement — a dull knock rather than a boom. Sits under a mix '
      + 'instead of leading it.',
    options: {
      pitchDecay: 0.01,
      octaves: 1.5,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.002, decay: 0.2, sustain: 0, release: 0.18 },
    } },
  stSnareFat: { label: 'Fat Snare (starter)', category: 'Snare', kind: 'noise', dur: 1,
    note: 'Lower band, longer tail and much more body — a snare that carries a backbeat on its '
      + 'own rather than sitting on top of one.',
    noise: { type: 'bandpass', freq: 1700, Q: 0.5, decay: 0.16 },
    body: { type: 'triangle', from: 180, to: 110, decay: 0.11, gain: 0.6 } },
  stHatPedal: { label: 'Pedal Hat (starter)', category: 'Hats', kind: 'noise', dur: 0.5,
    note: 'Duller and lower — the hat closing under a foot rather than being struck.',
    noise: { type: 'bandpass', freq: 4000, Q: 1.6, decay: 0.05 } },
  stDsRim: { label: 'DS Rim (starter)', category: 'Perc', kind: 'drum', dur: 0.5,
    note: 'A driven square knock and a narrow band of air, both gone in thirty milliseconds. '
      + 'The stick sound the engine’s rim approximates, synthesised.',
    osc: { type: 'square', from: 460, to: 635, sweep: 0.012, decay: 0.12, curve: 'exp', gain: 0.13 },
    noise: { type: 'bandpass', freq: 4300, Q: 2.2, decay: 0.235, gain: 0.44 },
    drive: 0.24 },
  stRubberBass: { label: 'Rubber (starter)', category: 'Bass', kind: 'tone', synth: 'MonoSynth', dur: 1.6,
    note: 'Triangle through a soft filter with a slow-ish attack. Bounces rather than punches.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.02, decay: 0.49, sustain: 0.6, release: 0.3 },
      filter: { type: 'lowpass', Q: 3, rolloff: -12 },
      filterEnvelope: { attack: 0.023, decay: 0.2, sustain: 0.3, release: 0.3, baseFrequency: 100, octaves: 4.6, attackCurve: 'exponential' },
    },
    transpose: -12 },
  stEpiano: { label: 'Electric Piano (starter)', category: 'Keys', kind: 'tone', synth: 'FMSynth', dur: 3,
    note: 'The Rhodes shape: bell in the attack, sine underneath, long decay.',
    options: {
      harmonicity: 3,
      modulationIndex: 10,
      oscillator: { type: 'sine' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.002, decay: 1.2, sustain: 0.06, release: 1 },
      modulationEnvelope: { attack: 0.001, decay: 0.25, sustain: 0.01, release: 0.3 },
    } },
  stCeleste: { label: 'Celeste (starter)', category: 'Bells', kind: 'tone', synth: 'FMSynth', dur: 4,
    note: 'Small, high and pure, with a very long tail. Made for the twinkle lane.',
    options: {
      harmonicity: 7,
      modulationIndex: 4,
      oscillator: { type: 'sine' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.001, decay: 1.6, sustain: 0.01, release: 1.6 },
      modulationEnvelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.4 },
    } },
  stHatClosed: { label: 'Closed Hat (starter)', category: 'Hats', kind: 'noise', dur: 0.5,
    note: 'A very short highpassed tick. The cheapest sound in the library and the one you '
      + 'need most of.',
    noise: { type: 'highpass', freq: 7000, Q: 0.7, decay: 0.028 } },
  stHatOpen: { label: 'Open Hat (starter)', category: 'Hats', kind: 'noise', dur: 2,
    note: 'The same band left to ring for a third of a second.',
    noise: { type: 'highpass', freq: 6500, Q: 0.7, decay: 0.33 } },
  stDetuneBass: { label: 'Wide Detune (starter)', category: 'Bass', kind: 'tone', synth: 'DuoSynth', dur: 1.8,
    note: 'Two monosynths a few cents apart. Big, and the dearest bass here.',
    options: {
      harmonicity: 1.008,
      vibratoAmount: 0.02,
      vibratoRate: 3,
      voice0: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.008, decay: 0.2, sustain: 0.7, release: 0.3 } },
      voice1: { oscillator: { type: 'square' }, envelope: { attack: 0.012, decay: 0.2, sustain: 0.7, release: 0.3 } },
    } },
  stWarmPad: { label: 'Warm Pad (starter)', category: 'Pad', kind: 'tone', synth: 'MonoSynth', dur: 4,
    note: 'Saw behind a filter that opens slowly. The most ordinary pad there is, and it works.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.25, decay: 0.4, sustain: 0.8, release: 1.2 },
      filter: { type: 'lowpass', Q: 1, rolloff: -12 },
      filterEnvelope: { attack: 0.5, decay: 0.5, sustain: 0.7, release: 1, baseFrequency: 200, octaves: 2.6 },
    } },
  stDuoDetune: { label: 'Duo Detune (starter)', category: 'Lead', kind: 'tone', synth: 'DuoSynth', dur: 1.4,
    note: 'A detuned pair under a slow vibrato. The widest lead here, and two synths per note.',
    options: {
      harmonicity: 1.005,
      vibratoAmount: 0.12,
      vibratoRate: 5,
      voice0: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.02, decay: 0.2, sustain: 0.7, release: 0.4 } },
      voice1: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.03, decay: 0.2, sustain: 0.7, release: 0.4 } },
    } },
  stWoodBlock: { label: 'Wood Block (starter)', category: 'Perc', kind: 'tone', synth: 'FMSynth', dur: 0.6,
    note: 'A short knock with almost no tail. Good for rim, and for a tick that keeps time '
      + 'without taking up room.',
    options: {
      harmonicity: 4.5,
      modulationIndex: 14,
      oscillator: { type: 'sine' },
      modulation: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.06 },
      modulationEnvelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.03 },
    } },
  stTriangleDing: { label: 'Triangle (starter)', category: 'Perc', kind: 'tone', homeLane: 'tom', synth: 'MetalSynth', dur: 6,
    note: 'Very high, very thin, and rings for bars. One on a downbeat is plenty.',
    options: {
      harmonicity: 16,
      modulationIndex: 18,
      resonance: 9000,
      octaves: 0.6,
      envelope: { attack: 0.001, decay: 2.6, release: 2 },
    } },
  stGlassPad: { label: 'Glass Pad (starter)', category: 'Pad', kind: 'tone', synth: 'AMSynth', dur: 4,
    note: 'Ring modulation over a long swell — shimmering rather than warm.',
    options: {
      harmonicity: 3.01,
      oscillator: { type: 'sine' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.3, decay: 0.5, sustain: 0.7, release: 1.4 },
      modulationEnvelope: { attack: 0.6, decay: 0.4, sustain: 0.6, release: 1 },
    } },
  stMusicBox: { label: 'Music Box (starter)', category: 'Bells', kind: 'tone', synth: 'FMSynth', dur: 3,
    note: 'Thin, high and slightly sour, with the click of the comb in the attack.',
    options: {
      harmonicity: 6.03,
      modulationIndex: 7,
      oscillator: { type: 'sine' },
      modulation: { type: 'square' },
      envelope: { attack: 0.001, decay: 1, sustain: 0.01, release: 1 },
      modulationEnvelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.1 },
    } },
  stSnareFlam: { label: 'Flam Snare (starter)', category: 'Snare', kind: 'drum', dur: 1,
    note: 'Two strikes 22ms apart — the drummer’s flam, which reads as one hit with a thicker '
      + 'front.',
    noise: { type: 'bandpass', freq: 1600, to: 1150, sweep: 0.1, Q: 1.3, decay: 0.14, gain: 1 },
    metal: { wave: 'square', freq: 760, spread: 1, count: 6, hp: 3200, Q: 0.8, decay: 0.12, gain: 0.55 },
    taps: [0, 0.022], tapFalloff: 0.85 },
  stSynthStrings: { label: 'Synth Strings (starter)', category: 'Orch', kind: 'tone', synth: 'DuoSynth', dur: 4,
    note: 'The string-machine sound: two detuned saws, slow on, slow off.',
    options: {
      harmonicity: 1.006,
      vibratoAmount: 0.05,
      vibratoRate: 4,
      voice0: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.2, decay: 0.3, sustain: 0.85, release: 1 } },
      voice1: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.3, decay: 0.3, sustain: 0.85, release: 1.2 } },
    } },
  stReedLead: { label: 'Reed (starter)', category: 'Orch', kind: 'tone', synth: 'MonoSynth', dur: 1.6,
    note: 'Slow attack into a narrow filter — a clarinet-ish breath rather than a stab.',
    options: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.06, decay: 0.1, sustain: 0.8, release: 0.3 },
      filter: { type: 'lowpass', Q: 1, rolloff: -12 },
      filterEnvelope: { attack: 0.08, decay: 0.2, sustain: 0.6, release: 0.3, baseFrequency: 400, octaves: 2 },
    } },
  stHatSizzle: { label: 'Sizzle Hat (starter)', category: 'Hats', kind: 'tone', synth: 'MetalSynth', dur: 1.5,
    note: 'Higher resonance and a longer tail: a hat left slightly open, buzzing rather than '
      + 'ringing.',
    options: {
      harmonicity: 10,
      modulationIndex: 44,
      resonance: 7000,
      octaves: 1.8,
      envelope: { attack: 0.001, decay: 0.22, release: 0.16 },
    } },
  stFmGrowl: { label: 'FM Growl (starter)', category: 'Bass', kind: 'tone', synth: 'FMSynth', dur: 1.8,
    note: 'Modulated sine with a hard edge on the attack. Cuts through a busy kit.',
    options: {
      harmonicity: 1.5,
      modulationIndex: 6,
      oscillator: { type: 'sine' },
      modulation: { type: 'square' },
      envelope: { attack: 0.005, decay: 0.25, sustain: 0.5, release: 0.3 },
      modulationEnvelope: { attack: 0.002, decay: 0.18, sustain: 0.1, release: 0.2 },
    } },
  stAmOrgan: { label: 'AM Organ (starter)', category: 'Organ', kind: 'tone', synth: 'AMSynth', dur: 2.6,
    note: 'Held and slightly beating, the way an organ with two drawbars out is.',
    options: {
      harmonicity: 1,
      oscillator: { type: 'square' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.9, release: 0.35 },
      modulationEnvelope: { attack: 0.1, decay: 0.1, sustain: 0.8, release: 0.3 },
    } },
  stGlassLead: { label: 'Glass (starter)', category: 'Lead', kind: 'tone', synth: 'FMSynth', dur: 1.2,
    note: 'High harmonicity, short modulation — thin and clear, sits over a dense mix.',
    options: {
      harmonicity: 5,
      modulationIndex: 3,
      oscillator: { type: 'sine' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.004, decay: 0.2, sustain: 0.5, release: 0.3 },
      modulationEnvelope: { attack: 0.002, decay: 0.15, sustain: 0.1, release: 0.2 },
    } },
  stClapRoom: { label: 'Big Room Clap (starter)', category: 'Clap', kind: 'noise', dur: 1,
    note: 'Five bursts spread wider with a long tail on the last — a hall, not a booth. Wants '
      + 'space in the arrangement.',
    noise: { type: 'bandpass', freq: 1500, Q: 0.9, decay: 0.5, gain: 0.88 },
    taps: [0, 0.014, 0.037, 0.058, 0.083], tapFalloff: 0.89 },
  stTpBassy: { label: 'Bassy (starter)', category: 'Bass', kind: 'tone', synth: 'MonoSynth', dur: 1.8,
    note: 'Built from explicit partials rather than a waveform name, with a resonant lowpass '
      + 'over it. Fat and slightly hollow.',
    origin: 'Tonejs/Presets MonoSynth/Bassy',
    options: {
      portamento: 0.08,
      oscillator: { partials: [2, 1, 3, 2, 0.4] },
      filter: { Q: 4, type: 'lowpass', rolloff: -48 },
      envelope: { attack: 0.04, decay: 0.06, sustain: 0.4, release: 1 },
      filterEnvelope: { attack: 0.01, decay: 0.1, sustain: 0.6, release: 1.5, baseFrequency: 50, octaves: 3.4 },
    } },
  stTpPianoetta: { label: 'Pianoetta (starter)', category: 'Keys', kind: 'tone', synth: 'MonoSynth', dur: 2.2,
    note: 'A square through a gentle lowpass with a piano-ish decay. Toy upright rather than '
      + 'grand.',
    origin: 'Tonejs/Presets MonoSynth/Pianoetta',
    options: {
      oscillator: { type: 'square' },
      filter: { Q: 2, type: 'lowpass', rolloff: -12 },
      envelope: { attack: 0.005, decay: 3, sustain: 0, release: 0.45 },
      filterEnvelope: { attack: 0.001, decay: 0.32, sustain: 0.9, release: 3, baseFrequency: 700, octaves: 2.3 },
    } },
  stTpBah: { label: 'Bah (starter)', category: 'Lead', kind: 'tone', synth: 'MonoSynth', dur: 1.4,
    note: 'A bandpassed saw with a vowel in it — the filter sits where a voice’s formant '
      + 'would. Tone.js’s own preset.',
    origin: 'Tonejs/Presets MonoSynth/Bah',
    options: {
      oscillator: { type: 'sawtooth' },
      filter: { Q: 2, type: 'bandpass', rolloff: -24 },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.6 },
      filterEnvelope: { attack: 0.02, decay: 0.4, sustain: 1, release: 0.7, releaseCurve: 'linear', baseFrequency: 20, octaves: 5 },
    } },
  stKickDirty: { label: 'Dirty Kick (starter)', category: 'Kick', kind: 'tone', synth: 'MembraneSynth', dur: 1.2,
    note: 'A square body makes the drop buzz on the way down. Distorted without a distortion '
      + 'on it.',
    options: {
      pitchDecay: 0.05,
      octaves: 6,
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.3 },
    } },
  stClapTight: { label: 'Tight Clap (starter)', category: 'Clap', kind: 'noise', dur: 1,
    note: 'Three closer, shorter bursts. Reads as one hand rather than a room full.',
    noise: { type: 'bandpass', freq: 2400, Q: 2, decay: 0.055 },
    taps: [0, 0.008, 0.016], tapFalloff: 0.7 },
  stMetalHatClosed: { label: 'Closed Metal Hat (starter)', category: 'Hats', kind: 'tone', synth: 'MetalSynth', dur: 0.5,
    note: 'Short and bright. Six oscillators per hit, so it is not the cheap option at '
      + 'sixteenths.',
    options: {
      harmonicity: 12,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
      envelope: { attack: 0.001, decay: 0.05, release: 0.02 },
    } },
  stCowbell: { label: 'Cowbell (starter)', category: 'Perc', kind: 'tone', synth: 'MetalSynth', dur: 0.8,
    note: 'Two fixed partials and a fast decay. It is the 808 cowbell, and it is never subtle.',
    options: {
      harmonicity: 3.5,
      modulationIndex: 16,
      resonance: 2200,
      octaves: 0.6,
      envelope: { attack: 0.001, decay: 0.12, release: 0.08 },
    } },
  stAcidSquelch: { label: 'Acid Squelch (starter)', category: 'Bass', kind: 'tone', synth: 'MonoSynth', dur: 1.2,
    note: 'High resonance and a fast filter sweep — the 303 move. Short notes only.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.002, decay: 0.1, sustain: 0.3, release: 0.1 },
      filter: { type: 'lowpass', Q: 8, rolloff: -24 },
      filterEnvelope: { attack: 0.002, decay: 0.09, sustain: 0.1, release: 0.15, baseFrequency: 180, octaves: 4 },
    } },
  stBreathPad: { label: 'Breath (starter)', category: 'Orch', kind: 'tone', synth: 'DuoSynth', dur: 4.5,
    note: 'Two slightly detuned voices swelling together. Big and slow; expensive per note.',
    options: {
      harmonicity: 1.01,
      vibratoAmount: 0.08,
      vibratoRate: 2.5,
      voice0: { oscillator: { type: 'triangle' }, envelope: { attack: 0.35, decay: 0.4, sustain: 0.8, release: 1.4 } },
      voice1: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.5, decay: 0.4, sustain: 0.7, release: 1.6 } },
    } },
  stTpLectric: { label: 'Lectric (starter)', category: 'Lead', kind: 'tone', synth: 'Synth', dur: 1.4,
    note: 'Portamento of 0.2 means every note slides into the next. A lead that will not sit '
      + 'still.',
    origin: 'Tonejs/Presets Synth/Lectric',
    options: {
      portamento: 0.2,
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.03, decay: 0.1, sustain: 0.2, release: 0.02 },
    } },
  stKickClick: { label: 'Click Kick (starter)', category: 'Kick', kind: 'tone', synth: 'MembraneSynth', dur: 1,
    note: 'A square body makes the attack a knock rather than a thump. Reads on a phone '
      + 'speaker where a sub does not.',
    options: {
      pitchDecay: 0.03,
      octaves: 5,
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.3 },
    } },
  stClap808: { label: 'Clap (starter)', category: 'Clap', kind: 'noise', dur: 1,
    note: 'Four bursts a few milliseconds apart, each quieter than the last — which is all a '
      + 'clap is: one hit heard several times in a small room.',
    noise: { type: 'bandpass', freq: 1900, Q: 1.4, decay: 0.11 },
    taps: [0, 0.011, 0.023, 0.036], tapFalloff: 0.78 },
  stDsHatClosed: { label: 'DS Closed Hat (starter)', category: 'Hats', kind: 'drum', dur: 0.5,
    note: 'A resonant highpassed tick — sharper than the plain closed hat, closer to metal '
      + 'without being metal.',
    noise: { type: 'highpass', freq: 7800, Q: 1.2, decay: 0.032, gain: 1 } },
  stZap: { label: 'Zap (starter)', category: 'FX', kind: 'tone', synth: 'MembraneSynth', dur: 0.6,
    note: 'A pitch drop so fast it is heard as a click with a direction. Laser, or a very '
      + 'electronic rim.',
    options: {
      pitchDecay: 0.008,
      octaves: 8,
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.08 },
    } },
  stPadTriangle: { label: 'Triangle Pad (starter)', category: 'Pad', kind: 'tone', synth: 'Synth', dur: 3.2,
    note: 'Slow in, slow out. The attack is heard as an arrival, so it wants held sections.',
    options: {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.12, decay: 0.4, sustain: 0.7, release: 0.9 },
    } },
  stFmBell: { label: 'FM Bell (starter)', category: 'Bells', kind: 'tone', synth: 'FMSynth', dur: 1.2,
    note: 'Struck and metallic, decaying rather than held — a bell at long lengths.',
    options: {
      harmonicity: 3,
      modulationIndex: 8,
      oscillator: { type: 'sine' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.003, decay: 0.6, sustain: 0.05, release: 0.6 },
      modulationEnvelope: { attack: 0.002, decay: 0.35, sustain: 0.02, release: 0.4 },
    } },
  stAmHollow: { label: 'AM Hollow (starter)', category: 'Lead', kind: 'tone', synth: 'AMSynth', dur: 1.2,
    note: 'Ring-modulated and slightly out of tune with itself. Reads as a voice rather than a '
      + 'synth.',
    options: {
      harmonicity: 2,
      oscillator: { type: 'square' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.008, decay: 0.2, sustain: 0.6, release: 0.3 },
      modulationEnvelope: { attack: 0.05, decay: 0.2, sustain: 0.5, release: 0.3 },
    } },
};

export const VOICES = {};
for (const [id, v] of Object.entries(ENGINE)) VOICES[id] = { ...v, id, kind: 'engine', factory: true };
for (const [id, v] of Object.entries(TONE)) {
  VOICES[id] = { ...v, id, kind: 'tone', factory: true, level: LEVELS[id] ?? 0, peak: PEAKS[id] ?? 1 };
}
for (const [id, v] of Object.entries(NOISE)) {
  VOICES[id] = { ...v, id, kind: 'noise', factory: true, level: LEVELS[id] ?? 0, peak: PEAKS[id] ?? 1 };
}
for (const [id, v] of Object.entries(DRUM)) {
  VOICES[id] = { ...v, id, kind: 'drum', factory: true, level: LEVELS[id] ?? 0, peak: PEAKS[id] ?? 1 };
}
for (const [id, v] of Object.entries(USER_TONE)) {
  VOICES[id] = { ...v, id, kind: 'tone', user: true, level: LEVELS[id] ?? 0, peak: PEAKS[id] ?? 1 };
}
for (const [id, v] of Object.entries(USER_NOISE)) {
  VOICES[id] = { ...v, id, kind: 'noise', user: true, level: LEVELS[id] ?? 0, peak: PEAKS[id] ?? 1 };
}
for (const [id, v] of Object.entries(USER_DRUM)) {
  VOICES[id] = { ...v, id, kind: 'drum', user: true, level: LEVELS[id] ?? 0, peak: PEAKS[id] ?? 1 };
}
// Last, and marked. `starter` is what every guard tests: the picker leaves them off the
// menu, the editor refuses to open one, and the save route refuses to write one.
for (const [id, v] of Object.entries(STARTER)) {
  VOICES[id] = { ...v, id, starter: true, factory: true, level: LEVELS[id] ?? 0, peak: PEAKS[id] ?? 1 };
}

/**
 * Every voice offered on a lane. Lane-agnostic bar the few engine ones that cannot be.
 *
 * The whole LIBRARY, including quotations of songs nobody plays any more. Dropping
 * those needs the song registry, which this file deliberately does not import — see
 * the note over `quoted`, and `offeredVoices` in src/data/voices-in-play.js, which is
 * what the desk's picker actually asks.
 */
export function voicesFor(laneKey) {
  const seam = seamFor(laneKey);
  if (!seam) return [];
  const base = baseLane(laneKey);
  const layer = isLayer(laneKey);
  return Object.values(VOICES).filter((v) => {
    // A song's own copy is not in the library. It lives in one song's mix and is put
    // in the catalogue at play time so the engine can resolve it the one way it
    // resolves everything — see registerSongVoice. Offering it here would put another
    // song's private sound in this song's picker under a name it does not own.
    if (v.songLocal) return false;
    // A name for what the lane is already doing, and nothing to choose: the snare,
    // clap, hats and rim bodies read no bank keys at all, so this preset expands to
    // nothing and picking it would light the strip up as a decision that changed no
    // sound. It is in the catalogue to be READ — by defaultVoiceOf, and so by the
    // strip label and the picker's own `Engine default` row, which is already the way
    // back to exactly this.
    if (v.nameOnly) return false;
    // A frozen starter is a duplicate of a library preset that happens to be immune to
    // editing, so offering it would put two rows with the same sound and nearly the
    // same name in every picker in the desk. It is still RESOLVED, named on the strip
    // and — through `offeredVoices`'s `keep` — still shown as the thing a generated
    // song's lane is currently playing, which is the only place it needs to be seen.
    if (v.starter) return false;
    // An ENGINE preset is a bundle of the bank keys the hand-written voice reads, and
    // a layer has no hand-written body to read them — choosing one would be a strip
    // that says it plays a filtered saw and makes no sound at all. Layers take the
    // synth and noise presets only, which are played by the rack whatever the lane.
    if (layer && v.kind === 'engine') return false;
    if (v.lanes && !v.lanes.includes(base)) return false;
    // A waveform preset needs a key to write the waveform into, and two lanes have a
    // fixed timbre in the engine rather than a type key. Engine kind only: on a DRUM
    // preset `osc` is the oscillator section, not a waveform to merge onto the bank.
    if (v.kind === 'engine' && v.osc && !seam.typeKey) return false;
    return true;
  });
}

// What a lane most likely wants, first. Categories describe the sound, not the lane,
// so the order is only a guess about intent — but opening the kick's picker with the
// drums eleventh, off the right-hand edge, was a guess in the wrong direction.
const LANE_FIRST_CATEGORY = {
  bass: 'Bass', lead: 'Lead', leadHarm: 'Lead', chords: 'Keys',
  organChords: 'Organ', twinkle: 'Bells',
  kick: 'Kick', snare: 'Snare', clap: 'Clap',
  hats: 'Hats', ohats: 'Hats', rim: 'Perc', crash: 'Crash', tom: 'Tom',
};

/** The seven kit categories, which travel together in the picker. */
export const KIT_CATEGORIES = ['Kick', 'Snare', 'Hats', 'Clap', 'Tom', 'Crash', 'Perc'];

/** The seven kit categories are the drum boundary; special audition lanes are not. */
export function isKitVoice(voice) {
  return KIT_CATEGORIES.includes(voice?.category);
}

/**
 * Grouped for the picker: `[category, voices[]]`, empty categories dropped.
 *
 * The lane's own kind comes first — and on a drum lane the rest of the KIT follows
 * it, before the melodic categories. Splitting the drums into seven columns is only
 * an improvement if they stay next to each other: a kick strip that opened on Kick
 * and then put Snare eleventh, behind Pad and Organ, would be worse than the one
 * long column it replaced.
 */
export function voicesByCategory(laneKey) {
  const all = voicesFor(laneKey);
  const first = LANE_FIRST_CATEGORY[baseLane(laneKey)];
  let order = VOICE_CATEGORIES;
  if (first) {
    const kin = KIT_CATEGORIES.includes(first) ? KIT_CATEGORIES : [first];
    const front = [first, ...kin.filter((c) => c !== first)];
    order = [...front, ...VOICE_CATEGORIES.filter((c) => !front.includes(c))];
  }
  return order
    .map((c) => [c, all.filter((v) => v.category === c)])
    .filter(([, list]) => list.length);
}

/**
 * The voice a bank asks for on a lane, or null. An id that is not in the catalogue
 * returns null rather than throwing: a mix naming a preset that has since been
 * renamed should lose the preset, not take the game down on load.
 */
/**
 * Can this lane hold a CHORD — an array of frequencies on one step?
 *
 * Almost all of them can, and the ones that cannot are not about synthesis.
 *
 * There is nothing polyphonic about a voice here. `play()` in scheduleStep builds a
 * fresh oscillator per call and the rack allocates a slot per note, so two notes at once
 * on any channel is two calls — which is why pressing two keys on a lead has always
 * sounded like two notes. `twinkle` has called `play` twice for a single note since long
 * before chords existed.
 *
 * So the only question a lane has to answer is whether the code that reads its STEP
 * loops over what it finds. Every pitched lane's does. The exceptions:
 *
 *   PERCUSSION      a step is a boolean, not a pitch. There is no chord to hold.
 *   GESTURE lanes   gliss, sweeps, organSwoop and the rest build a node graph whose
 *                   timing is internal to the gesture. A step is the START of a shape
 *                   rather than a note, and two of them are not a chord. These are the
 *                   lanes the piano roll already declines to draw.
 *   vox / shout     a step selects a WORD, and the formant trajectory is keyed to it.
 *                   Two words at once is not a chord either.
 *
 * `bank` and `voiceId` are accepted and ignored, kept because callers pass what a lane
 * is voiced with and the honest answer no longer depends on it. It used to: while only
 * `chords` and `organChords` looped, whether a lane could hold a chord depended on
 * whether the rack or the hand-written body would play it — a distinction that was real
 * in the code and impossible to explain, since it did not match what you could hear
 * yourself play. The four hand-written pitched bodies loop now, so it is gone.
 */
export function polyLane(bank, laneKey, { voiceId = null } = {}) {
  const base = baseLane(laneKey);
  if (PERCUSSION_LANES.includes(base)) return false;
  return !MONO_LANES.includes(base);
}

export function voiceOf(bank, laneKey) {
  const seam = seamFor(laneKey);
  if (!seam || !bank) return null;
  const v = VOICES[bank[seam.voiceKey]];
  if (!v) return null;
  // A lane-restricted preset is judged on the lane it is really playing: `bass2` is
  // a copy of the bass part and takes the bass-only presets with it.
  if (v.lanes && !v.lanes.includes(baseLane(laneKey))) return null;
  // Same reason voicesFor hides them: an engine preset on a layer expands to bank
  // keys nothing reads, which is a voice that silently does nothing.
  if (v.kind === 'engine' && isLayer(laneKey)) return null;
  return v;
}

/**
 * The bank keys an ENGINE preset stands for, on a given lane. This is the whole of
 * the engine-preset mechanism: `applyMix` spreads the result onto the bank, and the
 * hand-written voice in scheduleStep reads exactly the keys it always read.
 */
export function engineBankKeys(voice, laneKey) {
  if (!voice || voice.kind !== 'engine') return null;
  const seam = VOICE_LANES[laneKey];
  const out = { ...(voice.bank || {}) };
  if (voice.osc && seam?.typeKey) out[seam.typeKey] = voice.osc;
  return out;
}

/**
 * A song's own copy of a preset, put into the catalogue so the engine can find it.
 *
 * A preset is library-wide: `voice: { bassVoice: 'roundMono' }` names one, and every
 * song naming it gets the same sound. That is right for a library and wrong for a
 * song that wants ITS bass a shade darker — the only way to have that was to change
 * roundMono for everybody. A song can now carry the whole preset in its own mix,
 * under `voiceParams`, keyed by the same voice key.
 *
 * The copy is COMPLETE, not a diff against the library entry. So a song sounds the
 * same next year whatever has happened to the preset it was copied from, which is the
 * point of it being the song's own — and resolving it needs no lookup that could miss.
 *
 * Registering it under an id, rather than teaching the lookups about a second kind of
 * voice, is what keeps this cheap: `voiceOf`, `voiceGain`, the voice rack and every
 * schedule-time read go on resolving `VOICES[bank[voiceKey]]` exactly as they always
 * have, and none of them needs to know the entry came from a song. The id is scoped
 * by song and lane because that is what it belongs to — two songs overriding the same
 * preset are two different sounds, and must not collide.
 *
 * Marked `songLocal` so `voicesFor` keeps it out of the library picker: it is in the
 * catalogue to be PLAYED, not to be offered.
 */
export const songVoiceId = (voiceKey, trackId) => `${voiceKey}@${trackId || 'song'}`;

/**
 * The voice key an id is a song copy FOR, or null if it is an ordinary library preset.
 *
 * Asked with the song in hand rather than parsed loose, because "is this a copy" and
 * "is this THIS song's copy" are different questions and only the second one is safe
 * to write a mix from: the desk holds a draft per song, and answering the first would
 * let one song's panel write into another song's voiceParams.
 */
export function songVoiceKey(id, trackId) {
  if (!id || !VOICES[id]?.songLocal) return null;
  const at = id.lastIndexOf('@');
  if (at < 0) return null;
  const key = id.slice(0, at);
  return songVoiceId(key, trackId) === id ? key : null;
}

export function registerSongVoice(voiceKey, trackId, params) {
  if (!voiceKey || !params) return null;
  // An engine preset is bank keys rather than a synth — there are no parameters to
  // carry, which is why the editor refuses to open one. A song copy of one would be
  // an entry that expands to nothing.
  const kind = params.kind || 'tone';
  if (kind === 'engine') return null;
  const id = songVoiceId(voiceKey, trackId);
  // Keep the provenance beside the song-local copy. The copy is always editable,
  // but a USER-origin copy may Update its source preset while a Library-origin copy
  // may only be saved as a new preset.
  const songOrigin = params.songOrigin || (params.factory && !params.user ? 'library' : 'user');
  const songSourceId = params.songSourceId || voiceKey;
  VOICES[id] = {
    ...params,
    id,
    kind,
    category: normalizeVoiceCategory(params),
    // Same guard voiceGain applies: the lane's target is DIVIDED by these, so a zero
    // is not a quiet preset, it is a division by zero. A copy saved before levels
    // existed carries no level at all, and passing that straight through is what lets
    // `voiceGain` recognise it and fall back to the peak it does have.
    level: params.level > 0 ? params.level : 0,
    peak: params.peak > 0 ? params.peak : 1,
    songLocal: true,
    user: true,
    factory: false,
    songOrigin,
    songSourceId,
    // A copy is the SONG's, and a song's copy is editable by definition — that is what
    // it is for. The desk makes one by deep-copying the catalogue entry, so a copy of a
    // frozen starter arrives still claiming to be one, and every guard that reads the
    // flag would refuse to let anyone touch a sound that belongs to one song.
    starter: false,
  };
  return id;
}

// ---- Naming what a lane already plays ---------------------------------------
//
// A lane with no voice chosen is not silent and it is not nameless — it plays the
// hand-written voice its bank describes, and two thirds of the time that is a sound
// this file already has a name for, because the engine presets were mined from these
// very banks. `Engine default` on a strip that is audibly the shop bass is a label
// withholding what it knows.
//
// This is a READ. It changes nothing, writes nothing, and is not a substitute for the
// default: an engine preset merges ONTO a bank rather than replacing it, so naming
// one in a mix is a different act from leaving the bank alone — see applyMix.

/**
 * Bank keys the engine only reads inside another key's branch.
 *
 * `bassRepeatDur` means nothing with `bassRepeat` at 0, and the shop bass carries one
 * — a leftover from an arrangement it no longer has. Comparing it would say the shop
 * bass is not Shop Bass over a number that cannot be heard. Each entry is a branch in
 * scheduleStep, not a guess: see `if (b.bassRepeat)`, `else if (b.bassFilteredSaw)`,
 * `else if (b.bass80s)`, `if (b.leadBright)` and `if (b.organPercussion)`.
 */
const GATED_BY = {
  bassRepeatDur: 'bassRepeat', bassRepeatGain: 'bassRepeat',
  bassFilterOpen: 'bassFilteredSaw', bassFilterClose: 'bassFilteredSaw',
  bassFilterQ: 'bassFilteredSaw', bassFilteredSawSubGain: 'bassFilteredSaw',
  bass80sBodyType: 'bass80s', bass80sBodyGain: 'bass80s',
  leadBrightGain: 'leadBright',
  organPercussionDur: 'organPercussion', organPercussionGain: 'organPercussion',
};

/**
 * What the engine plays where the bank says nothing.
 *
 * Every key here is a `??` in scheduleStep — `const tail = b.kickTail ?? 0.2` — so a
 * bank omitting it and a bank spelling it out are the same sound, and the strip has to
 * call them the same name in both directions. Without this the arcade kit could not be
 * written down at all: a preset stating the engine's own tail would match no untuned
 * bank, and one stating nothing would match no tuned-to-default bank.
 *
 * Only keys an engine preset speaks about need to be here — nothing else reaches the
 * comparison. Filling a blank can only ever ADD a name: it turns an absent value into
 * the value the lane is already making, which is the one answer that cannot be wrong.
 */
const ENGINE_DEFAULTS = {
  kickTail: 0.2, kickKnock: 1,          // audio.js: `b.kickTail ?? 0.2`, `b.kickKnock ?? 1`
  tomDur: 0.28,                         // `b.tomDur ?? 0.28`
  crashDur: 5, crashOpen: 9000, crashClose: 1100,
};

// Off, absent and zero are one state to the engine — `b.bassRepeat` and `b.leadBright`
// are read as truth, and a bank that spells out `bass80s: false` says what a bank
// omitting it says.
const same = (a, b) => (a || null) === (b || null);

// The bank keys the engine presets can speak about ON THIS LANE. Derived from the
// presets themselves so a new one widens the vocabulary on its own, then held to the
// lane's own prefix — `engBright` carries no `lanes` list but its key is `leadBright`,
// which only the lead branch reads, and without the prefix a song with a bright lead
// would look like a bass nobody can name. Memoised: the picker asks once per strip.
const PRESET_KEYS = new Map();
function presetKeys(laneKey) {
  if (!PRESET_KEYS.has(laneKey)) {
    // Every seam names its own keys, so the prefix comes from the data rather than
    // from a second list to keep in step: bassDur → bass, harmDur → harm.
    const prefix = VOICE_LANES[laneKey].durKey.replace(/Dur$/, '');
    const keys = new Set();
    for (const v of Object.values(VOICES)) {
      if (v.kind !== 'engine') continue;
      if (v.lanes && !v.lanes.includes(laneKey)) continue;
      for (const k of Object.keys(engineBankKeys(v, laneKey))) if (k.startsWith(prefix)) keys.add(k);
    }
    PRESET_KEYS.set(laneKey, keys);
  }
  return PRESET_KEYS.get(laneKey);
}

/**
 * What the lane's waveform key means when the bank is silent about it.
 *
 * `square`, because that is what scheduleStep reads: `b.bassType || 'square'` and
 * `b.harmType || b.leadType || 'square'`. It matters most where there is least — an
 * imported .mid arrives as notes and a bpm with no timbre keys at all, so every one
 * of its lanes IS the arcade square, and saying so is the whole point of this.
 */
function effectiveType(bank, laneKey) {
  const seam = VOICE_LANES[laneKey];
  if (!seam.typeKey) return undefined;
  if (laneKey === 'leadHarm') return bank.harmType || bank.leadType || 'square';
  return bank[seam.typeKey] || 'square';
}

/**
 * The views of a bank this lane is actually played through.
 *
 * A section spreads over the bank at schedule time, so a song can change a lane's
 * timbre halfway: the hub's bass is a square in some sections and a saw in others, and
 * the bank on its own says nothing about the bass at all. One view per section where
 * that happens, and the caller only names the lane if they all agree — a strip labelled
 * `Square` on a song half of which plays a saw would be worse than the label it
 * replaced. Banks whose sections leave the lane alone — most of them — are one view,
 * and cost one object.
 */
function bankViews(bank, vocab, laneKey) {
  const secs = Array.isArray(bank.sections) ? bank.sections : null;
  if (!secs || !secs.some((s) => s && Object.keys(s).some((k) => vocab.has(k)))) return [bank];
  // `sections: null` so a view is a leaf: it is the bank as one section sees it, and
  // asking it for its own sections would be the same question forever.
  const views = secs.filter(Boolean).map((s) => ({ ...bank, ...s, sections: null }));
  // A section the lane is SILENT in has no opinion about what the lane sounds like.
  //
  // The megamix is the case that found this. Its lead plays a triangle with its own
  // gain, attack and length in every section that has notes — Megamix Lead, exactly —
  // and holds an empty lane in the six that do not. Those six name no timbre keys, so
  // they read as the arcade square, and six sounds nobody can hear outvoted the
  // twenty-six you can. The strip said ENGINE about a song with one lead in it.
  //
  // So a view only counts where the lane has something to play. A lane silent in every
  // section keeps the whole set rather than none: it plays nothing anywhere, and the
  // bank is as good an answer as there is.
  const heard = views.filter((v) => plays(v[laneKey]));
  return heard.length ? heard : views;
}

// A step that makes a sound. Melodic lanes hold frequencies or chords and rest as
// `null`; percussion holds booleans, where the rest is `false`. Both also rest by
// being absent, which is what an empty lane in a section looks like.
const plays = (steps) => Array.isArray(steps) && steps.some((s) => s != null && s !== false);

// A bank is a constant the desk holds for as long as the song is open, and the strip
// asks this on every repaint. Weak, so an imported song that is registered, mixed and
// forgotten does not leave its answers behind.
const NAMED = new WeakMap();

/**
 * The engine preset a lane is ALREADY playing with nothing chosen, or null.
 *
 * A match has to be exact in both directions — every key the preset sets is what the
 * bank has, and every key the bank sets that a preset could have set is one this
 * preset sets. Half a name is worse than none: a strip labelled `Filtered Saw` whose
 * bank also opens the filter to 1100 is telling you about a sound you are not
 * hearing. Where nothing matches exactly the answer is null and the strip goes on
 * saying `ENGINE`, which is true of every bank ever written.
 *
 * Of the 149 melodic lanes the 35 registered songs actually play, this names 101. The
 * rest are banks tuned past every preset — usually by one number, an attack or a
 * length — and those are what the next preset gets mined from.
 *
 * Their 127 drum lanes name 127, which is a different fact rather than a better one:
 * the arcade kit is eight presets covering the untuned kit itself, so a drum lane can
 * only go unnamed where a song has tuned one past them, and none has.
 *
 * Layers get null: they have no hand-written body to read bank keys at all.
 */
export function defaultVoiceOf(bank, laneKey) {
  const seam = VOICE_LANES[laneKey];
  if (!bank || !seam) return null;
  let byLane = NAMED.get(bank);
  if (byLane?.has(laneKey)) return byLane.get(laneKey);
  const found = resolveDefault(bank, laneKey, seam);
  if (!byLane) NAMED.set(bank, byLane = new Map());
  byLane.set(laneKey, found);
  return found;
}

function resolveDefault(bank, laneKey, seam) {
  // A bank may name a preset outright — `leadVoice: 'musicBox'`. That IS what the lane
  // plays with nothing chosen (voiceOf reads the same key at schedule time), so it is
  // the answer, and looking for an engine preset that matches the bank's other keys
  // would label the strip after a sound it is not making. Generated scratch songs are
  // the first banks to do this: a style pack writes its instruments into the
  // composition, and the desk has to read them back.
  const named = VOICES[bank[seam.voiceKey]];
  if (named && !named.songLocal && !(named.lanes && !named.lanes.includes(laneKey))) return named;

  const vocab = presetKeys(laneKey);
  const views = bankViews(bank, vocab, laneKey);
  if (views.length > 1) {
    const first = defaultVoiceOf(views[0], laneKey);
    return views.every((v) => defaultVoiceOf(v, laneKey) === first) ? first : null;
  }
  // One view, and not the bank itself: every section but one is silent here, so that
  // section IS the lane — the finale's crash, which sounds once in the whole song and
  // is lengthened where it does. Matching the bank instead would compare against keys
  // the only audible section overrides. Terminates: a view carries `sections: null`.
  if (views[0] !== bank) return defaultVoiceOf(views[0], laneKey);
  const typed = effectiveType(bank, laneKey);
  for (const v of Object.values(VOICES)) {
    if (v.kind !== 'engine') continue;
    if (v.lanes && !v.lanes.includes(laneKey)) continue;
    // Same rule the picker offers them by: a waveform preset needs a key to write the
    // waveform into, and the twinkle and organ have a fixed timbre in the engine. Left
    // in, they expand to nothing on those lanes and would match anything at all.
    if (v.osc && !seam.typeKey) continue;
    const keys = engineBankKeys(v, laneKey);
    // The preset's own keys, plus anything the bank says that a preset could have
    // said. Without the second half every bank matches the emptiest preset.
    const both = new Set([...Object.keys(keys), ...Object.keys(bank).filter((k) => vocab.has(k))]);
    let hit = true;
    for (const k of both) {
      // The preset merges onto the bank, so where it sets a gate the gate is its own.
      const gate = GATED_BY[k];
      if (gate && !(keys[gate] ?? bank[gate])) continue;
      // Both sides through the same fallback the engine reads them through, so an
      // unset key is compared as the sound it actually makes rather than as a blank.
      const mine = k === seam.typeKey ? typed : (bank[k] ?? ENGINE_DEFAULTS[k]);
      if (!same(keys[k] ?? ENGINE_DEFAULTS[k], mine)) { hit = false; break; }
    }
    if (hit) return v;
  }
  return null;
}
