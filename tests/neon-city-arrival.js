// NEON 1 OPENS ON AN EMPTY SKY AND THE CITY ARRIVES. Every later stage opens
// finished.
//
// The schedule is three smoothstepped fades over stage progress (see
// NEON_CITY_ARRIVALS). What this suite pins is not the numbers — those are an
// art decision and will move — but the four claims the cabinet is built on:
//
//   - stage 1 starts with NO city at all, so the two-layer opening is real;
//   - it finishes with the whole city, well before the tape;
//   - the layers arrive in depth order, back to front, and never go backwards;
//   - stages 2 and 3 are full from their first frame.
//
// The fourth is the one most likely to be broken by accident: a change that
// reads `progress` without checking `stageIndex` turns every stage into a
// loading screen.
import { installDom } from './dom-stub.js';
installDom();

const { neonCityReveal } = await import('../src/engine/stylePacks/index.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const KEYS = ['farMass', 'midWire', 'nearWire'];
const at = (p) => neonCityReveal(1, p);

assert(KEYS.every((k) => at(0)[k] === 0),
  'neon 1 opens on an empty sky — no city layer is up at the start line');

assert(KEYS.every((k) => at(0.1)[k] === 0),
  'and it stays empty for a while: nothing has arrived a tenth of the way in');

assert(KEYS.every((k) => at(0.85)[k] === 1),
  'the whole city is up by 85% — it finishes before the tape, not at it');

// Depth order. A near row that arrives before the mass behind it reads as the
// city being built in front of the player rather than receding from them.
for (const p of [0.2, 0.3, 0.45, 0.55, 0.65, 0.75]) {
  const r = at(p);
  assert(r.farMass >= r.midWire && r.midWire >= r.nearWire,
    `at ${p} the stack arrives back to front (${KEYS.map((k) => r[k].toFixed(2)).join(' >= ')})`);
}

// Monotonic, and no step big enough to read as a cut. The fades run over more
// than a tenth of the level each, so a 1% sample can never jump far.
let previous = at(0);
let biggestStep = 0;
for (let i = 1; i <= 100; i++) {
  const r = at(i / 100);
  for (const k of KEYS) {
    if (r[k] < previous[k] - 1e-9) {
      assert(false, `${k} went backwards at ${i / 100}`);
    }
    biggestStep = Math.max(biggestStep, r[k] - previous[k]);
  }
  previous = r;
}
assert(biggestStep < 0.2,
  `no layer snaps on: the largest step over a 1% sample is ${biggestStep.toFixed(3)}`);

for (const stageIndex of [2, 3]) {
  assert([0, 0.01, 0.5, 1].every((p) => KEYS.every((k) => neonCityReveal(stageIndex, p)[k] === 1)),
    `neon ${stageIndex} opens finished — the arrival belongs to stage 1 only`);
}

// A picture that is not a run — the gallery's production tiles, a poster, an
// attract shot — hands no progress at all. It must get the whole city rather
// than an empty sky.
assert(KEYS.every((k) => neonCityReveal(1, undefined)[k] === 1),
  'with no progress to read, the city is drawn whole');

// THE MOON WAXES ACROSS THE ACT, one third of a lunation per stage. Same shape
// of claim as the city: the numbers are art, the direction is not.
const { neonMoonPhase, neonMoonEclipse } = await import('../src/engine/stylePacks/index.js');

assert(neonMoonPhase(1, 0) === 0, 'the act opens on a new moon');
assert(neonMoonPhase(2, 1) === 1, 'and it is full by the end of neon 2');
assert(neonMoonPhase(3, 0) === 1 && neonMoonPhase(3, 1) === 1,
  'neon 3 is full throughout — the last stage is the eclipse, not the lunation');

let lastPhase = -1;
for (const stageIndex of [1, 2, 3]) {
  for (let i = 0; i <= 20; i++) {
    const phase = neonMoonPhase(stageIndex, i / 20);
    if (phase < lastPhase - 1e-9) {
      assert(false, `the moon waned at stage ${stageIndex} progress ${i / 20}`);
    }
    lastPhase = phase;
  }
}
assert(lastPhase === 1, 'the moon never goes backwards across the three stages');

// A stage hands over to the next one where it left off. A visible jump at a
// stage boundary would read as a different moon rather than a later night.
for (const stageIndex of [1, 2]) {
  assert(Math.abs(neonMoonPhase(stageIndex, 1) - neonMoonPhase(stageIndex + 1, 0)) < 1e-9,
    `neon ${stageIndex + 1} opens on the phase neon ${stageIndex} ended at`);
}

assert(neonMoonPhase(2, undefined) === neonMoonPhase(2, 0),
  'with no progress to read, a stage shows the phase it opens on');

// THE ECLIPSE belongs to neon 3 alone, and it is PARTIAL — the shadow takes a
// bite and stops. What is pinned here is the ownership and the direction; how
// deep the bite goes is art and lives in NEON_ECLIPSE_DEEPEST.
for (const stageIndex of [1, 2]) {
  assert([0, 0.5, 1].every((p) => neonMoonEclipse(stageIndex, p) === 0),
    `neon ${stageIndex} never eclipses`);
}
assert(neonMoonEclipse(3, 0) === 0, 'neon 3 opens with the moon clear of the shadow');
assert(neonMoonEclipse(3, 1) === 1, 'and reaches its deepest at the tape');
let lastEclipse = -1;
for (let i = 0; i <= 20; i++) {
  const e = neonMoonEclipse(3, i / 20);
  if (e < lastEclipse - 1e-9) assert(false, `the shadow retreated at ${i / 20}`);
  lastEclipse = e;
}
assert(lastEclipse === 1, 'the shadow only ever advances');
assert(neonMoonEclipse(3, undefined) === 0,
  'a picture with no progress shows no eclipse');

// THE TRAINS FLY IN AND LAND, and there is no schedule left to pin. An
// overtake used to be a window in stage progress — it had to dodge the train
// sections by hand — and the last train had its own separate arrival. Both are
// gone: every neon train is an island route whose arrival is drawn from the
// CAMERA's distance to its berth (trainArrival in src/game/terrain.js), so it
// cannot clash with anything and has nothing to keep in sync.
//
// What is worth pinning instead is the one claim that makes it safe: the
// landing finishes before the player can possibly reach the roof. If it ever
// does not, a hero lands on an island with the hull still in the air over it.
const { STAGE_LAYOUTS } = await import('../src/data/stage-layouts.js');

const NEON_STAGES = ['neon-1', 'neon-2'];
for (const id of NEON_STAGES) {
  const islands = STAGE_LAYOUTS[id]?.routes?.islands || [];
  assert(islands.length > 0, `${id} has trains authored`);
  assert(islands.every((r) => r.rise === 33),
    `${id}'s trains all sit on the one rail height`);
  assert(islands.every((r) => r.boardArc && r.bonusHigh),
    `${id}'s trains all invite a board and pay off the far end`);
  // SPREAD, not a row (Peter, 22 Sep: "lets space them out more"). Anything
  // closer than a tenth of the stage is the block of three this replaced.
  const ats = islands.map((r) => r.at).sort((a, b) => a - b);
  for (let i = 1; i < ats.length; i++) {
    assert(ats[i] - ats[i - 1] >= 0.09,
      `${id}: trains at ${ats[i - 1]} and ${ats[i]} are a stage apart, not a row`);
  }
  // Each one is its own road, so nothing depends on the stack exemption that
  // the old adjacent group needed.
  const stacks = new Set(islands.map((r) => r.stack));
  assert(stacks.size === islands.length, `${id}'s trains are each their own road`);
}

// The last train stands AT the tape, which is the ending the cabinet is for:
// the stage is about catching trains, so it ends on one caught.
for (const id of NEON_STAGES) {
  const ats = (STAGE_LAYOUTS[id]?.routes?.islands || []).map((r) => r.at);
  assert(Math.max(...ats) >= 0.9, `${id} ends on a train, not beside one`);
}

// THE ROOF IS A CEILING FROM UNDERNEATH. A hero who does not board runs into
// the car, and the jump he presses in there has to do almost nothing — but
// "almost nothing" is derived from the geometry, not typed in, so this pins
// the two ends of it: he gets a real hop, and he cannot reach the roof with it.
// If he could, the roof would not be worth jumping onto from outside, which is
// the whole train section.
const { neonTrainHeadroom } = await import('../src/game/terrain.js');
const { Player, PLAYER_H } = await import('../src/game/player.js');

const HELD = { held: (k) => k === 'jump', pressed: () => false };
function apexWith(ceiling) {
  const pl = new Player('b33p');
  pl.grounded = true;
  pl.jumpPressed({ sfx() {} });
  let top = 0;
  for (let i = 0; i < 400; i++) {
    pl.update(1 / 120, HELD, { speed: 208, ice: false, gravityScale: 1, ceiling });
    top = Math.max(top, pl.y);
    if (i > 5 && pl.grounded) break;
  }
  return top;
}

const { HERO_DRAW_H } = await import('../src/game/draw.js');
const head = neonTrainHeadroom({ rise: 33 });
assert(head > 2, `there is room for a hop inside a car (${head}px)`);
// Measured against the DRAWN hero, not the hitbox — the hitbox version let his
// head and cap come out through the roof while his legs were at the windows.
assert(head + HERO_DRAW_H < 33, 'and the head you can SEE stops short of the roof');
const free = apexWith(null);
const capped = apexWith(head);
assert(free > 40, `a jump outside is a jump (${free.toFixed(1)}px)`);
assert(Math.abs(capped - head) < 0.01, `inside, it stops dead at the ceiling (${capped.toFixed(1)}px)`);
assert(capped < free * 0.25, 'which is a thump, not a jump');
// EVERY HERO, by what he really reaches (Peter, 23 Sep: Grumpos's head came out
// through the roof). Standing on the car floor at the top of his hop, the tallest
// point of his drawing must stay under the roofline.
const { HERO_REACH, heroReach } = await import('../src/game/draw.js');
const { HEROES } = await import('../src/data/heroes.js');
const { TRAIN_FLOOR_LIFT } = await import('../src/game/terrain.js');
for (const h of HEROES) {
  const top = TRAIN_FLOOR_LIFT + neonTrainHeadroom({ rise: 33 }, h.id) + heroReach(h.id);
  assert(h.id in HERO_REACH, `${h.id} has a measured reach`);
  assert(top <= 33, `${h.id}'s head stays under the roof at the top of his hop (${top}px of 33)`);
}
// A road with no roof must not cap anything — this is neon's rule, not a rule.
assert(neonTrainHeadroom({ rise: 0 }) === 0, 'a road with no rise leaves no headroom to speak of');

console.log(failed ? 'NEON CITY ARRIVAL: FAILED' : 'NEON CITY ARRIVAL: PASSED');
if (failed) process.exit(1);
