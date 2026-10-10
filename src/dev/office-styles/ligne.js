// CORPORATE KOMBAT style bake-off — LIGNE CLAIRE. The Franco-Belgian clear line: Hergé's
// office and hotel interiors (The Calculus Affair, Flight 714), E.P. Jacobs's architecture,
// Swarte, Chaland. One even line round every shape, flat bright colour, no hatching and no
// gradients; a shadow is a flat shape of a darker tint and lamplight a flat shape of a
// lighter one. The joy of it is detail and clarity together, so the building is drawn the
// way an architect would letter a sheet: glazing bars, call buttons, radiators, sockets,
// cable trays, ceiling grids, every desk's clutter, signage hand-lettered in an even
// single-stroke capital (the font below, so it is the same hand on every sign).
//
// Depth in ligne-claire terms: the outside is as precise as the inside but in lighter,
// cooler colour with a COLOURED line (aerial perspective without a single gradient); the
// back wall carries the black line; the furniture right behind the lane carries a lighter,
// thinner line and calmer colour so the hero and the hazards always win; the floor plane
// is ruled in one-point perspective with its vanishing point on the horizon.
//
// Colour by floor: the lobby a fresh morning (cream stone, brass, verde marble, blue sky);
// floor 23 the Hergé office (pale green walls, ochre partitions, grey-blue carpet); floor
// 88 a dusk of hard colour bands with the city's lights as flat yellow dots and warm lamp
// light as flat lighter shapes.
//
// Everything static is baked once per device scale into strips one layer-period long in
// the layer's own u (sky city far, city near, wall, furniture back and front), sliced into
// tiles, and laid down at whole device pixels; whatever moves (lift doors, heads, hands,
// wings, traffic, clouds, light pools, the floor's ruling) is drawn per frame from the
// frame, translated by the same device-pixel snap as its layer so nothing slips.
import { FRAME_W, WALL_BASE, MID_BASE, LANE_TOP, FACTORS, OFFICE_FLOORS } from './plan.js';
import { ZOOM } from '../../engine/camera.js';

const TAU = Math.PI * 2;
const W = FRAME_W;

// ------------------------------------------------------------------ utilities
function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
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

// --------------------------------------------------------------- the pen
function pen(g, ink, lw) {
  g.strokeStyle = ink;
  g.lineWidth = lw;
  g.lineJoin = 'round';
  g.lineCap = 'round';
}
function fs(g, fill, ink, lw) {
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (ink && lw > 0) { pen(g, ink, lw); g.stroke(); }
}
function box(g, x, y, w, h, fill, ink, lw) { g.beginPath(); g.rect(x, y, w, h); fs(g, fill, ink, lw); }
function poly(g, pts, fill, ink, lw, close = true) {
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  if (close) g.closePath();
  fs(g, fill, ink, lw);
}
function line(g, x0, y0, x1, y1, ink, lw) { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); pen(g, ink, lw); g.stroke(); }
function lines(g, segs, ink, lw) {
  g.beginPath();
  for (let i = 0; i < segs.length; i += 4) { g.moveTo(segs[i], segs[i + 1]); g.lineTo(segs[i + 2], segs[i + 3]); }
  pen(g, ink, lw);
  g.stroke();
}
function circ(g, x, y, r, fill, ink, lw) { g.beginPath(); g.arc(x, y, r, 0, TAU); fs(g, fill, ink, lw); }
function ell(g, x, y, rx, ry, fill, ink, lw, rot = 0) { g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU); fs(g, fill, ink, lw); }
function rrPath(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
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
function rbox(g, x, y, w, h, r, fill, ink, lw) { g.beginPath(); rrPath(g, x, y, w, h, r); fs(g, fill, ink, lw); }
// A box rounded only on top (a chair back, a tombstone-topped panel).
function topRound(g, x, y, w, h, r, fill, ink, lw) {
  g.beginPath();
  g.moveTo(x, y + h);
  g.lineTo(x, y + r);
  g.arcTo(x, y, x + r, y, r);
  g.lineTo(x + w - r, y);
  g.arcTo(x + w, y, x + w, y + r, r);
  g.lineTo(x + w, y + h);
  g.closePath();
  fs(g, fill, ink, lw);
}
// An egg: the dome taller than the bowl.
function eggPath(g, cx, cy, rx, ry, eq = 0.16) {
  const ey = ry * eq;
  g.ellipse(cx, cy + ey, rx, ry - ey, 0, 0, Math.PI);
  g.ellipse(cx, cy + ey, rx, ry + ey, 0, Math.PI, TAU);
}

// --------------------------------------------------------------- lettering
// A single-stroke capital on a 6-unit cap height, round-capped, the same hand on every
// sign from the lobby's brass letters to a binder's spine. `letters` draws at a baseline.
const GL = {};
const arcP = (cx, cy, rx, ry, a0, a1, n = 10) => {
  const o = [];
  for (let i = 0; i <= n; i++) {
    const a = (a0 + (a1 - a0) * (i / n)) * Math.PI / 180;
    o.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
  }
  return o;
};
const gl = (ch, w, ...s) => { GL[ch] = { w, s }; };
gl(' ', 2.2);
gl('A', 4, [0, 6, 2, 0, 4, 6], [0.7, 4, 3.3, 4]);
gl('B', 3.7, [0, 6, 0, 0, 2.2, 0, ...arcP(2.2, 1.5, 1.4, 1.5, -90, 90, 8), 0, 3], [0, 3, ...arcP(2.3, 4.5, 1.4, 1.5, -90, 90, 8), 0, 6]);
gl('C', 3.9, arcP(2.1, 3, 2.1, 3, -40, -320, 16));
gl('D', 4, [0, 0, 0, 6], [0, 0, 1.6, 0, ...arcP(1.6, 3, 2.4, 3, -90, 90, 12), 0, 6]);
gl('E', 3.3, [3.3, 0, 0, 0, 0, 6, 3.3, 6], [0, 3, 2.6, 3]);
gl('F', 3.2, [3.2, 0, 0, 0, 0, 6], [0, 3, 2.5, 3]);
gl('G', 4.2, [...arcP(2.1, 3, 2.1, 3, -40, -360, 16), 2.4, 3]);
gl('H', 3.6, [0, 0, 0, 6], [3.6, 0, 3.6, 6], [0, 3, 3.6, 3]);
gl('I', 0, [0, 0, 0, 6]);
gl('J', 3, [3, 0, 3, 4.4, ...arcP(1.5, 4.4, 1.5, 1.6, 0, 180, 8)]);
gl('K', 3.6, [0, 0, 0, 6], [3.6, 0, 0, 3.8], [1.2, 2.8, 3.7, 6]);
gl('L', 3.1, [0, 0, 0, 6, 3.1, 6]);
gl('M', 4.4, [0, 6, 0, 0, 2.2, 4, 4.4, 0, 4.4, 6]);
gl('N', 3.6, [0, 6, 0, 0, 3.6, 6, 3.6, 0]);
gl('O', 4.2, arcP(2.1, 3, 2.1, 3, 0, 360, 20));
gl('P', 3.6, [0, 6, 0, 0, 2.1, 0, ...arcP(2.1, 1.6, 1.5, 1.6, -90, 90, 8), 0, 3.2]);
gl('Q', 4.2, arcP(2.1, 3, 2.1, 3, 0, 360, 20), [2.6, 4.4, 4.3, 6.3]);
gl('R', 3.7, [0, 6, 0, 0, 2.1, 0, ...arcP(2.1, 1.6, 1.5, 1.6, -90, 90, 8), 0, 3.2], [1.9, 3.2, 3.7, 6]);
gl('S', 3.6, [...arcP(1.8, 1.5, 1.75, 1.5, -25, -270, 10), ...arcP(1.8, 4.5, 1.8, 1.5, -90, 155, 10)]);
gl('T', 4, [0, 0, 4, 0], [2, 0, 2, 6]);
gl('U', 3.6, [0, 0, 0, 4.2, ...arcP(1.8, 4.2, 1.8, 1.8, 180, 0, 10), 3.6, 0]);
gl('V', 4, [0, 0, 2, 6, 4, 0]);
gl('W', 5.4, [0, 0, 1.3, 6, 2.7, 1.6, 4.1, 6, 5.4, 0]);
gl('X', 3.8, [0, 0, 3.8, 6], [3.8, 0, 0, 6]);
gl('Y', 4, [0, 0, 2, 3.2, 4, 0], [2, 3.2, 2, 6]);
gl('Z', 3.6, [0, 0, 3.6, 0, 0, 6, 3.6, 6]);
gl('0', 3.4, arcP(1.7, 3, 1.7, 3, 0, 360, 18));
gl('1', 1.8, [0, 1.2, 1.6, 0, 1.6, 6]);
gl('2', 3.5, [...arcP(1.75, 1.75, 1.75, 1.75, 195, 375, 10), 0, 6, 3.6, 6]);
gl('3', 3.4, arcP(1.7, 1.5, 1.6, 1.5, 205, 450, 10), arcP(1.7, 4.5, 1.7, 1.5, -90, 155, 10));
gl('4', 3.8, [2.8, 6, 2.8, 0, 0, 4.2, 3.8, 4.2]);
gl('5', 3.5, [3.3, 0, 0.4, 0, 0.2, 2.7, ...arcP(1.75, 4.15, 1.75, 1.85, -120, 150, 10)]);
gl('6', 3.5, [3.1, 0.3, 1.8, 0.6, 0.6, 1.8, 0.05, 3.6, ...arcP(1.75, 4.2, 1.7, 1.8, 180, 540, 18)]);
gl('7', 3.6, [0, 0, 3.6, 0, 1.3, 6]);
gl('8', 3.4, arcP(1.7, 1.45, 1.45, 1.45, 90, 450, 14), arcP(1.7, 4.4, 1.7, 1.6, -90, 270, 16));
gl('9', 3.5, [...arcP(1.75, 1.8, 1.7, 1.8, 0, 360, 18), 3.45, 1.8, 3.2, 3.8, 2.4, 5.3, 0.4, 6]);
gl('.', 0.3, [0.15, 5.8, 0.15, 6]);
gl(',', 0.6, [0.5, 5.6, 0, 6.8]);
gl('-', 2, [0, 3.3, 2, 3.3]);
gl("'", 0.3, [0.15, 0, 0.15, 1.4]);
gl('!', 0.3, [0.15, 0, 0.15, 4.2], [0.15, 5.8, 0.15, 6]);
gl('/', 2.4, [0, 6, 2.4, 0]);
gl('$', 3.6, [...arcP(1.8, 1.7, 1.7, 1.2, -25, -270, 8), ...arcP(1.8, 4.1, 1.8, 1.2, -90, 155, 8)], [1.8, -0.4, 1.8, 6.4]);

function textW(str, size, track = 1.1) {
  let w = 0;
  let n = 0;
  for (const ch of str) { w += (GL[ch] || GL[' ']).w; n++; }
  return (w + track * Math.max(0, n - 1)) * size / 6;
}
function textPath(str, x, y, size, o = {}) {
  const s = size / 6;
  const track = o.track ?? 1.1;
  const slant = o.slant ?? 0;
  const w = textW(str, size, track);
  let cx = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  const p = new Path2D();
  for (const ch of str) {
    const G = GL[ch] || GL[' '];
    for (const st of G.s) {
      for (let i = 0; i < st.length; i += 2) {
        const px = cx + (st[i] + slant * (6 - st[i + 1])) * s;
        const py = y - (6 - st[i + 1]) * s;
        if (i) p.lineTo(px, py); else p.moveTo(px, py);
      }
    }
    cx += (G.w + track) * s;
  }
  return p;
}
// o: { ink, lw, align, track, slant, outline, olw, shadow, sdx, sdy }
function letters(g, str, x, y, size, o = {}) {
  const p = textPath(str, x, y, size, o);
  const lw = o.lw ?? Math.max(0.35, size * 0.11);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  if (o.shadow) {
    g.save();
    g.translate(o.sdx ?? 0.8, o.sdy ?? 0.8);
    g.strokeStyle = o.shadow;
    g.lineWidth = lw + 2 * (o.olw ?? 0);
    g.stroke(p);
    g.restore();
  }
  if (o.outline) {
    g.strokeStyle = o.outline;
    g.lineWidth = lw + 2 * (o.olw ?? 0.45);
    g.stroke(p);
  }
  g.strokeStyle = o.ink ?? '#222';
  g.lineWidth = lw;
  g.stroke(p);
}

// ------------------------------------------------------------- the palettes
const LW = 0.6; // the wall's line
const LWM = 0.5; // the furniture behind the lane: thinner, so the lane's art wins
const LWF = 0.38; // fine detail

const PAL = {
  lobby: {
    ink: '#2b241e', inkM: 'rgba(43,36,30,0.72)',
    sky: [[0, '#93c9ec'], [112, '#a7d4f0'], [150, '#bcdff3']],
    sun: '#fff5c2', sunLine: '#e7c164',
    cloud: '#ffffff', cloudShade: '#dbedf8', cloudLine: '#8cb6d6',
    far: { tones: ['#c6d6e6', '#b7c9dc', '#d3e0ec'], win: '#a9c0d7', line: '#93abc5', lw: 0.42 },
    near: {
      tones: ['#efe3c7', '#e6c3ac', '#d5dde1'], shade: ['#ddcca9', '#d4ab94', '#bfcace'],
      win: '#a6c9e3', winHi: '#d3e8f5', blind: '#f4ecd8', frame: '#f8f4ea', line: '#7f8fa8', lw: 0.46,
    },
    awn: ['#d8695c', '#5aa377', '#5c8bc6', '#e3b64a'],
    street: { pave: '#ddd6c6', kerb: '#bcb4a2', road: '#a2a6ac', mark: '#f4f1e6', line: '#7d8492' },
    tree: { leaf: '#88bc6d', leafDk: '#6aa15b', trunk: '#8b6b4b', line: '#55804c' },
    lampPost: '#3e5f58',
    wall: '#efe2c3', wallJoint: '#dfcda8', wallShade: '#dccaa4',
    band: '#4b5f58', bandLt: '#62786f',
    brass: '#d8a744', brassDk: '#a97a2b', brassLt: '#f2d47e',
    marble: '#43594f', marbleLt: '#5c7569', marbleVein: '#6f887b',
    column: '#e9d9b6', columnDk: '#d5c19b', columnSide: '#cdb88f',
    frame: '#8f6c3a', frameLt: '#b48d52',
    carLit: '#ffe7ad', carSide: '#efcf86', carFloor: '#c79f62',
    ceil: '#efe6cf', ceilDk: '#ddcfab',
    floorA: '#e9dcc0', floorB: '#e0d0b0', floorLine: '#cdbb98', floorRefl: 'rgba(160,118,62,0.14)', sunPatch: 'rgba(255,251,234,0.62)',
    slab: '#b4a283', slabDk: '#9a896c', slabTop: '#ddcda9', slabLine: '#857559',
    front: 'rgba(66,54,36,0.46)', frontLt: 'rgba(255,240,200,0.22)',
  },
  open: {
    ink: '#24262c', inkM: 'rgba(36,38,44,0.68)',
    sky: [[0, '#7cbde8'], [100, '#92caee'], [128, '#aad7f1']],
    sun: null, sunLine: null,
    cloud: '#ffffff', cloudShade: '#ddeef9', cloudLine: '#87b2d3',
    far: { tones: ['#c1d2e2', '#b2c5d8', '#cddbe8'], win: '#a4bcd4', line: '#8fa8c2', lw: 0.42 },
    near: {
      tones: ['#ddcca9', '#d4a38a', '#c0c9cd'], shade: ['#cbb892', '#c08e76', '#acb6bb'],
      win: '#95bdd9', winHi: '#c8e1f1', blind: '#eee4cb', frame: '#f2ede2', line: '#6f8096', lw: 0.48,
    },
    tank: '#ad8155', tankDk: '#8b6440',
    wall: '#d6e5c6', wallShade: '#c5d8b3', dado: '#b2c79d', rail: '#93ab80', skirting: '#6e5b47',
    column: '#c9dbb5', columnDk: '#b5c9a0', columnSide: '#a9bf93',
    frame: '#97a1a7', frameLt: '#c9d0d4',
    sill: '#ece6d6', radiator: '#c7c0aa', radLine: '#9f9883',
    blind: '#f1ead6', blindDk: '#d6ccb2',
    brass: '#d2a443', brassDk: '#a17a2c', brassLt: '#ecd07e',
    steel: '#bac3c8', steelDk: '#8f999f', steelLt: '#dde3e6',
    carLit: '#fff2c8', carSide: '#e6dcb4', carFloor: '#a99e86',
    ceil: '#eceade', ceilLine: '#d2d0c2',
    carpetA: '#7387a1', carpetB: '#788ca6', carpetLine: '#64778f',
    slab: '#5c6979', slabDk: '#4c5866', slabTop: '#8497af', slabLine: '#45505d',
    partition: '#cbbb90', partitionDk: '#b2a37a', trim: '#8c877b', trimLt: '#aaa598',
    front: 'rgba(38,46,60,0.46)', frontLt: 'rgba(230,240,255,0.2)',
  },
  exec: {
    ink: '#24171a', inkM: 'rgba(36,23,26,0.72)',
    sky: [[0, '#3d3470'], [52, '#4f4386'], [76, '#6a4b91'], [100, '#925892'], [122, '#bd6a8c'], [140, '#dc8279'], [154, '#ee9f66'], [166, '#f6c076']],
    sun: '#ffe193', sunLine: '#f29e4c',
    cloud: '#9d5f8d', cloudShade: '#f0a07c', cloudLine: '#6f4777',
    stars: '#fff3d6',
    far: { tones: ['#7a6697', '#6c5b8b', '#86719f'], lit: '#ffd76e', dark: '#5f4e7e', line: '#5b4b7b', lw: 0.38 },
    near: { tones: ['#4f4777', '#5a4f81', '#463f6b'], lit: '#ffd46b', dark: '#3c3660', rim: '#d78f96', line: '#332c50', lw: 0.48 },
    haze: 'rgba(222,150,150,0.32)',
    cityLights: ['#ffe48a', '#f8c45e', '#c99a5a'],
    wood: '#7b4329', woodLt: '#965632', woodDk: '#5a2e1d', woodLine: '#3f1f13', panel: '#86492c', panelLt: '#a2603a',
    brass: '#d6a43e', brassDk: '#a3752a', brassLt: '#f1d074',
    column: '#6a3a24', columnDk: '#55301e', columnSide: '#4a2819',
    frame: '#3b2b27', frameLt: '#6a5148',
    carLit: '#ffe2a0', carSide: '#e5b977', carFloor: '#9a6a40',
    ceil: '#5c3424', ceilDk: '#4a291c',
    parqA: '#b27b48', parqB: '#a77143', parqLine: '#875a33',
    rug: '#7d393a', rugIn: '#6a3033', rugBorder: '#b98f50', rugLine: '#4e2224',
    warm: 'rgba(255,214,140,0.13)', warmPool: 'rgba(255,220,150,0.22)', sunPatch: 'rgba(255,176,96,0.3)',
    slab: '#5b3625', slabDk: '#46291b', slabTop: '#8c5835', slabLine: '#3a2116',
    front: 'rgba(36,20,14,0.5)', frontLt: 'rgba(255,200,140,0.2)',
  },
};

// ------------------------------------------------------------ strips + tiles
const TILE = 512;
const STRIP_M = 48;
function bakeStrip(P, y0, y1, k, paint) {
  const u0 = -STRIP_M;
  const u1 = P + W + STRIP_M;
  const H = y1 - y0;
  const big = canvas((u1 - u0) * k, H * k);
  const g = big.getContext('2d');
  g.setTransform(k, 0, 0, k, -u0 * k, -y0 * k);
  paint(g, u0, u1);
  const tiles = [];
  for (let u = u0; u < u1; u += TILE) {
    const w = Math.min(TILE, u1 - u);
    const c = canvas(w * k, H * k);
    c.getContext('2d').drawImage(big, (u - u0) * k, 0, w * k, H * k, 0, 0, w * k, H * k);
    tiles.push({ c, u, w });
  }
  return { tiles, P, y0, H, k };
}
function drawStrip(ctx, S, shift) {
  const s = mod(shift, S.P);
  const base = Math.round(-s * S.k) / S.k;
  for (const t of S.tiles) {
    const x = t.u + base;
    if (x > W + 2 || x + t.w < -2) continue;
    ctx.drawImage(t.c, x, S.y0, t.w, S.H);
  }
}
// The same whole-device-pixel snap the strip got, for what is drawn per frame on that layer.
function snapDelta(shift, P, k) {
  const s = mod(shift, P);
  return Math.round(-s * k) / k + s;
}
// Every copy of [u, u + w) that lands in a strip's u range.
function copies(u, w, P, u0, u1) {
  const out = [];
  for (const n of [-1, 0, 1, 2]) {
    const x = u + n * P;
    if (x + w > u0 - 4 && x < u1 + 4) out.push(x);
  }
  return out;
}

// ------------------------------------------------------- the floor in perspective
// One-point perspective with the vanishing point at the frame's centre on the horizon.
// Parallax is linear in screen y, so the wall's foot (204) scrolls at the wall's rate and
// the lane (232) at the lane's: a floor point (U along the lane, D deep) lands at
// x = VPX + (U - S - VPX) * f, y = YH + (232 - YH) * f with f = Z0 / (Z0 + D).
const YH = WALL_BASE - 0.24 * (LANE_TOP - WALL_BASE) / 0.76;
const Z0 = 120;
const DWALL = Z0 * (1 / 0.24 - 1);
const VPX = 240;
const fOfD = (D) => Z0 / (Z0 + D);
const yOfF = (f) => YH + (LANE_TOP - YH) * f;
const xOf = (U, S, f) => VPX + (U - S - VPX) * f;

// =================================================================== OUTSIDE
function farBuilding(g, b, Pf, dusk) {
  const { u: x, w, top, base } = b;
  const face = Pf.tones[b.tone];
  const ln = Pf.line;
  const lw = Pf.lw;
  const cx = x + w / 2;
  if (b.roof === 'spire') poly(g, [cx - w * 0.14, top, cx, top - 18, cx + w * 0.14, top], face, ln, lw);
  if (b.roof === 'antenna') { line(g, cx, top, cx, top - 14, ln, lw); line(g, cx - 3, top - 8, cx + 3, top - 8, ln, lw); }
  if (b.roof === 'stepped') {
    box(g, x + w * 0.18, top - 9, w * 0.64, 9, face, ln, lw);
    box(g, x + w * 0.32, top - 16, w * 0.36, 7, face, ln, lw);
  }
  box(g, x, top, w, base - top, face, ln, lw);
  const cw = (w - 3) / b.cols;
  if (dusk) {
    for (let r = 0, y = top + 2; y < base - 2; r++, y += b.floorH * 0.7) {
      for (let c = 0; c < b.cols; c++) {
        const on = hash(b.i * 53.1 + r * 7.7 + c * 3.1) < b.lit;
        g.fillStyle = on ? Pf.lit : Pf.dark;
        g.fillRect(x + 1.5 + c * cw + cw * 0.25, y, Math.max(0.8, cw * 0.5), b.floorH * 0.32);
      }
    }
  } else {
    g.fillStyle = Pf.win;
    for (let y = top + 3; y < base - 3; y += b.floorH) {
      for (let c = 0; c < b.cols; c++) g.fillRect(x + 1.5 + c * cw + cw * 0.28, y, cw * 0.44, b.floorH * 0.42);
    }
    line(g, x + 0.5, top + 1.2, x + w - 0.5, top + 1.2, ln, lw * 0.8);
  }
}

function paintFar(g, F, P, u0, u1) {
  const per = 1400;
  const dusk = F.id === 'exec';
  for (const b of F.outside.far) {
    for (const u of copies(b.u, b.w, per, u0, u1)) farBuilding(g, { ...b, u }, P.far, dusk);
  }
  if (dusk) {
    // the haze the carpet of blocks sinks into, and the sea of roofs beyond it
    g.fillStyle = P.haze;
    g.fillRect(u0, 176, u1 - u0, 8);
    g.fillStyle = 'rgba(222,150,150,0.18)';
    g.fillRect(u0, 184, u1 - u0, 6);
  }
}

// ---------------------------------------------------- near buildings, by floor
const AD = [
  { bg: '#d4483c', ink: '#fff6e6', text: 'COLA' },
  { bg: '#f0c445', ink: '#2c3d6a', text: 'FIZZ' },
  { bg: '#2f4f86', ink: '#f6ecd2', text: 'EGGCORP' },
  { bg: '#4f9a6a', ink: '#f6ecd2', text: 'TONIC' },
];
const SHOPS = ['CAFE', 'DELI', 'BANK', 'BOOKS', 'FLORIST', 'BAKERY', 'TABAC', 'HATS', 'RADIO', 'SHOES'];

function waterTank(g, cx, roofY, Pn, wood, woodDk, s = 1) {
  const ln = Pn.line;
  const lw = Pn.lw;
  lines(g, [cx - 4.5 * s, roofY, cx - 4 * s, roofY - 6 * s, cx + 4.5 * s, roofY, cx + 4 * s, roofY - 6 * s,
    cx, roofY, cx, roofY - 6 * s, cx - 4.3 * s, roofY - 1.5 * s, cx + 4.3 * s, roofY - 4.5 * s], ln, lw);
  box(g, cx - 5.5 * s, roofY - 17 * s, 11 * s, 11 * s, wood, ln, lw);
  lines(g, [cx - 5.5 * s, roofY - 14 * s, cx + 5.5 * s, roofY - 14 * s, cx - 5.5 * s, roofY - 9 * s, cx + 5.5 * s, roofY - 9 * s], woodDk, lw);
  lines(g, [cx - 2 * s, roofY - 17 * s, cx - 2 * s, roofY - 6 * s, cx + 1.8 * s, roofY - 17 * s, cx + 1.8 * s, roofY - 6 * s], woodDk, lw * 0.7);
  poly(g, [cx - 6.5 * s, roofY - 17 * s, cx, roofY - 22.5 * s, cx + 6.5 * s, roofY - 17 * s], woodDk, ln, lw);
  line(g, cx, roofY - 22.5 * s, cx, roofY - 24.5 * s, ln, lw);
}

function billboard(g, x, roofY, w, i, Pn) {
  const ln = Pn.line;
  const lw = Pn.lw;
  const ad = AD[i % AD.length];
  const h = 15;
  const y = roofY - 4 - h;
  lines(g, [x + 4, roofY, x + 4, y + h, x + w - 4, roofY, x + w - 4, y + h, x + 4, roofY, x + w * 0.5, y + h, x + w - 4, roofY, x + w * 0.5, y + h], ln, lw);
  box(g, x, y, w, h, ad.bg, ln, lw);
  box(g, x + 1.2, y + 1.2, w - 2.4, h - 2.4, null, ad.ink, 0.35);
  const size = Math.min(8.5, (w - 8) / Math.max(1, textW(ad.text, 6) / 6));
  letters(g, ad.text, x + w / 2, y + h / 2 + size / 2, size, { ink: ad.ink, lw: size * 0.15, align: 'center' });
  // the lamps that light it at night, on their goosenecks
  for (const lx of [x + w * 0.25, x + w * 0.75]) {
    g.beginPath();
    g.moveTo(lx, y);
    g.quadraticCurveTo(lx, y - 3, lx + 2.5, y - 3);
    pen(g, ln, lw);
    g.stroke();
  }
}

function roofFurniture(g, b, Pn, P) {
  const x = b.u;
  const w = b.w;
  const t = b.top;
  const face = Pn.tones[b.tone];
  const ln = Pn.line;
  const lw = Pn.lw;
  const h = (n) => hash(b.i * 37.1 + n);
  const cx = x + w / 2;
  switch (b.roof) {
    case 'tank':
      waterTank(g, x + w * (0.2 + 0.35 * h(1)), t, Pn, P.tank || '#ad8155', P.tankDk || '#8b6440');
      if (w > 90) waterTank(g, x + w * 0.8, t, Pn, P.tank || '#ad8155', P.tankDk || '#8b6440', 0.8);
      break;
    case 'billboard':
      billboard(g, x + 7, t, Math.min(70, w - 14), b.i, Pn);
      break;
    case 'spire':
      box(g, cx - w * 0.3, t - 9, w * 0.6, 9, face, ln, lw);
      box(g, cx - w * 0.17, t - 17, w * 0.34, 8, face, ln, lw);
      poly(g, [cx - 2.2, t - 17, cx, t - 44, cx + 2.2, t - 17], face, ln, lw);
      break;
    case 'stepped': {
      const fh = b.floorH;
      box(g, x + w * 0.12, t - fh * 2.5, w * 0.76, fh * 2.5, face, ln, lw);
      box(g, x + w * 0.27, t - fh * 4.5, w * 0.46, fh * 2, face, ln, lw);
      break;
    }
    case 'antenna':
      lines(g, [cx, t, cx, t - 30, cx - 4, t - 12, cx + 4, t - 12, cx - 2.5, t - 21, cx + 2.5, t - 21], ln, lw);
      break;
    case 'flat':
      if (h(4) < 0.6) {
        // a stair bulkhead and a vent
        box(g, x + w * (0.15 + 0.4 * h(5)), t - 6, 10, 6, Pn.shade ? Pn.shade[b.tone] : face, ln, lw);
        box(g, x + w * 0.7, t - 3, 5, 3, Pn.shade ? Pn.shade[b.tone] : face, ln, lw);
      }
      break;
    default:
      break;
  }
}

// Daylight facades, near enough to read every window. Three manners by tone: dressed stone
// with a string course every few floors, brick with white sash frames and stone lintels,
// and a grey modern block in continuous ribbons.
function dayFacade(g, b, Pn, P, opts) {
  const x = b.u;
  const w = b.w;
  const t = b.top;
  const base = b.base;
  const face = Pn.tones[b.tone];
  const dk = Pn.shade[b.tone];
  const ln = Pn.line;
  const lw = Pn.lw;
  roofFurniture(g, b, Pn, P);
  box(g, x, t, w, base - t, face, ln, lw);
  const shopH = opts.shops && b.shop != null ? 22 : 0;
  const bottom = base - (shopH || 4);
  const cw = (w - 6) / b.cols;
  const fh = b.floorH + 1;
  let r = 0;
  for (let y = t + 6; y + fh * 0.7 < bottom; y += fh, r++) {
    if (b.tone === 2) {
      // a ribbon of glass, with its mullions
      g.fillStyle = Pn.win;
      g.fillRect(x + 2.5, y, w - 5, fh * 0.55);
      g.fillStyle = Pn.winHi;
      for (let c = 0; c < b.cols; c++) if (hash(b.i * 19 + r * 5 + c) < 0.18) g.fillRect(x + 3 + c * cw, y, cw - 1, fh * 0.55);
      g.beginPath();
      for (let c = 0; c <= b.cols; c++) { g.moveTo(x + 3 + c * cw - 0.5, y); g.lineTo(x + 3 + c * cw - 0.5, y + fh * 0.55); }
      g.rect(x + 2.5, y, w - 5, fh * 0.55);
      pen(g, ln, lw * 0.6);
      g.stroke();
      continue;
    }
    for (let c = 0; c < b.cols; c++) {
      const wx = x + 3 + c * cw + cw * 0.2;
      const ww = cw * 0.6;
      const wh = fh * 0.6;
      const hv = hash(b.i * 31.7 + r * 11.3 + c * 5.1);
      box(g, wx, y, ww, wh, hv < 0.16 ? Pn.winHi : Pn.win);
      if (hv > 0.82) box(g, wx, y, ww, wh * (hv > 0.92 ? 0.7 : 0.4), Pn.blind);
      if (b.tone === 1) {
        box(g, wx - 0.5, y - 1.3, ww + 1, 1.2, Pn.frame);
        g.beginPath();
        g.rect(wx, y, ww, wh);
        g.moveTo(wx, y + wh * 0.5);
        g.lineTo(wx + ww, y + wh * 0.5);
        pen(g, Pn.frame, 0.5);
        g.stroke();
      }
      g.beginPath();
      g.rect(wx, y, ww, wh);
      pen(g, ln, lw * 0.55);
      g.stroke();
      if (b.tone === 0) line(g, wx - 0.6, y + wh + 0.6, wx + ww + 0.6, y + wh + 0.6, dk, 0.7);
    }
    if (b.tone === 0 && r % 4 === 3) {
      box(g, x, y + fh - 1.6, w, 1.4, dk);
      line(g, x, y + fh - 1.6, x + w, y + fh - 1.6, ln, lw * 0.6);
    }
  }
  // the roofline
  if (b.roof === 'cornice') {
    box(g, x - 1.5, t - 1, w + 3, 3.2, Pn.shade[b.tone], ln, lw);
    box(g, x, t + 2.2, w, 1.4, dk);
    g.beginPath();
    for (let dx = 1.5; dx < w; dx += 2.4) { g.moveTo(x + dx, t + 2.2); g.lineTo(x + dx, t + 3.4); }
    pen(g, ln, lw * 0.5);
    g.stroke();
  } else {
    box(g, x - 0.5, t, w + 1, 2, Pn.frame, ln, lw);
  }
  if (shopH) shopFront(g, b, Pn, P, base);
  if (opts.shops) streetDressing(g, b, Pn, base);
}

// The street's furniture on its facades: a vertical blade sign on some, a flag on others.
const BLADES = ['HOTEL', 'CINEMA', 'BAR', 'HOTEL', 'TAXI'];
function streetDressing(g, b, Pn, base) {
  const ln = Pn.line;
  const kind = b.i % 4;
  if (kind === 0 && b.w > 60) {
    const word = BLADES[(b.i >> 2) % BLADES.length];
    const bx = b.u + (b.i % 8 ? b.w - 10 : 4);
    const by = base - 70;
    const h = word.length * 6.4 + 4;
    lines(g, [bx - 1, by + 3, bx + 3, by + 3, bx - 1, by + h - 3, bx + 3, by + h - 3], ln, 0.5);
    box(g, bx + 1, by, 7, h, '#c8433a', ln, Pn.lw);
    box(g, bx + 1.8, by + 0.8, 5.4, h - 1.6, null, '#f6e7c6', 0.4);
    [...word].forEach((ch, k) => letters(g, ch, bx + 4.5, by + 7.4 + k * 6.4, 4, { ink: '#f8eed2', lw: 0.6, align: 'center' }));
  } else if (kind === 2 && b.roof === 'cornice' && b.top > 20) {
    const fx = b.u + b.w * 0.5;
    line(g, fx, b.top - 1, fx, b.top - 16, ln, 0.5);
    poly(g, [fx, b.top - 16, fx + 9, b.top - 14.6, fx + 8.4, b.top - 10.6, fx, b.top - 11.6], ['#d8695c', '#5c8bc6', '#e3b64a'][b.i % 3], ln, 0.4);
  }
}

function shopFront(g, b, Pn, P, base) {
  const x = b.u + 2;
  const w = b.w - 4;
  const ln = Pn.line;
  const lw = Pn.lw;
  const awn = P.awn[b.shop];
  const name = SHOPS[b.i % SHOPS.length];
  // fascia with the shop's name
  box(g, x, base - 22, w, 5, '#3e4b5c', ln, lw);
  letters(g, name, x + w / 2, base - 18.2, 3.2, { ink: '#f6ecd0', lw: 0.42, align: 'center' });
  // the window and the door
  box(g, x + 1, base - 17, w - 2, 17, '#b6d2e4', ln, lw);
  const dx = x + (b.i % 2 ? w - 12 : 4);
  box(g, dx, base - 14, 8, 14, '#6b5a48', ln, lw);
  box(g, dx + 1.5, base - 12.5, 5, 6, '#b6d2e4', ln, lw * 0.6);
  // goods in the window
  for (let k = 0, gx = x + 4; gx < x + w - 6; gx += 6, k++) {
    if (Math.abs(gx + 2 - (dx + 4)) < 7) continue;
    const c = ['#d9a441', '#c65a4a', '#5f8f5f', '#e8dcc0'][(b.i + k) % 4];
    box(g, gx, base - 6 - (k % 3), 3.6, 4 + (k % 3), c, ln, lw * 0.5);
  }
  // the awning: striped, scalloped edge
  const ay = base - 17;
  poly(g, [x - 1, ay - 1, x + w + 1, ay - 1, x + w + 3, ay + 4, x - 3, ay + 4], awn, ln, lw);
  g.save();
  g.beginPath();
  g.moveTo(x - 1, ay - 1); g.lineTo(x + w + 1, ay - 1); g.lineTo(x + w + 3, ay + 4); g.lineTo(x - 3, ay + 4); g.closePath();
  g.clip();
  g.fillStyle = '#f7f1e2';
  for (let sx = x - 3; sx < x + w + 3; sx += 6) g.fillRect(sx, ay - 1, 3, 6);
  g.restore();
  g.beginPath();
  for (let sx = x - 3; sx < x + w + 3; sx += 3) g.arc(sx + 1.5, ay + 4, 1.5, 0, Math.PI);
  g.fillStyle = awn;
  g.fill();
  pen(g, ln, lw * 0.7);
  g.stroke();
}

function tree(g, x, y, s, T, seed) {
  const ln = T.line;
  // trunk and grate
  box(g, x - 1.1 * s, y - 16 * s, 2.2 * s, 16 * s, T.trunk, ln, 0.42);
  line(g, x - 4 * s, y + 0.3, x + 4 * s, y + 0.3, ln, 0.5);
  // crown: lobes, outlined as one silhouette (ink pass under, fill pass over)
  const lobes = [];
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * TAU + hash(seed + k) * 0.6;
    const rr = (5.5 + hash(seed + k * 3) * 3) * s;
    lobes.push([x + Math.cos(a) * 7 * s, y - 27 * s + Math.sin(a) * 6.5 * s, rr]);
  }
  lobes.push([x, y - 28 * s, 8 * s]);
  g.beginPath();
  for (const [lx, ly, r] of lobes) { g.moveTo(lx + r, ly); g.arc(lx, ly, r, 0, TAU); }
  pen(g, ln, 1.0);
  g.stroke();
  g.fillStyle = T.leaf;
  g.fill();
  // the flat shadow under the crown
  g.save();
  g.clip();
  g.beginPath();
  for (const [lx, ly, r] of lobes) { g.moveTo(lx + 2 * s + r, ly + 3 * s); g.arc(lx + 2 * s, ly + 3 * s, r * 0.85, 0, TAU); }
  g.fillStyle = T.leafDk;
  g.globalCompositeOperation = 'source-atop';
  g.fillRect(x - 20 * s, y - 24 * s, 40 * s, 20 * s);
  g.restore();
}

