// Stage artwork is built ahead of the frame that needs it. Prop canvases are
// rasterized lazily at 8x supersample and every animation frame is its own
// canvas, so a prop with a long cycle used to mint one on each consecutive
// frame it was on screen — measured on the real game at 40 new canvases inside
// a single second on frost-1, and 11-12 a second for three seconds running on
// plumber-1. The warm-up moves that work into the briefing and the run-in.
//
// Two properties have to hold for that to be worth anything:
//
//   - the queue actually covers what a stage can spawn. A job list that misses
//     a prop is worse than none at all: it spends the budget and still hitches.
//   - warming has a ceiling. Building art up front is the opposite trade from
//     building it lazily — it removes the hitch and raises the resident total,
//     and nothing in this cache was ever freed.
//
// Both are checked against the real cabinet tables rather than a fixture, so a
// new cabinet or a new animated prop is covered the day it lands.
import { installDom } from './dom-stub.js';

installDom();

const { artWarmupQueueFor } = await import('../src/game/art-warmup.js');
const { CABINETS } = await import('../src/data/cabinets.js');
const { OBSTACLES } = await import('../src/game/entities.js');
const {
  hasProp, propFrames, propTall, propSprite, propCacheStats, evictPropsExcept,
} = await import('../src/sprites/props.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// --- coverage ---------------------------------------------------------------
// Every obstacle a cabinet's patterns can place, that has vector art, has to
// appear in that cabinet's queue. This is the assertion that catches a new prop
// being added to a pattern without the warm-up learning about it.
let checkedCabinets = 0;
let missing = [];
for (const cab of CABINETS) {
  if (!cab.patterns || !cab.patterns.length) continue;
  checkedCabinets++;
  const jobs = artWarmupQueueFor(cab);
  const names = new Set(jobs.map((j) => j.name));
  for (const pattern of cab.patterns) {
    for (const cell of pattern.cells || []) {
      const def = OBSTACLES[cell.t];
      if (!def) continue;
      const art = hasProp(cell.t) ? cell.t : (hasProp(def.sprite) ? def.sprite : null);
      if (art && !names.has(art)) missing.push(`${cab.id}:${cell.t}`);
      for (const skin of def.skins || []) {
        if (hasProp(skin) && !names.has(skin)) missing.push(`${cab.id}:${cell.t}/${skin}`);
      }
    }
  }
}
assert(checkedCabinets >= 3, `checked ${checkedCabinets} cabinets with patterns`);
assert(missing.length === 0, `every patterned obstacle resolves to a warm-up job${missing.length ? ' — missing ' + missing.join(', ') : ''}`);

// Animated props must be queued for every frame, not just frame zero: the
// whole failure being fixed is the SECOND frame onward arriving one per frame.
const plumber = CABINETS.find((c) => c.id === 'plumber');
const pj = artWarmupQueueFor(plumber);
const qcrateJobs = pj.filter((j) => j.name === 'qcrate');
assert(qcrateJobs.length === propFrames('qcrate'),
  `every qcrate frame is queued (${qcrateJobs.length} of ${propFrames('qcrate')})`);
assert(new Set(qcrateJobs.map((j) => j.f)).size === qcrateJobs.length,
  'queued frames are distinct, not the same frame repeated');

// Frame zero of everything comes before any later frame, so an object that
// appears while the queue is still draining still shows the right art.
const firstNonZero = pj.findIndex((j) => j.f !== 0);
const lastZero = pj.map((j) => j.f).lastIndexOf(0);
assert(firstNonZero === -1 || lastZero < firstNonZero,
  'frame zero of every prop is queued ahead of any later frame');

// The raster keys on the STRETCHED height, so a job that queued the hitbox
// height would warm a key nothing ever asks for.
const tallName = pj.find((j) => propTall(j.name) !== 1)?.name;
if (tallName) {
  const def = Object.values(OBSTACLES).find((d) => d.sprite === tallName) || OBSTACLES[tallName];
  const job = pj.find((j) => j.name === tallName);
  if (def) {
    assert(Math.abs(job.h - def.h * propTall(tallName)) < 1e-9,
      `${tallName} is queued at its drawn height, not its hitbox height`);
  }
}

// --- eviction ---------------------------------------------------------------
// Warm a couple of props, then drop everything not named in the keep set.
propSprite('cactus', 13, 12, 0);
propSprite('cactus', 13, 12, 1);
propSprite('snowman', 13, 12, 0);
const before = propCacheStats();
assert(before.entries >= 3, `warmed ${before.entries} canvases to evict from`);

const freed = evictPropsExcept(new Set(['cactus']));
const after = propCacheStats();
assert(after.entries < before.entries, 'eviction removes entries');
assert(propCacheStats().residentBytes <= before.residentBytes,
  'resident byte total falls with the entries it dropped');
assert(freed >= 0 && after.residentBytes === before.residentBytes - freed,
  'freed bytes are accounted for exactly, not estimated');
// The kept prop survives; a rebuild of it must not be needed.
const entriesAfterKeepHit = (propSprite('cactus', 13, 12, 0), propCacheStats().entries);
assert(entriesAfterKeepHit === after.entries,
  'a kept prop is still cached after eviction (no rebuild)');

console.log(failed ? 'ART WARMUP: FAILED' : 'ART WARMUP: OK');
process.exit(failed ? 1 : 0);
