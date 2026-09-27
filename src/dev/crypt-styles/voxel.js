// CRYPT style bake-off — VOXEL DIORAMA. The graveyard built from shaded cubes, drawn as
// crisp vector geometry: every block shows its front face, a lit top face and (where
// nothing hides it) a right face, in a light oblique projection whose depth axis
// recedes up and to the right. The moon sits upper right, so tops are the lit faces,
// right faces the mid tone and fronts the dark one. Depth is value and fog tint: the
// far ridge sits close to the sky, the near bank is nearly black. The gas lamp is the
// one warm block.
//
// Two builders do all the drawing. Terrain is a height field of columns, one block per
// row, snapped to the layer's own scrolled space so blocks ride with their layer.
// Everything else is a voxel set (cells on a fixed module) compiled once into Path2Ds,
// cached, and blitted as vectors: tops and rights first, then fronts, which is the
// exact painter's order for a one-cell-deep slab in this projection.

const KX = 0.42; // screen px right per px of depth
const KY = 0.5; // screen px up per px of depth
const V = 3; // the prop voxel
const BASE = 232; // terrain rows count up from the lane's top edge
const EDGE_W = 0.55;
const SEAM_W = 0.4;

function hash(a, b = 0, c = 0) {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul((b | 0) + 0x3c6ef372, 0x165667b1) ^ Math.imul((c | 0) + 0x5bd1e995, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// ------------------------------------------------------------------ palettes
// A material is { f: fronts, r: rights, t: tops }; the first entry of each list is the
// base tone, the rest are the odd blocks that make a face read as separate cubes.
const mat = (f, r, t) => ({ f, r, t });
const SKY = ['#0b0922', '#191440', '#2c2456', '#3b2f66'];
const PAL = {
  bg: {
    ground: mat(['#2f275b', '#2c2457', '#322a5f'], ['#3b3270'], ['#52488e', '#4e448a']),
    turf: mat(['#342b62', '#31285e'], ['#3f3676'], ['#574d93', '#53498f']),
    stone: mat(['#3a3068'], ['#493f7e'], ['#62589b', '#5e5497']),
    wood: mat(['#2b2355'], ['#382f68'], ['#4c4386']),
    edge: '#221b46', seam: '#29214f',
  },
  mid: {
    ground: mat(['#1f1840', '#1d163c', '#221a44'], ['#2f2758'], ['#4a4183', '#463d7e']),
    turf: mat(['#261e4a', '#241c47'], ['#342b60'], ['#4f4689', '#4b4285']),
    stone: mat(['#3e3766', '#3c3564'], ['#534b81'], ['#7770aa', '#726ba5']),
    tomb: mat(['#3d3566', '#3b3363'], ['#50487d'], ['#6c65a0', '#68619c']),
    door: mat(['#0a0716'], ['#0a0716'], ['#0a0716']),
    wood: mat(['#1a1434'], ['#2a2250'], ['#453c7b']),
    edge: '#110c25', seam: '#181232',
  },
  fg: {
    ground: mat(['#110c22', '#100b20', '#130e25'], ['#1c1634'], ['#2b244f', '#28214b']),
    turf: mat(['#16112b', '#141029'], ['#201a3a'], ['#342c5b', '#302857']),
    wood: mat(['#0f0b1e'], ['#1b1533'], ['#342c5d']),
    iron: mat(['#0c0918'], ['#1a142f'], ['#352d5e']),
    grass: mat(['#1c1631'], ['#262040'], ['#3f3767']),
    thistle: mat(['#2a1f3e'], ['#35284c'], ['#584673']),
    glow: mat(['#ffcf6a'], ['#f0a64a'], ['#ffeab2']),
    edge: '#05030b', seam: '#0b0817',
  },
};
// Moon tones are picked by facet (lit, mid, shaded), not at random.
const MOON = {
  moon: mat(['#efe4c1', '#fcf5de', '#ddd0a8'], ['#cdbd92'], ['#fff8e2']),
  crater: mat(['#d8caa0', '#e5d8b0', '#c6b78d'], ['#c2b288'], ['#efe3bd']),
};
const CLOUD = { cloud: mat(['#29214f', '#2b2352'], ['#352c61'], ['#4d4386', '#4a4082']) };
const BAT = { bat: mat(['#0b0816'], ['#1a1430'], ['#3a3163']) };
const FOG = { front: '#9a8dcc', top: '#b9afe6', right: '#8679b8' };

// ------------------------------------------------------------------ geometry helpers
function quad(p, x0, y0, x1, y1, x2, y2, x3, y3) {
  p.moveTo(x0, y0); p.lineTo(x1, y1); p.lineTo(x2, y2); p.lineTo(x3, y3); p.closePath();
}
function seg(p, x0, y0, x1, y1) { p.moveTo(x0, y0); p.lineTo(x1, y1); }

// Tones: the base tone for most blocks, the alternates for about a third of them.
function tone(list, u) {
  if (list.length === 1 || u < 0.66) return 0;
  return 1 + Math.min(list.length - 2, Math.floor((u - 0.66) / 0.34 * (list.length - 1)));
}

// Face groups: every face goes into its material's base path; odd-toned faces also go
// into an overlay path drawn after it, so neighbouring tones never leave a hairline.
class Faces {
  constructor() { this.list = []; this.byColour = new Map(); }
  path(colour) {
    let p = this.byColour.get(colour);
    if (!p) { p = new Path2D(); this.byColour.set(colour, p); this.list.push([colour, p]); }
    return p;
  }
  paths(list, u) {
    const base = this.path(list[0]);
    const k = tone(list, u);
    return k ? [base, this.path(list[k])] : [base];
  }
  fill(ctx) { for (const [c, p] of this.list) { ctx.fillStyle = c; ctx.fill(p); } }
}

function strokeP(ctx, colour, w, p) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = w;
  ctx.stroke(p);
}

// ------------------------------------------------------------------ voxel sets
const cellKey = (i, j) => (i + 2048) * 4096 + (j + 2048);
class Vox {
  constructor() { this.m = new Map(); }
  set(i, j, tag = 'a') { this.m.set(cellKey(i, j), [i, j, tag]); return this; }
  fill(i0, i1, j0, j1, tag = 'a') {
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) this.set(i, j, tag);
    return this;
  }
  del(i, j) { this.m.delete(cellKey(i, j)); return this; }
  has(i, j) { return this.m.has(cellKey(i, j)); }
}

