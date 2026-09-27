// CRYPT style bake-off — PLASTICINE. A stop-motion clay set: every shape is a soft,
// rolled-over lump of modelling clay lit by one studio key from the upper right (where
// the moon hangs), so each thing has a lit top/right shoulder, a dark rolled-under
// lower/left edge and a faint waxy sheen, with thumbprints and tool marks pressed into
// the surface. Each piece throws a soft contact shadow on whatever stands behind it,
// which is what makes the layers read as a miniature set.
//
// How: nothing is shaded by hand. A piece is rasterised as a silhouette, a distance
// transform turns it into a height field (a semicircular roll at the edge, flat on
// top, true cylinders for the rolled-snake limbs), a seeded clay texture is added,
// and the heights are lit per pixel. All of that is baked ONCE into cached canvases —
// the sky board, one periodic strip per ridge, one sprite per placed item — so a
// frame is only blits plus the lamp glow, fog puffs, stars and bats.
import { CRYPT_PLAN } from './plan.js';

const TAU = Math.PI * 2;
const INF = 1e20;

// The studio key, from the upper right and toward the viewer, and its half-vector.
const LX = 0.55;
const LY = -0.62;
const LZ = 0.56;
const HN = Math.hypot(LX, LY, LZ + 1);
const HX = LX / HN;
const HY = LY / HN;
const HZ = (LZ + 1) / HN;

const C = {
  sky: [[-80, [12, 10, 28]], [30, [20, 17, 44]], [140, [36, 30, 66]], [250, [58, 44, 84]]],
  moon: '#ecdfb0',
  crater: '#cdb987',
  star: '#f6e8bb',
  cloud: '#3b3462',
  bat: '#1a1224',
  bgRidge: '#343960',
  bgStone: '#4f5580',
  bgTower: '#575e89',
  bgRoof: '#404672',
  bgWin: '#17162f',
  bgTree: '#262b48',
  midRidge: '#2e3b3b',
  midTree: '#382a3b',
  tomb: '#40445a',
  tombLit: '#4a4f66',
  door: '#0f0c1a',
  stones: ['#3a4944', '#3d4452', '#453a50'],
  stoneDent: '#20222c',
  fgBank: '#231a2d',
  fgTree: '#2e2035',
  knot: '#120c18',
  iron: '#1a1422',
  post: '#251c2f',
  grass: '#282d23',
  thistle: '#553a5c',
  bead: '#ffc766',
  fog: [156, 146, 194],
};

// Contact shadows: offset (logical px), blur, strength. The key sits in front of the
// set, so a hill or a headstone throws its shadow back onto the receding ground behind
// it — up and to the left on screen — while the moon and clouds, stuck to the upright
// sky board, drop theirs down-left.
const SH = {
  ridge: { x: -4, y: -3, b: 5, a: 0.55 },
  item: { x: -1.8, y: -0.7, b: 1.8, a: 0.5 },
  far: { x: -1.6, y: -0.8, b: 2.2, a: 0.42 },
  part: { x: -0.9, y: -0.4, b: 1.1, a: 0.42 },
  fg: { x: -2.4, y: -1, b: 2.4, a: 0.55 },
  sky: { x: -2.2, y: 2.2, b: 3.2, a: 0.34 },
};

// ------------------------------------------------------------------ utilities
function ihash(i, j, s) {
  let h = (i * 374761393 + j * 668265263 + s * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

function seeded(i) {
  const x = Math.sin(i * 91.7 + 17.3) * 43758.5453;
  return x - Math.floor(x);
}

// Value noise on a lattice; wraps every `cells` lattice steps (0 = no wrap).
function vnoise(x, y, cells, seed) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  let fx = x - ix;
  let fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const w = (v) => (cells ? ((v % cells) + cells) % cells : v);
  const x0 = w(ix), x1 = w(ix + 1), y0 = w(iy), y1 = w(iy + 1);
  const a = ihash(x0, y0, seed), b = ihash(x1, y0, seed);
  const c = ihash(x0, y1, seed), d = ihash(x1, y1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

function smooth(e0, e1, x) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

function rgbOf(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mk(w, h) {
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }
  return new OffscreenCanvas(w, h);
}

// ------------------------------------------------------------------ path helpers
function roundPoly(c, pts, r) {
  const n = pts.length;
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const d1 = Math.hypot(p0[0] - p1[0], p0[1] - p1[1]);
    const d2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const rr = Math.min(r, d1 / 2, d2 / 2);
    const ax = p1[0] + (p0[0] - p1[0]) / d1 * rr;
    const ay = p1[1] + (p0[1] - p1[1]) / d1 * rr;
    const bx = p1[0] + (p2[0] - p1[0]) / d2 * rr;
    const by = p1[1] + (p2[1] - p1[1]) / d2 * rr;
    if (i === 0) c.moveTo(ax, ay);
    else c.lineTo(ax, ay);
    c.quadraticCurveTo(p1[0], p1[1], bx, by);
  }
  c.closePath();
}

function rr(c, x, y, w, h, r) {
  roundPoly(c, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], r);
}

function lancet(c, x, y, w, h) {
  c.moveTo(x - w / 2, y);
  c.lineTo(x - w / 2, y - h + w * 0.6);
  c.quadraticCurveTo(x - w / 2, y - h, x, y - h - w * 0.3);
  c.quadraticCurveTo(x + w / 2, y - h, x + w / 2, y - h + w * 0.6);
  c.lineTo(x + w / 2, y);
  c.closePath();
}

// A rolled clay snake: a Catmull-Rom curve through pts, tapering w0 -> w1.
function snake(c, pts, w0, w1) {
  const P = [];
  for (let k = 0; k < pts.length; k += 2) P.push([pts[k], pts[k + 1]]);
  const S = [];
  for (let g = 0; g < P.length - 1; g++) {
    const p0 = P[Math.max(0, g - 1)], p1 = P[g], p2 = P[g + 1], p3 = P[Math.min(P.length - 1, g + 2)];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 0.6));
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, cc, d) => 0.5 * (2 * b + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - d) * t2 + (-a + 3 * b - 3 * cc + d) * t3);
      S.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  S.push(P[P.length - 1]);
  const cum = [0];
  for (let k = 1; k < S.length; k++) cum.push(cum[k - 1] + Math.hypot(S[k][0] - S[k - 1][0], S[k][1] - S[k - 1][1]));
  const total = cum[cum.length - 1] || 1;
  c.lineCap = 'round';
  for (let k = 1; k < S.length; k++) {
    c.lineWidth = w0 + (w1 - w0) * (cum[k] / total);
    c.beginPath();
    c.moveTo(S[k - 1][0], S[k - 1][1]);
    c.lineTo(S[k][0], S[k][1]);
    c.stroke();
  }
}

