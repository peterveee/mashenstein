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
    rect() {}, quadraticCurveTo() {},
    arc() {}, ellipse() {}, moveTo() {}, lineTo() {}, closePath() {},
    fill() { ops.push(['fill', this.globalAlpha]); }, stroke() {},
    save() {}, restore() {},
    translate(...args) { ops.push(['translate', ...args]); },
    scale() {}, rotate() {}, clip() {}, drawImage() {},
  };
  return { ctx, ops };
}

const plumber = CABINETS.find((cab) => cab.id === 'plumber');
const frost = CABINETS.find((cab) => cab.id === 'frost');
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
assert(frostFeatures.length >= 2
  && frostFeatures.every((feature) => Math.abs(feature.crest - __testing.ridgeYAt(
    feature.x, 137, portraitNearBaseY, 40, 70, 0.3,
    { coverageLeft: ridgeProbe.__mashBackgroundCoverage.left })) < 1e-9)
  && __testing.FROST_SCENERY_EMBED === 0
  && __testing.FROST_PINE_EMBED > 0
  && __testing.FROST_PINE_EMBED <= 1.5,
  'Frost near ridge carries multiple props on the exact curve with visible feet and lightly embedded trunks');
assert(['pine', 'ice-rock', 'landmark', 'snowbank', 'glacier']
  .every((kind) => !__testing.frostSceneryUsesPaperShadow({ kind })),
  'no Frost ridge feature casts a separate paper drop shadow');
// Aerial perspective, not a second palette: each layer's colours are mixed
// toward what is behind it, and the palette's internal order has to survive it.
{
  const cab = frost;
  const far = __testing.frostAtmosphericPalette('far', cab);
  const near = __testing.frostAtmosphericPalette('near', cab);
  const luma = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  };
  assert(luma(far.landmark) > luma(near.landmark),
    'the far ridge is hazed further toward its backdrop than the near one');
  assert(luma(far.snow) > luma(far.shadow) && luma(near.snow) > luma(near.shadow),
    'haze preserves the palette order — snow stays lighter than shadow');
  assert(far.warm === near.warm,
    'the lit window keeps its warm accent through the haze');
}
const frostPortraitFeatures = __testing.frostSceneryPlacements(
  ridgeProbe, 137, portraitNearBaseY, { layer: 'near', portrait: true });
const frostPortraitFarFeatures = __testing.frostSceneryPlacements(
  ridgeProbe, 137, portraitNearBaseY, { layer: 'far', portrait: true });
const frostLandscapeFarFeatures = __testing.frostSceneryPlacements(
  ridgeProbe, 137, portraitNearBaseY, { layer: 'far', portrait: false });
assert(frostPortraitFeatures.length > frostFeatures.length
  && frostPortraitFarFeatures.length > frostLandscapeFarFeatures.length,
  'Frost portrait adds a restrained third scenery slot per ridge period');
const frostWideProbe = { __mashBackgroundCoverage: { left: 0, right: 2200, width: 2200 } };
const frostNearKinds = new Set(__testing.frostSceneryPlacements(
  frostWideProbe, 137, portraitNearBaseY, { layer: 'near' }).map((feature) => feature.kind));
const frostFarKinds = new Set(__testing.frostSceneryPlacements(
  frostWideProbe, 137, portraitNearBaseY, { layer: 'far' }).map((feature) => feature.kind));
assert(frostNearKinds.has('pine') && frostNearKinds.has('ice-rock') && frostNearKinds.has('snowbank'),
  'Frost near ridge uses pines, blue ice rocks and snowbanks instead of one repeated prop');
assert(frostFarKinds.has('glacier') && frostFarKinds.has('landmark'),
  'Frost far ridge carries glacier silhouettes and a stage landmark slot');
const frostFortresses = __testing.frostSceneryPlacements(
  frostWideProbe, 137, portraitNearBaseY, { layer: 'far' })
  .filter((feature) => feature.kind === 'landmark');
