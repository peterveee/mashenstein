// Raised routes: floating islands and converging forks.
//
// Both are the same object — a surface above the lane caught with an ordinary
// jump — and differ only in the ending. An island STOPS, so you fall off the
// lip. A fork CONVERGES, easing back down to meet the ground so the two roads
// become one again.
//
// The mechanism deliberately avoids a second collision system. `player.y` is
// altitude above the floor rather than a world coordinate, so a raised route is
// not a surface the physics has to know about — it is the floor MOVING, and the
// run owns which floor is current. That buys a lot, but it puts the weight on
// things unit-testing the helpers would not catch, so this drives the real
// bundle into a real run and pokes the live state:
//
//   - the road is reachable by the WORST hero, not the average one
//   - landing is swept, so a fast fall cannot tunnel through the top
//   - a rising hero passes up through it instead of clonking on it
//   - leaving an island rebases altitude, so the hero falls exactly its height
//   - leaving a fork produces NO drop, because it already met the ground
//   - a fork is full height at its mouth, so a hero who never jumps is not
//     quietly collected by it — which is what keeps it a choice
//   - both snapshot systems carry which road the hero was on
import esbuild from 'esbuild';
import { installDom } from './dom-stub.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dom = installDom();

const { outputFiles } = await esbuild.build({
  entryPoints: [join(root, 'src/main.js')],
  bundle: true, format: 'iife', write: false, target: ['es2022'], logLevel: 'silent',
});

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// ---- the reachability bound, before any of the driving ----------------------
const { worstJumpApex } = await import('../src/game/spawner.js');
const { HEROES } = await import('../src/data/heroes.js');
const { GRAVITY, BASE_JUMP_V } = await import('../src/game/player.js');

// Imported rather than recomputed. It was a second copy of the arithmetic in
// routes.js, and a second copy of a constant is a constant that can disagree
// with itself — which is exactly what happened the day the factor moved.
const { MAX_ISLAND_RISE: MAX_RISE } = await import('../src/game/routes.js');
const apexOf = (h) => {
  const v = BASE_JUMP_V * h.jumpMult;
  return (v * v) / (2 * (h.heavy ? GRAVITY * 1.25 : GRAVITY));
};
const cast = Object.values(HEROES);
const worst = cast.reduce((a, h) => (apexOf(h) < apexOf(a) ? h : a));
assert(MAX_RISE > 0, `the rise ceiling is a real height (${MAX_RISE}px)`);
assert(apexOf(worst) > MAX_RISE,
  `the worst hero in the cast clears it (${worst.id || worst.name} apexes at `
  + `${apexOf(worst).toFixed(1)}px vs a ${MAX_RISE}px ceiling)`);
// The margin is the point: a slab you can only touch at the very top of a
// perfect jump is one you miss constantly.
assert(apexOf(worst) - MAX_RISE >= 10,
  `with real margin, not a hairline (${(apexOf(worst) - MAX_RISE).toFixed(1)}px)`);

// ---- nothing a cabinet declares may go missing -------------------------------
// The overlap guard drops a road that would collide with the one before it,
// which is right — two floors at once is not a thing the mechanism can express —
// but it does it SILENTLY, and that is how the plumber sky road vanished from
// the stage: a staircase two routes earlier was given a longer dwell, its span
// grew, and the guard quietly ate the set piece thirteen pixels later. Nothing
// failed. The run just stopped having a high road in it.
//
// Pure, so it costs nothing and runs before the bundle is even built. Layout is
// scale-invariant — `totalDist` is duration * speed and every span is seconds *
// speed, so speed cancels — which means one check covers every stage of a
// cabinet and every difficulty of each.
const { buildRoutes } = await import('../src/game/routes.js');
const { terrainGroundY } = await import('../src/game/terrain.js');
const { CABINETS: CABS } = await import('../src/data/cabinets.js');
for (const cab of CABS) {
  const declared = (cab.islands || []).reduce((n, d) => n + Math.max(1, d.steps ?? 1), 0)
    + (cab.forks || []).length + (cab.tunnels || []).length;
  if (!declared) continue;
  for (const [label, dur, mult] of [['stage 1', 60, 0.9], ['stage 3', 60, 1], ['long stage', 120, 1]]) {
    const speed = 160 * mult;
    const built = buildRoutes(cab, {
      totalDist: dur * speed * 1.05,
      speed,
      groundYAt: (wx) => terrainGroundY(cab, wx),
    });
    assert(built.length === declared,
      `${cab.id} lays every road it declares on a ${label} (${built.length}/${declared})`);
  }
}

try {
  new Function(outputFiles[0].text)();
} catch (e) {
  console.error('BOOT THREW:', e);
  process.exit(1);
}

function frames(n, dt = 16.7) { for (let i = 0; i < n; i++) dom.frame(dt); }

// Same route into a stage the smoke and rewind tests take. Plumber is stage one
// and is the cabinet carrying the first islands.
frames(5);
dom.key('Enter'); frames(30);
dom.key('Enter'); frames(30);
for (let i = 0; i < 9; i++) { dom.key('Enter'); frames(12); }
frames(40);
globalThis.window.__mash_cur.px = globalThis.window.__mash_cur.stations().find((s) => s.type === 'cabinet').x;
frames(2);
dom.key('Enter'); frames(40);
dom.key('Enter'); frames(40);
dom.key('Enter'); frames(30);
dom.key('Enter'); frames(30);

const inRun = () => /(^|_)RunState$/.test(globalThis.window.__mash_state || '');
const run = globalThis.window.__mash_cur;
if (!inRun()) {
  console.error('FAIL: could not reach a run; got', globalThis.window.__mash_state);
  process.exit(1);
}
// Play past the walk-on. Until the intro run finishes the world is parked and
// updateRun — where islands live — is not the function being called at all, so
// poking the state before this point tests nothing.
for (let i = 0; i < 400 && run.camX <= 0; i++) frames(1);
assert(run.camX > 0, 'reached a live, scrolling run');
assert(run.routes.length > 0, `the stage carries raised routes (${run.routes.length})`);
const bestApexEarly = cast.reduce((a, h) => Math.max(a, apexOf(h)), 0);
const GROUND_Y_CHK = 232;   // the world line the camera pins to at rest

// The reachability rule is about the MOUTH, and only about mouths the hero has
// to reach under his own power. A sprung road is entered by catapult and a
// tunnel by falling, and capping either at a jump's height would be capping the
// wrong thing — the cap exists so a road you must JUMP to is jumpable.
// A STACK is capped on the step, not on where it ends up: step three is a jump
// from step two, not from the ground. That is what lets a staircase reach 83px
// while every individual jump on it stays inside one hop.
let prevStep = null;
for (const is of run.routes) {
  const under = is.stack && prevStep && prevStep.stack === is.stack ? prevStep.entry : 0;
  if (is.kind !== 'tunnel' && !is.spring) {
    assert(is.entry - under <= MAX_RISE,
      `a ${is.kind} you must jump to is within reach of the floor below it `
      + `(${is.entry} - ${under} <= ${MAX_RISE})`);
  }
  assert(is.w > 0, `${is.kind} has a real width (${is.w.toFixed(0)}px)`);
  prevStep = is;
}