// ------------------------------------------------------------------ clay texture
// A tileable height/mottle tile in logical px: broad lumps, fine grain, thumbprints
// (a shallow bowl with ridged whorls) and tool gouges with raised lips.
function buildTex(S) {
  const TL = 240;
  const T = TL * S;
  const H = new Float32Array(T * T);
  const M = new Float32Array(T * T);
  for (let py = 0; py < T; py++) {
    const y = py / S;
    for (let px = 0; px < T; px++) {
      const x = px / S;
      const i = py * T + px;
      H[i] = 0.5 * (vnoise(x / 12, y / 12, 20, 1) - 0.5)
        + 0.2 * (vnoise(x / 4, y / 4, 60, 2) - 0.5)
        + 0.07 * (vnoise(x / 1.5, y / 1.5, 160, 3) - 0.5);
      M[i] = 0.6 * vnoise(x / 20, y / 20, 12, 4) + 0.4 * vnoise(x / 6, y / 6, 40, 5);
    }
  }
  const at = (px, py) => (((py % T) + T) % T) * T + (((px % T) + T) % T);
  for (let k = 0; k < 18; k++) {
    const cx = ihash(k, 1, 9) * TL, cy = ihash(k, 2, 9) * TL, r = 4 + ihash(k, 3, 9) * 5;
    const ang = ihash(k, 4, 9) * TAU, sp = 0.8 + ihash(k, 5, 9) * 0.3;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    for (let py = Math.floor((cy - r) * S); py <= Math.ceil((cy + r) * S); py++) {
      for (let px = Math.floor((cx - r) * S); px <= Math.ceil((cx + r) * S); px++) {
        const dx = px / S - cx, dy = py / S - cy;
        const u = dx * ca + dy * sa, v = (-dx * sa + dy * ca) / 0.75;
        const rho = Math.hypot(u, v);
        if (rho >= r) continue;
        const q = 1 - (rho / r) ** 2;
        H[at(px, py)] += q * (-0.3 + 0.09 * Math.sin(TAU * rho / sp + 0.4 * Math.atan2(v, u)));
      }
    }
  }
  for (let k = 0; k < 26; k++) {
    const cx = ihash(k, 1, 13) * TL, cy = ihash(k, 2, 13) * TL, len = 4 + ihash(k, 3, 13) * 10;
    const ang = ihash(k, 4, 13) * Math.PI;
    const ex = Math.cos(ang), ey = Math.sin(ang);
    const x0 = cx - ex * len / 2, y0 = cy - ey * len / 2;
    const bx0 = Math.floor((Math.min(x0, x0 + ex * len) - 2) * S), bx1 = Math.ceil((Math.max(x0, x0 + ex * len) + 2) * S);
    const by0 = Math.floor((Math.min(y0, y0 + ey * len) - 2) * S), by1 = Math.ceil((Math.max(y0, y0 + ey * len) + 2) * S);
    for (let py = by0; py <= by1; py++) {
      for (let px = bx0; px <= bx1; px++) {
        const dx = px / S - x0, dy = py / S - y0;
        const t = Math.max(0, Math.min(len, dx * ex + dy * ey));
        const dist = Math.hypot(dx - ex * t, dy - ey * t);
        if (dist > 1.6) continue;
        H[at(px, py)] += dist < 0.6 ? -0.26 * (1 - dist / 0.6) : 0.07 * Math.exp(-(((dist - 0.9) / 0.3) ** 2));
      }
    }
  }
  return { T, H, M };
}

// ------------------------------------------------------------------ field ops
function edt1d(f, n, d, v, z) {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const dq = q - v[k];
    d[q] = dq * dq + f[v[k]];
  }
}

// Distance (device px) from every pixel at alpha >= 0.5 to the silhouette's edge.
function insideDist(alpha, W, H) {
  const g = new Float64Array(W * H);
  for (let i = 0; i < g.length; i++) g[i] = alpha[i] >= 0.5 ? INF : 0;
  const n = Math.max(W, H);
  const f = new Float64Array(n), d = new Float64Array(n), z = new Float64Array(n + 1);
  const v = new Int32Array(n);
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) f[y] = g[y * W + x];
    edt1d(f, H, d, v, z);
    for (let y = 0; y < H; y++) g[y * W + x] = d[y];
  }
  for (let y = 0; y < H; y++) {
    const o = y * W;
    for (let x = 0; x < W; x++) f[x] = g[o + x];
    edt1d(f, W, d, v, z);
    for (let x = 0; x < W; x++) g[o + x] = d[x];
  }
  const out = new Float32Array(W * H);
  for (let i = 0; i < out.length; i++) {
    const a = alpha[i];
    out[i] = a <= 0 ? 0 : a >= 0.5 ? Math.sqrt(g[i]) - 0.5 : a * 0.5;
  }
  return out;
}

// The EDT of a pixel staircase ripples; blend in a blurred copy away from the edge.
function softDist(d, W, H) {
  const b = boxBlur(boxBlur(d, W, H, 1), W, H, 1);
  for (let i = 0; i < d.length; i++) {
    if (d[i] <= 0) continue;
    const k = Math.max(0, Math.min(1, (d[i] - 1) / 2));
    d[i] += (b[i] - d[i]) * k;
  }
  return d;
}

function boxBlur(src, W, H, r) {
  const tmp = new Float32Array(W * H), out = new Float32Array(W * H);
  const inv = 1 / (2 * r + 1);
  for (let y = 0; y < H; y++) {
    const o = y * W;
    let acc = 0;
    for (let x = 0; x <= r && x < W; x++) acc += src[o + x];
    for (let x = 0; x < W; x++) {
      tmp[o + x] = acc * inv;
      if (x + r + 1 < W) acc += src[o + x + r + 1];
      if (x - r >= 0) acc -= src[o + x - r];
    }
  }
  for (let x = 0; x < W; x++) {
    let acc = 0;
    for (let y = 0; y <= r && y < H; y++) acc += tmp[y * W + x];
    for (let y = 0; y < H; y++) {
      out[y * W + x] = acc * inv;
      if (y + r + 1 < H) acc += tmp[(y + r + 1) * W + x];
      if (y - r >= 0) acc -= tmp[(y - r) * W + x];
    }
  }
  return out;
}

// Separable running max: the local half-thickness a pixel's limb reaches.
function maxFilter(src, W, H, r) {
  const tmp = new Float32Array(W * H), out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    const o = y * W;
    for (let x = 0; x < W; x++) {
      let m = 0;
      const a = Math.max(0, x - r), b = Math.min(W - 1, x + r);
      for (let k = a; k <= b; k++) if (src[o + k] > m) m = src[o + k];
      tmp[o + x] = m;
    }
  }
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      let m = 0;
      const a = Math.max(0, y - r), b = Math.min(H - 1, y + r);
      for (let k = a; k <= b; k++) if (tmp[k * W + x] > m) m = tmp[k * W + x];
      out[y * W + x] = m;
    }
  }
  return out;
}

function smooth121(h, W, H) {
  const t = new Float32Array(W * H), o = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    const r = y * W;
    for (let x = 0; x < W; x++) {
      const l = x > 0 ? h[r + x - 1] : h[r + x], R = x < W - 1 ? h[r + x + 1] : h[r + x];
      t[r + x] = (l + 2 * h[r + x] + R) * 0.25;
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const u = y > 0 ? t[i - W] : t[i], d = y < H - 1 ? t[i + W] : t[i];
      o[i] = (u + 2 * t[i] + d) * 0.25;
    }
  }
  return o;
}

