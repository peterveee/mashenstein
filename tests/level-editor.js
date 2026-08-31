// The level editor's writer: what it puts on disk, and what it refuses.
//
// src/data/stage-layouts.js is written by a tool and read by the game, so the
// two claims worth pinning are that a save is IDEMPOTENT — saving a file that
// came out of the writer produces the same bytes, or every session's first
// save is a diff nobody made — and that the validator refuses the shapes the
// run cannot honour, in front of the person writing them.
//
// Browserless: the writer is a pure function of the entries it is handed, and
// running the real editor page to test it would test the page instead.
import { installDom } from './dom-stub.js';

installDom();

import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { STAGE_BY_ID } from '../src/data/stages.js';
import { CABINET_BY_ID } from '../src/data/cabinets.js';
import { OBSTACLES, PICKUPS } from '../src/game/entities.js';
import {
  renderStageLayouts, writeStageLayouts, snapshotStageLayouts, validateLayouts,
} from '../tools/lib/stage-layouts-source.js';
import { grabAt, dropAt, MIN_SPAN } from '../tools/lib/timeline-drag.js';
import { LOOP } from '../src/game/loop.js';

let failures = 0;
function ok(cond, msg) {
  if (cond) console.log(`ok: ${msg}`);
  else { console.error(`FAIL: ${msg}`); failures++; }
}

const reg = { STAGE_BY_ID, CABINET_BY_ID, OBSTACLES, PICKUPS };
const base = () => ([{
  id: 'plumber-3', cabinet: 'plumber',
  durationSec: 60, speedMult: 1,
  appliance: { at: 0.55, high: false },
  pits: [{ at: 0.12, w: 52 }, { at: 0.7, jumps: 4 }],
  rewindAt: null,
}]);