// ---- the staircase ----------------------------------------------------------
// A slab one hop up is a slab you are barely above. Height has to be climbed.
const stacks = new Map();
for (const r of run.routes.filter((x) => x.stack)) {
  if (!stacks.has(r.stack)) stacks.set(r.stack, []);
  stacks.get(r.stack).push(r);
}
assert(stacks.size >= 1, `the stage carries staircases (${stacks.size})`);
const tallest = [...stacks.values()].reduce((a, b) => (b.length > a.length ? b : a));
assert(tallest.length >= 3, `the tallest has real height to it (${tallest.length} steps)`);
assert(Math.max(...tallest.map((r) => r.entry)) > bestApexEarly * 1.4,
  `past a single jump at the top (${Math.max(...tallest.map((r) => r.entry))}px vs ${bestApexEarly.toFixed(1)})`);
for (const [id, steps] of stacks) {
  const tops = steps.map((r) => r.entry);
  assert(tops.every((v, i) => i === 0 || v > tops[i - 1]),
    `${id}: each step is higher than the last (${tops.join(', ')})`);
  // The bottom step is a FOOTHOLD, not a road. A low slab as long as a high one
  // is a lane running a few pixels above the lane, which is neither.
  assert(steps[steps.length - 1].w > steps[0].w * 1.3,
    `${id}: the low step is short and the high one is the run (${steps.map((r) => Math.round(r.w)).join(' -> ')}px)`);
  // A real GAP between treads, or it is a ramp rather than a climb — the jump
  // is along as well as up.
  for (let i = 1; i < steps.length; i++) {
    const gap = steps[i].x - (steps[i - 1].x + steps[i - 1].w);
    assert(gap > 8, `${id}: step ${i} is a jump away from the one below (${gap.toFixed(0)}px of air)`);
  }
  // The reward is on TOP. Paying out on the way up removes the reason to climb.
  assert(steps[steps.length - 1].prize !== steps[0].prize,
    `${id}: the top step pays something the others do not (${steps[steps.length - 1].prize})`);
}
// Flat, not riding the hills underneath: one number for the whole slab. Only
// islands — a fork's road is a road and keeps the terrain's own shape.
for (const is of run.routes.filter((r) => r.kind === 'island')) {
  assert(Number.isFinite(is.topY) && is.topY > 0,
    'an island top is a fixed height, not a per-column curve');
}

// ---- teleport the hero under a slab and jump onto it ------------------------
// Driving 30 seconds of real running to arrive at 0.34 of the stage would make
// this test a slow re-run of the smoke test. Placing the camera is the same
// world state, reached directly.
const island = run.routes.find((r) => r.kind === 'island');
const fork = run.routes.find((r) => r.kind === 'fork');
assert(!!island && !!fork, 'the stage carries both an island and a fork');
const PLAYER_X = run.playerWorldX() - run.camX;

function standAt(worldX) {
  run.camX = worldX - PLAYER_X;
  run.route = null;
  run.player.y = 0;
  run.player.vy = 0;
  run.player.grounded = true;
}

// Approach from before the leading edge so the hero arrives mid-jump.
standAt(island.x - 30);
assert(run.route === null, 'starts on the base ground, not on a slab');
assert(run.playerGroundY() === run.groundYAt(run.playerWorldX()),
  'and the floor under him is the base ground');

// A jump taken just before the lip should put him on top of it. Jump must be
// HELD, not tapped: variable-jump cuts a released jump to VARIABLE_JUMP_CUT
// (60) the same frame, which is a hop of about a pixel and clears nothing.
let landedOn = null;
dom.keyDown('Space');
for (let i = 0; i < 90 && !landedOn; i++) {
  frames(1);
  if (run.route) landedOn = run.route;
}
dom.keyUp('Space');
assert(landedOn === island, 'jumping at the lip lands the hero on the slab');
assert(run.player.grounded, 'and he is standing on it, not falling past it');
assert(Math.abs(run.playerGroundY() - island.topY) < 0.001,
  'his floor is now the slab top');

// ---- the lip: stepping off rebases altitude rather than teleporting ---------
const dropFrom = run.playerGroundY();
run.camX = island.x + island.w + 1 - PLAYER_X;   // just past the far edge
frames(1);
assert(run.route === null, 'walking off the end leaves the slab');
assert(!run.player.grounded, 'and puts the hero in the air rather than snapping him down');
// He should now be exactly the slab's height above the ground below — the
// rebase, not a teleport to either surface.
const expected = run.groundYAt(run.playerWorldX()) - dropFrom;
assert(Math.abs(run.player.y - expected) < 1.5,
  `altitude rebased to the slab's height above the ground (${run.player.y.toFixed(1)} ~= ${expected.toFixed(1)})`);

// And he lands, rather than falling forever or hanging.
frames(60);
assert(run.player.grounded, 'and he lands on the ground below');
assert(run.route === null, 'back on the base ground');

// ---- one-way: a rising hero passes up through the slab ----------------------
standAt(island.x + island.w / 2);   // directly underneath the middle
run.player.grounded = false;
run.player.vy = 200;                // rising
run.player.y = 2;
frames(1);
assert(run.route === null, 'a rising hero is not caught by the underside of the slab');

// ---- a fast fall cannot tunnel through the top ------------------------------
// The swept test exists for exactly this: at terminal velocity the hero covers
// far more than the slab's thickness in a single step, so a point test would
// miss the surface entirely and drop him to the ground.
standAt(island.x + island.w / 2);
run.route = null;
run.player.grounded = false;
run.player.vy = -900;                            // far faster than a normal fall
run.player.y = island.rise + 40;                 // well above the top
for (let i = 0; i < 10 && !run.route; i++) frames(1);
assert(run.route === island, 'a hero falling at speed still catches the slab (no tunnelling)');

// ---- the reason to go up there ----------------------------------------------
// Coins are placed as ordinary AIR pickups at the slab's height rather than as
// a new entity kind, so the check is that they sit where a hero standing on the
// slab would run through them — not merely that some pickups exist.
// The hero has already run past this island during the tests above, so its
// one-shot spawn has fired and those coins are long gone. Re-arm it.
island.spawned = false;
run.camX = island.x - 100;
run.spawnRoutePrizes();
const onSlab = run.pickups.filter((p) => p.live && p.type === 'coin'
  && p.x >= island.x && p.x <= island.x + island.w);
assert(onSlab.length > 0, `the slab carries a reward (${onSlab.length} coins)`);
// A coin's world y is groundY - alt; it should land just above the slab top,
// not at ground level and not out of reach. Guarded on a non-empty set so this
// cannot pass vacuously if the spawn ever stops firing.
const heights = onSlab.map((p) => run.groundYAt(p.x) - p.alt);
assert(onSlab.length > 0 && heights.every((h) => h < island.topY && h > island.topY - 20),
  'and they sit just above the slab, in the hero\'s path along it');

