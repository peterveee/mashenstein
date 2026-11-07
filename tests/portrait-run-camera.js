// THE PORTRAIT RUN CAMERA, measured through the real RunState on a phone frame.
//
// Portrait is pan-only at worldZoom 3.5, and the contract is stated as the
// numbers a feel reduces to, per frame, on the scenarios that used to break it:
//
//   - the crown stays at least 6px under the top of the gameplay band (it went
//     11px into the HUD pill on the hop onto a 4-step stack's top tread);
//   - the feet never enter the message shelf (they went 15–18px in on a
//     sky-road gap fall);
//   - the pan moves at no more than PORTRAIT_PAN_MAX_SPEED (900 logical px/s,
//     15px a frame) except where it is carrying the hero's own drop, and then
//     by no more than that drop plus the 400px/s catch-up; nothing ever cuts
//     by 100px in a frame (the gap landings stepped +92/−191, plumber-3's
//     upper path −293);
//   - every level opens on pan 0 and is back on it within 3s of the last route;
//   - from a spring pad firing to the landing on the road the pan only rises
//     (the preview used to be dropped 6–11 frames before the landing and the
//     pan sagged 67 → 38 → up again on every launch).
//
// Scenarios: the scripted plumber-1 s1 staircase (29/62/95/128), walked off the
// top and doubled off it; the sprung sky fork on plumber-1 (gaps 1–2 jumped,
// fall at gap 3) and frost-1 (fall at its one gap); plumber-3's upper path
// over the tunnel under the demo bot. Three handsets: 375×812/50, 390×844/59,
// 430×932/59.
import { installDom } from './dom-stub.js';

installDom({ innerWidth: 390, innerHeight: 844 });
window.__mash_platform = { isDesktop: false, isIphone: true };

const { frameForViewport } = await import('../src/engine/frame.js');
const renderer = await import('../src/engine/renderer.js');
const { RunState } = await import('../src/game/run.js');
const { save } = await import('../src/engine/save.js');
const { STAGE_BY_ID } = await import('../src/data/stages.js');
const { Input } = await import('../src/engine/input.js');
const { DemoBot } = await import('../src/game/bot.js');
const { GROUND_Y, screenYFor } = await import('../src/engine/camera.js');
const { HERO_DRAW_H } = await import('../src/game/draw.js');

save.load(); save.newSlot(0, 0);

const TICK = 1 / 60;
const HERO_START_X = 46;
const VIEWPORTS = [[375, 812, 50], [390, 844, 59], [430, 932, 59]];
const PAN_STEP_MAX = 900 / 60 + 0.5;      // the spring's cap, per frame
const CATCHUP_STEP_MAX = 400 / 60 + 0.5;  // the carried fall's catch-up, per frame
const CROWN_MARGIN = 6;
const SETTLE_S = 3;
const CUT = 100;
const STAIR_LEAD = 0.45;
const STAIR_START_BACK = 260;

let failed = false;
function check(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
}
const r1 = (v) => (Number.isFinite(v) ? v.toFixed(1) : String(v));

function frameFor([w, h, top]) {
  return frameForViewport({
    mode: 'phone-portrait', viewportWidth: w, viewportHeight: h,
    safeInsets: { top, right: 0, bottom: 34, left: 0 }, revision: 1,
  });
}

// A fresh, entered run on a phone frame. `startX` skips ahead via
// devStartPercent, measured off a throwaway run. enter() leaves the renderer
// on its default frame, so the portrait frame is re-applied after it.
function makeRun(stageId, vp, { startX = null, team = ['lorenzo'], seed = 1337 } = {}) {
  const stage = STAGE_BY_ID[stageId];
  const box = { result: null };
  const opts = { stage, team, save, seed, difficulty: 1, skipRunIn: true, devInvuln: true, onEnd: (r) => { box.result = r; } };
  if (startX != null) {
    const probe = new RunState({ ...opts, onEnd: () => {} });
    probe.enter();
    opts.devStartPercent = Math.max(0, (startX - HERO_START_X) / probe.totalDist);
  }
  const run = new RunState(opts);
  run.enter();
  renderer.setPresentationFrame(frameFor(vp));
  return { run, box };
}

