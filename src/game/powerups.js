// Active power-ups: persistent Bench level sets the base; grabbing a duplicate
// in-run boosts +1 temporary level, capped at OVERCHARGED (bench max + 1).

export const POWER_DEFS = {
  shield:  { name: 'SHIELD', color: '#4890f0' },
  magnet:  { name: 'MAGNET', color: '#e04848' },
  star:    { name: 'STAR', color: '#f6d33c' },
  airjump: { name: 'AIR JUMP', color: '#72d8f0' },
  speed:   { name: 'SPEED BURST', color: '#f89048' },
  lowgrav: { name: 'LOW GRAVITY', color: '#b888f0' },
  // Rarer than the four staples in the drip; also the breaker-box bonus prize.
  unpeel:  { name: 'UNPEELABLE', color: '#e8e8f0' },
};

// Shared by drip spawns and !-crate prizes. The borrowed traits are exciting
// finds without crowding out the established staple capsules. Three staples
// share the 52% tail since Slow-Mo was retired — the reduced variety is the
// point: nothing left in the common pool fights the player for control.
export function randomPowerPickup(rng) {
  const roll = rng.float();
  // The relay charge is deliberately the rarest thing in the table. Capsules
  // drip every 12-18s, so 8% works out to roughly one charge every three or
  // four stages: rare enough to feel like a find rather than a rotation.
  if (roll < 0.08) return 'capRelay';
  if (roll < 0.18) return 'capUnpeel';
  if (roll < 0.48) return ['capAirJump', 'capSpeed', 'capLowGrav'][Math.floor((roll - 0.18) / 0.10)];
  return rng.pick(['capShield', 'capMagnet', 'capStar']);
}

export class Powerups {
  constructor(benchLevels, modIds = []) {
    this.bench = benchLevels;
    this.mods = modIds;
    this.shieldStack = 0;
    this.active = {};          // id -> {t, level}
  }

  levelOf(id) { return Math.max(1, this.bench[id] || 1); }
  durMult() { return this.mods.includes('storebrand') ? 0.8 : 1; }

  shieldCap() { return [2, 2, 3, 3][this.levelOf('shield')] || 2; }

  grab(id, opts = {}) {
    if (id === 'shield') {
      this.shieldStack = Math.min(this.shieldCap(), this.shieldStack + 1);
      return { overcharged: false };
    }
    const cur = this.active[id];
    let level = this.levelOf(id);
    let overcharged = false;
    if (cur) { level = Math.min(this.levelOf(id) + 1, 4); overcharged = level > this.levelOf(id); }
    let t = this.durationFor(id, level);
    if (opts.minDuration) t = Math.max(t, opts.minDuration);
    // t0 is what the HUD ring drains from: durations vary by power and level,
    // so remaining time alone cannot say how much of the effect is left.
    this.active[id] = { t, t0: t, level };
    return { overcharged };
  }

  durationFor(id, level) {
    const base = {
      magnet: [0, 8, 12, 16, 20][level] || 8,
      star: [0, 10, 10, 10, 12][level] || 10,
      airjump: [0, 14, 20][level] || 14,
      speed: [0, 10, 13][level] || 10,
      lowgrav: [0, 12, 16][level] || 12,
      unpeel: [0, 12, 13, 14, 15][level] || 12,
    }[id] || 8;
    return base * this.durMult();
  }

  magnetRadius() {
    const a = this.active.magnet;
    if (!a) return 0;
    return [0, 60, 80, 100, 130][a.level] || 60;
  }

  scoreMult() {
    const a = this.active.star;
    if (!a) return 1;
    return [1, 2, 2.5, 3, 3.5][a.level] || 2;
  }

  bonusJumps() { return this.active.airjump ? 1 : 0; }

  // The run already ramps to 1.6x on its own, so a timid boost here reads as
  // nothing at all. These clear that ramp by enough to be felt on grab.
  speedMultiplier() {
    const a = this.active.speed;
    return !a ? 1 : (a.level >= 2 ? 1.4 : 1.25);
  }

  gravityMultiplier() {
    const a = this.active.lowgrav;
    return !a ? 1 : (a.level >= 2 ? 0.5 : 0.65);
  }

  isInvincible() { return !!this.active.unpeel; }

  absorbHit() {
    if (this.shieldStack > 0) {
      this.shieldStack--;
      const shockwave = this.levelOf('shield') >= 3;
      return { absorbed: true, shockwave };
    }
    return { absorbed: false, shockwave: false };
  }

  update(dt) {
    for (const id of Object.keys(this.active)) {
      this.active[id].t -= dt;
      if (this.active[id].t <= 0) delete this.active[id];
    }
  }
}
