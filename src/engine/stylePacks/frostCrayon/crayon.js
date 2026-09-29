// FROST FORTRESS — WAX CRAYON. Frost's SKY ships from here (./sky.js, 29 Sep 2026); the
// full crayon world below it is the bake-off's, kept for the lab's cards.
//
// Soft crayon and coloured pencil in the manner of Raymond Briggs's The Snowman: directional hatching broken by the paper's tooth, wobbly
// doubled-back outlines, snow shaded with contour strokes that follow the hills. One
// painter, two papers:
//   WHITE PAPER — the untouched sheet IS the snow; crayon goes only where there is colour
//                 (sky, rock, trees, the keep, the bears' shading, snow in shadow).
//   BLUE-GREY PAPER — a pale blue-grey stock, the snow laid in as white crayon over it.
//
// The crayon kit (the tooth mask, the hatch, the wobble, the baking) is the Crypt crayon
// candidate's (src/dev/crypt-styles/crayon.js), copied rather than imported because that
// file exports only its style; the frost painting is new.
//
// Nothing crawls: every stroke is seeded by the thing it belongs to and laid out in that
// thing's own frame (a ridge in its layer's u, an item at its foot, a curtain at its own
// corner), and the tooth is pinned to the same frame, snapped to whole device pixels. The
// sky, each ridge (as a seamless strip one period long), each item and the bears' walk
// cycle are baked once per device scale (capped at 2.5), so a frame is blits plus the
// live aurora, stars and window light.

import { FROST_PLAN, ridgeU } from './plan.js';

const TAU = Math.PI * 2;
const HAND = 1.08; // the hand's hatch angle, radians above horizontal: strokes rise to the right
const smooth = (a, b, v) => { const u = Math.max(0, Math.min(1, (v - a) / (b - a))); return u * u * (3 - 2 * u); };
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// ------------------------------------------------------------------ determinism
function hash(a, b = 0, c = 0) {
  let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (b | 0) ^ (h >>> 13), 0xc2b2ae35);
  h = Math.imul(h ^ (c | 0) ^ (h >>> 16), 0x27d4eb2f);
  return (h ^ (h >>> 15)) >>> 0;
}
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const h01 = (a, b, c) => hash(a, b, c) / 4294967296;
function strHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// ------------------------------------------------------------------ the boxes of crayons
// Per stage (1 day, 2 low sun, 3 dusk) and per paper. Authored from the shipped light
// (plan.js FROST_LIGHT): the sky's two stops, the far and near hill colours, the fold.
const PAPERS = {
  white: { id: 'white', sheet: '#f8f6ee', grain: 5, snowIsPaper: true },
  grey: { id: 'grey', sheet: '#bcc7d3', grain: 8, snowIsPaper: false },
};

const DAY = {
  sky: [
    { v: 0.0, cols: ['#86b1de', '#91b9e3'], keep: 0.95, press: 1 },
    { v: 0.32, cols: ['#9fc4ea', '#a9cbec'], keep: 0.78, press: 0.9 },
    { v: 0.62, cols: ['#bcd7f0', '#c6ddf2'], keep: 0.5, press: 0.75 },
    { v: 1.0, cols: ['#d4e6f6'], keep: 0.22, press: 0.6 },
  ],
  cross: 0.25,
  skyWash: 0.62,
  glow: null,
  stars: 0,
  cloud: '#ffffff', cloudA: 0.45,
  ribbon: ['#8bc4d4', '#a5b4d5'], ribbonA: 0.55,
  snowTint: null,
  far: { shade: ['#a9c3e0', '#b3c6e6'], crest: '#8fb0d6', crestA: 0.8, seam: '#9dbadb', rim: null, wash: ['#dce8f4', 0.55] },
  near: { shade: ['#8badd4', '#96abd8'], crest: '#6f93c0', crestA: 0.9, seam: '#86a3cc', rim: null, wash: null },
  fold: { cols: ['#7094c0', '#7a90c4'], deep: '#5f7cab', crest: '#58739f', wash: ['#8ba8cc', 0.8] },
  pine: { body: ['#2f5d62', '#386b6a'], dark: '#244a50', line: '#1f3f45', trunk: '#4d3d3b' },
  rock: { body: ['#7890ab', '#8198b2'], lit: ['#adc3d7'], dark: '#566f8b', line: '#4b6380' },
  glacier: { body: ['#9ab2cf', '#a3b9d4'], lit: ['#c6d8ea'], dark: '#8aa3c3', line: '#86a0c2' },
  keep: {
    dark: ['#6e87a6', '#7690ad'], lit: ['#a5bcd3'], mid: ['#8aa2bd'], deep: '#556d8c',
    line: '#4f6786', course: '#5d7594', warm: '#f2a93f', core: '#ffd97a', unlit: '#7e8190',
    banner: '#b8525a',
  },
  bear: { fur: '#f3ead3', shade: '#9fb1c9', line: '#66707f', dark: '#2a2626' },
  aurora: { foot: '#dafff0', body: '#78dcae', upper: '#86d4cf', tip: '#b3a6e6', glow: '#8fe0bb' },
  glowGain: 0.45,
};

const DUSK = {
  sky: [
    { v: 0.0, cols: ['#232d66', '#28326d'], keep: 0.97, press: 1.05 },
    { v: 0.2, cols: ['#2f3f82', '#35448a'], keep: 0.97, press: 1.05 },
    { v: 0.42, cols: ['#4d5698', '#565b9c'], keep: 0.95, press: 1 },
    { v: 0.6, cols: ['#7f6c9f', '#8f71a0'], keep: 0.93, press: 1 },
    { v: 0.74, cols: ['#c0848f', '#cb8e8d'], keep: 0.93, press: 1 },
    { v: 0.87, cols: ['#e5a07f', '#eaae86'], keep: 0.95, press: 1 },
    { v: 1.0, cols: ['#f2c28c', '#f5cf98'], keep: 0.97, press: 1 },
  ],
  cross: 0.7,
  skyWash: 0.78,
  glow: { cols: ['#f6d49a', '#f3bd8c'], y0: 150, y1: 200 },
  stars: 34,
  cloud: '#9a93c8', cloudA: 0.35,
  ribbon: ['#a2b4db', '#8cc8d1'], ribbonA: 0.45,
  snowTint: { col: ['#c9c6e6', '#d3cde9'], cover: 0.5, alpha: 0.75 },
  far: { shade: ['#8c8fc4', '#9790c4'], crest: '#a9a8dc', crestA: 0.7, seam: '#8286bc', rim: '#f3c3a0', wash: ['#aeacd6', 0.6] },
  near: { shade: ['#7474b0', '#7d73ae'], crest: '#5f63a0', crestA: 0.85, seam: '#6d6ea8', rim: '#eeb9a0', wash: ['#dcd8ee', 0.35] },
  fold: { cols: ['#545a93', '#5f5694'], deep: '#474c83', crest: '#43477b', wash: ['#6a6ea4', 0.85] },
  pine: { body: ['#1f2f4d', '#27385a'], dark: '#18233f', line: '#141c34', trunk: '#2e2638' },
  rock: { body: ['#5d6898', '#66709f'], lit: ['#8b90c0'], dark: '#434b7a', line: '#383f6c' },
  glacier: { body: ['#6f77aa', '#777eae'], lit: ['#9ea3cf'], dark: '#5e6598', line: '#5c6296', rim: '#f0b99a' },
  keep: {
    dark: ['#3d4574', '#434a79'], lit: ['#737aab'], mid: ['#565d8e'], deep: '#2d3359',
    line: '#262b4d', course: '#30365e', warm: '#ffb341', core: '#ffe39a', unlit: '#4a4660',
    banner: '#9a4a66',
  },
  bear: { fur: '#dcd6ea', shade: '#8e8fbe', line: '#5c5c86', dark: '#1d1a22' },
  aurora: { foot: '#d2ffe6', body: '#5fdca3', upper: '#5fc9c4', tip: '#b48ce8', glow: '#45c28e' },
  glowGain: 1,
};

// Frost-2's low sun, for completeness (the bake-off paints stages 1 and 3).
const LOW_SUN = {
  ...DAY,
  sky: [
    { v: 0.0, cols: ['#7aa2d4', '#86abd8'], keep: 0.95, press: 1 },
    { v: 0.4, cols: ['#a3bfe0', '#b3c6e2'], keep: 0.8, press: 0.9 },
    { v: 0.72, cols: ['#e3cdbd', '#ead3bf'], keep: 0.7, press: 0.85 },
    { v: 1.0, cols: ['#f2dcc4'], keep: 0.6, press: 0.8 },
  ],
  glowGain: 0.7,
};

function boxFor(stage, P) {
  const B = stage === 3 ? DUSK : stage === 2 ? LOW_SUN : DAY;
  if (P.snowIsPaper) return B;
  // Blue-grey stock: the snow is white crayon, and the pale end of the sky has to be
  // laid in (the paper is darker than it).
  const snow = stage === 3
    ? { col: ['#dcd6ee', '#e4def2'], cover: 0.6, alpha: 0.95 }
    : { col: ['#ffffff', '#f7fafd'], cover: 0.62, alpha: 1 };
  const sky = stage === 3 ? B.sky : [
    { v: 0.0, cols: ['#7fabdb', '#8ab3df'], keep: 0.95, press: 1 },
    { v: 0.32, cols: ['#9dc1e6', '#a6c6e8'], keep: 0.8, press: 0.9 },
    { v: 0.62, cols: ['#bcd4ec', '#c6daef'], keep: 0.6, press: 0.8 },
    { v: 1.0, cols: ['#d0e1f2', '#d9e7f4'], keep: 0.45, press: 0.75 },
  ];
  const far = stage === 3 ? { ...B.far, wash: ['#c2bde0', 0.55] } : { ...B.far, wash: ['#dfe7f1', 0.3] };
  const near = stage === 3 ? { ...B.near, wash: ['#d8d2ec', 0.5] } : { ...B.near, wash: ['#f7f9fc', 0.4] };
  return {
    ...B, sky, far, near, snowTint: snow, skyWash: stage === 3 ? B.skyWash : 0.3,
    cloudA: stage === 3 ? B.cloudA : 0.3,
    bear: { ...B.bear, fur: stage === 3 ? '#e6e0f2' : '#fbf6ea' },
  };
}

// ------------------------------------------------------------------ paper and tooth
// One square of paper tooth per device scale, baked once. `rank` is the tooth height
// equalised to 0..1, so a crayon of cover 0.6 lands on the highest 60 % of the paper and
// skips the pits, the way wax does.
const TILE = 64; // user px
const PAT_CAP = 120;
// How soft the edge between wax and a pit is, in tooth rank: wider leaves the shallow pits
// half-filled, the way a soft crayon smears, rather than a hard speck of bare paper.
const RAMP = 0.2; // patterns kept; the rest are rebuilt on demand (bakes only)
const STORE = new Map();
let S = null;

function makeCanvas(w, h) {
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }
  return new OffscreenCanvas(w, h);
}

function valueNoise(cells, seed, N) {
  const R = rng(seed);
  const g = new Float32Array(cells * cells);
  for (let i = 0; i < g.length; i++) g[i] = R();
  return (x, y) => {
    const fx = (x / N) * cells;
    const fy = (y / N) * cells;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    let tx = fx - x0;
    let ty = fy - y0;
    tx = tx * tx * (3 - 2 * tx);
    ty = ty * ty * (3 - 2 * ty);
    const xa = x0 % cells;
    const xb = (x0 + 1) % cells;
    const ya = (y0 % cells) * cells;
    const yb = ((y0 + 1) % cells) * cells;
    const a = g[ya + xa] + (g[ya + xb] - g[ya + xa]) * tx;
    const b = g[yb + xa] + (g[yb + xb] - g[yb + xa]) * tx;
    return a + (b - a) * ty;
  };
}

