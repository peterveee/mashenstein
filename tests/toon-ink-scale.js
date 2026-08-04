// Ink-scale contract for the toon painter.
//
// Every stroke width in sprites/toons.js is `hair(px, w)`: a width the art
// wants, in world units, and a floor stated in FINISHED-IMAGE pixels. The floor
// is converted against the live draw scale, which is the whole point — an
// absolute floor is a floor on the world width, so it stopped being a hairline
// guarantee and became a minimum thickness that grew with the camera. At the
// tutorial's 5.5x push-in it pinned every small mark, and the mouth came back
// ~3x the width it asks for.
//
// Three things have to stay true for that to be safe, and none of them is
// visible from a screenshot of one scene:
//
//   1. Pushing the camera IN never makes a line heavier.
//   2. Device density is resolution, not size. A retina phone and a 1x laptop
//      must ink a hero identically, or the art is a different drawing per
//      device.
//   3. setInkScale() pins the answer, for tools that magnify a hero to make a
//      stroke legible (the gallery bake-offs) and must not have that read as a
//      camera push-in.
import { installDom } from './dom-stub.js';

installDom();

const { drawToon, setInkScale, setInkDensity, setContour } = await import('../src/sprites/toons.js');
const { screen, W, H } = await import('../src/engine/renderer.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; } else console.log('ok:', msg);
}

// A context that records what it is asked to stroke with. Unknown members are
// no-ops, as in dom-stub, so the painter runs to completion untouched.
function recorder(scale, canvas) {
  const widths = [];
  const noop = () => {};
  const gradient = { addColorStop: noop };
  const target = {
    canvas,
    widths,
    lineWidth: 1,
    getTransform: () => ({ a: scale, b: 0, c: 0, d: scale, e: 0, f: 0 }),
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    measureText: () => ({ width: 0 }),
  };
  return new Proxy(target, {
    get(t, k) { return k in t ? t[k] : noop; },
    set(t, k, v) {
      if (k === 'lineWidth' && Number.isFinite(v)) widths.push(v);
      t[k] = v;
      return true;
    },
  });
}

const POSE = { kind: 'idle', phase: 0.4, time: 0, grounded: true, facing: 1, vy: 0 };
const HEROES = ['gary', 'lorenzo', 'grumpos', 'b33p', 'chompo'];
// The in-run sprite height: the size every claim here is about.
const U = 24;

// `logicalFrame` mimics the WebGL upload canvas, which is exactly the logical
// frame and carries no density; anything else is taken to be density-scaled.
function widthsFor(id, { scale = 1, density = 1, logicalFrame = false } = {}) {
  const prevPx = screen.px;
  screen.px = density;
  const canvas = logicalFrame
    ? { width: W, height: H }
    : { width: W * density, height: H * density };
  const ctx = recorder(scale, canvas);
  try {
    drawToon(ctx, id, POSE, 60, 100, U);
  } finally {
    screen.px = prevPx;
  }
  return ctx.widths;
}

// ---- 1. a push-in never thickens a line ------------------------------------
// Per hero this is a one-way claim: nothing heavier, something lighter. How
// MUCH lighter is a per-rig fact and not a contract — chompo's disc rig keeps
// most of its widths as fractions of R, which were never floored and have
// nothing to relax. The cast total is where the size of the effect belongs.
let castStrokes = 0, castLighter = 0;
for (const id of HEROES) {
  const flat = widthsFor(id, { scale: 1, logicalFrame: true });
  const pushed = widthsFor(id, { scale: 5.5, logicalFrame: true });
  assert(flat.length > 0 && flat.length === pushed.length,
    `${id}: same strokes at 1x and 5.5x (${flat.length})`);
  const heavier = flat.filter((w, i) => pushed[i] > w + 1e-9).length;
  const lighter = flat.filter((w, i) => pushed[i] < w - 1e-9).length;
  castStrokes += flat.length;
  castLighter += lighter;
  assert(heavier === 0, `${id}: no stroke gets heavier when the camera pushes in`);
  assert(lighter > 0, `${id}: the push-in relaxes the ink (${lighter}/${flat.length} strokes)`);
}
assert(castLighter >= castStrokes / 2,
  `most of the cast's ink relaxes at 5.5x (${castLighter}/${castStrokes} strokes)`);

