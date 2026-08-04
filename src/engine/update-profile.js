// Update-half profiling.
//
// The renderer has carried timing for its own work for a while (paint/submit/
// display, plus the WebGL upload counters), so a slow frame could always be
// attributed WITHIN the draw. The simulation half had none: the frame-gap
// counter in loop.js could see a hitch land but never say whether the time went
// on thinking or on drawing, and those two are fixed in completely different
// places. Everything here exists to answer that one question.
//
// Dormant unless a profiler arms it. With it off, mark() returns 0 and every
// add is a single branch, so the simulation paths that call it pay nothing in
// normal play.

// 3s at 60Hz is 180 samples; the ring is sized well past that so a window that
// overruns still records its tail. Once full it stops recording rather than
// wrapping: a truncated tail biases the percentile low, but wrapping would
// silently report the END of a window as if it were the whole of it.
const MAX_SAMPLES = 600;

let stats = null;
let samples = null;
let sampleCount = 0;

export function resetUpdateProfileStats() {
  stats = { updateMs: 0, rewindMs: 0, spawnMs: 0, worstMs: 0, frames: 0 };
  if (!samples) samples = new Float64Array(MAX_SAMPLES);
  sampleCount = 0;
}

export function setUpdateProfile(on) {
  if (on) resetUpdateProfileStats();
  else { stats = null; sampleCount = 0; }
}

// Hand the returned value back to updateProfileAdd. Returns 0 when profiling is
// off, which is the whole of the cost in normal play.
//
// Deliberately not a function-wrapper like the renderer's profileTimed: these
// call sites sit inside the per-tick simulation, and a closure allocated per
// call per frame is precisely the kind of garbage this profiler exists to find.
export function updateProfileMark() {
  return stats && typeof performance !== 'undefined' ? performance.now() : 0;
}

export function updateProfileAdd(kind, at) {
  if (!at || !stats) return;
  stats[kind] += performance.now() - at;
}

// One sample per frame that actually stepped the simulation. Callers must not
// record callbacks that ran zero steps — see the note at the call site in
// loop.js for why those would corrupt the percentile.
export function noteUpdateFrame(ms) {
  if (!stats) return;
  stats.updateMs += ms;
  stats.frames++;
  if (ms > stats.worstMs) stats.worstMs = ms;
  if (sampleCount < MAX_SAMPLES) samples[sampleCount++] = ms;
}

export function updateProfileStats() {
  if (!stats) return { updateMs: 0, rewindMs: 0, spawnMs: 0, worstMs: 0, frames: 0, p95Ms: 0 };
  return { ...stats, p95Ms: percentile(0.95) };
}

// Sorting allocates, but this runs once when a window closes rather than per
// frame, so it cannot perturb what it is measuring.
function percentile(q) {
  if (!sampleCount) return 0;
  const sorted = samples.slice(0, sampleCount).sort();
  // Nearest-rank. At ~180 samples the interpolated variants differ by less than
  // the measurement noise, and this one never reports a duration that was not
  // actually observed.
  const i = Math.max(0, Math.min(sampleCount - 1, Math.ceil(q * sampleCount) - 1));
  return sorted[i];
}
