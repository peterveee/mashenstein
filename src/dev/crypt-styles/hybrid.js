// CRYPT style bake-off — HYBRID VECTOR (Peter's own brief, adapted from SVG to canvas).
//
// One screen-print in four inks and nothing else: navy key, crimson, cream, ochre. Tints
// are those inks at a density over the navy, or a halftone of them; there is no fifth hue
// and no soft gradient anywhere. The brief's five ingredients, and where each one lives:
//   voxel + blueprint  — the ridges step into block terraces (lit top face, dark side
//                        face), the abbey, tombs, stones and crosses are extruded block
//                        builds; cream hairline edges, hatching and dimension markers
//                        sit over them like a drafting sheet.
//   mid-century        — kidney clouds, boomerang bats, starburst stars, trees built from
//                        exaggerated triangles, each with a semi-transparent offset twin.
//   constructivism/pop — hard rays fanning out of the moon; halftone dots do the glow,
//                        the moon's shading and the drop shadows.
//   cutout + riso      — the near bank is razor navy silhouettes; the crimson plate slips
//                        a couple of px off the navy key on selected shapes.
// The four parallax groups are the four painters below: paintSky, paintBg, paintMid,
// paintFg, with the plan's two fog bands between mid/fg and in front of fg.
//
// The strip just above the lane (y ~195..232) is kept low-contrast: the mid terrace there
// is a dark navy tint, its grid fades out, fog is a flat thin cream, and the headstones
// are dark slate so none can be read as the lane's grey tombstone.

const NAVY = '#0F172A';
const CRIMSON = '#E11D48';
const CREAM = '#F8FAFC';
const OCHRE = '#D97706';
const RGB = { n: [15, 23, 42], r: [225, 29, 72], c: [248, 250, 252], o: [217, 119, 6] };
const TAU = Math.PI * 2;

// The crimson plate's misregistration against the navy key: it slips up and to the left.
const MIS = { x: -1.5, y: -1.1 };
// Below this line the full-strength crimson plate stays off the near bank.
const PLATE_FLOOR = 206;

function ink(key, a = 1) {
  const [r, g, b] = RGB[key];
  return `rgba(${r},${g},${b},${a})`;
}

// Ink `key` printed at density `a` over the navy: a flat tint, still one of the four inks.
function tint(a, key = 'c') {
  const p = RGB.n;
  const q = RGB[key];
  const m = (i) => Math.round(p[i] + (q[i] - p[i]) * a);
  return `rgb(${m(0)},${m(1)},${m(2)})`;
}

function hash(i) {
  const x = Math.sin(i * 127.1 + 74.7) * 43758.5453;
  return x - Math.floor(x);
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// ------------------------------------------------------------------ plates & screens
function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// Cached screens are rendered at the device scale so the dots stay crisp when blitted.
function deviceScale(ctx) {
  if (typeof ctx.getTransform !== 'function') return 1;
  const m = ctx.getTransform();
  return Math.max(1, Math.min(4, Math.round(Math.hypot(m.a, m.b))));
}

const patterns = new Map();
function pattern(ctx, key, cell, draw) {
  const k = deviceScale(ctx);
  const id = `${key}@${k}`;
  let p = patterns.get(id);
  if (!p) {
    const c = makeCanvas(Math.round(cell * k), Math.round(cell * k));
    const g = c.getContext('2d');
    g.scale(k, k);
    draw(g, cell);
    p = ctx.createPattern(c, 'repeat');
    if (k !== 1 && p.setTransform && typeof DOMMatrix !== 'undefined') {
      p.setTransform(new DOMMatrix([1 / k, 0, 0, 1 / k, 0, 0]));
    }
    patterns.set(id, p);
  }
  return p;
}

// A 45-degree halftone screen: one dot per cell centre and corner.
function dots(ctx, key, a, cell, r) {
  return pattern(ctx, `dots:${key}:${a}:${cell}:${r}`, cell, (g, s) => {
    g.fillStyle = ink(key, a);
    g.beginPath();
    for (const [x, y] of [[0, 0], [s, 0], [0, s], [s, s], [s / 2, s / 2]]) {
      g.moveTo(x + r, y);
      g.arc(x, y, r, 0, TAU);
    }
    g.fill();
  });
}

// Blueprint hatching: hairline diagonals.
function hatch(ctx, key, a, cell, w) {
  return pattern(ctx, `hatch:${key}:${a}:${cell}:${w}`, cell, (g, s) => {
    g.strokeStyle = ink(key, a);
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(-1, 1); g.lineTo(1, -1);
    g.moveTo(0, s); g.lineTo(s, 0);
    g.moveTo(s - 1, s + 1); g.lineTo(s + 1, s - 1);
    g.stroke();
  });
}

// ------------------------------------------------------------------ shape kit
// Every silhouette is wound clockwise on screen, so overlapping pieces added to one
// Path2D union cleanly under the nonzero rule.
function poly(p, pts) {
  let area = 0;
  const n = pts.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += pts[2 * i] * pts[2 * j + 1] - pts[2 * j] * pts[2 * i + 1];
  }
  const order = [];
  for (let i = 0; i < n; i++) order.push(area >= 0 ? i : n - 1 - i);
  p.moveTo(pts[2 * order[0]], pts[2 * order[0] + 1]);
  for (let k = 1; k < n; k++) p.lineTo(pts[2 * order[k]], pts[2 * order[k] + 1]);
  p.closePath();
}

function polyPath(pts) {
  const p = new Path2D();
  poly(p, pts);
  return p;
}

// A tapered limb: a polyline whose width runs from w0 to w1 (0 = a razor point).
function limb(p, pts, w0, w1 = 0) {
  const n = pts.length / 2;
  const L = [];
  const R = [];
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1);
    const b = Math.min(n - 1, i + 1);
    let tx = pts[2 * b] - pts[2 * a];
    let ty = pts[2 * b + 1] - pts[2 * a + 1];
    const l = Math.hypot(tx, ty) || 1;
    tx /= l;
    ty /= l;
    const w = (w0 + (w1 - w0) * (i / (n - 1))) / 2;
    const x = pts[2 * i];
    const y = pts[2 * i + 1];
    L.push(x - ty * w, y + tx * w);
    R.push(x + ty * w, y - tx * w);
  }
  const out = [];
  for (let i = 0; i < n; i++) out.push(L[2 * i], L[2 * i + 1]);
  for (let i = n - 1; i >= 0; i--) out.push(R[2 * i], R[2 * i + 1]);
  poly(p, out);
}

