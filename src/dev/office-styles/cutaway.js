// CORPORATE KOMBAT style bake-off — BUSYTOWN CUTAWAY. Richard Scarry's "What Do People Do
// All Day?" crossed with the cross-section books: the tower is shown SLICED OPEN. A warm
// brown-black ink line with a slight hand wobble, transparent watercolour washes that pool
// darker at their edges and bloom inside, over cream paper with a tooth; everything a
// little rounded and friendly, small hand-lettered labels in a stroke alphabet of its own.
//
// The cutaway is the idea. The slab under the lane is the cut concrete floor with the
// storey BELOW showing beneath it (its lamps, the tops of its desks, the tops of its
// workers' heads), scrolling with the lane; the ceiling band is the slab above with the
// feet and furniture legs of the storey ABOVE standing on it. The busy-ness lives in those
// two slices and outside the glass (traffic, a bus full of passengers, pedestrians and
// pigeons on the far pavement, a window cleaner, a blimp); the band right behind the lane
// (furniture and the floor plane) is painted lower in contrast with a lighter line.
//
// Everything still is baked once per device scale: each outside layer, the back wall and
// the cut slab as seamless strips one period long in their own u (tiled at 2048 device
// px), each piece of furniture as a sprite, and the floor plane as one pre-filtered pattern
// row per device row, so its joints shear in true perspective and never shimmer. What the
// plan animates is drawn live on top: lift doors, clock hands, the revolving door, heads,
// the cooler glug, the copier scan, the flicker, the pendulum, cars, walkers and flyers.
import { FRAME_W, FRAME_H, OFFICE_FLOORS, WALL_BASE, MID_BASE, LANE_TOP } from './plan.js';

const TAU = Math.PI * 2;
const W = FRAME_W;
const H = FRAME_H;
const WALL_P = 1440;
const MID_P = 1200;
const SLAB_P = 960;
const FLOOR_P = 512;
const TILE_DEV = 2048;
const LW = 0.75;

// ------------------------------------------------------------------ utilities
function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function rng(seed) {
  let a = (Math.floor(seed * 9301 + 49297) * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const mod = (a, n) => ((a % n) + n) % n;
const HEX = new Map();
function hex(h) {
  if (typeof h !== 'string') return h;
  let c = HEX.get(h);
  if (!c) {
    const n = parseInt(h.slice(1), 16);
    c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    HEX.set(h, c);
  }
  return c;
}
const mix = (a, b, t) => {
  a = hex(a); b = hex(b);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
};
const shade = (c, t) => (t > 0 ? mix(c, [255, 252, 244], t) : mix(c, [40, 24, 16], -t));
function css(c, a = 1) {
  c = hex(c);
  return a >= 1
    ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`
    : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0, a).toFixed(3)})`;
}

function vnoise(x, seed) {
  const i = Math.floor(x);
  const f = x - i;
  const s = f * f * (3 - 2 * f);
  const a = hash(i * 1.37 + seed * 57.31);
  const b = hash((i + 1) * 1.37 + seed * 57.31);
  return (a + (b - a) * s) * 2 - 1;
}

// Wraps every P, for anything laid along a strip.
function pnoise(u, scale, P, seed) {
  const n = Math.max(1, Math.round(P / scale));
  const x = (u / P) * n;
  const i = Math.floor(x);
  const f = x - i;
  const s = f * f * (3 - 2 * f);
  const i0 = ((i % n) + n) % n;
  const i1 = (i0 + 1) % n;
  const a = hash(i0 * 1.37 + seed * 57.31);
  const b = hash(i1 * 1.37 + seed * 57.31);
  return (a + (b - a) * s) * 2 - 1;
}

function canvas(w, h) {
  w = Math.max(1, Math.ceil(w));
  h = Math.max(1, Math.ceil(h));
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// ------------------------------------------------------------------ shapes
function rectPts(x, y, w, h) { return [x, y, x + w, y, x + w, y + h, x, y + h]; }

function rrPts(x, y, w, h, r, n = 3) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  if (r < 0.05) return rectPts(x, y, w, h);
  const out = [];
  const corner = (cx, cy, a0) => {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * (Math.PI / 2);
      out.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
  };
  corner(x + w - r, y + r, -Math.PI / 2);
  corner(x + w - r, y + h - r, 0);
  corner(x + r, y + h - r, Math.PI / 2);
  corner(x + r, y + r, Math.PI);
  return out;
}

function elPts(cx, cy, rx, ry, n = 0, a0 = 0, a1 = TAU) {
  n = n || Math.max(8, Math.round((rx + ry) * 1.3));
  const out = [];
  const full = Math.abs(a1 - a0 - TAU) < 1e-6;
  const m = full ? n : n + 1;
  for (let i = 0; i < m; i++) {
    const a = a0 + (a1 - a0) * (i / n);
    out.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
  }
  return out;
}

// An egg standing on end, narrow at the top.
function eggPts(cx, cy, rx, ry, n = 28) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const y = Math.sin(a);
    const k = y < 0 ? 0.78 + 0.22 * (1 + y) : 1;
    out.push(cx + Math.cos(a) * rx * k, cy + y * ry);
  }
  return out;
}

// A polyline redrawn with a hand's wobble along its normals.
function wob(pts, closed, amp, seed, step = 2.6) {
  if (!amp) return pts.slice();
  const out = [];
  const n = pts.length / 2;
  const edges = closed ? n : n - 1;
  let acc = 0;
  let nx = 0;
  let ny = 0;
  for (let i = 0; i < edges; i++) {
    const x0 = pts[2 * i];
    const y0 = pts[2 * i + 1];
    const j = (i + 1) % n;
    const x1 = pts[2 * j];
    const y1 = pts[2 * j + 1];
    const len = Math.hypot(x1 - x0, y1 - y0) || 1e-4;
    const segs = Math.max(1, Math.ceil(len / step));
    nx = -(y1 - y0) / len;
    ny = (x1 - x0) / len;
    for (let s = 0; s < segs; s++) {
      const t = s / segs;
      const a = acc + t * len;
      const d = (vnoise(a / 4.6, seed) + 0.35 * vnoise(a / 1.7, seed + 5)) * amp;
      out.push(x0 + (x1 - x0) * t + nx * d, y0 + (y1 - y0) * t + ny * d);
    }
    acc += len;
  }
  if (!closed) {
    const d = (vnoise(acc / 4.6, seed) + 0.35 * vnoise(acc / 1.7, seed + 5)) * amp;
    out.push(pts[pts.length - 2] + nx * d, pts[pts.length - 1] + ny * d);
  }
  return out;
}

function trace(g, pts, closed) {
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  if (closed) g.closePath();
}

function bbox(pts) {
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (let i = 0; i < pts.length; i += 2) {
    if (pts[i] < x0) x0 = pts[i];
    if (pts[i] > x1) x1 = pts[i];
    if (pts[i + 1] < y0) y0 = pts[i + 1];
    if (pts[i + 1] > y1) y1 = pts[i + 1];
  }
  return [x0, y0, x1, y1];
}

// ------------------------------------------------------------------ the brush and the pen
const INK = hex('#3b2a1e');

// A transparent wash: the colour laid in, a few wet blooms inside it, and the pigment
// pooled darker along its edge where the puddle dried.
function wash(g, pts, c, o = {}) {
  c = hex(c);
  const R = rng((o.seed ?? 1) * 7 + 3);
  const [x0, y0, x1, y1] = bbox(pts);
  g.save();
  g.beginPath();
  trace(g, pts, true);
  g.clip();
  const a = o.a ?? 0.95;
  if (o.grad) {
    const gr = g.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, css(shade(c, o.grad[0]), a));
    gr.addColorStop(1, css(shade(c, o.grad[1]), a));
    g.fillStyle = gr;
  } else g.fillStyle = css(c, a);
  g.fillRect(x0 - 1, y0 - 1, x1 - x0 + 2, y1 - y0 + 2);
  const big = Math.max(x1 - x0, y1 - y0);
  const nb = o.blooms ?? Math.min(6, Math.round(((x1 - x0) * (y1 - y0)) / 300));
  for (let i = 0; i < nb; i++) {
    const bx = x0 + R() * (x1 - x0);
    const by = y0 + R() * (y1 - y0);
    const br = big * (0.18 + R() * 0.32) + 1.5;
    const t = R() < 0.55 ? shade(c, 0.1 + R() * 0.12) : shade(c, -0.07 - R() * 0.08);
    const gr = g.createRadialGradient(bx, by, 0, bx, by, br);
    gr.addColorStop(0, css(t, 0.55 * (o.bloomA ?? 1)));
    gr.addColorStop(1, css(t, 0));
    g.fillStyle = gr;
    g.fillRect(bx - br, by - br, br * 2, br * 2);
  }
  const e = o.edge ?? 2.2;
  if (e > 0) {
    g.beginPath();
    trace(g, pts, true);
    g.lineJoin = 'round';
    g.strokeStyle = css(shade(c, -0.3), 0.26 * (o.edgeA ?? 1));
    g.lineWidth = e;
    g.stroke();
    g.strokeStyle = css(shade(c, -0.42), 0.36 * (o.edgeA ?? 1));
    g.lineWidth = Math.min(0.9, e * 0.45);
    g.stroke();
  }
  g.restore();
}

// Every pen line is drawn this much heavier than its nominal width: Scarry's line is a
// confident one, and at the card's 2x the nominal widths read as pencil.
const INK_W = 1.25;
function ink(g, pts, closed = true, w = LW, a = 0.9, c = INK) {
  g.beginPath();
  trace(g, pts, closed);
  g.lineWidth = w * INK_W;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.strokeStyle = css(c, a);
  g.stroke();
}

// Wash plus line, the colour a hair off its line the way a quick hand lays it in.
function paint(g, pts, c, o = {}) {
  const seed = o.seed ?? 1;
  const wa = o.wa ?? 0.3;
  const wp = wob(pts, true, wa, seed + 11, o.step);
  const m = o.mis ?? 0.3;
  if (m) for (let i = 0; i < wp.length; i += 2) { wp[i] += m * 0.7; wp[i + 1] += m * 0.45; }
  wash(g, wp, c, o);
  if (o.line !== false) ink(g, wob(pts, true, o.la ?? 0.25, seed + 23, o.step), true, o.w ?? LW, o.ia ?? 0.9, o.ic ?? INK);
}

function line(g, x0, y0, x1, y1, w = LW, a = 0.9, seed = 1, c = INK) {
  ink(g, wob([x0, y0, x1, y1], false, 0.22, seed, 3), false, w, a, c);
}

function poly(g, pts, w = LW, a = 0.9, seed = 1, c = INK, amp = 0.2) {
  ink(g, wob(pts, false, amp, seed, 3), false, w, a, c);
}

function dot(g, x, y, r, c, a = 1) {
  g.fillStyle = css(c, a);
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}

function glow(g, x, y, r, c, a) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, css(c, a));
  gr.addColorStop(1, css(c, 0));
  g.fillStyle = gr;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

// ------------------------------------------------------------------ hand lettering
// A single-stroke alphabet on a 4 x 6 grid (y down), drawn with a round pen and a little
// bounce per letter, like the labels in a picture book.
const GLYPHS = {
  A: [[0, 6, 1.6, 0.4, 2, 0, 2.4, 0.4, 4, 6], [0.9, 3.9, 3.1, 3.9]],
  B: [[0, 6, 0, 0, 2.5, 0, 3.5, 0.6, 3.6, 1.9, 2.6, 2.9, 0, 2.9], [2.6, 2.9, 3.7, 3.5, 3.9, 5, 2.9, 6, 0, 6]],
  C: [[3.9, 1.1, 3, 0.1, 1.5, 0, 0.4, 0.8, 0, 2.4, 0, 3.8, 0.5, 5.3, 1.6, 6, 3, 5.9, 3.9, 5]],
  D: [[0, 0, 0, 6, 2.1, 6, 3.5, 5.1, 4, 3.3, 3.8, 1.5, 2.6, 0.2, 0, 0]],
  E: [[3.8, 0, 0, 0, 0, 6, 3.9, 6], [0, 2.9, 2.9, 2.9]],
  F: [[3.8, 0, 0, 0, 0, 6], [0, 2.9, 2.8, 2.9]],
  G: [[3.9, 1.1, 3, 0.1, 1.5, 0, 0.4, 0.8, 0, 2.4, 0, 3.8, 0.5, 5.3, 1.6, 6, 3, 5.9, 4, 5, 4, 3.4, 2.3, 3.4]],
  H: [[0, 0, 0, 6], [4, 0, 4, 6], [0, 3, 4, 3]],
  I: [[1, 0, 1, 6]],
  J: [[3.6, 0, 3.6, 4.5, 2.9, 5.8, 1.6, 6, 0.5, 5.4, 0, 4.5]],
  K: [[0, 0, 0, 6], [3.8, 0, 0, 3.7], [1.3, 2.6, 4, 6]],
  L: [[0, 0, 0, 6, 3.6, 6]],
  M: [[0, 6, 0.2, 0, 2.2, 4, 4.2, 0, 4.4, 6]],
  N: [[0, 6, 0, 0, 4, 6, 4, 0]],
  O: [[2, 0, 0.7, 0.5, 0, 2.2, 0, 3.8, 0.7, 5.5, 2, 6, 3.3, 5.5, 4, 3.8, 4, 2.2, 3.3, 0.5, 2, 0]],
  P: [[0, 6, 0, 0, 2.6, 0, 3.7, 0.7, 3.9, 2, 3, 3.1, 0, 3.2]],
  Q: [[2, 0, 0.7, 0.5, 0, 2.2, 0, 3.8, 0.7, 5.5, 2, 6, 3.3, 5.5, 4, 3.8, 4, 2.2, 3.3, 0.5, 2, 0], [2.4, 4.4, 4.2, 6.2]],
  R: [[0, 6, 0, 0, 2.6, 0, 3.7, 0.7, 3.9, 2, 3, 3.1, 0, 3.2], [2, 3.2, 4, 6]],
  S: [[3.8, 0.9, 2.8, 0, 1.2, 0, 0.2, 0.8, 0.2, 2.1, 1.2, 2.8, 2.8, 3.2, 3.8, 4, 3.9, 5.2, 2.9, 6, 1.1, 6, 0, 5.1]],
  T: [[0, 0, 4, 0], [2, 0, 2, 6]],
  U: [[0, 0, 0, 4.3, 0.7, 5.6, 2, 6, 3.3, 5.6, 4, 4.3, 4, 0]],
  V: [[0, 0, 2, 6, 4, 0]],
  W: [[0, 0, 1.1, 6, 2.2, 2, 3.3, 6, 4.4, 0]],
  X: [[0, 0, 4, 6], [4, 0, 0, 6]],
  Y: [[0, 0, 2, 3.1, 4, 0], [2, 3.1, 2, 6]],
  Z: [[0.2, 0, 4, 0, 0, 6, 4, 6]],
  0: [[2, 0, 0.8, 0.5, 0.2, 2.2, 0.2, 3.8, 0.8, 5.5, 2, 6, 3.2, 5.5, 3.8, 3.8, 3.8, 2.2, 3.2, 0.5, 2, 0]],
  1: [[0.9, 1.2, 2.1, 0, 2.1, 6], [0.9, 6, 3.3, 6]],
  2: [[0.2, 1.1, 1.1, 0.1, 2.6, 0, 3.6, 0.7, 3.8, 1.9, 3, 3.2, 0, 6, 4, 6]],
  3: [[0.2, 0.6, 1.3, 0, 2.7, 0, 3.6, 0.7, 3.6, 2, 2.6, 2.9, 1.4, 2.9], [2.6, 2.9, 3.8, 3.7, 3.9, 5.1, 2.9, 6, 1.2, 6, 0, 5.3]],
  4: [[3, 6, 3, 0, 0, 4.2, 4, 4.2]],
  5: [[3.7, 0, 0.5, 0, 0.2, 2.7, 1.4, 2.4, 2.8, 2.5, 3.8, 3.4, 3.9, 5, 2.9, 6, 1.2, 6, 0, 5.2]],
  6: [[3.5, 0.3, 2.3, 0, 1, 0.5, 0.2, 2, 0, 3.8, 0.4, 5.4, 1.6, 6, 2.9, 5.9, 3.8, 5, 3.8, 3.7, 3, 2.8, 1.6, 2.8, 0.4, 3.5]],
  7: [[0, 0, 4, 0, 1.5, 6]],
  8: [[2, 2.9, 0.8, 2.3, 0.5, 1.1, 1.3, 0.1, 2.7, 0.1, 3.5, 1.1, 3.2, 2.3, 2, 2.9, 0.6, 3.6, 0.2, 4.9, 1.1, 5.9, 2.9, 5.9, 3.8, 4.9, 3.4, 3.6, 2, 2.9]],
  9: [[0.5, 5.7, 1.7, 6, 3, 5.5, 3.8, 4, 4, 2.2, 3.6, 0.6, 2.4, 0, 1.1, 0.1, 0.2, 1, 0.2, 2.3, 1, 3.2, 2.4, 3.2, 3.6, 2.5]],
  '.': [[0.8, 5.7, 0.8, 6]],
  ',': [[0.9, 5.4, 0.6, 6.6]],
  '-': [[0.4, 3.2, 2.8, 3.2]],
  '!': [[0.9, 0, 0.9, 4.1], [0.9, 5.7, 0.9, 6]],
  "'": [[0.8, 0, 0.6, 1.6]],
  '?': [[0.2, 1, 1.1, 0.1, 2.7, 0.1, 3.6, 0.9, 3.5, 2.2, 2, 3.2, 2, 4.3], [2, 5.7, 2, 6]],
  ' ': [],
};
const GW = { I: 2, M: 4.4, W: 4.4, '.': 1.6, ',': 1.6, '-': 3.2, '!': 1.8, "'": 1.6, ' ': 2.4 };

// `y` is the baseline. o: { col, w, align, gap, seed, outline, bounce, a }
function letters(g, str, x, y, cap, o = {}) {
  const sc = cap / 6;
  const gap = o.gap ?? 1.35;
  let wsum = 0;
  for (const ch of str) wsum += (GW[ch] ?? 4) + gap;
  wsum = (wsum - gap) * sc;
  let cx = x - (o.align === 'left' ? 0 : o.align === 'right' ? wsum : wsum / 2);
  const R = rng(o.seed ?? 5);
  const bounce = o.bounce ?? 1;
  const strokes = [];
  for (const ch of str) {
    const gl = GLYPHS[ch] ?? [];
    const rot = (R() - 0.5) * 0.09 * bounce;
    const dy = (R() - 0.5) * 0.09 * cap * bounce;
    const gw = (GW[ch] ?? 4) * sc;
    const ox = cx + gw / 2;
    const oy = y - cap / 2 + dy;
    const cs = Math.cos(rot);
    const sn = Math.sin(rot);
    for (const p of gl) {
      const q = [];
      for (let i = 0; i < p.length; i += 2) {
        const lx = p[i] * sc - gw / 2;
        const ly = p[i + 1] * sc - cap / 2;
        q.push(ox + lx * cs - ly * sn, oy + lx * sn + ly * cs);
      }
      strokes.push(q);
    }
    cx += gw + gap * sc;
  }
  const lw = o.w ?? Math.max(0.42, cap * 0.16);
  const pass = (c, wd, a) => {
    g.lineWidth = wd;
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.strokeStyle = css(c, a);
    g.beginPath();
    for (const q of strokes) trace(g, q, false);
    g.stroke();
  };
  if (o.outline) pass(INK, lw + o.outline * 2, o.a ?? 0.92);
  pass(o.col ?? INK, lw, o.a ?? 0.92);
  return wsum;
}

// ------------------------------------------------------------------ paper
let GRAIN = null;
function grainTile() {
  if (GRAIN) return GRAIN;
  const N = 256;
  const c = canvas(N, N);
  const g = c.getContext('2d');
  const img = g.createImageData(N, N);
  const d = img.data;
  const lat = (cells, seed) => {
    const v = new Float32Array(cells * cells);
    for (let i = 0; i < v.length; i++) v[i] = hash(i * 3.17 + seed * 91.3);
    return (x, y) => {
      const fx = (x / N) * cells;
      const fy = (y / N) * cells;
      const ix = Math.floor(fx);
      const iy = Math.floor(fy);
      const tx = fx - ix;
      const ty = fy - iy;
      const sx = tx * tx * (3 - 2 * tx);
      const sy = ty * ty * (3 - 2 * ty);
      const x0 = ix % cells;
      const y0 = iy % cells;
      const x1 = (x0 + 1) % cells;
      const y1 = (y0 + 1) % cells;
      const a = v[y0 * cells + x0] + (v[y0 * cells + x1] - v[y0 * cells + x0]) * sx;
      const b = v[y1 * cells + x0] + (v[y1 * cells + x1] - v[y1 * cells + x0]) * sx;
      return (a + (b - a) * sy) * 2 - 1;
    };
  };
  const low = lat(8, 1);
  const mid = lat(24, 2);
  const fib = lat(64, 3);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const v = low(x, y) * 0.35 + mid(x, y) * 0.35 + fib(x, y) * 0.3 + (hash(x * 1.13 + y * 913.7) - 0.5) * 0.9;
      const i = (y * N + x) * 4;
      if (v > 0) {
        d[i] = 92; d[i + 1] = 62; d[i + 2] = 38;
        d[i + 3] = Math.min(255, v * 58);
      } else {
        d[i] = 255; d[i + 1] = 250; d[i + 2] = 236;
        d[i + 3] = Math.min(255, -v * 40);
      }
    }
  }
  g.putImageData(img, 0, 0);
  GRAIN = c;
  return c;
}

// The paper's tooth over whatever is painted (transparent stays transparent). On a strip
// (`periodic`) the tile is stretched a hair so a whole number of tiles spans it, and the
// tooth runs on across the wrap without a seam.
function applyGrain(g, w, h, a = 1, periodic = false) {
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.globalAlpha = a;
  const pat = g.createPattern(grainTile(), 'repeat');
  if (periodic && typeof DOMMatrix !== 'undefined') {
    const n = Math.max(1, Math.round(w / 256));
    pat.setTransform(new DOMMatrix([w / (n * 256), 0, 0, 1, 0, 0]));
  }
  g.fillStyle = pat;
  g.fillRect(0, 0, w, h);
  g.restore();
}

// ------------------------------------------------------------------ bakes
// A strip one period P long in its layer's own u, y0..y1, at device scale r.
function newStrip(P, y0, y1, r) {
  const wDev = Math.round(P * r);
  const hDev = Math.ceil((y1 - y0) * r);
  const c = canvas(wDev, hDev);
  const g = c.getContext('2d');
  g.setTransform(r, 0, 0, r, 0, -y0 * r);
  return { c, g, P, y0, y1, r, wDev, hDev };
}

function finishStrip(S, grain = 1) {
  if (grain) applyGrain(S.g, S.wDev, S.hDev, grain, true);
  const tiles = [];
  for (let x = 0; x < S.wDev; x += TILE_DEV) {
    const w = Math.min(TILE_DEV, S.wDev - x);
    const t = canvas(w, S.hDev);
    t.getContext('2d').drawImage(S.c, -x, 0);
    tiles.push({ c: t, u0: x / S.r, w: w / S.r });
  }
  return { tiles, P: S.P, y: S.y0, h: S.hDev / S.r, r: S.r };
}

// Calls fn(off) for each copy of [u0, u1] that lands in [0, P).
function wrap(P, u0, u1, fn, margin = 4) {
  for (const off of [-P, 0, P]) {
    if (u1 + off < -margin || u0 + off > P + margin) continue;
    fn(off);
  }
}

// Draw a strip at `shift`, snapped to its device grid. Returns the snap offset (screen x
// of strip content minus the frame's x for the same u) so live parts can follow it.
function drawStrip(ctx, S, shift) {
  const s = mod(shift, S.P);
  const sn = Math.round(s * S.r) / S.r;
  for (const off of [-S.P, 0, S.P]) {
    for (const t of S.tiles) {
      const x = t.u0 + off - sn;
      if (x >= W + 2 || x + t.w <= -2) continue;
      ctx.drawImage(t.c, x, S.y, t.w, S.h);
    }
  }
  return s - sn;
}

function sprite(k, box, draw, grain = 1) {
  const [x0, y0, w, h] = box;
  const c = canvas(Math.ceil(w * k), Math.ceil(h * k));
  const g = c.getContext('2d');
  g.setTransform(k, 0, 0, k, -x0 * k, -y0 * k);
  draw(g);
  if (grain) applyGrain(g, c.width, c.height, grain);
  return { c, x0, y0, w: c.width / k, h: c.height / k };
}

function blit(ctx, s, x, y) {
  if (s) ctx.drawImage(s.c, x + s.x0, y + s.y0, s.w, s.h);
}

// A band [0, P] x [y0, y1] washed in colour with blooms that wrap at P.
function bandWash(g, P, y0, y1, c, seed, n = 0, bloomA = 1) {
  c = hex(c);
  g.fillStyle = css(c);
  g.fillRect(0, y0, P, y1 - y0);
  const R = rng(seed);
  n = n || Math.round(P / 40);
  g.save();
  g.beginPath();
  g.rect(0, y0, P, y1 - y0);
  g.clip();
  for (let i = 0; i < n; i++) {
    const x = R() * P;
    const y = y0 + R() * (y1 - y0);
    const r = 6 + R() * Math.max(10, (y1 - y0) * 1.2);
    const t = R() < 0.5 ? shade(c, 0.08 + R() * 0.1) : shade(c, -0.05 - R() * 0.07);
    for (const off of [-P, 0, P]) {
      if (x + off + r < 0 || x + off - r > P) continue;
      glow(g, x + off, y, r, t, 0.35 * bloomA);
    }
  }
  g.restore();
}

// A long periodic wobbly ink line across the strip at y.
function pline(g, P, y, w, a, seed, amp = 0.35) {
  const pts = [];
  for (let u = -2; u <= P + 2; u += 3) pts.push(u, y + pnoise(u, 11, P, seed) * amp);
  ink(g, pts, false, w, a);
}

// ------------------------------------------------------------------ palettes
const PAL = {
  lobby: {
    sky: [[22, '#86bde6'], [100, '#b6d9ec'], [170, '#e4eee6'], [204, '#f6ecd2']],
    far: ['#b3c4d8', '#c3bdd6', '#cfc7b6'],
    near: ['#dc8a72', '#e5bd72', '#9dbf9a', '#a9c3dc'],
    wall: '#ebcf9f', wall2: '#e0bc89', mortar: '#c9a677', trim: '#d2a165',
    column: '#d8ad76', mullion: '#4f7a70', tint: [205, 230, 240, 0.2],
    liftFrame: '#d6aa4e', liftDoor: '#b7c3c9', liftCar: '#eed69a',
    floorA: '#d8bf96', floorB: '#c9ad84', grout: '#a88f6a', finish: '#c9ad84',
    concrete: '#b0a593', aboveWall: '#e9dfca', roomWall: '#cfd5d4',
  },
  open: {
    sky: [[58, '#6eaee0'], [110, '#a8d2ee'], [150, '#dcedf2']],
    far: ['#b4c8dc', '#c1c9de', '#ccd2dc'],
    near: ['#d98e74', '#e2c27e', '#a8c49a', '#b9a7c9', '#c9b39a'],
    wall: '#f1dca4', wall2: '#ead199', trim: '#9a6a44',
    column: '#e2d6bb', mullion: '#6b8590', tint: [210, 232, 242, 0.16],
    liftFrame: '#b8c0c6', liftDoor: '#c4ccd0', liftCar: '#f4e3aa',
    floorA: '#8797ad', floorB: '#7f8fa6', grout: '#6e7d92', finish: '#7d8ca2',
    concrete: '#b3a99a', aboveWall: '#e3e6dc', roomWall: '#e9d7a3',
  },
  exec: {
    sky: [[30, '#3d3f84'], [80, '#6b5698'], [130, '#c6768e'], [168, '#f0a068'], [200, '#f8cd88']],
    far: ['#6f5f8e', '#7b6795', '#665a86'],
    near: ['#5c5488', '#695a8c', '#544f80', '#73618f'],
    wall: '#9c5e35', wall2: '#ad6b3f', trim: '#6e3d20',
    column: '#6c3f22', mullion: '#5a4030', tint: [255, 214, 170, 0.08],
    liftFrame: '#d1a64a', liftDoor: '#c9a764', liftCar: '#f6d898',
    floorA: '#b88450', floorB: '#a87341', grout: '#7c5130', finish: '#a87341',
    concrete: '#aa9f8f', aboveWall: '#dccfb4', roomWall: '#d7e2d8',
  },
};

// ------------------------------------------------------------------ people
const SKINS = ['#f6d6bb', '#efc39f', '#d9a274', '#b47c52', '#87593b'];
const HAIRS = ['#3a2a1e', '#6a4327', '#a3622f', '#dfb65c', '#b5aea6', '#c0532e', '#241c19'];
const CLOTHES = ['#d9574b', '#4d84c4', '#6aa84f', '#efb23a', '#9a6cbd', '#ec8c3c', '#3c9f99', '#de7c9c', '#5a6f9e', '#c9a46a'];

function traits(seed) {
  const R = rng(seed * 31 + 7);
  return {
    skin: SKINS[(R() * SKINS.length) | 0],
    hair: HAIRS[(R() * HAIRS.length) | 0],
    style: (R() * 6) | 0,
    shirt: CLOTHES[(R() * CLOTHES.length) | 0],
    tie: R() < 0.55 ? CLOTHES[(R() * CLOTHES.length) | 0] : null,
    glasses: R() < 0.28,
    hat: R() < 0.16 ? ((R() * 2) | 0) : -1,
    legs: ['#3d4f78', '#5a4a3a', '#3b3b44', '#7a6a58'][(R() * 4) | 0],
  };
}

const SOFT = { wa: 0.12, la: 0.1, mis: 0.15, blooms: 1, edge: 1.1 };

