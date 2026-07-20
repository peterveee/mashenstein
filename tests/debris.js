// Breaking things throws chunks of them. Covers the shard pool itself (tumble,
// land, settle) and the per-material table that feeds it.
import { installDom } from './dom-stub.js';
installDom();

const { spawnShard, shardBurst, updateParticles, clearParticles, burst } = await import('../src/engine/particles.js');
const { OBSTACLES, DEBRIS, DEBRIS_DEFAULT } = await import('../src/game/entities.js');
const { DEBRIS_MATS, Audio } = await import('../src/engine/audio.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// A deterministic stand-in for fxRng so shard counts and angles are stable.
let seed = 1;
const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };

// Anything that can be destroyed needs chunks to come apart into. The default
// covers the rest, so the real check is that every entry is well-formed.
for (const [type, def] of Object.entries(OBSTACLES)) {
  if (def.breakable === false || def.isGap || def.isBoost) continue;
  const d = DEBRIS[type];
  if (!d) continue;
  assert(Array.isArray(d.colors) && d.colors.length > 0, `${type} debris declares colours`);
  assert(d.colors.every((c) => /^#[0-9a-f]{3,6}$/i.test(c)), `${type} debris colours are all hex`);
  assert(d.size > 0, `${type} debris has a positive chunk size`);
  // A typo here would fall back to wood silently — a stone slab landing with a
  // wooden clatter is exactly the kind of bug nobody files.
  assert(DEBRIS_MATS[d.mat], `${type} debris names a material the audio cue knows (${d.mat})`);
}
assert(DEBRIS_MATS[DEBRIS_DEFAULT.mat], 'the fallback material is a real one too');
assert(DEBRIS.qcrate.mat === 'gold', 'the ?-box scatters with its own coin-flavoured tinkle');
assert(Audio.sfx('debris', { mat: 'stone' }) === undefined, 'the cue is safe to fire with no audio context');
assert(DEBRIS.zombie && DEBRIS.drone && DEBRIS.crate, 'the common enemies and blocks all have their own material');
assert(Array.isArray(DEBRIS_DEFAULT.colors), 'unlisted types fall back to a valid default');

// Draw calls are what tell shards apart from puffs: rects, not arcs.
function record() {
  const log = [];
  const ctx = new Proxy({}, {
    get: (_, k) => {
      if (k === 'globalAlpha' || k === 'fillStyle') return 1;
      return (...args) => { log.push(String(k)); };
    },
    set: () => true,
  });
  return { ctx, log };
}

clearParticles();
shardBurst(100, 50, 8, 80, 0.8, ['#fff', '#000'], { size: 3, rand, floor: 60 });
const { ctx, log } = record();
const { drawParticles } = await import('../src/engine/particles.js');
drawParticles(ctx, 0);
assert(log.filter((c) => c === 'fillRect').length === 8, 'every shard draws as a rect');
assert(!log.includes('arc'), 'no shard draws as a round puff');
assert(log.filter((c) => c === 'rotate').length === 8, 'every shard is drawn rotated');

// Puffs still work alongside them.
clearParticles();
burst(0, 0, 5, 40, 0.5, '#fff', 1, 100, rand);
const puff = record();
drawParticles(puff.ctx, 0);
assert(puff.log.filter((c) => c === 'arc').length === 5, 'plain bursts still draw as round puffs');
assert(!puff.log.includes('fillRect'), 'plain bursts draw no rects');

// A shard thrown at a floor lands on it and stays there rather than sinking.
// drawParticles translates to the shard's position, so that is where we read y.
clearParticles();
spawnShard(0, 0, 20, 200, 5, '#fff', 3, 3, 10, 400, 40);
let below = false;
let lastY = 0;
for (let i = 0; i < 120; i++) {
  updateParticles(1 / 60);
  const ys = [];
  const probe = new Proxy({}, {
    get: (_, k) => {
      if (k === 'globalAlpha' || k === 'fillStyle') return 1;
      if (k === 'translate') return (x, y) => ys.push(y);
      return () => {};
    },
    set: () => true,
  });
  drawParticles(probe, 0);
  if (ys.length) { lastY = ys[0]; if (lastY > 40.6) below = true; }
}
assert(!below, 'a shard settles on the floor instead of falling through it');
assert(Math.abs(lastY - 40) < 0.6, 'and comes to rest on it');

// Chunks expire — no shard outlives its life and clogs the pool.
clearParticles();
shardBurst(0, 0, 12, 60, 0.4, ['#fff'], { rand });
for (let i = 0; i < 200; i++) updateParticles(1 / 60);
const gone = record();
drawParticles(gone.ctx, 0);
assert(gone.log.length === 0, 'shards clear themselves once their life runs out');

console.log(failed ? 'DEBRIS: FAILED' : 'DEBRIS: PASSED');
process.exit(failed ? 1 : 0);
