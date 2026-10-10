// CORPORATE KOMBAT style bake-off — GOUACHE '88, NAKATOMI AT DUSK. The gouache card's
// hand kept exactly (gouache.js: opaque masses with hand-cut edges, no outlines, a broken
// rim of lighter paint on every edge that faces the light, dry-brush, paper tooth, the same
// light design), but the set re-dressed as a 1988 corporate tower — Die Hard's Nakatomi
// Plaza, Wall Street, Working Girl, Glengarry Glen Ross. Peter, 11 Oct 2026, after the
// vaporwave card: "it fits in with the time period we have set the game in, late 80's /
// 90's … take one of the more beautiful ones and infuse it with a slightly tacky 80s / 90's
// vibe". Tacky in the props, never in the painting.
//   lobby — rose granite and polished brass, smoked bronze glass, a pink neon EGGCORP, a
//           koi pond round the brass egg, Memphis sofas, palms on Wilshire and a boxy cab.
//   open  — mauve walls over teal, glass-block piers, vertical blinds, a teal-and-mauve
//           confetti carpet, beige terminals glowing green and amber over the partitions.
//   exec  — rosewood and black lacquer under an airbrushed peach-teal-violet sunset, the
//           neon coming on across the city, the professor's power portrait in smoked glass.
//
// Everything still is baked once per device scale into strips one period long (plus a
// frame of overscan) in each layer's own u: the sky (screen-fixed), the far and near city,
// the wall (with the glass cut out of it, so the city shows only through the panes), the
// mid furniture and the slab under the lane; every strip is tiled at 2048 device px.
// The FLOOR is a perspective plane: each device row of it is baked at its own parallax
// rate m (0.24 at the wall's foot to 1 at the lane), procedurally, pixel by pixel, from a
// plan-space material (marble slabs, carpet tiles, herringbone and rugs), so its joints
// shear exactly as the plan's do and nothing on it can crawl. Per frame: the moving parts,
// the sun patches (projected from the panes through the plan's own perspective) and a few
// dozen blits.
import { FRAME_W, OFFICE_FLOORS, LANE_TOP, WALL_BASE, MID_BASE } from './plan.js';

const TAU = Math.PI * 2;
const W = FRAME_W;
const H = 270;
// The plan's perspective. Parallax is linear in y below a horizon, and m (the rate) is
// 0.24 at the wall's foot and 1 at the lane, so a floor point at plan depth Z (lane px,
// from the eye) sits at m = FOCAL / Z. The floor's lines meet at VP on the horizon; the
// plan's own blockout has them meet at the left edge, which the eye reads as a tilt.
const HORIZON = WALL_BASE - (LANE_TOP - WALL_BASE) * 0.24 / 0.76;
const FOCAL = 480;
const VP = 240;
const P_FLOOR = 2500; // the mid layer's 1200, seen at its own row (1200 / 0.48)
const P_SLAB = 1250;
const STRIP_M = 60;
const TILE = 2048;

// ------------------------------------------------------------------ utilities
function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
function hash2(x, y, s) {
  const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
  return v - Math.floor(v);
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
const smooth = (v) => { const x = clamp01(v); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const shade = (c, t) => (t > 0 ? mix(c, [255, 255, 255], t) : mix(c, [0, 0, 0], -t));
const css = (c, a = 1) => (a >= 1
  ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`
  : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0, a).toFixed(3)})`);

function vnoise(x, seed) {
  const i = Math.floor(x);
  const f = x - i;
  const s = f * f * (3 - 2 * f);
  const a = hash(i * 1.37 + seed * 57.31);
  const b = hash((i + 1) * 1.37 + seed * 57.31);
  return (a + (b - a) * s) * 2 - 1;
}
// Smooth noise that wraps every P px: for anything painted along a strip.
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
// A row of 2-D noise at a fixed second coordinate v, periodic in u: the floor is baked a
// row at a time, so the lattice for the row is computed once and each pixel is two lerps.
function rowNoise(P, su, sv, seed, v) {
  const n = Math.max(1, Math.round(P / su));
  const y = v / sv;
  const yi = Math.floor(y);
  const fy = y - yi;
  const sy = fy * fy * (3 - 2 * fy);
  const L = new Float32Array(n + 1);
  for (let i = 0; i < n; i++) L[i] = lerp(hash2(i, yi, seed), hash2(i, yi + 1, seed), sy) * 2 - 1;
  L[n] = L[0];
  const k = n / P;
  return (u) => {
    let x = u * k;
    x -= Math.floor(x / n) * n;
    const i = x | 0;
    const f = x - i;
    return L[i] + (L[i + 1] - L[i]) * f * f * (3 - 2 * f);
  };
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
const rectPts = (x, y, w, h) => [x, y, x + w, y, x + w, y + h, x, y + h];
function eggPts(cx, cy, rx, ry, n = 40) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const s = Math.sin(a);
    const r = s < 0 ? ry * 1.12 : ry * 0.9; // taller dome above, rounder bowl below
    out.push(cx + Math.cos(a) * rx * (1 - 0.08 * -Math.min(0, s)), cy + s * r);
  }
  return out;
}
function dab(g, x, y, rx, ry, ang) {
  g.beginPath();
  g.ellipse(x, y, Math.max(0.2, rx), Math.max(0.2, ry), ang, 0, TAU);
  g.fill();
}

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
// A tapered brush-stroke limb along a curve: stems, fronds, a moustache.
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
    const w = (w0 + (w1 - w0) * Math.pow(t, 0.75)) * (1 + 0.14 * vnoise(c[i][2] / 3 + seed * 3.1, seed)) * 0.5;
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
}

// A dry-brush stroke: parallel bristle lines broken into dashes, along `at(t)`.
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

// A broken edge of lighter (or darker) paint laid along a line: the rim light.
function brokenEdge(g, x0, y0, x1, y1, w, col, a, seed) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  if (len < 0.5) return;
  const R = rng(seed);
  const dx = (x1 - x0) / len;
  const dy = (y1 - y0) / len;
  const ang = Math.atan2(dy, dx);
  g.fillStyle = css(col);
  const n = Math.max(1, Math.round(len / 2.3));
  for (let i = 0; i < n; i++) {
    if (R() < 0.14) continue;
    const t = ((i + R() * 0.6) / n) * len;
    g.globalAlpha = a * (0.45 + R() * 0.55);
    dab(g, x0 + dx * t, y0 + dy * t, 1.4 + R() * 2.2, w * (0.3 + R() * 0.35), ang);
  }
  g.globalAlpha = 1;
}

// ------------------------------------------------------------------ the mass painter
// The core of the style (from the crypt card). `shape(g)` fills a silhouette that becomes
// a mask; the mask is painted with a body gradient, dabbed texture and a broken rim of
// light on every edge that faces `rimDir` (found by knocking the mask, shifted away from
// the light, out of a lit copy). `detail(g, R)` paints on top, clipped to the mass.
function massSprite(r, box, shape, st, detail) {
  const [bx, by, bw, bh] = box;
  const Wd = Math.ceil(bw * r);
  const Hd = Math.ceil(bh * r);
  const T = (g) => g.setTransform(r, 0, 0, r, -bx * r, -by * r);
  const mask = canvas(Wd, Hd);
  const mg = mask.getContext('2d');
  T(mg);
  mg.fillStyle = '#000';
  mg.strokeStyle = '#000';
  shape(mg);

  const out = canvas(Wd, Hd);
  const og = out.getContext('2d');
  og.drawImage(mask, 0, 0);
  og.globalCompositeOperation = 'source-in';
  T(og);
  const gr = og.createLinearGradient(0, by + bh * (st.g0 ?? 0.1), 0, by + bh * (st.g1 ?? 1));
  gr.addColorStop(0, css(st.body));
  gr.addColorStop(1, css(st.dark));
  og.fillStyle = gr;
  og.fillRect(bx, by, bw, bh);
  og.globalCompositeOperation = 'source-atop';
  const R = rng(st.seed ?? 1);
  const nd = Math.round(bw * bh * (st.dabs ?? 0.2));
  const tones = [shade(st.body, 0.07), shade(st.dark, -0.1), mix(st.body, st.lit, 0.3), shade(st.body, -0.06)];
  for (let i = 0; i < nd; i++) {
    og.fillStyle = css(tones[(R() * tones.length) | 0]);
    og.globalAlpha = 0.16 + R() * 0.26;
    const rx = (st.dab ?? 1.6) * (0.5 + R() * 0.9);
    dab(og, bx + R() * bw, by + R() * bh, rx, rx * (0.3 + R() * 0.3), (st.dabAng ?? 0) + (R() - 0.5) * 0.7);
  }
  og.globalAlpha = 1;
  if (st.rim) {
    const [lx, ly] = st.rimDir ?? [0.5, -0.86];
    const rim = canvas(Wd, Hd);
    const rg = rim.getContext('2d');
    rg.drawImage(mask, 0, 0);
    rg.globalCompositeOperation = 'source-in';
    rg.fillStyle = css(st.lit);
    rg.fillRect(0, 0, Wd, Hd);
    rg.globalCompositeOperation = 'destination-out';
    const d = st.rim * r;
    rg.globalAlpha = 0.5;
    rg.drawImage(mask, -lx * d * 1.2, -ly * d * 1.2);
    rg.globalAlpha = 1;
    rg.drawImage(mask, -lx * d * 2.6, -ly * d * 2.6);
    T(rg);
    const nb = Math.round(bw * bh * 0.05);
    for (let i = 0; i < nb; i++) {
      rg.globalAlpha = 0.25 + R() * 0.5;
      const rx = 0.6 + R() * 1.6;
      dab(rg, bx + R() * bw, by + R() * bh, rx, rx * 0.45, Math.atan2(ly, lx) + Math.PI / 2 + (R() - 0.5) * 0.8);
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
  return { c: out, x: bx, y: by, w: Wd / r, h: Hd / r };
}
function blit(g, spr, x, y, alpha = 1) {
  if (!spr) return;
  if (alpha < 1) g.globalAlpha = alpha;
  g.drawImage(spr.c, x + spr.x, y + spr.y, spr.w, spr.h);
  if (alpha < 1) g.globalAlpha = 1;
}
function blitFlip(g, spr, x, y, flip) {
  if (!flip) return blit(g, spr, x, y);
  g.save();
  g.translate(x, y);
  g.scale(-1, 1);
  g.drawImage(spr.c, spr.x, spr.y, spr.w, spr.h);
  g.restore();
}

// A painted rectangle: a body gradient, a few dabs, a broken lit edge on the sides that
// face the light and a darker one on the others. Everything solid in the office is a pile
// of these and of mass sprites.
function box(g, x, y, w, h, o) {
  const top = o.top ?? o.body;
  const bot = o.dark ?? shade(o.body, -0.12);
  const gr = g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, css(top));
  gr.addColorStop(1, css(bot));
  g.fillStyle = gr;
  const seed = o.seed ?? Math.round(x * 13 + y * 7);
  fillPoly(g, rectPts(x, y, w, h), o.wob ?? 0.22, seed);
  if (o.dabs !== 0) {
    const R = rng(seed * 3 + 1);
    const n = Math.min(400, Math.round(w * h * (o.dabs ?? 0.05)));
    const tones = [shade(o.body, 0.06), shade(o.body, -0.08), mix(o.body, o.lit ?? shade(o.body, 0.2), 0.35)];
    for (let i = 0; i < n; i++) {
      g.fillStyle = css(tones[(R() * 3) | 0]);
      g.globalAlpha = 0.12 + R() * 0.22;
      const rx = Math.min(w, h, o.dab ?? 2.2) * (0.4 + R() * 0.7);
      dab(g, x + 0.5 + R() * (w - 1), y + 0.5 + R() * (h - 1), rx, rx * (0.3 + R() * 0.3), (o.dabAng ?? 0) + (R() - 0.5) * 0.5);
    }
    g.globalAlpha = 1;
  }
  const lit = o.lit;
  const rw = o.rimW ?? 1.1;
  if (lit) {
    if (o.rimTop !== false) brokenEdge(g, x + 0.3, y + rw * 0.4, x + w - 0.3, y + rw * 0.4, rw, lit, o.rimA ?? 0.8, seed + 11);
    if (o.rimLeft) brokenEdge(g, x + rw * 0.4, y + 0.3, x + rw * 0.4, y + h - 0.3, rw, lit, (o.rimA ?? 0.8) * 0.85, seed + 12);
    if (o.rimRight) brokenEdge(g, x + w - rw * 0.4, y + 0.3, x + w - rw * 0.4, y + h - 0.3, rw, lit, (o.rimA ?? 0.8) * 0.85, seed + 13);
  }
  if (o.edge) {
    if (o.edgeBottom !== false) brokenEdge(g, x + 0.3, y + h - 0.5, x + w - 0.3, y + h - 0.5, 1, o.edge, 0.6, seed + 14);
    if (o.edgeRight) brokenEdge(g, x + w - 0.5, y + 0.3, x + w - 0.5, y + h - 0.3, 1, o.edge, 0.55, seed + 15);
    if (o.edgeLeft) brokenEdge(g, x + 0.5, y + 0.3, x + 0.5, y + h - 0.3, 1, o.edge, 0.55, seed + 16);
  }
}
function glow(g, x, y, r, col, a, a2 = 0) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, css(col, a));
  gr.addColorStop(0.4, css(col, a * 0.45 + a2));
  gr.addColorStop(1, css(col, 0));
  g.fillStyle = gr;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}
function vgrad(g, x, y, w, h, c0, a0, c1, a1) {
  const gr = g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, css(c0, a0));
  gr.addColorStop(1, css(c1, a1));
  g.fillStyle = gr;
  g.fillRect(x, y, w, h);
}
function hgrad(g, x, y, w, h, c0, a0, c1, a1) {
  const gr = g.createLinearGradient(x, 0, x + w, 0);
  gr.addColorStop(0, css(c0, a0));
  gr.addColorStop(1, css(c1, a1));
  g.fillStyle = gr;
  g.fillRect(x, y, w, h);
}
const SIGN = '"Futura", "Avenir Next", "Gill Sans", "Trebuchet MS", sans-serif';
const PLATE = '"Copperplate", "Didot", "Baskerville", Georgia, serif';
function text(g, s, x, y, size, col, o = {}) {
  g.font = `${o.weight ?? 'bold'} ${size}px ${o.face ?? SIGN}`;
  g.textAlign = o.align ?? 'center';
  g.textBaseline = o.base ?? 'alphabetic';
  g.fillStyle = typeof col === 'string' ? col : css(col, o.a ?? 1);
  if (o.track) {
    // hand-spaced: each letter set on its own, like a sign-writer's
    const ws = [...s].map((ch) => g.measureText(ch).width);
    const total = ws.reduce((a, b) => a + b, 0) + o.track * (s.length - 1);
    let cx = o.align === 'left' ? x : x - total / 2;
    g.textAlign = 'left';
    [...s].forEach((ch, i) => { g.fillText(ch, cx, y); cx += ws[i] + o.track; });
    return;
  }
  g.fillText(s, x, y);
}

// ------------------------------------------------------------------ strips
// A strip covers screen x from -STRIP_M to W + STRIP_M at every shift: u from -STRIP_M to
// P + W + STRIP_M. `rep` paints an item at each of its copies that land in it.
function makeStrip(k, res, P, top, bottom, paint) {
  const r = k * res;
  const u0 = -STRIP_M;
  const u1 = P + W + STRIP_M;
  const c = canvas((u1 - u0) * r, (bottom - top) * r);
  const g = c.getContext('2d');
  g.setTransform(r, 0, 0, r, STRIP_M * r, -top * r);
  const S = {
    g, P, u0, u1, top, bottom, r, k,
    rep(u, w, fn) {
      for (const n of [-1, 0, 1]) {
        const uu = u + n * P;
        if (uu + w > u0 - 30 && uu < u1 + 30) fn(uu);
      }
    },
  };
  paint(S);
  return { tiles: null, r, top, h: bottom - top, P, canvas: c, g, u0, u1, bottom };
}
function tiles(c) {
  if (c.width <= TILE) return [{ c, x0: 0, w: c.width, a: 0, b: c.width }];
  const out = [];
  for (let x = 0; ; x += TILE - 4) {
    const w = Math.min(TILE, c.width - x);
    const t = canvas(w, c.height);
    t.getContext('2d').drawImage(c, -x, 0);
    out.push({ c: t, x0: x, w, a: x === 0 ? 0 : x + 2, b: x + w >= c.width ? x + w : x + w - 2 });
    if (x + w >= c.width) break;
  }
  return out;
}
function retile(S) {
  S.tiles = tiles(S.canvas);
  if (S.tiles[0].c !== S.canvas) { S.canvas = null; S.g = null; }
}
function drawStrip(ctx, S, shift, x0 = -2, x1 = W + 2) {
  if (!S.tiles) retile(S);
  const s = ((shift % S.P) + S.P) % S.P;
  const a0 = (x0 + s + STRIP_M) * S.r;
  const a1 = (x1 + s + STRIP_M) * S.r;
  for (const T of S.tiles) {
    const a = Math.max(a0, T.a);
    const b = Math.min(a1, T.b);
    if (b <= a) continue;
    ctx.drawImage(T.c, a - T.x0, 0, b - a, T.c.height, a / S.r - s - STRIP_M, S.top, (b - a) / S.r, S.h);
  }
}
// Soft mottling over everything already in a strip (kept to what is there): the uneven
// lay of opaque paint. Periodic in u, so the strip's seam is invisible.
function mottle(S, amt, seed, su = 9, sv = 7) {
  const res = 0.34;
  const w = Math.ceil((S.u1 - S.u0) * res);
  const h = Math.ceil((S.bottom - S.top) * res);
  const dark = canvas(w, h);
  const lite = canvas(w, h);
  const di = dark.getContext('2d').createImageData(w, h);
  const li = lite.getContext('2d').createImageData(w, h);
  const dd = di.data;
  const ld = li.data;
  for (let j = 0; j < h; j++) {
    const v = S.top + j / res;
    const n1 = rowNoise(S.P, su, sv, seed, v);
    const n3 = rowNoise(S.P, su * 4, sv * 3, seed + 3, v);
    for (let i = 0; i < w; i++) {
      const u = S.u0 + i / res;
      const val = (0.6 * n1(u) + 0.4 * n3(u)) * amt;
      const p = (j * w + i) * 4;
      if (val < 0) { dd[p] = 20; dd[p + 1] = 16; dd[p + 2] = 24; dd[p + 3] = Math.min(255, -val * 150); } else { ld[p] = 255; ld[p + 1] = 250; ld[p + 2] = 236; ld[p + 3] = Math.min(255, val * 55); }
    }
  }
  dark.getContext('2d').putImageData(di, 0, 0);
  lite.getContext('2d').putImageData(li, 0, 0);
  const g = S.g;
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.imageSmoothingEnabled = true;
  g.globalCompositeOperation = 'source-atop';
  g.drawImage(dark, 0, 0, S.canvas.width, S.canvas.height);
  g.drawImage(lite, 0, 0, S.canvas.width, S.canvas.height);
  g.restore();
}

// ------------------------------------------------------------------ the floor plane
// Each device row of the floor band is baked at its own rate m into a strip of screen px
// (a = x - (1 - m) VP + m C), from a plan-space material sampled per pixel. Rows are cut
// into chunks no wider than a tile, each overlapping the next by a frame, so a frame is
// one blit per row.
function buildFloor(k, mat) {
  const rows = Math.round((LANE_TOP - WALL_BASE) * k);
  const CWd = TILE;
  const STd = CWd - Math.ceil(492 * k) - 4;
  const meta = [];
  let total = 0;
  for (let j = 0; j < rows; j++) {
    const y = WALL_BASE + (j + 0.5) / k;
    const m = (y - HORIZON) / (LANE_TOP - HORIZON);
    const off = (1 - m) * VP;
    const A0 = -8 - off;
    const A1 = 490 - off + m * P_FLOOR;
    const Wd = Math.ceil((A1 - A0) * k);
    const n = Math.max(1, Math.ceil((Wd - CWd) / STd) + 1);
    meta.push({ j, y: WALL_BASE + j / k, m, off, A0, Wd, n, row0: total });
    total += n;
  }
  const atlas = canvas(CWd, total);
  const ag = atlas.getContext('2d');
  const img = ag.createImageData(CWd, total);
  const D = img.data;
  const px = [0, 0, 0];
  for (const R of meta) {
    const Z = FOCAL / R.m;
    const dm = 1 / (k * (LANE_TOP - HORIZON));
    const dZ = FOCAL / (R.m * R.m) * dm;
    const du = 1 / (k * R.m);
    const s = (R.y + 0.5 / k - WALL_BASE) / (LANE_TOP - WALL_BASE);
    const row = new Uint8ClampedArray(R.Wd * 3);
    const sample = mat.row(Z, dZ, du, s, R.m);
    for (let i = 0; i < R.Wd; i++) {
      const a = R.A0 + (i + 0.5) / k;
      let u = a / R.m;
      u -= Math.floor(u / P_FLOOR) * P_FLOOR;
      sample(u, px);
      row[i * 3] = px[0];
      row[i * 3 + 1] = px[1];
      row[i * 3 + 2] = px[2];
    }
    for (let c = 0; c < R.n; c++) {
      const start = c * STd;
      const base = (R.row0 + c) * CWd * 4;
      for (let i = 0; i < CWd; i++) {
        const si = Math.min(R.Wd - 1, start + i) * 3;
        const p = base + i * 4;
        D[p] = row[si]; D[p + 1] = row[si + 1]; D[p + 2] = row[si + 2]; D[p + 3] = 255;
      }
    }
  }
  ag.putImageData(img, 0, 0);
  return { atlas, meta, k, STd, rows };
}
function drawFloor(ctx, F, C) {
  const Cm = ((C % P_FLOOR) + P_FLOOR) % P_FLOOR;
  const k = F.k;
  for (const R of F.meta) {
    const a = -4 - R.off + R.m * Cm;
    const ad = (a - R.A0) * k;
    let c = Math.floor(ad / F.STd);
    if (c < 0) c = 0;
    if (c > R.n - 1) c = R.n - 1;
    ctx.drawImage(F.atlas, ad - c * F.STd, R.row0 + c, 488 * k, 1, -4, R.y, 488, 1 / k + 0.02);
  }
}
// Floor maths: where a plan point lands on screen, and the floor u under a wall-line x.
const floorX = (u, Z, C) => { const m = FOCAL / Z; return m * (u - C) + (1 - m) * VP; };
const floorY = (Z) => HORIZON + (LANE_TOP - HORIZON) * (FOCAL / Z);
const Z_WALL = FOCAL / 0.24;
const Z_MID = FOCAL / 0.48;
const uAtWall = (x, C) => (x - 0.76 * VP) / 0.24 + C;
const uOfMid = (v) => (v - 0.52 * VP) / 0.48; // a mid-layer u, on the floor under it
// A box filter of a thin line at period `p` (in u or Z), for the per-pixel materials.
function lineCov(v, p, w, fp) {
  let d = v - Math.floor(v / p) * p;
  d = Math.min(d, p - d);
  return clamp01((w * 0.5 + fp * 0.5 - d) / Math.max(fp, 1e-3));
}
// fraction of this row's depth span that lies on a single line at depth zz
function rowCovAt(Z, dZ, zz, w) {
  const lo = Math.max(Z - dZ / 2, zz - w / 2);
  const hi = Math.min(Z + dZ / 2, zz + w / 2);
  return hi > lo ? clamp01((hi - lo) / Math.max(dZ, w)) * Math.min(1, w / Math.max(1e-3, Math.min(dZ, w))) : 0;
}
function rowCov(Z, dZ, p, w) {
  // fraction of this row's depth span [Z - dZ/2, Z + dZ/2] that lies on a joint
  const a = Z - dZ / 2;
  const b = Z + dZ / 2;
  let cov = 0;
  for (let jz = Math.floor(a / p) * p; jz <= b + p; jz += p) {
    const lo = Math.max(a, jz - w / 2);
    const hi = Math.min(b, jz + w / 2);
    if (hi > lo) cov += hi - lo;
  }
  return clamp01(cov / dZ);
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
    img.data[i * 4 + 3] = Math.round(a * a * 12);
  }
  sg.putImageData(img, 0, 0);
  const c = canvas(T * k, T * k);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = true;
  g.drawImage(small, 0, 0, T * k, T * k);
  g.setTransform(k, 0, 0, k, 0, 0);
  for (let i = 0; i < 26; i++) {
    const x = R() * T;
    const y = R() * T;
    const rr = 6 + R() * 18;
    const col = R() < 0.5 ? 'rgba(255,250,236,0.016)' : 'rgba(0,0,12,0.022)';
    for (const ox of [-T, 0, T]) {
      for (const oy of [-T, 0, T]) {
        g.fillStyle = col;
        dab(g, x + ox, y + oy, rr, rr * (0.5 + R() * 0.2), R() * TAU);
      }
    }
  }
  return c;
}

// The finish over the whole painting: paper tooth, and a soft vignette that darkens the
// corners a little, as a camera lens (and a painter framing a background) would.
function buildFinish(k, paper, tint, amt) {
  const c = canvas(W * k, H * k);
  const g = c.getContext('2d');
  const pk = paper.width / 128;
  g.save();
  g.scale(k / pk, k / pk);
  g.fillStyle = g.createPattern(paper, 'repeat');
  g.fillRect(0, 0, W * pk / k * k, H * pk / k * k);
  g.restore();
  g.setTransform(k, 0, 0, k, 0, 0);
  g.save();
  g.translate(W / 2, H * 0.55);
  g.scale(1.25, 1);
  const vg = g.createRadialGradient(0, 0, 120, 0, 0, 290);
  vg.addColorStop(0, css(tint, 0));
  vg.addColorStop(1, css(tint, amt));
  g.fillStyle = vg;
  g.fillRect(-W, -H, W * 2, H * 2);
  g.restore();
  return c;
}

// ================================================================== PALETTES
const PAL = {
  lobby: {
    light: [-0.55, -0.83], // the sun, high left, beyond the glass
    sky: [[22, [150, 168, 216]], [70, [186, 184, 222]], [130, [232, 200, 208]], [186, [252, 222, 198]], [204, [250, 214, 192]]],
    sunCol: [255, 236, 214],
    far: { body: [198, 192, 222], dark: [206, 200, 226], lit: [252, 236, 232], haze: [242, 224, 226] },
    faces: [[184, 136, 140], [100, 150, 158], [216, 172, 148]],
    faceLit: [255, 226, 204],
    faceHaze: [242, 220, 222],
    win: [84, 96, 126], winSky: [190, 222, 236],
    cloud: { body: [252, 238, 238], dark: [208, 192, 216], lit: [255, 250, 242] },
    wall: [172, 124, 124], wallTop: [118, 86, 96], wallLit: [248, 210, 200], joint: [126, 88, 94],
    ceil: [66, 52, 62],
    bronze: [182, 140, 66], bronzeLit: [255, 230, 150], bronzeDark: [104, 74, 34],
    mullion: [56, 44, 40], mullionLit: [236, 196, 150],
    column: [42, 38, 46], columnLit: [214, 176, 196], columnDark: [22, 18, 26],
    glass: [150, 118, 96], glassA: 0.18, // smoked bronze
    ambient: [196, 160, 166],
    shadowTint: [84, 60, 100],
  },
  open: {
    light: [-0.3, -0.95],
    sky: [[58, [118, 156, 214]], [100, [168, 188, 228]], [150, [228, 214, 228]], [172, [232, 218, 228]]],
    far: { body: [192, 190, 224], dark: [200, 198, 228], lit: [242, 236, 246], haze: [224, 216, 234] },
    faces: [[198, 142, 144], [104, 158, 162], [226, 196, 170]],
    faceLit: [255, 240, 228],
    faceHaze: [216, 210, 234],
    win: [88, 102, 132], winSky: [184, 220, 234],
    cloud: { body: [252, 248, 250], dark: [200, 200, 226], lit: [255, 255, 255] },
    wall: [182, 152, 166], wallTop: [156, 128, 144], wallLit: [240, 216, 226], joint: [152, 124, 140],
    wallLow: [66, 118, 122],
    ceil: [172, 166, 168],
    trim: [222, 212, 204], trimLit: [246, 240, 234],
    column: [196, 222, 226], columnLit: [244, 252, 252], columnDark: [128, 160, 170],
    skirting: [52, 88, 94],
    glass: [214, 232, 240], glassA: 0.08,
    mullion: [150, 150, 156], mullionLit: [244, 242, 246],
    ambient: [188, 170, 182],
    shadowTint: [74, 70, 116],
  },
  exec: {
    light: [0.1, -1],
    sky: [[30, [34, 56, 98]], [62, [76, 54, 126]], [96, [150, 66, 140]], [126, [220, 98, 140]], [150, [250, 146, 132]], [168, [255, 192, 150]], [178, [255, 220, 172]], [190, [150, 120, 160]], [210, [84, 80, 128]]],
    sunCol: [255, 196, 150],
    far: { body: [92, 66, 126], dark: [72, 52, 108], lit: [255, 140, 168], haze: [176, 116, 158] },
    faces: [[62, 46, 96], [70, 50, 100], [50, 50, 94]],
    faceLit: [255, 132, 172],
    faceHaze: [146, 96, 146],
    win: [30, 24, 56], winLit: [255, 196, 130],
    cloud: { body: [158, 84, 144], dark: [104, 62, 124], lit: [255, 176, 150] },
    wood: [112, 50, 48], woodDark: [58, 24, 30], woodLit: [212, 116, 104],
    teal: [94, 58, 90], tealDark: [52, 32, 60], tealLit: [168, 116, 150], // the upper wall: plum silk
    brass: [182, 140, 70], brassLit: [255, 220, 150], brassDark: [100, 72, 36],
    lacquer: [26, 22, 30], lacquerLit: [150, 120, 160],
    ceil: [34, 26, 46],
    glass: [150, 110, 156], glassA: 0.1,
    mullion: [30, 26, 34], mullionLit: [255, 160, 170],
    warm: [255, 184, 146],
    ambient: [86, 62, 90],
    shadowTint: [38, 26, 62],
  },
};

