// CORPORATE KOMBAT style bake-off — MID-CENTURY MODERN, "Mad Men". The climb up the
// EGGCORP tower as a 1958-64 corporate title sequence: Saul Bass and the Mad Men opening
// for the city (flat cut-paper blocks, a window grid drawn as thin lines, a dusk in flat
// bands), UPA / Mary Blair / Charley Harper for the people and the plants, and the
// furniture of the era for the rooms — Nelson ball, sunburst and asterisk clocks, bubble
// lamps, Knoll sofas, Action Office partitions, Eames executive chairs, a kidney
// reception desk, walnut slats and panelling, terrazzo with brass inlay, a parquet with a
// rug. Flat fields with a dry-brush texture laid into them, and over everything a thin
// loose ink line printed a step OUT OF REGISTER, so the colour and the drawing never
// quite agree. The register grows toward the viewer.
//
// The palette is the interior's: walnut, burnt orange, olive, mustard, charcoal and
// cream, with a little turquoise kept well above the lane (posters, the ball clock, the
// noon sky). Speed Zone's MCM is a desert afternoon in teal and coral; this is indoors.
//
// Light: the lobby is a bright morning (pale butter sky, sun wedges on the terrazzo), the
// open floor a flat noon turquoise over rooftops and water towers, the executive floor a
// dramatic flat-band dusk with the city's windows coming on far below.
//
// Legibility: the band behind the lane (mid furniture and the floor plane) is veiled a
// step toward the room's own mid tone after it is baked, so nothing there competes with
// the chair, the printer, the paperwork, the barrel or the dog; nothing pale and
// printer-sized stands in it, and the hot colours live high on the walls.
//
// Cost: everything static is baked once per device scale into strips one period long in
// each layer's own u (the wall at 1440, the furniture at 1200, the skylines at 1400 and
// 1200), tiled under 2048 device px and drawn with a one-pixel overlap so no seam opens.
// Texture in a strip is scaled to divide its period, so the wrap is seamless. The floor
// plane is drawn as vectors in perspective every frame (sheared joints, plank and tile
// quads, terrazzo flecks), which antialias and so never crawl. What moves is drawn live
// from the frame: lift doors and their dials, clock hands, the revolving door, heads,
// the cooler, the copier, the boardroom's nodders, the pendulum, traffic, the flyer.
import { OFFICE_FLOORS, WALL_BASE, MID_BASE, LANE_TOP } from './plan.js';

const TAU = Math.PI * 2;
const FW = 480;
const FH = 270;

// --------------------------------------------------------------- palette
const INK = '#2a1c13';
const C = {
  cream: '#f1e6c9', paper: '#e8dbb9', bone: '#d8c8a2',
  walnut: '#73462a', walnutD: '#54321d', walnutL: '#93603a', teak: '#ad7646',
  orange: '#c9622a', orangeD: '#a14c1f', orangeL: '#de8650',
  mustard: '#d6a237', mustardD: '#ad8227', mustardL: '#e6c26c',
  olive: '#7b793c', oliveD: '#5c5a2c', oliveL: '#a09d5c',
  char: '#35302b', charL: '#4b453e', charD: '#221e1a',
  turq: '#4e9a94', turqL: '#8cc3b8', turqD: '#386f6a',
  brass: '#c6a04c', brassL: '#e4c77c', brassD: '#8f7039',
  red: '#b8432d', oxblood: '#6c3026', skin: ['#e2b48a', '#c98f62', '#9a6442', '#f0c9a2'],
};

// The register: where the ink lands relative to its colour. Grows toward the viewer.
const REG = { far: [0.6, -0.5], near: [0.9, -0.7], wall: [1.2, -1.0], mid: [1.4, -1.1], live: [1.2, -1.0] };

// The three floors' hands. Values are picked so the hazards always sit a clear step off
// what is behind them: the chair (#4a5a6c) and barrel on the lobby's cream terrazzo, the
// pale printer on the open floor's olive carpet, the dark dog on the honey parquet.
const FS = {
  lobby: {
    id: 'lobby',
    sky: { bands: ['#c4dbcf', '#d3e2d0', '#e3e5ca', '#efe0b8'], edges: [70, 116, 160], streak: '255,251,236', streakA: 0.18 },
    sun: { disc: '#fcf3d6', plate: '#e8b548', ray: '#f4dc9a', halo: '#f8ecc4' },
    cloud: { a: '#f8f1dd', b: '#e6c98a', aA: 1, bA: 0.45, ink: 0.35 },
    far: { tones: ['#a3b8aa', '#c9c09c', '#95aea8'], grid: '#7f998f', win: '#869e94', pier: '#d3d7c0', side: '#7a9188', lit: null, inkA: 0.32 },
    near: { tones: ['#b1683f', '#828049', '#6e8983'], grid: '#3c332d', win: '#4a3f37', pier: '#e6d7b2', side: '#3e3530', lit: null, inkA: 0.6 },
    ceiling: '#e7dcc1', ceilEdge: '#c9b893',
    stone: '#d0bb92', stoneJoint: '#b29c72', stoneLit: '#e2d1ad',
    column: '#5a3e2a', columnLit: '#b9914c',
    mullion: '#4b3b2d', glassTint: 'rgba(255,248,226,0.07)',
    floor: '#ddcfae', floorDk: '#cbb991', fleck: ['#b49e76', '#efe6cf', '#9c8462', '#c79066', '#8d8b5c'],
    slab: '#4e3d2f', slabDk: '#3a2d22', nosing: '#c8a65a', motif: '#6e5844',
    finish: { h: 6, col: '#c7b48c', tex: 'speck', texA: 0.65 },
    veil: ['#d9c9a4', 0.2],
  },
  open: {
    id: 'open',
    sky: { bands: ['#5ea8a2', '#78b6ab', '#9ccab8', '#c8dec6'], edges: [78, 104, 128], streak: '240,250,240', streakA: 0.14 },
    sun: null,
    cloud: { a: '#f6f2e2', b: '#cfe3d4', aA: 1, bA: 0.6, ink: 0.35 },
    far: { tones: ['#e0d8bc', '#d0cbb0', '#ebe2c6'], grid: '#b8b096', win: '#c2b99c', pier: '#f2ead2', side: '#b9b197', lit: null, inkA: 0.3 },
    near: { tones: ['#b5683e', '#85834a', '#cfae6a'], grid: '#2f2924', win: '#3a322c', pier: '#e2d5b2', side: '#2c2622', lit: null, inkA: 0.6 },
    ceiling: '#ebe2c8', ceilEdge: '#cbbd98',
    walls: ['#a09b62', '#e6dbbd', '#cfa65a'], wallLit: '#f2ead2',
    column: '#7c7845', columnLit: '#a6a26a',
    mullion: '#4c473a', glassTint: 'rgba(240,250,244,0.06)',
    sill: '#6a4428', hvac: '#74492b',
    floor: '#67614a', floorDk: '#5c5741', fleck: ['#57523d', '#7a7459', '#4e4a37'],
    slab: '#3a3629', slabDk: '#2a271e', nosing: '#a39c62', motif: '#545038',
    finish: { h: 4, col: '#58533c', tex: 'weave', texA: 0.5 },
    veil: ['#c9bd98', 0.14],
  },
  exec: {
    id: 'exec',
    sky: { bands: ['#2b2342', '#44294a', '#6e3148', '#a2402f', '#d0672c', '#eaa042'], edges: [62, 92, 120, 146, 166], streak: '255,214,160', streakA: 0.08 },
    sun: { disc: '#f8d97e', plate: '#e0742c', ray: '#f6c36a', halo: '#f2a24c' },
    cloud: { a: '#5c2f47', b: '#e58a3c', aA: 0.95, bA: 0.85, ink: 0.4 },
    far: { tones: ['#3e2c3c', '#4a3242', '#352735'], grid: '#2a1f2b', win: '#2c212d', pier: '#53394a', side: '#2a1f2b', lit: '#f2c25a', inkA: 0.3 },
    near: { tones: ['#2f2632', '#3a2d38', '#272029'], grid: '#1d171e', win: '#211a22', pier: '#45343f', side: '#1c161d', lit: '#f4c862', rim: '#d9733a', inkA: 0.5 },
    ceiling: '#3e2a1d', ceilEdge: '#b0873f',
    panel: '#6c4127', panelDk: '#5a341f', panelLit: '#87573a',
    column: '#2b2521', columnLit: '#a8853f',
    mullion: '#231d1a', glassTint: 'rgba(255,200,150,0.05)',
    floor: '#98683d', floorDk: '#8a5c34', planks: ['#9c6b3f', '#8f5f36', '#a6754a'],
    slab: '#3e2617', slabDk: '#2c190e', nosing: '#b8913f', motif: '#5c3c25',
    finish: { h: 6, col: '#8f5f36', tex: 'grain', texA: 0.5 },
    veil: ['#7a4c30', 0.2],
  },
};

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

const mod = (a, p) => ((a % p) + p) % p;

function canvas(w, h) {
  w = Math.max(1, Math.ceil(w));
  h = Math.max(1, Math.ceil(h));
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function scaleOf(ctx) {
  const m = ctx.getTransform ? ctx.getTransform() : null;
  const k = m ? Math.hypot(m.a, m.b) : 1;
  return Math.min(3, Math.max(1, Math.round(k * 2) / 2));
}

// --------------------------------------------------------------- textures
// Tiling texture tiles, 256 px. Each mark is stamped again a tile over so they wrap.
const TEX_PX = 256;

function bakeDry(seed, rgb, vertical = false) {
  const c = canvas(TEX_PX, TEX_PX);
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
          for (const dx of [0, -TEX_PX, TEX_PX]) {
            for (const dy of [0, -TEX_PX, TEX_PX]) {
              if (vertical) g.fillRect(by + (x - x0) * slope + dy, x + dx, hh, seg);
              else g.fillRect(x + dx, by + (x - x0) * slope + dy, seg, hh);
            }
          }
        }
        x += seg + r() * 5;
      }
    }
  }
  return c;
}

// Wood grain: long wavering vertical lines in a darker tone, with the odd cathedral arc.
function bakeGrain(seed, rgb) {
  const c = canvas(TEX_PX, TEX_PX);
  const g = c.getContext('2d');
  const r = rng(seed);
  g.lineCap = 'round';
  for (let k = 0; k < 70; k++) {
    const x0 = r() * TEX_PX;
    const amp = 1 + r() * 3;
    const fq = 1 + Math.floor(r() * 3);
    const ph = r() * TAU;
    g.strokeStyle = `rgba(${rgb},${0.12 + r() * 0.3})`;
    g.lineWidth = 0.6 + r() * 1.4;
    for (const dx of [0, -TEX_PX, TEX_PX]) {
      g.beginPath();
      for (let y = 0; y <= TEX_PX; y += 4) {
        const x = x0 + dx + Math.sin((y / TEX_PX) * TAU * fq + ph) * amp;
        if (y === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
  }
  return c;
}

// Woven fabric (partitions, upholstery): a fine cross weave broken by slubs.
function bakeWeave(seed, rgb) {
  const c = canvas(TEX_PX, TEX_PX);
  const g = c.getContext('2d');
  const r = rng(seed);
  for (let y = 0; y < TEX_PX; y += 3) {
    g.fillStyle = `rgba(${rgb},${0.08 + r() * 0.1})`;
    g.fillRect(0, y, TEX_PX, 1);
  }
  for (let x = 0; x < TEX_PX; x += 3) {
    g.fillStyle = `rgba(${rgb},${0.05 + r() * 0.08})`;
    g.fillRect(x, 0, 1, TEX_PX);
  }
  for (let k = 0; k < 160; k++) {
    g.fillStyle = `rgba(${rgb},${0.1 + r() * 0.2})`;
    const x = r() * TEX_PX;
    const y = Math.floor(r() * (TEX_PX / 3)) * 3;
    g.fillRect(x, y, 3 + r() * 9, 1.2);
  }
  return c;
}

// Terrazzo / fleck: scattered chips in several inks.
function bakeSpeck(seed, inks) {
  const c = canvas(TEX_PX, TEX_PX);
  const g = c.getContext('2d');
  const r = rng(seed);
  for (let k = 0; k < 900; k++) {
    const x = r() * TEX_PX;
    const y = r() * TEX_PX;
    const s = 0.8 + r() * 2.6;
    g.fillStyle = inks[Math.floor(r() * inks.length)];
    for (const dx of [0, -TEX_PX, TEX_PX]) {
      for (const dy of [0, -TEX_PX, TEX_PX]) {
        g.beginPath();
        g.ellipse(x + dx, y + dy, s, s * (0.5 + r() * 0.5), r() * TAU, 0, TAU);
        g.fill();
      }
    }
  }
  return c;
}

// Paper tooth: a fine grain of light and dark specks, as on uncoated stock.
function bakeTooth(seed) {
  const c = canvas(TEX_PX, TEX_PX);
  const g = c.getContext('2d');
  const img = g.createImageData(TEX_PX, TEX_PX);
  const r = rng(seed);
  for (let i = 0; i < TEX_PX * TEX_PX; i++) {
    const v = r();
    const light = v > 0.5;
    const a = Math.pow(Math.abs(v - 0.5) * 2, 3) * 255;
    img.data[i * 4] = light ? 255 : 40;
    img.data[i * 4 + 1] = light ? 248 : 26;
    img.data[i * 4 + 2] = light ? 230 : 14;
    img.data[i * 4 + 3] = a;
  }
  g.putImageData(img, 0, 0);
  return c;
}

let TEX = null;
function textures() {
  if (!TEX) {
    TEX = {
      dryL: bakeDry(3, '255,247,226'),
      dryD: bakeDry(7, '34,20,10'),
      dryV: bakeDry(5, '34,20,10', true),
      grain: bakeGrain(11, '36,18,8'),
      weave: bakeWeave(13, '40,26,12'),
      tooth: bakeTooth(19),
      speck: bakeSpeck(17, ['rgba(255,248,230,0.55)', 'rgba(60,40,24,0.45)', 'rgba(150,110,70,0.5)', 'rgba(200,120,70,0.4)']),
    };
  }
  return TEX;
}

const PATS = new WeakMap();
function pats(g) {
  let p = PATS.get(g);
  if (p) return p;
  const T = textures();
  p = {};
  for (const k of Object.keys(T)) p[k] = g.createPattern(T[k], 'repeat');
  PATS.set(g, p);
  return p;
}

// The texture scale and anchor for whatever is being painted: a strip sets them so its
// texture divides its period; live items pass their own anchor.
let TS = 0.5;
function tex(g, key, alpha, ax = 0, ay = 0, s = TS) {
  if (alpha <= 0) return;
  const p = pats(g)[key];
  if (p.setTransform && typeof DOMMatrix !== 'undefined') p.setTransform(new DOMMatrix([s, 0, 0, s, ax, ay]));
  g.globalAlpha = alpha;
  g.fillStyle = p;
  g.fill();
  g.globalAlpha = 1;
}

// ---------------------------------------------------------------- shapes
function polyPath(g, v) {
  g.beginPath();
  g.moveTo(v[0][0], v[0][1]);
  for (let k = 1; k < v.length; k++) g.lineTo(v[k][0], v[k][1]);
  g.closePath();
}

function blobPath(g, v) {
  const n = v.length;
  g.beginPath();
  g.moveTo((v[n - 1][0] + v[0][0]) / 2, (v[n - 1][1] + v[0][1]) / 2);
  for (let k = 0; k < n; k++) {
    const p = v[k];
    const q = v[(k + 1) % n];
    g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  g.closePath();
}

function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y);
  g.arcTo(x + w, y, x + w, y + r, r);
  g.lineTo(x + w, y + h - r);
  g.arcTo(x + w, y + h, x + w - r, y + h, r);
  g.lineTo(x + r, y + h);
  g.arcTo(x, y + h, x, y + h - r, r);
  g.lineTo(x, y + r);
  g.arcTo(x, y, x + r, y, r);
  g.closePath();
}

function fill(g, c, a = 1) {
  g.globalAlpha = a;
  g.fillStyle = c;
  g.fill();
  g.globalAlpha = 1;
}

function box(g, x, y, w, h, c, a = 1) {
  g.globalAlpha = a;
  g.fillStyle = c;
  g.fillRect(x, y, w, h);
  g.globalAlpha = 1;
}

function poly(g, v, c, a = 1) {
  polyPath(g, v);
  fill(g, c, a);
}

function disc(g, x, y, r, c, a = 1) {
  g.beginPath();
  g.arc(x, y, Math.max(0.01, r), 0, TAU);
  fill(g, c, a);
}

function oval(g, x, y, rx, ry, c, a = 1, rot = 0) {
  g.beginPath();
  g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
  fill(g, c, a);
}

function rectPts(x, y, w, h) {
  return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
}

function circlePts(x, y, rx, ry = rx, n = 14) {
  const out = [];
  for (let k = 0; k < n; k++) out.push([x + Math.cos((k / n) * TAU) * rx, y + Math.sin((k / n) * TAU) * ry]);
  return out;
}

// The out-of-register line: the outline shifted by the register, each edge its own
// stroke that overshoots its corners, now and then left out.
function ink(g, v, seed, reg, o = {}) {
  const r = rng(seed);
  const [ox, oy] = reg;
  const J = o.jit ?? 0.4;
  const n = v.length;
  const w = v.map(([x, y]) => [x + ox + (r() - 0.5) * J, y + oy + (r() - 0.5) * J]);
  const closed = o.closed !== false;
  const over = o.over ?? 1.2;
  const gapP = o.gapP ?? 0.12;
  g.beginPath();
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
    g.moveTo(a[0] - (dx / len) * e0, a[1] - (dy / len) * e0);
    g.lineTo(b[0] + (dx / len) * e1, b[1] + (dy / len) * e1);
  }
  g.lineCap = 'round';
  g.strokeStyle = o.col ?? INK;
  g.lineWidth = o.w ?? 0.6;
  g.globalAlpha = o.a ?? 0.85;
  g.stroke();
  g.globalAlpha = 1;
}

function inkRect(g, x, y, w, h, seed, reg, o) {
  ink(g, rectPts(x, y, w, h), seed, reg, o);
}

// A smooth loop in ink, broken by a seeded dash.
function inkLoop(g, v, seed, reg, o = {}) {
  const r = rng(seed);
  const [ox, oy] = reg;
  const J = o.jit ?? 0.5;
  const w = v.map(([x, y]) => [x + ox + (r() - 0.5) * J, y + oy + (r() - 0.5) * J]);
  blobPath(g, w);
  g.setLineDash(o.dash ?? [24 + r() * 30, 2 + r() * 4, 10 + r() * 16, 3 + r() * 6]);
  g.lineDashOffset = r() * 30;
  g.strokeStyle = o.col ?? INK;
  g.lineWidth = o.w ?? 0.6;
  g.globalAlpha = o.a ?? 0.85;
  g.stroke();
  g.setLineDash([]);
  g.globalAlpha = 1;
}

function inkLine(g, pts, reg, w = 0.6, a = 0.85, col = INK) {
  g.beginPath();
  g.moveTo(pts[0][0] + reg[0], pts[0][1] + reg[1]);
  for (let k = 1; k < pts.length; k++) g.lineTo(pts[k][0] + reg[0], pts[k][1] + reg[1]);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.strokeStyle = col;
  g.lineWidth = w;
  g.globalAlpha = a;
  g.stroke();
  g.globalAlpha = 1;
}

function line(g, x0, y0, x1, y1, col, w = 0.6, a = 1) {
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.lineCap = 'round';
  g.strokeStyle = col;
  g.lineWidth = w;
  g.globalAlpha = a;
  g.stroke();
  g.globalAlpha = 1;
}

// An atomic starburst: alternating long and short rays and a dot.
function burst(g, x, y, R, n, rot, col, w = 0.6, a = 1, dot = true) {
  g.beginPath();
  for (let k = 0; k < n; k++) {
    const ang = rot + (k / n) * TAU;
    const len = k % 2 ? R * 0.55 : R;
    g.moveTo(x + Math.cos(ang) * R * 0.2, y + Math.sin(ang) * R * 0.2);
    g.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
  }
  g.strokeStyle = col;
  g.lineWidth = w;
  g.lineCap = 'round';
  g.globalAlpha = a;
  g.stroke();
  if (dot) {
    g.beginPath();
    g.arc(x, y, Math.max(0.5, R * 0.15), 0, TAU);
    g.fillStyle = col;
    g.fill();
  }
  g.globalAlpha = 1;
}

function sparkle(g, x, y, R, col, a = 1) {
  const q = R * 0.2;
  g.beginPath();
  g.moveTo(x, y - R);
  g.lineTo(x + q, y - q);
  g.lineTo(x + R * 0.8, y);
  g.lineTo(x + q, y + q);
  g.lineTo(x, y + R);
  g.lineTo(x - q, y + q);
  g.lineTo(x - R * 0.8, y);
  g.lineTo(x - q, y - q);
  g.closePath();
  fill(g, col, a);
}

// ---------------------------------------------------------------- lettering
// Futura is the period's corporate face (it is on every Mac and iPhone); Copperplate for
// brass plates, Didot for the corner office.
const FUT = '"Futura", "Century Gothic", "Avenir Next", "Trebuchet MS", sans-serif';
const COP = '"Copperplate", "Futura", sans-serif';
const DID = '"Didot", "Bodoni 72", "Baskerville", serif';

function font(g, size, o = {}) {
  g.font = `${o.weight ?? 700} ${o.cond ? 'condensed ' : ''}${size}px ${o.family ?? FUT}`;
}

function label(g, s, x, y, size, col, o = {}) {
  g.save();
  font(g, size, o);
  g.textAlign = o.align ?? 'center';
  g.textBaseline = o.base ?? 'alphabetic';
  if ('letterSpacing' in g) g.letterSpacing = `${o.ls ?? 0}px`;
  g.fillStyle = col;
  g.globalAlpha = o.a ?? 1;
  if (o.maxW) g.fillText(s, x, y, o.maxW);
  else g.fillText(s, x, y);
  g.restore();
}

// Saul Bass lettering: each glyph on its own baseline and tilt, like letters cut from paper.
function cutLetters(g, s, cx, y, size, col, seed, o = {}) {
  g.save();
  font(g, size, { cond: true, weight: 800, ...o });
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  if ('letterSpacing' in g) g.letterSpacing = '0px';
  const chars = [...s];
  const ws = chars.map((ch) => g.measureText(ch).width);
  const ls = o.ls ?? size * 0.08;
  const total = ws.reduce((a, b) => a + b, 0) + ls * (chars.length - 1);
  const fit = o.maxW && total > o.maxW ? o.maxW / total : 1;
  let x = cx - (total * fit) / 2;
  g.fillStyle = col;
  g.globalAlpha = o.a ?? 1;
  chars.forEach((ch, i) => {
    const w = ws[i] * fit;
    g.save();
    g.translate(x + w / 2, y + (hash(seed + i * 1.7) - 0.5) * size * 0.1);
    g.rotate((hash(seed * 3.1 + i) - 0.5) * 0.14);
    g.scale(fit, 1);
    g.fillText(ch, 0, 0);
    g.restore();
    x += w + ls * fit;
  });
  g.restore();
}

// ---------------------------------------------------------------- strips
// A strip is one period of a layer in its own u, baked at device scale in tiles under
// 2048 device px. paint(g, ua, ub) draws the u range [ua, ub] (periodic content).
function bakeStrip(P, y0, y1, k, paint) {
  const n = Math.max(1, Math.ceil((P * k) / 2000));
  const T = P / n;
  const M = 2;
  const tiles = [];
  const prevTS = TS;
  TS = P / Math.max(1, Math.round(P / 128)) / TEX_PX;
  for (let i = 0; i < n; i++) {
    const ua = i * T - M;
    const ub = (i + 1) * T + M;
    const c = canvas((ub - ua) * k, (y1 - y0) * k);
    const g = c.getContext('2d');
    g.scale(k, k);
    g.translate(-ua, -y0);
    paint(g, ua, ub);
    tiles.push(c);
  }
  TS = prevTS;
  return { P, n, T, M, y0, y1, k, tiles };
}

function drawStrip(ctx, S, shift) {
  const s = mod(shift, S.P);
  const e = 1 / S.k;
  const h = S.y1 - S.y0;
  for (let c = -1; c <= 1; c++) {
    for (let i = 0; i < S.n; i++) {
      const x = i * S.T - s + c * S.P;
      if (x > FW + 1 || x + S.T < -1) continue;
      ctx.drawImage(S.tiles[i], S.M * S.k, 0, (S.T + e) * S.k, h * S.k, x, S.y0, S.T + e, h);
    }
  }
}

// Call fn(offset) for each periodic copy of [u0, u1] that touches [ua, ub].
function copies(P, ua, ub, u0, u1, fn) {
  for (const c of [-P, 0, P]) {
    if (u1 + c < ua - 2 || u0 + c > ub + 2) continue;
    fn(c);
  }
}

// ================================================================ OUTSIDE
function bakeSky(F, plan, k) {
  const c = canvas(FW * k, 232 * k);
  const g = c.getContext('2d');
  g.scale(k, k);
  TS = 0.5;
  const S = F.sky;
  box(g, 0, 0, FW, 232, S.bands[0]);
  // Stepped flat bands, each edge a slow lazy wave.
  for (let b = 0; b < S.edges.length; b++) {
    g.beginPath();
    g.moveTo(-4, 240);
    for (let x = -4; x <= FW + 4; x += 8) {
      const y = S.edges[b] + 2.5 * Math.sin(x / (80 + b * 23) + b * 1.7) + 1.2 * Math.sin(x / 23 + b);
      g.lineTo(x, y);
    }
    g.lineTo(FW + 4, 240);
    g.closePath();
    fill(g, S.bands[b + 1]);
  }
  g.beginPath();
  g.rect(0, 0, FW, 232);
  tex(g, 'dryL', S.streakA, 0, 0, 0.5);
  const sun = plan.outside.sun;
  if (sun && F.sun) {
    const U = F.sun;
    // Halo: two flat translucent discs, out of step with the sun.
    disc(g, sun.x - 3, sun.y + 2, sun.r * 2.6, U.halo, F.id === 'exec' ? 0.22 : 0.3);
    disc(g, sun.x + 2, sun.y - 1, sun.r * 1.7, U.halo, F.id === 'exec' ? 0.3 : 0.35);
    if (F.id === 'lobby') {
      // Morning rays, thin and long, a Bass sun.
      g.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU + 0.1;
        const r0 = sun.r * 1.35;
        const r1 = sun.r * (i % 2 ? 1.9 : 2.5);
        g.moveTo(sun.x + Math.cos(a) * r0, sun.y + Math.sin(a) * r0);
        g.lineTo(sun.x + Math.cos(a) * r1, sun.y + Math.sin(a) * r1);
      }
      g.strokeStyle = U.ray;
      g.lineWidth = 1.1;
      g.lineCap = 'round';
      g.stroke();
    }
    disc(g, sun.x - 3, sun.y + 2.5, sun.r, U.plate, 0.9);
    disc(g, sun.x, sun.y, sun.r, U.disc);
    g.beginPath();
    g.arc(sun.x, sun.y, sun.r, 0, TAU);
    tex(g, 'dryD', 0.06, sun.x, sun.y, 0.5);
    inkLoop(g, circlePts(sun.x, sun.y, sun.r, sun.r, 12), 41, [1.3, -1.1], { dash: [40, 5, 30, 4], w: 0.6, a: 0.45 });
  }
  if (F.id === 'exec') {
    // The horizon glow under the cloud bank: two flat bars, cream over orange.
    box(g, 0, 172, FW, 30, '#f0b456', 0.55);
    box(g, 0, 182, FW, 20, '#f6cd78', 0.45);
  }
  return c;
}

