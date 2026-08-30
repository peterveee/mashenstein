// Fairness simulation: for every cabinet × speed tier × seed batch, generate
// long obstacle streams through the REAL spawner and assert the invariant:
// between any two action-required obstacles there is at least
// speed × (worst airtime + reaction floor) of runway (accounting for jump-then-duck).
// Runs headless; no DOM needed.
import { Spawner, REACT_FLOOR, REACT_FLOOR_MAX, worstAirtime } from '../src/game/spawner.js';
import { CABINETS, CABINET_BY_ID } from '../src/data/cabinets.js';
import { STAGES } from '../src/data/stages.js';
import { resolveLayout } from '../src/game/layout.js';
import { Rng } from '../src/engine/rng.js';

const SEEDS = parseInt(process.env.SEEDS || '200', 10);
const SPEEDS = [160, 208, 232, 160 * 1.65 * 1.35]; // world 1..4 bases + UNPLUGGED worst case
const STREAM_PX = 40000;

let failures = 0, checks = 0;

// One stream, asserted. Pulled out of the cabinet loop so the section sweep
// below can hold a CURATED bag to exactly the same invariant — a stage that
// thins its bag or packs its lane is the case most likely to walk into the
// floor, and it would be no use having a gate that only ever saw full banks.
function sweep(label, makeSpawner, cab) {
  for (const speed of SPEEDS) {
    const react = speed > 300 ? REACT_FLOOR_MAX : REACT_FLOOR;
    for (let s = 0; s < SEEDS; s++) {
      const spawner = makeSpawner(s, react);
      if (!spawner) continue;
      const obstacles = [], pickups = [];
      let worldX = 0;
      while (worldX < STREAM_PX) { spawner.fill(worldX, speed, obstacles, pickups, () => 45); worldX += 480; }
      // Verify: consecutive action obstacles.
      const actions = obstacles
        .filter((o) => o.def.action !== 'none')
        .sort((a, b) => a.x - b.x);
      for (let i = 1; i < actions.length; i++) {
        const prev = actions[i - 1], next = actions[i];
        checks++;
        let minT = react;
        if (prev.def.action === 'jump') minT += worstAirtime();
        if (prev.def.action === 'jump' && next.def.action === 'duck') minT += 0.15;
        const minGap = speed * minT - 1; // 1px numeric slack
        const gap = next.x - (prev.x + prev.w);
        // Overlapping same-pattern clusters count as one composite obstacle if
        // they are the same action type back-to-back (jumpable together).
        const composite = gap < 4 && prev.def.action === next.def.action;
        if (!composite && gap < minGap) {
          failures++;
          if (failures < 10) {
            console.error(`UNFAIR: ${label} speed=${Math.round(speed)} seed=${s} ` +
              `${prev.type}(${prev.def.action})@${Math.round(prev.x)} -> ${next.type}(${next.def.action})@${Math.round(next.x)} ` +
              `gap=${Math.round(gap)} < ${Math.round(minGap)}`);
          }
        }
      }
    }
  }
}

// 1. every cabinet's whole bank, as this sim has always done.
for (const cab of CABINETS) {
  if (!cab.patterns.length) continue; // surge remixes others; its banks are theirs
  sweep(cab.id, (s, react) => new Spawner({
    cabinet: cab, rng: new Rng(s * 7919 + 17), tierMax: 2, react,
    iceSlide: cab.mechanic === 'ice' ? 14 : 0,
  }), cab);
}

// 2. every CURATED bag a stage layout declares. Each section is run as though
// it governed the whole stream, which is the only way to give it a stream long
// enough to say anything: a section holding a tenth of a stage would otherwise
// be judged on a handful of patterns. A section that empties its bag is
// skipped and named — the spawner degrades to bare lane there, which is a
// design mistake for the editor's validator to catch, not an unfair one.
let sectionsChecked = 0, emptied = 0;
for (const stage of STAGES) {
  const cab = CABINET_BY_ID[stage.cabinet];
  const layout = resolveLayout(stage, cab);
  for (const [i, section] of (layout.sections || []).entries()) {
    const full = { ...section, from: 0, to: 1 };
    const probe = new Spawner({
      cabinet: cab, rng: new Rng(1), tierMax: 2, react: REACT_FLOOR,
      sections: [full], totalDist: STREAM_PX,
    });
    if (!probe.pickPattern()) {
      emptied++;
      console.warn(`  (skipped ${stage.id} section ${i + 1}: its exclusions leave the bag empty)`);
      continue;
    }
    sectionsChecked++;
    sweep(`${stage.id}#${i + 1}`, (s, react) => new Spawner({
      cabinet: cab, rng: new Rng(s * 7919 + 17), tierMax: 2, react,
      iceSlide: cab.mechanic === 'ice' ? 14 : 0,
      sections: [full], totalDist: STREAM_PX,
    }), cab);
  }
}
if (sectionsChecked || emptied) {
  console.log(`fairness: ${sectionsChecked} curated section bag(s) swept`
    + (emptied ? `, ${emptied} skipped as empty` : ''));
}

console.log(`fairness: ${checks} transitions checked across ${SEEDS} seeds x ${SPEEDS.length} speeds x ${CABINETS.filter((c) => c.patterns.length).length} cabinets`);
if (failures) {
  console.error(`FAIRNESS SIM FAILED: ${failures} unfair transitions`);
  process.exit(1);
}
console.log('FAIRNESS SIM PASSED');
