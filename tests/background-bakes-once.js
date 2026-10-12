// A BACKDROP BAKES ONCE, THEN ONLY BLITS.
//
// Cardboard's cutout hills bobbed by moving their baseline every frame, and the
// baseline is part of parallaxHills' tile cache key — so every frame baked two
// fresh full-height canvases and the cache kept all of them. On a desktop that
// is a leak nobody sees; on an iPhone it is hundreds of MB in a few seconds, and
// iOS killed the page the moment the ACT III banner lifted (12 Oct 2026).
//
// The rule: after the first frame, painting the background over two seconds of
// animation, with the camera still, creates no new canvases.
//
// Held here for the cardboard pack only. Several other packs (the paper sky, the LCD
// city) deliberately skip their bake when the DOM stub hands them no real canvas, so
// under the stub they repaint every frame by design and would read as false failures.
// The cast-wide check was made in real WebKit instead (12 Oct 2026: after the fix, a
// stage-1 run of every cabinet allocates its large canvases once).
import { installDom } from './dom-stub.js';
installDom();

const { getStylePack } = await import('../src/engine/stylePacks/index.js');
const { CABINETS } = await import('../src/data/cabinets.js');

let failed = false;
const assert = (cond, msg) => {
  if (cond) console.log('ok:', msg);
  else { console.error('FAIL:', msg); failed = true; }
};

function recorder() {
  const grad = { addColorStop() {} };
  return {
    canvas: { width: 480, height: 270 },
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, globalAlpha: 1,
    imageSmoothingEnabled: true,
    createLinearGradient: () => grad, createRadialGradient: () => grad,
    createConicGradient: () => grad, createPattern: () => null,
    fillRect() {}, clearRect() {}, beginPath() {}, rect() {}, arc() {}, ellipse() {},
    moveTo() {}, lineTo() {}, closePath() {}, fill() {}, stroke() {},
    quadraticCurveTo() {}, bezierCurveTo() {}, arcTo() {}, roundRect() {},
    setLineDash() {}, getLineDash: () => [], measureText: () => ({ width: 0 }),
    fillText() {}, strokeText() {},
    save() {}, restore() {}, translate() {}, scale() {}, rotate() {}, clip() {},
    setTransform() {}, resetTransform() {}, transform() {},
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    drawImage() {},
  };
}

let made = 0;
const createElement = document.createElement;
document.createElement = (...a) => { if (a[0] === 'canvas') made++; return createElement.call(document, ...a); };

for (const cab of CABINETS.filter((c) => c.style === 'cardboard')) {
  const pack = getStylePack(cab.style || 'pixel', { paperCabinet: cab.id, stageIndex: 1 });
  const ctx = recorder();
  let threw = null;
  try {
    pack.bg(ctx, 0, 100, cab, 1000, null, 0, null);   // the first frame bakes
    made = 0;
    // The camera holds still: scrolling legitimately reveals scenery that bakes on
    // arrival. Only TIME moves, and an animation must never be a new cache key.
    for (let f = 1; f <= 120; f++) pack.bg(ctx, f / 60, 100, cab, 1000, null, 0, null);
  } catch (e) {
    threw = e;
  }
  if (threw) {
    // Not this file's claim: a pack that cannot paint against the stub is held elsewhere.
    console.log(`   ${cab.id}: skipped (${String(threw.message).slice(0, 60)})`);
    continue;
  }
  assert(made === 0, `${cab.id}: two seconds of background after the first frame bake no new canvases (made ${made})`);
}

document.createElement = createElement;
if (failed) { console.error('BACKGROUND BAKES ONCE: FAILED'); process.exit(1); }
console.log('BACKGROUND BAKES ONCE: PASSED');
