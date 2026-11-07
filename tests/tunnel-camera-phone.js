// THE TUNNEL ON A PHONE — plumber-1's underground section driven headlessly
// through the real RunState at the phone tier (zoom 2.2), where the frame is
// smallest and the crane has least to spend. Two scenarios:
//
//   (a) the UPPER PATH: a single jump over the mouth that lands past it, a
//       single over the mid-span hole, then the drop into the roof gap at the
//       far end and the climb home — the whole section on the lane above.
//   (b) the CHAMBER: run into the mouth without jumping (the tunnel claims
//       him through tunnelMouthAt), a single inside, a double inside, then
//       the staged exit. The double's second press comes late (vy <= -200):
//       pressed at the apex it tops out at ~107 px over a 96 px chamber and the
//       lane above catches him (updateRoute's climb-out), which is the game's
//       rule, not the camera's — pressed late it stays a double under the roof.
//
// Asserted on every frame of both:
//   - camZoom is the tier's zoom (the zoom never moves in a run)
//   - the crown stays on screen on every frame of a single; the double in the
//     chamber may put it over the top by <= 14 px, and only on frames where the
//     ground cap is what binds the crane (camTrace.floorPan >= cap - 0.5)
//   - the crane moves <= GUARD_SPEED/60 + 0.5 px a frame, except where its own
//     crown floor binds (then it rides the hero's rise: <= rise*z + 0.5) or it
//     comes down WITH a fall (camTrace.panCarry: <= carry + 5.2)
//   - the latched guard need is never reset while the hero is airborne — in
//     particular across the +0.35 s hand-over after the mouth and at the exit;
//     it may only drop by what the anchor took in lockstep (anchorCarry) unless
//     he has dwelt GUARD_DWELL on the ground
//   - the camera's own screen motion (camTrace.own) is <= 380 px/s
import { installDom } from './dom-stub.js';
installDom();
window.__mash_platform = { isDesktop: false, isIphone: true };

const { RunState } = await import('../src/game/run.js');
const { save } = await import('../src/engine/save.js');
const { Input } = await import('../src/engine/input.js');
const { STAGE_BY_ID } = await import('../src/data/stages.js');
const C = await import('../src/engine/camera.js');
const { H } = await import('../src/engine/renderer.js');
const { HERO_DRAW_H } = await import('../src/game/draw.js');
const { tunnelOpenings } = await import('../src/game/routes.js');

save.load(); save.newSlot(0, 0);

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}
const f1 = (v) => (Number.isFinite(Number(v)) ? Number(v).toFixed(1) : String(v));
const f2 = (v) => (Number.isFinite(Number(v)) ? Number(v).toFixed(2) : String(v));

const DT = 1 / 60;
const EXPECTED_ZOOM = 2.2;                     // run.js ZOOM_PHONE
const TUNNEL_CAMERA_RETURN_DELAY_SEC = 0.35;   // run.js, not exported
const DPAN_FREE = C.GUARD_SPEED / 60 + 0.5;    // 5.17 px a frame
const OWN_MAX = 380 + 1;
const OWN_BOUND_MAX = 900;
const DOUBLE_CLIP_MAX = 14;
const EPS = 1e-6;                              // the crown floor binds to 0 exactly; −1e-14 is 0
const DOUBLE_LATE_VY = -200;                   // the chamber double's second press (see (b))
const JUMP_LEAD_SEC = 0.2;                     // press this long before an opening

const stage = STAGE_BY_ID['plumber-1'];
const baseOpts = { stage, team: ['lorenzo'], save, seed: 12345, difficulty: 1, skipRunIn: true, devInvuln: true, onEnd: () => {} };
const scout = new RunState(baseOpts); scout.enter();
const TOTAL = scout.totalDist;
function makeRun(startX) {
  const run = new RunState({ ...baseOpts, devStartPercent: Math.max(0, (startX - 46) / TOTAL) });
  run.enter();
  return run;
}
const scoutTunnel = scout.routes.find((r) => r.kind === 'tunnel');
assert(!!scoutTunnel, 'plumber-1 has an authored tunnel');

