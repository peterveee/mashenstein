// SPEED ZONE — MID-CENTURY MODERN, the cabinet's backdrop since 28 Sep 2026 (Peter,
// after the lab bake-offs: the afternoon arc, the Chuck Jones coyote, every object as
// painted; docs/BACKDROP_STYLES.md). The Road Runner desert as Maurice Noble and
// the UPA layout men painted it in the 1950s: flat colour fields, mesas cut as stacked
// strata slabs that taper and lean, saguaros reduced to capsules, atomic starburst
// agaves and yucca lollipops, kidney clouds, a flat sun with its second disc printed out
// of step, boomerang vultures — and over all of it a thin loose ink line drawn OUT OF
// REGISTER, so the colour and the drawing never quite agree. Some fields carry a baked
// dry-brush texture. The same hand as the Crypt card Peter liked
// (src/dev/crypt-styles/midcentury.js), moved into daylight.
//
// Two palettes over one painter, and the afternoon between them (below, "the light
// across the act"):
//   MCM SUNSET — speed-1's warm late sun in period colours: coral and tangerine sky
//                bands, mustard, dusty rose mesas, teal-violet shadows.
//   MCM MIDDAY — the classic Noble palette: turquoise sky, bleached sand, terracotta
//                mesas, sage cacti.
//
// Depth is a stepped value ramp plus the register offset, which grows toward the viewer.
// Legibility (the lane goes on top): the near dunes behind the lane are one calm flat
// field, a value step away from the road, the cone's orange, the cactus's green, and
// the snake's tan; no teal within reach of the hero's shirt.
// Deterministic: seeded hashes only, animation from t. Textures bake once per palette.
//
// This file is the hand: the palettes, the kit and every landscape painter. The pack
// (stylePacks/index.js, mcmPack) says where each thing stands, from the paper desert's
// own placement code, so the two looks are the same country. The lab's two-screen
// frame (src/dev/speed-mcm/plan.js) paints through paintWith below; a painter that
// meets the edge of the picture reads it from `view`, which the lab leaves at its
// 480x270 card and the pack sets from the backdrop's coverage (portrait is wider and
// taller in these units).
import { drawJonesCoyote } from './speedMcmCoyote.js';

const TAU = Math.PI * 2;

// --------------------------------------------------------------- palettes
const SUNSET = {
  id: 'sunset',
  ink: '#2e1b1f', dryL: '255,238,204', dryD: '70,34,40',
  sky: ['#e8694c', '#ee8052', '#f29a58', '#f5b566', '#f7cf86'],
  skyEdges: [60, 104, 142, 172],
  streak: '#fbdca8', streakA: 0.26,
  sun: { disc: '#fff0c6', plate: '#f2a93a', ray: '#fff3d2', halo: '#fbd07e', haloA: 0.2 },
  cloud: ['#f39c86', '#fde0b4'], cloudA: [0.4, 0.66], cloudInk: 0.45,
  bird: '#3a2227', birdSlip: '#d85f48',
  butte: ['#c17670', '#a95d66', '#d58d78', '#9a5364'], butteCap: '#e9ad88',
  mesa: ['#e0928a', '#c46a7c', '#eba892', '#b35c7a', '#d98084'], mesaCap: '#f4c9a2',
  shade: '#5a5f9a', shadeA: 0.36, plain: '#c68d86',
  pump: { plate: '#3d8d8a', wheel: ['#fff0c6', '#3d8d8a'], vane: '#f2a93a', tank: '#3d8d8a', tankRim: '#2d6a68', water: '#9fd9cd' },
  smoke: ['#fde4c4', '#dd9c84'],
  pole: '#7a4a3a', insulator: '#3d8d8a',
  mid: { fill: '#e29c63', band: '#cf875a', patch: '#f1bf82', shade: '#8f6f8e' },
  near: { fill: '#b5776a', band: '#a86c62', patch: '#c68a78', shade: '#7f6682' },
  cactus: { body: '#5f8b63', shade: '#3f6552', bloom: '#fff0c6' },
  sage: '#6f9460', sageDark: '#44684c', yucca: '#8aa267',
  rock: { body: '#d49d86', lit: '#ecbc9e' },
  ledge: ['#c7836f', '#b46f64', '#d99a80'], ledgeCap: '#edb991',
  coyote: {
    coat: '#b0835a', back: '#7a563f', dark: '#8c6547', cream: '#f8e7c6', tip: '#34231e', ear: '#e0765f',
    nose: '#2a1818', eye: '#2a1818', mouth: '#5a2426', tongue: '#d0686a', song: '#fff4dc', spark: '#fffbea', ink: '#2e1b1f',
    // For the bake-off's silhouette and card-cut coyotes (coyote-candidates.js).
    silhouette: '#5a3035', accent: '#f2b23e', card: '#fff3dc',
  },
  devil: ['#f8d9a6', '#e3a77c', '#fff1d0'],
  weed: { plate: '#c98a4e', dust: '#f3cf9c' },
};

const MIDDAY = {
  id: 'midday',
  ink: '#28201d', dryL: '255,252,236', dryD: '60,36,28',
  sky: ['#2f9ea6', '#47b0b0', '#6fc3bb', '#a3d6c3', '#e3e5bf'],
  skyEdges: [58, 100, 138, 170],
  streak: '#d4efe2', streakA: 0.3,
  sun: { disc: '#fffbe6', plate: '#f4d45a', ray: '#fffef2', halo: '#effad8', haloA: 0.24 },
  cloud: ['#e9f6ee', '#ffffff'], cloudA: [0.5, 0.9], cloudInk: 0.4,
  bird: '#2c221f', birdSlip: '#c65e3a',
  butte: ['#c55f3b', '#aa4b30', '#d97f53', '#96432f'], butteCap: '#efab77',
  mesa: ['#d27550', '#bc5e40', '#e08c62', '#ad533d', '#c86a48'], mesaCap: '#f2bb88',
  shade: '#835a86', shadeA: 0.38, plain: '#d9a07a',
  pump: { plate: '#c65e3a', wheel: ['#fbf4dc', '#c65e3a'], vane: '#e8b134', tank: '#6d8f92', tankRim: '#4e6e72', water: '#c2ebe2' },
  smoke: ['#fbfaf2', '#bfd2cc'],
  pole: '#6b4a3a', insulator: '#f4ecd2',
  mid: { fill: '#eedbad', band: '#e3c897', patch: '#f8eccc', shade: '#c7a1a6' },
  near: { fill: '#d6a987', band: '#cc9e7e', patch: '#e2b995', shade: '#b18a94' },
  cactus: { body: '#7c9e6c', shade: '#557957', bloom: '#fffbe6' },
  sage: '#86a473', sageDark: '#5a7c5a', yucca: '#9cb27a',
  rock: { body: '#e4b99c', lit: '#f6d8bf' },
  ledge: ['#d9936c', '#c47a5b', '#e6a77c'], ledgeCap: '#f4c59a',
  coyote: {
    coat: '#b98b58', back: '#7c5a41', dark: '#946b4b', cream: '#fcf1d8', tip: '#33251f', ear: '#d86c55',
    nose: '#28201d', eye: '#28201d', mouth: '#5a2426', tongue: '#d0686a', song: '#fffdf0', spark: '#fffef4', ink: '#28201d',
    silhouette: '#7e3b27', accent: '#f6d35a', card: '#fffaee',
  },
  devil: ['#f5e6c4', '#dcc39c', '#fffaea'],
  weed: { plate: '#c69556', dust: '#f4e6c6' },
};

// The register: where the ink lands relative to its colour. Grows toward the viewer.
const REG = { sky: [1.6, -1.3], far: [1.3, -1.1], mid: [1.7, -1.4], near: [2.2, -1.8] };
// Small near things (saguaros, tufts, rocks) slip less: at 2.2 px a 5 px trunk's drawing
// lands beside it rather than on it.
const REG_SMALL = [1.2, -1.0];

// ---------------------------------------------------------------- random
function hash(n) {
  const x = Math.sin(n * 91.345 + 47.853) * 43758.5453;
  return x - Math.floor(x);
}

