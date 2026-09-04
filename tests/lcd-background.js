// RHYTHM BANKRUPTCY's Game Boy Color city: three fixed limited-palette scenes,
// deterministic musical poses, and accessibility fallbacks. This records Canvas2D operations
// rather than comparing PNGs, so a changed segment is an exact source-level
// signal and the suite remains browserless.
import { installDom } from './dom-stub.js';
installDom();

const { getStylePack, drawLCDPanel, lcdChuteScreenX, LCD_CHUTE_CELLS, LCD_CHUTE_BEATS, LCD_CHUTE_LEAD_BEATS,
  LCD_DEFAULT_ROAD_RISE,
  LCD_ROAD_INK } = await import('../src/engine/stylePacks/index.js');
const { CABINETS } = await import('../src/data/cabinets.js');
const { bank: RHYTHM_SONG } = await import('../src/data/songs/rhythm.js');
const { BEAT_RIBBON_BOTTOM } = await import('../src/game/hud.js');

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
    arcTo(...args) { ops.push(['arcTo', ...args]); },
    closePath() { ops.push(['closePath']); },
    rect(...args) { ops.push(['rect', ...args]); },
    // Recorded, not honoured: nothing here rasterises, so a clip cannot hide
    // an op. What it CAN do is prove the gorilla's tuft is drawn a second time
    // over the barrel — see the spikes check further down.
    clip(...args) { ops.push(['clip', ...args]); },
    stroke() { ops.push(['stroke', style(this.strokeStyle), this.lineWidth]); },
    fill() { ops.push(['fill', style(this.fillStyle)]); },
    drawImage(...args) { ops.push(['drawImage', ...args.slice(1)]); },
    setTransform() {},
    // translate IS recorded: lcdGear draws its body at the origin under a
    // translate, so where a wheel sits in the hole is only knowable from this.
    translate(...args) { ops.push(['translate', ...args]); },
    save() {}, restore() {}, rotate() {}, scale() {},
  };
  return { ctx, ops };
}

const rhythm = CABINETS.find((cab) => cab.id === 'rhythm');
function background(stageIndex, beat, settings = {}, t = 0, camX = 0, extra = null) {
  const { ctx, ops } = recorder();
  getStylePack('lcd', settings).bg(ctx, t, camX, rhythm, 1000,
    { stageIndex, beat, ...(extra || {}) });
  return ops;
}
// A stand-in for Audio.musicAnalysis(). Only the fields the panel reads.
function heard(bias) {
  const spectrum = new Uint8Array(128);
  for (let i = 0; i < spectrum.length; i++) {
    spectrum[i] = Math.max(0, Math.min(255, Math.round(bias * 255 * (1 - i / 160))));
  }
  return { spectrum, level: bias, treble: bias, hit: bias, beatPulse: bias };
}
function ground(obstacles, camX = 0, settings = {}) {
  const { ctx, ops } = recorder();
  getStylePack('lcd', settings).ground(ctx, camX, rhythm, obstacles);
  return ops;
}
const fingerprint = (ops) => JSON.stringify(ops);
// EVERY BARREL ON THE PANEL, found by its body. A barrel is no longer an
// ellipse: it is the chamfered rectangle props.js draws the LANE barrel as —
// a moveTo, seven lineTo and a closePath, snapped to the pixel grid — because
// the thing the gorilla holds, the thing on the chute and the thing that rolls
// at you are one object and now one picture. Centre and half-extents come back
// off the bounding box, so a probe asks where a barrel is and how big it is
// without knowing which corner cut it was drawn with.
const barrelBodies = (ops) => {
  const out = [];
  for (let i = 0; i < ops.length; i++) {
    if (ops[i][0] !== 'moveTo') continue;
    const pts = [];
    let j = i + 1;
    while (ops[j]?.[0] === 'lineTo') pts.push(ops[j++]);
    if (pts.length < 7 || ops[j]?.[0] !== 'closePath') continue;
    const xs = [ops[i][1], ...pts.map((p) => p[1])];
    const ys = [ops[i][2], ...pts.map((p) => p[2])];
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const y0 = Math.min(...ys), y1 = Math.max(...ys);
    // What the body does NEXT is what says whether it is really there: a lit
    // barrel fills in the wood, a ghost cell is stroked and never filled.
    const after = ops[j + 1];
    out.push({
      cx: (x0 + x1) / 2, cy: (y0 + y1) / 2,
      rx: (x1 - x0 + 1) / 2, ry: (y1 - y0 + 1) / 2,
      fill: after?.[0] === 'fill' ? after[1] : null,
    });
  }
  return out;
};
// The gorilla's, at his authored half-extents; the girder cells at theirs.
const bigBarrels = (ops) => barrelBodies(ops).filter((b) => b.rx === 8 && b.ry === 7);
const ACTIVE = 'rgba(211,91,67,0.82)';
// A lit window cell is the coral at full strength (LCD_WINDOW_LIT); an unlit
// one is the uniform ghost (LCD_WINDOW_GHOST). ACTIVE is the rest of the
// panel's lit ink — billboards, lamps, the beacon.
const LIT = '#d35b43';
const WINDOW_OFF = 'rgba(60,63,69,0.14)';
const PRINT = 'rgba(60,63,69,0.72)';
const PRINT_SOFT = 'rgba(80,85,92,0.48)';
const CLOUD_INK = 'rgba(60,63,69,0.55)';
const PANEL_LIT = '#dce49a';
const INK = '#3c3f45';
// Imported, never mirrored: the panel is authored against the camera's own
// groundline and a copy here would keep passing after that line moved.
const { GROUND_Y } = await import('../src/engine/camera.js');
const H = 270;

const idle = [1, 2, 3].map((stage) => fingerprint(background(stage, null)));
assert(new Set(idle).size === 3, 'all three stages have distinct fixed skyline silhouettes');