// The mouth is the mark the absolute floor hurt worst — at u=24 it asked for
// ~0.15 and the 0.55 floor handed back nearly 4x that, at every zoom.
{
  const flat = widthsFor('gary', { scale: 1, logicalFrame: true });
  const pushed = widthsFor('gary', { scale: 5.5, logicalFrame: true });
  const thinnest = (a) => Math.min(...a);
  assert(thinnest(pushed) < thinnest(flat) * 0.75,
    `the finest mark is meaningfully finer at 5.5x (${thinnest(flat).toFixed(3)} -> ${thinnest(pushed).toFixed(3)})`);
}

// ---- 2. density is resolution, not size ------------------------------------
// A 3x device pre-scales its context by 3. That is the same drawing at more
// samples, so it must ink identically to the 1x case.
for (const id of HEROES) {
  const oneX = widthsFor(id, { scale: 1, density: 1 });
  const threeX = widthsFor(id, { scale: 3, density: 3 });
  const same = oneX.length === threeX.length
    && oneX.every((w, i) => Math.abs(w - threeX[i]) < 1e-9);
  assert(same, `${id}: density 3 inks identically to density 1`);
}
// The WebGL upload canvas is the exception: exactly the logical frame, no
// density baked in. Same drawing, so the same ink.
{
  const upload = widthsFor('gary', { scale: 1, density: 3, logicalFrame: true });
  const overlay = widthsFor('gary', { scale: 3, density: 3 });
  assert(upload.length === overlay.length
    && upload.every((w, i) => Math.abs(w - overlay[i]) < 1e-9),
    'the 480x270 upload canvas inks the same as the density-scaled overlay');
}

// ---- 3. the pins ------------------------------------------------------------
{
  const auto = widthsFor('gary', { scale: 2, logicalFrame: true });
  setInkScale(2);
  const pinned = widthsFor('gary', { scale: 37, logicalFrame: true });
  setInkScale();
  const released = widthsFor('gary', { scale: 2, logicalFrame: true });
  assert(pinned.every((w, i) => Math.abs(w - auto[i]) < 1e-9),
    'setInkScale(2) inks a magnified cell as the 2x camera it stands in for');
  assert(released.every((w, i) => Math.abs(w - auto[i]) < 1e-9),
    'setInkScale() releases the pin');
}
{
  // A supersampled bake (the gallery paints every tile this way) is resolution
  // too: declaring it must cancel the transform exactly.
  const plain = widthsFor('gary', { scale: 1, logicalFrame: true });
  setInkDensity(6);
  const baked = widthsFor('gary', { scale: 6, logicalFrame: true });
  setInkDensity();
  assert(baked.every((w, i) => Math.abs(w - plain[i]) < 1e-9),
    'setInkDensity(6) makes a 6x bake ink like a 1x paint');
}

// ---- 4. the contour taper is a zoom treatment, not a global thinning --------
// It must be inert at 1:1, or a HUD cell and the cast parade quietly lose
// contour they need, which is not what the dial is for.
{
  const shipped = widthsFor('gary', { scale: 1, logicalFrame: true });
  setContour({ taper: 0 });
  const flat = widthsFor('gary', { scale: 1, logicalFrame: true });
  setContour({ taper: 0.9 });
  const steep = widthsFor('gary', { scale: 1, logicalFrame: true });
  setContour();
  assert(flat.every((w, i) => Math.abs(w - shipped[i]) < 1e-9)
    && steep.every((w, i) => Math.abs(w - shipped[i]) < 1e-9),
    'no taper setting changes the ink at 1:1');

  const pushedFlat = (() => { setContour({ taper: 0 }); const r = widthsFor('gary', { scale: 5.5, logicalFrame: true }); setContour(); return r; })();
  const pushedShipped = widthsFor('gary', { scale: 5.5, logicalFrame: true });
  assert(pushedShipped.some((w, i) => w < pushedFlat[i] - 1e-9),
    'the taper does thin the contour once the camera pushes in');
}

console.log(failed ? 'TOON INK SCALE: FAILED' : 'TOON INK SCALE: PASSED');
process.exit(failed ? 1 : 0);
