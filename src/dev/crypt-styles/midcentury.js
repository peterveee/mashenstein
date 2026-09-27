// CRYPT style bake-off — MID-CENTURY MODERN. A 1958 Halloween cartoon background in the
// UPA / Mary Blair / Maurice Noble manner: flat, stylised, asymmetrical colour shapes
// (kidneys, tall triangles, leaning trapezoids, lollipop and fishbone trees, atomic
// starbursts), with a loose thin black line drawn OUT OF REGISTER over them, so the
// colour and the drawing never quite agree. Some fields carry a baked dry-brush or
// sponge texture; overlapping shapes are semi-transparent.
//
// Depth is carried by a stepped value ramp and by the register offset, which grows
// from back to front. The gas lamp keeps the only light; mustard elsewhere is paint,
// not light (the moon's misregistered second disc, a few stars).

const TAU = Math.PI * 2;

// --------------------------------------------------------------- palette
const INK = '#0a0e12';
const SKY = ['#0b1c2a', '#0e2434', '#122d3e', '#173847'];
const HOLE = '#123040';
const CREAM = '#eee3c0';
const MUSTARD = '#d8a23e';
const CORAL = '#c8766a';
const TURQ = '#4d9a91';
const TURQ_LT = '#86c9bd';

const LAYER = {
  bg: { fill: '#2a5552', band: '#244b49', patch: '#5aa399', tree: '#173536', blob: '#3f7f76' },
  mid: { fill: '#343a26', band: '#2c3120', patch: '#8a8442', tree: '#12180f', blob: CORAL },
  fg: { fill: '#0f181a', band: '#0c1315', patch: '#2d4a43', tree: '#0a1113', blob: '#2c4a41' },
};
// The register: where the ink lands relative to its colour. Grows toward the viewer.
const REG = { bg: [1.8, -1.5], mid: [2.2, -1.8], fg: [2.8, -2.2] };

const ABBEY = { nave: '#7a4858', tower: '#9e5d62', spire: '#4c2d44', trans: '#6e4053' };
const STONES = ['#365f5a', '#7c4e57', '#86703a'];

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

// --------------------------------------------------------------- textures
// Baked once at 2x and drawn at half scale, so they stay crisp on a 2x card. Each one
// tiles: every mark is stamped again one tile left/up/down.
const TEX_PX = 256;
let BAKED = null;

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

const PATS = new WeakMap();
function pats(ctx) {
  let p = PATS.get(ctx);
  if (p) return p;
  if (!BAKED) {
    BAKED = {
      dryL: bakeDry(3, '238,228,196'),
      dryD: bakeDry(7, '6,10,14'),
      spL: bakeSponge(11, '238,228,196'),
      spD: bakeSponge(13, '6,10,14'),
    };
  }
  p = {};
  for (const k of Object.keys(BAKED)) p[k] = ctx.createPattern(BAKED[k], 'repeat');
  PATS.set(ctx, p);
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
// Local item coordinates to screen: scale, optional mirror and lean.
function xf(x, y, s, rot = 0, flip = 1) {
  const c = Math.cos(rot);
  const sn = Math.sin(rot);
  return (pts) => pts.map(([px, py]) => {
    const lx = px * s * flip;
    const ly = py * s;
    return [x + lx * c - ly * sn, y + lx * sn + ly * c];
  });
}

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
function ink(ctx, v, seed, reg, o = {}) {
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
  ctx.strokeStyle = o.col ?? INK;
  ctx.lineWidth = o.w ?? 0.7;
  ctx.globalAlpha = o.a ?? 0.9;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// The same for a smooth blob: one loose loop, broken by a seeded dash.
function inkBlob(ctx, v, seed, reg, o = {}) {
  const r = rng(seed);
  const [ox, oy] = reg;
  const J = o.jit ?? 0.8;
  const w = v.map(([x, y]) => [x + ox + (r() - 0.5) * J, y + oy + (r() - 0.5) * J]);
  ctx.beginPath();
  pathBlob(ctx, w);
  ctx.setLineDash(o.dash ?? [30 + r() * 40, 3 + r() * 6, 12 + r() * 20, 5 + r() * 9]);
  ctx.lineDashOffset = r() * 40;
  ctx.strokeStyle = o.col ?? INK;
  ctx.lineWidth = o.w ?? 0.7;
  ctx.globalAlpha = o.a ?? 0.9;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

// An open polyline in ink (branches, grass, rays), with the register applied.
function inkLine(ctx, pts, reg, w = 0.7, a = 0.9) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0] + reg[0], pts[0][1] + reg[1]);
  for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0] + reg[0], pts[k][1] + reg[1]);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
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
  ctx.arc(x, y, r, 0, TAU);
  ctx.globalAlpha = a;
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.globalAlpha = 1;
}

function circlePts(x, y, r, n = 14) {
  const out = [];
  for (let k = 0; k < n; k++) out.push([x + Math.cos((k / n) * TAU) * r, y + Math.sin((k / n) * TAU) * r]);
  return out;
}