function lampPost(g, x, y, P) {
  const c = P.lampPost;
  const ln = P.near.line;
  box(g, x - 1.6, y - 3, 3.2, 3, c, ln, 0.42);
  box(g, x - 0.7, y - 40, 1.4, 37, c, ln, 0.42);
  g.beginPath();
  g.moveTo(x, y - 40);
  g.quadraticCurveTo(x, y - 45, x + 5, y - 44);
  pen(g, c, 1);
  g.stroke();
  poly(g, [x + 3, y - 44, x + 8, y - 44, x + 7.2, y - 40, x + 3.8, y - 40], '#f6efd0', ln, 0.42);
  poly(g, [x + 2.5, y - 44, x + 5.5, y - 46.5, x + 8.5, y - 44], c, ln, 0.42);
}

function paintNear(g, F, P, u0, u1) {
  const O = F.outside;
  const per = 1200;
  const Pn = P.near;
  if (F.id === 'exec') {
    for (const b of O.near) for (const u of copies(b.u, b.w, per, u0, u1)) duskTower(g, { ...b, u }, P);
    return;
  }
  for (const b of O.near) for (const u of copies(b.u - 30, b.w + 60, per, u0, u1)) dayFacade(g, { ...b, u: u + 30 }, Pn, P, { shops: !!O.street });
  if (!O.street) return;
  const S = O.street;
  const st = P.street;
  // far pavement over the buildings' feet, the kerb, the road, the near pavement
  box(g, u0, S.far - 4, u1 - u0, 4.5, st.pave);
  line(g, u0, S.far - 4, u1, S.far - 4, st.line, 0.4);
  box(g, u0, S.far + 0.5, u1 - u0, 1.4, st.kerb);
  line(g, u0, S.far + 0.5, u1, S.far + 0.5, st.line, 0.45);
  box(g, u0, S.far + 1.9, u1 - u0, S.near - S.far - 1.9, st.road);
  line(g, u0, S.near, u1, S.near, st.line, 0.45);
  box(g, u0, S.near, u1 - u0, 6, st.pave);
  // lane markings and a zebra (in this layer's own u, so they never slide)
  g.fillStyle = st.mark;
  for (let u = Math.floor(u0 / 25) * 25; u < u1; u += 25) g.fillRect(u, (S.far + S.near) / 2 + 0.5, 12, 1);
  for (const zu of [180, 780]) {
    for (const zc of copies(zu, 40, per, u0, u1)) {
      for (let k = 0; k < 6; k++) poly(g, [zc + k * 7, S.far + 2.5, zc + k * 7 + 4, S.far + 2.5, zc + k * 7 + 5.5, S.near - 0.6, zc + k * 7 + 1.5, S.near - 0.6], st.mark);
    }
  }
  // drains on the kerb
  for (let u = Math.floor(u0 / 150) * 150 + 60; u < u1; u += 150) box(g, u, S.near - 1.6, 5, 1.4, '#6f747c');
  for (const tr of O.trees) for (const u of copies(tr.u - 20, 40, per, u0, u1)) tree(g, u + 20, S.far, tr.s, P.tree, tr.u);
  for (const l of O.lamps) for (const u of copies(l.u - 10, 20, per, u0, u1)) lampPost(g, u + 10, S.far, P);
}

// Dusk: the towers rising through the haze. Flat violet, their windows a grid of flat
// yellow and slate, the parapets catching the last of the light.
function duskTower(g, b, P) {
  const Pn = P.near;
  const x = b.u;
  const w = b.w;
  const t = b.top;
  const base = b.base;
  const face = Pn.tones[b.tone];
  const ln = Pn.line;
  const lw = Pn.lw;
  const cx = x + w / 2;
  if (b.roof === 'spire') {
    box(g, cx - w * 0.32, t - 10, w * 0.64, 10, face, ln, lw);
    box(g, cx - w * 0.18, t - 18, w * 0.36, 8, face, ln, lw);
    poly(g, [cx - 2, t - 18, cx, t - 46, cx + 2, t - 18], face, ln, lw);
    box(g, cx - w * 0.32, t - 10, w * 0.64, 1.4, Pn.rim);
    box(g, cx - w * 0.18, t - 18, w * 0.36, 1.4, Pn.rim);
  } else if (b.roof === 'stepped') {
    box(g, x + w * 0.14, t - 12, w * 0.72, 12, face, ln, lw);
    box(g, x + w * 0.3, t - 22, w * 0.4, 10, face, ln, lw);
    box(g, x + w * 0.14, t - 12, w * 0.72, 1.4, Pn.rim);
    box(g, x + w * 0.3, t - 22, w * 0.4, 1.4, Pn.rim);
  } else if (b.roof === 'antenna') {
    lines(g, [cx, t, cx, t - 34, cx - 4, t - 14, cx + 4, t - 14, cx - 2.5, t - 24, cx + 2.5, t - 24], ln, lw);
  }
  box(g, x, t, w, base - t, face, ln, lw);
  box(g, x + 0.3, t + 0.3, w - 0.6, 1.6, Pn.rim);
  const cw = (w - 4) / b.cols;
  for (let r = 0, y = t + 4; y < base - 2; r++, y += b.floorH * 0.8) {
    for (let c = 0; c < b.cols; c++) {
      const on = hash(b.i * 71.3 + r * 13.1 + c * 2.9) < b.lit;
      g.fillStyle = on ? Pn.lit : Pn.dark;
      g.fillRect(x + 2 + c * cw + cw * 0.22, y, cw * 0.56, b.floorH * 0.42);
    }
  }
  if (b.roof === 'antenna' || b.roof === 'spire') circ(g, cx, t - (b.roof === 'spire' ? 46 : 34), 1.1, '#ff5a4a', ln, 0.3);
}

// ---------------------------------------------------------- sky, sun, clouds
function sky(ctx, f, P) {
  const G = f.glass;
  const bands = P.sky;
  for (let i = 0; i < bands.length; i++) {
    const y0 = G.top - 2 + bands[i][0];
    const y1 = i + 1 < bands.length ? G.top - 2 + bands[i + 1][0] : G.bottom + 4;
    ctx.fillStyle = bands[i][1];
    ctx.fillRect(-4, y0, W + 8, y1 - y0);
  }
}

function sun(ctx, f, P) {
  const s = f.outside.sun;
  if (!s) return;
  if (f.floor === 'exec') {
    circ(ctx, s.x, s.y, s.r + 5, 'rgba(255,214,140,0.35)');
    circ(ctx, s.x, s.y, s.r, P.sun, P.sunLine, 0.7);
    // the flat streaks of cloud drawn across the sun
    ctx.fillStyle = '#e48c70';
    ctx.fillRect(s.x - s.r - 8, s.y - 4, s.r * 2 + 16, 1.6);
    ctx.fillRect(s.x - s.r - 2, s.y + 1, s.r * 2 + 6, 1.2);
    return;
  }
  // morning: a pale disc and a ring of short flat rays
  ctx.beginPath();
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU + 0.13;
    const r0 = s.r + 3;
    const r1 = s.r + (k % 2 ? 6 : 9);
    ctx.moveTo(s.x + Math.cos(a) * r0, s.y + Math.sin(a) * r0);
    ctx.lineTo(s.x + Math.cos(a) * r1, s.y + Math.sin(a) * r1);
  }
  pen(ctx, P.sunLine, 0.8);
  ctx.stroke();
  circ(ctx, s.x, s.y, s.r, P.sun, P.sunLine, 0.7);
}

// A cloud is a row of lobes with a flat base, outlined as one silhouette: the line pass is
// stroked at twice the weight and the fill laid over it, so only the outer half shows.
function cloudShape(c, i, floor) {
  const n = Math.max(3, Math.round(c.w / (floor === 'exec' ? 18 : 20)));
  const lobes = [];
  const base = c.h * 0.5;
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n;
    const env = Math.sin(Math.PI * t);
    const r = c.h * (0.38 + 0.42 * env) * (0.85 + 0.3 * hash(i * 17 + k + (floor === 'exec' ? 50 : 0)));
    lobes.push([c.w * t, base - r * 0.75, r]);
  }
  const p = new Path2D();
  for (const [x, y, r] of lobes) { p.moveTo(x + r, y); p.arc(x, y, r, 0, TAU); }
  const x0 = lobes[0][0] - lobes[0][2] * 0.6;
  const x1 = lobes[n - 1][0] + lobes[n - 1][2] * 0.6;
  p.rect(x0, base - c.h * 0.42, x1 - x0, c.h * 0.42);
  return { p, x0, x1, base, h: c.h };
}

function clouds(ctx, f, P, shapes) {
  for (const c of f.outside.clouds) {
    const s = shapes[c.i];
    ctx.save();
    ctx.translate(Math.round(c.x * 2) / 2, c.y);
    pen(ctx, P.cloudLine, 1.2);
    ctx.stroke(s.p);
    ctx.fillStyle = P.cloud;
    ctx.fill(s.p);
    ctx.clip(s.p);
    ctx.fillStyle = P.cloudShade;
    ctx.fillRect(s.x0 - 10, s.base - s.h * (f.floor === 'exec' ? 0.34 : 0.26), s.x1 - s.x0 + 20, s.h);
    ctx.restore();
  }
}

// ------------------------------------------------------------- traffic, flyers
function vehicle(ctx, c, P) {
  const ln = '#4a5262';
  ctx.save();
  ctx.translate(c.x + (c.dir < 0 ? c.w : 0), c.y);
  ctx.scale(c.dir, 1);
  const wheel = (x) => { circ(ctx, x, -2.2, 2.3, '#2e3138', ln, 0.4); circ(ctx, x, -2.2, 1, '#c9ced6'); };
  if (c.kind === 'bus') {
    rbox(ctx, 0, -22, 64, 19, 2.5, '#d6534a', ln, 0.45);
    box(ctx, 1, -18, 62, 7, '#f4ead2', ln, 0.4);
    for (let k = 0; k < 8; k++) {
      box(ctx, 3 + k * 7.2, -17.3, 5.6, 5.4, '#a9cde3', ln, 0.35);
      if (k % 3 !== 1 && k > 0) circ(ctx, 5.8 + k * 7.2, -14.4, 1.4, k % 2 ? '#e9c09c' : '#c98e64');
    }
    box(ctx, 58, -17.3, 5, 12, '#a9cde3', ln, 0.35);
    box(ctx, 44, -21.4, 13, 3, '#2e3138');
    letters(ctx, '23', 50.5, -19, 2.2, { ink: '#ffd36a', lw: 0.35, align: 'center' });
    line(ctx, 1, -8, 63, -8, '#f4ead2', 0.8);
    wheel(12); wheel(50);
  } else if (c.kind === 'cab') {
    // a round-shouldered fifties cab
    ctx.beginPath();
    ctx.moveTo(1, -3); ctx.lineTo(1, -7.5); ctx.quadraticCurveTo(2, -8.6, 6, -8.6); ctx.lineTo(9, -8.6);
    ctx.quadraticCurveTo(11, -12.5, 15, -12.5); ctx.lineTo(20, -12.5); ctx.quadraticCurveTo(23, -12.5, 24.5, -8.6);
    ctx.quadraticCurveTo(29.5, -8.4, 29.5, -6); ctx.lineTo(29.5, -3); ctx.closePath();
    fs(ctx, '#f2c64a', ln, 0.45);
    poly(ctx, [10.4, -8.8, 14.6, -11.6, 17, -11.6, 17, -8.8], '#a9cde3', ln, 0.35);
    poly(ctx, [18, -8.8, 18, -11.6, 20.6, -11.6, 23.4, -8.8], '#a9cde3', ln, 0.35);
    box(ctx, 15, -14.2, 4, 1.6, '#f6f0dc', ln, 0.3);
    ctx.fillStyle = '#2e3138';
    for (let k = 0; k < 7; k++) ctx.fillRect(4 + k * 3.2, -6.4 + (k % 2) * 0.9, 1.6, 0.9);
    line(ctx, 0.5, -3.4, 30, -3.4, '#c9ced6', 0.6);
    wheel(7); wheel(23.5);
  } else {
    ctx.beginPath();
    ctx.moveTo(0.5, -3); ctx.lineTo(0.5, -6.5); ctx.quadraticCurveTo(1, -7.6, 5, -7.8);
    ctx.quadraticCurveTo(8, -11.5, 13, -11.5); ctx.lineTo(17, -11.5); ctx.quadraticCurveTo(21, -11.4, 23, -7.8);
    ctx.quadraticCurveTo(27.5, -7.5, 27.5, -5); ctx.lineTo(27.5, -3); ctx.closePath();
    fs(ctx, '#4f86c6', ln, 0.45);
    poly(ctx, [8.6, -8, 12.5, -10.7, 15, -10.7, 15, -8], '#cfe3ef', ln, 0.35);
    poly(ctx, [16, -8, 16, -10.7, 18.6, -10.7, 21.6, -8], '#cfe3ef', ln, 0.35);
    line(ctx, 0.5, -3.4, 28, -3.4, '#c9ced6', 0.6);
    circ(ctx, 26.6, -5.6, 0.7, '#fff2b0');
    wheel(6.5); wheel(21.5);
  }
  ctx.restore();
}

