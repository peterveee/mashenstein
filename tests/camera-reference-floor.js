// THE REFERENCE FLOOR — the one floor the landscape camera frames against,
// measured on the real RunState headlessly at the desktop tier (zoom 1.6) on
// plumber-1: its four-step staircase (stack s1, rises 29/62/95/128), its sprung
// sky fork with three gaps, and a checkpoint restore from the top step.
//
//   1. standing on step k the reference IS step k (not predicted, authored rise)
//   2. a hop from step k names step k+1 within 2 ticks of take-off, predicted,
//      at that step's top — and never flickers to the lane before the landing
//   3. walking off the top step hands the reference to the lane within 3 ticks
//      of the release, and the camera reads the drop as a fall
//   4. a double off the top step holds the departed step while the hero is
//      rising or still above its top, then drops to the lane within
//      CAMERA_REF_DROP_TICKS + 1 ticks of his feet falling past it
//   5. a spring launch names the fork's lip within 2 ticks, predicted, and the
//      anchor sets off for the lip while he is still in flight
//   6. a sky-road gap jumped with the route still set is framed against the
//      road at the landing; a gap walked into is a fall to the lane, carried
//   7. the lockstep: on the 95→128 hop the crane never gives back what the
//      anchor took (camPan + anchorLift·z non-decreasing until the landing),
//      the zoom is the tier's on every frame, the crown stays on screen on
//      every frame of every hop
//   8. a checkpoint restore opens settled: tier zoom, nothing latched, the
//      crane under the ground cap, the anchor already where one tick would
//      hold it
//
// Scripted the way tests/camera-run-harness.js scripts a staircase: jump is
// pressed 0.45 s of travel before a step's lip and held 24 frames; lane
// clutter is cleared every frame so nothing but the geometry is in play.
import { installDom } from './dom-stub.js';
installDom();
window.__mash_platform = { isDesktop: true };

const { RunState } = await import('../src/game/run.js');
const { save } = await import('../src/engine/save.js');
const { Input } = await import('../src/engine/input.js');
const { STAGE_BY_ID } = await import('../src/data/stages.js');
const C = await import('../src/engine/camera.js');
const { HERO_DRAW_H } = await import('../src/game/draw.js');
const { routeRise } = await import('../src/game/routes.js');

save.load(); save.newSlot(0, 0);

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}
const f1 = (v) => (Number.isFinite(Number(v)) ? Number(v).toFixed(1) : String(v));
const f2 = (v) => (Number.isFinite(Number(v)) ? Number(v).toFixed(2) : String(v));

const DT = 1 / 60;
const STAIR_LEAD = 0.45;
const CAMERA_REF_DROP_TICKS = 3;   // run.js, not exported
const EXPECTED_ZOOM = 1.6;         // the desktop tier (run.js ZOOM_NORMAL)
const GY = C.GROUND_Y;

const stage = STAGE_BY_ID['plumber-1'];
const baseOpts = { stage, team: ['lorenzo'], save, seed: 12345, difficulty: 1, skipRunIn: true, devInvuln: true, onEnd: () => {} };
const scout = new RunState(baseOpts); scout.enter();
const TOTAL = scout.totalDist;
function makeRun(startX) {
  const run = new RunState({ ...baseOpts, devStartPercent: Math.max(0, (startX - 46) / TOTAL) });
  run.enter();
  return run;
}
const label = (r) => (!r ? 'lane' : r.kind === 'island' ? `step${Math.round(routeRiseOf(r))}` : r.kind);
function routeRiseOf(r) { return r.kind === 'island' ? Math.round(r.entry) : r.entry; }

