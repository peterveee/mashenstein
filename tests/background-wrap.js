// EVERY DRIFTING BACKGROUND OBJECT WRAPS OFF THE EDGE OF WHAT IS ON SCREEN.
//
// In landscape the picture IS the authored 480px frame, so wrapping an object
// at `W + margin` and wrapping it at the edge of the view are the same thing.
// Portrait shifts the whole backdrop sideways to buy the hero some runway, so
// the visible local band is no longer 0..W — at the shipped anchor it is about
// 131..611. A cloud that wrapped at the authored frame's edge therefore winked
// out of existence roughly 66 pixels INSIDE the right edge of the picture, in
// full view. That is what this suite is here to stop coming back.
//
// The test drives each pack through a camera sweep and collects the x of every
// drifting object it draws. The claim is simple: objects must be drawn beyond
// both edges of the coverage, and must never stop short inside it.
import { installDom } from './dom-stub.js';
installDom();

const { getStylePack, __testing } = await import('../src/engine/stylePacks/index.js');
const { CABINETS } = await import('../src/data/cabinets.js');

const W = 480;
let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// The real portrait coverage: the hero column moves from PLAYER_X 59 to the
// authored anchor 24, and that 35-world-px shift is multiplied by the portrait
// zoom before it reaches the background pass.
const PORTRAIT_COVERAGE = Object.freeze({ left: 131.25, right: 611.25, width: 480 });
// The 178% portrait backdrop uses a narrower local window. `lookahead` is the
// extra staging lead supplied by the renderer before that window reaches the
// physical frame edge.
const PORTRAIT_SCALED_COVERAGE = Object.freeze({
  left: 178.65, right: 448.1, width: 269.45, lookahead: 54,
});
const LANDSCAPE_COVERAGE = Object.freeze({ left: 0, right: W, width: W });

function recorder(coverage) {
  const xs = [];
  const gradient = { addColorStop() {} };
  // The painters draw inside their own translates, so a raw local coordinate
  // says nothing about where the ink lands. Track the transform and record
  // ABSOLUTE x, which is the only number this suite's claims are about.
  let tx = 0;
  let sx = 1;
  const stack = [];
  const put = (x, w) => {
    if (!Number.isFinite(x)) return;
    xs.push(tx + x * sx);
    if (Number.isFinite(w)) xs.push(tx + (x + w) * sx);
  };
  const ctx = {
    canvas: { width: 480, height: 270 },
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, globalAlpha: 1,
    imageSmoothingEnabled: true,
    globalCompositeOperation: 'source-over',
    __mashBackgroundCoverage: coverage,
    createLinearGradient() { return gradient; },
    createRadialGradient() { return gradient; },
    fillRect(x, y, w) { put(x, w); },
    beginPath() {},
    rect(x, y, w) { put(x, w); },
    arc(x, y, r) { put(x - r); put(x + r); },
    ellipse(x, y, rx) { put(x - rx); put(x + rx); },
    moveTo(x) { put(x); },
    lineTo(x) { put(x); },
    quadraticCurveTo(x1, y1, x2) { put(x1); put(x2); },
    bezierCurveTo(x1, y1, x2, y2, x3) { put(x1); put(x2); put(x3); },
    arcTo(x1, y1, x2) { put(x1); put(x2); },
    roundRect(x, y, w) { put(x, w); },
    strokeRect(x, y, w) { put(x, w); },
    closePath() {}, fill() {}, stroke() {},
    save() { stack.push([tx, sx]); },
    restore() { const p = stack.pop(); if (p) { tx = p[0]; sx = p[1]; } },
    translate(x) { if (Number.isFinite(x)) tx += x * sx; },
    scale(x) { if (Number.isFinite(x)) sx *= x; },
    rotate() {}, clip() {},
    // drawImage has three signatures. In the nine-argument form the first
    // pair is the SOURCE rectangle, and reading it as the destination puts
    // every baked sprite at x 0.
    drawImage(img, ...a) {
      if (a.length >= 8) put(a[4], a[6]);
      else if (a.length >= 4) put(a[0], a[2]);
      else put(a[0]);
    },
    setLineDash() {}, fillText(text, x) { put(x); },
    measureText() { return { width: 0 }; },
    createPattern() { return null; },
    clearRect() {}, setTransform() {}, resetTransform() {},
    getImageData() { return { data: new Uint8ClampedArray(4) }; },
  };
  return { ctx, xs };
}

