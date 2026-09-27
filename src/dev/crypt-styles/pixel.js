// CRYPT style bake-off — 16-BIT PIXEL ART. A late SNES / Mega Drive castle-stage
// backdrop: the whole scene is painted into a half-resolution index buffer (one art
// pixel = 2 frame px) on a strict 16-colour palette, then blitted 2x with smoothing
// off. No anti-aliasing and no alpha anywhere in the art: every gradient, glow and
// mist is ordered (Bayer 4x4) dithering between palette steps, every line a pixel run.
//
// Light comes from the moon, upper right: right-facing and top edges catch a rim pixel,
// left edges fall to shadow. Far layer is outline-less and hazy, the graveyard props
// get 1px dark outlines, the near bank is a rim-lit silhouette. The gas lamp is the one
// warm ramp in the palette.
//
// Parallax is snapped per layer to whole art pixels, so a layer's ridge and its props
// step together and nothing shimmers against its own ground.

const AW = 280; // art buffer, covering frame x -40..520
const AH = 216; //                  and frame y -80..352
const OX = 20; // art px of overscan left of frame x 0
const OY = 40; // art px of overscan above frame y 0
const T = 255; // transparent, in sprites

const HEX = [
  '#0a0716', // INK   outline, iron
  '#140f29', // N1    top of the sky, near bank
  '#1f1840', // N2    sky, graveyard hill
  '#2c2253', // N3    low sky, shade
  '#3d3066', // N4    far ridge, stone
  '#51437d', // N5    lit stone, cloud
  '#685c96', // N6    moonlit rim
  '#8479b2', // N7    bright rim
  '#aaa3d4', // N8    stars, moon halo
  '#f0e9cb', // MOON
  '#c8bd95', // MSH   moon maria
  '#4b2b41', // W1    lamp spill on the dark
  '#a0583a', // W2    lamp spill, near
  '#f2a54c', // W3    lamp glass
  '#ffe79c', // W4    lamp flame
  '#744450', // WR    lamp spill on stone
];
const INK = 0, N1 = 1, N2 = 2, N3 = 3, N4 = 4, N5 = 5, N6 = 6, N7 = 7, N8 = 8;
const MOON = 9, MSH = 10, W1 = 11, W2 = 12, W3 = 13, W4 = 14, WR = 15;

// One step up the ramp (moon glow), one step toward the mist tone (fog), one step warmer
// (lamp spill). Indexed by palette colour.
const LIGHTER = Uint8Array.from([N1, N2, N3, N4, N5, N6, N7, N8, MOON, MOON, MOON, WR, W3, W4, W4, W2]);
const DARKER = Uint8Array.from([INK, INK, N1, N2, N3, N4, N5, N6, N7, MSH, N8, W1, WR, W2, W3, W1]);
const MIST = N5;
const FOGSTEP = Uint8Array.from(HEX.map((_, c) => (c <= N8 ? (c < MIST ? c + 1 : c > MIST ? c - 1 : c) : c)));
const WARM = Uint8Array.from([W1, W1, W1, W1, WR, WR, WR, WR, W2, W4, W4, WR, W3, W4, W4, W2]);

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bay = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];
// A 0..n level, quantised to quarter steps, resolved to whole steps by the dither.
function dsteps(level, x, y) {
  if (level <= 0) return 0;
  const base = Math.floor(level);
  const q = Math.floor((level - base) * 5) / 4;
  return base + (q > bay(x, y) ? 1 : 0);
}

function hash(n) {
  const x = Math.sin(n * 127.1 + 74.7) * 43758.5453;
  return x - Math.floor(x);
}

// ------------------------------------------------------------------ buffer
let S = null;
let B = null;
function surface() {
  if (S) return S;
  const cv = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(AW, AH)
    : Object.assign(document.createElement('canvas'), { width: AW, height: AH });
  const cx = cv.getContext('2d');
  const img = cx.createImageData(AW, AH);
  S = {
    cv, cx, img,
    u32: new Uint32Array(img.data.buffer),
    buf: new Uint8Array(AW * AH),
    lut: Uint32Array.from(HEX, (h) => {
      const n = parseInt(h.slice(1), 16);
      return (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | (n >> 16)) >>> 0;
    }),
  };
  return S;
}

function px(x, y, c) {
  if (x >= 0 && x < AW && y >= 0 && y < AH) B[y * AW + x] = c;
}
function remapAt(x, y, map, n = 1) {
  if (x < 0 || x >= AW || y < 0 || y >= AH) return;
  const i = y * AW + x;
  let c = B[i];
  for (let k = 0; k < n; k++) c = map[c];
  B[i] = c;
}