function buildStore(k) {
  const N = Math.round(TILE * k);
  const R = rng(0x7007);
  const grain = new Float32Array(N * N);
  for (let i = 0; i < grain.length; i++) grain[i] = R();
  const soft = new Float32Array(N * N);
  const G = (x, y) => grain[((y + N) % N) * N + ((x + N) % N)];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      soft[y * N + x] = k > 1
        ? 0.52 * G(x, y) + 0.12 * (G(x - 1, y) + G(x + 1, y) + G(x, y - 1) + G(x, y + 1))
        : G(x, y);
    }
  }
  if (k > 1) {
    // A second, wider softening: a pit is a soft speck two or three device px across, the
    // tooth of cartridge paper, not pixel noise.
    const tmp = new Float32Array(soft);
    const T = (x, y) => tmp[((y + N) % N) * N + ((x + N) % N)];
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        soft[y * N + x] = 0.4 * T(x, y) + 0.1 * (T(x - 1, y) + T(x + 1, y) + T(x, y - 1) + T(x, y + 1))
          + 0.05 * (T(x - 1, y - 1) + T(x + 1, y - 1) + T(x - 1, y + 1) + T(x + 1, y + 1));
      }
    }
  }
  const mid = valueNoise(32, 11, N);
  const coarse = valueNoise(4, 12, N);
  // Paper fibres: short faint streaks, mostly along the sheet.
  const fib = new Float32Array(N * N);
  const Rf = rng(0xf1b);
  for (let q = 0; q < (N * N) / (90 * k); q++) {
    let x = Rf() * N;
    let y = Rf() * N;
    const a = (Rf() - 0.5) * 0.9;
    const len = (3 + Rf() * 8) * k;
    for (let d = 0; d < len; d++) {
      fib[(Math.floor(y + N) % N) * N + (Math.floor(x + N) % N)] += 0.5;
      x += Math.cos(a);
      y += Math.sin(a);
    }
  }
  const n = new Float32Array(N * N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      n[i] = 0.86 * soft[i] + 0.09 * mid(x, y) + 0.05 * coarse(x, y) + 0.05 * Math.min(1, fib[i]);
    }
  }
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of n) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const BINS = 4096;
  const hist = new Uint32Array(BINS);
  for (const v of n) hist[Math.min(BINS - 1, Math.floor(((v - lo) / (hi - lo)) * BINS))]++;
  const cdf = new Float32Array(BINS);
  let acc = 0;
  for (let b = 0; b < BINS; b++) { acc += hist[b]; cdf[b] = acc / n.length; }
  const rank = new Float32Array(N * N);
  for (let i = 0; i < n.length; i++) rank[i] = cdf[Math.min(BINS - 1, Math.floor(((n[i] - lo) / (hi - lo)) * BINS))];
  return { k, N, rank, pats: new Map(), papers: new Map(), sprites: new Map() };
}

// The device scale, to the nearest half and capped at 2.5: every bake is made at it. Or a
// fixed `scale`, for a painter whose context's scale moves in play (the shipped sky: the
// quality ladder and the intro zoom both change it, and each new scale is a new bake).
function prepare(ctx, scale = null) {
  const m = ctx.getTransform();
  const k = Number.isFinite(scale) ? scale
    : Math.max(1, Math.min(2.5, Math.round(Math.hypot(m.a, m.b) * 2) / 2));
  S = STORE.get(k);
  if (!S) { S = buildStore(k); STORE.set(k, S); }
}

