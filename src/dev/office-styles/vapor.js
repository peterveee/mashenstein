// CORPORATE KOMBAT style bake-off — VAPORWAVE / Win95 corporate. The 1990s corporate dream
// as remembered by vaporwave: pastel pink, teal, lilac and peach gradients laid down in
// ordered (Bayer) dither, Windows 95 grey bevels used as architectural trim (mullions,
// door frames and skirtings are raised / sunken 3D bevels, the posters are dialog boxes
// with title bars, the lift indicators are little LCDs), Memphis squiggles and confetti
// on the plaster, marble, potted palms, beige CRTs glowing over the cubicle walls, and a
// floor plane that is a glowing perspective grid running into a neon-edged slab. The
// founder, the silver professor, is drawn by the game's own villain painter: carved in
// marble with chrome lenses in the lobby, a web-safe-dithered DON.BMP upstairs; the exec
// floor gets the striped cyber-sunset over a glittering pastel city.
//
// Legibility: everything behind the lane (mid furniture and the floor plane, ~y 170-232)
// is pushed back with a pastel haze, the floor plane is a calm mid-light value so the dark
// chair, the dog, the pale printer and the white paperwork all separate from it, and the
// grid fades out toward the lane.
//
// Every layer that does not animate is baked once per device scale, in u-space strips one
// period long (+ a screen of overscan) cut into 2048 px tiles: the outside (far city, near
// city + street), the wall (bays, glass frames, columns and everything hung on it) and the
// mid furniture. Strips are laid at whole device pixels so the dither never swims; the
// per-frame parts of a layer (lift doors, clock hands, heads) take the same snap.
import { OFFICE_FLOORS, FRAME_W, FRAME_H, LANE_TOP, WALL_BASE, MID_BASE } from './plan.js';
import { eggshellApe } from '../../sprites/props.js';

const TAU = Math.PI * 2;
const TILE = 2048;
const VPX = FRAME_W / 2; // the floor grid's vanishing point
const WALL_K = 0.24;

// ------------------------------------------------------------------ utilities
const mod = (a, p) => ((a % p) + p) % p;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

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

const RGB = new Map();
function rgbOf(c) {
  if (Array.isArray(c)) return c;
  let v = RGB.get(c);
  if (!v) {
    const n = parseInt(c.slice(1), 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    RGB.set(c, v);
  }
  return v;
}
const mixc = (a, b, t) => {
  const A = rgbOf(a), B = rgbOf(b);
  return [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t];
};
function css(c, a = 1) {
  const v = rgbOf(c);
  return a >= 1 ? `rgb(${v[0] | 0},${v[1] | 0},${v[2] | 0})` : `rgba(${v[0] | 0},${v[1] | 0},${v[2] | 0},${a.toFixed(3)})`;
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

function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function vgrad(g, y0, y1, stops) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  for (const [p, c, a = 1] of stops) gr.addColorStop(p, css(c, a));
  return gr;
}
function hgrad(g, x0, x1, stops) {
  const gr = g.createLinearGradient(x0, 0, x1, 0);
  for (const [p, c, a = 1] of stops) gr.addColorStop(p, css(c, a));
  return gr;
}

// ------------------------------------------------------------------ ordered dither
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

// A gradient quantised to `levels` steps per stop interval, with the step edges laid in
// 4x4 Bayer dither (cells of `cell` logical px). `sharp` > 1 keeps flat bands between the
// dithered seams, which is the 256-colour look.
function ditherBox(k, w, h, stops, { levels = 3, sharp = 2, cell = 1, horizontal = false } = {}) {
  const W = Math.max(1, Math.round(w * k));
  const H = Math.max(1, Math.round(h * k));
  const c = canvas(W, H);
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  const d = img.data;
  const cols = stops.map((s) => rgbOf(s[1]));
  const pos = stops.map((s) => s[0]);
  const cs = Math.max(1, Math.round(cell * k));
  const L = horizontal ? W : H;
  const lo = new Array(L);
  const hi = new Array(L);
  const fr = new Float32Array(L);
  for (let i = 0; i < L; i++) {
    const t = (i + 0.5) / L;
    let s = 0;
    while (s < pos.length - 2 && t > pos[s + 1]) s++;
    const f = clamp01((t - pos[s]) / Math.max(1e-6, pos[s + 1] - pos[s]));
    const q = f * levels;
    const qi = Math.min(levels - 1, Math.floor(q));
    fr[i] = clamp01((q - qi - 0.5) * sharp + 0.5);
    lo[i] = mixc(cols[s], cols[s + 1], qi / levels);
    hi[i] = mixc(cols[s], cols[s + 1], (qi + 1) / levels);
  }
  for (let y = 0; y < H; y++) {
    const by = ((y / cs) | 0) & 3;
    for (let x = 0; x < W; x++) {
      const i = horizontal ? x : y;
      const C = fr[i] > BAYER[by * 4 + (((x / cs) | 0) & 3)] ? hi[i] : lo[i];
      const o = (y * W + x) * 4;
      d[o] = C[0]; d[o + 1] = C[1]; d[o + 2] = C[2]; d[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

// Posterise a canvas to the web-safe cube (6 levels a channel) through Bayer dither, the
// way a 1996 browser showed a photo. Alpha is kept.
function webSafe(c, k, levels = 6, cell = 0.5) {
  const g = c.getContext('2d');
  const img = g.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const cs = Math.max(1, Math.round(cell * k));
  const step = 255 / (levels - 1);
  for (let y = 0; y < c.height; y++) {
    const by = ((y / cs) | 0) & 3;
    for (let x = 0; x < c.width; x++) {
      const o = (y * c.width + x) * 4;
      if (d[o + 3] === 0) continue;
      const th = BAYER[by * 4 + (((x / cs) | 0) & 3)];
      for (let ch = 0; ch < 3; ch++) {
        const v = d[o + ch] / step;
        const fl = Math.floor(v);
        d[o + ch] = Math.min(255, (v - fl > th ? fl + 1 : fl) * step);
      }
    }
  }
  g.putImageData(img, 0, 0);
}

// ------------------------------------------------------------------ Win95 chrome
const CHROME = { face: '#cdc7da', hi: '#ffffff', lt: '#e8e4f1', lo: '#8c85a3', dk: '#4c4566' };
const TITLE_ON = ['#14107a', '#3b9fd8'];
const TITLE_OFF = ['#7d7890', '#bdb8cc'];

// The Win95 two-line bevel: raised = light outer/white inner top-left, dark outer/grey inner
// bottom-right; sunken reverses it. `t` is the width of each line in logical px.
function bevel(g, x, y, w, h, raised = true, t = 0.5, C = CHROME) {
  const tl1 = raised ? C.lt : C.lo;
  const tl2 = raised ? C.hi : C.dk;
  const br1 = raised ? C.dk : C.hi;
  const br2 = raised ? C.lo : C.lt;
  g.fillStyle = tl1; g.fillRect(x, y, w, t); g.fillRect(x, y, t, h);
  g.fillStyle = br1; g.fillRect(x, y + h - t, w, t); g.fillRect(x + w - t, y, t, h);
  if (w > 4 * t && h > 4 * t) {
    g.fillStyle = tl2; g.fillRect(x + t, y + t, w - 2 * t, t); g.fillRect(x + t, y + t, t, h - 2 * t);
    g.fillStyle = br2; g.fillRect(x + t, y + h - 2 * t, w - 2 * t, t); g.fillRect(x + w - 2 * t, y + t, t, h - 2 * t);
  }
}
function panel(g, x, y, w, h, raised = true, t = 0.5, C = CHROME, face = null) {
  g.fillStyle = face || C.face;
  g.fillRect(x, y, w, h);
  bevel(g, x, y, w, h, raised, t, C);
}

// A Win95 window: frame, title bar with caption and the three buttons, sunken client.
// Returns the client rect.
function win95(g, x, y, w, h, title, { active = true, buttons = 3, status = null, client = '#ffffff' } = {}) {
  panel(g, x, y, w, h, true, 0.5);
  const tx = x + 1.5;
  const ty = y + 1.5;
  const tw = w - 3;
  const th = 6.5;
  const [a, b] = active ? TITLE_ON : TITLE_OFF;
  g.fillStyle = hgrad(g, tx, tx + tw, [[0, a], [1, b]]);
  g.fillRect(tx, ty, tw, th);
  ptext(g, title, tx + 1.5, ty + 1, 1, '#ffffff');
  for (let i = 0; i < buttons; i++) {
    const bx = tx + tw - 5.5 * (i + 1) - (i === 0 ? 0 : 0.5);
    panel(g, bx, ty + 0.75, 5, 5, true, 0.5);
    g.fillStyle = '#111';
    if (i === 0) { // close
      for (let s = 0; s < 3; s++) { g.fillRect(bx + 1 + s, ty + 2 + s, 1, 1); g.fillRect(bx + 3 - s, ty + 2 + s, 1, 1); }
    } else if (i === 1) {
      g.fillRect(bx + 1, ty + 1.75, 3, 0.5); g.fillRect(bx + 1, ty + 1.75, 0.5, 3); g.fillRect(bx + 3.5, ty + 1.75, 0.5, 3); g.fillRect(bx + 1, ty + 4.25, 3, 0.5);
    } else {
      g.fillRect(bx + 1, ty + 4, 2.5, 0.75);
    }
  }
  const sb = status ? 7 : 0;
  const cx = x + 2;
  const cy = ty + th + 1;
  const cw = w - 4;
  const ch = h - (cy - y) - 2 - sb;
  g.fillStyle = client;
  g.fillRect(cx, cy, cw, ch);
  bevel(g, cx - 0.5, cy - 0.5, cw + 1, ch + 1, false, 0.5);
  if (status) {
    bevel(g, cx, cy + ch + 1.5, cw, 5.5, false, 0.5);
    ptext(g, status, cx + cw / 2, cy + ch + 2, 1, '#2b2540', 'center');
  }
  return { x: cx, y: cy, w: cw, h: ch };
}

// ------------------------------------------------------------------ pixel font (3x5, M N W wider)
const GLYPHS = {
  A: ['010', '101', '111', '101', '101'], B: ['110', '101', '110', '101', '110'], C: ['011', '100', '100', '100', '011'],
  D: ['110', '101', '101', '101', '110'], E: ['111', '100', '110', '100', '111'], F: ['111', '100', '110', '100', '100'],
  G: ['011', '100', '101', '101', '011'], H: ['101', '101', '111', '101', '101'], I: ['111', '010', '010', '010', '111'],
  J: ['001', '001', '001', '101', '010'], K: ['101', '101', '110', '101', '101'], L: ['100', '100', '100', '100', '111'],
  M: ['10001', '11011', '10101', '10001', '10001'], N: ['1001', '1101', '1011', '1001', '1001'], O: ['010', '101', '101', '101', '010'],
  P: ['110', '101', '110', '100', '100'], Q: ['010', '101', '101', '110', '011'], R: ['110', '101', '110', '101', '101'],
  S: ['011', '100', '010', '001', '110'], T: ['111', '010', '010', '010', '010'], U: ['101', '101', '101', '101', '111'],
  V: ['101', '101', '101', '101', '010'], W: ['10001', '10001', '10101', '11011', '10001'], X: ['101', '101', '010', '101', '101'],
  Y: ['101', '101', '010', '010', '010'], Z: ['111', '001', '010', '100', '111'],
  0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'], 2: ['110', '001', '010', '100', '111'],
  3: ['110', '001', '010', '001', '110'], 4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '110', '001', '110'],
  6: ['011', '100', '111', '101', '111'], 7: ['111', '001', '010', '010', '010'], 8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '110'],
  '.': ['0', '0', '0', '0', '1'], '-': ['000', '000', '111', '000', '000'], '!': ['1', '1', '1', '0', '1'],
  ':': ['0', '1', '0', '1', '0'], '/': ['001', '001', '010', '100', '100'], '?': ['110', '001', '010', '000', '010'],
  ' ': ['00', '00', '00', '00', '00'], '%': ['101', '001', '010', '100', '101'], '$': ['011', '110', '010', '011', '110'],
};
const glyph = (ch) => GLYPHS[ch] || GLYPHS['?'];
function ptextW(str, s = 1, gap = 1) {
  let w = 0;
  for (const ch of str) w += glyph(ch)[0].length + gap;
  return (w - gap) * s;
}
function ptext(g, str, x, y, s, color, align = 'left', gap = 1) {
  const w = ptextW(str, s, gap);
  let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  cx = Math.round(cx * 2) / 2;
  y = Math.round(y * 2) / 2;
  g.fillStyle = color;
  for (const ch of str) {
    const G = glyph(ch);
    for (let r = 0; r < 5; r++) {
      const row = G[r];
      for (let c = 0; c < row.length; c++) if (row.charCodeAt(c) === 49) g.fillRect(cx + c * s, y + r * s, s, s);
    }
    cx += (G[0].length + gap) * s;
  }
}

// Seven-segment LCD digits.
const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', G: 'acdef', '-': 'g' };
function seg7(g, ch, x, y, w, h, t, on, off) {
  const hh = h / 2;
  const S = {
    a: [x + t, y, w - 2 * t, t], b: [x + w - t, y + t, t, hh - 1.5 * t], c: [x + w - t, y + hh + 0.5 * t, t, hh - 1.5 * t],
    d: [x + t, y + h - t, w - 2 * t, t], e: [x, y + hh + 0.5 * t, t, hh - 1.5 * t], f: [x, y + t, t, hh - 1.5 * t],
    g: [x + t, y + hh - t / 2, w - 2 * t, t],
  };
  const lit = SEG[ch] || '';
  for (const s of 'abcdefg') {
    g.fillStyle = lit.includes(s) ? on : off;
    g.fillRect(...S[s]);
  }
  if (ch === 'G') { g.fillStyle = on; g.fillRect(x + w / 2, y + hh - t / 2, w / 2 - t, t); }
}

// ------------------------------------------------------------------ palettes
const PAL = {
  lobby: {
    sky: [[0, '#78b0ff'], [0.32, '#acbdfb'], [0.6, '#dcc0f3'], [0.84, '#ffcbe0'], [1, '#ffe2d2']],
    cloud: ['#ffffff', '#fbeefc', '#d8c6f0'],
    far: { tones: ['#c7bdef', '#b5c6f0', '#d5c0ec'], win: '#e9e3fb', shade: 'rgba(120,100,180,0.12)' },
    near: { tones: ['#f2a7c5', '#98d8cf', '#c0a6e8'], win: '#5fb0d6', winHi: '#bfe8f7', trim: '#fff2f8', shade: 'rgba(90,50,130,0.16)' },
    awnings: [['#ff8fc4', '#fff4fa'], ['#6fd6cf', '#f4fffd'], ['#b493ef', '#f7f2ff'], ['#ffd27a', '#fffaf0']],
    wall: '#f0d3e6', vein: '#c4a8c8', ceiling: ['#ece2f4', '#d9cce9'],
    floor: [[0, '#ecd0e8'], [1, '#d0b0d8']], grid: '#57d9e2', gridHi: '#c8fbff', refl: '#bfe3ff',
    slab: [[0, '#3d2c66'], [1, '#1e1538']], edge: '#7ff3ff', edgeGlow: '#4fd3ff',
    haze: '#e2cbe4', hazeA: 0.42,
    liftIn: ['#ffe6c4', '#ffb9ce'], leaf: ['#f3c6de', '#d79cc2', '#fbe3ef'],
  },
  open: {
    sky: [[0, '#74adff'], [0.38, '#a9caff'], [0.7, '#d9d6ff'], [1, '#ffd6ee']],
    cloud: ['#ffffff', '#f6f0ff', '#c9c1ef'],
    far: { tones: ['#b7c2f1', '#c5b8ee', '#abc9ea'], win: '#dde6ff', shade: 'rgba(90,90,170,0.12)' },
    near: { tones: ['#eaa3c3', '#9fd6cf', '#bba5e3'], win: '#6aa9d8', winHi: '#c4e6fa', trim: '#fff3f8', shade: 'rgba(80,50,130,0.18)' },
    wall: '#e2cdef', wall2: '#d3c0ea', ceiling: ['#eee8f6', '#ddd2ec'],
    floor: [[0, '#a8a2db'], [1, '#8984c2']], grid: '#ff8bd3', gridHi: '#ffd2f0', refl: '#d6e6ff',
    slab: [[0, '#3a2a66'], [1, '#1f1640']], edge: '#ff86dc', edgeGlow: '#ff4fc8',
    haze: '#b9b0de', hazeA: 0.4,
    liftIn: ['#e8fbff', '#b9e2ff'], leaf: ['#bfe7e6', '#86c3c8', '#e2fbfa'],
  },
  exec: {
    sky: [[0, '#1b1342'], [0.22, '#3b2368'], [0.45, '#7b2e8c'], [0.66, '#c9449b'], [0.82, '#ff6f8f'], [0.93, '#ff9f7c'], [1, '#ffc98a']],
    cloud: ['#ffb3c6', '#9a4a96', '#5d2d7c'],
    far: { tones: ['#4c2e74', '#5a3480', '#43286a'], win: '#ffd7a0', shade: 'rgba(30,10,50,0.2)' },
    near: { tones: ['#2d2156', '#36275f', '#3f2b6a'], win: '#ffcf9a', winHi: '#ff9ed6', trim: '#ff9ccf', shade: 'rgba(20,8,40,0.25)' },
    wall: '#6c3d5f', wallHi: '#9b6188', wallLo: '#40223a', ceiling: ['#2c1c3e', '#3f2752'],
    floor: [[0, '#d8a9c6'], [1, '#b98ab0']], grid: '#ffc1e1', gridHi: '#fff0f8', refl: '#ffb28a',
    slab: [[0, '#2c1d4c'], [1, '#150e2a']], edge: '#ff9ad8', edgeGlow: '#ff5fb8',
    haze: '#c79ab9', hazeA: 0.38,
    liftIn: ['#ffe2b8', '#ff9fb8'], leaf: ['#d9b48a', '#a97c5a', '#f4dcb6'],
  },
};
const PASTELS = ['#ff9ed8', '#7fe3e0', '#c9a8f0', '#ffd08a', '#a8f0c8', '#9fd0ff'];
const SKINS = ['#e9b99c', '#c78f6e', '#94604a', '#f1cab2', '#b47c5c'];
const HAIRS = ['#3b2a3c', '#6a4232', '#d8b070', '#2a2032', '#a3523f', '#7c6a8e'];
const SHIRTS = ['#f2a6c8', '#8fd6cf', '#c3a8e8', '#ffd3a6', '#a8c6f0', '#b8ecc8'];

// ------------------------------------------------------------------ strips
// A strip covers u in [-M, P + FRAME_W + M] of one layer, in 2048-px tiles. paint(g, ua, ub)
// is called once per tile with the transform set to u-space and the tile's u range.
function makeStrip(k, P, top, bottom, paint, M = 48) {
  const U0 = -M;
  const U1 = P + FRAME_W + M;
  const W = Math.ceil((U1 - U0) * k);
  const H = Math.ceil((bottom - top) * k);
  const tiles = [];
  for (let dx = 0; dx < W; dx += TILE) {
    const tw = Math.min(TILE, W - dx);
    const c = canvas(tw, H);
    const g = c.getContext('2d');
    g.setTransform(k, 0, 0, k, -dx - U0 * k, -top * k);
    const ua = U0 + dx / k;
    const ub = U0 + (dx + tw) / k;
    paint(g, ua, ub);
    tiles.push({ c, u0: ua, u1: ub });
  }
  return { tiles, P, top, bottom, k };
}

// Lays the strip at the layer's shift, snapped to whole device pixels. Returns the snap
// (screen px) for the layer's per-frame parts.
function drawStrip(ctx, S, shift) {
  const s = mod(shift, S.P);
  const ss = Math.round(s * S.k) / S.k;
  for (const T of S.tiles) {
    const ua = Math.max(T.u0, ss - 24);
    const ub = Math.min(T.u1, ss + FRAME_W + 24);
    if (ub <= ua) continue;
    ctx.drawImage(T.c, (ua - T.u0) * S.k, 0, (ub - ua) * S.k, T.c.height, ua - ss, S.top, ub - ua, S.bottom - S.top);
  }
  return s - ss;
}

// Calls fn(x) for each copy of [u, u + w] (at -P, 0, +P) that touches the tile.
function copies(u, w, P, ua, ub, fn, pad = 24) {
  for (const n of [-1, 0, 1]) {
    const x = u + n * P;
    if (x + w > ua - pad && x < ub + pad) fn(x);
  }
}

// ------------------------------------------------------------------ shared painters
// Memphis Group confetti: squiggles, triangles, rings, dashes and zigzags, seeded.
function memphis(g, x0, y0, w, h, seed, cols, density, alpha, scale = 1) {
  const r = rng(seed);
  const n = Math.round(w * h * density);
  g.save();
  g.beginPath();
  g.rect(x0, y0, w, h);
  g.clip();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * w;
    const y = y0 + r() * h;
    const c = cols[(r() * cols.length) | 0];
    const kind = r();
    const rot = (r() - 0.5) * 2.2;
    const sz = (0.8 + r() * 0.6) * scale;
    g.globalAlpha = alpha * (0.7 + r() * 0.3);
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.scale(sz, sz);
    if (kind < 0.3) {
      g.strokeStyle = c;
      g.lineWidth = 1.1;
      g.beginPath();
      for (let s = 0; s <= 14; s++) {
        const tx = (s / 14) * 12 - 6;
        const ty = Math.sin((s / 14) * TAU * 1.5) * 1.6;
        if (s === 0) g.moveTo(tx, ty); else g.lineTo(tx, ty);
      }
      g.stroke();
    } else if (kind < 0.48) {
      g.fillStyle = c;
      g.beginPath();
      g.moveTo(0, -3); g.lineTo(3, 2.2); g.lineTo(-3, 2.2);
      g.closePath();
      if (r() < 0.5) g.fill(); else { g.strokeStyle = c; g.lineWidth = 0.9; g.stroke(); }
    } else if (kind < 0.64) {
      g.strokeStyle = c;
      g.lineWidth = 0.9;
      g.beginPath();
      g.arc(0, 0, 1.8, 0, TAU);
      if (r() < 0.4) { g.fillStyle = c; g.fill(); } else g.stroke();
    } else if (kind < 0.82) {
      g.fillStyle = c;
      g.fillRect(-2.5, -0.6, 5, 1.2);
    } else {
      g.strokeStyle = c;
      g.lineWidth = 0.9;
      g.beginPath();
      g.moveTo(-5, 0); g.lineTo(-2.5, -1.8); g.lineTo(0, 0); g.lineTo(2.5, -1.8); g.lineTo(5, 0);
      g.stroke();
    }
    g.restore();
  }
  g.globalAlpha = 1;
  g.restore();
}

// Polished marble: a pale ground, soft clouding, and veins that flow one way across the
// slab, each laid as a wide soft wash, a mid stroke and a crisp hairline. Seeded per slab.
function marble(g, x0, y0, w, h, seed, base, vein, { joints = true, dark = false, slab = 72 } = {}) {
  g.save();
  g.beginPath();
  g.rect(x0, y0, w, h);
  g.clip();
  g.fillStyle = vgrad(g, y0, y0 + h, [[0, mixc(base, '#ffffff', dark ? 0.06 : 0.35)], [1, base]]);
  g.fillRect(x0, y0, w, h);
  const r = rng(seed);
  for (let i = 0; i < w * h / 700; i++) {
    const cx = x0 + r() * w;
    const cy = y0 + r() * h;
    const rad = 12 + r() * 30;
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rad);
    const c = r() < 0.5 ? vein : (dark ? '#a070c0' : '#ffffff');
    gr.addColorStop(0, css(c, dark ? 0.08 : 0.14));
    gr.addColorStop(1, css(c, 0));
    g.fillStyle = gr;
    g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const flow = (r() < 0.5 ? 0.45 : Math.PI - 0.45) + (r() - 0.5) * 0.3;
  const veins = Math.max(2, Math.round(w * h / 2200));
  for (let v = 0; v < veins; v++) {
    let x = x0 - 30 + r() * (w + 60);
    let y = y0 - 10 + r() * (h + 10);
    let a = flow + (r() - 0.5) * 0.5;
    const len = 40 + r() * 80;
    const pts = [[x, y]];
    let da = 0;
    for (let q = 0; q < len; q += 3) {
      da = da * 0.65 + (r() - 0.5) * 0.22;
      a += da;
      a += (flow - a) * 0.1;
      x += Math.cos(a) * 3;
      y += Math.sin(a) * 3;
      pts.push([x, y]);
    }
    const path = () => {
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    };
    path();
    const white = !dark && r() < 0.6;
    const vc = white ? '#ffffff' : vein;
    g.strokeStyle = css(vc, dark ? 0.1 : white ? 0.22 : 0.08);
    g.lineWidth = 5 + r() * 4;
    g.stroke();
    g.strokeStyle = css(vc, dark ? 0.16 : white ? 0.3 : 0.12);
    g.lineWidth = 1.8;
    g.stroke();
    g.strokeStyle = css(dark ? '#e8c0ff' : white ? '#ffffff' : mixc(vein, '#8a70a8', 0.2), dark ? 0.3 : white ? 0.45 : 0.16);
    g.lineWidth = 0.5;
    g.stroke();
    // a branch or two
    if (r() < 0.6) {
      const b0 = pts[(pts.length * (0.2 + r() * 0.5)) | 0];
      let bx = b0[0];
      let by = b0[1];
      let ba = a + (r() < 0.5 ? 0.9 : -0.9);
      g.beginPath();
      g.moveTo(bx, by);
      for (let q = 0; q < 20 + r() * 30; q += 3) { ba += (r() - 0.5) * 0.5; bx += Math.cos(ba) * 3; by += Math.sin(ba) * 3; g.lineTo(bx, by); }
      g.strokeStyle = css(vein, 0.16);
      g.lineWidth = 0.4;
      g.stroke();
    }
  }
  if (joints) {
    const jc = css(dark ? '#000000' : '#9d86a6', dark ? 0.3 : 0.2);
    const hc = css('#ffffff', dark ? 0.08 : 0.6);
    for (let y = y0 + 46; y < y0 + h - 6; y += 46) {
      g.fillStyle = jc; g.fillRect(x0, y, w, 0.5);
      g.fillStyle = hc; g.fillRect(x0, y + 0.5, w, 0.5);
    }
    const n = Math.max(1, Math.round(w / slab));
    for (let i = 1; i < n; i++) {
      const jx = x0 + (i * w) / n;
      g.fillStyle = jc; g.fillRect(jx, y0, 0.5, h);
      g.fillStyle = hc; g.fillRect(jx + 0.5, y0, 0.5, h);
    }
  }
  g.restore();
}

// A palm: curved, tapering fronds off a crown. `s` scales a 40x70 palm; foot at (x, y).
function palmFronds(g, cx, cy, s, cols, seed, n = 7) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1;
    const a = -Math.PI / 2 + side * (0.35 + (i / n) * 1.25) + (r() - 0.5) * 0.2;
    const len = (16 + r() * 7) * s;
    const droop = (5 + r() * 5) * s;
    const ex = cx + Math.cos(a) * len;
    const ey = cy + Math.sin(a) * len * 0.55 + droop;
    const mx = cx + Math.cos(a) * len * 0.55;
    const my = cy + Math.sin(a) * len * 0.55 - 3 * s;
    g.fillStyle = cols[i % cols.length];
    g.beginPath();
    g.moveTo(cx, cy);
    g.quadraticCurveTo(mx, my - 2.4 * s, ex, ey);
    g.quadraticCurveTo(mx, my + 2.4 * s, cx, cy + 1.2 * s);
    g.fill();
    // leaflet notches
    g.strokeStyle = cols[(i + 1) % cols.length];
    g.lineWidth = 0.5 * s;
    g.beginPath();
    for (let q = 0.25; q < 1; q += 0.16) {
      const px = cx + (ex - cx) * q;
      const py = cy + (ey - cy) * q - Math.sin(q * Math.PI) * 3 * s;
      g.moveTo(px, py);
      g.lineTo(px + Math.cos(a + side * 1.2) * 2.6 * s, py + 2.4 * s);
    }
    g.stroke();
  }
}