// ================================================================== OUTSIDE
function buildSky(k, D, P) {
  const top = D.glass.top - 2;
  const bottom = WALL_BASE;
  const c = canvas(W * k, (bottom - top) * k);
  const g = c.getContext('2d');
  g.setTransform(k, 0, 0, k, 0, -top * k);
  const stops = P.sky;
  const y0 = stops[0][0];
  const y1 = stops[stops.length - 1][0];
  const gr = g.createLinearGradient(0, y0, 0, y1);
  for (const [y, col] of stops) gr.addColorStop(clamp01((y - y0) / (y1 - y0)), css(col));
  g.fillStyle = gr;
  g.fillRect(0, top, W, bottom - top);
  const skyAt = (y) => {
    if (y <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) {
      if (y <= stops[i][0]) return mix(stops[i - 1][1], stops[i][1], (y - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]));
    }
    return stops[stops.length - 1][1];
  };
  const sun = D.outside.sun;
  if (sun) {
    const reach = D.id === 'exec' ? 260 : 200;
    const gl = g.createRadialGradient(sun.x, sun.y, sun.r * 0.6, sun.x, sun.y, reach);
    gl.addColorStop(0, css(P.sunCol, 0.75));
    gl.addColorStop(0.12, css(P.sunCol, 0.4));
    gl.addColorStop(0.45, css(P.sunCol, 0.1));
    gl.addColorStop(1, css(P.sunCol, 0));
    g.fillStyle = gl;
    g.fillRect(0, top, W, bottom - top);
  }
  const R = rng(D.stage * 991 + 7);
  for (let i = 0; i < 70; i++) {
    const yy = top + Math.pow(R(), 0.9) * (bottom - top);
    const xx = -70 + R() * 560;
    const len = 60 + R() * 220;
    const th = 3 + R() * 8;
    const sag = (R() - 0.5) * 5;
    const base = skyAt(yy);
    let lift = 0;
    if (sun) {
      const dm = Math.hypot(xx + len / 2 - sun.x, yy - sun.y);
      lift = dm < 180 ? 0.12 * (1 - dm / 180) : 0;
    }
    const dark = R() < 0.32;
    const col = dark ? shade(base, -0.06 - R() * 0.05) : shade(base, 0.05 + lift + R() * 0.05);
    bristleStroke(g, R, (t) => [xx + t * len, yy + Math.sin(t * Math.PI) * sag, 0, 1], len, th, col, dark ? 0.22 + R() * 0.12 : 0.26 + R() * 0.22);
  }
  if (sun) {
    const m = sun;
    const halo = g.createRadialGradient(m.x, m.y, m.r * 0.9, m.x, m.y, m.r * 2.4);
    halo.addColorStop(0, css(P.sunCol, 0.7));
    halo.addColorStop(1, css(P.sunCol, 0));
    g.fillStyle = halo;
    g.beginPath();
    g.arc(m.x, m.y, m.r * 2.4, 0, TAU);
    g.fill();
    const dg = g.createRadialGradient(m.x - m.r * 0.3, m.y - m.r * 0.3, 1, m.x, m.y, m.r);
    if (D.id === 'exec') {
      dg.addColorStop(0, css([255, 236, 176]));
      dg.addColorStop(0.7, css([255, 190, 100]));
      dg.addColorStop(1, css([246, 140, 70]));
    } else {
      dg.addColorStop(0, css([255, 255, 246]));
      dg.addColorStop(1, css([255, 242, 206]));
    }
    g.fillStyle = dg;
    fillPoly(g, arcPts(m.x, m.y, m.r, m.r, 0, TAU, 48), 0.35, 5);
  }
  return { c, top, h: bottom - top };
}

function buildCloud(r, c, P, i, exec) {
  const { w, h } = c;
  const R0 = rng(900 + i * 17);
  const ribbon = (g, x0, x1, y, th, mid, sag, seed) => {
    const xm = x0 + (x1 - x0) * mid;
    limb(g, [[xm, y - sag], [(xm + x1) / 2, y - sag * 0.5], [x1, y]], th, 0.3, seed);
    limb(g, [[xm, y - sag], [(xm + x0) / 2, y - sag * 0.4], [x0, y + 0.3]], th, 0.3, seed + 1);
  };
  const shape = (g) => {
    ribbon(g, w * 0.04, w * 0.96, h * 0.62, h * 0.62, 0.45, h * 0.1, i * 10);
    ribbon(g, w * 0.12 + R0() * w * 0.08, w * 0.8, h * 0.42, h * 0.46, 0.55, h * 0.1, i * 10 + 2);
    ribbon(g, -w * 0.06, w * 0.5, h * 0.8, h * 0.24, 0.6, 0, i * 10 + 4);
    ribbon(g, w * 0.45, w * 1.07, h * 0.78, h * 0.22, 0.3, 0, i * 10 + 6);
    if (!exec) {
      const bumps = 3 + (i % 2);
      for (let b = 0; b < bumps; b++) {
        const bx = w * (0.18 + (b / Math.max(1, bumps - 1)) * 0.55 + (R0() - 0.5) * 0.08);
        const br = h * (0.32 + R0() * 0.2);
        fillPoly(g, arcPts(bx, h * 0.4, br * 1.6, br, 0, TAU, 28), 0.4, bx);
      }
    }
  };
  const C = P.cloud;
  return massSprite(r, [-w * 0.1, -h * 0.4, w * 1.22, h * 1.5], shape, {
    body: C.body, dark: C.dark, lit: C.lit, rim: exec ? 1.0 : 1.3, rimA: 0.85,
    rimDir: exec ? [0.2, 0.98] : [-0.6, -0.8],
    dabs: 0.25, dab: 3, dabAng: 0, seed: 50 + i, g0: exec ? 0.6 : 0.35, g1: exec ? 0.0 : 1,
  }, (g, R) => {
    for (let n = 0; n < 16; n++) {
      g.fillStyle = css(R() < 0.45 ? C.lit : C.dark, 0.1 + R() * 0.14);
      dab(g, R() * w, h * (0.3 + R() * 0.5), 6 + R() * 16, 0.4 + R() * 0.5, (R() - 0.5) * 0.06);
    }
  });
}

// A facade: a body with its window grid and roof, lit on the edges that face the light.
function building(g, b, x, o) {
  const top = b.top;
  const base = o.base ?? b.base;
  const w = b.w;
  const R = rng(b.i * 131 + o.seed);
  const face = o.faces[b.tone];
  const body = o.far ? face : face;
  // roof furniture first, behind the parapet line
  g.fillStyle = css(shade(body, -0.05));
  if (b.roof === 'spire') fillPoly(g, [x + w * 0.32, top + 1, x + w * 0.5, top - 30 - (b.i % 3) * 8, x + w * 0.68, top + 1], 0.3, b.i);
  if (b.roof === 'antenna') { g.fillRect(x + w * 0.5 - 0.6, top - 22, 1.2, 23); g.fillRect(x + w * 0.5 - 2, top - 8, 4, 8); }
  if (b.roof === 'stepped') {
    fillPoly(g, rectPts(x + w * 0.15, top - 8, w * 0.7, 9), 0.3, b.i + 1);
    fillPoly(g, rectPts(x + w * 0.3, top - 15, w * 0.4, 8), 0.3, b.i + 2);
  }
  const gr = g.createLinearGradient(0, top, 0, base);
  gr.addColorStop(0, css(o.far ? body : o.lit ? mix(body, o.lit2, 0.12) : shade(body, 0.04)));
  gr.addColorStop(1, css(o.far ? o.hazeCol : shade(body, -0.1)));
  g.fillStyle = gr;
  fillPoly(g, rectPts(x, top, w, base - top + 1), o.far ? 0.5 : 0.3, b.i * 3 + o.seed);
  // the window grid, laid in as broken bands of glass between piers, low in contrast on
  // a face in shadow, some panes catching the sky
  if (o.windows) {
    const cw = (w - 4) / b.cols;
    const shopH = b.shop != null ? 18 : 0;
    const winA = o.far ? 0.22 : o.winA ?? 0.55;
    for (let r = 0, y = top + 4; y < base - 4 - shopH; r++, y += b.floorH) {
      const wh = b.floorH * 0.52;
      for (let c = 0; c < b.cols; c++) {
        const wx = x + 2 + c * cw + 0.5 + (hash2(c, r, b.i + 3) - 0.5) * 0.5;
        const ww = Math.max(0.8, cw - 1.4);
        const hsh = hash2(b.i * 7 + c, r, o.seed);
        let col = o.win;
        let a = winA * (0.7 + 0.6 * hash2(c, r * 3, b.i));
        if (o.lit && hsh < b.lit * 0.45) {
          const v = hash2(c, r, b.i);
          col = mix(o.winLit, [255, 236, 190], v * 0.4);
          a = 0.4 + 0.5 * v;
          if (v > 0.8) { g.fillStyle = css(o.winLit, 0.16); g.fillRect(wx - 1, y - 1, ww + 2, wh + 2); }
          g.fillStyle = css(col, a);
          g.fillRect(wx + ww * 0.15, y + wh * 0.1, ww * 0.7, wh * 0.85);
          continue;
        } else if (o.lit) {
          a *= 0.8;
        } else if (o.winSky && hsh > 0.72) {
          col = o.winSky;
          a = 0.6;
        }
        g.fillStyle = css(col, a);
        // hand-cut: each pane a hair off square
        const jh = (hash2(r, c, b.i + 9) - 0.5) * 0.5;
        g.fillRect(wx, y + jh, ww, wh - jh);
        if (!o.far && !o.lit && hsh > 0.5 && hsh < 0.62) {
          // a blind half down, a curtain
          g.fillStyle = css(shade(body, 0.1), 0.6);
          g.fillRect(wx, y, ww, wh * 0.45);
        }
      }
    }
    if (!o.far && b.cols > 4) {
      // pilasters every few bays, a shade lighter on the lit side
      const every = 3 + (b.i % 2);
      for (let c = every; c < b.cols; c += every) {
        const px = x + 2 + c * cw - 0.9;
        g.fillStyle = css(shade(body, o.lit ? 0.06 : 0.07), 0.85);
        fillPoly(g, rectPts(px, top + 2, 1.6, base - top - 2), 0.15, px);
      }
    }
    if (!o.far) {
      // dry-brush drag down the face
      for (let n = 0; n < w / 3; n++) {
        g.fillStyle = css(R() < 0.5 ? shade(body, 0.1) : shade(body, -0.1), 0.12 + R() * 0.12);
        dab(g, x + R() * w, top + R() * (base - top), 0.5 + R() * 0.6, 4 + R() * 10, 0);
      }
    }
  }
  if (o.hazeCol2) {
    // aerial haze rising off the street
    const hy = top + (base - top) * 0.35;
    const hg = g.createLinearGradient(0, hy, 0, base);
    hg.addColorStop(0, css(o.hazeCol2, 0));
    hg.addColorStop(1, css(o.hazeCol2, o.hazeA ?? 0.5));
    g.fillStyle = hg;
    fillPoly(g, rectPts(x, hy, w, base - hy + 1), 0.3, b.i * 3 + o.seed);
  }
  // roof furniture in front
  if (b.roof === 'cornice') {
    // postmodern: a broken pediment with its round notch, the Chippendale top
    box(g, x - 1.5, top - 1, w + 3, 3, { body: shade(body, 0.08), lit: o.lit2, dabs: 0, rimA: 0.9 });
    if (!o.far) {
      const ph = Math.min(16, w * 0.22);
      g.fillStyle = css(shade(body, 0.04));
      fillPoly(g, [x + 2, top - 1, x + w / 2 - 3, top - 1 - ph * 0.82, x + w / 2 - 3, top - 1 - ph * 0.5, x + w / 2 + 3, top - 1 - ph * 0.5, x + w / 2 + 3, top - 1 - ph * 0.82, x + w - 2, top - 1], 0.2, b.i + 3);
      g.fillStyle = css(o.win, 0.6);
      dab(g, x + w / 2, top - 1 - ph * 0.62, 2.6, 2.6, 0);
      if (o.lit2) brokenEdge(g, x + 2, top - 1.4, x + w / 2 - 3, top - 1 - ph * 0.82, 1, o.lit2, 0.8, b.i + 4);
    }
  }
  if (b.roof === 'tank' && !o.far) {
    // a teal glass pyramid cap, catching the sky on its lit face
    const pw = Math.min(w - 6, 30);
    const px = x + (w - pw) / 2;
    g.fillStyle = css([70, 128, 136]);
    fillPoly(g, [px, top, px + pw / 2, top - pw * 0.55, px + pw, top], 0.2, b.i + 6);
    g.fillStyle = css([170, 214, 220], 0.65);
    fillPoly(g, [px + 1, top, px + pw / 2, top - pw * 0.55, px + pw * 0.46, top], 0.1, b.i + 7);
    g.fillStyle = css([40, 80, 90], 0.5);
    for (let yy = top - 3; yy > top - pw * 0.5; yy -= 3) g.fillRect(px + (top - yy) / 1.1, yy, pw - 2 * (top - yy) / 1.1, 0.5);
  }
  if (b.roof === 'billboard' && !o.far) billboard(g, x + 6, top, w - 12, o, b.i);
  if (b.roof === 'flat' && !o.far) box(g, x, top - 1.5, w, 2.2, { body: shade(body, 0.06), lit: o.lit2, dabs: 0 });
  // the lit edge: broken paint on the side that faces the light
  if (o.lit2) {
    const left = o.rimSide === 'left' || (o.rimSide === 'auto' && x + w / 2 > o.sunX);
    brokenEdge(g, x + 0.3, top + 0.6, x + w - 0.3, top + 0.6, 1.4, o.lit2, o.rimA * 0.9, b.i + 5);
    if (left) brokenEdge(g, x + 0.7, top, x + 0.7, base, o.far ? 2 : 1.6, o.lit2, o.rimA, b.i + 7);
    else brokenEdge(g, x + w - 0.7, top, x + w - 0.7, base, o.far ? 2 : 1.6, o.lit2, o.rimA, b.i + 7);
  }
  if (b.shop != null && o.shops) shopfront(g, x, base, w, b.shop, b.i, o);
}
function waterTower(g, x, top, o) {
  const wood = [118, 86, 60];
  g.fillStyle = css([60, 48, 40]);
  for (const lx of [1, 6, 11]) g.fillRect(x + lx, top - 7, 1, 7.5);
  g.fillRect(x, top - 7.5, 13, 1);
  box(g, x + 0.5, top - 19, 12, 12, { body: wood, dark: shade(wood, -0.2), lit: o.lit2 ?? shade(wood, 0.3), rimLeft: true, dabs: 0.1, seed: x });
  g.fillStyle = css([92, 66, 48]);
  for (const yy of [-16, -12.5, -9]) g.fillRect(x + 0.5, top + yy, 12, 0.6);
  g.fillStyle = css(shade(wood, -0.25));
  fillPoly(g, [x - 0.5, top - 19, x + 6.5, top - 24, x + 13.5, top - 19], 0.2, x);
  if (o.lit2) brokenEdge(g, x, top - 19.5, x + 6.5, top - 24, 0.9, o.lit2, 0.7, x + 3);
}
function billboard(g, x, top, w, o, i) {
  g.fillStyle = css([54, 50, 50]);
  for (let lx = 3; lx < w; lx += 9) g.fillRect(x + lx, top - 6, 1, 6.5);
  g.fillRect(x, top - 6.5, w, 1);
  // an airbrushed billboard: a sunset grid and a chrome slogan, 1988 all over
  box(g, x, top - 19, w, 13, { body: [70, 150, 160], dark: [48, 104, 128], lit: [190, 236, 236], dabs: 0.05, seed: i });
  vgrad(g, x + 1, top - 18, w - 2, 7, [255, 120, 170], 0.85, [255, 200, 150], 0.85);
  g.fillStyle = css([255, 230, 160]);
  dab(g, x + 10, top - 11.6, 3.4, 3.4, 0);
  text(g, 'FAX IT!', x + w / 2 + 5, top - 9, 6, [40, 20, 60], { weight: 'bold' });
}
function shopfront(g, x, base, w, shop, i, o) {
  const AW = [[176, 72, 62], [72, 120, 92], [72, 102, 150], [204, 160, 74]][shop];
  const sh = 16;
  box(g, x + 1, base - sh, w - 2, sh, { body: [62, 58, 60], dark: [44, 40, 44], dabs: 0.05, seed: i * 3 });
  // warm interior behind the glass
  g.fillStyle = css([236, 196, 140], 0.55);
  for (let wx = x + 4; wx < x + w - 10; wx += 16) g.fillRect(wx, base - sh + 6, 11, sh - 8);
  g.fillStyle = css([40, 36, 40]);
  g.fillRect(x + w * 0.62, base - sh + 6, 5, sh - 6);
  // the awning: a striped canvas with a scalloped edge
  const ay = base - sh - 1;
  g.fillStyle = css(AW);
  fillPoly(g, [x + 1, ay - 3, x + w - 1, ay - 3, x + w + 1, ay + 4, x - 1, ay + 4], 0.2, i);
  g.fillStyle = css(shade(AW, 0.45));
  for (let sx = x + 2; sx < x + w - 3; sx += 6) fillPoly(g, [sx, ay - 3, sx + 3, ay - 3, sx + 3.6, ay + 4, sx + 0.6, ay + 4], 0, 0);
  g.fillStyle = css(AW);
  for (let sx = x; sx < x + w; sx += 4) dab(g, sx + 2, ay + 4, 2, 1.4, 0);
  if (o.lit2) brokenEdge(g, x + 1, ay - 3, x + w - 1, ay - 3, 1, o.lit2, 0.8, i + 9);
}

// The lobby's street: far pavement, road, near kerb, trees and lamps, all at the near rate.
function streetLobby(S, D, P) {
  const g = S.g;
  const st = D.outside.street;
  // far pavement over the buildings' feet
  vgrad(g, S.u0, st.far - 4, S.u1 - S.u0, 4, [196, 188, 172], 1, [176, 168, 154], 1);
  // the road
  vgrad(g, S.u0, st.far, S.u1 - S.u0, st.near - st.far, [116, 114, 116], 1, [96, 94, 98], 1);
  const R = rng(4411);
  for (let i = 0; i < 260; i++) {
    const u = R() * S.P;
    const y = st.far + 1 + R() * (st.near - st.far - 2);
    const col = R() < 0.5 ? [128, 126, 126] : [86, 84, 90];
    const len = 6 + R() * 22;
    g.fillStyle = css(col, 0.25 + R() * 0.25);
    S.rep(u, len, (uu) => dab(g, uu, y, len, 0.5 + R() * 0.5, 0));
  }
  // lane dashes, sunlit kerbs
  g.fillStyle = css([226, 220, 200], 0.75);
  for (let u = 0; u < S.P; u += 40) S.rep(u, 20, (uu) => fillPoly(g, rectPts(uu, 193.5, 18, 1.1), 0.15, u));
  vgrad(g, S.u0, st.far - 0.5, S.u1 - S.u0, 1.4, [222, 214, 196], 0.9, [160, 154, 146], 0.9);
  vgrad(g, S.u0, st.near, S.u1 - S.u0, WALL_BASE - st.near + 1, [214, 206, 188], 1, [190, 182, 166], 1);
  // trees on the far pavement
  for (const tr of D.outside.trees) {
    S.rep(tr.u, 30, (uu) => treeLobby(g, uu, st.far, tr.s, tr.u, P));
  }
  for (const l of D.outside.lamps) S.rep(l.u, 10, (uu) => lampPost(g, uu, st.far, P));
}
function treeLobby(g, x, y, s, seed, P) {
  // a Washingtonia palm: a tall, slightly bent trunk and a mop of fronds, lit from the left
  const R = rng(seed + 31);
  const top = [x + 2 * s, y - 40 * s];
  g.fillStyle = css([120, 96, 84]);
  limb(g, [[x, y + 1], [x + 0.6 * s, y - 18 * s], top], 2.2 * s, 1.4 * s, seed);
  g.fillStyle = css([170, 140, 120], 0.6);
  for (let yy = y - 4; yy > top[1] + 2; yy -= 2.4) g.fillRect(x - 0.8 + (y - yy) * 0.05, yy, 1.4, 0.5);
  for (let f = 0; f < 11; f++) {
    const a = -Math.PI / 2 + (f - 5) * 0.34 + (R() - 0.5) * 0.15;
    const L = (10 + R() * 5) * s;
    const ex = top[0] + Math.cos(a) * L;
    const ey = top[1] + Math.sin(a) * L * 0.55 + L * 0.35;
    const lit = Math.cos(a) < 0;
    g.fillStyle = css(lit ? [118, 150, 104] : [70, 100, 84]);
    limb(g, [top, [(top[0] + ex) / 2, top[1] - 2 * s], [ex, ey]], 2.4 * s, 0.3, seed + f);
  }
  g.fillStyle = css([150, 120, 80]);
  dab(g, top[0], top[1] + 1.5 * s, 2 * s, 2.4 * s, 0);
}
function lampPost(g, x, y, P) {
  g.fillStyle = css([40, 50, 46]);
  fillPoly(g, [x - 1.2, y + 1, x - 0.7, y - 40, x + 0.7, y - 40, x + 1.2, y + 1], 0.1, x);
  fillPoly(g, [x - 3, y - 40, x + 3, y - 40, x + 2, y - 46, x - 2, y - 46], 0.1, x + 1);
  g.fillStyle = css([236, 230, 206], 0.85);
  g.fillRect(x - 1.6, y - 45, 3.2, 4.2);
  brokenEdge(g, x - 0.8, y - 39, x - 0.8, y, 0.7, [190, 196, 170], 0.7, x + 2);
}

function buildOutside(k, D, P) {
  const O = D.outside;
  const G = D.glass;
  const exec = D.id === 'exec';
  const top = G.top - 40;
  const bottom = WALL_BASE + 8;
  const farO = {
    faces: [P.far.body, shade(P.far.body, -0.04), shade(P.far.body, 0.04)], far: true, hazeCol: P.far.haze,
    windows: true, win: P.win, lit: exec, winLit: P.winLit ?? [255, 210, 140], lit2: P.far.lit, rimA: 0.5,
    rimSide: exec ? 'auto' : 'left', sunX: O.sun ? O.sun.x : 0, seed: 11,
  };
  const far = makeStrip(k, exec ? 0.8 : 0.6, 1400, top, bottom, (S) => {
    for (const b of O.far) S.rep(b.u, b.w, (uu) => building(S.g, b, uu, farO));
    if (exec) {
      // the haze lying over the city far below
      vgrad(S.g, S.u0, O.horizon - 6, S.u1 - S.u0, 30, P.far.haze, 0, P.far.haze, 0.55);
      vgrad(S.g, S.u0, O.horizon - 30, S.u1 - S.u0, 24, P.far.haze, 0, P.far.haze, 0.25);
    } else {
      vgrad(S.g, S.u0, O.horizon - 40, S.u1 - S.u0, 44, P.far.haze, 0, P.far.haze, 0.5);
    }
  });
  const nearO = {
    faces: P.faces, far: false, windows: true, win: P.win, winSky: P.winSky, lit: exec, winLit: P.winLit,
    lit2: P.faceLit, rimA: exec ? 0.7 : 0.9, rimSide: D.id === 'lobby' ? 'left' : 'auto', sunX: O.sun ? O.sun.x : 240,
    ledges: true, shops: D.id === 'lobby', seed: 23, base: D.id === 'open' ? 170 : undefined,
    hazeCol2: P.faceHaze, hazeA: D.id === 'lobby' ? 0.55 : exec ? 0.45 : 0.5, winA: D.id === 'lobby' ? 0.4 : 0.5,
  };
  const near = makeStrip(k, 1, 1200, top, bottom, (S) => {
    for (const b of O.near) S.rep(b.u, b.w, (uu) => building(S.g, b, uu, nearO));
    if (D.id === 'lobby') streetLobby(S, D, P);
    if (exec) {
      // the horizon glow catches each tower's foot (their aircraft lamps blink per frame)
      vgrad(S.g, S.u0, 176, S.u1 - S.u0, 34, P.far.haze, 0, P.far.haze, 0.7);
    }
    if (D.id === 'open') {
      // twenty-three floors up, the street is a long way off: noon haze over the roofs
      S.g.save();
      S.g.globalCompositeOperation = 'source-atop';
      vgrad(S.g, S.u0, 40, S.u1 - S.u0, 130, P.far.haze, 0.12, P.far.haze, 0.4);
      S.g.restore();
    }
  });
  const clouds = O.clouds.map((c, i) => buildCloud(k * 0.6, c, P, i, exec));
  return { far, near, clouds };
}

// Small outside sprites: cars, flyers, the cradle.
function buildCars(k) {
  const mk = (kind) => {
    const L = { cab: [30, 12, [240, 196, 56]], car: [28, 10, [196, 200, 210]], bus: [64, 22, [236, 232, 226]] }[kind];
    const [w, h, col] = L;
    const wheels = kind === 'bus' ? [9, w - 10] : [6, w - 6];
    return massSprite(k, [-2, -h - 3, w + 4, h + 5], (g) => {
      if (kind === 'bus') fillPoly(g, [0, -3, 0, -h + 2, 2, -h, w - 3, -h, w, -h + 4, w, -3], 0.15, 1);
      else if (kind === 'cab') fillPoly(g, [0, -3, 0, -h * 0.56, w * 0.24, -h * 0.58, w * 0.3, -h, w * 0.7, -h, w * 0.78, -h * 0.58, w, -h * 0.56, w, -3], 0.12, 1);
      // the wedge: long, low, a sharp nose and a flat deck
      else fillPoly(g, [0, -3, 0, -h * 0.62, w * 0.36, -h, w * 0.66, -h, w, -h * 0.42, w, -3], 0.12, 1);
      for (const wx of wheels) dab(g, wx, -2.5, 2.6, 2.6, 0);
    }, { body: col, dark: shade(col, -0.28), lit: shade(col, 0.5), rim: 0.8, rimA: 0.9, rimDir: [-0.6, -0.8], dabs: 0.2, dab: 1.4, seed: w }, (g) => {
      g.fillStyle = css([110, 150, 180], 0.9);
      if (kind === 'bus') {
        for (let wx = 4; wx < w - 8; wx += 8) g.fillRect(wx, -h + 4, 6, 6);
        g.fillStyle = css([236, 96, 150]);
        g.fillRect(0, -h + 12, w, 1.6);
        g.fillStyle = css([60, 170, 176]);
        g.fillRect(0, -h + 14, w, 1.6);
        g.fillStyle = css([255, 160, 60]);
        g.fillRect(w - 18, -h + 1, 14, 2.4);
      } else if (kind === 'cab') {
        fillPoly(g, [w * 0.32, -h * 0.6, w * 0.34, -h * 0.93, w * 0.49, -h * 0.93, w * 0.49, -h * 0.6], 0, 0);
        fillPoly(g, [w * 0.52, -h * 0.6, w * 0.52, -h * 0.93, w * 0.68, -h * 0.93, w * 0.74, -h * 0.6], 0, 0);
        g.fillStyle = css([40, 36, 30]);
        g.fillRect(w * 0.42, -h - 1.6, 5, 1.8);
        g.fillRect(1, -h * 0.36, w - 2, 0.8);
      } else {
        fillPoly(g, [w * 0.38, -h * 0.66, w * 0.42, -h * 0.94, w * 0.62, -h * 0.94, w * 0.7, -h * 0.66], 0, 0);
        g.fillStyle = css([90, 92, 104], 0.8);
        for (let lx = w * 0.72; lx < w * 0.92; lx += 1.6) g.fillRect(lx, -h * 0.7, 0.6, 2.4);
        g.fillStyle = css([150, 154, 166]);
        g.fillRect(1, -h * 0.4, w - 2, 0.7);
      }
      g.fillStyle = css([28, 26, 30]);
      for (const wx of wheels) dab(g, wx, -2.5, 2.6, 2.6, 0);
      g.fillStyle = css([170, 170, 176]);
      for (const wx of wheels) dab(g, wx, -2.5, 1.1, 1.1, 0);
    });
  };
  return { cab: mk('cab'), car: mk('car'), bus: mk('bus') };
}
function buildBlimp(k) {
  // nose to the left; `right` mirrors the hull but not the lettering
  const mk = (sd) => massSprite(k, [-35, -14, 70, 28], (g) => {
    fillPoly(g, arcPts(0, 0, 30, 10, 0, TAU, 50), 0.2, 3);
    fillPoly(g, [22 * sd, -2, 33 * sd, -10, 35 * sd, -9, 30 * sd, 0, 35 * sd, 9, 33 * sd, 10, 22 * sd, 2], 0.2, 4);
    fillPoly(g, rectPts(-6, 9, 12, 4), 0.2, 5);
  }, { body: [214, 214, 216], dark: [150, 156, 168], lit: [255, 255, 250], rim: 1.2, rimA: 0.9, rimDir: [-0.3, -0.95], dabs: 0.3, dab: 2, seed: 77, g0: 0.2 }, (g) => {
    text(g, 'EGGCORP', -2 * sd, 3, 8, [170, 60, 50], { weight: 'bold' });
    g.fillStyle = css([60, 64, 74], 0.8);
    g.fillRect(-4, 10, 8, 1.6);
  });
  return { left: mk(1), right: mk(-1) };
}
function buildHeli(k) {
  return massSprite(k, [-16, -8, 34, 14], (g) => {
    fillPoly(g, arcPts(-3, 0, 8, 4.5, 0, TAU, 30), 0.15, 1);
    fillPoly(g, [3, -1.4, 15, -0.8, 15, 0.8, 3, 1.4], 0.1, 2);
    fillPoly(g, rectPts(13, -4, 1.4, 5), 0, 3);
    g.fillRect(-9, 4.5, 12, 0.8);
    g.fillRect(-0.6, -6, 1.2, 2.4);
  }, { body: [34, 30, 48], dark: [24, 20, 36], lit: [240, 150, 100], rim: 0.7, rimA: 0.9, rimDir: [0.5, 0.86], dabs: 0.2, dab: 1, seed: 66 }, (g) => {
    g.fillStyle = css([255, 210, 150], 0.7);
    fillPoly(g, [-9, -2, -5, -3.5, -5, 0, -9, 0], 0, 0);
  });
}
function buildCradle(k, P) {
  return massSprite(k, [-4, -26, 62, 36], (g) => {
    fillPoly(g, rectPts(0, 0, 52, 7), 0.2, 1);
    fillPoly(g, rectPts(-1, -12, 54, 1.4), 0.1, 2);
    for (const x of [0, 13, 26, 39, 51]) g.fillRect(x, -12, 1.2, 12);
    // the cleaner: grey coveralls, a yellow hard hat
    fillPoly(g, [18, 0, 18, -13, 20, -17, 25, -17, 27, -13, 27, 0], 0.2, 3);
    dab(g, 22.5, -20, 3, 3.2, 0);
  }, { body: [120, 124, 128], dark: [84, 88, 96], lit: [240, 240, 228], rim: 0.8, rimA: 0.85, rimDir: [-0.3, -0.95], dabs: 0.2, dab: 1.2, seed: 88 }, (g) => {
    g.fillStyle = css([226, 186, 140]);
    dab(g, 22.5, -19.5, 2.4, 2.6, 0);
    g.fillStyle = css([232, 196, 60]);
    fillPoly(g, [19.4, -21, 20.4, -23.6, 24.6, -23.6, 25.8, -21], 0, 0);
    g.fillStyle = css([92, 100, 112]);
    fillPoly(g, rectPts(18.2, -13, 8.6, 13), 0, 0);
    g.fillStyle = css([210, 120, 50]);
    fillPoly(g, rectPts(0, 1.5, 52, 2), 0, 0);
    text(g, 'SPARKLE CO', 26, 6.6, 3.6, [240, 236, 220], { weight: 'bold' });
  });
}

