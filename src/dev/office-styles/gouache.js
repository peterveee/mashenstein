// CORPORATE KOMBAT style bake-off — GOUACHE, OFFICE AT NIGHT. Edward Hopper's "Office at
// Night" and "Nighthawks" crossed with 1950s Golden Books / Disney background painting:
// opaque painted masses with slightly hand-cut edges and no outlines, dry-brush, a broken
// rim of lighter paint on every edge that faces the light, paper tooth over everything,
// and aerial perspective outside (the far city paler, bluer, softer). It is the crypt
// gouache hand (src/dev/crypt-styles/gouache.js, shipped as stylePacks/cryptGouache.js)
// turned on a new subject: LIGHT in an interior.
//   lobby — cool morning light raking in through the glass front: the city across the
//           street backlit, window-shaped sun patches lying across the polished marble,
//           the columns reflected in it, warm scallops of downlight on the travertine.
//   open  — a flat fluorescent wash and noon daylight through ribbon windows; the blinds
//           glow and throw striped light; sage plaster, olive cabinets, a slate carpet.
//   exec  — dusk: a burning orange-to-violet sky, the city lights coming on far below,
//           brass lamps making warm pools against deep teal-green shadow.
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
    sky: [[22, [128, 168, 206]], [70, [166, 196, 218]], [130, [212, 220, 222]], [186, [248, 238, 214]], [204, [246, 232, 204]]],
    sunCol: [255, 244, 214],
    far: { body: [190, 204, 218], dark: [200, 210, 220], lit: [244, 240, 228], haze: [236, 234, 226] },
    faces: [[138, 120, 120], [128, 142, 164], [178, 166, 146]],
    faceLit: [255, 230, 182],
    faceHaze: [224, 226, 226],
    win: [92, 104, 124], winSky: [200, 214, 226],
    cloud: { body: [240, 240, 236], dark: [190, 202, 216], lit: [255, 252, 240] },
    wall: [154, 134, 110], wallTop: [112, 100, 86], wallLit: [240, 222, 188], joint: [122, 104, 84],
    ceil: [92, 84, 76],
    bronze: [104, 78, 52], bronzeLit: [214, 172, 112], bronzeDark: [58, 42, 30],
    column: [52, 68, 62], columnLit: [168, 188, 168], columnDark: [34, 44, 40],
    glass: [214, 228, 236],
    ambient: [206, 194, 176],
    shadowTint: [70, 80, 96],
  },
  open: {
    light: [-0.3, -0.95],
    sky: [[58, [96, 146, 202]], [100, [140, 178, 214]], [150, [206, 220, 228]], [172, [214, 222, 224]]],
    far: { body: [168, 186, 210], dark: [178, 194, 214], lit: [222, 230, 238], haze: [206, 216, 228] },
    faces: [[168, 100, 80], [190, 166, 122], [150, 146, 140]],
    faceLit: [250, 238, 210],
    faceHaze: [196, 210, 222],
    win: [84, 96, 112], winSky: [190, 210, 226],
    cloud: { body: [246, 246, 244], dark: [190, 202, 218], lit: [255, 255, 252] },
    wall: [180, 186, 150], wallTop: [158, 164, 132], wallLit: [232, 232, 196], joint: [146, 152, 120],
    wallLow: [84, 112, 94],
    ceil: [164, 164, 152],
    trim: [214, 208, 190], trimLit: [240, 236, 222],
    column: [212, 204, 184], columnLit: [238, 234, 220], columnDark: [168, 160, 142],
    skirting: [70, 86, 78],
    glass: [220, 232, 240],
    ambient: [190, 196, 186],
    shadowTint: [70, 86, 100],
  },
  exec: {
    light: [0.1, -1],
    sky: [[30, [36, 32, 80]], [70, [74, 50, 110]], [104, [138, 68, 112]], [134, [206, 94, 86]], [158, [240, 140, 80]], [178, [252, 196, 120]], [190, [176, 112, 116]], [210, [96, 66, 104]]],
    sunCol: [255, 210, 130],
    far: { body: [88, 66, 108], dark: [70, 52, 92], lit: [200, 120, 110], haze: [150, 96, 116] },
    faces: [[48, 42, 76], [56, 46, 80], [42, 40, 70]],
    faceLit: [255, 150, 90],
    faceHaze: [120, 80, 110],
    win: [26, 24, 46], winLit: [255, 190, 104],
    cloud: { body: [118, 70, 116], dark: [80, 52, 98], lit: [255, 160, 96] },
    wood: [96, 58, 38], woodDark: [58, 34, 24], woodLit: [176, 112, 64],
    teal: [40, 72, 70], tealDark: [24, 46, 46], tealLit: [92, 132, 120],
    brass: [176, 136, 70], brassLit: [250, 212, 140], brassDark: [96, 70, 36],
    ceil: [26, 40, 42],
    glass: [120, 100, 140],
    warm: [255, 190, 110],
    ambient: [64, 70, 66],
    shadowTint: [20, 40, 44],
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
    box(g, x - 1.5, top - 1, w + 3, 3, { body: shade(body, 0.08), lit: o.lit2, dabs: 0, rimA: 0.9 });
  }
  if (b.roof === 'tank' && !o.far) waterTower(g, x + w * 0.28 + (b.i % 3) * 6, top, o);
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
  box(g, x, top - 19, w, 13, { body: [232, 196, 96], dark: [210, 170, 80], lit: [255, 236, 170], dabs: 0.1, seed: i });
  g.fillStyle = css([170, 60, 50]);
  dab(g, x + 8, top - 12.5, 3.4, 4.2, 0);
  g.fillStyle = css([250, 246, 230]);
  dab(g, x + 8, top - 12.8, 2.2, 2.9, 0);
  text(g, 'COFFEE', x + w / 2 + 4, top - 9.2, 6.5, [80, 40, 34], { weight: 'bold' });
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
  const R = rng(seed + 31);
  g.fillStyle = css([74, 60, 48]);
  limb(g, [[x, y + 1], [x + 0.4, y - 10 * s], [x - 0.5, y - 20 * s]], 2.6 * s, 1.2 * s, seed);
  const cx = x;
  const cy = y - 27 * s;
  const greens = [[70, 98, 74], [58, 84, 66], [88, 116, 80]];
  for (let i = 0; i < 46; i++) {
    const a = R() * TAU;
    const rr = Math.sqrt(R()) * 12 * s;
    const px = cx + Math.cos(a) * rr * 1.05;
    const py = cy + Math.sin(a) * rr * 0.9;
    const litK = clamp01((-(px - cx) * 0.6 - (py - cy) * 0.8) / (12 * s) + 0.2);
    g.fillStyle = css(mix(greens[(R() * 3) | 0], [190, 196, 128], litK * 0.55));
    dab(g, px, py, 2.4 * s + R() * 2 * s, 1.6 * s + R() * 1.2 * s, R() * TAU);
  }
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
    const L = { cab: [30, 12, [236, 190, 52]], car: [28, 11, [70, 104, 150]], bus: [64, 22, [178, 64, 52]] }[kind];
    const [w, h, col] = L;
    return massSprite(k, [-2, -h - 3, w + 4, h + 5], (g) => {
      if (kind === 'bus') {
        fillPoly(g, [0, -3, 0, -h + 2, 2, -h, w - 2, -h, w, -h + 3, w, -3], 0.2, 1);
      } else {
        fillPoly(g, [0, -3, 0, -h * 0.55, w * 0.22, -h * 0.6, w * 0.32, -h, w * 0.72, -h, w * 0.84, -h * 0.58, w, -h * 0.5, w, -3], 0.2, 1);
      }
      for (const wx of kind === 'bus' ? [9, w - 10] : [6, w - 6]) dab(g, wx, -2.5, 2.6, 2.6, 0);
    }, { body: col, dark: shade(col, -0.25), lit: shade(col, 0.45), rim: 0.8, rimA: 0.9, rimDir: [-0.6, -0.8], dabs: 0.2, dab: 1.4, seed: w }, (g) => {
      g.fillStyle = css([150, 176, 200], 0.9);
      if (kind === 'bus') {
        for (let wx = 4; wx < w - 6; wx += 8) g.fillRect(wx, -h + 4, 6, 6);
        g.fillStyle = css([240, 230, 200]);
        g.fillRect(w - 6, -h + 3, 4, 3);
      } else {
        fillPoly(g, [w * 0.3, -h * 0.62, w * 0.36, -h * 0.92, w * 0.5, -h * 0.92, w * 0.5, -h * 0.62], 0, 0);
        fillPoly(g, [w * 0.54, -h * 0.62, w * 0.54, -h * 0.92, w * 0.7, -h * 0.92, w * 0.8, -h * 0.62], 0, 0);
        if (kind === 'cab') { g.fillStyle = css([40, 36, 30]); g.fillRect(w * 0.42, -h - 1.6, 5, 1.8); g.fillRect(2, -h * 0.4, w - 4, 1); }
      }
      g.fillStyle = css([28, 26, 30]);
      for (const wx of kind === 'bus' ? [9, w - 10] : [6, w - 6]) dab(g, wx, -2.5, 2.6, 2.6, 0);
      g.fillStyle = css([150, 146, 140]);
      for (const wx of kind === 'bus' ? [9, w - 10] : [6, w - 6]) dab(g, wx, -2.5, 1, 1, 0);
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
    ctx.fillStyle = l.s > 1 ? '#ffe2a8' : '#ffc77a';
    ctx.fillRect(l.x, l.y, l.s * 0.9, l.s * 0.7);
  }
  ctx.globalAlpha = 1;
  if (exec) for (const c of O.clouds) blit(ctx, B.out.clouds[c.i], c.x, c.y - c.h * 0.55);
  const nearShift = C * (f.floor === 'lobby' ? 0.1 : 0.04);
  drawStrip(ctx, B.out.near, nearShift);
  if (O.flyer && O.flyer.kind === 'blimp') blit(ctx, O.flyer.dir < 0 ? B.blimp.left : B.blimp.right, O.flyer.x, O.flyer.y);
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
      ctx.fillStyle = css([30, 50, 40], 0.55);
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
  // travertine's horizontal bedding: short streaks, lighter and darker
  for (let i = 0; i < 1500; i++) {
    const u = R() * S.P;
    const y = cy + R() * (WALL_BASE - cy);
    const len = 3 + R() * 11;
    g.fillStyle = css(R() < 0.55 ? shade(P.wall, -0.07) : shade(P.wall, 0.08), 0.18 + R() * 0.25);
    const th = 0.3 + R() * 0.6;
    S.rep(u, len, (uu) => dab(g, uu, y, len, th, (R() - 0.5) * 0.05));
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
      box(g, x0, gb + 4, w, WALL_BASE - gb - 4, { body: [176, 180, 170], dark: [150, 154, 146], lit: [226, 228, 214], dabs: 0.03, seed: x0 });
      g.fillStyle = css([118, 124, 120], 0.6);
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
    box(g, x, cy, w, WALL_BASE - cy, { body: P.column, top: shade(P.column, -0.04), dark: shade(P.column, -0.1), lit: P.columnLit, rimLeft: true, rimTop: false, edge: P.columnDark, edgeRight: true, edgeBottom: false, dabs: 0.05, dab: 3, seed: c.u });
    // its shadowed side, away from the windows
    hgrad(g, x + w * 0.55, cy, w * 0.45, WALL_BASE - cy, P.columnDark, 0, P.columnDark, 0.45);
    box(g, x - 1, WALL_BASE - 5, w + 2, 5, { body: P.skirting, dark: shade(P.skirting, -0.2), lit: shade(P.skirting, 0.35), dabs: 0, wob: 0 });
  } else {
    // a walnut pilaster with a brass capital
    box(g, x, cy, w, WALL_BASE - cy, { body: P.wood, top: shade(P.wood, -0.25), dark: P.woodDark, lit: P.woodLit, rimLeft: true, rimTop: false, edge: shade(P.woodDark, -0.3), edgeRight: true, edgeBottom: false, dabs: 0.08, dab: 3, dabAng: Math.PI / 2, seed: c.u });
    for (let f = 3; f < w - 2; f += 4) {
      g.fillStyle = css(P.woodDark, 0.5);
      g.fillRect(x + f, cy + 12, 1.2, WALL_BASE - cy - 26);
      g.fillStyle = css(P.woodLit, 0.25);
      g.fillRect(x + f + 1.2, cy + 12, 0.5, WALL_BASE - cy - 26);
    }
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
  g.fillStyle = css(P.glass, fl === 'exec' ? 0.1 : 0.08);
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
  const mullion = fl === 'lobby'
    ? { body: P.bronzeDark, lit: P.bronzeLit, w: 2.6 }
    : fl === 'open' ? { body: [150, 156, 160], lit: [240, 242, 236], w: 2.2 }
      : { body: [34, 30, 34], lit: [255, 170, 110], w: 1.8 };
  const rev = b.revolvingDoor != null ? x0 + (b.revolvingDoor - b.u) : null;
  // blinds (open plan): lowered from the head, backlit slats
  if (b.blinds > 0) {
    const bh = (G.bottom - G.top) * b.blinds;
    for (let y = G.top; y < G.top + bh; y += 3) {
      box(g, x0, y, w, 2.2, { body: [236, 230, 210], dark: [214, 206, 184], lit: [255, 252, 236], dabs: 0, wob: 0.1, rimA: 0.5, seed: y * 7 + x0 });
    }
    box(g, x0, G.top + bh - 1, w, 3, { body: [196, 188, 166], dark: [170, 162, 140], dabs: 0, wob: 0 });
    g.fillStyle = css([150, 146, 132], 0.8);
    for (let cx = x0 + 18; cx < x1 - 10; cx += 52) g.fillRect(cx, G.top, 0.6, bh + 10);
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
  text(g, h.label, ix - 2, iy + 3.6, 6, [255, 170, 70], { weight: 'bold' });
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
    body: shade(M.body, 0.1), dark: M.dark, lit: M.lit, rim: 0.6, rimA: 0.6, rimDir: [-0.5, -0.86], dabs: 0.4, dab: 2.2, dabAng: Math.PI / 2, seed: 404,
  }, (g, R) => {
    // brushed: long vertical streaks
    for (let i = 0; i < 40; i++) {
      g.fillStyle = css(R() < 0.5 ? M.lit : M.dark, 0.08 + R() * 0.1);
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

function logo(g, h, P, k) {
  // brass letters pinned to the travertine, a brass egg above, each with its shadow
  const cx = h.x + h.w / 2;
  // spot wash from two downlights above the sign
  for (const dx of [-38, 38]) {
    const gr = g.createRadialGradient(cx + dx, h.y - 20, 2, cx + dx, h.y + 16, 66);
    gr.addColorStop(0, css([255, 236, 196], 0.45));
    gr.addColorStop(1, css([255, 236, 196], 0));
    g.fillStyle = gr;
    g.fillRect(cx + dx - 70, h.y - 30, 140, 110);
  }
  const brass = { body: [196, 150, 72], dark: [132, 92, 40], lit: [255, 232, 160] };
  const egg = (gg, ox, oy) => fillPoly(gg, eggPts(cx + ox, h.y + 13 + oy, 9, 11), 0.2, 7);
  const word = (gg, ox, oy, col) => text(gg, 'EGGCORP', cx + ox, h.y + h.h - 6 + oy, 21, col, { weight: 'bold', track: 3.2 });
  // shadows on the stone, down and right of the light
  g.fillStyle = css([110, 92, 72], 0.35);
  egg(g, 1.6, 2.2);
  word(g, 1.6, 2.2, css([110, 92, 72], 0.35));
  const spr = massSprite(k, [h.x - 4, h.y - 4, h.w + 8, h.h + 8], (gg) => { egg(gg, 0, 0); word(gg, 0, 0, '#000'); }, {
    body: brass.body, dark: brass.dark, lit: brass.lit, rim: 0.8, rimA: 0.95, rimDir: [-0.4, -0.92], dabs: 0.3, dab: 1.4, seed: 909, g0: 0.2,
  }, (gg) => {
    // the crack across the egg: the company's mark
    gg.strokeStyle = css(brass.dark, 0.9);
    gg.lineWidth = 0.9;
    gg.beginPath();
    const ey = h.y + 12;
    gg.moveTo(cx - 9, ey);
    for (let i = 1; i <= 6; i++) gg.lineTo(cx - 9 + i * 3, ey + (i % 2 ? -2.2 : 1.6));
    gg.stroke();
    gg.fillStyle = css([255, 248, 220], 0.7);
    dab(gg, cx - 3.6, h.y + 7, 1.6, 2.6, -0.4);
  });
  blit(g, spr, 0, 0);
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
  const gilt = { body: [176, 136, 66], dark: [110, 80, 36], lit: [250, 220, 150] };
  frameBox(g, h.x, h.y, h.w, h.h, 3.5, gilt, h.x);
  const ix = h.x + 3.5;
  const iy = h.y + 3.5;
  const iw = h.w - 7;
  const ih = h.h - 7;
  g.save();
  g.beginPath();
  g.rect(ix, iy, iw, ih);
  g.clip();
  if (h.variant === 1) {
    // a city view: a sunlit street corner in the morning, Hopper's own subject
    vgrad(g, ix, iy, iw, ih * 0.5, [150, 180, 206], 1, [220, 214, 196], 1);
    box(g, ix - 1, iy + ih * 0.22, iw * 0.55, ih * 0.8, { body: [176, 92, 70], dark: [140, 70, 56], lit: [250, 210, 160], rimLeft: true, dabs: 0.2, seed: 61 });
    box(g, ix + iw * 0.55, iy + ih * 0.38, iw * 0.5, ih * 0.7, { body: [120, 110, 112], dark: [90, 84, 90], lit: [220, 200, 170], dabs: 0.2, seed: 62 });
    g.fillStyle = css([40, 50, 60], 0.8);
    for (let wy = iy + ih * 0.3; wy < iy + ih * 0.78; wy += 5) for (let wx = ix + 2; wx < ix + iw * 0.5; wx += 5) g.fillRect(wx, wy, 2.4, 2.8);
    box(g, ix - 1, iy + ih * 0.82, iw + 2, ih * 0.2, { body: [190, 176, 150], dark: [150, 140, 120], dabs: 0.2, seed: 63 });
    g.fillStyle = css([70, 64, 72], 0.4);
    fillPoly(g, [ix, iy + ih * 0.82, ix + iw * 0.7, iy + ih * 0.82, ix + iw, iy + ih, ix, iy + ih], 0, 0);
  } else {
    // a colour-field abstract: three soft-edged blocks of red and orange on plum
    g.fillStyle = css([92, 36, 44]);
    g.fillRect(ix, iy, iw, ih);
    const blocks = [[0.08, 0.1, 0.84, 0.36, [206, 86, 48]], [0.08, 0.52, 0.84, 0.16, [236, 156, 70]], [0.08, 0.72, 0.84, 0.2, [150, 50, 52]]];
    for (const [bx, by, bw, bh, col] of blocks) {
      g.fillStyle = css(col, 0.92);
      fillPoly(g, rectPts(ix + bx * iw, iy + by * ih, bw * iw, bh * ih), 0.8, bx * 100 + by * 10);
    }
  }
  g.restore();
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
    // two rowers... no: a mountain at sunrise, the corporate classic
    vgrad(g, ix, iy, iw, ih, [230, 140, 90], 1, [120, 70, 110], 1);
    g.fillStyle = css([40, 34, 60]);
    fillPoly(g, [ix, iy + ih, ix + iw * 0.4, iy + ih * 0.3, ix + iw * 0.6, iy + ih * 0.55, ix + iw * 0.75, iy + ih * 0.42, ix + iw, iy + ih], 0.3, 1);
    g.fillStyle = css([240, 236, 226]);
    fillPoly(g, [ix + iw * 0.33, iy + ih * 0.42, ix + iw * 0.4, iy + ih * 0.3, ix + iw * 0.47, iy + ih * 0.42], 0.2, 2);
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
  // Don K. Eggshell PhD, the founder, in oils: the silver professor in his caped collar,
  // on a varnished old-master ground. Gilt frame, picture light, brass plate.
  const gilt = { body: [190, 146, 66], dark: [118, 84, 34], lit: [255, 226, 150] };
  // `simple`: the office poster, just the canvas inside the poster's own plain frame.
  const fw = h.simple ? 0 : 5;
  if (!h.simple) frameBox(g, h.x, h.y, h.w, h.h, fw, gilt, h.x);
  const R = rng(17);
  for (let i = 0; !h.simple && i < 48; i++) {
    const t = R();
    const side = (R() * 4) | 0;
    const x = side < 2 ? h.x + t * h.w : (side === 2 ? h.x + 2.4 : h.x + h.w - 2.4);
    const y = side >= 2 ? h.y + t * h.h : (side === 0 ? h.y + 2.4 : h.y + h.h - 2.4);
    g.fillStyle = css(R() < 0.5 ? gilt.lit : gilt.dark, 0.55);
    dab(g, x, y, 0.8, 0.8, 0);
  }
  const ix = h.x + fw;
  const iy = h.y + fw;
  const iw = h.w - fw * 2;
  const ih = h.h - fw * 2;
  const cx = ix + iw / 2;
  const spr = massSprite(k * 2, [ix, iy, iw, ih], (gg) => gg.fillRect(ix, iy, iw, ih), {
    body: [62, 56, 40], dark: [30, 28, 22], lit: [120, 100, 64], dabs: h.simple ? 0.15 : 0.7, dab: 2, seed: 313, g0: 0,
  }, (gg, RR) => {
    // a varnished old-master ground, warm behind his head
    const gl = gg.createRadialGradient(cx - 3, iy + ih * 0.32, 2, cx, iy + ih * 0.4, iw * 0.8);
    gl.addColorStop(0, css([168, 128, 66], 0.85));
    gl.addColorStop(1, css([40, 34, 24], 0));
    gg.fillStyle = gl;
    gg.fillRect(ix, iy, iw, ih);
    professorBust(gg, professorMap(ix, iy, iw, ih), RR, [255, 240, 210]);
    // the old varnish: everything a shade warmer and a touch darker at the edges
    gg.fillStyle = css([120, 80, 30], 0.1);
    gg.fillRect(ix, iy, iw, ih);
  });
  blit(g, spr, 0, 0);
  // varnish: a warm sheen where the picture light falls
  vgrad(g, ix, iy, iw, ih * 0.5, P.warm, 0.14, P.warm, 0);
  if (h.simple) return;
  // the brass picture light on its arm, and the plate
  box(g, h.x + h.w / 2 - 14, h.y - 7, 28, 3.4, { body: P.brass, dark: P.brassDark, lit: P.brassLit, dabs: 0, rimA: 0.9, seed: h.x + 5 });
  g.fillStyle = css(P.brassDark);
  g.fillRect(h.x + h.w / 2 - 0.6, h.y - 4, 1.2, 4);
  box(g, h.x + h.w / 2 - 15, h.y + h.h + 3, 30, 6.6, { body: P.brass, dark: P.brassDark, lit: P.brassLit, dabs: 0, rimA: 0.9, seed: h.x + 6 });
  text(g, h.label, h.x + h.w / 2, h.y + h.h + 8.3, 4.6, [60, 40, 18], { weight: 'bold', face: PLATE, track: 0.5 });
}

// Reuse the actual office-style portrait in the Founder poster collection. The
// gallery painter owns its frame, varnished canvas and brass nameplate.
export function paintFounderGalleryPortrait(g, x, y, w, h) {
  // This is a single featured portrait, not a corridor-wide bake: retain its
  // fine opaque-brush grain at four-times logical resolution. Only the executive
  // palette carries the warm varnish colour it needs.
  portrait(g, { x, y, w, h, simple: true }, PAL.exec, 4);
}

function trophyCase(g, h, P) {
  box(g, h.x - 2, h.y - 3, h.w + 4, h.h + 3, { body: P.wood, dark: P.woodDark, lit: P.woodLit, rimLeft: true, dabs: 0.1, seed: h.x });
  // lit inside: a warm box of light behind the glass
  const ix = h.x + 3;
  const iy = h.y + 3;
  const iw = h.w - 6;
  const ih = h.h - 14;
  vgrad(g, ix, iy, iw, ih, [228, 176, 104], 1, [120, 76, 44], 1);
  const R = rng(55);
  for (let s = 0; s < 3; s++) {
    const sy = iy + ((s + 1) * ih) / 3.2;
    g.fillStyle = css([236, 220, 190], 0.9);
    g.fillRect(ix, sy, iw, 1.4);
    // cups and plaques on each shelf
    for (let x = ix + 4; x < ix + iw - 4; x += 9 + R() * 4) {
      const kind = R();
      if (kind < 0.55) {
        const cw = 3 + R() * 2;
        const ch = 6 + R() * 6;
        g.fillStyle = css(P.brass);
        fillPoly(g, [x - cw, sy - ch, x + cw, sy - ch, x + cw * 0.5, sy - ch * 0.45, x + 0.8, sy - ch * 0.35, x + 0.8, sy - 2, x + 2.4, sy - 1.6, x + 2.4, sy, x - 2.4, sy, x - 2.4, sy - 1.6, x - 0.8, sy - 2, x - 0.8, sy - ch * 0.35, x - cw * 0.5, sy - ch * 0.45], 0.1, x);
        g.fillStyle = css(P.brassLit, 0.9);
        fillPoly(g, rectPts(x - cw + 0.6, sy - ch + 0.4, 1, ch * 0.45), 0, 0);
      } else {
        box(g, x - 3, sy - 8, 6, 8, { body: [90, 56, 36], dark: [60, 36, 24], lit: [200, 150, 90], dabs: 0, wob: 0.1, seed: x });
        g.fillStyle = css(P.brass);
        g.fillRect(x - 2, sy - 6.4, 4, 2.4);
      }
    }
  }
  // the glass front, and the base cupboard
  g.fillStyle = css([255, 255, 255], 0.08);
  fillPoly(g, [ix, iy + ih, ix + 10, iy + ih, ix + 30, iy, ix + 20, iy], 0, 0);
  g.fillStyle = css(P.woodDark);
  g.fillRect(ix + iw / 2 - 0.6, iy, 1.2, ih);
  box(g, h.x - 2, h.y + h.h - 11, h.w + 4, 11, { body: P.wood, dark: P.woodDark, lit: P.woodLit, dabs: 0.08, seed: h.x + 1 });
}
function bookshelf(g, h, P) {
  box(g, h.x - 2, h.y - 3, h.w + 4, h.h + 3, { body: P.woodDark, dark: shade(P.woodDark, -0.3), lit: P.woodLit, rimLeft: true, dabs: 0.08, seed: h.x });
  const R = rng(77);
  const shelves = 6;
  const sh = (h.h - 10) / shelves;
  const spines = [[112, 36, 34], [44, 74, 58], [150, 110, 62], [40, 48, 78], [92, 30, 30], [120, 92, 54], [60, 40, 28]];
  for (let s = 0; s < shelves; s++) {
    const y1 = h.y + 4 + (s + 1) * sh;
    // the back of the shelf, in shadow
    g.fillStyle = css(shade(P.woodDark, -0.35));
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
    box(g, h.x + 1, y1, h.w - 2, 2.4, { body: P.wood, dark: P.woodDark, lit: P.woodLit, dabs: 0, wob: 0.1, seed: h.x + s });
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
    }, { body: [255, 246, 222], dark: [236, 214, 176], lit: [255, 255, 250], dabs: 0.2, dab: 1.2, seed: 21, g0: 0.2 }, (g) => {
      g.fillStyle = css(P.bronze);
      g.fillRect(-2.2, -9, 4.4, 3.2);
      g.fillStyle = css([255, 255, 255], 0.8);
      dab(g, -2, -2.4, 1.6, 1.2, -0.5);
    });
  }
  if (v === 'pendant') {
    return massSprite(k, [-11, -12, 22, 16], (g) => {
      fillPoly(g, [-1.5, -11, 1.5, -11, 9, 0, 10, 2, -10, 2, -9, 0], 0.15, 1);
    }, { body: [52, 90, 70], dark: [30, 56, 44], lit: [140, 190, 150], rim: 0.7, rimA: 0.8, rimDir: [-0.5, -0.86], dabs: 0.3, dab: 1.2, seed: 22, g0: 0.1 }, (g) => {
      g.fillStyle = css(P.brass);
      g.fillRect(-10, 0.6, 20, 1.4);
      g.fillStyle = css([255, 236, 190]);
      fillPoly(g, [-8.6, 2, 8.6, 2, 6, 3.4, -6, 3.4], 0, 0);
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
        glow(ctx, l.x, l.y, 30, [255, 232, 186], 0.32);
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
  const verde = [66, 88, 80];
  const brass = [176, 140, 78];
  const A = [164, 164, 170];
  const Bc = [150, 151, 158];
  const vein = [110, 110, 118];
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
          if (e < 1.08) base = e > 0.94 ? brass : e > 0.8 ? verde : e < 0.42 ? brass : A;
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
  const A = [92, 106, 124];
  const Bc = [86, 99, 118];
  const TL = 50;
  const pools = lightPools(D, 0.1, [236, 246, 236]);
  return {
    row(Z, dZ, du, s) {
      const n1 = rowNoise(P_FLOOR, 2.2, 3, 11, Z);
      const n2 = rowNoise(P_FLOOR, 60, 90, 12, Z);
      const hz = rowCov(Z, dZ, TL, 0.8);
      const iz = Math.floor(Z / TL);
      const ao = 0.82 + 0.18 * smooth(s / 0.18);
      const pool = pools(Z, dZ);
      return (u, out) => {
        const iu = Math.floor(u / TL);
        const base = ((iu + iz) & 1) ? A : Bc;
        const L = (1 + 0.05 * n1(u) + 0.04 * n2(u)) * (1 - Math.max(hz, lineCov(u, TL, 0.7, du)) * 0.12) * ao;
        const lit = pool(u);
        for (let c = 0; c < 3; c++) out[c] = base[c] * L + lit[c];
      };
    },
  };
}
function parquetMat(D, P) {
  const tones = [[150, 98, 58], [132, 84, 48], [164, 110, 66], [140, 92, 54]];
  const S = 25; // strip width: the herringbone's columns (100 to a period)
  const w = 7;
  const pools = lightPools(D, 0.28, [255, 196, 120]);
  // the rugs: under the boardroom table and before the desk
  const rugs = [];
  for (const it of D.mid.items) {
    if (it.kind === 'boardroom') rugs.push({ u0: uOfMid(it.u) - 40, u1: uOfMid(it.u1) + 40, z0: 760, z1: 1260, field: [112, 40, 38], border: [36, 66, 64], line: [180, 140, 76] });
    if (it.kind === 'desk') rugs.push({ u0: uOfMid(it.u) - 30, u1: uOfMid(it.u + it.w) + 30, z0: 780, z1: 1200, field: [44, 58, 92], border: [124, 52, 40], line: [190, 150, 80] });
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
      const xa = x + spec.mw;
      const xb = Math.min(b.x1, x + G.mullion) - spec.mw;
      if (xb <= xa) continue;
      for (const [hb, ht] of rows) {
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
      if (!sprites[key]) sprites[key] = plantSprite(k, it.variant, 600 + i * 13, P, fl);
      const sp = sprites[key];
      if (it.variant === 'bonsai') {
        // on a little wooden stand
        box(g, x - 9, b - 16, 18, 2.4, { body: P.wood ?? [100, 70, 44], lit: P.woodLit ?? [190, 140, 90], dabs: 0, seed: x });
        g.fillStyle = css(P.woodDark ?? [60, 40, 28]);
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
      // walnut front with fluting, a pale stone top lit along its edge
      const wood = [104, 70, 46];
      const shape = (gg) => fillPoly(gg, [x, b, x, b - 30, x + 6, b - 34, x + w - 6, b - 34, x + w, b - 30, x + w, b], 0.3, x);
      const spr = massSprite(k, [x - 2, b - 38, w + 4, 40], shape, { body: wood, dark: shade(wood, -0.3), lit: [220, 176, 120], rim: 0.9, rimA: 0.8, rimDir, dabs: 0.2, dab: 2, dabAng: Math.PI / 2, seed: 701 }, (gg) => {
        gg.fillStyle = css(shade(wood, -0.25), 0.6);
        for (let fx = x + 6; fx < x + w - 4; fx += 5) gg.fillRect(fx, b - 28, 1.1, 26);
        gg.fillStyle = css([210, 170, 110], 0.25);
        for (let fx = x + 7.1; fx < x + w - 4; fx += 5) gg.fillRect(fx, b - 28, 0.5, 26);
        box(gg, x - 1, b - 35, w + 2, 4, { body: [208, 198, 180], dark: [176, 166, 150], lit: [246, 240, 226], dabs: 0, rimA: 1, seed: x + 4 });
        // a brass band and the egg mark on the front
        gg.fillStyle = css(P.bronzeLit ?? [214, 172, 112], 0.8);
        gg.fillRect(x + 2, b - 8, w - 4, 1);
        gg.fillStyle = css([200, 156, 80]);
        fillPoly(gg, eggPts(x + w / 2, b - 18, 4.5, 5.6), 0.15, 3);
      });
      blit(g, spr, 0, 0);
      // a monitor's back and the bell on the counter
      box(g, x + w * 0.62, b - 47, 16, 11, { body: [52, 54, 60], dark: [36, 38, 44], lit: [160, 166, 176], dabs: 0, seed: x + 7 });
      g.fillStyle = css([52, 54, 60]);
      g.fillRect(x + w * 0.62 + 6, b - 37, 4, 3);
      g.fillStyle = css([210, 170, 90]);
      dab(g, x + w * 0.24, b - 36, 2.6, 1.8, 0);
      g.fillRect(x + w * 0.24 - 3.2, b - 35.2, 6.4, 1);
      return;
    }
    case 'turnstiles': {
      const w = it.w;
      for (let p = 0; p < 4; p++) {
        const px = x + (p * w) / 3.3 + 4;
        box(g, px - 3, b - 26, 6, 26, { body: [150, 146, 140], dark: [104, 100, 96], lit: [240, 236, 226], rimLeft: true, dabs: 0.05, seed: px });
        g.fillStyle = css([90, 200, 150], 0.7);
        g.fillRect(px - 1.6, b - 24, 3.2, 1.2);
        if (p < 3) {
          // the glass flaps: barely there, so they never read as a solid in front of the lane
          g.fillStyle = css([200, 214, 220], 0.08);
          fillPoly(g, rectPts(px + 3, b - 22, w / 3.3 - 6, 12), 0.2, px + 1);
          brokenEdge(g, px + 3, b - 22, px + w / 3.3 - 3, b - 22, 0.5, [230, 236, 236], 0.25, px + 2);
        }
      }
      return;
    }
    case 'sofa': {
      const w = it.w;
      const col = fl === 'exec' ? [104, 34, 30] : [62, 96, 92];
      const spr = massSprite(k, [x - 2, b - 30, w + 4, 32], (gg) => {
        fillPoly(gg, [x + 2, b - 4, x + 2, b - 26, x + 8, b - 28, x + w - 8, b - 28, x + w - 2, b - 26, x + w - 2, b - 4], 0.3, x);
        fillPoly(gg, rectPts(x - 1, b - 18, 7, 15), 0.3, x + 1);
        fillPoly(gg, rectPts(x + w - 6, b - 18, 7, 15), 0.3, x + 2);
        fillPoly(gg, rectPts(x + 2, b - 4, 2, 4), 0, 0);
        fillPoly(gg, rectPts(x + w - 4, b - 4, 2, 4), 0, 0);
      }, { body: col, dark: shade(col, -0.3), lit: shade(col, 0.45), rim: 0.9, rimA: 0.8, rimDir, dabs: 0.3, dab: 2, seed: 720 + i }, (gg) => {
        gg.fillStyle = css(shade(col, -0.25), 0.7);
        gg.fillRect(x + 6, b - 13, w - 12, 1);
        if (fl === 'exec') {
          // chesterfield buttons
          for (let bx = x + 8; bx < x + w - 6; bx += 6) for (const by of [b - 24, b - 20]) dab(gg, bx + (by % 2) * 3, by, 0.6, 0.6, 0);
        }
        for (let cx = x + w / 3; cx < x + w - 6; cx += w / 3) gg.fillRect(cx, b - 13, 0.8, 9);
      });
      blit(g, spr, 0, 0);
      return;
    }
    case 'sculpture': {
      // a polished bronze egg on a black stone plinth: the company's own mark, in the round
      box(g, x + 8, b - 24, 24, 24, { body: [44, 46, 48], dark: [30, 30, 34], lit: [150, 150, 146], rimLeft: true, dabs: 0.1, seed: x });
      const spr = massSprite(k, [x + 4, b - 62, 32, 40], (gg) => fillPoly(gg, eggPts(x + 20, b - 41, 11, 15), 0.2, 4), {
        body: [176, 128, 66], dark: [96, 62, 30], lit: [255, 226, 160], rim: 1.2, rimA: 0.95, rimDir, dabs: 0.2, dab: 1.2, seed: 730, g0: 0.2,
      }, (gg) => {
        gg.fillStyle = css([255, 240, 200], 0.5);
        dab(gg, x + 15, b - 50, 2, 3.6, -0.4);
        gg.fillStyle = css([60, 40, 22], 0.6);
        dab(gg, x + 25, b - 36, 4, 7, 0.3);
      });
      blit(g, spr, 0, 0);
      return;
    }
    case 'cubicles': {
      const w = it.u1 - it.u;
      const n = Math.round(w / 40);
      const fab = [128, 120, 102];
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
      box(g, x - 1, b - 35, w + 2, 2.6, { body: [160, 160, 156], dark: [130, 130, 126], lit: [232, 232, 224], dabs: 0, wob: 0.1, rimA: 0.9, seed: x + 3 });
      g.fillStyle = css(shade(fab, -0.35), 0.5);
      g.fillRect(x, b - 4, w, 4);
      // on the rail: mugs, a plant, a family photo, over each desk
      const R = rng(it.u + 3);
      for (let d = 0; d < n; d++) {
        const occupied = it.heads.includes(d) || d === it.pop;
        const dx = x + d * 40;
        if (!occupied) {
          // an empty desk: its monitor's glow on the wall above, a mug on the rail
          const gr = g.createRadialGradient(dx + 20, b - 36, 1, dx + 20, b - 36, 16);
          gr.addColorStop(0, css([200, 230, 250], 0.32));
          gr.addColorStop(1, css([200, 230, 250], 0));
          g.save();
          g.globalCompositeOperation = 'destination-over';
          g.fillStyle = gr;
          g.fillRect(dx + 4, b - 54, 32, 20);
          g.restore();
        }
        const thing = R();
        if (thing < 0.45) {
          const mc = [[180, 60, 50], [220, 200, 90], [60, 100, 150], [236, 232, 220]][(R() * 4) | 0];
          box(g, dx + 8 + R() * 22, b - 39, 3, 4, { body: mc, lit: shade(mc, 0.4), dabs: 0, wob: 0.1, seed: dx });
        } else if (thing < 0.7) {
          g.fillStyle = css([60, 100, 64]);
          for (let l = 0; l < 5; l++) dab(g, dx + 30 + (l - 2) * 1.4, b - 39 - Math.abs(l - 2) * -0.4 - 2, 1.4, 2.6, (l - 2) * 0.4);
          g.fillStyle = css([170, 100, 70]);
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
      const col = [110, 120, 92];
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
      }, { body: [92, 54, 34], dark: [56, 32, 22], lit: [220, 156, 96], rim: 0.9, rimA: 0.9, rimDir: [0, -1], dabs: 0.2, dab: 2, dabAng: 0, seed: 760 }, (gg) => {
        gg.fillStyle = css([255, 210, 150], 0.35);
        gg.fillRect(x + 2, b - 25.4, w - 4, 0.8);
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
        body: [70, 34, 28], dark: [40, 20, 18], lit: [200, 120, 90], rim: 0.9, rimA: 0.8, rimDir: [0, -1], dabs: 0.3, dab: 1.6, seed: 770,
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
      }, { body: [96, 56, 34], dark: [58, 34, 22], lit: [226, 160, 96], rim: 0.9, rimA: 0.9, rimDir: [0, -1], dabs: 0.2, dab: 2, seed: 771 }, (gg) => {
        for (const px of [x + 4, x + w - 30]) {
          for (let d = 0; d < 3; d++) {
            gg.fillStyle = css([50, 28, 18], 0.6);
            gg.fillRect(px, b - 25 + d * 8, 26, 0.8);
            gg.fillStyle = css(P.brass);
            gg.fillRect(px + 11, b - 21.6 + d * 8, 4, 1);
          }
        }
        gg.fillStyle = css([40, 70, 50]);
        gg.fillRect(x, b - 30, w, 1.2);
      });
      blit(g, spr, 0, 0);
      // the green banker's lamp, its warm pool on the leather top
      const lx = x + w * 0.72;
      const gr = g.createRadialGradient(lx, b - 31, 1, lx, b - 31, 30);
      gr.addColorStop(0, css(P.warm, 0.5));
      gr.addColorStop(1, css(P.warm, 0));
      g.fillStyle = gr;
      g.fillRect(lx - 30, b - 60, 60, 34);
      g.fillStyle = css(P.brass);
      g.fillRect(lx - 0.6, b - 38, 1.2, 8);
      g.fillRect(lx - 3, b - 31, 6, 1.4);
      const shadeSpr = massSprite(k, [lx - 8, b - 43, 16, 7], (gg) => fillPoly(gg, [lx - 7, b - 37, lx - 5, b - 41.5, lx + 5, b - 41.5, lx + 7, b - 37], 0.1, lx), {
        body: [40, 110, 74], dark: [24, 70, 46], lit: [150, 220, 160], rim: 0.6, rimA: 0.9, rimDir: [0, -1], dabs: 0.2, dab: 1, seed: 772,
      });
      blit(g, shadeSpr, 0, 0);
      g.fillStyle = css([255, 230, 170], 0.9);
      g.fillRect(lx - 6, b - 37.2, 12, 0.8);
      // a blotter, a pen set, a nameplate
      g.fillStyle = css([40, 60, 48], 0.9);
      g.fillRect(x + w * 0.3, b - 31, 22, 1);
      g.fillStyle = css([30, 30, 34]);
      g.fillRect(x + w * 0.2, b - 34, 0.8, 4);
      g.fillRect(x + w * 0.2 + 2, b - 33.6, 0.8, 3.6);
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
  const people = new Map();
  const skins = [[226, 184, 150], [196, 146, 108], [150, 100, 70], [236, 200, 170], [120, 80, 56]];
  const hairs = [[50, 36, 28], [110, 70, 40], [200, 170, 110], [30, 28, 30], [150, 150, 150], [160, 80, 40]];
  const shirts = D.id === 'exec'
    ? [[40, 44, 60], [60, 50, 46], [36, 38, 44], [70, 60, 76]]
    : [[150, 176, 200], [200, 170, 110], [140, 160, 120], [170, 110, 100], [120, 120, 150], [190, 186, 170]];
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
    const tie = R() < 0.5;
    spr = massSprite(k, [-10, -12, 20, 26], (g) => {
      fillPoly(g, [-8, 14, -8, 8, -5, 5.4, 5, 5.4, 8, 8, 8, 14], 0.3, seed);
      fillPoly(g, rectPts(-1.6, 2, 3.2, 4), 0, 0);
      fillPoly(g, arcPts(0, -2, 4.4, 5, 0, TAU, 24), 0.2, seed + 1);
      if (style === 2) fillPoly(g, arcPts(0, -3, 5.4, 5.4, Math.PI * 0.9, Math.PI * 2.1, 16), 0.4, seed + 2);
      if (style === 3) dab(g, 0, -7.4, 3, 2.2, 0);
    }, { body: skin, dark: shade(skin, -0.2), lit: shade(skin, 0.3), rim: 0.6, rimA: 0.7, rimDir, dabs: 0.15, dab: 1, seed: seed + 9, g0: 0.2 }, (g) => {
      g.fillStyle = css(shirt);
      fillPoly(g, [-8.2, 14.4, -8.2, 8, -5, 5.2, 5, 5.2, 8.2, 8, 8.2, 14.4], 0.3, seed);
      g.fillStyle = css(shade(shirt, 0.35), 0.8);
      brokenEdge(g, -5, 5.6, 5, 5.6, 0.8, shade(shirt, 0.4), 0.8, seed + 4);
      if (tie && D.id !== 'lobby') {
        g.fillStyle = css([150, 40, 40]);
        fillPoly(g, [-0.8, 5.6, 0.8, 5.6, 1.2, 12, 0, 13, -1.2, 12], 0, 0);
      }
      // hair: a cap of colour, parted, or a bun
      g.fillStyle = css(hair);
      if (style === 0) fillPoly(g, arcPts(0, -3, 4.6, 4.2, Math.PI, TAU, 16), 0.3, seed + 5);
      else if (style === 1) fillPoly(g, [-4.6, -2, -4.4, -5, -2, -7.2, 2, -7.2, 4.4, -5, 4.6, -2, 3.4, -4.6, -1, -5], 0.3, seed + 6);
      else if (style === 2) fillPoly(g, arcPts(0, -3, 5.4, 5.4, Math.PI * 0.9, Math.PI * 2.1, 16), 0.4, seed + 2);
      else { fillPoly(g, arcPts(0, -3, 4.6, 4.2, Math.PI, TAU, 16), 0.3, seed + 5); dab(g, 0, -7.4, 3, 2.2, 0); }
      // the face, turned the way they look: an ear, a nose, an eye
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
  }, { body: [64, 34, 30], dark: [36, 20, 18], lit: [196, 120, 86], rim: 0.9, rimA: 0.85, rimDir: [0, -1], dabs: 0.3, dab: 1.4, seed: 811 }, (g) => {
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
      // the marble's own edge catching the light, a bronze nosing, then dark verde stone
      vgrad(g, S.u0, LANE_TOP, S.u1 - S.u0, H - LANE_TOP, [52, 64, 58], 1, [28, 34, 32], 1);
      for (let i = 0; i < 160; i++) {
        g.strokeStyle = css([150, 172, 156], 0.08 + R() * 0.1);
        g.lineWidth = 0.4 + R() * 0.5;
        const u = R() * S.P;
        const y = LANE_TOP + 6 + R() * 30;
        S.rep(u, 30, (uu) => {
          g.beginPath();
          g.moveTo(uu, y);
          g.quadraticCurveTo(uu + 8, y + (R() - 0.5) * 8, uu + 14 + R() * 18, y + (R() - 0.5) * 10);
          g.stroke();
        });
      }
      for (let u = 0; u < S.P; u += 125) S.rep(u, 2, (uu) => { g.fillStyle = css([18, 22, 20], 0.8); g.fillRect(uu - 0.5, LANE_TOP + 5, 1, H - LANE_TOP); });
      box(g, S.u0, LANE_TOP, S.u1 - S.u0, 2.6, { body: [216, 206, 188], dark: [180, 170, 152], lit: [250, 244, 228], dabs: 0, wob: 0 });
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
      box(g, S.u0, LANE_TOP, S.u1 - S.u0, 4, { body: [98, 112, 130], dark: [76, 88, 104], lit: [170, 184, 200], dabs: 0, wob: 0, rimA: 0.8 });
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
function blindRows(b) {
  const top = 146;
  const clear = 54 + 92 * (1 - b.blinds);
  const rows = [[54, clear]];
  for (let h = clear; h < top - 1.4; h += 3) rows.push([h + 0.3, h + 1.7]);
  return rows;
}
const SUN = {
  lobby: { tanE: 0.5, tanA: 0.08, col: [255, 226, 170], a0: 0.66, a1: 0.56, mw: 1.6, beam: 0.05, rows: () => [[0, 108 - 2], [108 + 2, 182]] },
  open: { tanE: 0.32, tanA: -0.06, col: [255, 222, 150], a0: 0.3, a1: 0.24, mw: 1.4, beam: 0.025, rows: (b) => blindRows(b) },
  exec: { tanE: 0.09, tanA: -0.12, col: [255, 150, 80], a0: 0.26, a1: 0.16, mw: 1.2, beam: 0.03, rows: () => [[4, 174]] },
};

export const STYLE = {
  id: 'gouache',
  name: 'GOUACHE — Office at Night',
  note: 'Hopper\'s "Office at Night" in 1950s storybook gouache: opaque painted masses with hand-cut edges and no '
    + 'outlines, a broken rim of lighter paint on every edge that faces the light, dry-brush skies and paper tooth over '
    + 'all. The climb is told in light: morning sun raking through the lobby\'s glass onto polished marble, a flat '
    + 'fluorescent noon on floor 23, and a burning dusk on 88 with brass lamps pooling warm against deep teal-green '
    + 'shadow and the city lights coming on far below. The floor is a true perspective plane, baked row by row.',
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