/** One frame's record, taken after the tick (the camera runs after physics). */
function measure(run, i, prev) {
  const p = run.player;
  const z = run.camZoom, pan = run.camPan, fl = run.camFloorY;
  const feet = run.playerGroundY() - p.y;
  const ref = run.camRef;                      // what resolveCameraReference() returned this tick
  const raw = run.cameraReferenceFloor();      // the unheld answer, pure
  const tr = run.camTrace || {};
  return {
    i, x: run.playerWorldX(), y: p.y, vy: p.vy, grounded: !!p.grounded || p.y <= 0.01, jumps: p.jumps,
    launched: !!p.launched, route: run.route, feet, z, pan, fl,
    crown: C.screenYFor(feet - HERO_DRAW_H, z, pan, fl),
    ref, refRoute: ref ? ref.route : undefined, rawRoute: raw.route, raw,
    predicted: !!tr.predicted, falling: !!tr.falling, carry: Number(tr.carry) || 0,
    cap: tr.cap, floorPan: tr.floorPan, need: run.camGuardNeed,
    lock: pan + (GY - fl) * z,                 // the crane plus the anchor's lift, in screen px
    drop: prev ? feet - prev.feet : 0,
  };
}

/** Drives a run one tick at a time with a held jump button and lane clutter cleared. */
function driver(run, { keepSprings = false } = {}) {
  let hold = 0;
  const d = {
    frames: [], i: -1,
    press(n = 24) { Input.press('jump'); hold = n; },
    tick() {
      if (hold > 0 && --hold === 0) Input.release('jump');
      for (let k = run.obstacles.length - 1; k >= 0; k--) {
        if (!(keepSprings && run.obstacles[k].def?.isSpring)) run.obstacles.splice(k, 1);
      }
      const prev = d.frames[d.frames.length - 1] || null;
      run.update(DT); Input.endFrame();
      const rec = measure(run, ++d.i, prev);
      d.frames.push(rec);
      return rec;
    },
  };
  return d;
}

/** The staircase script: call `arm()` before each tick, `land()` after it. */
function stairScript(run, d, steps) {
  let next = 0;
  const hops = [];
  return {
    hops,
    climbed: () => next >= steps.length,
    arm() {
      if (next >= steps.length) return;
      const p = run.player;
      const gr = !!p.grounded || p.y <= 0.01;
      if (gr && run.playerWorldX() >= steps[next].x - run.speed * STAIR_LEAD) {
        d.press(24);
        hops.push({ k: next - 1, from: run.route, to: steps[next], t0: d.i + 1, takeoff: null, named: null, land: null, flickerRaw: 0, flickerRes: 0 });
        next++;
      }
    },
    land(rec) {
      const h = hops[hops.length - 1];
      if (!h || h.land != null) return;
      if (h.takeoff == null && !rec.grounded) h.takeoff = rec.i;
      if (h.named == null && rec.refRoute === h.to && rec.predicted) h.named = rec.i;
      if (h.named != null && rec.route !== h.to) {
        if (rec.rawRoute !== h.to) h.flickerRaw++;
        if (rec.refRoute !== h.to) h.flickerRes++;
      }
      if (rec.route === h.to) h.land = rec.i;
    },
  };
}

const steps = scout.routes.filter((r) => r.stack === 's1').sort((a, b) => a.x - b.x);
assert(steps.length === 4 && steps.map((s) => Math.round(s.entry)).join('/') === '29/62/95/128',
  `plumber-1 stack s1 is the 29/62/95/128 staircase (${steps.map((s) => Math.round(s.entry)).join('/')})`);
const fork = scout.routes.find((r) => r.kind === 'fork' && r.spring && r.sky);
assert(!!fork, 'plumber-1 has a sprung sky fork');
const top = steps[3];
const allFrames = [];   // every measured frame of every run, for the zoom check