function head(g, cx, cy, r, T, o = {}) {
  const look = o.look ?? 0;
  const seed = o.seed ?? 1;
  const lw = o.w ?? Math.max(0.45, r * 0.12);
  const S = { ...SOFT, w: lw, seed };
  if (T.style === 1) paint(g, rrPts(cx - r * 1.12, cy - r * 1.08, r * 2.24, r * 2.05, r * 0.95), T.hair, S);
  if (T.style === 2) paint(g, elPts(cx, cy - r * 1.08, r * 0.46, r * 0.4), T.hair, S);
  for (const sd of [-1, 1]) paint(g, elPts(cx + sd * r * 0.96, cy + r * 0.12, r * 0.22, r * 0.3), T.skin, { ...S, seed: seed + sd });
  paint(g, elPts(cx, cy, r, r * 1.02), T.skin, { ...S, seed: seed + 3, edge: 1.4 });
  const capPts = (lo) => {
    const pts = elPts(cx, cy, r * 1.06, r * 1.08, 14, Math.PI + lo, TAU - lo);
    pts.push(cx + r * 0.95, cy - r * 0.2, cx + r * 0.45 + look * r * 0.2, cy - r * 0.5, cx - r * 0.15 + look * r * 0.2, cy - r * 0.38, cx - r * 0.95, cy - r * 0.16);
    return pts;
  };
  if (T.style === 0 || T.style === 1 || T.style === 2) paint(g, capPts(0.2), T.hair, { ...S, seed: seed + 5 });
  else if (T.style === 3) {
    for (const sd of [-1, 1]) paint(g, elPts(cx + sd * r * 0.9, cy - r * 0.02, r * 0.2, r * 0.3), shade(T.hair, 0.25), { ...S, seed: seed + 6 + sd });
  } else if (T.style === 4) {
    const pts = [];
    for (let i = 0; i <= 18; i++) {
      const a = Math.PI + 0.1 + (i / 18) * (Math.PI - 0.2);
      const rr = r * (1.12 + 0.12 * Math.sin(i * 2.1));
      pts.push(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    pts.push(cx + r * 0.9, cy - r * 0.25, cx, cy - r * 0.55, cx - r * 0.9, cy - r * 0.25);
    paint(g, pts, T.hair, { ...S, seed: seed + 7 });
  } else {
    const pts = elPts(cx, cy, r * 1.08, r * 1.1, 14, Math.PI + 0.1, TAU - 0.25);
    pts.push(cx + r * 0.6, cy - r * 0.62, cx - r * 0.5, cy - r * 0.3, cx - r * 1.0, cy + r * 0.05);
    paint(g, pts, T.hair, { ...S, seed: seed + 8 });
  }
  const ex = cx + look * r * 0.24;
  dot(g, ex - r * 0.5 + look * r * 0.05, cy + r * 0.32, r * 0.2, '#ec7a6e', 0.4);
  dot(g, ex + r * 0.5 + look * r * 0.05, cy + r * 0.32, r * 0.2, '#ec7a6e', 0.4);
  if (o.shut) {
    for (const sd of [-1, 1]) poly(g, elPts(ex + sd * r * 0.34, cy - r * 0.04, r * 0.17, r * 0.1, 5, 0.2, Math.PI - 0.2), lw * 0.9, 0.9, seed + sd);
  } else {
    dot(g, ex - r * 0.34, cy - r * 0.06, Math.max(0.35, r * 0.11), INK);
    dot(g, ex + r * 0.34, cy - r * 0.06, Math.max(0.35, r * 0.11), INK);
  }
  if (T.glasses) {
    g.strokeStyle = css(INK, 0.7);
    g.lineWidth = lw * 0.7;
    for (const sd of [-1, 1]) { g.beginPath(); g.arc(ex + sd * r * 0.36, cy - r * 0.06, r * 0.27, 0, TAU); g.stroke(); }
  }
  paint(g, elPts(ex + look * r * 0.22, cy + r * 0.2, r * 0.22, r * 0.18, 8), shade(T.skin, -0.12), { ...S, seed: seed + 9, w: lw * 0.8, edge: 0, blooms: 0, mis: 0 });
  if (!o.shut) poly(g, elPts(ex + look * r * 0.1, cy + r * 0.42, r * 0.26, r * 0.16, 6, 0.4, Math.PI - 0.4), lw * 0.8, 0.8, seed + 10);
  else poly(g, [ex - r * 0.12, cy + r * 0.56, ex + r * 0.14, cy + r * 0.56], lw * 0.8, 0.8, seed + 10);
  if (T.hat === 0) {
    paint(g, rrPts(cx - r * 1.45, cy - r * 0.72, r * 2.9, r * 0.36, r * 0.18), '#6b5a4a', { ...S, seed: seed + 11 });
    paint(g, rrPts(cx - r * 0.8, cy - r * 1.42, r * 1.6, r * 0.8, r * 0.3), '#6b5a4a', { ...S, seed: seed + 12 });
  } else if (T.hat === 1) {
    paint(g, [...elPts(cx, cy - r * 0.5, r * 1.02, r * 0.75, 12, Math.PI, TAU), cx + r * 1.5, cy - r * 0.42, cx - r * 0.2, cy - r * 0.42], '#c9573f', { ...S, seed: seed + 13 });
  }
}

// Head and shoulders; the head centre at (cx, cy).
function bust(g, cx, cy, r, T, o = {}) {
  const sy = cy + r * 0.72;
  const seed = o.seed ?? 1;
  const S = { ...SOFT, w: Math.max(0.45, r * 0.12), seed: seed + 20 };
  paint(g, rrPts(cx - r * 1.6, sy, r * 3.2, r * 2.8, r * 1.0), T.shirt, S);
  paint(g, [cx - r * 0.55, sy + 0.1, cx + r * 0.55, sy + 0.1, cx, sy + r * 0.8], '#f6f1e4', { ...S, seed: seed + 21, blooms: 0, edge: 0 });
  if (T.tie) paint(g, [cx - r * 0.18, sy + r * 0.3, cx + r * 0.18, sy + r * 0.3, cx + r * 0.3, sy + r * 1.7, cx, sy + r * 2.0, cx - r * 0.3, sy + r * 1.7], T.tie, { ...S, seed: seed + 22, blooms: 0 });
  if (o.headset) {
    g.strokeStyle = css(INK, 0.8);
    g.lineWidth = 0.5;
    g.beginPath(); g.arc(cx, cy, r * 1.12, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
  }
  head(g, cx, cy, r, T, o);
  if (o.headset) {
    dot(g, cx - r * 1.05, cy + r * 0.1, r * 0.28, '#3b3b44');
    poly(g, [cx - r * 1.0, cy + r * 0.3, cx - r * 0.6, cy + r * 0.75, cx - r * 0.2, cy + r * 0.62], 0.4, 0.8, seed + 30);
  }
}

// A whole little person, feet at (0, 0), facing dir, `step` 0/1 for the walk.
function walker(g, T, step, dir, h = 15, extra = 0) {
  const r = h * 0.17;
  const hy = -h + r;
  const lw = 0.45;
  const S = { ...SOFT, w: lw, seed: 3 };
  const leg = step ? 1.7 : 0.5;
  poly(g, [-0.6, -h * 0.34, -leg, -0.6], 1.3, 1, 1, T.legs, 0.05);
  poly(g, [0.6, -h * 0.34, leg, -0.6], 1.3, 1, 2, T.legs, 0.05);
  dot(g, -leg - 0.3 * dir + dir * 0.5, -0.5, 0.75, '#2e241c');
  dot(g, leg + dir * 0.5, -0.5, 0.75, '#2e241c');
  paint(g, rrPts(-r * 1.15, hy + r * 0.8, r * 2.3, h * 0.42, r * 0.8), T.shirt, S);
  const arm = step ? 1.4 : -1.2;
  poly(g, [0, hy + r * 1.4, arm * dir, hy + r * 1.4 + h * 0.3], 0.9, 0.95, 4, shade(T.shirt, -0.15), 0.05);
  if (extra === 1) paint(g, rrPts(arm * dir - 1.6, hy + r * 1.4 + h * 0.28, 3.2, 2.4, 0.4), '#7a5132', { ...S, seed: 6 });
  if (extra === 2) {
    poly(g, [-arm * dir * 0.6, hy + r * 1.6, -arm * dir * 0.6, hy - r * 1.8], 0.4, 0.9, 7);
    paint(g, [...elPts(-arm * dir * 0.6, hy - r * 1.6, r * 2.2, r * 1.1, 10, Math.PI, TAU)], '#d9574b', { ...S, seed: 8 });
  }
  head(g, 0, hy, r, T, { look: dir * 0.8, w: 0.4, seed: 9 });
}

// ------------------------------------------------------------------ sky + clouds
function buildSky(F, k) {
  const G = F.glass;
  const y0 = G.top;
  const y1 = G.bottom;
  const P = PAL[F.id];
  const c = canvas(W * k, (y1 - y0) * k);
  const g = c.getContext('2d');
  g.setTransform(k, 0, 0, k, 0, -y0 * k);
  const gr = g.createLinearGradient(0, y0, 0, y1);
  for (const [yy, col] of P.sky) gr.addColorStop(clamp((yy - y0) / (y1 - y0), 0, 1), col);
  g.fillStyle = gr;
  g.fillRect(0, y0, W, y1 - y0);
  const R = rng(F.stage * 31 + 5);
  for (let i = 0; i < 30; i++) {
    const x = R() * W;
    const y = y0 + R() * (y1 - y0) * 0.85;
    const r = 18 + R() * 50;
    const light = R() < 0.6;
    const col = light ? [255, 252, 240] : F.id === 'exec' ? [96, 64, 128] : [70, 122, 172];
    glow(g, x, y, r, col, light ? 0.18 : 0.08);
  }
  // A few dried "back-run" edges where the wash crawled back: soft pale rings.
  for (let i = 0; i < 5; i++) {
    const x = R() * W;
    const y = y0 + 10 + R() * (y1 - y0) * 0.5;
    const r = 14 + R() * 26;
    const pts = [];
    for (let j = 0; j < 22; j++) {
      const a = (j / 22) * TAU;
      const rr = r * (1 + 0.18 * Math.sin(a * 3 + i) + 0.1 * Math.sin(a * 7 + i * 2));
      pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.6);
    }
    ink(g, pts, true, 1.2, 0.06, F.id === 'exec' ? [70, 40, 90] : [60, 100, 150]);
  }
  const sun = F.outside.sun;
  if (sun && F.id === 'lobby') {
    glow(g, sun.x, sun.y, sun.r * 4, [255, 246, 200], 0.55);
    paint(g, elPts(sun.x, sun.y, sun.r, sun.r), '#fbe27a', { seed: 41, w: 0.7, ia: 0.6, blooms: 2, grad: [0.25, -0.05] });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + 0.13;
      line(g, sun.x + Math.cos(a) * (sun.r + 3), sun.y + Math.sin(a) * (sun.r + 3), sun.x + Math.cos(a) * (sun.r + 7.5), sun.y + Math.sin(a) * (sun.r + 7.5), 0.8, 0.45, 50 + i, [214, 160, 40]);
    }
  }
  if (F.id === 'exec') {
    glow(g, sun.x, sun.y, 90, [255, 196, 120], 0.45);
    glow(g, sun.x, sun.y, 34, [255, 226, 160], 0.6);
    paint(g, elPts(sun.x, sun.y, sun.r, sun.r), '#f8a548', { seed: 42, w: 0.7, ia: 0.5, blooms: 2, grad: [0.3, -0.1] });
    // The long low cloud bank the sun is setting into.
    const top = [];
    for (let x = -10; x <= W + 10; x += 2) {
      const y = 170 + Math.sin(x * 0.045) * 2.2 + Math.sin(x * 0.11 + 1) * 1.6 - Math.max(0, Math.sin(x * 0.021 + 0.4)) * 4;
      top.push(x, y);
    }
    const bank = [...top, W + 10, 200, -10, 200];
    wash(g, bank, '#a9668c', { seed: 43, grad: [0.18, -0.05], blooms: 8, edge: 2 });
    ink(g, top, false, 0.6, 0.35);
    // the lit lip
    const lip = top.map((v, i) => (i % 2 ? v + 1.2 : v));
    ink(g, lip, false, 1.4, 0.35, [255, 176, 120]);
    const haze = g.createLinearGradient(0, 178, 0, 200);
    haze.addColorStop(0, 'rgba(248,196,136,0)');
    haze.addColorStop(1, 'rgba(248,196,136,0.55)');
    g.fillStyle = haze;
    g.fillRect(0, 178, W, 22);
  }
  applyGrain(g, c.width, c.height, 0.8);
  return { c, y: y0, h: y1 - y0 };
}

function cloudPts(w, h, R) {
  const n = Math.max(3, Math.round(w / 16));
  const bumps = [];
  for (let j = 0; j < n; j++) {
    const t = (j + 0.5) / n;
    bumps.push([w * t + (R() - 0.5) * (w / n) * 0.3, h * 0.2 - Math.sin(Math.PI * t) * h * 0.5 - R() * h * 0.15, (w / n) * (0.62 + R() * 0.3)]);
  }
  const pts = [];
  for (let x = 0; x <= w; x += 1.5) {
    let y = h * 0.42;
    for (const [bx, by, br] of bumps) {
      const dx = x - bx;
      if (Math.abs(dx) < br) y = Math.min(y, by - Math.sqrt(br * br - dx * dx));
    }
    pts.push(x, y);
  }
  for (let x = w; x >= 0; x -= 3) pts.push(x, h * 0.42 + Math.sin((Math.PI * x) / w) * h * 0.1);
  return pts;
}

function buildCloud(F, c, i, k) {
  return sprite(k, [-4, Math.floor(-c.h * 1.1) - 4, c.w + 8, Math.ceil(c.h * 1.7) + 8], (g) => {
    const R = rng(i * 13 + F.stage * 7);
    const pts = cloudPts(c.w, c.h, R);
    const col = F.id === 'exec' ? '#e6a8a8' : '#fbf8f0';
    const under = F.id === 'exec' ? '#9a6a9a' : '#b9cfe2';
    wash(g, pts, col, { seed: i + 5, blooms: 2, edge: 0 });
    g.save();
    g.beginPath();
    trace(g, pts, true);
    g.clip();
    const gr = g.createLinearGradient(0, -c.h * 0.2, 0, c.h * 0.5);
    gr.addColorStop(0, css(under, 0));
    gr.addColorStop(1, css(under, 0.7));
    g.fillStyle = gr;
    g.fillRect(-2, -c.h, c.w + 4, c.h * 2);
    g.restore();
    ink(g, wob(pts, true, 0.25, i + 9), true, 0.6, F.id === 'exec' ? 0.35 : 0.45);
  }, 0.7);
}

// ------------------------------------------------------------------ outside: the city
function farBuilding(g, b, x, F, P) {
  const exec = F.id === 'exec';
  const col = shade(P.far[b.tone], (hash(b.i * 3.1) - 0.5) * 0.08);
  const top = b.top;
  const pts = [x, b.base + 2];
  if (b.roof === 'stepped' && b.w > 18) {
    const s = Math.max(3, b.w * 0.16);
    pts.push(x, top + 10, x + s, top + 10, x + s, top + 4, x + 2 * s, top + 4, x + 2 * s, top, x + b.w - 2 * s, top, x + b.w - 2 * s, top + 4, x + b.w - s, top + 4, x + b.w - s, top + 10, x + b.w, top + 10);
  } else pts.push(x, top, x + b.w, top);
  pts.push(x + b.w, b.base + 2);
  paint(g, pts, col, { seed: b.i + 300, w: 0.5, ia: exec ? 0.35 : 0.3, edge: 1.4, blooms: 1, grad: [0.08, -0.04] });
  if (b.roof === 'spire') paint(g, [x + b.w * 0.36, top + 0.5, x + b.w * 0.5, top - Math.min(22, b.w * 0.6), x + b.w * 0.64, top + 0.5], col, { seed: b.i + 301, w: 0.5, ia: 0.3, edge: 0.8 });
  if (b.roof === 'antenna') line(g, x + b.w * 0.5, top, x + b.w * 0.5, top - 12, 0.5, 0.4, b.i);
  const R = rng(b.i * 17 + 3);
  const cw = (b.w - 3) / b.cols;
  const wc = exec ? [255, 212, 120] : shade(col, -0.25);
  for (let y = top + 4, row = 0; y < b.base - 3; y += b.floorH, row++) {
    for (let c = 0; c < b.cols; c++) {
      const lit = exec ? R() < b.lit : true;
      if (!lit) continue;
      g.fillStyle = css(wc, exec ? 0.75 : 0.35);
      g.fillRect(x + 1.8 + c * cw, y, Math.max(0.8, cw * 0.55), b.floorH * 0.45);
    }
  }
}

function buildFar(F, k) {
  const G = F.glass;
  const P = PAL[F.id];
  const S = newStrip(1400, G.top, G.bottom, k * 0.75);
  for (const b of F.outside.far) wrap(1400, b.u, b.u + b.w, (off) => farBuilding(S.g, b, b.u + off, F, P), 30);
  if (F.id !== 'exec') {
    // aerial haze at the foot of the far skyline
    const hz = S.g.createLinearGradient(0, F.outside.horizon - 50, 0, F.outside.horizon);
    hz.addColorStop(0, 'rgba(240,244,240,0)');
    hz.addColorStop(1, 'rgba(240,244,240,0.45)');
    S.g.globalCompositeOperation = 'source-atop';
    S.g.fillStyle = hz;
    S.g.fillRect(0, F.outside.horizon - 50, 1400, 60);
    S.g.globalCompositeOperation = 'source-over';
  } else {
    const hz = S.g.createLinearGradient(0, 160, 0, 200);
    hz.addColorStop(0, 'rgba(120,80,130,0)');
    hz.addColorStop(1, 'rgba(160,96,120,0.35)');
    S.g.globalCompositeOperation = 'source-atop';
    S.g.fillStyle = hz;
    S.g.fillRect(0, 150, 1400, 60);
    S.g.globalCompositeOperation = 'source-over';
  }
  return finishStrip(S, 0.7);
}

const SHOP_NAMES = ['BAKERY', 'HATS', 'BOOKS', 'CAFE', 'TOYS', 'SHOES', 'DELI', 'FLOWERS', 'BANK', 'NEWS'];
const AWNINGS = ['#d9574b', '#5aa05a', '#4d84c4', '#efb23a'];
const BILLBOARDS = ['FRESH EGGS!', 'EGGCORP', 'SUPER SOAP', 'DRINK POP', 'EGG-O-MATIC'];

function waterTank(g, x, y, s, seed) {
  for (const lx of [-4, -1, 2, 5]) line(g, x + lx * s, y, x + lx * s * 0.8, y - 7 * s, 0.6, 0.8, seed + lx);
  line(g, x - 5 * s, y - 3.5 * s, x + 6 * s, y - 3.5 * s, 0.5, 0.6, seed + 9);
  paint(g, rrPts(x - 6 * s, y - 17 * s, 12 * s, 10 * s, 1.2), '#b5835a', { seed, w: 0.6, blooms: 1 });
  for (const yy of [-14, -10.5]) line(g, x - 6 * s, y + yy * s, x + 6 * s, y + yy * s, 0.5, 0.6, seed + yy);
  paint(g, [x - 7 * s, y - 16.5 * s, x, y - 22 * s, x + 7 * s, y - 16.5 * s], '#8a5d3a', { seed: seed + 1, w: 0.6, blooms: 0 });
}

function pigeon(g, x, y, s, dir, seed) {
  paint(g, elPts(x, y - 1.6 * s, 2.2 * s, 1.4 * s, 10), '#9aa0ae', { seed, w: 0.4, wa: 0.05, la: 0.05, mis: 0, blooms: 0, edge: 0.6 });
  paint(g, elPts(x + dir * 1.9 * s, y - 3 * s, 1 * s, 1 * s, 8), '#8a90a0', { seed: seed + 1, w: 0.4, wa: 0.05, la: 0.05, mis: 0, blooms: 0, edge: 0 });
  dot(g, x + dir * 2.9 * s, y - 2.9 * s, 0.35 * s, '#e0a040');
  line(g, x - 0.4, y - 0.4, x - 0.4, y + 0.2, 0.35, 0.9, seed + 2, [214, 120, 90]);
}

function nearBuilding(g, b, x, F, P) {
  const lobby = F.id === 'lobby';
  const exec = F.id === 'exec';
  const R = rng(b.i * 97 + F.stage * 1000);
  const base = lobby ? 185 : b.base;
  const top = b.top;
  const pal = P.near;
  const col = shade(pal[(b.tone + (b.i % 2) * 3) % pal.length], (R() - 0.5) * 0.1);
  paint(g, [x, base, x, top, x + b.w, top, x + b.w, base], col, { seed: b.i * 7 + 1, w: exec ? 0.6 : 0.7, ia: exec ? 0.55 : 0.75, grad: exec ? [0.14, -0.1] : [0.06, -0.08], blooms: 5 });
  // roof
  if (b.roof === 'cornice') {
    paint(g, rrPts(x - 2, top - 3, b.w + 4, 4, 0.8), shade(col, -0.15), { seed: b.i + 2, w: 0.6 });
    for (let dx = 2; dx < b.w - 1; dx += 3) g.fillRect(x + dx, top + 1.5, 1.2, 1.2);
  } else if (b.roof === 'tank') {
    paint(g, rectPts(x - 1, top - 2, b.w + 2, 2.5), shade(col, -0.12), { seed: b.i + 3, w: 0.55, blooms: 0 });
    waterTank(g, x + b.w * (0.25 + R() * 0.5), top - 1.5, 1, b.i * 5 + 1);
  } else if (b.roof === 'billboard') {
    const bx = x + 6;
    const bw = b.w - 12;
    for (const lx of [bx + bw * 0.2, bx + bw * 0.8]) line(g, lx, top, lx, top - 7, 0.7, 0.85, b.i + lx);
    paint(g, rrPts(bx, top - 22, bw, 15, 1), '#f3e6c0', { seed: b.i + 4, w: 0.7 });
    const word = BILLBOARDS[b.i % BILLBOARDS.length];
    letters(g, word, bx + bw / 2, top - 11.5, Math.min(6, (bw - 6) / (word.length * 0.95)), { col: ['#d9574b', '#4d84c4', '#3c9f99'][b.i % 3], seed: b.i, w: 0.9 });
  } else if (b.roof === 'spire') {
    paint(g, [x + b.w * 0.3, top + 0.5, x + b.w * 0.5, top - Math.min(34, b.w * 0.8), x + b.w * 0.7, top + 0.5], shade(col, -0.05), { seed: b.i + 5, w: 0.6, ia: 0.6 });
    line(g, x + b.w * 0.5, top - Math.min(34, b.w * 0.8), x + b.w * 0.5, top - Math.min(34, b.w * 0.8) - 8, 0.5, 0.6, b.i);
  } else if (b.roof === 'stepped') {
    const s = b.w * 0.18;
    paint(g, rectPts(x + s, top - 7, b.w - 2 * s, 7.5), shade(col, 0.04), { seed: b.i + 6, w: 0.6, ia: 0.6 });
    paint(g, rectPts(x + 2 * s, top - 13, b.w - 4 * s, 6.5), shade(col, 0.08), { seed: b.i + 7, w: 0.6, ia: 0.6 });
  } else if (b.roof === 'antenna') {
    line(g, x + b.w * 0.5, top, x + b.w * 0.5, top - 22, 0.6, 0.7, b.i);
    line(g, x + b.w * 0.5 - 4, top - 14, x + b.w * 0.5 + 4, top - 14, 0.5, 0.6, b.i + 1);
    dot(g, x + b.w * 0.5, top - 22, 1.2, '#e05040');
  } else {
    paint(g, rectPts(x - 0.5, top - 2, b.w + 1, 2.5), shade(col, -0.1), { seed: b.i + 8, w: 0.55, blooms: 0 });
    if (R() < 0.6) paint(g, rectPts(x + b.w * (0.15 + R() * 0.5), top - 7, 6, 5), shade(col, -0.18), { seed: b.i + 9, w: 0.55 });
  }
  // pigeons on the roofline
  if (!exec && R() < 0.55) {
    const n = 1 + ((R() * 3) | 0);
    for (let j = 0; j < n; j++) pigeon(g, x + 6 + R() * (b.w - 12), top - (b.roof === 'cornice' ? 3 : 2), 0.8, R() < 0.5 ? -1 : 1, b.i * 11 + j);
  }
  // windows
  const shopH = lobby && b.shop != null ? 22 : 0;
  const cw = (b.w - 2) / b.cols;
  const glass = exec ? [70, 64, 110] : mix(shade(col, 0.3), [150, 192, 216], 0.55);
  const frame = shade(col, 0.45);
  for (let y = top + 4, row = 0; y + b.floorH * 0.5 < base - shopH - 2; y += b.floorH, row++) {
    for (let c = 0; c < b.cols; c++) {
      const wx = x + 1 + c * cw + cw * 0.2;
      const ww = cw * 0.6;
      const wh = b.floorH * 0.58;
      const rr = R();
      const lit = exec && rr < b.lit;
      g.fillStyle = css(lit ? [255, 214, 124] : glass, lit ? 0.95 : 0.9);
      g.fillRect(wx, y, ww, wh);
      if (lit && ww > 2.6 && ((rr * 977) % 1) < 0.14) {
        // someone working late
        g.fillStyle = 'rgba(70,46,60,0.75)';
        g.beginPath(); g.arc(wx + ww / 2, y + wh * 0.5, Math.min(1.2, ww * 0.22), 0, TAU); g.fill();
        g.fillRect(wx + ww * 0.2, y + wh * 0.68, ww * 0.6, wh * 0.32);
      }
      if (!exec && F.id === 'open' && ww > 3.4 && ((rr * 613) % 1) < 0.07) {
        // the office across the street, busy too
        const T = traits(b.i * 100 + c * 7 + row);
        g.fillStyle = css(T.shirt, 0.9);
        g.fillRect(wx + ww * 0.18, y + wh * 0.62, ww * 0.64, wh * 0.38);
        dot(g, wx + ww / 2, y + wh * 0.45, Math.min(1.4, ww * 0.22), T.skin);
        dot(g, wx + ww / 2, y + wh * 0.36, Math.min(1.1, ww * 0.18), T.hair);
      }
      if (!exec) {
        g.fillStyle = css(frame, 0.7);
        g.fillRect(wx - 0.4, y + wh, ww + 0.8, 0.7);
        g.fillStyle = 'rgba(255,255,250,0.4)';
        g.fillRect(wx + 0.4, y + 0.4, ww * 0.28, wh * 0.3);
        if (rr < 0.05) { g.fillStyle = css(CLOTHES[(rr * 400 | 0) % CLOTHES.length], 0.6); g.fillRect(wx, y, ww * 0.3, wh); g.fillRect(wx + ww * 0.7, y, ww * 0.3, wh); }
        else if (rr < 0.08 && ww > 3) dot(g, wx + ww / 2, y + wh * 0.62, Math.min(1.5, ww * 0.25), SKINS[(rr * 900 | 0) % SKINS.length]);
        else if (rr < 0.1) { g.fillStyle = 'rgba(96,150,80,0.8)'; g.fillRect(wx - 0.3, y + wh - 1, ww + 0.6, 1.1); }
        else if (rr < 0.34) { g.fillStyle = 'rgba(244,236,214,0.85)'; g.fillRect(wx, y, ww, wh * (0.25 + ((rr * 50) % 1) * 0.5)); }
      }
      g.strokeStyle = css(INK, exec ? 0.22 : 0.3);
      g.lineWidth = 0.4;
      g.strokeRect(wx, y, ww, wh);
    }
  }
  if (shopH) shopFront(g, b, x, base, shopH, col, R);
  if (!exec) facadeLife(g, b, x, base - shopH, col, F);
}

// What makes a picture-book street busy: string courses, a fire escape, a hotel sign,
// flags, a painted wall advert, washing on a roof, a rooftop gardener. One or two per
// building, picked by the building's own index so every style's city stays the same city.
function facadeLife(g, b, x, base, col, F) {
  const R = rng(b.i * 131 + F.stage * 17);
  const top = b.top;
  const lobby = F.id === 'lobby';
  // string courses every few floors
  if (b.floorH >= 7) {
    for (let y = top + 4 + b.floorH * 3 - 1.5; y < base - 4; y += b.floorH * 3) {
      g.fillStyle = css(shade(col, -0.14), 0.75);
      g.fillRect(x, y, b.w, 1.3);
      g.fillStyle = css(INK, 0.25);
      g.fillRect(x, y + 1.3, b.w, 0.35);
    }
  }
  const deco = b.i % 5;
  const visTop = Math.max(top, F.glass.top + 4);
  if (deco === 0 && b.w > 50) {
    // a fire escape zig-zagging down the right-hand bay
    const fx = x + b.w * 0.62;
    const fw = b.w * 0.3;
    for (let y = visTop + 6; y < base - 10; y += b.floorH * 2) {
      g.fillStyle = 'rgba(60,48,44,0.85)';
      g.fillRect(fx, y + b.floorH * 0.6, fw, 0.9);
      for (let xx = fx; xx <= fx + fw; xx += 2.2) g.fillRect(xx, y + b.floorH * 0.6 - 2.4, 0.4, 2.4);
      g.fillRect(fx, y + b.floorH * 0.6 - 2.6, fw, 0.45);
      g.strokeStyle = 'rgba(60,48,44,0.85)';
      g.lineWidth = 0.55;
      g.beginPath();
      g.moveTo(fx + fw * 0.15, y + b.floorH * 0.6);
      g.lineTo(fx + fw * 0.85, y + b.floorH * 2.6);
      g.stroke();
    }
    if (R() < 0.9) {
      const py = visTop + 6 + b.floorH * 2 * (1 + ((R() * 2) | 0)) + b.floorH * 0.6;
      if (py < base - 14) {
        const T = traits(b.i * 3 + 1);
        g.save(); g.translate(fx + fw * 0.7, py); walker(g, T, 0, -1, 9, 0); g.restore();
      }
    }
  } else if (deco === 1) {
    // a vertical sign hung off the corner, ringed with bulbs
    const word = ['HOTEL', 'DINER', 'MOVIES', 'JAZZ'][b.i % 4];
    const sx = x + b.w - 3;
    const sy = Math.max(visTop + 4, top + 8);
    const sh = word.length * 6 + 6;
    if (sy + sh < base - 8) {
      line(g, sx - 2, sy + 3, sx + 3, sy + 3, 0.6, 0.85, b.i);
      line(g, sx - 2, sy + sh - 3, sx + 3, sy + sh - 3, 0.6, 0.85, b.i + 1);
      paint(g, rrPts(sx + 1, sy, 8, sh, 2), ['#d9574b', '#4d84c4', '#3c9f99', '#9a6cbd'][b.i % 4], { seed: b.i + 70, w: 0.6 });
      for (let j = 0; j < word.length; j++) letters(g, word[j], sx + 5, sy + 8.4 + j * 6, 4.4, { col: '#fbe9a8', seed: b.i + j, w: 0.75, bounce: 0.2 });
      for (let yy = sy + 1.6; yy < sy + sh - 1; yy += 2.6) { dot(g, sx + 2, yy, 0.45, '#fff3b0'); dot(g, sx + 8, yy, 0.45, '#fff3b0'); }
    }
  } else if (deco === 2) {
    // flags on poles
    const n = 2 + (b.w > 80 ? 1 : 0);
    const fy = Math.max(visTop + 8, top + 10);
    for (let j = 0; j < n; j++) {
      const fx = x + (b.w * (j + 0.6)) / (n + 0.2);
      if (fy > base - 12) break;
      line(g, fx, fy + 6, fx + 7, fy - 2, 0.6, 0.9, b.i + j);
      paint(g, [fx + 7, fy - 2, fx + 6.5, fy - 9.5, fx + 13, fy - 7, fx + 12.5, fy - 1], CLOTHES[(b.i + j * 2) % CLOTHES.length], { seed: b.i + j + 80, w: 0.5, blooms: 0 });
    }
  } else if (deco === 3 && b.w > 56) {
    // an old painted advert on the brickwork
    const ay = Math.max(visTop + 6, top + 6);
    if (ay + 18 < base - 6) {
      paint(g, rectPts(x + 6, ay, b.w - 12, 16), shade(col, 0.25), { seed: b.i + 90, w: 0.55, ia: 0.6, blooms: 2 });
      const word = ['EGG-O-MATIC', 'SUPER SOAP', 'DRINK POP'][b.i % 3];
      letters(g, word, x + b.w / 2, ay + 10.4, Math.min(6, (b.w - 18) / (word.length * 0.95)), { col: shade(['#d9574b', '#4d84c4', '#3c9f99'][b.i % 3], 0.15), seed: b.i, w: 1 });
      letters(g, 'FOR A BUSY DAY!', x + b.w / 2, ay + 14.6, 2.4, { col: '#6b4a2e', seed: b.i + 1, w: 0.45 });
    }
  } else if (deco === 4) {
    // window boxes in bloom along a couple of floors
    const cw = (b.w - 2) / b.cols;
    for (let y = top + 4 + b.floorH * 2; y < base - 6; y += b.floorH * 4) {
      if (y < visTop) continue;
      for (let c = 0; c < b.cols; c++) {
        const wx = x + 1 + c * cw + cw * 0.15;
        g.fillStyle = 'rgba(160,100,60,0.9)';
        g.fillRect(wx, y + b.floorH * 0.58, cw * 0.7, 1.2);
        for (let j = 0; j < 3; j++) dot(g, wx + cw * 0.12 + j * cw * 0.22, y + b.floorH * 0.55, 0.6, ['#d9574b', '#efb23a', '#de7c9c'][(c + j) % 3]);
      }
    }
  }
  // the rooftops (the open floor looks across at them): washing lines and a gardener
  if (!lobby && b.roof === 'flat' && b.w > 60) {
    const ly = top - 7;
    line(g, x + 8, top, x + 8, ly, 0.5, 0.85, b.i + 5);
    line(g, x + b.w - 10, top, x + b.w - 10, ly, 0.5, 0.85, b.i + 6);
    poly(g, [x + 8, ly, x + b.w / 2, ly + 1.5, x + b.w - 10, ly], 0.4, 0.8, b.i + 7);
    for (let j = 0; j < 5; j++) {
      const cx = x + 13 + j * ((b.w - 26) / 5);
      const cyy = ly + 1 + Math.sin((j / 5) * Math.PI) * 1.3;
      paint(g, rectPts(cx, cyy, 4, 4 + (j % 2) * 1.5), CLOTHES[(b.i + j * 3) % CLOTHES.length], { seed: b.i + j + 100, w: 0.4, blooms: 0, edge: 0.6 });
    }
  } else if (!lobby && b.roof === 'cornice' && b.w > 50) {
    for (let j = 0; j < 4; j++) {
      paint(g, rrPts(x + 6 + j * 7, top - 6, 5, 3.6, 1), '#c8704a', { seed: b.i + j + 110, w: 0.4, blooms: 0 });
      paint(g, elPts(x + 8.5 + j * 7, top - 7.4, 3, 2, 8), '#6aa456', { seed: b.i + j + 120, w: 0.4, blooms: 0 });
    }
    const T = traits(b.i + 7);
    g.save(); g.translate(x + b.w - 14, top - 3); walker(g, T, 1, -1, 11, 0); g.restore();
  }
}

function shopFront(g, b, x, base, sh, col, R) {
  const name = SHOP_NAMES[b.i % SHOP_NAMES.length];
  const top = base - sh;
  paint(g, rectPts(x + 1, top, b.w - 2, sh), shade(col, 0.1), { seed: b.i + 40, w: 0.6, blooms: 1 });
  // sign board
  paint(g, rrPts(x + 4, top + 1, b.w - 8, 6.5, 1.2), '#f6ecd0', { seed: b.i + 41, w: 0.6 });
  letters(g, name, x + b.w / 2, top + 6.2, 4, { col: AWNINGS[b.shop], seed: b.i + 3, w: 0.75 });
  // awning, striped and scalloped
  const ay = top + 9;
  const aw = b.w - 6;
  const pts = [x + 3, ay, x + 3 + aw, ay, x + 3 + aw + 2, ay + 4];
  const nS = Math.max(3, Math.round(aw / 7));
  for (let j = nS; j >= 0; j--) {
    const sx = x + 1 + ((aw + 4) * j) / nS;
    pts.push(sx, ay + 4, sx - (aw + 4) / nS / 2, ay + 6);
  }
  pts.push(x + 1, ay + 4);
  wash(g, wob(pts, true, 0.2, b.i + 42), '#fbf4e4', { seed: b.i + 42, blooms: 0, edge: 1 });
  g.save();
  g.beginPath();
  trace(g, pts, true);
  g.clip();
  g.fillStyle = css(AWNINGS[b.shop], 0.9);
  for (let sx = x; sx < x + b.w; sx += 6) g.fillRect(sx, ay - 1, 3, 9);
  g.restore();
  ink(g, wob(pts, true, 0.2, b.i + 43), true, 0.6, 0.85);
  // shop window with goods, and a door
  const wy = ay + 7;
  paint(g, rectPts(x + 4, wy, b.w * 0.55, base - wy - 1), '#a9cde0', { seed: b.i + 44, w: 0.55, blooms: 1 });
  for (let j = 0; j < 4; j++) dot(g, x + 7 + j * (b.w * 0.12), base - 3.2, 1.5, CLOTHES[(b.i + j * 3) % CLOTHES.length], 0.9);
  paint(g, rectPts(x + b.w * 0.68, wy - 1, 9, base - wy), shade(col, -0.25), { seed: b.i + 45, w: 0.55, blooms: 0 });
  dot(g, x + b.w * 0.68 + 7, base - 6, 0.6, '#e8c050');
}

function tree(g, x, y, s, seed) {
  const R = rng(seed);
  paint(g, [x - 1.6 * s, y, x - 1 * s, y - 18 * s, x + 1 * s, y - 18 * s, x + 1.6 * s, y], '#8a5d3a', { seed, w: 0.6, blooms: 0 });
  const blobs = [];
  for (let j = 0; j < 7; j++) {
    const a = (j / 7) * TAU;
    blobs.push([x + Math.cos(a) * 8 * s + (R() - 0.5) * 3, y - 27 * s + Math.sin(a) * 6 * s, (6 + R() * 2.5) * s]);
  }
  blobs.push([x, y - 28 * s, 8 * s]);
  // outline as the union's top envelope plus a rounded underside
  const pts = [];
  for (let j = 0; j < 40; j++) {
    const a = (j / 40) * TAU;
    let best = 0;
    for (const [bx, by, br] of blobs) {
      const dx = bx - x;
      const dy = by - (y - 27 * s);
      const proj = dx * Math.cos(a) + dy * Math.sin(a);
      const perp2 = dx * dx + dy * dy - proj * proj;
      if (perp2 < br * br) best = Math.max(best, proj + Math.sqrt(br * br - perp2));
    }
    pts.push(x + Math.cos(a) * best, y - 27 * s + Math.sin(a) * best);
  }
  paint(g, pts, '#79b25e', { seed: seed + 1, w: 0.65, grad: [0.12, -0.12], blooms: 4 });
  for (let j = 0; j < 6; j++) poly(g, elPts(x + (R() - 0.5) * 12 * s, y - 27 * s + (R() - 0.3) * 8 * s, 2.2 * s, 1.3 * s, 6, 0.2, Math.PI - 0.2), 0.45, 0.45, seed + 10 + j);
}

function lamp(g, x, y, seed) {
  paint(g, rectPts(x - 1, y - 40, 2, 40), '#3f6b5c', { seed, w: 0.5, blooms: 0, wa: 0.05 });
  paint(g, rrPts(x - 2.4, y - 3, 4.8, 3, 0.8), '#3f6b5c', { seed: seed + 1, w: 0.5, blooms: 0 });
  paint(g, [x - 3.4, y - 41, x + 3.4, y - 41, x + 2.4, y - 47, x - 2.4, y - 47], '#fbeaa8', { seed: seed + 2, w: 0.55, blooms: 0 });
  paint(g, [x - 4, y - 47, x + 4, y - 47, x, y - 50.5], '#3f6b5c', { seed: seed + 3, w: 0.55, blooms: 0 });
}

function street(g, F, P) {
  const st = F.outside.street;
  // far pavement in front of the shops, the road, the near kerb
  bandWash(g, 1200, st.far - 4, st.far + 0.5, '#e3dccb', 501, 20);
  bandWash(g, 1200, st.far + 0.5, st.near, '#8f98a4', 502, 30);
  bandWash(g, 1200, st.near, 205, '#d8d0bf', 503, 10);
  pline(g, 1200, st.far - 4, 0.5, 0.45, 504, 0.2);
  pline(g, 1200, st.far + 0.5, 0.7, 0.8, 505, 0.2);
  pline(g, 1200, st.near, 0.7, 0.8, 506, 0.2);
  g.fillStyle = 'rgba(250,244,220,0.85)';
  const mid = (st.far + st.near) / 2;
  for (let u = 0; u < 1200; u += 24) g.fillRect(u, mid - 0.4, 12, 0.9);
  // paving joints
  g.fillStyle = css(INK, 0.15);
  for (let u = 0; u < 1200; u += 9) g.fillRect(u, st.far - 4, 0.4, 4.5);
  // a zebra crossing and a manhole
  for (const zx of [330, 930]) {
    g.fillStyle = 'rgba(250,246,232,0.9)';
    for (let j = 0; j < 7; j++) g.fillRect(zx + j * 4, st.far + 1.5, 2.5, st.near - st.far - 3);
  }
  ink(g, elPts(640, mid + 4, 4, 1.1), true, 0.5, 0.5);
}

function streetLife(g, F) {
  // static street furniture on the far pavement: hydrant, post box, bench, newsstand,
  // the hot-dog cart, and pigeons pecking
  const y = F.outside.street.far - 1;
  const hyd = (x) => {
    paint(g, rrPts(x - 1.6, y - 5, 3.2, 5, 1), '#d9574b', { seed: x, w: 0.5, blooms: 0 });
    paint(g, elPts(x, y - 5.2, 1.8, 1, 8), '#d9574b', { seed: x + 1, w: 0.5, blooms: 0 });
  };
  const box = (x) => {
    paint(g, rrPts(x - 2.6, y - 8, 5.2, 8, 2), '#4d84c4', { seed: x, w: 0.5, blooms: 0 });
    line(g, x - 1.6, y - 5.5, x + 1.6, y - 5.5, 0.5, 0.8, x);
  };
  const bench = (x) => {
    paint(g, rrPts(x - 7, y - 4.5, 14, 1.8, 0.6), '#8a5d3a', { seed: x, w: 0.5, blooms: 0 });
    paint(g, rrPts(x - 7, y - 8, 14, 1.8, 0.6), '#8a5d3a', { seed: x + 1, w: 0.5, blooms: 0 });
    line(g, x - 6, y - 4, x - 6, y, 0.6, 0.8, x + 2);
    line(g, x + 6, y - 4, x + 6, y, 0.6, 0.8, x + 3);
  };
  const cart = (x) => {
    paint(g, rrPts(x - 9, y - 9, 18, 6, 1.5), '#f2f0e4', { seed: x, w: 0.55, blooms: 0 });
    letters(g, 'HOT DOGS', x, y - 4.6, 2.6, { col: '#d9574b', seed: 3, w: 0.5 });
    paint(g, [...elPts(x, y - 16, 11, 4, 12, Math.PI, TAU)], '#d9574b', { seed: x + 1, w: 0.55, blooms: 0 });
    g.fillStyle = 'rgba(250,246,230,0.9)';
    for (let j = -2; j <= 2; j++) g.fillRect(x + j * 4 - 1, y - 19.5, 2, 3.6);
    line(g, x, y - 16, x, y - 9, 0.5, 0.8, x + 2);
    for (const wx of [-5, 5]) { dot(g, x + wx, y - 1.5, 1.6, '#3b3b44'); dot(g, x + wx, y - 1.5, 0.6, '#c9c2b0'); }
  };
  const stand = (x) => {
    paint(g, rrPts(x - 7, y - 13, 14, 13, 1), '#5aa05a', { seed: x, w: 0.55, blooms: 1 });
    paint(g, rrPts(x - 6, y - 11, 12, 4.5, 0.5), '#f4ecd6', { seed: x + 1, w: 0.4, blooms: 0 });
    letters(g, 'NEWS', x, y - 7.4, 2.6, { col: '#d9574b', seed: 4, w: 0.5 });
    for (let j = 0; j < 3; j++) paint(g, rectPts(x - 5.5 + j * 4, y - 5.5, 3, 3.5), ['#f4ecd6', '#efb23a', '#f4ecd6'][j], { seed: x + 2 + j, w: 0.35, blooms: 0, edge: 0 });
  };
  const things = [[hyd, 120], [box, 205], [bench, 470], [cart, 700], [stand, 1010], [hyd, 1130], [bench, 860]];
  for (const [fn, u] of things) wrap(1200, u - 12, u + 12, (off) => fn(u + off));
  for (const [u, d] of [[262, 1], [270, -1], [585, 1], [790, -1], [800, 1], [1060, 1]]) wrap(1200, u - 4, u + 4, (off) => pigeon(g, u + off, y, 0.85, d, u));
}

function buildNear(F, k) {
  const G = F.glass;
  const P = PAL[F.id];
  const S = newStrip(1200, G.top, G.bottom, k);
  const g = S.g;
  const O = F.outside;
  for (const b of O.near) wrap(1200, b.u - 4, b.u + b.w + 4, (off) => nearBuilding(g, b, b.u + off, F, P), 30);
  if (O.street) {
    street(g, F, P);
    streetLife(g, F);
    for (const tr of O.trees) wrap(1200, tr.u - 20, tr.u + 20, (off) => tree(g, tr.u + off, O.street.far, tr.s, 600 + tr.u));
    for (const l of O.lamps) wrap(1200, l.u - 6, l.u + 6, (off) => lamp(g, l.u + off, O.street.far, 700 + l.u));
  }
  if (F.id === 'exec') {
    const hz = g.createLinearGradient(0, 150, 0, 205);
    hz.addColorStop(0, 'rgba(150,90,120,0)');
    hz.addColorStop(1, 'rgba(170,100,120,0.4)');
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = hz;
    g.fillRect(0, 150, 1200, 60);
    g.globalCompositeOperation = 'source-over';
  }
  return finishStrip(S, 0.8);
}

// ------------------------------------------------------------------ vehicles + flyers
function carSprite(kind, dir, seed, k) {
  const w = { cab: 30, car: 28, bus: 64 }[kind];
  const h = { cab: 13, car: 11, bus: 22 }[kind];
  return sprite(k, [-3, -h - 6, w + 6, h + 9], (g) => {
    g.save();
    if (dir < 0) { g.translate(w, 0); g.scale(-1, 1); }
    const S = { seed, w: 0.65, blooms: 1 };
    if (kind === 'bus') {
      paint(g, rrPts(0, -21, 64, 18.5, 3.5), '#d9574b', S);
      paint(g, rectPts(0.6, -10, 62.8, 2.6), '#f6ecd0', { ...S, seed: seed + 1, blooms: 0, edge: 0, w: 0.4 });
      for (let j = 0; j < 7; j++) {
        const wx = 4 + j * 7.6;
        paint(g, rrPts(wx, -18.5, 6, 6.5, 1), '#bfe0ee', { ...S, seed: seed + 2 + j, blooms: 0, w: 0.45 });
        if (j > 0 && j % 2 === 0 || j === 5) {
          const T = traits(seed * 7 + j);
          g.save();
          g.beginPath();
          g.rect(wx, -18.5, 6, 6.5);
          g.clip();
          head(g, wx + 3, -14, 2.1, T, { look: 0.6, w: 0.35, seed: j });
          g.restore();
        }
      }
      paint(g, rrPts(57.5, -18.5, 5, 15, 1), '#bfe0ee', { ...S, seed: seed + 12, blooms: 0, w: 0.45 });
      head(g, 59.8, -14.2, 2.2, traits(seed + 99), { look: 1, w: 0.35, seed: 3 });
      paint(g, rrPts(60, -6, 4, 2.4, 0.8), '#fbe27a', { ...S, seed: seed + 13, blooms: 0, w: 0.4 });
      for (const wx of [12, 50]) { paint(g, elPts(wx, -2.6, 3.3, 3.3), '#3b3b44', { ...S, seed: seed + wx, blooms: 0 }); dot(g, wx, -2.6, 1.3, '#c9c2b0'); }
    } else if (kind === 'cab') {
      paint(g, rrPts(6, -12.5, 17, 6.5, 2.5), '#f2c230', { ...S, seed: seed + 1 });
      paint(g, rrPts(8, -11.3, 6.2, 4.3, 1), '#bfe0ee', { ...S, seed: seed + 2, blooms: 0, w: 0.45 });
      paint(g, rrPts(15.2, -11.3, 6.2, 4.3, 1), '#bfe0ee', { ...S, seed: seed + 3, blooms: 0, w: 0.45 });
      g.save(); g.beginPath(); g.rect(15.2, -11.3, 6.2, 4.3); g.clip();
      head(g, 18.6, -8.6, 1.9, traits(seed + 4), { look: 1, w: 0.35, seed: 2 });
      g.restore();
      paint(g, rrPts(0, -7.6, 30, 6.4, 2.4), '#f2c230', S);
      g.fillStyle = css(INK, 0.8);
      for (let j = 0; j < 12; j++) if (j % 2 === 0) g.fillRect(2 + j * 2.2, -5.2, 1.1, 1.1);
      for (let j = 0; j < 12; j++) if (j % 2 === 1) g.fillRect(2 + j * 2.2, -4.1, 1.1, 1.1);
      paint(g, rrPts(12, -15.5, 6, 3, 0.8), '#f6ecd0', { ...S, seed: seed + 5, blooms: 0, w: 0.45 });
      dot(g, 29, -5, 0.9, '#fff3b0');
      for (const wx of [6.5, 23.5]) { paint(g, elPts(wx, -1.6, 2.5, 2.5), '#3b3b44', { ...S, seed: seed + wx, blooms: 0 }); dot(g, wx, -1.6, 0.9, '#c9c2b0'); }
    } else {
      paint(g, [...elPts(13, -6.5, 9.5, 5.5, 16, Math.PI, TAU)], '#4d84c4', { ...S, seed: seed + 1 });
      paint(g, rrPts(5.6, -10.6, 6.5, 3.6, 1.2), '#bfe0ee', { ...S, seed: seed + 2, blooms: 0, w: 0.45 });
      paint(g, rrPts(13.5, -10.6, 6.2, 3.6, 1.2), '#bfe0ee', { ...S, seed: seed + 3, blooms: 0, w: 0.45 });
      g.save(); g.beginPath(); g.rect(13.5, -10.6, 6.2, 3.6); g.clip();
      head(g, 16.6, -8.3, 1.8, traits(seed + 8), { look: 1, w: 0.35, seed: 4 });
      g.restore();
      paint(g, rrPts(0, -6.8, 28, 5.6, 2.6), '#4d84c4', S);
      dot(g, 27.3, -4.6, 0.9, '#fff3b0');
      for (const wx of [6, 21.5]) { paint(g, elPts(wx, -1.5, 2.4, 2.4), '#3b3b44', { ...S, seed: seed + wx, blooms: 0 }); dot(g, wx, -1.5, 0.9, '#c9c2b0'); }
    }
    g.restore();
    // lettering is never mirrored
    if (kind === 'bus') letters(g, 'CITY BUS', dir < 0 ? 64 - 24 : 24, -5.2, 3, { col: '#f6ecd0', seed: 7, w: 0.55 });
    if (kind === 'cab') letters(g, 'TAXI', 15, -13.6, 1.6, { seed: 6, w: 0.35 });
  }, 0.6);
}

function blimpSprite(F, dir, label, k) {
  return sprite(k, [-34, -14, 68, 28], (g) => {
    g.save();
    if (dir < 0) g.scale(-1, 1);
    paint(g, [-29, -2, -33, -8, -27, -6], '#c98a6a', { seed: 1, w: 0.55, blooms: 0 });
    paint(g, [-29, 2, -33, 8, -27, 6], '#c98a6a', { seed: 2, w: 0.55, blooms: 0 });
    paint(g, elPts(0, 0, 30, 9.5, 36), '#d9dde2', { seed: 3, w: 0.7, grad: [0.25, -0.12], blooms: 2 });
    paint(g, rrPts(-5, 8.5, 10, 3.5, 1.2), '#c98a6a', { seed: 4, w: 0.55, blooms: 0 });
    g.restore();
    letters(g, label, 0, 2.6, 5.6, { col: '#d9574b', seed: 9, w: 1 });
  }, 0.6);
}

function heliSprite(dir, k) {
  return sprite(k, [-18, -10, 36, 18], (g) => {
    g.save();
    if (dir < 0) g.scale(-1, 1);
    paint(g, [-3, -1, -15, -2.5, -15, 0.2, -3, 2], '#efb23a', { seed: 1, w: 0.55, blooms: 0 });
    paint(g, [-16, -5, -13.5, -5, -13.5, 0.5, -16, 0.5], '#d9574b', { seed: 2, w: 0.5, blooms: 0 });
    paint(g, elPts(3, 0, 8, 5, 18), '#efb23a', { seed: 3, w: 0.65, blooms: 1 });
    paint(g, [...elPts(5.5, -0.5, 4.5, 3.6, 12, -Math.PI / 2, Math.PI / 2), 5.5, 3.1], '#bfe0ee', { seed: 4, w: 0.5, blooms: 0 });
    line(g, -3, 6, 9, 6, 0.6, 0.85, 5);
    line(g, -1, 4, -1, 6, 0.5, 0.85, 6);
    line(g, 7, 4, 7, 6, 0.5, 0.85, 7);
    line(g, 3, -5, 3, -7, 0.7, 0.9, 8);
    g.restore();
  }, 0.6);
}

function cradleSprites(F, k) {
  const w = F.wall.cradle.w;
  const gondola = sprite(k, [-3, -3, w + 6, 16], (g) => {
    paint(g, rrPts(0, 0, w, 9, 1.4), '#efb23a', { seed: 1, w: 0.7 });
    letters(g, 'SPARKLE CO.', w / 2, 6.6, 3.2, { col: '#4d84c4', seed: 2, w: 0.6 });
    line(g, -1, -2, w + 1, -2, 0.8, 0.9, 3);
    for (let x = 2; x < w; x += 8) line(g, x, -2, x, 0, 0.5, 0.8, 4 + x);
    paint(g, rrPts(w - 12, -6, 6, 5, 1), '#9fb6c8', { seed: 5, w: 0.5, blooms: 0 });
    paint(g, rectPts(1, -6, 3, 6), '#b7c3c9', { seed: 6, w: 0.5, blooms: 0 });
    paint(g, rectPts(w - 4, -6, 3, 6), '#b7c3c9', { seed: 7, w: 0.5, blooms: 0 });
  });
  const T = { ...traits(77), shirt: '#6aa84f', hat: 1, style: 0 };
  const cleaner = sprite(k, [-8, -18, 16, 20], (g) => {
    paint(g, rrPts(-5, -9, 10, 10, 3), '#6aa84f', { ...SOFT, seed: 8, w: 0.5 });
    line(g, -3, -9, -3, 0, 0.5, 0.7, 9);
    line(g, 3, -9, 3, 0, 0.5, 0.7, 10);
    head(g, 0, -12, 3.4, T, { look: 0, w: 0.45, seed: 11 });
  });
  return { gondola, cleaner };
}

// ------------------------------------------------------------------ the back wall
function wallLobby(g, F, P, x0, x1, seed) {
  const top = F.ceilingY;
  const bot = WALL_BASE;
  paint(g, rectPts(x0, top, x1 - x0, bot - top), P.mortar, { line: false, edge: 0, blooms: 2, wa: 0 });
  const R = rng(seed);
  const plinth = 10;
  for (let row = 0, y = bot - plinth; y > top + 9; row++, y -= 21) {
    const yt = Math.max(top + 9, y - 21);
    const stag = row % 2 ? 22 : 0;
    for (let bx = x0 - stag; bx < x1; bx += 44) {
      const a = Math.max(x0, bx) + 0.6;
      const b = Math.min(x1, bx + 44) - 0.6;
      if (b - a < 3) continue;
      const col = shade(mix(P.wall, P.wall2, R()), (R() - 0.5) * 0.07);
      wash(g, wob(rectPts(a, yt + 0.6, b - a, y - yt - 1.2), true, 0.3, seed + row * 31 + bx), col, { seed: seed + row * 7 + bx, blooms: 2, edge: 1.6, edgeA: 0.8 });
    }
  }
  // the cornice and the plinth
  paint(g, rectPts(x0, top, x1 - x0, 9), P.trim, { seed: seed + 1, w: 0.7, ia: 0.7, blooms: 3, wa: 0.15 });
  g.fillStyle = css(shade(P.trim, -0.25), 0.6);
  for (let x = x0 + 2; x < x1 - 2; x += 4) g.fillRect(x, top + 5.5, 2, 2);
  paint(g, rectPts(x0, bot - plinth, x1 - x0, plinth), shade(P.trim, -0.06), { seed: seed + 2, w: 0.7, ia: 0.7, blooms: 3, wa: 0.15 });
}

function wallOpen(g, F, P, x0, x1, seed) {
  const top = F.ceilingY;
  paint(g, rectPts(x0, top, x1 - x0, WALL_BASE - top), P.wall, { line: false, edge: 0, blooms: 6, wa: 0, grad: [0.05, -0.04] });
  // a pale stripe paper above the dado
  g.fillStyle = css(shade(P.wall, -0.06), 0.35);
  for (let x = x0 + 4; x < x1 - 2; x += 10) g.fillRect(x, top + 2, 3, 146 - top);
  paint(g, rectPts(x0, 146, x1 - x0, 3), shade(P.wall, -0.18), { seed: seed + 3, w: 0.6, ia: 0.6, blooms: 0, wa: 0.1 });
  paint(g, rectPts(x0, WALL_BASE - 6, x1 - x0, 6), P.trim, { seed: seed + 4, w: 0.7, ia: 0.8, blooms: 2, wa: 0.1 });
}

function wallExec(g, F, P, x0, x1, seed) {
  const top = F.ceilingY;
  paint(g, rectPts(x0, top, x1 - x0, WALL_BASE - top), P.wall, { line: false, edge: 0, blooms: 5, wa: 0 });
  const n = Math.max(1, Math.round((x1 - x0) / 46));
  const pw = (x1 - x0) / n;
  const R = rng(seed);
  const panel = (px, py, w, h, s) => {
    paint(g, rectPts(px, py, w, h), shade(P.wall, -0.12), { seed: s, w: 0.6, ia: 0.6, blooms: 1, wa: 0.15 });
    paint(g, rectPts(px + 2.5, py + 2.5, w - 5, h - 5), P.wall2, { seed: s + 1, w: 0.55, ia: 0.55, blooms: 2, wa: 0.15, grad: [0.06, -0.06] });
    // grain
    for (let j = 0; j < 5; j++) {
      const gx = px + 4 + R() * (w - 8);
      const pts = [];
      for (let y = py + 4; y < py + h - 4; y += 3) pts.push(gx + Math.sin(y * 0.2 + j) * 1.2, y);
      ink(g, pts, false, 0.4, 0.14, shade(P.wall, -0.5));
    }
    line(g, px + 2.5, py + h - 2.5, px + w - 2.5, py + h - 2.5, 0.8, 0.25, s + 3, [255, 220, 170]);
  };
  for (let j = 0; j < n; j++) {
    const px = x0 + j * pw + 3;
    panel(px, top + 10, pw - 6, 132 - top, seed + j * 10);
    panel(px, 154, pw - 6, 38, seed + j * 10 + 5);
  }
  paint(g, rectPts(x0, top, x1 - x0, 6), P.trim, { seed: seed + 1, w: 0.7, ia: 0.7, blooms: 2, wa: 0.1 });
  paint(g, rectPts(x0, 146, x1 - x0, 5), P.trim, { seed: seed + 2, w: 0.7, ia: 0.7, blooms: 2, wa: 0.1 });
  paint(g, rectPts(x0, WALL_BASE - 8, x1 - x0, 8), P.trim, { seed: seed + 3, w: 0.7, ia: 0.7, blooms: 2, wa: 0.1 });
}

function wallStripPart(g, F, P, x0, x1, y0, y1, seed) {
  if (y1 - y0 < 0.5) return;
  const c = F.id === 'lobby' ? P.trim : F.id === 'exec' ? P.trim : P.wall;
  paint(g, rectPts(x0, y0, x1 - x0, y1 - y0), c, { seed, w: 0.7, ia: 0.7, blooms: 3, wa: 0.1 });
}

function glassBay(g, F, P, x0, x1, b, seed) {
  const G = F.glass;
  const cy = F.ceilingY;
  if (F.id === 'open') {
    paint(g, rectPts(x0, cy, x1 - x0, G.top - cy), P.wall, { line: false, edge: 0, blooms: 3, wa: 0 });
    g.fillStyle = css(shade(P.wall, -0.06), 0.35);
    for (let x = x0 + 4; x < x1 - 2; x += 10) g.fillRect(x, cy + 2, 3, G.top - cy - 2);
    // the sill, then the HVAC cover down to the skirting
    paint(g, rectPts(x0, G.bottom, x1 - x0, WALL_BASE - G.bottom), '#d5cab2', { seed: seed + 1, w: 0.6, ia: 0.7, blooms: 4 });
    for (let x = x0 + 6; x < x1 - 6; x += 30) {
      paint(g, rrPts(x, G.bottom + 10, 24, 30, 1.5), '#dbd1bb', { seed: seed + x, w: 0.5, ia: 0.45, blooms: 1 });
      for (let y = G.bottom + 14; y < G.bottom + 37; y += 3) line(g, x + 3, y, x + 21, y, 0.45, 0.18, seed + x + y);
    }
    paint(g, rectPts(x0, WALL_BASE - 6, x1 - x0, 6), P.trim, { seed: seed + 2, w: 0.7, ia: 0.8, blooms: 2, wa: 0.1 });
    paint(g, rrPts(x0 - 1, G.bottom - 1.5, x1 - x0 + 2, 4.5, 1), '#c9a27a', { seed: seed + 3, w: 0.7, blooms: 2 });
    // things on the sill: a cactus, a mug, a pile of folders
    const R = rng(seed + 9);
    for (let x = x0 + 14 + R() * 20; x < x1 - 14; x += 40 + R() * 50) {
      const kind = (R() * 3) | 0;
      const y = G.bottom - 1.5;
      if (kind === 0) {
        paint(g, rrPts(x - 2.5, y - 4, 5, 4, 0.8), '#c8704a', { seed: x, w: 0.5, blooms: 0 });
        paint(g, rrPts(x - 1.6, y - 10, 3.2, 6.5, 1.5), '#6aa84f', { seed: x + 1, w: 0.5, blooms: 0 });
      } else if (kind === 1) {
        paint(g, rrPts(x - 1.8, y - 4, 3.6, 4, 0.6), CLOTHES[(x | 0) % CLOTHES.length], { seed: x, w: 0.45, blooms: 0 });
      } else {
        for (let j = 0; j < 3; j++) paint(g, rectPts(x - 4, y - 1.4 * (j + 1), 8, 1.4), ['#efb23a', '#4d84c4', '#d9574b'][j], { seed: x + j, w: 0.35, blooms: 0, edge: 0 });
      }
    }
  } else if (F.id === 'lobby') {
    wallStripPart(g, F, P, x0, x1, cy, G.top, seed);
  } else {
    wallStripPart(g, F, P, x0, x1, cy, G.top, seed);
    wallStripPart(g, F, P, x0, x1, G.bottom, WALL_BASE, seed + 1);
  }
  // the glass: a faint tint and the picture-book glint in each pane
  const [tr, tg, tb, ta] = P.tint;
  g.fillStyle = `rgba(${tr},${tg},${tb},${ta})`;
  g.fillRect(x0, G.top, x1 - x0, G.bottom - G.top);
  const gl = F.id === 'exec' ? [255, 226, 190] : [255, 255, 255];
  for (let x = x0; x < x1 - 4; x += G.mullion) {
    const pw = Math.min(G.mullion, x1 - x);
    const y0 = G.top + 6;
    line(g, x + pw * 0.18, y0 + 14, x + pw * 0.18 + 10, y0 + 4, 1.1, 0.45, seed + x, gl);
    line(g, x + pw * 0.18 + 4, y0 + 16, x + pw * 0.18 + 12, y0 + 8, 0.6, 0.35, seed + x + 1, gl);
  }
  if (b.blinds > 0) {
    const h = (G.bottom - G.top) * b.blinds;
    for (let y = G.top + 1; y < G.top + h; y += 3) {
      g.fillStyle = css('#efe6cf', 0.95);
      g.fillRect(x0, y, x1 - x0, 2.1);
      g.fillStyle = css(INK, 0.18);
      g.fillRect(x0, y + 2.1, x1 - x0, 0.35);
    }
    paint(g, rectPts(x0, G.top + h - 1, x1 - x0, 2.4), '#d9cfb4', { seed: seed + 5, w: 0.55, blooms: 0, wa: 0.05 });
    for (let x = x0 + 16; x < x1; x += 50) line(g, x, G.top, x, G.top + h + 5, 0.4, 0.5, seed + x);
  }
  // mullions, rails and (lobby) the transom
  const mc = P.mullion;
  const mw = F.id === 'exec' ? 1.6 : 2.2;
  const bar = (x, y, w, h, s) => paint(g, rectPts(x, y, w, h), mc, { seed: s, w: 0.55, ia: 0.85, blooms: 0, wa: 0.08, la: 0.1, edge: 0.6 });
  for (let x = x0; x <= x1 + 0.5; x += G.mullion) bar(Math.min(x, x1) - mw / 2, G.top, mw, G.bottom - G.top, seed + x);
  bar(x0, G.top - 1, x1 - x0, 2.4, seed + 2);
  bar(x0, G.bottom - 1.4, x1 - x0, 2.4, seed + 3);
  if (G.transom) bar(x0, G.transom - 1.2, x1 - x0, 2.6, seed + 4);
}

function column(g, F, P, x, w, seed) {
  const top = F.ceilingY;
  const bot = WALL_BASE;
  if (F.id === 'lobby') {
    paint(g, rectPts(x, top, w, bot - top), P.column, { seed, w: 0.75, grad: [0.05, -0.06], blooms: 3 });
    g.fillStyle = 'rgba(255,248,230,0.35)';
    g.fillRect(x + 2, top + 10, 2.4, bot - top - 22);
    g.fillStyle = css(INK, 0.1);
    g.fillRect(x + w - 3, top + 10, 2, bot - top - 22);
    paint(g, rrPts(x - 2, top, w + 4, 8, 1), shade(P.column, -0.05), { seed: seed + 1, w: 0.7 });
    paint(g, rrPts(x - 2, bot - 9, w + 4, 9, 1), shade(P.column, -0.08), { seed: seed + 2, w: 0.7 });
  } else if (F.id === 'open') {
    paint(g, rectPts(x, top, w, bot - top), P.column, { seed, w: 0.75, grad: [0.04, -0.06], blooms: 3 });
    g.fillStyle = css(INK, 0.08);
    g.fillRect(x + w - 4, top, 3, bot - top);
    paint(g, rectPts(x, bot - 6, w, 6), P.trim, { seed: seed + 1, w: 0.7, blooms: 0 });
    if (seed % 3 === 0) {
      paint(g, rrPts(x + w / 2 - 2.5, 120, 5, 6, 1), '#d9574b', { seed: seed + 2, w: 0.5, blooms: 0 });
      letters(g, 'FIRE', x + w / 2, 118, 2, { seed: 4, w: 0.4, col: '#d9574b' });
    }
  } else {
    paint(g, rectPts(x, top, w, bot - top), P.column, { seed, w: 0.75, grad: [0.06, -0.08], blooms: 3 });
    for (let j = 0; j < 3; j++) line(g, x + 3 + j * 5, top + 8, x + 3 + j * 5 + Math.sin(j) * 1.5, bot - 10, 0.5, 0.18, seed + j, [30, 16, 8]);
    paint(g, rectPts(x - 1, top, w + 2, 5), '#d1a64a', { seed: seed + 1, w: 0.6, blooms: 0 });
    paint(g, rectPts(x - 1, 140, w + 2, 3), '#d1a64a', { seed: seed + 2, w: 0.5, blooms: 0 });
    paint(g, rectPts(x - 1, bot - 7, w + 2, 7), '#d1a64a', { seed: seed + 3, w: 0.6, blooms: 0 });
  }
}

// ---- things on the wall (the still parts)
function liftStatic(g, F, P, h, seed, buttons) {
  const { x, y, w } = h;
  const hh = h.h;
  paint(g, rrPts(x - 4, y - 4, w + 8, hh + 4, 1.6), P.liftFrame, { seed, w: 0.8, blooms: 2, grad: [0.1, -0.08] });
  paint(g, rectPts(x, y, w, hh), P.liftCar, { seed: seed + 1, w: 0.6, blooms: 2, grad: [0.12, -0.1] });
  line(g, x + 3, y + hh * 0.55, x + w - 3, y + hh * 0.55, 0.9, 0.5, seed + 2, [150, 110, 60]);
  for (let j = 1; j < 3; j++) line(g, x + (w * j) / 3, y + 4, x + (w * j) / 3, y + hh - 4, 0.45, 0.25, seed + 3 + j);
  // the indicator over the doors
  paint(g, rrPts(x + w / 2 - 9, y - 16, 18, 10, 2.2), '#4a3a2e', { seed: seed + 6, w: 0.7, blooms: 0 });
  letters(g, h.label, x + w / 2 + 1.5, y - 8.2, 6, { col: '#ffb54a', seed: seed + 7, w: 1, bounce: 0.3 });
  paint(g, [x + w / 2 - 6.5, y - 9, x + w / 2 - 4.5, y - 13, x + w / 2 - 2.5, y - 9], '#6b5a4a', { seed: seed + 8, w: 0.4, blooms: 0, edge: 0, mis: 0 });
  if (buttons) {
    paint(g, rrPts(x + w + 6, y + hh * 0.45, 4, 9, 1), '#c9b38a', { seed: seed + 9, w: 0.5, blooms: 0 });
    dot(g, x + w + 8, y + hh * 0.45 + 2.6, 0.9, '#f6ecd0');
    dot(g, x + w + 8, y + hh * 0.45 + 6.2, 0.9, '#f6ecd0');
  }
}

function doorSprites(F, P, w, h, k) {
  const half = w / 2;
  const make = (side) => sprite(k, [-1, -1, half + 2, h + 2], (g) => {
    paint(g, rectPts(0, 0, half, h), P.liftDoor, { seed: side + 3, w: 0.7, blooms: 2, grad: [0.12, -0.12] });
    g.fillStyle = 'rgba(255,255,250,0.35)';
    g.fillRect(side ? half - 4 : 2, 4, 1.4, h - 8);
    line(g, side ? 0.6 : half - 0.6, 2, side ? 0.6 : half - 0.6, h - 2, 0.6, 0.5, side + 8);
  });
  return [make(0), make(1)];
}

function clockFace(g, cx, cy, r, seed, rim = '#d9574b') {
  paint(g, elPts(cx, cy, r + 1.6, r + 1.6), rim, { seed, w: 0.7, blooms: 0 });
  paint(g, elPts(cx, cy, r, r), '#fbf6e6', { seed: seed + 1, w: 0.55, blooms: 0, edge: 1 });
  for (let j = 0; j < 12; j++) {
    const a = (j / 12) * TAU;
    const l = j % 3 === 0 ? 0.72 : 0.82;
    line(g, cx + Math.sin(a) * r * l, cy - Math.cos(a) * r * l, cx + Math.sin(a) * r * 0.92, cy - Math.cos(a) * r * 0.92, j % 3 === 0 ? 0.7 : 0.45, 0.8, seed + j);
  }
}

function logo(g, x, y, w, h, P) {
  // two brass picture lamps washing the sign with warm light
  for (const lx of [x + 34, x + w - 26]) {
    const gr = g.createLinearGradient(0, 30, 0, y + h + 14);
    gr.addColorStop(0, 'rgba(255,236,170,0.4)');
    gr.addColorStop(1, 'rgba(255,236,170,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(lx - 3, 31); g.lineTo(lx + 3, 31); g.lineTo(lx + 30, y + h + 14); g.lineTo(lx - 30, y + h + 14);
    g.closePath();
    g.fill();
    paint(g, rrPts(lx - 1, 24, 2, 4, 0.6), '#c49a40', { seed: lx, w: 0.5, blooms: 0 });
    paint(g, [lx - 4, 28, lx + 4, 28, lx + 3, 32, lx - 3, 32], '#d6aa4e', { seed: lx + 1, w: 0.55, blooms: 0 });
  }
  const ex = x + 22;
  const ey = y + h / 2;
  glow(g, ex, ey, 30, [255, 236, 170], 0.45);
  paint(g, eggPts(ex, ey, 15, 21, 36), '#f4c94e', { seed: 801, w: 1.1, grad: [0.3, -0.12], blooms: 3, edge: 3 });
  g.fillStyle = 'rgba(255,252,236,0.75)';
  g.beginPath(); g.ellipse(ex - 5, ey - 9, 3.2, 5.5, -0.3, 0, TAU); g.fill();
  // a smart red bow tie on the egg
  paint(g, [ex - 7, ey + 6, ex - 1, ey + 8.5, ex - 7, ey + 11], '#d9574b', { seed: 802, w: 0.7, blooms: 0 });
  paint(g, [ex + 7, ey + 6, ex + 1, ey + 8.5, ex + 7, ey + 11], '#d9574b', { seed: 803, w: 0.7, blooms: 0 });
  paint(g, elPts(ex, ey + 8.5, 1.6, 1.6, 8), '#b8443a', { seed: 804, w: 0.6, blooms: 0 });
  const lx = x + 44 + (w - 44) / 2;
  letters(g, 'EGGCORP', lx + 1.2, y + h / 2 + 10.2, 17, { col: shade('#4d84c4', -0.5), seed: 805, w: 3.4, outline: 0, a: 0.25, bounce: 0.6 });
  letters(g, 'EGGCORP', lx, y + h / 2 + 9, 17, { col: '#3e6fb4', seed: 805, w: 3.0, outline: 0.9, bounce: 0.6 });
  letters(g, 'EGGS-CELLENCE SINCE 1952', lx, y + h - 2, 3.6, { col: '#8a5a2e', seed: 806, w: 0.6 });
}

function painting(g, x, y, w, h, variant, seed) {
  paint(g, rectPts(x, y, w, h), '#d1a64a', { seed, w: 0.8, blooms: 1 });
  const ix = x + 3.5;
  const iy = y + 3.5;
  const iw = w - 7;
  const ih = h - 7;
  if (variant === 1) {
    paint(g, rectPts(ix, iy, iw, ih), '#a9d2ec', { seed: seed + 1, w: 0.5, blooms: 1, grad: [0.15, -0.05] });
    g.save(); g.beginPath(); g.rect(ix, iy, iw, ih); g.clip();
    dot(g, ix + iw * 0.75, iy + ih * 0.22, 3, '#fbe27a');
    const R = rng(seed);
    for (let bx = ix; bx < ix + iw; bx += 5 + R() * 3) {
      const bh = ih * (0.3 + R() * 0.45);
      paint(g, rectPts(bx, iy + ih - bh, 5, bh + 1), CLOTHES[(R() * CLOTHES.length) | 0], { seed: seed + bx, w: 0.4, blooms: 0, wa: 0.1 });
    }
    g.restore();
  } else {
    paint(g, rectPts(ix, iy, iw, ih), '#f3ead2', { seed: seed + 1, w: 0.5, blooms: 1 });
    paint(g, elPts(ix + iw * 0.3, iy + ih * 0.42, ih * 0.26, ih * 0.26), '#d9574b', { seed: seed + 2, w: 0.5 });
    paint(g, [ix + iw * 0.5, iy + ih * 0.85, ix + iw * 0.72, iy + ih * 0.15, ix + iw * 0.92, iy + ih * 0.85], '#efb23a', { seed: seed + 3, w: 0.5 });
    paint(g, rectPts(ix + iw * 0.12, iy + ih * 0.62, iw * 0.3, ih * 0.26), '#4d84c4', { seed: seed + 4, w: 0.5 });
    poly(g, [ix + 3, iy + 4, ix + iw * 0.4, iy + ih * 0.2, ix + iw - 4, iy + 5], 0.6, 0.7, seed + 5);
  }
}

function poster(g, x, y, w, h, label, seed) {
  paint(g, rectPts(x, y, w, h), '#fbf4e2', { seed, w: 0.7, blooms: 1 });
  const ix = x + 2.5;
  const iy = y + 2.5;
  const iw = w - 5;
  const ih = h - 11;
  if (label === 'SYNERGY') {
    paint(g, rectPts(ix, iy, iw, ih), '#f6c27a', { seed: seed + 1, w: 0.4, blooms: 1, grad: [0.1, -0.1] });
    for (const [gx, gy, r, c] of [[ix + iw * 0.36, iy + ih * 0.42, 6.5, '#4d84c4'], [ix + iw * 0.68, iy + ih * 0.66, 5, '#d9574b']]) {
      const pts = [];
      for (let j = 0; j < 32; j++) {
        const a = (j / 32) * TAU;
        const rr = j % 4 < 2 ? r : r * 0.74;
        pts.push(gx + Math.cos(a) * rr, gy + Math.sin(a) * rr);
      }
      paint(g, pts, c, { seed: seed + gx, w: 0.5, blooms: 0, wa: 0.05, la: 0.05 });
      dot(g, gx, gy, r * 0.28, '#fbf4e2');
    }
  } else if (label === 'HANG IN THERE') {
    paint(g, rectPts(ix, iy, iw, ih), '#a9d2ec', { seed: seed + 1, w: 0.4, blooms: 1 });
    poly(g, [ix, iy + 6, ix + iw * 0.6, iy + 8, ix + iw, iy + 5], 1.4, 0.9, seed + 2, [120, 84, 50]);
    paint(g, elPts(ix + iw * 0.48, iy + 16, 4.5, 5.5), '#e9a85a', { seed: seed + 3, w: 0.5 });
    paint(g, elPts(ix + iw * 0.48, iy + 12.5, 3.6, 3.2), '#e9a85a', { seed: seed + 4, w: 0.5 });
    paint(g, [ix + iw * 0.48 - 3.2, iy + 11, ix + iw * 0.48 - 2.6, iy + 8.4, ix + iw * 0.48 - 1.2, iy + 10], '#e9a85a', { seed: seed + 5, w: 0.45, blooms: 0 });
    paint(g, [ix + iw * 0.48 + 3.2, iy + 11, ix + iw * 0.48 + 2.6, iy + 8.4, ix + iw * 0.48 + 1.2, iy + 10], '#e9a85a', { seed: seed + 6, w: 0.45, blooms: 0 });
    poly(g, [ix + iw * 0.48 - 2.4, iy + 12, ix + iw * 0.48 - 3.4, iy + 7.2], 0.9, 0.85, seed + 7, [233, 168, 90]);
    poly(g, [ix + iw * 0.48 + 2.4, iy + 12, ix + iw * 0.48 + 3.6, iy + 7.4], 0.9, 0.85, seed + 8, [233, 168, 90]);
    dot(g, ix + iw * 0.48 - 1.3, iy + 12.4, 0.45, INK);
    dot(g, ix + iw * 0.48 + 1.3, iy + 12.4, 0.45, INK);
  } else {
    paint(g, rectPts(ix, iy, iw, ih), '#9fd0c8', { seed: seed + 1, w: 0.4, blooms: 1 });
    paint(g, [ix + 2, iy + ih * 0.62, ix + iw - 2, iy + ih * 0.62, ix + iw - 5, iy + ih * 0.8, ix + 5, iy + ih * 0.8], '#d9574b', { seed: seed + 2, w: 0.5, blooms: 0 });
    for (let j = 0; j < 3; j++) {
      const T = traits(seed + j * 5);
      head(g, ix + 7 + j * 8, iy + ih * 0.5, 2.4, T, { w: 0.35, seed: j, look: 0.5 });
      poly(g, [ix + 9 + j * 8, iy + ih * 0.56, ix + 12 + j * 8, iy + ih * 0.7], 0.5, 0.8, seed + 9 + j);
    }
    poly(g, [ix + 4, iy + ih * 0.84, ix + iw - 4, iy + ih * 0.84], 0.5, 0.5, seed + 15, [60, 110, 160]);
  }
  const cap = Math.min(4.2, (w - 4) / (label.length * 0.95));
  letters(g, label, x + w / 2, y + h - 3.2, cap, { col: '#3b2a1e', seed: seed + 20, w: Math.max(0.5, cap * 0.18) });
  dot(g, x + w / 2, y + 1.2, 0.9, '#d9574b');
}

function whiteboard(g, x, y, w, h, seed) {
  paint(g, rrPts(x - 2, y - 2, w + 4, h + 4, 1), '#b9c0c6', { seed, w: 0.7, blooms: 0 });
  paint(g, rectPts(x, y, w, h), '#f6f4ec', { seed: seed + 1, w: 0.5, blooms: 2, edge: 1.4 });
  poly(g, [x + 8, y + 8, x + 8, y + h - 8, x + w - 6, y + h - 8], 0.6, 0.7, seed + 2);
  poly(g, [x + 10, y + h - 14, x + 22, y + h - 19, x + 32, y + h - 16, x + 46, y + h - 28, x + 58, y + h - 26, x + 74, y + h - 42], 1.1, 0.95, seed + 3, [216, 76, 64], 0.5);
  poly(g, [x + 68, y + h - 43, x + 75, y + h - 43, x + 73, y + h - 37], 1, 0.95, seed + 4, [216, 76, 64]);
  letters(g, 'Q1 Q2 Q3 Q4', x + 40, y + h - 3, 3, { col: '#4d84c4', seed: seed + 5, w: 0.5 });
  letters(g, 'PROFIT!', x + 24, y + 13, 4.2, { col: '#3c9f99', seed: seed + 6, w: 0.7 });
  paint(g, rectPts(x + w * 0.3, y + h + 1, w * 0.4, 2.4), '#9aa4ac', { seed: seed + 7, w: 0.5, blooms: 0 });
  for (let j = 0; j < 3; j++) paint(g, rrPts(x + w * 0.34 + j * 6, y + h - 0.2, 4.5, 1.6, 0.6), ['#d9574b', '#4d84c4', '#3c9f99'][j], { seed: seed + 8 + j, w: 0.35, blooms: 0, edge: 0 });
}

function officeDoor(g, F, x, y, w, h, label, seed) {
  const exec = F.id === 'exec';
  paint(g, rectPts(x - 3, y - 3, w + 6, h + 3), exec ? '#5a311a' : '#c9b38a', { seed, w: 0.75, blooms: 1 });
  paint(g, rectPts(x, y, w, h), exec ? '#7a4426' : '#d39a5e', { seed: seed + 1, w: 0.65, blooms: 3, grad: [0.08, -0.08] });
  paint(g, rectPts(x + 4, y + 6, w - 8, h * 0.36), shade(exec ? '#7a4426' : '#d39a5e', -0.08), { seed: seed + 2, w: 0.5, ia: 0.6, blooms: 1 });
  paint(g, rectPts(x + 4, y + h * 0.52, w - 8, h * 0.4), shade(exec ? '#7a4426' : '#d39a5e', -0.08), { seed: seed + 3, w: 0.5, ia: 0.6, blooms: 1 });
  dot(g, x + w - 5, y + h * 0.5, 1.4, '#e8c050');
  ink(g, elPts(x + w - 5, y + h * 0.5, 1.4, 1.4, 8), true, 0.4, 0.7);
  const pw = Math.min(w - 4, 4 + label.length * 2.4);
  paint(g, rrPts(x + w / 2 - pw / 2, y + h * 0.42, pw, 6, 1), exec ? '#e8c050' : '#f6ecd0', { seed: seed + 4, w: 0.5, blooms: 0 });
  letters(g, label, x + w / 2, y + h * 0.42 + 4.6, label.length > 4 ? 2.6 : 3.6, { seed: seed + 5, w: 0.5 });
  if (label === 'MEETING 4B') {
    paint(g, rrPts(x + w / 2 - 8, y - 11, 16, 6, 1.5), '#4a3a2e', { seed: seed + 6, w: 0.5, blooms: 0 });
    letters(g, 'IN USE', x + w / 2, y - 6.6, 3, { col: '#ff6a52', seed: seed + 7, w: 0.55, bounce: 0.3 });
  }
}

function extinguisher(g, x, y, w, h, seed) {
  letters(g, 'FIRE', x + w / 2, y - 3, 2.6, { col: '#d9574b', seed, w: 0.5 });
  paint(g, rectPts(x - 1.5, y + h * 0.3, w + 3, 2), '#7a7a80', { seed: seed + 1, w: 0.45, blooms: 0 });
  paint(g, rrPts(x, y + 2, w, h - 2, 2.5), '#d9574b', { seed: seed + 2, w: 0.6, grad: [0.15, -0.1] });
  paint(g, rrPts(x + 1.5, y - 1, w - 3, 3.5, 1), '#3b3b44', { seed: seed + 3, w: 0.5, blooms: 0 });
  poly(g, [x + w - 1, y + 1, x + w + 2, y + 4, x + w + 2, y + h * 0.7], 0.8, 0.9, seed + 4);
}

// DON K. EGGSHELL PHD, THE SILVER PROFESSOR (the shipped villain since 4 Sep: see "Don K.
// Eggshell, the professor" in src/sprites/props.js), in this style's ink and wash: a wild
// mane of silver locks in three greys rooted in an egg-on-end head, thick cross brows, fine
// rectangular specs, a big drooping silver moustache over a grey stubble chin and a flat
// frown, a white wing collar and a black cape whose red-lined collar stands up behind him.
// (hx, hy) is the head's centre; `bottom` is where the canvas ends.
const PRO_LOCKS = {
  back: [[-158, 0.85, 15, 14], [-172, 0.7, 13, 18], [166, 0.62, 14, 26], [148, 0.5, 15, 30],
    [-26, 0.8, 14, -16], [-8, 0.72, 13, -20], [12, 0.6, 14, -26], [32, 0.48, 15, -30]],
  front: [[-128, 1.05, 19, 22], [-104, 1.18, 18, 20], [-80, 1.0, 17, 16], [-58, 0.82, 17, 10],
    [-146, 0.62, 14, 26], [-38, 0.56, 14, 8]],
};
const PRO_GREYS = [['#dfe2ea', '#c6cbd9'], ['#cdd3e0', '#b1b9ca'], ['#bcc3d2', '#a0a8bb']];

function professorHeadPts(cx, cy, rx, ry, n = 36) {
  // an egg on its end: widest above centre, the chin a round point
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const sy = Math.sin(a);
    const y = cy - 0.16 * ry + sy * ry * (sy > 0 ? 1.16 : 0.84);
    const k = sy > 0 ? 1 - 0.3 * sy * sy : 1;
    out.push(cx + Math.cos(a) * rx * k, y);
  }
  return out;
}

function professor(g, hx, hy, bottom) {
  const rx = 9.2;
  const ry = 10.6;
  const SKIN = '#eec9a8';
  const INKP = { w: 0.55, ia: 0.7, wa: 0.12, la: 0.1, mis: 0.15 };
  // the cape's high collar, red inside, standing up behind his shoulders
  for (const sd of [-1, 1]) {
    const X = (v) => hx + sd * v;
    const lining = [X(3), hy + 15, X(19.5), hy + 10, X(19.5), hy - 7, X(15), hy + 2.5, X(7), hy + 7.5];
    paint(g, lining, '#b8202a', { ...INKP, seed: 960 + sd, blooms: 2, grad: [0.12, -0.12] });
    const edge = [X(5), hy + 17, X(21.6), hy + 11.5, X(21.4), hy - 8.4, X(19.5), hy - 7, X(19.5), hy + 10, X(3), hy + 15];
    paint(g, edge, '#23232e', { ...INKP, seed: 962 + sd, blooms: 0 });
  }
  // shoulders under the cape, running off the bottom of the canvas
  paint(g, rrPts(hx - 17, hy + 10, 34, bottom - hy - 6, 9), '#23232e', { ...INKP, seed: 964, blooms: 2, grad: [0.1, -0.1] });
  line(g, hx - 10, hy + 13, hx - 13, bottom, 0.5, 0.3, 965, [120, 120, 140]);
  line(g, hx + 10, hy + 13, hx + 13, bottom, 0.5, 0.3, 966, [120, 120, 140]);
  // the mane: locks rooted inside the skull, growing out through it, back ones shaded
  const scx = hx;
  const scy = hy - 0.8;
  const srx = rx * 0.98;
  const sry = ry * 0.93;
  const lock = (l, fill, seed) => {
    const [deg, len, spread, curl] = l;
    const R = Math.PI / 180;
    const P = (d, kk) => [scx + Math.cos(d * R) * srx * kk, scy + Math.sin(d * R) * sry * kk];
    const tip = deg + curl;
    const a0 = P(deg - spread, 0.86);
    const c0 = P(deg - spread * 0.5, 1 + len * 0.55);
    const t = P(tip, 1 + len);
    const c1 = P(deg + spread * 1.15, 1 + len * 0.3);
    const a1 = P(deg + spread, 0.86);
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const u = i / 8;
      pts.push((1 - u) * (1 - u) * a0[0] + 2 * (1 - u) * u * c0[0] + u * u * t[0], (1 - u) * (1 - u) * a0[1] + 2 * (1 - u) * u * c0[1] + u * u * t[1]);
    }
    for (let i = 1; i <= 8; i++) {
      const u = i / 8;
      pts.push((1 - u) * (1 - u) * t[0] + 2 * (1 - u) * u * c1[0] + u * u * a1[0], (1 - u) * (1 - u) * t[1] + 2 * (1 - u) * u * c1[1] + u * u * a1[1]);
    }
    paint(g, pts, fill, { ...INKP, seed, blooms: 1, edge: 1.2, ia: 0.6 });
    // a strand or two drawn into the lock
    const m = [(a0[0] + a1[0]) / 2, (a0[1] + a1[1]) / 2];
    poly(g, [m[0], m[1], (m[0] + t[0]) / 2 + (c0[0] - c1[0]) * 0.08, (m[1] + t[1]) / 2 + (c0[1] - c1[1]) * 0.08, t[0] * 0.85 + m[0] * 0.15, t[1] * 0.85 + m[1] * 0.15], 0.35, 0.3, seed + 3, [120, 128, 150]);
  };
  PRO_LOCKS.back.forEach((l, i) => lock(l, PRO_GREYS[i % 3][1], 970 + i));
  PRO_LOCKS.front.forEach((l, i) => lock(l, PRO_GREYS[i % 3][0], 980 + i));
  // ears, then the egg of a head
  for (const sd of [-1, 1]) {
    paint(g, elPts(hx + sd * rx * 0.97, hy + 0.2, 1.8, 2.5, 12), SKIN, { ...INKP, seed: 990 + sd, blooms: 0 });
    poly(g, elPts(hx + sd * rx * 0.99, hy + 0.2, 0.8, 1.3, 6, sd > 0 ? -1.9 : 1.2, sd > 0 ? 1.5 : 4.6), 0.35, 0.4, 992 + sd);
  }
  const headPts = professorHeadPts(hx, hy, rx, ry);
  paint(g, headPts, SKIN, { ...INKP, seed: 994, blooms: 2, grad: [0.08, -0.06], edge: 1.8 });
  // grey stubble on the jaw, a silver patch on the chin
  g.save();
  g.beginPath(); trace(g, headPts, true); g.clip();
  g.fillStyle = 'rgba(201,171,147,0.55)';
  g.beginPath();
  g.moveTo(hx - rx, hy + 2.4); g.quadraticCurveTo(hx, hy + 4.4, hx + rx, hy + 2.4); g.lineTo(hx + rx, hy + ry + 2); g.lineTo(hx - rx, hy + ry + 2);
  g.closePath(); g.fill();
  g.fillStyle = 'rgba(214,219,230,0.75)';
  g.beginPath();
  g.moveTo(hx - 3.2, hy + 6.4); g.quadraticCurveTo(hx, hy + 7.6, hx + 3.2, hy + 6.4); g.quadraticCurveTo(hx + 2.8, hy + 9.8, hx, hy + 10.6); g.quadraticCurveTo(hx - 2.8, hy + 9.8, hx - 3.2, hy + 6.4);
  g.closePath(); g.fill();
  g.fillStyle = 'rgba(120,96,80,0.35)';
  for (let i = 0; i < 40; i++) { const a = hash(i * 3.3) * Math.PI; const r = 4 + hash(i * 7.1) * 5; g.fillRect(hx + Math.cos(a) * r * 0.9 - 0.15, hy + 3.4 + Math.sin(a) * r * 0.75 - 0.15, 0.3, 0.3); }
  g.restore();
  // a long nose
  paint(g, elPts(hx, hy + 0.5, 1.15, 1.9, 10), '#e0b68e', { ...INKP, seed: 995, blooms: 0, edge: 0.6, ia: 0.45 });
  // fine rectangular specs, the heavy bar along the top
  const sy = hy - 1.6;
  for (const sd of [-1, 1]) {
    const lx = hx + sd * 3.65;
    const lens = [lx - 2.9, sy - 1.6, lx + 2.9, sy - 1.6, lx + 2.6 * (sd > 0 ? 1 : 0.9), sy + 1.2, lx + 1.8, sy + 1.75, lx - 1.8, sy + 1.75, lx - 2.6 * (sd > 0 ? 0.9 : 1), sy + 1.2];
    paint(g, lens, '#c8e0f8', { seed: 996 + sd, w: 0.45, ia: 0.85, ic: [61, 61, 72], wa: 0.05, la: 0.05, mis: 0, blooms: 0, edge: 0.6 });
    dot(g, lx - sd * 0.15, sy + 0.1, 0.55, INK);
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.fillRect(lx - 2.2, sy - 1.1, 1.1, 0.5);
    poly(g, [lx + sd * 2.9, sy - 1.2, hx + sd * rx * 0.92, sy - 0.2], 0.35, 0.7, 998 + sd, [61, 61, 72]);
  }
  ink(g, [hx - 6.7, sy - 1.75, hx + 6.7, sy - 1.75], false, 0.75, 0.95, [61, 61, 72]);
  // thick, cross silver brows: the inner ends pulled down
  for (const sd of [-1, 1]) {
    const X = (v) => hx + sd * v;
    const brow = [X(1.2), sy - 2.6, X(3.4), sy - 4.2, X(6.6), sy - 5.0, X(6.9), sy - 4.0, X(3.6), sy - 2.9, X(1.4), sy - 1.9];
    paint(g, brow, '#dfe2ea', { ...INKP, seed: 1000 + sd, blooms: 0, edge: 0.6, ia: 0.6 });
  }
  // the big drooping silver moustache, a flat frown under it
  const my = hy + 3.4;
  for (const sd of [-1, 1]) {
    const X = (v) => hx + sd * v;
    const st = [X(0), my - 0.9, X(2.6), my - 1.4, X(5.2), my - 0.6, X(7.2), my + 1.4, X(7.4), my + 2.8,
      X(6.2), my + 2.4, X(4.4), my + 1.9, X(2.2), my + 2.0, X(0), my + 1.5];
    paint(g, st, '#cdd3e0', { ...INKP, seed: 1002 + sd, blooms: 1, edge: 1, ia: 0.5, w: 0.45 });
    for (let j = 1; j <= 3; j++) poly(g, [X(j * 1.7), my - 0.4, X(j * 1.9 + 0.5), my + 1.5], 0.3, 0.3, 1004 + j * sd, [130, 138, 156]);
  }
  ink(g, [hx - 2.2, my + 4.2, hx - 0.8, my + 3.95, hx + 0.8, my + 3.95, hx + 2.2, my + 4.25], false, 0.5, 0.8);
  // the white wing collar, points out over the cape
  for (const sd of [-1, 1]) {
    const X = (v) => hx + sd * v;
    paint(g, [X(1.2), hy + 10.2, X(8.6), hy + 11.6, X(5.2), hy + 17.4], '#eceef4', { ...INKP, seed: 1008 + sd, blooms: 0 });
  }
}

