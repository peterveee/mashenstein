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
export function skyCrawler(left, right, top, seed) {
  const n = 18;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    pts.push([left + (right - left) * k,
      top + Math.sin(k * Math.PI * 1.3 + seed) * 12 + (rnd(seed + i * 5) - 0.5) * 18]);
  }
  return pts;
}
export function strikeFrom(sx, sy, x, y, seed) {
  const pts = [[sx, sy]];
  const n = 8;
  for (let i = 1; i <= n; i++) {
    const k = i / n;
    pts.push([sx + (x - sx) * k + (i < n ? (rnd(seed + i * 3) - 0.5) * 24 : 0), sy + (y - sy) * k]);
  }
  return pts;
}
/**
 * THE BOLT IS WHITE-HOT (Peter, 25 Sep 2026: "Can we do a bake off of more detailed
 * lightning. Possibly finer little electrical lines, more dramatic" — then "Let's do c").
 * The skeleton is still skyCrawler + strikeFrom above, on the same clock: it tears across
 * in 0.18 s, the strike leaves it at 0.06 s and lands 0.1 s later, five strokes and an
 * afterglow. What the bake-off (src/dev/neon-bolt-candidates.js) changed is the detail and
 * the light: the skeleton fractured fine (midpoint displacement) and grown into a tree of
 * forks three generations deep down to hairlines; a fat white core that swells on each
 * stroke inside cyan and magenta bloom; the skyline lit where it lands; the channel cooling
 * white > ice > violet between strokes; and the first bolt burned in as a violet
 * afterimage under the re-strikes. The forks die first as a stroke fades, so between
 * strokes the main channel glows on its own and each re-strike relights the whole tree.
 */
// The cabinet's inks (TRON_PALETTE.neon.line, the bolt's own ice, the hover sign's magenta).
const CYAN = '#38d8f8';
const ICE = '#8cf0ff';
const WHITE = '#ffffff';
const MAGENTA = '#e838f8';
const T = NEON_STRIKE_SECONDS;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// ------------------------------------------------------------------ geometry
/** Midpoint displacement: every segment split and its middle kicked sideways, `depth` times. */
export function jag(pts, depth, rough, seed) {
  let out = pts;
  for (let d = 0; d < depth; d++) {
    const next = [out[0]];
    for (let i = 1; i < out.length; i++) {
      const [ax, ay] = out[i - 1];
      const [bx, by] = out[i];
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.hypot(dx, dy) || 1;
      const off = (rnd(seed + d * 97.3 + i * 13.7) - 0.5) * len * rough;
      next.push([(ax + bx) / 2 - (dy / len) * off, (ay + by) / 2 + (dx / len) * off]);
      next.push(out[i]);
    }
    out = next;
  }
  return out;
}

/** A wandering walk from (x, y) heading `ang`, `len` long. */
export function walk(x, y, ang, len, steps, wander, seed) {
  const pts = [[x, y]];
  let a = ang;
  const step = len / steps;
  for (let i = 1; i <= steps; i++) {
    a += (rnd(seed + i * 7.3) - 0.5) * wander;
    x += Math.cos(a) * step;
    y += Math.sin(a) * step;
    pts.push([x, y]);
  }
  return pts;
}

export const dirAt = (pts, i) => {
  const a = pts[Math.max(0, i - 2)];
  const b = pts[Math.min(pts.length - 1, i + 2)];
  return Math.atan2(b[1] - a[1], b[0] - a[0]);
};

/**
 * A CHANNEL is a fine polyline plus WHEN its tip passes along it: it leaves its root
 * at t0 and reaches its end dur seconds later, so the whole tree grows down from the
 * sky the way the shipped bolt does, forks sprouting as the channel reaches them.
 */
export const chan = (pts, t0, dur, gen) => ({ pts, t0, dur, gen });
export const arrival = (ch, i) => ch.t0 + ch.dur * (i / Math.max(1, ch.pts.length - 1));

