// Pure fixed-step flight simulation: no campaign writes, no drawing.
export const STEP = 1 / 120;
// The passage's travel once the chase has settled, in px/s at the rails'
// depth. The handoff arrives at the run's own road speed and eases down to it.
export const FLIGHT_CRUISE = 130;
const CRUISE_EASE = 0.9;
// Where a pellet leaves the tub: the tip of the gun on its nose (scene.js).
export const PELLET_MUZZLE = 37;

// Each act's ordinary fight. `lanes` are Eggshell's altitude stops (fractions of
// the band) and `hold` how long each lasts; `attack` the gap between telegraphs in
// the first and second half. `first` and `second` are the attacks each half takes
// in turn: a shot at his locked height ('single'), a second one behind it at the
// same height ('pair', Act I's halfway weapon), a slow three-shot fan with a gap
// either side of the middle one ('fan', Act II's), or a column of sparks the
// height of the band with one gap in it near him ('column', Act III's coils).
// Shots take `travel` seconds to reach the hero's column whatever the layout,
// so the warning is the same everywhere. Act III ends in BACKUP POWER (`final`).
export const FLIGHT_PATTERNS = {
  1: { lanes: [0.26, 0.68, 0.42, 0.78], hold: 3, attack: [3.1, 2.7], first: ['single'], second: ['pair'], travel: 1.35 },
  2: { lanes: [0.5, 0.2, 0.74, 0.36, 0.84, 0.58], hold: 2.4, attack: [2.9, 3.5], first: ['single'], second: ['fan'],
    travel: 1.35, fanTravel: 1.9, fanGap: 72 },
  3: { lanes: [0.3, 0.72, 0.46, 0.82, 0.22, 0.6], hold: 2.6, attack: [2.6, 3.3], first: ['single', 'pair'], second: ['fan', 'column'],
    travel: 1.35, fanTravel: 1.9, fanGap: 72, columnTravel: 2.2, columnGap: 96, final: true },
};
// BACKUP POWER: its own bar; the armour opens to vent after each attack and only
// the exposed core takes damage. Its cannon is level with the core: a charged
// beam warns the band it will fill (`charge` s, the machine holding still) and
// fills it (`beam` s), then the armour opens on the same line — so the place the
// beam made dangerous is the place to be next. A power surge is a slow column
// with a wide gap near him. `fallT` is the false defeat and the assembly.
export const BACKUP = { hp: 40, coreDamage: 1, charge: 1.25, beam: 0.5, band: 24, vent: 2.4,
  surgeTravel: 2.5, surgeGap: 110, between: 0.8, fallT: 5.4, speed: 0.45,
  lanes: [0.5, 0.74, 0.6, 0.84, 0.54, 0.68], hold: 3.2 };
