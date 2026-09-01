// Web Audio: procedural SFX + a lookahead step-sequencer with per-cabinet
// pattern banks. Lazy init on first user gesture; ctx.resume() on every gesture (iOS).
import { renderCue, CONTACT_CUE, LAUNCH_CUE } from './weapon-sfx.js';
import { createMixer, dbToGain, AUX_DEFAULTS } from './mixer.js';
import { MAX_DELAY_SECONDS, makeReverb } from './effects.js';
import {
  laneList, laneEchoesIn, deskBank, soloBank, barPlan, invalidateBarPlan,
  LANE_KEYS, stepLen, toneLen, effectiveStepLen, effectiveToneLength, sequenceValue, lenKey,
} from './lanes.js';
import {
  VoiceRack, pulseTable, createNoteCacheState, setNoteCachePlaybackActive,
  setNoteCacheTransportRunning,
  clearNoteCacheState, invalidateNoteCacheState, MRDR_QUALITY,
} from './voices.js';
import { MIX, laneSettings } from '../data/mix.js';
import { VOICE_LANES, PERCUSSION_LANES, voiceOf, voiceGain, laneTrim, engineBankKeys, registerSongVoice, seamFor, baseLane } from '../data/voices.js';
import { trackIdOf } from '../data/tracks.js';
import {
  applyArrangement, resolveSection, loopOf, loopSteps, SWING_STRAIGHT, SWING_MAX,
  resolutionOf, promoteResolution, LEGACY_RESOLUTION, FINE_RESOLUTION, RESOLUTIONS,
} from '../data/arrangements.js';
import { createNoteFxProcessor, resolveNoteFx } from './note-fx.js';
import {
  rearrangementPosition as resolveRearrangementPosition,
  rearrangementOutputSteps,
  rearrangementDrumMode,
  rearrangementDrumHit,
  REARRANGE_GENERATED_DRUMS,
  harmonicShift,
} from '../../tools/lib/rearrange.js';

// The scheduler runs on the main thread, alongside panel builds and layout work. A
// quarter-second of queued audio gives those unavoidable UI tasks room to finish
// without reaching the audible edge; scheduled timestamps do not move, and preview
// notes use their separate path below.
/**
 * The choke group a lane belongs to, as a stable key, or null.
 *
 * `{ hats: 'ohats' }` is one pairing written once. Either lane resolves to the same
 * `hats+ohats`, because the group is the two names sorted — so it does not matter which
 * side of the pair the song happened to write down, or which of them is playing.
 */
const chokePairOf = (map, lane) => {
  if (!map || !lane) return null;
  const partner = typeof map[lane] === 'string' ? map[lane]
    : Object.keys(map).find((k) => map[k] === lane);
  return partner ? [lane, partner].sort().join('+') : null;
};

/*
 * ---- EDIT RECOVERY: the constants, and the debounce that drives it ------------------
 *
 * The failure this repairs, measured rather than reasoned: editing a voice while it
 * plays purges its rendered buffers, every distinct note of it then plays LIVE, and the
 * live cost of a heavy preset is several times what the machine can render in real time.
 * One session reached 139 outstanding cache keys and an audio clock at 0.204 while the
 * main thread sat idle with a healthy scheduler margin.
 *
 * The repair is to re-render the notes the playhead is ABOUT TO REACH, before it reaches
 * them, instead of letting the whole backlog drain at background pace in song order.
 */

// How far ahead to repair. Two bars: far enough that the render has somewhere to land
// before the playhead arrives, near enough that the window is a handful of notes per lane
// rather than a whole section.
const URGENT_WINDOW_STEPS = 32;

// The band urgent priorities live in. It must clear every song step — the ordinary walk
// uses the step itself as the priority and sorts descending — so that "nearest to the
// playhead" always outranks "latest in the song". A form is thousands of steps at most.
const URGENT_PRIORITY_BASE = 1e6;

// A pot DRAG is a stream of refreshes, not one. Waiting for the hand to stop coalesces
// them into a single walk; the maximum wait is what stops a long continuous drag from
// deferring the repair until the drag ends, which on a slow sweep is the whole problem.
const EDIT_RECOVERY_DELAY_MS = 250;
const EDIT_RECOVERY_MAX_WAIT_MS = 1000;

/**
 * A trailing debounce with a ceiling, and an accumulating set of what changed.
 *
 * Extracted and injectable because its bugs are all TIMING bugs — fires twice, never
 * fires, fires after the song changed — and none of those can be caught by reading it.
 * `tests/note-cache-urgent.js` drives it with a fake clock.
 */
export function makeEditRecovery({
  delayMs = EDIT_RECOVERY_DELAY_MS,
  maxWaitMs = EDIT_RECOVERY_MAX_WAIT_MS,
  now = () => performance.now(),
  setT = setTimeout,
  clearT = clearTimeout,
  fire,
} = {}) {
  const edited = new Set();
  let timer = null;
  let firstAt = 0;
  const run = () => {
    timer = null;
    firstAt = 0;
    if (!edited.size) return;
    const batch = new Set(edited);
    edited.clear();
    fire?.(batch);
  };
  return {
    edited,
    /** Note an edit. The walk happens once the hand stops, or at the ceiling. */
    schedule() {
      const at = now();
      if (!firstAt) firstAt = at;
      if (timer != null) clearT(timer);
      // Never later than `maxWaitMs` after the FIRST edit of this burst: a slow sweep
      // that never pauses would otherwise never reach its own repair.
      const wait = Math.max(0, Math.min(delayMs, firstAt + maxWaitMs - at));
      timer = setT(run, wait);
    },
    /** Drop a pending walk — the song, the context or the cache is being replaced. */
    cancel() {
      if (timer != null) clearT(timer);
      timer = null;
      firstAt = 0;
      edited.clear();
    },
    pending() { return timer != null; },
  };
}

const SEQUENCER_LOOKAHEAD = 0.25;
const SEQUENCER_LOOKAHEAD_OPTIONS = Object.freeze([0.25, 0.5, 1]);
/**
 * The same window, for a page the machine has stopped paying attention to.
 *
 * A quarter-second is a bargain struck with an INTERACTIVE desk: it is how long a seek
 * or a loop change waits to be heard, so it is kept short on purpose and every ms of it
 * is felt. None of that reasoning survives the window going to the back. What is left
 * there is the other half of the bargain — a main thread the system has stopped
 * treating as urgent. macOS demotes a background app's threads and Chrome demotes a
 * background renderer on top of that, so the 25ms interval stops landing at 25ms, and
 * 250ms of queued audio is not enough to ride that out. Moving the mouse in ANOTHER
 * APP is enough to do it: none of that work reaches this page, it simply takes the
 * attention this page needed. The desk keeps playing while you work elsewhere — that is
 * the point of it — and it used to stutter for as long as you were away.
 *
 * So the window follows the attention: wide while the window is in the back, where
 * latency is a word with no meaning because nobody is there to feel it, and back to a
 * quarter-second the moment you return to it. 1.5s covers a full second of timer
 * clamping with room over, which is the worst the browser will do to us.
 *
 * Not a fix for a busy song in the FOREGROUND. A twenty-lane section that costs more
 * than one core to render is a capacity problem and no amount of queueing ahead helps,
 * because the shortfall is on the audio thread rather than in front of it — measure it
 * with `ctx.currentTime` against the wall clock and it comes back slower than realtime.
 */
const BACKGROUND_LOOKAHEAD = 1.5;

/**
 * How much louder the melodic voices play than they were authored.
 *
 * The kit and the music were never written to a common level. Measured at unity
 * through the render pipeline — LANE_TARGETS in src/data/voices.js — one kick note
 * peaks at −9.6 dBFS where a lead note reaches −28.9 and an organ note −40.3. That
 * gap is not a balance anybody chose, and everything downstream was paying for it:
 *
 *   · every song's peak was one or two drum hits with the music 20 dB underneath,
 *     which is why the catalogue measured 25 dB of crest against a normal 13;
 *   · no song could be turned up, because the kick reached the ceiling first — all
 *     34 sat around −25 LUFS against a −16 target, and two clipped outright;
 *   · every channel on the desk read soft, because they were: the meters were
 *     telling the truth;
 *   · and per-song `musicTrim` reached 3.33 on the ONE song with no drums in it,
 *     which is the by-ear system compensating for exactly this.
 *
 * So the melodic voices are lifted to meet the kit once, here, instead of as a lane
 * gain on all 34 songs and every song written after them. One factor for all of them,
 * so the balance BETWEEN melodic parts — tuned by ear, song by song — is untouched;
 * the kit stays where it is, because it was never the odd one out.
 *
 * It multiplies the resolved gain, so a bank's own `bassGain` keeps its meaning
 * relative to its neighbours. LANE_TARGETS is measured from these voices, so after
 * changing this run `node tools/measure-voices.js` — the preset library normalises
 * against these numbers and would otherwise sit 10.9 dB below them.
 */
const MELODIC_TRIM = 3.5;                  // +10.9 dB

/**
 * How long one note sounds, in seconds, for the voice rack.
 *
 * `len` is what `stepLen` said about this step: nothing, a number of steps, or one
 * per chord tone. An array in gives an array out — the rack hands each tone of a
 * chord its own length — and everything else stays a scalar, so a melodic lane's
 * path through here is one multiply, in the order it was always written:
 * `spb * dur * durScale`. That grouping is deliberate. Reassociating it would be
 * a legal transformation of the arithmetic and an illegal one of the output, and
 * tests/null-test.js compares samples.
 */
const noteSeconds = (len, fallback, spb, durScale = 1, fixedLength = 0) => {
  const one = (i) => {
    // fixedLength is an absolute duration in seconds — a sound-design choice, and the
    // LANE'S DEFAULT length rather than an override of every note drawn on it. Zero or
    // omission means not set.
    //
    // A default because that is already what it is on the other side of the seam:
    // `legacyLaneLength` converts it to steps for every lane that carries per-note
    // lengths, so by the time `len` reaches here the preset's choice is inside it —
    // and a note the piano roll gave a length of its own has replaced it, which is the
    // entire point of drawing one. Short-circuiting on it a second time beat that drawn
    // length, and eight KNDO-5 presets carry one: every note on them sounded for
    // 63-463ms however long the roll said, which is a lane whose resize handle does
    // nothing. See work/local/game-synth-envelope-probe.mjs for the measurement.
    //
    // `len == null` is exactly the case where no such folding happened. The one-shot
    // lanes — gestures, vocals, drums — are not in PER_NOTE_LENGTH_BASES, so
    // `legacyLaneLength` returns null for them and there is no per-note length for
    // `fixedLength` to have been folded into. There it still stands alone and absolute,
    // which is what keeps a one-shot's sound-design length exactly what it was.
    if (fixedLength > 0 && len == null) return fixedLength;
    const requested = toneLen(len, fallback, i);
    return spb * requested * durScale;
  };
  return Array.isArray(len) ? len.map((_, i) => one(i)) : one(0);
};

/**
 * A mix's voice block, merged onto the bank the sequencer will play.
 *
 * The voice block first, because it is bank keys and it merges as bank keys. Then the
 * song's OWN copies of presets, which take over the same keys — see registerSongVoice
 * for why a copy is put in the catalogue rather than handled as a second kind of
 * voice. Then any ENGINE preset still named after all that is expanded into the keys
 * it stands for — `{ bassVoice: 'engFilteredSaw' }` becomes `{ bassFilteredSaw: true }`
 * — so the hand-written voice in scheduleStep reads what it always read and there is
 * no second code path anywhere in the engine. A preset named on a lane it does not
 * apply to expands to nothing rather than to a surprise.
 *
 * Copies last of the two, deliberately: `voice` says which preset the lane is on and
 * `voiceParams` says what this song did to it, so the copy is the more specific answer
 * and has to win. A song can also carry a copy with no `voice` entry at all — a sound
 * that exists nowhere but in that song, which is what a preset saved to the song and
 * never to the library is.
 *
 * Hands back the same object when there is nothing to merge, which is every song that
 * has not been through the desk: the null path allocates nothing and changes nothing.
 */
function withVoices(bank, entry, trackId = null) {
  if (!bank || !entry || (!entry.voice && !entry.voiceParams)) return bank;
  const out = { ...bank, ...entry.voice };
  for (const [voiceKey, params] of Object.entries(entry.voiceParams || {})) {
    const id = registerSongVoice(voiceKey, trackId, params);
    if (id) out[voiceKey] = id;
  }
  for (const key of Object.keys(VOICE_LANES)) {
    const keys = engineBankKeys(voiceOf(out, key), key);
    if (keys) Object.assign(out, keys);
  }
  return out;
}

/**
 * Which of a bank's 32 steps a previewed note lands on (previewNote).
 *
 * Any step would sound the same. Not a multiple of four, though: the sequencer hands
 * every fourth step to its beat listeners, and a key pressed on the desk is not a
 * beat of the song — the visualisers would flash to it.
 */
const PREVIEW_STEP = 1;

// How long the audition bench takes to go quiet when a preview is stopped. See
// `_cutBenchGates`: short enough to read as a stop, long enough not to click.
const BENCH_FADE = 0.015;

// How long an arrangement's per-bar PAN takes to travel, and how far ahead of the note
// it starts so that it arrives on it. A pan stepped under a note that is still ringing
// is a discontinuity in both channels at once, which is a click; twelve milliseconds is
// short enough to read as "on the beat" and has no edge in it. See `_barPan`.
const BAR_PAN_SECONDS = 0.012;

// Layered and harmonically dense cues sum much louder than a single oscillator
// at the same nominal gain. These trims keep their perceived peaks close to the
// everyday jump/coin/UI family while preserving their internal balance.
// Weapon launch/contact assets get their own lower bus trim; regular SFX keep
// their established level and balance.
const ATTACK_MASTER_TRIM = 0.25;
// How far into the 'portal' cue its flash lands — the rest of the cue is the
// approach leading up to it and the exit falling away after.
//
// Exported because it is a LEAD TIME for the caller, not a private detail: a
// screen that wants the flash to coincide with something on-screen has to fire
// the cue this many seconds early. Firing it on the crossing instead put the
// rising half over the outgoing hero's exit, which reads as a beat late.
export const PORTAL_CUE_FLASH_AT = 0.20;
/**
 * The relay swoosh: what a hero being swapped out for another one sounds like.
 *
 * Two legs crossing in stereo, one going out and one coming in, and nothing at the seam
 * — no flash and no thump. The low sine the cue carries by default lands square in the
 * middle of the swoosh, which is where a swoosh wants nothing to happen; without it the
 * gesture is the whole sound. `swell` is load-bearing: the incoming leg was written as a
 * departure and attacks in 4% of its length, which dragged forward by `overlap` arrives
 * with nothing in front of it and reads as a drum hit. Measured, that is a 79ms rise
 * against 188ms for the cue this replaced; at 0.5 it is 316ms and unmistakably a build.
 *
 * Picked by ear from renders — `node tools/render-cues.js portal:wired@9`.
 */
export const PORTAL_RELAY = {
  stretch: 2.4, thump: 0, flash: 0, pan: 1, overlap: 0.18,
  q: 0.8, spread: 1.6, wet: 1.4, swell: 0.5, body: 1,
};

/**
 * How loud to fire it. RMS -33 dBFS, which is where `tag` sits — the cue that fires
 * alongside it on a swap — with peak still under `boom` (-11.7), the loudest thing the
 * game already plays.
 *
 * Came down twice as the cue grew its low end, and for two different reasons. First from
 * 9 to 7, because `body` put 2.3dB of RMS on it for free and took it past that ceiling —
 * MORE SUBSTANCE IS NOT MORE LEVEL. Then from 7 to 5.5 by ear, because weight reads as
 * loudness: a cue with bottom end in it does not need as much of everything else to be
 * heard, and the number that was right without one is too much with one.
 */
export const PORTAL_RELAY_GAIN = 5.5;

/**
 * The two halves, fired at the two moments that are actually knowable.
 *
 * A player can jump as late as 0.162s before a portal and still clear it — measured from
 * BASE_JUMP_V and GRAVITY against the portal's 40-unit height — while the whole cue needs
 * 0.488s of lead for its loudest moment to land on the crossing. Three times longer than
 * the window in which the outcome is decided, so no amount of prediction can tell you in
 * time whether the portal is being taken. It was tried; it fired on every late jump.
 *
 * Split, neither half has to know. IN is the rise, and it plays because a portal is there
 * — take it or jump it, all it ever says is "doorway". OUT is the fall, fired on the
 * crossing itself, which needs no lead at all because it has already happened.
 *
 * OUT drops the swell: that floor exists because the fall, dragged under an approach,
 * arrived with nothing in front of it and read as a drum hit. Here there IS something in
 * front of it — the rise, still ringing — so it can attack the way it was written to.
 */
export const PORTAL_RELAY_IN = { ...PORTAL_RELAY, legs: 'in', stretch: 1.2 };
export const PORTAL_RELAY_OUT = { ...PORTAL_RELAY, legs: 'out', swell: 0 };

/**
 * The rise is the quiet half, and deliberately.
 *
 * It plays on approach whether or not the portal is taken, so it has to be able to be
 * wrong without being annoying — and keeping it under the fall is what makes going
 * through pay off. Arriving at a doorway and going through one should not be the same
 * size of event.
 */
export const PORTAL_RELAY_IN_GAIN = 4;

/**
 * The credits' version: the same gesture, given room to breathe.
 *
 * In a run the rise has to be short because nobody has decided yet whether they are
 * taking the portal, and a long approach is a long chance to be wrong. The credits have
 * no such problem — the four hand-offs are on a schedule computed at load, tens of
 * seconds apart, each with about 4.8s of runway before its swap. Nothing to predict and
 * nothing to collide with, so the swoosh can take its time.
 *
 * The lead follows automatically: portalCueFlashAt scales with `stretch`, and the credits
 * subtract exactly that from each swap time.
 */
export const PORTAL_RELAY_CREDITS = { ...PORTAL_RELAY, stretch: 3 };

/** Where the flash lands for a given portalSwoosh `stretch` — what a caller must lead by. */
export const portalCueFlashAt = (shape) => PORTAL_CUE_FLASH_AT * (shape?.stretch ?? 1);

// The portal's room. Decay is deliberately longer than the cue itself (~0.5s):
// the tail outlasting the swoosh is what sells the doorway as opening onto
// somewhere, rather than as a noise that happens near a prop. It still clears
// well before the next hand-off, which is ~19s away at the crawl's speed.
const PORTAL_VERB_DECAY = 1.6;
// Master depth for that room — the one number to move if the whole cue wants to
// be wetter or drier. Per-layer amounts in portalSwoosh() scale against it, so
// their balance survives a change here.
// Scaled against Blink's fixed 0.00125/rms ConvolverNode normalisation, which is
// a deep enough cut that useful values here sit near 1 rather than well under it.
// Walked back from 1.5: that read as a bigger room than the moment wants — this
// is a doorway in a credits crawl, not a cathedral. The tail is still clearly
// there, it just sits under the cue instead of beside it.
const PORTAL_VERB_SEND = 0.9;

// The finish dog's bark, as shapes rather than as one set of numbers — the
// same device the portal swoosh uses, and for the same reason: they render
// through tools/render-cues.js (`dogBark:finish`) so what is auditioned is the
// engine's own cue and not a second synth's impression of it. Whichever wins
// is adopted by pointing the default at it.
//
// REWRITTEN against the bench in src/dev/dog-bark-synth.js. The cue that stood
// here before was one summed source bank through one moving tract, and it
// measured with ~60% of its magnitude above 6kHz — a real bark puts about 15%
// there and the bulk between 500Hz and 2kHz. That top-heavy air is why it read
// as hiss with a tone behind it however the numbers were pushed, and no
// re-proportioning of the old shape fixed it, because the shape was not the
// problem. So the GRAPH changed too (see dogWoof): fold source, throat
// transient, two sweeping formants, soft-clip strain, chest delay — each its
// own control instead of one blend.
//
// The vocabulary here is the bench's, verbatim, so a set of numbers dialled in
// on the bench is pasted in as a shape without translation. Anything lost in a
// translation step is exactly the thing that was approved by ear.
//
// `f0` is the fundamental at the onset and `pitchDrop` how far it falls, in
// SEMITONES, across the bark — that drop is the identifying gesture, not the
// formants. `drop` and `gap` are the volley's business: the pitch of the
// alternate bark and the spacing between them.
export const BARK_SHAPES = {
  // THE ONE THE GAME FIRES — Peter's bench dial-in, kept to the digit.
  //
  // Read it and it is not where any of the candidates started: a full two
  // octaves of drop, the voice nearly CLEAN (rough 0.15, distortion 0.08) and
  // the air pushed up top instead (bright 0.8). That is a dog heard across a
  // yard rather than one at your leg, which is what the finish line wants —
  // the animal is announcing itself from the end of the stage.
  //
  // Four barks, because one guard dog is not a two-bark problem, at the 0.26
  // spacing the volley was auditioned at. `level` is measured, not guessed:
  // see SFX_TRIM.dogBark.
  finish: { level: 1, count: 4, f0: 375, drop: 0.84, gap: 0.26,
    pitchDrop: 24, dur: 0.225, breath: 0.31, formantFreq: 880, formant2: 2720,
    distortion: 0.08, rough: 0.15, roughHz: 68, sub: 0.26, chest: 0.3,
    bright: 0.8, growl: 0.2, plosive: 0.32 },
  // Big chest, low tract, slow tremor — the animal in the room with you.
  large: { level: 0.85, count: 4, f0: 172, drop: 0.84, gap: 0.28,
    pitchDrop: 16, dur: 0.26, breath: 0.85, formantFreq: 620, formant2: 1750,
    distortion: 0.55, rough: 0.5, roughHz: 52, sub: 0.9, chest: 0.5,
    bright: 0.22, growl: 0, plosive: 1 },
  // The neutral reference: mid-size dog, mouth working, plenty of air.
  medium: { level: 0.92, count: 2, f0: 340, drop: 0.82, gap: 0.24,
    pitchDrop: 15, dur: 0.17, breath: 0.75, formantFreq: 880, formant2: 2100,
    distortion: 0.45, rough: 0.46, roughHz: 84, sub: 0.6, chest: 0.3,
    bright: 0.35, growl: 0, plosive: 1 },
  // Terrier at the gate: short, high, snappy, almost no chest.
  small: { level: 0.98, count: 3, f0: 620, drop: 0.8, gap: 0.17,
    pitchDrop: 13, dur: 0.11, breath: 0.6, formantFreq: 1150, formant2: 2600,
    distortion: 0.35, rough: 0.42, roughHz: 118, sub: 0.35, chest: 0.1,
    bright: 0.5, growl: 0, plosive: 1 },
  // The "decided about you" bark: hardest drive, deepest drop, a growl smeared
  // under the front of each one.
  guard: { level: 1.06, count: 4, f0: 205, drop: 0.84, gap: 0.26,
    pitchDrop: 21, dur: 0.22, breath: 0.95, formantFreq: 700, formant2: 1900,
    distortion: 0.75, rough: 0.62, roughHz: 44, sub: 1, chest: 0.6,
    bright: 0.28, growl: 0.5, plosive: 1 },
  // Nearly all air, barely any voice in it.
  yip: { level: 0.92, count: 4, f0: 780, drop: 0.8, gap: 0.14,
    pitchDrop: 12, dur: 0.08, breath: 1.1, formantFreq: 1300, formant2: 2900,
    distortion: 0.3, rough: 0.35, roughHz: 140, sub: 0.2, chest: 0.05,
    bright: 0.6, growl: 0, plosive: 1 },
};

// The window the coin cue's key-snapping ladder is built over (see case 'coin').
// It has to hold every pitch the cue is ever asked for, because a ladder that
// stops short does not detune the top of a run — it CLAMPS it, and a coin run
// that flattens out at the end is a worse fault than one slightly out of key.
// The two callers that push it hardest: the combo ladder, capped at 12 coins
// (1.06^12, so the upper ping reaches 2654 Hz), and the flip tally's 10-coin
// payout at 1 + 0.05n. The low end is the menus' random spread, which starts at
// 0.9. Both ends carry a little margin past that.
const COIN_LO_HZ = 840;
const COIN_HI_HZ = 3000;

const SFX_TRIM = {
  blockBreak: 0.58, coinSpray: 0.7, hit: 0.74,
  // Levelled against 'hit', its opposite number — and deliberately WELL above
  // it: the bark is the finish dog's whole threat, it is the loudest voice in
  // the last stretch by design and has to carry over the end-of-stage music,
  // and the per-firing fade in updateEntities is what brings it down as the dog
  // passes. The song is NOT ducked under it, by request — the cut-through comes
  // from the cue's own register and its formants (see dogWoof) plus this trim.
  //
  // Levelled on RMS, not peak: the cue SUSTAINS where 'hit' is a transient, so
  // the same peak would be a far bigger sound.
  //
  // 0.23, not the 1.0 it carried through the previous graph. Nothing got
  // quieter: the cue was rewritten (see dogWoof) into something far DENSER, and
  // at trim 1.0 the same four barks measured -16.5 RMS where the cue they
  // replace measured -29.8. This puts the new one on exactly that number, so
  // what changed at the finish line is the animal and not the volume.
  //
  // The crest is worth knowing, because it is where the two cues really differ:
  // matched on RMS, this peaks around -14 dBFS where the old one peaked -5.4.
  // It is a sound with its energy in the body rather than in the attack, which
  // is what a bark heard across a yard is, and it leaves 9dB more headroom for
  // the song underneath.
  dogBark: 0.23,
  // 0.25, not the 1.08 this carried, which was a trap rather than a bug: nothing calls
  // `sfx('impact')`, so the number never ran. impactCrash is reached in play only as
  // playContact's fallback — gnash and mochi have no baked contact cue — and that path
  // sets cueGain from ATTACK_MASTER_TRIM instead, landing at -11.8 dBFS peak / -33.8
  // RMS, alongside `hit`. Through the dead door it summed its three layers to +0.8
  // dBFS: clipping on its own, before any music was under it. Matched to the live
  // path so the two ways into the same cue cannot disagree.
  impact: ATTACK_MASTER_TRIM,
  contact: ATTACK_MASTER_TRIM, launch: 0.92 * ATTACK_MASTER_TRIM,
  shield: 0.78, star: 0.72, win: 0.76, power: 0.84, rewindPickup: 0.78,
  crunch: 0.84, chomp: 0.84, tag: 0.9, perfect: 0.88,
  // SCENERY, and levelled as scenery. Untrimmed the crack peaked -11.3 dBFS —
  // hotter than 'crunch', a cue the player causes — which is the wrong way
  // round for something that happens on the skyline whatever the player does.
  // 0.55 lands it at -16.5 peak / -38.9 RMS: the same peak as 'crunch' so the
  // crack still reads as an impact, and 6.6dB under it on RMS so the body of
  // the sound stays behind the song and the lane's own cues.
  barrelBurst: 0.55,
  // ONE TRIM FOR BOTH PROPS, and the 3dB between them is the cue's own doing
  // rather than a second number: the barrel's layers are longer and lower and
  // measure -7.1 dBFS peak untrimmed against the cone's -10.1. 0.45 lands them
  // at -14.0 and -17.0 — the barrel a shade over 'crunch', which is the plow
  // this replaces at the same kind of moment, and the cone level with it. That
  // ordering is the point: a barrel is the heavier thing and has to sound like
  // it, and letting the trim equalise them would have thrown away the only part
  // of the difference the player hears from across the lane.
  punt: 0.45,
  // Six noise layers plus the crash buffer sum far hotter than the two-layer
  // 'crunch' it replaces at the plow: untrimmed it peaked -6.7 dBFS, which is
  // over 'boom' and 3.5dB over 'blockBreak', and a break cue has no business
  // being the loudest thing in the game. 0.42 lands it at -9.8 peak / -30.0
  // RMS — level with 'blockBreak', 6.4dB up on 'crunch', and running 0.48s
  // where 'crunch' runs 0.11. It reads as bigger because it IS longer and
  // broader, not because it is jumping the mix.
  boxKick: 0.42,
  // A latch clack plus a bell on inharmonic partials sums hotter at the strike
  // than the clean chime this replaced; trim it back into the coin/purchase
  // family instead of letting the clang jump the mix.
  cash: 0.7,
  // A tail layer, not an event: it should colour the break, never top it.
  debris: 0.65,
  // Fireworks. These layer UNDER 'ui' and 'coin' rather than replacing them,
  // so they are the body of the sound while those two carry the tone. First
  // pass was mixed as background texture and read as too faint.
  fizzUp: 0.75, popSmall: 0.95, popBig: 0.9, crackle: 0.85,
  // The title asteroid's blast needs room for the music: heavy underneath,
  // but not a peak that dominates the menu.
  boom: 0.36,
  // Miss Chomp's coin bite. Measured against 'coin': it peaks ~5dB hotter at
  // the same nominal gain (the resonant lowpass), but the real problem was
  // sustain — it holds its peak where 'coin' is a fast-decaying blip, putting
  // it ~23dB up on total energy. Trim plus a shorter hold (see the cue) lands
  // it just under 'coin' on peak and a few dB over on energy.
  waka: 0.45,
  // Half a second of continuous swept noise carries far more energy than the
  // one-shot blips around it, and it plays UNDER the credits megamix rather than
  // over silence. Trimmed hard for both reasons: the hand-off is punctuation in
  // a crawl you are reading, and at 0.5 it was announcing itself. Note this trim
  // scales the reverb too — every layer's envelope is trimmed before it reaches
  // the send — so lowering it here quiets the room by the same amount.
  portal: 0.34,
  // Eleven pulse-wave sweeps back to back is a lot of continuous energy next to
  // the one-shot blips it follows. Trimmed into the 'lose'/'uiBad' family so it
  // lands as a punchline rather than a level jump.
  pacDeath: 0.62,
};

// The weapon cues used to ship as .wav assets fetched at runtime. They are now
// synthesised into buffers at init from src/engine/weapon-sfx.js — the same
// recipes, so the sound is unchanged, but nothing is downloaded. The hero->cue
// maps live there; audio.js only needs to know which buffers to render.

// The cues share a peak ceiling (weapon-sfx normalises each to ~0.88), but
// their timbres have different perceived loudness. These restrained trims bring
// the family together without boosting any cue above its authored level.
const WEAPON_AUDIO_GAIN = {
  // B-33P is intentionally much lower: the orb's bright upper partials read
  // louder than its waveform peak, especially on laptop and phone speakers.
  // Kiko sits between B-33P and the physical weapons. Her cues carry no
  // impulse and no highpass noise, so they read quieter than their peak the
  // way his bright orb reads louder than its own — trimmed far less than he is.
  // Clara's double pew is two bright square sweeps back to back — the same
  // bright-reads-loud physics that has B-33P trimmed hardest, twice over — so
  // she starts between him and Kiko on launch, a touch under Kiko on the
  // ricochet zing.
  contact: { b33p: 0.45, grumpos: 0.94, lorenzo: 0.95, raymn: 0.76, fernwick: 0.98, chompo: 0.9, kiko: 0.82, clara: 0.78 },
  launch: { b33p: 0.42, raymn: 0.95, grumpos: 0.82, kiko: 0.78, clara: 0.62 },
};

// Timbres for the 'debris' cue — what the chunks sound like hitting the floor.
// Exported so the obstacle table's `mat` values can be checked against it.
export const DEBRIS_MATS = {
  wood:  { type: 'bandpass', freq: 1100, gain: 0.10, ticks: 4, dur: 0.045 },
  stone: { type: 'bandpass', freq: 2300, gain: 0.09, ticks: 4, dur: 0.03 },
  metal: { type: 'highpass', freq: 3800, gain: 0.07, ticks: 3, dur: 0.035, ping: [1860, 2490] },
  soft:  { type: 'lowpass',  freq: 520,  gain: 0.11, ticks: 3, dur: 0.06 },
  // The !-box: a light tinkle that sits *under* the coinSpray already firing
  // over it, rather than competing with it for the same ear.
  gold:  { type: 'highpass', freq: 5200, gain: 0.05, ticks: 3, dur: 0.025, ping: [2637, 3136] },
};

/**
 * A fresh set of scheduler-work counters. See `_schedWork` and `takeSchedulerWork()`.
 *
 * `ticks`/`fineTicks` size everything else: a rate per tick is comparable between two
 * songs at different tempos and two runs of different lengths, where a total is not.
 *
 * The `preamble*` counters are the ones a lane-level optimisation cannot reach. Every
 * pass through scheduleStep resolves the bar before it looks at a single lane —
 * merging the section over the bank, copying it again to transpose, copying it a third
 * time to drop silenced lanes, walking the frozen lanes — and all of that is paid on
 * ordinary 16-step songs too. Counting them separately is what tells you whether the
 * win is in skipping lanes or in not rebuilding the bar.
 */
function newSchedulerWork() {
  return {
    ticks: 0,            // scheduleStep passes
    fineTicks: 0,        // ...of which landed on a half step (32-step resolution only)
    laneReads: 0,        // sequenceValue() calls through rawAt
    fineLaneReads: 0,    // ...of which happened on a fractional tick
    notePlans: 0,        // planFor() misses — a resolveNoteFx + possible noteFx.process
    fineNotePlans: 0,    // ...of which happened on a fractional tick
    preambleMerges: 0,   // section merged over the bank: one spread of a whole bank
    preambleTransposes: 0, // transpose copy: a spread plus a map over each shifted lane
    preambleSilentSweeps: 0, // laneSilent() sweep over every lane and layer, plus a spread
    preambleFrozenWalks: 0,  // _scheduleFrozenLane + _frozenLaneCovers, per frozen lane
    // NOTES, not ticks — and this is the counter that keeps the others honest. Lane
    // resolution is per tick and bounded by the lane count; building a voice is per
    // NOTE and unbounded by anything except how busy the song is, and it is the far
    // larger main-thread cost on a dense bar. A profile that counted only the cheap
    // half would flatter any optimisation aimed at it.
    voiceCalls: 0,        // playVoice() reached, a preset lane with something to play
    voicePlays: 0,        // ...and handed to the rack: a note actually built
  };
}

class AudioSys {
  constructor() {
    this.ctx = null;
    this.offline = false;  // true when driven by an OfflineAudioContext (render tools)
    this.noiseSeed = null; // set for offline renders; null = Math.random()
    // Shared delay, as it has always been tuned: dotted eighth, 0.35 feedback,
    // 2800Hz damping. How MUCH of a channel reaches it is the channel's send and
    // nothing else — see the echo bus in ensure().
    // Loop region, in absolute 16th-steps. null = play the whole song form.
    // The edit-recovery debounce. Built once and kept: it holds the accumulating set of
    // edited voices between a drag's many refreshes.
    this._editRecovery = makeEditRecovery({
      fire: (ids) => this._runEditRecovery(ids, this._editRecoveryAt || {}),
    });
    this._editRecoveryAt = null;
    this.loopStart = null;
    this.loopEnd = null;
    this.pendingLoop = null;
    this.pendingStep = null;
    // A locator loop can be armed while the transport is still playing the intro.
    // Keep songBeat() on that intro until the scheduler has actually wrapped once.
    this.loopHasWrapped = false;
    // Whether the armed region is the SONG's own — its `arrangement.loop` — rather
    // than a locator range or a cabinet treatment's. What is armed looks identical
    // either way, and the difference decides who is allowed to re-arm it: a bar edit
    // must refresh the song's loop and must not touch a range somebody selected.
    this.formLoopArmed = false;
    this.delayDivision = 0.75;
    this.delayFeedback = 0.35;
    this.delayTone = 2800;
    this.master = null; this.sfxGain = null; this.musicGain = null;
    // Built on the first portal cue and never rebuilt — see portalVerbSend().
    this.portalSend = null; this.portalVerb = null;
    // Built on the first note a lane with a Tone voice plays, and only then — see
    // playVoice. A game whose songs name no voices never constructs one.
    this.voices = null;
    // Which layers of which MRDR-3 preset are soloed on the desk — `voiceId → Set`.
    //
    // It lives HERE rather than on the rack because the rack does not survive: it is
    // disposed with the context and rebuilt on demand, and solo held there would quietly
    // empty itself while the desk still showed lit buttons. This object outlives every
    // rack, and each new rack is handed a reference to it.
    //
    // Monitoring only. It is not part of any preset, so nothing here is ever saved to the
    // library, written into a song, or seen by the offline measurement — which builds its
    // own AudioSys-less rack. See VoiceRack.soloLayers.
    this.soloLayers = new Map();
    // One pair of gain nodes per lane, standing between everything a song schedules
    // and the channel strip it plays through — see _laneGate. They exist so a song
    // can be STOPPED rather than merely muted: a source node is fire-and-forget once
    // it is started, so the only handle on a note that is still ringing is the node
    // it is connected to. Cleared and re-made per song by setBank.
    this._laneGates = new Map();
    // The per-bar gain trims, `${lane}|${dB}` → a gain pair feeding that lane's gate.
    // Same lifetime as the gates they hang off, for the same reason: they belong to
    // this context, and a voice pool wired to one must keep finding the same node.
    this._barGainBuses = new Map();
    // The per-bar pan offsets, lane → the offset currently written on that channel's
    // pot, in -1..1. A map of what has been SENT rather than of nodes: pan cannot be
    // hung off a bus of its own (see mixer.setPanOffset), so the arrangement writes the
    // channel's own panner and this is what keeps it from writing it every sixteenth.
    // A lane absent from here has never been touched, which is what lets a song with no
    // pan edits leave every strip exactly as the mix left it.
    this._barPans = new Map();
    // Preset-bench notes get their own gates so changing an audition never cuts a
    // song lane. They belong to this context just like the song gates do.
    this._benchGates = new Map();
    // Optional destination used by session-only audition surfaces (the standalone
    // MRDR-3 playground). Song lanes never set this, so the ordinary bench path keeps
    // its music/echo buses and the mixer remains untouched.
    this._previewOutput = null;
    this.songTrim = null;
    this.musicTrim = 1;
    this.pendingStartDelay = 0;
    // Storage/scheduling resolution is a property of the current bank and Note FX,
    // not of one sequencer tick. Recomputed only when either changes; the old path
    // walked every lane and every arranged bar up to twice per sixteenth.
    this.transportResolution = 16;
    // Which bars genuinely need the half tick, and which lanes must keep their Note FX
    // state ticking on the half steps of the bars that do not. `null` means every bar
    // needs it — the safe answer, and the one a song with no bank yet must start from.
    // Rebuilt beside `transportResolution`; see refreshTransportResolution.
    this._fineBars = null;
    this._fineTickLanes = [];
    this._fineLanes = null;
    // The half-step skips, switchable at runtime so the A/B that proves them is a
    // toggle rather than a rebuild — the same discipline `setSilentLaneSkip` follows,
    // except that this one defaults ON because it is not a trade: a lane it skips is a
    // lane `sequenceValue` was going to return null for. Off is for proving that.
    this.fineLaneSkip = true;
    this.songAnalyser = null;
    // Browserless/headless fallback buffers keep the public shape stable even
    // when Web Audio is unavailable; a live analyser replaces them at ensure().
    this._analysisSpectrum = new Uint8Array(128);
    this._analysisWaveform = new Uint8Array(256);
    this._analysis = {
      spectrum: this._analysisSpectrum,
      waveform: this._analysisWaveform,
      bass: 0,
      mid: 0,
      treble: 0,
      // Broadband loudness of the mix right now, and that loudness measured
      // against how loud this song has recently been. See musicAnalysis().
      level: 0,
      dynamics: 1,
      beat: null,
      beatPhase: 0,
      beatPulse: 0,
      // How much kit is under the music. Counted off the sequencer rather than
      // sniffed out of the spectrum — see scheduleStep's percussion tally.
      drums: 0,
      drumless: false,
      // A single kit ONSET, spiking to 1 on the frame a hit is actually heard.
      // `drums` is a four-beat density and `beatPulse` is a procedural ramp that
      // ticks whether or not anything played it; neither can tell a preset "a
      // drum just landed, now". This can, exactly, because the sequencer knows.
      hit: 0,
    };
    // Rolling loudness reference for `dynamics`, reset per song by setBank().
    this._analysisPeak = 0;
    // The audio-clock stamp of the last full readout — see musicAnalysis.
    this._analysisAt = null;
    // Percussion hits scheduleStep() has queued into the lookahead but that have
    // not sounded yet, and the audio times of the ones that have. Also per song.
    this._percPending = [];
    this._percHeard = [];
    // The player's own setting, saved and restored. `sessionMuted` is the other
    // kind of silence: a diagnostic switch that belongs to THIS BOOT and must
    // never reach the save. `?mute` used to write `save.settings.muted`, so one
    // verification run left the game muted for good — the setting said the player
    // had asked for silence, and nothing remembered that a URL had.
    this.muted = false;
    this.sessionMuted = false;
    this.levels = { master: 1, music: 0.7, sfx: 0.9 };
    this.cueGain = 1;
    this.noiseBuf = null;
    this.contactBuffers = {};
    this.launchBuffers = {};
    // sequencer
    this.bpm = 112;
    this.swing = 0;        // 0 or 50 = straight; see the swing term in scheduleStep
    // A groove change waiting for a bar line, and the ramp into it. See setSwing.
    this.pendingSwing = null;
    this.noteFx = createNoteFxProcessor();
    // Session-only rendered lanes. PCM is supplied by the Song Mixer and deliberately
    // never stored in song data or used by game playback in a fresh tab.
    this.frozenLanes = new Map();
    this.step = 0;
    // Session-only Mixer audition. The recipe changes which SOURCE step is read;
    // `step` remains the continuous OUTPUT clock so swing, effects, and transport
    // timing do not restart at every collage cut.
    this.rearrangement = null;
    // Whether a finished recipe starts again. The desk owns the decision; the scheduler
    // only reports the boundary, because stopping the transport from inside the
    // scheduling loop would cut the bar it is in the middle of writing.
    this.rearrangeLoop = true;
    this._rearrangeSourceBar = null;
    // One resolved output bar, for song-groove drums. See `_rearrangeOutputBank`.
    this._rearrangeOutputBar = null;
    // A recipe waiting for the next output bar line. Editing the collage while it
    // plays installs here rather than into `rearrangement`, so the bar you are
    // hearing finishes as the bar you were promised. See `queueRearrangement`.
    this.pendingRearrangement = null;
    this._rearrangeListeners = [];
    // Short, session-only count-in clicks used by Mixer Rearrange starts. They live
    // on the SFX bus rather than the song trim, so the four beats remain audible while
    // the new song is held back at its exact output downbeat.
    this._countInSources = [];
    this.nextTime = 0;
    // A discontinuous seek has a different visual clock from ordinary playback. The
    // scheduler can switch `step` to the destination before that destination reaches the
    // speakers, so the desk consumes this one-shot marker to hold its line until the
    // exact first-note time. Continuous playback still uses songBeat() unchanged.
    this._visualSeek = null;
    this.timer = null;
    // Foreground scheduler safety margin. The game leaves this at the responsive
    // quarter-second default; the Mixer may widen it while a user is willing to
    // trade edit/seek latency for more room around a busy main thread.
    this.sequencerLookahead = SEQUENCER_LOOKAHEAD;
    // Scheduler starvation telemetry — see schedule() and takeSchedulerHealth().
    this._schedMarginMin = Infinity;
    this._schedLate = 0;
    // Scheduler WORK telemetry — a different question from starvation, and the one
    // an optimisation is judged by: not "did the queue run dry" but "how much did
    // each pass cost, and how much of it was spent on ticks that carried nothing".
    //
    // Counted rather than timed. Wall time on a laptop carries thermal drift worth
    // more than the effect being measured (see work/local/bench-song-cost.js on why
    // that bench is best-of-three); an operation count is exact and reproducible, so
    // "this change removed 40% of the fractional-tick lane resolutions" is a fact
    // rather than a run. A dozen integer increments against eight to sixteen ticks a
    // second is not a cost worth a flag — see takeSchedulerWork().
    this._schedWork = newSchedulerWork();
    this.bank = null;      // current pattern bank
    this.tempo = 1;        // song speed multiplier (slow-mo drags it down)
    this.detune = 1;       // song pitch multiplier
    this.starMode = false; // invincibility layer on/off
    this.starRoot = 110;   // last bass note the song played (arpeggio follows it)
    this.beatListeners = [];
    // Exact sequencer loop boundaries, including the audio time at which the next
    // pass will be heard. The Mixer uses this for per-lap diagnostics; an empty list
    // costs the game nothing beyond the existing wrap branch.
    this.loopListeners = [];
    this.songTime = 0;
    this.lifecyclePaused = false;
    // Reversed-audio capture: a ring buffer tapped off the master output
    // so we can play it backwards during rewind.
    this._capBuf = null;     // Float32Array ring buffer (~4s)
    this._capPos = 0;        // write cursor
    this._capNode = null;    // ScriptProcessorNode
    this._capGain = null;    // zero-gain sink
    this.captureEnabled = true;
    // Null means "whatever the browser does by default", which is the smallest buffer
    // it can manage. Only a caller that knows it would rather have slack than speed
    // says otherwise — see setLatencyHint.
    this.latencyHint = null;
    // Like latencyHint: a construction argument only a caller with a reason sets.
    // The desk asks for 44100 so what it monitors is rendered at the rate its
    // bounces are — and a twenty-lane graph costs ~8% less than at 48k for free.
    this.sampleRateHint = null;
    // Play pooled Tone voices from rendered notes where that is safe — see
    // setNoteCache and the cache itself in voices.js. Desk-only, off by default.
    this.noteCache = false;
    this.noteCacheState = null;
    this.noteCachePreparationHeld = false;
    // Live-only MRDR tail reclaim is measured and opt-in. Offline and game racks keep
    // the exact authored tail unless the Song Mixer explicitly enables this switch.
    this.mrdrTailCulling = false;
    // MRDR-3's realtime quality. Full is the authored sound and the only thing the game
    // or an offline bounce ever sees; the Song Mixer is the one caller that turns it
    // down, and it survives a rack rebuild the same way the switch above does.
    this.mrdrQuality = MRDR_QUALITY.FULL;
    // Skip building notes for lanes the mix has silenced — muted, or losing a
    // channel solo. OFF by default and never set by the game: a cabinet treatment
    // may ramp a lane the mix keeps muted back up at an audio time, and a skipped
    // note cannot be un-skipped. The desk opts in (see setSilentLaneSkip): there a
    // mute is a mix state and a solo is the person listening, both readable per
    // step, and the notes a muted lane would have built reach no output at all.
    this.silentLaneSkip = false;
    this._revTimer = null;   // interval for reverse-chunk scheduling
    this._revSources = [];   // active reversed BufferSources
    // A mixer panic is a momentary emergency cut, not a saved mute. The next
    // deliberate play/preview/SFX action opens the buses again.
    this.panicked = false;
    // Furthest audio time through which the realtime scheduler has concrete evidence
    // that musical output should exist. The Mixer watchdog uses this to distinguish a
    // genuinely dead zero-in/zero-out graph from a written rest. It is deliberately
    // short and renewed by each sounding lane: three seconds of strikes therefore
    // needs a dense passage that keeps scheduling notes, not one old attack whose tail
    // may quite correctly have decayed to silence.
    this.outputExpectedUntil = 0;
    this._contextRestarting = false;
  }

  // THE TRANSPORT CLOCK, and why it is a counter rather than a number.
  //
  // `step` is the song position in SIXTEENTHS, fractional, and that is the unit the
  // whole program reads: `% 16` is the bar line, `% 4` the beat, `Number.isInteger`
  // the on-grid test, and the desk, the visualisers and the MIDI export all count in
  // it. None of that changes here.
  //
  // What changes is that it is now DERIVED from an integer tick counter instead of
  // accumulated. `step += tick` is exact while the tick is 1 or 0.5 and stops being
  // exact the moment it is a third: 1/3 has no float representation, so three of them
  // do not add to 1, and every `% 16` and `Number.isInteger` downstream fails a little
  // more each bar. Dividing does not have that problem — `1/3` is inexact but `3/3` is
  // exactly 1 — so counting whole ticks and dividing on read is exact on every step,
  // beat and bar line at any resolution, which is what makes a triplet grid possible.
  //
  // An accessor rather than a method because `Audio.step = 0` is written from outside
  // the engine — tools/lib/render-bank-page.js and the desk's transport both seek that
  // way — and those call sites are correct as they stand.
  //
  // The `|| 16` is the same default the field itself carries: reading a position off a
  // half-built transport should give the sixteenth grid, not NaN. Worth having because
  // NaN here does not throw — it propagates silently into every `% 16` downstream and
  // the song simply stops, which is the hardest kind of failure to trace back.
  get step() { return this._tick * 16 / (this.transportResolution || 16); }

  set step(v) { this._tick = Math.round(v * (this.transportResolution || 16) / 16); }

  // `ctxOverride` lets the offline render tools hand in an OfflineAudioContext so
  // WAVs, stems and videos are produced by THIS engine rather than a reimplementation
  // of it (see tools/lib/render-bank-browser.js). An offline context has no running
  // clock and no speakers, so the realtime-only machinery — the lookahead interval
  // and the rewind capture recorder — stays off; the caller drives scheduleStep()
  // itself and calls startRendering().
  ensure(ctxOverride = null) {
    if (this.ctx) {
      if (!this.lifecyclePaused && this.ctx.state !== 'running') this.resumeContext();
      return;
    }
    if (ctxOverride) {
      this.ctx = ctxOverride;
      this.offline = true;
    } else {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      // How much audio the browser buffers before it has to be right again.
      //
      // The default is `interactive`, which asks for the SMALLEST buffer the device
      // will give — a few milliseconds — and that is the correct answer for the game,
      // where a jump sound arriving late is a jump sound that feels wrong. It is the
      // worst possible answer for a mixing desk. A small buffer means the audio thread
      // must be serviced every few milliseconds or the output underruns, and a desk
      // spends its life next to things that stop that happening: a twenty-lane section
      // costing most of a core, and a window sitting in the background while its owner
      // works in another app, where the whole process is demoted and the audio thread
      // is handed a fraction of the machine it needs.
      //
      // So the caller says. The game keeps the default and nothing about it changes;
      // the desk asks for `playback` and trades key-to-sound latency it can afford for
      // an output that survives a busy moment — see setLatencyHint.
      const opts = {};
      if (this.latencyHint) opts.latencyHint = this.latencyHint;
      if (this.sampleRateHint) opts.sampleRate = this.sampleRateHint;
      // Both options are REQUESTS, and a browser is entitled to refuse either — a
      // device that cannot run at 44100 throws on construction rather than choosing
      // its own rate. A desk with no audio at all is a far worse answer than a desk
      // at the wrong sample rate, so a refusal falls back to the plain constructor
      // and says so. What actually happened is logged either way: the rate the graph
      // runs at is `ctx.sampleRate` and nothing downstream may assume the hint won
      // (every Nyquist clamp in the engine already reads the context, not the hint).
      try {
        this.ctx = Object.keys(opts).length ? new AC(opts) : new AC();
      } catch (e) {
        console.warn('[audio] context options refused', opts, '—', e?.message,
          '; falling back to the browser default');
        this.ctx = new AC();
      }
      if (this.sampleRateHint && this.ctx.sampleRate !== this.sampleRateHint) {
        console.warn(`[audio] asked for ${this.sampleRateHint}Hz, got ${this.ctx.sampleRate}Hz`);
      }
    }
    // Some engines create a suspended context even when autoplay is allowed,
    // and require an explicit resume request. Try immediately; browsers with
    // a gesture requirement reject/hold it harmlessly, then the existing
    // gesture path calls ensure() again and resumes for real.
    if (!this.offline && !this.lifecyclePaused && this.ctx.state === 'suspended') {
      const resumed = this.ctx.resume();
      if (resumed && typeof resumed.catch === 'function') resumed.catch(() => {});
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = this.silent ? 0 : this.levels.master;
    this.master.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = this.levels.sfx; this.sfxGain.connect(this.master);
    this.portalSend = null; this.portalVerb = null;   // belong to the old ctx
    this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = this.levels.music; this.musicGain.connect(this.master);
    // The song proper rides on musicBus; the invincibility arpeggio rides on
    // starBus. Two buses so the theme can duck under the star layer without
    // the star layer ducking itself. Both feed musicGain (and so the echo).
    this.songTrim = this.ctx.createGain();
    this.songTrim.gain.value = this.bank ? 0.0001 : 0;
    // The analyser sits on the song lane, before the user music fader, so it
    // hears the procedural song (including its echo) but none of the UI/SFX
    // bus. Keeping it pre-fader also means a muted jukebox can still animate
    // its screensaver rather than freezing on a black frame.
    // The visualisers' analyser, and it sits IN the music path rather than tapping it —
    // songTrim -> songAnalyser -> musicGain, so every sample of every song goes through
    // it. Live that is what the toasters and the spectrum bars are made of.
    //
    // Offline it is dead weight: nothing calls musicAnalysis() during a render, and the
    // video renderer builds its own analysis from the finished PCM (tools/render-video.js
    // via lib/song-analysis.js) precisely so a bounce does not have to be watched to be
    // analysed. An AnalyserNode still does its per-block work whether or not anyone reads
    // it, so offline the song goes straight to the bus instead. See the same reasoning
    // applied to the mixer's meters in createMixer.
    if (this.ctx.createAnalyser && !this.offline) {
      this.songAnalyser = this.ctx.createAnalyser();
      this.songAnalyser.fftSize = 256;
      this.songAnalyser.smoothingTimeConstant = 0.72;
      this._analysisSpectrum = new Uint8Array(this.songAnalyser.frequencyBinCount);
      this._analysisWaveform = new Uint8Array(this.songAnalyser.fftSize);
      this.songTrim.connect(this.songAnalyser);
      this.songAnalyser.connect(this.musicGain);
      this._analysis.spectrum = this._analysisSpectrum;
      this._analysis.waveform = this._analysisWaveform;
    } else {
      this.songTrim.connect(this.musicGain);
    }
    if (this.bank) this.songTrim.gain.setTargetAtTime(this.musicTrim, this.ctx.currentTime + 0.5, 0.01);
    this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = 1; this.musicBus.connect(this.songTrim);
    // Lane gates belong to the context that made them; a rebuilt graph starts with none.
    this._laneGates.clear();
    this._barGainBuses.clear();
    this._benchGates.clear();
    this._previewOutput = null;
    this.starBus = this.ctx.createGain(); this.starBus.gain.value = 0; this.starBus.connect(this.musicGain);
    // YMCK-style space: tempo-synced dotted-eighth echo. echoBus is a parallel
    // wet send, and every channel reaches it through its own DELAY send on the
    // mixer — nothing else decides how much goes.
    //
    // It used to be scaled here, twice over: the bus sat at 0.28 and every
    // scheduled step re-aimed it at the playing section's `echoLevel`. That made a
    // channel's send a RELATIVE control over a number the desk never showed — a
    // section saying `echoLevel: 0` swallowed the send whole, and the same send
    // was worth 4x more in one section of a song than another. Measured on
    // plumber: kick at DELAY SEND 2.00 rendered 3.9e-8 through its opening section
    // and 3.3e-3 through its last. So the bus is unity and the send is the whole
    // truth: full send on the kick is full send on the lead, in every bar.
    //
    // The highpass below stays. It is not a level control — it keeps stray low end
    // out of the repeats so the echo does not muddy the mix.
    //
    // Gain staging: the send used to tap musicGain (post-fader), so echo was
    // implicitly scaled by the music volume. echoBus taps the lane gains
    // pre-fader instead, so the return runs back through musicGain rather
    // than straight to master — same net level as before, and the echo still
    // follows the music volume setting. (No cycle: musicGain doesn't feed
    // echoBus.)
    this.echoBus = this.ctx.createGain(); this.echoBus.gain.value = 1;
    this.echoSend = this.ctx.createGain(); this.echoSend.gain.value = 1;
    this.echoHp = this.ctx.createBiquadFilter(); this.echoHp.type = 'highpass'; this.echoHp.frequency.value = 500;
    // One second, and deliberately not more — see growDelayLine, which is where a
    // longer division gets the buffer it needs.
    this.delay = this.ctx.createDelay(1.0); this.delay.delayTime.value = 0.32;
    this.delayLp = this.ctx.createBiquadFilter(); this.delayLp.type = 'lowpass'; this.delayLp.frequency.value = 4500;
    this.delayFb = this.ctx.createGain(); this.delayFb.gain.value = 0.35;
    this.echoBus.connect(this.echoSend);
    this.echoSend.connect(this.echoHp);
    this.echoHp.connect(this.delay);
    this.delay.connect(this.delayLp);
    this.delayLp.connect(this.delayFb);
    this.delayFb.connect(this.delay);
    this.delayLp.connect(this.songTrim);
    // Per-lane channel strips. The mixer owns the song-side master chain, so pass it
    // the music bus and return that chain into the shared global master. SFX stays
    // directly on the global master; a song's -19dB title trim must not attenuate UI
    // cues or tutorial feedback.
    this.mixer = createMixer(this.ctx, {
      musicBus: this.musicBus, echoBus: this.echoBus,
      master: this.musicGain, destination: this.master,
      // The original echo's return leg: the mixer splices its EQ and level in
      // between these two, so Delay 1 gets the same controls as the new auxes.
      songTrim: this.songTrim, delayLp: this.delayLp,
    });
    // Offline renders seed the noise so a lane rendered on its own gets exactly the
    // noise it had inside the full mix — that is what lets stems sum back to the
    // mix. Live playback keeps Math.random(): a fresh noise floor every session is
    // free variety, and nothing downstream depends on it repeating.
    const rnd = this._noiseRandom();
    const len = Math.floor(this.ctx.sampleRate * 0.5);
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = rnd() * 2 - 1;
    // Crashes outlast the 0.5s one-shot buffer, and looping it drops a seam
    // partway through the hit — an audible bump at a fixed 0.5s offset that
    // has nothing to do with the tempo, so it reads as out of time. A longer
    // dedicated buffer lets a crash play straight through, seam-free.
    const clen = Math.floor(this.ctx.sampleRate * 2.5);
    this.crashBuf = this.ctx.createBuffer(1, clen, this.ctx.sampleRate);
    const cd = this.crashBuf.getChannelData(0);
    for (let i = 0; i < clen; i++) cd[i] = rnd() * 2 - 1;
    this.renderWeaponBuffers();
    if (this.offline) return; // the caller drives scheduleStep() and startRendering()
    this.startSequencer();
    if (this.captureEnabled) this._startCapture();
    // Separate output for reversed audio — bypasses the capture node to
    // prevent a feedback loop (reversed audio → capture → reversed again).
    this._rewindOut = this.ctx.createGain();
    this._rewindOut.gain.value = this.levels.master;
    this._rewindOut.connect(this.ctx.destination);
    if (this.lifecyclePaused && this.ctx.state === 'running') this.suspendContext();
  }

  // Deterministic noise for offline renders. Call before ensure() — the buffers are
  // filled once there and never refilled.
  setNoiseSeed(seed) { this.noiseSeed = seed; }

  /**
   * Loop a step range instead of the whole song form. Wrapping happens inside
   * scheduleStep, at the point the step counter advances, so the loop is seamless
   * rather than a jump applied a frame late from the UI.
   * Pass no arguments to clear it.
   */
  setLoop(startStep = null, endStep = null, { jump = true } = {}) {
    this.pendingLoop = null;
    this.pendingStep = null;
    // Whatever is armed after this call, it is not the song's own markers unless
    // armLoop says so — it is the only thing that sets the flag.
    this.formLoopArmed = false;
    if (startStep == null || endStep == null || endStep <= startStep) {
      this.loopStart = this.loopEnd = null;
      this.loopHasWrapped = false;
      return;
    }
    this.loopStart = Math.max(0, Math.floor(startStep));
    this.loopEnd = Math.floor(endStep);
    this.loopHasWrapped = false;
    // Drop straight into the region if the playhead is outside it, so arming a loop
    // takes effect on this pass rather than after the song wanders back round.
    //
    // `jump: false` is how a song keeps an intro: the region is armed while the
    // playhead is still short of it, the bars before it play once on the way in, and
    // the wrap at the end of scheduleStep does the rest. Everything that arms a loop
    // from the UI wants the jump; everything that arms a song's own markers does not.
    if (jump && (this.step < this.loopStart || this.step >= this.loopEnd)) {
      this.step = this.loopStart;
      this.noteFx.reset();
    }
  }

  /** Install/remove the Mixer-only temporary source-range playlist, at once. */
  setRearrangement(recipe = null) {
    this.rearrangement = recipe || null;
    this._rearrangeSourceBar = null;
    this._rearrangeOutputBar = null;
    this.pendingRearrangement = null;
  }

  /**
   * Install a recipe at the next OUTPUT bar line instead of immediately.
   *
   * The desk's edits — Generate, a drum mode, a slice transform — arrive while the
   * collage is playing, and stopping to install them costs the count-in, the note
   * cache's warmth and the listener's place in the song. Nobody auditions an
   * arrangement by restarting it after every change. So the new recipe waits at the
   * bar line: the bar being heard finishes as the bar it was promised to be, and the
   * next one is the new arrangement.
   *
   * Queueing again before the boundary REPLACES what is waiting rather than stacking
   * behind it, so a flurry of edits collapses into one install of the latest draft.
   * That is not a compromise — the desk's draft is already cumulative, and the recipe
   * handed here is always the whole of it.
   *
   * Returns 'installed' when it took effect at once (nothing was playing, or the
   * source length changed so the output wrap has to be rebuilt anyway) and 'queued'
   * when it is waiting, so the caller can say which happened.
   */
  queueRearrangement(recipe = null) {
    const swappable = recipe && this.rearrangement && this.timer && this.bank
      // A recipe for a different SOURCE cannot be swapped mid-flight. Output length is
      // deliberately allowed to change: the mapping wraps at the new recipe length on
      // the next bar, while the source address space remains safe.
      && recipe.source?.steps === this.rearrangement.source?.steps;
    if (!swappable) {
      this.setRearrangement(recipe);
      return 'installed';
    }
    this.pendingRearrangement = {
      recipe,
      boundary: this.step % 16 === 0 ? this.step : (Math.floor(this.step / 16) + 1) * 16,
    };
    return 'queued';
  }

  /** Swap in a queued recipe once the transport reaches its bar line. */
  applyPendingRearrangement() {
    if (!this.pendingRearrangement || this.step < this.pendingRearrangement.boundary) return false;
    const recipe = this.pendingRearrangement.recipe;
    const at = this.step;
    this.setRearrangement(recipe);
    for (const fn of this._rearrangeListeners) {
      // A desk listener repainting a panel must never be able to stop the scheduler.
      try { fn(recipe, at); } catch { /* the audio keeps its own promises */ }
    }
    return true;
  }

  /**
   * Announce a queued recipe actually reaching the audio, with its output step.
   *
   * The desk flashes pending slices until this fires. That flash has to track the
   * real hand-off rather than a guess at it: with a wide sequencer read-ahead the
   * "next bar" can genuinely be the bar after next, and a panel that cleared itself
   * on a timer would be lying about what is being heard.
   */
  onRearrangementInstalled(fn) {
    if (typeof fn !== 'function') return () => {};
    this._rearrangeListeners.push(fn);
    return () => {
      const i = this._rearrangeListeners.indexOf(fn);
      if (i >= 0) this._rearrangeListeners.splice(i, 1);
    };
  }

  _clearCountIn() {
    const sources = this._countInSources.splice(0);
    const now = this.ctx?.currentTime ?? 0;
    for (const source of sources) {
      try { source.stop(now + 0.005); } catch { /* already stopped */ }
    }
  }

  _scheduleCountIn(beats, startTime, bpm) {
    this._clearCountIn();
    if (!this.ctx || !this.sfxGain || !Number.isInteger(beats) || beats <= 0
      || !Number.isFinite(startTime) || !Number.isFinite(bpm) || bpm <= 0) return;
    const beatSeconds = 60 / bpm;
    for (let index = 0; index < beats; index++) {
      const when = startTime + index * beatSeconds;
      // One accented click, then the rest identical: "ONE two three four". The old
      // shape also lifted the LAST beat, which read as a pickup into nothing — the
      // count must land on the downbeat, not point at itself.
      const accent = index === 0;
      const oscillator = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(accent ? 1180 : 860, when);
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime((accent ? 0.13 : 0.085) * this.cueGain, when + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.075);
      gain.gain.linearRampToValueAtTime(0, when + 0.095);
      oscillator.connect(gain); gain.connect(this.sfxGain);
      oscillator.start(when);
      oscillator.stop(when + 0.1);
      this._countInSources.push(oscillator);
    }
  }

  /** Map an output transport step to the source step currently being heard. */
  rearrangementPosition(step = this.step) {
    if (!this.rearrangement) return null;
    return resolveRearrangementPosition(this.rearrangement, step);
  }

  /**
   * The bank a Rearrange OUTPUT bar plays, for song-groove percussion.
   *
   * The same merge `scheduleStep` performs for the source bar — the bar's section over
   * the bank, then its mute/delete mask nulled out — done again for the output clock,
   * because in this mode the drums are somewhere else in the song from everything
   * above them.
   *
   * Memoised on the bar object: `barPlan` hands back the same objects for a bank until
   * the arrangement is edited (which replaces the plan), and `setBank` replaces the
   * bank, so identity on both is the whole invalidation. That turns sixteen merges a
   * bar into one, which is what keeps this out of the scheduler's measured hot path.
   * Percussion is never transposed, so the per-bar transpose pass has nothing to add.
   */
  _rearrangeOutputBank(bar) {
    const cached = this._rearrangeOutputBar;
    if (cached && cached.bar === bar && cached.bank === this.bank) return cached.b;
    let b = this.bank;
    if (b?.sections?.length && bar.sec != null) {
      const sec = resolveSection(b, bar.sec % b.sections.length);
      if (sec) b = { ...this.bank, ...sec };
    }
    if (bar.off || bar.delete) {
      b = { ...b };
      for (const k of [...(bar.off || []), ...(bar.delete || [])]) b[k] = null;
    }
    this._rearrangeOutputBar = { bar, bank: this.bank, b };
    return b;
  }

  /**
   * The slot in an output bar's bank that song-groove percussion reads at `this.step`.
   *
   * Deliberately the same shape as the source `s` in `scheduleStep` — sixteenth within
   * the bar, doubled at 32 resolution, offset by which half of its section the bar is —
   * because it answers the same question about a different clock. A method rather than
   * an expression so the formula is reachable from a test without an AudioContext; it
   * runs once per tick, and only while song-groove drums are on.
   */
  _rearrangeOutputSlot(bar, resolution = this.transportResolution) {
    return Math.round((this.step % 16) * resolution / 16) + bar.half * resolution;
  }

  /**
   * How late this tick's notes are played, in seconds — the whole of swing.
   *
   * A method for the same reason `_rearrangeOutputSlot` is one: the formula is the
   * musical claim, and it should be reachable from a test without an AudioContext.
   * See the long note at the call site in `scheduleStep` for what it means and why a
   * triplet is not part of it.
   */
  _swingOffset(spb) {
    if (!this.swing) return 0;
    const halves = this.step * 2;
    if (!Number.isInteger(halves)) return 0;
    const delay = spb * (this.swing - 50) / 50;
    const phase = ((halves % 4) + 4) % 4;
    return phase === 2 ? delay : phase % 2 ? delay / 2 : 0;
  }

  /** Install/remove one session-only raw lane render. */
  setFrozenLane(key, spec = null) {
    if (!key) return false;
    if (!spec) { this.frozenLanes.delete(key); return true; }
    this.ensure();
    if (!this.ctx) return false;
    const source = Array.isArray(spec.segments) ? spec.segments : [spec];
    const segments = [];
    for (const item of source) {
      const left = item.left, right = item.right || left;
      if (!left?.length || right.length !== left.length) return false;
      const buffer = this.ctx.createBuffer(2, left.length, item.sampleRate || this.ctx.sampleRate);
      buffer.getChannelData(0).set(left);
      buffer.getChannelData(1).set(right);
      segments.push({ ...item, left: undefined, right: undefined, buffer, lastStep: null });
    }
    this.frozenLanes.set(key, { ...spec, left: undefined, right: undefined, segments });
    return true;
  }

  clearFrozenLanes() { this.frozenLanes.clear(); }

  _frozenLaneCovers(key, step, formSteps) {
    const state = this.frozenLanes.get(key);
    if (!state) return false;
    const local = ((step % formSteps) + formSteps) % formSteps;
    return state.segments.some((segment) => {
      const from = Number.isFinite(segment.coverageStartStep) ? segment.coverageStartStep : 0;
      const to = Number.isFinite(segment.coverageEndStep) ? segment.coverageEndStep : formSteps;
      return local >= from && local < to;
    });
  }

  _scheduleFrozenSegment(key, state, step, when, spb, formSteps) {
    const strip = this.mixer?.lane(key);
    if (!strip?.frozen || !state?.buffer) return;
    // The TRANSPORT's tick, not the bank's. `step` is `this.step`, which advances by
    // whatever `transportResolution` says — and that is promoted to 32 by a single 1/32
    // arp anywhere in the song, without the bank's own `resolution` changing at all.
    // Reading the bank here meant the two disagreed on exactly those songs: the step
    // moved by 0.5, this expected 1, every call looked like a discontinuity, and every
    // call launched another BufferSource covering the rest of the bar. They all play the
    // same song position at the same audio time, so they sum coherently — a whole-track
    // freeze came back thirty-two times over, at thirty-two times the cost.
    // See work/local/frozen-tick-probe.js, which drives this method and counts them.
    const tick = 16 / this.transportResolution;
    const discontinuity = state.lastStep == null || Math.abs(step - state.lastStep - tick) > 1e-7;
    const boundary = Math.abs(step % 16) < 1e-7;
    state.lastStep = step;
    if (!discontinuity && !boundary) return;

    // A sparse Freeze buffer starts at its first useful preroll bar rather than at
    // song step zero. Play it in bar-sized pieces, just like the legacy full-form
    // buffer, but translate the live song coordinate back to sample zero. At a form
    // or locator-loop wrap there can be TWO valid pieces: the new pass and the prior
    // pass's release tail. Scheduling both is what lets a long release cross the wrap
    // without baking a second complete song pass into every frozen track.
    if (Number.isFinite(state.segmentStartStep)) {
      const start = state.segmentStartStep;
      const local = ((step % formSteps) + formSteps) % formSteps;
      const offsets = [];
      if (local >= start) offsets.push(local - start);

      const looped = this.loopStart != null && this.loopEnd != null
        && this.loopEnd > this.loopStart && this.loopHasWrapped;
      const repeatedForm = this.loopEnd == null && step >= formSteps;
      if (looped) {
        const previous = (this.loopEnd - start) + (local - this.loopStart);
        if (previous >= 0) offsets.push(previous);
      } else if (repeatedForm) {
        offsets.push(formSteps - start + local);
      }

      const remaining = Math.max(tick, 16 - (local % 16));
      for (const offsetSteps of [...new Set(offsets)]) {
        const offset = offsetSteps * spb;
        const duration = Math.min(remaining * spb,
          Math.max(0, state.buffer.duration - offset));
        if (!(duration > 0)) continue;
        strip.wakeEffects?.(when + duration);
        const src = this.ctx.createBufferSource(); src.buffer = state.buffer;
        src.connect(strip.frozen);
        src.start(when, offset, duration);
      }
      return;
    }

    const origin = state.originStep || 0;
    const loopStart = state.loopStart;
    const loopEnd = state.loopEnd;
    let offsetSteps;
    let remaining;
    if (Number.isFinite(loopStart) && Number.isFinite(loopEnd) && loopEnd > loopStart) {
      const intro = Math.max(0, loopStart - origin);
      const loopLen = loopEnd - loopStart;
      if (step < loopStart) {
        offsetSteps = step - origin;
        remaining = Math.min(16 - (step % 16), loopStart - step);
      } else {
        const steady = this.loopHasWrapped ? loopLen : 0;
        offsetSteps = intro + steady + (step - loopStart);
        remaining = Math.min(16 - (step % 16), loopEnd - step);
      }
    } else {
      const local = ((step - origin) % formSteps + formSteps) % formSteps;
      const pass = step - origin >= formSteps ? formSteps : 0;
      offsetSteps = pass + local;
      remaining = Math.min(16 - (step % 16), formSteps - local);
    }
    if (!(remaining > 0 && offsetSteps >= 0)) return;
    const src = this.ctx.createBufferSource(); src.buffer = state.buffer;
    src.connect(strip.frozen);
    const offset = offsetSteps * spb;
    const duration = Math.min(remaining * spb, Math.max(0, state.buffer.duration - offset));
    if (duration > 0) {
      strip.wakeEffects?.(when + duration);
      this.expectOutput(when, Math.min(duration, 0.75));
      src.start(when, offset, duration);
    }
  }

  _scheduleFrozenLane(key, state, step, when, spb, formSteps) {
    for (const segment of state?.segments || []) {
      this._scheduleFrozenSegment(key, segment, step, when, spb, formSteps);
    }
  }

  /** Markers as steps, against the form THIS engine is playing. See loopSteps. */
  loopSteps(loop) {
    if (!this.bank) return null;
    return loopSteps(loop, barPlan(this.bank).length);
  }

  /**
   * The markers the CURRENT song carries — the desk's unsaved arrangement when there
   * is one, the file's otherwise. Same seam as applyMix reads the arrangement through,
   * for the same reason: on the desk the draft is what you are listening to.
   */
  songLoop() {
    if (!this.bank) return null;
    const id = trackIdOf(this.sourceBank || this.bank);
    if (!id) return null;
    return loopOf(this.bank, id,
      this.arrangement !== undefined ? { [id]: this.arrangement } : undefined);
  }

  /**
   * Arm a song's markers: play from its start bar, then repeat its region for ever.
   *
   * `seek` moves the playhead to the start bar, and is for arriving at a song — only
   * setBank passes it. Re-arming under a song that is already playing must never move
   * the playhead, or every bar edit on the desk would jump the music.
   */
  armLoop(loop, { seek = false } = {}) {
    const r = this.loopSteps(loop);
    if (!r) { this.setLoop(); return false; }
    if (seek) this.step = r.start;
    if (!r.loop) { this.setLoop(); return false; }
    this.setLoop(r.loop.start, r.loop.end, { jump: false });
    return true;
  }

  /**
   * The same, for the song's OWN markers — and the only thing that raises the flag
   * saying so. A cabinet treatment's loop goes through armLoop and leaves the flag
   * down, because a bar edit under an auditioned treatment must not quietly replace it
   * with the song's.
   */
  armSongLoop({ seek = false } = {}) {
    const armed = this.armLoop(this.songLoop(), { seek });
    this.formLoopArmed = armed;
    return armed;
  }

  /**
   * Change an armed loop without interrupting the bar that is already playing.
   * The scheduler swaps these bounds at the next bar boundary, or at the current
   * loop's end when that comes first.
   */
  setLoopAtBoundary(startStep = null, endStep = null) {
    this.pendingStep = null;
    if (startStep == null || endStep == null || endStep <= startStep
      || this.loopStart == null || this.loopEnd == null) {
      this.setLoop(startStep, endStep);
      return;
    }
    const nextBar = this.step % 16 === 0 ? this.step : (Math.floor(this.step / 16) + 1) * 16;
    const boundary = Math.min(this.loopEnd, nextBar);
    const pendingBoundary = this.pendingLoop && this.pendingLoop.boundary > this.step
      ? this.pendingLoop.boundary : boundary;
    this.pendingLoop = {
      start: Math.max(0, Math.floor(startStep)),
      end: Math.floor(endStep),
      boundary: pendingBoundary,
    };
  }

  applyPendingLoop() {
    if (!this.pendingLoop || this.step < this.pendingLoop.boundary) return false;
    this.loopStart = this.pendingLoop.start;
    this.loopEnd = this.pendingLoop.end;
    this.pendingLoop = null;
    this.step = this.loopStart;
    this.loopHasWrapped = true;
    return true;
  }

  /** Queue a playing seek for the next bar boundary instead of cutting the bar. */
  setStepAtBoundary(step) {
    this.pendingLoop = null;
    const target = Math.max(0, Math.floor(step));
    const nextBar = this.step % 16 === 0 ? this.step : (Math.floor(this.step / 16) + 1) * 16;
    const boundary = this.loopEnd == null ? nextBar : Math.min(this.loopEnd, nextBar);
    const inLoop = this.loopStart != null && this.loopEnd != null
      && (target < this.loopStart || target >= this.loopEnd);
    this.pendingStep = {
      step: inLoop ? this.loopStart : target,
      boundary,
    };
  }

  /** Record a transport start for consumers whose cursor must meet the first note. */
  markVisualSeek(step, when = this.nextTime) {
    const target = Math.max(0, Math.floor(Number(step) || 0));
    const at = Number(when);
    this._visualSeek = { step: target, when: Number.isFinite(at) ? at : this.nextTime };
  }

  /** Consume the latest discontinuous transport marker once per visual frame. */
  takeVisualSeek() {
    const seek = this._visualSeek;
    this._visualSeek = null;
    return seek;
  }

  applyPendingStep() {
    if (!this.pendingStep || this.step < this.pendingStep.boundary) return false;
    this.step = this.pendingStep.step;
    this.pendingStep = null;
    this.loopHasWrapped = false;
    // `nextTime` is the exact time the first note at the new step is scheduled. Do not
    // let a visual consumer infer that time from the lookahead after it has advanced.
    this.markVisualSeek(this.step, this.nextTime);
    return true;
  }

  // ---- swing ----------------------------------------------------------------

  /**
   * Change the GROOVE of the song that is playing, on a boundary, without a seam.
   *
   * The cheapest transition in the engine, and worth saying why: `this.swing` is one
   * scalar that `scheduleStep` re-reads every sixteenth, applied as an offset on the
   * NOTE and never on the clock. Nothing is disposed, nothing is rebuilt, no gain is
   * moved and `nextTime` does not budge — so a held note rings out straight and the
   * next one is swung, with no discontinuity anywhere in the graph. Compare `setBank`,
   * which is the other way to hear a song differently and costs a half-second gap.
   *
   * `quantize` names the boundary, in MusicDirector's vocabulary — 'immediate',
   * 'beat', 'bar', 'phrase', or a NUMBER OF BARS. The default is the bar line.
   *
   * `overBars` leans INTO the groove instead of flipping to it: the swing is
   * interpolated a step at a time across that many bars, which is what a drummer
   * settling into a pocket sounds like. Zero is the flip. Free, because the value is
   * read per step anyway.
   *
   * One caveat that belongs here rather than in a comment nobody reads: the
   * tempo-synced delay CANNOT follow a swing (see the note in scheduleStep). Divisions
   * of an even number of sixteenths inherit it for nothing; the default dotted eighth
   * is three sixteenths, and will flam against a swung song by up to a third of a
   * sixteenth. Move the division to 1/8 or 1/4 for a swung section, or take the flam.
   */
  setSwing(pct, { quantize = 'bar', overBars = 0 } = {}) {
    // The same clamp, spelling and range as the desk's own `setSwing` in
    // tools/lib/arrangement-edit.js — one control, one meaning, both ends of the wire.
    // `null` there is "no swing entry", which is this engine's 0.
    //
    // 0 and 50 both mean straight and both are exact (see the swing term in
    // scheduleStep), and 0 is what a straight song is stored as, so that is what a
    // request for straight lands on. Normalising it to 50 would change what reaches
    // `scheduleEffects` for a song nobody has swung, and the null test compares those
    // renders sample for sample.
    const to = pct ? Math.min(SWING_MAX, Math.max(SWING_STRAIGHT, Math.round(pct))) : 0;
    const steps = Math.max(0, Math.round((overBars || 0) * 16));
    if (quantize === 'immediate' && steps === 0) {
      this.pendingSwing = null;
      this.swing = to;
      return;
    }
    // Latest request wins, and it replaces a ramp already under way rather than
    // queueing behind it: two grooves arriving at once is one groove, the newer.
    this.pendingSwing = { to, steps, quantize, started: false, from: 0, done: 0 };
  }

  /** Is `step` the boundary a pending swing asked for? Mirrors MusicDirector._boundary. */
  _swingBoundary(q, step) {
    if (q === 'immediate') return true;
    if (q === 'beat') return step % 4 === 0;
    if (q === 'phrase' || (typeof q === 'number' && q > 0)) {
      // From the MUSICAL ANCHOR, not from zero: a loop over bars 2-5 begins at step 16,
      // and counting phrases from the top of the song steps over every boundary it has.
      const anchor = this.loopStart ?? 0;
      const len = typeof q === 'number'
        ? Math.round(q * 16)
        : ((this.loopEnd != null && this.loopStart != null) ? this.loopEnd - this.loopStart : 64);
      if (!(len > 0)) return false;
      return (((step - anchor) % len) + len) % len === 0;
    }
    return step % 16 === 0;
  }

  /**
   * Move a pending swing along. Called at the top of scheduleStep, so `this.step` is
   * the step ABOUT to be scheduled and the boundary tested is the one whose notes are
   * next out of the door.
   *
   * A bar line cannot be missed, and it is worth knowing why nothing here has to race:
   * the boundary that matters is an EVEN step, and even steps never swing. Landing on
   * the downbeat and landing just after it are the same sound; the first note the
   * change can touch is step 1, the first odd sixteenth of the bar.
   *
   * The ramp counts its own steps rather than measuring `this.step` against a start,
   * because `step` is not monotonic — a loop wrap or a queued seek moves it backwards,
   * and a ramp reading the difference would run backwards with it.
   */
  _applyPendingSwing() {
    const p = this.pendingSwing;
    if (!p) return;
    if (!p.started) {
      if (!this._swingBoundary(p.quantize, this.step)) return;
      p.started = true;
      if (p.steps === 0) { this.swing = p.to; this.pendingSwing = null; return; }
      // Straight is 50 for the arithmetic whichever way it was spelled, so a ramp
      // from an unswung song does not start by leaping from 0 to 50.
      p.from = this.swing || SWING_STRAIGHT;
    }
    p.done++;
    const t = Math.min(1, p.done / p.steps);
    // The TARGET the same way. Landing is a plain assignment of what was asked for, so
    // a ramp down to straight ends at 0 if that is what it was given, not at 50.
    this.swing = p.from + ((p.to || SWING_STRAIGHT) - p.from) * t;
    if (t >= 1) { this.swing = p.to; this.pendingSwing = null; }
  }

  // ---- shared delay controls ------------------------------------------------
  // The tempo-synced echo is the game's only "space", and until the desk existed it
  // was fixed: a dotted eighth, 0.35 feedback, 2800Hz damping. Those remain the
  // defaults; a song's mix can move them.
  //
  // No `level` here any more. It scaled the echo BUS, on top of the section's own
  // `echoLevel` — two hidden multipliers between a send and what you heard. How loud
  // the delay comes back is the aux return's level on the desk, and how much goes in
  // is the channel's send: one control each, both visible.
  setDelay({ division, feedback, tone } = {}) {
    if (division != null) this.delayDivision = division;
    if (feedback != null) this.delayFeedback = Math.max(0, Math.min(0.95, feedback));
    if (tone != null) this.delayTone = Math.max(200, Math.min(this.ctx.sampleRate / 2, tone));
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (this.delay) {
      const secs = this.delayTimeSeconds();
      this.growDelayLine(secs).delayTime.setTargetAtTime(secs, t, 0.05);
    }
    if (this.delayFb) this.delayFb.gain.setTargetAtTime(this.delayFeedback, t, 0.05);
    if (this.delayLp) this.delayLp.frequency.setTargetAtTime(this.delayTone, t, 0.05);
  }

  delayTimeSeconds() {
    const beats = this.delayDivision ?? 0.75;   // dotted eighth
    // The WARPED clock, not the bank's own. A song under a speed burst or a star is
    // playing faster than it was written, and a division left at the written tempo is
    // no longer that division: at a 1.12 warp the first repeat lands a third of a 16th
    // late and every repeat after it compounds, which is heard as the echo flamming
    // against the kit rather than as a delay.
    //
    // Bounded by what a delay line can hold at all — an eight-bar division at a slow
    // tempo asks for more than the longest buffer this engine will allocate.
    return Math.min(MAX_DELAY_SECONDS, (60 / ((this.bpm || 120) * (this.tempo || 1))) * beats);
  }

  /**
   * Swap in a longer delay line when a division needs one.
   *
   * A DelayNode's buffer is allocated at construction and never grows, so bar-length
   * echoes need a new node. The obvious move — build the line at its maximum from
   * the start — is wrong here: a DelayNode with a large maxDelayTime does NOT render
   * the same samples as a small one at the same delay time. Measured at 1.7e-4 on
   * Speed Zone against the engine baselines, which is the null test failing and
   * every song's echo quietly moving. So the default line stays exactly the one
   * ounce the songs were balanced against, and only a deliberately long division
   * ever builds a bigger one.
   */
  growDelayLine(secs) {
    if (!this.ctx || !this.delay || secs <= this.delay.maxDelayTime - 0.01) return this.delay;
    const next = this.ctx.createDelay(Math.min(MAX_DELAY_SECONDS, Math.ceil(secs) + 1));
    next.delayTime.value = this.delay.delayTime.value;
    for (const [from, node] of [[this.echoHp, this.delay], [this.delayFb, this.delay]]) {
      try { from.disconnect(node); } catch { /* not wired */ }
    }
    try { this.delay.disconnect(this.delayLp); } catch { /* not wired */ }
    this.echoHp.connect(next);
    this.delayFb.connect(next);
    next.connect(this.delayLp);
    this.delay = next;
    return next;
  }

  // mulberry32: seeded so an offline render repeats exactly — see setNoiseSeed.
  _noiseRandom() {
    if (this.noiseSeed == null) return Math.random;
    let a = this.noiseSeed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  settleContext(promise) {
    if (promise && typeof promise.catch === 'function') promise.catch(() => {});
  }

  suspendContext() {
    if (!this.ctx || typeof this.ctx.suspend !== 'function' || this.ctx.state === 'suspended') return;
    try { this.settleContext(this.ctx.suspend()); } catch (e) { /* platform owns lifecycle */ }
  }

  resumeContext() {
    if (!this.ctx || typeof this.ctx.resume !== 'function' || this.lifecyclePaused) return;
    try { this.settleContext(this.ctx.resume()); } catch (e) { /* next gesture retries */ }
  }

  /** Record scheduler evidence that audible music is expected around an audio time. */
  expectOutput(when, seconds = 0.35) {
    if (this.offline || !Number.isFinite(when)) return;
    const until = when + Math.max(0.1, Number(seconds) || 0);
    if (until > this.outputExpectedUntil) this.outputExpectedUntil = until;
  }

  /** True only while recently scheduled musical events still say silence is wrong. */
  outputExpected() {
    return !!this.ctx && this.ctx.currentTime <= this.outputExpectedUntil;
  }

  /**
   * Replace a failed realtime AudioContext without turning recovery into a song load.
   *
   * Context-owned nodes cannot be moved, so the graph and VoiceRack are rebuilt. The
   * musical/editor state deliberately stays: source song, unsaved mix and arrangement,
   * exact transport step, working loop, pending seek/swing, note-cache buffers and
   * session-only frozen PCM. A short new lookahead is the only audible discontinuity.
   */
  async rebuildRealtimeContext() {
    if (!this.ctx || this.offline || this._contextRestarting) return false;
    this._contextRestarting = true;
    const oldCtx = this.ctx;
    const snapshot = {
      sourceBank: this.sourceBank,
      bank: this.bank,
      mixEntry: this.mixEntry,
      arrangement: this.arrangement,
      step: this.step,
      loopStart: this.loopStart,
      loopEnd: this.loopEnd,
      pendingLoop: this.pendingLoop,
      pendingStep: this.pendingStep,
      // The audition survives a fresh context, and so does an edit still waiting at a
      // bar line — `step` is restored with it, so the boundary still means what it did.
      pendingRearrangement: this.pendingRearrangement,
      loopHasWrapped: this.loopHasWrapped,
      formLoopArmed: this.formLoopArmed,
      pendingSwing: this.pendingSwing,
      swing: this.swing,
      bpm: this.bpm,
      musicTrim: this.musicTrim,
    };

    try {
      if (this.timer) { clearInterval(this.timer); this.timer = null; }
      this._stopCapture();
      if (this._revTimer) { clearInterval(this._revTimer); this._revTimer = null; }
      this._revSources = [];
      if (this.voices) { this.voices.dispose(); this.voices = null; }
      setNoteCachePlaybackActive(this.noteCacheState,
        !!snapshot.bank || this.noteCachePreparationHeld);

      // Do not let a platform close that never settles prevent the replacement from
      // being built. Closing is best-effort once every reference to the old graph has
      // been dropped; the browser owns final device teardown.
      if (typeof oldCtx.close === 'function') {
        try {
          await Promise.race([
            Promise.resolve(oldCtx.close()).catch(() => {}),
            new Promise((resolve) => setTimeout(resolve, 500)),
          ]);
        } catch { /* a replacement is still the useful recovery */ }
      }

      this.ctx = null;
      this.offline = false;
      this.bank = null;
      this.sourceBank = null;
      this.mixer = null;
      this.master = null;
      this.outputExpectedUntil = 0;
      this.ensure();
      if (!this.ctx || this.ctx === oldCtx) throw new Error('AudioContext replacement was not created');

      this.sourceBank = snapshot.sourceBank;
      this.arrangement = snapshot.arrangement;
      this.bank = snapshot.sourceBank
        ? this.applyMix(snapshot.sourceBank, snapshot.mixEntry)
        : snapshot.bank;
      this.mixEntry = snapshot.mixEntry;
      this.musicTrim = this.bank?.musicTrim ?? snapshot.musicTrim ?? 1;
      this.bpm = this.bank?.bpm || snapshot.bpm;
      this.swing = snapshot.swing;
      this.pendingSwing = snapshot.pendingSwing;
      this.step = snapshot.step;
      this.loopStart = snapshot.loopStart;
      this.loopEnd = snapshot.loopEnd;
      this.pendingLoop = snapshot.pendingLoop;
      this.pendingStep = snapshot.pendingStep;
      this.pendingRearrangement = snapshot.pendingRearrangement;
      // The bank is a new object after applyMix, so the memoised output bar for
      // song-groove drums belongs to a song that no longer exists.
      this._rearrangeOutputBar = null;
      this.loopHasWrapped = snapshot.loopHasWrapped;
      this.formLoopArmed = snapshot.formLoopArmed;
      this.pendingStartDelay = 0;
      this.nextTime = this.ctx.currentTime + 0.1;
      if (this.songTrim) {
        this.songTrim.gain.cancelScheduledValues(this.ctx.currentTime);
        this.songTrim.gain.setValueAtTime(this.bank ? this.musicTrim : 0.0001,
          this.ctx.currentTime);
      }
      setNoteCachePlaybackActive(this.noteCacheState,
        !!this.bank || this.noteCachePreparationHeld);
      return true;
    } catch (error) {
      console.error('[audio] fresh AudioContext recovery failed:', error);
      return false;
    } finally {
      this._contextRestarting = false;
    }
  }

  setLifecyclePaused(paused) {
    paused = !!paused;
    if (paused === this.lifecyclePaused) return;
    this.lifecyclePaused = paused;
    if (paused) this.suspendContext();
    else this.resumeContext();
  }

  // Rewind is unavailable on touch screens, so their audio must not pay for
  // the continuously-running master-output recorder. Configure this before
  // ensure(); changing it later also tears down an already-created recorder.
  /**
   * Ask for a different output buffer size. Before ensure(), like setCaptureEnabled —
   * `latencyHint` is a construction argument and a context cannot be talked into a new
   * one afterwards, so a call made later is a call that does nothing.
   *
   * Takes what the AudioContext constructor takes: 'interactive' (smallest, the default
   * and what the game wants), 'balanced', 'playback' (largest), or a number of seconds
   * as an explicit request. Null leaves the browser's own default alone.
   */
  setLatencyHint(hint) {
    this.latencyHint = hint || null;
  }

  /**
   * Select the foreground scheduler safety margin. This is deliberately separate
   * from the AudioContext output buffer: it protects against main-thread stalls,
   * while latencyHint protects the realtime output callback. It is live-safe because
   * already queued timestamps are never moved or unwound.
   */
  setSequencerLookahead(seconds) {
    const value = Number(seconds);
    this.sequencerLookahead = SEQUENCER_LOOKAHEAD_OPTIONS.includes(value)
      ? value : SEQUENCER_LOOKAHEAD;
    return this.sequencerLookahead;
  }

  /**
   * Ask for a specific context sample rate. Before ensure(), for the same reason as
   * setLatencyHint. The desk uses 44100: its bounces have always rendered at 44.1k
   * (tools/lib/wav.js), so monitoring at the same rate means hearing the file you
   * are about to keep — and the whole graph costs ~8% less than at 48k.
   */
  setSampleRate(rate) {
    this.sampleRateHint = Number.isFinite(rate) && rate > 0 ? rate : null;
  }

  /**
   * Skip synthesizing lanes the mix has silenced — see the flag in the constructor
   * and the skip itself in scheduleStep. Desk-only, and honest about its one cost:
   * un-muting or un-soloing reveals notes from the next scheduled step onward, so a
   * note whose ONSET fell while the lane was silent stays missing until its next
   * occurrence — up to the lookahead for a short note, the remainder of a pad that
   * had already started. That is the freeze-style trade a desk makes on purpose:
   * the playing mix must never break up to keep a silenced lane warm.
   */
  setSilentLaneSkip(on) {
    this.silentLaneSkip = !!on;
  }


  /**
   * Play pooled Tone voices from RENDERED NOTES where that is safe — see the note
   * cache in voices.js for which notes qualify and why the rest cannot.
   *
   * Desk-only, like the skip above. The game never sets it (its songs name few
   * pooled voices and none densely), and an offline render never sets it either: a
   * bounce is the reference for what a song IS, and it has to synthesise rather than
   * replay. Set before or after `ensure()` — the rack reads it per note.
   */
  setNoteCache(on) {
    this.noteCache = !!on;
    if (this.noteCache && !this.noteCacheState) this.noteCacheState = createNoteCacheState();
    if (this.noteCacheState) setNoteCachePlaybackActive(this.noteCacheState,
      !!this.bank || this.noteCachePreparationHeld);
    if (!this.noteCache && this.noteCacheState) {
      clearNoteCacheState(this.noteCacheState);
      this.noteCacheState = null;
    }
    if (this.voices) {
      this.voices.noteCache = this.noteCache;
      if (this.noteCacheState) this.voices.setNoteCacheState(this.noteCacheState);
    }
  }

  /** The desk's play/pause, told to the note cache — see setNoteCacheTransportRunning. */
  setNoteCacheTransport(running) {
    setNoteCacheTransportRunning(this.noteCacheState, running);
  }

  setMrdrTailCulling(on) {
    this.mrdrTailCulling = !!on;
    this.voices?.setMrdrTailCulling(this.mrdrTailCulling);
  }

  /**
   * Song Mixer only: MRDR-3's realtime quality — see MRDR_QUALITY in voices.js.
   *
   * Changing it does not disturb anything already sounding, and it does not touch the
   * stored preset: this is a playback decision about how many nodes to build, not an edit.
   * The note cache keys on the mode, so flipping it leaves the other mode's buffers in the
   * cache rather than invalidating them — flipping back finds them warm.
   */
  setMrdrQuality(mode) {
    this.mrdrQuality = mode === MRDR_QUALITY.PERFORMANCE
      ? MRDR_QUALITY.PERFORMANCE : MRDR_QUALITY.FULL;
    this.voices?.setMrdrQuality(this.mrdrQuality);
    return this.mrdrQuality;
  }

  // The rack-less mirror of VoiceRack.noteCacheHealth — same field names, same
  // stats-first ordering, and for the same reason: `queued` is the live backlog and
  // must not be overwritten by a lifetime counter that happens to share a name.
  noteCacheHealth() {
    if (!this.noteCacheState) return {
      enabled: false, playbackActive: !!this.bank, entries: 0, buffers: 0,
      bytes: 0, queued: 0, rendering: 0, hits: 0, misses: 0, queuedTotal: 0,
      started: 0, completed: 0, failed: 0, stale: 0,
      plan: { candidates: 0, selected: 0, completed: 0, failed: 0, pending: 0 },
    };
    if (this.voices?.noteCacheHealth) return this.voices.noteCacheHealth();
    const state = this.noteCacheState;
    let buffers = 0;
    for (const entry of state.entries.values()) if (entry.buffer) buffers++;
    return { ...state.stats, enabled: this.noteCache,
      playbackActive: !!state.playbackActive,
      entries: state.entries.size, buffers, bytes: state.bytes,
      queued: state.queue.length, rendering: state.rendering, plan: { ...(state.plan || {}) } };
  }

  /**
   * Discover every cacheable note in an already-resolved desk bank without sounding it.
   *
   * `bank` is the value returned by applyMix, so it already contains arrangement and
   * voice edits. This walk mirrors scheduleStep's bar/section resolution but stops at
   * VoiceRack's cache key builder: no strip, effect, oscillator or BufferSource is
   * constructed. Walking from the opening forwards leaves late notes newest in the
   * bounded LRU; the rack then sorts their render jobs latest-first, aimed at the dense
   * ending that motivated preparation in the first place.
   */
  prepareNoteCache(bank, {
    startStep = 0, endStep = null, urgent = false, onlyVoiceIds = null,
    priorityDistanceOffset = 0,
  } = {}) {
    if (!this.noteCache || !this.noteCacheState || !this.ctx || !bank) return this.noteCacheHealth();
    if (!this.voices) {
      this.voices = new VoiceRack(this.ctx, this.noiseBuf, this.crashBuf, this.noteCacheState);
      this.voices.soloLayers = this.soloLayers;
      this.voices.noteCache = true;
      this.voices.setMrdrTailCulling(this.mrdrTailCulling);
      this.voices.setMrdrQuality(this.mrdrQuality);
      this.voices.setNoteCacheState(this.noteCacheState);
    }
    const rack = this.voices;
    // ---- WHOLE-SONG WARMING vs EDIT RECOVERY ------------------------------------
    //
    // The plan is a COST-TIERED selection: `commitPreparedNotePlan` keeps the notes worth
    // the bytes and drops the cheap ones (`rank === 99 -> skippedCheap`). That is right
    // when warming a whole song into a fixed budget, and wrong when repairing the window
    // the playhead is about to reach — there, every note that is missing is a note that
    // will be synthesised live, and cheap ones are missing just as loudly as dear ones.
    //
    // So the urgent walk opens NO plan. `rack.prepareNoteCache`'s non-plan branch goes
    // straight to the cache entry, which queues the render immediately.
    if (!urgent) rack.beginPreparedNotePlan?.();
    // PRIORITIES LIVE IN TWO BANDS. The ordinary walk uses the song step, sorted
    // descending, so a late dense section warms before the opening bars — deliberate, and
    // the reason an urgent priority cannot simply be "a bigger step". It sits above every
    // song step instead, and counts DOWN with distance from the playhead so the nearest
    // note is rendered first. The offset carries distance across a loop wrap, where a
    // second walk starts again at a low step number but is further away in playing time.
    const priorityFor = (step) => (urgent
      ? URGENT_PRIORITY_BASE - (priorityDistanceOffset + (step - from))
      : step);
    const plan = barPlan(bank);
    const resolution = resolutionOf(bank);
    const tick = 16 / resolution;
    const formSteps = plan.length * 16;
    const from = Math.max(0, Math.min(formSteps, Number(startStep) || 0));
    const to = Math.max(from, Math.min(formSteps,
      Number.isFinite(endStep) ? Number(endStep) : formSteps));
    const spb = (60 / (this.bpm * this.tempo)) / 4;
    const barValue = (map, key, fallback = 0) =>
      typeof map === 'number' ? map : (Number.isFinite(map?.[key]) ? map[key] : fallback);
    const shift = (value, semitones) => Array.isArray(value)
      ? value.map((v) => shift(v, semitones))
      : typeof value === 'number' && value > 0 ? value * 2 ** (semitones / 12) : value;

    // Counted in whole ticks for the same reason the transport is (see `get step`):
    // `step += tick` is exact at 1 and 0.5 and drifts at a third, and this walk is the
    // note cache — a step that has drifted reads the slot next door and caches the
    // wrong note for the rest of the render.
    const walk = () => {
    for (let t = Math.floor(from / tick); t * tick < to; t++) {
      const step = t * tick;
      if (step < from) continue;
      const bar = plan[Math.floor(step / 16) % plan.length];
      const s = Math.round((step % 16) * resolution / 16) + bar.half * resolution;
      let b = bank;
      if (b.sections?.length && bar.sec != null) {
        const section = resolveSection(b, bar.sec % b.sections.length);
        if (section) b = { ...bank, ...section };
      }
      if (bar.off || bar.delete) {
        b = { ...b };
        for (const key of [...(bar.off || []), ...(bar.delete || [])]) b[key] = null;
      }
      const transposeKeys = new Set([
        ...Object.keys(typeof bar.transpose === 'object' ? bar.transpose || {} : {}),
        ...(typeof bar.transpose === 'number'
          ? [...LANE_KEYS, ...(b.__layers || []).map((layer) => layer.key)]
            .filter((key) => !PERCUSSION_LANES.includes(baseLane(key)))
          : []),
      ]);
      if (transposeKeys.size) {
        b = { ...b };
        for (const key of transposeKeys) {
          const semitones = barValue(bar.transpose, key);
          if (semitones && Array.isArray(b[key])) b[key] = b[key].map((v) => shift(v, semitones));
        }
      }

      const keys = new Set([...LANE_KEYS, ...(b.__layers || []).map((layer) => layer.key)]);
      for (const key of keys) {
        if (this.silentLaneSkip && this.mixer?.laneSilent(key)) continue;
        const seam = seamFor(key);
        const voice = seam && voiceOf(b, key);
        if (!voice || voice.kind === 'engine') continue;
        // EDIT RECOVERY IS SCOPED TO WHAT WAS EDITED. Every other lane's entries are
        // either already warm (in which case this would only bump a priority) or cold for
        // reasons that have nothing to do with the edit — and a cold note of an untouched
        // voice creating a render here would spend the window's capacity on the wrong
        // lane. Ordinary warming still walks everything.
        if (onlyVoiceIds && !onlyVoiceIds.has(voice.id)) continue;
        const written = sequenceValue(b, key, s, resolution);
        if (written == null || written === false || written === 0) continue;
        const freq = written === true ? (b[seam.noteKey] ?? seam.note) : written;
        const len = effectiveStepLen(b, key, s, resolution);
        const duration = (scale = 1) => noteSeconds(
          len, b[seam.durKey] ?? voice.dur, spb, scale, voice.fixedLength);
        rack.prepareNoteCache(voice.id, freq, duration(),
          { detune: this.detune, priority: priorityFor(step) });

        // These are additional calls to playVoice in scheduleStep rather than separate
        // lanes, so inventory their distinct cache keys here as well.
        if (key === 'bass' && b.bassRepeat) {
          rack.prepareNoteCache(voice.id, freq, duration(b.bassRepeatDur ?? 0.8),
            { detune: this.detune, priority: priorityFor(step) });
        }
        if (key === 'keyGliss' || key === 'organGliss') {
          for (const semi of [-12, -10, -9, -7, -5, -4, -2]) {
            rack.prepareNoteCache(voice.id, shift(freq, semi), duration(),
              { detune: this.detune, priority: priorityFor(step) });
          }
        }
      }
    }
    };
    // Tagged so the counters can tell the repair's own jobs apart from the ordinary
    // scheduler misses landing in the same seconds. The walk is a plain synchronous loop,
    // and `withUrgentTagging` clears the flag in a `finally`, so a throw cannot leak it.
    if (urgent && rack.withUrgentTagging) rack.withUrgentTagging(walk);
    else walk();
    if (!urgent) rack.commitPreparedNotePlan?.();
    rack.prioritisePreparedNotes();
    // The window opens AFTER the walk, so the boost's pump finds the queue already
    // sorted with the nearest note at its head.
    if (urgent) rack.urgentNoteCacheBoost?.();
    return this.noteCacheHealth();
  }

  /**
   * Stop the stopped-transport cache worker at a clean job boundary.
   *
   * Start-from-beginning uses this after its short preparation budget: a render that
   * is already running is allowed to finish, but its completion cannot launch the
   * next queued job while the transport is about to start.
   */
  setNoteCachePreparationHeld(held) {
    this.noteCachePreparationHeld = !!held;
    setNoteCachePlaybackActive(this.noteCacheState,
      !!this.bank || this.noteCachePreparationHeld);
  }

  setCaptureEnabled(enabled) {
    enabled = !!enabled;
    if (enabled === this.captureEnabled) return;
    this.captureEnabled = enabled;
    if (!this.ctx) return;
    if (enabled) this._startCapture();
    else this._stopCapture();
  }

  /** Silent right now, for either reason — the saved setting or this boot's switch. */
  get silent() { return this.muted || this.sessionMuted; }

  setMuted(m) {
    this.muted = m;
    this._applyMute();
  }

  /**
   * Mute for this boot only, without touching the player's setting.
   *
   * What `?mute` wants: a verification run makes no sound, and the game the
   * player comes back to is however they left it. The saved setting is still
   * underneath and still wins when it says mute — this can only add silence,
   * never remove it, so unmuting from the menu during a `?mute` session leaves
   * the session switch in place rather than silently discarding it.
   */
  setSessionMute(m) {
    this.sessionMuted = !!m;
    this._applyMute();
  }

  _applyMute() {
    if (!this.master) return;
    this.master.gain.setTargetAtTime(this.silent ? 0 : this.levels.master,
      this.ctx.currentTime, 0.02);
  }

  /**
   * Cut every live output immediately.
   *
   * This is intentionally stronger than muting the master: the desk can have
   * long notes, preview envelopes, echo tails and a MIDI key whose note-off
   * never arrived. Lane gates and the preset rack are dropped so music cannot
   * keep scheduling or resume from an old held voice, while the buses stay in
   * place for the next explicit sound the user asks for.
   */
  panic() {
    this.panicked = true;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const cut = (node) => {
      if (!node?.gain) return;
      node.gain.cancelScheduledValues(t);
      node.gain.setValueAtTime(0, t);
    };
    cut(this.master);
    cut(this.musicGain);
    cut(this.sfxGain);
    cut(this.musicBus);
    cut(this.starBus);
    cut(this.songTrim);
    cut(this._rewindOut);
    this._cutLaneGates();
    if (this.voices) { this.voices.dispose(); this.voices = null; }
    setNoteCachePlaybackActive(this.noteCacheState, this.noteCachePreparationHeld);
    this._percPending.length = 0;
    this._percHeard.length = 0;
    if (this._revTimer) { clearInterval(this._revTimer); this._revTimer = null; }
    this._revSources = [];
    // The realtime scheduler must not recreate gates after the cut. `setBank`
    // will force a clean re-bank because sourceBank is cleared as well.
    this.bank = null;
    this.sourceBank = null;
    this.nextTime = t + 0.1;
  }

  /** Re-open buses after a panic when a new deliberate sound is requested. */
  resumeAfterPanic() {
    if (!this.panicked) return;
    this.panicked = false;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const restore = (node, value) => {
      if (!node?.gain) return;
      node.gain.cancelScheduledValues(t);
      node.gain.setValueAtTime(value, t);
    };
    restore(this.master, this.silent ? 0 : this.levels.master);
    restore(this.musicGain, this.levels.music);
    restore(this.sfxGain, this.levels.sfx);
    restore(this.musicBus, this.rewindMode ? 0.0001 : (this.starMode ? 0.32 : 1));
    restore(this.starBus, this.starMode ? 1.5 : 0);
    if (this._rewindOut) restore(this._rewindOut, this.silent ? 0 : this.levels.master);
  }

  setVolumes(volumes = {}) {
    for (const key of ['master', 'music', 'sfx']) {
      if (Number.isFinite(volumes[key])) this.levels[key] = Math.max(0, Math.min(1, volumes[key]));
    }
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.silent ? 0 : this.levels.master, t, 0.02);
    this.musicGain.gain.setTargetAtTime(this.levels.music, t, 0.02);
    this.sfxGain.gain.setTargetAtTime(this.levels.sfx, t, 0.02);
    if (this._rewindOut) this._rewindOut.gain.setTargetAtTime(this.silent ? 0 : this.levels.master, t, 0.02);
  }

  // Synthesise the weapon cues into buffers, once, at init. A few ms of math at
  // the context's own sample rate replaces fetching and decoding nine WAVs;
  // every shot then plays a cheap buffer source, exactly as before. Rendering
  // is synchronous and cannot half-fail the way a network fetch could, so the
  // procedural fallbacks in playContact/playLaunch now only guard a missing ctx.
  renderWeaponBuffers() {
    const SR = this.ctx.sampleRate;
    const bake = (cueMap, buffers) => {
      for (const [hero, name] of Object.entries(cueMap)) {
        try {
          const samples = renderCue(name, SR);
          const buf = this.ctx.createBuffer(1, samples.length, SR);
          buf.getChannelData(0).set(samples); // Float64 -> Float32 on copy
          buffers[hero] = buf;
        } catch (err) {
          console.warn(`weapon cue ${name} failed to render; using procedural fallback.`, err);
        }
      }
    };
    bake(CONTACT_CUE, this.contactBuffers);
    bake(LAUNCH_CUE, this.launchBuffers);
  }

  // ---- SFX ------------------------------------------------------------------
  // dest overrides where the tone lands. Everything in the game wants the SFX
  // bus and says nothing; a cue routing itself through its own send (the portal
  // swoosh and its reverb) passes one in.
  // `hold` is the fraction of `dur` spent at full level before the decay
  // starts. It defaults to 0, which is this cue set's house envelope: attack in
  // 8ms, then decay exponentially across the whole length. That is right for
  // every blip, bonk and ping here — and wrong for anything meant to SUSTAIN.
  // An exponential run from full to silence is 13dB down a fifth of the way in,
  // so a one-second tone asked to hold is inaudible for most of its own
  // duration. The slide whistle is the first cue that has to last as long as
  // the thing it describes, and this is what lets it.
  osc(type, f0, f1, dur, gain = 0.2, when = 0, dest = null, hold = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(1, f0), t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const sustain = Math.max(0.008, Math.min(0.95, hold) * dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain * this.cueGain, t + 0.008);
    if (sustain > 0.008) g.gain.setValueAtTime(gain * this.cueGain, t + sustain);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.gain.linearRampToValueAtTime(0, t + dur + 0.02 - 0.005);
    o.connect(g); g.connect(dest || this.sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  }

  // Same `hold` as osc() above, for the same reason: a breath layer under a
  // sustained tone has to sustain with it or the tone goes bare halfway through.
  noise(dur, gain = 0.2, filterType = 'lowpass', freq = 800, when = 0, hold = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf; src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = filterType; f.frequency.value = freq;
    const g = this.ctx.createGain();
    const sustain = Math.max(0.008, Math.min(0.95, hold) * dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain * this.cueGain, t + 0.008);
    if (sustain > 0.008) g.gain.setValueAtTime(gain * this.cueGain, t + sustain);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.gain.linearRampToValueAtTime(0, t + dur + 0.02 - 0.005);
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t); src.stop(t + dur + 0.02);
  }

  explosion() {
    if (!this.ctx || !this.crashBuf) return;
    const t = this.ctx.currentTime;
    const q = this.cueGain;
    // Use the dedicated long noise buffer so the blast has a continuous body,
    // rather than looping the short SFX buffer and sounding like a snare roll.
    const src = this.ctx.createBufferSource(); src.buffer = this.crashBuf;
    const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 70;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.7;
    lp.frequency.setValueAtTime(7200, t);
    lp.frequency.exponentialRampToValueAtTime(420, t + 1.45);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.36 * q, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.17 * q, t + 0.18);
    g.gain.exponentialRampToValueAtTime(0.08 * q, t + 0.72);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    g.gain.linearRampToValueAtTime(0, t + 1.55 - 0.005);
    src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(this.sfxGain);
    // A quiet send into the arcade echo makes the blast occupy the room, while
    // the dry SFX path stays restrained enough not to jump over the title music.
    // 0.039 is the 0.14 this was tuned at, times the 0.28 the echo bus used to sit
    // at: the bus is unity now, and this is the one send into it that is not a
    // channel on the desk, so it carries its own trim to sound exactly as it did.
    const echo = this.ctx.createGain(); echo.gain.value = 0.039;
    g.connect(echo); echo.connect(this.echoBus);
    src.start(t); src.stop(t + 1.55);

    // The front edge is bright and sharp; the long filtered buffer carries the
    // expanding cloud while these layers provide the punch and falling rumble.
    this.noise(0.16, 0.26, 'highpass', 2400);
    this.osc('sine', 125, 22, 1.4, 0.42, 0.02);
    this.osc('triangle', 68, 26, 1.2, 0.25, 0.05);
    this.noise(1.05, 0.14, 'lowpass', 240, 0.04);
    for (const [when, freq, gain] of [[0.18, 1800, 0.13], [0.38, 1250, 0.1], [0.64, 820, 0.075], [0.91, 520, 0.05]]) {
      this.noise(0.16, gain, 'bandpass', freq, when);
    }
  }

  // A compact impact crash. This uses the long noise buffer rather than a
  // handful of tiny filtered pings, so the sound has an audible noisy body and
  // a real tail instead of collapsing into a pitched bonk.
  impactCrash(pitch = 1) {
    if (!this.ctx || !this.crashBuf) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.crashBuf;
    const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 95;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(6200 * pitch, t);
    lp.frequency.exponentialRampToValueAtTime(260 * pitch, t + 0.62);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.62 * this.cueGain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.28 * this.cueGain, t + 0.16);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.72);
    g.gain.linearRampToValueAtTime(0, t + 0.78 - 0.005);
    src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(this.sfxGain);
    src.start(t); src.stop(t + 0.78);

    // The noise is the body; these two layers make its front edge read on
    // laptop speakers without turning the whole cue back into a beep.
    this.noise(0.045, 0.46, 'highpass', 3600 * pitch);
    this.osc('sine', 145 * pitch, 38 * pitch, 0.3, 0.34);
  }

  // A boot going THROUGH a crate at a run. The slide plow needed its own cue:
  // it was borrowing the weapon crash ('impact'/'contact'), which is a bright
  // metal ring over a pitched sine, and against the music that read as a small
  // bonk landing near the box rather than as the box giving way. Nothing in it
  // said "wood", and the pitched layer is what made it polite.
  //
  // This is the opposite balance. It is almost all NOISE and deliberately
  // broadband — the boot arriving, the crate letting go across the whole
  // spectrum, then the splinters clattering down behind it — with only enough
  // low sine to carry the weight of the leg on a laptop speaker.
  boxKick() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // The boot. Short and dull: a running leg hitting a slat is a slap, not a
    // click, so the noise sits low and the sine falls away almost at once.
    this.noise(0.05, 0.36, 'lowpass', 300);
    this.osc('sine', 112, 30, 0.19, 0.34);
    // The crate coming apart — the body of the cue, and the reason this exists.
    // The long crash buffer swept bright-to-dark runs 0.55s, where 'crunch's
    // entire noise layer is 0.1s: the tail is what makes it sound like a thing
    // in pieces rather than a thing being tapped.
    if (this.crashBuf) {
      const src = this.ctx.createBufferSource(); src.buffer = this.crashBuf;
      // Highpass well above the boot thump so the two layers stack instead of
      // fighting over the same bottom octave.
      const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 130;
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.6;
      lp.frequency.setValueAtTime(5400, t);
      lp.frequency.exponentialRampToValueAtTime(340, t + 0.5);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.58 * this.cueGain, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.24 * this.cueGain, t + 0.13);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      g.gain.linearRampToValueAtTime(0, t + 0.6 - 0.005);
      src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(this.sfxGain);
      src.start(t); src.stop(t + 0.6);
    }
    // The crack of the slat itself, on the same frame as the boot. Bright and
    // gone in three frames — this is the layer that survives a phone speaker.
    this.noise(0.035, 0.42, 'highpass', 3400);
    // Splinters landing. Uneven spacing for the same reason 'debris' uses it:
    // evenly spaced ticks read as a machine rather than as rubble.
    [[0.055, 1400, 0.15], [0.1, 1000, 0.12], [0.155, 700, 0.09], [0.23, 480, 0.06]]
      .forEach(([when, freq, gain]) => this.noise(0.06, gain, 'bandpass', freq, when));
  }

  playContact(hero, pitch = 1) {
    const buffer = this.contactBuffers[hero];
    if (!buffer) { this.impactCrash(pitch); return; }
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = buffer;
    src.playbackRate.value = pitch;
    const trim = WEAPON_AUDIO_GAIN.contact[hero] ?? 1;
    const g = this.ctx.createGain(); g.gain.value = this.cueGain * trim;
    src.connect(g); g.connect(this.sfxGain);
    src.start(t);
  }

  playLaunch(hero, pitch = 1) {
    const buffer = this.launchBuffers[hero];
    if (!buffer) {
      if (hero === 'b33p') this.sfx('shoot', { pitch });
      else if (hero === 'raymn') this.sfx('plop', { pitch });
      else if (hero === 'grumpos') this.sfx('axe', { pitch });
      return;
    }
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = buffer;
    src.playbackRate.value = pitch;
    const trim = WEAPON_AUDIO_GAIN.launch[hero] ?? 1;
    const g = this.ctx.createGain(); g.gain.value = this.cueGain * trim;
    src.connect(g); g.connect(this.sfxGain);
    src.start(t);
  }

  // The title sign shorting out.
  //
  // Runs on the SFX bus, NOT the music bus, and that routing is the whole point
  // of where it sits: the echo send is fed from musicGain, so anything on the
  // music bus is echoed whether it wants to be or not. A buzzing sign is a
  // physical object a few feet away, not something ringing around the arcade,
  // so it has to bypass that send entirely. sfxGain connects straight to master.
  //
  // Three things make this read as a BUZZ rather than the thud it used to be:
  // it lasts long enough to hear (a 0.1s blip is a click, the ear needs a few
  // cycles of stutter to call something a buzz); the tone keeps its harmonics
  // instead of being lowpassed down to a bare sine; and the whole thing is
  // chopped by a stutter gate, which is the actual sound of a contact
  // chattering rather than a tube humming.
  //
  // Level: deliberately way down at the threshold of hearing. This is a room
  // detail — the sign you only notice once you have stopped reading the menu —
  // not a cue, and it repeats forever on the title screen, so anything that
  // announces itself becomes a tic. Scale the whole thing from `q` rather than
  // editing four envelope points to change how loud it is.
  //
  // Unlike osc()/noise(), this authors its own nodes, so it has to apply
  // cueGain itself or an SFX_TRIM entry for it would silently do nothing.
  neonBuzz() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const DUR = 0.34;
    const q = this.cueGain * 0.4;   // master level for the whole buzz

    // The stutter gate everything runs through: the contact chattering, slowing
    // down as the arc gives up. Multiplies rather than replaces the envelopes,
    // so the buzz and its crackle break up together.
    const gate = this.ctx.createGain(); gate.gain.value = 0.6;
    const lfo = this.ctx.createOscillator(); lfo.type = 'square';
    lfo.frequency.setValueAtTime(46, t);
    lfo.frequency.linearRampToValueAtTime(29, t + DUR);
    const lfoDepth = this.ctx.createGain(); lfoDepth.gain.value = 0.4;
    lfo.connect(lfoDepth); lfoDepth.connect(gate.gain);
    gate.connect(this.sfxGain);

    // Pitched up near the sixth harmonic of mains: the low version sat in the
    // theme's bass and read as a thump, and even at the third it still had body.
    // A tiny failing tube sings high and thin, so it can sit quietly on top of
    // the music instead of competing with it.
    const o = this.ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(720, t);
    o.frequency.linearRampToValueAtTime(676, t + DUR);   // sags as it dies
    // A detuned partial roughly an octave up beats against the fundamental,
    // which is what sours a clean hum into a rasp.
    const o2 = this.ctx.createOscillator(); o2.type = 'square';
    o2.frequency.setValueAtTime(1455, t);
    const o2g = this.ctx.createGain(); o2g.gain.value = 0.24;
    // Highpassed as well as lowpassed now: with the fundamental this high, what
    // little bottom the saw has left is all thump and no sizzle.
    const ohp = this.ctx.createBiquadFilter(); ohp.type = 'highpass';
    ohp.frequency.value = 520;
    const of = this.ctx.createBiquadFilter(); of.type = 'lowpass';
    of.frequency.value = 5200; of.Q.value = 0.9;
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.006 * q, t + 0.014);
    og.gain.exponentialRampToValueAtTime(0.0034 * q, t + 0.16);
    og.gain.exponentialRampToValueAtTime(0.0001, t + DUR);
    og.gain.linearRampToValueAtTime(0, t + DUR + 0.02 - 0.005);
    o.connect(ohp); o2.connect(o2g); o2g.connect(ohp);
    ohp.connect(of); of.connect(og); og.connect(gate);
    o.start(t); o.stop(t + DUR + 0.02);
    o2.start(t); o2.stop(t + DUR + 0.02);
    lfo.start(t); lfo.stop(t + DUR + 0.02);

    // The arc itself: a thin band of noise up where the spark lives, riding on
    // through the buzz rather than snapping shut after one frame.
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf; src.loop = true;
    const nf = this.ctx.createBiquadFilter();
    nf.type = 'bandpass'; nf.frequency.value = 4600; nf.Q.value = 1.2;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(0.003 * q, t + 0.008);
    ng.gain.exponentialRampToValueAtTime(0.0009 * q, t + 0.13);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + DUR * 0.85);
    ng.gain.linearRampToValueAtTime(0, t + DUR - 0.005);
    src.connect(nf); nf.connect(ng); ng.connect(gate);
    src.start(t); src.stop(t + DUR);
  }

  // A breathy shooting-star gesture routed through the music bus, so it sits
  // inside the title theme's echo and volume rather than behaving like an SFX.
  cometSwoop() {
    if (!this.ctx || !this.musicBus) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(520, t);
    o.frequency.exponentialRampToValueAtTime(920, t + 0.52);
    o.frequency.exponentialRampToValueAtTime(610, t + 1.25);
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1900; f.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.026, t + 0.2);
    g.gain.exponentialRampToValueAtTime(0.013, t + 0.72);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
    g.gain.linearRampToValueAtTime(0, t + 1.34 - 0.005);
    o.connect(f); f.connect(g);
    if (this.ctx.createStereoPanner) {
      const pan = this.ctx.createStereoPanner();
      pan.pan.setValueAtTime(-0.65, t); pan.pan.linearRampToValueAtTime(0.55, t + 1.2);
      g.connect(pan); pan.connect(this.musicBus);
    } else g.connect(this.musicBus);
    o.start(t); o.stop(t + 1.34);
  }

  // A jump you can actually hear rising: one square wave gliding up over two
  // and a half octaves, with the envelope HELD through the climb so the sweep
  // is still loud when it reaches the top. A plain decaying osc() swallows the
  // top of the glide, which is what made the old one feel flat.
  jumpTone(when = 0, pitch = 1, gain = 0.2) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const dur = 0.17;
    const o = this.ctx.createOscillator();
    const f = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    o.type = 'square';
    // A bare square puts harmonics at 3.4k/5.7k by the top of the sweep —
    // right where the ear is most sensitive — so this read as louder than
    // cues sitting at the same gain. Roll them off instead of only pulling
    // the level down. Non-resonant, so the shape of the sweep is untouched.
    f.type = 'lowpass';
    f.Q.value = 0.7;
    f.frequency.setValueAtTime(2200 * pitch, t);
    o.frequency.setValueAtTime(200 * pitch, t);
    o.frequency.exponentialRampToValueAtTime(1150 * pitch, t + dur * 0.82);
    g.gain.setValueAtTime(0.0001, t);
    const peak = gain * this.cueGain;
    g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
    g.gain.setValueAtTime(peak, t + dur * 0.45); // shorter hold: a blip, not a blast
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.03);
    g.gain.linearRampToValueAtTime(0, t + dur + 0.05 - 0.005);
    o.connect(f); f.connect(g); g.connect(this.sfxGain);
    o.start(t); o.stop(t + dur + 0.05);
  }

  // ONE BARK.
  //
  // Three rewrites of this cue read as percussion, then as a synth note, then
  // as hiss with a tone behind it. The first two failed for being CLEAN — a
  // pitched oscillator through a filter is a musical instrument however its
  // envelope is drawn. The third failed for the opposite reason, and it took a
  // measurement rather than an ear to name it: it put ~60% of its magnitude
  // above 6kHz, where a real bark puts about 15% and keeps the bulk between
  // 500Hz and 2kHz. Broadband is not the same as bright.
  //
  // So this is the graph from the bench in src/dev/dog-bark-synth.js, where the
  // shape that ships was dialled in by ear. It is built from the four parts a
  // bark actually has, each with its own control, rather than from one summed
  // source bank through one tract:
  //
  //   1. THE FOLD SOURCE, and its DROP. A sawtooth whose pitch is slammed down
  //      `pitchDrop` SEMITONES over the first tenth of a second. That fall is
  //      the single most identifying gesture in a bark — more than the
  //      formants, more than the noise. Hold the pitch and no amount of
  //      resonance rescues it. A half-rate detuned twin (`sub`) rides under it:
  //      real folds slam irregularly and throw subharmonics, and that tearing
  //      is most of what says ANIMAL.
  //   2. THE THROAT TRANSIENT. A noise burst through a bandpass, gone in 30-80ms
  //      (`plosive`) — the chest emptying before the voice catches up. It goes
  //      past the tract, because it IS the throat.
  //   3. THE TRACT. Two peaking formants, PEAKING and not bandpass: a bandpass
  //      throws away the broadband air that makes a bark carry and hands back a
  //      filtered buzz. F1 flies open on the onset and shuts across the bark —
  //      that sweep is the "wo-of" — while F2 holds the muzzle. Aspiration goes
  //      through them too, which is what fuses air and voice into one throat
  //      instead of a hiss sitting behind a tone.
  //   4. THE BODY. A soft-clip waveshaper for vocal strain, then a short
  //      feedback delay for chest cavity depth. That order, not the reverse: a
  //      real chest resonates a voice that is already strained.
  //
  // The aspiration is LOWPASSED above the tract, sweeping down as the mouth
  // closes. That one filter is the whole difference between the measurement
  // above and a bark, and it is why `bright` can be pushed hard without the cue
  // turning back into a cymbal — the top air it adds is deliberate and narrow.
  //
  // The envelope is the last part of the identity: near-instant attack, body
  // gone inside a third of the length, then a tail as the mouth closes.
  // Anything with a plateau in the middle sounds held, and nothing about a bark
  // is held.
  //
  // `S` is a shape (see BARK_SHAPES) so the cue can be auditioned through
  // tools/render-cues.js — `dogBark:finish` — rather than through a second
  // synth that only approximates it. The shape's vocabulary is the bench's, so
  // a dial-in is pasted in without translation.
  dogWoof(when, pitch, f0, gain, S) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + when;
    const dur = S.dur;
    const tail = dur * 0.55 + 0.05;      // the mouth closing, past the voiced body
    const stop = t + dur + tail;
    const peak = gain * this.cueGain;

    // ---- output: strain -> chest -> level --------------------------------
    // The cue's LEVEL is applied here, after the waveshaper, and the envelope
    // above it is drawn to unit peak. That order is not cosmetic: a shaper is
    // non-linear by definition, so a signal that arrives at it quieter comes out
    // with a different amount of strain on it. Put the cue's gain before it and
    // the distance fade in updateEntities re-voices the dog as it passes instead
    // of just turning it down — and the cue stops scaling linearly with
    // SFX_TRIM, which makes it impossible to level.
    const level = ctx.createGain();
    level.gain.value = peak;
    level.connect(this.sfxGain);

    const shaper = ctx.createWaveShaper();
    shaper.curve = this.softClipCurve(S.distortion);
    shaper.oversample = '4x';
    // Soft clipping raises the average as it flattens the peaks, so the drive
    // is backed off after it: `distortion` has to change TIMBRE, not volume, or
    // every shape needs re-levelling the moment it is touched.
    const postDrive = ctx.createGain();
    postDrive.gain.value = 1 / (1 + S.distortion * 1.6);
    shaper.connect(postDrive); postDrive.connect(level);

    if (S.chest > 0.001) {
      // A very short feedback delay IS a resonator: 7.2ms rings around 140Hz,
      // which is where a big dog's chest lives. Lowpassed inside the loop so it
      // darkens as it decays rather than ringing metallic.
      const dl = ctx.createDelay(0.1);
      dl.delayTime.value = 0.0072;
      const fb = ctx.createGain();
      fb.gain.value = 0.45 + S.chest * 0.25;
      const damp = ctx.createBiquadFilter();
      damp.type = 'lowpass';
      damp.frequency.value = 900;
      const wet = ctx.createGain();
      wet.gain.value = S.chest * 0.5;
      postDrive.connect(dl); dl.connect(damp); damp.connect(fb); fb.connect(dl);
      dl.connect(wet); wet.connect(level);
      // The loop outlives the bark by design (that is the ring), but it must
      // not outlive the CUE — an undamped delay left running is a voice that
      // never frees. Shut the feedback at the tail.
      fb.gain.setValueAtTime(fb.gain.value, stop);
      fb.gain.linearRampToValueAtTime(0, stop + 0.08);
    }

    // The tremor that makes the voice ragged rather than sung. On the SUMMED
    // tract output, so air and buzz roughen together — modulate only the
    // oscillator and the ear hears two sounds instead of one animal.
    const rough = ctx.createGain();
    rough.gain.value = 1 - S.rough;
    const lfo = ctx.createOscillator();
    lfo.type = 'sawtooth';
    lfo.frequency.setValueAtTime(S.roughHz, t);
    lfo.frequency.linearRampToValueAtTime(S.roughHz * 0.55, t + dur);
    const lfoAmt = ctx.createGain();
    lfoAmt.gain.value = S.rough;
    lfo.connect(lfoAmt); lfoAmt.connect(rough.gain);
    rough.connect(shaper);
    lfo.start(t); lfo.stop(stop);

    // ---- envelope: hit, collapse, tail. No sustain anywhere --------------
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(1, t + 0.005);
    env.gain.exponentialRampToValueAtTime(0.3, t + dur * 0.32);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur + tail * 0.7);
    env.gain.linearRampToValueAtTime(0, stop);
    env.connect(rough);

    // ---- 3. the vocal tract ----------------------------------------------
    // Scaled by `pitch` so a cue pitched up gets a smaller mouth as well as a
    // higher voice — the run wobbles this per bark so no two dogs twin.
    const f1 = ctx.createBiquadFilter();
    f1.type = 'peaking';
    f1.Q.value = 4;
    f1.gain.value = 16;
    const ff = S.formantFreq * pitch;
    f1.frequency.setValueAtTime(ff * 0.62, t);
    f1.frequency.linearRampToValueAtTime(ff, t + dur * 0.14);
    f1.frequency.exponentialRampToValueAtTime(Math.max(80, ff * 0.45), t + dur + tail * 0.5);

    const f2 = ctx.createBiquadFilter();
    f2.type = 'peaking';
    f2.Q.value = 3.2;
    f2.gain.value = 12;
    f2.frequency.setValueAtTime(S.formant2 * pitch, t);
    f2.frequency.linearRampToValueAtTime(S.formant2 * pitch * 0.82, t + dur + tail * 0.5);

    // A third resonance, low-Q and fixed: the bite at the top the ear finds
    // first on a small speaker. Cheap, and the difference between "dog" and
    // "dog heard through a wall".
    const f3 = ctx.createBiquadFilter();
    f3.type = 'peaking';
    f3.Q.value = 2.4;
    f3.gain.value = 7;
    f3.frequency.value = Math.min(4200, Math.max(2200, S.formant2 * pitch * 1.5));

    f1.connect(f2); f2.connect(f3); f3.connect(env);

    // ---- 1. the fold source, and its drop --------------------------------
    // A fast snap UP on the onset (the folds catching), then the whole fall.
    // Exponential, so it drops fastest first: a linear fall reads as a
    // sequenced glide rather than as an animal.
    const base = f0 * pitch;
    const end = Math.max(35, base / Math.pow(2, S.pitchDrop / 12));
    const dropTime = Math.min(0.2, Math.max(0.05, dur * 0.9));
    const fold = (mult, detune, lv) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.detune.value = detune;
      osc.frequency.setValueAtTime(base * mult * 0.8, t);
      osc.frequency.linearRampToValueAtTime(base * mult * 1.06, t + 0.012);
      osc.frequency.exponentialRampToValueAtTime(end * mult, t + dropTime);
      // Past the drop it keeps sagging gently — the animal running out of air.
      osc.frequency.exponentialRampToValueAtTime(end * mult * 0.86, t + dur + tail * 0.6);
      const g = ctx.createGain();
      g.gain.value = lv;
      osc.connect(g); g.connect(f1);
      osc.start(t); osc.stop(stop);
    };
    fold(1, 0, 0.5);
    // The subharmonic twin, detuned so it BEATS against the fundamental rather
    // than locking to it. This is the tear in the voice.
    if (S.sub > 0.001) fold(0.5, 15, 0.5 * S.sub);
    // A growl smeared under the onset: a third fold an octave and a half down,
    // gone as the bark proper takes over.
    if (S.growl > 0.001) {
      const g = ctx.createOscillator();
      g.type = 'sawtooth';
      g.frequency.setValueAtTime(base * 0.34, t);
      g.frequency.exponentialRampToValueAtTime(base * 0.26, t + dur);
      const gg = ctx.createGain();
      gg.gain.setValueAtTime(S.growl * 0.4, t);
      gg.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.8);
      g.connect(gg); gg.connect(f1);
      g.start(t); g.stop(stop);
    }

    // ---- 2. throat and air -----------------------------------------------
    const air = ctx.createBufferSource();
    air.buffer = this.barkNoise();
    air.loop = true;
    // Never the same air twice. Seeded offline (see _noiseRandom), so a render
    // still repeats exactly.
    air.playbackRate.value = 0.8 + this.barkRnd() * 0.4;
    // Rolled off ABOVE the tract, sweeping down as the mouth closes. This one
    // filter is what keeps the aspiration inside the bands the formants work
    // on instead of piling it above 6k where it reads as hiss.
    const airLP = ctx.createBiquadFilter();
    airLP.type = 'lowpass';
    airLP.frequency.setValueAtTime(5200 * pitch, t);
    airLP.frequency.linearRampToValueAtTime(3200 * pitch, t + dur);
    airLP.Q.value = 0.6;
    const airG = ctx.createGain();
    airG.gain.setValueAtTime(S.breath, t);
    airG.gain.linearRampToValueAtTime(S.breath * 0.45, t + dur);
    air.connect(airLP); airLP.connect(airG); airG.connect(f1);
    air.start(t); air.stop(stop);

    // The plosive: the chest emptying, bandpassed around the throat and gone in
    // 30-80ms. Past the tract — it is the throat, not the mouth.
    const burst = ctx.createBufferSource();
    burst.buffer = this.barkNoise();
    burst.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.5;
    bp.frequency.setValueAtTime(Math.min(2400, Math.max(700, ff * 1.7)), t);
    bp.frequency.exponentialRampToValueAtTime(Math.min(1600, Math.max(300, ff * 0.9)), t + 0.06);
    const bg = ctx.createGain();
    const puff = Math.min(0.08, Math.max(0.03, 0.03 + dur * 0.28));
    bg.gain.setValueAtTime(0.0001, t);
    bg.gain.linearRampToValueAtTime(1.1 * S.plosive, t + 0.004);
    bg.gain.exponentialRampToValueAtTime(0.0001, t + puff);
    burst.connect(bp); bp.connect(bg); bg.connect(rough);
    burst.start(t); burst.stop(t + puff + 0.02);

    // Unfiltered top air alongside the tract. Real barks are not fully
    // resonated, and this is what survives a phone speaker. Highpassed so it
    // cannot become a cymbal.
    if (S.bright > 0.001) {
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1800 * pitch;
      const hg = ctx.createGain();
      hg.gain.value = S.bright;
      airG.connect(hp); hp.connect(hg); hg.connect(env);
    }
  }

  // Pink noise for the bark, built once and kept. Pink rather than the white in
  // `noiseBuf`, because a throat is not a hi-hat: white through this tract lands
  // the aspiration an octave too high and undoes the lowpass above.
  barkNoise() {
    if (this.barkBuf) return this.barkBuf;
    const sr = this.ctx.sampleRate;
    const len = Math.floor(sr * 1.0);
    this.barkBuf = this.ctx.createBuffer(1, len, sr);
    const d = this.barkBuf.getChannelData(0);
    const rnd = this._noiseRandom();
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = rnd() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.0990460;
      b1 = 0.96300 * b1 + w * 0.2965164;
      b2 = 0.57000 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.22;
    }
    return this.barkBuf;
  }

  // The per-bark wobble, on the same seeded source as the noise so an offline
  // render of the cue repeats exactly.
  barkRnd() {
    if (!this._barkRnd) this._barkRnd = this._noiseRandom();
    return this._barkRnd();
  }

  // Soft clip for vocal strain. tanh, as a curve table because WaveShaperNode
  // wants one, and odd-symmetric so it adds ODD harmonics — the buzz of a voice
  // pushed hard, not the fizz of a fuzzbox. Cached per drive: the bark fires
  // four at a time and the table is 2048 floats.
  softClipCurve(k) {
    const key = Math.round(k * 100);
    this._clipCurves = this._clipCurves || new Map();
    const had = this._clipCurves.get(key);
    if (had) return had;
    const n = 2048;
    const curve = new Float32Array(n);
    const drive = 1 + (key / 100) * 24;
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * drive) / Math.tanh(drive);
    }
    this._clipCurves.set(key, curve);
    return curve;
  }

  // One PAC-style bite: pitch and filter glide down as the mouth closes and
  // back up as it opens. The glide is what makes it read as "waka" rather
  // than a beep — a square through a resonant lowpass keeps the mouthy timbre.
  // `hold` is the fraction of the note spent at full level before the release.
  // The coin bite uses a shorter one than the hazard chomp: it fires on every
  // pickup, and it's the sustain — not the peak — that made it wearing.
  waka(when = 0, pitch = 1, gain = 0.13, hold = 0.75) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const dur = 0.12;
    const o = this.ctx.createOscillator();
    const f = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    o.type = 'square';
    f.type = 'lowpass';
    f.Q.value = 6;
    o.frequency.setValueAtTime(1000 * pitch, t);
    o.frequency.linearRampToValueAtTime(280 * pitch, t + dur * 0.5);
    o.frequency.linearRampToValueAtTime(940 * pitch, t + dur);
    f.frequency.setValueAtTime(2600 * pitch, t);
    f.frequency.linearRampToValueAtTime(700 * pitch, t + dur * 0.5);
    f.frequency.linearRampToValueAtTime(2400 * pitch, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    const peak = gain * this.cueGain;
    g.gain.exponentialRampToValueAtTime(peak, t + 0.006);
    g.gain.setValueAtTime(peak, t + dur * hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.01);
    g.gain.linearRampToValueAtTime(0, t + dur + 0.03 - 0.005);
    o.connect(f); f.connect(g); g.connect(this.sfxGain);
    o.start(t); o.stop(t + dur + 0.03);
  }

  // A 25% duty-cycle pulse — the classic arcade PSG timbre, hollow and reedy
  // where a square is fat. Built from the exact Fourier series for the duty
  // (b_n = 2/(nπ)·sin(nπd)) rather than a hand-picked pair of partials, and
  // cached because a PeriodicWave is immutable and not cheap to build.
  pulseWave(duty = 0.25, harmonics = 24) {
    if (!this.ctx) return null;
    // One implementation, in src/engine/voices.js, shared with the layer synth's `pulse`
    // waveform. `sine: true` and 24 harmonics are what this cue was built on, and keeping
    // both is what makes its render bit-identical to every WAV already on disk.
    return pulseTable(this.ctx, duty, { harmonics, sine: true });
  }

  // The arcade death jingle: eleven rapid downward sweeps that each start and
  // end lower than the last, then a two-tone drop where the sprite blinks out.
  //
  // Three things make it read as THE sound rather than "a descending beep":
  //   * the sweep is STEPPED, not glided. The original PSG walked its frequency
  //     register in discrete increments and the staircase is audible — it's the
  //     buzz inside the fall. A smooth exponentialRamp sounds like a slide
  //     whistle instead.
  //   * every sweep re-articulates. The level jumps back up at the top of each
  //     cycle and sags across it, which is what gives the pulsing "wobble".
  //   * it slows down as it goes. Cycles lengthen and quieten toward the end,
  //     so the thing runs out of life instead of stopping.
  // Then the tail: ~145Hz for 80ms and a final ~110Hz pluck that collapses to
  // nothing — the "bloop-bloop" as the sprite folds up and vanishes.
  pacDeath(when = 0) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + when;
    const wave = this.pulseWave(0.25);
    const q = this.cueGain;

    const CYCLES = 11;
    const STEPS = 14;          // frequency staircase per sweep
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    // Non-resonant roll-off: a 25% pulse puts real energy up at the 5th and 7th
    // harmonic, and at the top of the first sweeps that lands in the ear's
    // sorest band. Track it down with the pitch so the fall gets duller as it
    // gets lower, the way the cabinet's little speaker did it for free.
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 0.7;
    lp.frequency.setValueAtTime(6200, t0);
    if (wave) o.setPeriodicWave(wave); else o.type = 'square';

    const peak0 = 0.15 * q;
    g.gain.setValueAtTime(0.0001, t0);
    let t = t0;
    for (let i = 0; i < CYCLES; i++) {
      const k = i / (CYCLES - 1);
      const top = 1560 * Math.pow(0.943, i);   // ~1560Hz down to ~840Hz
      const bot = 470 * Math.pow(0.962, i);    // ~470Hz down to ~310Hz
      const dur = 0.082 + 0.042 * k;           // 82ms at full pelt, 124ms by the end
      for (let s = 0; s < STEPS; s++) {
        const f = top * Math.pow(bot / top, s / (STEPS - 1));
        o.frequency.setValueAtTime(f, t + dur * (s / STEPS));
      }
      const peak = peak0 * (1 - 0.4 * k);
      // First cycle fades in over 5ms so the pulse doesn't start on a click;
      // the rest snap back to full at the top of their sweep.
      if (i === 0) g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
      else g.gain.setValueAtTime(peak, t);
      g.gain.linearRampToValueAtTime(peak * 0.5, t + dur * 0.93);
      t += dur;
    }
    lp.frequency.exponentialRampToValueAtTime(2400, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
    g.gain.linearRampToValueAtTime(0, t + 0.05 - 0.005);
    o.connect(lp); lp.connect(g); g.connect(this.sfxGain);
    o.start(t0); o.stop(t + 0.05);

    // ---- the tail: sprite folds up, sprite is gone ----------------------
    const drop = (f0, f1, at, dur, gain, sub = 0) => {
      const to = this.ctx.createOscillator();
      const tg = this.ctx.createGain();
      const tf = this.ctx.createBiquadFilter();
      tf.type = 'lowpass'; tf.Q.value = 0.9; tf.frequency.value = 1800;
      if (wave) to.setPeriodicWave(wave); else to.type = 'square';
      to.frequency.setValueAtTime(f0, at);
      to.frequency.exponentialRampToValueAtTime(f1, at + dur);
      tg.gain.setValueAtTime(0.0001, at);
      tg.gain.exponentialRampToValueAtTime(gain, at + 0.006);
      tg.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      tg.gain.linearRampToValueAtTime(0, at + dur + 0.02 - 0.005);
      to.connect(tf); tf.connect(tg); tg.connect(this.sfxGain);
      to.start(at); to.stop(at + dur + 0.02);
      // A sine an octave under the final pluck: the pulse alone is all buzz and
      // no weight, and on laptop speakers the last note has to land.
      if (sub > 0) {
        const so = this.ctx.createOscillator(); so.type = 'sine';
        const sg = this.ctx.createGain();
        so.frequency.setValueAtTime(f0 * 0.5, at);
        so.frequency.exponentialRampToValueAtTime(Math.max(24, f1 * 0.5), at + dur);
        sg.gain.setValueAtTime(0.0001, at);
        sg.gain.exponentialRampToValueAtTime(sub, at + 0.008);
        sg.gain.exponentialRampToValueAtTime(0.0001, at + dur);
        sg.gain.linearRampToValueAtTime(0, at + dur + 0.02 - 0.005);
        so.connect(sg); sg.connect(this.sfxGain);
        so.start(at); so.stop(at + dur + 0.02);
      }
    };
    // A breath between the sweeps and the tail — the pause is half the gag.
    const tailAt = t + 0.07;
    drop(190, 132, tailAt, 0.085, 0.2 * q);
    drop(118, 38, tailAt + 0.095, 0.15, 0.22 * q, 0.16 * q);
  }

  // The portal's room, built once on first use and kept.
  //
  // A SEND owned by this one cue, not reverb on the SFX bus. sfxGain carries
  // every jump, coin and footstep in the game, and those are all sounds made
  // inches from the player — wetting them is a whole-game art decision, not a
  // credits tweak. This way exactly one cue is in a room.
  //
  // makeReverb is the desk's convolution reverb from effects.js (seeded impulse
  // response — see the note there on why it is ours and not Tone's), which is
  // plain Web Audio underneath and so drops onto the SFX side unchanged.
  portalVerbSend() {
    if (this.portalSend) return this.portalSend;
    const send = this.ctx.createGain();
    send.gain.value = 1;
    // Filter the SEND, not the cue: the dry swoosh keeps its full top end while
    // the tail loses it, which is what puts the room behind the sound rather
    // than on top of it. The highpass matters just as much — the cue's 95→42Hz
    // thump convolved into a second-and-a-half tail is mud, not weight.
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 240;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 3600;
    // Fully wet: the dry path is the cue's own direct connection, so anything
    // less here would just double the dry signal at the wrong level.
    const verb = makeReverb(this.ctx, { decay: PORTAL_VERB_DECAY, preDelay: 0.018, wet: 1 });
    send.connect(hp); hp.connect(lp); lp.connect(verb.input);
    verb.output.connect(this.sfxGain);
    this.portalVerb = verb;
    this.portalSend = send;
    return send;
  }

  // A hero crossing the portal in the credits hand-off: rush IN, flash, rush
  // OUT. Deliberately three parts rather than one burst — the art either side
  // of the swap is two different heroes running two different directions, and a
  // single symmetrical whoosh would sit on top of that instead of describing it.
  //
  // The cue is ~0.5s and the transit's ACTIVE window is ~4s, so this punctuates
  // the crossing; it does not score it.
  //
  // NOTE the cue does NOT start at the crossing — its flash is
  // PORTAL_CUE_FLASH_AT into it, so the caller has to fire it that far ahead or
  // the rise lands on the wrong hero. See CreditsState.enter().
  /**
   * @param {object} shape  How long and how wide, with 1 meaning exactly as authored.
   *   stretch — scales the sweeps AND the seam, so the flash stays at the joint
   *   q       — resonance of the swept bands: up is whistly, down is airy hiss
   *   spread  — how far the bands travel, which is how much movement you hear
   *   wet     — how much of it goes into the room
   *   thump   — the low sine under the seam. 0 takes it out entirely.
   *   flash   — the two-partial discharge at the seam. 0 takes it out entirely.
   *   pan     — how far the two legs travel across the stereo field. 0 is centred.
   *   overlap — seconds of the exit pulled back UNDER the approach, so the leg going
   *             out and the leg coming in cross rather than queue.
   *   legs    — 'both', or one half of the gesture on its own. The two legs of this cue
   *             answer different questions and can be fired at different moments: 'in'
   *             is a hero arriving at a doorway, 'out' is one going through it. Split,
   *             the rise can play on approach — whether or not the portal is taken —
   *             and the fall can wait for the crossing, which is the only moment that is
   *             actually knowable. See RunState.updatePortal.
   *   body    — bottom end under the gesture. 0 is none.
   *   swell   — a FLOOR under each leg's attack, as a fraction of its own length. The
   *             exit leg attacks in 4% of its duration by design, because it was written
   *             as a departure that starts bright and falls away; dragged forward by
   *             `overlap` that same attack arrives with nothing in front of it and reads
   *             as a drum hit. Raising the floor makes it swell in instead.
   * Defaults reproduce the original cue sample for sample; the credits rely on that.
   */
  // The speed ramp's payout. It used to borrow 'dash' — one bandpassed noise
  // swish at 0.18 — which is a body moving, not a machine firing, and at that
  // gain it sat under the music where the thing it reports is the single most
  // generous event in the lane.
  //
  // NO LOW SINE. The first pass opened with a 190->58Hz kick for "the shove in
  // the legs", and a descending sine under a transient is the exact recipe for
  // a kick drum — it read as percussion, which put the cue on the beat grid
  // instead of on the event. Everything here now RISES, because the one thing
  // the cue has to say is that you got faster.
  //
  // A short high click for the attack (an edge, not a thump), a sawtooth sweep
  // as the body, a detuned square above it for fizz, two noise bands for air —
  // the live filter cannot sweep, so two overlapping bursts fake the rise —
  // and a bright tail that resolves upward instead of just stopping.
  // Roughly twice the level of the first pass, and half again as long. The
  // reason it went unnoticed was not only gain: it was 0.16s of mostly HIGH
  // noise, and high noise is the first thing a busy mix masks — every cabinet's
  // music has hats and the arcade room tone sits right on top of it. The sweep
  // now starts down at 200Hz where nothing else in the cue lives, and holds
  // long enough (0.3s) to register as an event rather than a tick.
  // Fourth pass, on the note that the payout still felt weak next to its own
  // telegraph. Two things were wrong and neither was the top end. The cue had
  // no WEIGHT — everything lived at 200Hz and up, so it was bright and thin
  // where the thing it describes is the hero being shoved — and it was short
  // where the tick run leading into it had been getting steadily longer. So: a
  // saw an octave below the sweep for body, everything up a few dB, and the
  // upward resolve held longer so the cue ENDS on the rise rather than getting
  // out of the way of it. Still nothing descending anywhere — a falling layer
  // auditioned as a kick drum, and that is what got the first pass thrown out.
  //
  // Fifth pass: LENGTH. Everything above was about level and weight, and the
  // cue still ran out before the event did — the hero is visibly still being
  // carried when the sound has already finished, and a payout that stops early
  // reports a smaller thing than happened. Layer durations are up ~1.8x, to
  // about 0.6s. Only the durations: the sweep travels the same 200->1500Hz, it
  // just takes longer to get there, so the cue is a shove rather than a snap.
  // The attack edge does NOT stretch — a transient that lengthens stops being
  // a transient — and the rising layers are staggered further apart so the
  // second half of the cue is still climbing rather than merely ringing out.
  boostWhoosh() {
    if (!this.ctx) return;
    this.noise(0.035, 0.26, 'highpass', 4500);          // attack edge
    this.osc('sawtooth', 100, 750, 0.6, 0.24);          // body, an octave down
    this.osc('sawtooth', 200, 1500, 0.55, 0.38);        // the sweep, body
    this.osc('square', 300, 2200, 0.42, 0.2, 0.01);     // fizz above it
    this.noise(0.3, 0.3, 'bandpass', 900);              // air, low band
    this.noise(0.5, 0.34, 'bandpass', 2800, 0.06);      // air, rising
    this.osc('triangle', 1568, 2350, 0.34, 0.26, 0.22); // resolves up, late
  }

  // The approach tick. Deliberately tiny — it fires several times as the hero
  // closes on a pad and the pads are common, so anything with a body would
  // become the loudest repeated thing in a run. Pitch rises with the arm, so
  // the sequence itself is the telegraph rather than any single blip.
  boostTick(pitch = 1) {
    if (!this.ctx) return;
    // Third pass on the level. The first two treated this as a click; the
    // problem is that a click has almost no ENERGY however loud you make its
    // peak — the ear integrates over roughly 50ms, so a 30ms blip at 0.12 is
    // quieter to listen to than a 60ms tone at 0.12 even though a meter says
    // otherwise. It is now long enough to be heard rather than merely detected,
    // and the sine under it carries a pitch the square alone does not.
    // Trimmed about 3dB off that pass. The length is what made it audible, so
    // the length stays and only the level comes down — a run of seven or eight
    // of these was sitting on top of the music rather than under it.
    //
    // Fifth pass gives about half of that back (+2.5dB), on the strength of two
    // changes since. The run is SHORTER than the one that trim was measured
    // against — three ticks on the approach at running speed, not seven or eight
    // — so there is less of it to pile up. And it is now snapped to the song's
    // key (see keyedTickPitch in run.js), which is what makes the extra level
    // affordable: the earlier version was fighting the music harmonically as
    // well as in level, and the cure for a cue that clashes is not to hide it.
    this.osc('square', 1500 * pitch, 1500 * pitch, 0.06, 0.185);
    this.osc('sine', 750 * pitch, 750 * pitch, 0.085, 0.146);
  }

  /**
   * One rung of the loop-de-loop's climb.
   *
   * The ride is the longest single thing that happens to the hero without him
   * touching a button, and silence through it made the whole set piece feel like
   * a cutscene. What it wanted was not a cue but a RUN — a figure that is still
   * arriving while he is still going round, so the ending is heard coming.
   *
   * Built as a stepped arpeggio rather than one long riser for two reasons. The
   * game already says "something is building" this way — the boost pad's tick
   * run, the cone chain's arpeggio — so the vocabulary is learned. And a run of
   * one-shots survives a ride that ends early: bail out of the loop and the
   * figure simply stops partway up, which is exactly the right sound for having
   * let go of something. A sustained voice would have to be chased down and
   * silenced from three different exits.
   *
   * `swell` is how far round he is, 0..1, and it is the difference between an
   * arpeggio and a climb: the note keeps its shape while the air behind it opens
   * up, so the last rungs are wider and brighter than the first without ever
   * getting louder in a way that fights the music.
   *
   * NOTHING IN HERE IS A SHORT BRIGHT SQUARE, and that is the whole of the
   * second pass. The first one led with a square blip that reached up past 2kHz
   * on the high rungs — which is precisely the coin: 'coin' is two square pings
   * at 988 and 1319. The ride collects eight coins while this is playing, so the
   * two cues were not merely similar, they were interleaved, in the same band,
   * on the same waveform. No amount of level would have separated them.
   *
   * So the climb takes the octave BELOW the coin and keeps it: a sawtooth root
   * at 175Hz, and even the top rung of the run lands under 800 — clear of where
   * the coin starts. The onset is a filtered chuff rather than a tonal blip, so
   * a rung starting and a coin landing do not sound like the same event, and the
   * notes are long enough to overlap into each other. That overlap is the point.
   * The scale is pentatonic (see LOOP_ARPEGGIO), so three or four notes ringing
   * together are consonant by construction — the figure thickens into a chord as
   * he goes round instead of ticking past as separate pings, which is what
   * "builds" actually sounds like.
   *
   * `when` is here for the same reason 'die' and 'debris' carry one: the cue is
   * a SEQUENCE, and a sequence cannot be auditioned one blip at a time. The game
   * always fires it at zero — the run schedules the rungs itself, off the angle
   * he has covered — but a renderer has to lay the whole figure out in one
   * offline context to hear whether it actually builds.
   */
  loopRun(pitch = 1, swell = 0, when = 0) {
    if (!this.ctx) return;
    const s = Math.max(0, Math.min(1, swell));
    // LEVEL, third pass. The figure measured loud and sounded quiet, which is
    // the signature of a cue living too low to be heard at its own peak: nearly
    // all of its energy is at 87-175Hz, where the ear needs far more of it for
    // the same loudness, so it was reading -6.5 dBFS on a meter — the hottest
    // cue in the game — while sitting under the music.
    //
    // Raising the gains alone would only have made that worse, because the peak
    // was not the note, it was the ATTACK: all four layers started on the same
    // sample and their onsets summed. Staggering the body and the air by a few
    // milliseconds decorrelates that stack, which both buys the headroom the
    // extra gain needs and is the more honest shape anyway — a body that swells
    // in behind its own onset rather than arriving with it.
    //
    // The two upper layers take the larger share of the increase for the same
    // equal-loudness reason: gain spent at 900-2000Hz buys more audible cue per
    // dB of peak than gain spent on the octave below middle C.
    // Each rung is itself a small rise. A flat note repeated up a scale reads as
    // a xylophone being played; one that lifts inside its own length reads as
    // acceleration, which is what is happening to him.
    //
    // LONG, and held rather than left to decay. osc's default envelope runs
    // exponentially to silence across the whole duration, which is 13dB down a
    // fifth of the way in — so simply asking for a longer note buys almost
    // nothing audible. `hold` is what makes the tail actually last, and the tail
    // is what carries one rung into the next.
    this.osc('sawtooth', 175 * pitch, 190 * pitch, 0.26, 0.075 + 0.03 * s, when, null, 0.42);
    // Body an octave down, in from the start now rather than arriving late: at
    // this register it is the weight that separates the figure from everything
    // else in the mix, so it is not a garnish to add later.
    this.osc('triangle', 87 * pitch, 95 * pitch, 0.3, 0.085 + 0.045 * s, when + 0.012, null, 0.45);
    // The onset. A chuff of filtered air rather than a tonal tick, because a
    // tonal tick at the front of each note is the thing that read as a coin.
    this.noise(0.045, 0.075 + 0.035 * s, 'bandpass', 900 + 500 * s, when);
    // Air, opening as he goes round — the layer doing the actual building. Kept
    // under 2kHz even at full swell so the top of the climb never crowds the
    // coins landing on top of it.
    this.noise(0.16 + 0.14 * s, 0.055 + 0.06 * s, 'bandpass', 1100 + 900 * s, when + 0.008, 0.45);
  }

  // The MISS: a slide whistle going down. One whomp.
  //
  // Three versions lost before this one, and each failure is worth keeping:
  //
  //   the approach tick replayed at falling pitch. Five discrete blips in 0.18s
  //   are a SEQUENCE the ear has to assemble into a fall, and there is no time
  //   to assemble it. Raising the level fixed the audibility and left the shape
  //   wrong; it still arrived as five things.
  //   two separate whistles 0.2s apart. Closer, but it read as two falls. The
  //   gap was never the culprit — the RE-ATTACK was. An envelope that returns
  //   to silence and rises again is a NEW NOTE however tight behind the last
  //   one it sits, so no amount of closing the gap would have fused them.
  //
  // So: one envelope, one attack, and a pitch that never stops moving. The tone
  // comes up once and falls all the way to the floor without ever being
  // re-struck, which is the only construction the ear takes as a single gesture.
  //
  // The fall ACCELERATES rather than gliding at a constant rate — 43 semitones
  // per second down to 820Hz, then 66 the rest of the way. That is a slide
  // whistle being yanked rather than drawn, and it is where the comedy lives:
  // a constant-rate glissando is a test tone. Two segments, but the pitch is
  // continuous across the seam, so it is one whomp with a bend in it and not
  // two of anything.
  //
  // What makes it a WHISTLE rather than a falling sine:
  //
  //   the octave. A slide whistle's fipple gives it a hard second partial, and
  //   without it the tone is a synth sweep.
  //   the breath. Noise through a bandpass that follows the slide down. A tone
  //   with no air in it is the single biggest tell, and a STATIC band is nearly
  //   as bad — the air has to move with the pitch.
  //   the level RISING as it descends. Equal loudness means a flat gain fades
  //   as the pitch drops, so the envelope climbs through the fall and the
  //   bottom of it lands rather than evaporates. This is the same correction
  //   the tick version needed, done continuously.
  boostFall() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const q = this.cueGain;
    // [seconds, from, to] segments, run back to back on ONE oscillator pair.
    // The seam carries the previous segment's value, so the pitch is continuous
    // across it — no step, no re-attack, no second note.
    const segs = [[0.2, 1350, 820], [0.32, 820, 240]];
    const total = segs.reduce((s, seg) => s + seg[0], 0);
    const end = t + total;

    // ONE envelope for the whole cue. Everything hangs off this, which is what
    // makes the whole cue one event.
    const g = this.ctx.createGain();
    const peak = 0.092;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak * q, t + 0.014);
    g.gain.exponentialRampToValueAtTime(peak * 1.55 * q, t + total * 0.9);  // the lift
    g.gain.exponentialRampToValueAtTime(0.0001, end + 0.08);
    g.gain.linearRampToValueAtTime(0, end + 0.1);
    g.connect(this.sfxGain);

    const schedule = (param, mul) => {
      param.setValueAtTime(segs[0][1] * mul, t);
      let at = t;
      for (const [dur, , to] of segs) {
        param.exponentialRampToValueAtTime(to * mul, at + dur);
        at += dur;
      }
    };

    const tone = (type, mul, amp) => {
      const o = this.ctx.createOscillator();
      o.type = type;
      schedule(o.frequency, mul);
      const a = this.ctx.createGain(); a.gain.value = amp;
      o.connect(a); a.connect(g);
      o.start(t); o.stop(end + 0.11);
    };
    tone('sine', 1, 1);
    tone('triangle', 2, 0.26);   // the fipple's octave

    // The air, tracking the slide. noise() takes a fixed frequency and so cannot
    // do this; a swept filter is the point.
    if (this.noiseBuf) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf; src.loop = true;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.Q.value = 3.5;
      schedule(bp.frequency, 1);
      const a = this.ctx.createGain(); a.gain.value = 0.5;
      src.connect(bp); bp.connect(a); a.connect(g);
      src.start(t); src.stop(end + 0.11);
    }
  }

  portalSwoosh({
    stretch = 1, q: qMul = 1, spread = 1, wet: wetMul = 1,
    thump = 1, flash = 1, pan: panSpread = 0, overlap = 0, swell = 0, legs = 'both',
    body = 0,
  } = {}) {
    if (!this.ctx || !this.noiseBuf) return;
    const t = this.ctx.currentTime;
    const q = this.cueGain;

    // A per-layer tap into the shared room. Each layer gets its OWN send amount
    // rather than the cue going in at one level, because they want different
    // distances: the approach is a hero still on this side of the doorway and
    // stays fairly dry, the flash is the portal itself and is the wettest thing
    // in the cue, and the exit trails away into the tail.
    // No cueGain here: every layer's own envelope is already trimmed by it, so
    // scaling the tap too would trim the room twice and leave it dry.
    const send = this.portalVerbSend();
    const wetTap = (amount) => {
      const w = this.ctx.createGain();
      w.gain.value = amount * PORTAL_VERB_SEND;
      w.connect(send);
      return w;
    };
    // osc() connects to a single destination, so layers built with it get a
    // splitter that feeds the dry bus and the room together.
    const dryWet = (amount) => {
      const n = this.ctx.createGain();
      n.connect(this.sfxGain);
      if (amount > 0) n.connect(wetTap(amount));
      return n;
    };

    // One noise source through a SWEPT bandpass. A fixed band is just a hiss —
    // it is the band's movement that reads as something travelling past. peakAt
    // places the loudest moment within the sweep, which is what separates an
    // approach (loudest as it arrives) from a departure (loudest as it leaves).
    const sweep = (at, dur, f0, f1, gain, Q, peakAt, wet = 0, panFrom = 0, panTo = 0) => {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf; src.loop = true;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.Q.value = Q * qMul;
      bp.frequency.setValueAtTime(f0, at);
      bp.frequency.exponentialRampToValueAtTime(f1, at + dur);
      const g = this.ctx.createGain();
      const peak = gain * q;
      const hold = Math.max(0.006, dur * Math.max(peakAt, swell));
      // LINEAR attack, unlike every other cue in here. Those all attack in 8ms,
      // where the curve is inaudible; a swoosh crescendos over a fifth of a
      // second, and an exponential ramp across that long spends most of it near
      // silence and then leaps — which reads as a swell with a click on it, not
      // as something approaching. Measured: exponential put the approach 32dB
      // down at its own halfway point.
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(peak, at + hold);
      // Decay in two stages for the same reason in reverse. A single
      // exponential to the floor is 20dB down by a third of the way through, so
      // a 0.3s tail was audible for 0.08s of it. Gliding to -30dB across the
      // whole window and only then dropping out spreads the fall over the time
      // the hero is actually still travelling.
      const rel = Math.min(0.03, (dur - hold) * 0.25);
      g.gain.exponentialRampToValueAtTime(peak * 0.03, at + dur - rel);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      g.gain.linearRampToValueAtTime(0, at + dur + 0.02 - 0.005);
      src.connect(bp); bp.connect(g);
      // A MOVING pan, not a placed one: something that passes you crosses the field
      // while it goes, and that movement is most of what reads as travel. Skipped
      // entirely at pan 0, so the centred cue is the same graph it always was.
      let out = g;
      if (panSpread > 0 && this.ctx.createStereoPanner) {
        const pn = this.ctx.createStereoPanner();
        pn.pan.setValueAtTime(panFrom * panSpread, at);
        pn.pan.linearRampToValueAtTime(panTo * panSpread, at + dur);
        g.connect(pn); out = pn;
      }
      out.connect(this.sfxGain);
      if (wet > 0) out.connect(wetTap(wet * wetMul));
      src.start(at); src.stop(at + dur + 0.02);
    };

    // The seam moves with the sweeps, or a stretched cue would flash a fifth of a
    // second in with half a second of approach still to run. Callers that fire this
    // ahead of a crossing have to lead by the same amount — see portalCueFlashAt.
    const SWAP = PORTAL_CUE_FLASH_AT * stretch;
    // Widening pushes each band's ENDS apart rather than sliding the whole range, so a
    // wider sweep travels further in the same direction rather than becoming a different
    // sound. `up`/`dn` because the approach climbs and the exit falls.
    const up = (f0, f1) => [f0 / spread, f1 * spread];
    const dn = (f0, f1) => [f0 * spread, f1 / spread];
    // Fired on its own, the fall IS the cue: it starts when it is asked to, because
    // there is no approach in front of it to wait for and its seam is its own beginning.
    const seam = legs === 'out' ? 0 : SWAP;

    // Approach: band climbing, level climbing, loudest at the doorway. Rising pitch is
    // the whole tell that this hero is going somewhere, not just running — the same
    // reason the animation accelerates into the portal. Driest layer in the cue: this
    // hero is still on THIS side of the doorway, and a wet approach makes the room
    // arrive before the portal does.
    if (legs !== 'out') sweep(t, 0.24 * stretch, ...up(240, 2800), 0.17, 1.6, 0.86, 0.3, -1, 0);

    // Exit: the mirror. Starts bright and open at full level, falls away dark. Longer
    // than the approach so the tail carries past the seam, matching the exit leg being
    // the longer of the two on screen. Wet — by now the room is open and the hero is
    // leaving through it. `overlap` slides it back under the approach, which is the
    // difference between a relay and a queue.
    if (legs !== 'in') {
      sweep(t + (legs === 'out' ? 0 : SWAP + 0.01 - overlap * stretch), 0.32 * stretch,
        ...dn(2600, 170), 0.14, 1.4, 0.04, 0.85, 0, 1);
    }

    // Bottom end that SWELLS rather than knocks.
    //
    // The cue used to get its weight from a 95Hz sine dropped under the seam, and that
    // WAS the knock: a transient in the middle of a swoosh, in the one place a swoosh
    // wants nothing to happen. This does the same job by the same means as everything
    // else in here — a second swept band, well below the first, on the same envelope —
    // so the weight arrives with the gesture instead of interrupting it.
    //
    // Broad Q, because this is a bed and not a note, and nearly dry: the send's highpass
    // would eat most of it anyway, and low end in a tail is the fastest way to turn a
    // room into mud. Louder than the bands above it because it is doing its work an
    // octave and a half down, where the ear needs more of it to hear the same amount.
    if (body > 0) {
      if (legs !== 'out') {
        sweep(t, 0.24 * stretch, ...up(70, 240), 0.20 * body, 0.7, 0.86, 0.08, -0.6, 0);
      }
      if (legs !== 'in') {
        sweep(t + (legs === 'out' ? 0 : SWAP + 0.01 - overlap * stretch), 0.32 * stretch,
          ...dn(260, 55), 0.22 * body, 0.7, 0.04, 0.15, 0, 0.6);
      }
    }

    // The flash at the seam. Teal energy rather than a bell: two partials a
    // fifth apart bending UP and out, which reads as a discharge instead of a
    // chime, and stays clear of the coin/cash family's ringing metal.
    // (osc() applies cueGain itself; only the hand-built sweeps above have to.)
    //
    // Fully into the room. This is the portal, and the tail it throws is what
    // makes the doorway sound like it opens onto somewhere much bigger than the
    // corridor the crawl is scrolling through.
    if (flash > 0) {
      this.osc('triangle', 700, 1500, 0.13, 0.085 * flash, Math.max(0, seam - 0.02), dryWet(1));
      this.osc('sine', 1050, 2250, 0.10, 0.05 * flash, Math.max(0, seam - 0.02), dryWet(1));
    }
    // ...and a short thump under it. Noise sweeps alone have no bottom, and on
    // laptop speakers the hand-off has to feel like something happened. Kept
    // nearly dry — the send's highpass would eat most of it anyway, and low end
    // in a tail is the fastest way to turn a room into mud.
    // THE KNOCK. Deliberate — noise sweeps have no bottom and this gives the handoff a
    // body on laptop speakers — but it is the loudest single element in the cue and it
    // lands square in the middle of the swoosh, which is exactly where a swoosh wants
    // nothing to happen. `thump: 0` takes it out; expect a thinner cue on small speakers.
    if (thump > 0) this.osc('sine', 95, 42, 0.16, 0.16 * thump, Math.max(0, seam - 0.01), dryWet(0.12));
  }

  sfx(name, opt = {}) {
    this.resumeAfterPanic();
    if (!this.ctx) return;
    // `opt.gain` scales this ONE firing, on top of the cue's own trim. For a cue used in
    // two places that want it at two strengths — the portal swoosh is a background swap
    // in the credits and the thing that announces a level starting — which is otherwise
    // a choice between changing it for both or copying it into a second name.
    this.cueGain = (SFX_TRIM[name] ?? 1) * (opt.gain ?? 1);
    const combo = opt.combo || 0;
    // opt.pitch is the direct form, for cues that want spread rather than a
    // combo ladder — the fireworks detune every shot so no two bursts twin.
    const pitch = opt.pitch ?? Math.pow(1.06, combo);
    switch (name) {
      // Quieter than 'coin' on purpose: it's a square wave (loud for its
      // amplitude) and it fires more often than any other cue in the game.
      case 'jump': this.jumpTone(0, 1, 0.055); break;
      case 'jump2': this.jumpTone(0, 1.5, 0.045); break; // double jump: same shape, a fifth up
      case 'land': this.noise(0.06, 0.15, 'lowpass', 400); break;
      // Two square pings a fourth apart, in the key of whatever is playing —
      // see coinNotes for why the numbers are not written down here.
      case 'coin': {
        const [lo, hi] = this.coinNotes(pitch);
        this.osc('square', lo, lo, 0.06, 0.12);
        this.osc('square', hi, hi, 0.07, 0.12, 0.06);
        break;
      }
      // A cash-register cha-CHING. What sells it is the CONTRAST between the
      // two halves — make them the same and it just reads as a two-note
      // doorbell. So:
      //   "cha"  — the drawer latch: a short, dull mechanical clack, all noise
      //            and a woody thunk, no ring.
      //   "ching"— the register bell: bright INHARMONIC partials that ring out.
      //            Metal reads as metal because it resonates at non-integer
      //            ratios; these are the modes of an ideal free bar
      //            (1 : 2.76 : 5.40 : 8.93, the glockenspiel), struck by a
      //            bright noise transient. This half is the whole gesture, so
      //            it lands higher, louder and long.
      case 'cash': {
        const barModes = [[1, 0.5], [2.76, 0.34], [5.40, 0.2], [8.93, 0.12]];
        // "cha": the drawer latch snapping open — a chunky mechanical clack
        // with real body, not a soft thud. A bright click transient, a midrange
        // mechanical rasp for meat, a square thunk for weight, and a short
        // DAMPED metallic ring on the same bar modes as the bell (choked off
        // fast, so the two halves share a metal but stay clearly distinct).
        this.noise(0.035, 0.14, 'highpass', 3200);   // latch click
        this.noise(0.05, 0.13, 'bandpass', 1800);    // mechanical rasp — mid body
        this.osc('square', 300, 175, 0.07, 0.11);    // woody thunk with harmonics
        for (const [ratio, amp] of barModes.slice(0, 3)) {
          this.osc('sine', 330 * ratio, 330 * ratio, 0.09 * (ratio < 3 ? 1 : 0.6), 0.12 * amp);
        }
        // "ching": the register bell, a beat later — the payoff, higher and
        // ringing out. Bright INHARMONIC free-bar partials struck by a noise
        // transient; upper modes decay faster, the way a real bar rings out.
        const bell = 0.14;
        this.noise(0.012, 0.13, 'highpass', 7000, bell);   // striker on the bell
        for (const [ratio, amp] of barModes) {
          this.osc('sine', 784 * ratio, 784 * ratio, 0.62 * (ratio < 3 ? 1 : 0.55), 0.18 * amp, bell);
        }
        break;
      }
      case 'power': [523, 659, 784, 1047].forEach((f, i) => this.osc('triangle', f, f, 0.09, 0.15, i * 0.07)); break;
      // A short time-snap for banking a rewind: three overlapping chirps run
      // backward, then one clean rising tone confirms that the pickup was a
      // benefit rather than damage. Kept under a quarter-second so it reads as
      // a collect cue and does not compete with the longer rewind playback.
      case 'rewindPickup':
        this.noise(0.018, 0.08, 'highpass', 4200);
        [1319, 988, 740].forEach((f, i) => this.osc('triangle', f, f * 0.72, 0.065, 0.11, i * 0.035));
        this.osc('sine', 659, 988, 0.11, 0.08, 0.105);
        break;
      case 'shield': this.noise(0.2, 0.2, 'highpass', 2000); this.osc('sawtooth', 220, 80, 0.25, 0.18); break;
      // Invincibility on: a fast rising run that lands on an octave shimmer.
      case 'star': [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => this.osc('square', f, f, 0.07, 0.13, i * 0.045)); break;
      // ...and off: the same run walking back down, quieter.
      case 'starEnd': [1568, 1319, 1047, 784].forEach((f, i) => this.osc('triangle', f, f, 0.09, 0.1, i * 0.06)); break;
      case 'hit': this.osc('sawtooth', 200, 40, 0.4, 0.25); this.noise(0.15, 0.2, 'lowpass', 900); break;
      // The finish-line dog (see RunState.spawnFinishDog), voiced through
      // dogWoof — see there for what a bark is made of and why this is a fold
      // source through a moving tract rather than a pitch sweep. The shape is
      // BARK_SHAPES.finish, dialled in on the bench in src/dev and kept to the
      // digit. It sits high enough that the cue carries over a full plumber
      // stage without the song having to duck under it.
      case 'dogBark': {
        // `level` per shape, because these differ in how much of their source
        // survives the tract — an airy shape keeps far more than a tightly
        // resonated one — and a sheet where the shapes are not matched is a
        // sheet that gets picked by loudness instead of by character. Each
        // one is measured, not guessed: see the RMS column in render-cues.
        // A VOLLEY, not a pair. A dog holding a gate does not bark twice and
        // consider the matter closed — it goes off like an alarm — and the
        // repeat is what turns the cue from a sound effect into an animal
        // making a point. `count` per shape; the run fires the whole volley
        // on its own slower clock (see the finishDog block in run.js).
        //
        // Three things keep a repeat from reading as a loop of one sample.
        // Each bark sits a little lower and a little quieter than the last, as
        // the air runs out; the pitch alternates between the shape's two notes
        // rather than marching down; and the gaps alternate long and short, so
        // the volley groups itself into ruff-ruff, ruff-ruff instead of
        // arriving on a metronome.
        const S = opt.shape || BARK_SHAPES.finish;
        const lv = 0.78 * (S.level ?? 1);
        let at = 0.02;
        for (let i = 0, n = S.count ?? 2; i < n; i++) {
          this.dogWoof(at, pitch, S.f0 * (i % 2 ? S.drop : 1) * (1 - i * 0.025),
            lv * (1 - i * 0.07), S);
          at += S.gap * (i % 2 ? 1.15 : 0.9);
        }
        break;
      }
      // Shared attack contact: a noisy crash, not a pitched little bonk. The
      // wide noise layers carry on small speakers; the low layer gives it the
      // physical hit; the bright transient makes the contact unmistakable.
      // This is separate from 'crunch' (a prop breaking) and 'hit' (the player
      // taking damage), so weapon contact reads before the target reacts.
      case 'impact':
        this.impactCrash(pitch);
        break;
      case 'contact': this.playContact(opt.hero, pitch); break;
      case 'launch': this.playLaunch(opt.hero, pitch); break;
      case 'die': [330, 262, 220, 165].forEach((f, i) => this.osc('triangle', f, f, 0.14, 0.18, i * 0.15)); break;
      case 'dash': this.noise(0.3, 0.18, 'bandpass', 1800); break;
      // Sliding in: the seat hitting the deck and grinding along it. A LOW
      // scrape — 'dash' whooshes air up at 1800; this is ground contact, so
      // the noise sits at 700 with a soft thump at the front and a lick of
      // grit on top.
      case 'slide':
        this.osc('sine', 160, 70, 0.09, 0.3);             // seat thump
        this.noise(0.28, 0.52, 'lowpass', 750);           // the grind
        this.noise(0.24, 0.3, 'bandpass', 1300, 0.01);    // presence over the music
        this.noise(0.12, 0.2, 'bandpass', 2800, 0.02);    // grit on top
        break;
      case 'boost': this.boostWhoosh(); break;
      case 'boostTick': this.boostTick(pitch); break;
      case 'loopRun': this.loopRun(pitch, opt.swell, opt.when); break;
      case 'boostFall': this.boostFall(); break;
      case 'portal': this.portalSwoosh(opt.shape); break;
      case 'shoot': this.osc('square', 900, 500, 0.08, 0.14); break;
      case 'axe': this.noise(0.25, 0.12, 'bandpass', 900); this.osc('square', 300, 500, 0.2, 0.08); break;
      case 'crunch': this.noise(0.1, 0.22, 'lowpass', 600); this.osc('sine', 150, 60, 0.12, 0.2); break;
      // The slide plow. See boxKick — a noisier, longer relative of 'crunch',
      // for the one break the player went out of their way to cause.
      case 'boxKick': this.boxKick(); break;
      // The chunks landing, a beat after the thing came apart. Deliberately a
      // separate cue from the break itself: it starts ~0.1s late (roughly the
      // shards' flight time) and thins out, so a break reads as impact-then-
      // scatter instead of one flat noise burst. Material picks the timbre.
      case 'debris': {
        const m = DEBRIS_MATS[opt.mat] || DEBRIS_MATS.wood;
        for (let i = 0; i < m.ticks; i++) {
          // uneven spacing — evenly spaced ticks read as a machine, not rubble
          const when = 0.1 + i * 0.062 + (i % 2) * 0.021;
          this.noise(m.dur, m.gain * (1 - i * 0.22), m.type, m.freq * (1 - i * 0.12), when);
        }
        if (m.ping) m.ping.forEach((f, i) => this.osc('triangle', f, f * 0.94, 0.07, 0.035, 0.12 + i * 0.08));
        break;
      }
      // A !-box giving way overhead: a hard ceramic crack on top of a gut
      // thump, then splinters raining down. 'crunch' was too polite for a hit
      // you are meant to go out of your way to land.
      case 'blockBreak':
        this.noise(0.05, 0.34, 'highpass', 3200);        // the crack
        this.noise(0.22, 0.26, 'bandpass', 950);         // the body letting go
        this.osc('sine', 190, 45, 0.2, 0.32);            // thump
        this.osc('square', 620, 300, 0.09, 0.12, 0.01);  // splintering edge
        [0.07, 0.13, 0.19].forEach((d, i) => this.noise(0.05, 0.11 - i * 0.03, 'bandpass', 2400 - i * 500, d));
        break;
      // Coins spilling out of it: one blip per coin, staggered and climbing,
      // with a shimmer over the top so a big payout sounds like a big payout.
      case 'coinSpray': {
        const nCoins = Math.max(1, Math.min(10, opt.count || 3));
        for (let i = 0; i < nCoins; i++) {
          const p = Math.pow(1.07, i);
          const when = 0.045 + i * 0.055;
          const g = 0.13 - i * 0.006;
          this.osc('square', 988 * p, 988 * p, 0.05, g, when);
          this.osc('square', 1319 * p, 1319 * p, 0.07, g, when + 0.045);
        }
        this.noise(0.3, 0.06, 'highpass', 6500, 0.05);
        break;
      }
      case 'tag': this.osc('sine', 500, 1000, 0.12, 0.16); this.osc('sine', 750, 1500, 0.12, 0.1, 0.03); break;
      case 'perfect': [660, 880, 1320].forEach((f, i) => this.osc('sine', f, f, 0.08, 0.14, i * 0.05)); break;
      case 'ui': this.osc('sine', 1200, 1200, 0.05, 0.1); break;
      case 'uiConfirm': this.osc('sine', 900, 900, 0.05, 0.1); this.osc('sine', 1350, 1350, 0.06, 0.1, 0.05); break;
      case 'uiBad': this.osc('square', 200, 150, 0.15, 0.12); break;
      // One bite per coin, exactly like eating dots; combos ride the pitch up.
      case 'waka': this.waka(0, pitch, 0.13, 0.4); break;
      // The hazard bite gets the full waka-waka plus something giving way.
      case 'chomp':
        this.waka(0, 0.92, 0.15);
        this.waka(0.135, 0.84, 0.15);
        this.noise(0.06, 0.10, 'lowpass', 520, 0.25);
        break;
      case 'win': [523, 659, 784, 1047, 1319].forEach((f, i) => this.osc('square', f, f, 0.11, 0.14, i * 0.09)); break;
      case 'lose': [400, 350, 300, 200].forEach((f, i) => this.osc('sawtooth', f, f * 0.9, 0.16, 0.12, i * 0.12)); break;
      case 'pacDeath': this.pacDeath(); break;
      case 'checkpoint': this.osc('triangle', 700, 1400, 0.15, 0.14); break;
      // The plunger bottoming out. A latch, not a beep: a hard tick of noise for
      // the contact faces meeting, a short woody knock under it for the mass
      // behind them, and one high pip that decays instantly so the cue has an
      // edge at lane volume. `when` lets the caller line it up with the frame
      // the cap actually lands on — the sound is the bottom of the stroke, not
      // the start of it, and the two are a sixth of a second apart.
      case 'clickHard': {
        const w = Math.max(0, opt.when || 0);
        this.noise(0.02, 0.5, 'highpass', 3400, w);
        this.osc('square', 220 * pitch, 90 * pitch, 0.055, 0.16, w);
        this.osc('sine', 1650 * pitch, 1650 * pitch, 0.022, 0.12, w);
        break;
      }
      case 'boom': this.explosion(); break;
      // THE BOOT CONNECTING. A punt had no sound at all until this: the call
      // site asked for 'launch' without naming a hero, and playLaunch keys its
      // buffer off exactly that — so it looked up `undefined`, missed all three
      // of its fallbacks and returned silently. Every cone and barrel kicked in
      // this game has been mute.
      //
      // PERCUSSIVE, because on a beat lane the contact IS the musical event and
      // wants to sit in the kit rather than beside it. Four layers, in the order
      // the ear assembles them:
      //
      //   the BOOT      a 20ms bright transient. This is the part that lands on
      //                 the beat, and it is the whole difference between a drum
      //                 hit and a whoosh.
      //   the BODY      what was struck: a fast pitch drop, low and wooden for a
      //                 barrel, thinner and higher for a cone.
      //   the MATERIAL  a short band of noise in that material's own register —
      //                 stave rattle against plastic scuff — so the two props
      //                 are told apart by what they are made of rather than by
      //                 being the same sound transposed.
      //   the HOLLOW    a barrel is EMPTY, so it rings a little after the knock.
      //                 One quiet partial and no more: any longer and the hit
      //                 stops being a hit.
      case 'punt': {
        const heavy = !!opt.heavy;
        this.noise(0.02, heavy ? 0.3 : 0.24, 'highpass', heavy ? 2600 : 3400);
        this.osc('triangle', (heavy ? 230 : 420) * pitch, (heavy ? 62 : 150) * pitch,
          heavy ? 0.13 : 0.08, heavy ? 0.26 : 0.16);
        this.noise(heavy ? 0.11 : 0.07, heavy ? 0.16 : 0.12, 'bandpass', heavy ? 620 : 1500);
        if (heavy) this.osc('sine', 196 * pitch, 186 * pitch, 0.16, 0.07, 0.012);
        break;
      }
      // The plane and the barrel, once every sixteen bars — the LCD city's one
      // scheduled accident (stylePacks lcdBarrelStrikeAt fires it). SCENERY, so
      // it is built to be heard and then get out of the way: a bright crack, a
      // hollow wooden body under it, and four scattered clicks that are the
      // stave cells arriving as sound. Handheld-scale on purpose — a full
      // 'boom' out of the skyline reads as something the PLAYER did, and on a
      // beat stage the one thing a background must never do is claim a beat.
      case 'barrelBurst': {
        this.noise(0.05, 0.16, 'highpass', 2600);
        this.noise(0.14, 0.13, 'bandpass', 620);
        this.osc('square', 320 * pitch, 70 * pitch, 0.16, 0.075);
        this.osc('sine', 150 * pitch, 44 * pitch, 0.22, 0.1);
        for (let i = 0; i < 4; i++) {
          this.osc('square', (900 - i * 130) * pitch, (620 - i * 110) * pitch,
            0.03, 0.035, 0.09 + i * 0.045);
        }
        break;
      }
      // ---- Fireworks. Three burst shapes so a long results screen never
      // repeats the same crack twice in a row; the caller also detunes each.
      // The mortar going up: air, not tone. Rising sine underneath it only to
      // give the ear something to track to the top of the arc.
      // The pole ride. A slide whistle is a GLISS with a breath under it: a
      // sine sweeping down over the whole descent, a second one a hair detuned
      // so it beats rather than sitting dead still, and a thin band of noise for
      // the air in the tube. `dur` is passed in because the slide's length is
      // the grade — a high catch is a longer ride and has to be a longer whistle
      // or the sound stops describing what is happening on screen.
      //
      // Down, not up: the hero is descending. An upward gliss here read as a
      // question being asked at the exact moment the stage answers one.
      case 'slideWhistle': {
        // Ceiling raised with the pole ride itself: the descent now runs up to
        // ~1.1s and a whistle that stopped at 0.9 left the last stretch silent,
        // which reads as the sound being cut off rather than the slide ending.
        const d = Math.max(0.18, Math.min(1.5, opt.dur || 0.4));
        // `when` delays the whole cue. The walk-up path hops before it slides,
        // and a downward gliss that starts on the way UP describes the wrong
        // half of the move — so the caller hands us the length of the rise and
        // the whistle waits it out.
        const w = Math.max(0, Math.min(1, opt.when || 0));
        // Loud enough to be the sound of the moment. At 0.09 it was mixed like
        // background texture and lost under the landing thump and the payoff
        // chain that follow it — it is a gag, and a gag you have to strain for
        // is not one. The detuned twin carries most of the lift: two sines a
        // few cents apart beat against each other and the wobble is what makes
        // it read as a slide whistle rather than a tone sweep.
        // Held flat until the very end. A slide whistle is one continuous tone
        // for as long as the hand is moving — the level must not tell a story
        // the pitch is not telling, and a whistle that ebbs while the hero is
        // still coming down reads as the sound losing interest in him. HOLD is
        // the last fraction of the cue given over to the release, and it is
        // barely more than a stop: the tone lands, then it is gone.
        const HOLD = 0.92;
        this.osc('sine', 1500 * pitch, 420 * pitch, d, 0.17, w, null, HOLD);
        this.osc('sine', 1508 * pitch, 424 * pitch, d, 0.11, w, null, HOLD);
        this.noise(d, 0.05, 'bandpass', 1800, w, HOLD);
        break;
      }
      case 'fizzUp':
        this.noise(0.3, 0.09, 'bandpass', 1500);
        this.osc('sine', 260 * pitch, 880 * pitch, 0.3, 0.045);
        break;
      case 'popSmall':
        this.noise(0.09, 0.22, 'highpass', 2200);
        this.osc('triangle', 820 * pitch, 190 * pitch, 0.1, 0.09);
        break;
      case 'popBig':
        this.noise(0.32, 0.24, 'lowpass', 760);
        this.osc('sine', 190 * pitch, 48 * pitch, 0.3, 0.15);
        break;
      // The one with a tail: a crack, then glitter falling out of it.
      case 'crackle':
        this.noise(0.08, 0.2, 'highpass', 1800);
        for (let i = 1; i < 6; i++) this.noise(0.04, 0.1, 'highpass', 3200, 0.05 + i * 0.055);
        break;
      case 'plop': this.osc('sine', 300, 120, 0.15, 0.2); break;
      case 'type': this.osc('square', 800, 800, 0.02, 0.05); break;
      case 'comet': this.cometSwoop(); break;
      case 'neonBuzz': this.neonBuzz(); break;
    }
  }

  // ---- Music sequencer ------------------------------------------------------
  // Bank: {bpm, bass:[...], lead:[...], hats:[...], kick:[...], snare:[...],
  // clap:[...]} arrays of 32 steps (2 bars of 16ths); melodic values are
  // frequency or null, percussion is boolean. Loops with A/B lead.
  // `mixOverride` plays a mix that is not (yet) in src/data/mix.js — the desk
  // auditioning unsaved edits. Pass null for "no mix at all", undefined for "look
  // it up". `arrangementOverride` is the desk's current pattern/order state: giving
  // it here makes the first scheduled bank agree with the grid after a reload.
  // Level, pan, EQ and send edits go straight to the strips and need no re-bank;
  // only a voice change has to come back through here.
  /**
   * The gate one lane's notes play through, for as long as this song is the song.
   *
   * A scheduled source is fire-and-forget: `o.start(t); o.stop(t + dur)` and the note
   * belongs to the graph, not to us. That was fine while every lane's length was a
   * fraction of a step — setBank's half-second mute outlasted anything still ringing,
   * so a song change sounded like a stop. The piano roll's per-note lengths broke that
   * assumption: a drawn note can be bars long, and so can a sweep, a crash or the
   * sustained organ. Those notes carried on into the next song, and the mute lifting
   * after half a second is what handed them back — the old song, audibly playing
   * underneath the new one.
   *
   * So everything the sequencer schedules is connected through this pair instead of
   * straight to the strip. Disconnecting the pair stops the notes hanging off it dead,
   * whatever their stop times said, and the next song builds its own.
   *
   * Keyed by lane rather than by strip, and re-pointed rather than replaced when a
   * lane's strip changes underneath it (a layer arriving mid-song), so a Tone pool
   * that connected to this gate when it was built stays connected to it.
   */
  _laneGate(key, dryDest, wetDest) {
    if (!this.ctx || !dryDest || !wetDest) return null;
    let gate = this._laneGates.get(key);
    if (!gate) {
      const dry = this.ctx.createGain(); dry.gain.value = 1; dry.connect(dryDest);
      const wet = this.ctx.createGain(); wet.gain.value = 1; wet.connect(wetDest);
      gate = { dry, wet, dryDest, wetDest };
      this._laneGates.set(key, gate);
      return gate;
    }
    if (gate.dryDest !== dryDest) {
      try { gate.dry.disconnect(gate.dryDest); } catch { /* already gone */ }
      gate.dry.connect(dryDest); gate.dryDest = dryDest;
    }
    if (gate.wetDest !== wetDest) {
      try { gate.wet.disconnect(gate.wetDest); } catch { /* already gone */ }
      gate.wet.connect(wetDest); gate.wetDest = wetDest;
    }
    return gate;
  }

  /**
   * The bus a lane's per-bar gain trim plays through — one per lane per dB value.
   *
   * KEPT, not rebuilt per step, and that is the whole point. A pooled Tone voice is
   * wired to the `dry`/`wet` it was built with, and `VoiceRack._pool` treats a
   * different pair as a different graph: it throws the pool away and builds a new
   * one. A fresh GainNode per scheduled step therefore disposed the synths on every
   * sixteenth — including the ones notes had already been booked on, a quarter-second
   * out in the lookahead. Those notes never sounded. A bar with a gain trim on a
   * long-tailed preset (celeste2 on the twinkle lane) played its first note and then
   * went silent for the rest of the bar.
   *
   * Keyed by the dB value as well as the lane, so overlapping notes at different
   * trims keep their own node and a level never moves under a note that is already
   * ringing — the same rule the slot gains in the rack follow. A lane runs one bar
   * value at a time, so this is one extra pair per trim a song actually uses, not one
   * per step.
   *
   * Re-pointed rather than replaced when the gate underneath it moves, exactly as
   * `_laneGate` re-points onto a new strip, so the pool wired to this bus stays wired
   * to it. Cleared with the lane gates: these hang off them.
   */
  _barGainBus(key, db, scale, dryDest, wetDest) {
    if (!this.ctx || !dryDest || !wetDest) return null;
    const id = `${key}|${db}`;
    let bus = this._barGainBuses.get(id);
    if (!bus) {
      const dry = this.ctx.createGain(); dry.gain.value = scale; dry.connect(dryDest);
      const wet = this.ctx.createGain(); wet.gain.value = scale; wet.connect(wetDest);
      bus = { dry, wet, dryDest, wetDest };
      this._barGainBuses.set(id, bus);
      return bus;
    }
    if (bus.dryDest !== dryDest) {
      try { bus.dry.disconnect(bus.dryDest); } catch { /* already gone */ }
      bus.dry.connect(dryDest); bus.dryDest = dryDest;
    }
    if (bus.wetDest !== wetDest) {
      try { bus.wet.disconnect(bus.wetDest); } catch { /* already gone */ }
      bus.wet.connect(wetDest); bus.wetDest = wetDest;
    }
    return bus;
  }

  /**
   * A bar's PAN offset, put where the channel's own pan lives.
   *
   * The gain trim above gets a bus of its own; pan cannot have one, and the reason is
   * arithmetic rather than plumbing. Two StereoPanners in series do not add: a signal
   * sent hard right and then hard left comes out hard left, not centred. The desk's
   * offset means what it says — a lane at +10 with a bar of -20 plays that bar at -10 —
   * only if ONE panner ends up holding the sum, so the sum is handed to the channel's
   * panner and the strip adds its own pot to it (see `setPanOffset` in mixer.js).
   *
   * What that costs is what pan automation costs in any DAW: the move is on the CHANNEL,
   * so a note still ringing from the bar before travels with it. A gain trim is exempt
   * from that because it can be a node per value; this cannot, and a bar's pan that only
   * caught notes struck inside it would be the stranger behaviour of the two anyway.
   *
   * Silent about lanes that have nothing to say. A lane whose offset is zero and that
   * has never carried one is left alone entirely, so every song without pan edits — the
   * whole game — touches no AudioParam here at all.
   */
  _barPan(key, offset, when, force = false) {
    const value = Number.isFinite(offset) ? offset : 0;
    const prev = this._barPans.get(key);
    if (prev == null && value === 0) return;
    if (!force && prev === value) return;
    this._barPans.set(key, value);
    const strip = this.mixer && this.mixer.lane(key);
    if (strip && strip.setPanOffset) strip.setPanOffset(value, when, BAR_PAN_SECONDS);
  }

  /** The dry/wet gates used only by the preset library's bench. */
  _benchGate(key) {
    if (!this.ctx || !this.musicBus || !this.echoBus) return null;
    let gate = this._benchGates.get(key);
    if (gate) return gate;
    const output = this._previewOutput;
    const dryDest = output?.dry || output?.input || this.musicBus;
    const wetDest = output?.wet || output?.input || this.echoBus;
    const dry = this.ctx.createGain(); dry.gain.value = 1; dry.connect(dryDest);
    const wet = this.ctx.createGain(); wet.gain.value = 1; wet.connect(wetDest);
    gate = { dry, wet };
    this._benchGates.set(key, gate);
    return gate;
  }

  /**
   * Route future preset-bench notes through an optional audition-only output.
   *
   * The destination is deliberately a pair of Web Audio nodes rather than a mixer
   * insert: a standalone playground can put both preview sends through its temporary
   * effect chain without changing a song's strips, while the normal `null` route keeps
   * the historical music/echo buses. Existing bench gates are cut and rebuilt so a
   * destination change cannot leave one preset half on the old graph.
   */
  setPreviewOutput(output = null) {
    this.stopPreview();
    this._previewOutput = output && (output.dry || output.wet || output.input) ? output : null;
    return this._previewOutput;
  }

  /**
   * Stop every note this song still has sounding. The other half of setBank's mute.
   *
   * Silent by construction rather than by ramp: the trim is being slammed to 0.0001
   * in the same call, at the same `now`, so there is nothing audible left for a
   * disconnect to click on. What is left ringing after this is only what is already
   * past the strips — the reverb and echo returns, which decay on their own with
   * nothing left feeding them.
   */
  _cutLaneGates() {
    for (const gate of this._laneGates.values()) {
      gate.dry.gain.value = 0;
      gate.wet.gain.value = 0;
      try { gate.dry.disconnect(); } catch { /* already gone */ }
      try { gate.wet.disconnect(); } catch { /* already gone */ }
    }
    this._laneGates.clear();
    // The trims feed the gates, so cutting a gate already silences them — but they
    // hold a reference to a node this song is finished with, and the next song's
    // pools must not find one.
    for (const bus of this._barGainBuses.values()) {
      try { bus.dry.disconnect(); } catch { /* already gone */ }
      try { bus.wet.disconnect(); } catch { /* already gone */ }
    }
    this._barGainBuses.clear();
    // The pan offsets are not nodes to disconnect but a number written on somebody
    // else's panner, so they have to be TAKEN BACK rather than dropped: a strip left
    // where the last bar of the last song put it is a channel whose pot and whose sound
    // disagree, and nothing downstream would ever correct it.
    if (this._barPans.size) {
      this._barPans.clear();
      this.mixer?.clearPanOffsets?.();
    }
  }

  /**
   * The same for the audition bench — but FADED, where the lane version slams.
   *
   * `_cutLaneGates` can be instant because the master trim is going to zero in the same
   * call: there is nothing audible for it to click on. Nothing covers this one. It runs
   * when a preview is stopped — a preset picked while the last one is still ringing, a
   * panel closed mid-note — and a gain set to zero under a sounding note is a step from
   * wherever the waveform happened to be to silence, which is exactly the click the ear
   * is best at hearing.
   *
   * Fifteen milliseconds, then the disconnect, which is soon enough to still read as
   * "stopped" and long enough that there is no edge in it.
   */
  _cutBenchGates() {
    const gates = [...this._benchGates.values()];
    this._benchGates.clear();
    if (!gates.length) return;
    const now = this.ctx?.currentTime ?? 0;
    const drop = (param) => {
      try {
        param.cancelScheduledValues(now);
        param.setValueAtTime(param.value, now);
        param.linearRampToValueAtTime(0, now + BENCH_FADE);
      } catch { param.value = 0; }
    };
    const cut = () => {
      for (const gate of gates) {
        try { gate.dry.disconnect(); } catch { /* already gone */ }
        try { gate.wet.disconnect(); } catch { /* already gone */ }
      }
    };
    for (const gate of gates) { drop(gate.dry.gain); drop(gate.wet.gain); }
    // An offline render has no wall clock to wait on, and nothing is listening to it:
    // the fade is scheduled, and the graph comes apart at once.
    if (typeof this.ctx?.startRendering === 'function') cut();
    else setTimeout(cut, Math.ceil(BENCH_FADE * 1000) + 5);
  }

  /** Stop the preset-library audition without touching the song or its strips. */
  stopPreview() {
    this._cutBenchGates();
    this.voices?.stopPreview?.();
  }

  // `gap` is the silence this opens before the new song starts, and half a second is
  // what every caller wants: long enough that the old song's tail cannot run into the
  // new downbeat, short enough to read as a cut rather than a stop. It is a parameter
  // because the cabinet screen has a shutter closing over it — about 0.29s of it — and
  // whether the remainder is heard as a beat of silence or as a mistake is a thing to
  // decide by ear rather than by argument. See MusicDirector.play. `startAtBeginning`
  // is the jukebox exception: it still arms the song's authored repeat region, but lets
  // a listener hear every bar before that region on the first pass.
  setBank(bank, mixOverride = undefined, arrangementOverride = undefined,
    { gap = 0.5, formLoop = true, countIn = 0, startAtBeginning = false } = {}) {
    // Re-selecting the current bank is common when returning to a menu. Keep
    // its phase intact; only a real bank change should restart the sequencer.
    // Compared against the bank as PASSED IN: applyMix may hand back a copy with
    // the saved voice overrides merged, and comparing against that copy would make
    // every re-selection look like a change.
    if (this.sourceBank === bank && mixOverride === undefined && arrangementOverride === undefined) return;
    // A pending edit repair belongs to the song being replaced. The fire-time checks
    // would drop it anyway; cancelling here means it does not sit on a timer holding a
    // reference to a bank nobody is playing.
    this._editRecovery?.cancel();
    this.resumeAfterPanic();
    this.stopPreview();
    this._clearCountIn();
    // A Rearrange edit still waiting at a bar line is waiting against a transport this
    // call is about to move — pausing parks it, playing re-seeks it. Take the edit now
    // rather than leaving it queued against a position that no longer means anything;
    // the desk's draft is what should be heard when the music comes back.
    if (this.pendingRearrangement) this.setRearrangement(this.pendingRearrangement.recipe);
    this.sourceBank = bank;
    this._visualSeek = null;
    const noteCacheState = this.noteCacheState;
    // A new song has its own arrangement, or none. `undefined` means the ordinary
    // game path should read the arrangement file; the desk passes its draft (or an
    // explicit null) so applyMix builds the live bank from exactly what its grid is
    // drawing. Setting it BEFORE applyMix is load-bearing — restoring it afterwards
    // changes the flag but not the bank the scheduler has already received.
    this.arrangement = arrangementOverride;
    // The voice rack is per song: a new bank, or the same bank with a different voice
    // chosen on the desk, wants its own synths. Nothing outlives this call, so
    // auditioning voices cannot silt the graph up with the ones you rejected. Safe to
    // do here because setBank already opens the new song after a clean half-second
    // gap — there is no tail to cut off.
    if (this.voices) { this.voices.dispose(); this.voices = null; }
    // And the same for the notes the rack does NOT play: the hand-written voices are
    // plain source nodes with their own stop times, and a drawn length, a sweep or a
    // crash can be longer than the gap this call opens. Only when a song was actually
    // sounding — at the top of an offline render there is nothing to cut, and cutting
    // there would put a node change into a render that has to stay sample-exact.
    if (this.bank) this._cutLaneGates();
    bank = this.applyMix(bank, mixOverride);
    this.bank = bank;
    const nextBpm = bank?.bpm || this.bpm;
    const countInBeats = Number.isInteger(countIn) ? Math.max(0, countIn) : 0;
    const countInLead = countInBeats ? 0.02 : 0;
    const countInSeconds = countInBeats ? countInBeats * (60 / nextBpm) : 0;
    const startGap = Math.max(gap, countInSeconds + countInLead);
    setNoteCachePlaybackActive(noteCacheState, !!bank || this.noteCachePreparationHeld);
    this.musicTrim = bank?.musicTrim ?? 1;
    this.pendingStartDelay = bank ? startGap : 0;
    if (this.songTrim) {
      const now = this.ctx.currentTime;
      this.songTrim.gain.cancelScheduledValues(now);
      if (bank) {
        // Mute any notes left in the old lookahead window, then open the new
        // bank after a clean gap.
        this.songTrim.gain.setValueAtTime(0.0001, now);
        this.songTrim.gain.setTargetAtTime(this.musicTrim, now + startGap, 0.01);
        this.nextTime = now + startGap;
      } else {
        this.songTrim.gain.setValueAtTime(0.0001, now);
      }
      if (bank && countInBeats) this._scheduleCountIn(countInBeats, now + countInLead, nextBpm);
    }
    // `dynamics` is relative to the song playing and the kit tally belongs to its
    // arrangement, so both start over with it. Carrying a loud song's peak into a
    // quiet one would leave the visualisers stalled for the first half-minute of
    // the new track, and carrying its hits over would credit it with a kit.
    this._analysisPeak = 0;
    this._analysis.level = 0;
    this._analysis.dynamics = 1;
    this._analysis.drums = 0;
    this._analysis.drumless = false;
    this._percPending.length = 0;
    this._percHeard.length = 0;
    // A loop belongs to the song that armed it. Nothing cleared it here while only the
    // desk ever looped — the desk arms its range after selecting a track, so it never
    // noticed. The cabinet screen loops too now, and without this, backing out of one
    // to the food court left the HUB THEME playing the cabinet's four bars over and over.
    // Takes the early branch in setLoop and returns without touching `step`.
    this.setLoop();
    this.step = 0; // songs start from the top (section order matters now)
    this.noteFx.reset();
    // …unless the song says otherwise. `arrangement.loop` names the bar it starts on
    // and the bars it repeats, and this is the one call every playback path in the
    // game goes through — the title screen, the hub, a level, the jukebox and
    // MusicDirector alike — so arming it here is what makes an intro work everywhere
    // without a single call site knowing about it. `formLoop: false` is for the one
    // screen that must not loop: the credits roll and then end.
    if (formLoop) this.armSongLoop({ seek: !startAtBeginning });
    if (bank && bank.bpm) {
      this.bpm = bank.bpm;
      // follows delayDivision, and grows the line if this bpm makes it a long one
      if (this.delay) this.growDelayLine(this.delayTimeSeconds()).delayTime.value = this.delayTimeSeconds();
    }
    // Unconditional, unlike the tempo above: a song with no swing has to REPLACE the
    // swing of whatever was playing before it, and `0` would fail a truthiness guard and
    // leave the shuffle on. Nothing tempo-synced follows it, so there is nothing to rebuild.
    // 50% is the authored spelling of straight, but the scheduler/effect graph uses
    // zero as its canonical no-offset value so omitted and explicit straight renders
    // remain sample-identical.
    this.swing = bank?.swing === SWING_STRAIGHT ? 0 : (bank?.swing || 0);
    // A groove change belongs to the song that asked for it. Left standing, a swing
    // queued in the last bar of one song would land on the downbeat of the next.
    this.pendingSwing = null;
  }

  /**
   * The same merge as setBank, on the song that is already playing, without the gap.
   *
   * setBank exists to CHANGE songs, and half of what it does is about that: it mutes
   * for half a second so the old song's tail cannot run into the new one's downbeat,
   * moves the scheduler past the gap, and sends the sequencer back to the top. Choosing
   * a preset on the desk went through the same door and got the same treatment — the
   * song stopped dead for half a second and resumed, which is the wrong answer to
   * "what does this bass sound like here", because the answer is in the bar you were
   * listening to.
   *
   * So: re-merge the bank, push the mix back onto the strips, and leave the transport
   * exactly where it is. `step` is not reset, `nextTime` is not moved, and songTrim is
   * not touched — the notes already in the quarter-second lookahead play on their old voice and
   * everything after them is the new one.
   *
   * Falls back to setBank when the bank is not the one already up: that is a song
   * change whatever it was called, and it wants its gap.
   */
  reapplyBank(bank, mixOverride = undefined, arrangementOverride = undefined) {
    if (!bank || this.sourceBank !== bank || !this.bank) {
      return this.setBank(bank, mixOverride, arrangementOverride);
    }
    if (arrangementOverride !== undefined) this.arrangement = arrangementOverride;
    const entry = mixOverride !== undefined ? mixOverride : MIX[trackIdOf(bank)];
    // The MERGE only — not applyMix. The strips already hold this mix: a fader, a pan,
    // an EQ or a send edited on the desk goes straight to the channel and never comes
    // back through here. Running the whole of applyMix would reset all forty strips to
    // unity and re-push them, which drops any solo you were listening through and
    // rebuilds every effect chain — a lot of disturbance to answer a question about
    // one lane's timbre.
    // `trackIdOf` on the bank as PASSED IN, not on the patched one: it is object-identity
    // based, and deskBank hands back a new object with no id. The song's own preset
    // copies are scoped by it — see registerSongVoice.
    const id = trackIdOf(bank);
    this.mixEntry = entry || null;
    this.noteFx.reset();
    const arrangementId = id || '__explicit__';
    const arranged = this.arrangement !== undefined
      ? applyArrangement(bank, arrangementId, { [arrangementId]: this.arrangement })
      : applyArrangement(bank, id);
    const merged = withVoices(deskBank(arranged, entry), entry, id);
    this.bank = merged;
    this.refreshTransportResolution(merged, entry);
    // Only the lanes whose voice actually changed lose their synths. Disposing the
    // whole rack here — what setBank does — would cut every ringing Tone note on every
    // other channel because you moved the bass. See VoiceRack.prune.
    this.voices?.prune((laneKey) => voiceOf(merged, laneKey)?.id ?? null);
    return undefined;
  }

  /**
   * Change WHAT PLAYS WHEN, without stopping the song.
   *
   * The desk's bar grid edits an arrangement live: repeat these two bars, drop the
   * kit out of the repeats, cut that section. All of that is `order` and `sections`,
   * both of which `scheduleStep` reads fresh every sixteenth — so the edit is a swap
   * of two properties and an invalidated memo, and the next step scheduled is simply
   * in the new song. `step` and `nextTime` are left alone, exactly as `reapplyBank`
   * leaves them: you are listening to bar 12 and you should still be listening to
   * bar 12 afterwards.
   *
   * The memo is the whole reason this exists rather than being an assignment at the
   * call site. `barPlan` is keyed on the bank OBJECT, so mutating that object's order
   * in place would leave the plan it already computed standing — the song would keep
   * playing the old arrangement and nothing would say why.
   *
   * `patch` is `{ order, sections, bpm }`, the same shape src/data/arrangements.js
   * holds. Passing nothing puts the song back to what its bank was composed as —
   * including its composed tempo.
   */
  setArrangement(patch = null) {
    // Remembered as well as applied. Everything that re-applies a mix rebuilds the
    // bank from the song, so an arrangement that lived only in `this.bank` survived
    // exactly until the next fader move — see applyMix.
    this.arrangement = patch || null;
    if (!this.bank) return;
    // A NEW object every time, never a write into the one being played.
    //
    // When a song has no layers and no voice overrides, `applyMix` hands the
    // sequencer the module's own bank object back — so mutating `this.bank.order`
    // would edit the song itself, for every later play of it in this session, with
    // nothing on screen saying the composition had changed. Copying also means the
    // bar plan needs no invalidation: the memo is keyed on the bank object, and this
    // is a different one.
    //
    // `sourceBank` is the pristine song, which is what "no arrangement" goes back to
    // — its own order, and only its own sections, since layer sections belong to the
    // arrangement that declared them.
    const source = this.sourceBank || this.bank;
    const next = { ...this.bank };
    if (patch?.order?.length) next.order = [...patch.order];
    else if (source.order) next.order = [...source.order];
    else delete next.order;
    // SHAPED, not spliced raw. A duplicated lane and a deleted one are per-SECTION
    // decisions — `deskBank` writes the layer's notes into every section that has the
    // part and takes the deleted lane out of every one of them — and the bank being
    // played has already had that done to it. Concatenating the song's own sections
    // back in undid it for every section except the ones the edit itself wrote: a
    // duplicated drum track went silent in every bar but the bar you had just drawn
    // in (the grid went on drawing the beats, because it reads the shaped bank), and a
    // deleted track came back and played. Both fixed themselves the moment anything
    // touched a fader, because that path rebuilds through `applyMix`, which is the
    // shape of the bug: this was the one door into the bank that skipped the shaping.
    const list = patch?.sections?.length
      ? [...(source.sections || []), ...patch.sections]
      : (source.sections ? [...source.sections] : null);
    if (list) next.sections = deskBank({ ...source, sections: list }, this.mixEntry).sections;
    else delete next.sections;
    // The tempo, the same way round: the arrangement's while it names one, the song's
    // own again the moment it stops. `this.bpm` is what scheduleStep divides by, so it
    // moves with the bank or the edit is inaudible; the delay line follows because it
    // is tempo-synced and a slower song wants a longer one.
    const bpm = patch?.bpm ?? source.bpm;
    if (bpm) {
      next.bpm = bpm;
      if (bpm !== this.bpm) {
        this.bpm = bpm;
        if (this.delay) this.growDelayLine(this.delayTimeSeconds()).delayTime.value = this.delayTimeSeconds();
      }
    }
    // The swing the same way round, and the `??` matters as much as it does above: a
    // patch that drops its swing key is a song dragged back to straight, and it has to
    // fall through to the song's own rather than keep the last shuffle set on the desk.
    // Seamless by construction — nothing here is tempo-synced and `step` and `nextTime`
    // are untouched, so a drag across the range re-feels the music without a seam in it.
    const swing = patch?.swing ?? source.swing ?? 0;
    if (swing) next.swing = swing; else delete next.swing;
    // Keep the internal straight value canonical. A stored 50% swing and an omitted
    // swing are musically identical; using 50 here nevertheless sends a different
    // numeric value through rhythm effects and can produce tiny render differences.
    this.swing = swing === SWING_STRAIGHT ? 0 : swing;
    // The desk setting a swing outright is an answer to the same question a queued one
    // was asked, and it arrives later — so it wins, rather than being overwritten a bar
    // afterwards by a change nothing on screen still refers to.
    this.pendingSwing = null;
    const resolution = resolutionOf(source, patch);
    if (resolution !== LEGACY_RESOLUTION) next.resolution = resolution;
    else delete next.resolution;
    this.bank = next;
    this.refreshTransportResolution(next, this.mixEntry);
    this.mixer?.prepareBarEffects?.(barPlan(next), next.bpm || this.bpm);
    // A step past the end of a shortened song would keep playing past it until the
    // modulo caught up. Wrapped here so a delete never leaves the playhead adrift.
    const steps = barPlan(next).length * 16;
    if (this.rearrangement && this.rearrangement.source?.steps !== steps) {
      // A bar edit changed the source address space. Keeping the old recipe would
      // point at a range that no longer exists, so the temporary audition expires
      // while the arrangement itself remains untouched.
      this.setRearrangement(null);
    }
    if (steps > 0 && this.step >= steps) this.step %= steps;
    // And the song's own loop with it, for the same reason: an edit that shortens the
    // form can leave the region hanging off the end of it, and `loopSteps` clamps
    // against the plan this call has just changed. Only when the song's markers are
    // what is armed — a range somebody selected on the desk is theirs, not ours — and
    // never with a seek, because an edit must not jump the music.
    if (this.formLoopArmed) this.armSongLoop();
  }

  // Push a song's saved mix onto the channel strips, and merge any voice overrides
  // into the bank. Returns the bank the sequencer should actually play — the same
  // object when there is nothing to merge, so the common case allocates nothing.
  //
  // Voice keys merge UNDER sections (`{...bank, ...voice}` then sections spread over
  // that at schedule time), so a section that sets the same key still wins. Lane
  // trims are relative and live on the strips, so per-section variation survives.
  applyMix(bank, mix = undefined) {
    const entry = mix !== undefined ? mix : (bank ? MIX[trackIdOf(bank)] : null);
    // Remembered for `setArrangement`, which has to re-shape the song's sections
    // without coming back through here — see the note there. A mix override is not
    // otherwise recoverable: the desk's unsaved edits are in no file to look up.
    this.mixEntry = entry || null;
    // The song's FORM, before anything else touches the bank: which bars play, in
    // which order, with which lanes dropped out of them. Read here because this is
    // already the one place a bank gets patched on its way to the sequencer — and
    // after the `trackIdOf` lookup above, because that is object-identity based and a
    // patched bank is a new object with no id.
    //
    // Hands back the same object for a song with no arrangement entry, which today is
    // every song: an empty layer is not merely harmless, it is nothing at all.
    //
    // `this.arrangement` is the DESK's unsaved arrangement, and it wins over the file
    // while it is set — `null` meaning "this song plays as composed", which is a
    // different answer from "look it up". Without this, every path that re-applies a
    // mix — a fader, a mute, a solo, an effect, a rebuild — rebuilt the bank from the
    // file and quietly threw the edit away: the grid went on drawing bars that the
    // sequencer had stopped playing.
    const id = bank ? trackIdOf(bank) : null;
    // A game alternate is deliberately not in the main track registry: it is a
    // candidate song object passed directly by the game. Its explicit arrangement
    // still has to apply, though — notably `arrangement.swing` — so give an
    // arrangement override its own lookup key when there is no track id.
    const arrangementId = id || '__explicit__';
    bank = this.arrangement !== undefined
      ? applyArrangement(bank, arrangementId, { [arrangementId]: this.arrangement })
      : applyArrangement(bank, id);
    // Then the song's SHAPE, before anything is pointed at a strip: a mix can add a
    // duplicated lane or take one out entirely, and both change which channels exist.
    // Hands back the same object when the mix says neither, which is every song that
    // has not been through the desk's Duplicate or Delete — see deskBank.
    bank = deskBank(bank, entry);
    if (this.mixer) {
      this.mixer.reset();
      // No family rule any more. A lane used to be on the delay because of what KIND
      // of lane it was — melodic and fx echoed by default, percussion opted in — so a
      // channel's echo answered to nothing you could point at, and turning one down
      // left the rest of the family echoing in the same rhythm. Every send now starts
      // at zero and comes from the mix, one channel at a time. The songs' echoes were
      // written into src/data/mix.js as ordinary sends when this changed, so they
      // sound exactly as they did and are editable where you can see them.
      //
      // Nor is there a rule about where the signal is TAPPED any more: the send takes
      // the whole lane on every strip (see makeStrip), so a channel reaches the delay
      // because its send is up and for no other reason. It used to tap only the voices
      // that set their own echo flag, which made the knob dead on a dry lane and dead
      // on any preset that declares itself dry — a control that silently does nothing.
      // laneList, not LANES: a layer needs a strip of its own, and it arrives with the
      // mix rather than with the engine, so this is the first moment it can be built.
      for (const { key } of laneList(bank)) {
        const strip = this.mixer.ensureLane(key);
        if (!strip) continue;
        strip.setSend({ delay: 0 });
      }
      // The rack is already back at defaults from reset() above; retune the
      // tempo-synced ones for this song's bpm, then lay the saved settings over.
      this.setDelay({ division: 0.75, feedback: 0.35, tone: 2800 });
      this.mixer.retune(bank?.bpm || this.bpm);
      if (entry) {
        this.mixer.setMasterTrim(entry.master || 0);
        this.mixer.setMasterPan(entry.masterPan || 0);
        this.mixer.setLimiter(!!entry.limiter);
        if (entry.masterEffects) this.mixer.setMasterEffects(entry.masterEffects, bank?.bpm || this.bpm);
        for (const [id, patch] of Object.entries(entry.fx || {})) {
          // Delay 1 is the engine's own echo; its time, feedback and damping live
          // on the AudioSys nodes, so those params route there. Its EQ and return
          // level are the mixer's, like every other aux.
          if (id === 'delay') {
            const { eq, level, pan, mute, effects, ...engineParams } = patch;
            this.setDelay(engineParams);
            this.mixer.setAux('delay', { eq, level, pan, mute }, bank?.bpm || this.bpm);
          } else {
            this.mixer.setAux(id, patch, bank?.bpm || this.bpm);
          }
          if (patch.effects) this.mixer.setAuxEffects(id, patch.effects, bank?.bpm || this.bpm);
        }
        for (const [key, raw] of Object.entries(entry.lanes || {})) {
          const strip = this.mixer.lane(key);
          if (!strip) continue;
          const s = laneSettings(raw);
          strip.setGain(s.gain);
          strip.setPan(s.pan);
          strip.setWidth(s.width ?? 1);
          strip.setMute(s.mute);
          strip.setEQ(s.eq);
          // Every aux, not just the two that existed first — naming them here is
          // how delay2/reverb2 got silently dropped. Nothing falls back to a family
          // default now: a send that is not in the mix is a send at zero.
          strip.setSend(s.send);
          // The channel delay used to be a bespoke insert here; it is an ordinary
          // entry in the effect chain now, so old mixes carrying `insert` are
          // migrated rather than silently dropped.
          const chain = raw?.effects ? [...raw.effects] : [];
          if (raw?.insert && (raw.insert.mix ?? 0) > 0) chain.unshift({ id: 'chandelay', params: raw.insert });
          if (chain.length) strip.setEffects(chain, bank?.bpm || this.bpm);
        }
      }
    }
    // Sends are final by here, so anything unused can be dropped from the graph.
    if (this.mixer) this.mixer.pruneAuxes();
    if (this.mixer && bank) this.mixer.prepareBarEffects(barPlan(bank), bank.bpm || this.bpm);

    // `id` was read from the bank as passed in, above, before applyArrangement and
    // deskBank patched it — which is exactly what the song's preset copies need to be
    // scoped by. See registerSongVoice.
    const voiced = withVoices(bank, entry, id);
    this.refreshTransportResolution(voiced, entry);
    return voiced;
  }

  /**
   * Cache the finest clock the current song or its Note FX actually requests — and,
   * with it, WHICH BARS actually need that clock.
   *
   * The resolution is bank-wide and has to be: loop, seek, swing interpolation and the
   * fine arpeggiator all need an authoritative half-step time. What is not bank-wide is
   * the WORK. Measured on the 28-track stress song: one 1/32 arp override, on one lane,
   * in one bar out of sixty-five, doubles the transport for the whole song — 736 extra
   * scheduler passes, ~46,900 lane reads and ~33,000 Note FX resolutions that resolve to
   * nothing, because every authored lane is 16-step and `sequenceValue` returns null on
   * the odd slots. Half of the scheduler's entire output was that.
   *
   * So keep the clock and skip the work, per bar. `_fineBars` names the bars that
   * genuinely need a half tick; `_fineTickLanes` names the lanes whose Note FX state
   * must keep ticking on the half steps of every OTHER bar, so a continuous arpeggiator
   * cannot notice it was skipped. See the fast path at the top of scheduleStep.
   */
  refreshTransportResolution(bank = this.bank, mix = this.mixEntry) {
    // THE GRID AN ARPEGGIATOR NEEDS. Its rate is in sixteenths, so a rate of `r` wants
    // `16 / r` slots to the bar — 32 for a 1/32, 24 for a 1/16T — and the grid has to be a
    // whole multiple of that. Returning the resolution rather than a yes/no is what lets a
    // triplet rate promote to 48 the way a 1/32 has always promoted to 32; asking only
    // "is it 0.5 or finer" could not express the difference, and a 1/16T arp on a
    // sixteenth clock fires every two sixteenths instead of three to the beat.
    const arpGrid = (fx) => {
      if (!fx?.arp?.enabled) return LEGACY_RESOLUTION;
      const rate = Number(fx.arp.rate);
      if (!(rate > 0)) return LEGACY_RESOLUTION;
      const need = Math.round(LEGACY_RESOLUTION / rate);
      return RESOLUTIONS.find((r) => r % need === 0) ?? LEGACY_RESOLUTION;
    };
    const laneFx = mix?.lanes || {};
    const trackGrid = promoteResolution(
      ...Object.values(laneFx).map((laneMix) => arpGrid(laneMix?.noteFx)));
    const plan = bank ? barPlan(bank) : [];
    const barGrid = promoteResolution(...plan.flatMap((bar) => Object.values(bar.noteFx || {})
      .map((override) => (override?.mode === 'on' ? arpGrid(override) : LEGACY_RESOLUTION))));
    // Kept as booleans for `_fineBars` below, which only asks WHETHER a bar owes a fine
    // tick, not how fine.
    const isFine = (fx) => arpGrid(fx) !== LEGACY_RESOLUTION;
    const trackFine = trackGrid !== LEGACY_RESOLUTION;
    const was = this.transportResolution;
    // The clock has to hold everything at once: the grid the song is stored on AND the
    // finest thing generated on top of it. A 1/32 arp over a triplet song is the case
    // that makes this an LCM rather than a maximum — 48 cannot express a 32nd and 32
    // cannot express a triplet, so the transport runs at 96 and both land exactly.
    this.transportResolution = promoteResolution(resolutionOf(bank), trackGrid, barGrid);
    // COMING DOWN OFF THE HALF STEP.
    //
    // `scheduleStep` advances `this.step` by the transport's tick, so at 32 the step is
    // routinely a half. This function runs again on every applyMix and setBank — which
    // is what the desk does when you switch the last 1/32 arpeggiator in a song off —
    // and if that lands while the transport is mid-half-step, the tick becomes 1 and the
    // half never comes off again. Everything downstream counts on `step` being whole:
    // `s` stays fractional so `sequenceValue` indexes `arr[0.5]` and every lane goes
    // silent; `Number.isInteger(this.step)` is false so rhythmic effects stop; `% 16`
    // and `% 4` never hit again, so bar effects, the beat listeners and the playhead all
    // stop with them; and with no locator loop armed the wrap compares `% formEnd` and
    // cannot recover either. The song does not come back until it is reloaded.
    //
    // Round UP: the half step being left behind is one the old resolution already
    // scheduled, and the next whole step is the next thing that has not been played.
    //
    // Rescaling the counter is what keeps the musical POSITION fixed while the unit
    // under it changes — `_tick` counts ticks, and a tick is worth a different number
    // of sixteenths on either side of this line. Going finer is always exact, so the
    // ceiling only ever bites coming back down, which is the case the comment above
    // describes.
    if (this.transportResolution !== was) {
      this._tick = Math.ceil(this._tick * this.transportResolution / was);
    }

    // Every lane that carries Note FX at all — at any rate — from either source. On a
    // skipped half tick these still get their plan resolved, because `noteFx.process`
    // holds per-lane arpeggiator state (`started`, `index`, `expires`) and advancing it
    // on a different set of ticks is a different arpeggio. Everything else about the
    // tick is skipped; this list is short, and on the stress song it is two lanes
    // against the thirty the fast path takes out.
    const fineTickLanes = new Set();
    for (const [key, laneMix] of Object.entries(laneFx)) {
      if (laneMix?.noteFx?.arp?.enabled || laneMix?.noteFx?.strum?.enabled) fineTickLanes.add(key);
    }
    for (const bar of plan) {
      for (const [key, override] of Object.entries(bar.noteFx || {})) {
        if (override?.arp?.enabled || override?.strum?.enabled) fineTickLanes.add(key);
      }
    }
    this._fineTickLanes = [...fineTickLanes];

    // WHICH LANES a half step can possibly say anything about — the per-lane half of the
    // same idea, and the one that applies when the bank really is 32-step.
    //
    // `sequenceValue` folds a short lane array onto the even slots and returns null
    // between them. That is a property of the ARRAY LENGTH, not of what is written in
    // it, so it holds for every value the roll will ever hold and needs no invalidation
    // beyond the bank change that already rebuilds this. A lane whose array is under 64
    // slots cannot sound on an odd slot; asking it, and asking Note FX about it, is the
    // work being removed.
    //
    // Measured on the stress song: three lanes carry 64-slot arrays (`organChords5`,
    // `organChords6`, `lead3`) and six carry Note FX. The other thirty were resolved
    // twice a sixteenth to be told null.
    const wide = this._wideLaneKeys(bank);
    this._fineLanes = wide ? new Set([...wide, ...fineTickLanes]) : null;

    // Which bars need the half tick, as bar indices into the plan. `null` means "all of
    // them" — the honest answer whenever a half step can carry AUTHORED CONTENT rather
    // than only generated events, in which case nothing may be skipped:
    //
    //   · a natively 32-step bank, where odd slots are the song;
    //   · any lane array long enough that `sequenceValue` indexes it directly rather
    //     than folding it onto the even slots — the upgraded editor's 64-slot lanes;
    //   · a track-level 1/32 arp, which applies to every bar unless a bar turns it off,
    //     and working out which bars those are is not worth the subtlety here.
    // Why, kept for the bench and the diagnostics: "all bars are fine" is the answer
    // that silently costs the whole-tick fast path, and a reader needs to see which of
    // the three reasons produced it. A song that lands here is not unoptimised — the
    // per-lane skip above still applies to it — it simply cannot skip a whole tick.
    this._fineBarsReason = resolutionOf(bank) !== LEGACY_RESOLUTION
      ? `native-${resolutionOf(bank)}-step-bank`
      : trackFine ? 'track-level-1/32-arp'
        : wide && wide.size ? 'a-lane-array-of-64-or-more' : '';
    this._fineBars = this._fineBarsReason
      ? null
      : new Set(plan.flatMap((bar, i) => (Object.values(bar.noteFx || {}).some((override) =>
        override?.mode === 'on' && isFine(override)) ? [i] : [])));
    return this.transportResolution;
  }

  /**
   * Does any lane array hold a slot per THIRTY-SECOND rather than per sixteenth?
   *
   * `sequenceValue` folds a short array onto the even slots and returns null between
   * them; an array of 64 or more it indexes directly, so its odd entries are real notes.
   * One such lane anywhere — bank, section or the length arrays beside them — and no
   * half tick may be skipped.
   */
  /**
   * Turn the half-step skips off, to prove they change nothing.
   *
   * Both of them: the whole-tick fast path and the per-lane predicate. With this off the
   * scheduler resolves every lane on every half step exactly as it did before either
   * existed, so a render either side of the switch is the A/B — see
   * work/local/fine-skip-null.js, which does that comparison sample for sample.
   */
  setFineLaneSkip(on) { this.fineLaneSkip = on !== false; }

  _wideLaneKeys(bank) {
    if (!bank) return null;   // nothing known yet: treat every lane as fine
    // BY LANE KEY, not "every array on the bank". A bank carries arrays that are not
    // lanes — `order` is one entry per bar and passes 64 on any song over thirty bars,
    // `sections` is a list of partial banks — and counting those made every long song
    // look as though it had authored content between the sixteenths.
    const keys = [...LANE_KEYS, ...(bank.__layers || []).map((L) => L.key)];
    const out = new Set();
    const scan = (obj) => {
      if (!obj) return;
      for (const k of keys) {
        // The lengths array as well as the notes: `stepLen` reads it through the same
        // `sequenceValue` seam, so a 64-slot length array is a lane that can say
        // something on an odd slot even when the notes beside it are short.
        if ((Array.isArray(obj[k]) && obj[k].length >= 64)
          || (Array.isArray(obj[lenKey(k)]) && obj[lenKey(k)].length >= 64)) out.add(k);
      }
    };
    scan(bank);
    for (const section of bank.sections || []) scan(section);
    return out;
  }

  /**
   * Move the strips to another mix AT AN AUDIO TIME, without touching the transport.
   *
   * applyMix is the other half of setBank and behaves like it: `mixer.reset()` puts all
   * forty strips back to unity and every effect chain is rebuilt from scratch. That is
   * right for loading a song and wrong for changing how the one that is playing is
   * presented — it cuts every reverb tail, drops any solo you were listening through,
   * and none of it can be aimed at a bar line the sequencer handed to the audio thread a
   * quarter of a second ago. This walks the same fields and writes them as ramps.
   *
   * `step`, `nextTime`, `bpm`, `songTrim` and the voice rack are untouched, so the notes
   * already inside the lookahead ring straight through the change.
   *
   * The two mixes may differ on the NUMBERS in an effect chain and not on its SHAPE: a
   * link added, removed or reordered disposes the whole slot, and there is no audio time
   * you can schedule a graph edit for. Such a pair is rejected — and rejected BEFORE
   * anything moves, so a refused transition leaves the desk exactly as it was rather
   * than half-applied.
   *
   * `mute` counts as a number, not as shape. It is a pair of gains around the link
   * rather than a disconnect (see mixer.setMute), so the two sides may disagree about
   * whether an effect is HEARD while still agreeing about what is in the chain — which
   * is how a cabinet screen carries a phaser the level does not, without a second leg
   * of the whole mix. `bypass` is the one that genuinely re-wires, and stays refused.
   *
   * `mix` must be a whole resolved mix, not a patch. `mixEntry` is what setArrangement
   * re-shapes the song's sections through, and `deskBank`/`withVoices` read `layers`,
   * `off` and `voice` off it; a partial handed in here would quietly delete a duplicated
   * lane the next time the arrangement changed.
   *
   * Returns the time the move completes.
   */
  rampMix(mix, when = this.ctx ? this.ctx.currentTime : 0, seconds = 0) {
    if (!this.mixer) return when;
    const entry = mix || null;
    const bpm = this.bank?.bpm || this.bpm;

    // Every lane the song has, not only the ones the target names. A lane the target
    // leaves out goes back to its defaults — what mixer.reset() would have done for it,
    // and the only reading under which a variant can TAKE SOMETHING AWAY rather than
    // only add to what is already up.
    const keys = new Set(laneList(this.bank).map((l) => l.key));
    for (const k of Object.keys(entry?.lanes || {})) keys.add(k);

    // Validate every chain first. Nothing below this point may throw.
    const chains = [['__master', this.mixer.masterEffects, entry?.masterEffects || []]];
    for (const def of this.mixer.auxes) {
      chains.push([`__aux:${def.id}`, this.mixer.auxEffects(def.id), entry?.fx?.[def.id]?.effects || []]);
    }
    for (const key of keys) {
      const strip = this.mixer.lane(key);
      if (strip) chains.push([key, strip.effects, entry?.lanes?.[key]?.effects || []]);
    }
    for (const [target, live, want] of chains) {
      if (live.length !== want.length) {
        throw new Error(`rampMix: ${target} has ${live.length} effects and the target has ${want.length}`
          + ' — a chain can be re-tuned at a bar line but not rebuilt at one');
      }
      for (let i = 0; i < want.length; i++) {
        if (live[i].def.id !== want[i].id) {
          throw new Error(`rampMix: ${target}[${i}] is "${live[i].def.id}" and the target is "${want[i].id}"`
            + ' — both sides of a transition must agree on the shape of their chains');
        }
        if (!!live[i].bypassed !== !!want[i].bypass) {
          throw new Error(`rampMix: ${target}[${i}] changes its bypass, which re-wires the chain`);
        }
      }
    }

    for (const key of keys) {
      const strip = this.mixer.lane(key);
      if (!strip) continue;
      const s = laneSettings(entry?.lanes?.[key]);
      strip.rampTo({
        gain: s.gain, mute: s.mute, pan: s.pan, width: s.width ?? 1, eq: s.eq, send: s.send,
      }, when, seconds);
    }

    // Level, balance and EQ per aux — never decay, preDelay or the delay's own timing.
    // Those rebuild a buffer or retune a live delay line, which are node changes, and a
    // variant is not allowed to ask for one. See the aux notes in mixer.rampAux.
    for (const def of this.mixer.auxes) {
      const patch = entry?.fx?.[def.id];
      const d = AUX_DEFAULTS[def.id];
      this.mixer.rampAux(def.id, {
        level: patch?.level ?? d.level,
        pan: patch?.pan ?? d.pan,
        eq: { ...d.eq, ...(patch?.eq || {}) },
      }, when, seconds);
    }

    this.mixer.rampMaster({ master: entry?.master || 0, masterPan: entry?.masterPan || 0 }, when, seconds);

    for (const [target, , want] of chains) {
      for (let i = 0; i < want.length; i++) {
        if (want[i].params) this.mixer.rampEffectParams(target, i, want[i].params, when, seconds, bpm);
        // Unconditionally, unlike the params above: `mute` absent means UNMUTED, and a
        // link the target says nothing about has to come back on. Skipping the falsy
        // case would make a mute one-way — on for the cabinet screen and still on for
        // the level, which is the bug this whole mechanism exists to fix.
        this.mixer.rampEffectMute(target, i, !!want[i].mute, when, seconds);
      }
    }

    // No pruneAuxes. Raising a send wakes its return from setSend (see wakeAux), which
    // is the urgent direction; an aux left connected and silent costs a little CPU and
    // never costs a sound, and disconnecting one at a bar line would cut its tail.
    this.mixEntry = entry;
    this.refreshTransportResolution(this.bank, entry);
    return when + seconds;
  }

  // Tempo and pitch warp independently: slow-mo drags the tempo without
  // dropping the key, invincibility winds both up a whole tone.
  setWarp(tempo, pitch = tempo) {
    const moved = tempo !== this.tempo;
    this.tempo = tempo;
    this.detune = pitch;
    // The run loop calls this every frame with whatever the powerups currently say,
    // so the retime has to be gated on an actual change — a mixer retune per frame
    // would be hundreds of Web Audio parameter writes a second for nothing.
    if (moved) this.retimeSync();
  }
  setDetune(d) { this.setWarp(d, d); }

  /**
   * Re-derive every tempo-synced time in the mix against the warped clock.
   *
   * Tempo-synced times are stored as note divisions but written to the graph as plain
   * seconds, once, when the bank loads. Warping the transport afterwards leaves those
   * seconds describing a tempo nothing is playing at any more. This is the same work
   * setBank does on a bank change, pointed at `bpm * tempo`.
   *
   * The delay line slides rather than jumps: a delayTime step resamples whatever is
   * still ringing in the buffer, and 50ms of glide turns a click into the tape-style
   * pitch slur you would want from a gear change anyway.
   *
   * What this does NOT reach: tempo-synced effects sitting on a channel STRIP, which
   * are baked by strip.setEffects at bank load. No cabinet song currently uses one —
   * the drift-prone sends are all on the shared echo and the aux returns — but a song
   * that grows a synced strip tremolo will need it, and the retune belongs there too.
   */
  retimeSync() {
    if (!this.ctx) return;
    const secs = this.delayTimeSeconds();
    if (this.delay) {
      this.growDelayLine(secs).delayTime.setTargetAtTime(secs, this.ctx.currentTime, 0.05);
    }
    if (this.mixer) this.mixer.retune((this.bpm || 120) * (this.tempo || 1));
  }

  // Invincibility: duck the theme and bring up the star arpeggio over it, so
  // it still reads as the same song — just electrified.
  setInvincible(on) {
    on = !!on;
    if (on === this.starMode) return;
    this.starMode = on;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(on ? 0.32 : 1, t, 0.08);
    this.starBus.gain.setTargetAtTime(on ? 1.5 : 0, t, 0.08);
  }

  // Rewind mode: mutes the music bus, ducks SFX, and plays the capture buffer
  // backwards in overlapping chunks — every sound reversed, like a tape rewinding.
  setRewinding(on) {
    on = !!on;
    if (on === this.rewindMode) return;
    this.rewindMode = on;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // Mute the forward music bus so only the reversed audio is heard.
    this.musicBus.gain.setTargetAtTime(on ? 0.0001 : 1, t, on ? 0.04 : 0.35);
    // Duck SFX heavily so forward sounds don't break the reverse illusion.
    this.sfxGain.gain.setTargetAtTime(on ? 0.10 : this.levels.sfx, t, 0.04);
    if (on) {
      this._startReversePlayback();
    } else {
      this._stopReversePlayback();
    }
  }

  // Continuously record the master output into a ring buffer. A zero-gain
  // ScriptProcessorNode taps the signal without affecting the live mix.
  _startCapture() {
    if (!this.captureEnabled || this._capNode) return;
    const SR = this.ctx.sampleRate;
    const CAPTURE_SEC = 4;
    this._capBuf = new Float32Array(Math.floor(SR * CAPTURE_SEC));
    this._capPos = 0;
    this._capNode = this.ctx.createScriptProcessor(2048, 1, 1);
    this._capNode.onaudioprocess = (e) => {
      if (!this._capBuf || this.lifecyclePaused) return;
      const input = e.inputBuffer.getChannelData(0);
      const buf = this._capBuf;
      let pos = this._capPos;
      const len = buf.length;
      for (let i = 0; i < input.length; i++) {
        buf[pos] = input[i];
        pos = (pos + 1) % len;
      }
      this._capPos = pos;
    };
    // Tap master without doubling the output: route through capNode into a
    // zero-gain sink so the onaudioprocess fires but nothing reaches the speakers.
    this.master.connect(this._capNode);
    this._capGain = this.ctx.createGain();
    this._capGain.gain.value = 0;
    this._capNode.connect(this._capGain);
    this._capGain.connect(this.ctx.destination);
  }

  _stopCapture() {
    if (this._capNode && typeof this._capNode.disconnect === 'function') this._capNode.disconnect();
    if (this._capGain && typeof this._capGain.disconnect === 'function') this._capGain.disconnect();
    this._capNode = null;
    this._capGain = null;
    this._capBuf = null;
    this._capPos = 0;
  }

  // Start playing the capture buffer backwards in overlapping chunks. Each
  // chunk is ~0.7s of audio reversed; a new one fires every 0.35s so they
  // crossfade and the reversed stream is continuous.
  _startReversePlayback() {
    if (this._revTimer || !this._capBuf) return;
    // Prime the pump immediately, then schedule every 350ms.
    this._scheduleReverseChunk();
    this._revTimer = setInterval(() => this._scheduleReverseChunk(), 350);
  }

  _stopReversePlayback() {
    if (this._revTimer) { clearInterval(this._revTimer); this._revTimer = null; }
    // Schedule one final chunk that decelerates to a stop over ~0.5s — like a
    // tape reel braking, not an abrupt cut. The music bus fades back in over
    // the same period (see setRewinding), so the two cross over smoothly.
    this._scheduleTapeStop();
  }

  // Multi-phase tape-stop-and-spin-up on a reversed chunk. Simulates a tape
  // transport braking to a halt, pausing briefly, then accelerating back.
  //
  // Envelope phases (total ~0.55s):
  //   A  0.00–0.24  decelerate  1.0 → 0.0  (squared curve)
  //   B  0.24–0.28  hold        0.0
  //   C  0.28–0.55  accelerate  0.0 → 1.0  (squared curve)
  //
  // Envelope phases (total ~0.55s):
  //   A  0.00–0.24  decelerate  1.0 → 0.0  (squared curve)
  //   B  0.24–0.28  hold        0.0
  //   C  0.28–0.55  accelerate  0.0 → 1.0  (squared curve)
  //
  // A dynamic low-pass filter tracks playback rate (cutoff ∝ rate^1.5) so the
  // sound darkens as it slows, and a +3dB gain bump below 0.4× compensates for
  // the perceived loss of high-frequency energy.
  _scheduleTapeStop() {
    if (!this._capBuf || !this.ctx) return;
    const SR = this.ctx.sampleRate;
    const bufLen = this._capBuf.length;
    const totalDur = 0.55;
    const len = Math.floor(SR * totalDur);
    if (len > bufLen) return;

    // Build reversed buffer from the ring.
    const pos = this._rewindStartPos != null ? this._rewindStartPos : this._capPos;
    const reversed = this.ctx.createBuffer(1, len, SR);
    const data = reversed.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = this._capBuf[(pos - i - 1 + bufLen) % bufLen];
    }

    const t = this.ctx.currentTime;
    const T_A = 0.24, T_B = 0.04, T_C = 0.27;

    // Pre-compute playback-rate curve (256 samples, ~3ms steps).
    const N = 256;
    const rateCurve = new Float32Array(N);
    const lpfCurve = new Float32Array(N);
    const gainCurve = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const phase = (i / (N - 1)) * totalDur;
      let rate;
      if (phase < T_A) {
        rate = (1 - phase / T_A) ** 2;
      } else if (phase < T_B + T_A) {
        rate = 0;
      } else {
        rate = ((phase - (T_A + T_B)) / T_C) ** 2;
      }
      rateCurve[i] = Math.max(0.001, rate);
      lpfCurve[i] = Math.max(60, 20000 * (rate ** 1.5));
      const comp = rate < 0.4 ? 1.41 : rate < 0.8 ? 1.41 - (1.41 - 1.0) * ((rate - 0.4) / 0.4) : 1.0;
      gainCurve[i] = comp;
    }

    const src = this.ctx.createBufferSource();
    src.buffer = reversed;
    src.playbackRate.setValueCurveAtTime(rateCurve, t, totalDur);

    const g = this.ctx.createGain();
    const gc = this.ctx.createGain();
    gc.gain.setValueCurveAtTime(gainCurve, t, totalDur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.85, t + 0.015);
    g.gain.setValueAtTime(0.85, t + totalDur - 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + totalDur);
    g.gain.linearRampToValueAtTime(0, t + totalDur + 0.05 - 0.005);

    src.connect(g);
    g.connect(gc);
    gc.connect(this._rewindOut);
    src.start(t);
    src.stop(t + totalDur + 0.05);
  }

  // Read a 0.7s slice from the ring buffer backwards, create a BufferSource
  // with a quick fade-in/out envelope, and send it to master.
  _scheduleReverseChunk() {
    if (!this._capBuf || !this.ctx) return;
    const SR = this.ctx.sampleRate;
    const bufLen = this._capBuf.length;
    const chunkSec = 0.7;
    const chunkLen = Math.floor(SR * chunkSec);
    if (chunkLen > bufLen) return;
    const pos = this._capPos;
    // Build a reversed buffer: walk backwards from the current write position.
    const reversed = this.ctx.createBuffer(1, chunkLen, SR);
    const data = reversed.getChannelData(0);
    for (let i = 0; i < chunkLen; i++) {
      data[i] = this._capBuf[(pos - i - 1 + bufLen) % bufLen];
    }
    const src = this.ctx.createBufferSource();
    src.buffer = reversed;
    const g = this.ctx.createGain();
    const t = this.ctx.currentTime;
    // Quick attack, steady body, quick release — overlapping chunks crossfade
    // without audible seams.
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1.0, t + 0.025);
    g.gain.setValueAtTime(1.0, t + chunkSec - 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + chunkSec);
    g.gain.linearRampToValueAtTime(0, t + chunkSec + 0.03 - 0.005);
    src.connect(g);
    g.connect(this._rewindOut);
    src.start(t);
    src.stop(t + chunkSec + 0.03);
    // Track for debugging; Web Audio cleans up stopped sources automatically.
    this._revSources = this._revSources.filter((s) => s.endTime > t - 0.5);
    this._revSources.push({ endTime: t + chunkSec });
  }

  // Save the current capture position for the tape-stop effect. Called from
  // run.js on the release edge so the decelerating audio is the sound that was
  // playing at the moment the player let go.
  setRewindPos() { this._rewindStartPos = this._capPos; }

  onBeat(fn) {
    if (typeof fn !== 'function') return () => {};
    this.beatListeners.push(fn);
    return () => {
      const i = this.beatListeners.indexOf(fn);
      if (i >= 0) this.beatListeners.splice(i, 1);
    };
  }

  onLoop(fn) {
    if (typeof fn !== 'function') return () => {};
    this.loopListeners.push(fn);
    return () => {
      const i = this.loopListeners.indexOf(fn);
      if (i >= 0) this.loopListeners.splice(i, 1);
    };
  }

  startSequencer() {
    if (this.timer) return;
    this.nextTime = this.ctx.currentTime + (this.bank ? 0.5 : 0.1);
    this.timer = setInterval(() => this.schedule(), 25);
  }

  /**
   * How far ahead to queue — see BACKGROUND_LOOKAHEAD.
   *
   * Read per call rather than latched on a `visibilitychange` listener, because the
   * engine is also the offline renderer and the test harness: a listener would need a
   * document to attach to, an unsubscribe to avoid leaking one per context, and a guard
   * for every place it is constructed without a DOM. Asking is free and cannot go stale.
   *
   * Widening it takes effect immediately and costs one longer pass of `scheduleStep`;
   * narrowing it takes effect by itself, since the loop below simply stops queueing
   * until `currentTime` catches up with what is already scheduled. Nothing is unwound,
   * so coming back to the window is silent — the notes queued while it was hidden are
   * the notes that play.
   */
  lookahead() {
    const foreground = this.sequencerLookahead;
    if (typeof document === 'undefined') return foreground;
    // Hidden OR merely unfocused. `document.hidden` only goes true for a tab behind
    // another tab, or a window minimised or fully covered — and none of those is what
    // working on this machine looks like. Switch to another app and the Chrome window
    // is usually still sitting there in plain sight, so `hidden` stays false while
    // macOS has already demoted the whole process: the 25ms interval stops landing at
    // 25ms and a quarter-second of queued audio runs out mid-bar. Gating on `hidden`
    // alone fixed the case nobody listens through and missed the one you work in.
    //
    // `hasFocus()` is the question actually being asked — is this window the one the
    // machine is giving its attention to — and it covers `hidden` as a side effect,
    // since a hidden document cannot hold focus. Both are named anyway: they are
    // separate states, a browser is free to report them independently, and the cost of
    // asking twice is nothing next to the cost of guessing wrong.
    return document.hidden || !document.hasFocus()
      ? Math.max(BACKGROUND_LOOKAHEAD, foreground) : foreground;
  }

  schedule() {
    if (!this.ctx || !this.bank) return;
    // How much queued audio was left when this pass began — the number that says
    // whether the main thread is keeping the sequencer fed. Normally it hovers a
    // little under the lookahead; after a long task it is the lookahead minus the
    // stall, and below zero the stall outlasted the queue: notes were scheduled
    // into the past, which is heard as a hole. Tracked as a floor and a count so
    // the desk's watchdog can SAY "that click cost the song 40ms" instead of the
    // glitch staying a rumour. Costs two compares on a path that runs 40× a second.
    const margin = this.nextTime - this.ctx.currentTime;
    if (margin < this._schedMarginMin) this._schedMarginMin = margin;
    if (margin < 0) this._schedLate++;
    const ahead = this.lookahead();
    while (this.nextTime < this.ctx.currentTime + ahead) this.scheduleStep();
  }

  /** The scheduler-starvation counters since last asked, and their reset. */
  takeSchedulerHealth() {
    const out = { marginMin: this._schedMarginMin, late: this._schedLate };
    this._schedMarginMin = Infinity;
    this._schedLate = 0;
    return out;
  }

  /**
   * The scheduler-WORK counters since last asked, and their reset.
   *
   * Separate from takeSchedulerHealth because they answer different questions and are
   * read by different callers: starvation is a fault the watchdog reacts to four times
   * a second, work is a profile a before/after comparison reads once per lap.
   */
  takeSchedulerWork() {
    const out = this._schedWork;
    this._schedWork = newSchedulerWork();
    return out;
  }

  /** The same counters WITHOUT resetting them — for a bench that reads at the end. */
  schedulerWork() { return { ...this._schedWork }; }

  /**
   * Queue further ahead than the lookahead, once, right now — armour for a
   * main-thread block the desk is about to cause ON PURPOSE.
   *
   * Expanding the whole-song piano roll rebuilds tens of thousands of DOM nodes in
   * one task (measured: ~200ms + a 120ms layout follow-up against a 250ms queue),
   * and no lookahead the desk can afford to run PERMANENTLY covers that: a wide
   * window is also how long a seek or a freshly painted note waits to be heard.
   * So the window stays a quarter-second, and the one place that KNOWS it is about
   * to stall calls this first. The notes scheduled are the notes that were coming
   * anyway, at the same times; the window then narrows by itself as the clock
   * catches up, exactly as lookahead() describes. Live only — an offline render
   * drives scheduleStep itself — and never during a preview's borrowed transport.
   */
  prefill(seconds = 1) {
    if (!this.ctx || !this.bank || this.offline || this._previewing) return;
    const upTo = this.ctx.currentTime + Math.min(2, Math.max(0, seconds));
    while (this.nextTime < upTo) this.scheduleStep();
  }

  /**
   * Forget the synths built for one preset, so the next note builds it as it is now.
   *
   * For the mixing desk's preset editor, and for nothing in the game: a song never
   * edits a voice mid-play. It exists because the alternative was a re-bank, and
   * `setBank` opens with a deliberate half-second gap — right for changing songs, and
   * half a second of silence between every pixel when what you are doing is dragging
   * a filter. See `VoiceRack.refresh`.
   */
  /**
   * An edit landed on a voice. Repair its cache from the playhead if it is playing.
   *
   * This is the single choke point every editor pot-move already goes through, which is
   * why the hook belongs here rather than in the panel: the desk gets the repair whether
   * the edit came from a knob, a pill, an undo or a shared link.
   *
   * Gated on the PURGE, not on the edit. `refresh` returns whether it actually threw
   * buffers away — a chorus-only tweak keeps them and needs nothing — so an edit that
   * costs the cache nothing costs the recovery nothing either.
   *
   * And gated on `transportRunning`, not `playbackActive`: the latter stays true while
   * the transport is paused, and a paused desk already drains its queue at full speed
   * (see `trickleAllowed`). Urgency is only meaningful against a moving playhead.
   */
  refreshVoice(voiceId) {
    const invalidated = this.voices?.refresh(voiceId);
    if (!invalidated || !voiceId) return;
    if (!this.noteCache || !this.noteCacheState?.transportRunning) return;
    // What the world looked like when this burst began. Compared again at fire time —
    // see `_runEditRecovery`. Only the FIRST edit of a burst records it, so a drag that
    // spans a song change is caught rather than quietly re-based onto the new song.
    if (!this._editRecovery.pending()) {
      this._editRecoveryAt = { bank: this.bank, generation: this.noteCacheState.generation };
    }
    this._editRecovery.edited.add(voiceId);
    this._editRecovery.schedule();
  }

  /**
   * Put the notes AROUND THE PLAYHEAD at the head of the queue, for every voice.
   *
   * Called when the desk stops itself. The queue at that moment holds the whole song —
   * measured at 1535 entries — sorted LATE-FIRST, which is right when warming a song from
   * the top and exactly wrong here: what decides whether playback can resume from where
   * the playhead is parked is the next couple of bars, and those were at the back.
   *
   * No `onlyVoiceIds`: this is not an edit repair, it is "make it possible to press Play
   * again", and every lane sounding at that point is part of the answer.
   */
  prepareFromPlayhead() {
    if (!this.noteCache || !this.noteCacheState || !this.bank) return this.noteCacheHealth();
    const plan = barPlan(this.bank);
    const formSteps = plan.length * 16;
    if (!formSteps) return this.noteCacheHealth();
    const from = Math.max(0, Math.min(formSteps, Math.floor(this.step) || 0));
    return this.prepareNoteCache(this.bank, {
      urgent: true,
      startStep: from,
      endStep: Math.min(formSteps, from + URGENT_WINDOW_STEPS),
    });
  }

  /**
   * Re-inventory the next couple of bars for the voices that were just edited.
   *
   * Everything here is checked at FIRE time rather than captured at schedule time,
   * because the whole point of a debounce is that the world may have moved on: the song
   * can be replaced, the transport stopped, the context rebuilt or the cache disabled in
   * the quarter second this waited. The cache GENERATION is the one that covers the
   * cases with no obvious hook — `setBank`, a panic, a teardown all bump it.
   */
  _runEditRecovery(voiceIds, { bank, generation }) {
    if (!voiceIds?.size) return;
    if (!this.noteCache || !this.noteCacheState) return;
    if (!this.noteCacheState.transportRunning) return;
    if (this.bank !== bank) return;
    if (this.noteCacheState.generation !== generation) return;
    const plan = barPlan(bank);
    const formSteps = plan.length * 16;
    if (!formSteps) return;
    // THE SCHEDULING CURSOR, not the audible playhead. `this.step` is the next step the
    // sequencer will book, which runs a lookahead ahead of what is being heard — and
    // that is exactly the right anchor here, because what needs a buffer is what is
    // about to be SCHEDULED.
    const from = Math.max(0, Math.min(formSteps, Math.floor(this.step) || 0));
    const opts = { urgent: true, onlyVoiceIds: voiceIds };
    // A loop is armed and the window runs off its end: repair to the end, then continue
    // from the top of the loop — with the distance carried across, so the first note
    // after the wrap ranks just behind the last note before it rather than tying with
    // the nearest note of all.
    const loopEnd = Number.isFinite(this.loopEnd) ? this.loopEnd : null;
    const loopStart = Number.isFinite(this.loopStart) ? this.loopStart : null;
    const wraps = loopEnd != null && loopStart != null
      && from < loopEnd && from + URGENT_WINDOW_STEPS > loopEnd;
    if (wraps) {
      const head = loopEnd - from;
      this.prepareNoteCache(bank, { ...opts, startStep: from, endStep: loopEnd });
      this.prepareNoteCache(bank, {
        ...opts,
        startStep: loopStart,
        endStep: Math.min(loopEnd, loopStart + (URGENT_WINDOW_STEPS - head)),
        priorityDistanceOffset: head,
      });
      return;
    }
    this.prepareNoteCache(bank, {
      ...opts, startStep: from, endStep: Math.min(formSteps, from + URGENT_WINDOW_STEPS),
    });
  }

  /**
   * Play one lane through the Tone voice its bank names, if it names one.
   *
   * Returns true when the voice owns the lane — including on a rest, where there is
   * nothing to play but the hand-rolled branch must still not run. Returns FALSE
   * before touching anything at all when the lane has no voice, which is every lane
   * of every song in the game today: no rack is built, no Tone class is constructed,
   * and scheduleStep runs the oscillator code it always did, sample for sample. That
   * is what keeps tests/null-test.js green, and it is the reason this is a guard
   * clause rather than a rewrite of the lane blocks.
   *
   * `spb` is seconds per 16th, so a voice's `dur` is in steps like every other lane
   * length in a bank. `delay`, `durScale` and `gainScale` exist for the written-in
   * repeats (bassRepeat), which are a second, softer statement of the same note.
   */
  _ensureVoiceRack() {
    if (!this.voices) {
      this.voices = new VoiceRack(this.ctx, this.noiseBuf, this.crashBuf, this.noteCacheState);
      // The map, by reference — so a rack rebuilt after a context teardown comes back
      // agreeing with the buttons the desk is still showing.
      this.voices.soloLayers = this.soloLayers;
      // ...and the desk's note cache, which outlives racks the same way.
      this.voices.noteCache = !!this.noteCache;
      this.voices.setMrdrTailCulling(this.mrdrTailCulling);
      this.voices.setMrdrQuality(this.mrdrQuality);
      this.voices.setNoteCachePlaybackActive(!!this.bank);
    }
    return this.voices;
  }

  /**
   * Construct pooled realtime voices used near the transport start.
   *
   * This is deliberately a short, synchronous walk. It runs immediately after the
   * desk installs a bank, while the transport's first lookahead is still protected by
   * the current task, and it uses the same stable lane gates as scheduleStep. The
   * first pass therefore does not discover a new Tone graph in the middle of a bar.
   */
  prepareRealtimeVoices({ startStep = 0, windowSteps = 128 } = {}) {
    if (this.offline || !this.ctx || !this.bank || !(windowSteps > 0)) return 0;
    const plan = barPlan(this.bank);
    if (!plan.length) return 0;
    const resolution = this.transportResolution || resolutionOf(this.bank);
    const formSteps = plan.length * 16;
    const count = Math.min(Math.ceil(windowSteps), formSteps);
    const start = ((Number(startStep) || 0) % formSteps + formSteps) % formSteps;
    let rack = this.voices;
    const prepared = new Set();
    let warmed = 0;

    for (let offset = 0; offset < count; offset++) {
      const formStep = (start + offset) % formSteps;
      const bar = plan[Math.floor(formStep / 16)];
      let b = this.bank;
      if (b.sections && b.sections.length && bar.sec != null) {
        const sec = resolveSection(b, bar.sec % b.sections.length);
        if (sec) b = { ...b, ...sec };
      }
      if (bar.off || bar.delete) {
        b = { ...b };
        for (const key of [...(bar.off || []), ...(bar.delete || [])]) b[key] = null;
      }
      const slot = formStep % 16;
      const s = Math.round(slot * resolution / 16) + bar.half * resolution;
      for (const lane of laneList(b)) {
        const key = lane.key;
        const voice = voiceOf(b, key);
        if (!voice || voice.kind === 'engine') continue;
        const value = sequenceValue(b, key, s, resolution);
        const notes = Array.isArray(value)
          ? value.flat(Infinity).filter((note) => Number.isFinite(note) && note > 0)
          : (Number.isFinite(value) && value > 0) || value === true ? [value] : [];
        if (!notes.length) continue;
        const strip = this.mixer?.lane(key);
        const gate = this._laneGate(key, strip ? strip.dry : this.musicBus,
          strip ? strip.wet : this.echoBus);
        const dry = gate ? gate.dry : (strip ? strip.dry : this.musicBus);
        const wet = gate ? gate.wet : (strip ? strip.wet : this.echoBus);
        const primaryEcho = key === 'keyGliss' || key === 'organGliss'
          ? false
          : key === 'organChords' ? b.organEcho !== false : laneEchoesIn(b, key);
        const echoes = key === 'bass' && b.bassRepeat
          ? [primaryEcho, false] : [primaryEcho];
        for (const echo of new Set(echoes)) {
          const poolKey = `${key}|${voice.id}|${echo ? 1 : 0}`;
          if (prepared.has(poolKey)) continue;
          prepared.add(poolKey);
          rack ||= this._ensureVoiceRack();
          if (rack.prepareRealtimeVoice(key, voice.id, dry, wet, echo, notes.length + 1)) warmed++;
        }
      }
    }
    return warmed;
  }

  playVoice(key, b, value, { spb, dry, wet, echo = true, delay = 0, durScale = 1, gainScale = 1, len = null }) {
    const seam = seamFor(key);
    const v = seam && voiceOf(b, key);
    // An ENGINE preset is not played here at all: it is a bundle of the bank keys the
    // hand-written voice already reads, merged onto the bank back in applyMix. By the
    // time the sequencer runs there is nothing left to distinguish it from a bank
    // that had been typed that way, which is the whole point — no second code path.
    //
    // Everything else — `tone` and `noise` alike — is played by the rack. Testing for
    // `!== 'tone'` here is what silently rejected every noise preset and let the
    // hand-written voice play instead, which looks exactly like a preset that does
    // nothing. Name the kind that is handled elsewhere, not the ones that are not.
    if (!v || v.kind === 'engine') return false;
    this._schedWork.voiceCalls++;
    // Percussion holds booleans: the bank says a hit happens, and the lane's own note
    // is what a synth gets struck at.
    const freq = value === true ? (b[seam.noteKey] ?? seam.note) : value;
    if (freq != null) {
      // The rack may schedule this beyond the ordinary lookahead (strums, arpeggios,
      // written repeats). Wake a sparse lane's insert graph through the actual attack,
      // not merely through the step on which the generated event was discovered.
      this.mixer?.lane(key)?.wakeEffects?.(this.nextTime + delay + 0.1);
      this._ensureVoiceRack();
      this._schedWork.voicePlays++;
      this.voices.play(key, v.id, freq, {
        time: this.nextTime + delay,
        // The track this one is paired with, if the song paired it — see `choke` in
        // src/data/arrangements.js. Which sounds cut each other off is a thing a song
        // decides about its own kit, not a thing a hi-hat is, so it is read off the
        // arrangement rather than off the preset or the bar.
        //
        // The pair is stored one way, so look both ways; the two names SORTED are the
        // group, which is what makes the hats and the open hats resolve to the same one
        // whichever of them is being played.
        choke: chokePairOf(this.arrangement?.choke, key),
        // A bank's own length key still wins over the preset's — a song that has been
        // dialled in keeps its numbers when it changes voice — and a note that was
        // drawn a length in the roll wins over both, because that is the most specific
        // thing anybody has said about it. `len` is a number, or one per chord tone;
        // the rack takes the array as it takes the chord. Absent, this is the
        // expression that was always here.
        //
        dur: noteSeconds(len, b[seam.durKey] ?? v.dur, spb, durScale, v.fixedLength),
        // Derived, never hand-set: every synth peaks somewhere different, so the
        // level is the lane's own target scaled by this preset's measured peak. A
        // bank that states the lane's gain still wins — that is a song's own decision,
        // and it is also what lets tools/measure-voices.js render a preset at unity
        // to find its peak in the first place.
        //
        // `laneTrim` is the drum lanes' version of that same "a song's own decision":
        // they have no single gain key, so the kit trims the hand-written voices
        // multiply in (drumGain, kickGain, …) have to be applied here or a preset
        // ignores the song's balance entirely and arrives at full reference level.
        // It is 1 on every melodic lane and on any bank that names no trims.
        gain: (b[seam.gainKey] ?? voiceGain(v, key) * laneTrim(b, key)) * gainScale * dbToGain(v.trim ?? 0),
        detune: this.detune,
        spb,
        dry,
        wet,
        echo,
        // Its own synths while the song keeps its own — see previewNote.
        preview: !!this._previewing,
        // ...and whether that note waits for a note-off. Two questions, because the
        // bench's pattern player wants the first and not the second: it plays previews
        // whose length it already knows. See `play` in voices.js.
        hold: !!this._previewing && this._previewHold !== false,
      });
    }
    return true;
  }

  /** Release a note sounded by previewNote — the note-off half of a key press. */
  releasePreviewNote(laneKey, freq) {
    if (this.voices) this.voices.releasePreview(laneKey, freq);
  }

  /**
   * Solo one layer of a stack — the same idea as a channel's S, one level down.
   *
   * Three layers summed into one output is exactly the sound you cannot take apart by
   * ear, so the panel needs a way to hear one at a time. Soloing several is additive,
   * as it is on the strips: two lit buttons means those two, together.
   *
   * MONITORING, and monitoring is never saved. Nothing here touches the preset, so a
   * solo cannot be written to the library, cannot reach a song, and cannot move a
   * measured level. It is also not persisted anywhere: reopen the desk and it is gone,
   * which is the correct behaviour for a switch you are meant to leave on for a minute.
   */
  setLayerSolo(voiceId, layerKey, on) {
    if (!voiceId || !layerKey) return;
    let set = this.soloLayers.get(voiceId);
    if (on) {
      if (!set) { set = new Set(); this.soloLayers.set(voiceId, set); }
      set.add(layerKey);
    } else if (set) {
      set.delete(layerKey);
      // An empty set removed rather than left behind, so the common case — nothing
      // soloed anywhere — is a `get` that returns undefined and a play path that does
      // no work at all.
      if (!set.size) this.soloLayers.delete(voiceId);
    }
    this._forgetRenderedNotes(voiceId);
  }

  /** Drop every layer solo, or one preset's. What closing the panel does. */
  clearLayerSolo(voiceId = null) {
    const had = voiceId ? [voiceId] : [...this.soloLayers.keys()];
    if (voiceId) this.soloLayers.delete(voiceId);
    else this.soloLayers.clear();
    for (const id of had) this._forgetRenderedNotes(id);
  }

  /**
   * Make the note cache forget one preset, because something changed that a rendered
   * note cannot show.
   *
   * A solo is monitoring rather than a preset key, so it never reaches `refresh` — but
   * it DOES change what a note is, by removing the layers it does not name. Without
   * this, lighting a solo while the cache held that preset would keep replaying the
   * full stack, and the button would look broken; clearing it would leave the soloed
   * layer alone on its own for as long as the buffers survived.
   *
   * The revision counter is exactly the right lever: `_cacheableLayer` refuses to cache
   * anything while a solo is lit, and bumping the revision makes what was rendered
   * BEFORE it unreachable. Same two lines `refresh` uses, and no new concept.
   */
  _forgetRenderedNotes(voiceId) {
    if (!voiceId) return;
    if (this.voices) {
      this.voices._specRev ||= new Map();
      this.voices._specRev.set(voiceId, (this.voices._specRev.get(voiceId) || 0) + 1);
      this.voices._invalidateCacheEntries?.(voiceId);
    } else if (this.noteCacheState) {
      invalidateNoteCacheState(this.noteCacheState, voiceId);
    }
  }

  /**
   * Sound one lane, once, now — the mixing desk's on-screen keyboard.
   *
   * Not a second synthesiser. The sequencer plays the note, handed a bank with
   * nothing in it but that note (soloBank), at a time of this call's choosing rather
   * than the song's: the lane goes through `lane()` onto its own channel strip, so a
   * pressed key is heard through the fader, pan, EQ, sends and effects it is being
   * mixed with, played by whatever the channel is played by — a library preset or the
   * hand-written voice. There is nothing here for those two to disagree about,
   * because neither of them is written here.
   *
   * Safe to call while the song is playing. The swap is synchronous and JavaScript is
   * single-threaded, so the 25 ms sequencer interval cannot land inside it; `bank`,
   * `step`, `nextTime` and `bpm` are all put back before anything else can look.
   *
   * `bank` is for a stopped desk, where the engine is holding none — pass the one the
   * mix applies to. `at` is how far ahead of now to schedule it: far enough that the
   * note is not already late, short enough that the key feels connected.
   *
   * A null `freq` asks for the lane's OWN note, which only a percussion lane has —
   * that is a drum pad, where the answer to "what does this kick sound like" is the
   * kick the song plays rather than one tuned to whatever key was under the finger.
   * On a melodic lane it is a rest, and nothing sounds.
   *
   * `hold` is the finger. A key press has no length until it is let go, so a previewed
   * note is held open and `releasePreviewNote` ends it — that is the default, and it is
   * what a keyboard is. A caller that already KNOWS the length passes `hold: false` and
   * gets the ordinary gate the sequencer plays, taken from the bank's own `…Dur` key:
   * the bench's pattern player knows a note lasts one step of its rate before the note
   * sounds, and a held one would ring to the rack's 30-second safety stop instead.
   */
  previewNote(laneKey, freq, { bank = null, at = 0.02, hold = true } = {}) {
    this.resumeAfterPanic();
    const src = bank || this.bank;
    if (!this.ctx || !src || !laneKey) return false;
    const one = soloBank(src, laneKey, freq, PREVIEW_STEP);
    if (!one) return false;
    const wasBank = this.bank;
    const wasStep = this.step;
    const wasNext = this.nextTime;
    const wasBpm = this.bpm;
    const wasSend = this.echoSend;
    this.bank = one;
    this.step = PREVIEW_STEP;
    this.nextTime = this.ctx.currentTime + at;
    // Open the song bus, if stopping the desk closed it.
    //
    // setBank(null) pulls songTrim down to 0.0001 — that is how stopping kills
    // whatever the sequencer had already queued into the lookahead, and it stays down
    // because the thing that reopens it is starting a song. A preview goes through
    // that same bus on purpose: it is the master's path and the meters' path, and a
    // note that skipped it would be a note you cannot hear in the mix you are making.
    // So with no song loaded the trim has to be opened here, or every key lands 80dB
    // down — which is not silence, and is exactly what it sounds like.
    //
    // Only when there is no bank. A song CHANGE mutes for half a second on purpose so
    // the old song's tail cannot run into the new one's downbeat, and a key pressed in
    // that gap is not a reason to hand the tail back. Nothing else closes it: choosing
    // or editing a preset goes through reapplyBank, which leaves the trim alone.
    //
    // At the song's own trim rather than at unity: musicTrim resets to 1 when the bank
    // goes, and a preview of a song that plays at 2.4 is not that song.
    if (this.songTrim && !wasBank) {
      const t = this.nextTime;
      this.songTrim.gain.cancelScheduledValues(t);
      this.songTrim.gain.setValueAtTime(one.musicTrim ?? this.musicTrim ?? 1, t);
    }
    // A stopped desk keeps whatever bpm the last song set, and note LENGTHS are in
    // steps — so a preview at the wrong tempo is a preview of the wrong sound.
    if (one.bpm) this.bpm = one.bpm;
    // scheduleStep pushes the song's echo send level at nextTime. A preview must not
    // reach into an automation the song is in the middle of, so the send is taken out
    // of view for the one call. Each lane's own send is on its strip and untouched.
    this.echoSend = null;
    // A preview gets its own synths, and this is the flag that says so — read in
    // `playVoice`, which is the only place that reaches the rack.
    //
    // The reason is Tone's, and it is a hard rule rather than a preference: an
    // instrument's oscillator keeps a state timeline, and a state may not be added
    // BEFORE one already on it. The sequencer schedules a playing song a quarter-second into the
    // future; a preview lands at `currentTime + 0.02`, which is in the middle of that.
    // Sharing the pool therefore threw — "the time must be greater than or equal to the
    // last scheduled time" — and took the desk's script with it, in the one situation
    // where previews matter most: editing notes while the song plays.
    //
    // A separate pool costs a handful of nodes per lane you preview, and `_retire`
    // clears them like any other. It is the whole fix: the song's timeline is never
    // written to out of order, because nothing else writes to it.
    this._previewing = true;
    this._previewHold = hold !== false;
    try {
      this.scheduleStep();
    } finally {
      this._previewing = false;
      this._previewHold = true;
      this.bank = wasBank;
      this.step = wasStep;
      this.nextTime = wasNext;
      this.bpm = wasBpm;
      this.echoSend = wasSend;
    }
    return true;
  }

  // One 16th step, scheduled at this.nextTime. Split out of schedule() so an
  // offline render can walk the whole song up front: an OfflineAudioContext has no
  // running clock, so every node must be scheduled before startRendering().
  //
  // The body is wrapped in a bare block purely to keep its original indentation.
  // This was the inside of schedule()'s while-loop; re-indenting 560 lines of voice
  // code would bury any real change in a diff nobody could review.
  scheduleStep() {
    {
      if (!this.applyPendingStep()) this.applyPendingLoop();
      // After those two, which can both move `this.step` — the boundary a pending
      // groove change is waiting for is the step actually about to be scheduled.
      this._applyPendingSwing();
      // And a queued Rearrange recipe with it, for the same reason: its boundary is a
      // bar line in the OUTPUT song, so it must be tested against the step this pass
      // is really about to schedule rather than the one it arrived on.
      this.applyPendingRearrangement();
      const spb = (60 / (this.bpm * this.tempo)) / 4; // seconds per 16th step
      const resolution = this.transportResolution;
      const tick = 16 / resolution;                   // transport remains in 16th units
      // The scheduler clock is the rearranged song's output position. Every read of
      // authored musical data below uses this mapped source position instead, while
      // `this.step` continues to drive the output-time groove and wrap machinery.
      const rearranged = this.rearrangementPosition(this.step);
      const sourceStep = rearranged ? rearranged.sourceStep : this.step;
      // Both generated drum modes are driven by the OUTPUT clock. Pitched lanes still
      // use `sourceStep` below, but percussion needs a pulse that keeps running when
      // the collage jumps between off-beat source slices.
      //
      //   basic4 — a steady generated kit, ignoring what the song wrote.
      //   song   — the song's own authored percussion, read at the output position.
      //            Same notes the song has always had, in the order it wrote them,
      //            underneath a top that has been re-cut. `_rearrangeOutputBar` below
      //            resolves that second bar once per bar rather than once per tick.
      const rearrangeDrumMode = rearranged
        ? rearrangementDrumMode(this.rearrangement) : null;
      // Every generated kit takes this path — they differ in pattern, not in where the
      // pulse comes from, which is the output clock for all of them.
      const basicRearrangeDrums = !!rearrangeDrumMode
        && REARRANGE_GENERATED_DRUMS.includes(rearrangeDrumMode);
      // A fill is a whole-band edit. Even when the recipe normally keeps the authored
      // song groove straight, its final burst follows the same output-to-source mapping
      // as the melodic lanes so the transition is audible in the kit too.
      const rearrangeFill = !!rearranged?.operation?.fill;
      // A SILENCED SLICE. Nothing sounds for its span — no authored lane, no generated
      // kit, no frozen stem — while the transport, the groove and the wrap machinery all
      // keep running underneath, because the slice still takes its time. Gated here rather
      // than per lane so there is one answer to "does this tick make a sound".
      const rearrangeMute = !!rearranged?.operation?.mute;
      const songRearrangeDrums = rearrangeDrumMode === 'song' && !rearrangeFill;
      const sourceBarIndex = Math.floor(sourceStep / 16);
      const sourceBarChanged = rearranged
        ? sourceBarIndex !== this._rearrangeSourceBar
        : false;
      if (rearranged) this._rearrangeSourceBar = sourceBarIndex;
      // Telemetry only, and read once here rather than recomputed at each counter:
      // `fine` is "this pass sits between two sixteenths", which is precisely the set
      // of passes a lane-local optimisation hopes to make cheaper. Legacy 16-step
      // songs never take it, so their counters read fine* === 0 and say so.
      const work = this._schedWork;
      const fine = !Number.isInteger(sourceStep);
      work.ticks++;
      if (fine) work.fineTicks++;
      // SWING. The song is written on the grid; this is how hard it is PLAYED off it.
      // The number is the on-grid sixteenth's share of its pair, as a percentage: 50 is
      // straight, ~58 is where most funk and hip-hop actually sits, 66.7 is the triplet
      // shuffle (exactly 2:1), 75 the dotted one. A pair lasts 2*spb, so the second note
      // of it lands at 2*spb*(pct/100) instead of at spb — a shift of spb*(pct-50)/50.
      //
      // Only the ODD sixteenth moves. The on-grid note stays exactly where it always
      // was, which is the whole reason one number can be applied to every lane at once:
      // downbeats, bar lines and any pad or chord sitting on a beat do not shift at all,
      // and the groove is entirely in the notes between them.
      //
      // This is an offset on the NOTE, never on the clock. `nextTime` at the bottom of
      // this method still advances by a flat spb, because the loop wrap, the bar plan,
      // songBeat(), the beat listeners and the desk's playhead all count steps off it —
      // a sequencer that swung its own clock would drag every one of them along with it,
      // and the song would come apart rather than groove.
      //
      // `this.step` rather than `s`: swing follows the transport, not whichever half of
      // whichever section this bar happens to name. The two agree — the section index
      // differs from the transport by a multiple of 16 — but the transport means it.
      //
      // Zero when off, and zero is exact: `x + 0` is x for every finite float, so a song
      // nobody has swung renders the samples it always did. tests/null-test.js checks
      // that claim by comparing renders sample for sample.
      // At 32nd resolution the halfway ticks follow the swung sixteenth pair by
      // interpolation: 0, half-delay, full-delay, half-delay. Legacy songs land on the
      // whole steps of that same pattern — 0 and full-delay — and so retain the exact
      // arithmetic they rendered with before.
      //
      // AND A TRIPLET DOES NOT SWING. Swing is a statement about a PAIR of sixteenths:
      // hold the first, delay the second. A triplet slot is not in that pair — it is a
      // third of the way through a sixteenth, with no on-beat/off-beat parity to
      // inherit — so there is no answer to "how swung is it" and it keeps the position
      // it was written on. Shoving it toward the nearer of the two would turn three
      // even notes into a limp, which is the one thing writing them on a real grid was
      // for. Same call `makeRhythmicGate` already makes for a gate pulse that lands
      // between sixteenths: the grid has no opinion there, so it is left alone.
      //
      // `halves` is the position counted in HALF sixteenths, which is exactly the grid
      // swing has an opinion about; a whole number means the tick is on it.
      const swingOffset = this._swingOffset(spb);
      // Rhythmic insert effects share the sequencer's clock. Schedule their gain
      // envelopes before the notes for this sixteenth, using the same audio timestamp
      // that every voice below receives. This keeps straight, dotted and triplet gates
      // aligned in offline renders and after live loop/jump changes.
      //
      // The swing goes with it, and `nextTime` stays unswung on purpose: this hook hands
      // over the STEP and the edge of it, and an effect on the grid works out its own
      // pulses from there. A gate at a division of an odd number of sixteenths lands on
      // the off-beat every other pulse, and those pulses are late with the song — see
      // the parity note in makeRhythmicGate.
      //
      // The tempo-synced delay (delayTimeSeconds) is the one that CANNOT follow: it is a
      // fixed interval applied to whatever arrives, and the interval a swung note wants
      // depends on which side of the beat it came from. Divisions of an even number of
      // sixteenths (1/8, 1/4, 1/4 dotted, a bar) map on-beat to on-beat and inherit the
      // swing for nothing; odd or triplet ones flam against it, by a third of a
      // sixteenth at a full shuffle. That is a real limit, not an oversight.
      // Existing rhythmic effects are authored on sixteenths. Fine ticks carry notes,
      // but must not double-trigger their modulation envelopes.
      if (Number.isInteger(this.step)) {
        this.mixer?.scheduleEffects?.(this.step, this.nextTime, spb, this.bpm * this.tempo, this.swing);
      }
      // Song form: bank.sections is a list of partial banks (lane overrides) and
      // bank.order the sequence to play them in — so a track can progress
      // verse/lift/bridge instead of looping one 2-bar phrase.
      //
      // Read a BAR at a time rather than a two-bar block. A plain number in `order`
      // still means what it always meant — section n, both its bars — and expands to
      // the same two numbers this used to compute for itself: `bar.sec` is
      // `order[floor(step/32)]` and `s` is `step % 32`. What the finer grain buys is
      // a bar that can name one half of a section and carry a mute mask, which is
      // the whole of arranging: the same phrase again with the kit out of it. See
      // src/data/arrangements.js.
      const plan = barPlan(this.bank);
      const bar = plan[sourceBarIndex % plan.length];
      if ((sourceStep % 16 === 0 || sourceBarChanged)
        && Number.isFinite(sourceStep)) {
        this.mixer?.scheduleBarEffectsForBar?.(bar, this.nextTime);
      }
      const frozenKeys = new Set();
      for (const key of (rearrangeMute ? [] : this.frozenLanes.keys())) {
        const frozenPercussion = PERCUSSION_LANES.includes(baseLane(key));
        // A frozen percussion stem contains the authored drum pattern. In the basic
        // Rearrange mode it must not leak back underneath the generated kit; melodic
        // freezes continue to follow their mapped source position as before.
        if (basicRearrangeDrums && frozenPercussion) continue;
        // Song groove wants the authored pattern at the OUTPUT position — which is
        // precisely what the stem holds there, because a freeze is the song rendered
        // against its own transport. So the same PCM serves both modes and only the
        // launch point moves; nothing has to be re-rendered to play drums straight.
        const frozenStep = songRearrangeDrums && frozenPercussion ? this.step : sourceStep;
        const state = this.frozenLanes.get(key);
        work.preambleFrozenWalks++;
        this._scheduleFrozenLane(key, state, frozenStep, this.nextTime, spb,
          plan.length * 16);
        if (this._frozenLaneCovers(key, frozenStep, plan.length * 16)) frozenKeys.add(key);
      }
      // THE HALF TICK NOTHING IS WAITING FOR.
      //
      // The transport runs at 32 for the whole song the moment any lane anywhere asks
      // for a 1/32 arpeggiator. On the 28-track stress song that is one override, on
      // one lane, in one bar of sixty-five — and it doubled every scheduler pass in the
      // other sixty-four, each one resolving thirty lanes that cannot have a note on an
      // odd slot and asking Note FX about lanes that have none. Measured: half of all
      // lane reads and half of all Note FX resolutions in the song, producing nothing.
      //
      // So skip the bar that does not need it. What still has to happen on a skipped
      // tick, and does, above and below:
      //
      //   · the pending step/loop/swing hand-offs, which ran at the top;
      //   · `scheduleEffects` and `scheduleBarEffectsForBar`, both already guarded to
      //     integer steps, so a half tick was never going to reach them;
      //   · the frozen-lane walk, left deliberately ahead of this — freeze launch
      //     points are PCM against the transport, not notes against a lane, and are not
      //     this optimisation's to move;
      //   · the Note FX state of every lane that has any, so a continuous arpeggiator
      //     cannot tell which ticks it was shown (see below);
      //   · the beat publish, the clock advance and the loop wrap, in _advanceTransport.
      //
      // `_fineBars` is null whenever a half step could carry AUTHORED content rather
      // than only generated events — a natively 32-step bank, a 64-slot lane array, a
      // track-level 1/32 arp — and then nothing here runs at all.
      if (resolution > LEGACY_RESOLUTION && !Number.isInteger(sourceStep) && this.fineLaneSkip
        && this._fineBars && !this._fineBars.has(sourceBarIndex % plan.length)) {
        // The one thing a skipped tick still owes the song. `noteFx.process` holds each
        // lane's arpeggiator state — where the run started, how far through it is, when
        // it expires — and that state advances per CALL, not per note. Show it the same
        // ticks it would have seen or the arpeggio in a later bar starts on a different
        // note. `value` is null because that is precisely what `sequenceValue` returns
        // on an odd slot for every lane here, which is what `_fineBars` being non-null
        // guarantees; with no source tones `len` is never read.
        for (const key of this._fineTickLanes) {
          const config = resolveNoteFx(this.mixEntry?.lanes?.[key]?.noteFx, bar, key);
          if (!config?.strum?.enabled && !config?.arp?.enabled) continue;
          work.notePlans++;
          work.fineNotePlans++;
          this.noteFx.process({ laneKey: key, value: null, len: null, step: this.step,
            spb, config, barIndex: Math.floor(this.step / 16) });
        }
        this._advanceTransport(spb, tick, plan);
        return;
      }
      const s = Math.round((sourceStep % 16) * resolution / 16) + bar.half * resolution;
      // The SIXTEENTH this tick falls in, which is the unit everything that has never
      // heard of a finer grid still counts in — bar effects, the rhythmic gates, the
      // per-bar reads below.
      const pulse = Math.floor(s * 16 / resolution);
      let b = this.bank;
      if (b.sections && b.sections.length && bar.sec != null) {
        const sec = resolveSection(b, bar.sec % b.sections.length);
        if (sec) { work.preambleMerges++; b = { ...this.bank, ...sec }; }
      }
      // Lanes this bar does not pass on. Nulled rather than emptied: every lane block
      // below already reads `b.lane && b.lane[s]`, so a null lane is a lane that does
      // not play, on the one path the whole engine already takes for a silent one.
      if (bar.off || bar.delete) {
        b = { ...b };
        for (const k of [...(bar.off || []), ...(bar.delete || [])]) b[k] = null;
      }
      // SONG GROOVE'S SECOND BAR. The output position names a bar of the song too, with
      // its own section, its own mute mask and its own half — everything resolved above
      // for the source bar, resolved again for the clock the drums are actually on.
      // Memoised on the bar object, so a whole bar of ticks costs one merge rather than
      // sixteen; see `_rearrangeOutputBank`. Nothing here runs in any other drum mode.
      const outputBar = songRearrangeDrums
        ? plan[Math.floor(this.step / 16) % plan.length] : null;
      const outputBank = outputBar ? this._rearrangeOutputBank(outputBar) : null;
      const sOutput = outputBar ? this._rearrangeOutputSlot(outputBar, resolution) : 0;
      // Lanes this HALF STEP cannot be about. `_fineLanes` is the set that can — a lane
      // array long enough to be indexed directly on an odd slot, or a lane whose Note FX
      // generate events of their own. Everything else would be handed the null that
      // `sequenceValue` returns for it anyway, so the answer is the same and the walk to
      // reach it is not taken. Null when nothing is known yet, which means "ask them all".
      const coarseHere = fine && resolution > LEGACY_RESOLUTION && this.fineLaneSkip && this._fineLanes;
      const writtenPercussion = (key) => {
        const values = b?.[key];
        if (!Array.isArray(values)) return false;
        return values.some((value) => Array.isArray(value)
          ? value.some((tone) => !!tone)
          : !!value);
      };
      const basicPercussionKeys = basicRearrangeDrums
        ? new Set([...PERCUSSION_LANES, ...(b.__layers || [])
          .filter((layer) => PERCUSSION_LANES.includes(baseLane(layer.key)))
          .map((layer) => layer.key)]
          .filter((key) => b?.[key] != null && (writtenPercussion(key) || voiceOf(b, key))))
        : null;
      const rawAt = (key) => {
        if (rearrangeMute) return null;
        if (coarseHere && !this._fineLanes.has(key)) return null;
        work.laneReads++;
        if (fine) work.fineLaneReads++;
        if (basicPercussionKeys?.has(key)
          && b?.[key] != null
          && PERCUSSION_LANES.includes(baseLane(key))) {
          return rearrangementDrumHit(baseLane(key), this.step, this.rearrangement.seed,
            rearrangeDrumMode);
        }
        // Song groove: the authored hit at the OUTPUT position, out of the output bar's
        // own resolved bank. The source read is not consulted at all for percussion —
        // that is the whole point, the drums are not being chopped.
        if (songRearrangeDrums && PERCUSSION_LANES.includes(baseLane(key))) {
          return sequenceValue(outputBank, key, sOutput, resolution);
        }
        return sequenceValue(b, key, s, resolution);
      };
      // Arrangement edits stay on the bar, so the authored section is never
      // rewritten. Frequencies are shifted here after the section delta resolves;
      // chords and layer lanes use the same recursive conversion as single notes.
      const barValue = (map, key, fallback = 0) =>
        typeof map === 'number' ? map : (Number.isFinite(map?.[key]) ? map[key] : fallback);
      // A bar's pan is the one per-bar transform that lives on a channel rather than
      // in the note being scheduled. Apply it at every bar edge, including a loop
      // wrap, before asking any lane whether it has a note. Without this, a sparse
      // lane whose first loop bar is a rest could leave the previous bar's offset on
      // its panner through that rest (and through any release tail). Note-bearing
      // lanes still pass through _barPan below for mid-bar edits; this edge pass is
      // what makes the reset independent of note density.
      if (Number.isInteger(sourceStep)
        && (sourceStep % 16 === 0 || sourceBarChanged) && this.mixer) {
        const panKeys = new Set(this._barPans.keys());
        if (typeof bar.pan === 'number') {
          for (const key of LANE_KEYS) panKeys.add(key);
          for (const layer of b.__layers || []) if (layer?.key) panKeys.add(layer.key);
        } else {
          for (const key of Object.keys(bar.pan || {})) panKeys.add(key);
        }
        for (const key of panKeys) {
          if (!this.mixer.lane(key)) continue;
          this._barPan(key, barValue(bar.pan, key) / 100,
            this.nextTime - BAR_PAN_SECONDS, true);
        }
      }
      const rearrangeTranspose = rearranged?.operation?.transpose || 0;
      // A chord loop: this slice plays N scale DEGREES away, in the recipe's key.
      // Unlike the chromatic transpose above, the distance differs per note — that is
      // what turns an Am riff into an F major one — so it cannot ride through
      // `semitone`; it is applied per value in the transpose pass below.
      const rearrangeHarmony = rearranged?.operation?.harmony || 0;
      const rearrangeKey = rearrangeHarmony ? this.rearrangement?.key || null : null;
      const semitone = (key) => barValue(bar.transpose, key)
        + (rearrangeTranspose && !PERCUSSION_LANES.includes(baseLane(key))
          ? rearrangeTranspose : 0);
      const shift = (v, n) => Array.isArray(v)
        ? v.map((x) => shift(x, n))
        : typeof v === 'number' && v > 0 ? v * 2 ** (n / 12) : v;
      // A number means "everything", and everything has to mean the LANES: this used
      // to take every non-percussion key of the bank and map `shift` over any array it
      // found, which reached `order` (numbers, but harmlessly — `barPlan` reads
      // `this.bank`, so the shifted copy is discarded) and `sections`/`__layers`
      // (objects, returned unchanged). A `bassLen` array is the first thing it would
      // genuinely corrupt: it would multiply note LENGTHS by 2^(n/12) and transposing
      // a bar down would shorten every note in it.
      const transposeKeys = new Set([
        ...Object.keys(typeof bar.transpose === 'object' ? bar.transpose || {} : {}),
        ...(typeof bar.transpose === 'number'
          ? [...LANE_KEYS, ...(b.__layers || []).map((L) => L.key)]
            .filter((k) => !PERCUSSION_LANES.includes(baseLane(k)))
          : []),
      ]);
      if (rearrangeTranspose || rearrangeKey) {
        for (const key of [...LANE_KEYS, ...(b.__layers || []).map((L) => L.key)]) {
          if (!PERCUSSION_LANES.includes(baseLane(key))) transposeKeys.add(key);
        }
      }
      // The chord loop, note by note: each frequency steps `rearrangeHarmony` scale
      // degrees within the recipe's key, so a minor phrase lands on its VI as a major
      // chord rather than as the parallel-minor smudge a flat shift would give.
      // Recursive for the same reason `shift` is — chords and layer values nest.
      const harm = (v) => Array.isArray(v)
        ? v.map(harm)
        : typeof v === 'number' && v > 0 ? harmonicShift(v, rearrangeKey, rearrangeHarmony) : v;
      if (transposeKeys.size) {
        work.preambleTransposes++;
        b = { ...b };
        for (const key of transposeKeys) {
          const n = semitone(key);
          const wantHarmony = rearrangeKey && !PERCUSSION_LANES.includes(baseLane(key));
          if ((n || wantHarmony) && Array.isArray(b[key])) {
            b[key] = b[key].map((v) => shift(wantHarmony ? harm(v) : v, n));
          }
        }
      }
      const fxPlans = new Map();
      const planFor = (key) => {
        if (fxPlans.has(key)) return fxPlans.get(key);
        // Same predicate as `rawAt`, and it must be: a lane skipped there has no source
        // tones to plan from, and every lane that HAS Note FX is in `_fineLanes` by
        // construction — so no arpeggiator loses a tick to this.
        if (coarseHere && !this._fineLanes.has(key)) { fxPlans.set(key, null); return null; }
        work.notePlans++;
        if (fine) work.fineNotePlans++;
        // A song-groove percussion lane is entirely a creature of the output bar, so its
        // per-bar Note FX override and its note length come from there too. Anything
        // else would arpeggiate this bar's hits with another bar's settings.
        //
        // Asked as a predicate rather than by comparing `fxBar === outputBar`: the
        // source and output bars can be the SAME object — the plan repeats, so two
        // positions a whole number of bars apart in the form share one — while `s` and
        // `sOutput` still point at different sixteenths of it. Identity would then send
        // a melodic lane's length lookup to the drums' slot.
        const onOutputClock = songRearrangeDrums && PERCUSSION_LANES.includes(baseLane(key));
        const config = resolveNoteFx(this.mixEntry?.lanes?.[key]?.noteFx,
          onOutputClock ? outputBar : bar, key);
        if (!config?.strum?.enabled && !config?.arp?.enabled) {
          fxPlans.set(key, null);
          return null;
        }
        const value = rawAt(key);
        const len = onOutputClock
          ? effectiveStepLen(outputBank, key, sOutput, resolution)
          : effectiveStepLen(b, key, s, resolution);
        const events = this.noteFx.process({ laneKey: key, value, len, step: this.step,
          spb, config, barIndex: Math.floor(this.step / 16) });
        fxPlans.set(key, events);
        return events;
      };
      let suppressFrozen = false;
      const at = (key) => {
        if (suppressFrozen && frozenKeys.has(key)) return null;
        const events = planFor(key);
        if (!events) return rawAt(key);
        if (!events.length) return null;
        return events.length === 1 ? events[0].freq : events.map((event) => event.freq);
      };
      const eventFor = (key, freq, index = 0) => {
        const events = planFor(key);
        if (!events) return null;
        return events.find((event, i) => i === index || event.freq === freq) || null;
      };
      // Kit tally for the visualisers. `b` is fully resolved by this point —
      // section overrides merged, this bar's mute mask nulled out, and any lane
      // the desk deleted already gone with it — so this is the arrangement's own
      // answer to "is there a kit here", not a guess at transients in the
      // spectrum. A bar that arranges the drums out reads as drumless on the
      // exact step it does. A strip muted on the desk still counts, and should:
      // that mute is monitoring, a state of the person listening rather than of
      // the song, and it is the song the picture is supposed to be following.
      // Queued at `nextTime` and only tallied once that time has passed, since
      // this runs inside the lookahead window rather than at the audible edge.
      const percussionKeys = [
        ...PERCUSSION_LANES,
        ...(b.__layers || []).filter((L) => PERCUSSION_LANES.includes(baseLane(L.key)))
          .map((L) => L.key),
      ];
      if (percussionKeys.some((key) => at(key))) {
        // Swung, so a shuffled hat FLASHES shuffled rather than on a grid the song is
        // no longer playing to. The lane's own `offset` nudge is deliberately left out:
        // this queue is one time for the whole kit, and swing is the only part of the
        // answer that every percussion lane shares.
        this._percPending.push(this.nextTime + swingOffset);
        // Only _readPercussion drains this, and it only runs while the jukebox
        // visualiser is up — where the sequencer runs for the whole game. Aged
        // out by playhead rather than capped by count, so gameplay stays bounded
        // at a few seconds of sixteenths while an offline render keeps the song's
        // entire kit timeline. Stated as `!offline` rather than left to the clock:
        // the render walk used to run entirely at currentTime 0, but it schedules
        // just-in-time now (see renderBankPage), so an offline clock DOES advance
        // — and the kit timeline a rendered video follows must not be aged out
        // underneath it.
        if (!this.offline && this._percPending.length > 128) {
          const stale = this.ctx ? this.ctx.currentTime - 8 : -Infinity;
          let drop = 0;
          while (drop < this._percPending.length && this._percPending[drop] < stale) drop++;
          if (drop) this._percPending.splice(0, drop);
        }
      }
      // Frozen audio has now contributed to the musical/visual tally. From this point
      // its source notes are suppressed so the synth is not layered under its PCM.
      suppressFrozen = true;
      // Lanes the MIX has silenced, taken out the same way a bar's mute mask is:
      // nulled, so every block below skips them on the path it already has for a
      // lane that does not play. A muted strip's fader is zero and every send taps
      // downstream of it, so the notes this skips were reaching no output — they
      // were only costing the audio thread, which on a dense song is the difference
      // between playing and breaking up (measured: the muted twinkle lane alone was
      // 5% of a core on smw-all-instruments). AFTER the percussion tally above, so
      // the visualisers keep following the song as arranged rather than as
      // monitored — the tally's comment says a muted strip still counts, and it
      // still does. Guarded by the desk's opt-in flag and off during previews; the
      // game never sets it, so every game path is byte-identical. See
      // setSilentLaneSkip for the one honest cost (what un-muting reveals, when).
      if (this.silentLaneSkip && this.mixer && !this._previewing) {
        work.preambleSilentSweeps++;
        const silent = [];
        for (const key of LANE_KEYS) if (b[key] && this.mixer.laneSilent(key)) silent.push(key);
        for (const L of b.__layers || []) if (b[L.key] && this.mixer.laneSilent(L.key)) silent.push(L.key);
        if (silent.length) {
          b = { ...b };
          for (const k of silent) b[k] = null;
        }
      }
      // Where this lane's voices land. `lane()` is called at the top of each lane
      // block below and repoints dry/wet at that lane's channel strip, so every
      // voice created after it lands on its own fader, pan, EQ and sends. Without
      // a mixer (headless tests, or before ensure()) both fall back to the shared
      // buses and the graph is exactly what it was.
      let dry = this.musicBus, wet = this.echoBus;
      let laneOffset = 0;
      // Which lane the bodies below are currently building for. Only ever read by
      // the non-finite guard in `play`, so a warning can name the lane that carries
      // the bad number rather than only the step it happened on.
      let lastLane = '';
      // Pooled voices keep a stable dry/wet route for their lifetime. A per-bar trim
      // is applied to their note level instead of selecting a new bus, which would
      // force VoiceRack to retire and rebuild the pool. Native hand-rolled lanes still
      // use the bus below because their envelope paths converge on `play`.
      let laneGainScale = 1;
      const offsetFor = (key) => barValue(bar.offset, key) * spb / 2;
      const scheduleAt = (delta = 0) => this.nextTime + laneOffset + swingOffset + delta;
      // The same instant, as an OFFSET from the step edge rather than an absolute time —
      // `playVoice` adds it to `nextTime` itself, so it is the one path into the rack
      // that does not come through `scheduleAt`.
      //
      // It exists so the two cannot drift apart. Every lane below is written twice: a
      // hand-rolled body that goes through `play`/`scheduleAt`, and a `voiced` call that
      // hands the same note to a library voice instead. When only the first of those
      // knew about swing, a lane played it straight or shuffled depending on whether
      // somebody had assigned it a voice on the desk — hats on sixteenths being exactly
      // the case where that is loudest.
      const voiceDelay = (delta = 0) => laneOffset + swingOffset + delta;
      const lane = (key) => {
        // Preview notes use their own synth timeline, but they still belong to the
        // selected channel. Keep them on that channel's live strip so its inserts,
        // EQ, fader, and both sends are the same ones shown in the desk.
        const strip = this.mixer && this.mixer.lane(key);
        // Channel inserts sleep while their measured output is silent. Do not wake one
        // merely because its lane ARRAY exists on this step — that is every rest in a
        // sparse track. `at` is already the resolved musical event (arrangement masks and
        // Note FX included); delayed hand-built notes extend this hold again in `play`.
        const laneValue = at(key);
        const sounds = Array.isArray(laneValue)
          ? laneValue.some((value) => Number.isFinite(value) && value > 0)
          : laneValue === true || (Number.isFinite(laneValue) && laneValue > 0);
        if (sounds) {
          const attackAt = this.nextTime + offsetFor(key) + swingOffset;
          strip?.wakeEffects?.(attackAt + 0.1);
          this.expectOutput(attackAt, Math.max(0.35, spb * 2));
        }
        const gate = this._previewing && !strip
          ? this._benchGate(key)
          : this._laneGate(key, strip ? strip.dry : this.musicBus,
            strip ? strip.wet : this.echoBus);
        const baseDry = gate ? gate.dry : (strip ? strip.dry : this.musicBus);
        const baseWet = gate ? gate.wet : (strip ? strip.wet : this.echoBus);
        lastLane = key;
        laneOffset = offsetFor(key);
        const db = barValue(bar.gain, key);
        const scale = 10 ** (db / 20);
        const voice = voiceOf(b, key);
        const pooledVoice = !!voice && voice.kind !== 'engine';
        laneGainScale = pooledVoice ? scale : 1;
        if (scale === 1 || pooledVoice) {
          dry = baseDry; wet = baseWet;
        } else {
          // A per-bar bus keeps the adjustment on every native voice shape, including
          // hand-rolled percussion, without duplicating the many envelope
          // implementations below. Pooled presets take the stable route above and
          // receive the same scale in `playVoice`. The bus is HELD between steps — a
          // new pair each step is a new graph to the voice rack.
          const bus = this._barGainBus(key, db, scale, baseDry, baseWet);
          if (bus) { dry = bus.dry; wet = bus.wet; }
          else { dry = baseDry; wet = baseWet; }
        }
        // The bar's pan offset, written onto this channel's own pot rather than onto a
        // node in front of it — see `_barPan`. Bar edges are handled for every touched
        // lane above, so this note-local write only needs to catch a lane first heard
        // after the edge (or a lane whose value changed in the middle of the bar).
        //
        // A ramp's length AHEAD of the step, so it ARRIVES on it. `lane()` runs when a
        // lane has something to play, which on a bar whose first note is not on the
        // downbeat is that note — and a move that started at the note would leave its
        // attack, the loudest part of it, still coming from where the last bar was.
        if (strip) {
          this._barPan(key, barValue(bar.pan, key) / 100,
            this.nextTime - BAR_PAN_SECONDS);
        }
      };
      // Point a lane at its strip and offer it to the voice library, in that order —
      // playVoice needs `dry`/`wet` to be this lane's, and `lane()` is what sets them.
      //
      // Every lane below reads `&& !voiced(...)`: true means a Tone preset owns the
      // lane and has already scheduled the note, so the hand-written body is skipped.
      // A lane naming no preset returns false having touched nothing, which is why
      // this is a guard rather than a rewrite — and why the null test stays green.
      // What the roll drew on this step of this lane, if anything: a length in steps,
      // or one per chord tone. Read once per lane and passed down, so a preset voice
      // and the hand-written body below it always agree about how long a note is —
      // they are two ways of playing the same drawn rectangle, not two lanes.
      const lenOf = (key) => {
        const events = planFor(key);
        if (!events) return effectiveStepLen(b, key, s, resolution);
        const values = events.map((event) => event.len).filter((len) => len != null);
        return values.length > 1 ? values : (values[0] ?? effectiveStepLen(b, key, s, resolution));
      };
      const toneLenOf = (key, i = 0) => {
        const event = planFor(key)?.[i];
        return event?.len ?? effectiveToneLength(b, key, s, i, resolution);
      };
      const voiced = (key, value, opts = {}) => {
        lane(key);
        const events = planFor(key);
        if (events) {
          let played = false;
          const extraDelay = opts.delay == null ? 0 : opts.delay - voiceDelay();
          for (const event of events) {
            played = this.playVoice(key, b, event.freq, {
              spb, dry, wet, ...opts,
              gainScale: (opts.gainScale ?? 1) * laneGainScale,
              delay: voiceDelay(extraDelay + event.delay), len: event.len,
            }) || played;
          }
          return played;
        }
        return this.playVoice(key, b, value,
          { spb, dry, wet, delay: voiceDelay(), len: lenOf(key), ...opts,
            gainScale: (opts.gainScale ?? 1) * laneGainScale });
      };
      // Every oscillator voice on the desk goes through here — bass, lead, harmony,
      // twinkle, chords, both organs and electroFx — so MELODIC_TRIM lands on all of
      // them at once, bank overrides included. The lanes that build their own nodes
      // (sweeps, gliss, keyGliss, organSwoop, vox, shout) apply it themselves.
      /**
       * One step's worth of frequencies, whether it holds a note or a chord.
       *
       * The hand-written pitched bodies below were each written for ONE frequency, and
       * that — not the synthesis — is the only reason a `lead` could not hold a chord
       * while `chords` could. `play()` builds its own oscillator per call, so running a
       * body once per tone costs nothing and is exactly what the chord lanes already do.
       * `twinkle` has always called `play` twice for a single note, which is the same
       * fact from the other side: polyphony here is a loop, not a capability.
       *
       * A scalar yields one element, so every bank in the game takes the identical path
       * it always did — see tests/null-test.js, which is what that claim is worth.
       */
      const tonesOf = (v) => (Array.isArray(v)
        ? v.filter((f) => typeof f === 'number' && f > 0)
        : (v == null ? [] : [v]));

      const play = (freq, type, dur, gain, attack = 0.01, echo = true, delay = 0) => {
        if (freq == null) return;
        // An AudioParam REJECTS a non-finite value by throwing, and this is inside
        // the scheduling pass: one NaN out of a malformed bank would take down the
        // pass that schedules everything, and every pass after it, which is a
        // silence with no bottom to it. A note skipped is one note; a scheduler
        // killed is the song. So the arithmetic is checked once here, where all of
        // it converges, and a bad note is dropped loudly instead.
        if (!Number.isFinite(freq) || !Number.isFinite(dur) || !Number.isFinite(gain)) {
          console.warn('[audio] skipping a note with non-finite numbers',
            { lane: lastLane, freq, dur, gain, step: this.step });
          return;
        }
        const t = scheduleAt(delay + (eventFor(lastLane, freq)?.delay || 0));
        // Written repeats and Note-FX events can land well beyond the step that found
        // them. Keep a sleeping channel insert connected through this actual attack.
        this.mixer?.lane(lastLane)?.wakeEffects?.(t + 0.1);
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq * this.detune, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain * MELODIC_TRIM, t + Math.min(attack, dur * 0.45));
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        // ...and then to actual zero, before the oscillator is stopped.
        //
        // An exponential ramp cannot reach zero, so it is aimed at an ABSOLUTE 0.0001
        // and the note is left sounding at that level until `stop()` cuts it — a step
        // straight to silence, which is a click. It goes unnoticed on a loud lane,
        // where 1e-4 is 80dB down; on a quiet one it is not far below the note itself.
        // megamix's chord stabs (chordGain 0.045) clicked once a second for this,
        // 120 times a song, each one repeated by the echo they send to.
        //
        // The 20ms between the envelope ending and the oscillator stopping was already
        // there and doing nothing, so the fade costs no time and no nodes.
        g.gain.linearRampToValueAtTime(0, t + dur + 0.015);
        o.connect(g); g.connect(dry);
        if (echo) g.connect(wet);
        o.start(t); o.stop(t + dur + 0.02);
      };
      // The echo bus is not touched per bar any more. A section used to push it with
      // its own `echoLevel`, which is why a mix's delay sends were only ever worth
      // what the section said — see the note over echoBus in ensure(). `echoLevel`
      // survives in the banks as inert song data; the sends carry the same shape,
      // where the desk can see them.
      if (b.bass) {
        lane('bass');
        // Dry by default (the highpass strips most bass fundamentals anyway,
        // so echo there is usually just wasted CPU) — a bank can opt in with
        // bassEcho: true to catch the sawtooth/square harmonics in the echo,
        // or echoEverything: true to send every lane (percussion included).
        // Every body below derives from this one number — the filtered saw's filter
        // ramp, the 80s bass's three stacked oscillators, the ghost repeat — so the
        // drawn length reaches all of them by being read here and nowhere else.
        const bassLen = lenOf('bass');
        const bassDur = spb * toneLenOf('bass');
        const bassGain = b.bassGain ?? 0.1;
        const bassEcho = !!b.bassEcho || !!b.echoEverything;
        // A Tone voice, if the bank names one, takes the lane whole — the three
        // hand-rolled bodies below are alternatives to it, not layers under it. The
        // note is already scheduled by the time this returns; the empty branch is
        // deliberate, and it is here rather than wrapping the three bodies in an `if`
        // so that this stays a one-line diff against code nobody wants re-indented.
        const bassNote = at('bass');
        const bassByVoice = voiced('bass', bassNote, { echo: bassEcho });
        if (bassByVoice) {
          // nothing further: the voice is the whole bass
        } else if (b.bassFilteredSaw && bassNote != null) {
          // Resonant low-pass saw bass: harmonic enough to survive small
          // speakers, but with the bright edge closing quickly into a round
          // sustained body. A quiet sine sub keeps the bottom anchored.
          //
          // Each tone gets its own saw, its own filter and its own sub: a chord here is
          // three of this bass, not one of it with three pitches, and a shared filter
          // would be a different instrument.
          for (const [toneIndex, note] of tonesOf(bassNote).entries()) {
            const noteDur = spb * toneLenOf('bass', toneIndex);
            const t = scheduleAt(eventFor('bass', note, toneIndex)?.delay || 0);
            const f = note * this.detune;
            const o = this.ctx.createOscillator(); o.type = 'sawtooth';
            o.frequency.setValueAtTime(f, t);
            const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass';
            filter.Q.value = b.bassFilterQ ?? 1.15;
            filter.frequency.setValueAtTime(b.bassFilterOpen ?? 1150, t);
            filter.frequency.exponentialRampToValueAtTime(b.bassFilterClose ?? 320, t + noteDur);
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(bassGain, t + (b.bassAttack || 0.006));
            g.gain.exponentialRampToValueAtTime(0.0001, t + noteDur);
            g.gain.linearRampToValueAtTime(0, t + noteDur + 0.02 - 0.005);
            o.connect(filter); filter.connect(g); g.connect(dry);
            if (bassEcho) g.connect(wet);
            o.start(t); o.stop(t + noteDur + 0.02);
            play(note * 0.5, 'sine', noteDur * 1.05,
              bassGain * (b.bassFilteredSawSubGain ?? 0.22), 0.008, false);
          }
        } else if (b.bass80s && bassNote != null) {
          // Compact 1980s-style synth bass: a square body for definition, a
          // rounded sine sub beneath it, and a very short octave tick on the
          // attack. No filterless saw drone and no compulsory ghost repeat.
          for (const [toneIndex, f] of tonesOf(bassNote).entries()) {
            const noteDur = spb * toneLenOf('bass', toneIndex);
            play(f, b.bass80sBodyType || 'square', noteDur,
              bassGain * (b.bass80sBodyGain ?? 0.78), b.bassAttack || 0.004, bassEcho);
            play(f * 0.5, 'sine', noteDur * 1.08,
              bassGain * (b.bass80sSubGain ?? 0.34), 0.006, false);
            // A real low-mid octave layer rather than a near-inaudible click: it
            // carries the bass identity on phone speakers that cannot reproduce
            // the sub fundamental.
            play(f * 2, 'triangle', noteDur * 0.62,
              bassGain * (b.bass80sOctaveGain ?? 0.34), 0.003, false);
          }
        } else {
          for (const [toneIndex, f] of tonesOf(bassNote).entries()) {
            play(f, b.bassType || 'square', spb * toneLenOf('bass', toneIndex),
              bassGain, b.bassAttack || 0.01, bassEcho);
          }
        }
        // bassRepeat: one softer restatement of the note N steps later — a
        // written-in slapback, not a delay tap, so it has no feedback tail and
        // stays locked to the grid. Always dry: echoing a ghost note doubles it.
        if (b.bassRepeat) {
          if (bassByVoice) {
            // The ghost is the same voice, quieter and shorter. Restating it on the
            // hand-rolled square instead would put two different basses in one lane.
            this.playVoice('bass', b, bassNote, {
              spb, dry, wet, echo: false, delay: voiceDelay(spb * b.bassRepeat),
              durScale: b.bassRepeatDur ?? 0.8,
              gainScale: (b.bassRepeatGain ?? 0.4) * laneGainScale,
              len: bassLen,
            });
          } else {
            for (const f of tonesOf(bassNote)) {
              play(f, b.bassType || 'square', bassDur * (b.bassRepeatDur ?? 0.8),
                bassGain * (b.bassRepeatGain ?? 0.4), b.bassAttack || 0.01, false, spb * b.bassRepeat);
            }
          }
        }
        // The star arpeggio follows the song's key, and it wants a NOTE. A chord's
        // lowest tone is its root, and tonesOf sorts nothing — but noteCell writes the
        // array ascending, so [0] is the bottom of what was played.
        const bassRoot = tonesOf(bassNote)[0];
        if (bassRoot != null) this.starRoot = bassRoot;
      }
      if (b.lead) {
        lane('lead');
        const leadDur = spb * toneLenOf('lead');
        const leadGain = b.leadGain ?? 0.06;
        // leadBright is an octave sine sitting ON the square lead — part of what the
        // hand-rolled lead IS, so it goes with it rather than doubling a Tone voice
        // that has its own harmonics.
        const leadNote = at('lead');
        if (!voiced('lead', leadNote)) {
          // Once per tone. One note is one pass, which is the path every existing bank
          // takes; a recorded chord is three, each with its own oscillator and its own
          // bright octave over it.
          for (const [toneIndex, f] of tonesOf(leadNote).entries()) {
            const noteDur = spb * toneLenOf('lead', toneIndex);
            play(f, b.leadType || 'square', noteDur, leadGain, b.leadAttack || 0.01);
            if (b.leadBright) {
              play(f * 2, 'sine', noteDur * 0.68,
                leadGain * (b.leadBrightGain ?? 0.16), 0.004, false);
            }
          }
        }
      }
      // parallel-3rds partner voice
      if (b.leadHarm) {
        lane('leadHarm');
        const harmNote = at('leadHarm');
        if (!voiced('leadHarm', harmNote)) {
          for (const [toneIndex, f] of tonesOf(harmNote).entries()) {
            play(f, b.harmType || b.leadType || 'square', spb * toneLenOf('leadHarm', toneIndex), b.harmGain ?? 0.04, b.harmAttack || b.leadAttack || 0.01);
          }
        }
      }
      const twinkleNote = at('twinkle');
      if (twinkleNote && !voiced('twinkle', twinkleNote)) {
        lane('twinkle');
        for (const [toneIndex, f] of tonesOf(twinkleNote).entries()) {
          const twinkleDur = spb * toneLenOf('twinkle', toneIndex);
          play(f, 'sine', twinkleDur, b.twinkleGain ?? 0.014, b.twinkleAttack || 0.035);
          play(f * 2, 'sine', twinkleDur * 0.65, (b.twinkleGain ?? 0.014) * 0.28, 0.02);
        }
      }
      // `!voiced(...)` first, as every lane above reads: true means a preset owns the
      // lane and has already scheduled the note, so the hand-written body is skipped. A
      // song naming no preset returns false having touched nothing, which is why this is
      // a guard rather than a rewrite — and why the null test stays green.
      const electroNote = at('electroFx');
      if (electroNote && !voiced('electroFx', electroNote)) {
        lane('electroFx');
        // Sparse deterministic "random" shop-machine flourishes. The grid
        // position selects one of three tiny electronic gestures, so offline
        // auditions and live playback stay identical on every loop.
        const t = scheduleAt();
        const f = electroNote * this.detune;
        const gain = b.electroFxGain ?? 0.012;
        const dur = spb * (b.electroFxDur || 0.86);
        const kind = pulse % 3;
        if (kind === 2) {
          play(f, 'sine', dur, gain, 0.002, true);
          play(f * 2.01, 'sine', dur * 0.62, gain * 0.42, 0.002, false);
        } else {
          const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
          o.type = kind === 0 ? 'square' : 'triangle';
          const from = kind === 0 ? f * 0.72 : f * 1.8;
          const to = kind === 0 ? f * 1.45 : f * 0.68;
          o.frequency.setValueAtTime(from, t);
          o.frequency.exponentialRampToValueAtTime(to, t + dur);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(gain, t + 0.003);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
          g.gain.linearRampToValueAtTime(0, t + dur + 0.02 - 0.005);
          o.connect(g); g.connect(dry); g.connect(wet);
          o.start(t); o.stop(t + dur + 0.02);
        }
      }
      // `sweeps` holds a marker rather than a pitch, so the seam supplies the note a
      // synth is struck at — the same arrangement the kit uses. The `noiseBuf` guard
      // stays on the hand-written body, which is the only half that needs one.
      const sweepNote = at('sweeps');
      if (sweepNote && !voiced('sweeps', sweepNote) && this.noiseBuf) {
        lane('sweeps');
        // Heavily filtered air: a narrow band slowly opens and closes beneath
        // a low-pass ceiling. It should be felt as motion, not heard as hiss.
        const t = scheduleAt();
        const dur = spb * (b.sweepDur || 10);
        const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
        const band = this.ctx.createBiquadFilter(); band.type = 'bandpass'; band.Q.value = 1.45;
        band.frequency.setValueAtTime(340, t);
        band.frequency.exponentialRampToValueAtTime(1350, t + dur * 0.55);
        band.frequency.exponentialRampToValueAtTime(460, t + dur);
        const low = this.ctx.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = 1800; low.Q.value = 0.5;
        const g = this.ctx.createGain();
        const gain = (b.sweepGain ?? 0.013) * MELODIC_TRIM;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.32);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        g.gain.linearRampToValueAtTime(0, t + dur + 0.03 - 0.005);
        src.connect(band); band.connect(low); low.connect(g);
        if (this.ctx.createStereoPanner) {
          const pan = this.ctx.createStereoPanner();
          const from = pulse % 2 ? 0.35 : -0.35;
          pan.pan.setValueAtTime(from, t); pan.pan.linearRampToValueAtTime(-from, t + dur);
          g.connect(pan); pan.connect(dry);
        } else g.connect(dry);
        src.start(t); src.stop(t + dur + 0.03);
      }
      const keyGlissNote = at('keyGliss');
      if (keyGlissNote) {
        lane('keyGliss');
        // keyboard-sweep glissando: discrete scale notes (a hand dragged up
        // the white keys) running an octave up into the target, cresc. slightly
        const fT = keyGlissNote * this.detune;
        const steps = [-12, -10, -9, -7, -5, -4, -2, 0]; // natural-minor run
        const dt = (spb * 3) / steps.length;
        const gv = (b.keyGlissGain != null ? b.keyGlissGain : 0.035) * MELODIC_TRIM;
        // A run is ONE gesture rather than eight notes to pick eight sounds for, so a
        // preset is played eight times at rising offsets — which is exactly what
        // `bassRepeat` does with its ghost note, on the `delay` playVoice has always
        // taken. `map` rather than `some`: `some` stops at the first truthy return and
        // would schedule the first note of the run and none of the other seven.
        //
        // Undetuned, because the rack applies the song warp itself; the crescendo rides
        // `gainScale`; and dry, because the hand-written body below is dry.
        const runByVoice = steps.map((semi, i) => this.playVoice('keyGliss', b,
          keyGlissNote * Math.pow(2, semi / 12),
          {
            spb, dry, wet, echo: false, delay: voiceDelay(i * dt),
            gainScale: laneGainScale * (0.6 + 0.4 * ((i + 1) / steps.length)),
          }))[0];
        if (!runByVoice) steps.forEach((semi, i) => {
          const t = scheduleAt(i * dt);
          const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
          o.type = b.leadType || 'square';
          o.frequency.setValueAtTime(fT * Math.pow(2, semi / 12), t);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(gv * (0.6 + 0.4 * ((i + 1) / steps.length)), t + 0.006);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dt * 1.7);
          g.gain.linearRampToValueAtTime(0, t + dt * 1.7 + 0.02 - 0.005);
          o.connect(g); g.connect(dry);
          o.start(t); o.stop(t + dt * 1.7 + 0.02);
        });
      }
      // Echo left at the default rather than off: the hand-written body builds its own
      // panned taps below, and the song's delay send is the closest a preset gets to
      // them. A dry preset here would be the one swap that sounds like a mistake.
      const glissNote = at('gliss');
      if (glissNote && !voiced('gliss', glissNote)) {
        lane('gliss');
        // glissando: sweep up from an octave below into the target note,
        // with echo taps panned left -> center -> right across the field
        const t = scheduleAt();
        const fT = glissNote * this.detune;
        const o = this.ctx.createOscillator();
        o.type = b.leadType || 'square';
        o.frequency.setValueAtTime(fT * 0.5, t);
        o.frequency.exponentialRampToValueAtTime(fT, t + spb * 3);
        const g = this.ctx.createGain();
        const gv = (b.glissGain != null ? b.glissGain : 0.03) * MELODIC_TRIM;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gv, t + 0.02);
        g.gain.setValueAtTime(gv, t + spb * 3);
        g.gain.exponentialRampToValueAtTime(0.0001, t + spb * 4);
        o.connect(g); g.connect(dry);
        const pans = [-0.8, 0.1, 0.8];
        pans.forEach((pv, e) => {
          const d = this.ctx.createDelay(2); d.delayTime.value = spb * 2 * (e + 1);
          const eg = this.ctx.createGain(); eg.gain.value = 0.5 * Math.pow(0.6, e);
          g.connect(d); d.connect(eg);
          if (this.ctx.createStereoPanner) {
            const p = this.ctx.createStereoPanner(); p.pan.value = pv;
            eg.connect(p); p.connect(dry);
          } else {
            eg.connect(dry);
          }
        });
        o.start(t); o.stop(t + spb * 4 + 0.02);
      }
      const chordNotes = at('chords');
      if (chordNotes) {
        lane('chords');
        // A chord arrives as an array — except through an arp plan, which feeds one
        // tone per tick — and the rack takes it as one: it hands each note its own
        // slot out of the voice's pool, which is what `poly` is for.
        if (!voiced('chords', chordNotes)) {
          // stab: all chord tones at once, short and punchy — and each as long as it
          // was drawn, which is why the length is read per tone rather than per step.
          const len = lenOf('chords');
          tonesOf(chordNotes).forEach((cf, i) => play(cf, b.chordType || 'square', spb * toneLen(len, toneLenOf('chords', i), i), b.chordGain ?? 0.05, b.chordAttack || 0.01));
        }
      }
      const organNotes = at('organChords');
      if (organNotes && !voiced('organChords', organNotes, { echo: b.organEcho !== false })) {
        lane('organChords');
        // Drawbar-style organ bed: sine partials at the common 8', 4', 2 2/3',
        // 2' and 1 1/3' relationships. It is a separate sustained lane, not a
        // replacement for the short keyboard stabs, so an arrangement can let
        // the organ hold the harmony while the original comping plays along.
        const organLen = lenOf('organChords');
        const gain = b.organGain ?? 0.009;
        const attack = b.organAttack || 0.035;
        const echo = b.organEcho !== false;
        const drawbars = b.organBright
          ? [[1, 1], [2, 0.78], [3, 0.48], [4, 0.3], [6, 0.16]]
          : [[1, 1], [2, 0.62], [3, 0.32], [4, 0.2], [6, 0.1]];
        tonesOf(organNotes).forEach((cf, i) => {
          // Per tone: a drawn length belongs to the note, and all five drawbars of one
          // note are that note. The pip below is an attack transient, not a length.
          const dur = spb * toneLen(organLen, toneLenOf('organChords', i), i);
          for (const [ratio, level] of drawbars) play(cf * ratio, 'sine', dur, gain * level, attack, echo);
          // Hammond-style percussion: a short third-harmonic pip on the key
          // attack. Kept dry so repeated off-beat stabs stay crisp.
          if (b.organPercussion) {
            play(cf * 3, 'sine', spb * (b.organPercussionDur || 0.62),
              gain * (b.organPercussionGain || 0.72), 0.002, false);
          }
        });
      }
      const organGlissNote = at('organGliss');
      if (organGlissNote) {
        lane('organGliss');
        // A quick drawbar-organ slide played as discrete scale notes, like a
        // palm skimming the keys. This lane has its own timbre so the main
        // melody does not need to become square/organ-like just to host it.
        const target = organGlissNote * this.detune;
        const steps = [-12, -10, -9, -7, -5, -4, -2, 0];
        const dt = (spb * (b.organGlissSpan || 2.7)) / steps.length;
        const gain = b.organGlissGain ?? 0.012;
        const partials = b.organBright
          ? [[1, 1], [2, 0.7], [3, 0.4], [4, 0.22]]
          : [[1, 1], [2, 0.55], [3, 0.25]];
        // Eight offsets, one preset — see the note on keyGliss above for why this is
        // `map` and not `some`. A preset replaces the whole run including its drawbars:
        // an additive stack is the obvious thing to put here, and it brings its own
        // partials rather than borrowing the three below.
        const runByVoice = steps.map((semi, i) => this.playVoice('organGliss', b,
          organGlissNote * Math.pow(2, semi / 12),
          { spb, dry, wet, echo: false, delay: voiceDelay(i * dt),
            gainScale: laneGainScale }))[0];
        if (!runByVoice) steps.forEach((semi, i) => {
          const note = target * Math.pow(2, semi / 12);
          for (const [ratio, level] of partials) {
            play(note * ratio, 'sine', dt * 1.35, gain * level,
              b.organGlissAttack || 0.003, false, i * dt);
          }
        });
      }
      const organSwoopNote = at('organSwoop');
      if (organSwoopNote && !voiced('organSwoop', organSwoopNote)) {
        lane('organSwoop');
        // Continuous drawbar-organ pitch glide: unlike organGliss's discrete
        // palm-run notes, every partial bends smoothly from one pitch into the
        // target for a clean dance-mix transition.
        const t = scheduleAt();
        const target = organSwoopNote * this.detune;
        const from = target * Math.pow(2, (b.organSwoopFromSemitones ?? -5) / 12);
        const dur = spb * (b.organSwoopDur || 3.2);
        const gain = (b.organSwoopGain ?? 0.012) * MELODIC_TRIM;
        const partials = b.organBright
          ? [[1, 1], [2, 0.66], [3, 0.34], [4, 0.18]]
          : [[1, 1], [2, 0.5], [3, 0.22]];
        for (const [ratio, level] of partials) {
          const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(from * ratio, t);
          o.frequency.exponentialRampToValueAtTime(target * ratio, t + dur);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(gain * level, t + 0.012);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
          g.gain.linearRampToValueAtTime(0, t + dur + 0.02 - 0.005);
          o.connect(g); g.connect(dry); g.connect(wet);
          o.start(t); o.stop(t + dur + 0.02);
        }
      }
      const kickHit = at('kick');
      if (kickHit && !voiced('kick', kickHit, { echo: !!b.echoEverything })) {
        lane('kick');
        // 808 kick: a long sine "boooom" that pitch-drops into a sub
        // fundamental for the thump, with a short noise click on the front so
        // it still reads as a hit on small speakers where the sub is felt more
        // than heard. Body + click, the way an 808 actually stacks — nothing
        // in between. crashDur-style bank overrides (kickGain/kickTail) let a
        // sparser track lean on the boom or a busy one tighten it up.
        const t = scheduleAt();
        const kg = (b.kickGain ?? 1) * (b.drumGain ?? 1);
        const tail = b.kickTail ?? 0.2;      // how long the sub rings out
        // Body: near-instant punch, pitch envelope from a snappy attack pitch
        // down to ~48Hz, then a long amplitude decay. The short gain ramp (vs
        // the old hard setValueAtTime) keeps the envelope itself from clicking —
        // the click is authored separately below, so it can be shaped on its own.
        const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(165, t);
        o.frequency.exponentialRampToValueAtTime(48, t + 0.05);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.42 * kg, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.001, t + tail);
        o.connect(g); g.connect(dry);
        if (b.echoEverything) g.connect(wet);
        o.start(t); o.stop(t + tail + 0.04);
        // Click: a couple of ms of high-passed noise — the beater attack. Kept
        // very short and quiet so it's a transient "tk", not a hat on top.
        const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
        const cf = this.ctx.createBiquadFilter(); cf.type = 'highpass'; cf.frequency.value = 1900;
        const cg = this.ctx.createGain();
        cg.gain.setValueAtTime(0.13 * kg, t);
        cg.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
        src.connect(cf); cf.connect(cg); cg.connect(dry);
        if (b.echoEverything) cg.connect(wet);
        src.start(t); src.stop(t + 0.03);
        // Knock: a short mid punch (~200-300Hz) between the click and the sub.
        // The bass owns the low fundamentals and the sub boom competes with it
        // there; this transient lives in a band the bass mostly leaves open, so
        // it gives the kick a defined attack that cuts through the low end
        // instead of masking into it. kickKnock scales it per-track (0 = off).
        const knock = b.kickKnock ?? 1;
        if (knock > 0) {
          const k = this.ctx.createOscillator(); const kgn = this.ctx.createGain();
          k.type = 'triangle';
          k.frequency.setValueAtTime(300, t);
          k.frequency.exponentialRampToValueAtTime(180, t + 0.04);
          kgn.gain.setValueAtTime(0.0001, t);
          kgn.gain.exponentialRampToValueAtTime(0.17 * kg * knock, t + 0.004);
          kgn.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
          k.connect(kgn); kgn.connect(dry);
          if (b.echoEverything) kgn.connect(wet);
          k.start(t); k.stop(t + 0.07);
        }
      }
      const hatsHit = at('hats');
      if (hatsHit && !voiced('hats', hatsHit, { echo: !!b.echoEverything })) {
        lane('hats');
        const t = scheduleAt();
        const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
        const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 5200;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.14 * (b.drumGain ?? 1), t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        src.connect(f); f.connect(g); g.connect(dry);
        if (b.echoEverything) g.connect(wet);
        src.start(t); src.stop(t + 0.07);
      }
      const voxNote = at('vox');
      if (voxNote && !voiced('vox', voxNote)) {
        lane('vox');
        // Vocal hit ("hey!"): sawtooth glottal buzz with a falling pitch bend,
        // shaped by two parallel bandpass formants; vowel alternates per slot.
        const t = scheduleAt();
        const f0 = voxNote;
        const [fm1, fm2] = (pulse % 8 < 4) ? [750, 1150] : [600, 2000]; // "ah" / "ay"
        const o = this.ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(f0 * 1.3 * this.detune, t);
        o.frequency.exponentialRampToValueAtTime(f0 * this.detune, t + 0.07);
        const env = this.ctx.createGain();
        env.gain.setValueAtTime(0.0001, t);
        env.gain.exponentialRampToValueAtTime(0.55, t + 0.02);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        env.gain.linearRampToValueAtTime(0, t + 0.2 - 0.005);
        const mix = this.ctx.createGain(); mix.gain.value = 0.55 * MELODIC_TRIM;
        const fa = this.ctx.createBiquadFilter(); fa.type = 'bandpass'; fa.frequency.value = fm1; fa.Q.value = 5;
        const fb2 = this.ctx.createBiquadFilter(); fb2.type = 'bandpass'; fb2.frequency.value = fm2; fb2.Q.value = 8;
        o.connect(env); env.connect(fa); env.connect(fb2);
        fa.connect(mix); fb2.connect(mix); mix.connect(dry);
        if (b.echoEverything) mix.connect(wet);
        o.start(t); o.stop(t + 0.2);
      }
      const shoutNote = at('shout');
      if (shoutNote && !voiced('shout', shoutNote)) {
        lane('shout');
        // Vocal shout ("yeah!" / "alright!"): sawtooth voice through MOVING
        // formant filters — gliding vowels read as a word, not just a hit.
        const t = scheduleAt();
        const f0 = shoutNote * this.detune;
        const word = (Math.floor(this.step / 32) + pulse) % 2 === 0 ? 'yeah' : 'alright';
        const dur = word === 'yeah' ? 0.32 : 0.46;
        const traj = word === 'yeah'
          ? [[0, 320, 2100], [0.08, 560, 1800], [0.28, 760, 1250]]
          : [[0, 520, 950], [0.16, 700, 1300], [0.22, 640, 1100], [0.3, 720, 1350], [0.44, 400, 2000]];
        const o = this.ctx.createOscillator();
        o.type = 'sawtooth';
        if (word === 'yeah') {
          o.frequency.setValueAtTime(f0 * 1.25, t);
          o.frequency.exponentialRampToValueAtTime(f0 * 0.9, t + dur);
        } else {
          o.frequency.setValueAtTime(f0, t);
          o.frequency.setValueAtTime(f0, t + 0.2);
          o.frequency.exponentialRampToValueAtTime(f0 * 1.25, t + 0.28); // "al-RIGHT"
          o.frequency.exponentialRampToValueAtTime(f0 * 0.8, t + dur);
        }
        const env = this.ctx.createGain();
        env.gain.setValueAtTime(0.0001, t);
        env.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
        if (word === 'alright') {
          env.gain.exponentialRampToValueAtTime(0.2, t + 0.2); // syllable gap
          env.gain.exponentialRampToValueAtTime(0.5, t + 0.26);
        }
        env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        const mix = this.ctx.createGain(); mix.gain.value = (b.shoutGain != null ? b.shoutGain : 0.5) * MELODIC_TRIM;
        const fa = this.ctx.createBiquadFilter(); fa.type = 'bandpass'; fa.Q.value = 5;
        const fb2 = this.ctx.createBiquadFilter(); fb2.type = 'bandpass'; fb2.Q.value = 8;
        fa.frequency.setValueAtTime(traj[0][1], t);
        fb2.frequency.setValueAtTime(traj[0][2], t);
        for (const [tt, F1, F2] of traj.slice(1)) {
          fa.frequency.linearRampToValueAtTime(F1, t + tt);
          fb2.frequency.linearRampToValueAtTime(F2, t + tt);
        }
        o.connect(env); env.connect(fa); env.connect(fb2);
        fa.connect(mix); fb2.connect(mix); mix.connect(dry);
        if (b.echoEverything) mix.connect(wet);
        o.start(t); o.stop(t + dur + 0.02);
      }
      const ohatsHit = at('ohats');
      if (ohatsHit && !voiced('ohats', ohatsHit, { echo: !!b.echoEverything })) {
        lane('ohats');
        // open hat: same noise, lower cutoff, long sizzle tail
        const t = scheduleAt();
        const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
        const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 4200;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.12 * (b.drumGain ?? 1), t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        src.connect(f); f.connect(g); g.connect(dry);
        if (b.echoEverything) g.connect(wet);
        src.start(t); src.stop(t + 0.24);
      }
      const snareHit = at('snare');
      if (snareHit && !voiced('snare', snareHit, { echo: !!b.echoEverything })) {
        lane('snare');
        // crisp crack: brighter noise band, short decay, just a hint of body
        const t = scheduleAt();
        const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
        const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 0.7;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.32 * (b.drumGain ?? 1), t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        src.connect(f); f.connect(g); g.connect(dry);
        if (b.echoEverything) g.connect(wet);
        src.start(t); src.stop(t + 0.11);
        const o = this.ctx.createOscillator(); const og = this.ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(210, t);
        o.frequency.exponentialRampToValueAtTime(140, t + 0.05);
        og.gain.setValueAtTime(0.12 * (b.drumGain ?? 1), t);
        og.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        o.connect(og); og.connect(dry); if (b.echoEverything) og.connect(wet); o.start(t); o.stop(t + 0.08);
      }
      const crashHit = at('crash');
      if (crashHit && !voiced('crash', crashHit, { echo: !!b.crashEcho || !!b.echoEverything })) {
        lane('crash');
        // Filtered crash: looped noise, bright on the transient and darkening
        // as it falls away — a lowpass envelope closes from crashOpen down to
        // crashClose across the hit, which is what makes it read as a cymbal
        // decaying rather than a burst of static. The fixed highpass keeps the
        // low end out so it stays snarey and thin. Longer than the snare's
        // 90ms crack, short enough not to wash over the downbeat it leads to.
        const t = scheduleAt();
        const dur = spb * (b.crashDur || 5);
        const src = this.ctx.createBufferSource(); src.buffer = this.crashBuf;
        const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1200;
        const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.7;
        lp.frequency.setValueAtTime(b.crashOpen ?? 9000, t);
        lp.frequency.exponentialRampToValueAtTime(b.crashClose ?? 1100, t + dur);
        const g = this.ctx.createGain();
        const gain = (b.crashGain ?? 0.15) * (b.drumGain ?? 1);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + 0.005); // near-instant transient so it reads as on the beat
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        g.gain.linearRampToValueAtTime(0, t + dur + 0.03 - 0.005);
        src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(dry);
        // Percussion is dry on the echo bus by default; crashEcho opts this
        // lane in on its own, so a crash can trail off into the delay without
        // dragging the rest of the kit in with it.
        if (b.crashEcho || b.echoEverything) g.connect(wet);
        src.start(t); src.stop(t + dur + 0.03);
      }
      const tomHit = at('tom');
      if (tomHit && !voiced('tom', tomHit, { echo: !!b.echoEverything })) {
        lane('tom');
        // Tuned tom: a rounded membrane-like pitch drop with just enough triangle
        // edge to read above the bass. It is the eighth engine kit voice; choosing
        // the catalogue's Tom or DS Tom replaces this through the same seam.
        const t = scheduleAt();
        const base = b.tomNote ?? 130;
        const dur = b.tomDur ?? 0.28;
        const level = 0.27 * (b.drumGain ?? 1);
        const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(base * 1.8, t);
        o.frequency.exponentialRampToValueAtTime(base, t + Math.min(0.08, dur * 0.4));
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(level, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(g); g.connect(dry);
        if (b.echoEverything) g.connect(wet);
        o.start(t); o.stop(t + dur + 0.03);
      }
      const rimHit = at('rim');
      if (rimHit && !voiced('rim', rimHit)) {
        lane('rim');
        // Rimshot: a stick cracking off the rim. The old version was two square
        // tones dead in 40ms — a bare click. This stacks three layers so it
        // reads as a struck object with a little tail: a noise SNAP for the
        // stick attack, a cluster of detuned square partials for the metallic
        // RING (pitch sagging slightly as it decays), and a low woody TONK
        // underneath for body. Two-stage decay out to ~75ms — a fast transient
        // then a brief ring, instead of one flat drop to silence.
        const t = scheduleAt();
        const lvl = (b.rimGain ?? 0.21) * (b.drumGain ?? 1);
        // Metallic ring: three inharmonic partials through a narrow bandpass.
        const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1750; f.Q.value = 3.6;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(lvl, t);
        g.gain.exponentialRampToValueAtTime(lvl * 0.16, t + 0.02); // fast initial transient
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.075);     // short ring-out tail
        for (const fr of [1720, 2630, 3350]) {
          const o = this.ctx.createOscillator();
          o.type = 'square';
          o.frequency.setValueAtTime(fr, t);
          o.frequency.exponentialRampToValueAtTime(fr * 0.94, t + 0.06); // slight pitch sag as it rings
          o.connect(f);
          o.start(t); o.stop(t + 0.09);
        }
        f.connect(g); g.connect(dry);
        // Only the ring trails into the echo, and softly — a dedicated low-gain
        // send taps it below the melodic lanes' level so it's a faint repeat,
        // not a wash. rimEcho scales it per-track (0 = dry); the snap and tonk
        // stay dry so the echo doesn't smear their transients.
        const re = this.ctx.createGain(); re.gain.value = b.rimEcho ?? 0.3;
        g.connect(re); re.connect(wet);
        // Stick snap: a few ms of high-passed noise — the attack transient that
        // gives the click its bite before the ring takes over.
        const sn = this.ctx.createBufferSource(); sn.buffer = this.noiseBuf;
        const nf = this.ctx.createBiquadFilter(); nf.type = 'highpass'; nf.frequency.value = 3200;
        const ng = this.ctx.createGain();
        ng.gain.setValueAtTime(lvl * 0.45, t);
        ng.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
        sn.connect(nf); nf.connect(ng); ng.connect(dry);
        if (b.echoEverything) ng.connect(wet);
        sn.start(t); sn.stop(t + 0.03);
        // Woody body: a low resonant "tonk" the click sits on, so the rimshot
        // has some weight instead of being pure top end.
        const bo = this.ctx.createOscillator(); const bg = this.ctx.createGain();
        bo.type = 'triangle';
        bo.frequency.setValueAtTime(430, t);
        bo.frequency.exponentialRampToValueAtTime(300, t + 0.05);
        bg.gain.setValueAtTime(lvl * 0.38, t);
        bg.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        bo.connect(bg); bg.connect(dry);
        if (b.echoEverything) bg.connect(wet);
        bo.start(t); bo.stop(t + 0.08);
      }
      const clapHit = at('clap');
      if (clapHit && !voiced('clap', clapHit, { echo: !!b.echoEverything })) {
        lane('clap');
        // three staggered high-passed bursts read as a clap
        for (let ci = 0; ci < 3; ci++) {
          const t = scheduleAt(ci * 0.012);
          const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
          const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500;
          const g = this.ctx.createGain();
          g.gain.setValueAtTime((ci === 2 ? 0.26 : 0.16)
            * (b.drumGain ?? 1) * (b.clapGain ?? 1), t);
          g.gain.exponentialRampToValueAtTime(0.001, t + (ci === 2 ? 0.12 : 0.03));
          src.connect(f); f.connect(g); g.connect(dry);
          if (b.echoEverything) g.connect(wet);
          src.start(t); src.stop(t + 0.15);
        }
      }
      // Layers — a track duplicated on the mixing desk. The same steps as the lane it
      // copies, on their own strip, played by a preset from the voice library.
      //
      // One loop rather than twenty-one more lane blocks, because a layer has no
      // hand-written body of its own: it is a preset and nothing else, which is the
      // point of it. Two lanes sounding the same notes with the same voice would be
      // the original 6dB louder, not a layer, so a layer with no voice chosen makes
      // no sound at all and the desk says so on the strip rather than here.
      for (const L of b.__layers || []) {
        const value = at(L.key);
        // Rests are skipped before the rack is asked for anything, the way every lane
        // block above tests its own step: a percussion rest is `false`, which is not
        // a frequency, and building a synth pool to play it is work for silence.
        if (!value) continue;
        voiced(L.key, value, { echo: laneEchoesIn(b, L.key) });
      }
      // Invincibility layer: a relentless 16th-note arpeggio over the ducked
      // theme, plus a ride tick on the offbeats. The notes are root/fifth/
      // octave/twelfth off whatever bass note the song last played, so it sits
      // in key over any cabinet's bank instead of needing a fixed-key bank.
      if (this.starMode && this.starBus) {
        const t = scheduleAt();
        const ratios = [1, 1.5, 2, 3];
        const f = this.starRoot * 4 * ratios[pulse % ratios.length] * this.detune;
        const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
        o.type = 'square';
        o.frequency.setValueAtTime(f, t);
        const peak = pulse % 4 === 0 ? 0.14 : 0.09; // accent the downbeat of each group
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(peak, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + spb * 0.9);
        g.gain.linearRampToValueAtTime(0, t + spb + 0.02 - 0.005);
        o.connect(g); g.connect(this.starBus);
        o.start(t); o.stop(t + spb + 0.02);
        if (pulse % 2 === 1) {
          const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
          const hf = this.ctx.createBiquadFilter(); hf.type = 'highpass'; hf.frequency.value = 7000;
          const hg = this.ctx.createGain();
          hg.gain.setValueAtTime(0.11, t);
          hg.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
          src.connect(hf); hf.connect(hg); hg.connect(this.starBus);
          src.start(t); src.stop(t + 0.06);
        }
      }
      this._advanceTransport(spb, tick, plan);
    }
  }

  /**
   * Publish the beat, move the clock on one tick, and take whichever wrap is armed.
   *
   * The tail of `scheduleStep`, lifted out so the fast path above can share it rather
   * than duplicating a loop wrap — the one piece of that method a skipped tick still
   * absolutely must run, because `step` and `nextTime` are the transport itself.
   */
  _advanceTransport(spb, tick, plan) {
    {
      if (this.step % 4 === 0) {
        const beatIdx = Math.floor(this.step / 4);
        const when = this.nextTime;
        // `step` as well as the beat index, and `when` read BEFORE the increment below,
        // so a listener gets the absolute position and the exact audio time it will
        // sound at. A musical transition needs both: `step % 16` is the bar line and
        // `when` is the only clock precise enough to schedule automation against — a
        // frame callback is a quarter of a second adrift by the time it runs. beatIdx
        // alone is not enough, because it stops being a bar count the moment a loop
        // wraps to a start that is not on a bar.
        for (const fn of this.beatListeners) fn(beatIdx, when, this.step);
      }
      this.nextTime += spb * tick;
      // One whole tick, whatever the tick is worth in sixteenths. `nextTime` still
      // accumulates: it is seconds, it has to follow a tempo that can change under it,
      // and the drift over a two-minute song is ~1e-13s against a 2.3e-5s sample period.
      this._tick += 1;
      if (this.applyPendingStep() || this.applyPendingLoop()) {
        // The selected range changed on this bar line; the new range owns the next
        // scheduled step, so do not run the old loop's wrap after it.
      } else if (this.loopEnd != null && this.step >= this.loopEnd) {
        const loop = { when: this.nextTime, start: this.loopStart, end: this.loopEnd };
        this.step = this.loopStart;
        this.loopHasWrapped = true;
        for (const fn of this.loopListeners) fn(loop);
      } else if (this.loopEnd == null) {
        // With no armed locator/form loop the arrangement repeats by indexing its
        // bar plan modulo its length; `step` deliberately keeps increasing. Publish
        // that implicit whole-form boundary too, or an ordinary Play-through would
        // produce no diagnostics even though the listener hears repeated passes.
        const formEnd = this.rearrangement
          ? rearrangementOutputSteps(this.rearrangement)
          : plan.length * 16;
        if (formEnd > 0 && this.step % formEnd === 0) {
          const loop = { when: this.nextTime, start: 0, end: formEnd,
            // The listener needs to know this wrap is a RECIPE wrap to act on it, and
            // when it will be heard, since the scheduler runs ahead of the ear.
            ...(this.rearrangement ? { rearrangement: true, looping: this.rearrangeLoop !== false } : {}) };
          for (const fn of this.loopListeners) fn(loop);
        }
      }
    }
  }

  // Fractional beat position of what is being HEARD right now, counted from
  // the top of the bank (setBank resets step to 0, so beat 0 is the downbeat).
  // The sequencer schedules ahead of the playhead, so `step` is the future —
  // back it off by the outstanding lookahead or visuals sync to notes that
  // have not sounded yet. Returns null when there is no song to lock to, so
  // callers can fall back to a wall clock.
  songBeat() {
    if (!this.ctx || !this.bank) return null;
    const spb = (60 / (this.bpm * this.tempo)) / 4;
    // currentTime is where the graph has been rendered TO, not what has reached the
    // ear: everything after it still has to cross the output buffer and the device.
    // On built-in output that is a few milliseconds; on Bluetooth it is a fifth of a
    // second, and a playhead that ignores it runs visibly ahead of the music. Offline
    // renders report neither latency, so they are unaffected.
    const out = this.ctx.outputLatency || this.ctx.baseLatency || 0;
    const ahead = (this.nextTime - (this.ctx.currentTime - out)) / spb;
    let heardStep = this.step - ahead;
    // The scheduler wraps `step` at the selected loop boundary, but the transport
    // readout used to modulo against the whole song. A one-bar loop in a two-bar song
    // could therefore flash the end of bar 2 before returning to beat 1. Keep the
    // fractional clock inside the same range as the audio loop; the rest of the desk
    // can still modulo it against the full song when drawing the timeline.
    if (this.loopStart != null && this.loopEnd != null && this.loopEnd > this.loopStart
      && (this.loopStart === 0 || this.loopHasWrapped)) {
      const span = this.loopEnd - this.loopStart;
      heardStep = this.loopStart + ((heardStep - this.loopStart) % span + span) % span;
    }
    return heardStep / 4;
  }

  /**
   * What the song is playing in, right now — its tonic and the notes it is using.
   *
   * For cues that have to sit IN the music rather than beside it. The loop-de-loop's
   * climb is the first: it is a twelve-note figure running for a whole second over
   * the top of whatever is on, and a rising run in the wrong key does not read as a
   * wrong note, it reads as a broken sound effect.
   *
   * DERIVED FROM THE NOTES, not from a key signature. Nothing in the song data
   * declares a key and nothing should have to — a declared key is a second copy of
   * a fact the notes already state, and the moment someone transposes a section by
   * ear the two disagree with no way to tell which is lying. What comes back here
   * is the set of pitch classes the section's melodic lanes actually contain, which
   * cannot drift out of step with the music because it IS the music.
   *
   * It also follows a modulation for free, which this cabinet needs: SPEED ZONE
   * walks the same lap through E minor, A minor and B minor, so "the key of the
   * song" is not one answer and a cue pinned to the first one would be wrong for
   * half the track.
   *
   * `root` is the section's opening bass note, which is where a section written by
   * a human puts its tonic. `classes` is the scale, as semitones from that root,
   * ascending. Null when there is no song, so callers keep their own fallback.
   */
  songKey() {
    if (!this.bank) return null;
    const plan = barPlan(this.bank);
    if (!plan?.length) return null;
    const bar = plan[Math.floor(this.step / 16) % plan.length];
    // Memoised on the bank and the section, because the callers are cues: the
    // boost pad fires ten ticks in under a second and every one of them asks.
    // Scanning eight lanes of a section to answer the same question ten times
    // running is exactly the kind of work that does not show up in a profile
    // until there are four pads on screen. The identity of what comes back is
    // part of the contract — callers cache their own ladders against it.
    const secIdx = this.bank.sections?.length && bar?.sec != null
      ? bar.sec % this.bank.sections.length : -1;
    const memo = this._songKeyMemo;
    if (memo && memo.bank === this.bank && memo.sec === secIdx) return memo.key;
    let b = this.bank;
    if (secIdx >= 0) {
      const sec = resolveSection(b, secIdx);
      if (sec) b = { ...this.bank, ...sec };
    }
    // Lane values are frequencies; a rest is 0 or null. The melodic lanes only —
    // percussion is written at C1 as a trigger and would drag a phantom root in.
    const freqs = [];
    for (const lane of ['bass', 'lead', 'chords', 'arp', 'pad', 'lead2', 'lead3', 'bass2']) {
      const seqn = b[lane];
      if (!Array.isArray(seqn)) continue;
      for (const v of seqn) {
        if (Array.isArray(v)) { for (const n of v) if (n > 0) freqs.push(n); }
        else if (typeof v === 'number' && v > 0) freqs.push(v);
      }
    }
    if (!freqs.length) return null;
    // The opening bass note — the one a section is written to land on.
    const bass = Array.isArray(b.bass) ? b.bass : null;
    let root = null;
    if (bass) {
      for (const v of bass) {
        const n = Array.isArray(v) ? v.find((x) => x > 0) : v;
        if (typeof n === 'number' && n > 0) { root = n; break; }
      }
    }
    if (root == null) root = Math.min(...freqs);
    const semisFrom = (f) => Math.round(12 * Math.log2(f / root));
    const classes = [...new Set(freqs.map((f) => ((semisFrom(f) % 12) + 12) % 12))].sort((x, y) => x - y);
    const key = { root, classes };
    this._songKeyMemo = { bank: this.bank, sec: secIdx, key };
    return key;
  }

  /**
   * A rising ladder of the song's own notes, covering `lo`..`hi` in Hz.
   *
   * The shape every keyed cue needs, and it lives here so that "which notes may
   * I use" is answered once rather than reimplemented at each call site with its
   * own rounding. Cached against the key object's identity, which songKey holds
   * stable for as long as the section does — so a cue firing ten times in a
   * second builds this once.
   */
  songLadder(lo, hi) {
    const key = this.songKey();
    if (!key) return null;
    const memo = this._songLadderMemo;
    if (memo && memo.key === key && memo.lo === lo && memo.hi === hi) return memo.notes;
    // Fold the root to the octave AT OR BELOW `lo`, not the one at or above it.
    // The rungs are built up from the root and only those inside the window are
    // kept, so a root folded up to just under 2*lo leaves the bottom of the
    // window with no rungs in it at all — and a caller snapping to the nearest
    // note does not merely lose those, it CLAMPS everything down there onto the
    // first rung it can find. Measured on the coin: a twelve-coin run that
    // should span an octave came out spanning a minor third in the worst
    // section, because its first eight rungs were the same note.
    let root = key.root;
    while (root * 2 <= lo) root *= 2;
    while (root > lo) root /= 2;
    const notes = [];
    for (let i = 0; i < 64; i++) {
      const semis = key.classes[i % key.classes.length] + 12 * Math.floor(i / key.classes.length);
      const f = root * Math.pow(2, semis / 12);
      if (f > hi) break;
      if (f >= lo) notes.push(f);
    }
    if (!notes.length) return null;
    this._songLadderMemo = { key, lo, hi, notes };
    return notes;
  }

  /**
   * `freq` moved to the nearest note of the song, within a ladder spanning
   * `lo`..`hi`. Nearest by RATIO, not by hertz — an octave up is twice as far
   * in hertz as an octave down and exactly as far to the ear.
   *
   * Null when there is no song to be in key with, so callers keep their own
   * fallback and a cue with the music off sounds like it always did.
   */
  songSnap(freq, lo, hi) {
    const ladder = this.songLadder(lo, hi);
    if (!ladder) return null;
    let best = ladder[0];
    for (const f of ladder) {
      if (Math.abs(Math.log2(f / freq)) < Math.abs(Math.log2(best / freq))) best = f;
    }
    return best;
  }

  /**
   * THE COIN'S TWO NOTES, IN THE KEY OF WHATEVER IS PLAYING.
   *
   * Two square pings a fourth apart — B5 and E6 written down, but neither
   * number is the point. The point is a bright two-note blip, and on a rhythm
   * cabinet a fixed pair fights the track: the combo ladder walks up in
   * SEMITONES, so a run of eight coins passes through every pitch class in the
   * song's key and several that are not in it, and the ones that are not are
   * the ones you hear. (The loop-ring climb already dodges this by staying
   * below the coins — see loopClimbNotes in run.js. Snapping is the other half
   * of that argument.)
   *
   * So both notes land on the song's own ladder: the lower one snapped
   * straight, the upper one snapped from the fourth ABOVE THE SNAPPED lower
   * rather than from its own nominal frequency, which is what keeps the
   * interval a consequence of the gesture instead of two notes drifting apart
   * independently. `pitch` still does its work — it decides which rung, and the
   * combo run now climbs the scale instead of the chromatic.
   *
   * No song, no ladder, no change: the menus with the music off, a bank that
   * failed to load, and every cabinet playing nothing get the cue as it was.
   *
   * Split out of the cue so it can be checked without an AudioContext — the
   * claim worth pinning is which NOTES come out, and sfx() cannot be called at
   * all without a live graph.
   */
  coinNotes(pitch = 1) {
    let lo = 988 * pitch;
    let hi = 1319 * pitch;
    const snapped = this.songSnap(lo, COIN_LO_HZ, COIN_HI_HZ);
    if (snapped) {
      lo = snapped;
      // Guard, not arithmetic: a section whose melodic lanes only ever sound
      // two pitch classes a semitone apart has a ladder with no rung near a
      // fourth up, and snapping to the nearest one would squash the blip into a
      // minor second. Degenerate enough that keeping the gesture beats keeping
      // the second note in key.
      const top = this.songSnap(lo * (1319 / 988), COIN_LO_HZ, COIN_HI_HZ);
      hi = top && top >= lo * 1.15 ? top : lo * (1319 / 988);
    }
    return [lo, hi];
  }

  // Beat phase for rhythm cabinet: 0..1 within the current beat.
  beatPhase() {
    const beat = this.songBeat();
    if (!Number.isFinite(beat)) return 0;
    return ((beat % 1) + 1) % 1;
  }

  _analysisBand(lo, hi) {
    const nyquist = (this.ctx?.sampleRate || 44100) / 2;
    const a = Math.max(0, Math.floor(lo / nyquist * this._analysisSpectrum.length));
    const b = Math.min(this._analysisSpectrum.length, Math.max(a + 1,
      Math.ceil(hi / nyquist * this._analysisSpectrum.length)));
    let sum = 0;
    for (let i = a; i < b; i++) sum += this._analysisSpectrum[i];
    return sum / ((b - a) * 255);
  }

  /**
   * Kit presence, from the sequencer's own tally rather than from the spectrum.
   *
   * scheduleStep() queues each percussion step at the audio time it will sound,
   * up to a quarter-second ahead of the playhead; this drains that queue as those times
   * pass, so what gets reported is what has been HEARD and not what is about to
   * be. That is the whole reason to count it here instead of guessing at
   * transients: the arrangement already knows, exactly, on the bar it happens.
   *
   * Density over a bar, rather than time-since-last-hit. A backbeat and a
   * sixteenth-note hat pattern are both plainly "drums", but the gap between
   * their hits differs fourfold, and any gap threshold loose enough to keep a
   * sparse kick alive is also loose enough to call the tail of a fill drumless.
   */
  _readPercussion(out) {
    if (!this.ctx) {
      // No clock to age hits against. Fall back to whether the bank has a kit at
      // all, which is the honest answer for the browserless path.
      const extraPercussion = (this.bank?.__layers || [])
        .filter((L) => PERCUSSION_LANES.includes(baseLane(L.key))).map((L) => L.key);
      const kit = !!this.bank && (PERCUSSION_LANES.some((key) => this.bank[key])
        || extraPercussion.some((key) => this.bank[key]?.some(Boolean)));
      out.drums = kit ? 1 : 0;
      out.drumless = !kit;
      // No times to compare, so no onset can be identified. Zero, not 1: a
      // preset that gates on `hit` should read "no hit information here" rather
      // than a phantom drum on every browserless frame.
      out.hit = 0;
      return;
    }
    const now = this.ctx.currentTime;
    // Whether the drain below moved anything is the onset: those are precisely
    // the hits whose scheduled time passed during this frame.
    const before = this._percHeard.length;
    while (this._percPending.length && this._percPending[0] <= now) {
      this._percHeard.push(this._percPending.shift());
    }
    // Full on the frame it lands, then a fast fall. Presets that want the bare
    // event test it near 1; presets that want a short flare ride the decay.
    out.hit = this._percHeard.length > before ? 1 : out.hit * 0.55;
    const beatSeconds = 60 / (this.bpm * this.tempo);
    const oldest = now - beatSeconds * 4;
    while (this._percHeard.length && this._percHeard[0] < oldest) this._percHeard.shift();
    // Four hits a bar — a plain kick and backbeat — counts as a full kit. A
    // busier pattern cannot read as more than that, and a kick alone on 1 and 3
    // lands at half, which is honest: there is a pulse, but there is no groove.
    const density = Math.min(1, this._percHeard.length / 4);
    out.drums += (density - out.drums) * 0.08;
    // Deliberately raw where `drums` is smoothed: "this section has no kit in
    // it" is a fact about the arrangement, and a preset that switches behaviour
    // on it wants the switch to land on the bar line, not to fade across it.
    // The list is in schedule order, so the most recent hit is the last one.
    const last = this._percHeard[this._percHeard.length - 1];
    out.drumless = !(last >= now - beatSeconds * 2);
  }

  // Stable, allocation-free readout for the jukebox visualiser. The returned
  // object and typed arrays are owned by Audio and reused every frame. The
  // analyser values provide the organic response; songBeat() supplies the
  // exact procedural clock so kicks and phrase geometry never drift from the
  // notes the sequencer actually scheduled.
  musicAnalysis() {
    const out = this._analysis;
    // ONE READOUT PER FRAME, however many callers ask for it.
    //
    // Everything below is a STEP, not a query: the band smoothers advance, the
    // peak reference decays, and _readPercussion DRAINS the pending-hit queue.
    // Called twice in a frame it smooths at double rate and hands the second
    // caller a drum envelope half as long as the first — which is exactly what
    // happened the day the beat ribbon and the LCD city both wanted it. Memoised
    // against the audio clock so any number of callers share one honest read.
    //
    // currentTime advances a quantum at a time (~2.7ms), so two calls either
    // side of a boundary both step. That is at most one extra step and it is
    // the same one the frame would have taken anyway.
    const now = this.ctx ? this.ctx.currentTime : null;
    if (now != null && now === this._analysisAt) return out;
    this._analysisAt = now;
    if (this.songAnalyser && this._analysisSpectrum && this._analysisWaveform) {
      this.songAnalyser.getByteFrequencyData(this._analysisSpectrum);
      this.songAnalyser.getByteTimeDomainData(this._analysisWaveform);
      // Smooth once more at the feature level. This keeps a single sharp FFT
      // bin from making the large visual shapes twitch while preserving beat
      // transients in beatPulse below.
      out.bass += (this._analysisBand(55, 240) - out.bass) * 0.34;
      out.mid += (this._analysisBand(240, 2200) - out.mid) * 0.30;
      out.treble += (this._analysisBand(2200, 9000) - out.treble) * 0.38;
      // Overall loudness, from the time-domain window rather than the FFT: RMS
      // is a true amplitude read, where averaging frequency bins is dB-shaped
      // and lets one bright partial stand in for the whole mix. Attack is quick
      // so a drop lands on time; release is slow so `level` describes the
      // section being played instead of flickering between transients.
      let sum = 0;
      for (let i = 0; i < this._analysisWaveform.length; i++) {
        const s = (this._analysisWaveform[i] - 128) / 128;
        sum += s * s;
      }
      const rms = Math.sqrt(sum / this._analysisWaveform.length);
      out.level += (rms - out.level) * (rms > out.level ? 0.45 : 0.12);
    } else {
      // Browserless tests and old Web Audio implementations still receive a
      // deterministic fallback driven by the sequencer clock.
      out.bass += ((this.bank ? 0.42 : 0) - out.bass) * 0.12;
      out.mid += ((this.bank ? 0.28 : 0) - out.mid) * 0.10;
      out.treble += ((this.bank ? 0.20 : 0) - out.treble) * 0.14;
      out.level += ((this.bank ? 0.30 : 0) - out.level) * 0.12;
    }
    // Quiet has to mean quiet *for this song*, not quiet in dBFS: a gently
    // mastered track would otherwise read as one long lull and never move. The
    // reference jumps to any new peak and decays over roughly half a minute, so
    // an intro or a breakdown still sits below the chorus it neighbours rather
    // than renormalising itself back up to full within a bar.
    if (out.level > this._analysisPeak) this._analysisPeak = out.level;
    else this._analysisPeak += (out.level - this._analysisPeak) * 0.0006;
    // The square root is perceptual headroom: a passage 12dB down is a quarter
    // of the amplitude but nothing like a quarter as loud, and a linear ratio
    // there reads as the visualiser having simply stopped.
    out.dynamics = this._analysisPeak > 0.01
      ? Math.max(0, Math.min(1, Math.sqrt(out.level / this._analysisPeak)))
      : 0;
    this._readPercussion(out);
    out.beat = this.songBeat();
    if (out.beat == null) {
      out.beatPhase = 0;
      out.beatPulse = 0;
    } else {
      out.beatPhase = ((out.beat % 1) + 1) % 1;
      out.beatPulse = Math.pow(1 - out.beatPhase, 5);
    }
    return out;
  }
}

export const Audio = new AudioSys();

// Re-exported for compatibility: these moved to ./notes.js to break the
// audio -> tracks -> cabinets -> audio import cycle. New code should import
// them from './notes.js' directly.
export { n, chordSeq, seq } from './notes.js';
