// Plumber's sun is a sky object, not part of the scenery that follows a raised
// road. The background is rendered in a shifted context during a high jump;
// the sun must cancel that shift and keep its screen position.
import { installDom } from './dom-stub.js';
installDom();

const { getStylePack, __testing } = await import('../src/engine/stylePacks/index.js');
const { CABINETS } = await import('../src/data/cabinets.js');
const { STAGE_BY_ID } = await import('../src/data/stages.js');
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
assert(__testing.desertSceneryLift(true) === __testing.DESERT_SCENERY_LIFT_PORTRAIT
  && __testing.desertSceneryLift(false) === __testing.DESERT_SCENERY_LIFT
  && __testing.desertSceneryLift(true) > 0
  && __testing.desertSceneryLift(false) > 0
  && __testing.desertSceneryLift(true) > __testing.desertSceneryLift(false),
  'speed scenery lifts as one attached composition with extra portrait clearance');
const celestialBand = speedScene.bands.celestial;
const birdBand = speedScene.bands.birds;
const nearBand = speedScene.bands.near;
const portraitThermals = __testing.desertThermals({ sceneryLayout: speedScene });
const portraitSunY = __testing.sceneryBandPointY(
  { sceneryLayout: speedScene }, 'celestial', 60, __testing.DESERT_SUN_RADIUS)
  + __testing.DESERT_SUN_PORTRAIT_OFFSET;
const portraitNearBaseY = nearBand.center + 52;
assert(birdBand.top >= celestialBand.bottom,
  'speed decorative birds start below the celestial band');
assert(portraitThermals.every((th) => th.y - th.ry >= birdBand.top
  && th.y + th.ry <= birdBand.bottom),
  'speed portrait bird envelopes stay inside the shared birds band');
assert(portraitSunY - __testing.DESERT_SUN_RADIUS >= celestialBand.top
  && portraitSunY + __testing.DESERT_SUN_RADIUS <= speedScene.bands.farLandmark.bottom,
  'speed portrait sun stays in the visible sky pocket above the far mesa');

const ridgeProbe = { __mashBackgroundCoverage: { left: 73, right: 553, width: 480 } };
assert(__testing.desertSunX(ridgeProbe, true)
  === ridgeProbe.__mashBackgroundCoverage.right - __testing.DESERT_SUN_PORTRAIT_X_INSET
  && __testing.desertSunX(ridgeProbe, false) === 380,
  'speed sun uses the right-aligned portrait anchor and keeps landscape placement');
const cactusPlacements = __testing.desertCactusPlacements(
  ridgeProbe, 137, portraitNearBaseY, { portrait: true });
assert(cactusPlacements.length > 0
  && cactusPlacements.every((cactus) => Math.abs(cactus.crest - __testing.ridgeYAt(
    cactus.x, 137, portraitNearBaseY, 52, 150, 0.35,
    { dunes: true, coverageLeft: ridgeProbe.__mashBackgroundCoverage.left })) < 1e-9),
  'speed cacti use the exact shifted tile-local crest that the near ridge paints');
const cactusScaleRatios = cactusPlacements.map((cactus) =>
  cactus.height / __testing.DESERT_DUNES[cactus.duneIndex].h);
assert(cactusScaleRatios.every((ratio) => Math.abs(ratio - 52 * __testing.CACTUS_PORTRAIT_OF_DUNE) < 1e-9),
  'portrait speed cactus height follows the enlarged dune scale');
assert(cactusPlacements.every((cactus) => cactus.baseY > cactus.crest
  && cactus.baseY <= cactus.crest + cactus.height * (__testing.CACTUS_PORTRAIT_BURY + 1e-9)),
  'portrait speed cactus bases only bite into their ridge for natural occlusion');
const landscapeRidgeProbe = {
  __mashBackgroundCoverage: { left: 0, right: 480, width: 480 },
};
const landscapeCactusPlacements = __testing.desertCactusPlacements(
  landscapeRidgeProbe, 137, portraitNearBaseY, { portrait: false });
assert(landscapeCactusPlacements.length > 0
  && landscapeCactusPlacements.every((cactus) => Math.abs(cactus.crest - __testing.ridgeYAt(
    cactus.x, 137, portraitNearBaseY, 52, 150, 0.35,
    { dunes: true, coverageLeft: landscapeRidgeProbe.__mashBackgroundCoverage.left })) < 1e-9),
  'landscape speed cacti use the exact shifted tile-local crest that the near ridge paints');
assert(landscapeCactusPlacements.every((cactus) => cactus.baseY > cactus.crest
  && cactus.baseY <= cactus.crest + cactus.height * (__testing.CACTUS_BURY + 1e-9)),
  'landscape speed cactus bases only bite into their ridge for natural occlusion');