// Cut-paper verticals: a rectangle whose sides waver by a fraction of a pixel.
function cutRect(x, y, w, h, seed) {
  const r = rng(seed);
  const pts = [];
  const n = Math.max(2, Math.round(h / 12));
  pts.push([x + (r() - 0.5) * 0.5, y]);
  pts.push([x + w + (r() - 0.5) * 0.5, y + (r() - 0.5) * 0.4]);
  for (let i = 1; i < n; i++) pts.push([x + w + (r() - 0.5) * 0.7, y + (h * i) / n]);
  pts.push([x + w, y + h]);
  pts.push([x, y + h]);
  for (let i = n - 1; i > 0; i--) pts.push([x + (r() - 0.5) * 0.7, y + (h * i) / n]);
  return pts;
}

function building(g, b, x, L, F, layer) {
  const top = b.top;
  const base = b.base + 2;
  const w = b.w;
  const h = base - top;
  const body = L.tones[b.tone];
  const reg = REG[layer];
  const seed = b.i * 37 + (layer === 'far' ? 1 : 2) * 1000 + (F.id === 'exec' ? 7 : F.id === 'open' ? 3 : 0);
  const kind = (b.i + (layer === 'far' ? 1 : 0)) % 3;
  roofBehind(g, b, x, L, F, layer, seed);
  const shape = cutRect(x, top, w, h, seed);
  poly(g, shape, body);
  polyPath(g, shape);
  tex(g, 'dryL', 0.07);
  tex(g, 'dryD', 0.05);
  // The shaded side: a flat translucent plane on the side away from the light.
  const sw = Math.min(7, Math.max(2, w * 0.14));
  const shadeLeft = F.id === 'exec' ? false : F.id === 'open' ? (b.i % 2 === 0) : false;
  box(g, shadeLeft ? x : x + w - sw, top, sw, h, L.side, 0.35);
  // Facade.
  const cols = b.cols;
  const fh = b.floorH;
  const cw = (w - 4) / cols;
  const y0 = top + 4;
  const y1 = base - (b.shop != null ? 18 : 4);
  const lit = (r, c) => L.lit && hash(b.i * 13.1 + r * 7.7 + c * 3.3 + seed) < b.lit;
  if (kind === 0) {
    // The North by Northwest grid: thin lines over the flat field.
    g.beginPath();
    for (let c = 1; c < cols; c++) {
      const gx = x + 2 + c * cw;
      g.moveTo(gx, y0);
      g.lineTo(gx, y1);
    }
    for (let y = y0; y <= y1; y += fh) {
      g.moveTo(x + 2, y);
      g.lineTo(x + w - 2, y);
    }
    g.strokeStyle = L.grid;
    g.lineWidth = layer === 'far' ? 0.45 : 0.55;
    g.globalAlpha = layer === 'far' ? 0.55 : 0.6;
    g.stroke();
    g.globalAlpha = 1;
    if (L.lit) {
      g.beginPath();
      for (let r = 0, y = y0; y + fh <= y1 + 0.1; r++, y += fh) {
        for (let c = 0; c < cols; c++) if (lit(r, c)) g.rect(x + 2 + c * cw + cw * 0.2, y + fh * 0.25, cw * 0.6, fh * 0.5);
      }
      fill(g, L.lit, 0.8);
    }
  } else if (kind === 1) {
    // Punched windows.
    g.beginPath();
    const lp = new Path2D();
    for (let r = 0, y = y0; y + fh * 0.6 <= y1; r++, y += fh) {
      for (let c = 0; c < cols; c++) {
        const wx = x + 2 + c * cw + cw * 0.22;
        const ww = Math.max(0.8, cw * 0.56);
        const wh = fh * 0.52;
        if (lit(r, c)) lp.rect(wx, y, ww, wh);
        else g.rect(wx, y, ww, wh);
      }
    }
    fill(g, L.win, layer === 'far' ? 0.55 : 0.75);
    if (L.lit) {
      g.fillStyle = L.lit;
      g.globalAlpha = 0.9;
      g.fill(lp);
      g.globalAlpha = 1;
    }
  } else {
    // Vertical piers in a lighter paint; at dusk the spandrels between them lit in rows.
    g.beginPath();
    for (let c = 0; c <= cols; c++) g.rect(x + 2 + c * cw - cw * 0.12, y0 - 2, cw * 0.24, y1 - y0 + 2);
    fill(g, L.pier, layer === 'far' ? 0.35 : 0.28);
    // Spandrels: a thin dark line at each floor, so it reads as a facade, not a curtain.
    g.beginPath();
    for (let y = y0 + fh; y < y1; y += fh) g.rect(x + 2, y, w - 4, 0.5);
    fill(g, L.grid, 0.4);
    if (L.lit) {
      g.beginPath();
      for (let r = 0, y = y0; y + fh <= y1; r++, y += fh) {
        for (let c = 0; c < cols; c++) if (lit(r, c)) g.rect(x + 2 + c * cw + cw * 0.2, y + 1, cw * 0.6, fh * 0.45);
      }
      fill(g, L.lit, 0.85);
    }
  }
  // A dusk rim: the edge that faces the sunset catches a thin stripe of orange.
  if (L.rim) box(g, x + w - 1.6, top + 1, 1.2, h - 1, L.rim, 0.75);
  roofFront(g, b, x, L, F, layer, seed);
  if (b.shop != null) shopFront(g, b, x, base, seed);
  ink(g, rectPts(x, top, w, h), seed, reg, { gapP: 0.25, a: L.inkA, w: layer === 'far' ? 0.45 : 0.55 });
}

function roofBehind(g, b, x, L, F, layer, seed) {
  const w = b.w;
  const top = b.top;
  const body = L.tones[b.tone];
  const reg = REG[layer];
  if (b.roof === 'spire') {
    const h = 18 + hash(seed) * 16;
    const v = [[x + w * 0.32, top + 1], [x + w * 0.5, top - h], [x + w * 0.68, top + 1]];
    poly(g, v, body);
    box(g, x + w * 0.5 - 0.3, top - h - 7, 0.6, 7, L.grid, 0.8);
    ink(g, v, seed + 3, reg, { closed: false, a: L.inkA, w: 0.5 });
  } else if (b.roof === 'stepped') {
    const v1 = rectPts(x + w * 0.14, top - 8, w * 0.72, 9);
    const v2 = rectPts(x + w * 0.3, top - 15, w * 0.4, 8);
    poly(g, v1, body);
    poly(g, v2, body);
    box(g, x + w * 0.14, top - 8, w * 0.72, 1.2, L.pier, 0.4);
    box(g, x + w * 0.5 - 0.3, top - 24, 0.6, 9, L.grid, 0.8);
    ink(g, v1, seed + 4, reg, { a: L.inkA, w: 0.5, gapP: 0.3 });
    ink(g, v2, seed + 5, reg, { a: L.inkA, w: 0.5, gapP: 0.3 });
  } else if (b.roof === 'antenna') {
    const ax = x + w * (0.35 + hash(seed + 1) * 0.3);
    const h = 14 + hash(seed + 2) * 10;
    line(g, ax, top, ax, top - h, L.grid, 0.7);
    line(g, ax - 2.5, top - h * 0.55, ax + 2.5, top - h * 0.55, L.grid, 0.5);
    line(g, ax - 1.5, top - h * 0.8, ax + 1.5, top - h * 0.8, L.grid, 0.5);
    if (F.id === 'exec') disc(g, ax, top - h, 0.9, '#e2563a');
    else disc(g, ax, top - h, 0.8, L.grid);
  }
}

function roofFront(g, b, x, L, F, layer, seed) {
  const w = b.w;
  const top = b.top;
  const reg = REG[layer];
  if (b.roof === 'cornice') {
    const v = rectPts(x - 1.5, top - 2.5, w + 3, 3);
    poly(g, v, L.pier, 0.9);
    box(g, x - 1.5, top + 0.5, w + 3, 0.8, L.side, 0.5);
    ink(g, v, seed + 6, reg, { a: L.inkA, w: 0.5, gapP: 0.3 });
  } else if (b.roof === 'tank') {
    // The water tower: a stave barrel on stilts with a witch's-hat roof.
    const tx = x + w * (0.25 + hash(seed + 7) * 0.4);
    const bw = 13;
    const legs = 5;
    const by = top - legs;
    line(g, tx - 5, top, tx - 4, by, C.charL, 0.8);
    line(g, tx + 5, top, tx + 4, by, C.charL, 0.8);
    line(g, tx - 4.5, top - 2, tx + 4.5, top - 3.5, C.charL, 0.4);
    const barrel = rectPts(tx - bw / 2, by - 12, bw, 12);
    poly(g, barrel, '#7b5333');
    polyPath(g, barrel);
    tex(g, 'dryV', 0.25);
    box(g, tx - bw / 2, by - 12, 3, 12, '#5c3c24', 0.6);
    const roof = [[tx - bw / 2 - 1.5, by - 12], [tx, by - 19], [tx + bw / 2 + 1.5, by - 12]];
    poly(g, roof, '#5a3a24');
    g.beginPath();
    g.moveTo(tx - bw / 2, by - 8.5);
    g.lineTo(tx + bw / 2, by - 8.5);
    g.moveTo(tx - bw / 2, by - 4);
    g.lineTo(tx + bw / 2, by - 4);
    g.strokeStyle = C.charD;
    g.lineWidth = 0.45;
    g.stroke();
    ink(g, barrel, seed + 8, reg, { a: 0.7, w: 0.55, gapP: 0.15 });
    ink(g, roof, seed + 9, reg, { a: 0.7, w: 0.55, closed: false });
  } else if (b.roof === 'billboard') {
    const bx = x + 8;
    const bw = w - 16;
    const byy = top - 19;
    line(g, bx + bw * 0.25, top, bx + bw * 0.25, byy + 13, C.charL, 0.7);
    line(g, bx + bw * 0.75, top, bx + bw * 0.75, byy + 13, C.charL, 0.7);
    line(g, bx + 2, byy + 15.5, bx + bw - 2, byy + 15.5, C.charL, 0.4);
    const v = rectPts(bx, byy, bw, 13);
    poly(g, v, C.cream);
    billboardAd(g, bx, byy, bw, 13, b.i);
    ink(g, v, seed + 10, reg, { a: 0.75, w: 0.55 });
  } else if (b.roof === 'flat') {
    box(g, x, top, w, 1.4, L.pier, 0.35);
  }
}

// Ads across the street: the company's own, witty and of the period.
function billboardAd(g, x, y, w, h, i) {
  const ad = i % 3;
  if (ad === 0) {
    box(g, x, y, w, h, C.mustard);
    oval(g, x + 8, y + h / 2, 5, 4, C.cream);
    disc(g, x + 8.5, y + h / 2, 2, C.orange);
    label(g, 'SUNNY SIDE UP', x + 15 + (w - 17) / 2, y + h / 2 + 2, 5, C.char, { cond: true, weight: 800, maxW: w - 18 });
  } else if (ad === 1) {
    box(g, x, y, w, h, C.cream);
    oval(g, x + 6, y + h / 2, 3, 4, C.orange);
    label(g, 'EGGCORP', x + 11 + (w - 13) / 2, y + h / 2 + 2.2, 6, C.char, { maxW: w - 14, ls: 0.6 });
  } else {
    box(g, x, y, w, h, C.orange);
    label(g, 'FLY EGG AIR', x + w / 2, y + h / 2 + 2, 5.5, C.cream, { cond: true, weight: 800, maxW: w - 4, ls: 0.4 });
  }
}

function shopFront(g, b, x, base, seed) {
  const cols = [C.orange, C.olive, C.mustard, C.turq];
  const ac = cols[b.shop];
  const ay = base - 17;
  const w = b.w;
  // Shop window, then a striped scalloped awning.
  box(g, x + 3, ay + 4, w - 6, 13, '#3d3530');
  box(g, x + 5, ay + 6, w - 10, 7, '#5c5046', 0.7);
  g.save();
  g.beginPath();
  g.rect(x + 1, ay - 1, w - 2, 5.5);
  g.clip();
  box(g, x + 1, ay - 1, w - 2, 6, C.cream);
  for (let sx = x + 1; sx < x + w; sx += 6) box(g, sx, ay - 1, 3, 6, ac);
  g.restore();
  g.beginPath();
  for (let sx = x + 1; sx < x + w - 1; sx += 6) g.arc(sx + 3, ay + 4.5, 3, 0, Math.PI);
  fill(g, ac, 0.9);
  ink(g, rectPts(x + 1, ay - 1, w - 2, 5.5), seed + 11, REG.near, { a: 0.6, w: 0.5, gapP: 0.3 });
}

// A lollipop tree on the far pavement, Mary Blair style.
function tree(g, x, y, s, i) {
  const h = 38 * s;
  const reg = REG.near;
  line(g, x, y, x + (hash(i) - 0.5) * 2, y - h * 0.62, '#4a3a2a', 1.1);
  if (i % 2 === 0) {
    const cy = y - h * 0.7;
    const r = 11 * s;
    oval(g, x - 1.5, cy + 1.5, r, r * 0.95, '#5f6f36', 0.9);
    oval(g, x, cy, r, r * 0.95, '#7f8a45');
    g.beginPath();
    g.ellipse(x, cy, r, r * 0.95, 0, 0, TAU);
    tex(g, 'dryL', 0.12);
    inkLine(g, [[x, y - h * 0.45], [x - 3 * s, cy - 2 * s], [x - 5 * s, cy - 6 * s]], reg, 0.5, 0.6);
    inkLine(g, [[x, cy + 2], [x + 4 * s, cy - 4 * s]], reg, 0.5, 0.6);
    inkLoop(g, circlePts(x, cy, r, r * 0.95, 10), i * 7 + 3, reg, { a: 0.55, w: 0.5 });
  } else {
    const v = [[x, y - h * 1.05], [x + 8 * s, y - h * 0.38], [x - 8 * s, y - h * 0.38]];
    poly(g, v.map(([a, b]) => [a - 1.5, b + 1.2]), '#5f6f36', 0.9);
    poly(g, v, '#8d9450');
    polyPath(g, v);
    tex(g, 'dryL', 0.12);
    g.beginPath();
    for (let k = 1; k < 6; k++) {
      const yy = y - h * 1.05 + (h * 0.62 * k) / 6;
      const hw = (8 * s * k) / 6;
      g.moveTo(x + reg[0] - hw * 0.7, yy + 2 + reg[1]);
      g.lineTo(x + reg[0], yy + reg[1]);
      g.lineTo(x + reg[0] + hw * 0.7, yy + 2 + reg[1]);
    }
    g.strokeStyle = INK;
    g.lineWidth = 0.45;
    g.globalAlpha = 0.55;
    g.stroke();
    g.globalAlpha = 1;
  }
}

function streetLamp(g, x, y) {
  const reg = REG.near;
  line(g, x, y, x, y - 42, C.char, 1.1);
  g.beginPath();
  g.moveTo(x, y - 42);
  g.quadraticCurveTo(x, y - 46, x + 6, y - 45);
  g.strokeStyle = C.char;
  g.lineWidth = 1;
  g.stroke();
  oval(g, x + 7, y - 43.5, 3, 1.6, C.cream);
  burst(g, x + 7, y - 41, 3.2, 8, 0.2, C.mustard, 0.4, 0.6, false);
  box(g, x - 1.8, y - 2, 3.6, 2, C.char);
  inkLine(g, [[x, y - 2], [x, y - 40]], reg, 0.4, 0.4);
}

function bakeFar(F, plan, k) {
  const O = plan.outside;
  const L = F.far;
  let y0 = 400;
  let y1 = 0;
  for (const b of O.far) {
    y0 = Math.min(y0, b.top - 40);
    y1 = Math.max(y1, b.base + 4);
  }
  y0 = Math.max(0, Math.floor(y0));
  y1 = Math.ceil(y1);
  return bakeStrip(1400, y0, y1, k, (g, ua, ub) => {
    for (const b of O.far) copies(1400, ua, ub, b.u - 4, b.u + b.w + 4, (c) => building(g, b, b.u + c, L, F, 'far'));
  });
}

function bakeNear(F, plan, k) {
  const O = plan.outside;
  const L = F.near;
  let y0 = 400;
  let y1 = 0;
  for (const b of O.near) {
    y0 = Math.min(y0, b.top - 50);
    y1 = Math.max(y1, b.base + 4);
  }
  if (O.street) y1 = Math.max(y1, O.street.near + 4);
  y0 = Math.max(0, Math.floor(y0));
  y1 = Math.ceil(y1);
  return bakeStrip(1200, y0, y1, k, (g, ua, ub) => {
    if (O.street) {
      const S = O.street;
      // The road band and its dashed line, the pavements either side.
      box(g, ua, S.far - 5, ub - ua, 5, '#d4c7a6');
      box(g, ua, S.far, ub - ua, S.near - S.far, '#4c4640');
      g.beginPath();
      g.rect(ua, S.far, ub - ua, S.near - S.far);
      tex(g, 'dryL', 0.06);
      box(g, ua, S.far, ub - ua, 1, '#efe4c8', 0.8);
      const dy = (S.far + S.near) / 2 - 0.5;
      g.beginPath();
      const d0 = Math.floor(ua / 24) * 24;
      for (let u = d0; u < ub; u += 24) g.rect(u, dy, 12, 1.1);
      fill(g, C.mustardL, 0.85);
      box(g, ua, S.near, ub - ua, 4, '#d9cdaf');
      box(g, ua, S.near, ub - ua, 0.8, '#efe4c8', 0.8);
    }
    for (const b of O.near) copies(1200, ua, ub, b.u - 10, b.u + b.w + 10, (c) => building(g, b, b.u + c, L, F, 'near'));
    if (O.street) {
      for (const [i, tr] of O.trees.entries()) copies(1200, ua, ub, tr.u - 14, tr.u + 14, (c) => tree(g, tr.u + c, O.street.far, tr.s, i));
      for (const l of O.lamps) copies(1200, ua, ub, l.u - 4, l.u + 12, (c) => streetLamp(g, l.u + c, O.street.far));
    }
  });
}

// Clouds: flat kidney plates, two inks a step out of register.
function cloud(ctx, c, F) {
  const { x, y, w, h } = c;
  const K = F.cloud;
  const Q = (u, v) => [x + u * w, y + v * h];
  if (F.id === 'exec') {
    // Long flat stratus bars, lit from under by the low sun.
    const bar = [Q(0, 0.2), Q(0.18, -0.3), Q(0.5, -0.45), Q(0.78, -0.2), Q(1.02, 0.15), Q(0.85, 0.55), Q(0.4, 0.6), Q(0.08, 0.55)];
    blobPath(ctx, bar.map(([a, b]) => [a + 2, b + 2.2]));
    fill(ctx, K.b, 0.7);
    blobPath(ctx, bar);
    fill(ctx, K.a, K.aA);
    inkLoop(ctx, bar, 60 + c.i * 7, [-1.2, -0.9], { a: K.ink, w: 0.5, dash: [w * 0.5, w * 0.3, w * 0.3, w * 0.4] });
    return;
  }
  const main = [Q(0, 0.72), Q(0.1, 0.02), Q(0.38, -0.12), Q(0.6, 0.32), Q(0.82, -0.4), Q(1.05, -0.2),
    Q(0.97, 0.62), Q(0.62, 1.0), Q(0.3, 1.18), Q(0.07, 1.12)];
  blobPath(ctx, main.map(([a, b]) => [a - 3, b + 2.5]));
  fill(ctx, K.b, K.bA);
  blobPath(ctx, main);
  fill(ctx, K.a, K.aA);
  inkLoop(ctx, main, 60 + c.i * 7, [-1.4, -1.0], { a: K.ink, w: 0.5, dash: [w * 0.8, w * 0.35, w * 0.4, w * 0.5] });
}

