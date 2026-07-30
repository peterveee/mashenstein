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
 * Returns null for a lane with no seam at all — the glisses, sweeps and vocal
 * one-shots, which are bespoke gestures in the engine rather than a note played by a
 * voice. Those cannot be layered either: a layer with no voice is silence.
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
 * A Tone synth's own peak for the same note is not a constant — measured through the
 * render pipeline, a Synth reaches 0.99, a MonoSynth 0.92, a DuoSynth 1.56, an
 * FMSynth 0.32 and an AMSynth 0.19 — so a hand-written gain would mean five different
 * loudnesses. Each preset carries its MEASURED peak instead and the level is derived:
 * scale it so it lands where that lane's own voice lands.
 *
 * Peak-matching is a starting point, not a mix — a pad and a stab at the same peak
 * are not equally loud. It puts a new sound on the fader near where the old one was,
 * so choosing one is a musical decision and not a scramble for the level.
 */
export function voiceGain(voice, laneKey) {
  // A layer aims at the same place its source lane does — it is the same part, and
  // the point of the level being derived is that a new sound lands near where the
  // one beside it sits rather than at whatever its own peak happens to be.
  const target = LANE_TARGETS[baseLane(laneKey)];
  if (!target) return 0;
  const peak = voice.peak > 0 ? voice.peak : 1;
  return target / peak;
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
  snareCrisp: { label: 'Snare', category: 'Snares', dur: 1,
    note: 'The engine’s own snare as a preset: a bright noise band, a short decay and '
      + 'a hint of body. The one every song already uses.',
    noise: { type: 'bandpass', freq: 2600, Q: 0.7, decay: 0.09 },
    body: { type: 'triangle', from: 210, to: 140, decay: 0.06, gain: 0.375 } },
  snareFat: { label: 'Fat Snare', category: 'Snares', dur: 1,
    note: 'Lower band, longer tail and much more body — a snare that carries a '
      + 'backbeat on its own rather than sitting on top of one.',
    noise: { type: 'bandpass', freq: 1700, Q: 0.5, decay: 0.16 },
    body: { type: 'triangle', from: 180, to: 110, decay: 0.11, gain: 0.6 } },
  snareTight: { label: 'Tight Snare', category: 'Snares', dur: 1,
    note: 'Gated: cut off almost before it starts. Sits under a busy hat pattern '
      + 'without smearing it.',
    noise: { type: 'bandpass', freq: 3200, Q: 1.1, decay: 0.045 },
    body: { type: 'triangle', from: 240, to: 170, decay: 0.03, gain: 0.3 } },
  snareBrush: { label: 'Brush', category: 'Snares', dur: 1,
    note: 'All air and no crack — a highpassed sweep with no body at all. The quiet '
      + 'backbeat for the lounge themes.',
    noise: { type: 'highpass', freq: 4200, Q: 0.4, decay: 0.13 } },
  snareRim: { label: 'Rimshot', category: 'Snares', dur: 1,
    note: 'Narrow, high and instant, with a hard pitched knock. The stick rather '
      + 'than the skin.',
    noise: { type: 'bandpass', freq: 5000, Q: 3, decay: 0.03 },
    body: { type: 'square', from: 420, to: 320, decay: 0.02, gain: 0.5 } },

  clap808: { label: 'Clap', category: 'Claps', dur: 1,
    note: 'Four bursts a few milliseconds apart, each quieter than the last — which '
      + 'is all a clap is: one hit heard several times in a small room.',
    noise: { type: 'bandpass', freq: 1900, Q: 1.4, decay: 0.11 },
    taps: [0, 0.011, 0.023, 0.036], tapFalloff: 0.78 },
  clapTight: { label: 'Tight Clap', category: 'Claps', dur: 1,
    note: 'Three closer, shorter bursts. Reads as one hand rather than a room full.',
    noise: { type: 'bandpass', freq: 2400, Q: 2, decay: 0.055 },
    taps: [0, 0.008, 0.016], tapFalloff: 0.7 },
  clapRoom: { label: 'Big Room Clap', category: 'Claps', dur: 1,
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
  shaker: { label: 'Shaker', category: 'Percussion', dur: 0.5,
    note: 'A soft band with no attack to speak of. Sixteenths of this sit under '
      + 'anything without competing.',
    noise: { type: 'bandpass', freq: 6000, Q: 1.1, decay: 0.06 } },
  tambourine: { label: 'Tambourine', category: 'Percussion', dur: 1,
    note: 'Bright, jangly and slightly longer, with a touch of pitch in it.',
    noise: { type: 'highpass', freq: 5200, Q: 0.6, decay: 0.14 },
    body: { type: 'square', from: 900, to: 780, decay: 0.05, gain: 0.12 } },
  noiseSweep: { label: 'Noise Hit', category: 'Rough & Electric', dur: 2,
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
  dsKick: { label: 'DS Kick', category: 'Kicks', dur: 1,
    note: 'The drum-synth 808: a sine dropping an octave and a half into a long sub '
      + 'tail, with a filtered click on the front and a little drive to round it.',
    osc: { type: 'sine', from: 165, to: 48, sweep: 0.045, decay: 0.45, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 3200, Q: 0.7, decay: 0.015, gain: 0.4 },
    drive: 0.2 },
  dsKickHard: { label: 'DS Hard Kick', category: 'Kicks', dur: 1,
    note: 'Faster drop, shorter tail, and pushed hard into the shaper — the kick for '
      + 'a mix where the soft one disappears.',
    osc: { type: 'sine', from: 230, to: 55, sweep: 0.03, decay: 0.22, curve: 'exp', gain: 1 },
    noise: { type: 'bandpass', freq: 1100, Q: 1, decay: 0.018, gain: 0.6 },
    drive: 0.55 },
  dsSnare: { label: 'DS Snare', category: 'Snares', dur: 1,
    note: 'The two-source snare: a triangle knock falling a fourth under a wide band '
      + 'of noise that rings a little longer than the body does.',
    osc: { type: 'triangle', from: 210, to: 165, sweep: 0.04, decay: 0.11, curve: 'exp', gain: 0.7 },
    noise: { type: 'bandpass', freq: 2100, Q: 0.8, decay: 0.17, gain: 1 },
    drive: 0.18 },
  dsSnareCrack: { label: 'DS Crack Snare', category: 'Snares', dur: 1,
    note: 'Tight and driven: a short square knock, highpassed air, everything over '
      + 'in a tenth of a second. The backbeat for fast songs.',
    osc: { type: 'square', from: 255, to: 200, sweep: 0.025, decay: 0.05, curve: 'exp', gain: 0.55 },
    noise: { type: 'highpass', freq: 2900, Q: 0.8, decay: 0.085, gain: 1 },
    drive: 0.35 },
  dsClap: { label: 'DS Clap', category: 'Claps', dur: 1,
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
  dsShaker: { label: 'DS Shaker', category: 'Percussion', dur: 0.5,
    note: 'The one drum here with an ATTACK: the noise fades in over twenty '
      + 'milliseconds, which is the whole difference between a shaker and a hat.',
    noise: { type: 'bandpass', freq: 6300, Q: 1.4, attack: 0.018, decay: 0.05, gain: 1 } },
  dsTom: { label: 'DS Tom', category: 'Percussion', dur: 1,
    note: 'A sine falling an octave over a tenth of a second with a soft lowpassed '
      + 'skin sound on the front. Tune it with the lane note key.',
    osc: { type: 'sine', from: 220, to: 105, sweep: 0.11, decay: 0.32, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 1400, Q: 0.7, decay: 0.03, gain: 0.18 },
    drive: 0.12 },
  dsRim: { label: 'DS Rim', category: 'Percussion', dur: 0.5,
    note: 'A driven square knock and a narrow band of air, both gone in thirty milliseconds. '
      + 'The stick sound the engine’s rim approximates, synthesised.',
    osc: { type: 'square', from: 460, to: 635, sweep: 0.012, decay: 0.12, curve: 'exp', gain: 0.13 },
    noise: { type: 'bandpass', freq: 4300, Q: 2.2, decay: 0.235, gain: 0.44 },
    drive: 0.24 },
  dsZap: { label: 'DS Zap', category: 'Rough & Electric', dur: 1,
    note: 'A sawtooth falling five octaves in under a tenth of a second, driven — '
      + 'the laser tom every drum synth ships and every second track uses once.',
    osc: { type: 'sawtooth', from: 1900, to: 50, sweep: 0.085, decay: 0.1, curve: 'exp', gain: 1 },
    drive: 0.5 },
  dsCrackSnare2: { label: 'DS Crack Snare 2', category: 'Snares', dur: 1,
    note: 'Tight and driven: a short square knock, highpassed air, everything over in a tenth '
      + 'of a second. The backbeat for fast songs.',
    osc: { type: 'square', from: 255, to: 440, sweep: 0.025, decay: 0.05, curve: 'exp', gain: 0.55 },
    noise: { type: 'highpass', freq: 2900, Q: 0.8, decay: 0.3, gain: 1 },
    drive: 0.35 },
  dsClosedHat2: { label: 'DS Closed Hat 2', category: 'Hats', dur: 0.5,
    note: 'A resonant highpassed tick — sharper than the plain closed hat, closer to metal '
      + 'without being metal.',
    noise: { type: 'highpass', freq: 7800, Q: 1.6, decay: 0.305, gain: 1 } },
};

// Measured, by tools/measure-voices.js — do not hand-edit either block.
//
// LANE_TARGETS is the peak ONE note of that lane's own hand-written voice reaches
// through the render pipeline; PEAKS is the peak one note of each preset reaches at
// unity. `voiceGain` divides one by the other, so a preset arrives where the voice it
// replaces arrived. Per note, deliberately: a chord sums, and it sums the same way
// for both, so a per-chord target would come out three times too loud.
const LANE_TARGETS = {
  bass: 0.2118, lead: 0.1251, leadHarm: 0.0834, twinkle: 0.0365, chords: 0.1115,
  organChords: 0.034, kick: 0.3315, snare: 0.1615, clap: 0.1627, rim: 0.1977,
  hats: 0.1127, ohats: 0.1147, crash: 0.1357, tom: 0.1824
};

// Categories, in picker order. Sound type, not lane — see the note at the top.
export const VOICE_CATEGORIES = [
  'Basses', 'Leads', 'Keys', 'Pads', 'Organs', 'Bells & Mallets',
  'Plucks', 'Brass & Strings', 'Rough & Electric',
  // The kit, split by what a drum IS rather than lumped together: at twenty-nine
  // entries one "Drums" column was a list you had to read, where five are lists you
  // can glance at — and the lane you opened puts its own kind first.
  'Kicks', 'Snares', 'Claps', 'Hats', 'Percussion',
];

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
const ENGINE = {
  engSquare: { label: 'Square', category: 'Leads', osc: 'square',
    note: 'The arcade default — what most lanes play if nothing says otherwise.' },
  engSaw: { label: 'Sawtooth', category: 'Leads', osc: 'sawtooth',
    note: 'Brighter and harsher, all harmonics present. The Speed Zone lead.' },
  engTriangle: { label: 'Triangle', category: 'Leads', osc: 'triangle',
    note: 'Soft and hollow, almost a flute. Frost Fortress and Crypt Shift.' },
  engSine: { label: 'Sine', category: 'Keys', osc: 'sine',
    note: 'One harmonic and nothing else. Disappears in a busy mix, which is '
      + 'sometimes exactly the job.' },
  engFilteredSaw: {
    label: 'Filtered Saw', category: 'Basses', lanes: ['bass'],
    bank: { bassFilteredSaw: true },
    note: 'Saw through a resonant lowpass that shuts as the note decays. Bright '
      + 'edge, round body, quiet sine sub underneath.',
  },
  engFilteredSawOpen: {
    label: 'Filtered Saw, Open', category: 'Basses', lanes: ['bass'],
    bank: { bassFilteredSaw: true, bassFilterOpen: 2200, bassFilterClose: 520, bassFilterQ: 1.6 },
    note: 'The same, with the filter opening further and resonating harder — more '
      + 'growl, less weight.',
  },
  eng80s: {
    label: '80s Bass', category: 'Basses', lanes: ['bass'],
    bank: { bass80s: true },
    note: 'Square body, sine sub, and a real octave layer above — built to survive '
      + 'a phone speaker that cannot reproduce the fundamental.',
  },
  eng80sSaw: {
    label: '80s Bass, Saw', category: 'Basses', lanes: ['bass'],
    bank: { bass80s: true, bass80sBodyType: 'sawtooth' },
    note: 'The same construction with a sawtooth body: harder, more front.',
  },
  engBright: {
    label: 'Bright Octave', category: 'Leads',
    bank: { leadBright: true },
    note: 'The lane’s own waveform with a quiet octave sine laid on top. Adds air '
      + 'without changing the character underneath.',
  },
  engDrawbar: {
    label: 'Drawbar Organ', category: 'Organs', lanes: ['organChords'],
    bank: {},
    note: 'Sine partials at 8′, 4′, 2⅔′, 2′ and 1⅓′ — the organ lane’s own voice.',
  },
  engDrawbarBright: {
    label: 'Drawbar Organ, Bright', category: 'Organs', lanes: ['organChords'],
    bank: { organBright: true },
    note: 'The upper drawbars pulled further out. Cuts through where the soft '
      + 'registration sits under everything.',
  },
  engDrawbarPerc: {
    label: 'Drawbar + Percussion', category: 'Organs', lanes: ['organChords'],
    bank: { organPercussion: true },
    note: 'Hammond-style key-attack pip on the third harmonic, kept dry so repeated '
      + 'off-beat stabs stay crisp.',
  },

  // ---- The songs' own voicings --------------------------------------------
  // Mined from the banks: these are the sounds tuned by ear over the project, which
  // until now could only be had by copying keys out of cabinets.js. Named for where
  // they come from. Levels are deliberately absent — a preset is a timbre, and the
  // fader is where a level belongs.
  engTitleBass: { label: 'Title Bass', category: 'Basses', lanes: ['bass'],
    bank: { bassType: 'sine', bassAttack: 0.18, bassDur: 7.4 },
    note: 'The nocturne bass from the title theme: a sine so slow to arrive it is felt '
      + 'before it is heard, and it holds for most of two bars.' },
  engFinaleBass: { label: 'Finale Bass', category: 'Basses', lanes: ['bass'],
    bank: { bassType: 'square', bassAttack: 0.001, bassDur: 0.95 },
    note: 'Short, hard and square — the house-arrangement bass from the finale, one '
      + 'note per step with no overlap.' },
  engFinaleBassRepeat: { label: 'Finale Bass, Ghosted', category: 'Basses', lanes: ['bass'],
    bank: { bassType: 'sawtooth', bassDur: 3.2, bassRepeat: 3, bassRepeatDur: 0.7, bassRepeatGain: 0.38 },
    note: 'Sawtooth with a written-in slapback three steps later — a delay locked to '
      + 'the grid, with no tail. The finale’s lift.' },
  engMegamixBass: { label: 'Megamix Bass', category: 'Basses', lanes: ['bass'],
    bank: {
      bassFilteredSaw: true, bassFilterOpen: 820, bassFilterClose: 260, bassFilterQ: 0.9,
      bassFilteredSawSubGain: 0.21, bassEcho: false,
    },
    note: 'The filtered saw dialled darker and rounder than default, with the sub '
      + 'brought up. Holds a mix together under everything else in the megamix.' },
  engShopBass: { label: 'Shop Bass', category: 'Basses', lanes: ['bass'],
    bank: {
      bassFilteredSaw: true, bassFilterOpen: 1100, bassFilterClose: 310, bassFilterQ: 1.1,
      bassFilteredSawSubGain: 0.22, bassType: 'sine', bassAttack: 0.003, bassDur: 1.08, bassEcho: false,
    },
    note: 'The shop theme’s filtered saw: brighter than the megamix’s and shorter, so '
      + 'it bounces rather than sustains.' },
  engLoungeBass: { label: 'Lounge Bass', category: 'Basses', lanes: ['bass'],
    bank: { bassType: 'triangle', bassDur: 1.25 },
    note: 'Soft triangle, no filter, one note per beat. Dolores’ counter music.' },
  engWalkingBass: { label: 'Walking Bass', category: 'Basses', lanes: ['bass'],
    bank: { bassType: 'sine', bassDur: 1.85, bassRepeat: 3, bassRepeatDur: 0.55, bassRepeatGain: 0.22 },
    note: 'Sine with a quiet ghost note three steps behind — the shuffle in Gary’s '
      + 'pawn-shop themes.' },
  engBright80sBass: { label: '80s Bass, Shop', category: 'Basses', lanes: ['bass'],
    bank: { bass80s: true, bassType: 'triangle', bassAttack: 0.003, bassDur: 0.94, bassRepeat: 0 },
    note: 'The 80s stack with a triangle body and a very short note — the bright-organ '
      + 'shop auditions.' },

  engTitleLead: { label: 'Title Lead', category: 'Leads', lanes: ['lead'],
    bank: { leadType: 'sine', leadAttack: 0.16, leadDur: 5.5 },
    note: 'A sine that swells in over a sixth of a second and holds. The title theme, '
      + 'remembered from an empty arcade.' },
  engFinaleLead: { label: 'Finale Lead', category: 'Leads', lanes: ['lead'],
    bank: { leadType: 'sawtooth', leadAttack: 0.006, leadDur: 1.7 },
    note: 'Sawtooth, fast attack, overlapping notes. The finale’s hook.' },
  engMegamixLead: { label: 'Megamix Lead', category: 'Leads', lanes: ['lead'],
    bank: { leadType: 'triangle', leadAttack: 0.008, leadDur: 1.25 },
    note: 'Triangle with a little length on it — soft enough to sit inside a mix '
      + 'carrying every other cabinet at once.' },
  engShopLead: { label: 'Shop Lead', category: 'Leads', lanes: ['lead'],
    bank: { leadType: 'triangle', leadAttack: 0.012, leadBright: true, leadBrightGain: 0.16, leadDur: 1.55 },
    note: 'Triangle with the octave-sine brightener on top: the shop’s lead, which '
      + 'needs air to read over the organ.' },
  engCounterLead: { label: 'Counter Lead', category: 'Leads', lanes: ['lead'],
    bank: { leadType: 'triangle', leadAttack: 0.006, leadDur: 0.82 },
    note: 'Short triangle stabs — Dolores’ side of the shop auditions.' },

  engTitleHarm: { label: 'Title Harmony', category: 'Leads', lanes: ['leadHarm'],
    bank: { harmType: 'triangle', harmAttack: 0.28, harmDur: 6.2 },
    note: 'The slowest voice in the game: a triangle taking more than a quarter of a '
      + 'second to arrive, under the title lead.' },
  engSineHarm: { label: 'Sine Harmony', category: 'Leads', lanes: ['leadHarm'],
    bank: { harmType: 'sine', harmDur: 1.35 },
    note: 'A plain sine third. Adds width to a lead without adding harmonics to fight '
      + 'with it — the shop themes’ partner voice.' },

  engTitleChords: { label: 'Title Chords', category: 'Pads', lanes: ['chords'],
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

  engShopOrgan: { label: 'Shop Organ', category: 'Organs', lanes: ['organChords'],
    bank: {
      organBright: true, organPercussion: true, organAttack: 0.004, organDur: 1.02,
      organEcho: false, organPercussionDur: 0.52, organPercussionGain: 0.9,
    },
    note: 'Bright drawbars, key-click percussion, short and dry. The shop theme’s '
      + 'organ, and the most worked-on sound in the game.' },
  engLayawayOrgan: { label: 'Layaway Organ', category: 'Organs', lanes: ['organChords'],
    bank: {
      organBright: true, organPercussion: true, organAttack: 0.002, organDur: 0.58,
      organEcho: false, organPercussionDur: 0.34, organPercussionGain: 0.82,
    },
    note: 'The same registration cut much shorter — chops rather than chords.' },
  engHeldOrgan: { label: 'Held Organ', category: 'Organs', lanes: ['organChords'],
    bank: { organAttack: 0.045, organDur: 7.4, organEcho: true },
    note: 'Soft drawbars held across two bars, with the echo on. The organ as a bed '
      + 'rather than a rhythm part.' },

  engTitleTwinkle: { label: 'Title Twinkle', category: 'Bells & Mallets', lanes: ['twinkle'],
    bank: { twinkleAttack: 0.06, twinkleDur: 7 },
    note: 'Long, soft and slow to arrive. The title theme’s dissolving high end.' },
  engShopTwinkle: { label: 'Shop Twinkle', category: 'Bells & Mallets', lanes: ['twinkle'],
    bank: { twinkleAttack: 0.003, twinkleDur: 0.62 },
    note: 'Short and immediate — a ping rather than a shimmer.' },

  engShopKick: { label: 'Shop Kick', category: 'Kicks', lanes: ['kick'],
    bank: { kickTail: 0.15, kickKnock: 0.5 },
    note: 'The engine’s 808 with the sub ring shortened and the front knock up, so a '
      + 'busy bar does not become one long boom. The shop and Gary themes.' },
  engCounterKick: { label: 'Counter Kick', category: 'Kicks', lanes: ['kick'],
    bank: { kickTail: 0.12, kickKnock: 0.38 },
    note: 'Shorter still and softer on the front — Dolores’ themes, where the kick '
      + 'keeps time rather than carrying weight.' },
  engMegamixKick: { label: 'Megamix Kick', category: 'Kicks', lanes: ['kick'],
    bank: { kickTail: 0.13, kickKnock: 0.56 },
    note: 'The hardest front of the three, and a short tail: it has to cut through '
      + 'every other cabinet playing at once.' },
  engFinaleCrash: { label: 'Finale Crash', category: 'Percussion', lanes: ['crash'],
    bank: { crashDur: 7 },
    note: 'The long crash from the finale — near two bars of decay, where the engine’s '
      + 'default is a short splash.' },
};

// Tone presets. `options` goes to the class constructor verbatim — Tone's own docs
// are the reference. `peak` is measured (tools/measure-voices.js); `dur` is a note
// length in 16th steps, and the envelope's release rings on past it.
const TONE = {
  // ---- Basses -------------------------------------------------------------
  roundMono: { label: 'Round Mono 2', category: 'Basses', synth: 'MonoSynth', dur: 1.8,
    note: 'Saw through a lowpass that closes as the note decays — the classic synth bass.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.001, decay: 1.24, sustain: 0.29, release: 0.8 },
      filter: { type: 'lowpass', Q: 2.9, rolloff: -24 },
      filterEnvelope: { attack: 0.001, decay: 1.22, sustain: 0.13, release: 0.3, baseFrequency: 110, octaves: 3.9 },
    } },
  fmGrowl: { label: 'FM Growl', category: 'Basses', synth: 'FMSynth', dur: 1.8,
    note: 'Modulated sine with a hard edge on the attack. Cuts through a busy kit.',
    options: {
      harmonicity: 1.5, modulationIndex: 6,
      oscillator: { type: 'sine' }, modulation: { type: 'square' },
      envelope: { attack: 0.005, decay: 0.25, sustain: 0.5, release: 0.3 },
      modulationEnvelope: { attack: 0.002, decay: 0.18, sustain: 0.1, release: 0.2 },
    } },
  subSine: { label: 'Sub Sine', category: 'Basses', synth: 'Synth', dur: 2.2,
    note: 'Pure weight, no harmonics. Wants room underneath it and a lead up top.',
    options: { oscillator: { type: 'sine' }, envelope: { attack: 0.012, decay: 0.3, sustain: 0.8, release: 0.4 } } },
  acidSquelch: { label: 'Acid Squelch', category: 'Basses', synth: 'MonoSynth', dur: 1.2,
    note: 'High resonance and a fast filter sweep — the 303 move. Short notes only.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.002, decay: 0.1, sustain: 0.3, release: 0.1 },
      filter: { type: 'lowpass', Q: 8, rolloff: -24 },
      filterEnvelope: { attack: 0.002, decay: 0.09, sustain: 0.1, release: 0.15, baseFrequency: 180, octaves: 4 },
    } },
  rubberBass: { label: 'Rubber', category: 'Basses', synth: 'MonoSynth', dur: 1.6,
    note: 'Triangle through a soft filter with a slow-ish attack. Bounces rather than punches.',
    options: {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.6, release: 0.3 },
      filter: { type: 'lowpass', Q: 3, rolloff: -12 },
      filterEnvelope: { attack: 0.03, decay: 0.2, sustain: 0.3, release: 0.3, baseFrequency: 100, octaves: 2.4 },
    } },
  clangBass: { label: 'Clang', category: 'Basses', synth: 'FMSynth', dur: 1.4,
    note: 'Inharmonic FM — metal in the attack, pitch underneath. Reads as industrial.',
    options: {
      harmonicity: 3.01, modulationIndex: 12,
      oscillator: { type: 'square' }, modulation: { type: 'sawtooth' },
      envelope: { attack: 0.002, decay: 0.3, sustain: 0.2, release: 0.2 },
      modulationEnvelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
    } },
  detuneBass: { label: 'Wide Detune', category: 'Basses', synth: 'DuoSynth', dur: 1.8,
    note: 'Two monosynths a few cents apart. Big, and the dearest bass here.',
    options: {
      harmonicity: 1.008, vibratoAmount: 0.02, vibratoRate: 3,
      voice0: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.008, decay: 0.2, sustain: 0.7, release: 0.3 } },
      voice1: { oscillator: { type: 'square' }, envelope: { attack: 0.012, decay: 0.2, sustain: 0.7, release: 0.3 } },
    } },

  // ---- Leads --------------------------------------------------------------
  monoBright: { label: 'Bright Mono', category: 'Leads', synth: 'MonoSynth', dur: 1.2,
    note: 'Square through an opening filter: the arcade lead with an envelope the raw oscillator cannot give it.',
    options: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.004, decay: 0.15, sustain: 0.6, release: 0.2 },
      filter: { type: 'lowpass', Q: 2, rolloff: -12 },
      filterEnvelope: { attack: 0.002, decay: 0.12, sustain: 0.4, release: 0.25, baseFrequency: 600, octaves: 3.2 },
    } },
  amHollow: { label: 'AM Hollow', category: 'Leads', synth: 'AMSynth', dur: 1.2,
    note: 'Ring-modulated and slightly out of tune with itself. Reads as a voice rather than a synth.',
    options: {
      harmonicity: 2,
      oscillator: { type: 'square' }, modulation: { type: 'sine' },
      envelope: { attack: 0.008, decay: 0.2, sustain: 0.6, release: 0.3 },
      modulationEnvelope: { attack: 0.05, decay: 0.2, sustain: 0.5, release: 0.3 },
    } },
  duoDetune: { label: 'Duo Detune', category: 'Leads', synth: 'DuoSynth', dur: 1.4,
    note: 'A detuned pair under a slow vibrato. The widest lead here, and two synths per note.',
    options: {
      harmonicity: 1.005, vibratoAmount: 0.12, vibratoRate: 5,
      voice0: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.02, decay: 0.2, sustain: 0.7, release: 0.4 } },
      voice1: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.03, decay: 0.2, sustain: 0.7, release: 0.4 } },
    } },
  glassLead: { label: 'Glass', category: 'Leads', synth: 'FMSynth', dur: 1.2,
    note: 'High harmonicity, short modulation — thin and clear, sits over a dense mix.',
    options: {
      harmonicity: 5, modulationIndex: 3,
      oscillator: { type: 'sine' }, modulation: { type: 'sine' },
      envelope: { attack: 0.004, decay: 0.2, sustain: 0.5, release: 0.3 },
      modulationEnvelope: { attack: 0.002, decay: 0.15, sustain: 0.1, release: 0.2 },
    } },
  reedLead: { label: 'Reed', category: 'Brass & Strings', synth: 'MonoSynth', dur: 1.6,
    note: 'Slow attack into a narrow filter — a clarinet-ish breath rather than a stab.',
    options: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.06, decay: 0.1, sustain: 0.8, release: 0.3 },
      filter: { type: 'lowpass', Q: 1, rolloff: -12 },
      filterEnvelope: { attack: 0.08, decay: 0.2, sustain: 0.6, release: 0.3, baseFrequency: 400, octaves: 2 },
    } },
  screamLead: { label: 'Scream', category: 'Rough & Electric', synth: 'MonoSynth', dur: 1.2,
    note: 'Resonance up near self-oscillation. Unsubtle on purpose.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.003, decay: 0.1, sustain: 0.7, release: 0.2 },
      filter: { type: 'lowpass', Q: 12, rolloff: -24 },
      filterEnvelope: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.2, baseFrequency: 800, octaves: 3 },
    } },
  vibratoLead: { label: 'Vibrato Voice', category: 'Leads', synth: 'DuoSynth', dur: 1.8,
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
  toyPiano: { label: 'Toy Piano', category: 'Bells & Mallets', synth: 'FMSynth', dur: 2,
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

  // ---- Pads ---------------------------------------------------------------
  padTriangle: { label: 'Triangle Pad', category: 'Pads', synth: 'Synth', dur: 3.2,
    note: 'Slow in, slow out. The attack is heard as an arrival, so it wants held sections.',
    options: { oscillator: { type: 'triangle' }, envelope: { attack: 0.12, decay: 0.4, sustain: 0.7, release: 0.9 } } },
  warmPad: { label: 'Warm Pad', category: 'Pads', synth: 'MonoSynth', dur: 4,
    note: 'Saw behind a filter that opens slowly. The most ordinary pad there is, and it works.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.25, decay: 0.4, sustain: 0.8, release: 1.2 },
      filter: { type: 'lowpass', Q: 1, rolloff: -12 },
      filterEnvelope: { attack: 0.5, decay: 0.5, sustain: 0.7, release: 1, baseFrequency: 200, octaves: 2.6 },
    } },
  glassPad: { label: 'Glass Pad', category: 'Pads', synth: 'AMSynth', dur: 4,
    note: 'Ring modulation over a long swell — shimmering rather than warm.',
    options: {
      harmonicity: 3.01,
      oscillator: { type: 'sine' }, modulation: { type: 'sine' },
      envelope: { attack: 0.3, decay: 0.5, sustain: 0.7, release: 1.4 },
      modulationEnvelope: { attack: 0.6, decay: 0.4, sustain: 0.6, release: 1 },
    } },
  breathPad: { label: 'Breath', category: 'Pads', synth: 'DuoSynth', dur: 4.5,
    note: 'Two slightly detuned voices swelling together. Big and slow; expensive per note.',
    options: {
      harmonicity: 1.01, vibratoAmount: 0.08, vibratoRate: 2.5,
      voice0: { oscillator: { type: 'triangle' }, envelope: { attack: 0.35, decay: 0.4, sustain: 0.8, release: 1.4 } },
      voice1: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.5, decay: 0.4, sustain: 0.7, release: 1.6 } },
    } },

  // ---- Organs -------------------------------------------------------------
  amOrgan: { label: 'AM Organ', category: 'Organs', synth: 'AMSynth', dur: 2.6,
    note: 'Held and slightly beating, the way an organ with two drawbars out is.',
    options: {
      harmonicity: 1,
      oscillator: { type: 'square' }, modulation: { type: 'sine' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.9, release: 0.35 },
      modulationEnvelope: { attack: 0.1, decay: 0.1, sustain: 0.8, release: 0.3 },
    } },
  fullOrgan: { label: 'Full Organ', category: 'Organs', synth: 'FMSynth', dur: 3,
    note: 'All stops out: harmonically dense and completely flat in level, like a key held down.',
    options: {
      harmonicity: 2, modulationIndex: 2,
      oscillator: { type: 'square' }, modulation: { type: 'square' },
      envelope: { attack: 0.01, decay: 0.01, sustain: 1, release: 0.2 },
      modulationEnvelope: { attack: 0.01, decay: 0.01, sustain: 1, release: 0.2 },
    } },
  reedOrgan: { label: 'Reed Organ', category: 'Organs', synth: 'MonoSynth', dur: 3,
    note: 'A wheezier, narrower organ — harmonium rather than Hammond.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.04, decay: 0.05, sustain: 0.95, release: 0.3 },
      filter: { type: 'bandpass', Q: 2, rolloff: -12 },
      filterEnvelope: { attack: 0.05, decay: 0.1, sustain: 0.8, release: 0.3, baseFrequency: 500, octaves: 1.5 },
    } },

  // ---- Bells & Mallets ----------------------------------------------------
  fmBell: { label: 'FM Bell', category: 'Bells & Mallets', synth: 'FMSynth', dur: 1.2,
    note: 'Struck and metallic, decaying rather than held — a bell at long lengths.',
    options: {
      harmonicity: 3, modulationIndex: 8,
      oscillator: { type: 'sine' }, modulation: { type: 'sine' },
      envelope: { attack: 0.003, decay: 0.6, sustain: 0.05, release: 0.6 },
      modulationEnvelope: { attack: 0.002, decay: 0.35, sustain: 0.02, release: 0.4 },
    } },
  celeste: { label: 'Celeste', category: 'Bells & Mallets', synth: 'FMSynth', dur: 4,
    note: 'Small, high and pure, with a very long tail. Made for the twinkle lane.',
    options: {
      harmonicity: 7, modulationIndex: 4,
      oscillator: { type: 'sine' }, modulation: { type: 'sine' },
      envelope: { attack: 0.001, decay: 1.6, sustain: 0.01, release: 1.6 },
      modulationEnvelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.4 },
    } },
  marimba: { label: 'Marimba', category: 'Bells & Mallets', synth: 'FMSynth', dur: 1.4,
    note: 'Wooden and short. The mallet is the whole sound; there is no sustain to speak of.',
    options: {
      harmonicity: 4, modulationIndex: 3,
      oscillator: { type: 'sine' }, modulation: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.35 },
      modulationEnvelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
    } },
  tubularBell: { label: 'Tubular Bell', category: 'Bells & Mallets', synth: 'MetalSynth', dur: 4,
    note: 'Metal partials, long ring. Loud and inharmonic — one per bar is plenty.',
    options: {
      harmonicity: 5.1, modulationIndex: 20, resonance: 3000, octaves: 1.2,
      envelope: { attack: 0.001, decay: 1.8, release: 1.2 },
    } },
  musicBox: { label: 'Music Box', category: 'Bells & Mallets', synth: 'FMSynth', dur: 3,
    note: 'Thin, high and slightly sour, with the click of the comb in the attack.',
    options: {
      harmonicity: 6.03, modulationIndex: 7,
      oscillator: { type: 'sine' }, modulation: { type: 'square' },
      envelope: { attack: 0.001, decay: 1, sustain: 0.01, release: 1 },
      modulationEnvelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.1 },
    } },

  // ---- Plucks -------------------------------------------------------------
  synthPluck: { label: 'Synth Pluck', category: 'Plucks', synth: 'MonoSynth', dur: 0.9,
    note: 'Filter slams shut immediately. Short, bright, and gone.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.18 },
      filter: { type: 'lowpass', Q: 4, rolloff: -24 },
      filterEnvelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1, baseFrequency: 300, octaves: 4 },
    } },
  harpPluck: { label: 'Harp', category: 'Plucks', synth: 'Synth', dur: 2,
    note: 'A triangle with no sustain at all — the string is let go the moment it is struck.',
    options: { oscillator: { type: 'triangle' }, envelope: { attack: 0.002, decay: 0.7, sustain: 0, release: 0.7 } } },
  koto: { label: 'Koto', category: 'Plucks', synth: 'FMSynth', dur: 1.6,
    note: 'Bright inharmonic pluck with a fast decay. Reads as a struck string.',
    options: {
      harmonicity: 2.51, modulationIndex: 9,
      oscillator: { type: 'triangle' }, modulation: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.5, sustain: 0.02, release: 0.4 },
      modulationEnvelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.15 },
    } },

  // ---- Brass & Strings ----------------------------------------------------
  brassStab: { label: 'Brass Stab', category: 'Brass & Strings', synth: 'MonoSynth', dur: 1.4,
    note: 'Filter rises through the note the way a horn section leans into one.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.03, decay: 0.15, sustain: 0.7, release: 0.2 },
      filter: { type: 'lowpass', Q: 2, rolloff: -12 },
      filterEnvelope: { attack: 0.12, decay: 0.2, sustain: 0.7, release: 0.2, baseFrequency: 300, octaves: 3 },
    } },
  synthStrings: { label: 'Synth Strings', category: 'Brass & Strings', synth: 'DuoSynth', dur: 4,
    note: 'The string-machine sound: two detuned saws, slow on, slow off.',
    options: {
      harmonicity: 1.006, vibratoAmount: 0.05, vibratoRate: 4,
      voice0: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.2, decay: 0.3, sustain: 0.85, release: 1 } },
      voice1: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.3, decay: 0.3, sustain: 0.85, release: 1.2 } },
    } },
  hornSwell: { label: 'Horn Swell', category: 'Brass & Strings', synth: 'FMSynth', dur: 3,
    note: 'Slow crescendo with the harmonics arriving after the fundamental, as a brass note does.',
    options: {
      harmonicity: 1, modulationIndex: 5,
      oscillator: { type: 'sawtooth' }, modulation: { type: 'sine' },
      envelope: { attack: 0.15, decay: 0.2, sustain: 0.8, release: 0.5 },
      modulationEnvelope: { attack: 0.4, decay: 0.3, sustain: 0.7, release: 0.4 },
    } },

  // ---- Rough & Electric ---------------------------------------------------
  buzzSaw: { label: 'Buzz Saw', category: 'Rough & Electric', synth: 'MonoSynth', dur: 1.2,
    note: 'Filter wide open, no envelope on it. Raw, and deliberately unmusical.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0.9, release: 0.1 },
      filter: { type: 'highpass', Q: 1, rolloff: -12 },
      filterEnvelope: { attack: 0.001, decay: 0.05, sustain: 1, release: 0.1, baseFrequency: 80, octaves: 0.2 },
    } },
  metalHit: { label: 'Metal Hit', category: 'Rough & Electric', synth: 'MetalSynth', dur: 1,
    note: 'Clang with no pitch centre worth speaking of. Percussion that follows the notes.',
    options: {
      harmonicity: 12, modulationIndex: 32, resonance: 800, octaves: 1.5,
      envelope: { attack: 0.001, decay: 0.3, release: 0.2 },
    } },
  drumTone: { label: 'Drum Tone', category: 'Rough & Electric', synth: 'MembraneSynth', dur: 1,
    note: 'A pitched drum — the note bends down into a thud. Tuned toms from a melody line.',
    options: {
      pitchDecay: 0.05, octaves: 4,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.4 },
    } },
  ringMod: { label: 'Ring Mod', category: 'Rough & Electric', synth: 'AMSynth', dur: 1.4,
    note: 'Inharmonic ring modulation — the pitch is in there but so is a second one.',
    options: {
      harmonicity: 2.47,
      oscillator: { type: 'sawtooth' }, modulation: { type: 'square' },
      envelope: { attack: 0.004, decay: 0.2, sustain: 0.6, release: 0.3 },
      modulationEnvelope: { attack: 0.004, decay: 0.2, sustain: 0.6, release: 0.3 },
    } },
  hardFm: { label: 'Hard FM', category: 'Rough & Electric', synth: 'FMSynth', dur: 1.2,
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
  kickDeep: { label: 'Deep Kick', category: 'Kicks', synth: 'MembraneSynth', dur: 3,
    note: 'A long, slow pitch drop into a sub that outlasts the bar. One per phrase, '
      + 'or it turns the low end to mud.',
    options: { pitchDecay: 0.12, octaves: 8, oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 1.1, sustain: 0, release: 1 } } },
  kickPunch: { label: 'Punch Kick', category: 'Kicks', synth: 'MembraneSynth', dur: 1.2,
    note: 'Triangle body and a fast drop — more middle than an 808, so it survives '
      + 'a mix with a busy bass under it.',
    options: { pitchDecay: 0.025, octaves: 5, oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.28, sustain: 0, release: 0.25 } } },
  kickDirty: { label: 'Dirty Kick', category: 'Kicks', synth: 'MembraneSynth', dur: 1.2,
    note: 'A square body makes the drop buzz on the way down. Distorted without a '
      + 'distortion on it.',
    options: { pitchDecay: 0.05, octaves: 6, oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.3 } } },
  kickThud: { label: 'Thud', category: 'Kicks', synth: 'MembraneSynth', dur: 1,
    note: 'Barely any pitch movement — a dull knock rather than a boom. Sits under '
      + 'a mix instead of leading it.',
    options: { pitchDecay: 0.01, octaves: 1.5, oscillator: { type: 'sine' },
      envelope: { attack: 0.002, decay: 0.2, sustain: 0, release: 0.18 } } },

  snareFm: { label: 'FM Snare', category: 'Snares', synth: 'FMSynth', dur: 1,
    note: 'High modulation index and a fast decay: enough inharmonic clatter to read '
      + 'as a snare without a grain of noise in it.',
    options: { harmonicity: 3.7, modulationIndex: 28,
      oscillator: { type: 'square' }, modulation: { type: 'sawtooth' },
      envelope: { attack: 0.001, decay: 0.14, sustain: 0, release: 0.12 },
      modulationEnvelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.06 } } },
  snareTrash: { label: 'Trash Snare', category: 'Snares', synth: 'MetalSynth', dur: 1.4,
    note: 'Dense, ringing and slightly too long. Industrial — it wants a slow tempo '
      + 'and a lot of space.',
    options: { harmonicity: 6.4, modulationIndex: 40, resonance: 1200, octaves: 2,
      envelope: { attack: 0.001, decay: 0.3, release: 0.2 } } },
  snareFlam: { label: 'Flam Snare', category: 'Snares', synth: 'MetalSynth', dur: 1,
    note: 'Two strikes 22ms apart — the drummer’s flam, which reads as one hit with '
      + 'a thicker front.',
    options: { harmonicity: 8, modulationIndex: 22, resonance: 1600, octaves: 1.4,
      envelope: { attack: 0.001, decay: 0.14, release: 0.1 } },
    taps: [0, 0.022], tapFalloff: 0.85 },

  clapMetal: { label: 'Metal Clap', category: 'Claps', synth: 'MetalSynth', dur: 1,
    note: 'The clap shape — four strikes a few milliseconds apart — on struck metal '
      + 'instead of noise. Harder and more electronic than the real thing.',
    options: { harmonicity: 9, modulationIndex: 26, resonance: 2400, octaves: 1.2,
      envelope: { attack: 0.001, decay: 0.09, release: 0.06 } },
    taps: [0, 0.012, 0.025, 0.038], tapFalloff: 0.76 },
  clapFm: { label: 'FM Clap', category: 'Claps', synth: 'FMSynth', dur: 1,
    note: 'Three short FM cracks in quick succession. Drier than the metal clap and '
      + 'easier to fit under a vocal.',
    options: { harmonicity: 5.1, modulationIndex: 20,
      oscillator: { type: 'sine' }, modulation: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.07, sustain: 0, release: 0.05 },
      modulationEnvelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.03 } },
    taps: [0, 0.01, 0.021], tapFalloff: 0.74 },

  hatTick: { label: 'Metal Tick', category: 'Hats', synth: 'MetalSynth', dur: 0.5,
    note: 'The shortest thing in the library — a metallic tick with no ring at all.',
    options: { harmonicity: 14, modulationIndex: 36, resonance: 6000, octaves: 1,
      envelope: { attack: 0.001, decay: 0.02, release: 0.01 } } },
  hatSizzle: { label: 'Sizzle Hat', category: 'Hats', synth: 'MetalSynth', dur: 1.5,
    note: 'Higher resonance and a longer tail: a hat left slightly open, buzzing '
      + 'rather than ringing.',
    options: { harmonicity: 10, modulationIndex: 44, resonance: 7000, octaves: 1.8,
      envelope: { attack: 0.001, decay: 0.22, release: 0.16 } } },

  conga: { label: 'Conga', category: 'Percussion', synth: 'MembraneSynth', dur: 1.2,
    note: 'A tuned hand drum: enough pitch left in it to play a line rather than '
      + 'keep time.',
    options: { pitchDecay: 0.06, octaves: 1.4, oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.25 } } },
  taiko: { label: 'KW Blip', category: 'Percussion', synth: 'MembraneSynth', dur: 2.4,
    note: 'Like a kraftwerk percussion blip',
    options: {
      pitchDecay: 0.037,
      octaves: 6.3,
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.001, decay: 0.16, sustain: 0, release: 0.3 },
    } },
  clave: { label: 'Clave', category: 'Percussion', synth: 'FMSynth', dur: 0.6,
    note: 'A hard, high, completely dry click with a pitch to it. Cuts through '
      + 'anything at almost no level.',
    options: { harmonicity: 3.02, modulationIndex: 8,
      oscillator: { type: 'sine' }, modulation: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.04 },
      modulationEnvelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.02 } } },
  agogo: { label: 'Agogo', category: 'Percussion', synth: 'MetalSynth', dur: 1.4,
    note: 'A struck bell with two clear partials and a medium ring — a cowbell with '
      + 'better manners.',
    options: { harmonicity: 4.2, modulationIndex: 12, resonance: 3200, octaves: 0.9,
      envelope: { attack: 0.001, decay: 0.24, release: 0.18 } } },
  triangleDing: { label: 'Triangle', category: 'Percussion', synth: 'MetalSynth', dur: 6,
    note: 'Very high, very thin, and rings for bars. One on a downbeat is plenty.',
    options: { harmonicity: 16, modulationIndex: 18, resonance: 9000, octaves: 0.6,
      envelope: { attack: 0.001, decay: 2.6, release: 2 } } },
  buzzRoll: { label: 'Buzz Roll', category: 'Percussion', synth: 'MetalSynth', dur: 1,
    note: 'Six strikes across a sixteenth, dying away — a drag, or a machine failing '
      + 'to start.',
    options: { harmonicity: 7, modulationIndex: 24, resonance: 2000, octaves: 1.3,
      envelope: { attack: 0.001, decay: 0.05, release: 0.04 } },
    taps: [0, 0.008, 0.016, 0.024, 0.032, 0.04], tapFalloff: 0.84 },
  // ---- Drums & Percussion -------------------------------------------------
  // Struck at the lane's own note (VOICE_LANES), because a drum lane holds booleans.
  // All oscillator-based: see the note by VOICE_CATEGORIES for why none of these
  // hiss. They go on a melodic lane perfectly well, and a tuned kick following a
  // bass line is a real sound rather than a mistake.
  kick808: { label: '808 Kick', category: 'Kicks', synth: 'MembraneSynth', dur: 2,
    note: 'Sine with a deep pitch drop into a long sub. The 808, which is what the '
      + 'engine’s own kick is modelled on.',
    options: {
      pitchDecay: 0.05, octaves: 6,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.5 },
    } },
  kickTight: { label: 'Tight Kick', category: 'Kicks', synth: 'MembraneSynth', dur: 1,
    note: 'The same shape with the tail cut short — for a busy bar where a long '
      + 'boom would smear into the next hit.',
    options: {
      pitchDecay: 0.02, octaves: 4,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.16, sustain: 0, release: 0.16 },
    } },
  kickClick: { label: 'Click Kick', category: 'Kicks', synth: 'MembraneSynth', dur: 1,
    note: 'A square body makes the attack a knock rather than a thump. Reads on a '
      + 'phone speaker where a sub does not.',
    options: {
      pitchDecay: 0.03, octaves: 5,
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.3 },
    } },
  tom: { label: 'Tom', category: 'Percussion', synth: 'MembraneSynth', dur: 1.6,
    note: 'A shallower pitch drop leaves the note audible — a drum you can write a '
      + 'melody on.',
    options: {
      pitchDecay: 0.1, octaves: 2,
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.4 },
    } },
  metalSnare: { label: 'Metal Snare', category: 'Snares', synth: 'MetalSynth', dur: 1,
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
  metalCrash: { label: 'Metal Crash', category: 'Percussion', synth: 'MetalSynth', dur: 6,
    note: 'Long, dense and loud. One per section, not one per bar.',
    options: {
      harmonicity: 5.1, modulationIndex: 40, resonance: 3000, octaves: 2,
      envelope: { attack: 0.001, decay: 2.4, release: 1.6 },
    } },
  cowbell: { label: 'Cowbell', category: 'Percussion', synth: 'MetalSynth', dur: 0.8,
    note: 'Two fixed partials and a fast decay. It is the 808 cowbell, and it is '
      + 'never subtle.',
    options: {
      harmonicity: 3.5, modulationIndex: 16, resonance: 2200, octaves: 0.6,
      envelope: { attack: 0.001, decay: 0.12, release: 0.08 },
    } },
  woodBlock: { label: 'Wood Block', category: 'Percussion', synth: 'FMSynth', dur: 0.6,
    note: 'A short knock with almost no tail. Good for rim, and for a tick that '
      + 'keeps time without taking up room.',
    options: {
      harmonicity: 4.5, modulationIndex: 14,
      oscillator: { type: 'sine' }, modulation: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.06 },
      modulationEnvelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.03 },
    } },
  zap: { label: 'Zap', category: 'Percussion', synth: 'MembraneSynth', dur: 0.6,
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
  tpBah: { label: 'Bah', category: 'Leads', synth: 'MonoSynth', dur: 1.4,
    note: "A bandpassed saw with a vowel in it — the filter sits where a voice’s formant would. Tone.js’s own preset.",
    origin: "Tonejs/Presets MonoSynth/Bah",
    options: {"oscillator":{"type":"sawtooth"},"filter":{"Q":2,"type":"bandpass","rolloff":-24},"envelope":{"attack":0.01,"decay":0.1,"sustain":0.2,"release":0.6},"filterEnvelope":{"attack":0.02,"decay":0.4,"sustain":1,"release":0.7,"releaseCurve":"linear","baseFrequency":20,"octaves":5}} },
  tpBassGuitar: { label: 'Bass Guitar', category: 'Basses', synth: 'MonoSynth', dur: 1.8,
    note: "An FM square through a lowpass, voiced to sit where a plucked electric bass sits.",
    origin: "Tonejs/Presets MonoSynth/BassGuitar",
    options: {"oscillator":{"type":"fmsquare5","modulationType":"triangle","modulationIndex":2,"harmonicity":0.501},"filter":{"Q":1,"type":"lowpass","rolloff":-24},"envelope":{"attack":0.01,"decay":0.1,"sustain":0.4,"release":2},"filterEnvelope":{"attack":0.01,"decay":0.1,"sustain":0.8,"release":1.5,"baseFrequency":50,"octaves":4.4}} },
  tpBassy: { label: 'Bassy', category: 'Basses', synth: 'MonoSynth', dur: 1.8,
    note: "Built from explicit partials rather than a waveform name, with a resonant lowpass over it. Fat and slightly hollow.",
    origin: "Tonejs/Presets MonoSynth/Bassy",
    options: {"portamento":0.08,"oscillator":{"partials":[2,1,3,2,0.4]},"filter":{"Q":4,"type":"lowpass","rolloff":-48},"envelope":{"attack":0.04,"decay":0.06,"sustain":0.4,"release":1},"filterEnvelope":{"attack":0.01,"decay":0.1,"sustain":0.6,"release":1.5,"baseFrequency":50,"octaves":3.4}} },
  tpBrassCircuit: { label: 'Brass Circuit', category: 'Brass & Strings', synth: 'MonoSynth', dur: 1.6,
    note: "A slow filter swell over a saw — the horn-section lean, done with an envelope.",
    origin: "Tonejs/Presets MonoSynth/BrassCircuit",
    options: {"portamento":0.01,"oscillator":{"type":"sawtooth"},"filter":{"Q":2,"type":"lowpass","rolloff":-24},"envelope":{"attack":0.1,"decay":0.1,"sustain":0.6,"release":0.5},"filterEnvelope":{"attack":0.05,"decay":0.8,"sustain":0.4,"release":1.5,"baseFrequency":2000,"octaves":1.5}} },
  tpCoolGuy: { label: 'Cool Guy', category: 'Leads', synth: 'MonoSynth', dur: 1.4,
    note: "Pulse-width modulation: the waveform’s duty cycle moves under the note, which reads as chorus without one.",
    origin: "Tonejs/Presets MonoSynth/CoolGuy",
    options: {"oscillator":{"type":"pwm","modulationFrequency":1},"filter":{"Q":6,"rolloff":-24},"envelope":{"attack":0.025,"decay":0.3,"sustain":0.9,"release":2},"filterEnvelope":{"attack":0.245,"decay":0.131,"sustain":0.5,"release":2,"baseFrequency":20,"octaves":7.2,"exponent":2}} },
  tpPianoetta: { label: 'Pianoetta', category: 'Keys', synth: 'MonoSynth', dur: 2.2,
    note: "A square through a gentle lowpass with a piano-ish decay. Toy upright rather than grand.",
    origin: "Tonejs/Presets MonoSynth/Pianoetta",
    options: {"oscillator":{"type":"square"},"filter":{"Q":2,"type":"lowpass","rolloff":-12},"envelope":{"attack":0.005,"decay":3,"sustain":0,"release":0.45},"filterEnvelope":{"attack":0.001,"decay":0.32,"sustain":0.9,"release":3,"baseFrequency":700,"octaves":2.3}} },
  tpPizz: { label: 'Pizz', category: 'Plucks', synth: 'MonoSynth', dur: 0.8,
    note: "Highpassed and cut off immediately — pizzicato strings, all attack and no body.",
    origin: "Tonejs/Presets MonoSynth/Pizz",
    options: {"oscillator":{"type":"sawtooth"},"filter":{"Q":3,"type":"highpass","rolloff":-12},"envelope":{"attack":0.01,"decay":0.3,"sustain":0,"release":0.9},"filterEnvelope":{"attack":0.01,"decay":0.1,"sustain":0,"release":0.1,"baseFrequency":800,"octaves":-1.2}} },
  tpAlienChorus: { label: 'Alien Chorus', category: 'Pads', synth: 'Synth', dur: 4,
    note: "Ten detuned sines spread across sixty cents. Enormous, and the dearest preset in the library by some way.",
    origin: "Tonejs/Presets Synth/AlienChorus",
    options: {"oscillator":{"type":"fatsine4","spread":60,"count":10},"envelope":{"attack":0.4,"decay":0.01,"sustain":1,"attackCurve":"sine","releaseCurve":"sine","release":0.4}} },
  tpDelicateWind: { label: 'Delicate Wind Part', category: 'Pads', synth: 'Synth', dur: 5,
    note: "Two full seconds of attack. Not a note so much as a slow arrival — it needs a held section to be heard at all.",
    origin: "Tonejs/Presets Synth/DelicateWindPart",
    options: {"portamento":0,"oscillator":{"type":"square4"},"envelope":{"attack":2,"decay":1,"sustain":0.2,"release":2}} },
  tpDropPulse: { label: 'Drop Pulse', category: 'Plucks', synth: 'Synth', dur: 0.9,
    note: "A narrow pulse wave with a fast decay. Thin, hard and very retro.",
    origin: "Tonejs/Presets Synth/DropPulse",
    options: {"oscillator":{"type":"pulse","width":0.8},"envelope":{"attack":0.01,"decay":0.05,"sustain":0.2,"releaseCurve":"bounce","release":0.4}} },
  tpLectric: { label: 'Lectric', category: 'Leads', synth: 'Synth', dur: 1.4,
    note: "Portamento of 0.2 means every note slides into the next. A lead that will not sit still.",
    origin: "Tonejs/Presets Synth/Lectric",
    options: {"portamento":0.2,"oscillator":{"type":"sawtooth"},"envelope":{"attack":0.03,"decay":0.1,"sustain":0.2,"release":0.02}} },
  tpMarimba: { label: 'Marimba', category: 'Bells & Mallets', synth: 'Synth', dur: 2,
    note: "Odd partials only, struck and left to ring. Woodier than the FM marimba beside it.",
    origin: "Tonejs/Presets Synth/Marimba",
    options: {"oscillator":{"partials":[1,0,2,0,3]},"envelope":{"attack":0.001,"decay":1.2,"sustain":0,"release":1.2}} },
  tpSteelpan: { label: 'Steelpan', category: 'Bells & Mallets', synth: 'Synth', dur: 2.4,
    note: "A custom partial set, detuned three ways. Metallic and warm at once.",
    origin: "Tonejs/Presets Synth/Steelpan",
    options: {"oscillator":{"type":"fatcustom","partials":[0.2,1,0,0.5,0.1],"spread":40,"count":3},"envelope":{"attack":0.001,"decay":1.6,"sustain":0,"release":1.6}} },
  tpSuperSaw: { label: 'Super Saw', category: 'Leads', synth: 'Synth', dur: 1.4,
    note: "Three sawtooths thirty cents apart — the trance lead, and the widest single sound here.",
    origin: "Tonejs/Presets Synth/SuperSaw",
    options: {"oscillator":{"type":"fatsawtooth","count":3,"spread":30},"envelope":{"attack":0.01,"decay":0.1,"sustain":0.5,"release":0.4,"attackCurve":"exponential"}} },
  tpTreeTrunk: { label: 'Tree Trunk', category: 'Plucks', synth: 'Synth', dur: 1,
    note: "A short sine knock with a little sustain behind it. Hollow and wooden.",
    origin: "Tonejs/Presets Synth/TreeTrunk",
    options: {"oscillator":{"type":"sine"},"envelope":{"attack":0.001,"decay":0.1,"sustain":0.1,"release":1.2}} },
  tpElectricCello: { label: 'Electric Cello', category: 'Brass & Strings', synth: 'FMSynth', dur: 3,
    note: "High modulation index over a triangle: bowed rather than struck, with a bite on the attack.",
    origin: "Tonejs/Presets FMSynth/ElectricCello",
    options: {"harmonicity":3.01,"modulationIndex":14,"oscillator":{"type":"triangle"},"envelope":{"attack":0.2,"decay":0.3,"sustain":0.1,"release":1.2},"modulation":{"type":"square"},"modulationEnvelope":{"attack":0.01,"decay":0.5,"sustain":0.2,"release":0.1}} },
  tpKalimba: { label: 'Kalimba', category: 'Bells & Mallets', synth: 'FMSynth', dur: 2.4,
    note: "Harmonicity 8 and almost no modulation — a thumb piano’s clean, high, quick ring.",
    origin: "Tonejs/Presets FMSynth/Kalimba",
    options: {"harmonicity":8,"modulationIndex":2,"oscillator":{"type":"sine"},"envelope":{"attack":0.001,"decay":2,"sustain":0.1,"release":2},"modulation":{"type":"square"},"modulationEnvelope":{"attack":0.002,"decay":0.2,"sustain":0,"release":0.2}} },
  tpThinSaws: { label: 'Thin Saws', category: 'Leads', synth: 'FMSynth', dur: 1.4,
    note: "Harmonicity below 1, so the modulator sits under the carrier. Reedy and narrow.",
    origin: "Tonejs/Presets FMSynth/ThinSaws",
    options: {"harmonicity":0.5,"modulationIndex":1.2,"oscillator":{"type":"fmsawtooth","modulationType":"sine","modulationIndex":20,"harmonicity":3},"envelope":{"attack":0.05,"decay":0.3,"sustain":0.1,"release":1.2},"modulation":{"volume":0,"type":"triangle"},"modulationEnvelope":{"attack":0.35,"decay":0.1,"sustain":1,"release":0.01}} },
  tpHarmonics: { label: 'Harmonics', category: 'Organs', synth: 'AMSynth', dur: 2.6,
    note: "Ring modulation at almost exactly four times the carrier — the partials line up, so it reads as an organ stop.",
    origin: "Tonejs/Presets AMSynth/Harmonics",
    options: {"harmonicity":3.999,"oscillator":{"type":"square"},"envelope":{"attack":0.03,"decay":0.3,"sustain":0.7,"release":0.8},"modulation":{"volume":12,"type":"square6"},"modulationEnvelope":{"attack":2,"decay":3,"sustain":0.8,"release":0.1}} },
  tpTiny: { label: 'Tiny', category: 'Keys', synth: 'AMSynth', dur: 1.6,
    note: "A tiny detuned AM sine. Small, clean and easy to place under anything.",
    origin: "Tonejs/Presets AMSynth/Tiny",
    options: {"harmonicity":2,"oscillator":{"type":"amsine2","modulationType":"sine","harmonicity":1.01},"envelope":{"attack":0.006,"decay":4,"sustain":0.04,"release":1.2},"modulation":{"volume":13,"type":"amsine2","modulationType":"sine","harmonicity":12},"modulationEnvelope":{"attack":0.006,"decay":0.2,"sustain":0.2,"release":0.4}} },
  roundMono2: { label: 'Square Tone', category: 'Plucks', synth: 'Synth', dur: 9.35,
    note: 'Simple Square Tone',
    options: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 1.3, sustain: 0.06, release: 2.18 },
    } },
};