// ---------------------------------------------------------------------------
// RUN A: up the staircase, stand on the top step, walk off it. Then restore
// a checkpoint taken on the top step.
// ---------------------------------------------------------------------------
const runA = makeRun(steps[0].x - 260);
const dA = driver(runA);
const stairsA = stairScript(runA, dA, runA.routes.filter((r) => r.stack === 's1').sort((a, b) => a.x - b.x));
const stepsA = runA.routes.filter((r) => r.stack === 's1').sort((a, b) => a.x - b.x);
const topA = stepsA[3];
let snap = null, snapTick = null, onTopFrames = 0, releaseA = null, standing = [];
let afterA = 0;
for (let i = 0; i < 60 * 14; i++) {
  stairsA.arm();
  const prevRoute = runA.route;
  const rec = dA.tick();
  stairsA.land(rec);
  if (rec.grounded && rec.route && rec.route.stack === 's1' && rec.route === runA.route) standing.push(rec);
  if (rec.route === topA && rec.grounded) {
    onTopFrames++;
    if (onTopFrames === 10) { snap = runA.makeSnapshot(); snapTick = rec.i; }
  }
  if (prevRoute === topA && runA.route !== topA && releaseA == null) releaseA = rec.i;
  if (releaseA != null && rec.grounded && !runA.route) { if ((afterA += DT) > 2.5) break; }
}
allFrames.push(...dA.frames);
const ZOOM = C.ZOOM;   // live: applyFraming settled it on the first tick
assert(ZOOM === EXPECTED_ZOOM, `the desktop tier's zoom is ${EXPECTED_ZOOM} (ZOOM ${ZOOM})`);
assert(stairsA.hops.length === 4 && stairsA.hops.every((h) => h.land != null) && onTopFrames >= 10 && releaseA != null,
  `run A climbed all four steps (landed ${stairsA.hops.filter((h) => h.land != null).length}/4), stood on the top ${onTopFrames} frames and walked off it at tick ${releaseA}`);

// 1. Standing on step k: the reference is step k, not predicted, authored rise.
{
  const seen = new Map();
  for (const rec of standing) {
    if (seen.has(rec.route)) continue;
    const ref = runA.camRef;
    seen.set(rec.route, rec);
  }
  // Re-ask on a fresh frame for each step: resolveCameraReference() on a
  // grounded hero is idempotent (same route as stored), so asking from the
  // test is harmless. Measured off the recorded frames: `ref` is the live
  // answer on that frame.
  let ok = true; const got = [];
  for (const k of [0, 1, 2, 3]) {
    const recs = standing.filter((r) => r.route === stepsA[k]);
    const rec = recs[Math.floor(recs.length / 2)] || recs[0];
    const ref = rec && rec.ref;
    const rise = ref ? ref.rise : NaN;
    const want = stepsA[k].entry;
    const pass = !!ref && ref.route === stepsA[k] && ref.predicted === false && Math.abs(rise - want) <= 1;
    ok = ok && pass;
    got.push(`k${k}: ${label(ref && ref.route)} ${ref && ref.predicted ? 'predicted' : 'live'} rise ${f1(rise)}/${want}`);
  }
  assert(ok, `1. standing on step k the reference is step k, live, at its authored rise (${got.join('; ')})`);
}

// 2. A hop from step k names step k+1 within 2 ticks of take-off, predicted,
//    at that step's top, and never names anything else before the landing.
{
  let ok = true; const got = [];
  for (const h of stairsA.hops) {
    const frames = dA.frames.slice(h.takeoff, h.land + 1);
    const first = frames.find((r) => r.refRoute === h.to && r.predicted);
    const lag = first ? first.i - h.takeoff : null;
    const atTop = first ? Math.abs(first.ref.floorY - h.to.topY) : NaN;
    const pass = first && lag <= 2 && atTop < 0.01 && h.flickerRaw === 0 && h.flickerRes === 0;
    ok = ok && !!pass;
    got.push(`${label(h.from)}→${label(h.to)}: named +${lag} tick${lag === 1 ? '' : 's'}, floorY ${first ? f1(first.ref.floorY) : '-'}=top ${f1(h.to.topY)}, flicker raw ${h.flickerRaw} resolved ${h.flickerRes}, flight ${h.land - h.takeoff} ticks`);
  }
  assert(ok, `2. each hop names the next step within 2 ticks of take-off, predicted, at its top, with zero flicker frames (${got.join(' | ')})`);
}