function hexRgb(h) {
  const v = parseInt(h.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
function mixHex(a, b, t) {
  const A = hexRgb(a);
  const B = hexRgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

function tile(ctx, fillPx) {
  const c = makeCanvas(S.N, S.N);
  const x = c.getContext('2d');
  const img = x.createImageData(S.N, S.N);
  fillPx(img.data);
  x.putImageData(img, 0, 0);
  return ctx.createPattern(c, 'repeat');
}

// The pattern maps one tile pixel to 1/k user px with its origin on a whole device pixel
// of the current frame, so the tooth rides with whatever frame is current.
const PM = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
function align(ctx, p) {
  const m = ctx.getTransform();
  PM.a = PM.d = 1 / S.k;
  PM.e = (Math.round(m.e) - m.e) / m.a;
  PM.f = (Math.round(m.f) - m.f) / m.d;
  p.setTransform(PM);
  return p;
}

function wax(ctx, colour, cover) {
  cover = Math.max(0.05, Math.min(0.98, Math.round(cover * 40) / 40));
  const key = colour + cover;
  let p = S.pats.get(key);
  if (p) {
    S.pats.delete(key);
    S.pats.set(key, p);
  } else {
    const [r, g, b] = hexRgb(colour);
    const lo = 1 - cover;
    p = tile(ctx, (d) => {
      for (let i = 0; i < S.rank.length; i++) {
        let a = (S.rank[i] - lo) / RAMP + 0.5;
        a = a < 0 ? 0 : a > 1 ? 1 : a;
        d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = a * 255;
      }
    });
    S.pats.set(key, p);
    if (S.pats.size > PAT_CAP) S.pats.delete(S.pats.keys().next().value);
  }
  return align(ctx, p);
}

let PAPER = PAPERS.white;
function paper(ctx) {
  let p = S.papers.get(PAPER.id);
  if (!p) {
    const [r, g, b] = hexRgb(PAPER.sheet);
    const amp = PAPER.grain;
    p = tile(ctx, (d) => {
      for (let i = 0; i < S.rank.length; i++) {
        const v = (S.rank[i] - 0.5) * amp;
        d[i * 4] = r + v; d[i * 4 + 1] = g + v; d[i * 4 + 2] = b + v * 1.2; d[i * 4 + 3] = 255;
      }
    });
    S.papers.set(PAPER.id, p);
  }
  return align(ctx, p);
}

// ------------------------------------------------------------------ crayon primitives
function crayon(ctx, path, colour, width, alpha, cover = 0.7) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = width;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.strokeStyle = wax(ctx, colour, cover);
  ctx.stroke(path);
}

function back(ctx, path, rule = 'nonzero') {
  ctx.globalAlpha = 1;
  ctx.fillStyle = paper(ctx);
  ctx.fill(path, rule);
}

const BUCKET = [0.5, 0.75, 1];
const PRESS = [0.86, 1, 1.1];

// Hand hatching over [x0,x1]x[y0,y1] of the current frame: rows of parallel strokes in
// patches that share a length, a tilt and a pressure, the grid anchored at the frame's
// origin so the strokes belong to the thing. `gate(px, py, halfH)` scores a patch: 0
// skips it, lower presses lighter. `o.per` makes the rows repeat exactly every per px.
function hatch(ctx, seed, x0, y0, x1, y1, o, gate) {
  const { len, gap, width, cols, cover, alpha } = o;
  const patch = o.patch ?? 5;
  const ang = o.ang ?? HAND;
  const angJ = o.angJ ?? 0.07;
  const sa = Math.max(0.12, Math.abs(Math.sin(ang)));
  const rowH = o.rowH ?? len * sa * (o.rowK ?? 0.8);
  let gx = gap / sa;
  const nq = o.per ? Math.max(1, Math.round(o.per / (gx * patch))) : 0;
  if (nq) gx = o.per / (nq * patch);
  const paths = new Array(cols.length * 3).fill(null);
  const r0 = Math.floor(y0 / rowH) - 1;
  const r1 = Math.floor(y1 / rowH) + 1;
  for (let r = r0; r <= r1; r++) {
    const shift = h01(seed, r, 7) * gx * patch;
    const q0 = Math.floor((x0 - shift) / (gx * patch)) - 1;
    const q1 = Math.floor((x1 - shift) / (gx * patch)) + 1;
    for (let q = q0; q <= q1; q++) {
      const R = rng(hash(seed, nq ? ((q % nq) + nq) % nq : q, r));
      const L = len * (0.75 + R() * 0.5);
      const a = ang + (R() - 0.5) * 2 * angJ;
      const dx = Math.cos(a);
      const dy = -Math.sin(a);
      const py = r * rowH + (R() - 0.5) * rowH * 0.3;
      const px = shift + (q + 0.5) * gx * patch;
      const gr = R();
      let g = 1;
      if (gate) {
        g = gate(px, py, sa * L * 0.5 + 1.5);
        if (g <= 0 || gr > 0.72 + 0.28 * g) continue;
      }
      const ci = Math.floor(R() * cols.length);
      const key = ci * 3 + Math.min(2, Math.floor(R() * 3 * (0.4 + 0.6 * g)));
      const p = paths[key] || (paths[key] = new Path2D());
      const m = patch - (R() < 0.3 ? 1 : 0);
      for (let j = 0; j < m; j++) {
        const cx = shift + (q * patch + j + 0.5 + (R() - 0.5) * 0.3) * gx;
        const cy = py + (R() - 0.5) * 1.2;
        const t0 = -0.5 + R() * 0.16;
        const t1 = 0.5 - R() * 0.16;
        const bow = (R() - 0.5) * 1.2;
        const sx = cx + dx * L * t0;
        const sy = cy + dy * L * t0;
        const ex = cx + dx * L * t1;
        const ey = cy + dy * L * t1;
        p.moveTo(sx, sy);
        p.quadraticCurveTo((sx + ex) / 2 - dy * bow, (sy + ey) / 2 + dx * bow, ex, ey);
      }
    }
  }
  for (let k = 0; k < paths.length; k++) {
    if (paths[k]) crayon(ctx, paths[k], cols[(k / 3) | 0], width, alpha * BUCKET[k % 3], Math.min(0.95, cover * PRESS[k % 3]));
  }
}

// Append a hand-drawn line through flat pts [x,y,...] to path p: subdivided every ~3 px
// and pushed off the line by a smooth wobble seeded by the thing, measured along it.
function wob(p, pts, seed, amp = 0.45, closed = false, trim = 0) {
  const R = rng(seed);
  const f1 = 0.22 + R() * 0.18;
  const f2 = 0.6 + R() * 0.5;
  const p1 = R() * TAU;
  const p2 = R() * TAU;
  const n = pts.length / 2;
  const segs = closed ? n : n - 1;
  let d = 0;
  let first = true;
  for (let k = 0; k < segs; k++) {
    const ax = pts[2 * k];
    const ay = pts[2 * k + 1];
    const bx = pts[(2 * (k + 1)) % pts.length];
    const by = pts[(2 * (k + 1) + 1) % pts.length];
    const len = Math.hypot(bx - ax, by - ay) || 1e-6;
    const nx = -(by - ay) / len;
    const ny = (bx - ax) / len;
    const m = Math.max(1, Math.ceil(len / 3));
    for (let j = first ? 0 : 1; j <= m; j++) {
      const t = j / m;
      if (trim && ((k === 0 && t * len < trim) || (k === segs - 1 && (1 - t) * len < trim))) continue;
      const dd = d + t * len;
      const w = amp * (0.6 * Math.sin(dd * f1 + p1) + 0.4 * Math.sin(dd * f2 + p2));
      const x = ax + (bx - ax) * t + nx * w;
      const y = ay + (by - ay) * t + ny * w;
      if (first) { p.moveTo(x, y); first = false; } else p.lineTo(x, y);
    }
    d += len;
  }
}

// A crayon outline, gone round twice: the second pass starts somewhere else and lighter.
function outline(ctx, pts, seed, colour, width, alpha, closed = true, amp = 0.4) {
  const a = new Path2D();
  wob(a, pts, seed, amp, closed);
  crayon(ctx, a, colour, width, alpha, 0.72);
  const b = new Path2D();
  const n = pts.length / 2;
  let q = pts;
  if (closed && n > 2) {
    const k = 1 + (seed % (n - 1));
    q = pts.slice(2 * k).concat(pts.slice(0, 2 * k));
    q = q.concat(q.slice(0, 2));
  }
  wob(b, q, seed + 1, amp * 1.5, false, 1.2);
  crayon(ctx, b, colour, width * 0.8, alpha * 0.55, 0.55);
}

function polyPath(polys) {
  const p = new Path2D();
  for (const q of polys) {
    p.moveTo(q[0], q[1]);
    for (let k = 2; k < q.length; k += 2) p.lineTo(q[k], q[k + 1]);
    p.closePath();
  }
  return p;
}

function bbox(q) {
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (let k = 0; k < q.length; k += 2) {
    x0 = Math.min(x0, q[k]); x1 = Math.max(x1, q[k]);
    y0 = Math.min(y0, q[k + 1]); y1 = Math.max(y1, q[k + 1]);
  }
  return { x0, y0, x1, y1 };
}

// A filled shape: paper behind it, a hatch clipped to it, a doubled crayon outline.
// polys[0] is the outline, the rest are holes. o.cols null leaves it paper.
function solid(ctx, seed, polys, o) {
  const path = polyPath(polys);
  if (o.back !== false) back(ctx, path, 'evenodd');
  if (o.cols) {
    const w = o.wash ?? 0.5;
    if (w > 0) {
      ctx.globalAlpha = w * Math.min(1, o.alpha ?? 1);
      ctx.fillStyle = o.cols[0];
      ctx.fill(path, 'evenodd');
    }
    ctx.save();
    ctx.clip(path, 'evenodd');
    const b = bbox(polys[0]);
    hatch(ctx, seed, b.x0 - 2, b.y0 - 2, b.x1 + 2, b.y1 + 2, o, o.gate);
    if (o.over) hatch(ctx, seed + 9, b.x0 - 2, b.y0 - 2, b.x1 + 2, b.y1 + 2, o.over, o.over.gate);
    ctx.restore();
  }
  if (o.line) outline(ctx, polys[0], seed + 17, o.line, o.lw ?? 0.9, o.la ?? 0.7, true, o.lamp ?? 0.35);
}

// Snow: the paper itself on the white sheet, white crayon on the blue-grey one.
function snow(ctx, seed, polys, B, o = {}) {
  const tint = B.snowTint;
  solid(ctx, seed, polys, tint
    ? { cols: tint.col, cover: tint.cover * (o.press ?? 1), alpha: tint.alpha, len: o.len ?? 5, gap: o.gap ?? 1.1, width: 1.1, ang: o.ang ?? 0.35, patch: 3, line: o.line, lw: o.lw, la: o.la }
    : { cols: null, line: o.line, lw: o.lw, la: o.la });
}

function quadPts(out, x0, y0, cx, cy, x1, y1, n = 5) {
  for (let j = 1; j <= n; j++) {
    const t = j / n;
    const u = 1 - t;
    out.push(u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1);
  }
}
function strokeBundle(p, R, cx, cy, L, a, n, gap, bowAmp) {
  const dx = Math.cos(a);
  const dy = -Math.sin(a);
  const bow = (R() - 0.5) * bowAmp;
  for (let j = 0; j < n; j++) {
    const off = (j - (n - 1) / 2) * gap + (R() - 0.5) * 0.6;
    const t0 = -0.5 + R() * 0.12;
    const t1 = 0.5 - R() * 0.12;
    const sx = cx + dx * L * t0 - dy * off;
    const sy = cy + dy * L * t0 + dx * off;
    const ex = cx + dx * L * t1 - dy * off;
    const ey = cy + dy * L * t1 + dx * off;
    p.moveTo(sx, sy);
    p.quadraticCurveTo((sx + ex) / 2 - dy * bow, (sy + ey) / 2 + dx * bow, ex, ey);
  }
}

// ------------------------------------------------------------------ baking
function snap(v, scale, off) {
  return (Math.round(v * scale + off) - off) / scale;
}

function sprite(key, box, draw) {
  let sp = S.sprites.get(key);
  if (!sp) {
    const [x0, y0, x1, y1] = box.map(Math.round);
    const c = makeCanvas(Math.max(1, Math.ceil((x1 - x0) * S.k)), Math.max(1, Math.ceil((y1 - y0) * S.k)));
    const x = c.getContext('2d');
    x.setTransform(S.k, 0, 0, S.k, -x0 * S.k, -y0 * S.k);
    draw(x);
    sp = { c, x0, y0, w: x1 - x0, h: y1 - y0 };
    S.sprites.set(key, sp);
  }
  return sp;
}

function blit(ctx, sp, x, y) {
  const m = ctx.getTransform();
  ctx.globalAlpha = 1;
  ctx.drawImage(sp.c, snap(x + sp.x0, m.a, m.e), snap(y + sp.y0, m.d, m.f), sp.w, sp.h);
}

// A hand's wobble that repeats exactly every period P, so a strip has no seam.
function periodic(P, seed, amps) {
  const terms = amps.map(([amp, f], k) => [amp, Math.max(1, Math.round((f * P) / TAU)), seed * (1.3 + k)]);
  return (u) => {
    let v = 0;
    for (const [amp, n, ph] of terms) v += amp * Math.sin((TAU * n * u) / P + ph);
    return v;
  };
}

// ------------------------------------------------------------------ the sky
// Paper, then loose sweeps rising gently to the right, the colour picked from the stage's
// stops with a jitter so neighbouring bands interleave the way crayons blend; a lighter
// cross pass; at dusk the warm glow laid flat along the horizon. Frame-fixed, as the
// shipped sky is, so it is baked whole.
const SKY_H = 204;
// How far a sky bundle can reach from its centre: half its longest stroke (90 px), its
// spread and bow, and the line's width.
const SEAM_REACH = 64;
// `geo` places the sky: its top and bottom rows, the horizon its stops run to, and `wrap`
// to make it seamless every 480 px (the crayon-sky candidates tile it across a portrait
// picture). The full crayon cards use the frame-fixed default.
function bakeSky(key, B, geo = {}) {
  // `top` is where the stops start: the frame's top in landscape, the visible band's top
  // in portrait, whose sky runs far above the authored frame.
  const { y0 = 0, y1 = SKY_H, horizon = 196, top = 0, wrap = false } = geo;
  const span = horizon - top;
  const H0 = y1 - y0;
  return sprite(key, [0, y0, 480, y1], (x) => {
    x.fillStyle = paper(x);
    x.fillRect(-2, y0 - 2, 484, H0 + 4);
    // A soft first layer, rubbed in flat, so the tooth under the hatching shows a lighter
    // tone of the sky rather than bare paper.
    const g = x.createLinearGradient(0, top, 0, horizon);
    for (const st of B.sky) g.addColorStop(Math.min(1, st.v), st.cols[0]);
    x.globalAlpha = B.skyWash;
    x.fillStyle = g;
    x.fillRect(-2, y0 - 2, 484, H0 + 4);
    x.globalAlpha = 1;
    const groups = new Map();
    const add = (col, b, w) => {
      const k = col + b + w;
      let g = groups.get(k);
      if (!g) { g = { col, b, w, p: new Path2D() }; groups.set(k, g); }
      return g.p;
    };
    const pick = (v) => {
      const st = B.sky;
      let i = 0;
      while (i < st.length - 1 && v > (st[i].v + st[i + 1].v) / 2) i++;
      return st[i];
    };
    const pass = (seed, CW, CH, angle, angJ, Lmin, Lvar, keepK, jit) => {
      const nc = Math.round(480 / CW);
      for (let r = Math.floor(y0 / CH) - 2; r <= y1 / CH + 2; r++) {
        for (let cc = wrap ? 0 : -2; cc <= (wrap ? nc - 1 : 480 / CW + 2); cc++) {
          const R = rng(hash(seed, cc, r));
          const cx = (cc + R()) * (wrap ? 480 / nc : CW);
          const cy = (r + R()) * CH;
          const v = (cy - top) / span + (R() - 0.5) * jit;
          const band = pick(v);
          if (R() > band.keep * keepK) continue;
          const col = band.cols[Math.floor(R() * band.cols.length)];
          const b = Math.min(2, Math.floor(R() * 3 * band.press));
          const L = Lmin + R() * Lvar;
          const a = angle + (R() - 0.5) * angJ;
          const n = 3 + Math.floor(R() * 3);
          if (!wrap) strokeBundle(add(col, b, 1.8), R, cx, cy, L, a, n, 2.3, 4);
          else {
            // A copy a tile over only where the bundle reaches across the seam: the rest
            // would be stroked wholly off the canvas.
            const bs = hash(seed + 500, cc, r);
            for (const dx of [-480, 0, 480]) {
              if (Math.abs(cx + dx - 240) > 240 + SEAM_REACH) continue;
              strokeBundle(add(col, b, 1.8), rng(bs), cx + dx, cy, L, a, n, 2.3, 4);
            }
          }
        }
      }
    };
    pass(71, 30, 6.5, 0.16, 0.12, 34, 56, 1, 0.16);
    if (B.cross) pass(72, 34, 8, -0.07, 0.08, 26, 40, B.cross, 0.12);
    for (const g of groups.values()) crayon(x, g.p, g.col, g.w, 0.92 * BUCKET[g.b], 0.8 * PRESS[g.b]);
    if (B.glow) {
      // The last of the sun, pressed flat along the horizon behind the far hills.
      const p = [new Path2D(), new Path2D()];
      for (let r = 0; r < 18; r++) {
        for (let cc = -1; cc < 12; cc++) {
          const R = rng(hash(73, cc, r));
          const gy0 = horizon - (196 - B.glow.y0) * (span / 196);
          const gy1 = horizon - (196 - B.glow.y1) * (span / 196);
          const cy = gy0 + (gy1 - gy0) * (r + R()) / 18;
          const fr = (cy - gy0) / (gy1 - gy0);
          // Tiled (the crayon-sky candidates, whose glow can show above a portrait valley):
          // the glow thins to nothing at its top rather than starting on a row.
          if (R() > (wrap ? 0.02 + 0.93 * fr * fr : 0.25 + 0.7 * fr)) continue;
          if (!wrap) strokeBundle(p[R() < 0.6 ? 0 : 1], R, (cc + R()) * 44, cy, 30 + R() * 44, (R() - 0.5) * 0.06, 2 + Math.floor(R() * 2), 2.2, 2);
          else if (cc >= 0 && cc < 11) {
            const which = R() < 0.6 ? 0 : 1;
            const bs = hash(574, cc, r);
            for (const dx of [-480, 0, 480]) {
              const gx = (cc + 0.5) * (480 / 11) + dx;
              if (Math.abs(gx - 240) > 240 + SEAM_REACH) continue;
              strokeBundle(p[which], rng(bs), gx, cy, 30 + h01(575, cc, r) * 44, 0, 2 + (r % 2), 2.2, 2);
            }
          }
        }
      }
      crayon(x, p[0], B.glow.cols[0], 1.8, 0.8, 0.8);
      crayon(x, p[1], B.glow.cols[1], 1.8, 0.7, 0.75);
    }
  });
}

// Stars at dusk: small crayon crosses and specks, the bright ones twinkling.
function stars(ctx, f, B) {
  if (!B.stars) return;
  const lit = [new Path2D(), new Path2D(), new Path2D()];
  for (let k = 0; k < B.stars; k++) {
    const R = rng(hash(88, k));
    const x = R() * 480;
    const y = 6 + R() * R() * 96;
    const big = R() < 0.3;
    const tw = 0.5 + 0.5 * Math.sin(f.t * (1.1 + R() * 1.6) + R() * TAU);
    const p = lit[Math.min(2, Math.floor(tw * 3))];
    const a = R() * 0.7;
    if (big) {
      const L = 1.4 + R() * 1.2;
      p.moveTo(x - Math.cos(a) * L, y - Math.sin(a) * L);
      p.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L);
      p.moveTo(x + Math.sin(a) * L, y - Math.cos(a) * L);
      p.lineTo(x - Math.sin(a) * L, y + Math.cos(a) * L);
    } else {
      p.moveTo(x - 0.5, y + 0.2);
      p.lineTo(x + 0.5, y - 0.2);
    }
  }
  lit.forEach((p, i) => crayon(ctx, p, i === 2 ? '#fff6d8' : '#e8e6ff', 1.1, 0.35 + i * 0.3, 0.8));
}

// ------------------------------------------------------------------ the aurora
// The showpiece. A curtain is long waxy strokes standing on a wavy under-edge: pressed
// hard and near-white at the foot, green through the body, teal and then lilac towards
// the tips, which break off short the way a crayon lifts away. Behind them a broad, light
// scumble is the sky the curtain lights. The heights ride a slow smooth noise, so the
// top edge folds like a hung cloth instead of standing as a comb, and the rays drape a
// little one way and the other with the folds.
//
// The curtain is baked once in its own frame (its geometry is the curtain's, seeded per
// curtain and per ray), and it lives three ways at blit time: it drifts and breathes on
// the shipped clock, and two bright folds travel slowly along it — a few rays either
// side of each fold's centre redrawn pale and pressed, live, over the baked ones.
const AUR_SEG = [
  { s0: 0, s1: 0.14, key: 'foot', w: 1.45, a: 0.9, cover: 0.86 },
  { s0: 0.08, s1: 0.5, key: 'body', w: 1.35, a: 0.9, cover: 0.8 },
  { s0: 0.42, s1: 0.76, key: 'upper', w: 1.3, a: 0.8, cover: 0.72 },
  { s0: 0.66, s1: 1, key: 'tip', w: 1.25, a: 0.75, cover: 0.64 },
];
const RAYS = new Map();
function auroraRays(c, back = 0) {
  const key = `${c.i}:${c.w}:${c.h.toFixed(2)}:${back}`;
  let g = RAYS.get(key);
  if (g) return g;
  const R0 = rng(hash(904 + back * 37, c.i));
  const nf = [[R0() * TAU, 1.6 + R0() * 1.2, 0.2], [R0() * TAU, 4 + R0() * 2, 0.08], [R0() * TAU, 9 + R0() * 3, 0.03]];
  const hv = (fx) => 0.8 + nf.reduce((v, [ph, fq, a]) => v + a * Math.sin(fx * TAU * fq + ph), 0);
  const dph = R0() * TAU;
  const drape = (fx) => Math.sin(fx * TAU * 1.6 + dph);
  // The back fold hangs a little higher and its wave runs out of step with the front's.
  const lift = back ? -c.h * 0.16 : 0;
  const bph = back ? 1.9 : 0;
  const wave = (fx) => lift + Math.sin(c.phase + bph + fx * c.k) * c.amp * 1.5 + Math.sin(c.phase * 2.1 + fx * c.k * 2.2) * c.amp * 0.35;
  // Rays are laid one after another at an uneven spacing, each its own length (the fold
  // sets the height, the hand varies it by a quarter either way), so the top edge is soft
  // and ragged rather than stepped into blocks.
  const rays = [];
  let x = 1 + R0() * 2;
  for (let j = 0; x < c.w - 1; j++) {
    const R = rng(hash(903 + back * 37, c.i, j));
    const fx = x / c.w;
    const env = Math.pow(Math.sin(Math.PI * fx), 0.7);
    const hj = hv(fx);
    const H = Math.min(c.h * 1.02, c.h * env * hj * (0.84 + R() * 0.28)) * (back ? 0.9 : 1);
    x += (1.1 + R() * 1.6) * (back ? 1.6 : 1);
    if (H < 5) continue;
    const xb = fx * c.w;
    const yb = wave(fx) + (R() - 0.5) * 1.4;
    const lean = (xb - c.w / 2) * 0.05 * (H / c.h) + (drape(fx) * 6 + (R() - 0.5) * 1.4) * (H / c.h);
    const bow = (R() - 0.5) * 2 + drape(fx) * 2;
    const press = Math.max(0, Math.min(2, Math.floor((hj - 0.5) * 4 + R() * 1.6)));
    const w = 0.85 + R() * 0.35;
    const segs = AUR_SEG.map((sg) => {
      const s1 = sg.key === 'tip' ? sg.s1 - R() * 0.25 : sg.s1 - R() * 0.06;
      const s0 = sg.s0 + R() * 0.06;
      const skip = s1 <= s0 + 0.04 || (sg.key === 'foot' && R() < 0.25);
      return skip ? null : [s0, s1];
    });
    rays.push({ fx, xb, yb, H, lean, bow, press, w, segs });
  }
  g = { rays, wave };
  RAYS.set(key, g);
  return g;
}
const rayAt = (r, s) => [r.xb + r.lean * s + r.bow * 4 * s * (1 - s), r.yb - r.H * s];
function rayPath(p, r, s0, s1, steps = 3) {
  const [x0, y0] = rayAt(r, s0);
  p.moveTo(x0, y0);
  for (let q = 1; q <= steps; q++) {
    const [x1, y1] = rayAt(r, s0 + ((s1 - s0) * q) / steps);
    p.lineTo(x1, y1);
  }
}

function curtainSprite(key, c, B) {
  const A = B.aurora;
  return sprite(key, [-16, -c.h * 1.2 - 24, c.w + 16, c.amp * 2 + 16], (ctx) => {
    // The back fold first: fainter, cooler, no bright foot, so the curtain has a depth to
    // it where the two folds cross.
    const bk = auroraRays(c, 1);
    const bp = [new Path2D(), new Path2D()];
    for (const r of bk.rays) {
      rayPath(bp[0], r, 0.05, 0.6, 2);
      rayPath(bp[1], r, 0.5, 0.95 - (r.press === 0 ? 0.15 : 0), 2);
    }
    crayon(ctx, bp[0], A.upper, 1.2, 0.32, 0.58);
    crayon(ctx, bp[1], A.tip, 1.2, 0.32, 0.55);
    const { rays, wave } = auroraRays(c);
    // The sky it lights: a wide, light scumble up through the body and along the foot.
    const glow = new Path2D();
    const skirt = new Path2D();
    rays.forEach((r, j) => {
      if (j % 3 === 0) rayPath(glow, r, 0.02, 0.62, 2);
    });
    for (let fx = 0.04; fx < 0.96; fx += 0.03) {
      const R = rng(hash(905, c.i, Math.round(fx * 100)));
      const x = fx * c.w;
      skirt.moveTo(x - 6, wave(fx) + 1 + (R() - 0.5) * 2);
      skirt.lineTo(x + 7, wave(Math.min(1, fx + 0.02)) - 1 + (R() - 0.5) * 2);
    }
    const crown = new Path2D();
    rays.forEach((r, j) => {
      if (j % 3 === 1) rayPath(crown, r, 0.5, 0.95, 2);
    });
    crayon(ctx, glow, A.glow, 8, 0.34, 0.36);
    crayon(ctx, crown, A.tip, 7, 0.26, 0.32);
    crayon(ctx, skirt, A.glow, 7, 0.4, 0.36);
    // The rays, a colour per stretch of their length, three pressures.
    const paths = new Map();
    for (const r of rays) {
      AUR_SEG.forEach((sg, i) => {
        const sp = r.segs[i];
        if (!sp) return;
        const k = sg.key + r.press + (r.w > 1 ? 'w' : '');
        let p = paths.get(k);
        if (!p) { p = new Path2D(); paths.set(k, p); }
        rayPath(p, r, sp[0], sp[1]);
      });
    }
    for (const sg of AUR_SEG) {
      for (let b = 0; b < 3; b++) {
        for (const wk of ['', 'w']) {
          const p = paths.get(sg.key + b + wk);
          if (p) crayon(ctx, p, A[sg.key], sg.w * (wk ? 1.15 : 0.9), sg.a * BUCKET[b], sg.cover * PRESS[b]);
        }
      }
    }
    // The under-edge: a pale line pressed along the wave and broken where the hand lifted,
    // a softer green one just under it.
    const edge = new Path2D();
    const lo = new Path2D();
    for (let q = 0; q < 24; q++) {
      const R = rng(hash(906, c.i, q));
      if (R() < 0.18) continue;
      const a = q / 24 + R() * 0.01;
      const b = (q + 1) / 24 - R() * 0.012;
      const pts = [];
      const pl = [];
      for (let fx = a; fx <= b + 1e-6; fx += 0.008) {
        const env = Math.sin(Math.PI * fx);
        if (env < 0.25) continue;
        pts.push(fx * c.w, wave(fx) + 1);
        pl.push(fx * c.w, wave(fx) + 3);
      }
      if (pts.length > 3) wob(edge, pts, hash(907, c.i, q), 0.4);
      if (pl.length > 3 && R() < 0.7) wob(lo, pl, hash(908, c.i, q), 0.6);
    }
    crayon(ctx, lo, A.body, 1.5, 0.5, 0.7);
    crayon(ctx, edge, A.foot, 1.2, 0.55, 0.78);
  });
}

function aurora(ctx, f, B, keyBase) {
  const A = B.aurora;
  for (const c of f.aurora.curtains) {
    // How hard this curtain is pressed: the shipped alpha x stage gain, against frost-3's
    // brightest curtain, and the stage's own light (a day aurora is a pale hint).
    const vis = Math.min(1, (c.alpha / 0.35) * B.glowGain + 0.12) * c.breathe;
    if (vis < 0.05) continue;
    const sp = curtainSprite(`${keyBase}:aurora:${c.i}:${Math.round(c.h)}:${c.w}`, c, B);
    const m = ctx.getTransform();
    ctx.globalAlpha = vis;
    ctx.drawImage(sp.c, snap(c.x + sp.x0, m.a, m.e), snap(c.baseY + sp.y0, m.d, m.f), sp.w, sp.h);
    // Two bright folds travelling along the curtain, live.
    const { rays } = auroraRays(c);
    ctx.save();
    ctx.translate(snap(c.x, m.a, m.e), snap(c.baseY, m.d, m.f));
    const lit = [new Path2D(), new Path2D(), new Path2D()];
    const halo = new Path2D();
    let any = false;
    for (let q = 0; q < 2; q++) {
      const fc = ((f.t * 0.03 + q * 0.5 + c.i * 0.23) % 1) * 1.3 - 0.15;
      for (const r of rays) {
        const wgt = 1 - Math.abs(r.fx - fc) / 0.07;
        if (wgt <= 0.05) continue;
        any = true;
        const top = 0.3 + 0.35 * wgt;
        rayPath(lit[Math.min(2, Math.floor(wgt * 3))], r, 0.03, top, 2);
        if (wgt > 0.5) rayPath(halo, r, 0.05, top * 0.9, 2);
      }
    }
    if (any) {
      crayon(ctx, halo, A.body, 3.4, 0.22 * vis, 0.4);
      lit.forEach((p, b) => crayon(ctx, p, A.foot, 1.5, (0.25 + 0.3 * b) * vis, 0.8));
    }
    ctx.restore();
  }
}

// ------------------------------------------------------------------ clouds and ribbons
// The pack's cloud blobs as soft white (at dusk, lilac) crayon puffs, and its two wisp
// ribbons as long flat strokes along the ribbon's own curve; each baked in its own frame.
function cloudSprite(key, c, B) {
  return sprite(key, [-50, -20, 50, 20], (x) => {
    const R = rng(hash(44, c.i));
    const rows = [new Path2D(), new Path2D()];
    const lobes = [[-18, 2, 20, 9], [4, -3, 24, 11], [24, 3, 16, 7]];
    for (const [cx, cy, rx, ry] of lobes) {
      for (let y = -ry; y <= ry; y += 1.7) {
        const half = rx * Math.sqrt(Math.max(0, 1 - (y / ry) ** 2));
        if (half < 3) continue;
        const a = cx - half * (0.8 + R() * 0.25);
        const b = cx + half * (0.8 + R() * 0.25);
        const p = rows[y < 0 ? 0 : 1];
        p.moveTo(a, cy + y);
        p.quadraticCurveTo((a + b) / 2, cy + y - 0.6 + R() * 1.2, b, cy + y - 0.03 * (b - a));
      }
    }
    crayon(x, rows[1], B.cloud, 1.6, B.cloudA * 0.75, 0.66);
    crayon(x, rows[0], B.cloud, 1.6, B.cloudA, 0.7);
  });
}

function ribbonSprite(key, r, B) {
  return sprite(key, [-6, -r.tilt - 10, r.w + 6, r.h + 10], (x) => {
    const top = [];
    const bot = [];
    const w = r.w;
    const h = r.h;
    const q = (out, a, b, c) => { for (let j = 0; j <= 12; j++) { const t = j / 12; const u = 1 - t; out.push([u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]]); } };
    q(top, [0, h * 0.55], [w * 0.24, -r.tilt], [w * 0.52, h * 0.35]);
    q(top, [w * 0.52, h * 0.35], [w * 0.78, h * 0.72], [w, h * 0.2]);
    q(bot, [0, h], [w * 0.22, h * 0.34], [w * 0.48, h * 0.67]);
    q(bot, [w * 0.48, h * 0.67], [w * 0.74, h * 1.04], [w, h * 0.75]);
    const R = rng(hash(45, r.i));
    const ps = [new Path2D(), new Path2D()];
    for (let l = 0; l < 6; l++) {
      const lam = 0.12 + (l / 5) * 0.76;
      const s0 = R() * 0.12;
      const s1 = 1 - R() * 0.14;
      const pts = [];
      for (let j = 0; j < top.length; j++) {
        const s = j / (top.length - 1);
        if (s < s0 || s > s1) continue;
        pts.push(top[j][0] + (bot[j][0] - top[j][0]) * lam, top[j][1] + (bot[j][1] - top[j][1]) * lam);
      }
      if (pts.length > 3) wob(ps[l % 2], pts, hash(46, r.i, l), 0.5);
    }
    crayon(x, ps[0], B.ribbon[0], 1.6, B.ribbonA, 0.5);
    crayon(x, ps[1], B.ribbon[1], 1.5, B.ribbonA * 0.85, 0.48);
  });
}