function flyer(ctx, f, P) {
  const fl = f.outside.flyer;
  if (!fl) return;
  if (fl.kind === 'birds') {
    ctx.beginPath();
    const flock = [[0, 0], [9, 3], [17, -2], [25, 4], [7, 9]];
    flock.forEach(([dx, dy], k) => {
      const up = Math.sin((fl.phase + k * 0.23) * TAU) * 2.2;
      const x = fl.x + dx;
      const y = fl.y + dy;
      ctx.moveTo(x - 3.2, y - up);
      ctx.quadraticCurveTo(x - 1.4, y - 1.5 - up * 0.3, x, y);
      ctx.quadraticCurveTo(x + 1.4, y - 1.5 - up * 0.3, x + 3.2, y - up);
    });
    pen(ctx, '#4b5e74', 0.6);
    ctx.stroke();
    return;
  }
  if (fl.kind === 'blimp') {
    const d = fl.dir;
    const x = fl.x;
    const y = fl.y;
    const ln = '#5f6f85';
    // fins at the tail, the envelope, its flat shadow, the gondola, the name
    poly(ctx, [x - d * 24, y - 3, x - d * 33, y - 10, x - d * 34, y - 6, x - d * 28, y], '#c64a3e', ln, 0.45);
    poly(ctx, [x - d * 24, y + 3, x - d * 33, y + 10, x - d * 34, y + 6, x - d * 28, y], '#c64a3e', ln, 0.45);
    ell(ctx, x, y, 30, 10, '#dfe3e8', ln, 0.5);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, 30, 10, 0, 0, TAU);
    ctx.clip();
    ctx.fillStyle = '#c4cbd4';
    ctx.fillRect(x - 31, y + 3.5, 62, 8);
    ctx.restore();
    ell(ctx, x, y, 30, 10, null, ln, 0.5);
    rbox(ctx, x - 5, y + 9.4, 10, 3.6, 1.2, '#8f9aa8', ln, 0.4);
    letters(ctx, fl.label || 'EGGCORP', x + d * 1, y + 2.4, 4.6, { ink: '#c64a3e', lw: 0.75, align: 'center' });
    return;
  }
  if (fl.kind === 'heli') {
    const x = fl.x;
    const y = fl.y;
    const d = fl.dir;
    const ln = '#2c2540';
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(d, 1);
    poly(ctx, [-6, -1.5, -19, -2.2, -19, 0.2, -6, 1.5], '#3c3a5e', ln, 0.4);
    poly(ctx, [-19, -2.2, -21, -6, -18.4, -6, -17.4, -2.2], '#3c3a5e', ln, 0.4);
    ell(ctx, 0, 0, 7.5, 4.6, '#3c3a5e', ln, 0.45);
    poly(ctx, [1.5, -3.6, 6.8, -1.4, 6.8, 1, 1.5, 1], '#ffd77a', ln, 0.35);
    lines(ctx, [-4, 4.6, -5, 6.4, 4, 4.6, 5, 6.4, -7, 6.4, 7, 6.4], ln, 0.5);
    line(ctx, 0, -4.6, 0, -6, ln, 0.6);
    const sw = Math.cos(fl.phase * TAU);
    line(ctx, -13 * sw, -6.3, 13 * sw, -6.3, ln, 0.7);
    line(ctx, -13 * Math.sin(fl.phase * TAU), -6.3, 13 * Math.sin(fl.phase * TAU), -6.3, 'rgba(44,37,64,0.5)', 0.6);
    const tr = Math.sin(fl.phase * TAU * 2) * 3;
    line(ctx, -19.7, -4 - tr, -19.7, -4 + tr, ln, 0.5);
    if (fl.phase < 0.5) circ(ctx, -6, 4.2, 0.9, '#ff4a3a');
    ctx.restore();
  }
}

// The window cleaner's gondola, right against the glass outside.
function cradle(ctx, f, P) {
  const c = f.wall.cradle;
  if (!c) return;
  const ln = '#4b5566';
  const x = c.x;
  const y = c.y;
  const w = c.w;
  lines(ctx, [x + 4, f.glass.top - 4, x + 4, y - 8, x + w - 4, f.glass.top - 4, x + w - 4, y - 8], '#3f4756', 0.55);
  lines(ctx, [x + 4, y - 8, x + 1, y, x + 4, y - 8, x + 7, y, x + w - 4, y - 8, x + w - 7, y, x + w - 4, y - 8, x + w - 1, y], '#3f4756', 0.45);
  // the cleaner: cap, overalls, a squeegee on a pole swiping the pane
  const px = x + 20;
  const sx = x + 26 + (c.swipe - 0.5) * 18;
  const sy = y - 17 + Math.abs(c.swipe - 0.5) * 3;
  box(ctx, px - 4, y - 12, 8, 12, '#5a7fb8', ln, 0.45);
  circ(ctx, px, y - 15, 3.2, '#f0c8a2', ln, 0.45);
  poly(ctx, [px - 3.5, y - 16.5, px - 3.2, y - 19, px + 3.2, y - 19, px + 4.5, y - 16.5], '#e8c43e', ln, 0.4);
  line(ctx, px + 3, y - 9, sx, sy + 2, '#f0c8a2', 1.4);
  line(ctx, px + 3, y - 9, sx, sy + 2, ln, 0.3);
  line(ctx, sx, sy - 4, sx, sy + 4, '#2f3440', 1.2);
  // soap streaks where the blade has been
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillRect(Math.min(sx, x + 26) - 0.5, sy - 4, Math.abs(sx - (x + 26)) + 1, 8);
  // the platform and its rail; a bucket
  box(ctx, x, y - 8, w, 1.3, '#9aa3ae', ln, 0.4);
  lines(ctx, [x + 10, y - 8, x + 10, y, x + 32, y - 8, x + 32, y, x + 42, y - 8, x + 42, y], ln, 0.4);
  box(ctx, x, y, w, 7, '#d8dde3', ln, 0.5);
  box(ctx, x, y + 5, w, 2, '#a9b1bb', ln, 0.4);
  poly(ctx, [x + 36, y - 5, x + 41, y - 5, x + 40.3, y, x + 36.7, y], '#d9a441', ln, 0.4);
}

function cityLights(ctx, f, P) {
  const L = f.outside.cityLights;
  if (!L.length) return;
  const cols = P.cityLights;
  for (let lev = 2; lev >= 0; lev--) {
    ctx.beginPath();
    for (const p of L) {
      const l = p.a > 0.7 ? 0 : p.a > 0.38 ? 1 : 2;
      if (l !== lev) continue;
      const s = 0.6 + p.s * 0.7;
      ctx.rect(p.x, p.y, s, s);
    }
    ctx.fillStyle = cols[lev];
    ctx.fill();
  }
}

function stars(ctx, f, P) {
  const S = f.outside.stars;
  if (!S.length) return;
  ctx.fillStyle = P.stars;
  for (const s of S) {
    ctx.globalAlpha = 0.35 + 0.65 * s.twinkle;
    const r = 0.4 + s.s * 0.5;
    ctx.fillRect(s.x - r, s.y - 0.25, r * 2, 0.5);
    ctx.fillRect(s.x - 0.25, s.y - r, 0.5, r * 2);
  }
  ctx.globalAlpha = 1;
}

// ====================================================================== WALL
// ---------------------------------------------------------------- the lobby
function lobbyCornice(g, x0, x1, P) {
  box(g, x0, 14, x1 - x0, 8, P.ceilDk, P.ink, LW);
  box(g, x0, 19.4, x1 - x0, 2.6, P.brass, P.ink, LWF);
  g.beginPath();
  for (let x = x0 + 2; x < x1; x += 4) { g.moveTo(x, 14.4); g.lineTo(x, 18); }
  pen(g, P.wallJoint, 0.9);
  g.stroke();
}

function lobbyWallBay(g, x0, x1, P) {
  box(g, x0, 14, x1 - x0, 190, P.wall);
  // ashlar: courses 16 high, joints broken every other course
  g.beginPath();
  for (let y = 38, r = 0; y < 196; y += 16, r++) {
    g.moveTo(x0, y);
    g.lineTo(x1, y);
    for (let x = x0 + 12 + (r % 2) * 20; x < x1; x += 40) { g.moveTo(x, y); g.lineTo(x, Math.min(196, y + 16)); }
  }
  pen(g, P.wallJoint, 0.55);
  g.stroke();
  lobbyCornice(g, x0, x1, P);
  // the verde frieze at the transom line, brass-edged
  box(g, x0, 92.5, x1 - x0, 6, P.band, P.ink, LW);
  lines(g, [x0, 93.6, x1, 93.6, x0, 97.4, x1, 97.4], P.brass, 0.6);
  // skirting
  box(g, x0, 195, x1 - x0, 9, P.marble, P.ink, LW);
  line(g, x0, 196.6, x1, 196.6, P.marbleLt, 0.7);
  g.beginPath();
  for (let x = x0 + 9; x < x1; x += 23) { g.moveTo(x, 199 + (x % 3)); g.quadraticCurveTo(x + 5, 197.5, x + 11, 201); }
  pen(g, P.marbleVein, 0.4);
  g.stroke();
}

function lobbyGlass(g, x0, x1, b, P, F) {
  const G = F.glass;
  lobbyCornice(g, x0, x1, P);
  const n = Math.max(1, Math.round((x1 - x0) / G.mullion));
  const pitch = (x1 - x0) / n;
  const door = b.revolvingDoor;
  // shine on the glass: pairs of thin flat diagonals in some panes
  g.save();
  g.beginPath();
  g.rect(x0, G.top, x1 - x0, G.bottom - G.top);
  g.clip();
  g.beginPath();
  for (let i = 0; i < n; i++) {
    if (hash(b.seed * 0.37 + i * 3.1) < 0.45) continue;
    const px = x0 + i * pitch;
    const yy = G.top + 10 + hash(i + b.seed) * 40;
    g.moveTo(px + 6, yy + 22); g.lineTo(px + 22, yy);
    g.moveTo(px + 10, yy + 24); g.lineTo(px + 24, yy + 5);
  }
  pen(g, 'rgba(255,255,255,0.55)', 0.9);
  g.stroke();
  g.restore();
  const bar = P.frame;
  for (let i = 0; i <= n; i++) {
    const mx = x0 + i * pitch;
    const nearDoor = door != null && Math.abs(mx - door) < 28;
    box(g, mx - 1.1, G.top, 2.2, (nearDoor ? G.transom : G.bottom) - G.top, bar, P.ink, LWF);
  }
  box(g, x0, G.top, x1 - x0, 2.4, bar, P.ink, LWF);
  box(g, x0, G.transom - 1.6, x1 - x0, 3.2, bar, P.ink, LWF);
  line(g, x0, G.transom - 0.6, x1, G.transom - 0.6, P.frameLt, 0.5);
  box(g, x0, G.bottom - 3, x1 - x0, 3, P.marble, P.ink, LWF);
  if (door != null) {
    // the drum: a brass canopy lettered with the company's name, two posts, a mat
    box(g, door - 25, G.transom + 1.6, 50, 7, P.brass, P.ink, LW);
    box(g, door - 25, G.transom + 7, 50, 1.6, P.brassDk, P.ink, LWF);
    letters(g, 'EGGCORP', door, G.transom + 6.6, 3.6, { ink: P.ink, lw: 0.5, align: 'center' });
    for (const s of [-1, 1]) box(g, door + s * 23 - 1.5, G.transom + 8.6, 3, G.bottom - G.transom - 11.6, P.brass, P.ink, LWF);
    box(g, door - 22, G.bottom - 4.6, 44, 1.6, '#5a4a3a', P.ink, LWF);
    // PUSH plates on the flanking panes
    letters(g, 'IN', door - 32, G.transom + 40, 3, { ink: P.brassDk, lw: 0.45, align: 'center' });
    letters(g, 'OUT', door + 33, G.transom + 40, 3, { ink: P.brassDk, lw: 0.45, align: 'center' });
  }
}

function lobbyColumn(g, x, w, P) {
  box(g, x, 14, w, 190, P.column, P.ink, LW);
  // fluting
  g.beginPath();
  for (let k = 1; k < 4; k++) { g.moveTo(x + (w * k) / 4, 30); g.lineTo(x + (w * k) / 4, 186); }
  pen(g, P.columnDk, 0.6);
  g.stroke();
  // brass capital and a verde base
  box(g, x - 1.5, 14, w + 3, 9, P.brass, P.ink, LW);
  lines(g, [x - 1.5, 17, x + w + 1.5, 17, x - 1.5, 20, x + w + 1.5, 20], P.brassDk, 0.5);
  box(g, x - 1.5, 92.5, w + 3, 6, P.band, P.ink, LW);
  box(g, x - 2, 188, w + 4, 16, P.marble, P.ink, LW);
  box(g, x - 2, 188, w + 4, 2, P.brass, P.ink, LWF);
}

function lobbyLift(g, h, P) {
  const { x, y, w } = h;
  const hh = h.h;
  // stepped deco surround in verde marble with a brass lining
  poly(g, [x - 5, WALL_BASE, x - 5, y - 4, x - 2, y - 4, x - 2, y - 16, x + w / 2 - 6, y - 16, x + w / 2 - 6, y - 21,
    x + w / 2 + 6, y - 21, x + w / 2 + 6, y - 16, x + w + 2, y - 16, x + w + 2, y - 4, x + w + 5, y - 4, x + w + 5, WALL_BASE], P.marble, P.ink, LW);
  g.beginPath();
  for (const vx of [x - 3.4, x + w + 3.4]) { g.moveTo(vx, y + 10); g.quadraticCurveTo(vx + 1.2, y + 30, vx - 0.6, y + 52); }
  pen(g, P.marbleVein, 0.45);
  g.stroke();
  box(g, x - 1.5, y - 1.5, w + 3, hh + 1.5, P.brass, P.ink, LWF);
  // the car inside, lit
  box(g, x, y, w, hh, P.carLit, P.ink, LWF);
  poly(g, [x, y, x + 5, y + 5, x + 5, y + hh - 6, x, y + hh], P.carSide, P.ink, LWF);
  poly(g, [x + w, y, x + w - 5, y + 5, x + w - 5, y + hh - 6, x + w, y + hh], P.carSide, P.ink, LWF);
  poly(g, [x, y + hh, x + 5, y + hh - 6, x + w - 5, y + hh - 6, x + w, y + hh], P.carFloor, P.ink, LWF);
  line(g, x + 5, y + hh * 0.55, x + w - 5, y + hh * 0.55, P.brassDk, 0.9);
  box(g, x + 9, y + 10, w - 18, hh * 0.32, '#fff6d6', P.ink, LWF);
  // the dial: a brass half-moon with its numbers, the needle drawn per frame
  const dx = x + w / 2;
  const dy = y - 6;
  g.beginPath();
  g.arc(dx, dy, 8, Math.PI, TAU);
  g.closePath();
  fs(g, P.brass, P.ink, LWF);
  g.beginPath();
  g.arc(dx, dy, 6.4, Math.PI, TAU);
  g.closePath();
  fs(g, '#f6ecd0', P.ink, LWF);
  g.beginPath();
  for (let k = 0; k <= 6; k++) {
    const a = Math.PI + (k / 6) * Math.PI;
    g.moveTo(dx + Math.cos(a) * 5.2, dy + Math.sin(a) * 5.2);
    g.lineTo(dx + Math.cos(a) * 6.2, dy + Math.sin(a) * 6.2);
  }
  pen(g, P.ink, 0.35);
  g.stroke();
  // the call buttons on the surround
  box(g, x + w + 1.6, y + hh * 0.48, 2.6, 6, P.brass, P.ink, LWF);
  circ(g, x + w + 2.9, y + hh * 0.48 + 1.7, 0.7, '#f6ecd0');
  circ(g, x + w + 2.9, y + hh * 0.48 + 4.3, 0.7, '#f6ecd0');
}

function lobbyLogo(g, h, P) {
  const { x, y } = h;
  const ex = x + 22;
  const ey = y + 28;
  // the egg mark: a brass ring, verde field, a cream egg with its famous crack
  circ(g, ex + 0.9, ey + 1.1, 22, P.wallShade);
  circ(g, ex, ey, 22, P.brass, P.ink, LW);
  circ(g, ex, ey, 18.5, P.band, P.ink, LWF);
  g.beginPath();
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * TAU;
    g.moveTo(ex + Math.cos(a) * 19.8, ey + Math.sin(a) * 19.8);
    g.lineTo(ex + Math.cos(a) * 21, ey + Math.sin(a) * 21);
  }
  pen(g, P.brassDk, 0.5);
  g.stroke();
  g.beginPath();
  eggPath(g, ex, ey + 1, 10, 13.5);
  fs(g, '#f6ecd2', P.ink, LW);
  g.beginPath();
  g.moveTo(ex - 9.6, ey + 1);
  g.lineTo(ex - 5, ey - 2.5);
  g.lineTo(ex - 1.5, ey + 2);
  g.lineTo(ex + 2.5, ey - 3);
  g.lineTo(ex + 6, ey + 1.5);
  g.lineTo(ex + 9.7, ey - 1);
  pen(g, P.ink, LW);
  g.stroke();
  g.save();
  g.beginPath();
  eggPath(g, ex, ey + 1, 10, 13.5);
  g.clip();
  g.fillStyle = '#e6d6ae';
  g.beginPath();
  g.ellipse(ex + 6, ey + 6, 8, 11, -0.3, 0, TAU);
  g.fill();
  g.restore();
  g.beginPath();
  eggPath(g, ex, ey + 1, 10, 13.5);
  pen(g, P.ink, LW);
  g.stroke();
  // the name in raised brass capitals, their flat shadow on the stone
  letters(g, 'EGGCORP', x + 52, y + 36, 16, { ink: P.brass, lw: 2.5, outline: P.ink, olw: 0.55, shadow: P.wallShade, sdx: 1.4, sdy: 1.6 });
  line(g, x + 52, y + 42, x + 148, y + 42, P.brassDk, 0.9);
  letters(g, 'WORLD HEADQUARTERS', x + 100, y + 50.5, 4.4, { ink: P.ink, lw: 0.5, align: 'center', track: 1.3 });
}

function clockFace(g, cx, cy, r, bezel, face, P, roman = false) {
  circ(g, cx + 0.6, cy + 0.8, r + 1.6, 'rgba(0,0,0,0.08)');
  circ(g, cx, cy, r + 1.6, bezel, P.ink, LW);
  circ(g, cx, cy, r, face, P.ink, LWF);
  g.beginPath();
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU;
    const r0 = k % 3 === 0 ? r * 0.7 : r * 0.82;
    g.moveTo(cx + Math.sin(a) * r0, cy - Math.cos(a) * r0);
    g.lineTo(cx + Math.sin(a) * r * 0.94, cy - Math.cos(a) * r * 0.94);
  }
  pen(g, P.ink, roman ? 0.55 : 0.45);
  g.stroke();
}

function cityPainting(g, h, P) {
  const { x, y, w } = h;
  const hh = h.h;
  box(g, x - 1, y - 1, w + 2, hh + 2, 'rgba(0,0,0,0.1)');
  box(g, x, y, w, hh, P.brass, P.ink, LW);
  box(g, x + 3, y + 3, w - 6, hh - 6, '#f3ead6', P.ink, LWF);
  const ix = x + 5;
  const iy = y + 5;
  const iw = w - 10;
  const ih = hh - 10;
  box(g, ix, iy, iw, ih, '#a9d3ee', P.ink, LWF);
  g.save();
  g.beginPath();
  g.rect(ix, iy, iw, ih);
  g.clip();
  const bl = [[0, 22, '#d9c8a6'], [5, 14, '#c8a28a'], [10, 30, '#e6dac0'], [16, 9, '#b9c4ca'], [21, 20, '#d4b48f']];
  for (const [bx, bh, c] of bl) box(g, ix + bx, iy + ih - 8 - bh, 6, bh, c, P.ink, 0.35);
  // the tower itself, tallest, with the egg on top
  box(g, ix + iw / 2 - 2.5, iy + 5, 5, ih - 13, '#e9dfc8', P.ink, 0.35);
  circ(g, ix + iw / 2, iy + 4, 1.6, '#e2b84f', P.ink, 0.3);
  box(g, ix, iy + ih - 8, iw, 8, '#6d9fc0', P.ink, 0.35);
  lines(g, [ix + 3, iy + ih - 5, ix + 9, iy + ih - 5, ix + 14, iy + ih - 3, ix + 22, iy + ih - 3], '#d6ebf5', 0.4);
  g.restore();
}

// ------------------------------------------------------------- floor 23
function openWallBay(g, x0, x1, P, F) {
  box(g, x0, F.ceilingY, x1 - x0, WALL_BASE - F.ceilingY, P.wall);
  openDado(g, x0, x1, P);
  openBulkhead(g, x0, x1, P, F);
  // sockets on the dado, every so often
  for (let x = x0 + 30; x < x1 - 10; x += 74) {
    box(g, x, 186, 5, 4, '#eeeadc', P.ink, LWF);
    lines(g, [x + 1.6, 187.2, x + 1.6, 188.6, x + 3.4, 187.2, x + 3.4, 188.6], P.ink, 0.35);
  }
}
function openDado(g, x0, x1, P) {
  box(g, x0, 168, x1 - x0, 30, P.dado);
  box(g, x0, 165.5, x1 - x0, 3, P.rail, P.ink, LWF);
  box(g, x0, 197, x1 - x0, 7, P.skirting, P.ink, LW);
}
function openBulkhead(g, x0, x1, P, F) {
  // the cable tray along the top of the wall, on its brackets
  box(g, x0, F.ceilingY + 3, x1 - x0, 2.6, '#d9d6c8', P.ink, LWF);
  g.beginPath();
  for (let x = x0 + 8; x < x1; x += 24) { g.moveTo(x, F.ceilingY + 5.6); g.lineTo(x, F.ceilingY + 8); }
  pen(g, P.ink, 0.4);
  g.stroke();
  line(g, x0, F.ceilingY + 0.5, x1, F.ceilingY + 0.5, P.ink, LW);
}

function openGlass(g, x0, x1, b, P, F) {
  const G = F.glass;
  box(g, x0, F.ceilingY, x1 - x0, G.top - F.ceilingY, P.wall);
  openBulkhead(g, x0, x1, P, F);
  box(g, x0, G.bottom, x1 - x0, WALL_BASE - G.bottom, P.wall);
  openDado(g, x0, x1, P);
  const n = Math.max(1, Math.round((x1 - x0) / G.mullion));
  const pitch = (x1 - x0) / n;
  const gh = G.bottom - G.top;
  // shine
  g.save();
  g.beginPath();
  g.rect(x0, G.top, x1 - x0, gh);
  g.clip();
  g.beginPath();
  for (let i = 0; i < n; i++) {
    if (hash(b.seed * 0.31 + i * 2.3) < 0.5) continue;
    const px = x0 + i * pitch;
    const yy = G.top + gh * (0.45 + 0.3 * hash(i * 7 + b.seed));
    g.moveTo(px + 8, yy + 16); g.lineTo(px + 24, yy - 4);
    g.moveTo(px + 13, yy + 17); g.lineTo(px + 27, yy);
  }
  pen(g, 'rgba(255,255,255,0.5)', 0.9);
  g.stroke();
  g.restore();
  // venetian blinds: slats with the sky between them, ladder cords, the bottom rail
  const bh = gh * b.blinds;
  if (bh > 0) {
    for (let y = G.top + 1; y < G.top + bh - 1.5; y += 3) {
      box(g, x0, y, x1 - x0, 2.1, P.blind);
      line(g, x0, y + 2.1, x1, y + 2.1, P.blindDk, 0.5);
    }
    box(g, x0, G.top + bh - 2.4, x1 - x0, 2.4, P.blindDk, P.ink, LWF);
    g.beginPath();
    for (let x = x0 + 14; x < x1; x += 34) { g.moveTo(x, G.top); g.lineTo(x, G.top + bh - 2.4); }
    pen(g, 'rgba(150,140,110,0.7)', 0.4);
    g.stroke();
    const cx = x1 - 6;
    line(g, cx, G.top + bh, cx, G.top + bh + 14, P.blindDk, 0.45);
    ell(g, cx, G.top + bh + 15.2, 0.9, 1.4, P.blindDk, P.ink, 0.3);
  } else {
    // drawn right up: a stack of slats under the headrail
    box(g, x0, G.top, x1 - x0, 4.2, P.blind, P.ink, LWF);
    lines(g, [x0, G.top + 1.4, x1, G.top + 1.4, x0, G.top + 2.8, x1, G.top + 2.8], P.blindDk, 0.4);
  }
  box(g, x0, G.top - 2.2, x1 - x0, 2.2, P.frameLt, P.ink, LWF);
  // the aluminium frame and mullions
  for (let i = 0; i <= n; i++) box(g, x0 + i * pitch - 1, G.top, 2, gh, P.frame, P.ink, LWF);
  box(g, x0, G.top, x1 - x0, 1.6, P.frame, P.ink, LWF);
  // the sill, with its flat shadow, and the radiators under it
  box(g, x0 - 1, G.bottom, x1 - x0 + 2, 3.2, P.sill, P.ink, LW);
  box(g, x0, G.bottom + 3.2, x1 - x0, 1.6, P.wallShade);
  const rn = Math.max(1, Math.round((x1 - x0) / 70));
  const rp = (x1 - x0) / rn;
  for (let i = 0; i < rn; i++) radiator(g, x0 + i * rp + 6, rp - 12, P);
}