function paintOutside(ctx, f, B, P) {
  const O = f.outside;
  const G = f.glass;
  ctx.save();
  ctx.beginPath();
  for (const b of f.wall.bays) if (b.type === 'glass') ctx.rect(b.x0, G.top, b.x1 - b.x0, G.bottom - G.top);
  ctx.clip();
  ctx.drawImage(B.sky.c, 0, B.sky.top, W, B.sky.h);
  for (const s of O.stars) {
    ctx.globalAlpha = 0.25 + 0.6 * s.twinkle;
    ctx.fillStyle = '#fff4e0';
    const d = 0.5 + s.s * 0.7;
    ctx.fillRect(s.x - d / 2, s.y - d / 2, d, d);
  }
  ctx.globalAlpha = 1;
  const exec = f.floor === 'exec';
  if (!exec) for (const c of O.clouds) blit(ctx, B.out.clouds[c.i], c.x, c.y - c.h * 0.55);
  const C = f.floorPlane.shiftBottom;
  drawStrip(ctx, B.out.far, C * 0.015);
  for (const l of O.cityLights) {
    ctx.globalAlpha = 0.35 + 0.6 * l.a;
    const hsh = hash(Math.round(l.y * 37 + l.s * 101));
    ctx.fillStyle = hsh < 0.18 ? '#ff8ccc' : hsh < 0.3 ? '#8ff2ea' : l.s > 1 ? '#ffe2a8' : '#ffc77a';
    ctx.fillRect(l.x, l.y, l.s * 0.9, l.s * 0.7);
  }
  ctx.globalAlpha = 1;
  if (exec) for (const c of O.clouds) blit(ctx, B.out.clouds[c.i], c.x, c.y - c.h * 0.55);
  const nearShift = C * (f.floor === 'lobby' ? 0.1 : 0.04);
  drawStrip(ctx, B.out.near, nearShift);
  if (O.flyer && O.flyer.kind === 'blimp') blit(ctx, O.flyer.dir < 0 ? B.blimp.left : B.blimp.right, O.flyer.x, O.flyer.y);
  if (exec) cityNeon(ctx, f, O);
  if (exec) {
    // aircraft lamps blinking on the towers' masts
    const blink = (Math.sin(f.t * 3.1) > 0.4) ? 1 : 0.2;
    for (const b of O.near) {
      if (b.roof !== 'antenna' && b.roof !== 'spire') continue;
      const hgt = b.roof === 'spire' ? 30 + (b.i % 3) * 8 : 22;
      glow(ctx, b.x + b.w / 2, b.top - hgt, 4, [255, 80, 60], 0.55 * blink);
      ctx.fillStyle = css([255, 120, 90], 0.5 + 0.5 * blink);
      ctx.fillRect(b.x + b.w / 2 - 0.6, b.top - hgt - 0.6, 1.2, 1.2);
    }
  }
  for (const c of O.cars) blitFlip(ctx, B.cars[c.kind], c.dir > 0 ? c.x : c.x + c.w, c.y, c.dir < 0);
  if (O.flyer && O.flyer.kind === 'birds') {
    ctx.fillStyle = css([60, 64, 74]);
    for (let n = 0; n < 5; n++) {
      const bx = O.flyer.x + n * 8 - (n % 2) * 3;
      const by = O.flyer.y + (n % 3) * 3 - n;
      const flap = Math.sin((O.flyer.phase + n * 0.23) * TAU);
      ctx.beginPath();
      ctx.moveTo(bx - 3, by - flap * 1.6);
      ctx.quadraticCurveTo(bx - 1.2, by - 0.8, bx, by + 0.4);
      ctx.quadraticCurveTo(bx + 1.2, by - 0.8, bx + 3, by - flap * 1.6);
      ctx.quadraticCurveTo(bx + 1.2, by + 0.2, bx, by + 1.1);
      ctx.quadraticCurveTo(bx - 1.2, by + 0.2, bx - 3, by - flap * 1.6);
      ctx.fill();
    }
  }
  if (O.flyer && O.flyer.kind === 'heli') {
    const fl = O.flyer;
    blitFlip(ctx, B.heli, fl.x, fl.y, fl.dir < 0);
    const a = fl.phase * TAU;
    ctx.fillStyle = css([30, 26, 40], 0.85);
    const span = 15 * Math.abs(Math.cos(a));
    ctx.fillRect(fl.x - 1 - span, fl.y - 6.4, span * 2, 0.9);
    ctx.fillStyle = css([30, 26, 40], 0.18);
    ctx.fillRect(fl.x - 16, fl.y - 6.6, 30, 1.3);
    const blink = Math.sin(f.t * 5) > 0.5;
    if (blink) glow(ctx, fl.x + (fl.dir < 0 ? -14 : 14), fl.y - 3, 4, [255, 60, 50], 0.8);
  }
  if (f.wall.cradle) {
    const c = f.wall.cradle;
    ctx.fillStyle = css([50, 54, 60], 0.85);
    ctx.fillRect(c.x + 3, 0, 0.9, c.y - 11);
    ctx.fillRect(c.x + c.w - 4, 0, 0.9, c.y - 11);
    blit(ctx, B.cradle, c.x, c.y);
    // the squeegee on its pole, swiping the glass
    const sx = c.x + 30 + c.swipe * 14;
    const sy = c.y - 30 + Math.sin(c.swipe * Math.PI) * 4;
    ctx.strokeStyle = css([70, 74, 80]);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(c.x + 26, c.y - 12);
    ctx.lineTo(sx, sy + 3);
    ctx.stroke();
    ctx.fillStyle = css([40, 44, 50]);
    ctx.fillRect(sx - 3.5, sy, 7, 1.8);
    // the wet arc it leaves on the pane
    ctx.fillStyle = css([255, 255, 255], 0.16);
    dab(ctx, c.x + 37, c.y - 28, 10, 4, -0.1);
  }
  ctx.restore();
}

// Nighthawks: at dusk the glass gives the room back. The pendant lamps hang in it, small
// and far, at the depth of their mirror image behind the glass (a lamp at the mid depth,
// mirrored in the wall, sits three times as far off: rate 0.16), so they slide slower
// than the wall itself and drift toward the horizon.
function glassReflections(ctx, f, P) {
  const D = OFFICE_FLOORS[f.floor];
  const C = f.floorPlane.shiftBottom;
  const G = f.glass;
  const mr = 0.16;
  const sc = mr / 0.48;
  const ry = (y) => HORIZON + (y - HORIZON) * sc;
  ctx.save();
  ctx.beginPath();
  for (const b of f.wall.bays) if (b.type === 'glass') ctx.rect(b.x0, G.top, b.x1 - b.x0, G.bottom - G.top);
  ctx.clip();
  const yLamp = ry(f.ceilingY + D.lights.drop);
  const yCeil = ry(f.ceilingY);
  // the ceiling's warm cornice line, and the boardroom's lamplight low in the glass
  ctx.fillStyle = css(P.warm, 0.12);
  ctx.fillRect(0, yCeil - 0.5, W, 1);
  const base = ry(MID_BASE - 26);
  for (const u of D.lights.us) {
    const X = uOfMid(u);
    const n0 = Math.floor((C - 2000 - X) / P_FLOOR);
    for (let n = n0; n < n0 + 6; n++) {
      const x = mr * (X + n * P_FLOOR - C) + (1 - mr) * VP;
      if (x < -20 || x > W + 20) continue;
      ctx.fillStyle = css([20, 30, 30], 0.3);
      ctx.fillRect(x - 0.2, yCeil, 0.4, yLamp - yCeil - 2);
      glow(ctx, x, yLamp + 1, 12, P.warm, 0.3);
      ctx.fillStyle = css([150, 110, 60], 0.55);
      ctx.beginPath();
      ctx.moveTo(x - 0.5, yLamp - 3.6);
      ctx.lineTo(x + 0.5, yLamp - 3.6);
      ctx.lineTo(x + 3.3, yLamp);
      ctx.lineTo(x - 3.3, yLamp);
      ctx.fill();
      ctx.fillStyle = css([255, 226, 170], 0.75);
      ctx.fillRect(x - 2.8, yLamp, 5.6, 0.7);
      // its pool on the table, mirrored too
      glow(ctx, x, base, 16, P.warm, 0.12);
    }
  }
  ctx.restore();
}