// Compile one slab: cells of size v, depth d, set back by z0. Local origin is the bottom
// left corner of cell (0, 0); j counts up. Hidden faces are culled, so for d <= 2v the
// visible tops and rights never overlap each other and only fronts can hide them.
function compileSlab(vox, { v, d, z0 = 0, mats, edge, seam, seams = 'tops', shade = null }) {
  const fSeams = seams === true;
  const tSeams = seams === true || seams === 'tops';
  const dx = d * KX, dy = d * KY, ox = z0 * KX, oy = -z0 * KY;
  const tops = new Faces(), rights = new Faces(), fronts = new Faces();
  const bE = new Path2D(), bS = new Path2D(), fE = new Path2D(), fS = new Path2D();
  const has = (i, j) => vox.has(i, j);
  for (const [i, j, tag] of vox.m.values()) {
    const m = mats[tag];
    const x = i * v + ox, y = -(j + 1) * v + oy;
    const u = shade ? shade(i, j) : hash(i, j, 11);
    const up = has(i, j + 1), rt = has(i + 1, j), lf = has(i - 1, j), dn = has(i, j - 1);
    for (const p of fronts.paths(m.f, u)) p.rect(x, y, v, v);
    if (!lf) seg(fE, x, y, x, y + v); else if (fSeams) seg(fS, x, y, x, y + v);
    if (!dn) seg(fE, x, y + v, x + v, y + v); else if (fSeams) seg(fS, x, y + v, x + v, y + v);
    if (!up) seg(fE, x, y, x + v, y);
    if (!rt) seg(fE, x + v, y, x + v, y + v);
    if (!up) {
      for (const p of tops.paths(m.t, u)) quad(p, x, y, x + v, y, x + v + dx, y - dy, x + dx, y - dy);
      seg(bE, x + dx, y - dy, x + v + dx, y - dy);
      if (!lf || has(i - 1, j + 1)) seg(bE, x, y, x + dx, y - dy);
      else if (tSeams) seg(bS, x, y, x + dx, y - dy);
      if (!rt) seg(bE, x + v, y, x + v + dx, y - dy);
    }
    if (!rt) {
      for (const p of rights.paths(m.r, u)) quad(p, x + v, y, x + v + dx, y - dy, x + v + dx, y + v - dy, x + v, y + v);
      seg(bE, x + v + dx, y - dy, x + v + dx, y + v - dy);
      if (!dn) seg(bE, x + v, y + v, x + v + dx, y + v - dy);
      else if (!has(i + 1, j - 1) && tSeams) seg(bS, x + v, y + v, x + v + dx, y + v - dy);
    }
  }
  return { tops, rights, fronts, bE, bS, fE, fS, edge, seam };
}

function drawSlab(ctx, s) {
  s.tops.fill(ctx);
  s.rights.fill(ctx);
  strokeP(ctx, s.seam, SEAM_W, s.bS);
  strokeP(ctx, s.edge, EDGE_W, s.bE);
  s.fronts.fill(ctx);
  strokeP(ctx, s.seam, SEAM_W, s.fS);
  strokeP(ctx, s.edge, EDGE_W, s.fE);
}

// A sprite is its slabs, back to front, plus any loose boxes drawn after them.
function drawSprite(ctx, spr, x, y, rot = 0, pivot = 0) {
  ctx.save();
  ctx.translate(x + pivot, y);
  if (rot) ctx.rotate(rot);
  ctx.translate(-pivot, 0);
  for (const s of spr.slabs) drawSlab(ctx, s);
  if (spr.boxes) spr.boxes.draw(ctx);
  ctx.restore();
}

const SPRITES = new Map();
function cached(key, build) {
  let s = SPRITES.get(key);
  if (!s) { s = build(); SPRITES.set(key, s); }
  return s;
}

