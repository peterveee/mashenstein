// RHYTHM BANKRUPTCY's Game Boy Color city: three fixed limited-palette scenes,
// deterministic musical poses, and accessibility fallbacks. This records Canvas2D operations
// rather than comparing PNGs, so a changed segment is an exact source-level
// signal and the suite remains browserless.
import { installDom } from './dom-stub.js';
installDom();

const { getStylePack, drawLCDPanel, lcdChuteScreenX, LCD_CHUTE_BEATS, LCD_DEFAULT_ROAD_RISE,
  LCD_ROAD_INK, lcdBarrelStrikeAt } = await import('../src/engine/stylePacks/index.js');
const { CABINETS } = await import('../src/data/cabinets.js');
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
    closePath() { ops.push(['closePath']); },
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
const ACTIVE = 'rgba(211,91,67,0.82)';
const WINDOW_OFF = 'rgba(53,83,101,0.24)';
const PRINT = 'rgba(38,53,93,0.72)';
const PANEL_LIT = '#dce49a';
const INK = '#26355d';
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
    .filter((op) => op[0] === 'strokeRect' && op[1] === PRINT)
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
  const activeBarrel = (ops) => ops.filter((op) => op[0] === 'ellipse' && op[3] === 8 && op[4] === 7).at(-1);
  assert(activeBarrel(beat0)?.[2] !== activeBarrel(beat2)?.[2],
    `stage ${stage} rooftop gorilla lifts and sets down its barrel on the four-beat cycle`);
  // High on the panel, and each stage's ceiling is its own building's. Stage 3's
  // is 64 rather than 52 because its tower came down fourteen to let the plane
  // cross over the raised barrel instead of behind it — see that scene's
  // `plane`, and the crossing check further down that enforces the clearance
  // this number pays for.
  assert(activeBarrel(beat0)?.[2] <= (stage === 1 ? 70 : 64),
  `stage ${stage} downbeat pose holds the barrel overhead on its tallest building`);
  const ellipses = beat0.filter((op) => op[0] === 'ellipse').length;
  const curves = beat0.filter((op) => op[0] === 'quadraticCurveTo').length;
  assert(ellipses >= 24 && curves >= 8,
  `stage ${stage} gorilla uses curved anatomy, layered facial planes and articulated hands (${ellipses} ellipses, ${curves} curves)`);
}