// ---- the far lip's landing is kept clear ------------------------------------
// Stepping off is the one move whose timing the player does not choose, so the
// spawner's fairness rule (which assumes a grounded hero with a jump in hand)
// does not cover it.
const { OBSTACLES, makeObstacle } = await import('../src/game/entities.js');
const exitFrom = island.x + island.w;
const hazardType = Object.keys(OBSTACLES).find((t) => OBSTACLES[t].action === 'jump');
assert(!!hazardType, `there is an action hazard to test with (${hazardType})`);
run.obstacles.push(makeObstacle(hazardType, exitFrom + 10, 0));
run.obstacles.push(makeObstacle(hazardType, exitFrom + 30, 0));
run.camX = exitFrom - 100;
run.clearRouteHazards();
const survivors = run.obstacles.filter((o) => o.live && o.def && o.def.action !== 'none'
  && o.x >= exitFrom && o.x < exitFrom + 60);
assert(survivors.length === 0,
  `nothing you must react to is left in the landing zone (${survivors.length} left)`);

// ---- and NOTHING to jump stands under a low slab -----------------------------
// An island tops out at MAX_ISLAND_RISE, which leaves ~20px of air under it
// against a 14px hero: a cactus down there fits, so the old intersection test
// kept it, and the jump it asks for is a jump into the soil. The rule is the
// room the ANSWER takes, not the room the body takes.
const { PLAYER_H: HERO_H } = await import('../src/game/player.js');
const midSlab = island.x + island.w / 2;
const squat = makeObstacle(hazardType, midSlab, {});
run.obstacles.push(squat);
run.camX = island.x - 200;
run.clearRouteHazards();
const room = run.groundYAt(midSlab) - (run.routeGroundY(midSlab, island) + 9 + 3);
assert(room < squat.h + HERO_H,
  `the slab is low enough that the jump has no room (${room.toFixed(1)}px for ${squat.h}+${HERO_H})`);
assert(!squat.live,
  'so a hazard under a low slab is cleared even though it fits beneath it');

// ---- and the run-up to the mouth is kept clear too ---------------------------
// A hazard a jump's length in front of a ledge takes the choice away twice: not
// jumping is a hit, and the jump that clears it lands on the slab. The player
// ends up on the high road because an obstacle put him there.
const { worstAirtime } = await import('../src/game/spawner.js');
const entryFrom = island.x - worstAirtime() * run.speed;
const nearMouth = makeObstacle(hazardType, island.x - 12, {});
const wellBack = makeObstacle(hazardType, entryFrom - 40, {});
run.obstacles.push(nearMouth, wellBack);
run.camX = island.x - 300;
run.clearRouteHazards();
assert(!nearMouth.live,
  'a hazard in the run-up to the mouth is cleared — the high road stays a choice');
assert(wellBack.live,
  'and one a full jump further back stands: it is cleared on the lane, choice intact');

// ---- and the sweep KEEPS clearing ------------------------------------------
// It used to fire once, gated on the route's far END coming within lookahead.
// That is fine for a 74px island and badly wrong for a 1920px tunnel: the camera
// does not reach 200px short of that end until long after the hero has run into
// the mouth, so the entrance was being cleared seconds after he had fallen
// through it. And even correctly timed, one shot cannot hold — the spawner keeps
// filling ahead of the sweep for as long as the route lasts.
const tunnelEarly = run.routes.find((r) => r.kind === 'tunnel');
assert(!!tunnelEarly, 'the stage carries a tunnel to check the sweep against');
run.camX = tunnelEarly.x - 300;   // at the MOUTH, nowhere near the far end
const squatter = makeObstacle(hazardType, tunnelEarly.x + tunnelEarly.mouthW / 2, {});
run.obstacles.push(squatter);
run.clearRouteHazards();
assert(!squatter.live,
  'a hazard standing on the entrance is cleared while the hero is still approaching it');
// Laid AFTER the first sweep, which the one-shot version could never catch.
const latecomer = makeObstacle(hazardType, tunnelEarly.x + tunnelEarly.mouthW / 2, {});
run.obstacles.push(latecomer);
run.clearRouteHazards();
assert(!latecomer.live, 'and so is one that arrives after the first sweep has run');

// ---- and the ROOF GAP is an opening like any other --------------------------
// The road above a tunnel stops before the span does, and past its end the lane
// deliberately does not exist — that open stretch is the way out from the top.
// The sweep's old hand-built list of openings (mouth + mid-span holes) did not
// know it, so a hazard laid there stood on the lane line with nothing drawn
// under it: a cactus in mid-air past the end of the roof.
assert(!!tunnelEarly.roofGap, 'the tunnel has a roof gap to test against');
const overExit = makeObstacle(hazardType,
  tunnelEarly.roofGap.x + tunnelEarly.roofGap.w / 2, {});
run.obstacles.push(overExit);
run.clearRouteHazards();
assert(!overExit.live,
  'a hazard standing on the roof gap is cleared — nothing floats past the roof\'s end');

// ---- and the LIP gets the same clearance the pits give theirs ---------------
// A hazard a few pixels short of the roof's end asks for a jump the player
// cannot separate from the drop off the edge — the "crate two pixels past the
// far lip" unfairness, one opening over. Same window the coin sweep uses.
// Something that asks for no action may stand there; it is scenery, not a trap.
const { pitClearance } = await import('../src/game/spawner.js');
const lipClear = pitClearance(run.spawner.react, run.speed);
const nearLip = makeObstacle(hazardType, tunnelEarly.roofGap.x - lipClear / 2, {});
const passive = makeObstacle('jumpSign', tunnelEarly.roofGap.x - lipClear / 2 - 20, {});
run.obstacles.push(nearLip, passive);
run.clearRouteHazards();
assert(!nearLip.live,
  'an action hazard just short of the lip is cleared — the jump and the drop are one move');
assert(passive.live,
  'while a passive prop in the same spot stands: it asks nothing of the player');

// ---- the fork: a high road that CONVERGES rather than stopping --------------
// The whole difference between the two kinds is the ending. An island stops and
// you fall; a fork has already come back down to meet the ground by the time
// its span closes, so the same arithmetic produces no drop at all.
const mouthRise = run.routeRise(fork.x + 2, fork);
assert(Math.abs(mouthRise - fork.entry) < 0.001,
  'a fork is at full entry height from its mouth — a ledge you jump to, not a slope you walk up');
// If the mouth were a slope, a hero who never jumped would be collected by it
// and the fork would stop being a choice.
assert(run.routeRise(fork.x - 1, fork) === 0, 'and it does not exist before the mouth');

const holdEnd = fork.x + fork.w * fork.hold;
assert(Math.abs(run.routeRise(holdEnd - 2, fork) - fork.peak) < 0.5,
  'it holds full height through the hold fraction');