function measure(run, prev) {
  const p = run.player;
  const floor = run.playerGroundY();
  const feet = floor - (Number(p.y) || 0);
  const z = run.camZoom;
  const pan = run.camPan;
  const fit = run.portraitFrameFitState || {};
  const tr = run.camTrace || null;
  return {
    x: run.playerWorldX(), y: Number(p.y) || 0, vy: Number(p.vy) || 0,
    grounded: !!p.grounded || (Number(p.y) || 0) <= 0.01,
    feet, pan, z,
    crown: screenYFor(feet - HERO_DRAW_H, z, pan, GROUND_Y),
    feetS: screenYFor(feet, z, pan, GROUND_Y),
    bandTop: Number(fit.playableTop), bandBottom: Number(fit.playableBottom),
    dpan: prev ? pan - prev.pan : 0,
    drop: prev ? Math.max(0, feet - prev.feet) : 0,
    carried: !!tr && (Number(tr.panCarry) > 0 || tr.falling === true),
    highPath: fit.highPath === true, highPathPan: fit.highPathPan,
    route: run.route, launched: !!p.launched, dead: !!run.dead,
    mode: renderer.presentationFrame()?.mode,
  };
}

// ---- the scripted staircase -------------------------------------------------
function stairs(stageId, vp, { double = false, label = 's1' } = {}) {
  const scout = makeRun(stageId, vp).run;
  const first = scout.routes.filter((r) => r.stack === label).sort((a, b) => a.x - b.x)[0];
  const { run, box } = makeRun(stageId, vp, { startX: first.x - STAIR_START_BACK });
  const steps = run.routes.filter((r) => r.stack === label).sort((a, b) => a.x - b.x);
  const top = steps[steps.length - 1];
  const frames = [];
  const compPans = steps.map(() => null);
  let nextIdx = 0, hold = 0, dbl = 0, repress = false, onTopT = 0, airT = 0, reachedTop = false, prev = null;
  let lastRouteFrame = -1;
  for (let i = 0; i < 60 * 16 && !box.result && !run.dead; i++) {
    run.obstacles.length = 0;
    const p = run.player, hx = run.playerWorldX(), sp = run.speed;
    const gr = !!p.grounded || (Number(p.y) || 0) <= 0.01;
    if (repress) { Input.press('jump'); repress = false; hold = 20; }
    else if (hold > 0) {
      hold--;
      if (hold === 0) Input.release('jump');
      if (dbl === 1 && p.vy <= 0 && p.jumps === 1) { Input.release('jump'); hold = 0; repress = true; dbl = 2; }
    } else if (nextIdx < steps.length && gr && hx >= steps[nextIdx].x - sp * STAIR_LEAD) {
      Input.press('jump'); hold = 24; nextIdx++;
    } else if (nextIdx === steps.length && double && dbl === 0 && run.route === top && gr) {
      reachedTop = true;
      onTopT += TICK;
      if (onTopT > 0.2) { run.powerups.bonusJumps = () => 1; Input.press('jump'); hold = 40; dbl = 1; }
    }
    if (run.route === top) reachedTop = true;
    run.update(TICK); Input.endFrame();
    prev = measure(run, prev);
    frames.push(prev);
    // The composition's pan as he lands on each tread (the reference has
    // already moved on to the next tread by the time he hops off it).
    const k = steps.indexOf(run.route);
    if (k >= 0 && prev.grounded && compPans[k] == null && Number.isFinite(prev.highPathPan)) compPans[k] = prev.highPathPan;
    if (run.route) lastRouteFrame = i;
    const past = nextIdx === steps.length && hold === 0 && !repress && dbl !== 1
      && gr && run.route !== top && run.playerWorldX() > top.x + top.w;
    if (past) { airT += TICK; if (airT > SETTLE_S + 0.3) break; }
  }
  Input.release('jump'); Input.endFrame();
  return { frames, reachedTop, doubled: dbl === 2, lastRouteFrame, compPans, steps };
}