// Free boxes (not on the voxel grid): the spire's stacked cubes, fence bars and rails.
// Drawn tops, rights, then fronts, which is right for boxes that do not interpenetrate.
class Boxes {
  constructor(m, edge) {
    this.m = m; this.edge = edge;
    this.t = new Path2D(); this.r = new Path2D(); this.f = new Path2D();
    this.bE = new Path2D(); this.fE = new Path2D();
  }
  // x, y: bottom left of the front face as if at depth 0; the box spans depth z0..z0+d.
  add(x, y, w, h, d, z0 = 0) {
    const X = x + z0 * KX, Y = y - z0 * KY, dx = d * KX, dy = d * KY, T = Y - h;
    quad(this.t, X, T, X + w, T, X + w + dx, T - dy, X + dx, T - dy);
    quad(this.r, X + w, T, X + w + dx, T - dy, X + w + dx, Y - dy, X + w, Y);
    this.f.rect(X, T, w, h);
    seg(this.bE, X, T, X + dx, T - dy);
    seg(this.bE, X + dx, T - dy, X + w + dx, T - dy);
    seg(this.bE, X + w + dx, T - dy, X + w + dx, Y - dy);
    seg(this.bE, X + w + dx, Y - dy, X + w, Y);
    this.fE.rect(X, T, w, h);
    return this;
  }
  draw(ctx, width = EDGE_W) {
    ctx.fillStyle = this.m.t[0]; ctx.fill(this.t);
    ctx.fillStyle = this.m.r[0]; ctx.fill(this.r);
    strokeP(ctx, this.edge, width, this.bE);
    ctx.fillStyle = this.m.f[0]; ctx.fill(this.f);
    strokeP(ctx, this.edge, width, this.fE);
  }
}

// Thick polylines rasterised onto the voxel grid, kept face-connected so a diagonal
// branch climbs as a staircase of cubes rather than a chain of corners.
function rasterise(vox, strokes, v, tag = 'a') {
  for (const { pts, w } of strokes) {
    let prev = null;
    for (let k = 0; k + 3 < pts.length; k += 2) {
      const x0 = pts[k], y0 = pts[k + 1], x1 = pts[k + 2], y1 = pts[k + 3];
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (v * 0.25)));
      for (let q = 0; q <= n; q++) {
        const px = x0 + (x1 - x0) * q / n, py = -(y0 + (y1 - y0) * q / n);
        const i = Math.floor(px / v), j = Math.floor(py / v);
        if (prev && prev[0] !== i && prev[1] !== j && prev[1] >= 0) vox.set(i, prev[1], tag);
        prev = [i, j];
        if (j >= 0) vox.set(i, j, tag);
        if (w > v * 1.2) {
          const r = w / 2;
          for (let a = Math.floor((px - r) / v); a <= Math.floor((px + r) / v); a++) {
            for (let b = Math.max(0, Math.floor((py - r) / v)); b <= Math.floor((py + r) / v); b++) {
              if (Math.hypot((a + 0.5) * v - px, (b + 0.5) * v - py) <= r) vox.set(a, b, tag);
            }
          }
        }
      }
    }
  }
  return vox;
}

// ------------------------------------------------------------------ translucency
// Fog is drawn opaque into a device-pixel offscreen and laid down at one alpha, so
// overlapping slabs stay one even veil instead of stacking.
let OFF = null;
function offscreen(w, h) {
  if (!OFF) {
    OFF = typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(w, h)
      : Object.assign(document.createElement('canvas'), { width: w, height: h });
  }
  if (OFF.width < w || OFF.height < h) {
    OFF.width = Math.max(w, OFF.width);
    OFF.height = Math.max(h, OFF.height);
  }
  return OFF;
}

function translucent(ctx, x0, y0, x1, y1, alpha, paint) {
  const m = ctx.getTransform ? ctx.getTransform() : null;
  if (!m || m.b || m.c || m.a <= 0 || m.d <= 0) {
    ctx.save(); ctx.globalAlpha *= alpha; paint(ctx); ctx.restore();
    return;
  }
  const X0 = Math.floor(m.e + x0 * m.a), Y0 = Math.floor(m.f + y0 * m.d);
  const w = Math.ceil(m.e + x1 * m.a) - X0, h = Math.ceil(m.f + y1 * m.d) - Y0;
  const cv = offscreen(w, h);
  const c = cv.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, w, h);
  c.setTransform(m.a, 0, 0, m.d, m.e - X0, m.f - Y0);
  paint(c);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha *= alpha;
  ctx.drawImage(cv, 0, 0, w, h, X0, Y0, w, h);
  ctx.restore();
}

// ------------------------------------------------------------------ sky
function sky(ctx, f) {
  const g = ctx.createLinearGradient(0, 0, 0, f.laneTop);
  g.addColorStop(0, SKY[0]);
  g.addColorStop(0.4, SKY[1]);
  g.addColorStop(0.75, SKY[2]);
  g.addColorStop(1, SKY[3]);
  ctx.fillStyle = g;
  ctx.fillRect(-40, -80, f.W + 80, f.H + 160);

  // Stars: crisp squares, the brightest as little faceted diamonds.
  ctx.fillStyle = '#e6e2ff';
  for (const s of f.stars) {
    ctx.globalAlpha = s.twinkle * (s.s > 1.1 ? 1 : 0.7);
    const x = Math.round(s.x * 2) / 2, y = Math.round(s.y * 2) / 2;
    if (s.s > 1.45) {
      ctx.beginPath();
      ctx.moveTo(x, y - 2); ctx.lineTo(x + 1, y); ctx.lineTo(x, y + 2); ctx.lineTo(x - 1, y); ctx.closePath();
      ctx.fill();
    } else {
      const k = s.s > 1.05 ? 1.5 : 1;
      ctx.fillRect(x, y, k, k);
    }
  }
  ctx.globalAlpha = 1;
  moon(ctx, f.moon);
  for (const c of f.clouds) cloud(ctx, c);
  for (const b of f.bats) bat(ctx, b);
}

