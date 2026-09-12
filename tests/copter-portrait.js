// THE VILLAIN'S APPROACH IS VERTICAL ON A PORTRAIT PHONE.
//
// The chase's drama is a gap closing. On a wide frame that gap is horizontal:
// he rides far out in front and the question is whether you reach him before
// the window shuts. A portrait picture is 128 world units wide against the
// desktop's 300, so the same roam parks him a few units ahead of the hero for
// most of the pass — always near, always reachable, and so neither exciting
// nor readable.
//
// Portrait therefore spends the axis it has. He rides ABOVE barrel reach and
// the pressure dial walks him down into it, so the approach is something you
// watch and time. Two claims, and they pull against each other on purpose:
// he must start OUT of reach, and he must end fully IN it.
import assert from 'node:assert/strict';
import { __copterTesting } from '../src/game/run.js';

// The reach comes from the run's own derivation rather than a second copy of
// the arithmetic here: a test that recomputes the number it is checking can
// only ever agree with itself.
const {
  COPTER_ROAM_LOW, COPTER_ROAM_HIGH, COPTER_PORTRAIT_ROAM_HIGH, COPTER_PRESSURE_START,
  BARREL_REACH_ALT: REACH,
} = __copterTesting;

// The band the pressure dial sweeps, for one orientation. `ceiling` is the sky
// the framing can hold; portrait has far more of it than a landscape phone,
// which is the room this change spends.
const bandFor = (portrait, ceiling = Infinity) => {
  const top = Math.min(portrait ? COPTER_PORTRAIT_ROAM_HIGH : COPTER_ROAM_HIGH, ceiling - 4);
  const low = Math.min(COPTER_ROAM_LOW, top);
  return { top, low, at: (pressure) => top - (top - low) * pressure };
};

const landscape = bandFor(false);
const portrait = bandFor(true);

// ---- landscape is untouched -------------------------------------------------

assert.equal(landscape.top, COPTER_ROAM_HIGH, 'landscape keeps its authored band top');
assert.ok(landscape.top < REACH,
  `landscape keeps the whole band inside barrel reach (top ${landscape.top.toFixed(1)} < reach ${REACH.toFixed(1)})`);

// ---- portrait: out of reach at the top, in reach at the bottom ---------------

assert.ok(portrait.top > REACH,
  `portrait rides above barrel reach (top ${portrait.top.toFixed(1)} > reach ${REACH.toFixed(1)})`);
assert.equal(portrait.low, landscape.low,
  'the bottom of the band does not move: a kick that connects today connects then');
assert.ok(portrait.at(1) < REACH,
  `pressed all the way down he is fully in reach (${portrait.at(1).toFixed(1)} < ${REACH.toFixed(1)})`);

// The opening state is the whole point: he must arrive out of reach, so the
// first thing the player sees is a villain they cannot yet touch.
assert.ok(portrait.at(COPTER_PRESSURE_START) > REACH,
  `at the starting pressure he is still out of reach (${portrait.at(COPTER_PRESSURE_START).toFixed(1)} > ${REACH.toFixed(1)})`);

// And the approach has to be worth watching: a band barely taller than the
// villain reads as a shuffle, not as a descent.
const portraitTravel = portrait.top - portrait.low;
assert.ok(portraitTravel > (landscape.top - landscape.low) * 2.5,
  `the portrait descent is a real travel, not a nudge (${portraitTravel.toFixed(1)} units against landscape's ${(landscape.top - landscape.low).toFixed(1)})`);

// ---- the descent is reachable by playing well -------------------------------
//
// The dial is the scoreboard (nudgeCopter): clean beats and coin streaks press
// him down. If the pressure needed to bring him into reach were past 1 he
// would be permanently untouchable and the mission unwinnable.
const pressureIntoReach = (portrait.top - REACH) / (portrait.top - portrait.low);
assert.ok(pressureIntoReach > 0 && pressureIntoReach < 0.75,
  `a reachable share of the dial brings him into range (needs ${(pressureIntoReach * 100).toFixed(0)}% pressure)`);

// ---- a low ceiling still only ever helps ------------------------------------
//
// The ceiling clamp pulls the band DOWN and never up, so a framing with less
// sky than portrait cannot end up with him higher than the authored top.
const squashed = bandFor(true, REACH - 2);
assert.ok(squashed.top <= REACH - 2, 'a low ceiling pulls the portrait band back down');
assert.ok(squashed.low <= squashed.top, 'a squashed band never inverts');

console.log('COPTER PORTRAIT: PASSED');
