// THE STEPPING-STONE CROSSING: a break too wide to jump, with stones in it.
//
// The set piece is four jumps and three landings over a spiked hole, and what
// makes it worth a suite of its own is that it is the first hazard in the game
// where an arc can be too LONG. Everywhere else the lane is the landing, so any
// jump that clears the thing is a good jump; here the landing is a stone the
// width of half a second, and the cast's airtimes run from Grumpos' 0.57s to
// Clara's 0.82s against ONE fixed layout in pixels. A hero without
// `variableJump` cannot make his jump shorter than it is, so there is no timing
// that saves a layout sized for the average hero.
//
// So the claims, in order of what breaks first:
//
//   the WINDOW — every hero in the cast has a real stretch of stone he may take
//                off from and still land on the next one. Checked in seconds of
//                his own travel, which is the unit the player experiences.
//   the STONES — a crossing lays every stone it declares. The overlap guard in
//                routes.js drops roads silently, and a crossing missing its
//                middle stone is not a thinner set piece, it is a death trap.
//   the HOLE   — one gap, as wide as the layout says, filled with spikes rather
//                than with the cabinet's own material, and still alive after the
//                route sweeps have run over it. `clearRouteHazards` reads a hole
//                under a slab as a hazard buried in it, and used to delete it.
//   the RUN    — the demo bot takes every hero in the cast across a real one.
//                The window arithmetic above is a model; this is the mechanism.
//   the DEATH  — missing a stone is a pit death, and on spikes he stops on the
//                tips instead of sinking through them.
import { installDom } from './dom-stub.js';
const dom = installDom();