// Measured peaks, filled in by tools/measure-voices.js. Kept beside the options they
// belong to rather than in a generated file: a preset and its level are one thing,
// and a second file would be one more thing to forget to regenerate.
const PEAKS = {
  roundMono: 1.183, fmGrowl: 0.216, subSine: 0.6891, acidSquelch: 1.6469,
  rubberBass: 0.6823, clangBass: 0.2115, detuneBass: 1.5362, monoBright: 0.8807,
  amHollow: 0.1073, duoDetune: 1.3948, glassLead: 0.2129, reedLead: 0.8357,
  screamLead: 2.1142, vibratoLead: 1.3321, fmKeys: 0.2185, epiano: 0.2199,
  clav: 0.2594, toyPiano: 0.2149, softKeys: 0.6896, padTriangle: 0.6968,
  warmPad: 0.7232, glassPad: 0.1228, breathPad: 1.1327, amOrgan: 0.111,
  fullOrgan: 0.2204, reedOrgan: 0.4084, fmBell: 0.2199, celeste: 0.2195,
  marimba: 0.2153, tubularBell: 2.5384, musicBox: 0.219, synthPluck: 1.1918,
  harpPluck: 0.6946, koto: 0.2181, brassStab: 0.752, synthStrings: 1.0717,
  hornSwell: 0.2168, buzzSaw: 1.1885, metalHit: 4.4308, drumTone: 0.6917,
  ringMod: 0.1355, hardFm: 0.2094, kickDeep: 0.6968, kickPunch: 0.6852,
  kickDirty: 0.6838, kickThud: 0.6895, snareFm: 0.2183, snareTrash: 3.2979,
  snareFlam: 2.5432, clapMetal: 2.5373, clapFm: 0.2417, hatTick: 1.3353,
  hatSizzle: 0.6979, conga: 0.6912, taiko: 0.6496, clave: 0.2197, agogo: 2.5451,
  triangleDing: 1.5741, buzzRoll: 2.6694, kick808: 0.6984, kickTight: 0.6798,
  kickClick: 0.6796, tom: 0.6939, metalSnare: 2.6982, metalHatClosed: 1.5952,
  metalHatOpen: 2.3604, metalCrash: 2.4879, cowbell: 3.3186, woodBlock: 0.2169,
  zap: 0.6253, tpBah: 0.1386, tpBassGuitar: 0.7916, tpBassy: 1.3042,
  tpBrassCircuit: 1.0582, tpCoolGuy: 2.9141, tpPianoetta: 0.886, tpPizz: 1.0667,
  tpAlienChorus: 0.6566, tpDelicateWind: 0.3496, tpDropPulse: 0.7,
  tpLectric: 0.6403, tpMarimba: 0.6906, tpSteelpan: 0.2812, tpSuperSaw: 0.3331,
  tpTreeTrunk: 0.6572, tpElectricCello: 0.2173, tpKalimba: 0.2195,
  tpThinSaws: 0.2098, tpHarmonics: 0.1082, tpTiny: 0.1531, snareCrisp: 0.4735,
  snareFat: 0.6486, snareTight: 0.4028, snareBrush: 0.8552, snareRim: 0.5081,
  clap808: 0.2403, clapTight: 0.1879, clapRoom: 0.3915, hatClosed: 0.6624,
  hatOpen: 0.8555, hatPedal: 0.2968, shaker: 0.4313, tambourine: 0.8678,
  noiseSweep: 0.8056, dsKick: 0.7, dsKickHard: 0.7, dsSnare: 0.6935,
  dsSnareCrack: 0.7, dsClap: 0.2885, dsHatClosed: 0.7135, dsHatOpen: 0.8873,
  dsShaker: 0.5496, dsTom: 0.7, dsRim: 0.4228, dsZap: 0.7, dsCrackSnare2: 0.7,
  roundMono2: 0.6687, dsClosedHat2: 0.8192
};