// ------------------------------------------------------------------ sky
function sky(ctx, f, P) {
  ctx.fillStyle = SKY[0];
  ctx.fillRect(-40, -80, f.W + 80, f.H + 160);
  // Stepped flat bands toward the horizon, each edge a slow lazy wave.
  const edges = [88, 132, 170];
  for (let b = 0; b < edges.length; b++) {
    ctx.beginPath();
    ctx.moveTo(-40, 350);
    for (let x = -40; x <= 520; x += 10) {
      const y = edges[b] + 4 * Math.sin(x / (70 + b * 23) + b * 1.7) + 2 * Math.sin(x / 19 + b);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(520, 350);
    ctx.closePath();
    ctx.fillStyle = SKY[b + 1];
    ctx.fill();
  }
  ctx.beginPath();
  ctx.rect(-40, -80, f.W + 80, f.H + 160);
  texFill(ctx, P.dryL, 0, 0, 0.05);

  // Halo: two flat translucent discs, out of step with the moon.
  const m = f.moon;
  disc(ctx, m.x - 6, m.y + 4, m.r * 2.6, TURQ, 0.07);
  disc(ctx, m.x + 8, m.y - 3, m.r * 1.75, TURQ_LT, 0.07);

  stars(ctx, f);
  moon(ctx, m, P);
  for (const c of f.clouds) cloud(ctx, c, P);
  for (const b of f.bats) bat(ctx, b);
}

function burst(ctx, x, y, R, rot, col) {
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const a = rot + (k / 8) * TAU;
    const len = k % 2 ? R * 0.45 : R;
    ctx.moveTo(x + Math.cos(a) * R * 0.18, y + Math.sin(a) * R * 0.18);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
  }
  ctx.strokeStyle = col;
  ctx.lineWidth = 0.6;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.6, R * 0.16), 0, TAU);
  ctx.fillStyle = col;
  ctx.fill();
}

function sparkle(ctx, x, y, R, col) {
  const q = R * 0.2;
  ctx.beginPath();
  ctx.moveTo(x, y - R);
  ctx.lineTo(x + q, y - q);
  ctx.lineTo(x + R * 0.8, y);
  ctx.lineTo(x + q, y + q);
  ctx.lineTo(x, y + R);
  ctx.lineTo(x - q, y + q);
  ctx.lineTo(x - R * 0.8, y);
  ctx.lineTo(x - q, y - q);
  ctx.closePath();
  ctx.fillStyle = col;
  ctx.fill();
}

function stars(ctx, f) {
  f.stars.forEach((s, k) => {
    const h = hash(k + 7.1);
    const col = h < 0.2 ? MUSTARD : h < 0.3 ? TURQ_LT : CREAM;
    const tw = 0.8 + 0.3 * s.twinkle;
    ctx.globalAlpha = 0.4 + 0.6 * s.twinkle;
    if (s.s > 1.38) burst(ctx, s.x, s.y, (2.2 + s.s * 1.5) * tw, hash(k + 3.3) * TAU, col);
    else if (s.s > 1.02) sparkle(ctx, s.x, s.y, (1.5 + s.s * 0.9) * tw, col);
    else {
      ctx.beginPath();
      ctx.arc(s.x, s.y, 0.45 + s.s * 0.35, 0, TAU);
      ctx.fillStyle = col;
      ctx.fill();
    }
  });
  ctx.globalAlpha = 1;
}

function moon(ctx, m, P) {
  // The misregistered second plate: a mustard disc under the cream one, peeking out.
  disc(ctx, m.x - 5, m.y + 4, m.r, MUSTARD, 0.85);
  ctx.beginPath();
  ctx.arc(m.x, m.y, m.r, 0, TAU);
  ctx.fillStyle = CREAM;
  ctx.fill();
  texFill(ctx, P.spD, m.x, m.y, 0.1);
  // Two flat crater lozenges and a kidney of shade.
  flat(ctx, [[m.x + 3, m.y - 14], [m.x + 14, m.y - 9], [m.x + 16, m.y + 1], [m.x + 9, m.y - 2], [m.x + 4, m.y - 7]], '#dccb98', { smooth: true, a: 0.9 });
  disc(ctx, m.x - 9, m.y + 8, 3.2, '#dccb98', 0.9);
  disc(ctx, m.x - 3, m.y - 11, 1.8, '#dccb98', 0.9);
  inkBlob(ctx, circlePts(m.x, m.y, m.r, 12), 41, [2.2, -1.8], { dash: [48, 6, 70, 4], w: 0.8, jit: 1.4 });
}

function cloud(ctx, c, P) {
  const { x, y, w, h } = c;
  const odd = c.i % 2 === 1;
  const Q = (u, v) => [x + u * w, y + v * h];
  const main = [Q(0, 0.72), Q(0.1, 0.02), Q(0.38, -0.12), Q(0.6, 0.32), Q(0.82, -0.4), Q(1.05, -0.2),
    Q(0.97, 0.62), Q(0.62, 1.0), Q(0.3, 1.18), Q(0.07, 1.12)];
  const X = (u, v) => [x + (0.24 + u * 0.66) * w, y + (0.55 + v * 0.85) * h];
  const under = [X(0, 0.5), X(0.1, -0.05), X(0.5, 0.05), X(0.95, -0.1), X(1.02, 0.55), X(0.8, 1.05), X(0.45, 0.62), X(0.15, 1.02)];
  flat(ctx, under, odd ? CORAL : TURQ, { smooth: true, a: 0.32 });
  flat(ctx, main, odd ? TURQ : CORAL, { smooth: true, a: 0.46, tex: P.dryL, ta: 0.12, ax: x, ay: y });
  inkBlob(ctx, main, 60 + c.i * 7, [-2.2, -1.6], { w: 0.65, a: 0.8, dash: [w * 0.9, w * 0.4, w * 0.5, w * 0.6] });
}