function portrait(g, x, y, w, h, label) {
  // the picture light
  glow(g, x + w / 2, y + 8, 44, [255, 220, 150], 0.35);
  paint(g, rrPts(x + w / 2 - 9, y - 5, 18, 3, 1.2), '#d1a64a', { seed: 900, w: 0.6, blooms: 0 });
  line(g, x + w / 2, y - 2, x + w / 2, y + 1, 0.6, 0.8, 901);
  // the gilt frame
  paint(g, rectPts(x, y, w, h), '#d8ac48', { seed: 902, w: 0.9, grad: [0.2, -0.15], blooms: 2, edge: 2.4 });
  g.fillStyle = 'rgba(140,90,20,0.55)';
  for (let t = 0; t < 1; t += 0.05) {
    g.fillRect(x + 1.5 + t * (w - 3), y + 1.6, 1.1, 1.1);
    g.fillRect(x + 1.5 + t * (w - 3), y + h - 2.7, 1.1, 1.1);
  }
  for (let t = 0; t < 1; t += 0.06) {
    g.fillRect(x + 1.6, y + 2 + t * (h - 4), 1.1, 1.1);
    g.fillRect(x + w - 2.7, y + 2 + t * (h - 4), 1.1, 1.1);
  }
  const fw = 5;
  const cx0 = x + fw;
  const cy0 = y + fw;
  const cw = w - fw * 2;
  const ch = h - fw * 2;
  ink(g, rectPts(cx0 - 0.8, cy0 - 0.8, cw + 1.6, ch + 1.6), true, 0.7, 0.6);
  g.save();
  g.beginPath();
  g.rect(cx0, cy0, cw, ch);
  g.clip();
  // the dark varnished ground and a green drape
  const bg = g.createLinearGradient(0, cy0, 0, cy0 + ch);
  bg.addColorStop(0, '#5a4a34');
  bg.addColorStop(1, '#2a2018');
  g.fillStyle = bg;
  g.fillRect(cx0, cy0, cw, ch);
  glow(g, cx0 + cw * 0.5, cy0 + ch * 0.32, 26, [210, 176, 110], 0.4);
  paint(g, [cx0 - 2, cy0 - 2, cx0 + cw * 0.5, cy0 - 2, cx0 + cw * 0.26, cy0 + 8, cx0 + 5, cy0 + 19, cx0 - 2, cy0 + 38], '#2f5a4e', { seed: 903, w: 0.5, ia: 0.6, blooms: 2 });
  professor(g, cx0 + cw / 2, cy0 + 24, cy0 + ch);
  // varnish
  g.fillStyle = 'rgba(255,214,120,0.08)';
  g.fillRect(cx0, cy0, cw, ch);
  g.restore();
  // the brass plate
  const plw = 50;
  paint(g, rrPts(x + w / 2 - plw / 2, y + h + 3, plw, 12, 1.5), '#d8ac48', { seed: 950, w: 0.65, grad: [0.2, -0.1], blooms: 0 });
  letters(g, label, x + w / 2, y + h + 9.2, 4, { seed: 951, w: 0.75, col: '#4a3218' });
  letters(g, 'DON K. EGGSHELL PHD', x + w / 2, y + h + 13.2, 2.3, { seed: 952, w: 0.42, col: '#4a3218', bounce: 0.4 });
}

