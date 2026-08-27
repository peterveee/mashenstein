// THE BANANA PEEL — the standing kart-racer one — whose only answer is the jump:
// it costs a battery cell like anything else, and then takes the next beat of
// the run with it. The hero's feet go out, he is slowed, and he cannot jump
// until he is back up.
//
// What this suite is really pinning is the set of things the peel is NOT, since
// every one of them is an escape hatch some other ground hazard has and the
// peel's whole identity is having none of them: it is not breakable, not
// puntable, and a slide does not clear it. Those are one-line facts in the
// registry today and exactly the kind of line a later pass "tidies" into
// consistency with its neighbours.
import { installDom } from './dom-stub.js';
installDom();

const { OBSTACLES, makeObstacle, entityBox, overlaps } = await import('../src/game/entities.js');
const { RunState } = await import('../src/game/run.js');
const { save } = await import('../src/engine/save.js');
const { Player, SLIP_T, PLAYER_X, PLAYER_H } = await import('../src/game/player.js');
const { hasProp, propSprite, propDetailScale, propHazardRim } = await import('../src/sprites/props.js');
const { CABINETS } = await import('../src/data/cabinets.js');
const { worstJumpApex } = await import('../src/game/spawner.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// --- the registry entry ----------------------------------------------------
const peel = OBSTACLES.bananaPeel;
assert(!!peel, 'bananaPeel is a registered obstacle');
assert(peel.ground === true, 'the peel stands on the ground rather than flying');
assert(peel.action === 'jump', 'the spawner budgets the peel as a jump, so it gets landing room');
assert(peel.slip === true, 'the peel declares the slip that makes it different');
// The three escape hatches it deliberately does not have.
assert(peel.breakable === false, 'no weapon, stomp or shockwave removes a peel');
assert(!peel.punt, 'a peel cannot be punted — a low boot meets the floor, not the prop');
assert(peel.action !== 'duck', 'the peel is never duckable: sliding into it still slips');
// It STANDS. Two earlier passes drew it flat on the road at 12x5 and both were
// unreadable: a five-pixel hazard has no silhouette, and the kart-racer peel it
// is modelled on stands up — one skin upright with the stalk on top, the rest
// fanned around its foot. Wider than tall because of that fan.
// SIZE IS MEASURED AGAINST THE HERO, not against the other props. At 16x10 the
// peel stood two thirds of Lorenzo's collision height and read as furniture to
// be got over rather than as litter dropped on a road — the joke needs it to
// look like a small thing. It is now well under half his height, and must stay
// there: a later pass that "makes the hazard clearer" by growing it is the exact
// regression this pins.
assert(peel.h <= PLAYER_H * 0.5,
  `the peel is litter, not furniture — well under half the hero's height (${peel.h} vs ${PLAYER_H})`);
assert(peel.h >= 5, `and still has enough height to carry its arc and stalk (${peel.h}px)`);
assert(peel.w > peel.h, 'the fanned skins make its base wider than it is tall');
assert(peel.h < worstJumpApex(),
  `every hero clears the peel by a mile (${peel.h}px vs a worst-case ${worstJumpApex().toFixed(0)}px apex)`);
// The one other unbreakable ground hazard is the pipe, which is unbreakable
// because it is scenery you climb. Nothing else in the table may quietly join.
const slippery = Object.entries(OBSTACLES).filter(([, d]) => d.slip);
assert(slippery.length === 1 && slippery[0][0] === 'bananaPeel',
  'the peel is the only slippery thing in the game');

// --- the art ---------------------------------------------------------------
assert(hasProp('bananaPeel'), 'the peel has a vector painter');
// Three, not the usual two. The peel's box is six pixels tall and the two marks
// the whole drawing rests on — the arc's neck, and the lens of background
// between it and the upper skin — both close up when rasterized that small at
// 2x, leaving one yellow smear with a dark speck on it.
assert(propDetailScale('bananaPeel') === 3,
  'the peel authors its four tapered skins at triple internal detail');
assert(propHazardRim('bananaPeel') === false,
  'the peel outlines itself: the shared rim would close the gaps between its fanned skins');
const art = propSprite('bananaPeel', peel.w, peel.h);
assert(art && art.width > 0 && art.height > 0, 'the peel rasterizes to a real canvas');

// --- the cabinets that carry it, and the cap -------------------------------
// AT MOST ONE PEEL PER RUN. The peel was benched for a while and is now back as
// a single `once` pattern — one cell replacing one obstacle — and the cap is the
// whole design: the gag is that you did not expect it, and a gag stops being one
// the third time it happens.
//
// Every claim below is about that cap holding, because it is the kind of rule
// that is broken by an edit somewhere else entirely: a second pattern added to
// another cabinet, a copy made instead of a reference, or The Surge's union
// picking a shared pattern up once per cabinet that carries it.
const carries = (id) => {
  const cab = CABINETS.find((c) => c.id === id);
  return cab.patterns.filter((p) => p.cells.some((c) => c.t === 'bananaPeel'));
};
for (const cab of CABINETS) {
  const pats = cab.patterns.filter((p) => p.cells.some((c) => c.t === 'bananaPeel'));
  assert(pats.length <= 1, `${cab.id} carries at most one peel pattern (${pats.length})`);
  assert(pats.every((p) => p.once), `${cab.id}'s peel pattern is marked once`);
  assert(pats.every((p) => p.cells.filter((c) => c.t === 'bananaPeel').length === 1),
    `${cab.id}'s peel pattern places exactly one peel`);
}
assert(carries('plumber').length === 1, 'Plumber carries one');
assert(carries('speed').length === 1, 'Speed Zone carries one');
// The Surge remixes every other cabinet's bank. It must not therefore inherit
// one peel per cabinet — this is the assertion that fails if the shared pattern
// object is ever copied instead of referenced.
assert(carries('surge').length === 1,
  `The Surge inherits exactly one peel pattern, not one per cabinet (${carries('surge').length})`);
assert(carries('plumber')[0] === carries('speed')[0],
  'every cabinet references the SAME peel pattern object, so one `once` covers them all');

// Plumber's variety complaint, stated as a number rather than a feeling. Its
// own patterns (not the shared BASE_PATTERNS) must reach past cactus and crate.
const plumber = CABINETS.find((c) => c.id === 'plumber');
const groundTypes = new Set();
for (const pat of plumber.patterns) {
  for (const cell of pat.cells) {
    const def = OBSTACLES[cell.t];
    if (def && def.ground && !def.isGap && !def.isBoost && !def.isSpring && !def.isLoop) groundTypes.add(cell.t);
  }
}
assert(groundTypes.size >= 5,
  `Plumber's lane runs to at least five ground props (${[...groundTypes].sort().join(', ')})`);
// Whatever fills the peel's slot has to do the job the peel was added for: a
// hazard most first runs actually meet. Benching it must not quietly take
// Plumber's tier-0 ground game back down to a cactus and a box.
const tier0Ground = new Set();
for (const pat of plumber.patterns) {
  if (pat.tier !== 0) continue;
  for (const cell of pat.cells) {
    const def = OBSTACLES[cell.t];
    if (def && def.ground && !def.isGap && !def.isBoost && !def.isSpring && !def.isLoop) tier0Ground.add(cell.t);
  }
}
assert(tier0Ground.size >= 3,
  `Plumber introduces at least three ground props at tier 0 (${[...tier0Ground].sort().join(', ')})`);

// --- the cap, and REACHABILITY, proved by running the spawner ---------------
// Two claims, and the second one is the one that was actually broken: a peel
// pattern can be in the bank, marked `once`, with every structural test above
// passing, and still be impossible to meet in the stage most people play.
//
// `tierMax` is min(2, (stage.index - 1) + (act - 1)), so stage 1 of every act-1
// cabinet runs at tierMax 0. With the peel at tier 1 it existed in the data and
// never once appeared in Plumber-1 or Speed-1. Rarity is the `once` flag's job;
// the tier decides whether the thing is reachable at all, and those are not the
// same knob.
//
// Distances here are REAL stage lengths — duration * baseSpeed * 1.05, which is
// what RunState computes — not a long sweep. An earlier version of this test ran
// 24000px and reported a healthy hit rate for a peel no first-stage player could
// ever see.
{
  const { Spawner } = await import('../src/game/spawner.js');
  const { Rng } = await import('../src/engine/rng.js');
  const { CABINET_BY_ID } = await import('../src/data/cabinets.js');
  const BASE_SPEED = 160;
  const DURATION = { plumber: 60, speed: 60, surge: 120 };
  const SEEDS = 120;

  for (const id of ['plumber', 'speed', 'surge']) {
    const cab = CABINET_BY_ID[id];
    const base = BASE_SPEED * (1 + (cab.speedBonus || 0));
    const total = DURATION[id] * base * 1.05;
    for (let stage = 1; stage <= 3; stage++) {
      const tierMax = Math.min(2, (stage - 1) + (cab.act - 1));
      let hits = 0, worst = 0;
      for (let seed = 1; seed <= SEEDS; seed++) {
        const sp = new Spawner({ cabinet: cab, rng: new Rng(seed), tierMax });
        const obstacles = [], pickups = [];
        sp.nextX = 300;
        for (let x = 0; x < total; x += 240) {
          sp.fill(x, base * 1.3, obstacles, pickups, () => 45, total);
        }
        const n = obstacles.filter((o) => o.type === 'bananaPeel').length;
        worst = Math.max(worst, n);
        if (n) hits++;
      }
      // THE CAP: never two, on any seed, in any stage.
      assert(worst <= 1, `${id}-${stage}: never more than one peel in a run (worst ${worst})`);
      // THE REACHABILITY: it has to actually turn up, including at tierMax 0.
      assert(hits > SEEDS * 0.4,
        `${id}-${stage} (tierMax ${tierMax}): a peel is reachable and common enough to meet `
        + `(${hits}/${SEEDS} runs)`);
    }
  }
}

// --- the slip itself -------------------------------------------------------
save.load();
save.newSlot(0, 0);
const stage = {
  id: 'test-1', cabinet: 'plumber', index: 1,
  mission: { type: 'reach', desc: 'TEST' },
  challenge: { type: 'coins', n: 9999, desc: 'TEST' },
  durationSec: 40, applianceAt: 0.5, applianceHigh: false,
};
const makeRun = () => new RunState({ stage, save, seed: 12345, difficulty: 1, onEnd: () => {} });

// Park a peel exactly under the hero and let collide() find it. Everything else
// on the field is cleared so the assertion can only be about the peel.
function runIntoPeel(prepare) {
  const run = makeRun();
  run.enter();
  run.obstacles = [];
  run.pickups = [];
  run.projectiles = [];
  const pbox = run.playerBox();
  const ob = makeObstacle('bananaPeel', pbox.x + pbox.w / 2 - OBSTACLES.bananaPeel.w / 2);
  run.obstacles.push(ob);
  if (prepare) prepare(run, ob);
  assert(overlaps(run.playerBox(), entityBox(ob, run.entityGroundY(ob))),
    'the fixture actually puts the hero on the peel');
  const before = { battery: run.battery, damage: run.damageTaken };
  run.collide();
  return { run, ob, before };
}

{
  const { run, ob, before } = runIntoPeel();
  assert(run.battery === before.battery - 1, `running into a peel costs a battery cell (${run.battery})`);
  assert(run.damageTaken === before.damage + 1, 'and counts as damage taken');
  assert(run.player.slipT === SLIP_T, `the hero is drawn tumbling for SLIP_T (${run.player.slipT})`);
  assert(run.player.stumbleT >= SLIP_T, 'and carries the stumble for at least as long');
  assert(ob.live && !ob.broken,
    'the peel is still there afterwards: running into it is not how you clear it');
  // The jump is gone for the beat. This is the part a player feels.
  assert(run.player.jumpPressed(null) === false, 'no jumping mid-slip');
  run.player.slipT = 0; run.player.stumbleT = 0;
  assert(run.player.jumpPressed(null) === true, 'and the jump comes straight back when it clears');
}

// Slowed, not stopped. The stumble's existing 0.72 is what the peel spends.
{
  const clean = makeRun();
  clean.enter();
  const fullSpeed = clean.speed;
  const { run } = runIntoPeel();
  assert(run.speed < fullSpeed, `a slipping hero is slower (${run.speed.toFixed(0)} vs ${fullSpeed.toFixed(0)})`);
}

// THE SLIDE DOES NOT SAVE YOU. This is the peel's reason to exist beside the
// cone rows: holding duck through a lane stops being free.
{
  const { run } = runIntoPeel((r) => {
    r.player.grounded = true;
    r.player.duckAmount = 1;
    r.player.duckHoldT = 0;
    r.player.ducking = true;
  });
  assert(run.player.slipT === SLIP_T, 'sliding into a peel still slips');
}

// UNPEELABLE. The power-up is literally named for this and has to hold: no
// damage, and no pratfall either — slipping through a deflected hit would have
// the hero fall over while the shield tells him he is fine.
{
  const { run, before } = runIntoPeel((r) => {
    r.powerups.grab('unpeel', { minDuration: 30 });
    r.powerups.shieldStack = 0;
  });
  assert(run.battery === before.battery, 'UNPEELABLE deflects the peel');
  assert(run.player.slipT === 0, 'and there is no pratfall behind the deflection');
}

// A shield absorbs the hit; same rule.
{
  const { run, before } = runIntoPeel((r) => { r.powerups.grab('shield'); });
  assert(run.battery === before.battery, 'a shield absorbs the peel');
  assert(run.player.slipT === 0, 'an absorbed hit is not a pratfall');
}

// I-frames ghost it entirely, exactly as they do every other hazard.
{
  const { run, before } = runIntoPeel((r) => { r.player.iframes = 1; });
  assert(run.battery === before.battery && run.player.slipT === 0,
    'i-frames ghost the peel, pratfall and all');
}

// The fatal one is a death, not a gag: die() has taken the run already.
{
  const { run } = runIntoPeel((r) => {
    r.battery = 1;
    r.powerups.shieldStack = 0;
    r.relay.current = 'lorenzo';   // no assembly grace to catch the fatal hit
    r.player.setHero('lorenzo');
  });
  assert(run.battery <= 0, 'the last cell goes to the peel like any other hazard');
  assert(run.player.slipT === 0, 'a hero who died does not also pratfall over the death screen');
}

// The slip clock runs down on its own, through the ordinary player update.
{
  const p = new Player('lorenzo');
  p.slipT = SLIP_T;
  p.stumbleT = SLIP_T;
  p.update(SLIP_T + 0.01, { held: () => false }, { speed: 160 });
  assert(p.slipT <= 0, 'the slip expires on its own clock');
  assert(p.jumpPressed(null) === true, 'and hands the jump back');
  // A relay swap mid-slip hands the next hero a clean start rather than
  // someone else's tumble.
  p.slipT = SLIP_T;
  p.setHero('mochi');
  assert(p.slipT === 0, 'a hero arriving through a portal does not inherit a slip');
}

console.log(failed ? '\nBANANA PEEL: FAIL' : '\nBANANA PEEL: PASS');
process.exit(failed ? 1 : 0);
