// Fixed-timestep loop: update always ticks at 60 Hz regardless of display rate.
export const TICK = 1 / 60;

export function reportFatalError(error) {
  const detail = error && (error.stack || error.message) || String(error || 'Unknown error');
  if (typeof window !== 'undefined') window.__mash_fatal_error = detail;
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

  function frame(now) {
    if (!running) return;
    try {
      let dt = (now - last) / 1000;
      if (dt > 0.25) dt = 0.25; // tab-switch spike clamp
      last = now;
      acc += dt;
      let steps = 0;
      while (acc >= TICK && steps < 8) { update(TICK); acc -= TICK; steps++; }
      if (steps === 8) acc = 0; // running hopelessly behind: drop time, stay interactive
      draw();
    } catch (error) {
      running = false;
      reportFatalError(error);
      return;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { stop() { running = false; } };
}