function moon(ctx, m) {
  const g = ctx.createRadialGradient(m.x, m.y, m.r * 0.8, m.x, m.y, m.r * 3);
  g.addColorStop(0, 'rgba(206,196,255,0.16)');
  g.addColorStop(0.4, 'rgba(170,156,240,0.06)');
  g.addColorStop(1, 'rgba(170,156,240,0)');
  ctx.fillStyle = g;
  ctx.fillRect(m.x - m.r * 3, m.y - m.r * 3, m.r * 6, m.r * 6);
  // A ball of cubes, each cube flat-shaded by the facet it stands for.
  const spr = cached('moon', () => {
    const c = 4, n = Math.ceil(m.r / c);
    const vx = new Vox();
    const craters = [[-8, -5, 5.5], [6, 7, 4.5], [9, -9, 3], [-3, 10, 2.5]];
    const facet = new Map();
    const lx = 0.5, ly = 0.55, lz = 0.67;
    for (let i = -n; i < n; i++) {
      for (let j = -n; j < n; j++) {
        const px = (i + 0.5) * c, py = -(j + 0.5) * c;
        const rr = Math.hypot(px, py);
        if (rr > m.r - 0.5) continue;
        const crater = craters.some(([x, y, r]) => Math.hypot(px - x, py - y) <= r);
        vx.set(i, j, crater ? 'crater' : 'moon');
        const nx = px / m.r, ny = -py / m.r, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
        const lit = nx * lx + ny * ly + nz * lz;
        facet.set(cellKey(i, j), lit > 0.9 ? 0.72 : lit < 0.45 ? 0.95 : 0.1);
      }
    }
    return {
      slabs: [compileSlab(vx, {
        v: c, d: 5, mats: MOON, edge: '#a8976d', seam: '#e2d6b0', seams: false,
        shade: (i, j) => facet.get(cellKey(i, j)),
      })],
    };
  });
  drawSprite(ctx, spr, m.x, m.y);
}

function cloud(ctx, c) {
  const spr = cached(`cloud:${c.i}`, () => {
    const cell = 4;
    const lobes = [[0.18, 0.55, 0.22], [0.4, 0.35, 0.3], [0.64, 0.5, 0.24], [0.84, 0.62, 0.16]];
    const vx = new Vox();
    const cols = Math.round(c.w / cell);
    for (let i = 0; i < cols; i++) {
      for (let j = -Math.ceil(c.h / cell) - 1; j < 1; j++) {
        const px = (i + 0.5) * cell, py = -(j + 0.5) * cell;
        for (const [u, v, r] of lobes) {
          const ax = u * c.w - r * c.w * 0.6, bx = u * c.w + r * c.w * 0.6;
          const qx = Math.max(ax, Math.min(bx, px));
          if (Math.hypot(px - qx, py - v * c.h) <= r * c.h * 1.25 + cell * 0.3) { vx.set(i, j, 'cloud'); break; }
        }
      }
    }
    return { slabs: [compileSlab(vx, { v: cell, d: 5, mats: CLOUD, edge: '#1b1540', seam: '#241d4b' })] };
  });
  drawSprite(ctx, spr, c.x, c.y);
}

// Block bats: a two-cube body and three-cube wings in four flap poses.
const WINGS = [
  [[1, 1], [2, 2], [3, 3]],
  [[1, 1], [2, 1], [3, 2]],
  [[1, 1], [2, 0], [3, -1]],
  [[1, 1], [2, 1], [3, 2]],
];
function bat(ctx, b) {
  const frame = Math.floor(b.flap * 4) % 4;
  const c = 2.6 * b.s;
  const spr = cached(`bat:${frame}:${b.s}`, () => {
    const vx = new Vox();
    vx.set(0, 0, 'bat').set(0, 1, 'bat');
    for (const [i, j] of WINGS[frame]) { vx.set(i, j, 'bat'); vx.set(-i, j, 'bat'); }
    return { slabs: [compileSlab(vx, { v: c, d: c * 0.9, mats: BAT, edge: '#05030b', seam: '#05030b', seams: false })] };
  });
  drawSprite(ctx, spr, b.x - c / 2, b.y + c);
}

// ------------------------------------------------------------------ terrain
const TERRAIN = {
  bg: { B: 9, D: 9, minRows: 1, seed: 1 },
  mid: { B: 9, D: 9, minRows: 1, seed: 2 },
  fg: { B: 6, D: 6, minRows: 1, seed: 3 },
};

function columns(L, cfg) {
  const { B, D, minRows } = cfg;
  const k0 = Math.floor((-70 + L.shift) / B), k1 = Math.floor((560 + L.shift) / B);
  const cols = [];
  for (let k = k0; k <= k1; k++) {
    const x = k * B - L.shift;
    const r = L.ridge(x + B / 2);
    const rows = Math.max(minRows, Math.round((BASE - r - D * KY / 2) / B));
    cols.push({ k, x, top: BASE - rows * B });
  }
  cols.k0 = k0;
  return cols;
}

function colAt(cols, cfg, L, x) {
  const n = Math.floor((x + L.shift) / cfg.B) - cols.k0;
  return cols[Math.max(0, Math.min(cols.length - 1, n))];
}