// Forks off a parent: gen 1 are real branches, gen 2 twigs, gen 3 hairlines.
export const FORK = [
  null,
  { len: [22, 56], speed: 700, wander: 0.9, steps: 5, depth: 2, kids: [1, 3] },
  { len: [9, 22], speed: 520, wander: 1.1, steps: 3, depth: 2, kids: [0, 2] },
  { len: [4, 9], speed: 420, wander: 1.3, steps: 2, depth: 1, kids: [0, 0] },
];
export function sprout(out, parent, i, ang, gen, seed) {
  const f = FORK[gen];
  const len = f.len[0] + rnd(seed) * (f.len[1] - f.len[0]);
  const [px, py] = parent.pts[i];
  const pts = jag(walk(px, py, ang, len, f.steps, f.wander, seed + 3), f.depth, 0.34, seed + 5);
  const ch = chan(pts, arrival(parent, i), len / f.speed, gen);
  out.push(ch);
  if (gen >= 3) return;
  const nk = f.kids[0] + Math.floor(rnd(seed + 9) * (f.kids[1] - f.kids[0] + 1));
  for (let k = 0; k < nk; k++) {
    const at = 1 + Math.floor(rnd(seed + 11 + k * 5) * (pts.length - 2));
    const side = rnd(seed + 17 + k) < 0.5 ? -1 : 1;
    const a = dirAt(pts, at) + side * (0.4 + rnd(seed + 23 + k) * 0.7);
    sprout(out, ch, at, a, gen + 1, seed * 1.37 + 31 + k * 41);
  }
  // Hairlines straight off a branch, too, so the fine detail is everywhere the branch is.
  if (gen === 1) {
    for (let k = 0; k < 2; k++) {
      const at = 1 + Math.floor(rnd(seed + 51 + k * 3) * (pts.length - 2));
      const a = dirAt(pts, at) + (k ? 1 : -1) * (0.6 + rnd(seed + 57 + k) * 0.7);
      sprout(out, ch, at, a, 3, seed * 1.91 + 61 + k * 13);
    }
  }
}

/**
 * The shipped skeleton, fractured and grown into a tree. Timings are the shipped
 * bolt's: the crawler crosses in 0.18 s, the strike leaves it at 0.06 s and lands 0.1 s
 * later.
 */
const treeCache = new Map();
export function boltTree(fs, x, y, left, right, top, { forks = true, crawlDur = 0.18, strikeAt = 0.06, strikeDur = 0.1, thin = false } = {}) {
  const key = [fs, x, y, left, right, top, forks, crawlDur, strikeAt, strikeDur, thin].join('|');
  const hit = treeCache.get(key);
  if (hit) return hit;
  const coarse = skyCrawler(left, right, top, fs);
  let from = coarse[0];
  for (const p of coarse) if (Math.abs(p[0] - x) < Math.abs(from[0] - x)) from = p;
  const crawl = chan(jag(coarse, 3, 0.3, fs + 1), 0, crawlDur, 0);
  const strike = chan(jag(strikeFrom(from[0], from[1], x, y, fs + 40), 3, 0.32, fs + 2), strikeAt, strikeDur, 0);
  const chans = [crawl, strike];
  if (forks) {
    // Off the crawler: branches hanging down, a little way either side of straight down.
    const n = crawl.pts.length;
    // `thin` (a mock-up, Peter 25 Sep: "Can we mock up the thinned version?") spaces
    // them twice as far apart and, away from the strike, hangs twigs rather than
    // branches, so the sky reads as one channel and the detail gathers where it lands.
    const spacing = thin ? 20 : 9;
    for (let i = 6, k = 0; i < n - 6; i += spacing + Math.floor(rnd(fs + i) * 7), k++) {
      const a = Math.PI / 2 + (rnd(fs + i * 3.1) - 0.5) * 1.5;
      const far = thin && Math.abs(crawl.pts[i][0] - x) > 90;
      sprout(chans, crawl, i, a, far || rnd(fs + i * 1.7) < 0.3 ? 2 : 1, fs * 3.3 + i * 17);
    }
    // Off the strike: forks peeling away down and out, both sides.
    const m = strike.pts.length;
    for (let k = 0; k < 4; k++) {
      const i = Math.floor(m * (0.18 + k * 0.17 + rnd(fs + 90 + k) * 0.08));
      const a = dirAt(strike.pts, i) + (k % 2 ? 1 : -1) * (0.45 + rnd(fs + 95 + k) * 0.45);
      sprout(chans, strike, i, a, 1, fs * 5.1 + 300 + k * 29);
    }
  }
  const tree = { chans, crawl, strike, hit: [x, y] };
  if (treeCache.size > 64) treeCache.clear();
  treeCache.set(key, tree);
  return tree;
}

