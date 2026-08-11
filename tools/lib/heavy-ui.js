// The desk's protection for UI work that holds the main thread.
//
// The sequencer runs on that thread. It queues a quarter-second of audio ahead and
// is re-entered every 25ms, so any synchronous build longer than the queue is a hole
// in the music — measured on the whole-song piano roll at ~200ms plus a ~120ms
// layout follow-up, which is exactly the "expanding the roll sometimes glitches"
// report this exists to answer.
//
// Two things have to happen around such a build, and they belong in one place:
//
//   * QUEUE PAST IT. `Audio.prefill` schedules the notes that were coming anyway,
//     earlier, so the stall lands on a full queue instead of an empty one. The
//     window narrows back by itself afterwards — see the engine — which is why this
//     is a call at the stall rather than a wider lookahead all the time. A wide
//     lookahead is also how long a seek waits to be heard.
//   * SAY WHAT IT WAS. A PerformanceObserver knows a task ran long; only the call
//     site knows it was the preset library. The watchdog reads `lastHeavyBuild()`
//     when it reports a starved scheduler, which is the difference between
//     "something stalled" and "opening the preset library stalled, for 210ms".
//
// One module rather than a hook threaded through every panel's options: three
// callers already need it (the desk, the bar grid, the voice editor) and a second
// implementation would be a second answer to "how long do we prefill for".
import { Audio } from '../../src/engine/audio.js';

// 1.2s covers the longest measured build several times over. Constant on purpose:
// sizing it from recent cost is a refinement worth having only once the telemetry
// below shows a build outrunning it, and a number that moves is a number nobody can
// reason about from a log line.
export const HEAVY_UI_PREFILL_S = 1.2;

// How long a finished build stays the prime suspect for a stall. Long enough to
// cover the layout and paint that follow it, short enough that the NEXT stall is
// not blamed on a build that ended two bars ago.
export const HEAVY_UI_BLAME_MS = 2000;

let last = null;

/**
 * Run `fn` with the audio queued past it and its cost recorded.
 *
 * Returns whatever `fn` returns; a throw still records the build, because a build
 * that failed halfway held the thread for exactly as long as the part it did.
 */
export function heavyUi(label, fn) {
  Audio.prefill(HEAVY_UI_PREFILL_S);
  const t0 = performance.now();
  try {
    return fn();
  } finally {
    last = { label, ms: performance.now() - t0, at: performance.now() };
  }
}

/** The last heavy build, if it is recent enough to be the suspect. Else null. */
export function lastHeavyBuild(within = HEAVY_UI_BLAME_MS) {
  if (!last) return null;
  return (performance.now() - last.at) <= within ? last : null;
}