// ------------------------------------------------------------------ sprites
// A sprite is an index grid in local coords with the anchor (usually the foot) at 0,0.
function spr(x0, y0, x1, y1) {
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  return { x0, y0, w, h, d: new Uint8Array(w * h).fill(T) };
}
function sg(sp, x, y) {
  x -= sp.x0; y -= sp.y0;
  return x < 0 || y < 0 || x >= sp.w || y >= sp.h ? T : sp.d[y * sp.w + x];
}
function ss(sp, x, y, c) {
  x -= sp.x0; y -= sp.y0;
  if (x >= 0 && y >= 0 && x < sp.w && y < sp.h) sp.d[y * sp.w + x] = c;
}
function srect(sp, x, y, w, h, c) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) ss(sp, i, j, c);
}
function sline(sp, x0, y0, x1, y1, c) {
  x0 = Math.floor(x0); y0 = Math.floor(y0); x1 = Math.floor(x1); y1 = Math.floor(y1);
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    ss(sp, x0, y0, c);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
function sdisc(sp, cx, cy, r, c) {
  const r2 = r * r;
  for (let j = Math.floor(cy - r) - 1; j <= Math.ceil(cy + r); j++) {
    for (let i = Math.floor(cx - r) - 1; i <= Math.ceil(cx + r); i++) {
      const dx = i + 0.5 - cx, dy = j + 0.5 - cy;
      if (dx * dx + dy * dy <= r2) ss(sp, i, j, c);
    }
  }
}
// A tapering limb: pixel runs where it is thin, stamped pixel discs where it is thick.
function limb(sp, pts, r0, r1, c) {
  let total = 0;
  for (let k = 2; k < pts.length; k += 2) total += Math.hypot(pts[k] - pts[k - 2], pts[k + 1] - pts[k - 1]);
  let run = 0;
  for (let k = 2; k < pts.length; k += 2) {
    const ax = pts[k - 2], ay = pts[k - 1], bx = pts[k], by = pts[k + 1];
    const len = Math.hypot(bx - ax, by - ay);
    const ra = r0 + (r1 - r0) * (run / total);
    const rb = r0 + (r1 - r0) * ((run + len) / total);
    if (Math.max(ra, rb) < 0.75) {
      sline(sp, ax, ay, bx, by, c);
    } else {
      const n = Math.max(1, Math.ceil(len / 0.4));
      for (let q = 0; q <= n; q++) {
        const u = q / n;
        const r = ra + (rb - ra) * u;
        const x = Math.floor(ax + (bx - ax) * u) + 0.5;
        const y = Math.floor(ay + (by - ay) * u) + 0.5;
        if (r < 0.75) ss(sp, Math.floor(x), Math.floor(y), c);
        else sdisc(sp, x, y, r, c);
      }
    }
    run += len;
  }
}
// Per-pixel pass with the exposure of each side: fn(c, right, top, left, bottom, x, y).
function edges(sp, fn) {
  const m = sp.d.slice();
  const { w, h } = sp;
  const E = (i, j) => i < 0 || j < 0 || i >= w || j >= h || m[j * w + i] === T;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const c = m[j * w + i];
      if (c === T) continue;
      sp.d[j * w + i] = fn(c, E(i + 1, j), E(i, j - 1), E(i - 1, j), E(i, j + 1), i + sp.x0, j + sp.y0, E);
    }
  }
}
// 1px outline on the 4-neighbours; corners stay open, which rounds small shapes.
function outline(sp, c, maxY = 0) {
  const m = sp.d.slice();
  const { w, h } = sp;
  const O = (i, j) => i >= 0 && j >= 0 && i < w && j < h && m[j * w + i] !== T;
  for (let j = 0; j < h; j++) {
    if (j + sp.y0 > maxY) continue;
    for (let i = 0; i < w; i++) {
      if (m[j * w + i] !== T) continue;
      if (O(i + 1, j) || O(i - 1, j) || O(i, j + 1) || O(i, j - 1)) sp.d[j * w + i] = c;
    }
  }
}
function stamp(sp, ax, ay) {
  const { x0, y0, w, h, d } = sp;
  for (let j = 0; j < h; j++) {
    const y = ay + y0 + j;
    if (y < 0 || y >= AH) continue;
    const row = y * AW;
    for (let i = 0; i < w; i++) {
      const c = d[j * w + i];
      if (c === T) continue;
      const x = ax + x0 + i;
      if (x >= 0 && x < AW) B[row + x] = c;
    }
  }
}
// Hand-placed pixels. (col,row) of the anchor in the rows; `shear` leans rows above a
// line by one pixel.
function fromRows(rows, legend, col, row, outlineC = null, shear = 0, shearRow = 0) {
  const w = Math.max(...rows.map((r) => r.length));
  const sp = spr(-col - 2, -row - 2, w - col + 1, rows.length - row + 1);
  rows.forEach((r, j) => {
    for (let i = 0; i < r.length; i++) {
      const ch = r[i];
      if (ch === '.' || ch === ' ') continue;
      ss(sp, i - col + (shear && j < shearRow ? shear : 0), j - row, legend[ch]);
    }
  });
  if (outlineC != null) outline(sp, outlineC, 0);
  return sp;
}

const cache = new Map();
function cached(key, make) {
  let sp = cache.get(key);
  if (!sp) { sp = make(); cache.set(key, sp); }
  return sp;
}

// ------------------------------------------------------------------ sky
function sky(f) {
  // Flat bands of colour joined by quarter-step dither strips.
  for (let y = 0; y < AH; y++) {
    const fy = 2 * (y - OY) + 1;
    let v;
    if (fy < 20) v = N1;
    else if (fy < 60) v = N1 + (fy - 20) / 40;
    else if (fy < 92) v = N2;
    else if (fy < 132) v = N2 + (fy - 92) / 40;
    else v = N3;
    const base = Math.floor(v);
    const q = Math.floor((v - base) * 5) / 4;
    const row = y * AW;
    for (let x = 0; x < AW; x++) B[row + x] = base + (q > bay(x, y) ? 1 : 0);
  }
  moon(f.moon);
  for (const s of f.stars) star(s);
  for (const c of f.clouds) stamp(cached(`cloud${c.i}`, () => cloudSprite(c.w, c.h, c.i)), Math.round(c.x / 2) + OX, Math.round(c.y / 2) + OY);
  for (const b of f.bats) bat(b);
}

