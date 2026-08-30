// THE FINISH-LINE DOG — the guard on the plumber cabinet's tape — and the
// BEWARE OF DOG sign that announces it.
//
// Every rule this suite pins is a rule that lives as one line somewhere, and
// every one of them is the kind of line a later pass tidies into consistency
// with its neighbours. The three that matter most:
//
//   THE DOG IS UNKILLABLE. `breakable: false` is the whole of it, and it is
//     load-bearing across nine separate kill routes in RunState.collide and
//     the projectile loop. Flip it to true "for consistency with the other
//     animals" and the one hazard in the game whose only answer is the jump
//     quietly becomes another thing Lorenzo shoots.
//   THE SIGN IS THE LAST OBSTACLE. Not by inspection at spawn time — that was
//     the first version and the spawner dealt crates over it — but by the lane
//     WALL: laneWallX() stops the lane short of the sign on a guarded stage.
//   PLUMBER-1 ALWAYS HAS ONE. It is where the encounter is taught; every other
//     stage rolls for it.
import { installDom } from './dom-stub.js';
installDom();

const { OBSTACLES, DEBRIS, makeObstacle } = await import('../src/game/entities.js');
const { hasProp, propDetailScale, propFrames, propVisualScale, propSprite } = await import('../src/sprites/props.js');
const { CABINETS } = await import('../src/data/cabinets.js');
const { worstJumpApex } = await import('../src/game/spawner.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// --- the dog's registry entry ----------------------------------------------
const dog = OBSTACLES.finishDog;
assert(!!dog, 'finishDog is a registered obstacle');
assert(dog.ground === true, 'the dog runs on the ground rather than flying');
assert(dog.action === 'jump', 'the fairness sim budgets the dog as a jump');
// The escape hatches it deliberately does not have. Explicit `false`, not
// merely absent: several kill sites test `!== false` and an omitted flag reads
// as breakable to them.
assert(dog.breakable === false,
  'the dog is unkillable — no weapon, kick, stomp, roll or shockwave removes it');
assert(!dog.punt, 'the dog cannot be punted: a boot going in low meets a dog that has decided about you');
assert(!DEBRIS.finishDog, 'nothing that never breaks needs a debris entry');
assert(dog.vx < 0, 'the dog closes on the hero rather than waiting for him');

// It is the biggest animal in the game and the widest thing on the road, and
// still one comfortable jump. (Not the TALLEST ground hazard: `pipe` stands
// 18 to the dog's 15, and should — a pipe is a wall and this is an animal.)
const grounded = Object.entries(OBSTACLES)
  .filter(([, d]) => d.ground && !d.isGap && !d.isBoost && !d.isLoop && !d.isSpring);
const widest = Math.max(...grounded.map(([, d]) => d.w));
assert(dog.w === widest, 'the finish dog is the widest thing on the road — it is the set piece');
for (const pack of ['dogSnarler', 'dogBruiser', 'dogFeral', 'catFury']) {
  assert(dog.w > OBSTACLES[pack].w && dog.h > OBSTACLES[pack].h,
    `the finish dog is bigger than the lane's ${pack}`);
}
assert(dog.h < worstJumpApex() * 0.75,
  'even the heaviest hero clears the dog with room, so the one required jump is never a coin flip');

// --- the dog's art ---------------------------------------------------------
// It wears the pack rigs through ALIASES, so its raster detail can be raised
// without paying for it on every dog in every lane.
assert(Array.isArray(dog.skins) && dog.skins.length === 3, 'the dog wears one of three rigs');
for (const skin of dog.skins) {
  assert(hasProp(skin), `${skin} registers a painter`);
  assert(propDetailScale(skin) === 3, `${skin} rasterizes at triple detail — it is the showcase prop`);
  assert(propFrames(skin) === 8, `${skin} gallops over the pack dogs' eight frames`);
  assert(propVisualScale(skin) > 1, `${skin} draws a little over its box, as the pack dogs do`);
}
// The aliases must be the SAME art as the pack dogs, not a fork of it.
const { ANIMAL_FRAMES, ANIMAL_FPS } = await import('../src/sprites/animals.js');
assert(Object.keys(ANIMAL_FRAMES).every((n) => propFrames(n) === ANIMAL_FRAMES[n]),
  'the pack animals keep their own frame counts alongside the finish aliases');
assert(propDetailScale('dogSnarler') === 2,
  'the PACK dogs stay at double detail — the exception is the finish dog alone');

// --- the sign --------------------------------------------------------------
const sign = OBSTACLES.dogSign;
assert(!!sign, 'dogSign is a registered obstacle');
assert(sign.sign === true, 'the sign takes the shared sign contract');
assert(sign.breakable === true, 'the sign breaks — a warning you cannot run through is a trap');
assert(sign.action === 'none',
  'the sign is not something to be avoided: the fairness sim must not budget a jump for it');
assert(sign.ground === true, 'the sign stands on the road');
assert(!!DEBRIS.dogSign, 'the sign scatters when it breaks, like its two siblings');
assert(hasProp('dogSign'), 'dogSign registers a painter');
assert(propDetailScale('dogSign') === 3,
  'the sign rasterizes at triple detail — its fangs and nostril close up at double');
assert(propVisualScale('dogSign') > 1,
  'the sign draws over its box: it carries a drawing rather than a word');
// Same box as the signs it stands beside, so the three read as one object.
assert(sign.w === OBSTACLES.jumpSign.w && sign.h === OBSTACLES.jumpSign.h,
  'all three signs share a box — they are one thing in the world vocabulary');
// It must actually rasterize. A painter that throws leaves a magenta box in
// the lane, and the sign is the one entity meant to be READ.
assert(!!propSprite('dogSign', sign.w, sign.h, 0), 'the sign painter produces a raster');

// --- the dog is NOT in the pattern bag -------------------------------------
// It is scripted (RunState.spawnFinishDog). Dealt from a cabinet's bag it
// would turn up mid-stage, which is the one place it must never be.
for (const cab of CABINETS) {
  const cells = (cab.patterns || []).flatMap((p) => p.cells || []);
  assert(!cells.some((c) => c.t === 'finishDog'),
    `${cab.id} never deals the finish dog from its pattern bag`);
  assert(!cells.some((c) => c.t === 'dogSign'),
    `${cab.id} never deals the dog sign from its pattern bag`);
}
// And plumber's own bag no longer carries the mid-stage dogs it used to: on
// that cabinet a dog appears exactly once, at the tape.
const plumber = CABINETS.find((c) => c.id === 'plumber');
const plumberCells = (plumber.patterns || []).flatMap((p) => p.cells || []);
assert(!plumberCells.some((c) => String(c.t).startsWith('dog') || c.t === 'catFury'),
  'plumber deals no animals mid-stage — its dog is the one at the finish');

// --- an instance -----------------------------------------------------------
const made = makeObstacle('finishDog', 500);
assert(made.def === dog, 'a made dog carries the registry def');
assert(dog.skins.includes(made.skin),
  'a made dog wears one of the three rigs, picked off its spawn position');
assert(makeObstacle('finishDog', 500).skin === made.skin,
  'the rig is stable for a given position — identical on a replay');

console.log(failed ? 'FINISH DOG: FAILED' : 'FINISH DOG: PASSED');
process.exit(failed ? 1 : 0);