function radiator(g, x, w, P) {
  const y0 = 160;
  const y1 = 193;
  lines(g, [x - 2, y1 - 3, x - 2, WALL_BASE, x + w + 2, y1 - 3, x + w + 2, WALL_BASE], P.radLine, 1.2);
  box(g, x, y0, w, y1 - y0, P.radiator, P.ink, LWF);
  g.beginPath();
  for (let fx = x + 2.4; fx < x + w - 1; fx += 2.4) { g.moveTo(fx, y0 + 2); g.lineTo(fx, y1 - 2); }
  pen(g, P.radLine, 0.5);
  g.stroke();
  box(g, x - 1, y0, w + 2, 2, P.radiator, P.ink, LWF);
  box(g, x - 1, y1 - 2, w + 2, 2, P.radiator, P.ink, LWF);
  circ(g, x + w + 2, y1 - 4, 1.3, '#c64a3e', P.ink, 0.3);
}

function openColumn(g, x, w, P, F) {
  box(g, x, F.ceilingY, w, WALL_BASE - F.ceilingY, P.column, P.ink, LW);
  lines(g, [x + 1.8, F.ceilingY + 2, x + 1.8, WALL_BASE - 8, x + w - 1.8, F.ceilingY + 2, x + w - 1.8, WALL_BASE - 8], P.columnDk, 0.55);
  box(g, x, 165.5, w, 3, P.rail, P.ink, LWF);
  box(g, x - 0.5, 197, w + 1, 7, P.skirting, P.ink, LW);
  // a switch plate on some of them
  if (Math.round(mod(x, F.wall.period)) % 3 === 0) box(g, x + w / 2 - 2, 128, 4, 6, '#eeeadc', P.ink, LWF);
}

function steelLift(g, h, P, wood = false) {
  const { x, y, w } = h;
  const hh = h.h;
  const surround = wood ? P.woodDk : P.steelDk;
  box(g, x - 4, y - 4, w + 8, hh + 4, surround, P.ink, LW);
  box(g, x - 1.5, y - 1.5, w + 3, hh + 1.5, wood ? P.brassDk : P.steel, P.ink, LWF);
  box(g, x, y, w, hh, P.carLit, P.ink, LWF);
  poly(g, [x, y, x + 5, y + 5, x + 5, y + hh - 6, x, y + hh], P.carSide, P.ink, LWF);
  poly(g, [x + w, y, x + w - 5, y + 5, x + w - 5, y + hh - 6, x + w, y + hh], P.carSide, P.ink, LWF);
  poly(g, [x, y + hh, x + 5, y + hh - 6, x + w - 5, y + hh - 6, x + w, y + hh], P.carFloor, P.ink, LWF);
  line(g, x + 5, y + hh * 0.55, x + w - 5, y + hh * 0.55, P.brassDk, 0.9);
  // the indicator panel
  box(g, x + w / 2 - 8, y - 13, 16, 8, wood ? P.brass : '#2e3036', P.ink, LWF);
  // call buttons
  box(g, x + w + 6, y + hh * 0.46, 3, 7, wood ? P.brass : P.steelLt, P.ink, LWF);
  circ(g, x + w + 7.5, y + hh * 0.46 + 2, 0.8, '#f6ecd0', P.ink, 0.25);
  circ(g, x + w + 7.5, y + hh * 0.46 + 5, 0.8, '#f6ecd0', P.ink, 0.25);
}

function whiteboard(g, h, P) {
  const { x, y, w } = h;
  const hh = h.h;
  box(g, x + 1, y + 1.2, w, hh, P.wallShade);
  box(g, x, y, w, hh, P.frame, P.ink, LW);
  box(g, x + 2, y + 2, w - 4, hh - 4, '#f8f8f1', P.ink, LWF);
  // axes, bars, and the line that only goes up
  const ax = x + 12;
  const ay = y + hh - 10;
  lines(g, [ax, y + 9, ax, ay, ax, ay, x + w - 8, ay], '#3a5aa8', 0.6);
  const bars = [6, 9, 8, 13, 18, 25];
  bars.forEach((v, k) => box(g, ax + 5 + k * 11, ay - v, 6, v, null, '#3c8a5a', 0.55));
  g.beginPath();
  g.moveTo(ax + 3, ay - 6);
  [[14, -9], [25, -8], [36, -15], [47, -19], [58, -26], [70, -36]].forEach(([dx, dy]) => g.lineTo(ax + dx, ay + dy));
  pen(g, '#c8433a', 0.8);
  g.stroke();
  poly(g, [ax + 70, ay - 36, ax + 66, ay - 35.5, ax + 69, ay - 32], '#c8433a', '#c8433a', 0.4);
  letters(g, 'GROWTH!', x + 15, y + 11, 4.2, { ink: '#c8433a', lw: 0.6, slant: 0.1 });
  letters(g, 'Q1 Q2 Q3 Q4', ax + 33, ay + 6, 2.6, { ink: '#3a5aa8', lw: 0.4, align: 'center' });
  // the tray: markers and an eraser
  box(g, x + 4, y + hh - 1, w - 8, 2.2, P.frame, P.ink, LWF);
  [['#c8433a', 18], ['#3a5aa8', 26], ['#3c8a5a', 33]].forEach(([c, dx]) => { box(g, x + dx, y + hh - 2.6, 6, 1.6, '#eeeee6', P.ink, 0.3); box(g, x + dx, y + hh - 2.6, 1.6, 1.6, c); });
  box(g, x + w - 22, y + hh - 3.4, 9, 2.4, '#3d3f48', P.ink, 0.3);
}

function poster(g, h, P) {
  const { x, y, w, label } = h;
  const hh = h.h;
  box(g, x + 1, y + 1.2, w, hh, P.wallShade || 'rgba(0,0,0,0.1)');
  box(g, x, y, w, hh, '#2e2c2a', P.ink, LW);
  const ix = x + 1.6;
  const iy = y + 1.6;
  const iw = w - 3.2;
  const ih = hh - 3.2;
  if (label === 'SYNERGY') {
    box(g, ix, iy, iw, ih, '#e3b04a', P.ink, LWF);
    circ(g, ix + iw * 0.38, iy + ih * 0.38, iw * 0.24, '#3b5f93', P.ink, LWF);
    circ(g, ix + iw * 0.62, iy + ih * 0.38, iw * 0.24, '#d4573f', P.ink, LWF);
    g.save();
    g.beginPath();
    g.arc(ix + iw * 0.38, iy + ih * 0.38, iw * 0.24, 0, TAU);
    g.clip();
    circ(g, ix + iw * 0.62, iy + ih * 0.38, iw * 0.24, '#f3e6c4', P.ink, LWF);
    g.restore();
    letters(g, 'SYNERGY', ix + iw / 2, iy + ih - 4, 4, { ink: '#2a2f46', lw: 0.62, align: 'center', track: 0.8 });
  } else if (label === 'HANG IN THERE') {
    box(g, ix, iy, iw, ih, '#bde0ef', P.ink, LWF);
    g.beginPath();
    g.moveTo(ix, iy + 7);
    g.quadraticCurveTo(ix + iw * 0.5, iy + 5, ix + iw, iy + 9);
    pen(g, '#6b4a30', 1.4);
    g.stroke();
    ell(g, ix + iw * 0.78, iy + 6.8, 2.4, 1.2, '#6aa15b', '#3f6f3a', 0.3, 0.4);
    // the kitten, by its front paws
    const kx = ix + iw * 0.5;
    const ky = iy + 6.5;
    lines(g, [kx - 1.6, ky, kx - 1.4, ky + 6, kx + 1.6, ky, kx + 1.4, ky + 6], '#8d8d99', 1.2);
    ell(g, kx, ky + 11, 3.4, 5, '#9a9aa6', P.ink, 0.4);
    circ(g, kx, ky + 5.5, 3.2, '#9a9aa6', P.ink, 0.4);
    poly(g, [kx - 3, ky + 4, kx - 2.4, ky + 1.6, kx - 1, ky + 3], '#9a9aa6', P.ink, 0.35);
    poly(g, [kx + 3, ky + 4, kx + 2.4, ky + 1.6, kx + 1, ky + 3], '#9a9aa6', P.ink, 0.35);
    circ(g, kx - 1.1, ky + 5.4, 0.45, P.ink);
    circ(g, kx + 1.1, ky + 5.4, 0.45, P.ink);
    g.beginPath();
    g.moveTo(kx + 2.5, ky + 14);
    g.quadraticCurveTo(kx + 6, ky + 16, kx + 5, ky + 11);
    pen(g, P.ink, 0.5);
    g.stroke();
    lines(g, [kx - 1.5, ky + 15.5, kx - 1.8, ky + 18, kx + 1.5, ky + 15.5, kx + 1.8, ky + 18], '#8d8d99', 1.1);
    letters(g, 'HANG IN', ix + iw / 2, iy + ih - 7.5, 3.4, { ink: '#2a2f46', lw: 0.55, align: 'center', track: 0.8 });
    letters(g, 'THERE', ix + iw / 2, iy + ih - 2.5, 3.4, { ink: '#2a2f46', lw: 0.55, align: 'center', track: 0.8 });
  } else {
    // TEAMWORK: a racing eight under a pale sky
    box(g, ix, iy, iw, ih, '#3b5f93', P.ink, LWF);
    box(g, ix, iy + ih * 0.42, iw, ih * 0.22, '#7fa9d6');
    const wy = iy + ih * 0.6;
    poly(g, [ix + 2, wy - 1, ix + iw - 2, wy - 1, ix + iw - 5, wy + 1.4, ix + 4, wy + 1.4], '#f3e6c4', P.ink, 0.35);
    for (let k = 0; k < 4; k++) {
      const rx = ix + 6 + k * (iw - 12) / 3;
      circ(g, rx, wy - 4.6, 1.2, '#f3e6c4');
      box(g, rx - 0.9, wy - 3.6, 1.8, 2.6, '#f3e6c4');
      line(g, rx + 0.5, wy - 2.4, rx - 4, wy + 3, '#f3e6c4', 0.5);
    }
    lines(g, [ix + 2, wy + 3.4, ix + 8, wy + 3.4, ix + 14, wy + 4.8, ix + 24, wy + 4.8], '#a9c7e6', 0.4);
    letters(g, 'TEAMWORK', ix + iw / 2, iy + ih - 4, 3.5, { ink: '#f3e6c4', lw: 0.58, align: 'center', track: 0.7 });
  }
}

function meetingDoor(g, h, P) {
  const { x, y, w } = h;
  const hh = h.h;
  box(g, x - 3, y - 3, w + 6, hh + 3, '#ece6d4', P.ink, LW);
  box(g, x, y, w, hh, '#b98a58', P.ink, LWF);
  box(g, x + 4, y + 4, w - 8, hh * 0.42, '#d8e5e4', P.ink, LWF);
  // name on the glass in neat black capitals
  letters(g, 'MEETING', x + w / 2, y + 12.5, 3.6, { ink: P.ink, lw: 0.55, align: 'center' });
  letters(g, '4B', x + w / 2, y + 19, 4.4, { ink: P.ink, lw: 0.65, align: 'center' });
  box(g, x + 4, y + hh * 0.42 + 8, w - 8, hh * 0.4, null, '#8f6740', 0.55);
  box(g, x + w - 7, y + hh * 0.52, 4, 1.6, P.brass, P.ink, 0.35);
  // IN USE, glowing red
  box(g, x + w / 2 - 10, y - 11, 20, 6.4, '#2e2c2a', P.ink, LWF);
  box(g, x + w / 2 - 8.8, y - 9.9, 17.6, 4.2, '#d83a32');
  letters(g, 'IN USE', x + w / 2, y - 6.4, 2.8, { ink: '#fff2e2', lw: 0.42, align: 'center' });
  // a light switch and a card reader
  box(g, x + w + 5, y + 30, 4, 6, '#eeeadc', P.ink, LWF);
  box(g, x + w + 5.3, y + 39, 3.4, 5, '#3d3f48', P.ink, LWF);
  circ(g, x + w + 7, y + 40.5, 0.6, '#6cd06a');
  // the thermostat everyone argues about, and the exit sign
  rbox(g, x - 15, y + 22, 7, 9, 1.5, '#eeeadc', P.ink, LWF);
  circ(g, x - 11.5, y + 26.5, 2.2, '#d6d2c2', P.ink, 0.3);
  line(g, x - 11.5, y + 26.5, x - 10.3, y + 25, '#c8433a', 0.45);
  box(g, x + w / 2 - 9, y - 26, 18, 7, '#2f8a4e', P.ink, LWF);
  letters(g, 'EXIT', x + w / 2, y - 20.6, 3.8, { ink: '#f2f8ee', lw: 0.6, align: 'center' });
}

function extinguisher(g, h, P) {
  const { x, y, w } = h;
  const hh = h.h;
  box(g, x - 1, y + 4, w + 2, 2, '#4a4a50', P.ink, 0.35);
  rbox(g, x, y + 2, w, hh - 2, 2.5, '#d23c30', P.ink, LW);
  box(g, x + 2, y - 1, w - 4, 3.4, '#2e2c2a', P.ink, LWF);
  g.beginPath();
  g.moveTo(x + w - 2, y + 0.5);
  g.quadraticCurveTo(x + w + 3, y + 4, x + w + 1.5, y + 11);
  pen(g, '#2e2c2a', 0.9);
  g.stroke();
  box(g, x + 1.5, y + 7, w - 3, 4.5, '#f2e6d2', P.ink, 0.3);
  // the call point above it
  box(g, x - 1, y - 18, 8, 8, '#d23c30', P.ink, LWF);
  box(g, x + 1, y - 16, 4, 4, '#f2e6d2', P.ink, 0.3);
}

// ---------------------------------------------------------------- floor 88
function execPanels(g, x0, x1, P, F) {
  const top = F.ceilingY;
  box(g, x0, top, x1 - x0, WALL_BASE - top, P.wood);
  // cornice
  box(g, x0, top, x1 - x0, 7, P.woodDk, P.ink, LW);
  box(g, x0, top + 5, x1 - x0, 2, P.brass, P.ink, LWF);
  // the panels: raised fields, lit flat from the top-left, shadowed flat bottom-right
  const n = Math.max(1, Math.round((x1 - x0) / 34));
  const pw = (x1 - x0) / n;
  const rows = [[top + 12, 146], [157, 193]];
  for (let i = 0; i < n; i++) {
    const px = x0 + i * pw;
    for (const [y0, y1] of rows) {
      const ix = px + 4;
      const iw = pw - 8;
      box(g, ix, y0, iw, y1 - y0, P.panel, P.ink, LWF);
      poly(g, [ix + iw, y0, ix + iw, y1, ix, y1, ix + 2, y1 - 2, ix + iw - 2, y1 - 2, ix + iw - 2, y0 + 2], P.woodDk);
      poly(g, [ix, y1, ix, y0, ix + iw, y0, ix + iw - 2, y0 + 2, ix + 2, y0 + 2, ix + 2, y1 - 2], P.panelLt);
      box(g, ix + 2, y0 + 2, iw - 4, y1 - y0 - 4, null, P.woodLine, 0.4);
      box(g, ix, y0, iw, y1 - y0, null, P.ink, LWF);
    }
  }
  // dado rail and skirting
  box(g, x0, 148.5, x1 - x0, 4, P.woodLt, P.ink, LWF);
  line(g, x0, 150.5, x1, 150.5, P.woodDk, 0.5);
  box(g, x0, 196, x1 - x0, 8, P.woodDk, P.ink, LW);
  line(g, x0, 197.5, x1, 197.5, P.woodLt, 0.6);
}

function execGlass(g, x0, x1, b, P, F) {
  const G = F.glass;
  box(g, x0, F.ceilingY, x1 - x0, G.top - F.ceilingY, P.woodDk, P.ink, LW);
  box(g, x0, F.ceilingY + 4, x1 - x0, 2, P.brass, P.ink, LWF);
  const n = Math.max(1, Math.round((x1 - x0) / G.mullion));
  const pitch = (x1 - x0) / n;
  const gh = G.bottom - G.top;
  g.save();
  g.beginPath();
  g.rect(x0, G.top, x1 - x0, gh);
  g.clip();
  g.beginPath();
  for (let i = 0; i < n; i++) {
    if (hash(b.seed * 0.29 + i * 5.3) < 0.5) continue;
    const px = x0 + i * pitch;
    const yy = G.top + 20 + gh * 0.4 * hash(i * 3 + b.seed);
    g.moveTo(px + 8, yy + 26); g.lineTo(px + 30, yy);
    g.moveTo(px + 14, yy + 27); g.lineTo(px + 33, yy + 5);
  }
  pen(g, 'rgba(255,236,220,0.28)', 1);
  g.stroke();
  g.restore();
  for (let i = 0; i <= n; i++) box(g, x0 + i * pitch - 0.9, G.top, 1.8, gh, P.frame, P.ink, LWF);
  box(g, x0, G.top, x1 - x0, 1.6, P.frame, P.ink, LWF);
  box(g, x0, G.bottom, x1 - x0, WALL_BASE - G.bottom, P.woodDk, P.ink, LW);
  line(g, x0, G.bottom + 1.2, x1, G.bottom + 1.2, P.brass, 0.6);
}

function execColumn(g, x, w, P, F) {
  box(g, x, F.ceilingY, w, WALL_BASE - F.ceilingY, P.column, P.ink, LW);
  box(g, x + 3, F.ceilingY + 10, w - 6, WALL_BASE - F.ceilingY - 22, P.columnDk, P.ink, LWF);
  for (const y of [F.ceilingY + 6, 148, 194]) box(g, x - 1, y, w + 2, 3, P.brass, P.ink, LWF);
}

// Don K. Eggshell PhD, founder, as he is now: the SILVER PROFESSOR (src/sprites/props.js,
// "the professor"). An egg-on-end head, a wild mane standing up and out lock by lock in
// three greys, fine rectangular specs, thick angry brows, a big silver moustache over a
// flat frown, a pale stubble chin, a pointed white collar, and the black cape's red-lined
// collar standing up behind his shoulders. Drawn in the clear line at the size of a bust.
const PROF = {
  skin: '#eec9a8', skinDk: '#e0b68e', stubble: '#dcbc9e', chin: '#e6e1dc',
  tones: [['#dfe2ea', '#c6cbd9'], ['#cdd3e0', '#b1b9ca'], ['#bcc3d2', '#a0a8bb']],
  stache: '#cdd3e0', rim: '#3d3d48', lens: '#c8e0f8', cape: '#23232e', capeIn: '#b8202a', shirt: '#eceef4',
};
// The mane, as the shipped drawing lays it: [angle, length, spread, curl] per lock.
const PROF_MANE = {
  back: [[-158, 0.85, 15, 14], [-172, 0.7, 13, 18], [166, 0.62, 14, 26], [148, 0.5, 15, 30],
    [-26, 0.8, 14, -16], [-8, 0.72, 13, -20], [12, 0.6, 14, -26], [32, 0.48, 15, -30]],
  front: [[-128, 1.05, 19, 22], [-104, 1.18, 18, 20], [-80, 1.0, 17, 16], [-58, 0.82, 17, 10],
    [-146, 0.62, 14, 26], [-38, 0.56, 14, 8]],
};
function profHeadPath(g, cx, cy, rx, ry, taper = 0.7, widest = -0.16) {
  const wy = cy + ry * widest;
  const top = cy - ry;
  const bot = cy + ry;
  const k = 0.56;
  g.moveTo(cx, top);
  g.bezierCurveTo(cx + rx * k, top, cx + rx, wy - (wy - top) * k, cx + rx, wy);
  g.bezierCurveTo(cx + rx, wy + (bot - wy) * k * 0.92, cx + rx * taper * 0.9, bot - (bot - wy) * 0.1, cx, bot);
  g.bezierCurveTo(cx - rx * taper * 0.9, bot - (bot - wy) * 0.1, cx - rx, wy + (bot - wy) * k * 0.92, cx - rx, wy);
  g.bezierCurveTo(cx - rx, wy - (wy - top) * k, cx - rx * k, top, cx, top);
  g.closePath();
}
function professor(g, cx, hy, s, ink) {
  const R = 7.4 * s;
  const RY = 9.4 * s;
  const lw = 0.42;
  const fine = 0.32;
  const rad = Math.PI / 180;
  // the cape's collar standing up behind him, black without, red within
  for (const sd of [-1, 1]) {
    g.beginPath();
    g.moveTo(cx + sd * 6 * s, hy + 12.5 * s);
    g.quadraticCurveTo(cx + sd * 13.5 * s, hy + 9 * s, cx + sd * 17 * s, hy - 3.5 * s);
    g.quadraticCurveTo(cx + sd * 20 * s, hy + 5 * s, cx + sd * 18.4 * s, hy + 16 * s);
    g.closePath();
    fs(g, PROF.cape, ink, lw);
    g.beginPath();
    g.moveTo(cx + sd * 7 * s, hy + 12.6 * s);
    g.quadraticCurveTo(cx + sd * 13.2 * s, hy + 9.4 * s, cx + sd * 16.2 * s, hy - 0.8 * s);
    g.quadraticCurveTo(cx + sd * 17.8 * s, hy + 6 * s, cx + sd * 16.2 * s, hy + 14.6 * s);
    g.closePath();
    fs(g, PROF.capeIn, ink, fine);
  }
  // the cape over his shoulders
  ell(g, cx, hy + 21.5 * s, 16.5 * s, 9.5 * s, PROF.cape, ink, lw);
  line(g, cx - 11 * s, hy + 19 * s, cx - 8 * s, hy + 26 * s, '#3a3a4a', 0.5);
  line(g, cx + 11 * s, hy + 19 * s, cx + 8 * s, hy + 26 * s, '#3a3a4a', 0.5);
  // the neck and the collar's two white points
  box(g, cx - 2.6 * s, hy + 7 * s, 5.2 * s, 6 * s, PROF.skinDk, ink, fine);
  for (const sd of [-1, 1]) {
    poly(g, [cx + sd * 1.2 * s, hy + 12.6 * s, cx + sd * 8.4 * s, hy + 12 * s, cx + sd * 5 * s, hy + 18.5 * s], PROF.shirt, ink, fine);
  }
  // the mane: a lock is a blade from two roots on the skull out to a curled tip
  const hcx = cx;
  const hcy = hy - RY * 0.12;
  const hrx = R * 0.98;
  const hry = RY * 0.93;
  const lock = ([deg, len, spread, curl], fill) => {
    const px = (d, k) => hcx + Math.cos(d * rad) * hrx * k;
    const py = (d, k) => hcy + Math.sin(d * rad) * hry * k;
    const tip = deg + curl;
    g.beginPath();
    g.moveTo(px(deg - spread, 0.86), py(deg - spread, 0.86));
    g.quadraticCurveTo(px(deg - spread * 0.5, 1 + len * 0.55), py(deg - spread * 0.5, 1 + len * 0.55), px(tip, 1 + len), py(tip, 1 + len));
    g.quadraticCurveTo(px(deg + spread * 1.15, 1 + len * 0.3), py(deg + spread * 1.15, 1 + len * 0.3), px(deg + spread, 0.86), py(deg + spread, 0.86));
    g.closePath();
    fs(g, fill, ink, fine);
  };
  PROF_MANE.back.forEach((l, i) => lock(l, PROF.tones[i % 3][1]));
  // ears, the egg of a head
  for (const sd of [-1, 1]) {
    ell(g, cx + sd * R * 0.95, hy + RY * 0.02, R * 0.22, RY * 0.25, PROF.skin, ink, fine, sd * 0.28);
    g.beginPath();
    g.ellipse(cx + sd * R * 0.98, hy + RY * 0.02, R * 0.1, RY * 0.12, sd * 0.28, -1.9, 1.5);
    pen(g, 'rgba(120,80,60,0.6)', 0.3);
    g.stroke();
  }
  g.beginPath();
  profHeadPath(g, cx, hy, R, RY);
  fs(g, PROF.skin, null, 0);
  // the stubble over the jaw and the pale patch on the chin, inside the head
  g.save();
  g.beginPath();
  profHeadPath(g, cx, hy, R, RY);
  g.clip();
  g.beginPath();
  g.moveTo(cx - R, hy + RY * 0.23);
  g.quadraticCurveTo(cx, hy + RY * 0.5, cx + R, hy + RY * 0.23);
  g.lineTo(cx + R, hy + RY * 1.2);
  g.lineTo(cx - R, hy + RY * 1.2);
  g.closePath();
  g.fillStyle = PROF.stubble;
  g.fill();
  g.beginPath();
  g.moveTo(cx - R * 0.45, hy + RY * 0.72);
  g.quadraticCurveTo(cx, hy + RY * 0.92, cx + R * 0.45, hy + RY * 0.72);
  g.lineTo(cx + R * 0.4, hy + RY * 1.1);
  g.lineTo(cx - R * 0.4, hy + RY * 1.1);
  g.closePath();
  g.fillStyle = PROF.chin;
  g.fill();
  g.restore();
  g.beginPath();
  profHeadPath(g, cx, hy, R, RY);
  fs(g, null, ink, lw);
  PROF_MANE.front.forEach((l, i) => lock(l, PROF.tones[i % 3][0]));
  // thick angry brows, inner ends down
  for (const sd of [-1, 1]) {
    g.save();
    g.translate(cx + sd * R * 0.42, hy - RY * 0.53);
    g.scale(sd, 1);
    g.rotate(-0.38);
    const bw = R * 0.36;
    const bh = RY * 0.15;
    g.beginPath();
    g.moveTo(-bw, bh * 0.6);
    g.quadraticCurveTo(0, -bh * 1.1, bw, bh * 0.4);
    g.quadraticCurveTo(0, bh * 1.4, -bw, bh * 1.5);
    g.closePath();
    fs(g, '#d0d5e1', ink, 0.4);
    g.restore();
  }
  // the specs: two trapezoid lenses, a bridge, temples back to the ears
  const sy = hy - RY * 0.14;
  const hw = R * 0.4;
  const lh = RY * 0.17;
  const off = R * 0.43;
  for (const sd of [-1, 1]) {
    const lx = cx + sd * off;
    line(g, lx + sd * hw, sy - lh * 0.6, cx + sd * R * 0.97, sy + lh * 0.1, PROF.rim, 0.35);
    g.beginPath();
    g.moveTo(lx - sd * hw, sy - lh);
    g.lineTo(lx + sd * hw, sy - lh);
    g.lineTo(lx + sd * hw * 0.82, sy + lh - 0.4);
    g.quadraticCurveTo(lx + sd * hw * 0.78, sy + lh, lx + sd * hw * 0.5, sy + lh);
    g.lineTo(lx - sd * hw * 0.55, sy + lh);
    g.quadraticCurveTo(lx - sd * hw * 0.78, sy + lh, lx - sd * hw * 0.8, sy + lh - 0.4);
    g.closePath();
    fs(g, PROF.lens, PROF.rim, 0.45);
    circ(g, lx - sd * hw * 0.1, sy + lh * 0.1, 0.62 * s, '#1a1028');
    line(g, lx - hw * 0.55, sy - lh * 0.35, lx - hw * 0.15, sy - lh * 0.35, 'rgba(255,255,255,0.8)', 0.35);
  }
  box(g, cx - off - hw, sy - lh - 0.3, (off + hw) * 2, 0.75, PROF.rim);
  // nose, moustache, frown
  ell(g, cx, hy + RY * 0.06, R * 0.15, RY * 0.19, PROF.skinDk);
  g.beginPath();
  g.ellipse(cx, hy + RY * 0.06, R * 0.15, RY * 0.19, 0, 0.12 * Math.PI, 0.88 * Math.PI);
  pen(g, 'rgba(120,80,60,0.7)', 0.3);
  g.stroke();
  const my = hy + RY * 0.39;
  const span = R * 0.74;
  const drop = RY * 0.2;
  for (const sd of [-1, 1]) {
    g.beginPath();
    g.moveTo(cx, my - drop * 0.3);
    g.quadraticCurveTo(cx + sd * span * 0.45, my - drop * 0.95, cx + sd * span, my - drop * 0.1);
    g.quadraticCurveTo(cx + sd * span * 1.04, my + drop * 0.9, cx + sd * span * 0.86, my + drop * 1.3);
    g.quadraticCurveTo(cx + sd * span * 0.6, my + drop * 0.5, cx + sd * span * 0.3, my + drop * 0.62);
    g.quadraticCurveTo(cx + sd * span * 0.12, my + drop * 0.72, cx, my + drop * 0.5);
    g.closePath();
    fs(g, PROF.stache, ink, fine);
  }
  line(g, cx - R * 0.26, hy + RY * 0.62, cx + R * 0.26, hy + RY * 0.62, '#3a2a30', 0.6);
}

