// A HILL TILE MUST NOT RASTERIZE THE PART OF ITSELF THAT IS UNDER THE SCREEN.
//
// parallaxHills bakes down to `H + HILL_UNDERFILL` so a background driven UP
// (going below the lane) never runs out of body. In landscape that overshoot is
// small. Portrait breaks the assumption twice over: H becomes ~1041 instead of
// 270, AND the whole background pass is scaled by backgroundZoom (1.78) around
// the authored groundline — so the tile is drawn into local y 166..1261 while
// only about -236..349 lands on the canvas. Measured: better than four fifths of
// every hill blit was fill the GPU threw away, once per horizontal tile, per
// parallax layer, per frame.
//
// The two claims this file exists to hold:
//   1. LANDSCAPE IS UNTOUCHED. No band is published, so every blit keeps the
//      five-argument whole-bitmap call it has always made. This is the claim
//      that matters most — the clamp must be invisible to the shipped game.
//   2. The clip cannot resample. Only the bottom is cut, the source origin stays
//      at row zero, and the height is rounded UP to a whole source row, so the
//      vertical mapping stays exactly 1/SS and the surviving rows land on the
//      same destinations they always did.
import { installDom } from './dom-stub.js';
installDom();

const { getStylePack, __testing } = await import('../src/engine/stylePacks/index.js');
const { bakeSS } = await import('../src/engine/renderer.js');
const { CABINETS } = await import('../src/data/cabinets.js');

let failed = false;
const assert = (cond, msg) => {
  if (cond) console.log('ok:', msg);
  else { console.error('FAIL:', msg); failed = true; }
};

function recorder(height) {
  const blits = [];
  const grad = { addColorStop() {} };
  const ctx = {
    canvas: { width: 480, height },
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, globalAlpha: 1,
    imageSmoothingEnabled: true,
    createLinearGradient: () => grad, createRadialGradient: () => grad,
    createPattern: () => null,
    fillRect() {}, beginPath() {}, rect() {}, arc() {}, ellipse() {},
    moveTo() {}, lineTo() {}, closePath() {}, fill() {}, stroke() {},
    quadraticCurveTo() {}, bezierCurveTo() {}, arcTo() {}, roundRect() {},
    setLineDash() {}, getLineDash: () => [], measureText: () => ({ width: 0 }),
    fillText() {}, strokeText() {}, createConicGradient: () => grad,
    save() {}, restore() {}, translate() {}, scale() {}, rotate() {}, clip() {},
    setTransform() {}, resetTransform() {},
    drawImage(...a) { blits.push(a); },
  };
  return { ctx, blits };
}

const PORTRAIT_H = 1041;
// The band run.js publishes for a 390x844 phone at the shipped 0.80 ground
// anchor and 1.78 backdrop zoom. Held as a literal rather than recomputed so
// this test fails if the geometry moves, instead of moving with it.
const BAND = { top: -236, bottom: 349 };

function paint({ height, band, cabinetId }) {
  const cab = CABINETS.find((c) => c.id === cabinetId);
  const pack = getStylePack(cab.style || 'pixel', {});
  const { ctx, blits } = recorder(height);
  if (band) ctx.__mashBackgroundBand = band;
  pack.bg(ctx, 0, 100, cab, 1000, null, 0,
    band ? { portrait: true, backgroundZoom: 480 / 270 } : null);
  return blits;
}

// ---- the identity band -------------------------------------------------------
const { backgroundPaintBand } = __testing;
assert(backgroundPaintBand({}).bottom === Infinity,
  'a context with no published band is unbounded');
assert(backgroundPaintBand({ __mashBackgroundBand: { top: 10, bottom: 5 } }).bottom === Infinity,
  'an inverted band is rejected rather than clipping everything away');
assert(backgroundPaintBand({ __mashBackgroundBand: BAND }).bottom === 349,
  'a well-formed band is passed through');

// ---- claim 1: landscape is untouched ----------------------------------------
for (const id of ['plumber', 'frost', 'speed']) {
  const blits = paint({ height: 270, band: null, cabinetId: id });
  assert(blits.length > 0, `${id}: landscape draws background bitmaps at all`);
  assert(blits.every((a) => a.length === 5),
    `${id}: every landscape blit keeps the whole-bitmap five-argument call`);
}

// ---- claim 2: portrait clips, and clips without resampling ------------------
for (const id of ['plumber', 'frost', 'speed']) {
  const blits = paint({ height: PORTRAIT_H, band: BAND, cabinetId: id });
  const clipped = blits.filter((a) => a.length === 9);
  assert(clipped.length > 0, `${id}: portrait clips at least one hill blit`);
  // dh === sh / SS exactly. In the DOM stub bakeSS() is 1, so the ratio is 1;
  // the invariant is what is being pinned, not the value.
  assert(clipped.every((a) => Math.abs(a[8] - a[4] / bakeSS()) < 1e-9),
    `${id}: the clip holds the vertical mapping at exactly 1/SS`);
  assert(clipped.every((a) => a[2] === 0),
    `${id}: the clip keeps the source origin at row zero`);
  // Destination top is tileTop; the drawn height must not reach past the band.
  assert(clipped.every((a) => a[6] + a[8] <= BAND.bottom + 1),
    `${id}: no clipped blit rasterizes past the bottom of the visible band`);
}

// ---- the saving, stated as a number -----------------------------------------
{
  const blits = paint({ height: PORTRAIT_H, band: BAND, cabinetId: 'plumber' });
  const clipped = blits.filter((a) => a.length === 9);
  const drawn = clipped.reduce((n, a) => n + a[8], 0);
  const full = clipped.reduce((n, a) => n + (PORTRAIT_H - a[6] + 220), 0);
  const saved = 1 - drawn / full;
  console.log(`   plumber portrait: ${clipped.length} clipped blits, `
    + `${(saved * 100).toFixed(0)}% of their fill removed`);
  assert(saved > 0.5, 'the clamp removes more than half the hill fill in portrait');
}

if (failed) { console.error('HILL BLIT CLAMP: FAILED'); process.exit(1); }
console.log('HILL BLIT CLAMP: PASSED');
