// Prop raster cache: static props get one canvas regardless of frame index,
// animated props (none currently — PROP_FRAMES) get one per frame, and the
// ground hazard is wired to the cactus art.
import { installDom } from './dom-stub.js';
installDom();

const {
  propFrames, propFps, propDetailScale, propVisualScale, propSprite, propTinted,
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
assert(PICKUPS.appliance.w === 24 && PICKUPS.appliance.h === 20 && PICKUPS.appliance.bob,
  'flying toaster has a detailed 24x16 body plus launch headroom and bobs');
assert(propFrames('appliance') === 96, 'the flying toaster combines a four-second toast pop with its quick flap');
assert(propFps('appliance') === 24, 'the flying toaster cycles smoothly at 24fps');
assert(propFrames('qcrate') === 36 && propFps('qcrate') === 12,
  'the !-box pendulum and occasional glint use a slow three-second loop');
assert(propDetailScale('qcrate') === 2,
  'the !-box authors its outline, punctuation and glint at double detail');
assert(PICKUPS.cord.w === 14 && PICKUPS.cord.h === 9 && PICKUPS.cord.sprite === 'cord',
  'cord pieces use their own larger pickup art instead of the carried fuse');
assert(typeof PROP_PAINTERS.cord === 'function', 'cord piece has a refined vector painter');

assert(propFrames('cactus') === 6, 'the cactus sways over six frames');
assert(propFrames('snowman') === 6, 'the snowman shivers over six frames');
assert(propDetailScale('snowman') === 2 && propDetailScale('snowmanBig') === 2,
  'both snowmen rasterize at double internal detail');
assert(propVisualScale('snowman') === 1.15 && propVisualScale('snowmanBig') === 1.15,
  'both snowmen draw larger without changing their hitboxes');
assert(!propHazardRim('snowman') && !propHazardRim('snowmanBig') && propHazardRim('cactus'),
  'snowmen skip the blurry shared hazard halo without changing other hazards');
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

console.log(failed ? 'PROPS: FAILED' : 'PROPS: PASSED');
process.exit(failed ? 1 : 0);