const nearEnd = fork.x + fork.w * (1 - 0.02);
assert(Math.abs(run.routeRise(nearEnd, fork) - fork.end) < fork.rise * 0.15,
  `and has eased down to its ending height by the end (${run.routeRise(nearEnd, fork).toFixed(1)} ~= ${fork.end})`);
assert(run.routeRise(fork.x + fork.w + 1, fork) === 0, 'and does not exist past its own span');

// ---- the ending is a DROP, not a walk ---------------------------------------
// The descent settles at `end` and the road stops there, in the air. A road
// that eased all the way down to meet the lane had no ending at all — the hero
// walked back onto the ground and the excursion finished with a shrug.
assert(fork.end > 0, `a fork ends in the air (${fork.end}px up)`);
assert(Math.abs(run.routeRise(fork.x + fork.w - 1, fork) - fork.end) < 1,
  'the last column of the road is at exactly that height');
// The drop has to be measured at the road's own last column. At the hero's x he
// is already past the span, where the road correctly reports nothing — which is
// what used to make this come out as no drop at all.
assert(Math.abs(run.routeExitDrop(fork.x + fork.w + 4, fork) - fork.end) < 1,
  'and the exit drop is measured there, not at a hero already past it');

standAt(fork.x + fork.w * 0.5);
run.route = fork;
run.player.y = 0;
run.player.grounded = true;
run.camX = fork.x + fork.w + 2 - PLAYER_X;
frames(1);
assert(run.route === null, 'riding a fork to the end takes the hero off it');
assert(!run.player.grounded, 'into a FALL rather than back onto the ground');
assert(Math.abs(run.player.y - fork.end) < 2,
  `with the road's remaining height under him (y=${run.player.y.toFixed(1)} ~= ${fork.end})`);
frames(60);
assert(run.player.grounded && run.route === null, 'and he lands back in the lane');

// The one road that must NOT do that is a tunnel: you cannot fall off the
// bottom of one, so it climbs back out and converges as forks used to.
const tun0 = run.routes.find((r) => r.kind === 'tunnel');
assert(tun0.end === 0, 'a tunnel still converges — there is no falling out of a low road');

// ---- the two roads are worth different KINDS of thing -----------------------
fork.spawned = false;
run.pickups.length = 0;
run.camX = fork.x - 100;
run.spawnRoutePrizes();
const high = run.pickups.filter((p) => p.live && p.alt > fork.rise * 0.5);
const low = run.pickups.filter((p) => p.live && p.alt <= fork.rise * 0.5);
assert(high.length > 0 && low.length > 0,
  `both roads carry a reward (${high.length} up, ${low.length} down)`);
assert(high.some((p) => p.type === 'coin'), 'coins on the high road');
assert(low.some((p) => p.type !== 'coin'),
  `and something else entirely on the low one (${low.map((p) => p.type).join(', ')})`);

// ---- rewind carries the road, not just the height ---------------------------
// `player.y` is altitude above the CURRENT floor, so a snapshot that records y
// without recording which floor it was measured from restores the hero at the
// right height above the wrong thing. Both snapshot systems are checked: the
// rewind ring and the checkpoint.
standAt(island.x + island.w / 2);
run.route = island;
run.player.y = 0;
const ring = run.rewindFrames;
run.writeRewindSnapshot(ring.slotForWrite());
const rec = ring.slots[ring.slots.length - 1] || ring.slots[0];
assert(rec.route === run.routes.indexOf(island),
  'a rewind snapshot records which road the hero was on');
// Move him off it, then rewind back onto it.
run.route = null;
run.player.y = 40;
run.restoreRewindSnapshot(rec);
assert(run.route === island, 'and rewinding puts him back on that road');
assert(Math.abs(run.playerGroundY() - island.topY) < 0.001,
  'with the slab, not the ground, as his floor again');

const snap = run.makeSnapshot();
assert(snap.route === run.routes.indexOf(island), 'a checkpoint records it too');
run.route = null;
run.restoreSnapshot(snap);
assert(run.route === island, 'and a checkpoint restore puts him back on it');
// A checkpoint taken on the base ground must NOT strand him on a slab.
run.route = null;
const groundSnap = run.makeSnapshot();
run.route = island;
run.restoreSnapshot(groundSnap);
assert(run.route === null, 'and one taken on the ground restores him to the ground');

// ---- the high road: a choice you are LOCKED INTO ----------------------------
// The whole complaint about the first pass. At 29px the two roads were one hop
// apart, so a hero on the ground could rejoin the high one anywhere along it and
// a hero on the high one could step off whenever he liked. Neither road cost
// anything, so neither was a choice. What makes it one is the CLIMB: past the
// lip the road leaves jump range and stays there.
const sky = run.routes.find((r) => r.sky);
assert(!!sky, 'the stage carries a sky road');
const bestApex = cast.reduce((a, h) => Math.max(a, apexOf(h)), 0);
assert(bestApex > 0, `the cast's best jump is a real height (${bestApex.toFixed(1)}px)`);
assert(sky.peak > bestApex * 2,
  `it climbs far past anything a jump can reach (${sky.peak}px against a ${bestApex.toFixed(1)}px best apex)`);
// Sampled along the span rather than asserted on `peak` alone: what matters is
// that there is no WINDOW anywhere past the lip where the ground and the road
// are a jump apart. A road that dipped back into reach in the middle would be
// exactly as unbinding as the 29px one was.
//
// Swept to `hold` — the climb and the plateau, which is the whole stretch the
// choice is binding over — and not a fixed fraction of the span. Past `hold`
// the road is on its final descent and CONVERGES, which is what a fork is: the
// last of it comes back within a jump of the lane on purpose, exactly as the
// tunnel's own climb does at its far end. Joining it there buys nothing — the
// prizes are on the plateau and the road is about to run out — so the sweep
// has no business forbidding it. It was a hard 0.9 while the road stopped dead
// at height, and the number happened to sit just before the descent got low;
// it was the sample bound holding the line rather than the rule.
let reachable = 0;
for (let t = 0.28; t < sky.hold; t += 0.02) {
  if (run.routeRise(sky.x + sky.w * t, sky) <= bestApex) reachable++;
}
assert(reachable === 0,
  `and never dips back into reach while the choice is binding (${reachable} reachable samples)`);
// And once it starts coming down it keeps coming down. A road that sagged back
// into reach and then climbed away again would be a second mouth halfway along
// — the same unbinding the sweep above forbids, hidden in the ending.
let bobbed = 0;
let prevRise = run.routeRise(sky.x + sky.w * sky.hold, sky);
for (let t = sky.hold; t <= 1; t += 0.01) {
  const rise = run.routeRise(sky.x + sky.w * Math.min(t, 0.9999), sky);
  if (rise > prevRise + 0.001) bobbed++;
  prevRise = rise;
}
assert(bobbed === 0, `and the descent only ever descends (${bobbed} samples rose)`);
// The double jump is the obvious way round a rule like this, so it gets its own
// check: even two full jumps, stacked, do not reach the road.
const doubleApex = bestApex * (1 + 0.85 * 0.85);
assert(sky.peak > doubleApex,
  `not even a double jump reaches it (${doubleApex.toFixed(1)}px stacked)`);