// ------------------------------------------------------------------ the snow hills
// Each ridge is baked as a seamless strip one period long. Paper (or white crayon) is the
// snow; the form is drawn with CONTOUR strokes — short lines following the crest at
// increasing depth, the way a pencil models a snowdrift — kept where the hill turns away
// from the light (upper left), dense in the creases between hills and deeper down, and
// left out on the lit flanks so the paper shows. Then the crest line, gone over twice and
// broken where the hand lifted, and the shipped finish's seams as light strokes.
const RIDGE = {
  far: { seed: 101, gap: 2.6, maxDepth: 70, chunk: 18, width: 1.15, alpha: 0.8, cover: 0.62, crestW: 1.1, bottom: 206 },
  near: { seed: 202, gap: 2.3, maxDepth: 84, chunk: 16, width: 1.3, alpha: 0.9, cover: 0.7, crestW: 1.35, bottom: 240 },
};

function contours(ctx, P, rid, seed, o, gate) {
  const nC = Math.max(1, Math.round(P / o.chunk));
  const cw = P / nC;
  const groups = new Map();
  let d = o.d0 ?? 2.5;
  for (let row = 0; d <= o.maxDepth; row++) {
    const stagger = h01(seed, row, 3) * cw;
    for (let q = -1; q <= nC; q++) {
      const qi = ((q % nC) + nC) % nC;
      const R = rng(hash(seed, qi, row));
      const u0 = q * cw + stagger + (R() - 0.5) * cw * 0.3;
      const u1 = u0 + cw * (0.6 + R() * 0.55);
      const g = gate((u0 + u1) / 2, d);
      if (g <= 0 || R() > 0.2 + g) continue;
      const ci = Math.floor(R() * o.cols.length);
      const b = Math.min(2, Math.floor(g * 2.4 + R() * 0.8));
      const k = ci * 3 + b;
      let p = groups.get(k);
      if (!p) { p = new Path2D(); groups.set(k, p); }
      const ph = R() * TAU;
      const dj = d + (R() - 0.5) * o.gap * 0.5;
      let first = true;
      for (let u = u0; u <= u1 + 0.01; u += 3) {
        const y = rid(u) + dj * (1 + 0.1 * Math.sin((u - u0) * 0.05 + ph)) + 0.35 * Math.sin((u - u0) * 0.4 + ph);
        if (first) { p.moveTo(u, y); first = false; } else p.lineTo(u, y);
      }
    }
    d += o.gap * (1 + d / 60);
  }
  for (const [k, p] of groups) crayon(ctx, p, o.cols[(k / 3) | 0], o.width, o.alpha * BUCKET[k % 3], Math.min(0.95, o.cover * PRESS[k % 3]));
}

