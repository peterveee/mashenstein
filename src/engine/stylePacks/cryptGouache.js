// CRYPT SHIFT — the gouache backdrop. Peter, 25 Sep 2026, after the backdrop-style
// bake-off (docs/BACKDROP_STYLES.md): "i think gauche would be amazing for crypt … it is a
// huge improvment on what we have now which is behyond basic... can we create the
// backgrounds for crypt like this and just expand on that … I want the gouache look to be
// what we see when there is light anyway, so please make that happen now".
//
// A storybook night in opaque gouache, no outlines anywhere: every shape is an opaque
// painted mass with a slightly hand-cut edge, the sky is laid in with dry-brush streaks
// that curve round the moon, the hills are dabbed, every edge that faces the moon (upper
// right) carries a broken, scumbled rim of lighter paint, the fog is layered washes, and
// a paper tooth sits over it all. Aerial perspective: the far ridge is paler, bluer and
// softer (baked at a lower resolution, so its edges melt), the near bank dark and rich.
// The gas lamps are the one warm note.
//
// The bake-off card (src/dev/crypt-styles/gouache.js) painted one short loop of the
// shared composition. This is the same hand over a longer country: each layer's period is
// two to three times the bake-off's, with more tombs, trees, railings and lamps and a
// second, smaller ruin on the far ridge, and each stage opens on a different stretch of
// it. The first stretch is the bake-off's composition exactly, so crypt-1 opens on the
// approved picture: the abbey's spire against the moon.
//
// Renderer-only, like every style pack module. `drawCryptGouache` is handed a `view` by
// the pack (stylePacks/index.js, gouachePack): the painted coverage and band, and each
// layer's vertical offset — portrait's scenery bands plus the crane's per-depth share —
// so this file knows nothing about how a frame is composed.
//
// Everything that does not animate is baked ONCE, at one scale, into: the sky (per
// layout, since portrait moves the moon), and one strip per depth layer, one period long
// plus a frame of overscan, in the layer's own u space. A frame is a handful of blits
// plus the stars, clouds, bats, lamps and fog. The bake is split into steps so the art
// warm-up (game/art-warmup.js) can do it during the briefing and run-in; a frame that
// arrives first simply finishes it.
import { ZOOM } from '../camera.js';
import { screen, isPhonePortraitPresentation } from '../renderer.js';

const TAU = Math.PI * 2;
// A strip covers screen x from -STRIP_M to STRIP_R + STRIP_M: the landscape frame and
// portrait's shifted window (about 200..580 with its look-ahead) both fit.
const STRIP_M = 90;
const STRIP_R = 640;
// The bake scale is chosen once and kept: a density ladder that steps down mid-run must
// never trigger a re-bake. Capped, because the style is soft and the strips are long.
//
// TEXTURE BUDGET. Everything baked here stays resident on the GPU, and past the browser's
// cache it thrashes: at 2.5x the backdrop held ~57 MB, and with the graveyard's animals
// (cryptLife.js) on top the frame cost went from 0.2 ms to 5 ms as textures were
// re-uploaded mid-frame; at a smaller bake it vanished. So: capped at 2, and the sky and
// the moon's glow at half that (~28 MB in all).
const BAKE_MAX = 2;


// ------------------------------------------------------------------ palette
const C = {
  skyTop: [8, 19, 42],
  skyMid: [18, 33, 68],
  skyLow: [46, 50, 100],
  skyHaze: [80, 76, 124],
  glow: [168, 182, 206],
  moon: [248, 242, 219],
  moonEdge: [226, 221, 197],
  moonMark: [197, 196, 180],
  cloud: [34, 45, 86],
  cloudDark: [26, 35, 72],
  cloudLit: [112, 124, 162],
  bat: [8, 10, 24],
  fog: [160, 172, 204],
  iron: [10, 11, 24],
  ironLit: [70, 80, 122],
  warm: [255, 196, 112],
  flame: [255, 232, 170],
};

const LAYERS = {
  bg: {
    top: 28, bottom: 262, res: 0.6, seed: 11,
    body: [50, 56, 100], dark: [43, 48, 89], lit: [106, 116, 162], mist: [84, 86, 132],
    mistY: [176, 204, 0.5], dabDensity: 1.4, dab: 3.2, rimW: 2.0, rimA: 0.42, wob: 0.6,
  },
  mid: {
    top: 118, bottom: 262, res: 1, seed: 23,
    body: [29, 29, 62], dark: [21, 21, 49], lit: [84, 92, 140], mist: [62, 62, 104],
    mistY: [214, 236, 0.16], dabDensity: 2.2, dab: 2.6, rimW: 1.8, rimA: 0.6, wob: 0.7,
  },
  fg: {
    top: 84, bottom: 262, res: 1, seed: 37,
    body: [27, 20, 44], dark: [17, 12, 31], lit: [72, 70, 116], mist: null,
    mistY: null, dabDensity: 2.6, dab: 2.4, rimW: 1.4, rimA: 0.5, wob: 0.8,
  },
};

// Grave furniture on the hill: bluer and a good step darker than the lane's grey
// tombstone (#9a9ab0), so a backdrop stone never reads as an obstacle.
const STONE = { body: [46, 52, 86], dark: [36, 41, 72], lit: [92, 104, 144] };


// ------------------------------------------------------------------ the country
function wrapDist(u, c, period) {
  const d = Math.abs((((u - c) % period) + period) % period);
  return Math.min(d, period - d);
}
function plateau(u, c, flatHalf, slope, h, period) {
  const d = wrapDist(u, c, period);
  if (d <= flatHalf) return h;
  if (d >= flatHalf + slope) return 0;
  return h * 0.5 * (1 + Math.cos(Math.PI * (d - flatHalf) / slope));
}
function wave(u, period, terms) {
  let s = 0;
  for (const [amp, k, phase] of terms) s += amp * Math.sin(TAU * k * u / period + phase);
  return s;
}
function seeded(i) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Graves laid along a stretch of the hill in plots: a stone or cross every ~26-38 px,
// the odd gap, never on top of a tomb or a tree.
function graveRun(u0, u1, avoid, seed) {
  const out = [];
  let u = u0;
  let n = 0;
  while (u < u1) {
    const h = seeded(seed + n * 7.1);
    const clear = avoid.every(([c, r]) => Math.abs(u - c) > r);
    if (clear && h > 0.18) {
      const cross = h > 0.8;
      out.push(cross
        ? { kind: 'cross', u: Math.round(u), s: 0.82 + seeded(seed + n * 3.3) * 0.2 }
        : { kind: 'stone', u: Math.round(u), s: 0.68 + seeded(seed + n * 5.9) * 0.3, variant: Math.floor(seeded(seed + n * 9.7) * 3) });
    }
    u += 24 + seeded(seed + n * 2.3) * 16;
    n++;
  }
  return out;
}

const MID_TOMBS = [[170, 36], [760, 32], [1500, 36], [2150, 30]];
const MID_TREES = [[306, 18], [812, 18], [1124, 16], [1360, 18], [1840, 18], [2420, 18]];

// The first half of mid and fg, and the first 1440 of bg, are the bake-off's
// composition exactly (src/dev/crypt-styles/plan.js), so crypt-1 opens on it.
const SCENE = {
  moon: { x: 384, y: 66, r: 24 },
  clouds: {
    factor: 0.04, drift: 3, period: 960,
    items: [
      { u: 40, y: 34, w: 130, h: 14, band: 'upperCloud' },
      { u: 300, y: 104, w: 96, h: 10, band: 'lowerCloud' },
      { u: 520, y: 22, w: 150, h: 16, band: 'upperCloud' },
      { u: 760, y: 84, w: 110, h: 12, band: 'middleCloud' },
    ],
  },
  bats: {
    factor: 0.12, drift: 22, period: 720,
    items: [
      { u: 120, y: 70, s: 1 },
      { u: 146, y: 60, s: 0.8 },
      { u: 470, y: 124, s: 0.7 },
    ],
  },
  bg: {
    factor: 0.07, period: 2880,
    profile: (u, P) => 180
      - wave(u, P, [[8, 4, 0], [5, 10, 1.3], [3, 22, 0.4]])
      - plateau(u, 360, 58, 70, 34, P)
      - plateau(u, 1040, 20, 90, 16, P)
      - plateau(u, 1900, 44, 70, 26, P)
      - plateau(u, 2520, 20, 80, 12, P),
    items: [
      { kind: 'grove', u: 120, s: 1 },
      { kind: 'abbey', u: 360, s: 1 },
      { kind: 'grove', u: 610, s: 0.8 },
      { kind: 'grove', u: 1040, s: 1.1 },
      { kind: 'grove', u: 1460, s: 0.9 },
      // The second ruin: the abbey's own stones, smaller and turned the other way.
      { kind: 'abbey', u: 1900, s: 0.72, flip: true },
      { kind: 'grove', u: 2220, s: 0.85 },
      { kind: 'grove', u: 2520, s: 1.05 },
    ],
  },
  mid: {
    factor: 0.16, period: 2560,
    profile: (u, P) => 210
      - wave(u, P, [[5, 6, 0.5], [3, 16, 2]])
      - plateau(u, 170, 40, 50, 12, P)
      - plateau(u, 760, 32, 50, 10, P)
      - plateau(u, 1500, 36, 50, 11, P)
      - plateau(u, 2150, 30, 46, 9, P),
    items: [
      { kind: 'stone', u: 32, s: 0.9 },
      { kind: 'stone', u: 58, s: 0.7, variant: 1 },
      { kind: 'cross', u: 92, s: 1 },
      { kind: 'mausoleum', u: 170, s: 1 },
      { kind: 'stone', u: 236, s: 1, variant: 2 },
      { kind: 'stone', u: 262, s: 0.8 },
      { kind: 'tree', u: 306, s: 1 },
      { kind: 'stone', u: 352, s: 0.9, variant: 1 },
      { kind: 'stone', u: 378, s: 0.75 },
      { kind: 'cross', u: 404, s: 0.85 },
      { kind: 'stone', u: 442, s: 0.9, variant: 2 },
      { kind: 'stone', u: 468, s: 0.7 },
      { kind: 'stone', u: 544, s: 0.85 },
      { kind: 'stone', u: 570, s: 0.7, variant: 2 },
      { kind: 'stone', u: 622, s: 0.9, variant: 1 },
      { kind: 'cross', u: 652, s: 1 },
      { kind: 'stone', u: 692, s: 0.8 },
      { kind: 'mausoleum', u: 760, s: 0.85, variant: 1 },
      { kind: 'tree', u: 812, s: 1.15, variant: 1 },
      { kind: 'stone', u: 870, s: 0.9, variant: 2 },
      { kind: 'stone', u: 896, s: 0.7 },
      { kind: 'cross', u: 934, s: 0.85 },
      { kind: 'stone', u: 962, s: 0.9 },
      { kind: 'stone', u: 988, s: 0.75, variant: 1 },
      { kind: 'stone', u: 1080, s: 0.85 },
      { kind: 'tree', u: 1124, s: 0.9 },
      { kind: 'stone', u: 1160, s: 0.8, variant: 2 },
      { kind: 'cross', u: 1204, s: 0.9 },
      // The rest of the hill.
      { kind: 'tree', u: 1360, s: 1 },
      { kind: 'mausoleum', u: 1500, s: 0.95 },
      { kind: 'tree', u: 1840, s: 1.1, variant: 1 },
      { kind: 'mausoleum', u: 2150, s: 0.8, variant: 1 },
      { kind: 'tree', u: 2420, s: 0.95 },
      ...graveRun(1250, 2540, [...MID_TOMBS, ...MID_TREES], 71),
    ],
  },
  fg: {
    factor: 0.34, period: 3600,
    profile: (u, P) => 228 - wave(u, P, [[3, 12, 0], [2, 26, 1]]),
    items: [
      { kind: 'gnarl', u: 22, s: 1 },
      { kind: 'grass', u: 88, s: 1 },
      { kind: 'lamp', u: 150, s: 1 },
      { kind: 'fence', u: 182, u1: 462, gate: 322 },
      { kind: 'grass', u: 250, s: 0.8 },
      { kind: 'grass', u: 410, s: 1 },
      { kind: 'grass', u: 500, s: 0.9 },
      { kind: 'gnarl', u: 760, s: 0.8, variant: 1 },
      { kind: 'grass', u: 900, s: 1 },
      { kind: 'fence', u: 1100, u1: 1230, gate: null },
      { kind: 'lamp', u: 1262, s: 1 },
      { kind: 'grass', u: 1330, s: 0.8 },
      { kind: 'grass', u: 1480, s: 1 },
      { kind: 'gnarl', u: 1560, s: 0.9, variant: 1 },
      { kind: 'grass', u: 1640, s: 0.9 },
      // The rest of the bank.
      { kind: 'grass', u: 1850, s: 0.9 },
      { kind: 'fence', u: 1900, u1: 2240, gate: 2070 },
      { kind: 'grass', u: 2300, s: 1 },
      // Moved right from 2420 on 26 Sep: the near bank sweeps past the hill faster than the
      // hill scrolls, and at 2420 this tree crossed in front of crypt-2's balloon clown.
      { kind: 'gnarl', u: 2760, s: 1.05 },
      { kind: 'lamp', u: 2560, s: 1 },
      { kind: 'grass', u: 2640, s: 0.8 },
      { kind: 'fence', u: 2700, u1: 2900, gate: null },
      { kind: 'grass', u: 2960, s: 1 },
      { kind: 'gnarl', u: 3150, s: 0.85, variant: 1 },
      { kind: 'grass', u: 3300, s: 0.9 },
      { kind: 'grass', u: 3420, s: 1 },
      { kind: 'grass', u: 3520, s: 0.8 },
    ],
  },
  fog: {
    bands: [
      { y: 198, h: 16, factor: 0.12, drift: 5, layer: 'fg' },
      { y: 222, h: 12, factor: 0.3, drift: 9, layer: 'fg' },
    ],
    puffs: [40, 130, 205, 290, 370, 455, 530],
    period: 600,
  },
};

// Two broad, raised wisps briefly veil the moon at the opening of crypt-1. They are a
// foreground sky detail only; unlike the later cloud train, they never change
// the moon's light or the level's lighting.
const OPENING_CLOUDS = [
  // Lifted above the abbey spire and given enough painted height to read as clouds
  // at gameplay scale, while keeping both wisps over the moon.
  { w: 104, h: 12, x: -38, y: -22, seed: 131 },
  { w: 68, h: 10, x: 12, y: -12, seed: 137 },
];

// Each stage opens on its own stretch of the country: crypt-1 on the abbey against the
// moon, the other two further along every layer.
const STAGE_OPEN = [0, 0.37, 0.71];

// Every instance of a u-positioned thing that lands inside [x0, x1].
function instances(u, shift, period, x0, x1, margin = 140) {
  const b = (((u - shift) % period) + period) % period;
  const out = [];
  for (let n = Math.floor((x0 - margin - b) / period); ; n++) {
    const x = b + n * period;
    if (x > x1 + margin) break;
    if (x > x0 - margin) out.push(x);
  }
  return out;
}

// Screen-fixed stars over a region big enough for either layout.
const STARS = (() => {
  const out = [];
  const { moon } = SCENE;
  for (let i = 0; out.length < 150 && i < 1200; i++) {
    const x = -60 + seeded(i) * 720;
    const y = -300 + seeded(i + 1000) * 460;
    if (Math.hypot(x - moon.x, y - moon.y) < moon.r + 10) continue;
    out.push({ x, y, s: 0.6 + seeded(i + 2000) * 1.1, phase: seeded(i + 3000) * TAU });
  }
  return out;
})();


