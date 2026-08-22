/*
 * The band-limited oscillator — docs/MRDR-3-worklet-spec.md §3.3, Tier B.
 *
 * A phase accumulator and a read from the pyramid `tables.js` builds. Two things about it
 * are decisions rather than details, and both are spelled out in §3.3 because getting
 * either wrong is audible on material this library actually contains.
 *
 * ---- the level follows the INSTANTANEOUS frequency ---------------------------------
 *
 * Not the note's frequency, and not the level chosen at note-on. Glide, vibrato, the pitch
 * envelope and FM all move a voice's frequency continuously, and every one of them can
 * carry it across a mip boundary mid-note. Freezing the pair at note-on means a glided
 * octave plays its whole travel out of the table it started in — increasingly aliased on
 * the way up, increasingly dull on the way down.
 *
 * ---- and it CROSSFADES between the two bracketing levels ---------------------------
 *
 * Snapping to the nearest level puts a step in the spectrum at every boundary, and a slow
 * vibrato sitting on one produces a wobble at the vibrato rate that is not in the vibrato.
 * Two reads and a lerp is the price, and it is the price Chromium pays too.
 */

export const MRDR3_OSC_SOURCE = `
/**
 * Which level of the pyramid a frequency wants, as a float.
 *
 * Level 0 carries every partial that fits under Nyquist for a fundamental at the table's
 * own lowest frequency (rate / size); each level above halves the partial count, so one
 * level per octave keeps the top partial pinned just under Nyquist all the way up.
 */
// The top rung of the pyramid, so an inlined read does not have to be handed it.
var MRDR3_TOP_LEVEL = 11;

function mrdr3Level(hz, rate, size, levels) {
  var lowest = rate / size;
  if (!(hz > lowest)) return 0;
  var lv = Math.log2(hz / lowest);
  if (lv < 0) return 0;
  var max = levels - 1;
  return lv > max ? max : lv;
}

/**
 * One sample from a pyramid, at a fractional level and a fractional phase.
 *
 * Four reads and three lerps: two neighbours within each of the two bracketing levels.
 * The wrap sample at the end of every level is what keeps this branchless — the phase
 * index can reach \`size\` and still read a valid neighbour.
 */
function mrdr3Read(data, stride, size, level, phase) {
  var lo = level | 0;
  var hi = lo + 1;
  var lf = level - lo;
  var x = phase * size;
  var i = x | 0;
  var f = x - i;
  var a = lo * stride + i;
  var va = data[a] + (data[a + 1] - data[a]) * f;
  if (lf <= 0) return va;
  var b = hi * stride + i;
  var vb = data[b] + (data[b + 1] - data[b]) * f;
  return va + (vb - va) * lf;
}
`;