function ridgeStrip(key, f, name, B) {
  const L = f.layers[name];
  const Ls = FROST_PLAN[name];
  const P = L.period;
  const st = RIDGE[name];
  const C = B[name];
  const rid = (u) => ridgeU(Ls, u);
  const top = Ls.base - Ls.amp;
  const box = [0, Math.floor(top - 6), P, st.bottom];
  return sprite(key, box, (ctx) => {
    const M = 24;
    const seed = st.seed;
    const edge = periodic(P, seed, [[0.4, 0.37], [0.25, 1.13]]);
    const crest = (u) => rid(u) + edge(u);
    const path = new Path2D();
    path.moveTo(-M, 340);
    for (let u = -M; u <= P + M; u += 2) path.lineTo(u, crest(u));
    path.lineTo(P + M, 340);
    path.closePath();
    back(ctx, path);
    if (C.wash) {
      ctx.globalAlpha = C.wash[1];
      ctx.fillStyle = C.wash[0];
      ctx.fill(path);
      ctx.globalAlpha = 1;
    }
    ctx.save();
    ctx.clip(path);
    const slope = (u) => (rid(u + 2) - rid(u - 2)) / 4;
    const hN = (u) => (Ls.base - rid(u)) / Ls.amp;
    // Snow laid in: flat, long strokes (white crayon on the grey sheet; at dusk a lilac
    // veil on the white one, the snow taking the evening's colour).
    // On the white sheet the near snow stays paper even at dusk: the evening is in its
    // shading, and the lit flanks keep the sheet's own white.
    if (B.snowTint && !(PAPER.snowIsPaper && name === 'near')) {
      hatch(ctx, seed + 5, -M, top - 4, P + M, box[3], {
        cols: B.snowTint.col, cover: B.snowTint.cover * (name === 'far' ? 0.85 : 1), alpha: B.snowTint.alpha * (name === 'far' ? 0.8 : 1),
        len: 16, gap: 1.5, width: 1.5, ang: 0.3, angJ: 0.1, patch: 4, per: P,
      }, (x, y, ext) => (y + ext < crest(x) - 1 ? 0 : 1));
    }
    const shadeGate = (u, d) => {
      const s = slope(u);
      const side = smooth(-0.08, 0.45, s);
      const crease = 1 - smooth(0.04, 0.42, hN(u));
      const y = rid(u) + d;
      const low = name === 'near' ? smooth(176, 204, y) * 0.55 : smooth(168, 196, y) * 0.3;
      const lit = (1 - side) * (1 - smooth(4, 26, d)) * 0.5;
      return clamp01(side * 0.8 + crease * 0.65 + smooth(12, 60, d) * 0.28 + low - lit - 0.08);
    };
    contours(ctx, P, rid, seed, { cols: C.shade, gap: st.gap, maxDepth: st.maxDepth, chunk: st.chunk, width: st.width, alpha: st.alpha, cover: st.cover }, shadeGate);
    // In the creases and low down, the hand goes over the contours with a diagonal hatch.
    hatch(ctx, seed + 7, -M, top, P + M, box[3], {
      cols: C.shade, cover: st.cover * 0.95, alpha: st.alpha * 0.8, len: 7, gap: 1.6, width: 1.1, per: P, patch: 4,
    }, (x, y, ext) => {
      const c = rid(x);
      if (y - ext < c + 3) return 0;
      const g = shadeGate(x, y - c);
      return g > 0.55 ? (g - 0.5) * 1.6 : 0;
    });
    ctx.restore();
    // The crest: pressed where the hill turns from the light, lighter and broken on the
    // lit side where the paper carries the edge.
    const chunks = Math.round(P / 20);
    for (let pass = 0; pass < 2; pass++) {
      const ps = [new Path2D(), new Path2D()];
      let pen = -1;
      for (let u = -M; u <= P + M; u += 2) {
        const idx = Math.floor((((u % P) + P) % P) / (P / chunks));
        const lit = slope(u) < 0;
        if (h01(seed + 40 + pass, idx) < (pass ? 0.45 : lit ? 0.22 : 0.05)) { pen = -1; continue; }
        const which = lit ? 0 : 1;
        const y = crest(u) + pass * 0.8;
        if (pen !== which) {
          ps[which].moveTo(u, y);
          pen = which;
        } else ps[which].lineTo(u, y);
      }
      const a = C.crestA * (pass ? 0.5 : 1);
      crayon(ctx, ps[0], C.crest, st.crestW * (pass ? 0.8 : 1), a * 0.6, 0.6);
      crayon(ctx, ps[1], C.crest, st.crestW * (pass ? 0.8 : 1), a, 0.68);
    }
    // Dusk: the last warm light caught along the lit crests.
    if (C.rim) {
      const p = new Path2D();
      let pen = false;
      for (let u = -M; u <= P + M; u += 2) {
        const on = slope(u) < -0.05 && h01(seed + 60, Math.floor((((u % P) + P) % P) / 9)) > 0.3;
        if (!on) { pen = false; continue; }
        const y = crest(u) + 1.6;
        if (pen) p.lineTo(u, y); else { p.moveTo(u, y); pen = true; }
      }
      crayon(ctx, p, C.rim, 1.1, 0.55, 0.55);
    }
    // The shipped finish's seams (frostSceneryFinish.js), as strokes: a pale lift near the
    // crest over 17-39 % of the tile, a shade line deeper over 53-79 %, a faint one lower.
    const seam = (off, a0, a1, col, w, al) => {
      const p = new Path2D();
      for (let k = -1; k <= 1; k++) {
        const pts = [];
        for (let u = k * P + a0 * P; u <= k * P + a1 * P; u += 3) pts.push(u, rid(u) + off);
        if (pts.length > 4) wob(p, pts, hash(seed + 70, Math.round(off), Math.round(a0 * 100)), 0.4);
      }
      crayon(ctx, p, col, w, al, 0.6);
    };
    if (!PAPER.snowIsPaper) seam(5, 0.17, 0.39, '#ffffff', 1.4, 0.75);
    seam(15, 0.53, 0.79, C.seam, 1, 0.55);
    seam(24, 0.07, 0.23, C.seam, 0.9, 0.35);
  });
}

// The foreground fold, the band just above the lane. Shipped it is a 22 % veil; here it
// is pressed as snow in shadow, a mid-toned blue-violet bank, because it is what the pale
// hazards (snowmen, ice crystals) are read against: paper-white snow right behind a
// white snowman would swallow it. Lighter at its crest, fully pressed by ~16 px down, and
// a darker line of shade along the lane's edge.
function foldStrip(key, f, B) {
  const Ls = FROST_PLAN.fold;
  const L = f.layers.fold;
  const P = L.period;
  const rid = (u) => ridgeU(Ls, u);
  const top = Ls.base - Ls.amp;
  const C = B.fold;
  return sprite(key, [0, Math.floor(top - 5), P, 240], (ctx) => {
    const M = 24;
    const seed = 303;
    const edge = periodic(P, seed, [[0.5, 0.31], [0.3, 0.97]]);
    const crest = (u) => rid(u) + edge(u);
    const path = new Path2D();
    path.moveTo(-M, 300);
    for (let u = -M; u <= P + M; u += 2) path.lineTo(u, crest(u));
    path.lineTo(P + M, 300);
    path.closePath();
    back(ctx, path);
    ctx.globalAlpha = C.wash[1];
    ctx.fillStyle = C.wash[0];
    ctx.fill(path);
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.clip(path);
    const g = (x, y) => 0.45 + 0.55 * smooth(0, 16, y - rid(x));
    hatch(ctx, seed, -M, top - 4, P + M, 240, {
      cols: C.cols, cover: 0.86, alpha: 0.95, len: 8, gap: 1.35, width: 1.3, per: P, patch: 5,
    }, (x, y, ext) => (y + ext < crest(x) - 1 ? 0 : g(x, y)));
    // A second, flatter pass across the first: the band is pressed, not sketched.
    hatch(ctx, seed + 1, -M, top - 4, P + M, 240, {
      cols: C.cols, cover: 0.8, alpha: 0.75, len: 12, gap: 1.8, width: 1.3, ang: 0.22, angJ: 0.06, per: P, patch: 4,
    }, (x, y, ext) => (y + ext < crest(x) + 3 ? 0 : smooth(2, 14, y - rid(x))));
    contours(ctx, P, rid, seed + 2, { cols: [C.deep], gap: 3.2, maxDepth: 40, chunk: 20, width: 1.1, alpha: 0.7, cover: 0.7, d0: 6 },
      (u, d) => 0.3 + 0.5 * smooth(6, 30, d));
    // Shade along the lane's edge.
    const p = new Path2D();
    for (let r = 0; r < 3; r++) {
      const pts = [];
      for (let u = -M; u <= P + M; u += 4) pts.push(u, 229 - r * 2.2 + Math.sin(u * 0.05 + r) * 0.5);
      wob(p, pts, hash(seed + 9, r), 0.35);
    }
    crayon(ctx, p, C.deep, 1.4, 0.7, 0.75);
    ctx.restore();
    const cl = new Path2D();
    const pts = [];
    for (let u = -M; u <= P + M; u += 2) pts.push(u, crest(u));
    wob(cl, pts, seed + 11, 0.3);
    crayon(ctx, cl, C.crest, 1.2, 0.6, 0.62);
  });
}