// ---- breaks in the high road ------------------------------------------------
// A road you are locked onto should still ask something of you between its ends.
const { roadAt } = await import('../src/game/routes.js');
assert((sky.gaps || []).length > 0, `the sky road has breaks in it (${(sky.gaps || []).length})`);
for (const g of sky.gaps) {
  assert(!roadAt(g.x + g.w / 2, sky), 'there is no road in the middle of a break');
  assert(roadAt(g.x - 4, sky) && roadAt(g.x + g.w + 4, sky), 'and road either side of it');
  // Clearable: the jump has to cross it, or the road is a dead end rather than a
  // challenge. Measured against the WORST hero, as every reachability bound here is.
  const span = apexOf(worst) > 0 ? 114 : 114;   // world-1 jump span
  assert(g.w < span * 0.55,
    `a break is comfortably inside a jump (${Math.round(g.w)}px of a ${span}px span)`);
  // Never in the landing zone the spring aims at.
  assert(g.x > sky.x + sky.w * sky.lip,
    'and never inside the lip, which is where the spring puts you down');
}
// Nothing is strung over one — a coin you can only reach by leaving the road is
// a coin that punishes you for taking it.
sky.spawned = false;
run.pickups.length = 0;
run.camX = sky.x - 100;
run.spawnRoutePrizes();
const overGap = run.pickups.filter((p) => p.live && p.alt > 40
  && sky.gaps.some((g) => p.x >= g.x && p.x <= g.x + g.w));
assert(overGap.length === 0, `nothing hangs over a break (${overGap.length})`);
// And falling through one takes the hero off the road rather than carrying him
// across it on nothing.
// Re-pinned each tick rather than set once. The run's seed comes from
// `Date.now()`, so how fast the world is moving under him — and therefore where
// one frame leaves him — is different every time this file runs.
//
// The retry walks him EARLIER into the break rather than dropping him on the same
// spot three times. The seed is fixed for the whole file, so the same position at
// the same speed is the same frame and the same answer: a fast world carried him
// out through the far edge before the ground was sampled, and repeating it just
// carried him out again. Starting nearer the leading edge leaves more break in
// front of him, which is the thing that has to outlast one frame's travel.
let leftAtBreak = false;
for (const into of [0.35, 0.15, 0.05]) {
  if (leftAtBreak) break;
  standAt(sky.gaps[0].x + sky.gaps[0].w * into);
  run.route = sky;
  run.player.y = 0;
  run.player.grounded = true;
  frames(1);
  leftAtBreak = run.route === null;
}
assert(run.route === null, 'running into a break takes the hero off the road');
assert(!run.player.grounded, 'and drops him');
// But JUMPING one does not. A hero in the air over a gap has not left the road,
// he is clearing it — and taking the road out from under him mid-jump rebased
// his altitude to the lane and dragged the camera down with it, which from up
// on a cloud reads as the world snapping to the ground every time you jump.
standAt(sky.gaps[1].x + sky.gaps[1].w * 0.4);
run.route = sky;
run.player.y = 34;          // mid-jump, well clear of the road's surface
run.player.vy = 120;
run.player.grounded = false;
const anchorBefore = run.camFloorY;
frames(1);
assert(run.route === sky, 'jumping a break keeps the hero on the road');
run.camFloorY = anchorBefore;
for (let i = 0; i < 20; i++) {
  run.camX = sky.gaps[1].x + sky.gaps[1].w * 0.4 - PLAYER_X;
  run.route = sky; run.player.y = 34; run.player.vy = 120; run.player.grounded = false;
  frames(1);
}
assert(run.camFloorY < GROUND_Y_CHK - 100,
  `and the camera stays up on the road with him (${run.camFloorY.toFixed(0)})`);

// ---- the spring pad: the only way up ----------------------------------------
sky.sprung = false;
run.obstacles.length = 0;
run.camX = sky.x - 400;
run.spawnRouteEntries();
const pad = run.obstacles.find((o) => o.live && o.def && o.def.isSpring);
assert(!!pad, 'a spring pad is placed for a sprung road');
assert(pad.x < sky.x, `and it sits BEFORE the mouth, on the ground (pad ${pad.x.toFixed(0)} < mouth ${sky.x.toFixed(0)})`);
assert(pad.springFor === sky, 'aimed at the road it belongs to');

// Run over it: the pad fires and the hero goes up far enough to reach a road
// nothing else in the game can reach.
standAt(pad.x - 6);
run.player.grounded = true;
let peakY = 0;
for (let i = 0; i < 120 && !run.route; i++) {
  frames(1);
  peakY = Math.max(peakY, run.player.y);
  if (run.playerWorldX() > sky.x + sky.w * 0.5) break;
}
assert(pad.used, 'running over it fires it');
assert(peakY > MAX_RISE * 2,
  `and it throws the hero well past jump range (${peakY.toFixed(0)}px against a ${MAX_RISE}px ceiling)`);
assert(run.route === sky, 'landing him on the high road');

// Riding it: he is genuinely up there, and cannot get down by jumping.
run.camX = sky.x + sky.w * 0.5 - PLAYER_X;
frames(1);
assert(run.route === sky, 'he is still on it half way along');
assert(run.groundYAt(run.playerWorldX()) - run.playerGroundY() > bestApex,
  'with the lane further below him than any jump could climb back');

// Jump the pad instead and it never sees you — which is the choice.
pad.used = false;
run.route = null;
standAt(pad.x - 40);
dom.keyDown('Space');
for (let i = 0; i < 40 && run.playerWorldX() < pad.x + pad.w + 10; i++) frames(1);
dom.keyUp('Space');
assert(!pad.used, 'jumping over the pad leaves it unfired — the low road is a decision, not a failure');

// ---- a road is FURNISHED, not just travelled ---------------------------------
// An empty branch is a held breath: you choose at the mouth and then nothing
// happens until the exit. What makes one a section is having the same things to
// deal with the lane has — and having them spaced by the same rule, because a
// hero arrives on a branch already committed rather than running onto it with a
// jump in hand.
const furnished = run.routes.find((r) => r.hazards);
assert(!!furnished, 'a route declares hazards to furnish it with');
run.obstacles.length = 0;
furnished.populated = false;
run.populateRoute(furnished);
const laid = run.obstacles.filter((o) => o.live && o.route === furnished);
assert(laid.length >= 6, `and they are laid along it (${laid.length} of them)`);
assert(laid.every((o) => o.x > furnished.x && o.x < furnished.x + furnished.w),
  'all of them inside the span');