export const VOICES = {};
for (const [id, v] of Object.entries(ENGINE)) VOICES[id] = { ...v, id, kind: 'engine' };
for (const [id, v] of Object.entries(TONE)) {
  VOICES[id] = { ...v, id, kind: 'tone', peak: PEAKS[id] ?? 1 };
}
for (const [id, v] of Object.entries(NOISE)) {
  VOICES[id] = { ...v, id, kind: 'noise', peak: PEAKS[id] ?? 1 };
}
for (const [id, v] of Object.entries(DRUM)) {
  VOICES[id] = { ...v, id, kind: 'drum', peak: PEAKS[id] ?? 1 };
}

/** Every voice offered on a lane. Lane-agnostic bar the few engine ones that cannot be. */
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
  bass: 'Basses', lead: 'Leads', leadHarm: 'Leads', chords: 'Keys',
  organChords: 'Organs', twinkle: 'Bells & Mallets',
  kick: 'Kicks', snare: 'Snares', clap: 'Claps',
  hats: 'Hats', ohats: 'Hats', rim: 'Percussion', crash: 'Percussion', tom: 'Percussion',
};

/**
 * The five kit categories, which travel together — and which are also the whole of
 * the answer to "drums or not": everything else in the catalogue is pitched.
 */
export const KIT_CATEGORIES = ['Kicks', 'Snares', 'Claps', 'Hats', 'Percussion'];