function rng(seed) {
  let a = (Math.floor(seed * 9973) ^ 0x9e3779b9) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smooth = (e0, e1, v) => {
  const k = Math.max(0, Math.min(1, (v - e0) / (e1 - e0)));
  return k * k * (3 - 2 * k);
};

// --------------------------------------------------------------- textures
// Baked once per palette at 2x and drawn at half scale, so they stay crisp on a 2x card.
// Each one tiles: every mark is stamped again one tile left/up/down.
const TEX_PX = 256;
const BAKED = new Map();

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// Dry brush: long horizontal strokes of broken bristle tracks.
function bakeDry(seed, rgb) {
  const c = makeCanvas(TEX_PX, TEX_PX);
  const g = c.getContext('2d');
  const r = rng(seed);
  for (let k = 0; k < 90; k++) {
    const x0 = r() * TEX_PX;
    const y0 = r() * TEX_PX;
    const len = 24 + r() * 120;
    const th = 3 + r() * 7;
    const slope = (r() - 0.5) * 0.06;
    const bristles = 3 + Math.floor(r() * 5);
    const a = 0.25 + r() * 0.55;
    for (let b = 0; b < bristles; b++) {
      const by = y0 + (b / bristles) * th;
      let x = x0 + r() * 8;
      const end = x0 + len * (0.55 + r() * 0.45);
      while (x < end) {
        const seg = 2 + r() * 10;
        const hh = 0.7 + r() * 1.3;
        const aa = a * (0.45 + r() * 0.55);
        if (r() < 0.72) {
          g.fillStyle = `rgba(${rgb},${aa})`;
          for (const dx of [0, -TEX_PX]) {
            for (const dy of [0, -TEX_PX, TEX_PX]) g.fillRect(x + dx, by + (x - x0) * slope + dy, seg, hh);
          }
        }
        x += seg + r() * 5;
      }
    }
  }
  return c;
}

// Sponge: clusters of irregular dabs.
function bakeSponge(seed, rgb) {
  const c = makeCanvas(TEX_PX, TEX_PX);
  const g = c.getContext('2d');
  const r = rng(seed);
  for (let k = 0; k < 150; k++) {
    const cx = r() * TEX_PX;
    const cy = r() * TEX_PX;
    const n = 5 + Math.floor(r() * 10);
    const spread = 3 + r() * 8;
    const a = 0.15 + r() * 0.45;
    for (let j = 0; j < n; j++) {
      const ang = r() * TAU;
      const d = r() * spread;
      const rad = 0.6 + r() * 2.2;
      const x = cx + Math.cos(ang) * d;
      const y = cy + Math.sin(ang) * d;
      g.fillStyle = `rgba(${rgb},${a * (0.5 + r() * 0.5)})`;
      for (const dx of [0, -TEX_PX, TEX_PX]) {
        for (const dy of [0, -TEX_PX, TEX_PX]) {
          g.beginPath();
          g.ellipse(x + dx, y + dy, rad, rad * (0.6 + 0.4 * ((k + j) % 3) / 2), ang, 0, TAU);
          g.fill();
        }
      }
    }
  }
  return c;
}

// One texture of a palette's four, baked on first use (or by the warm-up, below).
const TEX_KINDS = ['dryL', 'dryD', 'spL', 'spD'];
function bakedTex(pal, kind) {
  let baked = BAKED.get(pal.id);
  if (!baked) BAKED.set(pal.id, (baked = {}));
  if (!baked[kind]) {
    baked[kind] = kind === 'dryL' ? bakeDry(3, pal.dryL) : kind === 'dryD' ? bakeDry(7, pal.dryD)
      : kind === 'spL' ? bakeSponge(11, pal.dryL) : bakeSponge(13, pal.dryD);
  }
  return baked[kind];
}

const PATS = new WeakMap();
function pats(ctx, pal) {
  let byPal = PATS.get(ctx);
  if (!byPal) {
    byPal = new Map();
    PATS.set(ctx, byPal);
  }
  let p = byPal.get(pal.id);
  if (p) return p;
  p = {};
  for (const k of TEX_KINDS) p[k] = ctx.createPattern(bakedTex(pal, k), 'repeat');
  byPal.set(pal.id, p);
  return p;
}

// Fill the current path with a texture anchored at (ax, ay), so it travels with its shape.
function texFill(ctx, pat, ax, ay, alpha) {
  if (!pat || alpha <= 0) return;
  if (pat.setTransform && typeof DOMMatrix !== 'undefined') {
    pat.setTransform(new DOMMatrix([0.5, 0, 0, 0.5, ax, ay]));
  }
  ctx.globalAlpha = alpha;
  ctx.fillStyle = pat;
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ----------------------------------------------------------------- shapes
function pathPoly(ctx, v) {
  ctx.moveTo(v[0][0], v[0][1]);
  for (let k = 1; k < v.length; k++) ctx.lineTo(v[k][0], v[k][1]);
  ctx.closePath();
}

// A closed smooth blob through the midpoints of its control polygon.
function pathBlob(ctx, v) {
  const n = v.length;
  ctx.moveTo((v[n - 1][0] + v[0][0]) / 2, (v[n - 1][1] + v[0][1]) / 2);
  for (let k = 0; k < n; k++) {
    const p = v[k];
    const q = v[(k + 1) % n];
    ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  ctx.closePath();
}

function pathPill(ctx, cx, cy, w, h) {
  const r = h / 2;
  const x0 = cx - w / 2 + r;
  const x1 = cx + w / 2 - r;
  ctx.moveTo(x0, cy - r);
  ctx.lineTo(x1, cy - r);
  ctx.arc(x1, cy, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(x0, cy + r);
  ctx.arc(x0, cy, r, Math.PI / 2, Math.PI * 1.5);
  ctx.closePath();
}

// A flat colour field, optionally with a texture laid into it.
function flat(ctx, v, fill, o = {}) {
  ctx.beginPath();
  (o.smooth ? pathBlob : pathPoly)(ctx, v);
  ctx.globalAlpha = o.a ?? 1;
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.globalAlpha = 1;
  if (o.tex) texFill(ctx, o.tex, o.ax ?? 0, o.ay ?? 0, o.ta ?? 0.2);
}

// The out-of-register line: the same outline, shifted by the layer's register, each
// edge drawn as its own stroke that overshoots its corners, and now and then left out.
function ink(ctx, v, seed, reg, col, o = {}) {
  const r = rng(seed);
  const [ox, oy] = reg;
  const J = o.jit ?? 0.5;
  const n = v.length;
  const w = v.map(([x, y]) => [x + ox + (r() - 0.5) * J, y + oy + (r() - 0.5) * J]);
  const closed = o.closed !== false;
  const over = o.over ?? 1.4;
  const gapP = o.gapP ?? 0.12;
  ctx.beginPath();
  const m = closed ? n : n - 1;
  for (let k = 0; k < m; k++) {
    const skip = r() < gapP;
    const e0 = over * r();
    const e1 = over * r();
    if (skip) continue;
    const a = w[k];
    const b = w[(k + 1) % n];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    ctx.moveTo(a[0] - (dx / len) * e0, a[1] - (dy / len) * e0);
    ctx.lineTo(b[0] + (dx / len) * e1, b[1] + (dy / len) * e1);
  }
  ctx.lineCap = 'round';
  ctx.strokeStyle = col;
  ctx.lineWidth = o.w ?? 0.7;
  ctx.globalAlpha = o.a ?? 0.9;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// The same for a smooth blob: one loose loop, broken by a seeded dash.
function inkBlob(ctx, v, seed, reg, col, o = {}) {
  const r = rng(seed);
  const [ox, oy] = reg;
  const J = o.jit ?? 0.8;
  const w = v.map(([x, y]) => [x + ox + (r() - 0.5) * J, y + oy + (r() - 0.5) * J]);
  ctx.beginPath();
  pathBlob(ctx, w);
  ctx.setLineDash(o.dash ?? [30 + r() * 40, 3 + r() * 6, 12 + r() * 20, 5 + r() * 9]);
  ctx.lineDashOffset = r() * 40;
  ctx.strokeStyle = col;
  ctx.lineWidth = o.w ?? 0.7;
  ctx.globalAlpha = o.a ?? 0.9;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

// An open polyline in ink, with the register applied.
function inkLine(ctx, pts, reg, col, w = 0.7, a = 0.9) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0] + reg[0], pts[0][1] + reg[1]);
  for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0] + reg[0], pts[k][1] + reg[1]);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.globalAlpha = a;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// A tapering limb along a polyline, as a polygon (left side out, right side back).
function limb(line, w0, w1) {
  const n = line.length;
  const L = [];
  const R = [];
  for (let k = 0; k < n; k++) {
    const a = line[Math.max(0, k - 1)];
    const b = line[Math.min(n - 1, k + 1)];
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const hw = (w0 + (w1 - w0) * (k / (n - 1))) / 2;
    L.push([line[k][0] - dy * hw, line[k][1] + dx * hw]);
    R.push([line[k][0] + dy * hw, line[k][1] - dx * hw]);
  }
  return { poly: L.concat(R.slice().reverse()), L, R };
}

function disc(ctx, x, y, r, fill, a = 1) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.05, r), 0, TAU);
  ctx.globalAlpha = a;
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.globalAlpha = 1;
}

function circlePts(x, y, r, n = 14, sy = 1) {
  const out = [];
  for (let k = 0; k < n; k++) out.push([x + Math.cos((k / n) * TAU) * r, y + Math.sin((k / n) * TAU) * r * sy]);
  return out;
}

// An atomic starburst: alternating long and short rays round a dot.
function burst(ctx, x, y, R, rot, col, w = 0.6, n = 8) {
  ctx.beginPath();
  for (let k = 0; k < n; k++) {
    const a = rot + (k / n) * TAU;
    const len = k % 2 ? R * 0.5 : R;
    ctx.moveTo(x + Math.cos(a) * R * 0.2, y + Math.sin(a) * R * 0.2);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
  }
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.stroke();
}

// ------------------------------------------------------------------ the edges
// Where the picture is, in the painter's units. The lab card's is its 480x270 frame; the
// pack hands in the backdrop's coverage and band. `horizon` is where the far plain meets
// the sky and `stretch` how much taller than the card's the sky above it is, so the sky's
// bands and streaks, the sun and the evening star keep their places relative to the
// horizon in a portrait sky (at the card's own numbers both leave everything as it was).
export const CARD_VIEW = Object.freeze({ left: 0, right: 480, top: 0, bottom: 270, horizon: 198, stretch: 1 });
const viewOf = (f) => f.view || CARD_VIEW;
// A card-space sky height mapped into this view's sky.
export const skyY = (V, y) => V.horizon - (CARD_VIEW.horizon - y) * V.stretch;

// ------------------------------------------------------------------ sky
// The sky's still part: the flat bands and the dry brush in them. It changes only when
// the light steps (arcPalette) or the picture changes shape, so the pack paints it once
// into a bitmap and lays that down each frame (`f.cacheSky`); the lab paints it live.
function skyBase(ctx, V, pal, P, x0, x1, yTop, yBot) {
  ctx.fillStyle = pal.sky[0];
  ctx.fillRect(x0, yTop, x1 - x0, yBot - yTop);
  // Stepped flat bands toward the horizon, each edge a slow lazy wave.
  pal.skyEdges.forEach((edge, b) => {
    const ey = skyY(V, edge);
    ctx.beginPath();
    ctx.moveTo(x0, yBot);
    for (let x = x0; x <= x1 + 9; x += 10) {
      ctx.lineTo(x, ey + 3.5 * Math.sin(x / (80 + b * 23) + b * 1.7) + 1.5 * Math.sin(x / 21 + b));
    }
    ctx.lineTo(x1 + 10, yBot);
    ctx.closePath();
    ctx.fillStyle = pal.sky[b + 1];
    ctx.fill();
  });
  ctx.beginPath();
  ctx.rect(x0, yTop, x1 - x0, yBot - yTop);
  texFill(ctx, P.dryL, 0, 0, 0.07);
}

// One cached sky per canvas. Keyed on everything that shapes it, including where the
// bitmap's corner lands inside a device pixel: it is always laid down at whole device
// pixels, so it is never resampled (a fractional blit is what dims baked art).
const SKY_CACHE = new WeakMap();
// A cached picture may keep its colours while the afternoon light moves on a little: the
// arc steps 600 times an act (about three times a second), and repainting on every step
// was a full-sky repaint three times a second. PAL_SLACK steps is about a second of play
// — a colour change nobody can see. Palettes off the arc (no arcStep) must match exactly.
const PAL_SLACK = 4;
function palClose(a, b) {
  if (a === b) return true;
  return !!a && !!b && Number.isFinite(a.arcStep) && Number.isFinite(b.arcStep)
    && Math.abs(a.arcStep - b.arcStep) < PAL_SLACK;
}
function cachedSkyBase(ctx, V, pal, x0, x1, yTop, yBot) {
  const m = typeof ctx.getTransform === 'function' ? ctx.getTransform() : null;
  if (!m || m.b || m.c || !(m.a > 0) || !(m.d > 0) || typeof document === 'undefined') return false;
  const dx = m.a * x0 + m.e;
  const dy = m.d * yTop + m.f;
  const ix = Math.floor(dx);
  const iy = Math.floor(dy);
  const w = Math.ceil(m.a * (x1 - x0) + (dx - ix)) + 1;
  const h = Math.ceil(m.d * (yBot - yTop) + (dy - iy)) + 1;
  if (w <= 0 || h <= 0 || w * h > 16e6) return false;
  const key = `${x0}|${x1}|${yTop}|${yBot}|${V.horizon}|${V.stretch}|${m.a}|${m.d}|${(dx - ix).toFixed(3)}|${(dy - iy).toFixed(3)}`;
  let c = SKY_CACHE.get(ctx);
  if (!c || c.key !== key || !palClose(c.pal, pal)) {
    const canvas = c && c.canvas.width === w && c.canvas.height === h ? c.canvas : makeCanvas(w, h);
    const g = canvas.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, w, h);
    g.setTransform(m.a, 0, 0, m.d, m.e - ix, m.f - iy);
    skyBase(g, V, pal, pats(g, pal), x0, x1, yTop, yBot);
    c = { key, pal, canvas, ix: 0, iy: 0 };
    SKY_CACHE.set(ctx, c);
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(c.canvas, ix, iy);
  ctx.restore();
  return true;
}

