// Build a stage's animated artwork BEFORE it appears.
//
// Every prop canvas in this game is rasterized lazily, at 8x supersample, on
// the first frame that draws it — and the frames of an animation are separate
// canvases, so a prop with a long cycle mints a new one on every consecutive
// frame it is on screen. Measured on the real game before this existed:
// frost-1 built 107 canvases during twenty seconds of play, forty of them
// inside a single second, and plumber-1 held 11-12 a second for three seconds
// running. That is the judder — not the simulation, which the update-side
// profiler puts at 0.1ms.
//
// So the same work is done while nothing is moving: the briefing, the ACT
// banner, the run-in. The queue is cooperative rather than a loop, because the
// point is to never be the reason a frame is late — including the frames of the
// screens it runs behind.
import { OBSTACLES, PICKUPS } from './entities.js';
import {
  hasProp, propFrames, propSprite, propRimPair, propTall, propHazardRim,
  propCacheStats, evictPropsExcept,
} from '../sprites/props.js';

// The two rim colours drawWorldEntity composes hazard outlines from. They are
// literals there too; if they ever move, these follow, and the warm-up simply
// builds keys nothing asks for until they do — wasted work, never a wrong frame.
const RIM_LITE = '#f0f0f8';
const RIM_DARK = '#101018';

let queue = [];
let cursor = 0;
let builtFor = null;

// A prop's drawn identity, matching drawWorldEntity: art keys on the entity
// TYPE where one exists, then on a per-instance skin, then on the def's sprite.
function propNameFor(type, def, skin) {
  if (skin && hasProp(skin)) return skin;
  if (hasProp(type)) return type;
  if (def && def.sprite && hasProp(def.sprite)) return def.sprite;
  return null;
}

// Same arithmetic as draw1(): the art is painted at the def box stretched by
// propTall, and the raster keys on THAT height, not on the hitbox.
function jobsFor(type, def, kind, skin) {
  const name = propNameFor(type, def, skin);
  if (!name || !def) return [];
  const w = def.w;
  const h = def.h * propTall(name);
  // Matches drawWorldEntity: things you want (targets, pads, switches) are not
  // ringed, so they never build rim pairs.
  const danger = kind === 'obstacle' && !def.isTarget && !def.isBoost && !def.isSwitch;
  const rim = danger && propHazardRim(name);
  const frames = propFrames(name);
  const out = [];
  for (let f = 0; f < frames; f++) out.push({ name, w, h, f, rim });
  return out;
}

// Every obstacle type this cabinet's patterns can place, plus the pickups any
// stage can drip. Cabinet patterns name their cells by type, so the list is
// exact rather than "warm everything and hope".
function stageJobs(cabinet) {
  const jobs = [];
  const seen = new Set();
  const add = (type, def, kind, skin) => {
    const key = `${type}|${skin || ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    jobs.push(...jobsFor(type, def, kind, skin));
  };

  for (const pattern of cabinet?.patterns || []) {
    for (const cell of pattern.cells || []) {
      const def = OBSTACLES[cell.t];
      if (!def) continue;
      add(cell.t, def, 'obstacle');
      // A drone wears one of two bodies, chosen from world position at spawn —
      // so both are reachable in any run and both have to be ready.
      for (const skin of def.skins || []) add(cell.t, def, 'obstacle', skin);
    }
  }
  for (const [type, def] of Object.entries(PICKUPS)) add(type, def, 'pickup');

  // Frame zero of everything first: an object that appears before its cycle is
  // ready still shows the right art, just not yet moving. The long cycles
  // (36-frame crate, 96-frame appliance) come last because they are the ones
  // most likely to still be queued when play starts.
  return [...jobs.filter((j) => j.f === 0), ...jobs.filter((j) => j.f !== 0)];
}

// Above this, entering a DIFFERENT cabinet drops the art of the one before it.
// One warmed stage is around 56MB of canvas, so a single stage never trips this
// and a session that keeps moving between cabinets stops accumulating. Set as a
// high-water mark rather than an always-evict so the common case — retry, or
// the next stage of the same cabinet — never pays to rebuild anything.
const CACHE_BUDGET_BYTES = 80 * 1024 * 1024;

export function beginStageArtWarmup(cabinet) {
  const id = cabinet?.id || null;
  if (builtFor === id && cursor < queue.length) return;   // already queued, keep going
  const changed = builtFor !== id;
  builtFor = id;
  queue = stageJobs(cabinet);
  cursor = 0;
  if (changed && propCacheStats().residentBytes > CACHE_BUDGET_BYTES) {
    // Keep what this stage is about to ask for; everything else was the last
    // cabinet's, and rebuilding it later costs a menu frame, not a run.
    evictPropsExcept(new Set(queue.map((j) => j.name)));
  }
}

export function artWarmupPending() { return Math.max(0, queue.length - cursor); }

// Move everything for one prop to the front. Called when something spawns off
// the right edge: it has a screen's width of travel before it is visible, which
// is the whole budget available to get its art ready.
export function prioritiseArt(name) {
  if (!name || cursor >= queue.length) return;
  let write = cursor;
  for (let i = cursor; i < queue.length; i++) {
    if (queue[i].name !== name) continue;
    if (i !== write) { const t = queue[i]; queue[i] = queue[write]; queue[write] = t; }
    write++;
  }
}

// Work the queue for at most budgetMs. Checks the clock BETWEEN jobs and never
// inside one: a single rasterize cannot be interrupted, so the budget is a
// promise about when to stop starting work, not about total elapsed time. One
// job is always taken, so progress cannot stall on a budget of zero.
export function stepArtWarmup(budgetMs = 2) {
  if (cursor >= queue.length) return 0;
  const start = typeof performance !== 'undefined' ? performance.now() : 0;
  let done = 0;
  do {
    const j = queue[cursor++];
    try {
      propSprite(j.name, j.w, j.h, j.f);
      if (j.rim) {
        propRimPair(j.name, j.w, j.h, RIM_LITE, 'x', j.f);
        propRimPair(j.name, j.w, j.h, RIM_DARK, 'y', j.f);
      }
    } catch (e) {
      // A painter that throws must not take the run with it, and must not jam
      // the queue behind it either — the frame simply stays lazy, as it was.
    }
    done++;
  } while (cursor < queue.length && start && performance.now() - start < budgetMs);
  return done;
}

// For tests and diagnostics.
export function artWarmupQueueFor(cabinet) { return stageJobs(cabinet); }
export function resetArtWarmup() { queue = []; cursor = 0; builtFor = null; }
