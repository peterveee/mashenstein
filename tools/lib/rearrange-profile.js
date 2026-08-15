// WHAT THE SOURCE SONG IS LIKE, SIXTEENTH BY SIXTEENTH.
//
// The Rearrange generator used to know one thing about the song it was cutting up: how
// busy each bar was. That is enough to pick a dense phrase for a chorus and a sparse
// one for a verse, and not nearly enough to choose a good BOUNDARY — which is where a
// collage actually sounds wrong. A cut landing in the middle of a held chord leaves a
// hole with a click in it, and no amount of good phrase selection hides that.
//
// So this walks the resolved song once and answers the questions a boundary decision
// needs: is anything still sounding here, what pitches are in this bar, where are the
// kit accents, how much is going on. The generator scores candidates against it.
//
// THREE THINGS TO KNOW BEFORE TRUSTING A NUMBER OUT OF HERE.
//
// 1. It is an APPROXIMATION, deliberately. Reproducing the engine's full note-duration
//    semantics — drawn per-note lengths, bass repeats, gliss runs, layer independence,
//    Note FX — is `scheduleStep`'s job, and duplicating it a third time would be a
//    third thing to keep in step. Everything here feeds a PREFERENCE score, never
//    playback, so being approximately right about a sustain is worth far more than
//    being exactly right about it. See `noteSteps` for the specific rule.
//
// 2. It is the THIRD mirror of the bank-resolution walk, after `scheduleStep` and
//    `Audio.prepareNoteCache`. A change to section merging, mute masks or lane
//    resolution has to be carried to all three. This one is the cheapest to be wrong
//    in — a bad number here makes a worse-sounding cut, not a wrong-sounding song.
//
// 3. It is pure and browser-safe: no AudioContext, no DOM, no filesystem. The desk
//    builds it while parked and hands the same object to every Generate.
import {
  songBars, sequenceValue, effectiveStepLen, perNoteLengthLane, laneList,
} from '../../src/engine/lanes.js';
import { PERCUSSION_LANES, baseLane } from '../../src/data/voices.js';

const STEPS_PER_BAR = 16;

// How loudly a kit piece marks the grid. A kick or a snare IS the beat; a hat is
// texture. Used only to weight the accent curve, which decides whether a candidate
// boundary lands somewhere the groove already articulates.
const PERCUSSION_WEIGHT = {
  kick: 1, snare: 1, clap: 0.9, tom: 0.6, rim: 0.5, crash: 0.8, ohats: 0.4, hats: 0.3,
};

/**
 * Pitch class of a frequency in Hz, or null for a rest or a percussion trigger.
 *
 * Zero is C, as every chart in the world numbers it. A440 is nine semitones above the
 * C below it, which is where the +9 comes from — without it the whole scale is right
 * but rotated, and every harmonic comparison would still work while naming the wrong
 * notes to anybody reading one.
 */
export function pitchClass(hz) {
  if (!(typeof hz === 'number') || !(hz > 0)) return null;
  return ((Math.round(12 * Math.log2(hz / 440)) + 9) % 12 + 12) % 12;
}

/** Every sounding frequency at one slot, flattened out of chords and layers. */
function tones(value, out = []) {
  if (Array.isArray(value)) { for (const item of value) tones(item, out); return out; }
  if (typeof value === 'number' && value > 0) out.push(value);
  return out;
}

const sounds = (value) => value === true
  || (typeof value === 'number' && value > 0)
  || (Array.isArray(value) && tones(value).length > 0);

/**
 * How long a note at this slot occupies its lane, in sixteenths.
 *
 * A lane that owns its note lengths — bass, lead, chords, organ — is asked, and gets
 * back either the drawn length or that lane's own legacy default, which is the same
 * answer the scheduler would gate the note with. That default is doing real work: it
 * is why a lead reads as barely held and an organ chord reads as held for most of a
 * bar, which is exactly the difference the hazard curve is trying to capture.
 *
 * A gesture, vocal or kit lane has no such length, so the gap to that lane's next
 * onset stands in: a lane that plays again has stopped being about the note before.
 *
 * Capped at one bar either way, and never longer than that gap. Past a bar the exact
 * figure stops changing any decision, and an unbounded sustain read off a gliss would
 * smear the hazard over the whole song.
 */
function noteSteps(view, key, slot, resolution, gapToNext) {
  let length = gapToNext;
  if (perNoteLengthLane(key)) {
    const drawn = effectiveStepLen(view, key, slot, resolution);
    const one = Array.isArray(drawn) ? Math.max(...drawn.map(Number).filter(Number.isFinite)) : Number(drawn);
    if (Number.isFinite(one) && one > 0) length = Math.min(one, gapToNext);
  }
  return Math.max(1, Math.min(STEPS_PER_BAR, Math.round(length)));
}

