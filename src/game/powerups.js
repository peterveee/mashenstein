// Active power-ups: persistent Bench level sets the base; grabbing a duplicate
// in-run boosts +1 temporary level, capped at OVERCHARGED (bench max + 1).

export const POWER_DEFS = {
  shield:  { name: 'SHIELD', color: '#4890f0' },
  magnet:  { name: 'MAGNET', color: '#e04848' },
  star:    { name: 'STAR', color: '#f6d33c' },
  airjump: { name: 'AIR JUMP', color: '#72d8f0' },
  speed:   { name: 'SPEED BURST', color: '#f89048' },
  lowgrav: { name: 'LOW GRAVITY', color: '#b888f0' },
  // Rarer than the regular staples in the drip; also the breaker-box bonus prize.
  unpeel:  { name: 'UNPEELABLE', color: '#e8e8f0' },
  // Banks one automatic rewind until it fires or the level ends — the same
  // three seconds on every device. Mint green because
  // shield/airjump already own two blues and the tape FX itself is cold
  // blue-white; a third blue would read as one of them at 8px.
  // See docs/mobile-rewind-powerup.md.
  rewind:  { name: 'REWIND', color: '#7ce8a0' },
};

// Shared by drip spawns and !-crate prizes. The borrowed traits are exciting
// finds without crowding out the established staple capsules. Two staples
// share the 52% tail since Slow-Mo and Score Star were retired — the reduced variety is the
// point: nothing left in the common pool fights the player for control.
// `avoid` is the type of the previous capsule in the world: one reroll if the
// table lands on it again. Back-to-back duplicates read as the world repeating
// itself rather than as a find, and the second one only ever buys a temporary
// +1 level. A *single* reroll, so the odds stay close to the table (a repeat is
// still possible at p², which is all the overcharge path needs).
export function randomPowerPickup(rng, avoid, allowRewind = true, banned = null) {
  const opts = typeof allowRewind === 'object'
    ? allowRewind
    : { allowRewind, banned };
  const first = rollPowerPickup(rng, opts);
  if (avoid && first === avoid) return rollPowerPickup(rng, opts);
  return first;
}

// The section-curated twin of randomPowerPickup, for stage layouts that name
// their own capsule weights (see src/game/layout.js).
//
// It sits BESIDE the ladder below rather than replacing it, and the reason is
// the seeded stream: rollPowerPickup spends one float — plus, on the staple
// tail, an rng.pick — in a shape no weight table reproduces draw for draw.
// Rebuilding the default path on weights would silently walk the 'drip' stream
// of every stage nobody has edited, which is exactly what
// tests/layout-parity.js exists to forbid. So the ladder keeps the default and
// this runs only where an author has asked for something else.
export function weightedPowerPickup(rng, weights, avoid, opts = {}) {
  const first = rollWeightedPickup(rng, weights, opts);
  if (avoid && first === avoid) return rollWeightedPickup(rng, weights, opts);
  return first;
}

function rollWeightedPickup(rng, weights, { allowRewind = true, banned = null } = {}) {
  // A banned type is dropped from the table rather than substituted after the
  // fact: an author's weights describe the proportions they want among what
  // CAN drop here, and a beat stage's ban should redistribute across the rest
  // instead of quietly reassigning its share to one staple.
  const entries = Object.entries(weights).filter(([type, w]) => w > 0
    && !banned?.has(type)
    && !(type === 'capRewind' && !allowRewind));
  if (!entries.length) return 'capShield';
  let total = 0;
  for (const [, w] of entries) total += w;
  let roll = rng.float() * total;
  for (const [type, w] of entries) {
    roll -= w;
    if (roll < 0) return type;
  }
  return entries[entries.length - 1][0];
}

function rollPowerPickup(rng, { allowRewind = true, banned = null } = {}) {
  const roll = rng.float();
  // The banned-band substitute. Deterministic off the roll already in hand
  // (no additional RNG read), and it respects the ban itself: rhythm bans
  // capMagnet too — a magnet hoovers a coin fill in one lump — and a
  // substitution that half the time handed one out was the ban leaking.
  const staple = (r) => {
    const pickTwo = (Math.floor(r * 1000) & 1) ? 'capShield' : 'capMagnet';
    return banned?.has(pickTwo) ? 'capShield' : pickTwo;
  };
  // The bottom 8% used to be the relay charge, the rarest thing in the table.
  // It is gone, and its band goes to the staples rather than to unpeel: every
  // band below keeps the share it was tuned to, and a roll that once dealt a
  // free power now deals the commonest thing in the game. Off the roll in
  // hand, so the drip stream reads exactly as it did.
  if (roll < 0.08) return staple(roll);
  if (roll < 0.18) return banned?.has('capUnpeel') ? staple(roll) : 'capUnpeel';
  // Rewind takes a band of its OWN, out of the staple tail, rather than
  // splitting unpeel's, so unpeel keeps the 10% it was tuned to. 10% here
  // matches unpeel because rewind is the same KIND of find — a rare one you
  // are pleased to see, not a staple you expect.
  if (roll < 0.28) {
    if (allowRewind && !banned?.has('capRewind')) return 'capRewind';
    if (banned?.has('capRewind')) return staple(roll);
    return banned?.has('capUnpeel') ? staple(roll) : 'capUnpeel';
  }
  if (roll < 0.58) {
    const type = ['capAirJump', 'capSpeed', 'capLowGrav'][Math.floor((roll - 0.28) / 0.10)];
    if (banned?.has(type)) return staple(roll);
    return type;
  }
  // The staples pay for rewind's band and pocket the old relay band: 50%
  // between them, still comfortably the most common thing in the table and
  // still each far commoner than unpeel.
  // Same shape under a ban: the pick still consumes its one read, then a
  // banned staple falls back to the other.
  const picked = rng.pick(['capShield', 'capMagnet']);
  return banned?.has(picked) ? 'capShield' : picked;
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

  shieldCap() { return [0, 2, 3, 3][this.levelOf('shield')] || 2; }

  grab(id, opts = {}) {
    if (id === 'shield') {
      this.shieldStack = Math.min(this.shieldCap(), this.shieldStack + 1);
      return { overcharged: false };
    }
    const cur = this.active[id];
    let level = this.levelOf(id);
    let overcharged = false;
    if (cur) { level = Math.min(this.levelOf(id) + 1, 4); overcharged = level > this.levelOf(id); }
    // Rewind is a banked charge, not a timed effect. Keeping that distinction
    // in the state instead of faking a very large duration gives the HUD and
    // update loop one authoritative answer: it remains fully armed until the
    // run consumes it or the RunState goes away at the end of the level.
    if (id === 'rewind') {
      this.active[id] = { level, persistent: true };
      return { overcharged };
    }
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

  // What a speed burst does to the MUSIC, which is not what it does to the
  // world. The world goes 1.25-1.4x; the song only leans forward, because the
  // mix's delays and reverb pre-delays are timed against the bank's own bpm and
  // a warp that large slides every echo off the beat.
  //
  // The floor here is perception, not taste: under SFX and a moving hero, a
  // tempo change under ~10% is not heard as the music speeding up, it is heard
  // as nothing. A gear change you cannot detect is worse than none, so these sit
  // clear of that floor and accept a few ms of echo drift over a 10-second
  // burst — a delay repeat lands ~12% early, which reads as urgency, not error.
  musicTempoMultiplier() {
    const a = this.active.speed;
    return !a ? 1 : (a.level >= 2 ? 1.18 : 1.12);
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
      if (this.active[id].persistent) continue;
      this.active[id].t -= dt;
      if (this.active[id].t <= 0) delete this.active[id];
    }
  }
}
