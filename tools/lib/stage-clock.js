// WHEN, as well as WHERE: how many seconds a clean run takes to reach a
// fraction of the stage.
//
// The editor rules everything in fractions of the stage's distance, and a
// fraction is not a time. The lane accelerates the whole way (rampAt), so half
// the distance comes well before half the clock, and the tape arrives before
// durationSec does. This walks the run's own ramp a frame at a time, the way
// RunState.update does, rather than restating its shape in closed form.
//
// "Clean" means what the forecast means: no deaths (a checkpoint restore rewinds
// tRun along with the distance), no dashes, boosts or capsules. The one thing it
// cannot know and does say is the hero. The relay's speed multipliers spread
// the answer, so it comes back as the 1.0 reading plus the earliest and latest
// any hero in the cast could arrive. A beat-charted lane ignores the hero and
// never ramps, so there the three agree.
import { rampAt } from '../../src/game/layout.js';
import { HEROES } from '../../src/data/heroes.js';

const FRAME = 1 / 60;

const byMult = [...HEROES].sort((a, b) => (a.speedMult ?? 1) - (b.speedMult ?? 1));
export const HERO_SPEED = {
  min: byMult[0].speedMult ?? 1,
  max: byMult[byMult.length - 1].speedMult ?? 1,
  slowest: byMult[0].short,
  fastest: byMult[byMult.length - 1].short,
};

// Seconds for a lane of `base` px/s (the stage's, before hero and ramp) to
// cover `dist` px.
export function secondsToCover(base, dist, { heroMult = 1, ramp = true } = {}) {
  if (!(dist > 0) || !(base > 0)) return 0;
  const v0 = base * heroMult;
  if (!ramp) return dist / v0;
  let t = 0, d = 0;
  for (;;) {
    const step = v0 * rampAt(t) * FRAME;
    if (d + step >= dist) return t + FRAME * ((dist - d) / step);
    d += step;
    t += FRAME;
  }
}

// { t, early, late } — the 1.0 hero's arrival, and the fastest and slowest.
export function whenAt(base, dist, { ramp = true } = {}) {
  const at = (heroMult) => secondsToCover(base, dist, { heroMult, ramp });
  const t = at(1);
  return ramp ? { t, early: at(HERO_SPEED.max), late: at(HERO_SPEED.min) } : { t, early: t, late: t };
}

export function mmss(sec) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