// ------------------------------------------------------------------ utilities
function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function rng(seed) {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const shade = (c, t) => (t > 0 ? mix(c, [255, 255, 255], t) : mix(c, [0, 0, 0], -t));
const css = (c, a = 1) => (a >= 1
  ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`
  : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`);

// Smooth value noise, -1..1. `vnoise` for item-local wobble (items are copied whole, so
// they need no periodicity); `pnoise` wraps every P px for anything painted along a
// strip.
function vnoise(x, seed) {
  const i = Math.floor(x);
  const f = x - i;
  const s = f * f * (3 - 2 * f);
  const a = hash(i * 1.37 + seed * 57.31);
  const b = hash((i + 1) * 1.37 + seed * 57.31);
  return (a + (b - a) * s) * 2 - 1;
}

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

// A DOM canvas, like every other cache in the renderer, not an OffscreenCanvas: the game
// blits these every frame, and a DOM canvas that has stopped changing is the source the
// browser keeps resident rather than re-uploading.
function canvas(w, h) {
  w = Math.max(1, Math.ceil(w));
  h = Math.max(1, Math.ceil(h));
  if (typeof document === 'undefined' && typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// A closed polygon (flat [x,y,...]) re-drawn with a hand-cut wobble: each edge is cut
// into short runs and nudged along its normal by smooth noise.
function wobbled(pts, amp, seed, step = 2) {
  const out = [];
  const n = pts.length / 2;
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const x0 = pts[2 * i];
    const y0 = pts[2 * i + 1];
    const x1 = pts[(2 * i + 2) % pts.length];
    const y1 = pts[(2 * i + 3) % pts.length];
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    const segs = Math.max(1, Math.ceil(len / step));
    const nx = -(y1 - y0) / len;
    const ny = (x1 - x0) / len;
    for (let s = 0; s < segs; s++) {
      const t = s / segs;
      const d = (vnoise((acc + t * len) / 3.2, seed) + 0.35 * vnoise((acc + t * len) / 1.1, seed + 9)) * amp;
      out.push(x0 + (x1 - x0) * t + nx * d, y0 + (y1 - y0) * t + ny * d);
    }
    acc += len;
  }
  return out;
}

function polyPath(g, pts) {
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath();
}

function fillPoly(g, pts, amp = 0, seed = 0) {
  g.beginPath();
  polyPath(g, amp ? wobbled(pts, amp, seed) : pts);
  g.fill();
}

function arcPts(cx, cy, rx, ry, a0, a1, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * (i / n);
    out.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
  }
  return out;
}

function rectPts(x, y, w, h) {
  return [x, y, x + w, y, x + w, y + h, x, y + h];
}

// Abbey windows have a restrained rounded crown; mausoleum entrances use a full round arch.
function abbeyWindowPts(x, y, w, h) {
  const half = w / 2, crown = Math.min(2, w * 0.28);
  const cy = y - h + crown;
  const out = [x - half, y, x - half, cy];
  for (let i = 1; i <= 8; i++) {
    const a = Math.PI + i * Math.PI / 8;
    out.push(x + Math.cos(a) * half, cy + Math.sin(a) * crown);
  }
  out.push(x + half, y);
  return out;
}

// A clean round-arched opening: straight jambs meet a semicircular crown.
function archOpeningPts(x, y, w, h) {
  const half = w / 2;
  const rise = Math.min(half, h * 0.45);
  const spring = y - h + rise;
  const out = [x - half, y, x - half, spring];
  for (let i = 1; i <= 12; i++) {
    const a = Math.PI + i * Math.PI / 12;
    out.push(x + Math.cos(a) * half, spring + Math.sin(a) * rise);
  }
  out.push(x + half, y);
  return out;
}

// Catmull-Rom through the control points, sampled every ~1.2 px: [x, y, arcLength].
function curve(pts, step = 1.2) {
  const n = pts.length;
  let px = pts[0][0];
  let py = pts[0][1];
  let len = 0;
  const out = [[px, py, 0]];
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];
    const m = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let j = 1; j <= m; j++) {
      const t = j / m;
      const t2 = t * t;
      const t3 = t2 * t;
      const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      const x = cr(p0[0], p1[0], p2[0], p3[0]);
      const y = cr(p0[1], p1[1], p2[1], p3[1]);
      len += Math.hypot(x - px, y - py);
      px = x;
      py = y;
      out.push([x, y, len]);
    }
  }
  return out;
}