const nearSurfaceFeatures = __testing.desertNearSurfacePlacements(
  ridgeProbe, 137, portraitNearBaseY, { portrait: true });
const nearFeatureKinds = new Set(nearSurfaceFeatures.map((feature) => feature.kind));
assert(nearSurfaceFeatures.length > 0 && nearSurfaceFeatures.length <= 6
  && nearFeatureKinds.has('rock') && nearFeatureKinds.has('sage')
  && nearSurfaceFeatures.every((feature) => Math.abs(feature.baseY - (__testing.ridgeYAt(
    feature.x, 137, portraitNearBaseY, 52, 150, 0.35,
    { dunes: true, coverageLeft: ridgeProbe.__mashBackgroundCoverage.left }) + 2)) < 1e-9)
  && nearSurfaceFeatures.every((feature) => Math.abs(feature.angle - __testing.ridgeTangentAngle(
    feature.localX, portraitNearBaseY, 52, 150, 471, false, false, true)) < 1e-9),
  'near-hill rocks and sage follow the exact ridge geometry and tangent');
const frostFeatures = __testing.frostSceneryPlacements(
  ridgeProbe, 137, portraitNearBaseY, { layer: 'near' });
assert(frostFeatures.length > 0
  && frostFeatures.every((feature) => Math.abs(feature.baseY - (__testing.ridgeYAt(
    feature.x, 137, portraitNearBaseY, 40, 70, 0.3,
    { coverageLeft: ridgeProbe.__mashBackgroundCoverage.left }) + 1)) < 1e-9),
  'Frost pines use the exact near-ridge planting curve');
const cryptFeatures = __testing.cryptSceneryPlacements(
  ridgeProbe, 137, portraitNearBaseY, { layer: 'far' });
const cryptKinds = new Set(cryptFeatures.map((feature) => feature.kind));
assert(cryptFeatures.length > 0 && cryptKinds.has('dead-tree') && cryptKinds.has('stone')
  && cryptFeatures.every((feature) => Math.abs(feature.baseY - (__testing.ridgeYAt(
    feature.x, 137, portraitNearBaseY, 55, 100, 0.15,
    { coverageLeft: ridgeProbe.__mashBackgroundCoverage.left }) + 1)) < 1e-9),
  'Crypt dead trees and stones share the far-ridge planting curve');
const surgeFeatures = __testing.surgeSceneryPlacements(
  ridgeProbe, 137, portraitNearBaseY, { amp: 60, wl: 90, factor: 0.15 });
assert(surgeFeatures.length > 0
  && surgeFeatures.every((feature) => Math.abs(feature.baseY - (__testing.ridgeYAt(
    feature.x, 137, portraitNearBaseY, 60, 90, 0.15,
    { coverageLeft: ridgeProbe.__mashBackgroundCoverage.left }) + 1)) < 1e-9),
  'Surge signal pylons stay welded to their fallback ridge');
const portraitFarAmp = __testing.DESERT_FAR_PORTRAIT_AMP;
const portraitFarBaseY = speedScene.bands.farLandmark.center + portraitFarAmp
  + __testing.DESERT_FAR_PORTRAIT_DROP;
const portraitMiddleBaseY = speedScene.bands.middle.center + 78;
const waterTowers = __testing.desertWaterTowerPlacements(
  { __mashBackgroundCoverage: { left: 73, right: 2273, width: 2200 } },
  137, portraitFarBaseY, { portrait: true });
assert(waterTowers.length > 0
  && waterTowers.every((tower) => Math.abs(tower.baseY - (__testing.ridgeYAt(
    tower.x, 137, portraitFarBaseY, portraitFarAmp, 230, 0.12,
    { mesa: true, coverageLeft: ridgeProbe.__mashBackgroundCoverage.left }) + 2)) < 1e-9),
  'portrait water towers repeat on the exact far-mesa crest');
const satelliteDishes = __testing.desertSatelliteDishPlacements(
  { __mashBackgroundCoverage: { left: 73, right: 2273, width: 2200 } },
  137, portraitFarBaseY, { portrait: true });
assert(satelliteDishes.length > 0
  && satelliteDishes.every((dish) => Math.abs(dish.baseY - __testing.ridgeYAt(
    dish.x, 137, portraitFarBaseY, portraitFarAmp, 230, 0.12,
    { mesa: true, coverageLeft: 73 }) - 2) < 1e-9),
  'portrait satellite dishes repeat on the exact far-mesa crest');