// An exaggerated-triangle spike from a base point, `ang` radians off vertical.
function spike(p, x, y, ang, len, w) {
  const dx = Math.sin(ang);
  const dy = -Math.cos(ang);
  poly(p, [x + dy * w / 2, y - dx * w / 2, x + dx * len, y + dy * len, x - dy * w / 2, y + dx * w / 2]);
}

// A retro starburst: n sharp points alternating long and short.
function starburst(p, x, y, n, R, r, rot = 0, jag = 0) {
  const pts = [];
  for (let k = 0; k < n * 2; k++) {
    const a = rot + (k / (n * 2)) * TAU;
    const rr = k % 2 === 0 ? R * (k % 4 === 0 ? 1 : 1 - jag) : r;
    pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  poly(p, pts);
}

// An asymmetric bean: a fat end, a notch in the top, a tapering tail.
function kidney(p, x, y, w, h, flip = false) {
  const X = (u) => (flip ? x + w - u * w : x + u * w);
  const Y = (v) => y + v * h;
  const pts = [
    [0.1, 0.95],
    [-0.04, 0.9, 0.0, 0.2, 0.18, 0.22],
    [0.32, 0.24, 0.4, 0.5, 0.54, 0.38],
    [0.68, -0.2, 1.04, -0.05, 1.0, 0.55],
    [0.98, 1.02, 0.78, 1.0, 0.6, 0.96],
    [0.42, 0.92, 0.26, 1.02, 0.1, 0.95],
  ];
  if (!flip) {
    p.moveTo(X(pts[0][0]), Y(pts[0][1]));
    for (let k = 1; k < pts.length; k++) {
      const c = pts[k];
      p.bezierCurveTo(X(c[0]), Y(c[1]), X(c[2]), Y(c[3]), X(c[4]), Y(c[5]));
    }
  } else {
    // Mirrored, so walk it backwards to stay clockwise.
    p.moveTo(X(pts[0][0]), Y(pts[0][1]));
    for (let k = pts.length - 1; k >= 1; k--) {
      const c = pts[k];
      const prev = k === 1 ? pts[0] : pts[k - 1];
      const end = prev.length === 2 ? prev : [prev[4], prev[5]];
      p.bezierCurveTo(X(c[2]), Y(c[3]), X(c[0]), Y(c[1]), X(end[0]), Y(end[1]));
    }
  }
  p.closePath();
}

// A voxel part: a front polygon (clockwise: up the left, across the top, down the right)
// extruded back along (dx, dy). Faces turned up take the top ink, faces turned right
// the side ink; the front goes on last with its hatching and a crisp hairline edge.
function extrude(ctx, pts, dx, dy, pal, fill = null) {
  const n = pts.length / 2;
  const tops = new Path2D();
  const sides = new Path2D();
  for (let i = 0; i < n; i++) {
    const ax = pts[2 * i];
    const ay = pts[2 * i + 1];
    const bx = pts[(2 * i + 2) % (2 * n)];
    const by = pts[(2 * i + 3) % (2 * n)];
    const nx = by - ay;
    const ny = -(bx - ax);
    if (nx * dx + ny * dy <= 1e-6) continue;
    const q = Math.abs(ny) >= Math.abs(nx) ? tops : sides;
    q.moveTo(ax, ay);
    q.lineTo(bx, by);
    q.lineTo(bx + dx, by + dy);
    q.lineTo(ax + dx, ay + dy);
    q.closePath();
  }
  ctx.fillStyle = pal.side;
  ctx.fill(sides);
  ctx.fillStyle = pal.top;
  ctx.fill(tops);
  const front = polyPath(pts);
  ctx.fillStyle = pal.front;
  ctx.fill(front);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill(front);
  }
  if (pal.edge) {
    ctx.lineJoin = 'miter';
    ctx.strokeStyle = pal.edge;
    ctx.lineWidth = pal.lw ?? 0.5;
    ctx.stroke(front);
    if (pal.backEdge) {
      ctx.strokeStyle = pal.backEdge;
      ctx.stroke(tops);
    }
  }
  return front;
}

// A stepped pointed arch opening (voxel lancet), base centre (x, y).
function lancet(p, x, y, w, h) {
  const body = h * 0.66;
  p.rect(x - w / 2, y - body, w, body);
  const tiers = [0.72, 0.46, 0.2];
  const th = (h - body) / tiers.length;
  tiers.forEach((k, i) => p.rect(x - (w * k) / 2, y - body - th * (i + 1), w * k, th + 0.01));
}

// 3x5 drafting numerals for the dimension markers, one square per bit.
const GLYPH = {
  0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111',
  4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001001001001',
  8: '111101111101111', 9: '111101111001111',
};
function numerals(ctx, text, cx, cy, px) {
  let x = cx - (text.length * 4 * px - px) / 2;
  const y = cy - 2.5 * px;
  ctx.beginPath();
  for (const ch of text) {
    const g = GLYPH[ch];
    for (let i = 0; i < 15; i++) if (g[i] === '1') ctx.rect(x + (i % 3) * px, y + Math.floor(i / 3) * px, px, px);
    x += 4 * px;
  }
  ctx.fill();
}

function dimension(ctx, x0, y0, x1, y1, text, a) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const ux = (x1 - x0) / len;
  const uy = (y1 - y0) / len;
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const gap = text.length * 1.6 + 2;
  ctx.strokeStyle = ink('c', a);
  ctx.fillStyle = ink('c', a);
  ctx.lineWidth = 0.45;
  ctx.beginPath();
  ctx.moveTo(x0, y0); ctx.lineTo(mx - ux * gap, my - uy * gap);
  ctx.moveTo(mx + ux * gap, my + uy * gap); ctx.lineTo(x1, y1);
  for (const [x, y] of [[x0, y0], [x1, y1]]) {
    ctx.moveTo(x - uy * 3, y + ux * 3);
    ctx.lineTo(x + uy * 3, y - ux * 3);
  }
  ctx.stroke();
  ctx.beginPath();
  for (const [x, y, d] of [[x0, y0, 1], [x1, y1, -1]]) {
    ctx.moveTo(x, y);
    ctx.lineTo(x + ux * 3 * d - uy * 1.1, y + uy * 3 * d + ux * 1.1);
    ctx.lineTo(x + ux * 3 * d + uy * 1.1, y + uy * 3 * d - ux * 1.1);
    ctx.closePath();
  }
  ctx.fill();
  numerals(ctx, text, mx, my, 0.6);
}