function car(ctx, c) {
  const { x, y, w, dir } = c;
  const kinds = {
    cab: { body: '#e3b23a', roof: '#e3b23a', h: 11, cabin: [0.28, 0.7], trim: C.char },
    car: { body: '#4e9a94', roof: C.cream, h: 10, cabin: [0.3, 0.68], trim: C.cream },
    bus: { body: C.orange, roof: C.cream, h: 21, cabin: [0.05, 0.95], trim: C.cream },
  };
  const K = kinds[c.kind];
  ctx.save();
  ctx.translate(x + w / 2, y);
  ctx.scale(dir, 1);
  ctx.translate(-w / 2, 0);
  const h = K.h;
  if (c.kind === 'bus') {
    rr(ctx, 0, -h, w, h - 2, 3);
    fill(ctx, K.body);
    box(ctx, 0, -h, w, 5, K.roof);
    box(ctx, 2, -h + 6.5, w - 10, 5, '#3b3a3a');
    for (let wx = 4; wx < w - 10; wx += 8) box(ctx, wx, -h + 6.5, 0.8, 5, K.body);
    box(ctx, w - 7, -h + 5.5, 5, 9, '#3b3a3a');
    box(ctx, 0, -6, w, 1.2, K.trim, 0.8);
  } else {
    // Tail fins and a long low body, then the glasshouse.
    const v = [[0, -3], [0, -6.5], [w * 0.08, -7.5], [w * 0.15, -6.5], [w * 0.88, -6.5], [w, -4.5], [w, -2], [w * 0.95, -1.5], [w * 0.05, -1.5]];
    poly(ctx, v, K.body);
    const [c0, c1] = K.cabin;
    const cab = [[w * c0, -6.5], [w * (c0 + 0.08), -h], [w * (c1 - 0.06), -h], [w * c1, -6.5]];
    poly(ctx, cab, K.roof);
    poly(ctx, [[w * (c0 + 0.04), -6.8], [w * (c0 + 0.1), -h + 1.4], [w * ((c0 + c1) / 2 - 0.02), -h + 1.4], [w * ((c0 + c1) / 2 - 0.02), -6.8]], '#3b3a3a', 0.85);
    poly(ctx, [[w * ((c0 + c1) / 2 + 0.02), -6.8], [w * ((c0 + c1) / 2 + 0.02), -h + 1.4], [w * (c1 - 0.08), -h + 1.4], [w * (c1 - 0.03), -6.8]], '#3b3a3a', 0.85);
    box(ctx, 0, -4.2, w, 0.9, K.trim, 0.85);
    if (c.kind === 'cab') {
      for (let k = 0; k < 6; k++) box(ctx, w * 0.3 + k * 2, -3.2, 1, 1, k % 2 ? C.char : C.cream);
      box(ctx, w * 0.45, -h - 1.6, 4, 1.6, C.cream);
    }
    disc(ctx, w - 1, -4, 0.9, C.cream);
  }
  disc(ctx, w * 0.2, -1.5, 2.2, C.charD);
  disc(ctx, w * 0.8, -1.5, 2.2, C.charD);
  disc(ctx, w * 0.2, -1.5, 0.8, C.bone);
  disc(ctx, w * 0.8, -1.5, 0.8, C.bone);
  ink(ctx, [[0, -2], [0, -h + (c.kind === 'bus' ? 0 : 4)], [w, -h + (c.kind === 'bus' ? 0 : 6)], [w, -2]], c.i * 5 + 1, REG.near, { a: 0.5, w: 0.5, gapP: 0.25 });
  ctx.restore();
}

function flyer(ctx, fl) {
  if (fl.kind === 'birds') {
    // A flock of boomerangs, Charley Harper's swallows.
    for (let k = 0; k < 5; k++) {
      const bx = fl.x + k * 8 + (k % 2) * 2;
      const by = fl.y + (k % 2) * 4 - (k === 2 ? 3 : 0);
      const flap = Math.sin((fl.phase + k * 0.21) * TAU);
      const s = 3.2;
      ctx.beginPath();
      ctx.moveTo(bx - s, by - flap * 1.6);
      ctx.quadraticCurveTo(bx - s * 0.4, by - 0.6, bx, by + 0.5);
      ctx.quadraticCurveTo(bx + s * 0.4, by - 0.6, bx + s, by - flap * 1.6);
      ctx.quadraticCurveTo(bx + s * 0.4, by + 0.6, bx, by + 1.4);
      ctx.quadraticCurveTo(bx - s * 0.4, by + 0.6, bx - s, by - flap * 1.6);
      fill(ctx, C.char, 0.9);
    }
  } else if (fl.kind === 'blimp') {
    const { x, y } = fl;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(fl.dir < 0 ? -1 : 1, 1);
    // Fins, the envelope with a second plate slipped under it, the gondola, the name.
    poly(ctx, [[-26, -2], [-34, -9], [-30, -1], [-34, 7], [-26, 2]], C.orange);
    oval(ctx, -2, 2, 30, 10, C.orange, 0.55);
    oval(ctx, 0, 0, 30, 10, '#ece2c6');
    ctx.beginPath();
    ctx.ellipse(0, 0, 30, 10, 0, 0, TAU);
    tex(ctx, 'dryD', 0.07, x, y, 0.5);
    rr(ctx, -6, 9, 12, 4, 1.5);
    fill(ctx, C.char);
    ctx.restore();
    label(ctx, fl.label || 'EGGCORP', x, y + 2.4, 7, C.char, { ls: 0.8 });
    inkLoop(ctx, circlePts(x, y, 30, 10, 16), 91, REG.near, { a: 0.6, w: 0.55 });
  } else if (fl.kind === 'heli') {
    const { x, y } = fl;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(fl.dir < 0 ? -1 : 1, 1);
    line(ctx, -2, 0, -16, -2, '#1d171c', 1.2);
    poly(ctx, [[-17, -5], [-14, -2], [-18, -1]], '#1d171c');
    oval(ctx, 2, 0, 8, 5, '#1d171c');
    oval(ctx, 5, -1, 3.5, 2.6, '#f2b45a', 0.8);
    line(ctx, -4, 6, 8, 6, '#1d171c', 0.7);
    line(ctx, 2, -5, 2, -7, '#1d171c', 0.8);
    const rw = 15 * Math.abs(Math.cos(fl.phase * TAU));
    line(ctx, 2 - rw, -7, 2 + rw, -7, '#1d171c', 0.8);
    const tw = 3 * Math.abs(Math.sin(fl.phase * TAU * 2));
    line(ctx, -16, -2 - tw, -16, -2 + tw, '#1d171c', 0.6);
    ctx.restore();
    if (fl.phase < 0.5) disc(ctx, x - 6 * (fl.dir < 0 ? -1 : 1), y + 1, 0.9, '#ff5a3c');
  }
}

// The window cleaner: outside the glass, so painted before the wall strip.
function cradle(ctx, cr, ceilingY) {
  const { x, y, w, swipe } = cr;
  line(ctx, x + 5, ceilingY - 30, x + 5, y, C.char, 0.6);
  line(ctx, x + w - 5, ceilingY - 30, x + w - 5, y, C.char, 0.6);
  // The cleaner: cap, overalls, a pole and a squeegee sweeping the pane.
  const cx = x + w * 0.42;
  const sx = x + w * 0.62 + swipe * 14;
  const sy = y - 22 + Math.sin(swipe * Math.PI) * -4;
  // Wet streak where he has been.
  ctx.beginPath();
  ctx.moveTo(x + w * 0.6, sy + 3);
  ctx.quadraticCurveTo((x + w * 0.6 + sx) / 2, sy - 6, sx, sy);
  ctx.strokeStyle = 'rgba(255,255,250,0.35)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.stroke();
  box(ctx, cx - 3, y - 13, 6, 9, C.mustard);
  box(ctx, cx - 3, y - 7, 6, 3, C.olive);
  oval(ctx, cx, y - 16, 2.6, 3, C.skin[1]);
  poly(ctx, [[cx - 3, y - 17], [cx + 3.5, y - 17.5], [cx + 4.5, y - 16.5], [cx - 3, y - 16]], C.orange);
  line(ctx, cx + 2, y - 11, sx, sy, C.charL, 0.7);
  line(ctx, sx - 0.5, sy - 3, sx + 0.5, sy + 3, C.char, 1.4);
  // The cradle: a tray with a rail.
  const v = rectPts(x, y, w, 6);
  poly(ctx, v, C.olive);
  box(ctx, x, y, w, 1.5, C.oliveL);
  line(ctx, x, y - 6, x + w, y - 6, C.char, 0.6);
  for (let k = 0; k <= 4; k++) line(ctx, x + (w * k) / 4, y - 6, x + (w * k) / 4, y, C.char, 0.5);
  label(ctx, 'EGGCORP', x + w / 2, y + 4.6, 3.6, C.cream, { ls: 0.4 });
  ink(ctx, v, 77, REG.live, { a: 0.7, w: 0.5 });
}

// ================================================================ WALL
// Each floor's bays and columns, then the things hung on them.
function bakeWall(F, plan, k) {
  const P = plan.wall.period;
  return bakeStrip(P, 0, WALL_BASE + 1, k, (g, ua, ub) => {
    for (const b of plan.wall.bays) {
      copies(P, ua, ub, b.u - 2, b.u1 + 2, (c) => {
        if (b.type === 'glass') glassBay(g, F, plan, b, b.u + c, b.u1 + c);
        else wallBay(g, F, plan, b, b.u + c, b.u1 + c);
      });
    }
    for (const col of plan.wall.columns) copies(P, ua, ub, col.u - 2, col.u + col.w + 2, (c) => column(g, F, plan, col.u + c, col.w, col.u));
    for (const h of plan.wall.hangs) {
      const w = h.w || (h.r || 10) * 2;
      const x0 = h.kind === 'clock' ? h.u - h.r : h.u;
      copies(P, ua, ub, x0 - 30, x0 + w + 30, (c) => hangStatic(g, F, plan, h, h.u + c));
    }
  });
}

function wallBay(g, F, plan, b, x0, x1) {
  const top = plan.ceilingY;
  const h = WALL_BASE - top;
  const w = x1 - x0;
  const seed = b.u * 3 + 11;
  if (F.id === 'lobby') {
    const feature = plan.wall.hangs.some((hg) => hg.kind === 'logo' && hg.u >= b.u && hg.u < b.u1);
    if (feature) {
      slatWall(g, x0, top, w, h, seed);
    } else {
      travertine(g, F, x0, top, w, h, seed);
      // Over a lift bank, a walnut lintel the dials sit on.
      const lifts = plan.wall.hangs.filter((hg) => hg.kind === 'lift' && hg.u >= b.u && hg.u < b.u1);
      if (lifts.length) {
        const a = Math.min(...lifts.map((l) => l.u)) - 8 + (x0 - b.u);
        const z = Math.max(...lifts.map((l) => l.u + l.w)) + 8 + (x0 - b.u);
        const ly = WALL_BASE - lifts[0].h - 24;
        box(g, a, ly, z - a, 22, C.walnut);
        g.beginPath();
        g.rect(a, ly, z - a, 22);
        tex(g, 'grain', 0.5);
        box(g, a, ly, z - a, 1.4, C.brass, 0.9);
        box(g, a, ly + 20.6, z - a, 1.4, C.walnutD);
        inkRect(g, a, ly, z - a, 22, seed + 5, REG.wall, { a: 0.6, gapP: 0.2 });
        // Over the big bank, a Mary Blair tile mural (the small bank stays plain: it
        // passes under the HUD's corner).
        if (lifts.length >= 3) mural(g, a + 2, top + 18, z - a - 4, ly - top - 26, seed + 9);
      }
    }
    // Skirting: walnut with a brass lip.
    box(g, x0, WALL_BASE - 5, w, 5, C.walnutD);
    box(g, x0, WALL_BASE - 5, w, 0.9, C.brass, 0.85);
  } else if (F.id === 'open') {
    const tone = F.walls[(b.i >> 1) % F.walls.length];
    box(g, x0, top, w, h, tone);
    g.beginPath();
    g.rect(x0, top, w, h);
    tex(g, 'dryL', 0.12);
    tex(g, 'dryD', 0.05);
    // A flat lighter plane where the noon light falls through the next window.
    poly(g, [[x0, top], [x0 + w * 0.35, top], [x0 + w * 0.12, WALL_BASE], [x0, WALL_BASE]], F.wallLit, 0.12);
    box(g, x0, top, w, 2, C.charL, 0.25);
    box(g, x0, WALL_BASE - 4, w, 4, C.walnut);
    box(g, x0, WALL_BASE - 4, w, 0.8, C.walnutL);
  } else {
    walnutPanels(g, F, x0, top, w, h);
  }
  inkLine(g, [[x0, WALL_BASE], [x1, WALL_BASE]], REG.wall, 0.6, 0.6);
}

function travertine(g, F, x, y, w, h, seed) {
  box(g, x, y, w, h, F.stone);
  g.beginPath();
  g.rect(x, y, w, h);
  tex(g, 'dryL', 0.22);
  tex(g, 'dryD', 0.08);
  // Coursed stone: horizontal joints, staggered verticals, the odd lighter block.
  const r = rng(seed);
  const ch = 21;
  for (let row = 0, yy = y + 6; yy < WALL_BASE - 5; row++, yy += ch) {
    let xx = x - (row % 2 ? 22 : 0) - r() * 8;
    while (xx < x + w) {
      const bw = 34 + r() * 22;
      if (r() < 0.25) box(g, Math.max(x, xx), yy, Math.min(bw, x + w - Math.max(x, xx)), Math.min(ch, WALL_BASE - 5 - yy), F.stoneLit, 0.35);
      xx += bw;
      if (xx < x + w - 2) box(g, xx, yy, 0.6, Math.min(ch, WALL_BASE - 5 - yy), F.stoneJoint, 0.6);
    }
    box(g, x, yy, w, 0.6, F.stoneJoint, 0.7);
  }
  // Veins: a few long thin diagonal strokes.
  g.beginPath();
  for (let k = 0; k < Math.ceil(w / 60); k++) {
    const vx = x + r() * w;
    const vy = y + 10 + r() * (h - 30);
    g.moveTo(vx, vy);
    g.quadraticCurveTo(vx + 10, vy + 4, vx + 18 + r() * 14, vy + 2 + r() * 6);
  }
  g.strokeStyle = F.stoneJoint;
  g.lineWidth = 0.4;
  g.globalAlpha = 0.5;
  g.stroke();
  g.globalAlpha = 1;
}

// A tile mural in the manner of Mary Blair's: a sunrise over the city, birds, an egg
// hatching a skyscraper, all laid in small square tesserae with cream grout.
function mural(g, x, y, w, h, seed) {
  box(g, x - 2.5, y - 2.5, w + 5, h + 5, C.brassD);
  box(g, x - 2.5, y - 2.5, w + 5, 0.8, C.brassL, 0.8);
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  box(g, x, y, w, h, '#dcb45c');
  box(g, x, y + h * 0.55, w, h * 0.45, '#cf9a48');
  // The sun, low left, ringed with triangle rays.
  const sx = x + w * 0.2;
  const sy = y + h * 0.5;
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * TAU;
    poly(g, [[sx + Math.cos(a - 0.12) * 10, sy + Math.sin(a - 0.12) * 10], [sx + Math.cos(a) * 17, sy + Math.sin(a) * 17], [sx + Math.cos(a + 0.12) * 10, sy + Math.sin(a + 0.12) * 10]], C.orangeL);
  }
  disc(g, sx, sy, 9.5, C.orange);
  disc(g, sx - 2, sy - 2, 4, '#e8a060', 0.8);
  // Rolling olive hills and a little city of towers in cream and charcoal.
  blobPath(g, [[x - 10, y + h + 8], [x - 6, y + h * 0.7], [x + w * 0.25, y + h * 0.62], [x + w * 0.5, y + h * 0.78], [x + w * 0.8, y + h * 0.6], [x + w + 10, y + h * 0.72], [x + w + 10, y + h + 8]]);
  fill(g, '#8a8a46');
  const towers = [[0.36, 0.3, 7, C.cream], [0.43, 0.42, 6, C.char], [0.5, 0.22, 8, C.turq], [0.58, 0.38, 6, C.cream], [0.64, 0.5, 7, C.walnut]];
  for (const [tx, ty, tw, col] of towers) {
    box(g, x + w * tx, y + h * ty, tw, h, col);
    poly(g, [[x + w * tx, y + h * ty], [x + w * tx + tw / 2, y + h * ty - 5], [x + w * tx + tw, y + h * ty]], col);
  }
  // The egg hatching it: a big cream egg, its top half lifted and tipped.
  const ex = x + w * 0.82;
  const ey = y + h * 0.56;
  g.beginPath();
  g.ellipse(ex, ey, 9, 7, 0, 0, Math.PI);
  g.lineTo(ex - 9, ey);
  for (let k = 0; k <= 6; k++) g.lineTo(ex - 9 + k * 3, ey + (k % 2 ? -2.2 : 0));
  g.closePath();
  fill(g, C.cream);
  g.save();
  g.translate(ex + 4, ey - 9);
  g.rotate(0.45);
  g.beginPath();
  g.ellipse(0, 0, 9, 8, 0, Math.PI, TAU);
  g.lineTo(9, 0);
  for (let k = 0; k <= 6; k++) g.lineTo(9 - k * 3, (k % 2 ? 2.2 : 0));
  g.closePath();
  fill(g, C.cream);
  g.restore();
  burst(g, ex, ey - 4, 6, 8, 0.2, C.orange, 0.9);
  // Birds: turquoise teardrops with mustard beaks.
  const birds = [[0.36, 0.16, 1], [0.48, 0.1, -1], [0.66, 0.2, 1]];
  for (const [bx0, by0, d] of birds) {
    const bx = x + w * bx0;
    const by = y + h * by0 + 4;
    oval(g, bx, by, 5, 2.6, C.turqD);
    poly(g, [[bx - 2 * d, by - 1], [bx + 1 * d, by - 6], [bx + 2 * d, by - 1]], C.turq);
    poly(g, [[bx + 5 * d, by - 0.8], [bx + 8 * d, by], [bx + 5 * d, by + 0.8]], C.mustard);
  }
  // Grout: the tesserae.
  g.beginPath();
  for (let gx = x; gx < x + w; gx += 3) g.rect(gx, y, 0.45, h);
  for (let gy = y; gy < y + h; gy += 3) g.rect(x, gy, w, 0.45);
  fill(g, '#f3e7c8', 0.4);
  g.beginPath();
  g.rect(x, y, w, h);
  tex(g, 'dryD', 0.08);
  g.restore();
  inkRect(g, x - 2.5, y - 2.5, w + 5, h + 5, seed, REG.wall, { a: 0.6 });
}

// The logo wall: vertical walnut slats, alternating a hair lighter, with dark reveals.
function slatWall(g, x, y, w, h, seed) {
  box(g, x, y, w, h, C.walnutD);
  const r = rng(seed);
  for (let sx = x + 1; sx < x + w - 1; sx += 5) {
    const sw = Math.min(4, x + w - 1 - sx);
    box(g, sx, y, sw, h, r() < 0.5 ? C.walnut : '#7a4c2e');
    box(g, sx, y, 0.7, h, C.walnutL, 0.45);
  }
  g.beginPath();
  g.rect(x, y, w, h);
  tex(g, 'grain', 0.45);
  tex(g, 'dryV', 0.12);
  // A flat warm wash where the morning light reaches across it.
  poly(g, [[x, y], [x + w * 0.55, y], [x + w * 0.2, WALL_BASE], [x, WALL_BASE]], '#f2c47a', 0.08);
}

function walnutPanels(g, F, x, y, w, h) {
  box(g, x, y, w, h, F.panelDk);
  const n = Math.max(1, Math.round(w / 32));
  const pw = w / n;
  for (let i = 0; i < n; i++) {
    const px = x + i * pw;
    // Book-matched: each pair of panels mirrors its grain, so alternate the tone.
    const tone = i % 2 ? F.panel : '#734529';
    box(g, px + 0.8, y + 0.8, pw - 1.6, h - 7, tone);
    g.beginPath();
    g.rect(px + 0.8, y + 0.8, pw - 1.6, h - 7);
    tex(g, 'grain', 0.55, i % 2 ? 0 : 40, 0);
    tex(g, 'dryV', 0.1);
    box(g, px + 0.8, y + 0.8, 0.8, h - 7, F.panelLit, 0.5);
  }
  // The dusk light through the glass lies across the panels in a flat warm wedge.
  poly(g, [[x, y + 20], [x + w * 0.5, y], [x + w * 0.3, WALL_BASE], [x, WALL_BASE]], '#f0a050', 0.06);
  box(g, x, y, w, 2, '#2e1c12', 0.6);
  box(g, x, WALL_BASE - 6, w, 6, '#3a2316');
  box(g, x, WALL_BASE - 6, w, 0.8, C.brass, 0.7);
}

function glassBay(g, F, plan, b, x0, x1) {
  const G = plan.glass;
  const top = plan.ceilingY;
  const w = x1 - x0;
  const seed = b.u * 5 + 7;
  // Wall above the glass and below it.
  if (F.id === 'lobby') {
    box(g, x0, top, w, G.top - top, C.walnut);
    g.beginPath();
    g.rect(x0, top, w, G.top - top);
    tex(g, 'grain', 0.4);
    box(g, x0, G.top - 1.2, w, 1.2, C.brass, 0.8);
  } else if (F.id === 'open') {
    const tone = F.walls[1];
    box(g, x0, top, w, G.top - top, tone);
    g.beginPath();
    g.rect(x0, top, w, G.top - top);
    tex(g, 'dryL', 0.12);
    box(g, x0, top, w, 2, C.charL, 0.25);
    // The sill and the HVAC credenza beneath it, a walnut run with a slotted grille.
    box(g, x0, G.bottom, w, WALL_BASE - G.bottom, F.hvac);
    g.beginPath();
    g.rect(x0, G.bottom, w, WALL_BASE - G.bottom);
    tex(g, 'grain', 0.5);
    box(g, x0 - 1, G.bottom - 1, w + 2, 4, F.sill);
    box(g, x0 - 1, G.bottom - 1, w + 2, 0.9, C.walnutL);
    g.beginPath();
    for (let sx = x0 + 6; sx < x1 - 6; sx += 4) g.rect(sx, G.bottom + 10, 1.6, 14);
    fill(g, C.walnutD, 0.85);
    box(g, x0, WALL_BASE - 4, w, 4, C.walnutD);
    for (let k = 1; k < Math.floor(w / 60); k++) box(g, x0 + (w * k) / Math.floor(w / 60), G.bottom + 3, 0.7, WALL_BASE - G.bottom - 7, C.walnutD, 0.8);
    inkRect(g, x0, G.bottom - 1, w, WALL_BASE - G.bottom + 1, seed + 3, REG.wall, { a: 0.55, gapP: 0.25 });
  } else {
    box(g, x0, top, w, G.top - top, F.panelDk);
    box(g, x0, G.top - 1.4, w, 1.4, C.brass, 0.7);
    box(g, x0, G.bottom, w, WALL_BASE - G.bottom, '#2c211b');
    box(g, x0, G.bottom, w, 0.8, C.brass, 0.6);
  }
  // Glass: the faintest tint and a few flat reflection planes, then the mullions.
  box(g, x0, G.top, w, G.bottom - G.top, F.glassTint);
  // One pair of flat reflection planes per bay, high in the pane.
  const r = rng(seed);
  {
    const rx = x0 + w * (0.3 + r() * 0.4);
    const rw = 7 + r() * 8;
    const sl = (G.bottom - G.top) * 0.35;
    const ga = F.id === 'exec' ? 0.035 : 0.05;
    poly(g, [[rx, G.top], [rx + rw, G.top], [rx + rw - sl, G.bottom], [rx - sl, G.bottom]], '#fffaf0', ga);
    poly(g, [[rx + rw + 3, G.top], [rx + rw + 4.5, G.top], [rx + rw + 4.5 - sl, G.bottom], [rx + rw + 3 - sl, G.bottom]], '#fffaf0', ga * 1.3);
  }
  const mw = F.id === 'exec' ? 1.6 : F.id === 'open' ? 2 : 2.2;
  g.beginPath();
  const door = b.revolvingDoor == null ? null : b.revolvingDoor + (x0 - b.u);
  for (let mx = x0 + G.mullion; mx < x1 - 4; mx += G.mullion) {
    if (door != null && Math.abs(mx - door) < 26) {
      g.rect(mx - mw / 2, G.top, mw, G.transom - G.top);
      continue;
    }
    g.rect(mx - mw / 2, G.top, mw, G.bottom - G.top);
  }
  fill(g, F.mullion);
  box(g, x0, G.top, w, 2.2, F.mullion);
  if (G.transom) box(g, x0, G.transom - 1.5, w, 3, F.mullion);
  if (F.id === 'lobby') box(g, x0, G.bottom - 3, w, 3, F.mullion);
  // A thin lit edge down each mullion.
  g.beginPath();
  for (let mx = x0 + G.mullion; mx < x1 - 4; mx += G.mullion) {
    if (door != null && Math.abs(mx - door) < 26) continue;
    g.rect(mx - mw / 2, G.top, 0.5, G.bottom - G.top);
  }
  fill(g, F.id === 'exec' ? '#e08a46' : C.brassL, F.id === 'exec' ? 0.5 : 0.45);
  if (b.blinds > 0) blinds(g, F, G, x0, x1, b.blinds, seed);
  else if (F.id === 'open') {
    // Blinds drawn right up: just the headrail.
    box(g, x0, G.top, w, 3.2, '#e4d9bb');
    box(g, x0, G.top + 3.2, w, 0.8, C.charL, 0.4);
  }
  if (door != null) revolvingStatic(g, F, G, door);
}