// Stage 1's floor moved UP: its billboard roofs and the clock case were sitting
// so low that the signs read as street furniture, so the four short buildings
// were raised (54->74, 70->88, 48->66, 62->80, clock 96->104). The range is
// still what this checks — 66 against 116 is the same skyline argument the old
// 48 made — and the other two stages are untouched.
for (const [stage, short, tall] of [[1, 74, 118], [2, 66, 146], [3, 56, 134]]) {
  const stageOps = background(stage, null);
  const heights = stageOps
    .filter((op) => op[0] === 'strokeRect' && op[1] === INK)
    .filter((op) => Math.abs(op[3] + op[5] - (H + 0.5)) < 0.001)
    .map((op) => GROUND_Y - (op[3] - 0.5));
  assert(heights.some((h) => h <= short) && heights.some((h) => h >= tall),
    `stage ${stage} mixes genuinely short buildings with tall towers`);
  // Stroked OUTLINES, of either kind. This used to count strokeRect alone,
  // which quietly meant "outlined boxes" rather than "linework": redrawing the
  // water tower as a capped drum on splayed legs traded one box for six
  // stroked paths — strictly more line on the roof — and dropped stage 1 under
  // the floor. A piece of facade art is no less fine for not being a rectangle.
  const outlines = stageOps.filter((op) => op[0] === 'strokeRect' || op[0] === 'stroke').length;
  assert(outlines >= 14
    && stageOps.filter((op) => op[0] === 'fillRect' && (op[4] === 1 || op[5] === 1)).length >= 45,
  `stage ${stage} uses fine cornices, mullions, facade fittings and rooftop linework`);
  assert(new Set(stageOps.filter((op) => op[0] === 'fillRect' && String(op[1]).startsWith('rgba('))
    .map((op) => op[1])).size >= 7,
  `stage ${stage} retains a small multi-colour GBC scenery palette`);
  // A window is the fill inside a 3x2-cell box on the 3px lattice: 8x5.
  assert(stageOps.filter((op) => op[0] === 'fillRect' && op[1] === WINDOW_OFF
    && op[4] === 8 && op[5] === 5).length >= 12,
  `stage ${stage} windows read as chunky 8x5 colour blocks`);
  assert(stageOps.some((op) => op[0] === 'fillRect' && op[1] === WINDOW_OFF
    && op[3] >= GROUND_Y && op[4] === 8 && op[5] === 5),
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
assert(!pitOps.some((op) => op[1] === 'rgba(60,63,69,0.14)'
  && op[3] === GROUND_Y + LCD_ROAD_INK + 2 && rectOverlapsPit(op)),
'road dashes stop at the pit lips instead of crossing the background window');
assert(pitOps.some((op) => op[0] === 'fillRect' && op[1] === INK
  && op[2] === 100 && op[3] === GROUND_Y && op[4] === LCD_ROAD_INK && op[5] === H - GROUND_Y)
  && pitOps.some((op) => op[0] === 'fillRect' && op[1] === INK
    && op[2] === 156 - LCD_ROAD_INK && op[3] === GROUND_Y && op[4] === LCD_ROAD_INK
    && op[5] === H - GROUND_Y),
'full-depth side walls, one road-line gauge thick, frame the pit');
// ONE gauge, all the way round the corner: the wall, the lip that mitres into
// it, and the surface line they both belong to are the same thickness. A wall
// heavier than the road it is cut into is two gauges of steel at a joint, which
// is the one place the mismatch is unmissable.
assert(pitOps.some((op) => op[0] === 'fillRect' && op[1] === INK
  && op[3] === GROUND_Y && op[4] === LCD_ROAD_INK * 2 && op[5] === LCD_ROAD_INK),
'the mitred lip is the same gauge as the wall and the road line');
// Wheel centres, in the order they were drawn: lcdGear translates to each one
// before laying the body arc, so the translate that precedes a 6.5 body is the
// wheel's position in the hole.
const gearCentres = [];
for (let i = 0; i < pitOps.length; i++) {
  if (pitOps[i][0] === 'arc' && pitOps[i][3] === 6.5) {
    const move = pitOps.slice(0, i).reverse().find((op) => op[0] === 'translate');
    if (move) gearCentres.push(move[1]);
  }
}
assert(pitOps.some((op) => op[0] === 'fill' && op[1] === INK) && gearCentres.length >= 2,
'meshed dark cogwheels stand in the hole where the spike row used to');
// The train runs THROUGH the shaft, it does not jam into it. The old packing
// divided the width by a wheel count, which stretched the row wall to wall and
// buried a tooth tip in the ink at every authored width — no hole could be
// widened clear of it. Both walls are LCD_ROAD_INK thick, so the daylight is
// measured from their inner faces.
const GEAR_R = 9;
assert(gearCentres.every((cx) => cx - GEAR_R > 100 + LCD_ROAD_INK
  && cx + GEAR_R < 156 - LCD_ROAD_INK),
'every cogwheel clears both pit walls instead of being flush against them');
// Meshing is the pitch, and the pitch alone: neighbours a hair under two radii
// apart, the same in every hole whatever its width.
assert(gearCentres.slice(1).every((cx, i) => Math.abs(cx - gearCentres[i] - (GEAR_R * 2 - 2)) < 0.001),
'neighbouring wheels sit at one fixed meshing pitch, not one scaled to the hole');

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
  const activeBarrel = (ops) => bigBarrels(ops).at(-1);
  assert(activeBarrel(beat0)?.cy !== activeBarrel(beat2)?.cy,
    `stage ${stage} rooftop gorilla lifts and sets down its barrel on the four-beat cycle`);
  // High on the panel, and each stage's ceiling is its own building's — a
  // barrel centre is GROUND_Y - h - 50, so these are the two authored heights
  // stated the other way round. Both came up twelve when the beat ribbon left
  // the sky and the crossings rose to follow it: the barrel is one end of a
  // clearance the plane is the other end of, so it had to travel with it.
  assert(activeBarrel(beat0)?.cy <= (stage === 1 ? 58 : 52),
  `stage ${stage} downbeat pose holds the barrel overhead on its tallest building`);
  // 22, not the 24 this once wanted: the four barrels in the frame — three
  // ghost poses and the live one — used to contribute an ellipse each and are
  // rounded rectangles now. What is left is the ape himself, which is what the
  // check was ever about.
  const ellipses = beat0.filter((op) => op[0] === 'ellipse').length;
  const curves = beat0.filter((op) => op[0] === 'quadraticCurveTo').length;
  assert(ellipses >= 22 && curves >= 8,
  `stage ${stage} gorilla uses curved anatomy, layered facial planes and articulated hands (${ellipses} ellipses, ${curves} curves)`);
}

// Peter picked N7 from the nostril-spacing sheet: the production face must be
// exactly that candidate, not merely another close-looking position, and the
// old eye-aligned spacing must stay a genuinely different loser.
const nostrilDefault = fingerprint(background(3, 2, {}, 0, 0, { gorillaExpr: 'smile' }));
const nostrilN7 = fingerprint(background(3, 2, {}, 0, 0,
  { gorillaExpr: 'smile', gorillaNostrils: 'n7' }));
const nostrilOld = fingerprint(background(3, 2, {}, 0, 0,
  { gorillaExpr: 'smile', gorillaNostrils: 'n0' }));
assert(nostrilDefault === nostrilN7, 'the rooftop gorilla ships the chosen N7 nostril spacing');
assert(nostrilDefault !== nostrilOld, 'and no longer wears the old eye-aligned spacing');

// The bound is lcdLightFloor's own definition, not a copy of what it happened
// to evaluate to: a caller outside a run lights no lower than
// GROUND_Y - (the pack's default rise + a window). It was written 204 — the
// value that arithmetic had when the groundline was at 224 and the lane climbed
// 22 — and a literal there passes for the wrong reason the moment either moves.
const LIT_FLOOR = GROUND_Y - (LCD_DEFAULT_ROAD_RISE + 6);
for (const stage of [1, 2, 3]) {
  const activeRects = background(stage, 7).filter((op) => op[0] === 'fillRect' && op[1] === LIT);
  assert(activeRects.length > 0 && activeRects.every((op) => op[3] <= LIT_FLOOR),
    `stage ${stage} active ghost segments stay clear of the lane`);
}

// The sky drifts on the heard beat and parks under reduced motion. A cloud is
// the one stroked path in the cloud band of the sky (y 28..60 on stage 1 — the
// band moved up twelve with the clouds themselves), so the x of every lineTo up
// there is a clean probe of the drift.
const cloudWispXs = (ops) => ops
  .filter((op) => op[0] === 'lineTo' && op[2] >= 28 && op[2] < 60)
  .map((op) => op[1]);
assert(cloudWispXs(background(1, 0)).length > 0
  && fingerprint(cloudWispXs(background(1, 0))) !== fingerprint(cloudWispXs(background(1, 8))),
'clouds drift across the sky in quantized whole-pixel steps on the heard beat');
assert(fingerprint(cloudWispXs(background(1, 8, { reducedMotion: true })))
  === fingerprint(cloudWispXs(background(1, 0, { reducedMotion: true }))),
'reduced motion parks the drifting sky');

// Rhythm 2's clouds are background, not traffic. Each cloud is the panel's
// unique closed ten-point path; all three must finish before the baked skyline
// begins, which also necessarily puts them behind the later viaduct and train.
const cloudStrokeIndexes = (ops) => {
  const out = [];
  for (let i = 0; i < ops.length - 12; i++) {
    if (ops[i][0] !== 'beginPath' || ops[i + 1][0] !== 'moveTo') continue;
    if (!ops.slice(i + 2, i + 11).every((op) => op[0] === 'lineTo')) continue;
    if (ops[i + 11][0] === 'closePath' && ops[i + 12][0] === 'stroke') out.push(i + 12);
  }
  return out;
};
for (const stage of [1, 2, 3]) {
  const ops = background(stage, 12, {}, 0, 0, { progress: 0.3 });
  const clouds = cloudStrokeIndexes(ops);
  assert(clouds.length === 3 && clouds.every((i) => ops[i][1] === CLOUD_INK),
    `stage ${stage} paints every cloud in the shared lighter graphite`);
}
{
  const ops = background(2, 12, {}, 0, 0, { progress: 0.3 });
  const clouds = cloudStrokeIndexes(ops);
  // Headless tests paint the bake straight through, so its first facade wash
  // is the skyline boundary (a browser replaces that work with one drawImage).
  const skyline = ops.findIndex((op) => op[0] === 'fillRect'
    && op[1] === 'rgba(60,63,69,0.07)');
  const rail = ops.findIndex((op) => op[0] === 'fillRect' && op[1] === INK
    && op[2] === 0 && op[4] === 480 && op[5] === 1);
  assert(clouds.length === 3 && clouds.every((i) => ops[i][2] === 1)
    && Math.max(...clouds) < skyline && skyline < rail,
    `stage 2 paints every cloud behind the skyline, viaduct and monorail (${clouds.join(', ')} < ${skyline} < ${rail})`);
}

// ---- and no girder surfaces through the road -------------------------------
//
// The DONKEY KONG tower's girder floors run past the lane band and off the
// bottom of the display: three storeys of steel above the road and a fourth
// under it, there only so a pit in front of the tower exposes girders rather
// than blank wall. That fourth floor is placed by a PITCH from the roof, so it
// only stays hidden while the tower is a height the pitch happens to suit —
// and when the tower grew twelve with the freed sky it stopped being one. The
// girder landed a pixel above GROUND_Y and its high end surfaced through the
// road as a sliver, which Peter saw and nothing here did.
//
// A girder is the panel's only 2px stroke, so the ops name it exactly.
{
  const steel = background(1, 0).filter((op) => op[0] === 'stroke'
    && op[1] === PRINT && op[2] === 2);
  assert(steel.length >= 3, `the tower stands its girder floors up (${steel.length})`);
  // Each stroke is preceded by beginPath/moveTo/lineTo — the two ends of one
  // girder, one of which is 4px higher than the other because the steel is
  // tipped. The HIGHEST end is what would break the surface first.
  const ends = [];
  for (let i = 0; i < background(1, 0).length; i++) {
    const ops = background(1, 0);
    if (ops[i][0] !== 'stroke' || ops[i][1] !== PRINT || ops[i][2] !== 2) continue;
    for (const op of [ops[i - 1], ops[i - 2]]) {
      if (op && (op[0] === 'lineTo' || op[0] === 'moveTo')) ends.push(op[2]);
    }
  }
  // Under the road, or a clear floor above it — never within the stroke's own
  // width of the surface, which is the sliver.
  const near = ends.filter((y) => y > GROUND_Y - 8 && y < GROUND_Y + 2);
  assert(ends.length > 0 && near.length === 0,
    `and none of them breaks the road surface (${near.length} girder ends in `
    + `y ${GROUND_Y - 8}..${GROUND_Y + 2}, of ${ends.length})`);
  // The hidden fourth floor is still down there for a pit to expose.
  assert(ends.some((y) => y >= GROUND_Y + 2),
    'while one floor still runs under the apron, for a pit to open onto');
}

// ---- and the whole sky layer stays under the strip -------------------------
//
// THE SKY LAYER ROSE TWELVE when the beat ribbon moved to the top of the screen
// (BEAT_RIBBON_BOTTOM 40 -> 24): the clouds on all three stages, both crossings,
// and stage 2's monorail with the spire it rules. The crossings already measure
// themselves against the strip further down; the clouds and the rail had no
// check at all, and now that they are only two pixels under it they need one.
//
// This is a CEILING, and deliberately only that — how far the sky should sit
// BELOW the strip is a judgement about the picture, not a fact a test can hold.
// What it pins is the thing that would actually break: a strip that grows, or
// art that creeps up into it, hiding the panel behind the HUD.
{
  const SKY_TOP = BEAT_RIBBON_BOTTOM + 2;
  for (const stage of [1, 2, 3]) {
    // Every cloud's topmost row across a whole four-bar bob cycle. The points
    // are the ten path ops behind the stroke cloudStrokeIndexes finds.
    let top = 999;
    for (let beat = 0; beat < 16; beat++) {
      const ops = background(stage, beat, {}, 0, 0, { progress: 0.3 });
      for (const j of cloudStrokeIndexes(ops)) {
        for (let k = j - 11; k <= j - 2; k++) top = Math.min(top, ops[k][2]);
      }
    }
    assert(top >= SKY_TOP,
      `stage ${stage} keeps every cloud clear of the beat ribbon `
      + `(top row ${top}, strip ends ${BEAT_RIBBON_BOTTOM})`);
  }
  const railOp = background(2, 12, {}, 0, 0, { progress: 0.3 }).find((op) => op[0] === 'fillRect'
    && op[1] === INK && op[2] === 0 && op[4] === 480 && op[5] === 1);
  assert(railOp && railOp[3] >= SKY_TOP,
    `stage 2's monorail runs under the beat ribbon as well `
    + `(girder y ${railOp && railOp[3]}, strip ends ${BEAT_RIBBON_BOTTOM})`);
  // AND STAGE 2'S CLOUDS FILL WHAT IS LEFT EXACTLY. They sit in the strip
  // between the ribbon and the service, which is fifteen rows and a cloud with
  // its bob is fifteen, so both ends are load-bearing: pinning only the top
  // would let the whole layer slide down into the cars. The cars ride the
  // twelve pixels above their own girder, so this is derived from the rail
  // rather than written down a second time.
  let cloudFloor = 0;
  for (let beat = 0; beat < 16; beat++) {
    const ops = background(2, beat, {}, 0, 0, { progress: 0.3 });
    for (const j of cloudStrokeIndexes(ops)) {
      for (let k = j - 11; k <= j - 2; k++) cloudFloor = Math.max(cloudFloor, ops[k][2]);
    }
  }
  const carTop = railOp[3] - 12;
  assert(cloudFloor < carTop,
    `and its clouds stay off the service below them `
    + `(lowest cloud row ${cloudFloor}, cars start ${carTop})`);
}

// Stage 1's DONKEY KONG tower: an eight-cell ghosted barrel path across two
// girder floors with two lit cells walking it, the big rooftop gorilla
// painter on its roof, and a runner whose face plate lifts 11px on the jump
// beat. A mini barrel is the gorilla's own barrel at 5x4 half-extents — the
// one ellipse of that size in the scene (the octagon it briefly was is gone:
// it was not the barrel he is holding, see lcdMiniBarrel) — so it is counted
// here by its body, which is also the only thing a ghosted cell draws. The
// runner's face is the only fillRect in the muzzle colour.
// Beat 1, not beat 0, for the bottom-girder pose: the loop's first beat has him
// on the ladder BELOW that girder, coming up out of the street, and a climbing
// figure is drawn from behind with no face at all.
const gwBeat = [1, 13, 15, 2].map((b) => background(1, b));
const miniBarrels = (ops) => barrelBodies(ops).filter((b) => b.rx === 5 && b.ry === 4);
assert(miniBarrels(gwBeat[0]).length >= 10,
'stage 1 carries the tower with its full ghosted barrel path');
// His FACE PLATE, specifically: the 6x4 skin block. He grew hands in the same
// colour when the bake-off settled him, and a 1x1 hand is drawn before the
// face, so the old "first fillRect in the muzzle colour" now finds a knuckle.
const faceY = (ops) => ops.find((op) => op[0] === 'fillRect' && op[1] === '#f2c9a0'
  && op[4] === 6 && op[5] === 4)?.[3];
assert(faceY(gwBeat[0]) - faceY(gwBeat[1]) > 40,
'the tower runner climbs from the bottom girder to the top across the loop');
assert(faceY(gwBeat[2]) == null,
'and after the barrel clips him, the last beat finds the cell empty');
// AND EVERY RUN OF THE TOWER STARTS ON THE LADDER. He used to be simply there
// on the bottom girder on the downbeat, which reads as a figure being redrawn
// rather than as the same man having walked back round. His cap is the 7px
// purple block, in both the climbing pose and the running one.
const capY = (ops) => ops.find((op) => op[0] === 'fillRect' && op[1] === '#7b4bd0'
  && op[4] === 7)?.[3];
for (const start of [0, 16]) {
  assert(capY(background(1, start)) > capY(background(1, start + 1)) + 6,
    `the runner starts his loop climbing out of the street rather than standing `
    + `on the bottom girder (beat ${start} cap at y ${capY(background(1, start))}, `
    + `beat ${start + 1} at ${capY(background(1, start + 1))})`);
}
assert(fingerprint(miniBarrels(gwBeat[0])) !== fingerprint(miniBarrels(gwBeat[3])),
'the lit barrel cells advance along the path each beat');
assert(!miniBarrels(background(2, 0)).length,
'stage 2 keeps its plain skyline — the tower belongs to stage 1');

// ---- the reactive layer ---------------------------------------------------
// The panel HEARS the song: the same beat with music playing is a different
// picture from the same beat in silence, and a louder bar is a different one
// again. Everything else in this file exercises the silent path, which is
// what the hub, the gallery and every other assertion here still get.
for (const stage of [1, 2, 3]) {
  const silent = fingerprint(background(stage, 4));
  const quiet = fingerprint(background(stage, 4, {}, 0, 0, { audio: heard(0.2) }));
  const loud = fingerprint(background(stage, 4, {}, 0, 0, { audio: heard(0.9) }));
  assert(silent !== quiet && quiet !== loud,
    `stage ${stage} lights its city off the spectrum it is hearing`);
  // A SILENT SPECTRUM IS NOT A QUIET ONE. Offline renders and any device
  // without an AnalyserNode publish 128 zeroes while level/bass still report;
  // a meter that believed them switched every window in the city off.
  assert(fingerprint(background(stage, 4, {}, 0, 0, { audio: heard(0) })) === silent,
    `stage ${stage} treats an analyser publishing zeroes as no analyser at all`);
  // The authored per-stage window cycle must survive the meter: the level
  // raises the floor, it does not take the choreography over.
  const stageCells = (st) => background(st, 4, {}, 0, 0, { audio: heard(0.5) })
    .filter((op) => op[0] === 'fillRect' && op[1] === ACTIVE).length;
  assert(stageCells(1) !== stageCells(3),
    `stage ${stage}: the three cities still light differently with music playing`);
  // The accessibility contract for the whole reactive layer, in one line: a
  // frozen panel may not be animated by the music behind the player's back.
  const frozenQuiet = fingerprint(background(stage, 4, { reducedMotion: true }, 0, 0, { audio: heard(0.2) }));
  const frozenLoud = fingerprint(background(stage, 9, { reducedMotion: true }, 91, 999, { audio: heard(0.9) }));
  assert(frozenQuiet === frozenLoud, `stage ${stage} reduced motion is deaf as well as still`);
  // THE SKY METER IS THE JUKEBOX'S, NOT THE GAME'S. Clipped behind the
  // skyline it never reads as a bar in a run — only as banding in the band
  // the plane and the clouds live in — so a stage draws none of it. The
  // preset, where the sky is the whole show, gets it with bright tips.
  const gameBars = background(stage, 4, {}, 0, 0, { audio: heard(0.9) })
    .filter((op) => op[0] === 'fillRect' && op[1] === 'rgba(80,85,92,0.10)');
  assert(gameBars.length === 0, `stage ${stage} keeps the lane's sky clear of the analyser`);
}

// ---- the run gets later ---------------------------------------------------
{
  const phases = [0, 0.3, 0.55, 0.9].map((p) => fingerprint(background(2, 4, {}, 0, 0, { progress: p })));
  assert(new Set(phases).size === 4, 'the stage passes through four distinct panels as it runs');
  assert(phases[0] === fingerprint(background(2, 4)),
    'and a scene with no progress is the panel the stage opens on');
  // Its roofline carries two signs: the counting board on the roof the hero runs
  // under, and the maze-game attract screen out at the far edge. Counted as the
  // BOARDS themselves — the wide dark panels above the roofline — rather than by
  // any one sign's ink, which is what this used to do: it looked for the gold
  // cell on the share price's trace, and that price has been retired in favour
  // of the on-beat count (lcdComboBoard).
  const boards = (ops) => ops.filter((op) => op[0] === 'fillRect' && op[1] === PRINT
    && op[4] >= 28 && op[5] >= 20).length;
  assert(boards(background(2, 4, {}, 0, 0, { progress: 0 })) === 2,
    'stage 2 opens with both its signs up');
}

// ---- stage 2's working city ----------------------------------------------
{
  const beam = (stage, beat) => background(stage, beat).filter((op) => op[0] === 'fillRect'
    && String(op[1]).startsWith('rgba(232,238,176,'));
  assert(beam(2, 0).length > 0 && beam(1, 0).length === 0 && beam(3, 0).length === 0,
    'the searchlight sweeps stage 2 and nowhere else');
  assert(fingerprint(beam(2, 0)) !== fingerprint(beam(2, 1)),
    'and it steps to a new angle on every heard beat');
  // TWO LAMPS, split apart by the falloff: every beam cell is dimmer than the
  // one before it, so a cell BRIGHTER than its predecessor is the next lamp's
  // first. Beam cells are the 4-tall ones — the panel paints one other thing
  // in this ink and it is 2 tall.
  const beamRuns = (beat) => {
    const runs = [];
    for (const op of beam(2, beat).filter((o) => o[5] === 4)) {
      const a = Number(String(op[1]).match(/,([\d.]+)\)$/)[1]);
      if (!runs.length || a > runs.at(-1).at(-1).a) runs.push([]);
      runs.at(-1).push({ x: op[2], y: op[3], a });
    }
    return runs;
  };
  for (let b = 0; b < 8; b++) assert(beamRuns(b).length === 2, `two lamps work the panel on beat ${b}`);
  // Each leans toward the MIDDLE, which is where the sky is: the tall towers
  // stand at the ends of this skyline, and a lamp raking outward spends its
  // whole throw on a facade.
  for (let b = 0; b < 8; b++) {
    const [left, right] = beamRuns(b);
    assert(left.at(-1).x > left[0].x && right.at(-1).x < right[0].x,
      `and the pair open inward on beat ${b}`);
  }
  // AND THEY THROW PAST THE NEXT ROOF. The old beam died at 86 from the lens,
  // about the width of a building; a lamp whose light stops at its neighbour is
  // a lamp lighting its neighbour. Measured on the flattest angle of the sweep,
  // where the throw is spent horizontally and nothing clips it.
  const flattest = Math.max(...[0, 1, 2, 3, 4, 5, 6, 7].map((b) => Math.max(
    ...beamRuns(b).map((run) => Math.abs(run.at(-1).x - run[0].x)))));
  assert(flattest > 100, `the beam throws well past the roof next door (${flattest})`);
  const train = (beat, progress) => background(2, beat, {}, 0, 0, { progress })
    .filter((op) => op[0] === 'fillRect' && op[1] === 'rgba(70,121,137,0.5)');
  // THE TIMETABLE, and it is the whole of the service: six bars right to left,
  // two bars of empty rail, six bars left to right, two more. No stop.
  assert(train(4, 0).length > 0, 'the train runs from the opening phase');
  assert(fingerprint(train(12, 0.3)) !== fingerprint(train(13, 0.3)),
    'and it crosses a car-length per heard beat');
  // The left edge of the leftmost car, which walks one way then the other.
  const left = (beat) => Math.min(...train(beat, 0.3).map((op) => op[2]));
  assert(left(4) > left(8) && left(8) > left(12),
    `the outbound crossing runs right to left (${left(4)}, ${left(8)}, ${left(12)})`);
  assert(train(26, 0.3).length === 0 && train(30, 0.3).length === 0,
    'then the rail stands empty for two bars');
  assert(left(36) < left(40) && left(40) < left(44),
    `and it comes back the other way (${left(36)}, ${left(40)}, ${left(44)})`);
  assert(train(58, 0.3).length === 0 && train(62, 0.3).length === 0,
    'and waits again before the lap comes round');
  assert(fingerprint(train(4, 0.3)) === fingerprint(train(68, 0.3)),
    'the whole timetable is sixteen bars');
  // NO TRAIN EVER APPEARS IN OPEN PANEL. On the first beat of each crossing
  // that anything is visible at all, the train has to still be touching the
  // edge it came in from — within one car-length of it, since that is how far
  // it travels in a beat. This is the check Peter asked for ("never start a
  // monorail mid screen; must come in fully from right or left"), and it is
  // swept across the whole sixteen-bar lap rather than spot-checked, because
  // the two ways it can break — a leg starting late or a car count outgrowing
  // the crossing — both show up as one bad beat somewhere in the loop.
  const PANEL = 480, CAR = 26, BODY = 22;
  const carXs = (beat) => train(((beat % 64) + 64) % 64, 0.3).map((op) => op[2]);
  const popped = [];
  for (let beat = 0; beat < 64; beat++) {
    const now = carXs(beat);
    if (!now.length || carXs(beat + 63).length) continue;   // not a first beat
    const l = Math.min(...now), r = Math.max(...now) + BODY;
    if (l < PANEL - CAR && r > CAR) popped.push(`beat ${beat}: ${l}..${r}`);
  }
  assert(popped.length === 0,
    `every crossing enters from an edge, never mid-panel (${popped.join('; ') || 'clean'})`);
  // And it leaves the same way: the last visible beat of each crossing is also
  // hard against an edge, so the service never blinks out over the city.
  const vanished = [];
  for (let beat = 0; beat < 64; beat++) {
    const now = carXs(beat);
    if (!now.length || carXs(beat + 1).length) continue;    // not a last beat
    const l = Math.min(...now), r = Math.max(...now) + BODY;
    if (l < PANEL - CAR && r > CAR) vanished.push(`beat ${beat}: ${l}..${r}`);
  }
  assert(vanished.length === 0,
    `and leaves past an edge, never mid-panel (${vanished.join('; ') || 'clean'})`);
  // FOUR CARS. The count is the scene's, and the crossing's length is solved
  // from it — a fifth car must lengthen the crossing, not overrun it.
  assert(new Set(carXs(12)).size === 4, 'the service runs four cars');

  // THE LAMPS SWAP ENDS WITH THE DIRECTION, so the return is a train running
  // forwards rather than the same train running backwards. The headlamp is a
  // 2x3 lit cell, and it leads: left of the train going left, right coming back.
  const LAMP = 'rgba(211,91,67,0.82)';
  const lamps = (beat) => background(2, beat, {}, 0, 0, { progress: 0.3 })
    .filter((op) => op[0] === 'fillRect' && op[1] === LAMP && op[4] === 2 && op[5] === 3)
    .map((op) => op[2]).sort((a, b) => a - b);
  const cars = (beat) => train(beat, 0.3).map((op) => op[2]).sort((a, b) => a - b);
  assert(lamps(8)[0] < cars(8)[0], 'the headlamp leads on the way out');
  assert(lamps(40).at(-1) > cars(40).at(-1), 'and leads from the other end coming back');
  // THE RAIL IS MASONRY AND THE TRAIN IS TRAFFIC. The viaduct's girder is a
  // full-width soft bar; it stands in the opening phase, before any service
  // has run, and it is still standing on the beats between services.
  const girder = (beat, progress) => background(2, beat, {}, 0, 0, { progress })
    .filter((op) => op[0] === 'fillRect' && op[1] === INK
      && op[2] === 0 && op[4] === 480 && op[5] === 1);
  assert(girder(12, 0).length === 1 && girder(40, 0.3).length === 1,
    'the viaduct stands from the opening phase, with or without a train on it');
  // Beat 28: two bars of empty rail between the two crossings.
  assert(train(28, 0.3).length === 0 && girder(28, 0.3).length === 1,
    'and the rail is still there on the beats the service is not');
  // THE ROOF CARRIES ONE THING. Stage 2 hangs an equalizer bank on every
  // building a billboard is not already standing on, and every crown this
  // skyline draws is centred and short enough to land inside the bank's
  // cabinet — so the bank and the building's own parapet, stack, box or spire
  // pediment were being drawn on top of each other. Every one of those crowns
  // is a stroked box seated 5.5 above the roofline, or a fillRect finial
  // standing on it; none of them may appear on this panel.
  // Paired to their OWN building — every roof here is 5.5 above some other
  // building's facade line, so an unpaired scan matches three of them.
  const stage2Buildings = [[16, 42, 56], [74, 36, 128], [126, 48, 72], [190, 38, 148],
    [244, 52, 50], [312, 40, 138], [368, 46, 66], [430, 36, 142]];
  const stage2Ops = background(2, 4, {}, 0, 0, { progress: 0.3 });
  const onRoof = (pred) => stage2Buildings.filter(([bx, bw, bh]) => stage2Ops.some(
    ([kind, , ox, oy, ow, oh]) => ox > bx && ox < bx + bw && pred(kind, oy, ow, oh, GROUND_Y - bh)));
  const crowns = onRoof((kind, oy, ow, oh, roof) => kind === 'strokeRect'
    && oy === roof - 5.5 && oh === 5);
  assert(crowns.length === 0,
    `no stage 2 building draws its own crown under the meter (${crowns.length} found)`);
  const finials = onRoof((kind, oy, ow, oh, roof) => kind === 'fillRect'
    && ((ow === 1 && oh === 7) || (ow === 2 && oh === 4)) && oy >= roof - 24 && oy < roof);
  assert(finials.length === 0, `nor its finial mast (${finials.length} found)`);
  // And the meters themselves are still on those roofs.
  const meterCells = background(2, 4, {}, 0, 0, { progress: 0.3 })
    .filter(([kind, fill, , , fw, fh]) => kind === 'fillRect' && fw === 3 && fh === 3
      && (fill === 'rgba(211,91,67,0.82)' || fill === 'rgba(80,85,92,0.24)'));
  // Four banks now, not six: the station's roof is its deck and the washer's
  // roof is bare (bareRoofs) — the roof carries one thing.
  assert(meterCells.length >= 6 * 2 * 4, `the equalizer banks still stand (${meterCells.length} cells)`);

  // THE RAIL IS ONE LINE AND NOTHING ELSE. It carried a deck box and piers;
  // a pier that stops in mid-air bears on nothing, and piers carried to the
  // street would cross the whole skyline. One 1px ink line, full width, and
  // no second mark anywhere under it.
  const railY = girder(12, 0.3)[0][3];
  const underRail = background(2, 12, {}, 0, 0, { progress: 0.3 })
    .filter((op) => op[0] === 'fillRect' && op[1] === INK
      && op[3] > railY && op[3] < railY + 24 && op[5] > 2 && op[4] <= 2);
  assert(underRail.length === 0,
    `nothing hangs off the rail (${underRail.length} marks under it)`);
  assert(girder(12, 0.3).length === 1, 'and it is a single line, not a deck');
}

