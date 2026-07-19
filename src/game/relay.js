// Relay, simplified: the full eight-hero cast in a shuffled bag. Portals
// switch heroes automatically; every third switch fires an automatic Relay
// Blast. The whole rule fits in two sentences, which is the point.
import { HEROES } from '../data/heroes.js';
import { TAG_LINES } from '../data/jokes.js';

export class Relay {
  constructor(rng, stats) {
    this.rng = rng;              // seeded stream: runs replay identically
    this.stats = stats;
    this.bag = [];
    this.current = this.drawHero();
    this.next = this.drawHero(); // every portal previews this hero
    this.pips = 0;               // 0..2 shown; the 3rd switch blasts and resets
    this.portalTimer = 10;       // first portal comes a bit sooner
    this.portalEvery = 18;
    this.lastTagLine = null;
    this.lastTagLineT = 0;
  }

  refill() {
    this.bag = HEROES.map((h) => h.id);
    for (let i = this.bag.length - 1; i > 0; i--) {
      const j = this.rng ? this.rng.int(0, i) : Math.floor(Math.random() * (i + 1));
      [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
    }
    // no immediate repeat across the reshuffle boundary
    if (this.current && this.bag[this.bag.length - 1] === this.current) {
      [this.bag[0], this.bag[this.bag.length - 1]] = [this.bag[this.bag.length - 1], this.bag[0]];
    }
  }

  drawHero() {
    if (!this.bag.length) this.refill();
    return this.bag.pop();
  }

  update(dt) {
    this.portalTimer -= dt;
    if (this.lastTagLineT > 0) this.lastTagLineT -= dt;
  }

  portalDue() { return this.portalTimer <= 0; }
  portalSpawned() { this.portalTimer = this.portalEvery; }

  // Run through a portal: become the previewed hero. Returns {from, to, blast}.
  switchHero() {
    const from = this.current;
    this.current = this.next;
    this.next = this.drawHero();
    this.pips++;
    this.stats.tags++; // legacy stat, kept for old saves, never displayed
    let blast = false;
    if (this.pips >= 3) { this.pips = 0; blast = true; }
    this.lastTagLine = TAG_LINES[this.current];
    this.lastTagLineT = 1.6;
    return { from, to: this.current, blast };
  }
}
