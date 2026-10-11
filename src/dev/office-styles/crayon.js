// CORPORATE KOMBAT style bake-off — WAX CRAYON ON KRAFT PAPER. The climb drawn the way a
// pastel illustrator works on toned stock: the brown kraft IS the middle value, darks go
// on in black and sepia crayon, lights in heavy cream and white, and colour only where the
// thing has colour (the sky, the plants, the logo, the sunset, the lamps). A surface is
// blocked in with the side of the crayon (one waxy fill through the paper's tooth, which
// has a grain, so the kraft shows in short drags rather than salt), then hatched in short
// parallel strokes only where it turns into shade, then lit with heavy cream. Outlines
// wobble but go on in one confident pass. Far things are a few pale strokes, near things
// are pressed hard, and the band behind the lane is drawn with the lightest hand in the
// card so the hazards and the hero sit on calm paper.
//
// Nothing crawls: every stroke is seeded by the thing it belongs to and laid out in that
// thing's own frame — a skyline, the wall, the ceiling and the slab are each baked once
// per device scale as a seamless strip one period long and blitted at their layer's shift;
// furniture is baked as one sprite per item and blitted at its foot. Big fills use a
// seamless square of hatching anchored at the thing's own corner. The floor plane is baked
// row by row in perspective (each device row its own strip at its own rate, so the joints
// shear exactly), its strokes laid in the floor's own u in lanes a couple of rows deep.
// Only the moving parts are drawn live, each in its own snapped frame so the tooth travels
// with it: lift doors, clock hands, heads, the revolving door, the cradle, the flyer, cars,
// clouds, lamps and stars.

import { OFFICE_FLOORS } from './plan.js';

const TAU = Math.PI * 2;
const HAND = 1.12; // the hand's hatch angle, radians above horizontal: strokes rise to the right

// ------------------------------------------------------------------ the box of crayons
const PAPER = '#a88a66'; // kraft
const INK = '#21170f'; // black wax, warm
const SEPIA = '#4a3021';
const CREAM = '#f3e2b8';
const WHITE = '#fbf5e4';
const LEMON = '#f5d56a';
const GOLD = '#d9a83c';
const RED = '#c23a2a';

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
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// ------------------------------------------------------------------ paper and tooth
// One square of paper tooth per device scale, baked once. `rank` is the tooth height
// equalised to 0..1, so a crayon of cover 0.6 lands on the highest 60 % of the paper and
// skips the pits, the way wax does. Kraft has fibres, so a second map carries them.
const TILE = 32; // user px
const PAT_CAP = 260;
const STORE = new Map();
let S = null;

function makeCanvas(w, h) {
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = Math.max(1, w);
    c.height = Math.max(1, h);
    return c;
  }
  return new OffscreenCanvas(Math.max(1, w), Math.max(1, h));
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
  const soft = new Float32Array(N * N);
  const G = (x, y) => grain[((y + N) % N) * N + ((x + N) % N)];
  // Kraft has a grain: the tooth is drawn out along the sheet, so where wax skips it skips
  // in short horizontal drags rather than in salt.
  const reach = Math.max(1, Math.round(1.5 * k));
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let acc = 0;
      let wsum = 0;
      for (let d = -reach; d <= reach; d++) {
        const w = reach + 1 - Math.abs(d);
        acc += w * G(x + d, y);
        wsum += w;
      }
      soft[y * N + x] = 0.82 * (acc / wsum) + 0.09 * (G(x, y - 1) + G(x, y + 1));
    }
  }
  const fine = valueNoise(20, 13, N);
  const mid = valueNoise(8, 11, N);
  const coarse = valueNoise(2, 12, N);
  // Kraft fibres: short streaks running mostly along the sheet, some dark, some pale.
  const fib = new Float32Array(N * N);
  const Rf = rng(0xf1b);
  for (let q = 0; q < (N * N) / (110 * k); q++) {
    let x = Rf() * N;
    let y = Rf() * N;
    const a = (Rf() - 0.5) * 0.7;
    const len = (3 + Rf() * 9) * k;
    const v = Rf() < 0.7 ? 1 : -1;
    for (let d = 0; d < len; d++) {
      fib[(Math.floor(y + N) % N) * N + (Math.floor(x + N) % N)] += v * 0.5;
      x += Math.cos(a);
      y += Math.sin(a);
    }
  }
  const n = new Float32Array(N * N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      n[i] = 0.74 * soft[i] + 0.14 * fine(x, y) + 0.05 * mid(x, y) + 0.02 * coarse(x, y) + 0.04 * Math.max(-1, Math.min(1, fib[i]));
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
  return { k, N, rank, fib, pats: new Map(), paper: new Map(), tiles: new Map(), floors: {}, sprites: new Map() };
}

function prepare(ctx) {
  const m = ctx.getTransform?.();
  const k = m ? Math.max(1, Math.min(3, Math.round(Math.hypot(m.a, m.b)))) : 1;
  S = STORE.get(k);
  if (!S) { S = buildStore(k); STORE.set(k, S); }
}