// ---- the jukebox panel ----------------------------------------------------
// drawLCDPanel is the whole city for callers outside a run — the CLOCK-IN CITY
// preset. Same scene, same data, plus the sky meter the game declines.
{
  const panel = (extra, settings = {}) => {
    const { ctx, ops } = recorder();
    drawLCDPanel(ctx, { stageIndex: 2, beat: 4, ...(extra || {}) }, settings);
    return ops;
  };
  const bars = panel({ audio: heard(0.9) })
    .filter((op) => op[0] === 'fillRect' && op[1] === 'rgba(80,85,92,0.10)');
  assert(bars.length > 0 && bars.every((op) => op[3] >= 40 && op[3] < GROUND_Y),
    'the jukebox panel hangs its analyser between the ribbon band and the lane');
  // NO BRIGHT TIP on a bar. The meter is clipped by the skyline, so a bar's
  // visible top cell is where a roof ends and not where the band peaked —
  // lighting it made sixteen confident readings of the buildings. The columns
  // carry the layer on their own now, and nothing coral is allowed in the sky.
  const tips = panel({ audio: heard(0.9) })
    .filter((op) => op[0] === 'fillRect' && op[1] === ACTIVE && op[5] === 2 && op[4] > 20);
  assert(tips.length === 0, `and wears no bright tip, which would read the roofline (${tips.length})`);
  assert(panel({ audio: heard(0.9) }, { skyMeter: false })
    .filter((op) => op[0] === 'fillRect' && op[1] === 'rgba(80,85,92,0.10)').length === 0,
  'a caller may still ask for the panel without it');
}

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