// ------------------------------------------------------------------ the clay shader
// Heights in logical px: a rolled edge of radius R (or the limb's own half-width when
// it is thinner, so a snake is a true cylinder), pressed dents, then clay texture.
function shadeLump(tctx, alpha, W, H, S, o, dents, tex, seed) {
  const N = W * H;
  const d = softDist(insideDist(alpha, W, H), W, H);
  const RS = (o.R ?? 2) * S;
  const puff = o.puff ?? 1;
  const lm = o.adapt === false ? null : maxFilter(d, W, H, Math.ceil(RS));
  let hgt = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    if (alpha[i] <= 0) continue;
    if (o.hfn) {
      hgt[i] = o.hfn(((i % W) + 0.5) / S - o.ax, (Math.floor(i / W) + 0.5) / S - o.ay);
      continue;
    }
    const re = lm ? Math.max(0.75, Math.min(RS, lm[i])) : RS;
    const t = d[i] >= re ? 1 : d[i] / re;
    hgt[i] = (re / S) * puff * Math.sqrt(t * (2 - t));
  }
  let dmix = null, dix = null;
  if (dents.length) {
    dmix = new Float32Array(N);
    dix = new Uint8Array(N);
    dents.forEach((dn, k) => {
      const da = dn.alpha;
      const dd = softDist(insideDist(da, W, H), W, H);
      const R2 = dn.R * S;
      for (let i = 0; i < N; i++) {
        if (da[i] <= 0 || alpha[i] <= 0) continue;
        const t = dd[i] >= R2 ? 1 : dd[i] / R2;
        const dep = Math.sqrt(t * (2 - t));
        hgt[i] -= dn.D * dep * Math.min(1, da[i] * 2);
        const m = da[i] * (0.35 + 0.65 * dep);
        if (m > dmix[i]) { dmix[i] = m; dix[i] = k; }
      }
    });
  }
  const { T, H: TH, M: TM } = tex;
  const ox = Math.floor(ihash(seed, 7, 1) * T), oy = Math.floor(ihash(seed, 8, 1) * T);
  const ta = o.tex ?? 1;
  if (ta) {
    for (let y = 0; y < H; y++) {
      const row = ((y + oy) % T) * T;
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (alpha[i] > 0) hgt[i] += ta * TH[row + ((x + ox) % T)];
      }
    }
  }
  hgt = smooth121(hgt, W, H);

  const img = tctx.createImageData(W, H);
  const out = img.data;
  const [cr, cg, cb] = rgbOf(o.col);
  const A = o.A ?? 0.5, K = o.K ?? 0.52, SP = (o.spec ?? 0.24) * 255, mo = o.mott ?? 0.12;
  const hS = S * 0.5;
  const dcols = dents.map((dn) => rgbOf(dn.col));
  const half = T >> 1;
  for (let y = 0; y < H; y++) {
    const row = ((y + oy) % T) * T, row2 = ((y + oy + half) % T) * T;
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const a = alpha[i];
      if (a <= 0) continue;
      const h0 = hgt[i];
      const gx = ((x < W - 1 ? hgt[i + 1] : h0) - (x > 0 ? hgt[i - 1] : h0)) * hS;
      const gy = ((y < H - 1 ? hgt[i + W] : h0) - (y > 0 ? hgt[i - W] : h0)) * hS;
      const nz = 1 / Math.sqrt(gx * gx + gy * gy + 1);
      const nx = -gx * nz, ny = -gy * nz;
      let F = (nx * LX + ny * LY + nz * LZ) / LZ;
      if (F < 0) F = 0;
      const nh = nx * HX + ny * HY + nz * HZ;
      let sp = 0;
      if (nh > 0) {
        const p2 = nh * nh, p4 = p2 * p2, p8 = p4 * p4;
        sp = p8 * p8 * p8;
      }
      const lum = (A + K * F) * (0.56 + 0.44 * nz);
      const tx = (x + ox) % T;
      const m1 = 1 + mo * (TM[row + tx] - 0.5) * 2;
      const m2 = 1 + mo * (TM[row2 + tx] - 0.5) * 2;
      let r = cr, g = cg, b = cb;
      if (dmix && dmix[i] > 0) {
        const dc = dcols[dix[i]], t = dmix[i];
        r += (dc[0] - r) * t; g += (dc[1] - g) * t; b += (dc[2] - b) * t;
      }
      const j = i * 4;
      out[j] = r * lum * m1 + sp * SP * 0.86;
      out[j + 1] = g * lum * (m1 + m2) * 0.5 + sp * SP * 0.9;
      out[j + 2] = b * lum * m2 + sp * SP;
      out[j + 3] = a * 255;
    }
  }
  return img;
}

function castShadow(octx, tctx, tmp, alpha, W, H, S, sh) {
  const r = Math.max(1, Math.round(sh.b * S * 0.5));
  const bl = boxBlur(boxBlur(alpha, W, H, r), W, H, r);
  const ox = Math.round(sh.x * S), oy = Math.round(sh.y * S);
  const img = tctx.createImageData(W, H);
  const d = img.data;
  for (let y = 0; y < H; y++) {
    const sy = y - oy;
    if (sy < 0 || sy >= H) continue;
    for (let x = 0; x < W; x++) {
      const sx = x - ox;
      if (sx < 0 || sx >= W) continue;
      const v = bl[sy * W + sx];
      if (v <= 0.003) continue;
      const j = (y * W + x) * 4;
      d[j] = 8; d[j + 1] = 4; d[j + 2] = 18; d[j + 3] = v * sh.a * 255;
    }
  }
  tctx.putImageData(img, 0, 0);
  octx.drawImage(tmp, 0, 0);
}

// A baked clay sprite: w x h logical px, the item's anchor at (ax, ay) inside it.
// `build(k)` calls k.lump(draw, opts) back to front; draw(ctx) paints a silhouette in
// the item's own coordinates (scaled by sc). Each lump casts its shadow, then is laid.
function sculpt(S, tex, w, h, ax, ay, build, sc = 1) {
  const W = Math.ceil(w * S), H = Math.ceil(h * S);
  const out = mk(W, H), octx = out.getContext('2d');
  const scr = mk(W, H), sctx = scr.getContext('2d', { willReadFrequently: true });
  const tmp = mk(W, H), tctx = tmp.getContext('2d');
  let n = 0;
  const raster = (draw) => {
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.clearRect(0, 0, W, H);
    sctx.setTransform(S * sc, 0, 0, S * sc, ax * S, ay * S);
    sctx.fillStyle = '#000';
    sctx.strokeStyle = '#000';
    sctx.lineCap = 'round';
    sctx.lineJoin = 'round';
    draw(sctx);
    const d = sctx.getImageData(0, 0, W, H).data;
    const a = new Float32Array(W * H);
    for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3] / 255;
    return a;
  };
  build({
    lump(draw, o) {
      const alpha = raster(draw);
      const dents = (o.dents || []).map((dn) => ({ ...dn, alpha: raster(dn.draw) }));
      const sh = o.shadow === undefined ? SH.part : o.shadow;
      if (sh) castShadow(octx, tctx, tmp, alpha, W, H, S, sh);
      const img = shadeLump(tctx, alpha, W, H, S, { ...o, ax, ay }, dents, tex, (o.seed ?? 0) * 31 + n * 7 + W);
      tctx.putImageData(img, 0, 0);
      octx.drawImage(tmp, 0, 0);
      n++;
    },
  });
  return { c: out, w: W / S, h: H / S, ax, ay };
}

function blit(ctx, sp, x, y, scale = 1) {
  ctx.drawImage(sp.c, x - sp.ax * scale, y - sp.ay * scale, sp.w * scale, sp.h * scale);
}