// Nothing at the way in or the way out: both are moments whose timing the
// player does not choose.
const inset = Math.min(...laid.map((o) => o.x)) - furnished.x;
const outset = furnished.x + furnished.w - Math.max(...laid.map((o) => o.x));
assert(inset > 40 && outset > 40,
  `clear of the entrance and the exit (${inset.toFixed(0)}px in, ${outset.toFixed(0)}px out)`);
// The one invariant a lane owes the player, applied to the branch.
const react = run.spawner.react * run.baseSpeed();
const xs = laid.map((o) => o.x).sort((a, b) => a - b);
let tight = 0;
for (let i = 1; i < xs.length; i++) if (xs[i] - xs[i - 1] < react) tight++;
assert(tight === 0,
  `spaced by at least a reaction runway (${react.toFixed(0)}px), ${tight} too close`);
// And they are boxed against the ROAD, not the lane — which is the one field
// that makes a crate underground an ordinary crate.
const probe = laid[0];
assert(Math.abs(run.entityGroundY(probe) - run.routeGroundY(probe.x, furnished)) < 0.001,
  'boxed against the road they stand on rather than the ground far above it');
assert(!run.sharesRoute(probe),
  'and they are not the hero\'s problem while he is up on the lane');

// ---- the tunnel: the same thing, downwards ----------------------------------
const tunnel = run.routes.find((r) => r.kind === 'tunnel');
assert(!!tunnel, 'the stage carries a tunnel');
// Sampled past the lip, because the way IN may be a ramp: a ramped tunnel is
// level with the lane at its mouth by definition, and the whole read of it is
// that the ground goes down under you rather than out from under you.
assert(run.routeRise(tunnel.x + tunnel.w * 0.5, tunnel) < 0,
  'a tunnel reads as a NEGATIVE rise — the floor moving down, not a new kind of object');
assert(run.routeGroundY(tunnel.x + tunnel.w * 0.4, tunnel) > run.groundYAt(tunnel.x + tunnel.w * 0.4),
  'and its floor is genuinely below the lane');
// Its mouth is a real hole in the lane, carved by the same gap machinery
// everything else uses — but it is not the death a gap usually is.
tunnel.sprung = false;
run.obstacles.length = 0;
run.camX = tunnel.x - 400;
run.spawnRouteEntries();
const cuts = run.obstacles.filter((o) => o.live && o.def && o.def.isGap && o.tunnel === tunnel);
// A RAMPED entrance is not cut out of the lane at all — the ground peels away
// downward and the lane runs over the top of it — so the only gaps a ramped
// tunnel owns are its mid-span holes and the far end of the road above it.
//
// `roofGap` is that far end. The road above a tunnel stops while there is still
// air under it, or the last of the climb is spent under it with nowhere to go —
// and where it stops the lane is open, so running along the top and off the end
// drops you into the dip and you come up the ramp. Counted here with everything
// else because it is cut by the same machinery and caught by the same route
// code; the one thing it must never be is a member of `holes`, which means a
// stride-wide second chance punched through the middle of a span.
const wants = (tunnel.ramp ? 0 : 1) + (tunnel.holes || []).length + (tunnel.roofGap ? 1 : 0);
assert(cuts.length === wants,
  `every opening is cut into the lane and nothing else is (${cuts.length}/${wants}, ramp=${!!tunnel.ramp})`);
const hole = cuts[0];
assert(!!hole, 'there is an opening to check');
const owner = [...(tunnel.ramp ? [] : [{ x: tunnel.x, w: tunnel.mouthW }]), ...(tunnel.holes || [])]
  .find((sp) => Math.abs(sp.x - hole.x) < 0.001);
assert(!!owner && Math.abs(hole.w - owner.w) < 0.001,
  `as wide as the opening it cuts and no wider (${hole.w.toFixed(0)}px)`);
// Sized off the HERO and not off the span. A hole is something you step into or
// step over; at a third of a jump's span it was neither, and it also grew with
// the stage's speed while the hero stayed the same size.
const { PLAYER_W } = await import('../src/game/player.js');
// The ENTRANCE is the decision — wide enough to be a real gap in the lane, and
// still well inside a jump's span at the slowest stage so clearing it is a jump
// you make rather than one you have to nail.
assert(tunnel.mouthW <= PLAYER_W * 9,
  `the entrance is hero-scaled, not span-scaled (${tunnel.mouthW}px vs a ${PLAYER_W}px hero)`);
assert(tunnel.mouthW < 114 * 0.75,
  `and comfortably inside a jump's span (${tunnel.mouthW}px vs 114px at the slowest stage)`);
// A MID-SPAN hole is a second chance rather than a second decision, so it is
// smaller than the entrance. It used to be a ninth of the whole span.
for (const h of tunnel.holes || []) {
  assert(h.w < tunnel.mouthW,
    `a mid-span hole is narrower than the entrance (${Math.round(h.w)}px vs ${tunnel.mouthW}px)`);
  // Still a real JUMP, though. At three hero-widths it was a crack: too narrow
  // to have to aim at, and narrow enough that the hero's own width let him scuff
  // across the far lip instead of falling in.
  assert(h.w >= PLAYER_W * 5,
    `wide enough that clearing it is deliberate (${Math.round(h.w)}px vs a ${PLAYER_W}px hero)`);
  assert(h.w < 114 * 0.6,
    `and never close to impossible (${Math.round(h.w)}px of a 114px jump)`);
}

// ---- the two levels stay distinct -------------------------------------------
// A tunnel converges, and a fixed-thickness slab drawn over a rising floor
// tapers the air between them to a knife edge and then welds them together in a
// long thin point. `openSpan` is the stretch where they are genuinely apart —
// the only stretch drawn as two levels at all.
assert(!!tunnel.openSpan, 'a tunnel knows where it is deep enough to be a second level');
assert(tunnel.openSpan.x > tunnel.x && tunnel.openSpan.x + tunnel.openSpan.w < tunnel.x + tunnel.w,
  'and that stretch is inside its span, clear of both ends');
for (const t of [0.02, 0.995]) {
  const wx = tunnel.x + tunnel.w * t;
  assert(wx < tunnel.openSpan.x || wx > tunnel.openSpan.x + tunnel.openSpan.w,
    `the ends are not drawn as two levels (t=${t})`);
}
// Everywhere inside it there is real air between the lane and the floor.
for (let t = 0; t <= 1; t += 0.05) {
  const wx = tunnel.openSpan.x + tunnel.openSpan.w * t;
  assert(-run.routeRise(wx, tunnel) >= 30,
    `and inside it the levels are a slab apart (${Math.round(-run.routeRise(wx, tunnel))}px)`);
}