/**
 * Sweep the camera and report the widest span of x the pack ever paints. A
 * pack that covers the view will paint past both edges at some point in the
 * sweep; one that wraps at the authored frame stops short on the right.
 */
function paintedSpan(styleName, cabinet, coverage) {
  let lo = Infinity;
  let hi = -Infinity;
  const pack = getStylePack(styleName, {});
  for (let step = 0; step < 60; step++) {
    const camX = step * 37;
    const { ctx, xs } = recorder(coverage);
    // A finite totalDist keeps the once-per-level landmarks in play.
    pack.bg(ctx, step * 0.37, camX, cabinet, 6000, null, 0, { portrait: true });
    for (const x of xs) {
      if (!Number.isFinite(x)) continue;
      if (x < lo) lo = x;
      if (x > hi) hi = x;
    }
  }
  return { lo, hi };
}

const CASES = [
  ['pixel', 'plumber'],
  ['faux3d', 'speed'],
  ['watercolor', 'frost'],
  ['vhs', 'crypt'],
  ['neon', 'neon'],
  ['cardboard', 'cardboard'],
];

for (const [style, cabinetId] of CASES) {
  const cabinet = CABINETS.find((cab) => cab.id === cabinetId);
  const portrait = paintedSpan(style, cabinet, PORTRAIT_COVERAGE);
  assert(portrait.hi >= PORTRAIT_COVERAGE.right,
    `${style} paints past the RIGHT edge of the portrait view (${portrait.hi.toFixed(0)} >= ${PORTRAIT_COVERAGE.right})`);
  assert(portrait.lo <= PORTRAIT_COVERAGE.left,
    `${style} paints past the LEFT edge of the portrait view (${portrait.lo.toFixed(0)} <= ${PORTRAIT_COVERAGE.left})`);

  // Landscape is the control: the same sweep through the identity coverage
  // must still cover the authored frame, so this fix cannot have moved it.
  const landscape = paintedSpan(style, cabinet, LANDSCAPE_COVERAGE);
  assert(landscape.hi >= LANDSCAPE_COVERAGE.right && landscape.lo <= LANDSCAPE_COVERAGE.left,
    `${style} still covers the landscape frame (${landscape.lo.toFixed(0)}..${landscape.hi.toFixed(0)})`);
}

for (const [style, cabinetId] of CASES) {
  const cabinet = CABINETS.find((cab) => cab.id === cabinetId);
  const scaled = paintedSpan(style, cabinet, PORTRAIT_SCALED_COVERAGE);
  assert(scaled.hi >= PORTRAIT_SCALED_COVERAGE.right
    && scaled.lo <= PORTRAIT_SCALED_COVERAGE.left,
  `${style} keeps the scaled portrait edge covered with look-ahead (${scaled.lo.toFixed(0)}..${scaled.hi.toFixed(0)})`);
}

// The helper itself, stated plainly: with the identity coverage it is exactly
// the expression every pack used to inline, which is why landscape is
// untouched; with a shifted coverage the window moves with the view.
if (__testing?.wrapIntoView) {
  const { wrapIntoView } = __testing;
  const landscapeCtx = recorder(LANDSCAPE_COVERAGE).ctx;
  const portraitCtx = recorder(PORTRAIT_COVERAGE).ctx;
  const oldWay = (v, m) => (((v % (W + m * 2)) + (W + m * 2)) % (W + m * 2)) - m;
  let same = true;
  for (let v = -2000; v < 2000; v += 37) {
    if (Math.abs(wrapIntoView(landscapeCtx, v, 65) - oldWay(v, 65)) > 1e-9) same = false;
  }
  assert(same, 'the wrap helper is arithmetically the old expression in landscape');

  let inside = true;
  for (let v = -2000; v < 2000; v += 37) {
    const x = wrapIntoView(portraitCtx, v, 65);
    if (x < PORTRAIT_COVERAGE.left - 65 || x >= PORTRAIT_COVERAGE.right + 65) inside = false;
  }
  assert(inside, 'the wrap helper keeps every value inside the portrait view plus its margin');

  const scaledCtx = recorder(PORTRAIT_SCALED_COVERAGE).ctx;
  const scaledPaint = __testing.backgroundPaintCoverage(scaledCtx);
  assert(Math.abs(scaledPaint.left
    - (PORTRAIT_SCALED_COVERAGE.left - PORTRAIT_SCALED_COVERAGE.lookahead)) < 1e-9
    && Math.abs(scaledPaint.right
      - (PORTRAIT_SCALED_COVERAGE.right + PORTRAIT_SCALED_COVERAGE.lookahead)) < 1e-9,
  'scaled portrait painters receive an explicit edge look-ahead interval');
  let scaledInside = true;
  for (let v = -2000; v < 2000; v += 37) {
    const x = wrapIntoView(scaledCtx, v, 65);
    if (x < scaledPaint.left - 65 || x >= scaledPaint.right + 65) scaledInside = false;
  }
  assert(scaledInside, 'scaled portrait wrapping uses the widened look-ahead interval');
}