/**
 * Grouped for the picker: `[category, voices[]]`, empty categories dropped.
 *
 * The lane's own kind comes first — and on a drum lane the rest of the KIT follows
 * it, before the melodic categories. Splitting the drums into five columns is only
 * an improvement if they stay next to each other: a kick strip that opened on Kicks
 * and then put Snares eleventh, behind Pads and Organs, would be worse than the one
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
  VOICES[id] = {
    ...params,
    id,
    kind,
    // Same guard voiceGain applies: the lane's target is DIVIDED by this, so a zero
    // here is not a quiet preset, it is a division by zero.
    peak: params.peak > 0 ? params.peak : 1,
    songLocal: true,
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
 * timbre halfway: the finale's lead is a different waveform in nearly every section,
 * and the bank on its own says nothing about the lead at all. One view per section
 * where that happens, and the caller only names the lane if they all agree — a strip
 * labelled `Square` on a song whose every section plays a saw would be worse than the
 * label it replaced. Banks whose sections leave the lane alone — most of them — are
 * one view, and cost one object.
 */
function bankViews(bank, vocab) {
  const secs = Array.isArray(bank.sections) ? bank.sections : null;
  if (!secs || !secs.some((s) => s && Object.keys(s).some((k) => vocab.has(k)))) return [bank];
  // `sections: null` so a view is a leaf: it is the bank as one section sees it, and
  // asking it for its own sections would be the same question forever.
  return secs.filter(Boolean).map((s) => ({ ...bank, ...s, sections: null }));
}

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
 * Of the 149 melodic lanes the 35 registered songs actually play, this names 99. The
 * rest are banks tuned past every preset — usually by one number, an attack or a
 * length — and those are what the next preset gets mined from.
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
  const views = bankViews(bank, vocab);
  if (views.length > 1) {
    const first = defaultVoiceOf(views[0], laneKey);
    return views.every((v) => defaultVoiceOf(v, laneKey) === first) ? first : null;
  }
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
      const mine = k === seam.typeKey ? typed : bank[k];
      if (!same(keys[k], mine)) { hit = false; break; }
    }
    if (hit) return v;
  }
  return null;
}
