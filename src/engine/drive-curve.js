/**
 * The DRIVE transfer curve — one definition for every synth that has the pot: the drum
 * kit, KNDO-5, JMJR-4, the drawbar organ, TNGR-2 and MRDR-3 (native and worklet).
 *
 * ---- what was wrong with the one before ---------------------------------------------
 *
 * Two things, and together they were why DRIVE sounded VERY extreme at low settings.
 *
 *   1. NO HEADROOM. A WaveShaper's table spans −1…+1 and holds its end value beyond
 *      that, so anything louder than full scale was HARD-clipped before the curve had a
 *      say. And the shaper is fed the voice's raw sum — the note's level is applied after
 *      it — so most of it was louder: 60 of 109 MRDR-3 presets reached the shaper above
 *      0 dBFS, up to +12 dB (bestReeseBass), more for a chord. On those, DRIVE 0.01 was
 *      already within 5 dB of DRIVE 1.0, and the first percent of the pot did all of it.
 *   2. A FLOOR UNDER THE KNEE. The soft curve was tanh(k·x)/tanh(k) with k = 1 + a²·24,
 *      so the gentlest setting was tanh(x)/tanh(1): about 7% distortion on a full-scale
 *      sine at DRIVE 0.01. The pot went from clean to driven in one step and then
 *      started. FOLD had the same floor (sin(x·π/2) at the bottom).
 *
 * ---- what this one is -----------------------------------------------------------
 *
 * The curve is written in the signal's own units and covers ±DRIVE_HEADROOM, so the
 * shaper is handed `x / DRIVE_HEADROOM` (a gain in front of a native WaveShaper; one
 * multiply in the MRDR-3 worklet) and nothing short of +18 dB reaches the end of the
 * table. The knee still sits at FULL SCALE — 1 in is 1 out for SOFT at every setting, so
 * DRIVE changes the knee and not the level, as it always did — and it now starts at
 * zero: at the bottom of the pot every shape is a straight line.
 *
 * Inside ±1 the family is the old one with the floor taken out, which is what made the
 * stored values convertible: a sound whose shaper never saw more than full scale plays
 * identically at `soft` a' = √(a² + 1/24), `fold` a' = √((1 + 12a²)/13), `crush` a' = a.
 * Every song's own copy of a driven voice was converted that way when this landed (the
 * louder ones fitted against what their shaper is really fed), so the songs kept their
 * sound; the library presets kept their numbers and got the new curve.
 *
 * 1/512 of full scale between points, the old 1025-over-±1 table's spacing, and on the
 * same sample points. That is what keeps CRUSH, whose steps are finer than the table at
 * the bottom of its pot, rendering exactly as it did inside full scale.
 *
 * ±32 rather than the ±8 it was, since the knee moved to each sound's own level (see the
 * stages and `driveRef` below): a signal is now measured against what a preset is SAID to
 * peak at, and a riser whose stored peak caught only the start of its swell, or a fold
 * driven far past its first turn, runs well past +18 dB of that. Inside ±8 the table is
 * the same numbers on the same points, so nothing that fitted before moved.
 */

/** How far past the knee the curve reaches before the table ends: +30 dB. */
export const DRIVE_HEADROOM = 32;

/** Points in the table: 1/512 of full scale across ±DRIVE_HEADROOM. */
export const DRIVE_CURVE_POINTS = 512 * 2 * DRIVE_HEADROOM + 1;

/**
 * Where a synth's signal is lifted to meet the knee, for the two whose voices do not
 * arrive anywhere near it — and dropped by the same factor after the shaper, so DRIVE at
 * the bottom of the pot is the undriven voice.
 *
 * The knee sits at full scale, and that is right for a synth whose voice arrives there:
 * KNDO-5's oscillator does (median −0.1 dB, measured across its library presets), and so
 * do MRDR-3's and the drum kit's on the median. JMJR-4's singers arrive at a median of
 * −12 dB (−18 to +2) and TNGR-2's voices at about −8 dB (−12 to −5), and at those levels
 * the bottom half of the pot did nothing and the top half was mostly a fader: DRIVE 1
 * played them 19.5 and 17 dB louder where KNDO-5 comes up 8. Lifted by these, their
 * median voice meets the knee where a full-scale sine does. (WNDR-9 is staged by its own
 * registration instead — see `_playAdditive`.)
 *
 * Every saved voice with a drive on either synth was converted when these landed, so no
 * song moved: DRIVE divided by √STAGE — the soft curve's k is 24·DRIVE², so k/STAGE with
 * the signal ×STAGE is the same waveform — and `level`/`peak` scaled by what is left over,
 * tanh(k)/(STAGE·tanh(k/STAGE)), so `voiceGain` plays them where they were.
 */
export const JMJR4_DRIVE_STAGE = 4;     // +12 dB
export const TNGR2_DRIVE_STAGE = 2.5;   // +8 dB