// ---- the sprung sky fork ------------------------------------------------------
// No input until the pad fires; then jump every gap before `fallAtGap` and run
// straight into that one.
function springFork(stageId, vp, { fallAtGap = 3 } = {}) {
  const scout = makeRun(stageId, vp).run;
  const forkScout = scout.routes.find((r) => r.kind !== 'tunnel' && r.kind !== 'island' && r.spring);
  const { run, box } = makeRun(stageId, vp, { startX: forkScout.x - 700 });
  const fork = run.routes.find((r) => r.kind !== 'tunnel' && r.kind !== 'island' && r.spring);
  const gaps = (fork.gaps || []).slice().sort((a, b) => a.x - b.x);
  const fallGap = gaps[Math.min(gaps.length, fallAtGap) - 1];
  const frames = [];
  let prev = null, hold = 0, launchFrame = -1, landFrame = -1, fellFrame = -1, lastRouteFrame = -1, airT = 0, jumpedGaps = 0, nextGap = 0;
  for (let i = 0; i < 60 * 30 && !box.result && !run.dead; i++) {
    for (let k = run.obstacles.length - 1; k >= 0; k--) if (!run.obstacles[k].def?.isSpring) run.obstacles.splice(k, 1);
    const p = run.player, hx = run.playerWorldX(), sp = run.speed;
    const gr = !!p.grounded || (Number(p.y) || 0) <= 0.01;
    if (hold > 0) { hold--; if (hold === 0) Input.release('jump'); }
    else if (run.route === fork && gr && nextGap < gaps.length && gaps[nextGap] !== fallGap
      && hx >= gaps[nextGap].x - sp * 0.32) {
      Input.press('jump'); hold = 24; nextGap++; jumpedGaps++;
    }
    run.update(TICK); Input.endFrame();
    prev = measure(run, prev);
    frames.push(prev);
    if (launchFrame < 0 && p.launched) launchFrame = i;
    if (launchFrame >= 0 && landFrame < 0 && run.route === fork && prev.grounded) landFrame = i;
    if (landFrame >= 0 && fellFrame < 0 && !run.route && hx >= fallGap.x - 1) fellFrame = i;
    if (run.route) lastRouteFrame = i;
    if (fellFrame >= 0 && gr && !run.route) { airT += TICK; if (airT > SETTLE_S + 0.3) break; }
  }
  Input.release('jump'); Input.endFrame();
  return { frames, launchFrame, landFrame, fellFrame, lastRouteFrame, jumpedGaps, wantedJumps: Math.max(0, gaps.indexOf(fallGap)) };
}

// ---- the upper path over a tunnel, under the bot -------------------------------
function upperPath(stageId, vp) {
  const { run, box } = makeRun(stageId, vp, { team: ['lorenzo', 'rusty', 'clara'] });
  run.tunnelMouthAt = () => null;
  const bot = new DemoBot(run);
  const frames = [];
  let prev = null, lastRouteFrame = -1;
  for (let i = 0; i < 60 * 70 && !box.result && !run.dead; i++) {
    bot.update(TICK);
    run.update(TICK);
    prev = measure(run, prev);
    frames.push(prev);
    if (run.route) lastRouteFrame = i;
  }
  bot.releaseAll(); Input.endFrame();
  return { frames, lastRouteFrame, ended: !!box.result };
}

