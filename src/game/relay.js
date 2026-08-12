// Relay, simplified: the full eight-hero cast in a shuffled bag. Portals
// switch heroes automatically, and a hero drawn out of the bag does not go
// back in — a level is four different faces, never Lorenzo→Kiko→Grumpos→Kiko.
// The whole rule fits in one sentence, which is the point.
//
// Portals are SCHEDULED per stage rather than ticking on a fixed clock. A flat
// cadence meant a 60s stage ran through four heroes and a 120s stage through
// seven — nobody got long enough with anyone. Now a stage hands off a set
// number of times regardless of length: see portalSchedule below.
import { HEROES } from '../data/heroes.js';
import { TAG_LINES } from '../data/jokes.js';

// Runs finish ahead of their nominal duration because speed ramps as they go —
// about 11% early across all three stage lengths.
const RAMP_FINISH = 0.89;
// Handoff points as fractions of the real run. Two for a short stage (3 heroes),
// three for a long one (4). Front-loaded slightly so the last hero still gets a
// proper closing stretch rather than arriving for the final few seconds.
const SHORT_PORTALS = [0.3, 0.62];
const LONG_PORTALS = [0.22, 0.45, 0.68];

export function portalSchedule(durationSec) {
  const real = durationSec * RAMP_FINISH;
  return (durationSec <= 75 ? SHORT_PORTALS : LONG_PORTALS).map((f) => f * real);
}

export class Relay {
  // schedule: array of seconds to spawn portals at. Null means the endless
  // cadence below, which is what OVERTIME runs on — they have no known length.
  constructor(rng, stats, schedule = null, initialHeroId = null) {
    this.rng = rng;              // seeded stream: runs replay identically
    this.stats = stats;
    this.bag = [];
    // Everyone who has taken the baton this level, the hero you started as
    // included. Nobody comes round twice: a stage hands off at most three
    // times, so four of the eight appear and each appearance is someone new.
    this.used = new Set();
    this.current = HEROES.some((h) => h.id === initialHeroId) ? initialHeroId : this.drawHero();
    this.used.add(this.current);
    // A hero handed in from outside never came out of the bag, so the bag is
    // still empty here — fill it now (minus that hero) so the first hand-off
    // can follow roster order like every other one.
    if (!this.bag.length) this.refill();
    this.next = this.drawHero(this.current); // every portal previews this hero
    this.schedule = schedule;
    this.spawned = 0;
    this.elapsed = 0;
    this.portalTimer = 10;       // endless mode: first portal comes a bit sooner
    this.portalEvery = 18;
    this.lastTagLine = null;
    this.lastTagLineT = 0;
  }

  // The bag only ever holds heroes who have not appeared yet, which is what
  // keeps a level free of repeats. Only an endless run can outlast the roster;
  // when it does the slate is wiped and the cast comes round again — still
  // never back to back, since whoever is on the baton stays struck off.
  refill() {
    let pool = HEROES.map((h) => h.id).filter((id) => !this.used.has(id));
    if (!pool.length) {
      this.used = new Set([this.current, this.next].filter(Boolean));
      pool = HEROES.map((h) => h.id).filter((id) => !this.used.has(id));
    }
    this.bag = pool;
    for (let i = this.bag.length - 1; i > 0; i--) {
      const j = this.rng ? this.rng.int(0, i) : Math.floor(Math.random() * (i + 1));
      [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
    }
  }

  drawHero(after = null) {
    // Most of the time, prefer the canonical successor of `after`, so the team
    // tends to rotate in roster order rather than lurching around at random —
    // a run reads as passing down a line. (This bias originally existed to
    // surface pair-keyed hand-off banter; the exit lines that replaced it are
    // keyed by the departing hero alone and no longer need it. Kept for the
    // rotation feel, which is now its whole job.)
    if (after && this.rng && this.rng.float() < 0.65) {
      const idx = HEROES.findIndex((h) => h.id === after);
      const succ = HEROES[(idx + 1) % HEROES.length].id;
      const at = this.bag.indexOf(succ);
      if (at >= 0) { this.bag.splice(at, 1); this.used.add(succ); return succ; }
      // successor already used this bag: fall through to the shuffle
    }
    if (!this.bag.length) this.refill();
    const id = this.bag.pop();
    this.used.add(id);
    return id;
  }

  update(dt) {
    this.elapsed += dt;
    this.portalTimer -= dt;
    if (this.lastTagLineT > 0) this.lastTagLineT -= dt;
  }

  portalDue() {
    if (!this.schedule) return this.portalTimer <= 0;
    return this.spawned < this.schedule.length && this.elapsed >= this.schedule[this.spawned];
  }
  portalSpawned() { this.spawned++; this.portalTimer = this.portalEvery; }

  // Run through a portal: become the previewed hero. Returns {from, to}.
  switchHero() {
    const from = this.current;
    this.current = this.next;
    this.next = this.drawHero(this.current);
    this.stats.tags++; // legacy stat, kept for old saves, never displayed
    this.lastTagLine = TAG_LINES[this.current];
    this.lastTagLineT = 1.6;
    return { from, to: this.current };
  }
}
