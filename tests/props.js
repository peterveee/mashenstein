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
assert(!OBSTACLES.shrub && !OBSTACLES.flames, 'no shrub or flames obstacle survives the renames');
assert(typeof PROP_PAINTERS.cactus === 'function', 'cactus has a vector painter');
assert(typeof PROP_PAINTERS.snowman === 'function', 'snowman has a vector painter');
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
  'cactus', 'cactusBig', 'crate', 'qcrate', 'pipe', 'switch', 'zombieWalk', 'icicle',
  'buzzbird', 'drone', 'shooterDrone', 'printer', 'chair', 'battery',
  'capShield', 'capMagnet', 'capStar', 'capAirJump', 'capSpeed', 'capLowGrav', 'capUnpeel',
];
assert(refinedProps.every((name) => propDetailScale(name) === 2),
  'small reviewed props rasterize at double internal detail');
const pickupSprites = [...new Set(Object.values(PICKUPS).map((def) => def.sprite))];
assert(pickupSprites.every((name) => propDetailScale(name) === 2),
  'every world pickup rasterizes at double internal detail');
assert(propVisualScale('snowman') === 1.15 && propVisualScale('snowmanBig') === 1.15,
  'both snowmen draw larger without changing their hitboxes');
const selfOutlinedHazards = [
  'cactus', 'cactusBig', 'snowman', 'snowmanBig', 'crate', 'pipe', 'zombieWalk', 'icicle',
  'buzzbird', 'drone', 'shooterDrone', 'printer', 'chair',
];
assert(selfOutlinedHazards.every((name) => !propHazardRim(name)) && propHazardRim('barrel'),
  'refined hazards skip the blurry shared halo while other hazards retain it');
const frost = CABINETS.find((cabinet) => cabinet.id === 'frost');
const frostTypes = frost.patterns.flatMap((pattern) => pattern.cells.map((cell) => cell.t));
assert(frostTypes.includes('snowman') && frostTypes.includes('snowmanBig'),
  'Frost Fortress uses both snowman hazard sizes');
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
    get: (_, k) => (...args) => { log.push(`${String(k)}(${args.map((a) => (typeof a === 'number' ? a.toFixed(3) : a)).join(',')})`); },
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
  const distinct = name === 'qcrate' ? Math.ceil(n / 2) : n;
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
assert(ANIMALS.every((n) => propFrames(n) === 8),
  'every animal gallops over the same eight frames');
assert(ANIMALS.every((n) => propFps(n) >= 15 && propFps(n) <= 20),
  'animal cycle rates sit in the gallop band, faster than the 11fps default');
assert(propFps('dogBruiser') > propFps('dogFeral'),
  'the short-legged bruiser takes MORE steps to keep up, not fewer');
assert(ANIMALS.every((n) => propDetailScale(n) === 2),
  'animals rasterize at the same double internal detail as every other refined prop');
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
const animalCabinets = CABINETS.filter((cab) =>
  cab.patterns.some((pat) => pat.cells.some((cell) => ANIMALS.includes(cell.t))));
assert(animalCabinets.length >= 3,
  `animals are spawned by at least three cabinets (got ${animalCabinets.map((c) => c.id).join(', ')})`);


console.log(failed ? 'PROPS: FAILED' : 'PROPS: PASSED');
process.exit(failed ? 1 : 0);