const wideHorizonProbe = { __mashBackgroundCoverage: { left: 73, right: 3573, width: 3500 } };
const wideWaterTowers = __testing.desertWaterTowerPlacements(
  wideHorizonProbe, 137, portraitFarBaseY, { portrait: true });
const windTurbines = __testing.desertWindTurbinePlacements(
  wideHorizonProbe, 137, portraitFarBaseY, { portrait: true });
const windSlotCounts = new Map();
for (const turbine of windTurbines) {
  windSlotCounts.set(turbine.index, (windSlotCounts.get(turbine.index) || 0) + 1);
}
assert(wideWaterTowers.length < __testing.desertSatelliteDishPlacements(
  wideHorizonProbe, 137, portraitFarBaseY, { portrait: true }).length,
  'water towers are less frequent than satellite dishes on the horizon');
assert(windTurbines.length > 1
  && [...windSlotCounts.values()].every((count) => count === 3)
  && windTurbines.every((turbine) => Math.abs(turbine.baseY - __testing.ridgeYAt(
    turbine.x, 137, portraitFarBaseY, portraitFarAmp, 230, 0.12,
    { mesa: true, coverageLeft: wideHorizonProbe.__mashBackgroundCoverage.left }) - 2) < 1e-9),
  'occasional portrait wind turbines repeat on the exact far-mesa crest');
const highMesaDishes = __testing.desertSatelliteDishPlacements(
  wideHorizonProbe, 137, portraitFarBaseY, { portrait: true });
const dishSlotCounts = new Map();
for (const dish of highMesaDishes) {
  dishSlotCounts.set(dish.index, (dishSlotCounts.get(dish.index) || 0) + 1);
}
assert(wideWaterTowers.length > 0 && highMesaDishes.length > 0
  && Math.min(...wideWaterTowers.map((tower) => tower.baseY))
    > Math.max(...highMesaDishes.map((dish) => dish.baseY)),
  'water towers sit on lower mesas while satellite dishes sit on higher mesas');
assert([...dishSlotCounts.values()].every((count) => count === 3),
  'satellite dish slots use a readable three-dish cluster');
const horizonKinds = Array.from({ length: 6 }, (_, index) =>
  __testing.desertHorizonPropKind(index));
assert(horizonKinds[0] === null && horizonKinds[5] === null,
  'the horizon cycle leaves the first and last mesa slots blank');
assert(__testing.windTurbineRotation(0, 0) !== __testing.windTurbineRotation(1, 0)
  && __testing.windTurbineRotation(1, 2) !== __testing.windTurbineRotation(1, 3),
  'wind turbine rotors advance over time and vary by landmark phase');
assert(__testing.satelliteDishScanAngle(0, 0) !== __testing.satelliteDishScanAngle(1, 0)
  && __testing.satelliteDishScanAngle(1, 2) !== __testing.satelliteDishScanAngle(1, 3)
  && __testing.satelliteDishScanAngle(1, 0, true) === 0,
  'satellite dish antennas sweep independently and freeze with reduced motion');
const telegraphPoles = __testing.desertTelegraphPlacements(
  ridgeProbe, 137, portraitMiddleBaseY);
assert(telegraphPoles.length >= 3
  && telegraphPoles.every((pole) => Math.abs(pole.baseY - (__testing.ridgeYAt(
    pole.x, 137, portraitMiddleBaseY, 78, 200, 0.22,
    { dunes: true, coverageLeft: ridgeProbe.__mashBackgroundCoverage.left }) + 1)) < 1e-9),
  'portrait telegraph poles repeat on the exact middle-dune crest');
assert(telegraphPoles.some((pole) => pole.x < ridgeProbe.__mashBackgroundCoverage.left)
  && telegraphPoles.some((pole) => pole.x > ridgeProbe.__mashBackgroundCoverage.right),
  'telegraph wire endpoints stay alive beyond both portrait edges');
const speedSigns = __testing.desertSpeedLimitPlacements(
  ridgeProbe, 137, 232 + 5 - __testing.DESERT_SCENERY_LIFT_PORTRAIT, { portrait: true });
assert(speedSigns.length > 0 && speedSigns.every((sign) => sign.baseY
  === 194 - __testing.DESERT_SPEED_SIGN_RAISE),
  'portrait road signs sit higher while keeping their lifted roadside contract');
assert(speedSigns.every((sign) => Math.abs(sign.postFootY
  - (201 - 7 + sign.scale * 33)) < 1e-9),
  'portrait road sign posts reach their explicit planted roadside plane');
assert(speedSigns.every((sign) => Math.abs(__testing.desertSignPostHeight(sign)
  - ((sign.postFootY - sign.baseY) / sign.scale - sign.bottom)) < 1e-9),
  'portrait road sign shafts span continuously from board bottom to planted foot');
