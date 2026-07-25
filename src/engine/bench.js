// Density sweep: ?bench walks the render density from the floor to native,
// measures sustained frame rate at each rung, and draws the table on screen.
//
// This exists because the alternative was asking someone holding an iPad to
// reload with a different ?density= eight times and read a number off a corner
// of the screen each time — which is slow, easy to get out of order, and gives
// answers that cannot be told apart afterwards ("mid-high 40s" at WHICH rung?).
// One URL, one table, no ambiguity.
//
// Run it twice to answer the question that actually matters:
//     ?bench              the WebGL path, which re-uploads the whole world
//                         canvas to the GPU every frame
//     ?bench&renderer=2d  the 2D path, where the canvas IS the display and
//                         there is no upload at all
// If 2D holds a rung that WebGL cannot, the upload is the ceiling.
import { setDensityPin, rendererDiagnostics, rendererBackend, W, H } from './renderer.js';
import { drawText, textWidth } from './sprites.js';

// Every standard rung plus native. Native goes last so the run ends on the
// interesting one even if the tester walks away early.
const RUNGS = [1, 1.5, 2, 2.5, 3, 4, 5];
const SETTLE_MS = 1200;   // let the resize and the first re-bakes land
const MEASURE_MS = 2500;  // long enough to average out a GC pause

let active = false;
let plan = [];
let step = -1;
let phaseEndsAt = 0;
let measuring = false;
let frames = 0;
let measuredAt = 0;
const results = [];

export function benchActive() { return active; }

export function startBench(now) {
  const native = rendererDiagnostics().native;
  // Skip rungs at or above native — the renderer clamps a pin to native, so
  // they would silently measure the same thing twice and read as a plateau.
  plan = RUNGS.filter((v) => v < native - 1e-6);
  plan.push(native);
  active = true;
  step = -1;
  results.length = 0;
  advance(now);
}

function advance(now) {
  step++;
  if (step >= plan.length) {
    active = false;
    setDensityPin(null);   // hand the device back to the adaptive controller
    return;
  }
  setDensityPin(plan[step]);
  measuring = false;
  phaseEndsAt = now + SETTLE_MS;
}

// Called once per presented frame, from the same place the density controller
// is fed — so this counts exactly the frames that reached the screen.
export function benchFrame(now) {
  if (!active) return;
  if (!measuring) {
    if (now < phaseEndsAt) return;
    measuring = true;
    frames = 0;
    measuredAt = now;
    phaseEndsAt = now + MEASURE_MS;
    return;
  }
  frames++;
  if (now < phaseEndsAt) return;
  const elapsed = now - measuredAt;
  results.push({
    density: plan[step],
    fps: elapsed > 0 ? Math.round((frames * 1000) / elapsed) : 0,
    px: Math.round(W * plan[step]) + 'x' + Math.round(H * plan[step]),
  });
  advance(now);
}

// Drawn in logical 480x270 space over whatever scene is running. Deliberately
// plain: this is a report to be photographed and sent, not part of the game.
export function drawBench(ctx) {
  const rows = results.length + (active ? 1 : 0);
  const boxW = 190, boxH = 22 + rows * 11;
  const x = (W - boxW) / 2, y = 18;
  // Near-opaque on purpose: this panel lands over the title screen's bright
  // lettering, and a report that has to be read off a photograph cannot afford
  // to have art showing through the digits.
  ctx.fillStyle = 'rgba(6,7,14,0.97)';
  ctx.fillRect(x, y, boxW, boxH);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x, y, boxW, boxH);
  const head = `BENCH ${rendererBackend()}  native ${Math.round(rendererDiagnostics().native * 100) / 100}x`;
  drawText(ctx, head, x + 6, y + 5, '#8ef0c0', 0.6, 'bold');
  let ly = y + 17;
  for (const r of results) {
    // 60 is the target; anything at or above it is the rung we can afford.
    const ink = r.fps >= 58 ? '#8ef0c0' : r.fps >= 45 ? '#f0d88e' : '#f08e9e';
    drawText(ctx, `${r.density}x`, x + 6, ly, ink, 0.6, 'bold');
    drawText(ctx, r.px, x + 40, ly, '#9aa0b4', 0.6, 'ui');
    const f = `${r.fps}`;
    drawText(ctx, f, x + boxW - 8 - textWidth(f, 0.6, 'bold'), ly, ink, 0.6, 'bold');
    ly += 11;
  }
  if (active) {
    const label = `${plan[step]}x ${measuring ? 'measuring' : 'settling'}...`;
    drawText(ctx, label, x + 6, ly, '#9aa0b4', 0.6, 'ui');
  } else {
    drawText(ctx, 'DONE - screenshot this', x + 6, ly, '#8ef0c0', 0.6, 'ui');
  }
}