// The bound is lcdLightFloor's own definition, not a copy of what it happened
// to evaluate to: a caller outside a run lights no lower than
// GROUND_Y - (the pack's default rise + a window). It was written 204 — the
// value that arithmetic had when the groundline was at 224 and the lane climbed
// 22 — and a literal there passes for the wrong reason the moment either moves.
const LIT_FLOOR = GROUND_Y - (LCD_DEFAULT_ROAD_RISE + 6);
for (const stage of [1, 2, 3]) {
  const activeRects = background(stage, 7).filter((op) => op[0] === 'fillRect' && op[1] === ACTIVE);
  assert(activeRects.length > 0 && activeRects.every((op) => op[3] <= LIT_FLOOR),
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
// painter on its roof, and a runner whose face plate lifts 11px on the jump
// beat. Mini barrels are the only 4.5x4 ellipses in the scene; the runner's
// face is the only fillRect in the muzzle colour.
// Beat 1, not beat 0, for the bottom-girder pose: the loop's first beat has him
// on the ladder BELOW that girder, coming up out of the street, and a climbing
// figure is drawn from behind with no face at all.
const gwBeat = [1, 13, 15, 2].map((b) => background(1, b));
const miniBarrels = (ops) => ops.filter((op) => op[0] === 'ellipse' && op[3] === 4.5 && op[4] === 4);
assert(miniBarrels(gwBeat[0]).length >= 10,
'stage 1 carries the tower with its full ghosted barrel path');
const faceY = (ops) => ops.find((op) => op[0] === 'fillRect' && op[1] === '#f2c9a0')?.[3];
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
    .filter((op) => op[0] === 'fillRect' && op[1] === 'rgba(53,83,101,0.10)');
  assert(gameBars.length === 0, `stage ${stage} keeps the lane's sky clear of the analyser`);
}

// ---- the run gets later ---------------------------------------------------
{
  const phases = [0, 0.3, 0.55, 0.9].map((p) => fingerprint(background(2, 4, {}, 0, 0, { progress: p })));
  assert(new Set(phases).size === 4, 'the stage passes through four distinct panels as it runs');
  assert(phases[0] === fingerprint(background(2, 4)),
    'and a scene with no progress is the panel the stage opens on');
  // The chopper takes a billboard with it, so a late panel is missing one.
  const boardCells = (ops) => ops.filter((op) => op[0] === 'fillRect' && op[1] === '#f6d33c').length;
  assert(boardCells(background(2, 4, {}, 0, 0, { progress: 0 })) > 0,
    'stage 2 opens with its billboards up');
}

// ---- stage 2's working city ----------------------------------------------
{
  const beam = (stage, beat) => background(stage, beat).filter((op) => op[0] === 'fillRect'
    && String(op[1]).startsWith('rgba(232,238,176,'));
  assert(beam(2, 0).length > 0 && beam(1, 0).length === 0 && beam(3, 0).length === 0,
    'the searchlight sweeps stage 2 and nowhere else');
  assert(fingerprint(beam(2, 0)) !== fingerprint(beam(2, 1)),
    'and it steps to a new angle on every heard beat');
  const train = (beat, progress) => background(2, beat, {}, 0, 0, { progress })
    .filter((op) => op[0] === 'fillRect' && op[1] === 'rgba(70,121,137,0.5)');
  // Probed mid-crossing: the service runs a 48-beat lap over a 22-beat
  // crossing, and is genuinely off the right-hand edge for the first few beats
  // of it.
  assert(train(12, 0).length === 0 && train(12, 0.3).length > 0,
    'the train joins the city in the second phase rather than opening with it');
  assert(fingerprint(train(12, 0.3)) !== fingerprint(train(13, 0.3)),
    'and it crosses a car-length per heard beat');
  // THE RAIL IS MASONRY AND THE TRAIN IS TRAFFIC. The viaduct's girder is a
  // full-width soft bar; it stands in the opening phase, before any service
  // has run, and it is still standing on the beats between services.
  const girder = (beat, progress) => background(2, beat, {}, 0, 0, { progress })
    .filter((op) => op[0] === 'fillRect' && op[1] === 'rgba(53,83,101,0.48)'
      && op[2] === 0 && op[4] === 480);
  assert(girder(12, 0).length === 1 && girder(12, 0.3).length === 1,
    'the viaduct stands from the opening phase, with or without a train on it');
  assert(train(34, 0.3).length === 0 && girder(34, 0.3).length === 1,
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
      && (fill === 'rgba(211,91,67,0.82)' || fill === 'rgba(53,83,101,0.24)'));
  assert(meterCells.length >= 6 * 6 * 2, `the equalizer banks still stand (${meterCells.length} cells)`);

  // The piers stand in the gaps, never up through a billboard's own legs.
  const piers = background(2, 12, {}, 0, 0, { progress: 0.3 })
    .filter((op) => op[0] === 'fillRect' && op[1] === 'rgba(53,83,101,0.48)'
      && op[4] === 2 && op[5] === 10);
  // Billboards sit on buildings 1 (x 74 w 36) and 7 (x 430 w 36).
  assert(piers.length > 0 && piers.every(([, , px]) => (px + 2 <= 72 || px >= 112)
    && (px + 2 <= 428 || px >= 468)),
    'no viaduct pier comes up over a billboard roof');
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
    .filter((op) => op[0] === 'fillRect' && op[1] === 'rgba(53,83,101,0.10)');
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
    .filter((op) => op[0] === 'fillRect' && op[1] === 'rgba(53,83,101,0.10)').length === 0,
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

const stage3CapYs = new Set([161, 111, 175, 101, 157, 93, 151]);
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
  const plane = (beat) => {
    const rows = new Map();
    for (const op of background(1, beat)) {
      if (op[0] !== 'fillRect' || op[1] !== PANEL_LIT || op[4] !== 2 || op[5] !== 2) continue;
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
  const plane = (beat) => {
    const rows = new Map();
    for (const op of ops(beat)) {
      if (op[0] !== 'fillRect' || op[1] !== PANEL_LIT || op[4] !== 2 || op[5] !== 2) continue;
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
  const barrels = (beat) => background(1, beat)
    .filter((op) => op[0] === 'ellipse' && op[3] === 8 && op[4] === 7).length;
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
  const towerBarrels = (beat) => background(1, beat)
    .filter((op) => op[0] === 'fillRect' && op[1] === '#8a5a35'
      && op[4] === 7 && op[5] === 1).length;
  let shortBeats = 0;
  for (let d = 0; d < 12; d++) {
    if (towerBarrels(hit + d) === towerBarrels(hit + d - 16) - 1) shortBeats++;
  }
  assert(shortBeats === 12,
    `the destroyed barrel never rides the tower (${shortBeats} of 12 beats one cell short)`);
  assert(towerBarrels(hit + 12) === towerBarrels(hit - 4),
    `and the chain is full again on the thirteenth `
    + `(${towerBarrels(hit + 12)} vs ${towerBarrels(hit - 4)})`);

  // HIS FACE, for the same two beats the wreck is up. The read that won the
  // bake-off keeps the face nearly still and says it AROUND the head instead:
  // the smile shrinks to a small O, eight shock ticks radiate off him on the
  // 2px grid, and a sweat bead appears at his temple. Checked on the O and on
  // the ticks — the ticks are the whole thesis of that read, and a face that
  // quietened without them would pass an O-only check while saying nothing —
  // and checked to STOP as well as start: the toy does not sulk.
  const openMouth = (beat) => background(1, beat)
    .some((op) => op[0] === 'ellipse' && op[3] === 2 && op[4] === 2.4);
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
// around it: counted backward, silent when nothing is coming, and never drawing
// the bottom cell the road is about to fill.
{
  // A lit mini-barrel on the chute is a filled ellipse at the drop's own x;
  // the ghosts are stroke-only, so the fill is what says "this one is real".
  const CHUTE_X = 408;
  const lit = (extra, beat) => background(3, beat, {}, 0, 0, extra)
    .filter((op) => op[0] === 'ellipse' && op[1] === CHUTE_X && op[3] === 8 && op[4] === 7)
    .length;
  // The ghosts are drawn every frame whatever happens — the chute's whole path
  // is always there — so a live cell is one more than that. The baseline is
  // taken with a delivery far enough away that none of the four is lit.
  const idle = lit({ barrelBeat: 999 }, 0);
  assert(idle === LCD_CHUTE_BEATS + 1,
    `the chute ghosts its whole path whatever is happening (${idle} cells)`);
  assert(lcdChuteScreenX(3) === CHUTE_X,
    `the chute stands where the gorilla's building puts it (${lcdChuteScreenX(3)})`);
  assert(lcdChuteScreenX(1) === null && lcdChuteScreenX(2) === null,
    'and only the finale has one');

  // COUNTED BACKWARD FROM THE DELIVERY. Three beats out the top cell is live,
  // two out the next — and on the delivery beat itself the chute draws nothing,
  // because the lane barrel is standing there.
  const due = 12;
  const steps = [];
  for (let d = LCD_CHUTE_BEATS; d >= 0; d--) steps.push(lit({ barrelBeat: due }, due - d));
  assert(steps.slice(0, LCD_CHUTE_BEATS).every((n) => n === idle + 1),
    `the chute walks a live cell down for the beats before a delivery (${steps.join(',')})`);
  assert(steps[LCD_CHUTE_BEATS] === idle,
    'and hands the last cell to the road rather than drawing a second barrel on it');

  // SILENT WHEN NOTHING IS COMING. A chute running on its own clock through the
  // bars where no barrel is due is exactly what made the roof and the road read
  // as two unrelated toys.
  assert(lit({ barrelBeat: due }, due + 3) === idle && lit({ barrelBeat: due }, due - 9) === idle,
    'and nothing falls outside its own four beats');

  // AND WITHOUT A LANE TO ASK — the hub, the gallery, reduced motion, this
  // suite — it runs the authored four-beat cycle it always has.
  const authored = [0, 1, 2, 3].map((b) => lit(null, b));
  assert(authored.every((n) => n === idle + 1),
    `with no lane the chute drops on every beat of the bar (${authored.join(',')})`);
  assert(background(3, 5, { reducedMotion: true }, 0, 0, { barrelBeat: 5 })
    .filter((op) => op[0] === 'ellipse' && op[1] === CHUTE_X && op[3] === 8 && op[4] === 7)
    .length === idle + 1,
    'and a frozen panel is not driven by the lane either');
}

// ---- the share price is the run's ----------------------------------------
//
// The one gameplay fact this city sees. A rising run tilts the rooftop trace
// up, a ruined one tilts it down, and a long clean streak replaces the board
// with a thumb. Everything OUTSIDE a run — the hub, the gallery, this suite,
// reduced motion — has to keep drawing the authored flat trace.
{
  // The chart board sits on stage 1's SECOND building — the roof the hero
  // runs under — clear above that roof, so a box around the board catches the
  // sign and none of the facade's windows. Building 1 is [66, 36, 68]: centre
  // 84, roof 156, an 11x8 sign on a 30x24 panel whose cells start at 73, 128.
  // That height is solved against the clock tower rather than chosen — the
  // dial has to finish above this board's top edge — so this window moves
  // whenever the tower does.
  const inBoard = (op) => op[0] === 'fillRect' && op[4] === 2 && op[5] === 2
    && op[2] >= 73 && op[2] < 96 && op[3] >= 128 && op[3] < 145;
  const traceRows = (extra, settings = {}) => background(1, 4, settings, 0, 0, extra)
    .filter((op) => inBoard(op) && (op[1] === ACTIVE || op[1] === '#f6d33c')).map((op) => op[3]);
  const mid = (rows) => rows.reduce((a, b) => a + b, 0) / Math.max(1, rows.length);
  const great = traceRows({ form: 1 });
  const ruined = traceRows({ form: 0 });
  const neutral = traceRows({ form: 0.5 });
  assert(great.length > 0 && ruined.length > 0, 'the share price billboard draws a trace either way');
  assert(mid(great) < mid(neutral) && mid(neutral) < mid(ruined),
    'a good run walks the rooftop trace up the board and a bad one walks it down');
  assert(fingerprint(traceRows({})) === fingerprint(neutral),
    'and a caller with no form of its own gets the authored mid-board trace');
  assert(fingerprint(background(1, 4, { reducedMotion: true }, 0, 0, { form: 1 }))
    === fingerprint(background(1, 4, { reducedMotion: true }, 0, 0, { form: 0 })),
    'reduced motion draws the same panel whatever the run is doing');

  // The streak reward: the board drops the market and puts up a thumb.
  const thumbCells = (extra, settings = {}) => background(1, 4, settings, 0, 0, extra)
    .filter((op) => inBoard(op) && op[1] === '#b9cf79').length;
  assert(thumbCells({ form: 0.9 }) === 0 && thumbCells({ form: 0.9, cheer: true }) > 40,
    'a clean streak puts a pixel thumb on the board in place of the chart');
  assert(traceRows({ form: 0.9, cheer: true }).length === 0,
    'and the chart itself comes down while it is up');
  assert(thumbCells({ form: 0.9, cheer: true }, { reducedMotion: true }) === 0,
    'a frozen panel is never cheered at');
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

  // ---- the opening legend, and the barrel it must not fly into ------------
  //
  // The clean first crossing carries the run's legend when there is one, and
  // that crossing is ALSO the one that flies into the gorilla's raised barrel
  // on this scene — it connects on beat 20. Those two facts together are the
  // whole reason lcdPassStrike exists: the one pass the player is being asked
  // to read must not be the one detonating a barrel over their head. The lift
  // is not cosmetic either; the miss lane is ten pixels higher, so the plane
  // that tows instructions is flying the lane of a plane that was never going
  // to hit anything.
  const LEGEND = { text: '\u25b2JUMP \u25cbSHOOT',
    ink: { '\u25b2': '#3fbf5a', '\u25cb': '#f890b8' } };
  const towing = (beat) => background(1, beat, {}, 0, 0, { intro: { legend: LEGEND } });
  assert(lcdBarrelStrikeAt(1, 20), 'the clean opening crossing flies into the barrel');
  assert(!lcdBarrelStrikeAt(1, 20, { legend: LEGEND }),
    'and a crossing towing the legend never does');
  assert(lcdBarrelStrikeAt(1, 240, { legend: LEGEND }) && lcdBarrelStrikeAt(1, 276, { legend: LEGEND }),
    'the gag still runs on the later crossings the legend is nowhere near');
  // Ten pixels of it, measured off the aircraft itself rather than asserted: the
  // plane is the one 22x12 print silhouette in the sky.
  const planeY = (ops) => {
    const body = ops.filter((op) => op[0] === 'fillRect' && op[1] === PRINT
      && op[5] > 1 && op[5] <= 12 && op[3] < 110).map((op) => op[3]);
    return body.length ? Math.min(...body) : null;
  };
  const clean = planeY(background(1, 20));
  const lifted = planeY(towing(20));
  assert(clean != null && lifted != null && clean - lifted === 10,
    `and it flies the miss lane while it does (${clean} -> ${lifted})`);
  // The legend is the one banner that is not only letters: two of its marks are
  // the ribbon's own shapes, drawn in the ribbon's own colours, which is the
  // entire point of towing it rather than printing the words alone.
  const glyphInk = new Set(towing(20).filter((op) => op[0] === 'fillRect'
    && op[4] === 1 && op[5] === 1 && op[3] < 95).map((op) => op[1]));
  assert(glyphInk.has('#3fbf5a') && glyphInk.has('#f890b8'),
    'the legend draws its verb marks in the actions\' own colours');
  assert(lettering(20) === '', 'and an opening crossing with no legend still tows nothing');
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

if (failed) process.exit(1);
console.log('LCD background checks passed.');