function palmTree(g, x, y, s, C, seed) {
  // trunk: a gentle curve of rings
  const r = rng(seed);
  const lean = (r() - 0.5) * 6 * s;
  const top = y - 30 * s;
  g.strokeStyle = C.trunk;
  g.lineCap = 'round';
  for (let i = 0; i < 12; i++) {
    const t0 = i / 12;
    const t1 = (i + 0.85) / 12;
    const w = (2.6 - t0 * 1) * s;
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(x + lean * t0 * t0, y - (y - top) * t0);
    g.lineTo(x + lean * t1 * t1, y - (y - top) * t1);
    g.stroke();
  }
  palmFronds(g, x + lean, top, s * 0.75, C.fronds, seed + 3, 7);
}

// A beige CRT, three-quarter view, screen glowing. Foot at (x, y), ~w wide.
function crt(g, x, y, w, glow, seed, { screen = null } = {}) {
  const h = w * 0.85;
  const top = y - h;
  // the case's tapering back
  g.fillStyle = '#b8ab92';
  g.beginPath();
  g.moveTo(x + w * 0.62, top + h * 0.12); g.lineTo(x + w * 1.05, top + h * 0.28); g.lineTo(x + w * 1.05, y - h * 0.18); g.lineTo(x + w * 0.62, y - h * 0.05);
  g.closePath();
  g.fill();
  // bezel
  g.fillStyle = '#d9ccb0';
  g.fillRect(x, top, w * 0.7, h);
  g.fillStyle = '#efe4cc';
  g.fillRect(x, top, w * 0.7, 0.6);
  g.fillRect(x, top, 0.6, h);
  g.fillStyle = '#9d907a';
  g.fillRect(x, y - 0.6, w * 0.7, 0.6);
  // screen
  const sx = x + w * 0.09;
  const sy = top + h * 0.12;
  const sw = w * 0.52;
  const sh = h * 0.6;
  g.fillStyle = screen || glow;
  g.fillRect(sx, sy, sw, sh);
  g.fillStyle = 'rgba(255,255,255,0.45)';
  g.fillRect(sx, sy, sw, 0.5);
  const r = rng(seed);
  g.fillStyle = 'rgba(20,10,60,0.35)';
  for (let i = 0; i < 3; i++) g.fillRect(sx + 0.8, sy + 1 + i * 1.6, sw * (0.4 + r() * 0.5), 0.6);
  // stand
  g.fillStyle = '#b8ab92';
  g.fillRect(x + w * 0.2, y, w * 0.3, 1);
}

// Don K. Eggshell PhD, the founder: the shipped villain, the silver professor. He is drawn
// by the game's own painter (sprites/props.js eggshellApe) with the tub and hands left off,
// so the likeness is the game's and can never drift from it. The painter fills a 24x20 box
// at its origin; the mane stands ~4 above the box and the cape's foot is at ~15.5.
const PRO_LOOK = { look: 0, mood: 'frown', blink: 0, twitch: [0, 0] };
function professor(g, ox, oy, s) {
  g.save();
  g.translate(ox, oy);
  g.scale(s, s);
  eggshellApe(g, 0, 0, 0, { tub: null, hands: null }, PRO_LOOK);
  g.restore();
}

// Where his specs sit in that box: props.js PRO_SPEC (centre line 0.346, half-width 0.067,
// bridge 0.01, half-height 0.036) taken through proSized (scale 0.88 about the neck at 0.52,
// raised 0.075), so chrome lenses can be laid exactly over the painted ones.
const PRO_SPECS = (() => {
  const S = 0.88;
  const X = (f) => 24 * f;
  const Y = (f) => 20 * f;
  const tx = (x) => X(0.5) + S * (x - X(0.5));
  const ty = (y) => Y(0.52 - 0.075) + S * (y - Y(0.52));
  const off = X(0.067 + 0.005);
  return { cy: ty(Y(0.346)), hw: S * X(0.067), hh: S * Y(0.036), xs: [tx(X(0.5) - off), tx(X(0.5) + off)] };
})();

// The founder carved in marble: his own drawing, its tones remapped onto a lilac-white marble
// ramp (a breath of the original hue kept, so the cape lining blushes pink), soft veins over
// it, and the lenses of his specs in real chrome. Baked once per scale into a sprite of
// BUST_BOX units: { c, ox, oy } where (ox, oy) is the painter's box origin inside it.
const BUST_BOX = { w: 27, h: 21, ox: 1.5, oy: 4.5 };
const MARBLE_BUST = new Map();
function marbleProfessor(k) {
  if (MARBLE_BUST.has(k)) return MARBLE_BUST.get(k);
  const R = k * 1.8; // device px per box unit, enough for the lobby bust at 1.5
  const c = canvas(BUST_BOX.w * R, BUST_BOX.h * R);
  const g = c.getContext('2d');
  g.setTransform(R, 0, 0, R, BUST_BOX.ox * R, BUST_BOX.oy * R);
  eggshellApe(g, 0, 0, 0, { tub: null, hands: null }, PRO_LOOK);
  const img = g.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const ramp = [[0, '#4a3a6c'], [0.3, '#8d7ab0'], [0.65, '#dccff0'], [1, '#ffffff']].map(([p, h]) => [p, rgbOf(h)]);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const r = d[i];
    const gg = d[i + 1];
    const b = d[i + 2];
    const t = 0.12 + 0.88 * ((0.3 * r + 0.59 * gg + 0.11 * b) / 255);
    let j = 0;
    while (j < ramp.length - 2 && t > ramp[j + 1][0]) j++;
    const f = (t - ramp[j][0]) / (ramp[j + 1][0] - ramp[j][0]);
    const A = ramp[j][1];
    const B = ramp[j + 1][1];
    d[i] = (A[0] + (B[0] - A[0]) * f) * 0.88 + r * 0.12;
    d[i + 1] = (A[1] + (B[1] - A[1]) * f) * 0.88 + gg * 0.12;
    d[i + 2] = (A[2] + (B[2] - A[2]) * f) * 0.88 + b * 0.12;
  }
  g.putImageData(img, 0, 0);
  // veins in the stone
  g.save();
  g.setTransform(R, 0, 0, R, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  const rv = rng(808);
  g.lineCap = 'round';
  for (let v = 0; v < 7; v++) {
    let x = rv() * BUST_BOX.w;
    let y = rv() * BUST_BOX.h;
    let a = 0.5 + rv() * 0.5;
    g.beginPath();
    g.moveTo(x, y);
    for (let q = 0; q < 14; q++) { a += (rv() - 0.5) * 0.6; x += Math.cos(a) * 0.9; y += Math.sin(a) * 0.9; g.lineTo(x, y); }
    g.strokeStyle = v % 3 ? 'rgba(255,255,255,0.35)' : 'rgba(120,90,150,0.22)';
    g.lineWidth = 0.18;
    g.stroke();
  }
  // a pastel wash over the stone, as every vaporwave statue gets
  g.fillStyle = vgrad(g, 0, BUST_BOX.h, [[0, '#ffc8e8', 0.12], [1, '#8fe8e4', 0.1]]);
  g.fillRect(0, 0, BUST_BOX.w, BUST_BOX.h);
  // carved volume: window light from the left, a cool shadow side
  g.fillStyle = hgrad(g, BUST_BOX.ox + 7, BUST_BOX.ox + 19, [[0, '#ffffff', 0.18], [0.5, '#ffffff', 0], [1, '#3a2a60', 0.3]]);
  g.fillRect(0, 0, BUST_BOX.w, BUST_BOX.h);
  g.restore();
  // chrome lenses over his specs
  g.setTransform(R, 0, 0, R, BUST_BOX.ox * R, BUST_BOX.oy * R);
  const P = PRO_SPECS;
  for (const [i, lx] of P.xs.entries()) {
    const side = i ? 1 : -1;
    g.fillStyle = vgrad(g, P.cy - P.hh, P.cy + P.hh, [[0, '#ffffff'], [0.45, '#bff4f6'], [0.55, '#7fb4d8'], [1, '#d8c8f4']]);
    g.beginPath();
    g.moveTo(lx - P.hw, P.cy - P.hh);
    g.lineTo(lx + P.hw, P.cy - P.hh);
    g.lineTo(lx + P.hw * (side > 0 ? 0.86 : 0.76), P.cy + P.hh);
    g.lineTo(lx - P.hw * (side > 0 ? 0.76 : 0.86), P.cy + P.hh);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.fillRect(lx - P.hw * 0.6, P.cy - P.hh * 0.55, P.hw * 0.5, P.hh * 0.35);
  }
  g.fillStyle = '#5c4a7a';
  g.fillRect(P.xs[0] - P.hw - 0.05, P.cy - P.hh - 0.12, P.xs[1] - P.xs[0] + P.hw * 2 + 0.1, 0.22);
  const out = { c, R };
  MARBLE_BUST.set(k, out);
  return out;
}

// Lays the marble bust with the painter's box origin at (x, y), s logical px per box unit.
function drawMarbleBust(g, k, x, y, s) {
  const M = marbleProfessor(k);
  g.drawImage(M.c, x - BUST_BOX.ox * s, y - BUST_BOX.oy * s, BUST_BOX.w * s, BUST_BOX.h * s);
}

// ------------------------------------------------------------------ outside: sky
function bakeSky(F, Pl, k) {
  const top = F.glass.top;
  const bot = F.glass.bottom;
  const hz = F.outside.horizon;
  const c = canvas(FRAME_W * k, (bot - top) * k);
  const g = c.getContext('2d');
  g.setTransform(k, 0, 0, k, 0, -top * k);
  const grad = ditherBox(k, FRAME_W, hz - top, Pl.sky, { levels: F.id === 'exec' ? 3 : 2, sharp: 2.2 });
  g.drawImage(grad, 0, top, FRAME_W, hz - top);
  g.fillStyle = css(Pl.sky[Pl.sky.length - 1][1]);
  g.fillRect(0, hz - 0.5, FRAME_W, bot - hz + 1);
  const sun = F.outside.sun;
  if (sun && F.id === 'lobby') {
    let gl = g.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, 70);
    gl.addColorStop(0, 'rgba(255,248,220,0.75)');
    gl.addColorStop(0.3, 'rgba(255,226,236,0.35)');
    gl.addColorStop(1, 'rgba(255,220,240,0)');
    g.fillStyle = gl;
    g.fillRect(sun.x - 70, sun.y - 70, 140, 140);
    // dithered halo rings
    for (let i = 3; i >= 1; i--) {
      g.fillStyle = css(mixc('#fff7d6', '#ffd3e6', i / 3), 0.35);
      g.beginPath(); g.arc(sun.x, sun.y, sun.r + i * 3.5, 0, TAU); g.fill();
    }
    g.fillStyle = vgrad(g, sun.y - sun.r, sun.y + sun.r, [[0, '#fffdf0'], [1, '#ffe7b0']]);
    g.beginPath(); g.arc(sun.x, sun.y, sun.r, 0, TAU); g.fill();
  }
  if (sun && F.id === 'exec') {
    const R = 22;
    let gl = g.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, 110);
    gl.addColorStop(0, 'rgba(255,200,140,0.7)');
    gl.addColorStop(0.35, 'rgba(255,110,170,0.32)');
    gl.addColorStop(1, 'rgba(255,90,170,0)');
    g.fillStyle = gl;
    g.fillRect(sun.x - 110, sun.y - 110, 220, 220);
    // the striped sun, cut on its own canvas then laid on the sky
    const sc = canvas((R * 2 + 4) * k, (R * 2 + 4) * k);
    const sg = sc.getContext('2d');
    sg.setTransform(k, 0, 0, k, (R + 2) * k, (R + 2) * k);
    sg.fillStyle = vgrad(sg, -R, R, [[0, '#fff58a'], [0.45, '#ffb36a'], [0.75, '#ff6f8e'], [1, '#ff3fa6']]);
    sg.beginPath(); sg.arc(0, 0, R, 0, TAU); sg.fill();
    sg.globalCompositeOperation = 'destination-out';
    // stripes over the part the skyline leaves showing (its lower half is behind the city)
    let y = -R * 0.62;
    let gap = 0.7;
    while (y < R) {
      sg.fillRect(-R - 1, y, R * 2 + 2, gap);
      y += gap + 2.6 - gap * 0.3;
      gap += 0.45;
    }
    g.drawImage(sc, sun.x - R - 2, sun.y - R - 2, R * 2 + 4, R * 2 + 4);
  }
  return { c, top, h: bot - top };
}

function bakeCloud(F, Pl, cl, i, k) {
  const W = cl.w + 24;
  const H = cl.h * 3 + 12;
  const c = canvas(W * k, H * k);
  const g = c.getContext('2d');
  g.setTransform(k, 0, 0, k, 0, 0);
  const r = rng(F.stage * 100 + i * 7 + 1);
  const baseY = cl.h * 2 + 6;
  if (F.id === 'exec') {
    // long dusk streaks, lit pink from underneath
    for (let s = 0; s < 4; s++) {
      const sx = 12 + r() * cl.w * 0.3;
      const sw = cl.w * (0.5 + r() * 0.5);
      const sy = baseY - s * cl.h * 0.35 - r() * 2;
      const sh = cl.h * (0.35 + r() * 0.25);
      g.beginPath();
      rr(g, sx, sy - sh, Math.min(sw, W - sx - 4), sh, sh / 2);
      g.fillStyle = '#fff';
      g.fill();
    }
    g.globalCompositeOperation = 'source-atop';
    const grad = ditherBox(k, W, H, [[0, Pl.cloud[2]], [0.55, Pl.cloud[1]], [0.86, '#e76fa8'], [1, Pl.cloud[0]]], { levels: 2, sharp: 2.4 });
    g.drawImage(grad, 0, 0, W, H);
  } else {
    // puffy Win95-boot cumulus
    const n = Math.max(4, Math.round(cl.w / 14));
    g.fillStyle = '#fff';
    for (let p = 0; p < n; p++) {
      const t = (p + 0.5) / n;
      const px = 12 + t * cl.w;
      const rad = cl.h * (0.55 + Math.sin(t * Math.PI) * (0.65 + r() * 0.45));
      g.beginPath();
      g.arc(px, baseY - rad * 0.55, rad, 0, TAU);
      g.fill();
    }
    g.fillRect(12, baseY - cl.h * 0.5, cl.w, cl.h * 0.5);
    g.globalCompositeOperation = 'destination-out';
    g.fillRect(0, baseY, W, H);
    g.globalCompositeOperation = 'source-atop';
    const grad = ditherBox(k, W, H, [[0, Pl.cloud[0]], [0.45, Pl.cloud[0]], [0.72, Pl.cloud[1]], [1, Pl.cloud[2]]], { levels: 2, sharp: 2.4 });
    g.drawImage(grad, 0, 0, W, H);
  }
  return { c, ox: -12, oy: -baseY + cl.h * 0.5, w: W, h: H };
}

// ------------------------------------------------------------------ outside: buildings
function windowGrid(g, b, x, S, fid, layer) {
  const w = b.w;
  const cols = b.cols;
  const fh = b.floorH;
  const cw = (w - 4) / cols;
  const lastY = b.base - (b.shop != null ? 18 : 4);
  for (let r = 0, y = b.top + 4; y < lastY; r++, y += fh) {
    if (layer === 'far') {
      g.fillStyle = css(S.win, fid === 'exec' ? 0 : 0.5);
      g.fillRect(x + 2, y, w - 4, Math.max(1, fh * 0.32));
      if (fid === 'exec') {
        for (let c = 0; c < cols; c++) {
          if (hash(b.i * 131 + r * 17 + c * 7 + 5) < b.lit) {
            g.fillStyle = PASTELS[(b.i + r + c) % 3 === 0 ? 0 : (b.i + c) % 4 === 0 ? 1 : 3];
            g.fillRect(x + 2 + c * cw + cw * 0.2, y, Math.max(0.8, cw * 0.55), Math.max(0.8, fh * 0.35));
          }
        }
      }
      continue;
    }
    const type = fid === 'exec' ? 0 : (b.i * 7 + (fid === 'open' ? 1 : 0)) % 3;
    if (type === 1) {
      // ribbon windows: one continuous band of glass a floor
      const body = S.tones[b.tone];
      g.fillStyle = css(mixc(body, '#4f6fc0', 0.42));
      g.fillRect(x + 2, y, w - 4, Math.max(1.5, fh * 0.5));
      g.fillStyle = css(mixc(body, '#ffffff', 0.4));
      g.fillRect(x + 2, y, w - 4, Math.max(0.6, fh * 0.16));
      continue;
    }
    if (type === 2) continue; // curtain wall: glazed whole, drawn by building()
    for (let c = 0; c < cols; c++) {
      const wx = x + 2 + c * cw + cw * 0.22;
      const ww = Math.max(1, cw * 0.56);
      const wh = Math.max(1.5, fh * 0.52);
      if (fid === 'exec') {
        const lit = hash(b.i * 131 + r * 17 + c * 7 + 9) < b.lit;
        if (lit) {
          g.fillStyle = [S.win, '#ff9ed8', '#8ff2ff', '#fff3b0'][(b.i * 3 + r + c * 5) % 4];
          g.globalAlpha = 0.75 + 0.25 * hash(b.i + r * 3 + c);
          g.fillRect(wx, y, ww, wh);
          g.globalAlpha = 1;
        } else {
          g.fillStyle = 'rgba(160,120,220,0.12)';
          g.fillRect(wx, y, ww, wh);
        }
      } else {
        const body = S.tones[b.tone];
        g.fillStyle = css(mixc(body, '#5a70c8', 0.3));
        g.fillRect(wx, y, ww, wh);
        g.fillStyle = css(mixc(body, '#ffffff', 0.3));
        g.fillRect(wx, y, ww, wh * 0.35);
      }
    }
  }
}