function sky(ctx, f, pal, P, hook) {
  const V = viewOf(f);
  const x0 = V.left - 40;
  const x1 = V.right + 40;
  const yTop = V.top - 80;
  // Cached, the still sky only has to reach a little below the horizon: the far plain
  // and everything in front of it cover the rest.
  const yBot = f.cacheSky ? Math.min(V.bottom + 80, V.horizon + 40) : V.bottom + 80;
  if (!(f.cacheSky && cachedSkyBase(ctx, V, pal, x0, x1, yTop, yBot))) skyBase(ctx, V, pal, P, x0, x1, yTop, yBot);
  // Long flat brush streaks, the layout man's shorthand for a wide sky.
  // Each wraps a whole streak's width past the edge, never while any of it shows (the
  // widest is 190).
  const drift = f.camX * 0.02;
  const span = V.right - V.left + 220;
  ctx.beginPath();
  for (const [u, y, w, h] of [[40, 44, 150, 3.2], [300, 20, 110, 2.4], [150, 88, 190, 3.6], [410, 118, 130, 2.8], [-60, 132, 120, 2.6], [250, 152, 170, 3]]) {
    const x = V.left + ((((u - drift) % span) + span) % span) - 110;
    pathPill(ctx, x, skyY(V, y), w, h);
  }
  ctx.fillStyle = pal.streak;
  ctx.globalAlpha = pal.streakA;
  ctx.fill();
  ctx.globalAlpha = 1;
  sun(ctx, f, pal, P);
  hook?.(ctx, f, pal, P);
  for (const c of f.clouds) cloud(ctx, c, pal, P);
}

function sun(ctx, f, pal, P) {
  const s = f.sun;
  const S = pal.sun;
  // Halo: two flat translucent discs, out of step with the sun.
  disc(ctx, s.x - 5, s.y + 4, s.r * 2.5, S.halo, S.haloA * 0.6);
  disc(ctx, s.x + 6, s.y - 3, s.r * 1.75, S.halo, S.haloA);
  // The atomic ring: long and short rays turning very slowly.
  const rot = f.t * 0.04;
  ctx.beginPath();
  for (let k = 0; k < 20; k++) {
    const a = rot + (k / 20) * TAU;
    const r0 = s.r * 1.28;
    const r1 = s.r * (k % 2 ? 1.55 : 1.9);
    ctx.moveTo(s.x + Math.cos(a) * r0, s.y + Math.sin(a) * r0);
    ctx.lineTo(s.x + Math.cos(a) * r1, s.y + Math.sin(a) * r1);
  }
  ctx.strokeStyle = S.ray;
  ctx.lineWidth = 1;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.75;
  ctx.stroke();
  ctx.globalAlpha = 1;
  // The misregistered second plate, peeking out down and left.
  disc(ctx, s.x - 4.5, s.y + 3.5, s.r, S.plate, 0.9);
  ctx.beginPath();
  ctx.arc(s.x, s.y, s.r, 0, TAU);
  ctx.fillStyle = S.disc;
  ctx.fill();
  texFill(ctx, P.spL, s.x, s.y, 0.35);
  inkBlob(ctx, circlePts(s.x, s.y, s.r, 12), 41, REG.sky, pal.ink, { dash: [40, 7, 56, 5], w: 0.7, jit: 1.2, a: 0.55 });
}

function cloud(ctx, c, pal, P) {
  const { x, y, w, h } = c;
  const odd = c.i % 2 === 1;
  const Q = (u, v) => [x + u * w, y + v * h];
  const main = [Q(0, 0.72), Q(0.1, 0.02), Q(0.38, -0.12), Q(0.6, 0.32), Q(0.82, -0.4), Q(1.05, -0.2),
    Q(0.97, 0.62), Q(0.62, 1.0), Q(0.3, 1.18), Q(0.07, 1.12)];
  const X = (u, v) => [x + (0.24 + u * 0.66) * w, y + (0.55 + v * 0.85) * h];
  const under = [X(0, 0.5), X(0.1, -0.05), X(0.5, 0.05), X(0.95, -0.1), X(1.02, 0.55), X(0.8, 1.05), X(0.45, 0.62), X(0.15, 1.02)];
  flat(ctx, under, pal.cloud[odd ? 1 : 0], { smooth: true, a: pal.cloudA[0] });
  flat(ctx, main, pal.cloud[odd ? 0 : 1], { smooth: true, a: pal.cloudA[1], tex: P.dryL, ta: 0.15, ax: x, ay: y });
  // Lit from below once the sun is low (`cloudGlow` 0..1, only the time-of-day arc sets
  // it): a crescent of `cloudLit` along the underside, the body shifted up cut out of it.
  if ((pal.cloudGlow || 0) > 0.01) {
    ctx.save();
    ctx.beginPath();
    pathBlob(ctx, main);
    ctx.clip();
    ctx.beginPath();
    pathBlob(ctx, main);
    pathBlob(ctx, main.map(([px, py]) => [px + w * 0.03, py - h * (0.3 + 0.12 * pal.cloudGlow)]));
    ctx.fillStyle = pal.cloudLit;
    ctx.globalAlpha = Math.min(1, pal.cloudGlow * 1.1);
    ctx.fill('evenodd');
    ctx.restore();
  }
  inkBlob(ctx, main, 60 + c.i * 7, [-2.2, -1.6], pal.ink, { w: 0.6, a: pal.cloudInk, dash: [w * 0.9, w * 0.4, w * 0.5, w * 0.6] });
}

// A boomerang: two tapered wings in a shallow V, tips raised, a hook of primaries at
// each end, and a coral second plate slipped out from under the black.
function vulture(ctx, v, pal) {
  const s = v.s;
  const half = s / 2;
  const rise = s * (0.16 + v.flap * 0.1);
  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.rotate(v.bank);
  const shape = () => {
    ctx.beginPath();
    ctx.moveTo(-half, -rise);
    ctx.quadraticCurveTo(-half * 0.45, -s * 0.1, 0, -s * 0.035);
    ctx.quadraticCurveTo(half * 0.45, -s * 0.1, half, -rise);
    ctx.lineTo(half * 0.9, -rise + s * 0.07);
    ctx.lineTo(half * 0.94, -rise + s * 0.1);
    ctx.quadraticCurveTo(half * 0.42, s * 0.02, s * 0.05, s * 0.085);
    ctx.lineTo(0, s * 0.12);
    ctx.lineTo(-s * 0.05, s * 0.085);
    ctx.quadraticCurveTo(-half * 0.42, s * 0.02, -half * 0.94, -rise + s * 0.1);
    ctx.lineTo(-half * 0.9, -rise + s * 0.07);
    ctx.closePath();
  };
  ctx.save();
  ctx.translate(s * 0.06, s * 0.05);
  shape();
  ctx.fillStyle = pal.birdSlip;
  ctx.globalAlpha = v.near ? 0.55 : 0.4;
  ctx.fill();
  ctx.restore();
  shape();
  ctx.fillStyle = pal.bird;
  ctx.globalAlpha = v.near ? 1 : 0.7;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -s * 0.06, s * 0.045, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ------------------------------------------------------------------ rock
// A mesa as a stack of flat strata slabs: walls near-vertical at the cap and flaring
// toward the base, each slab slipped a little off the one below, the whole thing
// leaning. The cap rock overhangs in a pale slab. Shadow on the side away from the sun.
function slabStack(ctx, o, pal, P, reg) {
  const { x, top, base, capHalf, slope, fracs, cols, seed } = o;
  const H = base - top;
  const lean = o.lean ?? 0;
  const halfAt = (fr) => capHalf + slope * fr ** (o.flare ?? 2.2);
  const leanAt = (fr) => lean * (1 - fr);
  let f0 = 0;
  const slabs = [];
  fracs.forEach((fh, j) => {
    const f1 = f0 + fh;
    const dj = j === fracs.length - 1 ? 0 : (hash(seed * 7 + j) - 0.5) * 5;
    const y0 = top + f0 * H;
    const y1 = top + f1 * H;
    const v = [
      [x - halfAt(f1) + leanAt(f1) + dj, y1],
      [x - halfAt(f0) + leanAt(f0) + dj, y0],
      [x + halfAt(f0) + leanAt(f0) + dj, y0],
      [x + halfAt(f1) + leanAt(f1) + dj, y1],
    ];
    slabs.push({ v, j, y0, y1 });
    f0 = f1;
  });
  // The cap rock is the top stratum, pale, a hair proud of the wall below it.
  const c0 = slabs[0].v;
  c0[1][0] -= 1.5;
  c0[2][0] += 1.5;
  c0[0][0] -= 1.5;
  c0[3][0] += 1.5;
  // Bottom up, so each slab's top edge lies over the one beneath.
  for (let k = slabs.length - 1; k >= 0; k--) {
    const { v, j, y0, y1 } = slabs[k];
    flat(ctx, v, j === 0 ? o.capCol : cols[(j - 1) % cols.length], { tex: j === 0 ? P.dryL : P.dryD, ta: 0.1, ax: x, ay: top });
    // The shadow face: a flat translucent wedge down the left of the slab.
    const w0 = v[2][0] - v[1][0];
    const w1 = v[3][0] - v[0][0];
    flat(ctx, [v[0], v[1], [v[1][0] + w0 * 0.22, v[1][1]], [v[0][0] + w1 * 0.3, v[0][1]]], pal.shade, { a: pal.shadeA });
    // A few vertical fissures, the Noble mesa's signature.
    const n = Math.floor(hash(seed * 3 + j * 1.7) * 3);
    ctx.beginPath();
    for (let q = 0; q < n; q++) {
      const fx = 0.35 + hash(seed + j * 5 + q) * 0.55;
      const fxT = v[1][0] + w0 * fx;
      const fxB = v[0][0] + w1 * fx;
      const a = 0.15 + hash(seed * 2 + q + j) * 0.3;
      const b = a + 0.3 + hash(seed * 5 + q * 2 + j) * 0.35;
      ctx.moveTo(fxT + (fxB - fxT) * a + reg[0], y0 + (y1 - y0) * a + reg[1]);
      ctx.lineTo(fxT + (fxB - fxT) * Math.min(1, b) + reg[0], y0 + (y1 - y0) * Math.min(1, b) + reg[1]);
    }
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 0.55;
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ink(ctx, v, seed * 13 + j, reg, pal.ink, { closed: false, gapP: 0.15, w: 0.65, a: 0.8 });
  }
}

// THE MESAS ARE PAINTED ONCE, not every frame. A slab stack is its strata, a shade wedge,
// fissures and loose ink per slab, each slab filled twice (colour, then the dry-brush
// texture) — and the texture fills were most of the cost of this whole backdrop in
// portrait, where they took the frame from about 17 ms to 24 (28 Sep, "a little jittery
// on an actual iPhone ... in portrait"). A stack only ever slides sideways, so it is
// baked at the canvas's own scale into a bitmap and blitted at whole device pixels: never
// resampled, so the ink stays as crisp as the live paint. Its colours follow the light
// with PAL_SLACK's tolerance, and only one stale stack is repainted a frame, so the
// repaints spread out instead of landing together. While the canvas scale is moving (a
// dive, a resize) it paints live rather than baking a picture per frame.
const SLAB_CACHE = new WeakMap();
const SLAB_CACHE_MAX = 24;
const SCALE_SETTLE = 8;
let slabFrameAt = -1;
let slabStaleLeft = 1;
function cachedSlabStack(ctx, o, pal, reg) {
  const m = typeof ctx.getTransform === 'function' ? ctx.getTransform() : null;
  if (!m || m.b || m.c || !(m.a > 0) || !(m.d > 0) || typeof document === 'undefined') return false;
  let st = SLAB_CACHE.get(ctx);
  if (!st) SLAB_CACHE.set(ctx, (st = { a: m.a, d: m.d, stable: 0, map: new Map() }));
  if (st.a !== m.a || st.d !== m.d) {
    st.a = m.a;
    st.d = m.d;
    st.stable = 0;
    st.map.clear();
  }
  if (st.stable < SCALE_SETTLE) {
    st.stable++;
    return false;
  }
  // One stale repaint a frame: a new frame is any call more than 4 ms after the last.
  const now = performance.now();
  if (now - slabFrameAt > 4) slabStaleLeft = 1;
  slabFrameAt = now;
  const H = o.base - o.top;
  const halfW = o.capHalf + o.slope + Math.abs(o.lean ?? 0) + 8;
  const padTop = 6;
  const key = `${o.seed}|${o.fracs.join(',')}|${o.capHalf}|${o.slope}|${H}|${o.lean ?? 0}|${o.flare ?? ''}|${reg[0]}|${reg[1]}`;
  let e = st.map.get(key);
  const fresh = e && palClose(e.pal, pal);
  if (!e || (!fresh && slabStaleLeft > 0)) {
    if (e && !fresh) slabStaleLeft--;
    const w = Math.ceil(m.a * halfW * 2) + 2;
    const h = Math.ceil(m.d * (H + padTop + 4)) + 2;
    if (w * h > 8e6) return false;
    const canvas = e && e.canvas.width === w && e.canvas.height === h ? e.canvas : makeCanvas(w, h);
    const g = canvas.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, w, h);
    const ox = m.a * halfW + 1;
    const oy = m.d * padTop + 1;
    g.setTransform(m.a, 0, 0, m.d, ox, oy);
    slabStack(g, { ...o, x: 0, top: 0, base: H }, pal, pats(g, pal), reg);
    if (!e && st.map.size >= SLAB_CACHE_MAX) {
      let old = null;
      for (const [k, v] of st.map) if (!old || v.used < old[1].used) old = [k, v];
      st.map.delete(old[0]);
    }
    e = { canvas, pal, ox, oy };
    st.map.set(key, e);
  }
  e.used = now;
  const dx = Math.round(m.a * o.x + m.e - e.ox);
  const dy = Math.round(m.d * o.top + m.f - e.oy);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(e.canvas, dx, dy);
  ctx.restore();
  return true;
}
function slabStackCached(ctx, o, pal, P, reg) {
  if (!cachedSlabStack(ctx, o, pal, reg)) slabStack(ctx, o, pal, P, reg);
}