// ------------------------------------------------------------------ the sky board
// A board smeared with clay by thumb: shallow drag troughs with pushed-up lips, each
// smear a slightly different plum/indigo, lit by the same key, with the moon's glow.
function bakeSky(S, tex) {
  const X0 = -40, Y0 = -80, w = 560, h = 330;
  const W = w * S, H = h * S;
  const hgt = new Float32Array(W * H), tint = new Float32Array(W * H);
  for (let k = 0; k < 95; k++) {
    const cx = X0 + ihash(k, 1, 21) * w, cy = Y0 + 40 + ihash(k, 2, 21) * (h - 40);
    const len = 26 + ihash(k, 3, 21) * 64, wid = 6 + ihash(k, 4, 21) * 10;
    const ang = (ihash(k, 5, 21) - 0.5) * 0.6, bend = (ihash(k, 6, 21) - 0.5) * 1.4 * wid;
    const D = 0.3 + ihash(k, 7, 21) * 0.6, tn = ihash(k, 8, 21) - 0.5;
    const ca = Math.cos(ang), sa = Math.sin(ang), hl = len / 2, hw = wid / 2;
    const ext = hl + wid * 1.5;
    const px0 = Math.max(0, Math.floor((cx - ext - X0) * S)), px1 = Math.min(W - 1, Math.ceil((cx + ext - X0) * S));
    const py0 = Math.max(0, Math.floor((cy - ext - Y0) * S)), py1 = Math.min(H - 1, Math.ceil((cy + ext - Y0) * S));
    for (let py = py0; py <= py1; py++) {
      for (let px = px0; px <= px1; px++) {
        const dx = X0 + px / S - cx, dy = Y0 + py / S - cy;
        const s = (dx * ca + dy * sa) / hl;
        if (s <= -1.3 || s >= 1.3) continue;
        const v = ((-dx * sa + dy * ca) - bend * s * s) / hw;
        if (v <= -2 || v >= 2) continue;
        const env = smooth(-1.1, -0.3, s) * (1 - smooth(0.75, 1.0, s));
        const core = Math.max(0, 1 - v * v);
        const lipEnd = Math.exp(-(((s - 1.02) / 0.12) ** 2)) * Math.max(0, 1 - v * v / 1.4);
        const lipSide = Math.exp(-(((Math.abs(v) - 1.1) / 0.3) ** 2)) * env;
        const i = py * W + px;
        hgt[i] += D * (-0.8 * core * env + 0.6 * lipEnd + 0.35 * lipSide);
        tint[i] += tn * core * env;
      }
    }
  }
  const { T, H: TH, M: TM } = tex;
  for (let py = 0; py < H; py++) {
    const row = (py % T) * T;
    for (let px = 0; px < W; px++) hgt[py * W + px] += 0.55 * TH[row + (px % T)];
  }
  const hs = smooth121(hgt, W, H);
  const c = mk(W, H), cx = c.getContext('2d');
  const img = cx.createImageData(W, H), out = img.data;
  const stops = C.sky;
  const moon = CRYPT_PLAN.moon;
  const hS = S * 0.5;
  for (let py = 0; py < H; py++) {
    const y = Y0 + py / S;
    let k = 0;
    while (k < stops.length - 2 && y > stops[k + 1][0]) k++;
    const t = Math.max(0, Math.min(1, (y - stops[k][0]) / (stops[k + 1][0] - stops[k][0])));
    const a = stops[k][1], b = stops[k + 1][1];
    const br = a[0] + (b[0] - a[0]) * t, bg = a[1] + (b[1] - a[1]) * t, bb = a[2] + (b[2] - a[2]) * t;
    const row = (py % T) * T;
    for (let px = 0; px < W; px++) {
      const x = X0 + px / S;
      const i = py * W + px;
      const h0 = hs[i];
      const gx = ((px < W - 1 ? hs[i + 1] : h0) - (px > 0 ? hs[i - 1] : h0)) * hS;
      const gy = ((py < H - 1 ? hs[i + W] : h0) - (py > 0 ? hs[i - W] : h0)) * hS;
      const nz = 1 / Math.sqrt(gx * gx + gy * gy + 1);
      let F = ((-gx * LX - gy * LY) * nz + nz * LZ) / LZ;
      if (F < 0) F = 0;
      const lum = 1 + 0.42 * (F - 1);
      const rho = Math.hypot(x - moon.x, y - moon.y);
      const glow = 0.85 * Math.exp(-((rho / 46) ** 2)) + 0.4 * Math.exp(-((rho / 120) ** 2));
      const tn = tint[i] * 22;
      const m = (TM[row + (px % T)] - 0.5) * 10;
      const j = i * 4;
      out[j] = (br + tn * 0.8 + m + glow * 48) * lum;
      out[j + 1] = (bg + tn * 0.45 + m * 0.8 + glow * 42) * lum;
      out[j + 2] = (bb + tn * 1.1 + m * 1.1 + glow * 44) * lum;
      out[j + 3] = 255;
    }
  }
  cx.putImageData(img, 0, 0);
  return { c, x: X0, y: Y0, w, h, low: `rgb(${stops[stops.length - 1][1].join(',')})` };
}

// ------------------------------------------------------------------ sky props
function moonSprite(S, tex) {
  const r = CRYPT_PLAN.moon.r;
  const pad = 8;
  return sculpt(S, tex, 2 * r + pad * 2, 2 * r + pad * 2, r + pad, r + pad, (k) => {
    k.lump((c) => { c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); }, {
      col: C.moon, R: r, A: 0.8, K: 0.34, spec: 0.3, tex: 1.3, mott: 0.07, adapt: false,
      hfn: (x, y) => 0.55 * Math.sqrt(Math.max(0, r * r - x * x - y * y)) + thumbprint(x - 7, y - 3, 9.5, 1.35, 0.5),
      shadow: SH.sky,
      dents: [[-8, -5, 5], [6, 7, 4], [9, -9, 2.5], [-3, 10, 2], [-13, 8, 1.8]].map(([dx, dy, cr2]) => ({
        draw: (c) => { c.beginPath(); c.ellipse(dx, dy, cr2, cr2 * 0.9, 0.4, 0, TAU); c.fill(); },
        D: cr2 * 0.35, R: cr2 * 0.8, col: C.crater,
      })),
    });
  });
}

// A pressed thumb: a shallow bowl carrying the ridged loops of a fingerprint.
function thumbprint(x, y, r, sp, ang) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const u = x * ca + y * sa, v = (-x * sa + y * ca) / 0.78;
  const rho = Math.hypot(u, v);
  if (rho >= r) return 0;
  const q = 1 - (rho / r) ** 2;
  return q * (-1.1 + 0.16 * Math.sin(TAU * Math.hypot(u, v * 1.15 + 1.5) / sp));
}

function beadSprite(S, tex, col, r, o = {}) {
  return sculpt(S, tex, 2 * r + 2, 2 * r + 2, r + 1, r + 1, (k) => {
    k.lump((c) => { c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); }, {
      col, R: r, A: 0.85, K: 0.3, spec: 0.55, tex: 0.2, shadow: null, adapt: false, ...o,
    });
  });
}

function cloudSprite(S, tex, cl) {
  const { w, h } = cl;
  // The ink plan's four lobes, each rolled into a run of little clay balls.
  const lobes = [[0.18, 0.55, 0.22], [0.4, 0.35, 0.3], [0.64, 0.5, 0.24], [0.84, 0.62, 0.16]];
  return sculpt(S, tex, w + 20, h * 2 + 14, 10, h * 0.6 + 6, (k) => {
    k.lump((c) => {
      c.beginPath();
      lobes.forEach(([u, v, r], j) => {
        const half = r * w * 0.55;
        const n = Math.max(2, Math.round(half / (h * 0.45)));
        for (let q = 0; q <= n; q++) {
          const x = u * w - half + (2 * half * q) / n;
          const edge = 1 - Math.abs(q / n - 0.5) * 1.1;
          const rad = r * h * (1.25 + 0.5 * edge) * (0.85 + 0.3 * ihash(cl.u, j * 10 + q, 5));
          c.moveTo(x + rad, v * h);
          c.arc(x, v * h, rad, 0, TAU);
        }
      });
      c.fill();
      rr(c, w * 0.08, h * 0.5, w * 0.84, h * 0.5, h * 0.25);
      c.fill();
    }, { col: C.cloud, R: h * 0.45, spec: 0.2, tex: 0.8, shadow: SH.sky, A: 0.55, K: 0.5 });
  });
}