function moon(m) {
  const cx = m.x / 2 + OX;
  const cy = m.y / 2 + OY;
  const r = m.r / 2;
  const G = 20;
  // Halo: two ramp steps at the rim fading out through the dither.
  for (let y = Math.floor(cy - r - G); y <= Math.ceil(cy + r + G); y++) {
    for (let x = Math.floor(cx - r - G); x <= Math.ceil(cx + r + G); x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d < r || d > r + G) continue;
      const n = dsteps(2 * (1 - (d - r) / G) ** 1.4, x, y);
      if (n) remapAt(x, y, LIGHTER, n);
    }
  }
  // Maria: overlapping ellipses with dithered shores; one bright ringed crater.
  const maria = [[-4.5, -3, 3.4, 2.4], [-2, -6, 2.2, 1.6], [3.5, 3, 2.6, 2], [5.5, -0.5, 1.4, 2.4], [-5, 3.5, 1.8, 1.3]];
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      if (Math.hypot(dx, dy) > r) continue;
      let c = MOON;
      let sea = 0;
      for (const [kx, ky, rx, ry] of maria) {
        const e = ((dx - kx) / rx) ** 2 + ((dy - ky) / ry) ** 2;
        sea = Math.max(sea, 1.35 - e);
      }
      if (sea > 0.6 || (sea > 0.2 && ((x + y) & 1))) c = MSH;
      // Limb darkening on the lower left, stepped then dithered.
      const off = Math.hypot(dx - 2.2, dy + 2.2);
      if (off > r + 1.2) c = MSH;
      else if (off > r - 0.2 && ((x + y) & 1)) c = MSH;
      B[y * AW + x] = c;
    }
  }
  const tx = Math.floor(cx - 1.5), ty = Math.floor(cy + 6.5);
  for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) px(tx + dx, ty + dy, MSH);
  px(tx + 1, ty - 1, MOON);
}

function star(s) {
  const x = Math.round(s.x / 2) + OX;
  const y = Math.round(s.y / 2) + OY;
  const big = s.s > 1.35;
  if (big && s.twinkle > 0.78) {
    px(x, y, MOON);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) px(x + dx, y + dy, N6);
  } else if (big || s.twinkle > 0.8) px(x, y, N8);
  else if (s.twinkle > 0.5) px(x, y, N6);
  else px(x, y, N5);
}

function cloudSprite(w, h, i) {
  const W = Math.round(w / 2);
  const H = Math.max(4, Math.round(h / 2));
  const sp = spr(-6, -8, W + 6, H + 2);
  // Scalloped lobes on one flat underside.
  const lobes = [[0.18, 0.22], [0.4, 0.3], [0.64, 0.24], [0.84, 0.16]];
  for (let k = 0; k < 4; k++) lobes.push([0.1 + 0.8 * hash(i * 17 + k), 0.08 + 0.1 * hash(i * 29 + k)]);
  for (const [u, r] of lobes) {
    const ry = Math.max(2, r * H * 2.5);
    const rx = r * W * 0.62 + 1;
    const cx = u * W;
    const cy = H - ry * 0.4;
    for (let j = Math.floor(cy - ry); j <= H; j++) {
      const ey = j + 0.5 < cy ? (j + 0.5 - cy) / ry : 0;
      for (let i = Math.floor(cx - rx) - 1; i <= Math.ceil(cx + rx); i++) {
        const ex = (i + 0.5 - cx) / rx;
        if (ex * ex + ey * ey <= 1) ss(sp, i, j, N4);
      }
    }
  }
  // Banded from the top: a moonlit rim, a lit band, the body, a ragged dithered underside.
  for (let i = 0; i < sp.w; i++) {
    let depth = 0;
    for (let j = 0; j < sp.h; j++) {
      const k = j * sp.w + i;
      if (sp.d[k] === T) { depth = 0; continue; }
      const x = i + sp.x0, y = j + sp.y0;
      const rightOpen = sg(sp, x + 1, y) === T || sg(sp, x + 1, y - 1) === T;
      let c = N4;
      if (depth === 0) c = rightOpen && x > W * 0.3 ? N7 : N6;
      else if (depth === 1) c = rightOpen ? N6 : N5;
      if (y === H) c = (x + y) & 1 ? T : N3;
      else if (y === H - 1 && depth > 1) c = (x + y) & 1 ? N3 : N4;
      sp.d[k] = c;
      depth++;
    }
  }
  return sp;
}

const BAT_BIG = [
  ['x.........x', 'xx.......xx', '.xx.x.x.xx.', '..xxxxxxx..', '....xxx....', '.....x.....'],
  ['....x.x....', 'xxx.xxx.xxx', '.xxxxxxxxx.', 'x.x.xxx.x.x', '.....x.....'],
  ['....x.x....', '...xxxxx...', '..xxxxxxx..', '.xx.xxx.xx.', 'xx...x...xx', 'x.........x'],
];
const BAT_SMALL = [
  ['x.....x', '.x.x.x.', '.xxxxx.', '...x...'],
  ['..x.x..', 'xxxxxxx', 'x.xxx.x', '...x...'],
  ['..x.x..', '.xxxxx.', 'xx.x.xx', 'x.....x'],
];
function bat(b) {
  const up = Math.cos(b.flap * Math.PI * 2);
  const fr = up > 0.35 ? 0 : up < -0.35 ? 2 : 1;
  const big = b.s >= 0.9;
  const sp = cached(`bat${big}${fr}`, () => {
    const rows = (big ? BAT_BIG : BAT_SMALL)[fr];
    return fromRows(rows, { x: INK }, (rows[0].length - 1) >> 1, 2);
  });
  stamp(sp, Math.round(b.x / 2) + OX, Math.round(b.y / 2) + OY);
}