function measure(run, i, prev) {
  const p = run.player;
  const z = run.camZoom, pan = run.camPan, fl = run.camFloorY;
  const feet = run.playerGroundY() - p.y;
  const tr = run.camTrace || {};
  const rec = {
    i, x: run.playerWorldX(), y: p.y, vy: p.vy, grounded: !!p.grounded || p.y <= 0.01, jumps: p.jumps,
    route: run.route, feet, z, pan, fl,
    crown: C.screenYFor(feet - HERO_DRAW_H, z, pan, fl),
    feetS: C.screenYFor(feet, z, pan, fl),
    need: Number(run.camGuardNeed), dwell: Number(run.camGuardDwell) || 0,
    cap: Number(tr.cap), floorPan: Number(tr.floorPan), own: Number(tr.own), panCarry: Number(tr.panCarry) || 0,
    carry: Number(tr.carry) || 0, falling: !!tr.falling, refRoute: tr.refRoute, ref: tr.ref,
    dpan: prev ? pan - prev.pan : 0,
    rise: prev ? Math.max(0, prev.feet - feet) : 0,
    anchorCarry: prev ? Math.min(0, (fl - prev.fl) * z) : 0,
    dneed: prev && Number.isFinite(prev.need) ? Number(run.camGuardNeed) - prev.need : 0,
  };
  rec.fpBinds = Number.isFinite(rec.floorPan) && Math.abs(pan - rec.floorPan) <= 0.5;
  rec.capBinds = Number.isFinite(rec.cap) && Number.isFinite(rec.floorPan) && rec.floorPan >= rec.cap - 0.5;
  return rec;
}

function driver(run) {
  let hold = 0;
  const d = {
    frames: [], i: -1,
    press(n = 24) { Input.press('jump'); hold = n; },
    tick() {
      if (hold > 0 && --hold === 0) Input.release('jump');
      run.obstacles.length = 0;
      const prev = d.frames[d.frames.length - 1] || null;
      run.update(DT); Input.endFrame();
      const rec = measure(run, ++d.i, prev);
      d.frames.push(rec);
      return rec;
    },
  };
  return d;
}

