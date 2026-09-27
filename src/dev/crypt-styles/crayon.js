// CRYPT style bake-off — WAX CRAYON ON DARK PAPER. The night is drawn by laying light
// crayon onto black construction paper. Every fill is a hatch: bundles of short, slightly
// wobbly parallel strokes at one hand angle, knocked through a baked paper-tooth mask so
// the paper shows in the pits and every stroke has a broken, waxy edge. Far layers get
// fewer, paler strokes; near ones are pressed harder. Outlines are wobbly and doubled
// back. The gas lamp is the one warm crayon in the box.
//
// Nothing crawls: every stroke is seeded by the thing it belongs to and laid out in that
// thing's own frame (a ridge in its layer's u, an item at its foot, a puff at its
// centre), and the tooth is pinned to the same frame, snapped to whole device pixels.
// The still sky, each ridge (as a seamless strip one period long) and each item are baked
// once per device scale, so a frame is a few blits plus the live fog, clouds, bats, stars
// and lamp glow.

import { CRYPT_PLAN } from './plan.js';

const TAU = Math.PI * 2;
const HAND = 1.12; // the hand's hatch angle, radians above horizontal: strokes rise to the right
const LX = 0.6;
const LY = -0.8; // moonlight comes from the upper right

// ------------------------------------------------------------------ the box of crayons
const PAPER = '#131024';
const SKY = {
  hi: ['#1f2a60', '#2a2764'],
  mid: ['#2a3c86', '#393180'],
  lo: ['#3e3286', '#4f3f8e', '#33438a'],
  glow: ['#4660ae', '#6378c2'],
};
const MOON = { cream: '#f6ebbf', lemon: '#f1d56c', pit: '#c7b173', rim: '#fff5d2' };
const HALO = ['#d9dcb2', '#a4b3e4'];
const STAR = ['#fff3cc', '#cfd9ff'];
const CLOUD = { top: '#948dcc', body: '#6f67ad', under: '#4f4790' };
const BAT = '#0a0812';
const IRON = '#0a0812';
const WARM = { glow: '#ff9d42', glass: '#ff9038', core: '#ffd477' };
const FOG = ['#b7afe4', '#dedaf8'];

const LAND = {
  bg: {
    seed: 101,
    hill: { cols: ['#575ca3', '#666aae'], cover: 0.68, alpha: 0.82, len: 11, gap: 1.9, width: 1.4 },
    fade: 0.45, fadeDepth: 34,
    crest: '#9ea3e2', crestA: 0.6,
    tree: '#26245a',
  },
  mid: {
    seed: 202,
    hill: { cols: ['#3e3383', '#4b3e91'], cover: 0.78, alpha: 0.92, len: 11, gap: 2, width: 1.5 },
    fade: 0.55, fadeDepth: 26,
    crest: '#8a7bce', crestA: 0.75,
    stone: { cols: ['#8783c8'], line: '#bcb7ee' },
    tree: '#191430', treeB: '#2a2352', rim: '#8475c6',
  },
  fg: {
    seed: 303,
    hill: { cols: ['#251d4a', '#2f275c'], cover: 0.85, alpha: 1, len: 10, gap: 1.7, width: 1.5 },
    fade: 0, fadeDepth: 20,
    crest: '#4a3f86', crestA: 0.8,
    tree: '#161128', treeB: '#2b2350', rim: '#7869b8',
    grass: '#3a3171', grassLit: '#6a5eab',
  },
};

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

// ------------------------------------------------------------------ paper and tooth
// One square of paper tooth per device scale, baked once. `rank` is the tooth height
// equalised to 0..1, so a crayon of cover 0.6 lands on the highest 60 % of the paper and
// skips the pits, the way wax does.
const TILE = 64; // user px
const PAT_CAP = 56; // patterns kept; the rest are rebuilt on demand (bakes only)
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
  const N = TILE * k;
  const R = rng(0x7007);
  const grain = new Float32Array(N * N);
  for (let i = 0; i < grain.length; i++) grain[i] = R();
  // Barely soften the grain, so a pit is a speck a device pixel or two across.
  const soft = new Float32Array(N * N);
  const G = (x, y) => grain[((y + N) % N) * N + ((x + N) % N)];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      soft[y * N + x] = k > 1
        ? 0.52 * G(x, y) + 0.12 * (G(x - 1, y) + G(x + 1, y) + G(x, y - 1) + G(x, y + 1))
        : G(x, y);
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
  // Equalise by histogram so cover means coverage.
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
  return { k, N, rank, pats: new Map(), paper: null, sky: null, sprites: new Map() };
}

function prepare(ctx) {
  const m = ctx.getTransform();
  const k = Math.max(1, Math.min(3, Math.round(Math.hypot(m.a, m.b))));
  S = STORE.get(k);
  if (!S) { S = buildStore(k); STORE.set(k, S); }
}

function hexRgb(h) {
  const v = parseInt(h.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function tile(ctx, fillPx) {
  const c = makeCanvas(S.N, S.N);
  const x = c.getContext('2d');
  const img = x.createImageData(S.N, S.N);
  fillPx(img.data);
  x.putImageData(img, 0, 0);
  return ctx.createPattern(c, 'repeat');
}

// The pattern maps one tile pixel to one device pixel with its origin on a whole device
// pixel of the current frame, so the tooth rides with whatever frame is current and
// never resamples.
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
  cover = Math.round(cover * 50) / 50;
  const key = colour + cover;
  let p = S.pats.get(key);
  if (p) {
    // Least recently used goes first when the cache is full.
    S.pats.delete(key);
    S.pats.set(key, p);
  } else {
    const [r, g, b] = hexRgb(colour);
    const lo = 1 - cover;
    p = tile(ctx, (d) => {
      for (let i = 0; i < S.rank.length; i++) {
        let a = (S.rank[i] - lo) / 0.1 + 0.5;
        a = a < 0 ? 0 : a > 1 ? 1 : a;
        d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = a * 255;
      }
    });
    S.pats.set(key, p);
    if (S.pats.size > PAT_CAP) S.pats.delete(S.pats.keys().next().value);
  }
  return align(ctx, p);
}

function paper(ctx) {
  if (!S.paper) {
    const [r, g, b] = hexRgb(PAPER);
    S.paper = tile(ctx, (d) => {
      for (let i = 0; i < S.rank.length; i++) {
        const v = (S.rank[i] - 0.5) * 9;
        d[i * 4] = r + v; d[i * 4 + 1] = g + v; d[i * 4 + 2] = b + v * 1.4; d[i * 4 + 3] = 255;
      }
    });
  }
  return align(ctx, S.paper);
}

// ------------------------------------------------------------------ crayon primitives
function crayon(ctx, path, colour, width, alpha, cover = 0.7) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = width;
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = wax(ctx, colour, cover);
  ctx.stroke(path);
}

