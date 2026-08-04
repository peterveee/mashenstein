// Seeded pattern spawner with COMPUTED fairness. DOM-free so the headless
// fairness sim can import it directly.
import { OBSTACLES, PICKUPS, makeObstacle, makePickup } from './entities.js';
import { GRAVITY, BASE_JUMP_V } from './player.js';
import { randomPowerPickup } from './powerups.js';

export const REACT_FLOOR = 0.25;      // seconds of reaction after previous action
export const REACT_FLOOR_MAX = 0.2;   // at highest tiers / UNPLUGGED

// Coin lattice: one spacing used both across and up, so a block reads as a
// square grid rather than a stretched one. The floor is the resting altitude of
// a coin sitting on the ground.
export const COIN_GAP = 14;
export const COIN_FLOOR = 8;

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
  //
  // `stopX` is a hard wall the lane is not allowed to cross — the finish
  // marker's clear approach. Nothing is placed on it, near it or past it: a
  // pattern that would reach the wall is abandoned WHOLE rather than trimmed to
  // fit, because half a pattern is a fairness hole (the half that got cut may
  // have been the coins the jump was for, or the platform the spikes needed).
  // The last thing the player sees before the flagpole is empty ground, which
  // is the only thing that reads as a finishing straight.
  fill(worldX, speed, obstacles, pickups, jumpHeightFn, stopX = Infinity) {
    const lookahead = Math.min(worldX + 480 + 200, stopX);
    while (this.nextX < lookahead) {
      const pat = this.pickPattern();
      if (!pat) { this.nextX += 200; continue; }
      let baseX = this.nextX;
      let lastX = baseX;
      // Staged, not pushed: the pattern only joins the world once it is known to
      // fit inside the wall, so an over-running one leaves nothing behind.
      const obs = [], picks = [];
      // The fairness cursors move as cells are placed and must not be left
      // advanced by a pattern that gets thrown away.
      const actionX = this.lastActionX, actionKind = this.lastActionKind;
      for (const cell of pat.cells) {
        if (cell.t === 'coins') {
          lastX = Math.max(lastX, baseX + cell.dx + this.spawnCoins(baseX + cell.dx, cell, picks, jumpHeightFn));
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
        obs.push(ob);
        lastX = Math.max(lastX, x + ob.w);
      }
      // The far edge of everything this pattern laid down, coins included.
      let right = lastX;
      for (const p of picks) right = Math.max(right, p.x + (p.w || 8));
      if (right > stopX) {
        this.lastActionX = actionX;
        this.lastActionKind = actionKind;
        this.nextX = stopX;      // the lane is closed from here to the marker
        return;
      }
      for (const ob of obs) obstacles.push(ob);
      for (const p of picks) pickups.push(p);
      // Gap to the next pattern: random but never below the fairness floor.
      // The next pattern may open with a duck obstacle, so budget for the worst case.
      const roll = this.rng.range(90, 220);
      const fair = this.fairGap(speed, this.lastActionKind, 'duck');
      this.nextX = Math.max(lastX, this.lastActionX) + Math.max(roll, fair);
    }
  }

  // Coin formations. Every shape is anchored on the ground line at COIN_FLOOR
  // and clamped to the current hero's jump envelope, so anything laid down here
  // is reachable by construction — the same guarantee the arc always had.
  // Returns the formation's width in px so fill() can advance past it.
  spawnCoins(x0, cell, pickups, jumpHeightFn) {
    const hMax = (jumpHeightFn ? jumpHeightFn() : 45) * 0.85;
    const put = (dx, alt) => pickups.push(makePickup('coin', x0 + dx, COIN_FLOOR + alt));
    switch (cell.shape || 'arc') {
      // The jump parabola itself. n IS the shape: four coins sample the hump
      // coarsely enough to read as a triangle, seven or more as a curve.
      case 'arc': {
        const n = cell.n || 7;
        for (let i = 0; i < n; i++) {
          const t = n === 1 ? 0.5 : i / (n - 1);
          put(i * COIN_GAP, hMax * Math.sin(Math.PI * t));
        }
        return (n - 1) * COIN_GAP;
      }
      // A slab you punch through on the way up. Rows are clamped to the jump
      // envelope, so a short hero never sees a row they cannot touch.
      case 'block': {
        const cols = cell.cols || 3;
        const rows = Math.min(cell.rows || 3, 1 + Math.floor(hMax / COIN_GAP));
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) put(c * COIN_GAP, r * COIN_GAP);
        }
        return (cols - 1) * COIN_GAP;
      }
      // A flat run along the ground: pure reward, no input, a breather between
      // two hazards. Reads as a straight line precisely because it is one.
      case 'line': {
        const n = cell.n || 6;
        for (let i = 0; i < n; i++) put(i * COIN_GAP, 0);
        return (n - 1) * COIN_GAP;
      }
      // A ramp climbing one coin per step, which telegraphs the jump before the
      // player reaches it. Clamped flat once the steps top out the envelope.
      case 'stair': {
        const n = cell.n || 5;
        for (let i = 0; i < n; i++) put(i * COIN_GAP, Math.min(i * COIN_GAP, hMax));
        return (n - 1) * COIN_GAP;
      }
      default: return 0;
    }
  }
}