function terrain(ctx, cols, cfg, pal) {
  const { B, D, seed } = cfg;
  const dx = D * KX, dy = D * KY;
  const tops = new Faces(), rights = new Faces(), fronts = new Faces();
  const bE = new Path2D(), bS = new Path2D(), fE = new Path2D(), fS = new Path2D();
  const bottom = BASE + 8; // the lane covers everything below its top edge
  for (let n = 0; n < cols.length; n++) {
    const c = cols[n], p = cols[n - 1], q = cols[n + 1];
    const x = c.x, t = c.top;
    for (const path of tops.paths(pal.turf.t, hash(c.k, 1, seed))) {
      quad(path, x, t, x + B, t, x + B + dx, t - dy, x + dx, t - dy);
    }
    seg(bE, x + dx, t - dy, x + B + dx, t - dy);
    if (p && p.top === t) seg(bS, x, t, x + dx, t - dy);
    else seg(bE, x, t, x + dx, t - dy);
    if (q && q.top > t) {
      for (const path of rights.paths(pal.turf.r, hash(c.k, 2, seed))) {
        quad(path, x + B, t, x + B + dx, t - dy, x + B + dx, q.top - dy, x + B, q.top);
      }
      seg(bE, x + B + dx, t - dy, x + B + dx, q.top - dy);
      seg(bE, x + B, t, x + B + dx, t - dy);
      for (let y = t + B; y < q.top; y += B) seg(bS, x + B, y, x + B + dx, y - dy);
    }
    for (let y = t, row = 0; y < bottom; y += B, row++) {
      const m = row === 0 ? pal.turf : pal.ground;
      for (const path of fronts.paths(m.f, hash(c.k, row + 5, seed))) path.rect(x, y, B, B);
      if (row > 0) seg(fS, x, y, x + B, y);
    }
    seg(fE, x, t, x + B, t);
    if (p) {
      if (p.top > t) seg(fE, x, t, x, p.top);
      seg(fS, x, Math.max(t, p.top), x, bottom);
    }
    if (q && q.top > t) seg(fE, x + B, t, x + B, q.top);
  }
  tops.fill(ctx);
  rights.fill(ctx);
  strokeP(ctx, pal.seam, SEAM_W, bS);
  strokeP(ctx, pal.edge, EDGE_W, bE);
  fronts.fill(ctx);
  strokeP(ctx, pal.seam, SEAM_W, fS);
  strokeP(ctx, pal.edge, EDGE_W, fE);
}

// ------------------------------------------------------------------ props
// Snap a screen x to the centre of a prop voxel in the layer's own space.
const snapCell = (x, L) => (Math.round((x + L.shift) / V - 0.5) + 0.5) * V - L.shift;
const snapLine = (x, L) => Math.round((x + L.shift) / V) * V - L.shift;
// Snap to the centre of the terrain column under x.
const snapCol = (x, L, cfg) => (Math.floor((x + L.shift) / cfg.B) + 0.5) * cfg.B - L.shift;

function slab(vox, pal, mats, opts) {
  return compileSlab(vox, { v: V, d: V, mats: mats ?? pal, edge: pal.edge, seam: pal.seam, ...opts });
}

// The ruined abbey: a broken nave wall with three stepped lancets, a tower whose spire
// is a stack of shrinking cubes, and a roofless transept with a cross-shaped rose.
function abbeySprite(pal) {
  const vx = new Vox();
  const nave = [8, 9, 10, 10, 9, 11, 12, 12, 12, 11, 11, 12, 13, 13, 12, 12, 13, 13, 13];
  nave.forEach((h, n) => vx.fill(-18 + n, -18 + n, 0, h - 1, 'stone'));
  for (const c of [-14, -9, -4]) {
    for (let i = c - 1; i <= c + 1; i++) for (let j = 2; j <= 6; j++) vx.del(i, j);
    vx.del(c, 7);
  }
  vx.fill(1, 5, 0, 17, 'stone');
  vx.set(1, 18, 'stone').set(5, 18, 'stone');
  vx.del(3, 12).del(3, 13).del(3, 14);
  const tr = [9, 10, 11, 11, 10, 11, 12, 11, 10, 9, 8];
  tr.forEach((h, n) => vx.fill(6 + n, 6 + n, 0, h - 1, 'stone'));
  for (const [i, j] of [[11, 5], [10, 5], [12, 5], [11, 4], [11, 6]]) vx.del(i, j);
  const boxes = new Boxes(pal.stone, pal.edge);
  let y = -54;
  const zc = V + V; // the wall's depth centre
  for (const s of [9, 7, 5, 4, 3, 2, 2]) {
    boxes.add(10.5 - s / 2, y, s, s, s, zc - s / 2);
    y -= s;
  }
  return { slabs: [slab(vx, pal, null, { d: 2 * V, z0: V })], boxes };
}

function groveSprite(it, pal) {
  const vx = new Vox();
  const n = 3 + (it.i % 3);
  for (let k = 0; k < n; k++) {
    const dx = (k - (n - 1) / 2) * 12 * it.s + (hash(it.i, k, 3) - 0.5) * 6;
    const sc = (0.42 + hash(it.i, k, 4) * 0.24) * it.s;
    const L = (hash(it.i, k, 5) - 0.5) * 0.6;
    rasterise(vx, treeStrokes(dx, sc, L, 3.2, 2), V, 'wood');
  }
  return { slabs: [slab(vx, pal, null, { z0: V, seams: false })] };
}