function bat(ctx, b) {
  const u = Math.cos(b.flap * TAU);
  const T = xf(b.x, b.y, b.s);
  const wing = (m) => {
    const tip = [10 * m, -6 * u];
    const body = [1.4 * m, 1.4];
    const lp = (t, dy) => [tip[0] + (body[0] - tip[0]) * t, tip[1] + (body[1] - tip[1]) * t + dy];
    return [[1.2 * m, -1.2], [5 * m, -3.8 * u - 1.6], tip, lp(0.24, -1.4), lp(0.4, 0.5), lp(0.6, -1.3), lp(0.76, 0.4), body];
  };
  const shape = T([...wing(1), [0.8, 2.6], [-0.8, 2.6], ...wing(-1).reverse(), [-1.3, -1.8], [-1.6, -4.2], [-0.4, -2.4], [0.4, -2.4], [1.6, -4.2], [1.3, -1.8]]);
  // A coral second plate slipped out of register under the black.
  const slip = shape.map(([px, py]) => [px + 1.4, py + 1.1]);
  flat(ctx, slip, CORAL, { a: 0.45 });
  flat(ctx, shape, '#06090c');
  const eyes = T([[-0.6, -1.1], [0.6, -1.1]]);
  ctx.fillStyle = MUSTARD;
  for (const [ex, ey] of eyes) ctx.fillRect(ex - 0.3, ey - 0.3, 0.6, 0.6);
}

// ------------------------------------------------------------------ land
function ridge(ctx, L, name, P) {
  const pal = LAYER[name];
  const reg = REG[name];
  const top = (x) => L.ridge(x);
  const outline = (dy) => {
    ctx.beginPath();
    ctx.moveTo(-40, 350);
    for (let x = -40; x <= 520; x += 3) ctx.lineTo(x, top(x) + dy(x));
    ctx.lineTo(520, 350);
    ctx.closePath();
  };
  outline(() => 0);
  ctx.fillStyle = pal.fill;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Kidney patches of a lighter paint, laid into the hill and moving with it.
  const seg = { bg: 230, mid: 190, fg: 260 }[name];
  const u0 = Math.floor((-80 + L.shift) / seg) * seg;
  for (let u = u0; u - L.shift < 560; u += seg) {
    const k = Math.round(u / seg);
    const cx = u - L.shift + hash(k * 3.1 + seg) * seg * 0.5;
    const cy = top(cx) + 7 + hash(k * 1.3 + seg) * 10;
    const pw = 36 + hash(k * 7.7 + seg) * 50;
    const ph = 5 + hash(k * 2.9 + seg) * 4;
    const kid = [[cx - pw / 2, cy + ph * 0.2], [cx - pw * 0.3, cy - ph * 0.6], [cx, cy - ph * 0.3], [cx + pw * 0.1, cy + ph * 0.1],
      [cx + pw * 0.35, cy - ph * 0.7], [cx + pw / 2, cy], [cx + pw * 0.2, cy + ph * 0.8], [cx - pw * 0.25, cy + ph * 0.7]];
    flat(ctx, kid, pal.patch, { smooth: true, a: { bg: 0.22, mid: 0.15, fg: 0.35 }[name] });
  }
  // A stepped darker band a little below the crest.
  outline((x) => 11 + 3 * Math.sin((x + L.shift) / 41) + 2 * Math.sin((x + L.shift) / 13));
  ctx.fillStyle = pal.band;
  ctx.fill();
  ctx.restore();
  outline(() => 0);
  texFill(ctx, P.dryL, -L.shift, 0, name === 'fg' ? 0.04 : 0.07);
  inkCrest(ctx, L, { bg: 1, mid: 2, fg: 3 }[name], reg);
  if (name !== 'fg') hatches(ctx, L, name);
}