// Two capsules must never share a screen. The timed drip is spaced out on its
// own (12-18s apart is thousands of world px), but !-box prizes come from a
// different clock entirely, and a prize landing on top of a drip capsule — or
// two boxes paying out in a row — is what puts a pair side by side. Every
// capsule source reports through notePower/canPlacePower so the rule holds
// across sources rather than within each one.
export const POWER_MIN_GAP = 480;   // one screen of world px

// Capsule/battery drip spawner (kept separate from patterns; verified reachable).
// Every drop the drip makes — capsule or cell — wears the same 8px box, so one
// width covers both wall tests below.
const DRIP_W = PICKUPS.battery.w;

export class DripSpawner {
  constructor(rng, benchLevels) {
    this.rng = rng;
    this.bench = benchLevels;
    this.capsuleTimer = this.rng.range(12, 18);
    this.batteryTimer = this.rng.range(20, 30);
    this.lastPowerX = -1e9;   // finite so it survives a snapshot round-trip
    this.lastPowerType = null;
  }

  // Would a capsule placed here be at least a screen clear of the last one?
  canPlacePower(x) { return x >= this.lastPowerX + POWER_MIN_GAP; }

  // Where a capsule actually came to rest (tossed prizes travel before they
  // settle), so the next one measures from the thing the player will see.
  notePower(x, type) {
    if (x <= this.lastPowerX) return;
    this.lastPowerX = x;
    this.lastPowerType = type;
  }

  // `stopX` is the same wall Spawner.fill respects — the finish marker's clear
  // approach. The drip used to ignore it, and it drops FURTHER out than the
  // pattern lane does, so the last capsule or cell of a stage could land inside
  // the finishing straight: it scrolled in, it was collectable, and then it was
  // deleted the moment the finish armed. Holding rather than skipping matches
  // the crowding rule below, and both tests are made before the type is rolled
  // so a hold cannot disturb the seeded order of prizes.
  update(dt, worldX, pickups, oneHit, batteryFull = false, stopX = Infinity) {
    this.capsuleTimer -= dt;
    this.batteryTimer -= dt;
    if (this.capsuleTimer <= 0) {
      const x = worldX + 480 + 60;
      // Too close to a prize that just dropped: hold the capsule rather than
      // skip it, and retry shortly — the world scrolls the gap open in about a
      // second, so the drip keeps its cadence instead of losing a beat.
      if (!this.canPlacePower(x) || x + DRIP_W > stopX) {
        this.capsuleTimer = 0.5;
      } else {
        this.capsuleTimer = this.rng.range(12, 18);
        const type = randomPowerPickup(this.rng, this.lastPowerType);
        pickups.push(makePickup(type, x, 34));
        this.notePower(x, type);
      }
    }
    if (!oneHit && this.batteryTimer <= 0) {
      const x = worldX + 480 + 100;
      if (x + DRIP_W > stopX) {
        this.batteryTimer = 0.5;
      } else {
        this.batteryTimer = this.rng.range(20, 30);
        if (!batteryFull) pickups.push(makePickup('battery', x, 10));
      }
    }
  }
}
