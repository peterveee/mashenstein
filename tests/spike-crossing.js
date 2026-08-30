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
const { SPIKE_SURFACE_Y } = await import('../src/game/run.js');
const { save } = await import('../src/engine/save.js');
const { Input } = await import('../src/engine/input.js');
const { DemoBot } = await import('../src/game/bot.js');
const { airtimeFor, PLAYER_X } = await import('../src/game/player.js');
const { crossingLayout, CROSSING_HOP, CROSSING_TREAD, CROSSING_RISE } = await import('../src/game/routes.js');
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
const longest = cast.reduce((a, h) => (airtimeFor(h) * h.speedMult > airtimeFor(a) * a.speedMult ? h : a));
const shortest = cast.reduce((a, h) => (airtimeFor(h) * h.speedMult < airtimeFor(a) * a.speedMult ? h : a));
assert(airtimeFor(longest) * longest.speedMult <= CROSSING_HOP + 2 * CROSSING_TREAD,
  `the tread catches the longest arc in the cast (${longest.id})`);
assert(CROSSING_HOP < airtimeFor(shortest) * shortest.speedMult,
  `the hop is clearable by the shortest (${shortest.id})`);

// ---- the layout -------------------------------------------------------------
const layout = crossingLayout(1000, 4, 240);
assert(layout.stones.length === 3, `four jumps means three stones (${layout.stones.length})`);
assert(Math.abs(layout.w - (4 * layout.hop + 3 * layout.tread)) < 0.001,
  'the break is exactly its hops and treads end to end');
assert(Math.abs(layout.stones[0].x - (layout.x + layout.hop)) < 0.001,
  'the first stone is one hop past the near lip');
const lastEnd = layout.stones[2].x + layout.stones[2].w;
assert(Math.abs((layout.x + layout.w) - (lastEnd + layout.hop)) < 0.001,
  'and the far lip is one hop past the last stone');

// ---- stages that carry one ---------------------------------------------------
const authored = STAGES.filter((s) => (s.pits || []).some((p) => p.jumps));
assert(authored.length > 0, `the game carries crossings (${authored.map((s) => s.id).join(', ')})`);
for (const stage of authored) {
  for (const p of stage.pits.filter((x) => x.jumps)) {
    assert(!p.w, `${stage.id}: a crossing derives its width rather than authoring one`);
    assert(p.jumps >= 3, `${stage.id}: a crossing is a sequence, not a hop (${p.jumps} jumps)`);
    // Past the last checkpoint (2/3) and clear of the finishing straight, so a
    // death hands back a short replay rather than the stage before it.
    assert(p.at > 2 / 3 && p.at < 0.85,
      `${stage.id}: the crossing sits just past a checkpoint (at ${p.at})`);
  }
}

// ---- a real run ---------------------------------------------------------------
save.load();
save.newSlot(0, 0);

const CROSS_AT = 0.70;
const stageWith = (crossing) => ({
  id: 'crossing-test', cabinet: 'rhythm', index: 2,
  mission: { type: 'reach', desc: 'TEST' },
  challenge: { type: 'coins', n: 9999, desc: 'TEST' },
  durationSec: 90, applianceAt: 0.2, applianceHigh: false,
  pits: crossing ? [{ at: CROSS_AT, jumps: 4 }] : null,
});

function newRun(heroId, opts = {}) {
  const run = new RunState({
    stage: stageWith(true),
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
assert(stones.length === 3, `and lays all three stones as routes (${stones.length})`);
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
// And the route sweeps leave it alone. This is the regression that motivated
// `is.crossing` in clearRouteHazards: the underside rule reads a hole beneath a
// slab as a hazard buried in it and deletes it, which leaves three platforms
// standing over solid ground.
probe.camX = plan.x - 100;
probe.clearRouteHazards();
assert(hole.live, 'and the route sweeps do not delete the hole the stones stand in');

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
    `${hero.id} crosses four jumps of spikes (${run.pitFails} falls, ${(ticks / 60).toFixed(1)}s)`);
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
  run.camX = cross.x + cross.hop * 0.5 - PLAYER_X;
  run.route = null;
  run.player.y = 0;
  run.player.vy = 0;
  run.player.grounded = true;
  run.update(TICK);
  assert(run.dead && !!run.pitDeath, 'standing in the break between stones is a pit death');
  assert(run.pitDeath && run.pitDeath.spikes, 'and it is a spike death, not a sinking one');
  // Fall him onto the teeth: he stops on the tips rather than passing through
  // them, and then he stays there.
  for (let i = 0; i < 120 && !(run.pitDeath && run.pitDeath.in); i++) run.update(TICK);
  assert(run.pitDeath && run.pitDeath.in, 'he reaches the bed');
  const restedAt = run.player.y;
  assert(Math.abs(restedAt - SPIKE_SURFACE_Y) < 0.001,
    `and stops on the tips the art draws (${restedAt.toFixed(1)} = ${SPIKE_SURFACE_Y})`);
  for (let i = 0; i < 60; i++) run.update(TICK);
  assert(Math.abs(run.player.y - restedAt) < 0.001,
    'teeth do not swallow him: no sink after the impact');
  // Never so far forward that the fall reads as a stunt. Half a crossing is
  // most of a screen.
  assert(run.pitDeath.carry <= 40,
    `the death carries him a fall's distance, not half the crossing (${run.pitDeath.carry.toFixed(0)}px)`);
}

dom.reset?.();
console.log(failed ? 'SPIKE-CROSSING: FAILED' : 'SPIKE-CROSSING: PASSED');
process.exit(failed ? 1 : 0);