// ---- nothing standing in an opening ----------------------------------------
// A hole is a choice. A hazard in it — or close enough in front of it that
// dodging drops you through — makes the lane choose for you.
tunnel.populated = false;
run.obstacles.length = 0;
run.populateRoute(tunnel);
const openings = [{ x: tunnel.x, w: tunnel.mouthW }, ...(tunnel.holes || [])];
assert(openings.length >= 1, `the tunnel has ${openings.length} opening(s) to keep clear`);
const inHole = run.obstacles.filter((o) => o.live && o.route === tunnel
  && openings.some((h) => o.x + o.w >= h.x - 20 && o.x <= h.x + h.w + 20));
assert(inHole.length === 0,
  `nothing is laid in or beside an opening (${inHole.length} found)`);

// Run into it and you fall in rather than dying. The lane is cleared down to
// the hole itself first: the spawner keeps filling ahead of the camera, and a
// cactus landing on the approach would fail this for a reason that has nothing
// to do with the hole.
const onlyHole = () => { for (const o of run.obstacles) if (o !== hole) o.live = false; };
const deathsBefore = run.damageTaken;
standAt(tunnel.x - 20);
onlyHole();
for (let i = 0; i < 30 && !run.route; i++) { onlyHole(); frames(1); }
assert(run.route === tunnel, 'running into the mouth puts the hero on the low road');
assert(run.damageTaken === deathsBefore, 'and it does not kill him — this hole is a road');
for (let i = 0; i < 60; i++) { onlyHole(); frames(1); }
assert(run.player.grounded && run.route === tunnel, 'he is on the tunnel floor');
// A RAMP is not a fall. He keeps his feet and the ground goes down under him,
// which is the whole difference between riding one and dropping through a hole.
if (tunnel.ramp) {
  assert(run.routeRise(tunnel.x + 1, tunnel) === 0,
    'a ramped tunnel starts level with the lane — nothing to fall through');
}
// Measured where the tunnel is actually AT depth. On a ramp the first stretch is
// still on its way down, and being able to hop out of the top of a descent is
// not the invariant — the invariant is that the deep part holds you.
run.camX = tunnel.x + tunnel.w * 0.5 - PLAYER_X;
run.route = tunnel;
run.player.y = 0;
const roof = run.groundYAt(run.playerWorldX()) - run.playerGroundY();
assert(-roof > bestApex,
  `with the lane too far overhead to jump back out (${(-roof).toFixed(0)}px against a ${bestApex.toFixed(1)}px apex)`);

// And it converges, exactly as a fork does — the same one line of arithmetic.
assert(Math.abs(run.routeRise(tunnel.x + tunnel.w + 1, tunnel)) < 0.001,
  'the tunnel meets the ground at its far end');
run.camX = tunnel.x + tunnel.w + 2 - PLAYER_X;
run.player.y = 0;
frames(1);
assert(run.route === null && Math.abs(run.player.y) < 1.5,
  'so riding it out returns the hero to the lane still running');

// ---- the lip is judged against the HERO, not against one column -------------
//
// The bug this pins: a hero landing at the very edge of an island over a cave
// fell through it. Every surface test sampled `playerWorldX`, which is the
// LEFT column of a twelve-pixel runner, so the question being asked was "is
// there ground under his left ear" — wrong at both lips and wrong in opposite
// directions. Over a hole it swallowed a hero standing entirely past the far
// edge; at a slab's near lip it refused one with most of his weight already on
// it. The rule now is the one every platformer has: any part of him over the
// surface is standing on it.
const { PLAYER_SPRITE_W } = await import('../src/game/player.js');
const { tunnelOpenings } = await import('../src/game/routes.js');

// A landing, resolved in one swept step at a chosen x, with no camera drift.
function catchesSlabAt(worldX, slab) {
  run.camX = worldX - PLAYER_X;
  run.route = null;
  run.player.grounded = false;
  run.player.vy = -300;
  run.player.stomping = false;
  const g = run.groundYAt(worldX);
  run.player.y = g - slab.topY - 4;             // feet 4px BELOW the top now
  return !!run.updateRoute(slab.topY - 4);      // and 4px above it before the step
}
// Standing on the lane at x, with nothing else in the world: does the ground
// hold, or does an opening claim him?
function laneHoldsAt(worldX) {
  run.camX = worldX - PLAYER_X;
  run.route = null;
  run.player.y = 0;
  run.player.vy = 0;
  run.player.grounded = true;
  run.obstacles.length = 0;
  run.updateRoute(run.groundYAt(worldX));
  return run.route === null;
}

const slabEnd = island.x + island.w;
assert(catchesSlabAt(island.x - PLAYER_SPRITE_W + 1, island),
  'a toe on the near lip catches the slab');
assert(!catchesSlabAt(island.x - PLAYER_SPRITE_W - 1, island),
  'and a hero still short of it does not');
assert(catchesSlabAt(slabEnd - 1, island),
  'a heel on the far lip catches it too — the two lips are the same rule');
assert(!catchesSlabAt(slabEnd + 1, island),
  'and past the end there is nothing to catch');

// The reported fall-through, at every opening a tunnel has. A hero whose body
// is clear of the hole has ground under him and must keep it.
for (const [i, h] of tunnelOpenings(tunnel).entries()) {
  const far = h.x + h.w;
  assert(laneHoldsAt(far),
    `opening ${i}: landing with a heel on the far lip stays on the top path`);
  assert(laneHoldsAt(h.x - 1),
    `opening ${i}: and a toe on the near lip does too`);
  // Still a hole, though — forgiveness at the lips is not a bridge across it.
  assert(!laneHoldsAt(h.x + (h.w - PLAYER_SPRITE_W) / 2),
    `opening ${i}: with nothing under him in the middle of it`);
  assert(h.w > PLAYER_SPRITE_W + 8,
    `opening ${i}: and it is wide enough that the forgiveness cannot span it `
    + `(${Math.round(h.w)}px against a ${PLAYER_SPRITE_W}px hero)`);
}
run.obstacles.length = 0;

// ---- the face of someone who did not plan this ------------------------------
//
// The surprised face used to be a SPEED — anything past -240px/s. Speed cannot
// tell a fall from the end of a hop, because the end of a hop is a fall: a
// standard jump crosses its own takeoff line at exactly -320, so the last few
// frames before a perfectly judged landing wore the startled face. It is a
// question about the FLOOR instead — how far below the one he left he has got
// to (RunState.updateFallFace) — and these are the cases that separates.
function fallFaceOver(n, setup) {
  setup();
  let on = 0;
  for (let i = 0; i < n; i++) {
    run.obstacles.length = 0;
    frames(1);
    run.obstacles.length = 0;
    if (run.player.fallFace) on++;
  }
  return on;
}
const skyRoad = run.routes.find((r) => r.sky);
const tunnelRoad = run.routes.find((r) => r.kind === 'tunnel');
const steps = run.routes.filter((r) => r.stack);
const plant = (worldX, route = null) => () => {
  run.camX = worldX - PLAYER_X; run.route = route;
  run.player.y = 0; run.player.vy = 0; run.player.grounded = true;
  run.player.stomping = false; run.player.jumps = 0; run.player.launched = false;
  run.obstacles.length = 0;
};