// One tapered brush-stroke limb: a filled ribbon from width w0 to w1 along the curve,
// its width breathing a little so it reads as a loaded brush rather than a pen.
function limb(g, pts, w0, w1, seed = 0) {
  const c = curve(pts);
  const L = c[c.length - 1][2] || 1;
  const left = [];
  const right = [];
  let tx = 0;
  let ty = -1;
  for (let i = 0; i < c.length; i++) {
    const a = c[Math.max(0, i - 1)];
    const b = c[Math.min(c.length - 1, i + 1)];
    tx = b[0] - a[0];
    ty = b[1] - a[1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    const t = c[i][2] / L;
    const w = (w0 + (w1 - w0) * Math.pow(t, 0.75)) * (1 + 0.16 * vnoise(c[i][2] / 3 + seed * 3.1, seed)) * 0.5;
    left.push(c[i][0] - ty * w, c[i][1] + tx * w);
    right.push(c[i][0] + ty * w, c[i][1] - tx * w);
  }
  const e = c[c.length - 1];
  g.beginPath();
  g.moveTo(left[0], left[1]);
  for (let i = 2; i < left.length; i += 2) g.lineTo(left[i], left[i + 1]);
  g.lineTo(e[0] + tx * w1 * 0.8, e[1] + ty * w1 * 0.8);
  for (let i = right.length - 2; i >= 0; i -= 2) g.lineTo(right[i], right[i + 1]);
  g.closePath();
  g.fill();
  if (w0 > 1.4) {
    g.beginPath();
    g.arc(c[0][0], c[0][1], w0 * 0.5, 0, TAU);
    g.fill();
  }
}

function dab(g, x, y, rx, ry, ang) {
  g.beginPath();
  g.ellipse(x, y, Math.max(0.2, rx), Math.max(0.2, ry), ang, 0, TAU);
  g.fill();
}

// ------------------------------------------------------------------ the mass painter
// The core of the style. `shape(g)` fills the silhouette (any colour; it becomes a
// mask) in local coords inside `box` = [x, y, w, h]. The mask is then painted: a body
// gradient, dabbed texture, and a moonlit rim on every edge whose upper-right
// neighbour is open sky — found by knocking the mask, shifted down-left, out of a lit
// copy — scumbled with dry-brush breaks. `detail(g)` paints on top, clipped to the
// mass (source-atop), and may cut holes with destination-out.
// Returns a sprite in the same local coords.
function massSprite(r, box, shape, st, detail) {
  const [bx, by, bw, bh] = box;
  const W = Math.ceil(bw * r);
  const H = Math.ceil(bh * r);
  const T = (g) => g.setTransform(r, 0, 0, r, -bx * r, -by * r);
  const mask = canvas(W, H);
  const mg = mask.getContext('2d');
  T(mg);
  mg.fillStyle = '#000';
  mg.strokeStyle = '#000';
  shape(mg);

  const out = canvas(W, H);
  const og = out.getContext('2d');
  og.drawImage(mask, 0, 0);
  og.globalCompositeOperation = 'source-in';
  T(og);
  const gr = og.createLinearGradient(0, by + bh * (st.g0 ?? 0.1), 0, by + bh);
  gr.addColorStop(0, css(st.body));
  gr.addColorStop(1, css(st.dark));
  og.fillStyle = gr;
  og.fillRect(bx, by, bw, bh);
  og.globalCompositeOperation = 'source-atop';

  const R = rng(st.seed ?? 1);
  // Dabbed body texture.
  const nd = Math.round(bw * bh * (st.dabs ?? 0.25));
  const tones = [shade(st.body, 0.07), shade(st.dark, -0.12), mix(st.body, st.lit, 0.3), shade(st.body, -0.06)];
  for (let i = 0; i < nd; i++) {
    og.fillStyle = css(tones[(R() * tones.length) | 0]);
    og.globalAlpha = 0.18 + R() * 0.3;
    const rx = (st.dab ?? 1.6) * (0.5 + R() * 0.9);
    dab(og, bx + R() * bw, by + R() * bh, rx, rx * (0.3 + R() * 0.3), (st.dabAng ?? 0) + (R() - 0.5) * 0.7);
  }
  og.globalAlpha = 1;

  // Moonlit rim.
  if (st.rim) {
    const rim = canvas(W, H);
    const rg = rim.getContext('2d');
    rg.drawImage(mask, 0, 0);
    rg.globalCompositeOperation = 'source-in';
    rg.fillStyle = css(st.lit);
    rg.fillRect(0, 0, W, H);
    rg.globalCompositeOperation = 'destination-out';
    const d = st.rim * r;
    rg.globalAlpha = 0.5;
    rg.drawImage(mask, -d * 0.7, d * 1.0);
    rg.globalAlpha = 1;
    rg.drawImage(mask, -d * 1.5, d * 2.1);
    // Dry-brush breaks.
    T(rg);
    const nb = Math.round(bw * bh * 0.05);
    for (let i = 0; i < nb; i++) {
      rg.globalAlpha = 0.25 + R() * 0.5;
      const rx = 0.6 + R() * 1.6;
      dab(rg, bx + R() * bw, by + R() * bh, rx, rx * 0.45, -0.5 + (R() - 0.5) * 0.8);
    }
    og.setTransform(1, 0, 0, 1, 0, 0);
    og.globalAlpha = st.rimA ?? 1;
    og.drawImage(rim, 0, 0);
    og.globalAlpha = 1;
  }

  if (detail) {
    T(og);
    og.globalCompositeOperation = 'source-atop';
    detail(og, R);
  }
  return { c: out, x: bx, y: by, w: W / r, h: H / r };
}

function blit(g, spr, x, y) {
  g.drawImage(spr.c, x + spr.x, y + spr.y, spr.w, spr.h);
}

// ------------------------------------------------------------------ sky
const SKY_STOPS = [[-80, C.skyTop], [4, C.skyTop], [92, C.skyMid], [162, C.skyLow], [226, C.skyHaze]];
function skyAt(y) {
  if (y <= SKY_STOPS[0][0]) return SKY_STOPS[0][1];
  for (let i = 1; i < SKY_STOPS.length; i++) {
    if (y <= SKY_STOPS[i][0]) {
      const [y0, c0] = SKY_STOPS[i - 1];
      const [y1, c1] = SKY_STOPS[i];
      return mix(c0, c1, (y - y0) / (y1 - y0));
    }
  }
  return SKY_STOPS[SKY_STOPS.length - 1][1];
}

// A dry-brush stroke: parallel bristle lines, each broken into dashes, along a path
// given by `at(t) -> [x, y]` and its normal.
function bristleStroke(g, R, at, len, th, col, alpha) {
  const n = Math.max(3, Math.round(th * 2.2));
  g.lineCap = 'round';
  g.strokeStyle = css(col);
  for (let b = 0; b < n; b++) {
    const off = (b / (n - 1) - 0.5) * th;
    const t0 = R() * 0.2;
    const t1 = 1 - R() * 0.25;
    g.globalAlpha = alpha * (0.25 + R() * 0.6);
    g.lineWidth = 0.6 + R() * 1.1;
    g.setLineDash([6 + R() * 40, 1 + R() * 5, 4 + R() * 26, 1 + R() * 3]);
    g.beginPath();
    const steps = Math.max(3, Math.ceil(len * (t1 - t0) / 5));
    for (let s = 0; s <= steps; s++) {
      const [x, y, nx, ny] = at(t0 + (t1 - t0) * (s / steps));
      const o = off + (R() - 0.5) * 0.25;
      if (s === 0) g.moveTo(x + nx * o, y + ny * o);
      else g.lineTo(x + nx * o, y + ny * o);
    }
    g.stroke();
  }
  g.setLineDash([]);
  g.globalAlpha = 1;
}

// THE SKY, in two pieces that know nothing about the layout, so both bake ahead of the
// run. Portrait raises the land, and the sky's colour stops rise with it — which moves the
// whole painted sheet by the same amount, so the sheet is baked once in "sky space" (y
// relative to the land) and blitted at the land's offset. The moon moves on its own, so
// its glow, the strokes curving round it and the disc are a sprite of their own.
const SKY_SHEET = { x: -40, y: -420, w: 700, h: 690 };
const MOON_R = 24;
const MOON_REACH = 236; // the glow's radius, plus a margin

function buildSkySheet(k) {
  const { x, y, w, h } = SKY_SHEET;
  const c = canvas(w * k, h * k);
  const g = c.getContext('2d');
  g.setTransform(k, 0, 0, k, -x * k, -y * k);
  const gr = g.createLinearGradient(0, SKY_STOPS[0][0], 0, SKY_STOPS[SKY_STOPS.length - 1][0]);
  const span = SKY_STOPS[SKY_STOPS.length - 1][0] - SKY_STOPS[0][0];
  for (const [yy, col] of SKY_STOPS) gr.addColorStop((yy - SKY_STOPS[0][0]) / span, css(col));
  g.fillStyle = gr;
  g.fillRect(x, y, w, h);

  // Where the landscape moon sits, for the strokes that pick up its light.
  const m = SCENE.moon;
  const R = rng(4242);
  // Long, gently sagging horizontal strokes across the sky: as many per unit of sky as
  // the landscape frame's 95.
  const top = -260;
  const bottom = 230;
  const strokes = Math.round(95 * (w / 560) * ((bottom - top) / 236));
  for (let i = 0; i < strokes; i++) {
    const yy = top + Math.pow(R(), 0.9) * (bottom - top);
    const xx = x - 30 + R() * (w + 30);
    const len = 70 + R() * 220;
    const th = 3 + R() * 9;
    const sag = (R() - 0.5) * 6;
    const tilt = (R() - 0.5) * 0.05;
    const base = skyAt(yy);
    const dm = Math.hypot(xx + len / 2 - m.x, yy - m.y);
    const lift = dm < 160 ? 0.1 * (1 - dm / 160) : 0;
    const dark = R() < 0.3;
    const col = dark ? shade(base, -0.07 - R() * 0.06) : shade(base, 0.05 + lift + R() * 0.05);
    bristleStroke(g, R, (t) => [xx + t * len, yy + Math.sin(t * Math.PI) * sag + t * len * tilt, 0, 1], len, th, col, dark ? 0.25 + R() * 0.15 : 0.3 + R() * 0.25);
  }
  return c;
}

// The moon, centred on its sprite: the broad cool wash it throws on the sky, the glow
// painted in rings, then the disc. Colours are taken where the landscape moon hangs in
// the gradient; portrait's moon lands at nearly the same place in sky space.
// Two sprites, because they want different resolutions: the wash and the ring strokes are
// all soft paint and bake at half scale (`part` 'glow', MOON_REACH across), the disc is
// the one sharp thing in the sky and bakes at full scale ('disc', MOON_DISC across).
const MOON_DISC = 56;
function buildMoon(k, part) {
  const S = part === 'disc' ? MOON_DISC : MOON_REACH;
  const c = canvas(2 * S * k, 2 * S * k);
  const g = c.getContext('2d');
  const m = { x: 0, y: 0, r: MOON_R };
  const my = SCENE.moon.y;
  const at = (yy) => skyAt(yy + my);
  g.setTransform(k, 0, 0, k, S * k, S * k);
  if (part === 'disc') { moonDisc(g, m); return c; }
  const glow = g.createRadialGradient(0, 0, m.r * 0.8, 0, 0, 230);
  glow.addColorStop(0, css(C.glow, 0.5));
  glow.addColorStop(0.18, css(C.glow, 0.26));
  glow.addColorStop(0.5, css(C.glow, 0.08));
  glow.addColorStop(1, css(C.glow, 0));
  g.fillStyle = glow;
  g.fillRect(-S, -S, 2 * S, 2 * S);
  const R = rng(4243);
  for (let i = 0; i < 34; i++) {
    const rad = m.r + 6 + Math.pow(R(), 1.3) * 110;
    const a0 = rad < m.r + 30 ? R() * TAU : (R() < 0.5 ? -1 : 1) * Math.PI / 2 + (R() - 0.5) * 1.1 - 0.3;
    const sweep = (0.3 + R() * 0.5) * (60 / (rad + 20));
    const fall = 1 - (rad - m.r) / 120;
    const col = mix(at(Math.sin(a0) * rad), C.glow, 0.25 + 0.45 * fall);
    const th = 4 + R() * 8;
    bristleStroke(g, R, (t) => {
      const a = a0 + t * sweep;
      return [Math.cos(a) * rad, Math.sin(a) * rad, Math.cos(a), Math.sin(a)];
    }, rad * sweep, th, col, (0.06 + 0.16 * fall) * (0.6 + R() * 0.4));
  }
  return c;
}

function moonDisc(g, m) {
  const R = rng(4244);
  // The moon: a tight halo, a feathered disc, soft maria and dabbed texture.
  const halo = g.createRadialGradient(m.x, m.y, m.r * 0.9, m.x, m.y, m.r * 2.1);
  halo.addColorStop(0, css(C.moon, 0.55));
  halo.addColorStop(0.35, css(C.glow, 0.22));
  halo.addColorStop(1, css(C.glow, 0));
  g.fillStyle = halo;
  g.beginPath();
  g.arc(m.x, m.y, m.r * 2.1, 0, TAU);
  g.fill();
  g.fillStyle = css(C.moon, 0.45);
  fillPoly(g, arcPts(m.x, m.y, m.r + 1.2, m.r + 1.2, 0, TAU, 60), 0.5, 3);
  const disc = wobbled(arcPts(m.x, m.y, m.r, m.r, 0, TAU, 72), 0.35, 5);
  const dg = g.createRadialGradient(m.x + 7, m.y - 7, 2, m.x, m.y, m.r);
  dg.addColorStop(0, css(shade(C.moon, 0.3)));
  dg.addColorStop(0.6, css(C.moon));
  dg.addColorStop(1, css(C.moonEdge));
  g.fillStyle = dg;
  g.beginPath();
  polyPath(g, disc);
  g.fill();
  g.save();
  g.beginPath();
  polyPath(g, disc);
  g.clip();
  for (const [dx, dy, rr, a] of [[-8, -5, 6.5, 0.4], [5, 7, 5, 0.34], [9, -9, 3, 0.3], [-3, 11, 3.2, 0.3], [-12, 6, 3.6, 0.26], [2, -2, 2.4, 0.18]]) {
    g.fillStyle = css(C.moonMark, a);
    fillPoly(g, arcPts(m.x + dx, m.y + dy, rr, rr * 0.85, 0, TAU, 20), rr * 0.18, dx * 3 + dy);
  }
  for (let i = 0; i < 70; i++) {
    const a = R() * TAU;
    const rr = Math.sqrt(R()) * m.r;
    g.fillStyle = css(R() < 0.5 ? C.moonMark : shade(C.moon, 0.4), 0.15 + R() * 0.15);
    dab(g, m.x + Math.cos(a) * rr, m.y + Math.sin(a) * rr, 0.8 + R() * 1.6, 0.5 + R() * 0.7, R() * TAU);
  }
  // The shadowed limb, away from the viewer's light: a faint cool crescent lower left.
  const limbG = g.createRadialGradient(m.x + 6, m.y - 6, m.r * 0.7, m.x + 6, m.y - 6, m.r * 1.35);
  limbG.addColorStop(0, css(C.moonEdge, 0));
  limbG.addColorStop(1, css([196, 200, 206], 0.55));
  g.fillStyle = limbG;
  g.fillRect(m.x - m.r - 2, m.y - m.r - 2, m.r * 2 + 4, m.r * 2 + 4);
  g.restore();
}

function buildStar(k) {
  const s = 8;
  const c = canvas(s * k, s * k);
  const g = c.getContext('2d');
  g.scale(k, k);
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, 'rgba(255,250,228,1)');
  gr.addColorStop(0.22, 'rgba(250,244,220,0.9)');
  gr.addColorStop(0.5, 'rgba(210,220,240,0.22)');
  gr.addColorStop(1, 'rgba(200,210,240,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, s, s);
  return c;
}

// A double-tapered brush ribbon from x0 to x1: thickest at `mid` (0..1), fading to a
// point at either end.
function ribbon(g, x0, x1, y, th, mid, sag, seed) {
  const xm = x0 + (x1 - x0) * mid;
  const ym = y - sag;
  limb(g, [[xm, ym], [(xm + x1) / 2, y - sag * 0.5], [x1, y]], th, 0.3, seed);
  limb(g, [[xm, ym], [(xm + x0) / 2, y - sag * 0.4], [x0, y + 0.3]], th, 0.3, seed + 1);
}

// A painted wisp: stacked horizontal brush ribbons, a few soft bulges on top, lit on
// its moon side and dragged through with dry-brush streaks.
function buildCloud(r, ci) {
  const it = SCENE.clouds.items[ci];
  const { w, h } = it;
  const R0 = rng(900 + ci * 17);
  const shape = (g) => {
    // The main body, then thinner trails reaching further out.
    ribbon(g, w * 0.04, w * 0.96, h * 0.62, h * 0.62, 0.45, h * 0.12, ci * 10);
    ribbon(g, w * 0.12 + R0() * w * 0.08, w * 0.78, h * 0.4, h * 0.42, 0.55, h * 0.1, ci * 10 + 2);
    ribbon(g, -w * 0.06, w * 0.5, h * 0.8, h * 0.24, 0.6, 0, ci * 10 + 4);
    ribbon(g, w * 0.45, w * 1.07, h * 0.76, h * 0.22, 0.3, 0, ci * 10 + 6);
    const bumps = 2 + (ci % 2);
    for (let b = 0; b < bumps; b++) {
      const bx = w * (0.25 + (b / Math.max(1, bumps - 1)) * 0.4 + (R0() - 0.5) * 0.08);
      const br = h * (0.26 + R0() * 0.14);
      fillPoly(g, arcPts(bx, h * 0.42, br * 2.1, br, 0, TAU, 28), 0.4, bx);
    }
  };
  return massSprite(r, [-w * 0.1, -6, w * 1.22, h + 12], shape, {
    body: C.cloud, dark: C.cloudDark, lit: C.cloudLit, rim: 1.1, rimA: 0.6,
    dabs: 0.25, dab: 3, dabAng: 0, seed: 50 + ci, g0: 0.35,
  }, (g, R) => {
    for (let i = 0; i < 16; i++) {
      g.fillStyle = css(R() < 0.45 ? C.cloudLit : C.cloudDark, 0.12 + R() * 0.14);
      dab(g, R() * w, h * (0.3 + R() * 0.5), 6 + R() * 16, 0.4 + R() * 0.5, (R() - 0.5) * 0.06);
    }
  });
}

function buildOpeningCloud(r, ci) {
  const { w, h, seed } = OPENING_CLOUDS[ci];
  const shape = (g) => {
    ribbon(g, w * 0.04, w * 0.96, h * 0.62, h * 0.62, 0.48, h * 0.1, seed);
    ribbon(g, w * 0.18, w * 0.82, h * 0.38, h * 0.38, 0.56, h * 0.08, seed + 2);
    ribbon(g, -w * 0.04, w * 0.5, h * 0.82, h * 0.2, 0.6, 0, seed + 4);
    ribbon(g, w * 0.52, w * 1.04, h * 0.78, h * 0.2, 0.35, 0, seed + 6);
    for (let b = 0; b < 2; b++) {
      const bx = w * (0.38 + b * 0.2);
      const br = h * (0.22 + b * 0.04);
      fillPoly(g, arcPts(bx, h * 0.4, br * 2, br, 0, TAU, 20), 0.4, bx + seed);
    }
  };
  return massSprite(r, [-w * 0.1, -4, w * 1.2, h + 8], shape, {
    body: [30, 38, 72], dark: [17, 23, 52], lit: [82, 94, 132],
    rim: 0.7, rimA: 0.32, dabs: 0.12, dab: 1.5, dabAng: 0, seed, g0: 0.28,
  }, (g, R) => {
    for (let i = 0; i < 6; i++) {
      g.fillStyle = css(R() < 0.5 ? [88, 100, 138] : [12, 18, 42], 0.1 + R() * 0.12);
      dab(g, R() * w, h * (0.35 + R() * 0.4), 4 + R() * 7, 0.35 + R() * 0.3, (R() - 0.5) * 0.05);
    }
  });
}

function drawBat(ctx, b) {
  const up = Math.cos(b.flap * TAU);
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.scale(b.s, b.s);
  ctx.fillStyle = css(C.bat);
  ctx.beginPath();
  ctx.moveTo(0, -0.5);
  ctx.quadraticCurveTo(-4, -3.5 * up - 2.5, -10.5, -6 * up);
  ctx.quadraticCurveTo(-8.5, -1.5 * up + 0.5, -8, 1);
  ctx.quadraticCurveTo(-6.5, -0.2, -5.4, 1.4);
  ctx.quadraticCurveTo(-4, 0.2, -2.6, 1.8);
  ctx.quadraticCurveTo(0, 1.2, 2.6, 1.8);
  ctx.quadraticCurveTo(4, 0.2, 5.4, 1.4);
  ctx.quadraticCurveTo(6.5, -0.2, 8, 1);
  ctx.quadraticCurveTo(8.5, -1.5 * up + 0.5, 10.5, -6 * up);
  ctx.quadraticCurveTo(4, -3.5 * up - 2.5, 0, -0.5);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 0.6, 1.7, 2.3, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-1.3, -1); ctx.lineTo(-1, -2.8); ctx.lineTo(-0.2, -1.4);
  ctx.moveTo(1.3, -1); ctx.lineTo(1, -2.8); ctx.lineTo(0.2, -1.4);
  ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------------ fog
function buildFogWisp(k, v) {
  const W = 200;
  const H = 56;
  const r = k * 0.5;
  const c = canvas(W * r, H * r);
  const g = c.getContext('2d');
  g.setTransform(r, 0, 0, r, 0, 0);
  const R = rng(700 + v * 31);
  // Layered washes: each a soft horizontal ellipse, flatter underneath.
  for (let i = 0; i < 9; i++) {
    const cx = W * (0.2 + R() * 0.6);
    const cy = H * (0.45 + R() * 0.2);
    const rx = W * (0.16 + R() * 0.2);
    const ry = H * (0.16 + R() * 0.14);
    g.save();
    g.translate(cx, cy);
    g.scale(rx / ry, 1);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, ry);
    const col = mix(C.fog, [220, 226, 240], R() * 0.35);
    gr.addColorStop(0, css(col, 0.3));
    gr.addColorStop(0.6, css(col, 0.18));
    gr.addColorStop(1, css(col, 0));
    g.fillStyle = gr;
    g.beginPath();
    g.arc(0, 0, ry, 0, TAU);
    g.fill();
    g.restore();
  }
  // Streaks dragged through the wash.
  g.lineCap = 'round';
  for (let i = 0; i < 16; i++) {
    const y = H * (0.35 + R() * 0.35);
    const x0 = W * (0.1 + R() * 0.4);
    const len = W * (0.2 + R() * 0.4);
    g.strokeStyle = css(mix(C.fog, [230, 234, 246], R() * 0.5), 0.1 + R() * 0.14);
    g.lineWidth = 1 + R() * 2.5;
    g.beginPath();
    g.moveTo(x0, y);
    g.quadraticCurveTo(x0 + len / 2, y - 1 - R() * 2, x0 + len, y + (R() - 0.5) * 2);
    g.stroke();
  }
  return c;
}

function fogBand(ctx, band, b, wisps, view) {
  const y0 = band.y - band.h * 0.9;
  const y1 = band.y + band.h * 1.5;
  const gr = ctx.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, css(C.fog, 0));
  gr.addColorStop(0.5, css(C.fog, 0.04));
  gr.addColorStop(0.8, css(C.fog, 0.08));
  gr.addColorStop(1, css(C.fog, 0.05));
  ctx.fillStyle = gr;
  ctx.fillRect(view.left - 40, y0, view.right - view.left + 80, y1 - y0);
  for (const p of band.puffs) {
    const w = wisps[(p.i + b * 2) % wisps.length];
    ctx.globalAlpha = b ? 0.34 : 0.36;
    ctx.drawImage(w, p.x - p.rx * 1.35, p.y - p.ry * 2.1, p.rx * 2.7, p.ry * 3.6);
  }
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------ paper
function buildPaper(k) {
  const T = 128;
  const small = canvas(T, T);
  const sg = small.getContext('2d');
  // A headless test canvas has no pixel buffer: leave the tooth out there.
  const img = typeof sg.createImageData === 'function' ? sg.createImageData(T, T) : null;
  const R = rng(99);
  if (!img || !img.data) return small;
  for (let i = 0; i < T * T; i++) {
    const v = R() - 0.5;
    const light = v > 0;
    const a = Math.abs(v) * 2;
    img.data[i * 4] = light ? 255 : 0;
    img.data[i * 4 + 1] = light ? 252 : 0;
    img.data[i * 4 + 2] = light ? 240 : 10;
    img.data[i * 4 + 3] = Math.round(a * a * 11);
  }
  sg.putImageData(img, 0, 0);
  const c = canvas(T * k, T * k);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = true;
  g.drawImage(small, 0, 0, T * k, T * k);
  // Mottling: broad, faint blots, wrapped so the tile repeats cleanly.
  g.setTransform(k, 0, 0, k, 0, 0);
  for (let i = 0; i < 26; i++) {
    const x = R() * T;
    const y = R() * T;
    const rr = 6 + R() * 18;
    const col = R() < 0.5 ? 'rgba(255,250,236,0.014)' : 'rgba(0,0,12,0.02)';
    for (const ox of [-T, 0, T]) {
      for (const oy of [-T, 0, T]) {
        g.fillStyle = col;
        dab(g, x + ox, y + oy, rr, rr * (0.5 + R() * 0.2), R() * TAU);
      }
    }
  }
  return c;
}

// ------------------------------------------------------------------ item painters
// Every painter returns a sprite in the item's local coords: origin at its base, the
// resolved (x, y) of the frame.

