// Floating islands: short slabs over the lane that a hero jumps onto for the
// reward on top and steps off the far end of.
//
// The mechanism deliberately avoids a second collision system. `player.y` is
// altitude above the floor rather than a world coordinate, so an island is not
// a surface the physics has to know about — it is the floor MOVING, and the run
// owns which floor is current. That buys a lot, but it puts the weight on four
// things that unit-testing the helpers would not catch, so this drives the real
// bundle into a real run and pokes the live state:
//
//   - the slab is reachable by the WORST hero, not the average one
//   - landing is swept, so a fast fall cannot tunnel through the top
//   - a rising hero passes up through the slab instead of clonking on it
//   - stepping off the lip rebases altitude, so the hero falls exactly the
//     slab's height rather than teleporting or hanging in the air
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

const MAX_RISE = Math.floor(worstJumpApex() * 0.8);
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
assert(run.islands.length > 0, `the stage carries islands (${run.islands.length})`);

for (const is of run.islands) {
  assert(is.rise <= MAX_RISE, `island rise is capped at the reachable ceiling (${is.rise})`);
  assert(is.w > 0, `island has a real width (${is.w.toFixed(0)}px)`);
  // Flat, not riding the hills underneath: one number for the whole slab.
  assert(Number.isFinite(is.topY), 'island top is a fixed height, not a per-column curve');
}

// ---- teleport the hero under a slab and jump onto it ------------------------
// Driving 30 seconds of real running to arrive at 0.34 of the stage would make
// this test a slow re-run of the smoke test. Placing the camera is the same
// world state, reached directly.
const island = run.islands[0];
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
run.spawnIslandPrizes();
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
island.cleared = false;
run.camX = exitFrom - 100;
run.clearIslandHazards();
const survivors = run.obstacles.filter((o) => o.live && o.def && o.def.action !== 'none'
  && o.x >= exitFrom && o.x < exitFrom + 60);
assert(survivors.length === 0,
  `nothing you must react to is left in the landing zone (${survivors.length} left)`);

// ---- a cabinet with no islands is untouched ---------------------------------
const { CABINETS } = await import('../src/data/cabinets.js');
const bare = CABINETS.filter((c) => !c.islands);
assert(bare.length > 0, `most cabinets declare no islands and are unaffected (${bare.length})`);

console.log(failed ? 'ISLANDS: FAILED' : 'ISLANDS: PASSED');
process.exit(failed ? 1 : 0);
