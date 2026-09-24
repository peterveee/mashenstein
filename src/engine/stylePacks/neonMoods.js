// NEON — the day, the strike and the night (Peter, 23 Sep 2026; docs/NEON_LEVELS_PLAN.md).
//
// neon-1 opens at GOLDEN HOUR. On the bar the song turns minor a neon lightning bolt
// lands on the skyline and the night spreads out from where it struck; halfway through
// the level an AURORA comes up over the night. neon-2 and neon-3 open on that night,
// aurora and all — no day, no strike.
//
// This module is the WHEN: pure functions of the song's beat and the level's progress,
// so the timeline can be tested without a canvas. The WHAT — the golden sun, the aurora,
// the palettes — is painted by the neon pack itself (stylePacks/index.js, NEON MOODS).
import { W } from '../renderer.js';

/**
 * THE MINOR TURN, in beats from the top of the neon song (SESERAGI v17): bar 15.
 * `Audio.songBeat()` counts from the top of the form, so this is the number the strike
 * waits for. The song may one day turn earlier — move this with it and nothing else.
 */
export const NEON_MINOR_TURN_BEAT = 56;

/**
 * THE STRIKES, in beats from the top of the song: the minor turn (bar 15) and the
 * Shibuya breakdown (bar 45, beat 176). Lightning strikes on every one the song crosses,
 * day or night (Peter, 24 Sep: "flash even if it's already night time (remain in night
 * time though).. happen on bar 45 also"). Only the minor turn's, on a golden neon-1,
 * turns the day; the rest are a bolt and a flash over a night that stays night.
 */
export const NEON_STRIKE_BEATS = [NEON_MINOR_TURN_BEAT, 176];

/**
 * How long the strike stays on screen, in seconds (Peter, 24 Sep: "could the
 * lightning be more animated and stay on screen a bit longer?"). The bolt grows down
 * from the sky, strikes again four more times with a flash each, and glows away.
 */
export const NEON_STRIKE_SECONDS = 2.4;
const NEON_RESTRIKES = [0, 0.14, 0.34, 0.62, 0.95];

/**
 * The aurora comes up over this much of neon-1 — just after the first train the hero
 * can stand on (berthed at 0.30), once the city is built (Peter, 24 Sep).
 */
export const NEON_AURORA_AT = 0.35;
export const NEON_AURORA_OVER = 0.05;

/**
 * What a stage opens on. neon-1 is the day that turns; the others open where it ended.
 */
export const neonOpensGolden = (stageIndex) => Number(stageIndex) === 1;

/**
 * Has the song turned yet, as far as THIS ATTEMPT is concerned — the decision at the
 * start of an attempt. The song is continuous across the stage-select screen and a
 * retry, so an attempt that begins past the turn (a retry after it, a song that has
 * gone round) begins at night: the picture follows what is being HEARD.
 *
 * `beat` null (no audio clock — a silent test page) is before the turn; the run falls
 * back to its own clock for the strike in that case (see neonTurnStep).
 */
export function neonStartsTurned(stageIndex, beat) {
  if (!neonOpensGolden(stageIndex)) return true;
  return Number.isFinite(beat) && beat >= NEON_MINOR_TURN_BEAT;
}

/**
 * One frame of neon-1's day: did the turn arrive this frame, and should the thunder be
 * put on the clock now?
 *
 * The turn is a CROSSING — the beat going from under NEON_MINOR_TURN_BEAT to at-or-over
 * it — never a comparison, because the song loops back to bar 9 after its end and bars
 * 9–14 would otherwise read as "before the turn" again. Once turned, an attempt stays
 * turned; night does not go back to day because the band went round.
 *
 * The thunder is PLACED, not fired: a beat before the turn it is handed to the song clock
 * with `inBeats`, so it lands on the downbeat the listener hears rather than on the frame
 * the game notices (see memory: beat cues are placed on the clock).
 *
 * `seconds` is the attempt's own clock, used only when there is no song beat at all.
 */