// ---- the judge ----------------------------------------------------------------
function judge(id, sc, extra = {}) {
  const F = sc.frames.filter((f) => !f.dead);
  check(F.length > 60, `${id}: scenario ran (${F.length} frames)`);
  if (!F.length) return;
  check(F.every((f) => f.mode === 'phone-portrait'), `${id}: every frame is on the portrait frame`);
  check(F.every((f) => Math.abs(f.z - 3.5) < 1e-9), `${id}: zoom is 3.5 on every frame`);
  let minCrown = Infinity, maxFeet = -Infinity, maxStep = 0, maxFree = 0, worstFree = null, worstCarried = 0, carriedFrames = 0;
  for (let i = 0; i < F.length; i++) {
    const f = F[i];
    minCrown = Math.min(minCrown, f.crown - f.bandTop);
    maxFeet = Math.max(maxFeet, f.feetS - f.bandBottom);
    if (i === 0) continue;
    const ad = Math.abs(f.dpan);
    maxStep = Math.max(maxStep, ad);
    if (f.carried) {
      carriedFrames++;
      const allowed = f.drop * f.z + CATCHUP_STEP_MAX;
      if (ad > allowed) worstCarried = Math.max(worstCarried, ad - allowed);
    } else if (ad > maxFree) { maxFree = ad; worstFree = i; }
  }
  check(minCrown >= CROWN_MARGIN, `${id}: crown >= band.top+${CROWN_MARGIN} on every frame (min ${r1(minCrown)})`);
  check(maxFeet <= 1e-6, `${id}: feet <= band.bottom on every frame (max ${r1(maxFeet)})`);
  check(maxFree <= PAN_STEP_MAX, `${id}: |dPan| <= ${r1(PAN_STEP_MAX)} on uncarried frames (max ${maxFree.toFixed(2)} at frame ${worstFree})`);
  check(worstCarried <= 0, `${id}: carried frames step by at most drop*3.5 + ${r1(CATCHUP_STEP_MAX)} (worst excess ${worstCarried.toFixed(2)})`);
  check(maxStep <= CUT, `${id}: no frame cuts the pan by more than ${CUT} (max ${maxStep.toFixed(1)})`);
  check(Math.abs(F[0].pan) < 1e-6, `${id}: pan 0 at the stage start (${F[0].pan})`);
  // Home within SETTLE_S of the last route, and still home at the end.
  let settleAfter = null;
  if (sc.lastRouteFrame >= 0) {
    const L = sc.lastRouteFrame;
    for (let i = L + 1; i < F.length; i++) {
      if (Math.abs(F[i].pan) <= 0.5 && F.slice(i).every((f) => Math.abs(f.pan) <= 0.5)) { settleAfter = (i - L) * TICK; break; }
    }
    const tail = (F.length - 1 - L) * TICK;
    if (tail >= SETTLE_S) check(settleAfter != null && settleAfter <= SETTLE_S,
      `${id}: pan back to 0 within ${SETTLE_S}s of the last route (settled after ${settleAfter == null ? 'never' : settleAfter.toFixed(2) + 's'}, tail ${tail.toFixed(1)}s)`);
  }
  if (sc.launchFrame >= 0 && sc.landFrame > sc.launchFrame) {
    let sag = 0;
    for (let i = sc.launchFrame + 1; i <= sc.landFrame; i++) sag = Math.min(sag, sc.frames[i].pan - sc.frames[i - 1].pan);
    check(sag >= -1e-6, `${id}: pan is monotone non-decreasing from the pad firing to the landing (worst step ${sag.toFixed(2)})`);
  }
  const extras = Object.entries(extra).map(([k, v]) => `${k} ${v}`).join('  ');
  console.log(`${id}: ${F.length} frames  crown-top min ${r1(minCrown)}  feet-bottom max ${r1(maxFeet)}  |dPan| max ${maxStep.toFixed(1)} (uncarried ${maxFree.toFixed(2)}, ${carriedFrames} carried)  pan0 ${F[0].pan.toFixed(1)}  settle ${settleAfter == null ? '-' : settleAfter.toFixed(2) + 's'}  ${extras}`);
}

for (const vp of VIEWPORTS) {
  const tag = `${vp[0]}x${vp[1]}/${vp[2]}`;
  for (const double of [false, true]) {
    const sc = stairs('plumber-1', vp, { double });
    const id = `${tag} plumber-1 stairs@s1${double ? ' double' : ' walk-off'}`;
    check(sc.reachedTop, `${id}: the script reached the top step`);
    if (double) check(sc.doubled, `${id}: the double was pressed on the top step`);
    judge(id, sc, { 'composition pans': '[' + sc.compPans.map((p) => (p == null ? '-' : p.toFixed(1))).join(', ') + ']' });
  }
  for (const [stage, fallAtGap] of [['plumber-1', 3], ['frost-1', 1]]) {
    const sc = springFork(stage, vp, { fallAtGap });
    const id = `${tag} ${stage} spring fork, fall at gap ${fallAtGap}`;
    check(sc.launchFrame >= 0, `${id}: the pad fired`);
    check(sc.landFrame > sc.launchFrame, `${id}: he landed on the road`);
    check(sc.jumpedGaps === sc.wantedJumps, `${id}: the gaps before the fall were jumped (${sc.jumpedGaps}/${sc.wantedJumps})`);
    check(sc.fellFrame > sc.landFrame, `${id}: he fell through gap ${fallAtGap}`);
    judge(id, sc, { flight: `${sc.launchFrame}..${sc.landFrame}`, fell: sc.fellFrame });
  }
  {
    const sc = upperPath('plumber-3', vp);
    const id = `${tag} plumber-3 upper path (bot)`;
    judge(id, sc, { ended: sc.ended });
  }
}

console.log(failed ? 'PORTRAIT RUN CAMERA: FAILED' : 'PORTRAIT RUN CAMERA: PASSED');
process.exit(failed ? 1 : 0);
