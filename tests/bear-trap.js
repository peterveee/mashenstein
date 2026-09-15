// THE FROST BEAR TRAP — the one hazard in the game you can turn off.
//
// Every other standing hazard is either inert (you jump it) or breakable (you
// shoot it and it is gone). The trap is a third thing: a shot SPRINGS it. The
// object stays on the road, the jaws shut on nothing, and from that moment it
// is scenery you can run straight over. That is the whole design, and it lives
// in four places that have no reason to know about each other:
//
//   entities.js  `disarmable: true` beside `breakable: false` — the two are
//                not alternatives, and a later pass that "tidies" one into the
//                other either makes the trap indestructible or blows it up.
//   run.js       the projectile branch for unbreakable things springs it, and so
//                does walking into it — a trap that catches you has FIRED, and
//                is spent afterwards exactly as a shot one is. The collision
//                loop skips a sprung one before it ever consults the box, which
//                is also what stops one trap biting a standing hero every
//                frame. updateEntities ticks the snap clock.
//   props.js     thirteen frames, eight of idle and five of snap, and the
//                closed pose has to stay VISIBLE at 16x8 — the reward for the
//                round is being able to see which traps you have dealt with.
//   draw.js      a sprung trap leaves the fps ring and is driven by its own
//                timer, because a snap on the next 8fps tick lands after the
//                shot that caused it.
import { installDom } from './dom-stub.js';
installDom();

