// THE LAST FRAME OF A RUN IS A PORTRAIT.
//
// A death freezes the world and stops the player's own update, so whatever
// silhouette the hero was in on the killing frame is the one held for the whole
// death hold — half a second on a hit, a second and a half down a hole. That
// made the shape of the ending an accident of timing: clipped a gear on the way
// up and he hung there tucked and stretched; clipped one a frame after landing
// and he sat squashed flat, on a squash timer nothing was counting down any
// more. Both read as caught mid-move rather than as beaten.
//
// What this pins is that every death — pit, hard hazard, last battery — ends
// with an upright figure at scale 1. The three pose terms below are exactly the
// ones drawToon scales the whole body from:
//
//   kind === 'jump' + !grounded  → the air stretch (AIR_STRETCH_Y/X)
//   squash                       → the landing squash (LAND_SQUASH_Y/X)
//   kind === 'duck'              → the crouch's own tall-to-short scale
//
// so pinning all three at rest is the same claim as pinning sx and sy at 1,
// stated in the units the run actually controls.
//
// The pit fall is the one exception, and it is deliberate: he is falling, and
// falling has poses. What the fall may NOT do is wear a stale landing squash or
// the tucked launch silhouette of a hero on his way UP — see takeHit's pit
// branch, which spends the jump so poseFromPlayer's `fell` is true.
import { installDom } from './dom-stub.js';
const dom = installDom();