/** The per-frame contract, over `frames`; `doubleAir` marks the double's airborne ticks. */
function checkFrames(tag, frames, { doubleAir = () => false } = {}) {
  const ZOOM = C.ZOOM;
  const zoomMiss = frames.filter((r) => r.z !== ZOOM);
  assert(ZOOM === EXPECTED_ZOOM && zoomMiss.length === 0,
    `${tag}: camZoom === ${EXPECTED_ZOOM} on all ${frames.length} frames (ZOOM ${ZOOM}, ${zoomMiss.length} off)`);

  // The crown.
  let minSingle = Infinity, minSingleAt = null, minDouble = Infinity, minDoubleAt = null, doubleUnbound = 0, doubleFrames = 0;
  for (const r of frames) {
    if (doubleAir(r)) {
      doubleFrames++;
      if (r.crown < minDouble) { minDouble = r.crown; minDoubleAt = r; }
      if (r.crown < -EPS && !r.capBinds) doubleUnbound++;
    } else if (r.crown < minSingle) { minSingle = r.crown; minSingleAt = r; }
  }
  assert(minSingle >= -EPS,
    `${tag}: the crown is on screen on every frame outside the double (min ${f1(minSingle)} px at tick ${minSingleAt && minSingleAt.i}, x ${f1(minSingleAt && minSingleAt.x)}, y ${f1(minSingleAt && minSingleAt.y)}, pan ${f1(minSingleAt && minSingleAt.pan)}, floor ${f1(minSingleAt && minSingleAt.fl)})`);
  if (doubleFrames) {
    assert(minDouble >= -DOUBLE_CLIP_MAX - EPS && doubleUnbound === 0,
      `${tag}: the double's crown clips the top by <= ${DOUBLE_CLIP_MAX} px and only where the ground cap binds (min ${f1(minDouble)} px at tick ${minDoubleAt && minDoubleAt.i}, ${doubleUnbound} clipped frames with the cap not binding, ${doubleFrames} airborne frames)`);
  }
  const feetOver = frames.filter((r) => r.feetS > H);
  assert(feetOver.length === 0, `${tag}: the feet never leave the bottom of the frame (${feetOver.length} frames over H=${H}${feetOver.length ? `, worst ${f1(Math.max(...feetOver.map((r) => r.feetS - H)))} px at tick ${feetOver[0].i}` : ''})`);

  // The crane's step.
  let worstFree = 0, worstFreeAt = null, worstBound = 0, worstBoundAt = null, worstCarry = 0, worstCarryAt = null;
  let nBound = 0, nCarry = 0, bad = [];
  for (let i = 1; i < frames.length; i++) {
    const r = frames[i];
    const ad = Math.abs(r.dpan);
    if (r.fpBinds) {
      nBound++;
      const lim = r.rise * r.z + 0.5;
      if (ad - lim > worstBound) { worstBound = ad - lim; worstBoundAt = r; }
      if (ad > lim) bad.push(r);
    } else if (r.panCarry > 0) {
      nCarry++;
      const lim = r.panCarry + DPAN_FREE;
      if (ad - lim > worstCarry) { worstCarry = ad - lim; worstCarryAt = r; }
      if (ad > lim) bad.push(r);
    } else {
      if (ad > worstFree) { worstFree = ad; worstFreeAt = r; }
      if (ad > DPAN_FREE) bad.push(r);
    }
  }
  assert(bad.length === 0,
    `${tag}: |Δpan| <= ${f2(DPAN_FREE)} on free frames (max ${f2(worstFree)} at tick ${worstFreeAt && worstFreeAt.i}), <= rise·z + 0.5 on the ${nBound} crown-floor frames (worst excess ${f2(worstBound)}${worstBoundAt ? ` at tick ${worstBoundAt.i}` : ''}), <= carry + ${f2(DPAN_FREE)} on the ${nCarry} pan-carry frames (worst excess ${f2(worstCarry)}${worstCarryAt ? ` at tick ${worstCarryAt.i}` : ''})${bad.length ? `; ${bad.length} frames over, first at tick ${bad[0].i} (Δpan ${f2(bad[0].dpan)}, rise ${f1(bad[0].rise)}, carry ${f2(bad[0].panCarry)}, floorPan ${f1(bad[0].floorPan)}, pan ${f1(bad[0].pan)})` : ''}`);

  // The latch while airborne.
  const resets = [];
  let airborne = 0, strictDrops = 0;
  for (let i = 1; i < frames.length; i++) {
    const r = frames[i], q = frames[i - 1];
    if (r.grounded || !Number.isFinite(r.need) || !Number.isFinite(q.need)) continue;
    airborne++;
    if (r.dwell >= C.GUARD_DWELL) continue;
    if (r.need < q.need - 0.5) strictDrops++;
    if (r.need < q.need + r.anchorCarry - 0.5) resets.push(r);
  }
  assert(resets.length === 0,
    `${tag}: camGuardNeed is never reset while airborne — ${airborne} airborne frames, ${resets.length} drops beyond the anchor's lockstep (${strictDrops} frames where it fell by > 0.5 at all)${resets.length ? `; first at tick ${resets[0].i}: need ${f1(frames[resets[0].i - 1].need)} → ${f1(resets[0].need)}, anchorCarry ${f2(resets[0].anchorCarry)}, x ${f1(resets[0].x)}, y ${f1(resets[0].y)}, route ${resets[0].route ? resets[0].route.kind : 'lane'}` : ''}`);

  // The camera's own motion, on free frames and on crown-floor frames. On a
  // crown-floor frame the crane rides the hero's own rise — on the upper path
  // the fixed 48px lift (TUNNEL_CAMERA_UPPER_PATH_LIFT) leaves a 2.2 frame 38px
  // of sky, so a single over the hole outruns GUARD_SPEED for ~7 frames and
  // the crown floor carries the crane at his rate (measured 428 px/s). The
  // same allowance as tests/camera-run-offscreen.js G2: 900 on those frames.
  let maxFree = 0, maxFreeAt = null, maxBound = 0, maxBoundAt = null, nBoundOwn = 0;
  for (const r of frames) {
    if (!Number.isFinite(r.own)) continue;
    const a = Math.abs(r.own);
    if (r.fpBinds) { nBoundOwn++; if (a > maxBound) { maxBound = a; maxBoundAt = r; } }
    else if (a > maxFree) { maxFree = a; maxFreeAt = r; }
  }
  assert(maxFree <= OWN_MAX,
    `${tag}: camTrace.own <= ${OWN_MAX} px/s on every free frame (max ${f1(maxFree)} at tick ${maxFreeAt && maxFreeAt.i}, x ${f1(maxFreeAt && maxFreeAt.x)})`);
  assert(maxBound <= OWN_BOUND_MAX,
    `${tag}: camTrace.own <= ${OWN_BOUND_MAX} px/s on the ${nBoundOwn} crown-floor frames (max ${f1(maxBound)} at tick ${maxBoundAt && maxBoundAt.i}, x ${f1(maxBoundAt && maxBoundAt.x)}, y ${f1(maxBoundAt && maxBoundAt.y)}, vy ${f1(maxBoundAt && maxBoundAt.vy)}, Δpan ${f2(maxBoundAt && maxBoundAt.dpan)})`);
}