// 3. Walking off the top step: the lane within 3 ticks of release, read as a fall.
{
  const after = dA.frames.slice(releaseA, releaseA + 12);
  const lane = after.find((r) => !r.refRoute);
  const fall = after.find((r) => r.falling);
  const laneLag = lane ? lane.i - releaseA : null;
  const fallLag = fall ? fall.i - releaseA : null;
  assert(lane && laneLag <= 3 && fall && fallLag <= 3,
    `3. walking off the top step the reference is the lane +${laneLag} ticks after the release and the camera reads a fall +${fallLag} ticks (vy at release ${f1(dA.frames[releaseA].vy)}, feet ${f1(dA.frames[releaseA].feet)})`);
}

// 7. The lockstep on the 95→128 hop; zoom and crown on every hop.
{
  const h = stairsA.hops[3];
  const frames = dA.frames.slice(h.t0, h.land);   // press tick to the tick before the landing
  let worst = 0, worstAt = null;
  for (let i = 1; i < frames.length; i++) {
    const d = frames[i].lock - frames[i - 1].lock;
    if (d < worst) { worst = d; worstAt = frames[i]; }
  }
  const lockFrom = frames[0].lock, lockTo = frames[frames.length - 1].lock;
  assert(worst >= -0.01,
    `7a. 95→128 hop: camPan + (GROUND_Y − camFloorY)·z never decreases before the landing (${f2(lockFrom)} → ${f2(lockTo)} over ${frames.length} ticks, worst step ${f2(worst)}${worstAt ? ` at tick ${worstAt.i}` : ''})`);
  const zoomMiss = dA.frames.filter((r) => r.z !== ZOOM);
  assert(zoomMiss.length === 0, `7b. camZoom === ZOOM (${ZOOM}) on every frame of the staircase run (${dA.frames.length} frames, ${zoomMiss.length} off)`);
  let minCrown = Infinity, minAt = null;
  for (const hop of stairsA.hops) {
    for (const r of dA.frames.slice(hop.t0, hop.land + 1)) if (r.crown < minCrown) { minCrown = r.crown; minAt = { hop, r }; }
  }
  assert(minCrown >= 0, `7c. the crown stays on screen on every frame of every hop (min ${f1(minCrown)} px, ${label(minAt.hop.from)}→${label(minAt.hop.to)} tick ${minAt.r.i}, pan ${f1(minAt.r.pan)} floor ${f1(minAt.r.fl)})`);
}

// 8. Checkpoint restore from the top step opens settled. Driven directly:
//    the game reaches restoreSnapshot through updateDead() after a death
//    hold, which devInvuln and the cleared lane never produce here; the
//    camera half of the restore is the same call either way.
{
  assert(!!snap, `a snapshot was taken standing on the 128 step (tick ${snapTick})`);
  const movedOn = dA.frames.length - 1 - snapTick;
  runA.restoreSnapshot(snap);
  const ref = runA.camRef;
  const z0 = runA.camZoom, need0 = runA.camGuardNeed, capPrev0 = runA.camCapPrev;
  const pan0 = runA.camPan, fl0 = runA.camFloorY;
  const cap0 = C.guardGroundCap(fl0 - ref.floorY, ZOOM);
  const p = runA.player;
  const grounded = !!p.grounded || p.y <= 0.01;
  assert(z0 === ZOOM && need0 === undefined && capPrev0 === undefined,
    `8a. ${movedOn} ticks on, restoreSnapshot opens on the tier zoom with nothing latched (camZoom ${z0}, camGuardNeed ${need0}, camCapPrev ${capPrev0}; hero on ${label(runA.route)} ${grounded ? 'grounded' : 'airborne'})`);
  assert(ref && ref.route === runA.route && pan0 <= cap0 + 1e-9,
    `8b. the crane sits under the restored floor's ground cap (camPan ${f1(pan0)} <= cap ${f1(cap0)}, reference ${label(ref && ref.route)} floorY ${f1(ref && ref.floorY)})`);
  dA.tick();
  const dFloor = runA.camFloorY - fl0, dPan = runA.camPan - pan0;
  assert(Math.abs(dFloor) < 1 && runA.camZoom === ZOOM,
    `8c. the anchor was already settled: one tick moves camFloorY by ${f2(dFloor)} px (camFloorY ${f1(fl0)}, GROUND_Y − ${f1(GY - fl0)}; crane moved ${f2(dPan)} px)`);
}