function blitStrip(ctx, sp, shift) {
  const P = sp.w;
  const m = ctx.getTransform();
  const X0 = snap(-(((shift % P) + P) % P), m.a, m.e);
  const Y0 = snap(sp.y0, m.d, m.f);
  ctx.globalAlpha = 1;
  for (let X = X0 - P; X < 480 + 40; X += P) if (X + P > -40) ctx.drawImage(sp.c, X, Y0, sp.w, sp.h);
}

// ------------------------------------------------------------------ things on the hills
// Item painters draw in the item's own frame: (0,0) at the planting point, un-leaned and
// unscaled (the caller leans and scales), `d` the foot depth to carry the silhouette down
// to the snow on the downhill side.
const pinePal = (B, far) => (far ? { ...B.pine, body: B.pine.body.map((c) => mixHex(c, B.far.shade[0], 0.4)) } : B.pine);

function pine(ctx, it, B, seed) {
  const C = pinePal(B, it.far);
  // Trunk to the snow line.
  const tr = new Path2D();
  wob(tr, [0, 3, 0, -14], seed + 1, 0.2);
  ctx.globalAlpha = 1;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.strokeStyle = paper(ctx);
  ctx.stroke(tr);
  crayon(ctx, tr, C.trunk, 2.2, 1, 0.85);
  // Three tiers, each with a ragged bough edge, bottom first.
  const tiers = [[-8, 9, -2.6], [-13, 7, -4.6], [-18, 5, -10.6]];
  tiers.forEach(([tipY, hw, sy], i) => {
    const R = rng(hash(seed, 10 + i));
    const q = [0, tipY - 0.6];
    const n = 5;
    for (let j = 0; j <= n; j++) {
      const u = j / n;
      q.push(hw * (1 - u) + (-hw) * u + (R() - 0.5) * 0.8, sy + (j % 2 ? -1.2 : 0.4) + (R() - 0.5) * 0.5);
    }
    // Right edge down first, then the sawtooth along the bottom right to left.
    const pts = [0, tipY - 0.6, hw * 0.55, (tipY + sy) / 2 + 0.3, ...q.slice(2), -hw * 0.55, (tipY + sy) / 2 + 0.6];
    solid(ctx, seed + i * 7, [pts], {
      cols: C.body, cover: 0.9, alpha: 1, len: 5, gap: 0.95, width: 1.15, patch: 3, ang: 1.25,
      line: C.line, lw: 0.8, la: 0.75, lamp: 0.25,
    });
    // The snow on the bough: paper on the white sheet, white crayon on the grey.
    const sw = hw * 0.82;
    const sp = [-sw, sy - 0.6];
    quadPts(sp, -sw, sy - 0.6, -sw * 0.3, sy - 3.4 - (2 - i) * 0.3, 0.4, sy - 2.2 - (2 - i) * 0.4, 4);
    quadPts(sp, 0.4, sy - 2.2 - (2 - i) * 0.4, sw * 0.5, sy - 3.2, sw, sy - 0.8, 4);
    quadPts(sp, sw, sy - 0.8, sw * 0.3, sy - 1.2, 0, sy - 1.6, 3);
    quadPts(sp, 0, sy - 1.6, -sw * 0.4, sy - 0.8, -sw, sy - 0.6, 3);
    snow(ctx, seed + 40 + i, [sp], B, { len: 4, gap: 0.9, press: 1.15 });
  });
  const cap = [0, -18.8, 1.8, -15.4, 0.2, -15.9, -1.4, -15.2];
  snow(ctx, seed + 50, [cap], B, { len: 3, press: 1.1 });
}

function iceRock(ctx, it, B, seed, d) {
  const C = B.rock;
  const far = it.far;
  const mixF = (c) => (far ? mixHex(c, B.far.shade[0], 0.35) : c);
  const body = [-13, 2 + d, -13, 2, -12, -6, -5, -11, 3, -9, 10, -4, 13, 2, 13, 2 + d];
  solid(ctx, seed, [body], {
    cols: C.body.map(mixF), cover: 0.86, alpha: 1, len: 6, gap: 1.05, width: 1.2, patch: 3,
    line: mixF(C.line), lw: 0.85, la: 0.7,
  });
  solid(ctx, seed + 1, [[-12, -6, -5, -11, 3, -9, -1, -3, -9, -2]], {
    cols: C.lit.map(mixF), cover: 0.8, alpha: 0.95, len: 5, gap: 1.1, width: 1.1, patch: 3, back: false,
  });
  // The shaded right face, pressed darker.
  solid(ctx, seed + 2, [[3, -9, 10, -4, 13, 2 + d, 5, 2 + d, 2, -3]], {
    cols: [mixF(C.dark)], cover: 0.85, alpha: 0.9, len: 5, gap: 1.1, width: 1.1, patch: 3, back: false, ang: 1.4,
  });
  const cap = [-11.5, -6.2];
  quadPts(cap, -11.5, -6.2, -7, -13, -4.5, -10.8, 3);
  cap.push(2, -8.6);
  quadPts(cap, 2, -8.6, 6.5, -7.4, 9.4, -4.2, 3);
  quadPts(cap, 9.4, -4.2, 5, -6.2, 1.2, -5.3, 3);
  quadPts(cap, 1.2, -5.3, -5, -7.4, -11.5, -6.2, 3);
  snow(ctx, seed + 3, [cap], B, { len: 4, press: 1.1, line: mixF(C.line), lw: 0.6, la: 0.35 });
}

function snowbank(ctx, it, B, seed) {
  const C = it.far ? B.far : B.near;
  const top = [-18, 2];
  quadPts(top, -18, 2, -16, -7, -8, -6, 4);
  quadPts(top, -8, -6, -3, -14, 5, -7, 4);
  quadPts(top, 5, -7, 13, -10, 18, 2, 4);
  // The drift in its own shade (the pack's iceShadow body), then the snow poured over it,
  // leaving a crescent of shade under each lobe.
  solid(ctx, seed, [top], {
    cols: C.shade, cover: 0.85, alpha: 1, len: 4, gap: 1, width: 1.1, patch: 3, ang: 1.2,
    line: C.crest, lw: 0.9, la: 0.9, lamp: 0.3,
  });
  const lit = [-17, -1];
  quadPts(lit, -17, -1, -12, -7, -7, -5, 3);
  quadPts(lit, -7, -5, -2, -11, 5, -5, 3);
  quadPts(lit, 5, -5, 11, -7, 16, -1, 3);
  quadPts(lit, 16, -1, 11, -4.4, 5.5, -2.2, 3);
  quadPts(lit, 5.5, -2.2, -1, -6.4, -6.5, -2.6, 3);
  quadPts(lit, -6.5, -2.6, -12, -4, -17, -1, 3);
  snow(ctx, seed + 1, [lit], B, { len: 4, press: 1.15 });
}

function glacier(ctx, it, B, seed) {
  const C = B.glacier;
  const body = [-34, 44, -29, 4, -23, -13, -14, -31, -8, -20, 1, -47, 8, -27, 15, -36, 22, -13, 28, 6, 34, 44];
  solid(ctx, seed, [body], {
    cols: C.body, cover: 0.8, alpha: 0.95, len: 8, gap: 1.35, width: 1.2, ang: 1.2,
    line: C.line, lw: 0.9, la: 0.6,
  });
  // The lit faces (the pack's: east of the ridge line, and the western spur).
  solid(ctx, seed + 1, [[1, -47, 8, -27, 12, 2, 18, 44, 34, 44, 28, 6, 22, -13, 15, -36, 11, -24]], {
    cols: C.lit, cover: 0.72, alpha: 0.9, len: 7, gap: 1.4, width: 1.2, ang: 1.25, back: false,
  });
  solid(ctx, seed + 2, [[-14, -31, -8, -20, -6, 44, -14, 44]], {
    cols: C.lit, cover: 0.68, alpha: 0.85, len: 7, gap: 1.4, width: 1.2, ang: 1.25, back: false,
  });
  // Shade down the western flanks.
  solid(ctx, seed + 3, [[-29, 4, -23, -13, -14, -31, -18, 0, -22, 44, -34, 44]], {
    cols: [C.dark], cover: 0.75, alpha: 0.8, len: 7, gap: 1.6, width: 1.1, ang: 1.35, back: false,
  });
  // Snow caps on the three summits and down the main peak's shoulder (the shipped caps and
  // the deep-snow finish together).
  snow(ctx, seed + 4, [[1, -47, 6, -34, 4, -31, 0, -34, -5, -21, -10, -18, -7, -28]], B, { len: 4, press: 1.1, line: C.line, lw: 0.6, la: 0.4 });
  snow(ctx, seed + 5, [[15, -36, 18, -28, 15, -27, 12, -24]], B, { len: 3, press: 1.1 });
  snow(ctx, seed + 6, [[-14, -31, -11, -24, -14, -23, -17, -20]], B, { len: 3, press: 1.1 });
  if (C.rim) {
    const p = new Path2D();
    wob(p, [1, -46, 7.5, -28, 11.5, -22], seed + 7, 0.25);
    wob(p, [15, -35, 21, -14], seed + 8, 0.25);
    crayon(ctx, p, C.rim, 1, 0.6, 0.6);
  }
}

// The stage's fortress (frostFortresses.js REDRAWN, on the same silhouettes): the lit west
// wall, the courses, snow on the ledges and merlons, icicles, the arched windows (drawn
// here unlit; the live pass lights them on their own clocks), the gate, the banner.
const KEEP_SIL = {
  1: [-18, 2, -16, -17, -11, -17, -11, -26, -5, -22, 0, -29, 6, -22, 11, -26, 11, -17, 16, -17, 18, 2],
  2: [-22, 2, -20, -11, -13, -16, -8, -10, -5, -25, 1, -31, 7, -22, 9, -13, 16, -18, 22, -10, 23, 2],
  3: [-13, 2, -11, -24, -5, -28, -4, -37, 0, -41, 4, -37, 5, -28, 11, -24, 13, 2],
};
// Window cells [x, y, w, h] in the keep's frame, and where the gate is lit.
export const KEEP_WINDOWS = {
  1: [[-12, -12.5, 2.4, 3.4], [7.8, -12.5, 2.4, 3.4], [-1.2, -18.6, 2.4, 3.2]],
  2: [[2.2, -14, 2.2, 3.2], [-12.6, -3.6, 2, 2.8], [12.4, -4.6, 2, 2.6]],
  3: [[-6.6, -13.6, 2.2, 3.2], [3.8, -8.2, 2.2, 3.2], [-1.2, -5.4, 2.4, 3.4], [-0.8, -35.2, 1.6, 2.8]],
};
const withFoot = (p, d) => [...p.slice(0, -2), p[p.length - 2], 2 + d, p[0], 2 + d];