function hexRgb(h) {
  const v = parseInt(h.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function tileCanvas(fillPx) {
  const c = makeCanvas(S.N, S.N);
  const x = c.getContext('2d');
  const img = x.createImageData(S.N, S.N);
  fillPx(img.data);
  x.putImageData(img, 0, 0);
  return c;
}

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
  cover = Math.round(cover * 25) / 25;
  const key = colour + cover;
  let e = S.pats.get(key);
  if (e) {
    S.pats.delete(key);
    S.pats.set(key, e);
  } else {
    const [r, g, b] = hexRgb(colour);
    const lo = 1 - cover;
    const c = tileCanvas((d) => {
      for (let i = 0; i < S.rank.length; i++) {
        let a = (S.rank[i] - lo) / 0.1 + 0.5;
        a = a < 0 ? 0 : a > 1 ? 1 : a;
        d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = a * 255;
      }
    });
    e = { c, p: ctx.createPattern(c, 'repeat') };
    S.pats.set(key, e);
    if (S.pats.size > PAT_CAP) S.pats.delete(S.pats.keys().next().value);
  }
  return align(ctx, e.p);
}

function paper(ctx, colour = PAPER) {
  let e = S.paper.get(colour);
  if (!e) {
    const [r, g, b] = hexRgb(colour);
    const c = tileCanvas((d) => {
      for (let i = 0; i < S.rank.length; i++) {
        const v = (S.rank[i] - 0.5) * 9 + Math.max(-1, Math.min(1, S.fib[i])) * 7;
        d[i * 4] = r + v; d[i * 4 + 1] = g + v * 0.92; d[i * 4 + 2] = b + v * 0.8; d[i * 4 + 3] = 255;
      }
    });
    e = { c, p: ctx.createPattern(c, 'repeat') };
    S.paper.set(colour, e);
  }
  return align(ctx, e.p);
}

// Paper and a wax colour laid on it in one opaque pattern: blocking in a surface with the
// side of the crayon costs one fill instead of two.
function grounded(ctx, colour, cover) {
  cover = Math.round(cover * 25) / 25;
  const key = 'g' + colour + cover;
  let e = S.pats.get(key);
  if (!e) {
    const [pr, pg, pb] = hexRgb(PAPER);
    const [r, g, b] = hexRgb(colour);
    const lo = 1 - cover;
    const c = tileCanvas((d) => {
      for (let i = 0; i < S.rank.length; i++) {
        let a = (S.rank[i] - lo) / 0.1 + 0.5;
        a = a < 0 ? 0 : a > 1 ? 1 : a;
        const v = (S.rank[i] - 0.5) * 9 + Math.max(-1, Math.min(1, S.fib[i])) * 7;
        d[i * 4] = r * a + (pr + v) * (1 - a);
        d[i * 4 + 1] = g * a + (pg + v * 0.92) * (1 - a);
        d[i * 4 + 2] = b * a + (pb + v * 0.8) * (1 - a);
        d[i * 4 + 3] = 255;
      }
    });
    e = { c, p: ctx.createPattern(c, 'repeat') };
    S.pats.set(key, e);
    if (S.pats.size > PAT_CAP) S.pats.delete(S.pats.keys().next().value);
  }
  return align(ctx, e.p);
}
function block(ctx, path, colour, cover, rule = 'nonzero') {
  ctx.globalAlpha = 1;
  ctx.fillStyle = grounded(ctx, colour, cover);
  ctx.fill(path, rule);
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

function back(ctx, path, colour = PAPER, rule = 'nonzero') {
  ctx.globalAlpha = 1;
  ctx.fillStyle = paper(ctx, colour);
  ctx.fill(path, rule);
}

// A flat waxy fill: colour laid through the tooth in one go (the crayon on its side).
function smear(ctx, path, colour, cover, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = wax(ctx, colour, cover);
  ctx.fill(path);
}

const BUCKET = [0.55, 0.78, 1];
const EVEN = [0.82, 0.92, 1];
const PRESS = [0.86, 1, 1.1];

// Hand hatching over [x0,x1]x[y0,y1] of the current frame (the crypt card's hatch): rows of
// parallel strokes in patches of a few that share a length, a tilt and a pressure. The
// grid is anchored at the frame's origin, so strokes belong to the thing. `per` makes a
// strip wrap exactly; `gate(px, py)` scores a patch 0..1 (0 skips it, low presses light).
function hatch(ctx, seed, x0, y0, x1, y1, o, gate) {
  const { len, gap, width, cols, cover, alpha } = o;
  const patch = o.patch ?? 5;
  const ang = o.ang ?? HAND;
  const angJ = o.angJ ?? 0.07;
  const sa = Math.max(0.2, Math.abs(Math.sin(ang)));
  let rowH = len * sa * (o.rowK ?? 0.52);
  let gx = gap / sa;
  const nq = o.per ? Math.max(1, Math.round(o.per / (gx * patch))) : 0;
  if (nq) gx = o.per / (nq * patch);
  const nr = o.perY ? Math.max(1, Math.round(o.perY / rowH)) : 0;
  if (nr) rowH = o.perY / nr;
  const BK = o.even ? EVEN : BUCKET;
  const paths = new Array(cols.length * 3).fill(null);
  const r0 = Math.floor(y0 / rowH) - 1;
  const r1 = Math.floor(y1 / rowH) + 1;
  for (let r = r0; r <= r1; r++) {
    const rw = nr ? ((r % nr) + nr) % nr : r;
    const shift = h01(seed, rw, 7) * gx * patch;
    const q0 = Math.floor((x0 - shift) / (gx * patch)) - 1;
    const q1 = Math.floor((x1 - shift) / (gx * patch)) + 1;
    for (let q = q0; q <= q1; q++) {
      const R = rng(hash(seed, nq ? ((q % nq) + nq) % nq : q, rw));
      const L = len * (0.75 + R() * 0.5);
      const a = ang + (R() - 0.5) * 2 * angJ;
      const dx = Math.cos(a);
      const dy = -Math.sin(a);
      const py = r * rowH + (R() - 0.5) * rowH * 0.3;
      const px = shift + (q + 0.5) * gx * patch;
      const gr = R();
      let g = 1;
      if (gate) {
        g = gate(px, py);
        if (g <= 0 || gr > 0.72 + 0.28 * g) continue;
      }
      const ci = Math.floor(R() * cols.length);
      const key = ci * 3 + Math.min(2, Math.floor(R() * 3 * (0.4 + 0.6 * g)));
      const p = paths[key] || (paths[key] = new Path2D());
      const m = patch - (R() < 0.1 ? 1 : 0);
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
    if (paths[k]) crayon(ctx, paths[k], cols[(k / 3) | 0], width, alpha * BK[k % 3], Math.min(0.97, cover * PRESS[k % 3]));
  }
}

// A seamless square of hatching, baked once per set of crayon settings: big fills (walls,
// facades, the slab) lay it down as a pattern anchored at the thing's own corner, so a
// facade's strokes stay on the facade, and a fill costs one call instead of thousands.
const HT = 75; // divides the ceiling (1200) and slab (600) periods, so full-width fills wrap clean
function hatchPattern(ctx, o, v) {
  const key = [o.cols.join(','), o.cover, o.len, o.gap, o.width, o.ang ?? HAND, o.angJ ?? 0.07, o.patch ?? 5, o.rowK ?? 0.52, o.even ? 1 : 0, v].join('|');
  let e = S.tiles.get(key);
  if (!e) {
    const c = makeCanvas(HT * S.k, HT * S.k);
    const x = c.getContext('2d');
    x.scale(S.k, S.k);
    hatch(x, hash(9999, v, key.length), -6, -6, HT + 6, HT + 6, { ...o, alpha: 1, per: HT, perY: HT });
    e = { c, p: ctx.createPattern(c, 'repeat') };
    S.tiles.set(key, e);
  }
  return e.p;
}
function fillHatch(ctx, path, o, seed, ox = 0, oy = 0, rule = 'nonzero') {
  const p = hatchPattern(ctx, o, 0);
  const k = S.k;
  PM.a = PM.d = 1 / k;
  PM.e = Math.round((ox + ((seed >>> 5) % HT)) * k) / k;
  PM.f = Math.round((oy + ((seed >>> 11) % HT)) * k) / k;
  p.setTransform(PM);
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.fillStyle = p;
  ctx.fill(path, rule);
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

function line(ctx, pts, seed, colour, width, alpha = 1, cover = 0.75, amp = 0.35) {
  const p = new Path2D();
  wob(p, pts, seed, amp);
  crayon(ctx, p, colour, width, alpha, cover);
}

// One confident outline and a lighter second pass that lifts off early.
function outline(ctx, pts, seed, colour, width, alpha, closed = true, amp = 0.35) {
  const a = new Path2D();
  wob(a, pts, seed, amp, closed);
  crayon(ctx, a, colour, width, alpha, 0.75);
  const n = pts.length / 2;
  if (n < 2) return;
  let q = pts;
  if (closed && n > 2) {
    const k = 1 + (seed % (n - 1));
    q = pts.slice(2 * k).concat(pts.slice(0, 2 * k));
    q = q.concat(q.slice(0, 2));
  }
  const b = new Path2D();
  wob(b, q, seed + 1, amp * 1.4, false, 2);
  crayon(ctx, b, colour, width * 0.75, alpha * 0.4, 0.55);
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

const rectPts = (x, y, w, h) => [x, y, x + w, y, x + w, y + h, x, y + h];
// A leaf outline: the quarter q of a lozenge [a, b, c, d] bowed outward into a curve.
function quadInto(out, L, q) {
  const ax = L[(2 * q) % 8];
  const ay = L[(2 * q + 1) % 8];
  const bx = L[(2 * q + 2) % 8];
  const by = L[(2 * q + 3) % 8];
  for (let j = 0; j < 4; j++) {
    const t = j / 4;
    out.push(ax + (bx - ax) * t, ay + (by - ay) * t);
  }
}
function arcPts(cx, cy, rx, ry, a0, a1, n) {
  const out = [];
  for (let j = 0; j <= n; j++) {
    const a = a0 + ((a1 - a0) * j) / n;
    out.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
  }
  return out;
}
const ellPts = (cx, cy, rx, ry, n = 20) => arcPts(cx, cy, rx, ry, 0, TAU, n).slice(0, -2);

// A filled shape: paper (or a ground colour) behind it, a hatch clipped to it, an outline.
// o: hatch options + { ground, line, lw, la, noBack }.
function solid(ctx, seed, polys, o) {
  if (typeof polys[0] === 'number') polys = [polys];
  const path = polyPath(polys);
  if (o.base && !o.noBack && !o.ground && (o.baseA ?? 1) === 1) block(ctx, path, o.base, o.baseCover ?? 0.6, 'evenodd');
  else {
    if (!o.noBack) back(ctx, path, o.ground ?? PAPER, 'evenodd');
    if (o.base) smear(ctx, path, o.base, o.baseCover ?? 0.6, o.baseA ?? 1);
  }
  if (o.cols) {
    const b = bbox(polys[0]);
    const big = o.tile ?? ((b.x1 - b.x0) * (b.y1 - b.y0) > HT * HT && !o.gate);
    if (big) fillHatch(ctx, path, o, seed, b.x0, b.y0, 'evenodd');
    else {
      ctx.save();
      ctx.clip(path, 'evenodd');
      hatch(ctx, seed, b.x0 - 2, b.y0 - 2, b.x1 + 2, b.y1 + 2, o, o.gate);
      ctx.restore();
    }
  }
  if (o.line) outline(ctx, polys[0], seed + 17, o.line, o.lw ?? 1, o.la ?? 0.8, true, o.amp ?? 0.3);
  return path;
}
const box = (ctx, seed, x, y, w, h, o) => solid(ctx, seed, rectPts(x, y, w, h), o);

// Strokes of light (or shade) along one edge of a box: the illustrator's quick model.
function edge(ctx, seed, x0, y0, x1, y1, colour, width, alpha, cover = 0.8) {
  line(ctx, [x0, y0, x1, y1], seed, colour, width, alpha, cover, 0.25);
}

// ------------------------------------------------------------------ lettering
// A single-stroke hand: capitals on a 4 x 6 grid, gone over in crayon.
const GLYPH = {
  A: [[0, 6, 2, 0, 4, 6], [0.8, 3.9, 3.2, 3.9]],
  B: [[0, 6, 0, 0, 2.7, 0, 3.6, 0.8, 3.6, 2.2, 2.7, 3, 0, 3], [2.7, 3, 3.9, 3.8, 3.9, 5.2, 3, 6, 0, 6]],
  C: [[4, 1.1, 3, 0, 1.1, 0, 0, 1.3, 0, 4.7, 1.1, 6, 3, 6, 4, 4.9]],
  D: [[0, 0, 0, 6, 2.3, 6, 3.9, 4.5, 3.9, 1.5, 2.3, 0, 0, 0]],
  E: [[4, 0, 0, 0, 0, 6, 4, 6], [0, 3, 3, 3]],
  F: [[4, 0, 0, 0, 0, 6], [0, 3, 3, 3]],
  G: [[4, 1.1, 3, 0, 1.1, 0, 0, 1.3, 0, 4.7, 1.1, 6, 3, 6, 4, 4.9, 4, 3.4, 2.3, 3.4]],
  H: [[0, 0, 0, 6], [4, 0, 4, 6], [0, 3, 4, 3]],
  I: [[2, 0, 2, 6], [0.9, 0, 3.1, 0], [0.9, 6, 3.1, 6]],
  K: [[0, 0, 0, 6], [4, 0, 0, 3.7], [1.4, 2.6, 4, 6]],
  L: [[0, 0, 0, 6, 4, 6]],
  M: [[0, 6, 0, 0, 2, 3.8, 4, 0, 4, 6]],
  N: [[0, 6, 0, 0, 4, 6, 4, 0]],
  O: [[2, 0, 0.5, 0.7, 0, 3, 0.5, 5.3, 2, 6, 3.5, 5.3, 4, 3, 3.5, 0.7, 2, 0]],
  P: [[0, 6, 0, 0, 2.8, 0, 4, 0.9, 4, 2.1, 2.8, 3, 0, 3]],
  R: [[0, 6, 0, 0, 2.8, 0, 4, 0.9, 4, 2.1, 2.8, 3, 0, 3], [2.1, 3, 4, 6]],
  S: [[4, 0.9, 3, 0, 1, 0, 0, 1, 0, 2, 1, 3, 3, 3, 4, 4, 4, 5, 3, 6, 1, 6, 0, 5.1]],
  T: [[0, 0, 4, 0], [2, 0, 2, 6]],
  U: [[0, 0, 0, 4.6, 1, 6, 3, 6, 4, 4.6, 4, 0]],
  V: [[0, 0, 2, 6, 4, 0]],
  W: [[0, 0, 1, 6, 2, 2.4, 3, 6, 4, 0]],
  Y: [[0, 0, 2, 3, 4, 0], [2, 3, 2, 6]],
  h: [[0.6, 1.4, 0.6, 6], [0.6, 4, 1.6, 3.2, 3, 3.2, 3.6, 4, 3.6, 6]],
  2: [[0, 1, 1, 0, 3, 0, 4, 1, 4, 2.2, 0, 6, 4, 6]],
  3: [[0, 0.8, 1, 0, 3, 0, 4, 1, 4, 2, 3, 3, 1.6, 3], [3, 3, 4, 4, 4, 5, 3, 6, 1, 6, 0, 5.2]],
  4: [[3, 6, 3, 0, 0, 4.2, 4, 4.2]],
  8: [[2, 3, 0.6, 2.3, 0.4, 0.9, 1.4, 0, 2.6, 0, 3.6, 0.9, 3.4, 2.3, 2, 3, 0.4, 3.9, 0.2, 5.2, 1.2, 6, 2.8, 6, 3.8, 5.2, 3.6, 3.9, 2, 3]],
  0: [[2, 0, 0.5, 0.8, 0, 3, 0.5, 5.2, 2, 6, 3.5, 5.2, 4, 3, 3.5, 0.8, 2, 0]],
  1: [[1, 1.2, 2.2, 0, 2.2, 6], [1, 6, 3.4, 6]],
  5: [[3.8, 0, 0.4, 0, 0.2, 2.8, 1.4, 2.4, 2.8, 2.4, 3.8, 3.3, 3.9, 4.9, 2.9, 6, 1.1, 6, 0, 5.2]],
  6: [[3.6, 0.6, 2.6, 0, 1.4, 0, 0.3, 1.2, 0, 3.4, 0.2, 5, 1.2, 6, 2.8, 6, 3.8, 5, 3.8, 3.8, 2.8, 2.9, 1.2, 2.9, 0.1, 3.8]],
  7: [[0, 0, 4, 0, 1.6, 6]],
  9: [[0.4, 5.4, 1.4, 6, 2.6, 6, 3.7, 4.8, 4, 2.6, 3.8, 1, 2.8, 0, 1.2, 0, 0.2, 1, 0.2, 2.2, 1.2, 3.1, 2.8, 3.1, 3.9, 2.2]],
  '.': [[1.6, 5.6, 2.2, 6]],
};

function textPath(str, x, y, h, seed, amp = 0.05, track = 1.45) {
  const s = h / 6;
  const adv = 4 * s * track;
  const p = new Path2D();
  let cx = x;
  for (let i = 0; i < str.length; i++) {
    const g = GLYPH[str[i]];
    if (g) {
      g.forEach((pl, j) => {
        const pts = pl.map((v, k) => (k % 2 ? y + v * s : cx + v * s));
        wob(p, pts, hash(seed, i, j), amp * h);
      });
    }
    cx += str[i] === ' ' ? adv * 0.7 : str[i] === '.' ? adv * 0.6 : adv;
  }
  return p;
}
function textWidth(str, h, track = 1.45) {
  const adv = (4 * h / 6) * track;
  let w = 0;
  for (const ch of str) w += ch === ' ' ? adv * 0.7 : ch === '.' ? adv * 0.6 : adv;
  return w - adv + (4 * h) / 6;
}
// Centred lettering at (cx, y top).
function letters(ctx, str, cx, y, h, colour, width, alpha = 1, seed = 1, o = {}) {
  const track = o.track ?? 1.45;
  const x = cx - textWidth(str, h, track) / 2;
  if (o.shadow) crayon(ctx, textPath(str, x + (o.sx ?? 0.6), y + (o.sy ?? 0.7), h, seed + 9, 0.04, track), o.shadow, width, alpha * 0.8, 0.8);
  crayon(ctx, textPath(str, x, y, h, seed, 0.04, track), colour, width, alpha, o.cover ?? 0.85);
  if (o.hi) crayon(ctx, textPath(str, x - 0.3, y - 0.3, h, seed + 3, 0.03, track), o.hi, width * 0.45, alpha * 0.7, 0.6);
}

// ------------------------------------------------------------------ baking
function snap(v, scale, off) {
  return (Math.round(v * scale + off) - off) / scale;
}

function sprite(key, bx, draw) {
  let sp = S.sprites.get(key);
  if (!sp) {
    const [x0, y0, x1, y1] = bx.map(Math.round);
    const c = makeCanvas((x1 - x0) * S.k, (y1 - y0) * S.k);
    const x = c.getContext('2d');
    x.setTransform(S.k, 0, 0, S.k, -x0 * S.k, -y0 * S.k);
    draw(x);
    sp = { c, x0, y0, w: x1 - x0, h: y1 - y0 };
    S.sprites.set(key, sp);
  }
  return sp;
}

// Draw live strokes in a thing's own frame, so the paper tooth under them travels with it.
function local(ctx, x, y, fn) {
  ctx.save();
  ctx.translate(x, y);
  fn();
  ctx.restore();
}

function blit(ctx, sp, x, y, alpha = 1) {
  const m = ctx.getTransform();
  ctx.globalAlpha = alpha;
  ctx.drawImage(sp.c, snap(x + sp.x0, m.a, m.e), snap(y + sp.y0, m.d, m.f), sp.w, sp.h);
}

// A strip one period long, drawn once into a wide canvas and sliced into tiles no wider
// than 2048 device px. `draw(ctx)` paints u in [0, P) and must itself wrap anything that
// straddles the ends (see `copies`).
function bakeStrip(P, y0, y1, draw) {
  const k = S.k;
  const H = Math.ceil(y1 - y0);
  const big = makeCanvas(P * k, H * k);
  const x = big.getContext('2d');
  x.setTransform(k, 0, 0, k, 0, -y0 * k);
  x.save();
  x.beginPath();
  x.rect(0, y0, P, H);
  x.clip();
  draw(x);
  x.restore();
  const tw = Math.floor(2048 / k);
  const tiles = [];
  for (let u0 = 0; u0 < P; u0 += tw) {
    const w = Math.min(tw, P - u0);
    const c = makeCanvas(w * k, H * k);
    c.getContext('2d').drawImage(big, u0 * k, 0, w * k, H * k, 0, 0, w * k, H * k);
    tiles.push({ c, u0, w });
  }
  return { P, y0, h: H, tiles };
}

function blitStrip(ctx, st, shift, W = 480) {
  const m = ctx.getTransform();
  const P = st.P;
  const X0 = -(((shift % P) + P) % P);
  const Y = snap(st.y0, m.d, m.f);
  ctx.globalAlpha = 1;
  for (let X = X0; X < W + 2; X += P) {
    for (const t of st.tiles) {
      const xa = X + t.u0;
      if (xa > W + 2 || xa + t.w < -2) continue;
      ctx.drawImage(t.c, snap(xa, m.a, m.e), Y, t.w, st.h);
    }
  }
}

// Draw something placed at u (w wide) once per period copy that touches [0, P).
function copies(P, u, w, fn) {
  for (const off of [-P, 0, P]) {
    const a = u + off;
    if (a + w < -60 || a > P + 60) continue;
    fn(a);
  }
}

// ------------------------------------------------------------------ the light of each floor
const LIGHT = {
  lobby: {
    sky: [
      { v: 0, cols: ['#6d97c4', '#7aa0cb'] },
      { v: 0.35, cols: ['#8fb2d4', '#9cbad6'] },
      { v: 0.7, cols: ['#bccdd2', '#c9d3cc'] },
      { v: 1, cols: ['#e6dcbc', '#efe0b6'] },
    ],
    skyCover: 0.86,
    far: { tones: ['#b8c6d2', '#aebccb', '#c2ccd6'], cover: 0.82, lit: '#f2eee0', shade: '#8a9ab0', win: '#98a8bc',
      shadeHatch: { cols: ['#8c9cb4'], cover: 0.8, alpha: 0.4, len: 9, gap: 2.8, width: 1.3, ang: 1.3, even: true } },
    near: { tones: ['#d29c82', '#e2d2ae', '#c4ccd2'], tones2: ['#ca9278', '#dacaa4', '#bac2ca'], cover: 0.9, lit: '#faf0d2', shade: '#6e5c62', win: '#64708a', glint: '#dcecf6', band: '#98aec4',
      shadeHatch: { cols: ['#6c6a80', '#5e6078'], cover: 0.85, alpha: 0.55, len: 10, gap: 2.6, width: 1.4, ang: 1.3, even: true },
      lightHatch: { cols: ['#fff2d4'], cover: 0.85, alpha: 0.45, len: 10, gap: 3, width: 1.4, ang: 1.3, even: true } },
    cloud: { top: WHITE, body: '#e9e6dc', under: '#b9c4cf' },
  },
  open: {
    sky: [
      { v: 0, cols: ['#4f87c9', '#5a8fcd'] },
      { v: 0.4, cols: ['#6c9fd6', '#77a6d8'] },
      { v: 0.8, cols: ['#9cc0e2', '#a8c7e3'] },
      { v: 1, cols: ['#c4d8e6'] },
    ],
    skyCover: 0.88,
    far: { tones: ['#b0c4d6', '#a4bace', '#bccad8'], cover: 0.82, lit: '#f2f6f6', shade: '#7c90aa', win: '#90a4bc',
      shadeHatch: { cols: ['#8498b4'], cover: 0.8, alpha: 0.4, len: 9, gap: 2.8, width: 1.3, ang: 1.3, even: true } },
    near: { tones: ['#c8866a', '#dcc89e', '#b4bcc6'], tones2: ['#be7e62', '#d4c096', '#aab2be'], cover: 0.9, lit: '#fdf6e2', shade: '#5a4c50', win: '#566280', glint: '#e8f4fc', band: '#9cb8d2',
      shadeHatch: { cols: ['#646880', '#585c76'], cover: 0.85, alpha: 0.5, len: 10, gap: 2.6, width: 1.4, ang: 1.3, even: true },
      lightHatch: { cols: ['#ffffff', '#fdf6e2'], cover: 0.85, alpha: 0.55, len: 10, gap: 2.8, width: 1.4, ang: 1.3, even: true } },
    cloud: { top: WHITE, body: '#f1efe8', under: '#aebdd0' },
  },
  exec: {
    sky: [
      { v: 0, cols: ['#2b2a63', '#33306e'] },
      { v: 0.28, cols: ['#4a3a82', '#56408a'] },
      { v: 0.52, cols: ['#8a4c84', '#9c5383'] },
      { v: 0.74, cols: ['#d46f55', '#de7c50'] },
      { v: 0.9, cols: ['#f0a24e', '#f4b257'] },
      { v: 1, cols: ['#f7c867'] },
    ],
    skyCover: 0.9,
    far: { tones: ['#5a4878', '#634e80', '#6a5484'], cover: 0.85, lit: '#f0b858', shade: '#2c2448', win: '#40345e' },
    near: { tones: ['#3b3762', '#423c6a', '#36345a'], cover: 0.9, lit: '#e8b660', shade: '#1f1a33', win: '#26243e', rim: '#f0955a' },
    cloud: { top: '#c58ab0', body: '#7c5c98', under: '#f29a63' },
  },
};

function skyCol(L, v, R) {
  const bands = L.sky;
  v = clamp01(v + (R() - 0.5) * 0.18);
  let k = 0;
  while (k < bands.length - 2 && v > bands[k + 1].v) k++;
  const a = bands[k];
  const b = bands[k + 1];
  const t = (v - a.v) / Math.max(1e-6, b.v - a.v);
  const set = R() < t ? b.cols : a.cols;
  return set[Math.floor(R() * set.length)];
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

// ------------------------------------------------------------------ outside: the sky
// The sky is still in screen space, so it is baked once per floor: the paper, the long
// sweeps of colour, the sun and its halo. Stars, clouds and the flyer move.
function bakeSky(f) {
  const L = LIGHT[f.floor];
  const O = f.outside;
  const top = f.glass.top - 2;
  const bot = Math.min(f.glass.bottom + 2, 212);
  return sprite(`sky:${f.floor}`, [0, top, 480, bot], (x) => {
    x.fillStyle = paper(x);
    x.fillRect(0, top, 480, bot - top);
    const groups = new Map();
    const add = (col, b) => {
      const key = col + b;
      let g = groups.get(key);
      if (!g) { g = { col, b, p: new Path2D() }; groups.set(key, g); }
      return g.p;
    };
    const span = O.horizon - top;
    const sun = O.sun;
    for (let r = -2; r <= Math.ceil((bot - top) / 5) + 2; r++) {
      for (let cc = -2; cc <= 18; cc++) {
        const R = rng(hash(71 + f.stage, cc, r));
        const cx = (cc + R()) * 30;
        const cy = top + (r + R()) * 5;
        const v = (cy - top) / span;
        let col = skyCol(L, v, R);
        if (sun && f.time === 'dusk') {
          const d = Math.hypot((cx - sun.x) * 0.55, cy - sun.y);
          if (d < 70 && R() < (1 - d / 70) * 0.9) col = R() < 0.5 ? '#f7c867' : '#f4b257';
        }
        if (sun && f.time === 'morning') {
          const d = Math.hypot(cx - sun.x, cy - sun.y);
          if (d < 60 && R() < (1 - d / 60) * 0.8) col = R() < 0.5 ? '#e9e4c8' : '#d8dfd6';
        }
        const b = Math.floor(R() * 3);
        const Lh = 34 + R() * 50;
        const a = 0.08 + (R() - 0.5) * 0.12;
        strokeBundle(add(col, b), R, cx, cy, Lh, a, 3 + Math.floor(R() * 3), 2.2, 4);
      }
    }
    for (const g of groups.values()) crayon(x, g.p, g.col, 1.9, 0.92 * BUCKET[g.b], L.skyCover * PRESS[g.b]);

    if (sun) {
      const R = rng(hash(55, f.stage));
      const dusk = f.time === 'dusk';
      const HALO = dusk ? ['#f9d77a', '#f6b85a'] : ['#f6efcf', '#ece6c4'];
      for (let k = 0; k < 34; k++) {
        const rr = sun.r + 3 + R() * R() * (dusk ? 46 : 34);
        const a0 = R() * TAU;
        const sweep = 0.7 + R() * 2.0;
        const p = new Path2D();
        wob(p, arcPts(sun.x + (R() - 0.5) * 2, sun.y + (R() - 0.5) * 2, rr, rr, a0, a0 + sweep, Math.ceil(sweep * rr / 3)), hash(56, k), 0.5);
        crayon(x, p, HALO[k % 2], 1.4, 0.6 * (1 - (rr - sun.r) / 50), 0.55);
      }
      const disc = new Path2D();
      disc.arc(sun.x, sun.y, sun.r, 0, TAU);
      back(x, disc);
      x.save();
      x.clip(disc);
      hatch(x, 65, sun.x - sun.r - 2, sun.y - sun.r - 2, sun.x + sun.r + 2, sun.y + sun.r + 2, {
        cols: dusk ? ['#f6a24a', '#f4b552'] : [WHITE, '#f8eec8'], cover: 0.95, alpha: 1, len: 9, gap: 1.5, width: 1.6,
      });
      const Rm = rng(hash(66, f.stage));
      const ring = new Path2D();
      for (let k = 0; k < 26; k++) {
        const rr = sun.r * Math.sqrt(Rm()) + 0.5;
        const a0 = Rm() * TAU;
        const sweep = 1.4 + Rm() * 3;
        wob(ring, arcPts(sun.x, sun.y, rr, rr, a0, a0 + sweep, Math.ceil((sweep * rr) / 2.5) + 2), hash(67, k), 0.4);
      }
      crayon(x, ring, dusk ? '#fbd77c' : WHITE, 1.5, 0.9, 0.9);
      x.restore();
      if (dusk) {
        // The sun is half down behind a bank of violet cloud lying on the horizon.
        const bank = new Path2D();
        bank.moveTo(0, 176);
        for (let u = 0; u <= 480; u += 6) bank.lineTo(u, 170 + 3 * Math.sin(u * 0.05) + 2 * Math.sin(u * 0.13 + 1));
        bank.lineTo(480, bot); bank.lineTo(0, bot); bank.closePath();
        x.save();
        x.clip(bank);
        hatch(x, 81, 0, 160, 480, bot, { cols: ['#8a5476', '#7a4b72'], cover: 0.85, alpha: 1, len: 26, gap: 1.6, width: 1.6, ang: 0.06, angJ: 0.04, patch: 3, rowK: 0.15 });
        x.restore();
        const lip = new Path2D();
        wob(lip, Array.from({ length: 81 }, (_, j) => [j * 6, 170 + 3 * Math.sin(j * 6 * 0.05) + 2 * Math.sin(j * 6 * 0.13 + 1)]).flat(), 82, 0.4);
        crayon(x, lip, '#f7b45a', 1.4, 0.8, 0.7);
      }
    }
  });
}

// ------------------------------------------------------------------ outside: buildings
function bodyPoly(b, x0) {
  const x1 = x0 + b.w;
  const t = b.top;
  const base = b.base + 2;
  if (b.roof === 'stepped' && b.w > 22) {
    const s = Math.max(3, Math.round(b.w * 0.16));
    return [x0, base, x0, t + 10, x0 + s, t + 10, x0 + s, t + 4, x0 + 2 * s, t + 4, x0 + 2 * s, t, x1 - 2 * s, t, x1 - 2 * s, t + 4, x1 - s, t + 4, x1 - s, t + 10, x1, t + 10, x1, base];
  }
  return [x0, base, x0, t, x1, t, x1, base];
}

function building(ctx, b, x0, st, lod, dusk) {
  const seed = hash(lod === 'far' ? 900 : 950, b.i, b.w);
  const R = rng(seed);
  const x1 = x0 + b.w;
  const tone = st.tones[b.tone];
  const far = lod === 'far';
  const base = b.base;
  // roof furniture first, behind the parapet
  if (b.roof === 'spire') {
    const sh = Math.min(34, b.w * 0.9);
    const sp = [x0 + b.w * 0.32, b.top + 1, x0 + b.w / 2, b.top - sh, x0 + b.w * 0.68, b.top + 1];
    solid(ctx, seed + 3, sp, { cols: [tone], cover: st.cover, alpha: 1, len: 6, gap: 1.5, width: 1.2, ang: 1.3 });
    if (!dusk) edge(ctx, seed + 4, x0 + b.w * 0.33, b.top, x0 + b.w / 2, b.top - sh + 2, st.lit, 0.9, 0.6);
    else if (st.rim) edge(ctx, seed + 4, x0 + b.w / 2, b.top - sh + 2, x0 + b.w * 0.67, b.top, st.rim, 0.9, 0.7);
    line(ctx, [x0 + b.w / 2, b.top - sh, x0 + b.w / 2, b.top - sh - 7], seed + 5, st.shade, 0.8, 0.8);
  }
  if (b.roof === 'antenna') {
    const ax = x0 + b.w * (0.35 + R() * 0.3);
    line(ctx, [ax, b.top + 1, ax, b.top - 16], seed + 5, st.shade, far ? 0.8 : 1.1, 0.9);
    line(ctx, [ax - 3, b.top - 9, ax + 3, b.top - 9], seed + 6, st.shade, 0.7, 0.7);
    if (dusk) { const p = new Path2D(); p.arc(ax, b.top - 16.5, 1, 0, TAU); smear(ctx, p, '#ff6a40', 0.95); }
  }
  if (b.roof === 'tank') {
    // a wooden water tower on its legs
    const tw = Math.min(16, b.w * 0.3);
    const tx = x0 + b.w * (0.2 + R() * 0.35);
    const legs = new Path2D();
    for (const lx of [tx + 1.5, tx + tw / 2, tx + tw - 1.5]) { legs.moveTo(lx, b.top + 1); legs.lineTo(lx, b.top - 7); }
    legs.moveTo(tx + 1.5, b.top - 1); legs.lineTo(tx + tw - 1.5, b.top - 6);
    crayon(ctx, legs, SEPIA, 0.9, 0.9, 0.85);
    box(ctx, seed + 7, tx, b.top - 19, tw, 12, { cols: ['#8a5e3c', '#946844'], cover: 0.9, alpha: 1, len: 5, gap: 1.3, width: 1.2, ang: 1.5, line: SEPIA, lw: 0.8 });
    const hoops = new Path2D();
    for (const hy of [b.top - 16, b.top - 11]) { hoops.moveTo(tx, hy); hoops.lineTo(tx + tw, hy); }
    crayon(ctx, hoops, INK, 0.7, 0.65, 0.7);
    solid(ctx, seed + 8, [tx - 1.5, b.top - 19, tx + tw / 2, b.top - 26, tx + tw + 1.5, b.top - 19], { cols: [SEPIA, '#5a3a26'], cover: 0.9, alpha: 1, len: 4, gap: 1.1, width: 1 });
    edge(ctx, seed + 9, tx + 1.2, b.top - 18, tx + 1.2, b.top - 8, st.lit, 1.1, 0.75);
  }
  if (b.roof === 'billboard') {
    const bw = Math.min(b.w - 10, 54);
    const bx = x0 + (b.w - bw) / 2;
    const legs = new Path2D();
    for (const lx of [bx + 6, bx + bw - 6]) { legs.moveTo(lx, b.top + 1); legs.lineTo(lx, b.top - 6); }
    crayon(ctx, legs, SEPIA, 1, 0.9, 0.85);
    box(ctx, seed + 10, bx, b.top - 25, bw, 19, { base: '#f4e8c4', baseCover: 0.95, line: INK, lw: 0.9 });
    // the company is everywhere: an egg, its name, a slogan line
    const p = new Path2D();
    p.ellipse(bx + 9, b.top - 15, 4.5, 6, 0, 0, TAU);
    back(ctx, p); smear(ctx, p, '#fffaf0', 0.95);
    crayon(ctx, p, SEPIA, 0.7, 0.7, 0.75);
    line(ctx, [bx + 6, b.top - 15, bx + 8, b.top - 16.5, bx + 10, b.top - 14.5, bx + 12, b.top - 16], seed + 13, GOLD, 0.8, 0.9);
    letters(ctx, 'EGG', bx + bw / 2 + 6, b.top - 21, 6.5, RED, 1.2, 1, seed + 11, { track: 1.4 });
    line(ctx, [bx + 18, b.top - 11, bx + bw - 6, b.top - 11], seed + 12, '#3b6ea5', 1, 0.85);
  }
  // the body: one big fill of hatching in the facade's own colour
  const poly = bodyPoly(b, x0);
  const path = polyPath([poly]);
  back(ctx, path);
  fillHatch(ctx, path, { cols: [tone, st.tones2 ? st.tones2[b.tone] : tone], cover: far ? st.cover * 0.85 : st.cover, alpha: 1, len: far ? 9 : 8, gap: far ? 2.1 : 1.7, width: far ? 1.4 : 1.5, ang: 1.3, even: true }, seed, x0, b.top);
  ctx.save();
  ctx.clip(path);
  // light from above, and the street end of the facade falling into shade
  if (!dusk) {
    const sh = st.shadeHatch;
    if (sh) graded(ctx, x0, x1, Math.max(b.top, base - (far ? 50 : 80)), base + 2, sh, seed + 40, 3, false);
    if (!far && st.lightHatch) graded(ctx, x0, x1, b.top, Math.min(base, b.top + 40), st.lightHatch, seed + 41, 2, true);
  }
  // the shaded side return, away from the light
  if (!far) {
    const sw = Math.max(2.5, Math.min(7, b.w * 0.09));
    const sh = new Path2D();
    sh.rect(dusk ? x0 : x1 - sw, b.top - 2, sw, base - b.top + 4);
    smear(ctx, sh, st.shade, 0.75, dusk ? 0.35 : 0.42);
  }
  // windows, in the building's own manner
  const winStop = b.shop != null ? base - 19 : base - 3;
  const y0 = b.top + (b.roof === 'stepped' ? 14 : 6);
  const wx0 = x0 + 3;
  const ww = b.w - 6;
  const cw = ww / b.cols;
  const dark = new Path2D();
  const lit = new Path2D();
  const glint = new Path2D();
  const sills = new Path2D();
  const glassB = new Path2D();
  const style = far ? 'far' : ['punched', 'pairs', 'ribbon'][b.tone];
  for (let r = 0, y = y0; y < winStop - 2; r++, y += b.floorH) {
    const h = Math.min(b.floorH * (style === 'pairs' ? 0.62 : 0.52), winStop - y);
    if (style === 'ribbon' && !dusk) {
      glassB.rect(x0 + 2, y, b.w - 4, h);
      continue;
    }
    for (let c = 0; c < b.cols; c++) {
      const on = h01(b.i * 13 + 5, r, c) < b.lit;
      let x = wx0 + c * cw + cw * 0.24;
      let w = Math.max(1, cw * 0.52);
      if (style === 'pairs') { x = wx0 + c * cw + (c % 2 ? cw * 0.08 : cw * 0.38); w = cw * 0.54; }
      if (far) {
        if (!dusk && h01(b.i, r, c + 99) < 0.5) continue;
        const p = dusk ? (on ? lit : null) : dark;
        if (p) { p.moveTo(x, y + h * 0.5); p.lineTo(x + w, y + h * 0.5); }
        continue;
      }
      const p = dusk ? (on ? lit : dark) : (h01(b.i, r, c + 7) < 0.16 ? glint : dark);
      if (dusk) p.rect(x + w * 0.15, y + h * 0.2, w * 0.7, h * 0.6); else p.rect(x, y, w, h);
      if (!dusk) { sills.moveTo(x - 0.6, y + h + 0.8); sills.lineTo(x + w + 0.6, y + h + 0.8); }
    }
  }
  if (far) {
    crayon(ctx, dark, st.win, 0.9, 0.5, 0.75);
    crayon(ctx, lit, st.lit, 1.1, 0.95, 0.85);
  } else {
    smear(ctx, dark, st.win, 0.88, dusk ? 0.9 : 0.85);
    smear(ctx, lit, st.lit, 0.92, 0.95);
    smear(ctx, glint, st.glint || st.lit, 0.9, 0.95);
    if (style === 'ribbon' && !dusk) {
      // the glass bands mirror the sky: a cool band, long diagonal reflections, mullion ticks
      smear(ctx, glassB, st.band || st.win, 0.9);
      const dk = new Path2D();
      for (let y = y0; y < winStop - 2; y += b.floorH) dk.rect(x0 + 2, y + b.floorH * 0.36, b.w - 4, b.floorH * 0.16);
      smear(ctx, dk, st.win, 0.8, 0.5);
      const refl = new Path2D();
      for (let k = 0; k < b.w / 16; k++) {
        const rx = x0 + 4 + k * 16 + R() * 6;
        refl.moveTo(rx, base); refl.lineTo(rx + (base - b.top) * 0.45, b.top);
      }
      ctx.save();
      ctx.clip(glassB);
      crayon(ctx, refl, st.glint, 3.2, 0.6, 0.8);
      ctx.restore();
      const mt = new Path2D();
      for (let x = x0 + 2 + cw; x < x1 - 2; x += cw) { mt.moveTo(x, y0); mt.lineTo(x, winStop); }
      crayon(ctx, mt, st.tones[b.tone], 0.7, 0.6, 0.8);
    }
    if (!dusk) crayon(ctx, sills, st.lit, 0.8, 0.7, 0.8);
    // band courses on the stone ones
    if (style === 'pairs' && !dusk) {
      const bc = new Path2D();
      const bd = new Path2D();
      for (let y = y0 + b.floorH * 3 - 1.6; y < winStop - 2; y += b.floorH * 3) { bc.moveTo(x0, y); bc.lineTo(x1, y); bd.moveTo(x0, y + 1.3); bd.lineTo(x1, y + 1.3); }
      crayon(ctx, bc, st.lit, 1.2, 0.75, 0.8);
      crayon(ctx, bd, st.shade, 0.8, 0.45, 0.7);
    }
  }
  ctx.restore();
  if (b.roof === 'cornice' || (!far && b.roof === 'flat' && b.tone !== 2)) {
    box(ctx, seed + 13, x0 - 2, b.top - 1, b.w + 4, 4, { base: dusk ? st.shade : st.lit, baseCover: 0.85 });
    line(ctx, [x0 - 1, b.top + 3.6, x1 + 1, b.top + 3.6], seed + 14, st.shade, 1.3, dusk ? 0.6 : 0.7);
  }
  // the lit edges
  if (dusk) {
    if (st.rim) edge(ctx, seed + 20, x1 - 0.6, b.top + 2, x1 - 0.6, Math.min(base, 200), st.rim, 1.1, 0.75);
    if (st.rim) edge(ctx, seed + 24, x0 + 2, b.top + 0.5, x1 - 1, b.top + 0.5, st.rim, 1, 0.5);
  } else {
    edge(ctx, seed + 21, x0 + 0.8, b.top + 1, x0 + 0.8, base, st.lit, far ? 1 : 1.4, far ? 0.45 : 0.8);
    edge(ctx, seed + 23, x0, b.top + 0.6, x1, b.top + 0.6, st.lit, 1.1, far ? 0.4 : 0.75);
  }
  // shopfronts and awnings at street level
  if (b.shop != null) {
    const AW = [['#b8392a', '#f1dfc0'], ['#2f7a52', '#f1dfc0'], ['#2c5d9e', '#f1dfc0'], ['#d2a23a', '#5a3a20']][b.shop];
    box(ctx, seed + 30, x0 + 2, base - 15, b.w - 4, 15, { base: '#2e2c32', baseCover: 0.9 });
    const gl = new Path2D();
    for (let x = x0 + 6; x < x1 - 6; x += 9) { gl.moveTo(x, base - 2); gl.lineTo(x + 4, base - 11); }
    crayon(ctx, gl, '#d6e4ea', 0.9, 0.55, 0.7);
    const door = new Path2D(); door.rect(x0 + b.w * 0.7, base - 11, 5, 11);
    smear(ctx, door, '#e8d8a0', 0.8, 0.5);
    const aw = new Path2D();
    const ay = base - 19;
    aw.moveTo(x0 + 1, ay); aw.lineTo(x1 - 1, ay); aw.lineTo(x1 + 1.5, ay + 6); aw.lineTo(x0 - 1.5, ay + 6); aw.closePath();
    back(ctx, aw);
    smear(ctx, aw, AW[0][0], 0.95);
    const stripes = new Path2D();
    for (let x = x0 + 2; x < x1 - 2; x += 6) { stripes.moveTo(x, ay + 0.5); stripes.lineTo(x + (x - (x0 + x1) / 2) * 0.04, ay + 5.5); }
    crayon(ctx, stripes, AW[0][1], 2.2, 0.85, 0.88);
    const sc = new Path2D();
    for (let x = x0; x < x1; x += 3) { sc.moveTo(x, ay + 6); sc.quadraticCurveTo(x + 1.5, ay + 8, x + 3, ay + 6); }
    crayon(ctx, sc, AW[0][0], 1, 0.9, 0.88);
    const shade = new Path2D(); shade.rect(x0 + 2, ay + 6, b.w - 4, 3);
    smear(ctx, shade, INK, 0.8, 0.35);
  }
}

function bakeCity(f, which) {
  const F = OFFICE_FLOORS[f.floor];
  const O = F.outside;
  const L = LIGHT[f.floor];
  const list = O[which];
  const P = which === 'far' ? 1400 : 1200;
  const st = L[which];
  const dusk = f.time === 'dusk';
  let top = Infinity;
  for (const b of list) top = Math.min(top, b.top - 40);
  top = Math.max(top, f.glass.top - 4);
  const bot = which === 'near' && O.street ? 206 : Math.min(f.glass.bottom + 2, 214);
  return bakeStrip(P, top, bot, (x) => {
    for (const b of list) copies(P, b.u, b.w, (u) => building(x, b, u, st, which, dusk));
    if (which === 'near' && O.street) street(x, f, O, P);
  });
}

// The lobby's street: far pavement, trees and lamps on the kerb, the road, the near kerb.
function street(ctx, f, O, P) {
  const S0 = O.street;
  const pave = new Path2D();
  pave.rect(0, S0.far - 5, P, 5);
  block(ctx, pave, '#d4c8ac', 0.9);
  fillHatch(ctx, pave, { cols: ['#e2d6ba', '#c6ba9e'], cover: 0.9, alpha: 0.6, len: 10, gap: 2.4, width: 1.3, ang: 0.15, even: true }, 301, 0, 0);
  line(ctx, [0, S0.far - 0.4, P, S0.far - 0.4], 302, '#6b6156', 1, 0.6);
  const road = new Path2D();
  road.rect(0, S0.far, P, S0.near - S0.far);
  block(ctx, road, '#666a72', 0.9);
  fillHatch(ctx, road, { cols: ['#575c66', '#767a80'], cover: 0.9, alpha: 0.6, len: 16, gap: 2.2, width: 1.4, ang: 0.08, angJ: 0.04, even: true }, 303, 0, 0);
  const dash = new Path2D();
  for (let u = 6; u < P; u += 24) { dash.moveTo(u, (S0.far + S0.near) / 2); dash.lineTo(u + 11, (S0.far + S0.near) / 2); }
  crayon(ctx, dash, '#efe3b8', 1.2, 0.85, 0.8);
  const near = new Path2D();
  near.rect(0, S0.near, P, 6);
  block(ctx, near, '#d0c4a8', 0.9);
  fillHatch(ctx, near, { cols: ['#e2d6ba', '#c6ba9e'], cover: 0.9, alpha: 0.6, len: 10, gap: 2.4, width: 1.3, ang: 0.15, even: true }, 304, 0, 0);
  line(ctx, [0, S0.near + 0.4, P, S0.near + 0.4], 305, '#efe6cc', 1, 0.7);
  for (const tr of O.trees) copies(P, tr.u - 16, 32, (u) => tree(ctx, u + 16, S0.far, tr.s, hash(310, tr.u)));
  for (const l of O.lamps) copies(P, l.u - 4, 8, (u) => streetLamp(ctx, u + 4, S0.far, hash(320, l.u)));
}

function tree(ctx, x, y, s, seed) {
  line(ctx, [x, y, x - 0.5, y - 14 * s], seed, '#4a3424', 2.2, 1, 0.85, 0.3);
  line(ctx, [x - 0.4, y - 10 * s, x - 5 * s, y - 17 * s], seed + 1, '#4a3424', 1.2, 0.9);
  const R = rng(seed);
  const blobs = [[0, -27, 12], [-7, -22, 8], [7, -23, 8.5], [-2, -33, 8]];
  for (const [bx, by, br] of blobs) {
    const pts = ellPts(x + bx * s, y + by * s, br * s * 1.05, br * s * 0.9, 14).map((v, k) => v + (R() - 0.5) * 1.6);
    solid(ctx, seed + bx, pts, { cols: ['#4f7a42', '#5d8a46'], cover: 0.86, alpha: 1, len: 6, gap: 1.3, width: 1.3, ang: 0.9 });
  }
  // morning light on the left shoulders
  const hl = new Path2D();
  for (const [bx, by, br] of blobs) wob(hl, arcPts(x + bx * s, y + by * s, br * s * 0.8, br * s * 0.7, Math.PI * 1.05, Math.PI * 1.6, 6), seed + by, 0.4);
  crayon(ctx, hl, '#c9d98a', 1.4, 0.75, 0.7);
  const sh = new Path2D();
  wob(sh, arcPts(x + 1 * s, y - 25 * s, 11 * s, 8 * s, 0.1, 1.3, 8), seed + 40, 0.4);
  crayon(ctx, sh, '#2c4a2c', 1.4, 0.7, 0.7);
}

function streetLamp(ctx, x, y, seed) {
  line(ctx, [x, y, x, y - 42], seed, '#263228', 1.5, 1, 0.85, 0.15);
  line(ctx, [x, y - 42, x + 5, y - 44], seed + 1, '#263228', 1.2, 1, 0.85, 0.1);
  box(ctx, seed + 2, x + 3, y - 46, 5, 4, { cols: ['#f3e2a8'], cover: 0.9, alpha: 1, len: 3, gap: 1, width: 1, line: '#263228', lw: 0.7 });
  line(ctx, [x - 2, y, x + 2, y], seed + 3, '#263228', 1.6, 1);
}

// ------------------------------------------------------------------ outside: the moving parts
const LOBES = [[0.16, 0.6, 0.24], [0.38, 0.38, 0.34], [0.62, 0.5, 0.28], [0.84, 0.64, 0.18]];
function cloudSprite(f, c) {
  const L = LIGHT[f.floor];
  return sprite(`cloud:${f.floor}:${c.i}`, [-6, -c.h, c.w + 6, c.h + 4], (ctx) => {
    const R = rng(hash(44, c.i, f.stage));
    const rows = [new Path2D(), new Path2D(), new Path2D()];
    for (const [u, v, r] of LOBES) {
      const cx = u * c.w;
      const cy = (v - 0.5) * c.h;
      const hh = r * c.h * 1.15;
      const hl = r * c.w * 0.55;
      for (let y = -hh; y <= hh; y += 1.5) {
        const half = hl + Math.sqrt(Math.max(0, hh * hh - y * y)) * 1.5;
        const a = cx - half * (0.85 + R() * 0.2);
        const b = cx + half * (0.85 + R() * 0.2);
        const band = y < -hh * 0.25 ? 0 : y < hh * 0.45 ? 1 : 2;
        const p = rows[band];
        p.moveTo(a, cy + y);
        p.quadraticCurveTo((a + b) / 2, cy + y - 0.6 + R() * 1.2, b, cy + y - 0.02 * (b - a));
      }
    }
    crayon(ctx, rows[1], L.cloud.body, 1.6, 0.8, 0.62);
    crayon(ctx, rows[2], L.cloud.under, 1.5, 0.75, 0.6);
    crayon(ctx, rows[0], L.cloud.top, 1.6, 0.85, 0.68);
  });
}

function carSprite(kind, dir) {
  return sprite(`car:${kind}:${dir}`, [-4, -26, 70, 4], (ctx) => {
    const w = { cab: 30, car: 28, bus: 64 }[kind];
    ctx.save();
    if (dir < 0) { ctx.translate(w, 0); ctx.scale(-1, 1); }
    const seed = hash(500, w);
    if (kind === 'bus') {
      box(ctx, seed, 0, -21, w, 18, { cols: ['#b8392a', '#c4412e'], cover: 0.88, alpha: 1, len: 5, gap: 1.2, width: 1.2, ang: 1.4, line: '#5a1a14', lw: 0.8 });
      const win = new Path2D();
      for (let x = 5; x < w - 6; x += 9) win.rect(x, -18, 7, 6);
      smear(ctx, win, '#2c3440', 0.85);
      const gl = new Path2D();
      for (let x = 5; x < w - 6; x += 9) { gl.moveTo(x + 1, -13); gl.lineTo(x + 4, -17.5); }
      crayon(ctx, gl, '#cfe0ea', 0.8, 0.7, 0.6);
      line(ctx, [1, -10, w - 1, -10], seed + 1, CREAM, 1.2, 0.8);
      box(ctx, seed + 2, w - 6, -18, 5, 8, { cols: ['#2c3440'], cover: 0.85, alpha: 1, len: 3, gap: 1, width: 1 });
    } else {
      const col = kind === 'cab' ? ['#e8b830', '#f0c43c'] : ['#3b6ea5', '#4778ad'];
      const body = [0, -3, 0, -7, 6, -8, 9, -12, 20, -12, 24, -8, w, -7, w, -3];
      solid(ctx, seed + 3, body, { cols: col, cover: 0.9, alpha: 1, len: 4, gap: 1.1, width: 1.1, ang: 1.3, line: INK, lw: 0.7 });
      const win = new Path2D();
      win.moveTo(10, -8.5); win.lineTo(11, -11); win.lineTo(19, -11); win.lineTo(21.5, -8.5); win.closePath();
      smear(ctx, win, '#2c3440', 0.85);
      line(ctx, [12, -9, 14, -10.6], seed + 4, '#d6e8f2', 0.7, 0.8);
      if (kind === 'cab') {
        box(ctx, seed + 5, 13, -14, 5, 2, { cols: [WHITE], cover: 0.9, alpha: 1, len: 2, gap: 1, width: 0.8 });
        const ch = new Path2D();
        for (let x = 2; x < w - 2; x += 2.4) ch.rect(x, -6, 1.2, 1);
        smear(ctx, ch, INK, 0.8, 0.8);
      }
    }
    const wh = new Path2D();
    for (const x of kind === 'bus' ? [9, w - 11] : [6, w - 7]) { wh.moveTo(x + 3, -2); wh.arc(x, -2, 3, 0, TAU); }
    back(ctx, wh, '#2a2420');
    smear(ctx, wh, INK, 0.9);
    const hub = new Path2D();
    for (const x of kind === 'bus' ? [9, w - 11] : [6, w - 7]) { hub.moveTo(x + 1, -2); hub.arc(x, -2, 1, 0, TAU); }
    smear(ctx, hub, '#b8b0a0', 0.85);
    ctx.restore();
  });
}

function outside(ctx, f) {
  const O = f.outside;
  const G = f.glass;
  const FB = S.floors[f.floor];
  const clip = new Path2D();
  let any = false;
  for (const b of f.wall.bays) {
    if (b.type !== 'glass' || b.x1 < -2 || b.x0 > 482) continue;
    clip.rect(b.x0, G.top, b.x1 - b.x0, G.bottom - G.top);
    any = true;
  }
  if (!any) return;
  ctx.save();
  ctx.clip(clip);
  blit(ctx, FB.sky, 0, 0);
  // stars at dusk: little crayon crosses
  if (O.stars.length) {
    const p = new Path2D();
    const q = new Path2D();
    O.stars.forEach((s, k) => {
      const tgt = s.twinkle > 0.75 ? p : q;
      const L = 0.8 + s.s * 1.1;
      tgt.moveTo(s.x - L, s.y); tgt.lineTo(s.x + L, s.y);
      tgt.moveTo(s.x, s.y - L); tgt.lineTo(s.x, s.y + L);
    });
    crayon(ctx, p, '#fff3cc', 0.9, 0.95, 0.85);
    crayon(ctx, q, '#e8dcff', 0.8, 0.55, 0.7);
  }
  for (const c of O.clouds) blit(ctx, cloudSprite(f, c), c.x, c.y);
  blitStrip(ctx, FB.far, farShift(f));
  if (O.flyer && O.flyer.kind === 'blimp') flyer(ctx, f, O.flyer);
  if (O.cityLights.length) cityLights(ctx, O);
  blitStrip(ctx, FB.near, nearShift(f));
  for (const c of O.cars) blit(ctx, carSprite(c.kind, c.dir), c.x, c.y);
  if (O.flyer && O.flyer.kind !== 'blimp') flyer(ctx, f, O.flyer);
  if (f.wall.cradle) cradle(ctx, f, f.wall.cradle);
  ctx.restore();
}

// The resolved frame carries instance x but not the layer shift, so derive it the plan's
// way from one placed building (its u is known), which keeps the strip in lockstep.
function layerShift(list, placed, P) {
  if (!placed.length) return 0;
  const b = placed[0];
  return (((b.u - b.x) % P) + P) % P;
}
function farShift(f) {
  return layerShift(OFFICE_FLOORS[f.floor].outside.far, f.outside.far, 1400);
}
function nearShift(f) {
  return layerShift(OFFICE_FLOORS[f.floor].outside.near, f.outside.near, 1200);
}

function cityLights(ctx, O) {
  // The carpet of lights far below: warm dabs, each breathing on its own clock.
  const a = new Path2D();
  const b = new Path2D();
  for (const l of O.cityLights) {
    const tgt = l.a > 0.55 ? a : b;
    tgt.moveTo(l.x - l.s * 0.8, l.y); tgt.lineTo(l.x + l.s * 0.8, l.y);
  }
  crayon(ctx, a, '#ffd884', 1.2, 0.95, 0.85);
  crayon(ctx, b, '#f0a85a', 1, 0.6, 0.7);
}

function flyer(ctx, f, fl) {
  if (fl.kind === 'birds') {
    ctx.save();
    ctx.translate(fl.x, fl.y);
    const p = new Path2D();
    for (let k = 0; k < 5; k++) {
      const bx = k * 8 + (k % 2) * 2;
      const by = ((k * 3) % 5) - 1;
      const up = Math.sin((fl.phase + k * 0.21) * TAU) * 2;
      p.moveTo(bx - 3, by - up); p.quadraticCurveTo(bx - 1.2, by - 1, bx, by); p.quadraticCurveTo(bx + 1.2, by - 1, bx + 3, by - up);
    }
    crayon(ctx, p, '#3a3530', 1, 0.85, 0.8);
    ctx.restore();
    return;
  }
  if (fl.kind === 'blimp') {
    const sp = sprite(`blimp:${fl.dir}`, [-36, -14, 36, 14], (x) => {
      x.save();
      if (fl.dir < 0) x.scale(-1, 1);
      const body = ellPts(0, 0, 30, 10, 26);
      solid(x, 600, body, { cols: ['#c9ccd2', '#d5d7dc'], cover: 0.9, alpha: 1, len: 6, gap: 1.3, width: 1.3, ang: 0.3, line: '#5a5f6a', lw: 0.9 });
      const sh = new Path2D();
      wob(sh, arcPts(0, 0, 27, 8, 0.2, Math.PI - 0.2, 14), 601, 0.3);
      crayon(x, sh, '#8a909c', 1.4, 0.7, 0.7);
      const hl = new Path2D();
      wob(hl, arcPts(0, -1, 25, 7, Math.PI + 0.4, TAU - 0.4, 14), 602, 0.3);
      crayon(x, hl, WHITE, 1.4, 0.85, 0.8);
      solid(x, 603, [26, -2, 34, -9, 35, -8, 31, 0, 35, 8, 34, 9, 26, 2], { cols: ['#b8392a'], cover: 0.9, alpha: 1, len: 3, gap: 1, width: 1 });
      box(x, 604, -6, 9, 12, 4, { cols: ['#5a5f6a'], cover: 0.9, alpha: 1, len: 3, gap: 1, width: 1 });
      x.restore();
      // the lettering reads the right way round whichever way the blimp is heading
      letters(x, 'EGGCORP', -2 * fl.dir, -3, 5.4, RED, 1.15, 1, 605, { track: 1.4 });
    });
    blit(ctx, sp, fl.x, fl.y);
    return;
  }
  // helicopter: a dark little body and a rotor that flickers through its turn
  const sp = sprite('heli', [-16, -10, 18, 8], (x) => {
    solid(x, 610, ellPts(-2, 0, 8, 4.5, 16), { cols: ['#2a2440', '#352e4e'], cover: 0.9, alpha: 1, len: 4, gap: 1, width: 1.1, line: INK, lw: 0.6 });
    line(x, [5, -1, 15, -2], 611, '#2a2440', 1.6, 1);
    line(x, [15, -5, 15, 1], 612, '#2a2440', 0.9, 1);
    line(x, [-6, 5, 2, 5], 613, '#2a2440', 0.9, 1);
    const w = new Path2D();
    w.ellipse(-5, -0.8, 2.6, 2, 0, 0, TAU);
    smear(x, w, '#f0a85a', 0.85);
    line(x, [-2, -4.5, -2, -6.5], 614, '#2a2440', 0.9, 1);
  });
  ctx.save();
  ctx.translate(fl.x, fl.y);
  if (fl.dir < 0) ctx.scale(-1, 1);
  blit(ctx, sp, 0, 0);
  const c = Math.cos(fl.phase * TAU);
  const p = new Path2D();
  p.moveTo(-2 - 13 * c, -6.8); p.lineTo(-2 + 13 * c, -6.8);
  crayon(ctx, p, '#2a2440', 0.9, 0.8, 0.8);
  const blink = Math.sin(f.t * 6) > 0.3;
  if (blink) { const b = new Path2D(); b.arc(15, -5.5, 1, 0, TAU); smear(ctx, b, '#ff5a3a', 0.95); }
  ctx.restore();
}

function cradle(ctx, f, c0) {
  local(ctx, c0.x, c0.y, () => cradleAt(ctx, f, { ...c0, x: 0, y: 0 }, c0.y));
}
function cradleAt(ctx, f, c, top) {
  // ropes from above, the gondola, the cleaner and the squeegee's arc
  const ropes = new Path2D();
  ropes.moveTo(c.x + 4, -top - 2); ropes.lineTo(c.x + 4, c.y);
  ropes.moveTo(c.x + c.w - 4, -top - 2); ropes.lineTo(c.x + c.w - 4, c.y);
  crayon(ctx, ropes, '#2a2420', 0.8, 0.85, 0.8);
  // the cleaner (behind the rail)
  const sw = c.swipe;
  const cx = c.x + 22;
  const arm = new Path2D();
  const hx = cx + 6 + sw * 12;
  const hy = c.y - 20 + Math.sin(sw * Math.PI) * -3;
  arm.moveTo(cx + 2, c.y - 12); arm.lineTo(hx, hy);
  crayon(ctx, arm, '#2c5d9e', 2, 1, 0.9);
  const body = new Path2D();
  body.rect(cx - 3, c.y - 14, 7, 14);
  back(ctx, body);
  smear(ctx, body, '#2c5d9e', 0.9);
  const head = new Path2D();
  head.arc(cx + 0.5, c.y - 17, 3, 0, TAU);
  back(ctx, head);
  smear(ctx, head, '#d8a27a', 0.9);
  const hat = new Path2D();
  hat.moveTo(cx - 3, c.y - 18); hat.quadraticCurveTo(cx + 0.5, c.y - 23, cx + 4, c.y - 18); hat.closePath();
  smear(ctx, hat, '#e8b830', 0.95);
  const sq = new Path2D();
  sq.moveTo(hx - 1, hy - 4); sq.lineTo(hx + 1, hy + 4);
  crayon(ctx, sq, INK, 1.6, 1, 0.9);
  // the clean arc on the glass behind the squeegee
  const arc = new Path2D();
  wob(arc, arcPts(cx + 2, c.y - 12, 14, 12, -Math.PI * 0.65, -Math.PI * 0.65 + sw * 1.4, 10), 700, 0.3);
  crayon(ctx, arc, WHITE, 1.4, 0.45, 0.6);
  // the gondola tub
  const tub = new Path2D();
  tub.rect(c.x, c.y - 6, c.w, 8);
  back(ctx, tub);
  smear(ctx, tub, '#7d848c', 0.85);
  const rail = new Path2D();
  rail.moveTo(c.x, c.y - 6); rail.lineTo(c.x + c.w, c.y - 6);
  rail.moveTo(c.x, c.y + 2); rail.lineTo(c.x + c.w, c.y + 2);
  for (let x = c.x + 6; x < c.x + c.w; x += 8) { rail.moveTo(x, c.y - 6); rail.lineTo(x, c.y + 2); }
  crayon(ctx, rail, INK, 0.9, 0.85, 0.8);
  line(ctx, [c.x + 1, c.y - 5, c.x + c.w - 1, c.y - 5], 701, WHITE, 0.8, 0.6);
}

// ------------------------------------------------------------------ the wall
const WALLS = {
  lobby: {
    // travertine: warm cream stone laid with the side of the crayon, joints in sepia
    base: '#d8c8a2', baseCover: 0.84,
    light: { cols: ['#f3e8c8', '#eadcb8'], cover: 0.9, alpha: 0.8, len: 12, gap: 3.2, width: 1.6, ang: 1.25, even: true },
    shade: { cols: ['#8c7858', '#7e6a4c'], cover: 0.85, alpha: 0.6, len: 12, gap: 3, width: 1.5, ang: 1.25, even: true },
    joint: '#5a4632', vein: '#f4ead0', panelH: 46, panelW: 55,
    col: '#2f362e', colShade: { cols: ['#1a1e18'], cover: 0.9, alpha: 0.8, len: 10, gap: 2.4, width: 1.5, ang: 1.45, even: true },
    colLit: '#d8ca9e', frame: '#2c2218', sheen: '#f3ead2',
  },
  open: {
    base: '#b6bd9e', baseCover: 0.88,
    light: { cols: ['#e8eadc', '#dfe2cc'], cover: 0.9, alpha: 0.75, len: 12, gap: 3.2, width: 1.6, ang: 1.2, even: true },
    shade: { cols: ['#8c937a', '#7f866e'], cover: 0.85, alpha: 0.55, len: 12, gap: 3, width: 1.5, ang: 1.2, even: true },
    joint: '#6a6a58', skirt: '#4c4a44',
    col: '#c0c5aa', colShade: { cols: ['#8c937a'], cover: 0.85, alpha: 0.7, len: 10, gap: 2.6, width: 1.5, ang: 1.45, even: true },
    colLit: '#f0f0e0', frame: '#d8d8d0', sheen: '#f6f6ee',
  },
  exec: {
    base: '#6a3a22', baseCover: 0.92,
    light: { cols: ['#8e5532', '#9a5e36'], cover: 0.9, alpha: 0.7, len: 14, gap: 2.6, width: 1.4, ang: 1.54, angJ: 0.02, even: true },
    shade: { cols: ['#3e1e10', '#4a2414'], cover: 0.9, alpha: 0.75, len: 14, gap: 2.4, width: 1.4, ang: 1.54, angJ: 0.02, even: true },
    joint: '#2a160c', bevel: '#e6ad66', grain: '#3c1e10',
    col: '#2a2024', colShade: { cols: ['#120c0c'], cover: 0.9, alpha: 0.8, len: 10, gap: 2.4, width: 1.5, ang: 1.45, even: true },
    colLit: '#e6b660', frame: '#1e1814', sheen: '#f6c27a',
  },
};

// Hatching laid over a band with its pressure easing off toward one end, in steps.
function graded(ctx, x0, x1, y0, y1, o, seed, steps = 3, fadeDown = true) {
  const h = (y1 - y0) / steps;
  for (let s2 = 0; s2 < steps; s2++) {
    const p = new Path2D();
    p.rect(x0, y0 + s2 * h, x1 - x0, h + 0.01);
    const t = fadeDown ? 1 - s2 / steps : (s2 + 1) / steps;
    fillHatch(ctx, p, { ...o, alpha: o.alpha * t }, seed + s2 * 0, x0, y0);
  }
}

function wallFill(ctx, f, x0, x1, y0, y1, seed) {
  const W = WALLS[f.floor];
  const p = new Path2D();
  p.rect(x0, y0, x1 - x0, y1 - y0);
  block(ctx, p, W.base, W.baseCover);
  const H = y1 - y0;
  if (H > 30) {
    // light from the ceiling on the upper wall, the lower wall falling into shade
    graded(ctx, x0, x1, y0, y0 + H * 0.45, W.light, seed, 3, true);
    graded(ctx, x0, x1, y0 + H * 0.6, y1, W.shade, seed + 1, 3, false);
  } else {
    fillHatch(ctx, p, { ...W.light, alpha: W.light.alpha * 0.6 }, seed, x0, y0);
  }
  if (f.floor === 'lobby') {
    // stone courses and joints, and pale veins wandering across the slabs
    const j = new Path2D();
    for (let y = y1 - W.panelH; y > y0 + 4; y -= W.panelH) { j.moveTo(x0, y); j.lineTo(x1, y); }
    let row = 0;
    for (let y = y1; y > y0; y -= W.panelH, row++) {
      const off = row % 2 ? W.panelW / 2 : 0;
      for (let x = x0 + off + W.panelW; x < x1 - 4; x += W.panelW) { j.moveTo(x, Math.max(y0, y - W.panelH)); j.lineTo(x, y); }
    }
    crayon(ctx, j, W.joint, 0.9, 0.5, 0.7);
    const jl = new Path2D();
    for (let y = y1 - W.panelH; y > y0 + 4; y -= W.panelH) { jl.moveTo(x0, y + 1.1); jl.lineTo(x1, y + 1.1); }
    crayon(ctx, jl, W.vein, 0.7, 0.55, 0.7);
    const v = new Path2D();
    const R = rng(seed + 5);
    for (let k = 0; k < (x1 - x0) / 40; k++) {
      const vx = x0 + R() * (x1 - x0);
      const vy = y0 + R() * (y1 - y0);
      const pts = [];
      for (let s2 = 0; s2 < 7; s2++) pts.push(vx + s2 * 6 + (R() - 0.5) * 3, vy + s2 * 2.4 + (R() - 0.5) * 3);
      wob(v, pts, hash(seed, k), 0.6);
    }
    crayon(ctx, v, '#b8a47e', 0.8, 0.5, 0.7);
  }
  if (f.floor === 'open') {
    // a dado line and a dark skirting
    line(ctx, [x0, 124, x1, 124], seed + 7, W.joint, 0.8, 0.35);
    const sk = new Path2D();
    sk.rect(x0, y1 - 7, x1 - x0, 7);
    back(ctx, sk);
    smear(ctx, sk, W.skirt, 0.85);
    line(ctx, [x0, y1 - 7, x1, y1 - 7], seed + 8, '#e0e0cc', 0.8, 0.6);
  }
  if (f.floor === 'exec') {
    if (H > 100) panelling(ctx, x0, x1, y0, y1, seed);
    else { line(ctx, [x0, y1 - 1, x1, y1 - 1], seed + 9, GOLD, 0.9, 0.7); }
  }
}

// Raised walnut panels: a frame of stiles and rails, each panel's bevel catching the warm
// lamplight on its top and left edges and falling into black on the bottom and right.
function panelling(ctx, x0, x1, y0, y1, seed) {
  const W = WALLS.exec;
  const rows = [[y0 + 6, 104], [112, y1 - 10]];
  const n = Math.max(1, Math.round((x1 - x0 - 8) / 52));
  const pw = (x1 - x0 - 8) / n;
  const lit = new Path2D();
  const dark = new Path2D();
  for (const [ya, yb] of rows) {
    for (let k = 0; k < n; k++) {
      const a = x0 + 4 + k * pw + 4;
      const b = a + pw - 8;
      lit.moveTo(a, yb); lit.lineTo(a, ya); lit.lineTo(b, ya);
      dark.moveTo(b, ya); dark.lineTo(b, yb); dark.lineTo(a, yb);
      lit.moveTo(a + 3, yb - 3); lit.lineTo(b - 3, yb - 3);
      dark.moveTo(a + 3, yb - 3); dark.lineTo(a + 3, ya + 3); dark.lineTo(b - 3, ya + 3);
    }
  }
  crayon(ctx, dark, '#1c0e08', 1.2, 0.85, 0.8);
  crayon(ctx, lit, W.bevel, 0.9, 0.7, 0.7);
  // a gilt picture rail and a dark skirting
  line(ctx, [x0, y0 + 3, x1, y0 + 3], seed + 2, GOLD, 1, 0.7);
  const sk = new Path2D();
  sk.rect(x0, y1 - 6, x1 - x0, 6);
  smear(ctx, sk, '#1c0e08', 0.85);
  line(ctx, [x0, y1 - 6, x1, y1 - 6], seed + 3, W.bevel, 0.8, 0.6);
}

function column(ctx, f, x, w, y0, y1, seed) {
  const W = WALLS[f.floor];
  const p = new Path2D();
  p.rect(x, y0, w, y1 - y0);
  block(ctx, p, W.col, 0.92);
  const sh = new Path2D();
  sh.rect(x + w * 0.55, y0, w * 0.45, y1 - y0);
  fillHatch(ctx, sh, W.colShade, seed, x, y0);
  edge(ctx, seed + 1, x + 1.3, y0, x + 1.3, y1, W.colLit, 1.6, 0.9, 0.9);
  edge(ctx, seed + 2, x + 3.2, y0 + 6, x + 3.2, y1 - 6, W.colLit, 0.7, 0.45);
  edge(ctx, seed + 3, x + w - 0.8, y0, x + w - 0.8, y1, INK, 1.4, 0.75);
  if (f.floor === 'lobby') {
    const v = new Path2D();
    const R = rng(seed + 3);
    for (let k = 0; k < 6; k++) {
      const vy = y0 + R() * (y1 - y0 - 30);
      wob(v, [x + 2, vy, x + w * 0.45, vy + 9, x + w - 3, vy + 24], hash(seed, k), 0.8);
    }
    crayon(ctx, v, '#8a947c', 0.8, 0.6, 0.7);
    box(ctx, seed + 4, x - 2, y1 - 9, w + 4, 9, { base: '#c8973a', baseCover: 0.92, line: SEPIA, lw: 0.6 });
    edge(ctx, seed + 6, x - 1, y1 - 8, x + w + 1, y1 - 8, '#fbe0a0', 1, 0.8);
    box(ctx, seed + 5, x - 2, y0, w + 4, 6, { base: '#c8973a', baseCover: 0.92, line: SEPIA, lw: 0.6 });
    edge(ctx, seed + 7, x - 1, y0 + 5.6, x + w + 1, y0 + 5.6, SEPIA, 1, 0.6);
  }
  if (f.floor === 'exec') line(ctx, [x + 4, y0 + 4, x + 4, y1 - 4], seed + 6, GOLD, 0.8, 0.6);
}

function glassFrame(ctx, f, b, x0, x1, seed) {
  const G = f.glass;
  const W = WALLS[f.floor];
  const R = rng(seed);
  // glass sheen first, under the bars: long diagonal glints and a breath of reflection
  const sh = new Path2D();
  for (let x = x0 + 10 + R() * 20; x < x1 - 6; x += 30 + R() * 50) {
    const y = G.top + 8 + R() * (G.bottom - G.top) * 0.4;
    const L = 16 + R() * 30;
    sh.moveTo(x, y + L); sh.lineTo(x + L * 0.55, y);
    sh.moveTo(x + 4, y + L * 0.8); sh.lineTo(x + 4 + L * 0.35, y + L * 0.15);
  }
  crayon(ctx, sh, W.sheen, 1.2, f.floor === 'exec' ? 0.22 : 0.35, 0.5);
  if (b.blinds > 0) blinds(ctx, f, x0, x1, b.blinds, seed);
  const bars = new Path2D();
  const thick = new Path2D();
  const n = Math.max(1, Math.round((x1 - x0) / G.mullion));
  const step = (x1 - x0) / n;
  for (let k = 1; k < n; k++) {
    const x = x0 + k * step;
    if (b.revolvingDoor != null && Math.abs(x - (x0 + (b.revolvingDoor - b.x0))) < 26 && G.transom && true) {
      bars.moveTo(x, G.top); bars.lineTo(x, G.transom);
    } else { bars.moveTo(x, G.top); bars.lineTo(x, G.bottom); }
  }
  thick.rect(x0, G.top, x1 - x0, G.bottom - G.top);
  if (G.transom) { thick.moveTo(x0, G.transom); thick.lineTo(x1, G.transom); }
  const fw = f.floor === 'open' ? 2 : f.floor === 'exec' ? 1.6 : 2.2;
  crayon(ctx, bars, W.frame, fw * 0.8, 1, 0.85);
  crayon(ctx, thick, W.frame, fw * 1.4, 1, 0.88);
  // a highlight down each bar's lit side
  const hl = new Path2D();
  for (let k = 0; k <= n; k++) {
    const x = x0 + k * step + 0.9;
    hl.moveTo(x, G.top + 2); hl.lineTo(x, (k > 0 && k < n && b.revolvingDoor != null && Math.abs(x - (x0 + (b.revolvingDoor - b.x0))) < 26) ? G.transom : G.bottom - 2);
  }
  crayon(ctx, hl, f.floor === 'open' ? '#8a8a84' : f.floor === 'exec' ? '#c08a4a' : '#8a6a44', 0.6, 0.7, 0.6);
  if (f.floor === 'open') {
    // the sill, and the HVAC cover under it to the floor
    box(ctx, seed + 3, x0 - 2, G.bottom, x1 - x0 + 4, 4, { cols: ['#e8e6da'], cover: 0.85, alpha: 1, len: 4, gap: 1.1, width: 1.1, ang: 0.2, line: '#6a6a60', lw: 0.6 });
    box(ctx, seed + 4, x0, G.bottom + 4, x1 - x0, f.wallBase - G.bottom - 4, { base: '#aeb2a4', baseCover: 0.9, cols: ['#c4c8ba', '#9a9e92'], cover: 0.88, alpha: 0.55, len: 10, gap: 2.6, width: 1.4, ang: 1.3, even: true });
    const gr = new Path2D();
    for (let x = x0 + 8; x < x1 - 10; x += 40) {
      for (let y = G.bottom + 12; y < G.bottom + 30; y += 3) { gr.moveTo(x, y); gr.lineTo(x + 26, y); }
    }
    crayon(ctx, gr, '#5a5c58', 0.8, 0.55, 0.6);
    line(ctx, [x0, G.bottom + 5, x1, G.bottom + 5], seed + 5, '#f0efe4', 0.9, 0.6);
    const sk = new Path2D();
    sk.rect(x0, f.wallBase - 7, x1 - x0, 7);
    smear(ctx, sk, '#4c4a44', 0.8);
  }
  if (f.floor === 'exec') {
    box(ctx, seed + 6, x0 - 2, G.bottom, x1 - x0 + 4, f.wallBase - G.bottom, { cols: ['#2a1a12'], cover: 0.9, alpha: 1, len: 4, gap: 1, width: 1.1, ang: 0.2 });
    line(ctx, [x0, G.bottom + 0.6, x1, G.bottom + 0.6], seed + 7, GOLD, 0.8, 0.7);
  }
  if (b.revolvingDoor != null) revolvingHousing(ctx, f, x0 + (b.revolvingDoor - b.x0), seed + 9);
}

function blinds(ctx, f, x0, x1, frac, seed) {
  const G = f.glass;
  const h = (G.bottom - G.top) * frac;
  const sl = new Path2D();
  const gap = new Path2D();
  for (let y = G.top + 1; y < G.top + h; y += 3) {
    sl.moveTo(x0, y); sl.lineTo(x1, y);
    gap.moveTo(x0, y + 1.6); gap.lineTo(x1, y + 1.6);
  }
  crayon(ctx, sl, '#ece4cc', 2, 0.92, 0.85);
  crayon(ctx, gap, '#8a8070', 0.6, 0.5, 0.6);
  box(ctx, seed + 1, x0, G.top + h - 1, x1 - x0, 3, { cols: ['#d8d0b8'], cover: 0.9, alpha: 1, len: 3, gap: 1, width: 1, line: '#6a6050', lw: 0.6 });
  const cord = new Path2D();
  cord.moveTo(x1 - 6, G.top); cord.lineTo(x1 - 6, G.top + h + 14);
  crayon(ctx, cord, '#efe8d4', 0.6, 0.8, 0.7);
}

function revolvingHousing(ctx, f, cx, seed) {
  const G = f.glass;
  // the drum's canopy and its floor ring; the wings turn live
  const can = [cx - 25, G.transom - 1, cx + 25, G.transom - 1, cx + 25, G.transom + 6, cx - 25, G.transom + 6];
  solid(ctx, seed, can, { cols: ['#3a2c1e', '#45352a'], cover: 0.9, alpha: 1, len: 4, gap: 1.1, width: 1.1, ang: 0.3 });
  line(ctx, [cx - 25, G.transom + 6, cx + 25, G.transom + 6], seed + 1, GOLD, 1, 0.8);
  letters(ctx, 'EGGCORP', cx, G.transom + 0.8, 3.6, GOLD, 0.75, 0.95, seed + 2, { track: 1.35 });
  const drum = new Path2D();
  wob(drum, [cx - 24, G.transom + 6, cx - 24, G.bottom], seed + 3, 0.2);
  wob(drum, [cx + 24, G.transom + 6, cx + 24, G.bottom], seed + 4, 0.2);
  crayon(ctx, drum, WALLS.lobby.frame, 2, 1, 0.85);
  const glass = new Path2D();
  wob(glass, arcPts(cx, G.bottom - 1, 24, 3, 0, Math.PI, 12), seed + 5, 0.2);
  crayon(ctx, glass, '#2c2218', 1.2, 0.8, 0.8);
}

// The band between the ceiling and the glass head: an Art Deco frieze in the lobby, gilt
// zigzags on black; a dentil cornice on the executive floor. Periods divide the wall's.
function frieze(ctx, f, P) {
  const y0 = f.ceilingY;
  if (f.floor === 'lobby') {
    const h = f.glass.top - y0 - 1;
    const band = new Path2D();
    band.rect(0, y0, P, h);
    block(ctx, band, '#2a241e', 0.94);
    const zig = new Path2D();
    const step = 12;
    zig.moveTo(0, y0 + h - 1.5);
    for (let u = 0; u <= P; u += step) { zig.lineTo(u + step / 2, y0 + 1.6); zig.lineTo(u + step, y0 + h - 1.5); }
    crayon(ctx, zig, GOLD, 1.1, 0.95, 0.88);
    const fan = new Path2D();
    for (let u = step / 2; u < P; u += step) { fan.moveTo(u, y0 + 2.4); fan.lineTo(u, y0 + h - 2); }
    crayon(ctx, fan, '#8a6a30', 0.7, 0.8, 0.8);
    line(ctx, [0, y0 + h + 0.2, P, y0 + h + 0.2], 1700, '#e8c070', 0.9, 0.9, 0.85, 0.1);
    line(ctx, [0, y0 + 0.4, P, y0 + 0.4], 1701, '#b88c3a', 0.7, 0.8, 0.8, 0.1);
  } else if (f.floor === 'exec') {
    const h = f.glass.top - y0;
    const band = new Path2D();
    band.rect(0, y0, P, h);
    block(ctx, band, '#3a2014', 0.94);
    const dent = new Path2D();
    for (let u = 0; u < P; u += 6) dent.rect(u + 1, y0 + 1.2, 3, h - 3);
    smear(ctx, dent, '#c8963c', 0.9, 0.9);
    const sh = new Path2D();
    for (let u = 0; u < P; u += 6) { sh.moveTo(u + 4.2, y0 + 1.4); sh.lineTo(u + 4.2, y0 + h - 1.8); }
    crayon(ctx, sh, '#2a160c', 0.8, 0.8, 0.8);
    line(ctx, [0, y0 + h - 0.6, P, y0 + h - 0.6], 1702, '#f0c070', 0.9, 0.9, 0.85, 0.1);
  }
}

// ---- things hung on, or stood against, the wall (their still parts)
function hangPaint(ctx, f, h, x, seed) {
  const y = h.y ?? f.wallBase - h.h;
  switch (h.kind) {
    case 'lift': return liftStill(ctx, f, h, x, y, seed);
    case 'logo': return logo(ctx, f, h, x, seed);
    case 'clock': return clockFace(ctx, x, h.y, h.r, seed, f);
    case 'painting': return painting(ctx, h, x, y, seed);
    case 'whiteboard': return whiteboard(ctx, h, x, y, seed);
    case 'poster': return poster(ctx, h, x, y, seed);
    case 'door': return door(ctx, f, h, x, y, seed);
    case 'extinguisher': return extinguisher(ctx, h, x, y, seed);
    case 'trophyCase': return trophyCase(ctx, h, x, y, seed);
    case 'bookshelf': return bookshelf(ctx, h, x, y, seed);
    case 'portrait': return portrait(ctx, h, x, y, seed);
    default: return null;
  }
}

const LIFT = {
  lobby: { frame: ['#b8873c', '#c99a48'], frameLine: '#4a3218', inside: ['#f2d58a', '#ecc978'] },
  open: { frame: ['#9a9c98', '#a8aaa4'], frameLine: '#3c3e3c', inside: ['#f0e2a8', '#e8d896'] },
  exec: { frame: ['#b8873c', '#c99a48'], frameLine: '#2a1a0c', inside: ['#f2d58a', '#ecc978'] },
};

function liftStill(ctx, f, h, x, y, seed) {
  const L = LIFT[f.floor];
  box(ctx, seed, x - 4, y - 4, h.w + 8, h.h + 4, { cols: L.frame, cover: 0.85, alpha: 1, len: 5, gap: 1.2, width: 1.2, ang: 1.45, line: L.frameLine, lw: 0.8 });
  // the car inside, lit: a warm box with a handrail and the back wall's panels
  box(ctx, seed + 1, x, y, h.w, h.h, { cols: L.inside, cover: 0.9, alpha: 1, len: 6, gap: 1.2, width: 1.3, ang: 1.3 });
  const p = new Path2D();
  p.moveTo(x + 2, y + h.h * 0.55); p.lineTo(x + h.w - 2, y + h.h * 0.55);
  p.moveTo(x + h.w / 2, y + 3); p.lineTo(x + h.w / 2, y + h.h - 2);
  crayon(ctx, p, '#b08a48', 0.8, 0.7, 0.7);
  line(ctx, [x, y + h.h - 1, x + h.w, y + h.h - 1], seed + 2, '#8a6a3a', 1.4, 0.8);
  // the indicator over the doors and the call buttons beside them
  box(ctx, seed + 3, x + h.w / 2 - 8, y - 15, 16, 9, { cols: ['#1e1a18'], cover: 0.92, alpha: 1, len: 3, gap: 1, width: 1, line: L.frameLine, lw: 0.7 });
  letters(ctx, h.label, x + h.w / 2, y - 13.2, 5.2, '#ff9a3c', 1.05, 1, seed + 4, { track: 1.3 });
  box(ctx, seed + 5, x + h.w + 6, y + h.h * 0.45, 4, 8, { cols: L.frame, cover: 0.85, alpha: 1, len: 3, gap: 1, width: 1, line: L.frameLine, lw: 0.6 });
  const btn = new Path2D();
  btn.arc(x + h.w + 8, y + h.h * 0.45 + 2.4, 0.9, 0, TAU);
  btn.moveTo(x + h.w + 9, y + h.h * 0.45 + 5.6);
  btn.arc(x + h.w + 8, y + h.h * 0.45 + 5.6, 0.9, 0, TAU);
  smear(ctx, btn, CREAM, 0.9);
}

// A door leaf: brushed steel, vertical grain in cool grey and a white streak.
function liftLeaf(f, w, h) {
  return sprite(`leaf:${f.floor}:${w}:${h}`, [-1, -1, w + 1, h + 1], (ctx) => {
    const tone = f.floor === 'open' ? ['#a9aeb2', '#b4b8bc'] : f.floor === 'lobby' ? ['#b39260', '#c0a070'] : ['#9a7a4a', '#a8885a'];
    box(ctx, hash(800, w, h), 0, 0, w, h, { cols: tone, cover: 0.9, alpha: 1, len: 10, gap: 1.2, width: 1.3, ang: 1.53, angJ: 0.02, line: '#3a3430', lw: 0.6 });
    const st = new Path2D();
    st.moveTo(w * 0.35, 2); st.lineTo(w * 0.35, h - 2);
    st.moveTo(w * 0.5, 2); st.lineTo(w * 0.5, h * 0.6);
    crayon(ctx, st, WHITE, 1, 0.6, 0.6);
    edge(ctx, hash(801, w), w - 0.6, 0, w - 0.6, h, '#3a3430', 1, 0.7);
  });
}

function liftLive(ctx, f, h) {
  const lw = h.w / 2;
  const sp = liftLeaf(f, Math.round(lw), h.h);
  const gap = h.open * lw;
  ctx.save();
  ctx.beginPath();
  ctx.rect(h.x, h.y - 1, h.w, h.h + 1);
  ctx.clip();
  blit(ctx, sp, h.x - gap, h.y);
  blit(ctx, sp, h.x + lw + gap, h.y);
  ctx.restore();
  // a down arrow lit while the doors stand open
  if (h.open > 0.05) {
    local(ctx, h.x + h.w / 2 + 11, h.y, () => {
      const p = new Path2D();
      p.moveTo(-2, -12); p.lineTo(2, -12); p.lineTo(0, -8.5); p.closePath();
      smear(ctx, p, '#9bf06a', 0.9, Math.min(1, h.open * 2));
    });
  }
}

function clockFace(ctx, cx, cy, r, seed, f) {
  const rim = f.floor === 'exec' ? GOLD : f.floor === 'lobby' ? GOLD : '#3a3a38';
  const face = new Path2D();
  face.arc(cx, cy, r, 0, TAU);
  back(ctx, face);
  smear(ctx, face, '#f6eed6', 0.92);
  const t = new Path2D();
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU;
    const r0 = k % 3 === 0 ? r * 0.68 : r * 0.8;
    t.moveTo(cx + Math.sin(a) * r0, cy - Math.cos(a) * r0);
    t.lineTo(cx + Math.sin(a) * r * 0.9, cy - Math.cos(a) * r * 0.9);
  }
  crayon(ctx, t, INK, 0.7, 0.85, 0.8);
  outline(ctx, ellPts(cx, cy, r, r, 24), seed, rim, 1.8, 1, true, 0.15);
  edge(ctx, seed + 2, cx - r * 0.5, cy - r * 0.6, cx - r * 0.75, cy - r * 0.1, WHITE, 1, 0.7);
}

function clockHands(ctx, f, cx, cy, r) {
  const C = f.clock;
  const p = new Path2D();
  p.moveTo(cx, cy); p.lineTo(cx + Math.sin(C.hourA) * r * 0.5, cy - Math.cos(C.hourA) * r * 0.5);
  crayon(ctx, p, INK, 1.4, 1, 0.9);
  const q = new Path2D();
  q.moveTo(cx, cy); q.lineTo(cx + Math.sin(C.minuteA) * r * 0.78, cy - Math.cos(C.minuteA) * r * 0.78);
  crayon(ctx, q, INK, 0.95, 1, 0.9);
  const s = new Path2D();
  s.moveTo(cx - Math.sin(C.secondA) * r * 0.2, cy + Math.cos(C.secondA) * r * 0.2);
  s.lineTo(cx + Math.sin(C.secondA) * r * 0.85, cy - Math.cos(C.secondA) * r * 0.85);
  crayon(ctx, s, RED, 0.6, 1, 0.85);
}

// The lobby's centrepiece: a black slate plaque, a cream egg cracked with gold, and the name
// in fat gilt capitals with a dark shadow under each stroke, the way brass letters stand off.
function logo(ctx, f, h, x, seed) {
  const y = h.y;
  const pl = [x, y, x + h.w, y, x + h.w, y + h.h, x, y + h.h];
  solid(ctx, seed, pl, { cols: ['#24221f', '#2c2a26'], cover: 0.92, alpha: 1, len: 8, gap: 1.2, width: 1.4, ang: 1.3, line: GOLD, lw: 1.3, la: 0.9 });
  line(ctx, [x + 3, y + 3, x + h.w - 3, y + 3], seed + 1, '#6a6050', 0.8, 0.6);
  // the egg mark
  const ex = x + 24;
  const ey = y + h.h / 2 + 1;
  const egg = new Path2D();
  egg.ellipse(ex, ey + 2, 13, 16, 0, 0, Math.PI);
  egg.ellipse(ex, ey + 2, 13, 20, 0, Math.PI, TAU);
  back(ctx, egg);
  ctx.save();
  ctx.clip(egg);
  hatch(ctx, seed + 2, ex - 15, ey - 20, ex + 15, ey + 20, { cols: [WHITE, '#f4ead0'], cover: 0.95, alpha: 1, len: 8, gap: 1.2, width: 1.4, ang: 1.0 });
  const sh = new Path2D();
  wob(sh, arcPts(ex, ey + 2, 11, 15, -0.3, 1.6, 10), seed + 3, 0.4);
  crayon(ctx, sh, '#c9b38a', 2.4, 0.8, 0.7);
  ctx.restore();
  outline(ctx, [...arcPts(ex, ey + 2, 13, 16, 0, Math.PI, 12), ...arcPts(ex, ey + 2, 13, 20, Math.PI, TAU, 14).slice(2)], seed + 4, '#8a7448', 1, 0.8, true, 0.2);
  line(ctx, [ex - 12, ey - 1, ex - 6, ey - 4, ex - 2, ey + 1, ex + 3, ey - 5, ex + 8, ey - 1, ex + 12, ey - 4], seed + 5, GOLD, 1.8, 1, 0.9, 0.2);
  // EGGCORP
  const tx = x + 96;
  letters(ctx, 'EGGCORP', tx + 0.6, y + 17, 15, '#140f0a', 3.2, 0.9, seed + 6, { track: 1.42 });
  letters(ctx, 'EGGCORP', tx - 0.4, y + 16, 15, GOLD, 2.8, 1, seed + 6, { track: 1.42, hi: '#fbe7a4' });
  line(ctx, [x + 46, y + 42, x + h.w - 8, y + 42], seed + 7, GOLD, 0.9, 0.75);
  letters(ctx, 'ESTD 1961', tx, y + 45, 4, '#bfae86', 0.7, 0.85, seed + 8, { track: 1.6 });
}

function painting(ctx, h, x, y, seed) {
  box(ctx, seed, x - 3, y - 3, h.w + 6, h.h + 6, { cols: [GOLD, '#c3922e'], cover: 0.9, alpha: 1, len: 4, gap: 1.1, width: 1.1, line: SEPIA, lw: 0.8 });
  if (h.variant === 1) {
    // a city view: a sky, three towers, the river
    box(ctx, seed + 1, x, y, h.w, h.h, { cols: ['#9cc0dc', '#b2cfe2'], cover: 0.92, alpha: 1, len: 6, gap: 1.2, width: 1.3, ang: 0.2 });
    const R = rng(seed + 2);
    for (let k = 0; k < 5; k++) {
      const bw = 5 + R() * 5;
      const bx = x + 2 + k * (h.w - 6) / 5;
      const bt = y + 10 + R() * 18;
      box(ctx, seed + 10 + k, bx, bt, bw, y + h.h - 10 - bt, { cols: [['#7c879a', '#a35c44', '#c7ad86'][k % 3]], cover: 0.9, alpha: 1, len: 4, gap: 1, width: 1 });
    }
    box(ctx, seed + 3, x, y + h.h - 10, h.w, 10, { cols: ['#3e6a8a', '#4a7898'], cover: 0.9, alpha: 1, len: 6, gap: 1.2, width: 1.2, ang: 0.15 });
    line(ctx, [x + 4, y + h.h - 6, x + h.w - 8, y + h.h - 6], seed + 4, WHITE, 0.8, 0.6);
  } else {
    // abstract: big colour fields, the kind boards buy
    box(ctx, seed + 1, x, y, h.w, h.h, { cols: ['#e9dcc0'], cover: 0.92, alpha: 1, len: 6, gap: 1.2, width: 1.3 });
    const c1 = new Path2D(); c1.arc(x + h.w * 0.32, y + h.h * 0.45, h.h * 0.3, 0, TAU);
    smear(ctx, c1, '#c23a2a', 0.92);
    const r1 = new Path2D(); r1.rect(x + h.w * 0.52, y + 6, h.w * 0.36, h.h * 0.5);
    smear(ctx, r1, '#2c5d9e', 0.92);
    const r2 = new Path2D(); r2.rect(x + h.w * 0.2, y + h.h * 0.72, h.w * 0.6, 5);
    smear(ctx, r2, '#e8b830', 0.95);
    line(ctx, [x + 6, y + h.h - 6, x + h.w - 4, y + 4], seed + 2, INK, 1.2, 0.8);
  }
}

function whiteboard(ctx, h, x, y, seed) {
  box(ctx, seed, x - 2, y - 2, h.w + 4, h.h + 4, { cols: ['#a0a4a6'], cover: 0.9, alpha: 1, len: 4, gap: 1.1, width: 1.1, line: '#4a4c4e', lw: 0.7 });
  box(ctx, seed + 1, x, y, h.w, h.h, { base: '#f2f0e6', baseCover: 0.95, cols: ['#ffffff', '#e2e0d6'], cover: 0.9, alpha: 0.55, len: 14, gap: 3, width: 1.5, ang: 0.5, even: true });
  // a ghost of last week's meeting, half wiped
  line(ctx, [x + 30, y + 30, x + 40, y + 24, x + 48, y + 32], seed + 9, '#b8c0c8', 1.6, 0.5);
  // a rising chart in blue marker with a red arrow at the top, and scrawled notes
  const ch = new Path2D();
  wob(ch, [x + 6, y + 6, x + 6, y + h.h - 8, x + h.w * 0.62, y + h.h - 8], seed + 2, 0.3);
  crayon(ctx, ch, '#3a3a40', 0.8, 0.85, 0.85);
  const up = [x + 9, y + h.h - 12, x + 18, y + h.h - 16, x + 26, y + h.h - 13, x + 36, y + h.h - 26, x + 44, y + h.h - 22, x + 54, y + 12];
  line(ctx, up, seed + 3, '#2c5d9e', 1.3, 0.95, 0.85, 0.3);
  line(ctx, [x + 50, y + 13, x + 54, y + 10, x + 55, y + 15], seed + 4, RED, 1.2, 0.95);
  const notes = new Path2D();
  for (let k = 0; k < 5; k++) {
    const ny = y + 10 + k * 7;
    const nw = 14 + h01(seed, k) * 12;
    wob(notes, [x + h.w - 32, ny, x + h.w - 32 + nw, ny + 0.5], hash(seed, 9, k), 0.6);
  }
  crayon(ctx, notes, '#4a4a52', 0.8, 0.7, 0.75);
  line(ctx, [x + h.w - 34, y + 40, x + h.w - 8, y + 46], seed + 5, '#2f7a52', 1, 0.8);
  box(ctx, seed + 6, x + 10, y + h.h + 2, h.w - 20, 3, { cols: ['#9a9ea0'], cover: 0.9, alpha: 1, len: 3, gap: 1, width: 1, line: '#4a4c4e', lw: 0.5 });
  const mk = [RED, '#2c5d9e', '#2f7a52', INK];
  mk.forEach((c, k) => line(ctx, [x + 16 + k * 7, y + h.h + 2, x + 21 + k * 7, y + h.h + 2], seed + 7 + k, c, 1.4, 1));
}

function poster(ctx, h, x, y, seed) {
  box(ctx, seed, x - 1, y - 1, h.w + 2, h.h + 2, { cols: ['#1c1a18'], cover: 0.95, alpha: 1, len: 4, gap: 1, width: 1.2, line: INK, lw: 0.6 });
  const ix = x + 3;
  const iy = y + 3;
  const iw = h.w - 6;
  const ih = h.h - 14;
  if (h.label === 'SYNERGY') {
    // a sunrise over mountains
    box(ctx, seed + 1, ix, iy, iw, ih, { cols: ['#f0a24e', '#e47c4a'], cover: 0.92, alpha: 1, len: 5, gap: 1.1, width: 1.2, ang: 0.2, noBack: false });
    const sun = new Path2D(); sun.arc(ix + iw / 2, iy + ih * 0.62, 5, 0, TAU);
    smear(ctx, sun, LEMON, 0.95);
    solid(ctx, seed + 2, [ix, iy + ih, ix, iy + ih * 0.7, ix + iw * 0.3, iy + ih * 0.4, ix + iw * 0.55, iy + ih * 0.75, ix + iw * 0.75, iy + ih * 0.5, ix + iw, iy + ih * 0.8, ix + iw, iy + ih], { cols: ['#4a3a6a', '#55447a'], cover: 0.92, alpha: 1, len: 4, gap: 1, width: 1.1 });
    letters(ctx, 'SYNERGY', x + h.w / 2, y + h.h - 9, 4, CREAM, 0.8, 1, seed + 3, { track: 1.25 });
  } else if (h.label === 'HANG IN THERE') {
    box(ctx, seed + 1, ix, iy, iw, ih, { cols: ['#8fb4d4', '#9cbcd8'], cover: 0.9, alpha: 1, len: 5, gap: 1.1, width: 1.2, ang: 0.3 });
    line(ctx, [ix - 1, iy + 8, ix + iw + 1, iy + 6], seed + 2, '#5a3a22', 1.8, 1);
    // the kitten, dangling by its front paws
    const kx = ix + iw * 0.5;
    const ky = iy + 16;
    const body = new Path2D(); body.ellipse(kx, ky + 3, 3.2, 5, 0, 0, TAU);
    back(ctx, body); smear(ctx, body, '#e8a860', 0.95);
    const head = new Path2D(); head.arc(kx, ky - 3, 3.2, 0, TAU);
    back(ctx, head); smear(ctx, head, '#e8a860', 0.95);
    const ears = new Path2D();
    ears.moveTo(kx - 3, ky - 4); ears.lineTo(kx - 2.6, ky - 7.4); ears.lineTo(kx - 0.8, ky - 5.6);
    ears.moveTo(kx + 3, ky - 4); ears.lineTo(kx + 2.6, ky - 7.4); ears.lineTo(kx + 0.8, ky - 5.6);
    crayon(ctx, ears, '#e8a860', 1, 1, 0.9);
    line(ctx, [kx - 2.2, ky - 4, kx - 2.6, iy + 7], seed + 3, '#e8a860', 1.4, 1);
    line(ctx, [kx + 2.2, ky - 4, kx + 2.6, iy + 6.5], seed + 4, '#e8a860', 1.4, 1);
    const eyes = new Path2D(); eyes.rect(kx - 1.8, ky - 3.4, 0.9, 0.9); eyes.rect(kx + 0.9, ky - 3.4, 0.9, 0.9);
    smear(ctx, eyes, INK, 0.95);
    line(ctx, [kx + 2.5, ky + 6, kx + 5, ky + 9, kx + 4, ky + 12], seed + 5, '#e8a860', 1, 1);
    letters(ctx, 'HANG IN', x + h.w / 2, y + h.h - 10.5, 3.2, CREAM, 0.7, 1, seed + 6, { track: 1.25 });
    letters(ctx, 'THERE', x + h.w / 2, y + h.h - 5.6, 3.2, CREAM, 0.7, 1, seed + 7, { track: 1.25 });
  } else {
    // TEAMWORK: four rowers in a shell on a still lake
    box(ctx, seed + 1, ix, iy, iw, ih, { cols: ['#7aa6c4', '#86b0cc'], cover: 0.9, alpha: 1, len: 5, gap: 1.1, width: 1.2, ang: 0.3 });
    box(ctx, seed + 2, ix, iy + ih * 0.55, iw, ih * 0.45, { cols: ['#3e6a8a', '#467494'], cover: 0.9, alpha: 1, len: 6, gap: 1.1, width: 1.2, ang: 0.1 });
    line(ctx, [ix + 2, iy + ih * 0.58, ix + iw - 2, iy + ih * 0.58], seed + 3, '#c23a2a', 1.4, 1);
    const oars = new Path2D();
    for (let k = 0; k < 4; k++) {
      const rx = ix + 6 + k * 5.5;
      oars.moveTo(rx, iy + ih * 0.58 - 4); oars.lineTo(rx, iy + ih * 0.58);
      oars.moveTo(rx, iy + ih * 0.58); oars.lineTo(rx + 4, iy + ih * 0.58 + 5);
    }
    crayon(ctx, oars, INK, 0.7, 0.9, 0.85);
    letters(ctx, 'TEAMWORK', x + h.w / 2, y + h.h - 9, 3.6, CREAM, 0.75, 1, seed + 4, { track: 1.2 });
  }
}

function door(ctx, f, h, x, y, seed) {
  const ceo = h.label === 'CEO';
  box(ctx, seed, x - 3, y - 3, h.w + 6, h.h + 3, { cols: ceo ? ['#2a1810'] : ['#e6e2d0'], cover: 0.88, alpha: 1, len: 4, gap: 1.1, width: 1.1, ang: 1.5, line: ceo ? INK : '#5a5a50', lw: 0.7 });
  box(ctx, seed + 1, x, y, h.w, h.h, { cols: ceo ? ['#5a2e1a', '#663620'] : ['#a8794a', '#b48454'], cover: 0.9, alpha: 1, len: 10, gap: 1.3, width: 1.3, ang: 1.53, angJ: 0.03 });
  const g = new Path2D();
  for (let gx = x + 3; gx < x + h.w - 2; gx += 4) { g.moveTo(gx, y + 2); g.lineTo(gx + 0.6, y + h.h - 2); }
  crayon(ctx, g, ceo ? '#2a140a' : '#6a4424', 0.6, 0.5, 0.6);
  if (ceo) {
    line(ctx, [x + h.w / 2, y, x + h.w / 2, y + h.h], seed + 2, INK, 1.2, 0.9);
    for (const sx of [x + 4, x + h.w / 2 + 4]) {
      const p = new Path2D(); p.rect(sx, y + 8, h.w / 2 - 8, h.h * 0.36); p.rect(sx, y + 14 + h.h * 0.36, h.w / 2 - 8, h.h * 0.4);
      crayon(ctx, p, '#c08a4a', 0.8, 0.7, 0.7);
    }
    box(ctx, seed + 3, x + h.w / 2 - 10, y + 24, 20, 7, { cols: [GOLD, '#e2b65a'], cover: 0.92, alpha: 1, len: 3, gap: 1, width: 1, line: SEPIA, lw: 0.6 });
    letters(ctx, 'CEO', x + h.w / 2, y + 25.4, 4, INK, 0.8, 1, seed + 4, { track: 1.3 });
    const k1 = new Path2D(); k1.arc(x + h.w / 2 - 3, y + h.h * 0.55, 1.2, 0, TAU); k1.arc(x + h.w / 2 + 3, y + h.h * 0.55, 1.2, 0, TAU);
    smear(ctx, k1, GOLD, 0.95);
  } else {
    box(ctx, seed + 3, x + 4, y + 10, h.w - 8, 12, { cols: ['#f0ead6'], cover: 0.92, alpha: 1, len: 3, gap: 1, width: 1, line: '#4a4a40', lw: 0.6 });
    letters(ctx, 'MEETING', x + h.w / 2, y + 11.6, 3.4, INK, 0.7, 1, seed + 4, { track: 1.22 });
    letters(ctx, '4B', x + h.w / 2, y + 16.8, 3.4, INK, 0.75, 1, seed + 5, { track: 1.3 });
    // the IN USE lamp housing
    box(ctx, seed + 6, x + h.w / 2 - 8, y - 11, 16, 6, { cols: ['#3a3634'], cover: 0.92, alpha: 1, len: 3, gap: 1, width: 1, line: INK, lw: 0.5 });
    const kn = new Path2D(); kn.rect(x + h.w - 8, y + h.h * 0.52, 5, 1.6);
    smear(ctx, kn, '#d8d0b8', 0.95);
    // a narrow glass vision panel, and you can just see a meeting
    box(ctx, seed + 7, x + 6, y + 28, 6, 26, { cols: ['#d8c88a'], cover: 0.9, alpha: 1, len: 3, gap: 1, width: 1, line: '#4a3a2a', lw: 0.6 });
  }
}

function inUseLight(ctx, h, t) {
  const on = 0.75 + 0.25 * Math.sin(t * 3);
  const p = new Path2D(); p.rect(h.x + h.w / 2 - 7, h.y - 10, 14, 4);
  smear(ctx, p, '#e8402c', 0.92, on);
  letters(ctx, 'IN USE', h.x + h.w / 2, h.y - 9.4, 2.6, '#fff0d0', 0.55, on, 77, { track: 1.2 });
}

function extinguisher(ctx, h, x, y, seed) {
  box(ctx, seed, x - 1, y - 10, h.w + 2, 6, { cols: [WHITE], cover: 0.9, alpha: 1, len: 3, gap: 1, width: 1, line: RED, lw: 0.6 });
  const body = [x, y + h.h, x, y + 3, x + 1.5, y + 1, x + h.w - 1.5, y + 1, x + h.w, y + 3, x + h.w, y + h.h];
  solid(ctx, seed + 1, body, { cols: ['#c23a2a', '#d0442e'], cover: 0.95, alpha: 1, len: 4, gap: 0.9, width: 1, line: '#5a1410', lw: 0.6 });
  edge(ctx, seed + 2, x + 1.6, y + 3, x + 1.6, y + h.h - 1, '#ffb090', 0.9, 0.8);
  line(ctx, [x + h.w / 2, y + 1, x + h.w / 2, y - 2, x + h.w + 2, y - 1, x + h.w + 2.5, y + 8], seed + 3, INK, 0.9, 0.95);
}

function trophyCase(ctx, h, x, y, seed) {
  box(ctx, seed, x, y, h.w, h.h, { cols: ['#4a2818', '#552e1c'], cover: 0.9, alpha: 1, len: 6, gap: 1.2, width: 1.3, ang: 1.5, line: INK, lw: 0.8 });
  // lit inside: a warm interior behind glass, three shelves of cups and plaques
  const ix = x + 5, iy = y + 6, iw = h.w - 10, ih = h.h - 22;
  box(ctx, seed + 1, ix, iy, iw, ih, { cols: ['#e8c47a', '#dcb46a'], cover: 0.88, alpha: 1, len: 6, gap: 1.2, width: 1.3, ang: 1.3 });
  const sh = ih / 3;
  for (let s = 0; s < 3; s++) {
    const sy = iy + sh * (s + 1);
    line(ctx, [ix, sy - 0.5, ix + iw, sy - 0.5], seed + 10 + s, '#6a4424', 1.4, 0.9);
    const R = rng(hash(seed, s));
    for (let k = 0; k < 4; k++) {
      const cx = ix + 6 + k * (iw - 10) / 3.2 + (R() - 0.5) * 3;
      const kind = (s + k) % 3;
      if (kind === 0) {
        // a cup
        const cup = [cx - 4, sy - 16, cx + 4, sy - 16, cx + 2.6, sy - 10, cx + 0.8, sy - 9, cx + 0.8, sy - 4, cx + 3, sy - 3, cx + 3, sy - 1, cx - 3, sy - 1, cx - 3, sy - 3, cx - 0.8, sy - 4, cx - 0.8, sy - 9, cx - 2.6, sy - 10];
        solid(ctx, hash(seed, s, k), cup, { cols: [GOLD, '#e8bc4a'], cover: 0.95, alpha: 1, len: 3, gap: 0.9, width: 1, line: '#6a4a14', lw: 0.5 });
        const hl = new Path2D(); hl.moveTo(cx - 2.6, sy - 15); hl.lineTo(cx - 1.8, sy - 11);
        crayon(ctx, hl, '#fff2c0', 0.9, 0.9, 0.8);
      } else if (kind === 1) {
        box(ctx, hash(seed, s, k), cx - 4, sy - 13, 8, 12, { cols: ['#3a2416'], cover: 0.92, alpha: 1, len: 3, gap: 0.9, width: 1, line: GOLD, lw: 0.6 });
        const pl = new Path2D(); pl.rect(cx - 2.4, sy - 10, 4.8, 3);
        smear(ctx, pl, GOLD, 0.95);
      } else {
        const st = [cx - 2.5, sy - 1, cx + 2.5, sy - 1, cx + 1.4, sy - 4, cx + 1.4, sy - 7, cx + 3.2, sy - 12, cx - 3.2, sy - 12, cx - 1.4, sy - 7, cx - 1.4, sy - 4];
        solid(ctx, hash(seed, s, k), st, { cols: ['#c8ccd2', '#d8dade'], cover: 0.95, alpha: 1, len: 3, gap: 0.9, width: 1, line: '#5a5c60', lw: 0.5 });
      }
    }
  }
  // glass glints across the doors
  const gl = new Path2D();
  gl.moveTo(ix + 4, iy + ih - 4); gl.lineTo(ix + 16, iy + 6);
  gl.moveTo(ix + iw - 14, iy + ih - 2); gl.lineTo(ix + iw - 4, iy + ih * 0.5);
  crayon(ctx, gl, WHITE, 1, 0.45, 0.6);
  line(ctx, [x + h.w / 2, iy, x + h.w / 2, iy + ih], seed + 3, '#2a1608', 1, 0.85);
  box(ctx, seed + 4, x + 3, y + h.h - 14, h.w - 6, 12, { cols: ['#3a2014'], cover: 0.9, alpha: 1, len: 4, gap: 1.1, width: 1.1, ang: 1.5, line: '#c08a4a', lw: 0.6 });
}

function bookshelf(ctx, h, x, y, seed) {
  box(ctx, seed, x, y, h.w, h.h, { cols: ['#3e2214', '#48281a'], cover: 0.9, alpha: 1, len: 6, gap: 1.2, width: 1.3, ang: 1.5, line: INK, lw: 0.8 });
  const shelves = 6;
  const sh = (h.h - 10) / shelves;
  const SP = ['#7a2420', '#2a4a34', '#6a4020', '#2a3050', '#8a5a2a', '#4a1a1c', '#3a5a3a'];
  for (let s = 0; s < shelves; s++) {
    const sy = y + 5 + sh * (s + 1);
    const R = rng(hash(seed, s));
    let bx = x + 4;
    const end = x + h.w - 4;
    while (bx < end - 2) {
      if (R() < 0.08 && end - bx > 12) {
        // an ornament: a little bust, or a globe, between books
        const ox = bx + 5;
        if (R() < 0.5) {
          const g = new Path2D(); g.arc(ox, sy - 6, 3.5, 0, TAU);
          back(ctx, g); smear(ctx, g, '#4a7a8a', 0.9);
          line(ctx, [ox - 2, sy - 1, ox + 2, sy - 1], hash(seed, s, 77), GOLD, 1, 1);
        } else {
          const b = new Path2D(); b.arc(ox, sy - 9, 2.4, 0, TAU); b.rect(ox - 3, sy - 6.5, 6, 5.5);
          back(ctx, b); smear(ctx, b, '#d8d2c0', 0.92);
        }
        bx += 11;
        continue;
      }
      const bw = 2.4 + R() * 2.4;
      const bh = sh * (0.62 + R() * 0.3);
      const tilt = R() < 0.06;
      const col = SP[Math.floor(R() * SP.length)];
      const p = new Path2D();
      if (tilt) { p.moveTo(bx, sy); p.lineTo(bx + bw, sy); p.lineTo(bx + bw + 3, sy - bh); p.lineTo(bx + 3, sy - bh); p.closePath(); } else p.rect(bx, sy - bh, bw, bh);
      back(ctx, p, '#2a1a10');
      smear(ctx, p, col, 0.9);
      const band = new Path2D();
      band.moveTo(bx + 0.3, sy - bh + 2.5); band.lineTo(bx + bw - 0.3, sy - bh + 2.5);
      band.moveTo(bx + 0.3, sy - 3); band.lineTo(bx + bw - 0.3, sy - 3);
      crayon(ctx, band, GOLD, 0.6, 0.75, 0.7);
      bx += bw + (tilt ? 3 : 0.4);
    }
    line(ctx, [x + 2, sy + 0.5, x + h.w - 2, sy + 0.5], hash(seed, s, 3), '#c08a4a', 1, 0.6);
  }
}

// The founder, in oils: Don K. Eggshell PhD as he ships now — the silver professor. A wild
// mane standing up and out, lock by lock in three greys; an egg-on-end head; fine
// rectangular specs; thick angry brows; a big drooping silver moustache over a white
// chin patch and a flat frown; a white collar and a black cape lined in red, its collar
// standing up behind his ears. Gilt frame, a brass plate, a picture light over it.
// Laid out on the shipped drawing's own unit box (src/sprites/props.js, the professor
// section), so the two cannot disagree about where his features sit.
const PRO = {
  skin: '#eec9a8', skinDk: '#e0b68e', skinLine: '#a87a5a',
  greys: [['#dfe2ea', '#c6cbd9'], ['#cdd3e0', '#b1b9ca'], ['#bcc3d2', '#a0a8bb']],
  hairLine: '#7e8496', stache: '#cdd3e0', stubble: '#c9ab93', chin: '#e4e7ee',
  rim: '#3d3d48', lens: '#c8e0f8', cape: '#23232e', capeIn: '#b8202a', shirt: '#eceef4',
};
const PRO_MANE = {
  back: [[-158, 0.85, 15, 14], [-172, 0.7, 13, 18], [166, 0.62, 14, 26], [148, 0.5, 15, 30],
    [-26, 0.8, 14, -16], [-8, 0.72, 13, -20], [12, 0.6, 14, -26], [32, 0.48, 15, -30]],
  front: [[-128, 1.05, 19, 22], [-104, 1.18, 18, 20], [-80, 1.0, 17, 16], [-58, 0.82, 17, 10],
    [-146, 0.62, 14, 26], [-38, 0.56, 14, 8]],
};

function proEgg(p, cx, cy, rx, ry) {
  const taper = 0.7;
  const wy = cy - ry * 0.16;
  const top = cy - ry;
  const bot = cy + ry;
  const h = 0.56;
  p.moveTo(cx, top);
  p.bezierCurveTo(cx + rx * h, top, cx + rx, wy - (wy - top) * h, cx + rx, wy);
  p.bezierCurveTo(cx + rx, wy + (bot - wy) * h * 0.92, cx + rx * taper * 0.9, bot - (bot - wy) * 0.1, cx, bot);
  p.bezierCurveTo(cx - rx * taper * 0.9, bot - (bot - wy) * 0.1, cx - rx, wy + (bot - wy) * h * 0.92, cx - rx, wy);
  p.bezierCurveTo(cx - rx, wy - (wy - top) * h, cx - rx * h, top, cx, top);
  p.closePath();
}

function portrait(ctx, h, x, y, seed) {
  const fx = x, fy = y, fw = h.w, fh = h.h;
  // the frame: gilt, carved
  box(ctx, seed, fx - 5, fy - 5, fw + 10, fh + 10, { cols: [GOLD, '#e6b84a', '#b8862a'], cover: 0.95, alpha: 1, len: 4, gap: 1, width: 1.2, ang: 0.8, line: '#5a3a10', lw: 0.9 });
  const orn = new Path2D();
  for (let k = 0; k < 14; k++) {
    const t = k / 14;
    orn.moveTo(fx - 3 + t * (fw + 6), fy - 3.5); orn.arc(fx - 3 + t * (fw + 6), fy - 3, 0.9, 0, TAU);
    orn.moveTo(fx - 3 + t * (fw + 6), fy + fh + 3.5); orn.arc(fx - 3 + t * (fw + 6), fy + fh + 3, 0.9, 0, TAU);
  }
  crayon(ctx, orn, '#fff0b0', 0.7, 0.8, 0.8);
  // the oil ground: dark umber with a warm glow behind the head
  box(ctx, seed + 1, fx, fy, fw, fh, { cols: ['#2a1c14', '#34221a'], cover: 0.92, alpha: 1, len: 6, gap: 1.1, width: 1.3, ang: 1.2 });
  const glow = new Path2D();
  wob(glow, ellPts(fx + fw / 2, fy + fh * 0.36, fw * 0.4, fh * 0.34, 18), seed + 2, 1);
  ctx.save(); ctx.clip(glow);
  hatch(ctx, seed + 3, fx, fy, fx + fw, fy + fh, { cols: ['#6a4428', '#7a5030'], cover: 0.7, alpha: 0.9, len: 6, gap: 1.6, width: 1.3, ang: 1.2 });
  ctx.restore();
  const cx = fx + fw / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(fx, fy, fw, fh);
  ctx.clip();
  // the shipped drawing's unit box, and its head transform (scaled 0.88 about the neck)
  const BW = 70.8;
  const BH = 59;
  const ox = cx - BW / 2;
  const oy = fy + 7.4;
  const X = (u) => ox + u * BW;
  const Y = (v) => oy + v * BH;
  const HX = (u) => X(0.5) + (u - 0.5) * BW * 0.88;
  const HY = (v) => Y(0.445) + (v - 0.52) * BH * 0.88;
  const hw = (u) => u * BW * 0.88;
  const hh = (v) => v * BH * 0.88;

  // THE CAPE: red lining in the high collar standing up behind his ears, black outside
  const lining = new Path2D();
  const outer = new Path2D();
  for (const sd of [-1, 1]) {
    lining.moveTo(X(0.5 + sd * 0.08), Y(0.6));
    lining.quadraticCurveTo(X(0.5 + sd * 0.42), Y(0.5), X(0.5 + sd * 0.36), Y(0.2));
    lining.quadraticCurveTo(X(0.5 + sd * 0.3), Y(0.36), X(0.5 + sd * 0.14), Y(0.42));
    lining.closePath();
    outer.moveTo(X(0.5 + sd * 0.16), Y(0.62));
    outer.quadraticCurveTo(X(0.5 + sd * 0.44), Y(0.52), X(0.5 + sd * 0.4), Y(0.24));
    outer.lineTo(X(0.5 + sd * 0.36), Y(0.2));
    outer.quadraticCurveTo(X(0.5 + sd * 0.42), Y(0.5), X(0.5 + sd * 0.08), Y(0.6));
    outer.closePath();
  }
  block(ctx, lining, PRO.capeIn, 0.95);
  ctx.save(); ctx.clip(lining);
  hatch(ctx, seed + 40, fx, fy, fx + fw, fy + fh, { cols: ['#d0303a', '#8e141e'], cover: 0.9, alpha: 0.7, len: 6, gap: 1.5, width: 1, ang: 1.25 });
  ctx.restore();
  crayon(ctx, lining, '#4a0a10', 0.6, 0.8, 0.8);
  block(ctx, outer, PRO.cape, 0.95);
  // the shoulders, carried down to the frame
  const body = new Path2D();
  body.ellipse(X(0.5), Y(0.6), BW * 0.33, BH * 0.17, 0, Math.PI, TAU);
  body.lineTo(X(0.5) + BW * 0.4, fy + fh + 2);
  body.lineTo(X(0.5) - BW * 0.4, fy + fh + 2);
  body.closePath();
  block(ctx, body, PRO.cape, 0.95);
  ctx.save(); ctx.clip(body);
  hatch(ctx, seed + 41, fx, fy, fx + fw, fy + fh + 2, { cols: ['#34344a', '#14141c'], cover: 0.9, alpha: 0.75, len: 7, gap: 1.6, width: 1.1, ang: 1.35 });
  ctx.restore();
  // a cool rim of picture light along the cape's shoulders and collar edges
  const crim = new Path2D();
  for (const sd of [-1, 1]) {
    wob(crim, [X(0.5 + sd * 0.4), Y(0.25), X(0.5 + sd * 0.43), Y(0.45), X(0.5 + sd * 0.3), Y(0.47)], hash(seed, 42, sd), 0.2);
  }
  crayon(ctx, crim, '#7a7a96', 0.8, 0.8, 0.8);
  // the shirt's collar points
  const coll = new Path2D();
  for (const sd of [-1, 1]) {
    coll.moveTo(X(0.5 + sd * 0.05), Y(0.46)); coll.lineTo(X(0.5 + sd * 0.21), Y(0.5)); coll.lineTo(X(0.5 + sd * 0.13), Y(0.62)); coll.closePath();
  }
  block(ctx, coll, PRO.shirt, 0.96);
  crayon(ctx, coll, '#6a6a7a', 0.5, 0.8, 0.8);

  // THE MANE: locks rooted inside the skull, growing out through it, each one filled in
  // its own grey and then drawn over strand by strand in the other two
  const scx = HX(0.5);
  const scy = HY(0.35);
  const srx = hw(0.165);
  const sry = hh(0.2);
  const RAD = Math.PI / 180;
  const lock = ([deg, len, spread, curl], i, shaded) => {
    const pX = (d, k2 = 1) => scx + Math.cos(d * RAD) * srx * k2;
    const pY = (d, k2 = 1) => scy + Math.sin(d * RAD) * sry * k2;
    const tip = deg + curl;
    const lp = new Path2D();
    lp.moveTo(pX(deg - spread, 0.86), pY(deg - spread, 0.86));
    lp.quadraticCurveTo(pX(deg - spread * 0.5, 1 + len * 0.55), pY(deg - spread * 0.5, 1 + len * 0.55), pX(tip, 1 + len), pY(tip, 1 + len));
    lp.quadraticCurveTo(pX(deg + spread * 1.15, 1 + len * 0.3), pY(deg + spread * 1.15, 1 + len * 0.3), pX(deg + spread, 0.86), pY(deg + spread, 0.86));
    lp.closePath();
    const tone = PRO.greys[i % 3][shaded ? 1 : 0];
    block(ctx, lp, tone, 0.95);
    ctx.save(); ctx.clip(lp);
    const strands = [new Path2D(), new Path2D()];
    for (let q = 0; q < 5; q++) {
      const t = (q + 0.5) / 5 - 0.5;
      const d0 = deg + t * spread * 1.6;
      const ax = pX(d0, 0.9);
      const ay = pY(d0, 0.9);
      const mx = pX(deg + t * spread, 1 + len * 0.5);
      const my = pY(deg + t * spread, 1 + len * 0.5);
      const tx = pX(tip + t * spread * 0.3, 1 + len * (0.92 - Math.abs(t) * 0.3));
      const ty = pY(tip + t * spread * 0.3, 1 + len * (0.92 - Math.abs(t) * 0.3));
      const sp = strands[q % 2];
      sp.moveTo(ax, ay); sp.quadraticCurveTo(mx, my, tx, ty);
    }
    crayon(ctx, strands[0], PRO.greys[(i + 1) % 3][shaded ? 1 : 0], 0.7, 0.9, 0.85);
    crayon(ctx, strands[1], PRO.greys[(i + 2) % 3][shaded ? 1 : 0], 0.6, 0.85, 0.85);
    ctx.restore();
    crayon(ctx, lp, PRO.hairLine, 0.45, 0.75, 0.8);
  };
  PRO_MANE.back.forEach((l, i) => lock(l, i, true));
  PRO_MANE.front.forEach((l, i) => lock(l, i, false));
  // ears
  for (const sd of [-1, 1]) {
    const ex = HX(0.5 + sd * 0.16);
    const ey = HY(0.378);
    const ear = new Path2D(); ear.ellipse(ex, ey, hw(0.036), hh(0.052), sd * 0.28, 0, TAU);
    block(ctx, ear, PRO.skin, 0.95);
    crayon(ctx, ear, PRO.skinLine, 0.45, 0.7, 0.8);
    const inn = new Path2D(); inn.ellipse(ex + sd * hw(0.006), ey, hw(0.016), hh(0.026), sd * 0.28, -1.9, 1.5);
    crayon(ctx, inn, PRO.skinLine, 0.4, 0.6, 0.75);
  }
  // the head: an egg on its end, peach, shaded down its far side and under the jaw
  const head = new Path2D();
  proEgg(head, HX(0.5), HY(0.375), hw(0.168), hh(0.215));
  block(ctx, head, PRO.skin, 0.96);
  ctx.save(); ctx.clip(head);
  const hsh = new Path2D(); wob(hsh, arcPts(HX(0.5), HY(0.375), hw(0.14), hh(0.18), -0.5, 1.3, 10), seed + 50, 0.2);
  crayon(ctx, hsh, PRO.skinDk, 1.6, 0.85, 0.85);
  const hhl = new Path2D(); wob(hhl, arcPts(HX(0.5), HY(0.375), hw(0.12), hh(0.16), Math.PI * 1.1, Math.PI * 1.45, 7), seed + 51, 0.2);
  crayon(ctx, hhl, '#fbe6cf', 1.1, 0.8, 0.8);
  // stubble on the jaw, and the white patch on the chin: he is going grey from the chin up
  const stub = new Path2D();
  stub.moveTo(HX(0.295), HY(0.425)); stub.quadraticCurveTo(HX(0.5), HY(0.478), HX(0.705), HY(0.425));
  stub.lineTo(HX(0.705), HY(0.72)); stub.lineTo(HX(0.295), HY(0.72)); stub.closePath();
  smear(ctx, stub, PRO.stubble, 0.6, 0.38);
  const cw = 0.075;
  const chin = new Path2D();
  chin.moveTo(HX(0.5 - cw), HY(0.53)); chin.quadraticCurveTo(HX(0.5), HY(0.575), HX(0.5 + cw), HY(0.53));
  chin.quadraticCurveTo(HX(0.5 + cw * 0.87), HY(0.635), HX(0.5), HY(0.665));
  chin.quadraticCurveTo(HX(0.5 - cw * 0.87), HY(0.635), HX(0.5 - cw), HY(0.53)); chin.closePath();
  smear(ctx, chin, PRO.chin, 0.85, 0.9);
  const ticks = new Path2D();
  const Rt = rng(seed + 52);
  for (let q = 0; q < 16; q++) {
    const tx = HX(0.5 + (Rt() - 0.5) * 0.13);
    const ty = HY(0.54 + Rt() * 0.1);
    ticks.moveTo(tx, ty); ticks.lineTo(tx + (Rt() - 0.5) * 0.5, ty + 0.7);
  }
  crayon(ctx, ticks, '#ffffff', 0.4, 0.8, 0.8);
  ctx.restore();
  crayon(ctx, head, PRO.skinLine, 0.5, 0.7, 0.8);
  // the nose: oblong, under the bridge of the specs
  const nose = new Path2D(); nose.ellipse(HX(0.5), HY(0.388), hw(0.025), hh(0.04), 0, 0, TAU);
  smear(ctx, nose, PRO.skinDk, 0.92);
  const nl = new Path2D(); nl.ellipse(HX(0.5), HY(0.388), hw(0.025), hh(0.04), 0, 0.12 * Math.PI, 0.88 * Math.PI);
  crayon(ctx, nl, PRO.skinLine, 0.45, 0.7, 0.8);
  // fine rectangular specs: pale-blue lenses tapered underneath, dark rims, a heavy bar on top
  const sy = HY(0.346);
  const lh = hh(0.036);
  const lw = hw(0.067);
  const off = hw(0.067 + 0.005);
  for (const sd of [-1, 1]) {
    const lx = HX(0.5) + sd * off;
    const lens = new Path2D();
    const bo = lw - 0.07 * lw * 2;
    const bi = -lw + 0.12 * lw * 2;
    const pts = [[-lw, -lh], [lw, -lh], [bo, lh], [bi, lh]].map(([u, v]) => [lx + sd * u, sy + v]);
    lens.moveTo(pts[0][0], pts[0][1]);
    for (let q = 1; q < 4; q++) lens.lineTo(pts[q][0], pts[q][1]);
    lens.closePath();
    block(ctx, lens, PRO.lens, 0.96);
    crayon(ctx, lens, PRO.rim, 0.45, 0.9, 0.85);
    const arm = new Path2D(); arm.moveTo(lx + sd * lw, sy - lh + 0.3); arm.lineTo(HX(0.5) + sd * hw(0.166), sy - hh(0.006));
    crayon(ctx, arm, PRO.rim, 0.35, 0.8, 0.8);
    const pu = new Path2D(); pu.arc(lx - sd * hw(0.004), sy + hh(0.004), hw(0.017), 0, TAU);
    smear(ctx, pu, '#1a1028', 0.96);
    const gl = new Path2D(); gl.moveTo(lx + sd * lw * 0.2, sy - lh * 0.6); gl.lineTo(lx + sd * lw * 0.7, sy + lh * 0.2);
    crayon(ctx, gl, '#ffffff', 0.4, 0.7, 0.8);
  }
  const bar = new Path2D(); bar.moveTo(HX(0.5) - off - lw, sy - lh); bar.lineTo(HX(0.5) + off + lw, sy - lh);
  crayon(ctx, bar, PRO.rim, 0.75, 0.95, 0.9);
  // thick angry silver brows, inner ends dragged down
  const by = HY(0.25);
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(HX(0.5) + sd * off, by);
    ctx.scale(sd, 1);
    const w = hw(0.05);
    const bh = hh(0.034);
    const drop = bh * 0.9;
    const br = new Path2D();
    br.moveTo(-w, bh * 0.6 + drop);
    br.quadraticCurveTo(0, -bh * 1.1 + drop * 0.35, w, bh * 0.4);
    br.quadraticCurveTo(0, bh * 1.4, -w, bh * 1.5 + drop);
    br.closePath();
    block(ctx, br, PRO.greys[0][0], 0.96);
    const bs = new Path2D(); bs.moveTo(-w * 0.8, bh * 0.9 + drop * 0.8); bs.lineTo(w * 0.8, bh * 0.5);
    crayon(ctx, bs, PRO.greys[2][0], 0.5, 0.85, 0.85);
    crayon(ctx, br, PRO.hairLine, 0.4, 0.8, 0.8);
    ctx.restore();
  }
  // a flat frown, then THE MOUSTACHE over it: broad, silver, its ends drooping
  const my = HY(0.458 + 0.038 * 0.85 + 0.022);
  const mouth = new Path2D(); wob(mouth, [HX(0.448), my + 0.35, HX(0.5), my, HX(0.552), my + 0.35], seed + 60, 0.08);
  crayon(ctx, mouth, '#2a1a24', 0.7, 0.95, 0.92);
  const mcx = HX(0.5);
  const mcy = HY(0.458);
  const span = hw(0.13);
  const dr = hh(0.05);
  const st = new Path2D();
  for (const sd of [-1, 1]) {
    st.moveTo(mcx, mcy - dr * 0.3);
    st.quadraticCurveTo(mcx + sd * span * 0.45, mcy - dr * 0.95, mcx + sd * span, mcy + dr * 0.25);
    st.quadraticCurveTo(mcx + sd * span * 1.02, mcy + dr * 1.25, mcx + sd * span * 0.86, mcy + dr * 1.5);
    st.quadraticCurveTo(mcx + sd * span * 0.5, mcy + dr * 0.6, mcx + sd * span * 0.16, mcy + dr * 0.8);
    st.quadraticCurveTo(mcx + sd * span * 0.05, mcy + dr * 0.75, mcx, mcy + dr * 0.55);
    st.closePath();
  }
  block(ctx, st, PRO.stache, 0.96);
  ctx.save(); ctx.clip(st);
  const ss = [new Path2D(), new Path2D()];
  for (const sd of [-1, 1]) {
    for (let q = 0; q < 6; q++) {
      const t = q / 6;
      const ax = mcx + sd * span * (0.05 + t * 0.6);
      const ay = mcy - dr * 0.4;
      ss[q % 2].moveTo(ax, ay);
      ss[q % 2].quadraticCurveTo(ax + sd * span * 0.25, mcy + dr * 0.2, ax + sd * span * 0.35, mcy + dr * 1.3);
    }
  }
  crayon(ctx, ss[0], PRO.greys[0][0], 0.55, 0.9, 0.85);
  crayon(ctx, ss[1], PRO.greys[2][0], 0.5, 0.85, 0.85);
  ctx.restore();
  crayon(ctx, st, '#8f97a8', 0.4, 0.85, 0.8);
  ctx.restore();
  // varnish glints
  line(ctx, [fx + 3, fy + 12, fx + 10, fy + 3], seed + 27, '#f8e8c0', 0.9, 0.35);
  // the brass plate
  box(ctx, seed + 30, cx - 19, fy + fh + 9, 38, 8, { cols: [GOLD, '#e2b65a'], cover: 0.95, alpha: 1, len: 3, gap: 1, width: 1, line: '#5a3a10', lw: 0.6 });
  letters(ctx, 'FOUNDER', cx, fy + fh + 10.6, 4.4, '#2a1a0a', 0.85, 1, seed + 31, { track: 1.3 });
  // the picture light
  box(ctx, seed + 32, cx - 14, fy - 12, 28, 4, { cols: [GOLD], cover: 0.9, alpha: 1, len: 3, gap: 1, width: 1, line: '#5a3a10', lw: 0.5 });
  line(ctx, [cx, fy - 8, cx, fy - 6], seed + 33, '#5a3a10', 1, 1);
}

// Reuse the gallery's carved-wax Founder portrait at poster size, with its
// gilded frame, picture light and nameplate all drawn by the original painter.
export function paintFounderGalleryPortrait(ctx, x, y, w, h) {
  prepare(ctx); // the paper and wax textures, when the crayon cabinet has not run first
  const fw = Math.min(w - 18, 58);
  const fh = Math.min(h - 38, 54);
  const fx = x + (w - fw) / 2;
  const fy = y + 13;
  portrait(ctx, { w: fw, h: fh }, fx, fy, 73);
}

// ---- the wall strip
function bakeWall(f) {
  const F = OFFICE_FLOORS[f.floor];
  const W = F.wall;
  const P = W.period;
  const y0 = f.ceilingY;
  const y1 = f.wallBase + 2;
  const G = f.glass;
  return bakeStrip(P, y0, y1, (ctx) => {
    W.bays.forEach((b, i) => {
      copies(P, b.u, b.u1 - b.u, (u) => {
        const u1 = u + (b.u1 - b.u);
        if (b.type === 'wall') wallFill(ctx, f, u, u1, y0, f.wallBase, hash(1000 + i, f.stage));
        else {
          wallFill(ctx, f, u, u1, y0, G.top, hash(1100 + i, f.stage));
          if (G.bottom < f.wallBase && f.floor !== 'open' && f.floor !== 'exec') wallFill(ctx, f, u, u1, G.bottom, f.wallBase, hash(1200 + i, f.stage));
          glassFrame(ctx, f, { blinds: b.blinds ?? 0, revolvingDoor: b.revolvingDoor ?? null, x0: b.u }, u, u1, hash(1300 + i, f.stage));
        }
      });
    });
    frieze(ctx, f, P);
    W.columns.forEach((c, i) => copies(P, c.u, c.w, (u) => column(ctx, f, u, c.w, y0, f.wallBase, hash(1400 + i, f.stage))));
    // a soft shadow line where the wall meets the floor
    line(ctx, [0, f.wallBase + 0.5, P, f.wallBase + 0.5], 1500 + f.stage, INK, 1.4, 0.45, 0.6, 0.2);
    W.hangs.forEach((h, i) => {
      const w = h.w || (h.r || 10) * 2;
      const u0 = h.kind === 'clock' ? h.u - h.r : h.u;
      copies(P, u0, w, (u) => hangPaint(ctx, f, h, h.kind === 'clock' ? u + h.r : u, hash(1600 + i, f.stage)));
    });
  });
}

// ------------------------------------------------------------------ ceiling and lights
function bakeCeiling(f) {
  const F = OFFICE_FLOORS[f.floor];
  const P = F.lights.period;
  const cy = f.ceilingY;
  return bakeStrip(P, 0, cy + 2, (ctx) => {
    const p = new Path2D();
    p.rect(0, 0, P, cy);
    const tone = { lobby: ['#4a3a2c', '#54402e'], open: ['#a9a99a', '#a2a294'], exec: ['#3a2216', '#44281a'] }[f.floor];
    block(ctx, p, tone[0], 0.9);
    fillHatch(ctx, p, { cols: tone, cover: 0.9, alpha: 0.8, len: 12, gap: 2.4, width: 1.5, ang: 0.2, angJ: 0.04, even: true }, 2000 + f.stage, 0, 0);
    if (f.floor === 'open') {
      // a suspended grid; a tile is 30 wide
      const g = new Path2D();
      for (let u = 0; u < P; u += 30) { g.moveTo(u, 0); g.lineTo(u, cy); }
      for (const y of [11, 22]) { g.moveTo(0, y); g.lineTo(P, y); }
      crayon(ctx, g, '#7a786c', 0.7, 0.5, 0.6);
      F.lights.us.forEach((u, i) => copies(P, u - 24, 48, (uu) => troffer(ctx, uu + 24, cy, i !== F.lights.flicker, hash(2100, i))));
    } else {
      // a cove: a cream line of hidden light along the ceiling's edge
      line(ctx, [0, cy - 1.2, P, cy - 1.2], 2200 + f.stage, f.floor === 'exec' ? '#f2c070' : CREAM, 1.6, 0.85, 0.75, 0.2);
      line(ctx, [0, cy - 3.2, P, cy - 3.2], 2201 + f.stage, INK, 1, 0.5, 0.6, 0.2);
      F.lights.us.forEach((u, i) => copies(P, u - 6, 12, (uu) => {
        box(ctx, hash(2300, i), uu - 5, cy - 2, 10, 2.5, { cols: [GOLD], cover: 0.9, alpha: 1, len: 3, gap: 1, width: 1, line: SEPIA, lw: 0.5 });
      }));
    }
    line(ctx, [0, cy + 0.5, P, cy + 0.5], 2400 + f.stage, INK, 1.2, 0.6, 0.7, 0.15);
  });
}

function troffer(ctx, x, cy, on, seed) {
  box(ctx, seed, x - 23, cy - 6, 46, 6, { cols: ['#8a8a80'], cover: 0.85, alpha: 1, len: 3, gap: 1, width: 1, line: '#4a4a44', lw: 0.6 });
  if (on) {
    const t = new Path2D();
    t.moveTo(x - 20, cy - 3.2); t.lineTo(x + 20, cy - 3.2);
    crayon(ctx, t, WHITE, 2.6, 1, 0.95);
    crayon(ctx, t, '#fffbe8', 1.2, 1, 0.98);
  } else {
    const t = new Path2D();
    t.moveTo(x - 20, cy - 3.2); t.lineTo(x + 20, cy - 3.2);
    crayon(ctx, t, '#cfcfc4', 2.4, 0.9, 0.85);
  }
}

function glowSprite(key, r, cols, n, alphaK = 1) {
  return sprite(key, [-r - 4, -r - 4, r + 4, r + 4], (ctx) => {
    const R = rng(hash(r, n, cols.length));
    const rings = [new Path2D(), new Path2D(), new Path2D()];
    for (let k = 0; k < n; k++) {
      const t = R();
      const rr = 3 + t * t * r;
      const a0 = R() * TAU;
      const sweep = 1 + R() * 2.4;
      wob(rings[rr < r * 0.35 ? 0 : rr < r * 0.7 ? 1 : 2], arcPts((R() - 0.5) * 2, (R() - 0.5) * 2, rr, rr, a0, a0 + sweep, Math.ceil((sweep * rr) / 3)), hash(r, k), 0.5);
    }
    crayon(ctx, rings[2], cols[0], 1.3, 0.22 * alphaK, 0.5);
    crayon(ctx, rings[1], cols[0], 1.4, 0.4 * alphaK, 0.58);
    crayon(ctx, rings[0], cols[1], 1.4, 0.6 * alphaK, 0.66);
  });
}

function lightsLive(ctx, f) {
  const cy = f.ceilingY;
  for (const l of f.lights) {
    if (l.variant === 'tube') {
      if ((l.on < 1 || l.i === OFFICE_FLOORS[f.floor].lights.flicker) && l.on > 0.5) {
        local(ctx, l.x, 0, () => {
          const t = new Path2D();
          t.moveTo(-20, cy - 3.2); t.lineTo(20, cy - 3.2);
          crayon(ctx, t, WHITE, 2.6, 1, 0.95);
          crayon(ctx, t, '#fffbe8', 1.2, 1, 0.98);
        });
      }
      continue;
    }
    local(ctx, l.x, 0, () => {
      const cord = new Path2D();
      cord.moveTo(0, cy); cord.lineTo(0, l.y - 5);
      crayon(ctx, cord, INK, 0.7, 0.85, 0.8);
    });
    if (l.variant === 'globe') {
      blit(ctx, glowSprite('glow:globe', 22, ['#f6e2a2', '#fff4cc'], 26), l.x, l.y, 0.9);
      blit(ctx, sprite('globe', [-8, -9, 8, 8], (x) => {
        const g = ellPts(0, 0, 6.2, 6.2, 18);
        solid(x, 2500, g, { cols: [WHITE, '#fff6dc'], cover: 0.95, alpha: 1, len: 4, gap: 1, width: 1.2, line: '#c9b07a', lw: 0.7 });
        box(x, 2501, -2, -8, 4, 2.5, { cols: [GOLD], cover: 0.9, alpha: 1, len: 2, gap: 1, width: 1 });
        const s = new Path2D(); wob(s, arcPts(0, 0, 4.6, 4.6, 0.2, 1.4, 6), 2502, 0.2);
        crayon(x, s, '#e2cf9a', 1.2, 0.8, 0.7);
      }), l.x, l.y);
    } else {
      // exec pendant: a brass cone, its warm pool falling below
      blit(ctx, sprite('pool', [-34, -2, 34, 70], (x) => {
        const R = rng(2600);
        const p = new Path2D();
        for (let k = 0; k < 30; k++) {
          const a = (R() - 0.5) * 0.9;
          const r0 = 4 + R() * 6;
          const r1 = 30 + R() * 36;
          p.moveTo(Math.sin(a) * r0, Math.cos(a) * r0); p.lineTo(Math.sin(a) * r1, Math.cos(a) * r1);
        }
        crayon(x, p, '#f6c56a', 1.6, 0.16, 0.5);
      }), l.x, l.y, 1);
      blit(ctx, glowSprite('glow:pendant', 16, ['#f6b85a', '#fde3a0'], 18), l.x, l.y + 2, 0.85);
      blit(ctx, sprite('pendant', [-10, -9, 10, 5], (x) => {
        const cone = [-8, 3, -3, -7, 3, -7, 8, 3];
        solid(x, 2700, cone, { cols: ['#9a6a2a', '#b07c32'], cover: 0.92, alpha: 1, len: 3, gap: 1, width: 1.1, line: '#3a2410', lw: 0.6 });
        edge(x, 2701, -6.5, 2, -2.5, -6, '#f2c470', 1, 0.8);
        const rim = new Path2D(); rim.ellipse(0, 3, 8, 1.6, 0, 0, TAU);
        smear(x, rim, '#fde3a0', 0.95);
      }), l.x, l.y);
    }
  }
}

// Morning sun through the glass front: long shafts of cream light leaning down from each
// pane toward the floor, laid in strokes along the beam and dying out toward the lane.
// They start at the glass, so they ride with the wall.
function sunbeams(ctx, f) {
  const G = f.glass;
  for (const b of f.wall.bays) {
    if (b.type !== 'glass') continue;
    const w = Math.round(b.x1 - b.x0);
    const sp = sprite(`beams:${b.i}`, [0, G.top, w + 150, 232], (x) => {
      const R = rng(hash(4200, b.i));
      const dx = 0.62; // run per unit of drop
      const n = Math.max(2, Math.round(w / 60));
      for (let q = 0; q < n; q++) {
        const bx = (q + 0.3 + R() * 0.4) * (w / n);
        const bw = 10 + R() * 18;
        const y0 = G.top + 4 + R() * 10;
        const y1 = 226;
        const steps = 5;
        for (let s2 = 0; s2 < steps; s2++) {
          const ya = y0 + ((y1 - y0) * s2) / steps;
          const yb = y0 + ((y1 - y0) * (s2 + 1)) / steps;
          const shaft = new Path2D();
          shaft.moveTo(bx + (ya - y0) * dx, ya); shaft.lineTo(bx + bw + (ya - y0) * dx, ya);
          shaft.lineTo(bx + bw + (yb - y0) * dx, yb); shaft.lineTo(bx + (yb - y0) * dx, yb); shaft.closePath();
          const t = 1 - s2 / steps;
          x.save();
          x.clip(shaft);
          const strokes = new Path2D();
          for (let k = 0; k < bw * 1.2; k++) {
            const sx = bx + R() * bw + (ya - y0) * dx;
            const L = 14 + R() * 26;
            strokes.moveTo(sx - 4 * dx, ya - 4); strokes.lineTo(sx + (yb - ya + 8) * dx, yb + 4);
            if (L > 30) { strokes.moveTo(sx + 2, ya); strokes.lineTo(sx + 2 + (yb - ya) * dx, yb); }
          }
          crayon(x, strokes, '#fff3d0', 1.6, 0.24 * t, 0.75);
          x.restore();
        }
      }
    });
    blit(ctx, sp, b.x0, 0);
  }
}

// The fluorescent tubes wash the top of the wall in a cold, flat light.
function tubeGlow(ctx, f) {
  const sp = sprite('tubeglow', [-40, 0, 40, 40], (x) => {
    const R = rng(4300);
    const p = new Path2D();
    for (let k = 0; k < 46; k++) {
      const sx = (R() - 0.5) * 40;
      const L = 8 + R() * 26;
      p.moveTo(sx, 1); p.lineTo(sx * (1 + L / 30), 1 + L);
    }
    crayon(x, p, '#f4f8f2', 1.5, 0.2, 0.7);
  });
  for (const l of f.lights) blit(ctx, sp, l.x, f.ceilingY, l.on > 0.5 ? 1 : 0.15);
}

// ------------------------------------------------------------------ the floor plane
// The floor between the wall's foot (204) and the lane (232) is baked row by row in
// perspective. A device row at screen y sits at depth rate r(y) (0.24 at the wall, 1 at the
// lane); its strip is the floor pattern at that depth, P lane px long, squeezed to P * r and
// blitted at that row's own shift, so every joint shears exactly as the plan's do. The
// crayon texture is laid in horizontal strokes no taller than a row, so rows never tear.
const FLOOR_P = 600;
const HORIZON = 195;
const rateAt = (y) => clamp01((y - HORIZON) / (232 - HORIZON));

const FLOORS = {
  marble: { base: '#d2c3a0', baseCover: 0.9, strokes: ['#e0d2b0', '#cbbc98', '#d8caa6', '#ece0c2'], cover: 0.85, density: 0.9, alpha: [0.3, 0.35], joint: '#6a5840', jointA: 0.75, seam: '#f2e8cc' },
  carpet: { base: '#7a8592', baseCover: 0.92, strokes: ['#8590a0', '#717c8a', '#8c96a4'], cover: 0.85, density: 0.9, alpha: [0.3, 0.35], joint: '#4a525e', jointA: 0.7, seam: '#a4acb6' },
  parquet: { base: '#8a5a34', baseCover: 0.92, strokes: ['#966640', '#7e5030', '#a07044'], cover: 0.85, density: 0.9, alpha: [0.35, 0.35], joint: '#3a2012', jointA: 0.8, seam: '#c89056' },
};

function bakeFloor(f) {
  const k = S.k;
  const top = f.wallBase;
  const rows = Math.round((232 - top) * k);
  const Fv = f.floorPlane.variant;
  const st = FLOORS[Fv];
  const cv = makeCanvas(FLOOR_P * k + 2, rows);
  const x = cv.getContext('2d');
  // user units, so the paper tooth lands one tile pixel per device pixel; row j is the
  // band y in [j/k, (j+1)/k) and samples its own row of the tooth
  x.setTransform(k, 0, 0, k, 0, 0);
  const widths = [];
  const camDepth = 240; // world px of depth per unit of 1/r - 1
  const hk = 1 / k;
  // Strokes live in lanes of a couple of device rows, laid out in the floor's own u, so a
  // stroke spans its lane's rows and shears with them in perspective, and never tears.
  const rpl = Math.max(2, Math.round(1.6 * k));
  for (let j = 0; j < rows; j++) {
    const y = top + (j + 0.5) / k;
    const r = rateAt(y);
    const Wd = Math.max(8, Math.round(FLOOR_P * r * k));
    widths.push(Wd);
    const W = Wd / k;
    const rr = W / FLOOR_P; // the rate this row really moves at
    const inv = 1 / Math.max(0.05, r);
    const depth = (inv - 1) * camDepth;
    const yy = j / k;
    const band = (x0, w, colour, a, cover) => {
      if (w <= 0) return;
      x.globalAlpha = a;
      x.fillStyle = cover == null ? colour : wax(x, colour, cover);
      const xa = ((x0 % W) + W) % W;
      if (xa + w > W) { x.fillRect(xa, yy, W - xa, hk); x.fillRect(0, yy, Math.min(W, xa + w - W), hk); } else x.fillRect(xa, yy, w, hk);
    };
    x.globalAlpha = 1;
    x.fillStyle = paper(x);
    x.fillRect(0, yy, W, hk);
    band(0, W, st.base, 1, st.baseCover);
    const lane = Math.floor(j / rpl);
    const lr = j % rpl;
    const rl = rateAt(top + ((lane + 0.5) * rpl) / k);
    const R = rng(hash(3000, lane, Fv.length));
    const n = Math.round((FLOOR_P * rl / 7) * st.density);
    const taper = lr === 0 || lr === rpl - 1 ? 0.18 : 0;
    for (let q = 0; q < n; q++) {
      const u0 = R() * FLOOR_P;
      const L = (4 + R() * 11) / Math.max(0.2, rl);
      const col = st.strokes[Math.floor(R() * st.strokes.length)];
      const a = st.alpha[0] + R() * st.alpha[1];
      band((u0 + L * taper) * rr, L * (1 - 2 * taper) * rr, col, a, st.cover);
    }
    const jw = Math.max(hk, 1.4 * rr);
    const mark = (u, colour, a) => band(u * rr, jw, colour, a);
    if (Fv === 'marble') {
      // big slabs 100 wide by 160 deep, offset in alternate courses; pale veins
      const course = Math.floor(depth / 160);
      const off = course % 2 ? 50 : 0;
      for (let u = off; u < FLOOR_P + off; u += 100) if (h01(3101, u, lane) > 0.1) mark(u, st.joint, st.jointA);
      if ((depth % 160) < 2.6 * inv) band(0, W, st.joint, 0.32);
      for (let v = 0; v < 7; v++) {
        const u = h01(3200, v) * FLOOR_P + depth * (0.35 + 0.3 * h01(3201, v)) + 8 * Math.sin(depth * 0.02 + v);
        band(u * rr, Math.max(hk, 1.6 * rr), st.seam, 0.5);
      }
    } else if (Fv === 'carpet') {
      // carpet tiles 50 square, every other one turned so its pile reads a shade apart
      const rowT = Math.floor(depth / 50);
      for (let c = 0; c < FLOOR_P / 50; c++) {
        if ((c + rowT) % 2 === 0) band(c * 50 * rr, 50 * rr, '#3e4652', 0.14);
        if (h01(3102, c, lane) > 0.12) mark(c * 50, st.joint, st.jointA);
      }
      if ((depth % 50) < 1.5 * inv) band(0, W, st.joint, 0.3);
    } else {
      // parquet: boards 20 wide running into the room, ends staggered; a runner rug
      const board = 20;
      for (let c = 0; c < FLOOR_P / board; c++) {
        if (h01(3103, c, lane) > 0.1) mark(c * board, st.joint, st.jointA);
        const len = 90 + 40 * h01(3300, c);
        const ph = h01(3301, c) * len;
        if (((depth + ph) % len) < 1.4 * inv) band(c * board * rr, board * rr, st.joint, 0.55);
        if (h01(3302, c) < 0.35) band(c * board * rr, board * rr, '#3e2414', 0.14);
        else if (h01(3302, c) > 0.8) band(c * board * rr, board * rr, '#c08a52', 0.1);
      }
      const r0 = 130;
      const r1 = 330;
      if (depth > r0 && depth < r1) {
        band(0, W, '#6a2a26', 0.82, 0.88);
        const R2 = rng(hash(3400, lane));
        for (let q = 0; q < n * 0.6; q++) band(R2() * W, (3 + R2() * 8), R2() < 0.5 ? '#7a3430' : '#5a2220', 0.6, 0.85);
        const edgeBand = Math.min(depth - r0, r1 - depth);
        if (edgeBand < 16 && edgeBand > 7) band(0, W, '#c8963c', 0.6, 0.85);
        if (edgeBand < 3.5 * inv) band(0, W, '#2a1210', 0.5, 0.85);
        const dm = Math.abs(depth - (r0 + r1) / 2);
        const half = Math.max(0, 22 - dm * 0.3);
        if (half > 0) for (let u = 0; u < FLOOR_P; u += 75) band((u + 37 - half) * rr, half * 2 * rr, '#b8843a', 0.5, 0.8);
      }
    }
    // the wall's shadow pooling at its foot
    if (y < top + 4) band(0, W, INK, 0.3 * (1 - (y - top) / 4));
  }
  x.globalAlpha = 1;
  return { cv, widths, rows, top };
}

function drawFloor(ctx, f) {
  const FB = S.floors[f.floor];
  const fl = FB.floor;
  const m = ctx.getTransform();
  const S0 = f.floorPlane.shiftBottom;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  const k = S.k;
  const W = Math.ceil(480 * m.a) + 2;
  const Y0 = Math.round(fl.top * m.d + m.f);
  for (let j = 0; j < fl.rows; j++) {
    const w = fl.widths[j];
    const rr = w / (FLOOR_P * k);
    let X = -Math.round(((S0 * rr * k) % w + w) % w) + Math.round(m.e);
    for (; X < W; X += w) ctx.drawImage(fl.cv, 0, j, w, 1, X, Y0 + j, w, 1);
  }
  ctx.restore();
}

// Reflections in a polished floor sit at the wall's depth, so they move with the wall:
// under each glass bay the window's light lies on the floor in soft vertical strokes,
// under each column a dark streak. Baked per bay and per column, blitted at the wall's x.
function floorReflections(ctx, f) {
  const lobby = f.floor === 'lobby';
  const open = f.floor === 'open';
  const lightCols = lobby ? ['#fbf0d2', '#f0e8d0'] : open ? ['#d8e0e6', '#c8d4dc'] : ['#f4b25a', '#e88a50'];
  const A = lobby ? [0.55, 0.4] : open ? [0.3, 0.22] : [0.32, 0.24];
  for (const b of f.wall.bays) {
    if (b.type !== 'glass') continue;
    const w = Math.round(b.x1 - b.x0);
    blit(ctx, sprite(`refl:${f.floor}:${b.i}`, [0, 0, w, 26], (x) => {
      const R = rng(hash(4100, b.i, f.stage));
      const groups = [new Path2D(), new Path2D()];
      for (let xx = 2; xx < w - 2; xx += 1.6 + R() * 1.4) {
        const y0 = 0.5 + R() * 3;
        const L = (lobby ? 8 : 6) + R() * R() * (lobby ? 16 : 12);
        groups[R() < 0.6 ? 0 : 1].moveTo(xx, y0);
        groups[R() < 0.6 ? 0 : 1].lineTo(xx + (R() - 0.5) * 0.8, y0 + L);
      }
      crayon(x, groups[0], lightCols[0], 1.3, A[0], 0.75);
      crayon(x, groups[1], lightCols[1], 1.2, A[1], 0.7);
      // the mullions' dark reflections breaking it up
      const n = Math.max(1, Math.round(w / f.glass.mullion));
      const mb = new Path2D();
      for (let q = 1; q < n; q++) { const mx = (q * w) / n; mb.moveTo(mx, 0.5); mb.lineTo(mx, 10 + R() * 6); }
      crayon(x, mb, INK, 1.2, 0.3, 0.6);
    }), b.x0, f.wallBase);
  }
  if (open) return;
  for (const c of f.wall.columns) {
    blit(ctx, sprite(`refl:col:${f.floor}:${c.w}`, [-2, 0, c.w + 2, 26], (x) => {
      const p = new Path2D();
      const R = rng(4000 + c.w);
      for (let xx = 1; xx < c.w - 0.5; xx += 1.5) { const L = 8 + R() * 14; p.moveTo(xx, 0.5); p.lineTo(xx + (R() - 0.5), L); }
      crayon(x, p, lobby ? '#2e3a32' : '#1e1210', 1.3, 0.4, 0.65);
    }), c.x, f.wallBase);
  }
}

// ------------------------------------------------------------------ the slab
function bakeSlab(f) {
  const v = f.slab.variant;
  return bakeStrip(FLOOR_P, 230, 272, (ctx) => {
    const p = new Path2D();
    p.rect(0, 232, FLOOR_P, 40);
    const face = { marble: ['#463c34', '#4e443a'], carpet: ['#44464c', '#4c4e54'], parquet: ['#3c2418', '#45291c'] }[v];
    const lip = { marble: '#ece0c0', carpet: '#a8b0ba', parquet: '#dca464' }[v];
    const band = { marble: '#cfc0a0', carpet: '#7e8894', parquet: '#8a5a34' }[v];
    // the face of the slab: dense, even, dark — solid ground
    block(ctx, p, face[0], 0.94);
    fillHatch(ctx, p, { cols: face, cover: 0.95, alpha: 0.85, len: 10, gap: 1.8, width: 1.7, ang: 1.2, even: true }, 5000 + f.stage, 0, 232);
    // the floor's top edge seen in thickness: a band of the floor's own colour, then the lip
    const top = new Path2D();
    top.rect(0, 232, FLOOR_P, 3.2);
    smear(ctx, top, band, 0.92);
    const R = rng(5200 + f.stage);
    const tex = new Path2D();
    if (v === 'marble') {
      for (let k = 0; k < 120; k++) { const xx = R() * FLOOR_P; const yy = 240 + R() * 30; tex.moveTo(xx, yy); tex.lineTo(xx + 1.4, yy - 0.5); }
      crayon(ctx, tex, '#a89a80', 1, 0.5, 0.75);
      const j = new Path2D();
      for (let u = 0; u < FLOOR_P; u += 100) { j.moveTo(u, 236); j.lineTo(u, 272); }
      crayon(ctx, j, '#1e1812', 1, 0.6, 0.75);
    } else if (v === 'carpet') {
      const j = new Path2D();
      for (let u = 0; u < FLOOR_P; u += 120) { j.moveTo(u, 236); j.lineTo(u, 272); }
      crayon(ctx, j, '#26282c', 1, 0.6, 0.75);
      for (let k = 0; k < 90; k++) { const xx = R() * FLOOR_P; const yy = 240 + R() * 30; tex.moveTo(xx, yy); tex.lineTo(xx + 1.2, yy); }
      crayon(ctx, tex, '#6a6e76', 1, 0.45, 0.7);
    } else {
      for (let yy = 243; yy < 272; yy += 4.4) {
        const pts = [];
        for (let u = 0; u <= FLOOR_P; u += 30) pts.push(u, yy + Math.sin(u * 0.03 + yy) * 0.8);
        wob(tex, pts, hash(5300, Math.round(yy)), 0.3);
      }
      crayon(ctx, tex, '#24140c', 0.9, 0.45, 0.7);
      const j = new Path2D();
      for (let u = 0; u < FLOOR_P; u += 75) { j.moveTo(u, 236); j.lineTo(u, 272); }
      crayon(ctx, j, '#1a0e08', 1, 0.6, 0.75);
    }
    // the shadow tucked under the edge
    const sh = new Path2D();
    sh.rect(0, 235, FLOOR_P, 3);
    smear(ctx, sh, INK, 0.9, 0.55);
    const L = new Path2D();
    wob(L, [0, 232.7, FLOOR_P / 2, 232.7, FLOOR_P, 232.7], 5400 + f.stage, 0.12);
    crayon(ctx, L, lip, 1.5, 0.95, 0.9);
  });
}

// ------------------------------------------------------------------ mid furniture
// The band behind the lane: everything here is drawn with a lighter hand — lower cover,
// greyer colour, softer outlines — so the hazards in front own the contrast.
const SOFT = 0.96; // cover multiplier for the mid layer
const PLANT_W = { ficus: 30, palm: 40, snake: 16, bonsai: 18 };

function o(cols, cover, extra = {}) {
  return { cols, cover: cover * SOFT, alpha: 1, len: 6, gap: 1.35, width: 1.3, ang: HAND, ...extra };
}

function shadowFoot(ctx, x0, x1, b) {
  const p = new Path2D();
  p.ellipse((x0 + x1) / 2, b + 1, (x1 - x0) / 2 + 3, 2.4, 0, 0, TAU);
  smear(ctx, p, INK, 0.6, 0.35);
}

function plant(ctx, f, variant, seed) {
  const b = 0;
  const R = rng(seed);
  const potCol = { lobby: ['#cfc3a6', '#c4b89a'], open: ['#6e7378', '#7a7f84'], exec: ['#9a6a2a', '#a8762e'] }[f.floor];
  const leafA = ['#4c6e40', '#587a46'];
  const leafB = '#2e4a2a';
  const leafLit = '#a8c078';
  if (variant === 'bonsai') {
    // a lacquered stand, a shallow dish, a windswept little tree
    box(ctx, seed, -8, b - 18, 16, 18, o(['#3a1a14', '#44201a'], 0.9, { line: INK, lw: 0.6 }));
    box(ctx, seed + 1, -9, b - 22, 18, 4, o(['#2a4a5a'], 0.9, { line: INK, lw: 0.5 }));
    line(ctx, [0, b - 22, -2, b - 28, 3, b - 33], seed + 2, '#4a3020', 1.6, 0.9);
    for (const [cx, cy, rx] of [[-4, -34, 6], [5, -36, 5], [1, -40, 4]]) {
      solid(ctx, seed + cx, ellPts(cx, b + cy, rx, rx * 0.55, 12), o(leafA, 0.9, { len: 4, gap: 1.1 }));
    }
    return;
  }
  const potW = variant === 'snake' ? 12 : variant === 'palm' ? 18 : 16;
  const potH = variant === 'snake' ? 10 : 14;
  const pot = [-potW / 2, b, -potW / 2 - 1.5, b - potH, potW / 2 + 1.5, b - potH, potW / 2, b];
  solid(ctx, seed, pot, o(potCol, 0.9, { line: SEPIA, lw: 0.6, la: 0.6, ang: 1.4 }));
  edge(ctx, seed + 1, -potW / 2 - 0.4, b - potH + 1, -potW / 2 + 0.6, b - 1, CREAM, 1, 0.45);
  const top = b - potH;
  const dark = new Path2D();
  const mid = new Path2D();
  const lit = new Path2D();
  if (variant === 'snake') {
    for (let k = 0; k < 7; k++) {
      const x = (k - 3) * 1.8;
      const h = 16 + R() * 10;
      const lean = (k - 3) * 0.8;
      const q = [x - 1.2, top, x + lean - 0.4, top - h, x + 1.2, top];
      (k % 2 ? dark : mid).moveTo(q[0], q[1]);
      wob(k % 2 ? dark : mid, q, hash(seed, k), 0.3);
    }
    crayon(ctx, mid, leafA[0], 2.2, 0.8, 0.75 * SOFT);
    crayon(ctx, dark, leafB, 2, 0.8, 0.75 * SOFT);
    const edgeL = new Path2D();
    for (let k = 0; k < 7; k += 2) { const x = (k - 3) * 1.8; edgeL.moveTo(x - 0.6, top - 2); edgeL.lineTo(x - 0.2 + (k - 3) * 0.6, top - 12); }
    crayon(ctx, edgeL, '#c8d080', 0.6, 0.6, 0.6);
    return;
  }
  if (variant === 'palm') {
    line(ctx, [0, top, 1, top - 30, -1, top - 46], seed + 2, '#6a5030', 2, 0.8, 0.75 * SOFT);
    for (let k = 0; k < 9; k++) {
      const a = -Math.PI / 2 + (k - 4) * 0.36 + (R() - 0.5) * 0.1;
      const L = 18 + R() * 8;
      const sx = -1;
      const sy = top - 46;
      const ex = sx + Math.cos(a) * L;
      const ey = sy + Math.sin(a) * L * 0.6 + L * 0.35;
      const mx = sx + Math.cos(a) * L * 0.5;
      const my = sy + Math.sin(a) * L * 0.5 - 4;
      const p = k % 3 === 0 ? dark : mid;
      p.moveTo(sx, sy); p.quadraticCurveTo(mx, my, ex, ey);
      // fronds: little strokes off the rib
      for (let j = 1; j < 7; j++) {
        const t = j / 7;
        const fx = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * mx + t * t * ex;
        const fy = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * my + t * t * ey;
        p.moveTo(fx, fy); p.lineTo(fx + 1.5, fy + 4.5 * (1 - t * 0.5));
        p.moveTo(fx, fy); p.lineTo(fx - 1.5, fy + 4.5 * (1 - t * 0.5));
      }
      if (k < 4) { lit.moveTo(sx, sy - 0.6); lit.quadraticCurveTo(mx, my - 0.6, ex, ey - 0.6); }
    }
    crayon(ctx, mid, leafA[1], 1.3, 0.85, 0.75 * SOFT);
    crayon(ctx, dark, leafB, 1.3, 0.8, 0.75 * SOFT);
    crayon(ctx, lit, leafLit, 0.8, 0.6, 0.6);
    return;
  }
  // ficus: a slim trunk and a cloud of small leaves
  line(ctx, [0, top, -1, top - 18, 1, top - 34], seed + 3, '#6a5030', 1.6, 0.8, 0.75 * SOFT);
  const blobs = [[0, -46, 13, 11], [-8, -36, 8, 8], [8, -38, 9, 8], [-3, -54, 8, 6]];
  for (const [bx, by, rx, ry] of blobs) {
    for (let k = 0; k < 28; k++) {
      const a = R() * TAU;
      const rr = Math.sqrt(R());
      const lx = bx + Math.cos(a) * rx * rr;
      const ly = by + Math.sin(a) * ry * rr;
      const la = R() * TAU;
      const tgt = ly < by - ry * 0.3 && lx < bx ? lit : R() < 0.45 ? dark : mid;
      tgt.moveTo(lx - Math.cos(la) * 1.6, b + ly - Math.sin(la) * 1.6);
      tgt.lineTo(lx + Math.cos(la) * 1.6, b + ly + Math.sin(la) * 1.6);
    }
  }
  crayon(ctx, dark, leafB, 2.2, 0.85, 0.8 * SOFT);
  crayon(ctx, mid, leafA[0], 2.2, 0.85, 0.8 * SOFT);
  crayon(ctx, lit, leafLit, 1.8, 0.6, 0.7 * SOFT);
}

function person(ctx, seed, look, shoulders = true, suit = null) {
  const R = rng(seed);
  const SKIN = ['#e2b48c', '#c48c62', '#8e5c3e', '#efc8a2', '#a8704a'];
  const HAIR = ['#2a1a12', '#5a3018', '#b88a48', '#3a2a22', '#8a8a86', '#1a1410'];
  const SHIRT = ['#6a7fa0', '#c8c4b4', '#8a5a6a', '#5a7a6a', '#a89a7a'];
  const skin = SKIN[Math.floor(R() * SKIN.length)];
  const hair = HAIR[Math.floor(R() * HAIR.length)];
  const shirt = suit || SHIRT[Math.floor(R() * SHIRT.length)];
  if (shoulders) {
    const sh = [-8, 16, -7, 9, -3, 6, 3, 6, 7, 9, 8, 16];
    solid(ctx, seed + 1, sh, o([shirt], 0.95, { len: 4, gap: 1.1, line: SEPIA, lw: 0.5, la: 0.5 }));
  }
  const head = ellPts(0, 0, 4.3, 5, 14);
  solid(ctx, seed + 2, head, o([skin], 0.95, { len: 3, gap: 1, width: 1.1, line: SEPIA, lw: 0.5, la: 0.6 }));
  const hp = new Path2D();
  const style = Math.floor(R() * 3);
  if (style === 0) { hp.moveTo(-4.4, -0.5); hp.quadraticCurveTo(-4.4, -5.6, 0, -5.4); hp.quadraticCurveTo(4.4, -5.6, 4.4, -0.5); hp.lineTo(3, -2.6); hp.lineTo(-3, -2.6); hp.closePath(); }
  else if (style === 1) { hp.moveTo(-4.6, 3); hp.quadraticCurveTo(-5, -5.8, 0, -5.6); hp.quadraticCurveTo(5, -5.8, 4.6, 3); hp.lineTo(3.4, -1.6); hp.lineTo(-3.4, -1.6); hp.closePath(); }
  else { hp.moveTo(-4, -2); hp.quadraticCurveTo(0, -6.6, 4, -2); hp.closePath(); }
  smear(ctx, hp, hair, 0.92 * SOFT + 0.15);
  const e = new Path2D();
  e.rect(-1.9 + look * 0.9, -0.6, 0.8, 1); e.rect(1.1 + look * 0.9, -0.6, 0.8, 1);
  smear(ctx, e, INK, 0.95);
}

function cubicleBack(ctx, it, seed) {
  // monitors' backs and screens over the partitions, a mug, a lamp — the furniture of a desk
  const n = Math.round((it.u1 - it.u) / 40);
  for (let d = 0; d < n; d++) {
    const x = d * 40;
    const R = rng(hash(seed, d));
    const mx = x + 22 + (R() - 0.5) * 6;
    box(ctx, hash(seed, d, 1), mx - 7, -40, 14, 9, o(['#3a3c42', '#44464c'], 0.95, { len: 3, gap: 1, line: INK, lw: 0.5, la: 0.6 }));
    if (!it.heads.includes(d) && d !== it.pop) {
      const g = new Path2D(); g.rect(mx - 5.5, -38.5, 11, 6);
      smear(ctx, g, '#9ad0d8', 0.7, 0.7);
    }
    if (R() < 0.5) {
      // a desk lamp arm
      line(ctx, [x + 6, -34, x + 8, -42, x + 13, -44], hash(seed, d, 2), '#3a3c42', 0.9, 0.7);
    }
  }
}

function cubicleFront(ctx, it, seed) {
  const n = Math.round((it.u1 - it.u) / 40);
  const w = n * 40;
  const weave = { cols: ['#6c8290', '#78909c'], cover: 0.85, alpha: 0.5, len: 8, gap: 2.2, width: 1.2, ang: 1.5, angJ: 0.03, even: true };
  for (let d = 0; d < n; d++) {
    const pp = new Path2D();
    pp.rect(d * 40, -34, 39, 34);
    back(ctx, pp);
    smear(ctx, pp, '#8a9ea8', 0.7);
    fillHatch(ctx, pp, weave, hash(seed, d), d * 40, -34);
    const lo = new Path2D(); lo.rect(d * 40, -12, 39, 12);
    smear(ctx, lo, '#4e5a66', 0.7, 0.3);
    edge(ctx, hash(seed, d, 10), d * 40 + 1, -33, d * 40 + 1, -1, '#c8d4d8', 0.8, 0.45);
    edge(ctx, hash(seed, d, 12), d * 40 + 38.4, -33, d * 40 + 38.4, -1, '#3a4650', 0.8, 0.5);
  }
  // the top rail, and the posts
  const rail = [0, -35, w, -35, w, -32.5, 0, -32.5];
  solid(ctx, seed + 1, rail, { cols: ['#c8c8c0'], cover: 0.7 * SOFT, alpha: 1, len: 4, gap: 1.1, width: 1.1, ang: 0.2 });
  const posts = new Path2D();
  for (let d = 0; d <= n; d++) { posts.moveTo(d * 40 - 0.5, -35); posts.lineTo(d * 40 - 0.5, 0); }
  crayon(ctx, posts, '#5a5e66', 1.2, 0.55, 0.65);
  // a mug or a plant pot on a ledge here and there, and a pinned note
  const R = rng(seed + 3);
  for (let d = 0; d < n; d++) {
    if (R() < 0.45) {
      const mx = d * 40 + 6 + R() * 24;
      box(ctx, hash(seed, d, 11), mx, -39, 4, 4, o([['#c23a2a', '#e8e0c8', '#2c5d9e'][d % 3]], 0.9, { len: 2, gap: 0.9 }));
    }
    if (R() < 0.5) {
      const nx = d * 40 + 8 + R() * 22;
      const p = new Path2D(); p.rect(nx, -28 + R() * 6, 5, 5);
      smear(ctx, p, '#e8d870', 0.75, 0.55);
    }
  }
  shadowFoot(ctx, 0, w, 0);
}

function midSprite(f, it) {
  const F = OFFICE_FLOORS[f.floor];
  const src = F.mid.items[it.i];
  const seed = hash(7000 + it.i, f.stage);
  const K = it.kind;
  if (K === 'cubicles') return null;
  if (K === 'boardroom') return null;
  const w = src.w ?? 0;
  const BOXES = {
    plant: [-26, -80, 26, 4], reception: [-4, -52, w + 4, 4], turnstiles: [-4, -34, w + 4, 4],
    sofa: [-4, -32, w + 4, 4], sculpture: [-6, -70, 46, 4], cooler: [-3, -50, 18, 4], copier: [-4, -36, w + 6, 4],
    cabinet: [-2, -48, 22, 4], desk: [-6, -56, w + 6, 4], globe: [-2, -40, 22, 4], tallclock: [-3, -76, 24, 4],
  };
  const bx = BOXES[K];
  if (!bx) return null;
  return sprite(`mid:${f.floor}:${it.i}`, bx, (ctx) => paintMid(ctx, f, K, src, w, seed));
}

function paintMid(ctx, f, K, src, w, seed) {
  switch (K) {
    case 'plant':
      shadowFoot(ctx, -9, 9, 0);
      plant(ctx, f, src.variant, seed);
      break;
    case 'reception': {
      // the receptionist is drawn live; this is the desk in front of them, curved
      shadowFoot(ctx, 0, w, 0);
      const front = [0, 0, 0, -30, 6, -34, w - 6, -34, w, -30, w, 0];
      solid(ctx, seed, front, { base: '#8a6440', baseCover: 0.9, cols: ['#7a5636', '#946c46'], cover: 0.9, alpha: 0.7, len: 10, gap: 2.2, width: 1.4, ang: 1.5, angJ: 0.03, even: true, line: SEPIA, lw: 0.7, la: 0.6 });
      const curve = new Path2D(); wob(curve, arcPts(w / 2, -30, w / 2 - 2, 4, 0.1, Math.PI - 0.1, 16), seed + 9, 0.2);
      crayon(ctx, curve, '#c89a5c', 1, 0.55, 0.8);
      line(ctx, [2, -3, w - 2, -3], seed + 10, '#c8973a', 1.2, 0.7);
      solid(ctx, seed + 1, [-2, -32, 4, -36, w - 4, -36, w + 2, -32, w - 4, -30.5, 4, -30.5], { cols: ['#3a3430'], cover: 0.85, alpha: 1, len: 4, gap: 1.1, width: 1.1, ang: 0.15 });
      line(ctx, [4, -35.6, w - 4, -35.6], seed + 2, CREAM, 0.9, 0.6);
      const fl = new Path2D();
      for (let x = 14; x < w - 8; x += 18) { fl.moveTo(x, -27); fl.lineTo(x, -5); }
      crayon(ctx, fl, '#4a3020', 0.8, 0.5, 0.7);
      // a vase of lilies on the counter
      line(ctx, [w * 0.2, -36, w * 0.2 - 2, -46], seed + 11, '#4a6a3a', 0.8, 0.9);
      line(ctx, [w * 0.2, -36, w * 0.2 + 3, -45], seed + 12, '#4a6a3a', 0.8, 0.9);
      const fw = new Path2D(); fw.arc(w * 0.2 - 2, -47, 2, 0, TAU); fw.moveTo(w * 0.2 + 5, -45.5); fw.arc(w * 0.2 + 3, -45.5, 2, 0, TAU);
      smear(ctx, fw, '#f6ead4', 0.9);
      box(ctx, seed + 13, w * 0.2 - 2.5, -40, 5, 5, { base: '#3a5a6a', baseCover: 0.9 });
      // a gilt egg on the front
      const e = new Path2D(); e.ellipse(w / 2, -17, 4.5, 6, 0, 0, TAU);
      back(ctx, e); smear(ctx, e, GOLD, 0.8);
      line(ctx, [w / 2 - 3.5, -18, w / 2 - 1, -19.4, w / 2 + 1, -17.6, w / 2 + 3.5, -19], seed + 3, SEPIA, 0.7, 0.7);
      // the bell, and the monitor's back
      const bell = new Path2D(); bell.arc(w * 0.78, -36.5, 2.2, Math.PI, TAU); bell.closePath();
      smear(ctx, bell, GOLD, 0.9);
      break;
    }
    case 'turnstiles': {
      shadowFoot(ctx, 0, w, 0);
      for (let k = 0; k < 4; k++) {
        const px = 6 + k * (w - 12) / 3;
        box(ctx, hash(seed, k), px - 3, -26, 6, 26, o(['#8a8e92', '#94989c'], 0.9, { len: 4, gap: 1.1, line: '#3a3c40', lw: 0.6, la: 0.6, ang: 1.5 }));
        edge(ctx, hash(seed, k, 1), px - 1.8, -25, px - 1.8, -1, '#d8dcd8', 0.8, 0.4);
        const lamp = new Path2D(); lamp.rect(px - 1.5, -24, 3, 1.4);
        smear(ctx, lamp, '#8ae06a', 0.85, 0.7);
        if (k < 3) {
          const gl = new Path2D();
          gl.rect(px + 3, -22, (w - 12) / 3 - 6, 12);
          smear(ctx, gl, '#c8dce4', 0.5, 0.35);
          line(ctx, [px + 4, -12, px + 9, -21], hash(seed, k, 2), WHITE, 0.7, 0.5);
        }
      }
      break;
    }
    case 'sofa': {
      shadowFoot(ctx, 0, w, 0);
      const exec = f.floor === 'exec';
      const col = exec ? ['#6a2a22', '#742e26'] : ['#5f7e7c', '#678684'];
      solid(ctx, seed, [2, -6, 2, -24, 6, -26, w - 6, -26, w - 2, -24, w - 2, -6], o(col, 0.85, { len: 5, gap: 1.3, line: SEPIA, lw: 0.6, la: 0.5 }));
      solid(ctx, seed + 1, [0, -2, 0, -14, 6, -15, w - 6, -15, w, -14, w, -2], o(col, 0.9, { len: 5, gap: 1.2, line: SEPIA, lw: 0.6, la: 0.5, ang: 0.3 }));
      box(ctx, seed + 2, -2, -18, 6, 16, o(col, 0.95, { len: 3, gap: 1, line: SEPIA, lw: 0.6, la: 0.5 }));
      box(ctx, seed + 3, w - 4, -18, 6, 16, o(col, 0.95, { len: 3, gap: 1, line: SEPIA, lw: 0.6, la: 0.5 }));
      line(ctx, [6, -25, w - 6, -25], seed + 4, exec ? '#c87a62' : '#a8c8c0', 0.9, 0.5);
      if (exec) {
        const b = new Path2D();
        for (let x = 8; x < w - 6; x += 7) for (const y of [-21, -17]) { b.moveTo(x + 0.7, y); b.arc(x, y, 0.7, 0, TAU); }
        smear(ctx, b, '#2a0e0a', 0.8, 0.7);
      } else {
        line(ctx, [w / 2, -14, w / 2, -3], seed + 5, '#2e4444', 0.8, 0.5);
      }
      const legs = new Path2D(); legs.rect(3, -2, 2, 2); legs.rect(w - 5, -2, 2, 2);
      smear(ctx, legs, INK, 0.8);
      break;
    }
    case 'sculpture': {
      // an egg on a stand: what else would EGGCORP put in its lobby
      shadowFoot(ctx, 4, 36, 0);
      box(ctx, seed, 6, -22, 28, 22, o(['#2c2a28', '#34322e'], 0.9, { len: 5, gap: 1.2, line: INK, lw: 0.6, ang: 1.45 }));
      edge(ctx, seed + 1, 7, -21, 7, -1, '#8a8478', 0.9, 0.6);
      line(ctx, [6, -21.5, 34, -21.5], seed + 2, '#a8a294', 0.9, 0.6);
      const egg = [...arcPts(20, -42, 12, 14, 0, Math.PI, 12), ...arcPts(20, -42, 12, 18, Math.PI, TAU, 14).slice(2)];
      solid(ctx, seed + 3, egg, o([GOLD, '#c89a3a', '#b8862a'], 0.95, { len: 5, gap: 1.1, ang: 1.0, line: '#5a3a10', lw: 0.7, la: 0.6 }));
      const hl = new Path2D(); wob(hl, arcPts(20, -42, 9, 13, Math.PI * 1.1, Math.PI * 1.45, 8), seed + 4, 0.2);
      crayon(ctx, hl, '#fde9a8', 1.6, 0.85, 0.8);
      line(ctx, [17, -27.6, 23, -27.6], seed + 5, '#5a3a10', 0.7, 0.6);
      break;
    }
    case 'cooler': {
      shadowFoot(ctx, 0, 14, 0);
      box(ctx, seed, 1, -30, 12, 30, o(['#d8d6cc', '#cfcdc2'], 0.85, { len: 4, gap: 1.2, line: '#5a5a54', lw: 0.6, la: 0.6, ang: 1.5 }));
      const tap = new Path2D(); tap.rect(4, -24, 2, 2); tap.rect(8, -24, 2, 2);
      smear(ctx, tap, '#2c5d9e', 0.8); smear(ctx, (() => { const p = new Path2D(); p.rect(8, -24, 2, 2); return p; })(), RED, 0.8);
      const bottle = [3, -30, 2.4, -38, 3.6, -43, 10.4, -43, 11.6, -38, 11, -30];
      solid(ctx, seed + 1, bottle, o(['#8ab8d8', '#9cc4e0'], 0.85, { len: 3, gap: 1, line: '#3a5a7a', lw: 0.6, la: 0.6, ang: 1.4 }));
      edge(ctx, seed + 2, 4.5, -41, 4, -32, WHITE, 0.9, 0.7);
      break;
    }
    case 'copier': {
      shadowFoot(ctx, 0, w, 0);
      box(ctx, seed, 0, -26, w, 26, o(['#9a9a92', '#a4a49c'], 0.8, { len: 5, gap: 1.3, line: '#3a3a36', lw: 0.6, la: 0.6, ang: 1.45 }));
      box(ctx, seed + 1, -1, -30, w + 2, 4, o(['#6a6a64'], 0.9, { len: 3, gap: 1, line: '#3a3a36', lw: 0.5, la: 0.6, ang: 0.2 }));
      box(ctx, seed + 2, w - 2, -20, 5, 3, o(['#d8d4c4'], 0.85, { len: 2, gap: 1 }));
      const panel = new Path2D(); panel.rect(4, -24, 10, 4);
      smear(ctx, panel, '#3a3c40', 0.85);
      const led = new Path2D(); led.rect(5, -23, 2, 1.2);
      smear(ctx, led, '#8ae06a', 0.9);
      const dr = new Path2D();
      for (const y of [-16, -9]) { dr.moveTo(3, y); dr.lineTo(w - 3, y); }
      crayon(ctx, dr, '#4a4a46', 0.8, 0.55, 0.6);
      break;
    }
    case 'cabinet': {
      shadowFoot(ctx, 0, 20, 0);
      box(ctx, seed, 0, -44, 20, 44, o(['#7e8a7c', '#889484'], 0.82, { len: 5, gap: 1.3, line: '#2e3a2e', lw: 0.6, la: 0.6, ang: 1.5 }));
      const dr = new Path2D();
      const hd = new Path2D();
      for (let k = 1; k < 4; k++) { dr.moveTo(1, -44 + k * 11); dr.lineTo(19, -44 + k * 11); }
      for (let k = 0; k < 4; k++) { hd.rect(7, -44 + k * 11 + 3, 6, 1.4); }
      crayon(ctx, dr, '#2e3a2e', 0.8, 0.6, 0.6);
      smear(ctx, hd, '#d8dcc8', 0.85, 0.75);
      edge(ctx, seed + 1, 1.2, -43, 1.2, -1, '#c8d0bc', 0.8, 0.45);
      break;
    }
    case 'desk': {
      shadowFoot(ctx, 0, w, 0);
      // the high-back leather chair behind
      const cx = w * 0.5;
      solid(ctx, seed, [cx - 11, -26, cx - 12, -48, cx - 8, -53, cx + 8, -53, cx + 12, -48, cx + 11, -26], o(['#2a1a14', '#341f18'], 0.95, { len: 4, gap: 1.1, line: INK, lw: 0.6 }));
      const btn = new Path2D();
      for (let x = cx - 7; x <= cx + 7; x += 4.6) for (const y of [-46, -40, -34]) { btn.moveTo(x + 0.6, y); btn.arc(x, y, 0.6, 0, TAU); }
      smear(ctx, btn, '#7a5040', 0.8, 0.8);
      edge(ctx, seed + 1, cx - 10, -50, cx - 10.5, -30, '#8a6050', 0.9, 0.6);
      // the desk: walnut with a leather top, a modesty panel
      solid(ctx, seed + 2, [0, 0, 0, -26, w, -26, w, 0], o(['#5a3220', '#643824'], 0.9, { len: 7, gap: 1.3, ang: 1.5, line: INK, lw: 0.7 }));
      box(ctx, seed + 3, -3, -30, w + 6, 4, o(['#3e2216'], 0.95, { len: 4, gap: 1.1, ang: 0.15 }));
      line(ctx, [-2, -29.6, w + 2, -29.6], seed + 4, '#d0965a', 0.9, 0.7);
      const pn = new Path2D();
      pn.rect(6, -22, w * 0.35, 18); pn.rect(w - 6 - w * 0.35, -22, w * 0.35, 18);
      crayon(ctx, pn, '#2a160c', 1, 0.7, 0.7);
      // the banker's lamp: a green glass shade and a warm glow round it
      const lx = w * 0.18;
      const glow = new Path2D();
      glow.ellipse(lx, -34, 16, 9, 0, 0, TAU);
      smear(ctx, glow, '#f6c56a', 0.5, 0.35);
      line(ctx, [lx, -30, lx, -38], seed + 5, GOLD, 1.1, 1);
      solid(ctx, seed + 6, [lx - 7, -37, lx - 5, -41, lx + 5, -41, lx + 7, -37], { cols: ['#2e8a4a', '#36985a'], cover: 0.95, alpha: 1, len: 3, gap: 0.9, width: 1, line: '#123a1c', lw: 0.6 });
      line(ctx, [lx - 5, -40.4, lx + 4, -40.4], seed + 7, '#b8f0a0', 0.7, 0.8);
      line(ctx, [lx - 6, -36.6, lx + 6, -36.6], seed + 8, '#ffe6a0', 1.1, 1);
      // papers and a pen set
      const pp = new Path2D(); pp.rect(w * 0.55, -31.5, 12, 1.6);
      smear(ctx, pp, '#e8e0c8', 0.85, 0.7);
      break;
    }
    case 'globe': {
      shadowFoot(ctx, 1, 17, 0);
      line(ctx, [4, 0, 9, -12, 14, 0], seed, '#4a2a18', 1.4, 0.9);
      line(ctx, [9, -12, 9, -16], seed + 1, '#4a2a18', 1.6, 0.9);
      solid(ctx, seed + 2, ellPts(9, -25, 8, 8, 18), o(['#4e8aa0', '#5894a8'], 0.9, { len: 3, gap: 1, line: '#1e3a4a', lw: 0.6, ang: 1.2 }));
      const land = new Path2D();
      land.moveTo(5, -29); land.quadraticCurveTo(8, -32, 10, -28); land.quadraticCurveTo(9, -24, 6, -25); land.closePath();
      land.moveTo(10, -22); land.quadraticCurveTo(14, -24, 14, -20); land.quadraticCurveTo(12, -18, 10, -22);
      smear(ctx, land, '#d8c890', 0.85);
      const ring = new Path2D(); wob(ring, arcPts(9, -25, 10, 10, Math.PI * 0.7, Math.PI * 2.3, 16), seed + 3, 0.1);
      crayon(ctx, ring, GOLD, 1, 0.9, 0.85);
      edge(ctx, seed + 4, 4.5, -29, 5.5, -22, WHITE, 0.9, 0.5);
      break;
    }
    case 'tallclock': {
      shadowFoot(ctx, 0, 20, 0);
      solid(ctx, seed, [1, 0, 1, -50, 3, -54, 3, -64, 0, -66, 10, -72, 20, -66, 17, -64, 17, -54, 19, -50, 19, 0], o(['#4a2414', '#562a18'], 0.92, { len: 6, gap: 1.2, ang: 1.5, line: INK, lw: 0.7 }));
      const face = new Path2D(); face.arc(10, -59, 5.2, 0, TAU);
      back(ctx, face); smear(ctx, face, '#f2e8cc', 0.92);
      crayon(ctx, face, GOLD, 0.9, 1, 0.85);
      const hands = new Path2D(); hands.moveTo(10, -59); hands.lineTo(10, -62.5); hands.moveTo(10, -59); hands.lineTo(12.6, -58);
      crayon(ctx, hands, INK, 0.7, 1, 0.9);
      // the case door's glass, behind which the pendulum swings (drawn live)
      box(ctx, seed + 1, 5, -48, 10, 34, { cols: ['#2a140a'], cover: 0.9, alpha: 1, len: 4, gap: 1, width: 1, line: GOLD, lw: 0.6, la: 0.7 });
      edge(ctx, seed + 2, 2, -50, 2, -2, '#c08a5a', 0.8, 0.6);
      break;
    }
    default: break;
  }
}

function boardroomSprites(f, it) {
  const F = OFFICE_FLOORS[f.floor];
  const src = F.mid.items[it.i];
  const seed = hash(7700 + it.i, f.stage);
  const w = src.u1 - src.u;
  const pitch = w / src.seats;
  const back = sprite(`board:back:${it.i}`, [-4, -50, w + 4, 2], (ctx) => {
    for (let s = 0; s < src.seats; s++) {
      const cx = pitch * (s + 0.5);
      solid(ctx, hash(seed, s), [cx - 7, -14, cx - 8, -42, cx - 5, -46, cx + 5, -46, cx + 8, -42, cx + 7, -14], o(['#2a1a14', '#331f18'], 0.92, { len: 4, gap: 1.1, line: INK, lw: 0.6 }));
      edge(ctx, hash(seed, s, 1), cx - 6.4, -42, cx - 6.4, -18, '#8a6050', 0.9, 0.55);
    }
  });
  const front = sprite(`board:front:${it.i}`, [-6, -62, w + 40, 4], (ctx) => {
    shadowFoot(ctx, 0, w, 0);
    // the table: a long walnut top, thick, with a pale edge and two pedestals
    box(ctx, seed + 1, 6, -21, 10, 21, o(['#3e2216'], 0.92, { len: 4, gap: 1.1, line: INK, lw: 0.6 }));
    box(ctx, seed + 2, w - 16, -21, 10, 21, o(['#3e2216'], 0.92, { len: 4, gap: 1.1, line: INK, lw: 0.6 }));
    solid(ctx, seed + 3, [-3, -21, -3, -26, w + 3, -26, w + 3, -21], o(['#5a3220', '#643824'], 0.95, { len: 8, gap: 1.2, ang: 0.12, angJ: 0.03, line: INK, lw: 0.7 }));
    line(ctx, [-2, -25.6, w + 2, -25.6], seed + 4, '#d6a060', 1, 0.75);
    // papers, water glasses and a carafe down the table
    const R = rng(seed + 5);
    const pp = new Path2D();
    const gl = new Path2D();
    for (let s = 0; s < src.seats; s++) {
      const cx = pitch * (s + 0.5);
      pp.rect(cx - 4 + (R() - 0.5) * 2, -27, 7, 1.2);
      gl.rect(cx + 5, -30, 2, 3);
    }
    smear(ctx, pp, '#efe6cc', 0.85, 0.75);
    smear(ctx, gl, '#d8eef4', 0.7, 0.6);
    // the flip chart: the line falls, then rises (after the meeting)
    if (src.easel) {
      const ex = w + 8;
      line(ctx, [ex + 2, 0, ex + 12, -50], seed + 6, '#4a3020', 1.1, 0.9);
      line(ctx, [ex + 22, 0, ex + 12, -50], seed + 7, '#4a3020', 1.1, 0.9);
      line(ctx, [ex + 12, -40, ex + 14, 0], seed + 8, '#4a3020', 1, 0.8);
      box(ctx, seed + 9, ex, -54, 24, 30, o(['#ede6d2', '#e6dfca'], 1.1, { len: 6, gap: 1.3, ang: 0.4, line: '#6a6050', lw: 0.6 }));
      line(ctx, [ex + 3, -48, ex + 10, -36, ex + 15, -32, ex + 21, -46], seed + 10, RED, 1.2, 0.95);
      line(ctx, [ex + 18.5, -46.5, ex + 21.5, -47, ex + 21.5, -43.5], seed + 11, RED, 1.1, 0.95);
      line(ctx, [ex + 3, -29, ex + 21, -29], seed + 12, '#3a3a40', 0.7, 0.7);
    }
  });
  return { back, front, pitch };
}

function midLive(ctx, f) {
  for (const m of f.mid.items) {
    const b = m.base;
    if (m.kind === 'cubicles') {
      const F = OFFICE_FLOORS[f.floor];
      const src = F.mid.items[m.i];
      const seed = hash(7300 + m.i, f.stage);
      blit(ctx, sprite(`cub:back:${f.floor}:${m.i}`, [-2, -48, m.x1 - m.x0 + 2, 0], (x) => cubicleBack(x, src, seed)), m.x0, b);
      for (const d of m.desks) {
        if (!d.occupied) continue;
        const sp = sprite(`head:${d.seed}:${d.look}`, [-10, -7, 10, 18], (x) => person(x, hash(7400, d.seed), d.look));
        blit(ctx, sp, d.x + 20, b - 34 - 7 + d.dy - d.pop * 12);
      }
      blit(ctx, sprite(`cub:front:${f.floor}:${m.i}`, [-2, -42, m.x1 - m.x0 + 2, 4], (x) => cubicleFront(x, src, seed)), m.x0, b);
      continue;
    }
    if (m.kind === 'boardroom') {
      const S2 = boardroomSprites(f, m);
      blit(ctx, S2.back, m.x0, b);
      for (const c of m.chairs) {
        if (!c.sitter) continue;
        const sp = sprite(`sitter:${c.seed}`, [-10, -7, 10, 18], (x) => person(x, hash(7500, c.seed), 0, true, ['#26283a', '#3a2a2a', '#2a3a34', '#4a4a50'][c.seed % 4]));
        blit(ctx, sp, c.x, b - 38 + c.nod * 4);
      }
      blit(ctx, S2.front, m.x0, b);
      continue;
    }
    if (m.kind === 'reception') {
      const sp = sprite('receptionist', [-10, -7, 10, 18], (x) => person(x, 7600, 1, true, '#7a5a8a'));
      blit(ctx, sp, m.x + m.w * 0.42, b - 42 + m.dy);
      blit(ctx, sprite('recmon', [-8, -10, 8, 1], (x) => {
        box(x, 7601, -7, -9, 14, 9, o(['#3a3c42'], 0.95, { len: 3, gap: 1, line: INK, lw: 0.5 }));
        line(x, [0, 0, 0, 1], 7602, '#3a3c42', 1.5, 1);
      }), m.x + m.w * 0.62, b - 36);
    }
    const sp = midSprite(f, m);
    if (sp) blit(ctx, sp, m.kind === 'plant' ? m.x + (PLANT_W[m.variant] || 30) / 2 : m.x, b);
    if (m.kind === 'cooler' && m.bubble >= 0) local(ctx, m.x, b, () => {
      const p = new Path2D();
      const by = -32 - m.bubble * 9;
      p.arc(7 + Math.sin(m.bubble * 9) * 0.8, by, 1 + m.bubble * 0.6, 0, TAU);
      crayon(ctx, p, WHITE, 0.8, 0.9 * (1 - m.bubble * 0.4), 0.8);
    });
    if (m.kind === 'copier' && m.scan >= 0) local(ctx, m.x, b, () => {
      const p = new Path2D();
      const sx = 2 + m.scan * (m.w - 6);
      p.rect(sx, -28, 2.4, 1.6);
      smear(ctx, p, '#9ff0d8', 0.95);
      const g = new Path2D(); g.ellipse(sx + 1.2, -27.5, 5, 2, 0, 0, TAU);
      smear(ctx, g, '#9ff0d8', 0.55, 0.45);
    });
    if (m.kind === 'tallclock') local(ctx, m.x, b, () => {
      const px = 10;
      const py = -46;
      const ex = px + m.swing * 3.2;
      const p = new Path2D(); p.moveTo(px, py); p.lineTo(ex, py + 24);
      crayon(ctx, p, GOLD, 0.8, 1, 0.85);
      const d = new Path2D(); d.arc(ex, py + 25.5, 2.4, 0, TAU);
      smear(ctx, d, GOLD, 0.95);
      const hl = new Path2D(); hl.arc(ex - 0.7, py + 24.8, 0.8, 0, TAU);
      smear(ctx, hl, '#fff0b0', 0.9);
    });
  }
}

// ------------------------------------------------------------------ the front pass
// Close to camera and out of focus: dark crayon laid loosely, so the paper and the run show
// through the gaps in the hatch.
function frontSprite(f, kind, w) {
  return sprite(`front:${f.floor}:${kind}:${w}`, kind === 'pillar' ? [-4, 0, w + 4, 270] : [-46, 200, 46, 272], (ctx) => {
    const seed = hash(9000, kind.length, w);
    const dark = f.floor === 'exec' ? ['#1e120c', '#2a1810'] : f.floor === 'open' ? ['#2a2e34', '#343840'] : ['#2a2620', '#34302a'];
    if (kind === 'pillar') {
      // a column right by the lens: one dark mass laid on solid, its edges left soft and
      // stroky, a thread of window light down the side that faces the glass
      const p = new Path2D(); p.rect(1.5, 0, w - 3, 270);
      smear(ctx, p, dark[0], 0.96);
      fillHatch(ctx, p, { cols: dark, cover: 0.92, alpha: 0.9, len: 22, gap: 2.2, width: 2, ang: 1.53, angJ: 0.02, even: true }, seed, 0, 0);
      const fe = new Path2D();
      const R = rng(seed + 5);
      for (let y = 0; y < 270; y += 5) {
        fe.moveTo(-0.5 + R(), y); fe.lineTo(-0.5 + R(), y + 8 + R() * 6);
        fe.moveTo(w + 0.5 - R(), y); fe.lineTo(w + 0.5 - R(), y + 8 + R() * 6);
      }
      crayon(ctx, fe, dark[1], 2, 0.6, 0.8);
      edge(ctx, seed + 1, 4, 0, 4, 270, f.floor === 'exec' ? '#d09450' : f.floor === 'open' ? '#a8b4bc' : '#d8c08a', 1.3, 0.55, 0.75);
      return;
    }
    if (kind === 'plant') {
      // broad leaves rising out of frame, dark and soft, a rim of light on their edges
      const R = rng(seed);
      const rim = new Path2D();
      for (let k = 0; k < 7; k++) {
        const a = -Math.PI / 2 + (k - 3) * 0.34 + (R() - 0.5) * 0.12;
        const L = 26 + R() * 14;
        const sx = (k - 3) * 4;
        const sy = 274;
        const tx = sx + Math.cos(a) * L;
        const ty = sy + Math.sin(a) * L * 0.9;
        const nx = -Math.sin(a);
        const ny = Math.cos(a) * 0.9;
        const wd = 5 + R() * 3;
        const mx = (sx + tx) / 2;
        const my = (sy + ty) / 2;
        const leaf = [sx, sy, mx + nx * wd, my + ny * wd, tx, ty, mx - nx * wd, my - ny * wd];
        const pts = [];
        for (let q = 0; q < 4; q++) quadInto(pts, leaf, q);
        solid(ctx, seed + k, pts, { noBack: true, base: '#22402a', baseCover: 0.9, cols: ['#2c4e32', '#1a3020'], cover: 0.85, alpha: 0.8, len: 6, gap: 1.6, width: 1.6, ang: a + Math.PI / 2 + 0.6, patch: 3 });
        wob(rim, [mx - nx * wd * 0.9, my - ny * wd * 0.9, tx, ty], hash(seed, k, 3), 0.3);
        const rib = new Path2D(); wob(rib, [sx, sy, tx, ty], hash(seed, k, 4), 0.2);
        crayon(ctx, rib, '#4a7048', 0.7, 0.7, 0.75);
      }
      crayon(ctx, rim, f.floor === 'exec' ? '#d8a860' : '#9cc08a', 1.2, 0.85, 0.75);
      return;
    }
    // a chair or armchair back rising from the bottom edge
    const arm = kind === 'armchair';
    const top = arm ? 236 : 240;
    const shape = arm
      ? [-34, 272, -34, top + 10, -30, top + 3, -20, top, 20, top, 30, top + 3, 34, top + 10, 34, 272]
      : [-26, 272, -26, top + 6, -21, top, 21, top, 26, top + 6, 26, 272];
    const body = arm ? '#4e1c16' : '#2e3844';
    solid(ctx, seed, shape, { base: body, baseCover: 0.92, cols: arm ? ['#5e241c', '#3e140e'] : ['#3a4652', '#222a34'], cover: 0.88, alpha: 0.75, len: 10, gap: 2, width: 1.8, ang: 1.3, even: true });
    if (arm) {
      const b = new Path2D();
      for (let x = -24; x <= 24; x += 8) for (const y of [top + 9, top + 18, top + 27]) { b.moveTo(x + 1, y); b.arc(x, y, 1, 0, TAU); }
      smear(ctx, b, '#1e0806', 0.85, 0.8);
    } else {
      line(ctx, [-18, top + 12, 18, top + 12], seed + 3, '#1a2028', 1.2, 0.6);
    }
    const rim = new Path2D();
    wob(rim, arm ? [-31, top + 4, -20, top + 0.8, 20, top + 0.8, 31, top + 4] : [-22, top + 0.8, 22, top + 0.8], seed + 2, 0.2);
    crayon(ctx, rim, arm ? '#e0a860' : '#a8b8c8', 1.4, 0.85, 0.8);
  });
}

// ------------------------------------------------------------------ paint
function ensure(f) {
  let FB = S.floors[f.floor];
  if (!FB) {
    FB = {};
    S.floors[f.floor] = FB;
    FB.sky = bakeSky(f);
    FB.far = bakeCity(f, 'far');
    FB.near = bakeCity(f, 'near');
    FB.wall = bakeWall(f);
    FB.ceil = bakeCeiling(f);
    FB.floor = bakeFloor(f);
    FB.slab = bakeSlab(f);
  }
  return FB;
}

export const STYLE = {
  id: 'crayon',
  name: 'WAX CRAYON — on kraft paper',
  note: 'Wax crayon and oil pastel on brown kraft, worked like an illustrator\'s sketch on toned stock: the kraft carries the middle values, darks go in black and sepia, light goes on in heavy cream strokes, and the paper grain shows wherever the wax skips. '
    + 'Surfaces are blocked in with the side of the crayon and hatched only where shade falls; far towers are a few pale strokes, near things are pressed hard, and the floor is laid in true perspective. '
    + 'The view does the colour: a hazy cream morning street through the lobby glass, hard noon over the rooftops at floor 23, a violet-to-amber dusk with the city lighting up below the boardroom. '
    + 'The band behind the lane is drawn with the lightest hand in the card, so the hazards sit on calm paper.',
  paint(ctx, f) {
    prepare(ctx);
    const FB = ensure(f);
    ctx.save();
    ctx.globalAlpha = 1;
    // the whole sheet first, so nothing shows through anywhere
    ctx.fillStyle = paper(ctx);
    ctx.fillRect(0, 0, f.W, f.H);
    outside(ctx, f);
    blitStrip(ctx, FB.wall, f.wall.shift);
    for (const h of f.wall.hangs) {
      if (h.kind === 'lift') liftLive(ctx, f, h);
      else if (h.kind === 'clock') local(ctx, h.cx, h.cy, () => clockHands(ctx, f, 0, 0, h.r));
      else if (h.kind === 'door' && h.label === 'MEETING 4B') local(ctx, h.x, h.y, () => inUseLight(ctx, { ...h, x: 0, y: 0 }, f.t));
    }
    for (const b of f.wall.bays) if (b.revolvingDoor != null) local(ctx, b.revolvingDoor, 0, () => revolvingWings(ctx, f, 0));
    blitStrip(ctx, FB.ceil, ceilShift(f));
    lightsLive(ctx, f);
    drawFloor(ctx, f);
    floorReflections(ctx, f);
    if (f.floor === 'lobby') sunbeams(ctx, f);
    if (f.floor === 'open') tubeGlow(ctx, f);
    blitStrip(ctx, FB.slab, f.slab.shift);
    midLive(ctx, f);
    ctx.restore();
  },
  paintFront(ctx, f) {
    prepare(ctx);
    ctx.save();
    for (const it of f.front) {
      const kind = it.kind === 'pillar' ? 'pillar' : it.kind === 'plant' ? 'plant' : it.kind;
      const sp = frontSprite(f, kind, it.w || 60);
      blit(ctx, sp, it.x, 0, kind === 'pillar' ? 0.66 : 0.92);
    }
    ctx.restore();
  },
};

function ceilShift(f) {
  if (!f.lights.length) return 0;
  const L = OFFICE_FLOORS[f.floor].lights;
  const l = f.lights[0];
  return (((L.us[l.i] - l.x) % L.period) + L.period) % L.period;
}

function revolvingWings(ctx, f, cx) {
  const G = f.glass;
  const y0 = G.transom + 7;
  const y1 = G.bottom - 1;
  const panes = new Path2D();
  const stiles = new Path2D();
  const backs = new Path2D();
  for (let k = 0; k < 4; k++) {
    const a = (f.revolving + k / 4) * TAU;
    const sx = cx + Math.sin(a) * 22;
    const nearSide = Math.cos(a) > 0;
    (nearSide ? stiles : backs).moveTo(sx, y0); (nearSide ? stiles : backs).lineTo(sx, y1);
    panes.moveTo(cx, y0 + 2); panes.lineTo(sx, y0 + 2); panes.lineTo(sx, y1 - 2); panes.lineTo(cx, y1 - 2); panes.closePath();
  }
  smear(ctx, panes, '#d8e4e8', 0.45, 0.18);
  crayon(ctx, backs, '#4a3a2a', 1, 0.5, 0.7);
  crayon(ctx, stiles, '#2c2218', 1.6, 0.95, 0.85);
  const post = new Path2D(); post.moveTo(cx, y0); post.lineTo(cx, y1);
  crayon(ctx, post, '#2c2218', 1.8, 1, 0.85);
}