const { RunState } = await import('../src/game/run.js');
const { fillSurfaceY } = await import('../src/game/run.js');
const { riseHeight } = await import('../src/game/terrain.js');
const { save } = await import('../src/engine/save.js');
const { Input } = await import('../src/engine/input.js');
const { DemoBot } = await import('../src/game/bot.js');
const { airtimeFor, PLAYER_X } = await import('../src/game/player.js');
const { crossingLayout, CROSSING_HOP, CROSSING_TREAD, CROSSING_RISE, CROSSING_BOOST_CLEAR } = await import('../src/game/routes.js');
const { makeObstacle } = await import('../src/game/entities.js');
const { hasPitFill } = await import('../src/game/pitFill.js');
const { GROUND_Y } = await import('../src/game/run.js');
const { HEROES } = await import('../src/data/heroes.js');
const { STAGES } = await import('../src/data/stages.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const cast = Object.values(HEROES);

// ---- the window, hero by hero ----------------------------------------------
// Scale-invariant, so one pass covers every stage the crossing could ever be
// laid on: hop and tread are seconds of lane travel and a hero's own arc is
// seconds of his, so the reference speed cancels out of every comparison.
// `speedMult` does NOT cancel — a faster hero covers more ground in the same
// airtime while the stones stay where they are — so it stays in.
//
// Standing on a stone whose far edge is the origin, a takeoff at p (negative,
// behind the edge) lands at p + span. Landing on the next stone means
//   hop <= p + span <= hop + tread
// and p is on the stone he is standing on, so p is in [-tread, 0]. The overlap
// of those two is the window, and it is the whole of what this hazard asks the
// player for.
const WINDOW_FLOOR = 0.12;   // seconds. Seven frames is the least this may ever be.
for (const hero of cast) {
  const span = airtimeFor(hero) * hero.speedMult;   // in seconds of the reference lane
  const hop = CROSSING_HOP;
  const tread = CROSSING_TREAD;
  assert(hop < span * 0.8,
    `${hero.id} clears a hop with room to spare (${hop} vs a ${span.toFixed(2)} arc)`);
  const from = Math.max(-tread, hop - span);
  const to = Math.min(0, hop + tread - span);
  const window = (to - from) / hero.speedMult;      // back into HIS seconds
  assert(to > from,
    `${hero.id} has a takeoff point at all — his arc can be aimed onto the stone`);
  assert(window >= WINDOW_FLOOR,
    `${hero.id} has a real window to take off in (${window.toFixed(3)}s)`);
}
// The two numbers are the cast's, not one hero's: the tread has to catch the
// longest arc in the bag and the hop has to be clearable by the shortest. If a
// later tune breaks either end, the assertions above go first — this one says
// WHY in one line.
// AND THE SAME QUESTION AT 1.4x, which is a SPEED power-up held at level 2.
//
// The stones do not move when the lane speeds up, so a power-up lengthens every
// arc against a fixed layout — the one case where a hero can be too fast for a
// hazard rather than too slow. It is allowed to be tight (the player chose to
// hold a speed burst into a precision sequence) and it is not allowed to be
// impossible, which is what it was at the tread this started with.
const POWERUP_MULT = 1.4;
for (const hero of cast) {
  const span = airtimeFor(hero) * hero.speedMult * POWERUP_MULT;
  const from = Math.max(-CROSSING_TREAD, CROSSING_HOP - span);
  const to = Math.min(0, CROSSING_HOP + CROSSING_TREAD - span);
  const window = (to - from) / (hero.speedMult * POWERUP_MULT);
  assert(to > from,
    `${hero.id} can still land on a stone with a level-2 SPEED burst up (${window.toFixed(3)}s)`);
}

const longest = cast.reduce((a, h) => (airtimeFor(h) * h.speedMult > airtimeFor(a) * a.speedMult ? h : a));
const shortest = cast.reduce((a, h) => (airtimeFor(h) * h.speedMult < airtimeFor(a) * a.speedMult ? h : a));
assert(airtimeFor(longest) * longest.speedMult <= CROSSING_HOP + 2 * CROSSING_TREAD,
  `the tread catches the longest arc in the cast (${longest.id})`);
assert(CROSSING_HOP < airtimeFor(shortest) * shortest.speedMult,
  `the hop is clearable by the shortest (${shortest.id})`);

// ---- the layout -------------------------------------------------------------
const layout = crossingLayout(1000, 5, 240);
assert(layout.stones.length === 4, `five jumps means four stones (${layout.stones.length})`);
assert(Math.abs(layout.w - (5 * layout.hop + 4 * layout.tread)) < 0.001,
  'the break is exactly its hops and treads end to end');
assert(Math.abs(layout.stones[0].x - (layout.x + layout.hop)) < 0.001,
  'the first stone is one hop past the near lip');
const lastEnd = layout.stones[3].x + layout.stones[3].w;
assert(Math.abs((layout.x + layout.w) - (lastEnd + layout.hop)) < 0.001,
  'and the far lip is one hop past the last stone');

// ---- WHERE A FATAL HOLE MAY STAND, on every stage in the game -----------------
//
// Not only the crossings. A pit kills and a death goes back to the last
// checkpoint, so what a hole really costs is the stretch you replay to reach it
// again — and that is a property of the STAGE DATA, not of the hazard. Twelve of
// them were authored past ten seconds of replay and the worst charged
// twenty-six, which is the complaint that produced this rule.
//
// It lives in this suite because the crossing is what made the cost impossible
// to ignore, and because the arithmetic is the same for both: `at` minus the
// checkpoint behind it, times the stage's own duration.
const CHECKPOINTS = [0, 1 / 3, 2 / 3];   // 0 is the restart, which is a checkpoint too
const REPLAY_MAX = 10;                   // seconds of play. One honest run-up.
const REPLAY_MIN = 1.5;                  // and a beat to read the lane after a restore
for (const stage of STAGES) {
  for (const p of stage.pits || []) {
    const prev = CHECKPOINTS.filter((c) => c <= p.at).pop();
    const cost = (p.at - prev) * stage.durationSec;
    const what = p.jumps ? 'crossing' : 'pit';
    assert(cost <= REPLAY_MAX,
      `${stage.id}: the ${what} at ${p.at} costs ${cost.toFixed(1)}s of replay, not more than ${REPLAY_MAX}`);
    assert(cost >= REPLAY_MIN,
      `${stage.id}: and lands ${cost.toFixed(1)}s after the checkpoint, not on top of it`);
  }
}

// ---- stages that carry one ---------------------------------------------------
const authored = STAGES.filter((s) => (s.pits || []).some((p) => p.jumps));
assert(authored.length > 0, `the game carries crossings (${authored.map((s) => s.id).join(', ')})`);
for (const stage of authored) {
  for (const p of stage.pits.filter((x) => x.jumps)) {
    assert(!p.w, `${stage.id}: a crossing derives its width rather than authoring one`);
    assert(p.jumps >= 3, `${stage.id}: a crossing is a sequence, not a hop (${p.jumps} jumps)`);
    // The replay budget above covers where it stands; what is left is the one
    // thing a crossing asks that an ordinary hole does not — it is several
    // seconds wide, so it may not be laid against the tape.
    assert(p.at < 0.85, `${stage.id}: clear of the finishing straight (at ${p.at})`);
  }
}

// ---- a real run ---------------------------------------------------------------
save.load();
save.newSlot(0, 0);

const CROSS_AT = 0.70;
const stageWith = (crossing, opts = {}) => ({
  id: 'crossing-test', cabinet: 'rhythm', index: 2,
  mission: { type: 'reach', desc: 'TEST' },
  challenge: { type: 'coins', n: 9999, desc: 'TEST' },
  durationSec: 90, applianceAt: 0.2, applianceHigh: false,
  pits: crossing ? [{ at: CROSS_AT, jumps: 5, fill: opts.fill }] : null,
});

function newRun(heroId, opts = {}) {
  const run = new RunState({
    stage: stageWith(true, opts),
    team: [heroId],
    save,
    seed: 4242,
    difficulty: 1,
    devStartPercent: opts.startAt ?? 0,
    onEnd: () => {},
  });
  run.enter();
  return run;
}

const probe = newRun('lorenzo');
const stones = probe.routes.filter((r) => r.crossing);
assert(probe.crossings.length === 1, `the run resolves the stage's crossing (${probe.crossings.length})`);
assert(stones.length === 4, `and lays every stone as a route (${stones.length})`);
assert(stones.every((r) => r.kind === 'island'), 'the stones are ordinary islands, not a new kind of floor');
assert(stones.every((r) => Math.abs(r.entry - CROSSING_RISE) < 0.001),
  `each stands the same small height above the lane (${CROSSING_RISE}px)`);
assert(stones.every((r) => r.prize === null),
  'and pays nothing — a coin on a stone is a coin where the player has no attention spare');
const plan = probe.pitPlan.find((pp) => pp.crossing);
assert(!!plan && Math.abs(plan.w - probe.crossings[0].w) < 0.001,
  'the hole and the stones are cut from one layout');
// The stones are laid before anything a cabinet declares and are never dropped.
for (let i = 1; i < stones.length; i++) {
  const gap = stones[i].x - (stones[i - 1].x + stones[i - 1].w);
  assert(Math.abs(gap - probe.crossings[0].hop) < 0.001,
    `stone ${i} is exactly one hop from the one before (${gap.toFixed(1)}px)`);
}

// The hole itself, cut when the camera comes within range of it. The cut fires
// once the plan is inside 760px of the camera — near enough that the hint in
// front of it is off screen too.
probe.camX = plan.x - 700;
probe.spawnScriptedPits();
const hole = probe.obstacles.find((ob) => ob.live && ob.def.isGap && ob.crossing);
assert(!!hole, 'the crossing cuts one hole in the lane');
assert(hole && Math.abs(hole.w - plan.w) < 0.001, 'as wide as the whole crossing');
assert(hole && hole.fill === 'spikes',
  'filled with spikes whatever the cabinet pours into its own holes');
// Signed on sight rather than after a death: the instinct a crossing punishes
// is the one every other hole in the game rewards.
const sign = probe.obstacles.find((ob) => ob.live && ob.def && ob.def.sign && ob.crossing);
assert(!!sign, 'a JUMP sign stands at the lip without anyone having to fall first');
assert(sign && sign.x < hole.x && sign.x + sign.w > hole.x - 40,
  'right at the lip, where one jump clears the sign and the hole together');
assert(hole.signed, 'and the earned hint is not spent again on the same hole');
// And the route sweeps leave it alone. This is the regression that motivated
// `is.crossing` in clearRouteHazards: the underside rule reads a hole beneath a
// slab as a hazard buried in it and deletes it, which leaves three platforms
// standing over solid ground.
probe.camX = plan.x - 100;
probe.clearRouteHazards();
assert(hole.live, 'and the route sweeps do not delete the hole the stones stand in');

// ---- nothing that makes the jump longer stands in the run-up -------------------
// A boost pad is the one thing a tread cannot be sized for: +0.5 speedBoost is a
// 1.5x lane for the better part of a second, and at that speed every takeoff
// point on a stone overshoots the next one. So the pads come out of the approach
// rather than the geometry stretching to catch them.
{
  const run = newRun('gnash');
  const cross = run.crossings[0];
  const pad = makeObstacle('boostPad', cross.x - cross.hop * 2, {});
  run.obstacles.push(pad);
  const far = makeObstacle('boostPad', cross.x - CROSSING_BOOST_CLEAR * run.speed - 200, {});
  run.obstacles.push(far);
  run.camX = cross.x - 700;
  run.spawnScriptedPits();
  assert(!pad.live, 'a boost pad in the run-up to a crossing is swept');
  assert(far.live, 'and one a boost-length further back is left where it was laid');
}

// ---- every hero crosses it ----------------------------------------------------
const TICK = 1 / 60;
for (const hero of cast) {
  const run = newRun(hero.id, { startAt: CROSS_AT - 0.04 });
  const bot = new DemoBot(run);
  const cross = run.crossings[0];
  let ticks = 0;
  // Far side plus a beat, or death, whichever comes first.
  while (!run.dead && run.camX + PLAYER_X < cross.x + cross.w + 60 && ticks < 60 * 30) {
    ticks++;
    bot.update(TICK);
    run.update(TICK);
  }
  bot.releaseAll();
  Input.endFrame();
  assert(!run.dead && run.pitFails === 0,
    `${hero.id} crosses five jumps of spikes (${run.pitFails} falls, ${(ticks / 60).toFixed(1)}s)`);
}

// ---- the hole outlives its own near edge ---------------------------------------
// The lane retires what is behind the camera, and it used to do it on an
// obstacle's NEAR edge — true of everything a stride wide and false of a
// crossing, which is several hundred pixels of gap. Retired 80px in, the second
// half of the set piece became stones floating over ground you could stand on.
{
  const run = newRun('lorenzo', { startAt: CROSS_AT - 0.04 });
  const bot = new DemoBot(run);
  const cross = run.crossings[0];
  let deepest = null;
  for (let i = 0; i < 60 * 30 && run.camX + PLAYER_X < cross.x + cross.w - 20; i++) {
    bot.update(TICK);
    run.update(TICK);
    if (run.camX > cross.x + cross.w * 0.6) {
      deepest = run.obstacles.find((ob) => ob.live && ob.crossing);
    }
  }
  bot.releaseAll();
  Input.endFrame();
  assert(!!deepest, 'the hole is still in the world two thirds of the way across it');
}

// ---- and missing one is a death ------------------------------------------------
// The other half of the same claim: the stones are the ONLY way over. Dropped
// between two of them, on the ground, the hero is in the hole.
{
  const run = newRun('lorenzo', { startAt: CROSS_AT - 0.04 });
  const cross = run.crossings[0];
  // Run up to the hole so it is cut, then stand him in the middle of the first
  // hop — over the break, off every stone.
  for (let i = 0; i < 60 * 20 && !run.obstacles.some((ob) => ob.live && ob.crossing); i++) run.update(TICK);
  const gapOb = run.obstacles.find((ob) => ob.live && ob.crossing);
  assert(!!gapOb, 'the hole is in the world by the time the hero reaches it');
  // The LAST hop, not the first: deep enough in that the lane's retirement
  // sweep has had every chance to throw the hole away behind the camera.
  run.camX = cross.x + cross.w - cross.hop * 0.5 - PLAYER_X;
  run.route = null;
  run.player.y = 0;
  run.player.vy = 0;
  run.player.grounded = true;
  run.update(TICK);
  assert(run.dead && !!run.pitDeath, 'standing in the break between stones is a pit death');
  assert(run.pitDeath && run.pitDeath.hard, 'and it is a hard landing, not a sinking one');
  // Fall him onto the teeth: he stops on the tips rather than passing through
  // them, and then he stays there.
  for (let i = 0; i < 120 && !(run.pitDeath && run.pitDeath.in); i++) run.update(TICK);
  assert(run.pitDeath && run.pitDeath.in, 'he reaches the bed');
  const restedAt = run.player.y;
  // The teeth lie at a fixed depth below the FLAT groundline, and the road over
  // a crossing is raised — so where he comes to rest is that depth plus the
  // hill. Altitude is relative to the local floor, which is the raised one.
  const want = fillSurfaceY('spikes') - riseHeight(run.playerWorldX());
  assert(Math.abs(restedAt - want) < 0.001,
    `and stops on the tips the art draws (${restedAt.toFixed(1)} = ${want.toFixed(1)})`);
  for (let i = 0; i < 60; i++) run.update(TICK);
  assert(Math.abs(run.player.y - restedAt) < 0.001,
    'teeth do not swallow him: no sink after the impact');
  // Never so far forward that the fall reads as a stunt. Half a crossing is
  // most of a screen.
  assert(run.pitDeath.carry <= 40,
    `the death carries him a fall's distance, not half the crossing (${run.pitDeath.carry.toFixed(0)}px)`);
}

// ---- and a crossing never eats a road ------------------------------------------
// The overlap guard in buildRoutes drops whatever a cabinet declares near a
// crossing, silently, because two floors at once is not a thing the mechanism
// can express. That is the right resolution and the wrong THING to happen: a
// stage that quietly loses its staircase to a set piece has traded content for
// content. Every stage in the game, built for real, against what its cabinet
// declares.
{
  const { CABINET_BY_ID } = await import('../src/data/cabinets.js');
  for (const stage of STAGES.filter((st) => (st.pits || []).some((p) => p.jumps))) {
    const cab = CABINET_BY_ID[stage.cabinet];
    const declared = (cab.islands || []).reduce((n, d) => n + Math.max(1, d.steps ?? 1), 0)
      + (cab.forks || []).length + (cab.tunnels || []).length;
    if (!declared) continue;
    const run = new RunState({ stage, team: ['lorenzo'], save, seed: 1, difficulty: 1, onEnd: () => {} });
    run.enter();
    const built = run.routes.filter((r) => !r.crossing).length;
    assert(built === declared,
      `${stage.id}: the crossing leaves every road the cabinet declares (${built}/${declared})`);
  }
}

// ---- the road climbs over it ---------------------------------------------------
// Only the top half of any hole is ever on screen, so a crossing cut into the
// flat lane is a groove. The rise is what makes it a pit — and it has to be in
// the ground line every part of the game reads, not just in the drawing.
{
  const run = newRun('lorenzo');
  const c = run.crossings[0];
  const lip = riseHeight(c.x);
  const mid = riseHeight(c.x + c.w / 2);
  const away = riseHeight(c.x - 4000);
  assert(lip > 10 && mid > 10, `the road stands up over the crossing (${lip.toFixed(0)}px)`);
  assert(away === 0, 'and is back to the cabinet\'s own ground well away from it');
  // Eased, not stepped: a wall at the lip is a thing you run into.
  const ramp = riseHeight(c.x - 60);
  assert(ramp > 0 && ramp < lip, `it ramps up rather than stepping (${ramp.toFixed(1)} -> ${lip.toFixed(0)})`);
  // The stones ride up with it, or they would hang at the old lane height with
  // the road climbing past them.
  const stone = run.routes.find((r) => r.crossing);
  assert(stone.topY < GROUND_Y - CROSSING_RISE + 1,
    'and the stones sit on the raised line, not the flat one');
}

// ---- the works -----------------------------------------------------------------
// The second hard fill. Same mechanism, different tone and a different surface:
// a hero comes to rest on top of the wheels, which are set deeper than the teeth
// because a gear is a body and not a point.
{
  const run = newRun('lorenzo', { fill: 'gears', startAt: CROSS_AT - 0.04 });
  const plan2 = run.pitPlan.find((pp) => pp.crossing);
  assert(plan2.fill === 'gears', 'a stage can name the works instead of the teeth');
  run.camX = plan2.x - 700;
  run.spawnScriptedPits();
  const gapOb = run.obstacles.find((ob) => ob.live && ob.crossing);
  assert(gapOb && gapOb.fill === 'gears', 'and the hole carries it');
  assert(fillSurfaceY('gears') < fillSurfaceY('spikes'),
    `the wheels stop him lower than the teeth do (${fillSurfaceY('gears')} vs ${fillSurfaceY('spikes')})`);
  assert(hasPitFill('gears') && hasPitFill('spikes'), 'both hard fills are registered painters');
}

dom.reset?.();
console.log(failed ? 'SPIKE-CROSSING: FAILED' : 'SPIKE-CROSSING: PASSED');
process.exit(failed ? 1 : 0);
