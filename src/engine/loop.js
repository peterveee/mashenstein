// Fixed-timestep loop: update always ticks at 60 Hz regardless of display rate.
export const TICK = 1 / 60;
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
      el.textContent = `MASHENSTEIN stopped running (the arcade came unplugged):\n\n${detail}`;
    }
  }
  if (typeof console !== 'undefined' && console.error) console.error(error);
}

export function startLoop({ update, draw }) {
  let acc = 0;
  let last = performance.now();
  let running = true;
  let stopped = false;
  let queued = false;
  let fpsWindow = last;
  let fpsFrames = 0;

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
      draw();
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