function keep(ctx, it, B, seed, d, stage) {
  const K = B.keep;
  const st = KEEP_SIL[stage] ? stage : 1;
  const sil = withFoot(KEEP_SIL[st], d);
  const o = { cover: 0.9, alpha: 1, len: 4.5, gap: 0.9, width: 1.05, patch: 3 };
  solid(ctx, seed, [sil], { ...o, cols: K.dark, ang: 1.3, line: K.line, lw: 0.75, la: 0.8, lamp: 0.25 });
  ctx.save();
  ctx.clip(polyPath([sil]));
  const lit = st === 1 ? [-18, 2 + d, -16, -17, -11, -17, -11, -26, -8.2, -24, -8.2, 2 + d]
    : st === 3 ? [-10, -23, -4, -27, -4, 2 + d, -10, 2 + d] : [-20, -11, -13, -16, -10.5, -13, -12, 2 + d, -22, 2 + d];
  solid(ctx, seed + 1, [lit], { ...o, cols: K.lit, cover: 0.85, back: false, ang: 1.3 });
  if (st === 3) solid(ctx, seed + 2, [[-4, -37, 0, -41, -0.6, -28, -4, -28]], { ...o, cols: K.lit, cover: 0.85, back: false });
  const mid = st === 1 ? [-5, -22, 0, -29, 0.4, -29, 0.4, 2 + d, -5, 2 + d]
    : st === 3 ? [5, -28, 11, -24, 13, 2 + d, 8.4, 2 + d, 8.4, -24.6] : [-5, -25, 1, -31, 1.4, -30, 0.4, 2 + d, -6, 2 + d, -6.6, -12];
  solid(ctx, seed + 3, [mid], { ...o, cols: K.mid, cover: 0.85, back: false });
  // Stone courses.
  const cs = new Path2D();
  const ys = st === 3 ? [-4, -10, -16, -22] : [-3, -8, -13];
  ys.forEach((y, i) => wob(cs, [-20, y, 20, y], hash(seed, 60 + i), 0.2));
  crayon(ctx, cs, K.course, 0.55, 0.7, 0.7);
  ctx.restore();
  // Windows, dark glass (the live pass lights them).
  for (const [x, y, w, h] of KEEP_WINDOWS[st]) {
    const q = [x, y + h, x, y + w / 2];
    quadPts(q, x, y + w / 2, x, y, x + w / 2, y, 2);
    quadPts(q, x + w / 2, y, x + w, y, x + w, y + w / 2, 2);
    q.push(x + w, y + h);
    solid(ctx, seed + 70 + x * 3, [q], { cols: [K.unlit], cover: 0.9, alpha: 1, len: 3, gap: 0.7, width: 0.9, patch: 3, back: true });
    snow(ctx, seed + 80 + x * 3, [[x - 0.5, y + h, x + w + 0.5, y + h, x + w + 0.3, y + h + 0.8, x - 0.3, y + h + 0.8]], B, { len: 2, press: 1.2 });
  }
  // Snow: ledges, merlons, shoulders and spire.
  const snows = st === 1
    ? [[-16.8, -17, -13.7, -18.9, -10.4, -17, -10.6, -16.2, -16.6, -16.2], [10.4, -17, 13.5, -18.9, 16.8, -17, 16.6, -16.2, 10.6, -16.2],
      [-8.6, -24.2, -5, -22, -1.2, -27.2, -2.2, -25.2, -5, -23.2, -8.2, -23.3], [8.6, -24.2, 6, -22, 1.2, -27.2, 2.2, -25.2, 6, -23.2, 8.2, -23.3],
      [-12.6, -24.4, -11, -26.4, -9.4, -24.4, -11, -25.1], [-1.6, -27.4, 0, -29.4, 1.6, -27.4, 0, -28.1], [9.4, -24.4, 11, -26.4, 12.6, -24.4, 11, -25.1]]
    : st === 3
      ? [[-11.3, -23.4, -5, -28.4, -4.6, -27, -10.6, -22.6], [5, -28.4, 11.3, -23.4, 10.6, -22.6, 4.6, -27],
        [-4.2, -36.6, 0, -41.4, 4.2, -36.6, 2.6, -36.4, 0, -39, -2.8, -35.8]]
      : [[-20.4, -10.6, -13, -16.4, -8.6, -10.4, -10.4, -10.8, -13, -14.4, -18.4, -10.2], [-5.4, -24.6, 1, -31.4, 7.3, -22.2, 5.4, -22.4, 1, -28.4, -2.4, -24, -4.4, -23.2],
        [9.2, -12.8, 16, -18.4, 22.4, -9.8, 20.6, -10.2, 16, -16.2, 11, -12.2]];
  snows.forEach((q, i) => snow(ctx, seed + 90 + i, [q], B, { len: 2.5, gap: 0.8, press: 1.2 }));
  // Icicles.
  const ic = new Path2D();
  const icl = st === 1 ? [[-15.4, -16.4, 1.8], [-13.6, -16.4, 1.1], [-12, -16.4, 2.2], [12.2, -16.4, 1.6], [14, -16.4, 2.2], [15.6, -16.4, 1.2]]
    : st === 3 ? [[-9.8, -22.6, 1.8], [-8.2, -23.8, 1.2], [7.4, -24.6, 1.6], [9.4, -23.2, 2]] : [[-16, -13.2, 1.6], [3.6, -26.4, 1.8], [18, -15.4, 1.6]];
  for (const [x, y, l] of icl) { ic.moveTo(x, y); ic.lineTo(x + 0.1, y + l); }
  crayon(ctx, ic, PAPER.snowIsPaper ? '#dfeaf5' : '#ffffff', 0.7, 0.9, 0.8);
  // The gate (frost-1), lit; the banner and flag.
  if (st === 1) {
    const g = [-2.4, 2, -2.4, -3];
    quadPts(g, -2.4, -3, -2.4, -5.8, 0, -5.8, 2);
    quadPts(g, 0, -5.8, 2.4, -5.8, 2.4, -3, 2);
    g.push(2.4, 2);
    solid(ctx, seed + 100, [g], { cols: [K.warm, K.core], cover: 0.9, alpha: 1, len: 3, gap: 0.7, width: 0.9, patch: 3, line: K.line, lw: 0.6, la: 0.6 });
    const pole = new Path2D();
    wob(pole, [0, -29, 0, -36.5], seed + 101, 0.12);
    crayon(ctx, pole, K.line, 0.7, 0.9, 0.85);
    solid(ctx, seed + 102, [[0.3, -36.3, 6.8, -35.2, 6.4, -34.2, 0.3, -33.8]], { cols: [K.banner], cover: 0.9, alpha: 1, len: 3, gap: 0.7, width: 0.9, patch: 3 });
  } else if (st === 3) {
    solid(ctx, seed + 103, [[-1.8, -26.6, 1.8, -26.6, 1.8, -18, 0, -19.8, -1.8, -18]], { cols: [K.banner], cover: 0.9, alpha: 1, len: 3, gap: 0.7, width: 0.9, patch: 3, line: K.line, lw: 0.5, la: 0.5 });
  }
}

function citadel(ctx, it, B, seed, d, stage) {
  const K = B.keep;
  const set = {
    1: [[-16, 7, 18, 5, -0.8], [-9, 9, 29, 7, 0], [1, 8, 22, 6, 0.8], [9, 6, 13, 4, 1]],
    2: [[-15, 8, 26, 7, -0.4], [-7, 10, 36, 9, 0], [3, 8, 28, 7, 0.5], [11, 7, 18, 6, 0.9]],
    3: [[-12, 8, 28, 8, -0.5], [-5, 10, 38, 10, 0], [5, 8, 30, 8, 0.6], [13, 7, 18, 5, 1.1]],
  }[stage] || [];
  [...set].sort((a, b) => a[2] - b[2]).forEach(([x, w, h, tip, lean], i) => {
    const top = 2 - h;
    const cx = x + w / 2 + lean;
    const k = -lean * d / Math.max(1, h);
    solid(ctx, seed + i * 5, [[x + k, 2 + d, x + lean, top, cx, top - tip, x + w + lean, top, x + w + k, 2 + d]], {
      cols: K.lit, cover: 0.85, alpha: 1, len: 5, gap: 1, width: 1, patch: 3, ang: 1.45, line: K.line, lw: 0.7, la: 0.7,
    });
    solid(ctx, seed + i * 5 + 1, [[cx - w * 0.12, top + 1, cx, top - tip, x + w + lean, top, x + w + k, 2 + d, x + w * 0.4 + k, 2 + d]], {
      cols: K.dark, cover: 0.85, alpha: 0.9, len: 5, gap: 1, width: 1, patch: 3, ang: 1.45, back: false,
    });
    snow(ctx, seed + i * 5 + 2, [[x + lean, top, cx, top - tip, cx - w * 0.12, top + 1.2]], B, { len: 2, press: 1.2 });
  });
}