// Two plates of one silhouette: the crimson slipped off register, then the key.
// `floor` keeps the plate off the strip just above the lane, where it would be noise.
function printed(ctx, path, key, plate = CRIMSON, plateAlpha = 1, floor = Infinity, off = MIS) {
  ctx.save();
  if (floor < Infinity) {
    ctx.beginPath();
    ctx.rect(-100, -200, 720, floor + 200);
    ctx.clip();
  }
  ctx.translate(off.x, off.y);
  ctx.globalAlpha = plateAlpha;
  ctx.fillStyle = plate;
  ctx.fill(path);
  ctx.restore();
  ctx.fillStyle = key;
  ctx.fill(path);
}

// ------------------------------------------------------------------ terraces
// The plan's ridge line stepped into voxel columns: each column is a block whose crest is
// the ridge quantised to `q`; the columns are fixed in layer space, so they scroll.
function terrace(L, B, q, d) {
  const dx = d;
  const dy = -d * 0.6;
  const off = ((L.shift % B) + B) % B;
  const cols = [];
  for (let x = -off - B * 3; x < 520 + B; x += B) {
    cols.push({ x, y: Math.round(L.ridge(x + B / 2) / q) * q });
  }
  const x0 = cols[0].x;
  const at = (x) => cols[Math.max(0, Math.min(cols.length - 1, Math.floor((x - x0) / B)))].y;
  const foot = (x, hw) => {
    let y = Math.max(at(x - hw), at(x + hw));
    for (let xx = x - hw; xx < x + hw; xx += B / 2) y = Math.max(y, at(xx));
    return y;
  };
  // Stand a thing mid-way back on the column's top face.
  const stand = (x, hw) => foot(x, hw) + dy * 0.5;
  return { cols, B, q, dx, dy, at, foot, stand };
}

