// Active power-ups: persistent Bench level sets the base; grabbing a duplicate
// in-run boosts +1 temporary level, capped at OVERCHARGED (bench max + 1).

export const POWER_DEFS = {
  shield:  { name: 'SHIELD', color: '#4890f0' },
  magnet:  { name: 'MAGNET', color: '#e04848' },
  star:    { name: 'STAR', color: '#f6d33c' },
  slowmo:  { name: 'SLOW-MO', color: '#48c8c8' },
};

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

  grab(id) {
    if (id === 'shield') {
      this.shieldStack = Math.min(this.shieldCap(), this.shieldStack + 1);
      return { overcharged: false };
    }
    const cur = this.active[id];
    let level = this.levelOf(id);
    let overcharged = false;
    if (cur) { level = Math.min(this.levelOf(id) + 1, 4); overcharged = level > this.levelOf(id); }
    this.active[id] = { t: this.durationFor(id, level), level };
    return { overcharged };
  }

  durationFor(id, level) {
    const base = {
      magnet: [0, 8, 12, 16, 20][level] || 8,
      star: [0, 10, 10, 10, 12][level] || 10,
      slowmo: [0, 6, 8, 10, 12][level] || 6,
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

  timescale() {
    const a = this.active.slowmo;
    if (!a) return 1;
    return a.level >= 3 ? 0.55 : 0.65;
  }

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