function batSprite(S, tex, frame) {
  const up = Math.cos(frame / 8 * TAU);
  return sculpt(S, tex, 26, 22, 13, 11, (k) => {
    k.lump((c) => {
      c.beginPath();
      c.moveTo(0, 0);
      c.quadraticCurveTo(-5, -4 * up - 2, -10, -6 * up);
      c.quadraticCurveTo(-8.4, -2.5, -8.5, -0.4);
      c.quadraticCurveTo(-7.2, -1.6, -5.8, 0.6);
      c.quadraticCurveTo(-4.4, -0.8, -3, 1.4);
      c.quadraticCurveTo(-1.5, 0.6, 0, 2);
      c.quadraticCurveTo(1.5, 0.6, 3, 1.4);
      c.quadraticCurveTo(4.4, -0.8, 5.8, 0.6);
      c.quadraticCurveTo(7.2, -1.6, 8.5, -0.4);
      c.quadraticCurveTo(8.4, -2.5, 10, -6 * up);
      c.quadraticCurveTo(5, -4 * up - 2, 0, 0);
      c.fill();
    }, { col: C.bat, R: 1, spec: 0.4, shadow: null, A: 0.62, K: 0.7 });
    k.lump((c) => {
      c.beginPath();
      c.ellipse(0, 0.6, 2, 2.7, 0, 0, TAU);
      c.fill();
      c.beginPath();
      c.moveTo(-1.6, -1.2); c.lineTo(-1.3, -3.9); c.lineTo(-0.2, -2); c.closePath();
      c.moveTo(1.6, -1.2); c.lineTo(1.3, -3.9); c.lineTo(0.2, -2); c.closePath();
      c.fill();
    }, { col: C.bat, R: 1.6, spec: 0.45, shadow: null, A: 0.62, K: 0.7 });
  });
}

// Cotton wool: a few round tufts pulled together, fuzzy and fibrous at the edge, lit
// on top. Laid at low alpha so the set shows through.
function puffSprite(S, v) {
  const w = 100, h = 36, W = w * S, H = h * S;
  const c = mk(W, H), cx = c.getContext('2d');
  const img = cx.createImageData(W, H), d = img.data;
  const [fr, fg, fb] = C.fog;
  const tufts = [];
  const n = 6 + v;
  for (let k = 0; k < n; k++) {
    const u = (k + 0.5) / n - 0.5;
    const r = (10 + ihash(k, v, 41) * 6) * (1 - 0.7 * u * u * 4 * 0.5);
    tufts.push([u * 74 + (ihash(k, v, 42) - 0.5) * 8, 3 - r * 0.45 + (ihash(k, v, 43) - 0.5) * 3, r]);
  }
  for (let py = 0; py < H; py++) {
    const ly = py / S - h / 2;
    for (let px = 0; px < W; px++) {
      const lx = px / S - w / 2;
      let e = -1, gx = 0, gy = 0;
      for (const [tx, ty, r] of tufts) {
        const dx = (lx - tx) / r, dy = (ly - ty) / (r * (ly > ty ? 0.62 : 0.9));
        const q = 1 - dx * dx - dy * dy;
        if (q > e) { e = q; gx = dx; gy = dy; }
      }
      if (ly > 9) e -= (ly - 9) * 0.18;
      const f1 = vnoise(lx / 1.8 + v * 17, ly / 1.6, 0, 60 + v);
      const f2 = vnoise(lx / 1.0, ly / 1.0 + v * 9, 0, 70 + v);
      e += 0.3 * (f1 - 0.5) + 0.1 * (f2 - 0.5) + 0.14 * (vnoise(lx / 5, ly / 5, 0, 80 + v) - 0.5);
      const a = smooth(0.0, 0.42, e);
      if (a <= 0) continue;
      const lit = Math.max(-1, Math.min(1, -gy * 0.8 + gx * 0.35));
      const shade = 0.8 + 0.2 * lit + 0.22 * (f1 - 0.5);
      const j = (py * W + px) * 4;
      d[j] = fr * shade; d[j + 1] = fg * shade; d[j + 2] = fb * shade; d[j + 3] = a * 255;
    }
  }
  cx.putImageData(img, 0, 0);
  return c;
}

// ------------------------------------------------------------------ ridges
function bakeStrip(S, tex, name, o) {
  const L = CRYPT_PLAN[name];
  const P = L.period, M = 24;
  let minY = Infinity;
  for (let u = 0; u < P; u += 1) minY = Math.min(minY, L.profile(u, P));
  const y0 = Math.floor(minY - 22), y1 = 252;
  const sp = sculpt(S, tex, P + 2 * M, y1 - y0, M, -y0, (k) => {
    k.lump((c) => {
      c.beginPath();
      c.moveTo(-M - 4, y1 + 30);
      for (let u = -M - 4; u <= P + M + 4; u += 1) c.lineTo(u, L.profile(u, P));
      c.lineTo(P + M + 4, y1 + 30);
      c.closePath();
      c.fill();
    }, { ...o, adapt: false, shadow: SH.ridge });
  });
  return { ...sp, P, M, y0 };
}

function drawStrip(ctx, st, shift, S) {
  const { P, M } = st;
  const off = (((-shift) % P) + P) % P;
  for (let x = off - P; x < 520; x += P) {
    if (x + P < -40) continue;
    ctx.drawImage(st.c, M * S, 0, P * S, st.c.height, x, st.y0, P, st.h);
  }
}

// ------------------------------------------------------------------ items
function treeLimbs(s, L) {
  return [
    { pts: [0, 1, L * 4 * s, -26 * s, L * 8 * s, -50 * s], w0: 1.3, w1: 0.5 },
    { pts: [L * 3 * s, -20 * s, -12 * s, -32 * s, -17 * s, -42 * s], w0: 0.8, w1: 0.34 },
    { pts: [-12 * s, -32 * s, -21 * s, -34 * s], w0: 0.52, w1: 0.3 },
    { pts: [L * 5 * s, -30 * s, 13 * s, -40 * s, 20 * s, -42 * s], w0: 0.8, w1: 0.34 },
    { pts: [13 * s, -40 * s, 15 * s, -49 * s], w0: 0.52, w1: 0.3 },
    { pts: [L * 7 * s, -42 * s, -3 * s, -52 * s], w0: 0.55, w1: 0.3 },
  ];
}

function drawTree(c, dx, s, lean, W) {
  c.save();
  c.translate(dx, 0);
  for (const l of treeLimbs(s, lean)) snake(c, l.pts, l.w0 * W * s, l.w1 * W * s);
  snake(c, [0, 0, -4 * s, 2 * s], 1.1 * W * s, 0.45 * W * s);
  snake(c, [0, 0, 4.5 * s, 2 * s], 1.1 * W * s, 0.45 * W * s);
  c.restore();
}

function abbeySprite(S, tex, it) {
  const s = it.s;
  const win = (x, y, w, h) => (c) => { c.beginPath(); lancet(c, x, y, w, h); c.fill(); };
  return sculpt(S, tex, 136 * s, 106 * s, 68 * s, 96 * s, (k) => {
    k.lump((c) => {
      roundPoly(c, [[-54, 4], [-54, -24], [-48, -30], [-40, -28], [-34, -36], [-22, -34], [-16, -40],
        [-8, -37], [2, -40], [2, 4]], 2.4);
      c.fill();
    }, {
      col: C.bgStone, R: 2.6, shadow: SH.far,
      dents: [{ draw: (c) => { c.beginPath(); for (const x of [-42, -27, -12]) lancet(c, x, -6, 8, 20); c.fill(); }, D: 2.6, R: 1.4, col: C.bgWin }],
    });
    k.lump((c) => {
      roundPoly(c, [[18, 4], [18, -26], [28, -34], [32, -30], [38, -36], [50, -24], [50, 4]], 2.4);
      c.fill();
    }, {
      col: C.bgStone, R: 2.6, shadow: SH.far,
      dents: [{ draw: (c) => { c.beginPath(); c.arc(34, -17, 4.8, 0, TAU); c.fill(); }, D: 2.4, R: 1.4, col: C.bgWin }],
    });
    k.lump((c) => { rr(c, 1.5, -54, 17, 58, 2.2); c.fill(); }, {
      col: C.bgTower, R: 2.8, shadow: SH.far,
      dents: [{ draw: win(10, -36, 5, 10), D: 2, R: 1.1, col: C.bgWin }],
    });
    k.lump((c) => { roundPoly(c, [[-0.5, -52], [10, -86.5], [20.5, -52]], 2); c.fill(); }, {
      col: C.bgRoof, R: 2.6, shadow: SH.part,
    });
    k.lump((c) => { rr(c, -1.5, -55.5, 23, 4.5, 1.8); c.fill(); }, { col: C.bgTower, R: 1.6 });
    k.lump((c) => {
      c.beginPath();
      for (const [x, y, r] of [[-58, 1, 3.4], [-61.5, 3, 2.2], [53.5, 2, 2.8]]) { c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU); }
      c.fill();
    }, { col: C.bgStone, R: 2.2, shadow: SH.far });
  }, s);
}