function back(ctx, path, rule = 'nonzero') {
  ctx.globalAlpha = 1;
  ctx.fillStyle = paper(ctx);
  ctx.fill(path, rule);
}

const BUCKET = [0.5, 0.75, 1];
const PRESS = [0.88, 1, 1.1];

// Hand hatching over [x0,x1]x[y0,y1] of the current frame: rows of parallel strokes laid
// side by side the way a hand works across a shape, in patches of a few strokes that
// share a length, a tilt and a pressure. The grid is anchored at the frame's origin, so
// the strokes belong to the thing and never to the screen. `gate` scores each patch from
// its centre and half-height: 0 skips it, lower values press lighter.
function hatch(ctx, seed, x0, y0, x1, y1, o, gate) {
  const { len, gap, width, cols, cover, alpha } = o;
  const patch = o.patch ?? 5;
  const ang = o.ang ?? HAND;
  const angJ = o.angJ ?? 0.07;
  const sa = Math.sin(ang);
  const rowH = len * sa * (o.rowK ?? 0.8);
  let gx = gap / sa;
  // On a strip that wraps every `per` px, whole patches fit the period and repeat exactly.
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
    // Pressing harder fills more of the tooth as well as laying more colour.
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
function outline(ctx, pts, seed, colour, width, alpha, closed = true) {
  const a = new Path2D();
  wob(a, pts, seed, 0.4, closed);
  crayon(ctx, a, colour, width, alpha, 0.72);
  const b = new Path2D();
  const n = pts.length / 2;
  let q = pts;
  if (closed && n > 2) {
    const k = 1 + (seed % (n - 1));
    q = pts.slice(2 * k).concat(pts.slice(0, 2 * k));
    // Stop short of closing, the way a hand lifts off.
    q = q.concat(q.slice(0, 2));
  }
  wob(b, q, seed + 1, 0.6, false, 1.5);
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
// polys[0] is the outline, the rest are holes.
function solid(ctx, seed, polys, o) {
  const path = polyPath(polys);
  back(ctx, path, 'evenodd');
  ctx.save();
  ctx.clip(path, 'evenodd');
  const b = bbox(polys[0]);
  hatch(ctx, seed, b.x0 - 2, b.y0 - 2, b.x1 + 2, b.y1 + 2, o);
  ctx.restore();
  if (o.line) outline(ctx, polys[0], seed + 17, o.line, o.lw ?? 1, o.la ?? 0.7);
  if (o.holeLine) for (let k = 1; k < polys.length; k++) outline(ctx, polys[k], seed + 31 + k, o.holeLine, 0.9, 0.6);
}

const rect = (x, y, w, h) => [x, y, x + w, y, x + w, y + h, x, y + h];
const scalePts = (q, s) => q.map((v) => v * s);
function rotPts(q, a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const out = [];
  for (let k = 0; k < q.length; k += 2) out.push(q[k] * c - q[k + 1] * s, q[k] * s + q[k + 1] * c);
  return out;
}
function quadPts(out, x0, y0, cx, cy, x1, y1, n = 4) {
  for (let j = 1; j <= n; j++) {
    const t = j / n;
    const u = 1 - t;
    out.push(u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1);
  }
}
function lancetPts(x, y, w, h) {
  const out = [x - w / 2, y, x - w / 2, y - h + w * 0.6];
  quadPts(out, x - w / 2, y - h + w * 0.6, x - w / 2, y - h, x, y - h - w * 0.3);
  quadPts(out, x, y - h - w * 0.3, x + w / 2, y - h, x + w / 2, y - h + w * 0.6);
  out.push(x + w / 2, y);
  return out;
}
function arcPts(cx, cy, r, a0, a1, n) {
  const out = [];
  for (let j = 0; j <= n; j++) {
    const a = a0 + ((a1 - a0) * j) / n;
    out.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  return out;
}

// Resample a polyline every ~step px, with unit left normals, distance and 0..1 progress.
function resample(pts, step) {
  const out = [];
  let total = 0;
  for (let k = 2; k < pts.length; k += 2) total += Math.hypot(pts[k] - pts[k - 2], pts[k + 1] - pts[k - 1]);
  let d = 0;
  for (let k = 2; k < pts.length; k += 2) {
    const ax = pts[k - 2];
    const ay = pts[k - 1];
    const bx = pts[k];
    const by = pts[k + 1];
    const len = Math.hypot(bx - ax, by - ay) || 1e-6;
    const nx = -(by - ay) / len;
    const ny = (bx - ax) / len;
    const m = Math.max(1, Math.ceil(len / step));
    for (let j = k === 2 ? 0 : 1; j <= m; j++) {
      const t = j / m;
      out.push({ x: ax + (bx - ax) * t, y: ay + (by - ay) * t, nx, ny, d: d + t * len, t: (d + t * len) / total });
    }
    d += len;
  }
  return out;
}

// Branches the way a crayon draws them: paper under the silhouette, then a few strokes
// along each limb, pressed harder at the base and tapering, with a broken moonlit edge
// on the side facing the upper right. list = [{ pts, w }] in the current frame.
function limbs(ctx, seed, list, o) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = 1;
  ctx.strokeStyle = paper(ctx);
  for (const l of list) {
    for (let k = 2; k < l.pts.length; k += 2) {
      const tm = (k - 1) / (l.pts.length - 2);
      ctx.lineWidth = l.w * (1 - 0.45 * tm) + 0.3;
      ctx.beginPath();
      ctx.moveTo(l.pts[k - 2], l.pts[k - 1]);
      ctx.lineTo(l.pts[k], l.pts[k + 1]);
      ctx.stroke();
    }
  }
  const body = [new Path2D(), new Path2D()];
  const rim = new Path2D();
  list.forEach((l, li) => {
    const R = rng(hash(seed, li));
    const pts = resample(l.pts, 2.5);
    const n = Math.max(1, Math.round(l.w / (o.gap ?? 1.1)));
    for (let j = 0; j < n; j++) {
      const fr = n === 1 ? 0 : j / (n - 1) - 0.5;
      const t0 = R() * 0.1;
      const t1 = 1 - R() * 0.12;
      const ph = R() * TAU;
      const p = body[j % 2];
      let first = true;
      for (const q of pts) {
        if (q.t < t0 || q.t > t1) continue;
        const wd = l.w * (1 - 0.45 * q.t);
        const off = fr * wd * 0.78 + 0.3 * Math.sin(q.d * 0.45 + ph);
        const x = q.x + q.nx * off;
        const y = q.y + q.ny * off;
        if (first) { p.moveTo(x, y); first = false; } else p.lineTo(x, y);
      }
    }
    if (o.rim) {
      let pen = false;
      for (const q of pts) {
        const dot = q.nx * LX + q.ny * LY;
        const on = Math.abs(dot) > 0.3 && h01(seed + 5, li, Math.floor(q.d / 7)) > 0.3;
        if (!on) { pen = false; continue; }
        const sgn = dot > 0 ? 1 : -1;
        const wd = l.w * (1 - 0.45 * q.t);
        const x = q.x + q.nx * sgn * wd * 0.42;
        const y = q.y + q.ny * sgn * wd * 0.42;
        if (pen) rim.lineTo(x, y); else { rim.moveTo(x, y); pen = true; }
      }
    }
  });
  crayon(ctx, body[0], o.col, o.width ?? 1.3, o.alpha ?? 1, o.cover ?? 0.8);
  crayon(ctx, body[1], o.col2 ?? o.col, o.width ?? 1.3, (o.alpha ?? 1) * 0.85, o.cover ?? 0.8);
  if (o.rim) crayon(ctx, rim, o.rim, o.rimW ?? 1, o.rimA ?? 0.7, 0.6);
}

// ------------------------------------------------------------------ sky
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

// The still sky — paper, the sweeping hatch, the moon's halo and the moon — is baked once
// per device scale; only stars, clouds and bats move.
function bakeSky(ctx, f) {
  const c = makeCanvas(560 * S.k, 430 * S.k);
  const x = c.getContext('2d');
  x.scale(S.k, S.k);
  x.translate(40, 80);
  x.fillStyle = paper(x);
  x.fillRect(-40, -80, 560, 430);
  const m = f.moon;

  // Loose sweeps, rising gently to the right, denser and warmer toward the horizon.
  const groups = new Map();
  const add = (col, b) => {
    const key = col + b;
    let g = groups.get(key);
    if (!g) { g = { col, b, p: new Path2D() }; groups.set(key, g); }
    return g.p;
  };
  const CW = 30;
  const CH = 7;
  for (let r = -15; r <= 44; r++) {
    for (let cc = -3; cc <= 18; cc++) {
      const R = rng(hash(77, cc, r));
      const cx = (cc + R()) * CW;
      const cy = (r + R()) * CH;
      const yy = Math.max(0, Math.min(1, cy / 190));
      if (R() > 0.45 + 0.45 * yy) continue;
      const dm = Math.hypot(cx - m.x, cy - m.y);
      let set;
      if (dm < 95 && R() < (1 - dm / 95) * 0.95) set = SKY.glow;
      else {
        const v = yy + (R() - 0.5) * 0.35;
        set = v < 0.3 ? SKY.hi : v < 0.62 ? SKY.mid : SKY.lo;
      }
      const col = set[Math.floor(R() * set.length)];
      const b = Math.floor(R() * 3);
      const L = 36 + R() * 60;
      const a = 0.19 + (R() - 0.5) * 0.14;
      const n = 3 + Math.floor(R() * 3);
      strokeBundle(add(col, b), R, cx, cy, L, a, n, 2.5, 5);
    }
  }
  // A flatter second layer low down, laid across the first.
  for (let r = 20; r <= 40; r++) {
    for (let cc = -2; cc <= 16; cc++) {
      const R = rng(hash(78, cc, r));
      const cx = (cc + R()) * 36;
      const cy = (r + R()) * 5.5;
      if (R() > 0.3 + 0.4 * Math.max(0, Math.min(1, (cy - 110) / 80))) continue;
      const col = SKY.lo[Math.floor(R() * SKY.lo.length)];
      strokeBundle(add(col, Math.floor(R() * 3)), R, cx, cy, 30 + R() * 40, -0.05 + (R() - 0.5) * 0.08, 3 + Math.floor(R() * 2), 2.4, 3);
    }
  }
  for (const g of groups.values()) crayon(x, g.p, g.col, 1.8, 0.9 * BUCKET[g.b], 0.78 * PRESS[g.b]);

  // The halo: loose rings of paler crayon, fading outward.
  const R = rng(hash(55));
  for (let k = 0; k < 30; k++) {
    const rr = m.r + 3 + R() * R() * 34;
    const a0 = R() * TAU;
    const sweep = 0.7 + R() * 2.0;
    const p = new Path2D();
    wob(p, arcPts(m.x + (R() - 0.5) * 2, m.y + (R() - 0.5) * 2, rr, a0, a0 + sweep, Math.ceil(sweep * rr / 3)), hash(56, k), 0.5);
    crayon(x, p, HALO[k % 2], 1.3, 0.62 * (1 - (rr - m.r) / 40), 0.5);
  }

  // The moon: paper under it, then round and round in cream and lemon.
  const disc = new Path2D();
  disc.arc(m.x, m.y, m.r, 0, TAU);
  back(x, disc);
  x.save();
  x.clip(disc);
  hatch(x, 65, m.x - m.r - 2, m.y - m.r - 2, m.x + m.r + 2, m.y + m.r + 2, {
    cols: [MOON.cream, MOON.lemon], cover: 0.9, alpha: 0.95, len: 10, gap: 1.8, width: 1.6,
  });
  const Rm = rng(hash(66));
  const cream = new Path2D();
  const lemon = new Path2D();
  for (let k = 0; k < 40; k++) {
    const rr = m.r * Math.sqrt(Rm()) + 0.5;
    const a0 = Rm() * TAU;
    const sweep = 1.4 + Rm() * 3.2;
    const ox = (Rm() - 0.5) * 3;
    const oy = (Rm() - 0.5) * 3;
    const p = Rm() < 0.7 ? cream : lemon;
    wob(p, arcPts(m.x + ox, m.y + oy, rr, a0, a0 + sweep, Math.ceil((sweep * rr) / 2.5) + 2), hash(67, k), 0.4);
  }
  crayon(x, cream, MOON.cream, 1.7, 0.95, 0.9);
  crayon(x, lemon, MOON.lemon, 1.6, 0.8, 0.84);
  // Craters: little scribbled spirals.
  const pits = new Path2D();
  for (const [dx, dy, r] of [[-8, -5, 4.5], [6, 7, 3.6], [9, -9, 2.2], [-3, 10, 1.8]]) {
    const q = [];
    for (let j = 0; j <= 18; j++) {
      const a = j * 0.75;
      const rr = r * (0.35 + 0.65 * (j / 18));
      q.push(m.x + dx + Math.cos(a) * rr, m.y + dy + Math.sin(a) * rr);
    }
    wob(pits, q, hash(68, dx, dy), 0.25);
  }
  crayon(x, pits, MOON.pit, 1.2, 0.7, 0.6);
  x.restore();
  outline(x, arcPts(m.x, m.y, m.r, 0, TAU, 40).slice(0, -2), 69, MOON.rim, 1.4, 0.9);
  return c;
}

function sky(ctx, f) {
  if (!S.sky) S.sky = bakeSky(ctx, f);
  ctx.globalAlpha = 1;
  ctx.drawImage(S.sky, -40, -80, 560, 430);
  // Stars: little crayon crosses for the bright ones, dots for the rest.
  f.stars.forEach((s, k) => {
    const R = rng(hash(88, k));
    const p = new Path2D();
    const a = R() * 0.6;
    if (s.s > 1.1) {
      const L = 1.2 + s.s * 1.2;
      p.moveTo(s.x - Math.cos(a) * L, s.y - Math.sin(a) * L);
      p.lineTo(s.x + Math.cos(a) * L, s.y + Math.sin(a) * L);
      p.moveTo(s.x + Math.sin(a) * L, s.y - Math.cos(a) * L);
      p.lineTo(s.x - Math.sin(a) * L, s.y + Math.cos(a) * L);
    } else {
      p.moveTo(s.x - 0.4, s.y + 0.2);
      p.lineTo(s.x + 0.5, s.y - 0.2);
    }
    crayon(ctx, p, STAR[k % 3 === 0 ? 1 : 0], s.s > 1.1 ? 1.1 : 1.3, s.twinkle, 0.85);
  });
  for (const c of f.clouds) cloud(ctx, c);
  for (const b of f.bats) bat(ctx, b);
}

// Cloud wisps: rows of flat scumbled strokes inside the planned lobes, pale on top,
// darker underneath. Laid out from the cloud's own corner so they drift intact.
const LOBES = [[0.18, 0.55, 0.22], [0.4, 0.35, 0.3], [0.64, 0.5, 0.24], [0.84, 0.62, 0.16]];
function cloud(ctx, c) {
  ctx.save();
  ctx.translate(c.x, c.y);
  const R = rng(hash(44, c.i));
  const rows = [new Path2D(), new Path2D(), new Path2D()];
  for (const [u, v, r] of LOBES) {
    const cx = u * c.w;
    const cy = v * c.h;
    const hh = r * c.h * 1.05;
    const hl = r * c.w * 0.6;
    for (let y = -hh; y <= hh; y += 1.6) {
      const half = hl + Math.sqrt(Math.max(0, hh * hh - y * y)) * 1.4;
      const a = cx - half * (0.85 + R() * 0.2);
      const b = cx + half * (0.85 + R() * 0.2);
      const band = y < -hh * 0.3 ? 0 : y < hh * 0.4 ? 1 : 2;
      const split = R() < 0.4 ? a + (b - a) * (0.3 + R() * 0.4) : null;
      const tilt = -0.03 * (b - a);
      const p = rows[band];
      if (split == null) {
        p.moveTo(a, cy + y);
        p.quadraticCurveTo((a + b) / 2, cy + y - 0.6 + R() * 1.2, b, cy + y + tilt);
      } else {
        p.moveTo(a, cy + y);
        p.lineTo(split - 1.5, cy + y + tilt * ((split - a) / (b - a)));
        p.moveTo(split + 1, cy + y + tilt * ((split - a) / (b - a)) + 0.4);
        p.lineTo(b, cy + y + tilt);
      }
    }
  }
  crayon(ctx, rows[2], CLOUD.under, 1.5, 0.6, 0.5);
  crayon(ctx, rows[1], CLOUD.body, 1.5, 0.68, 0.5);
  crayon(ctx, rows[0], CLOUD.top, 1.5, 0.72, 0.52);
  ctx.restore();
}

function bat(ctx, b) {
  const up = Math.cos(b.flap * TAU);
  ctx.save();
  ctx.translate(b.x, b.y);
  const s = b.s;
  const p = new Path2D();
  p.moveTo(0, 0);
  p.quadraticCurveTo(-5 * s, (-4 * up - 2) * s, -10 * s, -6 * up * s);
  p.quadraticCurveTo(-7 * s, -1 * s, -6 * s, 1 * s);
  p.quadraticCurveTo(-3 * s, 0, 0, 2 * s);
  p.quadraticCurveTo(3 * s, 0, 6 * s, 1 * s);
  p.quadraticCurveTo(7 * s, -1 * s, 10 * s, -6 * up * s);
  p.quadraticCurveTo(5 * s, (-4 * up - 2) * s, 0, 0);
  p.ellipse(0, 0.5 * s, 1.7 * s, 2.3 * s, 0, 0, TAU);
  back(ctx, p);
  ctx.fillStyle = wax(ctx, BAT, 0.9);
  ctx.fill(p);
  ctx.lineWidth = 0.9;
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = wax(ctx, BAT, 0.8);
  ctx.stroke(p);
  ctx.restore();
}

// ------------------------------------------------------------------ land
// Everything on the land is still in its own frame, so each ridge is baked once as a
// seamless strip one period long and each item once as a sprite, both at the device
// scale, and a frame only blits them, snapped to whole device pixels. Only the lamp's
// glow, the fog, the clouds, the bats and the stars are drawn live.
function snap(v, scale, off) {
  return (Math.round(v * scale + off) - off) / scale;
}

function sprite(key, box, draw) {
  let sp = S.sprites.get(key);
  if (!sp) {
    const [x0, y0, x1, y1] = box.map(Math.round);
    const c = makeCanvas((x1 - x0) * S.k, (y1 - y0) * S.k);
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

// A hand's wobble that repeats exactly every period P, so the strip has no seam.
function periodic(P, seed, amps) {
  const terms = amps.map(([amp, f], k) => [amp, Math.max(1, Math.round((f * P) / TAU)), seed * (1.3 + k)]);
  return (u) => {
    let v = 0;
    for (const [amp, n, ph] of terms) v += amp * Math.sin((TAU * n * u) / P + ph);
    return v;
  };
}

function ridgeStrip(f, name) {
  const st = LAND[name];
  const L = f.layers[name];
  const P = CRYPT_PLAN[name].period;
  const sh = L.shift;
  const rid = (u) => L.ridge(u - sh);
  let top = Infinity;
  for (let u = 0; u < P; u += 2) top = Math.min(top, rid(u));
  const box = [0, Math.floor(top - 5), P, f.laneTop + 6];
  return sprite('ridge:' + name, box, (ctx) => {
    const M = 24;
    const seed = st.seed;
    const edge = periodic(P, seed, [[0.45, 0.37], [0.3, 1.13]]);
    const lip = periodic(P, seed + 1, [[0.5, 0.19]]);
    const path = new Path2D();
    path.moveTo(-M, 340);
    for (let u = -M; u <= P + M; u += 2) path.lineTo(u, rid(u) + edge(u));
    path.lineTo(P + M, 340);
    path.closePath();
    back(ctx, path);
    ctx.save();
    ctx.clip(path);
    hatch(ctx, seed, -M, top - 4, P + M, box[3], { ...st.hill, per: P }, (x, y, ext) => {
      const c = rid(x);
      if (y + ext < c - 1) return 0;
      return 1 - st.fade * Math.max(0, Math.min(1, (y - c) / st.fadeDepth));
    });
    ctx.restore();
    // The crest, gone over twice and broken where the hand lifted.
    const chunks = Math.round(P / 22);
    for (let pass = 0; pass < 2; pass++) {
      const p = new Path2D();
      let pen = false;
      for (let u = -M; u <= P + M; u += 2) {
        const idx = Math.floor((((u % P) + P) % P) / (P / chunks));
        if (h01(seed + 40 + pass, idx) < (pass ? 0.5 : 0.1)) { pen = false; continue; }
        const y = rid(u) + edge(u) + lip(u) * (pass ? -1 : 1) + pass * 0.9;
        if (pen) p.lineTo(u, y); else { p.moveTo(u, y); pen = true; }
      }
      crayon(ctx, p, st.crest, pass ? 1 : 1.4, st.crestA * (pass ? 0.5 : 1), 0.62);
    }
  });
}

function blitStrip(ctx, sp, shift, W) {
  const P = sp.w;
  const m = ctx.getTransform();
  const X0 = snap(-(((shift % P) + P) % P), m.a, m.e);
  const Y0 = snap(sp.y0, m.d, m.f);
  ctx.globalAlpha = 1;
  for (let X = X0 - P; X < W + 40; X += P) if (X + P > -40) ctx.drawImage(sp.c, X, Y0, sp.w, sp.h);
}

// The abbey stands behind its own ridge, windows open to the sky.
function abbey(ctx, it, st) {
  const s = it.s;
  const seed = hash(st.seed, it.i, 1);
  const S1 = (q) => scalePts(q, s);
  const body = { cols: ['#6a6db6', '#7477bc'], cover: 0.74, alpha: 0.9, len: 9, gap: 1.6, width: 1.3, line: '#b3b7ef', la: 0.8, lw: 1.1, holeLine: '#2c2a60' };
  const lit = { ...body, cols: ['#8286c8', '#8d91cf'] };
  solid(ctx, seed, [
    S1([-54, 2, -54, -24, -48, -30, -40, -28, -34, -36, -22, -34, -16, -40, -8, -37, 2, -40, 2, 2]),
    ...[-42, -27, -12].map((x) => S1(lancetPts(x, -6, 8, 20))),
  ], body);
  solid(ctx, seed + 1, [S1(rect(2, -54, 16, 56)), S1(lancetPts(10, -38, 5, 10))], lit);
  solid(ctx, seed + 2, [S1([0, -54, 10, -86, 20, -54])], { ...body, len: 7 });
  solid(ctx, seed + 3, [
    S1([18, 2, 18, -26, 28, -34, 32, -30, 38, -36, 50, -24, 50, 2]),
    S1(arcPts(34, -17, 4.5, 0, TAU, 12).slice(0, -2)),
  ], body);
}

function deadTreeLimbs(s, lean, w, extra, dx = 0, dy = 0) {
  const L = lean;
  return [
    { pts: [0, 1, L * 4 * s, -26 * s, L * 8 * s, -50 * s], w: 1.3 },
    { pts: [L * 3 * s, -20 * s, -12 * s, -32 * s, -17 * s, -42 * s], w: 0.8 },
    { pts: [-12 * s, -32 * s, -21 * s, -34 * s], w: 0.55 },
    { pts: [L * 5 * s, -30 * s, 13 * s, -40 * s, 20 * s, -42 * s], w: 0.8 },
    { pts: [13 * s, -40 * s, 15 * s, -49 * s], w: 0.55 },
    { pts: [L * 7 * s, -42 * s, -3 * s, -52 * s], w: 0.55 },
  ].map((l) => ({ pts: l.pts.map((v, j) => v + (j % 2 ? dy : dx)), w: w * s * l.w + extra }));
}

function grove(ctx, it, st) {
  const n = 3 + (it.i % 3);
  const R = rng(hash(st.seed, it.i, 2));
  for (let k = 0; k < n; k++) {
    const dx = (k - (n - 1) / 2) * 12 * it.s + (R() - 0.5) * 6;
    const sc = (0.42 + R() * 0.24) * it.s;
    const lean = (R() - 0.5) * 0.6;
    limbs(ctx, hash(st.seed, it.i, k), deadTreeLimbs(sc, lean, 2.2, 0.9, dx, 2), { col: st.tree, width: 1.1, alpha: 0.95, cover: 0.75, gap: 1.2 });
  }
}

function tree(ctx, it, st) {
  const list = deadTreeLimbs(it.s, it.variant === 1 ? -0.8 : 0.2, 2.4, 1.6);
  limbs(ctx, hash(st.seed, it.i, 3), list, { col: st.tree, col2: st.treeB, rim: st.rim, rimA: 0.7, width: 1.3 });
}

function mausoleum(ctx, it, st) {
  const s = it.s;
  const seed = hash(st.seed, it.i, 4);
  const S1 = (q) => scalePts(q, s);
  const small = { cover: 0.72, alpha: 0.92, len: 7, gap: 1.5, width: 1.2, lw: 0.9, la: 0.65 };
  const body = { ...small, cols: ['#5b56a0', '#6560a8'], line: '#9a95d6' };
  const lit = { ...small, cols: ['#7a75bc', '#8580c4'], line: '#aca7e2' };
  const dark = { ...small, cols: ['#0c0a16'], cover: 0.85, alpha: 1, len: 6, gap: 1.2 };
  solid(ctx, seed, [S1(rect(-24, -4, 48, 6))], lit);
  solid(ctx, seed + 1, [S1(rect(-20, -8, 40, 4))], lit);
  solid(ctx, seed + 2, [S1(rect(-18, -32, 36, 24))], body);
  solid(ctx, seed + 3, [S1(rect(-15, -31, 4, 23))], lit);
  solid(ctx, seed + 4, [S1(rect(11, -31, 4, 23))], lit);
  solid(ctx, seed + 5, [S1(lancetPts(0, -8, 12, 16))], dark);
  if (it.variant === 1) {
    solid(ctx, seed + 6, [S1(rect(-20, -36, 40, 4))], lit);
    solid(ctx, seed + 7, [S1(arcPts(0, -36, 14, Math.PI, TAU, 14))], body);
    const p = new Path2D();
    wob(p, S1([0, -50, 0, -56]), seed + 8, 0.2);
    wob(p, S1([-3, -53, 3, -53]), seed + 9, 0.2);
    crayon(ctx, p, lit.line, 1.2, 0.8, 0.7);
  } else {
    solid(ctx, seed + 6, [S1([-22, -32, 0, -44, 22, -32])], lit);
  }
}

function stonePoly(variant) {
  if (variant === 2) return [-4, 0, -4, -3, -2.6, -3, -1.8, -18, 0, -21, 1.8, -18, 2.6, -3, 4, -3, 4, 0];
  if (variant === 1) return [-5, 0, -5, -12, -1.5, -12, 0, -14, 1.5, -12, 5, -12, 5, 0];
  return [-4.5, 0, ...arcPts(0, -9, 4.5, Math.PI, TAU, 8), 4.5, 0];
}
const down = (q, dy) => q.map((v, j) => (j % 2 ? v + dy : v));

function stone(ctx, it, st) {
  const seed = hash(st.seed, it.i, 5);
  const lean = (h01(seed, 1) - 0.5) * 0.26;
  const q = down(rotPts(scalePts(stonePoly(it.variant), it.s), lean), 1);
  solid(ctx, seed, [q], { cols: st.stone.cols, cover: 0.8, alpha: 0.95, len: 6, gap: 1.35, width: 1.2, patch: 3, line: st.stone.line, lw: 0.9, la: 0.7 });
}

function cross(ctx, it, st) {
  const seed = hash(st.seed, it.i, 6);
  const lean = (h01(seed, 1) - 0.5) * 0.18;
  const s = it.s;
  const o = { cols: st.stone.cols, cover: 0.8, alpha: 0.95, len: 5, gap: 1.3, width: 1.2, patch: 3, line: st.stone.line, lw: 0.9, la: 0.7 };
  if (it.i % 2 === 0) {
    const ring = down(rotPts(scalePts(arcPts(0, -15, 4.2, 0, TAU, 16).slice(0, -2), s), lean), 1);
    const p = new Path2D();
    wob(p, ring, seed + 2, 0.25, true);
    ctx.lineWidth = 2.8;
    ctx.globalAlpha = 1;
    ctx.strokeStyle = paper(ctx);
    ctx.stroke(p);
    crayon(ctx, p, st.stone.cols[0], 1.5, 0.95, 0.7);
    const p2 = new Path2D();
    wob(p2, ring.slice(4).concat(ring.slice(0, 6)), seed + 3, 0.4);
    crayon(ctx, p2, st.stone.line, 0.9, 0.5, 0.6);
  }
  const q = down(rotPts(scalePts([-1.6, 0, -1.6, -11, -6, -11, -6, -14.5, -1.6, -14.5, -1.6, -20, 1.6, -20, 1.6, -14.5, 6, -14.5, 6, -11, 1.6, -11, 1.6, 0], s), lean), 1);
  solid(ctx, seed, [q], o);
}

function gnarl(ctx, it, st) {
  const s = it.s;
  const flip = it.variant === 1 ? -1 : 1;
  const X = (dx) => dx * s * flip;
  const Y = (dy) => dy * s + 2;
  const w = 7 * s;
  const list = [
    { pts: [X(0), Y(0), X(-4), Y(-30), X(4), Y(-58), X(0), Y(-84)], w: 1.6 },
    { pts: [X(2), Y(-50), X(24), Y(-66), X(44), Y(-64), X(58), Y(-74)], w: 0.9 },
    { pts: [X(44), Y(-64), X(52), Y(-56), X(62), Y(-58)], w: 0.5 },
    { pts: [X(30), Y(-66), X(36), Y(-82), X(48), Y(-92)], w: 0.55 },
    { pts: [X(0), Y(-80), X(-14), Y(-100), X(-26), Y(-104)], w: 0.8 },
    { pts: [X(-14), Y(-100), X(-12), Y(-114)], w: 0.45 },
    { pts: [X(1), Y(-84), X(14), Y(-104), X(30), Y(-112), X(38), Y(-124)], w: 0.7 },
    { pts: [X(20), Y(-107), X(28), Y(-100), X(36), Y(-102)], w: 0.4 },
    { pts: [X(-2), Y(-36), X(-18), Y(-46), X(-26), Y(-44)], w: 0.6 },
    { pts: [X(-6), Y(0), X(-14), Y(3)], w: 0.9 },
    { pts: [X(5), Y(0), X(14), Y(3)], w: 0.9 },
  ].map((l) => ({ pts: l.pts, w: w * l.w + 1.8 }));
  limbs(ctx, hash(st.seed, it.i, 7), list, { col: st.tree, col2: st.treeB, rim: st.rim, rimA: 0.75, rimW: 1.2, width: 1.4, gap: 1.15, cover: 0.85 });
}

// Drawn from the fence's first bar (x0, 0): bars stand on the ridge under them.
function fence(ctx, it, L, st) {
  const seed = hash(st.seed, it.i, 8);
  const gateHalf = 15;
  const span = it.x1 - it.x0;
  const g = it.gate == null ? null : it.gate - it.x0;
  const base = (x) => L.ridge(it.x0 + x);
  const bars = new Path2D();
  const tips = new Path2D();
  for (let k = 0, x = 0; x <= span; k++, x += 7) {
    if (g != null && Math.abs(x - g) < gateHalf + 2) continue;
    const b = base(x);
    wob(bars, [x, b + 1, x, b - 20], hash(seed, k), 0.25);
    const R = rng(hash(seed, k, 1));
    const tx = x + (R() - 0.5) * 0.6;
    tips.moveTo(tx - 2, b - 20);
    tips.lineTo(tx, b - 25 - R() * 0.8);
    tips.lineTo(tx + 2, b - 20);
    tips.closePath();
  }
  const rails = new Path2D();
  const runs = g == null ? [[0, span]] : [[0, g - gateHalf], [g + gateHalf, span]];
  for (const [a, b] of runs) {
    for (const h of [5, 16]) {
      const q = [];
      for (let x = a; x < b; x += 3.5) q.push(x, base(x) - h);
      q.push(b, base(b) - h);
      wob(rails, q, hash(seed, h, Math.round(a)), 0.3);
    }
  }
  const gate = new Path2D();
  const posts = new Path2D();
  const knobs = new Path2D();
  if (g != null) {
    const b = L.foot(it.gate, gateHalf);
    wob(posts, [g - gateHalf, b + 1, g - gateHalf, b - 32], seed + 1, 0.3);
    wob(posts, [g + gateHalf, b + 1, g + gateHalf, b - 32], seed + 2, 0.3);
    const arch = [];
    for (let j = 0; j <= 10; j++) {
      const t = j / 10;
      const x = g - gateHalf + t * 2 * gateHalf;
      arch.push(x, b - 26 - 14 * Math.sin(t * Math.PI) * (1 - 0.2 * Math.abs(t - 0.5)));
    }
    wob(gate, arch, seed + 3, 0.3);
    for (let x = g - gateHalf + 5, k = 0; x < g + gateHalf - 2; x += 5, k++) {
      wob(gate, [x, b, x, b - 26 - 6 * Math.cos(((x - g) / gateHalf) * 1.4)], hash(seed, 50 + k), 0.25);
    }
    wob(gate, [g - gateHalf, b - 12, g + gateHalf, b - 12], seed + 4, 0.3);
    for (const x of [g - gateHalf, g + gateHalf]) {
      knobs.moveTo(x + 2.4, b - 34);
      knobs.arc(x, b - 34, 2.4, 0, TAU);
    }
  }
  // Paper under the iron, so the hill never shows through the gaps in the black.
  ctx.globalAlpha = 1;
  ctx.lineCap = 'round';
  ctx.strokeStyle = paper(ctx);
  ctx.fillStyle = paper(ctx);
  ctx.lineWidth = 1.5; ctx.stroke(bars); ctx.stroke(gate);
  ctx.lineWidth = 1.3; ctx.stroke(rails);
  ctx.lineWidth = 2.8; ctx.stroke(posts);
  ctx.fill(tips); ctx.fill(knobs);
  crayon(ctx, bars, IRON, 1.5, 1, 0.85);
  crayon(ctx, rails, IRON, 1.3, 1, 0.85);
  crayon(ctx, gate, IRON, 1.4, 1, 0.85);
  crayon(ctx, posts, IRON, 2.8, 1, 0.85);
  ctx.globalAlpha = 1;
  ctx.fillStyle = wax(ctx, IRON, 0.85);
  ctx.fill(tips);
  ctx.fill(knobs);
}

function fenceBox(it, L) {
  let lo = Infinity;
  let hi = -Infinity;
  for (let x = it.x0 - 4; x <= it.x1 + 4; x += 2) {
    const b = L.ridge(x);
    lo = Math.min(lo, b);
    hi = Math.max(hi, b);
  }
  return [-6, Math.floor(lo - 42), Math.ceil(it.x1 - it.x0 + 6), Math.ceil(hi + 6)];
}

function lampBody(ctx, it, st) {
  const s = it.s;
  const seed = hash(st.seed, it.i, 9);
  ctx.save();
  ctx.translate(0, 1);
  limbs(ctx, seed + 1, [{ pts: [0, 0, 0, -34 * s], w: 2.8 * s }], { col: IRON, width: 1.3, cover: 0.85, gap: 1 });
  solid(ctx, seed + 2, [scalePts(rect(-3.5, -3, 7, 3), s)], { cols: [IRON], cover: 0.85, alpha: 1, len: 4, gap: 1, width: 1.2, patch: 3 });
  const glass = scalePts([-5, -36, 5, -36, 4, -45, -4, -45], s);
  solid(ctx, seed + 3, [glass], { cols: [WARM.glass, WARM.core], cover: 0.95, alpha: 1, len: 5, gap: 0.9, width: 1.3, patch: 3 });
  const frame = new Path2D();
  wob(frame, glass, seed + 6, 0.2, true);
  wob(frame, scalePts([0, -36, 0, -45], s), seed + 7, 0.15);
  crayon(ctx, frame, IRON, 1, 1, 0.85);
  solid(ctx, seed + 8, [scalePts([-6, -45, 0, -50.5, 6, -45], s)], { cols: [IRON], cover: 0.85, alpha: 1, len: 4, gap: 1, width: 1.2, patch: 3 });
  ctx.restore();
}

// The lamp's glow flickers, so it is drawn live over the baked lamp: loops of warm crayon
// round the lantern, pressed less the further out, and a hot core in the glass.
function lampGlow(ctx, it, f, st) {
  const s = it.s;
  const seed = hash(st.seed, it.i, 9);
  const flick = 0.86 + 0.14 * Math.sin(f.t * 11 + it.i) * Math.sin(f.t * 7.3);
  ctx.save();
  ctx.translate(it.x, it.y + 1);
  const hy = -40 * s;
  const R = rng(seed);
  const rings = [new Path2D(), new Path2D(), new Path2D()];
  for (let k = 0; k < 30; k++) {
    const t = R();
    const rr = (6 + t * t * 26) * s;
    const a0 = R() * TAU;
    const sweep = 1 + R() * 2.4;
    wob(rings[rr < 12 * s ? 0 : rr < 21 * s ? 1 : 2], arcPts((R() - 0.5) * 2, hy + (R() - 0.5) * 2, rr, a0, a0 + sweep, Math.ceil((sweep * rr) / 3)), hash(seed, k), 0.5);
  }
  // A tight warm scribble hugging the lantern, then the looser rings.
  const hug = new Path2D();
  for (let k = 0; k < 7; k++) {
    const rr = (4.5 + k * 0.9) * s;
    const a0 = R() * TAU;
    wob(hug, arcPts(0, hy, rr, a0, a0 + 3.5 + R() * 2, Math.ceil(rr * 2)), hash(seed, 60 + k), 0.4);
  }
  crayon(ctx, rings[2], WARM.glow, 1.3, 0.22 * flick, 0.5);
  crayon(ctx, rings[1], WARM.glow, 1.4, 0.42 * flick, 0.58);
  crayon(ctx, rings[0], WARM.core, 1.4, 0.6 * flick, 0.66);
  crayon(ctx, hug, WARM.core, 1.3, 0.45 * flick, 0.7);
  const core = new Path2D();
  wob(core, scalePts([-1.5, -38, 1.2, -43], s), seed + 4, 0.2);
  wob(core, scalePts([1.2, -38, -1, -42.5], s), seed + 5, 0.2);
  crayon(ctx, core, '#fff0b8', 1.3, 0.95 * flick, 0.8);
  ctx.restore();
}

function grass(ctx, it, st) {
  const seed = hash(st.seed, it.i, 10);
  const dim = new Path2D();
  const lit = new Path2D();
  const R = rng(seed);
  for (let k = 0; k < 7; k++) {
    const dx = (k - 3) * 2.2 * it.s;
    const h = (7 + R() * 7) * it.s;
    const bend = (R() - 0.4) * 6 * it.s;
    const q = [dx, 2, dx + bend * 0.2, -h * 0.35, dx + bend * 0.5, -h * 0.7, dx + bend, -h];
    wob(k % 3 === 1 ? lit : dim, q, hash(seed, k), 0.3);
  }
  crayon(ctx, dim, st.grass, 1.3, 0.95, 0.75);
  crayon(ctx, lit, st.grassLit, 1.1, 0.6, 0.6);
}

// Fog: flat scumbled strokes in pale lavender, laid out from each puff's centre.
function fog(ctx, band, b) {
  for (const p of band.puffs) {
    ctx.save();
    ctx.translate(p.x, p.y);
    const R = rng(hash(900 + b, p.i));
    const pa = [new Path2D(), new Path2D()];
    for (let y = -p.ry; y <= p.ry; y += 1.8) {
      const chord = p.rx * Math.sqrt(Math.max(0, 1 - (y / p.ry) ** 2));
      if (chord < 4) continue;
      const a = -chord * (0.75 + R() * 0.25);
      const e = chord * (0.75 + R() * 0.25);
      const q = pa[R() < 0.7 ? 0 : 1];
      if (R() < 0.45) {
        const m = a + (e - a) * (0.3 + R() * 0.4);
        q.moveTo(a, y); q.lineTo(m - 2, y - 0.3);
        q.moveTo(m + 2, y + 0.4); q.lineTo(e, y + 0.1);
      } else {
        q.moveTo(a, y);
        q.quadraticCurveTo(0, y - 0.8 + R() * 1.6, e, y - 0.3);
      }
    }
    crayon(ctx, pa[0], FOG[0], 1.7, b ? 0.3 : 0.38, 0.5);
    crayon(ctx, pa[1], FOG[1], 1.5, b ? 0.26 : 0.32, 0.48);
    ctx.restore();
  }
}

// Generous local boxes per kind, (0,0) at the item's foot, big enough for s up to ~1.2.
const BOX = {
  abbey: [-62, -94, 58, 8], grove: [-50, -50, 50, 8], mausoleum: [-28, -62, 28, 6],
  stone: [-9, -26, 9, 5], cross: [-10, -26, 10, 5], tree: [-34, -66, 34, 6],
  gnarl: [-74, -136, 74, 10], lamp: [-9, -56, 9, 5], grass: [-13, -20, 13, 5],
};
const PAINT = { abbey, grove, mausoleum, stone, cross, tree, gnarl, grass, lamp: lampBody };

function item(ctx, f, name, it, L, st) {
  if (it.kind === 'fence') {
    blit(ctx, sprite(`${name}:${it.i}`, fenceBox(it, L), (x) => fence(x, it, L, st)), it.x0, 0);
    return;
  }
  const draw = PAINT[it.kind];
  if (!draw) return;
  blit(ctx, sprite(`${name}:${it.i}`, BOX[it.kind], (x) => draw(x, it, st)), it.x, it.y);
  if (it.kind === 'lamp') lampGlow(ctx, it, f, st);
}

function layer(ctx, f, name) {
  const L = f.layers[name];
  const st = LAND[name];
  for (const it of L.items) if (it.kind === 'abbey') item(ctx, f, name, it, L, st);
  blitStrip(ctx, ridgeStrip(f, name), L.shift, f.W);
  for (const it of L.items) if (it.kind !== 'abbey') item(ctx, f, name, it, L, st);
}

export const STYLE = {
  id: 'crayon',
  name: 'WAX CRAYON',
  note: 'Light wax crayon laid onto black paper: every fill is hand-angled hatching broken by the paper tooth, '
    + 'outlines wobble and double back. Far hills are pale, sparse strokes; near things pressed hard. One orange for the lamp.',
  paint(ctx, f) {
    prepare(ctx);
    ctx.save();
    sky(ctx, f);
    layer(ctx, f, 'bg');
    layer(ctx, f, 'mid');
    fog(ctx, f.fog[0], 0);
    layer(ctx, f, 'fg');
    // Plain paper under the lane, so nothing of the sky's hatch is left down there.
    ctx.globalAlpha = 1;
    ctx.fillStyle = paper(ctx);
    ctx.fillRect(-40, f.laneTop + 5, f.W + 80, 350 - f.laneTop);
    fog(ctx, f.fog[1], 1);
    ctx.restore();
  },
};