// GROUND_Y - h - 5 for each uncrowned stage-3 roof (heights 65, 53, 125, 134,
// 71, 77 — the billboard's and the gorilla's roofs carry no cap).
const stage3CapYs = new Set([162, 174, 102, 93, 156, 150]);
const roofLamps = (settings) => background(3, 1, settings).filter((op) => op[0] === 'fillRect'
  && op[1] === ACTIVE && op[4] === 2 && op[5] === 2 && stage3CapYs.has(op[3]));
assert(roofLamps({}).length > 0 && roofLamps({ reducedFlashing: true }).length === 0,
'reduced flashing keeps detailed roof hardware but suppresses its offbeat lamps');

// ---- the flight lane threads the gap --------------------------------------
//
// The plane used to cross at ONE altitude, over the barrel the gorilla holds
// above his head, and that barrel was the only reason the altitude was scene
// data at all. The beat ribbon ended that arrangement: the strip is twice the
// size it was, its band now runs down to BEAT_RIBBON_BOTTOM, and the slot left
// between the strip and the gorilla's SKULL is barely wider than the plane —
// with the raised barrel sitting inside it. So the lane is a CLIMB, and what it
// has to clear is the head. Crossing the barrel on the one pose where it is up
// is the price of that, and it is deliberate rather than an oversight.
//
// The plane is found by its FUSELAGE WINDOWS: row 3 of LCD_PLANE is the only
// place on this panel that puts three lit 2px cells in a row four pixels apart.
// Picking it out by altitude instead is what the old version of this check did,
// and a climbing plane walks straight out of any altitude window you choose.
{
  // Body geometry, from LCD_PLANE: 11 cells across and 6 down on a 2px grid,
  // with the lit windows on row 3 starting at column 3.
  const PLANE_W = 22, PLANE_H = 12, WIN_DX = 6, WIN_DY = 6;
  // ABOVE THE ROOFLINE ONLY. The plane's cabin windows are 2px lit cells on a
  // 4px pitch, and so — since the counting board started printing its digits at
  // 2px in the same lit cream — are parts of a 4 or an 8 on the roof the hero
  // runs under. The two are nowhere near each other on the panel, so the cheap
  // separation is the right one: nothing below the tallest roof is a plane.
  // ...AND THE BOARD IS CUT OUT BY ITS OWN PANEL. SKYLINE_TOP alone hid the
  // digits while the counting roof stood low; the roof has since climbed, and a
  // board up in the sky band would be read here as an aircraft parked over the
  // second building for the whole run. The board says where it is — one 43x32
  // panel of print — so its cells are excluded wherever it stands. The plane
  // never enters that box (it flies well above the board's top edge), so this
  // can only ever remove the sign, not the aircraft.
  const BOARD_W = 43, BOARD_H = 32;
  const boardAt = (scene) => {
    const op = background(1, 0, {}, 0, 0, scene).find((o) => o[0] === 'fillRect'
      && o[1] === PRINT && o[4] === BOARD_W && o[5] === BOARD_H);
    return op ? { x: op[2], y: op[3] } : null;
  };
  const SKYLINE_TOP = 100;
  const plane = (beat, scene = null) => {
    const rows = new Map();
    const box = boardAt(scene);
    const onBoard = (x, y) => box && x >= box.x && x < box.x + BOARD_W
      && y >= box.y && y < box.y + BOARD_H;
    for (const op of background(1, beat, {}, 0, 0, scene)) {
      if (op[0] !== 'fillRect' || op[1] !== PANEL_LIT || op[4] !== 2 || op[5] !== 2) continue;
      if (op[3] >= SKYLINE_TOP || onBoard(op[2], op[3])) continue;
      const xs = rows.get(op[3]) || [];
      xs.push(op[2]);
      rows.set(op[3], xs);
    }
    for (const [y, xs] of rows) {
      if (xs.length < 3) continue;
      xs.sort((a, b) => a - b);
      if (xs[1] - xs[0] !== 4 || xs[2] - xs[1] !== 4) continue;
      return { x: xs[0] - WIN_DX, y: y - WIN_DY };
    }
    return null;
  };
  // The gorilla's skull is the one 12x11 ellipse on the panel. Taken from the
  // ops rather than from the tower's numbers, so raising him — or standing him
  // on a taller roof — moves what the plane is required to clear.
  const head = background(1, 0).find((op) => op[0] === 'ellipse'
    && op[3] === 12 && op[4] === 11);
  assert(!!head, 'the gorilla puts a head on the skyline');
  const headTop = head[2] - head[4], headL = head[1] - head[3], headR = head[1] + head[3];

  let flown = 0, entry = null, exit = null, ceiling = 999, overHead = 0, throughHead = 0;
  for (let beat = 0; beat < 44; beat++) {
    const p = plane(beat);
    if (!p) continue;
    flown++;
    if (entry === null) entry = p.y;
    exit = p.y;
    ceiling = Math.min(ceiling, p.y);
    if (p.x + PLANE_W > headL && p.x < headR) {
      overHead++;
      if (p.y + PLANE_H > headTop) throughHead++;
    }
  }
  assert(flown > 20, `stage 1 flies a plane across its sky (${flown} beats of it)`);
  assert(entry > exit,
    `the plane climbs as it crosses (enters at y ${entry}, levels at y ${exit})`);
  // BEAT_RIBBON_BOTTOM. The sky above the lane runs out there, so the climb
  // cannot buy its clearance over the gorilla by going any higher.
  assert(ceiling >= BEAT_RIBBON_BOTTOM,
    `and never rises into the beat ribbon's band (tops out at y ${ceiling}, band ends ${BEAT_RIBBON_BOTTOM})`);
  assert(overHead > 0 && throughHead === 0,
    `and passes over the gorilla's head rather than through it `
    + `(${overHead} beats above him, ${throughHead} inside)`);

  // AND THE CROSSING THAT MISSES CLEARS HIM BY MORE. The strike is the plane
  // inside the barrel, so that pass flies the lane the gap allows — but a pass
  // with nothing to take flew the same one, and eight pixels over the skull
  // reads as a near miss rather than as a miss. The thinner ribbon's pixels go
  // there. Crossing 0 strikes; crossing 1 (a beat late, sixty-four beats on)
  // is one of the two that do not.
  const overGorilla = (base) => {
    let clear = 999, ceil = 999;
    for (let c = 0; c < 44; c++) {
      const p = plane(base + c);
      if (!p) continue;
      ceil = Math.min(ceil, p.y);
      if (p.x + PLANE_W > headL && p.x < headR) clear = Math.min(clear, headTop - (p.y + PLANE_H));
    }
    return { clear, ceil };
  };
  const hit = overGorilla(0), missed = overGorilla(64);
  assert(missed.clear > hit.clear,
    `the crossing that misses flies over him with room to spare `
    + `(${missed.clear}px clear against the striking pass's ${hit.clear})`);
  assert(missed.ceil >= BEAT_RIBBON_BOTTOM,
    `and buys that height from the sky rather than from the beat ribbon `
    + `(tops out at y ${missed.ceil}, band ends ${BEAT_RIBBON_BOTTOM})`);
}