/**
 * Where MRDR-3's and the drum kit's DRIVE puts its knee: at the sound's OWN peak — the
 * `peak` every preset carries, measured by the level system (tools/lib/measure-voice.js)
 * as one note's peak at unity. The shaper is fed `x / ref` and its output is scaled back
 * up by `ref`, so DRIVE 0.3 bites the same on a shaker as on a kick, on a stacked
 * seven-voice supersaw as on one sine, and turning it up changes the character rather
 * than the level.
 *
 * Those two synths needed it per preset where the others did not: the median preset
 * already met the knee, but the spread was −20 to +17 dB on the drums and wider on MRDR-3
 * — `wubStutter` was gritty at DRIVE 0.1, `dsKickHard` came up 25 dB at DRIVE 1 — and no
 * one number per synth could fix both ends. The stored peak is the one per-preset number
 * that already says how hot a sound is, and it is kept current by the same measurement
 * that keeps its level current.
 *
 * It is self-consistent, which is what makes it safe to measure through: with the knee
 * at the peak, the soft curve maps the peak to itself (1 in is 1 out), so a driven
 * preset measures the same peak it was staged by. A stale one converges — each
 * re-measure moves it toward the sound's real peak.
 *
 * No `peak` (a song copy saved before peaks were carried) is 1, which is the old
 * behaviour. Bounded, so a broken measurement cannot stage a sound 60 dB anywhere.
 *
 * Every saved MRDR-3 and drum voice with a drive was converted when this landed, so no
 * song moved. For SOFT, a stored DRIVE `a` and PEAK `p` become the stage `r` that solves
 * tanh(k·r) = (p/0.7)·tanh(k) (k = 24a²), DRIVE a·√r, PEAK 0.7·r and LEVEL scaled by
 * 0.7·r/p: the same waveform, scaled by that, which `voiceGain` then plays back where it
 * was. FOLD solves the same with its sine. CRUSH is not staged at all — see `driveRef`.
 */
export const DRIVE_REF_MIN = 1 / 256;
export const DRIVE_REF_MAX = 16;

/**
 * The music level every stored `peak` was measured through. tools/lib/measure-voice.js
 * renders at the engine's default volumes, and `levels.music` in src/engine/audio.js is
 * 0.7 — so a preset's stored peak reads 3.1 dB under what its own voice puts out, and the
 * stage divides it back out. (Its LEVEL carries the same factor, and so do the lane
 * targets it is divided into, so the levelling never noticed.) tests/drive-ref.js holds
 * the two numbers together.
 */
export const PEAK_MEASURED_AT = 0.7;
//
// CRUSH is left at full scale. It is a quantiser, not a knee: it changes no level, so it
// was never the shape that made a sound inordinately loud, and a bit depth is a property
// of the converter rather than of the sound going into it.
export const driveRef = (voice) => {
  if (voice?.shape === 'crush') return 1;
  const p = Number(voice?.peak);
  return p > 0 ? Math.min(DRIVE_REF_MAX, Math.max(DRIVE_REF_MIN, p / PEAK_MEASURED_AT)) : 1;
};

/**
 * The curve for a DRIVE setting, as the table a WaveShaper reads: index i is the input
 * headroom·(2i/(n−1) − 1), and the value is the output in the same units.
 *
 * Three shapes, three jobs. `soft` is a desk being pushed: square-law in the pot, so
 * the bottom half is warmth and the near-square crunch lives in the top quarter. `fold`
 * turns the peak back on itself, so past a point more level makes a DIFFERENT sound
 * rather than a louder one. `crush` throws away resolution — twelve bits down to two
 * across the dial, rounded rather than truncated so it stays odd-symmetric. Anything
 * that is not FOLD or CRUSH is SOFT, which is what lets an old `tanh` still play.
 *
 * SELF-CONTAINED ON PURPOSE — no reference to anything outside its own body. TNGR-2's
 * core is a string that runs inside a worklet and cannot import, so it pastes this
 * function's source in (src/engine/tngr2/dsp.js) rather than keep a second copy that
 * could drift — which is exactly how TNGR-2's drive came to be a different curve.
 */
export function driveCurveTable(amount, shape, headroom, points) {
  // Not rounded to the pot's 0.01 steps any more: a converted drive is stated exactly
  // (see the staging notes below), and every value the pot itself writes is a whole
  // step already, so nothing a hand ever set moved when the rounding went.
  var a = Math.min(1, Math.max(0, Number(amount) || 0));
  var curve = new Float32Array(points);
  var i;
  if (shape === 'fold') {
    // c is the old k: sin(c·x·π/2) folds once c passes 1. Below 1 the same sine is
    // rescaled to reach 1 at full scale, which is a straight line as c goes to zero.
    var c = a * a * 13;
    var h = c * Math.PI * 0.5;
    var norm = c < 1 ? Math.sin(h) : 1;
    for (i = 0; i < points; i++) {
      var xf = headroom * ((i / (points - 1)) * 2 - 1);
      curve[i] = c > 0 ? Math.sin(h * xf) / norm : xf;
    }
  } else if (shape === 'crush') {
    var steps = Math.pow(2, Math.max(1.5, 12 - a * 10));
    for (i = 0; i < points; i++) {
      curve[i] = Math.round(headroom * ((i / (points - 1)) * 2 - 1) * steps) / steps;
    }
  } else {
    var k = a * a * 24;
    var t = Math.tanh(k);
    for (i = 0; i < points; i++) {
      var xs = headroom * ((i / (points - 1)) * 2 - 1);
      curve[i] = k > 0 ? Math.tanh(k * xs) / t : xs;
    }
  }
  return curve;
}

/** The table for a DRIVE setting — see driveCurveTable. */
export const driveCurve = (amount, shape = 'soft') =>
  driveCurveTable(amount, shape, DRIVE_HEADROOM, DRIVE_CURVE_POINTS);
