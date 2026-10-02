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
 * 8193 points over ±8: 1/512 of full scale, the old 1025-over-±1 table's spacing, and on
 * the same sample points. That is what keeps CRUSH, whose steps are finer than the table
 * at the bottom of its pot, rendering exactly as it did inside full scale.
 */

/** How far past full scale the curve reaches before the table ends: +18 dB. */
export const DRIVE_HEADROOM = 8;

/** Points in the table: 1/512 of full scale across ±DRIVE_HEADROOM. */
export const DRIVE_CURVE_POINTS = 512 * 2 * DRIVE_HEADROOM + 1;

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
  var a = Math.round(amount * 100) / 100;
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