function treeStrokes(ox, s, L, trunk, limb) {
  return [
    { pts: [ox, 0, ox + L * 4 * s, -26 * s], w: trunk },
    { pts: [ox + L * 4 * s, -26 * s, ox + L * 8 * s, -50 * s], w: limb + 0.5 },
    { pts: [ox + L * 3 * s, -20 * s, ox - 12 * s, -32 * s, ox - 17 * s, -42 * s], w: limb },
    { pts: [ox - 12 * s, -32 * s, ox - 21 * s, -34 * s], w: limb },
    { pts: [ox + L * 5 * s, -30 * s, ox + 13 * s, -40 * s, ox + 20 * s, -42 * s], w: limb },
    { pts: [ox + 13 * s, -40 * s, ox + 15 * s, -49 * s], w: limb },
    { pts: [ox + L * 7 * s, -42 * s, ox - 3 * s, -52 * s], w: limb },
  ];
}

function treeSprite(it, pal) {
  const vx = rasterise(new Vox(), treeStrokes(1.5, it.s, it.variant === 1 ? -0.8 : 0.2, 6.5, 2), V, 'wood');
  return { slabs: [slab(vx, pal, null, { d: 2 * V, z0: 1.5, seams: false })] };
}

function mausoleumSprite(it, pal) {
  const h = it.s >= 0.95 ? 7 : 6;
  const colTop = h + 1;
  const ent = colTop + 1;
  const front = new Vox(), back = new Vox();
  front.fill(-h, h, 0, 0, 'tomb').fill(-(h - 1), h - 1, 1, 1, 'tomb');
  front.fill(-(h - 2), -(h - 2), 2, colTop, 'stone').fill(h - 2, h - 2, 2, colTop, 'stone');
  front.fill(-(h - 1), h - 1, ent, ent, 'tomb');
  back.fill(-(h - 2), h - 2, 2, ent, 'tomb');
  const doorH = h - 3;
  back.fill(-1, 1, 2, 1 + doorH, 'door').set(0, 2 + doorH, 'door');
  if (it.variant === 1) {
    const widths = h === 7 ? [4, 4, 3, 2] : [3, 3, 2, 1];
    widths.forEach((w, n) => back.fill(-w, w, ent + 1 + n, ent + 1 + n, 'tomb'));
    const top = ent + widths.length;
    back.set(0, top + 1, 'stone').fill(-1, 1, top + 2, top + 2, 'stone').set(0, top + 3, 'stone');
  } else {
    let j = ent + 1;
    for (let w = h - 2; w >= 0; w -= 2, j++) {
      front.fill(-w, w, j, j, 'tomb');
      back.fill(-w, w, j, j, 'tomb');
    }
  }
  return {
    slabs: [
      slab(back, pal, null, { d: 2 * V, z0: V }),
      slab(front, pal, null, { d: V, z0: 0 }),
    ],
  };
}

function stoneSprite(it, pal) {
  const vx = new Vox();
  if (it.variant === 2) {
    vx.fill(-1, 1, 0, 0, 'stone').fill(0, 0, 1, Math.round(5.5 * it.s), 'stone');
  } else if (it.variant === 1) {
    const n = Math.max(3, Math.round(4 * it.s));
    vx.fill(-1, 1, 0, n - 1, 'stone').del(0, n - 1);
  } else {
    const n = Math.max(3, Math.round(4.4 * it.s));
    vx.fill(-1, 1, 0, n - 2, 'stone').set(0, n - 1, 'stone');
  }
  return { slabs: [slab(vx, pal, null, { d: 2 * V, z0: 1.5 })] };
}

function crossSprite(it, pal) {
  const n = Math.max(5, Math.round(7 * it.s));
  const ja = n - 3;
  const vx = new Vox().fill(-1, 1, 0, 0, 'stone').fill(0, 0, 1, n - 1, 'stone');
  if (it.i % 2 === 0) {
    vx.fill(-2, 2, ja, ja, 'stone');
    vx.set(-1, ja + 1, 'stone').set(1, ja + 1, 'stone').set(-1, ja - 1, 'stone').set(1, ja - 1, 'stone');
  } else {
    vx.fill(-1, 1, ja, ja, 'stone');
  }
  return { slabs: [slab(vx, pal, null, { d: 2 * V, z0: 1.5 })] };
}

function gnarlSprite(it, pal) {
  const s = it.s;
  const flip = it.variant === 1 ? -1 : 1;
  const X = (dx) => 1.5 + dx * s * flip;
  const Y = (dy) => dy * s;
  const w = (k) => 7 * s * k * 1.15;
  const strokes = [
    { pts: [X(0), Y(0), X(-4), Y(-30), X(4), Y(-58), X(0), Y(-84)], w: w(1.6) },
    { pts: [X(2), Y(-50), X(24), Y(-66), X(44), Y(-64), X(58), Y(-74)], w: w(0.9) },
    { pts: [X(44), Y(-64), X(52), Y(-56), X(62), Y(-58)], w: w(0.5) },
    { pts: [X(30), Y(-66), X(36), Y(-82), X(48), Y(-92)], w: w(0.55) },
    { pts: [X(0), Y(-80), X(-14), Y(-100), X(-26), Y(-104)], w: w(0.8) },
    { pts: [X(-14), Y(-100), X(-12), Y(-114)], w: w(0.45) },
    { pts: [X(1), Y(-84), X(14), Y(-104), X(30), Y(-112), X(38), Y(-124)], w: w(0.7) },
    { pts: [X(20), Y(-107), X(28), Y(-100), X(36), Y(-102)], w: w(0.4) },
    { pts: [X(-2), Y(-36), X(-18), Y(-46), X(-26), Y(-44)], w: w(0.6) },
    { pts: [X(-6), Y(-1), X(-14), Y(-1)], w: w(0.6) },
    { pts: [X(5), Y(-1), X(14), Y(-1)], w: w(0.6) },
  ];
  const vx = rasterise(new Vox(), strokes, V, 'wood');
  return { slabs: [slab(vx, pal, null, { d: 2 * V, z0: 0, seams: false })] };
}

