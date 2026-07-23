// Prop raster cache: static props get one canvas regardless of frame index,
// animated props (none currently — PROP_FRAMES) get one per frame, and the
// ground hazard is wired to the cactus art.
import { installDom } from './dom-stub.js';
installDom();

const { propFrames, propFps, propSprite, propTinted, propRimPair, PROP_FRAMES, PROP_PAINTERS } = await import('../src/sprites/props.js');
const { OBSTACLES, PICKUPS } = await import('../src/game/entities.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// The hazard formerly known as shrub (and briefly as fire) is a cactus now.
assert(OBSTACLES.cactus && OBSTACLES.cactus.sprite === 'cactus', 'the ground hazard draws as a cactus');
assert(OBSTACLES.cactusBig && OBSTACLES.cactusBig.sprite === 'cactusBig', 'the big variant too');
assert(!OBSTACLES.shrub && !OBSTACLES.flames, 'no shrub or flames obstacle survives the renames');
assert(typeof PROP_PAINTERS.cactus === 'function', 'cactus has a vector painter');
assert(PICKUPS.resident.sprite === 'resident' && typeof PROP_PAINTERS.resident === 'function',
  'residents use distinct friendly art instead of the zombie hazard sprite');
assert(PICKUPS.appliance.w === 18 && PICKUPS.appliance.h === 12 && PICKUPS.appliance.bob,
  'flying toaster has a readable 18x12 silhouette and bobs');
assert(propFrames('appliance') === 12, 'the flying toaster flaps over twelve frames');
assert(propFps('appliance') === 24, 'the flying toaster cycles smoothly at 24fps');
assert(PICKUPS.cord.w === 14 && PICKUPS.cord.h === 9 && PICKUPS.cord.sprite === 'cord',
  'cord pieces use their own larger pickup art instead of the carried fuse');
assert(typeof PROP_PAINTERS.cord === 'function', 'cord piece has a refined vector painter');

assert(propFrames('cactus') === 6, 'the cactus sways over six frames');
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
  assert(seen.size === n, `${name}: draws a different shape on each of its ${n} frames`);
}

console.log(failed ? 'PROPS: FAILED' : 'PROPS: PASSED');
process.exit(failed ? 1 : 0);