// The neon coming on across the city at dusk: each tower's sign switches on at its own
// moment in a twelve-second cycle, stutters, and holds — a pink strip up a lit edge, a
// teal sign on a roof, a pink line along a crown.
function cityNeon(ctx, f, O) {
  const cyc = ((f.t % 12) + 12) % 12;
  for (const b of O.near) {
    const at = 0.5 + hash(b.i * 7.3 + 1) * 9;
    if (cyc < at) continue;
    const since = cyc - at;
    const on = since < 0.5 ? (hash(Math.floor(f.t * 20) + b.i) > 0.5 ? 1 : 0.15) : 1;
    const kind = b.i % 3;
    const pink = [255, 96, 176];
    const teal = [80, 236, 226];
    ctx.save();
    ctx.globalAlpha = on;
    ctx.lineCap = 'round';
    if (kind === 0) {
      const x = b.x + b.w / 2 > f.outside.sun.x ? b.x + 1.2 : b.x + b.w - 1.2;
      ctx.strokeStyle = css(pink, 0.22);
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, b.top + 4); ctx.lineTo(x, b.top + 44); ctx.stroke();
      ctx.strokeStyle = css([255, 210, 236]);
      ctx.lineWidth = 0.7;
      ctx.stroke();
    } else if (kind === 1) {
      const sw = Math.min(b.w - 4, 22);
      const sx = b.x + (b.w - sw) / 2;
      glow(ctx, sx + sw / 2, b.top - 5, sw * 0.7, teal, 0.22);
      ctx.fillStyle = css([20, 30, 40], 0.8);
      ctx.fillRect(sx, b.top - 8, sw, 5);
      ctx.strokeStyle = css(teal);
      ctx.lineWidth = 0.6;
      ctx.strokeRect(sx + 0.5, b.top - 7.5, sw - 1, 4);
      ctx.fillStyle = css([210, 255, 250]);
      for (let lx = sx + 2; lx < sx + sw - 2; lx += 2.6) ctx.fillRect(lx, b.top - 6.6, 1.4, 2.2);
      ctx.fillStyle = css([40, 34, 50]);
      ctx.fillRect(sx + 3, b.top - 3, 0.6, 3);
      ctx.fillRect(sx + sw - 3.6, b.top - 3, 0.6, 3);
    } else {
      ctx.strokeStyle = css(pink, 0.25);
      ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(b.x + 1, b.top + 1.4); ctx.lineTo(b.x + b.w - 1, b.top + 1.4); ctx.stroke();
      ctx.strokeStyle = css([255, 210, 236]);
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ================================================================== THE WALL
function buildWall(k, D, P, B) {
  const floor = D.id;
  const G = D.glass;
  const Wl = D.wall;
  const strip = makeStrip(k, 1, Wl.period, 0, WALL_BASE, (S) => {
    const g = S.g;
    // 1. the wall material over everything, then the ceiling band
    if (floor === 'lobby') lobbyWallBase(S, D, P);
    else if (floor === 'open') openWallBase(S, D, P);
    else execWallBase(S, D, P);
    // 2. columns, 3. what hangs on the wall
    for (const c of Wl.columns) S.rep(c.u, c.w, (uu) => column(S, uu, c.w, D, P, c));
    Wl.hangs.forEach((h, i) => S.rep(h.u, h.w || h.r * 2 || 40, (uu) => hang(S, { ...h, i, x: uu, y: h.y ?? WALL_BASE - h.h }, D, P)));
    // 4. light and shade over it all
    wallLight(S, D, P);
  });
  mottle(strip, floor === 'exec' ? 0.4 : floor === 'open' ? 0.22 : 0.3, 31 + D.stage);
  // 5. cut the glass out, and dress it
  const g = strip.g;
  g.save();
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = '#000';
  for (const b of Wl.bays) {
    if (b.type !== 'glass') continue;
    for (const n of [-1, 0, 1]) {
      const u = b.u + n * Wl.period;
      g.fillRect(u, G.top, b.u1 - b.u, G.bottom - G.top);
    }
  }
  g.restore();
  const S = { g, P: Wl.period, u0: -STRIP_M, u1: Wl.period + W + STRIP_M, top: 0, bottom: WALL_BASE, r: strip.r, k,
    rep(u, w, fn) { for (const n of [-1, 0, 1]) { const uu = u + n * Wl.period; if (uu + w > this.u0 - 30 && uu < this.u1 + 30) fn(uu); } } };
  for (const b of Wl.bays) if (b.type === 'glass') S.rep(b.u, b.u1 - b.u, (uu) => glassBay(S, uu, uu + b.u1 - b.u, b, D, P));
  retile(strip);
  return strip;
}

function lobbyWallBase(S, D, P) {
  const g = S.g;
  const cy = D.ceilingY;
  // travertine, in the soft shade of a wall that faces the light's way
  const gr = g.createLinearGradient(0, cy, 0, WALL_BASE);
  gr.addColorStop(0, css(P.wallTop));
  gr.addColorStop(0.35, css(P.wall));
  gr.addColorStop(0.85, css(shade(P.wall, 0.04)));
  gr.addColorStop(1, css(shade(P.wall, -0.08)));
  g.fillStyle = gr;
  g.fillRect(S.u0, cy, S.u1 - S.u0, WALL_BASE - cy);
  const R = rng(321);
  // rose granite: a polished stone, flecked dark plum, pale pink and black
  const grains = [shade(P.wall, -0.22), shade(P.wall, 0.16), [40, 30, 40], [226, 196, 196]];
  for (let i = 0; i < 2200; i++) {
    const u = R() * S.P;
    const y = cy + R() * (WALL_BASE - cy);
    const r = 0.35 + R() * 0.9;
    g.fillStyle = css(grains[(R() * 4) | 0], 0.3 + R() * 0.35);
    S.rep(u, 2, (uu) => dab(g, uu, y, r, r * (0.6 + R() * 0.4), R() * TAU));
  }
  // the polish: a soft vertical sheen down each panel
  for (let u = 20; u < S.P; u += 55) {
    S.rep(u, 30, (uu) => {
      g.fillStyle = css([255, 236, 236], 0.07);
      fillPoly(g, rectPts(uu, cy, 9, WALL_BASE - cy), 1.2, u);
    });
  }
  // panel joints: three courses, and a vertical every 55 px from each bay's edge
  for (const b of D.wall.bays) {
    if (b.type !== 'wall') continue;
    S.rep(b.u, b.u1 - b.u, (x0) => {
      const x1 = x0 + (b.u1 - b.u);
      for (const y of [62, 110, 158]) {
        g.fillStyle = css(P.joint, 0.55);
        fillPoly(g, rectPts(x0, y - 0.4, x1 - x0, 0.8), 0.15, y + x0);
        brokenEdge(g, x0, y + 0.8, x1, y + 0.8, 0.6, P.wallLit, 0.45, y + b.u);
      }
      for (let x = x0 + 55; x < x1 - 10; x += 55) {
        g.fillStyle = css(P.joint, 0.4);
        fillPoly(g, rectPts(x - 0.35, cy, 0.7, WALL_BASE - cy), 0.12, x);
      }
    });
  }
  // the bronze skirting
  box(g, S.u0, WALL_BASE - 5, S.u1 - S.u0, 5, { body: P.bronze, dark: P.bronzeDark, lit: P.bronzeLit, dabs: 0.03, rimA: 0.6, wob: 0 });
  // ceiling: a dark coffered soffit and its lit cornice
  vgrad(g, S.u0, 0, S.u1 - S.u0, cy, shade(P.ceil, -0.15), 1, P.ceil, 1);
  for (let u = 0; u < S.P; u += 48) S.rep(u, 40, (uu) => box(g, uu + 3, 2, 42, cy - 5, { body: shade(P.ceil, -0.08), dark: shade(P.ceil, 0.06), dabs: 0.02, wob: 0.2, seed: u }));
  box(g, S.u0, cy - 2.5, S.u1 - S.u0, 2.5, { body: [196, 182, 158], dark: [170, 156, 134], lit: [236, 224, 200], dabs: 0, wob: 0 });
  // the glass bays' bronze header beam
  for (const b of D.wall.bays) {
    if (b.type !== 'glass') continue;
    S.rep(b.u, b.u1 - b.u, (x0) => box(g, x0 - 2, cy, b.u1 - b.u + 4, D.glass.top - cy + 1, { body: P.bronze, dark: P.bronzeDark, lit: P.bronzeLit, rimTop: false, edge: P.bronzeDark, dabs: 0.05, wob: 0.1 }));
  }
}
function openWallBase(S, D, P) {
  const g = S.g;
  const cy = D.ceilingY;
  const gr = g.createLinearGradient(0, cy, 0, WALL_BASE);
  gr.addColorStop(0, css(P.wallTop));
  gr.addColorStop(0.3, css(P.wall));
  gr.addColorStop(1, css(shade(P.wall, -0.06)));
  g.fillStyle = gr;
  g.fillRect(S.u0, cy, S.u1 - S.u0, WALL_BASE - cy);
  const R = rng(522);
  // flat emulsion laid on with a broad brush: big soft dabs
  for (let i = 0; i < 900; i++) {
    const u = R() * S.P;
    const y = cy + R() * (WALL_BASE - cy);
    const rx = 4 + R() * 10;
    g.fillStyle = css(R() < 0.5 ? shade(P.wall, -0.05) : shade(P.wall, 0.06), 0.12 + R() * 0.16);
    S.rep(u, rx, (uu) => dab(g, uu, y, rx, rx * (0.35 + R() * 0.3), (R() - 0.5) * 0.4));
  }
  // two-tone paint, period-perfect: a deeper green below a cream dado on the sill line
  const dado = D.glass.bottom;
  vgrad(g, S.u0, dado, S.u1 - S.u0, WALL_BASE - dado, P.wallLow, 1, shade(P.wallLow, -0.12), 1);
  for (let i = 0; i < 700; i++) {
    const u = R() * S.P;
    const y = dado + R() * (WALL_BASE - dado);
    const rx = 3 + R() * 8;
    g.fillStyle = css(R() < 0.5 ? shade(P.wallLow, -0.07) : shade(P.wallLow, 0.07), 0.14 + R() * 0.14);
    S.rep(u, rx, (uu) => dab(g, uu, y, rx, rx * (0.3 + R() * 0.3), (R() - 0.5) * 0.3));
  }
  box(g, S.u0, dado - 1, S.u1 - S.u0, 4, { body: P.trim, dark: shade(P.trim, -0.18), lit: P.trimLit, dabs: 0.02, wob: 0, rimA: 0.9 });
  // skirting
  box(g, S.u0, WALL_BASE - 5, S.u1 - S.u0, 5, { body: P.skirting, dark: shade(P.skirting, -0.2), lit: shade(P.skirting, 0.35), dabs: 0.03, rimA: 0.6, wob: 0 });
  // the ceiling: acoustic tile in the tubes' flat light, and its edge trim
  vgrad(g, S.u0, 0, S.u1 - S.u0, cy, shade(P.ceil, -0.3), 1, P.ceil, 1);
  for (const y of [8, 17, 25, 31]) {
    g.fillStyle = css(shade(P.ceil, -0.18), 0.5);
    g.fillRect(S.u0, y, S.u1 - S.u0, 0.6);
  }
  for (let i = 0; i < 700; i++) {
    const u = R() * S.P;
    const y = R() * cy;
    g.fillStyle = css(R() < 0.5 ? shade(P.ceil, -0.08) : shade(P.ceil, 0.06), 0.3);
    S.rep(u, 2, (uu) => dab(g, uu, y, 0.6, 0.5, 0));
  }
  box(g, S.u0, cy - 2, S.u1 - S.u0, 2.4, { body: P.trim, dark: shade(P.trim, -0.15), lit: P.trimLit, dabs: 0, wob: 0 });
  // ribbon window bays: wall above, a sill, and the radiator strip below
  for (const b of D.wall.bays) {
    if (b.type !== 'glass') continue;
    S.rep(b.u, b.u1 - b.u, (x0) => {
      const w = b.u1 - b.u;
      const gb = D.glass.bottom;
      box(g, x0, gb + 4, w, WALL_BASE - gb - 4, { body: [196, 186, 170], dark: [164, 154, 140], lit: [240, 232, 218], dabs: 0.03, seed: x0 });
      g.fillStyle = css([140, 130, 120], 0.6);
      for (let y = gb + 10; y < WALL_BASE - 10; y += 2.4) g.fillRect(x0 + 4, y, w - 8, 0.9);
      box(g, x0 + 4, WALL_BASE - 9, w - 8, 4, { body: [150, 156, 148], dark: [128, 134, 128], dabs: 0, seed: x0 + 1 });
      box(g, x0 - 3, gb, w + 6, 4, { body: P.trim, dark: shade(P.trim, -0.18), lit: P.trimLit, dabs: 0.03, seed: x0 + 2, rimA: 1 });
    });
  }
}
function execWallBase(S, D, P) {
  const g = S.g;
  const cy = D.ceilingY;
  // the upper wall: deep teal-green silk, darkening into the ceiling
  vgrad(g, S.u0, cy, S.u1 - S.u0, 134 - cy, shade(P.teal, -0.25), 1, P.teal, 1);
  const R = rng(733);
  // silk-stripe paper: a broad and a narrow stripe in two greens, dragged on dry
  for (let u = 0; u < S.P; u += 12) {
    S.rep(u, 12, (uu) => {
      g.fillStyle = css(P.tealLit, 0.07);
      g.fillRect(uu, cy, 5, 134 - cy);
      g.fillStyle = css(P.tealDark, 0.18);
      g.fillRect(uu + 8, cy, 1.2, 134 - cy);
    });
  }
  for (let i = 0; i < 900; i++) {
    const u = R() * S.P;
    const y = cy + R() * (134 - cy);
    const len = 4 + R() * 12;
    g.fillStyle = css(R() < 0.5 ? P.tealDark : P.tealLit, 0.06 + R() * 0.08);
    S.rep(u, 2, (uu) => dab(g, uu, y, 0.5 + R() * 0.7, len, 0));
  }
  // the walnut wainscot, from the dado rail down
  const dado = 132;
  vgrad(g, S.u0, dado, S.u1 - S.u0, WALL_BASE - dado, P.wood, 1, P.woodDark, 1);
  for (let i = 0; i < 1600; i++) {
    const u = R() * S.P;
    const y = dado + R() * (WALL_BASE - dado);
    const len = 3 + R() * 10;
    g.fillStyle = css(R() < 0.5 ? shade(P.wood, -0.18) : shade(P.wood, 0.12), 0.15 + R() * 0.2);
    S.rep(u, len, (uu) => dab(g, uu, y, len, 0.3 + R() * 0.4, 0));
  }
  for (const b of D.wall.bays) {
    if (b.type !== 'wall') continue;
    S.rep(b.u, b.u1 - b.u, (x0) => {
      const w = b.u1 - b.u;
      const n = Math.max(2, Math.round(w / 46));
      const pw = w / n;
      for (let p = 0; p < n; p++) {
        // raised panels: a lit top-left bevel, a dark bottom-right one
        const px = x0 + p * pw + 5;
        const pwid = pw - 10;
        const py = dado + 9;
        const ph = WALL_BASE - 14 - py;
        g.fillStyle = css(shade(P.wood, -0.25), 0.7);
        fillPoly(g, rectPts(px, py, pwid, ph), 0.2, px);
        box(g, px + 2, py + 2, pwid - 4, ph - 4, { body: shade(P.wood, 0.05), dark: P.wood, lit: P.woodLit, rimLeft: true, dabs: 0.08, dab: 3, dabAng: Math.PI / 2, seed: px * 3, rimA: 0.55 });
      }
    });
  }
  box(g, S.u0, dado - 3, S.u1 - S.u0, 4, { body: shade(P.wood, 0.1), dark: P.woodDark, lit: P.woodLit, dabs: 0.03, wob: 0, rimA: 0.9 });
  box(g, S.u0, WALL_BASE - 5, S.u1 - S.u0, 5, { body: P.woodDark, dark: shade(P.woodDark, -0.3), lit: P.woodLit, dabs: 0.02, wob: 0, rimA: 0.5 });
  // ceiling: a deep coffer in shadow, and the cornice
  vgrad(g, S.u0, 0, S.u1 - S.u0, cy, shade(P.ceil, -0.3), 1, P.ceil, 1);
  box(g, S.u0, cy - 3, S.u1 - S.u0, 3, { body: shade(P.wood, -0.1), dark: P.woodDark, lit: P.woodLit, dabs: 0, wob: 0, rimA: 0.6 });
  // glass bays: a header above, a low sill below
  for (const b of D.wall.bays) {
    if (b.type !== 'glass') continue;
    S.rep(b.u, b.u1 - b.u, (x0) => {
      box(g, x0, cy, b.u1 - b.u, D.glass.top - cy + 1, { body: P.tealDark, dark: shade(P.tealDark, -0.3), dabs: 0, wob: 0 });
      box(g, x0 - 2, D.glass.bottom - 1, b.u1 - b.u + 4, WALL_BASE - D.glass.bottom + 1, { body: P.woodDark, dark: shade(P.woodDark, -0.3), lit: P.woodLit, dabs: 0, wob: 0, rimA: 0.6 });
    });
  }
}

function column(S, x, w, D, P, c) {
  const g = S.g;
  const cy = D.ceilingY;
  const fl = D.id;
  if (fl === 'lobby') {
    // dark verde marble, backlit by the glass either side: two lit edges, a deep core
    const gr = g.createLinearGradient(x, 0, x + w, 0);
    gr.addColorStop(0, css(mix(P.column, P.columnLit, 0.55)));
    gr.addColorStop(0.18, css(P.column));
    gr.addColorStop(0.55, css(P.columnDark));
    gr.addColorStop(0.85, css(P.column));
    gr.addColorStop(1, css(mix(P.column, P.columnLit, 0.4)));
    g.fillStyle = gr;
    fillPoly(g, rectPts(x, cy, w, WALL_BASE - cy), 0.2, x);
    const R = rng(c.u + 5);
    g.save();
    g.beginPath();
    g.rect(x, cy, w, WALL_BASE - cy);
    g.clip();
    for (let i = 0; i < 26; i++) {
      // pale veins wandering down the stone
      g.strokeStyle = css(P.columnLit, 0.12 + R() * 0.12);
      g.lineWidth = 0.3 + R() * 0.4;
      g.beginPath();
      let vx = x + R() * w;
      let vy = cy + R() * (WALL_BASE - cy);
      g.moveTo(vx, vy);
      for (let s = 0; s < 6; s++) { vx += (R() - 0.5) * 5; vy += 3 + R() * 6; g.lineTo(vx, vy); }
      g.stroke();
    }
    g.restore();
    brokenEdge(g, x + 0.6, cy, x + 0.6, WALL_BASE, 1.3, P.columnLit, 0.85, c.u);
    brokenEdge(g, x + w - 0.6, cy, x + w - 0.6, WALL_BASE, 1.1, P.columnLit, 0.6, c.u + 1);
    box(g, x - 1.5, cy, w + 3, 6, { body: P.bronze, dark: P.bronzeDark, lit: P.bronzeLit, dabs: 0, rimA: 0.7 });
    box(g, x - 1.5, WALL_BASE - 9, w + 3, 9, { body: P.bronze, dark: P.bronzeDark, lit: P.bronzeLit, dabs: 0.05, rimA: 0.8 });
  } else if (fl === 'open') {
    // a glass-block pier: daylight from the windows comes through it, so each block glows
    // aqua-white in its grey mortar, brightest at the top and on the window side
    box(g, x, cy, w, WALL_BASE - cy, { body: [150, 160, 166], dark: [120, 130, 138], dabs: 0, wob: 0.1, seed: c.u });
    const bs = w / 2;
    for (let y = cy + 1; y < WALL_BASE - 6; y += bs) {
      for (let col = 0; col < 2; col++) {
        const bx = x + col * bs + 0.6;
        const k0 = 1 - (y - cy) / (WALL_BASE - cy) * 0.35;
        const bg = g.createRadialGradient(bx + bs * 0.4, y + bs * 0.4, 0.5, bx + bs / 2, y + bs / 2, bs * 0.75);
        bg.addColorStop(0, css(mix(P.columnLit, [255, 255, 255], 0.3 * k0)));
        bg.addColorStop(1, css(mix(P.columnDark, P.column, k0 * 0.7)));
        g.fillStyle = bg;
        fillPoly(g, rectPts(bx, y + 0.6, bs - 1.2, bs - 1.2), 0.15, y * 3 + col);
        g.fillStyle = css([255, 255, 255], 0.35 * k0);
        g.fillRect(bx + 1, y + 1.4, bs * 0.3, 0.6);
      }
    }
    box(g, x - 1, WALL_BASE - 5, w + 2, 5, { body: P.skirting, dark: shade(P.skirting, -0.2), lit: shade(P.skirting, 0.35), dabs: 0, wob: 0 });
  } else {
    // a black lacquer pilaster with brass reveals, the room's lamplight sliding down it
    box(g, x, cy, w, WALL_BASE - cy, { body: P.lacquer, top: shade(P.lacquer, -0.2), dark: shade(P.lacquer, -0.3), lit: P.lacquerLit, rimLeft: true, rimTop: false, dabs: 0.04, dab: 3, dabAng: Math.PI / 2, seed: c.u });
    for (const f of [3, w - 4]) {
      g.fillStyle = css(P.brass, 0.85);
      g.fillRect(x + f, cy + 8, 0.9, WALL_BASE - cy - 18);
    }
    g.fillStyle = css(P.lacquerLit, 0.16);
    fillPoly(g, rectPts(x + w * 0.3, cy + 6, w * 0.22, WALL_BASE - cy - 14), 0.6, c.u + 3);
    box(g, x - 2, cy, w + 4, 6, { body: P.brass, dark: P.brassDark, lit: P.brassLit, dabs: 0, rimA: 0.8 });
    box(g, x - 2, WALL_BASE - 8, w + 4, 8, { body: P.brassDark, dark: shade(P.brassDark, -0.3), lit: P.brass, dabs: 0, rimA: 0.7 });
  }
}

// Wall-wide light and shade: the scallops of the downlights, shade under the ceiling and
// at the floor, the glass's halation on the walls beside it.
function wallLight(S, D, P) {
  const g = S.g;
  const cy = D.ceilingY;
  const fl = D.id;
  // shade under the ceiling and at the wall's foot
  vgrad(g, S.u0, cy, S.u1 - S.u0, 30, P.shadowTint, fl === 'exec' ? 0.5 : 0.28, P.shadowTint, 0);
  vgrad(g, S.u0, WALL_BASE - 16, S.u1 - S.u0, 16, P.shadowTint, 0, P.shadowTint, fl === 'exec' ? 0.35 : 0.18);
  if (fl === 'lobby') {
    // the wall-washer scallops: warm, from downlights hidden in the soffit
    for (let u = 28; u < S.P; u += 55) {
      const onWall = D.wall.bays.some((b) => b.type === 'wall' && u > b.u + 8 && u < b.u1 - 8);
      if (!onWall) continue;
      S.rep(u, 40, (uu) => {
        const top = cy + 1;
        const len = 58;
        const gr = g.createLinearGradient(0, top, 0, top + len);
        gr.addColorStop(0, css([255, 240, 204], 0.7));
        gr.addColorStop(0.35, css([255, 230, 188], 0.32));
        gr.addColorStop(1, css([255, 230, 188], 0));
        g.fillStyle = gr;
        const pts = [];
        for (let t = 0; t <= 1.0001; t += 0.08) pts.push(uu - 3 - 13 * Math.sqrt(t) * (1 - 0.35 * t), top + t * len);
        for (let t = 1; t >= -0.0001; t -= 0.08) pts.push(uu + 3 + 13 * Math.sqrt(t) * (1 - 0.35 * t), top + t * len);
        fillPoly(g, pts, 0.5, u);
        g.fillStyle = css([255, 250, 230], 0.5);
        dab(g, uu, top + 1.5, 4.5, 1.6, 0);
      });
    }
    // halation: the bright glass bleeding onto the stone beside it
    for (const b of D.wall.bays) {
      if (b.type !== 'glass') continue;
      S.rep(b.u, b.u1 - b.u, (x0) => {
        const x1 = x0 + b.u1 - b.u;
        hgrad(g, x0 - 50, cy, 50, WALL_BASE - cy, [255, 240, 210], 0, [255, 240, 210], 0.14);
        hgrad(g, x1, cy, 50, WALL_BASE - cy, [255, 240, 210], 0.14, [255, 240, 210], 0);
      });
    }
  } else if (fl === 'open') {
    // daylight from the ribbon windows washing the plaster beside them
    for (const b of D.wall.bays) {
      if (b.type !== 'glass') continue;
      S.rep(b.u, b.u1 - b.u, (x0) => {
        const x1 = x0 + b.u1 - b.u;
        hgrad(g, x0 - 60, cy, 60, WALL_BASE - cy, [250, 252, 240], 0, [250, 252, 240], 0.14);
        hgrad(g, x1, cy, 60, WALL_BASE - cy, [250, 252, 240], 0.14, [250, 252, 240], 0);
      });
    }
  } else {
    // dusk: the teal room in shadow, warm pools from picture lights and sconces
    for (const h of D.wall.hangs) {
      if (h.kind === 'portrait' || h.kind === 'painting') {
        S.rep(h.u, h.w, (x) => {
          const gr = g.createRadialGradient(x + h.w / 2, h.y - 6, 2, x + h.w / 2, h.y + h.h * 0.4, h.w * 1.1);
          gr.addColorStop(0, css(P.warm, 0.45));
          gr.addColorStop(0.5, css(P.warm, 0.12));
          gr.addColorStop(1, css(P.warm, 0));
          g.fillStyle = gr;
          g.fillRect(x - h.w * 0.7, h.y - 30, h.w * 2.4, h.h + 60);
        });
      }
    }
    for (const b of D.wall.bays) {
      if (b.type !== 'glass') continue;
      // the sunset glancing in onto the panelling beside each window
      S.rep(b.u, b.u1 - b.u, (x0) => {
        const x1 = x0 + b.u1 - b.u;
        hgrad(g, x0 - 40, cy, 40, WALL_BASE - cy, [255, 150, 90], 0, [255, 150, 90], 0.16);
        hgrad(g, x1, cy, 40, WALL_BASE - cy, [255, 150, 90], 0.16, [255, 150, 90], 0);
      });
    }
  }
}

// Glazing: a faint tint, slow diagonal reflections, mullions, transoms, blinds.
function glassBay(S, x0, x1, b, D, P) {
  const g = S.g;
  const G = D.glass;
  const fl = D.id;
  const w = x1 - x0;
  const R = rng(b.u * 3 + 17);
  // the tint and the reflections
  g.fillStyle = css(P.glass, P.glassA);
  g.fillRect(x0, G.top, w, G.bottom - G.top);
  for (let i = 0; i < Math.max(2, w / 70); i++) {
    const rx = x0 + R() * w;
    const rw = 6 + R() * 22;
    g.fillStyle = css(fl === 'exec' ? [255, 200, 160] : [255, 255, 255], 0.05 + R() * 0.05);
    g.save();
    g.beginPath();
    g.rect(x0, G.top, w, G.bottom - G.top);
    g.clip();
    g.beginPath();
    g.moveTo(rx, G.bottom);
    g.lineTo(rx + rw, G.bottom);
    g.lineTo(rx + rw + 70, G.top);
    g.lineTo(rx + 70, G.top);
    g.fill();
    g.restore();
  }
  // a reflection of the room's floor and furniture low in the glass
  vgrad(g, x0, G.bottom - 30, w, 30, P.ambient, 0, P.ambient, fl === 'exec' ? 0.22 : 0.12);
  const mullion = { body: P.mullion, lit: P.mullionLit, w: fl === 'lobby' ? 2.6 : fl === 'open' ? 2.2 : 1.8 };
  const rev = b.revolvingDoor != null ? x0 + (b.revolvingDoor - b.u) : null;
  // vertical blinds (open plan): slats hung from a head rail, drawn across `blinds` of the
  // bay and angled half open, backlit; drawn right back they stack at the left jamb
  if (fl === 'open') {
    const cover = Math.max(8, w * b.blinds);
    const gh = G.bottom - G.top;
    for (let x = x0; x < x0 + cover - 1; x += 4) {
      const stack = b.blinds === 0;
      const sw = stack ? 1.6 : 3.1;
      const xx = stack ? x0 + (x - x0) * 0.4 : x;
      box(g, xx, G.top + 2, sw, gh - 4, { body: [236, 226, 222], top: [244, 236, 234], dark: [214, 200, 202], lit: [255, 250, 248], rimTop: false, rimLeft: true, dabs: 0, wob: 0.1, rimA: 0.5, seed: x * 7 + x0 });
      g.fillStyle = css([180, 166, 170], 0.5);
      g.fillRect(xx + sw - 0.5, G.top + 2, 0.5, gh - 4);
      g.fillStyle = css([140, 130, 136], 0.8);
      g.fillRect(xx + 0.4, G.bottom - 3.4, sw - 0.8, 1);
    }
    box(g, x0, G.top, w, 2.6, { body: [214, 206, 204], dark: [186, 178, 178], lit: [250, 246, 244], dabs: 0, wob: 0 });
  }
  for (let x = x0; x <= x1 + 0.5; x += G.mullion) {
    const edge = x === x0 || x + G.mullion > x1 + 0.5;
    const mx = Math.min(x, x1);
    const mw = edge ? mullion.w + 1 : mullion.w;
    if (rev != null && Math.abs(mx - rev) < 24 && !edge) {
      box(g, mx - mw / 2, G.top, mw, (G.transom ?? G.bottom) - G.top, { body: mullion.body, lit: mullion.lit, rimTop: false, rimLeft: true, dabs: 0, wob: 0.1, rimA: 0.7, seed: mx });
      continue;
    }
    box(g, mx - mw / 2, G.top, mw, G.bottom - G.top, { body: mullion.body, lit: mullion.lit, rimTop: false, rimLeft: true, dabs: 0, wob: 0.1, rimA: 0.7, seed: mx });
  }
  if (G.transom) box(g, x0, G.transom - 1.6, w, 3.2, { body: mullion.body, lit: mullion.lit, dabs: 0, wob: 0.1, rimA: 0.8, seed: x0 + 5 });
  if (fl !== 'open') box(g, x0, G.bottom - 3, w, 3, { body: mullion.body, lit: mullion.lit, dabs: 0, wob: 0.1, rimA: 0.6, seed: x0 + 6 });
  box(g, x0, G.top, w, 2, { body: mullion.body, dabs: 0, wob: 0.1, seed: x0 + 7 });
  if (rev != null) {
    // the revolving door's drum: a bronze canopy and two curved jambs (the wings turn per frame)
    const top = G.transom;
    box(g, rev - 25, top - 1, 50, 8, { body: P.bronze, dark: P.bronzeDark, lit: P.bronzeLit, dabs: 0.05, rimA: 0.9, seed: rev });
    text(g, 'EGGCORP', rev, top + 5.4, 4.2, P.bronzeLit, { weight: 'bold', track: 0.6 });
    for (const sx of [-1, 1]) box(g, rev + sx * 23 - 1.6, top + 7, 3.2, G.bottom - top - 7, { body: P.bronzeDark, lit: P.bronzeLit, rimTop: false, rimLeft: sx < 0, rimRight: sx > 0, dabs: 0, wob: 0, seed: rev + sx });
    g.fillStyle = css(P.glass, 0.1);
    g.fillRect(rev - 22, top + 7, 44, G.bottom - top - 7);
  }
}

// Everything hung on or stood against the wall: its still part. (Lift doors, indicators,
// clock hands and the IN USE light are drawn per frame.)
function hang(S, h, D, P) {
  const g = S.g;
  const fl = D.id;
  switch (h.kind) {
    case 'lift': return liftSurround(g, h, D, P);
    case 'logo': return logo(g, h, P, S.k);
    case 'clock': return clockFace(g, h, D, P);
    case 'painting': return painting(g, h, D, P);
    case 'poster': return poster(g, h, P);
    case 'whiteboard': return whiteboard(g, h, P);
    case 'door': return door(g, h, D, P);
    case 'extinguisher': return extinguisher(g, h);
    case 'portrait': return portrait(g, h, P, S.k);
    case 'trophyCase': return trophyCase(g, h, P);
    case 'bookshelf': return bookshelf(g, h, P);
    default: return null;
  }
}
function metal(D, P) {
  if (D.id === 'lobby') return { body: P.bronze, dark: P.bronzeDark, lit: P.bronzeLit };
  if (D.id === 'open') return { body: [150, 154, 156], dark: [112, 116, 120], lit: [232, 234, 230] };
  return { body: P.brass, dark: P.brassDark, lit: P.brassLit };
}
function liftSurround(g, h, D, P) {
  const M = metal(D, P);
  // the frame, and a dark recess the doors sit in (doors are per frame)
  box(g, h.x - 4, h.y - 4, h.w + 8, h.h + 4, { body: M.body, dark: M.dark, lit: M.lit, rimLeft: true, dabs: 0.05, rimA: 0.85, seed: h.x * 3 });
  g.fillStyle = css(shade(M.dark, -0.4));
  g.fillRect(h.x - 0.5, h.y - 0.5, h.w + 1, h.h + 0.5);
  // the indicator over the doors: a small arched dial with the floor in amber
  const ix = h.x + h.w / 2;
  const iy = h.y - 12;
  box(g, ix - 9, iy - 4, 18, 10, { body: M.dark, dark: shade(M.dark, -0.3), lit: M.lit, dabs: 0, rimA: 0.7, seed: ix });
  g.fillStyle = css([28, 20, 16]);
  fillPoly(g, rectPts(ix - 7, iy - 2.4, 14, 7), 0.1, ix + 1);
  // a red LED readout, glowing in its dark window
  glow(g, ix - 2, iy + 1, 6, [255, 60, 50], 0.3);
  text(g, h.label, ix - 2, iy + 3.6, 6, [255, 76, 60], { weight: 'bold', face: '"Courier New", Courier, monospace' });
  // the call button plate beside the doors
  box(g, h.x + h.w + 5.5, h.y + 36, 3, 7, { body: M.body, lit: M.lit, dabs: 0, wob: 0, seed: h.x + 9 });
}
function liftDoors(ctx, h, D, P, B) {
  const M = metal(D, P);
  const o = h.open;
  // the car: warm light, wood panelling, a bright ceiling
  if (o > 0.01) {
    blit(ctx, B.liftCar[D.id], h.x, h.y);
  }
  const gap = (o * h.w) / 2;
  const half = h.w / 2;
  const leaf = B.liftLeaf[D.id];
  const vis = half - gap;
  if (vis > 0.3) {
    const k = leaf.c.width / leaf.w;
    // the left leaf slides left into its pocket: we see its inner (right) part
    ctx.drawImage(leaf.c, (half - vis) * k, 0, vis * k, leaf.c.height, h.x, h.y, vis, h.h);
    ctx.drawImage(leaf.c, 0, 0, vis * k, leaf.c.height, h.x + half + gap, h.y, vis, h.h);
  }
  // the hall lantern: an arrow that lights while the doors are open
  const ix = h.x + h.w / 2 + 4.5;
  const iy = h.y - 10;
  const on = clamp01(o * 3);
  ctx.fillStyle = css([255, 180, 80], 0.25 + 0.75 * on);
  ctx.beginPath();
  ctx.moveTo(ix - 1.8, iy + 1.2);
  ctx.lineTo(ix, iy - 1.6);
  ctx.lineTo(ix + 1.8, iy + 1.2);
  ctx.fill();
  if (on > 0) glow(ctx, ix, iy, 6, [255, 190, 100], 0.35 * on);
  if (o > 0.05) {
    // light spilling out of the car onto the floor in front of it
    const gr = ctx.createLinearGradient(0, WALL_BASE - 30, 0, WALL_BASE);
    gr.addColorStop(0, css([255, 220, 160], 0));
    gr.addColorStop(1, css([255, 220, 160], 0.12 * o));
    ctx.fillStyle = gr;
    ctx.fillRect(h.x + half - gap, WALL_BASE - 30, gap * 2, 30);
  }
  void M;
}
function buildLiftParts(k, D, P) {
  const M = metal(D, P);
  const sz = D.wall.hangs.find((h) => h.kind === 'lift');
  if (!sz) return { leaf: null, car: null };
  const w = sz.w;
  const h = sz.h;
  const leaf = massSprite(k, [0, 0, w / 2, h], (g) => g.fillRect(0, 0, w / 2, h), {
    body: shade(M.body, 0.1), dark: M.dark, lit: M.lit, rim: 0.6, rimA: 0.6, rimDir: [-0.5, -0.86], dabs: 0.04, dab: 2.2, dabAng: Math.PI / 2, seed: 404,
  }, (g, R) => {
    // polished: broad soft vertical reflections of the lobby, a hot streak, a dark one
    for (const [fx, fw, col, a] of [[0.12, 0.18, M.lit, 0.35], [0.5, 0.08, [255, 250, 230], 0.45], [0.7, 0.2, M.dark, 0.3]]) {
      g.fillStyle = css(col, a);
      fillPoly(g, rectPts(fx * w / 2, 0, fw * w / 2, h), 0.4, fx * 100);
    }
    for (let i = 0; i < 10; i++) {
      g.fillStyle = css(R() < 0.5 ? M.lit : M.dark, 0.06 + R() * 0.06);
      dab(g, R() * w / 2, R() * h, 0.3, 4 + R() * 12, 0);
    }
    g.fillStyle = css(M.dark, 0.8);
    g.fillRect(w / 2 - 0.6, 0, 0.6, h);
    g.fillRect(0, 0, 0.5, h);
    if (D.id === 'lobby') {
      // a deco sunburst etched into each leaf
      g.strokeStyle = css(M.lit, 0.35);
      g.lineWidth = 0.5;
      for (let a = 0; a < 5; a++) {
        g.beginPath();
        g.moveTo(w / 2, h * 0.42);
        g.lineTo(w / 2 - Math.cos(a * 0.38) * 14, h * 0.42 - Math.sin(a * 0.38) * 14 + 4);
        g.stroke();
      }
    }
  });
  const car = massSprite(k, [0, 0, w, h], (g) => g.fillRect(0, 0, w, h), {
    body: [214, 160, 104], dark: [120, 80, 54], lit: [255, 226, 170], dabs: 0.2, dab: 2, seed: 505, g0: 0,
  }, (g) => {
    g.fillStyle = css([120, 78, 50], 0.7);
    for (let x = 3; x < w; x += 8) g.fillRect(x, 12, 0.8, h - 16);
    g.fillStyle = css([255, 246, 220], 0.9);
    g.fillRect(2, 1, w - 4, 3);
    vgrad(g, 0, h - 14, w, 14, [80, 52, 36], 0, [80, 52, 36], 0.55);
    g.fillStyle = css([210, 170, 110]);
    g.fillRect(2, h * 0.55, w - 4, 1.2);
  });
  return { leaf, car };
}

// THE NEON EGGCORP. A polished black granite panel with a brass edge, and the sign's
// glass tubes on it, unlit (the strip's part); the lit tubes and their glow are a sprite
// laid over them per frame, so the sign can hum and, now and then, buzz out.
const NEON = { pink: [255, 92, 170], pinkCore: [255, 226, 242], teal: [64, 232, 226], tealCore: [220, 255, 252] };
function neonPaths(g, h, mode) {
  // mode 'tube' (unlit glass), or a stroke weight for the lit passes
  const cx = h.x + h.w / 2;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.font = `bold 19px ${SIGN}`;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  const word = () => {
    const s = 'EGGCORP';
    const ws = [...s].map((ch) => g.measureText(ch).width);
    const total = ws.reduce((a, b) => a + b, 0) + 3 * (s.length - 1);
    let x = cx - total / 2;
    g.textAlign = 'left';
    [...s].forEach((ch, i) => { g.strokeText(ch, x, h.y + h.h - 9); x += ws[i] + 3; });
  };
  const egg = () => {
    g.beginPath();
    polyPath(g, eggPts(cx, h.y + 14, 8, 10));
    g.stroke();
    g.beginPath();
    g.moveTo(cx - 8, h.y + 13);
    for (let i = 1; i <= 5; i++) g.lineTo(cx - 8 + i * 3.2, h.y + 13 + (i % 2 ? -2 : 1.6));
    g.stroke();
  };
  return { word, egg };
}
function logo(g, h, P, k) {
  const cx = h.x + h.w / 2;
  // the panel: polished black granite in a brass frame, with a pink cast from the tubes
  g.fillStyle = css([60, 30, 50], 0.4);
  fillPoly(g, rectPts(h.x - 4, h.y - 2, h.w + 10, h.h + 8), 0.4, h.x);
  box(g, h.x - 6, h.y - 5, h.w + 12, h.h + 10, { body: [182, 140, 66], dark: [104, 74, 34], lit: [255, 230, 150], rimLeft: true, dabs: 0, rimA: 0.9, seed: h.x + 1 });
  box(g, h.x - 4, h.y - 3, h.w + 8, h.h + 6, { body: [34, 28, 36], top: [44, 36, 46], dark: [22, 18, 26], lit: [120, 90, 120], dabs: 0.25, dab: 1, seed: h.x + 2, rimA: 0.4 });
  const R = rng(h.x);
  for (let i = 0; i < 160; i++) {
    g.fillStyle = css(R() < 0.6 ? [70, 56, 72] : [150, 120, 140], 0.4);
    dab(g, h.x - 3 + R() * (h.w + 6), h.y - 2 + R() * (h.h + 4), 0.4, 0.4, 0);
  }
  g.fillStyle = css([255, 255, 255], 0.06);
  fillPoly(g, [h.x - 4, h.y + h.h + 3, h.x + 20, h.y + h.h + 3, h.x + 46, h.y - 3, h.x + 22, h.y - 3], 0, 0);
  // the glass tubes, unlit: pale, faintly tinted, with their mounting clips
  const N = neonPaths(g, h);
  g.strokeStyle = css([210, 180, 196], 0.55);
  g.lineWidth = 1;
  N.word();
  g.strokeStyle = css([180, 210, 210], 0.55);
  N.egg();
  void cx; void k; void P;
}
function buildNeon(k, D) {
  const h0 = D.wall.hangs.find((h) => h.kind === 'logo');
  if (!h0) return null;
  const h = { ...h0, x: 0, y: 0 };
  const pad = 26;
  const r = k;
  const c = canvas((h.w + pad * 2) * r, (h.h + pad * 2) * r);
  const g = c.getContext('2d');
  g.setTransform(r, 0, 0, r, pad * r, pad * r);
  const N = neonPaths(g, h);
  const pass = (fn, col, w, a) => { g.strokeStyle = css(col, a); g.lineWidth = w; fn(); };
  // the glow first, broad and faint, then the coloured tube, then its white-hot core
  pass(N.word, NEON.pink, 7, 0.08);
  pass(N.word, NEON.pink, 3.6, 0.22);
  pass(N.word, NEON.pink, 1.7, 0.95);
  pass(N.word, NEON.pinkCore, 0.6, 0.95);
  pass(N.egg, NEON.teal, 7, 0.08);
  pass(N.egg, NEON.teal, 3.4, 0.24);
  pass(N.egg, NEON.teal, 1.6, 0.95);
  pass(N.egg, NEON.tealCore, 0.55, 0.95);
  // the light it throws on the stone round the panel
  g.setTransform(r, 0, 0, r, pad * r, pad * r);
  g.globalCompositeOperation = 'destination-over';
  const gl = g.createRadialGradient(h.w / 2, h.h * 0.6, 4, h.w / 2, h.h * 0.6, h.w * 0.75);
  gl.addColorStop(0, css(NEON.pink, 0.22));
  gl.addColorStop(1, css(NEON.pink, 0));
  g.fillStyle = gl;
  g.fillRect(-pad, -pad, h.w + pad * 2, h.h + pad * 2);
  return { c, x: -pad, y: -pad, w: h.w + pad * 2, h: h.h + pad * 2 };
}
// The sign's hum: steady, with a buzz-out every few seconds where it stutters.
function neonHum(t) {
  const c = ((t % 6.7) + 6.7) % 6.7;
  if (c > 4.6 && c < 5.2) return hash(Math.floor(t * 22)) > 0.45 ? 1 : 0.2;
  return 0.94 + 0.06 * Math.sin(t * 31);
}
function clockFace(g, h, D, P) {
  const M = metal(D, P);
  const cx = h.cx ?? h.x;
  const cy = h.y;
  const r = h.r;
  g.fillStyle = css([90, 70, 56], 0.3);
  dab(g, cx + 1.2, cy + 1.6, r + 1.6, r + 1.6, 0);
  g.fillStyle = css(M.body);
  fillPoly(g, arcPts(cx, cy, r + 1.6, r + 1.6, 0, TAU, 36), 0.2, cx);
  brokenEdge(g, cx - r, cy - r * 0.6, cx + r * 0.2, cy - r - 1, 0.8, M.lit, 0.9, cx + 1);
  const face = D.id === 'exec' ? [232, 214, 176] : [244, 238, 222];
  const gr = g.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r);
  gr.addColorStop(0, css(shade(face, 0.2)));
  gr.addColorStop(1, css(shade(face, -0.1)));
  g.fillStyle = gr;
  fillPoly(g, arcPts(cx, cy, r, r, 0, TAU, 36), 0.15, cx + 2);
  g.fillStyle = css([50, 44, 40]);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const L = i % 3 === 0 ? 2 : 1.1;
    const x = cx + Math.sin(a) * (r - 1.6);
    const y = cy - Math.cos(a) * (r - 1.6);
    dab(g, x, y, i % 3 === 0 ? 0.6 : 0.4, L * 0.5, a);
  }
}
function clockHands(ctx, h, clk) {
  const cx = h.cx;
  const cy = h.cy;
  const r = h.r;
  const hand = (a, L, w, col) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    const sx = Math.sin(a);
    const sy = -Math.cos(a);
    ctx.moveTo(cx - sy * w, cy + sx * w);
    ctx.lineTo(cx + sx * L, cy + sy * L);
    ctx.lineTo(cx + sy * w, cy - sx * w);
    ctx.lineTo(cx - sx * 1.2, cy - sy * 1.2);
    ctx.fill();
  };
  hand(clk.hourA, r * 0.52, 0.85, '#2a221e');
  hand(clk.minuteA, r * 0.8, 0.6, '#2a221e');
  hand(clk.secondA, r * 0.86, 0.25, '#b0382c');
  ctx.fillStyle = '#2a221e';
  ctx.beginPath();
  ctx.arc(cx, cy, 0.8, 0, TAU);
  ctx.fill();
}
function frameBox(g, x, y, w, h, fw, M, seed) {
  g.fillStyle = css([40, 30, 24], 0.35);
  fillPoly(g, rectPts(x + 1.4, y + 2, w, h), 0.3, seed + 1);
  box(g, x, y, w, h, { body: M.body, dark: M.dark, lit: M.lit, rimLeft: true, dabs: 0.2, dab: 1.2, rimA: 0.9, seed });
  g.fillStyle = css(M.dark, 0.6);
  fillPoly(g, rectPts(x + fw - 0.8, y + fw - 0.8, w - 2 * fw + 1.6, h - 2 * fw + 1.6), 0.15, seed + 2);
}
function painting(g, h, D, P) {
  // 1988 on the wall: a thin chrome frame round an airbrushed print
  const chrome = { body: [196, 198, 210], dark: [120, 122, 140], lit: [255, 255, 255] };
  frameBox(g, h.x, h.y, h.w, h.h, 2, chrome, h.x);
  const ix = h.x + 2;
  const iy = h.y + 2;
  const iw = h.w - 4;
  const ih = h.h - 4;
  g.save();
  g.beginPath();
  g.rect(ix, iy, iw, ih);
  g.clip();
  if (h.variant === 1) {
    // the city view as a Miami print: a striped sun going down into a teal sea, a palm
    vgrad(g, ix, iy, iw, ih * 0.62, [120, 70, 150], 1, [255, 150, 140], 1);
    g.fillStyle = css([255, 214, 140]);
    dab(g, ix + iw * 0.55, iy + ih * 0.56, iw * 0.24, iw * 0.24, 0);
    g.fillStyle = css([236, 120, 150]);
    for (let n = 0; n < 4; n++) g.fillRect(ix, iy + ih * (0.5 + n * 0.035), iw, 0.8 + n * 0.3);
    vgrad(g, ix, iy + ih * 0.62, iw, ih * 0.38, [60, 160, 168], 1, [30, 80, 110], 1);
    g.fillStyle = css([255, 200, 170], 0.6);
    for (let n = 0; n < 5; n++) g.fillRect(ix + iw * 0.45 + n * 0.6, iy + ih * (0.66 + n * 0.05), iw * 0.2 - n * 1.2, 0.6);
    g.fillStyle = css([30, 20, 44]);
    limb(g, [[ix + iw * 0.2, iy + ih + 1], [ix + iw * 0.18, iy + ih * 0.6], [ix + iw * 0.24, iy + ih * 0.3]], 1.6, 0.8, 3);
    for (let f = 0; f < 7; f++) {
      const a = -Math.PI / 2 + (f - 3) * 0.5;
      limb(g, [[ix + iw * 0.24, iy + ih * 0.3], [ix + iw * 0.24 + Math.cos(a) * 6, iy + ih * 0.3 + Math.sin(a) * 3 + 2]], 1.6, 0.2, f);
    }
  } else {
    // the abstract as a Nagel: a pale profile, a black bob, red lips, flat teal ground
    g.fillStyle = css([70, 168, 170]);
    g.fillRect(ix, iy, iw, ih);
    g.fillStyle = css([236, 120, 160]);
    fillPoly(g, rectPts(ix + iw * 0.62, iy, iw * 0.38, ih), 0.3, 1);
    g.fillStyle = css([246, 238, 236]);
    fillPoly(g, [ix + iw * 0.36, iy + ih * 0.3, ix + iw * 0.5, iy + ih * 0.2, ix + iw * 0.6, iy + ih * 0.32, ix + iw * 0.64, iy + ih * 0.52, ix + iw * 0.58, iy + ih * 0.56, ix + iw * 0.6, iy + ih * 0.66, ix + iw * 0.5, iy + ih * 0.8, ix + iw * 0.44, iy + ih + 1, ix + iw * 0.3, iy + ih + 1], 0.3, 2);
    g.fillStyle = css([22, 20, 28]);
    fillPoly(g, [ix + iw * 0.26, iy + ih * 0.7, ix + iw * 0.24, iy + ih * 0.3, ix + iw * 0.4, iy + ih * 0.1, ix + iw * 0.58, iy + ih * 0.14, ix + iw * 0.6, iy + ih * 0.3, ix + iw * 0.44, iy + ih * 0.28, ix + iw * 0.38, iy + ih * 0.5, ix + iw * 0.34, iy + ih * 0.74], 0.3, 3);
    g.fillStyle = css([210, 30, 50]);
    dab(g, ix + iw * 0.59, iy + ih * 0.62, 1.6, 0.8, 0.2);
    g.fillStyle = css([22, 20, 28]);
    dab(g, ix + iw * 0.54, iy + ih * 0.4, 1.4, 0.4, 0);
  }
  g.restore();
  // the glazing's sheen
  g.fillStyle = css([255, 255, 255], 0.1);
  fillPoly(g, [ix, iy + ih, ix + iw * 0.2, iy + ih, ix + iw * 0.6, iy, ix + iw * 0.4, iy], 0, 0);
}
function poster(g, h, P) {
  const R = rng(h.x);
  g.fillStyle = css([60, 60, 56], 0.25);
  fillPoly(g, rectPts(h.x + 1, h.y + 1.6, h.w, h.h), 0.3, h.x);
  const bg = h.label === 'SYNERGY' ? [44, 58, 92] : h.label === 'TEAMWORK' ? [40, 70, 66] : [30, 30, 36];
  box(g, h.x, h.y, h.w, h.h, { body: bg, dark: shade(bg, -0.2), lit: shade(bg, 0.4), dabs: 0.1, rimA: 0.5, seed: h.x * 2 });
  g.fillStyle = css([226, 214, 186]);
  fillPoly(g, rectPts(h.x + 1.5, h.y + 1.5, h.w - 3, h.h - 3), 0, 0);
  const ix = h.x + 3;
  const iy = h.y + 3;
  const iw = h.w - 6;
  const ih = h.h - 13;
  g.fillStyle = css(bg);
  g.fillRect(ix, iy, iw, ih);
  if (h.label === 'SYNERGY') {
    // airbrushed 1988: a striped sun going down over a pink grid, two chrome rings meeting
    vgrad(g, ix, iy, iw, ih * 0.58, [60, 30, 90], 1, [236, 96, 150], 1);
    g.fillStyle = css([255, 210, 130]);
    dab(g, ix + iw / 2, iy + ih * 0.56, iw * 0.3, iw * 0.3, 0);
    g.fillStyle = css([236, 96, 150]);
    for (let n = 0; n < 3; n++) g.fillRect(ix, iy + ih * (0.46 + n * 0.045), iw, 0.6 + n * 0.3);
    g.fillStyle = css([30, 16, 50]);
    g.fillRect(ix, iy + ih * 0.58, iw, ih * 0.42);
    g.strokeStyle = css([255, 100, 190], 0.85);
    g.lineWidth = 0.4;
    g.beginPath();
    for (let n = 0; n < 4; n++) { const yy = iy + ih * (0.62 + n * n * 0.03); g.moveTo(ix, yy); g.lineTo(ix + iw, yy); }
    for (let n = -3; n <= 3; n++) { g.moveTo(ix + iw / 2 + n * 2, iy + ih * 0.58); g.lineTo(ix + iw / 2 + n * 7, iy + ih); }
    g.stroke();
    g.strokeStyle = css([210, 220, 240]);
    g.lineWidth = 0.8;
    for (const dx of [-2.2, 2.2]) { g.beginPath(); g.arc(ix + iw / 2 + dx, iy + ih * 0.26, 3.4, 0, TAU); g.stroke(); }
  } else if (h.label === 'TEAMWORK') {
    // geese in a V across a teal sky
    vgrad(g, ix, iy, iw, ih, [96, 150, 150], 1, [200, 214, 196], 1);
    g.fillStyle = css([30, 40, 44]);
    for (let n = 0; n < 7; n++) {
      const side = n === 0 ? 0 : (n % 2 ? -1 : 1);
      const d = Math.ceil(n / 2);
      const bx = ix + iw * 0.6 - d * 3.2;
      const by = iy + ih * 0.4 + side * d * 2.6;
      fillPoly(g, [bx - 1.6, by - 0.6, bx, by, bx + 1.6, by - 0.6, bx, by + 0.7], 0, 0);
    }
  } else {
    // HANG IN THERE: the kitten on its branch
    vgrad(g, ix, iy, iw, ih, [110, 140, 170], 1, [180, 196, 206], 1);
    g.fillStyle = css([70, 50, 36]);
    limb(g, [[ix - 1, iy + 7], [ix + iw * 0.5, iy + 6], [ix + iw + 1, iy + 8]], 2.2, 1.4, 3);
    g.fillStyle = css([226, 160, 90]);
    dab(g, ix + iw * 0.5, iy + 13, 4.2, 5, 0);
    dab(g, ix + iw * 0.5, iy + 19, 3.2, 3, 0);
    g.fillRect(ix + iw * 0.5 - 3.6, iy + 6, 1.6, 6);
    g.fillRect(ix + iw * 0.5 + 2, iy + 6, 1.6, 6);
    g.fillStyle = css([30, 26, 24]);
    g.fillRect(ix + iw * 0.5 - 1.6, iy + 18.6, 0.8, 0.8);
    g.fillRect(ix + iw * 0.5 + 0.8, iy + 18.6, 0.8, 0.8);
    void R;
  }
  const label = h.label;
  const size = Math.min(4.4, (h.w - 4) / (label.length * 0.72));
  text(g, label, h.x + h.w / 2, h.y + h.h - 4.2, size, [40, 34, 30], { weight: 'bold', track: label.length > 9 ? 0 : 0.6 });
}
function whiteboard(g, h, P) {
  g.fillStyle = css([70, 74, 70], 0.25);
  fillPoly(g, rectPts(h.x + 1.2, h.y + 1.8, h.w, h.h), 0.3, h.x);
  box(g, h.x, h.y, h.w, h.h, { body: [168, 172, 170], dark: [132, 136, 136], lit: [236, 238, 232], dabs: 0, seed: h.x });
  // the board: off-white, in the shade of a wall facing away from the windows
  box(g, h.x + 2, h.y + 2, h.w - 4, h.h - 4, { body: [222, 224, 214], top: [232, 234, 226], dark: [206, 210, 200], dabs: 0.06, dab: 4, seed: h.x + 1, wob: 0.1 });
  // the scrawled rising chart, in marker
  const x0 = h.x + 8;
  const y0 = h.y + h.h - 10;
  g.strokeStyle = css([40, 44, 60], 0.85);
  g.lineWidth = 0.8;
  g.beginPath();
  g.moveTo(x0, h.y + 8);
  g.lineTo(x0, y0);
  g.lineTo(h.x + h.w - 8, y0);
  g.stroke();
  g.strokeStyle = css([180, 54, 48], 0.9);
  g.lineWidth = 1.1;
  g.beginPath();
  const pts = [[0, 0.1], [0.15, 0.3], [0.3, 0.22], [0.45, 0.45], [0.6, 0.4], [0.78, 0.7], [0.95, 0.92]];
  pts.forEach(([px, py], i) => {
    const X = x0 + 3 + px * (h.w - 20);
    const Y = y0 - 2 - py * (h.h - 20);
    if (i) g.lineTo(X, Y); else g.moveTo(X, Y);
  });
  g.stroke();
  g.fillStyle = css([180, 54, 48], 0.9);
  const ex = x0 + 3 + 0.95 * (h.w - 20);
  const ey = y0 - 2 - 0.92 * (h.h - 20);
  fillPoly(g, [ex + 2.5, ey - 2.5, ex - 1.5, ey - 1.8, ex + 1.6, ey + 1.6], 0, 0);
  text(g, 'Q4!!', h.x + 26, h.y + 12, 6, [40, 80, 140], { weight: 'bold', face: '"Marker Felt", "Chalkboard", "Comic Sans MS", cursive' });
  // the marker tray and its pens
  box(g, h.x + 6, h.y + h.h - 1, h.w - 12, 2.4, { body: [150, 154, 152], lit: [230, 230, 224], dabs: 0, wob: 0, seed: h.x + 2 });
  for (const [mx, col] of [[16, [180, 50, 44]], [24, [50, 80, 150]], [30, [40, 110, 70]]]) {
    g.fillStyle = css(col);
    g.fillRect(h.x + mx, h.y + h.h - 2, 5, 1.4);
  }
}
function door(g, h, D, P) {
  const exec = D.id === 'exec';
  const M = metal(D, P);
  const wood = exec ? [74, 42, 28] : [128, 94, 62];
  box(g, h.x - 3, h.y - 3, h.w + 6, h.h + 3, { body: exec ? P.woodDark : [196, 190, 172], dark: exec ? shade(P.woodDark, -0.3) : [160, 154, 138], lit: exec ? P.woodLit : [236, 232, 218], rimLeft: true, dabs: 0.03, seed: h.x * 2 });
  box(g, h.x, h.y, h.w, h.h, { body: wood, dark: shade(wood, -0.2), lit: shade(wood, 0.4), rimLeft: true, dabs: 0.12, dab: 3, dabAng: Math.PI / 2, seed: h.x * 2 + 1 });
  // two recessed panels
  for (const [py, ph] of [[0.08, 0.38], [0.52, 0.4]]) {
    g.fillStyle = css(shade(wood, -0.18), 0.8);
    fillPoly(g, rectPts(h.x + 4, h.y + h.h * py, h.w - 8, h.h * ph), 0.15, py * 100 + h.x);
    brokenEdge(g, h.x + 4, h.y + h.h * (py + ph) - 0.4, h.x + h.w - 4, h.y + h.h * (py + ph) - 0.4, 0.6, shade(wood, 0.35), 0.6, h.x + py);
  }
  if (!exec) {
    // a narrow vision panel, lit from the meeting inside
    g.fillStyle = css([232, 226, 196], 0.9);
    fillPoly(g, rectPts(h.x + h.w * 0.6, h.y + 8, 4, 20), 0.1, h.x + 4);
  }
  // the brass handle and name plate
  g.fillStyle = css(M.body);
  dab(g, h.x + h.w - 5, h.y + h.h * 0.52, 1.6, 1.2, 0);
  const plateW = exec ? 18 : 30;
  box(g, h.x + h.w / 2 - plateW / 2, h.y + h.h * 0.3, plateW, 6.4, { body: exec ? P.brass : [228, 224, 212], dark: exec ? P.brassDark : [196, 192, 178], lit: exec ? P.brassLit : [255, 255, 246], dabs: 0, wob: 0.1, seed: h.x + 3 });
  text(g, h.label, h.x + h.w / 2, h.y + h.h * 0.3 + 5, exec ? 5.2 : 4.2, exec ? [50, 32, 18] : [40, 40, 44], { weight: 'bold', face: exec ? PLATE : SIGN });
  if (!exec) {
    // the IN USE light housing over the door (its red glow is per frame)
    box(g, h.x + h.w / 2 - 8, h.y - 11, 16, 6, { body: [60, 56, 54], dark: [40, 36, 36], dabs: 0, wob: 0.1, seed: h.x + 4 });
    text(g, 'IN USE', h.x + h.w / 2, h.y - 6.8, 3.6, [120, 40, 36], { weight: 'bold' });
  }
}
function extinguisher(g, h) {
  g.fillStyle = css([60, 50, 46], 0.3);
  dab(g, h.x + h.w / 2 + 1, h.y + h.h / 2 + 1.5, h.w / 2, h.h / 2, 0);
  g.fillStyle = css([90, 90, 90]);
  g.fillRect(h.x - 1, h.y + h.h * 0.45, h.w + 2, 1.4);
  const spr = { body: [176, 48, 40], dark: [120, 30, 28], lit: [250, 150, 120] };
  box(g, h.x, h.y + 3, h.w, h.h - 3, { body: spr.body, dark: spr.dark, lit: spr.lit, rimLeft: true, dabs: 0.1, seed: h.x });
  g.fillStyle = css([40, 36, 36]);
  g.fillRect(h.x + 1.5, h.y, h.w - 3, 3.4);
  g.fillRect(h.x + h.w - 1, h.y + 1, 3, 1);
  g.fillStyle = css([236, 230, 210]);
  g.fillRect(h.x + 1.4, h.y + 8, h.w - 2.8, 4);
}
// THE SILVER PROFESSOR, as the shipped villain is drawn (props.js, "Don K. Eggshell, the
// professor"), painted: a wild mane of silver standing up and out, lock by lock in three
// greys; an egg-on-end head; fine rectangular specs; thick angry brows; a big drooping
// silver moustache over a white chin patch and a flat frown; a white collar with points,
// and the black cape with its red lining standing up behind his shoulders. Laid out on
// the reference bust's own measurements (work/local/office-styles/professor), mapped by
// `M` into the canvas of the portrait.
const PRO = {
  skin: [238, 201, 168], skinDk: [224, 182, 142], skinLit: [252, 228, 204],
  tones: [[223, 226, 234], [205, 211, 224], [188, 195, 210]],
  tonesDk: [[198, 203, 217], [177, 185, 202], [160, 168, 187]],
  stache: [205, 211, 224], stubble: [201, 171, 147], chin: [236, 238, 244],
  rim: [61, 61, 72], lens: [200, 224, 248], cape: [35, 35, 46], lining: [184, 32, 42], shirt: [236, 238, 244],
};
// [angle, length, spread, curl] — the mane as it flies (PRO_HAIR.mane)
const PRO_LOCKS = {
  back: [[-158, 0.85, 15, 14], [-172, 0.7, 13, 18], [166, 0.62, 14, 26], [148, 0.5, 15, 30],
    [-26, 0.8, 14, -16], [-8, 0.72, 13, -20], [12, 0.6, 14, -26], [32, 0.48, 15, -30]],
  front: [[-128, 1.05, 19, 22], [-104, 1.18, 18, 20], [-80, 1.0, 17, 16], [-58, 0.82, 17, 10],
    [-146, 0.62, 14, 26], [-38, 0.56, 14, 8]],
};
function professorBust(g, M, RR, light) {
  const P_ = (x, y) => [M.x(x), M.y(y)];
  const pts = (arr) => arr.flatMap(([x, y]) => P_(x, y));
  const S = M.s;
  const DEG = Math.PI / 180;
  // the cape's high collar: black wings standing up behind the shoulders, red inside
  for (const sd of [-1, 1]) {
    const X = (x) => 308 + sd * (x - 308);
    g.fillStyle = css(PRO.cape);
    fillPoly(g, pts([[X(160), 340], [X(108), 268], [X(96), 196], [X(118), 174], [X(150), 210], [X(214), 262], [X(262), 300]]), 0.3, 31 + sd);
    g.fillStyle = css(PRO.lining);
    fillPoly(g, pts([[X(176), 318], [X(128), 260], [X(120), 196], [X(150), 222], [X(220), 272], [X(250), 300]]), 0.25, 33 + sd);
    // the lining catches the light along its inner fold
    brokenEdge(g, M.x(X(126)), M.y(204), M.x(X(176)), M.y(312), 0.9 * S * 8, shade(PRO.lining, 0.35), 0.7, 35 + sd);
    brokenEdge(g, M.x(X(100)), M.y(200), M.x(X(118)), M.y(176), 0.8 * S * 8, [110, 110, 130], 0.8, 37 + sd);
  }
  // the shoulders, and the shirt's collar points
  g.fillStyle = css(PRO.cape);
  fillPoly(g, arcPts(M.x(308), M.y(356), 176 * S, 72 * S, 0, TAU, 40), 0.3, 39);
  brokenEdge(g, M.x(150), M.y(330), M.x(260), M.y(290), 1, [96, 96, 116], 0.8, 40);
  g.fillStyle = css(PRO.shirt);
  fillPoly(g, pts([[198, 312], [272, 300], [242, 358]]), 0.2, 41);
  fillPoly(g, pts([[418, 312], [344, 300], [374, 358]]), 0.2, 42);
  g.fillStyle = css(PRO.skinDk);
  fillPoly(g, pts([[272, 296], [344, 296], [330, 318], [308, 324], [286, 318]]), 0.2, 43);
  // the head's geometry: an egg on end, widest a little above the middle
  const hc = [308, 218];
  const hrx = 80;
  const hry = 98;
  const egg = () => {
    const out = [];
    for (let a = 0; a < 48; a++) {
      const t = (a / 48) * TAU;
      const sn = Math.sin(t);
      const below = sn > 0;
      const w = hrx * (below ? 1 - 0.3 * sn * sn : 1 - 0.05 * sn * sn);
      out.push(hc[0] + Math.cos(t) * w, hc[1] - 14 + sn * (below ? hry * 1.12 : hry * 0.92));
    }
    return out;
  };
  const lock = (l, fill, lit) => {
    const [deg, len, spread, curl] = l;
    const cx = hc[0];
    const cy = hc[1] - 20;
    const r = 76;
    const px = (d, k) => cx + Math.cos(d * DEG) * r * k;
    const py = (d, k) => cy + Math.sin(d * DEG) * r * 1.05 * k;
    const L = len * 0.86;
    const tip = deg + curl;
    const path = [];
    const quad = (x0, y0, x1, y1, x2, y2) => { for (let t = 0; t <= 1.0001; t += 0.125) path.push((1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * x1 + t * t * x2, (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * y1 + t * t * y2); };
    quad(px(deg - spread, 0.86), py(deg - spread, 0.86), px(deg - spread * 0.5, 1 + L * 0.55), py(deg - spread * 0.5, 1 + L * 0.55), px(tip, 1 + L), py(tip, 1 + L));
    quad(px(tip, 1 + L), py(tip, 1 + L), px(deg + spread * 1.15, 1 + L * 0.3), py(deg + spread * 1.15, 1 + L * 0.3), px(deg + spread, 0.86), py(deg + spread, 0.86));
    const mapped = [];
    for (let i = 0; i < path.length; i += 2) mapped.push(M.x(path[i]), M.y(path[i + 1]));
    g.fillStyle = css(fill);
    fillPoly(g, mapped, 0.15, deg);
    if (lit) {
      // the light along the lock's upper edge, and a streak of strands down it
      brokenEdge(g, M.x(px(deg - spread * 0.6, 1)), M.y(py(deg - spread * 0.6, 1)), M.x(px(tip, 1 + L * 0.9)), M.y(py(tip, 1 + L * 0.9)), 0.7, light, 0.75, deg + 3);
      g.fillStyle = css(shade(fill, -0.12), 0.6);
      dab(g, M.x(px(deg, 1 + L * 0.4)), M.y(py(deg, 1 + L * 0.4)), 0.3, L * r * S * 0.35, (tip + 90) * DEG);
    }
  };
  PRO_LOCKS.back.forEach((l, n) => lock(l, PRO.tonesDk[n % 3], false));
  // ears
  for (const sd of [-1, 1]) {
    g.fillStyle = css(PRO.skin);
    dab(g, M.x(308 + sd * 80), M.y(228), 12 * S, 18 * S, sd * 0.28);
    g.fillStyle = css(PRO.skinDk);
    dab(g, M.x(308 + sd * 82), M.y(229), 5 * S, 9 * S, sd * 0.28);
  }
  // the head, lit from the picture light above
  const head = egg().map((v, n) => (n % 2 ? M.y(v) : M.x(v)));
  const hg = g.createLinearGradient(0, M.y(120), 0, M.y(316));
  hg.addColorStop(0, css(PRO.skinLit));
  hg.addColorStop(0.45, css(PRO.skin));
  hg.addColorStop(1, css(PRO.skinDk));
  g.fillStyle = hg;
  fillPoly(g, head, 0.2, 44);
  // the stubble field on the jaw, and the white chin patch: he greys from the chin up
  g.save();
  g.beginPath();
  polyPath(g, head);
  g.clip();
  g.fillStyle = css(PRO.stubble, 0.55);
  fillPoly(g, pts([[226, 262], [308, 278], [390, 262], [390, 330], [226, 330]]), 0.3, 45);
  for (let n = 0; n < 40; n++) {
    g.fillStyle = css(shade(PRO.stubble, -0.15), 0.35);
    dab(g, M.x(240 + RR() * 136), M.y(270 + RR() * 46), 0.25, 0.25, 0);
  }
  g.fillStyle = css(PRO.chin, 0.75);
  fillPoly(g, pts([[282, 286], [308, 296], [334, 286], [330, 306], [308, 316], [286, 306]]), 0.25, 46);
  g.restore();
  PRO_LOCKS.front.forEach((l, n) => lock(l, PRO.tones[n % 3], true));
  // the brows: thick, silver, angry — inner ends pulled down
  for (const sd of [-1, 1]) {
    const X = (x) => 308 + sd * (x - 308);
    g.fillStyle = css([150, 120, 104], 0.7);
    fillPoly(g, pts([[X(246), 180], [X(272), 172], [X(300), 186], [X(300), 194], [X(276), 188], [X(250), 192]]), 0.2, 55 + sd);
    g.fillStyle = css(PRO.tones[0]);
    fillPoly(g, pts([[X(244), 174], [X(272), 164], [X(302), 178], [X(302), 188], [X(276), 182], [X(248), 186]]), 0.2, 47 + sd);
    brokenEdge(g, M.x(X(252)), M.y(175), M.x(X(296)), M.y(176), 0.5, [255, 255, 255], 0.6, 49 + sd);
  }
  // fine rectangular specs: pale-blue lenses, dark rims, a bridge, arms to the ears
  g.strokeStyle = css(PRO.rim);
  g.lineWidth = Math.max(0.35, 5 * S);
  g.beginPath();
  g.moveTo(M.x(243), M.y(206)); g.lineTo(M.x(232), M.y(214));
  g.moveTo(M.x(373), M.y(206)); g.lineTo(M.x(384), M.y(214));
  g.moveTo(M.x(303), M.y(208)); g.lineTo(M.x(313), M.y(208));
  g.stroke();
  for (const sd of [-1, 1]) {
    const x0 = sd < 0 ? 243 : 313;
    g.fillStyle = css(PRO.rim);
    fillPoly(g, rectPts(M.x(x0) - 0.35, M.y(201) - 0.35, 60 * S + 0.7, 30 * S + 0.7), 0, 0);
    g.fillStyle = css(PRO.lens);
    fillPoly(g, rectPts(M.x(x0), M.y(201), 60 * S, 30 * S), 0, 0);
    g.fillStyle = css([255, 255, 255], 0.55);
    fillPoly(g, [M.x(x0 + 6), M.y(203), M.x(x0 + 18), M.y(203), M.x(x0 + 10), M.y(229), M.x(x0 + 2), M.y(229)], 0, 0);
    g.fillStyle = css([26, 16, 40]);
    dab(g, M.x(x0 + 32 - sd * 2), M.y(217), 7 * S, 7 * S, 0);
  }
  // nose
  g.fillStyle = css(PRO.skinDk);
  dab(g, M.x(308), M.y(240), 11 * S, 8 * S, 0);
  // the moustache: big, drooping, silver, two lobes from a parting under the nose
  for (const sd of [-1, 1]) {
    const X = (x) => 308 + sd * (x - 308);
    g.fillStyle = css(PRO.stache);
    fillPoly(g, pts([[X(308), 250], [X(286), 246], [X(262), 252], [X(246), 262], [X(244), 274], [X(256), 270], [X(278), 266], [X(300), 266], [X(308), 262]]), 0.2, 51 + sd);
    brokenEdge(g, M.x(X(300)), M.y(250), M.x(X(254)), M.y(256), 0.5, [250, 252, 255], 0.65, 53 + sd);
    g.fillStyle = css(PRO.tonesDk[1], 0.7);
    dab(g, M.x(X(276)), M.y(264), 12 * S, 2 * S, sd * -0.15);
  }
  // the flat frown
  g.strokeStyle = css([26, 16, 40], 0.75);
  g.lineWidth = Math.max(0.35, 4.5 * S);
  g.beginPath();
  g.moveTo(M.x(288), M.y(283));
  g.quadraticCurveTo(M.x(308), M.y(281), M.x(328), M.y(283));
  g.stroke();
}
// The bust fitted into a frame's canvas: its feet cropped by the frame, the mane in the
// upper third, the cape's wing tips just off the edges.
function professorMap(ix, iy, iw, ih) {
  const s = iw / 282;
  return { s, x: (x) => ix + iw / 2 + (x - 308) * s, y: (y) => iy + ih + 9 - (425 - y) * s };
}

function portrait(g, h, P, k) {
  // Don K. Eggshell PhD, the founder, as a 1988 power portrait: the silver professor on a
  // mottled studio backdrop with a pink rim light, under smoked glass in a brass fillet
  // held by chrome clips; a brass plate beneath.
  const ix = h.x + 4;
  const iy = h.y + 4;
  const iw = h.w - 8;
  const ih = h.h - 8;
  const cx = ix + iw / 2;
  // the smoked glass, wider than the print, with the wall seen dark through it
  g.fillStyle = css([20, 12, 26], 0.4);
  fillPoly(g, rectPts(h.x + 1.6, h.y + 2.2, h.w, h.h), 0.3, h.x);
  g.fillStyle = css([40, 26, 46], 0.86);
  fillPoly(g, rectPts(h.x, h.y, h.w, h.h), 0.15, h.x + 1);
  const spr = massSprite(k * 2, [ix, iy, iw, ih], (gg) => gg.fillRect(ix, iy, iw, ih), {
    body: [70, 90, 140], dark: [40, 50, 96], lit: [150, 170, 220], dabs: 0.5, dab: 2.4, seed: 314, g0: 0,
  }, (gg, RR) => {
    // the studio backdrop: blue-violet mottle with a teal cloud, lit behind his head
    for (let n = 0; n < 26; n++) {
      gg.fillStyle = css(RR() < 0.5 ? [80, 150, 170] : [130, 90, 170], 0.18 + RR() * 0.12);
      dab(gg, ix + RR() * iw, iy + RR() * ih, 4 + RR() * 7, 3 + RR() * 5, RR() * TAU);
    }
    const gl = gg.createRadialGradient(cx + 2, iy + ih * 0.36, 1, cx, iy + ih * 0.4, iw * 0.62);
    gl.addColorStop(0, css([200, 220, 246], 0.75));
    gl.addColorStop(1, css([120, 150, 210], 0));
    gg.fillStyle = gl;
    gg.fillRect(ix, iy, iw, ih);
    professorBust(gg, professorMap(ix, iy, iw, ih), RR, [255, 236, 246]);
    // the pink kicker light down his right side, as every 1988 portrait studio had it
    const kg = gg.createLinearGradient(ix + iw, 0, ix + iw * 0.55, 0);
    kg.addColorStop(0, css([255, 110, 190], 0.32));
    kg.addColorStop(1, css([255, 110, 190], 0));
    gg.globalCompositeOperation = 'source-atop';
    gg.fillStyle = kg;
    gg.fillRect(ix, iy, iw, ih);
  });
  blit(g, spr, 0, 0);
  // a thin brass fillet round the print, the glass's sheen, chrome clips at the corners
  g.strokeStyle = css(P.brass);
  g.lineWidth = 0.7;
  g.strokeRect(ix - 0.4, iy - 0.4, iw + 0.8, ih + 0.8);
  g.fillStyle = css([255, 255, 255], 0.09);
  fillPoly(g, [h.x, h.y + h.h, h.x + 12, h.y + h.h, h.x + 34, h.y, h.x + 22, h.y], 0, 0);
  g.fillStyle = css([255, 255, 255], 0.05);
  fillPoly(g, [h.x + 16, h.y + h.h, h.x + 20, h.y + h.h, h.x + 42, h.y, h.x + 38, h.y], 0, 0);
  for (const [qx, qy] of [[h.x, h.y], [h.x + h.w, h.y], [h.x, h.y + h.h], [h.x + h.w, h.y + h.h]]) {
    box(g, qx - 2, qy - 2, 4, 4, { body: [200, 202, 214], dark: [130, 132, 150], lit: [255, 255, 255], dabs: 0, wob: 0, seed: qx + qy });
  }
  // a halogen picture spot above, and the brass plate
  g.fillStyle = css([22, 20, 26]);
  fillPoly(g, [h.x + h.w / 2 - 3, h.y - 8, h.x + h.w / 2 + 3, h.y - 8, h.x + h.w / 2 + 2, h.y - 4, h.x + h.w / 2 - 2, h.y - 4], 0.1, h.x + 5);
  g.fillStyle = css([255, 246, 236]);
  g.fillRect(h.x + h.w / 2 - 1.6, h.y - 4.4, 3.2, 0.7);
  box(g, h.x + h.w / 2 - 15, h.y + h.h + 3, 30, 6.6, { body: P.brass, dark: P.brassDark, lit: P.brassLit, dabs: 0, rimA: 0.9, seed: h.x + 6 });
  text(g, h.label, h.x + h.w / 2, h.y + h.h + 8.3, 4.6, [60, 40, 18], { weight: 'bold', face: PLATE, track: 0.5 });
}
function trophyCase(g, h, P) {
  // a brass-and-glass étagère, lit from above: crystal awards, a gold record, and the
  // architect's model of the tower itself, rose granite and teal glass
  const ix = h.x + 3;
  const iy = h.y + 3;
  const iw = h.w - 6;
  const ih = h.h - 14;
  g.fillStyle = css([20, 14, 26], 0.55);
  g.fillRect(h.x - 1, h.y - 1, h.w + 2, h.h + 1);
  vgrad(g, ix, iy, iw, ih, [150, 96, 112], 0.55, [40, 26, 44], 0.4);
  const gl = g.createRadialGradient(h.x + h.w / 2, h.y + 2, 2, h.x + h.w / 2, h.y + 20, h.w);
  gl.addColorStop(0, css(P.warm, 0.4));
  gl.addColorStop(1, css(P.warm, 0));
  g.fillStyle = gl;
  g.fillRect(ix, iy, iw, ih);
  const R = rng(55);
  for (let sh = 0; sh < 3; sh++) {
    const sy = iy + ((sh + 1) * ih) / 3.2;
    // a glass shelf: a pale edge and its reflection
    g.fillStyle = css([220, 240, 240], 0.55);
    g.fillRect(ix, sy, iw, 0.9);
    g.fillStyle = css([220, 240, 240], 0.12);
    g.fillRect(ix, sy + 0.9, iw, 2);
    if (sh === 1) {
      // the model of the tower: a stepped shaft with a teal pyramid cap
      const mx = ix + iw * 0.62;
      box(g, mx - 5, sy - 26, 10, 26, { body: [176, 130, 134], dark: [130, 92, 100], lit: [250, 210, 206], rimLeft: true, dabs: 0, seed: mx });
      g.fillStyle = css([70, 150, 156], 0.85);
      for (let wy = sy - 24; wy < sy - 2; wy += 2.2) g.fillRect(mx - 3.6, wy, 7.2, 1);
      g.fillStyle = css([70, 140, 146]);
      fillPoly(g, [mx - 5, sy - 26, mx, sy - 33, mx + 5, sy - 26], 0.1, mx + 1);
      g.fillStyle = css([190, 236, 236], 0.7);
      fillPoly(g, [mx - 4.6, sy - 26, mx, sy - 33, mx - 0.6, sy - 26], 0, 0);
      box(g, mx - 8, sy - 2, 16, 2, { body: [30, 26, 34], dabs: 0, wob: 0, seed: mx + 2 });
    }
    for (let x = ix + 4; x < ix + iw - 4; x += 9 + R() * 3) {
      if (sh === 1 && x > ix + iw * 0.45) break;
      const kind = R();
      if (kind < 0.5) {
        // a crystal award: a faceted prism, catching the light on one face
        const ch = 6 + R() * 6;
        g.fillStyle = css([190, 230, 236], 0.55);
        fillPoly(g, [x - 2, sy, x + 2, sy, x + 2.6, sy - ch, x - 1.2, sy - ch - 1.6], 0.1, x);
        g.fillStyle = css([255, 255, 255], 0.7);
        fillPoly(g, [x - 1.6, sy, x - 0.6, sy, x - 0.2, sy - ch, x - 1, sy - ch - 1.2], 0, 0);
        g.fillStyle = css([30, 26, 34]);
        g.fillRect(x - 2.6, sy - 1.2, 5.2, 1.2);
      } else if (kind < 0.75) {
        // a gold record, framed
        box(g, x - 4, sy - 10, 8, 10, { body: [30, 26, 34], dabs: 0, wob: 0.1, seed: x });
        g.fillStyle = css(P.brassLit);
        dab(g, x, sy - 5.6, 2.8, 2.8, 0);
        g.fillStyle = css(P.brassDark);
        dab(g, x, sy - 5.6, 0.8, 0.8, 0);
      } else {
        g.fillStyle = css(P.brass);
        fillPoly(g, [x - 3, sy - 9, x + 3, sy - 9, x + 1.4, sy - 4.6, x + 0.6, sy - 3, x + 0.6, sy - 1.4, x + 2, sy - 0.8, x + 2, sy, x - 2, sy, x - 2, sy - 0.8, x - 0.6, sy - 1.4, x - 0.6, sy - 3, x - 1.4, sy - 4.6], 0.1, x);
        g.fillStyle = css(P.brassLit, 0.9);
        g.fillRect(x - 2.4, sy - 8.6, 0.9, 4);
      }
    }
  }
  // the brass frame and the glass's sheen; a lacquer plinth
  for (const fx of [h.x, h.x + h.w - 2]) box(g, fx, h.y - 2, 2, h.h - 9, { body: P.brass, dark: P.brassDark, lit: P.brassLit, rimTop: false, rimLeft: true, dabs: 0, wob: 0, seed: fx });
  box(g, h.x - 1, h.y - 3, h.w + 2, 2.4, { body: P.brass, dark: P.brassDark, lit: P.brassLit, dabs: 0, wob: 0, seed: h.x + 3 });
  g.fillStyle = css([255, 255, 255], 0.07);
  fillPoly(g, [ix, iy + ih, ix + 10, iy + ih, ix + 30, iy, ix + 20, iy], 0, 0);
  box(g, h.x - 2, h.y + h.h - 11, h.w + 4, 11, { body: P.lacquer, dark: shade(P.lacquer, -0.3), lit: P.lacquerLit, dabs: 0.04, seed: h.x + 1 });
  g.fillStyle = css(P.brass);
  g.fillRect(h.x - 2, h.y + h.h - 9, h.w + 4, 0.8);
}
function bookshelf(g, h, P) {
  box(g, h.x - 2, h.y - 3, h.w + 4, h.h + 3, { body: P.lacquer, dark: shade(P.lacquer, -0.3), lit: P.lacquerLit, rimLeft: true, dabs: 0.04, seed: h.x });
  const R = rng(77);
  const shelves = 6;
  const sh = (h.h - 10) / shelves;
  const spines = [[60, 120, 128], [150, 96, 130], [30, 28, 36], [120, 40, 56], [200, 180, 160], [70, 70, 110], [180, 120, 140]];
  for (let s = 0; s < shelves; s++) {
    const y1 = h.y + 4 + (s + 1) * sh;
    // the back of the shelf, in shadow
    g.fillStyle = css(shade(P.lacquer, -0.3));
    g.fillRect(h.x + 2, y1 - sh + 1.4, h.w - 4, sh - 1.4);
    let x = h.x + 3;
    while (x < h.x + h.w - 4) {
      if (R() < 0.07) {
        // an ornament: a small brass globe or a bust
        g.fillStyle = css(P.brass);
        dab(g, x + 3, y1 - 3.5, 2.6, 2.6, 0);
        g.fillRect(x + 2.2, y1 - 1.4, 1.6, 1.4);
        x += 8;
        continue;
      }
      const bw = 1.8 + R() * 2.2;
      const bh = sh * (0.6 + R() * 0.32);
      const col = spines[(R() * spines.length) | 0];
      const lean = R() < 0.06 ? 1 : 0;
      g.fillStyle = css(shade(col, (R() - 0.5) * 0.2));
      fillPoly(g, lean ? [x, y1, x + bw, y1, x + bw + 2, y1 - bh, x + 2, y1 - bh] : rectPts(x, y1 - bh, bw, bh), 0.05, x);
      g.fillStyle = css([220, 180, 100], 0.55);
      g.fillRect(x + 0.3, y1 - bh * 0.78, bw - 0.6, 0.6);
      x += bw + 0.25 + lean * 2;
    }
    box(g, h.x + 1, y1, h.w - 2, 2.4, { body: shade(P.lacquer, 0.08), dark: P.lacquer, lit: P.lacquerLit, dabs: 0, wob: 0.1, seed: h.x + s });
  }
  // a reading lamp's glow falling across the lower shelves
  const gr = g.createRadialGradient(h.x + h.w * 0.7, h.y + h.h * 0.55, 2, h.x + h.w * 0.7, h.y + h.h * 0.6, h.w * 0.8);
  gr.addColorStop(0, css(P.warm, 0.22));
  gr.addColorStop(1, css(P.warm, 0));
  g.fillStyle = gr;
  g.fillRect(h.x, h.y, h.w, h.h);
}

// ================================================================== LIGHTS
function buildLightParts(k, D, P) {
  const v = D.lights.variant;
  if (v === 'globe') {
    return massSprite(k, [-8, -10, 16, 18], (g) => {
      fillPoly(g, arcPts(0, 0, 6.5, 6.5, 0, TAU, 32), 0.15, 1);
      fillPoly(g, rectPts(-2, -8.6, 4, 3), 0.1, 2);
    }, { body: [255, 226, 232], dark: [236, 176, 196], lit: [255, 250, 252], dabs: 0.2, dab: 1.2, seed: 21, g0: 0.2 }, (g) => {
      g.fillStyle = css(P.bronze);
      g.fillRect(-2.2, -9, 4.4, 3.2);
      g.fillStyle = css([255, 255, 255], 0.8);
      dab(g, -2, -2.4, 1.6, 1.2, -0.5);
    });
  }
  if (v === 'pendant') {
    // a polished brass dome, a rose glass diffuser glowing under it
    return massSprite(k, [-11, -12, 22, 16], (g) => {
      fillPoly(g, [-1.5, -11, 1.5, -11, 4, -8, 9, -3, 10, 2, -10, 2, -9, -3, -4, -8], 0.15, 1);
    }, { body: P.brass, dark: P.brassDark, lit: P.brassLit, rim: 0.7, rimA: 0.9, rimDir: [-0.5, -0.86], dabs: 0.03, dab: 1.2, seed: 22, g0: 0.1 }, (g) => {
      // polished: a dark band round the dome where it turns from the room, a hot highlight
      g.fillStyle = css(P.brassDark, 0.5);
      fillPoly(g, [3, -8, 9, -3, 10, 2, 6, 2, 5, -3], 0.2, 5);
      g.fillStyle = css([255, 250, 230], 0.7);
      dab(g, -4, -5, 1, 2.6, -0.6);
      g.fillStyle = css([255, 200, 210]);
      fillPoly(g, [-8.6, 2, 8.6, 2, 6, 3.6, -6, 3.6], 0, 0);
    });
  }
  return massSprite(k, [-25, -3, 50, 8], (g) => {
    fillPoly(g, rectPts(-23, -2, 46, 5), 0.1, 1);
  }, { body: [214, 214, 206], dark: [180, 180, 172], lit: [250, 250, 244], dabs: 0.1, seed: 23 }, (g) => {
    g.fillStyle = css([252, 255, 246]);
    g.fillRect(-21, 0.4, 42, 2.4);
  });
}
function paintLights(ctx, f, B, P) {
  const v = f.lights[0] && f.lights[0].variant;
  for (const l of f.lights) {
    if (v === 'tube') {
      const y = f.ceilingY - 2;
      ctx.fillStyle = css([90, 92, 92], 0.8);
      ctx.fillRect(l.x - 15, 0, 0.6, y - 2);
      ctx.fillRect(l.x + 15, 0, 0.6, y - 2);
      blit(ctx, B.light, l.x, y);
      if (l.on > 0.5) {
        glow(ctx, l.x, y - 2, 34, [246, 252, 240], 0.3);
        glow(ctx, l.x, y + 6, 50, [240, 250, 236], 0.14);
      } else {
        ctx.fillStyle = css([150, 154, 150], 0.85);
        ctx.fillRect(l.x - 21, y + 0.4, 42, 2.4);
      }
    } else {
      ctx.fillStyle = css(v === 'globe' ? [60, 46, 34] : [40, 30, 22], 0.8);
      ctx.fillRect(l.x - 0.35, 0, 0.7, l.y - 9);
      if (v === 'globe') {
        glow(ctx, l.x, l.y, 30, [255, 206, 214], 0.32);
        blit(ctx, B.light, l.x, l.y);
      } else {
        // a cone of warm light under the shade, falling to the furniture
        const gr = ctx.createLinearGradient(0, l.y, 0, l.y + 110);
        gr.addColorStop(0, css(P.warm, 0.22));
        gr.addColorStop(1, css(P.warm, 0));
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.moveTo(l.x - 8, l.y + 2);
        ctx.lineTo(l.x + 8, l.y + 2);
        ctx.lineTo(l.x + 44, l.y + 110);
        ctx.lineTo(l.x - 44, l.y + 110);
        ctx.fill();
        glow(ctx, l.x, l.y + 3, 22, P.warm, 0.45);
        blit(ctx, B.light, l.x, l.y);
      }
    }
  }
}

// ================================================================== THE FLOOR
// Plan-space materials, sampled a row at a time. `row(Z, dZ, du, s, m)` returns a sampler
// (u, out) for one row at plan depth Z (lane px from the eye).
function marbleMat(D, P) {
  const sculpt = D.mid.items.find((it) => it.kind === 'sculpture');
  const med = sculpt ? { u: uOfMid(sculpt.u + 20), z: 760, ru: 70, rz: 150 } : null;
  const verde = [40, 34, 44]; // the border: black granite
  const brass = [184, 144, 74];
  const A = [176, 140, 144];
  const Bc = [162, 128, 134];
  const vein = [120, 92, 100];
  const SL = 125;
  const pools = lightPools(D, 0.12, [255, 236, 200]);
  return {
    row(Z, dZ, du, s) {
      const n1 = rowNoise(P_FLOOR, 50, 70, 1, Z);
      const n2 = rowNoise(P_FLOOR, 18, 30, 2, Z);
      const n3 = rowNoise(P_FLOOR, 7, 3, 3, Z); // polish streaks: a new drag of the brush each row
      const hz = rowCov(Z, dZ, SL, 1.2);
      const iz = Math.floor(Z / SL);
      const ao = 0.8 + 0.2 * smooth(s / 0.18);
      const near = 1 - 0.07 * s;
      const pool = pools(Z, dZ);
      // the border: a band of verde with brass lines, laid along the wall
      const inBorder = Z > 1060 && Z < 1150 ? 1 : 0;
      const onLine = Math.max(rowCovAt(Z, dZ, 1052, 3), rowCovAt(Z, dZ, 1158, 3));
      return (u, out) => {
        const iu = Math.floor(u / SL);
        let base = ((iu + iz) & 1) ? A : Bc;
        if (inBorder) base = verde;
        if (med) {
          let du0 = u - med.u;
          du0 -= Math.round(du0 / P_FLOOR) * P_FLOOR;
          const e = Math.hypot(du0 / med.ru, (Z - med.z) / med.rz);
          if (e < 1.08) base = e > 0.94 ? brass : e > 0.8 ? [52, 120, 128] : e < 0.42 ? brass : A;
        }
        const cloud = 0.05 * n1(u);
        const v = Math.abs(n2(u) + 0.6 * n1(u * 1.7));
        const vk = clamp01(1 - v / 0.07) * 0.35;
        const streak = 0.025 * n3(u);
        const joint = inBorder ? 0 : Math.max(hz, lineCov(u, SL, 0.9, du)) * 0.22;
        const lit = pool(u);
        const L = (1 + cloud + streak) * (1 - joint) * ao * near;
        for (let c = 0; c < 3; c++) out[c] = (lerp(lerp(base[c], brass[c], onLine * 0.8), vein[c], vk) * L) + lit[c];
      };
    },
  };
}
function carpetMat(D, P) {
  // the teal-and-mauve confetti carpet: a teal ground, flecks of mauve, rose and pale aqua
  // laid on a small grid in plan; where a row of the floor spans many flecks they melt
  // into the ground's average, as they would at that distance
  const A = [62, 106, 114];
  const Bc = [58, 100, 110];
  const flecks = [[148, 102, 134], [190, 118, 146], [130, 176, 176]];
  const TL = 50;
  const FC = 12.5; // fleck cell: 200 to a period
  const pools = lightPools(D, 0.1, [236, 246, 236]);
  return {
    row(Z, dZ, du, s) {
      const n1 = rowNoise(P_FLOOR, 2.2, 3, 11, Z);
      const n2 = rowNoise(P_FLOOR, 60, 90, 12, Z);
      const hz = rowCov(Z, dZ, TL, 0.8);
      const iz = Math.floor(Z / TL);
      const fz = Math.floor(Z / FC);
      const sharp = clamp01(1.6 - dZ / FC) * clamp01(1.6 - du / FC);
      const ao = 0.82 + 0.18 * smooth(s / 0.18);
      const pool = pools(Z, dZ);
      return (u, out) => {
        const iu = Math.floor(u / TL);
        let base = ((iu + iz) & 1) ? A : Bc;
        const cu = Math.floor(u / FC);
        const hsh = hash2(cu, fz, 31);
        if (hsh < 0.22) {
          const fx = u - cu * FC;
          const shape = hsh < 0.12 ? Math.abs(fx - FC / 2) < 2.4 : fx > 2 && fx < 9 && hash2(cu, fz, 32) > 0.4;
          if (shape) base = mix(mix(A, flecks[((hsh * 10) | 0) % 3], 0.14), flecks[((hsh * 10) | 0) % 3], sharp * 0.42);
          else base = mix(base, flecks[((hsh * 10) | 0) % 3], 0.12);
        }
        const L = (1 + 0.05 * n1(u) + 0.04 * n2(u)) * (1 - Math.max(hz, lineCov(u, TL, 0.7, du)) * 0.1) * ao;
        const lit = pool(u);
        for (let c = 0; c < 3; c++) out[c] = base[c] * L + lit[c];
      };
    },
  };
}
function parquetMat(D, P) {
  const tones = [[152, 82, 70], [130, 66, 58], [168, 98, 80], [142, 76, 64]]; // rosewood
  const S = 25; // strip width: the herringbone's columns (100 to a period)
  const w = 7;
  const pools = lightPools(D, 0.28, [255, 180, 150]);
  // the rugs: under the boardroom table and before the desk
  const rugs = [];
  for (const it of D.mid.items) {
    if (it.kind === 'boardroom') rugs.push({ u0: uOfMid(it.u) - 40, u1: uOfMid(it.u1) + 40, z0: 760, z1: 1260, field: [112, 68, 100], border: [46, 104, 110], line: [232, 172, 144] });
    if (it.kind === 'desk') rugs.push({ u0: uOfMid(it.u) - 30, u1: uOfMid(it.u + it.w) + 30, z0: 780, z1: 1200, field: [48, 96, 106], border: [122, 70, 100], line: [226, 170, 144] });
  }
  return {
    row(Z, dZ, du, s) {
      const n1 = rowNoise(P_FLOOR, 1.6, 3, 21, Z);
      const n2 = rowNoise(P_FLOOR, 70, 120, 22, Z);
      const ao = 0.78 + 0.22 * smooth(s / 0.2);
      const pool = pools(Z, dZ);
      const planks = clamp01(1.4 - dZ / w); // planks blur together where a row spans many
      const rowRugs = rugs.filter((r) => Z > r.z0 && Z < r.z1);
      return (u, out) => {
        const i = Math.floor(u / S);
        const x = u - i * S;
        const t = Z + ((i & 1) ? S - x : x);
        const p = Math.floor(t / w);
        const tone = tones[(hash2(i, p, 5) * 4) | 0];
        const avg = tones[1];
        const gap = Math.max(lineCov(u, S, 0.7, du) * 0.5, lineCov(t, w, 0.5, dZ + du) * 0.35 * planks);
        let r = lerp(avg[0], tone[0], planks);
        let gg = lerp(avg[1], tone[1], planks);
        let b = lerp(avg[2], tone[2], planks);
        const L = (1 + 0.06 * n1(u) + 0.05 * n2(u)) * (1 - gap) * ao;
        r *= L; gg *= L; b *= L;
        for (const rg of rowRugs) {
          let uu = u;
          if (uu < rg.u0 - 10) uu += P_FLOOR;
          if (uu < rg.u0 || uu > rg.u1) continue;
          const du0 = Math.min(uu - rg.u0, rg.u1 - uu);
          const dz0 = Math.min(Z - rg.z0, rg.z1 - Z);
          const edge = Math.min(du0, dz0 * 1.4);
          let col = rg.field;
          if (edge < 26) col = rg.border;
          if (Math.abs(edge - 26) < 2.5 || Math.abs(edge - 8) < 1.6) col = rg.line;
          // a medallion in the field
          const cu = (rg.u0 + rg.u1) / 2;
          const cz = (rg.z0 + rg.z1) / 2;
          const md = Math.hypot((uu - cu) / ((rg.u1 - rg.u0) * 0.3), (Z - cz) / ((rg.z1 - rg.z0) * 0.3));
          if (edge >= 28 && md < 1) col = mix(rg.field, rg.line, md < 0.5 ? 0.45 : 0.2);
          const Lr = (1 + 0.08 * n1(u * 0.7)) * ao;
          r = col[0] * Lr; gg = col[1] * Lr; b = col[2] * Lr;
        }
        const lit = pool(u);
        out[0] = r + lit[0]; out[1] = gg + lit[1]; out[2] = b + lit[2];
      };
    },
  };
}
// Pools of light on the floor under the ceiling fixtures (they hang at the mid rate, so
// their pools are floor features at the mid depth and period).
function lightPools(D, amt, col) {
  const L = D.lights;
  const us = L.us.map(uOfMid);
  const add = [0, 0, 0];
  const zero = [0, 0, 0];
  return (Z, dZ) => {
    const dz = (Z - Z_MID) / 320;
    const kz = Math.exp(-dz * dz) * amt;
    if (kz * 255 < 0.8) return () => zero;
    return (u) => {
      let best = 1e9;
      for (let i = 0; i < us.length; i++) {
        let d = u - us[i];
        d -= Math.round(d / P_FLOOR) * P_FLOOR;
        if (d < 0) d = -d;
        if (d < best) best = d;
      }
      if (best > 400) return zero;
      const k = Math.exp(-(best * best) / (160 * 160)) * kz;
      add[0] = col[0] * k; add[1] = col[1] * k; add[2] = col[2] * k;
      return add;
    };
  };
}

// Sun through the panes, laid on the floor: each pane is projected along the light into
// the plan and back through the plan's own perspective, so the patches sit on the floor
// exactly as its joints do.
function sunOnFloor(ctx, f, spec) {
  const C = f.floorPlane.shiftBottom;
  const G = f.glass;
  const proj = (xw, h) => {
    const uw = uAtWall(xw, C);
    const hu = (h * Z_WALL) / FOCAL;
    const d = hu / spec.tanE;
    const Z = Math.max(FOCAL * 0.9, Z_WALL - d);
    const dd = Z_WALL - Z;
    return [floorX(uw + dd * spec.tanA, Z, C), floorY(Z)];
  };
  ctx.save();
  ctx.beginPath();
  ctx.rect(-10, WALL_BASE, W + 20, LANE_TOP - WALL_BASE);
  ctx.clip();
  const gr = ctx.createLinearGradient(0, WALL_BASE, 0, LANE_TOP);
  gr.addColorStop(0, css(spec.col, spec.a0));
  gr.addColorStop(1, css(spec.col, spec.a1));
  ctx.fillStyle = gr;
  ctx.beginPath();
  for (const b of f.wall.bays) {
    if (b.type !== 'glass') continue;
    if (b.x1 < -200 || b.x0 > W + 200) continue;
    const rows = spec.rows(b);
    for (let x = b.x0; x < b.x1 - 1; x += G.mullion) {
      const xa0 = x + spec.mw;
      const xb0 = Math.min(b.x1, x + G.mullion) - spec.mw;
      if (xb0 <= xa0) continue;
      for (const [xa, xb] of spec.cols ? spec.cols(b, xa0, xb0) : [[xa0, xb0]]) for (const [hb, ht] of rows) {
        const p = [proj(xa, hb), proj(xb, hb), proj(xb, ht), proj(xa, ht)];
        ctx.moveTo(p[0][0], p[0][1]);
        ctx.lineTo(p[1][0], p[1][1]);
        ctx.lineTo(p[2][0], p[2][1]);
        ctx.lineTo(p[3][0], p[3][1]);
        ctx.closePath();
      }
    }
  }
  ctx.fill();
  ctx.restore();
}

// Shafts of sunlight in the air: the hull of each pane's top edge and the patch its light
// lays on the floor, both found per frame, so the shaft shears between their two rates.
function sunShafts(ctx, f, spec) {
  if (!spec.beam) return;
  const C = f.floorPlane.shiftBottom;
  const G = f.glass;
  const proj = (xw, h) => {
    const uw = uAtWall(xw, C);
    const d = ((h * Z_WALL) / FOCAL) / spec.tanE;
    const Z = Math.max(FOCAL * 0.9, Z_WALL - d);
    return [floorX(uw + (Z_WALL - Z) * spec.tanA, Z, C), floorY(Z)];
  };
  ctx.save();
  ctx.beginPath();
  ctx.rect(-10, G.top, W + 20, LANE_TOP - G.top);
  ctx.clip();
  const gr = ctx.createLinearGradient(0, G.top, 0, LANE_TOP);
  gr.addColorStop(0, css(spec.col, spec.beam * 1.6));
  gr.addColorStop(0.6, css(spec.col, spec.beam));
  gr.addColorStop(1, css(spec.col, spec.beam * 0.4));
  ctx.fillStyle = gr;
  for (const b of f.wall.bays) {
    if (b.type !== 'glass' || b.x1 < -300 || b.x0 > W + 100) continue;
    const ht = WALL_BASE - G.top;
    for (let x = b.x0; x < b.x1 - 1; x += G.mullion * 2) {
      const xa = x + spec.mw;
      const xb = Math.min(b.x1, x + G.mullion * 2) - spec.mw;
      const pa = proj(xa, ht);
      const pb = proj(xb, ht);
      ctx.beginPath();
      ctx.moveTo(xa, G.top);
      ctx.lineTo(xb, G.top);
      ctx.lineTo(pb[0], pb[1]);
      ctx.lineTo(pa[0], pa[1]);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

// Reflections in the polished lobby floor: the columns dark, the glass bright, an open
// lift warm — each straight down from the thing it mirrors, at that thing's own rate.
function floorReflections(ctx, f, P) {
  const top = WALL_BASE;
  const hgt = 20;
  for (const b of f.wall.bays) {
    if (b.type !== 'glass' || b.x1 < -10 || b.x0 > W + 10) continue;
    vgrad(ctx, b.x0, top, b.x1 - b.x0, hgt, [236, 240, 240], 0.22, [236, 240, 240], 0);
  }
  for (const c of f.wall.columns) {
    if (c.x < -20 || c.x > W + 20) continue;
    vgrad(ctx, c.x - 1, top, c.w + 2, hgt + 4, P.columnDark, 0.5, P.columnDark, 0);
  }
  for (const h of f.wall.hangs) {
    if (h.kind !== 'lift' || !(h.open > 0.05)) continue;
    const half = h.w / 2;
    const gap = h.open * half;
    vgrad(ctx, h.x + half - gap, top, gap * 2, 14, [255, 214, 150], 0.3 * h.open, [255, 214, 150], 0);
  }
}

// ================================================================== MID FURNITURE
function plantSprite(k, variant, seed, P, fl) {
  const R = rng(seed);
  const potCol = fl === 'exec' ? [70, 50, 40] : fl === 'open' ? [190, 180, 160] : [150, 112, 70];
  const leaf = fl === 'exec' ? { body: [44, 78, 58], dark: [26, 50, 40], lit: [150, 170, 110] } : { body: [64, 104, 72], dark: [40, 70, 52], lit: [170, 196, 128] };
  const rimDir = fl === 'lobby' ? [-0.6, -0.8] : [-0.2, -0.98];
  const H = { ficus: 60, palm: 70, snake: 34, bonsai: 22 }[variant] ?? 50;
  const Wd = { ficus: 34, palm: 46, snake: 18, bonsai: 24 }[variant] ?? 30;
  const pot = (g) => {
    const pw = variant === 'snake' ? 10 : variant === 'bonsai' ? 14 : 14;
    const ph = variant === 'bonsai' ? 4 : 11;
    fillPoly(g, [-pw / 2, -ph, pw / 2, -ph, pw / 2 - 2, 0, -pw / 2 + 2, 0], 0.2, seed);
  };
  const potSpr = massSprite(k, [-12, -14, 24, 16], pot, { body: potCol, dark: shade(potCol, -0.3), lit: shade(potCol, 0.4), rim: 0.7, rimA: 0.8, rimDir, dabs: 0.2, dab: 1, seed: seed + 1 });
  const foliage = massSprite(k, [-Wd / 2 - 4, -H - 4, Wd + 8, H], (g) => {
    if (variant === 'ficus') {
      limb(g, [[0, -9], [-1, -28], [1, -44]], 2.4, 1, seed);
      for (let i = 0; i < 70; i++) {
        const a = R() * TAU;
        const rr = Math.sqrt(R());
        const cy = -38 - (i % 3) * 6;
        dab(g, Math.cos(a) * rr * Wd * 0.48, cy + Math.sin(a) * rr * 16, 2.6 + R() * 1.6, 1.4 + R(), R() * TAU);
      }
    } else if (variant === 'palm') {
      limb(g, [[0, -9], [0.5, -26], [0, -40]], 2.2, 1.2, seed);
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI / 2 + (i - 4) * 0.36 + (R() - 0.5) * 0.2;
        const L = 20 + R() * 12;
        const ex = Math.cos(a) * L;
        const ey = -40 + Math.sin(a) * L * 0.8 + L * 0.35;
        limb(g, [[0, -40], [ex * 0.5, -40 + Math.sin(a) * L * 0.5 - 4], [ex, ey]], 3.2, 0.5, seed + i);
        for (let s = 0.25; s < 1; s += 0.12) {
          const px = ex * s;
          const py = -40 + (ey + 40) * s - Math.sin(s * Math.PI) * 5;
          limb(g, [[px, py], [px + Math.cos(a + 1.2) * 5, py + 4]], 1.2, 0.3, i * 10 + s * 10);
          limb(g, [[px, py], [px + Math.cos(a - 1.2) * 5, py + 4]], 1.2, 0.3, i * 10 + s * 10 + 1);
        }
      }
    } else if (variant === 'snake') {
      for (let i = 0; i < 7; i++) {
        const x = (i - 3) * 1.8;
        const h = 18 + R() * 14;
        limb(g, [[x, -10], [x + (R() - 0.5) * 3, -10 - h * 0.5], [x + (R() - 0.5) * 5, -10 - h]], 3, 0.4, seed + i);
      }
    } else {
      // bonsai: a twisted trunk and flat clouds of foliage
      limb(g, [[0, -4], [-3, -9], [2, -14], [-1, -18]], 2.6, 1, seed);
      for (const [cx, cy, rx] of [[-5, -15, 6], [5, -18, 5], [-1, -21, 4]]) fillPoly(g, arcPts(cx, cy, rx, rx * 0.5, 0, TAU, 20), 0.6, cx);
    }
  }, { ...leaf, rim: 0.8, rimA: 0.85, rimDir, dabs: 0.3, dab: 1.4, seed: seed + 2, g0: 0.1 });
  return { pot: potSpr, foliage, H, Wd };
}

function buildMid(k, D, P, B) {
  const fl = D.id;
  const M = D.mid;
  const sprites = {};
  const strip = makeStrip(k, 1, M.period, 118, 224, (S) => {
    const g = S.g;
    const b = MID_BASE;
    // contact shadows first, on the floor under everything
    for (const it of M.items) {
      const w = itemW(it);
      S.rep(it.u, w, (x) => {
        const cx = x + (it.kind === 'plant' ? ({ ficus: 15, palm: 20, snake: 8, bonsai: 9 }[it.variant] ?? 15) : w / 2);
        const gr = g.createRadialGradient(cx, b + 1, 1, cx, b + 1, w * 0.62 + 6);
        gr.addColorStop(0, css(P.shadowTint, 0.42));
        gr.addColorStop(1, css(P.shadowTint, 0));
        g.save();
        g.translate(cx, b + 1);
        g.scale(1, 0.14);
        g.translate(-cx, -(b + 1));
        g.fillStyle = gr;
        g.fillRect(cx - w, b + 1 - w, w * 2, w * 2);
        g.restore();
      });
    }
    M.items.forEach((it, i) => {
      const w = itemW(it);
      S.rep(it.u, w, (x) => midItem(S, it, i, x, D, P, sprites, k));
    });
    // the band behind the lane is kept calm: a wash of the room's air over it
    g.save();
    g.globalCompositeOperation = 'source-atop';
    const wa = { lobby: [0.06, 0.12], open: [0.02, 0.05], exec: [0.05, 0.1] }[fl];
    vgrad(g, S.u0, 150, S.u1 - S.u0, 70, P.ambient, wa[0], P.ambient, wa[1]);
    g.restore();
  });
  mottle(strip, 0.25, 61 + D.stage, 6, 5);
  retile(strip);
  return strip;
}
function itemW(it) {
  if (it.kind === 'cubicles' || it.kind === 'boardroom') return it.u1 - it.u + (it.kind === 'boardroom' ? 40 : 0);
  return it.w || { plant: { ficus: 30, palm: 40, snake: 16, bonsai: 18 }[it.variant] ?? 30, sculpture: 40, cooler: 14, cabinet: 20, globe: 18, tallclock: 20 }[it.kind] || 30;
}
function midItem(S, it, i, x0, D, P, sprites, k) {
  const g = S.g;
  // the plan places every mid item by its left edge; the round ones are painted about
  // their centre
  const half = { plant: { ficus: 15, palm: 20, snake: 8, bonsai: 9 }[it.variant] ?? 15, cooler: 7, cabinet: 10, tallclock: 10 }[it.kind] ?? 0;
  const x = x0 + half;
  const b = MID_BASE;
  const fl = D.id;
  const rimDir = fl === 'lobby' ? [-0.6, -0.8] : [-0.2, -0.98];
  switch (it.kind) {
    case 'plant': {
      const key = `plant${i}`;
      // the lobby's snake plant becomes a bonsai: every 1988 lobby had one
      const variant = fl === 'lobby' && it.variant === 'snake' ? 'bonsai' : it.variant;
      if (!sprites[key]) sprites[key] = plantSprite(k, variant, 600 + i * 13, P, fl);
      const sp = sprites[key];
      if (variant === 'bonsai') {
        // on a little black lacquer stand
        box(g, x - 9, b - 16, 18, 2.4, { body: [34, 30, 38], lit: [200, 150, 176], dabs: 0, seed: x });
        g.fillStyle = css([24, 20, 28]);
        g.fillRect(x - 7, b - 14, 1.6, 14);
        g.fillRect(x + 5.4, b - 14, 1.6, 14);
        blit(g, sp.pot, x, b - 16);
        blit(g, sp.foliage, x, b - 16);
      } else {
        blit(g, sp.foliage, x, b);
        blit(g, sp.pot, x, b);
      }
      return;
    }
    case 'reception': {
      const w = it.w;
      // black lacquer with brass bands and a rose granite top: the desk at Nakatomi
      const lac = [30, 26, 34];
      const shape = (gg) => fillPoly(gg, [x, b, x, b - 30, x + 6, b - 34, x + w - 6, b - 34, x + w, b - 30, x + w, b], 0.3, x);
      const spr = massSprite(k, [x - 2, b - 38, w + 4, 40], shape, { body: lac, dark: [18, 16, 22], lit: [220, 170, 190], rim: 0.9, rimA: 0.7, rimDir, dabs: 0.1, dab: 2, dabAng: Math.PI / 2, seed: 701 }, (gg) => {
        // the lacquer's gloss: soft vertical reflections of the lobby's light
        for (let fx = x + 10; fx < x + w - 6; fx += 23) {
          gg.fillStyle = css([200, 160, 180], 0.12);
          fillPoly(gg, rectPts(fx, b - 30, 5, 28), 0.6, fx);
        }
        gg.fillStyle = css(P.bronze, 0.9);
        gg.fillRect(x + 2, b - 9, w - 4, 1.2);
        gg.fillRect(x + 2, b - 26, w - 4, 0.8);
        box(gg, x - 1, b - 35, w + 2, 4, { body: [176, 132, 134], dark: [142, 104, 108], lit: [246, 214, 210], dabs: 0.4, dab: 0.6, rimA: 1, seed: x + 4 });
        gg.fillStyle = css(P.bronze);
        fillPoly(gg, eggPts(x + w / 2, b - 18, 4.5, 5.6), 0.15, 3);
        gg.fillStyle = css(P.bronzeLit, 0.8);
        dab(gg, x + w / 2 - 1.4, b - 20, 0.9, 1.6, -0.3);
      });
      blit(g, spr, 0, 0);
      // a beige terminal (its back to us) and a phone on the counter
      box(g, x + w * 0.6, b - 50, 17, 14, { body: [208, 196, 172], dark: [170, 158, 136], lit: [246, 238, 220], rimLeft: true, dabs: 0, seed: x + 7 });
      g.fillStyle = css([150, 140, 120]);
      for (let vy = b - 46; vy < b - 40; vy += 1.6) g.fillRect(x + w * 0.6 + 4, vy, 9, 0.6);
      box(g, x + w * 0.6 + 4, b - 37, 9, 2.4, { body: [190, 178, 156], dabs: 0, wob: 0, seed: x + 8 });
      box(g, x + w * 0.22, b - 38, 9, 3, { body: [40, 36, 44], lit: [150, 130, 150], dabs: 0, wob: 0.1, seed: x + 9 });
      g.fillStyle = css([40, 36, 44]);
      fillPoly(g, [x + w * 0.22, b - 38, x + w * 0.22 + 9, b - 38, x + w * 0.22 + 8, b - 40.4, x + w * 0.22 + 1, b - 40.4], 0, 0);
      return;
    }
    case 'turnstiles': {
      const w = it.w;
      for (let p = 0; p < 4; p++) {
        const px = x + (p * w) / 3.3 + 4;
        box(g, px - 3, b - 26, 6, 26, { body: P.bronze, dark: P.bronzeDark, lit: P.bronzeLit, rimLeft: true, dabs: 0.05, seed: px });
        g.fillStyle = css([255, 80, 70], 0.75);
        g.fillRect(px - 1.6, b - 24, 3.2, 1.2);
        if (p < 3) {
          // smoked glass flaps, kept faint so they never read as a solid behind the lane
          g.fillStyle = css([110, 86, 80], 0.12);
          fillPoly(g, rectPts(px + 3, b - 22, w / 3.3 - 6, 12), 0.2, px + 1);
          brokenEdge(g, px + 3, b - 22, px + w / 3.3 - 3, b - 22, 0.5, [236, 200, 200], 0.3, px + 2);
        }
      }
      return;
    }
    case 'sofa': {
      const w = it.w;
      // the lobby's sofas wear Memphis (muted: it sits behind the lane); 88's are black hide
      const memphis = fl !== 'exec';
      const col = memphis ? [74, 112, 118] : [34, 30, 38];
      const spr = massSprite(k, [x - 2, b - 30, w + 4, 32], (gg) => {
        fillPoly(gg, [x + 2, b - 4, x + 2, b - 26, x + 8, b - 28, x + w - 8, b - 28, x + w - 2, b - 26, x + w - 2, b - 4], 0.3, x);
        fillPoly(gg, rectPts(x - 1, b - 18, 7, 15), 0.3, x + 1);
        fillPoly(gg, rectPts(x + w - 6, b - 18, 7, 15), 0.3, x + 2);
        fillPoly(gg, rectPts(x + 2, b - 4, 2, 4), 0, 0);
        fillPoly(gg, rectPts(x + w - 4, b - 4, 2, 4), 0, 0);
      }, { body: col, dark: shade(col, -0.3), lit: memphis ? shade(col, 0.45) : [190, 150, 180], rim: 0.9, rimA: 0.8, rimDir, dabs: 0.2, dab: 2, seed: 720 + i }, (gg, RR) => {
        if (memphis) {
          // squiggles, confetti and little triangles, all a step off the ground colour
          gg.lineWidth = 0.7;
          for (let n = 0; n < w / 4; n++) {
            const px = x + RR() * w;
            const py = b - 26 + RR() * 22;
            const kind = (RR() * 4) | 0;
            if (kind === 0) {
              gg.strokeStyle = css([226, 226, 216], 0.45);
              gg.beginPath();
              gg.moveTo(px, py);
              gg.quadraticCurveTo(px + 1.5, py - 1.8, px + 3, py);
              gg.quadraticCurveTo(px + 4.5, py + 1.8, px + 6, py);
              gg.stroke();
            } else if (kind === 1) {
              gg.fillStyle = css([220, 130, 160], 0.6);
              dab(gg, px, py, 0.8, 0.8, 0);
            } else if (kind === 2) {
              gg.fillStyle = css([226, 200, 110], 0.5);
              fillPoly(gg, [px, py, px + 2.4, py + 0.6, px + 0.8, py + 2.2], 0, 0);
            } else {
              gg.fillStyle = css([30, 40, 46], 0.4);
              gg.fillRect(px, py, 1.6, 0.6);
            }
          }
        } else {
          // tufted black hide with brass studs along the arms
          for (let bx = x + 8; bx < x + w - 6; bx += 6) for (const by of [b - 24, b - 20]) { gg.fillStyle = css([12, 10, 14], 0.7); dab(gg, bx + (by % 2) * 3, by, 0.6, 0.6, 0); }
          gg.fillStyle = css(P.brass ?? P.bronze);
          for (let sy = b - 17; sy < b - 4; sy += 2) { dab(gg, x + 0.5, sy, 0.4, 0.4, 0); dab(gg, x + w - 0.5, sy, 0.4, 0.4, 0); }
        }
        gg.fillStyle = css(shade(col, -0.3), 0.7);
        gg.fillRect(x + 6, b - 13, w - 12, 1);
        for (let cx = x + w / 3; cx < x + w - 6; cx += w / 3) gg.fillRect(cx, b - 13, 0.8, 9);
      });
      blit(g, spr, 0, 0);
      return;
    }
    case 'sculpture': {
      // the koi pond: a black granite basin, teal water with koi turning in it, and the
      // company's brass egg rising out of the middle on a plinth
      const cx = x + 20;
      const ry = 3.4;
      g.fillStyle = css([30, 26, 34]);
      fillPoly(g, arcPts(cx, b - 6, 29, 6.5, 0, TAU, 40), 0.3, x);
      fillPoly(g, rectPts(cx - 29, b - 6, 58, 6), 0.2, x + 1);
      brokenEdge(g, cx - 28, b - 8.6, cx + 10, b - 12, 0.9, [236, 190, 206], 0.7, x + 2);
      const wg = g.createLinearGradient(0, b - 11, 0, b - 3);
      wg.addColorStop(0, css([60, 120, 128]));
      wg.addColorStop(1, css([30, 74, 86]));
      g.fillStyle = wg;
      fillPoly(g, arcPts(cx, b - 7, 26, ry, 0, TAU, 40), 0.2, x + 3);
      for (const [kx, ky, col] of [[-16, -7.4, [236, 120, 60]], [-7, -6.2, [246, 236, 226]], [9, -7.6, [236, 120, 60]], [17, -6.6, [236, 96, 50]]]) {
        g.fillStyle = css(col, 0.85);
        dab(g, cx + kx, b + ky, 2.2, 0.7, (kx % 3) * 0.2);
        dab(g, cx + kx + 2, b + ky + 0.2, 0.9, 0.5, 0.6);
      }
      g.fillStyle = css([200, 240, 240], 0.35);
      for (let n = 0; n < 4; n++) g.fillRect(cx - 18 + n * 11, b - 8.6 + (n % 2), 6, 0.4);
      box(g, cx - 4, b - 24, 8, 16, { body: [40, 34, 44], dark: [24, 20, 28], lit: [200, 160, 180], rimLeft: true, dabs: 0, seed: x + 4 });
      const spr = massSprite(k, [x + 4, b - 62, 32, 40], (gg) => fillPoly(gg, eggPts(cx, b - 38, 10, 13.5), 0.2, 4), {
        body: P.bronze, dark: P.bronzeDark, lit: P.bronzeLit, rim: 1.2, rimA: 0.95, rimDir, dabs: 0.2, dab: 1.2, seed: 730, g0: 0.2,
      }, (gg) => {
        gg.fillStyle = css([255, 244, 220], 0.55);
        dab(gg, cx - 4, b - 46, 1.8, 3.4, -0.4);
        gg.fillStyle = css([90, 50, 40], 0.5);
        dab(gg, cx + 5, b - 34, 3.6, 6.4, 0.3);
        // the egg's crack, in a pink neon line
        gg.strokeStyle = css(NEON.pink, 0.9);
        gg.lineWidth = 0.7;
        gg.beginPath();
        gg.moveTo(cx - 10, b - 40);
        for (let n = 1; n <= 6; n++) gg.lineTo(cx - 10 + n * 3.4, b - 40 + (n % 2 ? -2 : 1.4));
        gg.stroke();
      });
      blit(g, spr, 0, 0);
      return;
    }
    case 'cubicles': {
      const w = it.u1 - it.u;
      const n = Math.round(w / 40);
      const fab = fl === 'open' ? [132, 114, 128] : [128, 120, 102];
      // fabric panels: a soft gradient, a fine vertical weave, posts and the cap rail
      const fg = g.createLinearGradient(0, b - 34, 0, b);
      fg.addColorStop(0, css(shade(fab, 0.06)));
      fg.addColorStop(1, css(shade(fab, -0.2)));
      g.fillStyle = fg;
      fillPoly(g, rectPts(x, b - 34, w, 34), 0.25, x);
      const RW = rng(it.u + 11);
      for (let fx = x + 0.6; fx < x + w; fx += 1.3) {
        g.fillStyle = css(RW() < 0.5 ? shade(fab, 0.07) : shade(fab, -0.08), 0.35);
        g.fillRect(fx, b - 33, 0.5, 31);
      }
      for (let d = 0; d < n; d++) {
        // each desk's panel sags a little in its frame: a soft shade along the top
        vgrad(g, x + d * 40 + 2, b - 33, 36, 6, shade(fab, -0.3), 0.25, fab, 0);
      }
      for (let d = 0; d <= n; d++) {
        const px = x + d * 40;
        box(g, px - 1.4, b - 34, 2.8, 34, { body: [150, 150, 146], dark: [112, 112, 110], lit: [222, 222, 214], rimTop: false, rimLeft: true, dabs: 0, wob: 0.1, seed: px });
      }
      box(g, x - 1, b - 35, w + 2, 2.6, { body: [70, 128, 132], dark: [48, 96, 104], lit: [190, 236, 236], dabs: 0, wob: 0.1, rimA: 0.9, seed: x + 3 });
      g.fillStyle = css(shade(fab, -0.35), 0.5);
      g.fillRect(x, b - 4, w, 4);
      // behind the partition, the backs of beige terminals, glowing green and amber; on the
      // rail, Rolodexes, mugs, a Newton's cradle, a spider plant
      const R = rng(it.u + 3);
      for (let d = 0; d < n; d++) {
        const occupied = it.heads.includes(d) || d === it.pop;
        const dx = x + d * 40;
        if (!occupied) {
          const amber = hash(it.u + d * 7) > 0.55;
          const gc = amber ? [255, 190, 90] : [120, 255, 150];
          g.save();
          g.globalCompositeOperation = 'destination-over';
          box(g, dx + 12, b - 47, 16, 13, { body: [206, 194, 170], dark: [168, 156, 134], lit: [246, 236, 214], rimLeft: true, dabs: 0, seed: dx + 1 });
          const gr = g.createRadialGradient(dx + 20, b - 44, 1, dx + 20, b - 44, 18);
          gr.addColorStop(0, css(gc, 0.3));
          gr.addColorStop(1, css(gc, 0));
          g.fillStyle = gr;
          g.fillRect(dx + 1, b - 62, 38, 28);
          g.restore();
          g.fillStyle = css([150, 140, 120], 0.8);
          for (let vy = b - 44; vy < b - 37; vy += 1.6) g.fillRect(dx + 15, vy, 10, 0.5);
        }
        const thing = R();
        if (thing < 0.3) {
          // a Rolodex: a black drum of cards on its stand
          const rx = dx + 6 + R() * 22;
          g.fillStyle = css([30, 28, 34]);
          fillPoly(g, [rx - 3, b - 35.5, rx + 3, b - 35.5, rx + 2, b - 37, rx - 2, b - 37], 0, 0);
          g.fillStyle = css([230, 224, 210]);
          for (let c2 = -2; c2 <= 2; c2++) fillPoly(g, [rx + c2 * 0.9 - 0.4, b - 37, rx + c2 * 1.6 - 0.6, b - 41.5 + Math.abs(c2) * 0.6, rx + c2 * 1.6 + 0.6, b - 41.5 + Math.abs(c2) * 0.6, rx + c2 * 0.9 + 0.4, b - 37], 0, 0);
        } else if (thing < 0.55) {
          const mc = [[220, 110, 150], [70, 150, 156], [236, 200, 110], [236, 232, 220]][(R() * 4) | 0];
          box(g, dx + 8 + R() * 22, b - 39, 3, 4, { body: mc, lit: shade(mc, 0.4), dabs: 0, wob: 0.1, seed: dx });
        } else if (thing < 0.72) {
          // a Newton's cradle, every desk had one
          const nx = dx + 10 + R() * 18;
          g.fillStyle = css([190, 194, 206]);
          g.fillRect(nx - 4, b - 43, 8, 0.6);
          g.fillRect(nx - 4, b - 43, 0.5, 7);
          g.fillRect(nx + 3.5, b - 43, 0.5, 7);
          for (let q = 0; q < 4; q++) dab(g, nx - 2.1 + q * 1.4, b - 37.6, 0.7, 0.7, 0);
        } else {
          g.fillStyle = css([90, 140, 80]);
          for (let l = 0; l < 6; l++) limb(g, [[dx + 30, b - 37], [dx + 30 + (l - 2.5) * 2.2, b - 40], [dx + 30 + (l - 2.5) * 3.4, b - 37.5]], 0.9, 0.3, l);
          g.fillStyle = css([226, 120, 150]);
          g.fillRect(dx + 28, b - 38, 4, 3);
        }
      }
      return;
    }
    case 'cooler': {
      // a mid grey cabinet, not a pale block, behind the lane
      box(g, x - 7, b - 30, 14, 30, { body: [168, 166, 160], dark: [134, 132, 128], lit: [226, 226, 218], rimLeft: true, dabs: 0.05, seed: x });
      g.fillStyle = css([60, 64, 70]);
      g.fillRect(x - 3, b - 22, 6, 4);
      g.fillStyle = css([90, 150, 210]);
      g.fillRect(x - 2.4, b - 18, 1.4, 1.6);
      g.fillStyle = css([210, 70, 60]);
      g.fillRect(x + 1, b - 18, 1.4, 1.6);
      // the big blue bottle (its glug is drawn per frame)
      const spr = massSprite(k, [x - 8, b - 46, 16, 17], (gg) => {
        fillPoly(gg, [x - 6, b - 31, x - 6, b - 41, x - 3, b - 44, x + 3, b - 44, x + 6, b - 41, x + 6, b - 31], 0.2, x);
      }, { body: [120, 176, 214], dark: [70, 120, 170], lit: [220, 240, 250], rim: 0.7, rimA: 0.8, rimDir, dabs: 0.2, dab: 1, seed: 750 + i });
      blit(g, spr, 0, 0);
      return;
    }
    case 'copier': {
      const w = it.w;
      // a warm taupe machine, darker than the printer in the lane so it never reads as one
      box(g, x, b - 24, w, 24, { body: [150, 142, 128], dark: [118, 110, 98], lit: [214, 206, 188], rimLeft: true, dabs: 0.08, seed: x });
      box(g, x - 1, b - 30, w + 2, 6, { body: [132, 126, 116], dark: [108, 102, 94], lit: [206, 200, 186], dabs: 0, seed: x + 1 });
      g.fillStyle = css([92, 86, 78]);
      for (const y of [b - 17, b - 9]) g.fillRect(x + 3, y, w - 6, 0.8);
      box(g, x + w - 12, b - 22, 9, 4, { body: [70, 72, 70], dabs: 0, wob: 0, seed: x + 2 });
      g.fillStyle = css([110, 200, 140]);
      g.fillRect(x + w - 10, b - 21, 1.4, 1.2);
      return;
    }
    case 'cabinet': {
      const col = fl === 'open' ? [176, 166, 146] : [110, 120, 92];
      if (fl === 'open' && i === D.mid.items.findIndex((m) => m.kind === 'cabinet')) {
        // the fax machine, a sheet curling out of it
        box(g, x - 9, b - 51, 18, 7, { body: [214, 204, 184], dark: [180, 170, 150], lit: [250, 244, 230], rimLeft: true, dabs: 0, seed: x + 9 });
        g.fillStyle = css([60, 60, 66]);
        g.fillRect(x - 6, b - 49.6, 6, 2.4);
        g.fillStyle = css([110, 230, 140]);
        g.fillRect(x + 2, b - 49, 3, 1.2);
        g.fillStyle = css([226, 220, 206], 0.9);
        fillPoly(g, [x - 4, b - 51, x + 4, b - 51, x + 5, b - 55, x + 1, b - 57.5, x - 3, b - 55], 0.2, x + 10);
        g.fillStyle = css([40, 40, 46]);
        g.fillRect(x - 7, b - 46, 4, 2);
      }
      box(g, x - 10, b - 44, 20, 44, { body: col, dark: shade(col, -0.25), lit: shade(col, 0.45), rimLeft: true, dabs: 0.06, seed: x });
      for (let d = 0; d < 4; d++) {
        const y = b - 43 + d * 10.8;
        box(g, x - 8.5, y + 1, 17, 9.4, { body: shade(col, 0.04), dark: shade(col, -0.18), lit: shade(col, 0.35), dabs: 0, wob: 0.1, rimA: 0.6, seed: x + d });
        g.fillStyle = css([200, 196, 176]);
        g.fillRect(x - 3, y + 3.4, 6, 1.4);
        g.fillStyle = css([236, 230, 210], 0.8);
        g.fillRect(x - 2, y + 6, 4, 1.4);
      }
      return;
    }
    case 'boardroom': {
      const w = it.u1 - it.u;
      // the long table (the chairs and the dozing board are drawn per frame, behind it)
      const spr = massSprite(k, [x - 4, b - 30, w + 8, 32], (gg) => {
        fillPoly(gg, rectPts(x, b - 26, w, 5), 0.2, x);
        for (const lx of [x + 12, x + w / 2 - 3, x + w - 18]) fillPoly(gg, [lx, b - 21, lx + 6, b - 21, lx + 5, b, lx + 1, b], 0.15, lx);
      }, { body: P.lacquer, dark: shade(P.lacquer, -0.3), lit: P.lacquerLit, rim: 0.9, rimA: 0.9, rimDir: [0, -1], dabs: 0.1, dab: 2, dabAng: 0, seed: 760 }, (gg) => {
        // a glass top on black lacquer: its green-white edge, and the lamps in its gloss
        gg.fillStyle = css([190, 230, 220], 0.6);
        gg.fillRect(x, b - 26, w, 1);
        gg.fillStyle = css(P.warm, 0.18);
        for (let gx = x + 20; gx < x + w - 10; gx += 60) gg.fillRect(gx, b - 24.6, 18, 0.8);
      });
      blit(g, spr, 0, 0);
      // papers, water glasses and a carafe on the table
      const R = rng(it.u);
      for (let s = 0; s < it.seats; s++) {
        const cx = x + (w / it.seats) * (s + 0.5);
        g.fillStyle = css([226, 216, 190], 0.85);
        fillPoly(g, [cx - 4, b - 26.4, cx + 4, b - 26.4, cx + 3, b - 27.6, cx - 3, b - 27.6], 0, 0);
        if (R() < 0.6) {
          g.fillStyle = css([200, 220, 226], 0.5);
          g.fillRect(cx + 4, b - 30, 1.6, 3.6);
        }
      }
      if (it.easel) {
        // the flip chart: a chart falling, then rising
        const ex = x + w + 10;
        g.fillStyle = css([70, 46, 30]);
        g.fillRect(ex + 2, b - 50, 1.2, 50);
        g.fillRect(ex + 20, b - 50, 1.2, 50);
        fillPoly(g, [ex + 11, b - 54, ex + 12, b - 54, ex + 18, b, ex + 16.8, b], 0, 0);
        box(g, ex, b - 52, 24, 30, { body: [150, 132, 110], dark: [118, 102, 84], lit: [214, 184, 140], dabs: 0.05, seed: ex });
        g.strokeStyle = css([170, 50, 40], 0.9);
        g.lineWidth = 0.9;
        g.beginPath();
        g.moveTo(ex + 3, b - 46);
        g.lineTo(ex + 9, b - 34);
        g.lineTo(ex + 14, b - 31);
        g.lineTo(ex + 21, b - 44);
        g.stroke();
        g.strokeStyle = css([40, 40, 50], 0.8);
        g.lineWidth = 0.6;
        g.beginPath();
        g.moveTo(ex + 3, b - 48);
        g.lineTo(ex + 3, b - 27);
        g.lineTo(ex + 22, b - 27);
        g.stroke();
      }
      return;
    }
    case 'desk': {
      const w = it.w;
      // the high-back leather chair behind the desk, then the desk itself
      const chair = massSprite(k, [x + w / 2 - 12, b - 58, 24, 30], (gg) => fillPoly(gg, [x + w / 2 - 10, b - 30, x + w / 2 - 11, b - 52, x + w / 2 - 6, b - 57, x + w / 2 + 6, b - 57, x + w / 2 + 11, b - 52, x + w / 2 + 10, b - 30], 0.3, x), {
        body: [36, 30, 40], dark: [18, 14, 22], lit: [190, 140, 176], rim: 0.9, rimA: 0.8, rimDir: [0, -1], dabs: 0.3, dab: 1.6, seed: 770,
      }, (gg) => {
        gg.fillStyle = css([30, 14, 12], 0.6);
        for (let by = b - 52; by < b - 32; by += 5) for (let bx = x + w / 2 - 8; bx < x + w / 2 + 8; bx += 4) dab(gg, bx + (by % 2) * 2, by, 0.5, 0.5, 0);
      });
      blit(g, chair, 0, 0);
      const spr = massSprite(k, [x - 3, b - 33, w + 6, 35], (gg) => {
        fillPoly(gg, rectPts(x - 1, b - 30, w + 2, 4), 0.2, x);
        fillPoly(gg, rectPts(x + 2, b - 27, 30, 27), 0.2, x + 1);
        fillPoly(gg, rectPts(x + w - 32, b - 27, 30, 27), 0.2, x + 2);
        fillPoly(gg, rectPts(x + 30, b - 27, w - 60, 10), 0.2, x + 3);
      }, { body: P.lacquer, dark: shade(P.lacquer, -0.3), lit: P.lacquerLit, rim: 0.9, rimA: 0.9, rimDir: [0, -1], dabs: 0.08, dab: 2, seed: 771 }, (gg) => {
        for (const px of [x + 4, x + w - 30]) {
          for (let d = 0; d < 3; d++) {
            gg.fillStyle = css([8, 6, 10], 0.6);
            gg.fillRect(px, b - 25 + d * 8, 26, 0.8);
            gg.fillStyle = css(P.brass);
            gg.fillRect(px + 9, b - 21.6 + d * 8, 8, 0.8);
          }
        }
        gg.fillStyle = css(P.brass);
        gg.fillRect(x - 1, b - 30, w + 2, 1);
        gg.fillStyle = css(P.lacquerLit, 0.16);
        for (const px of [x + 12, x + w - 22]) fillPoly(gg, rectPts(px, b - 26, 4, 24), 0.5, px);
      });
      blit(g, spr, 0, 0);
      // the halogen desk lamp: a black arm, a small head, a hard white-pink pool
      const lx = x + w * 0.74;
      const gr = g.createRadialGradient(lx - 4, b - 31, 1, lx - 4, b - 31, 26);
      gr.addColorStop(0, css(P.warm, 0.55));
      gr.addColorStop(1, css(P.warm, 0));
      g.fillStyle = gr;
      g.fillRect(lx - 32, b - 58, 56, 30);
      g.strokeStyle = css([22, 20, 26]);
      g.lineWidth = 0.9;
      g.beginPath();
      g.moveTo(lx + 2, b - 31);
      g.lineTo(lx + 4, b - 44);
      g.lineTo(lx - 5, b - 47);
      g.stroke();
      box(g, lx + 0.5, b - 31.6, 4, 1.4, { body: [22, 20, 26], dabs: 0, wob: 0, seed: lx });
      g.fillStyle = css([22, 20, 26]);
      fillPoly(g, [lx - 9, b - 46, lx - 4, b - 48.6, lx - 3, b - 45.6, lx - 7.6, b - 43.6], 0, 0);
      g.fillStyle = css([255, 246, 236]);
      g.fillRect(lx - 8.6, b - 44.6, 4, 0.8);
      // the car phone: a brick with an aerial, and a Rolodex
      box(g, x + w * 0.24, b - 33.4, 9, 3.4, { body: [30, 28, 34], lit: [150, 140, 160], dabs: 0, wob: 0.1, seed: x + 5 });
      g.fillStyle = css([30, 28, 34]);
      g.fillRect(x + w * 0.24 + 7.4, b - 39, 0.7, 6);
      g.fillStyle = css([120, 255, 150], 0.8);
      g.fillRect(x + w * 0.24 + 1.4, b - 32.6, 2.4, 0.8);
      const rx = x + w * 0.5;
      g.fillStyle = css([30, 28, 34]);
      fillPoly(g, [rx - 3, b - 30, rx + 3, b - 30, rx + 2, b - 31.6, rx - 2, b - 31.6], 0, 0);
      g.fillStyle = css([232, 226, 214]);
      for (let c2 = -2; c2 <= 2; c2++) fillPoly(g, [rx + c2 * 0.9 - 0.4, b - 31.6, rx + c2 * 1.6 - 0.6, b - 36 + Math.abs(c2) * 0.6, rx + c2 * 1.6 + 0.6, b - 36 + Math.abs(c2) * 0.6, rx + c2 * 0.9 + 0.4, b - 31.6], 0, 0);
      return;
    }
    case 'globe': {
      const wood = P.wood ?? [100, 64, 40];
      g.fillStyle = css(P.woodDark ?? [60, 40, 28]);
      fillPoly(g, [x + 3, b, x + 9, b - 12, x + 15, b, x + 13, b, x + 9, b - 9, x + 5, b], 0, 0);
      box(g, x + 4, b - 13, 10, 2, { body: wood, lit: P.woodLit, dabs: 0, wob: 0, seed: x });
      const spr = massSprite(k, [x - 2, b - 36, 22, 24], (gg) => fillPoly(gg, arcPts(x + 9, b - 24, 9, 9, 0, TAU, 30), 0.15, x), {
        body: [70, 120, 114], dark: [40, 74, 72], lit: [200, 220, 170], rim: 0.9, rimA: 0.8, rimDir: [-0.3, -0.95], dabs: 0.2, dab: 1, seed: 780 + i,
      }, (gg, R) => {
        gg.fillStyle = css([186, 150, 90], 0.9);
        for (let c = 0; c < 4; c++) fillPoly(gg, arcPts(x + 5 + R() * 9, b - 30 + R() * 10, 2 + R() * 3, 1.5 + R() * 2.4, 0, TAU, 12), 0.6, c + i);
      });
      blit(g, spr, 0, 0);
      g.strokeStyle = css(P.brass ?? [176, 136, 70]);
      g.lineWidth = 0.9;
      g.beginPath();
      g.arc(x + 9, b - 24, 10.5, Math.PI * 0.6, Math.PI * 2.1);
      g.stroke();
      return;
    }
    case 'tallclock': {
      const wood = P.wood;
      const spr = massSprite(k, [x - 12, b - 72, 24, 74], (gg) => {
        fillPoly(gg, [x - 8, b, x - 8, b - 6, x - 6, b - 8, x - 6, b - 50, x - 9, b - 52, x - 9, b - 64, x - 6, b - 70, x + 6, b - 70, x + 9, b - 64, x + 9, b - 52, x + 6, b - 50, x + 6, b - 8, x + 8, b - 6, x + 8, b], 0.2, x);
      }, { body: wood, dark: P.woodDark, lit: P.woodLit, rim: 0.9, rimA: 0.85, rimDir: [-0.2, -0.98], dabs: 0.25, dab: 1.6, dabAng: Math.PI / 2, seed: 790 }, (gg) => {
        // the dial, and a glass window onto the pendulum (cut out: it swings behind)
        gg.fillStyle = css([236, 220, 180]);
        fillPoly(gg, arcPts(x, b - 59, 6.5, 6.5, 0, TAU, 24), 0.1, 1);
        gg.fillStyle = css([40, 30, 24]);
        for (let h = 0; h < 12; h++) dab(gg, x + Math.sin(h / 12 * TAU) * 5.2, b - 59 - Math.cos(h / 12 * TAU) * 5.2, 0.4, 0.4, 0);
        gg.fillRect(x - 0.4, b - 63.5, 0.8, 4.5);
        gg.fillRect(x, b - 59.4, 3.6, 0.8);
        gg.globalCompositeOperation = 'destination-out';
        fillPoly(gg, [x - 3.5, b - 14, x - 3.5, b - 42, x, b - 46, x + 3.5, b - 42, x + 3.5, b - 14], 0.1, 2);
        gg.globalCompositeOperation = 'source-atop';
      });
      blit(g, spr, 0, 0);
      g.fillStyle = css([255, 240, 220], 0.12);
      fillPoly(g, [x - 3.5, b - 14, x - 3.5, b - 42, x, b - 46, x + 3.5, b - 42, x + 3.5, b - 14], 0.1, 2);
      return;
    }
    default:
  }
}

// Per-frame mid parts: what moves behind the furniture (heads, the board, the receptionist,
// the pendulum) and what glints on it (the cooler's glug, the copier's light).
function buildPeople(k, D, P) {
  // 1988's staff: big perms, a Gekko slick, a mullet, feathered wings; shoulder pads in
  // pastel on 23, power suits with red braces and power ties on 88
  const people = new Map();
  const skins = [[226, 184, 150], [196, 146, 108], [150, 100, 70], [236, 200, 170], [120, 80, 56]];
  const hairs = [[50, 36, 28], [110, 70, 40], [214, 180, 116], [30, 28, 30], [150, 150, 150], [170, 84, 44]];
  const shirts = D.id === 'exec'
    ? [[42, 48, 74], [70, 72, 84], [36, 38, 46], [92, 78, 96]]
    : [[226, 160, 176], [120, 186, 186], [240, 196, 160], [176, 160, 210], [236, 226, 214], [90, 140, 170]];
  const rimDir = D.id === 'lobby' ? [-0.6, -0.8] : [-0.2, -0.98];
  return (seed, look) => {
    const key = seed * 2 + (look > 0 ? 1 : 0);
    let spr = people.get(key);
    if (spr) return spr;
    const R = rng(seed * 17 + 3);
    const skin = skins[(R() * skins.length) | 0];
    const hair = hairs[(R() * hairs.length) | 0];
    const shirt = shirts[(R() * shirts.length) | 0];
    const style = (R() * 4) | 0;
    const tie = R() < 0.6;
    const pads = [-9.4, 14, -9.4, 7.4, -8.4, 5.2, 8.4, 5.2, 9.4, 7.4, 9.4, 14];
    const perm = (g) => {
      // a big perm: a cloud of curls wider than the head, falling to the jaw
      for (const [dx, dy, r] of [[0, -5.2, 5.6], [-4.4, -2.4, 3.8], [4.4, -2.4, 3.8], [-4.8, 1.4, 3], [4.8, 1.4, 3], [-2.4, -7.4, 3.2], [2.6, -7.2, 3.2]]) dab(g, dx, dy, r, r * 0.92, 0);
    };
    spr = massSprite(k, [-12, -14, 24, 28], (g) => {
      fillPoly(g, pads, 0.3, seed);
      fillPoly(g, rectPts(-1.6, 2, 3.2, 4), 0, 0);
      if (style === 0) perm(g);
      if (style === 2) fillPoly(g, [-4.6, -3, -4.4, 4.6, -2, 5, 2, 5, 4.4, 4.6, 4.6, -3], 0.3, seed + 3);
      if (style === 3) { dab(g, -4.6, -1, 2.2, 3.4, -0.4); dab(g, 4.6, -1, 2.2, 3.4, 0.4); }
      fillPoly(g, arcPts(0, -2, 4.4, 5, 0, TAU, 24), 0.2, seed + 1);
    }, { body: skin, dark: shade(skin, -0.2), lit: shade(skin, 0.3), rim: 0.6, rimA: 0.7, rimDir, dabs: 0.15, dab: 1, seed: seed + 9, g0: 0.2 }, (g, RR) => {
      g.fillStyle = css(shirt);
      fillPoly(g, pads.map((v, n) => v + (n % 2 ? 0.4 : (v < 0 ? -0.2 : 0.2))), 0.3, seed);
      brokenEdge(g, -8.4, 5.6, 8.4, 5.6, 0.8, shade(shirt, 0.4), 0.8, seed + 4);
      if (D.id === 'exec') {
        // the white collar of a banker's shirt, red braces, a power tie
        g.fillStyle = css([240, 240, 244]);
        fillPoly(g, [-3, 5.2, 3, 5.2, 0, 9], 0, 0);
        g.fillStyle = css([190, 40, 46]);
        g.fillRect(-5.2, 6, 1.1, 8);
        g.fillRect(4.1, 6, 1.1, 8);
        if (tie) fillPoly(g, [-0.9, 6, 0.9, 6, 1.4, 12.6, 0, 13.6, -1.4, 12.6], 0, 0);
      } else if (tie && D.id === 'open') {
        g.fillStyle = css(shade(shirt, -0.45));
        fillPoly(g, [-0.8, 5.6, 0.8, 5.6, 1.2, 12, 0, 13, -1.2, 12], 0, 0);
      }
      g.fillStyle = css(hair);
      if (style === 0) {
        perm(g);
        g.fillStyle = css(shade(hair, 0.25), 0.6);
        for (let n = 0; n < 14; n++) dab(g, (RR() - 0.5) * 11, -8 + RR() * 9, 0.9, 0.9, 0);
      } else if (style === 1) {
        // slicked straight back, a sheen of pomade along the top
        fillPoly(g, arcPts(0, -2.6, 4.7, 4.8, Math.PI * 0.98, Math.PI * 2.02, 18), 0.2, seed + 5);
        g.fillStyle = css(shade(hair, 0.45), 0.7);
        brokenEdge(g, -3, -6.6, 2.6, -6.8, 0.6, shade(hair, 0.5), 0.8, seed + 6);
      } else if (style === 2) {
        // business up front, the rest down the back of the neck
        fillPoly(g, arcPts(0, -3, 4.6, 4, Math.PI, TAU, 16), 0.3, seed + 5);
        fillPoly(g, [-4.6, -3, -4.4, 4.6, -2.6, 4.8, -2.8, -1], 0.3, seed + 7);
        fillPoly(g, [4.6, -3, 4.4, 4.6, 2.6, 4.8, 2.8, -1], 0.3, seed + 8);
      } else {
        // feathered back into wings
        fillPoly(g, arcPts(0, -3, 4.8, 4.4, Math.PI, TAU, 16), 0.3, seed + 5);
        dab(g, -4.6, -1, 2.2, 3.4, -0.4);
        dab(g, 4.6, -1, 2.2, 3.4, 0.4);
        g.fillStyle = css(shade(hair, 0.3), 0.6);
        dab(g, -4.4, -2, 0.8, 2.2, -0.4);
      }
      g.fillStyle = css(shade(skin, -0.25));
      dab(g, -look * 3.8, -1.4, 0.9, 1.4, 0);
      g.fillStyle = css(shade(skin, -0.12));
      dab(g, look * 4.4, -0.4, 0.9, 0.7, 0);
      g.fillStyle = css([40, 30, 30]);
      dab(g, look * 2.4, -2, 0.55, 0.6, 0);
      dab(g, look * 0.2, -2, 0.5, 0.55, 0);
    });
    people.set(key, spr);
    return spr;
  };
}
function buildChair(k, P) {
  return massSprite(k, [-9, -48, 18, 30], (g) => {
    fillPoly(g, [-7, -20, -7.6, -42, -4, -47, 4, -47, 7.6, -42, 7, -20], 0.3, 1);
  }, { body: [38, 32, 42], dark: [20, 16, 24], lit: [200, 150, 186], rim: 0.9, rimA: 0.85, rimDir: [0, -1], dabs: 0.3, dab: 1.4, seed: 811 }, (g) => {
    g.fillStyle = css([28, 14, 12], 0.6);
    for (let by = -42; by < -24; by += 5) for (let bx = -5; bx <= 5; bx += 5) dab(g, bx, by, 0.5, 0.5, 0);
  });
}
function paintMidBehind(ctx, f, B, P) {
  for (const m of f.mid.items) {
    if (m.kind === 'cubicles') {
      for (const d of m.desks) {
        if (!d.occupied) continue;
        const y = m.base - 34 - 7 + d.dy - d.pop * 12;
        blit(ctx, B.person(d.seed, d.look), d.x + 20, y);
      }
    } else if (m.kind === 'boardroom') {
      for (const c of m.chairs) {
        blit(ctx, B.chair, c.x, m.base);
        if (c.sitter) {
          // dozing: the head sinks and tips forward, then jerks back up
          const sink = c.nod * 3.2;
          ctx.save();
          ctx.translate(c.x, m.base - 33 + sink);
          ctx.rotate(c.nod * 0.25 * (c.seed % 2 ? 1 : -1));
          blit(ctx, B.person(c.seed + 50, c.seed % 2 ? 1 : -1), 0, 0);
          ctx.restore();
        }
      }
    } else if (m.kind === 'reception') {
      blit(ctx, B.person(7, 1), m.x + m.w * 0.42, m.base - 40 + m.dy);
    } else if (m.kind === 'tallclock') {
      const x = m.x + 10;
      const b = m.base;
      ctx.fillStyle = css([30, 18, 12]);
      ctx.fillRect(x - 3.6, b - 46, 7.2, 33);
      ctx.save();
      ctx.translate(x, b - 44);
      ctx.rotate(m.swing * 0.22);
      ctx.fillStyle = css(P.brass);
      ctx.fillRect(-0.4, 0, 0.8, 24);
      ctx.beginPath();
      ctx.arc(0, 25, 2.6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = css(P.brassLit, 0.8);
      ctx.beginPath();
      ctx.arc(-0.7, 24.3, 0.9, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }
}
function paintMidFront(ctx, f, P) {
  for (const m of f.mid.items) {
    if (m.kind === 'cooler' && m.bubble >= 0) {
      const y = m.base - 32 - m.bubble * 10;
      const r = 0.8 + m.bubble * 1.2;
      ctx.fillStyle = css([240, 250, 255], 0.8 * (1 - m.bubble * 0.6));
      ctx.beginPath();
      ctx.arc(m.x + 7 + Math.sin(m.bubble * 9) * 0.8, y, r, 0, TAU);
      ctx.fill();
    }
    if (m.kind === 'copier' && m.scan >= 0) {
      const x = m.x + 2 + m.scan * (m.w - 6);
      glow(ctx, x, m.base - 30, 7, [170, 255, 220], 0.35);
      ctx.fillStyle = css([210, 255, 236], 0.9);
      ctx.fillRect(x - 0.6, m.base - 30.4, 1.2, 1.2);
    }
  }
}

// ================================================================== SLAB
function buildSlab(k, D, P) {
  const fl = D.id;
  return makeStrip(k, 1, P_SLAB, LANE_TOP, H, (S) => {
    const g = S.g;
    const R = rng(1500 + D.stage);
    if (fl === 'lobby') {
      // the rose granite's own edge catching the light, a brass nosing, then black granite
      vgrad(g, S.u0, LANE_TOP, S.u1 - S.u0, H - LANE_TOP, [50, 40, 52], 1, [24, 20, 28], 1);
      for (let i = 0; i < 1400; i++) {
        const u = R() * S.P;
        const y = LANE_TOP + 5 + R() * 33;
        g.fillStyle = css(R() < 0.6 ? [110, 80, 100] : [180, 140, 160], 0.25 + R() * 0.3);
        S.rep(u, 2, (uu) => dab(g, uu, y, 0.4 + R() * 0.5, 0.4, 0));
      }
      for (let u = 0; u < S.P; u += 125) S.rep(u, 2, (uu) => { g.fillStyle = css([14, 10, 16], 0.8); g.fillRect(uu - 0.5, LANE_TOP + 5, 1, H - LANE_TOP); });
      box(g, S.u0, LANE_TOP, S.u1 - S.u0, 2.6, { body: [200, 160, 162], dark: [168, 130, 134], lit: [250, 220, 220], dabs: 0, wob: 0 });
      box(g, S.u0, LANE_TOP + 2.6, S.u1 - S.u0, 2.4, { body: P.bronze, dark: P.bronzeDark, lit: P.bronzeLit, dabs: 0, wob: 0, rimA: 0.7 });
    } else if (fl === 'open') {
      vgrad(g, S.u0, LANE_TOP, S.u1 - S.u0, H - LANE_TOP, [80, 88, 98], 1, [52, 58, 66], 1);
      for (let i = 0; i < 900; i++) {
        const u = R() * S.P;
        const y = LANE_TOP + 4 + R() * 34;
        g.fillStyle = css(R() < 0.5 ? [100, 108, 118] : [56, 62, 70], 0.2 + R() * 0.2);
        S.rep(u, 4, (uu) => dab(g, uu, y, 1 + R() * 2.4, 0.5 + R() * 0.8, (R() - 0.5) * 0.4));
      }
      // the raised floor's panels and pedestals in the cut face
      for (let u = 0; u < S.P; u += 50) S.rep(u, 4, (uu) => { g.fillStyle = css([40, 46, 54], 0.7); g.fillRect(uu - 0.5, LANE_TOP + 4, 1, 9); });
      g.fillStyle = css([40, 46, 54], 0.6);
      g.fillRect(S.u0, LANE_TOP + 13, S.u1 - S.u0, 1);
      box(g, S.u0, LANE_TOP, S.u1 - S.u0, 4, { body: [70, 120, 126], dark: [52, 96, 104], lit: [170, 220, 220], dabs: 0, wob: 0, rimA: 0.8 });
    } else {
      vgrad(g, S.u0, LANE_TOP, S.u1 - S.u0, H - LANE_TOP, [74, 44, 30], 1, [36, 22, 16], 1);
      for (let i = 0; i < 700; i++) {
        const u = R() * S.P;
        const y = LANE_TOP + 5 + R() * 34;
        const len = 4 + R() * 16;
        g.fillStyle = css(R() < 0.5 ? [100, 62, 40] : [40, 24, 16], 0.2 + R() * 0.25);
        S.rep(u, len, (uu) => dab(g, uu, y, len, 0.3 + R() * 0.5, 0));
      }
      box(g, S.u0, LANE_TOP, S.u1 - S.u0, 3.2, { body: [150, 98, 58], dark: [110, 70, 40], lit: [236, 180, 110], dabs: 0, wob: 0, rimA: 0.9 });
      box(g, S.u0, LANE_TOP + 3.2, S.u1 - S.u0, 1.4, { body: P.brass, dark: P.brassDark, lit: P.brassLit, dabs: 0, wob: 0, rimA: 0.8 });
    }
    // shade toward the bottom of the frame
    vgrad(g, S.u0, LANE_TOP + 8, S.u1 - S.u0, H - LANE_TOP - 8, [0, 0, 0], 0, [0, 0, 0], 0.25);
  });
}

// ================================================================== FRONT
function buildFront(k, D, P) {
  const fl = D.id;
  const dark = fl === 'exec' ? [16, 26, 28] : fl === 'open' ? [40, 50, 58] : [30, 40, 38];
  const lit = fl === 'exec' ? [200, 120, 70] : fl === 'open' ? [190, 200, 196] : [190, 200, 176];
  const pillar = (w) => {
    // close to the lens and out of focus: a dark body that melts at both edges, a soft
    // ribbon of reflected light down the side nearest the light, no texture to speak of
    const r = Math.max(0.5, k * 0.3);
    const f = w * 0.3;
    const c = canvas((w + 2 * f) * r, H * r);
    const g = c.getContext('2d');
    g.setTransform(r, 0, 0, r, f * r, 0);
    const hg = g.createLinearGradient(-f, 0, w + f, 0);
    const deep = shade(dark, -0.45);
    hg.addColorStop(0, css(deep, 0));
    hg.addColorStop(0.22, css(deep, 0.8));
    hg.addColorStop(0.5, css(deep, 0.95));
    hg.addColorStop(0.78, css(deep, 0.8));
    hg.addColorStop(1, css(deep, 0));
    g.fillStyle = hg;
    g.fillRect(-f, 0, w + 2 * f, H);
    const side = fl === 'exec' ? 0.68 : 0.3;
    const rg = g.createLinearGradient(-f, 0, w + f, 0);
    rg.addColorStop(Math.max(0, side - 0.12), css(lit, 0));
    rg.addColorStop(side, css(lit, 0.16));
    rg.addColorStop(Math.min(1, side + 0.12), css(lit, 0));
    g.fillStyle = rg;
    g.fillRect(-f, 0, w + 2 * f, H);
    const vg = g.createLinearGradient(0, 0, 0, H);
    vg.addColorStop(0, css(deep, 0.25));
    vg.addColorStop(0.6, css(deep, 0));
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = vg;
    g.fillRect(-f, 0, w + 2 * f, H);
    return { c, x: -f, y: 0, w: w + 2 * f, h: H };
  };
  const plant = massSprite(k * 0.6, [-60, -50, 120, 54], (g) => {
    const R = rng(902);
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.3 + (R() - 0.5) * 0.2;
      const L = 30 + R() * 16;
      const ex = Math.cos(a) * L * 1.2;
      const ey = Math.sin(a) * L * 0.9 + 4;
      limb(g, [[0, 4], [ex * 0.5, ey * 0.6 - 6], [ex, ey]], 5, 0.6, i);
      for (let s = 0.3; s < 1; s += 0.14) {
        const px = ex * s;
        const py = ey * s - Math.sin(s * Math.PI) * 6;
        limb(g, [[px, py], [px + Math.cos(a + 1.3) * 9, py + 6]], 2.4, 0.5, i * 10 + s * 7);
        limb(g, [[px, py], [px + Math.cos(a - 1.3) * 9, py + 6]], 2.4, 0.5, i * 10 + s * 7 + 1);
      }
    }
  }, { body: shade(dark, 0.05), dark, lit, rim: 1, rimA: 0.35, rimDir: [-0.4, -0.9], dabs: 0.1, dab: 2, seed: 903 });
  const chair = massSprite(k * 0.6, [-34, -36, 68, 40], (g) => {
    if (fl === 'exec') {
      fillPoly(g, [-30, 4, -30, -18, -24, -26, -14, -30, 14, -30, 24, -26, 30, -18, 30, 4], 0.4, 1);
      fillPoly(g, arcPts(-28, -20, 7, 8, 0, TAU, 20), 0.4, 2);
      fillPoly(g, arcPts(28, -20, 7, 8, 0, TAU, 20), 0.4, 3);
    } else {
      fillPoly(g, [-15, 4, -17, -16, -16, -26, -10, -31, 10, -31, 16, -26, 17, -16, 15, 4], 0.4, 1);
      fillPoly(g, [-8, -30, -9, -36, 9, -36, 8, -30], 0.3, 2);
      g.fillRect(-2, -32, 4, 3);
    }
  }, { body: shade(dark, 0.05), dark, lit, rim: 1.2, rimA: 0.4, rimDir: [-0.3, -0.95], dabs: 0.15, dab: 2, seed: 904 });
  return { pillar, plant, chair };
}

// ================================================================== BAKE + PAINT
const CACHE = new Map();
function bakeFor(floor, k) {
  const key = `${floor}@${k}`;
  let B = CACHE.get(key);
  if (B) return B;
  const D = OFFICE_FLOORS[floor];
  const P = PAL[floor];
  B = {};
  B.sky = buildSky(k, D, P);
  B.out = buildOutside(k, D, P);
  if (floor === 'lobby') B.cars = buildCars(k);
  if (floor === 'open') { B.blimp = buildBlimp(k); B.cradle = buildCradle(k, P); }
  if (floor === 'exec') B.heli = buildHeli(k);
  B.wall = buildWall(k, D, P, B);
  const lift = buildLiftParts(k, D, P);
  B.liftLeaf = { [floor]: lift.leaf };
  B.liftCar = { [floor]: lift.car };
  B.light = buildLightParts(k, D, P);
  B.neon = buildNeon(k, D);
  B.floor = buildFloor(k, floor === 'lobby' ? marbleMat(D, P) : floor === 'open' ? carpetMat(D, P) : parquetMat(D, P));
  B.person = buildPeople(k, D, P);
  B.chair = buildChair(k, P);
  B.mid = buildMid(k, D, P, B);
  B.slab = buildSlab(k, D, P);
  B.front = buildFront(k, D, P);
  B.paper = buildPaper(k);
  B.finish = buildFinish(k, B.paper, P.shadowTint, floor === 'exec' ? 0.34 : 0.22);
  B.frontPillars = new Map();
  CACHE.set(key, B);
  return B;
}
function scaleOf(ctx) {
  const m = ctx.getTransform ? ctx.getTransform() : null;
  const k = m ? Math.hypot(m.a, m.b) : 1;
  return Math.min(3, Math.max(1, Math.ceil(k * 2 - 0.01) / 2));
}

// The ribbon windows' light: clear below the blinds, striped through the slats above.
// Through vertical blinds: clear past their edge, a stripe between each pair of slats.
function blindCols(b, xa, xb) {
  const edge = b.x0 + (b.x1 - b.x0) * b.blinds;
  const out = [];
  if (xb > edge) out.push([Math.max(xa, edge), xb]);
  for (let x = b.x0 + 3.1; x < Math.min(xb, edge); x += 4) {
    const a = Math.max(xa, x);
    const c = Math.min(xb, x + 0.9);
    if (c > a) out.push([a, c]);
  }
  return out;
}
function blindRows(b) {
  const top = 146;
  const clear = 54 + 92 * (1 - b.blinds);
  const rows = [[54, clear]];
  for (let h = clear; h < top - 1.4; h += 3) rows.push([h + 0.3, h + 1.7]);
  return rows;
}
const SUN = {
  lobby: { tanE: 0.5, tanA: 0.08, col: [255, 226, 170], a0: 0.66, a1: 0.56, mw: 1.6, beam: 0.05, rows: () => [[0, 108 - 2], [108 + 2, 182]] },
  open: { tanE: 0.32, tanA: -0.06, col: [255, 214, 170], a0: 0.3, a1: 0.24, mw: 1.4, beam: 0.025, rows: () => [[54, 146]], cols: blindCols },
  exec: { tanE: 0.09, tanA: -0.12, col: [255, 150, 80], a0: 0.26, a1: 0.16, mw: 1.2, beam: 0.03, rows: () => [[4, 174]] },
};

export const STYLE = {
  id: 'gouache88',
  name: 'GOUACHE ’88 — Nakatomi at dusk',
  note: 'The gouache card\'s hand kept exactly — opaque painted masses, rim light, dry-brush, paper tooth and '
    + 'the same light design — with the set re-dressed as a 1988 tower out of Die Hard and Wall Street. Rose granite '
    + 'and polished brass under smoked glass, a pink neon EGGCORP over a koi pond, Memphis sofas and palms on the '
    + 'street; mauve and teal with glass-block piers, vertical blinds and green-screen terminals on 23; rosewood and '
    + 'black lacquer on 88 under an airbrushed peach-teal-violet sunset, the neon coming on across the city and the '
    + 'professor\'s power portrait in smoked glass. Tacky in the props, never in the painting.',
  paint(ctx, f) {
    const k = scaleOf(ctx);
    const B = bakeFor(f.floor, k);
    const P = PAL[f.floor];
    // 1. outside, seen only through the glass
    paintOutside(ctx, f, B, P);
    // 2. the wall, with the glass cut out of it, and what moves on it
    drawStrip(ctx, B.wall, f.wall.shift);
    if (f.floor === 'exec') glassReflections(ctx, f, P);
    for (const b of f.wall.bays) {
      if (b.revolvingDoor == null) continue;
      revolvingDoor(ctx, f, b.revolvingDoor, P);
    }
    for (const h of f.wall.hangs) {
      if (h.kind === 'logo' && B.neon) blit(ctx, B.neon, h.x, h.y, neonHum(f.t));
      if (h.kind === 'lift') liftDoors(ctx, h, { id: f.floor }, P, B);
      else if (h.kind === 'clock') clockHands(ctx, h, f.clock);
      else if (h.kind === 'door' && h.label === 'MEETING 4B') {
        glow(ctx, h.x + h.w / 2, h.y - 8, 8, [255, 70, 50], 0.35);
        ctx.fillStyle = css([240, 70, 56], 0.75);
        ctx.fillRect(h.x + h.w / 2 - 6, h.y - 10.4, 12, 3.6);
        text(ctx, 'IN USE', h.x + h.w / 2, h.y - 7.4, 3.4, [255, 236, 220], { weight: 'bold' });
      }
    }
    if (f.floor === 'open') ceilingJoints(ctx, f, P);
    // 3. the lights
    paintLights(ctx, f, B, P);
    // 4. the floor plane, the sun on it, its reflections
    drawFloor(ctx, B.floor, f.floorPlane.shiftBottom);
    if (f.floor === 'lobby') floorReflections(ctx, f, P);
    sunOnFloor(ctx, f, SUN[f.floor]);
    // 5. the furniture, and what moves behind it and on it
    paintMidBehind(ctx, f, B, P);
    drawStrip(ctx, B.mid, f.mid.shift);
    paintMidFront(ctx, f, P);
    sunShafts(ctx, f, SUN[f.floor]);
    // 6. the slab under the lane
    drawStrip(ctx, B.slab, f.slab.shift);
    // 7. paper tooth and the vignette over the whole painting
    ctx.drawImage(B.finish, 0, 0, W, H);
  },
  paintFront(ctx, f) {
    const k = scaleOf(ctx);
    const B = bakeFor(f.floor, k);
    for (const it of f.front) {
      if (it.kind === 'pillar') {
        let spr = B.frontPillars.get(it.w);
        if (!spr) { spr = B.front.pillar(it.w); B.frontPillars.set(it.w, spr); }
        blit(ctx, spr, it.x, 0, 0.66);
      } else if (it.kind === 'plant') {
        blit(ctx, B.front.plant, it.x, H + 6, 0.82);
      } else {
        blit(ctx, B.front.chair, it.x, H + 4, 0.82);
      }
    }
  },
};

function revolvingDoor(ctx, f, x, P) {
  const top = f.glass.transom + 7;
  const bot = f.glass.bottom - 1;
  const r = 21;
  // four wings round a post: those swinging toward us are drawn last, brighter
  const wings = [];
  for (let i = 0; i < 4; i++) {
    const a = (f.revolving + i / 4) * TAU;
    wings.push({ x: Math.cos(a) * r, z: Math.sin(a) });
  }
  wings.sort((p, q) => p.z - q.z);
  for (const wg of wings) {
    const x0 = Math.min(x, x + wg.x);
    const ww = Math.abs(wg.x);
    ctx.fillStyle = css([220, 232, 236], 0.1 + 0.08 * (wg.z + 1));
    ctx.fillRect(x0, top, ww, bot - top);
    ctx.fillStyle = css(wg.z > 0 ? P.bronzeLit : P.bronzeDark, 0.85);
    ctx.fillRect(x + wg.x - 0.8, top, 1.6, bot - top);
    ctx.fillStyle = css(P.bronze, 0.8);
    ctx.fillRect(x0, top + (bot - top) * 0.55, ww, 1.2);
  }
  ctx.fillStyle = css(P.bronzeDark);
  ctx.fillRect(x - 1, top, 2, bot - top);
}

function ceilingJoints(ctx, f, P) {
  // the acoustic tile grid's cross joints, converging as the floor's do
  const cy = f.ceilingY - 2;
  const top = 22;
  const C = f.floorPlane.shiftBottom;
  const k1 = 0.24 * (HORIZON - top) / (HORIZON - cy);
  const s = f.wall.shift;
  ctx.strokeStyle = css(shade(P.ceil, -0.2), 0.45);
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let U = Math.floor((s - 80) / 60) * 60; U < s + W + 80; U += 60) {
    const xb = U - s;
    const u = (xb - 0.76 * VP) / 0.24 + C;
    const xt = k1 * (u - C) + (1 - k1) * VP;
    ctx.moveTo(xb, cy);
    ctx.lineTo(xt, top);
  }
  ctx.stroke();
}
