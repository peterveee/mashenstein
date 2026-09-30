// THE BACKDROP DOES NOT RIDE THE RING.
//
// A loop-de-loop moves the world round the hero (game/loop.js), so over the
// top of the ring the camera runs BACKWARD. The scenery used to follow that
// camera, and every hill, coyote and the speed-3 jet swung back and forth with
// it (Peter, 30 Sep 2026). The backdrop is now driven by the distance covered
// round the ring (RunState.backdropLead) and pays the lead back after the exit.
//
// What this pins, off a real RunState riding a real lap:
//   - the world still makes its U-turn (the fix is the backdrop's, not the ring's)
//   - the backdrop never scrolls backward, on the ring or after it
//   - it meets the world's pace at both seams, and the payback eases in
//   - the lead is a circumference, and it is all paid back
//   - speed-2's villain is never flown backward by the camera's U-turn either
import { installDom } from './dom-stub.js';
installDom();

const { RunState } = await import('../src/game/run.js');
const { LOOP } = await import('../src/game/loop.js');
const { makeObstacle } = await import('../src/game/entities.js');
const { save } = await import('../src/engine/save.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

save.load();
save.newSlot(0, 0);
const stage = {
  id: 'test-speed', cabinet: 'speed', index: 3,
  mission: { type: 'reach', desc: 'TEST' },
  challenge: { type: 'coins', n: 9999, desc: 'TEST' },
  durationSec: 60, applianceAt: 0.5, applianceHigh: false,
};
const run = new RunState({ stage, save, seed: 7, difficulty: 1, onEnd: () => {} });
run.enter();
for (let i = 0; i < 600 && run.introRunning; i++) run.update(1 / 60);
run.obstacles = []; run.pickups = []; run.projectiles = [];
const pad = makeObstacle('loopPad', run.playerWorldX() + 30);
run.obstacles.push(pad);

// Rates in px/s, per tick. Nothing but the pad is left on the field once the
// ride starts, so the payback is never cut short by a death.
const rows = [];
let entered = false, exit = null;
for (let i = 0; i < 1200; i++) {
  run.player.iframes = 99;
  if (entered) { run.obstacles = run.obstacles.filter((o) => o === pad); run.pickups = []; }
  const cam0 = run.camX, bg0 = run.camX + run.backdropLead;
  run.update(1 / 60);
  const riding = !!(run.loop && !run.loop.pending);
  if (riding) entered = true;
  if (entered && !run.loop && exit == null) exit = rows.length;
  rows.push({ riding, world: (run.camX - cam0) * 60, bg: (run.camX + run.backdropLead - bg0) * 60, lead: run.backdropLead });
  if (exit != null && run.backdropLead === 0) break;
}
const ride = rows.filter((r) => r.riding);
const first = rows.findIndex((r) => r.riding);

assert(ride.length > 20, `the hero rode the ring (${ride.length} ticks)`);
assert(Math.min(...ride.map((r) => r.world)) < 0, 'the world still U-turns over the top');
assert(Math.min(...rows.map((r) => r.bg)) > 0, 'the backdrop never scrolls backward, on the ring or after it');
const peak = Math.max(...rows.map((r) => r.lead));
const lap = 2 * Math.PI * LOOP.r;
assert(Math.abs(peak - lap) < 2, `a lap puts the backdrop one circumference ahead (${peak.toFixed(1)} vs ${lap.toFixed(1)})`);
assert(exit != null && rows.at(-1).lead === 0, `the lead is paid back in full (${exit != null ? ((rows.length - exit) / 60).toFixed(1) : '?'} s)`);
// The seams: the tick before the ring and the ticks either side of the exit.
const before = rows[first - 1];
assert(Math.abs(before.bg - before.world) < 0.5, 'into the ring the backdrop is on the world\'s pace');
const out = rows[exit + 1];
assert(Math.abs(out.bg - out.world) / out.world < 0.02, 'out of it the payback has not stepped in yet');
let worstStep = 0;
for (let i = exit + 1; i < rows.length; i++) {
  worstStep = Math.max(worstStep, Math.abs((rows[i].bg - rows[i].world) - (rows[i - 1].bg - rows[i - 1].world)));
}
assert(worstStep < 8, `the payback eases in and out, never a step in the scenery's pace (worst ${worstStep.toFixed(1)} px/s a tick)`);

// ---- and the villain -------------------------------------------------------
// Speed-2's chase copter is flown off the camera, so he used to U-turn with it.
// His own flight (c.dx) is left alone; what must never go backward over a lap
// is what that flight is ANCHORED to (LOOP.copterRelease) — except where the
// frame's edge stops him, which is allowed and reported.
{
  const { STAGES } = await import('../src/data/stages.js');
  const chase = STAGES.find((s) => s.cabinet === 'speed' && s.index === 2);
  const r2 = new RunState({ stage: chase, save, seed: 7, difficulty: 1, onEnd: () => {} });
  r2.enter();
  for (let i = 0; i < 60 * 15 && !(r2.copter && r2.copter.arrived); i++) {
    r2.player.iframes = 99;
    r2.obstacles = r2.obstacles.filter((o) => !o.def?.isGap);
    r2.update(1 / 60);
  }
  assert(!!r2.copter?.arrived, 'speed-2: the villain has arrived');
  r2.obstacles = []; r2.pickups = []; r2.projectiles = [];
  const ring = makeObstacle('loopPad', r2.playerWorldX() + 30);
  r2.obstacles.push(ring);
  let rode = false, done = null, worstBack = 0, peakHold = 0, pinnedTicks = 0;
  for (let i = 0; i < 600; i++) {
    r2.player.iframes = 99;
    if (rode) { r2.obstacles = r2.obstacles.filter((o) => o === ring); r2.pickups = []; }
    const c0 = r2.copter;
    const anchor0 = c0 ? c0.x - c0.dx : null;
    r2.update(1 / 60);
    const c = r2.copter;
    if (r2.loop && !r2.loop.pending) rode = true;
    if (rode && !r2.loop && done == null) done = i;
    if (!c || anchor0 == null || !rode) continue;
    const pinned = r2.copterHoldDx(c) < r2.copterLoopHold - 1e-6;
    if (pinned) pinnedTicks++;
    else worstBack = Math.min(worstBack, (c.x - c.dx) - anchor0);
    peakHold = Math.max(peakHold, r2.copterLoopHold);
    if (done != null && r2.copterLoopHold === 0 && i > done + 5) break;
  }
  assert(rode, 'speed-2: the hero rode the ring with the villain up');
  assert(peakHold > LOOP.r, `the camera's U-turn is banked, not flown (held ${peakHold.toFixed(1)} px)`);
  assert(worstBack > -1e-6, `his anchor never goes backward over the lap (worst ${worstBack.toFixed(2)} px; ${pinnedTicks} ticks held by the frame's edge)`);
  assert(r2.copterLoopHold === 0, 'and he is released back onto the camera after the exit');
}

if (failed) process.exit(1);