const roadSignKinds = __testing.DESERT_ROAD_SIGNS.map((sign) => sign.kind);
assert(roadSignKinds.length === 5
  && ['speed', 'highway', 'route', 'caution', 'exit'].every((kind) => roadSignKinds.includes(kind))
  && __testing.DESERT_ROAD_SIGNS[0].value === '93',
  'speed zone uses five sparse classic signs with an irregular speed sign');
const variedSignProbe = {
  __mashBackgroundCoverage: { left: 0, right: 20000, width: 20000 },
};
const variedSigns = __testing.desertSpeedLimitPlacements(variedSignProbe, 137, 232);
const variedSpeedValues = new Set(variedSigns
  .filter((sign) => sign.kind === 'speed').map((sign) => sign.value));
const variedHighwayValues = new Set(variedSigns
  .filter((sign) => sign.kind === 'highway').map((sign) => sign.value));
assert(['93', '103', 'πr²', '∞'].every((value) => variedSpeedValues.has(value))
  && ['13', '404', 'πr²', '∞'].every((value) => variedHighwayValues.has(value)),
  'speed and highway signs cycle through deterministic silly values');
const signOverGap = __testing.desertSpeedLimitPlacements(
  ridgeProbe, 137, 232, {
    portrait: true,
    backgroundZoom: 1.15,
    backgroundXOffset: -28,
    worldZoom: 1.7,
    worldXOffset: -28,
    roadGaps: [{
      x: 137 + (1.15 * (speedSigns[0].x - 240) + 240) / 1.7,
      w: 18,
    }],
  });
assert(!signOverGap.some((sign) => sign.index === speedSigns[0].index),
  'road signs are culled when their planted post projects over a live gap');
const desktopProbe = { __mashBackgroundCoverage: { left: 0, right: 480, width: 480 } };
const desktopSigns = __testing.desertSpeedLimitPlacements(
  desktopProbe, 137, 232);
assert(desktopSigns.length > 0 && desktopSigns.every((sign) => sign.baseY
  === 225 - __testing.DESERT_SPEED_SIGN_RAISE
    + __testing.DESERT_SPEED_SIGN_LANDSCAPE_DROP),
  'landscape road signs sit lower while keeping their roadside contract');
assert(desktopSigns.every((sign) => Math.abs(sign.postFootY
  - (232 - 7 + sign.scale * 33)) < 1e-9),
  'landscape road sign posts extend to the roadside plane');
assert(desktopSigns.every((sign) => Math.abs(__testing.desertSignPostHeight(sign)
  - ((sign.postFootY - sign.baseY) / sign.scale - sign.bottom)) < 1e-9),
  'landscape road sign shafts span continuously from board bottom to planted foot');
const desktopSignOverGap = __testing.desertSpeedLimitPlacements(
  desktopProbe, 137, 232, {
    worldZoom: 1.6,
    roadGaps: [{
      x: 137 + desktopSigns[0].x / 1.6,
      w: 18,
    }],
  });
assert(!desktopSignOverGap.some((sign) => sign.index === desktopSigns[0].index),
  'road signs are culled over a live gap in the landscape transform too');

for (const id of ['speed-1', 'speed-2', 'speed-3']) {
  assert(STAGE_BY_ID[id].paperPreset === 'cardstockClear',
    `${id} opts into the shared cardstock material`);
}
const speedPaperPack = getStylePack('faux3d', {
  paperCabinet: 'speed', paperPreset: 'cardstockClear', paperCutout: true,
});
assert(speedPaperPack.lightBg && speedPaperPack.paperSlab?.paper
  && speedPaperPack.paperSlab.material.id === 'cardstockClear',
  'speed faux-3D uses the paper background and shared terrain slab material');
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
const portraitScenery = sceneryPosition({ portrait: true, sceneryOffsetY: -90 });
assert(landscapeScenery && landscapeScenery[2] === -__testing.PLUMBER_LANDSCAPE_SCENERY_LIFT
  && portraitScenery && portraitScenery[2] === -90,
  'landscape lifts Plumber hills while portrait keeps its existing scenery offset');

function skyCoverage(coverage) {
  const { ctx, ops } = recorder();
  ctx.__mashBackgroundCoverage = coverage;
  pack.bg(ctx, 12, 0, plumber, Infinity, null, 0);
  return ops.find((op) => op[0] === 'fillRect');
}

const shiftedSky = skyCoverage({ left: 77, right: 557, width: 480 });
assert(shiftedSky && shiftedSky[1] <= 77
  && shiftedSky[1] + shiftedSky[3] >= 557,
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