// Keep the gallery's storybook cutaway portrait intact when it is used as a
// Founder poster: the hand-painted frame, lamp and lettered brass plate are part
// of this artwork rather than a generic outer mat.
export function paintFounderGalleryPortrait(g, x, y, w, h) {
  const fw = Math.min(w - 16, 70);
  const fh = Math.min(h - 23, fw * 0.95);
  portrait(g, x + (w - fw) / 2, y + h - fh - 17, fw, fh, 'FOUNDER');
}

function trophyCase(g, x, y, w, h, seed) {
  paint(g, rectPts(x, y, w, h), '#6b3a1f', { seed, w: 0.8, blooms: 2 });
  paint(g, rectPts(x + 4, y + 6, w - 8, h - 22), '#f2d79a', { seed: seed + 1, w: 0.6, blooms: 3, grad: [0.15, -0.15] });
  glow(g, x + w / 2, y + 10, 40, [255, 236, 180], 0.35);
  const shelves = 3;
  const sh = (h - 22) / shelves;
  for (let s = 0; s < shelves; s++) {
    const sy = y + 6 + sh * (s + 1);
    paint(g, rectPts(x + 4, sy - 1.6, w - 8, 1.8), '#8a5530', { seed: seed + 2 + s, w: 0.45, blooms: 0 });
    for (let j = 0; j < 4; j++) {
      const tx = x + 10 + j * ((w - 20) / 3);
      const kind = (s + j) % 3;
      if (kind === 0) {
        paint(g, [tx - 4, sy - 13, tx + 4, sy - 13, tx + 2.5, sy - 8, tx - 2.5, sy - 8], '#e6ba46', { seed: seed + s * 10 + j, w: 0.5, blooms: 0 });
        line(g, tx - 4, sy - 12, tx - 6, sy - 10, 0.6, 0.8, seed + j);
        line(g, tx + 4, sy - 12, tx + 6, sy - 10, 0.6, 0.8, seed + j + 1);
        paint(g, rectPts(tx - 1, sy - 8, 2, 4), '#e6ba46', { seed: seed + s * 10 + j + 1, w: 0.4, blooms: 0 });
        paint(g, rectPts(tx - 3.5, sy - 4.2, 7, 2.6), '#6b3a1f', { seed: seed + s * 10 + j + 2, w: 0.4, blooms: 0 });
      } else if (kind === 1) {
        paint(g, rrPts(tx - 4, sy - 12, 8, 10.5, 0.8), '#8a5530', { seed: seed + s * 10 + j, w: 0.45, blooms: 0 });
        paint(g, rectPts(tx - 2.6, sy - 10, 5.2, 4), '#e6ba46', { seed: seed + s * 10 + j + 3, w: 0.35, blooms: 0, edge: 0 });
      } else {
        paint(g, eggPts(tx, sy - 7.5, 3.2, 4.4, 16), '#e6ba46', { seed: seed + s * 10 + j, w: 0.45, blooms: 0, grad: [0.3, -0.1] });
        paint(g, rectPts(tx - 2.6, sy - 3.2, 5.2, 1.8), '#6b3a1f', { seed: seed + s * 10 + j + 4, w: 0.4, blooms: 0 });
      }
    }
  }
  line(g, x + 9, y + 12, x + 20, y + 30, 1, 0.35, seed + 50, [255, 255, 255]);
  paint(g, rectPts(x + 4, y + h - 14, w - 8, 12), '#7a4426', { seed: seed + 60, w: 0.6, blooms: 1 });
  dot(g, x + w / 2 - 3, y + h - 8, 0.9, '#e8c050');
  dot(g, x + w / 2 + 3, y + h - 8, 0.9, '#e8c050');
}

