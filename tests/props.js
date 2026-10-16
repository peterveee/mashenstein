// Prop raster cache: static props get one canvas regardless of frame index,
// animated props (none currently — PROP_FRAMES) get one per frame, and the
// ground hazard is wired to the cactus art.
import { installDom } from './dom-stub.js';
installDom();

const {
  propFrames, propFps, propDetailScale, propVisualScale, propTall, propSprite, propTinted,
  propRimPair, propHazardRim, PROP_FRAMES, PROP_PAINTERS,
} = await import('../src/sprites/props.js');
const { OBSTACLES, PICKUPS } = await import('../src/game/entities.js');
const { CABINETS } = await import('../src/data/cabinets.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// The hazard formerly known as shrub (and briefly as fire) is a cactus now.
assert(OBSTACLES.cactus && OBSTACLES.cactus.sprite === 'cactus', 'the ground hazard draws as a cactus');
assert(OBSTACLES.cactusBig && OBSTACLES.cactusBig.sprite === 'cactusBig', 'the big variant too');
assert(OBSTACLES.snowman && OBSTACLES.snowman.sprite === 'snowman', 'ice levels have their own snowman hazard');
assert(OBSTACLES.snowmanBig && OBSTACLES.snowmanBig.sprite === 'snowmanBig', 'the big snowman keeps the cactus variant split');
assert(OBSTACLES.bearTrap && OBSTACLES.bearTrap.ground && OBSTACLES.bearTrap.bedded
  && OBSTACLES.bearTrap.action === 'jump', 'Frost traps are buried ground hazards');
assert(!OBSTACLES.shrub && !OBSTACLES.flames, 'no shrub or flames obstacle survives the renames');
assert(typeof PROP_PAINTERS.cactus === 'function', 'cactus has a vector painter');
assert(typeof PROP_PAINTERS.snowman === 'function', 'snowman has a vector painter');
assert(typeof PROP_PAINTERS.bearTrap === 'function', 'bear trap has a vector painter');
assert(PICKUPS.resident.sprite === 'resident' && typeof PROP_PAINTERS.resident === 'function',
  'residents use distinct friendly art instead of the zombie hazard sprite');
assert(PICKUPS.appliance.w === 22 && PICKUPS.appliance.h === 18 && PICKUPS.appliance.bob,
  'flying toaster has a detailed mid-size body plus launch headroom and bobs');
assert(propFrames('appliance') === 96, 'the flying toaster combines a four-second toast pop with its quick flap');
assert(propFps('appliance') === 24, 'the flying toaster cycles smoothly at 24fps');
assert(propFrames('qcrate') === 36 && propFps('qcrate') === 12,
  'the !-box pendulum and occasional glint use a slow three-second loop');
assert(propFrames('pipe') === 8 && propFps('pipe') === 4,
  'hydraulic bollards cycle through eight slow piston poses');
assert(OBSTACLES.pipe && OBSTACLES.pipe.ground && OBSTACLES.pipe.w === 14 && OBSTACLES.pipe.h === 18 && OBSTACLES.pipe.artH === 24
  && OBSTACLES.pipe.tall && !OBSTACLES.pipe.breakable && OBSTACLES.pipe.action === 'jump',
  'hydraulic bollards keep the fixed unbreakable jump-obstacle contract');
assert(propDetailScale('qcrate') === 2,
  'the !-box authors its outline, punctuation and glint at double detail');
assert(PICKUPS.cord.w === 14 && PICKUPS.cord.h === 9 && PICKUPS.cord.sprite === 'cord',
  'cord pieces use their own larger pickup art instead of the carried fuse');
assert(typeof PROP_PAINTERS.cord === 'function', 'cord piece has a refined vector painter');

assert(propFrames('cactus') === 6, 'the cactus sways over six frames');
assert(propFrames('snowman') === 6, 'the snowman shivers over six frames');
assert(propDetailScale('snowman') === 2 && propDetailScale('snowmanBig') === 2,
  'both snowmen rasterize at double internal detail');
assert(propDetailScale('dustdevil') === 2,
  'Dust Devil keeps its small cartoon eyes at gameplay sizes');
const refinedProps = [
  'cactus', 'cactusBig', 'crate', 'qcrate', 'pipe', 'switch', 'zombieWalk', 'icicle', 'bearTrap',
  'buzzbird', 'drone', 'shooterDrone', 'printer', 'chair', 'battery',
  'capShield', 'capMagnet', 'capStar', 'capAirJump', 'capSpeed', 'capLowGrav', 'capUnpeel', 'capRewind',
];
assert(refinedProps.every((name) => propDetailScale(name) === 2),
  'small reviewed props rasterize at double internal detail');
const pickupSprites = [...new Set(Object.values(PICKUPS).map((def) => def.sprite))];
assert(pickupSprites.every((name) => propDetailScale(name) === 2),
  'every world pickup rasterizes at double internal detail');
assert(propVisualScale('snowman') === 1.15 && propVisualScale('snowmanBig') === 1.15,
  'both snowmen draw larger without changing their hitboxes');
assert(propTall('bearTrap') === 1.35,
  'bear traps gain a readable jaw silhouette without changing their ground box');
const selfOutlinedHazards = [
  'cactus', 'cactusBig', 'snowman', 'snowmanBig', 'crate', 'pipe', 'zombieWalk', 'icicle', 'bearTrap',
  'buzzbird', 'drone', 'shooterDrone', 'printer', 'chair',
];
// The barrel (sprites/crateBarrel.js) and the tombstone (sprites/redrawProps.js) carry
// their own bold ink since 15 Oct 2026; the zombie still takes the shared halo.
assert(selfOutlinedHazards.every((name) => !propHazardRim(name)) && !propHazardRim('barrel')
  && !propHazardRim('tombstone') && propHazardRim('zombie'),
  'refined hazards skip the blurry shared halo while other hazards retain it');
const frost = CABINETS.find((cabinet) => cabinet.id === 'frost');
const frostTypes = frost.patterns.flatMap((pattern) => pattern.cells.map((cell) => cell.t));
assert(frostTypes.includes('snowman') && frostTypes.includes('snowmanBig'),
  'Frost Fortress uses both snowman hazard sizes');
assert(frostTypes.includes('bearTrap') && !frostTypes.includes('icicle'),
  'Frost Fortress uses buried bear traps instead of falling icicles');
assert(!frostTypes.includes('cactus') && !frostTypes.includes('cactusBig'),
  'Frost Fortress replaces every inherited cactus');
const c0 = propSprite('crate', 12, 11, 0);
assert(c0 && propSprite('crate', 12, 11, 3) === c0, 'a static prop ignores the frame index');
assert(propSprite('crate', 12, 11) === c0, 'frames are cached, not repainted');

// Frame-aware caching (kept for future animated props): every layer of an
// animated prop — raster, tint, rim — must key on the frame, and painters must
// actually vary by frame. Runs against whatever PROP_FRAMES declares.
function trace(name, frame) {
  const log = [];
  const rec = new Proxy({}, {
    // A gradient comes back as a stub so painters that build one (the crypt's gouache
    // `mass`, 15 Oct 2026) can add their stops; the stops are traced like any call.
    get: (_, k) => (...args) => {
      log.push(`${String(k)}(${args.map((a) => (typeof a === 'number' ? a.toFixed(3) : a)).join(',')})`);
      if (String(k).endsWith('Gradient')) return { addColorStop: (...s) => log.push(`stop(${s.join(',')})`) };
    },
    set: () => true,
  });
  PROP_PAINTERS[name](rec, 13, 12, frame);
  return log.join('|');
}
for (const name of Object.keys(PROP_FRAMES)) {
  const n = PROP_FRAMES[name];
  assert(propSprite(name, 13, 12, 0) !== propSprite(name, 13, 12, 1), `${name}: each frame rasterizes to its own canvas`);
  assert(propSprite(name, 13, 12, n) === propSprite(name, 13, 12, 0), `${name}: frame indices wrap`);
  assert(propTinted(name, 13, 12, '#fff', 0) !== propTinted(name, 13, 12, '#fff', 1), `${name}: tinted silhouettes animate`);
  assert(propRimPair(name, 13, 12, '#fff', 'x', 0) !== propRimPair(name, 13, 12, '#fff', 'x', 1), `${name}: hazard rims animate`);
  const seen = new Set();
  for (let f = 0; f < n; f++) seen.add(trace(name, f));
  // Props whose frame count is deliberately coarser than their drawing count.
  // qcrate's stem swings on a slow 36-frame arc, so adjacent frames round to
  // the same trace. The switch's four frames are TIMING slots rather than
  // drawings: the painter has exactly two poses — armed and lit — because the
  // struck block's hop runs as a transform in drawWorldEntity
  // (switchBonkLift), not as art inside the raster. Both poses must still be
  // reached, which is what a floor of 2 pins.
  // The 15 Oct 2026 bake-off picks (sprites/<cabinet>Props.js) were drawn on rings with
  // HOLDS in them — the sawhorse's lamp flashes then stays lit, a glint runs along the
  // crampons' and caltrops' points between rests, the parcel's ribbon and the roses'
  // falling petal return to a pose mid-cycle — so their floor is the poses they draw.
  // The swiping cats (sprites/neonCats.js, 16 Oct 2026) HOLD at full reach mid-swipe,
  // so 34 of their 36 frames are distinct drawings.
  const MIN_POSES = { qcrate: Math.ceil(n / 2), switch: 2,
    sawhorse: 4, parcels: 5, crampons: 6, caltrops: 4, graveRoses: 7, saucer: 7,
    catManeki: 34, catPythagoras: 34, catNeonBright: 34, catMechaNeon: 34, catNekoGhost: 34 };
  const distinct = MIN_POSES[name] ?? n;
  assert(seen.size >= distinct, `${name}: draws enough distinct poses across its ${n} frames`);
}

const qDot = `ellipse(${(13 * 0.5).toFixed(3)},${(12 * 0.81).toFixed(3)},${(13 * 0.078).toFixed(3)},${(12 * 0.065).toFixed(3)}`;
for (const f of [0, 9, 18, 27]) {
  const q = trace('qcrate', f);
  assert(q.includes(qDot) && q.lastIndexOf('restore()') < q.lastIndexOf(qDot),
    `qcrate frame ${f}: the dot stays fixed outside the swinging stem transform`);
}

// --- the animal hazards (sprites/animals.js) ---------------------------------
// They register into props.js by spreading six tables into it, so what is worth
// pinning is that every one of those spreads actually landed — a table left out
// fails silently as a prop that draws but never animates, or animates but wears
// the shared blurry halo over its own hairline.
//
// The generic loops above already cover their frames: because they are in
// PROP_FRAMES, each is checked for per-frame canvases, wrapping indices and
// genuinely distinct poses across the cycle.
const ANIMALS = ['dogSnarler', 'dogBruiser', 'dogFeral', 'catFury'];
assert(ANIMALS.every((n) => typeof PROP_PAINTERS[n] === 'function'),
  'all four animals register a vector painter through the ANIMAL_PAINTERS spread');
// THE PLANTED GALLOP (16 Oct 2026, sprites/dogs.js): the dogs run a 16-frame ring
// stepped by the road they cover, so a planted foot never slides — their fallback
// clock is that same rate at the def's speed: frames x |vx| / stride.
const DOGS = ['dogSnarler', 'dogBruiser', 'dogFeral'];
{
  const { ANIMAL_STRIDE } = await import('../src/sprites/animals.js');
  const { DOG_FRAMES } = await import('../src/sprites/dogs.js');
  assert(DOGS.every((n) => propFrames(n) === DOG_FRAMES && DOG_FRAMES === 16),
    'every dog gallops over the planted gallop\'s sixteen frames');
  assert(DOGS.every((n) => Math.abs(propFps(n) * ANIMAL_STRIDE[n] / DOG_FRAMES - Math.abs(OBSTACLES[n].vx)) < 0.01),
    'each dog\'s cycle rate carries its planted foot back at exactly its own speed — no skating');
  assert(DOGS.every((n) => propFps(n) > 20 && propFps(n) < 60),
    'dog cycle rates sit in a smooth band — well over the 15fps the 8-frame ring stepped at');
}
// THE FELINE PLANTED GALLOP (16 Oct 2026, sprites/felineGait.js): the three running cats
// got the dogs' contract — sixteen frames, the ring stepped by the road covered, and the
// fallback clock that same rate at the def's speed.
const FELINES = ['catFury', 'cryptPanther', 'bobcat'];
{
  const { ANIMAL_STRIDE, animalGaitRate } = await import('../src/sprites/animals.js');
  const { FELINE_FRAMES } = await import('../src/sprites/felineGait.js');
  assert(FELINES.every((n) => propFrames(n) === FELINE_FRAMES && FELINE_FRAMES === 16),
    'every running cat gallops over the planted gallop\'s sixteen frames');
  assert(FELINES.every((n) => ANIMAL_STRIDE[n] > 0
    && Math.abs(propFps(n) * ANIMAL_STRIDE[n] / FELINE_FRAMES - Math.abs(OBSTACLES[n].vx)) < 0.01),
    'each cat\'s cycle rate carries its planted paw back at exactly its own speed — no skating');
  assert(FELINES.every((n) => Math.abs(animalGaitRate({ type: n, def: OBSTACLES[n], vx: OBSTACLES[n].vx })
    - Math.abs(OBSTACLES[n].vx) / ANIMAL_STRIDE[n]) < 1e-9),
    'a running cat\'s ring is stepped by the road it covers (animalGaitRate)');
  assert(FELINES.every((n) => propFps(n) > 20 && propFps(n) < 60),
    'cat cycle rates sit in a smooth band');
}
assert(ANIMALS.every((n) => propDetailScale(n) === 1.5),
  'the running animals rasterize at 1.5 — A/B\'d against 2 at the sharpest any player sees them (16 Oct 2026)');
assert(ANIMALS.every((n) => !propHazardRim(n)),
  'animals carry their own hairline and skip the shared blurry hazard halo');
assert(ANIMALS.every((n) => propVisualScale(n) > 1 && propVisualScale(n) < 1.35),
  'animals draw a little over their box for legibility, but under the drones — they are the ones that close on you');
assert(ANIMALS.every((n) => propTall(n) >= 1),
  'animal art is never drawn shorter than its own hitbox');
// Behaviour, not art: these are the only ground hazards that come to the hero.
assert(ANIMALS.every((n) => OBSTACLES[n] && OBSTACLES[n].vx < 0 && OBSTACLES[n].ground && OBSTACLES[n].action === 'jump'),
  'every animal is a ground hazard that closes on the hero and is cleared by jumping');
assert(OBSTACLES.catFury.vx < OBSTACLES.dogBruiser.vx,
  'the cat closes faster than the bruiser, which is the whole difference between them');
// Art keys off the entity TYPE (hasProp(e.type) in drawWorldEntity), so the
// obstacle key and the painter name must not drift apart.
assert(ANIMALS.every((n) => OBSTACLES[n].sprite === n),
  'animal obstacle keys match their painter names, which is what wires the animation up');
// Any animal counts, the neon swiping cats included (16 Oct 2026: they took the bruiser's
// place there, dealt on the neon levels' own banks and through its `rotations` slot).
const isAnimal = (cab, t) => OBSTACLES[t]?.animal || (cab.rotations?.[t]?.list || []).some((r) => OBSTACLES[r]?.animal);
const animalCabinets = CABINETS.filter((cab) =>
  [cab.patterns, ...Object.values(cab.floorPatterns || {})]
    .some((pats) => pats.some((pat) => pat.cells.some((cell) => isAnimal(cab, cell.t)))));
assert(animalCabinets.length >= 3,
  `animals are spawned by at least three cabinets (got ${animalCabinets.map((c) => c.id).join(', ')})`);
// No dogs or animals in the Corporate Kombat lane (Peter, 14 Oct 2026), on any floor.
const office = CABINETS.find((cab) => cab.id === 'office');
const officeAnimals = Object.values(office.floorPatterns).flat().concat(office.patterns)
  .flatMap((pat) => pat.cells).filter((cell) => OBSTACLES[cell.t]?.animal).map((cell) => cell.t);
assert(officeAnimals.length === 0,
  `no animal is dealt on any Corporate Kombat floor (got ${[...new Set(officeAnimals)].join(', ') || 'none'})`);


console.log(failed ? 'PROPS: FAILED' : 'PROPS: PASSED');
process.exit(failed ? 1 : 0);