// ---------------------------------------------------------------------------
// RUN B: up the staircase and a double off the top step.
// ---------------------------------------------------------------------------
const runB = makeRun(steps[0].x - 260);
runB.powerups.bonusJumps = () => 1;
const dB = driver(runB);
const stepsB = runB.routes.filter((r) => r.stack === 's1').sort((a, b) => a.x - b.x);
const stairsB = stairScript(runB, dB, stepsB);
const topB = stepsB[3];
let onTopT = 0, dbl = 0, repress = false, releaseB = null, afterB = 0, firstPress = null, secondPress = null;
for (let i = 0; i < 60 * 14; i++) {
  const p = runB.player;
  const gr = !!p.grounded || p.y <= 0.01;
  if (repress) { dB.press(20); repress = false; dbl = 2; secondPress = dB.i + 1; }
  else if (dbl === 1 && p.vy <= 0 && p.jumps === 1) { Input.release('jump'); repress = true; }
  else if (stairsB.climbed() && dbl === 0 && runB.route === topB && gr) {
    onTopT += DT;
    if (onTopT > 0.2) { dB.press(40); dbl = 1; firstPress = dB.i + 1; }
  } else stairsB.arm();
  const prevRoute = runB.route;
  const rec = dB.tick();
  stairsB.land(rec);
  if (prevRoute === topB && runB.route !== topB && releaseB == null) releaseB = rec.i;
  if (dbl === 2 && releaseB != null && rec.grounded && !runB.route) { if ((afterB += DT) > 1.5) break; }
}
allFrames.push(...dB.frames);
assert(stairsB.hops.every((h) => h.land != null) && dbl === 2 && releaseB != null,
  `run B climbed the staircase and doubled off the top step (presses at ticks ${firstPress} and ${secondPress}, released at ${releaseB})`);

// 4. The departed step is held while rising or still above its top; then the
//    lane within CAMERA_REF_DROP_TICKS + 1 ticks of the feet falling past it.
{
  const after = dB.frames.slice(releaseB);
  // Frames from the release while he is rising or his feet are above the top.
  let held = 0, broken = null, below = null;
  for (const r of after) {
    const above = r.feet < topB.topY - 0.01;
    if (r.grounded) break;
    if (r.vy > 0 || above) {
      held++;
      if (r.refRoute !== topB && !broken) broken = r;
    } else { below = r; break; }
  }
  const lane = below ? after.find((r) => r.i >= below.i && !r.refRoute) : null;
  const laneLag = lane ? lane.i - below.i : null;
  assert(held > 0 && !broken && below && lane && laneLag <= CAMERA_REF_DROP_TICKS + 1,
    `4. a double off the top step holds the step for ${held} airborne ticks while rising or above its top${broken ? ` (BROKEN at tick ${broken.i}: ${label(broken.refRoute)} vy ${f1(broken.vy)} feet ${f1(broken.feet)})` : ''}; feet fell past the top at tick ${below ? below.i : '-'} and the lane took over +${laneLag} ticks (limit ${CAMERA_REF_DROP_TICKS + 1})`);
  const risingAfterRelease = after.filter((r) => r.vy > 0 && !r.grounded);
  const risingHeld = risingAfterRelease.every((r) => r.refRoute === topB);
  assert(risingHeld, `4'. while vy > 0 after the release the reference is still the top step (${risingAfterRelease.length} rising ticks)`);
}

