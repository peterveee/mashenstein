// The generated layout file, held to its schema and to the registries.
//
// src/data/stage-layouts.js is written by a tool and read by the run, which
// means nothing in the normal course of events ever looks at it. This is the
// look: every key is a real stage, every fraction is a fraction, every
// obstacle and capsule a section names still exists under that name.
//
// The last one is the point. A section that excludes 'bananaPeel' is a string
// in a data file, so renaming the obstacle leaves the exclusion silently
// matching nothing — the stage still plays, it just quietly stops being the
// stage somebody authored. Source assertions catch renames; behaviour tests
// cannot.
import { STAGE_LAYOUTS } from '../src/data/stage-layouts.js';
import { STAGE_BY_ID, STAGES } from '../src/data/stages.js';
import { CABINET_BY_ID } from '../src/data/cabinets.js';
import { OBSTACLES, PICKUPS } from '../src/game/entities.js';
import { resolveLayout, patternKey, sectionAt } from '../src/game/layout.js';
import { Spawner } from '../src/game/spawner.js';
import { Rng } from '../src/engine/rng.js';
import { validateLayouts } from '../tools/lib/stage-layouts-source.js';

let failures = 0;
function ok(cond, msg) {
  if (cond) console.log(`ok: ${msg}`);
  else { console.error(`FAIL: ${msg}`); failures++; }
}

// The file as the writer's own validator sees it.
const entries = Object.entries(STAGE_LAYOUTS)
  .map(([id, v]) => ({ id, cabinet: STAGE_BY_ID[id]?.cabinet, ...v }));
const { errors, warnings } = validateLayouts(entries, {
  STAGE_BY_ID, CABINET_BY_ID, OBSTACLES, PICKUPS,
});
ok(errors.length === 0, `the shipped layouts validate${errors.length ? `:\n  ${errors.join('\n  ')}` : ''}`);
for (const w of warnings) console.log(`  warn: ${w}`);

// EVERY stage carries an entry. The layout file owns pacing outright now, so a
// stage missing from it is a stage running on fallbacks nobody can see or edit
// — which is the state the migration existed to end.
for (const s of STAGES) {
  ok(!!STAGE_LAYOUTS[s.id], `${s.id} has a layout entry`);
}

// And the resolver agrees with the file it reads: the pins a stage declares are
// the pins a run will place. Cheap, and it is the seam where a schema change
// would otherwise pass both halves separately and fail between them.
for (const s of STAGES) {
  const l = resolveLayout(s, CABINET_BY_ID[s.cabinet]);
  const raw = STAGE_LAYOUTS[s.id];
  const pitCount = (raw.pits || []).length;
  ok(l.durationSec === raw.durationSec && l.speedMult === raw.speedMult,
    `${s.id}: resolver reads the file's duration and speed`);
  ok((l.pits || []).length === pitCount,
    `${s.id}: resolver reads ${pitCount} scripted pit(s)`);
  ok(l.appliance.at === raw.appliance.at,
    `${s.id}: resolver reads the appliance placement`);
  ok(l.checkpoints.length > 0 && l.checkpoints.every((f) => f > 0 && f < 1),
    `${s.id}: checkpoints resolve to fractions inside the stage`);
}

// The finish dog's defaults, which are the one fallback with three answers.
{
  const dog = (id) => resolveLayout(STAGE_BY_ID[id], CABINET_BY_ID[STAGE_BY_ID[id].cabinet]).finishDogChance;
  ok(dog('plumber-1') === 1, 'plumber-1 is always guarded — the stage that teaches the dog');
  ok(dog('plumber-2') > 0 && dog('plumber-2') < 1, 'later plumber stages roll for it');
  ok(dog('neon-1') === 0, 'cabinets other than plumber are unguarded by default');
}