// ---- pinned landmarks ------------------------------------------------------
//
// The volcano and the desert butte are not tiled: each is pinned to one spot
// in the level and slides through the picture once. They were anchored to the
// authored frame's centre and culled at its edges, so in portrait they sat off
// centre and appeared about 91px inside the right edge — the mountain popping
// in. The claim here is that the landmark is drawn continuously as it crosses:
// no camera step may go from "nothing drawn" to "drawn well inside the view".
function landmarkEntry(painter, coverage) {
  const anchor = 3000;
  for (let camX = 0; camX < anchor; camX += 3) {
    const { ctx, xs } = recorder(coverage);
    painter(ctx, camX, anchor);
    // `painter` draws one landmark and nothing else, so the first frame with
    // any ink is the frame it entered on.
    if (xs.length) {
      const finite = xs.filter(Number.isFinite);
      return { camX, leftmostInk: Math.min(...finite) };
    }
  }
  return null;
}

for (const [name, key] of [['volcano', 'drawVolcano'], ['butte', 'drawButte']]) {
  const painter = __testing?.[key];
  if (!painter) continue;
  const portrait = landmarkEntry(painter, PORTRAIT_COVERAGE);
  const landscape = landmarkEntry(painter, LANDSCAPE_COVERAGE);
  assert(portrait && landscape, `${name} enters the picture during the sweep`);
  if (!portrait || !landscape) continue;

  // THE CLAIM. On the frame the landmark first paints, none of its ink may be
  // inside the picture — it has to slide in from beyond the edge. Anchored at
  // the authored frame's centre and culled at its edge, the butte's first ink
  // landed 158px INSIDE the portrait view: a slab of mountain appearing in
  // open sky. Landscape was always fine, which is exactly why this needs a
  // test of its own rather than a landscape baseline.
  const insidePortrait = PORTRAIT_COVERAGE.right - portrait.leftmostInk;
  const insideLandscape = LANDSCAPE_COVERAGE.right - landscape.leftmostInk;
  assert(insidePortrait <= 0,
    `${name} slides into the portrait picture from beyond its right edge (${insidePortrait.toFixed(0)}px inside)`);
  assert(insideLandscape <= 0,
    `${name} slides into the landscape picture from beyond its right edge (${insideLandscape.toFixed(0)}px inside)`);

  // And it does so at the same point in the level, whatever the shape of the
  // picture: the landmark belongs to the world, not to the viewport.
  assert(portrait.camX === landscape.camX,
    `${name} enters at the same camera position in both orientations (${portrait.camX} / ${landscape.camX})`);
}

// The pinned anchor itself: a landmark reaches the middle of the PICTURE, which
// in portrait is not the middle of the authored frame.
if (__testing?.viewCenterX) {
  const { viewCenterX } = __testing;
  assert(Math.abs(viewCenterX(recorder(LANDSCAPE_COVERAGE).ctx) - W / 2) < 1e-9,
    'the landmark anchor is the authored frame centre in landscape');
  assert(Math.abs(viewCenterX(recorder(PORTRAIT_COVERAGE).ctx) - 371.25) < 1e-9,
    'the landmark anchor is the picture centre in portrait, not W/2');
}

console.log(failed ? 'BACKGROUND WRAP: FAILED' : 'BACKGROUND WRAP: PASSED');
if (failed) process.exit(1);