function building(g, b, x, S, fid, layer) {
  const w = b.w;
  const top = b.top;
  const base = b.base;
  const cx = x + w / 2;
  const body = S.tones[b.tone];
  g.fillStyle = body;
  // roof furniture that stands above the parapet
  if (b.roof === 'spire') {
    const h = Math.min(34, w * 0.9);
    g.beginPath(); g.moveTo(x + w * 0.28, top); g.lineTo(cx, top - h); g.lineTo(x + w * 0.72, top); g.closePath(); g.fill();
    g.fillRect(cx - 0.4, top - h - 8, 0.8, 8);
  } else if (b.roof === 'stepped') {
    g.fillRect(x + w * 0.12, top - 7, w * 0.76, 7.5);
    g.fillRect(x + w * 0.27, top - 13, w * 0.46, 6.5);
    g.fillRect(x + w * 0.4, top - 18, w * 0.2, 5.5);
    g.fillRect(cx - 0.4, top - 26, 0.8, 8);
  } else if (b.roof === 'antenna') {
    g.fillRect(cx - 3, top - 4, 6, 4.5);
    g.fillRect(cx - 0.5, top - 22, 1, 18);
    g.fillRect(cx - 3, top - 15, 6, 0.6);
  }
  if (fid === 'exec' && layer === 'near') {
    // dusk glass towers: dark at the top, the horizon's glow in the lower glass
    g.fillStyle = vgrad(g, top, base, [[0, body], [0.6, mixc(body, '#7a3c86', 0.55)], [1, '#9a4a8e']]);
    g.fillRect(x, top, w, base - top);
    g.fillStyle = 'rgba(255,255,255,0.05)';
    for (let c = 1; c < b.cols; c++) g.fillRect(x + (c * w) / b.cols, top, 0.5, base - top);
  } else if (layer === 'near' && (b.i * 7 + (fid === 'open' ? 1 : 0)) % 3 === 2) {
    // a glass curtain wall: the sky in it, a fine grid over it
    g.fillStyle = vgrad(g, top, base, [[0, mixc(body, '#9fb8ff', 0.55)], [0.55, mixc(body, '#ffffff', 0.25)], [1, mixc(body, '#ffc8e0', 0.4)]]);
    g.fillRect(x, top, w, base - top);
    g.fillStyle = css(mixc(body, '#5a4a9a', 0.35), 0.5);
    for (let yy = top + b.floorH; yy < base; yy += b.floorH) g.fillRect(x, yy, w, 0.5);
    for (let c = 1; c < b.cols; c++) g.fillRect(x + (c * w) / b.cols, top, 0.5, base - top);
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.beginPath(); g.moveTo(x + w * 0.1, base); g.lineTo(x + w * 0.4, base); g.lineTo(x + w * 0.9, top); g.lineTo(x + w * 0.6, top); g.closePath(); g.fill();
  } else {
    g.fillRect(x, top, w, base - top);
  }
  if (layer === 'near') {
    g.fillStyle = S.shade;
    g.fillRect(x + w * 0.74, top, w * 0.26, base - top);
  } else if (fid !== 'exec') {
    g.fillStyle = S.shade;
    g.fillRect(x + w * 0.7, top, w * 0.3, base - top);
  }
  windowGrid(g, b, x, S, fid, layer);
  // rim light / trims
  if (fid === 'exec') {
    g.fillStyle = css(layer === 'near' ? '#ff8fcf' : '#d070b0', layer === 'near' ? 0.75 : 0.35);
    g.fillRect(x, top, 0.75, base - top);
    g.fillRect(x, top, w, 0.6);
  } else if (layer === 'near') {
    g.fillStyle = S.trim;
    g.fillRect(x - 0.5, top, w + 1, 1.4);
    if (b.roof === 'cornice') {
      g.fillRect(x - 2, top - 2, w + 4, 2.2);
      g.fillStyle = 'rgba(90,60,140,0.18)';
      g.fillRect(x - 2, top + 0.2, w + 4, 0.8);
      // a postmodern pediment for the widest ones
      if (w > 90) {
        g.fillStyle = S.trim;
        g.beginPath(); g.moveTo(cx - 14, top - 2); g.lineTo(cx, top - 9); g.lineTo(cx + 14, top - 2); g.closePath(); g.fill();
        g.fillStyle = PASTELS[b.i % 3];
        g.beginPath(); g.arc(cx, top - 4.5, 2, 0, TAU); g.fill();
      }
    }
  } else {
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(x, top, w, 0.6);
  }
  if (b.roof === 'tank') {
    // water tower on legs, with a cone hat
    const tx = x + w * (0.25 + (b.i % 3) * 0.15);
    const tw = 12;
    g.fillStyle = fid === 'exec' ? '#2a1d48' : '#8b6f8f';
    g.fillRect(tx + 1, top - 6, 0.8, 6); g.fillRect(tx + tw - 2, top - 6, 0.8, 6);
    g.fillRect(tx + 1, top - 3.5, tw - 2, 0.5);
    g.fillStyle = fid === 'exec' ? '#3a2a5e' : '#f1b8a8';
    g.fillRect(tx, top - 16, tw, 10);
    g.fillStyle = 'rgba(120,60,90,0.25)';
    for (let q = 1; q < 4; q++) g.fillRect(tx, top - 16 + q * 2.5, tw, 0.4);
    g.fillRect(tx + tw * 0.65, top - 16, tw * 0.35, 10);
    g.fillStyle = fid === 'exec' ? '#2a1d48' : '#c88aa0';
    g.beginPath(); g.moveTo(tx - 1, top - 16); g.lineTo(tx + tw / 2, top - 21); g.lineTo(tx + tw + 1, top - 16); g.closePath(); g.fill();
  } else if (b.roof === 'billboard') {
    const bw = Math.min(46, w - 10);
    const bx = x + (w - bw) / 2;
    const by = top - 21;
    g.fillStyle = '#7d6a92';
    g.fillRect(bx + 5, by + 15, 0.8, 6); g.fillRect(bx + bw - 6, by + 15, 0.8, 6);
    g.fillStyle = hgrad(g, bx, bx + bw, [[0, '#ff9ed8'], [1, '#7fe3e0']]);
    g.fillRect(bx, by, bw, 15);
    const sg = vgrad(g, by + 2, by + 13, [[0, '#fff27a'], [1, '#ff5fa8']]);
    g.fillStyle = sg;
    g.beginPath(); g.arc(bx + 9, by + 9, 5, Math.PI, TAU); g.fill();
    g.fillStyle = '#ff9ed8';
    g.fillRect(bx + 3, by + 10, 12, 0.7); g.fillRect(bx + 3, by + 12, 12, 0.7);
    ptext(g, 'EGG', bx + bw * 0.62, by + 2, 1, '#ffffff', 'center');
    ptext(g, 'CORP', bx + bw * 0.62, by + 8, 1, '#2a1f6c', 'center');
    bevel(g, bx - 0.5, by - 0.5, bw + 1, 16, true, 0.5);
  }
  if (b.shop != null && fid === 'lobby') {
    const [a1, a2] = PAL.lobby.awnings[b.shop];
    const ay = base - 16;
    g.fillStyle = 'rgba(255,240,220,0.9)';
    g.fillRect(x + 3, ay + 3, w - 6, 12);
    g.fillStyle = 'rgba(255,190,150,0.5)';
    g.fillRect(x + 3, ay + 8, w - 6, 7);
    g.fillStyle = 'rgba(255,255,255,0.7)';
    for (let q = x + 8; q < x + w - 6; q += 14) g.fillRect(q, ay + 3, 0.6, 12);
    for (let q = 0; q < (w - 2) / 4; q++) {
      g.fillStyle = q % 2 ? a2 : a1;
      g.beginPath();
      const ax = x + 1 + q * 4;
      g.moveTo(ax, ay - 1); g.lineTo(ax + 4, ay - 1); g.lineTo(ax + 4.6, ay + 3.5); g.lineTo(ax - 0.6, ay + 3.5);
      g.closePath();
      g.fill();
    }
    g.fillStyle = 'rgba(80,40,110,0.18)';
    g.fillRect(x + 1, ay + 3.5, w - 2, 0.8);
  }
}

function paintFar(g, F, Pl, ua, ub) {
  const S = Pl.far;
  for (const b of F.outside.far) copies(b.u, b.w, 1400, ua, ub, (x) => building(g, { ...b }, x, S, F.id, 'far'));
  if (F.id === 'exec') {
    // the haze over the carpet of lights
    g.fillStyle = vgrad(g, 160, 200, [[0, '#ff8fb0', 0.4], [0.5, '#c0508f', 0.18], [1, '#4a2a6e', 0]]);
    g.fillRect(ua - 30, 160, ub - ua + 60, 40);
  } else {
    const hz = F.outside.horizon;
    g.fillStyle = vgrad(g, hz - 60, hz, [[0, '#ffffff', 0], [1, '#ffe6f0', 0.55]]);
    g.fillRect(ua - 30, hz - 60, ub - ua + 60, 60);
  }
}

function paintNear(g, F, Pl, ua, ub) {
  const S = Pl.near;
  const O = F.outside;
  for (const b of O.near) copies(b.u, b.w, 1200, ua, ub, (x) => building(g, b, x, S, F.id, 'near'));
  if (F.id !== 'exec') {
    // aerial haze, so the room's chrome reads in front of the city
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = vgrad(g, F.glass.top, O.horizon, [[0, Pl.sky[1][1], 0.24], [1, Pl.sky[Pl.sky.length - 1][1], 0.16]]);
    g.fillRect(ua - 30, F.glass.top, ub - ua + 60, F.glass.bottom - F.glass.top);
    g.globalCompositeOperation = 'source-over';
  }
  if (O.street) {
    const st = O.street;
    // far pavement, palms and lamps, the road, the near kerb
    g.fillStyle = '#f7d9d2';
    g.fillRect(ua - 30, st.far - 3, ub - ua + 60, 3);
    g.fillStyle = '#e2b9c6';
    g.fillRect(ua - 30, st.far - 0.6, ub - ua + 60, 0.6);
    const palmC = { trunk: '#c79aa0', fronds: ['#3fae9e', '#62c9b2', '#2f9488'] };
    O.trees.forEach((tr, i) => copies(tr.u, 30, 1200, ua, ub, (x) => palmTree(g, x, st.far, tr.s * 1.15, palmC, i * 11 + 4)));
    for (const l of O.lamps) copies(l.u, 12, 1200, ua, ub, (x) => {
      g.fillStyle = '#7f6f9a';
      g.fillRect(x - 0.6, st.far - 44, 1.2, 44);
      g.fillRect(x - 0.6, st.far - 44, 7, 1);
      g.fillStyle = '#fff6d8';
      g.fillRect(x + 4, st.far - 43.5, 4, 1.6);
      g.fillStyle = '#7f6f9a';
      g.fillRect(x - 2, st.far - 2, 4, 2);
    });
    g.fillStyle = vgrad(g, st.far, st.near, [[0, '#a596bf'], [1, '#bba8cf']]);
    g.fillRect(ua - 30, st.far, ub - ua + 60, st.near - st.far);
    g.fillStyle = 'rgba(255,245,252,0.85)';
    const my = (st.far + st.near) / 2 + 1;
    for (let u = Math.floor(ua / 24) * 24; u < ub + 24; u += 24) g.fillRect(u, my, 11, 0.8);
    g.fillStyle = '#f7d9d2';
    g.fillRect(ua - 30, st.near, ub - ua + 60, WALL_BASE - st.near);
    g.fillStyle = '#fff2ee';
    g.fillRect(ua - 30, st.near, ub - ua + 60, 0.6);
  }
}

// ------------------------------------------------------------------ outside: per frame
function carSprite(kind, k) {
  const W = { cab: 32, car: 30, bus: 66 }[kind];
  const H = { cab: 14, car: 13, bus: 24 }[kind];
  const c = canvas(W * k, H * k);
  const g = c.getContext('2d');
  g.setTransform(k, 0, 0, k, 1 * k, 0);
  const y = H - 1; // wheel line
  if (kind === 'bus') {
    g.fillStyle = '#ff9fcf';
    g.beginPath(); rr(g, 0, y - 22, 64, 19, 3); g.fill();
    g.fillStyle = '#7fe3e0';
    g.fillRect(0, y - 9, 64, 2.5);
    g.fillStyle = '#4a5f9a';
    for (let i = 0; i < 7; i++) g.fillRect(4 + i * 8.2, y - 19, 6.5, 6);
    g.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 7; i++) g.fillRect(4 + i * 8.2, y - 19, 6.5, 1.5);
    g.fillStyle = '#ffe9a0';
    g.fillRect(61, y - 7, 3, 2);
  } else if (kind === 'cab') {
    g.fillStyle = '#ffd86a';
    g.beginPath();
    g.moveTo(0, y - 3); g.lineTo(1, y - 7); g.lineTo(8, y - 8); g.lineTo(12, y - 12); g.lineTo(22, y - 12); g.lineTo(26, y - 8); g.lineTo(30, y - 7); g.lineTo(30, y - 3);
    g.closePath(); g.fill();
    g.fillStyle = '#4a5f9a';
    g.fillRect(12.5, y - 11, 4.5, 3); g.fillRect(18, y - 11, 4, 3);
    g.fillStyle = '#ff8fc8';
    g.fillRect(15, y - 14, 5, 2);
    g.fillStyle = 'rgba(80,50,120,0.4)';
    for (let i = 0; i < 6; i++) g.fillRect(2 + i * 4.5, y - 6, 2.2, 1);
  } else {
    // an 80s wedge
    g.fillStyle = '#7fe3e0';
    g.beginPath();
    g.moveTo(0, y - 3); g.lineTo(0, y - 6); g.lineTo(10, y - 8); g.lineTo(15, y - 11); g.lineTo(22, y - 11); g.lineTo(28, y - 6); g.lineTo(28, y - 3);
    g.closePath(); g.fill();
    g.fillStyle = '#4a5f9a';
    g.beginPath(); g.moveTo(15.5, y - 10.2); g.lineTo(21.5, y - 10.2); g.lineTo(25, y - 7); g.lineTo(13, y - 7.4); g.closePath(); g.fill();
    g.fillStyle = '#ff6fb8';
    g.fillRect(1, y - 5.2, 27, 0.8);
  }
  g.fillStyle = '#2f2448';
  const wheels = kind === 'bus' ? [10, 54] : kind === 'cab' ? [6, 24] : [6, 22];
  for (const wx of wheels) { g.beginPath(); g.arc(wx, y - 2, 2.4, 0, TAU); g.fill(); }
  g.fillStyle = '#cdc7da';
  for (const wx of wheels) { g.beginPath(); g.arc(wx, y - 2, 1, 0, TAU); g.fill(); }
  return { c, w: W, h: H };
}

function blimpSprite(k) {
  const W = 70;
  const H = 30;
  const c = canvas(W * k, H * k);
  const g = c.getContext('2d');
  g.setTransform(k, 0, 0, k, 0, 0);
  const cx = 34;
  const cy = 12;
  // fins (it faces left: nose at small x)
  g.fillStyle = '#7fe3e0';
  g.beginPath(); g.moveTo(56, cy - 2); g.lineTo(66, cy - 10); g.lineTo(66, cy - 3); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(56, cy + 2); g.lineTo(66, cy + 10); g.lineTo(66, cy + 3); g.closePath(); g.fill();
  g.fillStyle = vgrad(g, cy - 10, cy + 10, [[0, '#ffd2ec'], [0.5, '#ff9fd2'], [1, '#c77ad0']]);
  g.beginPath(); g.ellipse(cx, cy, 30, 10, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.5)';
  g.beginPath(); g.ellipse(cx - 4, cy - 5, 20, 2.4, 0, 0, TAU); g.fill();
  g.fillStyle = '#2a1f6c';
  g.fillRect(cx - 17, cy - 3.5, 34, 7);
  ptext(g, 'EGGCORP', cx, cy - 2.5, 1, '#7ff3ff', 'center');
  g.fillStyle = '#cdc7da';
  g.beginPath(); rr(g, cx - 6, cy + 9.5, 12, 4, 1.5); g.fill();
  g.fillStyle = '#4a5f9a';
  g.fillRect(cx - 4, cy + 10.5, 8, 1.5);
  return { c, w: W, h: H, ox: -cx, oy: -cy };
}

function drawFlyer(ctx, fl, B) {
  if (fl.kind === 'birds') {
    ctx.strokeStyle = '#7d6aa6';
    ctx.lineWidth = 0.9;
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const bx = fl.x + i * 8 + (i % 2) * 2;
      const by = fl.y + (i % 2) * 4 - (i === 2 ? 3 : 0);
      const f = Math.sin((fl.phase + i * 0.23) * TAU) * 2;
      ctx.beginPath();
      ctx.moveTo(bx - 3, by - f);
      ctx.quadraticCurveTo(bx - 1.2, by - 1, bx, by);
      ctx.quadraticCurveTo(bx + 1.2, by - 1, bx + 3, by - f);
      ctx.stroke();
    }
  } else if (fl.kind === 'blimp') {
    const S = B.blimp;
    ctx.save();
    ctx.translate(fl.x, fl.y);
    if (fl.dir > 0) ctx.scale(-1, 1);
    ctx.drawImage(S.c, S.ox, S.oy, S.w, S.h);
    ctx.restore();
  } else if (fl.kind === 'heli') {
    const x = fl.x;
    const y = fl.y;
    ctx.fillStyle = '#251a44';
    ctx.beginPath(); ctx.ellipse(x, y, 7, 3.6, 0, 0, TAU); ctx.fill();
    ctx.fillRect(x - 16, y - 1.2, 11, 1.6);
    ctx.fillRect(x - 17, y - 4, 1.4, 4);
    ctx.fillRect(x - 3, y + 3.6, 8, 0.7);
    ctx.fillStyle = '#ff9fd8';
    ctx.fillRect(x + 2, y - 2, 3.5, 2);
    const span = 14 * Math.abs(Math.cos(fl.phase * TAU));
    ctx.fillStyle = 'rgba(37,26,68,0.85)';
    ctx.fillRect(x - span, y - 4.6, span * 2, 0.8);
    ctx.fillRect(x - 0.4, y - 4.6, 0.8, 1.2);
    if (fl.phase < 0.5) {
      ctx.fillStyle = '#ff5f7a';
      ctx.beginPath(); ctx.arc(x - 16.3, y - 4.2, 0.9, 0, TAU); ctx.fill();
    }
  }
}

// ------------------------------------------------------------------ wall: hangs (static)
function clockFace(g, cx, cy, r) {
  g.fillStyle = hgrad(g, cx - r - 2, cx + r + 2, [[0, '#ffffff'], [1, '#7f7898']]);
  g.beginPath(); g.arc(cx, cy, r + 2, 0, TAU); g.fill();
  g.fillStyle = hgrad(g, cx - r, cx + r, [[0, '#8c85a3'], [1, '#f2eef8']]);
  g.beginPath(); g.arc(cx, cy, r + 0.8, 0, TAU); g.fill();
  g.fillStyle = '#fdf7ff';
  g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const big = i % 3 === 0;
    g.fillStyle = big ? PASTELS[(i / 3) % 4] : '#b3a8cc';
    g.beginPath();
    g.arc(cx + Math.sin(a) * r * 0.78, cy - Math.cos(a) * r * 0.78, big ? 1.1 : 0.45, 0, TAU);
    g.fill();
  }
}

const TEAL95 = { face: '#2f9c9a', hi: '#a8f0ec', lt: '#62c6c2', lo: '#1c6c70', dk: '#0f4650' };
function liftStatic(g, h, x, F, Pl) {
  const y = WALL_BASE - h.h;
  const w = h.w;
  // the lift bank is clad in the Win95 desktop's teal
  panel(g, x - 4, y - 22, w + 8, h.h + 22, true, 0.75, TEAL95);
  g.fillStyle = 'rgba(255,255,255,0.08)';
  g.fillRect(x - 3, y - 21, w + 6, 6);
  panel(g, x - 4, y - 4, w + 8, h.h + 4, true, 1);
  g.fillStyle = '#b8b0cc';
  g.fillRect(x - 1, y - 1, w + 2, h.h + 1);
  // the lit car
  g.fillStyle = vgrad(g, y, WALL_BASE, [[0, Pl.liftIn[0]], [1, Pl.liftIn[1]]]);
  g.fillRect(x, y, w, h.h);
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.fillRect(x + 3, y + 1, w - 6, 1.2);
  g.fillStyle = 'rgba(120,80,140,0.18)';
  g.fillRect(x + w / 3, y + 3, 0.6, h.h - 6);
  g.fillRect(x + (2 * w) / 3, y + 3, 0.6, h.h - 6);
  g.fillStyle = 'rgba(255,255,255,0.65)';
  g.fillRect(x + 2, y + h.h * 0.55, w - 4, 1);
  bevel(g, x - 1, y - 1, w + 2, h.h + 1, false, 0.5);
  // the LCD over the doors
  const lw = 9 + 5 * h.label.length;
  const lx = x + w / 2 - lw / 2;
  const ly = y - 16;
  panel(g, lx - 1.5, ly - 1.5, lw + 3, 12, true, 0.5);
  g.fillStyle = '#182436';
  g.fillRect(lx, ly, lw, 9);
  bevel(g, lx, ly, lw, 9, false, 0.5);
  [...h.label].forEach((ch, i) => seg7(g, ch, lx + 6.5 + i * 5, ly + 1.5, 4, 6, 0.9, '#7ff7e6', 'rgba(127,247,230,0.1)'));
}

function liftLeaf(Pl, w, h, k, flip) {
  const c = canvas(w * k, h * k);
  const g = c.getContext('2d');
  g.setTransform(k, 0, 0, k, 0, 0);
  const [a, b, hl] = Pl.leaf;
  g.fillStyle = hgrad(g, 0, w, flip ? [[0, b], [0.5, a], [1, hl]] : [[0, hl], [0.5, a], [1, b]]);
  g.fillRect(0, 0, w, h);
  // brushed metal
  const r = rng(w * 13 + h);
  for (let i = 0; i < h * 0.8; i++) {
    g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(90,50,110,0.07)';
    g.fillRect(0, r() * h, w, 0.4);
  }
  // a diagonal reflection
  g.fillStyle = 'rgba(255,255,255,0.18)';
  g.beginPath(); g.moveTo(w * 0.1, h); g.lineTo(w * 0.55, h); g.lineTo(w * 0.95, 0); g.lineTo(w * 0.5, 0); g.closePath(); g.fill();
  // meeting edge bevel
  if (flip) { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 0.5, h); } else { g.fillStyle = 'rgba(70,40,90,0.45)'; g.fillRect(w - 0.5, 0, 0.5, h); }
  return c;
}