function founderPortrait(g, h, P) {
  const { x, y, w } = h;
  const hh = h.h;
  // the picture light above, and its flat pool of light on the panelling
  poly(g, [x + 8, y - 3, x + w - 8, y - 3, x + w + 6, y + hh * 0.55, x - 6, y + hh * 0.55], 'rgba(255,214,150,0.16)');
  box(g, x + w / 2 - 9, y - 9, 18, 3, P.brass, P.ink, LWF);
  line(g, x + w / 2, y - 6, x + w / 2, y - 2, P.brassDk, 0.8);
  // the frame: gilt, a bead, corner rosettes
  box(g, x + 1.5, y + 2, w, hh, 'rgba(0,0,0,0.2)');
  box(g, x, y, w, hh, P.brass, P.ink, LW);
  box(g, x + 2.4, y + 2.4, w - 4.8, hh - 4.8, P.brassDk, P.ink, LWF);
  box(g, x + 4.6, y + 4.6, w - 9.2, hh - 9.2, P.brassLt, P.ink, LWF);
  for (const [cx, cy] of [[x + 2.6, y + 2.6], [x + w - 2.6, y + 2.6], [x + 2.6, y + hh - 2.6], [x + w - 2.6, y + hh - 2.6]]) circ(g, cx, cy, 1.6, P.brassLt, P.ink, 0.35);
  const ix = x + 6;
  const iy = y + 6;
  const iw = w - 12;
  const ih = hh - 12;
  g.save();
  g.beginPath();
  g.rect(ix, iy, iw, ih);
  g.clip();
  // an umber ground, a bottle-green drape, and the edge of a bookcase, as portraits have
  box(g, ix, iy, iw, ih, '#4e3e30');
  poly(g, [ix, iy, ix + iw * 0.5, iy, ix + iw * 0.22, iy + 9, ix + 4, iy + ih * 0.72, ix, iy + ih * 0.78], '#2f5444', P.ink, 0.4);
  line(g, ix + iw * 0.18, iy + 2, ix + 2.5, iy + ih * 0.6, '#3f6a56', 0.6);
  box(g, ix + iw - 5, iy, 5, ih, '#5e4a36', P.ink, 0.4);
  for (let k = 0; k < 5; k++) box(g, ix + iw - 4.4, iy + 4 + k * 9, 3.8, 1.2, '#3e3024');
  professor(g, ix + iw / 2, iy + ih * 0.44, 1.1, P.ink);
  g.restore();
  // the brass plate
  box(g, x + w / 2 - 17, y + hh + 4, 34, 13, P.brass, P.ink, LWF);
  box(g, x + w / 2 - 15.6, y + hh + 5.4, 31.2, 10.2, null, P.brassDk, 0.4);
  letters(g, 'FOUNDER', x + w / 2, y + hh + 11.2, 4.2, { ink: P.ink, lw: 0.6, align: 'center' });
  letters(g, 'DON K. EGGSHELL PH.D.', x + w / 2, y + hh + 14.6, 1.9, { ink: P.ink, lw: 0.32, align: 'center', track: 0.9 });
}

function trophyCase(g, h, P) {
  const { x, y, w } = h;
  const hh = h.h;
  box(g, x, y, w, hh, P.woodDk, P.ink, LW);
  box(g, x - 2, y - 3, w + 4, 4, P.wood, P.ink, LW);
  const ix = x + 4;
  const iw = w - 8;
  const iy = y + 4;
  const ih = hh - 22;
  box(g, ix, iy, iw, ih, '#f3dda0', P.ink, LWF);
  box(g, ix, iy, iw, 3, '#e0c27c');
  const shelves = 3;
  const sh = ih / shelves;
  for (let s = 0; s < shelves; s++) {
    const sy = iy + sh * (s + 1);
    box(g, ix, sy - 2, iw, 2, P.woodLt, P.ink, LWF);
    // the silverware: cups, a plaque, a golfer, a statuette
    const items = [[0.16, 'cup'], [0.42, s === 1 ? 'plaque' : 'cup2'], [0.66, s === 0 ? 'star' : 'cup'], [0.86, 'statue']];
    items.forEach(([fx, kind], k) => {
      const cx = ix + iw * fx;
      const by = sy - 2;
      const big = (s + k) % 2 ? 1 : 0.8;
      if (kind === 'cup' || kind === 'cup2') {
        const hgt = 13 * big;
        box(g, cx - 3, by - 2.4, 6, 2.4, '#5a3a2a', P.ink, 0.35);
        box(g, cx - 0.8, by - hgt * 0.45, 1.6, hgt * 0.45 - 2.4, P.brass, P.ink, 0.35);
        g.beginPath();
        g.moveTo(cx - 4 * big, by - hgt);
        g.quadraticCurveTo(cx - 4 * big, by - hgt * 0.42, cx, by - hgt * 0.42);
        g.quadraticCurveTo(cx + 4 * big, by - hgt * 0.42, cx + 4 * big, by - hgt);
        g.closePath();
        fs(g, kind === 'cup2' ? '#d6dbe0' : P.brass, P.ink, 0.4);
        g.beginPath();
        for (const sgn of [-1, 1]) { g.moveTo(cx + sgn * 3.6 * big, by - hgt * 0.9); g.quadraticCurveTo(cx + sgn * 6.4 * big, by - hgt * 0.8, cx + sgn * 2.6 * big, by - hgt * 0.58); }
        pen(g, P.ink, 0.45);
        g.stroke();
      } else if (kind === 'plaque') {
        rbox(g, cx - 5, by - 12, 10, 12, 1.2, P.wood, P.ink, 0.4);
        box(g, cx - 3.4, by - 9.6, 6.8, 6, P.brass, P.ink, 0.3);
        letters(g, '#1', cx, by - 4.8, 2.4, { ink: P.ink, lw: 0.35, align: 'center' });
      } else if (kind === 'star') {
        box(g, cx - 2.5, by - 3, 5, 3, '#5a3a2a', P.ink, 0.35);
        g.beginPath();
        for (let q = 0; q < 10; q++) {
          const a = -Math.PI / 2 + (q / 10) * TAU;
          const r = q % 2 ? 1.8 : 4.2;
          const px = cx + Math.cos(a) * r;
          const py = by - 8 + Math.sin(a) * r;
          if (q) g.lineTo(px, py); else g.moveTo(px, py);
        }
        g.closePath();
        fs(g, P.brass, P.ink, 0.4);
      } else {
        box(g, cx - 2.4, by - 3.4, 4.8, 3.4, '#2a2420', P.ink, 0.35);
        circ(g, cx, by - 11, 1.4, P.brass, P.ink, 0.3);
        poly(g, [cx - 1.4, by - 9.6, cx + 1.4, by - 9.6, cx + 1, by - 3.4, cx - 1, by - 3.4], P.brass, P.ink, 0.3);
        line(g, cx + 1.2, by - 9, cx + 3.6, by - 12.4, P.brass, 0.7);
      }
    });
  }
  // the glass doors and their shine
  line(g, x + w / 2, iy, x + w / 2, iy + ih, P.brassDk, 0.7);
  g.beginPath();
  g.moveTo(ix + 4, iy + 30); g.lineTo(ix + 16, iy + 12);
  g.moveTo(ix + 7, iy + 32); g.lineTo(ix + 18, iy + 16);
  g.moveTo(ix + iw / 2 + 5, iy + 64); g.lineTo(ix + iw / 2 + 18, iy + 44);
  pen(g, 'rgba(255,255,255,0.6)', 0.8);
  g.stroke();
  // the cupboard below
  for (const dx of [0, iw / 2]) {
    box(g, ix + dx + 1, iy + ih + 3, iw / 2 - 2, 13, P.wood, P.ink, LWF);
    circ(g, ix + dx + (dx ? 4 : iw / 2 - 4), iy + ih + 9.5, 0.9, P.brass, P.ink, 0.3);
  }
}

function bookshelf(g, h, P) {
  const { x, y, w } = h;
  const hh = h.h;
  box(g, x - 2, y - 4, w + 4, 5, P.woodDk, P.ink, LW);
  box(g, x, y, w, hh, P.woodDk, P.ink, LW);
  const n = 6;
  const sh = (hh - 8) / n;
  const spines = ['#8c2f2a', '#2f5d46', '#2c3f6b', '#7a5a2a', '#5a2a4a', '#a0743a', '#3d3d3d', '#6b2f22'];
  for (let s = 0; s < n; s++) {
    const y0 = y + 3 + s * sh;
    const y1 = y0 + sh - 2;
    box(g, x + 3, y0, w - 6, sh - 2, '#3e2015');
    let bx = x + 4;
    let k = 0;
    while (bx < x + w - 6) {
      const r = hash(s * 41 + k * 7.3);
      if (s === 2 && bx > x + w * 0.55 && bx < x + w * 0.8) {
        // a bust of the founder, of course, and a little globe
        const cx = x + w * 0.66;
        // in marble: the egg of a head, the mane standing up in five spikes
        poly(g, [cx - 4, y1, cx + 4, y1, cx + 3, y1 - 3, cx - 3, y1 - 3], '#d9d2c2', P.ink, 0.35);
        poly(g, [cx - 3.6, y1 - 9, cx - 5.4, y1 - 12, cx - 2.4, y1 - 11.4, cx - 2, y1 - 14.4, cx, y1 - 12.2,
          cx + 2.2, y1 - 14.6, cx + 2.4, y1 - 11.4, cx + 5.4, y1 - 12.2, cx + 3.6, y1 - 9], '#e6e0d2', P.ink, 0.35);
        g.beginPath();
        profHeadPath(g, cx, y1 - 7.6, 3, 4);
        fs(g, '#d9d2c2', P.ink, 0.35);
        line(g, cx - 2.2, y1 - 8.2, cx + 2.2, y1 - 8.2, P.ink, 0.35);
        g.beginPath();
        g.moveTo(cx - 1.8, y1 - 6.2); g.quadraticCurveTo(cx, y1 - 7.2, cx + 1.8, y1 - 6.2);
        pen(g, P.ink, 0.4);
        g.stroke();
        circ(g, x + w * 0.76, y1 - 4.2, 3.4, '#c8b77a', P.ink, 0.35);
        line(g, x + w * 0.76 - 3.4, y1 - 4.2, x + w * 0.76 + 3.4, y1 - 4.2, '#8a7a4a', 0.35);
        bx = x + w * 0.82;
        continue;
      }
      if (s === 4 && k === 3) {
        // a leaning run
        const bw = 3.2;
        poly(g, [bx, y1, bx + bw, y1, bx + bw + 3, y1 - sh + 5, bx + 3, y1 - sh + 5], spines[(k + s) % 8], P.ink, 0.35);
        bx += 7;
        k++;
        continue;
      }
      const bw = 2.4 + r * 2.2;
      const bh = sh - 4 - hash(s * 13 + k) * 4;
      const c = spines[Math.floor(r * 8)];
      box(g, bx, y1 - bh, bw, bh, c, P.ink, 0.35);
      if (bw > 3) lines(g, [bx + 0.4, y1 - bh + 2, bx + bw - 0.4, y1 - bh + 2, bx + 0.4, y1 - 2.2, bx + bw - 0.4, y1 - 2.2], P.brassLt, 0.4);
      bx += bw + 0.25;
      k++;
    }
    box(g, x + 1, y1, w - 2, 2, P.wood, P.ink, LWF);
  }
  // the library ladder on its brass rail
  line(g, x - 1, y + 10, x + w + 1, y + 10, P.brass, 1);
  line(g, x - 1, y + 10, x + w + 1, y + 10, P.ink, 0.25);
  const lx = x + w * 0.18;
  lines(g, [lx, y + 8, lx - 9, y + hh, lx + 8, y + 8, lx - 1, y + hh], P.woodLt, 1.6);
  lines(g, [lx, y + 8, lx - 9, y + hh, lx + 8, y + 8, lx - 1, y + hh], P.ink, 0.3);
  g.beginPath();
  for (let k = 1; k < 12; k++) {
    const t = k / 12;
    g.moveTo(lx - 9 * t, y + 8 + (hh - 8) * t);
    g.lineTo(lx + 8 - 9 * t, y + 8 + (hh - 8) * t);
  }
  pen(g, P.woodLt, 1);
  g.stroke();
  circ(g, lx + 4, y + 9, 1.4, P.brass, P.ink, 0.3);
}

function ceoDoor(g, h, P) {
  const { x, y, w } = h;
  const hh = h.h;
  // architrave with a pediment
  box(g, x - 4, y - 4, w + 8, hh + 4, P.woodLt, P.ink, LW);
  poly(g, [x - 7, y - 4, x + w / 2, y - 13, x + w + 7, y - 4], P.woodLt, P.ink, LW);
  poly(g, [x - 3, y - 5, x + w / 2, y - 10.5, x + w + 3, y - 5], P.woodDk, P.ink, LWF);
  box(g, x, y, w, hh, P.wood, P.ink, LWF);
  line(g, x + w / 2, y, x + w / 2, y + hh, P.ink, LWF);
  for (const dx of [0, w / 2]) {
    for (const [py, ph] of [[6, hh * 0.38], [hh * 0.5, hh * 0.42]]) {
      const px = x + dx + 3;
      const pw = w / 2 - 6;
      box(g, px, y + py, pw, ph, P.panel, P.ink, LWF);
      poly(g, [px + pw, y + py, px + pw, y + py + ph, px, y + py + ph, px + 1.5, y + py + ph - 1.5, px + pw - 1.5, y + py + ph - 1.5, px + pw - 1.5, y + py + 1.5], P.woodDk);
    }
  }
  circ(g, x + w / 2 - 2.6, y + hh * 0.52, 1.2, P.brass, P.ink, 0.35);
  circ(g, x + w / 2 + 2.6, y + hh * 0.52, 1.2, P.brass, P.ink, 0.35);
  box(g, x + w / 2 - 9, y + hh * 0.43, 18, 6.4, P.brass, P.ink, LWF);
  letters(g, 'CEO', x + w / 2, y + hh * 0.43 + 5, 3.6, { ink: P.ink, lw: 0.55, align: 'center' });
}

function abstractPainting(g, h, P) {
  const { x, y, w } = h;
  const hh = h.h;
  poly(g, [x + 6, y - 3, x + w - 6, y - 3, x + w + 6, y + hh * 0.6, x - 6, y + hh * 0.6], 'rgba(255,214,150,0.14)');
  box(g, x + 1.5, y + 2, w, hh, 'rgba(0,0,0,0.2)');
  box(g, x, y, w, hh, '#2a2420', P.ink, LW);
  const ix = x + 3;
  const iy = y + 3;
  const iw = w - 6;
  const ih = hh - 6;
  box(g, ix, iy, iw, ih, '#efe6d0', P.ink, LWF);
  // a composition in the manner of the moderns: flat fields, black bars, a sun, a kidney
  box(g, ix, iy, iw * 0.34, ih * 0.6, '#c8433a', P.ink, LWF);
  box(g, ix + iw * 0.7, iy + ih * 0.58, iw * 0.3, ih * 0.42, '#2f5596', P.ink, LWF);
  box(g, ix + iw * 0.34, iy + ih * 0.78, iw * 0.36, ih * 0.22, '#e8b43c', P.ink, LWF);
  circ(g, ix + iw * 0.56, iy + ih * 0.36, ih * 0.16, '#e8b43c', P.ink, LWF);
  lines(g, [ix + iw * 0.34, iy, ix + iw * 0.34, iy + ih, ix, iy + ih * 0.6, ix + iw, iy + ih * 0.6, ix + iw * 0.7, iy + ih * 0.6, ix + iw * 0.7, iy + ih], P.ink, 1.1);
  g.beginPath();
  g.moveTo(ix + iw * 0.76, iy + ih * 0.2);
  g.bezierCurveTo(ix + iw * 0.98, iy + ih * 0.05, ix + iw * 1.0, iy + ih * 0.42, ix + iw * 0.84, iy + ih * 0.38);
  g.bezierCurveTo(ix + iw * 0.72, iy + ih * 0.36, ix + iw * 0.66, iy + ih * 0.3, ix + iw * 0.76, iy + ih * 0.2);
  fs(g, '#3a7a5a', P.ink, LWF);
}

function paintWall(g, F, P, u0, u1) {
  const Wl = F.wall;
  const per = Wl.period;
  for (const b of Wl.bays) {
    for (const x0 of copies(b.u, b.u1 - b.u, per, u0, u1)) {
      const x1 = x0 + (b.u1 - b.u);
      // `seed` is the bay's own u, so its copy one period on is drawn identically
      const bb = { ...b, u: x0, seed: b.u, revolvingDoor: b.revolvingDoor == null ? null : x0 + (b.revolvingDoor - b.u) };
      if (F.id === 'lobby') { if (b.type === 'wall') lobbyWallBay(g, x0, x1, P); else lobbyGlass(g, x0, x1, bb, P, F); }
      if (F.id === 'open') { if (b.type === 'wall') openWallBay(g, x0, x1, P, F); else openGlass(g, x0, x1, bb, P, F); }
      if (F.id === 'exec') { if (b.type === 'wall') execPanels(g, x0, x1, P, F); else execGlass(g, x0, x1, bb, P, F); }
    }
  }
  for (const c of Wl.columns) {
    for (const x of copies(c.u, c.w, per, u0, u1)) {
      if (F.id === 'lobby') lobbyColumn(g, x, c.w, P);
      if (F.id === 'open') openColumn(g, x, c.w, P, F);
      if (F.id === 'exec') execColumn(g, x, c.w, P, F);
    }
  }
  for (const h of Wl.hangs) {
    const hw = h.w || (h.r || 10) * 2;
    const left = h.kind === 'clock' ? h.u - h.r - 4 : h.u - 12;
    for (const x of copies(left, hw + 24, per, u0, u1)) {
      const hx = x + (h.u - left);
      const it = { ...h, x: hx, y: h.y ?? WALL_BASE - h.h, w: h.w ?? 0, h: h.h ?? 0 };
      switch (h.kind) {
        case 'lift': if (F.id === 'lobby') lobbyLift(g, it, P); else steelLift(g, it, P, F.id === 'exec'); break;
        case 'logo': lobbyLogo(g, it, P); break;
        case 'clock':
          if (F.id === 'lobby') clockFace(g, hx, h.y, h.r, P.brass, '#f6ecd2', P, true);
          else if (F.id === 'open') clockFace(g, hx, h.y, h.r, '#2e3036', '#fbfbf4', P);
          else clockFace(g, hx, h.y, h.r, P.brass, '#f3e7c8', P, true);
          break;
        case 'painting': if (h.variant === 1) cityPainting(g, it, P); else abstractPainting(g, it, P); break;
        case 'whiteboard': whiteboard(g, it, P); break;
        case 'poster': poster(g, it, P); break;
        case 'door': if (F.id === 'exec') ceoDoor(g, it, P); else meetingDoor(g, it, P); break;
        case 'extinguisher': extinguisher(g, it, P); break;
        case 'portrait': founderPortrait(g, it, P); break;
        case 'trophyCase': trophyCase(g, it, P); break;
        case 'bookshelf': bookshelf(g, it, P); break;
        default: break;
      }
    }
  }
}

// ------------------------------------------------- the wall's moving parts
function columnSides(ctx, f, P) {
  const top = f.ceilingY;
  for (const c of f.wall.columns) {
    for (const [xe, side] of [[c.x, -1], [c.x + c.w, 1]]) {
      // the face toward the vanishing point shows; its back edge recedes toward it
      if ((side > 0 && xe > VPX) || (side < 0 && xe < VPX)) continue;
      const xb = xe - (xe - VPX) * 0.045;
      const yt = YH + (top - YH) * 0.955;
      const yb = YH + (WALL_BASE - YH) * 0.955;
      poly(ctx, [xe, top, xb, yt, xb, yb, xe, WALL_BASE], P.columnSide, P.ink, LW);
    }
  }
}