// ---- and on stage 3 it simply misses him -----------------------------------
//
// Stage 1's crossing has a barrel to take, so its lane is allowed to end inside
// the gorilla. Stage 3's has nothing to take, and for a long time it flew the
// same low lane anyway: the aircraft went behind his skull for four beats,
// vanished whole for one, and came back out through his raised arm. He is drawn
// after the plane and he is opaque, so nothing about that was a glitch — it was
// simply a picture of a collision with a tidy edge.
//
// So this panel's crossing has to clear him OUTRIGHT, and there are two things
// to clear: the skull, and the barrel he raises above it once a bar. The second
// one is why his building came down as well as the lane going up — the sky above
// the lane runs out at BEAT_RIBBON_BOTTOM, so the barrel could only be missed by
// lowering it. Both are checked against the ops rather than the scene's numbers,
// so raising him again fails here rather than in the panel.
{
  const PLANE_W = 22, PLANE_H = 12, WIN_DX = 6, WIN_DY = 6;
  const ops = (beat) => background(3, beat);
  // Sky only — see the note on the stage 1 locator: the counting board prints
  // its digits at 2px in the same lit cream the plane's windows use.
  const SKYLINE_TOP = 100;
  // ...AND THE BOARD IS CUT OUT BY ITS OWN PANEL, not by a height. The counting
  // roof stood low enough that SKYLINE_TOP alone hid its digits; its building
  // has since grown, and a board that climbs into the sky band would be read
  // here as an aircraft parked over the second roof for the whole run. The
  // board announces where it is — one 43x32 panel of print — so the cells
  // inside it are excluded wherever it stands.
  const BOARD_W = 43, BOARD_H = 32;
  const boardBox = (() => {
    const op = ops(0).find((o) => o[0] === 'fillRect' && o[1] === PRINT
      && o[4] === BOARD_W && o[5] === BOARD_H);
    return op ? { x: op[2], y: op[3] } : null;
  })();
  const onBoard = (x, y) => boardBox && x >= boardBox.x && x < boardBox.x + BOARD_W
    && y >= boardBox.y && y < boardBox.y + BOARD_H;
  const plane = (beat) => {
    const rows = new Map();
    for (const op of ops(beat)) {
      if (op[0] !== 'fillRect' || op[1] !== PANEL_LIT || op[4] !== 2 || op[5] !== 2) continue;
      if (op[3] >= SKYLINE_TOP || onBoard(op[2], op[3])) continue;
      const xs = rows.get(op[3]) || [];
      xs.push(op[2]);
      rows.set(op[3], xs);
    }
    for (const [y, xs] of rows) {
      if (xs.length < 3) continue;
      xs.sort((a, b) => a - b);
      if (xs[1] - xs[0] !== 4 || xs[2] - xs[1] !== 4) continue;
      return { x: xs[0] - WIN_DX, y: y - WIN_DY };
    }
    return null;
  };
  // The towed banner is the rig's real underside — its plate is the one 11px
  // tall lit fill on the panel — and it is what the raised barrel was poking
  // through, two letters at a time, long after the aircraft itself was clear.
  const banner = (beat) => ops(beat).find((op) => op[0] === 'fillRect'
    && op[1] === PANEL_LIT && op[5] === 11);

  const head = ops(0).find((op) => op[0] === 'ellipse' && op[3] === 12 && op[4] === 11);
  assert(!!head, 'stage 3 puts a gorilla on the skyline too');
  const headTop = head[2] - head[4], headL = head[1] - head[3], headR = head[1] + head[3];
  // The barrel he holds up rides the same rig as the head, 19 above its centre
  // with a 7px half-height, so it is derived rather than measured: move him and
  // the number this test enforces moves with him.
  const barrelTop = head[2] - 19 - 7, barrelL = head[1] - 8, barrelR = head[1] + 8;

  let flown = 0, ceiling = 999, overHead = 0, clear = 999, overBarrel = 0, barrelGap = 999;
  // Four crossings, so every entry of the dodge rotation flies the lane at least
  // once and every tow line in the rotation gets towed past him.
  for (let beat = 0; beat < 256; beat++) {
    const p = plane(beat);
    if (!p) continue;
    flown++;
    ceiling = Math.min(ceiling, p.y);
    if (p.x + PLANE_W > headL && p.x < headR) {
      overHead++;
      clear = Math.min(clear, headTop - (p.y + PLANE_H));
    }
    // Only the beat he actually has it up, and only when the rig is over it.
    if (beat % 4 !== 0) continue;
    const box = banner(beat);
    const rigL = box ? box[2] : p.x, rigR = p.x + PLANE_W;
    const rigBottom = Math.max(p.y + PLANE_H, box ? box[3] + box[5] : 0);
    if (rigR > barrelL && rigL < barrelR) {
      overBarrel++;
      barrelGap = Math.min(barrelGap, barrelTop - rigBottom);
    }
  }
  assert(flown > 80, `stage 3 flies its own plane across the sky (${flown} beats of it)`);
  assert(ceiling >= BEAT_RIBBON_BOTTOM,
    `and never rises into the beat ribbon's band (tops out at y ${ceiling}, band ends ${BEAT_RIBBON_BOTTOM})`);
  assert(overHead > 0 && clear >= PLANE_H,
    `and passes over the gorilla with a plane's worth of daylight, not behind him `
    + `(${overHead} beats over him, ${clear}px clear)`);
  assert(overBarrel > 0 && barrelGap > 0,
    `and the rig it tows clears the barrel he raises into that lane `
    + `(${overBarrel} raised beats under the rig, closest ${barrelGap}px)`);
}

// ---- and takes the barrel with it -----------------------------------------
//
// The plane cannot miss the barrel, so it destroys it. What makes that a gag
// rather than a glitch is that it is the SAME BEAT every cycle: both bodies
// step off authored numbers, so the meeting is solved once and lands on a
// downbeat, which is the only kind of moment this panel stages anything on.
// The checks are about that regularity — once per crossing, on the one, barrel
// gone for two beats, and a fresh one in his hands after.
{
  // Four ghosts and, on a normal beat, the live one over the top of them.
  const barrels = (beat) => bigBarrels(background(1, beat)).length;
  // The one cell of the burst nothing else on the panel paints: the gold fleck
  // the barrel wore, thrown clear of its own wreck.
  const struck = (beat) => background(1, beat)
    .some((op) => op[0] === 'fillRect' && op[1] === '#f6d33c' && op[3] < 90);

  const hits = [];
  for (let beat = 0; beat < 44; beat++) if (struck(beat)) hits.push(beat);
  assert(hits.length === 1, `the plane takes the barrel out once per crossing (${hits.length} times)`);
  const hit = hits[0];
  assert(hit % 4 === 0, `and does it on a downbeat (landed on beat ${hit % 4} of the bar)`);
  // Compared against the same pose a bar earlier and a bar later, so this is
  // "one barrel fewer than this pose normally holds" and not a raw count that
  // moves whenever the gorilla is redrawn.
  assert(barrels(hit) === barrels(hit - 4) - 1,
    `the barrel is gone on the beat it is struck (${barrels(hit)} vs ${barrels(hit - 4)})`);
  assert(barrels(hit + 1) === barrels(hit - 3) - 1,
    `and still gone on the beat after (${barrels(hit + 1)} vs ${barrels(hit - 3)})`);
  assert(barrels(hit + 2) === barrels(hit - 2),
    `and he is holding one again the beat after that (${barrels(hit + 2)} vs ${barrels(hit - 2)})`);

  // AND THE THROW HE NEVER MAKES. The barrel the plane took was the one about
  // to go down the tower, so the girder chain is one cell short for the whole
  // twelve-beat descent that throw would have made — and full again on the
  // thirteenth, when the barrel he picked up two beats after the wreck arrives
  // on schedule. Without this he stands empty-handed on the roof while the
  // barrel he is not holding rolls down the face underneath him.
  //
  // Counted off the plank seam only a LIT mini-barrel paints (the ghosts are
  // stroke-only), and each beat compared against the same beat of the bar four
  // bars earlier — the chain repeats every four beats, so that is the same
  // picture with nothing destroyed.
  // Counted as girder-sized bodies that are FILLED in the wood. It used to be
  // counted off a 2x1 highlight, which stopped existing when the barrel took
  // the lane barrel's marks; the fill is the better probe anyway, because it
  // is the thing that separates a cell that is there from a ghost of one.
  const towerBarrels = (beat) => barrelBodies(background(1, beat))
    .filter((b) => b.rx === 5 && b.fill === '#a9743a').length;
  let shortBeats = 0;
  for (let d = 0; d < 16; d++) {
    if (towerBarrels(hit + d) === towerBarrels(hit + d - 16) - 1) shortBeats++;
  }
  assert(shortBeats === 16,
    `the destroyed barrel never rides the tower (${shortBeats} of 16 beats one cell short)`);
  assert(towerBarrels(hit + 16) === towerBarrels(hit - 4),
    `and the chain is full again on the seventeenth `
    + `(${towerBarrels(hit + 16)} vs ${towerBarrels(hit - 4)})`);

  // HIS FACE, for the same two beats the wreck is up. The read that won the
  // bake-off keeps the face nearly still and says it AROUND the head instead:
  // the smile shrinks to a small O, eight shock ticks radiate off him on the
  // 2px grid, and a sweat bead appears at his temple. Checked on the O and on
  // the ticks — the ticks are the whole thesis of that read, and a face that
  // quietened without them would pass an O-only check while saying nothing —
  // and checked to STOP as well as start: the toy does not sulk.
  // 1.9 tall, not the 2.4 it was: the mouth's bottom reached roof-20.6 and the
  // muzzle's floor is roof-20.5, so solid ink was merging into the jaw rim and
  // the shape read as a blob hanging off his chin. It keeps its width and its
  // top and gives up a pixel at the bottom — see LCD_GORILLA_SHOCKS.
  const openMouth = (beat) => background(1, beat)
    .some((op) => op[0] === 'ellipse' && op[3] === 2 && op[4] === 1.9);
  const ticks = (beat) => background(1, beat)
    .filter((op) => op[0] === 'fillRect' && op[1] === PRINT
      && op[4] === 2 && op[5] === 2).length;
  assert(openMouth(hit) && openMouth(hit + 1),
    'the gorilla is startled for both beats of the wreck');
  assert(ticks(hit) === ticks(hit - 4) + 8 && ticks(hit + 1) === ticks(hit - 3) + 8,
    `and the panel radiates his shock for both of them `
    + `(${ticks(hit) - ticks(hit - 4)} and ${ticks(hit + 1) - ticks(hit - 3)} extra cells)`);
  assert(!openMouth(hit - 1) && !openMouth(hit + 2) && ticks(hit + 2) === ticks(hit - 2),
    'and he wears his authored face on the beats either side of it');
}