function groveSprite(S, tex, it) {
  const n = 3 + (it.i % 3);
  const s = it.s;
  return sculpt(S, tex, 96 * s, 48 * s, 48 * s, 42 * s, (k) => {
    k.lump((c) => {
      for (let j = 0; j < n; j++) {
        const dx = (j - (n - 1) / 2) * 12 + (seeded(it.i * 7 + j) - 0.5) * 6;
        const sc = 0.42 + seeded(it.i * 11 + j) * 0.24;
        c.save();
        c.translate(0, 2);
        drawTree(c, dx, sc, (seeded(j + it.i) - 0.5) * 0.6, 4.4);
        c.restore();
      }
    }, { col: C.bgTree, R: 1.3, shadow: SH.far, spec: 0.2 });
  }, s);
}

function mausoleumSprite(S, tex, it) {
  const s = it.s;
  return sculpt(S, tex, 62 * s, 68 * s, 31 * s, 62 * s, (k) => {
    k.lump((c) => { rr(c, -24.5, -4, 49, 6.5, 2); c.fill(); }, { col: C.tombLit, R: 1.6, shadow: SH.item });
    k.lump((c) => { rr(c, -20.5, -8.5, 41, 5.2, 1.8); c.fill(); }, { col: C.tombLit, R: 1.5 });
    k.lump((c) => { rr(c, -18, -32.5, 36, 25, 2.2); c.fill(); }, {
      col: C.tomb, R: 2.4,
      dents: [{ draw: (c) => { c.beginPath(); lancet(c, 0, -7.5, 12, 16); c.fill(); }, D: 3.4, R: 1.7, col: C.door }],
    });
    for (const x of [-15.5, 11.5]) k.lump((c) => { rr(c, x, -31.5, 4.2, 23.5, 2.1); c.fill(); }, { col: C.tombLit, R: 2.1 });
    if (it.variant === 1) {
      k.lump((c) => { c.beginPath(); c.ellipse(0, -35, 14, 14.5, 0, Math.PI, 0); c.closePath(); c.fill(); }, {
        col: C.tomb, R: 9, puff: 0.8, adapt: false,
      });
      k.lump((c) => { rr(c, -21, -37.5, 42, 5.5, 2); c.fill(); }, { col: C.tombLit, R: 1.8 });
      k.lump((c) => { snake(c, [0, -48, 0, -57], 1.9, 1.5); snake(c, [-3.2, -53.5, 3.2, -53.5], 1.6, 1.6); }, { col: C.tombLit, R: 0.9 });
    } else {
      k.lump((c) => { roundPoly(c, [[-23.5, -31], [0, -45], [23.5, -31]], 2.4); c.fill(); }, {
        col: C.tombLit, R: 2.4,
        dents: [{ draw: (c) => { c.beginPath(); c.arc(0, -35.5, 2.3, 0, TAU); c.fill(); }, D: 1.2, R: 0.9, col: C.door }],
      });
    }
  }, s);
}

function stoneSprite(S, tex, it) {
  const s = it.s;
  const lean = (seeded(it.i * 3.3) - 0.5) * 0.26;
  const col = C.stones[it.i % 3];
  const T = (c) => { c.translate(0, 1); c.rotate(lean); c.scale(s, s); };
  return sculpt(S, tex, 22, 32, 12, 27, (k) => {
    if (it.variant === 2) {
      k.lump((c) => { T(c); rr(c, -4.3, -3.6, 8.6, 4.2, 1.3); c.fill(); }, { col, R: 1.3, shadow: SH.item });
      k.lump((c) => { T(c); roundPoly(c, [[-2.8, -3], [-1.9, -17.5], [0, -21], [1.9, -17.5], [2.8, -3]], 1.1); c.fill(); }, {
        col, R: 1.5, shadow: SH.item,
      });
    } else if (it.variant === 1) {
      k.lump((c) => { T(c); roundPoly(c, [[-5, 0.5], [-5, -12], [-1.6, -12], [0, -14.3], [1.6, -12], [5, -12], [5, 0.5]], 1.4); c.fill(); }, {
        col, R: 1.7, shadow: SH.item,
        dents: [{ draw: (c) => { T(c); c.lineWidth = 0.9; c.beginPath(); c.moveTo(-2.4, -8.5); c.lineTo(2.4, -8.5); c.moveTo(-2.4, -5.6); c.lineTo(2.4, -5.6); c.stroke(); }, D: 0.55, R: 0.4, col: C.stoneDent }],
      });
    } else {
      k.lump((c) => { T(c); c.beginPath(); c.moveTo(-4.6, 0.5); c.lineTo(-4.6, -9); c.arc(0, -9, 4.6, Math.PI, 0); c.lineTo(4.6, 0.5); c.closePath(); c.fill(); }, {
        col, R: 1.8, shadow: SH.item,
        dents: [{ draw: (c) => { T(c); c.lineWidth = 1; c.beginPath(); c.moveTo(0, -11); c.lineTo(0, -4.5); c.moveTo(-2, -8.8); c.lineTo(2, -8.8); c.stroke(); }, D: 0.6, R: 0.45, col: C.stoneDent }],
      });
    }
  });
}

function crossSprite(S, tex, it) {
  const lean = (seeded(it.i * 5.1) - 0.5) * 0.18;
  const col = C.stones[(it.i + 1) % 3];
  const T = (c) => { c.translate(0, 1); c.rotate(lean); c.scale(it.s, it.s); };
  return sculpt(S, tex, 24, 32, 12, 28, (k) => {
    if (it.i % 2 === 0) {
      k.lump((c) => { T(c); c.lineWidth = 1.8; c.beginPath(); c.arc(0, -13.6, 4.2, 0, TAU); c.stroke(); }, { col, R: 0.9, shadow: SH.item });
    }
    k.lump((c) => {
      T(c);
      c.lineWidth = 3.4;
      c.beginPath();
      c.moveTo(0, -0.4); c.lineTo(0, -18.3);
      c.moveTo(-4.4, -12.9); c.lineTo(4.4, -12.9);
      c.stroke();
    }, { col, R: 1.7, shadow: SH.item });
  });
}

function treeSprite(S, tex, it) {
  const s = it.s;
  const lean = it.variant === 1 ? -0.8 : 0.2;
  return sculpt(S, tex, 66 * s, 64 * s, 34 * s, 58 * s, (k) => {
    k.lump((c) => drawTree(c, 0, 1, lean, 4.4), {
      col: C.midTree, R: 2.6, shadow: SH.item, spec: 0.22,
      dents: [{ draw: (c) => { c.beginPath(); c.ellipse(lean * 1.5, -14, 0.9, 1.5, 0, 0, TAU); c.fill(); }, D: 1, R: 0.6, col: C.knot }],
    });
  }, s);
}