/**
 * Walk a resolved song and describe it a sixteenth at a time.
 *
 * Returns `{ steps, bars, onsets, sustains, percussion, chroma, energy }`:
 *
 *   onsets[step]      — how many lanes START something here. Boundaries like company.
 *   sustains[step]    — how many PITCHED voices are mid-note here without having
 *                       started here. This is the cut hazard: entering or leaving a
 *                       slice at such a step chops a held note.
 *   percussion[step]  — weighted kit accent, so a boundary can be asked to land where
 *                       the groove already articulates.
 *   chroma[bar*12+pc] — pitch classes present in the bar, normalised to its loudest.
 *                       Two slices whose chroma agree will not fight harmonically.
 *   energy[bar]       — 0..1 activity, standing in for "how big does this bar feel".
 *                       Also the array the legacy density profile used to be.
 */
export function buildRearrangeProfile(bank) {
  const bars = songBars(bank, 1);
  const barCount = bars.length;
  const steps = barCount * STEPS_PER_BAR;
  const onsets = new Float32Array(steps);
  const sustains = new Float32Array(steps);
  const percussion = new Float32Array(steps);
  const chroma = new Float32Array(barCount * 12);
  const energy = new Float32Array(barCount);
  if (!steps) return { steps, bars: barCount, onsets, sustains, percussion, chroma, energy };

  const keys = laneList(bank).map((lane) => lane.key);
  const laneCount = Math.max(1, keys.length);
  const activeLanesInBar = new Array(barCount).fill(0);

  for (const key of keys) {
    const drum = PERCUSSION_LANES.includes(baseLane(key));
    const weight = drum ? (PERCUSSION_WEIGHT[baseLane(key)] ?? 0.5) : 0;
    // One pass to find this lane's onsets across the whole song, so "the gap to the
    // next one" can be answered without a second walk or a wrap-around guess.
    const found = [];
    for (let bi = 0; bi < barCount; bi++) {
      const bar = bars[bi];
      const view = bar.b;
      // A lane arranged out of this bar is silent here, exactly as the scheduler
      // treats it, so it can neither start a note nor be holding one.
      const muted = (bar.off && bar.off.includes(key)) || (bar.delete && bar.delete.includes(key));
      if (muted || !Array.isArray(view?.[key])) continue;
      const resolution = view.resolution === 32 ? 32 : 16;
      for (let slot = 0; slot < STEPS_PER_BAR; slot++) {
        const step = bi * STEPS_PER_BAR + slot;
        // At a promoted resolution both halves of the sixteenth belong to it: a 32nd
        // note is still an event in this sixteenth as far as a bar-grid cut cares.
        const address = bar.half * resolution + slot * (resolution / STEPS_PER_BAR);
        let value = sequenceValue(view, key, address, resolution);
        if (resolution === 32 && !sounds(value)) {
          value = sequenceValue(view, key, address + 1, resolution) ?? value;
        }
        if (!sounds(value)) continue;
        found.push({ step, view, address, resolution, value });
      }
    }
    if (!found.length) continue;
    for (let i = 0; i < found.length; i++) {
      const { step, view, address, resolution, value } = found[i];
      const bi = Math.floor(step / STEPS_PER_BAR);
      onsets[step] += 1;
      activeLanesInBar[bi] |= 0;
      if (drum) { percussion[step] += weight; continue; }
      // Pitched: contribute to the bar's chroma, and mark the steps it holds through.
      const pitches = tones(value);
      for (const hz of pitches) {
        const pc = pitchClass(hz);
        if (pc != null) chroma[bi * 12 + pc] += 1;
      }
      const next = i + 1 < found.length ? found[i + 1].step : step + STEPS_PER_BAR;
      const held = noteSteps(view, key, address, resolution, next - step);
      for (let s = step + 1; s < Math.min(steps, step + held); s++) sustains[s] += 1;
    }
  }

  // Energy: how much of the bar is doing something, against the busiest bar in the
  // song rather than an absolute scale, so a sparse song still has a loud chorus.
  let busiest = 0;
  for (let bi = 0; bi < barCount; bi++) {
    let total = 0;
    for (let slot = 0; slot < STEPS_PER_BAR; slot++) total += onsets[bi * STEPS_PER_BAR + slot];
    energy[bi] = total / laneCount;
    if (energy[bi] > busiest) busiest = energy[bi];
  }
  if (busiest > 0) for (let bi = 0; bi < barCount; bi++) energy[bi] = energy[bi] / busiest;

  // Chroma is normalised per bar: the question it answers is "which notes is this bar
  // ABOUT", and that must not depend on how many lanes happened to play them.
  for (let bi = 0; bi < barCount; bi++) {
    let loudest = 0;
    for (let pc = 0; pc < 12; pc++) loudest = Math.max(loudest, chroma[bi * 12 + pc]);
    if (!loudest) continue;
    for (let pc = 0; pc < 12; pc++) chroma[bi * 12 + pc] /= loudest;
  }

  return { steps, bars: barCount, onsets, sustains, percussion, chroma, energy };
}