// ------------------------------------------------------------------ land
// Per-layer pixel snap: shiftS is the layer shift rounded to a whole art pixel, dS the
// correction every x in the frame needs to land on it.
function snap(L) {
  const shiftS = 2 * Math.round(L.shift / 2);
  const dS = shiftS - L.shift;
  const crest = new Int16Array(AW);
  for (let x = 0; x < AW; x++) crest[x] = Math.floor(L.ridge(2 * (x - OX) + 1 + dS) / 2) + OY;
  return {
    L, dS, crest,
    uA: shiftS / 2 - OX, // art column x sits at layer-space art u = x + uA
    AX: (x) => Math.floor(Math.round(x - dS) / 2) + OX,
  };
}
const AY = (y) => Math.floor(y / 2) + OY;

function ridge(G, pal) {
  const { crest } = G;
  const P = G.L.name === 'bg' ? 720 : G.L.name === 'mid' ? 640 : 900;
  for (let x = 0; x < AW; x++) {
    const cy = Math.max(0, crest[x]);
    for (let y = cy; y < AH; y++) B[y * AW + x] = pal.fill;
    const r = x + 1 < AW ? crest[x + 1] : crest[x];
    // The crest catches the moon; faces stepping down to the right catch more.
    if (cy < AH) B[cy * AW + x] = r > cy ? pal.lit : pal.top;
    for (let y = cy + 1; y < Math.min(r, AH); y++) B[y * AW + x] = pal.lit;
    for (let y = cy + 1; y < Math.min(cy + 1 + pal.band, AH); y++) {
      if (bay(x, y) < pal.bandDensity * (1 - (y - cy - 1) / pal.band)) B[y * AW + x] = pal.top;
    }
    // Tufts along the skyline, fixed in layer space.
    const u = ((x + G.uA) % P + P) % P;
    const hsh = hash(u + P * 3.1);
    if (hsh < pal.tufts) {
      const hgt = hsh < pal.tufts * 0.4 ? 2 : 1;
      for (let k = 1; k <= hgt; k++) px(x, cy - k, k === hgt ? pal.top : pal.fill);
    }
  }
}

// ------------------------------------------------------------------ bg
const NAVE_TOP = [12, 13, 14, 15, 15, 14, 14, 14, 16, 17, 18, 18, 17, 17, 17, 17, 18, 19, 20, 20, 19, 19, 18, 19, 20, 20, 20, 20];
const TRANS_TOP = [14, 15, 16, 17, 17, 16, 15, 16, 17, 18, 17, 16, 15, 14, 13, 12];
const SPIRE_HW = [5, 5, 5, 4, 4, 4, 3, 3, 3, 2, 2, 2, 1, 1, 1, 0];

function abbeySprite() {
  const sp = spr(-32, -46, 30, 3);
  const WALL = N5;
  // Nave, broken off in brick courses, with a stepped buttress at its west end.
  NAVE_TOP.forEach((top, k) => srect(sp, k - 27, -top, 1, top + 3, WALL));
  srect(sp, -29, -5, 1, 8, WALL);
  srect(sp, -28, -8, 1, 11, WALL);
  // Roofless transept gable, and its buttress.
  TRANS_TOP.forEach((top, k) => srect(sp, k + 10, -top, 1, top + 3, WALL));
  srect(sp, 26, -7, 1, 10, WALL);
  srect(sp, 27, -4, 1, 7, WALL);
  // Masonry: broken mortar courses, clustered rather than a grid.
  for (let y = -26; y <= 0; y++) {
    for (let x = -29; x <= 27; x++) {
      if (sg(sp, x, y) !== WALL) continue;
      const h = hash(Math.floor((x + 40) / 3) * 7.31 + y * 13.7);
      if ((y + 30) % 3 === 0 && h < 0.45) ss(sp, x, y, N4);
    }
  }
  // The tower's shadow falls west across the end of the nave.
  for (let y = -20; y <= 2; y++) {
    for (let x = -5; x <= 0; x++) {
      if (sg(sp, x, y) === T) continue;
      if (x >= -3 || bay(x & 3, y & 3) < 0.5) ss(sp, x, y, N4);
    }
  }
  // Tower: a lit east corner, a shadowed west one, a cornice.
  for (let x = 1; x <= 9; x++) {
    for (let y = -26; y <= 2; y++) {
      let c = x === 1 ? N4 : x >= 8 ? N6 : WALL;
      if (c === WALL && (y + 30) % 3 === 0 && hash(Math.floor(x / 3) * 3.1 + y * 5.3) < 0.4) c = N4;
      ss(sp, x, y, c);
    }
  }
  srect(sp, 0, -27, 11, 1, N6);
  srect(sp, 0, -26, 11, 1, N4);
  // Spire: split shade and light down its ridge, slate courses on the lit side.
  SPIRE_HW.forEach((hw, k) => {
    const y = -28 - k;
    for (let x = 5 - hw; x <= 5 + hw; x++) {
      let c = x < 5 ? N3 : N5;
      if (x > 5 && k % 3 === 2 && x < 5 + hw) c = N4;
      ss(sp, x, y, c);
    }
  });
  // Openings into the dark: a lit reveal on the west jamb, a moonlit sill.
  const hole = (x, y) => ss(sp, x, y, N1);
  for (const cx of [-21, -14, -7]) {
    hole(cx, -12);
    for (let y = -11; y <= -3; y++) { ss(sp, cx - 1, y, N2); hole(cx, y); hole(cx + 1, y); }
    srect(sp, cx - 1, -2, 3, 1, N6);
  }
  hole(5, -22);
  for (let y = -21; y <= -16; y++) { ss(sp, 4, y, N2); hole(5, y); hole(6, y); }
  srect(sp, 4, -15, 3, 1, N7);
  for (let y = -11; y <= -7; y++) hole(5, y);
  const ROSE = ['.xxx.', 'xx.xx', 'x...x', 'xx.xx', '.xxx.'];
  ROSE.forEach((r, j) => { for (let i = 0; i < 5; i++) if (r[i] === 'x') hole(15 + i, -11 + j); });
  // Moonlight on everything facing up or east; west edges in shade.
  edges(sp, (c, right, top, left) => {
    if (c === N1 || c === N2) return c;
    if (right && top) return N7;
    if (right) return c === N3 ? N5 : N6;
    if (top) return LIGHTER[c];
    if (left) return DARKER[c];
    return c;
  });
  return sp;
}