function mesa(ctx, m, pal, P) {
  const seed = 30 + (((m.i % 97) + 97) % 97);
  slabStackCached(ctx, {
    x: m.x, top: m.top, base: m.base + 2,
    capHalf: m.capHalf * 0.8, slope: m.slope * 1.75,
    fracs: m.big ? [0.07, 0.17, 0.12, 0.2, 0.16, 0.28] : [0.1, 0.3, 0.26, 0.34],
    cols: m.big ? pal.mesa : [pal.mesa[1], pal.mesa[2], pal.mesa[4]],
    capCol: pal.mesaCap,
    lean: (hash(seed * 1.3) - 0.5) * 10,
    seed,
  }, pal, P, REG.far);
}

// The strata butte, taller and narrower than a mesa, with a needle spire beside it.
function butte(ctx, b, pal, P) {
  const top = b.top - 8;
  // The needle, first: it stands behind and to the left.
  slabStackCached(ctx, {
    x: b.x - b.halfW - 20, top: top + 26, base: b.base + 4, capHalf: 5, slope: 16,
    fracs: [0.08, 0.22, 0.3, 0.4], cols: [pal.butte[3], pal.butte[1], pal.butte[3]], capCol: pal.butte[2],
    lean: -4, seed: 71,
  }, pal, P, REG.far);
  slabStackCached(ctx, {
    x: b.x, top, base: b.base + 4, capHalf: b.halfW * 0.46, slope: b.halfW * 0.7,
    fracs: [0.06, 0.14, 0.12, 0.2, 0.14, 0.34], cols: pal.butte, capCol: pal.butteCap,
    lean: 6, seed: 83,
  }, pal, P, REG.far);
}

// ------------------------------------------------------------------ the wind pump
function pump(ctx, it, t, pal, P) {
  const reg = REG.far;
  const I = pal.ink;
  const Q = pal.pump;
  const x = it.x;
  const y = it.y + 0.5;
  const spin = t * 2.1;
  // The stock tank, 24 px right: a flat drum, a flat ellipse of water.
  {
    const tx = x + 24;
    flat(ctx, [[tx - 11, y - 7.5], [tx + 11, y - 7.5], [tx + 11, y], [tx - 11, y]], Q.tank, { tex: P.dryD, ta: 0.2, ax: tx, ay: y });
    flat(ctx, [[tx + 5, y - 7.5], [tx + 11, y - 7.5], [tx + 11, y], [tx + 5, y]], Q.tankRim, { a: 0.5 });
    ctx.beginPath();
    ctx.ellipse(tx, y - 7.5, 11, 2.2, 0, 0, TAU);
    ctx.fillStyle = Q.tankRim;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(tx - 0.5, y - 7.4, 9.4, 1.3, 0, 0, TAU);
    ctx.fillStyle = Q.water;
    ctx.fill();
    ink(ctx, [[tx - 11, y], [tx - 11, y - 7.5], [tx + 11, y - 7.5], [tx + 11, y]], 501, reg, I, { closed: false, w: 0.6, gapP: 0.1 });
    inkLine(ctx, [[x + 2, y - 4], [tx - 11, y - 4]], reg, I, 0.6, 0.85);
  }
  // Tower: a tall skinny triangle of colour, and the legs and braces drawn over it a
  // step off.
  flat(ctx, [[x - 8, y], [x - 1.4, y - 40], [x + 1.4, y - 40], [x + 8, y]], Q.plate, { a: 0.55 });
  ctx.beginPath();
  const legs = [[[x - 8, y], [x - 1.6, y - 40]], [[x + 8, y], [x + 1.6, y - 40]]];
  for (const [[ax, ay], [bx, by]] of legs) {
    ctx.moveTo(ax + reg[0], ay + reg[1]);
    ctx.lineTo(bx + reg[0], by + reg[1]);
  }
  const lx = (yy, side) => x + side * (8 - 6.4 * ((y - yy) / 40));
  const levels = [y, y - 13, y - 24, y - 33, y - 40];
  for (let k = 0; k < levels.length - 1; k++) {
    const ya = levels[k];
    const yb = levels[k + 1];
    ctx.moveTo(lx(ya, -1) + reg[0], ya + reg[1]);
    ctx.lineTo(lx(yb, 1) + reg[0], yb + reg[1]);
    ctx.moveTo(lx(ya, 1) + reg[0], ya + reg[1]);
    ctx.lineTo(lx(yb, -1) + reg[0], yb + reg[1]);
    ctx.moveTo(lx(yb, -1) + reg[0] - 0.4, yb + reg[1]);
    ctx.lineTo(lx(yb, 1) + reg[0] + 0.4, yb + reg[1]);
  }
  ctx.strokeStyle = I;
  ctx.lineWidth = 0.55;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.9;
  ctx.stroke();
  ctx.globalAlpha = 1;
  inkLine(ctx, [[x - 8, y], [x - 1.6, y - 40]], [reg[0] * 0.3, reg[1] * 0.3], I, 1, 0.9);
  inkLine(ctx, [[x + 8, y], [x + 1.6, y - 40]], [reg[0] * 0.3, reg[1] * 0.3], I, 1, 0.9);
  // Pump rod, stroking with the crank.
  const stroke = 1.4 * Math.sin(spin);
  inkLine(ctx, [[x, y - 43 + stroke], [x, y - 3]], [0, 0], I, 0.6, 0.9);
  // Platform and gearbox.
  flat(ctx, [[x - 4.5, y - 41.5], [x + 4.5, y - 41.5], [x + 4.5, y - 40], [x - 4.5, y - 40]], I);
  // Tail vane: a flat mustard fin on its arm.
  inkLine(ctx, [[x - 3, y - 46], [x + 11, y - 45.2]], [0, 0], I, 0.8, 0.95);
  const vane = [[x + 8.5, y - 50], [x + 18.5, y - 52.5], [x + 18, y - 40.5], [x + 8.5, y - 42.5]];
  flat(ctx, vane, Q.vane, { tex: P.dryD, ta: 0.15, ax: x, ay: y });
  ink(ctx, vane, 507, reg, I, { w: 0.6, gapP: 0.1 });
  flat(ctx, [[x - 2.5, y - 48], [x + 2.5, y - 48], [x + 2.5, y - 44.5], [x - 2.5, y - 44.5]], I);
  // The wheel, three-quarter on: a flat pinwheel of alternating blades, turning.
  const cx = x - 4;
  const cy = y - 46.5;
  const rx = 8.2;
  const ry = 11.6;
  disc(ctx, cx + 2, cy + 1.5, ry * 0.95, Q.plate, 0.35);
  const blades = 14;
  for (let i = 0; i < blades; i++) {
    const a = spin + (i * TAU) / blades;
    const a2 = a + (TAU / blades) * 0.8;
    const pt = (ang, r) => [cx + Math.sin(ang) * rx * r, cy - Math.cos(ang) * ry * r];
    ctx.beginPath();
    const [x0, y0] = pt(a, 0.28);
    const [x1, y1] = pt(a, 1);
    const [x2, y2] = pt(a2, 1);
    const [x3, y3] = pt(a2, 0.28);
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.closePath();
    ctx.fillStyle = Q.wheel[i % 2];
    ctx.fill();
  }
  inkBlob(ctx, circlePts(cx, cy, rx, 12, ry / rx), 509, reg, I, { dash: [22, 3, 30, 4], w: 0.6, jit: 0.6 });
  disc(ctx, cx, cy, 1.6, I);
}