function lampSprite(pal) {
  const vx = new Vox();
  vx.fill(-1, 1, 0, 0, 'iron').fill(0, 0, 1, 10, 'iron');
  vx.fill(-1, 1, 11, 12, 'glow');
  vx.fill(-1, 1, 13, 13, 'iron').set(0, 14, 'iron');
  return { slabs: [slab(vx, pal, null, { z0: 1.5, seams: false })] };
}

function grassSprite(it, pal) {
  const v = 2;
  const vx = new Vox();
  let tallest = null;
  for (const [b, i0, lean] of [[0, -4, -1], [1, -2, -1], [2, 0, 0], [3, 1, 1], [4, 3, 1]]) {
    const h = Math.max(2, Math.round((2.6 + hash(it.i, b, 21) * 3.6) * it.s));
    // A blade climbs straight, then steps outward one cube for its last third.
    const bend = lean && h > 3 ? Math.ceil(h * 0.66) : h;
    for (let j = 0; j < h; j++) vx.set(j >= bend ? i0 + lean : i0, j, 'grass');
    if (bend < h) vx.set(i0 + lean, bend - 1, 'grass');
    if (!tallest || h > tallest[1]) tallest = [lean && h > 3 ? i0 + lean : i0, h];
  }
  if (it.i % 2 === 0) {
    const [i, h] = tallest;
    vx.fill(i - 1, i + 1, h, h, 'thistle').set(i, h + 1, 'thistle');
  }
  return { slabs: [compileSlab(vx, { v, d: 2, z0: 2, mats: pal, edge: pal.edge, seam: pal.seam, seams: false })] };
}