export function neonTurnStep({ turned, thundered }, { beat, prevBeat, seconds }) {
  if (turned) return { turned: true, thundered, strike: false, thunderIn: null };
  if (!Number.isFinite(beat)) {
    const at = NEON_MINOR_TURN_BEAT * (60 / 150);
    const strike = Number.isFinite(seconds) && seconds >= at;
    return { turned: strike, thundered, strike, thunderIn: null };
  }
  const was = Number.isFinite(prevBeat) ? prevBeat : beat;
  // A wrap (the loop coming round) hands back a SMALLER beat; that is not a crossing.
  // A long frame or a pause can move it many beats FORWARD, and that still is one.
  const forward = beat >= was;
  let thunderIn = null;
  let nowThundered = thundered;
  if (!thundered && forward && beat >= NEON_MINOR_TURN_BEAT - 1 && beat < NEON_MINOR_TURN_BEAT) {
    thunderIn = NEON_MINOR_TURN_BEAT - beat;
    nowThundered = true;
  }
  const strike = forward && was < NEON_MINOR_TURN_BEAT && beat >= NEON_MINOR_TURN_BEAT;
  return { turned: strike, thundered: nowThundered, strike, thunderIn };
}

/**
 * One frame of a night that is already turned: does a strike land this frame, and should
 * its thunder be put on the clock now? The same crossings as neonTurnStep — a beat early
 * for the thunder, on the beat for the bolt, a wrap never counts — for every beat in
 * NEON_STRIKE_BEATS, and nothing is decided by it: the night stays night.
 *
 * `placed` is the strike beat whose thunder is already on the clock, so the strike fires
 * its own only when none was placed (an attempt that began inside the lead-in beat, or a
 * frame long enough to jump both crossings).
 */
export function neonNightStrikeStep({ placed }, { beat, prevBeat }) {
  if (!Number.isFinite(beat)) return { placed, strike: false, thundered: false, thunderIn: null };
  const was = Number.isFinite(prevBeat) ? prevBeat : beat;
  if (beat < was) return { placed: null, strike: false, thundered: false, thunderIn: null };
  for (const at of NEON_STRIKE_BEATS) {
    if (was < at && beat >= at) {
      return { placed: null, strike: true, thundered: placed === at, thunderIn: null };
    }
    if (was < at - 1 && beat >= at - 1) {
      return { placed: at, strike: false, thundered: false, thunderIn: at - beat };
    }
  }
  return { placed, strike: false, thundered: false, thunderIn: null };
}

/** The aurora's strength, 0..1, for a stage at a progress. */
export function neonAuroraStrength(stageIndex, progress) {
  if (!neonOpensGolden(stageIndex)) return 1;
  const p = Number(progress);
  if (!Number.isFinite(p)) return 0;
  const u = Math.max(0, Math.min(1, (p - NEON_AURORA_AT) / NEON_AURORA_OVER));
  return u * u * (3 - 2 * u);
}