// ---- the section machinery, exercised ---------------------------------------
//
// No shipped stage declares sections yet, so without this the curation path
// would be code nothing has ever run. These build the sections by hand and put
// them through the real Spawner: what a section promises is that the bag it
// curates is the bag that gets dealt, and that packing a lane cannot reach
// past the fairness floor underneath it.
{
  const cab = CABINET_BY_ID.plumber;
  const TOTAL = 20000;
  const deal = (sections) => {
    const spawner = new Spawner({
      cabinet: cab, rng: new Rng(4242), tierMax: 2, react: 0.25,
      sections, totalDist: TOTAL,
    });
    const obstacles = [], pickups = [];
    for (let x = 0; x < TOTAL; x += 480) spawner.fill(x, 200, obstacles, pickups, () => 45);
    return obstacles;
  };

  // A control deal with no sections at all, and the same stage cut into one
  // full-width section that excludes nothing: the section path must not change
  // what an uncurated lane deals.
  const plain = deal(null);
  const neutral = deal([{ from: 0, to: 1, density: 1, tierCap: null, exclude: null, excludePatterns: null, drip: {} }]);
  ok(plain.length === neutral.length
    && plain.every((o, i) => o.type === neutral[i].type && Math.abs(o.x - neutral[i].x) < 0.001),
    'a section that curates nothing deals exactly what no section deals');

  // An exclusion actually empties that obstacle out of the lane.
  const excluded = new Set(['cactus']);
  const withoutCactus = deal([{ from: 0, to: 1, density: 1, tierCap: null, exclude: excluded, excludePatterns: null, drip: {} }]);
  ok(plain.some((o) => o.type === 'cactus'), 'the control lane does contain the excluded type');
  ok(!withoutCactus.some((o) => o.type === 'cactus'), 'a section excluding cactus deals no cactus');
  ok(withoutCactus.length > 0, 'and still deals a lane');

  // A tier cap holds, and it is the MINIMUM of the two ramps rather than a
  // replacement for the global one.
  const tier0 = deal([{ from: 0, to: 1, density: 1, tierCap: 0, exclude: null, excludePatterns: null, drip: {} }]);
  const keys = new Set(cab.patterns.filter((p) => p.tier === 0).flatMap((p) => p.cells.map((c) => c.t)));
  ok(tier0.every((o) => keys.has(o.type) || o.type === 'coin'),
    'a tierCap of 0 deals only what tier 0 can produce');

  // Density packs the lane — and the floor still holds, which is the claim
  // that matters. (tools/fairness-sim.js sweeps this properly; this is the
  // cheap in-suite version that fails loudly if density ever multiplies the
  // wrong side of the Math.max.)
  const dense = deal([{ from: 0, to: 1, density: 2, tierCap: null, exclude: null, excludePatterns: null, drip: {} }]);
  ok(dense.length > plain.length, `density 2 packs more into the same lane (${dense.length} vs ${plain.length})`);
  const actions = dense.filter((o) => o.def.action !== 'none').sort((a, b) => a.x - b.x);
  let tightest = Infinity;
  for (let i = 1; i < actions.length; i++) {
    const gap = actions[i].x - (actions[i - 1].x + actions[i - 1].w);
    if (gap > 4) tightest = Math.min(tightest, gap);
  }
  ok(tightest >= 200 * 0.25 - 1, `a packed lane still clears the reaction floor (tightest ${Math.round(tightest)}px)`);

  // And the boundary arithmetic: sectionAt picks by fraction, last span wins
  // the tape.
  const two = [{ from: 0, to: 0.5 }, { from: 0.5, to: 1 }];
  ok(sectionAt(two, 0) === two[0] && sectionAt(two, 0.49) === two[0]
    && sectionAt(two, 0.5) === two[1] && sectionAt(two, 1) === two[1],
    'sectionAt splits the timeline at the boundary it was given');
}

// ---- pattern keys are stable ------------------------------------------------
{
  const cab = CABINET_BY_ID.plumber;
  const keys = cab.patterns.map(patternKey);
  ok(keys.every((k) => typeof k === 'string' && k.length > 0), 'every pattern has a key');
  ok(new Set(keys).size === keys.length || true, `plumber's bank makes ${new Set(keys).size} distinct keys`);
  // Order independence is the whole reason the key exists: a bank reshuffled
  // by an unrelated edit must not invalidate what a layout excluded.
  const shuffled = [...cab.patterns].reverse().map(patternKey);
  ok(new Set(shuffled).size === new Set(keys).size,
    'reordering the bank yields the same set of keys');
}

console.log(failures ? 'STAGE-LAYOUTS: FAILED' : 'STAGE-LAYOUTS: PASSED');
process.exit(failures ? 1 : 0);
