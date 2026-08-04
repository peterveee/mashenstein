// Fixed-timestep loop: update always ticks at 60 Hz regardless of display rate,
// and presentation is capped to that same rate (see the skip in frame()).
import { updateProfileMark, noteUpdateFrame } from './update-profile.js';

export const TICK = 1 / 60;
// A display whose average rAF interval is under 0.9 of a tick is running faster
// than the simulation and has redundant frames to drop. 60 Hz sits above this
// even with vsync jitter; 75 Hz and up sit below it.
const PRESENT_FLOOR_MS = TICK * 1000 * 0.9;
// A callback gap this long means the display went a whole vsync with nothing
// new on it. Averaged FPS cannot show this: three hitches a second still reads
// "60" over a 500ms window, because the frames arrive — they just arrive late
// and bunched. Judder is felt per-frame, so it has to be counted per-frame.
const HITCH_MS = TICK * 1000 * 1.5;
// Above this a frame is not a dropped vsync, it is a stall — a GC pause, a tab
// switch, a shader compile. Counting those alongside ordinary drops would let
// one 400ms hiccup read the same as twenty-four missed frames, so they are
// tallied separately and the drop counter stays a measure of smoothness.
const STALL_MS = 250;
const HITCH_WINDOW_MS = 1000;
// Frames a gap actually cost, which is not the same as the number of times it
// happened. A 159ms frame and a 33ms frame are one hitch each, but the first
// held a stale image for nine extra refreshes and the second for one — counting
// events makes a run full of deep lurches read as BETTER than a run with mild
// even judder. What the player lost is frames, so that is what is totalled.
const framesLostIn = (gapMs) => Math.max(1, Math.round(gapMs / (TICK * 1000)) - 1);
let measuredFps = 0;
let hitches = 0;        // frames lost in the last completed window
let worstMs = 0;        // longest frame in that window
let hitchTotal = 0;     // frames lost this session
let hitchEvents = 0;    // times it happened this session, however deep each was
let stallTotal = 0;     // stalls this session
// The deepest hitch of the session. A run made of 33ms frames missed one vsync
// each time; one made of 50ms+ frames missed two or more, which is a different
// problem with a different cause, and the rolling window has usually thrown the
// evidence away by the time anyone looks.
let sessionWorstMs = 0;

export function frameRate() { return measuredFps; }

// Per-frame smoothness, for the FPS readout and for anyone diagnosing judder.
// `hitches`/`worstMs` describe the last one-second window; the totals run for
// the session so a rare hitch is still visible after the window that held it
// has rolled away. `hitchTotal` counts FRAMES LOST and `hitchEvents` counts
// occurrences — the ratio between them says whether a run suffered even judder
// (near 1:1) or a few deep lurches (far above it), which have different causes.
export function frameHealth() {
  return {
    hitches,
    worstMs: Math.round(worstMs),
    hitchTotal,
    hitchEvents,
    stallTotal,
    sessionWorstMs: Math.round(sessionWorstMs),
  };
}

export function reportFatalError(error) {
  const detail = error && (error.stack || error.message) || String(error || 'Unknown error');
  if (typeof window !== 'undefined') {
    window.__mash_fatal_error = detail;
    if (window.dispatchEvent && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mashfatalerror', { detail }));
    }
  }
  if (typeof document !== 'undefined') {
    const el = document.getElementById('boot-error');
    if (el) {
      el.style.display = 'block';
      const message = document.getElementById('boot-error-message') || el;
      message.textContent = `MASHENSTEIN stopped running (the arcade came unplugged):\n\n${detail}`;
    }
  }
  if (typeof console !== 'undefined' && console.error) console.error(error);
}

