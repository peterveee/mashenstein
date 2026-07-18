// Fairness simulation: for every cabinet × speed tier × seed batch, generate
// long obstacle streams through the REAL spawner and assert the invariant:
// between any two action-required obstacles there is at least
// speed × (worst airtime + reaction floor) of runway (accounting for jump-then-duck).
// Runs headless; no DOM needed.
import { Spawner, REACT_FLOOR, REACT_FLOOR_MAX, worstAirtime } from '../src/game/spawner.js';
import { CABINETS } from '../src/data/cabinets.js';
import { Rng } from '../src/engine/rng.js';

const SEEDS = parseInt(process.env.SEEDS || '200', 10);
const SPEEDS = [160, 208, 232, 160 * 1.65 * 1.35]; // world 1..4 bases + UNPLUGGED worst case
const STREAM_PX = 40000;

let failures = 0, checks = 0;

for (const cab of CABINETS) {
  if (!cab.patterns.length) continue; // surge remixes others; its banks are theirs
  for (const speed of SPEEDS) {
    const react = speed > 300 ? REACT_FLOOR_MAX : REACT_FLOOR;
    for (let s = 0; s < SEEDS; s++) {
      const spawner = new Spawner({ cabinet: cab, rng: new Rng(s * 7919 + 17), tierMax: 2, react, iceSlide: cab.mechanic === 'ice' ? 14 : 0 });
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
            console.error(`UNFAIR: ${cab.id} speed=${Math.round(speed)} seed=${s} ` +
              `${prev.type}(${prev.def.action})@${Math.round(prev.x)} -> ${next.type}(${next.def.action})@${Math.round(next.x)} ` +
              `gap=${Math.round(gap)} < ${Math.round(minGap)}`);
          }
        }
      }
    }
  }
}

console.log(`fairness: ${checks} transitions checked across ${SEEDS} seeds x ${SPEEDS.length} speeds x ${CABINETS.length - 1} cabinets`);
if (failures) {
  console.error(`FAIRNESS SIM FAILED: ${failures} unfair transitions`);
  process.exit(1);
}
console.log('FAIRNESS SIM PASSED');