/** The part of a channel its tip has reached by `s`. */
export function traceGrown(c, ch, s) {
  if (s < ch.t0) return;
  const n = ch.pts.length;
  const k = ch.dur > 0 ? Math.min(n - 1, ((s - ch.t0) / ch.dur) * (n - 1)) : n - 1;
  const kk = Math.floor(k);
  c.moveTo(ch.pts[0][0], ch.pts[0][1]);
  for (let i = 1; i <= kk; i++) c.lineTo(ch.pts[i][0], ch.pts[i][1]);
  if (k > kk && kk + 1 < n) {
    const u = k - kk;
    const [ax, ay] = ch.pts[kk];
    const [bx, by] = ch.pts[kk + 1];
    c.lineTo(ax + (bx - ax) * u, ay + (by - ay) * u);
  }
}

export function strokeSet(ctx, chans, s, width, color, alpha) {
  if (alpha <= 0.003 || !chans.length) return;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  for (const ch of chans) traceGrown(ctx, ch, s);
  ctx.stroke();
}

// Width and light per generation: the branches thin to hairlines, and die FIRST as the
// strike fades (brightness ^ (1 + 0.6 gen)), so between strokes the main channel is left
// glowing on its own and each re-strike relights the whole tree.
export const GEN_W = [1, 0.5, 0.3, 0.2];
export const genLight = (b, gen) => b ** (1 + gen * 0.6);
export const byGen = (chans) => [0, 1, 2, 3].map((g) => chans.filter((c) => c.gen === g));

export function beginBolt(ctx) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
}

// How far above its afterglow the strike is right now: 1 on a stroke, 0 between them.
export function heatOf(s, light) {
  const floor = 0.4 * Math.max(0, 1 - s / T);
  return clamp01((light.bolt - floor) / Math.max(0.05, 1 - floor));
}