// A dead tree in art px: trunk then forks, the shape the ink reference uses.
function treeLimbs(s, L) {
  return [
    [[0, 0.5, 2 * L * s, -13 * s, 4 * L * s, -25 * s], 1.5 * s, 0.5],
    [[1.5 * L * s, -10 * s, -6 * s, -16 * s, -8.5 * s, -21 * s], 0.8 * s, 0.5],
    [[-6 * s, -16 * s, -10.5 * s, -17 * s], 0.5, 0.5],
    [[2.5 * L * s, -15 * s, 6.5 * s, -20 * s, 10 * s, -21 * s], 0.8 * s, 0.5],
    [[6.5 * s, -20 * s, 7.5 * s, -24.5 * s], 0.5, 0.5],
    [[10 * s, -21 * s, 11.5 * s, -19.5 * s], 0.5, 0.5],
    [[3.5 * L * s, -21 * s, -1.5 * s, -26 * s], 0.5, 0.5],
    [[-8.5 * s, -21 * s, -9 * s, -24 * s], 0.5, 0.5],
    [[-1, 0.5, -3, 1.5], 0.6, 0.5],
    [[1, 0.5, 3, 1.5], 0.6, 0.5],
  ];
}
function treeSprite(s, L, pal) {
  const sp = spr(-16, -32, 16, 3);
  for (const [pts, r0, r1] of treeLimbs(s, L)) limb(sp, pts, r0, r1, pal.fill);
  edges(sp, (c, right, top, left, bottom) => (right && !left ? pal.rim : top && !bottom ? pal.top : c));
  return sp;
}

function groveSprite(it) {
  const sp = spr(-24, -20, 24, 3);
  const n = 3 + (it.i % 3);
  for (let k = 0; k < n; k++) {
    const dx = Math.round(((k - (n - 1) / 2) * 12 * it.s + (hash(it.i * 7 + k) - 0.5) * 6) / 2);
    const sc = (0.42 + hash(it.i * 11 + k) * 0.24) * it.s;
    const lean = (hash(k + it.i * 3) - 0.5) * 0.6;
    for (const [pts, , ] of treeLimbs(sc, lean)) {
      limb(sp, pts.map((v, q) => (q % 2 ? v : v + dx)), 0.5, 0.5, N4);
    }
    if (sc > 0.55) ss(sp, dx + 1, -1, N4);
  }
  edges(sp, (c, right, top, left, bottom) => ((right && !left) || (top && !bottom) ? N5 : c));
  return sp;
}

// ------------------------------------------------------------------ mid
const MID_LEGEND = { d: N3, b: N4, l: N5, h: N6 };
const STONES = {
  0: [['bbh', 'dbl', 'dbl', 'dbl', 'dbl', 'dbl'], ['bh', 'dl', 'dl', 'dl']],
  1: [['.h.', 'bbl', 'dbl', 'dbl', 'dbl', 'dbl'], ['.h.', 'dbl', 'dbl', 'dbl']],
  2: [['..h.', '.dl.', '.dl.', '.dl.', '.dl.', '.dl.', '.dl.', 'dbbl', 'dbbl'], ['.h.', '.l.', '.l.', '.l.', 'dbl']],
};
function stoneSprite(it) {
  const rows = STONES[it.variant][it.s >= 0.85 ? 0 : 1];
  const tilt = hash(it.i * 3.3 + 1) - 0.5;
  const shear = Math.abs(tilt) > 0.28 ? Math.sign(tilt) : 0;
  return fromRows(rows, MID_LEGEND, (rows[0].length - 1) >> 1, rows.length - 1, N1, shear, Math.floor(rows.length * 0.4));
}
const CROSS_PLAIN = ['..h..', '..l..', 'blllh', '..b..', '..b..', '..b..', '..b..', '..b..', '..b..', '..b..'];
const CROSS_CELTIC = ['...h...', '..bbl..', '.d.b.l.', 'bbbbblh', '.d.b.l.', '..dbl..', '...b...', '...b...', '...b...', '...b...'];
function crossSprite(it) {
  const rows = it.i % 2 === 0 ? CROSS_CELTIC : CROSS_PLAIN;
  const tilt = hash(it.i * 5.1 + 2) - 0.5;
  const shear = Math.abs(tilt) > 0.3 ? Math.sign(tilt) : 0;
  return fromRows(rows, MID_LEGEND, (rows[0].length - 1) >> 1, rows.length - 1, N1, shear, 3);
}