export function startLoop({ update, draw, present }) {
  let acc = 0;
  let last = performance.now();
  let running = true;
  let stopped = false;
  let queued = false;
  let fpsWindow = last;
  let fpsFrames = 0;
  let rafAvgMs = 0;      // EWMA of the display's own callback interval
  let hitchWindow = last;
  let winHitches = 0;
  let winWorstMs = 0;
  // The gap from startLoop() to the first callback is boot cost, not a dropped
  // frame. Same after every resume. Neither is something the player saw judder.
  let primed = false;

  const schedule = () => {
    if (stopped || queued || !running) return;
    queued = true;
    requestAnimationFrame(frame);
  };

  function frame(now) {
    queued = false;
    // A frame may already be queued when lifecycle pause lands. Do no work and
    // do not queue another; resume() starts a fresh chain.
    if (!running || stopped) return;
    try {
      const gapMs = now - last;
      let dt = gapMs / 1000;
      if (dt > 0.25) dt = 0.25; // tab-switch spike clamp
      last = now;
      // Counted on the callback, not on the present: a frame the loop chose to
      // skip on a fast panel is deliberate, whereas a late callback is the
      // display holding the previous image for an extra refresh. Only the
      // second one is judder, and only the second one is measured here.
      if (primed) {
        if (gapMs >= STALL_MS) stallTotal++;
        else if (gapMs > HITCH_MS) {
          const lost = framesLostIn(gapMs);
          winHitches += lost;
          hitchTotal += lost;
          hitchEvents++;
          if (gapMs > winWorstMs) winWorstMs = gapMs;
          if (gapMs > sessionWorstMs) sessionWorstMs = gapMs;
        }
      }
      primed = true;
      if (now - hitchWindow >= HITCH_WINDOW_MS) {
        hitches = winHitches;
        worstMs = winWorstMs;
        winHitches = 0;
        winWorstMs = 0;
        hitchWindow = now;
      }
      acc += dt;
      let steps = 0;
      const updateAt = updateProfileMark();
      while (acc >= TICK && steps < 8) { update(TICK); acc -= TICK; steps++; }
      if (steps === 8) acc = 0; // running hopelessly behind: drop time, stay interactive
      // Only callbacks that actually stepped the simulation are sampled. On a
      // 120Hz panel half of them run zero steps, and folding those zeroes in
      // would drag the percentile down until it described the display's cadence
      // instead of the cost of the work.
      if (updateAt && steps) noteUpdateFrame(performance.now() - updateAt);
      // Display motion can use the fraction of the next fixed step already
      // elapsed. States that opt into it can render a continuous position
      // without changing the deterministic 60 Hz simulation. On a 120 Hz
      // ProMotion panel (every M1 iPad Pro), a callback with no simulation step
      // is still skipped below: that frame would otherwise cost a full render
      // and upload solely to show the same simulation state again. The
      // interpolation is therefore for the frames we actually present, not a
      // reason to double the whole game's render budget.
      //
      // Skipping on steps === 0 alone would be wrong: a 60 Hz display's rAF
      // timestamps jitter either side of 16.67ms, so a frame arriving a hair
      // early lands on steps === 0 and would drop a frame the display had room
      // for. The gap since the last present cannot tell those apart either — a
      // 60 Hz frame and a 120 Hz frame following a skipped one are both ~16.7ms.
      // What does separate them is the display's OWN cadence, so measure that:
      // only a panel whose rAF interval is genuinely shorter than a tick has
      // redundant frames to drop.
      rafAvgMs = rafAvgMs ? rafAvgMs * 0.9 + (dt * 1000) * 0.1 : dt * 1000;
      if (steps === 0 && rafAvgMs < PRESENT_FLOOR_MS) { schedule(); return; }
      const renderAlpha = Math.max(0, Math.min(1, acc / TICK));
      draw(renderAlpha);
      if (present) present(now);
      fpsFrames++;
      const fpsElapsed = now - fpsWindow;
      if (fpsElapsed >= 500) {
        measuredFps = Math.round(fpsFrames * 1000 / fpsElapsed);
        fpsFrames = 0;
        fpsWindow = now;
      }
    } catch (error) {
      running = false;
      stopped = true;
      reportFatalError(error);
      return;
    }
    schedule();
  }
  schedule();
  return {
    pause() {
      if (!running || stopped) return;
      running = false;
      acc = 0;
    },
    resume() {
      if (running || stopped) return;
      // Hidden time is not game time. Throw away both the wall-clock gap and
      // any partial fixed step that existed before the pause.
      last = performance.now();
      fpsWindow = last;
      fpsFrames = 0;
      rafAvgMs = 0;      // the gap across a pause says nothing about the display
      measuredFps = 0;
      hitchWindow = last;
      winHitches = 0;
      winWorstMs = 0;
      hitches = 0;
      worstMs = 0;
      primed = false;
      acc = 0;
      running = true;
      schedule();
    },
    stop() {
      running = false;
      stopped = true;
      acc = 0;
    },
    isPaused() { return !running && !stopped; },
  };
}
