// THE THREE FLOOR PADS, AND THE ROUND THAT GOES OVER THEM.
//
// Boost, spring and loop are one thing learned once — run over it and it pays
// out, jump it and it never sees you — and nothing else in the obstacle table
// is a road rather than a hazard. The projectile loop knew only about the
// boost, so a pellet (which may hit anything `ground`) met the other two, and
// because neither carries a `breakable` key the shot fell through to
// breakObstacle and took the pad away: a spring shot off the floor, a loop
// whose ring went with it. Both were reachable with the ordinary cannon, at
// the ordinary altitude, by accident.
//
// What this suite pins is the CONTRACT rather than the fix — the three pads
// answer a projectile identically, and a fourth pad added later joins them by
// declaring itself a pad rather than by being remembered at each call site.
import { installDom } from './dom-stub.js';
installDom();

const { OBSTACLES, makeObstacle, isFloorPad, entityBox, overlaps } = await import('../src/game/entities.js');
const { RunState } = await import('../src/game/run.js');
const { save } = await import('../src/engine/save.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// --- the registry ----------------------------------------------------------
const PADS = ['boostPad', 'springPad', 'loopPad'];
for (const name of PADS) {
  const def = OBSTACLES[name];
  assert(!!def, `${name} is a registered obstacle`);
  assert(def.ground === true, `${name} lies on the road`);
  assert(def.action === 'none', `${name} is never something to avoid`);
  assert(isFloorPad(def), `${name} declares itself a floor pad`);
}
// Nothing else may quietly become one. The predicate is only worth having if
// the set it names is the set the table means.
const declared = Object.entries(OBSTACLES).filter(([, d]) => isFloorPad(d)).map(([k]) => k);
assert(declared.length === PADS.length && PADS.every((p) => declared.includes(p)),
  `the pads are exactly boost, spring and loop (got ${declared.join(', ')})`);
// And they are pads BECAUSE of their own flags, not because a list says so.
for (const name of PADS) {
  assert(isFloorPad({ isBoost: OBSTACLES[name].isBoost, isSpring: OBSTACLES[name].isSpring, isLoop: OBSTACLES[name].isLoop }),
    `${name}'s own flag is what makes it a pad`);
}
assert(!isFloorPad(OBSTACLES.crate) && !isFloorPad(OBSTACLES.beatBar) && !isFloorPad(null),
  'ordinary ground props and a missing def are not pads');

// --- a round fired at one ---------------------------------------------------
save.load();
save.newSlot(0, 0);
const stage = {
  id: 'test-1', cabinet: 'plumber', index: 1,
  mission: { type: 'reach', desc: 'TEST' },
  challenge: { type: 'coins', n: 9999, desc: 'TEST' },
  durationSec: 40, applianceAt: 0.5, applianceHigh: false,
};

// Park one pad just ahead of the hero, fire the given projectile straight at
// it, and step the loop until the round is past. Nothing else is on the field,
// so anything that happens to the pad happened because of the shot.
//
// EVERY CASE PROVES IT CROSSED. The first draft of this suite asserted that an
// axe leaves a pad alone and passed before the fix was written — because an axe
// is reaped on the frame it is thrown unless Grumpos is the current hero (see
// the relay check at the end of updateProjectiles), so the round under test was
// never in the air at all. A projectile test that does not check the round
// reached the thing is not testing anything, so `crossed` is asserted for all
// three weapons rather than for the pellet alone.
const THROWER = { axe: 'grumpos', fist: 'raymn' };

function shootAt(type, projectile) {
  const run = new RunState({ stage, save, seed: 12345, difficulty: 1, onEnd: () => {} });
  run.enter();
  run.obstacles = [];
  run.pickups = [];
  run.projectiles = [];
  // A thrown weapon belongs to its thrower, and nobody else's survives a frame.
  if (THROWER[projectile.type]) run.relay.current = THROWER[projectile.type];
  const px = run.playerWorldX();
  const ob = makeObstacle(type, px + 40);
  run.obstacles.push(ob);
  const pr = {
    x: px + 12, alt: ob.alt + ob.h / 2, vx: 260, live: true,
    hitIds: new Set(), t: 0, hoverT: 0, returning: false, hover: false,
    ...projectile,
  };
  run.projectiles.push(pr);
  // The pad's box, so the fixture can prove the round really crossed it.
  const box = entityBox(ob, run.entityGroundY(ob));
  let crossed = false;
  for (let i = 0; i < 60 && pr.live; i++) {
    run.updateProjectiles(1 / 60, run.speed);
    const pbox = { x: pr.x, y: run.groundYAt(pr.x) - pr.alt - 4, w: 8, h: 8 };
    if (overlaps(box, pbox)) crossed = true;
    if (pr.x > ob.x + ob.w + 40) break;
  }
  return { run, ob, pr, crossed };
}

for (const type of PADS) {
  // A PELLET. The one that could reach a spring and a loop before.
  const { ob, pr, crossed } = shootAt(type, { type: 'pellet', pierce: false });
  assert(crossed, `the fixture actually flies a pellet through the ${type}'s box`);
  assert(ob.live && !ob.broken, `a pellet does not remove a ${type}`);
  assert(pr.live, `and is not spent on it either — the round carries on past a ${type}`);

  // A THROWN WEAPON ignores the ground/isTarget gate entirely, so it is the
  // one that would still have parked on a pad had the fix been `breakable:
  // false` rather than a skip.
  const axe = shootAt(type, { type: 'axe', hits: 1 });
  assert(axe.crossed, `the fixture actually flies an axe through the ${type}'s box`);
  assert(axe.ob.live && !axe.ob.broken, `an axe does not remove a ${type}`);
  assert(!axe.pr.hover, `nor parks on one — a ${type} is not something an axe lodges in`);

  // A PIERCE pellet (the `charge` mod) is the other gate-ignoring round.
  const charged = shootAt(type, { type: 'pellet', pierce: true });
  assert(charged.crossed, `the fixture actually flies a charged pellet through the ${type}'s box`);
  assert(charged.ob.live && !charged.ob.broken, `a charged pellet does not remove a ${type}`);
}

// --- and the homing pass ----------------------------------------------------
// A pellet steers at the first thing ahead it can hit. A pad it cannot hit must
// not be that thing, or the shot dives at the road and misses what was behind.
{
  const run = new RunState({ stage, save, seed: 12345, difficulty: 1, onEnd: () => {} });
  run.enter();
  run.obstacles = [];
  run.pickups = [];
  run.projectiles = [];
  const px = run.playerWorldX();
  const pad = makeObstacle('springPad', px + 30);
  const crate = makeObstacle('crate', px + 120);
  run.obstacles.push(pad, crate);
  const pr = { type: 'pellet', x: px + 12, alt: 30, vx: 260, live: true, hitIds: new Set() };
  const before = pr.alt;
  run.homePellet(pr, 1 / 60);
  const wantCrate = crate.alt + crate.h / 2;
  assert(pr.alt < before, 'the round steers down toward the crate behind the pad');
  assert(pr.alt >= wantCrate - 0.001,
    `and toward the crate's middle (${wantCrate}), not down onto the pad (${pad.alt + pad.h / 2})`);
}

console.log(failed ? '\nFLOOR PAD TESTS FAILED' : '\nfloor pads ok');
process.exit(failed ? 1 : 0);