// ---- 1. the shape of what is written ---------------------------------------
{
  const src = renderStageLayouts(base());
  ok(src.startsWith('// GENERATED'), 'the file says it is generated');
  ok(/Do not edit/.test(src), 'and tells a reader not to hand-edit it');
  ok(/export const STAGE_LAYOUTS = \{/.test(src), 'it exports STAGE_LAYOUTS');
  ok(/"plumber-3"/.test(src), 'keyed by stage id');
  ok(/\{ at: 0\.7, jumps: 4 \}/.test(src), 'a crossing keeps its jump count, not a width');
  // Optional fields equal to their defaults stay out, or every stage in the
  // file grows a checkpoints line nobody chose. Checked against the BODY: the
  // header comment names these fields to explain them, and matching that
  // would be the test reading the documentation rather than the data.
  const body = src.slice(src.indexOf('export const STAGE_LAYOUTS'));
  ok(!/checkpoints/.test(body), 'default checkpoints are not written');
  ok(!/loopAt/.test(body), 'a stage that never moved its loop has no loopAt');
  ok(!/finishDog/.test(body), 'a default finish-dog chance is not written');
  ok(!/sections/.test(body), 'a stage with no sections has no sections key');
}

// The loop-de-loop is an OPTIONAL field: written where a stage moved it or took
// it away, left out where it still stands on LOOP.at.
{
  const moved = base(); moved[0].loopAt = 0.3;
  ok(/loopAt: 0\.3/.test(renderStageLayouts(moved)), 'a moved loop is written');
  const gone = base(); gone[0].loopAt = null;
  ok(/loopAt: null/.test(renderStageLayouts(gone)), 'and a loop somebody removed is written as null');
  const same = base(); same[0].loopAt = LOOP.at;
  const body = renderStageLayouts(same).split('export const STAGE_LAYOUTS')[1];
  ok(!/loopAt/.test(body), 'a loop dragged back to the default writes no key');
}

// ---- 2. round-trip: the writer's output re-renders to itself ----------------
{
  const once = renderStageLayouts(base());
  const twice = renderStageLayouts(base());
  ok(once === twice, 'rendering is deterministic');

  // And through the module loader: what it writes is valid JS that parses back
  // to the same decisions.
  const dir = mkdtempSync(join(tmpdir(), 'mash-layouts-'));
  const file = join(dir, 'stage-layouts.js');
  writeFileSync(file, once);
  const mod = await import(pathToFileURL(file).href);
  const back = Object.entries(mod.STAGE_LAYOUTS).map(([id, v]) => ({ id, cabinet: STAGE_BY_ID[id].cabinet, ...v }));
  ok(renderStageLayouts(back) === once, 'a file that came out of the writer goes back in unchanged');
}

// ---- 3. write-if-changed, and the history snapshot -------------------------
{
  const root = mkdtempSync(join(tmpdir(), 'mash-root-'));
  mkdirSync(join(root, 'src/data'), { recursive: true });
  ok(writeStageLayouts(root, base()) === true, 'the first write lands');
  ok(writeStageLayouts(root, base()) === false,
    'an identical save writes nothing — rewriting the same bytes still moves mtime and retriggers the watch build');
  const edited = base();
  edited[0].durationSec = 75;
  ok(writeStageLayouts(root, edited) === true, 'a changed save lands');
  ok(/durationSec: 75/.test(readFileSync(join(root, 'src/data/stage-layouts.js'), 'utf8')),
    'and the change is in the file');

  const snap = snapshotStageLayouts(root);
  ok(!!snap && existsSync(snap), 'the old copy is snapshotted before it is replaced');
  ok(readdirSync(join(root, 'work/level-history')).length === 1, 'into work/level-history, the disposable drawer');
}

// ---- 4. what the validator refuses ----------------------------------------
const refuses = (mutate, why) => {
  const entries = base();
  mutate(entries[0]);
  const { errors } = validateLayouts(entries, reg);
  ok(errors.length > 0, `refused: ${why}`);
};
const accepts = (mutate, why) => {
  const entries = base();
  mutate(entries[0]);
  const { errors } = validateLayouts(entries, reg);
  ok(errors.length === 0, `accepted: ${why}${errors.length ? ` (got ${errors[0]})` : ''}`);
};

ok(validateLayouts(base(), reg).errors.length === 0, 'a plain entry validates');
refuses((e) => { e.id = 'nosuch-9'; }, 'a stage id that does not exist');
refuses((e) => { e.durationSec = 0; }, 'a stage with no length');
refuses((e) => { e.speedMult = 0; }, 'a stage that does not move');
refuses((e) => { e.pits[0].at = 1.4; }, 'a pit past the end of the stage');
refuses((e) => { e.pits[0].w = 900; }, 'a pit wider than any jump');
refuses((e) => { e.pits[1].jumps = 99; }, 'a crossing of ninety-nine jumps');
refuses((e) => { e.checkpoints = [0.7, 0.3]; }, 'checkpoints that run backwards');
refuses((e) => { e.loopAt = 1.5; }, 'a loop past the end of the stage');
accepts((e) => { e.loopAt = null; }, 'a stage that takes its loop away');
refuses((e) => { e.sections = [{ to: 0.5 }, { to: 0.4 }, { to: 1 }]; }, 'sections that do not advance');
refuses((e) => { e.sections = [{ to: 0.6 }]; }, 'sections that stop before the tape');
refuses((e) => { e.sections = [{ to: 1, exclude: ['notAnObstacle'] }]; }, 'excluding an obstacle that is not in the registry');
refuses((e) => { e.sections = [{ to: 1, tierCap: 7 }]; }, 'a tier that does not exist');
refuses((e) => { e.sections = [{ to: 1, drip: { weights: { capShield: 0, capMagnet: 0 } } }]; },
  'capsule weights that sum to nothing');
refuses((e) => { e.sections = [{ to: 1, drip: { weights: { notACapsule: 5 } } }]; },
  'a weight for something that is not a capsule');
accepts((e) => { e.sections = [{ to: 0.4, density: 1.5, exclude: ['cactus'] }, { to: 1 }]; },
  'a curated two-section stage');
accepts((e) => { e.finishDog = false; }, 'a stage that bans the dog outright');

// A loop on a cabinet without one WARNS: the field is harmless where nothing
// reads it, but somebody wrote a placement that will never place anything.
{
  const entries = base();
  entries[0].loopAt = 0.4;                 // plumber-3, and only the boost cabinets ride
  const { errors, warnings } = validateLayouts(entries, reg);
  ok(errors.length === 0 && warnings.some((w) => /no loop-de-loop/.test(w)),
    'a loop placed on a cabinet that has none warns rather than refusing');
}

// A stale pattern key WARNS rather than refuses: the bank moved under an
// exclusion that still parses, and the stage still plays.
{
  const entries = base();
  entries[0].sections = [{ to: 1, excludePatterns: ['9:notAPattern@0'] }];
  const { errors, warnings } = validateLayouts(entries, reg);
  ok(errors.length === 0 && warnings.length > 0, 'a stale pattern key warns rather than refusing the save');
}

// ---- 4. the timeline's gestures --------------------------------------------
//
// Dragging is the editor's main verb, and everything that can go wrong with it
// is arithmetic: catching the wrong thing, jumping on the first pixel, or
// writing a fraction the validator above would then refuse. The page owns the
// pointer, tools/lib/timeline-drag.js owns these rules, and this owns them.

// A stage with a pit standing under the toaster, so the hit test has to choose.
const tl = () => ({
  totalDist: 10000,
  L: {
    appliance: { at: 0.55 },
    rewindAt: 0.15,
    checkpoints: [0.33, 0.66],
    loopAt: 0.8,
    sections: [{ from: 0, to: 0.4 }, { from: 0.4, to: 0.75 }, { from: 0.75, to: 1 }],
  },
  pits: [
    { i: 0, at: 0.12, x: 1200, w: 60 },
    { i: 1, at: 0.54, x: 5400, w: 200 },   // 0.54 to 0.56 — the appliance stands in it
  ],
  // Ribbons as the editor tags them: srcKind/srcIndex say which authored road
  // they came from, srcAt where that road starts and srcSpan how much stage the
  // whole of it covers. The two islands are one staircase; the stone is a
  // crossing's, which nobody authored.
  routes: [
    { kind: 'tunnel', x: 1800, w: 1270, srcKind: 'tunnels', srcIndex: 0, srcAt: 0.18, srcSpan: 0.127 },
    { kind: 'island', x: 4600, w: 60, srcKind: 'islands', srcIndex: 0, srcAt: 0.46, srcSpan: 0.056 },
    { kind: 'island', x: 4800, w: 360, srcKind: 'islands', srcIndex: 0, srcAt: 0.46, srcSpan: 0.056 },
    { kind: 'island', x: 8000, w: 100, srcKind: null, srcIndex: -1 },
  ],
});
const TOL = 0.006;   // what 8px comes to on a lane about 1300px wide

{
  const m = tl();
  ok(grabAt('setpieces', m, 0.55, TOL)?.kind === 'appliance',
    'a pin is caught in front of the pit standing under it');
  ok(grabAt('setpieces', m, 0.15, TOL)?.kind === 'rewind', 'the rewind capsule is grabbable');
  ok(grabAt('setpieces', m, 0.8, TOL)?.kind === 'loop', 'so is the loop-de-loop');
  ok(grabAt('setpieces', m, 0.559, TOL)?.i === 1, 'a pit is caught anywhere across its body');
  ok(grabAt('setpieces', m, 0.9, TOL) === null, 'bare lane holds nothing');
  ok(grabAt('checkpoints', m, 0.33, TOL)?.i === 0, 'a checkpoint is grabbable');
  ok(grabAt('sections', m, 0.4, TOL)?.kind === 'boundary', 'a section boundary is grabbable');
  ok(grabAt('sections', m, 1, TOL) === null, 'the tape is not a boundary anyone owns');
  ok(grabAt('forecast', m, 0.5, TOL) === null, 'a lane that only reports has nothing to grab');

  ok(grabAt('routes', m, 0.25, TOL)?.roadKind === 'tunnels', 'a road is caught anywhere along its ribbon');
  ok(grabAt('routes', m, 0.8, TOL) === null, "a crossing's stone is not a road anyone can move");
  ok(grabAt('routes', m, 0.35, TOL) === null, 'and bare lane between roads holds nothing');

  ok(grabAt('sections', m, 0.5, TOL)?.kind === 'span', 'the body of a middle section slides');
  ok(grabAt('sections', m, 0.2, TOL) === null, 'the first section has no start to move');
  ok(grabAt('sections', m, 0.9, TOL) === null, 'and the last one ends at the tape');
}

// A staircase is one road with several treads: grabbing any of them moves the
// climb, and by the amount the hand moved rather than by where the tread was.
{
  const m = tl();
  const low = grabAt('routes', m, 0.465, TOL);
  const high = grabAt('routes', m, 0.5, TOL);
  ok(low.i === 0 && high.i === 0, 'both treads answer for the same authored island');
  ok(dropAt(low, m, 0.565) === 0.56 && dropAt(high, m, 0.6) === 0.56,
    'and either one dragged ten points moves the climb ten points');
  ok(dropAt(high, m, 1) === 0.934, 'a road stops with its whole span inside the stage');
}

// Sliding a stretch: both of its edges move, so it stops when either neighbour
// runs out of room.
{
  const m = tl();
  const span = grabAt('sections', m, 0.5, TOL);
  ok(dropAt(span, m, 0.55) === 0.45, 'a section slides with the hand');
  ok(dropAt(span, m, 0.99) === 0.63, 'and stops with the next section still MIN_SPAN wide');
  ok(dropAt(span, m, 0) === MIN_SPAN, 'and leaves the section before it visible at the start');
}

// The offset from pointer to thing is kept, or every drag starts by snapping
// what you grabbed to the middle of the cursor.
{
  const m = tl();
  const h = grabAt('setpieces', m, 0.559, TOL);
  ok(dropAt(h, m, 0.559) === 0.54, 'a press that has not moved writes the fraction it found');
  ok(dropAt(h, m, 0.659) === 0.64, 'and a drag of ten points moves the pit by ten');
}

// Neighbours are walls: a drag stops against them rather than swapping.
{
  const m = tl();
  const cp = grabAt('checkpoints', m, 0.33, TOL);
  ok(dropAt(cp, m, 0.9) === 0.65, 'a checkpoint stops short of the one after it');
  const cp2 = grabAt('checkpoints', m, 0.66, TOL);
  ok(dropAt(cp2, m, 0.01) === 0.34, 'and short of the one before it');

  const b = grabAt('sections', m, 0.4, TOL);
  ok(dropAt(b, m, 0.99) === 0.73, 'a boundary stops short of the next boundary');
  ok(dropAt(b, m, 0) === MIN_SPAN, 'and leaves a section at the start of the stage');
}

// Nothing may be dragged off either end: the writer's isFrac is exclusive, and
// a pit hanging over the tape is a pit the run drops.
{
  const m = tl();
  const wide = grabAt('setpieces', m, 0.54, TOL);
  ok(dropAt(wide, m, 1) === 0.97, 'a pit stops with its whole body inside the stage');
  const pin = grabAt('setpieces', m, 0.55, TOL);
  const ends = [dropAt(pin, m, 0), dropAt(pin, m, 1)];
  ok(ends.every((v) => v > 0 && v < 1), 'a pin dragged to either end still writes a fraction');
}

// ---- 5. the map --------------------------------------------------------------
//
// The picture is painted by the run's own painters, so what is worth testing
// without a browser is not how it looks but WHAT IT IS TOLD TO PAINT: that a
// hole is where the run would dig one, that the band it frames actually
// contains the roads and the ring, and that the rows tile the stage exactly
// once. The DOM stub above lets the paint run headless — every call lands in a
// no-op context — which turns "does it throw on any of the 27 stages" into a
// test rather than a walk through the page.
const { buildScene, paintMap } = await import('../tools/lib/stage-preview.js');
const { STAGES } = await import('../src/data/stages.js');
const { resolveLayout, stageBaseSpeed, totalDistFor, speedAtFrac } = await import('../src/game/layout.js');
const { buildRoutes, crossingLayout, tunnelOpenings } = await import('../src/game/routes.js');
const { terrainGroundY } = await import('../src/game/terrain.js');
const { GROUND_Y } = await import('../src/engine/camera.js');
const { W } = await import('../src/engine/renderer.js');
const { STAGE_LAYOUTS } = await import('../src/data/stage-layouts.js');

// The same shape tools/level-editor-entry.js's model() hands the preview. Built
// here rather than imported because that function reads the page's own state.
function modelFor(id, over = undefined) {
  const st = STAGE_BY_ID[id];
  const cab = CABINET_BY_ID[st.cabinet];
  const L = resolveLayout(st, cab, over);
  const base = stageBaseSpeed(cab, L.speedMult);
  const totalDist = totalDistFor(base, L.durationSec);
  const speedAt = (f) => speedAtFrac(base, L.durationSec, f);
  const crossings = [];
  const pits = (L.pits || []).map((p, i) => {
    const x = p.at * totalDist;
    if (!p.jumps) return { ...p, i, x, w: p.w, crossing: null };
    const c = crossingLayout(x, p.jumps, speedAt(p.at));
    crossings.push(c);
    return { ...p, i, x, w: c.w, crossing: c };
  });
  const routes = buildRoutes(cab, {
    totalDist, speed: base, crossings, groundYAt: (wx) => terrainGroundY(cab, wx, GROUND_Y),
  });
  return { st, cab, L, base, totalDist, speedAt, pits, routes, routeError: null, loopAt: L.loopAt };
}

// Every stage paints, and the rows tile it exactly once.
{
  let broke = null;
  let mistiled = null;
  for (const st of STAGES) {
    const m = modelFor(st.id);
    try {
      const scene = buildScene(m, null);
      const out = paintMap(globalThis.document.createElement('canvas'), scene, { scale: 0.5, width: 1000 });
      const rows = out.rows;
      if (rows.some((r) => r.error)) broke ||= `${st.id}: ${rows.find((r) => r.error).error}`;
      if (rows[0].fromX !== 0) mistiled ||= `${st.id}: first row starts at ${rows[0].fromX}`;
      if (rows[rows.length - 1].toX !== Math.round(m.totalDist) && rows[rows.length - 1].toX !== m.totalDist) {
        mistiled ||= `${st.id}: last row ends at ${rows[rows.length - 1].toX}, stage is ${m.totalDist}`;
      }
      for (let i = 1; i < rows.length; i++) {
        if (rows[i].fromX !== rows[i - 1].toX) mistiled ||= `${st.id}: row ${i} starts at ${rows[i].fromX}, previous ended at ${rows[i - 1].toX}`;
      }
    } catch (err) {
      broke ||= `${st.id}: ${err.message}`;
    }
  }
  ok(!broke, `every stage paints a map${broke ? ` (${broke})` : ''}`);
  ok(!mistiled, `and its rows tile the stage exactly once${mistiled ? ` (${mistiled})` : ''}`);
}

// The band has to contain what it frames, or the map crops the two things a
// road exists to be — and the ring, whose art is twice its box.
{
  let cropped = null;
  for (const st of STAGES) {
    const m = modelFor(st.id);
    const scene = buildScene(m, null);
    for (const r of scene.routes) {
      const top = r.kind === 'island' ? r.topY : scene.topAt(r.x + r.w / 2, r);
      if (top < scene.band.top) cropped ||= `${st.id}: a ${r.kind} tops out at ${Math.round(top)}, above the band's ${scene.band.top}`;
    }
    if (m.loopAt != null && GROUND_Y - LOOP.r * 2 < scene.band.top) {
      cropped ||= `${st.id}: the ring's crown is above the band`;
    }
  }
  ok(!cropped, `the band contains every road and every ring${cropped ? ` (${cropped})` : ''}`);
}

// What the map is told to paint is what the run would place, hole for hole.
{
  const m = modelFor('plumber-3');
  const scene = buildScene(m, null);
  const tunnelGaps = scene.gaps.filter((g) => g.tunnel);
  const want = m.routes.filter((r) => r.kind === 'tunnel').flatMap(tunnelOpenings);
  ok(tunnelGaps.length === want.length && tunnelGaps.every((g, i) => Math.abs(g.x - want[i].x) < 0.001),
    'a tunnel opens exactly where tunnelOpenings says — mouth, holes and the way off the roof');
  ok(scene.gaps.some((g) => !g.tunnel && g.fill === m.cab.pitFill),
    'an ordinary pit is filled with what the cabinet fills holes with');

  const cross = buildScene(modelFor('plumber-2'), null);
  // Its OWN teeth, whatever they are — plumber-2 authors gears — never the
  // cabinet's pit fill.
  const crossGap = cross.gaps.find((g) => g.crossing);
  ok(!!crossGap && crossGap.fill === 'gears' && crossGap.fill !== m.cab.pitFill,
    'and a crossing brings its own teeth');

  const app = scene.entities.find((e) => e.type === 'appliance');
  const wantX = Math.min(m.L.appliance.at * m.totalDist + W, m.totalDist - 160 - app.w);
  ok(Math.abs(app.x - wantX) < 0.001,
    'the toaster stands where the run starts looking for a spot, a screen past its fraction');
}

// The two refusals: a hole in the finishing straight is never dug, and a ring
// that would run past the tape is not planted.
{
  const late = modelFor('plumber-3', { ...STAGE_LAYOUTS['plumber-3'], pits: [{ at: 0.99, w: 56 }] });
  ok(buildScene(late, null).gaps.every((g) => g.tunnel), 'a pit in the finishing straight is not dug');

  const ring = modelFor('speed-1', { ...STAGE_LAYOUTS['speed-1'], loopAt: 0.999 });
  ok(!buildScene(ring, null).entities.some((e) => e.type === 'loopPad'),
    'and a ring that would run past the tape is not planted');
}

console.log(failures ? 'LEVEL EDITOR: FAILED' : 'LEVEL EDITOR: PASSED');
process.exit(failures ? 1 : 0);
