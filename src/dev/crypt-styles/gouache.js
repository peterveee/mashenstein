// CRYPT style bake-off — GOUACHE / PAINTED. A storybook night in opaque gouache: no
// outlines anywhere. Every shape is an opaque painted mass with a slightly hand-cut
// edge; the sky is laid in with dry-brush streaks that curve round the moon, the hills
// are dabbed, every edge that faces the moon (upper right) carries a broken, scumbled
// rim of lighter paint, the fog is layered washes, and a paper tooth sits over it all.
// Aerial perspective: the far ridge is paler, bluer and softer (it is baked at a lower
// resolution, so its edges melt), the near bank dark and rich. The gas lamp is the one
// warm note.
//
// Everything that does not animate is baked once per device scale: the sky (gradient,
// strokes, moon) into one canvas, and each depth layer — its ridge plus every item on
// it — into a strip one period long (plus a screen of overscan) in the layer's own u
// space, so a frame is a handful of blits. The strips place items exactly as
// cryptFrame() resolves them (x = u - shift, y = the deepest crest under the
// footprint), and every noise in them is periodic in the layer's period so the wrap is
// seamless. What moves per frame — stars, clouds, bats, the lamp, the fog — is drawn
// from the frame itself.
import { CRYPT_PLAN, FRAME_W } from './plan.js';

const TAU = Math.PI * 2;
const SKY_BOX = { x: -40, y: -80, w: 560, h: 430 };
const STRIP_M = 90; // u overscan either side of a strip

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