// ------------------------------------------------------------ the strike
// Deterministic per seed, so the bolt is the same shape every time it is drawn.
const rnd = (seed) => { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/**
 * The strike's light at `s` seconds in: how bright the bolt is, how bright the flash,
 * which of the re-strikes it is on (each is a slightly different bolt — the flicker),
 * and how far the first one has grown down from the sky.
 */
export function neonStrikeLight(s) {
  if (!(s >= 0 && s <= NEON_STRIKE_SECONDS)) return null;
  let pulse = 0;
  let flash = 0;
  let which = 0;
  NEON_RESTRIKES.forEach((at, i) => {
    if (s < at) return;
    which = i;
    const e = Math.exp(-(s - at) / 0.08) * (i ? 0.85 : 1);
    pulse = Math.max(pulse, e);
    flash = Math.max(flash, e * (i ? 0.4 : 0.85));
  });
  // A dim afterglow holds the bolt on screen between strikes and fades out at the end.
  const glow = 0.4 * Math.max(0, 1 - s / NEON_STRIKE_SECONDS);
  return { bolt: Math.min(1, Math.max(pulse, glow)), flash, which, grow: Math.min(1, s / 0.08) };
}

/**
 * THE BOLT, ACROSS THE SKY (Peter, 24 Sep: "maybe the lightning could be across the
 * sky.. very dramatic"). A jagged crawler tears across the whole width of the sky from
 * `left` to `right`, throwing forks down off it, and the strike itself drops from the
 * crawler onto the skyline at (x, y). The crawler races across in the first fifth of
 * a second and the strike lands behind it; every re-strike redraws both a little
 * differently, which is the flicker. Additive, in the cabinet's cyan.
 */
function skyCrawler(left, right, top, seed) {
  const n = 18;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    pts.push([left + (right - left) * k,
      top + Math.sin(k * Math.PI * 1.3 + seed) * 12 + (rnd(seed + i * 5) - 0.5) * 18]);
  }
  return pts;
}
function strikeFrom(sx, sy, x, y, seed) {
  const pts = [[sx, sy]];
  const n = 8;
  for (let i = 1; i <= n; i++) {
    const k = i / n;
    pts.push([sx + (x - sx) * k + (i < n ? (rnd(seed + i * 3) - 0.5) * 24 : 0), sy + (y - sy) * k]);
  }
  return pts;
}
export function drawNeonBolt(ctx, s, x, y, seed = 1, { left = x - 260, right = x + 260, top = y * 0.28 } = {}) {
  const light = neonStrikeLight(s);
  if (!light || light.bolt <= 0.01) return;
  const fs = seed + light.which * 3;
  const crawl = skyCrawler(left, right, top, fs);
  // The crawler races across; the strike follows once it is past the hit point.
  const across = Math.min(1, s / 0.18);
  const shown = Math.max(2, Math.ceil(crawl.length * across));
  // Where the strike leaves the crawler: the crawler point nearest above the hit.
  let from = crawl[0];
  for (const p of crawl) if (Math.abs(p[0] - x) < Math.abs(from[0] - x)) from = p;
  const strike = strikeFrom(from[0], from[1], x, y, fs + 40);
  const strikeGrow = Math.max(0, Math.min(1, (s - 0.06) / 0.1));
  const path = (c) => {
    crawl.slice(0, shown).forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
    // Forks hanging down off the crawler.
    for (let f = 2; f < shown - 1; f += 3) {
      const [fx, fy] = crawl[f];
      c.moveTo(fx, fy);
      c.lineTo(fx + (rnd(fs + f * 7) - 0.5) * 30, fy + 14 + rnd(fs + f) * 16);
      c.lineTo(fx + (rnd(fs + f * 9) - 0.5) * 44, fy + 26 + rnd(fs + f * 2) * 22);
    }
    if (strikeGrow > 0) {
      const m = Math.max(2, Math.ceil(strike.length * strikeGrow));
      strike.slice(0, m).forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
      if (strikeGrow >= 1) {
        for (const f of [3, 5]) {
          const [fx, fy] = strike[f];
          c.moveTo(fx, fy);
          c.lineTo(fx + (rnd(fs + f * 11) - 0.3) * 40, fy + 22);
        }
      }
    }
  };
  const stroke = (width, color, alpha) => {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    path(ctx);
    ctx.stroke();
  };
  const b = light.bolt;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  stroke(16, '#38d8f8', 0.24 * b);
  stroke(7, '#8cf0ff', 0.6 * b);
  stroke(2.4, '#ffffff', b);
  ctx.restore();
}

/** The flash's strength at `s` seconds: a burst on each strike, the first the biggest. */
export const neonStrikeFlash = (s) => neonStrikeLight(s)?.flash ?? 0;

/**
 * How far the night has spread from the strike point at `s` seconds, as a radius in
 * background px — the city converting outward from the hit over the first second.
 */
export function neonStrikeRadius(s, reach = W * 1.4) {
  const k = Math.max(0, Math.min(1, s / 1.0));
  return (1 - (1 - k) ** 3) * reach;
}

/**
 * THE WARNING FLICKERS, before the strike (Peter, 24 Sep: "flash between the day/night
 * themes a few times VERY briefly either before or after"). Before: it is distant
 * lightning, the sky showing its night for a frame or two while the day still holds,
 * and it makes the real strike a thing the eye was already looking for. `preT` counts
 * from the moment the thunder is placed, one beat (0.4 s) ahead of the turn. Null
 * outside the two flickers.
 */
const NEON_PRE_FLICKERS = [[0.06, 0.05], [0.2, 0.04]];
export function neonPreFlicker(preT) {
  if (!Number.isFinite(preT)) return null;
  for (const [at, len] of NEON_PRE_FLICKERS) {
    if (preT >= at && preT < at + len) return { flash: 0.35 };
  }
  return null;
}