// ---- THE BARREL THE LANE ASKED FOR ------------------------------------------
//
// On the finale a barrel in the road is one the gorilla just dropped, and the
// only way the two can be the same object is for the chute to deliver when the
// lane says so. `barrelBeat` is the one number that carries it — the beat a real
// barrel reaches the foot of the chute — and everything below is the contract
// around it: one continuous stream of barrels through seven places, and one lit
// rim riding the real one down.
{
  // A barrel on the chute is a body at the drop's own x; the ghosts are
  // stroke-only and a barrel in the stream is filled.
  // The gorilla's building is [359, 36, 119]; the chute hangs half a gap past
  // its wall, and that gap is the doubled one — 30 cells, so the barrel comes
  // down in clear air rather than kissing both facades.
  const CHUTE_X = 410;
  const inChute = (extra, beat) => bigBarrels(background(3, beat, {}, 0, 0, extra))
    .filter((b) => b.cx === CHUTE_X);
  // A ghost cell is filled too, in the ghost ink; the barrel in the stream
  // is filled in the wood.
  const WOOD = '#a9743a';
  const solid = (extra, beat) => inChute(extra, beat).filter((b) => b.fill === WOOD).length;
  assert(inChute({ barrelBeat: 999 }, 0).length === LCD_CHUTE_CELLS + 1,
    `the chute ghosts its whole path whatever is happening (${inChute({ barrelBeat: 999 }, 0).length} bodies)`);
  assert(lcdChuteScreenX(3) === CHUTE_X,
    `the chute stands where the gorilla's building puts it (${lcdChuteScreenX(3)})`);
  assert(lcdChuteScreenX(1) === null && lcdChuteScreenX(2) === null,
    'and only the finale has one');

  // ONE STREAM, NEVER EMPTY. Whatever the lane is doing there is exactly one
  // barrel falling in the chute on every beat — the one he let go of — and it
  // steps a cell per beat, top to bottom, then the next one takes the top.
  const cellY = (extra, beat) => inChute(extra, beat).find((b) => b.fill === WOOD)?.cy;
  for (const extra of [null, { barrelBeat: 999 }, { barrelBeat: 6 }]) {
    const ys = [0, 1, 2, 3, 4, 5, 6, 7].map((b) => cellY(extra, b));
    assert(ys.every((y) => Number.isFinite(y)) && [0, 1, 2, 3, 4, 5, 6, 7].every((b) => solid(extra, b) === 1),
      `one barrel in the chute on every beat (${JSON.stringify(extra)})`);
    const steps = ys.slice(1).map((y, i) => y - ys[i]);
    assert(steps.filter((d) => d > 0).length === 5 && steps.filter((d) => d < 0).length === 2,
      `and it walks down a cell a beat, top to bottom, twice a phrase (${ys.join(',')})`);
  }
  assert(solid(null, 5) === 1 && solid({ barrelBeat: 5 }, 5) === 1
    && bigBarrels(background(3, 5, { reducedMotion: true }, 0, 0, { barrelBeat: 5 }))
      .filter((b) => b.cx === CHUTE_X && b.fill === WOOD).length === 1,
    'with no lane, on the delivery beat and on a frozen panel alike');

  // ---- ONE LIT BARREL, FROM HIS SCALP TO THE STREET -------------------------
  //
  // The lit rim is the panel's whole promise: this is the barrel that is coming
  // for you. Two of them at once breaks it, and so does a beat with none — the
  // gorilla's swing used to run on the bar while the chute counted back from the
  // delivery, so the two lights overlapped and gapped at whatever phase the lane
  // happened to hand over on.
  //
  // A lit barrel is the only one drawn a pixel proud of its body (the rim in
  // LCD_WINDOW_ON), so counting bodies at the rim's half-extents counts exactly
  // the lit ones, wherever on the panel they are.
  const rims = (beat, barrelBeat, barrelGrid = barrelBeat) =>
    barrelBodies(background(3, beat, {}, 0, 0, { barrelBeat, barrelGrid }))
      .filter((b) => b.rx === 9 && b.ry === 8);
  const DUE = 40;
  const fall = [];
  for (let d = LCD_CHUTE_LEAD_BEATS; d >= 1; d--) {
    const hot = rims(DUE - d, DUE);
    assert(hot.length === 1, `exactly one barrel is lit ${d} beats out (${hot.length})`);
    fall.push(hot[0].cy);
  }
  assert(fall.every((cy, i) => i === 0 || cy > fall[i - 1]),
    `and the lit one only ever falls, over his head to the street (${fall.join(',')})`);
  // SEVEN POSITIONS AND THE ROAD IS THE EIGHTH BEAT. Three in his hands, four
  // in the chute, no position visited twice and none skipped.
  assert(fall.length === 7 && LCD_CHUTE_LEAD_BEATS === 7,
    `seven drawn positions, road on the eighth beat (${fall.length})`);
  assert(new Set(fall).size === fall.length,
    'each of the seven is its own place on the panel');
  assert(rims(DUE, DUE).length === 0 && rims(DUE + 2, DUE).length === 0
    && rims(DUE - LCD_CHUTE_LEAD_BEATS - 1, DUE).length === 0,
    'and nothing is lit before he raises it or once the lane has taken it');

  // THE STREAM IS PHASED TO THE LANE, not the bar: whatever beat the road wants
  // its barrel on, the real one enters his hands on a raise. The grid outlives
  // the barrel, so the NEXT one — a phrase later, same slot — is a raise too,
  // and the barrels he throws in between are the same journey unlit.
  for (const due of [41, 42, 43]) {
    const hot = [7, 6, 5].map((d) => rims(due - d, due)[0]?.cy);
    assert(hot.join(',') === fall.slice(0, 3).join(','),
      `a delivery on beat ${due} still starts over his head (${hot.join(',')})`);
  }
  const later = rims(DUE + 32 - 7, DUE + 32, DUE)[0]?.cy;
  assert(later === fall[0],
    `and a barrel a phrase later enters the same stream on a raise (${later})`);
  // With the grid on 40, phase 0 is beat 33, 37, 41...; a delivery the chart
  // puts on 42 would have to be raised on 35, which is phase 2 — and the rim
  // says so rather than the swing bending to it.
  assert(rims(35, 42, DUE)[0]?.cy !== fall[0],
    'while one off the grid is the run\'s mistake to show, not the swing\'s to hide');

  // AND IT FLASHES ON THE BEAT, three quarters on like the verb sign, so it
  // catches the eye from the road; under reduced flashing it stands lit.
  const rimsAt = (phase, settings = {}) =>
    barrelBodies(background(3, DUE - 6 + phase, settings, 0, 0, { barrelBeat: DUE }))
      .filter((b) => b.rx === 9 && b.ry === 8).length;
  assert(rimsAt(0) === 1 && rimsAt(0.5) === 1 && rimsAt(0.74) === 1,
    'the rim is lit for the first three quarters of every beat of the journey');
  assert(rimsAt(0.8) === 0 && rimsAt(0.99) === 0,
    'and off for the last quarter, which is the flash');
  assert(rimsAt(0.8, { reducedFlashing: true }) === 1,
    'and simply lit under reduced flashing');
}

