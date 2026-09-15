import { installDom } from './dom-stub.js';

installDom({ innerWidth: 390, innerHeight: 844 });

const { __testing, getStylePack } = await import('../src/engine/stylePacks/index.js');
const { CABINETS } = await import('../src/data/cabinets.js');
const { GROUND_Y } = await import('../src/engine/camera.js');

let failed = false;
function assert(condition, message) {
  if (!condition) { console.error('FAIL:', message); failed = true; }
  else console.log('ok:', message);
}

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.__mashBackgroundCoverage = { left: 131, right: 611, width: 480, lookahead: 12 };

const portraitA = __testing.plumberSceneryPlacements(ctx, 0.25, GROUND_Y);
const portraitB = __testing.plumberSceneryPlacements(ctx, 0.25, GROUND_Y);
assert(JSON.stringify(portraitA) === JSON.stringify(portraitB),
  'Plumber scenery placement is deterministic at fractional camera travel');
assert(portraitA.length > 0 && portraitA.every((prop) =>
  prop.x >= 45 && prop.x <= 697 && Number.isFinite(prop.baseY)),
  'portrait scenery stays inside the shifted coverage plus cull margin');
const visibleRetained = [...portraitA, ...__testing.plumberSceneryPlacements(ctx, 10000, GROUND_Y)];
assert(visibleRetained.some((prop) => prop.kind === 'flower')
  && visibleRetained.some((prop) => prop.kind === 'bush'),
  'visible scenery sequence includes the retained flower and bush motifs');
assert(!portraitA.some((prop) => ['pipe', 'butterfly', 'pinwheelBase', 'pinwheelRotor', 'path', 'bridge']
  .includes(prop.kind)),
  'removed scenery types never enter the Plumber placement sequence');

const houseCells = [];
for (let cell = 0; cell < 96; cell++) {
  if (__testing.plumberSceneryClusterForCell(cell) === 'house') houseCells.push(cell);
}
assert(houseCells.length >= 1 && houseCells.length <= 2
  && houseCells.every((cell, i) => i === 0 || cell - houseCells[i - 1] >= 40),
  'houses stay to one or two well-separated landmarks across a level');

const longScroll = __testing.plumberSceneryPlacements(ctx, 10000, GROUND_Y);
const houseScroll = __testing.plumberSceneryPlacements(ctx, 4500, GROUND_Y);
const paintCoverage = __testing.backgroundPaintCoverage(ctx);
const ridgeDelta = (prop, camX) => prop.baseY - __testing.ridgeYAt(
  prop.x, camX, GROUND_Y, 34, 50, 0.35, { coverageLeft: paintCoverage.left });
const fenceSamples = longScroll.filter((prop) => prop.kind === 'fence');
const bushSamples = [...portraitA, ...longScroll].filter((prop) => prop.kind === 'bush');
const houseSamples = houseScroll.filter((prop) => prop.kind === 'house');
assert(fenceSamples.length > 0 && fenceSamples.every((prop) => ridgeDelta(prop, 10000) >= 18),
  'fence roots sit below the near-hill crest');
assert(bushSamples.every((prop) => ridgeDelta(prop, portraitA.includes(prop) ? 0.25 : 10000) >= 13),
  'bush roots sit inside the near-hill face');
assert(houseSamples.length === 1 && houseSamples.every((prop) => ridgeDelta(prop, 4500) >= 29),
  'house landmarks sit well below the near-hill crest');

const flowerCameraSamples = [-1200, -73.5, 0.25, 37.5, 4500, 10000];
let flowersSeen = 0;
for (const camX of flowerCameraSamples) {
  const placements = __testing.plumberSceneryPlacements(ctx, camX, GROUND_Y);
  const trees = __testing.plumberNearTreeCenters(ctx, camX);
  const flowers = placements.filter((prop) => prop.kind === 'flower');
  flowersSeen += flowers.length;
  assert(flowers.every((prop) => !__testing.plumberFlowerOverlapsTree(trees, prop.x, prop.scale)),
    `flowers keep clear of baked ridge trees at camera ${camX}`);
}
assert(flowersSeen > 0, 'flower accents remain after tree-clearance filtering');

const wrapped = __testing.plumberSceneryPlacements(ctx, 122 / (0.35 * 2), GROUND_Y);
assert(wrapped.length > 0 && wrapped.every((prop) => Number.isFinite(prop.baseY)),
  'scenery remains grounded after one complete placement-cell camera wrap');

const plumber = CABINETS.find((cab) => cab.id === 'plumber');
const speed = CABINETS.find((cab) => cab.id === 'speed');
const pack = getStylePack('pixel', { paperCutout: false });
assert(__testing.plumberLandscapeSceneryOffset({ portrait: false })
  === -__testing.PLUMBER_LANDSCAPE_SCENERY_LIFT
  && __testing.plumberLandscapeSceneryOffset({ portrait: true }) === 0,
  'Plumber scenery lift applies only to landscape');
pack.bg(ctx, 2, 0.25, plumber, 1000, null, 0, {
  cameraShiftY: 0,
  sceneryLayout: null,
});
assert(true, 'Plumber background draw path completes with scenery sprites');

const paperPack = getStylePack('pixel', {});
paperPack.bg(ctx, 1.4, 2.5, plumber, 1000, null, 0, {});
assert(true, 'Plumber paper scenery sprites bake and draw without a runtime error');
paperPack.bg(ctx, 1.4, 3000, plumber, 1000, null, 0, {});
assert(true, 'Plumber scenery sprites draw on a real tree during a long scroll');

const before = __testing.plumberSceneryClusterForCell(17);
pack.bg(ctx, 2, 0.25, speed, 1000, null, 0, {});
assert(__testing.plumberSceneryClusterForCell(17) === before,
  'scenery catalogue remains a pure Plumber-only integration decision');

if (failed) process.exit(1);
console.log('PLUMBER SCENERY: PASSED');