function blinds(g, F, G, x0, x1, frac, seed) {
  const w = x1 - x0;
  const hgt = (G.bottom - G.top) * frac;
  const y1 = G.top + hgt;
  box(g, x0, G.top, w, hgt, '#ebe1c4');
  g.beginPath();
  for (let y = G.top + 3; y < y1 - 1; y += 3) g.rect(x0, y, w, 0.7);
  fill(g, '#b8aa86', 0.75);
  g.beginPath();
  for (let y = G.top + 1.5; y < y1 - 1; y += 3) g.rect(x0, y, w, 0.5);
  fill(g, '#fffaf0', 0.5);
  box(g, x0, G.top, w, 3, '#d9cca8');
  box(g, x0, y1 - 2, w, 2.4, C.walnut);
  // Ladder tapes and the pull cord.
  g.beginPath();
  for (let tx = x0 + 18; tx < x1 - 10; tx += 44) g.rect(tx, G.top, 0.6, hgt);
  fill(g, '#a89a76', 0.6);
  line(g, x1 - 8, G.top + 3, x1 - 8, y1 + 10, C.charL, 0.4);
  disc(g, x1 - 8, y1 + 10, 0.9, C.walnut);
  ink(g, rectPts(x0, G.top, w, hgt), seed + 9, REG.wall, { a: 0.45, gapP: 0.3 });
}

function revolvingStatic(g, F, G, x) {
  const top = G.transom + 1.5;
  const bot = G.bottom - 3;
  // The drum: a darker translucent well behind the wings, a brass canopy and threshold.
  box(g, x - 22, top, 44, bot - top, '#3b3026', 0.22);
  g.beginPath();
  g.ellipse(x, top + 2, 23, 4, 0, 0, TAU);
  fill(g, C.brass);
  box(g, x - 23, top - 6, 46, 8, C.brassD);
  box(g, x - 23, top - 6, 46, 1.2, C.brassL, 0.8);
  label(g, 'EGGCORP', x, top - 0.6, 4.4, C.cream, { ls: 0.6 });
  g.beginPath();
  g.ellipse(x, bot, 23, 3.2, 0, 0, TAU);
  fill(g, C.brassD, 0.8);
  inkRect(g, x - 23, top - 6, 46, 8, 501, REG.wall, { a: 0.7 });
}

function column(g, F, plan, x, w, u) {
  const top = plan.ceilingY;
  const h = WALL_BASE - top;
  const seed = u * 7 + 3;
  box(g, x, top, w, h, F.column);
  g.beginPath();
  g.rect(x, top, w, h);
  if (F.id === 'lobby') {
    tex(g, 'grain', 0.35);
    box(g, x + 3, top, 1.4, h, F.columnLit, 0.85);
    box(g, x + w - 3, top, 3, h, C.charD, 0.35);
    box(g, x - 1, top, w + 2, 3, C.brass);
    box(g, x - 1, WALL_BASE - 6, w + 2, 6, C.brass);
    box(g, x - 1, WALL_BASE - 6, w + 2, 1, C.brassL);
  } else if (F.id === 'open') {
    tex(g, 'dryL', 0.15);
    box(g, x, top, 2, h, F.columnLit, 0.8);
    box(g, x + w - 3, top, 3, h, C.oliveD, 0.5);
    box(g, x - 0.5, WALL_BASE - 5, w + 1, 5, C.walnutD);
  } else {
    tex(g, 'dryL', 0.06);
    box(g, x + w * 0.5 - 0.6, top, 1.2, h, F.columnLit, 0.75);
    box(g, x - 1, top, w + 2, 2.5, C.brassD);
    box(g, x - 1, WALL_BASE - 7, w + 2, 7, '#1c1714');
    box(g, x - 1, WALL_BASE - 7, w + 2, 0.8, C.brass, 0.7);
  }
  inkRect(g, x, top, w, h, seed, REG.wall, { a: 0.55, gapP: 0.2 });
}

// ------------------------------------------------------------ hangs (static)
function hangStatic(g, F, plan, h, x) {
  const y = h.y ?? WALL_BASE - h.h;
  const seed = h.u * 13 + 5;
  switch (h.kind) {
    case 'lift': liftStatic(g, F, x, y, h.w, h.h, h.label, seed); break;
    case 'logo': logo(g, x, y, h.w, h.h, h.label, seed); break;
    case 'clock': clockFace(g, F, x, h.y, h.r, seed); break;
    case 'painting': painting(g, x, y, h.w, h.h, h.variant, seed); break;
    case 'poster': poster(g, x, y, h.w, h.h, h.label, seed); break;
    case 'whiteboard': whiteboard(g, x, y, h.w, h.h, seed); break;
    case 'door': door(g, F, x, y, h.w, h.h, h.label, seed); break;
    case 'extinguisher': extinguisher(g, x, y, h.w, h.h, seed); break;
    case 'portrait': portrait(g, x, y, h.w, h.h, h.label, seed); break;
    case 'trophyCase': trophyCase(g, x, y, h.w, h.h, seed); break;
    case 'bookshelf': bookshelf(g, x, y, h.w, h.h, seed); break;
    default: break;
  }
}

function liftStatic(g, F, x, y, w, h, lbl, seed) {
  const frame = F.id === 'exec' ? C.brassD : F.id === 'open' ? C.walnut : C.brass;
  box(g, x - 3, y - 3, w + 6, h + 3, frame);
  box(g, x - 3, y - 3, w + 6, 1, F.id === 'open' ? C.walnutL : C.brassL, 0.8);
  // The car, lit warm: back panel, handrail, a sliver of floor.
  box(g, x, y, w, h, '#f3dca2');
  box(g, x + 3, y + 4, w - 6, h - 12, '#e8c987');
  box(g, x, y, w, 3, '#fff1c8', 0.8);
  box(g, x + 3, y + h * 0.56, w - 6, 1.2, C.brassD);
  box(g, x, y + h - 3, w, 3, C.char);
  // The dial: a brass half-moon with ticks, the floor's own plate under its pivot.
  const cx = x + w / 2;
  const cy = y - 9;
  g.beginPath();
  g.arc(cx, cy, 8.5, Math.PI, 0);
  g.closePath();
  fill(g, C.brass);
  g.beginPath();
  g.arc(cx, cy, 7, Math.PI, 0);
  g.closePath();
  fill(g, C.cream);
  g.beginPath();
  for (let k = 0; k <= 6; k++) {
    const a = Math.PI + (k / 6) * Math.PI;
    g.moveTo(cx + Math.cos(a) * 5.2, cy + Math.sin(a) * 5.2);
    g.lineTo(cx + Math.cos(a) * 6.8, cy + Math.sin(a) * 6.8);
  }
  g.strokeStyle = C.char;
  g.lineWidth = 0.4;
  g.stroke();
  rr(g, cx - 5.5, cy, 11, 6, 1);
  fill(g, C.charD);
  label(g, lbl, cx, cy + 5, 5.2, C.mustardL, { weight: 700 });
  // Lantern arrows either side, unlit.
  poly(g, [[x + 2, cy + 1], [x + 4.5, cy - 3], [x + 7, cy + 1]], C.brassD);
  poly(g, [[x + w - 7, cy - 3], [x + w - 4.5, cy + 1], [x + w - 2, cy - 3]], C.brassD);
  inkRect(g, x - 3, y - 3, w + 6, h + 3, seed, REG.wall, { a: 0.6, gapP: 0.2 });
  ink(g, [[cx - 8.5, cy], [cx - 6, cy - 6], [cx, cy - 8.5], [cx + 6, cy - 6], [cx + 8.5, cy]], seed + 1, REG.wall, { closed: false, a: 0.6 });
}

function logo(g, x, y, w, h, lbl, seed) {
  // The egg mark: a charcoal disc, an orange egg with a cream crack, brass rays.
  const mx = x + 27;
  const my = y + h / 2;
  burst(g, mx, my, 30, 24, 0.13, C.brass, 0.9, 0.9, false);
  disc(g, mx + 1.5, my + 1.5, 21, C.orange, 0.6);
  disc(g, mx, my, 21, C.char);
  g.beginPath();
  g.arc(mx, my, 21, 0, TAU);
  tex(g, 'dryL', 0.08);
  const egg = [];
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * TAU;
    const ry = Math.sin(a) < 0 ? 15.5 : 12;
    egg.push([mx + Math.cos(a) * 11, my + 1.5 + Math.sin(a) * ry]);
  }
  poly(g, egg, C.orange);
  polyPath(g, egg);
  tex(g, 'dryL', 0.12);
  oval(g, mx - 4, my - 5, 3, 5, C.orangeL, 0.8, -0.3);
  // The crack: a zigzag across the egg's waist.
  g.beginPath();
  g.moveTo(mx - 11, my + 1);
  for (let k = 1; k <= 6; k++) g.lineTo(mx - 11 + (k * 22) / 6, my + 1 + (k % 2 ? -3 : 1.5));
  g.strokeStyle = C.cream;
  g.lineWidth = 1.3;
  g.lineJoin = 'miter';
  g.stroke();
  inkLoop(g, circlePts(mx, my, 21, 21, 14), seed, REG.wall, { a: 0.7, w: 0.6 });
  // The name in brass letters standing a hair off the slats, a dark shadow under each.
  const tx = x + 60 + (w - 60) / 2;
  label(g, lbl, tx + 1.2, y + h / 2 + 6.6, 19, '#2a170c', { ls: 1.4, a: 0.6 });
  label(g, lbl, tx, y + h / 2 + 5.4, 19, C.brassL, { ls: 1.4 });
  label(g, 'I N C O R P O R A T E D', tx, y + h / 2 + 14, 4.4, C.cream, { weight: 500, a: 0.85 });
  box(g, x + 62, y + h / 2 - 12, w - 64, 0.8, C.brass, 0.7);
}

function clockFace(g, F, cx, cy, r, seed) {
  if (F.id === 'lobby') {
    // The Nelson ball clock: brass spokes, coloured balls, a brass hub.
    const balls = [C.orange, C.mustard, C.olive, C.turq, C.cream, C.walnut];
    g.beginPath();
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * TAU;
      g.moveTo(cx + Math.cos(a) * r * 0.25, cy + Math.sin(a) * r * 0.25);
      g.lineTo(cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.9);
    }
    g.strokeStyle = C.brassD;
    g.lineWidth = 0.6;
    g.stroke();
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * TAU;
      disc(g, cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * 0.17, balls[k % balls.length]);
    }
    disc(g, cx, cy, r * 0.26, C.brass);
    inkLoop(g, circlePts(cx, cy, r * 0.26, r * 0.26, 8), seed, REG.wall, { a: 0.6, w: 0.5 });
  } else if (F.id === 'open') {
    // The Nelson sunburst: long and short brass rays round a small cream face.
    g.beginPath();
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * TAU;
      const len = k % 2 ? r * 0.82 : r * 1.12;
      g.moveTo(cx + Math.cos(a) * r * 0.45, cy + Math.sin(a) * r * 0.45);
      g.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
    }
    g.strokeStyle = C.brassD;
    g.lineWidth = 1.2;
    g.lineCap = 'round';
    g.stroke();
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * TAU;
      disc(g, cx + Math.cos(a) * r * 1.12, cy + Math.sin(a) * r * 1.12, 0.8, C.walnut);
    }
    disc(g, cx, cy, r * 0.5, C.cream);
    g.beginPath();
    g.arc(cx, cy, r * 0.5, 0, TAU);
    g.strokeStyle = C.walnut;
    g.lineWidth = 0.7;
    g.stroke();
    inkLoop(g, circlePts(cx, cy, r * 0.5, r * 0.5, 8), seed, REG.wall, { a: 0.6, w: 0.5 });
  } else {
    // The asterisk: six fat rounded spokes, orange and walnut, round a cream boss.
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU + Math.PI / 6;
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a) * r * 1.05, cy + Math.sin(a) * r * 1.05);
      g.strokeStyle = k % 2 ? C.orange : C.mustard;
      g.lineWidth = 2.6;
      g.lineCap = 'round';
      g.stroke();
    }
    disc(g, cx, cy, r * 0.42, C.cream);
    disc(g, cx, cy, r * 0.42, C.walnut, 0.15);
    inkLoop(g, circlePts(cx, cy, r * 0.42, r * 0.42, 8), seed, REG.wall, { a: 0.6, w: 0.5 });
  }
}

function frameBox(g, x, y, w, h, col, t, seed) {
  box(g, x, y, w, h, col);
  box(g, x, y, w, 0.8, '#fff2c8', 0.35);
  box(g, x + t - 0.6, y + t - 0.6, w - 2 * t + 1.2, h - 2 * t + 1.2, '#1e140d', 0.5);
  inkRect(g, x, y, w, h, seed, REG.wall, { a: 0.6 });
}

function painting(g, x, y, w, h, variant, seed) {
  frameBox(g, x, y, w, h, variant ? C.brass : C.walnutD, 2.5, seed);
  const ix = x + 2.5;
  const iy = y + 2.5;
  const iw = w - 5;
  const ih = h - 5;
  g.save();
  g.beginPath();
  g.rect(ix, iy, iw, ih);
  g.clip();
  if (variant === 1) {
    // A Saul Bass city: mustard sky, an orange sun, blocks with window grids.
    box(g, ix, iy, iw, ih, C.mustard);
    disc(g, ix + iw * 0.7, iy + ih * 0.28, iw * 0.18, C.orange);
    const towers = [[0.02, 0.45, 0.28, C.char], [0.26, 0.3, 0.22, C.olive], [0.45, 0.55, 0.3, C.cream], [0.72, 0.4, 0.26, C.char]];
    for (const [tx, ty, tw, col] of towers) {
      box(g, ix + tx * iw, iy + ty * ih, tw * iw, ih, col);
      g.beginPath();
      for (let yy = iy + ty * ih + 3; yy < iy + ih; yy += 3) g.rect(ix + tx * iw + 1.5, yy, tw * iw - 3, 0.5);
      fill(g, col === C.cream ? C.char : C.cream, 0.5);
    }
  } else {
    // Miro by way of a 1959 annual report.
    box(g, ix, iy, iw, ih, C.cream);
    g.beginPath();
    g.rect(ix, iy, iw, ih);
    tex(g, 'dryD', 0.08);
    blobPath(g, [[ix + 6, iy + 24], [ix + 12, iy + 8], [ix + 26, iy + 10], [ix + 24, iy + 24], [ix + 32, iy + 32], [ix + 14, iy + 34]]);
    fill(g, C.mustard);
    disc(g, ix + 38, iy + 14, 7, C.orange);
    poly(g, [[ix + 40, iy + 36], [ix + 52, iy + 20], [ix + 54, iy + 36]], C.olive);
    blobPath(g, [[ix + 22, iy + 30], [ix + 30, iy + 22], [ix + 44, iy + 26], [ix + 36, iy + 28], [ix + 30, iy + 34]]);
    fill(g, C.turq, 0.9);
    inkLine(g, [[ix + 4, iy + 6], [ix + 20, iy + 16], [ix + 30, iy + 6], [ix + 50, iy + 12]], [0, 0], 0.6, 0.9);
    disc(g, ix + 50, iy + 12, 1.3, INK);
    disc(g, ix + 4, iy + 6, 1, INK);
    burst(g, ix + 16, iy + 30, 4, 8, 0.3, INK, 0.5);
  }
  g.restore();
}

// Motivational posters as Saul Bass would have cut them.
function poster(g, x, y, w, h, lbl, seed) {
  box(g, x - 1, y - 1, w + 2, h + 2, C.charD);
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  if (lbl === 'SYNERGY') {
    box(g, x, y, w, h, C.mustard);
    g.beginPath();
    g.rect(x, y, w, h);
    tex(g, 'dryL', 0.15);
    disc(g, x + w * 0.38, y + h * 0.36, w * 0.28, C.orange);
    disc(g, x + w * 0.62, y + h * 0.4, w * 0.28, C.turqD);
    g.save();
    g.beginPath();
    g.arc(x + w * 0.38, y + h * 0.36, w * 0.28, 0, TAU);
    g.clip();
    disc(g, x + w * 0.62, y + h * 0.4, w * 0.28, C.char);
    g.restore();
    cutLetters(g, 'SYNERGY', x + w / 2, y + h - 5, 7, C.char, seed, { maxW: w - 4 });
  } else if (lbl === 'TEAMWORK') {
    box(g, x, y, w, h, C.orange);
    g.beginPath();
    g.rect(x, y, w, h);
    tex(g, 'dryL', 0.12);
    // Three cut-paper figures, arms linked.
    const fig = (fx, col, s) => {
      disc(g, fx, y + 10 * s + 3, 3.4 * s, col);
      poly(g, [[fx - 4.5 * s, y + h - 12], [fx - 3 * s, y + 15 * s + 2], [fx + 3 * s, y + 15 * s + 2], [fx + 4.5 * s, y + h - 12]], col);
    };
    fig(x + w * 0.24, C.char, 0.95);
    fig(x + w * 0.76, C.mustard, 0.95);
    fig(x + w * 0.5, C.cream, 1.1);
    line(g, x + w * 0.24, y + 22, x + w * 0.76, y + 22, C.char, 1);
    cutLetters(g, 'TEAMWORK', x + w / 2, y + h - 4, 6.5, C.cream, seed, { maxW: w - 4 });
  } else {
    // HANG IN THERE: a kitten on a branch, turquoise ground.
    box(g, x, y, w, h, C.turq);
    g.beginPath();
    g.rect(x, y, w, h);
    tex(g, 'dryL', 0.14);
    g.beginPath();
    g.moveTo(x - 1, y + 8);
    g.quadraticCurveTo(x + w * 0.5, y + 5, x + w + 1, y + 9);
    g.strokeStyle = C.walnutD;
    g.lineWidth = 2;
    g.stroke();
    poly(g, [[x + w * 0.75, y + 7.5], [x + w * 0.88, y + 2.5], [x + w * 0.84, y + 8.5]], C.olive);
    const kx = x + w * 0.48;
    line(g, kx - 3, y + 8, kx - 2.5, y + 16, C.charD, 1.6);
    line(g, kx + 3, y + 8, kx + 2.5, y + 16, C.charD, 1.6);
    oval(g, kx, y + 21, 5, 7, C.charD);
    disc(g, kx, y + 13.5, 4.2, C.charD);
    poly(g, [[kx - 4, y + 12], [kx - 3.6, y + 8], [kx - 1.4, y + 10.5]], C.charD);
    poly(g, [[kx + 4, y + 12], [kx + 3.6, y + 8], [kx + 1.4, y + 10.5]], C.charD);
    disc(g, kx - 1.5, y + 13.5, 0.8, C.mustardL);
    disc(g, kx + 1.5, y + 13.5, 0.8, C.mustardL);
    g.beginPath();
    g.moveTo(kx + 3, y + 26);
    g.quadraticCurveTo(kx + 9, y + 28, kx + 8, y + 21);
    g.strokeStyle = C.charD;
    g.lineWidth = 1.2;
    g.stroke();
    cutLetters(g, 'HANG IN', x + w / 2, y + h - 8.5, 6, C.cream, seed, { maxW: w - 4 });
    cutLetters(g, 'THERE', x + w / 2, y + h - 2.5, 6, C.cream, seed + 9, { maxW: w - 4 });
  }
  g.restore();
  inkRect(g, x, y, w, h, seed, REG.wall, { a: 0.55 });
}

function whiteboard(g, x, y, w, h, seed) {
  box(g, x - 1.5, y - 1.5, w + 3, h + 3, C.brassD);
  box(g, x, y, w, h, '#ece4cc');
  g.beginPath();
  g.rect(x, y, w, h);
  tex(g, 'dryD', 0.05);
  // Axes, a few bars, a rising arrow, scrawls.
  const ox = x + 10;
  const oy = y + h - 9;
  line(g, ox, y + 7, ox, oy, C.char, 0.7);
  line(g, ox, oy, x + w - 8, oy, C.char, 0.7);
  const bars = [6, 9, 8, 13, 17, 24];
  bars.forEach((bh, k) => box(g, ox + 5 + k * 9, oy - bh, 5, bh, C.oliveL, 0.85));
  g.beginPath();
  const pts = [[ox + 3, oy - 6], [ox + 16, oy - 12], [ox + 26, oy - 9], [ox + 40, oy - 20], [ox + 52, oy - 26], [ox + 66, oy - 38]];
  g.moveTo(pts[0][0], pts[0][1]);
  for (const [px, py] of pts.slice(1)) g.lineTo(px, py);
  g.strokeStyle = C.orange;
  g.lineWidth = 1.3;
  g.lineJoin = 'round';
  g.stroke();
  poly(g, [[ox + 66, oy - 38], [ox + 60, oy - 37], [ox + 65, oy - 32]], C.orange);
  burst(g, ox + 72, oy - 41, 4, 8, 0.2, C.orange, 0.6);
  g.beginPath();
  for (let k = 0; k < 3; k++) {
    const sx = x + w - 30;
    const sy = y + 8 + k * 4;
    g.moveTo(sx, sy);
    for (let j = 1; j < 9; j++) g.lineTo(sx + j * 2.4, sy + (j % 2 ? -1 : 0.6));
  }
  g.strokeStyle = C.charL;
  g.lineWidth = 0.45;
  g.stroke();
  label(g, 'Q3!!', x + 22, y + 13, 6, C.orangeD, { family: '"Marker Felt", "Comic Sans MS", cursive', weight: 400 });
  // The tray and three markers.
  box(g, x + 4, y + h, w - 8, 2.2, C.brassD);
  box(g, x + 14, y + h - 1, 7, 1.4, C.orange);
  box(g, x + 24, y + h - 1, 7, 1.4, C.olive);
  box(g, x + 34, y + h - 1, 7, 1.4, C.char);
  inkRect(g, x - 1.5, y - 1.5, w + 3, h + 3, seed, REG.wall, { a: 0.55 });
}

