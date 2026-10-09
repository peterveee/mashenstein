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

// The same courtesy for a PITCHED lane, and it has to be a different preset: `tom` is a
// drum, so handing it to a new bass or lead — or to the fifteen melodic layers a MIDI
// import arrives with — labels the strip `Tom` and plays a membrane thud where a tune
// should be. `toneSquare` is the neutral pitched starter: a single-oscillator square,
// the sound the engine's own default oscillator makes, so an unvoiced melodic lane
// arrives sounding like the arcade rather than like a drum.
//
// It cannot be an ENGINE preset (`engSquare`) even though that is the same waveform: an
// engine preset is a bundle of bank keys the hand-written lane body reads, and a layer
// has no body to read them — `voiceOf` returns null for that pairing, which is silence.
export const DEFAULT_ADDED_MELODIC_VOICE = 'toneSquare';

/**
 * The starter preset for a lane nothing has voiced yet — a drum for a drum, a square
 * for anything pitched.
 *
 * One answer in one place, because the desk asks it from four directions (the strip
 * heading, the picker's default row, the track clipboard, the bank the engine plays)
 * and any of them disagreeing is a strip that names a sound it does not make.
 */
export const defaultAddedVoice = (laneKey) => (
  PERCUSSION_LANES.includes(baseLane(laneKey))
    ? DEFAULT_ADDED_PERCUSSION_VOICE
    : DEFAULT_ADDED_MELODIC_VOICE
);

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
 *
 * ---- and why it is not PURELY energy either ----------------------------------
 *
 * Everything above is still true, and it is still the thing being matched. What it
 * misses is that the energy is measured over a FIXED window — one note in a 32-step bar
 * at 120 BPM, so eight seconds of which the note may occupy a twentieth. How much of
 * that window a note fills therefore divides straight into the gain. A sharp attack and
 * decay is mostly a window of silence, measures as near-nothing, and is handed a gain
 * that makes it arrive far hotter than a sound which sustains through the same window at
 * the same loudness. Peak-matching had that backwards; pure energy-matching has it
 * backwards the other way, and neither end of the argument is the answer.
 *
 * So the gain is the geometric mean of the two — the midpoint between them in dB,
 * `PEAK_LEAN` of the way from energy toward peak. Across the 316 levelled presets that
 * moves the median by +1.4 dB and closes the spread between the peakiest and the densest
 * by half; a blip comes down, a pad comes up, and what a listener hears is one library
 * rather than two. It changes no measurement: `level` and `peak` are exactly the numbers
 * tools/measure-voices.js wrote, and this only changes how they are combined, which is
 * why moving PEAK_LEAN back to 0 restores the old behaviour without a re-measure.
 */

/** How far the derived gain leans from energy-matching toward peak-matching. */
const PEAK_LEAN = 0.5;

export function voiceGain(voice, laneKey) {
  // A layer aims at the same place its source lane does — it is the same part, and
  // the point of the level being derived is that a new sound lands near where the
  // one beside it sits rather than at whatever its own output happens to be.
  const target = LANE_TARGETS[baseLane(laneKey)];
  if (!target) return 0;
  // A copy a song saved before the library was measured this way carries a peak and no
  // level. Level it the old way rather than at `target.level / 1`, which is 30-odd dB
  // of wrong and would read as the preset having broken.
  if (!(voice.level > 0)) return capGain(target.peak / (voice.peak > 0 ? voice.peak : 1));
  const energy = target.level / voice.level;
  // A preset measured before peaks were carried has only the one answer to give.
  if (!(voice.peak > 0)) return capGain(energy);
  const peakParity = target.peak / voice.peak;
  return capGain(energy ** (1 - PEAK_LEAN) * peakParity ** PEAK_LEAN);
}

/**
 * The most a measured level may ever be trusted to BOOST by.
 *
 * This division is only as good as the measurement behind it, and a level that came out
 * too small is the one failure that is dangerous rather than merely wrong: the gain is
 * `target / level`, so a level ten times too small is a lane twenty decibels too loud.
 * That is not hypothetical — the desk's live estimate (tools/mixer-voice-editor.js)
 * renders one second of a note, so dragging an ATTACK to its ten-second stop measures a
 * sound that has barely begun, reads it as near-silent, and derives a gain around +29 dB
 * for a preset that is nothing of the kind. The first note after it was a shout.
 *
 * So: a ceiling, in the one place every play path goes through. Nothing in the library
 * comes near it — measured across all 311 levelled presets the largest boost any of them
 * asks for is +8.2 dB — so this changes no sound that exists. It only bounds the ones
 * that would arrive at four times their lane's target and take the listener's head off.
 *
 * The cap is one-sided ON PURPOSE. Cutting is safe and often right: `addBell` and the
 * drawbar organs sit 40 dB down because they really are that loud at unity. Only the
 * boost can hurt you.
 */
const MAX_LEVEL_BOOST = 4;                     // +12 dB over the lane's own target
const capGain = (g) => (g > MAX_LEVEL_BOOST ? MAX_LEVEL_BOOST : g);

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

// KLNG8 presets — the Microtonic construction, played by `_playDrum` in
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
  // Creative collection. Measured with tools/render-creative-kit-auditions.js --measure.
  kit_glasshouse_kick: { label: 'Glasshouse · Kick', category: 'Kick', homeLane: 'kick', dur: 1.2,
    note: 'House: a punchy 909-style kick, bright layered clap and sizzling offbeat hats. '
      + 'Crisp and open, with restrained fills.',
    osc: { type: 'sine', from: 150, to: 50, sweep: 0.018, pitchCurve: 'snap', attack: 0.001, decay: 0.32, curve: 'exp', gain: 1 },
    osc2: { type: 'triangle', from: 1400, to: 260, sweep: 0.003, attack: 0.0005, decay: 0.012, curve: 'exp', gain: 0.18 },
    drive: 0.317245, shape: 'soft' },
  kit_glasshouse_snare: { label: 'Glasshouse · Snare', category: 'Snare', homeLane: 'snare', dur: 1,
    note: 'House: a punchy 909-style kick, bright layered clap and sizzling offbeat hats. '
      + 'Crisp and open, with restrained fills.',
    osc: { type: 'triangle', from: 192, to: 185, sweep: 0.012, decay: 0.12, gain: 0.65, curve: 'exp' },
    osc2: { type: 'sine', from: 329, to: 320, sweep: 0.012, decay: 0.085, gain: 0.35, curve: 'exp' },
    noise: { type: 'highpass', freq: 2400, Q: 0.7, attack: 0.001, hold: 0.012, decay: 0.17, gain: 1.1 },
    drive: 0.24067 },
  kit_glasshouse_clap: { label: 'Glasshouse · Clap', category: 'Clap', homeLane: 'clap', dur: 1,
    note: 'House: a punchy 909-style kick, bright layered clap and sizzling offbeat hats. '
      + 'Crisp and open, with restrained fills.',
    noise: { type: 'bandpass', freq: 2100, to: 1722, sweep: 0.1, Q: 0.65, attack: 0.0007, decay: 0.22, gain: 1 },
    drive: 0.089949,
    humanize: { gain: 0.035, filter: 0.025 },
    taps: [0, 0.008, 0.018, 0.031], tapFalloff: 1, tapGains: [0.65, 0.5, 0.65, 1], tapDecays: [0.025, 0.026, 0.033, 0.22], tapTone: 0.93 },
  kit_glasshouse_hats: { label: 'Glasshouse · Closed Hat', category: 'Hats', homeLane: 'hats', dur: 1,
    note: 'House: a punchy 909-style kick, bright layered clap and sizzling offbeat hats. '
      + 'Crisp and open, with restrained fills.',
    noise: { type: 'highpass', freq: 8500, Q: 0.7, decay: 0.04225, gain: 0.18 },
    metal: { wave: 'square', freq: 620, count: 6, spread: 1.08, filter: 'highpass', hp: 7200, Q: 0.7, slope: -24, decay: 0.065, gain: 0.7 },
    humanize: { gain: 0.03 } },
  kit_glasshouse_ohats: { label: 'Glasshouse · Open Hat', category: 'Hats', homeLane: 'ohats', dur: 2,
    note: 'House: a punchy 909-style kick, bright layered clap and sizzling offbeat hats. '
      + 'Crisp and open, with restrained fills.',
    noise: { type: 'highpass', freq: 8500, Q: 0.7, decay: 0.208, gain: 0.18 },
    metal: { wave: 'square', freq: 620, count: 6, spread: 1.08, filter: 'highpass', hp: 6480, Q: 0.7, slope: -24, decay: 0.32, gain: 0.7 },
    humanize: { gain: 0.03 } },
  kit_glasshouse_tom: { label: 'Glasshouse · Low Tom', category: 'Tom', homeLane: 'tom', dur: 1,
    note: 'House: a punchy 909-style kick, bright layered clap and sizzling offbeat hats. '
      + 'Crisp and open, with restrained fills.',
    osc: { type: 'sine', from: 190, to: 145, sweep: 0.018, attack: 0.001, decay: 0.2, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 1700, Q: 0.7, decay: 0.015, gain: 0.25 },
    drive: 0.162933 },
  kit_glasshouse_rim: { label: 'Glasshouse · Rim', category: 'Rim', homeLane: 'rim', dur: 0.5,
    note: 'House: a punchy 909-style kick, bright layered clap and sizzling offbeat hats. '
      + 'Crisp and open, with restrained fills.',
    osc: { type: 'square', from: 480, to: 430, sweep: 0.008, curve: 'exp', decay: 0.018, gain: 0.5 },
    noise: { type: 'highpass', freq: 5600, Q: 1.2, decay: 0.01, gain: 0.3 },
    metal: { wave: 'square', freq: 1650, ratios: [1, 1.47, 2.13], count: 3, spread: 1, filter: 'bandpass', hp: 3200, Q: 2.2, slope: -12, decay: 0.075, sag: 0.2, sagAt: 0.012, gain: 0.9 },
    drive: 0.379353 },
  kit_glasshouse_crash: { label: 'Glasshouse · Crash', category: 'Crash', homeLane: 'crash', dur: 5,
    note: 'House: a punchy 909-style kick, bright layered clap and sizzling offbeat hats. '
      + 'Crisp and open, with restrained fills.',
    noise: { type: 'lowpass', freq: 9200, to: 2400, sweep: 0.9, Q: 0.8, decay: 1.35, gain: 1 },
    metal: { wave: 'square', freq: 610, spread: 1, count: 6, hp: 3300, Q: 0.8, decay: 1.2, gain: 0.8 },
    drive: 0.456924 },
  kit_havana_patio_kick: { label: 'Havana Patio · Kick', category: 'Kick', homeLane: 'kick', dur: 1.2,
    note: 'Latin house: a solid club kick and handclaps, with open conga, woody clave and '
      + 'sandy shaker accents over a four-on-the-floor groove.',
    osc: { type: 'sine', from: 135, to: 49, sweep: 0.018, pitchCurve: 'snap', attack: 0.001, decay: 0.3, curve: 'exp', gain: 1 },
    osc2: { type: 'triangle', from: 1400, to: 260, sweep: 0.003, attack: 0.0005, decay: 0.012, curve: 'exp', gain: 0.18 },
    drive: 0.231216, shape: 'soft' },
  kit_havana_patio_snare: { label: 'Havana Patio · Snare', category: 'Snare', homeLane: 'snare', dur: 1,
    note: 'Latin house: a solid club kick and handclaps, with open conga, woody clave and '
      + 'sandy shaker accents over a four-on-the-floor groove.',
    osc: { type: 'triangle', from: 197, to: 190, sweep: 0.012, decay: 0.12, gain: 0.65, curve: 'exp' },
    osc2: { type: 'sine', from: 344, to: 335, sweep: 0.012, decay: 0.085, gain: 0.35, curve: 'exp' },
    noise: { type: 'highpass', freq: 2200, Q: 0.7, attack: 0.001, hold: 0.012, decay: 0.14, gain: 1.1 },
    drive: 0.237777 },
  kit_havana_patio_clap: { label: 'Havana Patio · Clap', category: 'Clap', homeLane: 'clap', dur: 1,
    note: 'Latin house: a solid club kick and handclaps, with open conga, woody clave and '
      + 'sandy shaker accents over a four-on-the-floor groove.',
    noise: { type: 'bandpass', freq: 1800, to: 1476, sweep: 0.1, Q: 0.65, attack: 0.0007, decay: 0.17, gain: 1 },
    drive: 0.083853,
    humanize: { gain: 0.035, filter: 0.025 },
    taps: [0, 0.008, 0.018, 0.031], tapFalloff: 1, tapGains: [0.65, 0.5, 0.65, 1], tapDecays: [0.025, 0.026, 0.033, 0.17], tapTone: 0.93 },
  kit_havana_patio_hats: { label: 'Havana Patio · Closed Hat', category: 'Hats', homeLane: 'hats', dur: 1,
    note: 'Latin house: a solid club kick and handclaps, with open conga, woody clave and '
      + 'sandy shaker accents over a four-on-the-floor groove.',
    noise: { type: 'highpass', freq: 8500, Q: 0.7, decay: 0.0455, gain: 0.18 },
    metal: { wave: 'square', freq: 540, count: 6, spread: 1.08, filter: 'highpass', hp: 6600, Q: 0.7, slope: -24, decay: 0.07, gain: 0.7 },
    humanize: { gain: 0.03 } },
  kit_havana_patio_ohats: { label: 'Havana Patio · Open Hat', category: 'Hats', homeLane: 'ohats', dur: 2,
    note: 'Latin house: a solid club kick and handclaps, with open conga, woody clave and '
      + 'sandy shaker accents over a four-on-the-floor groove.',
    noise: { type: 'highpass', freq: 8500, Q: 0.7, decay: 0.1755, gain: 0.18 },
    metal: { wave: 'square', freq: 540, count: 6, spread: 1.08, filter: 'highpass', hp: 5940, Q: 0.7, slope: -24, decay: 0.27, gain: 0.7 },
    humanize: { gain: 0.03 } },
  kit_havana_patio_tom: { label: 'Havana Patio · Conga', category: 'Perc', homeLane: 'tom', dur: 1,
    note: 'Latin house: a solid club kick and handclaps, with open conga, woody clave and '
      + 'sandy shaker accents over a four-on-the-floor groove.',
    osc: { type: 'sine', from: 235, to: 195, sweep: 0.015, attack: 0.001, decay: 0.28, curve: 'exp', gain: 1 },
    osc2: { type: 'sine', from: 325, to: 315, sweep: 0.008, decay: 0.075, gain: 0.18 },
    noise: { type: 'lowpass', freq: 1700, Q: 0.65, decay: 0.022, gain: 0.3 },
    drive: 0.131258 },
  kit_havana_patio_rim: { label: 'Havana Patio · Clave', category: 'Perc', homeLane: 'rim', dur: 0.5,
    note: 'Latin house: a solid club kick and handclaps, with open conga, woody clave and '
      + 'sandy shaker accents over a four-on-the-floor groove.',
    osc: { type: 'triangle', from: 1900, to: 1790, sweep: 0.016, curve: 'exp', attack: 0.0006, decay: 0.075, gain: 0.6 },
    ring: { freq: 2500, Q: 70, hit: 0.001, decay: 0.045, gain: 0.35 },
    drive: 0.061099,
    tone: { type: 'lowpass', freq: 5200, Q: 0.7 } },
  kit_havana_patio_crash: { label: 'Havana Patio · Crash', category: 'Crash', homeLane: 'crash', dur: 5,
    note: 'Latin house: a solid club kick and handclaps, with open conga, woody clave and '
      + 'sandy shaker accents over a four-on-the-floor groove.',
    noise: { type: 'lowpass', freq: 9200, to: 2400, sweep: 0.9, Q: 0.8, decay: 1.35, gain: 1 },
    metal: { wave: 'square', freq: 610, spread: 1, count: 6, hp: 3300, Q: 0.8, decay: 1.2, gain: 0.8 },
    drive: 0.456924 },
  kit_moon_dust_kick: { label: 'Moon Dust · Kick', category: 'Kick', homeLane: 'kick', dur: 1.2,
    note: 'Progressive house: a deep, sustained kick, broad clap, dark metallic hats and low '
      + 'tom fills. Weight and space, with no sci-fi pings.',
    osc: { type: 'sine', from: 125, to: 43, sweep: 0.022, pitchCurve: 'snap', attack: 0.001, decay: 0.48, curve: 'exp', gain: 1 },
    osc2: { type: 'triangle', from: 1400, to: 260, sweep: 0.003, attack: 0.0005, decay: 0.012, curve: 'exp', gain: 0.18 },
    drive: 0.261795, shape: 'soft' },
  kit_moon_dust_snare: { label: 'Moon Dust · Snare', category: 'Snare', homeLane: 'snare', dur: 1,
    note: 'Progressive house: a deep, sustained kick, broad clap, dark metallic hats and low '
      + 'tom fills. Weight and space, with no sci-fi pings.',
    osc: { type: 'triangle', from: 177, to: 170, sweep: 0.012, decay: 0.12, gain: 0.65, curve: 'exp' },
    osc2: { type: 'sine', from: 309, to: 300, sweep: 0.012, decay: 0.085, gain: 0.35, curve: 'exp' },
    noise: { type: 'highpass', freq: 1800, Q: 0.7, attack: 0.001, hold: 0.012, decay: 0.22, gain: 1.1 },
    drive: 0.245034 },
  kit_moon_dust_clap: { label: 'Moon Dust · Clap', category: 'Clap', homeLane: 'clap', dur: 1,
    note: 'Progressive house: a deep, sustained kick, broad clap, dark metallic hats and low '
      + 'tom fills. Weight and space, with no sci-fi pings.',
    noise: { type: 'bandpass', freq: 1600, to: 1312, sweep: 0.1, Q: 0.65, attack: 0.0007, decay: 0.34, gain: 1 },
    drive: 0.084024,
    humanize: { gain: 0.035, filter: 0.025 },
    taps: [0, 0.008, 0.018, 0.031], tapFalloff: 1, tapGains: [0.65, 0.5, 0.65, 1], tapDecays: [0.025, 0.026, 0.033, 0.34], tapTone: 0.93 },
  kit_moon_dust_hats: { label: 'Moon Dust · Closed Hat', category: 'Hats', homeLane: 'hats', dur: 1,
    note: 'Progressive house: a deep, sustained kick, broad clap, dark metallic hats and low '
      + 'tom fills. Weight and space, with no sci-fi pings.',
    noise: { type: 'highpass', freq: 8500, Q: 0.7, decay: 0.052, gain: 0.18 },
    metal: { wave: 'square', freq: 480, count: 6, spread: 1.08, filter: 'highpass', hp: 6000, Q: 0.7, slope: -24, decay: 0.08, gain: 0.7 },
    humanize: { gain: 0.03 } },
  kit_moon_dust_ohats: { label: 'Moon Dust · Open Hat', category: 'Hats', homeLane: 'ohats', dur: 2,
    note: 'Progressive house: a deep, sustained kick, broad clap, dark metallic hats and low '
      + 'tom fills. Weight and space, with no sci-fi pings.',
    noise: { type: 'highpass', freq: 8500, Q: 0.7, decay: 0.2925, gain: 0.18 },
    metal: { wave: 'square', freq: 480, count: 6, spread: 1.08, filter: 'highpass', hp: 5400, Q: 0.7, slope: -24, decay: 0.45, gain: 0.7 },
    humanize: { gain: 0.03 } },
  kit_moon_dust_tom: { label: 'Moon Dust · Low Tom', category: 'Tom', homeLane: 'tom', dur: 1,
    note: 'Progressive house: a deep, sustained kick, broad clap, dark metallic hats and low '
      + 'tom fills. Weight and space, with no sci-fi pings.',
    osc: { type: 'sine', from: 150, to: 100, sweep: 0.018, attack: 0.001, decay: 0.34, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 1700, Q: 0.7, decay: 0.015, gain: 0.25 },
    drive: 0.15898 },
  kit_moon_dust_rim: { label: 'Moon Dust · Rim', category: 'Rim', homeLane: 'rim', dur: 0.5,
    note: 'Progressive house: a deep, sustained kick, broad clap, dark metallic hats and low '
      + 'tom fills. Weight and space, with no sci-fi pings.',
    osc: { type: 'triangle', from: 720, to: 560, sweep: 0.012, decay: 0.05, curve: 'exp', gain: 0.42 },
    noise: { type: 'bandpass', freq: 3300, Q: 3.2, decay: 0.026, gain: 0.5 },
    ring: { freq: 1120, Q: 68, hit: 0.0025, decay: 0.17, gain: 1.12 },
    drive: 0.075501 },
  kit_moon_dust_crash: { label: 'Moon Dust · Crash', category: 'Crash', homeLane: 'crash', dur: 6,
    note: 'Progressive house: a deep, sustained kick, broad clap, dark metallic hats and low '
      + 'tom fills. Weight and space, with no sci-fi pings.',
    metal: { wave: 'square', freq: 540, count: 6, spread: 1.35, filter: 'highpass', hp: 4200, hpTo: 2600, hpSweep: 2.4, Q: 0.8, slope: -12, decay: 1.8, sag: 0.42, sagAt: 0.1, gain: 0.4 },
    drive: 0.227483,
    humanize: { gain: 0.03 } },
  kit_neon_origami_kick: { label: 'Neon Origami · Kick', category: 'Kick', homeLane: 'kick', dur: 1.2,
    note: 'Peak-time trance: a fast, hard-fronted kick, cracking snare, dense clap and bright '
      + 'driving cymbals. Tight enough for a busy bassline.',
    osc: { type: 'sine', from: 170, to: 50, sweep: 0.012, pitchCurve: 'snap', attack: 0.001, decay: 0.27, curve: 'exp', gain: 1 },
    osc2: { type: 'triangle', from: 1400, to: 260, sweep: 0.003, attack: 0.0005, decay: 0.012, curve: 'exp', gain: 0.18 },
    drive: 0.45, shape: 'soft' },
  kit_neon_origami_snare: { label: 'Neon Origami · Snare', category: 'Snare', homeLane: 'snare', dur: 1,
    note: 'Peak-time trance: a fast, hard-fronted kick, cracking snare, dense clap and bright '
      + 'driving cymbals. Tight enough for a busy bassline.',
    osc: { type: 'triangle', from: 202, to: 195, sweep: 0.012, decay: 0.12, gain: 0.65, curve: 'exp' },
    osc2: { type: 'sine', from: 359, to: 350, sweep: 0.012, decay: 0.085, gain: 0.35, curve: 'exp' },
    noise: { type: 'highpass', freq: 3100, Q: 0.7, attack: 0.001, hold: 0.012, decay: 0.21, gain: 1.1 },
    drive: 0.248942 },
  kit_neon_origami_clap: { label: 'Neon Origami · Clap', category: 'Clap', homeLane: 'clap', dur: 1,
    note: 'Peak-time trance: a fast, hard-fronted kick, cracking snare, dense clap and bright '
      + 'driving cymbals. Tight enough for a busy bassline.',
    noise: { type: 'bandpass', freq: 2400, to: 1968, sweep: 0.1, Q: 0.65, attack: 0.0007, decay: 0.26, gain: 1 },
    drive: 0.093382,
    humanize: { gain: 0.035, filter: 0.025 },
    taps: [0, 0.008, 0.018, 0.031], tapFalloff: 1, tapGains: [0.65, 0.5, 0.65, 1], tapDecays: [0.025, 0.026, 0.033, 0.26], tapTone: 0.93 },
  kit_neon_origami_hats: { label: 'Neon Origami · Closed Hat', category: 'Hats', homeLane: 'hats', dur: 1,
    note: 'Peak-time trance: a fast, hard-fronted kick, cracking snare, dense clap and bright '
      + 'driving cymbals. Tight enough for a busy bassline.',
    noise: { type: 'highpass', freq: 8500, Q: 0.7, decay: 0.03575, gain: 0.18 },
    metal: { wave: 'square', freq: 680, count: 6, spread: 1.08, filter: 'highpass', hp: 7800, Q: 0.7, slope: -24, decay: 0.055, gain: 0.7 },
    humanize: { gain: 0.03 } },
  kit_neon_origami_ohats: { label: 'Neon Origami · Open Hat', category: 'Hats', homeLane: 'ohats', dur: 2,
    note: 'Peak-time trance: a fast, hard-fronted kick, cracking snare, dense clap and bright '
      + 'driving cymbals. Tight enough for a busy bassline.',
    noise: { type: 'highpass', freq: 8500, Q: 0.7, decay: 0.195, gain: 0.18 },
    metal: { wave: 'square', freq: 680, count: 6, spread: 1.08, filter: 'highpass', hp: 7020, Q: 0.7, slope: -24, decay: 0.3, gain: 0.7 },
    humanize: { gain: 0.03 } },
  kit_neon_origami_tom: { label: 'Neon Origami · Low Tom', category: 'Tom', homeLane: 'tom', dur: 1,
    note: 'Peak-time trance: a fast, hard-fronted kick, cracking snare, dense clap and bright '
      + 'driving cymbals. Tight enough for a busy bassline.',
    osc: { type: 'sine', from: 205, to: 150, sweep: 0.018, attack: 0.001, decay: 0.18, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 1700, Q: 0.7, decay: 0.015, gain: 0.25 },
    drive: 0.163951 },
  kit_neon_origami_rim: { label: 'Neon Origami · Rim', category: 'Rim', homeLane: 'rim', dur: 0.5,
    note: 'Peak-time trance: a fast, hard-fronted kick, cracking snare, dense clap and bright '
      + 'driving cymbals. Tight enough for a busy bassline.',
    osc: { type: 'square', from: 480, to: 430, sweep: 0.008, curve: 'exp', decay: 0.018, gain: 0.5 },
    noise: { type: 'highpass', freq: 5600, Q: 1.2, decay: 0.01, gain: 0.3 },
    metal: { wave: 'square', freq: 1650, ratios: [1, 1.47, 2.13], count: 3, spread: 1, filter: 'bandpass', hp: 3200, Q: 2.2, slope: -12, decay: 0.075, sag: 0.2, sagAt: 0.012, gain: 0.9 },
    drive: 0.379353 },
  kit_neon_origami_crash: { label: 'Neon Origami · Crash', category: 'Crash', homeLane: 'crash', dur: 5,
    note: 'Peak-time trance: a fast, hard-fronted kick, cracking snare, dense clap and bright '
      + 'driving cymbals. Tight enough for a busy bassline.',
    noise: { type: 'lowpass', freq: 9200, to: 2400, sweep: 0.9, Q: 0.8, decay: 1.35, gain: 1 },
    metal: { wave: 'square', freq: 610, spread: 1, count: 6, hp: 3300, Q: 0.8, decay: 1.2, gain: 0.8 },
    drive: 0.456924 },
  kit_pocket_pixel_kick: { label: 'Pocket Pixel · Kick', category: 'Kick', homeLane: 'kick', dur: 1,
    note: 'Tiny, clean Game Boy-inspired percussion. Rounded triangle bodies and longer noise '
      + 'tails; no drive, crusher or saturation.',
    osc: { type: 'triangle', from: 220, to: 92, sweep: 0.018333, attack: 0.0015, decay: 0.11, curve: 'exp', gain: 1 },
    trim: 1.5 },
  kit_pocket_pixel_snare: { label: 'Pocket Pixel · Snare', category: 'Snare', homeLane: 'snare', dur: 1,
    note: 'Tiny, clean Game Boy-inspired percussion. Rounded triangle bodies and longer noise '
      + 'tails; no drive, crusher or saturation.',
    osc: { type: 'triangle', from: 410, to: 260, sweep: 0.008333, attack: 0.0015, decay: 0.06, curve: 'exp', gain: 0.5 },
    noise: { type: 'bandpass', freq: 3600, Q: 0.7, attack: 0.001, decay: 0.08, gain: 0.7 },
    trim: 1.5 },
  kit_pocket_pixel_clap: { label: 'Pocket Pixel · Clap', category: 'Clap', homeLane: 'clap', dur: 1,
    note: 'Tiny, clean Game Boy-inspired percussion. Rounded triangle bodies and longer noise '
      + 'tails; no drive, crusher or saturation.',
    osc: { type: 'triangle', from: 574, to: 338, sweep: 0.004583, attack: 0.0015, decay: 0.035, curve: 'exp', gain: 0.12 },
    noise: { type: 'bandpass', freq: 4200, Q: 0.7, attack: 0.001, decay: 0.075, gain: 0.7 },
    taps: [0], tapFalloff: 0.8,
    trim: 1.5 },
  kit_pocket_pixel_hats: { label: 'Pocket Pixel · Closed Hat', category: 'Hats', homeLane: 'hats', dur: 1,
    note: 'Tiny, clean Game Boy-inspired percussion. Rounded triangle bodies and longer noise '
      + 'tails; no drive, crusher or saturation.',
    noise: { type: 'highpass', freq: 6900, Q: 0.7, attack: 0.001, decay: 0.028, gain: 0.6 },
    trim: 1.5 },
  kit_pocket_pixel_ohats: { label: 'Pocket Pixel · Open Hat', category: 'Hats', homeLane: 'ohats', dur: 1,
    note: 'Tiny, clean Game Boy-inspired percussion. Rounded triangle bodies and longer noise '
      + 'tails; no drive, crusher or saturation.',
    noise: { type: 'highpass', freq: 5865, Q: 0.7, attack: 0.001, decay: 0.13, gain: 0.6 },
    trim: 1.5 },
  kit_pocket_pixel_tom: { label: 'Pocket Pixel · Tom', category: 'Tom', homeLane: 'tom', dur: 1,
    note: 'Tiny, clean Game Boy-inspired percussion. Rounded triangle bodies and longer noise '
      + 'tails; no drive, crusher or saturation.',
    osc: { type: 'triangle', from: 720, to: 340, sweep: 0.015, attack: 0.0015, decay: 0.1, curve: 'exp', gain: 1 },
    trim: 1.5 },
  kit_pocket_pixel_rim: { label: 'Pocket Pixel · Rim', category: 'Rim', homeLane: 'rim', dur: 1,
    note: 'Tiny, clean Game Boy-inspired percussion. Rounded triangle bodies and longer noise '
      + 'tails; no drive, crusher or saturation.',
    osc: { type: 'triangle', from: 1380, to: 1380, sweep: 0.006667, attack: 0.0015, decay: 0.045, curve: 'exp', gain: 0.65 },
    trim: 1.5 },
  kit_pocket_pixel_crash: { label: 'Pocket Pixel · Crash', category: 'Crash', homeLane: 'crash', dur: 3,
    note: 'Tiny, clean Game Boy-inspired percussion. Rounded triangle bodies and longer noise '
      + 'tails; no drive, crusher or saturation.',
    noise: { type: 'highpass', freq: 5400, Q: 0.7, attack: 0.001, decay: 0.22, gain: 0.55 },
    trim: 1.5 },
  kit_rio_lanterns_kick: { label: 'Rio Lanterns · Kick', category: 'Kick', homeLane: 'kick', dur: 1.2,
    note: 'Brazilian-inspired house: a weighty dance kick, dry backbeat and bright hats, with '
      + 'tambora-style skin percussion and a short metallic agogo accent.',
    osc: { type: 'sine', from: 140, to: 46, sweep: 0.016, pitchCurve: 'snap', attack: 0.001, decay: 0.35, curve: 'exp', gain: 1 },
    osc2: { type: 'triangle', from: 1400, to: 260, sweep: 0.003, attack: 0.0005, decay: 0.012, curve: 'exp', gain: 0.18 },
    drive: 0.271553, shape: 'soft' },
  kit_rio_lanterns_snare: { label: 'Rio Lanterns · Snare', category: 'Snare', homeLane: 'snare', dur: 1,
    note: 'Brazilian-inspired house: a weighty dance kick, dry backbeat and bright hats, with '
      + 'tambora-style skin percussion and a short metallic agogo accent.',
    osc: { type: 'triangle', from: 207, to: 200, sweep: 0.012, decay: 0.12, gain: 0.65, curve: 'exp' },
    osc2: { type: 'sine', from: 349, to: 340, sweep: 0.012, decay: 0.085, gain: 0.35, curve: 'exp' },
    noise: { type: 'highpass', freq: 2600, Q: 0.7, attack: 0.001, hold: 0.012, decay: 0.15, gain: 1.1 },
    drive: 0.242414 },
  kit_rio_lanterns_clap: { label: 'Rio Lanterns · Clap', category: 'Clap', homeLane: 'clap', dur: 1,
    note: 'Brazilian-inspired house: a weighty dance kick, dry backbeat and bright hats, with '
      + 'tambora-style skin percussion and a short metallic agogo accent.',
    noise: { type: 'bandpass', freq: 2000, to: 1640, sweep: 0.1, Q: 0.65, attack: 0.0007, decay: 0.18, gain: 1 },
    drive: 0.087338,
    humanize: { gain: 0.035, filter: 0.025 },
    taps: [0, 0.008, 0.018, 0.031], tapFalloff: 1, tapGains: [0.65, 0.5, 0.65, 1], tapDecays: [0.025, 0.026, 0.033, 0.18], tapTone: 0.93 },
  kit_rio_lanterns_hats: { label: 'Rio Lanterns · Closed Hat', category: 'Hats', homeLane: 'hats', dur: 1,
    note: 'Brazilian-inspired house: a weighty dance kick, dry backbeat and bright hats, with '
      + 'tambora-style skin percussion and a short metallic agogo accent.',
    noise: { type: 'highpass', freq: 8500, Q: 0.7, decay: 0.039, gain: 0.18 },
    metal: { wave: 'square', freq: 580, count: 6, spread: 1.08, filter: 'highpass', hp: 6900, Q: 0.7, slope: -24, decay: 0.06, gain: 0.7 },
    humanize: { gain: 0.03 } },
  kit_rio_lanterns_ohats: { label: 'Rio Lanterns · Open Hat', category: 'Hats', homeLane: 'ohats', dur: 2,
    note: 'Brazilian-inspired house: a weighty dance kick, dry backbeat and bright hats, with '
      + 'tambora-style skin percussion and a short metallic agogo accent.',
    noise: { type: 'highpass', freq: 8500, Q: 0.7, decay: 0.195, gain: 0.18 },
    metal: { wave: 'square', freq: 580, count: 6, spread: 1.08, filter: 'highpass', hp: 6210, Q: 0.7, slope: -24, decay: 0.3, gain: 0.7 },
    humanize: { gain: 0.03 } },
  kit_rio_lanterns_tom: { label: 'Rio Lanterns · Tambora', category: 'Perc', homeLane: 'tom', dur: 1,
    note: 'Brazilian-inspired house: a weighty dance kick, dry backbeat and bright hats, with '
      + 'tambora-style skin percussion and a short metallic agogo accent.',
    osc: { type: 'sine', from: 180, to: 135, sweep: 0.018, decay: 0.26, curve: 'exp', gain: 1 },
    noise: { type: 'highpass', freq: 3000, Q: 0.8, decay: 0.012, gain: 0.35 },
    ring: { freq: 1100, Q: 18, hit: 0.002, decay: 0.045, gain: 0.45 },
    drive: 0.110609 },
  kit_rio_lanterns_rim: { label: 'Rio Lanterns · Agogo', category: 'Perc', homeLane: 'rim', dur: 2,
    note: 'Brazilian-inspired house: a weighty dance kick, dry backbeat and bright hats, with '
      + 'tambora-style skin percussion and a short metallic agogo accent.',
    metal: { wave: 'square', freq: 620, ratios: [1, 1.58], count: 2, spread: 1, filter: 'bandpass', hp: 2400, Q: 1.8, slope: -24, attack: 0, decay: 0.24, sag: 0.28, sagAt: 0.025, gain: 0.7 },
    drive: 0.109907 },
  kit_rio_lanterns_crash: { label: 'Rio Lanterns · Crash', category: 'Crash', homeLane: 'crash', dur: 5,
    note: 'Brazilian-inspired house: a weighty dance kick, dry backbeat and bright hats, with '
      + 'tambora-style skin percussion and a short metallic agogo accent.',
    noise: { type: 'lowpass', freq: 9200, to: 2400, sweep: 0.9, Q: 0.8, decay: 1.35, gain: 1 },
    metal: { wave: 'square', freq: 610, spread: 1, count: 6, hp: 3300, Q: 0.8, decay: 1.2, gain: 0.8 },
    drive: 0.456924 },
  kit_rubber_factory_kick: { label: 'Rubber Factory · Kick', category: 'Kick', homeLane: 'kick', dur: 1.2,
    note: 'Tech house: a compact heavy kick, dry clap, tight metallic hats and low percussion. '
      + 'A rolling club groove without cartoon pitch sweeps.',
    osc: { type: 'sine', from: 145, to: 47, sweep: 0.012, pitchCurve: 'snap', attack: 0.001, decay: 0.25, curve: 'exp', gain: 1 },
    osc2: { type: 'triangle', from: 1400, to: 260, sweep: 0.003, attack: 0.0005, decay: 0.012, curve: 'exp', gain: 0.18 },
    drive: 0.36848, shape: 'soft' },
  kit_rubber_factory_snare: { label: 'Rubber Factory · Snare', category: 'Snare', homeLane: 'snare', dur: 1,
    note: 'Tech house: a compact heavy kick, dry clap, tight metallic hats and low percussion. '
      + 'A rolling club groove without cartoon pitch sweeps.',
    osc: { type: 'triangle', from: 182, to: 175, sweep: 0.012, decay: 0.12, gain: 0.65, curve: 'exp' },
    osc2: { type: 'sine', from: 319, to: 310, sweep: 0.012, decay: 0.085, gain: 0.35, curve: 'exp' },
    noise: { type: 'highpass', freq: 2300, Q: 0.7, attack: 0.001, hold: 0.012, decay: 0.115, gain: 1.1 },
    drive: 0.249369 },
  kit_rubber_factory_clap: { label: 'Rubber Factory · Clap', category: 'Clap', homeLane: 'clap', dur: 1,
    note: 'Tech house: a compact heavy kick, dry clap, tight metallic hats and low percussion. '
      + 'A rolling club groove without cartoon pitch sweeps.',
    noise: { type: 'bandpass', freq: 1700, to: 1394, sweep: 0.1, Q: 0.65, attack: 0.0007, decay: 0.13, gain: 1 },
    drive: 0.08069,
    humanize: { gain: 0.035, filter: 0.025 },
    taps: [0, 0.008, 0.018, 0.031], tapFalloff: 1, tapGains: [0.65, 0.5, 0.65, 1], tapDecays: [0.025, 0.026, 0.033, 0.13], tapTone: 0.93 },
  kit_rubber_factory_hats: { label: 'Rubber Factory · Closed Hat', category: 'Hats', homeLane: 'hats', dur: 1,
    note: 'Tech house: a compact heavy kick, dry clap, tight metallic hats and low percussion. '
      + 'A rolling club groove without cartoon pitch sweeps.',
    noise: { type: 'highpass', freq: 8500, Q: 0.7, decay: 0.026, gain: 0.18 },
    metal: { wave: 'square', freq: 510, count: 6, spread: 1.08, filter: 'highpass', hp: 6500, Q: 0.7, slope: -24, decay: 0.04, gain: 0.7 },
    humanize: { gain: 0.03 } },
  kit_rubber_factory_ohats: { label: 'Rubber Factory · Open Hat', category: 'Hats', homeLane: 'ohats', dur: 2,
    note: 'Tech house: a compact heavy kick, dry clap, tight metallic hats and low percussion. '
      + 'A rolling club groove without cartoon pitch sweeps.',
    noise: { type: 'highpass', freq: 8500, Q: 0.7, decay: 0.1495, gain: 0.18 },
    metal: { wave: 'square', freq: 510, count: 6, spread: 1.08, filter: 'highpass', hp: 5850, Q: 0.7, slope: -24, decay: 0.23, gain: 0.7 },
    humanize: { gain: 0.03 } },
  kit_rubber_factory_tom: { label: 'Rubber Factory · Low Tom', category: 'Tom', homeLane: 'tom', dur: 1,
    note: 'Tech house: a compact heavy kick, dry clap, tight metallic hats and low percussion. '
      + 'A rolling club groove without cartoon pitch sweeps.',
    osc: { type: 'sine', from: 155, to: 125, sweep: 0.018, attack: 0.001, decay: 0.17, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 1700, Q: 0.7, decay: 0.015, gain: 0.25 },
    drive: 0.15707 },
  kit_rubber_factory_rim: { label: 'Rubber Factory · Rim', category: 'Rim', homeLane: 'rim', dur: 0.5,
    note: 'Tech house: a compact heavy kick, dry clap, tight metallic hats and low percussion. '
      + 'A rolling club groove without cartoon pitch sweeps.',
    osc: { type: 'triangle', from: 330, to: 305, sweep: 0.01, curve: 'exp', decay: 0.075, sag: 0.22, sagAt: 0.012, gain: 0.55 },
    ring: { freq: 1750, Q: 120, hit: 0.001, decay: 0.13, sag: 0.3, sagAt: 0.014, gain: 1.5 },
    drive: 0.143925 },
  kit_rubber_factory_crash: { label: 'Rubber Factory · Crash', category: 'Crash', homeLane: 'crash', dur: 5,
    note: 'Tech house: a compact heavy kick, dry clap, tight metallic hats and low percussion. '
      + 'A rolling club groove without cartoon pitch sweeps.',
    noise: { type: 'lowpass', freq: 9200, to: 2400, sweep: 0.9, Q: 0.8, decay: 1.35, gain: 1 },
    metal: { wave: 'square', freq: 610, spread: 1, count: 6, hp: 3300, Q: 0.8, decay: 1.2, gain: 0.8 },
    drive: 0.456924 },
  kit_velvet_basement_kick: { label: 'Velvet Basement · Kick', category: 'Kick', homeLane: 'kick', dur: 1.2,
    note: 'Deep/disco house: a warm rounded kick, full snare, loose handclaps and brushed '
      + 'metallic hats. A relaxed dance-floor pulse.',
    osc: { type: 'sine', from: 125, to: 48, sweep: 0.02, pitchCurve: 'snap', attack: 0.001, decay: 0.36, curve: 'exp', gain: 1 },
    osc2: { type: 'triangle', from: 1400, to: 260, sweep: 0.003, attack: 0.0005, decay: 0.012, curve: 'exp', gain: 0.18 },
    drive: 0.193036, shape: 'soft' },
  kit_velvet_basement_snare: { label: 'Velvet Basement · Snare', category: 'Snare', homeLane: 'snare', dur: 1,
    note: 'Deep/disco house: a warm rounded kick, full snare, loose handclaps and brushed '
      + 'metallic hats. A relaxed dance-floor pulse.',
    osc: { type: 'triangle', from: 187, to: 180, sweep: 0.012, decay: 0.12, gain: 0.65, curve: 'exp' },
    osc2: { type: 'sine', from: 324, to: 315, sweep: 0.012, decay: 0.085, gain: 0.35, curve: 'exp' },
    noise: { type: 'highpass', freq: 1800, Q: 0.7, attack: 0.001, hold: 0.012, decay: 0.2, gain: 1.1 },
    drive: 0.239976 },
  kit_velvet_basement_clap: { label: 'Velvet Basement · Clap', category: 'Clap', homeLane: 'clap', dur: 1,
    note: 'Deep/disco house: a warm rounded kick, full snare, loose handclaps and brushed '
      + 'metallic hats. A relaxed dance-floor pulse.',
    noise: { type: 'bandpass', freq: 1600, to: 1312, sweep: 0.1, Q: 0.65, attack: 0.0007, decay: 0.25, gain: 1 },
    drive: 0.082667,
    humanize: { gain: 0.035, filter: 0.025 },
    taps: [0, 0.008, 0.018, 0.031], tapFalloff: 1, tapGains: [0.65, 0.5, 0.65, 1], tapDecays: [0.025, 0.026, 0.033, 0.25], tapTone: 0.93 },
  kit_velvet_basement_hats: { label: 'Velvet Basement · Closed Hat', category: 'Hats', homeLane: 'hats', dur: 1,
    note: 'Deep/disco house: a warm rounded kick, full snare, loose handclaps and brushed '
      + 'metallic hats. A relaxed dance-floor pulse.',
    noise: { type: 'highpass', freq: 8500, Q: 0.7, decay: 0.04875, gain: 0.18 },
    metal: { wave: 'square', freq: 490, count: 6, spread: 1.08, filter: 'highpass', hp: 5600, Q: 0.7, slope: -24, decay: 0.075, gain: 0.7 },
    humanize: { gain: 0.03 } },
  kit_velvet_basement_ohats: { label: 'Velvet Basement · Open Hat', category: 'Hats', homeLane: 'ohats', dur: 2,
    note: 'Deep/disco house: a warm rounded kick, full snare, loose handclaps and brushed '
      + 'metallic hats. A relaxed dance-floor pulse.',
    noise: { type: 'highpass', freq: 8500, Q: 0.7, decay: 0.247, gain: 0.18 },
    metal: { wave: 'square', freq: 490, count: 6, spread: 1.08, filter: 'highpass', hp: 5040, Q: 0.7, slope: -24, decay: 0.38, gain: 0.7 },
    humanize: { gain: 0.03 } },
  kit_velvet_basement_tom: { label: 'Velvet Basement · Low Tom', category: 'Tom', homeLane: 'tom', dur: 1,
    note: 'Deep/disco house: a warm rounded kick, full snare, loose handclaps and brushed '
      + 'metallic hats. A relaxed dance-floor pulse.',
    osc: { type: 'sine', from: 170, to: 125, sweep: 0.018, attack: 0.001, decay: 0.25, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 1700, Q: 0.7, decay: 0.015, gain: 0.25 },
    drive: 0.160274 },
  kit_velvet_basement_rim: { label: 'Velvet Basement · Rim', category: 'Rim', homeLane: 'rim', dur: 0.5,
    note: 'Deep/disco house: a warm rounded kick, full snare, loose handclaps and brushed '
      + 'metallic hats. A relaxed dance-floor pulse.',
    osc: { type: 'triangle', from: 720, to: 560, sweep: 0.012, decay: 0.05, curve: 'exp', gain: 0.42 },
    noise: { type: 'bandpass', freq: 3300, Q: 3.2, decay: 0.026, gain: 0.5 },
    ring: { freq: 1120, Q: 68, hit: 0.0025, decay: 0.17, gain: 1.12 },
    drive: 0.075501 },
  kit_velvet_basement_crash: { label: 'Velvet Basement · Crash', category: 'Crash', homeLane: 'crash', dur: 6,
    note: 'Deep/disco house: a warm rounded kick, full snare, loose handclaps and brushed '
      + 'metallic hats. A relaxed dance-floor pulse.',
    metal: { wave: 'square', freq: 540, count: 6, spread: 1.35, filter: 'highpass', hp: 4200, hpTo: 2600, hpSweep: 2.4, Q: 0.8, slope: -12, decay: 1.2, sag: 0.42, sagAt: 0.1, gain: 0.4 },
    drive: 0.227483,
    humanize: { gain: 0.03 } },
  dsKick: { label: 'Synth Kick', category: 'Kick', dur: 1,
    note: 'The KLNG8 808: a sine dropping an octave and a half into a long sub '
      + 'tail, with a filtered click on the front and a little drive to round it.',
    osc: { type: 'sine', from: 165, to: 48, sweep: 0.045, decay: 0.45, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 3200, Q: 0.7, decay: 0.015, gain: 0.4 },
    drive: 0.20938 },
  dsKickHard: { label: 'HH Clave', category: 'Perc', dur: 1,
    note: 'Tinny Hi Hat with a Clave behind it',
    knock: 0.79,
    noise: { type: 'bandpass', freq: 3950, Q: 23.45, decay: 0.435, gain: 1.47, attack: 0.001, to: 4790, color: 'violet', slope: -24, sweep: 1.59 },
    ring: { type: 'bandpass', freq: 400, Q: 40, hit: 0.0005, attack: 0.001, decay: 1.335, curve: 'exp', gain: 0.43, to: 4746 },
    metal: { wave: 'square', freq: 2481, spread: 0.68, count: 4, hp: 2615, Q: 6.25, attack: 0.001, decay: 0.07, gain: 0.03, filter: 'bandpass' },
    drive: 0.197558,
    bypassed: {
      osc: { type: 'sine', from: 227, to: 42.08, sweep: 0.962, decay: 0.685, curve: 'exp', gain: 1, attack: 0 },
    },
    tune: 21,
    trim: 3.998346 },
  dsSnare: { label: 'Synth Snare', category: 'Snare', dur: 1,
    note: 'The two-source snare: a triangle knock falling a fourth under a wide band '
      + 'of noise that rings a little longer than the body does.',
    osc: { type: 'triangle', from: 210, to: 165, sweep: 0.04, decay: 0.11, curve: 'exp', gain: 0.7 },
    noise: { type: 'bandpass', freq: 2100, Q: 0.8, decay: 0.17, gain: 1 },
    drive: 0.176114 },
  dsSnareCrack: { label: 'Synth Crack Snare', category: 'Snare', dur: 1,
    note: 'Tight and driven: a short square knock, highpassed air, everything over '
      + 'in a tenth of a second. The backbeat for fast songs.',
    osc: { type: 'square', from: 255, to: 200, sweep: 0.025, decay: 0.05, curve: 'exp', gain: 0.55 },
    noise: { type: 'highpass', freq: 2900, Q: 0.8, decay: 0.085, gain: 1 },
    drive: 0.426881 },
  dsClap: { label: 'Synth Clap', category: 'Clap', dur: 1,
    note: 'Four bursts through a band that slides DOWN as it decays — the room going '
      + 'dull after the hit, which is what the filter sweep is for.',
    noise: { type: 'bandpass', freq: 1550, to: 1050, sweep: 0.12, Q: 1.3, decay: 0.15, gain: 1 },
    taps: [0, 0.01, 0.021, 0.033], tapFalloff: 0.8 },
  dsHatClosed: { label: 'Synth Closed Hat', category: 'Hats', dur: 0.5,
    note: 'A resonant highpassed tick — sharper than the plain closed hat, closer to '
      + 'metal without being metal.',
    noise: { type: 'highpass', freq: 7800, Q: 1.2, decay: 0.032, gain: 1 } },
  dsHatOpen: { label: 'Synth Open Hat', category: 'Hats', dur: 2,
    note: 'The same band left ringing for most of half a second.',
    noise: { type: 'highpass', freq: 6800, Q: 1, decay: 0.42, gain: 1 } },

  // Two more matched pairs, both built on the one thing the KLNG8 has that the
  // noise table does not: a cutoff that MOVES while the hit decays. That sweep is most
  // of what separates a hat from a burst of hiss — a struck cymbal brightens for the
  // first few milliseconds and then darkens for the rest of its life, and a fixed
  // filter can only ever do one of those.
  hatSnapOpen: { label: '= Snap Open Hat', category: 'Hats', homeLane: 'ohats', dur: 2,
    note: 'The same hat held open: the sweep runs the other way over four tenths of a '
      + 'second, so the wash goes dull as it dies the way a real cymbal does.',
    noise: { type: 'highpass', freq: 8000, to: 5200, sweep: 0.4, Q: 1.2, decay: 0.42, gain: 1 },
    drive: 0.267879 },
  hatGrit: { label: '= Grit Hat', category: 'Hats', homeLane: 'hats', dur: 0.5,
    note: 'A resonant band with a square oscillator sitting in it, pushed hard into the '
      + 'shaper. Dirty and mid-forward — the hat for a mix where the bright ones vanish.',
    osc: { type: 'square', from: 3900, to: 1950, sweep: 0.006, decay: 0.028, curve: 'lin', gain: 0.16 },
    noise: { type: 'bandpass', freq: 5600, to: 3600, sweep: 0.05, Q: 4.5, decay: 0.038, gain: 1 },
    drive: 0.337903 },
  hatGritOpen: { label: '= Grit Open Hat', category: 'Hats', homeLane: 'ohats', dur: 2,
    note: 'The Grit hat let go: half a second of resonant sizzle falling away to a low '
      + 'band, with the square knock still on the front.',
    osc: { type: 'square', from: 3900, to: 1950, sweep: 0.01, decay: 0.055, curve: 'lin', gain: 0.13 },
    noise: { type: 'bandpass', freq: 5600, to: 2600, sweep: 0.45, Q: 4.2, decay: 0.5, gain: 1 },
    drive: 0.354864 },

  dsShaker: { label: 'Synth Shaker', category: 'Perc', homeLane: 'rim', dur: 0.5,
    note: 'The one drum here with an ATTACK: the noise fades in over twenty '
      + 'milliseconds, which is the whole difference between a shaker and a hat.',
    noise: { type: 'bandpass', freq: 6300, Q: 1.4, attack: 0.018, decay: 0.05, gain: 1 } },
  dsTom: { label: 'Synth Tom', category: 'Tom', homeLane: 'tom', dur: 1,
    note: 'A sine falling an octave over a tenth of a second with a soft lowpassed '
      + 'skin sound on the front. Tune it with the lane note key.',
    osc: { type: 'sine', from: 220, to: 105, sweep: 0.11, decay: 0.32, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 1400, Q: 0.7, decay: 0.03, gain: 0.18 },
    drive: 0.121837 },
  dsRim: { label: 'Synth Rim', category: 'Rim', homeLane: 'rim', dur: 0.5,
    note: 'A driven square knock and a narrow band of air, both gone in thirty milliseconds. '
      + 'The stick sound the engine’s rim approximates, synthesised.',
    osc: { type: 'square', from: 460, to: 635, sweep: 0.012, decay: 0.12, curve: 'exp', gain: 0.13 },
    noise: { type: 'bandpass', freq: 4300, Q: 2.2, decay: 0.235, gain: 0.44 },
    drive: 0.128542 },
  vl1Pi: { label: 'VL-1 Pi', category: 'Blip', homeLane: 'rim', dur: 0.5,
    note: 'A very short, high square-wave tick: the thinner, sharper of the VL-1 rhythm '
      + 'sounds, with a slight high-pass edge and a twenty-millisecond decay.',
    osc: { type: 'square', from: 1000, to: 1000, attack: 0, decay: 0.02, curve: 'exp', gain: 1 },
    tone: { type: 'highpass', freq: 800, Q: 0.7 } },
  vl1Po: { label: 'VL-1 Po', category: 'Blip', homeLane: 'rim', dur: 0.5,
    note: 'A short, filtered square-wave pop: the lower VL-1 rhythm sound, gone in about '
      + 'thirty milliseconds.',
    osc: { type: 'square', from: 500, to: 500, attack: 0, decay: 0.03, curve: 'exp', gain: 1 },
    tone: { type: 'lowpass', freq: 2500, Q: 0.7 } },
  vl1Sha: { label: 'Toy Shaker', category: 'Blip', homeLane: 'rim', dur: 0.5,
    note: 'The VL-1’s longer shhh: seeded white noise through a high-pass filter, with a '
      + 'clean one-hundred-sixty-millisecond decay.',
    noise: { type: 'highpass', freq: 3000, Q: 0.7, decay: 0.16, gain: 1 } },
  dsZap: { label: 'Synth Zap', category: 'FX', dur: 1,
    note: 'A sawtooth falling five octaves in under a tenth of a second, driven — '
      + 'the laser tom every drum synth ships and every second track uses once.',
    osc: { type: 'sawtooth', from: 1900, to: 50, sweep: 0.085, decay: 0.1, curve: 'exp', gain: 1 },
    drive: 0.5 },
  // ---- the sections the KLNG8 grew ------------------------------------
  //
  // Everything below uses something `_playDrum` could not do until it did: a struck
  // RESONATOR (a click into a filter narrow enough to ring, which is what a rim, a
  // clave and a snare shell all are), an FM MODULATOR on the oscillator, a METAL
  // cluster of inharmonic squares, coloured noise, filter slopes past 12 dB, and
  // per-hit variation that is deterministic because it is derived from the schedule.
  //
  // They are here as much to be read as to be played: each one is the smallest preset
  // that shows what one of those does.
  rimRing: { label: '= Ring Rim', category: 'Rim', homeLane: 'rim', dur: 0.5,
    note: 'A stick crack over a filter narrow enough to ring — the pitch is the '
      + 'resonance, not an oscillator, so it arrives already dying. The rim the old '
      + 'construction could only approximate.',
    noise: { type: 'highpass', freq: 3800, slope: -24, color: 'violet', decay: 0.008, gain: 0.28 },
    ring: { freq: 1720, Q: 110, hit: 0.0015, decay: 0.13, gain: 1.1 },
    drive: 0.087776 },
  rimWood: { label: '= Wood Rim', category: 'Rim', homeLane: 'rim', dur: 0.5,
    note: 'Lower and rounder, struck with a softer stick: a square knock on the front '
      + 'and a shell ringing under it. Sits where a wood block sits without being one.',
    osc: { type: 'square', from: 1900, to: 1750, sweep: 0.006, decay: 0.012, curve: 'lin', gain: 0.16 },
    ring: { freq: 780, Q: 80, hit: 0.004, decay: 0.2, gain: 1.2 },
    tone: { freq: 7000 } },
  // The crypt's iron gate banging shut (the gateSlam cue, audio.js), picked by Peter from
  // five on 27 Sep 2026 — work/local/gates/clangs.mjs renders the audition again.
  gateClang: { label: '= Gate Clang', category: 'Perc', homeLane: 'crash', dur: 8,
    note: 'The cymbal cluster pitched down and fed back round its bandpass through the '
      + 'resonator, over a low thud: old iron, clangy and a bit trashy, still humming after '
      + 'it is struck.',
    osc: { type: 'sine', from: 135, to: 62, sweep: 0.08, decay: 0.18, curve: 'exp', gain: 0.45 },
    noise: { type: 'bandpass', freq: 2400, Q: 0.9, decay: 0.03, gain: 0.4 },
    metal: { wave: 'square', freq: 290, spread: 1.15, count: 6, filter: 'bandpass', hp: 1700, Q: 3.5, decay: 1.1, gain: 0.9, resonator: { feedback: 0.965, drive: 1.6 } },
    drive: 0.279812 },
  rimClang: { label: '= Clang Rim', category: 'Rim', homeLane: 'rim', dur: 0.5,
    note: 'One oscillator bent by another at an unmusical ratio, then folded. Metal '
      + 'rather than wood — the rim for a song with no acoustic pretensions at all.',
    osc: { type: 'square', from: 520, to: 470, sweep: 0.02, decay: 0.11, curve: 'exp', gain: 0.8,
      fm: { type: 'sine', ratio: 3.7, index: 2.2, decay: 0.03 } },
    noise: { type: 'highpass', freq: 5200, slope: -24, decay: 0.02, gain: 0.3 },
    drive: 0.242991, shape: 'fold' },
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
    drive: 0.197831,
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

  // ---- two tuned bodies ----------------------------------------------------
  //
  // `osc2`: the same oscillator section a second time, with its own tuning, its own
  // pitch envelope and its own amp envelope. One oscillator and the fixed KNOCK could
  // approximate each of these and state none of them — the three classic drums below
  // are all a PAIR of tuned bodies, and what makes each of them the sound it is is the
  // relationship between the two, which a welded-in punch layer cannot have.
  snareTwoBody: { label: '= Two-Body Snare', category: 'Snare', homeLane: 'snare', dur: 1,
    note: 'The 808 snare as it is actually built: two tuned bodies a fifth and a bit '
      + 'apart, each barely falling, with the noise outlasting both. The upper one is '
      + 'the whole difference between a snare and a tom with a hiss on it.',
    osc: { type: 'triangle', from: 185, to: 176, sweep: 0.025, decay: 0.09, curve: 'exp', gain: 0.85 },
    osc2: { type: 'triangle', from: 330, to: 315, sweep: 0.02, decay: 0.055, curve: 'exp', gain: 0.5 },
    noise: { type: 'bandpass', freq: 2400, Q: 1.2, decay: 0.14, gain: 0.9 },
    drive: 0.168059 },
  tomSimmons: { label: '= Simmons Tom', category: 'Tom', homeLane: 'tom', dur: 1.2,
    note: 'Two sines starting six hertz apart and falling at different RATES, so the '
      + 'beat between them slows as the drum drops. That drift is the electronic tom '
      + 'of the early eighties, and it needs two pitch envelopes to exist at all.',
    osc: { type: 'sine', from: 220, to: 62, sweep: 0.28, decay: 0.42, curve: 'exp', gain: 1 },
    osc2: { type: 'sine', from: 226, to: 96, sweep: 0.5, pitchCurve: 'lin', decay: 0.5, curve: 'exp', gain: 0.5 },
    noise: { type: 'highpass', freq: 3200, slope: -24, decay: 0.012, gain: 0.35 },
    drive: 0.247319 },
  kickClickTop: { label: '= Click-Top Kick', category: 'Kick', homeLane: 'kick', dur: 1.2,
    note: 'A 909 kick is a body and a separately tuned CLICK, not one oscillator with a '
      + 'fast front on it: the top falls from 1.6 kHz to 320 Hz in four milliseconds '
      + 'while the body underneath has barely started to move.',
    osc: { type: 'sine', from: 128, to: 46, sweep: 0.06, pitchCurve: 'snap', decay: 0.5, curve: 'exp', gain: 1 },
    osc2: { type: 'triangle', from: 1600, to: 320, sweep: 0.004, decay: 0.014, curve: 'exp', gain: 0.5 },
    drive: 0.278115 },

  // ---- the engine's own kit, as data ---------------------------------------
  //
  // Not new sounds: the three hand-written drums in `scheduleStep` that the KLNG8
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
  kickEngine: { label: '= Arcade Kick', category: 'Kick', homeLane: 'kick', dur: 1,
    note: 'The game’s own kick, written down: a sine dropping 165 to 48 Hz with a short '
      + 'highpassed beater click and the 300 Hz knock that lets it read on a phone.',
    osc: { type: 'sine', from: 165, to: 48, sweep: 0.05, attack: 0.006, decay: 0.305, curve: 'exp', gain: 1 },
    knock: 0.4,
    noise: { type: 'highpass', freq: 1900, Q: 1, decay: 0.0198, gain: 0.31 } },
  // The same kick at the two tunings the game actually plays it at. `Arcade Kick`,
  // `Shop Kick` and `Megamix Kick` are ENGINE presets — two bank keys each, `kickTail`
  // and `kickKnock`, which is all the hand-written kick has to be tuned by — so a song
  // could have those tunings and could not edit them. These are the same three sounds
  // as KLNG8 presets, where every part of them is on a knob.
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
  snareEngine: { label: '= Arcade Snare', category: 'Snare', homeLane: 'snare', dur: 1,
    note: 'The game’s own snare: a 2.6 kHz band of noise with a triangle body falling '
      + '210 to 140 Hz under it. The backbeat every song was balanced against.',
    osc: { type: 'triangle', from: 210, to: 140, sweep: 0.05, decay: 0.1031, curve: 'exp', gain: 0.375 },
    noise: { type: 'bandpass', freq: 2600, Q: 0.7, decay: 0.1437, gain: 1 } },
  clapEngine: { label: '= Arcade Clap', category: 'Clap', homeLane: 'clap', dur: 1,
    note: 'The game’s own clap: three highpassed bursts twelve milliseconds apart, the '
      + 'LAST of them the loudest and four times as long — two slaps, then the room.',
    noise: { type: 'highpass', freq: 1500, Q: 1, decay: 0.0544, gain: 1 },
    taps: [0, 0.012, 0.024], tapGains: [1, 1, 1.625], tapDecays: [0.0544, 0.0544, 0.2092] },
  hatEngine: { label: '= Arcade Hat', category: 'Hats', homeLane: 'hats', dur: 0.5,
    note: 'The game’s own closed hat, exactly: noise above 5.2 kHz, gone in fifty '
      + 'milliseconds. The tick under two thirds of the soundtrack.',
    noise: { type: 'highpass', freq: 5200, Q: 1, decay: 0.0932, gain: 1 } },
  ohatEngine: { label: '= Arcade Open Hat', category: 'Hats', homeLane: 'ohats', dur: 2,
    note: 'The game’s own open hat: the same noise a thousand hertz lower, left to '
      + 'sizzle for a fifth of a second.',
    noise: { type: 'highpass', freq: 4200, Q: 1, decay: 0.4232, gain: 1 } },
  tomEngine: { label: '= Arcade Tom', category: 'Tom', homeLane: 'tom', dur: 1,
    note: 'The game’s own tom: a triangle falling most of an octave onto the lane’s own '
      + 'note. Tuned by the lane, the way the engine tunes it.',
    osc: { type: 'triangle', from: 234, to: 130, sweep: 0.08, attack: 0.004, decay: 0.4606, curve: 'exp', gain: 1 } },
  rimEngine: { label: '= Arcade Rim', category: 'Rim', homeLane: 'rim', dur: 0.5,
    note: 'The game’s own rimshot: three inharmonic squares sagging as they ring through '
      + 'a narrow band, a stick snap over the top and a woody tonk underneath — with the '
      + 'two-stage decay that makes it a strike rather than a fade.',
    osc: { type: 'triangle', from: 430, to: 300, sweep: 0.05, decay: 0.0833, curve: 'exp', gain: 0.38 },
    noise: { type: 'highpass', freq: 3200, Q: 1, decay: 0.0165, gain: 0.45 },
    metal: { wave: 'square', freq: 1720, to: 1617, sweep: 0.06, ratios: [1, 1.5291, 1.9477], count: 3,
      filter: 'bandpass', hp: 1750, Q: 3.6, decay: 0.1, sag: 0.16, sagAt: 0.02, gain: 1 } },
  crashEngine: { label: '= Arcade Crash', category: 'Crash', homeLane: 'crash', dur: 5,
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

  dsCrackSnare2: { label: 'Crack Snare', category: 'Snare', dur: 1,
    note: 'Tight and driven: a short square knock, highpassed air, everything over in a tenth '
      + 'of a second. The backbeat for fast songs.',
    osc: { type: 'square', from: 255, to: 440, sweep: 0.025, decay: 0.05, curve: 'exp', gain: 0.55 },
    noise: { type: 'highpass', freq: 2900, Q: 0.8, decay: 0.3, gain: 1 },
    drive: 0.441115 },
  dsClosedHat2: { label: 'Sharp Synth Hat', category: 'Hats', dur: 0.5,
    note: 'A resonant highpassed tick — sharper than the plain closed hat, closer to metal '
      + 'without being metal.',
    noise: { type: 'highpass', freq: 6275, Q: 5.1, decay: 0.3, gain: 1.72, to: 2800, sweep: 0.31 } },
  engineCrash: { label: '= Arcade Crash', category: 'Crash', homeLane: 'crash', dur: 5,
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
  // These are deliberately all KLNG8 entries: the family resemblance is in
  // the construction, not just in the label. They are starting points for listening,
  // not claims of component-level recreations of the original hardware.
  ds909Kick: { label: '=909 Kick', category: 'Kick', homeLane: 'kick', dur: 2,
    note: 'A compact 909-style kick: hard beater click, fast pitch drop and a firm '
      + 'low body that stays out of the sub for the next bass note.',
    osc: { type: 'sine', from: 185, to: 45, sweep: 0.035, attack: 0.001, decay: 0.42, curve: 'exp', gain: 1 },
    noise: { type: 'highpass', freq: 2600, Q: 1.2, decay: 0.012, gain: 0.34 },
    drive: 0.312548 },
  ds909KickPunch: { label: '=909 Kick Punch', category: 'Kick', homeLane: 'kick', dur: 1,
    note: 'A shorter, louder 909-style kick with a more obvious front edge and a '
      + 'tighter tail for four-on-the-floor patterns.',
    osc: { type: 'sine', from: 225, to: 52, sweep: 0.025, attack: 0.001, decay: 0.24, curve: 'exp', gain: 1 },
    noise: { type: 'bandpass', freq: 1450, Q: 1.1, decay: 0.018, gain: 0.52 },
    drive: 0.447312 },
  ds909Snare: { label: '=909 Snare', category: 'Snare', homeLane: 'snare', dur: 1,
    note: 'A bright 909-style snare: a pitched shell under a wide, slightly metallic noise '
      + 'burst with enough decay to carry a backbeat.',
    osc: { type: 'triangle', from: 135, to: 285, sweep: 0.03, decay: 0.165, curve: 'exp', gain: 0.72, hold: 0 },
    knock: 1,
    noise: { type: 'bandpass', freq: 1950, Q: 0.8, decay: 0.88, gain: 1.62, hold: 0.019, attack: 0.001, color: 'white', slope: -24, sweep: 0.155 },
    drive: 0.277373, shape: 'fold',
    trim: 1.6 },
  ds909SnareCrack: { label: '=909 Snare Crack', category: 'Snare', homeLane: 'snare', dur: 1,
    note: 'A sharper 909-style snare variant with a square shell and high-passed '
      + 'wire noise for a more aggressive dance-floor backbeat.',
    osc: { type: 'square', from: 260, to: 190, sweep: 0.022, decay: 0.06, curve: 'exp', gain: 0.5 },
    noise: { type: 'highpass', freq: 3100, Q: 0.9, decay: 0.12, gain: 1 },
    drive: 0.414465 },
  ds909Clap: { label: '=909 Clap', category: 'Clap', homeLane: 'clap', dur: 1,
    note: 'A dry 909-style clap built from four close bursts, with a bright first hit '
      + 'and a short room-like tail on the last hand.',
    noise: { type: 'bandpass', freq: 1850, to: 1200, sweep: 0.11, Q: 1.5, decay: 0.14, gain: 1 },
    taps: [0, 0.009, 0.019, 0.032], tapFalloff: 0.82 },
  ds909OpenHat: { label: '=909 Open Hat', category: 'Hats', homeLane: 'ohats', dur: 2,
    note: 'The open partner to =909 Hat: the same bright attack opening into a '
      + 'controlled metallic wash instead of a long cymbal tail.',
    noise: { type: 'highpass', freq: 7600, to: 5200, sweep: 0.35, Q: 1.2, decay: 0.38, gain: 1 },
    drive: 0.217597 },
  ds909Tom: { label: '=909 Tom', category: 'Tom', homeLane: 'tom', dur: 1,
    note: 'A tuned 909-style tom with a clean electronic pitch fall and a small '
      + 'low skin click at the front of the note.',
    osc: { type: 'sine', from: 260, to: 125, sweep: 0.08, decay: 0.34, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 1500, Q: 0.8, decay: 0.025, gain: 0.2 },
    drive: 0.120223 },
  ds909Rim: { label: '=909 Rim', category: 'Rim', homeLane: 'rim', dur: 0.5,
    note: 'A hard 909-style rim hit: a short square tick over a narrow resonant '
      + 'ring that makes the stick sound cut through a busy pattern.',
    osc: { type: 'square', from: 980, to: 760, sweep: 0.008, decay: 0.03, curve: 'lin', gain: 0.22 },
    noise: { type: 'highpass', freq: 4300, Q: 2.2, decay: 0.018, gain: 0.36 },
    ring: { freq: 1650, Q: 95, hit: 0.001, decay: 0.1, gain: 1 },
    drive: 0.141845 },
  ds909Crash: { label: '=909 Crash', category: 'Crash', homeLane: 'crash', dur: 5,
    note: 'A bright 909-style crash with a dense front and a high end that darkens '
      + 'as it decays, intended for phrase changes rather than every bar.',
    noise: { type: 'lowpass', freq: 9200, to: 2400, sweep: 0.9, Q: 0.8, decay: 1.35, gain: 1 },
    metal: { wave: 'square', freq: 610, spread: 1, count: 6, hp: 3300, Q: 0.8, decay: 0.65, gain: 0.8 },
    drive: 0.456924 },

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
    drive: 0.082205 },
  dsCr78Tom: { label: '=CR78 Tom', category: 'Tom', homeLane: 'tom', dur: 1,
    note: 'A rounded CR78-style tom with a short pitch drop, tuned for simple fills '
      + 'and little call-and-response figures.',
    osc: { type: 'sine', from: 220, to: 145, sweep: 0.055, decay: 0.28, curve: 'exp', gain: 1 } },

  ds808Kick: { label: '=808 Kick', category: 'Kick', homeLane: 'kick', dur: 3,
    note: 'A long 808-style sub kick: deep sine drop, soft front click and a tail '
      + 'that can become the bass line when it is tuned in a pattern.',
    osc: { type: 'sine', from: 170, to: 36, sweep: 0.06, attack: 0.001, decay: 0.78, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 2200, Q: 0.7, decay: 0.02, gain: 0.25 },
    drive: 0.121058 },
  ds808Snare: { label: '=808 Snare', category: 'Snare', homeLane: 'snare', dur: 1,
    note: 'A round 808-style snare with a low electronic shell under a broad, slightly '
      + 'darker noise body than the sharper 909 family.',
    osc: { type: 'triangle', from: 190, to: 145, sweep: 0.035, decay: 0.13, curve: 'exp', gain: 0.62 },
    noise: { type: 'bandpass', freq: 1750, Q: 0.7, decay: 0.18, gain: 1 },
    drive: 0.163974 },
  ds808Clap: { label: '=808 Clap', category: 'Clap', homeLane: 'clap', dur: 1,
    note: 'A wide 808-style clap with a low, roomy burst and four taps that spread '
      + 'into a soft machine-room tail.',
    noise: { type: 'bandpass', freq: 1450, to: 950, sweep: 0.16, Q: 1, decay: 0.18, gain: 1 },
    taps: [0, 0.012, 0.027, 0.046], tapFalloff: 0.86 },
  ds808OpenHat: { label: '=808 Open Hat', category: 'Hats', homeLane: 'ohats', dur: 2,
    note: 'The open 808-style cymbal partner: the same inharmonic cluster left ringing '
      + 'with a lower filter so its body is audible as it fades, plus a restrained resonant tail.',
    metal: { freq: 540, spread: 1, count: 6, hp: 6100, Q: 0.9, slope: -24, decay: 0.42,
      resonator: { feedback: 0.92, drive: 1.2, leak: 0.00025 } },
    humanize: { gain: 0.04 } },
  ds808Cowbell: { label: '=808 Cowbell', category: 'Perc', homeLane: 'tom', dur: 1,
    note: 'The actual TR-808 cowbell topology: simultaneous 540 and 800 Hz squares '
      + 'through a 1.3 kHz bandpass, with a 200ms exponential VCA cut-off.',
    metal: { wave: 'square', freq: 540, ratios: [1, 1.481481], spread: 1, count: 2,
      filter: 'bandpass', hp: 1300, Q: 4, slope: -12, attack: 0, decay: 0.2,
      floor: 0.001, hardStop: true,
      resonator: { feedback: 0.96, drive: 1.4, leak: 0.0005 } } },
  tr808CowbellClassic: { label: 'Classic 808 Cowbell', category: 'Perc', homeLane: 'tom', dur: 1,
    note: 'The reference TR-808 balance: 540 and 800 Hz squares, a 1.3 kHz 12 dB/oct '
      + 'bandpass at Q4, and a 200ms exponential decay to the -60 dB floor.',
    metal: { wave: 'square', freq: 540, ratios: [1, 1.481481], spread: 1, count: 2,
      filter: 'bandpass', hp: 1300, Q: 4, slope: -12, attack: 0, decay: 0.2,
      floor: 0.001, hardStop: true,
      resonator: { feedback: 0.96, drive: 1.4, leak: 0.0005 } } },
  tr808CowbellLow: { label: 'TR-808 Cowbell · Soft 2-Pole', category: 'Perc', homeLane: 'tom', dur: 1,
    note: 'The softer 2-pole TR-808 option: the same 540 and 800 Hz squares and 1.3 kHz '
      + 'bandpass, opened to Q3.5 for a little more body around the hit.',
    metal: { wave: 'square', freq: 540, ratios: [1, 1.481481], spread: 1, count: 2,
      filter: 'bandpass', hp: 1300, Q: 3.5, slope: -12, attack: 0, decay: 0.2,
      floor: 0.001, hardStop: true,
      resonator: { feedback: 0.94, drive: 1.4, leak: 0.0005 } } },
  tr808CowbellHard: { label: 'TR-808 Cowbell · Hard', category: 'Perc', homeLane: 'tom', dur: 1,
    note: 'The sharper 4-pole TR-808 option: the same 540 and 800 Hz squares and 1.3 kHz '
      + 'centre, with Q5 and a 24 dB/oct bandpass for a tighter metallic edge.',
    metal: { wave: 'square', freq: 540, ratios: [1, 1.481481], spread: 1, count: 2,
      filter: 'bandpass', hp: 1300, Q: 5, slope: -24, attack: 0, decay: 0.2,
      floor: 0.001, hardStop: true,
      resonator: { feedback: 0.975, drive: 1.4, leak: 0.0005 } } },
  ds808Tom: { label: '=808 Tom', category: 'Tom', homeLane: 'tom', dur: 2,
    note: 'A deep 808-style tom with a long sine drop and a clean, rounded tail for '
      + 'syncopated fills and tuned percussion lines.',
    osc: { type: 'sine', from: 215, to: 92, sweep: 0.1, decay: 0.48, curve: 'exp', gain: 1 },
    drive: 0.099843 },

  // ---- requested KLNG8 percussion pack -------------------------------------
  // These keep the original family sounds above intact and give the picker several
  // deliberately different starting points for the four percussion jobs people tend
  // to reach for first: cowbell, open hat, rimshot and conga.
  ohatSustainMetal: { label: 'Open Hat · Sustained Metal', category: 'Hats', homeLane: 'ohats', dur: 3,
    note: 'A long open hat built from the 808-style inharmonic cluster, with enough body '
      + 'to carry an offbeat through a sparse arrangement and a gentle resonant tail.',
    metal: { freq: 540, spread: 1.02, count: 6, hp: 5900, Q: 0.9, slope: -24, decay: 0.72,
      resonator: { feedback: 0.93, drive: 1.25, leak: 0.00035 } },
    humanize: { gain: 0.05 } },
  ohatSustainAir: { label: 'Open Hat · Air Tail', category: 'Hats', homeLane: 'ohats', dur: 3,
    note: 'A bright, airy open hat with a rising front and a sustained highpassed tail that '
      + 'stays above the bass without turning into a crash.',
    noise: { type: 'highpass', freq: 7200, to: 4700, sweep: 0.62, Q: 1.15, decay: 0.68, gain: 1 },
    drive: 0.190259 },
  ohatSustainWash: { label: 'Open Hat · Dark Wash', category: 'Hats', homeLane: 'ohats', dur: 4,
    note: 'A slower, darker open hat wash: resonant air closes down over a long tail for '
      + 'wide gaps and half-time grooves.',
    noise: { type: 'bandpass', freq: 5800, to: 2500, sweep: 0.9, Q: 1.4, decay: 0.92, gain: 1 },
    drive: 0.104604 },
  rimshot808: { label: 'Rimshot · 808 Crack', category: 'Rim', homeLane: 'rim', dur: 0.5,
    note: 'A proper electronic rimshot: a dry stick crack, a narrow resonant shell and a '
      + 'bright edge that cuts through a closed hat pattern.',
    osc: { type: 'square', from: 980, to: 760, sweep: 0.008, decay: 0.032, curve: 'lin', gain: 0.28 },
    noise: { type: 'highpass', freq: 4700, Q: 2.4, decay: 0.018, gain: 0.42 },
    ring: { freq: 1680, Q: 100, hit: 0.001, decay: 0.11, gain: 1.08 },
    drive: 0.174976 },
  rimshotWood: { label: 'Rimshot · Wood Crack', category: 'Rim', homeLane: 'rim', dur: 0.5,
    note: 'A rounder rimshot with a woody low knock under the stick and a short shell ring, '
      + 'useful when the bright 808 crack is too hard.',
    osc: { type: 'triangle', from: 720, to: 560, sweep: 0.012, decay: 0.05, curve: 'exp', gain: 0.42 },
    noise: { type: 'bandpass', freq: 3300, Q: 3.2, decay: 0.026, gain: 0.5 },
    ring: { freq: 1120, Q: 68, hit: 0.0025, decay: 0.17, gain: 1.12 },
    drive: 0.075501 },
  rimshotLaser: { label: 'Rimshot · Laser Edge', category: 'Rim', homeLane: 'rim', dur: 0.5,
    note: 'A high electronic rimshot: a sharp descending edge over a narrow bright ring, '
      + 'for a more synthetic backbeat than the 808 or wood variants.',
    osc: { type: 'sawtooth', from: 1850, to: 720, sweep: 0.006, decay: 0.028, curve: 'lin', gain: 0.24 },
    noise: { type: 'highpass', freq: 6200, Q: 2.8, decay: 0.014, gain: 0.36 },
    ring: { freq: 2380, Q: 88, hit: 0.0012, decay: 0.095, gain: 0.92 },
    drive: 0.216577 },
  congaHigh: { label: 'Conga · High', category: 'Perc', homeLane: 'tom', dur: 1,
    note: 'A high conga: a short pitched slap into a light skin body, tuned for the top '
      + 'voice of a three-drum conga figure.',
    osc: { type: 'triangle', from: 375, to: 285, sweep: 0.028, decay: 0.2, curve: 'exp', gain: 0.82 },
    noise: { type: 'lowpass', freq: 2400, Q: 0.7, decay: 0.018, gain: 0.32 },
    drive: 0.068785 },
  congaMid: { label: 'Conga · Mid', category: 'Perc', homeLane: 'tom', dur: 1,
    note: 'A centered open conga with a warm falling body and a little shell noise on the '
      + 'front, designed to answer the high and low voices cleanly.',
    osc: { type: 'sine', from: 285, to: 205, sweep: 0.045, decay: 0.32, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 1700, Q: 0.65, decay: 0.022, gain: 0.3 },
    drive: 0.098995 },
  congaLow: { label: 'Conga · Low', category: 'Perc', homeLane: 'tom', dur: 1.5,
    note: 'A low conga with a deeper resonant body and longer natural tail for the bottom '
      + 'voice in a rolling Latin or electro percussion line.',
    osc: { type: 'sine', from: 220, to: 135, sweep: 0.065, decay: 0.46, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 1250, Q: 0.65, decay: 0.028, gain: 0.34 },
    drive: 0.123097 },
  congaSlap: { label: 'Conga · Slap', category: 'Perc', homeLane: 'tom', dur: 1,
    note: 'A dry hand slap for the conga family: bright attack, little pitched body and a '
      + 'quick decay that leaves room for the open tones.',
    osc: { type: 'triangle', from: 620, to: 455, sweep: 0.018, decay: 0.075, curve: 'exp', gain: 0.58 },
    noise: { type: 'highpass', freq: 2500, Q: 1.4, decay: 0.042, gain: 0.78 },
    drive: 0.201361 },
  // ---- merengue: the güira and the tambora (5 Oct 2026, for Merenhouse) ------
  guiraScrape: { label: 'Güira · Scrape', category: 'Perc', homeLane: 'rim', dur: 0.5,
    note: 'The long stroke of a merengue güira: a brush dragged down a ridged metal can, '
      + 'six ridges fourteen milliseconds apart, each a touch louder and brighter than the '
      + 'last, the final one left to ring. Put it on the beat under the short scrapes.',
    noise: { type: 'bandpass', freq: 6800, Q: 2.2, attack: 0.002, decay: 0.014, gain: 1 },
    ring: { freq: 5300, Q: 30, hit: 0.0008, decay: 0.03, gain: 0.25 },
    taps: [0, 0.014, 0.028, 0.042, 0.056, 0.07], tapGains: [0.55, 0.65, 0.75, 0.85, 0.95, 1],
    tapDecays: [0.014, 0.014, 0.014, 0.014, 0.014, 0.06], tapTone: 1.03 },
  guiraChk: { label: 'Güira · Chk', category: 'Perc', homeLane: 'rim', dur: 0.5,
    note: 'The short scrape of a güira: two ridges under the brush and a tin edge. Sixteenths '
      + 'of it are the merengue hat.',
    noise: { type: 'bandpass', freq: 7600, Q: 1.8, attack: 0.001, decay: 0.022, gain: 1 },
    ring: { freq: 5300, Q: 30, hit: 0.0006, decay: 0.02, gain: 0.2 },
    taps: [0, 0.008], tapGains: [0.7, 1] },
  tambora: { label: 'Tambora', category: 'Perc', homeLane: 'tom', dur: 1,
    note: 'The merengue two-headed drum: a stick on the wooden shell (a short knock at 1.1 kHz '
      + 'and a click) over the low skin, which falls from 190 to 135 Hz.',
    osc: { type: 'sine', from: 190, to: 135, sweep: 0.04, decay: 0.24, curve: 'exp', gain: 1 },
    noise: { type: 'highpass', freq: 3000, Q: 0.8, decay: 0.012, gain: 0.35 },
    ring: { freq: 1100, Q: 18, hit: 0.002, decay: 0.045, gain: 0.45 },
    drive: 0.110673 },
  // ---- West African hand drums (6 Oct 2026, for the Afro house sketches) ------
  djembeBass: { label: 'Djembe · Bass', category: 'Perc', homeLane: 'tom', dur: 1,
    note: 'The open palm in the middle of a djembe: a deep round boom falling from 110 to '
      + '72 Hz, a soft skin thud on the front and no ring.',
    osc: { type: 'sine', from: 110, to: 72, sweep: 0.05, decay: 0.34, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 900, Q: 0.7, decay: 0.022, gain: 0.28 },
    drive: 0.100121 },
  djembeTone: { label: 'Djembe · Tone', category: 'Perc', homeLane: 'tom', dur: 1,
    note: 'The flat fingers at the djembe\'s edge: a ringing open note around 330 Hz with the '
      + 'goatskin\'s overtone over it — the voice the rhythms are sung on.',
    osc: { type: 'triangle', from: 345, to: 290, sweep: 0.03, decay: 0.17, curve: 'exp', gain: 0.85 },
    noise: { type: 'lowpass', freq: 2600, Q: 0.7, decay: 0.016, gain: 0.3 },
    ring: { freq: 690, Q: 14, hit: 0.0015, decay: 0.07, gain: 0.25 },
    drive: 0.104731 },
  djembeSlap: { label: 'Djembe · Slap', category: 'Perc', homeLane: 'rim', dur: 0.5,
    note: 'The cupped slap at the djembe\'s edge: a bright crack of skin with only a little '
      + 'pitch under it — the accent that cuts through a whole ensemble.',
    osc: { type: 'triangle', from: 560, to: 440, sweep: 0.012, decay: 0.045, curve: 'exp', gain: 0.45 },
    noise: { type: 'highpass', freq: 1900, Q: 1.3, decay: 0.05, gain: 0.95 },
    drive: 0.281466 },
  talkingDrum: { label: 'Talking Drum', category: 'Perc', homeLane: 'tom', dur: 1,
    note: 'An hourglass drum squeezed under the arm as it is struck: the note bends UP from 150 '
      + 'to 235 Hz over a tenth of a second — the "doo-OOP" that calls and answers.',
    osc: { type: 'sine', from: 150, to: 235, sweep: 0.11, decay: 0.36, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 1500, Q: 0.7, decay: 0.02, gain: 0.3 },
    drive: 0.119036 },
  // ---- bongos (6 Oct 2026, for the Reggaeton Romántico sketch) ---------------
  bongoHigh: { label: 'Bongo · High', category: 'Perc', homeLane: 'tom', dur: 0.5,
    note: 'The small bongo: a tight bright pop around 500 Hz with a crack of skin on the '
      + 'front and a short ring — the voice the martillo rides on.',
    osc: { type: 'triangle', from: 540, to: 450, sweep: 0.02, decay: 0.09, curve: 'exp', gain: 0.8 },
    noise: { type: 'highpass', freq: 2400, Q: 1, decay: 0.02, gain: 0.45 },
    ring: { freq: 1060, Q: 10, hit: 0.001, decay: 0.04, gain: 0.2 },
    drive: 0.150759 },
  bongoLow: { label: 'Bongo · Low', category: 'Perc', homeLane: 'tom', dur: 0.5,
    note: 'The large bongo: rounder and a fifth lower than the macho, a little longer — the '
      + 'open note that answers it.',
    osc: { type: 'triangle', from: 390, to: 315, sweep: 0.025, decay: 0.13, curve: 'exp', gain: 0.9 },
    noise: { type: 'highpass', freq: 1900, Q: 0.9, decay: 0.02, gain: 0.35 },
    ring: { freq: 760, Q: 9, hit: 0.001, decay: 0.05, gain: 0.18 },
    drive: 0.126672 },
  shekere: { label: 'Shekere', category: 'Perc', homeLane: 'rim', dur: 0.5,
    note: 'A dried gourd in a net of beads: a soft swell of mid-high rattle with the beads '
      + 'landing a hair after it. Rounder and woodier than a shaker.',
    noise: { type: 'bandpass', freq: 4300, Q: 1.3, attack: 0.01, decay: 0.07, gain: 1 },
    taps: [0, 0.011, 0.024], tapGains: [0.6, 1, 0.45] },
  // ---- cowbells and claves, after the Sound On Sound analysis ---------------
  //
  // "Synthesizing Cowbells & Claves" measured a real CR8000 and found the cowbell is
  // TWO tones at 587 and 845 Hz — a 1:1.44 ratio — as TRIANGLES rather than pulses
  // (pulse came out "far too bright and synth-y"), through a 12 dB/oct BANDPASS at
  // 2.64 kHz with resonance, under a two-stage envelope: a short high-amplitude
  // impact and then an extended tail. That last part is the whole sound. The 808's
  // own cowbell gates itself off at 200 ms, which is why `ds808Cowbell` and the three
  // `tr808Cowbell*` presets carry `hardStop` — accurate, and far too short to be the
  // thing a groove leans on. Everything below drops the gate and spends the length in
  // `sag`/`sagAt` instead: the impact stays as hard as the 808's, and what follows it
  // rings for half a beat to a whole one.
  //
  // The clave in the same article is a Bridged-T network — an oscillator that arrives
  // already decaying — restated as a triangle, a very short decay and a filter at ZERO
  // resonance, which is the opposite of the cowbell's and the reason a clave reads as
  // wood rather than metal. The 808's is centred at 2.5 kHz.
  cbSosTriangle: { label: 'Cowbell · SOS Triangle', category: 'Perc', homeLane: 'tom', dur: 2,
    note: 'The Sound On Sound cowbell verbatim: 587 and 845 Hz triangles at the measured '
      + '1:1.44 ratio, a resonant 12 dB/oct bandpass at 2.64 kHz, and a two-stage envelope '
      + 'that hits like the 808 and then rings for two thirds of a second.',
    metal: { wave: 'triangle', freq: 587, ratios: [1, 1.44], count: 2, spread: 1,
      filter: 'bandpass', hp: 2640, Q: 3, slope: -12,
      attack: 0, decay: 0.8, sag: 0.3, sagAt: 0.028, gain: 1.15 },
    drive: 0.070914 },
  cbSosLongTail: { label: 'Cowbell · Long Tail', category: 'Perc', homeLane: 'tom', dur: 3,
    note: 'The same 587/845 triangle pair with the tail taken as far as it goes: the impact '
      + 'falls to a sixth of its level in 22 ms and the remainder rings out over a second '
      + 'and a third. The one to reach for when the cowbell IS the part.',
    metal: { wave: 'triangle', freq: 587, ratios: [1, 1.44], count: 2, spread: 1,
      filter: 'bandpass', hp: 2560, Q: 3.4, slope: -12,
      attack: 0, decay: 1.35, sag: 0.16, sagAt: 0.022, gain: 1.2 },
    drive: 0.056029 },
  cb808Unclamped: { label: 'Cowbell · 808 Unclamped', category: 'Perc', homeLane: 'tom', dur: 2,
    note: 'The actual TR-808 topology — 540 and 800 Hz squares through a 1.3 kHz bandpass '
      + 'at Q4 — with the 200 ms hardware gate taken off. Same front as the factory bell, '
      + 'three and a half times the ring, with a controlled resonant tail.',
    metal: { wave: 'square', freq: 540, ratios: [1, 1.481481], count: 2, spread: 1,
      filter: 'bandpass', hp: 1300, Q: 4, slope: -12,
      attack: 0, decay: 0.88, sag: 0.34, sagAt: 0.03, gain: 1,
      resonator: { feedback: 0.95, drive: 1.35, leak: 0.0004 } },
    drive: 0.08064 },
  cbStruckRing: { label: 'Cowbell · Struck Ring', category: 'Perc', homeLane: 'tom', dur: 2,
    note: 'The article’s one-oscillator trick, stated in KLNG8 words: a single 587 Hz '
      + 'triangle for the body and a resonator standing in for the second tone at 845 Hz, '
      + 'driven hard so the 2.64 kHz bandpass after the shaper has harmonics to find.',
    osc: { type: 'triangle', from: 594, to: 587, sweep: 0.006, curve: 'exp',
      decay: 0.72, sag: 0.3, sagAt: 0.03, gain: 0.85 },
    ring: { freq: 845, Q: 110, hit: 0.0015, decay: 0.55, sag: 0.35, sagAt: 0.03, gain: 0.9 },
    drive: 0.114293, tone: { type: 'bandpass', freq: 2640, Q: 0.9 } },
  cbAgogoWide: { label: 'Cowbell · Wide Agogô', category: 'Perc', homeLane: 'tom', dur: 2,
    note: 'The ratio pulled well past the measured 1.44 to 1.58 and the pair moved up to '
      + '620 Hz: higher, hollower and more agogô than cowbell, with a 24 dB/oct bandpass '
      + 'at 3.1 kHz keeping it narrow through a nine-tenths-of-a-second tail and a metallic '
      + 'resonant lift.',
    metal: { wave: 'square', freq: 620, ratios: [1, 1.58], count: 2, spread: 1,
      filter: 'bandpass', hp: 3100, Q: 3.5, slope: -24,
      attack: 0, decay: 1.05, sag: 0.28, sagAt: 0.025, gain: 1.1,
      resonator: { feedback: 0.94, drive: 1.3, leak: 0.0004 } },
    drive: 0.129576 },

  clvSosBridgedT: { label: 'Clave · SOS Bridged-T', category: 'Perc', homeLane: 'rim', dur: 0.5,
    note: 'The Bridged-T clave rebuilt from an oscillator and a contour: a 2.5 kHz triangle '
      + 'with the slight droop the real network has, a 50 ms decay and a lowpass at zero '
      + 'resonance — the filter is there to place the band, not to ring.',
    osc: { type: 'triangle', from: 2560, to: 2480, sweep: 0.012, curve: 'exp',
      attack: 0.0005, decay: 0.05, gain: 1 },
    tone: { type: 'lowpass', freq: 6000, Q: 0.7 } },
  clv808Hard: { label: 'Clave · 808 Hard', category: 'Perc', homeLane: 'rim', dur: 0.5,
    note: 'The 2.5 kHz centre driven and cut shorter, with six milliseconds of highpassed '
      + 'noise for the stick contact. Reads through a busy hat pattern where the plain '
      + 'triangle disappears.',
    osc: { type: 'triangle', from: 2540, to: 2470, sweep: 0.008, curve: 'exp',
      attack: 0.0004, decay: 0.038, gain: 1 },
    noise: { type: 'highpass', freq: 5200, Q: 0.7, decay: 0.006, gain: 0.35 },
    drive: 0.235601, tone: { type: 'lowpass', freq: 8000, Q: 0.7 } },
  clvRosewood: { label: 'Clave · Rosewood', category: 'Perc', homeLane: 'rim', dur: 0.5,
    note: 'A lower, rounder pair of sticks: the body drops to 1.85 kHz for the wood and a '
      + 'narrow resonator at 2.5 kHz puts the snap back on top of it. Warmer than the 808 '
      + 'and closer to the thing being hit.',
    osc: { type: 'triangle', from: 1900, to: 1790, sweep: 0.016, curve: 'exp',
      attack: 0.0006, decay: 0.075, gain: 0.9 },
    ring: { freq: 2500, Q: 70, hit: 0.001, decay: 0.045, gain: 0.6 },
    tone: { type: 'lowpass', freq: 5200, Q: 0.7 } },
  clvBrightSnap: { label: 'Clave · Bright Snap', category: 'Perc', homeLane: 'rim', dur: 0.5,
    note: 'Higher and harder — 3.2 kHz, thirty milliseconds and a folded shaper instead of '
      + 'a soft one, so more level makes it edgier rather than louder. Almost a rimshot '
      + 'with the shell taken away.',
    osc: { type: 'triangle', from: 3200, to: 3020, sweep: 0.006, curve: 'exp',
      attack: 0.0003, decay: 0.03, gain: 0.95 },
    drive: 0.373674, shape: 'fold', tone: { type: 'lowpass', freq: 9000, Q: 0.7 },
    trim: -0.568491 },
  clvDoubleStrike: { label: 'Clave · Double Strike', category: 'Perc', homeLane: 'rim', dur: 0.5,
    note: 'The 2.5 kHz clave struck twice 8.5 ms apart, the second a touch flatter and half '
      + 'the level. One hit with a thicker front rather than two notes — the flam a player '
      + 'gets by letting the sticks meet unevenly.',
    osc: { type: 'triangle', from: 2540, to: 2470, sweep: 0.01, curve: 'exp', attack: 0.0005, decay: 0.045, gain: 1 },
    tone: { type: 'lowpass', freq: 6500, Q: 0.7 },
    taps: [0, 0.0085], tapFalloff: 0.55, tapDetune: 0.985 },

  // ---- 808 and 909 rimshots, open hats and cymbals -------------------------
  //
  // Two Sound On Sound pieces sit behind this block, and between them they give one
  // idea rather than two. "Practical Cymbal Synthesis" traces the TR-808's cymbal:
  // six enharmonically tuned squares, split by bandpass into a lower and an upper
  // band, each band through ITS OWN VCA and AR contour, highpassed and remixed — and
  // the point of the circuit is the "inequality of decay times", the mix of frequency
  // components evolving as the sound falls. "Practical Snare Drum Synthesis" finds
  // the same architecture in the TR-909's noise path for exactly the same reason: a
  // spectrum whose high and low regions decay at different rates. A cymbal that fades
  // as one block reads as a sample being turned down; a cymbal whose top outlives its
  // body reads as metal.
  //
  // KLNG8 gives each section its own envelope, so two sections ARE two bands with two
  // decays. Where one section has to carry both, the band split is stated as a filter
  // that moves instead: a highpass climbing through the tail is the low band dying
  // first, and one falling is the top going before the body.
  //
  // The 909's hats, crash and ride are the exception, and the article is blunt about
  // why — they are not synthesised at all but six-bit samples, clocked at 30 kHz
  // through a DAC and lowpassed to bury the quantisation noise. So the presets that
  // say 909 here are the same cluster through `shape: 'crush'` at `drive` 0.6, which
  // this engine's curve puts at exactly six bits, under a lowpass doing the job the
  // real anti-aliasing filter does. The grit is the instrument, not a defect.
  rim808BridgedT: { label: 'Rimshot · 808 Bridged-T', category: 'Rim', homeLane: 'rim', dur: 0.5,
    note: 'Two modal partials with separate decays, which is the whole trick: a low mode '
      + 'at 330 Hz gone in under thirty milliseconds and a 1.75 kHz resonance ringing on '
      + 'past it. The cross-stick rather than the backbeat.',
    osc: { type: 'triangle', from: 330, to: 305, sweep: 0.01, curve: 'exp',
      decay: 0.075, sag: 0.22, sagAt: 0.012, gain: 0.55 },
    ring: { freq: 1750, Q: 120, hit: 0.001, decay: 0.13, sag: 0.3, sagAt: 0.014, gain: 1.5 },
    drive: 0.143925 },
  rim909TwoMode: { label: 'Rimshot · 909 Two-Mode', category: 'Rim', homeLane: 'rim', dur: 0.5,
    note: 'The 909’s rim is analogue where its cymbals are not, and it is brighter and harder '
      + 'than the 808’s: a fast square knock, three metal partials through a 3.2 kHz '
      + 'bandpass with a two-stage fall, and ten milliseconds of air for the stick.',
    osc: { type: 'square', from: 480, to: 430, sweep: 0.008, curve: 'exp', decay: 0.018, gain: 0.5 },
    noise: { type: 'highpass', freq: 5600, Q: 1.2, decay: 0.01, gain: 0.3 },
    metal: { wave: 'square', freq: 1650, ratios: [1, 1.47, 2.13], count: 3, spread: 1, filter: 'bandpass', hp: 3200, Q: 2.2, slope: -12, decay: 0.075, sag: 0.2, sagAt: 0.012, gain: 0.9 },
    drive: 0.379353 },
  rimShotHard: { label: 'Rimshot · Hard Shot', category: 'Rim', homeLane: 'rim', dur: 0.5,
    note: 'Stick and shell struck together — the rimshot that replaces a backbeat rather '
      + 'than decorating one. A sagging triangle body, a noise band sweeping down through '
      + 'it and a 1.42 kHz shell ring, pushed hard into the shaper.',
    osc: { type: 'triangle', from: 400, to: 330, sweep: 0.02, curve: 'exp',
      decay: 0.055, sag: 0.18, sagAt: 0.018, gain: 0.85 },
    noise: { type: 'bandpass', freq: 2400, to: 1700, sweep: 0.06, Q: 1.3, decay: 0.07, gain: 0.7 },
    ring: { freq: 1420, Q: 80, hit: 0.0015, decay: 0.1, gain: 0.7 },
    drive: 0.284833 },

  ohat808Bands: { label: 'Open Hat · 808 Bands', category: 'Hats', homeLane: 'ohats', dur: 3,
    note: 'The 808’s six squares with the band split stated as a filter that moves: the '
      + 'highpass climbs from 5.2 to 8.8 kHz across the tail, so the low band dies first '
      + 'and what is left ringing is the top. The inequality of decay times, in one section.',
    metal: { wave: 'square', freq: 540, count: 6, spread: 1,
      filter: 'highpass', hp: 5200, hpTo: 8800, hpSweep: 0.6, Q: 0.9, slope: -24,
      decay: 0.85, sag: 0.4, sagAt: 0.06, gain: 1 },
    humanize: { gain: 0.04 } },
  ohat808Long: { label: 'Open Hat · 808 Decay Up', category: 'Hats', homeLane: 'ohats', dur: 4,
    note: 'The same cluster with the machine’s decay pot right up and the filter left '
      + 'still: a second and a half of open cymbal that holds an offbeat through a whole '
      + 'bar. What the 808’s panel could do and its short setting never showed.',
    metal: { wave: 'square', freq: 540, count: 6, spread: 1,
      filter: 'highpass', hp: 5400, Q: 0.9, slope: -24,
      decay: 1.6, sag: 0.5, sagAt: 0.07, gain: 1 },
    humanize: { gain: 0.04 } },
  ohat909SixBit: { label: '909 Lo-Fi Open Hat', category: 'Hats', homeLane: 'ohats', dur: 3,
    note: 'The 909’s open hat is a six-bit sample, so this is the cluster quantised to six '
      + 'bits — `crush` at 0.6, which is exactly where this engine’s curve lands — under an '
      + '11 kHz lowpass standing in for the real anti-aliasing filter. Dirtier and flatter '
      + 'than the 808, which is the difference.',
    metal: { wave: 'square', freq: 620, count: 6, spread: 1.06,
      filter: 'highpass', hp: 6400, Q: 0.85, slope: -24,
      decay: 0.55, sag: 0.42, sagAt: 0.045, gain: 0.95 },
    drive: 0.6, shape: 'crush', tone: { type: 'lowpass', freq: 11000, Q: 0.7 },
    humanize: { gain: 0.04 } },
  ohat909Long: { label: 'Open Hat · 909 Decay Up', category: 'Hats', homeLane: 'ohats', dur: 4,
    note: 'The six-bit open hat with the decay pot up and the band opened a little wider: '
      + 'the quantisation grit is audible right through the tail, which is what a 909 open '
      + 'hat left ringing actually sounds like.',
    metal: { wave: 'square', freq: 620, count: 6, spread: 1.06,
      filter: 'highpass', hp: 5800, Q: 0.85, slope: -24,
      decay: 1.15, sag: 0.5, sagAt: 0.05, gain: 0.95 },
    drive: 0.6, shape: 'crush', tone: { type: 'lowpass', freq: 10500, Q: 0.7 },
    humanize: { gain: 0.04 } },

  rideSosTwoPath: { label: 'Ride · SOS Two-Path', category: 'Crash', homeLane: 'crash', dur: 5,
    note: 'Sound On Sound’s ride, which is two paths and not one: a 2.5 kHz square FM-ed by '
      + 'a 1 kHz pulse for the ping, gone in a fifth of a second, under a tail that '
      + 'rings for two and a half — highpassed at 2.64 kHz and '
      + 'MIXED LOUDER than the ping, which is the part everyone gets backwards. Two '
      + 'departures from the article, both forced: the tail is the cluster rather than the '
      + 'same FM pair, because the osc section here takes a contour and not a filter and the '
      + 'two paths need two sections; and its attack is 30 ms rather than the article’s 200, '
      + 'because that swell is only inaudible under the master AD contour sitting over the '
      + 'whole patch, which this path has no equivalent for. The ping carries the stick.',
    osc: { type: 'square', from: 2520, to: 2480, sweep: 0.02, curve: 'exp',
      decay: 0.2, gain: 0.75,
      fm: { type: 'square', ratio: 0.4, index: 2.5, decay: 0.18 } },
    metal: { wave: 'square', freq: 2500, count: 6, spread: 1,
      filter: 'highpass', hp: 2640, Q: 0.7, slope: -12,
      attack: 0.03, decay: 2.6, sag: 0.55, sagAt: 0.35, gain: 0.34 },
    humanize: { gain: 0.03 } },
  rideSosFullTail: { label: 'Ride · SOS Full Tail', category: 'Crash', homeLane: 'crash', dur: 6,
    note: 'The same ride with the tail taken to the article’s full 3.7 seconds. A ride that '
      + 'is still there under the next four bars, for the half-time sections where the hat '
      + 'pattern drops out and something has to keep the top of the mix alive.',
    osc: { type: 'square', from: 2520, to: 2480, sweep: 0.02, curve: 'exp',
      decay: 0.2, gain: 0.7,
      fm: { type: 'square', ratio: 0.4, index: 2.5, decay: 0.18 } },
    metal: { wave: 'square', freq: 2500, count: 6, spread: 1,
      filter: 'highpass', hp: 2640, Q: 0.7, slope: -12,
      attack: 0.03, decay: 3.7, sag: 0.6, sagAt: 0.45, gain: 0.36 },
    humanize: { gain: 0.03 } },
  cy808Cymbal: { label: '808 Cymbal', category: 'Crash', homeLane: 'crash', dur: 4,
    note: 'The 808’s CY rather than its hat — the same six squares, but bandpassed and left '
      + 'to ring for two seconds with the centre climbing from 3.6 to 5.2 kHz as it goes, '
      + 'with a restrained resonant tail. The band the ear follows moves up through the '
      + 'decay, which is what the analysis says a real cymbal does.',
    metal: { wave: 'square', freq: 540, count: 6, spread: 1,
      filter: 'bandpass', hp: 3600, hpTo: 5200, hpSweep: 1.2, Q: 1.3, slope: -12,
      decay: 1.9, sag: 0.35, sagAt: 0.08, gain: 0.6,
      resonator: { feedback: 0.9, drive: 1.2, leak: 0.0003 } },
    drive: 0.127588, humanize: { gain: 0.03 } },
  crash808Long: { label: '808 Long Crash', category: 'Crash', homeLane: 'crash', dur: 6,
    note: 'The cluster pulled a third wider than the 808’s own spacing and left for three '
      + 'and a half seconds, with the highpass FALLING from 4.2 to 2.6 kHz — the top going '
      + 'before the body, which is the other half of the unequal decay and the reason a '
      + 'crash darkens instead of just getting quieter.',
    metal: { wave: 'square', freq: 540, count: 6, spread: 1.35,
      filter: 'highpass', hp: 4200, hpTo: 2600, hpSweep: 2.4, Q: 0.8, slope: -12,
      decay: 3.4, sag: 0.42, sagAt: 0.1, gain: 0.4 },
    drive: 0.227483, humanize: { gain: 0.03 } },
  ride909SixBit: { label: '909 Lo-Fi Ride', category: 'Crash', homeLane: 'crash', dur: 4,
    note: 'A ride with a bell you can hear: a narrow 2.5 kHz resonance for the ping over a '
      + 'six-bit wash, lowpassed at 9.5 kHz. The 909’s ride was a sample and its grit is '
      + 'half of why the sound is recognisable, so the crush is doing the work here that '
      + 'the filter sweeps do on the 808 presets.',
    ring: { freq: 2500, Q: 70, hit: 0.0018, decay: 0.25, gain: 0.6 },
    metal: { wave: 'square', freq: 780, count: 6, spread: 1.12,
      filter: 'highpass', hp: 5400, Q: 0.8, slope: -24,
      attack: 0.004, decay: 1.6, sag: 0.3, sagAt: 0.06, gain: 0.55 },
    drive: 0.6, shape: 'crush', tone: { type: 'lowpass', freq: 9500, Q: 0.7 },
    humanize: { gain: 0.03 } },

  // ---- KW blips: short, sharp and pitched ----------------------------------
  //
  // Two controls between them, and it is worth being exact about which does what,
  // because they look like the same job and are not. `metal.resonator` wraps a saturated
  // feedback loop around the cluster's filter: measured across a Q sweep, what it
  // actually buys is the LEVEL a narrow bandpass throws away — about 25% back at Q 90 —
  // plus the tanh edge from `drive` and deterministic air from `leak`. What it does not
  // buy is a long tail, and the `feedback` number barely matters: 0.94 and 0.99 render
  // within a thousandth of each other here, because a one-sample loop has almost no gain
  // anywhere but the filter's own peak. The cluster's oscillators also stop when its
  // envelope does, so nothing rings after them by construction.
  //
  // The cluster's filter Q is pinned at 24 because that is where the desk's RESONANCE
  // pot stops for a FILTER — audited deliberately, since the whole catalogue's highest
  // filter Q was 16 and a ceiling of 120 crushed the useful range into the bottom third
  // of the dial. A preset stored above it is rewritten the first time somebody touches
  // the knob, which is a preset that does not survive being edited. The `ring` section's
  // own RESONANCE still runs to 120, because there it is a material and not a filter.
  //
  // The tail therefore comes from the `ring` section, whose pitch IS a filter's
  // resonance and so arrives already decaying. The pattern these presets use is both:
  // a narrow, resonator-driven cluster for the strike and its edge, and a ring tuned to
  // the same note for the body that outlives it.
  //
  // What that buys here is the Kraftwerk blip: something obviously pitched, obviously
  // struck, gone inside a sixteenth, and metallic without being a cymbal. The library
  // already had one — the `taiko` preset that megamix uses under the label "KW Blip" —
  // as a MembraneSynth with a six-octave pitch decay. These are the same idea said in
  // KLNG8's words, where the decay is a property of a resonance rather than a ramp on
  // an oscillator, which is the difference between a blip and a bleep.
  //
  // Feedback stays at or under 0.982. The engine clamps at 0.995 and the last thousandth
  // is where a short loop stops decaying and starts howling.
  kwBlipPing: { label: 'Ping Blip', category: 'Blip', homeLane: 'rim', dur: 0.5,
    note: 'The plain one, and the one to reach for first: three sine partials at 880 Hz '
      + 'through a narrow band, struck and gone in under a tenth of a second. Pitched enough '
      + 'to play a line with, short enough to sit on a sixteenth.',
    ring: { freq: 880, Q: 90, hit: 0.0012, decay: 0.14, gain: 1 },
    metal: { wave: 'sine', freq: 880, ratios: [1, 2.01, 3.03], count: 3, spread: 1, filter: 'bandpass', hp: 1780, Q: 24, slope: -12, attack: 0.0005, decay: 0.085, sag: 0.25, sagAt: 0.008, gain: 1.7, resonator: { feedback: 0.975, drive: 1.3, leak: 0.0003 } } },
  kwBlipSnap: { label: 'KW Blip · Snap', category: 'Blip', homeLane: 'rim', dur: 0.5,
    note: 'The same blip with the cluster falling 1450 to 1120 Hz in eighteen milliseconds '
      + '— a pitch snap rather than a pitch drop. Squares instead of sines and a harder '
      + 'loop, so it reads as struck metal rather than a tone.',
    metal: { wave: 'square', freq: 1450, to: 1120, sweep: 0.018, ratios: [1, 1.98], count: 2, spread: 1,
      filter: 'bandpass', hp: 2400, Q: 24, slope: -12,
      attack: 0.0005, decay: 0.06, sag: 0.2, sagAt: 0.006, gain: 1.5,
      resonator: { feedback: 0.955, drive: 1.5, leak: 0.0004 } },
    drive: 0.131171 },
  kwBlipWood: { label: 'KW Blip · Wood', category: 'Blip', homeLane: 'rim', dur: 0.5,
    note: 'Low and dry, with the second partial at 2.76 — the ratio a struck bar gives rather '
      + 'than a harmonic one, which is why it reads as wood and not as a note. The answering '
      + 'voice to the Ping in a two-blip figure.',
    ring: { freq: 420, Q: 60, hit: 0.002, decay: 0.18, gain: 1.2 },
    metal: { wave: 'triangle', freq: 420, ratios: [1, 2.76], count: 2, spread: 1, filter: 'bandpass', hp: 860, Q: 24, slope: -12, attack: 0.0005, decay: 0.11, sag: 0.3, sagAt: 0.012, gain: 2, resonator: { feedback: 0.94, drive: 1.2, leak: 0.0003 } } },
  kwBlipGlass: { label: 'KW Blip · Glass', category: 'Blip', homeLane: 'rim', dur: 1,
    note: 'High, clean and allowed to ring: four sine partials at 1.76 kHz with the feedback '
      + 'almost closed, so the resonance outlives the strike by a long way. The blip that '
      + 'becomes a bell if you leave it alone.',
    ring: { freq: 1760, Q: 120, hit: 0.0012, decay: 0.3, gain: 1 },
    metal: { wave: 'sine', freq: 1760, ratios: [1, 2.04, 3.09, 4.16], count: 4, spread: 1, filter: 'bandpass', hp: 3500, Q: 24, slope: -12, attack: 0.0005, decay: 0.22, sag: 0.22, sagAt: 0.01, gain: 1.6, resonator: { feedback: 0.982, drive: 1.25, leak: 0.00025 } } },
  kwBlipTick: { label: 'KW Blip · Tick', category: 'Blip', homeLane: 'rim', dur: 0.5,
    note: 'Thirty-five milliseconds and nothing else — the top-line blip for a running '
      + 'sixteenth pattern, high enough at 2.2 kHz to stay clear of the hats and short '
      + 'enough that a whole bar of them still reads as a pulse rather than a chord.',
    metal: { wave: 'square', freq: 2200, ratios: [1, 1.97], count: 2, spread: 1,
      filter: 'bandpass', hp: 3900, Q: 24, slope: -12,
      attack: 0.0004, decay: 0.035, gain: 1.3,
      resonator: { feedback: 0.95, drive: 1.4, leak: 0.0002 } },
    drive: 0.166985 },
  kwBlipDrop: { label: 'Falling Blip', category: 'Blip', homeLane: 'tom', dur: 1,
    note: 'One sawtooth falling from 2.4 kHz to 210 in fifty milliseconds through a '
      + 'resonant lowpass with the loop closed around it — the big descending blip, and '
      + 'the KLNG8 answer to the six-octave MembraneSynth the megamix has been using.',
    metal: { wave: 'sawtooth', freq: 2400, to: 210, sweep: 0.05, ratios: [1], count: 1, spread: 1,
      filter: 'lowpass', hp: 3000, Q: 2, slope: -12,
      attack: 0.0005, decay: 0.16, sag: 0.28, sagAt: 0.015, gain: 0.8,
      resonator: { feedback: 0.93, drive: 1.35, leak: 0.0004 } },
    drive: 0.236329 },
  kwBlipDouble: { label: 'KW Blip · Double', category: 'Blip', homeLane: 'rim', dur: 0.5,
    note: 'The pi-pi figure as one voice: the Ping struck twice thirty-eight milliseconds '
      + 'apart, the second a tone lower and quieter. Two hits the sequencer does not have to '
      + 'spend two steps on, and the detune is what stops it sounding like an echo.',
    ring: { freq: 1040, Q: 85, hit: 0.0012, decay: 0.1, gain: 1 },
    metal: { wave: 'sine', freq: 1040, ratios: [1, 2.01, 3.03], count: 3, spread: 1, filter: 'bandpass', hp: 2100, Q: 24, slope: -12, attack: 0.0005, decay: 0.07, sag: 0.25, sagAt: 0.008, gain: 1.7, resonator: { feedback: 0.96, drive: 1.3, leak: 0.0003 } },
    taps: [0, 0.038], tapFalloff: 0.62, tapDetune: 0.89, tapTone: 0.9 },

  // ---- Synare, Syndrum and the Simmons kit ---------------------------------
  //
  // Three machines, one idea, and it is the idea `pitchCurve: 'snap'` was added for.
  // All three sweep a VCO with a DECAYING envelope rather than a ramp — an exaggerated
  // initial pitch jump that settles onto a target, hardest at the very instant of the
  // strike. That is an RC discharge, which is what `setTargetAtTime` is and what `snap`
  // selects; `exp` glides evenly and is the 808's flavour, and on these it sounds like
  // a slide whistle instead of a drum. Every preset below names the curve for that
  // reason and it is the single most load-bearing key in the block.
  //
  // What is documented, and what is not. The Synare 3 is two oscillators (pulse and
  // sawtooth) plus white noise into a four-pole filter that self-oscillates into a sine
  // at full resonance, with the panel reading Tune, Osc 2, Sweep, Resonance and Decay —
  // so `Tune` is a FILTER frequency, not an oscillator's, and the famous sound is the
  // filter singing. The Simmons SDS-V is one triangle VCO, a transistor noise source and
  // an SSM2044 four-pole VCF under four simple AR envelopes, and its six panel controls
  // are Tone Pitch, Noise Pitch, Bend, Decay, Noise-Tone Balance and Click-Drum Balance.
  // Roland published none of the frequencies or times for it and neither did Simmons —
  // the manual tunes "from an 8-inch tom tom to a large timpani" and leaves it there —
  // so the numbers here are tuned by ear and measured, not transcribed. The ARCHITECTURE
  // is transcribed, which is the part that makes them sound like themselves.
  //
  // The Simmons CLICK deserves a note: it is a separate velocity-derived transient mixed
  // against the drum body, and there is only one noise section here to spend. It is
  // stated as `noise.sag` instead — a spike that drops to a fraction of itself in a few
  // milliseconds and then continues as the body — which is the same two levels the
  // Click-Drum pot sets, in one section rather than two.
  syn3Deooom: { label: 'Synare · DEOOOM', category: 'Sweep', homeLane: 'tom', dur: 2,
    note: 'The signature Synare 3 disc-drum fall: a sine leaping to 900 Hz on the strike '
      + 'and discharging onto 85 over three hundred milliseconds. The filter singing at '
      + 'full resonance, which is where that sound actually comes from.',
    osc: { type: 'sine', from: 900, to: 85, sweep: 0.3, pitchCurve: 'snap',
      attack: 0.0008, decay: 0.65, curve: 'exp', gain: 1 },
    drive: 0.119966 },
  syn3RingBell: { label: 'Synare · Ring Bell', category: 'Perc', homeLane: 'tom', dur: 1,
    note: 'The short, high, disco end of the same instrument — 1.5 kHz snapping down to '
      + '430 in ninety milliseconds and gone. The one that answers a snare rather than '
      + 'replacing it.',
    osc: { type: 'sine', from: 1500, to: 430, sweep: 0.09, pitchCurve: 'snap',
      attack: 0.0006, decay: 0.16, curve: 'exp', gain: 0.95 },
    drive: 0.145121 },
  syn3Whoosh: { label: 'Synare · Noise Whoosh', category: 'FX', homeLane: 'crash', dur: 2,
    note: 'The Synare’s other half: white noise through the four-pole filter with the '
      + 'resonance up, the band falling from 4.2 kHz to 380 over half a second. No '
      + 'oscillator at all — the sweep IS the sound.',
    noise: { type: 'bandpass', freq: 4200, to: 380, sweep: 0.5, Q: 7, slope: -24,
      attack: 0.001, decay: 0.6, gain: 1 },
    drive: 0.084697 },
  syn3Zap: { label: 'Synare · Zap', category: 'FX', homeLane: 'crash', dur: 1,
    note: 'Sawtooth rather than sine — the Synare’s second waveform — dropping five '
      + 'octaves in a tenth of a second into a resonant lowpass. The sci-fi setting, and '
      + 'the reason the disc turned up on so many records that had no drummer.',
    osc: { type: 'sawtooth', from: 2200, to: 60, sweep: 0.12, pitchCurve: 'snap',
      attack: 0.0005, decay: 0.2, curve: 'exp', gain: 0.85 },
    drive: 0.474284, tone: { type: 'lowpass', freq: 2600, Q: 6 },
    trim: -2.615321 },

  sdDiscoTom: { label: 'Syndrum · Disco Tom', category: 'Sweep', homeLane: 'tom', dur: 2,
    note: 'The falling tom that is on every record from 1978: a triangle jumping to 460 Hz '
      + 'and discharging onto 62 in two hundred milliseconds, with twelve milliseconds of '
      + 'lowpassed noise for the trigger click on the front.',
    osc: { type: 'triangle', from: 460, to: 62, sweep: 0.2, pitchCurve: 'snap',
      attack: 0.0008, decay: 0.42, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 1800, Q: 0.7, decay: 0.012, gain: 0.22 },
    drive: 0.149302 },
  sdHighPew: { label: 'Syndrum · High Pew', category: 'Sweep', homeLane: 'tom', dur: 1,
    note: 'The fill blip: same circuit an octave up and twice as fast, 880 to 150 in ninety '
      + 'milliseconds. Three of these descending is a Syndrum fill and always has been.',
    osc: { type: 'triangle', from: 880, to: 150, sweep: 0.09, pitchCurve: 'snap',
      attack: 0.0006, decay: 0.18, curve: 'exp', gain: 0.95 },
    drive: 0.19155 },
  sdCrack: { label: 'Syndrum · Crack', category: 'Snare', homeLane: 'snare', dur: 1,
    note: 'The noise mix brought up until the drum is more crack than tone — the Syndrum '
      + 'used as a backbeat instead of a fill. The body still falls underneath it, which '
      + 'is what keeps it from being an ordinary electronic snare.',
    osc: { type: 'triangle', from: 520, to: 90, sweep: 0.12, pitchCurve: 'snap',
      attack: 0.0006, decay: 0.2, curve: 'exp', gain: 0.7 },
    noise: { type: 'bandpass', freq: 2800, Q: 1.4, decay: 0.075, sag: 0.2, sagAt: 0.008, gain: 0.8 },
    drive: 0.251199 },
  sdRise: { label: 'Syndrum · Rise', category: 'Sweep', homeLane: 'tom', dur: 1,
    note: 'The sweep pointed the other way, which the panel always allowed and almost '
      + 'nobody used: 90 Hz leaping to 700 and settling. A fill that goes up, or a '
      + 'power-up in a game that has one.',
    osc: { type: 'triangle', from: 90, to: 700, sweep: 0.14, pitchCurve: 'snap',
      attack: 0.0008, decay: 0.26, curve: 'exp', gain: 0.9 },
    drive: 0.184577 },

  sdsKick: { label: 'Simmons · Kick', category: 'Kick', homeLane: 'kick', dur: 2,
    note: 'The SDS-V bass module: triangle VCO bending 190 to 48, the noise pot low and the '
      + 'click pot up — which is `noise.sag` here, a spike that falls to a fifth of itself '
      + 'in four milliseconds and carries on as body.',
    osc: { type: 'triangle', from: 190, to: 48, sweep: 0.07, pitchCurve: 'snap', attack: 0.001, decay: 0.42, curve: 'exp', gain: 1 },
    knock: 0.35,
    noise: { type: 'lowpass', freq: 1400, Q: 0.7, decay: 0.02, sag: 0.2, sagAt: 0.004, gain: 0.3 },
    drive: 0.183729 },
  sdsSnare: { label: 'Simmons · Snare', category: 'Snare', homeLane: 'snare', dur: 1,
    note: 'The one everybody means by "Simmons": the noise-tone balance right over toward '
      + 'noise, a four-pole band at 2.2 kHz running nearly three hundred milliseconds, and '
      + 'just enough bent triangle underneath to give it a pitch.',
    osc: { type: 'triangle', from: 330, to: 210, sweep: 0.05, pitchCurve: 'snap',
      attack: 0.0008, decay: 0.11, curve: 'exp', gain: 0.5 },
    noise: { type: 'bandpass', freq: 2200, Q: 0.9, slope: -24,
      decay: 0.28, sag: 0.3, sagAt: 0.007, gain: 1 },
    drive: 0.164317 },
  sdsTomHigh: { label: 'Simmons · Tom High', category: 'Tom', homeLane: 'tom', dur: 2,
    note: 'Top hexagon of the kit: 420 bending to 150 with the bend pot around the middle, '
      + 'so it drops far enough to be electronic and not so far that it stops being a tom. '
      + 'Plays with the Mid and Low as a three-drum fill.',
    osc: { type: 'triangle', from: 420, to: 150, sweep: 0.11, pitchCurve: 'snap',
      attack: 0.0008, decay: 0.34, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 2600, Q: 0.7, decay: 0.012, sag: 0.2, sagAt: 0.004, gain: 0.25 },
    drive: 0.135291 },
  sdsTomMid: { label: 'Simmons · Tom Mid', category: 'Tom', homeLane: 'tom', dur: 2,
    note: 'The middle voice, 300 to 105 over a hundred and forty milliseconds. Tuned to '
      + 'answer the High cleanly rather than to sit a fixed interval below it.',
    osc: { type: 'triangle', from: 300, to: 105, sweep: 0.14, pitchCurve: 'snap',
      attack: 0.0008, decay: 0.45, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 2200, Q: 0.7, decay: 0.013, sag: 0.2, sagAt: 0.004, gain: 0.25 },
    drive: 0.141314 },
  sdsTomLow: { label: 'Simmons · Tom Low', category: 'Tom', homeLane: 'tom', dur: 3,
    note: 'The floor hexagon with the bend pot well up: 210 down to 62 over two hundred '
      + 'milliseconds and six tenths of a second of tail. The sound of a fill arriving at '
      + 'the bottom of the kit, which is the whole point of the instrument.',
    osc: { type: 'triangle', from: 210, to: 62, sweep: 0.2, pitchCurve: 'snap',
      attack: 0.001, decay: 0.62, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 1700, Q: 0.7, decay: 0.014, sag: 0.2, sagAt: 0.004, gain: 0.25 },
    drive: 0.163851 },
  sdsCymbal: { label: 'Simmons · Cymbal', category: 'Crash', homeLane: 'crash', dur: 4,
    note: 'The cymbal module, whose panel swaps Click-Drum for BELL-CYMBAL — so the metal '
      + 'cluster is the bell and the swept noise is the cymbal, and the balance between them '
      + 'is the two gains. The band falls 6.8 to 3.4 kHz across the tail, which is the '
      + 'module’s Sweep control doing what it does.',
    noise: { type: 'highpass', freq: 6800, to: 3400, sweep: 1.2, Q: 0.9, slope: -24, decay: 1.4, gain: 0.9 },
    metal: { wave: 'square', freq: 620, count: 6, spread: 1, filter: 'highpass', hp: 5200, Q: 0.85, slope: -24, decay: 0.9, sag: 0.35, sagAt: 0.05, gain: 0.5 },
    drive: 0.194494,
    humanize: { gain: 0.03 } },

  // ---- the long Synare pew --------------------------------------------------
  //
  // The Kelly Marie "Feels Like I'm In Love" hook: a Synare falling for the best part of
  // a second, long enough that it is a LINE rather than a drum hit. Same disc and same
  // self-oscillating filter as the four above, but at this length the pitch curve stops
  // being a detail and becomes the whole choice, which is the opposite of how it works
  // on a short one.
  //
  // The curves are CLOSER here than the short-drum case suggests, and it is worth having
  // the measurement rather than the intuition. `snap` is steeper in hertz per second, but
  // the ear counts octaves, and across the 4.32-octave fall from 2400 to 120 Hz the two
  // track within a few points of each other the whole way — measured at 0.14 s, `snap`
  // has covered 28% of the octaves against `exp`'s 22%, and at 0.35 s it is 60% against
  // 51%. So `snap`'s famous head start is mostly spent in a register the ear reads as
  // one high note either way. `exp` is the default because a constant number of
  // semitones per second is a straight line on a piano roll and reads as a whistle
  // somebody is playing; `syn3PewSnap` is the same fall leaning a little earlier.
  //
  // The AMPLITUDE envelope is what actually had to change. An ordinary exponential decay
  // is 40 dB down by 0.5 s, so a 700 ms sweep under one is inaudible for its last two
  // octaves — the pitch track could not even find a fundamental past 0.35 s. These hold
  // the level across the fall and then release linearly, which is what an AR-per-voice
  // machine does anyway, and it is the difference between a long pew and a short pew
  // with a long sweep nobody can hear the end of.
  syn3PewLong: { label: 'Synare · Long Pew', category: 'Sweep', homeLane: 'tom', dur: 3,
    note: 'The disco hook: 2.4 kHz gliding evenly down to 120 over seven tenths of a '
      + 'second, on `exp` so the fall is constant in semitones and the ear hears a line '
      + 'rather than a drop. The one to reach for first.',
    osc: { type: 'sine', from: 2400, to: 120, sweep: 0.7, pitchCurve: 'exp',
      attack: 0.003, hold: 0.45, decay: 0.55, curve: 'lin', gain: 1 },
    drive: 0.1 },
  syn3PewSnap: { label: 'Synare · Long Pew Snap', category: 'Sweep', homeLane: 'tom', dur: 3,
    note: 'The same 2.4 kHz to 120 over the same seven tenths, discharging instead of '
      + 'gliding — most of the fall is over in the first hundred milliseconds and the rest '
      + 'is a long low tail. A hit with a tail where the other one is a line.',
    osc: { type: 'sine', from: 2400, to: 120, sweep: 0.7, pitchCurve: 'snap',
      attack: 0.003, hold: 0.45, decay: 0.55, curve: 'lin', gain: 1 },
    drive: 0.1 },
  syn3PewPew: { label: 'Synare · Pew Pew', category: 'Sweep', homeLane: 'tom', dur: 2,
    note: 'Two of them, two hundred milliseconds apart, the second a tone lower and a fifth '
      + 'quieter — the answering pair, as one voice and one step. Shorter than the Long Pew '
      + 'so the first has finished falling before the second arrives.',
    osc: { type: 'sine', from: 2000, to: 150, sweep: 0.34, pitchCurve: 'exp', attack: 0.002, hold: 0.2, decay: 0.3, curve: 'lin', gain: 1 },
    drive: 0.167571,
    taps: [0, 0.2], tapFalloff: 0.78, tapDetune: 0.93 },
  syn3PewDeep: { label: 'Synare · Deep Pew', category: 'Sweep', homeLane: 'tom', dur: 4,
    note: 'The long one: 3 kHz to 60 over a second and a half, with two seconds of '
      + 'envelope under it so the bottom of the fall is still audible when it arrives. '
      + 'Five and a half octaves — a whole bar of descent at a disco tempo.',
    osc: { type: 'sine', from: 3000, to: 60, sweep: 1.5, pitchCurve: 'exp',
      attack: 0.004, hold: 1.05, decay: 1.05, curve: 'lin', gain: 1 },
    drive: 0.12 },
  syn3PewFormant: { label: 'Synare · Pew Formant', category: 'Sweep', homeLane: 'tom', dur: 3,
    note: 'The same glide through a fixed resonant lowpass, so the sine picks up a bump as '
      + 'its pitch passes 1.4 kHz — a vowel in the middle of the fall. A static filter '
      + 'doing something a moving one cannot, and the most Synare-sounding of the five.',
    osc: { type: 'sine', from: 2400, to: 120, sweep: 0.7, pitchCurve: 'exp',
      attack: 0.003, hold: 0.45, decay: 0.55, curve: 'lin', gain: 1 },
    drive: 0.34872, tone: { type: 'lowpass', freq: 1400, Q: 9 },
    trim: -3.571625 },

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
  buzzRoll: { label: 'Buzz Roll', category: 'Perc', homeLane: 'rim', dur: 1,
    note: 'Six strikes across a sixteenth, dying away — a drag, or a machine failing '
      + 'to start.',
    noise: { type: 'bandpass', freq: 1900, to: 1550, sweep: 0.04, Q: 1.7, decay: 0.05, gain: 0.75 },
    metal: { wave: 'square', freq: 800, spread: 1, count: 6, hp: 3400, Q: 0.8, decay: 0.045, gain: 0.65 },
    taps: [0, 0.008, 0.016, 0.024, 0.032, 0.04], tapFalloff: 0.84 },

  // ---- the burst family, formerly the NOISE table -----------------------------
  //
  // Snares, claps, hats and shakers: a filtered burst of the seeded buffer with an
  // optional pitched thump under it. They were their own table and their own play
  // path while `body` was a key only `_playNoise` understood; `body` is `osc` now,
  // which is the same thump stated in the drum path's words, so they are ordinary
  // KLNG8 presets and belong in the one table with the rest.

  snareCrisp: { label: 'Crisp Snare', category: 'Snare', dur: 1,
    note: 'The engine’s own snare as a preset: a bright noise band, a short decay and '
      + 'a hint of body. The one every song already uses.',
    osc: { type: 'triangle', from: 210, to: 140, sweep: 0.06, decay: 0.06, gain: 0.375 },
    noise: { type: 'bandpass', freq: 2600, Q: 0.7, decay: 0.09 } },
  snareFat: { label: 'Fat Snare', category: 'Snare', dur: 1,
    note: 'Lower band, longer tail and much more body — a snare that carries a '
      + 'backbeat on its own rather than sitting on top of one.',
    osc: { type: 'triangle', from: 180, to: 110, sweep: 0.11, decay: 0.11, gain: 0.6 },
    noise: { type: 'bandpass', freq: 1700, Q: 0.5, decay: 0.16 } },
  snareTight: { label: 'Tight Snare', category: 'Snare', dur: 1,
    note: 'Gated: cut off almost before it starts. Sits under a busy hat pattern '
      + 'without smearing it.',
    osc: { type: 'triangle', from: 240, to: 170, sweep: 0.03, decay: 0.03, gain: 0.3 },
    noise: { type: 'bandpass', freq: 3200, Q: 1.1, decay: 0.045 } },

  clap808: { label: 'Hand Clap', category: 'Clap', dur: 1,
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

  hatOpen: { label: 'Open Hat', category: 'Hats', dur: 2,
    note: 'The same band left to ring for a third of a second.',
    noise: { type: 'highpass', freq: 6500, Q: 0.7, decay: 0.33 } },

  // A matched pair: same band, same body, one short and one left ringing. A closed and
  // an open hat that do not share a timbre read as two players, which is the thing a
  // kit is not — so the only differences here are the decay and the tiny drop in cutoff
  // a real hat has when it is not clamped shut.
  hatFoilOpen: { label: '= Foil Open Hat', category: 'Hats', homeLane: 'ohats', dur: 2,
    note: 'The Foil hat unclamped: the same band a shade lower, ringing for a quarter '
      + 'of a second, with the ping stretched to match.',
    osc: { type: 'square', from: 3100, to: 2600, sweep: 0.05, decay: 0.05, gain: 0.045 },
    noise: { type: 'highpass', freq: 8400, Q: 0.9, decay: 0.27 } },
  shaker: { label: 'Shaker', category: 'Perc', homeLane: 'rim', dur: 0.5,
    note: 'A soft band with no attack to speak of. Sixteenths of this sit under '
      + 'anything without competing.',
    noise: { type: 'bandpass', freq: 6000, Q: 1.1, decay: 0.06 } },
  tambourine: { label: 'Tambourine', category: 'Perc', homeLane: 'rim', dur: 1,
    note: 'Bright, jangly and slightly longer, with a touch of pitch in it.',
    osc: { type: 'square', from: 900, to: 780, sweep: 0.05, decay: 0.05, gain: 0.12 },
    noise: { type: 'highpass', freq: 5200, Q: 0.6, decay: 0.14 } },
  noiseSweep: { label: 'Noise Hit', category: 'FX', dur: 2,
    note: 'A wide unfiltered burst with a long fall. Not a drum so much as an '
      + 'impact — good on a crash lane, or on a downbeat that needs an edge.',
    noise: { type: 'lowpass', freq: 9000, Q: 0.3, decay: 0.45 } },
  // ---- mood impacts (2 Oct 2026) ----------------------------------------------
  // The one-shots the Make a Banger moods drop on the one: a taiko for Anthemic, a
  // timpani for Heroic and Gothic, a metal hit for Dark.
  taikoHit: { label: 'Taiko Hit', category: 'Tom', homeLane: 'tom', dur: 2.5,
    note: 'A big festival drum: a low sine that drops from 120 to 58 Hz under a slap of '
      + 'skin noise, with a long body so the hall seems to ring after it.',
    osc: { type: 'sine', from: 120, to: 58, sweep: 0.18, decay: 1.4, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 1800, Q: 0.7, decay: 0.08, gain: 0.45 },
    drive: 0.261725 },
  timpaniHit: { label: 'Timpani', category: 'Tom', homeLane: 'tom', dur: 3,
    note: 'A kettle drum: tuned, so the sine barely bends (100 to 96 Hz), with a felt '
      + 'mallet\'s soft thump and a resonance at the drum\'s first overtone that rings long.',
    osc: { type: 'sine', from: 100, to: 96, sweep: 0.05, decay: 1.8, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 900, Q: 0.7, decay: 0.05, gain: 0.3 },
    ring: { freq: 150, Q: 60, hit: 0.003, decay: 1.4, gain: 0.6 },
    drive: 0.081276 },
  metalHit: { label: 'Metal Hit', category: 'Perc', homeLane: 'tom', dur: 2.5,
    note: 'An industrial slam: an anvil-like inharmonic cluster over a short falling thud, '
      + 'driven into grit. For the one of a dark drop.',
    osc: { type: 'sine', from: 160, to: 50, sweep: 0.12, decay: 0.5, curve: 'exp', gain: 0.8 },
    metal: { freq: 410, spread: 1.3, count: 6, hp: 1200, Q: 1.2, slope: -24, decay: 1.1 },
    drive: 0.450032 },
  // ---- blasts (6 Oct 2026) ----------------------------------------------------
  // Big electronic crashes for the crash lane, built from the game's own bangs: the
  // filtered-noise body of `explosion()`, `impactCrash()` and the NEON lightning, put
  // where a song can play them on the beat. Mostly noise, swept bright to dark; the
  // `ring` section is a STRIKE here rather than a resonance — Q under 1 rings nothing,
  // so it is a second, highpassed noise burst for the front edge the body cannot have.
  blastBoom: { label: 'Blast · Boom', category: 'Crash', homeLane: 'crash', dur: 8,
    note: 'The game’s explosion as a drum: a lowpass closing from 7 kHz to 420 over a '
      + 'second and a half, a bright highpassed crack on the front and two sub sweeps '
      + 'falling to nothing underneath.',
    osc: { type: 'sine', from: 125, to: 22, sweep: 1.4, decay: 1.4, curve: 'exp', gain: 1.1 },
    osc2: { type: 'triangle', from: 68, to: 26, sweep: 1.2, decay: 1.2, curve: 'exp', gain: 0.7 },
    noise: { type: 'lowpass', freq: 7200, to: 420, sweep: 1.45, Q: 0.7, attack: 0.012,
      decay: 1.5, sag: 0.47, sagAt: 0.17, gain: 1 },
    ring: { type: 'highpass', freq: 2400, Q: 0.7, hit: 0.05, decay: 0.16, gain: 0.7 } },
  blastThunder: { label: 'Blast · Thunder', category: 'Crash', homeLane: 'crash', dur: 8,
    note: 'NEON’s lightning: a hard crack, a sawtooth zap falling through the band, and a '
      + 'long low roll with a sub under it that takes two and a half seconds to go.',
    osc: { type: 'sawtooth', from: 2200, to: 180, sweep: 0.26, decay: 0.26, curve: 'exp', gain: 0.3 },
    osc2: { type: 'sine', from: 62, to: 26, sweep: 2.4, decay: 2.4, curve: 'exp', gain: 1.2 },
    noise: { type: 'lowpass', freq: 7200, to: 170, sweep: 2.2, Q: 0.7, attack: 0.01,
      decay: 2.4, sag: 0.5, sagAt: 0.2, gain: 1 },
    ring: { type: 'highpass', freq: 2600, Q: 0.7, hit: 0.05, decay: 0.18, gain: 1.2 },
    drive: 0.2, tone: { type: 'lowpass', freq: 9000, Q: 0.7 } },
  blastImpact: { label: 'Blast · Impact', category: 'Crash', homeLane: 'crash', dur: 4,
    note: 'The game’s impact crash: the shorter cousin of the boom, a lowpass falling from '
      + '6 kHz to 260 in two thirds of a second over a quick sine thud. A crash you can '
      + 'play every bar.',
    osc: { type: 'sine', from: 145, to: 38, sweep: 0.3, decay: 0.3, curve: 'exp', gain: 0.55 },
    noise: { type: 'lowpass', freq: 6200, to: 260, sweep: 0.62, Q: 0.7, attack: 0.008,
      decay: 0.72, sag: 0.45, sagAt: 0.15, gain: 1 },
    ring: { type: 'highpass', freq: 3600, Q: 0.7, hit: 0.045, decay: 0.045, gain: 0.75 } },
  blastNoiseCrash: { label: 'Blast · Noise Crash', category: 'Crash', homeLane: 'crash', dur: 8,
    note: 'The white-noise crash of every big electronic drop: a steep lowpass opening '
      + 'wide and closing to 2 kHz over two seconds, a snap of air on the front, driven '
      + 'just enough to sound loud.',
    noise: { type: 'lowpass', freq: 14000, to: 2200, sweep: 2, Q: 1.2, slope: -24,
      attack: 0.002, hold: 0.03, decay: 2.3, sag: 0.55, sagAt: 0.08, gain: 1 },
    ring: { type: 'highpass', freq: 6000, Q: 0.7, hit: 0.02, decay: 0.05, gain: 0.6 },
    drive: 0.25, tone: { type: 'highpass', freq: 300, Q: 0.7 } },
  blastBolt: { label: 'Blast · Bolt', category: 'Crash', homeLane: 'crash', dur: 4,
    note: 'A lightning strike without the thunder: a resonant band of noise diving from '
      + '7 kHz to 500 with a sawtooth snapping down inside it, driven until it buzzes.',
    osc: { type: 'sawtooth', from: 3200, to: 90, sweep: 0.3, pitchCurve: 'snap',
      decay: 0.35, curve: 'exp', gain: 0.4 },
    noise: { type: 'bandpass', freq: 7000, to: 500, sweep: 0.55, Q: 4, slope: -24,
      attack: 0.001, decay: 0.7, sag: 0.4, sagAt: 0.05, gain: 1.4 },
    drive: 0.45, tone: { type: 'lowpass', freq: 9000, Q: 0.7 } },
  blastGated: { label: 'Blast · Gated', category: 'Crash', homeLane: 'crash', dur: 3,
    note: 'The blast with a gate on it: a wall of noise held flat for a quarter of a '
      + 'second and then shut, over a falling thud. Big without a tail to clutter the bar.',
    osc: { type: 'sine', from: 160, to: 45, sweep: 0.12, decay: 0.35, curve: 'exp', gain: 0.8 },
    noise: { type: 'lowpass', freq: 9000, to: 3000, sweep: 0.35, Q: 0.7, attack: 0.002,
      hold: 0.28, decay: 0.06, curve: 'lin', gain: 1 },
    drive: 0.3, tone: { type: 'lowpass', freq: 10000, Q: 0.7 } },
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
  // puts its own kind first, but the drum groups stay together in the picker.
  //
  // `Perc` used to be all four of the last ones at once, and at fifty-one presets it was
  // three times the size of any other group and had stopped being a category — you
  // scrolled it rather than chose from it. It is split by the JOB a sound does, which is
  // how a kit is actually shopped: you think "I need a cowbell", not "I need something
  // realistic". The tempting split — acoustic-sounding against electronic — was tried on
  // paper and rejected, because it cuts THROUGH the families instead of between them.
  // `cbSosTriangle` is a spectrum measured off a real CR8000 and `cb808Unclamped` is the
  // TR-808's circuit, and they are two of the same five cowbells; separating them puts
  // the two presets a person most wants to A/B in different groups. Whether a sound
  // imitates wood or a transistor is a PROPERTY, and properties belong in the label —
  // `=` already means a named machine's own voice — not in the tree.
  //
  //   Rim    the stick: rims, rimshots, cross-sticks
  //   Perc   struck instruments that exist offstage: cowbells, claves, congas, shakers
  //   Blip   electronic one-shots with no acoustic ancestor
  //   Sweep  the pitch-fall instruments: Synare, Syndrum, the long pews
  'Kick', 'Snare', 'Hats', 'Clap', 'Tom', 'Crash', 'Rim', 'Perc', 'Blip', 'Sweep',
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

// Deliberately still `rim: 'Perc'` after the Perc split. This reads song-local snapshots
// saved BEFORE Rim/Blip/Sweep existed, and every one of them that sat on the rim lane was
// written as Perc. Pointing it at 'Rim' would retroactively move sounds a song already
// filed, which is a different claim from where a NEW preset belongs.
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

// Why there is no noise-based drum among the TONE presets — no snare with a real snap,
// no closed hat that hisses. `Tone.Noise` fills its buffer from `Math.random` at
// construction, so two renders of the same song would not be sample-identical, and stems
// would stop summing to the mix — the property tools/lib/render-bank-browser.js relies on
// to apportion a clipping peak between lanes.
//
// The seeded buffer is what unlocked the rest, and everything percussive now lives on it,
// in DRUM. The two Tone drum classes that used to sit here — MembraneSynth for a pitch
// drop, MetalSynth for inharmonic partials — are retired: both are sections of a KLNG8
// preset (`osc` and `metal`), with their numbers open instead of welded shut.

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
  roundMono: { label: 'Classic Saw Bass', category: 'Bass', synth: 'CRLS-1', dur: 1.8,
    note: 'Saw through a lowpass that closes as the note decays — the classic synth bass.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.001, decay: 1.24, sustain: 0.29, release: 0.8 },
      filter: { type: 'lowpass', Q: 2.9, rolloff: -24 },
      filterEnvelope: { attack: 0.0016, decay: 0.7207, sustain: 0.0782, release: 0.1477, baseFrequency: 110, octaves: 3.9, attackCurve: 'exponential', decayCurve: 'exponential', releaseCurve: 'exponential' },
    } },
  fmGrowl: { label: 'FM Growl', category: 'Bass', synth: 'RMND-2', dur: 1.8,
    note: 'Modulated sine with a hard edge on the attack. Cuts through a busy kit.',
    options: {
      harmonicity: 1.5, modulationIndex: 6,
      oscillator: { type: 'sine' }, modulation: { type: 'square' },
      envelope: { attack: 0.005, decay: 0.25, sustain: 0.5, release: 0.3 },
      modulationEnvelope: { attack: 0.002, decay: 0.18, sustain: 0.1, release: 0.2 },
    } },
  acidSquelch: { label: 'Acid Squelch', category: 'Bass', synth: 'CRLS-1', dur: 1.2,
    note: 'High resonance and a fast filter sweep — the 303 move. Short notes only.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.002, decay: 0.1, sustain: 0.3, release: 0.1 },
      filter: { type: 'lowpass', Q: 8, rolloff: -24 },
      filterEnvelope: { attack: 0.0037, decay: 0.0688, sustain: 0.0504, release: 0.055, baseFrequency: 180, octaves: 4, attackCurve: 'exponential', decayCurve: 'exponential', releaseCurve: 'exponential' },
    } },
  rubberBass: { label: 'Rubber Bass', category: 'Bass', synth: 'CRLS-1', dur: 1.6,
    note: 'Triangle through a soft filter with a slow-ish attack. Bounces rather than punches.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.02, decay: 0.49, sustain: 0.6, release: 0.3 },
      filter: { type: 'lowpass', Q: 3, rolloff: -12 },
      filterEnvelope: { attack: 0.0175, decay: 0.1972, sustain: 0.3541, release: 0.1333, baseFrequency: 100, octaves: 4.6, attackCurve: 'exponential', decayCurve: 'exponential', releaseCurve: 'exponential' },
    },
    transpose: -12 },
  clangBass: { label: 'Clang', category: 'Bass', synth: 'RMND-2', dur: 1.4,
    note: 'Inharmonic FM — metal in the attack, pitch underneath. Reads as industrial.',
    options: {
      harmonicity: 3.01, modulationIndex: 12,
      oscillator: { type: 'square' }, modulation: { type: 'sawtooth' },
      envelope: { attack: 0.002, decay: 0.3, sustain: 0.2, release: 0.2 },
      modulationEnvelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
    } },
  detuneBass: { label: 'Wide Detune Bass', category: 'Bass', synth: 'MRDR-3', dur: 1.8,
    note: 'Two layers a few cents apart, saw against square. Big, and wide without a chorus.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, detune: 0, gain: 1,
        attack: 0.008, decay: 0.2, sustain: 0.7, release: 0.3 },
      osc2: { type: 'square', ratio: 1, detune: 13.8, gain: 1,
        attack: 0.012, decay: 0.2, sustain: 0.7, release: 0.3 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 200, Q: 1, track: 0,
        env: { octaves: 3, attack: 0.01, decay: 0.001, sustain: 1, release: 0.5 } },
    },
    vibrato: { depth: 0.01, rate: 3 } },

  // ---- Lead ---------------------------------------------------------------
  // The three the MIDI importer starts every pitched lane on — see `importStarterFor`
  // in tools/lib/midi-import.js. Ordinary library presets, offered in every picker and
  // open to the editor like their neighbours: an imported song arrives on one of these,
  // so leaving them off the menu made them a door that only opened outwards — pick some
  // other sound on the lane and there was no way back to the one the import chose.
  //
  // They are deliberately NOT in the frozen STARTER table: no style pack names them, and
  // the freeze exists for what the New Song generator is written for. An import is a
  // working document on the desk, so these follow the library the way every other song
  // that names a preset does.
  //
  // Ids are references — the importer names two of them, and every song already imported
  // names them in its mix — so they keep their names and take no `st` prefix.
  simpleSquare: { label: 'Simple Square', category: 'Lead', synth: 'CRLS-1', dur: 1.2,
    note: 'Square through an opening filter: the arcade lead with an envelope the raw '
      + 'oscillator cannot give it.',
    options: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.002, decay: 0.15, sustain: 0.88, release: 0.2 },
      filter: { type: 'lowpass', Q: 0.1, rolloff: -12 },
      filterEnvelope: { attack: 0.0022, decay: 0.0785, sustain: 0.2268, release: 0.0886, baseFrequency: 2915, octaves: 1.2, attackCurve: 'linear', decayCurve: 'exponential', releaseCurve: 'exponential' },
    } },
  simpleSawtooth: { label: 'Simple Sawtooth', category: 'Lead', synth: 'CRLS-1', dur: 1.2,
    note: 'Sawtooth through an opening filter: the arcade lead with an envelope the raw '
      + 'oscillator cannot give it.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.002, decay: 0.15, sustain: 0.88, release: 0.2 },
      filter: { type: 'lowpass', Q: 0.1, rolloff: -12 },
      filterEnvelope: { attack: 0.0022, decay: 0.0785, sustain: 0.2268, release: 0.0886, baseFrequency: 2915, octaves: 1.2, attackCurve: 'linear', decayCurve: 'exponential', releaseCurve: 'exponential' },
    } },
  simpleTriangle: { label: 'Simple Triangle', category: 'Lead', synth: 'CRLS-1', dur: 1.2,
    note: 'Triangle wave through an opening filter: the arcade lead with an envelope the raw '
      + 'oscillator cannot give it.',
    options: {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.002, decay: 0.15, sustain: 0.88, release: 0.2 },
      filter: { type: 'lowpass', Q: 0.1, rolloff: -12 },
      filterEnvelope: { attack: 0.0022, decay: 0.0785, sustain: 0.2268, release: 0.0886, baseFrequency: 2915, octaves: 1.2, attackCurve: 'linear', decayCurve: 'exponential', releaseCurve: 'exponential' },
    },
    trim: 1.2 },
  monoBright: { label: 'Bright Mono', category: 'Lead', synth: 'CRLS-1', dur: 1.2,
    note: 'Square through an opening filter: the arcade lead with an envelope the raw oscillator cannot give it.',
    options: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.004, decay: 0.15, sustain: 0.6, release: 0.2 },
      filter: { type: 'lowpass', Q: 2, rolloff: -12 },
      filterEnvelope: { attack: 0.002, decay: 0.0975, sustain: 0.3775, release: 0.1063, baseFrequency: 600, octaves: 3.2, attackCurve: 'linear', decayCurve: 'exponential', releaseCurve: 'exponential' },
    } },
  amHollow: { label: 'AM Hollow', category: 'Lead', synth: 'RMND-2', dur: 1.2,
    note: 'Ring-modulated and slightly out of tune with itself. Reads as a voice rather than a synth.',
    options: {
      harmonicity: 2,
      oscillator: { type: 'square' }, modulation: { type: 'sine' },
      envelope: { attack: 0.008, decay: 0.2, sustain: 0.6, release: 0.3 },
      modulationEnvelope: { attack: 0.05, decay: 0.2, sustain: 0.5, release: 0.3 },
    } },
  duoDetune: { label: 'Duo Detune', category: 'Lead', synth: 'MRDR-3', dur: 1.4,
    note: 'A detuned pair under a slow vibrato. The widest lead here.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, detune: 0, gain: 1,
        attack: 0.02, decay: 0.2, sustain: 0.7, release: 0.4 },
      osc2: { type: 'sawtooth', ratio: 1, detune: 8.6, gain: 1,
        attack: 0.03, decay: 0.2, sustain: 0.7, release: 0.4 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 200, Q: 1, track: 0,
        env: { octaves: 3, attack: 0.01, decay: 0.001, sustain: 1, release: 0.5 } },
    },
    vibrato: { depth: 0.06, rate: 5 } },
  glassLead: { label: 'Glass', category: 'Lead', synth: 'RMND-2', dur: 1.2,
    note: 'High harmonicity, short modulation — thin and clear, sits over a dense mix.',
    options: {
      harmonicity: 5, modulationIndex: 3,
      oscillator: { type: 'sine' }, modulation: { type: 'sine' },
      envelope: { attack: 0.004, decay: 0.2, sustain: 0.5, release: 0.3 },
      modulationEnvelope: { attack: 0.002, decay: 0.15, sustain: 0.1, release: 0.2 },
    } },
  reedLead: { label: 'Reed', category: 'Orch', synth: 'CRLS-1', dur: 1.6,
    note: 'Slow attack into a narrow filter — a clarinet-ish breath rather than a stab.',
    options: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.06, decay: 0.1, sustain: 0.8, release: 0.3 },
      filter: { type: 'lowpass', Q: 1, rolloff: -12 },
      filterEnvelope: { attack: 0.085, decay: 0.1251, sustain: 0.5283, release: 0.1236, baseFrequency: 400, octaves: 2, attackCurve: 'linear', decayCurve: 'exponential', releaseCurve: 'exponential' },
    } },
  screamLead: { label: 'Scream', category: 'FX', synth: 'CRLS-1', dur: 1.2,
    note: 'Resonance up near self-oscillation. Unsubtle on purpose.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.003, decay: 0.1, sustain: 0.7, release: 0.2 },
      filter: { type: 'lowpass', Q: 12, rolloff: -24 },
      filterEnvelope: { attack: 0.0102, decay: 0.2216, sustain: 0.4865, release: 0.0917, baseFrequency: 800, octaves: 3, attackCurve: 'linear', decayCurve: 'exponential', releaseCurve: 'exponential' },
    } },
  vibratoLead: { label: 'Vibrato Voice', category: 'Lead', synth: 'MRDR-3', dur: 1.8,
    note: 'Heavy, slow vibrato on a near-unison pair — the closest thing here to someone singing.',
    layer: {
      osc1: { type: 'triangle', ratio: 1, detune: 0, gain: 1,
        attack: 0.05, decay: 0.2, sustain: 0.8, release: 0.4 },
      osc2: { type: 'sine', ratio: 1, detune: 3.5, gain: 1,
        attack: 0.07, decay: 0.2, sustain: 0.8, release: 0.4 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 200, Q: 1, track: 0,
        env: { octaves: 3, attack: 0.01, decay: 0.001, sustain: 1, release: 0.5 } },
    },
    vibrato: { depth: 0.175, rate: 5.5 } },

  // ---- Keys ---------------------------------------------------------------
  fmKeys: { label: 'FM Keys', category: 'Keys', synth: 'RMND-2', dur: 2.6,
    note: 'Struck keys, percussive enough to keep a stab from smearing into the next bar.',
    options: {
      harmonicity: 2, modulationIndex: 4,
      oscillator: { type: 'sine' }, modulation: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.8, sustain: 0.1, release: 0.8 },
      modulationEnvelope: { attack: 0.004, decay: 0.4, sustain: 0.05, release: 0.5 },
    } },
  epiano: { label: 'Electric Piano', category: 'Keys', synth: 'RMND-2', dur: 3,
    note: 'The Rhodes shape: bell in the attack, sine underneath, long decay.',
    options: {
      harmonicity: 3, modulationIndex: 10,
      oscillator: { type: 'sine' }, modulation: { type: 'sine' },
      envelope: { attack: 0.002, decay: 1.2, sustain: 0.06, release: 1 },
      modulationEnvelope: { attack: 0.001, decay: 0.25, sustain: 0.01, release: 0.3 },
    } },
  clav: { label: 'Clavinet', category: 'Keys', synth: 'CRLS-1', dur: 1,
    note: 'Short, hard and bandpassed. Funk comping — it wants sixteenths.',
    options: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.12, sustain: 0.05, release: 0.1 },
      filter: { type: 'bandpass', Q: 3, rolloff: -12 },
      filterEnvelope: { attack: 0.0013, decay: 0.0574, sustain: 0.0986, release: 0.0376, baseFrequency: 700, octaves: 2.5, attackCurve: 'exponential', decayCurve: 'exponential', releaseCurve: 'exponential' },
    } },
  toyPiano: { label: 'Toy Piano', category: 'Bells', synth: 'RMND-2', dur: 2,
    note: 'Inharmonic and small, with a knock in the attack. Cardboard Kingdom material.',
    options: {
      harmonicity: 4.02, modulationIndex: 6,
      oscillator: { type: 'triangle' }, modulation: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.5, sustain: 0.02, release: 0.5 },
      modulationEnvelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
    } },
  softKeys: { label: 'Soft Keys', category: 'Keys', synth: 'CRLS-1', dur: 2.4,
    note: 'A triangle with a gentle envelope. Does its job and gets out of the way.',
    options: { oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.5, sustain: 0.3, release: 0.6 } } },

  // ---- Pad ----------------------------------------------------------------
  padTriangle: { label: 'Triangle Pad', category: 'Pad', synth: 'CRLS-1', dur: 3.2,
    note: 'Slow in, slow out. The attack is heard as an arrival, so it wants held sections.',
    options: { oscillator: { type: 'triangle' }, envelope: { attack: 0.12, decay: 0.4, sustain: 0.7, release: 0.9 } } },
  warmPad: { label: 'Warm Pad', category: 'Pad', synth: 'CRLS-1', dur: 4,
    note: 'Saw behind a filter that opens slowly. The most ordinary pad there is, and it works.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.25, decay: 0.4, sustain: 0.8, release: 1.2 },
      filter: { type: 'lowpass', Q: 1, rolloff: -12 },
      filterEnvelope: { attack: 0.5313, decay: 0.211, sustain: 0.6921, release: 0.3506, baseFrequency: 200, octaves: 2.6, attackCurve: 'linear', decayCurve: 'exponential', releaseCurve: 'exponential' },
    } },
  glassPad: { label: 'Glass Pad', category: 'Pad', synth: 'RMND-2', dur: 4,
    note: 'Ring modulation over a long swell — shimmering rather than warm.',
    options: {
      harmonicity: 3.01,
      oscillator: { type: 'sine' }, modulation: { type: 'sine' },
      envelope: { attack: 0.3, decay: 0.5, sustain: 0.7, release: 1.4 },
      modulationEnvelope: { attack: 0.6, decay: 0.4, sustain: 0.6, release: 1 },
    } },
  breathPad: { label: 'Breath', category: 'Orch', synth: 'MRDR-3', dur: 4.5,
    note: 'Two slightly detuned layers swelling together. Big and slow.',
    layer: {
      osc1: { type: 'triangle', ratio: 1, detune: 0, gain: 1,
        attack: 0.35, decay: 0.4, sustain: 0.8, release: 1.4 },
      osc2: { type: 'sawtooth', ratio: 1, detune: 17.2, gain: 1,
        attack: 0.5, decay: 0.4, sustain: 0.7, release: 1.6 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 200, Q: 1, track: 0,
        env: { octaves: 3, attack: 0.01, decay: 0.001, sustain: 1, release: 0.5 } },
    },
    vibrato: { depth: 0.04, rate: 2.5 } },

  // ---- Organ --------------------------------------------------------------
  amOrgan: { label: 'AM Organ', category: 'Organ', synth: 'RMND-2', dur: 2.6,
    note: 'Held and slightly beating, the way an organ with two drawbars out is.',
    options: {
      harmonicity: 1,
      oscillator: { type: 'square' }, modulation: { type: 'sine' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.9, release: 0.35 },
      modulationEnvelope: { attack: 0.1, decay: 0.1, sustain: 0.8, release: 0.3 },
    } },
  fullOrgan: { label: 'Full Organ', category: 'Organ', synth: 'RMND-2', dur: 3,
    note: 'All stops out: harmonically dense and completely flat in level, like a key held down.',
    options: {
      harmonicity: 2, modulationIndex: 2,
      oscillator: { type: 'square' }, modulation: { type: 'square' },
      envelope: { attack: 0.01, decay: 0.01, sustain: 1, release: 0.2 },
      modulationEnvelope: { attack: 0.01, decay: 0.01, sustain: 1, release: 0.2 },
    } },
  reedOrgan: { label: 'Reed Organ', category: 'Organ', synth: 'CRLS-1', dur: 3,
    note: 'A wheezier, narrower organ — harmonium rather than Hammond.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.04, decay: 0.05, sustain: 0.95, release: 0.3 },
      filter: { type: 'bandpass', Q: 2, rolloff: -12 },
      filterEnvelope: { attack: 0.0554, decay: 0.0527, sustain: 0.7452, release: 0.1218, baseFrequency: 500, octaves: 1.5, attackCurve: 'linear', decayCurve: 'exponential', releaseCurve: 'exponential' },
    } },

  // ---- Bells --------------------------------------------------------------
  fmBell: { label: 'FM Bell', category: 'Bells', synth: 'RMND-2', dur: 1.2,
    note: 'Struck and metallic, decaying rather than held — a bell at long lengths.',
    options: {
      harmonicity: 3,
      modulationIndex: 14.3,
      oscillator: { type: 'sine' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.003, decay: 0.6, sustain: 0.05, release: 0.6 },
      modulationEnvelope: { attack: 0.002, decay: 0.35, sustain: 0.02, release: 0.4 },
    } },
  celeste: { label: 'Celeste', category: 'Bells', synth: 'RMND-2', dur: 4,
    note: 'Small, high and pure, with a very long tail. Made for the twinkle lane.',
    options: {
      harmonicity: 7, modulationIndex: 4,
      oscillator: { type: 'sine' }, modulation: { type: 'sine' },
      envelope: { attack: 0.001, decay: 1.6, sustain: 0.01, release: 1.6 },
      modulationEnvelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.4 },
    } },
  marimba: { label: 'Marimba', category: 'Bells', synth: 'RMND-2', dur: 1.4,
    note: 'Wooden and short. The mallet is the whole sound; there is no sustain to speak of.',
    options: {
      harmonicity: 4, modulationIndex: 3,
      oscillator: { type: 'sine' }, modulation: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.35 },
      modulationEnvelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
    } },
  musicBox: { label: 'Music Box', category: 'Bells', synth: 'RMND-2', dur: 3,
    note: 'Thin, high and slightly sour, with the click of the comb in the attack.',
    options: {
      harmonicity: 6.03, modulationIndex: 7,
      oscillator: { type: 'sine' }, modulation: { type: 'square' },
      envelope: { attack: 0.001, decay: 1, sustain: 0.01, release: 1 },
      modulationEnvelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.1 },
    } },

  // ---- Pluck --------------------------------------------------------------
  synthPluck: { label: 'Synth Pluck', category: 'Pluck', synth: 'CRLS-1', dur: 0.9,
    note: 'Filter slams shut immediately. Short, bright, and gone.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.18 },
      filter: { type: 'lowpass', Q: 4, rolloff: -24 },
      filterEnvelope: { attack: 0.002, decay: 0.0675, sustain: 0, release: 0.04, baseFrequency: 300, octaves: 4, attackCurve: 'exponential', decayCurve: 'exponential', releaseCurve: 'linear' },
    } },
  harpPluck: { label: 'Harp', category: 'Pluck', synth: 'CRLS-1', dur: 2,
    note: 'A triangle with no sustain at all — the string is let go the moment it is struck.',
    options: { oscillator: { type: 'triangle' }, envelope: { attack: 0.002, decay: 0.7, sustain: 0, release: 0.7 } } },
  koto: { label: 'Koto', category: 'Pluck', synth: 'RMND-2', dur: 1.6,
    note: 'Bright inharmonic pluck with a fast decay. Reads as a struck string.',
    options: {
      harmonicity: 2.51, modulationIndex: 9,
      oscillator: { type: 'triangle' }, modulation: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.5, sustain: 0.02, release: 0.4 },
      modulationEnvelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.15 },
    } },

  // ---- Orch ---------------------------------------------------------------
  brassStab: { label: 'Brass Stab', category: 'Orch', synth: 'CRLS-1', dur: 1.4,
    note: 'Filter rises through the note the way a horn section leans into one.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.03, decay: 0.15, sustain: 0.7, release: 0.2 },
      filter: { type: 'lowpass', Q: 2, rolloff: -12 },
      filterEnvelope: { attack: 0.12, decay: 0.1477, sustain: 0.7158, release: 0.1083, baseFrequency: 300, octaves: 3, attackCurve: 'linear', decayCurve: 'exponential', releaseCurve: 'exponential' },
    } },
  synthStrings: { label: 'Synth Strings', category: 'Orch', synth: 'MRDR-3', dur: 4,
    note: 'The string-machine sound: two detuned saws, slow on, slow off.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, detune: 0, gain: 1,
        attack: 0.2, decay: 0.3, sustain: 0.85, release: 1 },
      osc2: { type: 'sawtooth', ratio: 1, detune: 10.4, gain: 1,
        attack: 0.3, decay: 0.3, sustain: 0.85, release: 1.2 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 200, Q: 1, track: 0,
        env: { octaves: 3, attack: 0.01, decay: 0.001, sustain: 1, release: 0.5 } },
    },
    vibrato: { depth: 0.025, rate: 4 } },
  hornSwell: { label: 'Horn Swell', category: 'Orch', synth: 'RMND-2', dur: 3,
    note: 'Slow crescendo with the harmonics arriving after the fundamental, as a brass note does.',
    options: {
      harmonicity: 1, modulationIndex: 5,
      oscillator: { type: 'sawtooth' }, modulation: { type: 'sine' },
      envelope: { attack: 0.15, decay: 0.2, sustain: 0.8, release: 0.5 },
      modulationEnvelope: { attack: 0.4, decay: 0.3, sustain: 0.7, release: 0.4 },
    } },

  // ---- FX -----------------------------------------------------------------
  buzzSaw: { label: 'Buzz Saw', category: 'FX', synth: 'CRLS-1', dur: 1.2,
    note: 'Filter wide open, no envelope on it. Raw, and deliberately unmusical.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0.9, release: 0.1 },
      filter: { type: 'highpass', Q: 1, rolloff: -12 },
      filterEnvelope: { attack: 0.001, decay: 0.03, sustain: 1, release: 0.0372, baseFrequency: 80, octaves: 0.2, attackCurve: 'linear', decayCurve: 'linear', releaseCurve: 'exponential' },
    } },
  ringMod: { label: 'Ring Mod', category: 'FX', synth: 'RMND-2', dur: 1.4,
    note: 'Inharmonic ring modulation — the pitch is in there but so is a second one.',
    options: {
      harmonicity: 2.47,
      oscillator: { type: 'sawtooth' }, modulation: { type: 'square' },
      envelope: { attack: 0.004, decay: 0.2, sustain: 0.6, release: 0.3 },
      modulationEnvelope: { attack: 0.004, decay: 0.2, sustain: 0.6, release: 0.3 },
    } },
  hardFm: { label: 'Gritty FM Lead', category: 'FX', synth: 'RMND-2', dur: 1.2,
    note: 'Modulation index high enough to be noise with a pitch in it.',
    options: {
      harmonicity: 1.585,
      modulationIndex: 4.1,
      oscillator: { type: 'sawtooth' },
      modulation: { type: 'sawtooth' },
      envelope: { attack: 0.002, decay: 0.25, sustain: 0.4, release: 0.2 },
      modulationEnvelope: { attack: 0.002, decay: 0.2, sustain: 0.3, release: 0.2 },
    } },


  // ---- what is left of the Tone drums --------------------------------------
  // MembraneSynth and MetalSynth are gone — a pitch drop into a body and a cluster of
  // inharmonic partials are `osc` and `metal` on a KLNG8 preset, which is the same two
  // circuits with the numbers exposed. What stays here is the handful of percussion
  // built on the PITCHED Tone classes, which have no KLNG8 equivalent: an FM snare is
  // an operator pair, not a source and a filter. `taps` gives the clap shape without
  // noise — the same strike heard several times, each quieter.




  // `homeLane` is the lane tools/measure-voices.js measures a preset ON. It matters
  // only on the kit, where the LANE supplies the note: the Perc category covers
  // both the claves and the drums, and measuring a taiko at the rim lane's 420 Hz
  // levels it against a pitch nobody strikes it at. Everything without one is measured
  // where its category says — see HOME_LANES in the tool.
  clave: { label: 'Clave', category: 'Perc', synth: 'RMND-2', dur: 0.6,
    note: 'A hard, high, completely dry click with a pitch to it. Cuts through '
      + 'anything at almost no level.',
    options: { harmonicity: 3.02, modulationIndex: 8,
      oscillator: { type: 'sine' }, modulation: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.04 },
      modulationEnvelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.02 } } },
  // ---- Drum sources --------------------------------------------------------
  // Struck at the lane's own note (VOICE_LANES), because a drum lane holds booleans.
  // All oscillator-based: see the note by VOICE_CATEGORIES for why none of these
  // hiss. They go on a melodic lane perfectly well, and a tuned kick following a
  // bass line is a real sound rather than a mistake.
  // The fourth pair, and the only one that is really six oscillators rather than
  // filtered air: harmonicity 5.1 is the inharmonic ratio the 808 built its hat from,
  // and it is why this reads as a machine's cymbal where the noise pairs read as a
  // stick on metal. Both halves carry identical partials — only the envelope differs,
  // which is what a pedal does to a real hat.

  woodBlock: { label: 'Wood Block', category: 'Perc', synth: 'RMND-2', dur: 0.6,
    note: 'A short knock with almost no tail. Good for rim, and for a tick that '
      + 'keeps time without taking up room.',
    options: {
      harmonicity: 4.5, modulationIndex: 14,
      oscillator: { type: 'sine' }, modulation: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.06 },
      modulationEnvelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.03 },
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
  tpBah: { label: 'Bah', category: 'Lead', synth: 'CRLS-1', dur: 1.4,
    note: "A bandpassed saw with a vowel in it — the filter sits where a voice’s formant would. Tone.js’s own preset.",
    origin: "Tonejs/Presets MonoSynth/Bah",
    options: {"oscillator":{"type":"sawtooth"},"filter":{"Q":2,"type":"bandpass","rolloff":-24},"envelope":{"attack":0.01,"decay":0.1,"sustain":0.2,"release":0.6},"filterEnvelope":{"attack":0.02,"decay":0.4,"sustain":1,"release":0.7,"releaseCurve":"linear","baseFrequency":20,"octaves":5,"style":"classic"}} },
  tpBassGuitar: { label: 'Bass Guitar', category: 'Bass', synth: 'CRLS-1', dur: 1.8,
    note: "An FM square through a lowpass, voiced to sit where a plucked electric bass sits.",
    origin: "Tonejs/Presets MonoSynth/BassGuitar",
    options: {"oscillator":{"type":"fmsquare5","modulationType":"triangle","modulationIndex":2,"harmonicity":0.501},"filter":{"Q":1,"type":"lowpass","rolloff":-24},"envelope":{"attack":0.01,"decay":0.1,"sustain":0.4,"release":2},"filterEnvelope":{"attack":0.0092,"decay":0.0798,"sustain":0.8623,"release":0.6648,"baseFrequency":50,"octaves":4.4,"attackCurve":"linear","decayCurve":"exponential","releaseCurve":"exponential"}} },
  tpBassy: { label: 'Hollow Bass', category: 'Bass', synth: 'CRLS-1', dur: 1.8,
    note: "Built from explicit partials rather than a waveform name, with a resonant lowpass over it. Fat and slightly hollow.",
    origin: "Tonejs/Presets MonoSynth/Bassy",
    options: {"portamento":0.08,"oscillator":{"partials":[2,1,3,2,0.4]},"filter":{"Q":4,"type":"lowpass","rolloff":-24},"envelope":{"attack":0.04,"decay":0.06,"sustain":0.4,"release":1},"filterEnvelope":{"attack":0.0098,"decay":0.0798,"sustain":0.6325,"release":0.5082,"baseFrequency":50,"octaves":3.4,"attackCurve":"linear","decayCurve":"exponential","releaseCurve":"exponential"}} },
  tpBrassCircuit: { label: 'Brass Circuit', category: 'Orch', synth: 'CRLS-1', dur: 1.6,
    note: "A slow filter swell over a saw — the horn-section lean, done with an envelope.",
    origin: "Tonejs/Presets MonoSynth/BrassCircuit",
    options: {"portamento":0.01,"oscillator":{"type":"sawtooth"},"filter":{"Q":2,"type":"lowpass","rolloff":-24},"envelope":{"attack":0.1,"decay":0.1,"sustain":0.6,"release":0.5},"filterEnvelope":{"attack":0.0554,"decay":0.4074,"sustain":0.2468,"release":0.4,"baseFrequency":2000,"octaves":1.5,"attackCurve":"linear","decayCurve":"exponential","releaseCurve":"exponential"}} },
  tpCoolGuy: { label: 'Cool Guy', category: 'Lead', synth: 'CRLS-1', dur: 1.4,
    note: "Pulse-width modulation: the waveform’s duty cycle moves under the note, which reads as chorus without one.",
    origin: "Tonejs/Presets MonoSynth/CoolGuy",
    options: {"oscillator":{"type":"pwm","modulationFrequency":1},"filter":{"Q":6,"rolloff":-24},"envelope":{"attack":0.025,"decay":0.3,"sustain":0.9,"release":2},"filterEnvelope":{"attack":0.245,"decay":0.131,"sustain":0.5,"release":2,"baseFrequency":20,"octaves":7.2,"style":"classic"}} },
  tpPianoetta: { label: 'Pianoetta', category: 'Keys', synth: 'CRLS-1', dur: 2.2,
    note: "A square through a gentle lowpass with a piano-ish decay. Toy upright rather than grand.",
    origin: "Tonejs/Presets MonoSynth/Pianoetta",
    options: {"oscillator":{"type":"square"},"filter":{"Q":2,"type":"lowpass","rolloff":-12},"envelope":{"attack":0.005,"decay":3,"sustain":0,"release":0.45},"filterEnvelope":{"attack":0.001,"decay":0.2547,"sustain":0.897,"release":0.7647,"baseFrequency":700,"octaves":2.3,"attackCurve":"linear","decayCurve":"exponential","releaseCurve":"exponential"}} },
  tpPizz: { label: 'Pizz', category: 'Pluck', synth: 'CRLS-1', dur: 0.8,
    note: 'Highpassed and cut off immediately — pizzicato strings, all attack and no body.',
    origin: 'Tonejs/Presets MonoSynth/Pizz',
    options: {
      oscillator: { type: 'sawtooth' },
      filter: { Q: 3, type: 'highpass', rolloff: -12 },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.9 },
      filterEnvelope: { attack: 0.0114, decay: 0.0237, sustain: 0, release: 0.04, baseFrequency: 800, octaves: -1.2, attackCurve: 'linear', decayCurve: 'exponential', releaseCurve: 'linear' },
    },
    trim: -2.3 },
  tpAlienChorus: { label: 'Alien Chorus', category: 'Orch', synth: 'CRLS-1', dur: 4,
    note: "Four detuned sines spread across sixty cents. Still the widest thing in the library — the "
      + "spread is what makes it enormous, not the head count, which is why it survived coming down "
      + "from ten to the MAX_UNISON every family now shares.",
    origin: "Tonejs/Presets Synth/AlienChorus",
    options: {"oscillator":{"type":"fatsine4","spread":60,"count":4},"envelope":{"attack":0.4,"decay":0.01,"sustain":1,"attackCurve":"exponential","releaseCurve":"exponential","release":0.4}} },
  tpDelicateWind: { label: 'Delicate Wind Part', category: 'Orch', synth: 'CRLS-1', dur: 5,
    note: "Two full seconds of attack. Not a note so much as a slow arrival — it needs a held section to be heard at all.",
    origin: "Tonejs/Presets Synth/DelicateWindPart",
    options: {"portamento":0,"oscillator":{"type":"square4"},"envelope":{"attack":2,"decay":1,"sustain":0.2,"release":2}} },
  tpLectric: { label: 'Lectric', category: 'Lead', synth: 'CRLS-1', dur: 1.4,
    note: "Portamento of 0.2 means every note slides into the next. A lead that will not sit still.",
    origin: "Tonejs/Presets Synth/Lectric",
    options: {"portamento":0.2,"oscillator":{"type":"sawtooth"},"envelope":{"attack":0.03,"decay":0.1,"sustain":0.2,"release":0.02}} },
  tpMarimba: { label: 'Synth Marimba', category: 'Bells', synth: 'CRLS-1', dur: 2,
    note: 'Odd partials only, struck and left to ring. Woodier than the FM marimba beside it.',
    origin: 'Tonejs/Presets Synth/Marimba',
    options: {
      oscillator: { partials: [1, 0, 2, 0, 3] },
      envelope: { attack: 0.001, decay: 1.2, sustain: 0, release: 1.2 },
    } },
  tpSteelpan: { label: 'Steelpan', category: 'Bells', synth: 'CRLS-1', dur: 2.4,
    note: "A custom partial set, detuned three ways. Metallic and warm at once.",
    origin: "Tonejs/Presets Synth/Steelpan",
    options: {"oscillator":{"type":"fatcustom","partials":[0.2,1,0,0.5,0.1],"spread":40,"count":3},"envelope":{"attack":0.001,"decay":1.6,"sustain":0,"release":1.6}} },
  tpSuperSaw: { label: 'Super Saw', category: 'Lead', synth: 'CRLS-1', dur: 1.4,
    note: "Three sawtooths thirty cents apart — the trance lead, and the widest single sound here.",
    origin: "Tonejs/Presets Synth/SuperSaw",
    options: {"oscillator":{"type":"fatsawtooth","count":3,"spread":30},"envelope":{"attack":0.01,"decay":0.1,"sustain":0.5,"release":0.4,"attackCurve":"exponential"}} },
  tpTreeTrunk: { label: 'Tree Trunk', category: 'Pluck', synth: 'CRLS-1', dur: 1,
    note: "A short sine knock with a little sustain behind it. Hollow and wooden.",
    origin: "Tonejs/Presets Synth/TreeTrunk",
    options: {"oscillator":{"type":"sine"},"envelope":{"attack":0.001,"decay":0.1,"sustain":0.1,"release":1.2}} },
  tpElectricCello: { label: 'Electric Cello', category: 'Orch', synth: 'RMND-2', dur: 3,
    note: "High modulation index over a triangle: bowed rather than struck, with a bite on the attack.",
    origin: "Tonejs/Presets FMSynth/ElectricCello",
    options: {"harmonicity":3.01,"modulationIndex":14,"oscillator":{"type":"triangle"},"envelope":{"attack":0.2,"decay":0.3,"sustain":0.1,"release":1.2},"modulation":{"type":"square"},"modulationEnvelope":{"attack":0.01,"decay":0.5,"sustain":0.2,"release":0.1}} },
  tpKalimba: { label: 'Kalimba', category: 'Bells', synth: 'RMND-2', dur: 2.4,
    note: "Harmonicity 8 and almost no modulation — a thumb piano’s clean, high, quick ring.",
    origin: "Tonejs/Presets FMSynth/Kalimba",
    options: {"harmonicity":8,"modulationIndex":2,"oscillator":{"type":"sine"},"envelope":{"attack":0.001,"decay":2,"sustain":0.1,"release":2},"modulation":{"type":"square"},"modulationEnvelope":{"attack":0.002,"decay":0.2,"sustain":0,"release":0.2}} },
  tpThinSaws: { label: 'Thin Saws', category: 'Lead', synth: 'RMND-2', dur: 1.4,
    note: "Harmonicity below 1, so the modulator sits under the carrier. Reedy and narrow.",
    origin: "Tonejs/Presets FMSynth/ThinSaws",
    options: {"harmonicity":0.5,"modulationIndex":1.2,"oscillator":{"type":"fmsawtooth","modulationType":"sine","modulationIndex":20,"harmonicity":3},"envelope":{"attack":0.05,"decay":0.3,"sustain":0.1,"release":1.2},"modulation":{"volume":0,"type":"triangle"},"modulationEnvelope":{"attack":0.35,"decay":0.1,"sustain":1,"release":0.01}} },
  tpHarmonics: { label: 'Harmonics', category: 'Organ', synth: 'RMND-2', dur: 2.6,
    note: "Ring modulation at almost exactly four times the carrier — the partials line up, so it reads as an organ stop.",
    origin: "Tonejs/Presets AMSynth/Harmonics",
    options: {"harmonicity":3.999,"oscillator":{"type":"square"},"envelope":{"attack":0.03,"decay":0.3,"sustain":0.7,"release":0.8},"modulation":{"volume":12,"type":"square6"},"modulationEnvelope":{"attack":2,"decay":3,"sustain":0.8,"release":0.1}} },
  tpTiny: { label: 'Tiny', category: 'Keys', synth: 'RMND-2', dur: 1.6,
    note: "A tiny detuned AM sine. Small, clean and easy to place under anything.",
    origin: "Tonejs/Presets AMSynth/Tiny",
    options: {"harmonicity":2,"oscillator":{"type":"amsine2","modulationType":"sine","harmonicity":1.01},"envelope":{"attack":0.006,"decay":4,"sustain":0.04,"release":1.2},"modulation":{"volume":13,"type":"amsine2","modulationType":"sine","harmonicity":12},"modulationEnvelope":{"attack":0.006,"decay":0.2,"sustain":0.2,"release":0.4}} },
  roundMono2: { label: 'Plain Square', category: 'Lead', synth: 'CRLS-1', dur: 7.7,
    note: 'Simple Square Tone 2',
    options: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.3, attackCurve: 'linear', decayCurve: 'exponential', releaseCurve: 'exponential' },
      filter: { type: 'lowpass', rolloff: -12, Q: 0.1 },
      filterEnvelope: { baseFrequency: 18000, octaves: 0, attack: 0.001, decay: 0.2, sustain: 0.5, release: 0.3, attackCurve: 'linear', decayCurve: 'exponential', releaseCurve: 'exponential' },
    } },
  toneSquare: { label: 'Square Tone', category: 'Lead', synth: 'KNDO-5', dur: 1,
    note: 'A direct single-oscillator square-wave replacement for the engine voice.',
    options: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0, sustain: 1, release: 0.01, attackCurve: 'exponential' },
    },
    fixedLength: 0.144,
    waveform: 'square',
    attack: 0.001, release: 0.089, trim: 0.8,
    vibrato: { depth: 0, rate: 10.9 },
    mono: false,
    portamento: 0 },
  toneSawtooth: { label: 'Sawtooth Tone', category: 'Lead', synth: 'KNDO-5', dur: 1.2,
    note: 'A direct single-oscillator sawtooth replacement for the engine voice.',
    fixedLength: 0.063, waveform: 'sawtooth', attack: 0.01, release: 0.015, trim: 0 },
  toneTriangle: { label: 'Triangle Tone', category: 'Lead', synth: 'KNDO-5', dur: 1.2,
    note: 'A direct single-oscillator triangle replacement for the engine voice.',
    fixedLength: 0.063, waveform: 'triangle', attack: 0.01, release: 0.015, trim: 0 },
  toneSine: { label: 'Sine Tone', category: 'Keys', synth: 'KNDO-5', dur: 1.2,
    note: 'A direct single-oscillator sine replacement for the engine voice.',
    fixedLength: 0.063, waveform: 'sine', attack: 0.01, release: 0.015, trim: 0 },
  squareTone2: { label: 'Short Square', category: 'Lead', synth: 'KNDO-5', dur: 1,
    note: 'A direct single-oscillator square-wave replacement for the engine voice.',
    options: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0, sustain: 1, release: 0.01, attackCurve: 'exponential' },
    },
    fixedLength: 0.132,
    waveform: 'square',
    attack: 0.001, release: 0.089, trim: 0,
    vibrato: { depth: 0, rate: 10.9 },
    mono: false,
    portamento: 0,
    starter: false,
    transpose: 0 },
  fmGrowl2: { label: 'FM Growl', category: 'Bass', synth: 'RMND-2', dur: 1.8,
    note: 'Modulated sine with a hard edge on the attack. Cuts through a busy kit.',
    options: {
      harmonicity: 1.5, modulationIndex: 6,
      oscillator: { type: 'sine' },
      modulation: { type: 'square' },
      envelope: { attack: 0.005, decay: 0.25, sustain: 0.5, release: 0.3 },
      modulationEnvelope: { attack: 0.002, decay: 1.02, sustain: 0.1, release: 0.2 },
    },
    starter: false,
    mono: false },

  // ---- WNDR-9 ---------------------------------------------------------
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
    synth: 'WNDR-9', dur: 7.2,
    note: 'Sine partials at 8′, 4′, 2⅔′, 2′ and 1⅓′ — the organ lane’s own voice, with '
      + 'the drawbars finally out where you can reach them.',
    additive: { bars: [0, 0, 1, 0.62, 0.32, 0.2, 0, 0.1, 0], attack: 0.035, decay: 7.2 } },
  addDrawbarBright: { label: 'Drawbar Organ, Bright', category: 'Organ', homeLane: 'organChords',
    synth: 'WNDR-9', dur: 7.2,
    note: 'The upper drawbars pulled further out. Cuts through where the soft '
      + 'registration sits under everything.',
    additive: { bars: [0, 0, 1, 0.78, 0.48, 0.3, 0, 0.16, 0], attack: 0.035, decay: 7.2 } },
  addOrganStab: { label: 'Drawbar Stab', category: 'Organ', homeLane: 'organChords',
    synth: 'WNDR-9', dur: 0.5,
    note: 'A drawbar organ played as a stab (5 Oct 2026): a bright registration with the '
      + '16-foot under it and a second-harmonic percussion click, dying away in under half '
      + 'a second so off-beat chords never smear.',
    additive: { bars: [0.6, 0, 1, 0.8, 0.6, 0.5, 0, 0.3, 0.25], attack: 0.003, decay: 0.42,
      perc: { ratio: 2, gain: 0.6, attack: 0.002, decay: 0.09 } } },
  addDrawbarPerc: { label: 'Drawbar + Percussion', category: 'Organ', homeLane: 'organChords',
    synth: 'WNDR-9', dur: 7.2,
    note: 'Bright registration with a third-harmonic pip on the key attack, kept dry so '
      + 'repeated off-beat stabs stay crisp.',
    additive: { bars: [0, 0, 1, 0.78, 0.48, 0.3, 0, 0.16, 0], attack: 0.035, decay: 7.2,
      perc: { ratio: 3, gain: 0.72, attack: 0.002, decay: 0.078 } } },
  addShopOrgan: { label: 'Shop Organ', category: 'Organ', homeLane: 'organChords',
    synth: 'WNDR-9', dur: 1.02,
    note: 'The shop theme’s own: bright, percussive, short and dry — comping rather than '
      + 'holding, so it sits under the lead instead of over it.',
    additive: { bars: [0, 0, 1, 0.78, 0.48, 0.3, 0, 0.16, 0], attack: 0.004, decay: 1.02,
      echo: false, perc: { ratio: 3, gain: 0.9, attack: 0.002, decay: 0.072 } } },
  addSwoop: { label: 'Organ Swoop', category: 'Organ', homeLane: 'organChords',
    synth: 'WNDR-9', dur: 3.2,
    note: 'Every partial bends up a fourth into the note together, so the registration '
      + 'arrives rather than slides apart. The dance-mix transition.',
    additive: { bars: [0, 0, 1, 0.5, 0.22, 0, 0, 0, 0], attack: 0.012, decay: 3.2,
      pitch: { semitones: -5, decay: 3.2 } } },
  addBell: { label: 'Struck Bell', category: 'Bells', homeLane: 'twinkle',
    synth: 'WNDR-9', dur: 8,
    note: 'The same stack pulled off the harmonic series and damped from the top down. '
      + 'Inharmonic and struck is a bell; either one alone is a siren or an organ.',
    additive: { bars: [0.3, 0.15, 1, 0.7, 0.45, 0.3, 0.2, 0.15, 0.1],
      attack: 0.001, decay: 8, release: 0.35, stretch: 0.06, damp: 1.4 } },
  addGlassPad: { label: 'Glass Pad', category: 'Pad', homeLane: 'chords',
    synth: 'WNDR-9', dur: 8,
    note: 'Barely stretched and lightly damped, arriving slowly — the top of the stack '
      + 'thins out as it holds, which is what stops an additive pad sounding like an organ.',
    additive: { bars: [0.2, 0, 1, 0.55, 0.2, 0.28, 0, 0.12, 0.08],
      attack: 0.35, decay: 8.3, sustain: 0.6, release: 1.2, stretch: 0.012, damp: 0.4 } },
  shopOrgan2: { label: 'Shop Organ 2', category: 'Organ', homeLane: 'organChords', synth: 'WNDR-9', dur: 6.92,
    note: 'The shop theme’s own: bright, percussive, short and dry — comping rather than '
      + 'holding, so it sits under the lead instead of over it.',
    additive: {
      bars: [0, 0, 1, 0.78, 0.48, 0.53, 0.01, 0.46, 0.23],
      attack: 0.004, decay: 6.92,
      echo: false,
      perc: { ratio: 7, gain: 2, attack: 0.002, decay: 0.072 },
      type: 'sine',
      stretch: 0
    },
    starter: false,
    trim: 3,
    fixedLength: 1.103 },
  squareOrgan: { label: 'Square Organ', category: 'Organ', synth: 'KNDO-5', dur: 1,
    note: 'A direct single-oscillator square-wave replacement for the engine voice.',
    options: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0, sustain: 1, release: 0.01, attackCurve: 'exponential' },
    },
    fixedLength: 0.463,
    waveform: 'square',
    attack: 0.011, release: 0.089, trim: 0.8,
    vibrato: { depth: 0, rate: 5 },
    mono: false,
    portamento: 0,
    starter: false,
    filter: { type: 'lowpass', slope: -12, freq: 1420, Q: 3.4,
      env: { octaves: 2.9, attack: 0, decay: 0.12, sustain: 0, release: 0.015 } } },

  // ---- requested 80s bass auditions --------------------------------------
  bass80sMono: { label: '=80s Mono Bass', category: 'Bass', synth: 'CRLS-1', dur: 1.8,
    note: 'A brassy 80s mono bass: sawtooth into a fast low-pass sweep with a short '
      + 'pluck at the front and a solid held bottom.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.004, decay: 0.38, sustain: 0.42, release: 0.22 },
      filter: { type: 'lowpass', Q: 2.4, rolloff: -24 },
      filterEnvelope: { attack: 0.0041, decay: 0.2142, sustain: 0.1328, release: 0.0765, baseFrequency: 110, octaves: 3.8, attackCurve: 'exponential', decayCurve: 'exponential', releaseCurve: 'exponential' },
    } },
  bass80sFM: { label: '=80s FM Bass', category: 'Bass', synth: 'RMND-2', dur: 1.8,
    note: 'A bright digital 80s bass: a sine body with a square modulator, tuned for '
      + 'the glassy attack of an FM workstation under a pop groove.',
    options: {
      harmonicity: 1.5, modulationIndex: 7,
      oscillator: { type: 'sine' },
      modulation: { type: 'square' },
      envelope: { attack: 0.003, decay: 0.34, sustain: 0.36, release: 0.24 },
      modulationEnvelope: { attack: 0.002, decay: 0.18, sustain: 0.22, release: 0.16 },
    } },
  bass80sDuo: { label: '=80s Duo Bass', category: 'Bass', synth: 'MRDR-3', dur: 2,
    note: 'A wide 80s chorus-style bass: detuned saw and square layers with a gentle '
      + 'vibrato that gives a mono line a larger stereo-era silhouette.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, detune: 0, gain: 1,
        attack: 0.006, decay: 0.28, sustain: 0.55, release: 0.3 },
      osc2: { type: 'square', ratio: 1, detune: 10.4, gain: 1,
        attack: 0.01, decay: 0.32, sustain: 0.42, release: 0.34 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 200, Q: 1, track: 0,
        env: { octaves: 3, attack: 0.01, decay: 0.001, sustain: 1, release: 0.5 } },
    },
    vibrato: { depth: 0.0125, rate: 3.2 } },
  bass80sSynth: { label: '=80s Synth Bass', category: 'Bass', synth: 'CRLS-1', dur: 1.6,
    note: 'A clean 80s synth bass with a pulse-like square tone, quick decay and a '
      + 'small release that keeps repeated eighth notes from becoming clicks.',
    options: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.003, decay: 0.32, sustain: 0.28, release: 0.2 },
    } },

  // ---- requested TB-303-style acid bass auditions -----------------------
  // These use MonoSynth's saw/square, resonant low-pass, filter envelope and
  // portamento controls as style starting points rather than hardware copies.
  bass303Squelch: { label: '=303 Squelch', category: 'Bass', synth: 'CRLS-1', dur: 1.1,
    note: 'A tight TB-303-style acid bass with a sharp resonant squelch, fast filter snap and a little glide.',
    options: {
      portamento: 0.045,
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.002, decay: 0.12, sustain: 0.25, release: 0.1 },
      filter: { type: 'lowpass', Q: 14, rolloff: -24 },
      filterEnvelope: { attack: 0.001, decay: 0.1, sustain: 0.08, release: 0.12, baseFrequency: 110, octaves: 4.5, style: 'classic' },
    } },
  bass303Rubber: { label: '=303 Rubber', category: 'Bass', synth: 'CRLS-1', dur: 1.35,
    note: 'A rubbery TB-303-style square bass with a rounded pluck, resonant vowel and smooth acid glide.',
    options: {
      portamento: 0.065,
      oscillator: { type: 'square' },
      envelope: { attack: 0.003, decay: 0.2, sustain: 0.32, release: 0.14 },
      filter: { type: 'lowpass', Q: 10, rolloff: -24 },
      filterEnvelope: { attack: 0.0041, decay: 0.117, sustain: 0.0596, release: 0.0575, baseFrequency: 145, octaves: 3.6, attackCurve: 'exponential', decayCurve: 'exponential', releaseCurve: 'exponential' },
    } },
  bass303DeepGlide: { label: '=303 Deep Glide', category: 'Bass', synth: 'CRLS-1', dur: 1.7,
    note: 'A darker TB-303-style saw bass with a long low glide, restrained resonance and a weighty held tail.',
    options: {
      portamento: 0.12,
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.004, decay: 0.32, sustain: 0.42, release: 0.22 },
      filter: { type: 'lowpass', Q: 8, rolloff: -24 },
      filterEnvelope: { attack: 0.003, decay: 0.2038, sustain: 0.0858, release: 0.0771, baseFrequency: 85, octaves: 3.2, attackCurve: 'linear', decayCurve: 'exponential', releaseCurve: 'exponential' },
    } },
  bass303Bite: { label: '=303 Bite', category: 'Bass', synth: 'CRLS-1', dur: 0.95,
    note: 'A percussive TB-303-style square bite with a hard filter accent for clipped, driving acid phrases.',
    options: {
      portamento: 0.025,
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0.18, release: 0.08 },
      filter: { type: 'lowpass', Q: 16, rolloff: -24 },
      filterEnvelope: { attack: 0.001, decay: 0.07, sustain: 0.05, release: 0.1, baseFrequency: 125, octaves: 5, style: 'classic' },
    } },
  bass303Pulse: { label: '=303 Pulse', category: 'Bass', synth: 'CRLS-1', dur: 1.25,
    note: 'A lively TB-303-style saw pulse with medium resonance, a bright accent and just enough sustain for riffs.',
    options: {
      portamento: 0.04,
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.002, decay: 0.17, sustain: 0.3, release: 0.12 },
      filter: { type: 'lowpass', Q: 12, rolloff: -24 },
      filterEnvelope: { attack: 0.001, decay: 0.14, sustain: 0.1, release: 0.14, baseFrequency: 100, octaves: 4.2, style: 'classic' },
    } },

  // ---- MRDR-3 ------------------------------------------------------------
  //
  // Up to three oscillator layers, each a complete voice — see `_playLayer` in
  // src/engine/voices.js.
  //
  // No MELODIC_TRIM in any of them — the rack path never applies it and `voiceGain`
  // levels by measurement, so only the RATIOS between layers carry meaning.

  // ---- Initial: somewhere to start ---------------------------------------
  //
  // Five patches that are a PLACE rather than a sound. Everything else in this section
  // is somebody's finished idea — a choir, a Reese, the finale's stab — and opening one
  // to make your own means first working out which of forty settings are load-bearing.
  // These carry the fewest that can still make a note: three oscillators at one pitch, a
  // few cents apart, and an envelope with no attack, a short fall and a short tail.
  //
  // What is NOT here is the point. No filter, no LFO, no drive, no vibrato, no unison —
  // every one of those cards opens at its own default the moment you switch it on, so a
  // patch built from one of these is built by ADDING rather than by undoing. The one
  // exception is `initOneFilter`, which is the other way people start: three oscillators
  // into one filter and one envelope, the classic architecture, with the filter parked
  // open and no envelope on it — there is nothing to hear until you close it, which is
  // the invitation.
  //
  // All three layers sit at the same LEVEL in each of them. That is deliberate: three
  // knobs in the same place say "three of the same thing" at a glance, and a starting
  // point that arrives pre-balanced is a mix decision somebody has to reverse-engineer.
  initSquare: { label: 'Triple Square', category: 'Keys', synth: 'MRDR-3', dur: 1.5,
    note: 'Three squares at the same pitch, seven cents either side of centre. No filter, '
      + 'no sweep, no modulation — the shortest thing this synth can be and still be one.',
    layer: {
      osc1: { type: 'square', ratio: 1, detune: 0, gain: 0.6,
        attack: 0, decay: 0.25, sustain: 0.75, release: 0.12 },
      osc2: { type: 'square', ratio: 1, detune: -7, gain: 0.6,
        attack: 0, decay: 0.25, sustain: 0.75, release: 0.12 },
      osc3: { type: 'square', ratio: 1, detune: 7, gain: 0.6,
        attack: 0, decay: 0.25, sustain: 0.75, release: 0.12 },
    } },
  initSaw: { label: 'Initial 2 Saw', category: 'Keys', synth: 'MRDR-3', dur: 1.5,
    note: 'Initial 1 with sawtooths — every harmonic instead of every odd one, so it is '
      + 'brighter and thinner and takes a filter better. The other blank canvas.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, detune: 0, gain: 0.6,
        attack: 0, decay: 0.25, sustain: 0.75, release: 0.12 },
      osc2: { type: 'sawtooth', ratio: 1, detune: -7, gain: 0.6,
        attack: 0, decay: 0.25, sustain: 0.75, release: 0.12 },
      osc3: { type: 'sawtooth', ratio: 1, detune: 7, gain: 0.6,
        attack: 0, decay: 0.25, sustain: 0.75, release: 0.12 },
    } },
  // `ratio: 0.5` is INTERVAL -12 on the panel — the same octave-down sub the engine's
  // own 80s bass stacks under itself, here as the one thing separating this from
  // Initial 1 so the pot that did it is easy to find and easy to put back.
  initSquareSub: { label: 'Initial 3 Square Sub', category: 'Keys', synth: 'MRDR-3', dur: 1.5,
    note: 'Two squares seven cents apart with the third an octave below them. The same '
      + 'starting point with a floor under it — where a bass patch begins.',
    layer: {
      osc1: { type: 'square', ratio: 1, detune: 0, gain: 0.6,
        attack: 0, decay: 0.25, sustain: 0.75, release: 0.12 },
      osc2: { type: 'square', ratio: 1, detune: 7, gain: 0.6,
        attack: 0, decay: 0.25, sustain: 0.75, release: 0.12 },
      osc3: { type: 'square', ratio: 0.5, detune: 0, gain: 0.6,
        attack: 0, decay: 0.25, sustain: 0.75, release: 0.12 },
    } },
  initSawSub: { label: 'Initial 4 Saw Sub', category: 'Keys', synth: 'MRDR-3', dur: 1.5,
    note: 'The sawtooth pair with an octave below them — brighter on top than Initial 3 '
      + 'and the same weight underneath.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, detune: 0, gain: 0.6,
        attack: 0, decay: 0.25, sustain: 0.75, release: 0.12 },
      osc2: { type: 'sawtooth', ratio: 1, detune: 7, gain: 0.6,
        attack: 0, decay: 0.25, sustain: 0.75, release: 0.12 },
      osc3: { type: 'sawtooth', ratio: 0.5, detune: 0, gain: 0.6,
        attack: 0, decay: 0.25, sustain: 0.75, release: 0.12 },
    } },
  // The other way to start. `vca: 'through'` takes the three layer envelopes out — the
  // layers arrive at their LEVEL and nothing else — so there is ONE envelope and ONE
  // filter for the whole stack, which is what most people mean by a synthesiser. The
  // filter carries no `env` block at all: no sweep, nothing moving, just a cutoff parked
  // where it changes almost nothing until somebody pulls it down.
  initOneFilter: { label: 'Initial 5 One Filter', category: 'Keys', synth: 'MRDR-3', dur: 1.5,
    note: 'Three detuned saws into one lowpass and one envelope — three oscillators, a '
      + 'filter, an amp, the classic layout. The cutoff is parked open with no envelope '
      + 'on it, so closing it is the first thing you will do.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, detune: 0, gain: 0.6, vca: 'through' },
      osc2: { type: 'sawtooth', ratio: 1, detune: -7, gain: 0.6, vca: 'through' },
      osc3: { type: 'sawtooth', ratio: 1, detune: 7, gain: 0.6, vca: 'through' },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 8000, Q: 0.7, track: 0 },
      vca: { attack: 0, decay: 0.25, sustain: 0.75, release: 0.12 },
    } },

  // ---- the engine's own melodic voices, transcribed -----------------------
  //
  // TRANSCRIBED, not approximated: the layer ratios, levels, lengths and attacks are
  // `scheduleStep`'s own numbers, so a strip can A/B `layerBass80s` against `80s Bass`
  // and hear whether the recreation holds. The engine voices stay; these are the
  // editable copies.
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
  layerLeadBright: { label: 'Bright Lead', category: 'Lead', synth: 'MRDR-3', dur: 1.2,
    note: 'The bright-octave lead as layers: the lane’s square with a quiet octave sine on '
      + 'top, adding air without changing the character underneath.',
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
  // WNDR-9 already. The two that carried a written-in slapback (`bassRepeat`)
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
  layerWalkingBass: { label: 'Walking Sine Bass', category: 'Bass', synth: 'MRDR-3', dur: 1.85,
    note: 'The pawn-shop walking sine as its base timbre — its shuffle ghost was a '
      + 'written-in delay; the strip’s delay insert says it better.',
    layer: { osc1: { type: 'sine', ratio: 1, gain: 1, attack: 0.01, decay: 1.85 } } },
  layerMegamixBass: { label: 'Dark Saw Bass', category: 'Bass', synth: 'MRDR-3', dur: 1.8,
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
  layerLoungeBass: { label: 'Soft Triangle Bass', category: 'Bass', synth: 'MRDR-3', dur: 1.25,
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
  layerTitleLead: { label: 'Title Lead', category: 'Lead', synth: 'MRDR-3', dur: 5.5,
    note: 'A sine that swells in over a sixth of a second and holds — the title theme, '
      + 'remembered from an empty arcade.',
    layer: {
      osc1: { type: 'sine', ratio: 1, gain: 1, attack: 0.16, decay: 5.5 },
    } },
  layerFinaleLead: { label: 'Finale Lead', category: 'Lead', synth: 'MRDR-3', dur: 1.7,
    note: 'Sawtooth, fast attack, overlapping notes — the finale’s hook.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 1, attack: 0.006, decay: 1.7 },
    } },
  layerMegamixLead: { label: 'Soft Triangle Lead', category: 'Lead', synth: 'MRDR-3', dur: 1.25,
    note: 'Triangle with a little length on it — soft enough to sit inside a mix carrying '
      + 'every other cabinet at once.',
    layer: {
      osc1: { type: 'triangle', ratio: 1, gain: 1, attack: 0.008, decay: 1.25 },
    } },
  layerShopLead: { label: 'Shop Lead', category: 'Lead', synth: 'MRDR-3', dur: 1.55,
    note: 'Triangle with the octave-sine brightener on top: the shop’s lead, which needs air '
      + 'to read over the organ.',
    layer: {
      osc1: { type: 'triangle', ratio: 1, gain: 1, attack: 0.012, decay: 1.55 },
      osc2: { type: 'sine', ratio: 2, gain: 0.16, len: 0.68, attack: 0.004, decay: 1.054 },
    } },
  layerCounterLead: { label: 'Counter Lead', category: 'Lead', synth: 'MRDR-3', dur: 0.82,
    note: 'Short triangle stabs — Dolores’ side of the shop auditions.',
    layer: {
      osc1: { type: 'triangle', ratio: 1, gain: 1, attack: 0.006, decay: 0.82 },
    } },
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
  layerDreamPad: { label: 'Dream Pad', category: 'Pad', synth: 'MRDR-3', dur: 8,
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

  cryptTheremin: { label: 'Crypt Theremin', category: 'Lead', synth: 'MRDR-3', dur: 2.8,
    note: 'A floating graveyard melody: sine body, a faint octave overtone, delayed vibrato and legato glide.',
    layer: {
      osc1: { type: 'sine', ratio: 1, gain: 0.9, attack: 0.055, decay: 0.3, sustain: 0.85, release: 0.3 },
      osc2: { type: 'sine', ratio: 2, gain: 0.075, attack: 0.09, decay: 0.4, sustain: 0.65, release: 0.28 },
    },
    vibrato: { depth: 0.19, rate: 5.3, delay: 0.16 },
    mono: true, portamento: 0.11 },

  // ---- sample-and-hold auditions -----------------------------------------
  // These five patches make the stepped-random Mod LFO audible in five different
  // jobs: a filter lead, a level pulse, a slow pad, a bass latch and a noisy machine
  // voice. `samplehold` is deterministic per note, but every period still gets a new
  // held value, so repeated notes feel related without becoming identical loops.
  bestSampleHoldCircuit: { label: 'S&H Circuit', category: 'Lead', synth: 'MRDR-3', dur: 1.6,
    note: 'A bright mono circuit lead whose lowpass jumps to a new held position every '
      + 'eighth of a second. The short glide keeps each step sharp without turning it into '
      + 'a click, while the portamento makes the notes speak like one line.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.82, attack: 0.004, decay: 0.5,
        sustain: 0.78, release: 0.16, unison: 2, spread: 12, stereo: 0.45 },
      osc2: { type: 'pulse', width: 0.34, ratio: 2, gain: 0.3, attack: 0.006,
        decay: 0.42, sustain: 0.55, release: 0.14 },
      lfo: { type: 'samplehold', rate: 7.5, depth: 0.48, target: 'filter', delay: 0.04 },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 520, Q: 2.8, track: 0.5,
        env: { octaves: 3.5, attack: 0.004, decay: 0.42, sustain: 0.35, release: 0.16 } },
      vca: { attack: 0.006, decay: 0.52, sustain: 0.8, release: 0.2 },
    },
    drive: 0.27785, shape: 'soft', tone: { freq: 9800 }, mono: true, portamento: 0.045 },

  bestSampleHoldPulse: { label: 'Random Pulse Keys', category: 'Keys', synth: 'MRDR-3', dur: 1.2,
    note: 'A clipped pulse-key that throws its level between held random positions. The '
      + 'fast rate creates a playable rhythmic tremolo, while the triangle sub keeps the '
      + 'individual notes round enough for chord stabs.',
    layer: {
      osc1: { type: 'pulse', width: 0.28, ratio: 1, gain: 0.7, attack: 0.003, decay: 0.3,
        sustain: 0.62, release: 0.12, unison: 2, spread: 10, stereo: 0.55 },
      osc2: { type: 'triangle', ratio: 0.5, gain: 0.42, attack: 0.005, decay: 0.4,
        sustain: 0.72, release: 0.16 },
      lfo: { type: 'samplehold', rate: 9, depth: 0.62, target: 'level', delay: 0.018 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 2600, Q: 1.1, track: 0.35,
        env: { octaves: 1.8, attack: 0.008, decay: 0.3, sustain: 0.55, release: 0.14 } },
      vca: { attack: 0.004, decay: 0.36, sustain: 0.72, release: 0.16 },
    },
    drive: 0.114356, shape: 'soft', tone: { freq: 8200 } },

  bestSampleHoldOrbit: { label: 'S&H Orbit', category: 'Pad', synth: 'MRDR-3', dur: 8,
    note: 'A wide pad with a very slow sample-and-hold filter walk. Each held value opens a '
      + 'different window onto the detuned pulse stack, so the chord moves like an orbit '
      + 'without a repeating LFO ramp.',
    layer: {
      osc1: { type: 'pulse', width: 0.46, ratio: 1, gain: 0.62, attack: 0.7, decay: 2.2,
        sustain: 0.86, release: 2, attackCurve: 'lin', unison: 3, spread: 20, stereo: 0.8 },
      osc2: { type: 'sawtooth', ratio: 1.4983, detune: -7, gain: 0.34, attack: 0.85,
        decay: 2.5, sustain: 0.78, release: 2.2, unison: 2, spread: 25, stereo: 0.7 },
      osc3: { type: 'triangle', ratio: 0.5, detune: 5, gain: 0.35, attack: 0.6,
        decay: 2.4, sustain: 0.9, release: 2.4, unison: 2, spread: 12, stereo: 0.6 },
      lfo: { type: 'samplehold', rate: 0.42, depth: 0.68, target: 'filter', delay: 0.75 },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 720, Q: 1.7, track: 0.28,
        env: { octaves: 2.8, attack: 1.8, decay: 3, sustain: 0.58, release: 2.2 } },
      vca: { attack: 0.8, decay: 2.6, sustain: 0.9, release: 2.5, attackCurve: 'lin', releaseCurve: 'lin' },
    },
    drive: 0.079771, shape: 'soft', tone: { freq: 7600 }, humanize: { entry: 0.02 },
    vibrato: { depth: 0.06, rate: 3.2, delay: 1.8, spread: 0.5 } },

  bestSampleHoldBass: { label: 'S&H Bass', category: 'Bass', synth: 'MRDR-3', dur: 1.8,
    note: 'A mono bass with a firm sine floor and a held-random filter latch on the saw. '
      + 'The slow enough steps leave the groove intact, but every note gets a slightly '
      + 'different growl and the sub never disappears.',
    layer: {
      osc1: { type: 'sine', ratio: 0.5, gain: 1, attack: 0.003, decay: 0.8, sustain: 0.92, release: 0.14 },
      osc2: { type: 'sawtooth', ratio: 1, gain: 0.78, attack: 0.003, decay: 0.65,
        sustain: 0.7, release: 0.13, unison: 2, spread: 9, stereo: 0.35 },
      osc3: { type: 'square', ratio: 2, gain: 0.2, attack: 0.002, decay: 0.24,
        sustain: 0.28, release: 0.08 },
      lfo: { type: 'samplehold', rate: 2.2, depth: 0.4, target: 'filter', delay: 0.035 },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 150, Q: 3.6, track: 0.42,
        env: { octaves: 4.4, attack: 0.004, decay: 0.38, sustain: 0.24, release: 0.12 } },
      vca: { attack: 0.004, decay: 0.82, sustain: 0.9, release: 0.16 },
    },
    drive: 0.394333, shape: 'soft', tone: { freq: 5200 }, mono: true, portamento: 0.03,
    trim: -0.318064 },

  bestSampleHoldVox: { label: 'S&H Vox', category: 'FX', synth: 'MRDR-3', dur: 2.2,
    note: 'A synthetic mouth made from a pulse, a nasal bandpass and a held-random filter '
      + 'walk. The steps are quick enough to suggest syllables, but the onset and release '
      + 'leave space for it to sit as a transition or response line.',
    layer: {
      osc1: { type: 'pulse', width: 0.22, ratio: 1, gain: 0.82, attack: 0.008, decay: 0.55,
        sustain: 0.72, release: 0.22, unison: 2, spread: 14, stereo: 0.6 },
      osc2: { type: 'sawtooth', ratio: 2, gain: 0.28, detune: 7, attack: 0.01, decay: 0.48,
        sustain: 0.5, release: 0.18 },
      osc3: { type: 'triangle', ratio: 0.5, gain: 0.25, attack: 0.01, decay: 0.7,
        sustain: 0.62, release: 0.25 },
      lfo: { type: 'samplehold', rate: 3.6, depth: 0.78, target: 'filter', delay: 0.08 },
    },
    global: {
      filter: { type: 'bandpass', slope: -12, freq: 1050, Q: 2.2, track: 0.18,
        env: { octaves: 1.6, attack: 0.025, decay: 0.58, sustain: 0.42, release: 0.22 } },
      vca: { attack: 0.012, decay: 0.62, sustain: 0.68, release: 0.28 },
    },
    drive: 0.184515, shape: 'soft', tone: { freq: 7000 }, mono: true, portamento: 0.04 },

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

  bestChoirAah: { label: 'Synth Choir Aah', category: 'Orch', synth: 'MRDR-3', dur: 8,
    note: 'Three static bandpass formants on the /a/ vowel — 800, 1150 and 2900 Hz — with the '
      + 'pitch moving underneath them. Delayed vibrato and a slow swell do the rest: this is '
      + 'how a voice works, not an impression of one.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.9, attack: 0.1204, decay: 1.2, sustain: 0.85, release: 0.9, attackCurve: 'lin', unison: 3, spread: 9, stereo: 0.8, filter: { type: 'bandpass', slope: -12, freq: 800, Q: 7, track: 0 } },
      osc2: { type: 'sawtooth', ratio: 1, gain: 0.55, detune: 6, attack: 0.14448, decay: 1.4, sustain: 0.8, release: 0.9, attackCurve: 'lin', unison: 2, spread: 13, stereo: 0.7, filter: { type: 'bandpass', slope: -12, freq: 1150, Q: 9, track: 0 } },
      osc3: { type: 'sawtooth', ratio: 1, gain: 0.3, detune: -7, attack: 0.172, decay: 1.6, sustain: 0.7, release: 1, attackCurve: 'lin', unison: 2, spread: 16, stereo: 0.9, filter: { type: 'bandpass', slope: -12, freq: 2900, Q: 11, track: 0 } },
      lfo: { type: 'sine', rate: 0.7, depth: 0.14, target: 'level', delay: 0.9 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 3800, Q: 0.7, track: 0.3, env: { octaves: 1.3, attack: 0.6, decay: 1.6, sustain: 0.55, release: 0.9 } },
      vca: { attack: 0.1548, decay: 1.6, sustain: 0.88, release: 1.2, attackCurve: 'lin' },
    },
    drive: 0.035028, shape: 'soft',
    humanize: { entry: 0.022 },
    vibrato: { depth: 0.18, rate: 5.2, delay: 0.6, spread: 0.75 } },

  bestChoirOoh: { label: 'Synth Choir Ooh', category: 'Orch', synth: 'MRDR-3', dur: 8,
    note: 'The /u/ vowel — 320, 800 and 2250 Hz — rounder and darker than the aah, with a band '
      + 'of noise sitting where the breath is. Two singers, slightly out of tune with each '
      + 'other, which is what makes a section sound like more than one person.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 1, attack: 0.190714, decay: 1.5, sustain: 0.88, release: 1.1, attackCurve: 'lin', unison: 3, spread: 11, stereo: 0.55, filter: { type: 'bandpass', slope: -12, freq: 320, Q: 6, track: 0 } },
      osc2: { type: 'sawtooth', ratio: 1, gain: 0.5, detune: -9, attack: 0.209786, decay: 1.6, sustain: 0.82, release: 1.1, attackCurve: 'lin', unison: 2, spread: 15, stereo: 0.8, filter: { type: 'bandpass', slope: -12, freq: 800, Q: 8, track: 0 } },
      osc3: { type: 'noise', ratio: 4, gain: 0.1, attack: 0.267, decay: 2, sustain: 0.5, release: 1.2, attackCurve: 'lin', filter: { type: 'bandpass', slope: -12, freq: 2250, Q: 4, track: 0 } },
      lfo: { type: 'sine', rate: 0.55, depth: 0.12, target: 'level', delay: 1.1 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 2600, Q: 0.8, track: 0.3, env: { octaves: 1.1, attack: 0.8, decay: 2, sustain: 0.5, release: 1 } },
      vca: { attack: 0.228857, decay: 2, sustain: 0.9, release: 1.4, attackCurve: 'lin' },
    },
    drive: 0.033113, shape: 'soft',
    humanize: { entry: 0.034 },
    vibrato: { depth: 0.14, rate: 4.8, delay: 0.8, spread: 0.85 } },

  // ---- the violin family -----------------------------------------------------
  //
  // Four bowed instruments, built the way BEST Choir Aah builds a voice and for the same
  // reason. What makes a violin recognisable is not its waveform — every bowed string is
  // a sawtooth, near enough, because that is what a stick-slip oscillation IS. It is the
  // BODY: a set of fixed resonances the pitch travels underneath, plus the sound of hair
  // dragging across a string. So each of these is three layers doing three jobs:
  //
  //   osc1  THE STRING. A sawtooth through a lowpass that follows the note. The only
  //         layer that tracks pitch, and what keeps a low note from disappearing.
  //   osc2  THE BODY. The same sawtooth through a bandpass parked on the instrument's
  //         main wood resonance at KEY FOLLOW 0, so it stays where it is while the note
  //         moves. This is the layer that makes a viola a viola: swap 350 Hz for 185 and
  //         the same patch is a cello.
  //   osc3  THE BOW. Filtered noise, loudest at the onset and settling into the sustain,
  //         sat on the broad "bridge hill" the family carries its top on. A bow makes a
  //         noise the whole time it is moving and most of it in the moment it bites, and
  //         a string patch without it is an organ.
  //
  // The two frequencies per instrument are the published main-wood and bridge-hill modes:
  // violin 460 and 2600, viola 350 and 2000, cello 185 and 1400, contrabass 100 and 900.
  // Textbook numbers dialled into a synth — nothing here is sampled or measured off a
  // recording, the same as every other preset in this file.
  //
  // WHY MRDR-3 AND NOT TNGR-2. Three things decide it, and TNGR-2 has none of them: a
  // per-oscillator bandpass, so a resonance can sit still while the pitch moves; a noise
  // oscillator, for the bow; and VIB SPREAD, which scatters the vibrato across the unison
  // voices — one wobble on every voice is a soloist through a chorus, and a room full of
  // players who are not counting together is a section.

  mrdrViolin: { label: 'Violin', category: 'Orch', synth: 'MRDR-3', dur: 3,
    note: 'A solo violin: sawtooth string, a 460 Hz wood resonance holding still under the '
      + 'melody, and bow noise on the 2.6k bridge hill. The vibrato waits a third of a '
      + 'second, which is what a player does — the note arrives first and is then leaned on.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.88, attack: 0.062, decay: 0.6, sustain: 0.9, release: 0.3, attackCurve: 'lin', unison: 2, spread: 5, stereo: 0.25, filter: { type: 'lowpass', slope: -12, freq: 2400, Q: 0.9, track: 0.55, env: { octaves: 1, attack: 0.055, decay: 0.6, sustain: 0.45, release: 0.3 } } },
      osc2: { type: 'sawtooth', ratio: 1, gain: 0.5, detune: 5, attack: 0.084, decay: 0.7, sustain: 0.85, release: 0.34, attackCurve: 'lin', filter: { type: 'bandpass', slope: -12, freq: 460, Q: 3.5, track: 0 } },
      osc3: { type: 'noise', ratio: 1, gain: 0.075, color: 'white', attack: 0.018, decay: 0.32, sustain: 0.34, release: 0.22, attackCurve: 'lin', filter: { type: 'bandpass', slope: -12, freq: 2600, Q: 1.6, track: 0 } },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 4200, Q: 0.7, track: 0.3, env: { octaves: 0.9, attack: 0.07, decay: 0.7, sustain: 0.5, release: 0.35 } },
      vca: { attack: 0.07, decay: 0.7, sustain: 0.92, release: 0.34, attackCurve: 'lin' },
    },
    drive: 0.051238, shape: 'soft',
    humanize: { entry: 0.012, pitch: 0.002313, gain: 0.05 },
    vibrato: { depth: 0.24, rate: 5.7, delay: 0.32, spread: 0.35 } },

  mrdrViolinSection: { label: 'Violin Section', category: 'Orch', synth: 'MRDR-3', dur: 5,
    note: 'The same instrument, sixteen of them. VIB SPREAD at 0.85 is what does it: each '
      + 'unison voice takes its own vibrato rate and starting phase, so the wobbles never '
      + 'line up. Entry stagger and a few cents of pitch variation finish the job — a '
      + 'section is players who do not quite agree, not one player made louder.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.82, attack: 0.16, decay: 1.1, sustain: 0.9, release: 0.85, attackCurve: 'lin', unison: 4, spread: 14, stereo: 0.85, filter: { type: 'lowpass', slope: -12, freq: 2200, Q: 0.7, track: 0.5, env: { octaves: 0.8, attack: 0.2, decay: 1.2, sustain: 0.5, release: 0.8 } } },
      osc2: { type: 'sawtooth', ratio: 1, gain: 0.46, detune: -8, attack: 0.205, decay: 1.3, sustain: 0.86, release: 0.95, attackCurve: 'lin', unison: 3, spread: 19, stereo: 0.7, filter: { type: 'bandpass', slope: -12, freq: 460, Q: 2.6, track: 0 } },
      osc3: { type: 'noise', ratio: 1, gain: 0.06, color: 'white', attack: 0.09, decay: 0.7, sustain: 0.42, release: 0.6, attackCurve: 'lin', filter: { type: 'bandpass', slope: -12, freq: 2600, Q: 1.2, track: 0 } },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 3600, Q: 0.6, track: 0.3, env: { octaves: 0.75, attack: 0.35, decay: 1.4, sustain: 0.55, release: 0.9 } },
      vca: { attack: 0.19, decay: 1.4, sustain: 0.93, release: 0.95, attackCurve: 'lin' },
    },
    drive: 0.036206, shape: 'soft',
    humanize: { entry: 0.032, pitch: 0.004052, gain: 0.09 },
    // After `vibrato`, as on BEST PWM Strings. `chorus` and `vibrato` are both keys the
    // source emitter has never heard of, so it writes them in the order the object holds
    // them — and a preset whose keys come back in a different order than they went in is
    // what tests/voice-source.js calls a failed round trip.
    vibrato: { depth: 0.15, rate: 5, delay: 0.55, spread: 0.85 },
    chorus: { mix: 0.16, rate: 0.42, depth: 0.4, width: 1 } },

  mrdrViolinMarcato: { label: 'Violin Marcato', category: 'Orch', synth: 'MRDR-3', dur: 1.2,
    note: 'The bow already on the string and pressed before it moves. Everything the '
      + 'sustained patch spends on the swell goes into the first fortieth of a second '
      + 'instead: the noise layer is twice as loud and gone twice as fast, and the filter '
      + 'envelope opens an octave and a half and shuts again. For rhythm rather than melody.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.9, attack: 0.008, decay: 0.34, sustain: 0.55, release: 0.19, attackCurve: 'lin', unison: 2, spread: 6, stereo: 0.3, filter: { type: 'lowpass', slope: -12, freq: 2600, Q: 1.1, track: 0.55, env: { octaves: 1.6, attack: 0.004, decay: 0.22, sustain: 0.25, release: 0.15 } } },
      osc2: { type: 'sawtooth', ratio: 1, gain: 0.52, detune: 6, attack: 0.014, decay: 0.4, sustain: 0.5, release: 0.2, attackCurve: 'lin', filter: { type: 'bandpass', slope: -12, freq: 460, Q: 3.5, track: 0 } },
      osc3: { type: 'noise', ratio: 1, gain: 0.14, color: 'white', attack: 0.003, decay: 0.13, sustain: 0.16, release: 0.1, attackCurve: 'lin', filter: { type: 'bandpass', slope: -12, freq: 2600, Q: 1.4, track: 0 } },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 4400, Q: 0.8, track: 0.3, env: { octaves: 1.1, attack: 0.004, decay: 0.26, sustain: 0.3, release: 0.16 } },
      vca: { attack: 0.009, decay: 0.4, sustain: 0.6, release: 0.2, attackCurve: 'lin' },
    },
    drive: 0.107962, shape: 'soft',
    humanize: { entry: 0.008, pitch: 0.002892, gain: 0.08 },
    vibrato: { depth: 0.14, rate: 5.9, delay: 0.1, spread: 0.3 } },

  mrdrViola: { label: 'Viola', category: 'Orch', synth: 'MRDR-3', dur: 3.4,
    note: 'A fifth below the violin and a body that is not a fifth bigger — which is the '
      + 'whole of why a viola sounds like a viola. The wood resonance moves down to 350 Hz '
      + 'but the string above it does not, so the low register runs under its own body '
      + 'instead of on top of it. That is the reedy, slightly nasal middle.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.88, attack: 0.078, decay: 0.68, sustain: 0.9, release: 0.36, attackCurve: 'lin', unison: 2, spread: 5, stereo: 0.25, filter: { type: 'lowpass', slope: -12, freq: 1900, Q: 0.9, track: 0.55, env: { octaves: 0.95, attack: 0.07, decay: 0.7, sustain: 0.45, release: 0.36 } } },
      osc2: { type: 'sawtooth', ratio: 1, gain: 0.58, detune: -6, attack: 0.101, decay: 0.8, sustain: 0.86, release: 0.4, attackCurve: 'lin', filter: { type: 'bandpass', slope: -12, freq: 350, Q: 3.6, track: 0 } },
      osc3: { type: 'noise', ratio: 1, gain: 0.07, color: 'white', attack: 0.022, decay: 0.36, sustain: 0.34, release: 0.26, attackCurve: 'lin', filter: { type: 'bandpass', slope: -12, freq: 2000, Q: 1.5, track: 0 } },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 3400, Q: 0.7, track: 0.3, env: { octaves: 0.85, attack: 0.09, decay: 0.8, sustain: 0.5, release: 0.4 } },
      vca: { attack: 0.086, decay: 0.8, sustain: 0.92, release: 0.4, attackCurve: 'lin' },
    },
    drive: 0.045697, shape: 'soft',
    humanize: { entry: 0.014, pitch: 0.002313, gain: 0.05 },
    vibrato: { depth: 0.22, rate: 5.2, delay: 0.36, spread: 0.4 } },

  mrdrCello: { label: 'Cello', category: 'Orch', synth: 'MRDR-3', dur: 4,
    note: 'A heavier string takes longer to start, so the bow does: every attack here is '
      + 'roughly twice the violin\'s. The 185 Hz wood mode is low enough to sit under most '
      + 'of the range rather than in the middle of it, which is where the chest comes from, '
      + 'and the vibrato is slower and wider because the hand travels further for it.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.9, attack: 0.108, decay: 0.9, sustain: 0.9, release: 0.52, attackCurve: 'lin', unison: 2, spread: 4, stereo: 0.2, filter: { type: 'lowpass', slope: -12, freq: 1250, Q: 0.9, track: 0.5, env: { octaves: 1.1, attack: 0.1, decay: 0.95, sustain: 0.45, release: 0.5 } } },
      osc2: { type: 'sawtooth', ratio: 1, gain: 0.6, detune: -5, attack: 0.136, decay: 1.05, sustain: 0.86, release: 0.58, attackCurve: 'lin', filter: { type: 'bandpass', slope: -12, freq: 185, Q: 3.2, track: 0 } },
      osc3: { type: 'noise', ratio: 1, gain: 0.07, color: 'white', attack: 0.03, decay: 0.45, sustain: 0.32, release: 0.34, attackCurve: 'lin', filter: { type: 'bandpass', slope: -12, freq: 1400, Q: 1.4, track: 0 } },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 2600, Q: 0.7, track: 0.3, env: { octaves: 0.85, attack: 0.13, decay: 1.1, sustain: 0.5, release: 0.55 } },
      vca: { attack: 0.115, decay: 1.05, sustain: 0.92, release: 0.56, attackCurve: 'lin' },
    },
    drive: 0.043334, shape: 'soft',
    humanize: { entry: 0.016, pitch: 0.002313, gain: 0.05 },
    vibrato: { depth: 0.2, rate: 4.7, delay: 0.42, spread: 0.4 } },

  mrdrContrabass: { label: 'Contrabass', category: 'Orch', synth: 'MRDR-3', dur: 4.5,
    note: 'Arco, not pizzicato — the slowest bow in the family, and a body resonance at '
      + '100 Hz that the written note is often sitting right on top of. Almost no vibrato: '
      + 'a bass player\'s hand moves as far as a cellist\'s for a quarter of the pitch '
      + 'change, so the depth comes down rather than the speed going up.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.92, attack: 0.146, decay: 1.15, sustain: 0.9, release: 0.68, attackCurve: 'lin', unison: 2, spread: 4, stereo: 0.15, filter: { type: 'lowpass', slope: -12, freq: 800, Q: 0.9, track: 0.45, env: { octaves: 1.2, attack: 0.14, decay: 1.2, sustain: 0.42, release: 0.65 } } },
      osc2: { type: 'sawtooth', ratio: 1, gain: 0.62, detune: -4, attack: 0.178, decay: 1.35, sustain: 0.86, release: 0.74, attackCurve: 'lin', filter: { type: 'bandpass', slope: -12, freq: 100, Q: 2.8, track: 0 } },
      osc3: { type: 'noise', ratio: 1, gain: 0.055, color: 'pink', attack: 0.04, decay: 0.55, sustain: 0.3, release: 0.42, attackCurve: 'lin', filter: { type: 'bandpass', slope: -12, freq: 900, Q: 1.3, track: 0 } },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 1700, Q: 0.7, track: 0.3, env: { octaves: 0.9, attack: 0.17, decay: 1.4, sustain: 0.45, release: 0.7 } },
      vca: { attack: 0.152, decay: 1.35, sustain: 0.92, release: 0.72, attackCurve: 'lin' },
    },
    drive: 0.033013, shape: 'soft',
    humanize: { entry: 0.02, pitch: 0.001734, gain: 0.05 },
    vibrato: { depth: 0.11, rate: 4.1, delay: 0.55, spread: 0.3 } },

  bestVoiceBox70s: { label: '70s Talk Box', category: 'Lead', synth: 'MRDR-3', dur: 2.2,
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
    drive: 0.466046, shape: 'soft', tone: { freq: 7200 },
    vibrato: { depth: 0.12, rate: 5.5, delay: 0.35 },
    mono: true, portamento: 0.055,
    trim: -0.902029 },

  bestRobotVox: { label: 'Robot Vox', category: 'FX', synth: 'MRDR-3', dur: 2,
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
    drive: 0.522562, shape: 'fold', tone: { freq: 6400 },
    trim: -0.383376 },

  bestVowelPad: { label: 'Vowel Pad', category: 'Pad', synth: 'MRDR-3', dur: 8,
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
    drive: 0.046105, shape: 'soft',
    humanize: { entry: 0.03 },
    vibrato: { depth: 0.08, rate: 3.4, delay: 1.8, spread: 0.5 } },

  syncRazorLead: { label: 'Sync Razor Lead', category: 'Lead', synth: 'MRDR-3', dur: 1.6,
    note: 'Osc 2 is hard-synced to Osc 1 at a non-integer interval, making a bright '
      + 'reset edge that stays pitched while the shared filter snaps shut.',
    sync: '1+2',
    layer: {
      osc1: { type: 'sine', ratio: 1, gain: 0.36, attack: 0.004, decay: 0.45,
        sustain: 0.72, release: 0.16 },
      osc2: { type: 'sawtooth', ratio: 2.37, gain: 0.92, attack: 0.003, decay: 0.42,
        sustain: 0.68, release: 0.14,
        pitch: { semitones: 12, attack: 0, decay: 0.22, sustain: 0 } },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 520, Q: 3.1, track: 0.35,
        env: { octaves: 4.3, attack: 0.003, decay: 0.38, sustain: 0.24, release: 0.16 } },
      vca: { attack: 0.003, decay: 0.48, sustain: 0.75, release: 0.18 },
    },
    drive: 0.327937, shape: 'soft', tone: { freq: 10500 },
    mono: true, portamento: 0.035,
    trim: -1.220765 },

  syncVowelLead: { label: 'Sync Vowel Lead', category: 'Lead', synth: 'MRDR-3', dur: 2.2,
    note: 'Osc 3 resets from Osc 1 while an unsynced triangle octave supports it, '
      + 'giving the upper pulse a vocal, speaking edge.',
    sync: '1+3',
    layer: {
      osc1: { type: 'sine', ratio: 1, gain: 0.42, attack: 0.012, decay: 0.7,
        sustain: 0.82, release: 0.3 },
      osc2: { type: 'triangle', ratio: 0.5, gain: 0.3, attack: 0.016, decay: 0.8,
        sustain: 0.86, release: 0.32 },
      osc3: { type: 'pulse', width: 0.31, ratio: 3.73, gain: 0.74, attack: 0.008,
        decay: 0.62, sustain: 0.7, release: 0.26 },
    },
    global: {
      filter: { type: 'bandpass', slope: -12, freq: 980, Q: 2.6, track: 0.22,
        env: { octaves: 1.8, attack: 0.04, decay: 0.72, sustain: 0.48, release: 0.3 } },
      vca: { attack: 0.01, decay: 0.7, sustain: 0.84, release: 0.34 },
    },
    vibrato: { depth: 0.12, rate: 5.2, delay: 0.35 },
    mono: true, portamento: 0.055 },

  syncBassBite: { label: 'Sync Bass Bite', category: 'Bass', synth: 'MRDR-3', dur: 1.7,
    note: 'Both upper oscillators reset from the sub-octave master, stacking two '
      + 'different sync tears over a solid sine floor.',
    sync: '1+2+3',
    layer: {
      osc1: { type: 'sine', ratio: 0.5, gain: 0.95, attack: 0.003, decay: 0.8,
        sustain: 0.92, release: 0.14 },
      osc2: { type: 'sawtooth', ratio: 1.17, gain: 0.68, attack: 0.002, decay: 0.55,
        sustain: 0.62, release: 0.12 },
      osc3: { type: 'square', ratio: 2.43, gain: 0.32, len: 0.7, attack: 0.002,
        decay: 0.36, sustain: 0.34, release: 0.09 },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 105, Q: 4.2, track: 0.42,
        env: { octaves: 5.1, attack: 0.002, decay: 0.32, sustain: 0.18, release: 0.12 } },
      vca: { attack: 0.003, decay: 0.75, sustain: 0.9, release: 0.16 },
    },
    drive: 0.466802, shape: 'soft', tone: { freq: 5600 },
    mono: true, portamento: 0.025,
    trim: -0.916084 },

  syncWireClav: { label: 'Sync Wire Clav', category: 'Keys', synth: 'MRDR-3', dur: 0.9,
    note: 'A short square slave is reset at a lopsided interval for a taut, metallic clav '
      + 'attack without using an FM operator.',
    sync: '1+2',
    layer: {
      osc1: { type: 'triangle', ratio: 1, gain: 1, attack: 0.001, decay: 0.24, sustain: 0.05, release: 0.06 },
      osc2: { type: 'square', ratio: 3.91, gain: 0.86, len: 0.76, attack: 0.001, decay: 0.19, sustain: 0.02, release: 0.045 },
    },
    global: {
      filter: { type: 'bandpass', slope: -12, freq: 1250, Q: 2.1, track: 0.48, env: { octaves: 2.4, attack: 0.001, decay: 0.16, sustain: 0.04, release: 0.05 } },
      vca: { attack: 0.001, decay: 9.77, sustain: 0.09, release: 0.07 },
    },
    drive: 0.417119, shape: 'soft',
    tone: { freq: 9200 },
    bypassed: {
      "layer.osc1.filter": { type: 'lowpass', freq: 1150, Q: 1.15 },
    },
    trim: 5.637978 },

  syncOrbitPad: { label: 'Sync Orbit Pad', category: 'Pad', synth: 'MRDR-3', dur: 8,
    note: 'Two differently reset slaves orbit a quiet triangle master, with a slow '
      + 'shared filter revealing the hard-sync harmonics instead of a pitch sweep.',
    sync: '1+2+3',
    layer: {
      osc1: { type: 'triangle', ratio: 1, gain: 0.44, attack: 0.7, decay: 2.2,
        sustain: 0.88, release: 2.1 },
      osc2: { type: 'sawtooth', ratio: 1.83, gain: 0.48, detune: -5, attack: 0.9,
        decay: 2.4, sustain: 0.78, release: 2.3, unison: 2, spread: 9, stereo: 0.45 },
      osc3: { type: 'pulse', width: 0.22, ratio: 3.17, gain: 0.34, detune: 4,
        attack: 1.15, decay: 2.8, sustain: 0.72, release: 2.6,
        unison: 2, spread: 7, stereo: 0.6 },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 360, Q: 1.8, track: 0.3,
        env: { octaves: 3.3, attack: 2.1, decay: 3.2, sustain: 0.58, release: 2.4 } },
      vca: { attack: 0.75, decay: 2.5, sustain: 0.9, release: 2.8,
        attackCurve: 'lin', releaseCurve: 'lin' },
    },
    humanize: { entry: 0.018 },
    vibrato: { depth: 0.07, rate: 3.1, delay: 1.4, spread: 0.35 } },

  bestMegaSawLead: { label: 'Mega Saw Lead', category: 'Lead', synth: 'MRDR-3', dur: 1.6,
    note: 'Nine oscillators. Two unison saws a fifth apart, a sub under them, all through '
      + 'one shared filter that opens across every note — the shared stage is the whole '
      + 'point, because nine separate filters would be nine sounds instead of one.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.85, attack: 0.006, decay: 0.5, sustain: 0.8, release: 0.18, unison: 4, spread: 26, stereo: 0.5 },
      osc2: { type: 'sawtooth', ratio: 1.4983, gain: 0.4, attack: 0.01, decay: 0.5, sustain: 0.7, release: 0.18, unison: 4, spread: 34, stereo: 0.65 },
      osc3: { type: 'pulse', width: 0.5, ratio: 0.5, gain: 0.42, attack: 0.004, decay: 0.6, sustain: 0.85, release: 0.16, pwm: { type: 'sine', rate: 0.42, depth: 0.5, delay: 0.1 } },
      lfo: { type: 'sine', rate: 5.4, depth: 0.12, target: 'filter', delay: 0.4 },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 380, Q: 2.2, track: 0.5, env: { octaves: 4.6, attack: 0.012, decay: 0.55, sustain: 0.42, release: 0.22 } },
      vca: { attack: 0.006, decay: 0.5, sustain: 0.85, release: 0.24 },
    },
    drive: 0.356942, shape: 'soft',
    tone: { freq: 12000 },
    vibrato: { depth: 0.1, rate: 5.6, delay: 0.5 },
    trim: -0.407741 },

  bestHeroLead: { label: 'Hero Lead', category: 'Lead', synth: 'MRDR-3', dur: 2.4,
    note: 'The one that plays the theme over the credits. Mono with a real glide, and a '
      + 'two-semitone blip into every note — the pitch envelope and the portamento running '
      + 'at once, which they could not do until they stopped sharing a parameter.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.9, attack: 0.02, decay: 0.6, sustain: 0.85, release: 1.013, unison: 3, spread: 14, pitch: { semitones: 2, decay: 0.055 } },
      osc2: { type: 'triangle', ratio: 2, gain: 0.154, len: 0.85, attack: 0.03, decay: 0.5, sustain: 0.6, release: 0.802, fm: { type: 'sine', ratio: 3.01, index: 0.9, attack: 0.004, decay: 0.18 } },
      osc3: { type: 'sawtooth', ratio: 0.5, gain: 0.45, detune: -4, attack: 0.02, decay: 0.7, sustain: 0.9, release: 0.77 },
      lfo: { type: 'sine', rate: 0.35, depth: 0.25, target: 'filter', delay: 0.6 },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 620, Q: 1.9, track: 0.55, env: { octaves: 3.8, attack: 0.05, decay: 0.9, sustain: 0.5, release: 0.644 } },
      vca: { attack: 0.02, decay: 0.8, sustain: 0.9, release: 0.739, attackCurve: 'lin' },
    },
    drive: 0.138363, shape: 'soft',
    tone: { freq: 11000 },
    vibrato: { depth: 0.16, rate: 5.1, delay: 0.45 },
    mono: true,
    portamento: 0.07 },

  bestScreamerLead: { label: 'Screamer Lead', category: 'Lead', synth: 'MRDR-3', dur: 1.4,
    note: 'Cuts through anything. An FM operator at a deliberately inharmonic ratio puts a '
      + 'metallic edge on the saw, the fold shaper turns level into a different sound rather '
      + 'than a louder one, and the filter envelope snaps shut behind each note.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.95, attack: 0.011, decay: 0.35, sustain: 0.72, release: 1.379, unison: 4, spread: 20, fm: { type: 'square', ratio: 2.47, index: 1.4, attack: 0.001, decay: 0.12 } },
      osc2: { type: 'square', ratio: 1, gain: 0.01, detune: 12, attack: 0.004, decay: 0.3, sustain: 0.6, release: 0.409 },
      osc3: { type: 'sawtooth', ratio: 0.5, gain: 0.137, attack: 0.003, decay: 0.4, sustain: 0.8, release: 1.086 },
      lfo: { type: 'sine', rate: 6.2, depth: 0.18, target: 'filter', delay: 0.25 },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 900, Q: 3.4, track: 0.45, env: { octaves: 3.2, attack: 0.004, decay: 0.28, sustain: 0.3, release: 0.16 } },
      vca: { attack: 0.015, decay: 0.586, sustain: 0.78, release: 0.343 },
    },
    drive: 0.266124, shape: 'fold',
    tone: { freq: 9000 },
    vibrato: { depth: 0.2, rate: 6.4, delay: 0.3 } },

  bestMonsterBass: { label: 'MONSTER Bass', category: 'Bass', synth: 'MRDR-3', dur: 1.8,
    note: 'A sine sub holding the floor, a saw doing the work and a square an octave up for '
      + 'the teeth, all arriving at one filter that slams open and shut on every note. The '
      + 'growl is the shared envelope, not three envelopes that happen to agree.',
    layer: {
      osc1: { type: 'sine', ratio: 0.5, gain: 1, attack: 0.004, decay: 0.9, sustain: 0.95, release: 0.12 },
      osc2: { type: 'sawtooth', ratio: 1, gain: 0.8, attack: 0.004, decay: 0.7, sustain: 0.7, release: 0.12, unison: 2, spread: 12 },
      osc3: { type: 'square', ratio: 2, gain: 0.22, len: 0.55, attack: 0.003, decay: 0.25, sustain: 0.3, release: 0.08 },
      lfo: { type: 'sine', rate: 0.5, depth: 0.2, target: 'filter', delay: 0.2 },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 90, Q: 3.8, track: 0.4, env: { octaves: 4.2, attack: 0.008, decay: 0.42, sustain: 0.22, release: 0.14 } },
      vca: { attack: 0.004, decay: 0.9, sustain: 0.92, release: 0.16 },
    },
    drive: 0.402563, shape: 'soft',
    tone: { freq: 5200 },
    mono: true,
    portamento: 0.035,
    trim: -0.055089 },

  bestReeseBass: { label: 'Reese Bass', category: 'Bass', synth: 'MRDR-3', dur: 2,
    note: 'Two saws detuned far enough to beat against each other — the 1988 Reese — with a '
      + 'clean sine sub underneath so the low end survives the interference. The LFO walks '
      + 'the shared filter, which is what turns a held note into a moving one.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.9, detune: 14, attack: 0.006, decay: 1, sustain: 0.9, release: 0.2, unison: 2, spread: 8 },
      osc2: { type: 'sawtooth', ratio: 1, gain: 0.9, detune: -14, attack: 0.006, decay: 1, sustain: 0.9, release: 0.2, unison: 2, spread: 8 },
      osc3: { type: 'sine', ratio: 0.5, gain: 0.75, attack: 0.005, decay: 1.2, sustain: 0.95, release: 0.18 },
      lfo: { type: 'triangle', rate: 0.9, depth: 0.55, target: 'filter', delay: 0.1 },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 245, Q: 4.15, track: 0.35, env: { octaves: 3.3, attack: 0.02, decay: 0.8, sustain: 0.35, release: 0.25 } },
      vca: { attack: 0.006, decay: 1.2, sustain: 0.94, release: 0.24 },
    },
    drive: 0.246536, shape: 'soft',
    tone: { freq: 7407.741855 },
    mono: true,
    portamento: 0.05,
    drivePlace: 'pre' },

  // ---- BEST: the pulse-width family --------------------------------------------
  //
  // Ten more, all built on the one thing a table cannot do: a width that MOVES. Each
  // layer carries its own PWM rate, which is the whole point — three widths drifting at
  // 0.28, 0.37 and 0.19 Hz never line up, and that non-repeating interference is what a
  // string machine is. Give all three the same rate and the stack breathes in lockstep,
  // which sounds like one oscillator getting fatter rather than like a section.

  bestPwmStrings: { label: 'PWM Strings', category: 'Orch', synth: 'MRDR-3', dur: 8,
    note: 'The string machine. Two pulses whose widths drift at 0.28 and 0.37 Hz — rates '
      + 'chosen not to line up — over a clean saw sub. The shimmer is the two widths passing '
      + 'through each other, which is why they must never share a rate.',
    layer: {
      osc1: { type: 'pulse', width: 0.5, ratio: 1, gain: 0.5, attack: 0.136667, decay: 2, sustain: 0.85, release: 1.2, attackCurve: 'lin', unison: 2, spread: 9, stereo: 0.85, pwm: { type: 'sine', rate: 0.28, depth: 0.62, delay: 0 } },
      osc2: { type: 'pulse', width: 0.46, ratio: 1, detune: -7, gain: 0.42, attack: 0.164, decay: 2.2, sustain: 0.82, release: 1.3, attackCurve: 'lin', unison: 2, spread: 13, stereo: 0.7, pwm: { type: 'sine', rate: 0.37, depth: 0.58, delay: 0 } },
      osc3: { type: 'sawtooth', ratio: 0.5, gain: 0.2, attack: 0.123, decay: 2.4, sustain: 0.9, release: 1.2, attackCurve: 'lin' },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 2400, Q: 0.55, track: 0.3, env: { octaves: 1.4, attack: 0.8, decay: 2.4, sustain: 0.6, release: 1 } },
      vca: { attack: 0.150333, decay: 2.4, sustain: 0.9, release: 1.5, attackCurve: 'lin' },
    },
    vibrato: { depth: 0.07, rate: 4.2, delay: 1.4 } },

  bestPwmBrass: { label: 'PWM Brass', category: 'Orch', synth: 'MRDR-3', dur: 2.4,
    note: 'The Jupiter brass stab: a pulse leaning on a saw, the width moving fast enough to '
      + 'be heard inside a short note, and the shared filter opening three octaves as the '
      + 'section leans in.',
    layer: {
      osc1: { type: 'pulse', width: 0.37, ratio: 1, gain: 0.9, attack: 0.012, decay: 0.7, sustain: 0.8, release: 0.25, pwm: { type: 'sine', rate: 1.23, depth: 0.52, delay: 0.05 } },
      osc2: { type: 'sawtooth', ratio: 1, detune: 7, gain: 0.6, attack: 0.033, decay: 0.7, sustain: 0.75, release: 0.25, unison: 2, spread: 11 },
      osc3: { type: 'pulse', width: 0.5, ratio: 0.5, gain: 0.4, attack: 0.03, decay: 0.8, sustain: 0.85, release: 0.22, pwm: { type: 'sine', rate: 1.61, depth: 0.42, delay: 0.05 } },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 520, Q: 1.15, track: 0.5, env: { octaves: 1.4, attack: 0.044, decay: 0.75, sustain: 0.45, release: 0.3 } },
      vca: { attack: 0.019, decay: 0.8, sustain: 0.85, release: 0.32, attackCurve: 'lin' },
    },
    drive: 0, shape: 'soft',
    tone: { freq: 11000 },
    vibrato: { depth: 0.11, rate: 5, delay: 0.5 },
    chorus: { mix: 0.2 } },

  bestPwmPadWide: { label: 'Wide PWM Pad', category: 'Pad', synth: 'MRDR-3', dur: 8,
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

  bestPwmBass: { label: 'FAT PWM Bass', category: 'Bass', synth: 'MRDR-3', dur: 1.8,
    note: 'A moving pulse body over a sine sub that is deliberately left ALONE — modulate the '
      + 'sub and the weight goes with it. Everything above 100 Hz drifts; the bottom octave '
      + 'does not move at all.',
    layer: {
      osc1: { type: 'pulse', width: 0.38, ratio: 1, gain: 0.85, attack: 0.005, decay: 0.8, sustain: 0.8, release: 0.14, pwm: { type: 'sine', rate: 0.24, depth: 0.45, delay: 0 } },
      osc2: { type: 'sine', ratio: 0.5, gain: 1, attack: 0.004, decay: 1, sustain: 0.95, release: 0.14 },
      osc3: { type: 'pulse', width: 0.28, ratio: 1, detune: -9, gain: 0.4, attack: 0.006, decay: 0.7, sustain: 0.7, release: 0.12, pwm: { type: 'sine', rate: 0.33, depth: 0.4, delay: 0 } },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 140, Q: 3.2, track: 0.4, env: { octaves: 3.6, attack: 0.01, decay: 0.5, sustain: 0.3, release: 0.16 } },
      vca: { attack: 0.005, decay: 1, sustain: 0.93, release: 0.18 },
    },
    drive: 0.322592, shape: 'soft',
    tone: { freq: 5600 },
    mono: true,
    portamento: 0.04,
    trim: -0.573938 },

  bestPwmGrowlBass: { label: 'PWM Growl Bass', category: 'Bass', synth: 'MRDR-3', dur: 1.6,
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
    drive: 0.765592, shape: 'fold', tone: { freq: 4200 },
    mono: true, portamento: 0.03,
    trim: -1.289063 },

  bestPwmHollowLead: { label: 'PWM Hollow Lead', category: 'Lead', synth: 'MRDR-3', dur: 1.8,
    note: 'The Oberheim hollow lead: two narrow pulses around a quarter duty, the width moving '
      + 'just fast enough to shimmer without turning into a wobble. Mono with a short glide, '
      + 'because this is a one-finger sound.',
    layer: {
      osc1: { type: 'pulse', width: 0.26, ratio: 1, gain: 0.9, attack: 0.012, decay: 0.6, sustain: 0.82, release: 0.2, unison: 2, spread: 10, pwm: { type: 'sine', rate: 1.1, depth: 0.5, delay: 0.15 } },
      osc2: { type: 'pulse', width: 0.3, ratio: 1, detune: -8, gain: 0.6, attack: 0.015, decay: 0.6, sustain: 0.78, release: 0.2, pwm: { type: 'sine', rate: 1.4, depth: 0.45, delay: 0.15 } },
      osc3: { type: 'sawtooth', ratio: 0.5, gain: 0.4, attack: 0.01, decay: 0.7, sustain: 0.85, release: 0.2 },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 800, Q: 2.4, track: 0.5, env: { octaves: 3, attack: 0.02, decay: 0.6, sustain: 0.5, release: 0.25 } },
      vca: { attack: 0.012, decay: 0.7, sustain: 0.88, release: 0.28 },
    },
    drive: 0.325153, shape: 'soft',
    tone: { freq: 10000 },
    vibrato: { depth: 0.15, rate: 5.4, delay: 0.4 },
    mono: true,
    portamento: 0.06,
    trim: -0.638108 },

  bestPwmReedLead: { label: 'PWM Reed Lead', category: 'Lead', synth: 'MRDR-3', dur: 2,
    note: 'A 15% pulse through a static bandpass at 1.6 kHz — the formant trick and the moving '
      + 'width in one patch. The resonance stays put while the duty walks under it, which is '
      + 'what a double reed does.',
    layer: {
      osc1: { type: 'pulse', width: 0.15, ratio: 1, gain: 1, attack: 0.02, decay: 0.6, sustain: 0.85, release: 0.18, pwm: { type: 'sine', rate: 0.75, depth: 0.5, delay: 0.2 }, filter: { type: 'bandpass', slope: -12, freq: 1600, Q: 8, track: 0, env: { octaves: 0.8, attack: 0.04, decay: 0.6, sustain: 0.5, release: 0.2 } } },
      osc2: { type: 'pulse', width: 0.22, ratio: 1, detune: 6, gain: 0.45, attack: 0.025, decay: 0.6, sustain: 0.8, release: 0.18, pwm: { type: 'sine', rate: 0.53, depth: 0.45, delay: 0.2 }, filter: { type: 'bandpass', slope: -12, freq: 700, Q: 6, track: 0 } },
      osc3: { type: 'triangle', ratio: 0.5, gain: 0.3, attack: 0.02, decay: 0.7, sustain: 0.8, release: 0.16 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 3200, Q: 0.9, track: 0.4, env: { octaves: 1.6, attack: 0.05, decay: 0.7, sustain: 0.55, release: 0.2 } },
      vca: { attack: 0.02, decay: 0.7, sustain: 0.88, release: 0.22 },
    },
    drive: 0.18854, shape: 'soft',
    tone: { freq: 9000 },
    vibrato: { depth: 0.17, rate: 5.6, delay: 0.35 } },

  bestPwmClav: { label: 'PWM Clav', category: 'Keys', synth: 'MRDR-3', dur: 1.2,
    note: 'Percussive and narrow: a 15% pulse with a filter envelope that shuts almost as fast '
      + 'as it opens. The PWM is shallow and quick — on a note this short it reads as the '
      + 'string still ringing rather than as modulation.',
    layer: {
      osc1: { type: 'pulse', width: 0.15, ratio: 1, gain: 1, attack: 0.002, decay: 0.28, sustain: 0.25, release: 0.1, pwm: { type: 'sine', rate: 2.4, depth: 0.3, delay: 0 } },
      osc2: { type: 'pulse', width: 0.22, ratio: 2, len: 0.6, detune: 8, gain: 0.32, attack: 0.002, decay: 0.18, sustain: 0.15, release: 0.08, pwm: { type: 'sine', rate: 3.1, depth: 0.28, delay: 0 } },
      osc3: { type: 'sawtooth', ratio: 0.5, gain: 0.3, attack: 0.002, decay: 0.3, sustain: 0.2, release: 0.08 },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 700, Q: 3.6, track: 0.55, env: { octaves: 3.4, attack: 0.002, decay: 0.22, sustain: 0.14, release: 0.1 } },
      vca: { attack: 0.002, decay: 0.3, sustain: 0.3, release: 0.12 },
    },
    drive: 0.236824, shape: 'soft',
    tone: { freq: 12000 },
    trim: -0.774526 },

  bestPwmChoir: { label: 'PWM Choir', category: 'Orch', synth: 'MRDR-3', dur: 8,
    note: 'The /a/ formants again, but over pulses whose widths drift instead of over plain '
      + 'saws. The vowel is held by the filters; the moving source is what turns one singer '
      + 'into a section, and it is doing the job the chorus pedal does on a Juno.',
    layer: {
      osc1: { type: 'pulse', width: 0.5, ratio: 1, gain: 0.9, attack: 0.151, decay: 1.4, sustain: 0.85, release: 1, attackCurve: 'lin', unison: 2, spread: 8, stereo: 0.75, pwm: { type: 'sine', rate: 0.24, depth: 0.6, delay: 0.5 }, filter: { type: 'bandpass', slope: -12, freq: 800, Q: 7, track: 0, env: { attack: 0.006 } } },
      osc2: { type: 'pulse', width: 0.44, ratio: 1, detune: 7, gain: 0.55, attack: 0.187, decay: 1.6, sustain: 0.8, release: 1, attackCurve: 'lin', pwm: { type: 'sine', rate: 0.35, depth: 0.55, delay: 0.5 }, filter: { type: 'bandpass', slope: -12, freq: 1150, Q: 9, track: 0 } },
      osc3: { type: 'pulse', width: 0.55, ratio: 1, detune: -8, gain: 0.3, attack: 0.145, decay: 1.8, sustain: 0.72, release: 1.1, attackCurve: 'lin', pwm: { type: 'sine', rate: 0.17, depth: 0.5, delay: 0.5 }, filter: { type: 'bandpass', slope: -12, freq: 2900, Q: 11, track: 0 } },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 3600, Q: 0.7, track: 0.3, env: { octaves: 1.2, attack: 0.183, decay: 1.8, sustain: 0.55, release: 1 } },
      vca: { attack: 0.022, decay: 1.8, sustain: 0.88, release: 1.3, attackCurve: 'lin' },
    },
    drive: 0.04364, shape: 'soft',
    humanize: { entry: 0.02 },
    vibrato: { depth: 0.16, rate: 5, delay: 0.7, spread: 0 },
    chorus: { mix: 0.37 } },

  bestClassicMono: { label: 'Classic Mono', category: 'Lead', synth: 'MRDR-3', dur: 2,
    note: 'Three oscillators into a mixer, one filter, one envelope — the architecture every '
      + 'classic mono synth has and the one this stack could not describe until its layers '
      + 'could give up their own amps. Every AMP reads THROUGH: the Global Amp is the only '
      + 'envelope in the patch.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.8, vca: 'through' },
      osc2: { type: 'sawtooth', ratio: 1, detune: 7, gain: 0.65, vca: 'through' },
      osc3: { type: 'square', ratio: 0.5, gain: 0.5, vca: 'through' },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 320, Q: 2.6, track: 0.5, env: { octaves: 3.6, attack: 0.01, decay: 0.55, sustain: 0.4, release: 0.2 } },
      vca: { attack: 0.012, decay: 0.6, sustain: 0.8, release: 0.22 },
    },
    drive: 0.31021, shape: 'soft',
    tone: { freq: 10000 },
    vibrato: { depth: 0.12, rate: 5.2, delay: 0.4 },
    mono: true,
    portamento: 0.05,
    trim: -0.773992 },

  bestPwmDrift: { label: 'PWM Drift', category: 'FX', synth: 'MRDR-3', dur: 8,
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

  // ---- TNGR-2 ------------------------------------------------------------
  // Original wavetable patches. The engine is native PeriodicWave based; the authored
  // table id and motion settings live in `tngr2`, so these remain ordinary catalogue
  // entries and inherit the existing picker/save/measurement machinery.
  tngrOrangeCurrent: { label: 'Warm Sequence Bass', category: 'Bass', synth: 'TNGR-2', dur: 1.5,
    note: 'Rounded moving low harmonics for a reliable sequenced bass.', tngr2: {
      oscA: { table: 'warmHarmonics', position: 0.08, envAmount: 0.18, level: 0.82, unison: 1 },
      oscB: { table: 'hollowPulse', position: 0.18, envAmount: 0.12, level: 0.25, unison: 1, interval: -12 },
      amp: { attack: 0.004, decay: 0.32, sustain: 0.72, release: 0.12 },
      filter: { type: 'lowpass', cutoff: 1900, resonance: 1.92 }, filterEnv: { amount: 1.4, attack: 0.002, decay: 0.22, sustain: 0.25 },
      positionEnv: { attack: 0.01, decay: 0.28, sustain: 0.28 }, master: { gain: 0.68 } } },
  tngrGlassMotor: { label: 'Glassy Bass', category: 'Bass', synth: 'TNGR-2', dur: 1.2,
    note: 'A glass transient settling into a firm dark fundamental.', tngr2: {
      oscA: { table: 'crystal', position: 0.5, envAmount: -0.4, level: 0.78 },
      oscB: { table: 'darkToAir', position: 0.2, envAmount: 0.16, level: 0.22, interval: -12 },
      amp: { attack: 0.002, decay: 0.24, sustain: 0.62, release: 0.1 },
      filter: { type: 'lowpass', cutoff: 2300, resonance: 2.4 }, filterEnv: { amount: 2, attack: 0.001, decay: 0.12, sustain: 0.08 },
      positionEnv: { attack: 0, decay: 0.18, sustain: 0 }, master: { gain: 0.67 } } },
  tngrNightSequence: { label: 'Sequencer Bass', category: 'Bass', synth: 'TNGR-2', dur: 1,
    note: 'A tempo-synced spectral pulse for repeated sixteenth notes.', tngr2: {
      oscA: { table: 'spectralPWM', position: 0.22, envAmount: 0.08, lfoAmount: 0.8, level: 0.82 },
      oscB: { table: 'organShift', position: 0.1, envAmount: 0.12, level: 0.18, interval: -12 },
      amp: { attack: 0.002, decay: 0.18, sustain: 0.55, release: 0.08 }, filter: { type: 'lowpass', cutoff: 1600, resonance: 2.88 },
      positionEnv: { attack: 0.002, decay: 0.16, sustain: 0.15 }, lfo1: { shape: 'triangle', sync: true, division: '1/16', amount: 0.55 }, master: { gain: 0.66 } } },
  tngrHollowVector: { label: 'Hollow Glide Bass', category: 'Bass', synth: 'TNGR-2', dur: 1.4,
    note: 'A hollow formant travel with mono glide and restrained resonance.', mode: 'mono', portamento: 0.05, tngr2: {
      oscA: { table: 'hollowPulse', position: 0.18, envAmount: 0.42, level: 0.84 },
      oscB: { table: 'vowelAEIOU', position: 0.06, envAmount: 0.18, level: 0.2, interval: -12 },
      amp: { attack: 0.003, decay: 0.25, sustain: 0.62, release: 0.12 }, filter: { type: 'lowpass', cutoff: 2100, resonance: 3.84 },
      filterEnv: { amount: 2.2, attack: 0.001, decay: 0.2, sustain: 0.12 }, positionEnv: { attack: 0, decay: 0.18, sustain: 0.1 }, master: { gain: 0.64 } } },
  tngrDigitalGrowl: { label: 'Growl Bass', category: 'Bass', synth: 'TNGR-2', dur: 1.6,
    note: 'Opposing A/B table motion for an aggressive but pitch-readable bass.', tngr2: {
      oscA: { table: 'alloy', position: 0.15, envAmount: 0.7, level: 0.74, unison: 2, spread: 8 },
      oscB: { table: 'reedWire', position: 0.82, envAmount: -0.52, level: 0.28, unison: 2, spread: 11, interval: -12 },
      amp: { attack: 0.005, decay: 0.45, sustain: 0.68, release: 0.16 }, filter: { type: 'lowpass', cutoff: 2600, resonance: 3.36 },
      positionEnv: { attack: 0.01, decay: 0.38, sustain: 0.3 }, master: { gain: 0.58 } } },

  tngrBerlinSignal: { label: 'Bright Glide Lead', category: 'Lead', synth: 'TNGR-2', dur: 1.5,
    note: 'A clear bright mono lead with slow spectral animation and useful glide.', mode: 'mono', portamento: 0.08, tngr2: {
      oscA: { table: 'sawForm', position: 0.35, envAmount: 0.25, level: 0.78, unison: 2, spread: 7 }, oscB: { table: 'warmHarmonics', position: 0.2, level: 0.18, interval: 12 },
      amp: { attack: 0.012, decay: 0.2, sustain: 0.82, release: 0.18 }, filter: { type: 'lowpass', cutoff: 5200, resonance: 2.16 }, filterEnv: { amount: 1.1, attack: 0.01, decay: 0.18, sustain: 0.42 },
      positionEnv: { attack: 0.04, decay: 0.6, sustain: 0.4 }, master: { gain: 0.62 } } },
  tngrNeonReed: { label: 'Reedy Lead', category: 'Lead', synth: 'TNGR-2', dur: 1.3,
    note: 'A reed-to-wire scan with a focused bandpass edge.', tngr2: {
      oscA: { table: 'reedWire', position: 0.12, envAmount: 0.62, level: 0.75 }, oscB: { table: 'vowelGlass', position: 0.42, envAmount: 0.24, level: 0.2, interval: 12 },
      amp: { attack: 0.008, decay: 0.22, sustain: 0.76, release: 0.2 }, filter: { type: 'bandpass', cutoff: 3400, resonance: 2.16 }, filterEnv: { amount: 1.5, attack: 0.004, decay: 0.3, sustain: 0.35 },
      positionEnv: { attack: 0.01, decay: 0.4, sustain: 0.25 }, master: { gain: 0.6 } } },
  tngrRubyScanner: { label: 'Pulsing Lead', category: 'Lead', synth: 'TNGR-2', dur: 1.1,
    note: 'A rhythmic position LFO lead with crisp articulation and moderate spread.', tngr2: {
      oscA: { table: 'crystal', position: 0.2, lfoAmount: 0.75, level: 0.76, unison: 2, spread: 10 }, oscB: { table: 'digitalSteps', position: 0.55, lfoAmount: -0.35, level: 0.2 },
      amp: { attack: 0.003, decay: 0.14, sustain: 0.7, release: 0.13 }, filter: { type: 'lowpass', cutoff: 5700, resonance: 2.64 }, positionEnv: { attack: 0, decay: 0.1, sustain: 0.1 },
      lfo1: { shape: 'triangle', sync: true, division: '1/16', amount: 0.72 }, master: { gain: 0.58 } } },
  tngrHorizonSolo: { label: 'Legato Solo Lead', category: 'Lead', synth: 'TNGR-2', dur: 2,
    note: 'An expressive legato lead with position movement during held notes.', mode: 'legato', portamento: 0.12, tngr2: {
      oscA: { table: 'vowelGlass', position: 0.18, envAmount: 0.52, level: 0.78, unison: 2, spread: 8 }, oscB: { table: 'darkToAir', position: 0.35, envAmount: 0.35, level: 0.16, interval: 12 },
      amp: { attack: 0.06, decay: 0.32, sustain: 0.82, release: 0.28 }, filter: { type: 'lowpass', cutoff: 4300, resonance: 2.28 }, filterEnv: { amount: 1.2, attack: 0.06, decay: 0.45, sustain: 0.4 },
      positionEnv: { attack: 0.3, decay: 1.1, sustain: 0.72 }, master: { gain: 0.6 } } },
  tngrSatelliteWire: { label: 'Satellite Wire', category: 'Lead', synth: 'TNGR-2', dur: 1.2,
    note: 'A thin upper-register digital lead controlled at C6.', tngr2: {
      oscA: { table: 'alloy', position: 0.64, envAmount: 0.25, level: 0.74, unison: 2, spread: 6 }, oscB: { table: 'crystal', position: 0.75, level: 0.15, interval: 12 },
      amp: { attack: 0.01, decay: 0.18, sustain: 0.68, release: 0.16 }, filter: { type: 'lowpass', cutoff: 6900, resonance: 1.92 }, positionEnv: { attack: 0.02, decay: 0.4, sustain: 0.24 }, master: { gain: 0.54 } } },

  tngrBurntHorizon: { label: 'Vowel Swell Pad', category: 'Pad', synth: 'TNGR-2', dur: 8,
    note: 'A slow glass-and-vowel pad that opens across held chords.',
    tngr2: { oscA: { table: 'vowelGlass', position: 0.12, envAmount: 0.55, lfoAmount: 0.08, lfo2Amount: 0.05, level: 0.76, unison: 2, spread: 9, stereo: 0.6 }, oscB: { table: 'darkToAir', position: 0.3, envAmount: 0.25, lfoAmount: -0.1, lfo2Amount: -0.06, level: 0.38, unison: 2, spread: 7, stereo: 0.6, interval: -12 }, amp: { attack: 0.014, decay: 1.8, sustain: 0.78, release: 3.2 }, positionEnv: { attack: 2.4, decay: 3.4, sustain: 0.5 }, filter: { type: 'lowpass', cutoff: 5200, resonance: 2.64 }, filterEnv: { amount: 1.4, attack: 1.1, decay: 2.2, sustain: 0.55 }, lfo1: { shape: 'sine', sync: true, division: '1/2', amount: 0.3 }, lfo2: { shape: 'triangle', rate: 0.11, amount: 0.2 }, master: { gain: 0.56 } } },
  tngrCloudMemory: { label: 'Soft Ambient Pad', category: 'Pad', synth: 'TNGR-2', dur: 6,
    note: 'A soft low-motion warm pad for ambience and dialogue beds.',
    tngr2: { oscA: { table: 'warmHarmonics', position: 0.15, envAmount: 0.22, level: 0.78, unison: 2, spread: 12 }, oscB: { table: 'choirBreath', position: 0.32, envAmount: 0.3, level: 0.22, unison: 2, spread: 9, interval: 12 }, amp: { attack: 0.011, decay: 1.5, sustain: 0.82, release: 2.4 }, positionEnv: { attack: 1.4, decay: 2.6, sustain: 0.5 }, filter: { type: 'lowpass', cutoff: 3600, resonance: 1.44 }, filterEnv: { amount: 0.8, attack: 1.2, decay: 2, sustain: 0.4 }, master: { gain: 0.6 } } },
  tngrGlassChoir: { label: 'Glass Choir', category: 'Pad', synth: 'TNGR-2', dur: 7,
    note: 'Vocal and glass motion without using the Vowel insert.',
    tngr2: { oscA: { table: 'choirBreath', position: 0.08, envAmount: 0.75, level: 0.7, unison: 2, spread: 10, stereo: 0.7 }, oscB: { table: 'vowelGlass', position: 0.62, envAmount: -0.35, level: 0.3, unison: 2, spread: 13, stereo: 0.7, interval: 12 }, amp: { attack: 0.031, decay: 2.2, sustain: 0.76, release: 1.948 }, positionEnv: { attack: 2, decay: 3, sustain: 0.6 }, filter: { type: 'lowpass', cutoff: 4700, resonance: 2.4 }, lfo1: { shape: 'sine', rate: 0.08, amount: 0.18 }, master: { gain: 0.5 } } },
  tngrPolarDrift: { label: 'Cold Wide Pad', category: 'Pad', synth: 'TNGR-2', dur: 8,
    note: 'Wide cold sparse partials with independent slow movement.',
    tngr2: { oscA: { table: 'crystal', position: 0.35, envAmount: 0.42, lfoAmount: 0.12, level: 0.68, unison: 3, spread: 18, stereo: 0.9 }, oscB: { table: 'alloy', position: 0.7, envAmount: -0.3, lfoAmount: -0.1, level: 0.25, unison: 2, spread: 15, stereo: 0.9, interval: -12 }, amp: { attack: 0.03, decay: 2.5, sustain: 0.7, release: 1.387 }, positionEnv: { attack: 2.8, decay: 3.5, sustain: 0.45 }, filter: { type: 'lowpass', cutoff: 5600, resonance: 1.92 }, lfo1: { shape: 'triangle', rate: 0.07, amount: 0.22 }, master: { gain: 0.46 } } },
  tngrDreamCircuit: { label: 'Evolving Digital Pad', category: 'Pad', synth: 'TNGR-2', dur: 8,
    note: 'An unmistakable evolving digital pad with musical rather than noisy motion.',
    tngr2: { oscA: { table: 'digitalSteps', position: 0.08, envAmount: 0.92, level: 0.7, unison: 2, spread: 12 }, oscB: { table: 'spectralPWM', position: 0.7, envAmount: -0.65, level: 0.28, unison: 2, spread: 10, interval: -12 }, amp: { attack: 0.015, decay: 2, sustain: 0.78, release: 0.707 }, positionEnv: { attack: 1.6, decay: 3.8, sustain: 0.52 }, filter: { type: 'lowpass', cutoff: 4800, resonance: 2.88 }, lfo1: { shape: 'triangle', sync: true, division: '1/2', amount: 0.24 }, master: { gain: 0.5 } } },
  tngrBlueCathedral: { label: 'Blue Cathedral', category: 'Pad', synth: 'TNGR-2', dur: 8,
    note: 'A long organ-shift and octave-cascade pad with a dignified release.', tngr2: {
      oscA: { table: 'organShift', position: 0.12, envAmount: 0.5, level: 0.74, unison: 2, spread: 8 }, oscB: { table: 'octaveCascade', position: 0.18, envAmount: 0.62, level: 0.22, unison: 2, spread: 11, interval: -12 },
      amp: { attack: 1.2, decay: 2.8, sustain: 0.82, release: 4 }, positionEnv: { attack: 1.8, decay: 3.8, sustain: 0.5 }, filter: { type: 'lowpass', cutoff: 4100, resonance: 1.68 }, filterEnv: { amount: 0.7, attack: 1, decay: 3, sustain: 0.35 }, master: { gain: 0.52 } } },

  tngrDigitalEp84: { label: 'Digital E-Piano', category: 'Keys', synth: 'TNGR-2', dur: 2.4,
    note: 'A bright struck transient moving quickly to a warmer sustained frame.', tngr2: {
      oscA: { table: 'bellFold', position: 0.72, envAmount: -0.42, level: 0.75 }, oscB: { table: 'warmHarmonics', position: 0.48, envAmount: -0.18, level: 0.2, interval: -12 },
      amp: { attack: 0.004, decay: 1.3, sustain: 0.25, release: 0.45 }, positionEnv: { attack: 0, decay: 0.8, sustain: 0.1 }, filter: { type: 'lowpass', cutoff: 6200, resonance: 2.16 }, filterEnv: { amount: 1.6, attack: 0.001, decay: 0.7, sustain: 0.1 }, master: { gain: 0.58 } } },
  tngrHollowKeys: { label: 'Hollow Keys', category: 'Keys', synth: 'TNGR-2', dur: 1.8,
    note: 'A playable poly key with odd and even harmonic contrast.', tngr2: {
      oscA: { table: 'hollowPulse', position: 0.26, envAmount: 0.18, level: 0.78 }, oscB: { table: 'reedWire', position: 0.2, level: 0.16, interval: 12 },
      amp: { attack: 0.006, decay: 0.6, sustain: 0.52, release: 0.3 }, positionEnv: { attack: 0, decay: 0.35, sustain: 0.15 }, filter: { type: 'lowpass', cutoff: 3900, resonance: 1.92 }, filterEnv: { amount: 1.1, attack: 0.002, decay: 0.35, sustain: 0.18 }, master: { gain: 0.6 } } },
  tngrPhaseClav: { label: 'Phase Clav', category: 'Keys', synth: 'TNGR-2', dur: 0.8,
    note: 'A short nasal spectral scan for rhythmic comping.', tngr2: {
      oscA: { table: 'reedWire', position: 0.6, envAmount: -0.35, level: 0.82 }, oscB: { table: 'digitalSteps', position: 0.8, level: 0.16, interval: 12 },
      amp: { attack: 0.001, decay: 0.18, sustain: 0.08, release: 0.06 }, positionEnv: { attack: 0, decay: 0.12, sustain: 0 }, filter: { type: 'bandpass', cutoff: 2300, resonance: 3.36 }, master: { gain: 0.54 } } },
  tngrMemoryOrgan: { label: 'Shifting Organ', category: 'Keys', synth: 'TNGR-2', dur: 4,
    note: 'A slowly shifting drawbar-like spectrum with stable chord level.',
    tngr2: { oscA: { table: 'organShift', position: 0.2, envAmount: 0.28, level: 0.8, unison: 2, spread: 6 }, oscB: { table: 'octaveCascade', position: 0.35, envAmount: 0.2, level: 0.16, interval: -12 }, amp: { attack: 0.027, decay: 0.4, sustain: 0.84, release: 0.65 }, positionEnv: { attack: 0.25, decay: 1.1, sustain: 0.3 }, filter: { type: 'lowpass', cutoff: 5200, resonance: 1.2 }, master: { gain: 0.56 } } },

  tngrCrystalTrigger: { label: 'Sparkle Pluck', category: 'Pluck', synth: 'TNGR-2', dur: 1.2,
    note: 'A sparkling high-partial attack with a clean short body.',
    drive: 0,
    tngr2: { oscA: { table: 'crystal', position: 0.58, envAmount: -0.71, level: 0.83, detune: -4 }, oscB: { table: 'bellFold', position: 0.72, level: 0.14, interval: 12, detune: 6 }, amp: { attack: 0.001, decay: 0.726, sustain: 0.26, release: 0.16 }, positionEnv: { attack: 0.003, decay: 0.715, sustain: 0.79 }, filter: { type: 'lowpass', cutoff: 1946.16, resonance: 2.4, keyTrack: 0.38 }, master: { gain: 0.52 }, filterEnv: { sustain: 0.21, release: 0.029, decay: 0.093 } },
    chorus: { mix: 0.2 } },
  tngrWireHarp: { label: 'Metal Harp', category: 'Pluck', synth: 'TNGR-2', dur: 1.4,
    note: 'A metallic reed onset decaying toward a simpler waveform.', tngr2: {
      oscA: { table: 'alloy', position: 0.72, envAmount: -0.55, level: 0.76 }, oscB: { table: 'reedWire', position: 0.6, level: 0.18, interval: 12 },
      amp: { attack: 0.001, decay: 0.75, sustain: 0.08, release: 0.22 }, positionEnv: { attack: 0, decay: 0.62, sustain: 0.04 }, filter: { type: 'lowpass', cutoff: 7300, resonance: 1.92 }, master: { gain: 0.55 } } },
  tngrDataMarimba: { label: 'Digital Marimba', category: 'Pluck', synth: 'TNGR-2', dur: 1.3,
    note: 'A woody-digital table journey distinct from KLNG8 percussion.', tngr2: {
      oscA: { table: 'organShift', position: 0.35, envAmount: -0.3, level: 0.8 }, oscB: { table: 'crystal', position: 0.2, level: 0.13, interval: 12 },
      amp: { attack: 0.002, decay: 0.48, sustain: 0.06, release: 0.18 }, positionEnv: { attack: 0, decay: 0.38, sustain: 0.05 }, filter: { type: 'lowpass', cutoff: 5400, resonance: 1.68 }, master: { gain: 0.55 } } },

  tngrIceBell: { label: 'Ice Bell', category: 'Bells', synth: 'TNGR-2', dur: 3,
    note: 'Sparse crystal partials with a long decay and controlled high notes.',
    tngr2: { oscA: { table: 'bellFold', position: 0.84, envAmount: -0.2, level: 0.76 }, oscB: { table: 'crystal', position: 0.65, level: 0.16, interval: 12, envAmount: 0 }, amp: { attack: 0.001, decay: 1.7, sustain: 0.03, release: 0.9 }, positionEnv: { attack: 0, decay: 1.278, sustain: 0.17 }, filter: { type: 'lowpass', cutoff: 13180, resonance: 1.2 }, master: { gain: 0.5 }, filterEnv: { decay: 0.356, attack: 0.007 } } },
  tngrAlloyChime: { label: 'Dark Metal Chime', category: 'Bells', synth: 'TNGR-2', dur: 2.6,
    note: 'A darker metallic evolution with controlled beating between oscillators.',
    tngr2: { oscA: { table: 'alloy', position: 0.55, envAmount: -0.3, level: 0.72, unison: 2, spread: 5 }, oscB: { table: 'bellFold', position: 0.38, level: 0.2, interval: 12, detune: 7 }, amp: { attack: 0.001, decay: 0.373, sustain: 0.18, release: 0.684 }, positionEnv: { attack: 0, decay: 0.9, sustain: 0.55 }, filter: { type: 'lowpass', cutoff: 7600, resonance: 2.16 }, master: { gain: 0.5 } },
    chorus: { mix: 0.03 },
    trim: -0.9 },

  // Familiar, low-cost instruments. These deliberately favour one oscillator at unison 1
  // over TNGR-2's wider showcase architecture, so they stay useful in full arrangements.
  tngrRoundBass: { label: 'Digital Round Bass', category: 'Bass', synth: 'TNGR-2', dur: 1.8,
    note: 'A plain, warm single-oscillator bass with a stable fundamental.', tngr2: {
      oscA: { table: 'basic', position: 0.18, level: 0.86, unison: 1 },
      amp: { attack: 0.006, decay: 0.38, sustain: 0.72, release: 0.16 },
      filter: { type: 'lowpass', cutoff: 1250, resonance: 0.96 }, filterEnv: { amount: 0.7, attack: 0.002, decay: 0.3, sustain: 0.25 },
      positionEnv: { attack: 0, decay: 0.25, sustain: 0 }, master: { gain: 0.7 } } },
  tngrPickedBass: { label: 'Picked Bass', category: 'Bass', synth: 'TNGR-2', dur: 1.3,
    note: 'A clean bass-guitar-like pluck with a short warm body.', tngr2: {
      oscA: { table: 'warmHarmonics', position: 0.34, envAmount: -0.12, level: 0.84, unison: 1 },
      amp: { attack: 0.002, decay: 0.48, sustain: 0.34, release: 0.13 },
      filter: { type: 'lowpass', cutoff: 2100, resonance: 1.2 }, filterEnv: { amount: 1.1, attack: 0.001, decay: 0.24, sustain: 0.08 },
      positionEnv: { attack: 0, decay: 0.3, sustain: 0.08 }, master: { gain: 0.66 } } },

  tngrSoftPiano: { label: 'Soft Piano', category: 'Keys', synth: 'TNGR-2', dur: 3.2,
    note: 'A mellow piano-like keyboard with a restrained hammer overtone.', tngr2: {
      oscA: { table: 'warmHarmonics', position: 0.3, envAmount: -0.18, level: 0.78, unison: 1 },
      oscB: { table: 'bellFold', position: 0.2, level: 0.1, unison: 1, interval: 12 },
      amp: { attack: 0.003, decay: 1.35, sustain: 0.18, release: 0.55 },
      filter: { type: 'lowpass', cutoff: 4800, resonance: 0.72 }, filterEnv: { amount: 0.8, attack: 0.001, decay: 0.7, sustain: 0.05 },
      positionEnv: { attack: 0, decay: 0.75, sustain: 0.04 }, master: { gain: 0.62 } } },
  tngrBrightPiano: { label: 'Bright Piano', category: 'Keys', synth: 'TNGR-2', dur: 2.8,
    note: 'A clear pop-piano style attack that settles into a simple harmonic body.', tngr2: {
      oscA: { table: 'warmHarmonics', position: 0.52, envAmount: -0.32, level: 0.8, unison: 1 },
      oscB: { table: 'crystal', position: 0.16, level: 0.09, unison: 1, interval: 12 },
      amp: { attack: 0.002, decay: 1.05, sustain: 0.2, release: 0.42 },
      filter: { type: 'lowpass', cutoff: 6700, resonance: 0.6 }, filterEnv: { amount: 1.1, attack: 0.001, decay: 0.55, sustain: 0.04 },
      positionEnv: { attack: 0, decay: 0.6, sustain: 0.05 }, master: { gain: 0.58 } } },
  tngrElectricKeys: { label: 'Electric Keys', category: 'Keys', synth: 'TNGR-2', dur: 3,
    note: 'A conventional soft electric keyboard with a gentle tine at the front.', tngr2: {
      oscA: { table: 'basic', position: 0.08, envAmount: 0.08, level: 0.82, unison: 1 },
      oscB: { table: 'bellFold', position: 0.28, level: 0.08, unison: 1, interval: 12 },
      amp: { attack: 0.005, decay: 1.15, sustain: 0.32, release: 0.65 },
      filter: { type: 'lowpass', cutoff: 5100, resonance: 0.96 },
      positionEnv: { attack: 0, decay: 0.85, sustain: 0.08 }, master: { gain: 0.62 } } },

  tngrMusicBell: { label: 'Music Bell', category: 'Bells', synth: 'TNGR-2', dur: 3.6,
    note: 'A rounded, familiar music-box bell without a wide unison stack.',
    tngr2: { oscA: { table: 'bellFold', position: 0.42, envAmount: -0.16, level: 0.8, unison: 1 }, amp: { attack: 0.021, decay: 2.1, sustain: 0.02, release: 0.8 }, filter: { type: 'lowpass', cutoff: 8200, resonance: 0.72 }, positionEnv: { attack: 0.007, decay: 1.25, sustain: 0.03 }, master: { gain: 0.52 }, filterEnv: { attack: 0.019 } },
    chorus: { mix: 0 },
    vibrato: { depth: 0.02 } },
  tngrChurchBell: { label: 'Church Bell', category: 'Bells', synth: 'TNGR-2', dur: 5,
    note: 'A darker, weightier bell with one quiet detuned upper partial layer.', tngr2: {
      oscA: { table: 'alloy', position: 0.3, envAmount: -0.14, level: 0.76, unison: 1 },
      oscB: { table: 'bellFold', position: 0.5, level: 0.12, unison: 1, interval: 12, detune: -9 },
      amp: { attack: 0.002, decay: 2.8, sustain: 0.03, release: 1.4 },
      filter: { type: 'lowpass', cutoff: 6100, resonance: 1.2 },
      positionEnv: { attack: 0, decay: 1.8, sustain: 0.06 }, master: { gain: 0.5 } } },
  tngrCelesta: { label: 'Celesta', category: 'Bells', synth: 'TNGR-2', dur: 3.2,
    note: 'A light, playable celesta tone using one oscillator and a soft top end.', tngr2: {
      oscA: { table: 'crystal', position: 0.22, envAmount: -0.1, level: 0.78, unison: 1 },
      amp: { attack: 0.002, decay: 1.65, sustain: 0.025, release: 0.7 },
      filter: { type: 'lowpass', cutoff: 7500, resonance: 0.6 },
      positionEnv: { attack: 0, decay: 1, sustain: 0.03 }, master: { gain: 0.5 } } },

  tngrWarmStrings: { label: 'Warm Strings', category: 'Orch', synth: 'TNGR-2', dur: 6,
    note: 'A restrained ensemble-style string bed with slow natural articulation.', tngr2: {
      oscA: { table: 'sawForm', position: 0.18, envAmount: 0.06, level: 0.76, unison: 1 },
      amp: { attack: 0.42, decay: 1.2, sustain: 0.82, release: 1.5 },
      filter: { type: 'lowpass', cutoff: 3300, resonance: 0.96 }, filterEnv: { amount: 0.35, attack: 0.5, decay: 1.4, sustain: 0.55 },
      positionEnv: { attack: 0.8, decay: 2.2, sustain: 0.35 }, master: { gain: 0.57 } } },
  tngrSoftStrings: { label: 'Soft Strings', category: 'Orch', synth: 'TNGR-2', dur: 6,
    note: 'A softer single-oscillator string pad for chords behind a busy mix.', tngr2: {
      oscA: { table: 'warmHarmonics', position: 0.42, envAmount: 0.08, level: 0.78, unison: 1 },
      amp: { attack: 0.7, decay: 1.4, sustain: 0.86, release: 1.8 },
      filter: { type: 'lowpass', cutoff: 2600, resonance: 0.72 },
      positionEnv: { attack: 1.1, decay: 2.4, sustain: 0.38 }, master: { gain: 0.6 } } },

  tngrBrassSection: { label: 'Brass Section', category: 'Orch', synth: 'TNGR-2', dur: 3,
    note: 'A direct ensemble brass patch with a modest opening bite.',
    tngr2: { oscA: { table: 'sawForm', position: 0.34, envAmount: 0.24, level: 0.85, unison: 1 }, amp: { attack: 0.055, decay: 0.5, sustain: 0.78, release: 0.38 }, filter: { type: 'lowpass', cutoff: 1550, resonance: 0.8 }, filterEnv: { amount: 2.1, attack: 0.06, decay: 0.42, sustain: 0.3 }, positionEnv: { attack: 0.08, decay: 0.45, sustain: 0.23, release: 0.477 }, master: { gain: 0.58 }, oscB: { table: 'reedWire', position: 0.12, level: 0.09, unison: 1, detune: 3 } },
    chorus: { mix: 0.15, rate: 2, depth: 0.19 } },
  tngrSoftHorn: { label: 'Soft Horn', category: 'Orch', synth: 'TNGR-2', dur: 3.5,
    note: 'A mellow single-oscillator horn for sustained melody and chords.', tngr2: {
      oscA: { table: 'reedWire', position: 0.08, envAmount: 0.08, level: 0.8, unison: 1 },
      amp: { attack: 0.09, decay: 0.55, sustain: 0.84, release: 0.5 },
      filter: { type: 'lowpass', cutoff: 2300, resonance: 1.44 }, filterEnv: { amount: 0.65, attack: 0.07, decay: 0.5, sustain: 0.38 },
      positionEnv: { attack: 0.08, decay: 0.55, sustain: 0.2 }, master: { gain: 0.62 } } },

  tngrPlainSaw: { label: 'Plain Saw', category: 'Lead', synth: 'TNGR-2', dur: 2,
    note: 'A simple filtered sawtooth synth with no unison or second oscillator.', tngr2: {
      oscA: { table: 'basic', position: 0.5, level: 0.82, unison: 1 },
      amp: { attack: 0.01, decay: 0.32, sustain: 0.76, release: 0.2 },
      filter: { type: 'lowpass', cutoff: 3400, resonance: 1.68 }, filterEnv: { amount: 0.9, attack: 0.005, decay: 0.28, sustain: 0.36 },
      positionEnv: { attack: 0, decay: 0.25, sustain: 0 }, master: { gain: 0.61 } } },
  tngrPlainPulse: { label: 'Plain Pulse', category: 'Lead', synth: 'TNGR-2', dur: 2,
    note: 'A straightforward hollow pulse lead with a small amount of spectral movement.', tngr2: {
      oscA: { table: 'hollowPulse', position: 0.16, envAmount: 0.08, level: 0.82, unison: 1 },
      amp: { attack: 0.008, decay: 0.28, sustain: 0.74, release: 0.18 },
      filter: { type: 'lowpass', cutoff: 3000, resonance: 1.44 },
      positionEnv: { attack: 0.02, decay: 0.4, sustain: 0.18 }, master: { gain: 0.62 } } },
  tngrClassicSquare: { label: 'Classic Square', category: 'Lead', synth: 'TNGR-2', dur: 2,
    note: 'A lean single-oscillator square tone for simple melodies and arpeggios.', tngr2: {
      oscA: { table: 'basic', position: 1, level: 0.8, unison: 1 },
      amp: { attack: 0.006, decay: 0.26, sustain: 0.7, release: 0.16 },
      filter: { type: 'lowpass', cutoff: 2800, resonance: 1.2 }, filterEnv: { amount: 0.65, attack: 0.004, decay: 0.24, sustain: 0.32 },
      positionEnv: { attack: 0, decay: 0.2, sustain: 0 }, master: { gain: 0.6 } } },

  tngrScannerSweep: { label: 'Scanner Sweep', category: 'FX', synth: 'TNGR-2', dur: 4,
    note: 'A tempo-synced full-table travel for transitions.', tngr2: {
      oscA: { table: 'digitalSteps', position: 0, envAmount: 1, level: 0.7, unison: 2, spread: 14 }, oscB: { table: 'vowelGlass', position: 1, envAmount: -1, level: 0.25, unison: 2, spread: 11, interval: -12 },
      amp: { attack: 0.25, decay: 1.6, sustain: 0.7, release: 1.1 }, positionEnv: { attack: 1.2, decay: 2.1, sustain: 0.45 }, filter: { type: 'lowpass', cutoff: 6400, resonance: 2.88 }, lfo1: { shape: 'triangle', sync: true, division: '1/4', amount: 0.22 }, master: { gain: 0.42 } } },
  tngrTransmission: { label: 'Transmission', category: 'FX', synth: 'TNGR-2', dur: 3,
    note: 'A tonal vowel and digital talking movement for signal-like transitions.', tngr2: {
      oscA: { table: 'vowelAEIOU', position: 0.1, envAmount: 0.86, lfoAmount: 0.3, level: 0.72 }, oscB: { table: 'digitalSteps', position: 0.5, envAmount: -0.55, level: 0.18, interval: 12 },
      amp: { attack: 0.04, decay: 0.7, sustain: 0.62, release: 0.8 }, positionEnv: { attack: 0.1, decay: 1.5, sustain: 0.3 }, filter: { type: 'bandpass', cutoff: 1800, resonance: 4.08 }, lfo1: { shape: 'square', sync: true, division: '1/16', amount: 0.32 }, master: { gain: 0.44 } } },
  squareVSMono: { label: 'Square VS Mono', category: 'Bells', synth: 'CRLS-1', dur: 2,
    note: 'Odd partials only, struck and left to ring. Woodier than the FM marimba beside it.',
    origin: 'Tonejs/Presets Synth/Marimba',
    options: {
      oscillator: { partials: [1, 0, 2, 0, 3], type: 'square' },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.3 },
    } },

  // ---- JMJR-4 -----------------------------------------------------------------
  //
  // A formant voice: up to four singers to a key, each a complete throat and tract. The
  // catalogue's copy of the standalone panel's bank (work/local/robot_voice_jmjr.html, the
  // 6 September build), less the three spoken ones, which wait on the SPEAK port, and
  // less the crusher pots, which are the lane's Bit Crusher effect. Every key under
  // `jmjr4` is a pot on the desk; a key left out takes the panel's default. Vibrato depth
  // is in semitones like every native synth here: the panel's fraction f becomes
  // 12*log2(1+f), so its 0.012 is 0.21.

  jmjrChoirAah: { label: 'Sung Choir Aah', category: 'Pad', synth: 'JMJR-4', dur: 8,
    note: 'Three singers on a warm throat, wide formants, a slow swell and a delayed vibrato. The choir the synth exists for. It was four until the fourth was measured: a quarter of the note-on cost for a fullness nobody could hear.',
    jmjr4: { voice: 'chorister', line: 'aah', morphTo: 'AH',
      unison: 3, spread: 24, tilt: 3, breath: 0.42, resonance: 38,
      amp: { attack: 0.3, decay: 0.4, sustain: 1.0, release: 1.2 } },
    vibrato: { depth: 0.22, rate: 5.2, delay: 0.35 } },
  jmjrChoirOoh: { label: 'Sung Choir Ooh', category: 'Pad', synth: 'JMJR-4', dur: 8,
    note: 'Two singers on ooh, rounder and darker than the aah beside it.',
    jmjr4: { voice: 'announcer', line: 'ooh',
      unison: 2, spread: 20,
      amp: { attack: 0.09, decay: 0.2, sustain: 1.0, release: 0.5 } },
    vibrato: { depth: 0.21, rate: 5.0, delay: 0.15 } },
  jmjrDoowop: { label: 'Doo-wop', category: 'Lead', synth: 'JMJR-4', dur: 1.5,
    note: 'Two singers on doo with a quick attack and a settled sustain: the backing line.',
    jmjr4: { voice: 'announcer', line: 'doo',
      unison: 2, spread: 14, tilt: 3,
      amp: { attack: 0.02, decay: 0.35, sustain: 0.65, release: 0.2 } },
    vibrato: { depth: 0.17, rate: 5.0, delay: 0.15 } },
  jmjrRobotChant: { label: 'Robot Chant', category: 'Lead', synth: 'JMJR-4', dur: 1.5,
    note: 'One sawtooth-throated singer on daa, legato, no vibrato: the robot reading the line. BREATH is off — the D keeps its burst and loses the breath behind it, which is what a robot has instead of lungs, and what makes a fast line of these cost half what it did.',
    jmjr4: { voice: 'robot', line: 'daa',
      unison: 1, breath: 0,
      amp: { attack: 0.01, decay: 0.2, sustain: 1.0, release: 0.12 } },
    mode: 'legato' },
  jmjrSmallVoice: { label: 'Small Voice', category: 'Lead', synth: 'JMJR-4', dur: 1.5,
    note: 'A smaller, higher tract on laa, two of them.',
    jmjr4: { voice: 'small', line: 'laa',
      unison: 2, spread: 20, tilt: 2,
      amp: { attack: 0.05, decay: 0.2, sustain: 1.0, release: 0.35 } },
    vibrato: { depth: 0.21, rate: 5.0, delay: 0.15 } },
  jmjrOohOpens: { label: 'Ooh Opens', category: 'Pad', synth: 'JMJR-4', dur: 8,
    note: 'Every note starts on ooh and opens into aah over a second: MORPH TIME doing the singing.',
    jmjr4: { voice: 'chorister', line: 'ooh', morphTo: 'AH',
      morph: 100, morphTime: 1.2, unison: 3, spread: 22,
      amp: { attack: 0.35, decay: 0.2, sustain: 1.0, release: 0.9 } },
    vibrato: { depth: 0.17, rate: 5.0, delay: 0.15 } },
  jmjrHumsClosed: { label: 'Hums Closed', category: 'Pad', synth: 'JMJR-4', dur: 8,
    note: 'The other way: an aah that closes into a hum over two seconds, the nose coming in with it.',
    jmjr4: { voice: 'chorister', line: 'aah', morphTo: 'M',
      morph: 100, morphTime: 2.2, unison: 3, spread: 18,
      amp: { attack: 0.2, decay: 0.2, sustain: 1.0, release: 1.2 } },
    vibrato: { depth: 0.14, rate: 5.0, delay: 0.15 } },
  jmjrScoopLead: { label: 'Scoop Lead', category: 'Lead', synth: 'JMJR-4', dur: 1.5,
    note: 'One singer scooping up into every note from seven tenths of a semitone below, legato.',
    jmjr4: { voice: 'announcer', line: 'laa', morphTo: 'AH',
      bend: -0.7, bendTime: 0.16, unison: 1,
      amp: { attack: 0.02, decay: 0.3, sustain: 0.85, release: 0.25 } },
    mode: 'legato', vibrato: { depth: 0.34, rate: 5.0, delay: 0.25 } },
  jmjrOldChorister: { label: 'Old Chorister', category: 'Pad', synth: 'JMJR-4', dur: 8,
    note: 'An old voice that cannot hold still: flutter and jitter from the throat, a small scoop, a slight opening.',
    jmjr4: { voice: 'elder', line: 'ooh', morphTo: 'AH',
      morph: 25, morphTime: 0.8, bend: -0.4, bendTime: 0.22, unison: 2, spread: 30,
      amp: { attack: 0.25, decay: 0.4, sustain: 0.9, release: 0.8 } },
    vibrato: { depth: 0.27, rate: 5.0, delay: 0.15 } },
  jmjrFormantMachine: { label: 'Formant Machine', category: 'FX', synth: 'JMJR-4', dur: 1.5,
    note: 'Resonance hard over and no vibrato: the tract as a bank of ringing filters, mono.',
    jmjr4: { voice: 'robot', line: 'eeh', morphTo: 'OO',
      morph: 60, morphTime: 0.5, unison: 1, tilt: 0, resonance: 96,
      amp: { attack: 0.005, decay: 0.15, sustain: 1.0, release: 0.08 } },
    mode: 'mono' },
  jmjrArcadeChorus: { label: 'Arcade Chorus', category: 'FX', synth: 'JMJR-4', dur: 1.5,
    note: 'A nasal throat, three of them, on daa. Six bits at 8 kHz: the cabinet speaker.',
    jmjr4: { voice: 'nasal', line: 'daa',
      bits: 6, rate: 8, morphTo: 'AH',
      unison: 3, spread: 26,
      amp: { attack: 0.01, decay: 0.2, sustain: 1.0, release: 0.15 } },
    vibrato: { depth: 0.14, rate: 5.0, delay: 0.15 } },
  jmjrTitanDrone: { label: 'Titan Drone', category: 'Pad', synth: 'JMJR-4', dur: 8,
    note: 'The biggest tract there is, held long, drifting a little towards ooh over three seconds.',
    jmjr4: { voice: 'titan', line: 'oh', morphTo: 'OO',
      morph: 40, morphTime: 3.0, unison: 2, spread: 12,
      amp: { attack: 0.6, decay: 0.5, sustain: 1.0, release: 1.6 } },
    vibrato: { depth: 0.1, rate: 5.0, delay: 0.15 } },
  // The Speed Zone coyote's howl (the coyoteHowl cue, audio.js), picked by Peter from six
  // on 29 Sep 2026 — tools/render-howl-auditions.js renders the audition again. The cue
  // plays COYOTE_HOWL_NOTES through it: three yips, then one breath that rises and falls.
  coyoteHowl: { label: '= Coyote Howl', category: 'FX', synth: 'JMJR-4', dur: 1.5,
    note: 'A small throat on eeh for the yips, each scooping up a fifth, then ooh opening to aw '
      + 'for the howl, legato with a glide so the rise and the fall are one breath.',
    jmjr4: { voice: 'small', line: 'eeh eeh eeh ooh ooh ooh', morphTo: 'AW', morph: 100, morphTime: 0.5,
      bend: -7, bendTime: 0.07, tract: 1.15, breath: 0.35, unison: 1,
      amp: { attack: 0.01, decay: 0.2, sustain: 1, release: 0.25 } },
    mode: 'legato', portamento: 0.22,
    vibrato: { depth: 0.35, rate: 6, delay: 0.35 } },
  jmjrBreathPluck: { label: 'Breath Pluck', category: 'Pluck', synth: 'JMJR-4', dur: 1.5,
    note: 'A plucked wah that settles into breath: decay and sustain doing the work.',
    jmjr4: { voice: 'chorister', line: 'wah', morphTo: 'UH',
      morph: 45, morphTime: 0.25, unison: 2, spread: 16, breath: 0.7,
      amp: { attack: 0.008, decay: 0.35, sustain: 0.45, release: 0.6 } },
    vibrato: { depth: 0.17, rate: 5.0, delay: 0.15 } },
  jmjrDooWopLine: { label: 'Doo Wop Line', category: 'Lead', synth: 'JMJR-4', dur: 1.5,
    note: 'One syllable per step, so a riff spells itself out as it plays: doo doo daa dee, then round again.',
    jmjr4: { voice: 'announcer', line: 'doo doo daa dee', morphTo: 'AH',
      unison: 2, spread: 14, tilt: 3,
      amp: { attack: 0.015, decay: 0.3, sustain: 0.8, release: 0.22 } },
    vibrato: { depth: 0.17, rate: 5.0, delay: 0.15 } },
  jmjrAiueo: { label: 'Aiueo', category: 'Lead', synth: 'JMJR-4', dur: 1.5,
    note: 'The five Japanese vowels in their own order, one per step: a walk through the vowel space.',
    jmjr4: { voice: 'chorister', line: 'aah eeh ooh eh oh', morphTo: 'AH',
      unison: 2, spread: 16, tilt: 2,
      amp: { attack: 0.06, decay: 0.3, sustain: 1.0, release: 0.45 } },
    vibrato: { depth: 0.21, rate: 5.0, delay: 0.25 } },
  jmjrBahWahChant: { label: 'Bah Wah Chant', category: 'Lead', synth: 'JMJR-4', dur: 1.5,
    note: 'Five steps, legato, with the tie: laa- laa is one long note that moves, and it ends on a hum.',
    jmjr4: { voice: 'chorister', line: 'bah wah laa- laa mmm', morphTo: 'AH',
      unison: 3, spread: 20, buzz: 45,
      amp: { attack: 0.04, decay: 0.35, sustain: 0.9, release: 0.5 } },
    mode: 'legato', vibrato: { depth: 0.21, rate: 5.0, delay: 0.15 } },
  jmjrHummer: { label: 'Hummer', category: 'Pad', synth: 'JMJR-4', dur: 8,
    note: 'A hum you can hold: the murmur at the buzz it wants, three of them, slow at both ends.',
    jmjr4: { voice: 'chorister', line: 'mmm', morphTo: 'OO',
      unison: 3, spread: 16, tilt: 2, buzz: 45,
      amp: { attack: 0.12, decay: 0.3, sustain: 1.0, release: 0.8 } },
    vibrato: { depth: 0.17, rate: 5.0, delay: 0.35 } },
  jmjrHumItClosed: { label: 'Hum It Closed', category: 'Pad', synth: 'JMJR-4', dur: 8,
    note: 'Sing aah, and it becomes the hum as MORPH TIME runs: the nose closing a chord.',
    jmjr4: { voice: 'chorister', line: 'aah', morphTo: 'M',
      morph: 100, morphTime: 2.2, unison: 3, spread: 18, buzz: 45,
      amp: { attack: 0.2, decay: 0.3, sustain: 1.0, release: 1.2 } },
    vibrato: { depth: 0.14, rate: 5.0, delay: 0.15 } },
  jmjrKazooLead: { label: 'Kazoo Lead', category: 'Lead', synth: 'JMJR-4', dur: 1.5,
    note: 'Buzz all the way up on a throat that is already nasal: a comb through the nose, legato, with a small scoop.',
    jmjr4: { voice: 'nasal', line: 'daa', morphTo: 'AH',
      bend: -0.5, bendTime: 0.1, unison: 1, nasal: 85, buzz: 100, resonance: 72,
      amp: { attack: 0.01, decay: 0.2, sustain: 0.95, release: 0.12 } },
    mode: 'legato', vibrato: { depth: 0.31, rate: 5.0, delay: 0.1 } },

  // ---- JMJR-4, speaking ----
  // A spoken preset carries its phrase COMPILED (`phraseIr`), so a song plays it with no
  // dictionary and no server; the desk recompiles the block whenever the text or a pot
  // moves. Generated once from the text by the same compiler the desk runs.
  jmjrAnnouncer: { label: 'Announcer', category: 'FX', synth: 'JMJR-4', dur: 2,
    note: 'The announcer reading a line: one key says the whole phrase at its own pitch, every key the same. FOLLOWS is FIXED, so the keyboard is a trigger.',
    jmjr4: { mode: 'speak', voice: 'announcer', phrase: 'one hero renders at a time', ending: 'fall', perKey: 'phrase', pitchFollows: 'fixed',
      phraseIr: {"source":{"phrase":"one hero renders at a time","voice":"announcer","speed":1,"pitchHz":118,"range":1,"step":0,"ending":"fall","tract":1,"press":0.5,"tilt":0,"breath":0.35,"flutter":0,"sibilance":100,"buzz":40,"resonance":50},"ir":{"schema":"robot-voice-ir/1","sample_rate":44100,"samples":95644,"total_seconds":2.1688,"seed":7,"formants":{"t":[0.03,0.105,0.197,0.2535,0.262,0.332,0.382,0.397,0.499,0.5755,0.5825,0.659,0.6599,0.72875,0.737,0.827,0.8355,0.912,1.004,1.0605,1.079,1.099,1.147,1.179,1.2445,1.2695,1.3395,1.3995,1.4311,1.4511,1.5111,1.58252,1.58728,1.6387,1.6987,1.7387,1.82643,1.98803,2.0528,2.1178,2.1488],"f1":[320,600,600,320,320,420,420,420,420,420,420,450,450,350,350,420,420,550,550,320,320,200,200,490,490,200,200,650,650,200,200,500,500,200,200,700,700,350,350,320,320],"f2":[800,1200,1200,1250,1250,1900,1900,1900,1900,1150,1150,950,950,800,800,1150,1150,1700,1700,1250,1250,1800,1800,1350,1350,1800,1800,1650,1650,1800,1800,1400,1400,1800,1800,1200,1200,2100,2100,1150,1150],"f3":[2300,2400,2400,2200,2200,2600,2600,2600,2600,1600,1600,2400,2400,2300,2300,1600,1600,2500,2500,2200,2200,2600,2600,1690,1690,2600,2600,2450,2450,2600,2600,2500,2500,2600,2600,2500,2500,2700,2700,2050,2050]},"voicing":{"t":[0,0.012,0.045,0.072,0.207,0.234,0.277,0.307,0.322,0.382,0.394,0.529,0.556,0.599,0.626,0.752,0.782,0.809,0.852,0.879,1.014,1.041,1.084,1.099,1.159,1.167,1.179,1.2545,1.2695,1.2795,1.3295,1.3395,1.3545,1.3815,1.4361,1.4511,1.5311,1.5461,1.5731,1.5937,1.6237,1.6387,1.7187,1.7687,1.7807,2.0628,2.0898,2.1538,2.1688],"v":[0,0.6,0.6,1,1,0.22,0.22,0.55,0,0.3,1,1,0.6,0.6,1,1,0.55,0.6,0.6,1,1,0.22,0.22,0,0,0,1,1,0,0.35,0.35,0,0.55,1,1,0,0,0.55,1,1,0.55,0,0,0,1,1,0.22,0.22,0]},"aspiration":{"t":[0,0.02,0.04,0.08,0.202,0.242,0.272,0.292,0.322,0.327,0.382,0.402,0.524,0.564,0.594,0.634,0.747,0.767,0.797,0.817,0.847,0.887,1.009,1.049,1.079,1.099,1.147,1.15,1.167,1.187,1.2495,1.2695,1.3395,1.3395,1.3695,1.3895,1.4311,1.4511,1.5111,1.5141,1.5311,1.5311,1.5611,1.5811,1.5887,1.6087,1.6387,1.6387,1.6987,1.7017,1.7687,1.7887,2.0578,2.0978,2.1488,2.1688],"v":[0,0,0,0,0,0,0,0,0,0.7,0.2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.32,0.09,0,0,0,0,0,0,0,0,0,0,0.32,0,0,0,0,0,0,0,0,0,0.32,0.09,0,0,0,0,0]},"voicebar":{"t":[0,1.099,1.103,1.147,1.15,2.1688],"v":[0,0,0.3,0.3,0,0]},"nasal_zero":{"t":[0,0.182,0.227,0.287,0.297,0.989,1.034,1.094,1.104,2.0378,2.0828,2.1638,2.1688],"v":[250,250,1550,1550,250,250,1550,1550,250,250,750,750,250],"active":true},"pitch":[[0,118],[0.03,118],[0.06,124.65155],[0.12,138.38569],[0.125,139.51489],[0.25,120.44638],[0.255,116.04038],[0.35,115.09751],[0.355,115.57505],[0.445,131.53658],[0.45,131.45849],[0.57,116.67593],[0.575,112.89486],[0.835,110.40201],[0.84,110.86007],[0.93,126.17043],[0.935,126.09553],[1.055,111.91604],[1.06,108.28921],[1.685,102.63009],[1.69,102.697],[1.86,116.57816],[1.865,116.60902],[1.895,114.67831],[1.9,114.03716],[2.075,82.64064],[2.08,82.35478],[2.17,82.35478]],"extras":[{"start":50582,"samples":529,"spec":[[4000,1.5,1]],"shape":["ad",0.006,0.012],"ratio":0.075,"voiced":false},{"start":55984,"samples":3087,"spec":[[7200,4,1],[5400,5,0.45]],"shape":["asr",0.03,0.04],"ratio":0.13,"voiced":true},{"start":66639,"samples":882,"spec":[[4000,1.5,1]],"shape":["ad",0.006,0.02],"ratio":0.055,"voiced":false},{"start":74912,"samples":882,"spec":[[4000,1.5,1]],"shape":["ad",0.006,0.02],"ratio":0.187,"voiced":false}],"controls":{"src":"glottal","oq":0.5,"fscale":1,"asp":0.35,"jitter":0,"flutter":0,"tilt_db":0,"chip":false,"tract":"hybrid","gains":[1,1,0.35,0.15],"bw":[105,147,210,262.5],"q":7,"f5":[4500,300],"tilt":null,"post_fir":null,"f4":3400,"nasal_pole":[250,2600],"nasal_zero_bw":90,"hybrid_high_gain":1.2589,"nasal_buzz":0.4,"nasal_high":0.15,"nasal_high_max":1.4,"nasal_buzz_db":22,"nasal_buzz_hz":400,"hybrid_f5_gain":0.1,"hybrid_dep_exp":0.187,"asp_level":0.35,"bar_level":0.4,"no_vowel_ref":0.0707,"tract_ref_gain":0.133,"radiation":0.97,"block":64,"sibilance":1,"seed":7},"levels":{"vref":0.07314,"asp_gain":0.86084,"bar_gain":0.29521,"extra_gains":[0.0248,0.07648,0.02108,0.07168],"derived":"browser tables"}},"words":[{"schema":"robot-voice-ir/1","sample_rate":44100,"samples":16660,"total_seconds":0.3778,"seed":7,"formants":{"t":[0.03,0.105,0.2618,0.3268,0.3578],"f1":[320,600,600,320,320],"f2":[800,1200,1200,1250,1250],"f3":[2300,2400,2400,2200,2200]},"voicing":{"t":[0,0.012,0.045,0.072,0.2718,0.2988,0.3628,0.3778],"v":[0,0.6,0.6,1,1,0.22,0.22,0]},"aspiration":{"t":[0,0.02,0.04,0.08,0.2668,0.3068,0.3578,0.3778],"v":[0,0,0,0,0,0,0,0]},"voicebar":{"t":[0,0.3778],"v":[0,0]},"nasal_zero":{"t":[0,0.2468,0.2918,0.3728,0.3778],"v":[250,250,1550,1550,250],"active":true},"pitch":[[0,118],[0.03,118],[0.06,123.19247],[0.105,126.97124],[0.11,126.87598],[0.15,123.80671],[0.155,122.23485],[0.285,84.03521],[0.29,83.79778],[0.38,83.79778]],"extras":[],"controls":{"src":"glottal","oq":0.5,"fscale":1,"asp":0.35,"jitter":0,"flutter":0,"tilt_db":0,"chip":false,"tract":"hybrid","gains":[1,1,0.35,0.15],"bw":[105,147,210,262.5],"q":7,"f5":[4500,300],"tilt":null,"post_fir":null,"f4":3400,"nasal_pole":[250,2600],"nasal_zero_bw":90,"hybrid_high_gain":1.2589,"nasal_buzz":0.4,"nasal_high":0.15,"nasal_high_max":1.4,"nasal_buzz_db":22,"nasal_buzz_hz":400,"hybrid_f5_gain":0.1,"hybrid_dep_exp":0.187,"asp_level":0.35,"bar_level":0.4,"no_vowel_ref":0.0707,"tract_ref_gain":0.133,"radiation":0.97,"block":64,"sibilance":1,"seed":7},"levels":{"vref":0.06915,"asp_gain":0.44001,"bar_gain":0.27911,"extra_gains":[],"derived":"browser tables"}},{"schema":"robot-voice-ir/1","sample_rate":44100,"samples":22323,"total_seconds":0.5062,"seed":7,"formants":{"t":[0.01,0.06,0.075,0.177,0.2535,0.2605,0.337,0.35626,0.45265,0.4862],"f1":[420,420,420,420,420,420,450,450,350,350],"f2":[1900,1900,1900,1900,1150,1150,950,950,800,800],"f3":[2600,2600,2600,2600,1600,1600,2400,2400,2300,2300]},"voicing":{"t":[0,0,0.06,0.072,0.207,0.234,0.277,0.304,0.4912,0.5062],"v":[0,0,0.3,1,1,0.6,0.6,1,1,0]},"aspiration":{"t":[0,0.005,0.06,0.08,0.202,0.242,0.272,0.312,0.4862,0.5062],"v":[0,0.7,0.2,0,0,0,0,0,0,0]},"voicebar":{"t":[0,0.5062],"v":[0,0]},"nasal_zero":{"t":[0,0.5062],"v":[250,250],"active":false},"pitch":[[0,118],[0.03,118],[0.06,124.65155],[0.12,135.89679],[0.125,136.79863],[0.25,113.71929],[0.255,109.3938],[0.325,106.45995],[0.33,105.73642],[0.505,78.91372],[0.51,78.87573]],"extras":[],"controls":{"src":"glottal","oq":0.5,"fscale":1,"asp":0.35,"jitter":0,"flutter":0,"tilt_db":0,"chip":false,"tract":"hybrid","gains":[1,1,0.35,0.15],"bw":[105,147,210,262.5],"q":7,"f5":[4500,300],"tilt":null,"post_fir":null,"f4":3400,"nasal_pole":[250,2600],"nasal_zero_bw":90,"hybrid_high_gain":1.2589,"nasal_buzz":0.4,"nasal_high":0.15,"nasal_high_max":1.4,"nasal_buzz_db":22,"nasal_buzz_hz":400,"hybrid_f5_gain":0.1,"hybrid_dep_exp":0.187,"asp_level":0.35,"bar_level":0.4,"no_vowel_ref":0.0707,"tract_ref_gain":0.133,"radiation":0.97,"block":64,"sibilance":1,"seed":7},"levels":{"vref":0.07196,"asp_gain":0.53937,"bar_gain":0.29045,"extra_gains":[],"derived":"browser tables"}},{"schema":"robot-voice-ir/1","sample_rate":44100,"samples":26799,"total_seconds":0.6077,"seed":7,"formants":{"t":[0.02,0.0385,0.115,0.207,0.2635,0.282,0.302,0.35,0.382,0.4917,0.5167,0.6077],"f1":[420,420,550,550,320,320,200,200,490,490,200,200],"f2":[1150,1150,1700,1700,1250,1250,1800,1800,1350,1350,1800,1800],"f3":[1600,1600,2500,2500,2200,2200,2600,2600,1690,1690,2600,2600]},"voicing":{"t":[0,0.012,0.055,0.082,0.217,0.244,0.287,0.302,0.362,0.37,0.382,0.5017,0.5167,0.5267,0.5977,0.6077,0.6077],"v":[0,0.6,0.6,1,1,0.22,0.22,0,0,0,1,1,0,0.35,0.35,0,0]},"aspiration":{"t":[0,0.02,0.05,0.09,0.212,0.252,0.282,0.302,0.35,0.353,0.37,0.39,0.4967,0.5167,0.6077,0.6077],"v":[0,0,0,0,0,0,0,0,0,0.32,0.09,0,0,0,0,0]},"voicebar":{"t":[0,0.302,0.306,0.35,0.353,0.6077],"v":[0,0,0.3,0.3,0,0]},"nasal_zero":{"t":[0,0.192,0.237,0.297,0.307,0.6077],"v":[250,250,1550,1550,250,250],"active":true},"pitch":[[0,118],[0.04,118],[0.07,124.65155],[0.13,135.90034],[0.135,136.80249],[0.26,113.72868],[0.265,109.40307],[0.36,105.44462],[0.365,104.76981],[0.515,79.00785],[0.52,78.92198],[0.61,78.92198]],"extras":[{"start":15435,"samples":529,"spec":[[4000,1.5,1]],"shape":["ad",0.006,0.012],"ratio":0.075,"voiced":false},{"start":22786,"samples":4013,"spec":[[7200,4,1],[5400,5,0.45]],"shape":["asr",0.03,0.04],"ratio":0.13,"voiced":true}],"controls":{"src":"glottal","oq":0.5,"fscale":1,"asp":0.35,"jitter":0,"flutter":0,"tilt_db":0,"chip":false,"tract":"hybrid","gains":[1,1,0.35,0.15],"bw":[105,147,210,262.5],"q":7,"f5":[4500,300],"tilt":null,"post_fir":null,"f4":3400,"nasal_pole":[250,2600],"nasal_zero_bw":90,"hybrid_high_gain":1.2589,"nasal_buzz":0.4,"nasal_high":0.15,"nasal_high_max":1.4,"nasal_buzz_db":22,"nasal_buzz_hz":400,"hybrid_f5_gain":0.1,"hybrid_dep_exp":0.187,"asp_level":0.35,"bar_level":0.4,"no_vowel_ref":0.0707,"tract_ref_gain":0.133,"radiation":0.97,"block":64,"sibilance":1,"seed":7},"levels":{"vref":0.07058,"asp_gain":2.00196,"bar_gain":0.28486,"extra_gains":[0.02393,0.0738],"derived":"browser tables"}},{"schema":"robot-voice-ir/1","sample_rate":44100,"samples":9624,"total_seconds":0.21824,"seed":7,"formants":{"t":[0.02,0.09424,0.11424,0.19824],"f1":[650,650,200,200],"f2":[1650,1650,1800,1800],"f3":[2450,2450,2600,2600]},"voicing":{"t":[0,0.012,0.09924,0.11424,0.21824,0.21824],"v":[0,1,1,0,0,0]},"aspiration":{"t":[0,0.02,0.09424,0.11424,0.19824,0.20124,0.21824,0.21824],"v":[0,0,0,0,0,0.32,0,0]},"voicebar":{"t":[0,0.21824],"v":[0,0]},"nasal_zero":{"t":[0,0.21824],"v":[250,250],"active":false},"pitch":[[0,118],[0.11,79.94634],[0.115,78.9354],[0.22,78.9354]],"extras":[{"start":8742,"samples":882,"spec":[[4000,1.5,1]],"shape":["ad",0.006,0.02],"ratio":0.055,"voiced":false}],"controls":{"src":"glottal","oq":0.5,"fscale":1,"asp":0.35,"jitter":0,"flutter":0,"tilt_db":0,"chip":false,"tract":"hybrid","gains":[1,1,0.35,0.15],"bw":[105,147,210,262.5],"q":7,"f5":[4500,300],"tilt":null,"post_fir":null,"f4":3400,"nasal_pole":[250,2600],"nasal_zero_bw":90,"hybrid_high_gain":1.2589,"nasal_buzz":0.4,"nasal_high":0.15,"nasal_high_max":1.4,"nasal_buzz_db":22,"nasal_buzz_hz":400,"hybrid_f5_gain":0.1,"hybrid_dep_exp":0.187,"asp_level":0.35,"bar_level":0.4,"no_vowel_ref":0.0707,"tract_ref_gain":0.133,"radiation":0.97,"block":64,"sibilance":1,"seed":7},"levels":{"vref":0.0831,"asp_gain":2.11131,"bar_gain":0.33538,"extra_gains":[0.02395],"derived":"browser tables"}},{"schema":"robot-voice-ir/1","sample_rate":44100,"samples":2938,"total_seconds":0.06664,"seed":7,"formants":{"t":[0.02,0.04664],"f1":[500,500],"f2":[1400,1400],"f3":[2500,2500]},"voicing":{"t":[0,0.012,0.05164,0.06664],"v":[0,1,1,0]},"aspiration":{"t":[0,0.02,0.04664,0.06664],"v":[0,0,0,0]},"voicebar":{"t":[0,0.06664],"v":[0,0]},"nasal_zero":{"t":[0,0.06664],"v":[250,250],"active":false},"pitch":[[0,118],[0.065,79.54313],[0.07,79.28394]],"extras":[],"controls":{"src":"glottal","oq":0.5,"fscale":1,"asp":0.35,"jitter":0,"flutter":0,"tilt_db":0,"chip":false,"tract":"hybrid","gains":[1,1,0.35,0.15],"bw":[105,147,210,262.5],"q":7,"f5":[4500,300],"tilt":null,"post_fir":null,"f4":3400,"nasal_pole":[250,2600],"nasal_zero_bw":90,"hybrid_high_gain":1.2589,"nasal_buzz":0.4,"nasal_high":0.15,"nasal_high_max":1.4,"nasal_buzz_db":22,"nasal_buzz_hz":400,"hybrid_f5_gain":0.1,"hybrid_dep_exp":0.187,"asp_level":0.35,"bar_level":0.4,"no_vowel_ref":0.0707,"tract_ref_gain":0.133,"radiation":0.97,"block":64,"sibilance":1,"seed":7},"levels":{"vref":0.08241,"asp_gain":0.58228,"bar_gain":0.33263,"extra_gains":[],"derived":"browser tables"}},{"schema":"robot-voice-ir/1","sample_rate":44100,"samples":23377,"total_seconds":0.5301,"seed":7,"formants":{"t":[0,0.06,0.1,0.18773,0.34932,0.4141,0.4791,0.5101],"f1":[200,200,700,700,350,350,320,320],"f2":[1800,1800,1200,1200,2100,2100,1150,1150],"f3":[2600,2600,2500,2500,2700,2700,2050,2050]},"voicing":{"t":[0,0,0.08,0.13,0.142,0.4241,0.4511,0.5151,0.5301],"v":[0,0,0,0,1,1,0.22,0.22,0]},"aspiration":{"t":[0,0,0.06,0.063,0.13,0.15,0.4191,0.4591,0.5101,0.5301],"v":[0,0,0,0.32,0.09,0,0,0,0,0]},"voicebar":{"t":[0,0.5301],"v":[0,0]},"nasal_zero":{"t":[0,0.3991,0.4441,0.5251,0.5301],"v":[250,250,750,750,250],"active":true},"pitch":[[0,118],[0.05,118],[0.08,121.58622],[0.22,130.68379],[0.225,130.74284],[0.255,126.69877],[0.26,125.8915],[0.435,83.72237],[0.44,83.03422],[0.535,83.03422]],"extras":[{"start":2646,"samples":882,"spec":[[4000,1.5,1]],"shape":["ad",0.006,0.02],"ratio":0.187,"voiced":false}],"controls":{"src":"glottal","oq":0.5,"fscale":1,"asp":0.35,"jitter":0,"flutter":0,"tilt_db":0,"chip":false,"tract":"hybrid","gains":[1,1,0.35,0.15],"bw":[105,147,210,262.5],"q":7,"f5":[4500,300],"tilt":null,"post_fir":null,"f4":3400,"nasal_pole":[250,2600],"nasal_zero_bw":90,"hybrid_high_gain":1.2589,"nasal_buzz":0.4,"nasal_high":0.15,"nasal_high_max":1.4,"nasal_buzz_db":22,"nasal_buzz_hz":400,"hybrid_f5_gain":0.1,"hybrid_dep_exp":0.187,"asp_level":0.35,"bar_level":0.4,"no_vowel_ref":0.0707,"tract_ref_gain":0.133,"radiation":0.97,"block":64,"sibilance":1,"seed":7},"levels":{"vref":0.07641,"asp_gain":1.94144,"bar_gain":0.3084,"extra_gains":[0.07488],"derived":"browser tables"}}]} } },
  jmjrEggshellSays: { label: 'Eggshell Says', category: 'FX', synth: 'JMJR-4', dur: 2,
    note: 'The villain, gloating. FOLLOWS is KEY: play a melody and the line follows it.',
    jmjr4: { mode: 'speak', voice: 'eggshell', phrase: 'nobody plays', speed: 0.9, ending: 'fall', perKey: 'phrase', pitchFollows: 'key',
      phraseIr: {"source":{"phrase":"nobody plays","voice":"eggshell","speed":0.9,"pitchHz":118,"range":1,"step":0,"ending":"fall","tract":0.88,"press":0.42,"tilt":2,"breath":0.35,"flutter":0,"sibilance":100,"buzz":40,"resonance":50},"ir":{"schema":"robot-voice-ir/1","sample_rate":44100,"samples":73511,"total_seconds":1.66692,"seed":7,"formants":{"t":[0.02,0.04861,0.11338,0.18043,0.3185,0.3752,0.3952,0.45896,0.49096,0.6252,0.6452,0.70896,0.74096,0.8652,0.93308,1.01409,1.05409,1.0827,1.16747,1.25134,1.44463,1.52702,1.55202,1.66692],"f1":[320,320,450,450,350,350,200,200,750,750,200,200,300,300,200,200,360,360,500,500,350,350,200,200],"f2":[1250,1250,950,950,800,800,700,700,1200,1200,1800,1800,2200,2200,700,700,1100,1100,1900,1900,2200,2200,1800,1800],"f3":[2200,2200,2400,2400,2300,2300,2300,2300,2500,2500,2600,2600,2900,2900,2300,2300,2600,2600,2600,2600,2800,2800,2600,2600]},"voicing":{"t":[0,0.012,0.07338,0.10038,0.3802,0.3952,0.47096,0.47896,0.49096,0.6302,0.6452,0.72096,0.72896,0.74096,0.8802,0.91414,0.93308,1.03409,1.04609,1.10747,1.13447,1.53702,1.55202,1.56202,1.65692,1.66692,1.66692],"v":[0,0.22,0.22,1,1,0,0,0,1,1,0,0,0,1,1,0.55,0,0,0.6,0.6,1,1,0,0.35,0.35,0,0]},"aspiration":{"t":[0,0.02,0.06838,0.10838,0.3752,0.3952,0.45896,0.46196,0.47896,0.49896,0.6252,0.6452,0.70896,0.71196,0.72896,0.74896,0.8752,0.8952,0.93308,0.93308,1.01409,1.01709,1.03409,1.05409,1.10247,1.14247,1.53202,1.55202,1.66692,1.66692],"v":[0,0,0,0,0,0,0,0.32,0.09,0,0,0,0,0.32,0.09,0,0,0,0,0,0,0.32,0,0,0,0,0,0,0,0]},"voicebar":{"t":[0,0.3952,0.3992,0.45896,0.46196,0.6452,0.6492,0.70896,0.71196,1.66692],"v":[0,0,0.3,0.3,0,0,0.3,0.3,0,0]},"nasal_zero":{"t":[0,0.005,0.08338,0.12838,1.66692],"v":[250,1550,1550,250,250],"active":true},"pitch":[[0,118],[0.055,118],[0.06,118.21658],[0.085,121.61785],[0.09,122.27856],[0.21,137.48467],[0.215,137.20356],[0.425,115.85445],[0.43,111.80511],[0.44,111.62875],[0.445,111.80209],[0.54,116.36997],[0.545,116.149],[0.675,108.82091],[0.68,107.47866],[0.69,107.30913],[0.695,107.47576],[0.79,111.86689],[0.795,111.65447],[0.925,104.60994],[0.93,103.31963],[1.09,100.74272],[1.095,100.84528],[1.29,112.43013],[1.295,112.65504],[1.37,108.02665],[1.375,107.10865],[1.55,69.33904],[1.555,69.16511],[1.67,69.16511]],"extras":[{"start":20240,"samples":529,"spec":[[900,1.5,1]],"shape":["ad",0.006,0.012],"ratio":0.09,"voiced":false},{"start":31265,"samples":529,"spec":[[4000,1.5,1]],"shape":["ad",0.006,0.012],"ratio":0.09,"voiced":false},{"start":44721,"samples":882,"spec":[[900,1.5,1]],"shape":["ad",0.006,0.02],"ratio":0.2244,"voiced":false},{"start":68444,"samples":5067,"spec":[[7200,4,1],[5400,5,0.45]],"shape":["asr",0.03,0.04],"ratio":0.13,"voiced":true}],"controls":{"src":"glottal","oq":0.42,"fscale":0.88,"asp":0.35,"jitter":0,"flutter":0,"tilt_db":2,"chip":false,"tract":"hybrid","gains":[1,1,0.35,0.15],"bw":[105,147,210,262.5],"q":7,"f5":[4500,300],"tilt":null,"post_fir":null,"f4":3400,"nasal_pole":[250,2600],"nasal_zero_bw":90,"hybrid_high_gain":1.2589,"nasal_buzz":0.4,"nasal_high":0.15,"nasal_high_max":1.4,"nasal_buzz_db":22,"nasal_buzz_hz":400,"hybrid_f5_gain":0.1,"hybrid_dep_exp":0.187,"asp_level":0.35,"bar_level":0.4,"no_vowel_ref":0.0707,"tract_ref_gain":0.133,"radiation":0.97,"block":64,"sibilance":1,"seed":7},"levels":{"vref":0.07724,"asp_gain":2.47165,"bar_gain":0.31175,"extra_gains":[0.06319,0.03143,0.16114,0.08077],"derived":"browser tables"}},"words":[{"schema":"robot-voice-ir/1","sample_rate":44100,"samples":42552,"total_seconds":0.9649,"seed":7,"formants":{"t":[0.02,0.04861,0.11338,0.18043,0.3185,0.3752,0.3952,0.45896,0.49096,0.6252,0.6452,0.70896,0.74096,0.9449],"f1":[320,320,450,450,350,350,200,200,750,750,200,200,300,300],"f2":[1250,1250,950,950,800,800,700,700,1200,1200,1800,1800,2200,2200],"f3":[2200,2200,2400,2400,2300,2300,2300,2300,2500,2500,2600,2600,2900,2900]},"voicing":{"t":[0,0.012,0.07338,0.10038,0.3802,0.3952,0.47096,0.47896,0.49096,0.6302,0.6452,0.72096,0.72896,0.74096,0.9499,0.9649],"v":[0,0.22,0.22,1,1,0,0,0,1,1,0,0,0,1,1,0]},"aspiration":{"t":[0,0.02,0.06838,0.10838,0.3752,0.3952,0.45896,0.46196,0.47896,0.49896,0.6252,0.6452,0.70896,0.71196,0.72896,0.74896,0.9449,0.9649],"v":[0,0,0,0,0,0,0,0.32,0.09,0,0,0,0,0.32,0.09,0,0,0]},"voicebar":{"t":[0,0.3952,0.3992,0.45896,0.46196,0.6452,0.6492,0.70896,0.71196,0.9649],"v":[0,0,0.3,0.3,0,0,0.3,0.3,0,0]},"nasal_zero":{"t":[0,0.005,0.08338,0.12838,0.9649],"v":[250,1550,1550,250,250],"active":true},"pitch":[[0,118],[0.055,118],[0.06,118.21658],[0.085,121.61785],[0.09,122.25766],[0.21,135.72798],[0.215,135.37887],[0.425,111.80328],[0.43,107.8385],[0.44,107.55461],[0.445,107.66469],[0.54,110.94345],[0.545,110.67426],[0.675,102.27596],[0.68,100.96105],[0.69,100.69527],[0.695,100.74678],[0.78,102.37981],[0.785,102.45676],[0.815,97.25668],[0.82,96.31515],[0.96,68.33912],[0.965,67.53807]],"extras":[{"start":20240,"samples":529,"spec":[[900,1.5,1]],"shape":["ad",0.006,0.012],"ratio":0.09,"voiced":false},{"start":31265,"samples":529,"spec":[[4000,1.5,1]],"shape":["ad",0.006,0.012],"ratio":0.09,"voiced":false}],"controls":{"src":"glottal","oq":0.42,"fscale":0.88,"asp":0.35,"jitter":0,"flutter":0,"tilt_db":2,"chip":false,"tract":"hybrid","gains":[1,1,0.35,0.15],"bw":[105,147,210,262.5],"q":7,"f5":[4500,300],"tilt":null,"post_fir":null,"f4":3400,"nasal_pole":[250,2600],"nasal_zero_bw":90,"hybrid_high_gain":1.2589,"nasal_buzz":0.4,"nasal_high":0.15,"nasal_high_max":1.4,"nasal_buzz_db":22,"nasal_buzz_hz":400,"hybrid_f5_gain":0.1,"hybrid_dep_exp":0.187,"asp_level":0.35,"bar_level":0.4,"no_vowel_ref":0.0707,"tract_ref_gain":0.133,"radiation":0.97,"block":64,"sibilance":1,"seed":7},"levels":{"vref":0.08378,"asp_gain":2.80483,"bar_gain":0.33815,"extra_gains":[0.06854,0.03409],"derived":"browser tables"}},{"schema":"robot-voice-ir/1","sample_rate":44100,"samples":32362,"total_seconds":0.73384,"seed":7,"formants":{"t":[0,0.08101,0.12101,0.14962,0.23439,0.31826,0.51155,0.59394,0.61894,0.73384],"f1":[200,200,360,360,500,500,350,350,200,200],"f2":[700,700,1100,1100,1900,1900,2200,2200,1800,1800],"f3":[2300,2300,2600,2600,2600,2600,2800,2800,2600,2600]},"voicing":{"t":[0,0,0.10101,0.11301,0.17439,0.20139,0.60394,0.61894,0.62894,0.72384,0.73384,0.73384],"v":[0,0,0,0.6,0.6,1,1,0,0.35,0.35,0,0]},"aspiration":{"t":[0,0,0.08101,0.08401,0.10101,0.12101,0.16939,0.20939,0.59894,0.61894,0.73384,0.73384],"v":[0,0,0,0.32,0,0,0,0,0,0,0,0]},"voicebar":{"t":[0,0.73384],"v":[0,0]},"nasal_zero":{"t":[0,0.73384],"v":[250,250],"active":false},"pitch":[[0,118],[0.155,118],[0.16,118.06142],[0.185,120.62309],[0.19,121.10257],[0.36,127.88904],[0.365,127.44556],[0.435,118.6657],[0.44,117.82137],[0.615,70.3706],[0.62,69.70221],[0.735,69.70221]],"extras":[{"start":3572,"samples":882,"spec":[[900,1.5,1]],"shape":["ad",0.006,0.02],"ratio":0.2244,"voiced":false},{"start":27295,"samples":5067,"spec":[[7200,4,1],[5400,5,0.45]],"shape":["asr",0.03,0.04],"ratio":0.13,"voiced":true}],"controls":{"src":"glottal","oq":0.42,"fscale":0.88,"asp":0.35,"jitter":0,"flutter":0,"tilt_db":2,"chip":false,"tract":"hybrid","gains":[1,1,0.35,0.15],"bw":[105,147,210,262.5],"q":7,"f5":[4500,300],"tilt":null,"post_fir":null,"f4":3400,"nasal_pole":[250,2600],"nasal_zero_bw":90,"hybrid_high_gain":1.2589,"nasal_buzz":0.4,"nasal_high":0.15,"nasal_high_max":1.4,"nasal_buzz_db":22,"nasal_buzz_hz":400,"hybrid_f5_gain":0.1,"hybrid_dep_exp":0.187,"asp_level":0.35,"bar_level":0.4,"no_vowel_ref":0.0707,"tract_ref_gain":0.133,"radiation":0.97,"block":64,"sibilance":1,"seed":7},"levels":{"vref":0.06416,"asp_gain":1.89581,"bar_gain":0.25895,"extra_gains":[0.13385,0.06709],"derived":"browser tables"}}]} } },
  jmjrCabinetVoice: { label: 'Cabinet Voice', category: 'FX', synth: 'JMJR-4', dur: 2,
    note: 'The arcade cabinet, flat and monotone. Six bits at 9 kHz for the speaker grille.',
    jmjr4: { mode: 'speak', voice: 'robot', phrase: 'insert coin to continue', bits: 6, rate: 9, ending: 'flat', perKey: 'phrase', pitchFollows: 'fixed',
      phraseIr: {"source":{"phrase":"insert coin to continue","voice":"robot","speed":1,"pitchHz":118,"range":1,"step":0,"ending":"flat","tract":1,"press":0.5,"tilt":0,"breath":0.35,"flutter":0,"sibilance":100,"buzz":40,"resonance":50},"ir":{"schema":"robot-voice-ir/1","sample_rate":44100,"samples":85814,"total_seconds":1.9459,"seed":7,"formants":{"t":[0.02,0.113,0.1695,0.183,0.208,0.308,0.333,0.4635,0.4835,0.5435,0.5935,0.6485,0.6935,0.75045,0.86587,0.905,0.9615,0.97,1.03,1.09,1.13,1.1616,1.2216,1.2766,1.3216,1.3361,1.3926,1.4111,1.4311,1.4911,1.5311,1.6481,1.7046,1.7116,1.7731,1.8481,1.9259],"f1":[420,420,320,320,200,200,490,490,200,200,200,200,450,450,350,350,320,320,200,200,320,320,200,200,500,500,320,320,200,200,420,420,320,320,300,320,320],"f2":[1900,1900,1250,1250,1800,1800,1350,1350,1800,1800,2200,2200,900,900,2000,2000,1250,1250,1800,1800,800,800,2200,2200,1400,1400,1250,1250,1800,1800,1900,1900,1250,1250,2200,800,800],"f3":[2600,2600,2200,2200,2600,2600,1690,1690,2600,2600,2500,2500,2400,2400,2700,2700,2200,2200,2600,2600,2300,2300,2500,2500,2500,2500,2200,2200,2600,2600,2600,2600,2200,2200,2900,2300,2300]},"voicing":{"t":[0,0.012,0.123,0.15,0.193,0.208,0.308,0.32,0.4685,0.4835,0.5635,0.5785,0.5935,0.6735,0.7335,0.7455,0.915,0.942,0.985,1.015,1.03,1.11,1.16,1.172,1.1766,1.2066,1.2216,1.3016,1.3441,1.3561,1.3562,1.3731,1.4161,1.4311,1.5111,1.5611,1.5731,1.6581,1.6851,1.7281,1.7551,1.7881,1.8151,1.9309,1.9459],"v":[0,1,1,0.22,0.22,0,0,1,1,0,0,0.55,0,0,0,1,1,0.22,0.22,0.55,0,0,0,1,1,0.55,0,0,0,1,1,0.22,0.22,0,0,0,1,1,0.22,0.22,0.6,0.6,1,1,0]},"aspiration":{"t":[0,0.02,0.118,0.158,0.188,0.208,0.308,0.328,0.4635,0.4835,0.5435,0.5465,0.5635,0.5635,0.5935,0.5935,0.6485,0.6515,0.7335,0.7535,0.91,0.95,0.98,1,1.03,1.03,1.09,1.093,1.16,1.18,1.18,1.1916,1.2216,1.2216,1.2766,1.2796,1.3441,1.3611,1.3611,1.3811,1.4111,1.4311,1.4911,1.4941,1.5611,1.5811,1.6531,1.6931,1.7231,1.7631,1.7831,1.8231,1.9259,1.9459],"v":[0,0,0,0,0,0,0,0,0,0,0,0.32,0,0,0,0,0,0.32,0.09,0,0,0,0,0,0,0,0,0.32,0.09,0,0,0,0,0,0,0.32,0.09,0,0,0,0,0,0,0.32,0.09,0,0,0,0,0,0,0,0,0]},"voicebar":{"t":[0,1.9459],"v":[0,0]},"nasal_zero":{"t":[0,0.098,0.143,0.203,0.213,0.89,0.935,0.995,1.005,1.3211,1.3661,1.4261,1.4361,1.6331,1.6781,1.7381,1.7731,1.9459],"v":[250,250,1550,1550,250,250,1550,1550,250,250,1550,1550,250,250,1550,1550,250,250],"active":true},"pitch":[[0,118],[1.95,118]],"extras":[{"start":9172,"samples":4410,"spec":[[7200,4,1],[5400,5,0.45]],"shape":["asr",0.03,0.04],"ratio":0.2,"voiced":false},{"start":23968,"samples":882,"spec":[[4000,1.5,1]],"shape":["ad",0.006,0.02],"ratio":0.0715,"voiced":false},{"start":28598,"samples":1102,"spec":[[1400,1.5,1]],"shape":["ad",0.006,0.025],"ratio":0.2431,"voiced":false},{"start":48069,"samples":882,"spec":[[4000,1.5,1]],"shape":["ad",0.006,0.02],"ratio":0.2431,"voiced":false},{"start":56298,"samples":1102,"spec":[[1610,1.5,1]],"shape":["ad",0.006,0.025],"ratio":0.2431,"voiced":false},{"start":65757,"samples":882,"spec":[[4000,1.5,1]],"shape":["ad",0.006,0.02],"ratio":0.143,"voiced":false}],"controls":{"src":"saw","oq":0.5,"fscale":1,"asp":0.35,"jitter":0,"flutter":0,"tilt_db":0,"chip":false,"tract":"hybrid","gains":[1,1,0.35,0.15],"bw":[105,147,210,262.5],"q":7,"f5":[4500,300],"tilt":null,"post_fir":null,"f4":3400,"nasal_pole":[250,2600],"nasal_zero_bw":90,"hybrid_high_gain":1.2589,"nasal_buzz":0.4,"nasal_high":0.15,"nasal_high_max":1.4,"nasal_buzz_db":22,"nasal_buzz_hz":400,"hybrid_f5_gain":0.1,"hybrid_dep_exp":0.187,"asp_level":0.35,"bar_level":0.4,"no_vowel_ref":0.0707,"tract_ref_gain":0.133,"radiation":0.97,"block":64,"sibilance":1,"seed":7},"levels":{"vref":0.07647,"asp_gain":1.50169,"bar_gain":0.30865,"extra_gains":[0.05674,0.02865,0.15005,0.09742,0.15005,0.05731],"derived":"browser tables"}},"words":[{"schema":"robot-voice-ir/1","sample_rate":44100,"samples":29004,"total_seconds":0.6577,"seed":7,"formants":{"t":[0.02,0.113,0.1695,0.183,0.208,0.308,0.333,0.5337,0.5537,0.6377],"f1":[420,420,320,320,200,200,490,490,200,200],"f2":[1900,1900,1250,1250,1800,1800,1350,1350,1800,1800],"f3":[2600,2600,2200,2200,2600,2600,1690,1690,2600,2600]},"voicing":{"t":[0,0.012,0.123,0.15,0.193,0.208,0.308,0.32,0.5387,0.5537,0.6577,0.6577],"v":[0,1,1,0.22,0.22,0,0,1,1,0,0,0]},"aspiration":{"t":[0,0.02,0.118,0.158,0.188,0.208,0.308,0.328,0.5337,0.5537,0.6377,0.6407,0.6577,0.6577],"v":[0,0,0,0,0,0,0,0,0,0,0,0.32,0,0]},"voicebar":{"t":[0,0.6577],"v":[0,0]},"nasal_zero":{"t":[0,0.098,0.143,0.203,0.213,0.6577],"v":[250,250,1550,1550,250,250],"active":true},"pitch":[[0,118],[0.66,118]],"extras":[{"start":9172,"samples":4410,"spec":[[7200,4,1],[5400,5,0.45]],"shape":["asr",0.03,0.04],"ratio":0.2,"voiced":false},{"start":28122,"samples":882,"spec":[[4000,1.5,1]],"shape":["ad",0.006,0.02],"ratio":0.0715,"voiced":false}],"controls":{"src":"saw","oq":0.5,"fscale":1,"asp":0.35,"jitter":0,"flutter":0,"tilt_db":0,"chip":false,"tract":"hybrid","gains":[1,1,0.35,0.15],"bw":[105,147,210,262.5],"q":7,"f5":[4500,300],"tilt":null,"post_fir":null,"f4":3400,"nasal_pole":[250,2600],"nasal_zero_bw":90,"hybrid_high_gain":1.2589,"nasal_buzz":0.4,"nasal_high":0.15,"nasal_high_max":1.4,"nasal_buzz_db":22,"nasal_buzz_hz":400,"hybrid_f5_gain":0.1,"hybrid_dep_exp":0.187,"asp_level":0.35,"bar_level":0.4,"no_vowel_ref":0.0707,"tract_ref_gain":0.133,"radiation":0.97,"block":64,"sibilance":1,"seed":7},"levels":{"vref":0.07678,"asp_gain":1.95086,"bar_gain":0.30989,"extra_gains":[0.05697,0.02877],"derived":"browser tables"}},{"schema":"robot-voice-ir/1","sample_rate":44100,"samples":23377,"total_seconds":0.5301,"seed":7,"formants":{"t":[0,0.055,0.1,0.18773,0.34932,0.4141,0.4791,0.5101],"f1":[200,200,450,450,350,350,320,320],"f2":[2200,2200,900,900,2000,2000,1250,1250],"f3":[2500,2500,2400,2400,2700,2700,2200,2200]},"voicing":{"t":[0,0,0.08,0.14,0.152,0.4241,0.4511,0.5151,0.5301],"v":[0,0,0,0,1,1,0.22,0.22,0]},"aspiration":{"t":[0,0,0.055,0.058,0.14,0.16,0.4191,0.4591,0.5101,0.5301],"v":[0,0,0,0.32,0.09,0,0,0,0,0]},"voicebar":{"t":[0,0.5301],"v":[0,0]},"nasal_zero":{"t":[0,0.3991,0.4441,0.5251,0.5301],"v":[250,250,1550,1550,250],"active":true},"pitch":[[0,118],[0.535,118]],"extras":[{"start":2425,"samples":1102,"spec":[[1400,1.5,1]],"shape":["ad",0.006,0.025],"ratio":0.2431,"voiced":false}],"controls":{"src":"saw","oq":0.5,"fscale":1,"asp":0.35,"jitter":0,"flutter":0,"tilt_db":0,"chip":false,"tract":"hybrid","gains":[1,1,0.35,0.15],"bw":[105,147,210,262.5],"q":7,"f5":[4500,300],"tilt":null,"post_fir":null,"f4":3400,"nasal_pole":[250,2600],"nasal_zero_bw":90,"hybrid_high_gain":1.2589,"nasal_buzz":0.4,"nasal_high":0.15,"nasal_high_max":1.4,"nasal_buzz_db":22,"nasal_buzz_hz":400,"hybrid_f5_gain":0.1,"hybrid_dep_exp":0.187,"asp_level":0.35,"bar_level":0.4,"no_vowel_ref":0.0707,"tract_ref_gain":0.133,"radiation":0.97,"block":64,"sibilance":1,"seed":7},"levels":{"vref":0.07636,"asp_gain":1.18405,"bar_gain":0.30822,"extra_gains":[0.14984],"derived":"browser tables"}},{"schema":"robot-voice-ir/1","sample_rate":44100,"samples":8565,"total_seconds":0.19424,"seed":7,"formants":{"t":[0,0.06,0.1,0.17424],"f1":[200,200,320,320],"f2":[1800,1800,800,800],"f3":[2600,2600,2300,2300]},"voicing":{"t":[0,0,0.08,0.13,0.142,0.17924,0.19424],"v":[0,0,0,0,1,1,0]},"aspiration":{"t":[0,0,0.06,0.063,0.13,0.15,0.17424,0.19424],"v":[0,0,0,0.32,0.09,0,0,0]},"voicebar":{"t":[0,0.19424],"v":[0,0]},"nasal_zero":{"t":[0,0.19424],"v":[250,250],"active":false},"pitch":[[0,118],[0.195,118]],"extras":[{"start":2646,"samples":882,"spec":[[4000,1.5,1]],"shape":["ad",0.006,0.02],"ratio":0.2431,"voiced":false}],"controls":{"src":"saw","oq":0.5,"fscale":1,"asp":0.35,"jitter":0,"flutter":0,"tilt_db":0,"chip":false,"tract":"hybrid","gains":[1,1,0.35,0.15],"bw":[105,147,210,262.5],"q":7,"f5":[4500,300],"tilt":null,"post_fir":null,"f4":3400,"nasal_pole":[250,2600],"nasal_zero_bw":90,"hybrid_high_gain":1.2589,"nasal_buzz":0.4,"nasal_high":0.15,"nasal_high_max":1.4,"nasal_buzz_db":22,"nasal_buzz_hz":400,"hybrid_f5_gain":0.1,"hybrid_dep_exp":0.187,"asp_level":0.35,"bar_level":0.4,"no_vowel_ref":0.0707,"tract_ref_gain":0.133,"radiation":0.97,"block":64,"sibilance":1,"seed":7},"levels":{"vref":0.08965,"asp_gain":2.27775,"bar_gain":0.36182,"extra_gains":[0.11421],"derived":"browser tables"}},{"schema":"robot-voice-ir/1","sample_rate":44100,"samples":31941,"total_seconds":0.7243,"seed":7,"formants":{"t":[0,0.055,0.1,0.1145,0.171,0.1895,0.2095,0.2695,0.3095,0.4265,0.483,0.49,0.5515,0.6265,0.7043],"f1":[200,200,500,500,320,320,200,200,420,420,320,320,300,320,320],"f2":[2200,2200,1400,1400,1250,1250,1800,1800,1900,1900,1250,1250,2200,800,800],"f3":[2500,2500,2500,2500,2200,2200,2600,2600,2600,2600,2200,2200,2900,2300,2300]},"voicing":{"t":[0,0,0.08,0.1225,0.1345,0.1346,0.1515,0.1945,0.2095,0.2895,0.3395,0.3515,0.4365,0.4635,0.5065,0.5335,0.5665,0.5935,0.7093,0.7243],"v":[0,0,0,0,1,1,0.22,0.22,0,0,0,1,1,0.22,0.22,0.6,0.6,1,1,0]},"aspiration":{"t":[0,0,0.055,0.058,0.1225,0.1395,0.1395,0.1595,0.1895,0.2095,0.2695,0.2725,0.3395,0.3595,0.4315,0.4715,0.5015,0.5415,0.5615,0.6015,0.7043,0.7243],"v":[0,0,0,0.32,0.09,0,0,0,0,0,0,0.32,0.09,0,0,0,0,0,0,0,0,0]},"voicebar":{"t":[0,0.7243],"v":[0,0]},"nasal_zero":{"t":[0,0.0995,0.1445,0.2045,0.2145,0.4115,0.4565,0.5165,0.5515,0.7243],"v":[250,250,1550,1550,250,250,1550,1550,250,250],"active":true},"pitch":[[0,118],[0.725,118]],"extras":[{"start":2425,"samples":1102,"spec":[[1610,1.5,1]],"shape":["ad",0.006,0.025],"ratio":0.2431,"voiced":false},{"start":11884,"samples":882,"spec":[[4000,1.5,1]],"shape":["ad",0.006,0.02],"ratio":0.143,"voiced":false}],"controls":{"src":"saw","oq":0.5,"fscale":1,"asp":0.35,"jitter":0,"flutter":0,"tilt_db":0,"chip":false,"tract":"hybrid","gains":[1,1,0.35,0.15],"bw":[105,147,210,262.5],"q":7,"f5":[4500,300],"tilt":null,"post_fir":null,"f4":3400,"nasal_pole":[250,2600],"nasal_zero_bw":90,"hybrid_high_gain":1.2589,"nasal_buzz":0.4,"nasal_high":0.15,"nasal_high_max":1.4,"nasal_buzz_db":22,"nasal_buzz_hz":400,"hybrid_f5_gain":0.1,"hybrid_dep_exp":0.187,"asp_level":0.35,"bar_level":0.4,"no_vowel_ref":0.0707,"tract_ref_gain":0.133,"radiation":0.97,"block":64,"sibilance":1,"seed":7},"levels":{"vref":0.07416,"asp_gain":1.38804,"bar_gain":0.2993,"extra_gains":[0.14551,0.05557],"derived":"browser tables"}}]} } },
  jmjrWordPerKey: { label: 'Word Per Key', category: 'FX', synth: 'JMJR-4', dur: 2,
    note: 'PER KEY is WORD: each step says the next word of the phrase at that step\'s pitch, starting again with the song. Write a four-note figure and it raps.',
    jmjr4: { mode: 'speak', voice: 'small', phrase: 'pump up the jam', speed: 1.1, ending: 'flat', perKey: 'word', pitchFollows: 'key',
      phraseIr: {"source":{"phrase":"pump up the jam","voice":"small","speed":1.1,"pitchHz":118,"range":1,"step":0,"ending":"flat","tract":1.16,"press":0.55,"tilt":-1,"breath":0.35,"flutter":0,"sibilance":100,"buzz":40,"resonance":50},"ir":{"schema":"robot-voice-ir/1","sample_rate":44100,"samples":42954,"total_seconds":0.97403,"seed":7,"formants":{"t":[0,0.04926,0.08926,0.18452,0.2368,0.25013,0.27013,0.31939,0.38391,0.38803,0.40658,0.45584,0.50182,0.54511,0.56365,0.56777,0.61229,0.63887,0.71887,0.87024,0.93069,0.95403],"f1":[200,200,600,600,320,320,200,200,500,500,200,200,200,200,500,500,200,200,650,650,320,320],"f2":[700,700,1200,1200,1150,1150,700,700,1400,1400,700,700,1600,1600,1400,1400,2000,2000,1650,1650,1150,1150],"f3":[2300,2300,2400,2400,2050,2050,2300,2300,2500,2500,2300,2300,2600,2600,2500,2500,2600,2600,2450,2450,2050,2050]},"voicing":{"t":[0,0,0.06926,0.10926,0.12126,0.19452,0.22152,0.25513,0.27013,0.33939,0.35238,0.37737,0.39158,0.40658,0.47584,0.48883,0.50182,0.51182,0.53511,0.54511,0.55711,0.57132,0.59931,0.61229,0.69887,0.70887,0.72087,0.88024,0.90724,0.95903,0.97403],"v":[0,0,0,0,1,1,0.22,0.22,0,0,0.55,1,1,0,0,0.55,0,0.35,0.35,0,1,1,0.55,0,0,0,1,1,0.22,0.22,0]},"aspiration":{"t":[0,0,0.04926,0.05226,0.10926,0.12926,0.18952,0.22952,0.25013,0.27013,0.31939,0.32239,0.33939,0.33939,0.36537,0.38537,0.38658,0.40658,0.45584,0.45884,0.47584,0.47585,0.50182,0.50182,0.54511,0.56511,0.56632,0.58632,0.61229,0.6123,0.63887,0.64187,0.70887,0.72887,0.87524,0.91524,0.95403,0.97403],"v":[0,0,0,0.32,0.09,0,0,0,0,0,0,0.32,0,0,0,0,0,0,0,0.32,0,0,0,0,0,0,0,0,0,0,0,0.32,0.09,0,0,0,0,0]},"voicebar":{"t":[0,0.61229,0.61629,0.63887,0.64187,0.97403],"v":[0,0,0.3,0.3,0,0]},"nasal_zero":{"t":[0,0.16952,0.21452,0.26513,0.27513,0.85524,0.90024,0.96903,0.97403],"v":[250,250,750,750,250,250,750,750,250],"active":true},"pitch":[[0,118],[0.975,118]],"extras":[{"start":2172,"samples":882,"spec":[[900,1.5,1]],"shape":["ad",0.006,0.02],"ratio":0.187,"voiced":false},{"start":14085,"samples":882,"spec":[[900,1.5,1]],"shape":["ad",0.006,0.02],"ratio":0.055,"voiced":false},{"start":20102,"samples":882,"spec":[[900,1.5,1]],"shape":["ad",0.006,0.02],"ratio":0.055,"voiced":false},{"start":22130,"samples":1909,"spec":[[5500,0.7,0.7],[8000,1,0.4]],"shape":["asr",0.03,0.04],"ratio":0.16,"voiced":true},{"start":28174,"samples":2646,"spec":[[3000,2,1]],"shape":["ad",0.006,0.06],"ratio":0.153,"voiced":false}],"controls":{"src":"glottal","oq":0.55,"fscale":1.16,"asp":0.35,"jitter":0,"flutter":0,"tilt_db":-1,"chip":false,"tract":"hybrid","gains":[1,1,0.35,0.15],"bw":[105,147,210,262.5],"q":7,"f5":[4500,300],"tilt":null,"post_fir":null,"f4":3400,"nasal_pole":[250,2600],"nasal_zero_bw":90,"hybrid_high_gain":1.2589,"nasal_buzz":0.4,"nasal_high":0.15,"nasal_high_max":1.4,"nasal_buzz_db":22,"nasal_buzz_hz":400,"hybrid_f5_gain":0.1,"hybrid_dep_exp":0.187,"asp_level":0.35,"bar_level":0.4,"no_vowel_ref":0.0707,"tract_ref_gain":0.133,"radiation":0.97,"block":64,"sibilance":1,"seed":7},"levels":{"vref":0.07866,"asp_gain":1.86151,"bar_gain":0.31747,"extra_gains":[0.13675,0.04022,0.04022,0.05713,0.09901],"derived":"browser tables"}},"words":[{"schema":"robot-voice-ir/1","sample_rate":44100,"samples":19159,"total_seconds":0.43446,"seed":7,"formants":{"t":[0,0.04926,0.08926,0.24063,0.30108,0.32442,0.34442,0.41446],"f1":[200,200,600,600,320,320,200,200],"f2":[700,700,1200,1200,1150,1150,700,700],"f3":[2300,2300,2400,2400,2050,2050,2300,2300]},"voicing":{"t":[0,0,0.06926,0.10926,0.12126,0.25063,0.27763,0.32942,0.34442,0.43446,0.43446],"v":[0,0,0,0,1,1,0.22,0.22,0,0,0]},"aspiration":{"t":[0,0,0.04926,0.05226,0.10926,0.12926,0.24563,0.28563,0.32442,0.34442,0.41446,0.41746,0.43446,0.43446],"v":[0,0,0,0.32,0.09,0,0,0,0,0,0,0.32,0,0]},"voicebar":{"t":[0,0.43446],"v":[0,0]},"nasal_zero":{"t":[0,0.22563,0.27063,0.33942,0.34942,0.43446],"v":[250,250,750,750,250,250],"active":true},"pitch":[[0,118],[0.435,118]],"extras":[{"start":2172,"samples":882,"spec":[[900,1.5,1]],"shape":["ad",0.006,0.02],"ratio":0.187,"voiced":false},{"start":18277,"samples":882,"spec":[[900,1.5,1]],"shape":["ad",0.006,0.02],"ratio":0.055,"voiced":false}],"controls":{"src":"glottal","oq":0.55,"fscale":1.16,"asp":0.35,"jitter":0,"flutter":0,"tilt_db":-1,"chip":false,"tract":"hybrid","gains":[1,1,0.35,0.15],"bw":[105,147,210,262.5],"q":7,"f5":[4500,300],"tilt":null,"post_fir":null,"f4":3400,"nasal_pole":[250,2600],"nasal_zero_bw":90,"hybrid_high_gain":1.2589,"nasal_buzz":0.4,"nasal_high":0.15,"nasal_high_max":1.4,"nasal_buzz_db":22,"nasal_buzz_hz":400,"hybrid_f5_gain":0.1,"hybrid_dep_exp":0.187,"asp_level":0.35,"bar_level":0.4,"no_vowel_ref":0.0707,"tract_ref_gain":0.133,"radiation":0.97,"block":64,"sibilance":1,"seed":7},"levels":{"vref":0.07666,"asp_gain":2.26525,"bar_gain":0.30941,"extra_gains":[0.13328,0.0392],"derived":"browser tables"}},{"schema":"robot-voice-ir/1","sample_rate":44100,"samples":6515,"total_seconds":0.14774,"seed":7,"formants":{"t":[0.02,0.0377,0.0577,0.12774],"f1":[500,500,200,200],"f2":[1400,1400,700,700],"f3":[2500,2500,2300,2300]},"voicing":{"t":[0,0.012,0.0427,0.0577,0.14774,0.14774],"v":[0,1,1,0,0,0]},"aspiration":{"t":[0,0.02,0.0377,0.0577,0.12774,0.13074,0.14774,0.14774],"v":[0,0,0,0,0,0.32,0,0]},"voicebar":{"t":[0,0.14774],"v":[0,0]},"nasal_zero":{"t":[0,0.14774],"v":[250,250],"active":false},"pitch":[[0,118],[0.15,118]],"extras":[{"start":5633,"samples":882,"spec":[[900,1.5,1]],"shape":["ad",0.006,0.02],"ratio":0.055,"voiced":false}],"controls":{"src":"glottal","oq":0.55,"fscale":1.16,"asp":0.35,"jitter":0,"flutter":0,"tilt_db":-1,"chip":false,"tract":"hybrid","gains":[1,1,0.35,0.15],"bw":[105,147,210,262.5],"q":7,"f5":[4500,300],"tilt":null,"post_fir":null,"f4":3400,"nasal_pole":[250,2600],"nasal_zero_bw":90,"hybrid_high_gain":1.2589,"nasal_buzz":0.4,"nasal_high":0.15,"nasal_high_max":1.4,"nasal_buzz_db":22,"nasal_buzz_hz":400,"hybrid_f5_gain":0.1,"hybrid_dep_exp":0.187,"asp_level":0.35,"bar_level":0.4,"no_vowel_ref":0.0707,"tract_ref_gain":0.133,"radiation":0.97,"block":64,"sibilance":1,"seed":7},"levels":{"vref":0.08241,"asp_gain":2.43527,"bar_gain":0.33263,"extra_gains":[0.04214],"derived":"browser tables"}},{"schema":"robot-voice-ir/1","sample_rate":44100,"samples":4453,"total_seconds":0.10099,"seed":7,"formants":{"t":[0,0.04329,0.06829,0.08099],"f1":[200,200,500,500],"f2":[1600,1600,1400,1400],"f3":[2600,2600,2500,2500]},"voicing":{"t":[0,0,0.01,0.03329,0.04329,0.05529,0.08599,0.10099],"v":[0,0,0.35,0.35,0,1,1,0]},"aspiration":{"t":[0,0,0.04329,0.06329,0.08099,0.10099],"v":[0,0,0,0,0,0]},"voicebar":{"t":[0,0.10099],"v":[0,0]},"nasal_zero":{"t":[0,0.10099],"v":[250,250],"active":false},"pitch":[[0,118],[0.105,118]],"extras":[{"start":0,"samples":1909,"spec":[[5500,0.7,0.7],[8000,1,0.4]],"shape":["asr",0.03,0.04],"ratio":0.16,"voiced":true}],"controls":{"src":"glottal","oq":0.55,"fscale":1.16,"asp":0.35,"jitter":0,"flutter":0,"tilt_db":-1,"chip":false,"tract":"hybrid","gains":[1,1,0.35,0.15],"bw":[105,147,210,262.5],"q":7,"f5":[4500,300],"tilt":null,"post_fir":null,"f4":3400,"nasal_pole":[250,2600],"nasal_zero_bw":90,"hybrid_high_gain":1.2589,"nasal_buzz":0.4,"nasal_high":0.15,"nasal_high_max":1.4,"nasal_buzz_db":22,"nasal_buzz_hz":400,"hybrid_f5_gain":0.1,"hybrid_dep_exp":0.187,"asp_level":0.35,"bar_level":0.4,"no_vowel_ref":0.0707,"tract_ref_gain":0.133,"radiation":0.97,"block":64,"sibilance":1,"seed":7},"levels":{"vref":0.08241,"asp_gain":0.58228,"bar_gain":0.33263,"extra_gains":[0.05986],"derived":"browser tables"}},{"schema":"robot-voice-ir/1","sample_rate":44100,"samples":15952,"total_seconds":0.36173,"seed":7,"formants":{"t":[0,0.02658,0.10658,0.25794,0.3184,0.34173],"f1":[200,200,650,650,320,320],"f2":[2000,2000,1650,1650,1150,1150],"f3":[2600,2600,2450,2450,2050,2050]},"voicing":{"t":[0,0,0.08658,0.09658,0.10858,0.26794,0.29494,0.34673,0.36173],"v":[0,0,0,0,1,1,0.22,0.22,0]},"aspiration":{"t":[0,0,0.02658,0.02958,0.09658,0.11658,0.26294,0.30294,0.34173,0.36173],"v":[0,0,0,0.32,0.09,0,0,0,0,0]},"voicebar":{"t":[0,0,0.004,0.02658,0.02958,0.36173],"v":[0,0,0.3,0.3,0,0]},"nasal_zero":{"t":[0,0.24294,0.28794,0.35673,0.36173],"v":[250,250,750,750,250],"active":true},"pitch":[[0,118],[0.365,118]],"extras":[{"start":1172,"samples":2646,"spec":[[3000,2,1]],"shape":["ad",0.006,0.06],"ratio":0.153,"voiced":false}],"controls":{"src":"glottal","oq":0.55,"fscale":1.16,"asp":0.35,"jitter":0,"flutter":0,"tilt_db":-1,"chip":false,"tract":"hybrid","gains":[1,1,0.35,0.15],"bw":[105,147,210,262.5],"q":7,"f5":[4500,300],"tilt":null,"post_fir":null,"f4":3400,"nasal_pole":[250,2600],"nasal_zero_bw":90,"hybrid_high_gain":1.2589,"nasal_buzz":0.4,"nasal_high":0.15,"nasal_high_max":1.4,"nasal_buzz_db":22,"nasal_buzz_hz":400,"hybrid_f5_gain":0.1,"hybrid_dep_exp":0.187,"asp_level":0.35,"bar_level":0.4,"no_vowel_ref":0.0707,"tract_ref_gain":0.133,"radiation":0.97,"block":64,"sibilance":1,"seed":7},"levels":{"vref":0.0769,"asp_gain":1.26316,"bar_gain":0.31037,"extra_gains":[0.0968],"derived":"browser tables"}}]} } },

  // ---- Pianos, across the synths -------------------------------------------
  //
  // Auditioned side by side on one ballad by tools/render-piano-auditions.js. What each
  // synth brings: WNDR-9 real partials, with `stretch` as the piano string's own
  // inharmonicity law and `damp` decaying the top of the stack first; MRDR-3 a hammer (a
  // noise layer gone in 40 ms) and a keytracked filter envelope; TNGR-2 a table swept
  // bright to dark; RMND-2 a falling FM index.
  //
  // The WNDR-9 three sit on the ordinary drawbar series, so every bar is the footage its
  // pot says it is: the 8′ is the fundamental and the 2⅔′, 1⅗′ and 1′ carry the 3rd, 5th
  // and 8th partials. Only the 7th and 9th are missing, and by then damp has them faint.
  wndrConcertGrand: { label: 'Concert Grand', category: 'Keys', synth: 'WNDR-9', dur: 3.6,
    note: 'Stretched partials — the 1′ bar lands about 20 cents sharp, as a long string\'s '
      + 'eighth partial does — with the top of the stack gone first. A short high sine on '
      + 'the strike stands in for the hammer.',
    additive: { bars: [0, 0, 1, 0.7, 0.5, 0.38, 0.3, 0.2, 0.1],
      attack: 0.001, decay: 3.6, sustain: 0, release: 0.4, stretch: 0.0004, damp: 0.9,
      perc: { ratio: 8, gain: 0.22, attack: 0.001, decay: 0.018 } },
    humanize: { gain: 0.07, pitch: 0.0006 } },
  wndrOldUpright: { label: 'Old Upright', category: 'Keys', synth: 'WNDR-9', dur: 2.5,
    note: 'Shorter strings, so twice the stretch and a quicker decay. The slow chorus is '
      + 'the string pairs drifting out of unison — what a piano that has not been tuned '
      + 'this year sounds like.',
    additive: { bars: [0, 0, 1, 0.78, 0.42, 0.28, 0.2, 0.13, 0],
      attack: 0.001, decay: 2.5, sustain: 0, release: 0.3, stretch: 0.0008, damp: 1.1,
      perc: { ratio: 8, gain: 0.3, attack: 0.001, decay: 0.022 } },
    humanize: { gain: 0.09, pitch: 0.001 },
    chorus: { mix: 0.3, rate: 0.5, depth: 0.35, width: 0.8 } },
  wndrFeltPiano: { label: 'Felt Piano', category: 'Keys', synth: 'WNDR-9', dur: 4.6,
    note: 'Felt on the hammers: almost nothing above the third partial, a soft 6 ms '
      + 'attack and a long bloom. The close-mic lullaby piano.',
    additive: { bars: [0, 0, 1, 0.34, 0.12, 0.06, 0.03, 0.02, 0],
      attack: 0.006, decay: 4.6, sustain: 0, release: 0.7, stretch: 0.0003, damp: 1.4 },
    humanize: { gain: 0.06, pitch: 0.0006 } },

  mrdrGrand: { label: 'Studio Grand', category: 'Keys', synth: 'MRDR-3', dur: 3.2,
    note: 'A triangle string pair beating 3 cents apart, a saw whose keytracked filter '
      + 'snaps open on the strike and shuts over a third of a second, and a noise thump.',
    layer: {
      osc1: { type: 'triangle', ratio: 1, gain: 0.8, attack: 0.001, decay: 3.2, sustain: 0, release: 0.4, unison: 2, spread: 3, stereo: 0.3 },
      osc2: { type: 'sawtooth', ratio: 1, gain: 0.34, attack: 0.001, decay: 1.1, sustain: 0, release: 0.3, filter: { type: 'lowpass', slope: -12, freq: 1400, Q: 0.6, track: 0.8, env: { octaves: 2, attack: 0.001, decay: 0.32, sustain: 0, release: 0.3 } } },
      osc3: { type: 'noise', ratio: 1, gain: 0.12, color: 'white', attack: 0.001, decay: 0.04, sustain: 0, release: 0.03, filter: { type: 'bandpass', slope: -12, freq: 1200, Q: 1.1, track: 0.5 } },
    },
    global: { filter: { type: 'lowpass', slope: -12, freq: 5200, Q: 0.5, track: 0.4, env: { octaves: 0.8, attack: 0.001, decay: 1.2, sustain: 0.2, release: 0.4 } } },
    humanize: { entry: 0.006, gain: 0.07, filter: 0.1 } },
  mrdrPopGrand: { label: 'Bright Pop Grand', category: 'Keys', synth: 'MRDR-3', dur: 2.8,
    note: 'FM inside the layers: a 1:1 operator whose index falls away over half a second '
      + '(brightness that decays, which is what a struck string does), and a slightly '
      + 'inharmonic 7.01 operator on the octave for the metal in the attack.',
    layer: {
      osc1: { type: 'sine', ratio: 1, gain: 0.82, attack: 0.001, decay: 2.8, sustain: 0, release: 0.4, unison: 2, spread: 4, stereo: 0.35, fm: { type: 'sine', ratio: 1, index: 1.6, attack: 0.001, decay: 0.5 } },
      osc2: { type: 'sine', ratio: 2, gain: 0.3, attack: 0.001, decay: 1.4, sustain: 0, release: 0.3, fm: { type: 'sine', ratio: 7.01, index: 0.5, attack: 0.001, decay: 0.08 } },
      osc3: { type: 'noise', ratio: 1, gain: 0.08, color: 'white', attack: 0.001, decay: 0.022, sustain: 0, release: 0.02, filter: { type: 'bandpass', slope: -12, freq: 3000, Q: 1, track: 0.3 } },
    },
    global: { filter: { type: 'lowpass', slope: -12, freq: 7000, Q: 0.5, track: 0.3 } },
    humanize: { entry: 0.005, gain: 0.07 } },
  mrdrElectricGrand: { label: 'Electric Grand', category: 'Keys', synth: 'MRDR-3', dur: 2.2,
    note: 'The CP-70: real strings on a pickup, so a thinner body, a brighter strike and the '
      + 'chorus it was always played through.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.789, attack: 0.001, decay: 2.2, sustain: 0, release: 0.3, unison: 2, spread: 6, stereo: 0.5, filter: { type: 'lowpass', slope: -12, freq: 900, Q: 0.8, track: 0.9, env: { octaves: 2.5, attack: 0.001, decay: 0.25, sustain: 0, release: 0.2 } } },
      osc2: { type: 'triangle', ratio: 0.5, gain: 0.155, attack: 0.001, decay: 1.2, sustain: 0, release: 0.25, detune: 8 },
      osc3: { type: 'noise', ratio: 1, gain: 0.151, color: 'white', attack: 0.001, decay: 0.04, sustain: 0, release: 0.02, filter: { type: 'bandpass', slope: -12, freq: 2400, Q: 1.2, track: 0.4 }, detune: 0 },
    },
    humanize: { entry: 0, gain: 0 },
    chorus: { mix: 0, rate: 0.6, depth: 0.54, width: 1 } },

  tngrConcertGrand: { label: 'Digital Grand', category: 'Keys', synth: 'TNGR-2', dur: 2.8,
    note: 'Warm Harmonics swept from bright to dark by the position envelope, a quiet '
      + 'Bell Fold an octave up for the hammer, and a keytracked filter envelope.', tngr2: {
      oscA: { table: 'warmHarmonics', position: 0.45, envAmount: -0.35, level: 0.8, unison: 2, spread: 3, stereo: 0.3 },
      oscB: { table: 'bellFold', position: 0.1, level: 0.05, interval: 12, detune: 3 },
      amp: { attack: 0.002, decay: 2.8, sustain: 0.03, release: 0.5 },
      positionEnv: { attack: 0, decay: 0.8, sustain: 0.1 },
      filter: { type: 'lowpass', slope: -12, cutoff: 1902.73, resonance: 0.5, keyTrack: 0.6 },
      filterEnv: { amount: 1.4, attack: 0.001, decay: 0.6, sustain: 0.1 },
      master: { gain: 0.6 } } },
  tngrFeltUpright: { label: 'Felt Upright', category: 'Keys', synth: 'TNGR-2', dur: 3.4,
    note: 'Dark and close: a mostly-fundamental table with a sine 6 cents off it for the '
      + 'beating string pair, through a 24 dB lowpass that follows the keyboard.', tngr2: {
      oscA: { table: 'warmHarmonics', position: 0.15, envAmount: -0.1, level: 0.85 },
      oscB: { table: 'basic', position: 0, level: 0.25, interval: 0, detune: 6 },
      amp: { attack: 0.008, decay: 3.4, sustain: 0.03, release: 0.7 },
      positionEnv: { attack: 0, decay: 0.6, sustain: 0.05 },
      filter: { type: 'lowpass', slope: -24, cutoff: 763.36, resonance: 0.4, keyTrack: 0.7 },
      filterEnv: { amount: 0.8, attack: 0.001, decay: 0.4, sustain: 0 },
      master: { gain: 0.66 } } },

  rmndDxPiano: { label: 'FM Piano', category: 'Keys', synth: 'RMND-2', dur: 2.4,
    note: 'Harmonicity 1 is a full harmonic series; the index falls from bright to nearly '
      + 'a sine across the first second. The DX7 piano everybody has heard.',
    options: {
      harmonicity: 1, modulationIndex: 2.4,
      oscillator: { type: 'sine' }, modulation: { type: 'sine' },
      envelope: { attack: 0.002, decay: 2.4, sustain: 0.02, release: 0.6 },
      modulationEnvelope: { attack: 0.001, decay: 0.9, sustain: 0.06, release: 0.5 },
    } },
  rmndTineEP: { label: 'Tine Electric Piano', category: 'Keys', synth: 'RMND-2', dur: 2.8,
    note: 'A 7:1 operator for the tine\'s ping, gone in an eighth of a second, over a sine '
      + 'that holds a little. The Rhodes end of "piano".',
    options: {
      harmonicity: 7, modulationIndex: 2.4,
      oscillator: { type: 'sine' }, modulation: { type: 'sine' },
      envelope: { attack: 0.002, decay: 2.8, sustain: 0.1, release: 0.7 },
      modulationEnvelope: { attack: 0.001, decay: 0.12, sustain: 0.08, release: 0.3 },
    } },

  // ---- Slap bass -------------------------------------------------------------
  //
  // Eighties slap, auditioned by tools/render-slap-bass-auditions.js. A slap is a strike
  // far brighter than the note behind it, gone in well under a tenth of a second: the
  // DX7 got there with an FM index that falls off a cliff, and the MRDR-3 hybrids add
  // the fret click (high noise) and the POP's pitch, which starts sharp because the
  // string is stretched as it is pulled. The pops carry no drive: MRDR-3's shaper is
  // normalised to full scale, so it levels the strike with the note behind it.
  rmndDxSlap: { label: 'FM Slap Bass', category: 'Bass', synth: 'RMND-2', dur: 1,
    note: 'The DX7 bass: a 1:1 modulator at index 12, gone in an eighth of a second, so '
      + 'the note starts as a buzz-saw and settles to a round sine.',
    options: {
      harmonicity: 1, modulationIndex: 12,
      oscillator: { type: 'sine' }, modulation: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.9, sustain: 0.35, release: 0.08 },
      modulationEnvelope: { attack: 0.001, decay: 0.12, sustain: 0.06, release: 0.1 },
    } },
  rmndDxPop: { label: 'FM Pop Bass', category: 'Bass', synth: 'RMND-2', dur: 1,
    note: 'Harder and shorter: index 14 collapsing in 60 ms, and a body that lets go '
      + 'quickly. All snap — the pulled note on its own.',
    options: {
      harmonicity: 1, modulationIndex: 14,
      oscillator: { type: 'sine' }, modulation: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.35, sustain: 0.15, release: 0.06 },
      modulationEnvelope: { attack: 0.001, decay: 0.06, sustain: 0.02, release: 0.05 },
    } },
  rmndDigitalSlap: { label: 'Digital Slap', category: 'Bass', synth: 'RMND-2', dur: 1,
    note: 'A square modulator: odd harmonics only in the strike, so it barks rather than '
      + 'buzzes. The hollow, glassy Level 42 end.',
    options: {
      harmonicity: 1, modulationIndex: 8,
      oscillator: { type: 'sine' }, modulation: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.7, sustain: 0.3, release: 0.07 },
      modulationEnvelope: { attack: 0.001, decay: 0.09, sustain: 0.1, release: 0.08 },
    } },
  mrdrSlapThumb: { label: 'Thumb Slap', category: 'Bass', synth: 'MRDR-3', dur: 1,
    note: 'A sine body carrying a fast-falling FM strike, a saw whose filter slams open '
      + 'five octaves and shuts in 70 ms, and a 4 kHz click for the string hitting the frets.',
    layer: {
      osc1: { type: 'sine', ratio: 1, gain: 0.9, attack: 0.001, decay: 0.8, sustain: 0.4, release: 0.07, fm: { type: 'sine', ratio: 1, index: 5, attack: 0.001, decay: 0.1 } },
      osc2: { type: 'sawtooth', ratio: 1, gain: 0.5, attack: 0.001, decay: 0.3, sustain: 0.15, release: 0.06, filter: { type: 'lowpass', slope: -12, freq: 260, Q: 1.2, track: 0.8, env: { octaves: 5, attack: 0.001, decay: 0.07, sustain: 0, release: 0.05 } } },
      osc3: { type: 'noise', ratio: 1, gain: 0.16, color: 'white', attack: 0.001, decay: 0.014, sustain: 0, release: 0.01, filter: { type: 'bandpass', slope: -12, freq: 4000, Q: 1.4, track: 0 } },
    },
    humanize: { entry: 0.004, gain: 0.1 } },
  mrdrSlapPop: { label: 'Slap Pop Bass', category: 'Bass', synth: 'MRDR-3', dur: 1,
    note: 'The pull: every layer starts 40 cents sharp and drops onto the note in 25 ms, a '
      + '3:1 FM operator for the metallic snap, and a brighter, louder fret click.',
    layer: {
      osc1: { type: 'sine', ratio: 1, gain: 0.85, attack: 0.001, decay: 0.6, sustain: 0.3, release: 0.06, pitch: { semitones: 0.4, decay: 0.025 }, fm: { type: 'sine', ratio: 3, index: 3.5, attack: 0.001, decay: 0.07 } },
      osc2: { type: 'sawtooth', ratio: 1, gain: 0.55, attack: 0.001, decay: 0.25, sustain: 0.1, release: 0.05, pitch: { semitones: 0.4, decay: 0.025 }, filter: { type: 'lowpass', slope: -12, freq: 400, Q: 2, track: 0.8, env: { octaves: 5.5, attack: 0.001, decay: 0.05, sustain: 0, release: 0.04 } } },
      osc3: { type: 'noise', ratio: 1, gain: 0.24, color: 'white', attack: 0.001, decay: 0.01, sustain: 0, release: 0.01, filter: { type: 'bandpass', slope: -12, freq: 5200, Q: 1.6, track: 0 } },
    },
    drive: 0.181644, shape: 'soft',
    humanize: { entry: 0.004, gain: 0.1 } },
  mrdrSynthSlap: { label: 'Synth Slap', category: 'Bass', synth: 'MRDR-3', dur: 1,
    note: 'The analogue answer: saw and square through a resonant 24 dB lowpass whose '
      + 'envelope spits open and shuts. Rubbery rather than stringy — the Jupiter/SH-101 '
      + 'take on slap that half of eighties pop actually used.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.8, attack: 0.001, decay: 0.6, sustain: 0.5, release: 0.07 },
      osc2: { type: 'square', ratio: 1, gain: 0.45, detune: -6, attack: 0.001, decay: 0.6, sustain: 0.5, release: 0.07 },
      osc3: { type: 'sine', ratio: 0.5, gain: 0.35, attack: 0.001, decay: 0.7, sustain: 0.6, release: 0.07 },
    },
    global: { filter: { type: 'lowpass', slope: -24, freq: 180, Q: 4, track: 0.7, env: { octaves: 4.6, attack: 0.001, decay: 0.09, sustain: 0.05, release: 0.06 } } },
    drive: 0.306445, shape: 'soft',
    humanize: { entry: 0.004, gain: 0.08 } },
  tngrSlap: { label: 'Digital Slap Bass', category: 'Bass', synth: 'TNGR-2', dur: 1,
    note: 'Saw Form swept from its brightest frame to its roundest in 80 ms, under a '
      + 'filter envelope four octaves deep. The cleanest, most produced of the set.', tngr2: {
      oscA: { table: 'sawForm', position: 0.85, envAmount: -0.7, level: 0.85 },
      oscB: { table: 'basic', position: 0, level: 0.4, interval: -12 },
      amp: { attack: 0.001, decay: 0.7, sustain: 0.35, release: 0.07 },
      positionEnv: { attack: 0, decay: 0.08, sustain: 0 },
      filter: { type: 'lowpass', slope: -24, cutoff: 174.48, resonance: 1.4, keyTrack: 0.7 },
      filterEnv: { amount: 4, attack: 0.001, decay: 0.08, sustain: 0.02 },
      master: { gain: 0.7 } } },

  mrdrMegaPop: { label: 'Mega Pop', category: 'Bass', synth: 'MRDR-3', dur: 1,
    note: 'The pull taken to a semitone and a half, dropping in 18 ms; a 3:1 operator at '
      + 'index 7, a resonant saw that opens six and a half octaves, and a fret clack twice '
      + 'as loud as Pulled Pop\'s.',
    layer: {
      osc1: { type: 'sine', ratio: 1, gain: 0.85, attack: 0.001, decay: 0.7, sustain: 0.35, release: 0.07, pitch: { semitones: 1.5, decay: 0.018 }, fm: { type: 'sine', ratio: 3, index: 7, attack: 0.001, decay: 0.05 } },
      osc2: { type: 'sawtooth', ratio: 1, gain: 0.6, attack: 0.001, decay: 0.3, sustain: 0.12, release: 0.05, pitch: { semitones: 1.5, decay: 0.018 }, filter: { type: 'lowpass', slope: -12, freq: 300, Q: 3, track: 0.8, env: { octaves: 6.5, attack: 0.001, decay: 0.06, sustain: 0, release: 0.04 } } },
      osc3: { type: 'noise', ratio: 1, gain: 0.42, color: 'white', attack: 0.001, decay: 0.008, sustain: 0, release: 0.008, filter: { type: 'bandpass', slope: -12, freq: 6000, Q: 1.8, track: 0 } },
    },
    humanize: { entry: 0.003, gain: 0.08 } },
  mrdrFretClack: { label: 'Fret Clack', category: 'Bass', synth: 'MRDR-3', dur: 1,
    note: 'The string slapping back onto metal: a square rung through a tight 2.6 kHz '
      + 'bandpass for 30 ms — a clang with a pitch — over an FM body. The most percussive '
      + 'of the pops; half the note is the fretboard.',
    layer: {
      osc1: { type: 'sine', ratio: 1, gain: 0.85, attack: 0.001, decay: 0.6, sustain: 0.3, release: 0.06, pitch: { semitones: 0.8, decay: 0.02 }, fm: { type: 'sine', ratio: 1, index: 6, attack: 0.001, decay: 0.06 } },
      osc2: { type: 'square', ratio: 4, gain: 0.5, attack: 0.001, decay: 0.03, sustain: 0, release: 0.02, filter: { type: 'bandpass', slope: -12, freq: 2600, Q: 6, track: 0 } },
      osc3: { type: 'noise', ratio: 1, gain: 0.5, color: 'white', attack: 0.001, decay: 0.02, sustain: 0, release: 0.01, filter: { type: 'bandpass', slope: -12, freq: 4500, Q: 2.4, track: 0 } },
    },
    humanize: { entry: 0.003, gain: 0.08 } },
  mrdrWirePop: { label: 'Wire Pop', category: 'Bass', synth: 'MRDR-3', dur: 1,
    note: 'Bright and LONG: the filter opens six octaves and only falls back a quarter of '
      + 'the way, at resonance 5, so every pop leaves a singing, wah-shaped ring behind it.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.8, attack: 0.001, decay: 0.9, sustain: 0.45, release: 0.08, pitch: { semitones: 1, decay: 0.03 }, filter: { type: 'lowpass', slope: -12, freq: 260, Q: 5, track: 0.8, env: { octaves: 6, attack: 0.001, decay: 0.12, sustain: 0.25, release: 0.06 } } },
      osc2: { type: 'sine', ratio: 1, gain: 0.55, attack: 0.001, decay: 0.9, sustain: 0.5, release: 0.08, pitch: { semitones: 1, decay: 0.03 } },
      osc3: { type: 'noise', ratio: 1, gain: 0.3, color: 'white', attack: 0.001, decay: 0.012, sustain: 0, release: 0.01, filter: { type: 'bandpass', slope: -12, freq: 5000, Q: 1.6, track: 0 } },
    },
    humanize: { entry: 0.003, gain: 0.08 } },
  mrdrZapPop: { label: 'Zap Pop', category: 'Bass', synth: 'MRDR-3', dur: 1,
    note: 'The analogue pop turned into a laser: two semitones of pitch gone in 15 ms under '
      + 'a 24 dB filter at resonance 9 that sweeps six octaves. More synth than string, and '
      + 'the most eighties of the lot.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.8, attack: 0.001, decay: 0.5, sustain: 0.45, release: 0.06, pitch: { semitones: 2, decay: 0.015 } },
      osc2: { type: 'square', ratio: 1, gain: 0.45, detune: -7, attack: 0.001, decay: 0.5, sustain: 0.45, release: 0.06, pitch: { semitones: 2, decay: 0.015 } },
      osc3: { type: 'sine', ratio: 0.5, gain: 0.4, attack: 0.001, decay: 0.6, sustain: 0.55, release: 0.06 },
    },
    global: { filter: { type: 'lowpass', slope: -24, freq: 150, Q: 9, track: 0.7, env: { octaves: 6, attack: 0.001, decay: 0.06, sustain: 0.04, release: 0.05 } } },
    drive: 0.168392, shape: 'soft',
    humanize: { entry: 0.003, gain: 0.06 } },
  rmndMaxPop: { label: 'Hard FM Pop Bass', category: 'Bass', synth: 'RMND-2', dur: 1,
    note: 'The DX slap with the index at 22 and gone in 35 ms. Nearly a click with a bass '
      + 'note hanging off it.',
    options: {
      harmonicity: 1, modulationIndex: 22,
      oscillator: { type: 'sine' }, modulation: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.5, sustain: 0.25, release: 0.06 },
      modulationEnvelope: { attack: 0.001, decay: 0.035, sustain: 0.03, release: 0.04 },
    } },
  rmndClangPop: { label: 'DX Clang Pop', category: 'Bass', synth: 'RMND-2', dur: 1,
    note: 'A 3:1 modulator at index 10: the strike rings like struck metal before it '
      + 'settles. The DX7 pop that sounds like a DX7 on purpose.',
    options: {
      harmonicity: 3, modulationIndex: 10,
      oscillator: { type: 'sine' }, modulation: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.6, sustain: 0.3, release: 0.06 },
      modulationEnvelope: { attack: 0.001, decay: 0.045, sustain: 0.02, release: 0.04 },
    } },
  rmndSquarePop: { label: 'Square FM Pop Bass', category: 'Bass', synth: 'RMND-2', dur: 1,
    note: 'Square modulator at index 12 for 40 ms: a hard, hollow bark at the front of '
      + 'every note.',
    options: {
      harmonicity: 1, modulationIndex: 12,
      oscillator: { type: 'sine' }, modulation: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.55, sustain: 0.28, release: 0.06 },
      modulationEnvelope: { attack: 0.001, decay: 0.04, sustain: 0.04, release: 0.04 },
    } },
  tngrMegaPop: { label: 'Wavetable Mega Pop', category: 'Bass', synth: 'TNGR-2', dur: 1,
    note: 'Saw Form from its top frame to its bottom in 40 ms, under a resonant filter '
      + 'envelope six octaves deep that shuts in 50.', tngr2: {
      oscA: { table: 'sawForm', position: 1, envAmount: -1, level: 0.85 },
      oscB: { table: 'basic', position: 0, level: 0.4, interval: -12 },
      amp: { attack: 0.001, decay: 0.6, sustain: 0.32, release: 0.06 },
      positionEnv: { attack: 0, decay: 0.04, sustain: 0 },
      filter: { type: 'lowpass', slope: -24, cutoff: 141.77, resonance: 3, keyTrack: 0.7 },
      filterEnv: { amount: 6, attack: 0.001, decay: 0.05, sustain: 0.02 },
      master: { gain: 0.7 } } },

  // ---- Woodwinds -------------------------------------------------------------
  //
  // Auditioned on one slow tune by tools/render-woodwind-auditions.js. A flute is mostly
  // BREATH, and MRDR-3's noise layer is a band that follows the note: at ratio 1 it is air
  // on the pitch. Its gain reads like an oscillator's, though (the layer makes up what its
  // bandpass throws away), so every breath here was set by measuring air against tone
  // (`--breath` in that tool) and then brought down by ear. How the air is filtered
  // mattered more than how loud it is: on the four breathy ones it goes through a
  // narrow band ON the note (CUTOFF 110 × KEY FOLLOW 1 is the note itself, Q 5), because
  // the noise layer's own band has wide skirts and the skirts are the hiss.
  mrdrConcertFlute: { label: 'Concert Flute', category: 'Orch', synth: 'MRDR-3', dur: 2,
    note: 'A triangle with a quiet octave partial, breath on the pitch that chiffs as the '
      + 'note speaks and settles to a steady hiss, and a vibrato that is half pitch and '
      + 'half level — which is how a flautist\'s diaphragm vibrato actually works.',
    layer: {
      osc1: { type: 'triangle', ratio: 1, gain: 0.85, attack: 0.06, decay: 0.3, sustain: 0.92, release: 0.16, attackCurve: 'lin' },
      osc2: { type: 'sine', ratio: 2, gain: 0.16, attack: 0.08, decay: 0.3, sustain: 0.85, release: 0.14, attackCurve: 'lin' },
      osc3: { type: 'noise', ratio: 1, gain: 0.028, color: 'pink', attack: 0.02, decay: 0.12, sustain: 0.32, release: 0.12, attackCurve: 'lin', filter: { type: 'bandpass', slope: -12, freq: 110, Q: 5, track: 1 } },
      lfo: { type: 'sine', rate: 5.2, depth: 0.12, target: 'level', delay: 0.35 },
    },
    global: { filter: { type: 'lowpass', slope: -12, freq: 3600, Q: 0.6, track: 0.5 } },
    humanize: { entry: 0.008, pitch: 0.0015, gain: 0.05 },
    vibrato: { depth: 0.12, rate: 5.2, delay: 0.35 } },

  mrdrShakuhachi: { label: 'Shakuhachi', category: 'Orch', synth: 'MRDR-3', dur: 2,
    note: 'Mostly air: a sine under a breath band sitting on the pitch. Every note scoops '
      + 'up from more than a semitone flat (meri into kari), and the slow, deep vibrato arrives '
      + 'late — the head-shake, not the diaphragm.',
    layer: {
      osc1: { type: 'sine', ratio: 1, gain: 0.72, attack: 0.1, decay: 0.4, sustain: 0.9, release: 0.25, attackCurve: 'lin', pitch: { semitones: -1.3, decay: 0.2 } },
      osc2: { type: 'noise', ratio: 1, gain: 0.023, color: 'pink', attack: 0.015, decay: 0.16, sustain: 0.55, release: 0.22, attackCurve: 'lin', pitch: { semitones: -1.3, decay: 0.2 }, filter: { type: 'bandpass', slope: -12, freq: 110, Q: 5, track: 1 } },
      lfo: { type: 'sine', rate: 4.2, depth: 0.22, target: 'level', delay: 0.6 },
    },
    global: { filter: { type: 'lowpass', slope: -12, freq: 3000, Q: 0.6, track: 0.4 } },
    humanize: { entry: 0.012, pitch: 0.003, gain: 0.08 },
    vibrato: { depth: 0.3, rate: 4.2, delay: 0.6 } },

  mrdrPanFlute: { label: 'Pan Flute', category: 'Orch', synth: 'MRDR-3', dur: 2,
    note: 'A stopped pipe, so odd partials only — sine plus a whisper of the third — and a '
      + 'hard breath chiff on every note that falls back to a breathy tone. The Andes, or '
      + 'Zamfir, depending on the reverb.',
    layer: {
      osc1: { type: 'sine', ratio: 1, gain: 0.8, attack: 0.03, decay: 0.3, sustain: 0.88, release: 0.2, attackCurve: 'lin', pitch: { semitones: 0.25, decay: 0.05 } },
      osc2: { type: 'sine', ratio: 3, gain: 0.1, attack: 0.03, decay: 0.2, sustain: 0.7, release: 0.15, attackCurve: 'lin' },
      osc3: { type: 'noise', ratio: 1, gain: 0.07, color: 'pink', attack: 0.005, decay: 0.07, sustain: 0.3, release: 0.18, attackCurve: 'lin', filter: { type: 'bandpass', slope: -12, freq: 110, Q: 5, track: 1 } },
      lfo: { type: 'sine', rate: 5, depth: 0.1, target: 'level', delay: 0.4 },
    },
    global: { filter: { type: 'lowpass', slope: -12, freq: 4200, Q: 0.6, track: 0.4 } },
    humanize: { entry: 0.01, pitch: 0.002, gain: 0.07 },
    vibrato: { depth: 0.1, rate: 5, delay: 0.45 } },

  mrdrRecorder: { label: 'Recorder', category: 'Orch', synth: 'MRDR-3', dur: 2,
    note: 'A fipple does the embouchure for you, so the tone is steadier and purer than a '
      + 'flute\'s: triangle and octave, a short clean chiff, very little breath, and '
      + 'almost no vibrato. The early-music soprano.',
    layer: {
      osc1: { type: 'triangle', ratio: 1, gain: 0.85, attack: 0.025, decay: 0.2, sustain: 0.95, release: 0.1, attackCurve: 'lin' },
      osc2: { type: 'sine', ratio: 2, gain: 0.24, attack: 0.025, decay: 0.2, sustain: 0.9, release: 0.1, attackCurve: 'lin' },
      osc3: { type: 'noise', ratio: 1, gain: 0.076, color: 'pink', attack: 0.004, decay: 0.05, sustain: 0.1, release: 0.08, attackCurve: 'lin', filter: { type: 'lowpass', slope: -12, freq: 1800, Q: 0.5, track: 0.5 } },
    },
    global: { filter: { type: 'lowpass', slope: -12, freq: 5000, Q: 0.6, track: 0.4 } },
    humanize: { entry: 0.006, pitch: 0.001, gain: 0.04 },
    vibrato: { depth: 0.05, rate: 5.5, delay: 0.6 } },

  mrdrBansuri: { label: 'Bansuri', category: 'Orch', synth: 'MRDR-3', dur: 2,
    note: 'Bamboo and a big bore: a darker, breathier flute, each note flicked into from a '
      + 'semitone above (the kan grace note) and held with a wide, slow vibrato.',
    layer: {
      osc1: { type: 'sine', ratio: 1, gain: 0.8, attack: 0.07, decay: 0.3, sustain: 0.9, release: 0.25, attackCurve: 'lin', pitch: { semitones: 1, decay: 0.06 } },
      osc2: { type: 'triangle', ratio: 1, gain: 0.2, detune: 4, attack: 0.08, decay: 0.3, sustain: 0.85, release: 0.25, attackCurve: 'lin', pitch: { semitones: 1, decay: 0.06 } },
      osc3: { type: 'noise', ratio: 1, gain: 0.04, color: 'pink', attack: 0.02, decay: 0.15, sustain: 0.45, release: 0.2, attackCurve: 'lin', pitch: { semitones: 1, decay: 0.06 }, filter: { type: 'bandpass', slope: -12, freq: 110, Q: 5, track: 1 } },
      lfo: { type: 'sine', rate: 4.6, depth: 0.16, target: 'level', delay: 0.45 },
    },
    global: { filter: { type: 'lowpass', slope: -12, freq: 2600, Q: 0.6, track: 0.5 } },
    humanize: { entry: 0.01, pitch: 0.002, gain: 0.06 },
    vibrato: { depth: 0.2, rate: 4.6, delay: 0.45 } },

  mrdrOcarina: { label: 'Ocarina', category: 'Orch', synth: 'MRDR-3', dur: 2,
    note: 'A vessel flute, the purest tone of any wind: nearly a sine, a soft breath band '
      + 'tucked under it, a gentle chiff and a slow shallow vibrato. Hyrule.',
    layer: {
      osc1: { type: 'sine', ratio: 1, gain: 0.9, attack: 0.04, decay: 0.3, sustain: 0.92, release: 0.14, attackCurve: 'lin' },
      osc2: { type: 'sine', ratio: 2, gain: 0.05, attack: 0.04, decay: 0.3, sustain: 0.8, release: 0.12, attackCurve: 'lin' },
      osc3: { type: 'noise', ratio: 1, gain: 0.13, color: 'white', attack: 0.01, decay: 0.08, sustain: 0.14, release: 0.12, attackCurve: 'lin' },
    },
    humanize: { entry: 0.008, pitch: 0.0015, gain: 0.05 },
    vibrato: { depth: 0.08, rate: 4.8, delay: 0.5 } },

  mrdrClarinet: { label: 'Clarinet', category: 'Orch', synth: 'MRDR-3', dur: 2,
    note: 'A cylindrical bore closed at the reed end, so odd harmonics: two squares a few '
      + 'cents apart through a keytracked lowpass that opens a little as the note is '
      + 'blown in. Played straight, as a classical clarinettist does — no vibrato.',
    layer: {
      osc1: { type: 'square', ratio: 1, gain: 0.75, attack: 0.04, decay: 0.3, sustain: 0.92, release: 0.12, attackCurve: 'lin' },
      osc2: { type: 'square', ratio: 1, gain: 0.35, detune: 3, attack: 0.05, decay: 0.3, sustain: 0.9, release: 0.12, attackCurve: 'lin' },
      osc3: { type: 'noise', ratio: 1, gain: 0.033, color: 'pink', attack: 0.01, decay: 0.08, sustain: 0.12, release: 0.1, attackCurve: 'lin', filter: { type: 'lowpass', slope: -12, freq: 1800, Q: 0.5, track: 0.5 } },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 1500, Q: 0.7, track: 0.6, env: { octaves: 0.6, attack: 0.06, decay: 0.4, sustain: 0.4, release: 0.15 } },
    },
    humanize: { entry: 0.008, pitch: 0.001, gain: 0.04 },
    vibrato: { depth: 0.02, rate: 5, delay: 0.8 } },

  mrdrOboe: { label: 'Oboe', category: 'Orch', synth: 'MRDR-3', dur: 2,
    note: 'A double reed: a saw through a fixed 1.1 kHz body resonance is the nasal, '
      + 'pinched voice, over a plain saw for the rest of the spectrum. Quick to speak, '
      + 'with a narrow, fast vibrato.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.55, attack: 0.03, decay: 0.3, sustain: 0.9, release: 0.1, attackCurve: 'lin', filter: { type: 'lowpass', slope: -12, freq: 2200, Q: 0.7, track: 0.4 } },
      osc2: { type: 'sawtooth', ratio: 1, gain: 0.7, detune: -3, attack: 0.035, decay: 0.3, sustain: 0.9, release: 0.1, attackCurve: 'lin', filter: { type: 'bandpass', slope: -12, freq: 1100, Q: 3, track: 0 } },
      osc3: { type: 'noise', ratio: 1, gain: 0.035, color: 'pink', attack: 0.008, decay: 0.06, sustain: 0.1, release: 0.08, attackCurve: 'lin', filter: { type: 'lowpass', slope: -12, freq: 1800, Q: 0.5, track: 0.5 } },
    },
    global: { filter: { type: 'lowpass', slope: -12, freq: 4000, Q: 0.6, track: 0.3 } },
    humanize: { entry: 0.008, pitch: 0.0015, gain: 0.05 },
    vibrato: { depth: 0.1, rate: 5.8, delay: 0.3 } },

  tngrAirFlute: { label: 'Air Flute', category: 'Orch', synth: 'TNGR-2', dur: 2,
    note: 'The wavetable route: a sine with Choir Breath an octave up for the air, the '
      + 'breath table walking as the note settles. Softer-focused and more "synth flute" '
      + 'than the MRDR-3 ones — the eighties pop-ballad flute.',
    tngr2: {
      oscA: { table: 'basic', position: 0, level: 0.8 },
      oscB: { table: 'choirBreath', position: 0.4, envAmount: 0.3, level: 0.3, interval: 12 },
      amp: { attack: 0.07, decay: 0.3, sustain: 0.9, release: 0.2 },
      positionEnv: { attack: 0.05, decay: 0.6, sustain: 0.3 },
      filter: { type: 'lowpass', slope: -12, cutoff: 2464, resonance: 0.5, keyTrack: 0.5 },
      master: { gain: 0.66 } },
    vibrato: { depth: 0.12, rate: 5, delay: 0.4 } },

  // ---- mood instruments (2 Oct 2026) -----------------------------------------
  //
  // The sounds the Make a Banger moods were missing: one family each for Anthemic,
  // Uplifting, Euphoric, Moody, Dark, Gothic, Heroic, Nostalgic and Funky. All MRDR-3,
  // because banger parts are dense lanes (see docs/audio/remixes.md).

  mrdrFestivalStab: { label: 'Festival Stab', category: 'Lead', synth: 'MRDR-3', dur: 1,
    note: 'The main-stage chord hit: four detuned saws and an octave above, opened wide '
      + 'for a tenth of a second and shut again, so every stab has a front edge and no '
      + 'tail to muddy the next one.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.8, attack: 0.002, decay: 0.32, sustain: 0.35, release: 0.14, unison: 4, spread: 28, stereo: 0.8 },
      osc2: { type: 'sawtooth', ratio: 2, gain: 0.32, detune: 7, attack: 0.002, decay: 0.24, sustain: 0.2, release: 0.1, unison: 3, spread: 18, stereo: 0.6 },
      osc3: { type: 'square', ratio: 0.5, gain: 0.22, attack: 0.002, decay: 0.3, sustain: 0.3, release: 0.12 },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 1400, Q: 1.4, track: 0.3, env: { octaves: 3, attack: 0.002, decay: 0.18, sustain: 0.2, release: 0.12 } },
      vca: { attack: 0.002, decay: 0.35, sustain: 0.45, release: 0.14 },
    },
    drive: 0.274903, shape: 'soft' },

  mrdrAcousticGuitar: { label: 'Acoustic Guitar', category: 'Pluck', synth: 'MRDR-3', dur: 2.2,
    note: 'A steel-string pick: a bright triangle-and-saw string whose top falls away '
      + 'faster than its body, a wooden box resonance at 220 Hz and a scrape of pick noise '
      + 'on the front. Strummed chords come from the part, a few milliseconds apart.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.55, attack: 0.001, decay: 1.6, sustain: 0, release: 0.3, filter: { type: 'lowpass', slope: -12, freq: 1600, Q: 0.7, track: 0.7, env: { octaves: 2.2, attack: 0.001, decay: 0.35, sustain: 0, release: 0.2 } } },
      osc2: { type: 'triangle', ratio: 1, gain: 0.7, detune: 3, attack: 0.001, decay: 1.9, sustain: 0, release: 0.3, filter: { type: 'bandpass', slope: -12, freq: 220, Q: 2.2, track: 0 } },
      osc3: { type: 'noise', ratio: 1, gain: 0.1, color: 'white', attack: 0.001, decay: 0.03, sustain: 0, release: 0.02, filter: { type: 'highpass', slope: -12, freq: 3500, Q: 0.8, track: 0 } },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 5200, Q: 0.6, track: 0.3 },
      vca: { attack: 0.001, decay: 1.8, sustain: 0, release: 0.3 },
    },
    humanize: { entry: 0.006, pitch: 0.001734, gain: 0.08 } },

  mrdrVocalOh: { label: 'Vocal Oh', category: 'Pad', synth: 'MRDR-3', dur: 3,
    note: 'One voice singing "oh": a saw through the two formants of that vowel, 450 Hz '
      + 'and 800 Hz, with breath on the front and a singer\'s late, slow vibrato. The '
      + 'euphoric drop\'s "ohhh" when there is no sample to chop.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.9, attack: 0.06, decay: 0.6, sustain: 0.85, release: 0.35, unison: 2, spread: 6, stereo: 0.3, filter: { type: 'bandpass', slope: -12, freq: 450, Q: 4, track: 0 } },
      osc2: { type: 'sawtooth', ratio: 1, gain: 0.55, detune: -4, attack: 0.07, decay: 0.6, sustain: 0.85, release: 0.35, filter: { type: 'bandpass', slope: -12, freq: 800, Q: 5, track: 0 } },
      osc3: { type: 'noise', ratio: 1, gain: 0.05, color: 'pink', attack: 0.02, decay: 0.25, sustain: 0.15, release: 0.2, filter: { type: 'bandpass', slope: -12, freq: 2600, Q: 1.5, track: 0 } },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 3200, Q: 0.6, track: 0.3 },
      vca: { attack: 0.06, decay: 0.6, sustain: 0.9, release: 0.4 },
    },
    humanize: { entry: 0.01, pitch: 0.002313, gain: 0.05 },
    vibrato: { depth: 0.2, rate: 5.4, delay: 0.35, spread: 0.3 } },

  mrdrMutedTrumpet: { label: 'Muted Trumpet', category: 'Orch', synth: 'MRDR-3', dur: 2.4,
    note: 'A trumpet with a Harmon mute in the bell: the low end is gone and what is left '
      + 'is squeezed through a narrow 1.6 kHz nose. Breathy, late-night, close to the mic.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.9, attack: 0.03, decay: 0.5, sustain: 0.8, release: 0.18, filter: { type: 'bandpass', slope: -12, freq: 1600, Q: 3.2, track: 0.2, env: { octaves: 0.6, attack: 0.03, decay: 0.3, sustain: 0.4, release: 0.15 } }, pitch: { semitones: -0.6, decay: 0.05 } },
      osc2: { type: 'square', ratio: 1, gain: 0.3, attack: 0.04, decay: 0.5, sustain: 0.8, release: 0.18, filter: { type: 'bandpass', slope: -12, freq: 3000, Q: 4, track: 0 } },
      osc3: { type: 'noise', ratio: 1, gain: 0.06, color: 'white', attack: 0.02, decay: 0.2, sustain: 0.25, release: 0.15, filter: { type: 'bandpass', slope: -12, freq: 2200, Q: 2, track: 0 } },
    },
    global: {
      filter: { type: 'highpass', slope: -12, freq: 500, Q: 0.7, track: 0.4 },
      vca: { attack: 0.03, decay: 0.5, sustain: 0.85, release: 0.2 },
    },
    drive: 0.057545, shape: 'soft',
    humanize: { entry: 0.01, pitch: 0.002313, gain: 0.06 },
    vibrato: { depth: 0.16, rate: 5.6, delay: 0.3 } },

  mrdrVibraphone: { label: 'Vibraphone', category: 'Bells', synth: 'MRDR-3', dur: 3.5,
    note: 'Soft mallets on aluminium bars: a sine fundamental with the bar\'s fourth '
      + 'harmonic struck in and gone, and the motor\'s rotating discs as a slow tremolo '
      + 'on the level. The tremolo is what makes it a vibraphone and not a marimba.',
    layer: {
      osc1: { type: 'sine', ratio: 1, gain: 0.9, attack: 0.002, decay: 3, sustain: 0, release: 0.6 },
      osc2: { type: 'sine', ratio: 4, gain: 0.28, attack: 0.001, decay: 0.45, sustain: 0, release: 0.2 },
      osc3: { type: 'sine', ratio: 3, gain: 0.06, attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 },
      lfo: { type: 'sine', rate: 5.2, depth: 0.35, target: 'level', delay: 0.05 },
    },
    global: {
      vca: { attack: 0.002, decay: 3, sustain: 0, release: 0.6 },
    },
    humanize: { entry: 0.006, gain: 0.08 } },

  mrdrDist808: { label: 'Distorted 808', category: 'Bass', synth: 'MRDR-3', dur: 2,
    note: 'The trap 808 pushed into a shaper: a sine that drops a few semitones into its '
      + 'note, driven hard enough to grow upper harmonics so it reads on a phone speaker, '
      + 'with a long tail that is the note itself.',
    layer: {
      osc1: { type: 'sine', ratio: 1, gain: 1, attack: 0.002, decay: 1.6, sustain: 0.5, release: 0.3, pitch: { semitones: 7, decay: 0.05 } },
      osc2: { type: 'triangle', ratio: 1, gain: 0.25, attack: 0.002, decay: 0.2, sustain: 0.2, release: 0.2 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 2200, Q: 0.7, track: 0.2 },
      vca: { attack: 0.002, decay: 1.6, sustain: 0.55, release: 0.3 },
    },
    drive: 0.7, shape: 'soft' },

  mrdrHarpsichord: { label: 'Harpsichord', category: 'Keys', synth: 'MRDR-3', dur: 2,
    note: 'A quill plucks the string instead of a hammer hitting it, so the front is all '
      + 'top: a thin pulse and a saw an octave up, bright and buzzing, with a pluck of '
      + 'noise and a quick fall. Two registers at once, the eight-foot and the four-foot.',
    layer: {
      osc1: { type: 'pulse', width: 0.18, ratio: 1, gain: 0.7, attack: 0.001, decay: 1.4, sustain: 0, release: 0.25, filter: { type: 'lowpass', slope: -12, freq: 3200, Q: 0.8, track: 0.6, env: { octaves: 1.5, attack: 0.001, decay: 0.3, sustain: 0.2, release: 0.15 } } },
      osc2: { type: 'sawtooth', ratio: 2, gain: 0.35, attack: 0.001, decay: 1, sustain: 0, release: 0.2 },
      osc3: { type: 'noise', ratio: 1, gain: 0.08, color: 'white', attack: 0.001, decay: 0.015, sustain: 0, release: 0.01, filter: { type: 'highpass', slope: -12, freq: 4000, Q: 0.8, track: 0 } },
    },
    global: {
      filter: { type: 'highpass', slope: -12, freq: 180, Q: 0.7, track: 0 },
      vca: { attack: 0.001, decay: 1.4, sustain: 0, release: 0.25 },
    } },

  mrdrPedalOrgan: { label: 'Pedal Organ', category: 'Organ', synth: 'MRDR-3', dur: 4,
    note: 'The cathedral organ\'s pedal division: a 16-foot stopped flue under an 8-foot '
      + 'and a soft reed, speaking slowly because the pipe is big. Sits under a chord as '
      + 'the floor of the building rather than as a bass line.',
    layer: {
      osc1: { type: 'sine', ratio: 0.5, gain: 0.9, attack: 0.08, decay: 0.5, sustain: 1, release: 0.5 },
      osc2: { type: 'triangle', ratio: 1, gain: 0.5, attack: 0.06, decay: 0.5, sustain: 1, release: 0.45 },
      osc3: { type: 'pulse', width: 0.3, ratio: 1, gain: 0.14, attack: 0.1, decay: 0.5, sustain: 1, release: 0.4, filter: { type: 'lowpass', slope: -12, freq: 900, Q: 0.7, track: 0.3 } },
    },
    global: {
      vca: { attack: 0.08, decay: 0.5, sustain: 1, release: 0.5 },
    } },

  mrdrTollingBell: { label: 'Tolling Bell', category: 'Bells', synth: 'MRDR-3', dur: 7,
    note: 'A tower bell an octave below a church bell: the hum note, the strike tone and the '
      + 'minor-third partial a bell is famous for, at 0.5, 1 and 1.2 of the note, with an '
      + 'inharmonic 2.7 on the strike. The low partials ring longest, so it falls dark.',
    layer: {
      osc1: { type: 'sine', ratio: 0.5, gain: 0.6, attack: 0.002, decay: 6.5, sustain: 0, release: 1 },
      osc2: { type: 'sine', ratio: 1, gain: 0.7, attack: 0.001, decay: 4, sustain: 0, release: 0.8, fm: { type: 'sine', ratio: 2.7, index: 1.2, attack: 0.001, decay: 0.4 } },
      osc3: { type: 'sine', ratio: 1.2, gain: 0.4, attack: 0.001, decay: 2.5, sustain: 0, release: 0.6 },
    },
    global: {
      vca: { attack: 0.001, decay: 6.5, sustain: 0, release: 1 },
    } },

  mrdrTuba: { label: 'Tuba', category: 'Orch', synth: 'MRDR-3', dur: 2.4,
    note: 'Low brass, tuba and bass trombone in one: a saw with its brightness tied to how '
      + 'hard it is blown, so the front of each note opens and settles, and a lip blip into '
      + 'the pitch. For bass lines under a heroic chord.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.85, attack: 0.04, decay: 0.5, sustain: 0.85, release: 0.18, filter: { type: 'lowpass', slope: -12, freq: 420, Q: 1, track: 0.5, env: { octaves: 1.6, attack: 0.04, decay: 0.3, sustain: 0.4, release: 0.15 } }, pitch: { semitones: -1, decay: 0.05 } },
      osc2: { type: 'sine', ratio: 1, gain: 0.5, attack: 0.03, decay: 0.5, sustain: 0.9, release: 0.18 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 1800, Q: 0.6, track: 0.2 },
      vca: { attack: 0.04, decay: 0.5, sustain: 0.9, release: 0.2 },
    },
    drive: 0.151226, shape: 'soft',
    humanize: { entry: 0.01, pitch: 0.001734, gain: 0.05 } },

  mrdrFrenchHorn: { label: 'French Horn', category: 'Orch', synth: 'MRDR-3', dur: 3,
    note: 'The horn faces backwards and the hand is in the bell, so it is the darkest brass '
      + 'there is: a saw closed down to 900 Hz that only opens on a loud attack, a slow '
      + 'swell and a wide, gentle vibrato. The heroic counter-line.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.8, attack: 0.09, decay: 0.6, sustain: 0.85, release: 0.3, unison: 2, spread: 5, stereo: 0.3, filter: { type: 'lowpass', slope: -12, freq: 900, Q: 0.9, track: 0.5, env: { octaves: 1, attack: 0.08, decay: 0.5, sustain: 0.4, release: 0.25 } } },
      osc2: { type: 'triangle', ratio: 1, gain: 0.45, attack: 0.08, decay: 0.6, sustain: 0.9, release: 0.3 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 2400, Q: 0.6, track: 0.3 },
      vca: { attack: 0.09, decay: 0.6, sustain: 0.9, release: 0.32 },
    },
    drive: 0.058053, shape: 'soft',
    humanize: { entry: 0.012, pitch: 0.002313, gain: 0.05 },
    vibrato: { depth: 0.12, rate: 4.8, delay: 0.4, spread: 0.3 } },

  mrdrDx7Keys: { label: 'Bell E-Piano', category: 'Keys', synth: 'MRDR-3', dur: 3,
    note: 'The 1983 FM electric piano that is on every city-pop record: a sine modulated at '
      + 'the same ratio for the tine body, and a second carrier with an 11:1 modulator for '
      + 'the glassy bark on the attack that fades out first.',
    layer: {
      osc1: { type: 'sine', ratio: 1, gain: 0.85, attack: 0.001, decay: 2.6, sustain: 0.1, release: 0.4, unison: 2, spread: 5, stereo: 0.4, fm: { type: 'sine', ratio: 1, index: 1.2, attack: 0.001, decay: 0.8 } },
      osc2: { type: 'sine', ratio: 1, gain: 0.3, attack: 0.001, decay: 0.6, sustain: 0, release: 0.2, fm: { type: 'sine', ratio: 11, index: 1.8, attack: 0.001, decay: 0.12 } },
    },
    global: {
      vca: { attack: 0.001, decay: 2.6, sustain: 0.15, release: 0.4 },
    },
    humanize: { entry: 0.006, gain: 0.08 } },

  mrdrSaxophone: { label: 'Saxophone', category: 'Lead', synth: 'MRDR-3', dur: 2.4,
    note: 'Alto sax: a reed is a nearly square wave, so a narrow pulse through a 1.2 kHz '
      + 'body, with breath that is louder at the front and a growl of drive on top. The '
      + 'scoop up into the note is the player bending in, not the patch being out.',
    layer: {
      osc1: { type: 'pulse', width: 0.35, ratio: 1, gain: 0.8, attack: 0.025, decay: 0.4, sustain: 0.85, release: 0.15, filter: { type: 'bandpass', slope: -12, freq: 1200, Q: 1.6, track: 0.4, env: { octaves: 0.8, attack: 0.03, decay: 0.3, sustain: 0.5, release: 0.15 } }, pitch: { semitones: -1, decay: 0.07 } },
      osc2: { type: 'sawtooth', ratio: 1, gain: 0.35, detune: 4, attack: 0.03, decay: 0.4, sustain: 0.8, release: 0.15 },
      osc3: { type: 'noise', ratio: 1, gain: 0.07, color: 'pink', attack: 0.015, decay: 0.15, sustain: 0.3, release: 0.12, filter: { type: 'bandpass', slope: -12, freq: 2500, Q: 1.8, track: 0 } },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 3600, Q: 0.7, track: 0.3 },
      vca: { attack: 0.025, decay: 0.4, sustain: 0.9, release: 0.16 },
    },
    drive: 0.203188, shape: 'soft',
    humanize: { entry: 0.01, pitch: 0.002892, gain: 0.07 },
    vibrato: { depth: 0.2, rate: 5.5, delay: 0.3 } },

  mrdrWahGuitar: { label: 'Wah Guitar', category: 'Pluck', synth: 'MRDR-3', dur: 1,
    note: 'A muted funk scratch through a wah pedal: a short bright string, with a '
      + 'resonant bandpass that sweeps up two octaves on every pick, so each sixteenth '
      + 'says "wacka". Made for choppy rhythm parts.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.85, attack: 0.001, decay: 0.22, sustain: 0.15, release: 0.08, filter: { type: 'bandpass', slope: -12, freq: 450, Q: 6, track: 0.2, env: { octaves: 2.2, attack: 0.03, decay: 0.15, sustain: 0.2, release: 0.08 } } },
      osc2: { type: 'pulse', width: 0.3, ratio: 1, gain: 0.35, detune: 5, attack: 0.001, decay: 0.18, sustain: 0.1, release: 0.06 },
      osc3: { type: 'noise', ratio: 1, gain: 0.08, color: 'white', attack: 0.001, decay: 0.02, sustain: 0, release: 0.01, filter: { type: 'bandpass', slope: -12, freq: 2800, Q: 1.5, track: 0 } },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 4200, Q: 0.7, track: 0.2 },
      vca: { attack: 0.001, decay: 0.24, sustain: 0.15, release: 0.08 },
    },
    drive: 0.203217, shape: 'soft',
    humanize: { entry: 0.004, gain: 0.1 } },

  mrdrHornStab: { label: 'Horn Section Stab', category: 'Orch', synth: 'MRDR-3', dur: 0.8,
    note: 'Trumpet, tenor and trombone hitting one short note together, funk-band style: '
      + 'three saws an octave apart, a fall-in from a semitone above, and a filter that '
      + 'barks open and is closed again before the next sixteenth.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.7, attack: 0.006, decay: 0.2, sustain: 0.3, release: 0.06, unison: 3, spread: 10, stereo: 0.5, pitch: { semitones: 1, decay: 0.03 } },
      osc2: { type: 'sawtooth', ratio: 0.5, gain: 0.4, attack: 0.008, decay: 0.2, sustain: 0.3, release: 0.06 },
      osc3: { type: 'sawtooth', ratio: 2, gain: 0.22, attack: 0.006, decay: 0.15, sustain: 0.2, release: 0.05 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 1300, Q: 1.2, track: 0.4, env: { octaves: 1.8, attack: 0.006, decay: 0.12, sustain: 0.25, release: 0.06 } },
      vca: { attack: 0.006, decay: 0.22, sustain: 0.35, release: 0.07 },
    },
    drive: 0.14721, shape: 'soft',
    humanize: { entry: 0.005, gain: 0.06 } },

  // ---- organ stabs and a clean funk guitar, 5 Oct 2026 (the chill banger styles)
  mrdrHouseOrganStab: { label: 'House Organ Stab', category: 'Organ', homeLane: 'chords', synth: 'MRDR-3', dur: 0.6,
    note: 'The house-music organ chord: two square drawbars an octave apart and a sine pip a '
      + 'twelfth up that speaks only on the strike, a filter that flashes open and closes '
      + 'again, and no sustain at all, so every off-beat stab stops before the next.',
    layer: {
      osc1: { type: 'square', ratio: 1, gain: 0.55, attack: 0.002, decay: 0.35, sustain: 0, release: 0.08 },
      osc2: { type: 'square', ratio: 2, gain: 0.4, attack: 0.002, decay: 0.28, sustain: 0, release: 0.07 },
      osc3: { type: 'sine', ratio: 3, gain: 0.35, attack: 0.001, decay: 0.09, sustain: 0, release: 0.04 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 2600, Q: 0.8, track: 0.5, env: { octaves: 1.4, attack: 0.001, decay: 0.14, sustain: 0, release: 0.06 } },
      vca: { attack: 0.002, decay: 0.38, sustain: 0, release: 0.08 },
    },
    humanize: { entry: 0.003, gain: 0.05 } },

  mrdrDeepOrganStab: { label: 'Deep Organ Stab', category: 'Organ', homeLane: 'chords', synth: 'MRDR-3', dur: 0.8,
    note: 'The house organ stab rounded off for deep house: a triangle at the note, a soft '
      + 'square an octave up behind a low filter and a sine sub-octave underneath, closing '
      + 'slowly enough to bloom a little before it goes.',
    layer: {
      osc1: { type: 'triangle', ratio: 1, gain: 0.7, attack: 0.003, decay: 0.5, sustain: 0, release: 0.12 },
      osc2: { type: 'square', ratio: 2, gain: 0.25, attack: 0.003, decay: 0.35, sustain: 0, release: 0.1, filter: { type: 'lowpass', slope: -12, freq: 1400, Q: 0.7, track: 0.4 } },
      osc3: { type: 'sine', ratio: 0.5, gain: 0.35, attack: 0.004, decay: 0.45, sustain: 0, release: 0.12 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 1500, Q: 1, track: 0.4, env: { octaves: 1, attack: 0.002, decay: 0.2, sustain: 0, release: 0.08 } },
      vca: { attack: 0.003, decay: 0.5, sustain: 0, release: 0.12 },
    },
    humanize: { entry: 0.003, gain: 0.05 } },

  mrdrFunkGuitar: { label: 'Clean Funk Guitar', category: 'Pluck', homeLane: 'chords', synth: 'MRDR-3', dur: 0.7,
    note: 'A clean single-coil funk guitar for chord chops: a bright saw string whose top '
      + 'falls fast, a thin pulse through a bandpass at 1.5 kHz for the quack, a tick of '
      + 'pick noise, and the low end cut away so it sits above the bass. Short, with a '
      + 'little ring left in it.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.6, attack: 0.001, decay: 0.3, sustain: 0.12, release: 0.05, filter: { type: 'lowpass', slope: -12, freq: 2200, Q: 0.9, track: 0.6, env: { octaves: 1.5, attack: 0.001, decay: 0.09, sustain: 0.1, release: 0.05 } } },
      osc2: { type: 'pulse', width: 0.22, ratio: 1, gain: 0.4, detune: 4, attack: 0.001, decay: 0.25, sustain: 0.1, release: 0.05, filter: { type: 'bandpass', slope: -12, freq: 1500, Q: 1.4, track: 0.3 } },
      osc3: { type: 'noise', ratio: 1, gain: 0.08, color: 'white', attack: 0.001, decay: 0.012, sustain: 0, release: 0.01, filter: { type: 'highpass', slope: -12, freq: 3200, Q: 0.8, track: 0 } },
    },
    global: {
      filter: { type: 'highpass', slope: -12, freq: 220, Q: 0.7, track: 0 },
      vca: { attack: 0.001, decay: 0.32, sustain: 0.12, release: 0.05 },
    },
    humanize: { entry: 0.004, pitch: 0.0015, gain: 0.1 } },

  mrdrFunkGuitarMuted: { label: 'Funk Guitar · Muted', category: 'Pluck', homeLane: 'chords', synth: 'MRDR-3', dur: 0.25,
    note: 'The same clean funk guitar with the palm on the strings: every pick a dry '
      + 'scratch, mostly pick and quack, gone in a sixteenth. For the scratch between the chops.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.5, attack: 0.001, decay: 0.07, sustain: 0, release: 0.03, filter: { type: 'lowpass', slope: -12, freq: 1800, Q: 0.9, track: 0.6, env: { octaves: 1.2, attack: 0.001, decay: 0.04, sustain: 0, release: 0.03 } } },
      osc2: { type: 'pulse', width: 0.22, ratio: 1, gain: 0.45, detune: 4, attack: 0.001, decay: 0.06, sustain: 0, release: 0.03, filter: { type: 'bandpass', slope: -12, freq: 1500, Q: 1.6, track: 0.3 } },
      osc3: { type: 'noise', ratio: 1, gain: 0.14, color: 'white', attack: 0.001, decay: 0.025, sustain: 0, release: 0.01, filter: { type: 'bandpass', slope: -12, freq: 2600, Q: 1.2, track: 0 } },
    },
    global: {
      filter: { type: 'highpass', slope: -12, freq: 250, Q: 0.7, track: 0 },
      vca: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.03 },
    },
    humanize: { entry: 0.004, gain: 0.12 } },

  // ---- 80s–90s dance sketches (8 Oct 2026) ---------------------------------------
  //
  // Sounds for the acid, rave, garage and late-80s sketches in
  // work/local/_rave-sketches.mjs. All MRDR-3, because the acid line and the hoover are
  // dense lanes. The 303 pair is LEGATO: a note that overlaps the one before it slides
  // there without restriking the filter, which is the 303's slide; a note after a gap
  // strikes fresh. Acid 303 takes its ACCENT as velocity (`${lane}Velocity`): the preset is
  // the accented note and plain notes are struck softer, so one voice can accent and slide
  // (work/local/_acid-accent-proto.mjs). Acid 303 · Accent is the older two-lane way.
  mrdrAcid303: { label: 'Acid 303', category: 'Bass', synth: 'MRDR-3', dur: 0.6,
    note: 'The acid bass line: one saw into a resonant four-pole lowpass that the envelope '
      + 'flicks open on every strike and lets fall, a little drive behind it, and legato '
      + 'glide — overlap two notes and the second slides in without a new squelch. At full '
      + 'velocity it is the ACCENT; a softer note loses some level and up to 2.6 octaves '
      + 'of envelope. Open the cutoff slowly over a track and it does the rest.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 1, attack: 0.002, decay: 0.6, sustain: 0.7, release: 0.03 },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 210, Q: 14, track: 0.25, env: { octaves: 4.3, attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 } },
    },
    drive: 0.366414, shape: 'soft',
    velocity: { level: 0.4, filter: 2.6 },
    mode: 'legato', portamento: 0.06 },
  mrdrAcid303Accent: { label: 'Acid 303 · Accent', category: 'Bass', synth: 'MRDR-3', dur: 0.6,
    note: 'Acid 303 on an accented step: the same saw, the filter starting higher and '
      + 'thrown further on a shorter fall, more resonance and more drive — the note in the '
      + 'line that shouts. Also a hot acid lead on its own.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 1, attack: 0.001, decay: 0.5, sustain: 0.6, release: 0.03 },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 260, Q: 15, track: 0.25, env: { octaves: 4.4, attack: 0.001, decay: 0.12, sustain: 0, release: 0.05 } },
    },
    drive: 0.436898, shape: 'soft',
    mode: 'legato', portamento: 0.06 },
  mrdrAcid303Square: { label: 'Acid 303 · Square', category: 'Bass', synth: 'MRDR-3', dur: 0.6,
    note: 'Acid 303 on the other waveform, the square: hollower and rounder, the squelch more of '
      + 'a vowel. The same accent by velocity and the same legato slide.',
    layer: {
      osc1: { type: 'square', ratio: 1, gain: 1, attack: 0.002, decay: 0.6, sustain: 0.7, release: 0.03 },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 230, Q: 12, track: 0.25, env: { octaves: 4, attack: 0.001, decay: 0.16, sustain: 0, release: 0.05 } },
    },
    drive: 0.19, shape: 'soft',
    velocity: { level: 0.4, filter: 2.4 },
    mode: 'legato', portamento: 0.06 },
  mrdrAcid303Deep: { label: 'Acid 303 · Deep', category: 'Bass', synth: 'MRDR-3', dur: 0.6,
    note: 'Acid 303 with the cutoff down and the decay long: a darker, rubbery line that '
      + 'wobbles more than it squeals. The same accent by velocity and the same legato slide.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 1, attack: 0.002, decay: 0.7, sustain: 0.75, release: 0.04 },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 150, Q: 10, track: 0.25, env: { octaves: 3.6, attack: 0.001, decay: 0.26, sustain: 0, release: 0.06 } },
    },
    drive: 0.19, shape: 'soft',
    velocity: { level: 0.4, filter: 2.2 },
    mode: 'legato', portamento: 0.07 },
  mrdrHoover: { label: 'Hoover', category: 'Lead', synth: 'MRDR-3', dur: 1.2,
    note: 'The rave hoover: pulse waves with their width swimming, stacked wide in unison '
      + 'over a saw an octave down, scooping up into every note from a fifth below and '
      + 'smeared by a heavy chorus. Legato, so a riff swoops from note to note.',
    layer: {
      osc1: { type: 'pulse', width: 0.3, ratio: 1, gain: 0.7, attack: 0.004, decay: 0.6, sustain: 0.85, release: 0.25, unison: 4, spread: 34, stereo: 0.9, pwm: { type: 'sine', rate: 4.2, depth: 0.6, delay: 0 }, pitch: { semitones: -7, decay: 0.16 } },
      osc2: { type: 'sawtooth', ratio: 0.5, gain: 0.55, attack: 0.004, decay: 0.6, sustain: 0.85, release: 0.25, unison: 3, spread: 22, stereo: 0.6, pitch: { semitones: -7, decay: 0.16 } },
      osc3: { type: 'pulse', width: 0.5, ratio: 2, gain: 0.18, attack: 0.01, decay: 0.5, sustain: 0.6, release: 0.2, pwm: { type: 'sine', rate: 5.3, depth: 0.5, delay: 0 } },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 2600, Q: 1.2, track: 0.3, env: { octaves: 1.2, attack: 0.02, decay: 0.3, sustain: 0.5, release: 0.2 } },
    },
    drive: 0.266308, shape: 'soft',
    chorus: { mix: 0.6 },
    mode: 'legato', portamento: 0.09,
    trim: -1.493215 },
  mrdrRaveStab: { label: 'Rave Stab', category: 'Keys', homeLane: 'chords', synth: 'MRDR-3', dur: 0.6,
    note: 'The warehouse chord stab: two saws either side of the note and a square an '
      + 'octave down, under one resonant lowpass that snaps open and shut, with no sustain. '
      + 'Built to be played as one minor-seventh shape moved up and down whole, the way a '
      + 'chord-memory button plays it.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.7, detune: -6, attack: 0.001, decay: 0.4, sustain: 0, release: 0.08 },
      osc2: { type: 'sawtooth', ratio: 1, gain: 0.7, detune: 6, attack: 0.001, decay: 0.4, sustain: 0, release: 0.08 },
      osc3: { type: 'square', ratio: 0.5, gain: 0.3, attack: 0.001, decay: 0.3, sustain: 0, release: 0.06 },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 420, Q: 4, track: 0.4, env: { octaves: 3.2, attack: 0.001, decay: 0.14, sustain: 0, release: 0.06 } },
      vca: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.08 },
    },
    drive: 0.198512, shape: 'soft' },
  mrdrOrganBass: { label: 'Organ Bass', category: 'Bass', synth: 'MRDR-3', dur: 0.6,
    note: 'The house and garage organ bass: a sine at the note, a square an octave up '
      + 'behind a low filter for the reedy edge, and a third-harmonic click that speaks '
      + 'only on the strike. Round, short and punchy, so it bounces rather than holds.',
    layer: {
      osc1: { type: 'sine', ratio: 1, gain: 1, attack: 0.002, decay: 0.5, sustain: 0.35, release: 0.06 },
      osc2: { type: 'square', ratio: 2, gain: 0.3, attack: 0.002, decay: 0.3, sustain: 0.2, release: 0.05, filter: { type: 'lowpass', slope: -12, freq: 900, Q: 0.7, track: 0.3 } },
      osc3: { type: 'sine', ratio: 3, gain: 0.35, attack: 0.001, decay: 0.05, sustain: 0, release: 0.03 },
    },
    global: {
      vca: { attack: 0.002, decay: 0.45, sustain: 0.4, release: 0.06 },
    },
    drive: 0.131265, shape: 'soft',
    mode: 'mono' },
  mrdrOrchHit: { label: 'Orchestra Hit', category: 'Orch', homeLane: 'chords', synth: 'MRDR-3', dur: 0.8,
    note: 'The eighties sampler orchestra hit: a wide saw section and a brass pulse struck '
      + 'together with a burst of noise for the bows and the drum, the pitch dropping a '
      + 'touch as it lands, gone in under half a second. Play it as an octave and a fifth.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.7, attack: 0.002, decay: 0.45, sustain: 0, release: 0.15, unison: 4, spread: 24, stereo: 0.8, pitch: { semitones: 0.7, decay: 0.1 } },
      osc2: { type: 'pulse', width: 0.32, ratio: 1, gain: 0.5, attack: 0.002, decay: 0.35, sustain: 0, release: 0.12, pitch: { semitones: 0.7, decay: 0.1 } },
      osc3: { type: 'noise', ratio: 1, gain: 0.12, color: 'pink', attack: 0.001, decay: 0.12, sustain: 0, release: 0.05, filter: { type: 'bandpass', slope: -12, freq: 700, Q: 0.9, track: 0 } },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 2200, Q: 0.9, track: 0.3, env: { octaves: 1.6, attack: 0.001, decay: 0.18, sustain: 0, release: 0.1 } },
      vca: { attack: 0.001, decay: 0.42, sustain: 0, release: 0.14 },
    },
    drive: 0.2001, shape: 'soft' },
  mrdrGarageWobble: { label: 'Garage Wobble Bass', category: 'Bass', synth: 'MRDR-3', dur: 1.2,
    note: 'The speed-garage bass: two detuned saws and a sine sub-octave under one '
      + 'lowpass that an LFO locked to the tempo opens and shuts every eighth note, so a '
      + 'held note talks in time with the beat.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.8, detune: 10, attack: 0.004, decay: 1, sustain: 0.9, release: 0.1 },
      osc2: { type: 'sawtooth', ratio: 1, gain: 0.8, detune: -10, attack: 0.004, decay: 1, sustain: 0.9, release: 0.1 },
      osc3: { type: 'sine', ratio: 0.5, gain: 0.8, attack: 0.004, decay: 1, sustain: 0.95, release: 0.1 },
      lfo: { type: 'sine', target: 'filter', sync: 'tempo', division: '1/8', depth: 0.7 },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 260, Q: 5, track: 0.3 },
      vca: { attack: 0.004, decay: 1, sustain: 0.92, release: 0.1 },
    },
    drive: 0.353181, shape: 'soft',
    mode: 'mono' },
  darkMetalChime: { label: 'Dark Metal Chime', category: 'Bells', synth: 'TNGR-2', dur: 2.6,
    note: 'A darker metallic evolution with controlled beating between oscillators.',
    tngr2: { oscA: { table: 'alloy', position: 0.55, envAmount: -0.3, level: 0.93, unison: 2, spread: 5 }, oscB: { table: 'bellFold', position: 0.38, level: 0.25, interval: -12, detune: 7 }, amp: { attack: 0.001, decay: 0.373, sustain: 0.18, release: 0.684 }, positionEnv: { attack: 0, decay: 0.9, sustain: 0.55 }, filter: { type: 'lowpass', cutoff: 2970, resonance: 2.75 }, master: { gain: 0.5 }, filterEnv: { amount: 0.2 } },
    chorus: { mix: 0.03 },
    trim: 0 },
};

// User presets live in their own tables rather than beside the built-in library.
// The split is intentional: entries in TONE/NOISE/DRUM are shipped library sounds
// and must remain read-only, while these tables are the desk's editable collection.
// They start empty in source control and are populated by the mixer when a user saves
// a new sound. Keeping the kind in the table name means loading remains as simple as
// the library tables above and the source writer can preserve the same readable shape.
const USER_TONE = {
  amHollow2: { label: 'AM Hollow 2', category: 'Lead', synth: 'RMND-2', dur: 1.2,
    note: 'Ring-modulated and slightly out of tune with itself. Reads as a voice rather than a '
      + 'synth.',
    options: {
      harmonicity: 2,
      oscillator: { type: 'square' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.008, decay: 0.2, sustain: 0.6, release: 0.3 },
      modulationEnvelope: { attack: 0.05, decay: 0.2, sustain: 0.5, release: 0.3 },
    } },
  sawtoothTone2: { label: 'Raw Saw', category: 'Lead', synth: 'KNDO-5', dur: 1.2,
    note: 'A direct single-oscillator sawtooth replacement for the engine voice.',
    fixedLength: 0.063,
    waveform: 'sawtooth',
    attack: 0.01, release: 0.015, trim: 0,
    starter: false },
  sintone: { label: 'Sintone', category: 'Lead', synth: 'KNDO-5', dur: 1,
    note: 'A direct single-oscillator square-wave replacement for the engine voice.',
    options: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0, sustain: 1, release: 0.01, attackCurve: 'exponential' },
    },
    fixedLength: 0.144,
    waveform: 'sine',
    attack: 0.001, release: 0.089, trim: 0.8,
    vibrato: { depth: 0, rate: 10.9 },
    mono: false,
    portamento: 0,
    starter: false },
  roundBass: { label: 'Round Bass', category: 'Bass', synth: 'CRLS-1', dur: 1.8,
    note: 'Saw through a lowpass that closes as the note decays — the classic synth bass.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.001, decay: 1.24, sustain: 0.29, release: 0.8 },
      filter: { type: 'lowpass', Q: 2.9, rolloff: -24 },
      filterEnvelope: { attack: 0.0016, decay: 0.7207, sustain: 0.0782, release: 0.1477, baseFrequency: 110, octaves: 3.9, attackCurve: 'exponential', decayCurve: 'exponential', releaseCurve: 'exponential' },
    },
    starter: false },
  squareMono: { label: 'Square Mono', category: 'Bass', synth: 'CRLS-1', dur: 1.8,
    note: 'Saw through a lowpass that closes as the note decays — the classic synth bass.',
    options: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.22, sustain: 0, release: 0.27 },
      filter: { type: 'lowpass', Q: 0.1, rolloff: -24 },
      filterEnvelope: { attack: 0.001, decay: 1.22, sustain: 0.13, release: 0.3, baseFrequency: 18000, octaves: 0 },
    },
    starter: false,
    transpose: 0,
    mono: true },
  celeste2: { label: 'Tiny Celeste', category: 'Bells', synth: 'RMND-2', dur: 4,
    note: 'Small, high and pure, with a very long tail. Made for the twinkle lane.',
    options: {
      harmonicity: 3.765,
      modulationIndex: 2.4,
      oscillator: { type: 'square' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.001, decay: 1.6, sustain: 0.08, release: 1.6 },
      modulationEnvelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.4 },
    },
    starter: false,
    transpose: 24,
    vibrato: { depth: 0.1088, rate: 5 },
    trim: 0 },
  thickSquareGlide: { label: 'Thick Square Glide', category: 'Keys', synth: 'MRDR-3', dur: 1.5,
    note: 'Three squares at the same pitch, seven cents either side of centre. No filter, no '
      + 'sweep, no modulation — the shortest thing this synth can be and still be one.',
    layer: {
      osc1: { type: 'square', ratio: 1, detune: 0, gain: 0.6, attack: 0, decay: 0.25, sustain: 0.75, release: 0.12, pitch: { decay: 3.155, sustain: 0.14, semitones: 0 } },
      osc2: { type: 'square', ratio: 0.5, detune: -7, gain: 0.6, attack: 0, decay: 0.25, sustain: 0.75, release: 0.12 },
      osc3: { type: 'square', ratio: 0.25, detune: 7, gain: 0.6, attack: 0, decay: 0.25, sustain: 0.75, release: 0.12 },
    },
    global: {
      filter: { type: 'lowpass', freq: 5590, Q: 3.1, env: { octaves: 10, decay: 3.099, sustain: 0.86 } },
    },
    starter: false,
    chorus: { mix: 0 },
    vibrato: { depth: 0.01, delay: 0.025 },
    mode: 'legato',
    portamento: 0.038 },
  memoryOrgan2: { label: 'Memory Organ 2', category: 'Keys', synth: 'TNGR-2', dur: 4,
    note: 'A slowly shifting drawbar-like spectrum with stable chord level.',
    tngr2: { oscA: { table: 'organShift', position: 0.2, envAmount: 0.28, level: 0.8, unison: 2, spread: 6 }, oscB: { table: 'choirBreath', position: 0.35, envAmount: 0.2, level: 0.16, detune: 14 }, amp: { attack: 0.027, decay: 0.4, sustain: 0.84, release: 0.65 }, positionEnv: { attack: 0.25, decay: 1.1, sustain: 0.3 }, filter: { type: 'lowpass', cutoff: 5200, resonance: 1.2 }, master: { gain: 0.56 } },
    starter: false },
  testSIMPLESQR: { label: 'TEST SIMPLE SQR', category: 'Orch', synth: 'MRDR-3', dur: 8,
    note: 'SIMPLE TEST SQUARE - 1 osc',
    layer: {
      osc1: { type: 'square', ratio: 1, gain: 0.5, attack: 0.039167, decay: 2, sustain: 0.85, release: 2.5104, attackCurve: 'lin', unison: 2, spread: 9, stereo: 0.85 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 1530, Q: 0.8, track: 0.3, env: { octaves: 1.4, attack: 0.8, decay: 2.4, sustain: 0.6, release: 1 } },
      vca: { attack: 0.043083, decay: 2.4, sustain: 0.9, release: 3.138, attackCurve: 'lin' },
    },
    bypassed: {
      "layer.osc3": { type: 'sawtooth', ratio: 0.5, gain: 0.2, attack: 0.03525, decay: 2.4, sustain: 0.9, release: 2.5104, attackCurve: 'lin' },
      "layer.osc2": { type: 'pulse', width: 0.46, ratio: 1, detune: -7, gain: 0.42, attack: 0.047, decay: 2.2, sustain: 0.82, release: 2.7196, attackCurve: 'lin', unison: 2, spread: 13, stereo: 0.7, pwm: { type: 'sine', rate: 0.37, depth: 0.58, delay: 0 } },
    },
    vibrato: { depth: 0.22, rate: 4.2, delay: 1.4 },
    starter: false },
  simpleStrings: { label: 'Simple Strings', category: 'Lead', synth: 'CRLS-1', dur: 1.2,
    note: 'Cheap stringlike sound',
    options: {
      oscillator: { type: 'fatsawtooth', spread: 19, count: 2 },
      envelope: { attack: 0.006, decay: 0.15, sustain: 0.88, release: 0.367 },
      filter: { type: 'lowpass', Q: 1.6, rolloff: -12 },
      filterEnvelope: { attack: 0.0078, decay: 0.0765, sustain: 0.2268, release: 0.09, baseFrequency: 3170, octaves: 1.2, attackCurve: 'linear', decayCurve: 'exponential', releaseCurve: 'exponential' },
    },
    starter: false,
    vibrato: { depth: 0.0408 } },
  // ---- WUB: twelve dubstep wobbles (23 Sep 2026) --------------------------------
  // Neither synth's LFO can follow the song tempo (MRDR-3's is Hz only; TNGR-2 dropped
  // its sync), so each rate is written for 140 BPM, dubstep's home tempo, and the label
  // says which note value it lands on there. At another tempo: rate × bpm / 140.
  // 1/2 = 1.167 Hz · 1/4 = 2.333 · 1/8 = 4.667 · 1/8T = 7 · 1/16 = 9.333.
  // MRDR-3 ones wobble the FILTER (the classic wub); TNGR-2 ones sweep a vowel or
  // dark-to-air WAVETABLE (the talking "yoi").
  wubClassic: { label: 'WUB Classic 1/8', category: 'Bass', synth: 'MRDR-3', dur: 1.8,
    note: 'The textbook wub: saw plus a square an octave down through a resonant 24 dB '
      + 'lowpass that a sine LFO opens and shuts on the eighth note at 140.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.8, attack: 0.004, decay: 0.3, sustain: 0.9, release: 0.12, unison: 2, spread: 10 },
      osc2: { type: 'square', ratio: 0.5, gain: 0.55, attack: 0.004, decay: 0.3, sustain: 0.9, release: 0.12 },
      lfo: { type: 'sine', rate: 4.667, depth: 0.75, target: 'filter' },
    },
    global: { filter: { type: 'lowpass', slope: -24, freq: 420, Q: 6, track: 0.3 } },
    drive: 0.454577, shape: 'soft', mode: 'mono', portamento: 0.03, starter: false },
  wubSlow: { label: 'WUB Slow 1/4', category: 'Bass', synth: 'MRDR-3', dur: 2.4,
    note: 'The big lazy quarter-note wobble: two detuned saws and a sine sub, heavy '
      + 'resonance, the filter breathing once a beat.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.7, attack: 0.005, decay: 0.4, sustain: 0.9, release: 0.15, unison: 2, spread: 14 },
      osc2: { type: 'sawtooth', ratio: 1, detune: -9, gain: 0.5, attack: 0.005, decay: 0.4, sustain: 0.9, release: 0.15 },
      osc3: { type: 'sine', ratio: 0.5, gain: 0.6, attack: 0.005, decay: 0.4, sustain: 1, release: 0.15 },
      lfo: { type: 'sine', rate: 2.333, depth: 0.8, target: 'filter' },
    },
    global: { filter: { type: 'lowpass', slope: -24, freq: 380, Q: 8, track: 0.2 } },
    drive: 0.438147, shape: 'soft', mode: 'mono', portamento: 0.04, starter: false },
  wubTriplet: { label: 'WUB Triplet 1/8T', category: 'Bass', synth: 'MRDR-3', dur: 1.8,
    note: 'The rolling triplet wub — three wobbles to the beat, the one that makes a drop '
      + 'lurch. Square and saw, driven.',
    layer: {
      osc1: { type: 'square', ratio: 1, gain: 0.7, attack: 0.003, decay: 0.3, sustain: 0.9, release: 0.1 },
      osc2: { type: 'sawtooth', ratio: 1, detune: 7, gain: 0.6, attack: 0.003, decay: 0.3, sustain: 0.9, release: 0.1 },
      lfo: { type: 'sine', rate: 7, depth: 0.95, target: 'filter' },
    },
    global: { filter: { type: 'lowpass', slope: -24, freq: 420, Q: 7, track: 0.3 } },
    drive: 0.463256, shape: 'soft', mode: 'mono', portamento: 0.02, starter: false },
  wubStutter: { label: 'WUB Stutter 1/16', category: 'Bass', synth: 'MRDR-3', dur: 1.6,
    note: 'A SQUARE LFO on the sixteenth: the filter slams between shut and open, so the '
      + 'bass chops like a gate with a mouth.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.8, attack: 0.002, decay: 0.3, sustain: 0.9, release: 0.08, unison: 2, spread: 12 },
      osc2: { type: 'pulse', width: 0.3, ratio: 0.5, gain: 0.5, attack: 0.002, decay: 0.3, sustain: 0.9, release: 0.08 },
      lfo: { type: 'square', rate: 9.333, depth: 0.7, target: 'filter' },
    },
    global: { filter: { type: 'lowpass', slope: -24, freq: 520, Q: 5, track: 0.3 } },
    drive: 0.478581, shape: 'soft', mode: 'mono', portamento: 0.02, starter: false },
  wubHalf: { label: 'WUB Half 1/2', category: 'Bass', synth: 'MRDR-3', dur: 3,
    note: 'One slow triangle swell every two beats with the resonance right up — the '
      + 'half-time breakdown wobble that whistles at the top.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.8, attack: 0.01, decay: 0.5, sustain: 0.95, release: 0.2, unison: 3, spread: 16, stereo: 0.4 },
      osc2: { type: 'sine', ratio: 0.5, gain: 0.55, attack: 0.01, decay: 0.5, sustain: 1, release: 0.2 },
      lfo: { type: 'triangle', rate: 1.167, depth: 0.85, target: 'filter' },
    },
    global: { filter: { type: 'lowpass', slope: -24, freq: 340, Q: 10, track: 0.2 } },
    drive: 0.296956, shape: 'soft', mode: 'mono', portamento: 0.05, starter: false },
  wubReese: { label: 'WUB Reese Roll', category: 'Bass', synth: 'MRDR-3', dur: 2.4,
    note: 'A Reese — wide detuned saws beating against each other — under a gentle '
      + 'half-note filter roll. The DnB cousin of the wub; darker and more menacing.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.7, attack: 0.01, decay: 0.5, sustain: 0.95, release: 0.2, unison: 3, spread: 25, stereo: 0.5 },
      osc2: { type: 'sawtooth', ratio: 1, detune: -14, gain: 0.6, attack: 0.01, decay: 0.5, sustain: 0.95, release: 0.2 },
      osc3: { type: 'sine', ratio: 0.5, gain: 0.5, attack: 0.01, decay: 0.5, sustain: 1, release: 0.2 },
      lfo: { type: 'sine', rate: 1.167, depth: 0.5, target: 'filter' },
    },
    global: { filter: { type: 'lowpass', slope: -24, freq: 650, Q: 2.5, track: 0.3 } },
    drive: 0.454577, shape: 'soft', mode: 'mono', portamento: 0.06, starter: false },
  wubFmGrowl: { label: 'WUB FM Growl', category: 'Bass', synth: 'MRDR-3', dur: 1.8,
    note: 'FM grit in the saw and a folding drive after it, wobbled on the eighth: '
      + 'the snarling mid-range growl rather than the round sub wub.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.8, attack: 0.003, decay: 0.3, sustain: 0.9, release: 0.1,
        fm: { ratio: 1, index: 3, attack: 0.005, decay: 0.8 } },
      osc2: { type: 'sine', ratio: 0.5, gain: 0.5, attack: 0.003, decay: 0.3, sustain: 1, release: 0.1 },
      lfo: { type: 'sine', rate: 4.667, depth: 0.65, target: 'filter' },
    },
    global: { filter: { type: 'lowpass', slope: -24, freq: 700, Q: 5, track: 0.4 } },
    drive: 0.581378, shape: 'fold', tone: { freq: 6000 }, mode: 'mono', portamento: 0.03, starter: false,
    trim: -1.309777 },
  wubSyncScreech: { label: 'WUB Sync Screech', category: 'Bass', synth: 'MRDR-3', dur: 1.6,
    note: 'Hard-synced saws — the tearing, vocal edge — through a brighter triplet wobble. '
      + 'Sits higher than the others: the lead wub of a drop.',
    sync: '1+2',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.6, attack: 0.003, decay: 0.3, sustain: 0.9, release: 0.1 },
      osc2: { type: 'sawtooth', ratio: 2.5, gain: 0.7, attack: 0.003, decay: 0.3, sustain: 0.9, release: 0.1 },
      osc3: { type: 'square', ratio: 0.5, gain: 0.45, attack: 0.003, decay: 0.3, sustain: 0.9, release: 0.1 },
      lfo: { type: 'sine', rate: 7, depth: 0.9, target: 'filter' },
    },
    global: { filter: { type: 'lowpass', slope: -24, freq: 750, Q: 6, track: 0.5 } },
    drive: 0.441115, shape: 'soft', mode: 'mono', portamento: 0.02, starter: false },
  wubRobot: { label: 'WUB Robot Talk', category: 'Bass', synth: 'MRDR-3', dur: 1.8,
    note: 'Sample-and-hold on the sixteenth: the filter jumps to a new random place every '
      + 'step, so the bass jabbers like a robot rather than swinging.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.8, attack: 0.002, decay: 0.3, sustain: 0.9, release: 0.1, unison: 2, spread: 10 },
      osc2: { type: 'square', ratio: 0.5, gain: 0.5, attack: 0.002, decay: 0.3, sustain: 0.9, release: 0.1 },
      lfo: { type: 'samplehold', rate: 9.333, depth: 0.7, target: 'filter' },
    },
    global: { filter: { type: 'lowpass', slope: -24, freq: 600, Q: 7, track: 0.3 } },
    drive: 0.454577, shape: 'soft', mode: 'mono', portamento: 0.015, starter: false },
  wubYoi: { label: 'Talking Wobble Bass', category: 'Bass', synth: 'TNGR-2', dur: 1.8,
    note: 'The talking "yoi-yoi": the LFO walks a vowel table A-E-I-O-U on the eighth, '
      + 'with a saw an octave down for weight. A mouth, not a filter.',
    mode: 'mono', portamento: 0.03,
    tngr2: {
      oscA: { table: 'vowelAEIOU', position: 0.2, lfoAmount: 0.9, level: 0.85, unison: 2, spread: 9 },
      oscB: { table: 'sawForm', position: 0.3, level: 0.4, interval: -12 },
      amp: { attack: 0.004, decay: 0.3, sustain: 0.9, release: 0.12 },
      filter: { type: 'lowpass', cutoff: 3200, resonance: 4 },
      lfo1: { shape: 'sine', rate: 4.667 } },
    starter: false },
  wubGlassYoi: { label: 'WUB Glass Yowl', category: 'Bass', synth: 'TNGR-2', dur: 2.4,
    note: 'A slower, glassier vowel yowl on the quarter note, triangle LFO, with a '
      + 'spectral-PWM sub churning underneath.',
    mode: 'mono', portamento: 0.05,
    tngr2: {
      oscA: { table: 'vowelGlass', position: 0.1, lfoAmount: 0.85, level: 0.8, unison: 2, spread: 12, stereo: 0.4 },
      oscB: { table: 'spectralPWM', position: 0.3, lfoAmount: -0.4, level: 0.45, interval: -12 },
      amp: { attack: 0.006, decay: 0.4, sustain: 0.9, release: 0.15 },
      filter: { type: 'lowpass', cutoff: 2800, resonance: 5 },
      lfo1: { shape: 'triangle', rate: 2.333 } },
    starter: false },
  wubDarkAir: { label: 'WUB Dark To Air', category: 'Bass', synth: 'TNGR-2', dur: 1.8,
    note: 'A saw-shaped LFO drags the dark-to-air table from murk to fizz and snaps back, '
      + 'eighth notes: the lopsided "wub-wub" that opens and slams shut.',
    mode: 'mono', portamento: 0.02,
    tngr2: {
      oscA: { table: 'darkToAir', position: 0.05, lfoAmount: 0.95, level: 0.85, unison: 2, spread: 8 },
      oscB: { table: 'basic', position: 0, level: 0.5, interval: -12 },
      amp: { attack: 0.003, decay: 0.3, sustain: 0.9, release: 0.1 },
      filter: { type: 'lowpass', cutoff: 2400, resonance: 6 },
      lfo1: { shape: 'saw', rate: 4.667 } },
    starter: false },
  siren: { label: 'Siren', category: 'FX', synth: 'MRDR-3', dur: 3,
    note: 'Song-local (SHORT CIRCUIT): square + saw with a triangle pitch LFO of ±5 semitones, '
      + 'one cycle a bar at 140. Hold a note for the bar.',
    layer: {
      osc1: { type: 'square', ratio: 1, gain: 0.6, attack: 0.2, decay: 0.3, sustain: 1, release: 0.5 },
      osc2: { type: 'sawtooth', ratio: 1, detune: 8, gain: 0.35, attack: 0.2, decay: 0.3, sustain: 1, release: 0.5 },
      lfo: { type: 'triangle', rate: 0.583333, depth: 0.42, target: 'pitch' },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 2400, Q: 1.5, track: 0.3 },
    },
    drive: 0.245313, shape: 'soft',
    starter: false },
  newSyncRazorLead: { label: 'New Sync Razor Lead', category: 'Lead', synth: 'MRDR-3', dur: 1.6,
    note: 'Osc 2 is hard-synced to Osc 1 at a non-integer interval, making a bright reset edge '
      + 'that stays pitched while the shared filter snaps shut.',
    sync: '1+2',
    layer: {
      osc1: { type: 'sine', ratio: 1, gain: 0.683, attack: 0.004, decay: 0.45, sustain: 0.72, release: 0.16, pitch: { semitones: 0, decay: 0.324 } },
      osc2: { type: 'sawtooth', ratio: 2.378414, gain: 0.92, attack: 0.003, decay: 0.42, sustain: 0.68, release: 0.14, pitch: { semitones: 12, attack: 0, decay: 0.114, sustain: 0.17, release: 0.007 }, filter: { type: 'lowpass', freq: 2190, Q: 0.1 } },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 520, Q: 2.55, track: 0.35, env: { octaves: 4.3, attack: 0.003, decay: 0.38, sustain: 0.24, release: 0.16 } },
      vca: { attack: 0.003, decay: 0.48, sustain: 0.75, release: 0.18 },
    },
    drive: 0.337271, shape: 'soft',
    tone: { freq: 10500 },
    mono: true,
    portamento: 0.035,
    starter: false,
    trim: -0.429826 },
  seedFutureBassBass: { label: 'Digital Round Bass · Future Bass', category: 'Bass', synth: 'TNGR-2', dur: 1.8,
    note: 'A plain, warm single-oscillator bass with a stable fundamental.',
    drive: 0.107517,
    tngr2: { oscA: { table: 'basic', position: 0.18, level: 0.86, unison: 1 }, amp: { attack: 0.006, decay: 0.38, sustain: 0.72, release: 0.16 }, filter: { type: 'lowpass', cutoff: 1250, resonance: 0.96 }, filterEnv: { amount: 0.7, attack: 0.002, decay: 0.3, sustain: 0.25 }, positionEnv: { attack: 0, decay: 0.25, sustain: 0 }, master: { gain: 0.7 } },
    starter: false },
  seedFutureBassSub: { label: 'WUB Glass Yowl · Future Bass', category: 'Bass', synth: 'TNGR-2', dur: 2.4,
    note: 'A slower, glassier vowel yowl on the quarter note, triangle LFO, with a '
      + 'spectral-PWM sub churning underneath.',
    drive: 0.145465,
    mode: 'mono',
    portamento: 0.05,
    tngr2: { oscA: { table: 'vowelGlass', position: 0.1, lfoAmount: 0.85, level: 0.8, unison: 2, spread: 12, stereo: 0.4 }, oscB: { table: 'spectralPWM', position: 0.3, lfoAmount: -0.4, level: 0.45, interval: -12 }, amp: { attack: 0.006, decay: 0.4, sustain: 0.9, release: 0.15 }, filter: { type: 'lowpass', cutoff: 2800, resonance: 5 }, lfo1: { shape: 'triangle', rate: 2.95 }, positionEnv: { attack: 0.095 } },
    starter: false },
  seedFutureBassSaws: { label: 'Super Saw · Future Bass', category: 'Lead', synth: 'CRLS-1', dur: 1.4,
    note: 'Three sawtooths thirty cents apart — the trance lead, and the widest single sound '
      + 'here.',
    origin: 'Tonejs/Presets Synth/SuperSaw',
    options: {
      oscillator: { type: 'fatsawtooth', count: 3, spread: 30 },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.4, attackCurve: 'exponential' },
    },
    starter: false },
  seedFutureBassPiano: { label: 'Bright Pop Grand · Future Bass', category: 'Keys', synth: 'MRDR-3', dur: 2.8,
    note: 'FM inside the layers: a 1:1 operator whose index falls away over half a second '
      + '(brightness that decays, which is what a struck string does), and a slightly '
      + 'inharmonic 7.01 operator on the octave for the metal in the attack.',
    layer: {
      osc1: { type: 'sine', ratio: 1, gain: 0.82, attack: 0.001, decay: 2.8, sustain: 0, release: 0.4, unison: 2, spread: 4, stereo: 0.35, fm: { type: 'sine', ratio: 1, index: 1.6, attack: 0.001, decay: 0.5 } },
      osc2: { type: 'sine', ratio: 2, gain: 0.3, attack: 0.001, decay: 1.4, sustain: 0, release: 0.3, fm: { type: 'sine', ratio: 7.01, index: 0.5, attack: 0.001, decay: 0.08 } },
      osc3: { type: 'noise', ratio: 1, gain: 0.08, color: 'white', attack: 0.001, decay: 0.022, sustain: 0, release: 0.02, filter: { type: 'bandpass', slope: -12, freq: 3000, Q: 1, track: 0.3 } },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 7000, Q: 0.5, track: 0.3 },
    },
    humanize: { entry: 0.005, gain: 0.07 },
    starter: false },
  seedFutureBassPad: { label: 'Glass Choir · Future Bass', category: 'Pad', synth: 'TNGR-2', dur: 7,
    note: 'Vocal and glass motion without using the Vowel insert.',
    tngr2: { oscA: { table: 'choirBreath', position: 0.08, envAmount: 0.75, level: 0.7, unison: 2, spread: 10, stereo: 0.7 }, oscB: { table: 'vowelGlass', position: 0.62, envAmount: -0.35, level: 0.3, unison: 2, spread: 13, stereo: 0.7, interval: 12 }, amp: { attack: 0.031, decay: 2.2, sustain: 0.76, release: 1.948 }, positionEnv: { attack: 2, decay: 3, sustain: 0.6 }, filter: { type: 'lowpass', cutoff: 4700, resonance: 2.4 }, lfo1: { shape: 'sine', rate: 0.08, amount: 0.18 }, master: { gain: 0.5 } },
    starter: false },
  seedFutureBassSquare: { label: 'Aiueo · Future Bass', category: 'Lead', synth: 'JMJR-4', dur: 1.5,
    note: 'The five Japanese vowels in their own order, one per step: a walk through the vowel '
      + 'space.',
    jmjr4: { voice: 'chorister', line: 'aah eeh ooh eh oh', morphTo: 'AH', unison: 2, spread: 16, tilt: 2, amp: { attack: 0.06, decay: 0.3, sustain: 1, release: 0.45 } },
    vibrato: { depth: 0.21, rate: 5, delay: 0.25 },
    starter: false },
  seedFutureBassBell: { label: 'Music Box · Future Bass', category: 'Bells', synth: 'RMND-2', dur: 3,
    note: 'Thin, high and slightly sour, with the click of the comb in the attack.',
    options: {
      harmonicity: 6.03,
      modulationIndex: 7,
      oscillator: { type: 'sine' },
      modulation: { type: 'square' },
      envelope: { attack: 0.001, decay: 1, sustain: 0.01, release: 1 },
      modulationEnvelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.1 },
    },
    starter: false },
  seedFutureBassMegaSaw: { label: 'Mega Saw Lead · Future Bass', category: 'Lead', synth: 'MRDR-3', dur: 1.6,
    note: 'Nine oscillators. Two unison saws a fifth apart, a sub under them, all through one '
      + 'shared filter that opens across every note — the shared stage is the whole point, '
      + 'because nine separate filters would be nine sounds instead of one.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.85, attack: 0.006, decay: 0.5, sustain: 0.8, release: 0.18, unison: 4, spread: 26, stereo: 0.5 },
      osc2: { type: 'sawtooth', ratio: 1.4983, gain: 0.4, attack: 0.01, decay: 0.5, sustain: 0.7, release: 0.18, unison: 4, spread: 34, stereo: 0.65 },
      osc3: { type: 'pulse', width: 0.5, ratio: 0.5, gain: 0.42, attack: 0.004, decay: 0.6, sustain: 0.85, release: 0.16, pwm: { type: 'sine', rate: 0.42, depth: 0.5, delay: 0.1 } },
      lfo: { type: 'sine', rate: 5.4, depth: 0.12, target: 'filter', delay: 0.4 },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 380, Q: 2.2, track: 0.5, env: { octaves: 4.6, attack: 0.012, decay: 0.55, sustain: 0.42, release: 0.22 } },
      vca: { attack: 0.006, decay: 0.5, sustain: 0.85, release: 0.24 },
    },
    drive: 0.356988, shape: 'soft',
    tone: { freq: 12000 },
    vibrato: { depth: 0.1, rate: 5.6, delay: 0.5 },
    starter: false,
    trim: -0.408862 },
  seedFutureBassArp: { label: 'Plain Saw · Future Bass', category: 'Lead', synth: 'TNGR-2', dur: 2,
    note: 'A simple filtered sawtooth synth with no unison or second oscillator.',
    tngr2: { oscA: { table: 'basic', position: 0.5, level: 0.82, unison: 1 }, amp: { attack: 0.01, decay: 0.32, sustain: 0.76, release: 0.2 }, filter: { type: 'lowpass', cutoff: 3400, resonance: 1.68 }, filterEnv: { amount: 0.9, attack: 0.005, decay: 0.28, sustain: 0.36 }, positionEnv: { attack: 0, decay: 0.25, sustain: 0 }, master: { gain: 0.61 } },
    starter: false },
  seedFutureBassChoir: { label: 'Synth Choir Aah · Future Bass', category: 'Orch', synth: 'MRDR-3', dur: 8,
    note: 'Three static bandpass formants on the /a/ vowel — 800, 1150 and 2900 Hz — with the '
      + 'pitch moving underneath them. Delayed vibrato and a slow swell do the rest: this is '
      + 'how a voice works, not an impression of one.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.9, attack: 0.1204, decay: 1.2, sustain: 0.85, release: 0.9, attackCurve: 'lin', unison: 3, spread: 9, stereo: 0.8, filter: { type: 'bandpass', slope: -12, freq: 800, Q: 7, track: 0 } },
      osc2: { type: 'sawtooth', ratio: 1, gain: 0.55, detune: 6, attack: 0.14448, decay: 1.4, sustain: 0.8, release: 0.9, attackCurve: 'lin', unison: 2, spread: 13, stereo: 0.7, filter: { type: 'bandpass', slope: -12, freq: 1150, Q: 9, track: 0 } },
      osc3: { type: 'sawtooth', ratio: 1, gain: 0.3, detune: -7, attack: 0.172, decay: 1.6, sustain: 0.7, release: 1, attackCurve: 'lin', unison: 2, spread: 16, stereo: 0.9, filter: { type: 'bandpass', slope: -12, freq: 2900, Q: 11, track: 0 } },
      lfo: { type: 'sine', rate: 0.7, depth: 0.14, target: 'level', delay: 0.9 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 3800, Q: 0.7, track: 0.3, env: { octaves: 1.3, attack: 0.6, decay: 1.6, sustain: 0.55, release: 0.9 } },
      vca: { attack: 0.1548, decay: 1.6, sustain: 0.88, release: 1.2, attackCurve: 'lin' },
    },
    drive: 0.033398, shape: 'soft',
    humanize: { entry: 0.022 },
    vibrato: { depth: 0.18, rate: 5.2, delay: 0.6, spread: 0.75 },
    starter: false },
  seedFutureBassThird: { label: 'Bright Pop Grand · Future Bass', category: 'Keys', synth: 'MRDR-3', dur: 2.8,
    note: 'FM inside the layers: a 1:1 operator whose index falls away over half a second '
      + '(brightness that decays, which is what a struck string does), and a slightly '
      + 'inharmonic 7.01 operator on the octave for the metal in the attack.',
    layer: {
      osc1: { type: 'sine', ratio: 1, gain: 0.82, attack: 0.001, decay: 2.8, sustain: 0, release: 0.4, unison: 2, spread: 4, stereo: 0.35, fm: { type: 'sine', ratio: 1, index: 1.6, attack: 0.001, decay: 0.5 } },
      osc2: { type: 'sine', ratio: 2, gain: 0.3, attack: 0.001, decay: 1.4, sustain: 0, release: 0.3, fm: { type: 'sine', ratio: 7.01, index: 0.5, attack: 0.001, decay: 0.08 } },
      osc3: { type: 'noise', ratio: 1, gain: 0.08, color: 'white', attack: 0.001, decay: 0.022, sustain: 0, release: 0.02, filter: { type: 'bandpass', slope: -12, freq: 3000, Q: 1, track: 0.3 } },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 7000, Q: 0.5, track: 0.3 },
    },
    humanize: { entry: 0.005, gain: 0.07 },
    starter: false },
  seedFutureBassCounter: { label: 'Steady Celeste · Future Bass', category: 'Bells', synth: 'RMND-2', dur: 4,
    note: 'Small, high and pure, with a very long tail. Made for the twinkle lane.',
    options: {
      harmonicity: 3.765,
      modulationIndex: 2.4,
      oscillator: { type: 'square' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.001, decay: 1.6, sustain: 0.01, release: 1.6 },
      modulationEnvelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.4 },
    },
    starter: false,
    transpose: 24,
    vibrato: { depth: 0.0544 },
    trim: 0 },
  seedReggaetonBass: { label: 'Distorted 808 · Reggaeton', category: 'Bass', synth: 'MRDR-3', dur: 2,
    note: 'The trap 808 pushed into a shaper: a sine that drops a few semitones into its note, '
      + 'driven hard enough to grow upper harmonics so it reads on a phone speaker, with a '
      + 'long tail that is the note itself.',
    layer: {
      osc1: { type: 'sine', ratio: 1, gain: 1, attack: 0.002, decay: 1.6, sustain: 0.5, release: 0.3, pitch: { semitones: 7, decay: 0.05 } },
      osc2: { type: 'triangle', ratio: 1, gain: 0.25, attack: 0.002, decay: 0.2, sustain: 0.2, release: 0.2 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 2200, Q: 0.7, track: 0.2 },
      vca: { attack: 0.002, decay: 1.6, sustain: 0.55, release: 0.3 },
    },
    drive: 0.7, shape: 'soft',
    starter: false },
  seedReggaetonSub: { label: 'Sub Sine · Reggaeton', category: 'Bass', synth: 'CRLS-1', dur: 2.2,
    note: 'Pure weight, no harmonics. Wants room underneath it and a lead up top.',
    options: {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.012, decay: 0.3, sustain: 0.8, release: 0.4 },
    },
    starter: false },
  seedReggaetonPiano: { label: 'Acoustic Guitar · Reggaeton', category: 'Pluck', synth: 'MRDR-3', dur: 2.2,
    note: 'A steel-string pick: a bright triangle-and-saw string whose top falls away faster '
      + 'than its body, a wooden box resonance at 220 Hz and a scrape of pick noise on the '
      + 'front. Strummed chords come from the part, a few milliseconds apart.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.55, attack: 0.001, decay: 1.6, sustain: 0, release: 0.3, filter: { type: 'lowpass', slope: -12, freq: 1600, Q: 0.7, track: 0.7, env: { octaves: 2.2, attack: 0.001, decay: 0.35, sustain: 0, release: 0.2 } } },
      osc2: { type: 'triangle', ratio: 1, gain: 0.7, detune: 3, attack: 0.001, decay: 1.9, sustain: 0, release: 0.3, filter: { type: 'bandpass', slope: -12, freq: 220, Q: 2.2, track: 0 } },
      osc3: { type: 'noise', ratio: 1, gain: 0.1, color: 'white', attack: 0.001, decay: 0.03, sustain: 0, release: 0.02, filter: { type: 'highpass', slope: -12, freq: 3500, Q: 0.8, track: 0 } },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 5200, Q: 0.6, track: 0.3 },
      vca: { attack: 0.001, decay: 1.8, sustain: 0, release: 0.3 },
    },
    humanize: { entry: 0.006, pitch: 0.001734, gain: 0.08 },
    starter: false },
  seedReggaetonPad: { label: 'Evolving Digital Pad · Reggaeton', category: 'Pad', synth: 'TNGR-2', dur: 8,
    note: 'An unmistakable evolving digital pad with musical rather than noisy motion.',
    tngr2: { oscA: { table: 'digitalSteps', position: 0.08, envAmount: 0.92, level: 0.7, unison: 2, spread: 12 }, oscB: { table: 'spectralPWM', position: 0.7, envAmount: -0.65, level: 0.28, unison: 2, spread: 10, interval: -12 }, amp: { attack: 0.015, decay: 2, sustain: 0.78, release: 0.707 }, positionEnv: { attack: 1.6, decay: 3.8, sustain: 0.52 }, filter: { type: 'lowpass', cutoff: 4800, resonance: 2.88 }, lfo1: { shape: 'triangle', sync: true, division: '1/2', amount: 0.24 }, master: { gain: 0.5 } },
    starter: false },
  seedReggaetonSquare: { label: 'Marimba · Reggaeton', category: 'Bells', synth: 'RMND-2', dur: 1.4,
    note: 'Wooden and short. The mallet is the whole sound; there is no sustain to speak of.',
    options: {
      harmonicity: 4,
      modulationIndex: 3,
      oscillator: { type: 'sine' },
      modulation: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.35 },
      modulationEnvelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
    },
    starter: false },
  seedReggaetonBell: { label: 'Kalimba · Reggaeton', category: 'Bells', synth: 'RMND-2', dur: 2.4,
    note: 'Harmonicity 8 and almost no modulation — a thumb piano’s clean, high, quick ring.',
    origin: 'Tonejs/Presets FMSynth/Kalimba',
    options: {
      harmonicity: 8,
      modulationIndex: 2,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 2, sustain: 0.1, release: 2 },
      modulation: { type: 'square' },
      modulationEnvelope: { attack: 0.002, decay: 0.2, sustain: 0, release: 0.2 },
    },
    starter: false },
  seedReggaetonMegaSaw: { label: 'Legato Solo Lead · Reggaeton', category: 'Lead', synth: 'TNGR-2', dur: 2,
    note: 'An expressive legato lead with position movement during held notes.',
    mode: 'legato',
    portamento: 0.12,
    tngr2: { oscA: { table: 'vowelGlass', position: 0.18, envAmount: 0.52, level: 0.78, unison: 2, spread: 8 }, oscB: { table: 'darkToAir', position: 0.35, envAmount: 0.35, level: 0.16, interval: 12 }, amp: { attack: 0.06, decay: 0.32, sustain: 0.82, release: 0.28 }, filter: { type: 'lowpass', cutoff: 4300, resonance: 2.28 }, filterEnv: { amount: 1.2, attack: 0.06, decay: 0.45, sustain: 0.4 }, positionEnv: { attack: 0.3, decay: 1.1, sustain: 0.72 }, master: { gain: 0.6 } },
    starter: false },
  seedReggaetonArp: { label: 'Digital Marimba · Reggaeton', category: 'Pluck', synth: 'TNGR-2', dur: 1.3,
    note: 'A woody-digital table journey distinct from KLNG8 percussion.',
    tngr2: { oscA: { table: 'organShift', position: 0.35, envAmount: -0.3, level: 0.8 }, oscB: { table: 'crystal', position: 0.2, level: 0.13, interval: 12 }, amp: { attack: 0.002, decay: 0.48, sustain: 0.06, release: 0.18 }, positionEnv: { attack: 0, decay: 0.38, sustain: 0.05 }, filter: { type: 'lowpass', cutoff: 5400, resonance: 1.68 }, master: { gain: 0.55 } },
    starter: false },
  seedReggaetonChoir: { label: 'Sung Choir Ooh · Reggaeton', category: 'Pad', synth: 'JMJR-4', dur: 8,
    note: 'Two singers on ooh, rounder and darker than the aah beside it.',
    jmjr4: { voice: 'announcer', line: 'ooh', unison: 2, spread: 20, amp: { attack: 0.09, decay: 0.2, sustain: 1, release: 0.5 } },
    vibrato: { depth: 0.21, rate: 5, delay: 0.15 },
    starter: false },
  seedReggaetonThird: { label: 'Digital Marimba · Reggaeton', category: 'Pluck', synth: 'TNGR-2', dur: 1.3,
    note: 'A woody-digital table journey distinct from KLNG8 percussion.',
    tngr2: { oscA: { table: 'organShift', position: 0.35, envAmount: -0.3, level: 0.8 }, oscB: { table: 'crystal', position: 0.2, level: 0.13, interval: 12 }, amp: { attack: 0.002, decay: 0.48, sustain: 0.06, release: 0.18 }, positionEnv: { attack: 0, decay: 0.38, sustain: 0.05 }, filter: { type: 'lowpass', cutoff: 5400, resonance: 1.68 }, master: { gain: 0.55 } },
    starter: false },
  seedReggaetonCounter: { label: 'Sung Choir Aah · Reggaeton', category: 'Pad', synth: 'JMJR-4', dur: 8,
    note: 'Three singers on a warm throat, wide formants, a slow swell and a delayed vibrato. '
      + 'The choir the synth exists for. It was four until the fourth was measured: a '
      + 'quarter of the note-on cost for a fullness nobody could hear.',
    jmjr4: { voice: 'chorister', line: 'aah', morphTo: 'AH', unison: 3, spread: 24, tilt: 3, breath: 0.42, resonance: 38, amp: { attack: 0.3, decay: 0.4, sustain: 1, release: 1.2 } },
    vibrato: { depth: 0.22, rate: 5.2, delay: 0.35 },
    starter: false },
  seedChipstepBass: { label: 'Classic Square · Chipstep', category: 'Lead', synth: 'TNGR-2', dur: 2,
    note: 'A lean single-oscillator square tone for simple melodies and arpeggios.',
    tngr2: { oscA: { table: 'basic', position: 1, level: 0.8, unison: 1 }, amp: { attack: 0.006, decay: 0.26, sustain: 0.7, release: 0.16 }, filter: { type: 'lowpass', cutoff: 2800, resonance: 1.2 }, filterEnv: { amount: 0.65, attack: 0.004, decay: 0.24, sustain: 0.32 }, positionEnv: { attack: 0, decay: 0.2, sustain: 0 }, master: { gain: 0.6 } },
    starter: false },
  seedChipstepSub: { label: 'WUB Classic 1/8 · Chipstep', category: 'Bass', synth: 'MRDR-3', dur: 1.8,
    note: 'The textbook wub: saw plus a square an octave down through a resonant 24 dB lowpass '
      + 'that a sine LFO opens and shuts on the eighth note at 140.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.8, attack: 0.004, decay: 0.3, sustain: 0.9, release: 0.12, unison: 2, spread: 10 },
      osc2: { type: 'square', ratio: 0.5, gain: 0.55, attack: 0.004, decay: 0.3, sustain: 0.9, release: 0.12 },
      lfo: { type: 'sine', rate: 4.667, depth: 0.75, target: 'filter' },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 420, Q: 6, track: 0.3 },
    },
    drive: 0.454577, shape: 'soft',
    mode: 'mono',
    portamento: 0.03,
    starter: false },
  seedChipstepSaws: { label: 'Wide PWM Pad · Chipstep', category: 'Pad', synth: 'MRDR-3', dur: 8,
    note: 'Three pulses at three rates, all of them slow and deep, through one filter the LFO '
      + 'also breathes. Nothing in it repeats inside a bar — the widest, least static thing '
      + 'this synth can make.',
    layer: {
      osc1: { type: 'pulse', width: 0.5, ratio: 1, gain: 0.46, attack: 1.4, decay: 3, sustain: 0.88, release: 2.2, attackCurve: 'lin', unison: 2, spread: 14, stereo: 0.9, pwm: { type: 'sine', rate: 0.19, depth: 0.7, delay: 0.4 } },
      osc2: { type: 'pulse', width: 0.44, ratio: 1, detune: 9, gain: 0.36, attack: 1.6, decay: 3.2, sustain: 0.85, release: 2.4, attackCurve: 'lin', unison: 2, spread: 22, stereo: 0.8, pwm: { type: 'triangle', rate: 0.27, depth: 0.66, delay: 0.6 } },
      osc3: { type: 'pulse', width: 0.55, ratio: 0.5, detune: -6, gain: 0.29, attack: 1.2, decay: 3.4, sustain: 0.9, release: 2.6, attackCurve: 'lin', pwm: { type: 'sine', rate: 0.13, depth: 0.6, delay: 0.8 } },
      lfo: { type: 'sine', rate: 0.16, depth: 0.4, target: 'filter', delay: 1.2 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 1600, Q: 1, track: 0.28, env: { octaves: 2.4, attack: 2.2, decay: 4, sustain: 0.6, release: 2.2 } },
      vca: { attack: 1.6, decay: 3.5, sustain: 0.92, release: 2.8, attackCurve: 'lin' },
    },
    vibrato: { depth: 0.06, rate: 3, delay: 2.2 },
    starter: false },
  seedChipstepPad: { label: 'PWM Strings · Chipstep', category: 'Orch', synth: 'MRDR-3', dur: 8,
    note: 'The string machine. Two pulses whose widths drift at 0.28 and 0.37 Hz — rates '
      + 'chosen not to line up — over a clean saw sub. The shimmer is the two widths passing '
      + 'through each other, which is why they must never share a rate.',
    layer: {
      osc1: { type: 'pulse', width: 0.5, ratio: 1, gain: 0.5, attack: 0.136667, decay: 2, sustain: 0.85, release: 1.2, attackCurve: 'lin', unison: 2, spread: 9, stereo: 0.85, pwm: { type: 'sine', rate: 0.28, depth: 0.62, delay: 0 } },
      osc2: { type: 'pulse', width: 0.46, ratio: 1, detune: -7, gain: 0.42, attack: 0.164, decay: 2.2, sustain: 0.82, release: 1.3, attackCurve: 'lin', unison: 2, spread: 13, stereo: 0.7, pwm: { type: 'sine', rate: 0.37, depth: 0.58, delay: 0 } },
      osc3: { type: 'sawtooth', ratio: 0.5, gain: 0.2, attack: 0.123, decay: 2.4, sustain: 0.9, release: 1.2, attackCurve: 'lin' },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 2400, Q: 0.55, track: 0.3, env: { octaves: 1.4, attack: 0.8, decay: 2.4, sustain: 0.6, release: 1 } },
      vca: { attack: 0.150333, decay: 2.4, sustain: 0.9, release: 1.5, attackCurve: 'lin' },
    },
    vibrato: { depth: 0.07, rate: 4.2, delay: 1.4 },
    starter: false },
  seedChipstepSquare: { label: 'Plain Pulse · Chipstep', category: 'Lead', synth: 'TNGR-2', dur: 2,
    note: 'A straightforward hollow pulse lead with a small amount of spectral movement.',
    tngr2: { oscA: { table: 'hollowPulse', position: 0.16, envAmount: 0.08, level: 0.82, unison: 1 }, amp: { attack: 0.008, decay: 0.28, sustain: 0.74, release: 0.18 }, filter: { type: 'lowpass', cutoff: 3000, resonance: 1.44 }, positionEnv: { attack: 0.02, decay: 0.4, sustain: 0.18 }, master: { gain: 0.62 } },
    starter: false },
  seedChipstepBell: { label: 'Square Tone · Chipstep', category: 'Lead', synth: 'KNDO-5', dur: 1,
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
    portamento: 0,
    starter: false },
  seedChipstepMegaSaw: { label: 'Punchy Screamer · Chipstep', category: 'Lead', synth: 'MRDR-3', dur: 1.4,
    note: 'Cuts through anything. An FM operator at a deliberately inharmonic ratio puts a '
      + 'metallic edge on the saw, the fold shaper turns level into a different sound rather '
      + 'than a louder one, and the filter envelope snaps shut behind each note.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.95, attack: 0.003, decay: 0.35, sustain: 0.72, release: 0.14, unison: 4, spread: 20, fm: { type: 'square', ratio: 2.47, index: 1.4, attack: 0.001, decay: 0.12 } },
      osc2: { type: 'square', ratio: 1, gain: 0.4, detune: 12, attack: 0.004, decay: 0.3, sustain: 0.6, release: 0.12 },
      osc3: { type: 'sawtooth', ratio: 0.5, gain: 0.35, attack: 0.003, decay: 0.4, sustain: 0.8, release: 0.14 },
      lfo: { type: 'sine', rate: 6.2, depth: 0.18, target: 'filter', delay: 0.25 },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 900, Q: 3.4, track: 0.45, env: { octaves: 3.2, attack: 0.004, decay: 0.28, sustain: 0.3, release: 0.16 } },
      vca: { attack: 0.003, decay: 0.35, sustain: 0.78, release: 0.18 },
    },
    drive: 0.741671, shape: 'fold',
    tone: { freq: 9000 },
    vibrato: { depth: 0.2, rate: 6.4, delay: 0.3 },
    starter: false,
    trim: -1.556404 },
  seedChipstepArp: { label: 'Square Tone · Chipstep', category: 'Lead', synth: 'KNDO-5', dur: 1,
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
    portamento: 0,
    starter: false },
  seedChipstepChoir: { label: 'PWM Choir · Chipstep', category: 'Orch', synth: 'MRDR-3', dur: 8,
    note: 'The /a/ formants again, but over pulses whose widths drift instead of over plain '
      + 'saws. The vowel is held by the filters; the moving source is what turns one singer '
      + 'into a section, and it is doing the job the chorus pedal does on a Juno.',
    layer: {
      osc1: { type: 'pulse', width: 0.5, ratio: 1, gain: 0.9, attack: 0.151, decay: 1.4, sustain: 0.85, release: 1, attackCurve: 'lin', unison: 2, spread: 8, stereo: 0.75, pwm: { type: 'sine', rate: 0.24, depth: 0.6, delay: 0.5 }, filter: { type: 'bandpass', slope: -12, freq: 800, Q: 7, track: 0, env: { attack: 0.006 } } },
      osc2: { type: 'pulse', width: 0.44, ratio: 1, detune: 7, gain: 0.55, attack: 0.187, decay: 1.6, sustain: 0.8, release: 1, attackCurve: 'lin', pwm: { type: 'sine', rate: 0.35, depth: 0.55, delay: 0.5 }, filter: { type: 'bandpass', slope: -12, freq: 1150, Q: 9, track: 0 } },
      osc3: { type: 'pulse', width: 0.55, ratio: 1, detune: -8, gain: 0.3, attack: 0.145, decay: 1.8, sustain: 0.72, release: 1.1, attackCurve: 'lin', pwm: { type: 'sine', rate: 0.17, depth: 0.5, delay: 0.5 }, filter: { type: 'bandpass', slope: -12, freq: 2900, Q: 11, track: 0 } },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 3600, Q: 0.7, track: 0.3, env: { octaves: 1.2, attack: 0.183, decay: 1.8, sustain: 0.55, release: 1 } },
      vca: { attack: 0.022, decay: 1.8, sustain: 0.88, release: 1.3, attackCurve: 'lin' },
    },
    drive: 0.040646, shape: 'soft',
    humanize: { entry: 0.02 },
    vibrato: { depth: 0.16, rate: 5, delay: 0.7, spread: 0 },
    chorus: { mix: 0.37 },
    starter: false },
  seedChipstepThird: { label: 'Arcade Chorus · Chipstep', category: 'FX', synth: 'JMJR-4', dur: 1.5,
    note: 'A nasal throat, three of them, on daa. Six bits at 8 kHz: the cabinet speaker.',
    jmjr4: { voice: 'nasal', line: 'daa', bits: 6, rate: 8, morphTo: 'AH', unison: 3, spread: 26, amp: { attack: 0.01, decay: 0.2, sustain: 1, release: 0.15 } },
    vibrato: { depth: 0.14, rate: 5, delay: 0.15 },
    starter: false },
  seedChipstepCounter: { label: 'Classic Square · Chipstep', category: 'Lead', synth: 'TNGR-2', dur: 2,
    note: 'A lean single-oscillator square tone for simple melodies and arpeggios.',
    tngr2: { oscA: { table: 'basic', position: 1, level: 0.8, unison: 1 }, amp: { attack: 0.006, decay: 0.26, sustain: 0.7, release: 0.16 }, filter: { type: 'lowpass', cutoff: 2800, resonance: 1.2 }, filterEnv: { amount: 0.65, attack: 0.004, decay: 0.24, sustain: 0.32 }, positionEnv: { attack: 0, decay: 0.2, sustain: 0 }, master: { gain: 0.6 } },
    starter: false },
  seedTranceBass: { label: 'Sequencer Bass · Trance', category: 'Bass', synth: 'TNGR-2', dur: 1,
    note: 'A tempo-synced spectral pulse for repeated sixteenth notes.',
    tngr2: { oscA: { table: 'spectralPWM', position: 0.22, envAmount: 0.08, lfoAmount: 0.8, level: 0.82 }, oscB: { table: 'organShift', position: 0.1, envAmount: 0.12, level: 0.18, interval: -12 }, amp: { attack: 0.002, decay: 0.18, sustain: 0.55, release: 0.08 }, filter: { type: 'lowpass', cutoff: 1600, resonance: 2.88 }, positionEnv: { attack: 0.002, decay: 0.16, sustain: 0.15 }, lfo1: { shape: 'triangle', sync: true, division: '1/16', amount: 0.55 }, master: { gain: 0.66 } },
    starter: false },
  seedTranceSub: { label: 'Sub Sine · Trance', category: 'Bass', synth: 'CRLS-1', dur: 2.2,
    note: 'Pure weight, no harmonics. Wants room underneath it and a lead up top.',
    options: {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.012, decay: 0.3, sustain: 0.8, release: 0.4 },
    },
    starter: false },
  seedTranceSaws: { label: 'Super Saw · Trance', category: 'Lead', synth: 'CRLS-1', dur: 1.4,
    note: 'Three sawtooths thirty cents apart — the trance lead, and the widest single sound '
      + 'here.',
    origin: 'Tonejs/Presets Synth/SuperSaw',
    options: {
      oscillator: { type: 'fatsawtooth', count: 3, spread: 30 },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.4, attackCurve: 'exponential' },
    },
    starter: false },
  seedTrancePiano: { label: 'Bright Pop Grand · Trance', category: 'Keys', synth: 'MRDR-3', dur: 2.8,
    note: 'FM inside the layers: a 1:1 operator whose index falls away over half a second '
      + '(brightness that decays, which is what a struck string does), and a slightly '
      + 'inharmonic 7.01 operator on the octave for the metal in the attack.',
    layer: {
      osc1: { type: 'sine', ratio: 1, gain: 0.82, attack: 0.001, decay: 2.8, sustain: 0, release: 0.4, unison: 2, spread: 4, stereo: 0.35, fm: { type: 'sine', ratio: 1, index: 1.6, attack: 0.001, decay: 0.5 } },
      osc2: { type: 'sine', ratio: 2, gain: 0.3, attack: 0.001, decay: 1.4, sustain: 0, release: 0.3, fm: { type: 'sine', ratio: 7.01, index: 0.5, attack: 0.001, decay: 0.08 } },
      osc3: { type: 'noise', ratio: 1, gain: 0.08, color: 'white', attack: 0.001, decay: 0.022, sustain: 0, release: 0.02, filter: { type: 'bandpass', slope: -12, freq: 3000, Q: 1, track: 0.3 } },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 7000, Q: 0.5, track: 0.3 },
    },
    humanize: { entry: 0.005, gain: 0.07 },
    starter: false },
  seedTrancePad: { label: 'Glass Choir · Trance', category: 'Pad', synth: 'TNGR-2', dur: 7,
    note: 'Vocal and glass motion without using the Vowel insert.',
    tngr2: { oscA: { table: 'choirBreath', position: 0.08, envAmount: 0.75, level: 0.7, unison: 2, spread: 10, stereo: 0.7 }, oscB: { table: 'vowelGlass', position: 0.62, envAmount: -0.35, level: 0.3, unison: 2, spread: 13, stereo: 0.7, interval: 12 }, amp: { attack: 0.031, decay: 2.2, sustain: 0.76, release: 1.948 }, positionEnv: { attack: 2, decay: 3, sustain: 0.6 }, filter: { type: 'lowpass', cutoff: 4700, resonance: 2.4 }, lfo1: { shape: 'sine', rate: 0.08, amount: 0.18 }, master: { gain: 0.5 } },
    starter: false },
  seedTranceSquare: { label: 'Super Saw · Trance', category: 'Lead', synth: 'CRLS-1', dur: 1.4,
    note: 'Three sawtooths thirty cents apart — the trance lead, and the widest single sound '
      + 'here.',
    origin: 'Tonejs/Presets Synth/SuperSaw',
    options: {
      oscillator: { type: 'fatsawtooth', count: 3, spread: 30 },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.4, attackCurve: 'exponential' },
    },
    starter: false },
  seedTranceBell: { label: 'Soft Ice Bell · Trance', category: 'Bells', synth: 'TNGR-2', dur: 3,
    note: 'Sparse crystal partials with a long decay and controlled high notes.',
    tngr2: { oscA: { table: 'bellFold', position: 0.84, envAmount: -0.2, level: 0.76 }, oscB: { table: 'crystal', position: 0.65, level: 0.16, interval: 12 }, amp: { attack: 0.001, decay: 1.7, sustain: 0.03, release: 0.9 }, positionEnv: { attack: 0, decay: 1.1, sustain: 0.12 }, filter: { type: 'lowpass', cutoff: 9800, resonance: 1.2 }, master: { gain: 0.5 } },
    starter: false },
  seedTranceMegaSaw: { label: 'Mega Saw Lead · Trance', category: 'Lead', synth: 'MRDR-3', dur: 1.6,
    note: 'Nine oscillators. Two unison saws a fifth apart, a sub under them, all through one '
      + 'shared filter that opens across every note — the shared stage is the whole point, '
      + 'because nine separate filters would be nine sounds instead of one.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.85, attack: 0.006, decay: 0.5, sustain: 0.8, release: 0.18, unison: 4, spread: 26, stereo: 0.5 },
      osc2: { type: 'sawtooth', ratio: 1.4983, gain: 0.4, attack: 0.01, decay: 0.5, sustain: 0.7, release: 0.18, unison: 4, spread: 34, stereo: 0.65 },
      osc3: { type: 'pulse', width: 0.5, ratio: 0.5, gain: 0.42, attack: 0.004, decay: 0.6, sustain: 0.85, release: 0.16, pwm: { type: 'sine', rate: 0.42, depth: 0.5, delay: 0.1 } },
      lfo: { type: 'sine', rate: 5.4, depth: 0.12, target: 'filter', delay: 0.4 },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 380, Q: 2.2, track: 0.5, env: { octaves: 4.6, attack: 0.012, decay: 0.55, sustain: 0.42, release: 0.22 } },
      vca: { attack: 0.006, decay: 0.5, sustain: 0.85, release: 0.24 },
    },
    drive: 0.356988, shape: 'soft',
    tone: { freq: 12000 },
    vibrato: { depth: 0.1, rate: 5.6, delay: 0.5 },
    starter: false,
    trim: -0.408862 },
  seedTranceArp: { label: 'Bright Sparkle Pluck · Trance', category: 'Pluck', synth: 'TNGR-2', dur: 1.2,
    note: 'A sparkling high-partial attack with a clean short body.',
    tngr2: { oscA: { table: 'crystal', position: 0.8, envAmount: -0.68, level: 0.78 }, oscB: { table: 'bellFold', position: 0.72, level: 0.14, interval: 12 }, amp: { attack: 0.001, decay: 0.45, sustain: 0.04, release: 0.16 }, positionEnv: { attack: 0, decay: 0.32, sustain: 0 }, filter: { type: 'lowpass', cutoff: 8500, resonance: 2.4 }, master: { gain: 0.52 } },
    starter: false },
  seedTranceChoir: { label: 'Synth Choir Aah · Trance', category: 'Orch', synth: 'MRDR-3', dur: 8,
    note: 'Three static bandpass formants on the /a/ vowel — 800, 1150 and 2900 Hz — with the '
      + 'pitch moving underneath them. Delayed vibrato and a slow swell do the rest: this is '
      + 'how a voice works, not an impression of one.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.9, attack: 0.1204, decay: 1.2, sustain: 0.85, release: 0.9, attackCurve: 'lin', unison: 3, spread: 9, stereo: 0.8, filter: { type: 'bandpass', slope: -12, freq: 800, Q: 7, track: 0 } },
      osc2: { type: 'sawtooth', ratio: 1, gain: 0.55, detune: 6, attack: 0.14448, decay: 1.4, sustain: 0.8, release: 0.9, attackCurve: 'lin', unison: 2, spread: 13, stereo: 0.7, filter: { type: 'bandpass', slope: -12, freq: 1150, Q: 9, track: 0 } },
      osc3: { type: 'sawtooth', ratio: 1, gain: 0.3, detune: -7, attack: 0.172, decay: 1.6, sustain: 0.7, release: 1, attackCurve: 'lin', unison: 2, spread: 16, stereo: 0.9, filter: { type: 'bandpass', slope: -12, freq: 2900, Q: 11, track: 0 } },
      lfo: { type: 'sine', rate: 0.7, depth: 0.14, target: 'level', delay: 0.9 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 3800, Q: 0.7, track: 0.3, env: { octaves: 1.3, attack: 0.6, decay: 1.6, sustain: 0.55, release: 0.9 } },
      vca: { attack: 0.1548, decay: 1.6, sustain: 0.88, release: 1.2, attackCurve: 'lin' },
    },
    drive: 0.033398, shape: 'soft',
    humanize: { entry: 0.022 },
    vibrato: { depth: 0.18, rate: 5.2, delay: 0.6, spread: 0.75 },
    starter: false },
  seedTranceThird: { label: 'Bright Pop Grand · Trance', category: 'Keys', synth: 'MRDR-3', dur: 2.8,
    note: 'FM inside the layers: a 1:1 operator whose index falls away over half a second '
      + '(brightness that decays, which is what a struck string does), and a slightly '
      + 'inharmonic 7.01 operator on the octave for the metal in the attack.',
    layer: {
      osc1: { type: 'sine', ratio: 1, gain: 0.82, attack: 0.001, decay: 2.8, sustain: 0, release: 0.4, unison: 2, spread: 4, stereo: 0.35, fm: { type: 'sine', ratio: 1, index: 1.6, attack: 0.001, decay: 0.5 } },
      osc2: { type: 'sine', ratio: 2, gain: 0.3, attack: 0.001, decay: 1.4, sustain: 0, release: 0.3, fm: { type: 'sine', ratio: 7.01, index: 0.5, attack: 0.001, decay: 0.08 } },
      osc3: { type: 'noise', ratio: 1, gain: 0.08, color: 'white', attack: 0.001, decay: 0.022, sustain: 0, release: 0.02, filter: { type: 'bandpass', slope: -12, freq: 3000, Q: 1, track: 0.3 } },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 7000, Q: 0.5, track: 0.3 },
    },
    humanize: { entry: 0.005, gain: 0.07 },
    starter: false },
  seedTranceCounter: { label: 'Bright Sparkle Pluck · Trance', category: 'Pluck', synth: 'TNGR-2', dur: 1.2,
    note: 'A sparkling high-partial attack with a clean short body.',
    tngr2: { oscA: { table: 'crystal', position: 0.8, envAmount: -0.68, level: 0.78 }, oscB: { table: 'bellFold', position: 0.72, level: 0.14, interval: 12 }, amp: { attack: 0.001, decay: 0.45, sustain: 0.04, release: 0.16 }, positionEnv: { attack: 0, decay: 0.32, sustain: 0 }, filter: { type: 'lowpass', cutoff: 8500, resonance: 2.4 }, master: { gain: 0.52 } },
    starter: false },
  seedItaloDiscoBass: { label: '=80s FM Bass · Italo Disco', category: 'Bass', synth: 'RMND-2', dur: 1.8,
    note: 'A bright digital 80s bass: a sine body with a square modulator, tuned for the '
      + 'glassy attack of an FM workstation under a pop groove.',
    options: {
      harmonicity: 1.5,
      modulationIndex: 7,
      oscillator: { type: 'sine' },
      modulation: { type: 'square' },
      envelope: { attack: 0.003, decay: 0.34, sustain: 0.36, release: 0.24 },
      modulationEnvelope: { attack: 0.002, decay: 0.18, sustain: 0.22, release: 0.16 },
    },
    starter: false },
  seedItaloDiscoSub: { label: 'Sub Sine · Italo Disco', category: 'Bass', synth: 'CRLS-1', dur: 2.2,
    note: 'Pure weight, no harmonics. Wants room underneath it and a lead up top.',
    options: {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.012, decay: 0.3, sustain: 0.8, release: 0.4 },
    },
    starter: false },
  seedItaloDiscoPad: { label: 'Cold Wide Pad · Italo Disco', category: 'Pad', synth: 'TNGR-2', dur: 8,
    note: 'Wide cold sparse partials with independent slow movement.',
    tngr2: { oscA: { table: 'crystal', position: 0.35, envAmount: 0.42, lfoAmount: 0.12, level: 0.68, unison: 3, spread: 18, stereo: 0.9 }, oscB: { table: 'alloy', position: 0.7, envAmount: -0.3, lfoAmount: -0.1, level: 0.25, unison: 2, spread: 15, stereo: 0.9, interval: -12 }, amp: { attack: 0.03, decay: 2.5, sustain: 0.7, release: 1.387 }, positionEnv: { attack: 2.8, decay: 3.5, sustain: 0.45 }, filter: { type: 'lowpass', cutoff: 5600, resonance: 1.92 }, lfo1: { shape: 'triangle', rate: 0.07, amount: 0.22 }, master: { gain: 0.46 } },
    starter: false },
  seedItaloDiscoSquare: { label: 'Bright Glide Lead · Italo Disco', category: 'Lead', synth: 'TNGR-2', dur: 1.5,
    note: 'A clear bright mono lead with slow spectral animation and useful glide.',
    mode: 'mono',
    portamento: 0.08,
    tngr2: { oscA: { table: 'sawForm', position: 0.35, envAmount: 0.25, level: 0.78, unison: 2, spread: 7 }, oscB: { table: 'warmHarmonics', position: 0.2, level: 0.18, interval: 12 }, amp: { attack: 0.012, decay: 0.2, sustain: 0.82, release: 0.18 }, filter: { type: 'lowpass', cutoff: 5200, resonance: 2.16 }, filterEnv: { amount: 1.1, attack: 0.01, decay: 0.18, sustain: 0.42 }, positionEnv: { attack: 0.04, decay: 0.6, sustain: 0.4 }, master: { gain: 0.62 } },
    starter: false },
  seedItaloDiscoBell: { label: 'Ice Bell · Italo Disco', category: 'Bells', synth: 'TNGR-2', dur: 3,
    note: 'Sparse crystal partials with a long decay and controlled high notes.',
    tngr2: { oscA: { table: 'bellFold', position: 0.84, envAmount: -0.2, level: 0.76 }, oscB: { table: 'crystal', position: 0.65, level: 0.16, interval: 12 }, amp: { attack: 0.001, decay: 1.7, sustain: 0.03, release: 0.9 }, positionEnv: { attack: 0, decay: 1.1, sustain: 0.12 }, filter: { type: 'lowpass', cutoff: 9800, resonance: 1.2 }, master: { gain: 0.5 } },
    starter: false },
  seedItaloDiscoMegaSaw: { label: 'Legato Solo Lead · Italo Disco', category: 'Lead', synth: 'TNGR-2', dur: 2,
    note: 'An expressive legato lead with position movement during held notes.',
    mode: 'legato',
    portamento: 0.12,
    tngr2: { oscA: { table: 'vowelGlass', position: 0.18, envAmount: 0.52, level: 0.78, unison: 2, spread: 8 }, oscB: { table: 'darkToAir', position: 0.35, envAmount: 0.35, level: 0.16, interval: 12 }, amp: { attack: 0.06, decay: 0.32, sustain: 0.82, release: 0.28 }, filter: { type: 'lowpass', cutoff: 4300, resonance: 2.28 }, filterEnv: { amount: 1.2, attack: 0.06, decay: 0.45, sustain: 0.4 }, positionEnv: { attack: 0.3, decay: 1.1, sustain: 0.72 }, master: { gain: 0.6 } },
    starter: false },
  seedItaloDiscoArp: { label: 'Sparkle Pluck · Italo Disco', category: 'Pluck', synth: 'TNGR-2', dur: 1.2,
    note: 'A sparkling high-partial attack with a clean short body.',
    tngr2: { oscA: { table: 'crystal', position: 0.8, envAmount: -0.68, level: 0.78 }, oscB: { table: 'bellFold', position: 0.72, level: 0.14, interval: 12 }, amp: { attack: 0.001, decay: 0.45, sustain: 0.04, release: 0.16 }, positionEnv: { attack: 0, decay: 0.32, sustain: 0 }, filter: { type: 'lowpass', cutoff: 8500, resonance: 2.4 }, master: { gain: 0.52 } },
    starter: false },
  seedItaloDiscoChoir: { label: 'Synth Choir Aah · Italo Disco', category: 'Orch', synth: 'MRDR-3', dur: 8,
    note: 'Three static bandpass formants on the /a/ vowel — 800, 1150 and 2900 Hz — with the '
      + 'pitch moving underneath them. Delayed vibrato and a slow swell do the rest: this is '
      + 'how a voice works, not an impression of one.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.9, attack: 0.1204, decay: 1.2, sustain: 0.85, release: 0.9, attackCurve: 'lin', unison: 3, spread: 9, stereo: 0.8, filter: { type: 'bandpass', slope: -12, freq: 800, Q: 7, track: 0 } },
      osc2: { type: 'sawtooth', ratio: 1, gain: 0.55, detune: 6, attack: 0.14448, decay: 1.4, sustain: 0.8, release: 0.9, attackCurve: 'lin', unison: 2, spread: 13, stereo: 0.7, filter: { type: 'bandpass', slope: -12, freq: 1150, Q: 9, track: 0 } },
      osc3: { type: 'sawtooth', ratio: 1, gain: 0.3, detune: -7, attack: 0.172, decay: 1.6, sustain: 0.7, release: 1, attackCurve: 'lin', unison: 2, spread: 16, stereo: 0.9, filter: { type: 'bandpass', slope: -12, freq: 2900, Q: 11, track: 0 } },
      lfo: { type: 'sine', rate: 0.7, depth: 0.14, target: 'level', delay: 0.9 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 3800, Q: 0.7, track: 0.3, env: { octaves: 1.3, attack: 0.6, decay: 1.6, sustain: 0.55, release: 0.9 } },
      vca: { attack: 0.1548, decay: 1.6, sustain: 0.88, release: 1.2, attackCurve: 'lin' },
    },
    drive: 0.033398, shape: 'soft',
    humanize: { entry: 0.022 },
    vibrato: { depth: 0.18, rate: 5.2, delay: 0.6, spread: 0.75 },
    starter: false },
  seedItaloDiscoThird: { label: 'Digital E-Piano · Italo Disco', category: 'Keys', synth: 'TNGR-2', dur: 2.4,
    note: 'A bright struck transient moving quickly to a warmer sustained frame.',
    tngr2: { oscA: { table: 'bellFold', position: 0.72, envAmount: -0.42, level: 0.75 }, oscB: { table: 'warmHarmonics', position: 0.48, envAmount: -0.18, level: 0.2, interval: -12 }, amp: { attack: 0.004, decay: 1.3, sustain: 0.25, release: 0.45 }, positionEnv: { attack: 0, decay: 0.8, sustain: 0.1 }, filter: { type: 'lowpass', cutoff: 6200, resonance: 2.16 }, filterEnv: { amount: 1.6, attack: 0.001, decay: 0.7, sustain: 0.1 }, master: { gain: 0.58 } },
    starter: false },
  seedItaloDiscoCounter: { label: 'Sparkle Pluck · Italo Disco', category: 'Pluck', synth: 'TNGR-2', dur: 1.2,
    note: 'A sparkling high-partial attack with a clean short body.',
    tngr2: { oscA: { table: 'crystal', position: 0.8, envAmount: -0.68, level: 0.78 }, oscB: { table: 'bellFold', position: 0.72, level: 0.14, interval: 12 }, amp: { attack: 0.001, decay: 0.45, sustain: 0.04, release: 0.16 }, positionEnv: { attack: 0, decay: 0.32, sustain: 0 }, filter: { type: 'lowpass', cutoff: 8500, resonance: 2.4 }, master: { gain: 0.52 } },
    starter: false },
  seedBigRoomBass: { label: 'Wide Detune Bass · Big-Room House', category: 'Bass', synth: 'MRDR-3', dur: 1.8,
    note: 'Two layers a few cents apart, saw against square. Big, and wide without a chorus.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, detune: 0, gain: 1, attack: 0.008, decay: 0.2, sustain: 0.7, release: 0.3 },
      osc2: { type: 'square', ratio: 1, detune: 13.8, gain: 1, attack: 0.012, decay: 0.2, sustain: 0.7, release: 0.3 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 200, Q: 1, track: 0, env: { octaves: 3, attack: 0.01, decay: 0.001, sustain: 1, release: 0.5 } },
    },
    vibrato: { depth: 0.01, rate: 3 },
    starter: false },
  seedBigRoomSub: { label: 'Sub Sine · Big-Room House', category: 'Bass', synth: 'CRLS-1', dur: 2.2,
    note: 'Pure weight, no harmonics. Wants room underneath it and a lead up top.',
    options: {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.012, decay: 0.3, sustain: 0.8, release: 0.4 },
    },
    starter: false },
  seedBigRoomSaws: { label: 'Super Saw · Big-Room House', category: 'Lead', synth: 'CRLS-1', dur: 1.4,
    note: 'Three sawtooths thirty cents apart — the trance lead, and the widest single sound '
      + 'here.',
    origin: 'Tonejs/Presets Synth/SuperSaw',
    options: {
      oscillator: { type: 'fatsawtooth', count: 3, spread: 30 },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.4, attackCurve: 'exponential' },
    },
    starter: false },
  seedBigRoomPad: { label: 'Cold Wide Pad · Big-Room House', category: 'Pad', synth: 'TNGR-2', dur: 8,
    note: 'Wide cold sparse partials with independent slow movement.',
    tngr2: { oscA: { table: 'crystal', position: 0.35, envAmount: 0.42, lfoAmount: 0.12, level: 0.68, unison: 3, spread: 18, stereo: 0.9 }, oscB: { table: 'alloy', position: 0.7, envAmount: -0.3, lfoAmount: -0.1, level: 0.25, unison: 2, spread: 15, stereo: 0.9, interval: -12 }, amp: { attack: 0.03, decay: 2.5, sustain: 0.7, release: 1.387 }, positionEnv: { attack: 2.8, decay: 3.5, sustain: 0.45 }, filter: { type: 'lowpass', cutoff: 5600, resonance: 1.92 }, lfo1: { shape: 'triangle', rate: 0.07, amount: 0.22 }, master: { gain: 0.46 } },
    starter: false },
  seedBigRoomSquare: { label: 'Plain Square · Big-Room House', category: 'Lead', synth: 'CRLS-1', dur: 7.7,
    note: 'Simple Square Tone 2',
    options: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.3, attackCurve: 'linear', decayCurve: 'exponential', releaseCurve: 'exponential' },
      filter: { type: 'lowpass', rolloff: -12, Q: 0.1 },
      filterEnvelope: { baseFrequency: 18000, octaves: 0, attack: 0.001, decay: 0.2, sustain: 0.5, release: 0.3, attackCurve: 'linear', decayCurve: 'exponential', releaseCurve: 'exponential' },
    },
    starter: false },
  seedBigRoomBell: { label: 'Soft Ice Bell · Big-Room House', category: 'Bells', synth: 'TNGR-2', dur: 3,
    note: 'Sparse crystal partials with a long decay and controlled high notes.',
    tngr2: { oscA: { table: 'bellFold', position: 0.84, envAmount: -0.2, level: 0.76 }, oscB: { table: 'crystal', position: 0.65, level: 0.16, interval: 12 }, amp: { attack: 0.001, decay: 1.7, sustain: 0.03, release: 0.9 }, positionEnv: { attack: 0, decay: 1.1, sustain: 0.12 }, filter: { type: 'lowpass', cutoff: 9800, resonance: 1.2 }, master: { gain: 0.5 } },
    starter: false },
  seedBigRoomMegaSaw: { label: 'Mega Saw Lead · Big-Room House', category: 'Lead', synth: 'MRDR-3', dur: 1.6,
    note: 'Nine oscillators. Two unison saws a fifth apart, a sub under them, all through one '
      + 'shared filter that opens across every note — the shared stage is the whole point, '
      + 'because nine separate filters would be nine sounds instead of one.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.85, attack: 0.006, decay: 0.5, sustain: 0.8, release: 0.18, unison: 4, spread: 26, stereo: 0.5 },
      osc2: { type: 'sawtooth', ratio: 1.4983, gain: 0.4, attack: 0.01, decay: 0.5, sustain: 0.7, release: 0.18, unison: 4, spread: 34, stereo: 0.65 },
      osc3: { type: 'pulse', width: 0.5, ratio: 0.5, gain: 0.42, attack: 0.004, decay: 0.6, sustain: 0.85, release: 0.16, pwm: { type: 'sine', rate: 0.42, depth: 0.5, delay: 0.1 } },
      lfo: { type: 'sine', rate: 5.4, depth: 0.12, target: 'filter', delay: 0.4 },
    },
    global: {
      filter: { type: 'lowpass', slope: -24, freq: 380, Q: 2.2, track: 0.5, env: { octaves: 4.6, attack: 0.012, decay: 0.55, sustain: 0.42, release: 0.22 } },
      vca: { attack: 0.006, decay: 0.5, sustain: 0.85, release: 0.24 },
    },
    drive: 0.356988, shape: 'soft',
    tone: { freq: 12000 },
    vibrato: { depth: 0.1, rate: 5.6, delay: 0.5 },
    starter: false,
    trim: -0.408862 },
  seedBigRoomArp: { label: 'Bright Sparkle Pluck · Big-Room House', category: 'Pluck', synth: 'TNGR-2', dur: 1.2,
    note: 'A sparkling high-partial attack with a clean short body.',
    tngr2: { oscA: { table: 'crystal', position: 0.8, envAmount: -0.68, level: 0.78 }, oscB: { table: 'bellFold', position: 0.72, level: 0.14, interval: 12 }, amp: { attack: 0.001, decay: 0.45, sustain: 0.04, release: 0.16 }, positionEnv: { attack: 0, decay: 0.32, sustain: 0 }, filter: { type: 'lowpass', cutoff: 8500, resonance: 2.4 }, master: { gain: 0.52 } },
    starter: false },
  seedBigRoomChoir: { label: 'Synth Choir Aah · Big-Room House', category: 'Orch', synth: 'MRDR-3', dur: 8,
    note: 'Three static bandpass formants on the /a/ vowel — 800, 1150 and 2900 Hz — with the '
      + 'pitch moving underneath them. Delayed vibrato and a slow swell do the rest: this is '
      + 'how a voice works, not an impression of one.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.9, attack: 0.1204, decay: 1.2, sustain: 0.85, release: 0.9, attackCurve: 'lin', unison: 3, spread: 9, stereo: 0.8, filter: { type: 'bandpass', slope: -12, freq: 800, Q: 7, track: 0 } },
      osc2: { type: 'sawtooth', ratio: 1, gain: 0.55, detune: 6, attack: 0.14448, decay: 1.4, sustain: 0.8, release: 0.9, attackCurve: 'lin', unison: 2, spread: 13, stereo: 0.7, filter: { type: 'bandpass', slope: -12, freq: 1150, Q: 9, track: 0 } },
      osc3: { type: 'sawtooth', ratio: 1, gain: 0.3, detune: -7, attack: 0.172, decay: 1.6, sustain: 0.7, release: 1, attackCurve: 'lin', unison: 2, spread: 16, stereo: 0.9, filter: { type: 'bandpass', slope: -12, freq: 2900, Q: 11, track: 0 } },
      lfo: { type: 'sine', rate: 0.7, depth: 0.14, target: 'level', delay: 0.9 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 3800, Q: 0.7, track: 0.3, env: { octaves: 1.3, attack: 0.6, decay: 1.6, sustain: 0.55, release: 0.9 } },
      vca: { attack: 0.1548, decay: 1.6, sustain: 0.88, release: 1.2, attackCurve: 'lin' },
    },
    drive: 0.033398, shape: 'soft',
    humanize: { entry: 0.022 },
    vibrato: { depth: 0.18, rate: 5.2, delay: 0.6, spread: 0.75 },
    starter: false },
  seedBigRoomThird: { label: 'Chorus Grand · Big-Room House', category: 'Keys', synth: 'MRDR-3', dur: 2.2,
    note: 'The CP-70: real strings on a pickup, so a thinner body, a brighter strike and the '
      + 'chorus it was always played through.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, gain: 0.7, attack: 0.001, decay: 2.2, sustain: 0, release: 0.3, unison: 2, spread: 6, stereo: 0.5, filter: { type: 'lowpass', slope: -12, freq: 900, Q: 0.8, track: 0.9, env: { octaves: 2.5, attack: 0.001, decay: 0.25, sustain: 0, release: 0.2 } } },
      osc2: { type: 'triangle', ratio: 2, gain: 0.25, attack: 0.001, decay: 1.2, sustain: 0, release: 0.25 },
      osc3: { type: 'noise', ratio: 1, gain: 0.07, color: 'white', attack: 0.001, decay: 0.018, sustain: 0, release: 0.02, filter: { type: 'bandpass', slope: -12, freq: 2400, Q: 1.2, track: 0.4 } },
    },
    humanize: { entry: 0.005, gain: 0.07 },
    chorus: { mix: 0.35, rate: 0.6, depth: 0.4, width: 1 },
    starter: false },
  seedBigRoomCounter: { label: 'Bright Sparkle Pluck · Big-Room House', category: 'Pluck', synth: 'TNGR-2', dur: 1.2,
    note: 'A sparkling high-partial attack with a clean short body.',
    tngr2: { oscA: { table: 'crystal', position: 0.8, envAmount: -0.68, level: 0.78 }, oscB: { table: 'bellFold', position: 0.72, level: 0.14, interval: 12 }, amp: { attack: 0.001, decay: 0.45, sustain: 0.04, release: 0.16 }, positionEnv: { attack: 0, decay: 0.32, sustain: 0 }, filter: { type: 'lowpass', cutoff: 8500, resonance: 2.4 }, master: { gain: 0.52 } },
    starter: false },
  seedMegadriveBass: { label: 'FM Slap Bass · 16-Bit', category: 'Bass', synth: 'RMND-2', dur: 1,
    note: 'The DX7 bass: a 1:1 modulator at index 12, gone in an eighth of a second, so the '
      + 'note starts as a buzz-saw and settles to a round sine.',
    options: {
      harmonicity: 1,
      modulationIndex: 12,
      oscillator: { type: 'sine' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.9, sustain: 0.35, release: 0.08 },
      modulationEnvelope: { attack: 0.001, decay: 0.12, sustain: 0.06, release: 0.1 },
    },
    starter: false },
  seedMegadriveSub: { label: 'Sub Sine · 16-Bit', category: 'Bass', synth: 'CRLS-1', dur: 2.2,
    note: 'Pure weight, no harmonics. Wants room underneath it and a lead up top.',
    options: {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.012, decay: 0.3, sustain: 0.8, release: 0.4 },
    },
    starter: false },
  seedMegadrivePiano: { label: 'FM Keys · 16-Bit', category: 'Keys', synth: 'RMND-2', dur: 2.6,
    note: 'Struck keys, percussive enough to keep a stab from smearing into the next bar.',
    options: {
      harmonicity: 2,
      modulationIndex: 4,
      oscillator: { type: 'sine' },
      modulation: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.8, sustain: 0.1, release: 0.8 },
      modulationEnvelope: { attack: 0.004, decay: 0.4, sustain: 0.05, release: 0.5 },
    },
    starter: false },
  seedMegadrivePad: { label: 'Synth Strings · 16-Bit', category: 'Orch', synth: 'MRDR-3', dur: 4,
    note: 'The string-machine sound: two detuned saws, slow on, slow off.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, detune: 0, gain: 1, attack: 0.2, decay: 0.3, sustain: 0.85, release: 1 },
      osc2: { type: 'sawtooth', ratio: 1, detune: 10.4, gain: 1, attack: 0.3, decay: 0.3, sustain: 0.85, release: 1.2 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 200, Q: 1, track: 0, env: { octaves: 3, attack: 0.01, decay: 0.001, sustain: 1, release: 0.5 } },
    },
    vibrato: { depth: 0.025, rate: 4 },
    starter: false },
  seedMegadriveSquare: { label: 'Soft Triangle Lead · 16-Bit', category: 'Lead', synth: 'MRDR-3', dur: 1.25,
    note: 'Triangle with a little length on it — soft enough to sit inside a mix carrying '
      + 'every other cabinet at once.',
    layer: {
      osc1: { type: 'triangle', ratio: 1, gain: 1, attack: 0.008, decay: 1.25 },
    },
    starter: false },
  seedMegadriveBell: { label: 'Soft FM Bell · 16-Bit', category: 'Bells', synth: 'RMND-2', dur: 1.2,
    note: 'Struck and metallic, decaying rather than held — a bell at long lengths.',
    options: {
      harmonicity: 3,
      modulationIndex: 8,
      oscillator: { type: 'sine' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.003, decay: 0.6, sustain: 0.05, release: 0.6 },
      modulationEnvelope: { attack: 0.002, decay: 0.35, sustain: 0.02, release: 0.4 },
    },
    starter: false },
  seedMegadriveMegaSaw: { label: 'Harsh FM Lead · 16-Bit', category: 'FX', synth: 'RMND-2', dur: 1.2,
    note: 'Modulation index high enough to be noise with a pitch in it.',
    options: {
      harmonicity: 1.41,
      modulationIndex: 24,
      oscillator: { type: 'sawtooth' },
      modulation: { type: 'sawtooth' },
      envelope: { attack: 0.002, decay: 0.25, sustain: 0.4, release: 0.2 },
      modulationEnvelope: { attack: 0.002, decay: 0.2, sustain: 0.3, release: 0.2 },
    },
    starter: false },
  seedMegadriveArp: { label: 'Soft FM Bell · 16-Bit', category: 'Bells', synth: 'RMND-2', dur: 1.2,
    note: 'Struck and metallic, decaying rather than held — a bell at long lengths.',
    options: {
      harmonicity: 3,
      modulationIndex: 8,
      oscillator: { type: 'sine' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.003, decay: 0.6, sustain: 0.05, release: 0.6 },
      modulationEnvelope: { attack: 0.002, decay: 0.35, sustain: 0.02, release: 0.4 },
    },
    starter: false },
  seedMegadriveChoir: { label: 'PWM Choir · 16-Bit', category: 'Orch', synth: 'MRDR-3', dur: 8,
    note: 'The /a/ formants again, but over pulses whose widths drift instead of over plain '
      + 'saws. The vowel is held by the filters; the moving source is what turns one singer '
      + 'into a section, and it is doing the job the chorus pedal does on a Juno.',
    layer: {
      osc1: { type: 'pulse', width: 0.5, ratio: 1, gain: 0.9, attack: 0.151, decay: 1.4, sustain: 0.85, release: 1, attackCurve: 'lin', unison: 2, spread: 8, stereo: 0.75, pwm: { type: 'sine', rate: 0.24, depth: 0.6, delay: 0.5 }, filter: { type: 'bandpass', slope: -12, freq: 800, Q: 7, track: 0, env: { attack: 0.006 } } },
      osc2: { type: 'pulse', width: 0.44, ratio: 1, detune: 7, gain: 0.55, attack: 0.187, decay: 1.6, sustain: 0.8, release: 1, attackCurve: 'lin', pwm: { type: 'sine', rate: 0.35, depth: 0.55, delay: 0.5 }, filter: { type: 'bandpass', slope: -12, freq: 1150, Q: 9, track: 0 } },
      osc3: { type: 'pulse', width: 0.55, ratio: 1, detune: -8, gain: 0.3, attack: 0.145, decay: 1.8, sustain: 0.72, release: 1.1, attackCurve: 'lin', pwm: { type: 'sine', rate: 0.17, depth: 0.5, delay: 0.5 }, filter: { type: 'bandpass', slope: -12, freq: 2900, Q: 11, track: 0 } },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 3600, Q: 0.7, track: 0.3, env: { octaves: 1.2, attack: 0.183, decay: 1.8, sustain: 0.55, release: 1 } },
      vca: { attack: 0.022, decay: 1.8, sustain: 0.88, release: 1.3, attackCurve: 'lin' },
    },
    drive: 0.040646, shape: 'soft',
    humanize: { entry: 0.02 },
    vibrato: { depth: 0.16, rate: 5, delay: 0.7, spread: 0 },
    chorus: { mix: 0.37 },
    starter: false },
  seedMegadriveThird: { label: 'FM Piano · 16-Bit', category: 'Keys', synth: 'RMND-2', dur: 2.4,
    note: 'Harmonicity 1 is a full harmonic series; the index falls from bright to nearly a '
      + 'sine across the first second. The DX7 piano everybody has heard.',
    options: {
      harmonicity: 1,
      modulationIndex: 2.4,
      oscillator: { type: 'sine' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.002, decay: 2.4, sustain: 0.02, release: 0.6 },
      modulationEnvelope: { attack: 0.001, decay: 0.9, sustain: 0.06, release: 0.5 },
    },
    starter: false },
  seedMegadriveCounter: { label: 'FM Keys · 16-Bit', category: 'Keys', synth: 'RMND-2', dur: 2.6,
    note: 'Struck keys, percussive enough to keep a stab from smearing into the next bar.',
    options: {
      harmonicity: 2,
      modulationIndex: 4,
      oscillator: { type: 'sine' },
      modulation: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.8, sustain: 0.1, release: 0.8 },
      modulationEnvelope: { attack: 0.004, decay: 0.4, sustain: 0.05, release: 0.5 },
    },
    starter: false },
};
const USER_DRUM = {
  vl1Pi2: { label: 'VL-1 Pi 2', category: 'Blip', homeLane: 'rim', dur: 0.5,
    note: 'A very short, high square-wave tick: the thinner, sharper of the VL-1 rhythm '
      + 'sounds, with a slight high-pass edge and a twenty-millisecond decay.',
    osc: { type: 'square', from: 1000, to: 1000, attack: 0, decay: 0.15, curve: 'exp', gain: 1, hold: 0, pitchCurve: 'snap' },
    tone: { type: 'highpass', freq: 800, Q: 0.7 },
    starter: false },
  fatKick: { label: 'Fat Kick', category: 'Kick', homeLane: 'kick', dur: 1,
    note: 'The game’s own kick, written down: a sine dropping 165 to 48 Hz with a short '
      + 'highpassed beater click and the 300 Hz knock that lets it read on a phone.',
    osc: { type: 'triangle', from: 165, to: 48, sweep: 0.05, attack: 0.006, decay: 0.42, curve: 'exp', gain: 1 },
    knock: 1,
    noise: { type: 'highpass', freq: 1900, Q: 1, decay: 0.0198, gain: 0.31 },
    starter: false },
  bigClap: { label: 'Big Clap', category: 'Clap', homeLane: 'clap', dur: 1,
    note: 'A wide 808-style clap with a low, roomy burst and four taps that spread into a soft '
      + 'machine-room tail.',
    noise: { type: 'bandpass', freq: 1540, to: 950, sweep: 0.16, Q: 1, decay: 0.653, gain: 1 },
    drive: 0.073901,
    taps: [0, 0.0184, 0.0404, 0.0692, 0.098], tapFalloff: 0.82, tapDetune: 0.96, tapTone: 0.96,
    starter: false },
  snareTap: { label: 'Snare Tap', category: 'Snare', dur: 1,
    note: 'Tight and driven.. quick little tap',
    osc: { type: 'square', from: 255, to: 200, sweep: 0.025, decay: 0.05, curve: 'exp', gain: 0.55 },
    noise: { type: 'highpass', freq: 4300, Q: 0.8, decay: 0.112, gain: 1, to: 3710 },
    drive: 0.349411, shape: 'soft',
    tone: { type: 'lowpass', Q: 0.7, freq: 6230 },
    taps: [0, 0.012], tapFalloff: 0.52,
    starter: false,
    trim: -0.478038 },
  blipZap: { label: 'Blip Zap', category: 'FX', homeLane: 'tom', dur: 2,
    note: 'Blippy Zappy highly percussive',
    osc: { type: 'sine', from: 215, to: 16363.49, sweep: 0.04, decay: 0.514, curve: 'exp', gain: 0.88 },
    knock: 0.79,
    noise: { type: 'bandpass', freq: 2680, Q: 0.65, decay: 0.119, gain: 2, color: 'blue', to: 2460 },
    drive: 0.318886,
    bypassed: {
      "osc.fm": { type: 'sawtooth', ratio: 7.14, index: 7, decay: 0.35 },
    },
    starter: false,
    trim: 3.4 },
  simple808StyleHat: { label: 'Simple 808 Style Hat', category: 'Hats', homeLane: 'ohats', dur: 2,
    note: 'Metal with a little Blue noise',
    noise: { type: 'bandpass', freq: 1300, Q: 0.7, decay: 0.323, gain: 1.44, color: 'blue' },
    metal: { freq: 435, spread: 1, count: 6, hp: 6100, Q: 0.9, slope: -24, decay: 0.316, sag: 0.32, gain: 0.94, wave: 'square' },
    humanize: { gain: 0.04 },
    starter: false },
  gbSnare: { label: 'GB Snare', category: 'Snare', dur: 1,
    note: 'Cheap simple game snare',
    osc: { type: 'square', from: 2310, to: 20.85, sweep: 0.392, decay: 0.27, curve: 'exp', gain: 0.55 },
    noise: { type: 'bandpass', freq: 6590, Q: 2.9, decay: 0.768, gain: 1.84, to: 475, color: 'pink', sweep: 0.395, sag: 0.3, slope: -12 },
    drive: 0.397771, shape: 'soft',
    tone: { type: 'lowpass', Q: 0.7, freq: 7085 },
    taps: [0, 0.012], tapFalloff: 0.52,
    starter: false,
    trim: -0.383609 },

  bigRoomClap: { label: 'Big Room Clap', category: 'Clap', dur: 1,
    note: 'Five bursts spread wider with a long tail on the last — a hall, not a booth. Wants '
      + 'space in the arrangement.',
    noise: { type: 'bandpass', freq: 1500, Q: 0.9, decay: 0.355, gain: 0.88 },
    taps: [0, 0.014, 0.028, 0.048], tapFalloff: 0.82, tapDetune: 0.94, tapTone: 0.97,
    starter: false,
    trim: 3 },
  gameBoySnare: { label: 'Game Boy Snare', category: 'Snare', dur: 0.5,
    note: 'Pink-noise crack with a square body dropping 2.3k to 80 — the handheld backbeat, chokeable against the other arcade drums.',
    osc: { type: 'square', from: 2345, to: 80, sweep: 0.37, decay: 0.37, gain: 1.02 },
    noise: { type: 'bandpass', freq: 3710, Q: 2.85, decay: 0.905, gain: 1.98, color: 'pink' },
    trim: 1.9,
    monoGroup: '1',
    starter: false },
  dataRibbon: { label: 'Data Ribbon', category: 'FX', homeLane: 'tom', dur: 2.1,
    note: 'A sleek digital ribbon: one long ascending gesture with animated sidebands and '
      + 'three ghosted echoes. The SPEED ZONE cabinet’s dive cue.',
    osc: { type: 'sawtooth', from: 130, to: 5000, sweep: 0.7, pitchCurve: 'lin', attack: 0.001, decay: 0.86, curve: 'exp', gain: 0.58, fm: { type: 'sine', ratio: 3.7, index: 0.85, attack: 0.001, decay: 0.4 } },
    osc2: { type: 'sine', from: 260, to: 2500, sweep: 0.52, pitchCurve: 'exp', attack: 0.001, decay: 0.55, curve: 'exp', gain: 0.23 },
    noise: { type: 'bandpass', freq: 900, to: 14500, sweep: 0.68, Q: 3.4, slope: -24, color: 'violet', attack: 0.06, decay: 0.82, curve: 'exp', gain: 0.52 },
    ring: { freq: 4200, Q: 115, hit: 0.001, decay: 0.78, gain: 0.36 },
    drive: 0.304452, shape: 'soft',
    tone: { freq: 10000 },
    taps: [0, 0.13, 0.29], tapFalloff: 0.54, tapDetune: 1.02, tapTone: 0.92,
    starter: false,
    trim: -0.627151 },
  sweepUp: { label: 'Sweep Up', category: 'Sweep', homeLane: 'tom', dur: 3,
    note: 'Sweep Up SFX',
    osc: { type: 'square', from: 39, to: 1527.62, sweep: 0.654, pitchCurve: 'snap', attack: 0.017, hold: 0.468, decay: 0.003, curve: 'lin', gain: 0.54 },
    osc2: { type: 'sawtooth', from: 828, to: 20000, sweep: 0.375, decay: 1.835, curve: 'exp', gain: 0.61, attack: 0.061, hold: 0.005 },
    ring: { type: 'bandpass', freq: 611, Q: 40, hit: 0.05, attack: 0.068, decay: 0.027, curve: 'exp', gain: 1, to: 6177 },
    metal: { wave: 'square', freq: 800, spread: 1, count: 6, hp: 1090, Q: 0.7, attack: 0.124, decay: 0.011, gain: 0.96, hpTo: 1375 },
    drive: 0,
    taps: [0, 0.042, 0.084], tapFalloff: 0.78, tapDecays: [0.6, 2.437],
    bypassed: {
      noise: { type: 'bandpass', freq: 1130, Q: 0.7, decay: 0.001, gain: 0.65, color: 'brown', to: 440, sweep: 0.092, attack: 0.005, hold: 0, slope: -12, curve: 'exp', sag: 0.37, sagAt: 0.003 },
      "metal.resonator": { feedback: 0.93, drive: 1.25, leak: 0.00035 },
    },
    starter: false },
  seedFutureBassKick: { label: '= Click-Top Kick · Future Bass', category: 'Kick', homeLane: 'kick', dur: 1.2,
    note: 'A 909 kick is a body and a separately tuned CLICK, not one oscillator with a fast '
      + 'front on it: the top falls from 1.6 kHz to 320 Hz in four milliseconds while the '
      + 'body underneath has barely started to move.',
    osc: { type: 'sine', from: 128, to: 46, sweep: 0.06, pitchCurve: 'snap', decay: 0.5, curve: 'exp', gain: 1 },
    osc2: { type: 'triangle', from: 1600, to: 320, sweep: 0.004, decay: 0.014, curve: 'exp', gain: 0.5 },
    drive: 0.278115,
    starter: false },
  seedFutureBassSnare: { label: 'Synth Snare · Future Bass', category: 'Snare', dur: 1,
    note: 'The two-source snare: a triangle knock falling a fourth under a wide band of noise '
      + 'that rings a little longer than the body does.',
    osc: { type: 'triangle', from: 210, to: 165, sweep: 0.04, decay: 0.11, curve: 'exp', gain: 0.7 },
    noise: { type: 'bandpass', freq: 2100, Q: 0.8, decay: 0.17, gain: 1 },
    drive: 0.176114,
    starter: false },
  seedFutureBassClap: { label: 'Big Room Clap · Future Bass', category: 'Clap', dur: 1,
    note: 'Five bursts spread wider with a long tail on the last — a hall, not a booth. Wants '
      + 'space in the arrangement.',
    noise: { type: 'bandpass', freq: 1500, Q: 0.9, decay: 0.5, gain: 0.88 },
    taps: [0, 0.014, 0.037, 0.058, 0.083], tapFalloff: 0.89,
    starter: false },
  seedFutureBassHats: { label: 'Synth Closed Hat · Future Bass', category: 'Hats', dur: 0.5,
    note: 'A resonant highpassed tick — sharper than the plain closed hat, closer to metal '
      + 'without being metal.',
    noise: { type: 'highpass', freq: 7800, Q: 1.2, decay: 0.032, gain: 1 },
    starter: false },
  seedFutureBassOhats: { label: '= Snap Open Hat · Future Bass', category: 'Hats', homeLane: 'ohats', dur: 2,
    note: 'The same hat held open: the sweep runs the other way over four tenths of a second, '
      + 'so the wash goes dull as it dies the way a real cymbal does.',
    noise: { type: 'highpass', freq: 8000, to: 5200, sweep: 0.4, Q: 1.2, decay: 0.42, gain: 1 },
    drive: 0.267879,
    starter: false },
  seedFutureBassCrash: { label: '=909 Crash · Future Bass', category: 'Crash', homeLane: 'crash', dur: 5,
    note: 'A bright 909-style crash with a dense front and a high end that darkens as it '
      + 'decays, intended for phrase changes rather than every bar.',
    noise: { type: 'lowpass', freq: 9200, to: 2400, sweep: 0.9, Q: 0.8, decay: 1.35, gain: 1 },
    metal: { wave: 'square', freq: 610, spread: 1, count: 6, hp: 3300, Q: 0.8, decay: 0.65, gain: 0.8 },
    drive: 0.456924,
    starter: false },
  seedFutureBassImpact: { label: 'Synare · Future Bass', category: 'Sweep', homeLane: 'tom', dur: 4,
    note: 'The long one: 3 kHz to 60 over a second and a half, with two seconds of envelope '
      + 'under it so the bottom of the fall is still audible when it arrives. Five and a '
      + 'half octaves — a whole bar of descent at a disco tempo.',
    osc: { type: 'sine', from: 3000, to: 60, sweep: 1.5, pitchCurve: 'exp', attack: 0.004, hold: 1.05, decay: 1.05, curve: 'lin', gain: 1 },
    drive: 0.12,
    starter: false },
  seedFutureBassFill: { label: '=909 Tom · Future Bass', category: 'Tom', homeLane: 'tom', dur: 1,
    note: 'A tuned 909-style tom with a clean electronic pitch fall and a small low skin click '
      + 'at the front of the note.',
    osc: { type: 'sine', from: 260, to: 125, sweep: 0.08, decay: 0.34, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 1500, Q: 0.8, decay: 0.025, gain: 0.2 },
    drive: 0.120223,
    starter: false },
  seedFutureBassShaker: { label: 'Shaker · Future Bass', category: 'Perc', homeLane: 'rim', dur: 0.5,
    note: 'A soft band with no attack to speak of. Sixteenths of this sit under anything '
      + 'without competing.',
    noise: { type: 'bandpass', freq: 6000, Q: 1.1, decay: 0.06 },
    starter: false },
  seedFutureBassTambourine: { label: 'Tambourine · Future Bass', category: 'Perc', homeLane: 'rim', dur: 1,
    note: 'Bright, jangly and slightly longer, with a touch of pitch in it.',
    osc: { type: 'square', from: 900, to: 780, sweep: 0.05, decay: 0.05, gain: 0.12 },
    noise: { type: 'highpass', freq: 5200, Q: 0.6, decay: 0.14 },
    starter: false },
  seedFutureBassCowbell: { label: '=808 Cowbell · Future Bass', category: 'Perc', homeLane: 'tom', dur: 1,
    note: 'The actual TR-808 cowbell topology: simultaneous 540 and 800 Hz squares through a '
      + '1.3 kHz bandpass, with a 200ms exponential VCA cut-off.',
    metal: { wave: 'square', freq: 540, ratios: [1, 1.481481], spread: 1, count: 2, filter: 'bandpass', hp: 1300, Q: 4, slope: -12, attack: 0, decay: 0.2, floor: 0.001, hardStop: true, resonator: { feedback: 0.96, drive: 1.4, leak: 0.0005 } },
    starter: false },
  seedFutureBassCongas: { label: 'Conga · Future Bass', category: 'Perc', homeLane: 'tom', dur: 1,
    note: 'A centered open conga with a warm falling body and a little shell noise on the '
      + 'front, designed to answer the high and low voices cleanly.',
    osc: { type: 'sine', from: 285, to: 205, sweep: 0.045, decay: 0.32, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 1700, Q: 0.65, decay: 0.022, gain: 0.3 },
    drive: 0.098995,
    starter: false },
  seedFutureBassRide: { label: 'Ride · Future Bass', category: 'Crash', homeLane: 'crash', dur: 4,
    note: 'A ride with a bell you can hear: a narrow 2.5 kHz resonance for the ping over a '
      + 'six-bit wash, lowpassed at 9.5 kHz. The 909’s ride was a sample and its grit is '
      + 'half of why the sound is recognisable, so the crush is doing the work here that the '
      + 'filter sweeps do on the 808 presets.',
    ring: { freq: 2500, Q: 70, hit: 0.0018, decay: 0.25, gain: 0.6 },
    metal: { wave: 'square', freq: 780, count: 6, spread: 1.12, filter: 'highpass', hp: 5400, Q: 0.8, slope: -24, attack: 0.004, decay: 1.6, sag: 0.3, sagAt: 0.06, gain: 0.55 },
    drive: 0.6, shape: 'crush',
    tone: { type: 'lowpass', freq: 9500, Q: 0.7 },
    humanize: { gain: 0.03 },
    starter: false },
  seedReggaetonKick: { label: '=808 Kick · Reggaeton', category: 'Kick', homeLane: 'kick', dur: 3,
    note: 'A long 808-style sub kick: deep sine drop, soft front click and a tail that can '
      + 'become the bass line when it is tuned in a pattern.',
    osc: { type: 'sine', from: 170, to: 36, sweep: 0.06, attack: 0.001, decay: 0.78, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 2200, Q: 0.7, decay: 0.02, gain: 0.25 },
    drive: 0.121058,
    starter: false },
  seedReggaetonSnare: { label: 'Tight Snare · Reggaeton', category: 'Snare', dur: 1,
    note: 'Gated: cut off almost before it starts. Sits under a busy hat pattern without '
      + 'smearing it.',
    osc: { type: 'triangle', from: 240, to: 170, sweep: 0.03, decay: 0.03, gain: 0.3 },
    noise: { type: 'bandpass', freq: 3200, Q: 1.1, decay: 0.045 },
    starter: false },
  seedReggaetonClap: { label: 'Tight Snare · Reggaeton', category: 'Snare', dur: 1,
    note: 'Gated: cut off almost before it starts. Sits under a busy hat pattern without '
      + 'smearing it.',
    osc: { type: 'triangle', from: 240, to: 170, sweep: 0.03, decay: 0.03, gain: 0.3 },
    noise: { type: 'bandpass', freq: 3200, Q: 1.1, decay: 0.045 },
    starter: false },
  seedReggaetonHats: { label: 'Synth Closed Hat · Reggaeton', category: 'Hats', dur: 0.5,
    note: 'A resonant highpassed tick — sharper than the plain closed hat, closer to metal '
      + 'without being metal.',
    noise: { type: 'highpass', freq: 7800, Q: 1.2, decay: 0.032, gain: 1 },
    starter: false },
  seedReggaetonOhats: { label: '=808 Open Hat · Reggaeton', category: 'Hats', homeLane: 'ohats', dur: 2,
    note: 'The open 808-style cymbal partner: the same inharmonic cluster left ringing with a '
      + 'lower filter so its body is audible as it fades, plus a restrained resonant tail.',
    metal: { freq: 540, spread: 1, count: 6, hp: 6100, Q: 0.9, slope: -24, decay: 0.42, resonator: { feedback: 0.92, drive: 1.2, leak: 0.00025 } },
    humanize: { gain: 0.04 },
    starter: false },
  seedReggaetonCrash: { label: 'Ride · Reggaeton', category: 'Crash', homeLane: 'crash', dur: 4,
    note: 'A ride with a bell you can hear: a narrow 2.5 kHz resonance for the ping over a '
      + 'six-bit wash, lowpassed at 9.5 kHz. The 909’s ride was a sample and its grit is '
      + 'half of why the sound is recognisable, so the crush is doing the work here that the '
      + 'filter sweeps do on the 808 presets.',
    noise: { type: 'bandpass', freq: 1775, Q: 0.7, decay: 1.234, gain: 0.52, sweep: 2.362, to: 65 },
    ring: { freq: 2500, Q: 70, hit: 0.0018, decay: 1.286, gain: 0.6 },
    metal: { wave: 'square', freq: 780, count: 6, spread: 1.12, filter: 'highpass', hp: 5400, Q: 0.8, slope: -24, attack: 0.004, decay: 4.194, sag: 0.3, sagAt: 0.06, gain: 0.55 },
    drive: 0.6, shape: 'crush',
    tone: { type: 'lowpass', freq: 9500, Q: 0.7 },
    humanize: { gain: 0.03 },
    bypassed: {
      osc2: { type: 'triangle', from: 285, to: 190, sweep: 0.07, decay: 0.884, curve: 'exp', gain: 1.47 },
    },
    starter: false },
  seedReggaetonImpact: { label: 'Synare · Reggaeton', category: 'Sweep', homeLane: 'tom', dur: 4,
    note: 'The long one: 3 kHz to 60 over a second and a half, with two seconds of envelope '
      + 'under it so the bottom of the fall is still audible when it arrives. Five and a '
      + 'half octaves — a whole bar of descent at a disco tempo.',
    osc: { type: 'sine', from: 3000, to: 60, sweep: 1.5, pitchCurve: 'exp', attack: 0.004, hold: 1.05, decay: 1.05, curve: 'lin', gain: 1 },
    drive: 0.12,
    starter: false },
  seedReggaetonFill: { label: 'Havana Patio · Conga · Reggaeton', category: 'Perc', homeLane: 'tom', dur: 1,
    note: 'Latin house: a solid club kick and handclaps, with open conga, woody clave and '
      + 'sandy shaker accents over a four-on-the-floor groove.',
    osc: { type: 'sine', from: 235, to: 195, sweep: 0.015, attack: 0.001, decay: 0.28, curve: 'exp', gain: 1 },
    osc2: { type: 'sine', from: 325, to: 315, sweep: 0.008, decay: 0.075, gain: 0.18 },
    noise: { type: 'lowpass', freq: 1700, Q: 0.65, decay: 0.022, gain: 0.3 },
    drive: 0.131258,
    starter: false },
  seedReggaetonShaker: { label: 'Synth Shaker · Reggaeton', category: 'Perc', homeLane: 'rim', dur: 0.5,
    note: 'The one drum here with an ATTACK: the noise fades in over twenty milliseconds, '
      + 'which is the whole difference between a shaker and a hat.',
    noise: { type: 'bandpass', freq: 6300, Q: 1.4, attack: 0.018, decay: 0.05, gain: 1 },
    starter: false },
  seedReggaetonTambourine: { label: 'Tambourine · Reggaeton', category: 'Perc', homeLane: 'rim', dur: 1,
    note: 'Bright, jangly and slightly longer, with a touch of pitch in it.',
    osc: { type: 'square', from: 900, to: 780, sweep: 0.05, decay: 0.05, gain: 0.12 },
    noise: { type: 'highpass', freq: 5200, Q: 0.6, decay: 0.14 },
    starter: false },
  seedReggaetonCowbell: { label: 'Havana Patio · Clave · Reggaeton', category: 'Perc', homeLane: 'rim', dur: 0.5,
    note: 'Latin house: a solid club kick and handclaps, with open conga, woody clave and '
      + 'sandy shaker accents over a four-on-the-floor groove.',
    osc: { type: 'triangle', from: 1900, to: 1790, sweep: 0.016, curve: 'exp', attack: 0.0006, decay: 0.075, gain: 0.6 },
    ring: { freq: 2500, Q: 70, hit: 0.001, decay: 0.045, gain: 0.35 },
    drive: 0.061099,
    tone: { type: 'lowpass', freq: 5200, Q: 0.7 },
    starter: false },
  seedReggaetonCongas: { label: 'Conga · Reggaeton', category: 'Perc', homeLane: 'tom', dur: 1,
    note: 'A high conga: a short pitched slap into a light skin body, tuned for the top voice '
      + 'of a three-drum conga figure.',
    osc: { type: 'triangle', from: 375, to: 285, sweep: 0.028, decay: 0.2, curve: 'exp', gain: 0.82 },
    noise: { type: 'lowpass', freq: 2400, Q: 0.7, decay: 0.018, gain: 0.32 },
    drive: 0.068785,
    starter: false },
  seedReggaetonRide: { label: 'Ride · Reggaeton', category: 'Crash', homeLane: 'crash', dur: 4,
    note: 'A ride with a bell you can hear: a narrow 2.5 kHz resonance for the ping over a '
      + 'six-bit wash, lowpassed at 9.5 kHz. The 909’s ride was a sample and its grit is '
      + 'half of why the sound is recognisable, so the crush is doing the work here that the '
      + 'filter sweeps do on the 808 presets.',
    ring: { freq: 2500, Q: 70, hit: 0.0018, decay: 0.25, gain: 0.6 },
    metal: { wave: 'square', freq: 780, count: 6, spread: 1.12, filter: 'highpass', hp: 5400, Q: 0.8, slope: -24, attack: 0.004, decay: 1.6, sag: 0.3, sagAt: 0.06, gain: 0.55 },
    drive: 0.6, shape: 'crush',
    tone: { type: 'lowpass', freq: 9500, Q: 0.7 },
    humanize: { gain: 0.03 },
    starter: false },
  seedChipstepKick: { label: '=909 Kick Punch · Chipstep', category: 'Kick', homeLane: 'kick', dur: 1,
    note: 'A shorter, louder 909-style kick with a more obvious front edge and a tighter tail '
      + 'for four-on-the-floor patterns.',
    osc: { type: 'sine', from: 225, to: 52, sweep: 0.025, attack: 0.001, decay: 0.24, curve: 'exp', gain: 1 },
    noise: { type: 'bandpass', freq: 1450, Q: 1.1, decay: 0.018, gain: 0.52 },
    drive: 0.447312,
    starter: false },
  seedChipstepSnare: { label: 'Crack Snare · Chipstep', category: 'Snare', dur: 1,
    note: 'Tight and driven: a short square knock, highpassed air, everything over in a tenth '
      + 'of a second. The backbeat for fast songs.',
    osc: { type: 'square', from: 255, to: 440, sweep: 0.025, decay: 0.05, curve: 'exp', gain: 0.55 },
    noise: { type: 'highpass', freq: 2900, Q: 0.8, decay: 0.3, gain: 1 },
    drive: 0.63,
    starter: false,
    trim: 1.9 },
  seedChipstepClap: { label: '=909 Snare Crack · Chipstep', category: 'Snare', homeLane: 'snare', dur: 1,
    note: 'A sharper 909-style snare variant with a square shell and high-passed wire noise '
      + 'for a more aggressive dance-floor backbeat.',
    osc: { type: 'square', from: 260, to: 190, sweep: 0.022, decay: 0.06, curve: 'exp', gain: 0.5 },
    noise: { type: 'highpass', freq: 3100, Q: 0.9, decay: 0.12, gain: 1 },
    drive: 0.414465,
    starter: false },
  seedChipstepHats: { label: '= Arcade Hat · Chipstep', category: 'Hats', homeLane: 'hats', dur: 0.5,
    note: 'The game’s own closed hat, exactly: noise above 5.2 kHz, gone in fifty '
      + 'milliseconds. The tick under two thirds of the soundtrack.',
    noise: { type: 'highpass', freq: 5200, Q: 1, decay: 0.0932, gain: 1 },
    starter: false },
  seedChipstepOhats: { label: 'Open Hat · Chipstep', category: 'Hats', homeLane: 'ohats', dur: 3,
    note: 'The 909’s open hat is a six-bit sample, so this is the cluster quantised to six '
      + 'bits — `crush` at 0.6, which is exactly where this engine’s curve lands — under an '
      + '11 kHz lowpass standing in for the real anti-aliasing filter. Dirtier and flatter '
      + 'than the 808, which is the difference.',
    metal: { wave: 'square', freq: 620, count: 6, spread: 1.06, filter: 'highpass', hp: 6400, Q: 0.85, slope: -24, decay: 0.55, sag: 0.42, sagAt: 0.045, gain: 0.95 },
    drive: 0.6, shape: 'crush',
    tone: { type: 'lowpass', freq: 11000, Q: 0.7 },
    humanize: { gain: 0.04 },
    starter: false },
  seedChipstepCrash: { label: '=909 Crash · Chipstep', category: 'Crash', homeLane: 'crash', dur: 5,
    note: 'A bright 909-style crash with a dense front and a high end that darkens as it '
      + 'decays, intended for phrase changes rather than every bar.',
    noise: { type: 'lowpass', freq: 9200, to: 2400, sweep: 0.9, Q: 0.8, decay: 2.558, gain: 1 },
    metal: { wave: 'square', freq: 610, spread: 1, count: 6, hp: 3300, Q: 0.8, decay: 1.259, gain: 0.8 },
    drive: 0.456924,
    starter: false },
  seedChipstepImpact: { label: 'KW Blip · Chipstep', category: 'Blip', homeLane: 'tom', dur: 1,
    note: 'One sawtooth falling from 2.4 kHz to 210 in fifty milliseconds through a resonant '
      + 'lowpass with the loop closed around it — the big descending blip, and the KLNG8 '
      + 'answer to the six-octave MembraneSynth the megamix has been using.',
    metal: { wave: 'sawtooth', freq: 2400, to: 210, sweep: 0.05, ratios: [1], count: 1, spread: 1, filter: 'lowpass', hp: 3000, Q: 2, slope: -12, attack: 0.0005, decay: 0.16, sag: 0.28, sagAt: 0.015, gain: 0.8, resonator: { feedback: 0.93, drive: 1.35, leak: 0.0004 } },
    drive: 0.236329,
    starter: false },
  seedChipstepFill: { label: 'KW Blip · Chipstep', category: 'Blip', homeLane: 'rim', dur: 0.5,
    note: 'The plain one, and the one to reach for first: three sine partials at 880 Hz '
      + 'through a narrow band, struck and gone in under a tenth of a second. Pitched enough '
      + 'to play a line with, short enough to sit on a sixteenth.',
    ring: { freq: 880, Q: 90, hit: 0.0012, decay: 0.14, gain: 1 },
    metal: { wave: 'sine', freq: 880, ratios: [1, 2.01, 3.03], count: 3, spread: 1, filter: 'bandpass', hp: 1780, Q: 24, slope: -12, attack: 0.0005, decay: 0.085, sag: 0.25, sagAt: 0.008, gain: 1.7, resonator: { feedback: 0.975, drive: 1.3, leak: 0.0003 } },
    starter: false },
  seedChipstepShaker: { label: 'Shaker · Chipstep', category: 'Perc', homeLane: 'rim', dur: 0.5,
    note: 'A soft band with no attack to speak of. Sixteenths of this sit under anything '
      + 'without competing.',
    noise: { type: 'bandpass', freq: 6000, Q: 1.1, decay: 0.06 },
    starter: false },
  seedChipstepTambourine: { label: 'Tambourine · Chipstep', category: 'Perc', homeLane: 'rim', dur: 1,
    note: 'Bright, jangly and slightly longer, with a touch of pitch in it.',
    osc: { type: 'square', from: 900, to: 780, sweep: 0.05, decay: 0.05, gain: 0.12 },
    noise: { type: 'highpass', freq: 5200, Q: 0.6, decay: 0.14 },
    starter: false },
  seedChipstepCowbell: { label: '=808 Cowbell · Chipstep', category: 'Perc', homeLane: 'tom', dur: 1,
    note: 'The actual TR-808 cowbell topology: simultaneous 540 and 800 Hz squares through a '
      + '1.3 kHz bandpass, with a 200ms exponential VCA cut-off.',
    metal: { wave: 'square', freq: 540, ratios: [1, 1.481481], spread: 1, count: 2, filter: 'bandpass', hp: 1300, Q: 4, slope: -12, attack: 0, decay: 0.2, floor: 0.001, hardStop: true, resonator: { feedback: 0.96, drive: 1.4, leak: 0.0005 } },
    starter: false },
  seedChipstepCongas: { label: 'Conga · Chipstep', category: 'Perc', homeLane: 'tom', dur: 1,
    note: 'A centered open conga with a warm falling body and a little shell noise on the '
      + 'front, designed to answer the high and low voices cleanly.',
    osc: { type: 'sine', from: 285, to: 205, sweep: 0.045, decay: 0.32, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 1700, Q: 0.65, decay: 0.022, gain: 0.3 },
    drive: 0.098995,
    starter: false },
  seedChipstepRide: { label: 'Ride · Chipstep', category: 'Crash', homeLane: 'crash', dur: 4,
    note: 'A ride with a bell you can hear: a narrow 2.5 kHz resonance for the ping over a '
      + 'six-bit wash, lowpassed at 9.5 kHz. The 909’s ride was a sample and its grit is '
      + 'half of why the sound is recognisable, so the crush is doing the work here that the '
      + 'filter sweeps do on the 808 presets.',
    ring: { freq: 2500, Q: 70, hit: 0.0018, decay: 0.25, gain: 0.6 },
    metal: { wave: 'square', freq: 780, count: 6, spread: 1.12, filter: 'highpass', hp: 5400, Q: 0.8, slope: -24, attack: 0.004, decay: 1.6, sag: 0.3, sagAt: 0.06, gain: 0.55 },
    drive: 0.6, shape: 'crush',
    tone: { type: 'lowpass', freq: 9500, Q: 0.7 },
    humanize: { gain: 0.03 },
    starter: false },
  seedTranceKick: { label: '=909 Kick Punch · Trance', category: 'Kick', homeLane: 'kick', dur: 1,
    note: 'A shorter, louder 909-style kick with a more obvious front edge and a tighter tail '
      + 'for four-on-the-floor patterns.',
    osc: { type: 'sine', from: 225, to: 52, sweep: 0.025, attack: 0.001, decay: 0.324, curve: 'exp', gain: 1 },
    knock: 0.23,
    noise: { type: 'bandpass', freq: 1450, Q: 1.1, decay: 0.03, gain: 0.52 },
    drive: 0.447312,
    starter: false },
  seedTranceSnare: { label: 'Synth Snare · Trance', category: 'Snare', dur: 1,
    note: 'The two-source snare: a triangle knock falling a fourth under a wide band of noise '
      + 'that rings a little longer than the body does.',
    osc: { type: 'triangle', from: 210, to: 165, sweep: 0.04, decay: 0.11, curve: 'exp', gain: 0.7 },
    knock: 0.44,
    noise: { type: 'bandpass', freq: 2100, Q: 0.8, decay: 0.179, gain: 1 },
    drive: 0.18393,
    starter: false },
  seedTranceClap: { label: 'Big Room Clap · Trance', category: 'Clap', dur: 1,
    note: 'Five bursts spread wider with a long tail on the last — a hall, not a booth. Wants '
      + 'space in the arrangement.',
    noise: { type: 'bandpass', freq: 1500, Q: 0.9, decay: 0.355, gain: 0.88 },
    taps: [0, 0.014, 0.028, 0.048], tapFalloff: 0.82, tapDetune: 0.94, tapTone: 0.97,
    starter: false,
    trim: 3 },
  seedTranceHats: { label: 'Synth Closed Hat · Trance', category: 'Hats', dur: 0.5,
    note: 'A resonant highpassed tick — sharper than the plain closed hat, closer to metal '
      + 'without being metal.',
    noise: { type: 'highpass', freq: 7800, Q: 1.2, decay: 0.032, gain: 1 },
    starter: false },
  seedTranceOhats: { label: '=909 Open Hat · Trance', category: 'Hats', homeLane: 'ohats', dur: 2,
    note: 'The open partner to =909 Hat: the same bright attack opening into a controlled '
      + 'metallic wash instead of a long cymbal tail.',
    noise: { type: 'highpass', freq: 7600, to: 5200, sweep: 0.35, Q: 1.2, decay: 0.38, gain: 1 },
    drive: 0.217597,
    starter: false },
  seedTranceCrash: { label: '= Arcade Snare · Trance', category: 'Snare', homeLane: 'snare', dur: 1,
    note: 'The game’s own snare: a 2.6 kHz band of noise with a triangle body falling 210 to '
      + '140 Hz under it. The backbeat every song was balanced against.',
    osc: { type: 'triangle', from: 210, to: 140, sweep: 0.05, decay: 0.1031, curve: 'exp', gain: 0.375 },
    noise: { type: 'bandpass', freq: 2600, Q: 0.7, decay: 0.1437, gain: 1 },
    starter: false },
  seedTranceImpact: { label: 'Synare · Deep Pew · Trance', category: 'Sweep', homeLane: 'tom', dur: 4,
    note: 'The long one: 3 kHz to 60 over a second and a half, with two seconds of envelope '
      + 'under it so the bottom of the fall is still audible when it arrives. Five and a '
      + 'half octaves — a whole bar of descent at a disco tempo.',
    osc: { type: 'sine', from: 3000, to: 60, sweep: 1.5, pitchCurve: 'exp', attack: 0.004, hold: 1.05, decay: 1.05, curve: 'lin', gain: 1 },
    drive: 0.12,
    starter: false },
  seedTranceFill: { label: '=909 Tom · Trance', category: 'Tom', homeLane: 'tom', dur: 1,
    note: 'A tuned 909-style tom with a clean electronic pitch fall and a small low skin click '
      + 'at the front of the note.',
    osc: { type: 'sine', from: 260, to: 125, sweep: 0.08, decay: 0.34, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 1500, Q: 0.8, decay: 0.025, gain: 0.2 },
    drive: 0.120223,
    starter: false },
  seedTranceShaker: { label: 'Shaker · Trance', category: 'Perc', homeLane: 'rim', dur: 0.5,
    note: 'A soft band with no attack to speak of. Sixteenths of this sit under anything '
      + 'without competing.',
    noise: { type: 'bandpass', freq: 6000, Q: 1.1, decay: 0.06 },
    starter: false },
  seedTranceTambourine: { label: 'Tambourine · Trance', category: 'Perc', homeLane: 'rim', dur: 1,
    note: 'Bright, jangly and slightly longer, with a touch of pitch in it.',
    osc: { type: 'square', from: 900, to: 780, sweep: 0.05, decay: 0.05, gain: 0.12 },
    noise: { type: 'highpass', freq: 5200, Q: 0.6, decay: 0.14 },
    starter: false },
  seedTranceCowbell: { label: '=808 Cowbell · Trance', category: 'Perc', homeLane: 'tom', dur: 1,
    note: 'The actual TR-808 cowbell topology: simultaneous 540 and 800 Hz squares through a '
      + '1.3 kHz bandpass, with a 200ms exponential VCA cut-off.',
    metal: { wave: 'square', freq: 540, ratios: [1, 1.481481], spread: 1, count: 2, filter: 'bandpass', hp: 1300, Q: 4, slope: -12, attack: 0, decay: 0.2, floor: 0.001, hardStop: true, resonator: { feedback: 0.96, drive: 1.4, leak: 0.0005 } },
    starter: false },
  seedTranceCongas: { label: 'Conga · Mid · Trance', category: 'Perc', homeLane: 'tom', dur: 1,
    note: 'A centered open conga with a warm falling body and a little shell noise on the '
      + 'front, designed to answer the high and low voices cleanly.',
    osc: { type: 'sine', from: 285, to: 205, sweep: 0.045, decay: 0.32, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 1700, Q: 0.65, decay: 0.022, gain: 0.3 },
    drive: 0.098995,
    starter: false },
  seedTranceRide: { label: '909 Lo-Fi Ride · Trance', category: 'Crash', homeLane: 'crash', dur: 4,
    note: 'A ride with a bell you can hear: a narrow 2.5 kHz resonance for the ping over a '
      + 'six-bit wash, lowpassed at 9.5 kHz. The 909’s ride was a sample and its grit is '
      + 'half of why the sound is recognisable, so the crush is doing the work here that the '
      + 'filter sweeps do on the 808 presets.',
    ring: { freq: 2500, Q: 70, hit: 0.0018, decay: 0.25, gain: 0.6 },
    metal: { wave: 'square', freq: 780, count: 6, spread: 1.12, filter: 'highpass', hp: 5400, Q: 0.8, slope: -24, attack: 0.004, decay: 1.6, sag: 0.3, sagAt: 0.06, gain: 0.55 },
    drive: 0.6, shape: 'crush',
    tone: { type: 'lowpass', freq: 9500, Q: 0.7 },
    humanize: { gain: 0.03 },
    starter: false },
  seedItaloDiscoKick: { label: '=909 Kick · Italo Disco', category: 'Kick', homeLane: 'kick', dur: 2,
    note: 'A compact 909-style kick: hard beater click, fast pitch drop and a firm low body '
      + 'that stays out of the sub for the next bass note.',
    osc: { type: 'sine', from: 185, to: 45, sweep: 0.035, attack: 0.001, decay: 0.42, curve: 'exp', gain: 1 },
    noise: { type: 'highpass', freq: 2600, Q: 1.2, decay: 0.012, gain: 0.34 },
    drive: 0.312548,
    starter: false },
  seedItaloDiscoSnare: { label: '=808 Snare · Italo Disco', category: 'Snare', homeLane: 'snare', dur: 1,
    note: 'A round 808-style snare with a low electronic shell under a broad, slightly darker '
      + 'noise body than the sharper 909 family.',
    osc: { type: 'triangle', from: 190, to: 145, sweep: 0.035, decay: 0.13, curve: 'exp', gain: 0.62 },
    noise: { type: 'bandpass', freq: 1750, Q: 0.7, decay: 0.18, gain: 1 },
    drive: 0.163974,
    starter: false },
  seedItaloDiscoClap: { label: 'Big Room Clap · Italo Disco', category: 'Clap', dur: 1,
    note: 'Five bursts spread wider with a long tail on the last — a hall, not a booth. Wants '
      + 'space in the arrangement.',
    noise: { type: 'bandpass', freq: 1500, Q: 0.9, decay: 0.355, gain: 0.88 },
    taps: [0, 0.0116, 0.0232, 0.04], tapFalloff: 0.82, tapDetune: 0.94, tapTone: 0.97,
    starter: false,
    trim: 3 },
  seedItaloDiscoHats: { label: '=CR78 Hat · Italo Disco', category: 'Hats', homeLane: 'hats', dur: 0.5,
    note: 'A dry, dusty CR78-style hat with a lower cutoff and a short envelope that keeps the '
      + 'machine pulse present without sounding glossy.',
    noise: { type: 'highpass', freq: 4800, Q: 0.7, decay: 0.055, gain: 0.8 },
    starter: false },
  seedItaloDiscoOhats: { label: '=808 Open Hat · Italo Disco', category: 'Hats', homeLane: 'ohats', dur: 2,
    note: 'The open 808-style cymbal partner: the same inharmonic cluster left ringing with a '
      + 'lower filter so its body is audible as it fades, plus a restrained resonant tail.',
    metal: { freq: 540, spread: 1, count: 6, hp: 6100, Q: 0.9, slope: -24, decay: 0.42, resonator: { feedback: 0.92, drive: 1.2, leak: 0.00025 } },
    humanize: { gain: 0.04 },
    starter: false },
  seedItaloDiscoCrash: { label: '=909 Crash · Italo Disco', category: 'Crash', homeLane: 'crash', dur: 5,
    note: 'A bright 909-style crash with a dense front and a high end that darkens as it '
      + 'decays, intended for phrase changes rather than every bar.',
    noise: { type: 'lowpass', freq: 9200, to: 2400, sweep: 0.9, Q: 0.8, decay: 1.35, gain: 1 },
    metal: { wave: 'square', freq: 610, spread: 1, count: 6, hp: 3300, Q: 0.8, decay: 0.65, gain: 0.8 },
    drive: 0.456924,
    starter: false },
  seedItaloDiscoFill: { label: 'Syndrum · Disco Tom · Italo Disco', category: 'Sweep', homeLane: 'tom', dur: 2,
    note: 'The falling tom that is on every record from 1978: a triangle jumping to 460 Hz and '
      + 'discharging onto 62 in two hundred milliseconds, with twelve milliseconds of '
      + 'lowpassed noise for the trigger click on the front.',
    osc: { type: 'triangle', from: 460, to: 62, sweep: 0.2, pitchCurve: 'snap', attack: 0.0008, decay: 0.42, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 1800, Q: 0.7, decay: 0.012, gain: 0.22 },
    drive: 0.149302,
    starter: false },
  seedItaloDiscoShaker: { label: 'Shaker · Italo Disco', category: 'Perc', homeLane: 'rim', dur: 0.5,
    note: 'A soft band with no attack to speak of. Sixteenths of this sit under anything '
      + 'without competing.',
    noise: { type: 'bandpass', freq: 6000, Q: 1.1, decay: 0.06 },
    starter: false },
  seedItaloDiscoTambourine: { label: 'Tambourine · Italo Disco', category: 'Perc', homeLane: 'rim', dur: 1,
    note: 'Bright, jangly and slightly longer, with a touch of pitch in it.',
    osc: { type: 'square', from: 900, to: 780, sweep: 0.05, decay: 0.05, gain: 0.12 },
    noise: { type: 'highpass', freq: 5200, Q: 0.6, decay: 0.14 },
    starter: false },
  seedItaloDiscoCowbell: { label: 'Cowbell · 808 Unclamped · Italo Disco', category: 'Perc', homeLane: 'tom', dur: 2,
    note: 'The actual TR-808 topology — 540 and 800 Hz squares through a 1.3 kHz bandpass at '
      + 'Q4 — with the 200 ms hardware gate taken off. Same front as the factory bell, three '
      + 'and a half times the ring, with a controlled resonant tail.',
    metal: { wave: 'square', freq: 540, ratios: [1, 1.481481], count: 2, spread: 1, filter: 'bandpass', hp: 1300, Q: 4, slope: -12, attack: 0, decay: 0.88, sag: 0.34, sagAt: 0.03, gain: 1, resonator: { feedback: 0.95, drive: 1.35, leak: 0.0004 } },
    drive: 0.08064,
    starter: false },
  seedItaloDiscoCongas: { label: 'Conga · Mid · Italo Disco', category: 'Perc', homeLane: 'tom', dur: 1,
    note: 'A centered open conga with a warm falling body and a little shell noise on the '
      + 'front, designed to answer the high and low voices cleanly.',
    osc: { type: 'sine', from: 285, to: 205, sweep: 0.045, decay: 0.32, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 1700, Q: 0.65, decay: 0.022, gain: 0.3 },
    drive: 0.098995,
    starter: false },
  seedItaloDiscoRide: { label: '909 Lo-Fi Ride · Italo Disco', category: 'Crash', homeLane: 'crash', dur: 4,
    note: 'A ride with a bell you can hear: a narrow 2.5 kHz resonance for the ping over a '
      + 'six-bit wash, lowpassed at 9.5 kHz. The 909’s ride was a sample and its grit is '
      + 'half of why the sound is recognisable, so the crush is doing the work here that the '
      + 'filter sweeps do on the 808 presets.',
    ring: { freq: 2500, Q: 70, hit: 0.0018, decay: 0.25, gain: 0.6 },
    metal: { wave: 'square', freq: 780, count: 6, spread: 1.12, filter: 'highpass', hp: 5400, Q: 0.8, slope: -24, attack: 0.004, decay: 1.6, sag: 0.3, sagAt: 0.06, gain: 0.55 },
    drive: 0.6, shape: 'crush',
    tone: { type: 'lowpass', freq: 9500, Q: 0.7 },
    humanize: { gain: 0.03 },
    starter: false },
  seedBigRoomKick: { label: '=909 Kick Punch · Big-Room House', category: 'Kick', homeLane: 'kick', dur: 1,
    note: 'A shorter, louder 909-style kick with a more obvious front edge and a tighter tail '
      + 'for four-on-the-floor patterns.',
    osc: { type: 'sine', from: 225, to: 52, sweep: 0.025, attack: 0.001, decay: 0.24, curve: 'exp', gain: 1 },
    noise: { type: 'bandpass', freq: 1450, Q: 1.1, decay: 0.018, gain: 0.52 },
    drive: 0.447312,
    starter: false },
  seedBigRoomSnare: { label: 'Synth Snare · Big-Room House', category: 'Snare', dur: 1,
    note: 'The two-source snare: a triangle knock falling a fourth under a wide band of noise '
      + 'that rings a little longer than the body does.',
    osc: { type: 'triangle', from: 210, to: 165, sweep: 0.04, decay: 0.11, curve: 'exp', gain: 0.7 },
    noise: { type: 'bandpass', freq: 2100, Q: 0.8, decay: 0.17, gain: 1 },
    drive: 0.176114,
    starter: false },
  seedBigRoomClap: { label: 'Big Room Clap · Big-Room House', category: 'Clap', dur: 1,
    note: 'Five bursts spread wider with a long tail on the last — a hall, not a booth. Wants '
      + 'space in the arrangement.',
    noise: { type: 'bandpass', freq: 1500, Q: 0.9, decay: 0.355, gain: 0.88 },
    taps: [0, 0.014, 0.028, 0.048], tapFalloff: 0.82, tapDetune: 0.94, tapTone: 0.97,
    starter: false,
    trim: 3 },
  seedBigRoomHats: { label: 'Synth Closed Hat · Big-Room House', category: 'Hats', dur: 0.5,
    note: 'A resonant highpassed tick — sharper than the plain closed hat, closer to metal '
      + 'without being metal.',
    noise: { type: 'highpass', freq: 7800, Q: 1.2, decay: 0.032, gain: 1 },
    starter: false },
  seedBigRoomOhats: { label: '=909 Open Hat · Big-Room House', category: 'Hats', homeLane: 'ohats', dur: 2,
    note: 'The open partner to =909 Hat: the same bright attack opening into a controlled '
      + 'metallic wash instead of a long cymbal tail.',
    noise: { type: 'highpass', freq: 7600, to: 5200, sweep: 0.35, Q: 1.2, decay: 0.38, gain: 1 },
    drive: 0.217597,
    starter: false },
  seedBigRoomCrash: { label: 'Blast · Boom · Big-Room House', category: 'Crash', homeLane: 'crash', dur: 8,
    note: 'The game’s explosion as a drum: a lowpass closing from 7 kHz to 420 over a second '
      + 'and a half, a bright highpassed crack on the front and two sub sweeps falling to '
      + 'nothing underneath.',
    osc: { type: 'sine', from: 125, to: 22, sweep: 1.4, decay: 1.4, curve: 'exp', gain: 1.1 },
    osc2: { type: 'triangle', from: 68, to: 26, sweep: 1.2, decay: 1.2, curve: 'exp', gain: 0.7 },
    noise: { type: 'lowpass', freq: 7200, to: 420, sweep: 1.45, Q: 0.7, attack: 0.012, decay: 2.221, sag: 0.47, sagAt: 0.17, gain: 1 },
    ring: { type: 'highpass', freq: 2400, Q: 0.7, hit: 0.05, decay: 0.382, gain: 0.7 },
    starter: false },
  seedBigRoomImpact: { label: 'Synare · Deep Pew · Big-Room House', category: 'Sweep', homeLane: 'tom', dur: 4,
    note: 'The long one: 3 kHz to 60 over a second and a half, with two seconds of envelope '
      + 'under it so the bottom of the fall is still audible when it arrives. Five and a '
      + 'half octaves — a whole bar of descent at a disco tempo.',
    osc: { type: 'sine', from: 3000, to: 60, sweep: 1.5, pitchCurve: 'exp', attack: 0.004, hold: 1.05, decay: 1.05, curve: 'lin', gain: 1 },
    drive: 0.12,
    starter: false },
  seedBigRoomFill: { label: '=909 Tom · Big-Room House', category: 'Tom', homeLane: 'tom', dur: 1,
    note: 'A tuned 909-style tom with a clean electronic pitch fall and a small low skin click '
      + 'at the front of the note.',
    osc: { type: 'sine', from: 260, to: 125, sweep: 0.08, decay: 0.34, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 1500, Q: 0.8, decay: 0.025, gain: 0.2 },
    drive: 0.120223,
    starter: false },
  seedBigRoomShaker: { label: 'Shaker · Big-Room House', category: 'Perc', homeLane: 'rim', dur: 0.5,
    note: 'A soft band with no attack to speak of. Sixteenths of this sit under anything '
      + 'without competing.',
    noise: { type: 'bandpass', freq: 6000, Q: 1.1, decay: 0.06 },
    starter: false },
  seedBigRoomTambourine: { label: 'Tambourine · Big-Room House', category: 'Perc', homeLane: 'rim', dur: 1,
    note: 'Bright, jangly and slightly longer, with a touch of pitch in it.',
    osc: { type: 'square', from: 900, to: 780, sweep: 0.05, decay: 0.05, gain: 0.12 },
    noise: { type: 'highpass', freq: 5200, Q: 0.6, decay: 0.14 },
    starter: false },
  seedBigRoomCowbell: { label: '=808 Cowbell · Big-Room House', category: 'Perc', homeLane: 'tom', dur: 1,
    note: 'The actual TR-808 cowbell topology: simultaneous 540 and 800 Hz squares through a '
      + '1.3 kHz bandpass, with a 200ms exponential VCA cut-off.',
    metal: { wave: 'square', freq: 540, ratios: [1, 1.481481], spread: 1, count: 2, filter: 'bandpass', hp: 1300, Q: 4, slope: -12, attack: 0, decay: 0.2, floor: 0.001, hardStop: true, resonator: { feedback: 0.96, drive: 1.4, leak: 0.0005 } },
    starter: false },
  seedBigRoomCongas: { label: 'Conga · Mid · Big-Room House', category: 'Perc', homeLane: 'tom', dur: 1,
    note: 'A centered open conga with a warm falling body and a little shell noise on the '
      + 'front, designed to answer the high and low voices cleanly.',
    osc: { type: 'sine', from: 285, to: 205, sweep: 0.045, decay: 0.32, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 1700, Q: 0.65, decay: 0.022, gain: 0.3 },
    drive: 0.098995,
    starter: false },
  seedBigRoomRide: { label: '909 Lo-Fi Ride · Big-Room House', category: 'Crash', homeLane: 'crash', dur: 4,
    note: 'A ride with a bell you can hear: a narrow 2.5 kHz resonance for the ping over a '
      + 'six-bit wash, lowpassed at 9.5 kHz. The 909’s ride was a sample and its grit is '
      + 'half of why the sound is recognisable, so the crush is doing the work here that the '
      + 'filter sweeps do on the 808 presets.',
    ring: { freq: 2500, Q: 70, hit: 0.0018, decay: 0.25, gain: 0.6 },
    metal: { wave: 'square', freq: 780, count: 6, spread: 1.12, filter: 'highpass', hp: 5400, Q: 0.8, slope: -24, attack: 0.004, decay: 1.6, sag: 0.3, sagAt: 0.06, gain: 0.55 },
    drive: 0.6, shape: 'crush',
    tone: { type: 'lowpass', freq: 9500, Q: 0.7 },
    humanize: { gain: 0.03 },
    starter: false },
  seedMegadriveKick: { label: '= Crushed Kick · 16-Bit', category: 'Kick', homeLane: 'kick', dur: 1,
    note: 'An ordinary 808 drop through the bit crusher, with the tone control pulling the top '
      + 'off what that adds. Hardware, rather than a distortion pedal.',
    osc: { type: 'sine', from: 190, to: 48, sweep: 0.04, decay: 0.237, curve: 'exp', gain: 1 },
    knock: 0.17,
    drive: 0.45, shape: 'crush',
    tone: { freq: 5200 },
    starter: false },
  seedMegadriveSnare: { label: 'Crack Snare · 16-Bit', category: 'Snare', dur: 1,
    note: 'Tight and driven: a short square knock, highpassed air, everything over in a tenth '
      + 'of a second. The backbeat for fast songs.',
    osc: { type: 'square', from: 255, to: 440, sweep: 0.025, decay: 0.05, curve: 'exp', gain: 0.55 },
    noise: { type: 'highpass', freq: 2900, Q: 0.8, decay: 0.3, gain: 1 },
    drive: 0.441115,
    starter: false },
  seedMegadriveClap: { label: 'FM Clap · 16-Bit', category: 'Clap', dur: 1,
    note: 'Three short FM cracks in quick succession. Drier than the metal clap and easier to '
      + 'fit under a vocal.',
    osc: { type: 'sine', from: 330, to: 250, sweep: 0.025, decay: 0.07, curve: 'exp', gain: 0.7, fm: { type: 'square', ratio: 5.1, index: 2.2, decay: 0.03 } },
    noise: { type: 'bandpass', freq: 1750, to: 1250, sweep: 0.06, Q: 1.4, decay: 0.06, gain: 0.6 },
    taps: [0, 0.01, 0.021], tapFalloff: 0.74,
    starter: false },
  seedMegadriveHats: { label: '= Grit Hat · 16-Bit', category: 'Hats', homeLane: 'hats', dur: 0.5,
    note: 'A resonant band with a square oscillator sitting in it, pushed hard into the '
      + 'shaper. Dirty and mid-forward — the hat for a mix where the bright ones vanish.',
    osc: { type: 'square', from: 3900, to: 1950, sweep: 0.006, decay: 0.028, curve: 'lin', gain: 0.16 },
    noise: { type: 'bandpass', freq: 5600, to: 3600, sweep: 0.05, Q: 4.5, decay: 0.038, gain: 1 },
    drive: 0.337903,
    starter: false },
  seedMegadriveOhats: { label: '909 Lo-Fi Open Hat · 16-Bit', category: 'Hats', homeLane: 'ohats', dur: 3,
    note: 'The 909’s open hat is a six-bit sample, so this is the cluster quantised to six '
      + 'bits — `crush` at 0.6, which is exactly where this engine’s curve lands — under an '
      + '11 kHz lowpass standing in for the real anti-aliasing filter. Dirtier and flatter '
      + 'than the 808, which is the difference.',
    metal: { wave: 'square', freq: 620, count: 6, spread: 1.06, filter: 'highpass', hp: 6400, Q: 0.85, slope: -24, decay: 0.55, sag: 0.42, sagAt: 0.045, gain: 0.95 },
    drive: 0.6, shape: 'crush',
    tone: { type: 'lowpass', freq: 11000, Q: 0.7 },
    humanize: { gain: 0.04 },
    starter: false },
  seedMegadriveCrash: { label: 'Blast · Noise Crash · 16-Bit', category: 'Crash', homeLane: 'crash', dur: 8,
    note: 'The white-noise crash of every big electronic drop: a steep lowpass opening wide '
      + 'and closing to 2 kHz over two seconds, a snap of air on the front, driven just '
      + 'enough to sound loud.',
    noise: { type: 'lowpass', freq: 14000, to: 2200, sweep: 2, Q: 1.2, slope: -24, attack: 0.002, hold: 0.03, decay: 2.3, sag: 0.55, sagAt: 0.08, gain: 1 },
    ring: { type: 'highpass', freq: 6000, Q: 0.7, hit: 0.02, decay: 0.05, gain: 0.6 },
    drive: 0.303639,
    tone: { type: 'highpass', freq: 300, Q: 0.7 },
    starter: false,
    trim: -1.359507 },
  seedMegadriveFill: { label: 'Simmons · Tom High · 16-Bit', category: 'Tom', homeLane: 'tom', dur: 2,
    note: 'Top hexagon of the kit: 420 bending to 150 with the bend pot around the middle, so '
      + 'it drops far enough to be electronic and not so far that it stops being a tom. '
      + 'Plays with the Mid and Low as a three-drum fill.',
    osc: { type: 'triangle', from: 420, to: 150, sweep: 0.11, pitchCurve: 'snap', attack: 0.0008, decay: 0.34, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 2600, Q: 0.7, decay: 0.012, sag: 0.2, sagAt: 0.004, gain: 0.25 },
    drive: 0.135291,
    starter: false },
  seedMegadriveShaker: { label: 'Shaker · 16-Bit', category: 'Perc', homeLane: 'rim', dur: 0.5,
    note: 'A soft band with no attack to speak of. Sixteenths of this sit under anything '
      + 'without competing.',
    noise: { type: 'bandpass', freq: 6000, Q: 1.1, decay: 0.06 },
    starter: false },
  seedMegadriveTambourine: { label: 'Tambourine · 16-Bit', category: 'Perc', homeLane: 'rim', dur: 1,
    note: 'Bright, jangly and slightly longer, with a touch of pitch in it.',
    osc: { type: 'square', from: 900, to: 780, sweep: 0.05, decay: 0.05, gain: 0.12 },
    noise: { type: 'highpass', freq: 5200, Q: 0.6, decay: 0.14 },
    starter: false },
  seedMegadriveCowbell: { label: '=808 Cowbell · 16-Bit', category: 'Perc', homeLane: 'tom', dur: 1,
    note: 'The actual TR-808 cowbell topology: simultaneous 540 and 800 Hz squares through a '
      + '1.3 kHz bandpass, with a 200ms exponential VCA cut-off.',
    metal: { wave: 'square', freq: 540, ratios: [1, 1.481481], spread: 1, count: 2, filter: 'bandpass', hp: 1300, Q: 4, slope: -12, attack: 0, decay: 0.2, floor: 0.001, hardStop: true, resonator: { feedback: 0.96, drive: 1.4, leak: 0.0005 } },
    starter: false },
  seedMegadriveCongas: { label: 'Conga · Mid · 16-Bit', category: 'Perc', homeLane: 'tom', dur: 1,
    note: 'A centered open conga with a warm falling body and a little shell noise on the '
      + 'front, designed to answer the high and low voices cleanly.',
    osc: { type: 'sine', from: 285, to: 205, sweep: 0.045, decay: 0.32, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 1700, Q: 0.65, decay: 0.022, gain: 0.3 },
    drive: 0.098995,
    starter: false },
  seedMegadriveRide: { label: '909 Lo-Fi Ride · 16-Bit', category: 'Crash', homeLane: 'crash', dur: 4,
    note: 'A ride with a bell you can hear: a narrow 2.5 kHz resonance for the ping over a '
      + 'six-bit wash, lowpassed at 9.5 kHz. The 909’s ride was a sample and its grit is '
      + 'half of why the sound is recognisable, so the crush is doing the work here that the '
      + 'filter sweeps do on the 808 presets.',
    ring: { freq: 2500, Q: 70, hit: 0.0018, decay: 0.25, gain: 0.6 },
    metal: { wave: 'square', freq: 780, count: 6, spread: 1.12, filter: 'highpass', hp: 5400, Q: 0.8, slope: -24, attack: 0.004, decay: 1.6, sag: 0.3, sagAt: 0.06, gain: 0.55 },
    drive: 0.6, shape: 'crush',
    tone: { type: 'lowpass', freq: 9500, Q: 0.7 },
    humanize: { gain: 0.03 },
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
  roundMono: 0.075854, fmGrowl: 0.023982, acidSquelch: 0.063319,
  rubberBass: 0.056468, clangBass: 0.020067, detuneBass: 0.175349,
  simpleSquare: 0.116547, simpleSawtooth: 0.069536, simpleTriangle: 0.076624,
  monoBright: 0.087427, amHollow: 0.01455, duoDetune: 0.122016,
  glassLead: 0.020582, reedLead: 0.11479, screamLead: 0.112838,
  vibratoLead: 0.180574, fmKeys: 0.021576, epiano: 0.023667, clav: 0.005035,
  toyPiano: 0.013277, softKeys: 0.060456, padTriangle: 0.101497,
  warmPad: 0.104157, glassPad: 0.021327, breathPad: 0.105582, amOrgan: 0.026762,
  fullOrgan: 0.062627, reedOrgan: 0.027077, fmBell: 0.018372, celeste: 0.024454,
  marimba: 0.013661, musicBox: 0.020825, synthPluck: 0.028132,
  harpPluck: 0.04711, koto: 0.013469, brassStab: 0.060636,
  synthStrings: 0.129634, hornSwell: 0.025887, buzzSaw: 0.078517,
  ringMod: 0.009345, hardFm: 0.014233, clave: 0.006432, woodBlock: 0.008281,
  tpBah: 0.005703, tpBassGuitar: 0.085107, tpBassy: 0.068551,
  tpBrassCircuit: 0.060099, tpCoolGuy: 0.246214, tpPianoetta: 0.111129,
  tpPizz: 0.017833, tpAlienChorus: 0.070974, tpDelicateWind: 0.050353,
  tpLectric: 0.031326, tpMarimba: 0.056978, tpSteelpan: 0.029149,
  tpSuperSaw: 0.024461, tpTreeTrunk: 0.028838, tpElectricCello: 0.020704,
  tpKalimba: 0.028046, tpThinSaws: 0.017535, tpHarmonics: 0.022885,
  tpTiny: 0.009049, roundMono2: 0.041468, toneSquare: 0.055714,
  toneSawtooth: 0.020703, toneTriangle: 0.022763, toneSine: 0.027794,
  squareTone2: 0.053305, fmGrowl2: 0.023796, addDrawbar: 0.196111,
  addDrawbarBright: 0.224043, addOrganStab: 0.066211, addDrawbarPerc: 0.224508,
  addShopOrgan: 0.087209, addSwoop: 0.113781, addBell: 0.194024,
  addGlassPad: 0.267136, shopOrgan2: 0.255511, squareOrgan: 0.100945,
  bass80sMono: 0.065826, bass80sFM: 0.021042, bass80sDuo: 0.171795,
  bass80sSynth: 0.072658, bass303Squelch: 0.16325, bass303Rubber: 0.130703,
  bass303DeepGlide: 0.155861, bass303Bite: 0.1863, bass303Pulse: 0.165328,
  initSquare: 0.205348, initSaw: 0.117952, initSquareSub: 0.15403,
  initSawSub: 0.081696, initOneFilter: 0.11862, layerBass80s: 0.079357,
  layerFilteredSaw: 0.057655, layerLeadBright: 0.077321, layerTwinkle: 0.142311,
  layerTitleBass: 0.150707, layerFinaleBass: 0.069035,
  layerFinaleBassGhost: 0.074815, layerWalkingBass: 0.076484,
  layerMegamixBass: 0.057181, layerShopBass: 0.044785,
  layerLoungeBass: 0.051375, layerBright80sBass: 0.040072,
  layerTitleLead: 0.129185, layerFinaleLead: 0.055298,
  layerMegamixLead: 0.052423, layerShopLead: 0.058029,
  layerCounterLead: 0.042496, layerTitleHarm: 0.109418, layerSineHarm: 0.065239,
  layerTitleChords: 0.120867, layerFinaleStab: 0.041501,
  layerFinaleSawStab: 0.021689, layerShopComp: 0.060745,
  layerDreamPad: 0.108575, cryptTheremin: 0.119153,
  bestSampleHoldCircuit: 0.09811, bestSampleHoldPulse: 0.042007,
  bestSampleHoldOrbit: 0.106458, bestSampleHoldBass: 0.127423,
  bestSampleHoldVox: 0.01366, layerBrassStack: 0.060029, bestChoirAah: 0.017323,
  bestChoirOoh: 0.036237, mrdrViolin: 0.063014, mrdrViolinSection: 0.070408,
  mrdrViolinMarcato: 0.044588, mrdrViola: 0.071901, mrdrCello: 0.081964,
  mrdrContrabass: 0.079861, bestVoiceBox70s: 0.130559, bestRobotVox: 0.085983,
  bestVowelPad: 0.014392, syncRazorLead: 0.14888, syncVowelLead: 0.026244,
  syncBassBite: 0.160716, syncWireClav: 0.040546, syncOrbitPad: 0.07208,
  bestMegaSawLead: 0.139153, bestHeroLead: 0.145455, bestScreamerLead: 0.149339,
  bestMonsterBass: 0.121494, bestReeseBass: 0.269626, bestPwmStrings: 0.128193,
  bestPwmBrass: 0.170536, bestPwmPadWide: 0.033958, bestPwmBass: 0.170994,
  bestPwmGrowlBass: 0.195181, bestPwmHollowLead: 0.191476,
  bestPwmReedLead: 0.032332, bestPwmClav: 0.081869, bestPwmChoir: 0.028718,
  bestClassicMono: 0.172733, bestPwmDrift: 0.015632,
  tngrOrangeCurrent: 0.019766, tngrGlassMotor: 0.021444,
  tngrNightSequence: 0.015127, tngrHollowVector: 0.013806,
  tngrDigitalGrowl: 0.025953, tngrBerlinSignal: 0.012747,
  tngrNeonReed: 0.002765, tngrRubyScanner: 0.016124, tngrHorizonSolo: 0.016212,
  tngrSatelliteWire: 0.017385, tngrBurntHorizon: 0.03431,
  tngrCloudMemory: 0.045693, tngrGlassChoir: 0.042365, tngrPolarDrift: 0.048416,
  tngrDreamCircuit: 0.077841, tngrBlueCathedral: 0.043073,
  tngrDigitalEp84: 0.021991, tngrHollowKeys: 0.016431, tngrPhaseClav: 0.006335,
  tngrMemoryOrgan: 0.037214, tngrCrystalTrigger: 0.022313,
  tngrWireHarp: 0.016249, tngrDataMarimba: 0.016646, tngrIceBell: 0.026608,
  tngrAlloyChime: 0.013637, tngrRoundBass: 0.017856, tngrPickedBass: 0.014299,
  tngrSoftPiano: 0.023481, tngrBrightPiano: 0.01828, tngrElectricKeys: 0.020746,
  tngrMusicBell: 0.026828, tngrChurchBell: 0.031022, tngrCelesta: 0.025931,
  tngrWarmStrings: 0.036406, tngrSoftStrings: 0.025356,
  tngrBrassSection: 0.028819, tngrSoftHorn: 0.025437, tngrPlainSaw: 0.016707,
  tngrPlainPulse: 0.016712, tngrClassicSquare: 0.025061,
  tngrScannerSweep: 0.062832, tngrTransmission: 0.00683, squareVSMono: 0.041441,
  jmjrChoirAah: 0.028242, jmjrChoirOoh: 0.0335, jmjrDoowop: 0.013524,
  jmjrRobotChant: 0.020347, jmjrSmallVoice: 0.016635, jmjrOohOpens: 0.025156,
  jmjrHumsClosed: 0.026501, jmjrScoopLead: 0.01412, jmjrOldChorister: 0.028045,
  jmjrFormantMachine: 0.015312, jmjrArcadeChorus: 0.015977,
  jmjrTitanDrone: 0.030962, coyoteHowl: 0.014521, jmjrBreathPluck: 0.011724,
  jmjrDooWopLine: 0.01551, jmjrAiueo: 0.017752, jmjrBahWahChant: 0.016321,
  jmjrHummer: 0.032494, jmjrHumItClosed: 0.026677, jmjrKazooLead: 0.040337,
  jmjrAnnouncer: 0.032643, jmjrEggshellSays: 0.031526,
  jmjrCabinetVoice: 0.033054, jmjrWordPerKey: 0.011376,
  wndrConcertGrand: 0.140256, wndrOldUpright: 0.091985, wndrFeltPiano: 0.130697,
  mrdrGrand: 0.072138, mrdrPopGrand: 0.068382, mrdrElectricGrand: 0.044228,
  tngrConcertGrand: 0.024786, tngrFeltUpright: 0.031738, rmndDxPiano: 0.02674,
  rmndTineEP: 0.030054, rmndDxSlap: 0.021522, rmndDxPop: 0.015165,
  rmndDigitalSlap: 0.020584, mrdrSlapThumb: 0.090446, mrdrSlapPop: 0.091582,
  mrdrSynthSlap: 0.185584, tngrSlap: 0.015273, mrdrMegaPop: 0.078782,
  mrdrFretClack: 0.067225, mrdrWirePop: 0.092948, mrdrZapPop: 0.142239,
  rmndMaxPop: 0.018748, rmndClangPop: 0.020103, rmndSquarePop: 0.018726,
  tngrMegaPop: 0.014293, mrdrConcertFlute: 0.085522, mrdrShakuhachi: 0.078468,
  mrdrPanFlute: 0.099117, mrdrRecorder: 0.091352, mrdrBansuri: 0.110596,
  mrdrOcarina: 0.108675, mrdrClarinet: 0.157884, mrdrOboe: 0.053327,
  tngrAirFlute: 0.016317, mrdrFestivalStab: 0.07356,
  mrdrAcousticGuitar: 0.025617, mrdrVocalOh: 0.021763,
  mrdrMutedTrumpet: 0.015239, mrdrVibraphone: 0.0722, mrdrDist808: 0.189703,
  mrdrHarpsichord: 0.03089, mrdrPedalOrgan: 0.141473, mrdrTollingBell: 0.088716,
  mrdrTuba: 0.127182, mrdrFrenchHorn: 0.092202, mrdrDx7Keys: 0.083424,
  mrdrSaxophone: 0.049169, mrdrWahGuitar: 0.016073, mrdrHornStab: 0.02808,
  mrdrHouseOrganStab: 0.023594, mrdrDeepOrganStab: 0.020957,
  mrdrFunkGuitar: 0.016296, mrdrFunkGuitarMuted: 0.002152,
  mrdrAcid303: 0.157459, mrdrAcid303Accent: 0.109854,
  mrdrAcid303Square: 0.123634, mrdrAcid303Deep: 0.084594, mrdrHoover: 0.148376,
  mrdrRaveStab: 0.036236, mrdrOrganBass: 0.065672, mrdrOrchHit: 0.0312,
  mrdrGarageWobble: 0.245252, darkMetalChime: 0.021727,
  kit_glasshouse_kick: 0.043642, kit_glasshouse_snare: 0.08402,
  kit_glasshouse_clap: 0.014994, kit_glasshouse_hats: 0.015579,
  kit_glasshouse_ohats: 0.037321, kit_glasshouse_tom: 0.031284,
  kit_glasshouse_rim: 0.072106, kit_glasshouse_crash: 0.423024,
  kit_havana_patio_kick: 0.03224, kit_havana_patio_snare: 0.079353,
  kit_havana_patio_clap: 0.012348, kit_havana_patio_hats: 0.015619,
  kit_havana_patio_ohats: 0.033854, kit_havana_patio_tom: 0.036236,
  kit_havana_patio_rim: 0.013291, kit_havana_patio_crash: 0.423024,
  kit_moon_dust_kick: 0.040128, kit_moon_dust_snare: 0.091459,
  kit_moon_dust_clap: 0.015277, kit_moon_dust_hats: 0.017265,
  kit_moon_dust_ohats: 0.044202, kit_moon_dust_tom: 0.037782,
  kit_moon_dust_rim: 0.006136, kit_moon_dust_crash: 0.071772,
  kit_neon_origami_kick: 0.052556, kit_neon_origami_snare: 0.092512,
  kit_neon_origami_clap: 0.017348, kit_neon_origami_hats: 0.014342,
  kit_neon_origami_ohats: 0.035773, kit_neon_origami_tom: 0.03002,
  kit_neon_origami_rim: 0.072106, kit_neon_origami_crash: 0.423024,
  kit_pocket_pixel_kick: 0.017761, kit_pocket_pixel_snare: 0.011338,
  kit_pocket_pixel_clap: 0.009071, kit_pocket_pixel_hats: 0.008943,
  kit_pocket_pixel_ohats: 0.018963, kit_pocket_pixel_tom: 0.018037,
  kit_pocket_pixel_rim: 0.009749, kit_pocket_pixel_crash: 0.022816,
  kit_rio_lanterns_kick: 0.036909, kit_rio_lanterns_snare: 0.082659,
  kit_rio_lanterns_clap: 0.013444, kit_rio_lanterns_hats: 0.014678,
  kit_rio_lanterns_ohats: 0.035949, kit_rio_lanterns_tom: 0.033447,
  kit_rio_lanterns_rim: 0.012309, kit_rio_lanterns_crash: 0.423024,
  kit_rubber_factory_kick: 0.040169, kit_rubber_factory_snare: 0.081485,
  kit_rubber_factory_clap: 0.01079, kit_rubber_factory_hats: 0.011496,
  kit_rubber_factory_ohats: 0.030921, kit_rubber_factory_tom: 0.027895,
  kit_rubber_factory_rim: 0.008958, kit_rubber_factory_crash: 0.423024,
  kit_velvet_basement_kick: 0.031609, kit_velvet_basement_snare: 0.086904,
  kit_velvet_basement_clap: 0.013423, kit_velvet_basement_hats: 0.017414,
  kit_velvet_basement_ohats: 0.04271, kit_velvet_basement_tom: 0.033928,
  kit_velvet_basement_rim: 0.006136, kit_velvet_basement_crash: 0.067463,
  dsKick: 0.045139, dsKickHard: 0.004126, dsSnare: 0.020086,
  dsSnareCrack: 0.070447, dsClap: 0.011273, dsHatClosed: 0.015363,
  dsHatOpen: 0.054488, hatSnapOpen: 0.082186, hatGrit: 0.018923,
  hatGritOpen: 0.041795, dsShaker: 0.017053, dsTom: 0.037785, dsRim: 0.008218,
  vl1Pi: 0.01267, vl1Po: 0.014507, vl1Sha: 0.034957, dsZap: 0.053223,
  rimRing: 0.003277, rimWood: 0.004839, gateClang: 0.123935, rimClang: 0.028662,
  hatClusterOpen: 0.055057, snarePink: 0.018889, clapHands: 0.011519,
  kickCrush: 0.032487, snareTwoBody: 0.019909, tomSimmons: 0.076379,
  kickClickTop: 0.055624, kickEngine: 0.03437, kickShop: 0.030652,
  kickMegamix: 0.029193, snareEngine: 0.015394, clapEngine: 0.052286,
  hatEngine: 0.02664, ohatEngine: 0.056556, tomEngine: 0.036372,
  rimEngine: 0.032346, crashEngine: 0.074854, crashFinale: 0.061111,
  dsCrackSnare2: 0.140027, dsClosedHat2: 0.090277, engineCrash: 0.342379,
  ds909Kick: 0.060598, ds909KickPunch: 0.062942, ds909Snare: 0.048255,
  ds909SnareCrack: 0.080807, ds909Clap: 0.011164, ds909OpenHat: 0.065735,
  ds909Tom: 0.039082, ds909Rim: 0.010639, ds909Crash: 0.355788,
  dsCr78Kick: 0.026188, dsCr78Snare: 0.011842, dsCr78Hat: 0.016717,
  dsCr78Clap: 0.006511, dsCr78Cowbell: 0.016471, dsCr78Tom: 0.034507,
  ds808Kick: 0.046068, ds808Snare: 0.019179, ds808Clap: 0.014409,
  ds808OpenHat: 0.063614, ds808Cowbell: 0.02003, tr808CowbellClassic: 0.02003,
  tr808CowbellLow: 0.021792, tr808CowbellHard: 0.015553, ds808Tom: 0.044775,
  ohatSustainMetal: 0.084826, ohatSustainAir: 0.079497,
  ohatSustainWash: 0.037087, rimshot808: 0.014516, rimshotWood: 0.006136,
  rimshotLaser: 0.009287, congaHigh: 0.020232, congaMid: 0.03776,
  congaLow: 0.04496, congaSlap: 0.021202, guiraScrape: 0.013,
  guiraChk: 0.006545, tambora: 0.032592, djembeBass: 0.034002,
  djembeTone: 0.01967, djembeSlap: 0.032182, talkingDrum: 0.039212,
  bongoHigh: 0.016054, bongoLow: 0.019356, shekere: 0.01579,
  cbSosTriangle: 0.007348, cbSosLongTail: 0.005459, cb808Unclamped: 0.022344,
  cbStruckRing: 0.005591, cbAgogoWide: 0.037085, clvSosBridgedT: 0.018441,
  clv808Hard: 0.023105, clvRosewood: 0.018292, clvBrightSnap: 0.032699,
  clvDoubleStrike: 0.019787, rim808BridgedT: 0.008958, rim909TwoMode: 0.072106,
  rimShotHard: 0.02333, ohat808Bands: 0.076418, ohat808Long: 0.100425,
  ohat909SixBit: 0.066667, ohat909Long: 0.090561, rideSosTwoPath: 0.25158,
  rideSosFullTail: 0.315974, cy808Cymbal: 0.045108, crash808Long: 0.082461,
  ride909SixBit: 0.053247, kwBlipPing: 0.021329, kwBlipSnap: 0.008521,
  kwBlipWood: 0.003217, kwBlipGlass: 0.024009, kwBlipTick: 0.008918,
  kwBlipDrop: 0.028731, kwBlipDouble: 0.026337, syn3Deooom: 0.055637,
  syn3RingBell: 0.029767, syn3Whoosh: 0.0111, syn3Zap: 0.126593,
  sdDiscoTom: 0.037073, sdHighPew: 0.025965, sdCrack: 0.025838,
  sdRise: 0.027763, sdsKick: 0.034603, sdsSnare: 0.012582, sdsTomHigh: 0.032684,
  sdsTomMid: 0.037464, sdsTomLow: 0.04377, sdsCymbal: 0.125054,
  syn3PewLong: 0.245233, syn3PewSnap: 0.241465, syn3PewPew: 0.232846,
  syn3PewDeep: 0.363747, syn3PewFormant: 0.887248, snareFlam: 0.037641,
  clapMetal: 0.041919, clapFm: 0.018663, buzzRoll: 0.036629,
  snareCrisp: 0.012245, snareFat: 0.017395, snareTight: 0.00826,
  clap808: 0.010224, clapTight: 0.006711, clapRoom: 0.025298, hatOpen: 0.048122,
  hatFoilOpen: 0.042121, shaker: 0.01086, tambourine: 0.032351,
  noiseSweep: 0.041543, taikoHit: 0.094618, timpaniHit: 0.07788,
  metalHit: 0.230828, blastBoom: 0.114017, blastThunder: 0.14543,
  blastImpact: 0.059135, blastNoiseCrash: 0.17273, blastBolt: 0.121459,
  blastGated: 0.231998, amHollow2: 0.01455, sawtoothTone2: 0.020703,
  sintone: 0.04505, roundBass: 0.075854, squareMono: 0.043368,
  celeste2: 0.037305, thickSquareGlide: 0.10323, memoryOrgan2: 0.033727,
  testSIMPLESQR: 0.106869, simpleStrings: 0.032185, wubClassic: 0.302142,
  wubSlow: 0.405466, wubTriplet: 0.232679, wubStutter: 0.273171,
  wubHalf: 0.200706, wubReese: 0.304719, wubFmGrowl: 0.170489,
  wubSyncScreech: 0.20722, wubRobot: 0.323143, wubYoi: 0.021647,
  wubGlassYoi: 0.030233, wubDarkAir: 0.030875, siren: 0.132799,
  newSyncRazorLead: 0.140223, seedFutureBassBass: 0.018252,
  seedFutureBassSub: 0.029959, seedFutureBassSaws: 0.024461,
  seedFutureBassPiano: 0.068382, seedFutureBassPad: 0.042293,
  seedFutureBassSquare: 0.017752, seedFutureBassBell: 0.020825,
  seedFutureBassMegaSaw: 0.139188, seedFutureBassArp: 0.016702,
  seedFutureBassChoir: 0.017322, seedFutureBassThird: 0.068382,
  seedFutureBassCounter: 0.034765, seedReggaetonBass: 0.189703,
  seedReggaetonSub: 0.11677, seedReggaetonPiano: 0.025617,
  seedReggaetonPad: 0.097906, seedReggaetonSquare: 0.013661,
  seedReggaetonBell: 0.028046, seedReggaetonMegaSaw: 0.01592,
  seedReggaetonArp: 0.01668, seedReggaetonChoir: 0.033734,
  seedReggaetonThird: 0.016687, seedReggaetonCounter: 0.028397,
  seedChipstepBass: 0.025065, seedChipstepSub: 0.302142,
  seedChipstepSaws: 0.033958, seedChipstepPad: 0.128193,
  seedChipstepSquare: 0.016707, seedChipstepBell: 0.055714,
  seedChipstepMegaSaw: 0.199872, seedChipstepArp: 0.055714,
  seedChipstepChoir: 0.028713, seedChipstepThird: 0.015915,
  seedChipstepCounter: 0.025058, seedTranceBass: 0.015014,
  seedTranceSub: 0.11677, seedTranceSaws: 0.024461, seedTrancePiano: 0.068382,
  seedTrancePad: 0.041727, seedTranceSquare: 0.024461, seedTranceBell: 0.026008,
  seedTranceMegaSaw: 0.139188, seedTranceArp: 0.015949,
  seedTranceChoir: 0.017322, seedTranceThird: 0.068382,
  seedTranceCounter: 0.015832, seedItaloDiscoBass: 0.021042,
  seedItaloDiscoSub: 0.11677, seedItaloDiscoPad: 0.048227,
  seedItaloDiscoSquare: 0.018023, seedItaloDiscoBell: 0.026303,
  seedItaloDiscoMegaSaw: 0.015287, seedItaloDiscoArp: 0.015944,
  seedItaloDiscoChoir: 0.017322, seedItaloDiscoThird: 0.022242,
  seedItaloDiscoCounter: 0.016044, seedBigRoomBass: 0.175349,
  seedBigRoomSub: 0.11677, seedBigRoomSaws: 0.024461, seedBigRoomPad: 0.048349,
  seedBigRoomSquare: 0.041468, seedBigRoomBell: 0.026207,
  seedBigRoomMegaSaw: 0.139188, seedBigRoomArp: 0.01581,
  seedBigRoomChoir: 0.017322, seedBigRoomThird: 0.026577,
  seedBigRoomCounter: 0.016006, seedMegadriveBass: 0.021522,
  seedMegadriveSub: 0.11677, seedMegadrivePiano: 0.021576,
  seedMegadrivePad: 0.129634, seedMegadriveSquare: 0.052423,
  seedMegadriveBell: 0.018029, seedMegadriveMegaSaw: 0.013983,
  seedMegadriveArp: 0.018029, seedMegadriveChoir: 0.028713,
  seedMegadriveThird: 0.02674, seedMegadriveCounter: 0.021576, vl1Pi2: 0.03509,
  fatKick: 0.035113, bigClap: 0.02692, snareTap: 0.045932, blipZap: 0.134325,
  simple808StyleHat: 0.03422, gbSnare: 0.126075, bigRoomClap: 0.017878,
  gameBoySnare: 0.07717, dataRibbon: 0.073419, sweepUp: 0.367341,
  seedFutureBassKick: 0.055624, seedFutureBassSnare: 0.020086,
  seedFutureBassClap: 0.025298, seedFutureBassHats: 0.015363,
  seedFutureBassOhats: 0.082186, seedFutureBassCrash: 0.355788,
  seedFutureBassImpact: 0.363747, seedFutureBassFill: 0.039082,
  seedFutureBassShaker: 0.01086, seedFutureBassTambourine: 0.032351,
  seedFutureBassCowbell: 0.02003, seedFutureBassCongas: 0.03776,
  seedFutureBassRide: 0.053247, seedReggaetonKick: 0.046068,
  seedReggaetonSnare: 0.00826, seedReggaetonClap: 0.00826,
  seedReggaetonHats: 0.015363, seedReggaetonOhats: 0.063614,
  seedReggaetonCrash: 0.067594, seedReggaetonImpact: 0.363747,
  seedReggaetonFill: 0.036236, seedReggaetonShaker: 0.017053,
  seedReggaetonTambourine: 0.032351, seedReggaetonCowbell: 0.013291,
  seedReggaetonCongas: 0.020232, seedReggaetonRide: 0.053247,
  seedChipstepKick: 0.062942, seedChipstepSnare: 0.13994,
  seedChipstepClap: 0.080807, seedChipstepHats: 0.02664,
  seedChipstepOhats: 0.066667, seedChipstepCrash: 0.481959,
  seedChipstepImpact: 0.028731, seedChipstepFill: 0.021329,
  seedChipstepShaker: 0.01086, seedChipstepTambourine: 0.032351,
  seedChipstepCowbell: 0.02003, seedChipstepCongas: 0.03776,
  seedChipstepRide: 0.053247, seedTranceKick: 0.069804,
  seedTranceSnare: 0.021594, seedTranceClap: 0.017878, seedTranceHats: 0.015363,
  seedTranceOhats: 0.065735, seedTranceCrash: 0.015394,
  seedTranceImpact: 0.363747, seedTranceFill: 0.039082,
  seedTranceShaker: 0.01086, seedTranceTambourine: 0.032351,
  seedTranceCowbell: 0.02003, seedTranceCongas: 0.03776,
  seedTranceRide: 0.053247, seedItaloDiscoKick: 0.060598,
  seedItaloDiscoSnare: 0.019179, seedItaloDiscoClap: 0.018338,
  seedItaloDiscoHats: 0.016717, seedItaloDiscoOhats: 0.063614,
  seedItaloDiscoCrash: 0.355788, seedItaloDiscoFill: 0.037073,
  seedItaloDiscoShaker: 0.01086, seedItaloDiscoTambourine: 0.032351,
  seedItaloDiscoCowbell: 0.022344, seedItaloDiscoCongas: 0.03776,
  seedItaloDiscoRide: 0.053247, seedBigRoomKick: 0.062942,
  seedBigRoomSnare: 0.020086, seedBigRoomClap: 0.017878,
  seedBigRoomHats: 0.015363, seedBigRoomOhats: 0.065735,
  seedBigRoomCrash: 0.116224, seedBigRoomImpact: 0.363747,
  seedBigRoomFill: 0.039082, seedBigRoomShaker: 0.01086,
  seedBigRoomTambourine: 0.032351, seedBigRoomCowbell: 0.02003,
  seedBigRoomCongas: 0.03776, seedBigRoomRide: 0.053247,
  seedMegadriveKick: 0.029483, seedMegadriveSnare: 0.140027,
  seedMegadriveClap: 0.018663, seedMegadriveHats: 0.018923,
  seedMegadriveOhats: 0.066667, seedMegadriveCrash: 0.216024,
  seedMegadriveFill: 0.032684, seedMegadriveShaker: 0.01086,
  seedMegadriveTambourine: 0.032351, seedMegadriveCowbell: 0.02003,
  seedMegadriveCongas: 0.03776, seedMegadriveRide: 0.053247,
  stSnareCrisp: 0.012245, stRoundMono: 0.075854, stFmKeys: 0.021576,
  stMonoBright: 0.087427, stSnareBrush: 0.031167, stSubSine: 0.11677,
  stReedOrgan: 0.027077, stVibratoLead: 0.180574, stSnareRim: 0.008998,
  stClave: 0.006432, stTpBassGuitar: 0.085107, stClav: 0.005035,
  stSynthPluck: 0.028132, stSnareFat: 0.017395, stHatPedal: 0.007458,
  stDsRim: 0.008218, stRubberBass: 0.056468, stEpiano: 0.023667,
  stCeleste: 0.024454, stHatClosed: 0.014487, stHatOpen: 0.048122,
  stDetuneBass: 0.175349, stWarmPad: 0.104157, stDuoDetune: 0.122016,
  stWoodBlock: 0.008281, stGlassPad: 0.021327, stMusicBox: 0.020825,
  stSnareFlam: 0.037641, stSynthStrings: 0.129634, stReedLead: 0.11479,
  stFmGrowl: 0.023982, stAmOrgan: 0.026762, stGlassLead: 0.020582,
  stClapRoom: 0.025298, stTpBassy: 0.068551, stTpPianoetta: 0.111129,
  stTpBah: 0.005703, stClapTight: 0.006711, stAcidSquelch: 0.063319,
  stBreathPad: 0.105582, stTpLectric: 0.031326, stClap808: 0.010224,
  stDsHatClosed: 0.015363, stPadTriangle: 0.101497, stFmBell: 0.018029,
  stAmHollow: 0.01455, stKickPunch: 0.062942, stKickDeep: 0.045139,
  stKickTight: 0.060598, stKickThud: 0.026188, stKickDirty: 0.032487,
  stKickClick: 0.046068, stTaiko: 0.039082, stZap: 0.053223,
  stHatTick: 0.016717, stHatSizzle: 0.056353, stMetalHatClosed: 0.01638,
  stCowbell: 0.017104, stTriangleDing: 0.017104
};

// Measured peaks, the same renders. No longer what a preset is levelled by: what it is
// read for now is headroom — a preset whose peak is far above its lane's target spends
// the mix's ceiling on one transient — and being the fallback above.
const PEAKS = {
  roundMono: 1.1834, fmGrowl: 0.216, acidSquelch: 1.6451, rubberBass: 0.9055,
  clangBass: 0.2115, detuneBass: 1.5783, simpleSquare: 0.7833,
  simpleSawtooth: 0.7734, simpleTriangle: 0.695, monoBright: 0.8786,
  amHollow: 0.1073, duoDetune: 1.4581, glassLead: 0.2129, reedLead: 0.8358,
  screamLead: 2.1185, vibratoLead: 1.3754, fmKeys: 0.2185, epiano: 0.2199,
  clav: 0.2597, toyPiano: 0.2149, softKeys: 0.6896, padTriangle: 0.6968,
  warmPad: 0.7269, glassPad: 0.1228, breathPad: 0.9905, amOrgan: 0.111,
  fullOrgan: 0.2204, reedOrgan: 0.409, fmBell: 0.2194, celeste: 0.2195,
  marimba: 0.2153, musicBox: 0.219, synthPluck: 1.2037, harpPluck: 0.6946,
  koto: 0.2181, brassStab: 0.7698, synthStrings: 1.0845, hornSwell: 0.2168,
  buzzSaw: 1.1884, ringMod: 0.1355, hardFm: 0.2045, clave: 0.2031,
  woodBlock: 0.2198, tpBah: 0.1386, tpBassGuitar: 0.7653, tpBassy: 0.9895,
  tpBrassCircuit: 1.0649, tpCoolGuy: 2.9141, tpPianoetta: 0.8862,
  tpPizz: 1.0758, tpAlienChorus: 0.8054, tpDelicateWind: 0.2183,
  tpLectric: 0.6403, tpMarimba: 0.6906, tpSteelpan: 0.2812, tpSuperSaw: 0.2661,
  tpTreeTrunk: 0.6572, tpElectricCello: 0.2173, tpKalimba: 0.2195,
  tpThinSaws: 0.2098, tpHarmonics: 0.1082, tpTiny: 0.1531, roundMono2: 0.6824,
  toneSquare: 0.6468, toneSawtooth: 0.5903, toneTriangle: 0.6582,
  toneSine: 0.661, squareTone2: 0.6435, fmGrowl2: 0.2158, addDrawbar: 1.0811,
  addDrawbarBright: 1.3399, addOrganStab: 1.4628, addDrawbarPerc: 1.3498,
  addShopOrgan: 1.5687, addSwoop: 0.9544, addBell: 1.6229, addGlassPad: 1.5005,
  shopOrgan2: 2.0171, squareOrgan: 0.9534, bass80sMono: 1.1369,
  bass80sFM: 0.2208, bass80sDuo: 1.5956, bass80sSynth: 0.6689,
  bass303Squelch: 2.4717, bass303Rubber: 2.0209, bass303DeepGlide: 1.7556,
  bass303Bite: 2.7534, bass303Pulse: 2.1106, initSquare: 1.1476,
  initSaw: 1.1286, initSquareSub: 1.1691, initSawSub: 0.9197,
  initOneFilter: 1.6307, layerBass80s: 0.7366, layerFilteredSaw: 0.9168,
  layerLeadBright: 0.7017, layerTwinkle: 0.7773, layerTitleBass: 0.6964,
  layerFinaleBass: 0.6698, layerFinaleBassGhost: 0.6833,
  layerWalkingBass: 0.6953, layerMegamixBass: 0.875, layerShopBass: 0.8671,
  layerLoungeBass: 0.6913, layerBright80sBass: 0.6375, layerTitleLead: 0.6984,
  layerFinaleLead: 0.6625, layerMegamixLead: 0.6812, layerShopLead: 0.6827,
  layerCounterLead: 0.6914, layerTitleHarm: 0.6932, layerSineHarm: 0.6935,
  layerTitleChords: 0.6961, layerFinaleStab: 0.6454, layerFinaleSawStab: 0.6132,
  layerShopComp: 0.6967, layerDreamPad: 0.7755, cryptTheremin: 0.6295,
  bestSampleHoldCircuit: 0.9382, bestSampleHoldPulse: 0.6357,
  bestSampleHoldOrbit: 0.696, bestSampleHoldBass: 0.7538,
  bestSampleHoldVox: 0.2648, layerBrassStack: 0.7858, bestChoirAah: 0.1342,
  bestChoirOoh: 0.2132, mrdrViolin: 0.7351, mrdrViolinSection: 0.5735,
  mrdrViolinMarcato: 0.8159, mrdrViola: 0.5847, mrdrCello: 0.5258,
  mrdrContrabass: 0.4768, bestVoiceBox70s: 0.8619, bestRobotVox: 0.7646,
  bestVowelPad: 0.1488, syncRazorLead: 0.9602, syncVowelLead: 0.2281,
  syncBassBite: 0.8647, syncWireClav: 0.7612, syncOrbitPad: 0.539,
  bestMegaSawLead: 0.7715, bestHeroLead: 1.3401, bestScreamerLead: 1.5301,
  bestMonsterBass: 0.709, bestReeseBass: 4.2546, bestPwmStrings: 0.6688,
  bestPwmBrass: 1.7208, bestPwmPadWide: 0.4322, bestPwmBass: 0.8094,
  bestPwmGrowlBass: 0.9419, bestPwmHollowLead: 0.8223, bestPwmReedLead: 0.432,
  bestPwmClav: 0.9815, bestPwmChoir: 0.2083, bestClassicMono: 0.8592,
  bestPwmDrift: 0.1643, tngrOrangeCurrent: 0.3565, tngrGlassMotor: 0.3207,
  tngrNightSequence: 0.2632, tngrHollowVector: 0.3855, tngrDigitalGrowl: 0.2693,
  tngrBerlinSignal: 0.2563, tngrNeonReed: 0.0504, tngrRubyScanner: 0.2467,
  tngrHorizonSolo: 0.2226, tngrSatelliteWire: 0.305, tngrBurntHorizon: 0.2413,
  tngrCloudMemory: 0.379, tngrGlassChoir: 0.3116, tngrPolarDrift: 0.3623,
  tngrDreamCircuit: 0.4154, tngrBlueCathedral: 0.1824, tngrDigitalEp84: 0.2798,
  tngrHollowKeys: 0.3097, tngrPhaseClav: 0.1139, tngrMemoryOrgan: 0.2888,
  tngrCrystalTrigger: 0.2709, tngrWireHarp: 0.2793, tngrDataMarimba: 0.1946,
  tngrIceBell: 0.4184, tngrAlloyChime: 0.2089, tngrRoundBass: 0.1146,
  tngrPickedBass: 0.2616, tngrSoftPiano: 0.189, tngrBrightPiano: 0.2326,
  tngrElectricKeys: 0.1201, tngrMusicBell: 0.2706, tngrChurchBell: 0.2641,
  tngrCelesta: 0.2077, tngrWarmStrings: 0.246, tngrSoftStrings: 0.2575,
  tngrBrassSection: 0.381, tngrSoftHorn: 0.2392, tngrPlainSaw: 0.3444,
  tngrPlainPulse: 0.2029, tngrClassicSquare: 0.3126, tngrScannerSweep: 0.3223,
  tngrTransmission: 0.0802, squareVSMono: 0.6167, jmjrChoirAah: 0.1677,
  jmjrChoirOoh: 0.1928, jmjrDoowop: 0.161, jmjrRobotChant: 0.3009,
  jmjrSmallVoice: 0.1701, jmjrOohOpens: 0.1501, jmjrHumsClosed: 0.1149,
  jmjrScoopLead: 0.1668, jmjrOldChorister: 0.107, jmjrFormantMachine: 0.2881,
  jmjrArcadeChorus: 0.1796, jmjrTitanDrone: 0.1236, coyoteHowl: 0.1726,
  jmjrBreathPluck: 0.1645, jmjrDooWopLine: 0.1741, jmjrAiueo: 0.1523,
  jmjrBahWahChant: 0.1541, jmjrHummer: 0.1914, jmjrHumItClosed: 0.1149,
  jmjrKazooLead: 0.7354, jmjrAnnouncer: 0.1842, jmjrEggshellSays: 0.199,
  jmjrCabinetVoice: 0.2785, jmjrWordPerKey: 0.143, wndrConcertGrand: 1.5518,
  wndrOldUpright: 1.2591, wndrFeltPiano: 0.7895, mrdrGrand: 0.5941,
  mrdrPopGrand: 0.6944, mrdrElectricGrand: 0.6441, tngrConcertGrand: 0.1688,
  tngrFeltUpright: 0.1462, rmndDxPiano: 0.2183, rmndTineEP: 0.2206,
  rmndDxSlap: 0.2207, rmndDxPop: 0.2206, rmndDigitalSlap: 0.2207,
  mrdrSlapThumb: 0.8274, mrdrSlapPop: 1.0265, mrdrSynthSlap: 1.6434,
  tngrSlap: 0.3063, mrdrMegaPop: 1.075, mrdrFretClack: 0.5956,
  mrdrWirePop: 0.8761, mrdrZapPop: 1.9849, rmndMaxPop: 0.2193,
  rmndClangPop: 0.2206, rmndSquarePop: 0.2188, tngrMegaPop: 0.3518,
  mrdrConcertFlute: 0.6326, mrdrShakuhachi: 0.5022, mrdrPanFlute: 0.5759,
  mrdrRecorder: 0.6735, mrdrBansuri: 0.7215, mrdrOcarina: 0.6791,
  mrdrClarinet: 0.8929, mrdrOboe: 0.7081, tngrAirFlute: 0.1282,
  mrdrFestivalStab: 0.8464, mrdrAcousticGuitar: 0.6349, mrdrVocalOh: 0.2586,
  mrdrMutedTrumpet: 0.2318, mrdrVibraphone: 0.7415, mrdrDist808: 0.7,
  mrdrHarpsichord: 0.7058, mrdrPedalOrgan: 0.8829, mrdrTollingBell: 0.9292,
  mrdrTuba: 1.1117, mrdrFrenchHorn: 0.6553, mrdrDx7Keys: 0.6725,
  mrdrSaxophone: 0.5971, mrdrWahGuitar: 0.3212, mrdrHornStab: 0.6742,
  mrdrHouseOrganStab: 0.7484, mrdrDeepOrganStab: 0.7663, mrdrFunkGuitar: 0.7478,
  mrdrFunkGuitarMuted: 0.1848, mrdrAcid303: 1.5037, mrdrAcid303Accent: 0.8351,
  mrdrAcid303Square: 1.5804, mrdrAcid303Deep: 1.3166, mrdrHoover: 1.7504,
  mrdrRaveStab: 1.226, mrdrOrganBass: 0.8376, mrdrOrchHit: 0.7007,
  mrdrGarageWobble: 2.1829, darkMetalChime: 0.3016, kit_glasshouse_kick: 0.688,
  kit_glasshouse_snare: 1.2514, kit_glasshouse_clap: 0.3933,
  kit_glasshouse_hats: 0.6303, kit_glasshouse_ohats: 0.8342,
  kit_glasshouse_tom: 0.7259, kit_glasshouse_rim: 1.2849,
  kit_glasshouse_crash: 1.8641, kit_havana_patio_kick: 0.6497,
  kit_havana_patio_snare: 1.2215, kit_havana_patio_clap: 0.3418,
  kit_havana_patio_hats: 0.4822, kit_havana_patio_ohats: 0.8675,
  kit_havana_patio_tom: 0.8375, kit_havana_patio_rim: 0.4083,
  kit_havana_patio_crash: 1.8641, kit_moon_dust_kick: 0.6581,
  kit_moon_dust_snare: 1.2972, kit_moon_dust_clap: 0.3432,
  kit_moon_dust_hats: 0.4867, kit_moon_dust_ohats: 0.9597,
  kit_moon_dust_tom: 0.6911, kit_moon_dust_rim: 0.2771,
  kit_moon_dust_crash: 0.9056, kit_neon_origami_kick: 0.7,
  kit_neon_origami_snare: 1.3389, kit_neon_origami_clap: 0.4239,
  kit_neon_origami_hats: 0.4452, kit_neon_origami_ohats: 0.8124,
  kit_neon_origami_tom: 0.735, kit_neon_origami_rim: 1.2849,
  kit_neon_origami_crash: 1.8641, kit_pocket_pixel_kick: 0.5789,
  kit_pocket_pixel_snare: 0.4376, kit_pocket_pixel_clap: 0.3204,
  kit_pocket_pixel_hats: 0.4557, kit_pocket_pixel_ohats: 0.5127,
  kit_pocket_pixel_tom: 0.6699, kit_pocket_pixel_rim: 0.4281,
  kit_pocket_pixel_crash: 0.5006, kit_rio_lanterns_kick: 0.6584,
  kit_rio_lanterns_snare: 1.2696, kit_rio_lanterns_clap: 0.3708,
  kit_rio_lanterns_hats: 0.474, kit_rio_lanterns_ohats: 0.8242,
  kit_rio_lanterns_tom: 0.8564, kit_rio_lanterns_rim: 0.3303,
  kit_rio_lanterns_crash: 1.8641, kit_rubber_factory_kick: 0.6582,
  kit_rubber_factory_snare: 1.3435, kit_rubber_factory_clap: 0.3165,
  kit_rubber_factory_hats: 0.377, kit_rubber_factory_ohats: 0.803,
  kit_rubber_factory_tom: 0.6746, kit_rubber_factory_rim: 0.3625,
  kit_rubber_factory_crash: 1.8641, kit_velvet_basement_kick: 0.6521,
  kit_velvet_basement_snare: 1.2442, kit_velvet_basement_clap: 0.3322,
  kit_velvet_basement_hats: 0.5465, kit_velvet_basement_ohats: 0.8197,
  kit_velvet_basement_tom: 0.7024, kit_velvet_basement_rim: 0.2771,
  kit_velvet_basement_crash: 0.9056, dsKick: 0.7672, dsKickHard: 0.0667,
  dsSnare: 0.6701, dsSnareCrack: 1.0413, dsClap: 0.2885, dsHatClosed: 0.7135,
  dsHatOpen: 0.8873, hatSnapOpen: 0.8037, hatGrit: 0.3197, hatGritOpen: 0.3526,
  dsShaker: 0.5496, dsTom: 0.7216, dsRim: 0.2008, vl1Pi: 0.6599, vl1Po: 0.6618,
  vl1Sha: 0.8505, dsZap: 0.7, rimRing: 0.2397, rimWood: 0.1212,
  gateClang: 0.8769, rimClang: 0.6613, hatClusterOpen: 1.0755,
  snarePink: 0.6849, clapHands: 0.2871, kickCrush: 0.6934, snareTwoBody: 0.8787,
  tomSimmons: 1.3215, kickClickTop: 0.8663, kickEngine: 0.7966,
  kickShop: 0.7085, kickMegamix: 0.709, snareEngine: 0.5414, clapEngine: 1.0679,
  hatEngine: 0.8382, ohatEngine: 0.9765, tomEngine: 0.6757, rimEngine: 1.0751,
  crashEngine: 0.8242, crashFinale: 0.8105, dsCrackSnare2: 1.1119,
  dsClosedHat2: 1.9163, engineCrash: 2.6088, ds909Kick: 0.8722,
  ds909KickPunch: 0.794, ds909Snare: 0.3053, ds909SnareCrack: 1.0402,
  ds909Clap: 0.2804, ds909OpenHat: 0.8286, ds909Tom: 0.7026, ds909Rim: 0.3521,
  ds909Crash: 1.8641, dsCr78Kick: 0.6899, dsCr78Snare: 0.4701,
  dsCr78Hat: 0.6253, dsCr78Clap: 0.1997, dsCr78Cowbell: 0.3285,
  dsCr78Tom: 0.6969, ds808Kick: 0.7124, ds808Snare: 0.7352, ds808Clap: 0.3172,
  ds808OpenHat: 0.5898, ds808Cowbell: 0.4688, tr808CowbellClassic: 0.4688,
  tr808CowbellLow: 0.5005, tr808CowbellHard: 0.3584, ds808Tom: 0.6978,
  ohatSustainMetal: 0.6056, ohatSustainAir: 0.9898, ohatSustainWash: 0.5319,
  rimshot808: 0.4428, rimshotWood: 0.2771, rimshotLaser: 0.4188,
  congaHigh: 0.5175, congaMid: 0.686, congaLow: 0.7366, congaSlap: 0.876,
  guiraScrape: 0.3992, guiraChk: 0.2487, tambora: 0.8574, djembeBass: 0.7017,
  djembeTone: 0.5332, djembeSlap: 0.8873, talkingDrum: 0.6888,
  bongoHigh: 0.7071, bongoLow: 0.78, shekere: 0.3637, cbSosTriangle: 0.1796,
  cbSosLongTail: 0.1526, cb808Unclamped: 0.4552, cbStruckRing: 0.1016,
  cbAgogoWide: 0.4591, clvSosBridgedT: 0.632, clv808Hard: 0.8028,
  clvRosewood: 0.6126, clvBrightSnap: 0.7979, clvDoubleStrike: 0.6461,
  rim808BridgedT: 0.3625, rim909TwoMode: 1.2849, rimShotHard: 0.5546,
  ohat808Bands: 1.2301, ohat808Long: 1.4242, ohat909SixBit: 1.3267,
  ohat909Long: 1.436, rideSosTwoPath: 1.861, rideSosFullTail: 2.0525,
  cy808Cymbal: 0.3517, crash808Long: 0.9056, ride909SixBit: 1.0339,
  kwBlipPing: 0.4715, kwBlipSnap: 0.3011, kwBlipWood: 0.1217,
  kwBlipGlass: 0.5783, kwBlipTick: 0.3123, kwBlipDrop: 0.4344,
  kwBlipDouble: 0.508, syn3Deooom: 0.6996, syn3RingBell: 0.6552,
  syn3Whoosh: 0.2562, syn3Zap: 1.2854, sdDiscoTom: 0.6935, sdHighPew: 0.6421,
  sdCrack: 0.5634, sdRise: 0.5962, sdsKick: 0.7293, sdsSnare: 0.4725,
  sdsTomHigh: 0.6537, sdsTomMid: 0.7132, sdsTomLow: 0.7341, sdsCymbal: 1.351,
  syn3PewLong: 0.7, syn3PewSnap: 0.7, syn3PewPew: 1.365, syn3PewDeep: 0.7,
  syn3PewFormant: 2.1281, snareFlam: 2.1394, clapMetal: 1.6986, clapFm: 0.5222,
  buzzRoll: 2.217, snareCrisp: 0.5317, snareFat: 0.6931, snareTight: 0.4907,
  clap808: 0.2613, clapTight: 0.2175, clapRoom: 0.3985, hatOpen: 0.8797,
  hatFoilOpen: 0.8241, shaker: 0.4159, tambourine: 0.9308, noiseSweep: 0.8222,
  taikoHit: 0.7672, timpaniHit: 0.7225, metalHit: 0.7001, blastBoom: 1.8484,
  blastThunder: 1, blastImpact: 0.9326, blastNoiseCrash: 1, blastBolt: 1,
  blastGated: 1, amHollow2: 0.1073, sawtoothTone2: 0.5903, sintone: 0.686,
  roundBass: 1.1834, squareMono: 0.7338, celeste2: 0.2191,
  thickSquareGlide: 1.1066, memoryOrgan2: 0.2504, testSIMPLESQR: 0.3161,
  simpleStrings: 0.3631, wubClassic: 1.6072, wubSlow: 2.1501,
  wubTriplet: 0.9389, wubStutter: 1.3088, wubHalf: 1.5432, wubReese: 1.6072,
  wubFmGrowl: 0.9464, wubSyncScreech: 1.1119, wubRobot: 1.6072, wubYoi: 0.2944,
  wubGlassYoi: 0.6171, wubDarkAir: 0.4369, siren: 0.674,
  newSyncRazorLead: 0.7776, seedFutureBassBass: 0.117,
  seedFutureBassSub: 0.4502, seedFutureBassSaws: 0.2661,
  seedFutureBassPiano: 0.6944, seedFutureBassPad: 0.3158,
  seedFutureBassSquare: 0.1523, seedFutureBassBell: 0.219,
  seedFutureBassMegaSaw: 0.7717, seedFutureBassArp: 0.3444,
  seedFutureBassChoir: 0.122, seedFutureBassThird: 0.6944,
  seedFutureBassCounter: 0.2191, seedReggaetonBass: 0.7,
  seedReggaetonSub: 0.6891, seedReggaetonPiano: 0.6349, seedReggaetonPad: 0.489,
  seedReggaetonSquare: 0.2153, seedReggaetonBell: 0.2195,
  seedReggaetonMegaSaw: 0.2587, seedReggaetonArp: 0.2092,
  seedReggaetonChoir: 0.1943, seedReggaetonThird: 0.2205,
  seedReggaetonCounter: 0.1687, seedChipstepBass: 0.3138,
  seedChipstepSub: 1.6072, seedChipstepSaws: 0.4322, seedChipstepPad: 0.6688,
  seedChipstepSquare: 0.2007, seedChipstepBell: 0.6468,
  seedChipstepMegaSaw: 1.0017, seedChipstepArp: 0.6468,
  seedChipstepChoir: 0.1807, seedChipstepThird: 0.1798,
  seedChipstepCounter: 0.3138, seedTranceBass: 0.276, seedTranceSub: 0.6891,
  seedTranceSaws: 0.2661, seedTrancePiano: 0.6944, seedTrancePad: 0.2939,
  seedTranceSquare: 0.2661, seedTranceBell: 0.3673, seedTranceMegaSaw: 0.7717,
  seedTranceArp: 0.2752, seedTranceChoir: 0.122, seedTranceThird: 0.6944,
  seedTranceCounter: 0.2888, seedItaloDiscoBass: 0.2208,
  seedItaloDiscoSub: 0.6891, seedItaloDiscoPad: 0.2907,
  seedItaloDiscoSquare: 0.3151, seedItaloDiscoBell: 0.3725,
  seedItaloDiscoMegaSaw: 0.248, seedItaloDiscoArp: 0.2877,
  seedItaloDiscoChoir: 0.122, seedItaloDiscoThird: 0.3025,
  seedItaloDiscoCounter: 0.2813, seedBigRoomBass: 1.5783,
  seedBigRoomSub: 0.6891, seedBigRoomSaws: 0.2661, seedBigRoomPad: 0.3278,
  seedBigRoomSquare: 0.6824, seedBigRoomBell: 0.3674,
  seedBigRoomMegaSaw: 0.7717, seedBigRoomArp: 0.2595, seedBigRoomChoir: 0.122,
  seedBigRoomThird: 0.4604, seedBigRoomCounter: 0.2881,
  seedMegadriveBass: 0.2207, seedMegadriveSub: 0.6891,
  seedMegadrivePiano: 0.2185, seedMegadrivePad: 1.0845,
  seedMegadriveSquare: 0.6812, seedMegadriveBell: 0.2199,
  seedMegadriveMegaSaw: 0.2094, seedMegadriveArp: 0.2199,
  seedMegadriveChoir: 0.1807, seedMegadriveThird: 0.2183,
  seedMegadriveCounter: 0.2185, vl1Pi2: 0.6659, fatKick: 0.9364,
  bigClap: 0.3823, snareTap: 0.8893, blipZap: 1.4707, simple808StyleHat: 0.9604,
  gbSnare: 1.1525, bigRoomClap: 0.3589, gameBoySnare: 1.1271,
  dataRibbon: 0.8276, sweepUp: 5.391, seedFutureBassKick: 0.8663,
  seedFutureBassSnare: 0.6701, seedFutureBassClap: 0.3985,
  seedFutureBassHats: 0.7135, seedFutureBassOhats: 0.8037,
  seedFutureBassCrash: 1.8641, seedFutureBassImpact: 0.7,
  seedFutureBassFill: 0.7026, seedFutureBassShaker: 0.4159,
  seedFutureBassTambourine: 0.9308, seedFutureBassCowbell: 0.4688,
  seedFutureBassCongas: 0.686, seedFutureBassRide: 1.0339,
  seedReggaetonKick: 0.7124, seedReggaetonSnare: 0.4907,
  seedReggaetonClap: 0.4907, seedReggaetonHats: 0.7135,
  seedReggaetonOhats: 0.5898, seedReggaetonCrash: 1.1073,
  seedReggaetonImpact: 0.7, seedReggaetonFill: 0.8375,
  seedReggaetonShaker: 0.5496, seedReggaetonTambourine: 0.9308,
  seedReggaetonCowbell: 0.4083, seedReggaetonCongas: 0.5175,
  seedReggaetonRide: 1.0339, seedChipstepKick: 0.794, seedChipstepSnare: 0.7,
  seedChipstepClap: 1.0402, seedChipstepHats: 0.8382, seedChipstepOhats: 1.3267,
  seedChipstepCrash: 1.8641, seedChipstepImpact: 0.4344,
  seedChipstepFill: 0.4715, seedChipstepShaker: 0.4159,
  seedChipstepTambourine: 0.9308, seedChipstepCowbell: 0.4688,
  seedChipstepCongas: 0.686, seedChipstepRide: 1.0339, seedTranceKick: 0.794,
  seedTranceSnare: 0.7309, seedTranceClap: 0.3589, seedTranceHats: 0.7135,
  seedTranceOhats: 0.8286, seedTranceCrash: 0.5414, seedTranceImpact: 0.7,
  seedTranceFill: 0.7026, seedTranceShaker: 0.4159,
  seedTranceTambourine: 0.9308, seedTranceCowbell: 0.4688,
  seedTranceCongas: 0.686, seedTranceRide: 1.0339, seedItaloDiscoKick: 0.8722,
  seedItaloDiscoSnare: 0.7352, seedItaloDiscoClap: 0.318,
  seedItaloDiscoHats: 0.6253, seedItaloDiscoOhats: 0.5898,
  seedItaloDiscoCrash: 1.8641, seedItaloDiscoFill: 0.6935,
  seedItaloDiscoShaker: 0.4159, seedItaloDiscoTambourine: 0.9308,
  seedItaloDiscoCowbell: 0.4552, seedItaloDiscoCongas: 0.686,
  seedItaloDiscoRide: 1.0339, seedBigRoomKick: 0.794, seedBigRoomSnare: 0.6701,
  seedBigRoomClap: 0.3589, seedBigRoomHats: 0.7135, seedBigRoomOhats: 0.8286,
  seedBigRoomCrash: 1.8918, seedBigRoomImpact: 0.7, seedBigRoomFill: 0.7026,
  seedBigRoomShaker: 0.4159, seedBigRoomTambourine: 0.9308,
  seedBigRoomCowbell: 0.4688, seedBigRoomCongas: 0.686, seedBigRoomRide: 1.0339,
  seedMegadriveKick: 0.7088, seedMegadriveSnare: 1.1119,
  seedMegadriveClap: 0.5222, seedMegadriveHats: 0.3197,
  seedMegadriveOhats: 1.3267, seedMegadriveCrash: 1.0326,
  seedMegadriveFill: 0.6537, seedMegadriveShaker: 0.4159,
  seedMegadriveTambourine: 0.9308, seedMegadriveCowbell: 0.4688,
  seedMegadriveCongas: 0.686, seedMegadriveRide: 1.0339, stSnareCrisp: 0.5317,
  stRoundMono: 1.1834, stFmKeys: 0.2185, stMonoBright: 0.8786,
  stSnareBrush: 0.8888, stSubSine: 0.6891, stReedOrgan: 0.409,
  stVibratoLead: 1.3754, stSnareRim: 0.565, stClave: 0.2031,
  stTpBassGuitar: 0.7653, stClav: 0.2597, stSynthPluck: 1.2037,
  stSnareFat: 0.6931, stHatPedal: 0.3099, stDsRim: 0.2008, stRubberBass: 0.9055,
  stEpiano: 0.2199, stCeleste: 0.2195, stHatClosed: 0.7475, stHatOpen: 0.8797,
  stDetuneBass: 1.5783, stWarmPad: 0.7269, stDuoDetune: 1.4581,
  stWoodBlock: 0.2198, stGlassPad: 0.1228, stMusicBox: 0.219,
  stSnareFlam: 2.1394, stSynthStrings: 1.0845, stReedLead: 0.8358,
  stFmGrowl: 0.216, stAmOrgan: 0.111, stGlassLead: 0.2129, stClapRoom: 0.3985,
  stTpBassy: 0.9895, stTpPianoetta: 0.8862, stTpBah: 0.1386,
  stClapTight: 0.2175, stAcidSquelch: 1.6451, stBreathPad: 0.9905,
  stTpLectric: 0.6403, stClap808: 0.2613, stDsHatClosed: 0.7135,
  stPadTriangle: 0.6968, stFmBell: 0.2199, stAmHollow: 0.1073,
  stKickPunch: 0.794, stKickDeep: 0.7672, stKickTight: 0.8722,
  stKickThud: 0.6899, stKickDirty: 0.6934, stKickClick: 0.7124, stTaiko: 0.7026,
  stZap: 0.7, stHatTick: 0.6253, stHatSizzle: 1.0138, stMetalHatClosed: 0.7687,
  stCowbell: 0.3674, stTriangleDing: 0.3674
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
  stSnareCrisp: { label: 'Crisp Snare (starter)', category: 'Snare', kind: 'drum', dur: 1,
    note: 'The engine’s own snare as a preset: a bright noise band, a short decay and a hint '
      + 'of body. The one every song already uses.',
    osc: { type: 'triangle', from: 210, to: 140, sweep: 0.06, decay: 0.06, gain: 0.375 },
    noise: { type: 'bandpass', freq: 2600, Q: 0.7, decay: 0.09 } },
  stRoundMono: { label: 'Round Mono 2 (starter)', category: 'Bass', kind: 'tone', synth: 'CRLS-1', dur: 1.8,
    note: 'Saw through a lowpass that closes as the note decays — the classic synth bass.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.001, decay: 1.24, sustain: 0.29, release: 0.8 },
      filter: { type: 'lowpass', Q: 2.9, rolloff: -24 },
      filterEnvelope: { attack: 0.0016, decay: 0.7207, sustain: 0.0782, release: 0.1477, baseFrequency: 110, octaves: 3.9, attackCurve: 'exponential', decayCurve: 'exponential', releaseCurve: 'exponential' },
    } },
  stFmKeys: { label: 'FM Keys (starter)', category: 'Keys', kind: 'tone', synth: 'RMND-2', dur: 2.6,
    note: 'Struck keys, percussive enough to keep a stab from smearing into the next bar.',
    options: {
      harmonicity: 2, modulationIndex: 4,
      oscillator: { type: 'sine' },
      modulation: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.8, sustain: 0.1, release: 0.8 },
      modulationEnvelope: { attack: 0.004, decay: 0.4, sustain: 0.05, release: 0.5 },
    } },
  stMonoBright: { label: 'Bright Mono (starter)', category: 'Lead', kind: 'tone', synth: 'CRLS-1', dur: 1.2,
    note: 'Square through an opening filter: the arcade lead with an envelope the raw '
      + 'oscillator cannot give it.',
    options: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.004, decay: 0.15, sustain: 0.6, release: 0.2 },
      filter: { type: 'lowpass', Q: 2, rolloff: -12 },
      filterEnvelope: { attack: 0.002, decay: 0.0975, sustain: 0.3775, release: 0.1063, baseFrequency: 600, octaves: 3.2, attackCurve: 'linear', decayCurve: 'exponential', releaseCurve: 'exponential' },
    } },
  stSnareBrush: { label: 'Brush (starter)', category: 'Snare', kind: 'drum', dur: 1,
    note: 'All air and no crack — a highpassed sweep with no body at all. The quiet backbeat '
      + 'for the lounge themes.',
    noise: { type: 'highpass', freq: 4200, Q: 0.4, decay: 0.13 } },
  stSubSine: { label: 'Sub Sine', category: 'Bass', kind: 'tone', synth: 'CRLS-1', dur: 2.2,
    note: 'Pure weight, no harmonics. Wants room underneath it and a lead up top.',
    options: {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.012, decay: 0.3, sustain: 0.8, release: 0.4 },
    } },
  stReedOrgan: { label: 'Reed Organ (starter)', category: 'Organ', kind: 'tone', synth: 'CRLS-1', dur: 3,
    note: 'A wheezier, narrower organ — harmonium rather than Hammond.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.04, decay: 0.05, sustain: 0.95, release: 0.3 },
      filter: { type: 'bandpass', Q: 2, rolloff: -12 },
      filterEnvelope: { attack: 0.0554, decay: 0.0527, sustain: 0.7452, release: 0.1218, baseFrequency: 500, octaves: 1.5, attackCurve: 'linear', decayCurve: 'exponential', releaseCurve: 'exponential' },
    } },
  stVibratoLead: { label: 'Vibrato Voice (starter)', category: 'Lead', kind: 'tone', synth: 'MRDR-3', dur: 1.8,
    note: 'Heavy, slow vibrato on a near-unison pair — the closest thing here to someone singing.',
    layer: {
      osc1: { type: 'triangle', ratio: 1, detune: 0, gain: 1,
        attack: 0.05, decay: 0.2, sustain: 0.8, release: 0.4 },
      osc2: { type: 'sine', ratio: 1, detune: 3.5, gain: 1,
        attack: 0.07, decay: 0.2, sustain: 0.8, release: 0.4 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 200, Q: 1, track: 0,
        env: { octaves: 3, attack: 0.01, decay: 0.001, sustain: 1, release: 0.5 } },
    },
    vibrato: { depth: 0.175, rate: 5.5 } },
  stSnareRim: { label: 'Rimshot (starter)', category: 'Snare', kind: 'drum', dur: 1,
    note: 'Narrow, high and instant, with a hard pitched knock. The stick rather than the skin.',
    osc: { type: 'square', from: 420, to: 320, sweep: 0.02, decay: 0.02, gain: 0.5 },
    noise: { type: 'bandpass', freq: 5000, Q: 3, decay: 0.03 } },
  stClave: { label: 'Clave (starter)', category: 'Perc', kind: 'tone', synth: 'RMND-2', dur: 0.6,
    note: 'A hard, high, completely dry click with a pitch to it. Cuts through anything at '
      + 'almost no level.',
    options: {
      harmonicity: 3.02, modulationIndex: 8,
      oscillator: { type: 'sine' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.04 },
      modulationEnvelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.02 },
    } },
  stTpBassGuitar: { label: 'Bass Guitar (starter)', category: 'Bass', kind: 'tone', synth: 'CRLS-1', dur: 1.8,
    note: 'An FM square through a lowpass, voiced to sit where a plucked electric bass sits.',
    origin: 'Tonejs/Presets MonoSynth/BassGuitar',
    options: {
      oscillator: { type: 'fmsquare5', modulationType: 'triangle', modulationIndex: 2, harmonicity: 0.501 },
      filter: { Q: 1, type: 'lowpass', rolloff: -24 },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.4, release: 2 },
      filterEnvelope: { attack: 0.0092, decay: 0.0798, sustain: 0.8623, release: 0.6648, baseFrequency: 50, octaves: 4.4, attackCurve: 'linear', decayCurve: 'exponential', releaseCurve: 'exponential' },
    } },
  stClav: { label: 'Clavinet (starter)', category: 'Keys', kind: 'tone', synth: 'CRLS-1', dur: 1,
    note: 'Short, hard and bandpassed. Funk comping — it wants sixteenths.',
    options: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.12, sustain: 0.05, release: 0.1 },
      filter: { type: 'bandpass', Q: 3, rolloff: -12 },
      filterEnvelope: { attack: 0.0013, decay: 0.0574, sustain: 0.0986, release: 0.0376, baseFrequency: 700, octaves: 2.5, attackCurve: 'exponential', decayCurve: 'exponential', releaseCurve: 'exponential' },
    } },
  stSynthPluck: { label: 'Synth Pluck (starter)', category: 'Pluck', kind: 'tone', synth: 'CRLS-1', dur: 0.9,
    note: 'Filter slams shut immediately. Short, bright, and gone.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.18 },
      filter: { type: 'lowpass', Q: 4, rolloff: -24 },
      filterEnvelope: { attack: 0.002, decay: 0.0675, sustain: 0, release: 0.04, baseFrequency: 300, octaves: 4, attackCurve: 'exponential', decayCurve: 'exponential', releaseCurve: 'linear' },
    } },
  stSnareFat: { label: 'Fat Snare (starter)', category: 'Snare', kind: 'drum', dur: 1,
    note: 'Lower band, longer tail and much more body — a snare that carries a backbeat on its '
      + 'own rather than sitting on top of one.',
    osc: { type: 'triangle', from: 180, to: 110, sweep: 0.11, decay: 0.11, gain: 0.6 },
    noise: { type: 'bandpass', freq: 1700, Q: 0.5, decay: 0.16 } },
  stHatPedal: { label: 'Pedal Hat (starter)', category: 'Hats', kind: 'drum', dur: 0.5,
    note: 'Duller and lower — the hat closing under a foot rather than being struck.',
    noise: { type: 'bandpass', freq: 4000, Q: 1.6, decay: 0.05 } },
  stDsRim: { label: 'Synth Rim (starter)', category: 'Rim', homeLane: 'rim', kind: 'drum', dur: 0.5,
    note: 'A driven square knock and a narrow band of air, both gone in thirty milliseconds. '
      + 'The stick sound the engine’s rim approximates, synthesised.',
    osc: { type: 'square', from: 460, to: 635, sweep: 0.012, decay: 0.12, curve: 'exp', gain: 0.13 },
    noise: { type: 'bandpass', freq: 4300, Q: 2.2, decay: 0.235, gain: 0.44 },
    drive: 0.128542 },
  stRubberBass: { label: 'Rubber Bass (starter)', category: 'Bass', kind: 'tone', synth: 'CRLS-1', dur: 1.6,
    note: 'Triangle through a soft filter with a slow-ish attack. Bounces rather than punches.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.02, decay: 0.49, sustain: 0.6, release: 0.3 },
      filter: { type: 'lowpass', Q: 3, rolloff: -12 },
      filterEnvelope: { attack: 0.0175, decay: 0.1972, sustain: 0.3541, release: 0.1333, baseFrequency: 100, octaves: 4.6, attackCurve: 'exponential', decayCurve: 'exponential', releaseCurve: 'exponential' },
    },
    transpose: -12 },
  stEpiano: { label: 'Electric Piano (starter)', category: 'Keys', kind: 'tone', synth: 'RMND-2', dur: 3,
    note: 'The Rhodes shape: bell in the attack, sine underneath, long decay.',
    options: {
      harmonicity: 3, modulationIndex: 10,
      oscillator: { type: 'sine' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.002, decay: 1.2, sustain: 0.06, release: 1 },
      modulationEnvelope: { attack: 0.001, decay: 0.25, sustain: 0.01, release: 0.3 },
    } },
  stCeleste: { label: 'Celeste (starter)', category: 'Bells', kind: 'tone', synth: 'RMND-2', dur: 4,
    note: 'Small, high and pure, with a very long tail. Made for the twinkle lane.',
    options: {
      harmonicity: 7, modulationIndex: 4,
      oscillator: { type: 'sine' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.001, decay: 1.6, sustain: 0.01, release: 1.6 },
      modulationEnvelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.4 },
    } },
  stHatClosed: { label: 'Closed Hat (starter)', category: 'Hats', kind: 'drum', dur: 0.5,
    note: 'A very short highpassed tick. The cheapest sound in the library and the one you '
      + 'need most of.',
    noise: { type: 'highpass', freq: 7000, Q: 0.7, decay: 0.028 } },
  stHatOpen: { label: 'Open Hat (starter)', category: 'Hats', kind: 'drum', dur: 2,
    note: 'The same band left to ring for a third of a second.',
    noise: { type: 'highpass', freq: 6500, Q: 0.7, decay: 0.33 } },
  stDetuneBass: { label: 'Wide Detune Bass (starter)', category: 'Bass', kind: 'tone', synth: 'MRDR-3', dur: 1.8,
    note: 'Two layers a few cents apart, saw against square. Big, and wide without a chorus.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, detune: 0, gain: 1,
        attack: 0.008, decay: 0.2, sustain: 0.7, release: 0.3 },
      osc2: { type: 'square', ratio: 1, detune: 13.8, gain: 1,
        attack: 0.012, decay: 0.2, sustain: 0.7, release: 0.3 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 200, Q: 1, track: 0,
        env: { octaves: 3, attack: 0.01, decay: 0.001, sustain: 1, release: 0.5 } },
    },
    vibrato: { depth: 0.01, rate: 3 } },
  stWarmPad: { label: 'Warm Pad (starter)', category: 'Pad', kind: 'tone', synth: 'CRLS-1', dur: 4,
    note: 'Saw behind a filter that opens slowly. The most ordinary pad there is, and it works.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.25, decay: 0.4, sustain: 0.8, release: 1.2 },
      filter: { type: 'lowpass', Q: 1, rolloff: -12 },
      filterEnvelope: { attack: 0.5313, decay: 0.211, sustain: 0.6921, release: 0.3506, baseFrequency: 200, octaves: 2.6, attackCurve: 'linear', decayCurve: 'exponential', releaseCurve: 'exponential' },
    } },
  stDuoDetune: { label: 'Duo Detune (starter)', category: 'Lead', kind: 'tone', synth: 'MRDR-3', dur: 1.4,
    note: 'A detuned pair under a slow vibrato. The widest lead here.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, detune: 0, gain: 1,
        attack: 0.02, decay: 0.2, sustain: 0.7, release: 0.4 },
      osc2: { type: 'sawtooth', ratio: 1, detune: 8.6, gain: 1,
        attack: 0.03, decay: 0.2, sustain: 0.7, release: 0.4 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 200, Q: 1, track: 0,
        env: { octaves: 3, attack: 0.01, decay: 0.001, sustain: 1, release: 0.5 } },
    },
    vibrato: { depth: 0.06, rate: 5 } },
  stWoodBlock: { label: 'Wood Block (starter)', category: 'Perc', kind: 'tone', synth: 'RMND-2', dur: 0.6,
    note: 'A short knock with almost no tail. Good for rim, and for a tick that keeps time '
      + 'without taking up room.',
    options: {
      harmonicity: 4.5, modulationIndex: 14,
      oscillator: { type: 'sine' },
      modulation: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.06 },
      modulationEnvelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.03 },
    } },
  stGlassPad: { label: 'Glass Pad (starter)', category: 'Pad', kind: 'tone', synth: 'RMND-2', dur: 4,
    note: 'Ring modulation over a long swell — shimmering rather than warm.',
    options: {
      harmonicity: 3.01,
      oscillator: { type: 'sine' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.3, decay: 0.5, sustain: 0.7, release: 1.4 },
      modulationEnvelope: { attack: 0.6, decay: 0.4, sustain: 0.6, release: 1 },
    } },
  stMusicBox: { label: 'Music Box (starter)', category: 'Bells', kind: 'tone', synth: 'RMND-2', dur: 3,
    note: 'Thin, high and slightly sour, with the click of the comb in the attack.',
    options: {
      harmonicity: 6.03, modulationIndex: 7,
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
  stSynthStrings: { label: 'String Machine', category: 'Orch', kind: 'tone', synth: 'MRDR-3', dur: 4,
    note: 'The string-machine sound: two detuned saws, slow on, slow off.',
    layer: {
      osc1: { type: 'sawtooth', ratio: 1, detune: 0, gain: 1,
        attack: 0.2, decay: 0.3, sustain: 0.85, release: 1 },
      osc2: { type: 'sawtooth', ratio: 1, detune: 10.4, gain: 1,
        attack: 0.3, decay: 0.3, sustain: 0.85, release: 1.2 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 200, Q: 1, track: 0,
        env: { octaves: 3, attack: 0.01, decay: 0.001, sustain: 1, release: 0.5 } },
    },
    vibrato: { depth: 0.025, rate: 4 } },
  stReedLead: { label: 'Reed (starter)', category: 'Orch', kind: 'tone', synth: 'CRLS-1', dur: 1.6,
    note: 'Slow attack into a narrow filter — a clarinet-ish breath rather than a stab.',
    options: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.06, decay: 0.1, sustain: 0.8, release: 0.3 },
      filter: { type: 'lowpass', Q: 1, rolloff: -12 },
      filterEnvelope: { attack: 0.085, decay: 0.1251, sustain: 0.5283, release: 0.1236, baseFrequency: 400, octaves: 2, attackCurve: 'linear', decayCurve: 'exponential', releaseCurve: 'exponential' },
    } },
  stFmGrowl: { label: 'FM Growl (starter)', category: 'Bass', kind: 'tone', synth: 'RMND-2', dur: 1.8,
    note: 'Modulated sine with a hard edge on the attack. Cuts through a busy kit.',
    options: {
      harmonicity: 1.5, modulationIndex: 6,
      oscillator: { type: 'sine' },
      modulation: { type: 'square' },
      envelope: { attack: 0.005, decay: 0.25, sustain: 0.5, release: 0.3 },
      modulationEnvelope: { attack: 0.002, decay: 0.18, sustain: 0.1, release: 0.2 },
    } },
  stAmOrgan: { label: 'AM Organ (starter)', category: 'Organ', kind: 'tone', synth: 'RMND-2', dur: 2.6,
    note: 'Held and slightly beating, the way an organ with two drawbars out is.',
    options: {
      harmonicity: 1,
      oscillator: { type: 'square' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.9, release: 0.35 },
      modulationEnvelope: { attack: 0.1, decay: 0.1, sustain: 0.8, release: 0.3 },
    } },
  stGlassLead: { label: 'Glass (starter)', category: 'Lead', kind: 'tone', synth: 'RMND-2', dur: 1.2,
    note: 'High harmonicity, short modulation — thin and clear, sits over a dense mix.',
    options: {
      harmonicity: 5, modulationIndex: 3,
      oscillator: { type: 'sine' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.004, decay: 0.2, sustain: 0.5, release: 0.3 },
      modulationEnvelope: { attack: 0.002, decay: 0.15, sustain: 0.1, release: 0.2 },
    } },
  stClapRoom: { label: 'Big Room Clap (starter)', category: 'Clap', kind: 'drum', dur: 1,
    note: 'Five bursts spread wider with a long tail on the last — a hall, not a booth. Wants '
      + 'space in the arrangement.',
    noise: { type: 'bandpass', freq: 1500, Q: 0.9, decay: 0.5, gain: 0.88 },
    taps: [0, 0.014, 0.037, 0.058, 0.083], tapFalloff: 0.89 },
  stTpBassy: { label: 'Hollow Bass (starter)', category: 'Bass', kind: 'tone', synth: 'CRLS-1', dur: 1.8,
    note: 'Built from explicit partials rather than a waveform name, with a resonant lowpass '
      + 'over it. Fat and slightly hollow.',
    origin: 'Tonejs/Presets MonoSynth/Bassy',
    options: {
      portamento: 0.08,
      oscillator: { partials: [2, 1, 3, 2, 0.4] },
      filter: { Q: 4, type: 'lowpass', rolloff: -24 },
      envelope: { attack: 0.04, decay: 0.06, sustain: 0.4, release: 1 },
      filterEnvelope: { attack: 0.0098, decay: 0.0798, sustain: 0.6325, release: 0.5082, baseFrequency: 50, octaves: 3.4, attackCurve: 'linear', decayCurve: 'exponential', releaseCurve: 'exponential' },
    } },
  stTpPianoetta: { label: 'Pianoetta (starter)', category: 'Keys', kind: 'tone', synth: 'CRLS-1', dur: 2.2,
    note: 'A square through a gentle lowpass with a piano-ish decay. Toy upright rather than '
      + 'grand.',
    origin: 'Tonejs/Presets MonoSynth/Pianoetta',
    options: {
      oscillator: { type: 'square' },
      filter: { Q: 2, type: 'lowpass', rolloff: -12 },
      envelope: { attack: 0.005, decay: 3, sustain: 0, release: 0.45 },
      filterEnvelope: { attack: 0.001, decay: 0.2547, sustain: 0.897, release: 0.7647, baseFrequency: 700, octaves: 2.3, attackCurve: 'linear', decayCurve: 'exponential', releaseCurve: 'exponential' },
    } },
  stTpBah: { label: 'Bah (starter)', category: 'Lead', kind: 'tone', synth: 'CRLS-1', dur: 1.4,
    note: 'A bandpassed saw with a vowel in it — the filter sits where a voice’s formant '
      + 'would. Tone.js’s own preset.',
    origin: 'Tonejs/Presets MonoSynth/Bah',
    options: {
      oscillator: { type: 'sawtooth' },
      filter: { Q: 2, type: 'bandpass', rolloff: -24 },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.6 },
      filterEnvelope: { attack: 0.02, decay: 0.4, sustain: 1, release: 0.7, releaseCurve: 'linear', baseFrequency: 20, octaves: 5, style: 'classic' },
    } },
  stClapTight: { label: 'Tight Clap (starter)', category: 'Clap', kind: 'drum', dur: 1,
    note: 'Three closer, shorter bursts. Reads as one hand rather than a room full.',
    noise: { type: 'bandpass', freq: 2400, Q: 2, decay: 0.055 },
    taps: [0, 0.008, 0.016], tapFalloff: 0.7 },
  stAcidSquelch: { label: 'Acid Squelch (starter)', category: 'Bass', kind: 'tone', synth: 'CRLS-1', dur: 1.2,
    note: 'High resonance and a fast filter sweep — the 303 move. Short notes only.',
    options: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.002, decay: 0.1, sustain: 0.3, release: 0.1 },
      filter: { type: 'lowpass', Q: 8, rolloff: -24 },
      filterEnvelope: { attack: 0.0037, decay: 0.0688, sustain: 0.0504, release: 0.055, baseFrequency: 180, octaves: 4, attackCurve: 'exponential', decayCurve: 'exponential', releaseCurve: 'exponential' },
    } },
  stBreathPad: { label: 'Breath (starter)', category: 'Orch', kind: 'tone', synth: 'MRDR-3', dur: 4.5,
    note: 'Two slightly detuned layers swelling together. Big and slow.',
    layer: {
      osc1: { type: 'triangle', ratio: 1, detune: 0, gain: 1,
        attack: 0.35, decay: 0.4, sustain: 0.8, release: 1.4 },
      osc2: { type: 'sawtooth', ratio: 1, detune: 17.2, gain: 1,
        attack: 0.5, decay: 0.4, sustain: 0.7, release: 1.6 },
    },
    global: {
      filter: { type: 'lowpass', slope: -12, freq: 200, Q: 1, track: 0,
        env: { octaves: 3, attack: 0.01, decay: 0.001, sustain: 1, release: 0.5 } },
    },
    vibrato: { depth: 0.04, rate: 2.5 } },
  stTpLectric: { label: 'Lectric (starter)', category: 'Lead', kind: 'tone', synth: 'CRLS-1', dur: 1.4,
    note: 'Portamento of 0.2 means every note slides into the next. A lead that will not sit '
      + 'still.',
    origin: 'Tonejs/Presets Synth/Lectric',
    options: {
      portamento: 0.2,
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.03, decay: 0.1, sustain: 0.2, release: 0.02 },
    } },
  stClap808: { label: 'Hand Clap (starter)', category: 'Clap', kind: 'drum', dur: 1,
    note: 'Four bursts a few milliseconds apart, each quieter than the last — which is all a '
      + 'clap is: one hit heard several times in a small room.',
    noise: { type: 'bandpass', freq: 1900, Q: 1.4, decay: 0.11 },
    taps: [0, 0.011, 0.023, 0.036], tapFalloff: 0.78 },
  stDsHatClosed: { label: 'Synth Closed Hat (starter)', category: 'Hats', kind: 'drum', dur: 0.5,
    note: 'A resonant highpassed tick — sharper than the plain closed hat, closer to metal '
      + 'without being metal.',
    noise: { type: 'highpass', freq: 7800, Q: 1.2, decay: 0.032, gain: 1 } },
  stPadTriangle: { label: 'Triangle Pad (starter)', category: 'Pad', kind: 'tone', synth: 'CRLS-1', dur: 3.2,
    note: 'Slow in, slow out. The attack is heard as an arrival, so it wants held sections.',
    options: {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.12, decay: 0.4, sustain: 0.7, release: 0.9 },
    } },
  stFmBell: { label: 'FM Bell (starter)', category: 'Bells', kind: 'tone', synth: 'RMND-2', dur: 1.2,
    note: 'Struck and metallic, decaying rather than held — a bell at long lengths.',
    options: {
      harmonicity: 3, modulationIndex: 8,
      oscillator: { type: 'sine' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.003, decay: 0.6, sustain: 0.05, release: 0.6 },
      modulationEnvelope: { attack: 0.002, decay: 0.35, sustain: 0.02, release: 0.4 },
    } },
  stAmHollow: { label: 'AM Hollow (starter)', category: 'Lead', kind: 'tone', synth: 'RMND-2', dur: 1.2,
    note: 'Ring-modulated and slightly out of tune with itself. Reads as a voice rather than a '
      + 'synth.',
    options: {
      harmonicity: 2,
      oscillator: { type: 'square' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.008, decay: 0.2, sustain: 0.6, release: 0.3 },
      modulationEnvelope: { attack: 0.05, decay: 0.2, sustain: 0.5, release: 0.3 },
    } },
  // ---- the drum starters the Tone classes took with them ----------------------
  //
  // MembraneSynth and MetalSynth are retired, and every starter kick, the taiko, the
  // zap, three hats and the cowbell were built on them — which would have left the
  // song generator's recipes naming presets that no longer exist and the starter set
  // with no kick in it at all. These are the same drums as KLNG8 constructions, each
  // copied from a measured library preset of the same shape, which is why they carry
  // that preset's LEVEL and PEAK rather than a placeholder: identical construction,
  // identical render.
  stKickPunch: { label: 'Punch Kick (starter)', category: 'Kick', kind: 'drum', dur: 1.2,
    note: 'Triangle body and a fast drop — more middle than an 808, so it survives a mix with a busy bass under it.',
    osc: { type: 'sine', from: 225, to: 52, sweep: 0.025, attack: 0.001, decay: 0.24, curve: 'exp', gain: 1 },
    noise: { type: 'bandpass', freq: 1450, Q: 1.1, decay: 0.018, gain: 0.52 },
    drive: 0.447312 },
  stKickDeep: { label: 'Deep Kick (starter)', category: 'Kick', kind: 'drum', dur: 3,
    note: 'A long, slow drop into a sub that outlasts the bar. One per phrase, or it turns the low end to mud.',
    osc: { type: 'sine', from: 165, to: 48, sweep: 0.045, decay: 0.45, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 3200, Q: 0.7, decay: 0.015, gain: 0.4 },
    drive: 0.20938 },
  stKickTight: { label: 'Tight Kick (starter)', category: 'Kick', kind: 'drum', dur: 1,
    note: 'Shorter, cleaner, less low-end smear — the kick for anything fast.',
    osc: { type: 'sine', from: 185, to: 45, sweep: 0.035, attack: 0.001, decay: 0.42, curve: 'exp', gain: 1 },
    noise: { type: 'highpass', freq: 2600, Q: 1.2, decay: 0.012, gain: 0.34 },
    drive: 0.312548 },
  stKickThud: { label: 'Thud (starter)', category: 'Kick', kind: 'drum', dur: 1,
    note: 'Barely any pitch movement — a dull knock rather than a boom. Sits under a mix instead of leading it.',
    osc: { type: 'sine', from: 135, to: 55, sweep: 0.02, attack: 0.001, decay: 0.22, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 1100, Q: 0.8, decay: 0.02, gain: 0.26 } },
  stKickDirty: { label: 'Dirty Kick (starter)', category: 'Kick', kind: 'drum', dur: 1.2,
    note: 'Distorted on the way down. Buzzy and aggressive without a distortion on it.',
    osc: { type: 'sine', from: 190, to: 48, sweep: 0.04, decay: 0.3, curve: 'exp', gain: 1 },
    tone: { freq: 5200 },
    drive: 0.45,
    shape: 'crush' },
  stKickClick: { label: 'Click Kick (starter)', category: 'Kick', kind: 'drum', dur: 1,
    note: 'More audible attack on small speakers: the click reads where the sub is only felt.',
    osc: { type: 'sine', from: 170, to: 36, sweep: 0.06, attack: 0.001, decay: 0.78, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 2200, Q: 0.7, decay: 0.02, gain: 0.25 },
    drive: 0.121058 },
  stTaiko: { label: 'KW Blip (starter)', category: 'Blip', kind: 'drum', homeLane: 'tom', dur: 2.4,
    note: 'Like a Kraftwerk percussion blip — a pitched thump with somewhere to fall.',
    osc: { type: 'sine', from: 260, to: 125, sweep: 0.08, decay: 0.34, curve: 'exp', gain: 1 },
    noise: { type: 'lowpass', freq: 1500, Q: 0.8, decay: 0.025, gain: 0.2 },
    drive: 0.120223 },
  stZap: { label: 'Zap (starter)', category: 'FX', kind: 'drum', dur: 0.6,
    note: 'A pitch drop so fast it is heard as a click with a direction. Laser, or a very electronic rim.',
    osc: { type: 'sawtooth', from: 1900, to: 50, sweep: 0.085, decay: 0.1, curve: 'exp', gain: 1 },
    drive: 0.5 },
  stHatTick: { label: 'Metal Tick (starter)', category: 'Hats', kind: 'drum', dur: 0.5,
    note: 'The shortest thing in the library — a tick with almost no ring at all.',
    noise: { type: 'highpass', freq: 4800, Q: 0.7, decay: 0.055, gain: 0.8 } },
  stHatSizzle: { label: 'Sizzle Hat (starter)', category: 'Hats', kind: 'drum', dur: 1.5,
    note: 'An open hat left to sizzle: inharmonic partials over a long tail.',
    metal: { freq: 540, spread: 1, count: 6, hp: 6100, Q: 0.9, slope: -24, decay: 0.42 },
    humanize: { gain: 0.04 } },
  stMetalHatClosed: { label: 'Metal Hat', category: 'Hats', kind: 'drum', dur: 0.5,
    note: 'Six squares at inharmonic ratios through a highpass — metallic in a way filtered noise never is.',
    metal: { freq: 540, spread: 1, count: 6, hp: 7600, Q: 0.9, slope: -24, decay: 0.04 },
    humanize: { gain: 0.05 } },
  stCowbell: { label: 'Cowbell (starter)', category: 'Perc', homeLane: 'rim', kind: 'drum', dur: 0.8,
    note: 'Two detuned squares and no decay to speak of. The one sound nobody is neutral about.',
    osc: { type: 'square', from: 540, to: 510, sweep: 0.004, decay: 0.11, curve: 'exp', gain: 0.55 },
    ring: { freq: 805, Q: 34, hit: 0.001, decay: 0.18, gain: 1 },
    drive: 0.130405 },
  stTriangleDing: { label: 'Triangle (starter)', category: 'Perc', kind: 'drum', homeLane: 'tom', dur: 6,
    note: 'A high, thin body ringing far longer than it has any right to.',
    osc: { type: 'square', from: 540, to: 510, sweep: 0.004, decay: 0.11, curve: 'exp', gain: 0.55 },
    ring: { freq: 805, Q: 34, hit: 0.001, decay: 0.18, gain: 1 },
    drive: 0.130405 },
};

export const VOICES = {};
for (const [id, v] of Object.entries(ENGINE)) VOICES[id] = { ...v, id, kind: 'engine', factory: true };
for (const [id, v] of Object.entries(TONE)) VOICES[id] = { ...v, id, kind: 'tone', factory: true, level: LEVELS[id] ?? 0, peak: PEAKS[id] ?? 1 };
for (const [id, v] of Object.entries(DRUM)) {
  VOICES[id] = { ...v, id, kind: 'drum', factory: true, level: LEVELS[id] ?? 0, peak: PEAKS[id] ?? 1 };
}
for (const [id, v] of Object.entries(USER_TONE)) {
  VOICES[id] = { ...v, id, kind: 'tone', user: true, level: LEVELS[id] ?? 0, peak: PEAKS[id] ?? 1 };
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
  // the vocal lane opens on the choirs: JMJR-4's pads live there
  vox: 'Pad',
  organChords: 'Organ', twinkle: 'Bells',
  kick: 'Kick', snare: 'Snare', clap: 'Clap',
  hats: 'Hats', ohats: 'Hats', rim: 'Perc', crash: 'Crash', tom: 'Tom',
};

/** The seven kit categories, which travel together in the picker. */
export const KIT_CATEGORIES = ['Kick', 'Snare', 'Hats', 'Clap', 'Tom', 'Crash',
  'Rim', 'Perc', 'Blip', 'Sweep'];

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

/**
 * A `kind: 'noise'` copy, read as the KLNG8 preset it always was.
 *
 * The noise path and the drum path were the same construction twice: an identical
 * filtered burst off the identical seeded buffer, and under it a short pitched thump
 * that one of them called `body` and the other `osc`. `_playNoise` is gone and `body`
 * with it — but a song carries a COMPLETE copy of its presets, not a reference (see
 * the note on `registerSongVoice`), so every song mixed before the merge still has
 * `kind: 'noise'` and a `body` written into it, and always will.
 *
 * So the translation lives here, at the one door those copies come through, rather
 * than as a branch left in the engine for data nobody can rewrite. `body` swept its
 * pitch over its own amp decay; `osc` states the two separately, so the sweep takes
 * the decay's number and the sound is what it was.
 *
 * Not a general migration: it converts a copy on the way into the catalogue and never
 * writes to a song file. A song saved from the desk after this is a drum preset for
 * good, because that is what the desk will have been editing.
 */
function noiseCopyAsDrum(params) {
  if (params?.kind !== 'noise') return params;
  const { body, ...rest } = params;
  return {
    ...rest,
    kind: 'drum',
    ...(body ? { osc: { ...body, sweep: body.sweep ?? body.decay ?? 0.06 } } : {}),
  };
}

/**
 * A stored `DuoSynth` copy, read as the MRDR-3 patch it became.
 *
 * The same move `noiseCopyAsDrum` makes above, for the same reason: DuoSynth is retired,
 * songs carry their own frozen copies of presets, and a copy is the one thing a catalogue
 * rename cannot reach. Unlike the other renames this one changes the PARAMETERS as well
 * as the name — two Tone MonoSynths under `options.voice0`/`voice1` are two MRDR-3 layers
 * — so the alias in `RENAMED` needs this beside it or the preset arrives as an MRDR-3
 * with no `layer` and plays nothing.
 *
 * The three conversions, each measured rather than guessed (work/local/duo-vs-mrdr3.mjs
 * renders both and compares; the audible spectrum matches within 0.6 dB):
 *
 *   harmonicity  is voice1's frequency RATIO, so it is `1200 * log2(h)` cents of detune
 *                on the second layer. Voice 0 never moved and neither does osc1.
 *   vibratoAmount scales an LFO that Tone runs from -50 to +50 CENTS, and MRDR-3 reads
 *                depth in SEMITONES — so the number halves.
 *   the filter   is the one nobody wrote down. Tone's DuoSynth overrides MonoSynth's
 *                filter envelope to attack 0.01 / decay 0 / sustain 1, which parks a
 *                12 dB lowpass at `baseFrequency * 2^octaves` = 1600 Hz and leaves it
 *                there. Every one of these presets had it without asking, so dropping it
 *                would have made them all brighter.
 *
 * Voicing prefixes are Tone's and mean nothing here: `fatsawtooth` is a sawtooth with
 * three detuned copies, which is `unison`/`spread` on a layer and is carried across
 * rather than flattened to one oscillator.
 */
const DUO_FILTER = Object.freeze({
  type: 'lowpass', slope: -12, freq: 200, Q: 1, track: 0,
  env: { octaves: 3, attack: 0.01, decay: 0.001, sustain: 1, release: 0.5 },
});
function duoCopyAsLayer(params) {
  if (params?.synth !== 'DuoSynth' || !params?.options?.voice0) return params;
  const o = params.options;
  const layerOf = (voice, detune) => {
    const raw = String(voice?.oscillator?.type || 'sawtooth');
    const fat = raw.startsWith('fat');
    const type = raw.replace(/^(fat|am|fm)/, '') || 'sawtooth';
    const e = voice?.envelope || {};
    return {
      type, ratio: 1, detune, gain: 1,
      attack: e.attack ?? 0.01, decay: e.decay ?? 0,
      sustain: e.sustain ?? 1, release: e.release ?? 0.5,
      // Tone's fat defaults, which is what a preset that never set them was hearing.
      ...(fat ? { unison: voice?.oscillator?.count ?? 3, spread: voice?.oscillator?.spread ?? 20 } : {}),
    };
  };
  const { options, ...rest } = params;
  return {
    ...rest,
    synth: 'MRDR-3',
    layer: {
      osc1: layerOf(o.voice0, 0),
      osc2: layerOf(o.voice1, Math.round(1200 * Math.log2(o.harmonicity ?? 1.5) * 10) / 10),
    },
    global: { filter: { ...DUO_FILTER, env: { ...DUO_FILTER.env } } },
    vibrato: { depth: (o.vibratoAmount ?? 0.5) / 2, rate: o.vibratoRate ?? 5 },
  };
}

export function registerSongVoice(voiceKey, trackId, rawParams) {
  if (!voiceKey || !rawParams) return null;
  const params = duoCopyAsLayer(noiseCopyAsDrum(rawParams));
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
  crashDur: 5, crashOpen: 9000, crashClose: 1100
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