function gnarlSprite(S, tex, it) {
  const s = it.s;
  const f = it.variant === 1 ? -1 : 1;
  const P = (pts) => pts.map((v, j) => (j % 2 === 0 ? v * f : v));
  return sculpt(S, tex, 156 * s, 140 * s, 78 * s, 130 * s, (k) => {
    k.lump((c) => {
      snake(c, P([0, 2, -4, -30, 4, -58, 0, -86]), 14, 6.5);
      snake(c, P([2, -50, 24, -66, 44, -64, 58, -74]), 7, 2.4);
      snake(c, P([44, -64, 52, -56, 62, -58]), 3.8, 1.8);
      snake(c, P([30, -66, 36, -82, 48, -92]), 4.2, 1.8);
      snake(c, P([0, -80, -14, -100, -26, -104]), 5.8, 2.2);
      snake(c, P([-14, -100, -12, -114]), 3.2, 1.5);
      snake(c, P([1, -84, 14, -104, 30, -112, 38, -124]), 5.2, 1.9);
      snake(c, P([20, -107, 28, -100, 36, -102]), 3, 1.4);
      snake(c, P([-2, -36, -18, -46, -26, -44]), 4.6, 1.8);
      snake(c, P([-4, 0, -12, 2.5, -18, 4]), 7, 2.6);
      snake(c, P([4, 0, 12, 2.5, 17, 4]), 6.5, 2.4);
    }, {
      col: C.fgTree, R: 3.4, shadow: SH.fg, spec: 0.26,
      dents: [{
        draw: (c) => {
          c.lineWidth = 0.9;
          c.beginPath();
          for (let j = 0; j < 6; j++) {
            const y = -8 - j * 11;
            c.moveTo(-6 * f, y); c.quadraticCurveTo(0, y - 3, 6 * f, y - 7);
          }
          c.stroke();
        },
        D: 0.9, R: 0.45, col: C.knot,
      }, {
        draw: (c) => { c.beginPath(); c.ellipse(-1 * f, -44, 1.7, 2.8, 0.2 * f, 0, TAU); c.fill(); },
        D: 2.2, R: 1, col: C.knot,
      }],
    });
  }, s);
}

function grassSprite(S, tex, it) {
  const s = it.s;
  const tips = [];
  return sculpt(S, tex, 30, 26, 15, 21, (k) => {
    k.lump((c) => {
      for (let j = 0; j < 7; j++) {
        const dx = (j - 3) * 2.2 * s;
        const h = (7 + seeded(it.i * 13 + j) * 7) * s;
        const bend = (seeded(it.i + j * 5) - 0.4) * 6 * s;
        snake(c, [dx, 2.5, dx + bend * 0.4, -h * 0.6, dx + bend, -h], 1.9, 0.55);
        tips.push([dx + bend, -h, h]);
      }
    }, { col: C.grass, R: 1, shadow: SH.fg, spec: 0.1, tex: 0.5, A: 0.62, K: 0.34 });
    const heads = tips.slice().sort((a, b) => b[2] - a[2]).slice(0, it.i % 2 === 0 ? 2 : 1);
    k.lump((c) => {
      c.beginPath();
      for (const [x, y] of heads) { c.moveTo(x + 1.6, y - 0.6); c.ellipse(x, y - 0.6, 1.6, 1.9, 0, 0, TAU); }
      c.fill();
    }, { col: C.thistle, R: 1.6, shadow: SH.part, spec: 0.3, adapt: false });
  });
}

function lampSprite(S, tex, it) {
  const s = it.s;
  return sculpt(S, tex, 26 * s, 62 * s, 13 * s, 56 * s, (k) => {
    k.lump((c) => { rr(c, -4, -3.4, 8, 4.4, 1.6); c.fill(); }, { col: C.post, R: 1.5, shadow: SH.fg });
    k.lump((c) => {
      snake(c, [0, -2, 0, -35], 3.2, 2.3);
      c.beginPath(); c.ellipse(0, -35.4, 2.8, 1.4, 0, 0, TAU); c.fill();
    }, { col: C.post, R: 1.6, shadow: SH.fg, spec: 0.35 });
    k.lump((c) => {
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(-4.4, -36.6); c.lineTo(-3.7, -44.8);
      c.moveTo(4.4, -36.6); c.lineTo(3.7, -44.8);
      c.moveTo(-4.8, -36.6); c.lineTo(4.8, -36.6);
      c.stroke();
    }, { col: C.post, R: 0.6, shadow: null, spec: 0.4 });
    k.lump((c) => {
      roundPoly(c, [[-6.4, -44.2], [0, -50.6], [6.4, -44.2]], 1.3);
      c.fill();
      c.beginPath(); c.arc(0, -51.4, 1.4, 0, TAU); c.fill();
    }, { col: C.post, R: 1.5, shadow: null, spec: 0.4 });
  }, s);
}

function fenceSprite(S, tex, it, L) {
  const span = it.x1 - it.x0;
  const base = L.ridge(it.x0);
  const yb = (du) => L.ridge(it.x0 + du) - base;
  const gate = it.gate == null ? null : it.gate - it.x0;
  const gh = 15;
  let minB = 0, maxB = 0;
  for (let du = -2; du <= span + 2; du += 1) { minB = Math.min(minB, yb(du)); maxB = Math.max(maxB, yb(du)); }
  const gb = gate == null ? 0 : L.foot(it.gate, gh) - base;
  const bars = [];
  for (let du = 0; du <= span; du += 7) {
    if (gate != null && Math.abs(du - gate) < gh + 2) continue;
    bars.push(du);
  }
  const runs = gate == null ? [[0, span]] : [[0, gate - gh], [gate + gh, span]];
  return sculpt(S, tex, span + 24, maxB - minB + 54, 12, 46 - minB, (k) => {
    k.lump((c) => {
      c.lineWidth = 1.8;
      c.beginPath();
      for (const x of bars) { const b = yb(x); c.moveTo(x, b + 1.5); c.lineTo(x, b - 20); }
      c.stroke();
      c.beginPath();
      for (const x of bars) {
        const b = yb(x);
        c.moveTo(x, b - 26); c.quadraticCurveTo(x + 2.6, b - 21, x, b - 19.5); c.quadraticCurveTo(x - 2.6, b - 21, x, b - 26);
      }
      c.fill();
      c.lineWidth = 1.6;
      c.beginPath();
      for (const [a, b] of runs) {
        for (const hh of [5, 16]) {
          for (let x = a; x <= b; x += 2) { const y = yb(x) - hh; if (x === a) c.moveTo(x, y); else c.lineTo(x, y); }
        }
      }
      c.stroke();
    }, { col: C.iron, R: 1.1, spec: 0.5, shadow: SH.fg, A: 0.6, K: 0.62 });
    if (gate != null) {
      const g = gate, b = gb;
      k.lump((c) => {
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(g - gh, b - 26); c.quadraticCurveTo(g, b - 40, g + gh, b - 26);
        for (let x = g - gh + 5; x < g + gh - 2; x += 5) { c.moveTo(x, b + 1); c.lineTo(x, b - 26 - 6 * Math.cos((x - g) / gh * 1.4)); }
        c.moveTo(g - gh, b - 12); c.lineTo(g + gh, b - 12);
        c.stroke();
      }, { col: C.iron, R: 0.9, spec: 0.5, shadow: SH.fg, A: 0.6, K: 0.62 });
      k.lump((c) => {
        c.lineWidth = 3.4;
        c.beginPath();
        c.moveTo(g - gh, b + 1.5); c.lineTo(g - gh, b - 32);
        c.moveTo(g + gh, b + 1.5); c.lineTo(g + gh, b - 32);
        c.stroke();
        c.beginPath();
        for (const x of [g - gh, g + gh]) { c.moveTo(x + 2.7, b - 34.5); c.arc(x, b - 34.5, 2.7, 0, TAU); }
        c.fill();
      }, { col: C.iron, R: 1.7, spec: 0.55, shadow: SH.fg, A: 0.6, K: 0.62 });
    }
  });
}