function logoSign(g, x, y, w, h) {
  // the centrepiece: an album cover — a sunset egg rising off a neon grid, chrome type
  panel(g, x - 3, y - 3, w + 6, h + 6, true, 1);
  g.fillStyle = vgrad(g, y, y + h, [[0, '#1d1450'], [0.55, '#4a2272'], [1, '#a0368e']]);
  g.fillRect(x, y, w, h);
  bevel(g, x, y, w, h, false, 0.5);
  // stars
  const r = rng(77);
  g.fillStyle = 'rgba(255,255,255,0.8)';
  for (let i = 0; i < 26; i++) g.fillRect(x + 2 + r() * (w - 4), y + 2 + r() * h * 0.45, 0.5, 0.5);
  // grid floor
  const gy = y + h * 0.7;
  g.save();
  g.beginPath(); g.rect(x, gy, w, y + h - gy); g.clip();
  g.fillStyle = 'rgba(30,10,60,0.6)';
  g.fillRect(x, gy, w, y + h - gy);
  g.strokeStyle = '#ff6fd0';
  g.lineWidth = 0.5;
  g.beginPath();
  const ex = x + 34;
  for (let i = -12; i <= 12; i++) { g.moveTo(ex + i * 2.5, gy); g.lineTo(ex + i * 22, y + h); }
  for (let j = 1; j < 6; j++) { const yy = gy + (y + h - gy) * Math.pow(j / 6, 1.8); g.moveTo(x, yy); g.lineTo(x + w, yy); }
  g.stroke();
  g.restore();
  g.fillStyle = '#ff9fe6';
  g.fillRect(x, gy, w, 0.6);
  // the sunset egg
  const ecx = x + 34;
  const ecy = y + h * 0.45;
  const sc = canvas(40 * 3, 40 * 3);
  const sg = sc.getContext('2d');
  sg.setTransform(3, 0, 0, 3, 60, 60);
  sg.fillStyle = vgrad(sg, -18, 16, [[0, '#fff58a'], [0.45, '#ffaf6a'], [1, '#ff3fa6']]);
  sg.beginPath();
  for (let i = 0; i <= 40; i++) { const t = (i / 40) * TAU; const sn = Math.sin(t); sg.lineTo(Math.cos(t) * 13 * (1 + 0.12 * sn), sn * 17); }
  sg.closePath();
  sg.fill();
  sg.globalCompositeOperation = 'destination-out';
  let yy = 0;
  let gp = 0.8;
  while (yy < 18) { sg.fillRect(-20, yy, 40, gp); yy += gp + 2.6 - gp * 0.3; gp += 0.5; }
  g.save();
  g.beginPath(); g.rect(x, y, w, gy - y); g.clip();
  const gl = g.createRadialGradient(ecx, ecy, 2, ecx, ecy, 30);
  gl.addColorStop(0, 'rgba(255,150,200,0.55)');
  gl.addColorStop(1, 'rgba(255,100,200,0)');
  g.fillStyle = gl;
  g.fillRect(x, y, w, gy - y);
  g.drawImage(sc, ecx - 20, ecy - 20 + 4, 40, 40);
  g.restore();
  // chrome type
  const tx = x + 62;
  const ty = y + h * 0.5;
  g.font = 'italic 900 19px "Arial Black", "Helvetica Neue", Impact, sans-serif';
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
  const mw = g.measureText('EGGCORP').width;
  const sx = Math.min(1, (w - 66) / mw);
  g.save();
  g.translate(tx, ty + 4);
  g.scale(sx, 1);
  g.fillStyle = '#ff4fb8';
  g.fillText('EGGCORP', 1.4, 1.4);
  g.fillStyle = '#29e3ff';
  g.fillText('EGGCORP', -0.8, -0.6);
  const cg = g.createLinearGradient(0, -14, 0, 1);
  cg.addColorStop(0, '#2b6fd8'); cg.addColorStop(0.42, '#d8f4ff'); cg.addColorStop(0.5, '#ffffff');
  cg.addColorStop(0.52, '#5a2a7a'); cg.addColorStop(0.75, '#ff7fbf'); cg.addColorStop(1, '#ffe2f2');
  g.fillStyle = cg;
  g.fillText('EGGCORP', 0, 0);
  g.lineWidth = 0.5;
  g.strokeStyle = 'rgba(255,255,255,0.8)';
  g.strokeText('EGGCORP', 0, 0);
  g.restore();
  g.font = '500 7px "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", sans-serif';
  g.fillStyle = '#ffd2f0';
  g.textAlign = 'center';
  const jx = tx + (mw * sx) / 2;
  g.fillText('エッグコープ株式会社', jx, ty + 13);
  g.textAlign = 'left';
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = 'rgba(255,255,255,0.08)';
  g.beginPath(); g.moveTo(x + w * 0.52, y); g.lineTo(x + w * 0.7, y); g.lineTo(x + w * 0.5, y + h); g.lineTo(x + w * 0.32, y + h); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.12)';
  g.beginPath(); g.moveTo(x + w * 0.73, y); g.lineTo(x + w * 0.76, y); g.lineTo(x + w * 0.56, y + h); g.lineTo(x + w * 0.53, y + h); g.closePath(); g.fill();
  g.restore();
}

function poster(g, h, x) {
  const y = h.y;
  const wide = h.label === 'SYNERGY' ? 2 : 0; // two px more, so the word fits at full spacing
  const w = h.w + wide;
  x -= wide / 2;
  const hh = h.h;
  if (h.label === 'SYNERGY') {
    const c = win95(g, x, y, w, hh, 'INFO', { buttons: 1, client: '#f4ecfb' });
    // the venn of synergy
    g.globalAlpha = 0.85;
    g.fillStyle = '#ff8fd0';
    g.beginPath(); g.arc(c.x + c.w / 2 - 3.5, c.y + 9, 6, 0, TAU); g.fill();
    g.fillStyle = '#5fdcd8';
    g.beginPath(); g.arc(c.x + c.w / 2 + 3.5, c.y + 9, 6, 0, TAU); g.fill();
    g.globalAlpha = 1;
    g.fillStyle = '#b06fe0';
    g.beginPath(); g.ellipse(c.x + c.w / 2, c.y + 9, 2.4, 4.6, 0, 0, TAU); g.fill();
    ptext(g, 'SYNERGY', c.x + c.w / 2, c.y + 17.5, 1, '#2a1f6c', 'center');
    panel(g, c.x + c.w / 2 - 6, c.y + c.h - 8, 12, 6.5, true, 0.5);
    ptext(g, 'OK', c.x + c.w / 2, c.y + c.h - 7, 1, '#111', 'center');
  } else if (h.label === 'HANG IN THERE') {
    const c = win95(g, x, y, w, hh, 'CAT', { buttons: 1, client: '#ffffff', active: false });
    const pic = { x: c.x + 1, y: c.y + 1, w: c.w - 2, h: c.h - 14 };
    g.fillStyle = vgrad(g, pic.y, pic.y + pic.h, [[0, '#9fd0ff'], [1, '#ffd0e8']]);
    g.fillRect(pic.x, pic.y, pic.w, pic.h);
    // the branch and the kitten hanging off it
    g.strokeStyle = '#8a5a5a';
    g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(pic.x, pic.y + 5); g.quadraticCurveTo(pic.x + pic.w / 2, pic.y + 3, pic.x + pic.w, pic.y + 7); g.stroke();
    g.fillStyle = '#62b89a';
    g.beginPath(); g.ellipse(pic.x + 4, pic.y + 4, 3, 1.5, 0.4, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(pic.x + pic.w - 4, pic.y + 5.5, 3, 1.5, -0.4, 0, TAU); g.fill();
    const kx = pic.x + pic.w / 2;
    const ky = pic.y + 9;
    g.fillStyle = '#f2a65a';
    g.fillRect(kx - 3, ky - 5, 1, 4); g.fillRect(kx + 2, ky - 5, 1, 4);
    g.beginPath(); g.ellipse(kx, ky + 3, 3, 4, 0, 0, TAU); g.fill();
    g.beginPath(); g.arc(kx, ky - 1, 2.6, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(kx - 2.6, ky - 2); g.lineTo(kx - 2, ky - 4.8); g.lineTo(kx - 0.6, ky - 3); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(kx + 2.6, ky - 2); g.lineTo(kx + 2, ky - 4.8); g.lineTo(kx + 0.6, ky - 3); g.closePath(); g.fill();
    g.fillStyle = '#2a1f3c';
    g.fillRect(kx - 1.4, ky - 1.5, 0.7, 0.7); g.fillRect(kx + 0.7, ky - 1.5, 0.7, 0.7);
    ptext(g, 'HANG IN', c.x + c.w / 2, c.y + c.h - 12, 1, '#2a1f6c', 'center');
    ptext(g, 'THERE', c.x + c.w / 2, c.y + c.h - 6, 1, '#ff4fa8', 'center');
  } else {
    const c = win95(g, x, y, w, hh, 'TEAM', { buttons: 1, client: '#f0f6ff' });
    // three heads, one rising arrow
    const cx = c.x + c.w / 2;
    [['#ff9ed8', -6], ['#7fe3e0', 0], ['#c9a8f0', 6]].forEach(([col, dx], i) => {
      g.fillStyle = col;
      g.beginPath(); g.arc(cx + dx, c.y + 9 - (i === 1 ? 2 : 0), 2.4, 0, TAU); g.fill();
      g.beginPath(); rr(g, cx + dx - 3, c.y + 12 - (i === 1 ? 2 : 0), 6, 6, 2); g.fill();
    });
    g.strokeStyle = '#2a1f6c';
    g.lineWidth = 0.7;
    g.beginPath(); g.moveTo(c.x + 3, c.y + 21); g.lineTo(cx - 2, c.y + 17); g.lineTo(cx + 3, c.y + 19); g.lineTo(c.x + c.w - 4, c.y + 13); g.stroke();
    ptext(g, 'TEAM', cx, c.y + c.h - 12, 1, '#2a1f6c', 'center');
    ptext(g, 'WORK', cx, c.y + c.h - 6, 1, '#2a1f6c', 'center');
  }
}

function whiteboard(g, h, x) {
  const { y, w } = h;
  const hh = h.h;
  panel(g, x - 2, y - 2, w + 4, hh + 4, true, 0.75);
  g.fillStyle = '#fbf7ff';
  g.fillRect(x, y, w, hh);
  bevel(g, x, y, w, hh, false, 0.5);
  g.fillStyle = 'rgba(160,140,220,0.12)';
  for (let gx = x + 6; gx < x + w; gx += 6) g.fillRect(gx, y + 1, 0.4, hh - 2);
  for (let gy = y + 6; gy < y + hh; gy += 6) g.fillRect(x + 1, gy, w - 2, 0.4);
  // the chart: bars and a rocketing line
  const bx = x + 10;
  const by = y + hh - 8;
  g.strokeStyle = '#3a2f7a';
  g.lineWidth = 0.8;
  g.beginPath(); g.moveTo(bx, y + 8); g.lineTo(bx, by); g.lineTo(x + w - 8, by); g.stroke();
  const bars = [5, 7, 6, 10, 13, 19, 25];
  bars.forEach((v, i) => {
    g.fillStyle = i % 2 ? 'rgba(95,220,216,0.7)' : 'rgba(255,143,208,0.7)';
    g.fillRect(bx + 4 + i * 10, by - v, 6, v);
  });
  g.strokeStyle = '#ff3f9a';
  g.lineWidth = 1.1;
  g.lineCap = 'round';
  g.beginPath();
  bars.forEach((v, i) => { const px = bx + 7 + i * 10; const py = by - v - 4 - i * 0.6; if (i) g.lineTo(px, py); else g.moveTo(px, py); });
  g.stroke();
  const ax = bx + 7 + 6 * 10;
  const ay = by - 25 - 4 - 3.6;
  g.beginPath(); g.moveTo(ax - 3, ay - 0.5); g.lineTo(ax + 1.5, ay - 3.5); g.lineTo(ax + 0.5, ay + 1.5); g.stroke();
  ptext(g, 'Q3', x + 4, y + 3, 1, '#3a2f7a');
  ptext(g, '1000%', x + w - 6, y + 3, 1, '#ff3f9a', 'right');
  // marker tray
  panel(g, x + 6, y + hh + 1.5, w - 12, 2.5, true, 0.5);
  ['#ff4fa8', '#29b8d8', '#3a2f7a'].forEach((c, i) => { g.fillStyle = c; g.fillRect(x + 12 + i * 9, y + hh + 0.5, 6, 1.4); });
}

function painting(g, h, x) {
  const { y, w } = h;
  const hh = h.h;
  if (h.variant === 1) {
    const c = win95(g, x, y, w, hh, 'CITY', { buttons: 1, client: '#000' });
    g.drawImage(miniCity(c.w, c.h), c.x, c.y, c.w, c.h);
  } else {
    // a Memphis abstract in a chrome frame
    panel(g, x - 3, y - 3, w + 6, hh + 6, true, 1);
    g.fillStyle = '#ffe6d6';
    g.fillRect(x, y, w, hh);
    bevel(g, x, y, w, hh, false, 0.5);
    g.save();
    g.beginPath(); g.rect(x, y, w, hh); g.clip();
    g.fillStyle = '#7fe3e0';
    g.beginPath(); g.arc(x + w * 0.3, y + hh * 0.55, 13, 0, TAU); g.fill();
    g.fillStyle = '#ff7fc4';
    g.beginPath(); g.moveTo(x + w * 0.5, y + hh - 4); g.lineTo(x + w * 0.78, y + 6); g.lineTo(x + w * 0.98, y + hh - 4); g.closePath(); g.fill();
    g.fillStyle = '#fff07a';
    g.fillRect(x + w * 0.62, y + 4, 12, 6);
    g.fillStyle = '#2a1f4c';
    for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) g.fillRect(x + 6 + i * 3, y + 5 + j * 3, 0.9, 0.9);
    g.strokeStyle = '#2a1f4c';
    g.lineWidth = 1.2;
    g.beginPath();
    for (let s = 0; s <= 24; s++) { const px = x + 8 + (s / 24) * (w - 16); const py = y + hh * 0.78 + Math.sin(s * 0.9) * 2.2; if (s) g.lineTo(px, py); else g.moveTo(px, py); }
    g.stroke();
    g.strokeStyle = '#b48cf0';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(x + w * 0.1, y + hh * 0.2); g.lineTo(x + w * 0.2, y + hh * 0.1); g.lineTo(x + w * 0.3, y + hh * 0.2); g.lineTo(x + w * 0.4, y + hh * 0.1); g.stroke();
    g.restore();
  }
}

const MINI = new Map();
function miniCity(w, h) {
  const key = `${w}x${h}`;
  if (MINI.has(key)) return MINI.get(key);
  const k = 2;
  const c = canvas(w * k, h * k);
  const g = c.getContext('2d');
  g.setTransform(k, 0, 0, k, 0, 0);
  g.drawImage(ditherBox(k, w, h * 0.7, [[0, '#2a1a5e'], [0.6, '#c8459a'], [1, '#ffb07a']], { levels: 2 }), 0, 0, w, h * 0.7);
  g.fillStyle = '#ffd36a';
  g.beginPath(); g.arc(w / 2, h * 0.62, 7, Math.PI, TAU); g.fill();
  const r = rng(5);
  for (let x = 0; x < w; x += 3 + r() * 3) {
    const bh = 5 + r() * h * 0.35;
    g.fillStyle = '#2b1d55';
    g.fillRect(x, h * 0.7 - bh, 3 + r() * 3, bh);
    g.fillStyle = '#ff9ed8';
    if (r() < 0.6) g.fillRect(x + 1, h * 0.7 - bh + 2, 0.6, 0.6);
  }
  g.fillStyle = '#1a0f3a';
  g.fillRect(0, h * 0.7, w, h * 0.3);
  g.strokeStyle = '#ff6fd0';
  g.lineWidth = 0.4;
  g.beginPath();
  for (let i = -8; i <= 8; i++) { g.moveTo(w / 2 + i * 1.5, h * 0.7); g.lineTo(w / 2 + i * 7, h); }
  for (let j = 1; j < 4; j++) { const yy = h * 0.7 + h * 0.3 * Math.pow(j / 4, 1.6); g.moveTo(0, yy); g.lineTo(w, yy); }
  g.stroke();
  MINI.set(key, c);
  return c;
}

function door(g, h, x, F) {
  const y = h.y;
  const w = h.w;
  const hh = h.h;
  panel(g, x - 3, y - 3, w + 6, hh + 3, true, 1);
  const exec = F.id === 'exec';
  const face = exec ? '#7a4568' : '#8fd3d2';
  g.fillStyle = vgrad(g, y, y + hh, [[0, exec ? '#8a5278' : '#a6e0de'], [1, face]]);
  g.fillRect(x, y, w, hh);
  bevel(g, x, y, w, hh, false, 0.5);
  const C2 = exec
    ? { face: '#7a4568', hi: '#c88ab0', lt: '#a8709a', lo: '#4a2440', dk: '#30162a' }
    : { face: '#8fd3d2', hi: '#e8ffff', lt: '#c4f0ee', lo: '#5aa0a6', dk: '#3c7480' };
  bevel(g, x + 4, y + 26, w - 8, hh * 0.32, true, 0.75, C2);
  bevel(g, x + 4, y + 30 + hh * 0.32, w - 8, hh - 34 - hh * 0.32, true, 0.75, C2);
  // lever handle
  g.fillStyle = '#e9e5f1';
  g.fillRect(x + w - 8, y + hh * 0.55, 5, 1.4);
  g.fillStyle = '#8c85a3';
  g.fillRect(x + w - 8, y + hh * 0.55 + 1.4, 5, 0.5);
  g.beginPath(); g.arc(x + w - 4, y + hh * 0.55 + 0.7, 1.4, 0, TAU); g.fill();
  // name plate
  if (h.label === 'MEETING 4B') {
    panel(g, x + 3.5, y + 6, w - 7, 14, false, 0.5, CHROME, '#fbf8ff');
    ptext(g, 'MEETING', x + w / 2, y + 7.5, 1, '#2a1f6c', 'center');
    ptext(g, '4B', x + w / 2, y + 13.5, 1, '#ff3f9a', 'center');
    // the IN USE light over the door
    panel(g, x + w / 2 - 14, y - 12, 28, 8, true, 0.5);
    g.fillStyle = '#2a0f1c';
    g.fillRect(x + w / 2 - 12.5, y - 10.5, 25, 5.5);
    ptext(g, 'IN USE', x + w / 2, y - 10.2, 1, '#ff4f6a', 'center');
  } else {
    panel(g, x + w / 2 - 9, y + 8, 18, 9, true, 0.5, CHROME, '#f6e2a8');
    ptext(g, h.label, x + w / 2, y + 10, 1, '#4a2a3c', 'center');
  }
}

function extinguisher(g, h, x) {
  const { y, w } = h;
  const hh = h.h;
  g.fillStyle = '#8c85a3';
  g.fillRect(x - 1, y + 5, w + 2, 1.2);
  g.fillStyle = vgrad(g, y, y + hh, [[0, '#f27a8a'], [1, '#c4506a']]);
  g.beginPath(); rr(g, x, y + 3, w, hh - 3, 2.5); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.45)';
  g.fillRect(x + 1.2, y + 5, 0.8, hh - 7);
  g.fillStyle = '#fff3f6';
  g.fillRect(x + 1, y + 8, w - 2, 3);
  g.fillStyle = '#cdc7da';
  g.fillRect(x + 2, y, w - 4, 3.2);
  g.strokeStyle = '#3a2f4a';
  g.lineWidth = 0.7;
  g.beginPath(); g.moveTo(x + w - 2, y + 1.5); g.quadraticCurveTo(x + w + 3, y + 4, x + w + 1.5, y + hh * 0.7); g.stroke();
}

function trophyCase(g, h, x, k) {
  const y = WALL_BASE - h.h;
  const { w } = h;
  const hh = h.h;
  const RW = { face: '#6a3a5c', hi: '#b47ea2', lt: '#8e5a7e', lo: '#3e1f36', dk: '#26101f' };
  panel(g, x, y, w, hh, true, 1, RW);
  const ix = x + 4;
  const iy = y + 5;
  const iw = w - 8;
  const ih = hh - 34;
  g.fillStyle = vgrad(g, iy, iy + ih, [[0, '#ffe2f4'], [1, '#c9a0e0']]);
  g.fillRect(ix, iy, iw, ih);
  bevel(g, ix, iy, iw, ih, false, 0.5, RW);
  const shelves = [iy + ih * 0.34, iy + ih * 0.67, iy + ih - 0.5];
  const r = rng(91);
  shelves.forEach((sy, si) => {
    g.fillStyle = 'rgba(255,255,255,0.8)';
    g.fillRect(ix, sy - 0.6, iw, 0.6);
    g.fillStyle = 'rgba(80,40,90,0.25)';
    g.fillRect(ix, sy, iw, 1.2);
    let px = ix + 4;
    while (px < ix + iw - 8) {
      const kind = (r() * 3) | 0;
      if (si === 0 && px < ix + 14) {
        // a tiny marble bust of the founder on a chrome foot
        g.fillStyle = '#cdc7da';
        g.fillRect(px + 1.5, sy - 2, 7, 2);
        drawMarbleBust(g, k, px + 5 - 12 * 0.4, sy - 2 - 15.2 * 0.4, 0.4);
        px += 12;
        continue;
      }
      if (kind === 0) { // cup
        g.fillStyle = vgrad(g, sy - 13, sy, [[0, '#fff3a8'], [1, '#d9a83a']]);
        g.beginPath(); g.moveTo(px, sy - 13); g.lineTo(px + 7, sy - 13); g.quadraticCurveTo(px + 6.5, sy - 7, px + 4.2, sy - 6); g.lineTo(px + 4.2, sy - 3); g.lineTo(px + 6, sy - 2); g.lineTo(px + 6, sy); g.lineTo(px + 1, sy); g.lineTo(px + 1, sy - 2); g.lineTo(px + 2.8, sy - 3); g.lineTo(px + 2.8, sy - 6); g.quadraticCurveTo(px + 0.5, sy - 7, px, sy - 13); g.closePath(); g.fill();
        g.strokeStyle = '#d9a83a'; g.lineWidth = 0.6;
        g.beginPath(); g.arc(px, sy - 10.5, 1.8, Math.PI * 0.5, Math.PI * 1.5); g.stroke();
        g.beginPath(); g.arc(px + 7, sy - 10.5, 1.8, -Math.PI * 0.5, Math.PI * 0.5); g.stroke();
        px += 11;
      } else if (kind === 1) { // plaque
        g.fillStyle = '#7a4568';
        g.fillRect(px, sy - 11, 8, 11);
        g.fillStyle = '#f6d88a';
        g.fillRect(px + 1.5, sy - 8, 5, 3);
        px += 11;
      } else { // a golden egg on a stand
        g.fillStyle = vgrad(g, sy - 11, sy - 2, [[0, '#fff6b8'], [1, '#e0a83a']]);
        g.beginPath(); g.ellipse(px + 3.5, sy - 6.5, 3, 4.2, 0, 0, TAU); g.fill();
        g.fillStyle = '#cdc7da';
        g.fillRect(px + 1, sy - 2.2, 5, 2.2);
        px += 10;
      }
    }
  });
  // glass reflections
  g.fillStyle = 'rgba(255,255,255,0.22)';
  g.beginPath(); g.moveTo(ix + iw * 0.15, iy + ih); g.lineTo(ix + iw * 0.35, iy + ih); g.lineTo(ix + iw * 0.75, iy); g.lineTo(ix + iw * 0.55, iy); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.4)';
  g.fillRect(ix + iw / 2 - 0.25, iy, 0.5, ih);
  // cupboard doors below
  bevel(g, x + 4, y + hh - 26, w / 2 - 5, 22, true, 0.75, RW);
  bevel(g, x + w / 2 + 1, y + hh - 26, w / 2 - 5, 22, true, 0.75, RW);
  g.fillStyle = '#e9d9a0';
  g.fillRect(x + w / 2 - 3, y + hh - 16, 1, 3); g.fillRect(x + w / 2 + 2, y + hh - 16, 1, 3);
}