function liftDoors(ctx, f, P) {
  for (const h of f.wall.hangs) {
    if (h.kind !== 'lift') continue;
    const { x, y, w } = h;
    const hh = h.h;
    const gap = h.open * (w / 2 - 1);
    const lit = h.open > 0.02;
    const panels = [[x, x + w / 2 - gap], [x + w / 2 + gap, x + w]];
    panels.forEach(([a, b], k) => {
      const pw = b - a;
      if (pw < 0.3) return;
      const ox = k === 0 ? b - w / 2 : a;
      ctx.save();
      ctx.beginPath();
      ctx.rect(a, y, pw, hh);
      ctx.clip();
      if (f.floor === 'lobby') {
        box(ctx, ox, y, w / 2, hh, P.brass, P.ink, LWF);
        box(ctx, ox + 3, y + 4, w / 2 - 6, hh - 8, null, P.brassDk, 0.6);
        // the deco sunburst, half on each leaf, rising from the seam
        const sx = k === 0 ? ox + w / 2 : ox;
        const sy = y + hh * 0.5;
        ctx.beginPath();
        for (let q = 0; q < 5; q++) {
          const a2 = -Math.PI / 2 + (k === 0 ? -1 : 1) * (q + 0.5) * 0.3;
          ctx.moveTo(sx + Math.cos(a2) * 4.5, sy + Math.sin(a2) * 4.5);
          ctx.lineTo(sx + Math.cos(a2) * 26, sy + Math.sin(a2) * 26);
        }
        ctx.moveTo(sx, sy - 4.5);
        ctx.arc(sx, sy, 4.5, -Math.PI / 2, k === 0 ? -Math.PI : 0, k === 0);
        ctx.moveTo(ox + 3, sy + 3);
        ctx.lineTo(ox + w / 2 - 3, sy + 3);
        pen(ctx, P.brassDk, 0.5);
        ctx.stroke();
        line(ctx, ox + 1.2, y + 1, ox + 1.2, y + hh - 1, P.brassLt, 0.6);
      } else if (f.floor === 'open') {
        box(ctx, ox, y, w / 2, hh, P.steel, P.ink, LWF);
        line(ctx, ox + (k === 0 ? 2 : w / 2 - 2), y + 2, ox + (k === 0 ? 2 : w / 2 - 2), y + hh - 2, P.steelLt, 0.8);
        box(ctx, ox + 3, y + hh * 0.45, w / 2 - 6, 1.2, P.steelDk);
      } else {
        box(ctx, ox, y, w / 2, hh, P.brass, P.ink, LWF);
        box(ctx, ox + 2.5, y + 4, w / 2 - 5, hh - 8, P.brassDk, P.ink, 0.4);
        box(ctx, ox + 4, y + 6, w / 2 - 8, hh - 12, P.brass, null, 0);
        line(ctx, ox + 1.2, y + 1, ox + 1.2, y + hh - 1, P.brassLt, 0.6);
      }
      ctx.restore();
      box(ctx, a, y, pw, hh, null, P.ink, LWF);
    });
    // the indicator
    const cx = x + w / 2;
    if (f.floor === 'lobby') {
      // the needle rests on G while the car is here, and wanders the floors while it is not
      const ang = lit ? Math.PI + 0.12 : Math.PI + 0.12 + 0.75 * Math.PI * (0.5 + 0.5 * Math.sin(f.t * 0.6 + h.i * 1.7));
      line(ctx, cx, y - 6, cx + Math.cos(ang) * 5.4, y - 6 + Math.sin(ang) * 5.4, P.ink, 0.55);
      circ(ctx, cx, y - 6, 1.1, P.brassDk, P.ink, 0.3);
      circ(ctx, cx - 9.6, y - 7, 1.1, lit ? '#ffd56a' : '#8a6a3a', P.ink, 0.3);
      box(ctx, cx - 3.4, y - 5.2, 6.8, 5.2, lit ? '#ffe7a0' : '#efe2c0', P.ink, 0.35);
      letters(ctx, h.label, cx, y - 1.1, 3.4, { ink: P.ink, lw: 0.6, align: 'center' });
    } else {
      const amber = f.floor === 'open';
      if (amber) letters(ctx, h.label, cx, y - 6.8, 4.6, { ink: lit ? '#ffb43c' : '#7a5a30', lw: 0.75, align: 'center' });
      else letters(ctx, h.label, cx, y - 6.8, 4.6, { ink: lit ? P.ink : P.brassDk, lw: 0.75, align: 'center' });
      poly(ctx, [cx + 6.4, y - 9, cx + 4.6, y - 7, cx + 8.2, y - 7], lit ? (amber ? '#ffb43c' : '#fff1b0') : (amber ? '#5a4a30' : P.brassDk));
    }
  }
}

function clockHands(ctx, f, P) {
  for (const h of f.wall.hangs) {
    if (h.kind !== 'clock') continue;
    const { cx, cy, r } = h;
    const hand = (a, l, wdt, c) => line(ctx, cx - Math.sin(a) * l * 0.18, cy + Math.cos(a) * l * 0.18, cx + Math.sin(a) * l, cy - Math.cos(a) * l, c, wdt);
    hand(f.clock.hourA, r * 0.52, 1.3, P.ink);
    hand(f.clock.minuteA, r * 0.8, 0.85, P.ink);
    hand(f.clock.secondA, r * 0.86, 0.4, '#c8302e');
    circ(ctx, cx, cy, 0.9, P.ink);
  }
}

function revolvingDoor(ctx, f, P) {
  for (const b of f.wall.bays) {
    if (b.revolvingDoor == null) continue;
    const cx = b.revolvingDoor;
    const G = f.glass;
    const y0 = G.transom + 8.8;
    const y1 = G.bottom - 4.6;
    const R = 21;
    // the drum: its curved head and its floor ring, seen a little from below and above
    ctx.beginPath();
    ctx.ellipse(cx, y0, 23, 2.2, 0, 0, Math.PI);
    pen(ctx, P.brassDk, 0.8);
    ctx.stroke();
    ell(ctx, cx, y1 + 0.6, 23, 1.6, 'rgba(90,70,50,0.35)', P.ink, 0.35);
    const wings = [0, 1, 2, 3].map((q) => {
      const a = f.revolving * Math.PI + q * Math.PI / 2;
      return { a, x: Math.cos(a) * R, z: Math.sin(a) };
    }).sort((p, q) => q.z - p.z);
    const mid = y0 + (y1 - y0) * 0.52;
    const drawWing = (wg) => {
      const front = wg.z < 0;
      const x1 = cx + wg.x;
      const lo = Math.min(cx, x1);
      const wdt = Math.abs(x1 - cx);
      if (wdt > 0.6) {
        box(ctx, lo, y0 + 2, wdt, y1 - y0 - 4, front ? 'rgba(214,236,246,0.42)' : 'rgba(170,200,215,0.3)');
        // the frame: head rail, bottom rail with its kick plate, push bar, and a glint
        lines(ctx, [lo, y0 + 2, lo + wdt, y0 + 2, lo, y1 - 2, lo + wdt, y1 - 2], front ? P.brass : P.brassDk, 1.3);
        box(ctx, lo, y1 - 7, wdt, 5, front ? P.brass : P.brassDk);
        line(ctx, lo + 0.8, mid, lo + wdt - 0.8, mid, front ? P.brass : P.brassDk, 1.1);
        if (front && wdt > 8) line(ctx, lo + wdt * 0.3, mid - 8, lo + wdt * 0.6, mid - 26, 'rgba(255,255,255,0.75)', 0.8);
        box(ctx, lo, y0 + 2, wdt, y1 - y0 - 4, null, P.ink, 0.35);
      }
      line(ctx, x1, y0 + 1, x1, y1 - 1, front ? P.brass : P.brassDk, 1.8);
      line(ctx, x1, y0 + 1, x1, y1 - 1, P.ink, 0.3);
    };
    for (const wg of wings) if (wg.z >= 0) drawWing(wg);
    box(ctx, cx - 1.2, y0, 2.4, y1 - y0, P.brassDk, P.ink, 0.35);
    for (const wg of wings) if (wg.z < 0) drawWing(wg);
  }
}

// ======================================================== CEILING AND LIGHTS
function ceiling(ctx, f, P) {
  const cy = f.ceilingY;
  if (f.floor === 'lobby') {
    box(ctx, -2, -2, W + 4, cy + 2, P.ceil);
    line(ctx, -2, cy - 0.3, W + 2, cy - 0.3, P.ink, LW);
    return;
  }
  if (f.floor === 'exec') {
    box(ctx, -2, -2, W + 4, cy + 2, P.ceil);
    box(ctx, -2, cy - 4, W + 4, 4, P.ceilDk, P.ink, LW);
    return;
  }
  // floor 23: the suspended grid, ruled toward the vanishing point
  box(ctx, -2, -2, W + 4, cy + 2, P.ceil);
  const S = f.floorPlane.shiftBottom;
  const hc = (YH - cy) / 0.24;
  const fy = (y) => (YH - y) / hc;
  const f0 = fy(cy);
  const f1 = fy(0);
  ctx.beginPath();
  const T = 80;
  const uA = S + VPX + (-20 - VPX) / f0;
  const uB = S + VPX + (W + 20 - VPX) / f0;
  for (let U = Math.floor(uA / T) * T; U < uB; U += T) {
    ctx.moveTo(xOf(U, S, f0), cy);
    ctx.lineTo(xOf(U, S, f1), 0);
  }
  for (const y of [cy - 9, cy - 21]) { ctx.moveTo(-2, y); ctx.lineTo(W + 2, y); }
  pen(ctx, P.ceilLine, 0.6);
  ctx.stroke();
  line(ctx, -2, cy - 0.3, W + 2, cy - 0.3, P.ink, LW);
}

function lights(ctx, f, P) {
  for (const l of f.lights) {
    if (l.variant === 'tube') {
      const y = f.ceilingY - 4.4;
      box(ctx, l.x - 23, y, 46, 4.4, '#cfcfc4', P.ink, LWF);
      box(ctx, l.x - 21.5, y + 0.8, 43, 2.8, l.on > 0.5 ? '#fffbe6' : '#a9a89a');
      ctx.beginPath();
      for (let k = 1; k < 8; k++) { ctx.moveTo(l.x - 21.5 + k * 43 / 8, y + 0.8); ctx.lineTo(l.x - 21.5 + k * 43 / 8, y + 3.6); }
      pen(ctx, '#c9c6b4', 0.4);
      ctx.stroke();
      continue;
    }
    if (l.variant === 'globe') {
      line(ctx, l.x, 0, l.x, l.y - 6.5, '#5a4a3a', 0.5);
      poly(ctx, [l.x - 2, l.y - 6.6, l.x + 2, l.y - 6.6, l.x + 2.6, l.y - 4.6, l.x - 2.6, l.y - 4.6], P.brass, P.ink, LWF);
      circ(ctx, l.x, l.y + 0.6, 6, '#fffaf0', P.ink, LWF);
      circ(ctx, l.x - 1.2, l.y + 0.6, 3.6, '#fff1c4');
      globeGlint(ctx, l.x, l.y + 0.6, 6);
      continue;
    }
    // exec pendant: a green enamel cone, its bulb, and a flat cone of lamplight to the floor
    const y = l.y;
    poly(ctx, [l.x - 7, y + 1, l.x + 7, y + 1, l.x + 34, MID_BASE + 1, l.x - 34, MID_BASE + 1], P.warm);
    ell(ctx, l.x, MID_BASE + 1, 34, 3, P.warmPool);
    line(ctx, l.x, 0, l.x, y - 7, '#2a1a14', 0.5);
    poly(ctx, [l.x - 2.4, y - 7, l.x + 2.4, y - 7, l.x + 8, y + 1, l.x - 8, y + 1], '#2f5d4a', P.ink, LWF);
    poly(ctx, [l.x - 2.4, y - 7, l.x - 1, y - 7, l.x - 4.4, y + 1, l.x - 8, y + 1], '#46806a');
    poly(ctx, [l.x - 2.4, y - 7, l.x + 2.4, y - 7, l.x + 8, y + 1, l.x - 8, y + 1], null, P.ink, LWF);
    ell(ctx, l.x, y + 1.2, 7.6, 1.6, '#fff1c0', P.ink, LWF);
    box(ctx, l.x - 1.6, y - 9, 3.2, 2, P.brass, P.ink, 0.3);
  }
}
function globeGlint(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r - 1.4, Math.PI * 1.1, Math.PI * 1.45);
  pen(ctx, 'rgba(255,255,255,0.9)', 0.8);
  ctx.stroke();
}

// ==================================================================== FLOOR
function floorPlane(ctx, f, P, wd) {
  const top = WALL_BASE;
  const bot = LANE_TOP;
  const S = f.floorPlane.shiftBottom;
  const id = f.floor;
  ctx.save();
  ctx.beginPath();
  ctx.rect(-2, top, W + 4, bot - top + 0.5);
  ctx.clip();
  const T = id === 'exec' ? 28 : id === 'open' ? 40 : 48;
  const base = id === 'lobby' ? P.floorA : id === 'open' ? P.carpetA : P.parqA;
  box(ctx, -2, top, W + 4, bot - top + 1, base);
  // rows from the lane back to the wall
  const rows = [];
  for (let D = 0; D < DWALL; D += T) rows.push(D);
  rows.push(DWALL);
  if (id === 'lobby' || id === 'open') {
    // the alternate tile: a checker of two close tones
    ctx.beginPath();
    for (let r = 0; r < rows.length - 1; r++) {
      const fa = fOfD(rows[r]);
      const fb = fOfD(rows[r + 1]);
      const ya = yOfF(fa);
      const yb = yOfF(fb);
      const uA = S + VPX + (-10 - VPX) / fb;
      const uB = S + VPX + (W + 10 - VPX) / fb;
      for (let m = Math.floor(uA / T); m * T < uB; m++) {
        if ((m + r) % 2) continue;
        const U0 = m * T;
        const U1 = U0 + T;
        ctx.moveTo(xOf(U0, S, fa), ya);
        ctx.lineTo(xOf(U1, S, fa), ya);
        ctx.lineTo(xOf(U1, S, fb), yb);
        ctx.lineTo(xOf(U0, S, fb), yb);
        ctx.closePath();
      }
    }
    ctx.fillStyle = id === 'lobby' ? P.floorB : P.carpetB;
    ctx.fill();
  }
  if (id === 'exec') execFloorDressing(ctx, f, P, S, rows, T);
  if (id === 'lobby') {
    // the columns and the brass lifts reflected in the polish, as flat bands
    ctx.fillStyle = P.floorRefl;
    for (const c of f.wall.columns) { ctx.fillRect(c.x + wd, top, c.w, 16); ctx.fillRect(c.x + wd + 2, top + 16, c.w - 4, 6); }
    ctx.fillStyle = 'rgba(216,167,68,0.14)';
    for (const h of f.wall.hangs) if (h.kind === 'lift') { ctx.fillRect(h.x + wd + 2, top, h.w - 4, 10); ctx.fillRect(h.x + wd + 6, top + 10, h.w - 12, 5); }
  }
  // the light through the glass, falling forward as flat lighter shapes
  if (id === 'lobby' || id === 'exec') sunPatches(ctx, f, P, wd);
  // the joints
  ctx.beginPath();
  for (let r = 1; r < rows.length; r++) {
    const y = yOfF(fOfD(rows[r]));
    ctx.moveTo(-2, y);
    ctx.lineTo(W + 2, y);
  }
  if (id !== 'exec') {
    const fa = 1;
    const fb = 0.24;
    const uA = S + VPX + (-10 - VPX) / fb;
    const uB = S + VPX + (W + 10 - VPX) / fb;
    for (let m = Math.floor(uA / T); m * T < uB; m++) {
      ctx.moveTo(xOf(m * T, S, fa), bot);
      ctx.lineTo(xOf(m * T, S, fb), top);
    }
  }
  pen(ctx, id === 'lobby' ? P.floorLine : id === 'open' ? P.carpetLine : P.parqLine, 0.45);
  ctx.stroke();
  ctx.restore();
  // the wall's foot
  line(ctx, -2, top + 0.2, W + 2, top + 0.2, P.ink, LW);
}

function execFloorDressing(ctx, f, P, S, rows, T) {
  // herringbone: each row's planks lean one way, the next row's the other
  ctx.beginPath();
  for (let r = 0; r < rows.length - 1; r++) {
    const fa = fOfD(rows[r]);
    const fb = fOfD(rows[r + 1]);
    const ya = yOfF(fa);
    const yb = yOfF(fb);
    const lean = r % 2 ? T : -T;
    const step = T * 0.5;
    const uA = S + VPX + (-10 - VPX) / fb - T;
    const uB = S + VPX + (W + 10 - VPX) / fb + T;
    for (let U = Math.floor(uA / step) * step; U < uB; U += step) {
      ctx.moveTo(xOf(U, S, fa), ya);
      ctx.lineTo(xOf(U + lean, S, fb), yb);
    }
  }
  pen(ctx, 'rgba(120,76,40,0.5)', 0.4);
  ctx.stroke();
  // the rug, laid on the floor in perspective
  const RP = 1600;
  for (const U0 of [Math.floor((S - 400) / RP) * RP + 260, Math.floor((S - 400) / RP) * RP + 260 + RP]) {
    rugAt(ctx, P, S, U0, 300, 90, 330);
  }
}
function rugAt(ctx, P, S, U0, w, D0, D1) {
  const quad = (u0, u1, d0, d1) => {
    const fa = fOfD(d0);
    const fb = fOfD(d1);
    return [xOf(u0, S, fa), yOfF(fa), xOf(u1, S, fa), yOfF(fa), xOf(u1, S, fb), yOfF(fb), xOf(u0, S, fb), yOfF(fb)];
  };
  const outer = quad(U0, U0 + w, D0, D1);
  if (Math.max(outer[0], outer[2], outer[4], outer[6]) < -10 || Math.min(outer[0], outer[2], outer[4], outer[6]) > W + 10) return;
  poly(ctx, outer, P.rug, P.rugLine, 0.5);
  poly(ctx, quad(U0 + 10, U0 + w - 10, D0 + 12, D1 - 30), P.rugBorder);
  poly(ctx, quad(U0 + 16, U0 + w - 16, D0 + 20, D1 - 50), P.rugIn, P.rugLine, 0.4);
  // fringe on the near edge
  ctx.beginPath();
  const fa = fOfD(D0);
  for (let u = U0 + 3; u < U0 + w; u += 6) { const x = xOf(u, S, fa); ctx.moveTo(x, yOfF(fa)); ctx.lineTo(x, yOfF(fa) + 1.4); }
  pen(ctx, P.rugBorder, 0.5);
  ctx.stroke();
}

// Each glass bay throws its panes forward onto the floor: flat lighter quadrilaterals whose
// sides run back to where the sun's rays vanish on the horizon, broken by each mullion.
function sunPatches(ctx, f, P, wd) {
  const sx = f.outside.sun ? f.outside.sun.x : VPX;
  const reach = f.floor === 'exec' ? 0.62 : 0.5;
  const yEnd = WALL_BASE + (LANE_TOP - WALL_BASE) * reach;
  const G = f.glass;
  ctx.fillStyle = P.sunPatch;
  ctx.beginPath();
  // The true rays fan out from the sun's foot on the horizon so fast that the patches leave
  // the frame; drawn as a cartoonist would, they lean away from the sun a little and keep
  // their panes.
  const at = (x) => x + (x - sx) * 0.3;
  for (const b of f.wall.bays) {
    if (b.type !== 'glass') continue;
    const x0 = b.x0 + wd;
    const x1 = b.x1 + wd;
    const n = Math.max(1, Math.round((b.x1 - b.x0) / G.mullion));
    const pitch = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      const a = x0 + i * pitch + 1.6;
      const c = x0 + (i + 1) * pitch - 1.6;
      ctx.moveTo(a, WALL_BASE);
      ctx.lineTo(c, WALL_BASE);
      ctx.lineTo(at(c), yEnd);
      ctx.lineTo(at(a), yEnd);
      ctx.closePath();
    }
  }
  ctx.fill();
}

// The floor's cut face under the lane: a nosing the hero runs on, then a solid face.
function slab(ctx, f, P) {
  const S = f.slab.shift;
  const top = LANE_TOP;
  const id = f.floor;
  box(ctx, -2, top, W + 4, 40, P.slab);
  if (id === 'lobby') {
    // brass nosing, a course of dressed stone, a verde plinth
    box(ctx, -2, top, W + 4, 2.6, P.brass);
    box(ctx, -2, top + 2.6, W + 4, 1.4, P.slabDk);
    box(ctx, -2, top + 26, W + 4, 14, P.marble);
    line(ctx, -2, top + 27.4, W + 2, top + 27.4, P.marbleLt, 0.7);
    ctx.beginPath();
    for (let u = Math.floor(S / 96) * 96; u < S + W + 96; u += 96) {
      const x = u - S;
      ctx.moveTo(x, top + 4);
      ctx.lineTo(x, top + 15);
      ctx.moveTo(x + 48, top + 15);
      ctx.lineTo(x + 48, top + 26);
    }
    ctx.moveTo(-2, top + 15);
    ctx.lineTo(W + 2, top + 15);
    ctx.moveTo(-2, top + 26);
    ctx.lineTo(W + 2, top + 26);
  } else if (id === 'open') {
    // the carpet's edge strip, then the slab's concrete face and its trunking
    box(ctx, -2, top, W + 4, 3, P.slabTop);
    box(ctx, -2, top + 3, W + 4, 1.4, P.slabDk);
    box(ctx, -2, top + 9, W + 4, 6, '#6b7888');
    ctx.beginPath();
    for (let u = Math.floor(S / 120) * 120; u < S + W + 120; u += 120) {
      const x = u - S;
      ctx.moveTo(x, top + 4.4);
      ctx.lineTo(x, top + 40);
      ctx.rect(x + 56, top + 10.4, 8, 3.2);
    }
    ctx.moveTo(-2, top + 9);
    ctx.lineTo(W + 2, top + 9);
    ctx.moveTo(-2, top + 15);
    ctx.lineTo(W + 2, top + 15);
  } else {
    // a mahogany nosing and a run of fielded panels
    box(ctx, -2, top, W + 4, 3, P.slabTop);
    box(ctx, -2, top + 3, W + 4, 1.4, P.slabDk);
    ctx.beginPath();
    for (let u = Math.floor(S / 64) * 64; u < S + W + 64; u += 64) {
      const x = u - S;
      ctx.moveTo(x, top + 4.4);
      ctx.lineTo(x, top + 40);
      ctx.rect(x + 6, top + 9, 52, 18);
    }
  }
  pen(ctx, P.slabLine, 0.5);
  ctx.stroke();
  line(ctx, -2, top + 0.2, W + 2, top + 0.2, P.ink, 0.7);
}

// ==================================================================== MID
const SKINS = ['#f3cfae', '#e7b78e', '#c98e64', '#f6d9bf', '#93603f'];
const HAIRS = ['#3a2a20', '#6b4529', '#d9a54f', '#2a2a30', '#b9b2a6', '#c9703a'];
const STYLES = ['short', 'bob', 'bald', 'bun', 'quiff', 'short', 'bob'];
const SHIRTS = ['#e9e4d6', '#c3d2e4', '#e6d3a8', '#d9bcb2', '#b9c9a8', '#9fb2c8'];

function personFor(seed) {
  const h = (n) => hash(seed * 13.7 + n);
  const style = STYLES[Math.floor(h(3) * STYLES.length)];
  return {
    skin: SKINS[Math.floor(h(1) * SKINS.length)],
    hair: style === 'quiff' ? '#d9903e' : HAIRS[Math.floor(h(2) * HAIRS.length)],
    style,
    shirt: SHIRTS[Math.floor(h(4) * SHIRTS.length)],
    glasses: h(5) < 0.3,
    tie: ['#c8433a', '#3b5f93', '#3c7a5a', '#8c6a2a'][Math.floor(h(6) * 4)],
  };
}

