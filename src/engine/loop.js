// Fixed-timestep loop: update always ticks at 60 Hz regardless of display rate,
// and presentation is capped to that same rate (see the skip in frame()).
export const TICK = 1 / 60;
// A display whose average rAF interval is under 0.9 of a tick is running faster
// than the simulation and has redundant frames to drop. 60 Hz sits above this
// even with vsync jitter; 75 Hz and up sit below it.
const PRESENT_FLOOR_MS = TICK * 1000 * 0.9;
let measuredFps = 0;

export function frameRate() { return measuredFps; }

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
      let dt = (now - last) / 1000;
      if (dt > 0.25) dt = 0.25; // tab-switch spike clamp
      last = now;
      acc += dt;
      let steps = 0;
      while (acc >= TICK && steps < 8) { update(TICK); acc -= TICK; steps++; }
      if (steps === 8) acc = 0; // running hopelessly behind: drop time, stay interactive
      // Nothing interpolates between fixed steps, so a draw with no update
      // behind it reproduces the previous frame pixel for pixel. On a 120 Hz
      // ProMotion panel (every M1 iPad Pro) that is half of every second spent
      // painting and uploading a picture already on screen — and the density
      // controller reads that wasted cost as "this device cannot afford its
      // native resolution", trading away sharpness you can see for frames you
      // cannot.
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
      draw();
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