function door(g, F, x, y, w, h, lbl, seed) {
  const exec = F.id === 'exec';
  box(g, x - 3, y - 3, w + 6, h + 3, exec ? '#3d2416' : C.walnutD);
  box(g, x, y, w, h, exec ? '#7a4a2c' : C.walnut);
  g.beginPath();
  g.rect(x, y, w, h);
  tex(g, 'grain', 0.55);
  if (exec) {
    // Two tall raised panels, book-matched.
    for (const px of [x + 4, x + w / 2 + 1]) {
      box(g, px, y + 6, w / 2 - 5, h - 14, '#86552f');
      g.beginPath();
      g.rect(px, y + 6, w / 2 - 5, h - 14);
      tex(g, 'grain', 0.5, px, 0);
      box(g, px, y + 6, 0.8, h - 14, C.walnutL, 0.6);
    }
    rr(g, x + w / 2 - 10, y + 26, 20, 8, 1);
    fill(g, C.brass);
    label(g, lbl, x + w / 2, y + 32.4, 6.4, C.charD, { family: DID, weight: 700, ls: 1 });
    box(g, x + w - 8, y + h * 0.55, 5, 1.6, C.brassL);
  } else {
    // A slim frosted light, a cream name plate, a brass knob; the IN USE lamp above.
    box(g, x + w / 2 - 3, y + 8, 6, 26, '#e7dcbc', 0.85);
    rr(g, x + 4, y + 38, w - 8, 11, 1);
    fill(g, C.cream);
    label(g, 'MEETING', x + w / 2, y + 43, 4.6, C.char, { maxW: w - 10 });
    label(g, '4B', x + w / 2, y + 48, 4.6, C.orangeD);
    disc(g, x + w - 6, y + h * 0.58, 1.6, C.brass);
    const ly = y - 11;
    disc(g, x + w / 2, ly + 3, 9, '#ff6a40', 0.12);
    rr(g, x + w / 2 - 8, ly, 16, 6, 1);
    fill(g, '#cf4a30');
    label(g, 'IN USE', x + w / 2, ly + 4.6, 4, '#ffe9c6', { maxW: 14 });
  }
  inkRect(g, x - 3, y - 3, w + 6, h + 3, seed, REG.wall, { a: 0.6, gapP: 0.2 });
}

function extinguisher(g, x, y, w, h, seed) {
  box(g, x - 1.5, y + 3, w + 3, 2, C.char);
  rr(g, x, y + 2, w, h - 2, 3);
  fill(g, '#a8402e');
  box(g, x + 1.5, y + 4, 1.2, h - 6, '#d87a5a', 0.6);
  box(g, x + 1.5, y - 1, w - 3, 3, C.char);
  g.beginPath();
  g.moveTo(x + w - 1, y);
  g.quadraticCurveTo(x + w + 3, y + 4, x + w + 1, y + 10);
  g.strokeStyle = C.charD;
  g.lineWidth = 0.9;
  g.stroke();
  inkRect(g, x, y + 2, w, h - 2, seed, REG.wall, { a: 0.6 });
}

// Don K. Eggshell PhD, founder, as he is now: the silver professor. A wild mane standing
// up and out strand by strand in three greys, an egg-on-end head, fine rectangular specs
// with pale-blue lenses, thick angry brows, a big drooping silver moustache over a white
// stubble chin and a flat frown; a pointed white collar and a black high-collared cape
// lined in red, stood up behind him like a Dracula collar. His geometry is the shipped
// drawing's (src/sprites/props.js, the professor), laid out on his own box and cropped
// to head and shoulders; the hand is this card's: flat fields, dry-brush in the hair and
// the cape, a thin ink line printed a step out of register. Turquoise ground, a mustard
// halo with atomic rays, a brass frame and a picture light.
const PRO = {
  skin: '#eec9a8', skinDk: '#e0b68e', stubble: '#c9ab93', chin: 'rgba(236,238,244,0.7)',
  tones: [['#dfe2ea', '#c6cbd9'], ['#cdd3e0', '#b1b9ca'], ['#bcc3d2', '#a0a8bb']],
  stache: '#cdd3e0', lens: '#c8e0f8', rim: '#3d3d48', cape: '#23232e', capeIn: '#b8202a', shirt: '#eceef4',
  mane: {
    back: [[-158, 0.85, 15, 14], [-172, 0.7, 13, 18], [166, 0.62, 14, 26], [148, 0.5, 15, 30],
      [-26, 0.8, 14, -16], [-8, 0.72, 13, -20], [12, 0.6, 14, -26], [32, 0.48, 15, -30]],
    front: [[-128, 1.05, 19, 22], [-104, 1.18, 18, 20], [-80, 1.0, 17, 16], [-58, 0.82, 17, 10],
      [-146, 0.62, 14, 26], [-38, 0.56, 14, 8]],
  },
};

// Stroke a path a step off its fill, broken by a seeded dash: the misregistered line.
function inkPath(g, path, seed, reg, o = {}) {
  const r = rng(seed);
  g.save();
  g.translate(reg[0], reg[1]);
  g.beginPath();
  path(g);
  g.setLineDash(o.dash ?? [14 + r() * 18, 1.5 + r() * 2.5, 6 + r() * 10, 2 + r() * 3]);
  g.lineDashOffset = r() * 20;
  g.strokeStyle = o.col ?? INK;
  g.lineWidth = o.w ?? 0.45;
  g.globalAlpha = o.a ?? 0.6;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.stroke();
  g.restore();
}

function professor(g, cx, oy, seed) {
  const BW = 72;
  const BH = 60;
  // The collar wings tucked a touch inside his box, so the portrait's crop keeps their points.
  const WX = (sd, f) => X(0.5 + sd * f * 0.9);
  const X = (f) => cx + (f - 0.5) * BW;
  const Y = (f) => oy + f * BH;
  const reg = [0.7, -0.55];
  const shape = (fn, col, a = 1) => {
    g.beginPath();
    fn(g);
    fill(g, col, a);
  };
  // The cape: red-lined collar wings standing up behind the head, then the black.
  for (const sd of [-1, 1]) {
    shape((k) => {
      k.moveTo(WX(sd, 0.08), Y(0.6));
      k.quadraticCurveTo(WX(sd, 0.42), Y(0.5), WX(sd, 0.36), Y(0.2));
      k.quadraticCurveTo(WX(sd, 0.3), Y(0.36), WX(sd, 0.14), Y(0.42));
      k.closePath();
    }, PRO.capeIn);
    // A flat darker fold down the lining.
    shape((k) => {
      k.moveTo(WX(sd, 0.14), Y(0.42));
      k.quadraticCurveTo(WX(sd, 0.3), Y(0.36), WX(sd, 0.36), Y(0.2));
      k.quadraticCurveTo(WX(sd, 0.31), Y(0.42), WX(sd, 0.17), Y(0.5));
      k.closePath();
    }, '#7e121a', 0.45);
  }
  const capeWing = (sd) => (k) => {
    k.moveTo(WX(sd, 0.16), Y(0.62));
    k.quadraticCurveTo(WX(sd, 0.44), Y(0.52), WX(sd, 0.4), Y(0.24));
    k.lineTo(WX(sd, 0.36), Y(0.2));
    k.quadraticCurveTo(WX(sd, 0.42), Y(0.5), WX(sd, 0.08), Y(0.6));
    k.closePath();
  };
  // The shoulders run on out of the bottom of the picture.
  const capeBody = (k) => {
    k.ellipse(X(0.5), Y(0.6), 0.33 * BW, 0.17 * BH, 0, Math.PI, TAU);
    k.lineTo(X(0.83), Y(1.2));
    k.lineTo(X(0.17), Y(1.2));
    k.closePath();
  };
  for (const sd of [-1, 1]) shape(capeWing(sd), PRO.cape);
  shape(capeBody, PRO.cape);
  g.beginPath();
  capeBody(g);
  tex(g, 'dryL', 0.1);
  // A flat sheen down one shoulder.
  shape((k) => k.ellipse(X(0.33), Y(0.5), 0.09 * BW, 0.03 * BH, -0.35, 0, TAU), '#4a4a5e', 0.35);
  for (const sd of [-1, 1]) {
    shape((k) => {
      k.moveTo(X(0.5 + sd * 0.05), Y(0.46));
      k.lineTo(X(0.5 + sd * 0.21), Y(0.5));
      k.lineTo(X(0.5 + sd * 0.13), Y(0.62));
      k.closePath();
    }, PRO.shirt);
    inkPath(g, capeWing(sd), seed + sd * 3, reg, { a: 0.5 });
  }

  // Everything above the shoulders is scaled and lifted as one, as in the shipped drawing.
  g.save();
  g.translate(X(0.5), Y(0.52 - 0.075));
  g.scale(0.88, 0.88);
  g.translate(-X(0.5), -Y(0.52));
  const scx = X(0.5);
  const scy = Y(0.35);
  const srx = 0.165 * BW;
  const sry = 0.2 * BH;
  const px = (d, k = 1) => scx + Math.cos((d * Math.PI) / 180) * srx * k;
  const py = (d, k = 1) => scy + Math.sin((d * Math.PI) / 180) * sry * k;
  const lockPath = ([deg, len, spread, curl]) => (k) => {
    const tip = deg + curl;
    k.moveTo(px(deg - spread, 0.86), py(deg - spread, 0.86));
    k.quadraticCurveTo(px(deg - spread * 0.5, 1 + len * 0.55), py(deg - spread * 0.5, 1 + len * 0.55), px(tip, 1 + len), py(tip, 1 + len));
    k.quadraticCurveTo(px(deg + spread * 1.15, 1 + len * 0.3), py(deg + spread * 1.15, 1 + len * 0.3), px(deg + spread, 0.86), py(deg + spread, 0.86));
    k.closePath();
  };
  // The mane, strand by strand: the locks behind the skull in the shaded greys, the
  // front ones in the lit greys, every one with a lighter streak and its own line.
  const lock = (l, i, shaded) => {
    const p = lockPath(l);
    shape(p, PRO.tones[i % 3][shaded ? 1 : 0]);
    g.beginPath();
    p(g);
    tex(g, 'dryD', 0.12);
    const [deg, len] = l;
    const tip = deg + l[3] * 0.6;
    g.beginPath();
    g.moveTo(px(deg, 1.05), py(deg, 1.05));
    g.quadraticCurveTo(px(deg + l[3] * 0.3, 1 + len * 0.5), py(deg + l[3] * 0.3, 1 + len * 0.5), px(tip, 1 + len * 0.8), py(tip, 1 + len * 0.8));
    g.strokeStyle = shaded ? '#d8dce6' : '#f4f5f9';
    g.lineWidth = 0.5;
    g.globalAlpha = 0.7;
    g.stroke();
    g.globalAlpha = 1;
    inkPath(g, p, seed + i * 7 + (shaded ? 50 : 0), reg, { a: 0.45, w: 0.4 });
  };
  PRO.mane.back.forEach((l, i) => lock(l, i, true));
  PRO.mane.front.forEach((l, i) => lock(l, i + 1, false));
  // Ears, then the egg-on-end head.
  for (const sd of [-1, 1]) {
    shape((k) => k.ellipse(X(0.5 + sd * 0.16), Y(0.378), 0.036 * BW, 0.052 * BH, sd * 0.28, 0, TAU), PRO.skin);
    shape((k) => k.ellipse(X(0.5 + sd * 0.166), Y(0.378), 0.016 * BW, 0.026 * BH, sd * 0.28, 0, TAU), PRO.skinDk);
  }
  const head = (k) => {
    const hcx = X(0.5);
    const hcy = Y(0.375);
    const rx = 0.168 * BW;
    const ry = 0.215 * BH;
    const wy = hcy - ry * 0.16;
    const top = hcy - ry;
    const bot = hcy + ry;
    const hh = 0.56;
    const taper = 0.7;
    k.moveTo(hcx, top);
    k.bezierCurveTo(hcx + rx * hh, top, hcx + rx, wy - (wy - top) * hh, hcx + rx, wy);
    k.bezierCurveTo(hcx + rx, wy + (bot - wy) * hh * 0.92, hcx + rx * taper * 0.9, bot - (bot - wy) * 0.1, hcx, bot);
    k.bezierCurveTo(hcx - rx * taper * 0.9, bot - (bot - wy) * 0.1, hcx - rx, wy + (bot - wy) * hh * 0.92, hcx - rx, wy);
    k.bezierCurveTo(hcx - rx, wy - (wy - top) * hh, hcx - rx * hh, top, hcx, top);
    k.closePath();
  };
  shape(head, PRO.skin);
  g.save();
  g.beginPath();
  head(g);
  g.clip();
  tex(g, 'dryD', 0.05);
  // A flat shadow plane down the far cheek, the period's one concession to modelling.
  shape((k) => k.ellipse(X(0.66), Y(0.4), 0.06 * BW, 0.2 * BH, 0.1, 0, TAU), '#d39a78', 0.35);
  // Stubble on the jaw, and the silver patch under the lip.
  shape((k) => {
    k.moveTo(X(0.295), Y(0.425));
    k.quadraticCurveTo(X(0.5), Y(0.478), X(0.705), Y(0.425));
    k.lineTo(X(0.705), Y(0.72));
    k.lineTo(X(0.295), Y(0.72));
    k.closePath();
  }, PRO.stubble);
  shape((k) => {
    const w2 = 0.075;
    k.moveTo(X(0.5 - w2), Y(0.53));
    k.quadraticCurveTo(X(0.5), Y(0.575), X(0.5 + w2), Y(0.53));
    k.quadraticCurveTo(X(0.5 + w2 * 0.87), Y(0.635), X(0.5), Y(0.665));
    k.quadraticCurveTo(X(0.5 - w2 * 0.87), Y(0.635), X(0.5 - w2), Y(0.53));
    k.closePath();
  }, PRO.chin);
  g.restore();
  inkPath(g, head, seed + 11, reg, { a: 0.55 });
  // The nose: an oblong bulb.
  shape((k) => k.ellipse(X(0.5), Y(0.388), 0.025 * BW, 0.04 * BH, 0, 0, TAU), PRO.skinDk);
  // Thick angry brows: the inner ends pulled down.
  const hwS = 0.067 * BW;
  const off = (0.067 + 0.005) * BW;
  const bw = 0.05 * BW;
  const bh = 0.03 * BH;
  const by = Y(0.25);
  for (const sd of [-1, 1]) {
    g.save();
    g.translate(X(0.5) + sd * off, by);
    g.scale(sd, 1);
    const drop = bh * 1.1;
    const brow = (k) => {
      k.moveTo(-bw, bh * 0.6 + drop);
      k.quadraticCurveTo(0, -bh * 1.1 + drop * 0.35, bw, bh * 0.2);
      k.quadraticCurveTo(0, bh * 1.4, -bw, bh * 1.6 + drop);
      k.closePath();
    };
    shape(brow, PRO.tones[0][0]);
    inkPath(g, brow, seed + 21 + sd, [reg[0] * sd, reg[1]], { a: 0.5, w: 0.4 });
    g.restore();
  }
  // The specs: wide shallow lenses tapered underneath, a heavy bar across the top.
  const sy = Y(0.346);
  const hh = 0.036 * BH;
  const top = sy - hh;
  for (const sd of [-1, 1]) {
    const lx = X(0.5) + sd * off;
    line(g, lx + sd * hwS, top + 0.5, X(0.5) + sd * 0.166 * BW, sy - 0.006 * BH, PRO.rim, 0.5, 0.8);
    g.save();
    g.translate(lx, sy);
    g.scale(sd, 1);
    const W2 = hwS * 2;
    const bo = hwS - 0.07 * W2;
    const bi = -hwS + 0.12 * W2;
    g.beginPath();
    g.moveTo(-hwS, -hh);
    g.lineTo(hwS, -hh);
    g.lineTo(bo + (hwS - bo) * 0.25, hh * 0.5);
    g.quadraticCurveTo(bo, hh, bo - hh * 0.6, hh);
    g.lineTo(bi + hh * 0.6, hh);
    g.quadraticCurveTo(bi, hh, bi - (bi + hwS) * 0.25, hh * 0.5);
    g.closePath();
    fill(g, PRO.lens);
    g.strokeStyle = PRO.rim;
    g.lineWidth = 0.55;
    g.stroke();
    g.restore();
    disc(g, lx - sd * 0.004 * BW, sy + 0.004 * BH, 0.017 * BW, '#1a1028');
    disc(g, lx - sd * 0.004 * BW - 0.6, sy - 0.6, 0.3, '#ffffff', 0.8);
  }
  box(g, X(0.5) - off - hwS - 0.1, top - 0.1, (off + hwS) * 2 + 0.2, 1, PRO.rim);
  // The moustache: a big drooping silver walrus over a flat frown.
  const mcy = Y(0.458);
  const span = 0.124 * BW;
  const drp = 0.042 * BH;
  for (const s of [-1, 1]) {
    const lobe = (k) => {
      k.moveTo(X(0.5), mcy - drp * 0.3);
      k.quadraticCurveTo(X(0.5) + s * span * 0.45, mcy - drp * 0.95, X(0.5) + s * span, mcy - drp * 0.35 + drp * 0.5);
      k.quadraticCurveTo(X(0.5) + s * span * 0.82, mcy + drp * 0.7, X(0.5) + s * span * 0.42, mcy + drp * 0.7);
      k.quadraticCurveTo(X(0.5) + s * span * 0.16, mcy + drp * 0.85, X(0.5), mcy + drp * 0.55);
      k.closePath();
    };
    shape(lobe, PRO.stache);
    g.beginPath();
    g.moveTo(X(0.5) + s * span * 0.2, mcy - drp * 0.2);
    g.quadraticCurveTo(X(0.5) + s * span * 0.55, mcy - drp * 0.45, X(0.5) + s * span * 0.85, mcy + drp * 0.1);
    g.strokeStyle = '#eef0f5';
    g.lineWidth = 0.5;
    g.globalAlpha = 0.8;
    g.stroke();
    g.globalAlpha = 1;
    inkPath(g, lobe, seed + 31 + s, reg, { a: 0.5, w: 0.4 });
  }
  const my = 0.458 + 0.038 * 0.85 + 0.014 + 0.008;
  g.beginPath();
  g.moveTo(X(0.46), Y(my));
  g.quadraticCurveTo(X(0.5), Y(my - 0.012), X(0.545), Y(my));
  g.strokeStyle = 'rgba(26,16,40,0.8)';
  g.lineWidth = 0.6;
  g.lineCap = 'round';
  g.stroke();
  g.restore();
}

function portrait(g, x, y, w, h, lbl, seed) {
  // The picture light's flat fan of cream over the frame.
  poly(g, [[x + w * 0.3, y - 5], [x + w * 0.7, y - 5], [x + w + 8, y + h * 0.8], [x - 8, y + h * 0.8]], '#fff0c0', 0.1);
  box(g, x, y, w, h, C.brass);
  g.beginPath();
  g.rect(x, y, w, h);
  tex(g, 'dryD', 0.12);
  box(g, x, y, w, 0.9, C.brassL);
  box(g, x + 1.6, y + 1.6, w - 3.2, h - 3.2, C.brassD, 0.6);
  box(g, x + 2.4, y + 2.4, w - 4.8, h - 4.8, C.brass);
  const ix = x + 4;
  const iy = y + 4;
  const iw = w - 8;
  const ih = h - 14;
  const cx = ix + iw / 2;
  g.save();
  g.beginPath();
  g.rect(ix, iy, iw, ih);
  g.clip();
  // Ground: deep turquoise, an atomic mustard halo with rays behind the head.
  box(g, ix, iy, iw, ih, '#2c5b57');
  g.beginPath();
  g.rect(ix, iy, iw, ih);
  tex(g, 'dryL', 0.12);
  const hy = iy + 23;
  burst(g, cx, hy, 30, 24, 0.07, '#c99a3a', 1.1, 0.55, false);
  disc(g, cx + 1.5, hy + 1, 17, C.mustard);
  disc(g, cx + 1.5, hy + 1, 17, '#ffffff', 0.06);
  professor(g, cx, iy + 6.5, seed);
  g.restore();
  // The brass plate.
  rr(g, x + 9, y + h - 9, w - 18, 6.4, 1);
  fill(g, C.brassL);
  label(g, lbl, x + w / 2, y + h - 4.1, 4.6, C.charD, { family: COP, weight: 700, ls: 0.6 });
  // The picture light itself.
  rr(g, x + w * 0.3, y - 6, w * 0.4, 2.6, 1.2);
  fill(g, C.brass);
  line(g, x + w / 2, y - 3.4, x + w / 2, y + 0.5, C.brassD, 0.8);
  inkRect(g, x, y, w, h, seed, REG.wall, { a: 0.65 });
}

function trophyCase(g, x, y, w, h, seed) {
  box(g, x, y, w, h, C.walnutD);
  g.beginPath();
  g.rect(x, y, w, h);
  tex(g, 'grain', 0.5);
  const gx = x + 4;
  const gy = y + 4;
  const gw = w - 8;
  const gh = 70;
  box(g, gx, gy, gw, gh, '#e9cf8e');
  box(g, gx, gy, gw, 8, '#f6e2a8', 0.8);
  const shelves = [gy + 23, gy + 46, gy + gh];
  for (const sy of shelves) box(g, gx, sy - 1.2, gw, 1.6, '#b48a52');
  // Cups, plaques, and a gilded egg on a plinth.
  const cup = (cx, by, s) => {
    poly(g, [[cx - 4 * s, by - 13 * s], [cx + 4 * s, by - 13 * s], [cx + 2.5 * s, by - 7 * s], [cx - 2.5 * s, by - 7 * s]], C.brass);
    g.beginPath();
    g.arc(cx - 4 * s, by - 11 * s, 2 * s, Math.PI * 0.5, Math.PI * 1.5);
    g.arc(cx + 4 * s, by - 11 * s, 2 * s, Math.PI * 1.5, Math.PI * 0.5);
    g.strokeStyle = C.brassD;
    g.lineWidth = 0.6;
    g.stroke();
    box(g, cx - 0.6 * s, by - 7 * s, 1.2 * s, 4 * s, C.brassD);
    box(g, cx - 3 * s, by - 3 * s, 6 * s, 3 * s, C.walnut);
    box(g, cx - 3 * s, by - 13 * s, 1.2 * s, 5 * s, C.brassL, 0.8);
  };
  const plaque = (px, by) => {
    box(g, px, by - 12, 9, 11, C.walnut);
    box(g, px + 2, by - 10, 5, 4, C.brass);
    box(g, px + 2, by - 5, 5, 0.6, C.brassD);
  };
  cup(gx + 9, shelves[0] - 1, 1);
  plaque(gx + 19, shelves[0] - 1);
  cup(gx + 37, shelves[0] - 1, 1.2);
  cup(gx + 50, shelves[0] - 1, 0.8);
  plaque(gx + 4, shelves[1] - 1);
  oval(g, gx + 28, shelves[1] - 11, 4, 5.5, C.brassL);
  box(g, gx + 25, shelves[1] - 6, 6, 5, C.charL);
  cup(gx + 45, shelves[1] - 1, 1.1);
  cup(gx + 12, shelves[2] - 1, 1.3);
  plaque(gx + 26, shelves[2] - 1);
  plaque(gx + 38, shelves[2] - 1);
  // Glass: a centre stile and two flat reflections.
  box(g, x + w / 2 - 0.6, gy, 1.2, gh, C.walnutD);
  poly(g, [[gx + 6, gy], [gx + 12, gy], [gx + 2, gy + gh], [gx - 4, gy + gh]], '#ffffff', 0.15);
  poly(g, [[gx + 38, gy], [gx + 41, gy], [gx + 31, gy + gh], [gx + 28, gy + gh]], '#ffffff', 0.12);
  // The closed cupboard below, plain walnut so the lane band stays calm.
  box(g, gx, gy + gh + 4, gw / 2 - 1, h - gh - 14, C.walnut);
  box(g, gx + gw / 2 + 1, gy + gh + 4, gw / 2 - 1, h - gh - 14, C.walnut);
  disc(g, x + w / 2 - 3, gy + gh + 16, 0.9, C.brass);
  disc(g, x + w / 2 + 3, gy + gh + 16, 0.9, C.brass);
  inkRect(g, x, y, w, h, seed, REG.wall, { a: 0.6 });
  inkRect(g, gx, gy, gw, gh, seed + 1, REG.wall, { a: 0.5, gapP: 0.3 });
}

