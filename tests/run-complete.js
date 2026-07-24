// Integration: a simple reactive bot plays a real RunState stage to completion.
// Exercises player physics, spawner, collisions, checkpoints, missions end-to-end.
import { installDom } from './dom-stub.js';
const dom = installDom();

const { RunState } = await import('../src/game/run.js');
const { save } = await import('../src/engine/save.js');
const { Input } = await import('../src/engine/input.js');
const { PLAYER_X } = await import('../src/game/player.js');
const { makeObstacle } = await import('../src/game/entities.js');

save.load();
save.newSlot(0, 0);

const stage = {
  id: 'test-1', cabinet: 'plumber', index: 1,
  mission: { type: 'reach', desc: 'TEST' },
  challenge: { type: 'coins', n: 9999, desc: 'TEST' },
  durationSec: 40, applianceAt: 0.5, applianceHigh: false,
};

let result = null;
const run = new RunState({
  stage,
  team: ['lorenzo', 'gnash', 'mochi'],
  save,
  seed: 12345,
  difficulty: 1,
  onEnd: (r) => { result = r; },
});
run.enter();

const TICK = 1 / 60;
let duckHold = false;
let ticks = 0;
const MAX_TICKS = 60 * 60 * 6; // 6 minutes of sim time hard cap

while (!result && ticks < MAX_TICKS) {
  ticks++;
  // Bot: react to the nearest action obstacle ahead.
  const px = run.camX + PLAYER_X;
  let nearest = null;
  for (const ob of run.obstacles) {
    if (!ob.live || ob.def.action === 'none') continue;
    const front = ob.x + ob.w;
    if (front < px) continue;
    if (!nearest || ob.x < nearest.x) nearest = ob;
  }
  const sp = run.speed;
  if (!run.player.grounded) {
    // Hold the jump through the arc — releasing early cuts jump height.
  } else if (nearest && nearest.def.action === 'jump' && (nearest.x - px) < sp * 0.30 && (nearest.x - px) > -8) {
    Input.press('jump');
  } else {
    Input.release('jump');
  }
  if (nearest && nearest.def.action === 'duck' && (nearest.x - px) < sp * 0.4 && run.player.grounded) {
    if (!duckHold) { Input.press('duck'); duckHold = true; }
  } else if (duckHold) { Input.release('duck'); duckHold = false; }
  run.update(TICK);
}

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

assert(result, `run ended within ${Math.round(ticks / 60)}s of sim time`);
if (result) {
  assert(result.success, `bot completed the stage (success=${result.success}, deaths=${save.slot.stats.deaths})`);
  assert(result.score > 0, `score accrued: ${result.score}`);
  assert(result.distance > 0, `distance covered: ${result.distance}`);
}

const portalX = 500;
const approachHazard = makeObstacle('cactus', 460);
const overlappingGap = makeObstacle('gap', 480);
const harmlessTarget = makeObstacle('target', 470);
run.obstacles = [approachHazard, overlappingGap, harmlessTarget];
run.clearPortalApproach(portalX);
assert(!approachHazard.live, 'portal clears hazards from its left-side approach');
assert(!overlappingGap.live, 'portal clears gaps that overlap its approach');
assert(harmlessTarget.live, 'portal leaves non-hazard objects intact');
console.log(failed ? 'RUN-COMPLETE: FAILED' : 'RUN-COMPLETE: PASSED');
process.exit(failed ? 1 : 0);