function mausoleumSprite(s, variant) {
  const r = (v) => Math.max(1, Math.round(v * s));
  const sp = spr(-18, -36, 18, 3);
  const w2 = r(12), w1 = r(10), wb = r(9);
  // Steps: lit treads, plain risers.
  srect(sp, -w2, -1, 2 * w2 + 1, 3, N4);
  srect(sp, -w2, -1, 2 * w2 + 1, 1, N5);
  srect(sp, -w1, -3, 2 * w1 + 1, 2, N4);
  srect(sp, -w1, -3, 2 * w1 + 1, 1, N5);
  // The recessed wall in the portico's shade, coursed.
  const top = -3 - r(12);
  srect(sp, -wb, top, 2 * wb + 1, -3 - top, N3);
  for (let y = top; y < -3; y++) {
    for (let x = -wb + 3; x <= wb - 3; x++) {
      const h = hash(x * 4.7 + y * 9.1 + s);
      if ((y - top) % 3 === 1 && h < 0.5) ss(sp, x, y, N2);
      else if ((y - top) % 3 === 2 && h > 0.8) ss(sp, x, y, N4);
    }
  }
  // Columns lit from the right.
  for (const c0 of [-wb, wb - 2]) {
    for (let y = top; y < -3; y++) { ss(sp, c0, y, N4); ss(sp, c0 + 1, y, N5); ss(sp, c0 + 2, y, N6); }
    srect(sp, c0 - 1, -4, 5, 1, N4);
    srect(sp, c0 - 1, top, 5, 1, N5);
  }
  // Doorway: a pointed arch into black, keystone above.
  const dh = r(8);
  const dTop = -4 - dh + 1;
  srect(sp, -2, dTop + 2, 5, dh - 2, INK);
  srect(sp, -1, dTop + 1, 3, 1, INK);
  ss(sp, 0, dTop, INK);
  ss(sp, 0, dTop - 1, N5);
  // Entablature with dentils.
  srect(sp, -wb - 1, top - 2, 2 * wb + 3, 1, N5);
  for (let x = -wb - 1; x <= wb + 1; x++) ss(sp, x, top - 1, x % 2 ? N3 : N4);
  if (variant === 1) {
    // Drum, dome in banded light with a dithered terminator, and a cross.
    srect(sp, -wb + 1, top - 3, 2 * wb - 1, 1, N4);
    // A semicircle a pixel wider than it is tall, so the crown stays round.
    const rd = r(7.5);
    const rx = rd + 0.9;
    const cy = top - 3;
    for (let y = cy - rd; y < cy; y++) {
      for (let x = -rd - 1; x <= rd + 1; x++) {
        const nx = x / rx, ny = (y + 0.5 - cy) / rd;
        if (nx * nx + ny * ny > 1) continue;
        const dot = nx * 0.6 - ny * 0.8; // toward the moon, up and right
        ss(sp, x, y, dot < -0.15 ? N3 : dot < 0.45 ? N4 : dot < 0.82 ? N5 : N6);
      }
    }
    ss(sp, r(3), cy - rd + 1, N7);
    const ft = cy - rd;
    srect(sp, 0, ft - 4, 1, 4, N5);
    srect(sp, -1, ft - 3, 3, 1, N5);
    ss(sp, 1, ft - 3, N6);
  } else {
    // Pediment: raking cornices, a shadowed tympanum.
    const base = top - 3;
    for (let k = 0; ; k++) {
      const hw = wb + 2 - 2 * k;
      if (hw < 1) break;
      const y = base - k;
      for (let x = -hw; x <= hw; x++) {
        let c = N4;
        if (k === 0) c = N5;
        else if (x > hw - 2) c = N6;
        else if (x < -hw + 2) c = N5;
        else if (Math.abs(x) < hw - 2) c = N3;
        ss(sp, x, y, c);
      }
    }
  }
  edges(sp, (c, right) => (right && c !== INK ? LIGHTER[c] : c));
  outline(sp, N1, 0);
  return sp;
}

