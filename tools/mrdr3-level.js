// What level to audition an MRDR-3 preset at.
//
// The playground's answer only. Nothing here reaches a song, the catalogue or
// `voiceGain`: every preset in the game is still levelled exactly as it was measured.
import { laneTarget } from '../src/data/voices.js';

/**
 * How far the audition level leans from energy-matching toward peak-matching.
 *
 * 0 is `voiceGain` untouched — the library's own answer, energy against energy. 1 would
 * be pure peak-matching, which this repo tried and rejected: see the long note over
 * `voiceGain` in src/data/voices.js, where matching peaks opened an eleven-decibel
 * spread across the lanes of one song nobody had edited. A half is the geometric mean
 * of the two, the midpoint between them in dB, and it is here because NEITHER end is
 * the right answer for an audition.
 *
 * The energy a preset is measured by is the energy it puts into a FIXED window — one
 * note, and then the silence after it. So how much of that window the note actually
 * occupies divides straight into the gain: a sharp attack and decay is mostly a window
 * of nothing, measures as near-silent, and is handed a gain that makes it arrive far
 * hotter than a sound that sustains through the same window at the same loudness. Over
 * the MRDR-3 library that is a 17.7 dB spread in what a note peaks at after levelling,
 * and it runs the wrong way round: the blip shouts and the pad sits back.
 *
 * Splitting the difference halves that spread, to 8.9 dB, while keeping energy as the
 * thing being matched rather than replacing it with the number the repo already knows
 * is worse.
 */
export const PEAK_LEAN = 0.5;

/**
 * The preset's measured level, leaned toward peak parity — or null when there is
 * nothing to lean (no lane target, or a preset carrying no measurement to work from,
 * in which case `voiceGain`'s own fallback is already the best answer available).
 *
 * A LEVEL rather than a gain, because the level is the only handle the playground has:
 * `voiceGain` is read per note, deep in the engine, and dividing the lane's target by
 * this number is what makes it return the leaned answer. MAX_LEVEL_BOOST still bounds
 * what comes out of it, so a pathological measurement is no more dangerous here than
 * it is anywhere else.
 */
export function auditionLevel(voice, laneKey, lean = PEAK_LEAN) {
  const target = laneTarget(laneKey);
  if (!target || !(voice?.level > 0) || !(voice?.peak > 0)) return null;
  // gEnergy ÷ gPeak — the two answers as a ratio, which is the preset's crest against
  // the lane's own. Large for a blip, small for a sound that sustains.
  const tilt = (target.level * voice.peak) / (target.peak * voice.level);
  return voice.level * tilt ** lean;
}