function bookshelf(g, h, x) {
  const y = WALL_BASE - h.h;
  const { w } = h;
  const hh = h.h;
  const RW = { face: '#5e3352', hi: '#a8749a', lt: '#86527a', lo: '#381a30', dk: '#22101c' };
  panel(g, x, y, w, hh, true, 1, RW);
  const ix = x + 3;
  const iw = w - 6;
  const shelfH = 22;
  const r = rng(303);
  const spines = ['#ff9ed8', '#7fe3e0', '#c9a8f0', '#ffd08a', '#9fd0ff', '#f6f0ff', '#e46f86', '#5a3a8a', '#3fae9e'];
  for (let s = 0; s < 5; s++) {
    const sy = y + 3 + s * (shelfH + 2);
    g.fillStyle = '#3a1c32';
    g.fillRect(ix, sy, iw, shelfH);
    g.fillStyle = 'rgba(255,170,220,0.12)';
    g.fillRect(ix, sy, iw, 3);
    let px = ix + 1;
    while (px < ix + iw - 2) {
      const pick = r();
      if (pick < 0.07 && px < ix + iw - 14) {
        // ornament: a tiny palm, a bust, or a floppy stack
        const o = (r() * 3) | 0;
        if (o === 0) {
          g.fillStyle = '#ff9ed8';
          g.fillRect(px + 2, sy + shelfH - 5, 6, 5);
          palmFronds(g, px + 5, sy + shelfH - 6, 0.38, ['#3fae9e', '#62c9b2'], px | 0, 5);
        } else if (o === 1) {
          g.fillStyle = '#efe6f4';
          g.beginPath(); g.ellipse(px + 5, sy + shelfH - 9, 3, 4, 0, 0, TAU); g.fill();
          g.fillRect(px + 2, sy + shelfH - 5, 6, 5);
        } else {
          for (let q = 0; q < 4; q++) {
            g.fillStyle = PASTELS[q % 6];
            g.fillRect(px + 1, sy + shelfH - 2 - q * 1.6, 8, 1.4);
          }
        }
        px += 11;
        continue;
      }
      const bw = 2 + r() * 2.5;
      const bh = shelfH - 3 - r() * 6;
      const lean = r() < 0.06;
      g.fillStyle = spines[(r() * spines.length) | 0];
      if (lean) {
        g.save(); g.translate(px, sy + shelfH); g.rotate(-0.25); g.fillRect(0, -bh, bw, bh); g.restore();
        px += bw + 3;
      } else {
        g.fillRect(px, sy + shelfH - bh, bw, bh);
        g.fillStyle = 'rgba(255,255,255,0.35)';
        g.fillRect(px, sy + shelfH - bh + 2, bw, 0.5);
        g.fillStyle = 'rgba(40,10,40,0.25)';
        g.fillRect(px + bw - 0.4, sy + shelfH - bh, 0.4, bh);
        px += bw + 0.3;
      }
    }
    bevel(g, ix, sy + shelfH, iw, 2, true, 0.5, RW);
  }
  const cy = y + 3 + 5 * (shelfH + 2);
  bevel(g, ix, cy, iw / 2 - 1, y + hh - cy - 3, true, 0.75, RW);
  bevel(g, ix + iw / 2 + 1, cy, iw / 2 - 1, y + hh - cy - 3, true, 0.75, RW);
}

function portrait(g, h, x, k) {
  const { y, w } = h;
  const hh = h.h;
  const c = win95(g, x, y, w, hh, 'DON.BMP', { buttons: 2, status: h.label, client: '#000' });
  g.drawImage(founderBmp(c.w, c.h, k), c.x, c.y, c.w, c.h);
}

const BMP = new Map();
function founderBmp(w, h, k) {
  const key = `${w}x${h}@${k}`;
  if (BMP.has(key)) return BMP.get(key);
  const c = canvas(w * k, h * k);
  const g = c.getContext('2d');
  g.setTransform(k, 0, 0, k, 0, 0);
  g.fillStyle = vgrad(g, 0, h, [[0, '#7fe3e0'], [0.5, '#c9a8f0'], [1, '#ff9ed8']]);
  g.fillRect(0, 0, w, h);
  // a studio vignette and a grid floor, because it is 1995
  g.strokeStyle = 'rgba(255,255,255,0.35)';
  g.lineWidth = 0.4;
  g.beginPath();
  for (let i = -10; i <= 10; i++) { g.moveTo(w / 2 + i * 2, h * 0.62); g.lineTo(w / 2 + i * 9, h); }
  g.stroke();
  const vg = g.createRadialGradient(w / 2, h * 0.4, 4, w / 2, h * 0.45, w * 0.8);
  vg.addColorStop(0, 'rgba(255,255,255,0.35)');
  vg.addColorStop(1, 'rgba(60,20,90,0.25)');
  g.fillStyle = vg;
  g.fillRect(0, 0, w, h);
  // the official portrait: head and shoulders, the mane cropped close by the frame
  const ps = w / 15.5;
  professor(g, w / 2 - 12 * ps, 2.5 + 1.9 * ps, ps);
  webSafe(c, k, 6, 0.5);
  BMP.set(key, c);
  return c;
}

// ------------------------------------------------------------------ wall strip
function glassPanes(b, G) {
  const w = b.u1 - b.u;
  const n = Math.max(1, Math.round(w / G.mullion));
  return { n, step: w / n };
}

function paintWall(g, F, Pl, ua, ub, k) {
  const W = F.wall;
  const G = F.glass;
  const P = W.period;
  const top = F.ceilingY;
  const fid = F.id;
  // 1. bays
  W.bays.forEach((b, bi) => copies(b.u, b.u1 - b.u, P, ua, ub, (x0) => {
    const x1 = x0 + (b.u1 - b.u);
    const w = x1 - x0;
    if (b.type === 'wall') wallBay(g, F, Pl, x0, x1, top, WALL_BASE, bi, k);
    else {
      wallBay(g, F, Pl, x0, x1, top, G.top, bi + 50, k, true);
      if (fid === 'open') {
        // under the sill: the HVAC strip
        panel(g, x0, G.bottom, w, WALL_BASE - G.bottom, true, 0.75);
        g.fillStyle = '#b9b2ca';
        g.fillRect(x0 + 3, G.bottom + 8, w - 6, WALL_BASE - G.bottom - 16);
        for (let yy = G.bottom + 9; yy < WALL_BASE - 9; yy += 2.5) {
          g.fillStyle = '#8c85a3'; g.fillRect(x0 + 4, yy, w - 8, 0.7);
          g.fillStyle = '#ece8f4'; g.fillRect(x0 + 4, yy + 0.7, w - 8, 0.5);
        }
        g.fillStyle = '#7fe3e0';
        g.fillRect(x0 + 3, G.bottom + 4, w - 6, 1.2);
        for (let q = x0 + 40; q < x1 - 20; q += 44) bevel(g, q, G.bottom + 7, 0.75, WALL_BASE - G.bottom - 14, false, 0.5);
      }
      glassBay(g, F, Pl, b, x0, x1);
    }
  }));
  // 2. columns
  W.columns.forEach((c, ci) => copies(c.u, c.w, P, ua, ub, (x) => column(g, F, Pl, x, c.w, ci)));
  // 3. hangs
  W.hangs.forEach((h, hi) => {
    const hw = h.w || (h.r ? h.r * 2 : 40);
    const hx0 = h.kind === 'clock' ? h.u - h.r : h.u;
    copies(hx0, hw, P, ua, ub, (x) => {
      const X = h.kind === 'clock' ? x + h.r : x;
      const hy = h.y ?? WALL_BASE - h.h;
      const hh = { ...h, x: X, y: hy };
      const sh = shadowBox(h, X, hy);
      if (sh) dropShadow(g, k, sh, fid === 'exec' ? 'rgba(20,6,30,0.45)' : 'rgba(90,50,130,0.26)');
      switch (h.kind) {
        case 'lift': liftStatic(g, hh, X, F, Pl); break;
        case 'logo': logoSign(g, X, hy, h.w, h.h); break;
        case 'clock': clockFace(g, X, h.y, h.r); break;
        case 'painting': painting(g, hh, X); break;
        case 'poster': poster(g, hh, X); break;
        case 'whiteboard': whiteboard(g, hh, X); break;
        case 'door': door(g, hh, X, F); break;
        case 'extinguisher': extinguisher(g, hh, X); break;
        case 'portrait': portrait(g, hh, X, k); break;
        case 'trophyCase': trophyCase(g, hh, X, k); break;
        case 'bookshelf': bookshelf(g, hh, X); break;
        default: break;
      }
    });
  });
  // 4. the ceiling line and the skirting run along everything solid
  if (fid === 'exec') {
    g.fillStyle = vgrad(g, top, top + 5, [[0, '#ff9ad8', 0.85], [1, '#ff9ad8', 0]]);
    W.bays.forEach((b) => copies(b.u, b.u1 - b.u, P, ua, ub, (x0) => { if (b.type === 'wall') g.fillRect(x0, top, b.u1 - b.u, 5); }));
  }
}

// The outline a hung thing casts its shadow from: [x, y, w, h, round].
function shadowBox(h, x, y) {
  switch (h.kind) {
    case 'logo': return [x - 3, y - 3, h.w + 6, h.h + 6];
    case 'poster': return h.label === 'SYNERGY' ? [x - 1, y, h.w + 2, h.h] : [x, y, h.w, h.h];
    case 'portrait': return [x, y, h.w, h.h];
    case 'whiteboard': return [x - 2, y - 2, h.w + 4, h.h + 4];
    case 'painting': return h.variant === 1 ? [x, y, h.w, h.h] : [x - 3, y - 3, h.w + 6, h.h + 6];
    case 'clock': return [x, y, h.r + 2, 0, true];
    case 'lift': return [x - 4, y - 22, h.w + 8, h.h + 22];
    case 'door': return [x - 3, y - 3, h.w + 6, h.h + 3];
    case 'trophyCase': case 'bookshelf': return [x, y, h.w, h.h];
    default: return null;
  }
}

// A soft drop shadow down and right of a box. The box itself is filled too, but the hung
// thing is painted straight over it, so only the shadow shows.
function dropShadow(g, k, [x, y, w, h, round], color) {
  g.save();
  g.shadowColor = color;
  g.shadowBlur = 3.5 * k;
  g.shadowOffsetX = 1.6 * k;
  g.shadowOffsetY = 2.2 * k;
  g.fillStyle = CHROME.face;
  g.beginPath();
  if (round) g.arc(x, y, w, 0, TAU);
  else g.rect(x, y, w, h);
  g.fill();
  g.restore();
}

function wallBay(g, F, Pl, x0, x1, y0, y1, seed, k, header = false) {
  const w = x1 - x0;
  const h = y1 - y0;
  if (h <= 0) return;
  const fid = F.id;
  if (fid === 'lobby') {
    if (header) {
      panel(g, x0, y0, w, h, true, 0.75);
      g.fillStyle = '#b9b2ca';
      g.fillRect(x0 + 2, y0 + h / 2 - 0.5, w - 4, 1);
      return;
    }
    marble(g, x0, y0, w, h, seed * 17 + 3, Pl.wall, Pl.vein);
    // airbrushed: a blush of pink up top, lilac pooling at the foot
    g.fillStyle = vgrad(g, y0, y1, [[0, '#ffc8e4', 0.28], [0.55, '#ffffff', 0], [1, '#b8a0e0', 0.3]]);
    g.fillRect(x0, y0, w, h);
    // a Memphis frieze under the cornice
    g.fillStyle = vgrad(g, y0 + 4, y0 + 13, [[0, '#fbe8f2'], [1, '#f2d8ea']]);
    g.fillRect(x0, y0 + 4, w, 9);
    memphis(g, x0, y0 + 4, w, 9, seed * 31 + 7, ['#ff8fcf', '#4fd0d0', '#a98ce8', '#ffc86a'], 0.014, 0.5, 0.75);
    panel(g, x0, y0, w, 4, true, 0.5);
    panel(g, x0, y0 + 13, w, 2, true, 0.5);
    panel(g, x0, y1 - 7, w, 7, true, 0.75, TEAL95);
    g.fillStyle = '#b9b2ca';
    g.fillRect(x0, y1 - 4, w, 0.6);
  } else if (fid === 'open') {
    const dith = plasterTile(Pl, k, y0, y1, header);
    g.save();
    g.beginPath(); g.rect(x0, y0, w, h); g.clip();
    for (let u = Math.floor(x0 / 64) * 64; u < x1; u += 64) g.drawImage(dith, u, y0, 64, h);
    memphis(g, x0, y0 + 2, w, Math.min(h, 116) - 4, seed * 29 + 1, ['#ff8fcf', '#5fd6d4', '#9b7fe0', '#ffc85a'], 0.0042, 0.4, 1.25);
    g.restore();
    if (!header) {
      // dado rail at the sill line, a calmer wainscot below
      g.fillStyle = vgrad(g, 152, y1, [[0, '#cdb8e6'], [1, '#c2aee0']]);
      g.fillRect(x0, 152, w, y1 - 152);
      panel(g, x0, 150, w, 2.5, true, 0.5);
      panel(g, x0, y1 - 6, w, 6, true, 0.75);
    } else {
      panel(g, x0, y1 - 2, w, 2, true, 0.5);
    }
  } else {
    // exec: rosewood panelling, every panel a raised Win95 bevel in wood
    const RW = { face: Pl.wall, hi: Pl.wallHi, lt: mixc(Pl.wall, Pl.wallHi, 0.5), lo: Pl.wallLo, dk: '#2a1226' };
    g.fillStyle = vgrad(g, y0, y1, [[0, '#7a4569'], [1, '#5e3352']]);
    g.fillRect(x0, y0, w, h);
    const r = rng(seed * 13 + 5);
    g.save();
    g.beginPath(); g.rect(x0, y0, w, h); g.clip();
    for (let i = 0; i < w * 0.9; i++) {
      g.fillStyle = r() < 0.5 ? 'rgba(255,190,230,0.06)' : 'rgba(40,10,30,0.08)';
      g.fillRect(x0 + r() * w, y0, 0.4 + r() * 0.6, h);
    }
    g.restore();
    if (header) {
      panel(g, x0, y1 - 2, w, 2, true, 0.5);
      return;
    }
    const n = Math.max(1, Math.round(w / 48));
    const pw = w / n;
    for (let i = 0; i < n; i++) {
      const px = x0 + i * pw;
      bevel(g, px + 4, y0 + 8, pw - 8, 112, true, 0.75, RW);
      bevel(g, px + 6.5, y0 + 10.5, pw - 13, 107, false, 0.5, RW);
      bevel(g, px + 4, y0 + 128, pw - 8, y1 - y0 - 138, true, 0.75, RW);
    }
    panel(g, x0, y0 + 122, w, 2.5, true, 0.5);
    panel(g, x0, y1 - 6, w, 6, true, 0.75);
  }
}

const PLASTER = new Map();
function plasterTile(Pl, k, y0, y1, header) {
  const key = `${k}:${y0}:${y1}`;
  if (PLASTER.has(key)) return PLASTER.get(key);
  const c = ditherBox(k, 64, y1 - y0, [[0, '#ecdcf5'], [1, Pl.wall]], { levels: 2, sharp: 1.6 });
  PLASTER.set(key, c);
  return c;
}

function glassBay(g, F, Pl, b, x0, x1) {
  const G = F.glass;
  const fid = F.id;
  const w = x1 - x0;
  const gt = G.top;
  const gb = G.bottom;
  const { n, step } = glassPanes(b, G);
  // glass: a faint tint and diagonal sheen, over the city
  g.save();
  g.beginPath(); g.rect(x0, gt, w, gb - gt); g.clip();
  g.fillStyle = vgrad(g, gt, gb, fid === 'exec'
    ? [[0, '#3a1e5a', 0.22], [0.6, '#ff8fc8', 0.04], [1, '#ff8fc8', 0.1]]
    : [[0, '#b9a8ff', 0.2], [0.5, '#ffffff', 0.03], [1, '#9fe0f0', 0.12]]);
  g.fillRect(x0, gt, w, gb - gt);
  const r = rng(b.u * 3 + 1);
  for (let i = 0; i < Math.ceil(w / 70); i++) {
    const sx = x0 + 20 + i * 70 + r() * 30;
    const sw = 8 + r() * 14;
    g.fillStyle = `rgba(255,255,255,${(0.06 + r() * 0.06).toFixed(3)})`;
    g.beginPath(); g.moveTo(sx, gt); g.lineTo(sx + sw, gt); g.lineTo(sx + sw - 40, gb); g.lineTo(sx - 40, gb); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.1)';
    g.beginPath(); g.moveTo(sx + sw + 3, gt); g.lineTo(sx + sw + 4.5, gt); g.lineTo(sx + sw - 35.5, gb); g.lineTo(sx + sw - 37, gb); g.closePath(); g.fill();
  }
  // venetian blinds
  if (b.blinds > 0) {
    const bh = (gb - gt) * b.blinds;
    for (let yy = gt; yy < gt + bh - 2; yy += 3) {
      g.fillStyle = '#f7edf9'; g.fillRect(x0, yy, w, 1.2);
      g.fillStyle = '#d6c4e4'; g.fillRect(x0, yy + 1.2, w, 1);
      g.fillStyle = 'rgba(120,90,170,0.18)'; g.fillRect(x0, yy + 2.2, w, 0.8);
    }
    panel(g, x0, gt + bh - 2, w, 2.5, true, 0.5);
    g.fillStyle = 'rgba(110,90,150,0.35)';
    for (let q = x0 + step / 2; q < x1; q += step) g.fillRect(q, gt, 0.4, bh);
    g.fillRect(x0 + step / 2 + 6, gt + bh, 0.4, 8);
  }
  g.restore();
  // frame: jambs, mullions, transom, sill — all raised bevel bars
  const mw = fid === 'exec' ? 2 : 3;
  for (let i = 1; i < n; i++) {
    const mx = x0 + i * step;
    if (b.revolvingDoor != null && Math.abs(mx - (x0 + (b.revolvingDoor - b.u))) < 24) {
      panel(g, mx - mw / 2, gt, mw, (G.transom ?? gb) - gt, true, 0.5);
      continue;
    }
    panel(g, mx - mw / 2, gt, mw, gb - gt, true, 0.5);
  }
  if (G.transom) panel(g, x0, G.transom - 1.5, w, 3, true, 0.5);
  panel(g, x0, gt - 1, w, 3, true, 0.5);
  panel(g, x0 - 0.5, gt, 3, gb - gt, true, 0.5);
  panel(g, x1 - 2.5, gt, 3, gb - gt, true, 0.5);
  if (fid === 'open') panel(g, x0 - 2, gb - 1, w + 4, 4.5, true, 0.75);
  else panel(g, x0, gb - (fid === 'exec' ? 0 : 2), w, fid === 'exec' ? WALL_BASE - gb : 2, true, 0.5);
  if (b.revolvingDoor != null) {
    // the drum's canopy over the revolving door
    const cx = x0 + (b.revolvingDoor - b.u);
    panel(g, cx - 25, G.transom - 2, 50, 6, true, 0.75);
    g.fillStyle = '#7fe3e0';
    g.fillRect(cx - 22, G.transom + 1.5, 44, 0.8);
  }
}

function column(g, F, Pl, x, w, ci) {
  const top = F.ceilingY;
  const h = WALL_BASE - top;
  if (F.id === 'lobby') {
    g.fillStyle = hgrad(g, x, x + w, [[0, '#fff6fb'], [0.45, '#f1e2ee'], [1, '#cdb6d0']]);
    g.fillRect(x, top, w, h);
    g.fillStyle = 'rgba(150,120,170,0.3)';
    for (let f = 1; f < 4; f++) g.fillRect(x + (f * w) / 4 - 0.3, top + 8, 0.6, h - 16);
    g.fillStyle = 'rgba(255,255,255,0.7)';
    for (let f = 1; f < 4; f++) g.fillRect(x + (f * w) / 4 + 0.3, top + 8, 0.4, h - 16);
    panel(g, x - 2, top, w + 4, 6, true, 0.75, TEAL95);
    panel(g, x - 2, WALL_BASE - 8, w + 4, 8, true, 0.75, TEAL95);
  } else if (F.id === 'open') {
    g.fillStyle = hgrad(g, x, x + w, [[0, '#b8f0ec'], [0.5, '#8fd8d6'], [1, '#66b4bc']]);
    g.fillRect(x, top, w, h);
    bevel(g, x, top, w, h, true, 0.75, { hi: '#ffffff', lt: '#d4fbf8', lo: '#4f98a2', dk: '#2f6874' });
    g.fillStyle = 'rgba(40,100,120,0.25)';
    g.fillRect(x + w / 2 - 0.3, top + 6, 0.6, h - 12);
    panel(g, x - 1, WALL_BASE - 6, w + 2, 6, true, 0.75);
  } else {
    marble(g, x, top, w, h, ci * 7 + 300, '#33264a', '#b07ac8', { joints: false, dark: true });
    g.fillStyle = hgrad(g, x, x + w, [[0, '#ffffff', 0.1], [0.4, '#ffffff', 0.03], [1, '#000000', 0.25]]);
    g.fillRect(x, top, w, h);
    g.fillStyle = 'rgba(255,154,216,0.6)';
    g.fillRect(x, top, 0.6, h);
    panel(g, x - 1, top, w + 2, 4, true, 0.5);
    panel(g, x - 1, WALL_BASE - 7, w + 2, 7, true, 0.75);
  }
}