assert(frostFortresses.length > 0
  && frostFortresses.every((feature) => Math.abs(feature.crest - __testing.ridgeYAt(
    feature.x, 137, portraitNearBaseY, 66, 130, 0.12,
    { coverageLeft: frostWideProbe.__mashBackgroundCoverage.left })) < 1e-9)
  && __testing.FROST_SCENERY_EMBED === 0,
  'Frost fortress landmarks use the exact ridge with visible feet');
function frostPlacementSignature(ctx, camX, layer) {
  return new Map(__testing.frostSceneryPlacements(
    ctx, camX, portraitNearBaseY, { layer })
    .map((feature) => [`${feature.tile}:${feature.slotIndex}`,
      `${feature.kind}:${feature.localX}`]));
}
for (const [orientation, coverage] of [
  ['landscape', { left: 0, right: 480, width: 480 }],
  ['portrait', { left: 131.25, right: 611.25, width: 480 }],
]) {
  for (const [layer, wl, factor] of [['near', 70, 0.3], ['far', 130, 0.12]]) {
    const period = Math.round(Math.PI * wl);
    const wrapCamX = period / (factor * 2);
    const before = frostPlacementSignature(coverage, wrapCamX - 0.1, layer);
    const after = frostPlacementSignature(coverage, wrapCamX + 0.1, layer);
    const common = [...before.keys()].filter((key) => after.has(key));
    assert(common.length > 0 && common.every((key) => before.get(key) === after.get(key)),
      `Frost ${layer} placements stay stable through a ${orientation} tile wrap`);
  }
}
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
const landmarkProps = __testing.desertLandmarkPropPlacements(
  { __mashBackgroundCoverage: { left: 73, right: 2273, width: 2200 } },
  137, portraitFarBaseY, { portrait: true });
assert(landmarkProps.length > 0
  && landmarkProps.every((prop) => Math.abs(prop.baseY - __testing.ridgeYAt(
    prop.x, 137, portraitFarBaseY, portraitFarAmp, 230, 0.12,
    { mesa: true, coverageLeft: 73 }) - 2) < 1e-9),
  'portrait horizon landmarks repeat on the exact far-mesa crest');
const wideHorizonProbe = { __mashBackgroundCoverage: { left: 73, right: 3573, width: 3500 } };
const wideWaterTowers = __testing.desertWaterTowerPlacements(
  wideHorizonProbe, 137, portraitFarBaseY, { portrait: true });
const windTurbines = __testing.desertWindTurbinePlacements(
  wideHorizonProbe, 137, portraitFarBaseY, { portrait: true });
const windSlotCounts = new Map();
for (const turbine of windTurbines) {
  windSlotCounts.set(turbine.index, (windSlotCounts.get(turbine.index) || 0) + 1);
}
assert(wideWaterTowers.length < __testing.desertLandmarkPropPlacements(
  wideHorizonProbe, 137, portraitFarBaseY, { portrait: true }).length,
  'water towers are less frequent than the mesa-top landmarks on the horizon');
assert(windTurbines.length > 1
  && [...windSlotCounts.values()].every((count) => count === 3)
  && windTurbines.every((turbine) => Math.abs(turbine.baseY - __testing.ridgeYAt(
    turbine.x, 137, portraitFarBaseY, portraitFarAmp, 230, 0.12,
    { mesa: true, coverageLeft: wideHorizonProbe.__mashBackgroundCoverage.left }) - 2) < 1e-9),
  'occasional portrait wind turbines repeat on the exact far-mesa crest');
const highMesaProps = __testing.desertLandmarkPropPlacements(
  wideHorizonProbe, 137, portraitFarBaseY, { portrait: true });
const landmarkSlotCounts = new Map();
for (const prop of highMesaProps) {
  landmarkSlotCounts.set(prop.index, (landmarkSlotCounts.get(prop.index) || 0) + 1);
}
assert(wideWaterTowers.length > 0 && highMesaProps.length > 0
  && Math.min(...wideWaterTowers.map((tower) => tower.baseY))
    > Math.max(...highMesaProps.map((prop) => prop.baseY)),
  'water towers sit on lower mesas while the landmarks sit on higher mesas');