function bookshelf(g, x, y, w, h, seed) {
  box(g, x, y, w, h, C.walnutD);
  g.beginPath();
  g.rect(x, y, w, h);
  tex(g, 'grain', 0.5);
  const r = rng(seed);
  const spines = [C.orange, C.olive, C.mustard, C.char, C.cream, C.oxblood, C.turqD, C.walnutL, C.oliveL];
  const shelfH = 22;
  const nShelves = 4;
  for (let s = 0; s < nShelves; s++) {
    const sy = y + 4 + s * shelfH;
    const by = sy + shelfH - 2;
    box(g, x + 3, sy, w - 6, shelfH - 2, '#3e2416');
    let bx = x + 4;
    while (bx < x + w - 6) {
      const pick = r();
      if (pick < 0.08 && bx < x + w - 18) {
        // An ornament: a brass starburst, a Harper bird, a little globe.
        const ok = Math.floor(r() * 3);
        if (ok === 0) burst(g, bx + 5, by - 8, 5, 12, r(), C.brass, 0.6);
        else if (ok === 1) {
          oval(g, bx + 5, by - 4, 4.5, 3, C.turq);
          poly(g, [[bx + 9, by - 6], [bx + 12, by - 5], [bx + 9, by - 4.5]], C.mustard);
          disc(g, bx + 7.5, by - 5.2, 0.5, INK);
          poly(g, [[bx + 1, by - 5], [bx - 2, by - 8], [bx + 2, by - 3]], C.turqD);
        } else {
          disc(g, bx + 5, by - 6, 4, C.mustardL);
          box(g, bx + 4.5, by - 2, 1, 2, C.brassD);
        }
        bx += 12;
        continue;
      }
      const bw = 2 + r() * 2.6;
      const bh = 11 + r() * 7;
      const col = spines[Math.floor(r() * spines.length)];
      if (r() < 0.07) {
        // A leaning book.
        g.save();
        g.translate(bx, by);
        g.rotate(0.25);
        box(g, 0, -bh, bw, bh, col);
        g.restore();
        bx += bw + 3;
        continue;
      }
      box(g, bx, by - bh, bw, bh, col);
      box(g, bx, by - bh + 2, bw, 0.6, C.brassL, 0.6);
      box(g, bx, by - 3, bw, 0.6, C.brassL, 0.4);
      bx += bw + 0.25;
    }
    box(g, x + 2, sy + shelfH - 2, w - 4, 2, C.walnut);
  }
  // A cupboard below, plain, so the lane band stays calm.
  const cy = y + 4 + nShelves * shelfH;
  box(g, x + 3, cy, w / 2 - 4, y + h - cy - 6, C.walnut);
  box(g, x + w / 2 + 1, cy, w / 2 - 4, y + h - cy - 6, C.walnut);
  g.beginPath();
  g.rect(x + 3, cy, w - 6, y + h - cy - 6);
  tex(g, 'grain', 0.4);
  disc(g, x + w / 2 - 3, cy + 12, 0.9, C.brass);
  disc(g, x + w / 2 + 3, cy + 12, 0.9, C.brass);
  inkRect(g, x, y, w, h, seed, REG.wall, { a: 0.6 });
}