function abbeySprite(r, s, pal) {
  const S = (pts) => pts.map((v) => v * s);
  const nave = [-54, 2, -54, -24, -48, -30, -44, -28.5, -40, -29, -34, -36, -28, -35, -22, -34, -16, -40, -8, -37, 2, -40, 2, 2];
  const tower = rectPts(2, -54, 16, 56);
  const spire = [0, -54, 5.5, -68, 10, -86, 14.5, -68, 20, -54];
  const transept = [18, 2, 18, -26, 28, -34, 32, -30, 38, -36, 50, -24, 50, 2];
  const shape = (g) => {
    fillPoly(g, S(nave), 0.5 * s, 1);
    fillPoly(g, S(tower), 0.35 * s, 2);
    fillPoly(g, S(spire), 0.3 * s, 3);
    fillPoly(g, S([-1, -54, 21, -54, 21, -51, -1, -51]), 0.2, 4); // tower cornice
    fillPoly(g, S(transept), 0.5 * s, 5);
  };
  return massSprite(r, [-60 * s, -92 * s, 116 * s, 98 * s], shape, {
    body: pal.body, dark: pal.dark, lit: pal.lit, rim: 1.2, rimA: 0.85, dabs: 0.35, dab: 1.8, dabAng: 0, seed: 101, g0: 0.2,
  }, (g, R) => {
    // The tower's shadowed face and the nave's buttress shadows, away from the moon.
    g.fillStyle = css(pal.dark, 0.55);
    fillPoly(g, S([2, -54, 7, -54, 7, 2, 2, 2]), 0.2, 6);
    fillPoly(g, S([0, -54, 5.5, -68, 10, -86, 8, -70, 4, -54]), 0.2, 7);
    for (const x of [-49, -34, -19]) fillPoly(g, S([x, -2, x + 2.2, -2, x + 2.2, -22, x, -21]), 0.2, x);
    // Masonry courses, barely there.
    for (let i = 0; i < 26; i++) {
      g.fillStyle = css(R() < 0.5 ? pal.lit : pal.dark, 0.18);
      dab(g, (-52 + R() * 100) * s, (-30 + R() * 30) * s, (1.5 + R() * 2.5) * s, 0.35 * s, 0);
    }
    // Windows onto a dark interior — NOT cut through to the sky: anything passing
    // behind the ruin (the witch) showed through them (Peter, 26 Sep 2026: "the building
    // has gaps she can be seen through, this shouldn't happen"). The tower's belfry
    // window is lit live instead (towerLight in drawCryptGouache).
    g.fillStyle = css([13, 13, 30]);
    for (const x of [-42, -27, -12]) fillPoly(g, S(abbeyWindowPts(x, -6, 6.5, 17)), 0.25 * s, x);
    fillPoly(g, S(abbeyWindowPts(10, -38, 4.6, 10)), 0.15, 8);
    fillPoly(g, S(arcPts(34, -17, 4.4, 4.4, 0, TAU, 18)), 0.25 * s, 9);
  });
}

// A dead tree as brush limbs. `lean` bends the trunk; returns the limb list in local
// coords, base at (0, 0), scaled by s.
function deadTreeLimbs(g, s, lean, seed, wScale = 1) {
  const L = lean;
  const P = (x, y) => [x * s, y * s];
  const W = wScale * s;
  limb(g, [P(0, 2), P(L * 2, -12), P(L * 4, -26), P(L * 6.5, -40), P(L * 8, -50)], 6 * W, 1 * W, seed);
  limb(g, [P(L * 3, -18), P(-6, -26), P(-12, -32), P(-17, -42)], 2.8 * W, 0.6 * W, seed + 1);
  limb(g, [P(-12, -32), P(-17, -33), P(-22, -35)], 1.3 * W, 0.4 * W, seed + 2);
  limb(g, [P(L * 5, -28), P(8, -35), P(13, -40), P(20, -43)], 2.6 * W, 0.5 * W, seed + 3);
  limb(g, [P(13, -40), P(14, -45), P(16, -50)], 1.3 * W, 0.4 * W, seed + 4);
  limb(g, [P(L * 7, -42), P(2, -47), P(-3, -53)], 1.6 * W, 0.4 * W, seed + 5);
  limb(g, [P(-6, -26), P(-10, -22), P(-15, -21)], 1.1 * W, 0.35 * W, seed + 6);
  limb(g, [P(L * 7.6, -47), P(L * 7.6 + 4, -52), P(L * 7.6 + 5, -56)], 1 * W, 0.35 * W, seed + 7);
  // Root flare.
  limb(g, [P(-1, 0), P(-5, 2), P(-8, 3)], 2.6 * W, 0.6 * W, seed + 8);
  limb(g, [P(1, 0), P(5, 2), P(8, 2.6)], 2.6 * W, 0.6 * W, seed + 9);
}

function treeSprite(r, s, variant, pal, seed) {
  const lean = variant === 1 ? -0.8 : 0.2;
  return massSprite(r, [-32 * s, -62 * s, 64 * s, 68 * s], (g) => deadTreeLimbs(g, s, lean, seed), {
    body: pal.body, dark: pal.dark, lit: pal.lit, rim: 0.7, rimA: 0.6, dabs: 0.15, dab: 1.2, dabAng: -1.4, seed, g0: 0,
  });
}

function groveSprite(r, s, i, pal) {
  const n = 3 + (i % 3);
  const trees = [];
  for (let t = 0; t < n; t++) {
    trees.push({
      dx: (t - (n - 1) / 2) * 12 * s + (hash(i * 7 + t) - 0.5) * 6,
      sc: (0.42 + hash(i * 11 + t) * 0.24) * s,
      lean: (hash(t + i * 3.7) - 0.5) * 0.8,
    });
  }
  return massSprite(r, [-48 * s, -44 * s, 96 * s, 50 * s], (g) => {
    for (const t of trees) {
      g.save();
      g.translate(t.dx, 2);
      deadTreeLimbs(g, t.sc, t.lean, i * 10 + t.dx, 1.25);
      g.restore();
    }
  }, { body: pal.body, dark: pal.dark, lit: pal.lit, rim: 0.7, rimA: 0.45, dabs: 0.1, dab: 1, seed: 300 + i, g0: 0 });
}

function mausoleumSprite(r, s, variant, pal) {
  const S = (pts) => pts.map((v) => v * s);
  const domed = variant === 1;
  const lit = pal.lit;
  const shape = (g) => {
    fillPoly(g, S(rectPts(-24, -4, 48, 6)), 0.3, 1);
    fillPoly(g, S(rectPts(-20.5, -8.4, 41, 4.8)), 0.25, 2);
    fillPoly(g, S(rectPts(-18, -33, 36, 25)), 0.3, 3);
    if (domed) {
      fillPoly(g, S(rectPts(-20.5, -37, 41, 4.5)), 0.25, 4);
      fillPoly(g, S([-14, -36.5, ...arcPts(0, -36.5, 14, 14.5, Math.PI, TAU, 24).slice(2)]), 0.3, 5);
      fillPoly(g, S(rectPts(-0.9, -57, 1.8, 7)), 0, 6);
      fillPoly(g, S(rectPts(-3, -54.4, 6, 1.6)), 0, 7);
    } else {
      fillPoly(g, S(rectPts(-21, -35.5, 42, 3)), 0.25, 4);
      fillPoly(g, S([-22.5, -35, 0, -46, 22.5, -35]), 0.3, 5);
      fillPoly(g, S(arcPts(0, -46.5, 1.6, 1.6, 0, TAU, 10)), 0, 6);
    }
  };
  return massSprite(r, [-27 * s, -60 * s, 54 * s, 64 * s], shape, {
    body: pal.body, dark: pal.dark, lit, rim: 1.2, rimA: 0.95, dabs: 0.4, dab: 1.4, dabAng: 0, seed: 400 + variant, g0: 0.3,
  }, (g) => {
    // Shadow under the cornice and in the tympanum.
    g.fillStyle = css(pal.dark, 0.7);
    fillPoly(g, S(rectPts(-18, -33, 36, 3)), 0.2, 8);
    if (!domed) {
      g.fillStyle = css(pal.dark, 0.45);
      fillPoly(g, S([-15, -36, 0, -43.5, 15, -36]), 0.2, 9);
    } else {
      g.fillStyle = css(pal.dark, 0.45);
      fillPoly(g, S([-14, -37, -14, -42, -8, -48, -5, -37]), 0.3, 9);
    }
    // Columns, lit down their right side.
    for (const x of [-15, 11]) {
      g.fillStyle = css(mix(pal.body, lit, 0.3));
      fillPoly(g, S(rectPts(x, -30, 4, 22)), 0.15, x);
      g.fillStyle = css(lit, 0.8);
      fillPoly(g, S(rectPts(x + 2.9, -30, 1.1, 22)), 0.1, x + 1);
      g.fillStyle = css(pal.dark, 0.6);
      fillPoly(g, S(rectPts(x, -30, 1, 22)), 0.1, x + 2);
      g.fillStyle = css(mix(pal.body, lit, 0.45));
      fillPoly(g, S(rectPts(x - 0.8, -31.4, 5.6, 1.6)), 0.1, x + 3);
    }
    // Lit step treads.
    g.fillStyle = css(lit, 0.55);
    fillPoly(g, S(rectPts(-24, -4, 48, 1)), 0.2, 10);
    fillPoly(g, S(rectPts(-20.5, -8.4, 41, 1)), 0.2, 11);
    // The doorway: deep dark, a little lighter at the sill, inside a lit stone surround.
    // Both are true semicircular arches on one centre, cut without wobble, so the crown
    // stays round and sits exactly on the jambs.
    g.fillStyle = css(lit, 0.35);
    fillPoly(g, S(archOpeningPts(0, -8, 12.6, 16.8)), 0, 13);
    const dg = g.createLinearGradient(0, -24 * s, 0, -8 * s);
    dg.addColorStop(0, css([10, 12, 28]));
    dg.addColorStop(1, css([22, 26, 50]));
    g.fillStyle = dg;
    fillPoly(g, S(archOpeningPts(0, -8, 11, 16)), 0, 12);
  });
}

function stoneSprite(r, s, variant, i) {
  const lean = (hash(i * 3.3) - 0.5) * 0.28;
  const S = (pts) => pts.map((v) => v * s);
  let pts;
  if (variant === 2) pts = [-4, 0, -4, -3, -2.6, -3, -1.8, -18, 0, -21, 1.8, -18, 2.6, -3, 4, -3, 4, 0];
  else if (variant === 1) pts = [-5, 0, -5, -12, -1.5, -12, 0, -14, 1.5, -12, 5, -12, 5, 0];
  else pts = [-4.5, 0, ...arcPts(0, -9, 4.5, 4.8, Math.PI, TAU, 14), 4.5, 0];
  const body = mix(STONE.body, STONE.dark, hash(i * 1.7) * 0.4);
  return massSprite(r, [-10 * s, -26 * s, 20 * s, 29 * s], (g) => {
    g.rotate(lean);
    fillPoly(g, S(pts), 0.22, i);
  }, { body, dark: STONE.dark, lit: STONE.lit, rim: 0.9, rimA: 0.8, dabs: 0.5, dab: 1, dabAng: 0, seed: 500 + i, g0: 0.2 }, (g, R) => {
    g.rotate(lean);
    // An engraved mark and a little moss.
    g.fillStyle = css(STONE.dark, 0.7);
    if (variant === 0) {
      fillPoly(g, S([-0.5, -11, 0.5, -11, 0.5, -5, -0.5, -5]), 0, 1);
      fillPoly(g, S([-2, -9, 2, -9, 2, -8, -2, -8]), 0, 2);
    } else if (variant === 1) {
      for (const y of [-9, -6.5, -4]) fillPoly(g, S([-3, y, 3, y, 3, y + 0.8, -3, y + 0.8]), 0, y);
    }
    g.fillStyle = css([40, 52, 70], 0.5);
    for (let k = 0; k < 4; k++) dab(g, (R() - 0.5) * 7 * s, -R() * 3 * s, 1.4 * s, 0.7 * s, 0);
  });
}

function crossSprite(r, s, i) {
  const lean = (hash(i * 5.1) - 0.5) * 0.2;
  const celtic = i % 2 === 0;
  const S = (pts) => pts.map((v) => v * s);
  return massSprite(r, [-10 * s, -26 * s, 20 * s, 29 * s], (g) => {
    g.rotate(lean);
    if (celtic) {
      g.lineWidth = 1.5 * s;
      g.beginPath();
      g.arc(0, -15 * s, 4.1 * s, 0, TAU);
      g.stroke();
    }
    fillPoly(g, S([-1.7, 0, -1.6, -11, -6, -11.2, -6, -14.4, -1.6, -14.5, -1.7, -20, 1.7, -20, 1.6, -14.5, 6, -14.4, 6, -11.2, 1.6, -11, 1.7, 0]), 0.18, i);
    fillPoly(g, S(rectPts(-3, -1.8, 6, 2)), 0.15, i + 1);
  }, { body: STONE.body, dark: STONE.dark, lit: STONE.lit, rim: 0.8, rimA: 0.85, dabs: 0.4, dab: 0.9, seed: 600 + i, g0: 0.2 });
}

function gnarlSprite(r, s, variant, pal, { clearOwlWing = false } = {}) {
  const flip = variant === 1 ? -1 : 1;
  const P = (x, y) => [x * s * flip, y * s];
  const shape = (g) => {
    limb(g, [P(0, 3), P(-5, -14), P(-4, -30), P(3, -46), P(4, -60), P(-1, -74), P(0, -86)], 17 * s, 5 * s, 1);
    limb(g, [P(2, -50), P(14, -60), P(24, -66), P(44, -64), P(58, -74)], 8 * s, 1.2 * s, 2);
    limb(g, [P(44, -64), P(50, -58), P(55, -56), P(63, -59)], 2.8 * s, 0.5 * s, 3);
    if (!clearOwlWing) limb(g, [P(30, -66), P(33, -75), P(36, -82), P(48, -92)], 3.6 * s, 0.6 * s, 4);
    limb(g, [P(0, -80), P(-8, -92), P(-14, -100), P(-26, -104)], 5.5 * s, 0.8 * s, 5);
    limb(g, [P(-14, -100), P(-12, -108), P(-13, -115)], 2.4 * s, 0.5 * s, 6);
    limb(g, [P(1, -84), P(8, -96), P(14, -104), P(30, -112), P(38, -125)], 5.5 * s, 0.7 * s, 7);
    limb(g, [P(20, -107), P(28, -100), P(36, -102)], 2.2 * s, 0.4 * s, 8);
    limb(g, [P(-3, -36), P(-12, -42), P(-18, -46), P(-27, -44)], 4.6 * s, 0.8 * s, 9);
    limb(g, [P(58, -74), P(62, -80), P(61, -86)], 1.4 * s, 0.35 * s, 10);
    limb(g, [P(-26, -104), P(-31, -101), P(-34, -103)], 1.2 * s, 0.3 * s, 11);
    // Roots gripping the bank.
    limb(g, [P(-4, 0), P(-10, 2), P(-18, 4)], 7 * s, 1 * s, 12);
    limb(g, [P(4, 0), P(10, 2), P(19, 3.6)], 7 * s, 1 * s, 13);
    limb(g, [P(0, 1), P(-3, 4), P(-6, 6)], 5 * s, 1 * s, 14);
  };
  return massSprite(r, [-82 * s, -132 * s, 164 * s, 142 * s], shape, {
    body: pal.body, dark: pal.dark, lit: pal.lit, rim: 1.3, rimA: 0.95, dabs: 0.12, dab: 2.4, dabAng: -1.5, seed: 700 + variant, g0: 0.1,
  }, (g, R) => {
    // Bark: long vertical streaks down the trunk, and a hollow knot.
    for (let k = 0; k < 40; k++) {
      const y = -R() * 80 * s;
      const x = (Math.sin(y / (14 * s)) * 3 - 1 + (R() - 0.5) * 12) * s * flip;
      g.fillStyle = css(R() < 0.4 ? pal.lit : shade(pal.dark, -0.2), 0.2 + R() * 0.25);
      dab(g, x, y, 0.5 * s, (3 + R() * 6) * s, (R() - 0.5) * 0.3);
    }
    g.fillStyle = css(shade(pal.dark, -0.4));
    dab(g, -1.5 * s * flip, -42 * s, 2.2 * s, 3.8 * s, 0.2 * flip);
    g.fillStyle = css(pal.lit, 0.5);
    dab(g, 0.5 * s * flip, -42.5 * s, 0.7 * s, 3.2 * s, 0.2 * flip);
  });
}

