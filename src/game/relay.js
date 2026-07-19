// Three-hero relay: portals, tags, Perfect Tag, Relay Meter, Duo Moves.
import { DUO_MOVES } from '../data/progression.js';
import { TAG_LINES } from '../data/jokes.js';

export class Relay {
  constructor(team, bench, stats) {
    this.team = team;               // array of 3 hero ids
    this.bench = bench;             // bench upgrade levels
    this.stats = stats;
    this.currentIdx = 0;
    this.meter = 0;                 // 0..1
    this.combo = 0;
    this.bestCombo = 0;
    this.portalTimer = 10;          // first portal comes a bit sooner
    this.portalEvery = 18;
    this.lastTagLine = null;
    this.lastTagLineT = 0;
  }

  get current() { return this.team[this.currentIdx]; }

  nextHero() {
    return (this.currentIdx + 1) % this.team.length;
  }

  update(dt) {
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