// ------------------------------------------------------------ hangs (live)
function liftLive(ctx, F, hg, t) {
  const { x, y, w, h, open, i } = hg;
  const gap = (open * w) / 2;
  const leaf = F.id === 'open' ? '#b89150' : '#c39b50';
  const lw = w / 2 - gap;
  // Each leaf carries half the company egg, so when the doors open the egg cracks.
  for (const side of [0, 1]) {
    const lx = side === 0 ? x : x + w / 2 + gap;
    if (lw <= 0.05) continue;
    box(ctx, lx, y, lw, h, leaf);
    ctx.beginPath();
    ctx.rect(lx, y, lw, h);
    tex(ctx, 'dryV', 0.18, side === 0 ? x - gap : x + gap, y, 0.5);
    box(ctx, side === 0 ? lx : lx + lw - 1.2, y, 1.2, h, C.brassD, 0.6);
    box(ctx, side === 0 ? lx + lw - 0.7 : lx, y, 0.7, h, C.brassL, 0.5);
    ctx.save();
    ctx.beginPath();
    ctx.rect(lx, y, lw, h);
    ctx.clip();
    const ex = side === 0 ? x + w / 2 - gap : x + w / 2 + gap;
    const ey = y + h * 0.42;
    const sgn = side === 0 ? -1 : 1;
    const pts = [];
    for (let k = 0; k <= 10; k++) {
      const a = -Math.PI / 2 + (k / 10) * Math.PI;
      const ry = Math.sin(a) < 0 ? 9.5 : 7.5;
      pts.push([ex + sgn * Math.cos(a) * 6.5, ey + Math.sin(a) * ry]);
    }
    // Back up the crack, a zigzag on the meeting edge.
    for (let k = 5; k >= 1; k--) pts.push([ex + sgn * (k % 2 ? 1.4 : 0), ey - 9.5 + (17 * k) / 6]);
    polyPath(ctx, pts);
    fill(ctx, '#8a6a33', 0.9);
    ctx.strokeStyle = '#ecd08c';
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.8;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  // The dial's needle swings home as the car arrives, and the up lantern lights.
  const cx = x + w / 2;
  const cy = y - 9;
  const rest = (hash(i * 3.7 + 1) - 0.5) * 2.6;
  const a = (1 - Math.min(1, open * 1.4)) * rest;
  line(ctx, cx, cy, cx + Math.sin(a) * 6, cy - Math.cos(a) * 6, C.orangeD, 0.8);
  disc(ctx, cx, cy, 0.9, C.charD);
  if (open > 0.02) {
    disc(ctx, x + 4.5, cy - 0.5, 4, '#ffd77a', 0.25 * Math.min(1, open * 3));
    poly(ctx, [[x + 2, cy + 1], [x + 4.5, cy - 3], [x + 7, cy + 1]], '#ffd36a');
  }
}

function clockHands(ctx, F, hg, clock) {
  const { cx, cy, r } = hg;
  const lobby = F.id === 'lobby';
  const hand = (a, len, wd, col) => {
    const ex = cx + Math.sin(a) * len;
    const ey = cy - Math.cos(a) * len;
    const px = Math.cos(a) * wd;
    const py = Math.sin(a) * wd;
    ctx.beginPath();
    ctx.moveTo(cx - px - Math.sin(a) * len * 0.12, cy - py + Math.cos(a) * len * 0.12);
    ctx.lineTo(ex, ey);
    ctx.lineTo(cx + px - Math.sin(a) * len * 0.12, cy + py + Math.cos(a) * len * 0.12);
    ctx.closePath();
    fill(ctx, col);
  };
  const hl = lobby ? r * 0.62 : r * 0.34;
  const ml = lobby ? r * 0.92 : r * 0.46;
  hand(clock.hourA, hl, lobby ? 1.1 : 0.8, C.charD);
  hand(clock.minuteA, ml, lobby ? 0.8 : 0.6, C.charD);
  line(ctx, cx, cy, cx + Math.sin(clock.secondA) * ml, cy - Math.cos(clock.secondA) * ml, C.red, 0.4);
  disc(ctx, cx, cy, 0.8, C.charD);
}

function revolvingLive(ctx, F, plan, x, spin) {
  const G = plan.glass;
  const top = G.transom + 2;
  const bot = G.bottom - 3;
  const R = 21;
  const wings = [];
  for (let k = 0; k < 4; k++) {
    const a = (spin + k / 4) * Math.PI;
    wings.push({ c: Math.cos(a), s: Math.sin(a) });
  }
  // Back wings first, paler; then the post; then the front wings.
  const draw = (wg) => {
    const ex = x + wg.c * R;
    const back = wg.s < 0;
    const x0 = Math.min(x, ex);
    const ww = Math.abs(ex - x);
    box(ctx, x0, top + 2, ww, bot - top - 4, '#f6efd8', back ? 0.06 : 0.12);
    box(ctx, ex - 0.8, top + 1, 1.6, bot - top - 2, back ? C.brassD : C.brass, back ? 0.6 : 1);
    box(ctx, x0, top + (bot - top) * 0.55, ww, 1, back ? C.brassD : C.brass, back ? 0.5 : 0.9);
  };
  for (const wg of wings) if (wg.s < 0) draw(wg);
  box(ctx, x - 1, top, 2, bot - top, C.brassD);
  for (const wg of wings) if (wg.s >= 0) draw(wg);
  // The drum's curved front glass edges.
  box(ctx, x - R - 1.2, top, 1.2, bot - top, F.mullion);
  box(ctx, x + R, top, 1.2, bot - top, F.mullion);
}

// ================================================================ LIGHTS + CEILING
function ceiling(ctx, F, f) {
  const cy = f.ceilingY;
  box(ctx, 0, 0, FW, cy, F.ceiling);
  ctx.beginPath();
  ctx.rect(0, 0, FW, cy);
  tex(ctx, 'dryL', 0.1, 0, 0, 0.5);
  // Ceiling joints: slats (exec) or acoustic tiles (open), at the wall's rate on the
  // wall line and a touch faster toward the top of the frame, which is nearer.
  const step = F.id === 'exec' ? 12 : F.id === 'open' ? 30 : 0;
  if (step) {
    const shift = f.wall.shift;
    const near = 1 + cy / 200;
    ctx.beginPath();
    for (let u = Math.floor((shift - 60) / step) * step; u - shift < FW + 60; u += step) {
      const xb = u - shift;
      ctx.moveTo(VX + (xb - VX) * near, 0);
      ctx.lineTo(xb, cy);
    }
    if (F.id === 'open') {
      for (const y of [cy * 0.3, cy * 0.62]) {
        ctx.moveTo(0, y);
        ctx.lineTo(FW, y);
      }
    }
    ctx.strokeStyle = F.id === 'exec' ? '#24170e' : '#b8aa86';
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = F.id === 'exec' ? 0.5 : 0.32;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  box(ctx, 0, cy - 1.6, FW, 1.6, F.ceilEdge, 0.9);
  box(ctx, 0, cy, FW, 1, '#000000', 0.12);
}

function light(ctx, F, l, f) {
  const cy = f.ceilingY;
  if (l.variant === 'globe') {
    // A Nelson bubble lamp: a ribbed saucer on a cord, two flat discs of glow.
    line(ctx, l.x, cy, l.x, l.y - 7, C.char, 0.5);
    ctx.globalCompositeOperation = 'screen';
    disc(ctx, l.x, l.y, 18, '#5a4a26', 0.5);
    disc(ctx, l.x, l.y, 12, '#6a5a30', 0.5);
    ctx.globalCompositeOperation = 'source-over';
    oval(ctx, l.x, l.y, 9, 7, '#f7eed4');
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(l.x, l.y, 9, 7, 0, 0, TAU);
    ctx.clip();
    ctx.beginPath();
    for (let k = -3; k <= 3; k++) {
      const yy = l.y + k * 2;
      ctx.moveTo(l.x - 10, yy + 0.6);
      ctx.quadraticCurveTo(l.x, yy - 0.8, l.x + 10, yy + 0.6);
    }
    ctx.strokeStyle = '#d9caa4';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.restore();
    box(ctx, l.x - 1.5, l.y - 7.5, 3, 1.5, C.brass);
    inkLoop(ctx, circlePts(l.x, l.y, 9, 7, 12), l.i * 11 + 3, REG.mid, { a: 0.5, w: 0.5 });
  } else if (l.variant === 'tube') {
    const on = l.on;
    const y = cy - 4.5;
    box(ctx, l.x - 23, y - 0.5, 46, 5, C.charL);
    box(ctx, l.x - 22, y, 44, 4, on > 0.5 ? '#fbf4dc' : '#a39c88');
    if (on > 0.5) {
      poly(ctx, [[l.x - 22, cy], [l.x + 22, cy], [l.x + 32, cy + 18], [l.x - 32, cy + 18]], '#fffbe8', 0.07 * on);
    }
    ctx.beginPath();
    for (let k = -20; k <= 20; k += 4) ctx.rect(l.x + k, y, 0.5, 4);
    fill(ctx, C.charL, 0.5);
  } else {
    // A conical enamel shade, a cream mouth, a flat cone of warm light.
    const y = l.y;
    line(ctx, l.x, cy, l.x, y - 10, C.charD, 0.5);
    ctx.globalCompositeOperation = 'screen';
    poly(ctx, [[l.x - 7, y], [l.x + 7, y], [l.x + 30, y + 92], [l.x - 30, y + 92]], '#4a2c10', 0.55);
    poly(ctx, [[l.x - 6, y], [l.x + 6, y], [l.x + 15, y + 44], [l.x - 15, y + 44]], '#5a3812', 0.5);
    disc(ctx, l.x, y + 1, 13, '#6a4012', 0.55);
    disc(ctx, l.x, y + 1, 7, '#8a5a1c', 0.6);
    ctx.globalCompositeOperation = 'source-over';
    const shade = [[l.x - 2.5, y - 10], [l.x + 2.5, y - 10], [l.x + 9, y], [l.x - 9, y]];
    poly(ctx, shade, C.orange);
    poly(ctx, [[l.x - 2.5, y - 10], [l.x - 0.5, y - 10], [l.x - 5, y], [l.x - 9, y]], C.orangeL, 0.6);
    oval(ctx, l.x, y, 9, 1.8, '#ffe7a8');
    box(ctx, l.x - 2, y - 11.5, 4, 1.8, C.brass);
    ink(ctx, shade, l.i * 7 + 9, REG.mid, { a: 0.6, w: 0.5, gapP: 0.2 });
  }
}

// ================================================================ FLOOR
// The floor plane in perspective: a point at lane-u and screen y sits at
// x = VX + (u - shiftBottom - VX) * p(y), p running 0.24 at the wall's foot to 1 at the
// lane, so a mark moves at the wall's rate up there and the lane's rate down here.
const VX = 240;
const pOf = (y) => 0.24 + (0.76 * (y - WALL_BASE)) / (LANE_TOP - WALL_BASE);
const fx = (u, y, S) => VX + (u - S - VX) * pOf(y);

// Courses (rows of planks, tiles, inlay), widening toward the viewer.
const COURSES = [204, 205.6, 207.5, 209.8, 212.6, 216, 220.2, 225.5, 232];

function seededList(n, seed, fn) {
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < n; i++) out.push(fn(r, i));
  return out;
}

// Terrazzo chips in lane-u, kept thinner toward the back so the screen density is even.
const FLECKS = {
  lobby: seededList(1400, 71, (r) => {
    const y = WALL_BASE + 0.5 + r() * 27;
    return { u: r() * 480, y, c: Math.floor(r() * 5), s: 0.35 + r() * 0.55, keep: r() < pOf(y) };
  }).filter((p) => p.keep),
  open: seededList(900, 73, (r) => {
    const y = WALL_BASE + 0.5 + r() * 27;
    return { u: r() * 480, y, c: Math.floor(r() * 3), s: 0.3 + r() * 0.4, keep: r() < pOf(y) };
  }).filter((p) => p.keep),
};

function floorPlane(ctx, F, f) {
  const P = f.floorPlane;
  const S = P.shiftBottom;
  const top = P.top;
  const bot = P.bottom;
  box(ctx, 0, top, FW, bot - top, F.floor);
  if (F.id === 'lobby') lobbyFloor(ctx, F, f, S);
  else if (F.id === 'open') carpet(ctx, F, f, S);
  else parquet(ctx, F, f, S);
  // Contact shadow at the wall's foot.
  box(ctx, 0, top, FW, 1.6, '#1e140c', 0.18);
  box(ctx, 0, top + 1.6, FW, 1.6, '#1e140c', 0.07);
}

function flecks(ctx, list, inks, S, alpha) {
  const PF = 480;
  const paths = inks.map(() => new Path2D());
  for (const p of list) {
    const k = pOf(p.y);
    const lo = S + VX - VX / k;
    const hi = S + VX + (FW - VX) / k;
    const n0 = Math.ceil((lo - p.u) / PF);
    const n1 = Math.floor((hi - p.u) / PF);
    const sz = p.s * (0.45 + 0.55 * k);
    for (let n = n0; n <= n1; n++) {
      const x = VX + (p.u + n * PF - S - VX) * k;
      paths[p.c].rect(x, p.y, sz * 1.4, sz * 0.8);
    }
  }
  ctx.globalAlpha = alpha;
  paths.forEach((pp, i) => {
    ctx.fillStyle = inks[i];
    ctx.fill(pp);
  });
  ctx.globalAlpha = 1;
}

function shearedJoints(ctx, S, step, off, y0, y1, col, w, a) {
  // Joints u = off + m*step, from y0 to y1, every one that crosses the frame.
  const k0 = pOf(y0);
  const k1 = pOf(y1);
  const lo = Math.min(S + VX - VX / k0, S + VX - VX / k1);
  const hi = Math.max(S + VX + (FW - VX) / k0, S + VX + (FW - VX) / k1);
  ctx.beginPath();
  for (let u = Math.floor((lo - off) / step) * step + off; u <= hi; u += step) {
    ctx.moveTo(fx(u, y0, S), y0);
    ctx.lineTo(fx(u, y1, S), y1);
  }
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.globalAlpha = a;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function lobbyFloor(ctx, F, f, S) {
  // Polished terrazzo: a faint lighter band where it shines, chips, brass inlay strips.
  box(ctx, 0, 212, FW, 9, '#efe4c8', 0.35);
  flecks(ctx, FLECKS.lobby, F.fleck, S, 0.75);
  // The columns stand in it: soft dark reflections straight down at the wall's rate.
  for (const c of f.wall.columns) {
    box(ctx, c.x, WALL_BASE, c.w, 10, F.column, 0.16);
    box(ctx, c.x, WALL_BASE + 10, c.w, 8, F.column, 0.07);
  }
  // Morning sun through the glass front, laid on the floor as flat wedges.
  for (const b of f.wall.bays) {
    if (b.type !== 'glass') continue;
    const u0 = S + VX + (b.x0 + 8 - VX) / 0.24;
    const u1 = S + VX + (b.x1 - 8 - VX) / 0.24;
    const sl = 90;
    poly(ctx, [[fx(u0, WALL_BASE, S), WALL_BASE + 0.5], [fx(u1, WALL_BASE, S), WALL_BASE + 0.5], [fx(u1 + sl, LANE_TOP, S), LANE_TOP], [fx(u0 + sl, LANE_TOP, S), LANE_TOP]], '#fff6dc', 0.16);
  }
  // Brass divider strips.
  for (const y of [209.8, 220.2]) box(ctx, 0, y, FW, 0.6, F.nosing, 0.55);
  shearedJoints(ctx, S, 120, 30, WALL_BASE, LANE_TOP, F.nosing, 0.55, 0.5);
  // A compass star inlaid in brass every so often.
  const PS = 960;
  for (let n = Math.floor((S - 2200) / PS); n * PS < S + 2400; n++) {
    const u = n * PS + 400;
    const cy = 218;
    const x = fx(u, cy, S);
    if (x < -60 || x > FW + 60) continue;
    const pts = [];
    for (let j = 0; j < 16; j++) {
      const a = (j / 16) * TAU;
      const rr2 = j % 2 ? 6 : 18;
      const uu = u + Math.cos(a) * rr2;
      const yy = cy + Math.sin(a) * rr2 * 0.22;
      pts.push([fx(uu, yy, S), yy]);
    }
    poly(ctx, pts, F.nosing, 0.4);
  }
}

function carpet(ctx, F, f, S) {
  // Carpet tiles laid quarter-turned: alternate tiles a hair darker.
  const step = 48;
  const p = new Path2D();
  for (let j = 0; j < COURSES.length - 1; j++) {
    const y0 = COURSES[j];
    const y1 = COURSES[j + 1];
    const k0 = pOf(y0);
    const lo = S + VX - VX / k0;
    const hi = S + VX + (FW - VX) / k0;
    for (let m = Math.floor(lo / step); m * step <= hi; m++) {
      if ((m + j) % 2) continue;
      const ua = m * step;
      const ub = ua + step;
      p.moveTo(fx(ua, y0, S), y0);
      p.lineTo(fx(ub, y0, S), y0);
      p.lineTo(fx(ub, y1, S), y1);
      p.lineTo(fx(ua, y1, S), y1);
      p.closePath();
    }
  }
  ctx.fillStyle = F.floorDk;
  ctx.globalAlpha = 0.8;
  ctx.fill(p);
  ctx.globalAlpha = 1;
  flecks(ctx, FLECKS.open, F.fleck, S, 0.6);
  // The noon light from the ribbon windows, a pale flat wash at the foot of each.
  for (const b of f.wall.bays) {
    if (b.type !== 'glass') continue;
    const u0 = S + VX + (b.x0 - VX) / 0.24;
    const u1 = S + VX + (b.x1 - VX) / 0.24;
    poly(ctx, [[fx(u0, WALL_BASE, S), WALL_BASE], [fx(u1, WALL_BASE, S), WALL_BASE], [fx(u1 + 60, 214, S), 214], [fx(u0 + 60, 214, S), 214]], '#f4ecd2', 0.07);
  }
}

function parquet(ctx, F, f, S) {
  // Planks along the lane, butt joints staggered course to course, three tones.
  const L = 64;
  const tones = F.planks.map(() => new Path2D());
  const joints = new Path2D();
  for (let j = 0; j < COURSES.length - 1; j++) {
    const y0 = COURSES[j];
    const y1 = COURSES[j + 1];
    const off = hash(j * 3.3) * L;
    const k0 = pOf(y0);
    const lo = S + VX - VX / k0;
    const hi = S + VX + (FW - VX) / k0;
    for (let m = Math.floor((lo - off) / L); m * L + off <= hi; m++) {
      const ua = m * L + off;
      const ub = ua + L;
      const t = Math.floor(hash(m * 7.1 + j * 13.7) * 3);
      const pp = tones[t];
      pp.moveTo(fx(ua, y0, S), y0);
      pp.lineTo(fx(ub, y0, S), y0);
      pp.lineTo(fx(ub, y1, S), y1);
      pp.lineTo(fx(ua, y1, S), y1);
      pp.closePath();
      joints.moveTo(fx(ua, y0, S), y0);
      joints.lineTo(fx(ua, y1, S), y1);
    }
    joints.moveTo(0, y0);
    joints.lineTo(FW, y0);
  }
  tones.forEach((pp, i) => {
    ctx.fillStyle = F.planks[i];
    ctx.fill(pp);
  });
  ctx.strokeStyle = '#4a2c18';
  ctx.lineWidth = 0.45;
  ctx.globalAlpha = 0.5;
  ctx.stroke(joints);
  ctx.globalAlpha = 1;
  // The dusk sun, low through the glass: long warm wedges across the boards.
  for (const b of f.wall.bays) {
    if (b.type !== 'glass') continue;
    const u0 = S + VX + (b.x0 + 10 - VX) / 0.24;
    const u1 = S + VX + (b.x1 - 30 - VX) / 0.24;
    const sl = -220;
    poly(ctx, [[fx(u0, WALL_BASE, S), WALL_BASE + 0.3], [fx(u1, WALL_BASE, S), WALL_BASE + 0.3], [fx(u1 + sl, LANE_TOP, S), LANE_TOP], [fx(u0 + sl, LANE_TOP, S), LANE_TOP]], '#f7a650', 0.13);
  }
  // A rug under the boardroom end: a mustard field, a walnut border, a row of orbits.
  const PR = 1440;
  for (let n = Math.floor((S - 2400) / PR); n * PR < S + 2600; n++) {
    const ua = n * PR + 120;
    const ub = ua + 420;
    const ya = 207.5;
    const yb = 227;
    if (fx(ub, yb, S) < -10 && fx(ub, ya, S) < -10) continue;
    if (fx(ua, yb, S) > FW + 10 && fx(ua, ya, S) > FW + 10) continue;
    const q = (u0, u1, y0, y1) => [[fx(u0, y0, S), y0], [fx(u1, y0, S), y0], [fx(u1, y1, S), y1], [fx(u0, y1, S), y1]];
    poly(ctx, q(ua, ub, ya, yb), '#6a3e24', 0.9);
    poly(ctx, q(ua + 10, ub - 10, ya + 1.6, yb - 2.4), '#b58a48', 0.9);
    poly(ctx, q(ua + 18, ub - 18, ya + 3, yb - 4.4), '#a9783c', 0.6);
    for (let m = 0; m < 6; m++) {
      const cu = ua + 50 + m * 64;
      const cy = (ya + yb) / 2;
      const pts = [];
      for (let j = 0; j < 14; j++) {
        const a = (j / 14) * TAU;
        const yy = cy + Math.sin(a) * 4.2;
        pts.push([fx(cu + Math.cos(a) * 16, yy, S), yy]);
      }
      poly(ctx, pts, m % 2 ? '#7d7a3e' : '#c0662e', 0.55);
    }
  }
}

// The floor cut in section, like an architect's elevation: the nosing, the finish (the
// terrazzo, the carpet, the boards) in its own thickness, then the structural slab in a
// deep flat tone with a faint printed motif. It reads as solid floor at a glance.
function slab(ctx, F, f) {
  const S = f.slab;
  const top = S.top;
  const sh = S.shift;
  const fin = F.finish;
  box(ctx, 0, top, FW, FH - top, F.slab);
  ctx.beginPath();
  ctx.rect(0, top + fin.h, FW, FH - top - fin.h);
  tex(ctx, 'dryD', 0.16, -mod(sh, 1280), top, 0.5);
  tex(ctx, 'dryL', 0.05, -mod(sh, 1280), top, 0.5);
  // The finish layer.
  box(ctx, 0, top, FW, fin.h, fin.col);
  ctx.beginPath();
  ctx.rect(0, top, FW, fin.h);
  tex(ctx, fin.tex, fin.texA, -mod(sh, 1280), top, 0.5);
  if (F.id === 'exec') {
    // Board ends: the parquet's joints seen end-on.
    ctx.beginPath();
    for (let u = Math.floor(sh / 16) * 16; u - sh < FW + 16; u += 16) ctx.rect(u - sh, top + 2.5, 0.6, fin.h - 2.5);
    fill(ctx, '#4a2c18', 0.55);
  }
  box(ctx, 0, top + fin.h, FW, 1, '#000000', 0.25);
  // A printed motif along the slab: atomic stars and boomerangs, a step lighter.
  const step = 72;
  const mo = new Path2D();
  const st = new Path2D();
  for (let n = Math.floor((sh - 40) / step); n * step - sh < FW + 40; n++) {
    const x = n * step - sh + 36;
    const y = top + fin.h + (FH - top - fin.h) * 0.5;
    if (n % 2 === 0) {
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU;
        const len = k % 2 ? 3 : 6;
        st.moveTo(x + Math.cos(a) * 1.2, y + Math.sin(a) * 1.2);
        st.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      }
    } else {
      mo.moveTo(x - 7, y + 2);
      mo.quadraticCurveTo(x - 3, y - 4, x, y - 3.2);
      mo.quadraticCurveTo(x + 3, y - 4, x + 7, y + 2);
      mo.quadraticCurveTo(x + 3, y - 1, x, y - 0.6);
      mo.quadraticCurveTo(x - 3, y - 1, x - 7, y + 2);
    }
  }
  ctx.fillStyle = F.motif;
  ctx.globalAlpha = 0.5;
  ctx.fill(mo);
  ctx.strokeStyle = F.motif;
  ctx.lineWidth = 0.8;
  ctx.lineCap = 'round';
  ctx.stroke(st);
  ctx.globalAlpha = 1;
  // The nosing: a lit edge on top, then the shadow under the finish.
  box(ctx, 0, top, FW, 1.8, F.nosing);
  box(ctx, 0, top, FW, 0.6, '#fff4d4', 0.45);
  box(ctx, 0, top + 1.8, FW, 0.8, '#000000', 0.18);
  box(ctx, 0, FH - 8, FW, 8, F.slabDk, 0.45);
}

// ================================================================ MID
function bakeMid(F, plan, k) {
  const P = plan.mid.period;
  const y0 = 120;
  const y1 = MID_BASE + 6;
  const S = bakeStrip(P, y0, y1, k, (g, ua, ub) => {
    for (const it of plan.mid.items) {
      const u0 = it.u;
      const u1 = it.u1 ?? it.u + (it.w || 60);
      copies(P, ua, ub, u0 - 40, u1 + 50, (c) => midStatic(g, F, it, c));
    }
    // The veil: everything in the band behind the lane a step toward the room's tone.
    g.globalCompositeOperation = 'source-atop';
    box(g, ua, y0, ub - ua, y1 - y0, F.veil[0], F.veil[1]);
    g.globalCompositeOperation = 'source-over';
  });
  return S;
}

function shadow(g, x, w, a = 0.18) {
  oval(g, x + w / 2, MID_BASE + 0.5, w / 2 + 3, 2.2, '#1e140c', a);
}

function midStatic(g, F, it, c) {
  const b = MID_BASE;
  const x = it.u + c;
  const seed = it.u * 17 + 3;
  switch (it.kind) {
    case 'plant': plant(g, F, x, b, it.variant, seed); break;
    case 'reception': reception(g, x, b, it.w, seed); break;
    case 'turnstiles': turnstiles(g, x, b, it.w, seed); break;
    case 'sofa': sofa(g, F, x, b, it.w, seed); break;
    case 'sculpture': sculpture(g, x, b, seed); break;
    case 'cubicles': cubicles(g, F, it, c, b, seed); break;
    case 'cooler': cooler(g, x, b, seed); break;
    case 'copier': copier(g, x, b, it.w, seed); break;
    case 'cabinet': cabinet(g, x, b, seed); break;
    case 'boardroom': boardroomChairs(g, it, c, b, seed); break;
    case 'desk': execDesk(g, x, b, it.w, seed); break;
    case 'globe': globe(g, x, b, seed); break;
    case 'tallclock': tallclock(g, x, b, seed); break;
    default: break;
  }
}

function leaf(g, x, y, len, wid, ang, col) {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const tip = [x + ca * len, y + sa * len];
  const nx = -sa * wid;
  const ny = ca * wid;
  g.beginPath();
  g.moveTo(x, y);
  g.quadraticCurveTo(x + ca * len * 0.5 + nx, y + sa * len * 0.5 + ny, tip[0], tip[1]);
  g.quadraticCurveTo(x + ca * len * 0.5 - nx, y + sa * len * 0.5 - ny, x, y);
  fill(g, col);
  return tip;
}

// Pots on brass hairpin legs, foliage in almond leaves, Charley Harper's geometry.
function plant(g, F, x, b, variant, seed) {
  const r = rng(seed);
  const leafCols = ['#6a7536', '#56612b', '#839044'];
  const potCol = F.id === 'exec' ? C.charL : F.id === 'open' ? C.cream : C.char;
  const reg = REG.mid;
  if (variant === 'ficus') {
    shadow(g, x, 30);
    const px = x + 15;
    line(g, px - 6, b, px - 4, b - 9, C.brassD, 0.6);
    line(g, px + 6, b, px + 4, b - 9, C.brassD, 0.6);
    line(g, px, b, px, b - 9, C.brassD, 0.6);
    const pot = [[px - 7.5, b - 21], [px + 7.5, b - 21], [px + 5, b - 9], [px - 5, b - 9]];
    poly(g, pot, potCol);
    box(g, px - 7.5, b - 21, 15, 1.5, '#000', 0.2);
    line(g, px, b - 21, px - 1, b - 36, '#4a3422', 1.2);
    for (let k = 0; k < 26; k++) {
      const a = r() * TAU;
      const rad = r();
      const lx = px + Math.cos(a) * rad * 12;
      const ly = b - 44 + Math.sin(a) * rad * 14;
      leaf(g, lx, ly, 5 + r() * 2, 1.9, -Math.PI / 2 + (r() - 0.5) * 2.4, leafCols[k % 3]);
    }
    ink(g, pot, seed, reg, { a: 0.6 });
  } else if (variant === 'palm') {
    shadow(g, x, 40);
    const px = x + 20;
    const pot = [[px - 6, b - 22], [px + 6, b - 22], [px + 6, b], [px - 6, b]];
    poly(g, pot, potCol);
    box(g, px - 6, b - 16, 12, 2, C.mustardD, 0.8);
    for (let k = 0; k < 7; k++) {
      const ang = -Math.PI / 2 + (k - 3) * 0.42 + (r() - 0.5) * 0.15;
      const len = 26 + r() * 12;
      const pts = [];
      for (let j = 0; j <= 8; j++) {
        const tt = j / 8;
        const droop = tt * tt * 14 * Math.sign(Math.cos(ang) || 0.1);
        pts.push([px + Math.cos(ang) * len * tt + droop * 0.4, b - 24 + Math.sin(ang) * len * tt + tt * tt * 12]);
      }
      g.beginPath();
      for (let j = 1; j < pts.length; j++) {
        const [qx, qy] = pts[j];
        const s = 5 * (1 - j / 9);
        g.moveTo(qx, qy);
        g.lineTo(qx - s * 0.6, qy + s);
        g.moveTo(qx, qy);
        g.lineTo(qx + s * 0.6, qy + s);
      }
      g.strokeStyle = leafCols[k % 3];
      g.lineWidth = 1.5;
      g.lineCap = 'round';
      g.stroke();
      inkLine(g, pts, reg, 0.5, 0.55);
    }
    ink(g, pot, seed, reg, { a: 0.6 });
  } else if (variant === 'snake') {
    shadow(g, x, 16);
    const px = x + 8;
    const pot = [[px - 6, b - 12], [px + 6, b - 12], [px + 5, b], [px - 5, b]];
    poly(g, pot, F.id === 'open' ? C.mustardD : C.walnut);
    for (let k = 0; k < 6; k++) {
      const lx = px - 4.5 + k * 1.8;
      const lh = 16 + r() * 10;
      const lean = (k - 2.5) * 0.9;
      const v = [[lx - 1.2, b - 12], [lx + lean, b - 12 - lh], [lx + 1.4, b - 12]];
      poly(g, v, leafCols[k % 3]);
      line(g, lx + lean * 0.5, b - 12 - lh * 0.5, lx + lean * 0.5 + 0.8, b - 12 - lh * 0.5, C.oliveL, 0.6, 0.6);
    }
    ink(g, pot, seed, reg, { a: 0.6 });
  } else {
    // Bonsai on a walnut stand.
    const px = x + 9;
    box(g, px - 6, b - 18, 12, 18, C.walnutD);
    box(g, px - 7, b - 19, 14, 2, C.walnut);
    rr(g, px - 8, b - 23, 16, 4, 1);
    fill(g, C.oxblood);
    g.beginPath();
    g.moveTo(px, b - 23);
    g.quadraticCurveTo(px - 4, b - 28, px + 1, b - 31);
    g.quadraticCurveTo(px + 5, b - 34, px + 2, b - 37);
    g.strokeStyle = '#4a3422';
    g.lineWidth = 1.5;
    g.stroke();
    oval(g, px - 4, b - 31, 5, 2.4, leafCols[0]);
    oval(g, px + 4, b - 34, 5, 2.2, leafCols[2]);
    oval(g, px, b - 39, 4.5, 2.2, leafCols[1]);
    shadow(g, px - 7, 14);
    inkRect(g, px - 6, b - 18, 12, 18, seed, reg, { a: 0.5 });
  }
}

function reception(g, x, b, w, seed) {
  shadow(g, x, w, 0.2);
  const top = b - 34;
  // The kidney desk: a convex front, a walnut cap, olive slats, brass lettering.
  const front = [];
  for (let k = 0; k <= 12; k++) {
    const t = k / 12;
    front.push([x + t * w, top + 3 + Math.sin(t * Math.PI) * -3]);
  }
  const body = [...front, [x + w, b], [x, b]];
  poly(g, body, C.olive);
  polyPath(g, body);
  tex(g, 'weave', 0.35);
  g.save();
  polyPath(g, body);
  g.clip();
  for (let sx = x + 6; sx < x + w - 4; sx += 7) box(g, sx, top, 2.2, 40, C.oliveD, 0.55);
  g.restore();
  const cap = [];
  for (let k = 0; k <= 12; k++) {
    const t = k / 12;
    cap.push([x - 3 + t * (w + 6), top + 1 + Math.sin(t * Math.PI) * -3.5]);
  }
  for (let k = 12; k >= 0; k--) {
    const t = k / 12;
    cap.push([x - 3 + t * (w + 6), top + 4.5 + Math.sin(t * Math.PI) * -3.5]);
  }
  poly(g, cap, C.walnut);
  box(g, x, b - 3, w, 3, C.walnutD);
  rr(g, x + w / 2 - 22, top + 11, 44, 7, 1);
  fill(g, C.walnutD, 0.9);
  label(g, 'RECEPTION', x + w / 2, top + 16.6, 5, C.brassL, { ls: 1 });
  // On top: a rotary phone, the bell, a little lamp.
  rr(g, x + 14, top - 6, 10, 5, 1.5);
  fill(g, C.char);
  box(g, x + 13, top - 7.5, 12, 2, C.charL);
  disc(g, x + w - 26, top - 3, 2.6, C.brass);
  box(g, x + w - 26.4, top - 6.8, 0.8, 1.6, C.brassD);
  line(g, x + w - 14, top - 1, x + w - 14, top - 10, C.charL, 0.6);
  poly(g, [[x + w - 18, top - 10], [x + w - 10, top - 10], [x + w - 12, top - 14], [x + w - 16, top - 14]], C.mustard);
  ink(g, body, seed, REG.mid, { a: 0.55, gapP: 0.3 });
}

function turnstiles(g, x, b, w, seed) {
  const n = 4;
  for (let k = 0; k < n; k++) {
    const px = x + (k * (w - 8)) / (n - 1);
    shadow(g, px - 1, 10, 0.14);
    if (k < n - 1) {
      // Glass flaps between the posts.
      const fx0 = px + 8;
      const fx1 = x + ((k + 1) * (w - 8)) / (n - 1);
      poly(g, [[fx0, b - 22], [fx0 + 9, b - 20], [fx0 + 9, b - 11], [fx0, b - 12]], C.turqL, 0.25);
      poly(g, [[fx1, b - 22], [fx1 - 9, b - 20], [fx1 - 9, b - 11], [fx1, b - 12]], C.turqL, 0.25);
    }
    const v = rectPts(px, b - 26, 8, 26);
    poly(g, v, C.charL);
    box(g, px, b - 26, 8, 3, C.brass);
    box(g, px + 1.5, b - 20, 1, 14, C.brassL, 0.5);
    disc(g, px + 4, b - 17, 1, C.olive);
    ink(g, v, seed + k, REG.mid, { a: 0.5, gapP: 0.3 });
  }
}

function sofa(g, F, x, b, w, seed) {
  shadow(g, x, w, 0.2);
  const exec = F.id === 'exec';
  const up = exec ? C.oxblood : C.olive;
  const upD = exec ? '#552219' : C.oliveD;
  // Slim tapered legs, a long seat, a low back, box arms; buttons on the leather.
  line(g, x + 5, b, x + 6, b - 5, C.walnutD, 1.1);
  line(g, x + w - 5, b, x + w - 6, b - 5, C.walnutD, 1.1);
  const back = rectPts(x + 2, b - 26, w - 4, 12);
  poly(g, back, upD);
  const seat = rectPts(x, b - 15, w, 10);
  poly(g, seat, up);
  polyPath(g, seat);
  tex(g, exec ? 'dryL' : 'weave', exec ? 0.1 : 0.3);
  box(g, x, b - 26, 5, 21, upD);
  box(g, x + w - 5, b - 26, 5, 21, upD);
  const n = Math.round(w / 24);
  for (let k = 1; k < n; k++) box(g, x + (w * k) / n - 0.4, b - 15, 0.8, 10, upD, 0.8);
  for (let k = 1; k < n; k++) box(g, x + (w * k) / n - 0.4, b - 26, 0.8, 11, '#000', 0.25);
  if (exec) {
    g.beginPath();
    for (let k = 0; k < n * 2; k++) g.rect(x + 8 + k * ((w - 16) / (n * 2 - 1)), b - 21, 0.9, 0.9);
    fill(g, '#2a0f0a', 0.7);
  }
  box(g, x, b - 15, w, 1, '#ffffff', 0.08);
  ink(g, [[x, b - 5], [x, b - 26], [x + w, b - 26], [x + w, b - 5]], seed, REG.mid, { a: 0.5, closed: false, gapP: 0.2 });
}

function sculpture(g, x, b, seed) {
  // The atomic egg: a brass egg in three orbits on a walnut plinth.
  shadow(g, x + 8, 24);
  const px = x + 20;
  box(g, px - 8, b - 24, 16, 24, C.walnutD);
  g.beginPath();
  g.rect(px - 8, b - 24, 16, 24);
  tex(g, 'grain', 0.5);
  box(g, px - 9, b - 25, 18, 2, C.walnut);
  oval(g, px, b - 38, 7, 10, C.brass);
  oval(g, px - 2, b - 41, 2, 4, C.brassL, 0.8, -0.3);
  for (const rot of [0.5, -0.5, Math.PI / 2]) {
    g.beginPath();
    g.ellipse(px, b - 38, 17, 5, rot, 0, TAU);
    g.strokeStyle = C.brassD;
    g.lineWidth = 0.7;
    g.stroke();
  }
  disc(g, px + 15, b - 46, 1.4, C.mustard);
  disc(g, px - 13, b - 32, 1.4, C.olive);
  disc(g, px + 1, b - 22.5 - 33, 1.4, C.mustard);
  ink(g, rectPts(px - 8, b - 24, 16, 24), seed, REG.mid, { a: 0.5 });
  inkLoop(g, circlePts(px, b - 38, 7, 10, 10), seed + 1, REG.mid, { a: 0.55 });
}

// Action Office partitions: fabric panels on walnut caps; empty desks show a lamp.
function cubicles(g, F, it, c, b, seed) {
  const x0 = it.u + c;
  const x1 = it.u1 + c;
  const n = Math.round((x1 - x0) / 40);
  shadow(g, x0, x1 - x0, 0.16);
  for (let d = 0; d < n; d++) {
    const dx = x0 + d * 40;
    const occupied = it.heads.includes(d) || d === it.pop;
    if (!occupied) {
      // An anglepoise bent over an empty desk, and a mug.
      const lx = dx + 12 + hash(seed + d) * 14;
      inkLine(g, [[lx, b - 34], [lx + 4, b - 43], [lx + 9, b - 40]], [0, 0], 0.8, 0.9, C.charL);
      poly(g, [[lx + 8, b - 42], [lx + 12, b - 38.5], [lx + 9.5, b - 37]], C.mustardD);
      disc(g, lx + 10, b - 37, 3, '#fff1c0', 0.18);
      box(g, dx + 30, b - 37.5, 3, 3.5, C.oliveL);
    }
  }
  for (let d = 0; d < n; d++) {
    const dx = x0 + d * 40;
    const col = (d + (it.u % 3)) % 3 === 0 ? '#8a8650' : '#bd9a52';
    const v = rectPts(dx + 0.5, b - 34, 39, 34);
    poly(g, v, col);
    polyPath(g, v);
    tex(g, 'weave', 0.35);
    box(g, dx + 0.5, b - 34, 39, 2.2, C.walnut);
    box(g, dx, b - 34, 1.4, 34, C.charL);
    box(g, dx + 4, b - 3, 32, 3, C.charL, 0.6);
  }
  box(g, x1 - 1, b - 34, 1.4, 34, C.charL);
  ink(g, rectPts(x0, b - 34, x1 - x0, 34), seed, REG.mid, { a: 0.5, gapP: 0.15 });
}

function cooler(g, x, b, seed) {
  shadow(g, x - 2, 18);
  const v = rectPts(x, b - 28, 14, 28);
  poly(g, v, C.cream);
  box(g, x, b - 28, 14, 28, C.bone, 0.5);
  box(g, x, b - 10, 14, 10, C.charL);
  box(g, x + 5, b - 20, 4, 2, C.brass);
  box(g, x + 11, b - 26, 2, 5, C.olive);
  // The bottle, a muted glass blue.
  rr(g, x + 1.5, b - 44, 11, 15, 3);
  fill(g, '#95b0ab', 0.85);
  box(g, x + 5, b - 30, 4, 2.5, '#95b0ab');
  box(g, x + 3, b - 42, 1.4, 10, '#e8f0e8', 0.4);
  ink(g, v, seed, REG.mid, { a: 0.5 });
}

function copier(g, x, b, w, seed) {
  shadow(g, x, w);
  // A Xerox 914 in walnut and mustard: a cabinet, a console, a lid.
  const v = rectPts(x, b - 22, w, 22);
  poly(g, v, C.walnut);
  polyPath(g, v);
  tex(g, 'grain', 0.45);
  box(g, x + 2, b - 18, w - 4, 0.8, C.walnutD);
  box(g, x - 1, b - 28, w + 2, 7, C.mustardD);
  box(g, x - 1, b - 30, w + 2, 2.4, C.charL);
  box(g, x + w - 12, b - 26.5, 9, 3, C.charL);
  disc(g, x + w - 10, b - 25, 0.8, C.orange);
  disc(g, x + w - 6, b - 25, 0.8, C.olive);
  box(g, x + 4, b - 13, 14, 6, C.walnutD, 0.6);
  ink(g, rectPts(x - 1, b - 30, w + 2, 30), seed, REG.mid, { a: 0.5 });
}

function cabinet(g, x, b, seed) {
  shadow(g, x, 20);
  const v = rectPts(x, b - 44, 20, 44);
  poly(g, v, '#7f7c47');
  polyPath(g, v);
  tex(g, 'dryL', 0.12);
  for (let k = 0; k < 4; k++) {
    const dy = b - 44 + 2 + k * 10.5;
    box(g, x + 1.5, dy, 17, 9.5, '#8d8a52');
    box(g, x + 7, dy + 2, 6, 2.2, C.cream, 0.7);
    box(g, x + 7.5, dy + 5.5, 5, 1.2, C.brass);
  }
  ink(g, v, seed, REG.mid, { a: 0.5 });
}

function boardroomChairs(g, it, c, b, seed) {
  const x0 = it.u + c;
  const x1 = it.u1 + c;
  const pitch = (x1 - x0) / it.seats;
  shadow(g, x0, x1 - x0, 0.2);
  // Eames executive chairs: tall tufted backs in black leather.
  for (let s = 0; s < it.seats; s++) {
    const cx = x0 + pitch * (s + 0.5);
    rr(g, cx - 7, b - 46, 14, 30, 4);
    fill(g, '#36231d');
    for (let k = 1; k < 4; k++) box(g, cx - 6, b - 46 + k * 7, 12, 0.7, '#21140f', 0.9);
    box(g, cx - 5.5, b - 44, 1, 26, '#6e4a3a', 0.7);
    box(g, cx - 4, b - 45.5, 8, 0.8, '#8a5e48', 0.6);
    ink(g, rectPts(cx - 7, b - 46, 14, 30), seed + s, REG.mid, { a: 0.4, gapP: 0.3 });
  }
  if (it.easel) {
    // The flip chart: tripod, cream pad, a chart that falls and then rises.
    const ex = x1 + 6;
    line(g, ex + 2, b, ex + 8, b - 52, C.walnut, 1.2);
    line(g, ex + 22, b, ex + 16, b - 52, C.walnut, 1.2);
    line(g, ex + 12, b, ex + 12, b - 48, C.walnutD, 0.9);
    box(g, ex, b - 52, 24, 30, '#d9cba5');
    box(g, ex - 1, b - 53, 26, 2, C.charL);
    const pts = [[ex + 3, b - 46], [ex + 8, b - 42], [ex + 12, b - 30], [ex + 15, b - 34], [ex + 21, b - 47]];
    inkLine(g, pts, [0, 0], 1, 0.9, C.orangeD);
    poly(g, [[ex + 21, b - 47], [ex + 17.6, b - 46.2], [ex + 20.4, b - 43.8]], C.orangeD);
    line(g, ex + 3, b - 26, ex + 21, b - 26, C.charL, 0.5);
    ink(g, rectPts(ex, b - 52, 24, 30), seed + 40, REG.mid, { a: 0.5 });
  }
}

function execDesk(g, x, b, w, seed) {
  shadow(g, x, w, 0.22);
  // The chair behind it, back above the desk top.
  rr(g, x + w * 0.5 - 9, b - 54, 18, 30, 5);
  fill(g, C.oxblood);
  for (let k = 1; k < 4; k++) box(g, x + w * 0.5 - 8, b - 54 + k * 7, 16, 0.7, '#4a1c14', 0.9);
  // The desk: a cantilevered walnut slab over a slatted modesty panel on tapered legs.
  line(g, x + 6, b, x + 8, b - 24, C.walnutD, 1.4);
  line(g, x + w - 6, b, x + w - 8, b - 24, C.walnutD, 1.4);
  const panel = rectPts(x + 10, b - 26, w - 20, 18);
  poly(g, panel, C.walnut);
  polyPath(g, panel);
  tex(g, 'grain', 0.5);
  g.beginPath();
  for (let sx = x + 14; sx < x + w - 12; sx += 6) g.rect(sx, b - 24, 1, 14);
  fill(g, C.walnutD, 0.6);
  const topSlab = rectPts(x, b - 30, w, 4);
  poly(g, topSlab, C.walnutL);
  box(g, x, b - 30, w, 0.8, '#c48a58', 0.8);
  // On it: the banker's lamp, a decanter and a glass, the phone.
  const lx = x + 14;
  disc(g, lx + 2, b - 34, 13, '#ffb050', 0.12);
  line(g, lx, b - 30, lx, b - 38, C.brass, 1);
  poly(g, [[lx - 7, b - 37], [lx + 7, b - 37], [lx + 5, b - 41], [lx - 5, b - 41]], '#55652e');
  box(g, lx - 6, b - 37, 12, 1, '#ffe2a0', 0.9);
  const dx = x + w - 26;
  poly(g, [[dx - 3, b - 30], [dx + 3, b - 30], [dx + 3.5, b - 37], [dx + 1, b - 39], [dx + 1, b - 42], [dx - 1, b - 42], [dx - 1, b - 39], [dx - 3.5, b - 37]], '#c8823a', 0.9);
  disc(g, dx, b - 43, 1.4, C.brassL);
  box(g, dx + 6, b - 34, 3.5, 4, '#d89a50', 0.8);
  rr(g, x + w * 0.62, b - 34, 9, 4, 1.4);
  fill(g, C.charD);
  ink(g, rectPts(x, b - 30, w, 4), seed, REG.mid, { a: 0.55 });
  ink(g, panel, seed + 1, REG.mid, { a: 0.45, gapP: 0.3 });
}

function globe(g, x, b, seed) {
  shadow(g, x - 2, 22);
  const cx = x + 9;
  const cy = b - 24;
  line(g, cx - 7, b, cx - 3, b - 14, C.walnut, 1.2);
  line(g, cx + 7, b, cx + 3, b - 14, C.walnut, 1.2);
  line(g, cx, b, cx, b - 14, C.walnutD, 1.2);
  disc(g, cx, cy, 8, C.mustardL);
  g.save();
  g.beginPath();
  g.arc(cx, cy, 8, 0, TAU);
  g.clip();
  blobPath(g, [[cx - 6, cy - 4], [cx - 2, cy - 6], [cx, cy - 2], [cx - 3, cy + 2], [cx - 6, cy + 1]]);
  fill(g, C.olive);
  blobPath(g, [[cx + 2, cy], [cx + 6, cy - 1], [cx + 7, cy + 4], [cx + 3, cy + 6]]);
  fill(g, C.olive);
  box(g, cx + 3, cy - 8, 6, 16, '#000', 0.12);
  g.restore();
  g.beginPath();
  g.arc(cx, cy, 10, Math.PI * 0.7, Math.PI * 2.3);
  g.strokeStyle = C.brassD;
  g.lineWidth = 1;
  g.stroke();
  inkLoop(g, circlePts(cx, cy, 8, 8, 10), seed, REG.mid, { a: 0.55 });
}

function tallclock(g, x, b, seed) {
  shadow(g, x, 20);
  // A slim tapered walnut tower, a brass sunburst dial, a window for the pendulum.
  const v = [[x + 2, b], [x + 3, b - 56], [x + 1, b - 60], [x + 1, b - 70], [x + 19, b - 70], [x + 19, b - 60], [x + 17, b - 56], [x + 18, b]];
  poly(g, v, C.walnut);
  polyPath(g, v);
  tex(g, 'grain', 0.5);
  const cx = x + 10;
  const cy = b - 63;
  burst(g, cx, cy, 6.5, 16, 0, C.brass, 0.7, 1, false);
  disc(g, cx, cy, 3.4, C.cream);
  line(g, cx, cy, cx + 1.6, cy - 2, C.charD, 0.5);
  line(g, cx, cy, cx - 2.2, cy + 0.4, C.charD, 0.5);
  box(g, x + 6, b - 50, 8, 34, '#2a1a10');
  box(g, x + 6, b - 50, 8, 34, '#f3cf86', 0.15);
  box(g, x + 1, b - 4, 18, 4, C.walnutD);
  ink(g, v, seed, REG.mid, { a: 0.5 });
}

// --------------------------------------------------------------- mid (live)
const HAIR = ['#2a1a10', '#5a3a1e', '#a8562a', '#d8b46a', '#1c1a18', '#6b6058'];
const SUITS = ['#4b4640', '#5d5148', '#3e4148', '#6b5b45'];

// A UPA office worker: an egg head, a hairdo, maybe specs, a collar and tie when up.
function person(ctx, x, y, seed, look, shoulders, o = {}) {
  const skin = C.skin[Math.floor(hash(seed * 1.3) * C.skin.length)];
  const hair = HAIR[Math.floor(hash(seed * 2.7) * HAIR.length)];
  const suit = SUITS[Math.floor(hash(seed * 3.1) * SUITS.length)];
  const style = Math.floor(hash(seed * 4.9) * 5);
  if (shoulders > 0) {
    poly(ctx, [[x - 8, y + 5 + 12], [x - 7, y + 6], [x + 7, y + 6], [x + 8, y + 5 + 12]], o.suit ?? suit);
    poly(ctx, [[x - 2.2, y + 5.5], [x, y + 9], [x + 2.2, y + 5.5]], C.cream);
    poly(ctx, [[x - 0.7, y + 7], [x + 0.7, y + 7], [x + 1, y + 13], [x - 1, y + 13]], hash(seed) < 0.5 ? C.orange : C.olive);
  }
  box(ctx, x - 1.4, y + 2, 2.8, 4.5, skin);
  oval(ctx, x, y - 1, 3.9, 4.8, skin);
  // The nose points where they look; an ear on the other side, a little mouth.
  poly(ctx, [[x + look * 3.2, y - 1.5], [x + look * 5, y + 0.6], [x + look * 3.2, y + 0.9]], skin);
  oval(ctx, x - look * 3.5, y - 0.4, 1.1, 1.6, skin);
  oval(ctx, x - look * 3.5, y - 0.4, 0.5, 0.8, '#000000', 0.18);
  disc(ctx, x + look * 1.8, y - 1.6, 0.55, INK);
  line(ctx, x + look * 1.2, y + 2.1, x + look * 2.6, y + 1.9, '#7a3a28', 0.45);
  // Hair.
  if (style === 0) {
    poly(ctx, [[x - 4.2, y - 1], [x - 3.6, y - 5.4], [x + 3.6, y - 5.8], [x + 4.3, y - 3]], hair);
  } else if (style === 1) {
    box(ctx, x - 4, y - 6.4, 8, 2.8, hair);
    box(ctx, x - look * 4.2 - 0.6, y - 4, 1.4, 3, hair);
  } else if (style === 2) {
    oval(ctx, x, y - 5.5, 4.4, 4.4, hair);
    oval(ctx, x - look * 3, y - 1.5, 2, 3.8, hair);
  } else if (style === 3) {
    oval(ctx, x - look * 0.5, y - 3.6, 4.6, 3.2, hair);
    poly(ctx, [[x - 5, y + 1.6], [x - 4.4, y - 2], [x - 2, y + 0.5]], hair);
    poly(ctx, [[x + 5, y + 1.6], [x + 4.4, y - 2], [x + 2, y + 0.5]], hair);
  } else {
    // A trilby, the hat never comes off.
    box(ctx, x - 5.5, y - 4.8, 11, 1.2, C.charD);
    rr(ctx, x - 3.6, y - 8.4, 7.2, 4, 1.5);
    fill(ctx, C.charL);
    box(ctx, x - 3.6, y - 5.8, 7.2, 1, C.orangeD);
  }
  if (hash(seed * 5.3) < 0.35) {
    ctx.beginPath();
    ctx.arc(x + look * 1.8, y - 1.4, 1.4, 0, TAU);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.45;
    ctx.stroke();
  }
  inkLoop(ctx, circlePts(x, y - 1, 3.9, 4.8, 10), seed * 3 + 1, REG.live, { a: 0.45, w: 0.45 });
}

function cubicleHeads(ctx, m, t) {
  const b = m.base;
  for (const d of m.desks) {
    if (!d.occupied) continue;
    const y = b - 34 - 7 + d.dy - d.pop * 12;
    const hx = d.x + 20 + (hash(d.seed) - 0.5) * 8;
    person(ctx, hx, y, d.seed + 1, d.look, 1);
    // Some of them are smoking at their desks, it being 1961.
    if (d.seed % 3 === 1 && d.pop < 0.05) smoke(ctx, hx + 9, b - 35, t, d.seed);
  }
}

function smoke(ctx, x, y, t, seed) {
  ctx.beginPath();
  for (let k = 0; k < 2; k++) {
    const ph = t * 1.3 + seed + k * 2.1;
    ctx.moveTo(x, y);
    for (let j = 1; j <= 8; j++) {
      const yy = y - j * 2.2;
      ctx.lineTo(x + Math.sin(ph - j * 0.7) * (0.6 + j * 0.25) + k * 0.6, yy);
    }
  }
  ctx.strokeStyle = '#efe6d2';
  ctx.lineWidth = 0.55;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = 0.5;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function receptionist(ctx, m) {
  const x = m.x + m.w * 0.42;
  const y = m.base - 34 - 6 + m.dy;
  // Joan at the front desk: a red beehive, a mustard dress.
  poly(ctx, [[x - 8, y + 18], [x - 7, y + 6], [x + 7, y + 6], [x + 8, y + 18]], C.mustardD);
  box(ctx, x - 1.4, y + 2, 2.8, 4.5, C.skin[3]);
  oval(ctx, x, y - 1, 3.9, 4.8, C.skin[3]);
  oval(ctx, x, y - 6.5, 4.6, 5.2, '#b4452a');
  oval(ctx, x - 3.6, y - 0.5, 1.8, 3.4, '#b4452a');
  oval(ctx, x + 3.6, y - 0.5, 1.8, 3.4, '#b4452a');
  disc(ctx, x + 1.6, y - 1.2, 0.55, INK);
  line(ctx, x + 0.4, y + 1.6, x + 2.4, y + 1.6, C.red, 0.7);
  inkLoop(ctx, circlePts(x, y - 3, 4.6, 7.5, 10), 17, REG.live, { a: 0.45, w: 0.45 });
}

function boardroomLive(ctx, m) {
  const b = m.base;
  // The residents, dozing: heads sink slowly and jerk back up; a z now and then.
  for (const c of m.chairs) {
    if (!c.sitter) continue;
    const y = b - 40 + c.nod * 3.2;
    const look = c.seed % 2 ? 1 : -1;
    ctx.save();
    ctx.translate(c.x, y + 4);
    ctx.rotate(look * c.nod * 0.18);
    ctx.translate(-c.x, -(y + 4));
    person(ctx, c.x, y, c.seed + 5, look, 1);
    ctx.restore();
    if (c.nod > 0.7) {
      const a = (c.nod - 0.7) / 0.15;
      label(ctx, 'z', c.x + 6, y - 7 - a * 3, 5, C.cream, { a: Math.min(1, a) * 0.8, weight: 700 });
    }
  }
  // The table in front of them: a boat-shaped walnut top on two brass pedestals.
  const x0 = m.x0;
  const x1 = m.x1;
  const top = b - 26;
  for (const px of [x0 + (x1 - x0) * 0.22, x0 + (x1 - x0) * 0.78]) {
    poly(ctx, [[px - 3, top + 4], [px + 3, top + 4], [px + 2, b - 3], [px - 2, b - 3]], C.brassD);
    poly(ctx, [[px - 12, b], [px + 12, b], [px + 2, b - 4], [px - 2, b - 4]], C.brass);
  }
  ctx.beginPath();
  ctx.moveTo(x0, top + 1);
  ctx.quadraticCurveTo((x0 + x1) / 2, top - 2.5, x1, top + 1);
  ctx.lineTo(x1 - 2, top + 5);
  ctx.quadraticCurveTo((x0 + x1) / 2, top + 3, x0 + 2, top + 5);
  ctx.closePath();
  fill(ctx, C.walnut);
  box(ctx, x0 + 4, top - 0.4, x1 - x0 - 8, 0.8, '#c48a58', 0.6);
  // Papers and glasses on the table.
  for (const c of m.chairs) {
    box(ctx, c.x - 3, top - 1.2, 6, 1.2, '#cdbf98');
    if (c.seed % 3 === 0) box(ctx, c.x + 5, top - 4, 2, 3.2, '#d89a50', 0.8);
  }
  inkLine(ctx, [[x0, top + 1], [(x0 + x1) / 2, top - 0.8], [x1, top + 1]], REG.mid, 0.6, 0.6);
}

function coolerLive(ctx, it) {
  if (it.bubble < 0) return;
  const y = it.base - 32 - it.bubble * 10;
  disc(ctx, it.x + 7 + Math.sin(it.bubble * 9) * 1.2, y, 1.1 + it.bubble * 0.8, '#eef4ee', 0.85);
  disc(ctx, it.x + 5, y + 3, 0.6, '#eef4ee', 0.6);
}

function copierLive(ctx, it) {
  if (it.scan < 0) return;
  const x = it.x + 2 + it.scan * (it.w - 6);
  const y = it.base - 28.5;
  box(ctx, x - 4, y, 10, 1.2, '#dff4e6', 0.35);
  box(ctx, x, y, 2, 1.4, '#effff4', 0.95);
}

function pendulum(ctx, it) {
  const px = it.x + 10;
  const top = it.base - 50;
  const a = it.swing * 0.22;
  const ex = px + Math.sin(a) * 28;
  const ey = top + Math.cos(a) * 28;
  line(ctx, px, top, ex, ey, C.brassD, 0.6);
  disc(ctx, ex, ey, 2.4, C.brass);
}

// ================================================================ FRONT
function frontPass(ctx, f) {
  for (const it of f.front) {
    if (it.kind === 'pillar') {
      // A walnut-clad column close to camera, in silhouette: a soft stepped edge, a
      // dark core the hero still shows through, a brass reed and collar catching light.
      const { x, w } = it;
      box(ctx, x - 4, 0, w + 8, FH, '#140d09', 0.14);
      box(ctx, x - 1.5, 0, w + 3, FH, '#140d09', 0.2);
      box(ctx, x, 0, w, FH, '#1d130d', 0.42);
      box(ctx, x + w * 0.62, 0, w * 0.38, FH, '#0c0806', 0.18);
      box(ctx, x + w * 0.16, 0, 1.6, FH, '#d9ad5c', 0.22);
      box(ctx, x + w * 0.16 + 3, 0, 0.8, FH, '#d9ad5c', 0.12);
      box(ctx, x - 1.5, 0, w + 3, 9, '#d9ad5c', 0.16);
      box(ctx, x - 1.5, 252, w + 3, FH - 252, '#0c0806', 0.3);
      box(ctx, x - 1.5, 252, w + 3, 1, '#d9ad5c', 0.3);
    } else if (it.kind === 'plant') {
      const x = it.x;
      for (let k = 0; k < 7; k++) {
        const ang = -Math.PI / 2 + (k - 3) * 0.32;
        ctx.save();
        ctx.globalAlpha = 0.72;
        leaf(ctx, x + (k - 3) * 5, FH + 6, 30 + (k % 3) * 6, 6, ang, '#1d2414');
        ctx.restore();
      }
    } else if (it.kind === 'chair') {
      // The back of an Eames shell chair, rising from the bottom edge.
      const x = it.x;
      ctx.beginPath();
      ctx.moveTo(x - 15, FH + 2);
      ctx.bezierCurveTo(x - 17, 258, x - 21, 246, x - 17, 242);
      ctx.quadraticCurveTo(x, 236, x + 17, 242);
      ctx.bezierCurveTo(x + 21, 246, x + 17, 258, x + 15, FH + 2);
      ctx.closePath();
      fill(ctx, '#1a1411', 0.66);
      ctx.beginPath();
      ctx.moveTo(x - 16, 243.5);
      ctx.quadraticCurveTo(x, 237.6, x + 16, 243.5);
      ctx.strokeStyle = '#d9ad5c';
      ctx.lineWidth = 0.8;
      ctx.globalAlpha = 0.25;
      ctx.stroke();
      ctx.globalAlpha = 1;
      oval(ctx, x, 256, 3, 1.6, '#d9ad5c', 0.15);
    } else if (it.kind === 'armchair') {
      // The back of an Eames lounge chair: a plywood shell, two leather cushions.
      const x = it.x;
      rr(ctx, x - 22, 242, 44, 40, 12);
      fill(ctx, '#2a1a10', 0.62);
      rr(ctx, x - 18, 245, 36, 14, 6);
      fill(ctx, '#140c08', 0.5);
      rr(ctx, x - 18, 261, 36, 14, 6);
      fill(ctx, '#140c08', 0.5);
      box(ctx, x - 20, 243, 40, 0.8, '#d9ad5c', 0.2);
    }
  }
}

// ================================================================ PAINT
const BAKES = new Map();
function bakesFor(floorId, k) {
  const key = `${floorId}@${k}`;
  let B = BAKES.get(key);
  if (B) return B;
  const F = FS[floorId];
  const plan = OFFICE_FLOORS[floorId];
  B = {
    sky: bakeSky(F, plan, k),
    far: bakeFar(F, plan, k),
    near: bakeNear(F, plan, k),
    wall: bakeWall(F, plan, k),
    mid: bakeMid(F, plan, k),
  };
  BAKES.set(key, B);
  return B;
}

export const STYLE = {
  id: 'mcm',
  name: 'MID-CENTURY MODERN — Mad Men',
  note: 'The tower as a 1960 title sequence: Saul Bass cut-paper city blocks with North by Northwest window grids, '
    + 'a butter-pale morning, a turquoise noon and a flat-band dusk, seen past walnut slats, travertine and panelling. '
    + 'Nelson ball, sunburst and asterisk clocks, bubble lamps, Knoll sofas, Action Office partitions and Eames chairs, '
    + 'flat fields with dry-brush in them and a thin ink line printed out of register. The founder hangs in brass: '
    + 'the silver professor, mane, specs and Dracula cape; the lift doors split the company egg.',
  paint(ctx, f) {
    const k = scaleOf(ctx);
    const F = FS[f.floor];
    const plan = OFFICE_FLOORS[f.floor];
    const B = bakesFor(f.floor, k);
    const O = f.outside;
    const fac = plan.outside.nearFactor ?? 0.04;
    const camZ = f.floorPlane.shiftBottom;

    // Outside, seen only through the glass: the wall strip covers the rest.
    ctx.drawImage(B.sky, 0, 0, FW, 232);
    for (const s of O.stars) {
      const col = hash(s.x) < 0.25 ? C.mustardL : C.cream;
      if (s.s > 1.15) burst(ctx, s.x, s.y, 1.8 + s.s * 1.2, 8, s.phase, col, 0.45, 0.4 + 0.6 * s.twinkle);
      else sparkle(ctx, s.x, s.y, 0.8 + s.s, col, 0.3 + 0.6 * s.twinkle);
    }
    for (const c of O.clouds) cloud(ctx, c, F);
    drawStrip(ctx, B.far, camZ * 0.015);
    if (f.floor === 'exec') {
      box(ctx, 0, 176, FW, 26, '#e88a3a', 0.18);
      ctx.beginPath();
      for (const l of O.cityLights) ctx.rect(l.x, l.y, l.s * 0.9, l.s * 0.9);
      ctx.fillStyle = '#ffd27a';
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (O.flyer && O.flyer.kind !== 'heli') flyer(ctx, O.flyer);
    drawStrip(ctx, B.near, camZ * fac);
    if (O.flyer && O.flyer.kind === 'heli') flyer(ctx, O.flyer);
    for (const c of O.cars) car(ctx, c);
    if (f.wall.cradle) cradle(ctx, f.wall.cradle, f.ceilingY);

    // The wall, then everything on it that moves.
    drawStrip(ctx, B.wall, f.wall.shift);
    for (const b of f.wall.bays) if (b.revolvingDoor != null) revolvingLive(ctx, F, plan, b.revolvingDoor, f.revolving);
    for (const h of f.wall.hangs) {
      if (h.kind === 'lift') liftLive(ctx, F, h, f.t);
      else if (h.kind === 'clock') clockHands(ctx, F, h, f.clock);
    }

    ceiling(ctx, F, f);
    for (const l of f.lights) light(ctx, F, l, f);

    floorPlane(ctx, F, f);
    for (const m of f.mid.items) {
      if (m.kind === 'cubicles') cubicleHeads(ctx, m, f.t);
      else if (m.kind === 'reception') receptionist(ctx, m);
    }
    drawStrip(ctx, B.mid, f.mid.shift);
    for (const m of f.mid.items) {
      if (m.kind === 'boardroom') boardroomLive(ctx, m);
      else if (m.kind === 'cooler') coolerLive(ctx, m);
      else if (m.kind === 'copier') copierLive(ctx, m);
      else if (m.kind === 'tallclock') pendulum(ctx, m);
    }
    slab(ctx, F, f);
    // The print's paper: a fine tooth over the whole backdrop, fixed to the sheet.
    ctx.beginPath();
    ctx.rect(0, 0, FW, FH);
    tex(ctx, 'tooth', 0.1, 0, 0, 0.5);
  },
  paintFront(ctx, f) {
    frontPass(ctx, f);
  },
};