const { OBSTACLES, DEBRIS, makeObstacle, entityBox, overlaps } = await import('../src/game/entities.js');
const { RunState } = await import('../src/game/run.js');
const { save } = await import('../src/engine/save.js');
const {
  propFrames, propSprite, PROP_PAINTERS, TRAP_IDLE_FRAMES, TRAP_SNAP, TRAP_SNAP_T,
} = await import('../src/sprites/props.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// --- the registry entry ----------------------------------------------------
const trap = OBSTACLES.bearTrap;
assert(trap.breakable === false, 'a shot does not BREAK the trap');
assert(trap.disarmable === true, 'it disarms it instead — the two flags are not alternatives');
const disarmable = Object.entries(OBSTACLES).filter(([, d]) => d.disarmable);
assert(disarmable.length === 1 && disarmable[0][0] === 'bearTrap',
  'the trap is the only disarmable thing in the game');
assert(!DEBRIS.bearTrap,
  'and it throws no debris, because nothing about it is destroyed');

// --- the frames ------------------------------------------------------------
assert(propFrames('bearTrap') === TRAP_IDLE_FRAMES + TRAP_SNAP.length,
  `eight idle frames plus the snap (${propFrames('bearTrap')})`);
assert(TRAP_SNAP_T < 1 / 8 * TRAP_SNAP.length,
  'the snap runs faster than the idle clock would play those frames');
// The overshoot. Without it the jaws merely arrive at an angle; with it they
// pass the resting angle and come back, which is what a mechanism firing looks
// like. Stated as: some frame closes tighter than the one it settles on.
const rest = TRAP_SNAP[TRAP_SNAP.length - 1];
assert(TRAP_SNAP.some((f) => f.angle > rest.angle),
  'the snap overshoots its resting angle rather than easing into it');
assert(TRAP_SNAP.every((f) => f.rise <= 1) && rest.rise < 0.7,
  'the jaws SHORTEN as they close — closing on angle alone made the trap a one-pixel sliver');

// --- the closed pose is still on the road ----------------------------------
// The failure this pins is the one the first attempt actually had: a trap that
// shuts to near-vertical vanishes at true size, and the player cannot see what
// they spent a round on. Measured in opaque pixels of the REAL 16x8 raster.
// Measured off the painter's own path coordinates rather than off pixels: the
// headless canvas is a stub and getImageData comes back blank, so a pixel count
// here would pass on an empty sprite.
function bbox(frame) {
  const pts = [];
  const rec = new Proxy({}, {
    get: (_, k) => (...a) => {
      const op = String(k);
      if (op === 'moveTo' || op === 'lineTo') pts.push([a[0], a[1]]);
      if (op === 'quadraticCurveTo') { pts.push([a[0], a[1]]); pts.push([a[2], a[3]]); }
    },
    set: () => true,
  });
  PROP_PAINTERS.bearTrap(rec, 16, 8, frame);
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}
// BED_SINK is 2 of the box's 8, so only y < 6 is ever on screen. Everything
// claimed below is claimed about the part the player can actually see.
const VISIBLE_Y = 6;
const armed = bbox(0);
const sprung = bbox(propFrames('bearTrap') - 1);
assert(armed.y0 < 2, 'an armed trap reaches the top of its box — the open V is the silhouette');
assert(sprung.y0 > armed.y0 + 1.5,
  `a sprung one is plainly lower (${sprung.y0.toFixed(1)} vs ${armed.y0.toFixed(1)}), so the two never read alike`);
assert(sprung.y0 < VISIBLE_Y - 1,
  'and its jaws still clear the ground line rather than disappearing under the bedding');
assert(sprung.x1 - sprung.x0 > 12,
  `the sprung trap keeps the road: ${(sprung.x1 - sprung.x0).toFixed(1)}px of spent machinery lying in the snow`);

// Distinct pictures, not merely distinct numbers.
function pose(frame) {
  const log = [];
  const rec = new Proxy({}, {
    get: (_, k) => (...a) => { log.push(`${String(k)}(${a.map((v) => (typeof v === 'number' ? v.toFixed(2) : v)).join(',')})`); },
    set: () => true,
  });
  PROP_PAINTERS.bearTrap(rec, 16, 8, frame);
  return log.join('|');
}
const idlePoses = new Set();
for (let f = 0; f < TRAP_IDLE_FRAMES; f++) idlePoses.add(pose(f));
for (let f = TRAP_IDLE_FRAMES; f < propFrames('bearTrap'); f++) {
  assert(!idlePoses.has(pose(f)), `snap frame ${f} is not one of the idle frames wearing a new number`);
}

// --- the run ---------------------------------------------------------------
save.load();
save.newSlot(0, 0);
const stage = {
  id: 'test-1', cabinet: 'frost', index: 1,
  mission: { type: 'reach', desc: 'TEST' },
  challenge: { type: 'coins', n: 9999, desc: 'TEST' },
  durationSec: 40, applianceAt: 0.5, applianceHigh: false,
};
const makeRun = () => new RunState({ stage, save, seed: 12345, difficulty: 1, onEnd: () => {} });

// Park a trap exactly under the hero, with the field cleared so the only thing
// collide() can possibly find is this one.
function runIntoTrap(prepare) {
  const run = makeRun();
  run.enter();
  run.obstacles = [];
  run.pickups = [];
  run.projectiles = [];
  const pbox = run.playerBox();
  const ob = makeObstacle('bearTrap', pbox.x + pbox.w / 2 - trap.w / 2);
  run.obstacles.push(ob);
  if (prepare) prepare(run, ob);
  assert(overlaps(run.playerBox(), entityBox(ob, run.entityGroundY(ob))),
    'the fixture actually puts the hero on the trap');
  const before = { battery: run.battery, damage: run.damageTaken };
  run.collide();
  return { run, ob, before };
}

{
  const { run, ob, before } = runIntoTrap();
  assert(run.battery === before.battery - 1, 'an ARMED trap costs a battery cell');
  assert(run.damageTaken === before.damage + 1, 'and counts as damage taken');
  assert(ob.live && !ob.broken, 'and the trap is still standing afterwards');
  // The jaws used to stay wide open around a hero they had just caught.
  assert(ob.disarmed === true, 'a trap that CATCHES you has fired: it shuts on him');
  assert(ob.disarmT === 0, 'and starts its snap on the frame of the bite');
}
// It fires once. The sprung skip at the top of the collision loop is what makes
// that true, and without it a hero standing on a trap is bitten every frame his
// i-frames are not running.
{
  const { run, ob } = runIntoTrap();
  const after = { battery: run.battery, damage: run.damageTaken };
  run.player.iframes = 0;
  run.collide();
  run.collide();
  assert(run.battery === after.battery && run.damageTaken === after.damage,
    'and it cannot bite twice, even with the i-frames gone');
  assert(ob.live, 'a spent trap is still on the road, not deleted');
}
{
  const { run, ob, before } = runIntoTrap((r, o) => r.springTrap(o, 'nothing'));
  assert(ob.disarmed === true, 'springTrap marks the trap sprung');
  assert(ob.live === true && ob.broken !== true,
    'and leaves it standing: nothing is removed and nothing is marked broken');
  assert(run.battery === before.battery, 'running over a SPRUNG trap costs nothing');
  assert(run.damageTaken === before.damage, 'and is not damage by any other name either');
}

// A real shot, through the real projectile loop, on the real unbreakable branch.
{
  const run = makeRun();
  run.enter();
  run.obstacles = [];
  run.pickups = [];
  run.projectiles = [];
  const ob = makeObstacle('bearTrap', run.playerWorldX() + 40);
  run.obstacles.push(ob);
  run.projectiles.push({
    type: 'pellet', route: run.route, x: ob.x + trap.w / 2 - 4, alt: 2,
    vx: run.speed + 200, size: 1, contactHero: 'lorenzo', live: true,
    pierce: false, hitIds: new Set(),
  });
  run.updateProjectiles(1 / 60, run.speed);
  assert(ob.disarmed === true, 'a pellet that reaches the trap springs it');
  assert(ob.live === true, 'the trap survives being shot');
  assert(run.projectiles.length === 0 || run.projectiles.every((p) => !p.live || p.hover),
    'and the round is spent on it, exactly as on any other solid thing');
}

// The snap clock is ticked by the entity update, not by the prop ring.
{
  const run = makeRun();
  run.enter();
  run.obstacles = [];
  run.pickups = [];
  const ob = makeObstacle('bearTrap', run.playerWorldX() + 400);
  run.obstacles.push(ob);
  run.disarmTrap(ob);
  assert(ob.disarmT === 0, 'a freshly sprung trap starts its snap at zero');
  run.updateEntities(0.05, run.speed);
  assert(ob.disarmT > 0, 'and updateEntities advances it');
}
// Every obstacle is born with the fields, so nothing downstream has to ask the
// def before reading them and a replayed entity cannot arrive mid-snap.
{
  const fresh = makeObstacle('crate', 0);
  assert(fresh.disarmed === false && fresh.disarmT === 0,
    'every obstacle is born unsprung, disarmable or not');
}

console.log(failed ? 'BEAR TRAP: FAILED' : 'BEAR TRAP: PASSED');
process.exit(failed ? 1 : 0);