// ------------------------------------------------------------------ wall: per frame
function revolvingDoor(ctx, f, x) {
  const G = f.glass;
  const top = G.transom + 4;
  const bot = f.wallBase - 1;
  const R = 21;
  const a0 = f.revolving * TAU * 0.5;
  // the drum: tinted glass, a floor disc
  ctx.fillStyle = 'rgba(120,200,225,0.16)';
  ctx.fillRect(x - R, top, R * 2, bot - top);
  ctx.fillStyle = 'rgba(70,40,110,0.25)';
  ctx.beginPath(); ctx.ellipse(x, bot, R + 1, 2.2, 0, 0, TAU); ctx.fill();
  const wings = [];
  for (let i = 0; i < 4; i++) {
    const a = a0 + (i * Math.PI) / 2;
    wings.push({ a, c: Math.cos(a), s: Math.sin(a) });
  }
  wings.sort((p, q) => p.s - q.s);
  for (const wg of wings) {
    const ex = x + wg.c * R;
    const front = wg.s > 0;
    const facing = 0.45 + 0.55 * Math.abs(wg.s);
    const xa = Math.min(x, ex);
    const ww = Math.abs(ex - x);
    ctx.fillStyle = front ? `rgba(215,245,255,${(0.42 * facing).toFixed(3)})` : `rgba(150,140,220,${(0.3 * facing).toFixed(3)})`;
    ctx.fillRect(xa, top, ww, bot - top);
    if (front && ww > 3) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.moveTo(xa + ww * 0.2, bot); ctx.lineTo(xa + ww * 0.45, bot); ctx.lineTo(xa + ww * 0.8, top); ctx.lineTo(xa + ww * 0.55, top); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = front ? '#ffffff' : '#a49cbc';
    ctx.fillRect(ex - 0.8, top, 1.6, bot - top);
    ctx.fillStyle = front ? '#6c6588' : '#5c5578';
    ctx.fillRect(ex + (wg.c > 0 ? 0.8 : -1.3), top, 0.5, bot - top);
    // push bar and kick plate
    ctx.fillStyle = front ? '#e8e4f1' : 'rgba(200,190,230,0.6)';
    ctx.fillRect(xa, top + (bot - top) * 0.5, ww, 1.4);
    ctx.fillStyle = front ? 'rgba(255,143,208,0.85)' : 'rgba(255,143,208,0.35)';
    ctx.fillRect(xa, bot - 7, ww, 1.2);
  }
  ctx.fillStyle = hgrad(ctx, x - 1.2, x + 1.2, [[0, '#ffffff'], [1, '#8c85a3']]);
  ctx.fillRect(x - 1.2, top, 2.4, bot - top);
  // the drum's curved jambs and its chrome canopy
  ctx.fillStyle = hgrad(ctx, x - R - 2, x + R + 2, [[0, '#ffffff'], [0.07, '#8c85a3'], [0.93, '#8c85a3'], [1, '#4c4566']]);
  ctx.fillRect(x - R - 2, top, 2.5, bot - top);
  ctx.fillRect(x + R - 0.5, top, 2.5, bot - top);
  ctx.fillStyle = vgrad(ctx, top - 3, top + 3, [[0, '#ffffff'], [0.5, '#cdc7da'], [1, '#6c6588']]);
  ctx.beginPath(); ctx.ellipse(x, top, R + 2.5, 3, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#7fe3e0';
  ctx.beginPath(); ctx.ellipse(x, top + 1.6, R + 1, 0.9, 0, 0, Math.PI); ctx.fill();
}

function liftFrame(ctx, h, B, dx, t) {
  const x = h.x + dx;
  const y = h.y;
  const w = h.w;
  const gap = h.open * (w / 2 - 1);
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h.h); ctx.clip();
  if (h.open > 0) {
    // the car's light spilling as the doors part
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x + w / 2 - gap, y, gap * 2, h.h);
  }
  ctx.drawImage(B.leafL, x - gap, y, w / 2, h.h);
  ctx.drawImage(B.leafR, x + w / 2 + gap, y, w / 2, h.h);
  ctx.restore();
  // the arrow on the LCD lights when the car is here
  const lw = 9 + 5 * h.label.length;
  const lx = x + w / 2 - lw / 2;
  const ly = y - 16;
  const on = h.open > 0 ? 1 : 0.12;
  ctx.fillStyle = `rgba(255,140,220,${on})`;
  ctx.beginPath(); ctx.moveTo(lx + 1.5, ly + 6); ctx.lineTo(lx + 3.5, ly + 2.5); ctx.lineTo(lx + 5.5, ly + 6); ctx.closePath(); ctx.fill();
  if (h.open > 0) {
    ctx.fillStyle = 'rgba(255,140,220,0.25)';
    ctx.beginPath(); ctx.arc(lx + 3.5, ly + 4.5, 3.5, 0, TAU); ctx.fill();
  }
}

function clockHands(ctx, f, cx, cy, r) {
  const hand = (a, l, w, c) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(cx - Math.sin(a) * 1.2, cy + Math.cos(a) * 1.2);
    ctx.lineTo(cx + Math.sin(a) * l, cy - Math.cos(a) * l);
    ctx.stroke();
  };
  ctx.lineCap = 'round';
  hand(f.clock.hourA, r * 0.5, 1.3, '#2a1f6c');
  hand(f.clock.minuteA, r * 0.78, 0.9, '#2a1f6c');
  hand(f.clock.secondA, r * 0.86, 0.5, '#ff3fa6');
  ctx.fillStyle = '#ff3fa6';
  ctx.beginPath(); ctx.arc(cx, cy, 0.9, 0, TAU); ctx.fill();
}