// ---- the board that counts ------------------------------------------------
//
// The one gameplay fact this city sees. The board on the roof the hero runs
// under shows the ON BEAT STREAK — the count with the word under it — and gilds
// the number every eighth clean beat. It drew a share price until this pass;
// that trace tilted with a hidden 0..1 scalar nobody could read as "how you are
// doing", and the run was already counting something they could.
{
  // Its face: everything drawn inside the board on rhythm-1's second roof.
  //
  // FOUND, NOT AUTHORED. The window used to be four numbers copied off the
  // facade — which meant every pixel that roof grew broke a test about what the
  // board SAYS. The board is the one 43x32 panel of print on the skyline, so
  // this asks the ops where it is and reads whatever is inside it.
  const BOARD_W = 43, BOARD_H = 32;
  const panel = background(1, 4, {}, 0, 0, { streak: 8 })
    .find((op) => op[0] === 'fillRect' && op[1] === PRINT
      && op[4] === BOARD_W && op[5] === BOARD_H);
  assert(!!panel, 'the counting roof carries a board to print on');
  const inBoard = (op, w) => op[0] === 'fillRect' && op[4] === w && op[5] === w
    && op[2] >= panel[2] && op[2] < panel[2] + BOARD_W
    && op[3] >= panel[3] && op[3] < panel[3] + BOARD_H;
  const face = (extra, settings = {}) => background(1, 4, settings, 0, 0, extra);
  const digits = (extra, settings = {}) => face(extra, settings)
    .filter((op) => inBoard(op, 2) && op[1] === PANEL_LIT).length;
  const word = (extra, settings = {}) => face(extra, settings)
    .filter((op) => inBoard(op, 1) && op[1] === PANEL_LIT).length;
  const gold = (extra, settings = {}) => face(extra, settings)
    .filter((op) => inBoard(op, 2) && op[1] === '#f6d33c').length;

  assert(digits({ streak: 8 }) > 0 && word({ streak: 8 }) > 0,
    'the board prints the streak with its word under it');
  // A ZERO IS LIT LIKE ANY OTHER COUNT. It was ghosted first, so the first clean
  // beat would be a light coming on, and that lost to legibility: at 2px on a
  // board read from the lane an unlit digit is unreadable rather than quiet.
  assert(digits({ streak: 0 }) > 0 && word({ streak: 0 }) > 0,
    'a board with no streak still reads');
  assert(face({ streak: 0 }).filter((op) => (inBoard(op, 2) || inBoard(op, 1))
    && op[1] === PRINT_SOFT).length === 0, 'and nothing on it is ghosted');
  // THE NUMBER IS THE STREAK, not a fixed picture: more digits is more ink, and
  // the word underneath never changes with it.
  const d1 = digits({ streak: 8 }), d2 = digits({ streak: 128 });
  assert(d2 > d1, `and the number really is the count (8 -> ${d1} cells, 128 -> ${d2})`);
  assert(word({ streak: 8 }) === word({ streak: 128 }),
    'while the word under it stays put');
  // ONE SIZE AT EVERY COUNT. A counter that shrank at a hundred would shrink on
  // the run where it matters most, so the digits are drawn at the size three of
  // them need and stay there.
  const rowsOf = (n) => new Set(face({ streak: n })
    .filter((op) => inBoard(op, 2) && op[1] === PANEL_LIT).map((op) => op[3])).size;
  assert(rowsOf(8) === rowsOf(128), 'and it is the same size whatever the count');
  // THE CHEER IS THE NUMBER GOING GOLD, and only the number: gilding the label
  // too would flash the whole board when what is being celebrated is the count.
  assert(gold({ streak: 8 }) === 0 && gold({ streak: 8, cheer: true }) > 0,
    'a clean streak gilds the count');
  assert(digits({ streak: 8, cheer: true }) === 0,
    'the whole number, not part of it');
  assert(word({ streak: 8, cheer: true }) === word({ streak: 8 }),
    'and the word stays cream through it');
  // A frozen panel is never cheered at, and is never told the count either.
  assert(gold({ streak: 8, cheer: true }, { reducedMotion: true }) === 0,
    'a frozen panel is never cheered at');
  assert(fingerprint(face({ streak: 8 }, { reducedMotion: true }))
    === fingerprint(face({ streak: 128 }, { reducedMotion: true })),
    'reduced motion draws the same panel whatever the run is doing');
}

// ---- the KEY CHANGE banner ------------------------------------------------
//
// Stage 1's plane tows an announcement in front of the song's modulation. Two
// separate claims, and they fail for different reasons:
//
//   the BAR — the scene authors bar 61 because which of this arrangement's
//             eight transpose moves is THE key change is a musical judgement,
//             not a fact the data states. Authored is not the same as free: it
//             still has to stand on a transpose the song actually makes, or the
//             sky is announcing nothing.
//   the PASS — the rig arrives, crosses, and is GONE on the downbeat it names.
//             A banner still in the air when the new key lands is a banner that
//             was too late, and the whole gag is that it was early.
{
  const { arrangement } = await import('../src/data/songs/rhythm.js');
  const BANNER_BAR = 61;
  let bar = 1;
  let prev = 0;
  const changes = [];
  for (const e of arrangement.order) {
    const t = e.transpose ? (e.transpose.lead ?? 0) : 0;
    if (t !== prev) { changes.push(bar); prev = t; }
    bar += e.bars ?? 2;
  }
  assert(changes.includes(BANNER_BAR),
    `the announced bar is a key change the song really makes (bar ${BANNER_BAR} of ${changes.join(', ')})`);

  // The banner is the one wide lit slab in the sky: eleven pixels tall, tens of
  // pixels long, well above every roof on this skyline.
  const bannerAt = (beat) => background(1, beat)
    .filter((op) => op[0] === 'fillRect' && op[1] === PANEL_LIT
      && op[5] === 11 && op[4] > 40 && op[3] < 100).length;
  const keyBeat = (BANNER_BAR - 1) * 4;
  let flown = 0;
  for (let beat = keyBeat - 44; beat < keyBeat + 24; beat++) if (bannerAt(beat)) flown++;
  assert(flown > 20, `it crosses the sky through the bars around it (${flown} beats of banner)`);
  // AND IT IS MID-SCREEN ON THE DOWNBEAT IT ANNOUNCES. An announcement that has
  // already left when the thing happens is one nobody read, so the pass is aimed
  // rather than merely timed: the rig — banner, tow line and aircraft — has its
  // middle on the middle of the display on the beat the key changes.
  const slab = background(1, keyBeat).find((op) => op[0] === 'fillRect' && op[1] === PANEL_LIT
    && op[5] === 11 && op[4] > 40 && op[3] < 100);
  assert(slab, 'the banner is in the sky on the downbeat it announces');
  const rigMid = slab ? (slab[2] + (slab[4] + 6 + 22) / 2) : -1;
  assert(Math.abs(rigMid - 240) <= 8,
    `and centred on it (rig middle at x ${Math.round(rigMid)} of a 480 display)`);

  // ...AND IT IS NEVER BLANK. Every crossing tows something — the cabinet's own
  // advert on an ordinary pass — so what has to be checked is that the two are
  // different words rather than one banner flown twice. The letter cells are
  // the 1x1 print marks in the sky, normalised off their own top-left corner:
  // the same text at a different x fingerprints the same, a different text does
  // not, and neither depends on where in the crossing the plane happens to be.
  const lettering = (beat) => {
    const cells = background(1, beat)
      // Ink for letters, lit red for the heart container — a banner may carry a
      // picture as readily as a word, and both are single cells in the sky.
      .filter((op) => op[0] === 'fillRect' && (op[1] === PRINT || op[1] === ACTIVE)
        && op[4] === 1 && op[5] === 1 && op[3] < 95)
      .map((op) => [op[2], op[3]]);
    if (!cells.length) return '';
    const x0 = Math.min(...cells.map((c) => c[0]));
    const y0 = Math.min(...cells.map((c) => c[1]));
    return fingerprint(cells.map(([x, y]) => [x - x0, y - y0]).sort());
  };
  // The same step of different crossings: the crossing is 44 beats of a 64-beat
  // cycle, so a beat is only comparable with one at the same step of it.
  const line = (pass) => lettering(pass * 64 + 20);
  assert(line(0) === '', 'the first crossing of the song tows nothing');
  // Crossings 1, 2 and 4 — the third is the one the announcement grounds, and
  // the rotation steps over it rather than spending a line on it. That is the
  // claim, and it is the one the song's own loop makes load-bearing: bars 21 to
  // 76 is three and a half crossings, so a rotation that spent a line on a
  // grounded pass would never fly its third in a whole lap.
  const rota = [1, 2, 4].map(line);
  assert(rota.every((l) => l.length > 2), 'and every crossing after it tows a line');
  assert(new Set(rota).size === rota.length,
    'a different one each crossing, the grounded one stepped over rather than paid for');
  // Before the announcement opens, where a grounded crossing would be eight
  // beats into its own run — nothing takes off.
  assert(bannerAt(keyBeat - 40) === 0, 'a crossing that runs into the announcement never takes off');
  assert(line(5) === rota[0], 'the rotation comes round rather than running out');
  assert(lettering(85) === rota[0] && lettering(94) === rota[0],
    'a line holds for the whole of its own crossing');
  assert(!rota.includes(lettering(keyBeat - 20)) && lettering(keyBeat - 20).length > 2,
    'and the announcement pass tows something the rotation never says');

}

// ---- the omen -------------------------------------------------------------
//
// Stage 3's plane rotates three lines, and a run that never rolled the omen
// sees exactly those. When the run DID roll one it hands the panel a clock —
// beats since it started — and the first crossing to take off after that tows
// SURRENDER DOROTHY instead of its turn's line: once, on the crossing's own
// lane, off the right edge rather than vanishing mid-sky (the rig is the
// longest thing that has ever flown on this cabinet), and without costing the
// rotation a turn.
{
  const slabAt = (beat, omen, settings = {}) => background(3, beat, settings, 0, 0,
    omen == null ? null : { omen })
    .find((op) => op[0] === 'fillRect' && op[1] === PANEL_LIT
      && op[5] === 11 && op[4] > 40 && op[3] < 100);
  // Crossing 1 takes off at beat 65 (cycle 64, dodge 1). The omen's clock at a
  // song beat is (beat - 65) + its step at take-off.
  const TAKEOFF = 65;
  const omenAt = (beat, atTakeoff) => beat - TAKEOFF + atTakeoff;
  const usual = slabAt(TAKEOFF + 20, null);
  assert(usual && usual[4] < 90, `without a roll the crossing tows its usual line (${usual && usual[4]}px)`);
  const omen = slabAt(TAKEOFF + 20, omenAt(TAKEOFF + 20, 10));
  assert(omen && omen[4] > 90,
    `with one, the first crossing after the clock starts tows a longer line than any in the rotation (${omen && omen[4]}px)`);
  assert(omen && omen[3] === usual[3], 'on the same lane the crossing always flies');
  const early = slabAt(TAKEOFF + 20, omenAt(TAKEOFF + 20, -5));
  assert(early && early[4] < 90, 'a crossing already mid-sky when the clock starts keeps its words');
  const late = slabAt(TAKEOFF + 64 + 2 + 20, omenAt(TAKEOFF + 64 + 2 + 20, 10 + 64));
  assert(late && late[4] < 90, 'and the crossing after the omen is an ordinary one — it flies once');
  const flown = [];
  for (let beat = TAKEOFF; beat < TAKEOFF + 64; beat++) {
    if (slabAt(beat, omenAt(beat, 10))) flown.push(beat);
  }
  const last = slabAt(flown[flown.length - 1], omenAt(flown[flown.length - 1], 10));
  assert(flown.length > 44 && last[2] + 14 >= 480,
    `the pass runs until the rig has left the right edge (${flown.length} beats, last seen at x ${last[2]})`);
  assert(flown.every((beat, i) => i === 0 || beat === flown[i - 1] + 1),
    'and is in the sky on every beat between');
  // The rotation is not consumed: the crossing after the omen tows the line it
  // would have towed anyway.
  const nextUsual = slabAt(TAKEOFF + 64 + 2 + 20, null);
  assert(nextUsual && nextUsual[4] === late[4],
    'the crossing after it tows the line it would have towed without the omen');
  assert(!background(2, 40, {}, 0, 0, { omen: 10 }).find((op) => op[0] === 'fillRect'
    && op[1] === PANEL_LIT && op[5] === 11 && op[4] > 40 && op[3] < 100),
    'a panel with no plane flies nothing, roll or no roll');
  const frozen = slabAt(TAKEOFF + 20, omenAt(TAKEOFF + 20, 10), { reducedMotion: true });
  assert(!frozen || frozen[4] < 90, 'a frozen panel never shows it');
}