// ------------------------------------------------------------------ smoke
function smoke(ctx, puffs, pal) {
  const reg = REG.mid;
  // Each puff a flat three-lobed cloudlet, its second plate slipped down-right.
  const lobes = (p, s) => {
    const r = p.r * s;
    const q = (a, k) => [p.x + Math.cos(a) * r * k, p.y + Math.sin(a) * r * k * 0.8];
    return [q(3.3, 1.0), q(3.9, 1.25), q(4.8, 1.05), q(5.5, 1.25), q(0.2, 1.0), q(1.0, 0.8), q(1.9, 0.95), q(2.6, 0.75)];
  };
  for (const p of puffs) {
    if (p.a <= 0.01) continue;
    const v = lobes(p, 0.78);
    flat(ctx, v.map(([x, y]) => [x + 2.2, y + 1.4]), pal.smoke[1], { smooth: true, a: 0.32 * p.a });
    flat(ctx, v, pal.smoke[0], { smooth: true, a: 0.7 * p.a });
    inkBlob(ctx, v, 600 + p.i, reg, pal.ink, { w: 0.55, a: 0.45 * p.a, dash: [p.r * 1.6, p.r * 0.8, p.r, p.r * 2] });
  }
}

// ------------------------------------------------------------------ poles and wires
function poles(ctx, L, pal) {
  const reg = REG.mid;
  const list = L.poles;
  const V = L.view || CARD_VIEW;
  const lo = V.left - 20;
  const hi = V.right + 20;
  // Wires first: two loose sagging ink lines per span.
  ctx.beginPath();
  for (let k = 0; k < list.length - 1; k++) {
    const a = list[k];
    const b = list[k + 1];
    if (b.x < lo || a.x > hi) continue;
    for (const dy of [8, 17]) {
      const sag = 4 + hash(a.i * 3 + dy) * 1.5;
      ctx.moveTo(a.x + reg[0], a.top + dy + reg[1]);
      ctx.quadraticCurveTo((a.x + b.x) / 2 + reg[0], (a.top + b.top) / 2 + dy + sag * 2 + reg[1], b.x + reg[0], b.top + dy + reg[1]);
    }
  }
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 0.5;
  ctx.globalAlpha = 0.6;
  ctx.stroke();
  ctx.globalAlpha = 1;
  for (const p of list) {
    if (p.x < lo || p.x > hi) continue;
    // A warm wood plate under the drawn pole.
    ctx.beginPath();
    ctx.moveTo(p.x + 0.8, p.base);
    ctx.lineTo(p.x + 0.8, p.top + 1);
    ctx.moveTo(p.x - 10, p.top + 9);
    ctx.lineTo(p.x + 11.5, p.top + 9);
    ctx.moveTo(p.x - 7, p.top + 18);
    ctx.lineTo(p.x + 8.5, p.top + 18);
    ctx.strokeStyle = pal.pole;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.55;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(p.x + reg[0] * 0.4, p.base);
    ctx.lineTo(p.x + reg[0] * 0.4 + 0.3, p.top + reg[1] * 0.4);
    ctx.moveTo(p.x - 11, p.top + 8);
    ctx.lineTo(p.x + 11, p.top + 7.6);
    ctx.moveTo(p.x - 8, p.top + 17);
    ctx.lineTo(p.x + 8, p.top + 16.8);
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 0.9;
    ctx.lineCap = 'round';
    ctx.stroke();
    // Insulators: a bead of colour at each bar's ends.
    for (const [dx, dy] of [[-10, 7.2], [10, 6.8], [-7, 16.2], [7, 16]]) disc(ctx, p.x + dx, p.top + dy, 0.75, pal.insulator);
  }
}

// ------------------------------------------------------------------ land
// A range of hills: `L.ridge(x)` its crest, `L.shift` its layer-space origin at x 0, and
// optionally `L.view` (the picture's edges) and `L.base` (its ground line; the card's
// are 198 for the middle dunes and 210 for the near ones).
const RIDGE_BASE = { mid: 198, near: 210 };
const DETAIL = 40;
function ridgeLayer(ctx, L, pal, P, name) {
  const C = pal[name];
  const reg = REG[name];
  const V = L.view || CARD_VIEW;
  const base = L.base ?? RIDGE_BASE[name];
  const x0 = V.left - 40;
  const x1 = V.right + 40;
  const yBot = V.bottom + 80;
  // Everything but the flat colour happens within DETAIL of the ground line: the band
  // edge, wedges and patches all sit near the crest. Below it the hill is one colour
  // (the band over the fill) and mostly under the road, so the clip and the dry brush
  // stop there and the rest is a plain rect — a deep portrait hill costs no more.
  const floor = Math.min(yBot, base + DETAIL);
  const top = (x) => L.ridge(x);
  const outline = (dy, bottom = yBot) => {
    ctx.beginPath();
    ctx.moveTo(x0, bottom);
    for (let x = x0; x <= x1 + 2; x += 3) ctx.lineTo(x, top(x) + dy(x));
    ctx.lineTo(x1 + 3, bottom);
    ctx.closePath();
  };
  outline(() => 0, floor);
  ctx.fillStyle = C.fill;
  ctx.fill();
  if (yBot > floor) ctx.fillRect(x0, floor - 0.5, x1 + 3 - x0, yBot - floor + 0.5);
  ctx.save();
  ctx.clip();
  // Angular shadow wedges hanging off each summit on the side away from the sun.
  const P0 = { mid: 628, near: 471 }[name];
  const DUNE_AT = [0.17, 0.52, 0.81];
  const DUNE_W = [0.56, 0.4, 0.48];
  const k0 = Math.floor((L.shift + x0 - 160) / P0);
  const k1 = Math.ceil((L.shift + x1 + 180) / P0);
  const baseY = base + (name === 'near' ? 22 : 7);
  for (let k = k0; k <= k1; k++) {
    DUNE_AT.forEach((at, i) => {
      const sx = k * P0 + at * P0 - L.shift;
      if (sx < x0 - 160 || sx > x1 + 180) return;
      const hw = DUNE_W[i] * P0 * 0.5;
      const sy = top(sx);
      flat(ctx, [[sx + 1, sy - 2], [sx - hw * 0.62, baseY + 6], [sx - hw * 0.12, baseY + 6], [sx + hw * 0.05, sy + (baseY - sy) * 0.35]], C.shade,
        { a: name === 'near' ? 0.16 : 0.24 });
    });
  }
  // Kidney patches of a lighter paint, laid into the hill and moving with it.
  const seg = { mid: 170, near: 230 }[name];
  const u0 = Math.floor((V.left - 80 + L.shift) / seg) * seg;
  for (let u = u0; u - L.shift < V.right + 80; u += seg) {
    const k = Math.round(u / seg);
    const cx = u - L.shift + hash(k * 3.1 + seg) * seg * 0.5;
    const cy = top(cx) + 6 + hash(k * 1.3 + seg) * 8;
    const pw = 30 + hash(k * 7.7 + seg) * 46;
    const ph = 4 + hash(k * 2.9 + seg) * 3.5;
    const kid = [[cx - pw / 2, cy + ph * 0.2], [cx - pw * 0.3, cy - ph * 0.6], [cx, cy - ph * 0.3], [cx + pw * 0.1, cy + ph * 0.1],
      [cx + pw * 0.35, cy - ph * 0.7], [cx + pw / 2, cy], [cx + pw * 0.2, cy + ph * 0.8], [cx - pw * 0.25, cy + ph * 0.7]];
    flat(ctx, kid, C.patch, { smooth: true, a: name === 'mid' ? 0.55 : 0.4 });
  }
  // A stepped darker band a little below the crest.
  outline((x) => (name === 'mid' ? 12 : 10) + 3 * Math.sin((x + L.shift) / 41) + 2 * Math.sin((x + L.shift) / 13), floor + 2);
  ctx.fillStyle = C.band;
  ctx.globalAlpha = name === 'mid' ? 1 : 0.8;
  ctx.fill();
  ctx.restore();
  if (yBot > floor) {
    ctx.fillStyle = C.band;
    ctx.globalAlpha = name === 'mid' ? 1 : 0.8;
    ctx.fillRect(x0, floor, x1 + 3 - x0, yBot - floor);
  }
  ctx.globalAlpha = 1;
  outline(() => 0, floor);
  texFill(ctx, P.dryD, -L.shift, 0, name === 'near' ? 0.05 : 0.08);
  inkCrest(ctx, L, name === 'mid' ? 2 : 3, reg, pal.ink, name === 'mid' ? 0.8 : 0.6);
  if (name === 'mid') hatches(ctx, L, pal, base);
}