/** Where the hand-over after the mouth and the exit fall in `frames`. */
function landmarks(run, tunnel, frames) {
  const speed = run.steadySpeed();
  const handX = tunnel.x + speed * TUNNEL_CAMERA_RETURN_DELAY_SEC;
  const hand = frames.find((r) => r.x >= handX);
  const exit = frames.find((r) => r.x >= tunnel.x + tunnel.w);
  const fmt = (r) => (r ? `tick ${r.i} (x ${f1(r.x)}, ${r.grounded ? 'grounded' : 'airborne'}, need ${f1(r.need)}, pan ${f1(r.pan)}, floor ${f1(r.fl)})` : 'not reached');
  return `hand-over +0.35 s at ${fmt(hand)}; exit at ${fmt(exit)}`;
}

// ---------------------------------------------------------------------------
// (a) THE UPPER PATH.
// ---------------------------------------------------------------------------
{
  const run = makeRun(scoutTunnel.x - 400);
  const tunnel = run.routes.find((r) => r.kind === 'tunnel');
  const openings = tunnelOpenings(tunnel);
  const [mouth, hole, roofGap] = openings;
  const d = driver(run);
  let next = 0, claimedEarly = null, dropped = null, after = 0;
  const jumps = [];
  for (let i = 0; i < 60 * 20; i++) {
    const p = run.player;
    const gr = !!p.grounded || p.y <= 0.01;
    if (next < 2 && gr && !run.route && run.playerWorldX() >= openings[next].x - run.speed * JUMP_LEAD_SEC) {
      d.press(24); jumps.push({ over: openings[next], t0: d.i + 1, land: null }); next++;
    }
    const rec = d.tick();
    const j = jumps[jumps.length - 1];
    if (j && j.land == null && rec.i > j.t0 && rec.grounded) { j.land = rec.i; j.landX = rec.x; }
    if (claimedEarly == null && run.route === tunnel && rec.x < roofGap.x) claimedEarly = rec;
    if (dropped == null && run.route === tunnel && rec.x >= roofGap.x) dropped = rec;
    if (rec.x > tunnel.x + tunnel.w && rec.grounded && !run.route) { if ((after += DT) > 1.0) break; }
  }
  const F = d.frames;
  assert(jumps.length === 2 && jumps.every((j) => j.land != null) && !claimedEarly && jumps[0].landX > mouth.x + mouth.w && jumps[1].landX > hole.x + hole.w,
    `(a) a single cleared the mouth [${f1(mouth.x)}+${f1(mouth.w)}] landing at x ${f1(jumps[0] && jumps[0].landX)} and a single cleared the hole [${f1(hole.x)}+${f1(hole.w)}] landing at x ${f1(jumps[1] && jumps[1].landX)}; the tunnel was ${claimedEarly ? `CLAIMED at x ${f1(claimedEarly.x)}` : 'never claimed on the way'}`);
  assert(!!dropped && after > 1.0,
    `(a) the upper path dropped into the roof gap at x ${f1(dropped && dropped.x)} (tick ${dropped && dropped.i}) and came home on the lane past x ${f1(tunnel.x + tunnel.w)} (${F.length} frames)`);
  console.log(`(a) ${landmarks(run, tunnel, F)}`);
  checkFrames('(a) upper path', F);
  if (process.env.CAM_TRACE && process.env.CAM_TRACE.startsWith('a')) dump(F, process.env.CAM_TRACE);
}