// A head seen from behind, in profile (face 'left'/'right') or face on ('front').
function head(g, x, y, r, p, face, ink, lw, closed = false) {
  const sideEar = face === 'left' ? 1 : face === 'right' ? -1 : 0;
  if (sideEar) circ(g, x + sideEar * r * 0.25, y + r * 0.15, r * 0.3, p.skin, ink, lw);
  else { circ(g, x - r * 0.95, y + r * 0.15, r * 0.28, p.skin, ink, lw); circ(g, x + r * 0.95, y + r * 0.15, r * 0.28, p.skin, ink, lw); }
  if (p.style === 'bun') circ(g, x - (sideEar || 0) * r * 0.7, y - r * (sideEar ? 0.6 : 0.95), r * 0.45, p.hair, ink, lw);
  circ(g, x, y, r, p.skin, ink, lw);
  if (face === 'left' || face === 'right') {
    const d = face === 'left' ? -1 : 1;
    circ(g, x + d * r * 0.98, y + r * 0.2, r * 0.24, p.skin, ink, lw * 0.9);
    circ(g, x + d * r * 0.5, y - r * 0.05, r * 0.11, ink);
  }
  // hair
  g.save();
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.clip();
  g.fillStyle = p.hair;
  if (p.style === 'bald') {
    if (face === 'back') { g.fillRect(x - r, y - r * 0.05, r * 2, r * 0.7); }
    else { g.fillRect(x - r, y - r * 0.15, r * 0.45, r * 0.6); g.fillRect(x + r * 0.55, y - r * 0.15, r * 0.45, r * 0.6); }
  } else if (face === 'back') {
    g.fillRect(x - r, y - r, r * 2, r * (p.style === 'bob' || p.style === 'bun' ? 1.75 : 1.45));
  } else if (face === 'front') {
    g.beginPath();
    g.ellipse(x, y - r * 0.55, r * 1.1, r * 0.62, 0, 0, TAU);
    g.fill();
    if (p.style === 'bob') { g.fillRect(x - r, y - r * 0.4, r * 0.32, r * 1.2); g.fillRect(x + r * 0.68, y - r * 0.4, r * 0.32, r * 1.2); }
  } else {
    const d = face === 'left' ? -1 : 1;
    g.beginPath();
    g.ellipse(x - d * r * 0.25, y - r * 0.45, r * 1.05, r * 0.68, 0, 0, TAU);
    g.fill();
    if (p.style === 'bob' || p.style === 'bun') g.fillRect(d > 0 ? x - r : x + r * 0.1, y - r * 0.4, r * 0.9, r * 1.1);
  }
  g.restore();
  circ(g, x, y, r, null, ink, lw);
  if (p.style === 'quiff') {
    // the famous tuft
    const d = face === 'left' ? -1 : face === 'right' ? 1 : 0.4;
    g.beginPath();
    g.moveTo(x + d * r * 0.1 - r * 0.25, y - r * 0.92);
    g.quadraticCurveTo(x + d * r * 0.5, y - r * 1.75, x + d * r * 0.9, y - r * 1.25);
    g.quadraticCurveTo(x + d * r * 0.55, y - r * 1.2, x + d * r * 0.35 + r * 0.2, y - r * 0.9);
    g.closePath();
    fs(g, p.hair, ink, lw);
  }
  if (face === 'front') {
    if (closed) {
      g.beginPath();
      g.moveTo(x - r * 0.55, y + r * 0.05); g.quadraticCurveTo(x - r * 0.35, y + r * 0.22, x - r * 0.15, y + r * 0.05);
      g.moveTo(x + r * 0.15, y + r * 0.05); g.quadraticCurveTo(x + r * 0.35, y + r * 0.22, x + r * 0.55, y + r * 0.05);
      pen(g, ink, lw * 0.9);
      g.stroke();
    } else {
      circ(g, x - r * 0.35, y, r * 0.12, ink);
      circ(g, x + r * 0.35, y, r * 0.12, ink);
    }
    g.beginPath();
    g.moveTo(x - r * 0.3, y + r * 0.55); g.quadraticCurveTo(x, y + r * (closed ? 0.62 : 0.72), x + r * 0.3, y + r * 0.55);
    pen(g, ink, lw * 0.8);
    g.stroke();
    if (p.glasses) { circ(g, x - r * 0.38, y, r * 0.26, null, ink, lw * 0.8); circ(g, x + r * 0.38, y, r * 0.26, null, ink, lw * 0.8); }
  } else if (p.glasses && face !== 'back') {
    const d = face === 'left' ? -1 : 1;
    circ(g, x + d * r * 0.55, y - r * 0.02, r * 0.24, null, ink, lw * 0.8);
  }
}

function shadowFoot(g, x, w, b) {
  g.fillStyle = 'rgba(30,20,10,0.12)';
  g.beginPath();
  g.ellipse(x + w / 2, b, w / 2 + 2, 1.8, 0, 0, TAU);
  g.fill();
}

function pot(g, cx, b, w, h, c, cDk, ink) {
  poly(g, [cx - w / 2, b - h, cx + w / 2, b - h, cx + w * 0.38, b, cx - w * 0.38, b], c, ink, LWM);
  box(g, cx - w / 2 - 1, b - h - 2.2, w + 2, 2.6, cDk, ink, LWM);
}

function leaf(g, x, y, len, wdt, ang, fill, ink, lw) {
  g.beginPath();
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  g.moveTo(x, y);
  g.quadraticCurveTo(x + ca * len * 0.5 - sa * wdt, y + sa * len * 0.5 + ca * wdt, x + ca * len, y + sa * len);
  g.quadraticCurveTo(x + ca * len * 0.5 + sa * wdt, y + sa * len * 0.5 - ca * wdt, x, y);
  fs(g, fill, ink, lw);
}

function plant(g, x, b, variant, P, seed) {
  const ink = P.inkM;
  const lf = '#5f9f5a';
  const lfDk = '#3f7f47';
  const lfLine = '#2f5a35';
  const potC = P.pot || '#c4744a';
  const potDk = P.potDk || '#9a5636';
  if (variant === 'ficus') {
    const cx = x + 15;
    line(g, cx, b - 12, cx - 1, b - 36, '#7a5a3a', 1.4);
    line(g, cx - 0.5, b - 26, cx + 6, b - 40, '#7a5a3a', 0.9);
    line(g, cx - 0.8, b - 30, cx - 6, b - 42, '#7a5a3a', 0.8);
    // the crown's mass first, dark and outlined as one, then the leaves catching light
    const lobes = [[0, -44, 11], [-7, -40, 7.5], [7, -40, 8], [-4, -51, 7], [5, -50, 7.5], [0, -33, 7]];
    g.beginPath();
    for (const [dx, dy, r] of lobes) { g.moveTo(cx + dx + r, b + dy); g.arc(cx + dx, b + dy, r, 0, TAU); }
    pen(g, lfLine, 1.0);
    g.stroke();
    g.fillStyle = lfDk;
    g.fill();
    for (let k = 0; k < 64; k++) {
      const a = hash(seed * 3 + k) * TAU;
      const rr = Math.sqrt(hash(seed * 5 + k * 1.3));
      const lx = cx + Math.cos(a) * 12 * rr;
      const ly = b - 44 + Math.sin(a) * 13 * rr;
      if (Math.sin(a) > 0.6 && rr > 0.7) continue;
      leaf(g, lx, ly, 5, 1.9, a + 0.6 + hash(k) * 0.8, k % 4 ? lf : '#78b46c', lfLine, 0.38);
    }
    pot(g, cx, b, 14, 11, potC, potDk, ink);
    return;
  }
  if (variant === 'palm') {
    const cx = x + 20;
    line(g, cx, b - 12, cx, b - 34, '#8a6a42', 1.6);
    for (let k = 0; k < 9; k++) {
      const side = k % 2 ? 1 : -1;
      const ang = -Math.PI / 2 + side * (0.25 + (k / 9) * 1.3);
      const L = 22 + hash(seed + k) * 8;
      const sx = cx;
      const sy = b - 34;
      const ex = sx + Math.cos(ang) * L;
      const ey = sy + Math.sin(ang) * L * 0.75 + L * 0.3;
      const mx = sx + Math.cos(ang) * L * 0.55;
      const my = sy + Math.sin(ang) * L * 0.75 - 4;
      for (let q = 2; q <= 10; q++) {
        const t = q / 10;
        const px = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * mx + t * t * ex;
        const py = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * my + t * t * ey;
        const ll = 7 * Math.sin(Math.PI * t) + 1.5;
        leaf(g, px, py, ll, 1.1, ang + side * 0.9 + 0.5, lf, lfLine, 0.35);
        leaf(g, px, py, ll, 1.1, ang - side * 0.4 + 1.6, lfDk, lfLine, 0.35);
      }
      g.beginPath();
      g.moveTo(sx, sy);
      g.quadraticCurveTo(mx, my, ex, ey);
      pen(g, lfLine, 0.6);
      g.stroke();
    }
    pot(g, cx, b, 18, 13, P.potAlt || potC, P.potAltDk || potDk, ink);
    return;
  }
  if (variant === 'snake') {
    const cx = x + 8;
    for (let k = 0; k < 7; k++) {
      const bx = cx - 5 + k * 1.7;
      const hgt = 18 + hash(seed + k) * 12;
      const tip = bx + (k - 3) * 1.2;
      poly(g, [bx - 1.5, b - 9, bx + 1.5, b - 9, tip + 0.4, b - 9 - hgt, tip - 0.6, b - 9 - hgt + 1], k % 2 ? '#4f8a4c' : '#5f9a52', lfLine, 0.4);
      line(g, bx - 1.2, b - 10, tip - 0.4, b - 9 - hgt + 3, '#d8c860', 0.4);
    }
    pot(g, cx, b, 11, 9, '#e6dfcc', '#c9c0a8', ink);
    return;
  }
  // bonsai on a little stand
  const cx = x + 9;
  box(g, cx - 9, b - 20, 18, 2.4, P.wood || '#6a3a22', ink, LWM);
  lines(g, [cx - 7, b - 18, cx - 7, b, cx + 7, b - 18, cx + 7, b], P.woodDk || '#4a2a18', 1.1);
  box(g, cx - 6, b - 24, 12, 4, '#3d5c78', ink, LWM);
  g.beginPath();
  g.moveTo(cx - 1, b - 24);
  g.quadraticCurveTo(cx - 4, b - 30, cx + 1, b - 33);
  g.quadraticCurveTo(cx + 4, b - 36, cx + 2, b - 38);
  pen(g, '#6a4a2a', 1.2);
  g.stroke();
  for (const [dx, dy, r] of [[-4, -33, 3.6], [3, -38, 3.2], [5, -32, 2.8]]) ell(g, cx + dx, b + dy, r * 1.3, r * 0.75, '#4f8a4c', lfLine, 0.4);
}

// ----------------------------------------------------------- lobby furniture
function reception(g, it, P, layer) {
  const { x, w } = it;
  const b = MID_BASE;
  const ink = P.inkM;
  if (layer !== 'front') return;
  shadowFoot(g, x, w, b);
  // on the desk top: a telephone, the monitor's back, a bell, flowers
  const top = b - 34;
  box(g, x + w * 0.6, top - 11, 15, 10, '#cfc6ae', ink, LWM);
  box(g, x + w * 0.6 + 4, top - 1.5, 7, 1.5, '#b0a78f', ink, LWM);
  g.beginPath();
  g.arc(x + w * 0.24, top - 0.2, 2.8, Math.PI, TAU);
  fs(g, P.brass, ink, LWM);
  circ(g, x + w * 0.24, top - 3.4, 0.7, P.brass, ink, 0.3);
  box(g, x + w * 0.4, top - 3, 6, 3, '#2e2c2a', ink, 0.35);
  poly(g, [x + w * 0.86 - 2.5, top, x + w * 0.86 + 2.5, top, x + w * 0.86 + 1.8, top - 6, x + w * 0.86 - 1.8, top - 6], '#cfe0ea', ink, 0.35);
  for (const [dx, dy, c] of [[-2, -10, '#d65a4c'], [1.6, -11, '#e2b03a'], [0, -8, '#d65a4c'], [2.6, -8.6, '#f0e6d2']]) circ(g, x + w * 0.86 + dx, top + dy, 1.5, c, ink, 0.3);
  lines(g, [x + w * 0.86, top - 6, x + w * 0.86 - 1.5, top - 9, x + w * 0.86, top - 6, x + w * 0.86 + 1.5, top - 9.5], '#4f8a4c', 0.5);
  // the desk: a curved front bulging toward us, walnut and verde, a brass kick
  g.beginPath();
  g.moveTo(x, b);
  g.lineTo(x, top + 3);
  g.quadraticCurveTo(x + w / 2, top - 2.5, x + w, top + 3);
  g.lineTo(x + w, b);
  g.closePath();
  fs(g, '#a8683e', ink, LWM);
  g.beginPath();
  g.moveTo(x - 1.5, top + 4);
  g.lineTo(x - 1.5, top + 1);
  g.quadraticCurveTo(x + w / 2, top - 4.5, x + w + 1.5, top + 1);
  g.lineTo(x + w + 1.5, top + 4);
  g.quadraticCurveTo(x + w / 2, top - 1.5, x - 1.5, top + 4);
  fs(g, '#e9e0cb', ink, LWM);
  g.beginPath();
  for (let fx = x + 6; fx < x + w - 3; fx += 6) { g.moveTo(fx, top + 6); g.lineTo(fx, b - 6); }
  pen(g, '#8e5532', 0.45);
  g.stroke();
  box(g, x + w / 2 - 26, top + 11, 52, 9, '#8e5532', ink, LWM);
  letters(g, 'RECEPTION', x + w / 2, top + 17.6, 4, { ink: P.brass, lw: 0.6, align: 'center' });
  box(g, x, b - 4, w, 4, P.brass, ink, LWM);
}

function turnstiles(g, it, P) {
  const { x, w } = it;
  const b = MID_BASE;
  const ink = P.inkM;
  shadowFoot(g, x, w, b);
  const n = 4;
  const pitch = w / (n - 1);
  for (let k = 0; k < n - 1; k++) {
    const a = x + k * pitch + 3;
    const c = x + (k + 1) * pitch - 3;
    const m = (a + c) / 2;
    for (const [p0, p1] of [[a, m - 1], [m + 1, c]]) rbox(g, p0, b - 22, p1 - p0, 11, 2, 'rgba(150,190,205,0.22)', 'rgba(90,120,140,0.55)', 0.4);
  }
  for (let k = 0; k < n; k++) {
    const px = x + k * pitch;
    topRound(g, px - 3, b - 26, 6, 26, 2.6, '#8f9aa2', ink, LWM);
    line(g, px - 1.6, b - 24, px - 1.6, b - 2, '#b4bec5', 0.6);
    box(g, px - 2.2, b - 25, 4.4, 2, '#2e3036', ink, 0.3);
    circ(g, px + 1, b - 24, 0.55, '#6cd06a');
  }
}

function sofa(g, it, P, exec) {
  const { x, w } = it;
  const b = MID_BASE;
  const ink = P.inkM;
  shadowFoot(g, x, w, b);
  if (exec) {
    // a Chesterfield: rolled arms, buttoned back
    const c = '#6f3a2c';
    const cl = '#874a37';
    rbox(g, x + 3, b - 26, w - 6, 15, 5, c, ink, LWM);
    g.fillStyle = '#4e271c';
    for (let r = 0; r < 2; r++) for (let bx = x + 9 + r * 3; bx < x + w - 8; bx += 6) { g.beginPath(); g.arc(bx, b - 21 + r * 4.5, 0.55, 0, TAU); g.fill(); }
    box(g, x + 4, b - 13, w - 8, 7, cl, ink, LWM);
    line(g, x + w / 2, b - 13, x + w / 2, b - 6, ink, 0.4);
    for (const ax of [x, x + w - 9]) { rbox(g, ax, b - 20, 9, 14, 4, c, ink, LWM); circ(g, ax + 4.5, b - 16.5, 2, cl, ink, 0.35); }
    lines(g, [x + 4, b - 6, x + 4, b, x + w - 4, b - 6, x + w - 4, b], '#2a1610', 1.5);
    return;
  }
  const c = '#a35a46';
  const cl = '#b96e58';
  box(g, x + 2, b - 25, w - 4, 12, c, ink, LWM);
  line(g, x + w / 2, b - 25, x + w / 2, b - 13, ink, 0.4);
  box(g, x, b - 14, w, 7, cl, ink, LWM);
  line(g, x + w / 2, b - 14, x + w / 2, b - 7, ink, 0.4);
  box(g, x - 1, b - 19, 5, 12, c, ink, LWM);
  box(g, x + w - 4, b - 19, 5, 12, c, ink, LWM);
  lines(g, [x + 3, b - 7, x + 1, b, x + w - 3, b - 7, x + w - 1, b], '#8a8f96', 0.9);
}

function sculpture(g, it, P) {
  const x = it.x;
  const b = MID_BASE;
  const ink = P.inkM;
  shadowFoot(g, x + 6, 28, b);
  box(g, x + 8, b - 22, 24, 22, P.marble, ink, LWM);
  box(g, x + 6.5, b - 24, 27, 3, P.marbleLt, ink, LWM);
  line(g, x + 12, b - 16, x + 18, b - 6, P.marbleVein, 0.45);
  box(g, x + 14, b - 12, 12, 4.4, P.brass, ink, 0.35);
  letters(g, 'OVUM', x + 20, b - 8.6, 2.4, { ink: '#2b241e', lw: 0.35, align: 'center' });
  // the golden egg on its ring
  g.beginPath();
  g.ellipse(x + 20, b - 25, 6, 1.6, 0, 0, TAU);
  fs(g, P.brassDk, ink, LWM);
  g.beginPath();
  eggPath(g, x + 20, b - 39, 10.5, 14);
  fs(g, '#e2b64a', ink, LWM);
  g.save();
  g.beginPath();
  eggPath(g, x + 20, b - 39, 10.5, 14);
  g.clip();
  g.fillStyle = '#c4952f';
  g.beginPath();
  g.ellipse(x + 26, b - 33, 9, 15, -0.2, 0, TAU);
  g.fill();
  g.fillStyle = '#f6dc8a';
  g.beginPath();
  g.ellipse(x + 15.5, b - 45, 3, 5, 0.4, 0, TAU);
  g.fill();
  g.restore();
  g.beginPath();
  eggPath(g, x + 20, b - 39, 10.5, 14);
  pen(g, ink, LWM);
  g.stroke();
}

// ------------------------------------------------------------- open furniture
function cubiclesBack(g, it, P, desks) {
  const b = MID_BASE;
  const ink = P.inkM;
  for (const d of desks) {
    const h = (n) => hash(d.seed * 7.31 + n);
    const x = d.x;
    // the monitor, screen toward us over the occupant's shoulder, glowing
    const mx = x + 14 + h(1) * 10;
    box(g, mx - 7, b - 46, 14, 13, '#d4ccb4', ink, LWM);
    box(g, mx - 5.4, b - 44.4, 10.8, 9, d.occupied ? '#bfe3cf' : '#d4f2df', ink, 0.35);
    g.beginPath();
    for (let k = 0; k < 4; k++) { g.moveTo(mx - 4.2, b - 42.6 + k * 1.8); g.lineTo(mx - 4.2 + 3 + h(k + 3) * 5, b - 42.6 + k * 1.8); }
    pen(g, '#6aa688', 0.45);
    g.stroke();
    // clutter, by desk: a lamp, a plant, a shelf of binders, a stack of files
    const kind = Math.floor(h(9) * 4);
    const ox = mx > x + 20 ? x + 6 : x + 30;
    if (kind === 0) {
      line(g, ox, b - 34, ox + 2, b - 42, '#3d3f48', 0.8);
      line(g, ox + 2, b - 42, ox + 5, b - 39, '#3d3f48', 0.8);
      poly(g, [ox + 3.2, b - 41, ox + 7.6, b - 39, ox + 6.4, b - 37], '#c8433a', ink, 0.35);
    } else if (kind === 1) {
      for (let q = 0; q < 6; q++) leaf(g, ox, b - 36, 5, 1.6, -Math.PI / 2 + (q - 2.5) * 0.45, q % 2 ? '#5f9f5a' : '#3f7f47', '#2f5a35', 0.35);
    } else if (kind === 2) {
      const cols = ['#c8433a', '#3b5f93', '#e2b04a', '#3c7a5a', '#8c6a9a'];
      for (let q = 0; q < 5; q++) box(g, ox - 5 + q * 2.4, b - 41 + (q % 2), 2.2, 8, cols[(q + d.seed) % 5], ink, 0.3);
    } else {
      for (let q = 0; q < 3; q++) box(g, ox - 4 + q * 0.6, b - 36.5 - q * 1.6, 8, 1.6, q % 2 ? '#e8dcc0' : '#d6c69e', ink, 0.3);
    }
  }
}

function cubiclesFront(g, it, P, desks) {
  const b = MID_BASE;
  const ink = P.inkM;
  shadowFoot(g, it.x0, it.x1 - it.x0, b);
  for (const d of desks) {
    const x = d.x;
    const h = (n) => hash(d.seed * 3.17 + n);
    box(g, x, b - 34, 40, 34, P.partition, ink, LWM);
    box(g, x, b - 8, 40, 8, P.partitionDk);
    line(g, x, b - 8, x + 40, b - 8, P.trim, 0.45);
    // pinned to the fabric: a memo, a calendar, a photo, a name card
    const pin = Math.floor(h(1) * 4);
    const px = x + 6 + h(2) * 22;
    if (pin === 0) { box(g, px, b - 28, 6, 7, '#f3e9c2', ink, 0.3); lines(g, [px + 1, b - 26, px + 5, b - 26, px + 1, b - 24.4, px + 4, b - 24.4], '#8a8070', 0.35); }
    else if (pin === 1) { box(g, px, b - 29, 8, 10, '#f0ece2', ink, 0.3); box(g, px, b - 29, 8, 2.4, '#c8433a'); }
    else if (pin === 2) { box(g, px, b - 27, 6, 5, '#a8c4d8', ink, 0.3); box(g, px + 1, b - 25, 4, 2, '#7a9a6a'); }
    else box(g, px, b - 26, 9, 3.4, '#5a5048', ink, 0.3);
    circ(g, px + 1.4, b - 28.4, 0.5, '#c8433a');
    // on the rail: a mug, a cactus, a radio
    const top = Math.floor(h(5) * 5);
    const tx = x + 6 + h(6) * 26;
    if (top === 0 || !d.occupied) { box(g, tx, b - 38.4, 3.4, 3.4, ['#e8e4d8', '#c8433a', '#3b5f93'][Math.floor(h(7) * 3)], ink, 0.35); g.beginPath(); g.arc(tx + 3.6, b - 36.6, 1, -Math.PI / 2, Math.PI / 2); pen(g, ink, 0.35); g.stroke(); }
    else if (top === 1) { box(g, tx, b - 37.4, 3.4, 2.4, '#c4744a', ink, 0.3); rbox(g, tx + 0.6, b - 41.4, 2.2, 4.2, 1, '#5f9a52', ink, 0.3); }
    else if (top === 2) { box(g, tx, b - 38.8, 7, 3.8, '#3d3f48', ink, 0.3); circ(g, tx + 2, b - 36.9, 1, '#9a9aa6'); line(g, tx + 6, b - 38.8, tx + 8, b - 43, ink, 0.35); }
  }
  // posts and the top rail over the whole run
  for (let k = 0; k <= desks.length; k++) {
    const x = it.x0 + k * 40;
    box(g, x - 1.1, b - 35.4, 2.2, 35.4, P.trim, ink, 0.4);
  }
  box(g, it.x0 - 1.1, b - 35.4, it.x1 - it.x0 + 2.2, 1.8, P.trimLt, ink, 0.4);
}

function deskList(it, i) {
  const n = Math.round((it.u1 - it.u) / 40);
  const out = [];
  for (let d = 0; d < n; d++) out.push({ x: it.u + d * 40, w: 40, occupied: it.heads.includes(d) || d === it.pop, seed: i * 31 + d });
  return out;
}

function cooler(g, it, P) {
  const x = it.x;
  const b = MID_BASE;
  const ink = P.inkM;
  shadowFoot(g, x, 14, b);
  box(g, x, b - 30, 14, 30, '#b9c3b2', ink, LWM);
  box(g, x + 2, b - 13, 10, 2, '#8f9a8a', ink, 0.35);
  circ(g, x + 4.6, b - 22, 1.2, '#c8433a', ink, 0.3);
  circ(g, x + 9.4, b - 22, 1.2, '#3b5f93', ink, 0.3);
  box(g, x + 14, b - 29, 3, 11, '#e6e2d6', ink, 0.35);
  // the bottle, neck down
  box(g, x + 5, b - 32, 4, 2.4, '#8fbcd6', ink, 0.35);
  g.beginPath();
  g.moveTo(x + 2, b - 32);
  g.lineTo(x + 2, b - 42);
  g.quadraticCurveTo(x + 2, b - 45, x + 7, b - 45);
  g.quadraticCurveTo(x + 12, b - 45, x + 12, b - 42);
  g.lineTo(x + 12, b - 32);
  g.closePath();
  fs(g, '#b4dbef', ink, LWM);
  box(g, x + 2.4, b - 38, 9.2, 5.6, '#9ccbe6');
  line(g, x + 3.6, b - 43, x + 3.6, b - 34, 'rgba(255,255,255,0.8)', 0.7);
}

function copier(g, it, P) {
  const { x } = it;
  const w = it.w || 40;
  const b = MID_BASE;
  const ink = P.inkM;
  shadowFoot(g, x, w, b);
  box(g, x, b - 28, w, 28, '#a29e91', ink, LWM);
  box(g, x - 1, b - 31, w - 10, 3.4, '#5a5a60', ink, LWM);
  box(g, x + w - 11, b - 31, 11, 3.4, '#8a877c', ink, LWM);
  circ(g, x + w - 8, b - 29.4, 0.6, '#6cd06a');
  circ(g, x + w - 5.6, b - 29.4, 0.6, '#c8433a');
  box(g, x + w - 4, b - 30.2, 2.6, 1.4, '#9fe0b0');
  for (let k = 0; k < 3; k++) {
    box(g, x + 2, b - 22 + k * 6.4, w - 4, 5.4, '#b2ae9f', ink, 0.35);
    box(g, x + w / 2 - 4, b - 20.6 + k * 6.4, 8, 1.2, '#7a776c');
  }
  poly(g, [x, b - 24, x - 7, b - 26, x - 7, b - 23, x, b - 21], '#8a877c', ink, 0.35);
  poly(g, [x - 1, b - 25, x - 6, b - 26.4, x - 6, b - 25.4, x - 1, b - 24], '#e6e0cf', ink, 0.3);
}