assert([...landmarkSlotCounts.values()].every((count) => count === 1),
  'each landmark slot holds one prop, not a cluster');
// A stage travels slots 0–3 of the cycle. The big ear is on every stage, slot 0 is
// each stage's own landmark, and the radio mast appears exactly once.
const stageKinds = [1, 2, 3].map((stage) => Array.from({ length: 6 }, (_, index) =>
  __testing.desertHorizonPropKind(index, stage)));
assert(stageKinds.every((kinds) => kinds[1] === 'big-ear' && kinds[3] === 'wind' && kinds[5] === null),
  'every speed stage passes the big ear and the wind farm; the last slot stays blank');
assert(new Set(stageKinds.map((kinds) => kinds[0])).size === 3
  && stageKinds.every((kinds) => kinds[0] && kinds[0] !== 'big-ear'),
  'each speed stage opens on a landmark of its own');
assert(stageKinds.flatMap((kinds) => kinds.slice(0, 4)).filter((kind) => kind === 'mast').length === 1,
  'the radio mast appears once across the three stages');
assert(__testing.windTurbineRotation(0, 0) !== __testing.windTurbineRotation(1, 0)
  && __testing.windTurbineRotation(1, 2) !== __testing.windTurbineRotation(1, 3),
  'wind turbine rotors advance over time and vary by landmark phase');
assert(__testing.satelliteDishScanAngle(0, 0) !== __testing.satelliteDishScanAngle(1, 0)
  && __testing.satelliteDishScanAngle(1, 2) !== __testing.satelliteDishScanAngle(1, 3)
  && __testing.satelliteDishScanAngle(1, 0) !== __testing.satelliteDishScanAngle(0, 0),
  'satellite dish antennas sweep independently over time and landmark phase');
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
const landscapeSigns = __testing.desertSpeedLimitPlacements(
  ridgeProbe, 137, 232 + 5, { portrait: false });
const signBoardBottom = (sign) => sign.baseY + sign.bottom * sign.scale;
assert(speedSigns.length > 0 && speedSigns.every((sign) => sign.baseY
  === 194 - __testing.DESERT_SPEED_SIGN_RAISE),
  'portrait road signs sit higher while keeping their lifted roadside contract');
assert([...speedSigns, ...landscapeSigns].every((sign) => signBoardBottom(sign)
  <= 232 - 24 - 6),
  'every road sign board clears the tallest hero with a small margin');
assert(speedSigns.every((sign) => Math.abs(sign.postFootY
  - (201 - 7 + sign.scale * 33)) < 1e-9),
  'portrait road sign posts reach their explicit planted roadside plane');
assert(speedSigns.every((sign) => Math.abs(__testing.desertSignPostHeight(sign)
  - ((sign.postFootY - sign.baseY) / sign.scale - sign.bottom)) < 1e-9),
  'portrait road sign shafts span continuously from board bottom to planted foot');
const roadSignKinds = __testing.DESERT_ROAD_SIGNS.map((sign) => sign.kind);
const liveAutobahn = __testing.DESERT_ROAD_SIGNS.find((sign) => sign.kind === 'route');
const liveWarning = __testing.DESERT_ROAD_SIGNS.find((sign) => sign.kind === 'caution');
assert(roadSignKinds.length === 5
  && ['speed', 'highway', 'route', 'caution', 'exit'].every((kind) => roadSignKinds.includes(kind))
  && /^\d+$/.test(__testing.DESERT_ROAD_SIGNS[0].value)
  && Number(__testing.DESERT_ROAD_SIGNS[0].value) <= 99
  && liveAutobahn?.shape === 'autobahn'
  && liveAutobahn?.w === 32
  && liveAutobahn?.top === -60
  && liveAutobahn?.bottom === -12
  && liveAutobahn?.bottom - liveAutobahn?.top === liveAutobahn?.w * 1.5
  && liveAutobahn?.face === '#3f6571'
  && liveAutobahn?.label === ''
  && liveAutobahn?.value === ''
  && liveWarning?.shape === 'triangle'
  && liveWarning?.w === 44
  && liveWarning?.top === -57
  && liveWarning?.bottom === -18
  && liveWarning?.warningFormula === 'mc²'
  && liveWarning?.warningFormulaScale === 1.7
  && liveWarning?.warningFormulaOffset === 0.14
  && liveWarning?.warningFormulaPadding === 0.16
  && liveWarning?.warningMarkOffset === 0
  && liveWarning?.face === '#f1e8d5'
  && liveWarning?.trim === '#a85f55',
  'speed zone uses five sparse signs with Autobahn and warning triangle replacements');