// Hit half-heights (with the tub's): a shot and a spark.
const SHOT_HY = 19, SPARK_HY = 27, SPARK_STEP = 44;

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const PORTRAIT_BAND = 430;
// `o.hudTop` is where the HUD starts (below the portrait status-bar wash). In
// portrait the band starts 74 under it (the two-row plate) and stops above the
// discs; in landscape the HUD is one slim row and the discs are in the side
// margins, so the band takes nearly the whole height (Peter, 1 Nov: "way too
// much HUD in landscape... very little room to move").
export function flightLayout(width, height, safe = {}, o = {}) {
  const portrait = height > width;
  const bottom = Math.min(height, safe.bottom ?? height) - (portrait ? 130 : 16);
  // Portrait's band has a roof (Peter, 1 Nov: "too easy to avoid"): no taller
  // than PORTRAIT_BAND, so a shot can't be outrun simply by having more sky.
  const hudBottom = Math.max(0, Number.isFinite(o.hudTop) ? o.hudTop : (safe.top || 0)) + (portrait ? 74 : 30);
  const top = portrait ? Math.max(hudBottom, bottom - PORTRAIT_BAND) : hudBottom;
  return { width, height, top, bottom: Math.max(top + 60, bottom),
    px: width * (height > width ? .14 : .22),
    bx: width * (height > width ? .86 : .79),
    scale: height > width ? 1.4 : 1, radius: height > width ? 55 : 30,
    // BACKUP POWER is drawn (and hit) smaller in landscape, where the band is
    // short, so the whole machine stays under the HUD.
    mscale: height > width ? 1.4 : 0.8 };
}
export class FlightModel {
  constructor(layout, seed = 7, o = {}) {
    this.layout = layout; this.seed = seed >>> 0; this.checkpoint = 0;
    // UNPLUGGED is one hit here too, as it is in the run.
    this.maxHull = Math.max(1, Math.round(o.hull || 4));
    this.pattern = FLIGHT_PATTERNS[o.act] || FLIGHT_PATTERNS[1];
    this.scroll = Number.isFinite(o.scroll) ? o.scroll : 0;
    this.scrollV = Number.isFinite(o.scrollV) ? o.scrollV : FLIGHT_CRUISE;
    this.accumulator = 0; this.restore();
  }
  restore() {
    const l = this.layout;
    this.y = (l.top + l.bottom) / 2; this.vy = 0; this.by = this.y;
    this.hp = this.checkpoint ? 50 : 100; this.hull = this.maxHull;
    this.phase = this.checkpoint === 2 ? 'final' : this.checkpoint ? 'second' : 'first';
    this.t = 0; this.grace = 2; this.lead = 2; this.fire = 0;
    this.attack = 2; this.attackN = 0; this.warning = null; this.burst = null;
    this.shots = []; this.pellets = []; this.accumulator = 0;
    this.hitFlash = 0; this.midpointTime = 0; this.fallTime = 0;
    this.finalHp = BACKUP.hp; this.fin = { mode: 'idle', t: 0, n: 0 }; this.vent = 0;
    this.beam = null; this.deflect = 0;
    if (this.phase === 'final') { this.hp = 0; this.lead = 1.6; this.grace = 1.6; this.fin.t = -0.4; }
  }
  resize(layout) {
    const old = this.layout;
    const remap = y => layout.top + clamp((y - old.top) / (old.bottom - old.top), 0, 1) * (layout.bottom - layout.top);
    this.y = remap(this.y); this.by = remap(this.by); this.layout = layout;
    this.y = clamp(this.y, layout.top + layout.radius, layout.bottom - layout.radius);
    this.by = clamp(this.by, layout.top + layout.radius, layout.bottom - layout.radius);
    if (Number.isFinite(this.popY)) this.popY = clamp(this.popY, layout.top, layout.bottom);
    this.vy = 0; this.shots = []; this.pellets = []; this.warning = null;
    this.burst = null; this.attack = 2; this.grace = 2; this.lead = 2;
    this.beam = null; if (this.fin.mode !== 'vent') this.fin = { mode: 'idle', t: 0, n: this.fin.n };
  }
  clearHazards() { this.shots = []; this.pellets = []; this.warning = null; this.burst = null; this.beam = null; }
  damageBoss(amount) {
    if (!['first', 'second'].includes(this.phase)) return;
    this.hp = Math.max(0, this.hp - amount); this.hitFlash = .08;
    if (this.phase === 'first' && this.hp <= 50) {
      this.hp = 50; this.phase = 'midpoint'; this.midpointTime = 0;
      this.clearHazards();
    } else if (this.hp === 0) {
      // Act III's ordinary form only looks beaten: the balloon goes, and BACKUP POWER comes.
      this.phase = this.pattern.final ? 'fall' : 'won'; this.fallTime = 0; this.popY = this.by;
      if (this.phase === 'won') this.hitFlash = 0;
      this.clearHazards();
    }
  }
  // The exposed core: only while the armour is open.
  damageCore(amount) {
    if (this.phase !== 'final') return;
    this.finalHp = Math.max(0, this.finalHp - amount); this.hitFlash = .08;
    if (this.finalHp === 0) { this.phase = 'won'; this.hitFlash = 0; this.deflect = 0; this.clearHazards(); }
  }
  // The passage keeps moving under every phase that is still flying, and the
  // handoff's arrival speed settles to the cruise on its own clock.
  advanceScroll(dt) {
    this.scroll += dt * this.scrollV;
    this.scrollV += (FLIGHT_CRUISE - this.scrollV) * (1 - Math.exp(-dt / CRUISE_EASE));
  }
  update(dt, up = false, down = false) {
    this.accumulator += Math.min(.1, Math.max(0, dt));
    while (this.accumulator >= STEP) { this.tick(STEP, up, down); this.accumulator -= STEP; }
  }
  // A column's gap in px: its authored size, but never more than 45% of the
  // column (landscape's band is short) nor less than a spark's reach either
  // side of the tub plus some air.
  columnGapPx(gap) {
    const l = this.layout, s = l.scale;
    const span = (l.bottom - l.radius * 0.4) - (l.top + l.radius * 0.4);
    return Math.max(2 * SPARK_HY * s + 14 * s, Math.min(gap * s, 0.45 * span));
  }
  // The beam's reach: its band plus the tub, but never so much that both ends of
  // a short band (landscape with a home indicator) are inside it.
  beamHalf() {
    const l = this.layout;
    return Math.min((BACKUP.band + SHOT_HY) * l.scale, (l.bottom - l.top - 2 * l.radius) / 2 - 4);
  }
  bandLane(lane) {
    const l = this.layout;
    return l.top + l.radius + lane * (l.bottom - l.top - 2 * l.radius);
  }
  tick(dt, up, down) {
    this.hitFlash = Math.max(0, this.hitFlash - dt); this.deflect = Math.max(0, this.deflect - dt);
    if (this.phase === 'dead' || this.phase === 'won') return;
    this.advanceScroll(dt); this.t += dt;
    if (this.phase === 'midpoint') {
      this.midpointTime += dt;
      if (this.midpointTime >= 3) {
        this.checkpoint = 1; this.phase = 'second'; this.t = 0;
        this.attack = 2; this.lead = 1.5; this.grace = 1.5; this.fire = 0;
      }
      return;
    }
    if (this.phase === 'fall') {
      // The pop, the drop, the beat of quiet, and the machine rising into place:
      // nothing is flying and nothing can be hit, and he comes back level with
      // the middle of the band.
      this.fallTime += dt;
      this.by += ((this.layout.top + this.layout.bottom) / 2 - this.by) * Math.min(1, dt * 2);
      if (this.fallTime >= BACKUP.fallT) {
        this.checkpoint = 2; this.phase = 'final'; this.t = 0; this.hp = 0;
        this.finalHp = BACKUP.hp; this.fin = { mode: 'idle', t: -0.4, n: 0 };
        this.lead = 1.6; this.grace = 1.6; this.fire = 0;
      }
      return;
    }
    const l = this.layout;
    this.grace = Math.max(0, this.grace - dt);
    const direction = Number(down) - Number(up);
    const target = direction * (l.height > l.width ? 240 : 145);
    this.vy += clamp(target - this.vy, -850 * dt, 850 * dt);
    this.y = clamp(this.y + this.vy * dt, l.top + l.radius, l.bottom - l.radius);
    if (this.y === l.top + l.radius || this.y === l.bottom - l.radius) this.vy = 0;
    // Smooth authored travel with long settles; does not read the player's height.
    const pat = this.pattern;
    const lanes = this.phase === 'final' ? BACKUP.lanes : pat.lanes, hold = this.phase === 'final' ? BACKUP.hold : pat.hold;
    const period = lanes.length * hold;
    const lane = lanes[Math.floor((((this.t + (this.seed % 3)) % period) + period) % period / hold) % lanes.length];
    const bossSpeed = (l.height > l.width ? 75 : 36) * (this.phase === 'final' ? BACKUP.speed : 1);
    // BACKUP POWER holds still while it charges, fires and vents: a core that
    // drifts out of line while it is open would be a trick, not a window.
    const holding = this.phase === 'final' && this.fin.mode !== 'idle';
    if (!holding) this.by += clamp(this.bandLane(lane) - this.by, -bossSpeed * dt, bossSpeed * dt);
    if (this.lead > 0) { this.lead -= dt; return; }
    this.fire -= dt;
    if (this.fire <= 0) {
      this.fire += .16; this.pellets.push({ x: l.px + PELLET_MUZZLE * l.scale, y: this.y + 7 * l.scale }); this.fired = (this.fired || 0) + 1;
    }
    const shoot = (targetY, sourceY, travel = pat.travel, kind = 'shot') => {
      // Same arrival time across layouts. Aim is locked before release.
      this.shots.push({ x: l.bx - 25 * l.scale, y: sourceY, kind,
        vx: (l.px - (l.bx - 25 * l.scale)) / travel, vy: (targetY - sourceY) / travel });
    };
    // A column the height of the band with one gap: sparks travel level.
    const column = (gapY, gap, travel, kind) => {
      const lo = l.top + l.radius * 0.4, hi = l.bottom - l.radius * 0.4;
      const step = SPARK_STEP * l.scale, half = this.columnGapPx(gap) / 2;
      for (let y = lo; y <= hi + 0.01; y += step) {
        if (Math.abs(y - gapY) < half) continue;
        this.shots.push({ x: l.bx - 25 * l.scale, y, kind, vx: (l.px - (l.bx - 25 * l.scale)) / travel, vy: 0 });
      }
    };
    // Where a column's gap goes: off his locked height by a little, alternately
    // above and below, inside the band — so he has to move, and always can.
    const gapNear = (y, n, gap) => {
      const half = this.columnGapPx(gap) / 2;
      const want = y + (n % 2 ? 1 : -1) * 0.75 * half;
      return clamp(want, l.top + l.radius * 0.4 + half, l.bottom - l.radius * 0.4 - half);
    };
    if (this.phase === 'final') this.tickFinal(dt, column, gapNear);
    else {
      this.attack -= dt;
      if (!this.warning && this.attack <= 0) {
        const seq = this.phase === 'second' ? pat.second : pat.first;
        const kind = seq[this.attackN % seq.length];
        this.attackN++;
        const w = { y: this.y, source: this.by + 7 * l.scale, time: .7, kind, n: this.attackN, fan: 0, gapY: null };
      this.warned = (this.warned || 0) + 1;
        if (kind === 'fan') w.fan = pat.fanGap * l.scale;
        if (kind === 'column') w.gapY = gapNear(this.y, this.attackN, pat.columnGap);
        this.warning = w;
        this.attack = pat.attack[this.phase === 'second' ? 1 : 0];
      }
      if (this.warning) {
        this.warning.time -= dt;
        if (this.warning.time <= 0) {
          const w = this.warning;
          if (w.kind === 'fan') {
            // Three, slower, through where he was and a gap's width either side:
            // the safe places are between them, never off the top or bottom.
            for (const k of [-1, 0, 1]) shoot(w.y + k * w.fan, w.source, pat.fanTravel);
          } else if (w.kind === 'column') {
            column(w.gapY, pat.columnGap, pat.columnTravel, 'spark');
          } else {
            shoot(w.y, w.source);
            if (w.kind === 'pair') this.burst = { y: w.y, source: w.source, time: .35 };
          }
          this.warning = null;
        }
      }
      if (this.burst) {
        this.burst.time -= dt;
        if (this.burst.time <= 0) { shoot(this.burst.y, this.burst.source); this.burst = null; }
      }
    }
    for (const p of this.pellets) {
      const prev = p.x; p.x += 350 * dt;
      if (this.phase === 'final') {
        // The armour turns pellets away; an open vent lets them into the core.
        const ms = l.mscale || l.scale;
        if (prev <= l.bx + 22 * ms && p.x >= l.bx - 30 * ms && Math.abs(p.y - this.by) < 48 * ms) {
          p.x = l.width + 100;
          if (this.vent > 0.6 && Math.abs(p.y - this.by) < 17 * ms) {
            this.damageCore(BACKUP.coreDamage);
            if (this.phase === 'won') return;
          } else this.deflect = 0.12;
        }
        continue;
      }
      // The balloon's envelope is the target in Act III: bigger than the tub.
      const hx = this.pattern.final ? 30 : 22, hy = this.pattern.final ? 28 : 15;
      if (prev <= l.bx + hx * l.scale && p.x >= l.bx - hx * l.scale && Math.abs(p.y - (this.by + 7 * l.scale)) < hy * l.scale) {
        p.x = l.width + 100; this.damageBoss(2); this.pinged = (this.pinged || 0) + 1;
        if (this.phase !== 'first' && this.phase !== 'second') return;
      }
    }
    this.pellets = this.pellets.filter(p => p.x < l.width + 10);
    const hurt = () => {
      this.hull--; this.grace = 1.2; this.hurts = (this.hurts || 0) + 1;
      if (this.hull === 0) { this.phase = 'dead'; this.clearHazards(); return true; }
      return false;
    };
    for (const p of this.shots) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      const hy = (p.kind === 'shot' ? SHOT_HY : SPARK_HY) * l.scale;
      if (this.grace === 0 && Math.abs(p.x - l.px) < 20 * l.scale && Math.abs(p.y - this.y) < hy) {
        p.x = -100;
        if (hurt()) return;
      }
    }
    if (this.beam && this.beam.on && this.grace === 0 && Math.abs(this.y - this.beam.y) < this.beamHalf()) {
      if (hurt()) return;
    }
    this.shots = this.shots.filter(p => p.x > -20 && p.y > -20 && p.y < l.height + 20);
  }
  // BACKUP POWER's cycle: an attack, then the vent. The beam's band is locked
  // where he was when it started charging; the surge is a slow column.
  tickFinal(dt, column, gapNear) {
    const f = this.fin;
    f.t += dt;
    const open = f.mode === 'vent' ? 1 : 0;
    this.vent += (open - this.vent) * Math.min(1, dt * 9);
    if (f.mode === 'idle' && f.t >= BACKUP.between) {
      f.n++;
      this.warned = (this.warned || 0) + 1;
      if (f.n % 2) { f.mode = 'charge'; f.t = 0; this.beam = { y: this.by, on: false, t: 0 }; }
      else { f.mode = 'surge'; f.t = 0; f.gapY = gapNear(this.y, f.n, BACKUP.surgeGap); }
    } else if (f.mode === 'charge' && f.t >= BACKUP.charge) {
      f.mode = 'beam'; f.t = 0; this.beam.on = true;
    } else if (f.mode === 'beam' && f.t >= BACKUP.beam) {
      f.mode = 'vent'; f.t = 0; this.beam = null;
    } else if (f.mode === 'surge' && f.t >= 0.7 && !f.fired) {
      f.fired = true; column(f.gapY, BACKUP.surgeGap, BACKUP.surgeTravel, 'surge');
    } else if (f.mode === 'surge' && f.t >= 0.7 + BACKUP.surgeTravel * 0.6) {
      f.mode = 'vent'; f.t = 0; f.fired = false;
    } else if (f.mode === 'vent' && f.t >= BACKUP.vent) {
      f.mode = 'idle'; f.t = 0;
    }
    if (this.beam) this.beam.t += dt;
  }
}
