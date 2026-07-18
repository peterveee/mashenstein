// Seeded pattern spawner with COMPUTED fairness. DOM-free so the headless
// fairness sim can import it directly.
import { OBSTACLES, makeObstacle, makePickup } from './entities.js';
import { GRAVITY, BASE_JUMP_V } from './player.js';

export const REACT_FLOOR = 0.25;      // seconds of reaction after previous action
export const REACT_FLOOR_MAX = 0.2;   // at highest tiers / UNPLUGGED

// Worst-case airtime among heroes: heavy Grumpos (gravity ×1.25).
export function worstAirtime() { return (2 * BASE_JUMP_V * 0.9) / (GRAVITY * 1.25); }

export class Spawner {
  constructor({ cabinet, rng, tierMax = 2, react = REACT_FLOOR, iceSlide = 0 }) {
    this.cabinet = cabinet;
    this.rng = rng;
    this.tierMax = tierMax;
    this.react = react;
    this.iceSlide = iceSlide;      // extra px of gap for slidey landings
    this.nextX = 0;
    this.lastPatternIdx = -1;
    this.lastActionX = -9999;
    this.lastActionKind = 'none';
  }

  // Minimum world-px between an action obstacle and the next one, at speed px/s.
  fairGap(speed, prevKind, nextKind) {
    const air = worstAirtime();
    let t = this.react;
    if (prevKind === 'jump') t += air;               // must land first
    if (prevKind === 'jump' && nextKind === 'duck') t += 0.15; // can't duck mid-air
    return speed * t + this.iceSlide;
  }

  pickPattern() {
    const pats = this.cabinet.patterns.filter((p) => p.tier <= this.tierMax);
    if (!pats.length) return null;
    let idx = this.rng.int(0, pats.length - 1);
    if (idx === this.lastPatternIdx && pats.length > 1) idx = (idx + 1) % pats.length;
    this.lastPatternIdx = idx;
    return pats[idx];
  }

  // Fill entities up to worldX + lookahead. Returns arrays of new entities.
  fill(worldX, speed, obstacles, pickups, jumpHeightFn) {
    const lookahead = worldX + 480 + 200;
    while (this.nextX < lookahead) {
      const pat = this.pickPattern();
      if (!pat) { this.nextX += 200; continue; }
      let baseX = this.nextX;
      let lastX = baseX;
      for (const cell of pat.cells) {
        if (cell.t === 'coinArc') {
          this.spawnCoinArc(baseX + cell.dx, cell.n || 4, speed, pickups, jumpHeightFn);
          lastX = Math.max(lastX, baseX + cell.dx + (cell.n || 4) * 14);
          continue;
        }
        const def = OBSTACLES[cell.t];
        if (!def) continue;
        let x = baseX + cell.dx;
        const cellW = cell.t === 'gap' ? (cell.w || def.w) : def.w;
        // Fairness: enforce spacing from the previous action-required cell.
        if (def.action !== 'none') {
          const minX = this.lastActionX + this.fairGap(speed, this.lastActionKind, def.action);
          if (x < minX) x = minX;
          this.lastActionX = x + cellW;
          this.lastActionKind = def.action;
        }
        const ob = makeObstacle(cell.t, x, { n: cell.n });
        if (cell.t === 'gap') ob.w = cellW;
        if (!def.ground && def.alt == null) ob.alt = cell.y || 12;
        obstacles.push(ob);
        lastX = Math.max(lastX, x + ob.w);
      }
      // Gap to the next pattern: random but never below the fairness floor.
      // The next pattern may open with a duck obstacle, so budget for the worst case.
      const roll = this.rng.range(90, 220);
      const fair = this.fairGap(speed, this.lastActionKind, 'duck');
      this.nextX = Math.max(lastX, this.lastActionX) + Math.max(roll, fair);
    }
  }

  // Coins traced along the actual jump parabola (reachable by construction).
  spawnCoinArc(x0, n, speed, pickups, jumpHeightFn) {
    const hMax = (jumpHeightFn ? jumpHeightFn() : 45) * 0.85;
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const alt = 8 + hMax * Math.sin(Math.PI * t);
      pickups.push(makePickup('coin', x0 + i * 14, alt));
    }
  }
}

// Capsule/battery drip spawner (kept separate from patterns; verified reachable).
export class DripSpawner {
  constructor(rng, benchLevels) {
    this.rng = rng;
    this.bench = benchLevels;
    this.capsuleTimer = this.rng.range(12, 18);
    this.batteryTimer = this.rng.range(20, 30);
  }
  update(dt, worldX, pickups, oneHit) {
    this.capsuleTimer -= dt;
    this.batteryTimer -= dt;
    if (this.capsuleTimer <= 0) {
      this.capsuleTimer = this.rng.range(12, 18);
      const type = this.rng.pick(['capShield', 'capMagnet', 'capStar', 'capSlow']);
      pickups.push(makePickup(type, worldX + 480 + 60, 34));
    }
    if (!oneHit && this.batteryTimer <= 0) {
      this.batteryTimer = this.rng.range(20, 30);
      pickups.push(makePickup('battery', worldX + 480 + 100, 10));
    }
  }
}