function bookshelf(g, x, y, w, h, seed) {
  paint(g, rectPts(x, y, w, h), '#5e331b', { seed, w: 0.8, blooms: 2 });
  const R = rng(seed);
  const rows = 6;
  const rh = (h - 10) / rows;
  const spines = ['#9a2e2a', '#2f5a3a', '#2f3b5c', '#a8742e', '#6b3a1f', '#7a2a4a', '#3a6a6a'];
  for (let r = 0; r < rows; r++) {
    const by = y + 4 + rh * (r + 1);
    g.fillStyle = 'rgba(30,14,6,0.55)';
    g.fillRect(x + 3, by - rh + 1.5, w - 6, rh - 1.5);
    let bx = x + 4;
    while (bx < x + w - 6) {
      const roll = R();
      if (roll < 0.1 && bx < x + w - 16) {
        const kind = (R() * 3) | 0;
        if (kind === 0) { paint(g, elPts(bx + 5, by - 6, 4.2, 4.2, 14), '#4d84c4', { seed: seed + bx, w: 0.45, blooms: 0 }); line(g, bx + 5, by - 2, bx + 5, by, 0.6, 0.8, bx); }
        else if (kind === 1) { paint(g, eggPts(bx + 5, by - 6.5, 3, 4, 14), '#e6ba46', { seed: seed + bx, w: 0.45, blooms: 0 }); }
        else { paint(g, [bx + 2, by, bx + 8, by, bx + 6.5, by - 9, bx + 3.5, by - 9], '#3c9f99', { seed: seed + bx, w: 0.45, blooms: 0 }); }
        bx += 11;
        continue;
      }
      const bw = 2.2 + R() * 2;
      const bh = rh * (0.62 + R() * 0.3);
      const lean = R() < 0.06 ? 1 : 0;
      const c = spines[(R() * spines.length) | 0];
      if (lean) paint(g, [bx, by, bx + bw, by, bx + bw + 3, by - bh, bx + 3, by - bh], c, { seed: seed + bx * 3, w: 0.4, blooms: 0, wa: 0.05 });
      else paint(g, rectPts(bx, by - bh, bw, bh), c, { seed: seed + bx * 3, w: 0.4, blooms: 0, wa: 0.05, edge: 0.6 });
      g.fillStyle = 'rgba(232,190,90,0.7)';
      g.fillRect(bx + 0.3, by - bh + 1.5, bw - 0.6, 0.6);
      g.fillRect(bx + 0.3, by - 2.2, bw - 0.6, 0.6);
      bx += bw + (lean ? 3 : 0.3);
    }
    paint(g, rectPts(x + 2, by - 0.4, w - 4, 2.2), '#7a4426', { seed: seed + r * 50, w: 0.5, blooms: 0 });
  }
}

function hangStatic(g, F, P, h, seed, next) {
  switch (h.kind) {
    case 'lift': liftStatic(g, F, P, h, seed, next); break;
    case 'logo': logo(g, h.x, h.y, h.w, h.h, P); break;
    case 'clock': clockFace(g, h.x, h.y, h.r, seed, F.id === 'exec' ? '#d1a64a' : '#d9574b'); break;
    case 'painting': painting(g, h.x, h.y, h.w, h.h, h.variant ?? 0, seed); break;
    case 'poster': poster(g, h.x, h.y, h.w, h.h, h.label, seed); break;
    case 'whiteboard': whiteboard(g, h.x, h.y, h.w, h.h, seed); break;
    case 'door': officeDoor(g, F, h.x, h.y, h.w, h.h, h.label, seed); break;
    case 'extinguisher': extinguisher(g, h.x, h.y, h.w, h.h, seed); break;
    case 'portrait': portrait(g, h.x, h.y, h.w, h.h, h.label); break;
    case 'trophyCase': trophyCase(g, h.x, h.y, h.w, h.h, seed); break;
    case 'bookshelf': bookshelf(g, h.x, h.y, h.w, h.h, seed); break;
    default: break;
  }
}

// ---- the cut slab above and the storey on top of it
function concreteBand(g, P, y0, y1, seed, col) {
  bandWash(g, P, y0, y1, col, seed, Math.round(P / 24), 1.3);
  const R = rng(seed + 1);
  const h = y1 - y0;
  // sand: soft round specks
  const n = Math.round((P * h) / 10);
  for (let i = 0; i < n; i++) {
    const x = R() * P;
    const y = y0 + 0.6 + R() * (h - 1.2);
    g.fillStyle = R() < 0.65 ? 'rgba(84,70,56,0.32)' : 'rgba(255,250,238,0.4)';
    g.beginPath();
    g.arc(x, y, 0.18 + R() * 0.22, 0, TAU);
    g.fill();
  }
  // aggregate: little outlined pebbles and the odd chip, the section drawing's shorthand
  const m = Math.round((P * h) / 55);
  for (let i = 0; i < m; i++) {
    const x = R() * P;
    const y = y0 + 1.4 + R() * (h - 2.8);
    if (R() < 0.75) {
      const rx = 0.55 + R() * 0.8;
      const pts = elPts(x, y, rx, rx * (0.6 + R() * 0.3), 8);
      g.fillStyle = css(shade(col, R() < 0.5 ? 0.12 : -0.12), 0.9);
      g.beginPath(); trace(g, pts, true); g.fill();
      ink(g, pts, true, 0.32, 0.5);
    } else {
      const sz = 0.7 + R() * 0.6;
      const a = R() * TAU;
      ink(g, [x + Math.cos(a) * sz, y + Math.sin(a) * sz, x + Math.cos(a + 2.1) * sz, y + Math.sin(a + 2.1) * sz, x + Math.cos(a + 4.2) * sz, y + Math.sin(a + 4.2) * sz], true, 0.32, 0.5);
    }
  }
}

function aboveItem(g, it, x, sb, P) {
  const R = rng(it.seed);
  const S = { seed: it.seed, w: 0.55, ia: 0.55, blooms: 0, edge: 1, wa: 0.15, la: 0.12 };
  const tall = sb > 12;
  switch (it.kind) {
    case 'legs': {
      const T = traits(it.seed);
      const trouser = R() < 0.3 ? shade(T.legs, 0.2) : T.legs;
      for (const dx of [0, 3.4]) {
        paint(g, rectPts(x + dx, -2, 2.4, sb - 1.6), trouser, { ...S, seed: it.seed + dx });
        paint(g, rrPts(x + dx - (R() < 0.5 ? 1.2 : 0), sb - 2.2, 3.8, 2.2, 1), R() < 0.3 ? '#8a3a2a' : '#3a2a22', { ...S, seed: it.seed + dx + 9 });
      }
      break;
    }
    case 'skirt': {
      const T = traits(it.seed + 1);
      if (tall) paint(g, [x - 1, -2, x + 7.5, -2, x + 8.5, sb - 10, x - 2, sb - 10], T.shirt, S);
      for (const dx of [0.6, 4.4]) {
        paint(g, rectPts(x + dx, tall ? sb - 10 : -2, 1.6, tall ? 8 : sb), T.skin, { ...S, seed: it.seed + dx });
        paint(g, rrPts(x + dx - 0.6, sb - 2, 3, 2, 1), '#c0392b', { ...S, seed: it.seed + dx + 4 });
      }
      break;
    }
    case 'chair': {
      if (tall) paint(g, rectPts(x + 5.5, -2, 1.4, sb - 3), '#7a7a80', S);
      paint(g, rrPts(x, sb - 3.6, 12.4, 1.6, 0.6), '#5a5a62', { ...S, seed: it.seed + 1 });
      for (const dx of [0.6, 6.2, 11.8]) dot(g, x + dx, sb - 1.1, 1.05, '#3b3b44', 0.8);
      break;
    }
    case 'desk': {
      const w = it.w;
      if (tall) {
        paint(g, rectPts(x, -2, w, Math.max(2, sb - 9)), '#c9a27a', { ...S, seed: it.seed + 2 });
        paint(g, rectPts(x + w - 10, -2, 10, sb - 1), '#b88e66', { ...S, seed: it.seed + 3 });
      }
      paint(g, rectPts(x, -2, 1.6, sb - 0.2), '#8a6a4a', S);
      if (!tall) paint(g, rectPts(x + w - 1.6, -2, 1.6, sb - 0.2), '#8a6a4a', { ...S, seed: it.seed + 1 });
      break;
    }
    case 'pot': {
      paint(g, [x, sb - 7, x + 8, sb - 7, x + 7, sb, x + 1, sb], '#c8704a', S);
      if (tall) for (let j = 0; j < 4; j++) paint(g, [x + 4, sb - 7, x + 1 + j * 2, -2, x + 2.4 + j * 2, -2], '#6aa84f', { ...S, seed: it.seed + j });
      break;
    }
    case 'bin': {
      paint(g, [x, sb - 6, x + 6, sb - 6, x + 5.4, sb, x + 0.6, sb], '#7a8a9a', S);
      dot(g, x + 2.4, sb - 6.4, 1.2, '#f6f1e4', 0.8);
      break;
    }
    case 'bucket': {
      paint(g, [x, sb - 5, x + 7, sb - 5, x + 6.2, sb, x + 0.8, sb], '#efb23a', S);
      if (tall) poly(g, [x + 4.5, sb - 4, x + 9, -2], 0.9, 0.6, it.seed, [140, 100, 60]);
      break;
    }
    default: break;
  }
}

function topBand(g, F, P) {
  const cy = F.ceilingY;
  const sb = cy - 8;
  // the storey above: its wall, a pale floor, legs and feet and furniture standing on it
  bandWash(g, WALL_P, -1, sb, P.aboveWall, F.stage * 13 + 1);
  const R = rng(F.stage * 977 + 3);
  const kinds = sb > 12
    ? ['legs', 'desk', 'chair', 'skirt', 'pot', 'legs', 'chair', 'bin', 'legs', 'desk', 'skirt', 'bucket', 'legs', 'chair', 'pot']
    : ['legs', 'chair', 'skirt', 'pot', 'legs', 'bin', 'chair', 'skirt'];
  let u = 12;
  let n = 0;
  while (u < WALL_P - 40) {
    const kind = kinds[(n + F.stage * 3) % kinds.length];
    const w = kind === 'desk' ? 34 : kind === 'chair' ? 13 : 8;
    const it = { kind, w, seed: F.stage * 400 + n++ };
    aboveItem(g, it, u, sb, P);
    u += w + 10 + R() * 46;
  }
  paint(g, rectPts(-2, sb - 1.4, WALL_P + 4, 1.6), shade(P.aboveWall, -0.2), { line: false, edge: 0, blooms: 0, wa: 0 });
  concreteBand(g, WALL_P, sb, cy - 1.6, F.stage * 31 + 7, P.concrete);
  g.fillStyle = 'rgba(70,56,44,0.7)';
  for (let x = 5; x < WALL_P; x += 9) { g.beginPath(); g.arc(x, cy - 3.2, 0.5, 0, TAU); g.fill(); }
  const Rp = rng(F.stage * 31 + 8);
  for (let x = 30 + Rp() * 60; x < WALL_P - 20; x += 110 + Rp() * 120) {
    const c = ['#4d84c4', '#d9574b', '#efb23a'][(Rp() * 3) | 0];
    paint(g, elPts(x, (sb + cy - 1.6) / 2, 1.9, 1.9, 12), c, { seed: x, w: 0.5, blooms: 0 });
  }
  bandWash(g, WALL_P, cy - 1.6, cy, '#f1ead8', F.stage * 13 + 9, 10);
  pline(g, WALL_P, sb, 0.7, 0.6, F.stage + 40, 0.25);
  pline(g, WALL_P, cy - 1.6, 0.6, 0.55, F.stage + 41, 0.25);
  pline(g, WALL_P, cy, 0.7, 0.7, F.stage + 42, 0.2);
  letters(g, `FLOOR ${F.id === 'lobby' ? 1 : Number(F.label) + 1}`, 60, cy - 2.4, 3, { col: '#6b5a4a', seed: 3, w: 0.45, align: 'left', a: 0.7 });
}

function buildWall(F, k) {
  const P = PAL[F.id];
  const S = newStrip(WALL_P, 0, WALL_BASE, k);
  const g = S.g;
  const Wl = F.wall;
  Wl.bays.forEach((b, i) => wrap(WALL_P, b.u, b.u1, (off) => {
    const x0 = b.u + off;
    const x1 = b.u1 + off;
    if (b.type === 'wall') {
      if (F.id === 'lobby') wallLobby(g, F, P, x0, x1, 100 + i * 37);
      else if (F.id === 'open') wallOpen(g, F, P, x0, x1, 100 + i * 37);
      else wallExec(g, F, P, x0, x1, 100 + i * 37);
    } else {
      glassBay(g, F, P, x0, x1, { blinds: b.blinds ?? 0 }, 200 + i * 41);
      if (b.revolvingDoor != null) revolvingStatic(g, F, b.revolvingDoor + off);
    }
  }));
  Wl.columns.forEach((c, i) => wrap(WALL_P, c.u, c.u + c.w, (off) => column(g, F, P, c.u + off, c.w, 300 + i * 3)));
  const lifts = Wl.hangs.filter((h) => h.kind === 'lift');
  Wl.hangs.forEach((h, i) => {
    const w = h.w || (h.r || 10) * 2;
    const u0 = h.kind === 'clock' ? h.u - h.r - 2 : h.u - 12;
    wrap(WALL_P, u0, u0 + w + 24, (off) => {
      const y = h.y ?? WALL_BASE - h.h;
      const hasNext = h.kind === 'lift' && !lifts.some((o) => o !== h && o.u > h.u && o.u < h.u + h.w + 18);
      hangStatic(g, F, P, { ...h, x: h.u + off, y }, 400 + i * 23, hasNext);
    });
  });
  topBand(g, F, P);
  return finishStrip(S, 0.9);
}

function revolvingStatic(g, F, x) {
  const G = F.glass;
  const top = G.transom + 2;
  paint(g, rrPts(x - 26, top - 1, 52, 9, 2), '#4f7a70', { seed: 610, w: 0.7, blooms: 1 });
  letters(g, 'WAY IN', x, top + 6, 4, { col: '#f6ecd0', seed: 611, w: 0.7 });
  g.fillStyle = 'rgba(190,220,232,0.26)';
  g.fillRect(x - 22, top + 8, 44, G.bottom - top - 8);
  // the drum's curved glass: brighter at its edges, where you look through more of it
  for (const sd of [-1, 1]) {
    const gr = g.createLinearGradient(x + sd * 22, 0, x + sd * 12, 0);
    gr.addColorStop(0, 'rgba(220,240,248,0.45)');
    gr.addColorStop(1, 'rgba(220,240,248,0)');
    g.fillStyle = gr;
    g.fillRect(Math.min(x + sd * 22, x + sd * 12), top + 8, 10, G.bottom - top - 8);
  }
  paint(g, elPts(x, top + 9.5, 22.5, 3, 24), '#4f7a70', { seed: 614, w: 0.6, blooms: 0 });
  paint(g, rectPts(x - 23.5, top + 8, 3, G.bottom - top - 8), '#4f7a70', { seed: 612, w: 0.55, blooms: 0, wa: 0.05 });
  paint(g, rectPts(x + 20.5, top + 8, 3, G.bottom - top - 8), '#4f7a70', { seed: 613, w: 0.55, blooms: 0, wa: 0.05 });
  paint(g, elPts(x, G.bottom - 1, 23, 2.4, 24), '#9aa4ac', { seed: 615, w: 0.55, blooms: 0 });
}

// ------------------------------------------------------------------ lights
function buildLights(F, k) {
  const v = F.lights.variant;
  if (v === 'globe') {
    return {
      on: sprite(k, [-9, -15, 18, 17], (g) => {
        paint(g, rrPts(-2, -14, 4, 3, 0.8), '#d1a64a', { seed: 1, w: 0.5, blooms: 0 });
        paint(g, elPts(0, -6, 6, 6, 20), '#fff2c6', { seed: 2, w: 0.6, grad: [0.3, -0.06], blooms: 1, edge: 1.4 });
        g.fillStyle = 'rgba(255,255,255,0.8)';
        g.beginPath(); g.ellipse(-2, -8, 1.4, 2, -0.4, 0, TAU); g.fill();
      }),
      glow: sprite(k, [-30, -36, 60, 60], (g) => glow(g, 0, -6, 30, [255, 236, 170], 0.35), 0),
    };
  }
  if (v === 'tube') {
    const mk = (on) => sprite(k, [-24, -6, 48, 8], (g) => {
      paint(g, rectPts(-22, -4.5, 44, 4.5), '#c9c2b0', { seed: 3, w: 0.6, blooms: 0 });
      paint(g, rectPts(-20.5, -3.4, 41, 2.6), on ? '#fffbe2' : '#a9a69a', { seed: 4, w: 0.4, blooms: 0, edge: 0.6 });
      for (let x = -16; x < 20; x += 6) line(g, x, -3.4, x, -0.8, 0.35, 0.4, 5 + x);
    });
    return {
      on: mk(true),
      off: mk(false),
      glow: sprite(k, [-40, -2, 80, 60], (g) => {
        const gr = g.createLinearGradient(0, 0, 0, 56);
        gr.addColorStop(0, 'rgba(255,250,220,0.3)');
        gr.addColorStop(1, 'rgba(255,250,220,0)');
        g.fillStyle = gr;
        g.beginPath(); g.moveTo(-20, 0); g.lineTo(20, 0); g.lineTo(38, 56); g.lineTo(-38, 56); g.closePath(); g.fill();
      }, 0),
    };
  }
  return {
    on: sprite(k, [-10, -12, 20, 14], (g) => {
      paint(g, [-8, 0, 8, 0, 3, -9, -3, -9], '#3f7a58', { seed: 6, w: 0.6, grad: [0.15, -0.15], blooms: 1 });
      paint(g, rectPts(-1.4, -11, 2.8, 2.2), '#d1a64a', { seed: 7, w: 0.45, blooms: 0 });
      paint(g, elPts(0, 0.3, 7.4, 1.4, 14), '#fff0b8', { seed: 8, w: 0.45, blooms: 0, edge: 0 });
    }),
    glow: sprite(k, [-44, -6, 88, 110], (g) => {
      glow(g, 0, 2, 16, [255, 226, 150], 0.5);
      const gr = g.createLinearGradient(0, 0, 0, 100);
      gr.addColorStop(0, 'rgba(255,214,140,0.2)');
      gr.addColorStop(1, 'rgba(255,214,140,0)');
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(-7, 0); g.lineTo(7, 0); g.lineTo(40, 100); g.lineTo(-40, 100); g.closePath(); g.fill();
    }, 0),
  };
}