// ------------------------------------------------------------------ colour
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, k) => {
  const A = hexRgb(a);
  const B = hexRgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`;
};

/**
 * THE CLOUD DECK (bolt bake-off E, added under C: Peter, 25 Sep 2026, "Can we
 * incorporate e"): cells strung along the crawler's line, invisible until lit (they are
 * additive light only — nothing is added to the sky when there is no bolt). Each lights
 * as the crawler reaches it; each stroke lights them unevenly; between strokes single
 * cells flicker on their own, the storm still going on inside.
 */
export function cloudDeck(ctx, s, x, y, left, right, top, seed, light) {
  const N = 9;
  const b = light.bolt;
  const heat = heatOf(s, light);
  const q = Math.floor(s * 14);
  // The whole underside of the deck, a band of cold light.
  const band = ctx.createLinearGradient(0, top - 40, 0, top + 70);
  // tests trace painters on recorders that return no gradient.
  if (!band) return;
  band.addColorStop(0, 'rgba(120,90,255,0)');
  band.addColorStop(0.45, `rgba(120,200,255,${0.26 * b})`);
  band.addColorStop(1, 'rgba(56,216,248,0)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = band;
  ctx.fillRect(left, top - 40, right - left, 110);
  for (let i = 0; i < N; i++) {
    const cx = left + ((i + 0.5) / N) * (right - left) + (rnd(seed + i * 3) - 0.5) * 30;
    const cy = top - 12 + (rnd(seed + i * 5) - 0.5) * 14;
    const reached = s >= 0.18 * ((cx - left) / (right - left));
    if (!reached) continue;
    const near = Math.max(0, 1 - Math.abs(cx - x) / 180);
    const stroke = heat * (0.35 + 0.65 * rnd(seed + i * 7 + light.which * 13));
    const sheet = rnd(seed + i * 11 + q * 3.7) > 0.86 ? 0.5 : 0;
    const a = Math.min(1, Math.max(stroke, sheet * (1 - s / T), b * 0.35) * (0.6 + 0.4 * near));
    if (a < 0.02) continue;
    for (let k = 0; k < 4; k++) {
      const bx = cx + (rnd(seed + i * 17 + k) - 0.5) * 60;
      const by = cy + (rnd(seed + i * 19 + k) - 0.5) * 14;
      const rx = 30 + rnd(seed + i * 23 + k) * 34;
      const ry = rx * 0.45;
      ctx.save();
      ctx.translate(bx, by);
      ctx.scale(1, ry / rx);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      if (!g) { ctx.restore(); continue; }
      g.addColorStop(0, `rgba(210,246,255,${0.55 * a})`);
      g.addColorStop(0.5, `rgba(140,120,255,${0.3 * a})`);
      g.addColorStop(1, 'rgba(90,60,220,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
      ctx.restore();
    }
  }
  // The skyline under the hit, lit.
  if (s >= 0.16) {
    const r = 70;
    const g = ctx.createRadialGradient(x, y + 10, 0, x, y + 10, r);
    if (!g) return;
    g.addColorStop(0, `rgba(170,240,255,${0.32 * b})`);
    g.addColorStop(1, 'rgba(56,216,248,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y + 10 - r, r * 2, r * 2);
  }
}

export function drawNeonBolt(ctx, s, x, y, seed = 1, { left = x - 260, right = x + 260, top = y * 0.28, clouds = true, thin = false } = {}) {
  const light = neonStrikeLight(s);
  if (!light || light.bolt <= 0.01) return;
  const b = light.bolt;
  const heat = heatOf(s, light);
  const opts = [x, y, left, right, top, { thin }];
  const tree = boltTree(seed + light.which * 3, ...opts);
  beginBolt(ctx);
  // The storm it comes out of: the cloud deck lit from within, under everything else.
  if (clouds) cloudDeck(ctx, s, x, y, left, right, top, seed, light);
  // THE AFTERIMAGE: the first bolt stays burned in, violet, under every re-strike.
  if (light.which > 0) {
    const ghost = boltTree(seed, ...opts);
    const g = 0.45 * Math.max(0, 1 - s / T);
    const gens = byGen(ghost.chans);
    for (let k = 0; k < 2; k++) {
      strokeSet(ctx, gens[k], s, 6 * GEN_W[k], '#6a3cd8', 0.35 * g);
      strokeSet(ctx, gens[k], s, 1.6 * GEN_W[k], '#b89cff', g);
    }
  }
  // The skyline lit where it lands.
  const gr = s >= tree.strike.t0 + tree.strike.dur
    ? ctx.createRadialGradient(x, y, 0, x, y, 30 + 50 * heat) : null;
  if (gr) {
    const r = 30 + 50 * heat;
    gr.addColorStop(0, `rgba(255,255,255,${0.55 * b})`);
    gr.addColorStop(0.3, `rgba(140,240,255,${0.3 * b})`);
    gr.addColorStop(1, 'rgba(56,216,248,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = gr;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Cooling: white on a stroke; between strokes the core slides ice > violet as it dies.
  const cool = mix(ICE, '#b48cff', clamp01(s / T));
  const core = mix(cool, WHITE, clamp01(heat * 3));
  const gens = byGen(tree.chans);
  for (let g = 0; g < 4; g++) {
    const w = GEN_W[g];
    const l = genLight(b, g);
    strokeSet(ctx, gens[g], s, 34 * w, MAGENTA, 0.12 * l);
    strokeSet(ctx, gens[g], s, 15 * w, CYAN, 0.3 * l);
    strokeSet(ctx, gens[g], s, (6 + 3 * heat) * w, ICE, 0.7 * l);
    strokeSet(ctx, gens[g], s, Math.max(0.6, (2 + 3.6 * heat) * w), core, l);
  }
  ctx.restore();
}

// ------------------------------------------------------------ what it hits
// Peter, 25 Sep 2026: "Should the lightning be striking the ground or something? It
// just seems like it's overlaid", then "What if we struck a larger building with a sign
// and the sign could blow out", "Might it work a bit better if the building was lower?"
// The bolt lands on a building (bolt bake-off L): the city's struck sign tower when it
// is in view, else the nearest middle-row mast (bake-off I). These answer the hit; the
// tower and its dying sign are the pack's (index.js, neonStruckTower).
/**
 * THE TOWER ANSWERS: once the strike lands its whole outline flares white-hot inside ice
 * bloom and dies back with the strokes, the mast lamp burns white, and sparks spit off
 * the tip on the crackle's clock.
 */
export function neonTowerFlare(ctx, s, tw, seed) {
  const light = neonStrikeLight(s);
  if (!light || s < 0.16) return;
  const b = light.bolt;
  const heat = heatOf(s, light);
  const body = (c) => {
    c.rect(tw.x + 0.5, tw.top + 0.5, tw.bw, 400);
    if (tw.mast) { c.moveTo(tw.tipX + 0.5, tw.top + 0.5); c.lineTo(tw.tipX + 0.5, tw.top - 12.5); }
  };
  beginBolt(ctx);
  const tube = (width, color, alpha) => {
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath(); body(ctx); ctx.stroke();
  };
  tube(9, tw.ink, 0.22 * b);
  tube(4, ICE, 0.45 * b);
  tube(1.3, WHITE, b * (0.45 + 0.55 * heat));
  // The lamp.
  const r = 6 + 8 * heat;
  const g = ctx.createRadialGradient(tw.tipX, tw.tipY, 0, tw.tipX, tw.tipY, r);
  if (g) {
    g.addColorStop(0, `rgba(255,255,255,${b})`);
    g.addColorStop(0.35, `rgba(140,240,255,${0.5 * b})`);
    g.addColorStop(1, 'rgba(56,216,248,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.fillRect(tw.tipX - r, tw.tipY - r, r * 2, r * 2);
  }
  // Sparks off the tip.
  const q = Math.floor(s * 22);
  const sparks = [];
  for (let i = 0; i < 7; i++) {
    const rr = (k) => rnd(seed * 5.3 + q * 13.1 + i * 4.7 + k * 0.61);
    const ang = -Math.PI / 2 + (rr(0) - 0.5) * 3.4;
    sparks.push(chan(jag(walk(tw.tipX, tw.tipY, ang, 4 + rr(1) * 9, 2, 1.2, q * 3 + i), 1, 0.5, q + i), 0, 0, 3));
  }
  strokeSet(ctx, sparks, s, 2.6, CYAN, 0.3 * (0.3 + heat));
  strokeSet(ctx, sparks, s, 0.65, WHITE, 0.9 * (0.3 + heat));
  ctx.restore();
}

/**
 * THE SIGN SHORTS: a shower of sparks off the blade sign as it blows — bursts every
 * 40 ms from the overload until it dies, each spark thrown out and falling, drawn as
 * a streak along its flight. The sign's own overload, stutter and death are the
 * pack's (neonBladeSigns `blown`), so the dead sign carries on after the bolt.
 */
export function neonSignSparks(ctx, s, tw) {
  if (s < 0.16 || s > 1.6) return;
  const ox = tw.x + tw.bw + 3 + 9;
  const oy = tw.top + 10;
  const sparks = [];
  for (let k = 0; k < 28; k++) {
    const born = 0.16 + Math.floor(k / 4) * 0.04 + rnd(k * 3.3) * 0.03;
    const age = s - born;
    if (age < 0 || age > 0.9) continue;
    const vx = (rnd(k * 5.1) - 0.35) * 90;
    const vy = -20 - rnd(k * 7.7) * 60;
    const x0 = ox + (rnd(k * 2.9) - 0.5) * 14;
    const y0 = oy + rnd(k * 1.3) * 40;
    const x = x0 + vx * age;
    const y = y0 + vy * age + 0.5 * 260 * age * age;
    const dx = vx * 0.03;
    const dy = (vy + 260 * age) * 0.03;
    sparks.push({ x, y, dx, dy, a: 1 - age / 0.9 });
  }
  beginBolt(ctx);
  for (const p of sparks) {
    ctx.globalAlpha = 0.9 * p.a;
    ctx.strokeStyle = p.a > 0.6 ? WHITE : '#ffd66a';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(p.x - p.dx, p.y - p.dy); ctx.lineTo(p.x, p.y); ctx.stroke();
  }
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