const { RunState } = await import('../src/game/run.js');
const { poseFromPlayer } = await import('../src/sprites/toons.js');
const { save } = await import('../src/engine/save.js');
const { PLAYER_X } = await import('../src/game/player.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const TICK = 1 / 60;

save.load();
save.newSlot(0, 0);

const stage = {
  id: 'death-pose-test', cabinet: 'rhythm', index: 2,
  mission: { type: 'reach', desc: 'TEST' },
  challenge: { type: 'coins', n: 9999, desc: 'TEST' },
  durationSec: 90, applianceAt: 0.2, applianceHigh: false,
  pits: null,
};

const pitStage = { ...stage, pits: [{ at: 0.7, jumps: 5, fill: 'spikes' }] };

function newRun(opts = {}) {
  const run = new RunState({
    stage: opts.stage || stage,
    team: [opts.hero || 'lorenzo'],
    save,
    seed: 4242,
    difficulty: 1,
    devStartPercent: opts.startAt ?? 0,
    onEnd: () => {},
  });
  run.enter();
  return run;
}

// The three body scales drawToon reads, restated as one verdict.
const atRest = (pose) => pose.squash === 0 && pose.kind !== 'jump' && pose.kind !== 'duck';
const describe = (pose) => `kind=${pose.kind} squash=${pose.squash.toFixed(3)} duck=${pose.duckAmount.toFixed(2)}`;

// Everything the death hold ever draws, not just its first frame: the pose is
// held for the whole hold, and a timer that keeps running is exactly the bug.
function worstPoseThroughHold(run, frames = 40) {
  let worst = null;
  for (let i = 0; i < frames; i++) {
    const pose = poseFromPlayer(run.player, run.t || 0);
    if (!atRest(pose)) worst = worst || pose;
    if (!run.dead) break;
    run.update(TICK);
  }
  return worst;
}

// ---- a hit taken in mid-air ----------------------------------------------------
// The commonest bad frame there is. A drone's shot or a flyer clips him at the
// top of a hop, and the run ends on the tucked launch pose with the full air
// stretch pulled through it.
{
  const run = newRun();
  for (let i = 0; i < 30; i++) run.update(TICK);
  run.battery = 1;
  const p = run.player;
  p.grounded = false;
  p.jumps = 1;
  p.vy = 420;              // rising, which is where the stretch is strongest
  p.landedT = 0;
  run.takeHit('TEST');
  assert(run.dead && !run.pitDeath, 'a hit with the last battery gone is a death, not a fall');
  const pose = poseFromPlayer(run.player, 0);
  assert(pose.kind === 'run', `and he is drawn standing, not tucked (${describe(pose)})`);
  assert(pose.squash === 0, 'with no squash on him');
  const bad = worstPoseThroughHold(run);
  assert(!bad, `and he stays that way for the whole hold (${bad ? describe(bad) : 'at rest'})`);
}

// ---- a hit taken on the landing frame ------------------------------------------
// The other half of the same accident. `landedT` is a visual timer the player's
// own update counts down, and the player's update does not run while dead — so
// a death one frame after a landing used to freeze the squash at full for the
// entire hold with nothing left to release it.
{
  const run = newRun();
  for (let i = 0; i < 30; i++) run.update(TICK);
  run.battery = 1;
  run.player.landedT = 0.12;      // SQUASH_T: a squash at full strength
  run.player.grounded = true;
  run.takeHit('TEST');
  const pose = poseFromPlayer(run.player, 0);
  assert(pose.squash === 0, `the landing squash is released by the death (${describe(pose)})`);
  const bad = worstPoseThroughHold(run);
  assert(!bad, `and never comes back (${bad ? describe(bad) : 'at rest'})`);
}

// ---- a hit taken mid-slide ------------------------------------------------------
// A duck is a whole-body scale too — the rigs start tall and are squeezed down
// by duckAmount — so dying in one holds him folded over for the hold.
{
  const run = newRun();
  for (let i = 0; i < 30; i++) run.update(TICK);
  run.battery = 1;
  run.player.ducking = true;
  run.player.duckAmount = 1;
  run.player.duckDirection = 1;
  run.takeHit('TEST');
  const pose = poseFromPlayer(run.player, 0);
  assert(pose.kind === 'run', `he stands up out of the slide to die (${describe(pose)})`);
  const bad = worstPoseThroughHold(run);
  assert(!bad, `and stays up (${bad ? describe(bad) : 'at rest'})`);
}

// ---- a hit taken mid-ability ----------------------------------------------------
// Lorenzo's roll is a forced duck with a timer of its own, and that timer is on
// the player, which stops updating at the death.
{
  const run = newRun();
  for (let i = 0; i < 30; i++) run.update(TICK);
  run.battery = 1;
  run.player.rollT = 0.5;
  run.takeHit('TEST');
  const pose = poseFromPlayer(run.player, 0);
  assert(!pose.roll && pose.kind === 'run', `an ability roll ends with the run (${describe(pose)})`);
}

// ---- and down a hole ------------------------------------------------------------
// The one death with a journey in front of it. The FALL keeps its poses — that
// is the beat — but it may not carry a landing squash into the shaft, and it
// may not go down wearing the launch tuck of a hero on his way up. Once he is
// in the material, the hold is a portrait like every other death's.
{
  const run = newRun({ stage: pitStage, startAt: 0.66 });
  // Walk up to the hole so it is cut, then stand him in it.
  for (let i = 0; i < 60 * 20 && !run.obstacles.some((ob) => ob.live && ob.crossing); i++) run.update(TICK);
  const cross = run.crossings[0];
  assert(!!cross, 'the crossing is in the world');
  run.camX = cross.x + cross.w - cross.hop * 0.5 - PLAYER_X;
  run.route = null;
  run.player.y = 0;
  run.player.vy = 0;
  run.player.grounded = true;
  // The state a missed hop actually arrives in: a jump spent, and the squash of
  // the landing before it still on the clock.
  run.player.jumps = 1;
  run.player.landedT = 0.12;
  run.update(TICK);
  assert(run.dead && !!run.pitDeath, 'missing the stones is a pit death');
  const falling = poseFromPlayer(run.player, 0);
  assert(falling.squash === 0, `nothing falls squashed (${describe(falling)})`);
  // The killing frame still has him standing on the lip — updateDead is what
  // takes the floor away, and it runs from the next tick. One tick in is the
  // first frame of the fall proper.
  run.update(TICK);
  const dropping = poseFromPlayer(run.player, 0);
  assert(!dropping.grounded && dropping.fell,
    `he goes down as a man who ran out of floor, not as a jump (${describe(dropping)})`);
  assert(dropping.kind === 'run',
    `so the shaft opens on the running figure rather than the launch tuck (${describe(dropping)})`);
  let squashedInFlight = false;
  for (let i = 0; i < 200 && !run.pitDeath.in; i++) {
    run.update(TICK);
    if (poseFromPlayer(run.player, 0).squash !== 0) squashedInFlight = true;
  }
  assert(run.pitDeath.in, 'he reaches the bed');
  assert(!squashedInFlight, 'and carries no squash the whole way down');
  const landed = poseFromPlayer(run.player, 0);
  assert(atRest(landed), `and the hold that follows is upright and unsquashed (${describe(landed)})`);
  const bad = worstPoseThroughHold(run, 60);
  assert(!bad, `for as long as it lasts (${bad ? describe(bad) : 'at rest'})`);
}

dom.reset?.();
console.log(failed ? 'DEATH-POSE: FAILED' : 'DEATH-POSE: PASSED');
process.exit(failed ? 1 : 0);
