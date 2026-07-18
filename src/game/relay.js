// Three-hero relay: portals, tags, Perfect Tag, Relay Meter, Exhaustion, Duo Moves.
import { DUO_MOVES } from '../data/progression.js';
import { TAG_LINES } from '../data/jokes.js';

export class Relay {
  constructor(team, bench, stats) {
    this.team = team;               // array of 3 hero ids
    this.bench = bench;             // bench upgrade levels
    this.stats = stats;
    this.currentIdx = 0;
    this.exhaust = {};              // heroId -> seconds remaining
    for (const id of team) this.exhaust[id] = 0;
    this.meter = 0;                 // 0..1
    this.combo = 0;
    this.bestCombo = 0;
    this.portalTimer = 24;          // first portal comes a bit sooner
    this.portalEvery = 40;
    this.lastTagLine = null;
    this.lastTagLineT = 0;
  }

  get current() { return this.team[this.currentIdx]; }

  nextHero() {
    // Next non-exhausted in rotation; if all exhausted, least exhausted.
    for (let i = 1; i <= this.team.length; i++) {
      const idx = (this.currentIdx + i) % this.team.length;
      if (idx !== this.currentIdx && this.exhaust[this.team[idx]] <= 0) return idx;
    }
    let best = null, bestT = Infinity;
    for (let i = 0; i < this.team.length; i++) {
      if (i === this.currentIdx) continue;
      const t = this.exhaust[this.team[i]];
      if (t < bestT) { bestT = t; best = i; }
    }
    return best ?? this.currentIdx;
  }

  update(dt) {
    const rec = 1 + 0.25 * (this.bench.exhaustRec || 0);
    for (const id of this.team) if (this.exhaust[id] > 0) this.exhaust[id] -= dt * rec;
    this.portalTimer -= dt;
    if (this.lastTagLineT > 0) this.lastTagLineT -= dt;
  }

  portalDue() { return this.portalTimer <= 0 && this.team.length > 1; }
  portalSpawned() { this.portalTimer = this.portalEvery; }

  perfectWindow() { return 0.35 * (1 + 0.5 * (this.bench.tagWindow || 0)); }

  // Returns {toHero, perfect, duo} — duo is a DUO_MOVES entry if triggered.
  tag(perfect, masteryLevels = {}) {
    const from = this.current;
    const nextIdx = this.nextHero();
    const to = this.team[nextIdx];
    if (to === from) return null;
    this.exhaust[from] = 12 * (this.mods && this.mods.includes('cape') ? 1.2 : 1);
    this.currentIdx = nextIdx;
    this.combo++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.stats.tags++;
    if (perfect) this.stats.perfectTags++;
    const rate = (perfect ? 0.34 : 0.2) * (1 + 0.25 * (this.bench.meterRate || 0));
    let duo = null;
    if (this.meter >= 1) {
      duo = DUO_MOVES.find((d) => d.pair.includes(from) && d.pair.includes(to)) || null;
      if (duo && (masteryLevels[from] || 0) < 1 && (masteryLevels[to] || 0) < 1) {
        // duo pairs unlock once either partner has any mastery; early-game they still work at L0? No:
        duo = null;
      }
      if (duo) this.meter = 0;
    }
    if (!duo) this.meter = Math.min(1, this.meter + rate);
    this.lastTagLine = TAG_LINES[to];
    this.lastTagLineT = 1.6;
    return { from, to, perfect, duo };
  }

  breakCombo() { this.combo = 0; }

  teamMoveReady() { return this.meter >= 1; }
  spendMeter() { this.meter = 0; }
}