// Little clusters of ticks scattered on the hillside, the layout man's shorthand for dry
// grass and gravel. Kept off the calm strip above the lane.
function hatches(ctx, L, pal, base) {
  const V = L.view || CARD_VIEW;
  const seg = 46;
  const u0 = Math.floor((V.left - 60 + L.shift) / seg) * seg;
  ctx.beginPath();
  for (let u = u0; u - L.shift < V.right + 60; u += seg) {
    const k = Math.round(u / seg) + 500;
    if (hash(k * 2.7) < 0.4) continue;
    const cx = u - L.shift + hash(k * 4.1) * seg * 0.7;
    const cy = L.ridge(cx) + 5 + hash(k * 6.3) * 16;
    if (cy > base - 2) continue;
    const n = 3 + Math.floor(hash(k * 8.9) * 3);
    for (let j = 0; j < n; j++) {
      const x = cx + j * 2.2;
      const len = 2.2 + hash(k * 3.7 + j) * 2;
      ctx.moveTo(x, cy);
      ctx.lineTo(x - 1.1, cy - len);
    }
  }
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 0.5;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.4;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// The crest line in long overlapping strokes, each its own small step off the register.
function inkCrest(ctx, L, seed, reg, col, alpha = 0.8) {
  const V = L.view || CARD_VIEW;
  const seg = 90;
  const u0 = Math.floor((V.left - 60 + L.shift) / seg) * seg;
  ctx.beginPath();
  for (let u = u0; u - L.shift < V.right + 60; u += seg) {
    const k = Math.round(u / seg);
    if (hash(k * 1.7 + seed * 11) < 0.14) continue;
    const a = u - L.shift + (hash(k + seed * 3) - 0.5) * 12;
    const b = u + seg - L.shift + 3 + hash(k * 2.3 + seed) * 8;
    const dy = reg[1] + (hash(k * 5.1 + seed) - 0.5) * 1.6;
    for (let x = a; x <= b; x += 3) {
      const y = L.ridge(x - reg[0]) + dy;
      if (x === a) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = col;
  ctx.lineWidth = 0.75;
  ctx.globalAlpha = alpha;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------ the dust devil
// A stacked spiral of flat strokes: each level a thick elliptical arc whose open side
// turns with time, so the column winds; widening and leaning downwind as it climbs.
function devil(ctx, d, t, pal) {
  const reg = REG.mid;
  const Hh = 112;
  const spine = (u) => [d.x + 20 * u * u + Math.sin(t * 0.9 + u * 2.4) * 5 * u + Math.sin(t * 2.3 + u * 6) * 1.4 * u, d.y - u * Hh];
  const radius = (u) => 3 + 19 * u ** 1.8;
  // A pale translucent body behind the strokes, so the column holds as one shape.
  ctx.beginPath();
  for (let i = 0; i <= 20; i++) {
    const u = (i / 20) * 0.92;
    const [cx, cy] = spine(u);
    ctx.lineTo(cx - radius(u) * 0.95, cy);
  }
  for (let i = 20; i >= 0; i--) {
    const u = (i / 20) * 0.92;
    const [cx, cy] = spine(u);
    ctx.lineTo(cx + radius(u) * 0.95, cy);
  }
  ctx.closePath();
  ctx.fillStyle = pal.devil[1];
  ctx.globalAlpha = 0.3;
  ctx.fill();
  ctx.globalAlpha = 1;
  const N = 17;
  ctx.lineCap = 'round';
  for (let j = 0; j < N; j++) {
    const u = (j + 0.6) / N;
    const [cx, cy] = spine(u);
    const r = radius(u) * (0.92 + 0.08 * Math.sin(j * 1.7));
    const ry = r * 0.26 + 0.8;
    const a0 = t * 5.2 - u * 8 + j * 0.9;
    const fade = 1 - smooth(0.72, 1.02, u);
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, ry, 0, a0, a0 + 3.8);
    ctx.strokeStyle = pal.devil[j % 2 ? 0 : 2];
    ctx.lineWidth = 1.5 + u * 2.4;
    ctx.globalAlpha = 0.9 * fade;
    ctx.stroke();
    if (j % 3 === 1) {
      ctx.beginPath();
      ctx.ellipse(cx + reg[0], cy + reg[1], r * 1.04, ry * 1.1, 0, a0 + 0.7, a0 + 2.6);
      ctx.strokeStyle = pal.ink;
      ctx.lineWidth = 0.6;
      ctx.globalAlpha = 0.6 * fade;
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  // Loose wisps shed off the top, downwind.
  for (let k = 0; k < 4; k++) {
    const ph = (t * 0.32 + k / 4) % 1;
    const [cx, cy] = spine(0.86 + ph * 0.18);
    ctx.beginPath();
    pathPill(ctx, cx + 8 + ph * 22 + k * 2, cy - ph * 6, 8 + ph * 12, 2.2 + ph * 1.5);
    ctx.fillStyle = pal.devil[2];
    ctx.globalAlpha = 0.45 * (1 - ph);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // A skirt of flat pills boiling round the foot.
  for (let k = 0; k < 5; k++) {
    const ang = t * 4.2 + k * (TAU / 5);
    ctx.beginPath();
    pathPill(ctx, d.x + Math.sin(ang) * 7, d.y - 3 - (k % 3) * 2, 12 + (k % 3) * 3, 3.2);
    ctx.fillStyle = pal.devil[k % 2];
    ctx.globalAlpha = 0.6;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Grit in orbit: ink specks and a twig.
  ctx.fillStyle = pal.ink;
  for (let k = 0; k < 9; k++) {
    const u = 0.06 + (k / 9) * 0.5;
    const ang = t * (8 - k * 0.4) + k * 2.3;
    const [cx, cy] = spine(u);
    const gx = cx + Math.sin(ang) * (radius(u) + 3);
    const gy = cy + Math.cos(ang) * (radius(u) + 3) * 0.26;
    ctx.globalAlpha = Math.cos(ang) > 0 ? 0.8 : 0.35;
    ctx.fillRect(gx - 0.6, gy - 0.6, 1.2, 1.2);
  }
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------ near things
// A saguaro as a capsule trunk with U-shaped capsule arms, two flat greens (the sun side
// lighter), one rib line, and the drawing slipped off the colour.
function saguaro(ctx, it, pal) {
  const reg = REG_SMALL;
  const C = pal.cactus;
  const h = it.h * 1.12;
  const w = Math.max(3.2, h * 0.21);
  const x = it.x;
  const y = it.y + h * 0.12;
  const flip = it.flip;
  const limbs = [];
  limbs.push({ line: [[x, y], [x, y - h + w * 0.5]], w });
  const arm = (dir, atFrac, reach, rise) => {
    const ay = y - h * atFrac;
    const line = [[x, ay], [x + dir * reach * 0.55, ay + 0.3], [x + dir * reach * 0.92, ay - reach * 0.25], [x + dir * reach, ay - reach * 0.6], [x + dir * reach, ay - rise]];
    limbs.push({ line, w: w * 0.78 });
  };
  arm(-flip, 0.52, h * 0.32, h * 0.44);
  if (it.arms > 1) arm(flip, 0.36, h * 0.28, h * 0.36);
  if (it.arms > 2) arm(flip, 0.7, h * 0.22, h * 0.24);
  const shapes = limbs.map((l) => ({ ...limb(l.line, l.w, l.w), tip: l.line[l.line.length - 1], w: l.w }));
  for (const s of shapes) {
    flat(ctx, s.poly, C.body);
    disc(ctx, s.tip[0], s.tip[1], s.w / 2, C.body);
  }
  // The shade side: the left half of each limb, flat.
  for (const s of shapes) {
    const half = s.L.map((p, k) => [(p[0] + s.R[k][0]) / 2 - 0.2, (p[1] + s.R[k][1]) / 2]);
    const left = s.L[0][0] < s.R[0][0] ? s.L : s.R;
    flat(ctx, left.concat(half.slice().reverse()), C.shade, { a: 0.7 });
  }
  inkLine(ctx, [[x + w * 0.1, y - 1], [x + w * 0.1, y - h + w * 1.2]], [reg[0] * 0.5, reg[1] * 0.5], pal.ink, 0.45, 0.55);
  for (const [k, s] of shapes.entries()) {
    const sd = 700 + it.i * 11 + k;
    inkLine(ctx, k ? s.L.slice(1) : s.L, reg, pal.ink, 0.6, 0.85);
    inkLine(ctx, k ? s.R.slice(1) : s.R, reg, pal.ink, 0.6, 0.85);
    ctx.beginPath();
    const ang = Math.atan2(s.tip[1] - s.L[s.L.length - 2][1], s.tip[0] - s.L[s.L.length - 2][0]);
    ctx.arc(s.tip[0] + reg[0], s.tip[1] + reg[1], s.w / 2, ang - Math.PI / 2 + hash(sd) * 0.3, ang + Math.PI / 2);
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 0.6;
    ctx.globalAlpha = 0.85;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // A crown of blossom on some.
  if (hash(it.i * 2.3) < 0.4) {
    for (const dx of [-0.9, 0.9]) disc(ctx, x + dx, y - h - 0.2, 0.9, C.bloom);
  }
}

// The tufts between the summits: an atomic starburst agave, or a yucca lollipop.
function sage(ctx, it, pal) {
  const reg = REG_SMALL;
  const s = it.s;
  const x = it.x;
  const y = it.y + 1.5;
  if (((it.i % 2) + 2) % 2 === 0) {
    // Agave: a fan of tapering blades from one point.
    const n = 9;
    for (let k = 0; k < n; k++) {
      const a = -Math.PI + 0.25 + (k / (n - 1)) * (Math.PI - 0.5);
      const len = (k % 2 ? 7 : 10) * s;
      const tip = [x + Math.cos(a) * len, y + Math.sin(a) * len];
      const nx = -Math.sin(a) * 1.2 * s;
      const ny = Math.cos(a) * 1.2 * s;
      flat(ctx, [[x - nx, y - ny], tip, [x + nx, y + ny]], k % 3 === 0 ? pal.sageDark : pal.sage);
    }
    ctx.beginPath();
    for (let k = 0; k < n; k += 2) {
      const a = -Math.PI + 0.25 + (k / (n - 1)) * (Math.PI - 0.5);
      const len = 10 * s;
      ctx.moveTo(x + reg[0], y + reg[1]);
      ctx.lineTo(x + Math.cos(a) * len + reg[0], y + Math.sin(a) * len + reg[1]);
    }
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.7;
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else {
    // Yucca: a starburst ball on a short stalk.
    const top = y - 12 * s;
    inkLine(ctx, [[x, y], [x + 0.6, top]], [0, 0], pal.sageDark, 1.4, 1);
    disc(ctx, x + 0.6, top, 5.2 * s, pal.yucca);
    disc(ctx, x - 0.6, top + 1, 3.8 * s, pal.sageDark, 0.6);
    burst(ctx, x + 0.6 + reg[0], top + reg[1], 6.2 * s, it.i * 0.7, pal.ink, 0.5, 12);
  }
}

function rock(ctx, it, pal) {
  const reg = REG_SMALL;
  const s = it.s * 1.3;
  const x = it.x;
  const y = it.y + 2;
  const v = [[x - 7 * s, y], [x - 6 * s, y - 4 * s], [x - 2 * s, y - 6.5 * s], [x + 3 * s, y - 6 * s], [x + 7 * s, y - 2.5 * s], [x + 7.5 * s, y]];
  flat(ctx, v, pal.rock.body, { smooth: true });
  flat(ctx, [[x - 1 * s, y - 5.5 * s], [x + 3 * s, y - 5.4 * s], [x + 6 * s, y - 2.6 * s], [x + 2 * s, y - 3.4 * s]], pal.rock.lit, { smooth: true, a: 0.9 });
  inkBlob(ctx, v, 800 + it.i, reg, pal.ink, { w: 0.6, a: 0.75, dash: [18, 3, 9, 4] });
}

// ------------------------------------------------------------------ the coyote
// Its stacked-slab ledge here; the animal is the Chuck Jones coyote (speedMcmCoyote.js),
// with one clean slipped contour instead of this file's loose line.
function coyote(ctx, c, f, pal, P, draw = drawJonesCoyote) {
  ledge(ctx, c.x, c.y, pal, P);
  draw(ctx, f.t, c.x, c.y - 12.4, c.facing, pal.coyote, { mode: c.mode });
}

// The coyote's plinth: three slabs stepping in toward the top; (x0, y0) is the crest
// under its centre and the top surface is y0 - 12.4.
function ledge(ctx, x0, y0, pal, P) {
  const I = pal.ink;
  // The ledge: three slabs, stepping in toward the top.
  const slabs = [
    { l: -26, r: 25, t: -3, b: 16, col: pal.ledge[0], dx: 0 },
    { l: -23, r: 21.5, t: -8, b: -3, col: pal.ledge[1], dx: 1.2 },
    { l: -19.5, r: 17.5, t: -12.4, b: -8, col: pal.ledge[2], dx: -1 },
  ];
  slabs.forEach((s, k) => {
    const v = [[x0 + s.l + s.dx, y0 + s.b], [x0 + s.l + 1.8 + s.dx, y0 + s.t], [x0 + s.r - 1.2 + s.dx, y0 + s.t], [x0 + s.r + s.dx, y0 + s.b]];
    flat(ctx, v, s.col, { tex: P.dryD, ta: 0.14, ax: x0, ay: y0 });
    flat(ctx, [v[0], v[1], [v[1][0] + 6, v[1][1]], [v[0][0] + 8, v[0][1]]], pal.near.shade, { a: 0.4 });
    // A tidier line than the hills': the ledge is the coyote's plinth, and loose
    // overshooting strokes here read as sticks around the animal.
    ink(ctx, v, 900 + k, REG_SMALL, I, { closed: false, gapP: 0.12, w: 0.65, over: 0.2, jit: 0.2 });
  });
  flat(ctx, [[x0 - 18.5, y0 - 12.4], [x0 + 16.5, y0 - 12.4], [x0 + 16, y0 - 11], [x0 - 18, y0 - 11]], pal.ledgeCap);
}

// ------------------------------------------------------------------ tumbleweeds
// A scribbled circle: loose ink loops round a slipped flat disc, turning as it rolls.
const WEED_LOOPS = [0, 1, 2].map((v) => {
  const r = rng(200 + v * 17);
  const loops = [];
  for (let k = 0; k < 8; k++) {
    loops.push({
      dx: (r() - 0.5) * 0.35, dy: (r() - 0.5) * 0.35,
      rx: 0.6 + r() * 0.42, ry: 0.35 + r() * 0.5, rot: r() * Math.PI,
    });
  }
  return loops;
});

function weed(ctx, w, pal) {
  const reg = REG.near;
  const cy = w.ground - w.R * (1 - w.squash * 0.2) - w.lift + 1.2;
  if (w.age < 0.4) {
    for (let q = 0; q < 3; q++) {
      const d = q - 1;
      ctx.beginPath();
      pathPill(ctx, w.x + d * (3 + w.age * 24), w.ground - 1.5 - w.age * 6 - q * 0.6, 5 + w.age * 12, 2 + w.age * 2);
      ctx.fillStyle = pal.weed.dust;
      ctx.globalAlpha = 0.6 * (1 - w.age / 0.4);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.save();
  ctx.translate(w.x, cy);
  ctx.scale(1 + w.squash * 0.18, 1 - w.squash * 0.22);
  const R = w.R;
  disc(ctx, 1.4, 1.1, R * 0.92, pal.weed.plate, 0.55);
  const cs = Math.cos(w.spin);
  const sn = Math.sin(w.spin);
  ctx.beginPath();
  for (const L of WEED_LOOPS[w.variant % 3]) {
    const cx = (L.dx * cs - L.dy * sn) * R + reg[0] * 0.5;
    const cyy = (L.dx * sn + L.dy * cs) * R + reg[1] * 0.5;
    const rot = L.rot + w.spin;
    ctx.moveTo(cx + Math.cos(rot) * L.rx * R, cyy + Math.sin(rot) * L.rx * R);
    ctx.ellipse(cx, cyy, L.rx * R, L.ry * R, rot, 0, TAU);
  }
  for (let k = 0; k < 5; k++) {
    const a = w.spin + k * 1.37 + 0.4;
    ctx.moveTo(Math.cos(a) * R * 0.85, Math.sin(a) * R * 0.85);
    ctx.lineTo(Math.cos(a + 0.18) * R * 1.2, Math.sin(a + 0.18) * R * 1.2);
  }
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 0.6;
  ctx.globalAlpha = 0.85;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ------------------------------------------------------------------ the painter
// `o.coyote` swaps the coyote painter (the coyote bake-off's seam): any
// draw(ctx, t, x, ledgeTop, facing, colours, opts) — see coyote-candidates.js.
// `o.hooks.{sky,far,mid,near,top}(ctx, f, pal, P)` paint extra things into a layer (sky:
// after the sun, before the clouds) (the
// object sheet's seam); `o.farItems === false` leaves the plan's wind pump out, for a
// card that stands another prop on that cap.
function makePaint(pal) {
  return (ctx, f, o = {}) => paintWith(pal, ctx, f, o);
}

// The painter with its palette passed per call, for a palette that changes over time
// (palette-arc.js). `pal.id` keys the baked textures, so a blend names a keyframe's.
export function paintWith(pal, ctx, f, o = {}) {
  const P = pats(ctx, pal);
  const hooks = o.hooks || {};
  sky(ctx, f, pal, P, hooks.sky);
  if (f.butte) butte(ctx, f.butte, pal, P);
  const far = f.layers.far;
  // The far plain between the mesas.
  farPlain(ctx, viewOf(f), 197, pal);
  for (const m of far.mesas) if (!m.big) mesa(ctx, m, pal, P);
  for (const m of far.mesas) if (m.big) mesa(ctx, m, pal, P);
  if (o.farItems !== false) for (const it of far.items) if (it.kind === 'pump') pump(ctx, it, f.t, pal, P);
  hooks.far?.(ctx, f, pal, P);
  for (const v of f.vultures) vulture(ctx, v, pal);
  const mid = f.layers.mid;
  smoke(ctx, f.smoke, pal);
  poles(ctx, mid, pal);
  ridgeLayer(ctx, mid, pal, P, 'mid');
  for (const d of mid.devils) devil(ctx, d, f.t, pal);
  hooks.mid?.(ctx, f, pal, P);
  const near = f.layers.near;
  for (const it of near.items) {
    if (it.kind === 'saguaro') saguaro(ctx, it, pal);
    else if (it.kind === 'sage') sage(ctx, it, pal);
  }
  ridgeLayer(ctx, near, pal, P, 'near');
  for (const it of near.items) if (it.kind === 'rock') rock(ctx, it, pal);
  if (near.coyote) coyote(ctx, near.coyote, f, pal, P, o.coyote || drawJonesCoyote);
  for (const w of near.weeds) weed(ctx, w, pal);
  hooks.near?.(ctx, f, pal, P);
  hooks.top?.(ctx, f, pal, P);
}

export const MCM_SUNSET = {
  id: 'mcm-sunset',
  name: 'MCM SUNSET',
  note: "Speed-1's warm late sun as a 1950s layout painting: coral and tangerine sky bands, a flat sun with its "
    + 'mustard second disc printed out of step, dusty rose mesas cut as stacked strata slabs, teal-violet shadow wedges, '
    + 'a loose ink line off register over everything, dry-brush in the fields.',
  paint: makePaint(SUNSET),
};

export const MCM_MIDDAY = {
  id: 'mcm-midday',
  name: 'MCM MIDDAY',
  note: 'The classic Maurice Noble Road Runner palette: turquoise sky in flat bands, bleached sand hills, terracotta '
    + 'strata mesas with violet shade, sage capsule saguaros and starburst agaves, the same off-register ink and dry-brush.',
  paint: makePaint(MIDDAY),
};

// The coyote's colours per palette, for sheets that draw it on its own.
export const MCM_COYOTE_PALETTES = { sunset: SUNSET.coyote, midday: MIDDAY.coyote };
export const MCM_PALETTES = { sunset: SUNSET, midday: MIDDAY };

// The coyote's ledge on its own, for close-ups: (x, crestY) is the crest under its centre.
export function drawCoyoteLedge(ctx, x, crestY, palId) {
  const pal = MCM_PALETTES[palId];
  ledge(ctx, x, crestY, pal, pats(ctx, pal));
}

// The flat plain between the far mesas, from just under their foot to below the picture.
function farPlain(ctx, V, y, pal) {
  ctx.fillStyle = pal.plain;
  ctx.fillRect(V.left - 40, y, V.right - V.left + 80, Math.max(60, V.bottom + 80 - y));
}

// The hand itself, for the object painters (speedMcmObjects.js).
export const MCM_KIT = {
  REG, REG_SMALL, hash, rng, smooth, pats, texFill,
  pathPoly, pathBlob, pathPill, flat, ink, inkBlob, inkLine, limb, disc, circlePts, burst,
  weed, devil,
};

// Every landscape painter, one at a time, for the pack: it composes the picture itself
// (a layer at a time, under that layer's transform) from the paper desert's placement.
export const MCM_PAINT = {
  sky, sun, cloud, vulture, mesa, butte, pump, smoke, poles, ridge: ridgeLayer, devil,
  saguaro, sage, rock, ledge, weed, farPlain,
};

// ------------------------------------------------------------------ structures
// The objects' own colours per palette (speedMcmObjects.js reads `pal.obj`, or these by
// the palette's id). SUNSET puts teal steel against the coral sky; MIDDAY puts
// terracotta against the turquoise, as the wind pump already does in each.
export const MCM_OBJ = {
  sunset: {
    plate: '#3d8d8a', plateDark: '#2d6a68', alt: '#c46a7c', cream: '#fff0c6', mustard: '#f2a93a', coral: '#e8694c',
    glass: '#9fd9cd', wood: '#7a4a3a', slab: ['#c7836f', '#b46f64', '#d99a80'], slabCap: '#edb991',
    car: '#2e1b1f', carWhite: '#fff3dc', lamp: '#ff5a3c', blue: '#5a8fd8',
    signGreen: '#3d8d8a', signBlue: '#2f5a86', signFace: '#fff0c6',
    smoke: ['#fde4c4', '#dd9c84'], flame: ['#e8694c', '#f2a93a', '#fff3d2'],
    jet: { body: '#5a5f9a', lit: '#a3a6d6', under: '#3d3f6e', stripe: '#e8694c', glass: '#fbd07e' },
  },
  midday: {
    plate: '#c65e3a', plateDark: '#96432f', alt: '#6d8f92', cream: '#fbf4dc', mustard: '#e8b134', coral: '#d9573a',
    glass: '#c2ebe2', wood: '#6b4a3a', slab: ['#d9936c', '#c47a5b', '#e6a77c'], slabCap: '#f4c59a',
    car: '#28201d', carWhite: '#fffaee', lamp: '#ff4a2a', blue: '#3f7fd0',
    signGreen: '#3f7f6a', signBlue: '#2f5a86', signFace: '#fbf4dc',
    smoke: ['#fbfaf2', '#bfd2cc'], flame: ['#d9573a', '#e8b134', '#fffbe6'],
    jet: { body: '#4e6e72', lit: '#a9c4c2', under: '#34504f', stripe: '#c65e3a', glass: '#f4d45a' },
  },
};

// ================================================================== the light across the act
// ONE AFTERNOON ACROSS THE ACT (Peter, 27 Sep 2026: "could we gradually adjust it as each
// level progresses so each change starts like the end of the previous one"; shipped 28
// Sep). The light is a function of where the run is in the act — u = (stage - 1 + stage
// progress) / 3 — so speed-2 opens in exactly the light speed-1 closed in, and a retry or
// rewind shows the same light for the same spot.
//
// Five authored palettes: MIDDAY (speed-1 opens), AFTERNOON (speed-1 closes, speed-2
// opens), GOLDEN (speed-2 closes, speed-3 opens), SUNSET (halfway through speed-3) and
// DUSK (speed-3 closes, the sun down and the evening coming on). Between two of them every
// colour is blended in OKLab, which keeps a blend from greying out the way an RGB mix of
// turquoise and coral does. The structure colours (towers, gantry, pump) swap from
// terracotta to teal as the sky goes from turquoise to warm, keyframed on their own so
// they stay clear of the sky throughout; the sun sinks and grows as the light warms.
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function hexToLab(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = toLin(((n >> 16) & 255) / 255);
  const g = toLin(((n >> 8) & 255) / 255);
  const b = toLin((n & 255) / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function labToHex([L, A, B]) {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return `#${rgb.map((c) => Math.round(Math.max(0, Math.min(1, toSrgb(Math.max(0, c)))) * 255).toString(16).padStart(2, '0')).join('')}`;
}
const labCache = new Map();
function lab(hex) {
  let v = labCache.get(hex);
  if (!v) {
    v = hexToLab(hex);
    labCache.set(hex, v);
  }
  return v;
}
export function mixHex(a, b, k) {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const A = lab(a);
  const B = lab(b);
  return labToHex([A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k]);
}

// Every key of a palette, blended: hex colours in OKLab, numbers and 'r,g,b' strings
// linearly, arrays and objects member by member; anything else (the id) from `a`.
function blend(a, b, k) {
  if (typeof a === 'string' && typeof b === 'string') {
    if (a[0] === '#' && b[0] === '#') return mixHex(a, b, k);
    if (/^\d+,\d+,\d+$/.test(a) && /^\d+,\d+,\d+$/.test(b)) {
      const A = a.split(',').map(Number);
      const B = b.split(',').map(Number);
      return A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',');
    }
    return a;
  }
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * k;
  if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => blend(v, b[i] ?? v, k));
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const out = {};
    for (const key of Object.keys(a)) out[key] = key in b ? blend(a[key], b[key], k) : a[key];
    return out;
  }
  return a;
}
function over(base, patch) {
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' ? over(base[k], v) : v;
  }
  return out;
}
function mapColours(v, fn) {
  if (typeof v === 'string' && v[0] === '#') return fn(v);
  if (Array.isArray(v)) return v.map((x) => mapColours(x, fn));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mapColours(x, fn)]));
  return v;
}

// cloudGlow / cloudLit: how strongly, and in what colour, the clouds are lit from below.
const ARC_MIDDAY = { ...MIDDAY, obj: MCM_OBJ.midday, cloudGlow: 0, cloudLit: '#fffaf0' };
const ARC_SUNSET = { ...SUNSET, obj: MCM_OBJ.sunset, cloudGlow: 0.55, cloudLit: '#ffc987' };
// Mid-afternoon: the turquoise holds overhead, the horizon warms to straw, the steel
// deepens to a brick red.
const ARC_AFTERNOON = over(blend(ARC_MIDDAY, ARC_SUNSET, 0.22), {
  id: 'midday', dryL: MIDDAY.dryL, dryD: MIDDAY.dryD,
  sky: ['#3495a7', '#51a9b3', '#80bebb', '#bcd4bb', '#f0d9a6'],
  streak: '#e2efdc', streakA: 0.28,
  sun: { disc: '#fff8df', plate: '#f4c04a', ray: '#fffbeb', halo: '#f5efcd', haloA: 0.22 },
  cloud: ['#f1e9d8', '#fffaf0'], cloudA: [0.5, 0.88],
  obj: { plate: '#a84c33', plateDark: '#7e3726', alt: '#6f8b8e' },
  pump: { plate: '#a84c33' },
});
// Golden hour: a dusty mauve overhead falling to rose, amber and gold at the horizon;
// the steel has turned to a deep teal to stand against it.
const ARC_GOLDEN = over(blend(ARC_MIDDAY, ARC_SUNSET, 0.62), {
  id: 'sunset', dryL: SUNSET.dryL, dryD: SUNSET.dryD,
  sky: ['#8a86a8', '#b6929f', '#daa17e', '#edb971', '#f6d590'],
  streak: '#fbe3b8', streakA: 0.26,
  sun: { disc: '#fff3cf', plate: '#f2b23a', ray: '#fff5d8', halo: '#fbd88c', haloA: 0.22 },
  cloud: ['#e7ad97', '#fbe1bb'], cloudA: [0.44, 0.74], cloudGlow: 0.25, cloudLit: '#ffe2a8',
  obj: { plate: '#2c6f6e', plateDark: '#1f5352', alt: '#b36372' },
  pump: { plate: '#2c6f6e' },
});
// Early evening: the sun is down. Indigo overhead through violet and a magenta band to
// a coral and amber afterglow on the horizon; the clouds lit from underneath; the land
// cooled toward violet but still read; the steel gone to a dark slate that holds as a
// silhouette; an evening star out. Built from SUNSET with every colour pulled a third of
// the way to twilight, then the sky, sun, clouds and steel authored.
const TWILIGHT = '#3b3162';
const ARC_DUSK = over(mapColours(ARC_SUNSET, (c) => mixHex(c, TWILIGHT, 0.34)), {
  id: 'sunset', ink: '#1f1522',
  sky: ['#2c2d5a', '#4e3b6c', '#8f4d6e', '#d8694f', '#efa05a'],
  streak: '#f0b98a', streakA: 0.2,
  sun: { disc: '#ffd9a0', plate: '#e8723a', ray: '#ffcf9a', halo: '#f29a5e', haloA: 0.26 },
  cloud: ['#5e4c80', '#6e5a8e'], cloudA: [0.8, 0.96], cloudInk: 0.3, cloudGlow: 1, cloudLit: '#f28a6c',
  bird: '#1f1522', birdSlip: '#8f4d6e',
  shade: '#2a2450', shadeA: 0.42,
  obj: { plate: '#27434c', plateDark: '#1a2f36', cream: '#e8d6c8', glass: '#f4b36a' },
  pump: { plate: '#27434c', tank: '#27434c', tankRim: '#1a2f36', water: '#f0a060' },
});
export const ARC_KEYS = [
  { at: 0, name: 'MIDDAY', pal: ARC_MIDDAY },
  { at: 1 / 3, name: 'AFTERNOON', pal: ARC_AFTERNOON },
  { at: 2 / 3, name: 'GOLDEN', pal: ARC_GOLDEN },
  { at: 0.85, name: 'SUNSET', pal: ARC_SUNSET },
  { at: 1, name: 'DUSK', pal: ARC_DUSK },
];

// The palette at act position u (0 = speed-1's first frame, 1 = speed-3's last).
// Blends are cached by u to 1/600 of the act, far finer than a step anyone could see.
const ARC_STEPS = 600;
const arcCache = new Map();
export function arcPalette(u) {
  const q = Math.round(Math.max(0, Math.min(1, Number.isFinite(u) ? u : 0)) * ARC_STEPS);
  let pal = arcCache.get(q);
  if (pal) return pal;
  const v = q / ARC_STEPS;
  let i = 0;
  while (i < ARC_KEYS.length - 2 && v > ARC_KEYS[i + 1].at) i++;
  const a = ARC_KEYS[i];
  const b = ARC_KEYS[i + 1];
  const k = (v - a.at) / (b.at - a.at);
  pal = blend(a.pal, b.pal, k);
  pal.id = k < 0.5 ? a.pal.id : b.pal.id;
  pal.arcStep = q;
  if (arcCache.size > 700) arcCache.clear();
  arcCache.set(q, pal);
  return pal;
}
// Where in the act a point of a stage is: stage 1..3, p 0..1 through it.
export const actU = (stage, p) => (Math.max(1, Math.min(3, stage)) - 1 + Math.max(0, Math.min(1, p))) / 3;
// The sun sinks and swells as the light warms; by sunset it is going behind the mesas.
// Card units: (380, y) on the 480x270 card, the horizon at 198.
export function arcSun(u) {
  const SET = 0.85;
  if (u > SET) {
    const k = (u - SET) / (1 - SET);
    return { x: 380, y: 130 + 110 * k * k, r: 27 };
  }
  const v = u / SET;
  const e = v * v * (3 - 2 * v);
  return { x: 380, y: 34 + 96 * e ** 1.3, r: 21 + 6 * e };
}
// The evening star, fading in as the sun goes down: a small four-point starburst at
// card (96, 44), placed in `V`'s sky.
export function eveningStar(ctx, u, V = CARD_VIEW) {
  const a = Math.max(0, Math.min(1, (u - 0.88) / 0.1));
  if (a <= 0) return;
  const x = V.left + (96 / 480) * (V.right - V.left);
  const y = skyY(V, 44);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = '#fff6e0';
  ctx.beginPath();
  ctx.arc(x, y, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff6e0';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y);
  ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 5);
  ctx.stroke();
  ctx.restore();
}
// The lane's light: nothing through the day, a warm cast from golden hour to sunset,
// then cooling and darkening into dusk (a veil toward twilight violet, never black, so
// the hero and the road still read). { color, a } or null.
export function laneTint(u) {
  const WARM = '#f08a50';
  const DUSK_VEIL = '#2c2552';
  if (!(u >= 0.6)) return null;
  if (u < 0.85) return { color: WARM, a: 0.1 * ((u - 0.6) / 0.25) };
  const k = Math.min(1, (u - 0.85) / 0.15);
  return { color: mixHex(WARM, DUSK_VEIL, Math.min(1, k * 1.4)), a: 0.1 + 0.3 * k };
}

// THE TEXTURES ARE BAKED BEFORE THE STAGE STARTS (game/art-warmup.js): eight 256 px tiles,
// ~35 ms from cold, which would otherwise all land on the run's first frame, after the
// song has started. One job a tile. Every palette of the arc keys its textures on its
// nearest keyframe's id, so these two cover the whole act.
export function speedMcmWarmJobs() {
  return [MIDDAY, SUNSET].flatMap((pal) => TEX_KINDS.map((kind) => () => { bakedTex(pal, kind); }));
}
