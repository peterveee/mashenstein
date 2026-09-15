// THE MAGNET'S PROMISE: a coin it takes hold of is a coin you collect.
//
// The bug this pins is that the hero could OUTRUN his own magnet. The pull was
// a flat 220px/s in world space and the lane is faster than that — 160 ramping
// to 1.6x on its own, and a cabinet speed bonus, the SPEED capsule, a dash or
// overtime all go further past it — so a coin behind him closed at
// (220 - speed), i.e. it fell further behind every frame until the retirement
// sweep binned it 40px off the back of the camera. Coins visibly swerved
// towards him and were then deleted.
//
// Two claims, and the suite drives the real RunState for both:
//
//   1. A captured coin ARRIVES, at any speed the game can reach, from any
//      direction — including the one that used to be hopeless, a coin already
//      behind him while he sprints away from it.
//   2. Capture LATCHES. The radius is a grab, not a lease: once held, a coin
//      is neither dropped when the gap opens nor retired by the sweep.
//
// The step loop below is the run's own: advance camX by speed*dt exactly as
// updateRun does, then call updateCoinMagnet and collide, in that order.
import { installDom } from './dom-stub.js';
installDom();

const { makePickup } = await import('../src/game/entities.js');
const { RunState } = await import('../src/game/run.js');
const { save } = await import('../src/engine/save.js');
const { PLAYER_H } = await import('../src/game/player.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

save.load();
save.newSlot(0, 0);
const stage = {
  id: 'test-1', cabinet: 'plumber', index: 1,
  mission: { type: 'reach', desc: 'TEST' },
  challenge: { type: 'coins', n: 9999, desc: 'TEST' },
  durationSec: 40,
};
const DT = 1 / 60;

// A run with the magnet up, the field cleared, and one coin placed relative to
// the hero. `speedBoost` is the run's own multiplier seam, so "at speed" here
// means the same number the lane would really be moving at.
function magnetRun({ level = 1, dx = 0, dy = 0, speedBoost = 0, type = 'coin' } = {}) {
  const run = new RunState({ stage, save, seed: 4242, difficulty: 1, onEnd: () => {} });
  run.enter();
  run.obstacles = [];
  run.projectiles = [];
  run.pickups = [];
  run.speedBoost = speedBoost;
  run.powerups.active.magnet = { level, t: 99, dur: 99 };
  // Offsets are from the CENTRE of the box that collects — the standing hitbox
  // collide() tests pickups against — so "dx: -70" means seventy pixels behind
  // the hero rather than behind some anchor only this file knows about.
  const pbox = run.playerBox();
  const px = pbox.x + pbox.w / 2, py = pbox.y + pbox.h - PLAYER_H / 2;
  const coin = makePickup(type, px + dx, 8);
  coin.x -= coin.w / 2;
  coin.alt = run.entityGroundY(coin) - (py + dy + coin.h / 2);
  run.pickups.push(coin);
  return { run, coin };
}

// One frame of the lane: the camera carries the hero forward, then the magnet
// and the pickup test run, in the run's order.
function step(run) {
  run.camX += run.speed * run.rewindSpeedMul * DT;
  run.updateCoinMagnet(DT);
  run.pickups = run.pickups.filter((p) => p.live
    && (p.x > run.camX - 40 || (p.magnetized && p.x > run.camX - 400)));
  run.collide();
}

// Seconds until the coin is banked, or null if it never is.
function timeToCollect(run, coin, limit = 4) {
  for (let t = 0; t < limit; t += DT) {
    step(run);
    if (!coin.live) return t;
  }
  return null;
}

// --- 1. it arrives, from everywhere, at every speed -------------------------
//
// A hero standing still would collect anything, so the interesting axis is
// speed. 2.0 covers the cap (1.6) with the SPEED capsule on top; 3.5 is past
// anything the game can produce, and is here because the fix must not be a
// number that merely clears today's top speed.
const PLACES = [
  { dx: -70, dy: 0, what: 'behind him on the ground' },
  { dx: -60, dy: -70, what: 'behind and above him' },
  { dx: 0, dy: -90, what: 'directly overhead' },
  { dx: 70, dy: 0, what: 'ahead of him' },
  { dx: 60, dy: 60, what: 'ahead and below him' },
];
for (const boost of [0, 1.0, 2.5]) {
  for (const place of PLACES) {
    const { run, coin } = magnetRun({ level: 4, dx: place.dx, dy: place.dy, speedBoost: boost });
    const sp = run.speed;
    const t = timeToCollect(run, coin);
    assert(t !== null,
      `a coin ${place.what} is collected at ${sp.toFixed(0)}px/s (${t === null ? 'NEVER' : t.toFixed(2) + 's'})`);
    // sqrt(2d/a) is the bound the hero's-frame pull guarantees: a coin starts
    // from rest and winds up at MAGNET_ACCEL, and the furthest it can ever be
    // caught from is the widest magnet's 130px.
    if (t !== null) assert(t < Math.sqrt(2 * 130 / 900) + DT * 2,
      `and it arrives inside the radius/acceleration bound (${t.toFixed(2)}s)`);
  }
}

// The case that named the bug. At full pelt the old magnet moved a coin behind
// him BACKWARDS relative to the hero; now the gap only ever shrinks.
{
  const { run, coin } = magnetRun({ level: 4, dx: -90, dy: 0, speedBoost: 2.5 });
  let prev = Infinity;
  let widened = 0;
  for (let i = 0; i < 60 && coin.live; i++) {
    step(run);
    if (!coin.live) break;
    const pb = run.playerBox();
    const gap = (pb.x + pb.w / 2) - (coin.x + coin.w / 2);
    if (gap > prev + 0.001) widened++;
    prev = gap;
  }
  assert(widened === 0, `the gap to a held coin never widens, however fast he runs (${widened} frames)`);
  assert(!coin.live, 'and the coin he was outrunning is banked');
}

// --- the SHAPE of the close: a beat of hesitation, then a rush --------------
//
// The catch is meant to read as a field taking hold rather than as a coin that
// drifted into him, so the coin leaves from REST: for the first few frames it
// only keeps station — which at lane speed is already a visible change of mind,
// since it had been falling behind — and then it winds up. A flat rate would
// pass every arrival test above and still look like nothing happened, so the
// curve is pinned here as its own claim.
{
  const { run, coin } = magnetRun({ level: 4, dx: -120, dy: 0, speedBoost: 1.0 });
  const gaps = [];
  for (let i = 0; i < 60 && coin.live; i++) {
    step(run);
    if (!coin.live) break;
    const pb = run.playerBox();
    gaps.push((pb.x + pb.w / 2) - (coin.x + coin.w / 2));
  }
  assert(!coin.live, 'the fixture collected the coin');
  const total = gaps.length;
  const closedEarly = gaps[0] - gaps[Math.floor(total / 4)];
  const closedLate = gaps[Math.floor(total * 3 / 4)] - gaps[total - 1];
  assert(closedEarly * 3 < closedLate,
    `the first quarter of the trip covers far less ground than the last (${closedEarly.toFixed(0)}px vs ${closedLate.toFixed(0)}px)`);
  // And the hesitation is real rather than a rounding artefact: three frames in,
  // it has barely moved relative to him.
  assert(gaps[0] - gaps[3] < 3,
    `three frames after the grab it has closed almost nothing (${(gaps[0] - gaps[3]).toFixed(2)}px)`);
  // It never stalls, though. Every frame of the trip gains ground.
  let stalled = 0;
  for (let i = 1; i < total; i++) if (gaps[i] > gaps[i - 1] + 0.001) stalled++;
  assert(stalled === 0, `and it never gives ground back on the way in (${stalled} frames)`);
}

// --- 2. capture latches -----------------------------------------------------
{
  // Grabbed at level 1 (a 60px radius) and then the power-up expires on the way
  // in. The coin is his: it keeps closing and it still lands.
  const { run, coin } = magnetRun({ level: 1, dx: -40, dy: 0, speedBoost: 1.0 });
  step(run);
  assert(coin.magnetized, 'a coin inside the radius is latched on the frame it is caught');
  delete run.powerups.active.magnet;
  const t = timeToCollect(run, coin);
  assert(t !== null, `a latched coin still arrives after the magnet expires (${t === null ? 'NEVER' : t.toFixed(2) + 's'})`);
}
{
  // The sweep must honour the latch. Placed behind the camera's near edge,
  // where the old filter deleted it outright.
  const { run, coin } = magnetRun({ level: 4, dx: -115, dy: 0, speedBoost: 1.5 });
  step(run);
  assert(coin.magnetized, 'the fixture caught the coin');
  assert(coin.x < run.camX - 40, 'and it is behind the sweep line, which is the whole point');
  assert(run.pickups.includes(coin), 'the retirement sweep leaves a held coin alone');
  assert(timeToCollect(run, coin) !== null, 'and it is collected rather than binned');
}
{
  // An UNheld coin is still retired on the same line as always: the exemption
  // is for the magnet's promise, not a leak for every coin that falls behind.
  const { run, coin } = magnetRun({ level: 0, dx: -100, dy: 0 });
  delete run.powerups.active.magnet;
  step(run);
  assert(!coin.magnetized, 'no magnet, no capture');
  assert(!run.pickups.includes(coin), 'and an ordinary coin left behind is still retired');
}

// --- what the magnet is allowed to take -------------------------------------
{
  // Capsules only from level 4. Below that the magnet is a coin hoover, and a
  // latch that ignored the level would quietly turn it into a capsule hoover.
  const { run, coin } = magnetRun({ level: 3, dx: -50, dy: 0, type: 'capShield' });
  step(run);
  assert(!coin.magnetized, 'a level-3 magnet does not take capsules');
}
{
  const { run, coin } = magnetRun({ level: 4, dx: -50, dy: 0, type: 'capShield' });
  step(run);
  assert(coin.magnetized, 'a level-4 magnet does');
}
// --- and what is on ANOTHER PATH is not his --------------------------------
//
// The one the fix above made matter. The pull used to tug at a road's coins
// from the lane and lose them, which looked like nothing; a pull that always
// delivers would quietly hand a hero on the lane the whole reward for a road he
// never took. A sky road's entry is 96px up and a tunnel's floor 96px down,
// both inside a level-4 magnet's 130.
//
// `road` is the tag that answers it, and the half of the question that catches
// a naive implementation is the SECOND one: a road's prizes are laid against
// the lane with the road's height folded into alt (spawnRoutePrizes), so the
// `route` field is null on a road coin AND on a lane coin. Testing that field
// gets both cases backwards — it locks a hero out of the coin run he climbed up
// for, and hands him the one he did not.
{
  const { run, coin } = magnetRun({ level: 4, dx: -40, dy: 0 });
  coin.route = { kind: 'tunnel', x: 0, w: 100 };
  step(run);
  assert(!coin.magnetized, 'a coin whose FLOOR is another road is not his');
}
{
  const road = { kind: 'fork', x: 0, w: 400 };
  const { run, coin } = magnetRun({ level: 4, dx: 0, dy: -96 });
  coin.road = road;
  step(run);
  assert(!coin.magnetized, 'nor is the coin run on the road overhead, from the lane below');
}
{
  // Same coin, same 96px, hero now up there: it is exactly what he climbed for.
  const road = { kind: 'fork', x: 0, w: 400 };
  const { run, coin } = magnetRun({ level: 4, dx: 0, dy: -96 });
  coin.road = road;
  run.route = road;
  step(run);
  assert(coin.magnetized, 'and on the road, the road\'s own coin run is his');
}
{
  // The lane coin at the same offset, to show the refusals above are about the
  // road and not about 96px being out of reach.
  const { run, coin } = magnetRun({ level: 4, dx: 0, dy: -96 });
  step(run);
  assert(coin.magnetized, 'an ordinary lane coin at that height is still caught');
}

// --- the tag is really laid, not just honoured ------------------------------
//
// spawnRoutePrizes is the site that folds a road's height into alt, so it is
// the site that has to hand back the road. Driven rather than eyeballed: a tag
// that stops being written is a silent return to the backwards answer.
{
  const run = new RunState({ stage, save, seed: 7, difficulty: 1, onEnd: () => {} });
  run.enter();
  run.pickups = [];
  // An island is the one route kind whose floor is a flat number, so the
  // fixture needs no terrain profile to be truthful.
  const road = { kind: 'island', x: run.camX + 200, w: 120, bodyW: 120, topY: 140, prize: 'coins', bonus: 'capShield' };
  run.routes = [road];
  run.spawnRoutePrizes();
  const laid = run.pickups.filter((p) => p.def.coin);
  assert(laid.length > 0, `the fixture actually laid a coin run (${laid.length})`);
  assert(laid.every((p) => p.road === road), 'every coin in a road\'s run is tagged with that road');
  const bonus = run.pickups.find((p) => p.type === 'capShield');
  assert(bonus && bonus.road === road, 'so is the capsule laid on it');
}
{
  // ...except the magnet capsule, which routePrizeAlt deliberately leaves on
  // the LANE floor so the magnet never becomes a route gate. It is not on the
  // road, so it must not be tagged as if it were — a hero running underneath
  // can still pull it in, which is the whole point of that placement.
  const run = new RunState({ stage, save, seed: 7, difficulty: 1, onEnd: () => {} });
  run.enter();
  run.pickups = [];
  const road = { kind: 'island', x: run.camX + 200, w: 120, bodyW: 120, topY: 140, prize: 'capMagnet' };
  run.routes = [road];
  run.spawnRoutePrizes();
  const cap = run.pickups.find((p) => p.type === 'capMagnet');
  assert(cap && !cap.road, 'the magnet capsule kept on the lane floor is not tagged onto the road');
}
{
  // A tossed coin owns its own arc until it settles; two systems writing x on
  // the same frame is how loot ends up teleporting.
  const { run, coin } = magnetRun({ level: 4, dx: -40, dy: 0 });
  coin.toss = true;
  step(run);
  assert(!coin.magnetized, 'a coin still in flight from a toss is left to its arc');
}

process.exit(failed ? 1 : 0);