const variedSignProbe = {
  __mashBackgroundCoverage: { left: 0, right: 20000, width: 20000 },
};
const variedSigns = __testing.desertSpeedLimitPlacements(variedSignProbe, 137, 232);
const variedSpeedValues = new Set(variedSigns
  .filter((sign) => sign.kind === 'speed').map((sign) => sign.value));
const variedHighwayValues = new Set(variedSigns
  .filter((sign) => sign.kind === 'highway').map((sign) => sign.value));
assert(variedSpeedValues.size > 0
  && [...variedSpeedValues].every((value) => /^\d+$/.test(value)
    && Number(value) >= 10 && Number(value) <= 99)
  && ['13', '404', 'πr²', '∞'].every((value) => variedHighwayValues.has(value)),
  'speed limits stay random and at or below 99 while highway signs keep their silly cycle');
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

for (const id of ['speed-1', 'speed-2', 'speed-3', 'frost-1', 'frost-2', 'frost-3']) {
  assert(STAGE_BY_ID[id].paperPreset === 'cardstockClear',
    `${id} opts into the shared cardstock material`);
}
const speedPaperPack = getStylePack('faux3d', {
  paperCabinet: 'speed', paperPreset: 'cardstockClear', paperCutout: true,
});
assert(speedPaperPack.lightBg && speedPaperPack.paperSlab?.paper
  && speedPaperPack.paperSlab.material.id === 'cardstockClear',
  'speed faux-3D uses the paper background and shared terrain slab material');
assert(!speedPaperPack.decorate,
  'speed faux-3D does not add its own generic obstacle shadow');
const frostPack = getStylePack('watercolor', {});
function frostFinishMarks(backgroundContext) {
  const { ctx } = recorder();
  const marks = [];
  ctx.__mashBackgroundCoverage = { left: 0, right: 480, width: 480 };
  ctx.stroke = () => marks.push(ctx.strokeStyle);
  ctx.fill = () => marks.push(ctx.fillStyle);
  frostPack.bg(ctx, 12, 780, frost, 6000, backgroundContext, 0, backgroundContext);
  return marks;
}
const shippedFrostMarks = frostFinishMarks({ stageIndex: 2 });
const previousFrostMarks = frostFinishMarks({ stageIndex: 2, frostSceneryStudy: null });
assert(shippedFrostMarks.includes('rgba(239,247,251,0.40)')
  && shippedFrostMarks.includes('rgba(248,252,255,0.88)')
  && !previousFrostMarks.includes('rgba(239,247,251,0.40)')
  && !previousFrostMarks.includes('rgba(248,252,255,0.88)'),
  'Frost ships E hill seams and deep snow while the gallery can still show the previous scene');
const frostPaint = recorder();
frostPaint.ctx.__mashBackgroundCoverage = { left: 0, right: 480, width: 480 };
frostPack.bg(frostPaint.ctx, 12, 0, frost, 6000, null, 0);
const foregroundHillPasses = frostPaint.ops.filter((op) =>
  op[0] === 'fill' && Math.abs(op[1] - 0.22) < 1e-9);
assert(foregroundHillPasses.length === 1,
  'Frost adds one translucent foreground hill sheet, separate from the opaque ridges');
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