// ---- the sign that shouts a verb ------------------------------------------
//
// The share price stands down and its board shouts one verb: the ribbon's own
// mark in the ACTION's colour, with the word for it underneath. The board is
// SQUARE and the width of its facade whatever is on it, because the price and
// the sign trade it back and forth mid-stage and a board that changed shape as
// they did would read as two signs being swapped rather than one changing its
// mind.
{
  const sign = (action, ink, beat, settings = {}, stage = 2) =>
    background(stage, beat, settings, 0, 0, { intro: true, verbCue: { action, ink } });
  // The mark is a filled path (the triangles) or a stroked one (the ring), so
  // the fill/stroke ops carrying the action's colour are what prove it drew.
  const marks = (ops, ink) => ops.filter((op) => (op[0] === 'fill' || op[0] === 'stroke')
    && op[1] === ink).length;
  // The word is fine 1px print in the panel's lit cream — the only cells on the
  // whole panel drawn that way.
  const letters = (ops) => ops.filter((op) => op[0] === 'fillRect' && op[1] === PANEL_LIT
    && op[4] === 1 && op[5] === 1).length;
  // The board itself: the one big panel of print on this roofline, at the size
  // the sign fixes it to.
  const board = (ops) => ops.filter((op) => op[0] === 'fillRect' && op[1] === PRINT
    && op[4] > 20 && op[5] > 20).map((op) => `${op[2]},${op[3]},${op[4]}x${op[5]}`);
  // The price fills its board at 3px cells — the one sign on the skyline that
  // does not draw at 2, because it is the one whose board is not its own size.
  const price = (extra, beat = 0, stage = 2) => background(stage, beat, {}, 0, 0, extra)
    .filter((op) => op[0] === 'fillRect' && op[1] === PANEL_LIT && op[4] === 2 && op[5] === 2
      && op[3] > 100).length;

  assert(marks(sign('duck', ['#72d8f0'], 0), '#72d8f0') > 0,
    "the sign draws its mark in the action's own colour");
  // Colour is passed, never kept: a mark asked for in a colour the pack has
  // never heard of comes out in it, which is why the action list lives with the
  // ribbon and the road instead of here.
  assert(marks(sign('jump', ['#ff00ff'], 0), '#ff00ff') > 0,
    'and in whatever colour it is handed, so the pack keeps no copy of the list');
  // A SLIDE CAN ANSWER TWO OBJECTS AND SHOWS TWO MARKS. Shape is the button,
  // colour is the thing arriving: a barrel along the floor in wood, a drone
  // overhead in cyan, and a stage that stages both says both.
  const two = sign('duck', ['#d4a35e', '#72d8f0'], 0);
  assert(marks(two, '#d4a35e') === 1 && marks(two, '#72d8f0') === 1,
    'a slide that answers two objects shows a mark for each');
  assert(marks(sign('jump', ['#3fbf5a'], 0), '#3fbf5a') === 1, 'and a jump shows one');
  // The word underneath, a different length per verb — the check that it is the
  // label being printed and not a fixed decoration.
  const j = letters(sign('jump', ['#3fbf5a'], 0));
  const d = letters(sign('duck', ['#72d8f0'], 0));
  const a = letters(sign('ability', ['#f890b8'], 0));
  assert(j > 0 && d > j && a > d,
    `the word is printed under it (JUMP ${j} < SLIDE ${d} < ATTACK ${a} cells)`);
  // THE MARKS ARE THE RIBBON'S TRIANGLES, not arrows with stems: up and down
  // are the same three points reflected.
  const corners = (action) => sign(action, ['#3fbf5a'], 0)
    .filter((op) => op[0] === 'lineTo').length;
  assert(corners('jump') === corners('duck'), 'up and down are the same triangle reflected');
  // ONE BOARD, WHATEVER IS ON IT — same origin, same square, on every stage.
  for (const stage of [1, 2, 3]) {
    const quietBoard = board(background(stage, 0, {}, 0, 0, { streak: 12, verbCue: null }));
    const loudBoard = board(sign('ability', ['#f890b8'], 0, {}, stage));
    assert(quietBoard.length > 0 && String(quietBoard) === String(loudBoard),
      `stage ${stage}: the board is the same rectangle whether it counts or shouts (${quietBoard})`);
  }
  // IT TAKES THE BOARD AND GIVES IT BACK. The ordinary face is the on-beat count
  // in 2px lit cream; while a verb is being shouted there is none of it left,
  // and the moment the shout ends it is back exactly as it was.
  const quiet = price({ streak: 12 });
  assert(quiet > 0, 'the board counts the streak when nothing is being shouted');
  assert(price({ streak: 12, verbCue: { action: 'duck', ink: ['#72d8f0'] } }) === 0,
    'and gives its whole face over while the sign is up');
  assert(price({ streak: 12, verbCue: null }) === quiet, 'and takes it back afterwards');
  // ONE DARK BEAT A BAR, not a strobe — and reduced flashing keeps the message
  // and drops the blink, the fallback every other sign on this panel takes.
  // THREE QUARTERS ON, A QUARTER OFF, EVERY BEAT. Sampled inside a beat rather
  // than across bars: this is the one thing on the panel that happens at a
  // finer grain than the beat grid.
  for (const phase of [0, 0.3, 0.74]) {
    assert(marks(sign('duck', ['#72d8f0'], 3 + phase), '#72d8f0') > 0,
      `lit ${Math.round(phase * 100)}% of the way through a beat`);
  }
  for (const phase of [0.75, 0.99]) {
    assert(marks(sign('duck', ['#72d8f0'], 3 + phase), '#72d8f0') === 0
      && letters(sign('duck', ['#72d8f0'], 3 + phase)) === 0,
      `dark ${Math.round(phase * 100)}% of the way through a beat`);
  }
  assert(marks(sign('duck', ['#72d8f0'], 3.9, { reducedFlashing: true }), '#72d8f0') > 0,
    'reduced flashing keeps the message and drops the flash');
  assert(marks(sign('duck', ['#72d8f0'], 0, { reducedMotion: true }), '#72d8f0') === 0,
    'a frozen panel is never shouted at');
}

// ---- how low a window may light -------------------------------------------
//
// The panel draws the city behind a road that RISES over its feet, so a lit
// window inside the band the lane can climb through is swallowed as the lane
// rolls past it. The pack's floor is derived from that reach rather than
// hardcoded, and the pack carries its own default for callers that draw no road
// at all — a number that has to keep matching the terrain it was taken from.
// This is the guard against those two drifting apart.
{
  const { STAGE_WAVES: WAVES, setStageWave: setWave, setGroundRises: setRises, maxTerrainHeight }
    = await import('../src/game/terrain.js');
  const rhythm = CABINETS.find((c) => c.id === 'rhythm');
  const CROSSING_ROAD_RISE = 7;    // run.js, mirrored here on purpose

  // rhythm-1: the crossings' rise AND the stage wave, which can coincide.
  setRises([{ x: 0, w: 100, h: CROSSING_ROAD_RISE, ramp: 40 }]);
  const w1 = WAVES['rhythm-1'];
  setWave({ amp: w1.amp, period: w1.period, phase: 0, from: 0, to: 1000 });
  const one = maxTerrainHeight(rhythm);
  assert(one === CROSSING_ROAD_RISE + w1.amp,
    `rhythm-1's lane climbs the crossing rise plus its stage wave (got ${one})`);

  // The pack's no-road default must be the worst of the three stages, or a
  // caller outside a run would light a window the lane could climb over.
  assert(LCD_DEFAULT_ROAD_RISE === one,
    `the pack's default road rise matches rhythm-1's real maximum (got ${LCD_DEFAULT_ROAD_RISE}, terrain says ${one})`);

  // rhythm-2 and rhythm-3 declare no wave, so their lane climbs less and their
  // city may light twelve pixels lower — the band closest to the lane.
  setWave(null);
  const rest = maxTerrainHeight(rhythm);
  assert(rest === CROSSING_ROAD_RISE,
    `a stage with no wave only climbs its crossings (got ${rest})`);
  assert(one - rest === w1.amp,
    `which is ${w1.amp}px more city than rhythm-1 can light (got ${one - rest})`);

  // THE INVARIANT THE WHOLE DERIVATION IS FOR: the lowest lit window's bottom
  // edge and the road's highest reach are the same line. One pixel either way is
  // a window the lane clips as it rolls, or a row of city given away for nothing.
  const WINDOW_H = 6;
  for (const rise of [0, 10, 22]) {
    const lowestLitBottom = (GROUND_Y - (rise + WINDOW_H)) + WINDOW_H;
    assert(lowestLitBottom === GROUND_Y - rise,
      `at a ${rise}px rise the lowest lit window ends exactly where the road begins`);
  }
  setRises([]);
}

// ---- the plumber never touches a barrel he is not being hit by -------------
// Every beat of the tower's 32-beat journey, the runner's painted box against
// every SOLID barrel on that beat: two clear pixels minimum, on both tower
// stages. The one overlap allowed is the authored hit (beat 14). Peter, 3 Sep
// 2026: "he needs to either move back or jump to get out of their way, like a
// real game of Donkey Kong."
{
  const { lcdRunnerProbe } = await import('../src/engine/stylePacks/index.js');
  const style = getStylePack('lcd', {});
  const cab = CABINETS.find((c) => c.id === 'rhythm');
  const box = (rx, fy, m) => {
    if (m.kind === 'climb') return [rx - 5, fy - 16, rx + 5, fy - 1];
    if (m.kind === 'jump') return [rx - 7, fy - 28, rx + 8, fy - 12];
    if (m.kind === 'hit') return [rx - 5, fy - 20, rx + 6, fy - 1];
    return m.dir === 1 ? [rx - 5, fy - 17, rx + 6, fy - 1] : [rx - 6, fy - 17, rx + 5, fy - 1];
  };
  const HIT_BEAT = 14;
  for (const stageIndex of [0, 1]) {
    let worst = Infinity, hits = 0;
    for (let beat = 0; beat < 32; beat++) {
      lcdRunnerProbe.mode = null;
      const { ctx } = recorder();
      style.bg(ctx, 0, 0, cab, 1000, { stageIndex, beat });
      const m = lcdRunnerProbe.mode;
      if (!m) continue;
      const [x0, y0, x1, y1] = box(lcdRunnerProbe.rx, lcdRunnerProbe.fy, m);
      for (const [bx, by] of lcdRunnerProbe.barrels) {
        const dx = Math.max(bx - 5 - x1, x0 - (bx + 5)) - 1;
        const dy = Math.max(by - 4 - y1, y0 - (by + 4)) - 1;
        const gap = Math.max(dx, dy);
        if (beat === HIT_BEAT) { if (gap < 0) hits++; continue; }
        if (gap < worst) worst = gap;
        assert(gap >= 2, `stage ${stageIndex} beat ${beat} (${m.kind}): ${gap} px between the plumber and the barrel at ${bx},${by}`);
      }
    }
    assert(hits === 1, `stage ${stageIndex}: the hit beat has exactly one barrel on him (${hits})`);
    console.log(`   stage ${stageIndex}: closest call ${worst}px`);
  }
}

if (failed) process.exit(1);
console.log('LCD background checks passed.');
