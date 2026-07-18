// Fixed-timestep loop: update always ticks at 60 Hz regardless of display rate.
export const TICK = 1 / 60;

export function startLoop({ update, draw }) {
  let acc = 0;
  let last = performance.now();
  let running = true;

  function frame(now) {
    if (!running) return;
    let dt = (now - last) / 1000;
    if (dt > 0.25) dt = 0.25; // tab-switch spike clamp
    last = now;
    acc += dt;
    let steps = 0;
    while (acc >= TICK && steps < 8) { update(TICK); acc -= TICK; steps++; }
    if (steps === 8) acc = 0; // running hopelessly behind: drop time, stay interactive
    draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { stop() { running = false; } };
}