// ------------------------------------------------------------------ the floor plane
// The floor is painted once flat, in (u, v): u along the lane at the lane's scale, v the
// depth from the lane's edge back to the wall. Each device row of the plane then gets its
// own pattern: the texture averaged over the depth that row covers and blurred to the
// width one screen pixel spans there, so far rows are as soft as they should be and no
// joint ever shimmers. A row at screen y maps x = s(y) * (u - shiftBottom), exactly the
// plan's shearing joints (shiftTop / shiftBottom = 0.24).
const Z_L = 67;
const FLOOR_V = Z_L * (1 / 0.24 - 1);
const sOf = (y) => 0.24 + (0.76 * (y - WALL_BASE)) / (LANE_TOP - WALL_BASE);
const vOf = (y) => Z_L * (1 / sOf(y) - 1);

function floorTexture(F, P, k) {
  const c = canvas(FLOOR_P * k, Math.ceil(FLOOR_V * k) + 2);
  const g = c.getContext('2d');
  g.setTransform(k, 0, 0, k, 0, 0);
  const R = rng(F.stage * 71 + 9);
  if (F.floor === 'marble') {
    const T = 32;
    for (let iv = 0; iv * T < FLOOR_V + T; iv++) {
      for (let iu = 0; iu < FLOOR_P / T; iu++) {
        const col = shade((iu + iv) % 2 ? P.floorA : P.floorB, (R() - 0.5) * 0.05);
        wash(g, wob(rectPts(iu * T + 0.5, iv * T + 0.5, T - 1, T - 1), true, 0.3, iu * 7 + iv), col, { seed: iu * 13 + iv, blooms: 2, edge: 2, edgeA: 0.7 });
        // veins
        if (R() < 0.6) {
          const pts = [];
          let vx = iu * T + R() * T;
          let vy = iv * T;
          for (let j = 0; j < 8; j++) { pts.push(vx, vy); vx += (R() - 0.5) * 9; vy += T / 7; }
          ink(g, pts, false, 0.5, 0.18, [140, 110, 80]);
        }
      }
    }
    g.fillStyle = css(P.grout, 0.9);
    for (let u = 0; u <= FLOOR_P; u += T) { g.fillRect(u - 0.5, 0, 1, FLOOR_V + 2); }
    for (let v = 0; v <= FLOOR_V + T; v += T) g.fillRect(0, v - 0.5, FLOOR_P, 1);
  } else if (F.floor === 'carpet') {
    g.fillStyle = css(P.floorA);
    g.fillRect(0, 0, FLOOR_P, FLOOR_V + 2);
    const T = 16;
    for (let iv = 0; iv * T < FLOOR_V + T; iv++) {
      for (let iu = 0; iu < FLOOR_P / T; iu++) {
        const col = shade((iu + iv) % 2 ? P.floorA : P.floorB, (R() - 0.5) * 0.06);
        g.fillStyle = css(col);
        g.fillRect(iu * T, iv * T, T, T);
        g.fillStyle = css(shade(col, -0.12), 0.25);
        for (let j = 1; j < 6; j++) {
          if ((iu + iv) % 2) g.fillRect(iu * T + (j * T) / 6, iv * T + 1, 0.6, T - 2);
          else g.fillRect(iu * T + 1, iv * T + (j * T) / 6, T - 2, 0.6);
        }
      }
    }
    for (let i = 0; i < 260; i++) glow(g, R() * FLOOR_P, R() * FLOOR_V, 8 + R() * 22, R() < 0.5 ? shade(P.floorA, 0.12) : shade(P.floorA, -0.1), 0.25);
    g.fillStyle = css(P.grout, 0.6);
    for (let u = 0; u <= FLOOR_P; u += T) g.fillRect(u - 0.3, 0, 0.6, FLOOR_V + 2);
    for (let v = 0; v <= FLOOR_V + T; v += T) g.fillRect(0, v - 0.3, FLOOR_P, 0.6);
  } else {
    // chevron parquet
    const cw = 16;
    const ph = 7;
    for (let iu = 0; iu < FLOOR_P / cw; iu++) {
      const dir = iu % 2 ? 1 : -1;
      for (let v = -ph * 3; v < FLOOR_V + ph * 3; v += ph) {
        const x0 = iu * cw;
        const col = shade(R() < 0.5 ? P.floorA : P.floorB, (R() - 0.5) * 0.1);
        const sl = dir * cw * 0.5;
        const pts = [x0, v, x0 + cw, v + sl, x0 + cw, v + sl + ph, x0, v + ph];
        g.fillStyle = css(col);
        g.beginPath(); trace(g, pts, true); g.fill();
        g.strokeStyle = css(P.grout, 0.55);
        g.lineWidth = 0.5;
        g.stroke();
        for (let j = 0; j < 2; j++) {
          const gy = v + 1.5 + R() * (ph - 3);
          g.strokeStyle = css(shade(col, -0.2), 0.3);
          g.lineWidth = 0.35;
          g.beginPath(); g.moveTo(x0 + 1, gy); g.lineTo(x0 + cw - 1, gy + sl); g.stroke();
        }
      }
    }
    // the rug
    const rx = 120;
    const rw = 300;
    const rv0 = 14;
    const rv1 = 120;
    paint(g, rectPts(rx, rv0, rw, rv1 - rv0), '#a8423a', { seed: 71, w: 1, blooms: 8, edge: 3, wa: 0.6 });
    paint(g, rectPts(rx + 8, rv0 + 8, rw - 16, rv1 - rv0 - 16), '#2f4a6e', { seed: 72, w: 0.8, blooms: 4, wa: 0.5 });
    paint(g, rectPts(rx + 14, rv0 + 14, rw - 28, rv1 - rv0 - 28), '#b8483e', { seed: 73, w: 0.8, blooms: 6, wa: 0.5 });
    paint(g, elPts(rx + rw / 2, (rv0 + rv1) / 2, 44, 26, 30), '#e3c27a', { seed: 74, w: 0.9, blooms: 3, wa: 0.5 });
    paint(g, elPts(rx + rw / 2, (rv0 + rv1) / 2, 26, 15, 24), '#2f4a6e', { seed: 75, w: 0.8, blooms: 2, wa: 0.5 });
    for (let t = 0; t < 1; t += 0.04) {
      line(g, rx + t * rw, rv0, rx + t * rw, rv0 - 4, 0.6, 0.5, 76 + t * 100, [240, 226, 196]);
      line(g, rx + t * rw, rv1, rx + t * rw, rv1 + 4, 0.6, 0.5, 77 + t * 100, [240, 226, 196]);
    }
  }
  // the wall's contact shadow at the back of the floor
  const sh = g.createLinearGradient(0, FLOOR_V - 26, 0, FLOOR_V + 2);
  sh.addColorStop(0, 'rgba(60,40,24,0)');
  sh.addColorStop(1, 'rgba(60,40,24,0.35)');
  g.fillStyle = sh;
  g.fillRect(0, FLOOR_V - 26, FLOOR_P, 30);
  applyGrain(g, c.width, c.height, 0.8);
  return c;
}

function buildFloorRows(F, k) {
  const P = PAL[F.id];
  const T = floorTexture(F, P, k);
  const tw = T.width;
  const th = T.height;
  const src = T.getContext('2d').getImageData(0, 0, tw, th).data;
  const n = Math.round((LANE_TOP - WALL_BASE) * k);
  const rows = [];
  const acc = new Float32Array(tw * 4);
  const tmp = new Float32Array(tw * 4);
  for (let r = 0; r < n; r++) {
    const ya = WALL_BASE + r / k;
    const yb = ya + 1 / k;
    const s = sOf(ya + 0.5 / k);
    const v0 = vOf(yb) * k;
    const v1 = vOf(ya) * k;
    const t0 = clamp(Math.floor(v0), 0, th - 1);
    const t1 = clamp(Math.max(t0 + 1, Math.ceil(v1)), 1, th);
    acc.fill(0);
    for (let t = t0; t < t1; t++) {
      const o = t * tw * 4;
      for (let i = 0; i < tw * 4; i++) acc[i] += src[o + i];
    }
    const inv = 1 / (t1 - t0);
    for (let i = 0; i < tw * 4; i++) acc[i] *= inv;
    // horizontal box blur, periodic, to the width a device pixel spans here
    const bw = Math.max(1, Math.round(1 / s));
    if (bw > 1) {
      for (let x = 0; x < tw; x++) {
        let a0 = 0; let a1 = 0; let a2 = 0;
        for (let d = 0; d < bw; d++) {
          const xi = ((x + d - (bw >> 1)) % tw + tw) % tw;
          a0 += acc[xi * 4]; a1 += acc[xi * 4 + 1]; a2 += acc[xi * 4 + 2];
        }
        tmp[x * 4] = a0 / bw; tmp[x * 4 + 1] = a1 / bw; tmp[x * 4 + 2] = a2 / bw; tmp[x * 4 + 3] = 255;
      }
    } else for (let i = 0; i < tw * 4; i++) tmp[i] = i % 4 === 3 ? 255 : acc[i];
    const rc = canvas(tw, 1);
    const rg = rc.getContext('2d');
    const img = rg.createImageData(tw, 1);
    for (let i = 0; i < tw * 4; i++) img.data[i] = tmp[i];
    rg.putImageData(img, 0, 0);
    rows.push({ c: rc, y: ya, s });
  }
  return rows;
}

const PATS = new WeakMap();
function patternFor(ctx, c) {
  let m = PATS.get(ctx);
  if (!m) { m = new Map(); PATS.set(ctx, m); }
  let p = m.get(c);
  if (!p) { p = ctx.createPattern(c, 'repeat'); m.set(c, p); }
  return p;
}

function drawFloor(ctx, f, B, k) {
  const sb = f.floorPlane.shiftBottom;
  const su = mod(sb, FLOOR_P);
  for (const row of B.floorRows) {
    const pat = patternFor(ctx, row.c);
    pat.setTransform(new DOMMatrix([row.s / k, 0, 0, 1 / k, -row.s * su, row.y]));
    ctx.fillStyle = pat;
    ctx.fillRect(0, row.y, W, 1 / k);
  }
}

// ------------------------------------------------------------------ furniture (mid)
const MID = { w: 0.65, ia: 0.7, edgeA: 0.8 };

function plantSprite(variant, seed, k) {
  const box = { ficus: [-2, -64, 34, 68], palm: [-4, -74, 48, 78], snake: [-2, -38, 20, 42], bonsai: [-3, -44, 24, 48] }[variant] || [-2, -64, 34, 68];
  return sprite(k, box, (g) => {
    const R = rng(seed);
    const S = { ...MID, seed };
    const shadow = (cx, w) => { g.fillStyle = 'rgba(50,30,20,0.18)'; g.beginPath(); g.ellipse(cx, 0.5, w, 1.6, 0, 0, TAU); g.fill(); };
    if (variant === 'palm') {
      shadow(20, 12);
      const fr = [];
      for (let j = 0; j < 8; j++) {
        const a = -Math.PI / 2 + (j - 3.5) * 0.36;
        const len = 30 + R() * 22;
        fr.push([a, len]);
      }
      for (const [a, len] of fr) {
        const ex = 20 + Math.cos(a) * len;
        const ey = -18 + Math.sin(a) * len * 0.95;
        const mx = 20 + Math.cos(a) * len * 0.5 - Math.sin(a) * 3;
        const my = -18 + Math.sin(a) * len * 0.5 - 4;
        const pts = [20, -18];
        for (let t = 0.1; t <= 1; t += 0.1) {
          const qx = (1 - t) * (1 - t) * 20 + 2 * (1 - t) * t * mx + t * t * ex;
          const qy = (1 - t) * (1 - t) * -18 + 2 * (1 - t) * t * my + t * t * ey;
          const wd = Math.sin(t * Math.PI) * 4.2;
          pts.push(qx - Math.sin(a) * wd, qy + Math.cos(a) * wd);
        }
        for (let t = 1; t >= 0.1; t -= 0.1) {
          const qx = (1 - t) * (1 - t) * 20 + 2 * (1 - t) * t * mx + t * t * ex;
          const qy = (1 - t) * (1 - t) * -18 + 2 * (1 - t) * t * my + t * t * ey;
          const wd = Math.sin(t * Math.PI) * 4.2;
          pts.push(qx + Math.sin(a) * wd * 0.3, qy - Math.cos(a) * wd * 0.3);
        }
        paint(g, pts, R() < 0.5 ? '#6aa456' : '#86bb68', { ...S, seed: seed + a * 10, blooms: 1 });
      }
      paint(g, [13, -14, 27, -14, 25.5, 0, 14.5, 0], '#c8704a', { ...S, seed: seed + 1 });
      paint(g, rrPts(12, -16, 16, 3, 1), '#b5603e', { ...S, seed: seed + 2 });
    } else if (variant === 'snake') {
      shadow(8, 7);
      for (let j = 0; j < 6; j++) {
        const bx = 3 + j * 1.9;
        const top = -34 + R() * 8;
        const lean = (j - 2.5) * 1.6;
        const pts = [bx - 1.6, -9, bx + lean - 0.3, top, bx + lean + 0.3, top, bx + 1.6, -9];
        paint(g, pts, j % 2 ? '#4f8a44' : '#3f7a3c', { ...S, seed: seed + j, blooms: 0 });
        poly(g, [bx + 1.3, -10, bx + lean + 0.2, top + 3], 0.5, 0.6, seed + j, [220, 200, 90]);
      }
      paint(g, [2, -10, 14, -10, 13, 0, 3, 0], '#e9e2cc', { ...S, seed: seed + 7 });
    } else if (variant === 'bonsai') {
      shadow(9, 10);
      paint(g, rectPts(-1, -20, 20, 2.6), '#6b3a1f', { ...S, seed: seed + 1 });
      for (const lx of [0.5, 16]) paint(g, rectPts(lx, -18, 2, 18), '#6b3a1f', { ...S, seed: seed + lx });
      paint(g, [2, -24, 16, -24, 14.5, -20.5, 3.5, -20.5], '#3f6a8a', { ...S, seed: seed + 2 });
      poly(g, [9, -24, 8, -28, 11, -31, 8, -35], 1.6, 0.9, seed + 3, [110, 70, 40]);
      for (const [cx, cy, rx] of [[4, -33, 5], [13, -35, 5.5], [8, -40, 4.5]]) paint(g, elPts(cx, cy, rx, rx * 0.55, 14), '#5f9a4c', { ...S, seed: seed + cx, blooms: 1 });
    } else {
      shadow(15, 10);
      poly(g, [15, -14, 14, -26, 16.5, -38, 15, -44], 2.2, 0.9, seed + 3, [120, 80, 50]);
      poly(g, [15, -30, 9, -38], 1.2, 0.85, seed + 4, [120, 80, 50]);
      poly(g, [16, -34, 22, -42], 1.2, 0.85, seed + 5, [120, 80, 50]);
      for (let j = 0; j < 30; j++) {
        const a = R() * TAU;
        const rr = Math.sqrt(R()) * 13;
        const lx = 15 + Math.cos(a) * rr;
        const ly = -45 + Math.sin(a) * rr * 0.8;
        const pts = elPts(lx, ly, 3.2, 1.7, 10);
        const ang = R() * Math.PI;
        for (let i = 0; i < pts.length; i += 2) {
          const dx = pts[i] - lx;
          const dy = pts[i + 1] - ly;
          pts[i] = lx + dx * Math.cos(ang) - dy * Math.sin(ang);
          pts[i + 1] = ly + dx * Math.sin(ang) + dy * Math.cos(ang);
        }
        paint(g, pts, ['#6aa456', '#4f8a44', '#86bb68'][j % 3], { ...S, seed: seed + j * 3, blooms: 0, edge: 0.8, w: 0.45, wa: 0.1, la: 0.08 });
      }
      paint(g, [8, -14, 22, -14, 20.5, 0, 9.5, 0], '#c8704a', { ...S, seed: seed + 1 });
      paint(g, rrPts(7, -16, 16, 3, 1), '#b5603e', { ...S, seed: seed + 2 });
    }
  });
}

function sofaSprite(F, w, seed, k) {
  const col = F.id === 'exec' ? '#6a8a5a' : '#c98572';
  return sprite(k, [-3, -30, w + 6, 33], (g) => {
    const S = { ...MID, seed };
    g.fillStyle = 'rgba(50,30,20,0.18)'; g.beginPath(); g.ellipse(w / 2, 0.5, w / 2 + 2, 1.8, 0, 0, TAU); g.fill();
    paint(g, rrPts(2, -26, w - 4, 14, 4), shade(col, -0.05), S);
    paint(g, rrPts(5, -16, w - 10, 8, 2), col, { ...S, seed: seed + 1 });
    const n = Math.max(2, Math.round((w - 14) / 22));
    for (let j = 1; j < n; j++) line(g, 5 + ((w - 10) * j) / n, -15.5, 5 + ((w - 10) * j) / n, -8.5, 0.45, 0.5, seed + j);
    paint(g, rrPts(0, -20, 7, 15, 3), shade(col, -0.08), { ...S, seed: seed + 2 });
    paint(g, rrPts(w - 7, -20, 7, 15, 3), shade(col, -0.08), { ...S, seed: seed + 3 });
    paint(g, rectPts(3, -8, w - 6, 5), shade(col, -0.15), { ...S, seed: seed + 4 });
    for (const lx of [5, w - 7]) paint(g, rectPts(lx, -3, 2, 3), '#6b3a1f', { ...S, seed: seed + lx });
    paint(g, rrPts(w * 0.62, -22, 8, 7, 2.5), F.id === 'exec' ? '#d1a64a' : '#efb23a', { ...S, seed: seed + 6 });
    if (F.id === 'exec') for (let x = 6; x < w - 6; x += 5) dot(g, x, -23.5, 0.5, INK, 0.5);
  });
}

function cubicleSprites(it, i, F, k) {
  const Wd = it.u1 - it.u;
  const n = Math.round(Wd / 40);
  const fab = ['#bba57c', '#c39a86', '#b3a08a'][Math.round(it.u / 400) % 3];
  const trim = '#ddd0b2';
  const back = sprite(k, [-2, -48, Wd + 4, 16], (g) => {
    for (let d = 0; d < n; d++) {
      const x = d * 40;
      const occupied = it.heads.includes(d) || d === it.pop;
      glow(g, x + 10.5, -38, 8, [190, 230, 250], occupied ? 0.25 : 0.45);
      paint(g, rrPts(x + 4.5, -40.5, 12, 7, 1), '#5a6068', { ...MID, seed: i * 50 + d });
      paint(g, rectPts(x + 5.8, -39.4, 9.4, 4.8), '#bfe3f0', { ...MID, seed: i * 50 + d + 1, line: false, blooms: 0, edge: 0 });
      if (d % 3 === 1 && !occupied) {
        for (let j = 0; j < 4; j++) paint(g, elPts(x + 31 + j * 1.6, -38 + (j % 2) * 1.5, 2.2, 1.2, 8), '#6aa456', { ...MID, seed: i * 50 + d + j, blooms: 0, edge: 0, w: 0.45 });
      }
    }
  });
  const front = sprite(k, [-3, -40, Wd + 6, 44], (g) => {
    g.fillStyle = 'rgba(50,30,20,0.16)';
    g.beginPath(); g.ellipse(Wd / 2, 0.5, Wd / 2 + 2, 1.8, 0, 0, TAU); g.fill();
    const R = rng(i * 7 + 1);
    for (let d = 0; d < n; d++) {
      const x = d * 40;
      paint(g, rectPts(x + 0.5, -34, 39, 33), shade(fab, (R() - 0.5) * 0.06), { ...MID, seed: i * 60 + d, blooms: 3, grad: [0.06, -0.08] });
      // fabric weave, very faint
      g.fillStyle = css(shade(fab, -0.2), 0.12);
      for (let yy = -31; yy < -2; yy += 2.5) g.fillRect(x + 2, yy, 36, 0.4);
      // a memo or a calendar, kept quiet
      if (R() < 0.7) {
        const mx = x + 6 + R() * 24;
        paint(g, rectPts(mx, -29 + R() * 4, 4.5, 4.5), ['#e9dc9a', '#d9c0c8', '#bcd6c4'][(R() * 3) | 0], { ...MID, seed: i * 60 + d + 30, blooms: 0, edge: 0, w: 0.4, ia: 0.5 });
        dot(g, mx + 2.2, -28.6, 0.5, '#c0392b', 0.8);
      }
      paint(g, rectPts(x, -36, 40, 2.6), trim, { ...MID, seed: i * 60 + d + 40, blooms: 0 });
      paint(g, rectPts(x - 0.8, -36, 1.6, 36), shade(trim, -0.1), { ...MID, seed: i * 60 + d + 41, blooms: 0, w: 0.5 });
      paint(g, rectPts(x + 0.5, -2.4, 39, 2.4), '#6b7684', { ...MID, seed: i * 60 + d + 42, blooms: 0, w: 0.45 });
      const occupied = it.heads.includes(d) || d === it.pop;
      if (!occupied || R() < 0.4) {
        const mx = x + 28 + R() * 6;
        paint(g, rrPts(mx, -39.6, 3.4, 3.8, 0.6), CLOTHES[(i * 3 + d) % CLOTHES.length], { ...MID, seed: i * 60 + d + 50, blooms: 0, w: 0.45 });
        poly(g, [mx + 3.4, -38.8, mx + 4.6, -38, mx + 3.4, -36.8], 0.45, 0.7, i + d);
      }
    }
    paint(g, rectPts(Wd - 0.8, -36, 1.6, 36), shade(trim, -0.1), { ...MID, seed: i * 60 + 99, blooms: 0, w: 0.5 });
    letters(g, ['ACCOUNTS', 'SALES', 'MARKETING'][i % 3], Wd / 2, -27.5, 3, { col: '#6b5232', seed: i, w: 0.5, a: 0.6 });
  });
  return { back, front };
}

