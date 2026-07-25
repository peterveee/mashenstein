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
//     ?bench&renderer=webgl  the WebGL path, which re-uploads the whole world
//                           canvas to the GPU every frame
//     ?bench&renderer=2d     the 2D path, where the canvas IS the display and
//                           there is no upload at all
// If 2D holds a rung that WebGL cannot, the upload is the ceiling.
import { setDensityPin, suppressSkyFx, rendererDiagnostics, rendererBackend, W, H } from './renderer.js';
import { drawText, textWidth } from './sprites.js';

// Every standard rung plus native. Native goes last so the run ends on the
// interesting one even if the tester walks away early.
const RUNGS = [1, 1.5, 2, 2.5, 3, 4, 5];
const SETTLE_MS = 1200;   // let the resize and the first re-bakes land
const MEASURE_MS = 2500;  // long enough to average out a GC pause

let active = false;
let plan = [];
let plannedNative = 0;   // native the current plan was built against
let step = -1;
let phaseEndsAt = 0;
let measuring = false;
let frames = 0;
let measuredAt = 0;
const results = [];

export function benchActive() { return active; }

// Arms the sweep. The ladder is NOT built here: on a phone, boot happens in
// portrait behind the rotate overlay with the loop paused, and native in
// portrait is a different number entirely (2.51x on an iPhone 16 Pro held
// upright, 4.47x once it is turned). Planning at boot swept the portrait ladder
// and stopped at 2.51x, never testing the rungs that mattered. The plan is
// therefore built on the first frame that actually presents, which cannot
// happen until the device is in the orientation it will be measured in.
export function startBench() {
  active = true;
  plan = [];
  step = -1;
  results.length = 0;
}

function buildPlan(now) {
  const native = rendererDiagnostics().native;
  // Skip rungs at or above native — the renderer clamps a pin to native, so
  // they would silently measure the same thing twice and read as a plateau.
  // Every rung runs with the sky SUPPRESSED so the WebGL and 2D columns render
  // identical scenes; the final entry re-measures native with the sky back on,
  // which is what isolates the shader's cost from the pipeline's.
  plan = RUNGS.filter((v) => v < native - 1e-6).map((density) => ({ density, sky: false }));
  plan.push({ density: native, sky: false });
  plan.push({ density: native, sky: true });
  plannedNative = native;
  step = -1;
  advance(now);
}

function advance(now) {
  step++;
  if (step >= plan.length) {
    active = false;
    setDensityPin(null);      // hand the device back to the adaptive controller
    suppressSkyFx(false);     // and give the title screen its sky back
    return;
  }
  setDensityPin(plan[step].density);
  suppressSkyFx(!plan[step].sky);
  measuring = false;
  phaseEndsAt = now + SETTLE_MS;
}

// Called once per presented frame, from the same place the density controller
// is fed — so this counts exactly the frames that reached the screen.
export function benchFrame(now) {
  if (!active) return;
  // First presented frame: the device is now in the orientation it will be
  // measured in, so this is when native means something.
  if (!plan.length) { buildPlan(now); return; }
  // Rotating mid-sweep changes native and invalidates every rung measured so
  // far — a 2x row taken in portrait is not comparable with a 4x row taken in
  // landscape. Start over rather than quietly mixing the two.
  const native = rendererDiagnostics().native;
  if (Math.abs(native - plannedNative) > 1e-6) {
    results.length = 0;
    buildPlan(now);
    return;
  }
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
  const { density, sky } = plan[step];
  results.push({
    density,
    sky,
    fps: elapsed > 0 ? Math.round((frames * 1000) / elapsed) : 0,
    px: Math.round(W * density) + 'x' + Math.round(H * density),
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
    const tag = r.sky ? '+SKY' : `${Math.round(r.density * 100) / 100}x`;
    drawText(ctx, tag, x + 6, ly, ink, 0.6, 'bold');
    drawText(ctx, r.px, x + 40, ly, '#9aa0b4', 0.6, 'ui');
    const f = `${r.fps}`;
    drawText(ctx, f, x + boxW - 8 - textWidth(f, 0.6, 'bold'), ly, ink, 0.6, 'bold');
    ly += 11;
  }
  if (active) {
    // Before the first presented frame there is no plan yet — on a phone that
    // is the whole time the rotate overlay is up.
    const label = plan.length
      ? `${plan[step].sky ? '+sky' : plan[step].density + 'x'} ${measuring ? 'measuring' : 'settling'}...`
      : 'waiting for landscape...';
    drawText(ctx, label, x + 6, ly, '#9aa0b4', 0.6, 'ui');
  } else {
    drawText(ctx, 'DONE - screenshot this', x + 6, ly, '#8ef0c0', 0.6, 'ui');
  }
}