// ------------------------------------------------------------------ fg
function gnarlSprite(s, flip) {
  const sp = spr(-40, -70, 40, 4);
  const X = (dx) => dx * s * flip;
  const Y = (dy) => dy * s;
  const P = (...pts) => pts.map((v, k) => (k % 2 ? Y(v) : X(v)));
  const limbs = [
    [P(0, 0.5, -2, -15, 2, -29, 0, -42), 3.5 * s, 1.9 * s],
    [P(1, -25, 12, -33, 22, -32, 29, -37), 2.0 * s, 0.6],
    [P(22, -32, 26, -28, 31, -29, 33, -27), 0.7, 0.5],
    [P(29, -37, 32, -36, 34, -33), 0.5, 0.5],
    [P(15, -33, 18, -41, 24, -46, 26, -45), 0.9, 0.5],
    [P(0, -40, -7, -50, -13, -52, -15, -50), 1.3 * s, 0.5],
    [P(-7, -50, -6, -57, -8, -59), 0.6, 0.5],
    [P(0.5, -42, 7, -52, 15, -56, 19, -62), 1.2 * s, 0.5],
    [P(19, -62, 21, -63, 23, -61), 0.5, 0.5],
    [P(10, -53.5, 14, -50, 18, -51, 19, -49), 0.6, 0.5],
    [P(-1, -18, -9, -23, -13, -22, -14, -20), 1.0, 0.5],
    [P(-2, 0.5, -7, 2.5), 1.5 * s, 0.9],
    [P(2, 0.5, 7, 2.5), 1.5 * s, 0.9],
  ];
  for (const [pts, r0, r1] of limbs) limb(sp, pts, r0, r1, N1);
  // A knot hole and bark splits on the trunk.
  const kx = Math.round(X(-1.5)), ky = Math.round(Y(-21));
  srect(sp, kx, ky, 2, 3, INK);
  ss(sp, kx + (flip > 0 ? 2 : -1), ky, N2);
  edges(sp, (c, right, top, left, bottom, x, y, E) => {
    if (c === INK) return c;
    if (right && !left) return top ? N5 : N4;
    if (top && !bottom) return N3;
    if (left && !right) return INK;
    // Second rim pixel where the limb is thick enough to carry it.
    const i = x - sp.x0, j = y - sp.y0;
    if (E(i + 2, j) && !E(i - 2, j)) return N3;
    if (E(i + 3, j) && !E(i - 3, j) && bay(x & 3, y & 3) < 0.5) return N2;
    if (hash(x * 3.7 + y * 11.3) < 0.1 && y < -2) return INK;
    return c;
  });
  return sp;
}

function grassSprite(it) {
  const sp = spr(-8, -9, 8, 2);
  const s = it.s;
  for (let k = 0; k < 6; k++) {
    const bx = Math.round((k - 2.5) * 1.4 * s);
    const h = Math.round((3 + hash(it.i * 13 + k) * 3.5) * s);
    const bend = Math.round((hash(it.i + k * 5) - 0.4) * 3.5 * s);
    sline(sp, bx, 1, bx + bend, -h, N1);
    if (hash(it.i * 3 + k) > 0.3) ss(sp, bx + bend, -h, bend > 0 ? N4 : N3);
    if (k === 2) {
      // A thistle head on one stalk.
      ss(sp, bx + bend, -h - 1, N2);
      ss(sp, bx + bend - 1, -h - 1, N1);
      ss(sp, bx + bend + 1, -h - 1, N3);
      ss(sp, bx + bend, -h - 2, N3);
    }
  }
  return sp;
}

const LAMP_ROWS = [
  '...x...',
  '..xrx..',
  '.xxxrx.',
  'xxxxxxr',
  '.xwwax.',
  '.xwyax.',
  '.xyywx.',
  '.xwywx.',
  'xxxxxxr',
  '..xxr..',
  '...xr..',
  '...xr..',
  '..xxxr.',
  '...xr..',
  '...xr..',
  '...xr..',
  '...xr..',
  '...xr..',
  '...xr..',
  '...xr..',
  '..xxxr.',
  '.xxxxxr',
];
function lamp(it, G, t) {
  const x = G.AX(it.x);
  const y = AY(it.y) + 1;
  const flick = 0.9 + 0.1 * Math.sin(t * 11 + it.i) * Math.sin(t * 7.3);
  const cy = y - 17;
  const R = 15 * flick;
  for (let j = Math.floor(cy - R); j <= Math.ceil(cy + R); j++) {
    for (let i = Math.floor(x - R); i <= Math.ceil(x + R); i++) {
      const d = Math.hypot(i + 0.5 - (x + 0.5), j + 0.5 - cy) / R;
      if (d >= 1) continue;
      const n = dsteps(1.5 * (1 - d), i, j);
      if (n) remapAt(i, j, WARM, n);
    }
  }
  const bright = flick > 0.93;
  const sp = cached(`lamp${bright}`, () => fromRows(LAMP_ROWS, {
    x: INK, r: N3, w: bright ? W3 : W2, y: bright ? W4 : W3, a: W2,
  }, 3, LAMP_ROWS.length - 1));
  stamp(sp, x, y);
}

function fence(it, G) {
  const { crest } = G;
  const at = (x) => crest[Math.max(0, Math.min(AW - 1, x))];
  const a0 = G.AX(it.x0);
  const a1 = G.AX(it.x1);
  const g = it.gate == null ? null : G.AX(it.gate);
  const GW = 7;
  const runs = g == null ? [[a0, a1]] : [[a0, g - GW - 1], [g + GW + 1, a1]];
  for (const [p, q] of runs) {
    for (let x = p; x <= q; x++) {
      if (x < 0 || x >= AW) continue;
      px(x, at(x) - 2, INK);
      px(x, at(x) - 8, INK);
    }
  }
  for (let x = a0; x <= a1; x += 4) {
    if (x < -2 || x >= AW + 2) continue;
    if (g != null && Math.abs(x - g) <= GW + 1) continue;
    const b = at(x);
    for (let y = b - 9; y <= b + 1; y++) px(x, y, INK);
    // Arrowhead finial, its east barb catching the moon.
    px(x - 1, b - 10, INK); px(x, b - 10, INK); px(x + 1, b - 10, N3);
    px(x, b - 11, INK);
  }
  if (g == null) return;
  let b = -Infinity;
  for (let x = g - GW; x <= g + GW; x++) b = Math.max(b, at(x));
  for (const x of [g - GW - 1, g + GW]) {
    for (let y = b - 15; y <= b + 1; y++) { px(x, y, INK); px(x + 1, y, x > g ? N3 : INK); }
    // Ball finials.
    px(x, b - 18, INK); px(x + 1, b - 18, N3);
    px(x - 1, b - 17, INK); px(x, b - 17, INK); px(x + 1, b - 17, INK); px(x + 2, b - 17, N2);
    px(x, b - 16, INK); px(x + 1, b - 16, INK);
  }
  for (let x = g - GW + 1; x <= g + GW - 1; x++) {
    const archY = b - 12 - Math.round(4 * Math.cos(((x - g) / GW) * 1.25));
    px(x, archY, INK);
    px(x, b - 5, INK);
    if ((x - g) % 3 === 0) {
      for (let y = archY + 1; y <= b; y++) px(x, y, INK);
      px(x, archY - 1, N2);
    }
  }
}