function midSprites(F, it, i, k) {
  const P = PAL[F.id];
  const S = { ...MID, seed: i * 101 + 7 };
  switch (it.kind) {
    case 'cubicles': return cubicleSprites(it, i, F, k);
    case 'plant': return { front: plantSprite(it.variant, i * 13 + 5, k) };
    case 'sofa': return { front: sofaSprite(F, it.w, i * 17, k) };
    case 'reception': {
      const w = it.w;
      return {
        front: sprite(k, [-4, -46, w + 8, 50], (g) => {
          g.fillStyle = 'rgba(50,30,20,0.18)'; g.beginPath(); g.ellipse(w / 2, 0.5, w / 2 + 3, 2, 0, 0, TAU); g.fill();
          paint(g, rrPts(w * 0.3, -42, 11, 8, 1), '#5a6068', { ...S, seed: S.seed + 9 });
          paint(g, rrPts(0, -30, w, 30, 7), '#b97a4e', { ...S, grad: [0.06, -0.12], blooms: 4 });
          for (let x = 10; x < w - 6; x += 12) line(g, x, -26, x, -4, 0.45, 0.25, x);
          paint(g, rrPts(-3, -35, w + 6, 6, 3), '#dcc9a6', { ...S, seed: S.seed + 1 });
          paint(g, rrPts(w / 2 - 26, -21, 52, 9, 2), '#d8b07e', { ...S, seed: S.seed + 2, blooms: 0 });
          letters(g, 'RECEPTION', w / 2, -14, 4.6, { seed: 21, w: 0.75, col: '#5a3a24' });
          paint(g, elPts(w * 0.72, -35.4, 2.6, 2.2, 12, Math.PI, TAU), '#e0b84a', { ...S, seed: S.seed + 3, blooms: 0 });
          dot(g, w * 0.72, -38, 0.6, '#e0b84a');
          paint(g, rrPts(w * 0.86, -42, 4, 7, 1.5), '#9fc6dc', { ...S, seed: S.seed + 4, blooms: 0 });
          for (let j = 0; j < 4; j++) dot(g, w * 0.86 + 2 + (j - 1.5) * 2.2, -43.5 - (j % 2) * 1.6, 1.3, ['#d9574b', '#efb23a', '#de7c9c', '#d9574b'][j]);
        }),
      };
    }
    case 'turnstiles': {
      const w = it.w;
      return {
        front: sprite(k, [-6, -30, w + 12, 33], (g) => {
          for (let j = 0; j < 4; j++) {
            const x = (w * j) / 3;
            if (j < 3) {
              paint(g, rrPts(x + 3.5, -21, (w / 3) * 0.42, 9, 1.5), '#cfe3ea', { ...S, seed: S.seed + j, a: 0.55, blooms: 0, w: 0.5 });
              paint(g, rrPts(x + (w / 3) * 0.58 - 3.5, -21, (w / 3) * 0.42, 9, 1.5), '#cfe3ea', { ...S, seed: S.seed + j + 9, a: 0.55, blooms: 0, w: 0.5 });
            }
            paint(g, rrPts(x - 3, -26, 6, 26, 1.5), '#a9b2b8', { ...S, seed: S.seed + j + 20, grad: [0.15, -0.1] });
            paint(g, rectPts(x - 2, -24, 4, 2.4), '#3b3b44', { ...S, seed: S.seed + j + 30, blooms: 0, w: 0.4 });
            dot(g, x, -22.8, 0.7, j % 2 ? '#e05040' : '#5ac85a');
          }
        }),
      };
    }
    case 'sculpture':
      return {
        front: sprite(k, [-2, -66, 44, 70], (g) => {
          g.fillStyle = 'rgba(50,30,20,0.18)'; g.beginPath(); g.ellipse(20, 0.5, 15, 1.8, 0, 0, TAU); g.fill();
          paint(g, rectPts(8, -22, 24, 22), '#b9a68a', { ...S, grad: [0.08, -0.12] });
          paint(g, rrPts(12, -12, 16, 5, 0.8), '#d1a64a', { ...S, seed: S.seed + 1, blooms: 0 });
          letters(g, 'NEST EGG', 20, -8.4, 2.2, { seed: 31, w: 0.42 });
          const rib = [];
          for (let t = 0; t <= 1; t += 0.05) rib.push(20 + Math.sin(t * Math.PI * 2.4) * 4, -22 - t * 18);
          for (let t = 1; t >= 0; t -= 0.05) rib.push(20 + Math.sin(t * Math.PI * 2.4 + 0.9) * 4 + 1.5, -22 - t * 18);
          paint(g, rib, '#c48d38', { ...S, seed: S.seed + 2, blooms: 0 });
          glow(g, 20, -51, 16, [255, 236, 170], 0.4);
          paint(g, eggPts(20, -51, 9, 12, 30), '#f2c64a', { ...S, seed: S.seed + 3, grad: [0.32, -0.12] });
          g.fillStyle = 'rgba(255,252,236,0.75)';
          g.beginPath(); g.ellipse(17, -55, 2, 3.4, -0.3, 0, TAU); g.fill();
        }),
      };
    case 'cooler':
      return {
        back: sprite(k, [-3, -48, 20, 52], (g) => {
          g.fillStyle = 'rgba(50,30,20,0.18)'; g.beginPath(); g.ellipse(7, 0.5, 8, 1.6, 0, 0, TAU); g.fill();
          paint(g, rrPts(0, -30, 14, 30, 1.5), '#c9c1b0', { ...S, grad: [0.08, -0.1] });
          paint(g, rrPts(1.5, -45, 11, 15.5, 3.5), '#8fc6e6', { ...S, seed: S.seed + 1, a: 0.85, grad: [0.18, -0.08] });
          paint(g, rectPts(4.5, -32, 5, 2.4), '#8fc6e6', { ...S, seed: S.seed + 2, blooms: 0, w: 0.45 });
          g.fillStyle = 'rgba(255,255,255,0.55)';
          g.fillRect(3.4, -42, 1.4, 9);
          dot(g, 4.5, -24, 1, '#4d84c4');
          dot(g, 9.5, -24, 1, '#d9574b');
          paint(g, rectPts(14, -26, 3, 9), '#efece2', { ...S, seed: S.seed + 3, blooms: 0, w: 0.4 });
        }),
      };
    case 'copier':
      return {
        back: sprite(k, [-12, -36, 66, 40], (g) => {
          const w = it.w;
          g.fillStyle = 'rgba(50,30,20,0.18)'; g.beginPath(); g.ellipse(w / 2, 0.5, w / 2 + 2, 1.8, 0, 0, TAU); g.fill();
          paint(g, rrPts(0, -26, w, 26, 2), '#b9a27e', { ...S, grad: [0.06, -0.12], blooms: 3 });
          for (let j = 0; j < 2; j++) paint(g, rrPts(3, -15 + j * 6.5, w - 14, 5, 1), shade('#b9a27e', -0.08), { ...S, seed: S.seed + 10 + j, blooms: 0, w: 0.5 });
          paint(g, rrPts(w - 10, -24, 8, 6, 1), '#7a6a58', { ...S, seed: S.seed + 2, blooms: 0, w: 0.5 });
          dot(g, w - 8, -21, 0.8, '#5ac85a');
          dot(g, w - 5, -21, 0.8, '#efb23a');
          paint(g, [-9, -18, 0, -16, 0, -13, -9, -15], '#9a8a70', { ...S, seed: S.seed + 3, blooms: 0, w: 0.5 });
          paint(g, [-8, -19.4, 0, -17.4, 0, -16.4, -8, -18.4], '#ece6d6', { ...S, seed: S.seed + 4, blooms: 0, w: 0.4, edge: 0 });
          paint(g, rrPts(-1, -30, w + 2, 4.2, 1.2), '#8f7d62', { ...S, seed: S.seed + 5, blooms: 0 });
        }),
      };
    case 'cabinet':
      return {
        front: sprite(k, [-2, -46, 24, 50], (g) => {
          const c = '#a1ad78';
          g.fillStyle = 'rgba(50,30,20,0.18)'; g.beginPath(); g.ellipse(10, 0.5, 11, 1.6, 0, 0, TAU); g.fill();
          paint(g, rectPts(0, -44, 20, 44), c, { ...S, grad: [0.06, -0.1] });
          for (let j = 0; j < 4; j++) {
            paint(g, rrPts(1.8, -42 + j * 10.6, 16.4, 9.2, 1), shade(c, 0.05), { ...S, seed: S.seed + j, blooms: 0, w: 0.5 });
            paint(g, rrPts(7, -39.5 + j * 10.6, 6, 1.8, 0.6), '#c9c2b0', { ...S, seed: S.seed + j + 5, blooms: 0, w: 0.4 });
            paint(g, rectPts(7.5, -37 + j * 10.6, 5, 2.6), '#f1ead8', { ...S, seed: S.seed + j + 9, blooms: 0, w: 0.35, edge: 0, ia: 0.5 });
          }
        }),
      };
    case 'boardroom': {
      const Wd = it.u1 - it.u;
      const pitch = Wd / it.seats;
      return {
        back: sprite(k, [-4, -50, Wd + 8, 30], (g) => {
          for (let s = 0; s < it.seats; s++) {
            const cx = pitch * (s + 0.5);
            paint(g, rrPts(cx - 7.5, -46, 15, 26, 4.5), '#a5653f', { ...S, seed: S.seed + s, grad: [0.1, -0.1] });
            for (let j = 0; j < 3; j++) dot(g, cx - 4 + j * 4, -42, 0.45, '#e0b84a');
          }
        }),
        front: sprite(k, [-6, -52, Wd + 40, 56], (g) => {
          g.fillStyle = 'rgba(40,20,10,0.22)'; g.beginPath(); g.ellipse(Wd / 2, 0.5, Wd / 2 + 4, 2, 0, 0, TAU); g.fill();
          paint(g, rectPts(12, -22, Wd * 0.18, 22), '#6b3a1f', { ...S, seed: S.seed + 20 });
          paint(g, rectPts(Wd * 0.82 - 12, -22, Wd * 0.18, 22), '#6b3a1f', { ...S, seed: S.seed + 21 });
          paint(g, rrPts(-2, -27, Wd + 4, 6, 2), '#7a4426', { ...S, seed: S.seed + 22, grad: [0.15, -0.1] });
          for (let s = 0; s < it.seats; s++) {
            const cx = pitch * (s + 0.5);
            paint(g, rectPts(cx - 4, -27.6, 7, 1.2), '#efe6cf', { ...S, seed: S.seed + 30 + s, blooms: 0, edge: 0, w: 0.35, ia: 0.6 });
            paint(g, rrPts(cx + 4.5, -31, 2.2, 3.4, 0.5), '#cfe3ea', { ...S, seed: S.seed + 40 + s, a: 0.7, blooms: 0, w: 0.35 });
          }
          paint(g, rrPts(Wd / 2 - 2, -33.5, 4.5, 6.5, 1.5), '#9fc6dc', { ...S, seed: S.seed + 50, blooms: 0, w: 0.45 });
          // the flip chart: down, down, and then (of course) up
          const ex = Wd + 6;
          poly(g, [ex + 3, 0, ex + 12, -50], 0.9, 0.85, S.seed + 60, [110, 70, 40]);
          poly(g, [ex + 21, 0, ex + 12, -50], 0.9, 0.85, S.seed + 61, [110, 70, 40]);
          paint(g, rectPts(ex, -48, 24, 29), '#dccdaa', { ...S, seed: S.seed + 62, blooms: 1 });
          paint(g, rectPts(ex - 1, -50, 26, 3), '#7a6a58', { ...S, seed: S.seed + 63, blooms: 0 });
          poly(g, [ex + 3, -44, ex + 8, -36, ex + 12, -38, ex + 15, -28, ex + 22, -42], 0.9, 0.9, S.seed + 64, [216, 76, 64], 0.3);
          poly(g, [ex + 19, -42.5, ex + 22.4, -42.4, ex + 22, -39], 0.8, 0.9, S.seed + 65, [216, 76, 64]);
          letters(g, 'Q4', ex + 5, -21.5, 2.8, { seed: 66, w: 0.45, col: '#4d84c4' });
        }),
      };
    }
    case 'desk': {
      const w = it.w;
      return {
        back: sprite(k, [w / 2 - 14, -54, 28, 30], (g) => {
          paint(g, rrPts(w / 2 - 10, -50, 20, 26, 6), '#a5653f', { ...S, seed: S.seed + 1, grad: [0.1, -0.12] });
          for (let j = 0; j < 4; j++) for (let r = 0; r < 3; r++) dot(g, w / 2 - 6 + j * 4, -45 + r * 5, 0.45, '#5a311a', 0.6);
        }),
        front: sprite(k, [-4, -50, w + 8, 54], (g) => {
          g.fillStyle = 'rgba(40,20,10,0.22)'; g.beginPath(); g.ellipse(w / 2, 0.5, w / 2 + 3, 2, 0, 0, TAU); g.fill();
          paint(g, rectPts(0, -27, w, 27), '#7a4426', { ...S, grad: [0.06, -0.12], blooms: 3 });
          paint(g, rrPts(-2, -30.5, w + 4, 4, 1.2), '#5e331b', { ...S, seed: S.seed + 2 });
          for (const px of [4, w - 30]) {
            for (let j = 0; j < 3; j++) {
              paint(g, rectPts(px, -24 + j * 7.5, 26, 6.5), '#8a5530', { ...S, seed: S.seed + px + j, blooms: 0, w: 0.5 });
              dot(g, px + 13, -20.8 + j * 7.5, 0.8, '#e0b84a');
            }
          }
          paint(g, rectPts(36, -24, w - 72, 18), '#6b3a1f', { ...S, seed: S.seed + 9, blooms: 1, w: 0.5 });
          // banker's lamp, pen set, phone, papers, a name plate
          paint(g, rectPts(w * 0.18 - 1, -40, 2, 9), '#d1a64a', { ...S, seed: S.seed + 10, blooms: 0, w: 0.45 });
          paint(g, rrPts(w * 0.18 - 6, -31.5, 12, 1.8, 0.6), '#d1a64a', { ...S, seed: S.seed + 11, blooms: 0, w: 0.45 });
          paint(g, [w * 0.18 - 9, -38, w * 0.18 + 9, -38, w * 0.18 + 7, -43, w * 0.18 - 7, -43], '#3f8a5a', { ...S, seed: S.seed + 12, grad: [0.2, -0.1], blooms: 0 });
          paint(g, rrPts(w * 0.42, -33.5, 10, 3, 0.6), '#efe6cf', { ...S, seed: S.seed + 13, blooms: 0, w: 0.4 });
          paint(g, rrPts(w * 0.6, -34.5, 9, 4, 1.2), '#2a2a30', { ...S, seed: S.seed + 14, blooms: 0, w: 0.45 });
          poly(g, [w * 0.6 + 1, -34.5, w * 0.6 + 4.5, -37, w * 0.6 + 8, -34.5], 1.2, 0.9, S.seed + 15, [42, 42, 48]);
          paint(g, rrPts(w * 0.78, -34, 14, 3.5, 0.6), '#d1a64a', { ...S, seed: S.seed + 16, blooms: 0, w: 0.45 });
          letters(g, 'THE BOSS', w * 0.78 + 7, -31.2, 2.1, { seed: 17, w: 0.4 });
        }),
      };
    }
    case 'globe':
      return {
        front: sprite(k, [-4, -38, 26, 42], (g) => {
          g.fillStyle = 'rgba(40,20,10,0.2)'; g.beginPath(); g.ellipse(9, 0.5, 9, 1.6, 0, 0, TAU); g.fill();
          for (const [a, b] of [[2, 9], [16, 9], [9, 9]]) poly(g, [a, 0, b, -14], 1.2, 0.9, S.seed + a, [110, 60, 30]);
          paint(g, rectPts(3, -15, 12, 2.2), '#6b3a1f', { ...S, seed: S.seed + 1, blooms: 0 });
          paint(g, elPts(9, -24, 8.2, 8.2, 22), '#6aa8d8', { ...S, seed: S.seed + 2, grad: [0.18, -0.12] });
          for (const [cx, cy, rx, ry] of [[6.5, -27, 3, 2.4], [11.5, -21, 2.6, 3.2], [7, -20, 1.6, 1.2]]) paint(g, elPts(cx, cy, rx, ry, 10), '#9cc46a', { ...S, seed: S.seed + cx, blooms: 0, w: 0.4 });
          g.strokeStyle = css('#c48d38'); g.lineWidth = 1;
          g.beginPath(); g.arc(9, -24, 10, -Math.PI * 0.8, Math.PI * 0.8, false); g.stroke();
        }),
      };
    case 'tallclock':
      return {
        back: sprite(k, [-3, -74, 26, 78], (g) => {
          g.fillStyle = 'rgba(40,20,10,0.22)'; g.beginPath(); g.ellipse(10, 0.5, 11, 1.8, 0, 0, TAU); g.fill();
          paint(g, rectPts(1, -14, 18, 14), '#6b3a1f', { ...S, seed: S.seed + 1 });
          paint(g, rectPts(3, -50, 14, 37), '#5e331b', { ...S, seed: S.seed + 2 });
          paint(g, rectPts(5, -47, 10, 30), '#2e1c10', { ...S, seed: S.seed + 3, blooms: 0, w: 0.4 });
          paint(g, rrPts(0, -70, 20, 21, 3), '#6b3a1f', { ...S, seed: S.seed + 4 });
          paint(g, [-1, -68, 10, -74, 21, -68], '#5e331b', { ...S, seed: S.seed + 5, blooms: 0 });
        }),
        front: sprite(k, [-3, -70, 26, 60], (g) => {
          g.strokeStyle = css('#d1a64a', 0.9); g.lineWidth = 0.9;
          g.strokeRect(5, -47, 10, 30);
          g.fillStyle = 'rgba(255,236,190,0.12)'; g.fillRect(5, -47, 10, 30);
          line(g, 6.5, -44, 9.5, -38, 0.6, 0.4, 9, [255, 255, 255]);
          clockFace(g, 10, -60, 6.4, S.seed + 10, '#d1a64a');
        }),
      };
    default:
      return {};
  }
}

function buildMid(F, k) {
  const out = [];
  const people = new Map();
  F.mid.items.forEach((it, i) => {
    out[i] = midSprites(F, it, i, k);
    if (it.kind === 'cubicles') {
      const n = Math.round((it.u1 - it.u) / 40);
      for (let d = 0; d < n; d++) {
        if (!(it.heads.includes(d) || d === it.pop)) continue;
        const seed = i * 31 + d;
        const T = traits(seed);
        for (const look of [-1, 1]) people.set(`c${seed}:${look}`, sprite(k, [-9, -7, 18, 22], (g) => bust(g, 0, 0, 5, T, { look, seed, w: 0.55 })));
      }
    } else if (it.kind === 'boardroom') {
      for (let s = 0; s < it.seats; s++) {
        if (!it.sitters.includes(s)) continue;
        const seed = i * 17 + s;
        const T = { ...traits(seed + 500), tie: CLOTHES[(seed * 3) % CLOTHES.length], shirt: ['#2f3b5c', '#4a4a52', '#5a4a3a', '#3a4a5e'][seed % 4] };
        people.set(`b${seed}:0`, sprite(k, [-9, -7, 18, 22], (g) => bust(g, 0, 0, 5, T, { look: 0, seed, w: 0.55 })));
        people.set(`b${seed}:1`, sprite(k, [-9, -7, 18, 22], (g) => bust(g, 0, 0, 5, T, { look: 0, seed, w: 0.55, shut: true })));
      }
    } else if (it.kind === 'reception') {
      const T = { ...traits(4242), style: 1, hair: '#c0532e', shirt: '#3c9f99', tie: null };
      people.set(`r${i}`, sprite(k, [-9, -8, 18, 23], (g) => bust(g, 0, 0, 5, T, { look: 0.4, seed: 4242, w: 0.55, headset: true })));
    }
  });
  return { items: out, people };
}

// ------------------------------------------------------------------ the cut slab under the lane
const ROOMS = {
  lobby: { name: 'BASEMENT', stations: ['mail', 'boiler', 'cars', 'janitor', 'mail', 'ladder', 'cars', 'boiler', 'mailcart'] },
  open: { name: 'FLOOR 22', stations: ['desks', 'cooler', 'desks', 'ladder', 'desks', 'printer', 'coats', 'desks', 'mailcart', 'plant'] },
  exec: { name: 'FLOOR 87', stations: ['kitchen', 'diners', 'soup', 'diners', 'kitchen', 'ladder', 'diners', 'kitchen'] },
};
const ROOM_TOP = 244.6;
const ROOM_HEAD = 258.6;

function roomStation(g, kind, x, w, seed, F) {
  const S = { seed, w: 0.6, ia: 0.85, blooms: 1 };
  const R = rng(seed);
  const cx = x + w / 2;
  const r = 4.3;
  const person = (hx, hy, o = {}) => {
    const T = traits(seed * 5 + (o.j ?? 0));
    if (o.cap) T.hat = 1;
    if (o.chef) T.hat = -1;
    bust(g, hx, hy, o.r ?? r, T, { look: o.look ?? (R() < 0.5 ? -0.6 : 0.6), w: 0.45, seed: seed + (o.j ?? 0), shut: o.shut });
    if (o.chef) {
      const rr = o.r ?? r;
      paint(g, [...elPts(hx, hy - rr * 1.55, rr * 1.05, rr * 0.8, 14, Math.PI * 0.92, TAU + 0.08), hx + rr * 0.8, hy - rr * 0.75, hx - rr * 0.8, hy - rr * 0.75], '#f3eee2', { ...S, seed: seed + 30 + (o.j ?? 0), w: 0.45 });
      paint(g, rectPts(hx - rr * 0.82, hy - rr * 0.95, rr * 1.64, rr * 0.36), '#e6dfcf', { ...S, seed: seed + 40 + (o.j ?? 0), w: 0.4, blooms: 0 });
    }
    return T;
  };
  const desk = (dx, dw, col = '#c99a6a') => {
    paint(g, rrPts(dx, 264.2, dw, 7, 0.8), col, { ...S, seed: seed + dx, blooms: 1 });
    line(g, dx + 1, 265.6, dx + dw - 1, 265.6, 0.4, 0.35, seed + dx);
  };
  const monitor = (mx) => {
    paint(g, rrPts(mx, 255.6, 8, 6.4, 0.8), '#5a6068', { ...S, seed: seed + mx, blooms: 0, w: 0.45 });
    g.fillStyle = 'rgba(190,232,250,0.95)';
    g.fillRect(mx + 1, 256.6, 6, 4.2);
    paint(g, rectPts(mx + 3, 262, 2, 2.4), '#5a6068', { ...S, seed: seed + mx + 1, blooms: 0, w: 0.4, edge: 0 });
  };
  switch (kind) {
    case 'desks': {
      const n = w > 58 ? 2 : 1;
      for (let j = 0; j < n; j++) {
        const px = x + (w * (j + 0.5)) / n;
        const T = person(px - 2, ROOM_HEAD + R() * 1.2, { j });
        monitor(px + 4);
        if (R() < 0.45) {
          // on the phone
          paint(g, rrPts(px - 2 - r * 1.3, ROOM_HEAD - 1.5, 2, 5, 0.8), '#2a2a30', { ...S, seed: seed + j + 50, blooms: 0, w: 0.4 });
        }
        desk(px - 13, 26, j % 2 ? '#c99a6a' : '#bf8f60');
        paint(g, rrPts(px - 11, 262.3, 3, 2.6, 0.5), CLOTHES[(seed + j) % CLOTHES.length], { ...S, seed: seed + j + 60, blooms: 0, w: 0.4 });
        paint(g, rectPts(px - 7, 263.4, 7, 1.2), '#f1ead8', { ...S, seed: seed + j + 70, blooms: 0, w: 0.35, edge: 0 });
        if (T.glasses) { /* the glasses already say "accounts" */ }
      }
      break;
    }
    case 'ladder': {
      const lx = cx;
      poly(g, [lx - 6, 271, lx - 2, 252], 0.9, 0.9, seed, [150, 110, 70]);
      poly(g, [lx + 6, 271, lx + 2, 252], 0.9, 0.9, seed + 1, [150, 110, 70]);
      for (let y = 256; y < 271; y += 4) line(g, lx - 5 + (271 - y) * 0.0, y, lx + 5, y, 0.7, 0.85, seed + y, [150, 110, 70]);
      person(lx, 252.6, { j: 1, look: 0.4, cap: true, r: 4 });
      poly(g, [lx + 3.4, 254, lx + 6.4, 249.6, lx + 7.6, 247.6], 0.9, 0.95, seed + 3, hex(traits(seed * 5 + 1).shirt));
      paint(g, elPts(lx + 8, 247.2, 1.8, 1.8, 10), '#fff6c8', { ...S, seed: seed + 4, blooms: 0, w: 0.45 });
      glow(g, lx + 8, 247.2, 8, [255, 240, 170], 0.6);
      break;
    }
    case 'mailcart': {
      person(cx + 8, ROOM_HEAD, { j: 2, look: -0.8, cap: F.id !== 'exec' });
      paint(g, rrPts(cx - 16, 262, 18, 9, 1), '#9a7a58', { ...S, seed: seed + 1 });
      for (let j = 0; j < 5; j++) paint(g, rectPts(cx - 14 + j * 3.2, 258.6 + (j % 2), 2.6, 4), '#f6f0e0', { ...S, seed: seed + 2 + j, blooms: 0, w: 0.35, edge: 0 });
      letters(g, 'MAIL', cx - 7, 268, 2.8, { col: '#f6ecd0', seed, w: 0.5 });
      break;
    }
    case 'cooler': {
      paint(g, rrPts(cx - 4, 252.5, 8, 9, 2.5), '#8fc6e6', { ...S, a: 0.9 });
      paint(g, rectPts(cx - 4.5, 261.5, 9, 10), '#e3ddd0', { ...S, seed: seed + 1 });
      person(cx - 13, ROOM_HEAD + 0.5, { j: 0, look: 0.8 });
      person(cx + 13, ROOM_HEAD + 0.5, { j: 1, look: -0.8 });
      paint(g, rrPts(cx - 9, 247.5, 9, 5.5, 2.4), '#fbf6e8', { ...S, seed: seed + 2, blooms: 0, w: 0.45 });
      poly(g, [cx - 7, 250.2, cx - 6, 249.5, cx - 5, 250.6, cx - 4, 249.5, cx - 3, 250.4], 0.45, 0.9, seed + 3);
      break;
    }
    case 'coats': {
      poly(g, [cx, 271, cx, 251], 1.2, 0.9, seed, [110, 70, 40]);
      paint(g, rrPts(cx - 6, 248.2, 12, 3, 1.2), '#6b5a4a', { ...S, seed: seed + 1 });
      paint(g, rrPts(cx - 3.4, 245.8, 6.8, 3, 1.2), '#6b5a4a', { ...S, seed: seed + 2 });
      paint(g, rrPts(cx + 1, 253, 7, 15, 2.4), '#c9573f', { ...S, seed: seed + 3 });
      paint(g, rrPts(cx - 8, 253, 6.5, 13, 2.4), '#5a6f9e', { ...S, seed: seed + 4 });
      poly(g, [cx - 13, 271, cx - 13, 257, cx - 11.5, 255.5], 0.8, 0.9, seed + 5, [60, 60, 70]);
      break;
    }
    case 'printer': {
      person(cx + 10, ROOM_HEAD, { j: 0, look: -0.7 });
      paint(g, rrPts(cx - 16, 259, 20, 12, 1.5), '#b9a27e', S);
      paint(g, rectPts(cx - 12, 255.6, 11, 3.6), '#f6f0e0', { ...S, seed: seed + 1, blooms: 0, w: 0.4 });
      break;
    }
    case 'plant': {
      for (let j = 0; j < 9; j++) {
        const a = -Math.PI / 2 + (j - 4) * 0.33;
        const pts = elPts(cx + Math.cos(a) * 7, 258 + Math.sin(a) * 7, 3.6, 1.9, 8);
        paint(g, pts, j % 2 ? '#6aa456' : '#86bb68', { ...S, seed: seed + j, blooms: 0, w: 0.45 });
      }
      paint(g, [cx - 5.5, 261, cx + 5.5, 261, cx + 4.5, 271, cx - 4.5, 271], '#c8704a', { ...S, seed: seed + 9 });
      break;
    }
    case 'mail': {
      paint(g, rectPts(x + 2, 249, 30, 22), '#b98a5a', S);
      for (let rI = 0; rI < 3; rI++) {
        for (let c = 0; c < 5; c++) {
          paint(g, rectPts(x + 4 + c * 5.4, 251 + rI * 6, 4.6, 5), '#8a5d3a', { ...S, seed: seed + rI * 9 + c, blooms: 0, w: 0.35 });
          if (R() < 0.65) { g.fillStyle = 'rgba(250,246,232,0.95)'; g.fillRect(x + 4.6 + c * 5.4, 252.4 + rI * 6, 3.4, 2.4); }
        }
      }
      person(x + 42, ROOM_HEAD, { j: 0, cap: true, look: -0.6 });
      letters(g, 'MAIL ROOM', x + 17, 248, 2.8, { seed, w: 0.48, col: '#5a3a24' });
      for (let j = 0; j < 2; j++) paint(g, [...elPts(x + 52 + j * 8, 271, 4.4, 6.4, 12, Math.PI, TAU)], '#c9b38a', { ...S, seed: seed + j + 40 });
      break;
    }
    case 'boiler': {
      paint(g, rrPts(x + 4, 252, w - 8, 19, 7), '#c4573e', { ...S, grad: [0.12, -0.1], blooms: 2 });
      for (const px of [x + 10, x + w - 14]) paint(g, rectPts(px, 243, 3.4, 10), '#9aa4ac', { ...S, seed: seed + px, blooms: 0 });
      for (const gx of [x + w * 0.36, x + w * 0.62]) {
        paint(g, elPts(gx, 258.5, 3.2, 3.2, 12), '#f6ecd0', { ...S, seed: seed + gx, blooms: 0 });
        line(g, gx, 258.5, gx + 1.9, 256.8, 0.5, 0.9, seed + gx);
      }
      letters(g, 'BOILER', cx, 268, 3.2, { seed, w: 0.55, col: '#f6ecd0' });
      for (let j = 0; j < 3; j++) poly(g, [x + w - 8 + j * 1.6, 251, x + w - 9 + j * 1.6, 247.5, x + w - 7.5 + j * 1.6, 245.4], 0.5, 0.35, seed + j, [150, 150, 160]);
      break;
    }
    case 'cars': {
      for (let j = 0; j < 2; j++) {
        const px = x + 4 + j * (w / 2);
        paint(g, [...elPts(px + 12, 271, 12, 9, 16, Math.PI, TAU)], CLOTHES[(seed + j * 3) % CLOTHES.length], { ...S, seed: seed + j });
        paint(g, [...elPts(px + 12, 265.4, 7, 4, 12, Math.PI, TAU)], '#bfe0ee', { ...S, seed: seed + j + 5, blooms: 0, w: 0.45 });
      }
      letters(g, 'CAR PARK', cx, 251, 2.8, { seed, w: 0.48, col: '#5a3a24' });
      break;
    }
    case 'janitor': {
      person(cx - 4, ROOM_HEAD, { j: 0, cap: true, look: 0.5 });
      poly(g, [cx + 4, 271, cx + 9, 250], 0.9, 0.9, seed, [140, 100, 60]);
      paint(g, [cx + 10, 262, cx + 21, 262, cx + 20, 271, cx + 11, 271], '#efb23a', { ...S, seed: seed + 3 });
      break;
    }
    case 'kitchen': {
      for (let j = 0; j < 3; j++) {
        const px = x + 8 + j * ((w - 16) / 2);
        poly(g, [px, ROOM_TOP, px, 249], 0.5, 0.8, seed + j);
        paint(g, elPts(px, 252, 3.6, 3.2, 12), '#8a8f98', { ...S, seed: seed + j + 4, blooms: 0, w: 0.45 });
        poly(g, [px + 3.4, 252, px + 6, 251], 0.7, 0.8, seed + j + 7, [80, 80, 90]);
      }
      person(x + w * 0.3, ROOM_HEAD + 0.6, { j: 0, chef: true });
      person(x + w * 0.74, ROOM_HEAD + 0.6, { j: 1, chef: true });
      paint(g, rectPts(x + 2, 264.5, w - 4, 7), '#b9c0c6', S);
      paint(g, rrPts(x + w * 0.46, 259.4, 9, 5.4, 1), '#6b7684', { ...S, seed: seed + 9 });
      for (let j = 0; j < 3; j++) poly(g, [x + w * 0.46 + 2.5 + j * 2, 258.6, x + w * 0.46 + 1.5 + j * 2, 254.6, x + w * 0.46 + 3.5 + j * 2, 250.6], 0.5, 0.35, seed + 12 + j, [140, 150, 160]);
      break;
    }
    case 'diners': {
      const n = w > 58 ? 3 : 2;
      for (let j = 0; j < n; j++) person(x + (w * (j + 0.5)) / n, ROOM_HEAD + R() * 1.4, { j });
      paint(g, rrPts(x + 3, 264.5, w - 6, 7, 1), '#d9574b', { ...S, seed: seed + 3 });
      g.fillStyle = 'rgba(250,246,232,0.9)';
      for (let u = x + 5; u < x + w - 6; u += 5) g.fillRect(u, 264.9, 2.5, 1.5);
      for (let j = 0; j < n; j++) paint(g, elPts(x + (w * (j + 0.5)) / n + 3, 264.3, 3.4, 1, 10), '#f6f0e0', { ...S, seed: seed + 20 + j, blooms: 0, w: 0.4 });
      break;
    }
    case 'soup': {
      paint(g, rrPts(x + 6, 248, w - 12, 13, 1), '#3f5a4a', S);
      letters(g, 'SOUP', cx, 253.8, 3.2, { seed, w: 0.55, col: '#f6ecd0' });
      letters(g, 'OF THE DAY', cx, 258.6, 2.3, { seed: seed + 1, w: 0.42, col: '#f6ecd0' });
      person(cx, 265.5, { j: 0, chef: true, r: 3.8 });
      break;
    }
    default: break;
  }
}