// Little clusters of ticks scattered on the hillside, the layout man's shorthand for
// grass. Kept off the calm strip just above the lane.
function hatches(ctx, L, name) {
  const seg = name === 'bg' ? 64 : 52;
  const floor = name === 'bg' ? 196 : 204;
  const u0 = Math.floor((-60 + L.shift) / seg) * seg;
  ctx.beginPath();
  for (let u = u0; u - L.shift < 540; u += seg) {
    const k = Math.round(u / seg) + (name === 'bg' ? 0 : 500);
    if (hash(k * 2.7) < 0.35) continue;
    const cx = u - L.shift + hash(k * 4.1) * seg * 0.7;
    const cy = L.ridge(cx) + 5 + hash(k * 6.3) * 16;
    if (cy > floor) continue;
    const n = 3 + Math.floor(hash(k * 8.9) * 3);
    const tilt = name === 'bg' ? 1.4 : -1.2;
    for (let j = 0; j < n; j++) {
      const x = cx + j * 2.2;
      const len = 2.5 + hash(k * 3.7 + j) * 2;
      ctx.moveTo(x, cy);
      ctx.lineTo(x + tilt, cy - len);
    }
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.55;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.45;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// The crest line in long overlapping strokes, each its own small step off the register.
function inkCrest(ctx, L, seed, reg) {
  const seg = 90;
  const u0 = Math.floor((-60 + L.shift) / seg) * seg;
  ctx.beginPath();
  for (let u = u0; u - L.shift < 540; u += seg) {
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
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.75;
  ctx.globalAlpha = 0.85;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// Loose stone-course dashes, a step off the register like everything else.
function dashes(ctx, T, list, reg) {
  ctx.beginPath();
  for (const [x0, y0, x1, y1] of list) {
    const [[ax, ay], [bx, by]] = T([[x0, y0], [x1, y1]]);
    ctx.moveTo(ax + reg[0], ay + reg[1]);
    ctx.lineTo(bx + reg[0], by + reg[1]);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.6;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.5;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function lancet(lx, by, w, h) {
  return [[lx - w / 2, by], [lx - w / 2, by - h * 0.62], [lx, by - h], [lx + w / 2, by - h * 0.62], [lx + w / 2, by]];
}

function abbey(ctx, it, P) {
  const T = xf(it.x, it.y, it.s);
  const reg = REG.bg;
  const sd = 100 + it.i * 31;
  // Nave: a long wall, its top broken into steps.
  const nave = T([[-54, 3], [-53, -25], [-47, -31], [-41, -27], [-34, -38], [-25, -35], [-18, -43], [-9, -38], [2, -42], [3, 3]]);
  flat(ctx, nave, ABBEY.nave, { tex: P.dryD, ta: 0.28, ax: it.x, ay: it.y });
  // A translucent shadow plane across its west end.
  flat(ctx, T([[-54, 3], [-53, -25], [-47, -31], [-26, 3]]), '#0b1c2a', { a: 0.3 });
  [-42, -27, -12].forEach((lx, k) => {
    const lan = T(lancet(lx, -5, 7, 24));
    flat(ctx, lan, HOLE);
    ink(ctx, lan, sd + k, reg, { gapP: 0.2, over: 1 });
  });
  ink(ctx, nave, sd + 5, reg);
  // Roofless transept, leaning back the other way, with an atomic rose window.
  const trans = T([[18, 3], [19, -27], [27, -35], [32, -30], [38, -39], [52, -25], [50, 3]]);
  flat(ctx, trans, ABBEY.trans, { tex: P.dryD, ta: 0.28, ax: it.x, ay: it.y });
  const pin = T([[36, -36], [39, -52], [42, -35]]);
  flat(ctx, pin, ABBEY.spire);
  ink(ctx, pin, sd + 6, reg, { gapP: 0.3 });
  const [rx, ry] = T([[34, -16]])[0];
  const rr = 5 * it.s;
  disc(ctx, rx, ry, rr, HOLE);
  disc(ctx, rx + 1.5, ry - 1, rr * 0.7, MUSTARD, 0.18);
  burst(ctx, rx + reg[0], ry + reg[1], rr * 1.05, 0.3, INK);
  inkBlob(ctx, circlePts(rx, ry, rr, 8), sd + 7, reg, { dash: [9, 2, 12, 3] });
  ink(ctx, trans, sd + 8, reg);
  // Tower: tapering and leaning east; the spire a very tall thin triangle.
  const tower = T([[2, 3], [7, -54], [19, -53], [20, 3]]);
  flat(ctx, tower, ABBEY.tower, { tex: P.dryD, ta: 0.24, ax: it.x, ay: it.y });
  flat(ctx, T([[13, 3], [13.6, -53.5], [19, -53], [20, 3]]), '#0b1c2a', { a: 0.22 });
  const win = T(lancet(13, -32, 4.5, 13));
  flat(ctx, win, HOLE);
  ink(ctx, tower, sd + 9, reg);
  const spire = T([[4, -53], [12, -88], [22, -52]]);
  flat(ctx, spire, ABBEY.spire, { tex: P.dryL, ta: 0.08, ax: it.x, ay: it.y });
  ink(ctx, spire, sd + 10, reg, { over: 2 });
  ink(ctx, win, sd + 11, reg, { gapP: 0.3 });
  dashes(ctx, T, [[-51, -11, -46, -11.5], [-37, -21, -32, -21], [-21, -9, -16, -9.5], [-7, -27, -2, -27],
    [9, -18, 13, -18.3], [11, -7, 16, -7], [24, -9, 29, -9.4], [42, -5, 47, -5], [43, -19, 47, -19.2]], reg);
}

// A distant grove: alternate fishbone spikes over tall triangles and bare forks over
// lollipop discs, the colour always a step off the line.
function grove(ctx, it) {
  const pal = LAYER.bg;
  const reg = REG.bg;
  const n = 3 + (it.i % 3);
  for (let k = 0; k < n; k++) {
    const dx = (k - (n - 1) / 2) * 12 * it.s + (hash(it.i * 7 + k) - 0.5) * 6;
    const h = (20 + hash(it.i * 11 + k) * 14) * it.s;
    const x = it.x + dx;
    const y = it.y + 2;
    const lean = (hash(k + it.i * 2.3) - 0.5) * 4;
    if ((k + it.i) % 2 === 0) {
      const hw = h * 0.16;
      flat(ctx, [[x - hw - 1.5, y], [x + lean - 1.5, y - h - 2], [x + hw - 1.5, y]], pal.tree, { a: 0.9 });
      const spine = [[x, y], [x + lean, y - h]];
      inkLine(ctx, spine, reg, 0.7, 0.85);
      ctx.beginPath();
      for (let j = 1; j < 8; j++) {
        const t = j / 8.5;
        const sx = x + lean * t + reg[0];
        const sy = y - h * t + reg[1];
        const bl = hw * 1.3 * (1 - t) + 1;
        ctx.moveTo(sx - bl, sy - bl * 0.8);
        ctx.lineTo(sx, sy);
        ctx.lineTo(sx + bl, sy - bl * 0.8);
      }
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.55;
      ctx.globalAlpha = 0.85;
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      const cr = h * 0.3;
      disc(ctx, x + lean - 2, y - h + cr * 0.9, cr, pal.blob, 0.55);
      ctx.fillStyle = pal.tree;
      ctx.fillRect(x - 0.9, y - h * 0.5, 1.8, h * 0.5);
      inkLine(ctx, [[x, y], [x + lean * 0.5, y - h * 0.55], [x + lean, y - h]], reg, 0.75, 0.85);
      inkLine(ctx, [[x + lean * 0.5, y - h * 0.55], [x - cr * 0.8, y - h * 0.85]], reg, 0.55, 0.85);
      inkLine(ctx, [[x + lean * 0.6, y - h * 0.65], [x + cr * 0.9, y - h * 0.92]], reg, 0.55, 0.85);
    }
  }
}

function mausoleum(ctx, it, P) {
  const T = xf(it.x, it.y + 1, it.s);
  const reg = REG.mid;
  const sd = 300 + it.i * 17;
  const steps = [T([[-24, 0], [-24, -4], [24, -4], [24, 0]]), T([[-20, -4], [-20, -8], [20, -8], [20, -4]])];
  steps.forEach((st, k) => { flat(ctx, st, k ? '#5c4d36' : '#4a3f2f'); ink(ctx, st, sd + k, reg, { gapP: 0.25 }); });
  const body = T([[-17, -8], [-17, -32], [17, -32], [17, -8]]);
  flat(ctx, body, '#6f4750', { tex: P.spD, ta: 0.25, ax: it.x, ay: it.y });
  const door = T([[-6, -8], [-5, -21], [0, -28], [5, -21], [6, -8]]);
  flat(ctx, door, '#070b0e');
  for (const [cx, k] of [[-13.5, 0], [12.5, 1]]) {
    const col = T([[cx - 2.4, -8], [cx - 1.4, -32], [cx + 1.4, -32], [cx + 2.4, -8]]);
    flat(ctx, col, '#8f6563');
    ink(ctx, col, sd + 4 + k, reg, { gapP: 0.3 });
  }
  ink(ctx, body, sd + 3, reg, { gapP: 0.2 });
  if (it.variant === 1) {
    const slab = T([[-20, -32], [-20, -36], [20, -36], [20, -32]]);
    flat(ctx, slab, '#5c4d36');
    ink(ctx, slab, sd + 8, reg);
    const dome = [];
    for (let k = 0; k <= 10; k++) dome.push([Math.cos(Math.PI + (k / 10) * Math.PI) * 14, -36 + Math.sin(Math.PI + (k / 10) * Math.PI) * 15]);
    const d = T(dome);
    flat(ctx, T(dome.map(([a, b]) => [a - 3, b + 2])), TURQ, { a: 0.35 });
    flat(ctx, d, '#35584f', { tex: P.dryL, ta: 0.1, ax: it.x, ay: it.y });
    ink(ctx, d, sd + 9, reg, { over: 0.4, gapP: 0.08 });
    const [fx, fy] = T([[0, -51]])[0];
    inkLine(ctx, [[fx, fy + 1], [fx, fy - 7 * it.s]], reg, 0.8);
    inkLine(ctx, [[fx - 2.5 * it.s, fy - 4 * it.s], [fx + 2.5 * it.s, fy - 4 * it.s]], reg, 0.8);
  } else {
    // An asymmetric pediment, its apex pushed off centre.
    const ped = T([[-24, -32], [-4, -47], [24, -32]]);
    flat(ctx, ped, '#86693a', { tex: P.dryD, ta: 0.25, ax: it.x, ay: it.y });
    flat(ctx, T([[-4, -47], [24, -32], [4, -32]]), '#0b1c2a', { a: 0.25 });
    ink(ctx, ped, sd + 10, reg, { over: 2.2 });
  }
  ink(ctx, door, sd + 11, reg, { gapP: 0.35 });
  dashes(ctx, T, [[-10, -14, -7.5, -14], [7, -20, 10, -20.2], [-10, -25, -7, -25.2]], reg);
}

function stone(ctx, it) {
  const reg = REG.mid;
  const rot = (hash(it.i * 3.3) - 0.5) * 0.3;
  const T = xf(it.x, it.y + 1, it.s, rot);
  const col = STONES[(it.i + it.variant) % 3];
  let v;
  if (it.variant === 2) {
    v = T([[-3.5, 0], [-2.4, -16], [0, -22], [2.4, -16], [3.5, 0]]);
  } else if (it.variant === 1) {
    v = T([[-5, 0], [-5.5, -12], [-1.5, -12], [0, -15], [1.5, -12], [5, -12.5], [4.5, 0]]);
  } else {
    const p = [[-4.5, 0], [-4.5, -8]];
    for (let k = 1; k < 6; k++) p.push([-Math.cos((k / 6) * Math.PI) * 4.5, -8 - Math.sin((k / 6) * Math.PI) * 5.5]);
    p.push([4.5, -8], [4.5, 0]);
    v = T(p);
  }
  flat(ctx, v, col);
  flat(ctx, v.map(([x, y]) => [x - 1.5, y + 0.5]), '#0b1c2a', { a: 0.18 });
  ink(ctx, v, 500 + it.i * 13, reg, { gapP: 0.15, over: 1 });
}

function cross(ctx, it) {
  const reg = REG.mid;
  const rot = (hash(it.i * 5.1) - 0.5) * 0.2;
  const T = xf(it.x, it.y + 1, it.s, rot);
  const celtic = it.i % 2 === 0;
  // A spot of colour behind, off to one side, then the cross itself.
  flat(ctx, T([[-5, -3], [-7, -12], [-5, -20], [2, -22], [6, -15], [5, -5]]), celtic ? CORAL : MUSTARD, { smooth: true, a: 0.26 });
  const v = T([[-1.6, 0], [-1.6, -11], [-6, -11], [-6, -14.5], [-1.6, -14.5], [-1.6, -20], [1.6, -20], [1.6, -14.5], [6, -14.5], [6, -11], [1.6, -11], [1.6, 0]]);
  flat(ctx, v, STONES[it.i % 3]);
  if (celtic) {
    const [cx, cy] = T([[0, -12.8]])[0];
    inkBlob(ctx, circlePts(cx, cy, 4.2 * it.s, 8), 600 + it.i, reg, { dash: [14, 3, 9, 2], w: 0.8 });
  }
  ink(ctx, v, 620 + it.i * 7, reg, { gapP: 0.2, over: 0.9 });
}

function tree(ctx, it) {
  const reg = REG.mid;
  const pal = LAYER.mid;
  const s = it.s;
  const Lf = it.variant === 1 ? -0.8 : 0.2;
  const P = (dx, dy) => [it.x + dx * s, it.y + 1 + dy * s];
  // The colour card behind: a leaning lollipop disc of coral.
  disc(ctx, it.x + (Lf * 6 - 3) * s, it.y - 38 * s, 17 * s, '#b8675f', 0.5);
  const limbs = [
    limb([P(0, 1), P(Lf * 4, -26), P(Lf * 8, -50)], 5.5 * s, 1),
    limb([P(Lf * 3, -20), P(-12, -32), P(-18, -43)], 2.6 * s, 0.6),
    limb([P(-12, -32), P(-22, -34)], 1.4 * s, 0.4),
    limb([P(Lf * 5, -30), P(13, -40), P(21, -42)], 2.6 * s, 0.6),
    limb([P(13, -40), P(16, -50)], 1.4 * s, 0.4),
    limb([P(Lf * 7, -42), P(-3, -53)], 1.5 * s, 0.4),
  ];
  for (const l of limbs) flat(ctx, l.poly, pal.tree);
  limbs.forEach((l, k) => {
    inkLine(ctx, k ? l.L.slice(1) : l.L, reg, 0.65, 0.8);
    inkLine(ctx, k ? l.R.slice(1) : l.R, reg, 0.65, 0.8);
  });
}

function gnarl(ctx, it) {
  const reg = REG.fg;
  const pal = LAYER.fg;
  const s = it.s;
  const flip = it.variant === 1 ? -1 : 1;
  const P = (dx, dy) => [it.x + dx * s * flip, it.y + 2 + dy * s];
  const limbs = [
    limb([P(0, 2), P(-5, -22), P(3, -44), P(-2, -64), P(1, -86)], 13 * s, 4 * s),
    limb([P(2, -48), P(18, -60), P(34, -60), P(48, -70), P(60, -72), P(66, -65)], 5 * s, 0.3),
    limb([P(44, -67), P(52, -58), P(60, -58), P(65, -63)], 2.4 * s, 0.3),
    limb([P(30, -61), P(34, -78), P(46, -90), P(54, -86)], 2.8 * s, 0.3),
    limb([P(0, -80), P(-12, -98), P(-26, -104), P(-31, -97)], 4 * s, 0.3),
    limb([P(-14, -99), P(-12, -115)], 2 * s, 0.5),
    limb([P(1, -84), P(12, -104), P(28, -112), P(38, -124), P(44, -119)], 4 * s, 0.3),
    limb([P(20, -107), P(28, -100), P(36, -102)], 2 * s, 0.5),
    limb([P(-2, -36), P(-16, -46), P(-26, -44), P(-29, -38)], 3.4 * s, 0.3),
    limb([P(-6, 1), P(-17, 3)], 4 * s, 1),
    limb([P(6, 1), P(16, 3)], 4 * s, 1),
  ];
  // The colour plate, slipped right and up of the black silhouette.
  const slip = (v) => v.map(([x, y]) => [x + 3.2 * flip, y - 2.4]);
  for (const l of limbs) flat(ctx, slip(l.poly), pal.blob);
  for (const l of limbs) flat(ctx, l.poly, pal.tree);
  // A loose line along the lit side of the trunk and the big boughs.
  limbs.slice(0, 5).forEach((l) => inkLine(ctx, l.R, [reg[0] * flip * 1.4, reg[1] * 1.4], 0.6, 0.5));
}

function fence(ctx, it, L) {
  const reg = REG.fg;
  const gateHalf = 15;
  const bars = [];
  for (let x = it.x0; x <= it.x1; x += 7) {
    if (it.gate != null && Math.abs(x - it.gate) < gateHalf + 2) continue;
    bars.push(x);
  }
  const runs = it.gate == null ? [[it.x0, it.x1]] : [[it.x0, it.gate - gateHalf], [it.gate + gateHalf, it.x1]];
  // A flat translucent colour band behind the railing, a step off its rails.
  for (const [a, b] of runs) {
    const band = [];
    for (let x = a; x <= b; x += 6) band.push([x + 3, L.ridge(x) - 17]);
    band.push([b + 3, L.ridge(b) - 17]);
    for (let x = b; x >= a; x -= 6) band.push([x + 3, L.ridge(x) - 6]);
    flat(ctx, band, pal2('fence'), { a: 0.3 });
  }
  ctx.beginPath();
  for (const x of bars) {
    const b = L.ridge(x);
    const lean = (hash(x * 0.37 + it.i) - 0.5) * 1.2;
    ctx.moveTo(x, b + 1);
    ctx.lineTo(x + lean, b - 20);
  }
  for (const [a, b] of runs) {
    for (const h of [5, 16]) {
      const dy = (hash(a + h) - 0.5) * 1.2;
      for (let x = a - 1; x <= b + 1; x += 4) {
        const y = L.ridge(x) - h + dy;
        if (x === a - 1) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    }
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.beginPath();
  for (const x of bars) {
    const b = L.ridge(x);
    const lean = (hash(x * 0.37 + it.i) - 0.5) * 1.2;
    const tx = x + lean;
    ctx.moveTo(tx, b - 25);
    ctx.lineTo(tx + 1.8, b - 21);
    ctx.lineTo(tx, b - 19.5);
    ctx.lineTo(tx - 1.8, b - 21);
    ctx.closePath();
  }
  ctx.fillStyle = INK;
  ctx.fill();
  if (it.gate != null) {
    const g = it.gate;
    const b = L.foot(g, gateHalf);
    // The gate's arch as a flat colour card, then its drawing a step off it.
    const arch = [[g - gateHalf, b], [g - gateHalf, b - 26]];
    for (let k = 1; k < 8; k++) arch.push([g - gateHalf + (k / 8) * gateHalf * 2, b - 26 - Math.sin((k / 8) * Math.PI) * 13]);
    arch.push([g + gateHalf, b - 26], [g + gateHalf, b]);
    flat(ctx, arch.map(([x, y]) => [x - reg[0] - 1, y - reg[1]]), pal2('gate'), { a: 0.35 });
    ctx.beginPath();
    ctx.moveTo(g - gateHalf, b + 1);
    ctx.lineTo(g - gateHalf + 0.6, b - 33);
    ctx.moveTo(g + gateHalf, b + 1);
    ctx.lineTo(g + gateHalf - 0.4, b - 33);
    ctx.lineWidth = 2;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(g - gateHalf, b - 25);
    ctx.quadraticCurveTo(g + 2, b - 42, g + gateHalf + 1, b - 26);
    for (let x = g - gateHalf + 5; x < g + gateHalf - 2; x += 5) {
      ctx.moveTo(x, b);
      ctx.lineTo(x + 0.3, b - 26 - 6 * Math.cos(((x - g) / gateHalf) * 1.4));
    }
    ctx.moveTo(g - gateHalf - 1, b - 12);
    ctx.lineTo(g + gateHalf + 1, b - 12.5);
    ctx.lineWidth = 0.9;
    ctx.stroke();
    // Finials: little atomic bursts.
    for (const x of [g - gateHalf + 0.6, g + gateHalf - 0.4]) {
      disc(ctx, x, b - 35, 1.7, INK);
      burst(ctx, x, b - 35, 3.4, 0.4, INK);
    }
  }
}

function pal2(what) {
  return what === 'gate' ? '#3f6a61' : '#2e4c44';
}

function lamp(ctx, it, t) {
  const reg = REG.fg;
  const s = it.s;
  const x = it.x;
  const y = it.y + 1;
  const flk = 0.86 + 0.14 * Math.sin(t * 11 + it.i) * Math.sin(t * 7.3);
  const hx = x;
  const hy = y - 40 * s;
  // Glow as stacked flat discs, not a gradient.
  disc(ctx, hx + 1, hy + 1, 27 * s, MUSTARD, 0.06 * flk);
  disc(ctx, hx - 1, hy, 18 * s, MUSTARD, 0.08 * flk);
  disc(ctx, hx + 0.5, hy - 1, 10 * s, '#f2c75a', 0.13 * flk);
  // Atomic rays.
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * TAU + 0.2;
    const r0 = 8 * s;
    const r1 = (k % 2 ? 12 : 16) * s * (0.9 + 0.1 * flk);
    ctx.moveTo(hx + Math.cos(a) * r0, hy + Math.sin(a) * r0);
    ctx.lineTo(hx + Math.cos(a) * r1, hy + Math.sin(a) * r1);
  }
  ctx.strokeStyle = '#f2c75a';
  ctx.globalAlpha = 0.5 * flk;
  ctx.lineWidth = 0.7;
  ctx.stroke();
  ctx.globalAlpha = 1;
  const T = xf(x, y, s);
  const post = T([[-2, 0], [-0.9, -35], [0.9, -35], [2, 0]]);
  flat(ctx, post, '#0a1113');
  const foot = T([[-4.5, 0.5], [-3, -3], [3, -3], [4.5, 0.5]]);
  flat(ctx, foot, '#0a1113');
  const head = T([[-4.8, -35.5], [-3.6, -45], [3.6, -45], [4.8, -35.5]]);
  flat(ctx, head.map(([a, b]) => [a - 1, b + 0.8]), '#f6d271');
  flat(ctx, T([[-1.2, -36], [-0.8, -44], [0.8, -44], [1.2, -36]]), '#fff1c0', { a: 0.8 });
  const cap = T([[-6.5, -45], [0, -51], [6.5, -45]]);
  flat(ctx, cap, '#0a1113');
  disc(ctx, x, y - 52 * s, 1.3 * s, '#0a1113');
  ink(ctx, head, 700 + it.i, reg, { w: 0.7, gapP: 0.1 });
  ink(ctx, post, 710 + it.i, [reg[0] * 0.6, reg[1] * 0.6], { w: 0.5, a: 0.5, gapP: 0.3 });
}

function grass(ctx, it) {
  const reg = REG.fg;
  const s = it.s;
  const tips = [];
  for (let k = 0; k < 7; k++) {
    const dx = (k - 3) * 2.3 * s;
    const h = (7 + hash(it.i * 13 + k) * 6) * s;
    const bend = (hash(it.i + k * 5) - 0.4) * 5 * s;
    tips.push([it.x + dx * 1.3 + bend, it.y + 1 - h]);
  }
  // A fan of flat olive under the spikes, slipped left.
  flat(ctx, [[it.x - 7 * s, it.y + 2], ...tips.map(([a, b]) => [a - 2, b + 3]), [it.x + 7 * s, it.y + 2]], '#26372d', { a: 0.9 });
  ctx.beginPath();
  tips.forEach(([tx, ty], k) => {
    const bx = it.x + (k - 3) * 1.2 * s + reg[0];
    ctx.moveTo(bx, it.y + 2 + reg[1]);
    ctx.lineTo(tx + reg[0], ty + reg[1]);
  });
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.7;
  ctx.globalAlpha = 0.9;
  ctx.stroke();
  ctx.globalAlpha = 1;
  // One seed head, a dry thistle burst.
  if (s >= 0.9) {
    const [tx, ty] = tips[2 + (it.i % 3)];
    burst(ctx, tx + reg[0], ty + reg[1] - 1, 2.4, it.i, '#6b5a3a');
  }
}

// Fog as stacked flat rounded bars.
function fogBand(ctx, band, front) {
  ctx.beginPath();
  for (const p of band.puffs) pathPill(ctx, p.x, p.y, p.rx * 2, p.ry * 1.3);
  ctx.fillStyle = TURQ_LT;
  ctx.globalAlpha = front ? 0.1 : 0.13;
  ctx.fill();
  ctx.beginPath();
  for (const p of band.puffs) {
    const w = p.rx * (1.1 + ((p.i * 5) % 3) * 0.15);
    pathPill(ctx, p.x + p.rx * 0.35 - (p.i % 2) * p.rx * 0.6, p.y - p.ry * 0.95, w, p.ry * 0.8);
  }
  ctx.fillStyle = CREAM;
  ctx.globalAlpha = front ? 0.06 : 0.08;
  ctx.fill();
  ctx.globalAlpha = 1;
}

function layer(ctx, f, name, P) {
  const L = f.layers[name];
  for (const it of L.items) if (it.kind === 'abbey') abbey(ctx, it, P);
  ridge(ctx, L, name, P);
  for (const it of L.items) {
    if (it.kind === 'grove') grove(ctx, it);
    else if (it.kind === 'mausoleum') mausoleum(ctx, it, P);
    else if (it.kind === 'tree') tree(ctx, it);
    else if (it.kind === 'stone') stone(ctx, it);
    else if (it.kind === 'cross') cross(ctx, it);
    else if (it.kind === 'gnarl') gnarl(ctx, it);
    else if (it.kind === 'fence') fence(ctx, it, L);
    else if (it.kind === 'lamp') lamp(ctx, it, f.t);
    else if (it.kind === 'grass') grass(ctx, it);
  }
}

export const STYLE = {
  id: 'midcentury',
  name: 'MID-CENTURY MODERN',
  note: 'A 1958 Halloween cartoon in the UPA / Mary Blair manner: flat kidney, triangle and lollipop shapes in '
    + 'teal, coral, mustard and olive, with a thin loose ink line printed out of register over them, dry-brush in the fields.',
  paint(ctx, f) {
    const P = pats(ctx);
    sky(ctx, f, P);
    layer(ctx, f, 'bg', P);
    layer(ctx, f, 'mid', P);
    fogBand(ctx, f.fog[0], false);
    layer(ctx, f, 'fg', P);
    fogBand(ctx, f.fog[1], true);
  },
};