// ---------------------------------------------------------------------------
// RUN C: the spring pad, the sky road, a gap jumped and a gap walked into.
// ---------------------------------------------------------------------------
const runC = makeRun(fork.x - 420);
const dC = driver(runC, { keepSprings: true });
const forkC = runC.routes.find((r) => r.kind === 'fork' && r.spring && r.sky);
const gaps = forkC.gaps.slice().sort((a, b) => a.x - b.x);
let launchTick = null, landTick = null, padSeen = false;
const gapHops = [];   // the first two gaps are jumped, the third walked into
let gapIdx = 0, walkRelease = null, laneLand = null, afterC = 0;
for (let i = 0; i < 60 * 16; i++) {
  const p = runC.player;
  const gr = !!p.grounded || p.y <= 0.01;
  if (!padSeen && runC.obstacles.some((o) => o.def?.isSpring)) padSeen = true;
  if (runC.route === forkC && gr && gapIdx < 2 && runC.playerWorldX() >= gaps[gapIdx].x - runC.speed * 0.3) {
    dC.press(24);
    gapHops.push({ gap: gaps[gapIdx], t0: dC.i + 1, takeoff: null, land: null, off: 0, refX: null });
    gapIdx++;
  }
  const prevRoute = runC.route;
  const rec = dC.tick();
  if (launchTick == null && rec.launched) launchTick = rec.i;
  if (launchTick != null && landTick == null && rec.route === forkC && rec.grounded) landTick = rec.i;
  const h = gapHops[gapHops.length - 1];
  if (h && h.land == null) {
    if (h.takeoff == null && !rec.grounded) h.takeoff = rec.i;
    if (h.takeoff != null && rec.grounded) { h.land = rec.i; h.landX = rec.x; }
    else if (h.takeoff != null) {
      if (!(rec.refRoute === forkC && rec.predicted)) h.off++;
      h.refX = rec.ref ? rec.ref.x : null;
    }
  }
  if (gapIdx === 2 && prevRoute === forkC && !runC.route && walkRelease == null) walkRelease = rec.i;
  if (walkRelease != null && laneLand == null && rec.grounded && !runC.route) laneLand = rec.i;
  if (laneLand != null) { if ((afterC += DT) > 1.0) break; }
}
allFrames.push(...dC.frames);
assert(padSeen && launchTick != null && landTick != null && gapHops.length === 2 && gapHops.every((h) => h.land != null) && walkRelease != null && laneLand != null,
  `run C was sprung (tick ${launchTick}), landed on the sky road (tick ${landTick}), jumped two gaps and walked into the third (released ${walkRelease}, on the lane ${laneLand})`);

// 5. The spring launch names the lip within 2 ticks, predicted, and the anchor
//    moves toward the full lip while he is still in flight.
{
  const flight = dC.frames.slice(launchTick, landTick + 1);
  const first = flight.find((r) => r.refRoute === forkC && r.predicted);
  const lag = first ? first.i - launchTick : null;
  const lip = runC.routeGroundY(forkC.x, forkC);
  const lipAtLanding = first ? runC.routeGroundY(first.ref.x, forkC) : NaN;
  assert(first && lag <= 2 && Math.abs(first.ref.floorY - lipAtLanding) < 0.01 && Math.abs(first.ref.floorY - lip) <= 8,
    `5a. the spring launch names the fork +${lag} ticks, predicted, floorY ${f1(first && first.ref.floorY)} = the road at the landing column (${f1(lipAtLanding)}; lip at fork.x ${f1(lip)}, entry ${forkC.entry}) with the hero at feet ${f1(first && first.feet)} vy ${f1(first && first.vy)}`);
  const atLaunch = dC.frames[launchTick].fl;
  const lastAir = flight[flight.length - 2];   // the tick before the landing
  let monotone = true;
  for (let i = (first ? first.i - launchTick : 0) + 1; i < flight.length - 1; i++) if (flight[i].fl > flight[i - 1].fl + 0.01) monotone = false;
  assert(first && lastAir.fl < atLaunch - 30 && lastAir.fl >= GY - forkC.entry - 0.01 && monotone,
    `5b. the anchor sets off for the lip in flight: camFloorY ${f1(atLaunch)} → ${f1(lastAir.fl)} on the last airborne tick (target GROUND_Y − entry = ${f1(GY - forkC.entry)}), ${monotone ? 'monotone' : 'NOT monotone'}, ${flight.length} ticks in the air`);
}

