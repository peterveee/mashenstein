// THE FIVE STANDING HAZARDS — pop-up spikes, campfire, burning barrel, brazier
// and floor saw, ported out of the gallery's hazard bake-off.
//
// What this suite pins is the contract they were chosen under, because every
// clause of it is one word in a registry line and every one of them is the kind
// of word a later pass makes "consistent" with the props beside it:
//
//   not puntable   `punt` is opt-in, so the fact lives in an ABSENCE. A boot
//                  going in low meets a spike plate, a fire or a spinning
//                  blade, and none of those sail over the hero's head.
//   three of them not breakable, two of them breakable. The two that are, are
//                  breakable so they can be SHOT — and being breakable without
//                  being puntable is the whole of "shot, not kicked".
//   the box is the solid part. Flame and teeth are art bought upward through
//                  PROP_TALL and cannot hit you.
//
// Plus the loop: these are rasterized into a fixed ring of frames, so a wobble
// that is not an integer harmonic of the ring lands the last frame somewhere
// the first is not. Frame 0 and frame N are compared as pixels below.
import { installDom } from './dom-stub.js';
installDom();

const { OBSTACLES, DEBRIS, makeObstacle } = await import('../src/game/entities.js');
const {
  hasProp, propSprite, propFrames, propTall, propDetailScale, propHazardRim,
} = await import('../src/sprites/props.js');
const { CABINETS } = await import('../src/data/cabinets.js');
const { worstJumpApex } = await import('../src/game/spawner.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const HAZARDS = ['popSpikes', 'campfire', 'fireBarrel', 'brazier', 'floorSaw'];
// The two that a shot opens. Everything else in the list is inert.
const SHOOTABLE = new Set(['fireBarrel', 'brazier']);

for (const id of HAZARDS) {
  const def = OBSTACLES[id];
  assert(!!def, `${id} is a registered obstacle`);
  assert(def.ground === true, `${id} stands on the ground`);
  assert(def.action === 'jump', `${id} is cleared by jumping`);
  // The absence that matters. `punt` on a def is what lets a slide boot a prop
  // into the air; none of these has one, and none of them should acquire one.
  assert(!def.punt, `${id} is NOT puntable — a boot into fire or teeth does not send it flying`);
  assert(!def.slip && !def.roll && !def.falls && !def.shoots,
    `${id} is stationary: it does not roll, fall, shoot or slip`);
  assert(!!def.breakable === SHOOTABLE.has(id),
    `${id} is ${SHOOTABLE.has(id) ? 'breakable, so a shot opens it' : 'not breakable by anything'}`);
  // Art over an unchanged box, and the box is the part that can hurt you.
  assert(propTall(id) > 1, `${id} buys its presence upward, over an unchanged hitbox`);
  assert(def.h <= worstJumpApex(),
    `${id}'s ${def.h}px box is under the worst hero's ${worstJumpApex().toFixed(1)}px apex`);
  assert(hasProp(id), `${id} has a vector painter`);
  assert(propDetailScale(id) === 2, `${id} is authored at double internal detail`);
  assert(propHazardRim(id) === false, `${id} outlines itself rather than taking the shared rim`);
  const art = propSprite(id, def.w, def.h);
  assert(art && art.width > 0 && art.height > 0, `${id} rasterizes to a real canvas`);
}

// Debris only for the two that can be broken. A DEBRIS entry on an unbreakable
// prop is dead data that reads as an intention.
for (const id of HAZARDS) {
  assert(!!DEBRIS[id] === SHOOTABLE.has(id),
    `${id} ${SHOOTABLE.has(id) ? 'has' : 'has no'} debris, matching whether it can break`);
}

// --- the loop closes -------------------------------------------------------
// Frame 0 and frame N are the same picture, because N is the ring length. If a
// painter's wobble is not an integer harmonic of the phase, these differ and
// the prop visibly ticks once a cycle in the lane.
function framePixels(id, w, h, frame) {
  const c = propSprite(id, w, h, frame);
  const ctx = c.getContext('2d');
  return ctx.getImageData(0, 0, c.width, c.height).data;
}
for (const id of HAZARDS) {
  const def = OBSTACLES[id];
  const n = propFrames(id);
  assert(n > 1, `${id} animates (${n} frames)`);
  const a = framePixels(id, def.w, def.h, 0);
  const b = framePixels(id, def.w, def.h, n);
  let diff = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
  assert(diff === 0, `${id}'s ring closes: frame 0 and frame ${n} are identical`);
}

// --- the lanes that carry them --------------------------------------------
const carries = (cabId, type) => {
  const cab = CABINETS.find((c) => c.id === cabId);
  return cab.patterns.some((p) => p.cells.some((c) => c.t === type));
};
assert(carries('plumber', 'popSpikes') && carries('plumber', 'floorSaw'),
  'Plumber gets the two floor traps — its ground game was two things that stand UP');
assert(carries('crypt', 'brazier'), 'Crypt gets the brazier: the dark cabinet gets the lit hazard');
assert(carries('speed', 'fireBarrel'), 'Speed gets the drum fire, beside its puntable cones');
assert(carries('office', 'fireBarrel'), 'Corporate gets the bin fire');
// Each one is introduced somewhere a first run will actually meet it.
for (const id of HAZARDS) {
  const early = CABINETS.some((cab) => cab.patterns.some((p) => p.tier <= 1 && p.cells.some((c) => c.t === id)));
  assert(early, `${id} appears at tier 1 or below somewhere, so a first run meets it`);
}

// --- the green cactus ------------------------------------------------------
// A SKIN, not a variant hazard: same box, same debris, same jump. What is
// pinned here is that it stays a skin and stays occasional.
const cactus = OBSTACLES.cactus;
assert(Array.isArray(cactus.skins) && cactus.skins.includes('cactusGreen'),
  'the cactus wears an occasional green skin');
assert(!OBSTACLES.cactusGreen, 'the green cactus is a skin, not a second obstacle type');
const greens = cactus.skins.filter((s) => s === 'cactusGreen').length;
assert(greens * 3 <= cactus.skins.length,
  `green is the exception, not the rule (${greens} of ${cactus.skins.length})`);
assert(hasProp('cactusGreen'), 'the green cactus has a painter');
// It is the one prop in the game whose body is a near match for a cabinet's
// turf, and the shared two-pass rim is what separates it. Do not self-outline.
assert(propHazardRim('cactusGreen') === true,
  'the green cactus takes the shared hazard rim — its body is a near match for plumber turf');
const skinned = makeObstacle('cactus', 400);
assert(cactus.skins.includes(skinned.skin), 'a spawned cactus wears one of its declared skins');

console.log(failed ? 'STANDING HAZARDS: FAILED' : 'STANDING HAZARDS: PASSED');
process.exit(failed ? 1 : 0);