// ---------------------------------------------------------------------------
// (b) THE CHAMBER.
// ---------------------------------------------------------------------------
{
  const run = makeRun(scoutTunnel.x - 400);
  run.powerups.bonusJumps = () => 1;
  const tunnel = run.routes.find((r) => r.kind === 'tunnel');
  const [mouth, hole] = tunnelOpenings(tunnel);
  const floorAt = (x) => run.routeGroundY(x, tunnel);
  // Where the chamber is flat at its full depth: after the entrance slide and
  // before the exit climb.
  const chamberFrom = tunnel.x + tunnel.w * (tunnel.lip + tunnel.climb);
  const chamberTo = tunnel.x + tunnel.w * tunnel.hold;
  const singleX = chamberFrom + 40;
  const doubleX = Math.max(singleX + 140, hole.x - 90);
  const d = driver(run);
  let claim = null, single = null, dbl = null, repress = false, dblPhase = 0, after = 0, caught = null;
  for (let i = 0; i < 60 * 20; i++) {
    const p = run.player;
    const gr = !!p.grounded || p.y <= 0.01;
    const x = run.playerWorldX();
    if (repress) { d.press(20); repress = false; dblPhase = 2; dbl.t1 = d.i + 1; }
    else if (dblPhase === 1 && p.vy <= DOUBLE_LATE_VY && p.jumps === 1) { Input.release('jump'); repress = true; }
    else if (run.route === tunnel && gr && !single && x >= singleX) { d.press(24); single = { t0: d.i + 1, land: null }; }
    else if (run.route === tunnel && gr && single && single.land != null && !dbl && x >= doubleX) { d.press(40); dbl = { t0: d.i + 1, t1: null, land: null }; dblPhase = 1; }
    const prevRoute = run.route;
    const rec = d.tick();
    if (claim == null && run.route === tunnel) claim = rec;
    if (single && single.land == null && rec.i > single.t0 && rec.grounded) { single.land = rec.i; single.apex = Math.max(...d.frames.slice(single.t0, rec.i).map((r) => r.y)); }
    if (dbl && dbl.land == null && dblPhase === 2 && rec.i > dbl.t1 && rec.grounded) { dbl.land = rec.i; dbl.apex = Math.max(...d.frames.slice(dbl.t0, rec.i).map((r) => r.y)); dbl.landRoute = run.route; }
    if (caught == null && prevRoute === tunnel && !run.route && rec.x < chamberTo) caught = rec;
    if (rec.x > tunnel.x + tunnel.w && rec.grounded && !run.route) { if ((after += DT) > 1.0) break; }
  }
  const F = d.frames;
  assert(!!claim && claim.x < mouth.x + mouth.w && !claim.grounded,
    `(b) running into the mouth claimed the tunnel at x ${f1(claim && claim.x)} (tick ${claim && claim.i}, airborne over a ${f1(-tunnel.entry)} px entry; chamber floor ${f1(-tunnel.peak)} px down from x ${f1(chamberFrom)} to ${f1(chamberTo)})`);
  assert(single && single.land != null && dbl && dbl.land != null && dbl.landRoute === tunnel && !caught,
    `(b) a single inside the chamber (ticks ${single && single.t0}–${single && single.land}, apex ${f1(single && single.apex)}) and a double (presses ${dbl && dbl.t0} and ${dbl && dbl.t1}, landed ${dbl && dbl.land}, apex ${f1(dbl && dbl.apex)}) both came down on the tunnel floor${caught ? ` — but the lane above CAUGHT him at x ${f1(caught.x)}` : ''}`);
  assert(after > 1.0, `(b) the exit climb brought him home on the lane past x ${f1(tunnel.x + tunnel.w)} (${F.length} frames)`);
  console.log(`(b) ${landmarks(run, tunnel, F)}`);
  const doubleAir = (r) => !!dbl && r.i >= dbl.t0 && r.i < dbl.land && !r.grounded;
  checkFrames('(b) chamber', F, { doubleAir });
  if (process.env.CAM_TRACE && process.env.CAM_TRACE.startsWith('b')) dump(F, process.env.CAM_TRACE);
}

function dump(F, spec) {
  const [, a, b] = spec.split(':');
  for (const r of F.slice(Number(a || 0), Number(b || Number(a || 0) + 60))) {
    console.log(`  t${r.i} x ${f1(r.x)} y ${f1(r.y)} vy ${f1(r.vy)} ${r.grounded ? 'G' : 'air'} route ${r.route ? r.route.kind : 'lane'} ref ${r.refRoute || 'lane'} ${f1(r.ref)} fl ${f1(r.fl)} pan ${f1(r.pan)} dpan ${f2(r.dpan)} cap ${f1(r.cap)} fp ${f1(r.floorPan)}${r.fpBinds ? '*' : ''} need ${f1(r.need)} crown ${f1(r.crown)} feetS ${f1(r.feetS)} own ${f1(r.own)} pc ${f2(r.panCarry)} ${r.falling ? 'FALL' : ''}`);
  }
}

console.log(failed ? 'TUNNEL CAMERA PHONE: FAILED' : 'TUNNEL CAMERA PHONE: PASSED');
process.exit(failed ? 1 : 0);