// 6. Gaps: jumped with the route set, the road at the landing x; walked into,
//    the lane within 3 ticks and the fall carried.
{
  for (const h of gapHops) {
    const err = Math.abs(h.refX - h.landX);
    const air = dC.frames.slice(h.takeoff, h.land);
    const heldSameRoute = air.filter((r) => r.refRoute === forkC && !r.predicted).length;
    const floorAtTakeoff = dC.frames[h.takeoff - 1].ref.floorY;
    const floorAtLanding = runC.routeGroundY(h.landX, forkC);
    assert(h.off === 0 && err <= 6,
      `6a. gap@${f1(h.gap.x)} (road ${floorAtLanding < floorAtTakeoff - 0.01 ? 'rising' : floorAtLanding > floorAtTakeoff + 0.01 ? 'dipping' : 'level'} ahead: take-off floor ${f1(floorAtTakeoff)}, landing floor ${f1(floorAtLanding)}): the reference is the road at the landing x on every airborne tick — ${h.land - h.takeoff} airborne ticks, ${h.off} not predicted-on-road (${heldSameRoute} held on the take-off column), predicted landing x ${f1(h.refX)} vs actual ${f1(h.landX)} (Δ ${f1(err)})`);
  }
  const after = dC.frames.slice(walkRelease, laneLand + 1);
  const lane = after.find((r) => !r.refRoute);
  const laneLag = lane ? lane.i - walkRelease : null;
  const fallFrames = after.filter((r) => r.falling);
  const dropped = fallFrames.filter((r) => r.drop > 0);
  const uncarried = dropped.filter((r) => !(r.carry > 0));
  assert(lane && laneLag <= 3 && fallFrames.length > 0 && dropped.length > 0 && uncarried.length === 0,
    `6b. walked into the third gap the lane is the reference +${laneLag} ticks (drop ${f1(dC.frames[walkRelease].feet - dC.frames[walkRelease - 1].feet)} rebased; fell ${f1(after[after.length - 1].feet - after[0].feet)} px over ${after.length} ticks); ${fallFrames.length} falling frames, carry > 0 on ${dropped.length - uncarried.length}/${dropped.length} that dropped${uncarried.length ? ` (uncarried at ticks ${uncarried.map((r) => r.i).join(',')})` : ''}`);
}

// Zoom across every run.
{
  const miss = allFrames.filter((r) => r.z !== ZOOM);
  assert(miss.length === 0, `camZoom === ${ZOOM} on all ${allFrames.length} measured frames across the three runs (${miss.length} off)`);
}

if (process.env.CAM_TRACE) {
  const want = process.env.CAM_TRACE.split(':');
  const d = { A: dA, B: dB, C: dC }[want[0]];
  const a = Number(want[1] || 0), b = Number(want[2] || a + 60);
  for (const r of d.frames.slice(a, b)) {
    console.log(`  t${r.i} x ${f1(r.x)} y ${f1(r.y)} vy ${f1(r.vy)} ${r.grounded ? 'G' : 'air'} route ${label(r.route)} ref ${label(r.refRoute)}${r.predicted ? 'P' : ''} ${f1(r.ref && r.ref.floorY)} raw ${label(r.rawRoute)} fl ${f1(r.fl)} pan ${f1(r.pan)} cap ${f1(r.cap)} fp ${f1(r.floorPan)} need ${f1(r.need)} crown ${f1(r.crown)} ${r.falling ? 'FALL' : ''} carry ${f1(r.carry)} lock ${f1(r.lock)}`);
  }
}

console.log(failed ? 'CAMERA REFERENCE FLOOR: FAILED' : 'CAMERA REFERENCE FLOOR: PASSED');
process.exit(failed ? 1 : 0);
