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
import { resolutionOf } from '../../src/data/arrangements.js';

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
      const resolution = resolutionOf(view);
      const stride = resolution / STEPS_PER_BAR;
      for (let slot = 0; slot < STEPS_PER_BAR; slot++) {
        const step = bi * STEPS_PER_BAR + slot;
        // At a promoted resolution EVERY slot inside the sixteenth belongs to it: a
        // 32nd or a triplet is still an event in this sixteenth as far as a bar-grid
        // cut cares. The profile is deliberately a sixteenth-grid view — Rearrange
        // addresses its recipes in sixteenths and saved ones must keep meaning what
        // they meant — so the whole stride collapses onto the one step, first sound
        // winning, rather than only the half that used to be the only other option.
        const address = bar.half * resolution + slot * stride;
        let value = sequenceValue(view, key, address, resolution);
        for (let k = 1; k < stride && !sounds(value); k++) {
          value = sequenceValue(view, key, address + k, resolution) ?? value;
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

/** Fraction of a window's pitched chroma that belongs to the tonic triad. This is a
 * preference score for chord walking, not a claim that the source is in the key. */
export function triadMatch(profile, step, span, key) {
  if (!profile || !key || !profile.chroma || !(profile.bars > 0)) return 0;
  const tonic = ((Number(key.tonic) % 12) + 12) % 12;
  const scale = key.minor ? [0, 3, 7] : [0, 4, 7];
  const allowed = new Set(scale.map((offset) => (tonic + offset) % 12));
  const first = Math.max(0, Math.floor(step / STEPS_PER_BAR));
  const last = Math.min(profile.bars, Math.ceil((step + span) / STEPS_PER_BAR));
  let total = 0; let match = 0;
  for (let bar = first; bar < Math.max(first + 1, last); bar++) {
    for (let pc = 0; pc < 12; pc++) {
      const value = profile.chroma[bar * 12 + pc] || 0;
      total += value;
      if (allowed.has(pc)) match += value;
    }
  }
  return total ? match / total : 0;
}

const DEGREE_SCALES = Object.freeze({
  minor: Object.freeze([0, 2, 3, 5, 7, 8, 10]),
  major: Object.freeze([0, 2, 4, 5, 7, 9, 11]),
});

/**
 * WHICH DEGREE OF THE KEY THIS STRETCH OF SONG IS ALREADY SITTING ON.
 *
 * A chord walk moves material by a number of scale degrees, so it only lands where it is
 * aimed if you know where it started. The walk used to assume every part opened on the
 * TONIC: grab a bar that is really on the iv, ask for `i iv v VI`, and what comes out is
 * `iv VII i ii` — a real progression in the right key, transposed by however wrong the
 * assumption was, and labelled with the chords it was supposed to be.
 *
 * `triadMatch` above answers this for the tonic alone; this scores all seven diatonic triads
 * over the window's chroma and returns the best fit, with the share of the window's pitched
 * energy that agrees. Callers should treat a low `confidence` as "no idea" and fall back —
 * percussion, a held single note or a silent grab genuinely have no degree.
 */
export function sourceDegree(profile, step, span, key) {
  if (!profile?.chroma || !key || !(profile.bars > 0) || !(span > 0)) return null;
  const tonic = ((Number(key.tonic) % 12) + 12) % 12;
  const scale = key.minor === false ? DEGREE_SCALES.major : DEGREE_SCALES.minor;
  const first = Math.max(0, Math.floor(step / STEPS_PER_BAR));
  const last = Math.min(profile.bars, Math.ceil((step + span) / STEPS_PER_BAR));
  const bins = new Float64Array(12);
  let total = 0;
  for (let bar = first; bar < Math.max(first + 1, last); bar++) {
    for (let pc = 0; pc < 12; pc++) {
      const value = profile.chroma[bar * 12 + pc] || 0;
      bins[pc] += value;
      total += value;
    }
  }
  if (!total) return null;
  let degree = 0;
  let confidence = -1;
  for (let candidate = 0; candidate < 7; candidate++) {
    // The diatonic triad on that degree: root, third and fifth taken up the scale.
    let match = 0;
    for (const offset of [0, 2, 4]) match += bins[(tonic + scale[(candidate + offset) % 7]) % 12];
    const score = match / total;
    if (score > confidence) { confidence = score; degree = candidate; }
  }
  return { degree, confidence };
}

/** Normalised pitched onset density in a window, used to reject over-busy walk cells. */
export function onsetRate(profile, step, span) {
  if (!profile?.onsets?.length || !(span > 0)) return 0;
  const start = Math.max(0, Math.floor(step));
  const end = Math.min(profile.onsets.length, start + Math.ceil(span));
  let total = 0;
  for (let index = start; index < end; index++) total += profile.onsets[index] || 0;
  return total / Math.max(1, end - start);
}

/** Combined preference for a candidate walking cell. Higher is safer to re-harmonise. */
export function walkCellScore(profile, step, span, key) {
  if (!profile || !key) return 0;
  return triadMatch(profile, step, span, key) * 0.7
    + Math.min(1, onsetRate(profile, step, span) / 2) * 0.15
    - Math.min(1, cutCost(profile, step)) * 0.15;
}

/**
 * WHERE THE SONG'S PHRASES ACTUALLY START.
 *
 * Everything upstream of this assumed phrases begin at bar 0. Real songs have intros of
 * arbitrary length — a three-bar intro puts every phrase on an ODD bar — so a four-bar
 * grid measured from bar 0 is displaced by a bar for the whole song. That is not a
 * detection nicety: cutting a "four-bar phrase" one bar out of phase is audible, and it
 * happens on ordinary imported material.
 *
 * WHY CHROMA AND NOTHING ELSE. A lane in this engine is a 32-slot TWO-BAR pattern, and
 * `bar.half` alternates 0/1 across the song. Any score built on onsets, kit accents or
 * energy therefore inherits a period-2 comb: even bars look like boundaries whatever
 * the music is doing. Measured on `smw-overworld`, a rhythm-based novelty curve means
 * +0.52 on even bars against -0.05 on odd, and subtracting the neighbouring bars makes
 * the split WORSE rather than cancelling it — the bias is in the representation, not on
 * top of it. Harmony is the one view that does not inherit the lane grid.
 *
 * WHAT IT MEASURES. A phrase boundary is where the chord content turns over, so the
 * bar-to-bar chroma distance should pile up ON the grid and be low off it. The score for
 * an offset is (mean change on the grid) - (mean change off it), and the winner is the
 * offset where harmony most prefers to move.
 *
 * TRUST THE CONFIDENCE, NOT THE OFFSET. The margin over the runner-up is returned
 * because it is the whole story: songs whose phase is known by ear separate at ~0.06,
 * while the cases this gets WRONG sit at 0.001-0.01. A caller that shifts on a hair is
 * worse than one that never shifts, so `confident` is deliberately conservative and
 * callers are expected to fall back to offset 0 rather than guess.
 */
export function detectPhraseGrid(profile, span = 4, minMargin = 0.02) {
  const bars = profile?.bars || 0;
  const flat = { offset: 0, confidence: 0, confident: false, scores: [] };
  if (!profile?.chroma || bars < span * 2) return flat;

  const barChroma = (bar) => {
    const out = new Array(12);
    for (let pc = 0; pc < 12; pc++) out[pc] = profile.chroma[bar * 12 + pc] || 0;
    return out;
  };
  // 1 - cosine, so "how much did the harmony move into this bar".
  const change = new Array(bars).fill(0);
  let previous = barChroma(0);
  for (let bar = 1; bar < bars; bar++) {
    const current = barChroma(bar);
    let dot = 0; let na = 0; let nb = 0;
    for (let pc = 0; pc < 12; pc++) {
      dot += previous[pc] * current[pc];
      na += previous[pc] * previous[pc];
      nb += current[pc] * current[pc];
    }
    // Two silent bars are identical, not maximally different — a rest must not read as
    // a chord change, or an empty intro would win every time.
    change[bar] = 1 - ((!na || !nb) ? (na === nb ? 1 : 0) : dot / Math.sqrt(na * nb));
    previous = current;
  }

  const scores = [];
  for (let offset = 0; offset < span; offset++) {
    let on = 0; let onCount = 0; let off = 0; let offCount = 0;
    for (let bar = 1; bar < bars; bar++) {
      if (bar % span === offset) { on += change[bar]; onCount++; }
      else { off += change[bar]; offCount++; }
    }
    scores.push({ offset, score: (on / (onCount || 1)) - (off / (offCount || 1)) });
  }
  scores.sort((a, b) => b.score - a.score || a.offset - b.offset);
  const confidence = scores[0].score - (scores[1]?.score ?? scores[0].score);
  return {
    offset: scores[0].offset,
    confidence,
    confident: confidence >= minMargin,
    scores,
  };
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

/**
 * ---- THE SONG'S OWN FORM ------------------------------------------------------
 *
 * Where this song actually changes, and which of its parts come back.
 *
 * The generator's form grammars are hand-written shapes. This is the other kind: the
 * shape the material already has. Measured across 75 imported songs, only 29% of real
 * parts are four bars long — lengths of 13, 14, 16 and 22 bars are ordinary — so a
 * roadmap read off the song is a different proposition from any ladder imposed on it.
 *
 * HOW. A self-similarity matrix over per-bar features, with a Foote checkerboard novelty
 * curve down its diagonal: high where the block before a bar is self-similar, the block
 * after it is self-similar, and the two do not resemble each other. Peaks are boundaries.
 * Segments that resemble each other get the same letter, which is what makes a returning
 * part expressible at all.
 *
 * TWO THINGS LEARNED THE HARD WAY, both worth keeping written down.
 *
 * 1. COARSE KERNELS ONLY. A two-bar kernel finds real material changes that are
 *    nonetheless INSIDE a chorus. Including them turns a legible eighteen-part form into
 *    confetti. The fine scale is the right answer to a different question — where may a
 *    slice safely start — and that question is `cutCost`'s, not this one's.
 *
 * 2. THE PHRASE GRID DECIDES THE PHASE. Bar features inherit the two-bar lane pattern, so
 *    boundaries land on even bars whatever the music does; a song with a three-bar intro
 *    then reads a bar early throughout. `detectPhraseGrid` answers that from harmony,
 *    which is the one view the lane grid cannot reach, and its answer is applied here.
 */
const FORM_KERNELS = Object.freeze([4, 8]);

/** One feature vector per bar: harmony, rhythm, kit and how big the bar feels. */
function formFeatures(profile) {
  const out = [];
  for (let bar = 0; bar < profile.bars; bar++) {
    const vector = [];
    for (let pc = 0; pc < 12; pc++) vector.push(profile.chroma[bar * 12 + pc] || 0);
    for (const lane of [profile.onsets, profile.percussion]) {
      const slice = [];
      let peak = 0;
      for (let s = 0; s < STEPS_PER_BAR; s++) {
        const value = lane[bar * STEPS_PER_BAR + s] || 0;
        slice.push(value);
        if (value > peak) peak = value;
      }
      for (const value of slice) vector.push(peak > 0 ? value / peak : 0);
    }
    // Density carries its own weight: two bars of the same riff at different densities
    // are a real boundary, and on a drop it is the only thing that marks one.
    vector.push((profile.energy[bar] || 0) * 1.5);
    out.push(vector);
  }
  return out;
}

const cosineOf = (a, b) => {
  let dot = 0; let na = 0; let nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (!na || !nb) return na === nb ? 1 : 0;
  return dot / Math.sqrt(na * nb);
};

/** Foote novelty at one kernel width, standardised so widths can be compared. */
function noveltyAt(ssm, half) {
  const n = ssm.length;
  const raw = new Array(n).fill(0);
  for (let c = 0; c < n; c++) {
    let same = 0; let cross = 0; let sameN = 0; let crossN = 0;
    for (let i = -half; i < half; i++) {
      for (let j = -half; j < half; j++) {
        const a = c + i; const b = c + j;
        if (a < 0 || b < 0 || a >= n || b >= n) continue;
        if ((i < 0) === (j < 0)) { same += ssm[a][b]; sameN++; }
        else { cross += ssm[a][b]; crossN++; }
      }
    }
    if (sameN && crossN) raw[c] = (same / sameN) - (cross / crossN);
  }
  const mean = raw.reduce((t, v) => t + v, 0) / (n || 1);
  const sd = Math.sqrt(raw.reduce((t, v) => t + (v - mean) ** 2, 0) / (n || 1)) || 1;
  return raw.map((v) => (v - mean) / sd);
}

/**
 * The song's parts: `[{ letter, role, bars }]`, or null when it cannot say.
 *
 * Roles are assigned from ENERGY rather than guessed from position alone: the busiest
 * returning letter is the chorus, the quietest is the bridge, and the parts at the two
 * ends are the intro and outro. That is what lets the generator's existing role machinery
 * — source preference and energy target — steer a detected form as well as a written one.
 */
export function detectSongForm(profile, { minBars = 16, threshold = 0.1 } = {}) {
  if (!profile?.chroma || !(profile.bars >= minBars)) return null;
  const features = formFeatures(profile);
  const ssm = features.map((a) => features.map((b) => cosineOf(a, b)));

  const curves = FORM_KERNELS.filter((half) => half * 2 <= ssm.length).map((half) => noveltyAt(ssm, half));
  if (!curves.length) return null;
  const curve = ssm.map((_, i) => Math.max(...curves.map((c) => c[i])));

  // Peaks at least four bars apart, strongest first, so a boundary cannot be crowded out
  // by a slightly stronger one two bars away.
  const found = [];
  for (let i = 1; i < curve.length - 1; i++) {
    if (curve[i] >= threshold && curve[i] >= curve[i - 1] && curve[i] >= curve[i + 1]) found.push(i);
  }
  found.sort((a, b) => curve[b] - curve[a]);
  const bounds = [];
  for (const i of found) if (bounds.every((k) => Math.abs(k - i) >= 4)) bounds.push(i);
  bounds.sort((a, b) => a - b);

  // The phase correction. Without it a song with an odd-length intro reads a bar early
  // for its whole length — the boundaries are locked to the lane grid, not to the music.
  const grid = detectPhraseGrid(profile);
  const shift = grid.confident
    ? ((grid.offset % 2) - (bounds.filter((b) => b % 2).length > bounds.length / 2 ? 1 : 0) + 2) % 2
    : 0;
  const edges = [0, ...bounds.map((b) => b + shift).filter((b) => b > 0 && b < profile.bars), profile.bars];
  const segments = [];
  for (let i = 0; i < edges.length - 1; i++) {
    if (edges[i + 1] > edges[i]) segments.push([edges[i], edges[i + 1]]);
  }
  if (segments.length < 2) return null;

  // Letters: a segment that resembles an earlier one IS that one returning.
  const meanBetween = ([a0, a1], [b0, b1]) => {
    const span = Math.min(a1 - a0, b1 - b0);
    let total = 0;
    for (let k = 0; k < span; k++) total += ssm[a0 + k][b0 + k];
    return span ? total / span : 0;
  };
  const letters = [];
  for (let i = 0; i < segments.length; i++) {
    let assigned = null;
    for (let j = 0; j < i; j++) {
      // LENGTH IS PART OF IDENTITY. `meanBetween` walks the shorter of the two, so a
      // sixteen-bar part and an eight-bar one that open alike score as the same thing —
      // which collapsed a real 16/8 alternation into a single repeated letter. A part
      // that is twice as long is a different part however familiarly it begins.
      const a = segments[i][1] - segments[i][0];
      const b = segments[j][1] - segments[j][0];
      if (Math.max(a, b) > Math.min(a, b) * 1.5) continue;
      if (meanBetween(segments[i], segments[j]) >= 0.86) { assigned = letters[j]; break; }
    }
    letters.push(assigned ?? String.fromCharCode(65 + new Set(letters).size));
  }

  const meanEnergy = ([from, to]) => {
    let total = 0;
    for (let bar = from; bar < to; bar++) total += profile.energy[bar] || 0;
    return to > from ? total / (to - from) : 0;
  };
  const energies = segments.map(meanEnergy);
  const loudest = energies.indexOf(Math.max(...energies));
  const quietest = energies.indexOf(Math.min(...energies));
  const busyLetter = letters[loudest];
  const calmLetter = letters[quietest];

  return segments.map(([from, to], index) => {
    let role = 'Verse';
    if (index === 0) role = 'Intro';
    else if (index === segments.length - 1) role = 'Outro';
    else if (letters[index] === busyLetter) role = 'Chorus';
    else if (letters[index] === calmLetter) role = 'Bridge';
    return { letter: letters[index], role, bars: to - from };
  });
}