/** The bar a source step falls in, clamped into a profile's range. */
const barOf = (profile, step) => Math.max(0,
  Math.min(profile.bars - 1, Math.floor(step / STEPS_PER_BAR)));

// Krumhansl-Kessler key profiles: how strongly each scale degree is heard to belong
// when a key is established. The classic perceptual weights, used exactly as published
// — the only job here is picking the best of 24 rotations, not modelling a listener.
const KEY_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KEY_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

/**
 * What key the song is in, read off the profile's summed chroma.
 *
 * Correlates the song's overall pitch-class weight against the major and minor
 * templates in all twelve rotations and takes the best. `confidence` is how far the
 * winner beat the runner-up, 0..1 — a caller offering harmonic moves should treat a
 * low value as "this song does not have one key" and stay chromatic.
 *
 * Returns `{ tonic, minor, confidence }` with `tonic` as a pitch class (0 = C), or
 * null when the profile has no pitched content to read a key from.
 */
export function detectKey(profile) {
  if (!profile || !(profile.bars > 0) || !profile.chroma) return null;
  const total = new Array(12).fill(0);
  for (let bi = 0; bi < profile.bars; bi++) {
    for (let pc = 0; pc < 12; pc++) total[pc] += profile.chroma[bi * 12 + pc];
  }
  if (!total.some((weight) => weight > 0)) return null;
  let best = null;
  let second = -Infinity;
  for (const [minor, template] of [[false, KEY_MAJOR], [true, KEY_MINOR]]) {
    for (let tonic = 0; tonic < 12; tonic++) {
      let score = 0;
      for (let pc = 0; pc < 12; pc++) score += total[pc] * template[((pc - tonic) % 12 + 12) % 12];
      if (!best || score > best.score) { second = best ? best.score : second; best = { tonic, minor, score }; }
      else if (score > second) second = score;
    }
  }
  const confidence = best.score > 0 && Number.isFinite(second)
    ? Math.max(0, Math.min(1, (best.score - second) / best.score)) : 0;
  return { tonic: best.tonic, minor: best.minor, confidence };
}

/**
 * How badly a cut at this source step lands, 0 (clean) upward.
 *
 * A step where nothing is being held is free to cut at. A step in the middle of held
 * notes costs one per voice — and costs less if the groove articulates there anyway,
 * because a kit accent masks the seam that a bare sustain exposes.
 */
export function cutCost(profile, step) {
  if (!profile || !(profile.steps > 0)) return 0;
  const at = ((Math.floor(step) % profile.steps) + profile.steps) % profile.steps;
  const held = profile.sustains[at] || 0;
  if (!held) return 0;
  const masked = Math.min(1, (profile.percussion[at] || 0));
  return held * (1 - 0.4 * masked);
}

/**
 * How well two source regions agree harmonically, 0 (clashing) to 1 (the same notes).
 *
 * Cosine similarity of the bars' pitch-class content, so the same comparison answers
 * "do these two phrases belong together" and "would this transposition help".
 *
 * `shift` is how far B is being moved UP relative to A, so A's C is compared against
 * B's D at shift 2. That direction is the whole point of the parameter: it is how a
 * transposition earns its place by making two phrases agree, instead of being rolled
 * for and hoped about.
 *
 * A bar with no pitched content agrees with everything: silence never clashes, and
 * refusing to cut to a drum break would be a strange rule.
 */
export function chromaMatch(profile, stepA, stepB, shift = 0) {
  if (!profile || !(profile.bars > 0)) return 1;
  const a = barOf(profile, stepA) * 12;
  const b = barOf(profile, stepB) * 12;
  let dot = 0, magA = 0, magB = 0;
  for (let pc = 0; pc < 12; pc++) {
    const va = profile.chroma[a + pc];
    const vb = profile.chroma[b + ((((pc + shift) % 12) + 12) % 12)];
    dot += va * vb; magA += va * va; magB += vb * vb;
  }
  if (!magA || !magB) return 1;
  return dot / Math.sqrt(magA * magB);
}

/** Mean energy over a source range, 0..1, or null when the profile cannot say. */
export function energyOver(profile, step, span) {
  if (!profile || !(profile.bars > 0)) return null;
  const first = barOf(profile, step);
  const last = barOf(profile, step + Math.max(0, span - 1));
  let total = 0, seen = 0;
  for (let bi = first; bi <= last; bi++) { total += profile.energy[bi]; seen++; }
  return seen ? total / seen : null;
}

/**
 * The old per-bar density array, for callers that still hand one around.
 *
 * The generator accepts either shape; this is what lets a caller keep passing a plain
 * array of numbers without the scorer having to grow a second set of code paths.
 */
export function profileEnergyArray(profile) {
  if (Array.isArray(profile)) return profile;
  if (!profile?.energy) return null;
  return Array.from(profile.energy);
}