function cabinet(g, it, P) {
  const x = it.x;
  const b = MID_BASE;
  const ink = P.inkM;
  shadowFoot(g, x, 20, b);
  box(g, x, b - 44, 20, 44, '#8b9670', ink, LWM);
  for (let k = 0; k < 4; k++) {
    const y = b - 43 + k * 10.6;
    box(g, x + 1.6, y, 16.8, 9.6, '#97a27b', ink, 0.35);
    box(g, x + 7, y + 2, 6, 2.2, '#efe8d2', ink, 0.25);
    box(g, x + 6.4, y + 5.4, 7.2, 1.2, P.brassDk || '#a17a2c');
  }
  const top = Math.floor(hash(it.i * 5.1) * 3);
  if (top === 0) { box(g, x + 3, b - 48, 9, 4, '#e2d6b4', ink, 0.3); box(g, x + 4, b - 50, 8, 2, '#d6c69e', ink, 0.3); }
  else if (top === 1) { circ(g, x + 10, b - 50, 4.4, '#d6dbe0', ink, 0.35); line(g, x + 10, b - 46, x + 10, b - 44, ink, 0.6); box(g, x + 7, b - 45, 6, 1.4, '#9aa3ae', ink, 0.3); }
  else { pot(g, x + 10, b - 44, 7, 5, '#c4744a', '#9a5636', ink); for (let q = 0; q < 5; q++) leaf(g, x + 10, b - 50, 6, 1.6, -Math.PI / 2 + (q - 2) * 0.5, '#5f9f5a', '#2f5a35', 0.35); }
}

// ------------------------------------------------------------- exec furniture
function boardroomBack(g, it, P, chairs) {
  const b = MID_BASE;
  const ink = P.inkM;
  for (const c of chairs) {
    topRound(g, c.x - 8, b - 46, 16, 28, 5, '#3e2622', ink, LWM);
    topRound(g, c.x - 6, b - 44, 12, 22, 4, '#4e302a', null, 0);
    g.fillStyle = '#2a1814';
    for (let r = 0; r < 3; r++) for (let q = -1; q <= 1; q++) { g.beginPath(); g.arc(c.x + q * 3.4 + (r % 2) * 1.7 - 0.85, b - 41 + r * 4.4, 0.45, 0, TAU); g.fill(); }
  }
}

function boardroomFront(g, it, P) {
  const b = MID_BASE;
  const ink = P.inkM;
  const { x0, x1 } = it;
  shadowFoot(g, x0, x1 - x0, b);
  // things on the table: carafes, glasses, papers, a laptop
  for (let x = x0 + 18; x < x1 - 10; x += 35) {
    const k = Math.round((x - x0) / 35);
    if (k % 3 === 0) { poly(g, [x - 2, b - 27, x + 2, b - 27, x + 1.6, b - 33, x + 1, b - 34, x - 1, b - 34, x - 1.6, b - 33], '#cfe3ec', ink, 0.35); box(g, x - 1.8, b - 30, 3.6, 3, '#a9cfe2'); }
    else if (k % 3 === 1) { box(g, x - 5, b - 28.4, 9, 1.4, '#efe6d0', ink, 0.3); box(g, x + 6, b - 30, 2, 3, '#cfe3ec', ink, 0.3); }
    else { poly(g, [x - 5, b - 27, x + 5, b - 27, x + 4, b - 34, x - 4, b - 34], '#4a4c56', ink, 0.35); circ(g, x, b - 30.5, 0.8, '#d9dde2'); }
  }
  // the table: a heavy top, an apron, three pedestals
  box(g, x0, b - 27, x1 - x0, 4, '#6a3a24', ink, LWM);
  line(g, x0, b - 25.8, x1, b - 25.8, '#8a5232', 0.6);
  box(g, x0 + 4, b - 23, x1 - x0 - 8, 3.2, '#55301e', ink, LWM);
  for (const px of [x0 + 18, (x0 + x1) / 2, x1 - 18]) {
    poly(g, [px - 5, b - 20, px + 5, b - 20, px + 3.6, b - 3, px - 3.6, b - 3], '#6a3a24', ink, LWM);
    box(g, px - 7, b - 3, 14, 3, '#55301e', ink, LWM);
  }
}

function easel(g, x, P) {
  const b = MID_BASE;
  const ink = P.inkM;
  lines(g, [x + 3, b, x + 9, b - 52, x + 21, b, x + 15, b - 52, x + 12, b - 20, x + 12, b - 52], '#6a4a2e', 1);
  box(g, x, b - 50, 24, 30, '#e3dccb', ink, LWM);
  box(g, x - 1, b - 51.4, 26, 2.4, '#3d3f48', ink, 0.35);
  lines(g, [x + 3, b - 46, x + 3, b - 24, x + 3, b - 24, x + 21, b - 24], '#3a5aa8', 0.5);
  g.beginPath();
  g.moveTo(x + 4, b - 44);
  [[7, -36], [10, -38], [12, -29], [15, -27], [17, -33], [21, -42]].forEach(([dx, dy]) => g.lineTo(x + dx, b + dy));
  pen(g, '#c8433a', 0.7);
  g.stroke();
  letters(g, 'Q4', x + 18, b - 44, 2.6, { ink: '#3a5aa8', lw: 0.4, align: 'center' });
}

function execDesk(g, it, P) {
  const { x, w } = it;
  const b = MID_BASE;
  const ink = P.inkM;
  shadowFoot(g, x, w, b);
  // the chair behind, high-backed, buttoned
  const cx = x + w / 2;
  topRound(g, cx - 11, b - 54, 22, 26, 7, '#3e2622', ink, LWM);
  g.fillStyle = '#2a1814';
  for (let r = 0; r < 3; r++) for (let q = -2; q <= 2; q++) { g.beginPath(); g.arc(cx + q * 3.6 + (r % 2) * 1.8 - 0.9, b - 49 + r * 4.2, 0.45, 0, TAU); g.fill(); }
  // on the top: the banker's lamp, a telephone, the in-tray
  const lx = x + w * 0.22;
  box(g, lx - 3.4, b - 33, 6.8, 1.6, P.brass, ink, 0.35);
  line(g, lx, b - 33, lx, b - 38, P.brassDk, 0.8);
  poly(g, [lx - 8, b - 38, lx + 8, b - 38, lx + 7, b - 42, lx - 7, b - 42], '#2f7a4a', ink, LWM);
  poly(g, [lx - 7, b - 42, lx - 3, b - 42, lx - 5, b - 38, lx - 8, b - 38], '#4d9a68');
  poly(g, [lx - 8, b - 38, lx + 8, b - 38, lx + 7, b - 42, lx - 7, b - 42], null, ink, LWM);
  poly(g, [lx - 7.4, b - 37.6, lx + 7.4, b - 37.6, lx + 12, b - 31, lx - 12, b - 31], 'rgba(255,226,150,0.35)');
  box(g, x + w * 0.62, b - 33, 9, 2.6, '#1e1c1c', ink, 0.35);
  g.beginPath();
  g.moveTo(x + w * 0.62 - 0.5, b - 34);
  g.quadraticCurveTo(x + w * 0.62 + 4.5, b - 37, x + w * 0.62 + 9.5, b - 34);
  pen(g, '#1e1c1c', 1.3);
  g.stroke();
  box(g, x + w * 0.8, b - 33.6, 10, 3.2, '#8a5232', ink, 0.35);
  box(g, x + w * 0.8 + 1, b - 34.8, 8, 1.4, '#efe6d0', ink, 0.3);
  // the desk: tooled-leather top, two pedestals of drawers, a recessed kneehole
  box(g, x - 2, b - 31.4, w + 4, 3.4, '#5a301e', ink, LWM);
  line(g, x - 2, b - 30.4, x + w + 2, b - 30.4, '#2f6a44', 0.7);
  box(g, x, b - 28, w, 28, '#6e3b24', ink, LWM);
  box(g, x + 30, b - 26, w - 60, 20, '#4e2a1a', ink, 0.4);
  for (const px of [x + 2, x + w - 28]) {
    for (let k = 0; k < 3; k++) {
      box(g, px, b - 26 + k * 8.4, 26, 7.4, '#7d4429', ink, 0.4);
      box(g, px + 10, b - 23.4 + k * 8.4, 6, 1.4, P.brass, ink, 0.25);
    }
  }
  box(g, x - 1, b - 3, w + 2, 3, '#4e2a1a', ink, LWM);
}

function libGlobe(g, it, P) {
  const x = it.x;
  const b = MID_BASE;
  const ink = P.inkM;
  shadowFoot(g, x, 18, b);
  lines(g, [x + 9, b - 14, x + 2, b, x + 9, b - 14, x + 16, b, x + 9, b - 14, x + 9, b - 2], '#5a301e', 1.2);
  box(g, x + 1, b - 16, 16, 2.4, '#6e3b24', ink, 0.4);
  circ(g, x + 9, b - 25, 8, '#d8c48e', ink, LWM);
  g.save();
  g.beginPath();
  g.arc(x + 9, b - 25, 8, 0, TAU);
  g.clip();
  for (const [dx, dy, rx, ry] of [[-3, -3, 3.5, 2.6], [3, 1, 2.6, 4], [-2, 4, 2, 1.6]]) ell(g, x + 9 + dx, b - 25 + dy, rx, ry, '#9caa72', '#6a7a4a', 0.3);
  g.restore();
  g.beginPath();
  g.arc(x + 9, b - 25, 10, Math.PI * 0.62, Math.PI * 2.38);
  pen(g, P.brass, 1);
  g.stroke();
}

function tallClock(g, it, P) {
  const x = it.x;
  const b = MID_BASE;
  const ink = P.inkM;
  shadowFoot(g, x, 20, b);
  box(g, x, b - 16, 20, 16, '#6a3a22', ink, LWM);
  box(g, x + 3, b - 13, 14, 10, '#7d4429', ink, 0.4);
  box(g, x + 3, b - 50, 14, 34, '#6a3a22', ink, LWM);
  box(g, x + 6, b - 47, 8, 27, '#2c1a14', ink, 0.4);
  box(g, x + 1, b - 70, 18, 20, '#6a3a22', ink, LWM);
  poly(g, [x - 1, b - 70, x + 4, b - 75, x + 7, b - 72, x + 13, b - 72, x + 16, b - 75, x + 21, b - 70], '#5a301e', ink, LWM);
  circ(g, x + 10, b - 75, 1.4, P.brass, ink, 0.3);
  circ(g, x + 10, b - 60, 7, P.brass, ink, 0.4);
  circ(g, x + 10, b - 60, 5.8, '#f3e7c8', ink, 0.35);
  g.beginPath();
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU;
    g.moveTo(x + 10 + Math.sin(a) * 4.6, b - 60 - Math.cos(a) * 4.6);
    g.lineTo(x + 10 + Math.sin(a) * 5.4, b - 60 - Math.cos(a) * 5.4);
  }
  pen(g, ink, 0.35);
  g.stroke();
}

function paintMid(g, F, P, u0, u1, layer) {
  const per = F.mid.period;
  const PP = { ...P, pot: F.id === 'lobby' ? P.brass : F.id === 'exec' ? '#3d5c78' : '#c4744a', potDk: F.id === 'lobby' ? P.brassDk : F.id === 'exec' ? '#2c455c' : '#9a5636' };
  F.mid.items.forEach((it, i) => {
    if (it.kind === 'cubicles' || it.kind === 'boardroom') {
      for (const x0 of copies(it.u - 40, it.u1 - it.u + 80, per, u0, u1)) {
        const off = x0 + 40 - it.u;
        const span = { ...it, x0: it.u + off, x1: it.u1 + off };
        if (it.kind === 'cubicles') {
          const desks = deskList(it, i).map((d) => ({ ...d, x: d.x + off }));
          if (layer === 'back') cubiclesBack(g, span, PP, desks);
          else cubiclesFront(g, span, PP, desks);
        } else {
          const pitch = (it.u1 - it.u) / it.seats;
          const chairs = [];
          for (let s = 0; s < it.seats; s++) chairs.push({ x: span.x0 + pitch * (s + 0.5) });
          if (layer === 'back') boardroomBack(g, span, PP, chairs);
          else { boardroomFront(g, span, PP); if (it.easel) easel(g, span.x1 + 6, PP); }
        }
      }
      return;
    }
    if (layer === 'back') return;
    const w = it.w ?? 0;
    for (const x0 of copies(it.u - 30, w + 90, per, u0, u1)) {
      const x = x0 + 30;
      const m = { ...it, x, w, i };
      switch (it.kind) {
        case 'plant': plant(g, x, MID_BASE, it.variant, PP, i * 7 + (F.id === 'open' ? 3 : 0)); break;
        case 'reception': reception(g, m, PP, 'front'); break;
        case 'turnstiles': turnstiles(g, m, PP); break;
        case 'sofa': sofa(g, m, PP, F.id === 'exec'); break;
        case 'sculpture': sculpture(g, m, PP); break;
        case 'cooler': cooler(g, m, PP); break;
        case 'copier': copier(g, m, PP); break;
        case 'cabinet': cabinet(g, m, PP); break;
        case 'desk': execDesk(g, m, PP); break;
        case 'globe': libGlobe(g, m, PP); break;
        case 'tallclock': tallClock(g, m, PP); break;
        default: break;
      }
    }
  });
}

// --------------------------------------------- the furniture's moving parts
function midActors(ctx, f, P) {
  const b = MID_BASE;
  const ink = P.inkM;
  for (const m of f.mid.items) {
    if (m.kind === 'cubicles') {
      for (const d of m.desks) {
        if (!d.occupied) continue;
        const p = personFor(d.seed);
        const cx = d.x + 20 + (hash(d.seed * 7.31 + 1) - 0.5) * 4 - 3;
        const y = b - 42 + d.dy - d.pop * 12;
        // shoulders and shirt down behind the partition
        rbox(ctx, cx - 7, y + 4.6, 14, 14, 3.5, p.shirt, ink, LWM);
        if (d.pop > 0.5) {
          circ(ctx, cx - 9, b - 35.6, 1.7, p.skin, ink, 0.35);
          circ(ctx, cx + 9, b - 35.6, 1.7, p.skin, ink, 0.35);
        }
        head(ctx, cx, y, 5, p, d.pop > 0.15 ? (d.look > 0 ? 'right' : 'left') : 'back', ink, LWM);
      }
    } else if (m.kind === 'boardroom') {
      for (const c of m.chairs) {
        if (!c.sitter) continue;
        const p = personFor(c.seed + 400);
        const suit = ['#3d4250', '#4a3f3a', '#2f3a4a', '#4b4b52'][c.seed % 4];
        const y = b - 40 + c.nod * 3.4;
        rbox(ctx, c.x - 8, b - 33, 16, 10, 3.5, suit, ink, LWM);
        poly(ctx, [c.x - 2.2, b - 33, c.x + 2.2, b - 33, c.x, b - 28], '#f0eadc', ink, 0.3);
        line(ctx, c.x, b - 31.6, c.x, b - 27, p.tie, 1);
        const pp = { ...p, style: p.style === 'bun' || p.style === 'quiff' ? 'bald' : p.style, hair: c.seed % 3 === 0 ? '#c9c4ba' : p.hair };
        ctx.save();
        ctx.translate(c.x, y + 4);
        ctx.rotate(c.nod * 0.18 * (c.seed % 2 ? 1 : -1));
        head(ctx, 0, -4, 5, pp, 'front', ink, LWM, c.nod > 0.25);
        ctx.restore();
        if (c.nod > 0.55 && c.seed % 3 !== 1) {
          const k = (c.nod - 0.55) / 0.3;
          letters(ctx, 'Z', c.x + 6 + k * 2, y - 6 - k * 4, 2.6, { ink: '#6a5a7a', lw: 0.4 });
          if (k > 0.5) letters(ctx, 'Z', c.x + 9 + k * 2, y - 10 - k * 4, 2, { ink: '#6a5a7a', lw: 0.35 });
        }
      }
    } else if (m.kind === 'reception') {
      const p = { skin: '#f2cfae', hair: '#5a3424', style: 'bun', glasses: true };
      const cx = m.x + m.w * 0.42;
      const y = b - 44 + m.dy;
      rbox(ctx, cx - 7, y + 4.8, 14, 12, 3.5, '#3f6a9e', ink, LWM);
      poly(ctx, [cx - 2, y + 4.8, cx + 2, y + 4.8, cx, y + 8], '#f4ecdc', ink, 0.3);
      head(ctx, cx, y, 5, p, 'front', ink, LWM);
      headset(ctx, cx, y);
    }
  }
}
function headset(ctx, cx, y) {
  ctx.beginPath();
  ctx.arc(cx, y - 0.5, 5.6, Math.PI * 1.05, Math.PI * 1.95);
  pen(ctx, '#2e2c2a', 0.6);
  ctx.stroke();
  line(ctx, cx + 5.2, y + 0.6, cx + 2.4, y + 3.8, '#2e2c2a', 0.45);
}

function midDevices(ctx, f, P) {
  const b = MID_BASE;
  for (const m of f.mid.items) {
    if (m.kind === 'cooler' && m.bubble >= 0) {
      const r = 0.9 + m.bubble * 1.1;
      circ(ctx, m.x + 7 + Math.sin(m.bubble * 9) * 1.2, b - 33.5 - m.bubble * 9.5, r, '#e8f6ff', '#5f8fae', 0.35);
    } else if (m.kind === 'copier' && m.scan >= 0) {
      const w = m.w || 40;
      const sx = m.x + 1 + m.scan * (w - 14);
      box(ctx, sx, b - 28.6, 3, 1.2, '#c8ffe8');
      box(ctx, sx - 2, b - 27.4, 7, 2.6, 'rgba(200,255,232,0.4)');
    } else if (m.kind === 'tallclock') {
      const x = m.x + 10;
      const bx = x + m.swing * 3;
      line(ctx, x, b - 46, bx, b - 26, P.brassDk, 0.6);
      circ(ctx, bx, b - 25, 2.4, P.brass, P.inkM, 0.35);
      const cy = b - 60;
      line(ctx, x, cy, x + Math.sin(f.clock.hourA) * 3, cy - Math.cos(f.clock.hourA) * 3, P.ink, 0.7);
      line(ctx, x, cy, x + Math.sin(f.clock.minuteA) * 4.6, cy - Math.cos(f.clock.minuteA) * 4.6, P.ink, 0.5);
    }
  }
}

// ==================================================================== FRONT
function paintFront(ctx, f, P) {
  for (const it of f.front) {
    if (it.kind === 'pillar') {
      // a column sliding past close to the lens: one flat translucent tint with a capital
      // and a plinth, a flat lit edge on the side toward the room's light
      const x = it.x;
      const w = it.w;
      ctx.fillStyle = P.front;
      ctx.beginPath();
      ctx.rect(x, 12, w, 228);
      ctx.rect(x - 5, -2, w + 10, 14);
      ctx.rect(x - 6, 240, w + 12, 32);
      ctx.fill();
      ctx.fillStyle = P.frontLt;
      ctx.fillRect(x + 4, 12, 3, 228);
      ctx.fillRect(x - 3, 242, 3, 30);
      continue;
    }
    if (it.kind === 'plant') {
      const x = it.x;
      ctx.fillStyle = P.front;
      ctx.beginPath();
      for (let k = 0; k < 7; k++) {
        const a = -Math.PI / 2 + (k - 3) * 0.32;
        const L = 34 + (k % 3) * 8;
        const sx = x + (k - 3) * 2;
        const sy = 276;
        const ex = sx + Math.cos(a) * L;
        const ey = sy + Math.sin(a) * L;
        const nx = -Math.sin(a) * 5;
        const ny = Math.cos(a) * 5;
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo((sx + ex) / 2 + nx, (sy + ey) / 2 + ny, ex, ey);
        ctx.quadraticCurveTo((sx + ex) / 2 - nx, (sy + ey) / 2 - ny, sx, sy);
      }
      ctx.fill();
      continue;
    }
    if (it.kind === 'chair') {
      // an office chair's back and its arms, rising into the bottom of the frame
      ctx.fillStyle = P.front;
      ctx.beginPath();
      rrPath(ctx, it.x - 16, 240, 32, 26, 9);
      ctx.rect(it.x - 26, 258, 8, 16);
      ctx.rect(it.x + 18, 258, 8, 16);
      ctx.rect(it.x - 26, 256, 18, 4);
      ctx.rect(it.x + 8, 256, 18, 4);
      ctx.fill();
      ctx.fillStyle = P.frontLt;
      ctx.fillRect(it.x - 12, 243, 24, 2);
      continue;
    }
    if (it.kind === 'armchair') {
      ctx.fillStyle = P.front;
      ctx.beginPath();
      ctx.moveTo(it.x - 30, 272);
      ctx.lineTo(it.x - 30, 248);
      ctx.quadraticCurveTo(it.x - 30, 240, it.x - 22, 240);
      ctx.quadraticCurveTo(it.x - 20, 234, it.x - 12, 234);
      ctx.lineTo(it.x + 12, 234);
      ctx.quadraticCurveTo(it.x + 20, 234, it.x + 22, 240);
      ctx.quadraticCurveTo(it.x + 30, 240, it.x + 30, 248);
      ctx.lineTo(it.x + 30, 272);
      ctx.closePath();
      ctx.fill();
    }
  }
}

// ==================================================================== CACHE
const CACHE = new Map();
function bakeFor(floor, k) {
  const key = `${floor}@${k}`;
  let B = CACHE.get(key);
  if (B) return B;
  const F = OFFICE_FLOORS[floor];
  const P = PAL[floor];
  const G = F.glass;
  const gy0 = Math.floor(G.top / 2) * 2 - 2;
  const gy1 = Math.ceil(G.bottom / 2) * 2 + 2;
  B = {
    far: bakeStrip(1400, gy0, gy1, k, (g, u0, u1) => paintFar(g, F, P, u0, u1)),
    near: bakeStrip(1200, gy0, gy1, k, (g, u0, u1) => paintNear(g, F, P, u0, u1)),
    wall: bakeStrip(F.wall.period, F.ceilingY, WALL_BASE + 2, k, (g, u0, u1) => paintWall(g, F, P, u0, u1)),
    midBack: floor === 'lobby' ? null : bakeStrip(F.mid.period, 132, 216, k, (g, u0, u1) => paintMid(g, F, P, u0, u1, 'back')),
    midFront: bakeStrip(F.mid.period, 132, 216, k, (g, u0, u1) => paintMid(g, F, P, u0, u1, 'front')),
    clouds: F.outside.clouds.map((c, i) => cloudShape(c, i, floor)),
  };
  CACHE.set(key, B);
  return B;
}

function scaleOf(ctx) {
  const m = ctx.getTransform ? ctx.getTransform() : null;
  const k = m ? Math.hypot(m.a, m.b) : 1;
  return Math.min(4, Math.max(1, Math.round(k * 4) / 4));
}

export const STYLE = {
  id: 'ligne',
  name: 'LIGNE CLAIRE — Tintin',
  note: 'The Franco-Belgian clear line of Hergé and E.P. Jacobs: one even outline round everything, flat bright '
    + 'colour, shadows as flat darker shapes and lamplight as flat lighter ones, no hatching, no gradients. Every '
    + 'glazing bar, call button, radiator, binder and ceiling tile is drawn, and the signs are hand-lettered in one '
    + 'single-stroke capital. The street and the skyline are as precise but cooler, with a coloured line; the '
    + 'furniture behind the lane takes a thinner, softer line so the hero wins. Lobby a fresh brass-and-verde '
    + 'morning, floor 23 the pale-green Hergé office, floor 88 a dusk of hard colour bands under the founder, the '
    + 'silver professor, in oils in a gilt frame.',
  paint(ctx, f) {
    const k = scaleOf(ctx);
    const F = OFFICE_FLOORS[f.floor];
    const P = PAL[f.floor];
    const B = bakeFor(f.floor, k);
    const farShift = f.camX * FACTORS.cityFar * ZOOM;
    const nearShift = f.camX * (F.outside.nearFactor ?? FACTORS.cityNear) * ZOOM;
    const wd = snapDelta(f.wall.shift, f.wall.period, k);
    const md = snapDelta(f.mid.shift, f.mid.period, k);

    // 1. outside, seen only through the glass
    ctx.save();
    ctx.beginPath();
    for (const b of f.wall.bays) if (b.type === 'glass') ctx.rect(b.x0 + wd - 1, f.glass.top - 1, b.x1 - b.x0 + 2, f.glass.bottom - f.glass.top + 2);
    ctx.clip();
    sky(ctx, f, P);
    stars(ctx, f, P);
    sun(ctx, f, P);
    clouds(ctx, f, P, B.clouds);
    drawStrip(ctx, B.far, farShift);
    cityLights(ctx, f, P);
    drawStrip(ctx, B.near, nearShift);
    for (const c of f.outside.cars) vehicle(ctx, c, P);
    flyer(ctx, f, P);
    ctx.save();
    ctx.translate(wd, 0);
    cradle(ctx, f, P);
    ctx.restore();
    ctx.restore();

    // 2. the wall, then what moves on it
    drawStrip(ctx, B.wall, f.wall.shift);
    ctx.save();
    ctx.translate(wd, 0);
    columnSides(ctx, f, P);
    liftDoors(ctx, f, P);
    clockHands(ctx, f, P);
    revolvingDoor(ctx, f, P);
    ctx.restore();

    // 3. ceiling; 4. floor and the slab under the lane
    ceiling(ctx, f, P);
    floorPlane(ctx, f, P, wd);
    slab(ctx, f, P);

    // 5. the furniture: back, the people, front, the gadgets; then the lights over it
    ctx.save();
    if (B.midBack) drawStrip(ctx, B.midBack, f.mid.shift);
    ctx.translate(md, 0);
    midActors(ctx, f, P);
    ctx.translate(-md, 0);
    drawStrip(ctx, B.midFront, f.mid.shift);
    ctx.translate(md, 0);
    midDevices(ctx, f, P);
    lights(ctx, f, P);
    ctx.restore();
  },
  paintFront(ctx, f) {
    paintFront(ctx, f, PAL[f.floor]);
  },
};
