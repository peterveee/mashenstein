// Plumber's sun is a sky object, not part of the scenery that follows a raised
// road. The background is rendered in a shifted context during a high jump;
// the sun must cancel that shift and keep its screen position.
import { installDom } from './dom-stub.js';
installDom();

const { getStylePack, __testing } = await import('../src/engine/stylePacks/index.js');
const { CABINETS } = await import('../src/data/cabinets.js');
const { frameForViewport } = await import('../src/engine/frame.js');
const { portraitHudLayout } = await import('../src/game/portrait-layout.js');
const { resolveCompositionProfile } = await import('../src/engine/composition-profile.js');
const { resolveSceneryLayout } = await import('../src/engine/scenery-layout.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

function recorder() {
  const ops = [];
  const gradient = { addColorStop() {} };
  const ctx = {
    canvas: { width: 480, height: 270 },
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, globalAlpha: 1,
    createLinearGradient() { return gradient; },
    createRadialGradient() { return gradient; },
    fillRect(...args) { ops.push(['fillRect', ...args]); },
    beginPath() {},
    rect() {},
    arc() {}, ellipse() {}, moveTo() {}, lineTo() {}, closePath() {},
    fill() {}, stroke() {},
    save() {}, restore() {},
    translate(...args) { ops.push(['translate', ...args]); },
    scale() {}, rotate() {}, clip() {}, drawImage() {},
  };
  return { ctx, ops };
}

const plumber = CABINETS.find((cab) => cab.id === 'plumber');
const pack = getStylePack('pixel', {});
assert(__testing.paperCutoutPreviewRequested({}) === true,
  'Plumber paper treatment is enabled by default for this study');
assert(__testing.paperCutoutPreviewRequested({ paperCutout: true }) === true,
  'Plumber paper treatment can be enabled through the preview seam');
assert(__testing.paperCutoutPreviewRequested({ paperCutout: false }) === false,
  'Plumber paper treatment can be disabled through the comparison seam');

const speedFrame = frameForViewport({
  mode: 'phone-portrait', viewportWidth: 390, viewportHeight: 844,
  safeInsets: { top: 59, right: 0, bottom: 34, left: 0 },
});
const speedProfile = resolveCompositionProfile('speed');
const speedScene = resolveSceneryLayout({
  frame: speedFrame,
  hud: portraitHudLayout(speedFrame),
  bands: speedProfile.bands,
});
const celestialBand = speedScene.bands.celestial;
const birdBand = speedScene.bands.birds;
const nearBand = speedScene.bands.near;
const portraitThermals = __testing.desertThermals({ sceneryLayout: speedScene });
const portraitSunY = __testing.sceneryBandPointY(
  { sceneryLayout: speedScene }, 'celestial', 60, __testing.DESERT_SUN_RADIUS);
const portraitNearBaseY = nearBand.center + 52;
const portraitLoopY = __testing.desertLoopLandmarkY(portraitNearBaseY, 52);
assert(birdBand.top >= celestialBand.bottom,
  'speed decorative birds start below the celestial band');
assert(portraitThermals.every((th) => th.y - th.ry >= birdBand.top
  && th.y + th.ry <= birdBand.bottom),
  'speed portrait bird envelopes stay inside the shared birds band');
assert(portraitSunY - __testing.DESERT_SUN_RADIUS >= celestialBand.top
  && portraitSunY + __testing.DESERT_SUN_RADIUS <= celestialBand.bottom,
  'speed portrait sun envelope stays inside the celestial band');
const portraitLoopBottom = portraitLoopY + __testing.DESERT_LOOP_RADIUS;
assert(portraitLoopBottom > nearBand.center
  && portraitLoopBottom <= nearBand.center + __testing.DESERT_LOOP_PEEK,
  'speed decorative loop rings peek from behind the near-scenery crest');
function sunPosition(bgShift) {
  const { ctx, ops } = recorder();
  // Infinity skips the Plumber volcano; the first translate is still the sun,
  // before any cloud or hill painter gets a chance to add its own transform.
  pack.bg(ctx, 12, 0, plumber, Infinity, null, bgShift);
  return ops.find((op) => op[0] === 'translate');
}

function composedSunPosition(bgShift) {
  const { ctx, ops } = recorder();
  pack.bg(ctx, 12, 0, plumber, Infinity, null, bgShift, {
    cameraShiftY: bgShift,
    sceneryLayout: { bands: { celestial: { center: 58 } } },
  });
  return ops.find((op) => op[0] === 'translate');
}

function sceneryPosition(backgroundContext) {
  const { ctx, ops } = recorder();
  pack.bg(ctx, 12, 0, plumber, Infinity, null, 0, backgroundContext);
  return ops.find((op) => op[0] === 'translate' && op[1] === 0);
}

const grounded = sunPosition(0);
const highJump = sunPosition(42);
assert(grounded && highJump && grounded[1] === highJump[1]
  && grounded[2] === highJump[2] + 42,
  'the Plumber sun stays fixed on screen when the raised-road background shifts');
const composedGrounded = composedSunPosition(0);
const composedHigh = composedSunPosition(42);
assert(composedGrounded && composedHigh && composedGrounded[1] === composedHigh[1]
  && composedGrounded[2] === composedHigh[2] + 42,
  'the shared scene context does not double-cancel celestial parallax');

const landscapeScenery = sceneryPosition(null);
const portraitScenery = sceneryPosition({ sceneryOffsetY: -90 });
assert(landscapeScenery && landscapeScenery[2] === 0
  && portraitScenery && portraitScenery[2] === -90,
  'portrait lifts the mountain layer without changing landscape scenery');

function skyCoverage(coverage) {
  const { ctx, ops } = recorder();
  ctx.__mashBackgroundCoverage = coverage;
  pack.bg(ctx, 12, 0, plumber, Infinity, null, 0);
  return ops.find((op) => op[0] === 'fillRect');
}

const shiftedSky = skyCoverage({ left: 77, right: 557, width: 480 });
assert(shiftedSky && shiftedSky[1] === 77 && shiftedSky[3] === 480,
  'a shifted portrait background sky covers the translated visible range');

function groundOps(camX) {
  const { ctx, ops } = recorder();
  pack.ground(ctx, camX, plumber, [], [], 0, 480, null);
  return ops;
}

const groundAtRest = groundOps(0);
const groundInMotion = groundOps(13);
const apronRows = [241, 253, 264];
const rowXs = (ops, y) => ops
  .filter((op) => op[0] === 'fillRect' && op[2] === y)
  .map((op) => op[1]);
assert(apronRows.every((y) => rowXs(groundAtRest, y).length > 0),
  'Plumber foreground grass has three depth bands in the lower apron');
assert(apronRows.every((y) => JSON.stringify(rowXs(groundAtRest, y))
  !== JSON.stringify(rowXs(groundInMotion, y))),
  'each Plumber foreground band scrolls with the camera');

console.log(failed ? 'PIXEL BACKGROUND: FAILED' : 'PIXEL BACKGROUND: PASSED');
process.exit(failed ? 1 : 0);
