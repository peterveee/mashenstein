// Corporate Kombat: LIGNE ’89 line painter. Shared with the preserved bake-off.
import { FRAME_W, WALL_BASE, LANE_TOP, FACTORS, OFFICE_HORIZON } from '../officeClimb.js';

const TAU = Math.PI * 2;

const W = FRAME_W;

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

function eggPath(g, cx, cy, rx, ry, eq = 0.16) {
  const ey = ry * eq;
  g.ellipse(cx, cy + ey, rx, ry - ey, 0, 0, Math.PI);
  g.ellipse(cx, cy + ey, rx, ry + ey, 0, Math.PI, TAU);
}

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

function textW(str, size, track = 1.5) {
  let w = 0;
  let n = 0;
  for (const ch of str) { w += (GL[ch] || GL[' ']).w; n++; }
  return (w + track * Math.max(0, n - 1)) * size / 6;
}

function textPath(str, x, y, size, o = {}) {
  const s = size / 6;
  const track = o.track ?? 1.5;
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

// Jost, a Futura-style geometric sans: picked 12 Oct 2026 from the typeface bake-off (Lab) as the
// closest match to the LIGNE '89 art. Loaded in gate.js.
export let OFFICE_FONT = "'Jost', 'Futura', 'Century Gothic', 'Trebuchet MS', system-ui, sans-serif";
// Font bake-off only (gallery): swap the office's face. Baked layers keep what they were drawn in.
export function setOfficeFont(stack) { const was = OFFICE_FONT; OFFICE_FONT = stack; return was; }
// The default weight of the office's lettering; a call can still pass its own `weight`.
export let OFFICE_WEIGHT = 400;
export function setOfficeWeight(w) { const was = OFFICE_WEIGHT; OFFICE_WEIGHT = w; return was; }

function letters(g, str, x, y, size, o = {}) {
  const fontSize = size * 1.18;
  const lw = o.lw ?? Math.max(0.35, size * 0.11);
  const slant = o.slant ?? 0;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.save();
  g.font = `${o.weight ?? OFFICE_WEIGHT} ${fontSize}px ${OFFICE_FONT}`;
  g.textAlign = o.align ?? 'left';
  g.textBaseline = 'alphabetic';
  if ('letterSpacing' in g) {
    const spacing = size * 0.06 + (o.track ?? 0.3) * size / 6;
    g.letterSpacing = `${spacing}px`;
  }
  const draw = (method, dx = 0, dy = 0) => {
    if (!slant) {
      g[method](str, x + dx, y + dy);
      return;
    }
    g.save();
    g.translate(x + dx, y + dy);
    g.transform(1, 0, -slant, 1, 0, 0);
    g[method](str, 0, 0);
    g.restore();
  };
  if (o.shadow) {
    g.strokeStyle = o.shadow;
    g.lineWidth = lw + 2 * (o.olw ?? 0);
    draw('strokeText', o.sdx ?? 0.8, o.sdy ?? 0.8);
  }
  if (o.outline) {
    g.strokeStyle = o.outline;
    g.lineWidth = lw + 2 * (o.olw ?? 0.45);
    draw('strokeText');
  }
  g.fillStyle = o.ink ?? '#222';
  draw('fillText');
  g.restore();
}

const LW = 0.6;

const LWM = 0.5;

const LWF = 0.38;

const PAL = {
  lobby: {
    ink: '#231d2a', inkM: 'rgba(35,29,42,0.7)',
    sky: [[0, '#8dcff4'], [70, '#a9dbf5'], [112, '#c8e7f6'], [142, '#f5dbe7']],
    sun: '#fff6c2', sunLine: '#f2a0c2',
    cloud: '#ffffff', cloudShade: '#f7dfec', cloudLine: '#b99bd8',
    far: { tones: ['#d7cdea', '#c8d9ef', '#e8d3e8'], win: '#b5c4e6', line: '#a597cb', lw: 0.42 },
    near: {
      tones: ['#f7d8e2', '#cdeee6', '#f5ecc4'], shade: ['#ecbfcd', '#b2e0d5', '#e8d9a2'],
      win: '#8cd0e0', winHi: '#d4f1f7', blind: '#fdeaf2', frame: '#ffffff', line: '#8a82ad', lw: 0.46,
    },
    awn: ['#ff6fae', '#35c2b6', '#f4dc4c', '#a98ee0'],
    street: { pave: '#e7e1ea', kerb: '#c8c0cd', road: '#a09cae', mark: '#fff6fa', line: '#7f7a93' },
    tree: { leaf: '#7fd09c', leafDk: '#5bb687', trunk: '#9a7a6a', line: '#4c9a78' },
    lampPost: '#2b2a35',
    wall: '#e8cfcb', wallJoint: '#d9b9b5', wallShade: '#d3b0ac', fleck: ['#cba29e', '#f6e6e4', '#c09490'],
    gb: '#cfe4ec', gbLt: '#eef9fb', gbLine: '#9fbfcc',
    band: '#1f1d26', bandLt: '#3a3846',
    brass: '#c9ced8', brassDk: '#8e95a4', brassLt: '#f2f4f8', chrome: '#c9ced8',
    marble: '#1f1d26', marbleLt: '#3a3846', marbleVein: '#4c4a5a',
    column: '#26242f', columnDk: '#3c3a48',
    frame: '#2a2833', frameLt: '#8e95a4',
    carLit: '#ffe9f3', carSide: '#f5cadf', carFloor: '#b9a2c2',
    ceil: '#f3eff5', ceilDk: '#ded7e3',
    floorA: '#e6e3ec', floorB: '#dedae6', floorLine: '#c6c0d2', floorRefl: 'rgba(40,36,50,0.08)', sunPatch: 'rgba(255,253,244,0.72)',
    chips: ['#f3bcd3', '#a3dcd5', '#f0e39e', '#c9baea', '#6a6678'],
    slab: '#e4c8c6', slabDk: '#cdaba9', slabTop: '#ecdcda', slabLine: '#b39391',
    neonA: '#ff4fa8', neonB: '#3fe0d0',
    front: 'rgba(52,34,64,0.44)', frontLt: 'rgba(255,200,240,0.24)',
  },
  open: {
    ink: '#24222e', inkM: 'rgba(36,34,46,0.66)',
    sky: [[0, '#8bcff0'], [88, '#a7dbf2'], [122, '#f1dae8']],
    sun: null, sunLine: null,
    cloud: '#ffffff', cloudShade: '#f3e0ee', cloudLine: '#ae9ad4',
    far: { tones: ['#d0d0ec', '#c4d9ee', '#ddd0e8'], win: '#b6c3e4', line: '#a49acb', lw: 0.42 },
    near: {
      tones: ['#f3d2de', '#c9e9e1', '#f0e6bd'], shade: ['#e6bccb', '#afdcd2', '#e1d4a0'],
      win: '#8ccbe0', winHi: '#d0eef6', blind: '#fbe9f1', frame: '#ffffff', line: '#8a82ad', lw: 0.46,
    },
    tank: '#b98e70', tankDk: '#94694f',
    wall: '#dbd3e6', wallShade: '#c9bfd9', dado: '#aed8d1', rail: '#86c5bd', skirting: '#2a2833',
    column: '#cfc6de', columnDk: '#bdb2cf',
    frame: '#b9bfcc', frameLt: '#e6e9ef',
    sill: '#f3eff5', radiator: '#d8d0bf', radLine: '#b1a996',
    blind: '#f6f2f8', blindDk: '#d8d0e2',
    brass: '#c9ced8', brassDk: '#8e95a4', brassLt: '#f2f4f8', chrome: '#c9ced8',
    steel: '#c4c9d4', steelDk: '#959caa', steelLt: '#e8ebf1',
    carLit: '#fff0f6', carSide: '#eedae6', carFloor: '#aaa2b4',
    ceil: '#e8e5ee', ceilLine: '#d2cdda',
    carpetA: '#837f99', carpetB: '#88849e', carpetLine: '#726e88',
    chips: ['#a094bc', '#7fa8aa', '#ab90a8', '#9b97b0'],
    slab: '#4f4c5e', slabDk: '#3f3c4c', slabTop: '#9b98b1', slabLine: '#36343f',
    partition: '#c0bbcd', partitionDk: '#aca6bc', trim: '#8a8599', trimLt: '#a3d8d1',
    neonA: '#ff4fa8', neonB: '#3fe0d0',
    front: 'rgba(42,36,66,0.44)', frontLt: 'rgba(220,240,255,0.22)',
  },
  exec: {
    ink: '#1e1a26', inkM: 'rgba(30,26,38,0.72)',
    sky: [[0, '#34296e'], [38, '#4c3388'], [60, '#703a9a'], [82, '#9f419d'], [102, '#cd4d9b'], [120, '#ee6498'], [136, '#ff868e'], [149, '#ffab7f'], [160, '#ffd27c']],
    sun: '#fff0b4', sunLine: '#ff8fb8',
    cloud: '#9a64bc', cloudShade: '#ff98a0', cloudLine: '#5e4290',
    stars: '#fff6ff',
    far: { tones: ['#8b75b5', '#7e6aa9', '#9985c1'], lit: '#ffe27a', litAlt: ['#ff8fc8', '#7fe8dc'], dark: '#6d5b99', line: '#6a5a96', lw: 0.38 },
    near: { tones: ['#4d4482', '#584a8e', '#443c74'], lit: '#ffe27a', dark: '#3a3467', rim: '#ff9fd0', line: '#2e2850', lw: 0.48, neon: ['#ff4fa8', '#3fe0d0', '#ffe04a'] },
    haze: 'rgba(255,172,204,0.3)',
    cityLights: ['#ffe88a', '#ff8fc8', '#7fe8dc'],
    wood: '#191522', woodLt: '#352f4a', woodDk: '#110e17', woodLine: '#0b090f', panel: '#45386b', panelLt: '#56487f',
    brass: '#c9ced8', brassDk: '#8e95a4', brassLt: '#f2f4f8', chrome: '#c9ced8',
    column: '#191623', columnDk: '#272238',
    frame: '#1c1a24', frameLt: '#55506a',
    carLit: '#ffe6f2', carSide: '#efc4da', carFloor: '#8f7aa0',
    ceil: '#1d1928', ceilDk: '#131019',
    carpetA: '#8e84ac', carpetB: '#938ab1', carpetLine: '#7c729c',
    rug: '#8f7fbf', rugIn: '#a596cf', rugBorder: '#2a2634', rugLine: '#2a2634',
    warm: 'rgba(255,170,220,0.13)', warmPool: 'rgba(255,196,232,0.24)', sunPatch: 'rgba(255,150,170,0.28)',
    slab: '#211e2a', slabDk: '#16141c', slabTop: '#c9ced8', slabLine: '#35313f',
    neonA: '#ff4fa8', neonB: '#3fe0d0',
    front: 'rgba(30,20,46,0.5)', frontLt: 'rgba(255,160,230,0.2)',
  },
};

const TILE = 512;

const STRIP_M = 48;

function bakeStrip(P, y0, y1, k, paint, seamless = false) {
  const u0 = -STRIP_M;
  const u1 = P + W + STRIP_M;
  const H = y1 - y0;
  const big = canvas((u1 - u0) * k, H * k);
  const g = big.getContext('2d');
  g.setTransform(k, 0, 0, k, -u0 * k, -y0 * k);
  paint(g, u0, u1);
  // Fine wall rules must be sampled as one image. Drawing adjacent cropped
  // tiles independently gives their filtered edges different alpha coverage
  // at fractional camera positions, making the seams shimmer as they scroll.
  if (seamless) return { image: big, u0, P, y0, H, k, tiles: [] };
  const tiles = [];
  for (let u = u0; u < u1; u += TILE) {
    const w = Math.min(TILE, u1 - u);
    // Neighbour pixels let filtered, fractional scrolling sample across tile
    // boundaries without introducing a transparent seam.
    const c = canvas(w * k + 2, H * k);
    const sourceX = (u - u0) * k;
    const left = Math.min(1, sourceX);
    const right = Math.min(1, big.width - sourceX - w * k);
    c.getContext('2d').drawImage(big, sourceX - left, 0, w * k + left + right, H * k,
      1 - left, 0, w * k + left + right, H * k);
    tiles.push({ c, u, w });
  }
  return { tiles, P, y0, H, k };
}

function drawStrip(ctx, S, shift) {
  const s = mod(shift, S.P);
  // Use the same continuous coordinates as artwork, clock hands and furniture.
  const base = -s;
  const coverage = ctx.__officeCoverage;
  if (S.image) {
    const left = coverage?.left ?? 0;
    const right = coverage?.right ?? W;
    for (let n = Math.floor((left - base) / S.P); n <= Math.floor((right - base) / S.P); n++) {
      const start = base + n * S.P;
      ctx.save();
      ctx.beginPath();
      ctx.rect(start, S.y0, S.P, S.H);
      ctx.clip();
      ctx.drawImage(S.image, start + S.u0, S.y0, S.image.width / S.k, S.H);
      ctx.restore();
    }
    return;
  }
  if (coverage) {
    for (let n = Math.floor((coverage.left - base) / S.P); n <= Math.floor((coverage.right - base) / S.P); n++) {
      const start = base + n * S.P;
      ctx.save();
      ctx.beginPath();
      ctx.rect(start, S.y0, S.P, S.H);
      ctx.clip();
      for (const t of S.tiles) {
        const x = t.u + start;
        if (t.u >= S.P || t.u + t.w <= 0 || x > coverage.right + 2 || x + t.w < coverage.left - 2) continue;
        ctx.drawImage(t.c, 1, 0, t.w * S.k, S.H * S.k, x, S.y0, t.w, S.H);
      }
      ctx.restore();
    }
    return;
  }
  for (const t of S.tiles) {
    const x = t.u + base;
    if (x > W + 2 || x + t.w < -2) continue;
    ctx.drawImage(t.c, 1, 0, t.w * S.k, S.H * S.k, x, S.y0, t.w, S.H);
  }
}

function copies(u, w, P, u0, u1) {
  const out = [];
  for (const n of [-1, 0, 1, 2]) {
    const x = u + n * P;
    if (x + w > u0 - 4 && x < u1 + 4) out.push(x);
  }
  return out;
}

// Derive the perspective from the wall's depth, keeping the lane at full speed.
const YH = OFFICE_HORIZON;

const Z0 = 120;

const DWALL = Z0 * (1 / FACTORS.wall - 1);

const VPX = 240;

const fOfD = (D) => Z0 / (Z0 + D);

const yOfF = (f) => YH + (LANE_TOP - YH) * f;

const xOf = (U, S, f) => VPX + (U - S - VPX) * f;

const M89 = { pink: '#ff6fae', teal: '#2fbcb0', lemon: '#f6df4a', lilac: '#b39ae6', black: '#1f1d26', white: '#ffffff', cobalt: '#3f5fd8', red: '#e0203a' };

function squiggle(g, x0, x1, y, amp, per, ink, lw) {
  g.beginPath();
  g.moveTo(x0, y);
  let k = 0;
  for (let x = x0; x < x1 - 0.01; x += per / 2, k++) {
    const xe = Math.min(x1, x + per / 2);
    g.quadraticCurveTo((x + xe) / 2, y + (k % 2 ? amp : -amp), xe, y);
  }
  pen(g, ink, lw);
  g.stroke();
}

function confetti(g, x, y, w, h, n, seed, cols, size = 2, lw = 0.6) {
  for (let k = 0; k < n; k++) {
    const px = x + hash(seed + k * 3.1) * w;
    const py = y + hash(seed + k * 7.7) * h;
    const a = hash(seed + k * 1.9) * Math.PI;
    const c = cols[k % cols.length];
    const kind = k % 3;
    if (kind === 0) line(g, px - Math.cos(a) * size, py - Math.sin(a) * size, px + Math.cos(a) * size, py + Math.sin(a) * size, c, lw);
    else if (kind === 1) poly(g, [px, py - size * 0.8, px + size * 0.8, py + size * 0.6, px - size * 0.8, py + size * 0.6], c);
    else circ(g, px, py, size * 0.45, c);
  }
}

function grid(g, x, y, w, h, cell, bg, ink, lw) {
  box(g, x, y, w, h, bg);
  g.beginPath();
  for (let gx = x + cell; gx < x + w - 0.1; gx += cell) { g.moveTo(gx, y); g.lineTo(gx, y + h); }
  for (let gy = y + cell; gy < y + h - 0.1; gy += cell) { g.moveTo(x, gy); g.lineTo(x + w, gy); }
  pen(g, ink, lw);
  g.stroke();
  box(g, x, y, w, h, null, ink, lw);
}

function neon(g, path, col, w = 1, halo = 2, on = 1) {
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.strokeStyle = col;
  if (on < 0.5) {
    g.globalAlpha = 0.4;
    g.lineWidth = w * 1.2;
    g.stroke(path);
    g.globalAlpha = 1;
    return;
  }
  const rings = [[0.07, 11], [0.12, 6.6], [0.22, 3.8]].slice(3 - Math.max(1, Math.min(3, halo + 1)));
  for (const [a, k] of rings) {
    g.globalAlpha = a;
    g.lineWidth = w * k;
    g.stroke(path);
  }
  g.globalAlpha = 1;
  g.lineWidth = w * 1.35;
  g.stroke(path);
  g.strokeStyle = 'rgba(255,255,255,0.9)';
  g.lineWidth = w * 0.45;
  g.stroke(path);
}

export { TAU, W, hash, mod, canvas, pen, fs, box, poly, line, lines, circ, ell, rrPath, rbox, topRound, eggPath, GL, arcP, gl, textW, textPath, letters, LW, LWM, LWF, PAL, TILE, STRIP_M, bakeStrip, drawStrip, copies, YH, Z0, DWALL, VPX, fOfD, yOfF, xOf, M89, squiggle, confetti, grid, neon };