function canvas(w, h) {
  w = Math.max(1, Math.ceil(w));
  h = Math.max(1, Math.ceil(h));
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
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

// A pointed (lancet) arch, base at (x, y), as a polygon.
function lancetPts(x, y, w, h) {
  const hw = w / 2;
  const out = [x - hw, y, x - hw, y - h + w * 0.6];
  for (let i = 1; i <= 6; i++) {
    const t = i / 6;
    out.push(x - hw + hw * Math.sin(t * Math.PI / 2), y - h + w * 0.6 - (w * 0.9) * (1 - Math.cos(t * Math.PI / 2)));
  }
  for (let i = 5; i >= 0; i--) {
    const t = i / 6;
    out.push(x + hw - hw * Math.sin(t * Math.PI / 2), y - h + w * 0.6 - (w * 0.9) * (1 - Math.cos(t * Math.PI / 2)));
  }
  out.push(x + hw, y);
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

function buildSky(k) {
  const { x, y, w, h } = SKY_BOX;
  const c = canvas(w * k, h * k);
  const g = c.getContext('2d');
  g.setTransform(k, 0, 0, k, -x * k, -y * k);
  const gr = g.createLinearGradient(0, SKY_STOPS[0][0], 0, SKY_STOPS[SKY_STOPS.length - 1][0]);
  const span = SKY_STOPS[SKY_STOPS.length - 1][0] - SKY_STOPS[0][0];
  for (const [yy, col] of SKY_STOPS) gr.addColorStop((yy - SKY_STOPS[0][0]) / span, css(col));
  g.fillStyle = gr;
  g.fillRect(x, y, w, h);

  const m = CRYPT_PLAN.moon;
  // The moon's light on the sky: a broad cool wash.
  const glow = g.createRadialGradient(m.x, m.y, m.r * 0.8, m.x, m.y, 230);
  glow.addColorStop(0, css(C.glow, 0.5));
  glow.addColorStop(0.18, css(C.glow, 0.26));
  glow.addColorStop(0.5, css(C.glow, 0.08));
  glow.addColorStop(1, css(C.glow, 0));
  g.fillStyle = glow;
  g.fillRect(x, y, w, h);

  const R = rng(4242);
  // Long, gently sagging horizontal strokes across the sky.
  for (let i = 0; i < 95; i++) {
    const yy = -6 + Math.pow(R(), 0.9) * 236;
    const xx = -70 + R() * 560;
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
  // Strokes curving round the moon: the glow painted in rings.
  for (let i = 0; i < 34; i++) {
    const rad = m.r + 6 + Math.pow(R(), 1.3) * 110;
    // Close in, strokes go all the way round; further out only above and below the
    // moon, where the arc lies near-horizontal and sweeps into the sky's own strokes.
    const a0 = rad < m.r + 30 ? R() * TAU : (R() < 0.5 ? -1 : 1) * Math.PI / 2 + (R() - 0.5) * 1.1 - 0.3;
    const sweep = (0.3 + R() * 0.5) * (60 / (rad + 20));
    const fall = 1 - (rad - m.r) / 120;
    const col = mix(skyAt(m.y + Math.sin(a0) * rad), C.glow, 0.25 + 0.45 * fall);
    const th = 4 + R() * 8;
    bristleStroke(g, R, (t) => {
      const a = a0 + t * sweep;
      return [m.x + Math.cos(a) * rad, m.y + Math.sin(a) * rad, Math.cos(a), Math.sin(a)];
    }, rad * sweep, th, col, (0.06 + 0.16 * fall) * (0.6 + R() * 0.4));
  }

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
  return c;
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
  const it = CRYPT_PLAN.clouds.items[ci];
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

function fogBand(ctx, band, b, wisps) {
  const y0 = band.y - band.h * 0.9;
  const y1 = band.y + band.h * 1.5;
  const gr = ctx.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, css(C.fog, 0));
  gr.addColorStop(0.5, css(C.fog, 0.04));
  gr.addColorStop(0.8, css(C.fog, 0.08));
  gr.addColorStop(1, css(C.fog, 0.05));
  ctx.fillStyle = gr;
  ctx.fillRect(-40, y0, 560, y1 - y0);
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
  const img = sg.createImageData(T, T);
  const R = rng(99);
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
    // Windows open onto the sky behind.
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = '#000';
    for (const x of [-42, -27, -12]) fillPoly(g, S(lancetPts(x, -6, 7, 19)), 0.25 * s, x);
    fillPoly(g, S(lancetPts(10, -38, 4.6, 10)), 0.15, 8);
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
    // The doorway: deep dark, a little lighter at the sill.
    const dg = g.createLinearGradient(0, -24 * s, 0, -8 * s);
    dg.addColorStop(0, css([10, 12, 28]));
    dg.addColorStop(1, css([22, 26, 50]));
    g.fillStyle = dg;
    fillPoly(g, S(lancetPts(0, -8, 11, 16)), 0.25, 12);
    g.fillStyle = css(lit, 0.35);
    fillPoly(g, S([-5.5, -8, -5.5, -17, -4.6, -18.5, -4.6, -8]), 0.1, 13);
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

function gnarlSprite(r, s, variant, pal) {
  const flip = variant === 1 ? -1 : 1;
  const P = (x, y) => [x * s * flip, y * s];
  const shape = (g) => {
    limb(g, [P(0, 3), P(-5, -14), P(-4, -30), P(3, -46), P(4, -60), P(-1, -74), P(0, -86)], 17 * s, 5 * s, 1);
    limb(g, [P(2, -50), P(14, -60), P(24, -66), P(44, -64), P(58, -74)], 8 * s, 1.2 * s, 2);
    limb(g, [P(44, -64), P(50, -58), P(55, -56), P(63, -59)], 2.8 * s, 0.5 * s, 3);
    limb(g, [P(30, -66), P(33, -75), P(36, -82), P(48, -92)], 3.6 * s, 0.6 * s, 4);
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
    g.fillStyle = iron;
    for (const px of [gx - gateHalf, gx + gateHalf]) {
      g.fillRect(px - 1.5, b - 32, 3, 33.5);
      dab(g, px, b - 34.2, 2.5, 2.5, 0);
      g.fillRect(px - 2.2, b - 32.4, 4.4, 1.4);
    }
    g.strokeStyle = iron;
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(gx - gateHalf, b - 26);
    g.quadraticCurveTo(gx, b - 41, gx + gateHalf, b - 26);
    g.moveTo(gx - gateHalf, b - 12);
    g.lineTo(gx + gateHalf, b - 12);
    g.moveTo(gx - gateHalf, b - 4);
    g.lineTo(gx + gateHalf, b - 4);
    g.stroke();
    g.lineWidth = 1.2;
    g.beginPath();
    for (let x = gx - gateHalf + 5; x < gx + gateHalf - 2; x += 5) {
      g.moveTo(x, b + 1);
      g.lineTo(x, b - 26 - 6.5 * Math.cos((x - gx) / gateHalf * 1.4));
    }
    g.stroke();
    // A scroll either side of the centre, and the moon on the right-hand post.
    g.lineWidth = 0.9;
    for (const d of [-1, 1]) {
      g.beginPath();
      g.arc(gx + d * 5, b - 19, 2.6, 0, TAU);
      g.stroke();
    }
    g.fillStyle = lit;
    g.fillRect(gx + gateHalf + 0.6, b - 31, 0.8, 31);
    dab(g, gx + gateHalf + 1, b - 35, 0.8, 1.2, 0.5);
    dab(g, gx - gateHalf + 1, b - 35, 0.8, 1.2, 0.5);
  }
}

function buildStrip(name, k) {
  const L = CRYPT_PLAN[name];
  const cfg = LAYERS[name];
  const P = L.period;
  const M = STRIP_M;
  const r = k * cfg.res;
  const w = P + FRAME_W + 2 * M;
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
  const S = { g, r, cfg, ridge, foot, P, u0: -M, u1: P + FRAME_W + M, name };

  // Resolve every item, and every copy of it that lands in the strip, the way
  // plan.js resolves them for a frame.
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
      items.push({ kind: item.kind, i, x: u, y: foot(u, halfW * s), s, variant: item.variant ?? 0 });
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
    else if (it.kind === 'gnarl') spr = gnarlSprite(r, it.s, it.variant, { body: [21, 16, 36], dark: [12, 9, 24], lit: [72, 76, 122] });
    else if (it.kind === 'grass') spr = grassSprite(r, it.s, it.i, pal);
    else spr = null;
    sprites.set(it.i, spr);
    return spr;
  };
  const sink = { abbey: 2, grove: 1, mausoleum: 1.5, tree: 2, stone: 1.2, cross: 1.2, gnarl: 3, grass: 2.5 };

  // Buildings stand behind their own ridge line, so the crest overlaps their foot.
  for (const it of items) if (it.kind === 'abbey') blit(g, spriteFor(it), it.x, it.y + sink.abbey);
  paintRidge(S);
  if (name === 'mid') crestFlicks(S, 900, shade(cfg.body, -0.1), 2.2);
  if (name === 'fg') crestFlicks(S, 1300, cfg.body, 3.2);
  for (const it of items) {
    if (it.kind === 'abbey' || it.kind === 'lamp') continue;
    if (it.kind === 'fence') fence(S, it);
    else blit(g, spriteFor(it), it.x, it.y + (sink[it.kind] ?? 1));
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
  return { c, r, M, top: cfg.top, h, P };
}

function drawStrip(ctx, S, shift) {
  const s = ((shift % S.P) + S.P) % S.P;
  const x0 = -40;
  const x1 = FRAME_W + 40;
  ctx.drawImage(S.c, (x0 + s + S.M) * S.r, 0, (x1 - x0) * S.r, S.h * S.r, x0, S.top, x1 - x0, S.h);
}

// ------------------------------------------------------------------ the lamp
function lamp(ctx, it, t) {
  const x = it.x;
  const y = it.y + 1;
  const s = it.s;
  const flicker = 0.88 + 0.12 * Math.sin(t * 11 + it.i) * Math.sin(t * 7.3 + it.i * 0.7);
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
  ctx.fillStyle = glass;
  ctx.globalAlpha = 0.85 + 0.15 * flicker;
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
  ctx.fillStyle = css(C.warm, 0.7);
  ctx.fillRect(-5.8, -45, 11.6, 0.7);
  ctx.restore();

  gl = ctx.createRadialGradient(x, hy, 0, x, hy, 12 * s);
  gl.addColorStop(0, css(C.flame, 0.5 * flicker));
  gl.addColorStop(1, css(C.warm, 0));
  ctx.fillStyle = gl;
  ctx.fillRect(x - 12 * s, hy - 12 * s, 24 * s, 24 * s);
}

// ------------------------------------------------------------------ cache
const CACHE = new Map();
function bakeFor(k) {
  let b = CACHE.get(k);
  if (b) return b;
  b = {
    sky: buildSky(k),
    star: buildStar(k),
    clouds: CRYPT_PLAN.clouds.items.map((_, i) => buildCloud(k * 0.55, i)),
    bg: buildStrip('bg', k),
    mid: buildStrip('mid', k),
    fg: buildStrip('fg', k),
    wisps: [0, 1, 2].map((v) => buildFogWisp(k, v)),
    paper: buildPaper(k),
  };
  CACHE.set(k, b);
  return b;
}

function scaleOf(ctx) {
  const m = ctx.getTransform ? ctx.getTransform() : null;
  const k = m ? Math.hypot(m.a, m.b) : 1;
  return Math.min(3, Math.max(1, Math.ceil(k * 2 - 0.01) / 2));
}

export const STYLE = {
  id: 'gouache',
  name: 'GOUACHE NIGHT',
  note: 'An opaque painted storybook night with no outlines: dry-brush sky swept round the moon, dabbed hills, a '
    + 'broken moonlit rim on every edge facing the moon, fog in layered washes and paper tooth over all. '
    + 'Far ridge paler, bluer and softer; the gas lamp the one warm note.',
  paint(ctx, f) {
    const B = bakeFor(scaleOf(ctx));
    const { x, y, w, h } = SKY_BOX;
    ctx.drawImage(B.sky, x, y, w, h);

    for (const s of f.stars) {
      const d = 1.2 + s.s * 1.9;
      ctx.globalAlpha = 0.35 + 0.65 * s.twinkle;
      ctx.drawImage(B.star, s.x - d / 2, s.y - d / 2, d, d);
      if (s.s > 1.5) {
        ctx.globalAlpha = 0.28 * s.twinkle;
        ctx.fillStyle = '#fff6dc';
        ctx.fillRect(s.x - 2.6, s.y - 0.2, 5.2, 0.4);
        ctx.fillRect(s.x - 0.2, s.y - 2.6, 0.4, 5.2);
      }
    }
    ctx.globalAlpha = 1;
    for (const c of f.clouds) blit(ctx, B.clouds[c.i], c.x, c.y);
    for (const b of f.bats) drawBat(ctx, b);

    drawStrip(ctx, B.bg, f.layers.bg.shift);
    drawStrip(ctx, B.mid, f.layers.mid.shift);
    fogBand(ctx, f.fog[0], 0, B.wisps);
    drawStrip(ctx, B.fg, f.layers.fg.shift);
    // Below the bank, in case anything ever uncovers what the lane hides.
    ctx.fillStyle = css(LAYERS.fg.dark);
    ctx.fillRect(x, B.fg.top + B.fg.h - 0.5, w, y + h - (B.fg.top + B.fg.h) + 0.5);
    for (const it of f.layers.fg.items) if (it.kind === 'lamp') lamp(ctx, it, f.t);
    fogBand(ctx, f.fog[1], 1, B.wisps);

    // Paper tooth over the whole painting.
    const k = B.paper.width / 128;
    ctx.save();
    ctx.scale(1 / k, 1 / k);
    ctx.fillStyle = ctx.createPattern(B.paper, 'repeat');
    ctx.fillRect(x * k, y * k, w * k, h * k);
    ctx.restore();
  },
};