function itemSprite(S, tex, it, L) {
  switch (it.kind) {
    case 'abbey': return abbeySprite(S, tex, it);
    case 'grove': return groveSprite(S, tex, it);
    case 'mausoleum': return mausoleumSprite(S, tex, it);
    case 'stone': return stoneSprite(S, tex, it);
    case 'cross': return crossSprite(S, tex, it);
    case 'tree': return treeSprite(S, tex, it);
    case 'gnarl': return gnarlSprite(S, tex, it);
    case 'grass': return grassSprite(S, tex, it);
    case 'lamp': return lampSprite(S, tex, it);
    case 'fence': return fenceSprite(S, tex, it, L);
    default: return null;
  }
}

// ------------------------------------------------------------------ the cache
const BAKES = new Map();

function bake(S) {
  let B = BAKES.get(S);
  if (B) return B;
  const tex = buildTex(S);
  B = {
    S, tex,
    sky: bakeSky(S, tex),
    moon: moonSprite(S, tex),
    star: beadSprite(S, tex, C.star, 2, { A: 0.95, K: 0.25 }),
    bead: beadSprite(S, tex, C.bead, 3.3, { A: 1.05, K: 0.22, spec: 0.6 }),
    bats: Array.from({ length: 8 }, (_, k) => batSprite(S, tex, k)),
    puffs: [0, 1, 2].map((v) => puffSprite(S, v)),
    clouds: CRYPT_PLAN.clouds.items.map((cl) => cloudSprite(S, tex, cl)),
    strips: {
      bg: bakeStrip(S, tex, 'bg', { col: C.bgRidge, R: 5, spec: 0.2, mott: 0.1 }),
      mid: bakeStrip(S, tex, 'mid', { col: C.midRidge, R: 5, spec: 0.2, mott: 0.16 }),
      fg: bakeStrip(S, tex, 'fg', { col: C.fgBank, R: 3.5, spec: 0.14, mott: 0.12, K: 0.4, A: 0.6 }),
    },
    items: new Map(),
  };
  BAKES.set(S, B);
  return B;
}

function spriteFor(B, name, it, L) {
  const key = `${name}:${it.kind}:${it.i}`;
  let sp = B.items.get(key);
  if (sp === undefined) {
    sp = itemSprite(B.S, B.tex, it, L);
    B.items.set(key, sp);
  }
  return sp;
}

function pickS(ctx) {
  let a = 2;
  try {
    const m = ctx.getTransform();
    a = Math.hypot(m.a, m.b);
  } catch { /* older canvases: assume 2x */ }
  return a > 2.2 ? 3 : 2;
}

// ------------------------------------------------------------------ painting
function paintSky(ctx, f, B) {
  const sk = B.sky;
  ctx.drawImage(sk.c, sk.x, sk.y, sk.w, sk.h);
  ctx.fillStyle = sk.low;
  ctx.fillRect(-40, sk.y + sk.h - 1, 560, 360 - (sk.y + sk.h));
  for (const s of f.stars) {
    const d = 1.1 + s.s * 1.35;
    ctx.globalAlpha = s.twinkle;
    blit(ctx, B.star, s.x, s.y, d / 4);
  }
  ctx.globalAlpha = 1;
  blit(ctx, B.moon, f.moon.x, f.moon.y);
  for (const c of f.clouds) blit(ctx, B.clouds[c.i], c.x, c.y);
  for (const b of f.bats) {
    const k = Math.floor(b.flap * 8) % 8;
    blit(ctx, B.bats[k], b.x, b.y, b.s);
  }
}

function paintFog(ctx, band, B, alpha) {
  ctx.globalAlpha = alpha;
  for (const p of band.puffs) {
    const w = p.rx * 2.4, h = p.ry * 3.2;
    ctx.drawImage(B.puffs[p.i % 3], p.x - w / 2, p.y - h * 0.55, w, h);
  }
  ctx.globalAlpha = 1;
}

function lampFlicker(t, i) {
  return 0.9 + 0.1 * Math.sin(t * 11 + i) * Math.sin(t * 7.3 + i * 0.7);
}

function paintLamp(ctx, it, sp, B, t) {
  const s = it.s, x = it.x, y = it.y + 1;
  const fl = lampFlicker(t, it.i);
  const by = y - 40.6 * s;
  const halo = ctx.createRadialGradient(x, by, 0.5, x, by, 7 * s);
  halo.addColorStop(0, `rgba(255,214,130,${0.85 * fl})`);
  halo.addColorStop(1, 'rgba(255,190,100,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(x - 8 * s, by - 8 * s, 16 * s, 16 * s);
  blit(ctx, B.bead, x, by, s);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.25 * fl;
  blit(ctx, B.bead, x, by, s);
  ctx.restore();
  blit(ctx, sp, x, y);
}

function paintLampGlow(ctx, it, t) {
  const s = it.s, x = it.x, y = it.y + 1;
  const fl = lampFlicker(t, it.i);
  const by = y - 40.6 * s;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const g = ctx.createRadialGradient(x, by, 2, x, by, 38 * s);
  g.addColorStop(0, `rgba(255,178,92,${0.4 * fl})`);
  g.addColorStop(0.45, `rgba(230,140,80,${0.14 * fl})`);
  g.addColorStop(1, 'rgba(200,120,80,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 40 * s, by - 40 * s, 80 * s, 80 * s);
  ctx.restore();
}

function paintLayer(ctx, f, B, name) {
  const L = f.layers[name];
  for (const it of L.items) if (it.kind === 'abbey') blit(ctx, spriteFor(B, name, it, L), it.x, it.y);
  drawStrip(ctx, B.strips[name], L.shift, B.S);
  if (name === 'fg') {
    // Under the lane: the bank simply carries on, so nothing can show through.
    ctx.fillStyle = C.fgBank;
    ctx.fillRect(-40, 250, 560, 100);
  }
  const lamps = [];
  for (const it of L.items) {
    if (it.kind === 'abbey') continue;
    const sp = spriteFor(B, name, it, L);
    if (!sp) continue;
    if (it.kind === 'fence') blit(ctx, sp, it.x0, L.ridge(it.x0));
    else if (it.kind === 'lamp') { paintLamp(ctx, it, sp, B, f.t); lamps.push(it); }
    else if (it.kind === 'stone' || it.kind === 'cross') blit(ctx, sp, it.x, it.y);
    else blit(ctx, sp, it.x, it.y + (it.kind === 'mausoleum' ? 0.5 : 1));
  }
  for (const it of lamps) paintLampGlow(ctx, it, f.t);
}

export const STYLE = {
  id: 'plasticine',
  name: 'PLASTICINE',
  note: 'A stop-motion clay set: every shape a rolled, thumb-printed lump lit from the moon side, with a waxy '
    + 'sheen and a soft contact shadow on the layer behind. Clay-smeared sky board, cotton-wool fog.',
  paint(ctx, f) {
    const B = bake(pickS(ctx));
    paintSky(ctx, f, B);
    paintLayer(ctx, f, B, 'bg');
    paintLayer(ctx, f, B, 'mid');
    paintFog(ctx, f.fog[0], B, 0.28);
    paintLayer(ctx, f, B, 'fg');
    paintFog(ctx, f.fog[1], B, 0.26);
  },
};