function lampGlow(ctx, x, y, t, i) {
  const flicker = 0.88 + 0.12 * Math.sin(t * 11 + i) * Math.sin(t * 7.3 + i * 0.7);
  const g = ctx.createRadialGradient(x, y, 1, x, y, 34);
  g.addColorStop(0, `rgba(255,196,104,${0.42 * flicker})`);
  g.addColorStop(0.45, `rgba(255,176,90,${0.16 * flicker})`);
  g.addColorStop(1, 'rgba(255,170,90,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 36, y - 36, 72, 72);
}

function fence(ctx, it, L, cols, cfg, pal) {
  const gateHalf = 15;
  const baseAt = (x) => colAt(cols, cfg, L, x).top;
  const bars = new Boxes(pal.iron, pal.edge);
  const caps = new Boxes(pal.iron, pal.edge);
  const rails = new Boxes(pal.iron, pal.edge);
  for (let x = it.x0; x <= it.x1; x += 7) {
    if (it.gate != null && Math.abs(x - it.gate) < gateHalf + 2) continue;
    if (x < -30 || x > 510) continue;
    const b = baseAt(x);
    bars.add(x - 0.9, b, 1.8, 20, 1.8, 2);
    caps.add(x - 1.4, b - 20, 2.8, 2.8, 2.8, 1.5);
  }
  const runs = it.gate == null
    ? [[it.x0, it.x1]]
    : [[it.x0, it.gate - gateHalf], [it.gate + gateHalf, it.x1]];
  // Rails step with the terrain: one box per run of level columns, walked by index.
  for (const [a, e] of runs) {
    const x0 = Math.max(a, -40), x1 = Math.min(e, 520);
    let n = Math.max(0, Math.floor((x0 + L.shift) / cfg.B) - cols.k0);
    let x = x0;
    while (x < x1 && n < cols.length) {
      const top = cols[n].top;
      let m = n;
      while (m + 1 < cols.length && cols[m + 1].top === top && cols[m + 1].x < x1) m++;
      const nx = Math.min(x1, cols[m].x + cfg.B);
      if (nx > x) for (const h of [5, 15]) rails.add(x, top - h, nx - x, 1.6, 1.2, 0.8);
      x = nx;
      n = m + 1;
    }
  }
  bars.draw(ctx, 0.45);
  caps.draw(ctx, 0.45);
  rails.draw(ctx, 0.45);
  if (it.gate != null && it.gate > -50 && it.gate < 530) {
    const g = it.gate, b = baseAt(g);
    const gb = new Boxes(pal.iron, pal.edge);
    const tops = [];
    for (let x = g - gateHalf + 5; x < g + gateHalf - 2; x += 5) {
      const h = Math.round((26 + 6 * Math.cos((x - g) / gateHalf * 1.4)) / 2) * 2;
      gb.add(x - 0.8, b, 1.6, h, 1.6, 2.2);
      tops.push([x, h]);
    }
    const arch = new Boxes(pal.iron, pal.edge);
    arch.add(g - gateHalf, b - 12, gateHalf * 2, 1.6, 1.2, 0.8);
    tops.forEach(([x, h], n) => {
      const x0 = n ? (tops[n - 1][0] + x) / 2 : g - gateHalf;
      const x1 = n < tops.length - 1 ? (tops[n + 1][0] + x) / 2 : g + gateHalf;
      arch.add(x0, b - h + 1.6, x1 - x0, 1.6, 1.2, 0.8);
    });
    const posts = new Boxes(pal.iron, pal.edge);
    for (const x of [g - gateHalf - 2, g + gateHalf - 2]) {
      posts.add(x, b, 4, 31, 3, 1.5);
      posts.add(x - 0.5, b - 31, 5, 3, 4, 1);
      posts.add(x + 0.75, b - 34, 2.5, 2.5, 2.5, 1.75);
    }
    gb.draw(ctx, 0.45);
    arch.draw(ctx, 0.45);
    posts.draw(ctx, 0.5);
  }
}

// ------------------------------------------------------------------ fog
function fogBand(ctx, band, alpha) {
  const c = 4, d = 4, dx = d * KX, dy = d * KY;
  translucent(ctx, -40, band.y - 24, 520, band.y + band.h + 16, alpha, (g) => {
    const tops = new Path2D(), rights = new Path2D(), fronts = new Path2D();
    for (const p of band.puffs) {
      const R = Math.max(1, Math.round(p.ry / c));
      for (let r = -R; r < R; r++) {
        const yc = (r + 0.5) * c;
        const hw = Math.round(p.rx * Math.sqrt(Math.max(0, 1 - (yc / (R * c)) ** 2)) / (c * 2)) * c * 2;
        if (hw <= 0) continue;
        const X = p.x - hw, Y = p.y + r * c, W = hw * 2;
        quad(tops, X, Y, X + W, Y, X + W + dx, Y - dy, X + dx, Y - dy);
        quad(rights, X + W, Y, X + W + dx, Y - dy, X + W + dx, Y + c - dy, X + W, Y + c);
        fronts.rect(X, Y, W, c);
      }
    }
    g.fillStyle = FOG.top; g.fill(tops);
    g.fillStyle = FOG.right; g.fill(rights);
    g.fillStyle = FOG.front; g.fill(fronts);
  });
}

// ------------------------------------------------------------------ layers
function layer(ctx, f, name) {
  const L = f.layers[name];
  const cfg = TERRAIN[name];
  const pal = PAL[name];
  const cols = columns(L, cfg);
  terrain(ctx, cols, cfg, pal);
  const baseAt = (x) => colAt(cols, cfg, L, x).top;
  for (const it of L.items) {
    const key = `${name}:${it.kind}:${it.i}`;
    if (it.kind === 'abbey') {
      const x = snapLine(it.x, L);
      drawSprite(ctx, cached(key, () => abbeySprite(pal)), x, baseAt(x));
    } else if (it.kind === 'grove') {
      const x = snapLine(it.x, L);
      drawSprite(ctx, cached(key, () => groveSprite(it, pal)), x, baseAt(x));
    } else if (it.kind === 'mausoleum') {
      const x = snapCell(it.x, L);
      drawSprite(ctx, cached(key, () => mausoleumSprite(it, pal)), x - V / 2, baseAt(x));
    } else if (it.kind === 'stone' || it.kind === 'cross') {
      const x = snapCol(it.x, L, cfg);
      const spr = cached(key, () => (it.kind === 'stone' ? stoneSprite : crossSprite)(it, pal));
      const lean = hash(it.i, 77) < 0.45 ? (hash(it.i, 78) - 0.5) * 0.3 : 0;
      drawSprite(ctx, spr, x - V / 2, baseAt(x) + (lean ? 0.8 : 0), lean, V / 2 + 4.5 * KX);
    } else if (it.kind === 'tree') {
      const x = snapCol(it.x, L, cfg);
      drawSprite(ctx, cached(key, () => treeSprite(it, pal)), x - V / 2, baseAt(x));
    } else if (it.kind === 'gnarl') {
      const x = snapCell(it.x, L);
      drawSprite(ctx, cached(key, () => gnarlSprite(it, pal)), x - V / 2, baseAt(x));
    } else if (it.kind === 'lamp') {
      const x = snapCell(it.x, L);
      const b = baseAt(x);
      lampGlow(ctx, x + 1.5 * KX + V * KX / 2, b - 1.5 * KY - 36, f.t, it.i);
      drawSprite(ctx, cached('lamp', () => lampSprite(pal)), x - V / 2, b);
    } else if (it.kind === 'grass') {
      const x = snapLine(it.x, L);
      drawSprite(ctx, cached(key, () => grassSprite(it, pal)), x, baseAt(x));
    } else if (it.kind === 'fence') {
      fence(ctx, it, L, cols, cfg, pal);
    }
  }
}

export const STYLE = {
  id: 'voxel',
  name: 'VOXEL DIORAMA',
  note: 'The graveyard built from shaded cubes on one grid, drawn as crisp vectors: lit top faces, mid right '
    + 'faces and dark fronts under a moon from the upper right. Ridges step in whole blocks, the spire is a stack '
    + 'of shrinking cubes, and the gas lamp is the one warm glowing block.',
  paint(ctx, f) {
    ctx.save();
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
    sky(ctx, f);
    layer(ctx, f, 'bg');
    layer(ctx, f, 'mid');
    fogBand(ctx, f.fog[0], 0.22);
    layer(ctx, f, 'fg');
    fogBand(ctx, f.fog[1], 0.18);
    ctx.restore();
  },
};