// The polar bear and her cub, a frame of the walk (the pack's drawBear, redrawn): the
// body is paper (or cream crayon) with blue shade hatched under the belly and on the far
// legs, a warm grey outline, dark eye and nose.
function bear(ctx, B, phase, seed) {
  const C = B.bear;
  const a = phase * TAU;
  const bob = 0.3 * Math.cos(2 * a);
  const leg = (col, hx, hy, p, fore, far) => {
    const aa = p * TAU;
    const lift = 1.5 * Math.max(0, Math.cos(aa)) ** 1.5;
    const fx = hx + 2.8 * Math.sin(aa) + (fore ? 0.8 : -0.2);
    const fy = -lift;
    const kx = (hx + fx) / 2 + (fore ? -0.2 - lift * 0.5 : 1.1);
    const ky = (hy + fy) / 2;
    const pth = new Path2D();
    pth.moveTo(hx, hy - 1.2);
    pth.lineTo(kx, ky);
    pth.lineTo(fx, fy - 0.9);
    ctx.globalAlpha = 1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = (fore ? 4 : 4.6) + 1;
    ctx.strokeStyle = wax(ctx, C.line, 0.8);
    ctx.stroke(pth);
    ctx.lineWidth = fore ? 4 : 4.6;
    ctx.strokeStyle = paper(ctx);
    ctx.stroke(pth);
    crayon(ctx, pth, far ? C.shade : C.fur, fore ? 3.6 : 4.2, far ? 0.85 : (PAPER.snowIsPaper ? 0.35 : 0.9), 0.7);
  };
  leg(C.shade, -9.4, -8.2 + bob, phase, false, true);
  leg(C.shade, 5.4, -8.6 + bob, phase + 0.25, true, true);
  const body = [-13.6, -8.2 + bob];
  quadPts(body, -13.6, -8.2 + bob, -14.4, -14.8 + bob, -9, -15.4 + bob, 4);
  quadPts(body, -9, -15.4 + bob, -3, -15.8 + bob, 2, -14.4 + bob, 4);
  quadPts(body, 2, -14.4 + bob, 5.6, -13.8 + bob, 8.2, -12.2 + bob, 3);
  body.push(10.8, -10.6 + bob, 10.2, -7.8 + bob);
  quadPts(body, 10.2, -7.8 + bob, 6, -6.2 + bob, 3, -6 + bob, 3);
  quadPts(body, 3, -6 + bob, -4, -5.2 + bob, -10.4, -6 + bob, 4);
  solid(ctx, seed, [body], {
    cols: PAPER.snowIsPaper ? [C.fur] : [C.fur], cover: PAPER.snowIsPaper ? 0.45 : 0.85, alpha: PAPER.snowIsPaper ? 0.6 : 1,
    len: 5, gap: 1.1, width: 1.1, patch: 3, ang: 0.4,
    over: { cols: [C.shade], cover: 0.75, alpha: 0.85, len: 4, gap: 1, width: 1, patch: 3, ang: 1.2, gate: (x, y) => (y > -9.6 + bob ? 1 : x < -9 && y > -12 ? 0.6 : 0) },
    line: C.line, lw: 1.15, la: 1, lamp: 0.25,
  });
  leg(C.fur, -8.8, -8.2 + bob, phase + 0.5, false, false);
  leg(C.fur, 4.8, -8.6 + bob, phase + 0.75, true, false);
  // The head, low on the long neck.
  ctx.save();
  ctx.translate(9.4, -10.6 + bob);
  ctx.rotate(0.06 * Math.sin(a) + 0.08);
  const head = [-0.8, -1.8];
  quadPts(head, -0.8, -1.8, 2.4, -2.9, 4.8, -1.6, 3);
  head.push(7.6, -0.2);
  quadPts(head, 7.6, -0.2, 8.2, 0.7, 7.3, 1.2, 2);
  head.push(3.4, 1.9);
  quadPts(head, 3.4, 1.9, 0.6, 2.2, -0.6, 1, 2);
  solid(ctx, seed + 3, [head], {
    cols: [C.fur], cover: PAPER.snowIsPaper ? 0.4 : 0.85, alpha: PAPER.snowIsPaper ? 0.5 : 1, len: 3, gap: 1, width: 1, patch: 3, ang: 0.4,
    line: C.line, lw: 0.9, la: 1, lamp: 0.2,
  });
  const ear = new Path2D();
  ear.arc(1.4, -2.2, 0.9, 0, TAU);
  crayon(ctx, ear, C.line, 0.8, 0.8, 0.8);
  ctx.globalAlpha = 1;
  ctx.fillStyle = wax(ctx, C.dark, 0.95);
  ctx.beginPath();
  ctx.arc(7.6, 0.2, 0.7, 0, TAU);
  ctx.arc(4.2, -0.9, 0.42, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------------ painting a ridge's items
const BOX = {
  pine: [-17, -36, 17, 8], 'ice-rock': [-28, -26, 28, 20], snowbank: [-28, -18, 28, 10],
  glacier: [-56, -76, 56, 68], landmark: [-28, -44, 28, 18],
};

function itemSprite(key, it, B, stage) {
  const s = it.scale;
  const seed = strHash(it.key);
  const d = it.foot > 0.5 ? it.foot / s : 0;
  return sprite(key, BOX[it.kind], (ctx) => {
    // The snow line under the item: nothing below it (a massif runs on and the next
    // ridge cuts it).
    if (!it.massif) {
      ctx.beginPath();
      const sf = it.surface;
      ctx.moveTo(sf[0].dx, -400);
      for (const pt of sf) ctx.lineTo(pt.dx, pt.y + 0.6);
      ctx.lineTo(sf[sf.length - 1].dx, -400);
      ctx.closePath();
      ctx.clip();
    }
    if (it.lean) ctx.rotate(it.lean);
    ctx.scale(s, s);
    switch (it.kind) {
      case 'pine': pine(ctx, it, B, seed); break;
      case 'ice-rock': iceRock(ctx, it, B, seed, d); break;
      case 'snowbank': snowbank(ctx, it, B, seed); break;
      case 'glacier': glacier(ctx, it, B, seed); break;
      case 'landmark':
        if (it.fortress === 'citadel') citadel(ctx, it, B, seed, d, stage);
        else keep(ctx, it, B, seed, d, stage);
        break;
      default: break;
    }
  });
}

// The keep's windows, live: each on its own slow blink seeded off the fortress's world
// tile (the shipped rule), a warm crayon dab when lit and, stronger at dusk, a few loops
// of warm glow round it.
function keepLight(ctx, it, f, B, stage) {
  const K = B.keep;
  const st = KEEP_SIL[stage] ? stage : 1;
  const cells = KEEP_WINDOWS[st];
  const seed0 = Math.abs(Math.round(it.seed || 0));
  ctx.save();
  ctx.translate(it.x, it.baseY);
  ctx.scale(it.scale, it.scale);
  const dab = new Path2D();
  const core = new Path2D();
  const glow = new Path2D();
  cells.forEach(([x, y, w, h], i) => {
    const key = (st === 3 && i === 3 ? seed0 + 5 : seed0) * 31 + (st === 3 && i === 3 ? 0 : i) * 7;
    const period = 2.6 + (key % 8) * 0.3;
    const u = ((f.t / period) + ((key * 0.6180339887) % 1)) % 1;
    const blink = u < 0.06 || (key % 3 !== 0 && u > 0.1 && u < 0.15);
    if (blink) return;
    const cx = x + w / 2;
    dab.moveTo(cx - w * 0.25, y + h - 0.4);
    dab.lineTo(cx + w * 0.2, y + 0.9);
    dab.moveTo(cx + w * 0.25, y + h - 0.5);
    dab.lineTo(cx - w * 0.1, y + 1.2);
    core.moveTo(cx, y + h - 0.8);
    core.lineTo(cx, y + 1.6);
    const R = rng(hash(seed0, i, 77));
    for (let k = 0; k < 3; k++) {
      const rr = 2.6 + k * 1.4 + R();
      const a0 = R() * TAU;
      glow.moveTo(cx + Math.cos(a0) * rr, y + h / 2 + Math.sin(a0) * rr);
      glow.arc(cx, y + h / 2, rr, a0, a0 + 2.2 + R() * 1.6);
    }
  });
  crayon(ctx, glow, K.warm, 0.9, 0.35 * B.glowGain, 0.5);
  crayon(ctx, dab, K.warm, 1.2, 1, 0.95);
  crayon(ctx, core, K.core, 0.8, 0.9, 0.9);
  ctx.restore();
}

function ridgeItems(ctx, f, name, B, keyBase) {
  const L = f.layers[name];
  for (const it of L.items) {
    const item = { ...it, far: name === 'far' };
    const sp = itemSprite(`${keyBase}:${it.key}`, item, B, f.stage);
    blit(ctx, sp, it.x, it.baseY);
    if (it.kind === 'landmark' && it.fortress !== 'citadel') keepLight(ctx, it, f, B, f.stage);
  }
}

const BEAR_FRAMES = 12;
function bears(ctx, f, B, keyBase) {
  for (const w of f.wildlife) {
    if (w.kind !== 'bears') continue;
    const near = f.layers.near;
    ctx.save();
    // Cut at the snow: nothing of the bears below the crest.
    ctx.beginPath();
    const x0 = w.x - 40;
    const x1 = w.x + 90;
    ctx.moveTo(x0, -10);
    ctx.lineTo(x1, -10);
    for (let x = x1; x >= x0; x -= 2) ctx.lineTo(x, near.ridge(x) + 1.4);
    ctx.closePath();
    ctx.clip();
    for (const b of w.bears) {
      const fr = Math.floor(b.phase * BEAR_FRAMES) % BEAR_FRAMES;
      const sp = sprite(`${keyBase}:bear:${b.who}:${fr}`, [-19 * b.s, -19 * b.s, 20 * b.s, 3 * b.s], (x) => {
        x.scale(b.s, b.s);
        bear(x, B, fr / BEAR_FRAMES, b.who === 'cub' ? 611 : 612);
      });
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.tilt);
      ctx.drawImage(sp.c, sp.x0, sp.y0, sp.w, sp.h);
      ctx.restore();
    }
    ctx.restore();
  }
}

// ------------------------------------------------------------------ the painter
function paintFrost(ctx, f, P) {
  PAPER = P;
  prepare(ctx);
  const B = boxFor(f.stage, P);
  const keyBase = `${P.id}:${f.stage}`;
  ctx.save();
  ctx.globalAlpha = 1;
  const sky = bakeSky(`${keyBase}:sky`, B);
  const m = ctx.getTransform();
  ctx.drawImage(sky.c, snap(0, m.a, m.e), snap(0, m.d, m.f), sky.w, sky.h);
  stars(ctx, f, B);
  aurora(ctx, f, B, keyBase);
  for (const r of f.ribbons) blit(ctx, ribbonSprite(`${keyBase}:ribbon:${r.i}`, r, B), r.x, r.y);
  for (const c of f.clouds) blit(ctx, cloudSprite(`${keyBase}:cloud:${c.i}`, c, B), c.x, c.y);
  blitStrip(ctx, ridgeStrip(`${keyBase}:far`, f, 'far', B), f.layers.far.shift);
  ridgeItems(ctx, f, 'far', B, keyBase);
  blitStrip(ctx, ridgeStrip(`${keyBase}:near`, f, 'near', B), f.layers.near.shift);
  bears(ctx, f, B, keyBase);
  ridgeItems(ctx, f, 'near', B, keyBase);
  blitStrip(ctx, foldStrip(`${keyBase}:fold`, f, B), f.layers.fold.shift);
  ctx.restore();
}

// ------------------------------------------------------------------ the crayon sky alone
// The second round (Peter, 28 Sep 2026: "i am not in love with it... but i DO like the way
// the sky looks. would it be doable to have just the sky in crayon as a bakeoff?"): the
// shipped paper world with this sky behind it. The pack hands its sky pass over through
// its gallery seam (watercolorPack.bg, backgroundContext.frostSkyPainter) with what it
// knows: the stage's light, the picture's coverage and band, the rectangle its own sky
// fill covers, the far ridge's crest and base, the aurora's rectangle and its wrap. So the
// crayon sky is placed by the pack's own rules, portrait included: the stops run to the
// far ridge's base (the horizon the paper hills stand on), the bake tiles seamlessly every
// 480 px across whatever the picture covers, and the curtains take the pack's rectangle,
// wrap and drift. The pack's hills then stand in front of all of it, so the aurora is
// behind the fortresses by construction. The pack's soft cloud washes are not part of
// its sky pass (they are weather, drawn after the hills) and stay as they are.
// `options.aurora`: 'crayon' (the waxy strokes) or 'paper' (the pack's own vellum aurora,
// handed over as s.paperAurora, laid on the crayon sky in the same place in the pass), with
// `auroraBoost` scaling its gain and `auroraBlend` its composite (the crayon navy is darker
// than the paper sky it was tuned on). `options.scale` fixes the bake scale.
export function paintCrayonSky(ctx, s, paperId, options = {}) {
  const P = PAPERS[paperId] || PAPERS.white;
  PAPER = P;
  prepare(ctx, options.scale);
  const stage = Math.max(1, Math.min(3, Number(s.stageIndex) || 1));
  const B = boxFor(stage, P);
  const horizon = Math.round(s.farRidge.base);
  const band = s.band || {};
  // 72 px of headroom above the band: the pack hands the band with the portrait crane at
  // rest (so this bake is made once), and a jump's crane shows a little above it.
  const y0 = Math.floor(Math.max(s.skyRect.y, Number.isFinite(band.top) ? band.top - 72 : -60) / 8) * 8;
  const y1 = horizon + 8;
  // The stops run from the top of what is seen (the frame's top in landscape) to the far
  // ridge's base, so the warm end is always the strip right behind the hills.
  const top = Number.isFinite(band.top) ? Math.min(0, Math.round(band.top)) : 0;
  const keyBase = `sky:${P.id}:${stage}:${y0}:${top}:${horizon}`;
  ctx.save();
  ctx.globalAlpha = 1;
  // Anything the bake does not reach (the crane's headroom) in the sky's top colour.
  const r = s.skyRect;
  ctx.fillStyle = paper(ctx);
  ctx.fillRect(r.x, r.y, r.w, y0 - r.y + 1);
  ctx.globalAlpha = Math.max(B.skyWash, 0.85);
  ctx.fillStyle = B.sky[0].cols[0];
  ctx.fillRect(r.x, r.y, r.w, y0 - r.y + 1);
  ctx.globalAlpha = 1;
  const sp = bakeSky(`${keyBase}:bake`, B, { y0, y1, horizon, top, wrap: true });
  const m = ctx.getTransform();
  const X0 = Math.floor(r.x / 480) * 480;
  for (let X = X0; X < r.x + r.w; X += 480) {
    ctx.drawImage(sp.c, snap(X, m.a, m.e), snap(y0, m.d, m.f), sp.w, sp.h);
  }
  // Stars, across the picture: the frame's own set repeated every 480 px.
  const cov = s.coverage;
  for (let X = Math.floor(cov.left / 480) * 480; X < cov.right; X += 480) {
    ctx.save();
    ctx.translate(X, top);
    stars(ctx, { t: s.t }, B);
    ctx.restore();
  }
  // The aurora, placed as the pack places it.
  const A = FROST_PLAN.aurora;
  const gain = s.auroraGain ?? A.gain[stage];
  const rect = s.auroraRect;
  const curtains = [];
  const paperAurora = options.aurora === 'paper' && typeof s.paperAurora === 'function';
  if (paperAurora) {
    ctx.save();
    if (options.auroraBlend) ctx.globalCompositeOperation = options.auroraBlend;
    s.paperAurora(options.auroraBoost ?? 1);
    ctx.restore();
  } else if (gain > 0) {
    const n = Math.min(A.curtains.length, A.count[stage]);
    for (let i = 0; i < n; i++) {
      const c = A.curtains[i];
      const baseY = rect.top + rect.height * c.y;
      const h = Math.max(8, (baseY - rect.top - A.blur) * c.h);
      const x = s.wrap(c.at * (cov.width + c.w * 2) - s.camX * c.drift * s.zoom, c.w);
      curtains.push({
        i, x, baseY, h, w: c.w, amp: c.amp, k: (c.w / c.wl) * TAU, rays: c.rays, phase: c.phase,
        color: c.color, tip: c.tip, alpha: c.alpha * gain,
        breathe: 0.84 + 0.16 * (0.5 + 0.5 * Math.sin((Number(s.t) || 0) * 0.21 + c.phase)),
      });
    }
  }
  aurora(ctx, { t: s.t, aurora: { curtains } }, B, keyBase);
  // The two wisp ribbons, as the pack drifts them.
  const R = FROST_PLAN.ribbons;
  (stage === 3 ? R.dusk : R.day).forEach((rb, i) => {
    const rr = { ...rb, i };
    blit(ctx, ribbonSprite(`${keyBase}:ribbon:${i}`, rr, B), s.wrap(rb.at * 480 - s.camX * R.factor * s.zoom, rb.w + 6), rb.y);
  });
  ctx.restore();
}

// The full crayon world, for the lab's bake-off cards (src/dev/frost-crayon/crayon.js).
export const paintFrostCrayon = (ctx, f, paperId) => paintFrost(ctx, f, PAPERS[paperId] || PAPERS.white);