function grassSprite(r, s, i, pal) {
  const blades = [];
  for (let k = 0; k < 8; k++) {
    const dx = (k - 3.5) * 2 * s;
    const h = (7 + hash(i * 13 + k) * 7) * s;
    const bend = (hash(i + k * 5) - 0.4) * 6 * s;
    blades.push([dx, h, bend]);
  }
  return massSprite(r, [-16 * s, -22 * s, 32 * s, 25 * s], (g) => {
    for (const [dx, h, bend] of blades) {
      limb(g, [[dx, 2], [dx + bend * 0.3, -h * 0.5], [dx + bend, -h]], 1.8 * s, 0.25, i + dx);
    }
    // One thistle head on the tallest stem.
    const [dx, h, bend] = blades.reduce((a, b) => (b[1] > a[1] ? b : a));
    g.beginPath();
    g.ellipse(dx + bend, -h - 1.2 * s, 1.8 * s, 2.2 * s, 0, 0, TAU);
    g.fill();
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k - 2) * 0.35;
      limb(g, [[dx + bend, -h - 2 * s], [dx + bend + Math.cos(a) * 3.6 * s, -h - 2 * s + Math.sin(a) * 3.6 * s]], 0.7 * s, 0.15, k);
    }
  }, { body: mix(pal.body, [44, 40, 58], 0.35), dark: pal.dark, lit: mix(pal.lit, [120, 116, 130], 0.3), rim: 0.6, rimA: 0.9, dabs: 0, seed: 800 + i, g0: 0 });
}

// ------------------------------------------------------------------ strips
function paintRidge(S) {
  const { g, ridge, P, u0, u1, cfg } = S;
  const seed = cfg.seed;
  const crestAt = (u) => ridge(u) + (pnoise(u, 6, P, seed) + 0.4 * pnoise(u, 1.6, P, seed + 5)) * cfg.wob;
  const path = new Path2D();
  path.moveTo(u0 - 4, cfg.bottom + 4);
  for (let u = u0 - 4; u <= u1 + 4; u += 1) path.lineTo(u, crestAt(u));
  path.lineTo(u1 + 4, cfg.bottom + 4);
  path.closePath();
  let crestTop = Infinity;
  for (let u = 0; u < P; u += 4) crestTop = Math.min(crestTop, ridge(u));
  const gr = g.createLinearGradient(0, crestTop, 0, cfg.bottom);
  gr.addColorStop(0, css(mix(cfg.body, cfg.lit, 0.12)));
  gr.addColorStop(0.3, css(cfg.body));
  gr.addColorStop(1, css(cfg.dark));
  g.fillStyle = gr;
  g.fill(path);

  g.save();
  g.clip(path);
  const R = rng(seed * 7 + 1);
  const tones = [shade(cfg.body, 0.08), shade(cfg.body, -0.14), mix(cfg.body, cfg.lit, 0.35), shade(cfg.dark, -0.1)];
  // Dabbed body: short strokes laid along the slope, thickest near the crest.
  const n = Math.round(P * cfg.dabDensity);
  for (let i = 0; i < n; i++) {
    const u = R() * P;
    const cy = ridge(u);
    const y = cy + Math.pow(R(), 1.6) * (Math.min(cfg.bottom, 240) - cy);
    const slope = (ridge(u + 3) - ridge(u - 3)) / 6;
    g.fillStyle = css(tones[(R() * tones.length) | 0]);
    g.globalAlpha = 0.16 + R() * 0.28;
    const rx = cfg.dab * (0.5 + R() * 0.9);
    const ry = rx * (0.28 + R() * 0.2);
    const ang = Math.atan(slope) * 0.8 + (R() - 0.5) * 0.45;
    periodic(S, u, 10, (uu) => dab(g, uu, y, rx, ry, ang));
  }
  // A broad, thin glaze of moonlight down the slopes that face the moon.
  for (let i = 0; i < n * 0.5; i++) {
    const u = R() * P;
    const slope = (ridge(u + 6) - ridge(u - 6)) / 12;
    const facing = (slope * 0.6 + 0.8) / Math.hypot(1, slope);
    const k = clamp01((facing - 0.82) * 5);
    if (k <= 0) continue;
    const d = Math.pow(R(), 1.4) * 22;
    g.fillStyle = css(mix(cfg.body, cfg.lit, 0.55));
    g.globalAlpha = k * (1 - d / 22) * (0.12 + R() * 0.16);
    const rx = cfg.dab * (0.8 + R() * 1.2);
    const y = ridge(u) + d;
    periodic(S, u, 10, (uu) => dab(g, uu, y, rx, rx * 0.35, Math.atan(slope)));
  }
  // Moonlit scumble along the crest, strongest on slopes that turn toward the moon.
  for (let u = 0; u < P; u += 1.1) {
    const slope = (ridge(u + 3) - ridge(u - 3)) / 6;
    const facing = (slope * 0.6 + 0.8) / Math.hypot(1, slope);
    const k = clamp01((facing - 0.6) * 3);
    if (R() > 0.35 + 0.65 * k) continue;
    g.fillStyle = css(cfg.lit);
    g.globalAlpha = cfg.rimA * (0.35 + 0.65 * k) * (0.5 + R() * 0.5);
    const y = crestAt(u) + cfg.rimW * (0.1 + R() * 0.6);
    const rx = 1.2 + R() * 2.4;
    const ry = cfg.rimW * (0.35 + R() * 0.35 + k * 0.4);
    periodic(S, u, 6, (uu) => dab(g, uu, y, rx, ry, Math.atan(slope)));
  }
  g.restore();
  g.globalAlpha = 1;
  S.crestAt = crestAt;
}

function periodic(S, u, pad, fn) {
  for (const n of [-1, 0, 1]) {
    const uu = u + n * S.P;
    if (uu > S.u0 - pad && uu < S.u1 + pad) fn(uu);
  }
}

// Dead grass flicks standing up off a crest, so the silhouette is dabbed, not cut.
function crestFlicks(S, count, col, hMax) {
  const { g, P } = S;
  const R = rng(S.cfg.seed * 13 + 5);
  g.fillStyle = css(col);
  for (let i = 0; i < count; i++) {
    const u = R() * P;
    const y = S.crestAt(u) + 1.2;
    const h = 1 + R() * hMax;
    const lean = (R() - 0.45) * 1.6;
    periodic(S, u, 4, (uu) => {
      g.beginPath();
      g.moveTo(uu - 0.7, y);
      g.quadraticCurveTo(uu + lean * 0.4, y - h * 0.6, uu + lean, y - h);
      g.quadraticCurveTo(uu + lean * 0.3 + 0.2, y - h * 0.5, uu + 0.7, y);
      g.closePath();
      g.fill();
    });
  }
}

function fence(S, it) {
  const { g, ridge } = S;
  const gateHalf = 15;
  const bars = [];
  for (let x = it.x0; x <= it.x1; x += 7) {
    if (it.gate != null && Math.abs(x - it.gate) < gateHalf + 2) continue;
    bars.push(x);
  }
  const iron = css(C.iron);
  const lit = css(C.ironLit, 0.75);
  // Rails first, so the bars stand proud of them.
  const runs = it.gate == null ? [[it.x0, it.x1]] : [[it.x0, it.gate - gateHalf], [it.gate + gateHalf, it.x1]];
  g.lineCap = 'round';
  for (const [a, b] of runs) {
    for (const h of [5, 16]) {
      g.strokeStyle = iron;
      g.lineWidth = 1.5;
      g.beginPath();
      for (let x = a; x <= b; x += 3) {
        const y = ridge(x) - h + vnoise((x - it.x0) / 9, h + it.i) * 0.3;
        x === a ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();
      g.strokeStyle = lit;
      g.lineWidth = 0.5;
      g.globalAlpha = 0.6;
      g.beginPath();
      for (let x = a; x <= b; x += 3) {
        const y = ridge(x) - h - 0.55;
        x === a ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();
      g.globalAlpha = 1;
    }
  }
  for (const x of bars) {
    const b = ridge(x);
    const tilt = vnoise((x - it.x0) / 5, 3 + it.i) * 0.6;
    g.fillStyle = iron;
    g.beginPath();
    g.moveTo(x - 0.85, b + 1.5);
    g.lineTo(x - 0.75 + tilt, b - 20);
    g.lineTo(x + 0.75 + tilt, b - 20);
    g.lineTo(x + 0.85, b + 1.5);
    g.closePath();
    g.fill();
    // Spear head: a little leaf of iron.
    g.beginPath();
    g.moveTo(x + tilt, b - 26);
    g.quadraticCurveTo(x + tilt + 2.4, b - 22, x + tilt + 0.6, b - 19.5);
    g.lineTo(x + tilt - 0.6, b - 19.5);
    g.quadraticCurveTo(x + tilt - 2.4, b - 22, x + tilt, b - 26);
    g.fill();
    g.fillStyle = lit;
    g.fillRect(x + 0.2 + tilt * 0.5, b - 19.5, 0.55, 17);
    g.beginPath();
    g.moveTo(x + tilt + 0.2, b - 25.2);
    g.quadraticCurveTo(x + tilt + 1.9, b - 22, x + tilt + 0.6, b - 20.2);
    g.lineTo(x + tilt + 0.3, b - 21);
    g.closePath();
    g.fill();
  }
  if (it.gate != null) {
    const gx = it.gate;
    const b = S.foot(gx, gateHalf);
    // The posts only: the leaves between them are painted live (gateLeaves), so they
    // can move.
    g.fillStyle = iron;
    for (const px of [gx - gateHalf, gx + gateHalf]) {
      g.fillRect(px - 1.5, b - 32, 3, 33.5);
      dab(g, px, b - 34.2, 2.5, 2.5, 0);
      g.fillRect(px - 2.2, b - 32.4, 4.4, 1.4);
    }
    // The moon on the right-hand post.
    g.fillStyle = lit;
    g.fillRect(gx + gateHalf + 0.6, b - 31, 0.8, 31);
    dab(g, gx + gateHalf + 1, b - 35, 0.8, 1.2, 0.5);
    dab(g, gx - gateHalf + 1, b - 35, 0.8, 1.2, 0.5);
  }
}

// ------------------------------------------------------------------ gate leaves
// THE GATES' LEAVES are painted live over the baked bank, the way the lamps are: the
// posts stay in the bake, what hangs between them can move. The pack hands in the
// painter as view.gate — the run's are in cryptGates.js (creaking, with the odd one
// slamming in landscape), the lab's in src/dev/crypt-gate-bakeoff.js; with none, they hang shut
// and still, stroke for stroke what the bake used to hold.
export const GATE_HALF = 15;

export function gateStill(ctx, f) {
  const { x: gx, b } = f;
  ctx.strokeStyle = css(C.iron);
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(gx - GATE_HALF, b - 26);
  ctx.quadraticCurveTo(gx, b - 41, gx + GATE_HALF, b - 26);
  ctx.moveTo(gx - GATE_HALF, b - 12);
  ctx.lineTo(gx + GATE_HALF, b - 12);
  ctx.moveTo(gx - GATE_HALF, b - 4);
  ctx.lineTo(gx + GATE_HALF, b - 4);
  ctx.stroke();
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let x = gx - GATE_HALF + 5; x < gx + GATE_HALF - 2; x += 5) {
    ctx.moveTo(x, b + 1);
    ctx.lineTo(x, b - 26 - 6.5 * Math.cos((x - gx) / GATE_HALF * 1.4));
  }
  ctx.stroke();
  // A scroll either side of the centre.
  ctx.lineWidth = 0.9;
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(gx + d * 5, b - 19, 2.6, 0, TAU);
    ctx.stroke();
  }
}

// `f` is { x, b, t, i, pass, ridgeY, view }: the gate's centre on screen, the foot the
// bake seated its posts on (the deepest crest under them), the clock, which gate of the
// bank this is (0, 1, ...) and which time round the bank (so every gate the run meets has
// its own number, 2 * pass + i), the bank's crest at any screen x, and the view (heroX,
// gateCue).
function gateLeaves(ctx, t, shift, view) {
  const L = SCENE.fg;
  const dy = view.y.fg;
  const ridgeY = (x) => L.profile(x + shift, L.period) + dy;
  const paint = view.gate || gateStill;
  let i = 0;
  for (const it of L.items) {
    if (it.kind !== 'fence' || it.gate == null) continue;
    for (const x of instances(it.gate, shift, L.period, view.left, view.right, 60)) {
      let b = -Infinity;
      for (let d = -GATE_HALF; d <= GATE_HALF; d += 2) b = Math.max(b, ridgeY(x + d));
      const pass = Math.round((x + shift - it.gate) / L.period);
      ctx.save();
      paint(ctx, { x, b, t, i, pass, ridgeY, view });
      ctx.restore();
    }
    i++;
  }
}