function drawTerrace(ctx, T, pal) {
  const { cols, B, dx, dy } = T;
  if (dx > 0) {
    const tops = new Path2D();
    const sides = new Path2D();
    for (let i = 0; i < cols.length; i++) {
      const c = cols[i];
      tops.moveTo(c.x, c.y);
      tops.lineTo(c.x + B, c.y);
      tops.lineTo(c.x + B + dx, c.y + dy);
      tops.lineTo(c.x + dx, c.y + dy);
      tops.closePath();
      const n = cols[i + 1];
      if (n && n.y > c.y) {
        const x = c.x + B;
        sides.moveTo(x, c.y);
        sides.lineTo(x + dx, c.y + dy);
        sides.lineTo(x + dx, n.y + dy);
        sides.lineTo(x, n.y);
        sides.closePath();
      }
    }
    ctx.fillStyle = pal.top;
    ctx.fill(tops);
    ctx.fillStyle = pal.side;
    ctx.fill(sides);
    if (pal.sideDots) {
      ctx.fillStyle = pal.sideDots(ctx);
      ctx.fill(sides);
    }
  }
  const front = new Path2D();
  front.moveTo(cols[0].x, 330);
  for (const c of cols) {
    front.lineTo(c.x, c.y);
    front.lineTo(c.x + B, c.y);
  }
  front.lineTo(cols[cols.length - 1].x + B, 330);
  front.closePath();
  ctx.fillStyle = pal.front;
  ctx.fill(front);
  if (pal.depth) {
    for (const [down, r] of pal.depth) {
      ctx.save();
      ctx.translate(0, down);
      ctx.fillStyle = dots(ctx, 'n', 1, 3, r);
      ctx.fill(front);
      ctx.restore();
    }
  }
  if (pal.grid) {
    // The blueprint sheet: block seams and courses, fading out downhill.
    ctx.save();
    ctx.clip(front);
    ctx.lineWidth = 0.45;
    for (const [y0, y1, a] of pal.grid) {
      ctx.strokeStyle = ink('c', a);
      ctx.beginPath();
      for (const c of cols) {
        ctx.moveTo(c.x, Math.max(c.y, y0));
        ctx.lineTo(c.x, y1);
      }
      const start = Math.ceil(y0 / (T.q * 2)) * T.q * 2;
      for (let y = start; y < y1; y += T.q * 2) {
        ctx.moveTo(-40, y);
        ctx.lineTo(520, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  if (pal.edge) {
    ctx.beginPath();
    for (let i = 0; i < cols.length; i++) {
      const c = cols[i];
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(c.x + B, c.y);
      const n = cols[i + 1];
      if (n) ctx.lineTo(c.x + B, n.y);
    }
    ctx.strokeStyle = pal.edge;
    ctx.lineWidth = 0.55;
    ctx.stroke();
  }
  return front;
}

// ================================================================== SKY
let skyCache = null;

function paintSkyPlate(g, m) {
  g.fillStyle = NAVY;
  g.fillRect(-40, -80, 560, 430);

  // Constructivist rays: hard-edged wedges fanning out of the moon, deliberately uneven.
  let a = -0.35;
  for (let i = 0; a < TAU - 0.35; i++) {
    const w = 0.025 + hash(i * 3.1 + 0.4) * 0.15;
    const gap = 0.06 + hash(i * 7.7 + 1.2) * 0.2;
    const cream = hash(i * 5.3 + 2.9) > 0.72;
    const thin = w < 0.05;
    g.fillStyle = cream ? ink('c', thin ? 0.1 : 0.045) : ink('r', thin ? 0.3 : 0.12);
    g.beginPath();
    g.moveTo(m.x, m.y);
    g.lineTo(m.x + Math.cos(a) * 900, m.y + Math.sin(a) * 900);
    g.lineTo(m.x + Math.cos(a + w) * 900, m.y + Math.sin(a + w) * 900);
    g.closePath();
    g.fill();
    a += w + gap;
  }
  // A few hard hairline rays cutting across, the constructivist diagonals.
  g.lineWidth = 0.6;
  for (const [ang, key, al] of [[2.62, 'c', 0.32], [2.93, 'r', 0.7], [3.3, 'c', 0.22], [3.62, 'r', 0.5], [1.9, 'c', 0.2]]) {
    g.strokeStyle = ink(key, al);
    g.beginPath();
    g.moveTo(m.x + Math.cos(ang) * (m.r + 12), m.y + Math.sin(ang) * (m.r + 12));
    g.lineTo(m.x + Math.cos(ang) * 900, m.y + Math.sin(ang) * 900);
    g.stroke();
  }

  // Halftone horizon glow in crimson, and a cream halftone halo round the moon.
  const sp = 5;
  g.beginPath();
  for (let j = 0; ; j++) {
    const y = 80 + (j * sp) / 2;
    if (y > 250) break;
    const t = clamp01((y - 96) / 100);
    const r = 1.55 * Math.pow(t, 1.3);
    if (r < 0.14) continue;
    for (let x = -40 + ((j % 2) * sp) / 2; x < 520; x += sp) {
      g.moveTo(x + r, y);
      g.arc(x, y, r, 0, TAU);
    }
  }
  g.fillStyle = ink('r', 0.72);
  g.fill();
  g.beginPath();
  for (let j = 0; ; j++) {
    const y = m.y - 110 + (j * sp) / 2;
    if (y > m.y + 110) break;
    for (let x = m.x - 110 + ((j % 2) * sp) / 2; x < m.x + 110; x += sp) {
      const d = Math.hypot(x - m.x, y - m.y);
      const t = 1 - (d - m.r - 3) / 70;
      if (t <= 0 || d < m.r) continue;
      const r = 1.3 * Math.pow(clamp01(t), 1.4);
      if (r < 0.14) continue;
      g.moveTo(x + r, y);
      g.arc(x, y, r, 0, TAU);
    }
  }
  g.fillStyle = ink('c', 0.5);
  g.fill();

  // The moon: the crimson plate off register behind a cream disc.
  g.fillStyle = CRIMSON;
  g.beginPath();
  g.arc(m.x + MIS.x * 1.6, m.y + MIS.y * 1.6, m.r, 0, TAU);
  g.fill();
  g.fillStyle = CREAM;
  g.beginPath();
  g.arc(m.x, m.y, m.r, 0, TAU);
  g.fill();
  g.save();
  g.beginPath();
  g.arc(m.x, m.y, m.r, 0, TAU);
  g.clip();
  const maria = new Path2D();
  kidney(maria, m.x - 15, m.y - 13, 17, 9);
  kidney(maria, m.x + 1, m.y + 2, 14, 8, true);
  kidney(maria, m.x - 6, m.y + 10, 8, 5);
  g.fillStyle = ink('n', 0.12);
  g.fill(maria);
  // Halftone terminator, heavier toward the lower left.
  g.beginPath();
  const s2 = 3;
  for (let j = 0; ; j++) {
    const y = m.y - m.r + (j * s2) / 2;
    if (y > m.y + m.r) break;
    for (let x = m.x - m.r + ((j % 2) * s2) / 2; x <= m.x + m.r; x += s2) {
      const proj = ((m.x - x) * 0.6 + (y - m.y) * 0.8) / m.r;
      const r = 1.15 * clamp01((proj - 0.05) / 0.95);
      if (r < 0.12) continue;
      g.moveTo(x + r, y);
      g.arc(x, y, r, 0, TAU);
    }
  }
  g.fillStyle = ink('n', 0.8);
  g.fill();
  g.restore();
  // Broken orbit rings, the mid-century accent.
  g.lineWidth = 0.6;
  g.strokeStyle = ink('c', 0.6);
  g.beginPath();
  g.arc(m.x, m.y, m.r + 6, -2.75, 0.85);
  g.stroke();
  g.strokeStyle = ink('r', 0.9);
  g.lineWidth = 1.1;
  g.beginPath();
  g.arc(m.x, m.y, m.r + 9.5, 1.25, 2.35);
  g.stroke();
}

function skyPlate(ctx, f) {
  const k = deviceScale(ctx);
  if (skyCache && skyCache.k === k) return skyCache.canvas;
  const c = makeCanvas(560 * k, 430 * k);
  const g = c.getContext('2d');
  g.setTransform(k, 0, 0, k, 40 * k, 80 * k);
  paintSkyPlate(g, f.moon);
  skyCache = { k, canvas: c };
  return c;
}

function star(ctx, s, i) {
  const a = s.twinkle;
  const p = new Path2D();
  if (s.s < 1.15) {
    const r = (0.55 + s.s * 0.75) * (0.8 + 0.2 * a);
    poly(p, [s.x, s.y - r, s.x + r * 0.6, s.y, s.x, s.y + r, s.x - r * 0.6, s.y]);
    ctx.globalAlpha = 0.35 + 0.65 * a;
    ctx.fillStyle = CREAM;
    ctx.fill(p);
    ctx.globalAlpha = 1;
    return;
  }
  // The bigger stars are atomic-age starbursts: four long points, four short.
  const R = s.s * 2.5 * (0.82 + 0.18 * a);
  starburst(p, s.x, s.y, 4, R, R * 0.2, -Math.PI / 2);
  if (s.s > 1.45) starburst(p, s.x, s.y, 4, R * 0.5, R * 0.14, -Math.PI / 4);
  ctx.save();
  ctx.translate(1.4, 1);
  ctx.fillStyle = ink(i % 5 === 0 ? 'o' : 'r', 0.7);
  ctx.fill(p);
  ctx.restore();
  ctx.globalAlpha = 0.45 + 0.55 * a;
  ctx.fillStyle = CREAM;
  ctx.fill(p);
  ctx.globalAlpha = 1;
}

function cloud(ctx, c) {
  const p = new Path2D();
  kidney(p, c.x, c.y - c.h * 0.25, c.w, c.h * 1.5, c.i % 2 === 1);
  // The mid-century offset twin, then the cloud itself, a thin flat cream film.
  ctx.save();
  ctx.translate(5, 3.5);
  ctx.fillStyle = ink('r', 0.32);
  ctx.fill(p);
  ctx.restore();
  ctx.fillStyle = ink('c', 0.16);
  ctx.fill(p);
  ctx.save();
  ctx.clip(p);
  ctx.fillStyle = dots(ctx, 'n', 0.85, 3, 0.7);
  ctx.fillRect(c.x - 4, c.y + c.h * 0.55, c.w + 8, c.h);
  ctx.restore();
  ctx.strokeStyle = ink('c', 0.55);
  ctx.lineWidth = 0.55;
  ctx.stroke(p);
}

function bat(ctx, b) {
  const up = Math.cos(b.flap * TAU);
  const p = new Path2D();
  // A boomerang: two swept blades meeting at a pointed body, ears on top.
  const tipY = -6.5 * up;
  const midY = -1.6 * up;
  p.moveTo(0, -1.4);
  p.lineTo(1.3, -4.4);
  p.lineTo(2.2, -1.2);
  p.quadraticCurveTo(6, -1.8 - 3 * up, 11.5, tipY);
  p.lineTo(8.6, midY + 1.2);
  p.lineTo(6.4, midY + 3.2);
  p.quadraticCurveTo(4, 1.2 - up, 2, 2);
  p.lineTo(0, 4.6);
  p.lineTo(-2, 2);
  p.quadraticCurveTo(-4, 1.2 - up, -6.4, midY + 3.2);
  p.lineTo(-8.6, midY + 1.2);
  p.lineTo(-11.5, tipY);
  p.quadraticCurveTo(-6, -1.8 - 3 * up, -2.2, -1.2);
  p.lineTo(-1.3, -4.4);
  p.closePath();
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.scale(b.s, b.s);
  ctx.save();
  ctx.translate(2.6, 2);
  ctx.fillStyle = ink('c', 0.3);
  ctx.fill(p);
  ctx.restore();
  ctx.fillStyle = CRIMSON;
  ctx.fill(p);
  ctx.restore();
}

function paintSky(ctx, f) {
  ctx.drawImage(skyPlate(ctx, f), -40, -80, 560, 430);
  f.stars.forEach((s, i) => star(ctx, s, i));
  for (const c of f.clouds) cloud(ctx, c);
  for (const b of f.bats) bat(ctx, b);
}

// ================================================================== BG
const BG = {
  front: tint(0.155),
  top: tint(0.4),
  side: tint(0.08),
  edge: ink('c', 0.5),
  grid: [[140, 330, 0.12]],
  sideDots: (ctx) => dots(ctx, 'r', 0.9, 3, 0.6),
  // Halftone depth: the slab darkens downhill in navy dots, two screens deep.
  depth: [[12, 0.55], [26, 0.9]],
};
const ABBEY = { front: tint(0.25), top: tint(0.54), side: tint(0.11), edge: ink('c', 0.62), backEdge: ink('c', 0.35), lw: 0.5 };
const GROVE_INK = tint(0.06);

const NAVE = [-54, 0, -54, -24, -48, -24, -48, -30, -40, -30, -40, -28, -34, -28, -34, -36, -22, -36,
  -22, -34, -16, -34, -16, -40, -8, -40, -8, -38, 2, -38, 2, 0];
const TOWER = [2, 0, 2, -54, 18, -54, 18, 0];
const TRANSEPT = [18, 0, 18, -26, 24, -26, 24, -32, 30, -32, 30, -30, 36, -30, 36, -36, 42, -36, 42, -30,
  46, -30, 46, -24, 50, -24, 50, 0];

function openings(ctx, p) {
  ctx.fillStyle = NAVY;
  ctx.fill(p);
  ctx.fillStyle = dots(ctx, 'r', 0.9, 3, 0.75);
  ctx.fill(p);
}

function abbey(ctx, it, T) {
  const s = it.s;
  const y = T.stand(it.x, 50 * s);
  const dx = 6;
  const dy = -3.6;
  const apexX = 10 + dx / 2;
  const apexY = -86 + dy / 2;
  const spire = [0, -54, apexX, apexY, 20, -54];
  ctx.save();
  ctx.translate(it.x, y);
  ctx.scale(s, s);
  const sil = new Path2D();
  for (const pts of [NAVE, TOWER, TRANSEPT, spire]) poly(sil, pts);
  // Halftone drop shadow, then the crimson plate off register.
  ctx.save();
  ctx.translate(-7, 3.5);
  ctx.fillStyle = dots(ctx, 'n', 1, 2.6, 0.95);
  ctx.fill(sil);
  ctx.restore();
  ctx.save();
  ctx.translate(MIS.x * 1.3, MIS.y * 1.3);
  ctx.fillStyle = CRIMSON;
  ctx.fill(sil);
  ctx.restore();

  const hat = hatch(ctx, 'c', 0.16, 3, 0.4);
  extrude(ctx, NAVE, dx, dy, ABBEY, hat);
  const win = new Path2D();
  for (const x of [-42, -27, -12]) lancet(win, x, -6, 8, 20);
  openings(ctx, win);
  // Tower, then its pyramid spire: a front face and a shaded right face to one apex.
  extrude(ctx, TOWER, dx, dy, ABBEY, hat);
  ctx.fillStyle = ABBEY.side;
  ctx.fill(polyPath([20, -54, apexX, apexY, 20 + dx, -54 + dy]));
  ctx.fillStyle = dots(ctx, 'r', 0.9, 3, 0.6);
  ctx.fill(polyPath([20, -54, apexX, apexY, 20 + dx, -54 + dy]));
  const sp = polyPath(spire);
  ctx.fillStyle = ABBEY.front;
  ctx.fill(sp);
  ctx.fillStyle = hat;
  ctx.fill(sp);
  ctx.strokeStyle = ABBEY.edge;
  ctx.lineWidth = 0.5;
  ctx.stroke(sp);
  const tw = new Path2D();
  lancet(tw, 10, -30, 5, 12);
  openings(ctx, tw);
  extrude(ctx, TRANSEPT, dx, dy, ABBEY, hat);
  const rose = new Path2D();
  rose.rect(29.5, -19, 9, 4);
  rose.rect(30.5, -21, 7, 8);
  rose.rect(32, -22, 4, 10);
  openings(ctx, rose);
  // Drafting marks: the spire's height, beside the transept.
  dimension(ctx, 64, 0, 64, -86, '86', 0.5);
  ctx.restore();
}

// A mid-century dead tree, all exaggerated triangles: a wedge trunk and spike branches.
function spikyTree(p, x, y, H, lean, seed) {
  const tx = x + lean * H * 0.28;
  const ty = y - H;
  const bw = H * 0.085;
  poly(p, [x - bw, y + 1, x - bw * 0.2, y - H * 0.5, tx, ty, x + bw * 0.2, y - H * 0.5, x + bw, y + 1]);
  // Root flares.
  spike(p, x - bw * 0.4, y + 0.5, -1.25, H * 0.18, H * 0.06);
  spike(p, x + bw * 0.4, y + 0.5, 1.2, H * 0.16, H * 0.06);
  const B = [
    [0.36, -0.95, 0.46, 0.08],
    [0.5, 0.85, 0.48, 0.075],
    [0.66, -0.55, 0.36, 0.06],
    [0.78, 0.5, 0.3, 0.05],
  ];
  B.forEach(([t, ang, len, w], k) => {
    const a = ang + (hash(seed * 3.7 + k) - 0.5) * 0.35 + lean * 0.3;
    const bx = x + (tx - x) * t;
    const by = y + (ty - y) * t;
    spike(p, bx, by, a, H * len, H * w);
    // A twig off the branch, sharper and more upright.
    const mx = bx + Math.sin(a) * H * len * 0.55;
    const my = by - Math.cos(a) * H * len * 0.55;
    spike(p, mx, my, a * 0.35, H * len * 0.45, H * w * 0.6);
  });
}

function grove(ctx, it, T) {
  const n = 3 + (it.i % 3);
  const p = new Path2D();
  for (let k = 0; k < n; k++) {
    const dx = (k - (n - 1) / 2) * 12 * it.s + (hash(it.i * 7 + k) - 0.5) * 6;
    const H = (20 + hash(it.i * 11 + k) * 14) * it.s;
    const x = it.x + dx;
    spikyTree(p, x, T.stand(x, 2), H, (hash(k + it.i * 2.3) - 0.5) * 0.7, it.i * 10 + k);
  }
  ctx.save();
  ctx.translate(3, -2);
  ctx.fillStyle = ink('r', 0.4);
  ctx.fill(p);
  ctx.restore();
  ctx.fillStyle = GROVE_INK;
  ctx.fill(p);
}

function paintBg(ctx, f) {
  const L = f.layers.bg;
  const T = terrace(L, 12, 6, 5);
  for (const it of L.items) if (it.kind === 'abbey') abbey(ctx, it, T);
  drawTerrace(ctx, T, BG);
  for (const it of L.items) {
    if (it.kind === 'abbey') {
      const y = T.foot(it.x, 50 * it.s) + 11;
      dimension(ctx, it.x - 58 * it.s, y, it.x + 58 * it.s, y, '116', 0.42);
    } else if (it.kind === 'grove') {
      grove(ctx, it, T);
    }
  }
}

// ================================================================== MID
const MID = {
  front: tint(0.075),
  top: tint(0.16),
  side: tint(0.03),
  edge: ink('c', 0.16),
  grid: [[180, 204, 0.08], [204, 330, 0.04]],
};
const TOMB = { front: tint(0.18), top: tint(0.34), side: tint(0.06), edge: ink('c', 0.34), backEdge: ink('c', 0.18), lw: 0.5 };
const PILLAR = { front: tint(0.26), top: tint(0.4), side: tint(0.08), edge: ink('c', 0.34), lw: 0.45 };
const STONE = { front: tint(0.19), top: tint(0.33), side: tint(0.06), edge: NAVY, lw: 0.6 };
const TREE_INK = tint(0.02);

function mausoleum(ctx, it, T) {
  const s = it.s;
  const y = T.stand(it.x, 22 * s);
  const d = 7;
  const dx = d;
  const dy = -d * 0.6;
  // The upper parts stand a little way back from the plinth's front edge.
  const bx = dx * 0.35;
  const by = dy * 0.35;
  const sh = (pts) => pts.map((v, i) => v + (i % 2 === 0 ? bx : by));
  const step1 = [-24, 0, -24, -4, 24, -4, 24, 0];
  const step2 = sh([-20, -4, -20, -8, 20, -8, 20, -4]);
  const body = sh([-18, -8, -18, -32, 18, -32, 18, -8]);
  const ent = sh([-21, -32, -21, -35, 21, -35, 21, -32]);
  const roof = it.variant === 1
    ? [[-14, -35, -14, -39, 14, -39, 14, -35], [-11, -39, -11, -43, 11, -43, 11, -39],
      [-7, -43, -7, -46, 7, -46, 7, -43], [-3, -46, -3, -48, 3, -48, 3, -46]].map(sh)
    : [sh([-22, -35, 0, -46, 22, -35])];
  const rd = { x: dx * 0.65, y: dy * 0.65 };

  ctx.save();
  ctx.translate(it.x, y);
  ctx.scale(s, s);
  const sil = new Path2D();
  for (const pts of [step1, step2, body, ent, ...roof]) poly(sil, pts);
  // Halftone drop shadow thrown left, away from the moon, then the plate.
  ctx.save();
  ctx.translate(-6, 2);
  ctx.fillStyle = dots(ctx, 'n', 1, 2.6, 0.9);
  ctx.fill(sil);
  ctx.restore();
  ctx.save();
  ctx.translate(MIS.x, MIS.y);
  ctx.fillStyle = ink('r', 0.75);
  ctx.fill(sil);
  ctx.restore();

  const hat = hatch(ctx, 'c', 0.13, 3, 0.4);
  extrude(ctx, step1, dx, dy, TOMB);
  extrude(ctx, step2, rd.x, rd.y, TOMB);
  extrude(ctx, body, rd.x, rd.y, TOMB, hat);
  for (const x of [-16, 12]) extrude(ctx, sh([x, -8, x, -31, x + 4, -31, x + 4, -8]), 1.2, -0.7, PILLAR);
  const door = new Path2D();
  lancet(door, bx, -8 + by, 11, 18);
  ctx.fillStyle = NAVY;
  ctx.fill(door);
  extrude(ctx, ent, rd.x, rd.y, PILLAR);
  for (const r of roof) extrude(ctx, r, rd.x, rd.y, TOMB, hat);
  if (it.variant === 1) {
    const fin = new Path2D();
    fin.rect(bx - 0.8, by - 55, 1.6, 7);
    fin.rect(bx - 3, by - 53, 6, 1.6);
    ctx.fillStyle = TOMB.top;
    ctx.fill(fin);
  } else {
    dimension(ctx, -24, -54, 24, -54, '46', 0.4);
  }
  ctx.restore();
}

const STONE_SHAPES = [
  [-4.5, 0, -4.5, -9, -2.5, -12.5, 2.5, -12.5, 4.5, -9, 4.5, 0],
  [-5, 0, -5, -12, -1.5, -12, -1.5, -10.5, 1.5, -10.5, 1.5, -12, 5, -12, 5, 0],
];

function stone(ctx, it, T) {
  const y = T.stand(it.x, 4 * it.s);
  ctx.save();
  ctx.translate(it.x, y + 0.4);
  ctx.rotate((hash(it.i * 3.3) - 0.5) * 0.24);
  ctx.scale(it.s, it.s);
  if (it.variant === 2) {
    extrude(ctx, [-4, 0, -4, -3, 4, -3, 4, 0], 2.6, -1.6, STONE);
    extrude(ctx, [-2.6, -3, -2, -17, 0, -21, 2, -17, 2.6, -3], 2, -1.2, STONE);
  } else {
    extrude(ctx, STONE_SHAPES[it.variant], 3, -1.8, STONE);
    // An engraved line, the only mark on the face.
    ctx.fillStyle = ink('n', 0.7);
    ctx.fillRect(-2.2, -7.5, 4.4, 0.7);
  }
  ctx.restore();
}

function cross(ctx, it, T) {
  const y = T.stand(it.x, 3 * it.s);
  ctx.save();
  ctx.translate(it.x, y + 0.4);
  ctx.rotate((hash(it.i * 5.1) - 0.5) * 0.18);
  ctx.scale(it.s, it.s);
  if (it.i % 2 === 0) {
    // Celtic: a square voxel ring round the crossing.
    for (const pts of [
      [-5, -8.2, -5, -9.6, 5, -9.6, 5, -8.2], [-5, -16, -5, -17.4, 5, -17.4, 5, -16],
      [-5, -8.2, -5, -17.4, -3.6, -17.4, -3.6, -8.2], [3.6, -8.2, 3.6, -17.4, 5, -17.4, 5, -8.2],
    ]) extrude(ctx, pts, 2.2, -1.3, STONE);
  }
  extrude(ctx, [-1.6, 0, -1.6, -11, -6, -11, -6, -14.5, -1.6, -14.5, -1.6, -20, 1.6, -20, 1.6, -14.5,
    6, -14.5, 6, -11, 1.6, -11, 1.6, 0], 2.4, -1.4, STONE);
  ctx.restore();
}

function tree(ctx, it, T) {
  const p = new Path2D();
  spikyTree(p, it.x, T.stand(it.x, 4), 52 * it.s, it.variant === 1 ? -0.8 : 0.15, it.i);
  ctx.save();
  ctx.translate(3.5, -2.5);
  ctx.fillStyle = ink('r', 0.38);
  ctx.fill(p);
  ctx.restore();
  ctx.fillStyle = TREE_INK;
  ctx.fill(p);
}

function paintMid(ctx, f) {
  const L = f.layers.mid;
  const T = terrace(L, 16, 4, 6);
  drawTerrace(ctx, T, MID);
  for (const it of L.items) {
    if (it.kind === 'mausoleum') mausoleum(ctx, it, T);
    else if (it.kind === 'stone') stone(ctx, it, T);
    else if (it.kind === 'cross') cross(ctx, it, T);
    else if (it.kind === 'tree') tree(ctx, it, T);
  }
}

// ================================================================== FG
function gnarl(ctx, it) {
  const s = it.s;
  const flip = it.variant === 1 ? -1 : 1;
  const x = it.x;
  const y = it.y + 2;
  const P = (pts) => pts.map((v, i) => (i % 2 === 0 ? x + v * s * flip : y + v * s));
  const p = new Path2D();
  // Twisted trunk: a zig-zag column narrowing upward, flared at the root.
  limb(p, P([0, 2, -5, -16, -1, -32, 5, -48, 2, -66, -1, -88]), 15 * s, 4.5 * s);
  limb(p, P([-3, 0, -17, 5]), 7 * s);
  limb(p, P([3, 0, 16, 5]), 7 * s);
  limb(p, P([-4, -6, -12, -2]), 4 * s);
  // Claw branches, reaching right, each tapering to a razor point.
  limb(p, P([2, -50, 24, -66, 44, -64, 61, -76]), 8 * s);
  limb(p, P([44, -64, 52, -56, 64, -59]), 3.2 * s);
  limb(p, P([30, -66, 36, -83, 49, -93]), 3.6 * s);
  limb(p, P([0, -80, -14, -100, -28, -104]), 6 * s);
  limb(p, P([-14, -100, -12, -116]), 2.6 * s);
  limb(p, P([1, -84, 14, -104, 30, -112, 40, -126]), 5.5 * s);
  limb(p, P([20, -107, 28, -100, 38, -102]), 2.4 * s);
  limb(p, P([-2, -36, -18, -46, -28, -43]), 4.5 * s);
  // Thorns along the long claws.
  for (const [bx, by, a, l] of [[14, -59, -0.4, 7], [34, -65, 0.5, 6], [52, -69, -0.2, 5], [8, -95, -0.7, 6],
    [24, -109, 0.3, 5], [-8, -91, -0.9, 5], [-12, -41, -0.4, 5]]) {
    const q = P([bx, by]);
    spike(p, q[0], q[1], a * flip, l * s, 2.2 * s);
  }
  printed(ctx, p, NAVY, CRIMSON, 0.9, PLATE_FLOOR);
}

function grass(ctx, it) {
  const s = it.s;
  const by = it.y + 2;
  const p = new Path2D();
  for (let k = 0; k < 7; k++) {
    const dx = (k - 3) * 2.3 * s;
    const h = (7 + hash(it.i * 13 + k) * 7) * s;
    const bend = (hash(it.i + k * 5) - 0.4) * 7 * s;
    poly(p, [it.x + dx - 1.2 * s, by, it.x + dx + bend, by - h, it.x + dx + 1.2 * s, by]);
  }
  if (it.i % 2 === 0) {
    // A thistle: a stalk with a starburst head.
    limb(p, [it.x + 3 * s, by, it.x + 4.5 * s, by - 13 * s], 1.2 * s, 0.8 * s);
    starburst(p, it.x + 4.5 * s, by - 14.5 * s, 6, 3.2 * s, 1.2 * s, -Math.PI / 2);
  }
  printed(ctx, p, NAVY, CRIMSON, 0.25);
}

let glowCache = null;
function lampGlow(ctx) {
  const k = deviceScale(ctx);
  if (glowCache && glowCache.k === k) return glowCache.canvas;
  const R = 30;
  const c = makeCanvas(R * 2 * k, R * 2 * k);
  const g = c.getContext('2d');
  g.scale(k, k);
  g.beginPath();
  const sp = 3.2;
  for (let j = 0; j * sp / 2 <= R * 2; j++) {
    const y = (j * sp) / 2;
    for (let x = ((j % 2) * sp) / 2; x <= R * 2; x += sp) {
      const d = Math.hypot(x - R, y - R);
      const r = 1.25 * clamp01(1 - d / R);
      if (r < 0.12) continue;
      g.moveTo(x + r, y);
      g.arc(x, y, r, 0, TAU);
    }
  }
  g.fillStyle = OCHRE;
  g.fill();
  glowCache = { k, canvas: c };
  return c;
}

function lamp(ctx, it, t) {
  const s = it.s;
  const x = it.x;
  const y = it.y + 2;
  const flicker = 0.86 + 0.14 * Math.sin(t * 11 + it.i) * Math.sin(t * 7.3);
  const cy = y - 40 * s;
  ctx.globalAlpha = 0.75 * flicker;
  ctx.drawImage(lampGlow(ctx), x - 30 * s, cy - 30 * s, 60 * s, 60 * s);
  ctx.globalAlpha = 1;
  const burst = new Path2D();
  starburst(burst, x, cy, 10, 14 * s * (0.94 + 0.06 * flicker), 6.5 * s, t * 0.25, 0.35);
  ctx.fillStyle = ink('o', 0.45 * flicker);
  ctx.fill(burst);
  const p = new Path2D();
  p.rect(x - 1.4 * s, y - 35 * s, 2.8 * s, 35 * s);
  p.rect(x - 3.5 * s, y - 4 * s, 7 * s, 4 * s);
  p.rect(x - 2.4 * s, y - 7 * s, 4.8 * s, 3 * s);
  p.rect(x - 3.5 * s, y - 36.8 * s, 7 * s, 1.8 * s);
  poly(p, [x - 7.5 * s, y - 45 * s, x, y - 55 * s, x + 7.5 * s, y - 45 * s]);
  poly(p, [x - 5 * s, y - 36 * s, x - 5.6 * s, y - 45.5 * s, x + 5.6 * s, y - 45.5 * s, x + 5 * s, y - 36 * s]);
  printed(ctx, p, NAVY, CRIMSON, 0.8, PLATE_FLOOR);
  // The glass: the scene's one warm light.
  const glass = new Path2D();
  poly(glass, [x - 3.8 * s, y - 37 * s, x - 4.3 * s, y - 44.5 * s, x - 0.5 * s, y - 44.5 * s, x - 0.5 * s, y - 37 * s]);
  poly(glass, [x + 0.5 * s, y - 37 * s, x + 0.5 * s, y - 44.5 * s, x + 4.3 * s, y - 44.5 * s, x + 3.8 * s, y - 37 * s]);
  ctx.fillStyle = OCHRE;
  ctx.fill(glass);
  ctx.fillStyle = ink('c', 0.5 * flicker);
  ctx.fillRect(x - 3.4 * s, y - 43.8 * s, 1.2 * s, 5.6 * s);
}

function fence(ctx, it, L) {
  const gateHalf = 15;
  const p = new Path2D();
  for (let x = it.x0; x <= it.x1; x += 7) {
    if (it.gate != null && Math.abs(x - it.gate) < gateHalf + 2) continue;
    const b = L.ridge(x) + 3;
    p.rect(x - 0.8, b - 23, 1.6, 23);
    poly(p, [x - 2.4, b - 22.5, x, b - 30, x + 2.4, b - 22.5]);
  }
  const runs = it.gate == null ? [[it.x0, it.x1]] : [[it.x0, it.gate - gateHalf], [it.gate + gateHalf, it.x1]];
  for (const [a, b] of runs) {
    for (const h of [5, 16]) {
      const pts = [];
      for (let x = a; ; x += 4) {
        const xx = Math.min(x, b);
        pts.push(xx, L.ridge(xx) - h);
        if (xx >= b) break;
      }
      if (pts.length >= 4) limb(p, pts, 1.5, 1.5);
    }
  }
  if (it.gate != null) {
    const g = it.gate;
    const bb = L.foot(g, gateHalf) + 3;
    for (const x of [g - gateHalf, g + gateHalf]) {
      p.rect(x - 2, bb - 37, 4, 37);
      p.rect(x - 3, bb - 39, 6, 2.4);
      poly(p, [x - 2, bb - 39, x, bb - 45, x + 2, bb - 39]);
    }
    // A pointed constructivist arch with a sunburst of bars rising from the latch.
    limb(p, [g - gateHalf, bb - 29, g, bb - 42, g + gateHalf, bb - 29], 1.6, 1.6);
    p.rect(g - gateHalf, bb - 15, gateHalf * 2, 1.4);
    p.rect(g - 0.7, bb - 42, 1.4, 42);
    // Sunburst: bars fanning out of a hub on the middle rail, cut off at the arch or posts.
    const hx = g;
    const hy = bb - 15;
    for (let k = -4; k <= 4; k++) {
      if (k === 0) continue;
      const a = k * 0.3;
      const sx = Math.sin(a);
      const cy = Math.cos(a);
      // Arch: y = bb - 42 + |x - g| * 13 / 15, along the ray (hx + sx t, hy - cy t).
      let t = (hy - (bb - 42)) / (cy + (Math.abs(sx) * 13) / 15);
      if (Math.abs(sx * t) > gateHalf - 1.5) t = (gateHalf - 1.5) / Math.abs(sx);
      limb(p, [hx, hy, hx + sx * t, hy - cy * t], 1.1, 0.7);
    }
    starburst(p, hx, hy, 8, 3.2, 1.6, -Math.PI / 2);
    for (let x = g - gateHalf + 5; x < g + gateHalf - 2; x += 5) {
      if (Math.abs(x - g) < 1) continue;
      p.rect(x - 0.6, bb - 15, 1.2, 15);
      poly(p, [x - 1.8, bb - 14, x, bb - 19, x + 1.8, bb - 14]);
    }
  }
  printed(ctx, p, NAVY, CRIMSON, 0.22);
}

function paintFg(ctx, f) {
  const L = f.layers.fg;
  const T = terrace(L, 24, 3, 0);
  const bank = new Path2D();
  bank.moveTo(T.cols[0].x, 330);
  for (const c of T.cols) {
    bank.lineTo(c.x, c.y + 1);
    bank.lineTo(c.x + T.B, c.y + 1);
  }
  bank.lineTo(T.cols[T.cols.length - 1].x + T.B, 330);
  bank.closePath();
  printed(ctx, bank, NAVY, CRIMSON, 0.22);
  for (const it of L.items) {
    if (it.kind === 'gnarl') gnarl(ctx, it);
    else if (it.kind === 'grass') grass(ctx, it);
    else if (it.kind === 'lamp') lamp(ctx, it, f.t);
    else if (it.kind === 'fence') fence(ctx, it, L);
  }
}

// ================================================================== FOG
function fogBand(ctx, band, a) {
  const p = new Path2D();
  for (const q of band.puffs) kidney(p, q.x - q.rx, q.y - q.ry, q.rx * 2, q.ry * 2);
  ctx.save();
  ctx.translate(8, -2);
  ctx.fillStyle = ink('c', a * 0.5);
  ctx.fill(p);
  ctx.restore();
  ctx.fillStyle = ink('c', a);
  ctx.fill(p);
  ctx.fillStyle = dots(ctx, 'c', 0.22, 4, 0.45);
  ctx.fill(p);
}

export const STYLE = {
  id: 'hybrid',
  name: 'HYBRID VECTOR',
  note: 'A four-ink screen print, navy, crimson, cream and ochre only: voxel block terraces and tombs under '
    + 'blueprint hairlines, mid-century kidney clouds and boomerang bats, constructivist rays and halftone '
    + 'dots off the moon, razor navy cutouts up front with the crimson plate slipped off register.',
  paint(ctx, f) {
    paintSky(ctx, f);
    paintBg(ctx, f);
    paintMid(ctx, f);
    fogBand(ctx, f.fog[0], 0.1);
    paintFg(ctx, f);
    fogBand(ctx, f.fog[1], 0.08);
  },
};