// ------------------------------------------------------------------ fog
// Mist pulls everything a step or two toward one lavender tone, in dither patterns.
function fogBand(band, depth) {
  const y0 = AY(band.y - band.h * 0.9);
  const y1 = AY(band.y + band.h * 1.9);
  const puffs = band.puffs;
  const mid = band.y + band.h * 0.5;
  for (let y = Math.max(0, y0); y <= Math.min(AH - 1, y1); y++) {
    const fy = 2 * (y - OY) + 1;
    const core = Math.max(0, 1 - Math.abs(fy - mid) / (band.h * 0.7)) * 0.55;
    for (let x = 0; x < AW; x++) {
      const fx = 2 * (x - OX) + 1;
      let d = core;
      for (const p of puffs) {
        const ex = (fx - p.x) / p.rx, ey = (fy - p.y) / (p.ry * 1.25);
        const e = 1 - ex * ex - ey * ey;
        if (e > d) d = e;
      }
      // Solid where it is thick, a 50% checker at the edges: the Mega Drive way.
      const lv = Math.min(depth, d * 2.4);
      const base = Math.floor(lv);
      const fr = lv - base;
      const n = base + (fr > 0.7 ? 1 : fr > 0.35 && ((x + y) & 1) ? 1 : 0);
      if (n) remapAt(x, y, FOGSTEP, n);
    }
  }
}

// ------------------------------------------------------------------ layers
const PAL = {
  bg: { fill: N4, top: N5, lit: N6, band: 2, bandDensity: 0.25, tufts: 0.12 },
  mid: { fill: N2, top: N3, lit: N4, band: 0, bandDensity: 0, tufts: 0.22 },
  fg: { fill: N1, top: N2, lit: N3, band: 0, bandDensity: 0, tufts: 0.35 },
};
const MID_TREE = { fill: N1, rim: N4, top: N3 };

function layer(f, name) {
  const G = snap(f.layers[name]);
  const pal = PAL[name];
  // Buildings stand behind their own ridge line, so the crest overlaps their foot.
  for (const it of G.L.items) {
    if (it.kind === 'abbey') stamp(cached(`abbey${it.s}`, () => abbeySprite()), G.AX(it.x), AY(it.y));
  }
  ridge(G, pal);
  for (const it of G.L.items) {
    const x = it.x0 == null ? G.AX(it.x) : 0;
    const y = it.y == null ? 0 : AY(it.y) + 1;
    switch (it.kind) {
      case 'grove': stamp(cached(`grove${it.i}`, () => groveSprite(it)), x, y); break;
      case 'mausoleum': stamp(cached(`maus${it.s}:${it.variant}`, () => mausoleumSprite(it.s, it.variant)), x, y); break;
      case 'tree': stamp(cached(`tree${it.i}`, () => treeSprite(it.s, it.variant === 1 ? -0.8 : 0.2, MID_TREE)), x, y); break;
      case 'stone': stamp(cached(`stone${it.i}`, () => stoneSprite(it)), x, y); break;
      case 'cross': stamp(cached(`cross${it.i}`, () => crossSprite(it)), x, y); break;
      case 'gnarl': stamp(cached(`gnarl${it.s}:${it.variant}`, () => gnarlSprite(it.s, it.variant === 1 ? -1 : 1)), x, y); break;
      case 'fence': fence(it, G); break;
      case 'lamp': lamp(it, G, f.t); break;
      case 'grass': stamp(cached(`grass${it.i}`, () => grassSprite(it)), x, y); break;
      default: break;
    }
  }
}

export const STYLE = {
  id: 'pixel',
  name: '16-BIT PIXEL ART',
  note: 'Painted at half resolution on a strict 16-colour palette and blown up 2x with no smoothing, like a '
    + 'late SNES / Mega Drive castle stage. Every gradient, glow and mist is Bayer dither; graveyard props get '
    + '1px outlines and moonlit rim pixels on their right-hand edges; the gas lamp is the only warm ramp.',
  paint(ctx, f) {
    const s = surface();
    B = s.buf;
    sky(f);
    layer(f, 'bg');
    layer(f, 'mid');
    fogBand(f.fog[0], 2);
    layer(f, 'fg');
    // The near band is thin and sits on the lane's back edge: one step, kept quiet.
    fogBand(f.fog[1], 1);
    const { u32, lut } = s;
    for (let i = 0; i < B.length; i++) u32[i] = lut[B[i]];
    s.cx.putImageData(s.img, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(s.cv, -OX * 2, -OY * 2, AW * 2, AH * 2);
    ctx.restore();
  },
};