// ------------------------------------------------------------------ strips
// One depth layer, baked into a strip one period long plus overscan, in steps: the
// generator yields between pieces of work so the warm-up can spread them over frames.
function* stripSteps(name, k, out) {
  const L = SCENE[name];
  const cfg = LAYERS[name];
  const P = L.period;
  const M = STRIP_M;
  const r = k * cfg.res;
  const w = P + STRIP_R + 2 * M;
  const h = cfg.bottom - cfg.top;
  const c = canvas(w * r, h * r);
  const g = c.getContext('2d');
  g.setTransform(r, 0, 0, r, M * r, -cfg.top * r);
  const ridge = (u) => L.profile(u, P);
  const foot = (u, halfW) => {
    let y = -Infinity;
    for (let d = -halfW; d <= halfW; d += 2) y = Math.max(y, ridge(u + d));
    return y;
  };
  const S = { g, r, cfg, ridge, foot, P, u0: -M, u1: P + STRIP_R + M, name };

  // Resolve every item, and every copy of it that lands in the strip.
  const items = [];
  L.items.forEach((item, i) => {
    for (const n of [-1, 0, 1]) {
      if (item.kind === 'fence') {
        const x0 = item.u + n * P;
        const x1 = item.u1 + n * P;
        if (x1 < S.u0 - 20 || x0 > S.u1 + 20) continue;
        items.push({ kind: 'fence', i, x0, x1, gate: item.gate == null ? null : item.gate + n * P });
        continue;
      }
      const u = item.u + n * P;
      if (u < S.u0 - 130 || u > S.u1 + 130) continue;
      const s = item.s ?? 1;
      const halfW = { abbey: 50, mausoleum: 22, gnarl: 8, tree: 4, lamp: 3 }[item.kind] ?? 3;
      items.push({ kind: item.kind, i, x: u, y: foot(u, halfW * s), s, variant: item.variant ?? 0, flip: !!item.flip });
    }
  });

  const sprites = new Map();
  const spriteFor = (it) => {
    let spr = sprites.get(it.i);
    if (spr) return spr;
    const pal = cfg;
    if (it.kind === 'abbey') spr = abbeySprite(r, it.s, { body: [36, 44, 82], dark: [32, 39, 74], lit: [112, 126, 168] });
    else if (it.kind === 'grove') spr = groveSprite(r, it.s, it.i, { body: shade(pal.body, -0.12), dark: shade(pal.dark, -0.1), lit: pal.lit });
    else if (it.kind === 'mausoleum') spr = mausoleumSprite(r, it.s, it.variant, { body: [40, 46, 80], dark: [30, 35, 64], lit: [100, 112, 152] });
    else if (it.kind === 'tree') spr = treeSprite(r, it.s, it.variant, { body: shade(pal.body, -0.12), dark: shade(pal.dark, -0.1), lit: pal.lit }, 200 + it.i);
    else if (it.kind === 'stone') spr = stoneSprite(r, it.s, it.variant, it.i);
    else if (it.kind === 'cross') spr = crossSprite(r, it.s, it.i);
    else if (it.kind === 'gnarl') spr = gnarlSprite(r, it.s, it.variant, { body: [21, 16, 36], dark: [12, 9, 24], lit: [72, 76, 122] }, { clearOwlWing: it.i === 0 });
    else if (it.kind === 'grass') spr = grassSprite(r, it.s, it.i, pal);
    else spr = null;
    sprites.set(it.i, spr);
    return spr;
  };
  const sink = { abbey: 2, grove: 1, mausoleum: 1.5, tree: 2, stone: 1.2, cross: 1.2, gnarl: 3, grass: 2.5 };
  const place = (it) => {
    const spr = spriteFor(it);
    if (!spr) return;
    if (!it.flip) { blit(g, spr, it.x, it.y + (sink[it.kind] ?? 1)); return; }
    // A mirrored ruin keeps its moonlit rim on the moon side: the rim is baked into the
    // sprite, so only a building symmetric enough to pass is flipped (the abbey).
    g.save();
    g.translate(it.x, 0);
    g.scale(-1, 1);
    blit(g, spr, 0, it.y + (sink[it.kind] ?? 1));
    g.restore();
  };

  // Buildings stand behind their own ridge line, so the crest overlaps their foot.
  for (const it of items) if (it.kind === 'abbey') place(it);
  yield;
  paintRidge(S);
  if (name === 'mid') crestFlicks(S, Math.round(900 * P / 1280), shade(cfg.body, -0.1), 2.2);
  if (name === 'fg') crestFlicks(S, Math.round(1300 * P / 1800), cfg.body, 3.2);
  yield;
  let batch = 0;
  for (const it of items) {
    if (it.kind === 'abbey' || it.kind === 'lamp') continue;
    if (it.kind === 'fence') fence(S, it);
    else place(it);
    if (++batch % 12 === 0) yield;
  }

  // Mist pooling at the foot of the far layers, over the land and what stands on it.
  if (cfg.mistY) {
    const [ya, yb, a] = cfg.mistY;
    g.globalCompositeOperation = 'source-atop';
    const mg = g.createLinearGradient(0, ya, 0, yb);
    mg.addColorStop(0, css(cfg.mist, 0));
    mg.addColorStop(1, css(cfg.mist, a));
    g.fillStyle = mg;
    g.fillRect(S.u0, ya, w, cfg.bottom - ya);
    g.globalCompositeOperation = 'source-over';
  }
  // The lamps' warm spill on the bank round their feet.
  if (name === 'fg') {
    g.globalCompositeOperation = 'source-atop';
    for (const it of items) {
      if (it.kind !== 'lamp') continue;
      const sp = g.createRadialGradient(it.x, it.y - 6, 1, it.x, it.y - 6, 34);
      sp.addColorStop(0, css(C.warm, 0.32));
      sp.addColorStop(0.5, css(C.warm, 0.1));
      sp.addColorStop(1, css(C.warm, 0));
      g.fillStyle = sp;
      g.fillRect(it.x - 40, it.y - 50, 80, 70);
    }
    g.globalCompositeOperation = 'source-over';
  }
  // What shows below the strip, if a layout lifts the layer clear of the one in front:
  // the colour its foot was painted in.
  const foot0 = cfg.mistY ? mix(cfg.dark, cfg.mist, cfg.mistY[2]) : cfg.dark;
  yield;
  // SLICED INTO TILES. A strip is several thousand px wide at the bake scale, and a
  // canvas wider than the GPU's texture limit is blitted on a slow path every frame
  // (measured: the 11,000 px near bank cost 3.2 ms a frame, the rest of the backdrop
  // 0.1). Each tile carries TILE_LAP px of its right-hand neighbour, so the seam is
  // always covered by an opaque copy of the same paint.
  const tiles = [];
  for (let x = 0; x < c.width; x += TILE_PX) {
    const tw = Math.min(TILE_PX + TILE_LAP, c.width - x);
    const tc = canvas(tw, c.height);
    tc.getContext('2d').drawImage(c, x, 0, tw, c.height, 0, 0, tw, c.height);
    tiles.push({ c: tc, x0: x / r, w: tw / r });
  }
  c.width = 1;
  c.height = 1;
  out[name] = { tiles, r, M, top: cfg.top, h, P, below: css(foot0), factor: L.factor };
}

const TILE_PX = 2048;
const TILE_LAP = 2;

function drawStrip(ctx, S, shift, view, dy) {
  const s = ((shift % S.P) + S.P) % S.P;
  const x0 = Math.max(-STRIP_M, view.left - 8);
  const x1 = Math.min(STRIP_R + STRIP_M - 1, view.right + 8);
  // In strip coordinates.
  const a0 = x0 + s + S.M;
  const a1 = x1 + s + S.M;
  const y = S.top + dy;
  for (const T of S.tiles) {
    const a = Math.max(a0, T.x0);
    const b = Math.min(a1, T.x0 + T.w);
    if (b <= a) continue;
    ctx.drawImage(T.c, (a - T.x0) * S.r, 0, (b - a) * S.r, T.c.height, a - s - S.M, y, b - a, S.h);
  }
  const bottom = y + S.h - 0.5;
  if (view.bottom > bottom) {
    ctx.fillStyle = S.below;
    ctx.fillRect(x0, bottom, x1 - x0, view.bottom - bottom + 1);
  }
}


// ------------------------------------------------------------------ the lamp
// A gas lamp's flicker: a restless waver, and now and then a gutter where the flame
// nearly goes. Shared by the lamp and its pool of light on the lane (gouachePack), so the
// two breathe together.
export function lampFlicker(t, i) {
  let f = 0.8 + 0.2 * Math.sin(t * 11 + i) * Math.sin(t * 7.3 + i * 0.7);
  const tick = Math.floor(t * 7 + i * 13.7);
  const h = Math.sin(tick * 127.1 + i * 31.7) * 43758.5453;
  if (h - Math.floor(h) < 0.07) f *= 0.45;
  return f;
}

function towerWindowFlicker(t, i) {
  const waver = 0.55 + 0.18 * Math.sin(t * 8.7 + i) * Math.sin(t * 3.6 + i * 0.7);
  const tick = Math.floor(t * 8 + i * 11.3);
  const r = hash(tick * 29.7 + i * 17.1);
  return waver * (r < 0.18 ? 0.16 : r < 0.34 ? 0.48 : 1);
}

