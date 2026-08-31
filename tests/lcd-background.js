// RHYTHM BANKRUPTCY's Game Boy Color city: three fixed limited-palette scenes,
// deterministic musical poses, and accessibility fallbacks. This records Canvas2D operations
// rather than comparing PNGs, so a changed segment is an exact source-level
// signal and the suite remains browserless.
import { installDom } from './dom-stub.js';
installDom();

const { getStylePack } = await import('../src/engine/stylePacks/index.js');
const { CABINETS } = await import('../src/data/cabinets.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

function recorder() {
  const ops = [];
  const style = (value) => (typeof value === 'string' ? value : '[paint]');
  const gradient = { addColorStop() {} };
  const ctx = {
    canvas: { width: 480, height: 270 },
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    createLinearGradient() { return gradient; },
    createRadialGradient() { return gradient; },
    createPattern() { return {}; },
    fillRect(...args) { ops.push(['fillRect', style(this.fillStyle), ...args]); },
    strokeRect(...args) { ops.push(['strokeRect', style(this.strokeStyle), ...args]); },
    beginPath() { ops.push(['beginPath']); },
    arc(...args) { ops.push(['arc', ...args]); },
    ellipse(...args) { ops.push(['ellipse', ...args]); },
    moveTo(...args) { ops.push(['moveTo', ...args]); },
    lineTo(...args) { ops.push(['lineTo', ...args]); },
    quadraticCurveTo(...args) { ops.push(['quadraticCurveTo', ...args]); },
    closePath() { ops.push(['closePath']); },
    stroke() { ops.push(['stroke', style(this.strokeStyle), this.lineWidth]); },
    fill() { ops.push(['fill', style(this.fillStyle)]); },
    drawImage(...args) { ops.push(['drawImage', ...args.slice(1)]); },
    setTransform() {},
    save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
  };
  return { ctx, ops };
}

const rhythm = CABINETS.find((cab) => cab.id === 'rhythm');
function background(stageIndex, beat, settings = {}, t = 0, camX = 0) {
  const { ctx, ops } = recorder();
  getStylePack('lcd', settings).bg(ctx, t, camX, rhythm, 1000, { stageIndex, beat });
  return ops;
}
function ground(obstacles, camX = 0, settings = {}) {
  const { ctx, ops } = recorder();
  getStylePack('lcd', settings).ground(ctx, camX, rhythm, obstacles);
  return ops;
}
const fingerprint = (ops) => JSON.stringify(ops);
const ACTIVE = 'rgba(211,91,67,0.82)';
const WINDOW_OFF = 'rgba(53,83,101,0.24)';
const PRINT = 'rgba(38,53,93,0.72)';
const PANEL_LIT = '#dce49a';
const INK = '#26355d';
const GROUND_Y = 224;
const H = 270;

const idle = [1, 2, 3].map((stage) => fingerprint(background(stage, null)));
assert(new Set(idle).size === 3, 'all three stages have distinct fixed skyline silhouettes');

for (const [stage, short, tall] of [[1, 48, 110], [2, 58, 138], [3, 48, 126]]) {
  const stageOps = background(stage, null);
  const heights = stageOps
    .filter((op) => op[0] === 'strokeRect' && op[1] === PRINT)
    .filter((op) => Math.abs(op[3] + op[5] - (H + 0.5)) < 0.001)
    .map((op) => GROUND_Y - (op[3] - 0.5));
  assert(heights.some((h) => h <= short) && heights.some((h) => h >= tall),
    `stage ${stage} mixes genuinely short buildings with tall towers`);
  assert(stageOps.filter((op) => op[0] === 'strokeRect').length >= 14
    && stageOps.filter((op) => op[0] === 'fillRect' && (op[4] === 1 || op[5] === 1)).length >= 45,
  `stage ${stage} uses fine cornices, mullions, facade fittings and rooftop linework`);
  assert(new Set(stageOps.filter((op) => op[0] === 'fillRect' && String(op[1]).startsWith('rgba('))
    .map((op) => op[1])).size >= 7,
  `stage ${stage} retains a small multi-colour GBC scenery palette`);
  assert(stageOps.filter((op) => op[0] === 'fillRect' && op[1] === WINDOW_OFF
    && op[4] === 7 && op[5] === 6).length >= 12,
  `stage ${stage} windows read as chunky 7x6 colour blocks`);
  assert(stageOps.some((op) => op[0] === 'fillRect' && op[1] === WINDOW_OFF
    && op[3] >= GROUND_Y && op[4] === 7 && op[5] === 6),
  `stage ${stage} facade and windows continue below the road into pit depth`);
}

const testGap = { live: true, x: 100, w: 56, def: { isGap: true } };
const pitOps = ground([testGap]);
const rectOverlapsPit = (op) => op[0] === 'fillRect' && op[2] < 156 && op[2] + op[4] > 100;
const apronCols = pitOps.filter((op) => op[0] === 'fillRect' && op[1] === PANEL_LIT
  && op[3] === GROUND_Y && op[4] === 2 && op[5] === H - GROUND_Y);
assert(apronCols.some((op) => op[2] < 100) && apronCols.some((op) => op[2] >= 156)
  && !apronCols.some(rectOverlapsPit),
'the road is walked in surface-following columns that stop at the pit lips');
assert(!pitOps.some((op) => op[1] === PANEL_LIT && op[3] === GROUND_Y
  && op[5] === H - GROUND_Y && rectOverlapsPit(op)),
'the pit mouth is never repainted with a flat panel colour');
assert(!pitOps.some((op) => op[1] === 'rgba(38,53,93,0.14)'
  && op[3] === GROUND_Y + 7 && rectOverlapsPit(op)),
'road dashes stop at the pit lips instead of crossing the background window');
assert(pitOps.some((op) => op[0] === 'fillRect' && op[1] === INK
  && op[2] === 100 && op[3] === GROUND_Y && op[4] === 3 && op[5] === H - GROUND_Y)
  && pitOps.some((op) => op[0] === 'fillRect' && op[1] === INK
    && op[2] === 153 && op[3] === GROUND_Y && op[4] === 3 && op[5] === H - GROUND_Y),
'full-depth side walls, one road-line gauge thick, frame the pit');
assert(pitOps.some((op) => op[0] === 'fill' && op[1] === INK)
  && pitOps.filter((op) => op[0] === 'arc' && op[3] === 6.5).length >= 3,
'meshed dark cogwheels stand in the hole where the spike row used to');

for (const stage of [1, 2, 3]) {
  const beat0 = fingerprint(background(stage, 0));
  const beat1 = fingerprint(background(stage, 1));
  const phrase = fingerprint(background(stage, 16));
  assert(beat0 !== beat1, `stage ${stage} switches cells between downbeat and backbeat`);
  assert(beat0 !== phrase, `stage ${stage} has a distinct phrase-change pose`);

  const reduced0 = fingerprint(background(stage, 0, { reducedMotion: true }));
  const reduced9 = fingerprint(background(stage, 9, { reducedMotion: true }, 91, 999));
  assert(reduced0 === reduced9, `stage ${stage} reduced motion freezes a stable screen-fixed pose`);
}

const idleA = fingerprint(background(1, null, {}, 0, 0));
const idleB = fingerprint(background(1, Number.NaN, {}, 99, 1600));
assert(idleA === idleB, 'an invalid heard beat selects an idle frame independent of time and camera');

for (const stage of [1, 3]) {
  const beat0 = background(stage, 0);
  const beat2 = background(stage, 2);
  const activeBarrel = (ops) => ops.filter((op) => op[0] === 'ellipse' && op[3] === 8 && op[4] === 7).at(-1);
  assert(activeBarrel(beat0)?.[2] !== activeBarrel(beat2)?.[2],
    `stage ${stage} rooftop gorilla lifts and sets down its barrel on the four-beat cycle`);
  assert(activeBarrel(beat0)?.[2] <= (stage === 1 ? 70 : 52),
  `stage ${stage} downbeat pose holds the barrel overhead on its tallest building`);
  const ellipses = beat0.filter((op) => op[0] === 'ellipse').length;
  const curves = beat0.filter((op) => op[0] === 'quadraticCurveTo').length;
  assert(ellipses >= 24 && curves >= 8,
  `stage ${stage} gorilla uses curved anatomy, layered facial planes and articulated hands (${ellipses} ellipses, ${curves} curves)`);
}

for (const stage of [1, 2, 3]) {
  const activeRects = background(stage, 7).filter((op) => op[0] === 'fillRect' && op[1] === ACTIVE);
  assert(activeRects.length > 0 && activeRects.every((op) => op[3] <= 204),
    `stage ${stage} active ghost segments stay clear of the lane`);
}

// The sky drifts on the heard beat and parks under reduced motion. Cloud wisps
// are the one thing painted in the palette's cloud colour, so their x
// positions are a clean probe of the drift.
const cloudWispXs = (ops) => ops
  .filter((op) => op[0] === 'fillRect' && op[1] === 'rgba(54,102,123,0.64)')
  .map((op) => op[2]);
assert(cloudWispXs(background(1, 0)).length > 0
  && fingerprint(cloudWispXs(background(1, 0))) !== fingerprint(cloudWispXs(background(1, 8))),
'clouds drift across the sky in quantized whole-pixel steps on the heard beat');
assert(fingerprint(cloudWispXs(background(1, 8, { reducedMotion: true })))
  === fingerprint(cloudWispXs(background(1, 0, { reducedMotion: true }))),
'reduced motion parks the drifting sky');

// Stage 1's DONKEY KONG tower: an eight-cell ghosted barrel path across two
// girder floors with two lit cells walking it, the big rooftop gorilla
// painter on its roof, and a runner whose face plate lifts 7px on the jump
// beat. Mini barrels are the only 4.5x4 ellipses in the scene; the runner's
// face is the only fillRect in the muzzle colour.
const gwBeat = [0, 13, 15, 1].map((b) => background(1, b));
const miniBarrels = (ops) => ops.filter((op) => op[0] === 'ellipse' && op[3] === 4.5 && op[4] === 4);
assert(miniBarrels(gwBeat[0]).length >= 10,
'stage 1 carries the tower with its full ghosted barrel path');
const faceY = (ops) => ops.find((op) => op[0] === 'fillRect' && op[1] === '#f2c9a0')?.[3];
assert(faceY(gwBeat[0]) - faceY(gwBeat[1]) > 40,
'the tower runner climbs from the bottom girder to the top across the loop');
assert(faceY(gwBeat[2]) == null,
'and after the barrel clips him, the last beat finds the cell empty');
assert(fingerprint(miniBarrels(gwBeat[0])) !== fingerprint(miniBarrels(gwBeat[3])),
'the lit barrel cells advance along the path each beat');
assert(!miniBarrels(background(2, 0)).length,
'stage 2 keeps its plain skyline — the tower belongs to stage 1');

function post(settings, t) {
  const { ctx, ops } = recorder();
  getStylePack('lcd', settings).post(ctx, t);
  return ops;
}
const normalPost = post({}, 0.25);
const reducedPost = post({ reducedFlashing: true }, 0.25);
assert(!normalPost.some((op) => op[0] === 'fillRect' && op[1] === '#808080'),
'the GBC screen treatment preserves hue instead of converting scenery to monochrome');
assert(normalPost.some((op) => op[0] === 'fillRect' && String(op[1]).startsWith('rgba(255,244,180,'))
  && !reducedPost.some((op) => op[0] === 'fillRect' && String(op[1]).startsWith('rgba(255,244,180,')),
'reduced flashing removes the full-panel reflective shimmer');

const stage3CapYs = new Set([161, 111, 175, 101, 157, 93, 151]);
const roofLamps = (settings) => background(3, 1, settings).filter((op) => op[0] === 'fillRect'
  && op[1] === ACTIVE && op[4] === 2 && op[5] === 2 && stage3CapYs.has(op[3]));
assert(roofLamps({}).length > 0 && roofLamps({ reducedFlashing: true }).length === 0,
'reduced flashing keeps detailed roof hardware but suppresses its offbeat lamps');

if (failed) process.exit(1);
console.log('LCD background checks passed.');