function buildSlab(F, k) {
  const P = PAL[F.id];
  const S = newStrip(SLAB_P, LANE_TOP, H, k);
  const g = S.g;
  const C0 = LANE_TOP + 2.4;
  const C1 = 242.6;
  // the storey below: its wall, its lamps, and what is going on in it
  bandWash(g, SLAB_P, ROOM_TOP - 1, H + 1, P.roomWall, F.stage * 19 + 1);
  if (F.id === 'lobby') {
    g.fillStyle = css(shade(P.roomWall, -0.14), 0.6);
    for (let y = ROOM_TOP + 6; y < H; y += 7) {
      g.fillRect(0, y, SLAB_P, 0.45);
      for (let x = ((y / 7) % 2) * 8; x < SLAB_P; x += 16) g.fillRect(x, y, 0.45, 7);
    }
  } else if (F.id === 'exec') {
    g.fillStyle = css(shade(P.roomWall, -0.1), 0.55);
    for (let y = ROOM_TOP + 4; y < H; y += 5) g.fillRect(0, y, SLAB_P, 0.4);
    for (let x = 0; x < SLAB_P; x += 5) g.fillRect(x, ROOM_TOP, 0.4, H - ROOM_TOP);
  }
  const room = ROOMS[F.id];
  const R = rng(F.stage * 333 + 1);
  let u = 34;
  let n = 0;
  const placed = [];
  while (u < SLAB_P - 70) {
    const kind = room.stations[n % room.stations.length];
    const w = 54 + ((R() * 3) | 0) * 8;
    placed.push({ kind, u, w, seed: F.stage * 100 + n });
    u += w + 12 + R() * 18 + (n === 2 ? 34 : 0);
    n++;
  }
  // a clock or a poster on the wall between stations
  const signGap = placed.length > 3 ? (placed[2].u + placed[2].w + placed[3].u) / 2 : SLAB_P / 2;
  for (let j = 0; j < placed.length; j++) {
    const a = placed[j];
    if (j === 2 && F.id !== 'lobby') continue;
    let gx = a.u + a.w + 6;
    const lampD = mod(gx - 20 + 32, 64) - 32;
    if (Math.abs(lampD) < 8) gx += lampD > 0 ? 8 - lampD : -8 - lampD;
    if (j % 3 === 0) clockFace(g, gx, 250.5, 3.2, 70 + j, '#d9574b');
    else if (j % 3 === 1) {
      paint(g, rectPts(gx - 4.5, 247.5, 9, 11), '#fbf4e2', { seed: 80 + j, w: 0.45, blooms: 0, ia: 0.8 });
      paint(g, rectPts(gx - 3.3, 248.7, 6.6, 6.4), CLOTHES[(j * 3) % CLOTHES.length], { seed: 90 + j, w: 0.35, blooms: 0, ia: 0.7 });
    }
  }
  for (const st of placed) roomStation(g, st.kind, st.u, st.w, st.seed, F);
  // lamps hanging from the slab
  for (let x = 20; x < SLAB_P; x += 64) {
    poly(g, [x, ROOM_TOP, x, ROOM_TOP + 2.6], 0.5, 0.8, x);
    paint(g, [x - 4.4, ROOM_TOP + 5.8, x + 4.4, ROOM_TOP + 5.8, x + 2.2, ROOM_TOP + 2.6, x - 2.2, ROOM_TOP + 2.6], F.id === 'exec' ? '#f1ece0' : '#3f7a58', { seed: x, w: 0.5, blooms: 0 });
    glow(g, x, ROOM_TOP + 8, 15, [255, 236, 170], 0.32);
  }
  paint(g, rrPts(4, ROOM_TOP + 2.4, 26, 6.4, 1.2), '#f6ecd0', { seed: 7, w: 0.5, blooms: 0 });
  letters(g, room.name, 17, ROOM_TOP + 7.2, 3.6, { col: '#5a3a24', seed: 9, w: 0.55 });
  const dept = { open: 'ACCOUNTS DEPT.', exec: 'CANTEEN' }[F.id];
  if (dept) {
    const dx = signGap;
    const dw = dept.length * 3.1 + 6;
    poly(g, [dx - dw / 2 + 3, ROOM_TOP, dx - dw / 2 + 3, ROOM_TOP + 2.4], 0.4, 0.8, 5);
    poly(g, [dx + dw / 2 - 3, ROOM_TOP, dx + dw / 2 - 3, ROOM_TOP + 2.4], 0.4, 0.8, 6);
    paint(g, rrPts(dx - dw / 2, ROOM_TOP + 2.4, dw, 6.4, 1.2), F.id === 'exec' ? '#d9574b' : '#4d84c4', { seed: 8, w: 0.5, blooms: 0 });
    letters(g, dept, dx, ROOM_TOP + 7.2, 3.4, { col: '#f6ecd0', seed: 10, w: 0.55 });
  }
  // a soft shadow under the slab into the room
  const sh = g.createLinearGradient(0, ROOM_TOP, 0, ROOM_TOP + 7);
  sh.addColorStop(0, 'rgba(60,40,24,0.32)');
  sh.addColorStop(1, 'rgba(60,40,24,0)');
  g.fillStyle = sh;
  g.fillRect(0, ROOM_TOP, SLAB_P, 7);
  // the cut: the floor's finish, the concrete, the ceiling's plaster
  bandWash(g, SLAB_P, LANE_TOP, C0, P.finish, F.stage * 19 + 2, 20);
  concreteBand(g, SLAB_P, C0, C1, F.stage * 19 + 3, P.concrete);
  // services running through the slab, cut across: pipes, a cable tray
  const R2 = rng(F.stage * 19 + 4);
  for (let x = 40 + R2() * 40; x < SLAB_P - 20; x += 90 + R2() * 90) {
    const kind = (R2() * 3) | 0;
    const y = (C0 + C1) / 2 + 0.6;
    if (kind === 0) {
      paint(g, elPts(x, y, 2.6, 2.6, 14), '#4d84c4', { seed: x, w: 0.6, blooms: 0 });
      dot(g, x, y, 1.15, '#2e3a50');
    } else if (kind === 1) {
      paint(g, elPts(x, y, 2.2, 2.2, 12), '#d9574b', { seed: x, w: 0.6, blooms: 0 });
      dot(g, x, y, 0.9, '#5a2a24');
    } else {
      paint(g, rrPts(x - 4.2, y - 2.4, 8.4, 4.8, 1), '#efb23a', { seed: x, w: 0.6, blooms: 0 });
      for (let j = 0; j < 3; j++) dot(g, x - 2.3 + j * 2.3, y, 0.8, ['#d9574b', '#4d84c4', '#3b3b44'][j]);
    }
  }
  g.fillStyle = 'rgba(70,56,44,0.75)';
  for (let x = 4; x < SLAB_P; x += 9) { g.beginPath(); g.arc(x, C1 - 1.4, 0.55, 0, TAU); g.fill(); }
  bandWash(g, SLAB_P, C1, ROOM_TOP, '#efe7d4', F.stage * 19 + 5, 12);
  pline(g, SLAB_P, LANE_TOP + 0.45, 1.3, 0.95, F.stage + 60, 0.12);
  pline(g, SLAB_P, C0, 0.55, 0.65, F.stage + 61, 0.18);
  pline(g, SLAB_P, C1, 0.8, 0.85, F.stage + 62, 0.22);
  pline(g, SLAB_P, ROOM_TOP, 0.6, 0.6, F.stage + 63, 0.22);
  return finishStrip(S, 0.9);
}

// ------------------------------------------------------------------ close to camera (front)
function buildFront(F, k) {
  const out = {};
  for (const it of F.front.items) {
    const key = it.kind + (it.w || '');
    if (out[key]) continue;
    if (it.kind === 'pillar') {
      // A column right by the camera, drawn the cutaway way: only its stubs at the top
      // and bottom of the frame, broken off along a jagged line, its cut face hatched.
      // The middle is cut away, so it can never stand over the hero.
      const w = it.w;
      const col = shade(PAL[F.id].column, -0.18);
      out[key] = sprite(k, [-4, -4, w + 8, H + 8], (g) => {
        const R = rng(F.stage * 7 + w);
        const jag = (y0, amp) => {
          const pts = [];
          const n = Math.max(4, Math.round(w / 5));
          for (let j = n; j >= 0; j--) pts.push((w * j) / n, y0 + (j % 2 ? amp : -amp * 0.4) * (0.6 + R() * 0.6));
          return pts;
        };
        const stub = (pts, seed) => {
          wash(g, pts, col, { seed, a: 0.92, blooms: 2, edge: 2.4 });
          g.save();
          g.beginPath(); trace(g, pts, true); g.clip();
          g.strokeStyle = css(INK, 0.3);
          g.lineWidth = 0.6;
          for (let y = -w - 10; y < H + w; y += 4) { g.beginPath(); g.moveTo(0, y + w); g.lineTo(w, y); g.stroke(); }
          g.restore();
          ink(g, wob(pts, true, 0.35, seed + 5), true, 1, 0.9);
        };
        stub([0, -4, w, -4, ...jag(26, 4)], 11);
        const bot = [w, H + 4, 0, H + 4];
        const jb = jag(241, -4);
        for (let i = jb.length - 2; i >= 0; i -= 2) bot.push(jb[i], jb[i + 1]);
        stub(bot, 12);
      }, 0.6);
    } else if (it.kind === 'plant') {
      out[key] = sprite(k, [-44, 226, 88, 46], (g) => {
        const R = rng(F.stage * 5 + 1);
        for (let j = 0; j < 9; j++) {
          const a = -Math.PI / 2 + (j - 4) * 0.28;
          const len = 26 + R() * 18;
          const ex = Math.cos(a) * len * 1.2;
          const ey = H + 4 + Math.sin(a) * len;
          const pts = [-3, H + 4, ex - 4, ey + 6, ex, ey, ex + 4, ey + 6, 3, H + 4];
          wash(g, wob(pts, true, 0.5, j), [52, 78, 50], { seed: j, a: 0.62, blooms: 1, edge: 1.6 });
          ink(g, wob([0, H + 4, ex, ey], false, 0.3, j + 9), false, 0.6, 0.35);
        }
      }, 0.5);
    } else {
      // a chair back rising from the bottom edge, close to camera and in shadow
      out[key] = sprite(k, [-32, 232, 64, 40], (g) => {
        const arm = it.kind === 'armchair';
        const c = arm ? [104, 44, 36] : [78, 60, 50];
        const o = { a: 0.78, blooms: 2, edge: 2.2 };
        if (arm) {
          const back = [-22, 274, -22, 250, -18, 241, 0, 238, 18, 241, 22, 250, 22, 274];
          wash(g, wob(back, true, 0.4, 1), c, { ...o, seed: 2, grad: [0.1, -0.15] });
          ink(g, wob(back, true, 0.35, 5), true, 0.9, 0.55);
          for (const sd of [-1, 1]) {
            const wing = [sd * 20, 274, sd * 20, 252, sd * 27, 248, sd * 29, 254, sd * 27, 274];
            wash(g, wob(wing, true, 0.4, 3 + sd), shade(c, -0.1), { ...o, seed: 3 + sd });
            ink(g, wob(wing, true, 0.35, 7 + sd), true, 0.9, 0.55);
          }
          for (let x = -15; x <= 15; x += 7.5) for (const y of [247, 255]) dot(g, x + (y === 255 ? 3.75 : 0), y, 0.8, [230, 190, 90], 0.6);
        } else {
          const back = [-14, 274, -14, 246, -11, 239, 0, 237.5, 11, 239, 14, 246, 14, 274];
          wash(g, wob(back, true, 0.4, 1), c, { ...o, seed: 2, grad: [0.12, -0.12] });
          ink(g, wob(back, true, 0.35, 5), true, 0.9, 0.55);
          ink(g, wob([-9, 243, 0, 241.5, 9, 243], false, 0.3, 6), false, 0.6, 0.35);
          ink(g, wob([-10, 262, -10, 249], false, 0.3, 8), false, 0.6, 0.3);
          ink(g, wob([10, 262, 10, 249], false, 0.3, 9), false, 0.6, 0.3);
        }
      }, 0.5);
    }
  }
  return out;
}

// ------------------------------------------------------------------ cache
const WALKERS = [
  { u: 40, v: 9, seed: 1, extra: 1 }, { u: 175, v: -7, seed: 2, extra: 0 }, { u: 300, v: 11, seed: 3, extra: 1 },
  { u: 425, v: -10, seed: 4, extra: 2 }, { u: 560, v: 8, seed: 5, extra: 0 }, { u: 690, v: -12, seed: 6, extra: 1 },
  { u: 820, v: 10, seed: 7, extra: 0 }, { u: 955, v: -8, seed: 8, extra: 2 }, { u: 1090, v: 7, seed: 9, extra: 1 },
];

const CACHE = new Map();
function bakeFor(id, k) {
  const key = `${id}@${k}`;
  let B = CACHE.get(key);
  if (B) return B;
  const F = OFFICE_FLOORS[id];
  const P = PAL[id];
  B = { F, P, k };
  B.sky = buildSky(F, k);
  B.far = buildFar(F, k);
  B.near = buildNear(F, k);
  B.clouds = F.outside.clouds.map((c, i) => buildCloud(F, c, i, k));
  B.wall = buildWall(F, k);
  const lift = F.wall.hangs.find((h) => h.kind === 'lift');
  if (lift) B.doors = doorSprites(F, P, lift.w, lift.h, k);
  B.lights = buildLights(F, k);
  B.mid = buildMid(F, k);
  B.floorRows = buildFloorRows(F, k);
  B.slab = buildSlab(F, k);
  B.front = buildFront(F, k);
  B.cars = F.outside.cars.map((c, i) => carSprite(c.kind, Math.sign(c.speed) || 1, 60 + i * 7, k));
  if (F.outside.street) {
    B.walkers = WALKERS.map((w) => {
      const T = traits(900 + w.seed);
      const dir = Math.sign(w.v);
      return [0, 1].map((st) => sprite(k, [-7, -18, 14, 20], (g) => walker(g, T, st, dir, 14.5, w.extra), 0.5));
    });
  }
  const fl = F.outside.flyer;
  if (fl && fl.kind === 'blimp') B.blimp = blimpSprite(F, Math.sign(fl.speed) || 1, fl.label || 'EGGCORP', k);
  if (fl && fl.kind === 'heli') B.heli = heliSprite(Math.sign(fl.speed) || 1, k);
  if (F.wall.cradle) B.cradle = cradleSprites(F, k);
  CACHE.set(key, B);
  return B;
}

function scaleOf(ctx) {
  const m = ctx.getTransform ? ctx.getTransform() : null;
  const k = m ? Math.hypot(m.a, m.b) : 1;
  return Math.min(3, Math.max(1, Math.ceil(k * 2 - 0.01) / 2));
}

const snapTo = (v, k) => Math.round(v * k) / k;

// ------------------------------------------------------------------ live parts
function drawOutside(ctx, f, B, k, wd) {
  const O = f.outside;
  const F = B.F;
  ctx.save();
  ctx.beginPath();
  for (const b of f.wall.bays) if (b.type === 'glass') ctx.rect(b.x0 + wd, f.glass.top, b.x1 - b.x0, f.glass.bottom - f.glass.top);
  ctx.clip();
  ctx.drawImage(B.sky.c, 0, B.sky.y, W, B.sky.h);
  for (const s of O.stars) {
    const a = 0.35 + 0.6 * s.twinkle;
    ctx.fillStyle = `rgba(255,246,214,${a.toFixed(3)})`;
    const d = 0.6 + s.s;
    ctx.fillRect(s.x - d * 1.6, s.y - 0.25, d * 3.2, 0.5);
    ctx.fillRect(s.x - 0.25, s.y - d * 1.6, 0.5, d * 3.2);
  }
  const farShift = O.far.length ? O.far[0].u - O.far[0].x : 0;
  const nearShift = O.near.length ? O.near[0].u - O.near[0].x : 0;
  drawStrip(ctx, B.far, farShift);
  for (const l of O.cityLights) {
    ctx.fillStyle = `rgba(255,214,140,${(0.35 + 0.6 * l.a).toFixed(3)})`;
    ctx.fillRect(l.x - l.s * 0.6, l.y - l.s * 0.6, l.s * 1.2, l.s * 1.2);
  }
  for (const c of O.clouds) blit(ctx, B.clouds[c.i], snapTo(c.x, k), snapTo(c.y, k));
  drawStrip(ctx, B.near, nearShift);
  if (B.walkers) {
    const y = O.street.far - 0.6;
    WALKERS.forEach((w, i) => {
      const x0 = mod(w.u - nearShift + f.t * w.v, 1200);
      const step = Math.floor(f.t * Math.abs(w.v) * 0.35 + i * 0.5) % 2;
      const bob = step ? -0.35 : 0;
      for (const x of [x0, x0 - 1200]) if (x > -10 && x < W + 10) blit(ctx, B.walkers[i][step], x, y + bob);
    });
  }
  for (const c of O.cars) {
    const bounce = Math.sin(f.t * 9 + c.i * 2) > 0.7 ? -0.35 : 0;
    blit(ctx, B.cars[c.i], c.x, c.y + bounce);
  }
  const fl = O.flyer;
  if (fl) {
    if (fl.kind === 'birds') {
      ctx.lineWidth = 0.8;
      ctx.lineCap = 'round';
      ctx.strokeStyle = css(INK, 0.75);
      for (let j = 0; j < 5; j++) {
        const bx = fl.x + j * 9 + Math.sin(j * 2.3) * 2;
        const by = fl.y + (j % 2) * 4 + Math.sin(f.t * 1.3 + j) * 1.2;
        const ph = Math.sin((fl.phase + j * 0.23) * TAU);
        ctx.fillStyle = 'rgba(150,156,170,0.9)';
        ctx.beginPath(); ctx.ellipse(bx, by, 1.6, 0.9, 0, 0, TAU); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bx - 4, by - ph * 2.6);
        ctx.quadraticCurveTo(bx - 2, by - ph * 1.2 - 0.6, bx, by);
        ctx.quadraticCurveTo(bx + 2, by - ph * 1.2 - 0.6, bx + 4, by - ph * 2.6);
        ctx.stroke();
      }
    } else if (fl.kind === 'blimp') blit(ctx, B.blimp, fl.x, fl.y);
    else if (fl.kind === 'heli') {
      blit(ctx, B.heli, fl.x, fl.y);
      const c = Math.cos(fl.phase * TAU);
      ctx.strokeStyle = css(INK, 0.85);
      ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(fl.x + 3 - 14 * c, fl.y - 7); ctx.lineTo(fl.x + 3 + 14 * c, fl.y - 7); ctx.stroke();
      ctx.strokeStyle = css(INK, 0.25);
      ctx.beginPath(); ctx.ellipse(fl.x + 3, fl.y - 7, 14, 1.2, 0, 0, TAU); ctx.stroke();
      const tx = fl.x - 15 * fl.dir;
      ctx.strokeStyle = css(INK, 0.7);
      ctx.beginPath(); ctx.moveTo(tx, fl.y - 2 - 3 * c); ctx.lineTo(tx, fl.y - 2 + 3 * c); ctx.stroke();
      if (Math.floor(f.t * 2) % 2 === 0) { ctx.fillStyle = 'rgba(255,90,70,0.95)'; ctx.fillRect(tx - 0.8, fl.y - 5.6, 1.6, 1.6); }
    }
  }
  if (f.wall.cradle && B.cradle) {
    const c = f.wall.cradle;
    const x = c.x + wd;
    ctx.strokeStyle = css(INK, 0.8);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(x + 2.5, 0); ctx.lineTo(x + 2.5, c.y - 5);
    ctx.moveTo(x + c.w - 2.5, 0); ctx.lineTo(x + c.w - 2.5, c.y - 5);
    ctx.stroke();
    const cx = x + 26;
    blit(ctx, B.cradle.cleaner, cx, c.y);
    const sx = x + 12 + c.swipe * 28;
    const sy = c.y - 21;
    // the clean arc the squeegee leaves on the glass
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 12, sy - 0.5);
    ctx.quadraticCurveTo(x + 26, sy - 4, sx, sy - 0.5);
    ctx.stroke();
    ctx.strokeStyle = css('#6aa84f');
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(cx + 2.5, c.y - 8); ctx.lineTo(sx, sy + 3); ctx.stroke();
    ctx.strokeStyle = css(INK, 0.9);
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(sx, sy + 3); ctx.lineTo(sx, sy); ctx.moveTo(sx - 4, sy); ctx.lineTo(sx + 4, sy); ctx.stroke();
    blit(ctx, B.cradle.gondola, x, c.y);
  }
  ctx.restore();
}

function drawWallLive(ctx, f, B) {
  for (const b of f.wall.bays) {
    if (b.revolvingDoor == null) continue;
    const x = b.revolvingDoor;
    const top = f.glass.transom + 10;
    const bot = f.glass.bottom - 1;
    const wings = [];
    for (let j = 0; j < 4; j++) {
      const a = f.revolving * Math.PI + (j * Math.PI) / 2;
      wings.push([Math.cos(a), Math.sin(a)]);
    }
    wings.sort((p, q) => q[1] - p[1]);
    for (const [c, s] of wings) {
      const ex = x + c * 19.5;
      const front = s < 0;
      ctx.fillStyle = `rgba(200,228,238,${front ? 0.32 : 0.18})`;
      ctx.fillRect(Math.min(x, ex), top + 2, Math.abs(ex - x), bot - top - 4);
      ctx.strokeStyle = front ? 'rgba(63,104,96,0.95)' : 'rgba(63,104,96,0.45)';
      ctx.lineWidth = front ? 1.6 : 1;
      ctx.beginPath();
      ctx.moveTo(x, top + 2); ctx.lineTo(ex, top + 2); ctx.lineTo(ex, bot - 2); ctx.lineTo(x, bot - 2);
      ctx.moveTo(x, bot - 14); ctx.lineTo(ex, bot - 14);
      ctx.stroke();
      ctx.strokeStyle = css(INK, front ? 0.7 : 0.3);
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(ex + 0.9 * Math.sign(c), top + 2); ctx.lineTo(ex + 0.9 * Math.sign(c), bot - 2); ctx.stroke();
    }
    ctx.fillStyle = css('#3f6860');
    ctx.fillRect(x - 1.2, top, 2.4, bot - top);
  }
  for (const h of f.wall.hangs) {
    if (h.kind === 'lift' && B.doors) {
      const gap = (h.open * h.w) / 2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(h.x, h.y, h.w, h.h);
      ctx.clip();
      blit(ctx, B.doors[0], h.x - gap, h.y);
      blit(ctx, B.doors[1], h.x + h.w / 2 + gap, h.y);
      ctx.restore();
      if (h.open > 0) {
        ctx.fillStyle = `rgba(255,190,90,${(0.25 * Math.min(1, h.open * 3)).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(h.x + h.w / 2 - 4.5, h.y - 11, 3.2, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffd060';
        ctx.beginPath(); ctx.moveTo(h.x + h.w / 2 - 6.5, h.y - 9); ctx.lineTo(h.x + h.w / 2 - 4.5, h.y - 13); ctx.lineTo(h.x + h.w / 2 - 2.5, h.y - 9); ctx.closePath(); ctx.fill();
      }
    } else if (h.kind === 'clock') {
      hands(ctx, h.cx, h.cy, h.r, f.clock);
    } else if (h.kind === 'door' && h.label === 'MEETING 4B') {
      const a = 0.18 + 0.1 * Math.sin(f.t * 3);
      ctx.fillStyle = `rgba(255,96,70,${a.toFixed(3)})`;
      ctx.beginPath(); ctx.ellipse(h.x + h.w / 2, h.y - 8, 12, 5, 0, 0, TAU); ctx.fill();
    }
  }
}

function hands(ctx, cx, cy, r, clk) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = css(INK, 0.95);
  const hand = (a, l, w) => {
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.sin(a) * l, cy - Math.cos(a) * l);
    ctx.stroke();
  };
  hand(clk.hourA, r * 0.5, 1.2);
  hand(clk.minuteA, r * 0.78, 0.8);
  ctx.strokeStyle = 'rgba(214,72,56,0.95)';
  hand(clk.secondA, r * 0.84, 0.4);
  ctx.fillStyle = css(INK);
  ctx.beginPath(); ctx.arc(cx, cy, 0.7, 0, TAU); ctx.fill();
}

function drawLights(ctx, f, B, k) {
  const L = B.lights;
  ctx.strokeStyle = css(INK, 0.7);
  ctx.lineWidth = 0.55;
  for (const l of f.lights) {
    const x = snapTo(l.x, k);
    if (l.variant === 'tube') {
      blit(ctx, l.on > 0.5 ? L.on : L.off, x, f.ceilingY);
      if (l.on > 0.5) { ctx.globalAlpha = l.on; blit(ctx, L.glow, x, f.ceilingY); ctx.globalAlpha = 1; }
    } else {
      const topY = l.variant === 'globe' ? l.y - 14 : l.y - 11;
      ctx.beginPath(); ctx.moveTo(x, f.ceilingY); ctx.lineTo(x, topY); ctx.stroke();
      blit(ctx, L.glow, x, l.y);
      blit(ctx, L.on, x, l.y);
    }
  }
}

function drawMid(ctx, f, B, k) {
  const M = B.mid;
  for (const m of f.mid.items) {
    const S = M.items[m.i];
    if (!S) continue;
    const x = snapTo(m.kind === 'cubicles' || m.kind === 'boardroom' ? m.x0 : m.x, k);
    const b = m.base;
    if (S.back) blit(ctx, S.back, x, b);
    if (m.kind === 'cubicles') {
      for (let d = 0; d < m.desks.length; d++) {
        const dk = m.desks[d];
        if (!dk.occupied) continue;
        const spr = M.people.get(`c${dk.seed}:${dk.look}`);
        blit(ctx, spr, x + d * 40 + 20, b - 42 + dk.dy - dk.pop * 12);
      }
    } else if (m.kind === 'boardroom') {
      for (const c of m.chairs) {
        if (!c.sitter) continue;
        const spr = M.people.get(`b${c.seed}:${c.nod > 0.55 ? 1 : 0}`);
        const cx = x + (c.x - m.x0);
        ctx.save();
        ctx.translate(cx, b - 34);
        ctx.rotate(c.nod * 0.22 * (c.seed % 2 ? 1 : -1));
        blit(ctx, spr, 0, -6 + c.nod * 4);
        ctx.restore();
        if (c.nod > 0.55) {
          const z = (c.nod - 0.55) / 0.45;
          ctx.globalAlpha = Math.min(1, z * 2) * 0.8;
          drawZ(ctx, cx + 6 + z * 3, b - 46 - z * 8, 2.2 + z);
          ctx.globalAlpha = 1;
        }
      }
    } else if (m.kind === 'reception') {
      blit(ctx, M.people.get(`r${m.i}`), x + m.w * 0.5, b - 40 + m.dy);
    }
    if (S.front && m.kind !== 'tallclock') blit(ctx, S.front, x, b);
    if (m.kind === 'cooler' && m.bubble >= 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.strokeStyle = 'rgba(60,110,150,0.6)';
      ctx.lineWidth = 0.4;
      const by = b - 32 - m.bubble * 11;
      ctx.beginPath(); ctx.arc(x + 7 + Math.sin(m.bubble * 9) * 0.8, by, 1 + m.bubble * 0.7, 0, TAU); ctx.fill(); ctx.stroke();
    } else if (m.kind === 'copier' && m.scan >= 0) {
      const sx = x + 2 + m.scan * (m.w - 6);
      const gr = ctx.createLinearGradient(sx - 4, 0, sx + 4, 0);
      gr.addColorStop(0, 'rgba(160,255,220,0)');
      gr.addColorStop(0.5, 'rgba(190,255,230,0.75)');
      gr.addColorStop(1, 'rgba(160,255,220,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(sx - 4, b - 27, 8, 2.2);
    } else if (m.kind === 'tallclock') {
      const ang = m.swing * 0.22;
      ctx.save();
      ctx.beginPath(); ctx.rect(x + 5, b - 47, 10, 30); ctx.clip();
      ctx.translate(x + 10, b - 46);
      ctx.rotate(ang);
      ctx.strokeStyle = css('#d1a64a');
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 22); ctx.stroke();
      ctx.fillStyle = css('#e6ba46');
      ctx.beginPath(); ctx.arc(0, 23, 2.6, 0, TAU); ctx.fill();
      ctx.strokeStyle = css(INK, 0.8);
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.restore();
      if (S.front) blit(ctx, S.front, x, b);
      hands(ctx, x + 10, b - 60, 5.5, f.clock);
    } else if (m.kind === 'desk') {
      const lx = x + m.w * 0.18;
      const gr = ctx.createRadialGradient(lx, b - 36, 0, lx, b - 36, 26);
      gr.addColorStop(0, 'rgba(255,226,150,0.4)');
      gr.addColorStop(1, 'rgba(255,226,150,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(lx - 26, b - 62, 52, 52);
    }
  }
}

function drawZ(ctx, x, y, s) {
  ctx.strokeStyle = css(INK, 0.9);
  ctx.lineWidth = 0.6;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x - s / 2, y - s / 2); ctx.lineTo(x + s / 2, y - s / 2); ctx.lineTo(x - s / 2, y + s / 2); ctx.lineTo(x + s / 2, y + s / 2);
  ctx.stroke();
}

// Warm pools on the floor under the hanging lamps, at the lamps' own depth (the mid rate
// is the floor's rate at midBase).
function drawPools(ctx, f) {
  if (f.floor === 'carpet') return;
  const c = f.floor === 'parquet' ? '255,204,120' : '255,240,190';
  const a = f.floor === 'parquet' ? 0.22 : 0.16;
  for (const l of f.lights) {
    const gr = ctx.createRadialGradient(l.x, MID_BASE, 0, l.x, MID_BASE, 34);
    gr.addColorStop(0, `rgba(${c},${a})`);
    gr.addColorStop(1, `rgba(${c},0)`);
    ctx.save();
    ctx.translate(l.x, MID_BASE);
    ctx.scale(1, 0.16);
    ctx.translate(-l.x, -MID_BASE);
    ctx.fillStyle = gr;
    ctx.fillRect(l.x - 34, MID_BASE - 34, 68, 68);
    ctx.restore();
  }
}

function drawReflections(ctx, f, wd) {
  if (f.floor !== 'marble') return;
  for (const c of f.wall.columns) {
    const gr = ctx.createLinearGradient(0, WALL_BASE, 0, WALL_BASE + 20);
    gr.addColorStop(0, 'rgba(200,160,110,0.32)');
    gr.addColorStop(1, 'rgba(200,160,110,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(c.x + wd, WALL_BASE, c.w, 20);
  }
  for (const b of f.wall.bays) {
    if (b.type !== 'glass') continue;
    const gr = ctx.createLinearGradient(0, WALL_BASE, 0, WALL_BASE + 16);
    gr.addColorStop(0, 'rgba(235,246,250,0.3)');
    gr.addColorStop(1, 'rgba(235,246,250,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(b.x0 + wd + 3, WALL_BASE, b.x1 - b.x0 - 6, 16);
  }
}

export const STYLE = {
  id: 'cutaway',
  name: 'BUSYTOWN CUTAWAY — Richard Scarry',
  note: "Richard Scarry's busy town as a cross-section: warm brown ink with a slight wobble over watercolour "
    + 'washes that pool at their edges, on cream paper, with hand-lettered labels. The tower is sliced open: '
    + 'the cut concrete slab under the lane shows the storey below carrying on (the mail room, accounts, the '
    + 'canteen), the feet of the storey above stand on the ceiling slab, and columns near the camera are '
    + 'broken-off stubs, so nothing ever stands over the hero. The busy-ness lives in those slices and outside '
    + 'the glass (a full bus, cabs, walkers and pigeons, a window cleaner, the EGGCORP blimp, late workers in '
    + 'lit towers); the furniture and floor right behind the lane are softer and in middle values. The founder '
    + 'hangs in gilt: the silver professor, wild mane, cross brows over fine specs, a drooping silver '
    + 'moustache and a red-lined cape collar.',
  paint(ctx, f) {
    const k = scaleOf(ctx);
    const B = bakeFor(f.floor, k);
    const ws = mod(f.wall.shift, WALL_P);
    const wd = ws - Math.round(ws * k) / k;
    drawOutside(ctx, f, B, k, wd);
    drawStrip(ctx, B.wall, f.wall.shift);
    ctx.save();
    ctx.translate(wd, 0);
    drawWallLive(ctx, f, B);
    ctx.restore();
    drawLights(ctx, f, B, k);
    drawFloor(ctx, f, B, k);
    drawReflections(ctx, f, wd);
    drawPools(ctx, f);
    drawMid(ctx, f, B, k);
    drawStrip(ctx, B.slab, f.slab.shift);
  },
  paintFront(ctx, f) {
    const k = scaleOf(ctx);
    const B = bakeFor(f.floor, k);
    for (const it of f.front) {
      const spr = B.front[it.kind + (it.w || '')];
      if (spr) blit(ctx, spr, snapTo(it.x, k), 0);
    }
  },
};
