// Seeded pattern spawner with COMPUTED fairness. DOM-free so the headless
// fairness sim can import it directly.
import { OBSTACLES, PICKUPS, makeObstacle, makePickup } from './entities.js';
import { PUNT, HEAVY_PUNT } from './punt.js';
import { GRAVITY, BASE_JUMP_V } from './player.js';
import { randomPowerPickup } from './powerups.js';

// How much extra room a puntable prop buys the obstacle behind it, in seconds
// of travel. A punt hangs for roughly a second (see PUNT in punt.js), and this
// covers most of it, so the juggle jump is over before the next thing needs
// jumping. Seconds rather than pixels because the whole gap budget is in
// seconds and the run keeps accelerating.
const PUNT_CLEARANCE_T = 0.75;
// Read against the CONE, which is what the number above was measured on, and
// scaled to whatever the prop in hand actually hangs for. A barrel is down a
// fifth sooner (HEAVY_PUNT is a lower arc), so it buys a fifth less room — and
// that matters because barrels are in the base pattern set where cones are in
// one cabinet: a flat cone-sized clearance would have quietly thinned the
// tier-2 lane of every stage in the game to pay for an arc that is not in the
// air that long.
//
// The barrel's clearance is bought for a different reason than the cone's, and
// it is the readability half of the argument above rather than the juggle. A
// punted barrel does not come back to be jumped for — it goes up and leaves —
// but on the way out it crosses the lane ahead at head height for the best part
// of a second, through exactly the strip where the next obstacle appears. Room
// enough for it to be gone is room enough to read what comes next.
const hangOf = (tune) => (2 * tune.launchVy) / tune.gravity;
const puntClearanceT = (def) => (def && def.punt
  ? PUNT_CLEARANCE_T * (hangOf(def.punt === 'heavy' ? HEAVY_PUNT : PUNT) / hangOf(PUNT))
  : 0);
export const REACT_FLOOR = 0.25;      // seconds of reaction after previous action
export const REACT_FLOOR_MAX = 0.2;   // at highest tiers / UNPLUGGED

// Coin lattice: one spacing used both across and up, so a block reads as a
// square grid rather than a stretched one. The floor is the resting altitude of
// a coin sitting on the ground.
export const COIN_GAP = 14;
export const COIN_FLOOR = 8;

// Worst-case airtime among heroes: heavy Grumpos (gravity ×1.25).
export function worstAirtime() { return (2 * BASE_JUMP_V * 0.9) / (GRAVITY * 1.25); }

/**
 * Worst-case jump APEX, on the same deliberately pessimistic footing as
 * `worstAirtime`: the lowest jumpMult in the cast (B-33P's 0.9) crossed with
 * the heaviest gravity (Grumpos' ×1.25). No single hero is both, which is the
 * point — a height cleared by this imaginary worst hero is cleared by all of
 * them. Comes out at ~37px against a real cast minimum of 45.5 (Grumpos).
 *
 * What it is FOR: anything the player has to land on top of. A slab the one
 * heavy hero cannot reach is not a difficulty spike, it is a bug that only
 * shows up on one eighth of the relay bag.
 */
export function worstJumpApex() {
  const v = BASE_JUMP_V * 0.9;
  return (v * v) / (2 * GRAVITY * 1.25);
}

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
    // Whether the last action cell was something a slide can punt. Kept apart
    // from `lastActionKind` because it is not an action CLASS — a cone is
    // still jumped like anything else. What it changes is the space AFTER.
    this.lastWasPunt = 0;
    // Patterns marked `once` that this run has already laid down, held by
    // OBJECT rather than by index. Index was the first attempt and it is fragile
    // in exactly the case that matters: The Surge's bank is the union of every
    // other cabinet's patterns, so a shared pattern object appears in it twice,
    // and two indices for one pattern is two chances to place a "once" hazard.
    // Identity cannot be fooled that way.
    this.usedOnce = new Set();
  }

  // Minimum world-px between an action obstacle and the next one, at speed px/s.
  //
  // `prevPunt` buys room after a puntable prop, and it is about READABILITY
  // rather than fairness. A punted cone hangs for about a second and the
  // player jumps to juggle it; with the ordinary gap the next obstacle arrived
  // inside that hang, so the juggle jump was the same jump he had to make
  // anyway. The trick landed as an accident rather than a decision. Pushing
  // the next obstacle past the cone's flight makes going up for it a choice
  // that costs something.
  //
  // Added on top of the fairness floor, never instead of it: this only ever
  // makes gaps larger, so the sim's own assertion is untouched.
  fairGap(speed, prevKind, nextKind, prevPunt = 0) {
    const air = worstAirtime();
    let t = this.react;
    if (prevKind === 'jump') t += air;               // must land first
    if (prevKind === 'jump' && nextKind === 'duck') t += 0.15; // can't duck mid-air
    // Seconds of hang the previous prop bought, from puntClearanceT — a number
    // now rather than a flag, since two puntable props with different arcs owe
    // different amounts of room. `true` from an older caller still reads as a
    // second, which is the cone's arc to within a rounding error.
    if (prevPunt) t += (prevPunt === true ? PUNT_CLEARANCE_T : prevPunt);
    return speed * t + this.iceSlide;
  }

  // ONCE-PER-RUN PATTERNS. `once: true` on a pattern means the lane may show it
  // at most one time in a stage, however long the stage runs.
  //
  // It exists for the banana peel, and the reason it is a pattern flag rather
  // than anything peel-specific is that the constraint is about RARITY, not
  // about bananas: a hazard whose whole joke is that you did not expect it stops
  // being funny the third time, and any future prop with that property wants the
  // same treatment. Nothing else in the cabinets uses it today.
  //
  // Filtered out of the pool rather than rolled and rejected, so the seeded
  // stream is not disturbed by a pattern that was never going to be placed —
  // and marked used only once fill() COMMITS it, since a pattern that runs into
  // the finish wall is abandoned whole and has not been shown to anybody.
  pickPattern() {
    const pats = this.cabinet.patterns.filter((p) => p.tier <= this.tierMax
      && !(p.once && this.usedOnce.has(p)));
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
      const wasPunt = this.lastWasPunt;
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
          const minX = this.lastActionX
            + this.fairGap(speed, this.lastActionKind, def.action, this.lastWasPunt);
          if (x < minX) x = minX;
          this.lastActionX = x + cellW;
          this.lastActionKind = def.action;
          this.lastWasPunt = puntClearanceT(def);
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
        this.lastWasPunt = wasPunt;
        this.nextX = stopX;      // the lane is closed from here to the marker
        return;
      }
      for (const ob of obs) obstacles.push(ob);
      for (const p of picks) pickups.push(p);
      // Committed, so a `once` pattern is now spent for this run. Above the
      // stopX bail-out on purpose — see pickPattern.
      if (pat.once) this.usedOnce.add(pat);
      // Gap to the next pattern: random but never below the fairness floor.
      // The next pattern may open with a duck obstacle, so budget for the worst case.
      const roll = this.rng.range(90, 220);
      const fair = this.fairGap(speed, this.lastActionKind, 'duck', this.lastWasPunt);
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