// `it.lit` (0..1, default 1) is how far the lamp is on: the eclipse's extra lamps stand
// dark until the clouds come over and then flicker up.
function lamp(ctx, it, t) {
  const x = it.x;
  const y = it.y + 1;
  const s = it.s;
  const lit = it.lit ?? 1;
  const flicker = lampFlicker(t, it.i) * lit;
  const hy = y - 40.5 * s;
  // Broad warm wash, then a tighter bloom.
  let gl = ctx.createRadialGradient(x, hy, 1, x, hy, 44 * s);
  gl.addColorStop(0, css(C.warm, 0.26 * flicker));
  gl.addColorStop(0.45, css(C.warm, 0.08 * flicker));
  gl.addColorStop(1, css(C.warm, 0));
  ctx.fillStyle = gl;
  ctx.fillRect(x - 46 * s, hy - 46 * s, 92 * s, 92 * s);

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const iron = [22, 18, 34];
  // Post: tapered, warmed at the top by the lantern.
  const pg = ctx.createLinearGradient(0, -36, 0, 0);
  pg.addColorStop(0, css(mix(iron, C.warm, 0.35)));
  pg.addColorStop(0.3, css(iron));
  pg.addColorStop(1, css(shade(iron, -0.3)));
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.moveTo(-1.9, 0); ctx.lineTo(-1.2, -35); ctx.lineTo(1.2, -35); ctx.lineTo(1.9, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = css(shade(iron, -0.2));
  ctx.beginPath();
  ctx.moveTo(-4, 0.5); ctx.lineTo(-3.4, -3); ctx.lineTo(3.4, -3); ctx.lineTo(4, 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(-2.6, -12, 5.2, 1.4);
  // Ladder bar.
  ctx.fillStyle = css(mix(iron, C.warm, 0.2));
  ctx.fillRect(-5.5, -32.5, 11, 1.2);
  ctx.fillStyle = css(C.ironLit, 0.6);
  ctx.fillRect(0.6, -30, 0.6, 26);
  // Lantern: warm glass, a white-hot heart, dark frame and cap.
  const glass = ctx.createRadialGradient(0, -40.5, 0.5, 0, -40.5, 6);
  glass.addColorStop(0, css(shade(C.flame, 0.3)));
  glass.addColorStop(0.45, css(mix(C.flame, C.warm, 0.5)));
  glass.addColorStop(1, css(shade(C.warm, -0.12)));
  // Dark glass under the flame, so an unlit lantern is a lantern.
  ctx.fillStyle = css([34, 30, 52]);
  ctx.beginPath();
  ctx.moveTo(-4.8, -36); ctx.lineTo(4.8, -36); ctx.lineTo(4, -45); ctx.lineTo(-4, -45);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = glass;
  ctx.globalAlpha = (0.85 + 0.15 * flicker) * lit;
  ctx.beginPath();
  ctx.moveTo(-4.8, -36); ctx.lineTo(4.8, -36); ctx.lineTo(4, -45); ctx.lineTo(-4, -45);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = css(iron);
  ctx.fillRect(-5.6, -36.4, 11.2, 1.5);
  ctx.fillRect(-0.45, -45, 0.9, 9);
  ctx.beginPath();
  ctx.moveTo(-6.4, -44.6); ctx.lineTo(0, -50.5); ctx.lineTo(6.4, -44.6);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -51.2, 1.1, 0, TAU);
  ctx.fill();
  ctx.fillStyle = css(C.warm, 0.7 * lit);
  ctx.fillRect(-5.8, -45, 11.6, 0.7);
  ctx.restore();

  gl = ctx.createRadialGradient(x, hy, 0, x, hy, 12 * s);
  gl.addColorStop(0, css(C.flame, 0.5 * flicker));
  gl.addColorStop(1, css(C.warm, 0));
  ctx.fillStyle = gl;
  ctx.fillRect(x - 12 * s, hy - 12 * s, 24 * s, 24 * s);
}

// ------------------------------------------------------------------ the eclipse
// Peter, 26 Sep 2026: "clouds to move across the moon which causes the lighting in the level
// to dim - it has to be for a section of the entire level.. there should be more lamps /
// lighting in the foreground to make up for it which will cast light on the game lane
// although I do want the overall effect of things getting darker/spookier".
//
// By song position: the cloud train gathers before Ghost Choir (bar 17), but the
// moon starts dimming just after the choir enters. It keeps travelling through the passage.
// Clearing starts with the end of the choir at bar 25; the weather disperses by bar 28.
// Using the heard clock means a checkpoint restore cannot pull the weather backwards
// while the song keeps playing. `progress` remains only a preview clock.
export const CRYPT_WEATHER_TIMING = Object.freeze({
  loopBeats: 192,
  middleEightStartBeat: 64,
  middleEightEndBeat: 96,
  gatherBeat: 61,
  coveredBeat: 69,
  // Preserve the 0.24 / 32 progress-per-beat drift through the 0.08 release.
  clearEndBeat: 96 + 32 / 3,
  retryHoldBeats: 16,
  clearBeats: 16,
});
export const CRYPT_ECLIPSE = Object.freeze({ inFrom: 0.5, inTo: 0.58, outFrom: 0.82, outTo: 0.9 });
const CRYPT_WEATHER_BEATS = Object.freeze([
  [0, 0], [CRYPT_WEATHER_TIMING.gatherBeat, 0.5],
  [CRYPT_WEATHER_TIMING.coveredBeat, 0.58],
  // Rejoin the established drift before the exit, preserving the clearing cue.
  [88, 0.76],
  [CRYPT_WEATHER_TIMING.middleEightEndBeat, CRYPT_ECLIPSE.outFrom],
  [CRYPT_WEATHER_TIMING.clearEndBeat, CRYPT_ECLIPSE.outTo],
  [CRYPT_WEATHER_TIMING.loopBeats, 1],
]);
const clamp01e = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothE = (v) => { const x = clamp01e(v); return x * x * (3 - 2 * x); };
function weatherProgressAtBeat(beat) {
  let i = 1;
  while (i < CRYPT_WEATHER_BEATS.length && beat > CRYPT_WEATHER_BEATS[i][0]) i++;
  const [b0, p0] = CRYPT_WEATHER_BEATS[i - 1];
  const [b1, p1] = CRYPT_WEATHER_BEATS[Math.min(i, CRYPT_WEATHER_BEATS.length - 1)];
  return p0 + (p1 - p0) * ((beat - b0) / (b1 - b0));
}

// { dim 0..1, bank: 1 = off to the right, 0 = over the moon, -1 = gone to the left }
export function cryptNight(progress, songBeat = null, weatherFade = 1, weatherClearBeat = null, weatherHeldProgress = null) {
  const E = CRYPT_ECLIPSE;
  let retryRelease = null;
  let p = Number.isFinite(progress) ? progress : 0;
  const fade = Number.isFinite(weatherFade) ? clamp01e(weatherFade) : 1;
  if (Number.isFinite(songBeat)) {
    // songBeat() follows the heard playhead and wraps at the end of the 48-bar form.
    // Interpolate an animation progress through the authored weather landmarks: the
    // clouds gather before Ghost Choir and disperse as it ends, with the same
    // travel speed on both sides of the middle-eight exit.
    const beat = ((songBeat % CRYPT_WEATHER_TIMING.loopBeats) + CRYPT_WEATHER_TIMING.loopBeats)
      % CRYPT_WEATHER_TIMING.loopBeats;
    p = weatherProgressAtBeat(beat);
    // A death-restart inside the middle eight holds the clouds where they were for four
    // bars, then spends four bars easing them clear. Derive the held position from the
    // start of that retry hold, so an early retry does not wait until the passage ends
    // or snap the cloud train forward.
    if (Number.isFinite(weatherClearBeat)) {
      const start = weatherClearBeat;
      const end = start + CRYPT_WEATHER_TIMING.clearBeats;
      const holdStart = start - CRYPT_WEATHER_TIMING.retryHoldBeats;
      const held = Number.isFinite(weatherHeldProgress) ? weatherHeldProgress : weatherProgressAtBeat(holdStart);
      if (beat >= holdStart) retryRelease = smoothE((beat - start) / CRYPT_WEATHER_TIMING.clearBeats);
      if (beat >= holdStart && beat < start) p = held;
      else if (beat >= start && beat < end) p = held + (CRYPT_ECLIPSE.outTo - held)
        * ((beat - start) / CRYPT_WEATHER_TIMING.clearBeats);
      else if (beat >= end) p = CRYPT_ECLIPSE.outTo + (1 - CRYPT_ECLIPSE.outTo)
        * ((beat - end) / (CRYPT_WEATHER_TIMING.loopBeats - end));
    }
  }
  const come = smoothE((p - E.inFrom) / (E.inTo - E.inFrom));
  const go = retryRelease ?? smoothE((p - E.outFrom) / (E.outTo - E.outFrom));
  return { dim: come * (1 - go) * fade, bank: (1 - come) - go, p, fade, dispersal: 1 - go };
}

// THE BANK IS A TRAIN, not a lid (Peter: "the heavy clouds should not just stop, they
// should keep moving yet keep the moon covered the entire time (occasionally a little bit
// of the moon light can come through)"). A long run of heavy cloud rolls leftward across
// the moon with the music: its front covers the moon shortly after the choir enters (~0.58),
// its tail passes as the night lifts (~0.82–0.9), and it never stops in between. The big
// pieces overlap except at two narrow gaps, where a sliver of moon shows as they pass.
// Train coordinates run from the front (0) back; `x = front + s`.
const TRAIN_SPEED = 4200; // screen px per unit of weather progress
const TRAIN = [
  ...[0, 190, 380, 600, 790, 1010].map((s) => ({ i: 0, s, dy: 0 })),
  ...[[90, 1, 26], [300, 3, -22], [520, 2, 22], [720, 1, 26], [930, 3, -22], [985, 2, 24], [1160, 2, 22]]
    .map(([s, i, dy]) => ({ i, s, dy })),
];
const TRAIN_GAPS = [596, 1004];
// Keep the train's drift steady as it rolls off the LEFT of the screen. The beat map
// carries it continuously through the middle-eight boundary; dispersal removes the tail.
function trainFront(p, moonX) { return moonX + 160 - (p - CRYPT_ECLIPSE.inFrom) * TRAIN_SPEED; }
const TRAIN_LEN = 1300;

// Quiet lightning inside the cloud bank, keyed to film time so seeking and replay
// show the same weather. A short second pulse reads as distant sheet lightning;
// neither pulse lights the ground or triggers audio.
function cloudLightning(t, stageIndex) {
  const period = 11;
  const cycle = Math.floor(t / period);
  if (hash(cycle * 17.3 + stageIndex * 5.7) > 0.72) return 0;
  const at = cycle * period + 1.4 + 4 * hash(cycle * 9.1 + stageIndex * 3.3);
  const pulse = (d) => d < 0 || d > 0.48 ? 0 : d < 0.045 ? d / 0.045 : Math.exp(-(d - 0.045) / 0.13);
  return Math.max(pulse(t - at), 0.42 * pulse(t - at - 0.19));
}

// Where the extra lamps stand on the near bank (layer u, period 3600): with the three
// shipped ones, never more than 470 px apart, so every screen has a light; clear of the
// trees, and the one by the far gate stands in front of its railing.
const EXTRA_LAMPS = [480, 900, 1650, 2120, 2950, 3380];

// The bank: long heavy clouds with a silver lining where the moon behind catches them.
function buildBank(r, w, h, seed) {
  const R0 = rng(seed);
  const shape = (g) => {
    ribbon(g, w * 0.02, w * 0.98, h * 0.6, h * 0.66, 0.5, h * 0.1, seed);
    ribbon(g, w * 0.1, w * 0.84, h * 0.38, h * 0.48, 0.45, h * 0.08, seed + 2);
    ribbon(g, -w * 0.04, w * 0.46, h * 0.82, h * 0.3, 0.6, 0, seed + 4);
    ribbon(g, w * 0.5, w * 1.06, h * 0.8, h * 0.26, 0.35, 0, seed + 6);
    for (let b = 0; b < 4; b++) {
      const bx = w * (0.18 + b * 0.2 + (R0() - 0.5) * 0.06);
      const br = h * (0.24 + R0() * 0.14);
      fillPoly(g, arcPts(bx, h * 0.4, br * 2.2, br, 0, TAU, 28), 0.5, bx + seed);
    }
  };
  return massSprite(r, [-w * 0.1, -8, w * 1.22, h + 16], shape, {
    body: [26, 31, 64], dark: [15, 19, 44], lit: [168, 176, 214], rim: 1.6, rimA: 0.85,
    dabs: 0.22, dab: 3.2, dabAng: 0, seed: 70 + seed, g0: 0.3,
  }, (g, R) => {
    for (let i = 0; i < 20; i++) {
      g.fillStyle = css(R() < 0.4 ? [70, 78, 120] : [12, 15, 36], 0.14 + R() * 0.14);
      dab(g, R() * w, h * (0.3 + R() * 0.5), 6 + R() * 18, 0.5 + R() * 0.6, (R() - 0.5) * 0.06);
    }
  });
}

// The lighting should react to the painted cloud mass crossing the moon, rather than to
// the weather cue becoming visible somewhere else in the sky. Cache each small cloud
// alpha mask once, then sample the moon disc against the same sprites the renderer blits.
function bankCoverageMask(spr) {
  if (spr.coverageMask !== undefined) return spr.coverageMask;
  try {
    const image = spr.c.getContext('2d').getImageData(0, 0, spr.c.width, spr.c.height);
    const alpha = new Uint8Array(spr.c.width * spr.c.height);
    for (let i = 0, a = 3; i < alpha.length; i++, a += 4) alpha[i] = image.data[a];
    spr.coverageMask = {
      alpha,
      width: spr.c.width,
      height: spr.c.height,
      sx: spr.c.width / spr.w,
      sy: spr.c.height / spr.h,
    };
  } catch {
    // Generated canvases are same-origin, but keep a bounds fallback for unusual canvas
    // implementations that do not expose pixel reads.
    spr.coverageMask = null;
  }
  return spr.coverageMask;
}

function moonCloudCover(B, pieces, moonX, moonY) {
  const radius = MOON_DISC * 0.96;
  const candidates = pieces.flatMap((piece) => {
    const spr = B.bank[piece.i];
    const x = piece.x + spr.x;
    const y = piece.y + spr.y;
    const right = x + spr.w;
    const bottom = y + spr.h;
    if (right < moonX - radius || x > moonX + radius
      || bottom < moonY - radius || y > moonY + radius) return [];
    return [{ spr, x, y, right, bottom, mask: bankCoverageMask(spr) }];
  });
  if (!candidates.length) return 0;

  // A small disc grid turns the silhouette moving across the moon into a gentle dimmer
  // curve, while still letting the narrow gaps in the cloud train reveal some moonlight.
  let covered = 0;
  let samples = 0;
  const divisions = 10;
  for (let gy = -divisions; gy <= divisions; gy++) {
    const ny = gy / divisions;
    for (let gx = -divisions; gx <= divisions; gx++) {
      const nx = gx / divisions;
      if (nx * nx + ny * ny > 1) continue;
      samples++;
      const worldX = moonX + nx * radius;
      const worldY = moonY + ny * radius;
      let alpha = 0;
      for (const item of candidates) {
        if (worldX < item.x || worldX >= item.right || worldY < item.y || worldY >= item.bottom) continue;
        if (item.mask) {
          const px = Math.floor((worldX - item.x) * item.mask.sx);
          const py = Math.floor((worldY - item.y) * item.mask.sy);
          const a = item.mask.alpha[py * item.mask.width + px] / 255;
          alpha = 1 - (1 - alpha) * (1 - a);
        } else {
          alpha = 1;
        }
      }
      covered += alpha;
    }
  }
  return samples ? covered / samples : 0;
}

const BANK = [
  { w: 250, h: 70, seed: 11, dx: 0, dy: 0 },
  { w: 170, h: 40, seed: 23, dx: 190, dy: 26 },
  { w: 140, h: 32, seed: 37, dx: -130, dy: 22 },
  { w: 120, h: 26, seed: 41, dx: 60, dy: -22 },
];

// ------------------------------------------------------------------ the bake
// One bake, kept for the session (see BAKE_MAX), sky and moon included: nothing in it
// depends on the layout, so a rotation costs nothing.
let BAKE = null;

function bakeScaleFor(k) {
  return Math.min(BAKE_MAX, Math.max(1, Math.ceil(k * 2 - 0.01) / 2));
}

// The scale a frame is likely to want, before there is a frame: the renderer's density,
// times portrait's backdrop magnification.
export function cryptGouacheBakeScale() {
  const px = Number(screen?.px) || 1;
  return bakeScaleFor(px * (isPhonePortraitPresentation() ? 1.78 : 1));
}

function* bakeSteps(k, B) {
  // The sky and the moon's glow are soft paint: half scale costs them nothing to the eye
  // and saves three quarters of their memory (see TEXTURE BUDGET below).
  B.sky = buildSkySheet(k * 0.5);
  yield;
  B.moonGlow = buildMoon(k * 0.5, 'glow');
  B.moonDisc = buildMoon(k, 'disc');
  yield;
  B.star = buildStar(k);
  B.paper = buildPaper(k);
  B.wisps = [0, 1, 2].map((v) => buildFogWisp(k, v));
  yield;
  B.clouds = SCENE.clouds.items.map((_, i) => buildCloud(k * 0.55, i));
  B.openingClouds = OPENING_CLOUDS.map((_, i) => buildOpeningCloud(k * 0.55, i));
  B.bank = BANK.map((b) => buildBank(k * 0.55, b.w, b.h, b.seed));
  B.bank.forEach(bankCoverageMask);
  yield;
  for (const name of ['bg', 'mid', 'fg']) yield* stripSteps(name, k, B);
  B.done = true;
}

function ensureBake(k) {
  if (!BAKE) BAKE = { k, steps: null, done: false };
  if (!BAKE.done) {
    if (!BAKE.steps) BAKE.steps = bakeSteps(BAKE.k, BAKE);
    while (!BAKE.steps.next().done) { /* finish it now */ }
  }
  return BAKE;
}

// Finish the bake now, whatever is left of it: RunState.enter calls this before the song
// starts, so a bake the briefing did not get through lands ahead of the first note rather
// than on the backdrop's first frame (about 0.6 s from cold at 2.5x).
export function finishCryptGouacheBake() {
  ensureBake(BAKE ? BAKE.k : cryptGouacheBakeScale());
}

// Warm-up jobs for game/art-warmup.js: each call does one step of the bake. Enough
// closures to cover every step; any left over when it is done return at once.
export function cryptGouacheWarmJobs() {
  const jobs = [];
  for (let i = 0; i < 64; i++) {
    jobs.push(() => {
      if (!BAKE) BAKE = { k: cryptGouacheBakeScale(), steps: null, done: false };
      if (BAKE.done) return;
      if (!BAKE.steps) BAKE.steps = bakeSteps(BAKE.k, BAKE);
      BAKE.steps.next();
    });
  }
  return jobs;
}

function scaleOf(ctx) {
  const m = typeof ctx.getTransform === 'function' ? ctx.getTransform() : null;
  return m && Number.isFinite(m.a) ? Math.hypot(m.a, m.b) : 1;
}

// Studies whose painter threw; see the study loop in drawCryptGouache.
const FAILED = new Set();

// ------------------------------------------------------------------ the frame
// `view` (from gouachePack in stylePacks/index.js):
//   left/right/top/bottom — the painted coverage and band, in this pass's local units
//   y.{sky,stars,clouds,bats,bg,mid,fg} — each layer's vertical offset (px, + is down)
//   skyOff — how far the sky's colour stops move with the land
//   moon {x,y}, cloudY[i], batY[i] — sky furniture, where the layout wants it
export function drawCryptGouache(ctx, t, camX, stageIndex, view) {
  const B = ensureBake(BAKE ? BAKE.k : bakeScaleFor(scaleOf(ctx)));
  const open = STAGE_OPEN[Math.max(0, Math.min(STAGE_OPEN.length - 1, (stageIndex || 1) - 1))];
  const shiftOf = (L) => camX * L.factor * ZOOM + open * L.period;

  // Sky: flat top colour behind everything, the painted sheet where the land puts it,
  // then the moon where the layout hangs it.
  ctx.fillStyle = css(C.skyTop);
  ctx.fillRect(view.left - 40, view.top - 40, view.right - view.left + 80, view.bottom - view.top + 80);
  ctx.drawImage(B.sky, SKY_SHEET.x, SKY_SHEET.y + view.skyOff + view.y.sky, SKY_SHEET.w, SKY_SHEET.h);
  const night = view.night || { dim: 0, bank: 1, p: 0 };
  // The train is drawn wherever it is on screen — through its entry, the whole dark,
  // and its exit off the left — not only while the night flag is up.
  const front = trainFront(night.p || 0, view.moon.x);
  const weatherFade = Number.isFinite(night.fade) ? clamp01e(night.fade) : 1;
  // Section dispersal is independent of the pause/death lifecycle fade.
  const bankFade = weatherFade * (night.dispersal ?? 1);
  const weatherTime = (night.p || 0) * 120;
  const covered = (night.p || 0) >= CRYPT_ECLIPSE.inFrom
    && front < view.right + 60 && front + TRAIN_LEN > view.left - 60;
  const my = view.moon.y + view.y.sky;
  const bankPieces = [];
  const addBankPiece = (i, x, y) => {
    if (x > view.right + 40 || x + 320 < view.left - 40) return;
    bankPieces.push({ i, x, y });
  };
  if (weatherFade > 0.005 && (night.p || 0) >= CRYPT_ECLIPSE.inFrom) {
    const rows = [
      { y: my - 88, spacing: 185, lag: 0, len: 1160, pieces: [0] },
      { y: my + 18, spacing: 185, lag: 0.012, len: 1160, pieces: [2, 0, 3, 1, 0] },
      { y: my - 150, spacing: 230, lag: 0, len: 1160, pieces: [1, 0, 2, 0] },
    ];
    rows.forEach((row, r) => {
      // Anchor every row to the moon, so portrait and landscape share the cue.
      const rowFront = front + row.lag * TRAIN_SPEED + 4 * Math.sin(weatherTime * 0.2 + r);
      for (let k = 0, sx = 0; sx < row.len; k++, sx += row.spacing) {
        const x = rowFront + sx;
        addBankPiece(row.pieces[k % row.pieces.length], x,
          row.y + 6 * Math.sin(k * 1.7 + r) + 1.5 * Math.sin(weatherTime * 0.3 + k));
      }
    });
  }
  if (covered && weatherFade > 0.005) {
    const by = my - 36 + 1.5 * Math.sin(weatherTime * 0.37);
    for (const piece of TRAIN) {
      const x = front + piece.s + 3 * Math.sin(weatherTime * 0.21 + piece.s);
      addBankPiece(piece.i, x, by + piece.dy);
    }
  }
  const moonCover = weatherFade > 0.005
    ? moonCloudCover(B, bankPieces, view.moon.x, my)
    : 0;
  // A gap passing the moon lets a little light back into the night.
  let relief = 0;
  if (covered) {
    for (const g of TRAIN_GAPS) relief = Math.max(relief, 1 - Math.abs(front + g + 5 - view.moon.x) / 34);
  }
  const dim = night.dim * moonCover * (1 - 0.16 * relief);
  // THE MOON BREATHES (Peter: "when the moon is visible can it be animated somehow... a
  // glow, something so it doesn't look so static"): its glow swells and settles on a
  // slow, uneven breath, a wider halo pulses a beat behind it, and the disc itself
  // brightens a touch at the top of each breath.
  const breath = 0.5 + 0.5 * Math.sin(t * 0.8) * (0.8 + 0.2 * Math.sin(t * 0.31));
  const halo = 0.5 + 0.5 * Math.sin(t * 0.8 - 1.1);
  const seen = 1 - dim;
  ctx.globalAlpha = (1 - 0.6 * dim) * (0.86 + 0.14 * breath);
  ctx.drawImage(B.moonGlow, view.moon.x - MOON_REACH, my - MOON_REACH, MOON_REACH * 2, MOON_REACH * 2);
  if (seen > 0.02) {
    const g = 1.05 + 0.08 * halo;
    const r = MOON_REACH * g;
    ctx.globalAlpha = 0.22 * halo * seen;
    ctx.drawImage(B.moonGlow, view.moon.x - r, my - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;
  ctx.drawImage(B.moonDisc, view.moon.x - MOON_DISC, my - MOON_DISC, MOON_DISC * 2, MOON_DISC * 2);
  if (seen > 0.02) {
    ctx.globalAlpha = 0.18 * breath * seen;
    ctx.drawImage(B.moonDisc, view.moon.x - MOON_DISC, my - MOON_DISC, MOON_DISC * 2, MOON_DISC * 2);
    ctx.globalAlpha = 1;
  }

  // Stars, fixed to the sky.
  for (const s of STARS) {
    const x = s.x;
    const y = s.y + view.y.stars;
    if (x < view.left - 4 || x > view.right + 4 || y < view.top - 4 || y > view.bottom) continue;
    const tw = 0.65 + 0.35 * Math.sin(t * 1.7 + s.phase);
    const d = 1.2 + s.s * 1.9;
    ctx.globalAlpha = 0.35 + 0.65 * tw;
    ctx.drawImage(B.star, x - d / 2, y - d / 2, d, d);
    if (s.s > 1.5) {
      ctx.globalAlpha = 0.28 * tw;
      ctx.fillStyle = '#fff6dc';
      ctx.fillRect(x - 2.6, y - 0.2, 5.2, 0.4);
      ctx.fillRect(x - 0.2, y - 2.6, 0.4, 5.2);
    }
  }
  ctx.globalAlpha = 1;

  const { clouds, bats, fog } = SCENE;
  const cloudShift = camX * clouds.factor * ZOOM + t * clouds.drift;
  clouds.items.forEach((c, i) => {
    for (const x of instances(c.u, cloudShift, clouds.period, view.left, view.right, c.w)) {
      blit(ctx, B.clouds[i], x, view.cloudY[i] + view.y.clouds);
    }
  });
  // Crypt-1 starts with a couple of raised cloud strokes across the moon. They slide clear
  // and fade over the first 5.5% of the run; this is purely painted scenery and
  // deliberately does not feed the later eclipse's `dim` or lamp lighting.
  const openingProgress = Number.isFinite(view.progress) ? clamp01e(view.progress) : 0;
  const openingCloudFade = stageIndex === 1 ? 1 - smoothE(openingProgress / 0.055) : 0;
  if (openingCloudFade > 0.005) {
    const drift = (openingProgress / 0.055) * 90;
    const alpha = ctx.globalAlpha;
    ctx.globalAlpha = alpha * openingCloudFade;
    OPENING_CLOUDS.forEach((cloud, i) => {
      blit(ctx, B.openingClouds[i], view.moon.x + cloud.x - drift, my + cloud.y);
    });
    ctx.globalAlpha = alpha;
  }
  const batShift = camX * bats.factor * ZOOM + t * bats.drift;
  bats.items.forEach((b, i) => {
    for (const x of instances(b.u, batShift, bats.period, view.left, view.right, 20)) {
      drawBat(ctx, {
        x, y: view.batY[i] + view.y.bats + 5 * Math.sin(t * 1.9 + i * 2.1), s: b.s,
        flap: ((t * 5.5 + i * 0.37) % 1 + 1) % 1,
      });
    }
  });

  // Paint the clouds in the same order and at the same positions used to sample moon
  // coverage above.
  const bankNearMoon = [];
  const bankPiece = (i, x, y) => {
    const alpha = ctx.globalAlpha;
    ctx.globalAlpha = alpha * bankFade;
    blit(ctx, B.bank[i], x, y);
    ctx.globalAlpha = alpha;
    if (Math.abs(x + BANK[i].w * 0.5 - view.moon.x) < 175) bankNearMoon.push({ i, x, y });
  };
  // The eclipse's cloud train, rolling across the moon.
  // Reuse the exact positions above so lighting samples what is actually painted.
  for (const piece of bankPieces) bankPiece(piece.i, piece.x, piece.y);
  // Relight only painted cloud masses nearest the moon, while they are still
  // behind the witch and the country. The later night wash softens the pulse.
  const sheet = covered && dim > 0.2 ? cloudLightning(t, stageIndex || 1) : 0;
  if (sheet > 0.015) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const piece of bankNearMoon) {
      ctx.globalAlpha = 0.9 * sheet * bankFade
        * (1 - Math.min(1, Math.abs(piece.x + BANK[piece.i].w * 0.5 - view.moon.x) / 220));
      blit(ctx, B.bank[piece.i], piece.x, piece.y);
    }
    ctx.restore();
  }
  // Sky visitors the pack schedules (the witch), in front of the weather.
  if (view.witches && view.witchPaint) {
    for (const w of view.witches) view.witchPaint(ctx, t, w.x, w.y + view.y.sky, w);
  }

  // STUDIES: scenery being tried out in the lab (src/dev/crypt-ideas), painted INSIDE the
  // backdrop on a depth layer — behind its crest, or standing on it in front of what the
  // layer already holds — so an idea moves at its layer's rate and is covered by whatever
  // is in front of it, exactly as a shipped item would be. The run never sets one.
  const studies = (view.study ? [].concat(view.study) : []).filter((S) => !FAILED.has(S.id));
  const study = (layer, when, shift) => {
    for (const S of studies) {
      if (S.layer !== layer || (S.when || 'on') !== when) continue;
      const L = SCENE[layer];
      const dy = view.y[layer];
      const ridgeY = (x) => L.profile(x + shift, L.period) + dy;
      for (const x of instances(S.u, shift, L.period, view.left, view.right, S.reach ?? 140)) {
        ctx.save();
        // Scenery must never be able to stop the run: a painter that throws is dropped
        // for the session, once, with a note, and the backdrop carries on without it.
        try {
          S.paint(ctx, { x, y: ridgeY(x), t, camX, ridgeY, view, stageIndex, shift });
        } catch (e) {
          if (!FAILED.has(S.id)) {
            FAILED.add(S.id);
            if (typeof console !== 'undefined') console.warn(`crypt scenery "${S.id}" failed and is off:`, e);
          }
        }
        ctx.restore();
      }
    }
  };

  const bgShift = shiftOf(SCENE.bg);
  const midShift = shiftOf(SCENE.mid);
  study('bg', 'behind', bgShift);
  drawStrip(ctx, B.bg, bgShift, view, view.y.bg);
  // A LIGHT IN THE TOWER (Peter: "perhaps the window in the tower has a flickering light
  // on also"): each ruin's small window burns with a guttering warm light, placed the way
  // the bake seats the ruin (the deepest crest under its footprint, sunk 2).
  {
    const L = SCENE.bg;
    L.items.forEach((it, i) => {
      if (it.kind !== 'abbey') return;
      const s = it.s ?? 1;
      for (const x of instances(it.u, bgShift, L.period, view.left, view.right, 80)) {
        let foot = -Infinity;
        for (let d = -50 * s; d <= 50 * s; d += 2) foot = Math.max(foot, L.profile(x + bgShift + d, L.period));
        const wx = x + (it.flip ? -10 : 10) * s;
        const wy = foot + 2 + view.y.bg - 43.5 * s;
        const f = towerWindowFlicker(t, 90 + i);
        const gl = ctx.createRadialGradient(wx, wy, 0.5, wx, wy, 9 * s);
        gl.addColorStop(0, css(C.warm, 0.18 * f));
        gl.addColorStop(1, css(C.warm, 0));
        ctx.fillStyle = gl;
        ctx.fillRect(wx - 9 * s, wy - 9 * s, 18 * s, 18 * s);
        // A small, vertically stretched pool of light sits within the baked dark
        // opening. Let its edge dissolve into the stone instead of tracing the
        // window polygon as a crisp amber cutout.
        const by = foot + 2 + view.y.bg - 38.8 * s;
        ctx.save();
        ctx.translate(wx, by - 4.3 * s);
        ctx.scale(1, 1.65);
        const pane = ctx.createRadialGradient(0, 0, 0.25 * s, 0, 0, 3.5 * s);
        pane.addColorStop(0, css(mix(C.warm, C.flame, 0.3), 0.58 * f));
        pane.addColorStop(0.42, css(C.warm, 0.42 * f));
        pane.addColorStop(0.76, css(C.warm, 0.12 * f));
        pane.addColorStop(1, css(C.warm, 0));
        ctx.fillStyle = pane;
        ctx.fillRect(-3.5 * s, -3.5 * s, 7 * s, 7 * s);
        ctx.restore();
      }
    });
  }
  study('bg', 'on', bgShift);
  study('mid', 'behind', midShift);
  drawStrip(ctx, B.mid, midShift, view, view.y.mid);
  study('mid', 'on', midShift);
  const band = (b) => {
    const F = fog.bands[b];
    const shift = camX * F.factor * ZOOM + t * F.drift;
    const dy = view.y[F.layer];
    const puffs = [];
    fog.puffs.forEach((u, i) => {
      // The largest soft puff reaches about 75 px past its anchor. Cull only
      // after its entire edge has travelled offscreen, or it visibly pops.
      for (const x of instances(u + b * 47, shift, fog.period, view.left, view.right, 90)) {
        puffs.push({ i, x, y: F.y + dy + F.h * 0.5 + ((i * 7) % 5 - 2), rx: 34 + (i * 13) % 22, ry: F.h * 0.55 });
      }
    });
    fogBand(ctx, { y: F.y + dy, h: F.h, puffs }, b, B.wisps, view);
  };
  band(0);
  const fgShift = shiftOf(SCENE.fg);
  study('fg', 'behind', fgShift);
  drawStrip(ctx, B.fg, fgShift, view, view.y.fg);
  gateLeaves(ctx, t, fgShift, view);
  study('fg', 'on', fgShift);
  band(1);

  // The eclipse's dark, over the whole country but under the lamps.
  if (dim > 0) {
    ctx.fillStyle = `rgba(6,6,20,${(0.68 * dim).toFixed(3)})`;
    ctx.fillRect(view.left - 40, view.top - 40, view.right - view.left + 80, view.bottom - view.top + 80);
  }
  // Pale mist starts to gather before the cloud bank arrives. Ease it in over
  // the approach and disperse it with the bank as the choir ends; a weather cue
  // must not create or remove a visible puff in one frame.
  const progress = night.p || 0;
  const mistStrength = smoothE((progress - 0.25) / 0.21)
    * (night.dispersal ?? 1) * weatherFade;
  if (mistStrength > 0) {
    const mist = [
      { y: 206 + view.y.mid, alpha: 0.32, speed: 9, gap: 95, rx: 60, ry: 12 },
      { y: 222 + view.y.fg, alpha: 0.46, speed: 15, gap: 80, rx: 54, ry: 11 },
    ];
    // Each wisp keeps its own identity (image, size, breathing) by its absolute place in
    // the drift, not by its slot on screen: numbered by slot, every wisp swapped image and
    // fade each time the pattern wrapped, and they visibly popped (Peter, 26 Sep).
    mist.forEach((m, b) => {
      const base = t * m.speed + camX * 0.3 * (b + 1) + b * 41;
      const k0 = Math.floor((view.left - 120 + base) / m.gap);
      for (let k = k0; k * m.gap - base < view.right + 120; k++) {
        const x = k * m.gap - base;
        const id = ((k % 21) + 21) % 21;
        const w = B.wisps[(id + b) % B.wisps.length];
        ctx.globalAlpha = m.alpha * mistStrength * (0.75 + 0.25 * Math.sin(t * 0.5 + id * 1.3 + b));
        const rx = m.rx * (0.85 + 0.3 * ((id * 37) % 7) / 7);
        ctx.drawImage(w, x - rx, m.y - m.ry * 2, rx * 2, m.ry * 3.4);
      }
    });
    ctx.globalAlpha = 1;
  }
  // The lamps, lit live so they flicker, and the eclipse's extra ones, which come on one
  // after another as it darkens. Their screen places go back to the pack for the lane.
  const FG = SCENE.fg;
  const lamps = [];
  const lampAt = (u, s, i, lit) => {
    for (const x of instances(u, fgShift, FG.period, view.left, view.right, 60)) {
      let y = -Infinity;
      for (let d = -3; d <= 3; d += 2) y = Math.max(y, FG.profile(x + fgShift + d, FG.period));
      lamp(ctx, { x, y: y + view.y.fg, s, i, lit }, t);
      lamps.push({ x, y: y + view.y.fg, lit: lit * lampFlicker(t, i) });
    }
  };
  FG.items.forEach((it, i) => { if (it.kind === 'lamp') lampAt(it.u, it.s ?? 1, i, 1); });
  EXTRA_LAMPS.forEach((u, j) => {
    const on = clamp01e(dim * 2.2 - 0.2 - j * 0.12);
    if (on <= 0 && dim <= 0) { lampAt(u, 1, 40 + j, 0); return; }
    // Coming up: a stutter before it holds.
    const stutter = on < 1 ? (Math.sin(t * 31 + j * 7) > 0.2 ? 1 : 0.25) : 1;
    lampAt(u, 1, 40 + j, on * stutter);
  });

  // Paper tooth over the whole painting. The pattern is made once per context.
  if (B.paper && B.paper.width > 1 && typeof ctx.createPattern === 'function') {
    const pk = B.paper.width / 128;
    if (!B.paperPat || B.paperPatCtx !== ctx) {
      B.paperPat = ctx.createPattern(B.paper, 'repeat');
      B.paperPatCtx = ctx;
    }
    const pat = B.paperPat;
    if (pat) {
      ctx.save();
      ctx.scale(1 / pk, 1 / pk);
      ctx.fillStyle = pat;
      ctx.fillRect((view.left - 40) * pk, (view.top - 40) * pk, (view.right - view.left + 80) * pk, (view.bottom - view.top + 80) * pk);
      ctx.restore();
    }
  }
  return { lamps, dim };
}

// The painting kit, for scenery that has to belong to this backdrop: the lab's ideas
// (src/dev/crypt-ideas) today, and whatever of them ships tomorrow. One hand, one kit.
export const GOUACHE_KIT = Object.freeze({
  massSprite, limb, dab, fillPoly, arcPts, wobbled, polyPath, curve, rectPts,
  ribbon, deadTreeLimbs, blit, canvas, css, mix, shade, rng, hash, vnoise, drawBat,
  C, STONE, LAYERS, SCENE,
});

// For tests: the country's layers and the bake's state.
export const __cryptGouacheTesting = {
  SCENE, STAGE_OPEN, STRIP_M, STRIP_R,
  get baked() { return !!BAKE?.done; },
  reset() { BAKE = null; },
};