function cradle(ctx, c, f) {
  const x = c.x;
  const y = c.y;
  const w = c.w;
  // ropes from above the window
  ctx.fillStyle = '#5a4c78';
  ctx.fillRect(x + 4, f.glass.top - 4, 0.6, y - f.glass.top + 4);
  ctx.fillRect(x + w - 5, f.glass.top - 4, 0.6, y - f.glass.top + 4);
  // the cleaner: teal overalls, pink cap, squeegee arm sweeping
  const px = x + 18;
  ctx.fillStyle = '#4fb8b0';
  ctx.fillRect(px - 3, y - 12, 6, 9);
  ctx.fillStyle = '#e9b99c';
  ctx.beginPath(); ctx.arc(px, y - 14.5, 2.6, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ff8fc8';
  ctx.fillRect(px - 2.8, y - 17.5, 5.6, 1.8);
  const sx = px + 4 + c.swipe * 12;
  const sy = y - 18 - Math.sin(c.swipe * Math.PI) * 4;
  ctx.strokeStyle = '#e9b99c';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(px + 2, y - 10); ctx.lineTo(sx, sy); ctx.stroke();
  ctx.fillStyle = '#4c4566';
  ctx.fillRect(sx - 0.5, sy - 3, 1.2, 6);
  // the wet streak it leaves
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(px + 4, sy - 3, sx - px - 4, 6);
  // the platform: a Win95 bevelled tray
  panel(ctx, x, y - 3, w, 6, true, 0.75);
  ctx.fillStyle = '#ff8fc8';
  ctx.fillRect(x + 1.5, y - 1, w - 3, 1);
  ctx.fillStyle = '#4c4566';
  ctx.fillRect(x + 2, y - 9, 0.8, 6); ctx.fillRect(x + w - 3, y - 9, 0.8, 6);
  ctx.fillRect(x + 2, y - 9, w - 4, 0.8);
}

// ------------------------------------------------------------------ ceiling, lights
function bakeCeiling(F, Pl, k) {
  const h = F.ceilingY;
  const c = canvas(FRAME_W * k, (h + 2) * k);
  const g = c.getContext('2d');
  g.setTransform(k, 0, 0, k, 0, 0);
  g.drawImage(ditherBox(k, FRAME_W, h, [[0, Pl.ceiling[0]], [1, Pl.ceiling[1]]], { levels: 2 }), 0, 0, FRAME_W, h);
  panel(g, -2, h - 2, FRAME_W + 4, 2.5, true, 0.5, F.id === 'exec' ? { face: '#4a2e58', hi: '#ff9ad8', lt: '#8a5a8a', lo: '#2a1838', dk: '#1a0f26' } : CHROME);
  return { c, h: h + 2 };
}

function glowSprite(k, col, r) {
  const c = canvas(r * 2 * k, r * 2 * k);
  const g = c.getContext('2d');
  g.setTransform(k, 0, 0, k, 0, 0);
  const gr = g.createRadialGradient(r, r, 0, r, r, r);
  gr.addColorStop(0, css(col, 0.55));
  gr.addColorStop(0.35, css(col, 0.18));
  gr.addColorStop(1, css(col, 0));
  g.fillStyle = gr;
  g.fillRect(0, 0, r * 2, r * 2);
  return { c, r };
}

function drawLights(ctx, f, B) {
  for (const l of f.lights) {
    if (l.variant === 'tube') {
      const y = f.ceilingY - 4.5;
      const on = l.on;
      if (on > 0.5) {
        const G = B.glowTube;
        ctx.globalAlpha = 0.7;
        ctx.drawImage(G.c, l.x - G.r * 1.4, y - G.r * 0.4, G.r * 2.8, G.r * 1.6);
        ctx.globalAlpha = 1;
        // the wash it throws down the wall
        ctx.fillStyle = B.tubeWash;
        ctx.beginPath();
        ctx.moveTo(l.x - 21, y + 4); ctx.lineTo(l.x + 21, y + 4); ctx.lineTo(l.x + 34, y + 70); ctx.lineTo(l.x - 34, y + 70);
        ctx.closePath();
        ctx.fill();
      }
      panel(ctx, l.x - 23, y - 0.5, 46, 5, true, 0.5);
      ctx.fillStyle = on > 0.5 ? '#f4ffff' : '#9aa0b8';
      ctx.fillRect(l.x - 21, y + 1, 42, 2.5);
      if (on > 0.5) {
        ctx.fillStyle = 'rgba(127,243,255,0.5)';
        ctx.fillRect(l.x - 21, y + 3.5, 42, 0.6);
      }
    } else if (l.variant === 'globe') {
      const Pp = B.glowPool;
      ctx.globalAlpha = 0.5;
      ctx.drawImage(Pp.c, l.x - Pp.r, l.y - Pp.r * 0.8, Pp.r * 2, Pp.r * 2);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#8c85a3';
      ctx.fillRect(l.x - 0.3, f.ceilingY, 0.6, l.y - f.ceilingY - 6);
      panel(ctx, l.x - 2, l.y - 8, 4, 2.5, true, 0.5);
      const G = B.glowGlobe;
      ctx.drawImage(G.c, l.x - G.r, l.y - G.r, G.r * 2, G.r * 2);
      ctx.fillStyle = B.globeFill;
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.beginPath(); ctx.arc(0, 0, 6.5, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.ellipse(l.x - 2.2, l.y - 2.6, 1.8, 1.2, -0.5, 0, TAU); ctx.fill();
    } else {
      // exec pendant: a chrome cone on a cord, a warm pool below
      ctx.fillStyle = '#ff9ad8';
      ctx.fillRect(l.x - 0.3, f.ceilingY, 0.6, l.y - f.ceilingY - 7);
      const G = B.glowPendant;
      ctx.drawImage(G.c, l.x - G.r, l.y - G.r * 0.5, G.r * 2, G.r * 2);
      ctx.fillStyle = hgrad(ctx, l.x - 8, l.x + 8, [[0, '#ffe8f6'], [0.4, '#c9a8f0'], [1, '#4c3a6a']]);
      ctx.beginPath(); ctx.moveTo(l.x - 2, l.y - 7); ctx.lineTo(l.x + 2, l.y - 7); ctx.lineTo(l.x + 8, l.y); ctx.lineTo(l.x - 8, l.y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff3d0';
      ctx.beginPath(); ctx.ellipse(l.x, l.y, 7.5, 1.4, 0, 0, TAU); ctx.fill();
    }
  }
}

// Morning light through the curtain wall: one beam a pane, striped by the mullions, its far
// end on the glass (the wall's rate) and its near end on the floor patch (that depth's rate).
function sunBeams(ctx, f, B) {
  const [reach, drift] = B.patch;
  const top = WALL_BASE;
  const yEnd = top + (LANE_TOP - top) * reach;
  const sc = ((yEnd - 195) / 37) / WALL_K;
  const off = drift * ((yEnd - 195) / 37 - WALL_K);
  const G = f.glass;
  ctx.fillStyle = B.beamGrad;
  for (const b of f.wall.bays) {
    if (b.type !== 'glass') continue;
    const w = b.x1 - b.x0;
    const n = Math.max(1, Math.round(w / G.mullion));
    const step = w / n;
    for (let i = 0; i < n; i++) {
      if ((i + b.i) % 3 === 1) continue;
      const xa = b.x0 + B.wallSnap + i * step + 3;
      const xb = xa + step - 6;
      ctx.beginPath();
      ctx.moveTo(xa, G.top + 8);
      ctx.lineTo(xb, G.top + 8);
      ctx.lineTo(VPX + (xb - VPX) * sc + off, yEnd);
      ctx.lineTo(VPX + (xa - VPX) * sc + off, yEnd);
      ctx.closePath();
      ctx.fill();
    }
  }
}

// ------------------------------------------------------------------ floor plane and slab
function gridY(z) { return 195 + 37 / z; }
const GRID_Z = [4, 3.5, 3, 2.5, 2, 1.5, 1.2];

function bakeFloor(F, Pl, k) {
  const top = WALL_BASE;
  const bot = LANE_TOP;
  const h = bot - top;
  const c = canvas(FRAME_W * k, h * k);
  const g = c.getContext('2d');
  g.setTransform(k, 0, 0, k, 0, -top * k);
  g.drawImage(ditherBox(k, FRAME_W, h, Pl.floor, { levels: 3, sharp: 1.8 }), 0, top, FRAME_W, h);
  // the depth lines of the grid, brightest far away
  for (const z of GRID_Z) {
    const y = gridY(z);
    if (y < top + 0.5 || y > bot - 1) continue;
    const a = clamp01((z - 1) / 3.2);
    g.fillStyle = css(Pl.grid, 0.12 + a * 0.4);
    g.fillRect(0, y - 0.5, FRAME_W, 1.2);
    g.fillStyle = css(Pl.gridHi, 0.1 + a * 0.45);
    g.fillRect(0, y - 0.2, FRAME_W, 0.5);
  }
  // the wall's foot: a soft dark contact line
  g.fillStyle = vgrad(g, top, top + 4, [[0, '#2a1840', 0.28], [1, '#2a1840', 0]]);
  g.fillRect(0, top, FRAME_W, 4);
  if (F.id === 'exec') {
    // the sunset laid along the polished floor
    g.fillStyle = vgrad(g, top, bot, [[0, '#ff9fb8', 0.25], [1, '#ff9fb8', 0]]);
    g.fillRect(0, top, FRAME_W, h);
  }
  return { c, top, h };
}

function drawFloorGrid(ctx, f, Pl, B) {
  const P = f.floorPlane;
  const SP = 32;
  const top = P.top;
  const bot = P.bottom;
  ctx.drawImage(B.floor.c, 0, top, FRAME_W, bot - top);
  // window light on the floor: each glass bay's patch, laid in perspective so its far edge
  // rides with the wall and its near edge with the floor at that depth
  if (B.patch) {
    const [reach, drift] = B.patch;
    const yEnd = top + (bot - top) * reach;
    const sc = ((yEnd - 195) / 37) / WALL_K;
    const off = drift * ((yEnd - 195) / 37 - WALL_K);
    ctx.fillStyle = B.patchGrad;
    for (const b of f.wall.bays) {
      if (b.type !== 'glass') continue;
      const xa = b.x0 + B.wallSnap + 4;
      const xb = b.x1 + B.wallSnap - 4;
      ctx.beginPath();
      ctx.moveTo(xa, top);
      ctx.lineTo(xb, top);
      ctx.lineTo(VPX + (xb - VPX) * sc + off, yEnd);
      ctx.lineTo(VPX + (xa - VPX) * sc + off, yEnd);
      ctx.closePath();
      ctx.fill();
    }
  }
  // reflections of the glass in a polished floor, hanging under the wall at its own rate
  if (f.floor !== 'open') {
    for (const b of f.wall.bays) {
      if (b.type !== 'glass') continue;
      const x0 = b.x0 + B.wallSnap;
      const w = b.x1 - b.x0;
      ctx.fillStyle = B.reflGrad;
      ctx.fillRect(x0 + 3, top, w - 6, 12);
    }
    for (const c of f.wall.columns) {
      ctx.fillStyle = B.colRefl;
      ctx.fillRect(c.x + B.wallSnap, top, c.w, 9);
    }
  }
  if (f.floor === 'exec') {
    const sun = f.outside.sun;
    for (const b of f.wall.bays) {
      if (b.type === 'glass' && b.x0 + 6 < sun.x && b.x1 - 6 > sun.x) {
        ctx.fillStyle = B.sunStreak;
        for (let i = 0; i < 8; i++) {
          const y = top + 1 + i * 3.2;
          const ww = 16 - i * 1.4;
          ctx.fillRect(sun.x - ww / 2, y, ww, 1);
        }
      }
    }
  }
  // the shearing joints: a glowing perspective grid fading toward the lane
  const k = WALL_K;
  const sb = P.shiftBottom;
  const lo = Math.floor((sb + VPX + (-40 - VPX) / k) / SP);
  const hi = Math.ceil((sb + VPX + (FRAME_W + 40 - VPX) / k) / SP);
  if (B.checker) {
    // every other tile a shade lighter: the checkered floor, in perspective
    const rows = B.rows;
    ctx.beginPath();
    for (let rI = 0; rI < rows.length - 1; rI++) {
      const ya = rows[rI];
      const yb = rows[rI + 1];
      // a joint runs straight from (VPX + (xb - VPX) * k, top) to (xb, bot)
      const sa = (ya - top) / (bot - top);
      const sbb = (yb - top) / (bot - top);
      const at = (xb, s0) => VPX + (xb - VPX) * (k + (1 - k) * s0);
      for (let j = lo; j < hi; j++) {
        if (((j + rI) & 1) === 0) continue;
        const x0 = j * SP - sb;
        const x1 = x0 + SP;
        ctx.moveTo(at(x0, sa), ya);
        ctx.lineTo(at(x1, sa), ya);
        ctx.lineTo(at(x1, sbb), yb);
        ctx.lineTo(at(x0, sbb), yb);
        ctx.closePath();
      }
    }
    ctx.fillStyle = B.checker;
    ctx.fill();
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, top, FRAME_W, bot - top);
  ctx.clip();
  ctx.beginPath();
  for (let j = lo; j <= hi; j++) {
    const xb = j * SP - sb;
    const xt = VPX + (xb - VPX) * k;
    ctx.moveTo(xt, top);
    ctx.lineTo(xb, bot);
  }
  ctx.strokeStyle = B.gridGlow;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.strokeStyle = B.gridLine;
  ctx.lineWidth = 0.5;
  ctx.stroke();
  ctx.restore();
}

function bakeSlab(F, Pl, k) {
  const top = LANE_TOP;
  const h = FRAME_H - top;
  const c = canvas(FRAME_W * k, h * k);
  const g = c.getContext('2d');
  g.setTransform(k, 0, 0, k, 0, -top * k);
  g.drawImage(ditherBox(k, FRAME_W, h, Pl.slab, { levels: 3, sharp: 2 }), 0, top, FRAME_W, h);
  // sunset stripes cut across the face, thickening downward
  let y = top + 9;
  let th = 0.5;
  while (y < FRAME_H) {
    g.fillStyle = css('#000000', 0.18);
    g.fillRect(0, y, FRAME_W, th);
    y += 4.5 - th * 0.3;
    th += 0.35;
  }
  // the neon edge
  g.fillStyle = vgrad(g, top, top + 6, [[0, Pl.edgeGlow, 0.55], [1, Pl.edgeGlow, 0]]);
  g.fillRect(0, top, FRAME_W, 6);
  g.fillStyle = Pl.edge;
  g.fillRect(0, top, FRAME_W, 1);
  g.fillStyle = '#ffffff';
  g.fillRect(0, top + 0.1, FRAME_W, 0.4);
  g.fillStyle = 'rgba(20,10,40,0.6)';
  g.fillRect(0, top + 1, FRAME_W, 0.6);
  return { c, top, h };
}

function drawSlab(ctx, f, Pl, B) {
  const S = B.slab;
  ctx.drawImage(S.c, 0, S.top, FRAME_W, S.h);
  // the floor's joints carry on down the cut face
  const SP = 32;
  const sb = f.slab.shift;
  ctx.fillStyle = B.slabJoint;
  for (let j = Math.floor(sb / SP) - 1; j <= Math.ceil((sb + FRAME_W) / SP) + 1; j++) {
    const x = j * SP - sb;
    ctx.fillRect(x - 0.25, S.top + 2, 0.5, S.h - 2);
  }
  ctx.fillStyle = B.slabStud;
  for (let j = Math.floor(sb / (SP * 2)) - 1; j <= Math.ceil((sb + FRAME_W) / (SP * 2)) + 1; j++) {
    const x = j * SP * 2 - sb + SP;
    ctx.fillRect(x - 1, S.top + 5, 2, 2);
  }
}

// ------------------------------------------------------------------ mid furniture (static, strip)
function shadowAt(g, x, w, base) {
  const gr = g.createRadialGradient(x + w / 2, base + 0.5, 0, x + w / 2, base + 0.5, w * 0.6);
  gr.addColorStop(0, 'rgba(60,30,90,0.3)');
  gr.addColorStop(1, 'rgba(60,30,90,0)');
  g.fillStyle = gr;
  g.save();
  g.translate(x + w / 2, base + 0.5);
  g.scale(1, 0.18);
  g.translate(-(x + w / 2), -(base + 0.5));
  g.fillRect(x - w * 0.2, base + 0.5 - w * 0.6, w * 1.4, w * 1.2);
  g.restore();
}

function pot(g, x, w, h, base, col, dots) {
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(x, base - h); g.lineTo(x + w, base - h); g.lineTo(x + w - w * 0.12, base); g.lineTo(x + w * 0.12, base);
  g.closePath();
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.fillRect(x - 0.5, base - h, w + 1, 1.2);
  g.fillStyle = 'rgba(60,20,80,0.18)';
  g.fillRect(x + w * 0.66, base - h + 1.2, w * 0.26, h - 1.2);
  if (dots) {
    g.fillStyle = dots;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) g.fillRect(x + 2 + i * (w - 4) / 4, base - h + 3 + j * 3.5, 1, 1);
  }
}

function plant(g, m, x, base, seed) {
  const v = m.variant;
  if (v === 'palm') {
    shadowAt(g, x, 40, base);
    pot(g, x + 10, 20, 14, base, '#ff9fcf', '#7fe3e0');
    g.strokeStyle = '#b98a8a';
    g.lineCap = 'round';
    for (const [dx, lean, ht] of [[17, -5, 46], [23, 6, 52]]) {
      for (let i = 0; i < 10; i++) {
        const t0 = i / 10;
        const t1 = (i + 0.8) / 10;
        g.lineWidth = 2.6 - t0;
        g.beginPath();
        g.moveTo(x + dx + lean * t0 * t0, base - 14 - ht * t0);
        g.lineTo(x + dx + lean * t1 * t1, base - 14 - ht * t1);
        g.stroke();
      }
      palmFronds(g, x + dx + lean, base - 14 - ht, 0.95, ['#3fae9e', '#5cc6b0', '#2f9488', '#7ad8c0'], seed + dx, 7);
    }
  } else if (v === 'ficus') {
    shadowAt(g, x, 30, base);
    pot(g, x + 7, 16, 13, base, '#7fd6d4', '#ff9fcf');
    g.strokeStyle = '#8a6a7a';
    g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(x + 15, base - 13); g.lineTo(x + 14, base - 30); g.lineTo(x + 16, base - 44); g.stroke();
    const r = rng(seed);
    const cols = ['#2f9488', '#3fae9e', '#5cc6b0', '#86dcc4'];
    for (let i = 0; i < 70; i++) {
      const a = r() * TAU;
      const rad = Math.sqrt(r());
      const lx = x + 15 + Math.cos(a) * rad * 14;
      const ly = base - 42 + Math.sin(a) * rad * 15;
      const shade = ly < base - 46 ? 3 : lx > x + 20 ? 0 : 1 + ((r() * 2) | 0);
      g.fillStyle = cols[Math.min(3, shade)];
      g.beginPath(); g.ellipse(lx, ly, 2.6, 1.5, a, 0, TAU); g.fill();
    }
  } else if (v === 'snake') {
    shadowAt(g, x, 16, base);
    pot(g, x + 2, 12, 10, base, '#c9a8f0', '#ffffff');
    const r = rng(seed);
    for (let i = 0; i < 7; i++) {
      const bx = x + 4 + i * 1.3;
      const ht = 16 + r() * 10;
      const lean = (i - 3) * 1.1;
      g.fillStyle = i % 2 ? '#3a9a7a' : '#2f8a6c';
      g.beginPath(); g.moveTo(bx - 1.3, base - 10); g.quadraticCurveTo(bx + lean * 0.4, base - 10 - ht * 0.6, bx + lean, base - 10 - ht); g.quadraticCurveTo(bx + lean * 0.4 + 1.6, base - 10 - ht * 0.6, bx + 1.3, base - 10); g.closePath(); g.fill();
      g.strokeStyle = '#e8e08a';
      g.lineWidth = 0.4;
      g.stroke();
    }
  } else {
    // bonsai on a stand
    shadowAt(g, x, 18, base);
    panel(g, x + 3, base - 18, 12, 18, true, 0.5, { face: '#6a3a5c', hi: '#b47ea2', lt: '#8e5a7e', lo: '#3e1f36', dk: '#26101f' });
    g.fillStyle = '#2a1f4c';
    g.fillRect(x + 1, base - 22, 16, 4);
    g.strokeStyle = '#7a5a5a';
    g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(x + 9, base - 22); g.quadraticCurveTo(x + 5, base - 27, x + 10, base - 31); g.stroke();
    g.fillStyle = '#ff9fcf';
    g.beginPath(); g.ellipse(x + 7, base - 31, 5, 3, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(x + 13, base - 34, 4.5, 2.6, 0, 0, TAU); g.fill();
    g.fillStyle = '#ffc2e2';
    g.beginPath(); g.ellipse(x + 6, base - 32, 2.5, 1.4, 0, 0, TAU); g.fill();
  }
}

function sofa(g, x, w, base, fid) {
  shadowAt(g, x, w, base);
  const body = fid === 'exec' ? '#8a4a78' : '#e98fbf';
  const lo = fid === 'exec' ? '#5e2e54' : '#c86fa2';
  const cush = fid === 'exec' ? '#a86094' : '#7fd6d4';
  g.fillStyle = lo;
  g.fillRect(x + 3, base - 3, 2, 3); g.fillRect(x + w - 5, base - 3, 2, 3);
  g.fillStyle = body;
  g.beginPath(); rr(g, x, base - 24, w, 14, 4); g.fill();
  g.fillStyle = cush;
  for (let i = 0; i < 3; i++) { g.beginPath(); rr(g, x + 6 + i * ((w - 12) / 3), base - 15, (w - 12) / 3 - 1, 7, 2); g.fill(); }
  g.fillStyle = body;
  g.beginPath(); rr(g, x - 1, base - 17, 7, 14, 3); g.fill();
  g.beginPath(); rr(g, x + w - 6, base - 17, 7, 14, 3); g.fill();
  g.fillStyle = lo;
  g.fillRect(x, base - 8, w, 5);
  g.fillStyle = 'rgba(255,255,255,0.3)';
  g.fillRect(x + 4, base - 23, w - 8, 1);
}

function midItem(g, F, m, x, base, k) {
  const fid = F.id;
  switch (m.kind) {
    case 'plant': plant(g, m, x, base, m.u * 7 + 3); break;
    case 'sofa': sofa(g, x, m.w, base, fid); break;
    case 'reception': {
      const w = m.w;
      shadowAt(g, x, w, base);
      // monitor and bell on the counter
      crt(g, x + w * 0.62, base - 34, 14, '#7ff3ff', 3, {});
      g.fillStyle = '#e8e4f1';
      g.beginPath(); g.arc(x + w * 0.3, base - 34, 2.6, Math.PI, TAU); g.fill();
      g.fillRect(x + w * 0.3 - 0.4, base - 37.6, 0.8, 1);
      // the curved front
      g.fillStyle = vgrad(g, base - 34, base, [[0, '#8fd8d6'], [1, '#6fb8c4']]);
      g.beginPath();
      g.moveTo(x, base - 30); g.quadraticCurveTo(x + w / 2, base - 36, x + w, base - 30);
      g.lineTo(x + w, base); g.lineTo(x, base);
      g.closePath();
      g.fill();
      g.save();
      g.clip();
      memphis(g, x, base - 30, w, 18, 404, ['#ff8fcf', '#fff07a', '#ffffff', '#5a8fd0'], 0.012, 0.45, 0.85);
      g.fillStyle = '#ff9fcf';
      g.fillRect(x, base - 10, w, 3);
      g.fillStyle = 'rgba(40,20,80,0.15)';
      g.fillRect(x, base - 7, w, 7);
      g.restore();
      // chrome counter top
      g.fillStyle = '#e8e4f1';
      g.beginPath();
      g.moveTo(x - 2, base - 30); g.quadraticCurveTo(x + w / 2, base - 37, x + w + 2, base - 30);
      g.lineTo(x + w + 2, base - 28.5); g.quadraticCurveTo(x + w / 2, base - 35.5, x - 2, base - 28.5);
      g.closePath();
      g.fill();
      g.fillStyle = '#8c85a3';
      g.beginPath();
      g.moveTo(x - 2, base - 28.5); g.quadraticCurveTo(x + w / 2, base - 35.5, x + w + 2, base - 28.5);
      g.lineTo(x + w + 2, base - 28); g.quadraticCurveTo(x + w / 2, base - 35, x - 2, base - 28);
      g.closePath();
      g.fill();
      break;
    }
    case 'turnstiles': {
      const w = m.w;
      shadowAt(g, x, w, base);
      for (let i = 0; i < 4; i++) {
        const px = x + 4 + i * ((w - 12) / 3);
        if (i < 3) {
          g.fillStyle = 'rgba(127,227,224,0.35)';
          g.beginPath(); g.moveTo(px + 6, base - 20); g.lineTo(px + 6 + (w - 12) / 3 * 0.42, base - 22); g.lineTo(px + 6 + (w - 12) / 3 * 0.42, base - 10); g.lineTo(px + 6, base - 10); g.closePath(); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.5)';
          g.fillRect(px + 6, base - 20.5, (w - 12) / 3 * 0.42, 0.5);
        }
        panel(g, px, base - 26, 6, 26, true, 0.5, { face: '#a49cc4', hi: '#e6e0f4', lt: '#c4bcdc', lo: '#6e6690', dk: '#4c4566' });
        g.fillStyle = i % 2 ? '#7ff7e6' : '#ff8fd0';
        g.fillRect(px + 1.5, base - 24, 3, 1.2);
      }
      break;
    }
    case 'sculpture': {
      // the marble bust of the founder on a plinth
      shadowAt(g, x, 40, base);
      panel(g, x + 8, base - 26, 24, 26, true, 0.75, { face: '#d8c8e6', hi: '#ffffff', lt: '#efe6f6', lo: '#9c8cb4', dk: '#6a5a88' });
      g.fillStyle = 'rgba(120,100,160,0.25)';
      g.fillRect(x + 10, base - 20, 20, 0.6);
      ptext(g, 'DKE', x + 20, base - 17, 1, '#8070a0', 'center');
      panel(g, x + 6, base - 28, 28, 3, true, 0.5, { face: '#e8def2', hi: '#ffffff', lt: '#f4eefa', lo: '#a898c0', dk: '#6a5a88' });
      // the founder in marble, his cape's foot on the plinth
      drawMarbleBust(g, k, x + 20 - 12 * 1.6, base - 28 - 15.2 * 1.6, 1.6);
      break;
    }
    case 'cubicles': cubicleRun(g, m, x, base, F); break;
    case 'cooler': {
      shadowAt(g, x, 14, base);
      panel(g, x, base - 26, 14, 26, true, 0.5, { face: '#9a90c0', hi: '#d8d0f0', lt: '#b6acd8', lo: '#6a6094', dk: '#4a4270' });
      g.fillStyle = '#ff8fd0'; g.fillRect(x + 3, base - 21, 2, 2);
      g.fillStyle = '#7fe3e0'; g.fillRect(x + 9, base - 21, 2, 2);
      g.fillStyle = '#5c5578'; g.fillRect(x + 4, base - 15, 6, 0.8);
      g.fillStyle = 'rgba(140,230,240,0.55)';
      g.beginPath(); rr(g, x + 1.5, base - 44, 11, 18, 3.5); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.fillRect(x + 3, base - 41, 1, 12);
      g.fillStyle = 'rgba(80,180,210,0.35)';
      g.fillRect(x + 1.5, base - 36, 11, 0.6);
      break;
    }
    case 'copier': {
      const w = m.w;
      shadowAt(g, x, w, base);
      panel(g, x, base - 24, w, 24, true, 0.75, { face: '#6f6596', hi: '#a89ed0', lt: '#8a80b4', lo: '#4a4270', dk: '#2e2850' });
      panel(g, x - 1, base - 30, w + 2, 6, true, 0.5, { face: '#5a5084', hi: '#958bc4', lt: '#766ca4', lo: '#3c3460', dk: '#252046' });
      g.fillStyle = '#3c3460';
      g.fillRect(x + w - 4, base - 16, 5, 1.6);
      g.fillStyle = '#5c5480';
      for (let i = 0; i < 2; i++) g.fillRect(x + 4, base - 18 + i * 8, w - 8, 0.8);
      g.fillStyle = '#7ff7e6'; g.fillRect(x + w - 8, base - 22, 4, 1.4);
      g.fillStyle = '#ff8fd0'; g.fillRect(x + w - 12, base - 22, 2, 1.4);
      break;
    }
    case 'cabinet': {
      shadowAt(g, x, 20, base);
      const C = { face: '#9fb4d0', hi: '#e6f0fb', lt: '#c4d4e8', lo: '#6c7e9c', dk: '#4a5874' };
      panel(g, x, base - 44, 20, 44, true, 0.5, C);
      for (let i = 0; i < 4; i++) {
        bevel(g, x + 2, base - 42 + i * 10.5, 16, 9.5, true, 0.5, C);
        g.fillStyle = '#e8e4f1';
        g.fillRect(x + 7, base - 38.5 + i * 10.5, 6, 1.2);
      }
      break;
    }
    case 'boardroom': boardroomStatic(g, m, x, base); break;
    case 'desk': {
      const w = m.w;
      shadowAt(g, x, w, base);
      // the high-back chair behind
      g.fillStyle = '#4a2a52';
      g.beginPath(); rr(g, x + w * 0.42, base - 50, 18, 30, 5); g.fill();
      g.fillStyle = 'rgba(255,170,220,0.25)';
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) g.fillRect(x + w * 0.42 + 4 + i * 5, base - 44 + j * 8, 1, 1);
      // lamp, CRT, blotter
      crt(g, x + w * 0.12, base - 30, 15, '#7ff3ff', 9);
      g.fillStyle = '#d9b46a';
      g.fillRect(x + w * 0.78, base - 38, 1, 8);
      g.fillRect(x + w * 0.78 - 3, base - 31, 7, 1);
      g.fillStyle = '#3fae7e';
      g.beginPath(); g.moveTo(x + w * 0.78 - 6, base - 37); g.quadraticCurveTo(x + w * 0.78, base - 42, x + w * 0.78 + 6, base - 37); g.closePath(); g.fill();
      const gl = g.createRadialGradient(x + w * 0.78, base - 34, 0, x + w * 0.78, base - 34, 16);
      gl.addColorStop(0, 'rgba(255,220,150,0.5)');
      gl.addColorStop(1, 'rgba(255,200,150,0)');
      g.fillStyle = gl;
      g.fillRect(x + w * 0.78 - 16, base - 50, 32, 32);
      // the desk
      const RW = { face: '#6a3a5c', hi: '#c88ab0', lt: '#8e5a7e', lo: '#3e1f36', dk: '#26101f' };
      panel(g, x, base - 30, w, 4, true, 0.5, RW);
      panel(g, x + 2, base - 26, w - 4, 26, true, 0.75, RW);
      bevel(g, x + 6, base - 22, w * 0.3, 18, true, 0.5, RW);
      bevel(g, x + w * 0.7 - 6, base - 22, w * 0.3, 18, true, 0.5, RW);
      g.fillStyle = '#ff9ad8';
      g.fillRect(x + 2, base - 26, w - 4, 0.6);
      break;
    }
    case 'globe': {
      shadowAt(g, x, 18, base);
      g.strokeStyle = '#5e3352';
      g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(x + 3, base); g.lineTo(x + 9, base - 12); g.lineTo(x + 15, base); g.moveTo(x + 9, base - 12); g.lineTo(x + 9, base - 16); g.stroke();
      g.fillStyle = '#5fc8d0';
      g.beginPath(); g.arc(x + 9, base - 24, 8, 0, TAU); g.fill();
      g.fillStyle = '#ff9fcf';
      g.beginPath(); g.ellipse(x + 6, base - 27, 3.5, 2.5, 0.4, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(x + 11, base - 21, 2.6, 3.4, -0.3, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.4)';
      g.beginPath(); g.ellipse(x + 6, base - 28, 2, 1.2, -0.6, 0, TAU); g.fill();
      g.strokeStyle = '#e8e4f1';
      g.lineWidth = 0.8;
      g.beginPath(); g.arc(x + 9, base - 24, 9.5, -2.4, 1.3); g.stroke();
      break;
    }
    case 'tallclock': {
      shadowAt(g, x, 20, base);
      const RW = { face: '#6a3a5c', hi: '#c88ab0', lt: '#8e5a7e', lo: '#3e1f36', dk: '#26101f' };
      panel(g, x + 1, base - 70, 18, 70, true, 0.75, RW);
      panel(g, x - 1, base - 72, 22, 4, true, 0.5, RW);
      clockFace(g, x + 10, base - 59, 6);
      // the window the pendulum swings in
      g.fillStyle = '#2a1430';
      g.fillRect(x + 5, base - 48, 10, 30);
      bevel(g, x + 5, base - 48, 10, 30, false, 0.5, RW);
      panel(g, x - 1, base - 6, 22, 6, true, 0.5, RW);
      break;
    }
    default: break;
  }
}

let FABRIC = null;
function fabricTile() {
  if (FABRIC) return FABRIC;
  const c = canvas(4, 4);
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(255,255,255,0.08)';
  g.fillRect(0, 0, 1, 1); g.fillRect(2, 2, 1, 1);
  g.fillStyle = 'rgba(40,20,80,0.07)';
  g.fillRect(1, 1, 1, 1); g.fillRect(3, 3, 1, 1);
  FABRIC = c;
  return c;
}

function cubicleRun(g, m, x0, base, F) {
  const n = Math.round((m.u1 - m.u) / 40);
  const top = base - 34;
  for (let d = 0; d < n; d++) {
    const x = x0 + d * 40;
    const seated = m.heads.includes(d) || d === m.pop;
    const r = rng(m.u * 3 + d * 17);
    // monitors and desk clutter peeking over the wall
    crt(g, x + 5, top + 2, 13, ['#7ff3ff', '#ff9fe0', '#a8f0c8'][d % 3], d + m.u);
    if (!seated) {
      g.fillStyle = PASTELS[(d * 2) % 6];
      g.fillRect(x + 28, top - 4, 4, 4);
      g.fillStyle = 'rgba(255,255,255,0.6)';
      g.fillRect(x + 28, top - 4, 4, 0.6);
      g.strokeStyle = PASTELS[(d * 2) % 6];
      g.lineWidth = 0.6;
      g.beginPath(); g.arc(x + 32.5, top - 2, 1.2, -1.2, 1.2); g.stroke();
    } else if (r() < 0.5) {
      // a little potted cactus
      g.fillStyle = '#ff9fcf';
      g.fillRect(x + 32, top - 3, 4, 3);
      g.fillStyle = '#3fae9e';
      g.beginPath(); rr(g, x + 33, top - 9, 2, 6, 1); g.fill();
    }
  }
  // the partitions: fabric panels on chrome posts, a chrome rail
  const fab = fabricTile();
  for (let d = 0; d < n; d++) {
    const x = x0 + d * 40;
    g.fillStyle = vgrad(g, top, base, [[0, '#ab9fd4'], [0.7, '#998dc6'], [1, '#8e82bc']]);
    g.fillRect(x + 1, top, 38, 34);
    g.save();
    g.beginPath(); g.rect(x + 1, top, 38, 28); g.clip();
    g.fillStyle = g.createPattern(fab, 'repeat');
    g.fillRect(x + 1, top, 38, 28);
    g.restore();
    // a pastel piping a third of the way down, a darker kick plate at the foot
    g.fillStyle = d % 2 ? 'rgba(127,227,224,0.55)' : 'rgba(255,158,216,0.5)';
    g.fillRect(x + 1, top + 9, 38, 0.8);
    g.fillStyle = '#7a6ea8';
    g.fillRect(x + 1, base - 6, 38, 6);
    g.fillStyle = 'rgba(255,255,255,0.25)';
    g.fillRect(x + 1, base - 6, 38, 0.5);
    const r = rng(m.u * 5 + d * 13);
    if (r() < 0.55) {
      g.fillStyle = PASTELS[(d + 3) % 6];
      g.globalAlpha = 0.55;
      const px = x + 8 + r() * 18;
      g.fillRect(px, top + 13 + r() * 4, 5, 5);
      g.fillStyle = '#ff4fa8';
      g.fillRect(px + 2, top + 13, 1, 1);
      g.globalAlpha = 1;
    }
    panel(g, x, top - 1, 2, 35, true, 0.5);
  }
  panel(g, x0 + n * 40 - 1, top - 1, 2, 35, true, 0.5);
  panel(g, x0, top - 1.5, n * 40 + 1, 2, true, 0.5);
}

function boardroomStatic(g, m, x0, base) {
  const x1 = x0 + (m.u1 - m.u);
  const pitch = (m.u1 - m.u) / m.seats;
  shadowAt(g, x0, x1 - x0, base);
  // high-back chairs
  for (let s = 0; s < m.seats; s++) {
    const cx = x0 + pitch * (s + 0.5);
    g.fillStyle = '#5a345e';
    g.beginPath(); rr(g, cx - 7, base - 46, 14, 26, 4); g.fill();
    g.fillStyle = '#6e4472';
    g.beginPath(); rr(g, cx - 5.5, base - 44.5, 11, 23, 3); g.fill();
    g.fillStyle = 'rgba(255,190,230,0.35)';
    for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) g.fillRect(cx - 3 + i * 5, base - 41 + j * 6, 0.9, 0.9);
    g.fillStyle = '#e8e4f1';
    g.fillRect(cx - 0.6, base - 20, 1.2, 14);
    g.fillRect(cx - 6, base - 6, 12, 1);
  }
  // chrome trestles for the glass table (its top is laid per frame, over the sitters)
  for (const tx of [x0 + 24, x1 - 24]) {
    panel(g, tx - 1.5, base - 24, 3, 22, true, 0.5);
    panel(g, tx - 9, base - 2.5, 18, 2.5, true, 0.5);
    panel(g, tx - 7, base - 24.5, 14, 2, true, 0.5);
  }
  g.fillStyle = 'rgba(205,199,218,0.8)';
  g.fillRect(x0 + 24, base - 14, x1 - x0 - 48, 1);
  if (m.easel) {
    const ex = x1 + 6;
    g.strokeStyle = '#8c85a3';
    g.lineWidth = 0.9;
    g.beginPath(); g.moveTo(ex + 2, base); g.lineTo(ex + 8, base - 52); g.moveTo(ex + 22, base); g.lineTo(ex + 16, base - 52); g.moveTo(ex + 12, base); g.lineTo(ex + 12, base - 30); g.stroke();
    g.fillStyle = '#d8cce8';
    g.fillRect(ex, base - 50, 24, 28);
    g.fillStyle = 'rgba(120,100,160,0.25)';
    g.fillRect(ex, base - 50, 24, 1.5);
    g.strokeStyle = '#c84a8a';
    g.lineWidth = 0.9;
    g.beginPath(); g.moveTo(ex + 3, base - 46); g.lineTo(ex + 9, base - 36); g.lineTo(ex + 13, base - 30); g.lineTo(ex + 17, base - 35); g.lineTo(ex + 21, base - 46); g.stroke();
    g.beginPath(); g.moveTo(ex + 18.5, base - 45); g.lineTo(ex + 21, base - 46.5); g.lineTo(ex + 21.5, base - 43.5); g.stroke();
  }
}

function paintMid(g, F, Pl, ua, ub, k) {
  const M = F.mid;
  for (const it of M.items) {
    const w = it.u1 != null ? it.u1 - it.u + (it.easel ? 40 : 0) : Math.max(it.w || 0, 44);
    copies(it.u, w, M.period, ua, ub, (x) => midItem(g, F, it, x, MID_BASE, k), 30);
  }
  // push the band behind the lane back: a pastel haze, heavier toward the floor
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = vgrad(g, 140, MID_BASE + 2, [[0, Pl.haze, 0.08], [0.45, Pl.haze, 0.18], [1, Pl.haze, Pl.hazeA]]);
  g.fillRect(ua - 4, 120, ub - ua + 8, MID_BASE + 4 - 120);
  g.globalCompositeOperation = 'source-over';
}

// ------------------------------------------------------------------ mid furniture (per frame)
function head(ctx, cx, hy, seed, look, P = {}) {
  const r = rng(seed * 7 + 3);
  const skin = SKINS[(r() * SKINS.length) | 0];
  const hair = HAIRS[(r() * HAIRS.length) | 0];
  const shirt = P.shirt || SHIRTS[(r() * SHIRTS.length) | 0];
  const style = (r() * 5) | 0;
  const shades = r() < 0.25;
  // shoulders and neck
  ctx.fillStyle = shirt;
  ctx.beginPath(); rr(ctx, cx - 7, hy + 5, 14, 14, 4); ctx.fill();
  if (P.tie) { ctx.fillStyle = P.tie; ctx.fillRect(cx - 0.8, hy + 6, 1.6, 7); }
  ctx.fillStyle = skin;
  ctx.fillRect(cx - 1.6, hy + 3, 3.2, 3);
  ctx.beginPath(); ctx.arc(cx, hy, 4.6, 0, TAU); ctx.fill();
  ctx.fillStyle = hair;
  if (style === 0) { ctx.beginPath(); ctx.arc(cx, hy - 1, 4.8, Math.PI * 1.02, TAU * 0.99); ctx.fill(); }
  else if (style === 1) { ctx.beginPath(); ctx.arc(cx, hy - 1.4, 5.8, Math.PI * 0.95, TAU * 1.01); ctx.fill(); ctx.fillRect(cx - 5.8, hy - 1.5, 2.2, 6); ctx.fillRect(cx + 3.6, hy - 1.5, 2.2, 6); }
  else if (style === 2) { ctx.fillRect(cx - 4.4, hy - 5.4, 8.8, 3.4); }
  else if (style === 3) { ctx.beginPath(); ctx.arc(cx, hy - 1.2, 4.9, Math.PI * 1.1, TAU * 0.92); ctx.fill(); ctx.beginPath(); ctx.arc(cx - look * 4.6, hy - 1, 1.8, 0, TAU); ctx.fill(); }
  else { ctx.beginPath(); ctx.arc(cx, hy - 0.6, 4.7, Math.PI * 1.15, TAU * 0.85); ctx.fill(); }
  if (shades) {
    ctx.fillStyle = '#2a1f4c';
    ctx.fillRect(cx - 3.6 + look, hy - 1, 7.2, 1.8);
    ctx.fillStyle = '#ff9fe0';
    ctx.fillRect(cx - 3 + look, hy - 0.8, 1.2, 0.5);
  } else {
    ctx.fillStyle = '#2a1f3c';
    ctx.fillRect(cx - 2 + look * 1.2, hy - 0.6, 1, 1.1);
    ctx.fillRect(cx + 1 + look * 1.2, hy - 0.6, 1, 1.1);
  }
}

function drawMidLive(ctx, f, dx, Pl) {
  for (const m of f.mid.items) {
    const b = m.base;
    if (m.kind === 'cubicles') {
      ctx.save();
      ctx.beginPath(); ctx.rect(m.x0 + dx - 4, 120, m.x1 - m.x0 + 8, b - 34 - 1.5 - 120); ctx.clip();
      for (const d of m.desks) {
        if (!d.occupied) continue;
        head(ctx, d.x + dx + 22, b - 34 - 7 + d.dy - d.pop * 12, d.seed, d.pop > 0.5 ? d.look : 0.4);
      }
      ctx.restore();
    } else if (m.kind === 'boardroom') {
      ctx.save();
      ctx.beginPath(); ctx.rect(m.x0 + dx - 10, 120, m.x1 - m.x0 + 20, b - 20 - 120); ctx.clip();
      for (const c of m.chairs) {
        if (!c.sitter) continue;
        const nod = c.nod;
        ctx.save();
        ctx.translate(c.x + dx, b - 33);
        ctx.rotate(nod * 0.25);
        ctx.translate(-(c.x + dx), -(b - 33));
        head(ctx, c.x + dx, b - 39 + nod * 4, c.seed + 50, 0.3, { shirt: ['#3b3270', '#5a2a5a', '#2a3a6a'][c.seed % 3], tie: '#ff8fcf' });
        if (nod > 0.7) {
          ctx.fillStyle = 'rgba(255,255,255,0.75)';
          ptext(ctx, 'Z', c.x + dx + 6, b - 50 - (nod - 0.7) * 10, 1, 'rgba(255,240,255,0.8)');
        }
        ctx.restore();
      }
      ctx.restore();
      // the glass table top, over the sitters: a teal edge, a sunset glint, water glasses
      const x0 = m.x0 + dx;
      const x1 = m.x1 + dx;
      ctx.fillStyle = Pl.tableGlass;
      ctx.fillRect(x0, b - 27, x1 - x0, 3.5);
      ctx.fillStyle = Pl.tableEdge;
      ctx.fillRect(x0, b - 24, x1 - x0, 0.8);
      ctx.fillStyle = Pl.tableGlint;
      ctx.fillRect(x0, b - 27, x1 - x0, 0.6);
      const pitch = (m.x1 - m.x0) / m.chairs.length;
      ctx.fillStyle = 'rgba(220,245,255,0.6)';
      for (let s2 = 0; s2 < m.chairs.length; s2++) ctx.fillRect(x0 + pitch * (s2 + 0.5) + 6, b - 31, 1.6, 4);
      ctx.fillStyle = 'rgba(250,240,255,0.55)';
      for (let s2 = 0; s2 < m.chairs.length; s2 += 2) ctx.fillRect(x0 + pitch * (s2 + 0.5) - 4, b - 27.6, 6, 0.8);
    } else if (m.kind === 'reception') {
      ctx.save();
      ctx.beginPath(); ctx.rect(m.x + dx, 120, m.w, b - 34.5 - 120); ctx.clip();
      head(ctx, m.x + dx + m.w * 0.42, b - 41 + m.dy, 777, 1, { shirt: '#ff9fcf' });
      // the headset
      ctx.strokeStyle = '#2a1f4c';
      ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.arc(m.x + dx + m.w * 0.42, b - 41 + m.dy, 5.2, Math.PI * 1.1, TAU * 0.95); ctx.stroke();
      ctx.restore();
    } else if (m.kind === 'cooler' && m.bubble >= 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(m.x + dx + 7, b - 28 - m.bubble * 13, 1.2 + m.bubble * 0.8, 0, TAU); ctx.fill();
    } else if (m.kind === 'copier' && m.scan >= 0) {
      const sx = m.x + dx + 3 + m.scan * (m.w - 8);
      ctx.fillStyle = 'rgba(127,247,230,0.35)';
      ctx.fillRect(sx - 3, b - 31, 8, 2);
      ctx.fillStyle = '#c8fff6';
      ctx.fillRect(sx, b - 30.5, 2, 1.2);
    } else if (m.kind === 'tallclock') {
      const px = m.x + dx + 10;
      const py = b - 47;
      ctx.save();
      ctx.beginPath(); ctx.rect(m.x + dx + 5.5, b - 47.5, 9, 29); ctx.clip();
      const a = m.swing * 0.28;
      ctx.strokeStyle = '#e8d08a';
      ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.sin(a) * 22, py + Math.cos(a) * 22); ctx.stroke();
      ctx.fillStyle = '#ffd86a';
      ctx.beginPath(); ctx.arc(px + Math.sin(a) * 22, py + Math.cos(a) * 22, 2.4, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
}

// ------------------------------------------------------------------ front pass
function frontSprite(kind, k) {
  if (kind === 'plant') {
    const W = 90;
    const H = 46;
    const c = canvas(W * k, H * k);
    const g = c.getContext('2d');
    g.setTransform(k, 0, 0, k, 0, 0);
    palmFronds(g, 45, H + 4, 2.4, ['#1d1838', '#241d44', '#19142f'], 909, 9);
    return { c, w: W, h: H };
  }
  if (kind === 'chair' || kind === 'armchair') {
    const W = 60;
    const H = 40;
    const c = canvas(W * k, H * k);
    const g = c.getContext('2d');
    g.setTransform(k, 0, 0, k, 0, 0);
    g.fillStyle = '#1d1838';
    if (kind === 'chair') {
      g.beginPath(); rr(g, 14, 8, 32, 40, 10); g.fill();
      g.beginPath(); rr(g, 20, 0, 20, 10, 4); g.fill();
    } else {
      g.beginPath(); rr(g, 6, 6, 48, 40, 14); g.fill();
      g.beginPath(); rr(g, 0, 16, 14, 30, 6); g.fill();
      g.beginPath(); rr(g, 46, 16, 14, 30, 6); g.fill();
    }
    g.fillStyle = 'rgba(255,154,216,0.35)';
    g.fillRect(16, 10, 0.8, 30);
    return { c, w: W, h: H };
  }
  return null;
}

// ------------------------------------------------------------------ bake + paint
const CACHE = new Map();
function bakeAll(fid, k) {
  const key = `${fid}@${k}`;
  let B = CACHE.get(key);
  if (B) return B;
  const F = OFFICE_FLOORS[fid];
  const Pl = PAL[fid];
  const O = F.outside;
  const farTop = fid === 'exec' ? 140 : F.glass.top;
  const farBot = Math.min(F.glass.bottom, fid === 'lobby' ? 186 : fid === 'open' ? 150 : 200);
  B = {
    sky: bakeSky(F, Pl, k),
    clouds: O.clouds.map((c, i) => bakeCloud(F, Pl, c, i, k)),
    far: makeStrip(k, 1400, farTop, farBot, (g, ua, ub) => paintFar(g, F, Pl, ua, ub)),
    near: makeStrip(k, 1200, F.glass.top, F.glass.bottom, (g, ua, ub) => paintNear(g, F, Pl, ua, ub)),
    wall: makeStrip(k, F.wall.period, F.ceilingY, WALL_BASE, (g, ua, ub) => paintWall(g, F, Pl, ua, ub, k)),
    mid: makeStrip(k, F.mid.period, 118, MID_BASE + 4, (g, ua, ub) => paintMid(g, F, Pl, ua, ub, k)),
    ceiling: bakeCeiling(F, Pl, k),
    floor: bakeFloor(F, Pl, k),
    slab: bakeSlab(F, Pl, k),
    cars: { cab: carSprite('cab', k), car: carSprite('car', k), bus: carSprite('bus', k) },
    blimp: blimpSprite(k),
    glowTube: glowSprite(k, '#e8ffff', 26),
    glowGlobe: glowSprite(k, '#ffe6f4', 22),
    glowPendant: glowSprite(k, '#ffcf9a', 30),
    glowPool: glowSprite(k, '#ffd0ea', 48),
    front: { plant: frontSprite('plant', k), chair: frontSprite('chair', k), armchair: frontSprite('armchair', k) },
  };
  const lift = F.wall.hangs.find((h) => h.kind === 'lift');
  if (lift) {
    B.leafL = liftLeaf(Pl, lift.w / 2, lift.h, k, false);
    B.leafR = liftLeaf(Pl, lift.w / 2, lift.h, k, true);
  }
  CACHE.set(key, B);
  return B;
}

function scaleOf(ctx) {
  const m = ctx.getTransform ? ctx.getTransform() : null;
  const k = m ? Math.hypot(m.a, m.b) : 1;
  return Math.min(3, Math.max(1, Math.round(k * 4) / 4));
}

// Per-frame gradients that depend on the context but not on the camera.
function liveStyles(ctx, B, Pl, f) {
  if (B.live) return;
  B.live = true;
  B.gridGlow = vgrad(ctx, WALL_BASE, LANE_TOP, [[0, Pl.grid, 0.55], [0.5, Pl.grid, 0.16], [1, Pl.grid, 0.05]]);
  B.gridLine = vgrad(ctx, WALL_BASE, LANE_TOP, [[0, Pl.gridHi, 0.9], [0.45, Pl.gridHi, 0.3], [1, Pl.gridHi, 0.08]]);
  B.reflGrad = vgrad(ctx, WALL_BASE, WALL_BASE + 15, [[0, Pl.refl, 0.35], [1, Pl.refl, 0]]);
  B.sunStreak = css('#ffc890', 0.35);
  B.tubeWash = vgrad(ctx, f.ceilingY, f.ceilingY + 70, [[0, '#f4ffff', 0.16], [1, '#f4ffff', 0]]);
  Pl.tableGlass = 'rgba(160,230,235,0.32)';
  Pl.tableEdge = 'rgba(127,243,255,0.75)';
  Pl.tableGlint = hgrad(ctx, 0, FRAME_W, [[0, '#ff9ad8', 0.3], [0.7, '#ffd0a0', 0.9], [1, '#ff9ad8', 0.3]]);
  B.patch = { lobby: [0.55, 46], exec: [0.95, 0], open: null }[f.floor];
  B.rows = [WALL_BASE, ...GRID_Z.map(gridY).filter((y) => y > WALL_BASE + 0.5 && y < LANE_TOP - 1), LANE_TOP];
  B.checker = f.floor === 'exec' ? null : vgrad(ctx, WALL_BASE, LANE_TOP, f.floor === 'lobby'
    ? [[0, '#ffffff', 0.3], [1, '#ffffff', 0.12]]
    : [[0, '#ffffff', 0.12], [1, '#ffffff', 0.05]]);

  B.beamGrad = vgrad(ctx, f.glass.top, WALL_BASE + 16, [[0, '#fff6e6', 0.0], [0.25, '#fff6e6', 0.11], [0.75, '#ffe8f4', 0.07], [1, '#ffe8f4', 0]]);
  B.patchGrad = vgrad(ctx, WALL_BASE, LANE_TOP, f.floor === 'exec'
    ? [[0, '#ffb890', 0.32], [0.6, '#ff9fb8', 0.12], [1, '#ff9fb8', 0]]
    : [[0, '#fff8e8', 0.5], [0.5, '#fff8e8', 0.12], [1, '#fff8e8', 0]]);
  B.colRefl = vgrad(ctx, WALL_BASE, WALL_BASE + 9, f.floor === 'exec'
    ? [[0, '#1a0f2a', 0.3], [1, '#1a0f2a', 0]]
    : [[0, '#a890b8', 0.3], [1, '#a890b8', 0]]);
  B.slabJoint = 'rgba(255,255,255,0.07)';
  B.slabStud = css(Pl.edge, 0.22);
  B.globeFill = (() => {
    const gr = ctx.createRadialGradient(-2, -2, 0.5, 0, 0, 6.5);
    gr.addColorStop(0, '#ffffff');
    gr.addColorStop(0.6, '#ffe2f2');
    gr.addColorStop(1, '#e8a8d8');
    return gr;
  })();
}

export const STYLE = {
  id: 'vapor',
  name: 'VAPORWAVE — Win95 corporate',
  note: 'The 1995 corporate dream as vaporwave remembers it: pastel pink, teal and lilac gradients in ordered dither, '
    + 'Windows 95 bevels as the architecture (chrome mullions, door frames, a Win95-teal lift bank with LCD indicators), '
    + 'posters as dialog boxes, Memphis confetti on the plaster, rose marble, potted palms and beige CRTs glowing over the cubicles. '
    + 'The floor is a checkered perspective grid that fades toward the lane and runs into a neon-edged slab, with the furniture '
    + 'mirrored in the polish. The founder, the silver professor, is a marble bust with chrome specs in the lobby and a '
    + 'web-safe-dithered DON.BMP upstairs, under a striped cyber-sunset.',
  paint(ctx, f) {
    const k = scaleOf(ctx);
    const B = bakeAll(f.floor, k);
    const Pl = PAL[f.floor];
    liveStyles(ctx, B, Pl, f);
    const O = f.outside;
    const G = f.glass;
    const ws = mod(f.wall.shift, f.wall.period);
    const wallDx = ws - Math.round(ws * k) / k;
    B.wallSnap = wallDx;

    // 1. outside, only where there is glass
    const glass = f.wall.bays.filter((b) => b.type === 'glass');
    if (glass.length) {
      ctx.save();
      ctx.beginPath();
      for (const b of glass) ctx.rect(b.x0 + wallDx, G.top, b.x1 - b.x0, G.bottom - G.top);
      ctx.clip();
      ctx.drawImage(B.sky.c, 0, B.sky.top, FRAME_W, B.sky.h);
      for (const s of O.stars) {
        const a = 0.35 + 0.65 * s.twinkle;
        ctx.fillStyle = `rgba(255,240,255,${a.toFixed(3)})`;
        const d = 0.6 + s.s * 0.6;
        ctx.fillRect(s.x - d / 2, s.y - d / 2, d, d);
        if (s.s > 1.05) {
          ctx.fillStyle = `rgba(255,200,240,${(a * 0.5).toFixed(3)})`;
          ctx.fillRect(s.x - 2.2, s.y - 0.2, 4.4, 0.4);
          ctx.fillRect(s.x - 0.2, s.y - 2.2, 0.4, 4.4);
        }
      }
      for (const c of O.clouds) {
        // whole device pixels, so the dithered shading never swims as they drift
        const S = B.clouds[c.i];
        ctx.drawImage(S.c, Math.round((c.x + S.ox) * k) / k, Math.round((c.y + S.oy) * k) / k, S.w, S.h);
      }
      if (O.far.length) drawStrip(ctx, B.far, O.far[0].u - O.far[0].x);
      if (O.cityLights.length) {
        for (let i = 0; i < O.cityLights.length; i++) {
          const l = O.cityLights[i];
          ctx.fillStyle = css(['#ffd7a0', '#ff9ed8', '#8ff2ff', '#fff6d0'][i & 3], l.a);
          ctx.fillRect(l.x, l.y, l.s, l.s);
        }
      }
      if (O.flyer && O.flyer.kind === 'heli') drawFlyer(ctx, O.flyer, B);
      if (O.near.length) drawStrip(ctx, B.near, O.near[0].u - O.near[0].x);
      if (f.floor === 'exec') {
        // glints running up the glass towers
        for (const b of O.near) {
          const tw = 0.5 + 0.5 * Math.sin(f.t * 1.7 + b.i * 2.3);
          if (tw < 0.55) continue;
          const gx = b.x + 1 + ((b.i * 37) % 10) / 10 * (b.w - 2);
          const gy = b.top + 6 + ((b.i * 53) % 10) / 10 * 30;
          const a = (tw - 0.55) / 0.45;
          ctx.fillStyle = `rgba(255,230,250,${(0.9 * a).toFixed(3)})`;
          ctx.fillRect(gx - 3 * a, gy - 0.25, 6 * a, 0.5);
          ctx.fillRect(gx - 0.25, gy - 3 * a, 0.5, 6 * a);
          ctx.fillRect(gx - 0.6, gy - 0.6, 1.2, 1.2);
        }
        // aircraft beacons on the towers, blinking
        const on = Math.sin(f.t * 3) > 0.2;
        if (on) {
          ctx.fillStyle = '#ff5f7a';
          for (const b of O.near) {
            if (b.roof === 'spire' || b.roof === 'antenna') {
              const h = b.roof === 'spire' ? Math.min(34, b.w * 0.9) + 8 : 22;
              ctx.beginPath(); ctx.arc(b.x + b.w / 2, b.top - h, 0.9, 0, TAU); ctx.fill();
            }
          }
        }
      }
      for (const c of O.cars) {
        const S = B.cars[c.kind];
        ctx.save();
        ctx.translate(c.x + c.w / 2, c.y - S.h + 1);
        if (c.dir < 0) ctx.scale(-1, 1);
        ctx.drawImage(S.c, -S.w / 2, 0, S.w, S.h);
        ctx.restore();
      }
      if (O.flyer && O.flyer.kind !== 'heli') drawFlyer(ctx, O.flyer, B);
      if (f.wall.cradle) {
        const c = f.wall.cradle;
        cradle(ctx, { ...c, x: c.x + wallDx }, f);
      }
      ctx.restore();
    }

    // 2. the wall, and its moving parts
    drawStrip(ctx, B.wall, f.wall.shift);
    for (const b of f.wall.bays) if (b.revolvingDoor != null) revolvingDoor(ctx, f, b.revolvingDoor + wallDx);
    for (const h of f.wall.hangs) {
      if (h.kind === 'lift') liftFrame(ctx, h, B, wallDx, f.t);
      else if (h.kind === 'clock') clockHands(ctx, f, h.cx + wallDx, h.cy, h.r);
    }
    if (f.floor === 'exec') {
      // the cove light over the panelling breathes a little
      ctx.fillStyle = `rgba(255,154,216,${(0.1 + 0.05 * Math.sin(f.t * 1.3)).toFixed(3)})`;
      ctx.fillRect(0, f.ceilingY, FRAME_W, 2);
    }

    // 3. ceiling and lights
    ctx.drawImage(B.ceiling.c, 0, 0, FRAME_W, B.ceiling.h);
    if (f.floor === 'open') {
      // the drop ceiling's T-bars, at the wall's rate
      ctx.fillStyle = 'rgba(140,130,180,0.35)';
      const s = f.wall.shift;
      for (let u = Math.floor((s - 20) / 30) * 30; u < s + FRAME_W + 30; u += 30) ctx.fillRect(u - s - 0.25, 24, 0.5, f.ceilingY - 26);
      ctx.fillRect(0, 28, FRAME_W, 0.5);
    }
    drawLights(ctx, f, B);
    if (f.floor === 'lobby') sunBeams(ctx, f, B);

    // 4. floor plane, slab, then the furniture standing on the floor
    drawFloorGrid(ctx, f, Pl, B);
    if (f.floor !== 'open') {
      // the furniture mirrored in the polished floor, fading within a few px
      for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.beginPath(); ctx.rect(0, MID_BASE + i * 2, FRAME_W, 2); ctx.clip();
        ctx.globalAlpha = 0.26 * Math.pow(1 - i / 6, 1.6);
        ctx.translate(0, MID_BASE * 2);
        ctx.scale(1, -1);
        drawStrip(ctx, B.mid, f.mid.shift);
        ctx.restore();
      }
    }
    drawSlab(ctx, f, Pl, B);
    const midDx = drawStrip(ctx, B.mid, f.mid.shift);
    drawMidLive(ctx, f, midDx, Pl);
  },
  paintFront(ctx, f) {
    const k = scaleOf(ctx);
    const B = bakeAll(f.floor, k);
    for (const it of f.front) {
      if (it.kind === 'pillar') {
        const x = it.x;
        const w = it.w;
        const g = ctx.createLinearGradient(x - 8, 0, x + w + 8, 0);
        g.addColorStop(0, 'rgba(20,12,38,0)');
        g.addColorStop(0.16, 'rgba(26,16,48,0.5)');
        g.addColorStop(0.42, 'rgba(52,32,84,0.36)');
        g.addColorStop(0.78, 'rgba(18,10,34,0.56)');
        g.addColorStop(1, 'rgba(14,8,28,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - 8, 0, w + 16, f.H);
        const rim = ctx.createLinearGradient(x, 0, x + 6, 0);
        rim.addColorStop(0, 'rgba(255,154,216,0)');
        rim.addColorStop(0.5, 'rgba(255,154,216,0.22)');
        rim.addColorStop(1, 'rgba(255,154,216,0)');
        ctx.fillStyle = rim;
        ctx.fillRect(x, 0, 6, f.H);
        ctx.fillStyle = 'rgba(127,243,255,0.1)';
        ctx.fillRect(x + w - 5, 0, 2, f.H);
      } else {
        const S = it.kind === 'plant' ? B.front.plant : it.kind === 'armchair' ? B.front.armchair : B.front.chair;
        if (!S) continue;
        ctx.globalAlpha = 0.8;
        ctx.drawImage(S.c, it.x - S.w / 2, f.H - S.h, S.w, S.h);
        ctx.globalAlpha = 1;
      }
    }
  },
};
