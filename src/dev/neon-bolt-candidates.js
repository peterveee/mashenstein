// TERMINAL VELOCITY — the storm bolt, bake-off (25 Sep 2026). SETTLED the same day:
// "Let's do c", then "Can we incorporate e" — F (C with E's cloud deck) is now
// drawNeonBolt in neonMoods.js, and the tree geometry it is
// built from lives there too; A keeps the bolt it replaced.
//
// Peter, 25 Sep 2026: "Can we do a bake off of more detailed lightning. Possibly finer
// little electrical lines, more dramatic".
//
// THE SLOT. neon-1's strike is drawNeonBolt(ctx, s, x, y, seed, { left, right, top }) in
// stylePacks/neonMoods.js, called by the run (run.js, the neon strike) after the day and
// the spreading night are painted, and followed by a full-frame flash of
// neonStrikeFlash(s) in '#eafcff' at 0.8. Every candidate here has that exact signature,
// so a winner is wired in by swapping one function; one (D) also brings its own flash
// curve, because it moves the big flash — that is the second function it would swap.
//
// WHAT IS KEPT from the notes on the shipped bolt: it grows down from the sky (Peter,
// 24 Sep), it tears ACROSS the sky and drops onto the skyline in the middle of the frame
// ("maybe the lightning could be across the sky.. very dramatic"), and it stays on screen
// for the whole NEON_STRIKE_SECONDS, re-striking and glowing away ("could the lightning be
// more animated and stay on screen a bit longer?"). Every candidate starts from the SAME
// skeleton — the shipped skyCrawler + strikeFrom, exported from neonMoods.js for this —
// so what differs is the detail and the light, not where the bolt goes.
//
// THE CANDIDATES
//   A  the bolt that ships, for reference.
//   B  FILAMENT — the skeleton fractured fine, fractal forks three generations deep
//      down to hairlines, and crackle: little sparking tendrils that jump off the channel
//      and re-draw twenty-odd times a second for as long as it glows.
//   C  WHITE-HOT — B's tree in a hotter light: a fat white core that swells on each
//      stroke, cyan and magenta bloom, an impact glow on the skyline, the channel
//      cooling white > ice > violet as it dies, and the first bolt burned in as a
//      violet afterimage under the re-strikes.
//   D  LEADER AND RETURN STROKES — how lightning really lands: dim stepped leaders
//      feel their way down, the one that touches the skyline blazes (the return
//      stroke), the losers blink out, then dart leaders run down the SAME channel and
//      relight it three more times.
//   E  STORM SKY — B's tree inside a cloud deck that lights from within as the crawler
//      runs through it, cells flickering on their own between strokes, and the skyline
//      glowing where it lands.
import {
  drawNeonBolt, neonStrikeLight, neonStrikeFlash, NEON_STRIKE_SECONDS, skyCrawler, strikeFrom,
  jag, walk, dirAt, chan, arrival, boltTree, strokeSet, GEN_W, genLight, byGen, beginBolt as begin, heatOf, cloudDeck,
  neonTowerFlare as towerFlare, neonSignSparks as signSparks,
} from '../engine/stylePacks/neonMoods.js';
import { neonWireTowers } from '../engine/stylePacks/index.js';

// The cabinet's inks (TRON_PALETTE.neon.line, the bolt's own ice, the hover sign's magenta).
const CYAN = '#38d8f8';
const ICE = '#8cf0ff';
const WHITE = '#ffffff';
const MAGENTA = '#e838f8';
const T = NEON_STRIKE_SECONDS;