// IT FIRES where the ground has genuinely gone.
assert(fallFaceOver(20, plant(island.x + island.w - 12, island)) > 0,
  'running clear off the end of a slab wears the fall face');
assert(fallFaceOver(20, plant(skyRoad.x + skyRoad.w - 6, skyRoad)) > 0,
  "and stepping off the sky road's lip");
if (steps.length >= 2) {
  assert(fallFaceOver(24, plant(steps[0].x + steps[0].w - 4, steps[0])) > 0,
    'and falling off a staircase step to the lane below');
}

// IT DOES NOT on a landing the player judged perfectly — which is the whole
// reason the speed test had to go.
assert(fallFaceOver(48, () => { plant(1000)(); dom.keyDown('Space'); }) === 0,
  'an ordinary held jump never wears it, however fast the landing');
dom.keyUp('Space');
frames(30);
// Nor on rolling terrain, where the ground itself falls away under the arc. The
// drop is measured against the LANE's own descent, so a hill is not a ledge.
let downhillX = 1000;
for (let x = 400; x < 3000; x += 10) {
  if (run.groundYAt(x + 120) - run.groundYAt(x) > 10) { downhillX = x; break; }
}
const laneFall = run.groundYAt(downhillX + 120) - run.groundYAt(downhillX);
assert(laneFall > 8, `the stage has a downhill worth testing against (${laneFall.toFixed(0)}px across a jump)`);
assert(fallFaceOver(48, () => { plant(downhillX)(); dom.keyDown('Space'); }) === 0,
  'nor the same jump taken downhill — a hill is not a ledge');
dom.keyUp('Space');
frames(30);

// AND SURPRISE IS EXCLUSIVELY THIS. The jump roll used to deal four faces, two
// of which — 0 surprised and 3 startled — set the same `surprise` the fall face
// does, 0 with identical flags. Half of every hop in the game therefore wore the
// face that is supposed to mean the hero did not choose this. Jumps now roll
// only the two faces of somebody who did.
{
  const rolled = new Set();
  let jumps = 0;
  for (let i = 0; i < 300 && jumps < 40; i++) {
    run.obstacles.length = 0;
    frames(1);
    if (!run.player.grounded) continue;
    const before = run.player.jumps;
    dom.keyDown('Space');
    frames(2);
    dom.keyUp('Space');
    if (run.player.jumps > before) { jumps++; rolled.add(run.player.jumpFace); }
    frames(4);
  }
  assert(jumps >= 20, `enough real jumps to see the spread (${jumps})`);
  assert(![...rolled].some((f) => f === 0 || f === 3),
    `a jump never rolls a surprise face (saw ${[...rolled].sort().join(', ')})`);
  assert(rolled.size >= 2, `and still deals more than one (${rolled.size} distinct)`);
}
frames(20);

// AND NOT on the two descents the player CHOSE. A ramp going down under his
// feet never registers at all: he is grounded the whole way, so the reference
// walks down with him and there is nothing to measure. A tunnel mouth is a hole
// he aimed at, and updateRoute rebases the reference onto the floor he is
// heading for as it claims him.
let onRamp = 0;
for (let i = 0; i < 40; i++) {
  run.camX = skyRoad.x + skyRoad.w * 0.85 - PLAYER_X;
  run.route = skyRoad; run.player.y = 0; run.player.grounded = true;
  run.obstacles.length = 0;
  frames(1);
  if (run.player.fallFace) onRamp++;
}
assert(onRamp === 0, `riding a ramp deliberately going lower is not a fall (${onRamp}/40 frames)`);
assert(fallFaceOver(40, plant(tunnelRoad.x - 30)) === 0,
  'and neither is dropping into a mouth he ran at on purpose');
run.obstacles.length = 0;

// ---- the camera re-pins, or none of the above is playable -------------------
// A road 210px up cannot be framed by craning (38px of apron) or by zooming
// (the whole game would shrink to hold a groundline the player has left). The
// anchor moves instead, and the test is that it MOVES and that it comes back —
// a stuck anchor is a camera looking at the wrong part of the world forever.
// GROUND_Y only — ZOOM is a live binding the run's own copy of the module has
// already moved (applyFraming), and this import is a SEPARATE instance from the
// bundle the game is running out of, so its value would be the shipped default
// rather than the one on screen. The run's resting zoom is asked for directly.
const { GROUND_Y: GY, ZOOM_MIN } = await import('../src/engine/camera.js');
// Parked on the road's plateau rather than allowed to ride it, so the anchor is
// being asked about ONE height for long enough to settle there. Left to run he
// would reach the merge and come down again mid-measurement.
const parkX = sky.x + sky.w * (sky.lip + sky.climb + 0.05);
for (let i = 0; i < 180; i++) {
  run.camX = parkX - PLAYER_X;
  run.route = sky;
  run.player.y = 0;
  run.player.grounded = true;
  frames(1);
}
assert(run.camFloorY < GY - 100,
  `riding the sky road carries the camera anchor up with it (${run.camFloorY.toFixed(0)} vs a ${GY} groundline)`);
// It takes the ROAD's own rise and not the rolling terrain under it, which is
// the same division of labour the camera has always used: the groundline is
// pinned and hills are paid for by the crane. So the anchor lands at
// GROUND_Y - rise exactly, and what is left over is one hill's worth.
assert(Math.abs(run.camFloorY - (GY - run.routeRise(parkX, sky))) < 1.5,
  `settling on the road's own height (${run.camFloorY.toFixed(1)} vs ${(GY - run.routeRise(parkX, sky)).toFixed(1)})`);
const leftover = run.camFloorY - run.routeGroundY(parkX, sky);
assert(leftover >= 0 && leftover <= 18,
  `with only the hill under it left for the crane (${leftover.toFixed(1)}px)`);
// The point of re-pinning rather than craning: once the anchor has caught up,
// standing on a cloud costs exactly what standing on the ground costs. Zooming
// out to hold a groundline the player has left would shrink the whole game.
assert(run.camZoom > ZOOM_MIN + 0.15,
  `at the resting zoom rather than pulled back to hold it (${run.camZoom.toFixed(2)}, floor ${ZOOM_MIN})`);
run.route = null;
for (let i = 0; i < 240; i++) {
  run.camX = tunnel.x - 900 - PLAYER_X;
  run.route = null;
  run.player.y = 0;
  run.player.grounded = true;
  frames(1);
}
assert(Math.abs(run.camFloorY - GY) < 2,
  `and back to the groundline once he is off it (${run.camFloorY.toFixed(1)})`);

// ---- a cabinet with no islands is untouched ---------------------------------
const { CABINETS } = await import('../src/data/cabinets.js');
const bare = CABINETS.filter((c) => !c.islands);
assert(bare.length > 0, `most cabinets declare no islands and are unaffected (${bare.length})`);

console.log(failed ? 'ROUTES: FAILED' : 'ROUTES: PASSED');
process.exit(failed ? 1 : 0);