// neonMoods.js's own hash, copied (it is a module-private one-liner there).
const rnd = (seed) => { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** The shipped three-stroke tube (16 / 7 / 2.4, cyan / ice / white), per generation. */
function paintTree(ctx, tree, s, b, { scale = 1 } = {}) {
  const gens = byGen(tree.chans);
  for (let g = 0; g < 4; g++) {
    const w = GEN_W[g] * scale;
    const l = genLight(b, g);
    strokeSet(ctx, gens[g], s, 16 * w, CYAN, 0.24 * l);
    strokeSet(ctx, gens[g], s, 7 * w, ICE, 0.6 * l);
    strokeSet(ctx, gens[g], s, Math.max(0.55, 2.4 * w), WHITE, l);
  }
}

// ------------------------------------------------------------------ crackle
/**
 * THE LITTLE ELECTRICAL LINES. Short sparking tendrils jump off the grown main channel
 * and re-draw ~22 times a second, a new set each time, for as long as the bolt glows —
 * so even the dim afterglow is visibly live. Plus a splash of sparks off the skyline
 * where it lands.
 */
function crackle(ctx, tree, s, b, fs, clock = s) {
  const q = Math.floor(clock * 22);
  const a = clamp01(0.3 + b);
  const hairs = [];
  for (let i = 0; i < 16; i++) {
    const r = (k) => rnd(fs * 3.1 + q * 17.3 + i * 5.7 + k * 0.913);
    if (r(0) < 0.25) continue;
    const ch = i % 3 === 0 ? tree.crawl : tree.strike;
    const grown = s < ch.t0 ? 0 : Math.min(1, (s - ch.t0) / ch.dur);
    const n = Math.floor((ch.pts.length - 1) * grown);
    if (n < 2) continue;
    const at = 1 + Math.floor(r(1) * (n - 1));
    const [px, py] = ch.pts[at];
    const ang = dirAt(ch.pts, at) + (r(2) < 0.5 ? -1 : 1) * (0.7 + r(3) * 1.2);
    hairs.push(chan(jag(walk(px, py, ang, 4 + r(4) * 9, 3, 1.4, q * 7 + i), 1, 0.5, q + i), 0, 0, 3));
  }
  // The splash: sparks thrown up and out off the skyline once the strike has landed.
  const landed = tree.strike.t0 + tree.strike.dur;
  if (s >= landed) {
    const [hx, hy] = tree.hit;
    for (let i = 0; i < 6; i++) {
      const r = (k) => rnd(fs * 7.7 + q * 11.1 + i * 3.3 + k * 0.71);
      const ang = -Math.PI / 2 + (r(0) - 0.5) * 2.6;
      hairs.push(chan(jag(walk(hx, hy, ang, 4 + r(1) * 8, 2, 1.2, q * 5 + i), 1, 0.5, q + i * 2), 0, 0, 3));
    }
  }
  strokeSet(ctx, hairs, s, 2.8, CYAN, 0.32 * a);
  strokeSet(ctx, hairs, s, 0.65, WHITE, 0.9 * a);
}

// ------------------------------------------------------------------ A · the bolt that shipped
// The flat three-stroke bolt drawNeonBolt drew until C shipped, kept so the gallery can show it.
function drawFlatBolt(ctx, s, x, y, seed = 1, { left = x - 260, right = x + 260, top = y * 0.28 } = {}) {
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

// ------------------------------------------------------------------ B · C · E painters
function drawFilament(ctx, s, x, y, seed = 1, { left = x - 260, right = x + 260, top = y * 0.28 } = {}) {
  const light = neonStrikeLight(s);
  if (!light || light.bolt <= 0.01) return;
  const fs = seed + light.which * 3;
  const tree = boltTree(fs, x, y, left, right, top);
  begin(ctx);
  paintTree(ctx, tree, s, light.bolt);
  crackle(ctx, tree, s, light.bolt, fs);
  ctx.restore();
}

function drawStormSky(ctx, s, x, y, seed = 1, { left = x - 260, right = x + 260, top = y * 0.28 } = {}) {
  const light = neonStrikeLight(s);
  if (!light || light.bolt <= 0.01) return;
  const tree = boltTree(seed + light.which * 3, x, y, left, right, top);
  begin(ctx);
  cloudDeck(ctx, s, x, y, left, right, top, seed, light);
  paintTree(ctx, tree, s, light.bolt);
  ctx.restore();
}

// ------------------------------------------------------------------ D · leader and return strokes
// Its own clock. The leaders take the first 0.16 s — the time the shipped strike takes
// to reach the skyline — so the RETURN STROKE lands where the shipped bolt lands, and the
// big flash moves from s = 0 to s = 0.16 (about four tenths of a beat at 150 bpm; a small
// flicker still marks the beat itself). Then three dart leaders relight the same channel.
const D_RETURN = 0.16;
const D_STROKES = [[D_RETURN, 1], [0.5, 0.8], [0.86, 0.7], [1.3, 0.6]];
function leaderLight(s) {
  if (!(s >= 0 && s <= T)) return null;
  let pulse = 0;
  let flash = 0.22 * Math.exp(-s / 0.05);
  for (const [at, k] of D_STROKES) {
    if (s < at) continue;
    const e = Math.exp(-(s - at) / 0.07) * k;
    pulse = Math.max(pulse, e);
    flash = Math.max(flash, e * (at === D_RETURN ? 1 : 0.5));
  }
  const glow = s >= D_RETURN ? 0.45 * Math.max(0, 1 - s / T) : 0;
  return { bolt: Math.max(pulse, glow), pulse, flash };
}
const leaderFlash = (s) => leaderLight(s)?.flash ?? 0;

const leaderCache = new Map();
function leaderTree(seed, x, y, left, right, top) {
  const key = [seed, x, y, left, right, top].join('|');
  if (leaderCache.has(key)) return leaderCache.get(key);
  // The channel that wins: the shipped skeleton, crawler crossing in 0.12 s and the strike
  // reaching the skyline exactly at the return stroke.
  const main = boltTree(seed, x, y, left, right, top, { forks: false, crawlDur: 0.12, strikeAt: 0.065, strikeDur: D_RETURN - 0.065 });
  // The ones that lose: fingers feeling down off the crawler round the hit, each stopping
  // short of the skyline, each with a twig or two of its own.
  const fingers = [];
  const n = main.crawl.pts.length;
  let near = 0;
  main.crawl.pts.forEach((p, i) => { if (Math.abs(p[0] - x) < Math.abs(main.crawl.pts[near][0] - x)) near = i; });
  for (let k = 0; k < 7; k++) {
    const i = Math.max(2, Math.min(n - 3, near + Math.round((k - 3) * 11 + (rnd(seed + k * 3) - 0.5) * 8)));
    if (k === 3) continue;
    const [px, py] = main.crawl.pts[i];
    const reach = (y - py) * (0.35 + rnd(seed + k * 5) * 0.5);
    const ang = Math.PI / 2 + (px < x ? -1 : 1) * (0.15 + rnd(seed + k * 7) * 0.45);
    const pts = jag(walk(px, py, ang, reach, 6, 0.8, seed + k * 13), 2, 0.34, seed + k * 17);
    const t0 = Math.max(0.02, arrival(main.crawl, i));
    const f = chan(pts, t0, Math.max(0.04, D_RETURN - t0 - 0.02), 1);
    fingers.push(f);
    for (let j = 0; j < 2; j++) {
      const at = 2 + Math.floor(rnd(seed + k * 19 + j) * (pts.length - 4));
      const a = dirAt(pts, at) + (j ? 1 : -1) * (0.5 + rnd(seed + k * 23 + j) * 0.6);
      const twig = jag(walk(pts[at][0], pts[at][1], a, 7 + rnd(seed + k + j) * 12, 3, 1.1, seed + k * 29 + j), 1, 0.4, seed + k * 31 + j);
      fingers.push(chan(twig, arrival(f, at), 0.03, 2));
    }
  }
  const tree = { main, fingers };
  if (leaderCache.size > 32) leaderCache.clear();
  leaderCache.set(key, tree);
  return tree;
}

// A stepped leader does not glide, it JUMPS: its tip advances in bursts, 25 ms apart.
const stepped = (s, t0) => (s < t0 ? s : t0 + Math.ceil((s - t0) / 0.025) * 0.025);

function drawLeaderReturn(ctx, s, x, y, seed = 1, { left = x - 260, right = x + 260, top = y * 0.28 } = {}) {
  const light = leaderLight(s);
  if (!light) return;
  const tree = leaderTree(seed, x, y, left, right, top);
  const mains = [tree.main.crawl, tree.main.strike];
  begin(ctx);
  if (s < D_RETURN) {
    // THE LEADERS: dim, thin, stepping down.
    const st = stepped(s, 0.02);
    const all = [...mains, ...tree.fingers];
    strokeSet(ctx, all, st, 5, CYAN, 0.16);
    strokeSet(ctx, all, st, 1.1, ICE, 0.55);
    strokeSet(ctx, all, st, 0.55, WHITE, 0.5);
  } else {
    // THE RETURN STROKE and after. The losers flash with it and are gone in a blink.
    const lose = 0.8 * Math.exp(-(s - D_RETURN) / 0.06);
    if (lose > 0.01) {
      const f1 = tree.fingers.filter((f) => f.gen === 1);
      const f2 = tree.fingers.filter((f) => f.gen === 2);
      for (const [set, w] of [[f1, 0.45], [f2, 0.25]]) {
        strokeSet(ctx, set, T, 14 * w, CYAN, 0.24 * lose);
        strokeSet(ctx, set, T, 6 * w, ICE, 0.6 * lose);
        strokeSet(ctx, set, T, Math.max(0.55, 2.4 * w), WHITE, lose);
      }
    }
    const b = light.bolt;
    const core = 2.4 + 2 * light.pulse;
    strokeSet(ctx, mains, T, 18, CYAN, 0.26 * b);
    strokeSet(ctx, mains, T, 7, ICE, 0.62 * b);
    strokeSet(ctx, mains, T, core, WHITE, b);
    // DART LEADERS: a bright bead runs down the old channel just before each re-strike.
    for (const [at] of D_STROKES.slice(1)) {
      const u = (s - (at - 0.04)) / 0.04;
      if (u < 0 || u >= 1) continue;
      const p = tree.main.strike.pts;
      const [bx, by] = p[Math.floor(u * (p.length - 1))];
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, 10);
      g.addColorStop(0, 'rgba(255,255,255,0.9)');
      g.addColorStop(0.4, 'rgba(140,240,255,0.45)');
      g.addColorStop(1, 'rgba(56,216,248,0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.fillRect(bx - 10, by - 10, 20, 20);
    }
    // The main channel's own little lines, live between strokes.
    crackle(ctx, { crawl: tree.main.crawl, strike: tree.main.strike, hit: [x, y] }, T, b, seed, s);
  }
  ctx.restore();
}

// ------------------------------------------------------------------ H · I · J: it hits something
// Peter, 25 Sep 2026: "Should the lightning be striking the ground or something? It just
// seems like it's overlaid". It stopped in mid-air, in front of a building, with nothing
// hit and nothing answering. Not the ground — the ground here is the lane, and a bolt
// on the road beside the hero reads as a hazard — but a TOWER: G, with its strike ending
// on the mast lamp of the middle row's tower nearest the old hit point (neonWireTowers),
// held on that building for the whole strike as it scrolls.

/**
 * The middle-row tower a strike starting with the camera at camX0 hits: the mast
 * nearest x, else the nearest roof. Returned as a name (i, block) so the caller can
 * follow the same building frame to frame with towerNow.
 */
export function pickStrikeTower(ctx, camX0, context, x, aim = 'middle') {
  // K aims at the near row's SIGN building (neonBladeSigns hangs it on tower 3).
  const row = aim === 'sign' ? 'near' : 'middle';
  const towers = neonWireTowers(ctx, camX0, context, row);
  const masts = aim === 'sign' ? towers.filter((t) => t.i === NEON_SIGN_TOWER)
    : towers.filter((t) => t.mast && Math.abs(t.tipX - x) < 130);
  const pool = masts.length ? masts : towers;
  let best = pool[0];
  for (const t of pool) if (Math.abs(t.tipX - x) < Math.abs(best.tipX - x)) best = t;
  return { i: best.i, block: best.block, row };
}
export function towerNow(ctx, camX, context, pick) {
  const towers = neonWireTowers(ctx, camX, context, pick.row || 'middle');
  return towers.find((t) => t.i === pick.i && t.block === pick.block) || towers.find((t) => t.i === pick.i);
}
const NEON_SIGN_TOWER = 3;

const drawOnSpire = (flare) => (ctx, s, x, y, seed, opts = {}) => {
  drawNeonBolt(ctx, s, x, y, seed, { ...opts, thin: true });
  if (flare && opts.tower) towerFlare(ctx, s, opts.tower, seed);
};

// ------------------------------------------------------------------ the cards
export const NEON_BOLT_CANDIDATES = Object.freeze([
  {
    id: 'shipped', letter: 'A', name: 'THE BOLT THAT SHIPPED (was)',
    note: 'The bolt before the bake-off: the crawler across the sky with forks hanging off it, the strike dropping onto the '
      + 'skyline, five strokes and an afterglow. Three strokes of one path — cyan, ice, white.',
    draw: drawFlatBolt,
    flash: neonStrikeFlash,
  },
  {
    id: 'filament', letter: 'B', name: 'FILAMENT',
    note: 'The same skeleton fractured fine, fractal forks three generations deep down to hairlines, and the '
      + 'little electrical lines: sparking tendrils that jump off the channel and re-draw twenty-odd times a '
      + 'second while it glows, and a splash of sparks off the skyline. The fine forks die first between strokes.',
    draw: drawFilament,
    flash: neonStrikeFlash,
  },
  {
    id: 'white-hot', letter: 'C', name: 'WHITE-HOT',
    note: 'B\'s tree in a hotter light: a fat white core that swells on every stroke, cyan and magenta bloom, '
      + 'the skyline glowing where it lands. Between strokes the channel cools white > ice > violet, and the '
      + 'first bolt stays burned in as a violet afterimage under the re-strikes.',
    draw: (ctx, s, x, y, seed, opts = {}) => drawNeonBolt(ctx, s, x, y, seed, { ...opts, clouds: false }),
    flash: neonStrikeFlash,
  },
  {
    id: 'leader', letter: 'D', name: 'LEADER & RETURN STROKES',
    note: 'How lightning really lands. Dim stepped leaders jerk down off the crawler; the one that touches the '
      + 'skyline BLAZES (the return stroke, the big flash) and the losers blink out; then dart leaders run down '
      + 'the same channel and relight it three times. Its big flash comes 0.16 s after the beat, where the '
      + 'shipped strike lands — a faint flicker marks the beat itself.',
    draw: drawLeaderReturn,
    flash: leaderFlash,
  },
  {
    id: 'storm-sky', letter: 'E', name: 'STORM SKY',
    note: 'B\'s tree inside a cloud deck that lights from within as the crawler runs through it — each stroke '
      + 'lights the cells unevenly, single cells flicker on their own between strokes, and the skyline glows '
      + 'under the hit. Light only: with no bolt, the sky is the one that ships.',
    draw: drawStormSky,
    flash: neonStrikeFlash,
  },
  {
    id: 'white-hot-storm', letter: 'F', name: 'C + E\'s CLOUDS (ships)',
    note: 'Peter, 25 Sep 2026: "Let\'s do c", then "Can we incorporate e". C\'s white-hot bolt coming out of E\'s '
      + 'cloud deck, lit from within as the crawler runs through it. This is drawNeonBolt.',
    draw: drawNeonBolt,
    flash: neonStrikeFlash,
  },
  {
    id: 'white-hot-storm-thin', letter: 'G', name: 'F, THINNED',
    note: 'Peter, 25 Sep 2026: "Can we mock up the thinned version?" F with the forks along the sky spaced twice '
      + 'as far apart, and only twigs away from the strike, so the sky reads as one channel and the detail '
      + 'gathers where it lands. The strike keeps its full forks.',
    draw: (ctx, s, x, y, seed, opts = {}) => drawNeonBolt(ctx, s, x, y, seed, { ...opts, thin: true }),
    flash: neonStrikeFlash,
  },
  {
    id: 'spire', letter: 'H', name: 'G, ON A SPIRE',
    note: 'Peter, 25 Sep 2026: "Should the lightning be striking the ground or something? It just seems like it\'s '
      + 'overlaid". G, with the strike ending on the mast lamp of the middle-row tower nearest the old hit point, '
      + 'and staying on that building while it scrolls.',
    aim: 'middle',
    draw: drawOnSpire(false),
    flash: neonStrikeFlash,
  },
  {
    id: 'spire-flare', letter: 'I', name: 'ON A SPIRE, THE TOWER FLARES',
    note: 'H, and the tower answers: its whole outline flares white-hot in ice bloom and dies back with the '
      + 'strokes, the mast lamp burns white, sparks spit off the tip.',
    aim: 'middle',
    draw: drawOnSpire(true),
    flash: neonStrikeFlash,
  },
  {
    id: 'spire-depth', letter: 'J', name: 'ON A SPIRE, FLARING, INSIDE THE CITY',
    note: 'I, painted INTO the city rather than over it — between the middle and the near rows — so the near '
      + 'towers stand in front of the strike and the smog over the street swallows its lower reach.',
    aim: 'middle',
    depth: true,
    draw: drawOnSpire(true),
    flash: neonStrikeFlash,
  },
  {
    id: 'sign-blowout', letter: 'K', name: 'THE SIGN BUILDING, AND THE SIGN BLOWS',
    note: 'Peter, 25 Sep 2026: "What if we struck a larger building with a sign and the sign could blow out". The '
      + 'strike lands on the near row\'s sign tower; the tower flares, the sign overloads white-hot, sprays sparks, '
      + 'stutters and dies — and stays dark as the building scrolls away, with the odd weak buzz.',
    aim: 'sign',
    draw: (ctx, s, x, y, seed, opts = {}) => {
      drawOnSpire(true)(ctx, s, x, y, seed, opts);
      if (opts.tower) signSparks(ctx, s, opts.tower);
    },
    flash: neonStrikeFlash,
  },
  {
    id: 'sign-blowout-low', letter: 'L', name: 'K, ON A LOWER BUILDING (ships, with M and N)',
    note: 'Peter, 25 Sep 2026: "Might it work a bit better if the building was lower?" K, with the struck sign '
      + 'building stood 100 px tall instead of its usual height (that one building only), so the strike has more '
      + 'sky to fall through and the sign blows down in the city.',
    aim: 'sign',
    lowerTo: 100,
    draw: (ctx, s, x, y, seed, opts = {}) => {
      drawOnSpire(true)(ctx, s, x, y, seed, opts);
      if (opts.tower) signSparks(ctx, s, opts.tower);
    },
    flash: neonStrikeFlash,
  },
  {
    id: 'crawler-top', letter: 'M', name: 'L, THE SKY BOLT ALONG THE TOP EDGE (ships: the turn)',
    note: 'Peter, 25 Sep 2026: "What if in landscape the lightning went behind the hud and off screen… For more '
      + 'range". L with the crawler run along the very top of the frame (8 px down, under the HUD in a run), so the '
      + 'strike falls the whole height of the sky and the sweep across it is kept.',
    aim: 'sign',
    lowerTo: 100,
    boltTop: 8,
    draw: (ctx, s, x, y, seed, opts = {}) => {
      drawOnSpire(true)(ctx, s, x, y, seed, opts);
      if (opts.tower) signSparks(ctx, s, opts.tower);
    },
    flash: neonStrikeFlash,
  },
  {
    id: 'crawler-off', letter: 'N', name: 'L, THE SKY BOLT OFF THE TOP (ships: night strikes)',
    note: 'L with the crawler above the frame altogether: no sweep across the sky, only the strike, coming down '
      + 'from out of the picture onto the tower.',
    aim: 'sign',
    lowerTo: 100,
    boltTop: -34,
    draw: (ctx, s, x, y, seed, opts = {}) => {
      drawOnSpire(true)(ctx, s, x, y, seed, opts);
      if (opts.tower) signSparks(ctx, s, opts.tower);
    },
    flash: neonStrikeFlash,
  },
]);
