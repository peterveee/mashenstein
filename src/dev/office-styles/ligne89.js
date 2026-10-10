// CORPORATE KOMBAT style bake-off — LIGNE '89 (Nagel / Memphis). The clear line of the
// LIGNE CLAIRE candidate (ligne.js), kept exactly: one even outline round every shape, flat
// colour, shadows as flat darker shapes, every switch and binder drawn. What moves is the
// calendar. Peter, 11 Oct 2026: vaporwave "unexpectedly is really fitting as it fits in with
// the time period we have set the game in late 80's / 90's ... would we take one of the more
// beautiful ones and infuse it with a slightly tacky 80s / 90's vibe?"
//
// So this is the tower in 1989, drawn the way Ever Meulen and Yves Chaland were drawing then:
// glass block and pink granite, black lacquer and chrome, a neon EGGCORP over the lobby,
// Memphis furniture and patterns (Sottsass squiggles, terrazzo confetti, primary-pastel
// blocks, the black-and-white grid), the Swatch/MTV palette (hot pink, teal, lemon, lilac),
// Patrick Nagel prints framed on the walls, vertical blinds, beige terminals with green
// screens, a fax, a Rolodex, a Tizio lamp, shoulder pads and perms, palms in white pots, and a
// pastel dusk with neon run up the towers. The founder hangs as a Nagel print of the silver
// professor. Tacky in the props and the palette, never sloppy in the line; the band behind
// the lane stays the calmest, lowest-contrast part of each floor.
//
// The machinery is ligne.js's: static parts baked per device scale into strips in each
// layer's own u, sliced into tiles and laid on whole device pixels; moving parts drawn per
// frame with the same snap.
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
    ink: '#231d2a', inkM: 'rgba(35,29,42,0.7)',
    sky: [[0, '#a3d5f2'], [92, '#bde0f4'], [134, '#f3d7e4']],
    sun: '#fff3b8', sunLine: '#f29cc0',
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
    wall: '#efd8d4', wallJoint: '#e0c2be', wallShade: '#dcbab6', fleck: ['#d2aaa6', '#fbeeed', '#c79c98'],
    gb: '#cfe4ec', gbLt: '#eef9fb', gbLine: '#9fbfcc',
    band: '#1f1d26', bandLt: '#3a3846',
    brass: '#c9ced8', brassDk: '#8e95a4', brassLt: '#f2f4f8', chrome: '#c9ced8',
    marble: '#1f1d26', marbleLt: '#3a3846', marbleVein: '#4c4a5a',
    column: '#26242f', columnDk: '#3c3a48', columnSide: '#15141b',
    frame: '#2a2833', frameLt: '#8e95a4',
    carLit: '#ffe9f3', carSide: '#f5cadf', carFloor: '#b9a2c2',
    ceil: '#f3eff5', ceilDk: '#ded7e3',
    floorA: '#eceaf1', floorB: '#e3e0e9', floorLine: '#cbc6d6', floorRefl: 'rgba(40,36,50,0.08)', sunPatch: 'rgba(255,250,253,0.62)',
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
    wall: '#ebe5f1', wallShade: '#dad1e6', dado: '#bfe4de', rail: '#93cfc7', skirting: '#2a2833',
    column: '#ded6e9', columnDk: '#cbc1da', columnSide: '#c0b4d2',
    frame: '#b9bfcc', frameLt: '#e6e9ef',
    sill: '#f3eff5', radiator: '#d8d0bf', radLine: '#b1a996',
    blind: '#f6f2f8', blindDk: '#d8d0e2',
    brass: '#c9ced8', brassDk: '#8e95a4', brassLt: '#f2f4f8', chrome: '#c9ced8',
    steel: '#c4c9d4', steelDk: '#959caa', steelLt: '#e8ebf1',
    carLit: '#fff0f6', carSide: '#eedae6', carFloor: '#aaa2b4',
    ceil: '#f1eff3', ceilLine: '#d8d4de',
    carpetA: '#837f99', carpetB: '#88849e', carpetLine: '#726e88',
    chips: ['#a094bc', '#7fa8aa', '#ab90a8', '#9b97b0'],
    slab: '#4f4c5e', slabDk: '#3f3c4c', slabTop: '#9b98b1', slabLine: '#36343f',
    partition: '#cbc7d5', partitionDk: '#b6b1c3', trim: '#8f8ba0', trimLt: '#ace0d9',
    neonA: '#ff4fa8', neonB: '#3fe0d0',
    front: 'rgba(42,36,66,0.44)', frontLt: 'rgba(220,240,255,0.22)',
  },
  exec: {
    ink: '#1e1a26', inkM: 'rgba(30,26,38,0.72)',
    sky: [[0, '#55479a'], [50, '#7458aa'], [74, '#9c64b6'], [98, '#cf78ba'], [120, '#ee8cb2'], [138, '#ffa6a2'], [152, '#ffc39c'], [164, '#ffe1a2']],
    sun: '#fff0b4', sunLine: '#ff8fb8',
    cloud: '#b48ad0', cloudShade: '#ffb3aa', cloudLine: '#76589f',
    stars: '#fff6ff',
    far: { tones: ['#8b75b5', '#7e6aa9', '#9985c1'], lit: '#ffe27a', litAlt: ['#ff8fc8', '#7fe8dc'], dark: '#6d5b99', line: '#6a5a96', lw: 0.38 },
    near: { tones: ['#4d4482', '#584a8e', '#443c74'], lit: '#ffe27a', dark: '#3a3467', rim: '#ff9fd0', line: '#2e2850', lw: 0.48, neon: ['#ff4fa8', '#3fe0d0', '#ffe04a'] },
    haze: 'rgba(255,172,204,0.3)',
    cityLights: ['#ffe88a', '#ff8fc8', '#7fe8dc'],
    wood: '#25222f', woodLt: '#47425a', woodDk: '#18161f', woodLine: '#0f0e14', panel: '#7d6f9a', panelLt: '#998bb6',
    brass: '#c9ced8', brassDk: '#8e95a4', brassLt: '#f2f4f8', chrome: '#c9ced8',
    column: '#201d29', columnDk: '#302c3c', columnSide: '#131118',
    frame: '#1c1a24', frameLt: '#55506a',
    carLit: '#ffe6f2', carSide: '#efc4da', carFloor: '#8f7aa0',
    ceil: '#2a2634', ceilDk: '#1c1a24',
    carpetA: '#9d94b7', carpetB: '#a299bc', carpetLine: '#8b82a6',
    rug: '#8f7fbf', rugIn: '#a596cf', rugBorder: '#2a2634', rugLine: '#2a2634',
    warm: 'rgba(255,170,220,0.13)', warmPool: 'rgba(255,196,232,0.24)', sunPatch: 'rgba(255,160,200,0.24)',
    slab: '#211e2a', slabDk: '#16141c', slabTop: '#c9ced8', slabLine: '#35313f',
    neonA: '#ff4fa8', neonB: '#3fe0d0',
    front: 'rgba(30,20,46,0.5)', frontLt: 'rgba(255,160,230,0.2)',
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
        const hv = hash(b.i * 53.1 + r * 7.7 + c * 3.1);
        const on = hv < b.lit;
        g.fillStyle = on ? (hv < b.lit * 0.2 ? Pf.litAlt[(r + c) % 2] : Pf.lit) : Pf.dark;
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
  { bg: '#ff6fae', ink: '#ffffff', text: 'RAD!' },
  { bg: '#1f1d26', ink: '#3fe0d0', text: 'VIDEO' },
  { bg: '#2fbcb0', ink: '#fff6a8', text: 'EGGCORP' },
  { bg: '#f6df4a', ink: '#1f1d26', text: 'CASSETTE' },
];
const SHOPS = ['VIDEO', 'ARCADE', 'RECORDS', 'SUSHI', 'AEROBICS', 'PAGERS', 'TANNING', 'PIZZA', 'DISCO', 'CDS'];

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

const BLADES = ['HOTEL', 'VIDEO', 'DISCO', 'ARCADE', 'NEON'];
function streetDressing(g, b, Pn, base) {
  const ln = Pn.line;
  const kind = b.i % 4;
  if (kind === 0 && b.w > 60) {
    // a black blade sign lettered in pink neon
    const word = BLADES[(b.i >> 2) % BLADES.length];
    const bx = b.u + (b.i % 8 ? b.w - 10 : 4);
    const by = base - 70;
    const h = word.length * 6.4 + 4;
    lines(g, [bx - 1, by + 3, bx + 3, by + 3, bx - 1, by + h - 3, bx + 3, by + h - 3], ln, 0.5);
    box(g, bx + 1, by, 7, h, '#1f1d26', ln, Pn.lw);
    [...word].forEach((ch, k) => {
      const p = textPath(ch, bx + 4.5, by + 7.4 + k * 6.4, 4, { align: 'center' });
      neon(g, p, k % 2 ? '#3fe0d0' : '#ff4fa8', 0.5);
    });
  } else if (kind === 2 && b.roof === 'cornice' && b.top > 20) {
    const fx = b.u + b.w * 0.5;
    line(g, fx, b.top - 1, fx, b.top - 16, ln, 0.5);
    poly(g, [fx, b.top - 16, fx + 9, b.top - 14.6, fx + 8.4, b.top - 10.6, fx, b.top - 11.6], ['#ff6fae', '#2fbcb0', '#f4dc4c'][b.i % 3], ln, 0.4);
  }
}

function shopFront(g, b, Pn, P, base) {
  const x = b.u + 2;
  const w = b.w - 4;
  const ln = Pn.line;
  const lw = Pn.lw;
  const awn = P.awn[b.shop];
  const name = SHOPS[b.i % SHOPS.length];
  // a black fascia with the shop's name in neon
  box(g, x, base - 22, w, 5, '#1f1d26', ln, lw);
  letters(g, name, x + w / 2, base - 18.2, 3.2, { ink: b.i % 2 ? '#ff6fae' : '#3fe0d0', lw: 0.5, align: 'center', slant: 0.18 });
  box(g, x + 1, base - 17, w - 2, 17, '#a9e0ec', ln, lw);
  const dx = x + (b.i % 2 ? w - 12 : 4);
  box(g, dx, base - 14, 8, 14, '#2a2833', ln, lw);
  box(g, dx + 1.5, base - 12.5, 5, 6, '#a9e0ec', ln, lw * 0.6);
  for (let k = 0, gx = x + 4; gx < x + w - 6; gx += 6, k++) {
    if (Math.abs(gx + 2 - (dx + 4)) < 7) continue;
    const c = ['#ff6fae', '#f6df4a', '#2fbcb0', '#b39ae6'][(b.i + k) % 4];
    box(g, gx, base - 6 - (k % 3), 3.6, 4 + (k % 3), c, ln, lw * 0.5);
  }
  // the awning: a flat wedge, striped, a hard 80s edge
  const ay = base - 17;
  poly(g, [x - 1, ay - 1, x + w + 1, ay - 1, x + w + 3, ay + 4, x - 3, ay + 4], awn, ln, lw);
  g.save();
  g.beginPath();
  g.moveTo(x - 1, ay - 1); g.lineTo(x + w + 1, ay - 1); g.lineTo(x + w + 3, ay + 4); g.lineTo(x - 3, ay + 4); g.closePath();
  g.clip();
  g.fillStyle = '#ffffff';
  for (let sx = x - 3; sx < x + w + 3; sx += 6) g.fillRect(sx, ay - 1, 2, 6);
  g.restore();
  line(g, x - 3, ay + 4, x + w + 3, ay + 4, '#1f1d26', 0.8);
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

// Dusk, 1989: the towers in flat violet, windows yellow and slate, and neon run up their
// edges and across their crowns in pink, teal and lemon.
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
  const nc = Pn.neon[b.i % 3];
  const crown = new Path2D();
  if (b.roof === 'spire') {
    box(g, cx - w * 0.32, t - 10, w * 0.64, 10, face, ln, lw);
    box(g, cx - w * 0.18, t - 18, w * 0.36, 8, face, ln, lw);
    poly(g, [cx - 2, t - 18, cx, t - 46, cx + 2, t - 18], face, ln, lw);
    crown.moveTo(cx - w * 0.32, t - 10); crown.lineTo(cx + w * 0.32, t - 10);
    crown.moveTo(cx - w * 0.18, t - 18); crown.lineTo(cx, t - 44); crown.lineTo(cx + w * 0.18, t - 18);
  } else if (b.roof === 'stepped') {
    box(g, x + w * 0.14, t - 12, w * 0.72, 12, face, ln, lw);
    box(g, x + w * 0.3, t - 22, w * 0.4, 10, face, ln, lw);
    crown.moveTo(x + w * 0.14, t - 12); crown.lineTo(x + w * 0.86, t - 12);
    crown.moveTo(x + w * 0.3, t - 22); crown.lineTo(x + w * 0.7, t - 22);
  } else if (b.roof === 'antenna') {
    lines(g, [cx, t, cx, t - 34, cx - 4, t - 14, cx + 4, t - 14, cx - 2.5, t - 24, cx + 2.5, t - 24], ln, lw);
  }
  box(g, x, t, w, base - t, face, ln, lw);
  const cw = (w - 4) / b.cols;
  for (let r = 0, y = t + 4; y < base - 2; r++, y += b.floorH * 0.8) {
    for (let c = 0; c < b.cols; c++) {
      const on = hash(b.i * 71.3 + r * 13.1 + c * 2.9) < b.lit;
      g.fillStyle = on ? Pn.lit : Pn.dark;
      g.fillRect(x + 2 + c * cw + cw * 0.22, y, cw * 0.56, b.floorH * 0.42);
    }
  }
  crown.moveTo(x + 0.6, t + 0.6);
  crown.lineTo(x + w - 0.6, t + 0.6);
  if (b.i % 2 === 0) { crown.moveTo(x + 0.6, t + 0.6); crown.lineTo(x + 0.6, base); }
  else { crown.moveTo(x + w - 0.6, t + 0.6); crown.lineTo(x + w - 0.6, base); }
  neon(g, crown, nc, 0.55);
  if (b.roof === 'antenna' || b.roof === 'spire') circ(g, cx, t - (b.roof === 'spire' ? 46 : 34), 1.1, '#ff5a8a', ln, 0.3);
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

function vehicle(ctx, c, P) {
  const ln = '#3e3a52';
  ctx.save();
  ctx.translate(c.x + (c.dir < 0 ? c.w : 0), c.y);
  ctx.scale(c.dir, 1);
  const wheel = (x) => { circ(ctx, x, -2.2, 2.3, '#24222c', ln, 0.4); circ(ctx, x, -2.2, 1.1, '#d6dae2'); };
  if (c.kind === 'bus') {
    // a teal bus with a pink speed stripe and smoked windows
    box(ctx, 0, -22, 64, 19, '#7fd6cc', ln, 0.45);
    box(ctx, 1, -18, 62, 7, '#2a2a3a', ln, 0.4);
    for (let k = 0; k < 8; k++) {
      if (k % 3 !== 1 && k > 0) circ(ctx, 5.8 + k * 7.2, -14.6, 1.4, k % 2 ? '#f0c4a6' : '#c98e64');
      line(ctx, 2.8 + k * 7.2, -18, 2.8 + k * 7.2, -11, '#4a4a5a', 0.4);
    }
    box(ctx, 1, -9.6, 62, 1.6, '#ff6fae');
    box(ctx, 1, -8, 62, 0.8, '#f6df4a');
    box(ctx, 44, -21.4, 13, 3, '#24222c');
    letters(ctx, '23', 50.5, -19, 2.2, { ink: '#ff8a5a', lw: 0.35, align: 'center' });
    wheel(12); wheel(50);
  } else if (c.kind === 'cab') {
    // a boxy eighties cab: all corners, a light bar
    poly(ctx, [1, -3, 1, -8, 8, -8.4, 11, -12.4, 22, -12.4, 25, -8.4, 29.5, -7.8, 29.5, -3], '#f6d24a', ln, 0.45);
    poly(ctx, [11.6, -8.6, 13.6, -11.6, 17, -11.6, 17, -8.6], '#3a3a4c', ln, 0.35);
    poly(ctx, [18, -8.6, 18, -11.6, 21.4, -11.6, 23.6, -8.6], '#3a3a4c', ln, 0.35);
    box(ctx, 14.5, -14.2, 5, 1.8, '#ff6fae', ln, 0.3);
    ctx.fillStyle = '#24222c';
    for (let k = 0; k < 7; k++) ctx.fillRect(4 + k * 3.2, -6.4 + (k % 2) * 0.9, 1.6, 0.9);
    line(ctx, 0.5, -3.4, 30, -3.4, '#24222c', 0.9);
    wheel(7); wheel(23.5);
  } else {
    // the red wedge: low, flat, pop-up lamps, a stripe down the flank
    poly(ctx, [0.5, -3, 0.5, -6.6, 9, -8, 13, -10.6, 19, -10.6, 22, -7.6, 27.8, -6.4, 27.8, -3], '#e0263c', ln, 0.45);
    poly(ctx, [13.6, -8.2, 14.4, -10, 18.4, -10, 20.6, -8.2], '#3a3a4c', ln, 0.35);
    line(ctx, 2, -5.2, 26.5, -5.2, '#ffffff', 0.5);
    box(ctx, 23, -8.6, 3.4, 1.2, '#24222c');
    line(ctx, 0.5, -3.4, 28, -3.4, '#24222c', 0.9);
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


// ------------------------------------------------------------- 1989 patterns
// Memphis in the same pen: squiggles, confetti, the black-and-white grid, neon tubes and
// glass block. All flat; a neon tube is a flat halo, its coloured glass and a white core.
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

function neon(g, path, col, w = 1) {
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.globalAlpha = 0.26;
  g.strokeStyle = col;
  g.lineWidth = w * 3.8;
  g.stroke(path);
  g.globalAlpha = 1;
  g.lineWidth = w * 1.3;
  g.stroke(path);
  g.strokeStyle = 'rgba(255,255,255,0.85)';
  g.lineWidth = w * 0.42;
  g.stroke(path);
}

function glassBlocks(g, x, y, w, h, P, cell = 8) {
  box(g, x, y, w, h, P.gbLine);
  for (let by = y; by < y + h - 0.5; by += cell) {
    for (let bx = x; bx < x + w - 0.5; bx += cell) {
      const bw = Math.min(cell, x + w - bx);
      const bh = Math.min(cell, y + h - by);
      box(g, bx + 0.6, by + 0.6, bw - 1.2, bh - 1.2, P.gb);
      if (bw > 4.5 && bh > 4.5) {
        box(g, bx + 2, by + 2, bw - 4, bh - 4, P.gbLt);
        line(g, bx + 2.4, by + bh - 2.6, bx + bw - 2.6, by + 2.4, P.gbLine, 0.35);
      }
    }
  }
  box(g, x, y, w, h, null, P.ink, LWF);
}

// A Nagel print: hard black bob, white profile, red lips, one long lid; flat geometric
// blocks behind her; a thin chrome frame. variant 1 puts the skyline behind her.
function nagelPrint(g, h, P) {
  const { x, y, w } = h;
  const hh = h.h;
  const variant = h.variant;
  box(g, x + 1.2, y + 1.6, w, hh, 'rgba(0,0,0,0.14)');
  box(g, x, y, w, hh, P.chrome, P.ink, LW);
  box(g, x + 1.6, y + 1.6, w - 3.2, hh - 3.2, '#ffffff', P.ink, LWF);
  const ix = x + 4;
  const iy = y + 4;
  const iw = w - 8;
  const ih = hh - 8;
  g.save();
  g.beginPath();
  g.rect(ix, iy, iw, ih);
  g.clip();
  box(g, ix, iy, iw, ih, variant ? '#f7b9d2' : '#9fdcd6');
  poly(g, [ix + iw * 0.5, iy, ix + iw, iy, ix + iw, iy + ih * 0.66], variant ? '#b39ae6' : '#f6df4a');
  if (variant) {
    for (const [bx, bh] of [[0, 9], [5, 15], [10, 7], [15, 19], [21, 11], [26, 14]]) box(g, ix + (bx * iw) / 30, iy + ih - bh, iw * 0.18, bh, '#8a74b4', P.ink, 0.3);
  }
  const s = iw / 30;
  const cx = ix + iw * 0.5;
  const cy = iy + ih * 0.4;
  const skin = '#f8f4f2';
  const jet = '#141218';
  poly(g, [cx - 2 * s, cy + 6 * s, cx + 3 * s, cy + 6 * s, cx + 4 * s, cy + 12 * s, cx + 14 * s, cy + 16 * s, cx + 14 * s, iy + ih + 1,
    cx - 12 * s, iy + ih + 1, cx - 10 * s, cy + 15 * s, cx - 3 * s, cy + 12 * s], skin, P.ink, 0.45);
  poly(g, [cx - 12 * s, iy + ih + 1, cx - 9 * s, cy + 17.5 * s, cx + 2 * s, cy + 19.5 * s, cx + 14 * s, cy + 17.5 * s, cx + 14 * s, iy + ih + 1], jet, P.ink, 0.45);
  g.beginPath();
  g.moveTo(cx + 4 * s, cy - 9 * s);
  g.lineTo(cx - 3.5 * s, cy - 8 * s);
  g.lineTo(cx - 5 * s, cy - 2 * s);
  g.lineTo(cx - 6.8 * s, cy + 1.6 * s);
  g.lineTo(cx - 5 * s, cy + 2.4 * s);
  g.lineTo(cx - 5.4 * s, cy + 4 * s);
  g.lineTo(cx - 4.6 * s, cy + 5.2 * s);
  g.lineTo(cx - 3.4 * s, cy + 7 * s);
  g.lineTo(cx + 2 * s, cy + 7.6 * s);
  g.lineTo(cx + 5 * s, cy + 2 * s);
  g.closePath();
  fs(g, skin, P.ink, 0.45);
  poly(g, [cx - 5.3 * s, cy + 3.6 * s, cx - 3.6 * s, cy + 3.2 * s, cx - 3.4 * s, cy + 4.8 * s, cx - 4.8 * s, cy + 5.2 * s], '#e0203a');
  line(g, cx - 3.9 * s, cy - 2.4 * s, cx - 0.4 * s, cy - 2.9 * s, jet, 0.7);
  poly(g, [cx - 3.4 * s, cy - 2.2 * s, cx - 0.9 * s, cy - 2.6 * s, cx - 1.6 * s, cy - 1.5 * s], jet);
  poly(g, [cx - 4 * s, cy - 7.8 * s, cx - 2 * s, cy - 12 * s, cx + 6 * s, cy - 13 * s, cx + 11 * s, cy - 9 * s, cx + 12 * s, cy + 6 * s,
    cx + 6 * s, cy + 9 * s, cx + 3.4 * s, cy + 2 * s, cx + 2 * s, cy - 4.5 * s, cx - 3.6 * s, cy - 4.4 * s], jet, P.ink, 0.45);
  poly(g, [cx + 3 * s, cy - 11.6 * s, cx + 8.4 * s, cy - 10 * s, cx + 5 * s, cy - 9.2 * s], '#ffffff');
  g.restore();
}

// The founder as a Nagel print: flat white face, the mane in white and pale grey, the cape
// jet black lined in lipstick red, on hot pink with a lilac wedge and a black bar.
const PROF_NAGEL = {
  skin: '#faf3f1', skinDk: '#ecdcdc', stubble: '#f0e6e6', chin: '#ffffff',
  tones: [['#ffffff', '#e4e4ee'], ['#eef0f6', '#d4d6e2'], ['#dcdee8', '#c2c4d2']],
  stache: '#e8eaf2', rim: '#141218', lens: '#bfe9f6', cape: '#141218', capeIn: '#e0203a', shirt: '#ffffff',
};

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
  // glass block above the frieze, with the morning coming through it
  glassBlocks(g, x0, 22, x1 - x0, 70.5, P, 8.8);
  // pink granite below, flecked, in big polished slabs
  const w = x1 - x0;
  for (let k = 0; k < Math.round(w * 1.6); k++) {
    const px = x0 + hash(w * 0.13 + k * 3.17) * w;
    const py = 99 + hash(w * 0.29 + k * 5.71) * 95;
    g.fillStyle = P.fleck[k % 3];
    g.fillRect(px, py, 0.7 + (k % 2) * 0.4, 0.7);
  }
  g.beginPath();
  for (let y = 98.5 + 32; y < 195; y += 32) { g.moveTo(x0, y); g.lineTo(x1, y); }
  for (let x = x0 + 46; x < x1 - 4; x += 46) { g.moveTo(x, 98.5); g.lineTo(x, 195); }
  pen(g, P.wallJoint, 0.55);
  g.stroke();
  lobbyCornice(g, x0, x1, P);
  // the black lacquer frieze, a pink pinstripe and a teal squiggle along it
  box(g, x0, 92.5, x1 - x0, 6, P.band, P.ink, LW);
  line(g, x0, 93.7, x1, 93.7, M89.pink, 0.5);
  squiggle(g, x0 + 2, x1 - 2, 96.3, 0.9, 6, M89.teal, 0.6);
  box(g, x0, 195, x1 - x0, 9, P.marble, P.ink, LW);
  line(g, x0, 196.6, x1, 196.6, P.chrome, 0.6);
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
  // a postmodern ziggurat in black lacquer, lined in chrome
  poly(g, [x - 5, WALL_BASE, x - 5, y - 4, x - 2, y - 4, x - 2, y - 16, x + w / 2 - 6, y - 16, x + w / 2 - 6, y - 21,
    x + w / 2 + 6, y - 21, x + w / 2 + 6, y - 16, x + w + 2, y - 16, x + w + 2, y - 4, x + w + 5, y - 4, x + w + 5, WALL_BASE], P.marble, P.ink, LW);
  lines(g, [x - 3.4, y - 2, x - 3.4, WALL_BASE, x + w + 3.4, y - 2, x + w + 3.4, WALL_BASE], M89.pink, 0.5);
  poly(g, [x + w / 2 - 4, y - 16, x + w / 2, y - 20, x + w / 2 + 4, y - 16], M89.teal);
  box(g, x - 1.5, y - 1.5, w + 3, hh + 1.5, P.chrome, P.ink, LWF);
  box(g, x, y, w, hh, P.carLit, P.ink, LWF);
  poly(g, [x, y, x + 5, y + 5, x + 5, y + hh - 6, x, y + hh], P.carSide, P.ink, LWF);
  poly(g, [x + w, y, x + w - 5, y + 5, x + w - 5, y + hh - 6, x + w, y + hh], P.carSide, P.ink, LWF);
  poly(g, [x, y + hh, x + 5, y + hh - 6, x + w - 5, y + hh - 6, x + w, y + hh], P.carFloor, P.ink, LWF);
  line(g, x + 5, y + hh * 0.55, x + w - 5, y + hh * 0.55, P.chrome, 0.9);
  box(g, x + 9, y + 10, w - 18, hh * 0.32, '#fff6fb', P.ink, LWF);
  // the LED panel over the doors (its digits are lit per frame)
  box(g, x + w / 2 - 8, y - 13, 16, 8, '#18161e', P.ink, LWF);
  box(g, x + w / 2 - 8, y - 13, 16, 8, null, P.chrome, 0.5);
  // the call buttons
  box(g, x + w + 1.6, y + hh * 0.48, 2.6, 6, P.chrome, P.ink, LWF);
  circ(g, x + w + 2.9, y + hh * 0.48 + 1.7, 0.7, M89.pink);
  circ(g, x + w + 2.9, y + hh * 0.48 + 4.3, 0.7, M89.teal);
}

// EGGCORP in neon on a black lacquer panel: the egg in teal tube, the name in pink.
function lobbyLogo(g, h, P) {
  const { x, y, w } = h;
  const hh = h.h;
  box(g, x + 1.4, y + 1.8, w, hh, P.wallShade);
  box(g, x, y, w, hh, '#1b1a22', P.ink, LW);
  grid(g, x + 2, y + 2, w - 4, hh - 4, 6, '#1b1a22', '#2c2a36', 0.4);
  box(g, x, y, w, hh, null, P.chrome, 0.7);
  const ex = x + 22;
  const ey = y + 28;
  const egg = new Path2D();
  egg.ellipse(ex, ey + 2.2, 10, 13.5 - 2.2, 0, 0, Math.PI);
  egg.ellipse(ex, ey + 2.2, 10, 13.5 + 2.2, 0, Math.PI, TAU);
  neon(g, egg, P.neonB, 1.1);
  const crack = new Path2D();
  crack.moveTo(ex - 7, ey + 1); crack.lineTo(ex - 3.5, ey - 2.5); crack.lineTo(ex - 0.5, ey + 1.6); crack.lineTo(ex + 3, ey - 2.4); crack.lineTo(ex + 6.6, ey + 1);
  neon(g, crack, P.neonA, 0.8);
  neon(g, textPath('EGGCORP', x + 46, y + 35, 15, { slant: 0.16, track: 1.3 }), P.neonA, 1.25);
  line(g, x + 46, y + 41.5, x + w - 6, y + 41.5, P.chrome, 0.7);
  letters(g, 'WORLD HEADQUARTERS', x + 46 + (w - 52) / 2, y + 49.5, 4.2, { ink: P.chrome, lw: 0.5, align: 'center', track: 1.3, slant: 0.16 });
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
  nagelPrint(g, { ...h, variant: 1 }, P);
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
  box(g, x0, F.ceilingY + 3, x1 - x0, 2.6, '#dcd8e2', P.ink, LWF);
  g.beginPath();
  for (let x = x0 + 8; x < x1; x += 24) { g.moveTo(x, F.ceilingY + 5.6); g.lineTo(x, F.ceilingY + 8); }
  pen(g, P.ink, 0.4);
  g.stroke();
  // a band of pastel blocks, the decade's favourite trim
  const cols = [M89.pink, M89.teal, M89.lemon, M89.lilac];
  for (let x = x0, k = 0; x < x1; x += 12, k++) box(g, x, F.ceilingY + 10, Math.min(12, x1 - x), 3.2, cols[k % 4]);
  box(g, x0, F.ceilingY + 10, x1 - x0, 3.2, null, P.ink, LWF);
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
  for (let i = 0; i <= n; i++) box(g, x0 + i * pitch - 1, G.top, 2, gh, P.frame, P.ink, LWF);
  box(g, x0, G.top, x1 - x0, 1.6, P.frame, P.ink, LWF);
  // vertical blinds: louvres hung from a headrail, drawn across part of the window, the
  // rest stacked at the side; a bead chain along their feet
  box(g, x0, G.top - 2.4, x1 - x0, 2.4, P.frameLt, P.ink, LWF);
  const cover = Math.max(6, (x1 - x0) * b.blinds);
  const slat = b.blinds > 0 ? 2.6 : 1.4;
  const step = b.blinds > 0 ? 4.2 : 1.6;
  for (let x = x0 + 0.4; x < x0 + cover - 0.5; x += step) {
    box(g, x, G.top, slat, gh - 1, P.blind);
    line(g, x + slat, G.top, x + slat, G.top + gh - 1, P.blindDk, 0.5);
  }
  line(g, x0, G.top + gh - 3, x0 + cover, G.top + gh - 3, P.blindDk, 0.4);
  box(g, x0, G.top, cover, gh - 1, null, P.ink, 0.35);
  // the sill and the heating units under it
  box(g, x0 - 1, G.bottom, x1 - x0 + 2, 3.2, P.sill, P.ink, LW);
  box(g, x0, G.bottom + 3.2, x1 - x0, 1.6, P.wallShade);
  const rn = Math.max(1, Math.round((x1 - x0) / 70));
  const rp = (x1 - x0) / rn;
  for (let i = 0; i < rn; i++) radiator(g, x0 + i * rp + 6, rp - 12, P);
}

// A beige fan-coil unit: a louvred top, a control panel, a black kick.
function radiator(g, x, w, P) {
  const y0 = 162;
  const y1 = 196;
  box(g, x, y0, w, y1 - y0, P.radiator, P.ink, LWF);
  g.beginPath();
  for (let y = y0 + 2.5; y < y0 + 12; y += 2.2) { g.moveTo(x + 3, y); g.lineTo(x + w - 14, y); }
  pen(g, P.radLine, 0.55);
  g.stroke();
  box(g, x + w - 11, y0 + 3, 8, 9, '#c9c0ad', P.ink, 0.35);
  circ(g, x + w - 7, y0 + 7.5, 2, '#e8e2d4', P.ink, 0.3);
  line(g, x + w - 7, y0 + 7.5, x + w - 6, y0 + 6, M89.pink, 0.5);
  box(g, x, y1 - 3, w, 3, '#2a2833', P.ink, LWF);
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
  box(g, x, y, w, hh, '#1b1a22', P.ink, LW);
  const ix = x + 1.4;
  const iy = y + 1.4;
  const iw = w - 2.8;
  const ih = hh - 2.8;
  g.save();
  g.beginPath();
  g.rect(ix, iy, iw, ih);
  g.clip();
  if (label === 'SYNERGY') {
    grid(g, ix, iy, iw, ih, 3.4, '#ffffff', '#1b1a22', 0.35);
    circ(g, ix + iw * 0.38, iy + ih * 0.36, iw * 0.24, M89.pink, P.ink, LWF);
    poly(g, [ix + iw * 0.42, iy + ih * 0.62, ix + iw * 0.66, iy + ih * 0.12, ix + iw * 0.9, iy + ih * 0.62], M89.teal, P.ink, LWF);
    squiggle(g, ix + 2, ix + iw - 2, iy + ih * 0.7, 1.2, 4, '#1b1a22', 0.7);
    box(g, ix, iy + ih - 9, iw, 9, M89.lemon, P.ink, LWF);
    letters(g, 'SYNERGY', ix + iw / 2, iy + ih - 2.4, 4, { ink: '#1b1a22', lw: 0.62, align: 'center', track: 0.7, slant: 0.18 });
  } else if (label === 'HANG IN THERE') {
    box(g, ix, iy, iw, ih, '#cdb9ef');
    g.beginPath();
    g.moveTo(ix, iy + 7);
    g.quadraticCurveTo(ix + iw * 0.5, iy + 5, ix + iw, iy + 9);
    pen(g, '#6b4a30', 1.4);
    g.stroke();
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
    confetti(g, ix, iy + 10, iw, 14, 6, 31, [M89.pink, M89.teal, M89.lemon], 1.4, 0.5);
    letters(g, 'HANG IN', ix + iw / 2, iy + ih - 7.5, 3.4, { ink: '#1b1a22', lw: 0.55, align: 'center', track: 0.8, slant: 0.18 });
    letters(g, 'THERE', ix + iw / 2, iy + ih - 2.5, 3.4, { ink: '#1b1a22', lw: 0.55, align: 'center', track: 0.8, slant: 0.18 });
  } else {
    box(g, ix, iy, iw, ih, M89.teal);
    circ(g, ix + iw * 0.7, iy + ih * 0.28, iw * 0.2, M89.pink, P.ink, LWF);
    const wy = iy + ih * 0.6;
    box(g, ix, wy, iw, ih * 0.4, '#7fd6cc');
    poly(g, [ix + 2, wy - 1, ix + iw - 2, wy - 1, ix + iw - 5, wy + 1.4, ix + 4, wy + 1.4], '#1b1a22', P.ink, 0.35);
    for (let k = 0; k < 4; k++) {
      const rx = ix + 6 + (k * (iw - 12)) / 3;
      circ(g, rx, wy - 4.6, 1.2, '#1b1a22');
      box(g, rx - 0.9, wy - 3.6, 1.8, 2.6, '#1b1a22');
      line(g, rx + 0.5, wy - 2.4, rx - 4, wy + 3, '#1b1a22', 0.5);
    }
    squiggle(g, ix + 2, ix + iw - 2, wy + 4.4, 0.9, 4, '#ffffff', 0.5);
    letters(g, 'TEAMWORK', ix + iw / 2, iy + ih - 3.6, 3.5, { ink: '#ffffff', lw: 0.58, align: 'center', track: 0.7, slant: 0.18 });
  }
  g.restore();
}

function meetingDoor(g, h, P) {
  const { x, y, w } = h;
  const hh = h.h;
  box(g, x - 3, y - 3, w + 6, hh + 3, P.chrome, P.ink, LW);
  box(g, x, y, w, hh, '#25232e', P.ink, LWF);
  // a glass-block vision panel, the name on a chrome plate over it
  glassBlocks(g, x + 5, y + 14, w - 10, hh * 0.38, { ...P, gb: '#cfe4ec', gbLt: '#eef9fb', gbLine: '#9fbfcc' }, 5.6);
  box(g, x + 3, y + 3, w - 6, 9.6, P.chrome, P.ink, LWF);
  letters(g, 'MEETING 4B', x + w / 2, y + 9.6, 3.3, { ink: '#1b1a22', lw: 0.5, align: 'center', slant: 0.12 });
  box(g, x + w - 7, y + hh * 0.56, 4, 1.6, P.chrome, P.ink, 0.35);
  line(g, x + 3, y + hh * 0.72, x + w - 3, y + hh * 0.72, M89.pink, 0.6);
  box(g, x + w / 2 - 10, y - 11, 20, 6.4, '#1b1a22', P.ink, LWF);
  box(g, x + w / 2 - 8.8, y - 9.9, 17.6, 4.2, '#ff3b5a');
  letters(g, 'IN USE', x + w / 2, y - 6.4, 2.8, { ink: '#fff2f6', lw: 0.42, align: 'center' });
  box(g, x + w + 5, y + 30, 4, 6, '#eeeaf2', P.ink, LWF);
  box(g, x + w + 5.3, y + 39, 3.4, 5, '#1b1a22', P.ink, LWF);
  circ(g, x + w + 7, y + 40.5, 0.6, '#6cd06a');
  rbox(g, x - 15, y + 22, 7, 9, 1.5, '#e8e2d4', P.ink, LWF);
  circ(g, x - 11.5, y + 26.5, 2.2, '#d6d0c2', P.ink, 0.3);
  line(g, x - 11.5, y + 26.5, x - 10.3, y + 25, M89.pink, 0.45);
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

function execPanels(g, x0, x1, P, F) {
  const top = F.ceilingY;
  box(g, x0, top, x1 - x0, WALL_BASE - top, P.wood);
  box(g, x0, top, x1 - x0, 7, P.woodDk, P.ink, LW);
  box(g, x0, top + 5, x1 - x0, 2, P.chrome, P.ink, LWF);
  // grey-violet suede panels in black lacquer reveals, a chrome bead round each
  const n = Math.max(1, Math.round((x1 - x0) / 34));
  const pw = (x1 - x0) / n;
  const rows = [[top + 13, 146], [157, 193]];
  for (let i = 0; i < n; i++) {
    const px = x0 + i * pw;
    for (const [y0, y1] of rows) {
      const ix = px + 2.5;
      const iw = pw - 5;
      box(g, ix, y0, iw, y1 - y0, P.panel, P.ink, LWF);
      box(g, ix, y0, iw, 1.6, P.panelLt);
      box(g, ix + 1.2, y0 + 1.2, iw - 2.4, y1 - y0 - 2.4, null, P.chrome, 0.35);
    }
  }
  // a teal neon tube run along under the cornice
  const tube = new Path2D();
  tube.moveTo(x0 + 3, top + 10);
  tube.lineTo(x1 - 3, top + 10);
  neon(g, tube, P.neonB, 0.7);
  box(g, x0, 148.5, x1 - x0, 4, P.woodLt, P.ink, LWF);
  line(g, x0, 150.5, x1, 150.5, M89.pink, 0.5);
  box(g, x0, 196, x1 - x0, 8, P.woodDk, P.ink, LW);
  line(g, x0, 197.5, x1, 197.5, P.chrome, 0.6);
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
function professor(g, cx, hy, s, ink, pal = PROF) {
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
    fs(g, pal.cape, ink, lw);
    g.beginPath();
    g.moveTo(cx + sd * 7 * s, hy + 12.6 * s);
    g.quadraticCurveTo(cx + sd * 13.2 * s, hy + 9.4 * s, cx + sd * 16.2 * s, hy - 0.8 * s);
    g.quadraticCurveTo(cx + sd * 17.8 * s, hy + 6 * s, cx + sd * 16.2 * s, hy + 14.6 * s);
    g.closePath();
    fs(g, pal.capeIn, ink, fine);
  }
  // the cape over his shoulders
  ell(g, cx, hy + 21.5 * s, 16.5 * s, 9.5 * s, pal.cape, ink, lw);
  line(g, cx - 11 * s, hy + 19 * s, cx - 8 * s, hy + 26 * s, '#3a3a4a', 0.5);
  line(g, cx + 11 * s, hy + 19 * s, cx + 8 * s, hy + 26 * s, '#3a3a4a', 0.5);
  // the neck and the collar's two white points
  box(g, cx - 2.6 * s, hy + 7 * s, 5.2 * s, 6 * s, pal.skinDk, ink, fine);
  for (const sd of [-1, 1]) {
    poly(g, [cx + sd * 1.2 * s, hy + 12.6 * s, cx + sd * 8.4 * s, hy + 12 * s, cx + sd * 5 * s, hy + 18.5 * s], pal.shirt, ink, fine);
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
  PROF_MANE.back.forEach((l, i) => lock(l, pal.tones[i % 3][1]));
  // ears, the egg of a head
  for (const sd of [-1, 1]) {
    ell(g, cx + sd * R * 0.95, hy + RY * 0.02, R * 0.22, RY * 0.25, pal.skin, ink, fine, sd * 0.28);
    g.beginPath();
    g.ellipse(cx + sd * R * 0.98, hy + RY * 0.02, R * 0.1, RY * 0.12, sd * 0.28, -1.9, 1.5);
    pen(g, 'rgba(120,80,60,0.6)', 0.3);
    g.stroke();
  }
  g.beginPath();
  profHeadPath(g, cx, hy, R, RY);
  fs(g, pal.skin, null, 0);
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
  g.fillStyle = pal.stubble;
  g.fill();
  g.beginPath();
  g.moveTo(cx - R * 0.45, hy + RY * 0.72);
  g.quadraticCurveTo(cx, hy + RY * 0.92, cx + R * 0.45, hy + RY * 0.72);
  g.lineTo(cx + R * 0.4, hy + RY * 1.1);
  g.lineTo(cx - R * 0.4, hy + RY * 1.1);
  g.closePath();
  g.fillStyle = pal.chin;
  g.fill();
  g.restore();
  g.beginPath();
  profHeadPath(g, cx, hy, R, RY);
  fs(g, null, ink, lw);
  PROF_MANE.front.forEach((l, i) => lock(l, pal.tones[i % 3][0]));
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
    line(g, lx + sd * hw, sy - lh * 0.6, cx + sd * R * 0.97, sy + lh * 0.1, pal.rim, 0.35);
    g.beginPath();
    g.moveTo(lx - sd * hw, sy - lh);
    g.lineTo(lx + sd * hw, sy - lh);
    g.lineTo(lx + sd * hw * 0.82, sy + lh - 0.4);
    g.quadraticCurveTo(lx + sd * hw * 0.78, sy + lh, lx + sd * hw * 0.5, sy + lh);
    g.lineTo(lx - sd * hw * 0.55, sy + lh);
    g.quadraticCurveTo(lx - sd * hw * 0.78, sy + lh, lx - sd * hw * 0.8, sy + lh - 0.4);
    g.closePath();
    fs(g, pal.lens, pal.rim, 0.45);
    circ(g, lx - sd * hw * 0.1, sy + lh * 0.1, 0.62 * s, '#1a1028');
    line(g, lx - hw * 0.55, sy - lh * 0.35, lx - hw * 0.15, sy - lh * 0.35, 'rgba(255,255,255,0.8)', 0.35);
  }
  box(g, cx - off - hw, sy - lh - 0.3, (off + hw) * 2, 0.75, pal.rim);
  // nose, moustache, frown
  ell(g, cx, hy + RY * 0.06, R * 0.15, RY * 0.19, pal.skinDk);
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
    fs(g, pal.stache, ink, fine);
  }
  line(g, cx - R * 0.26, hy + RY * 0.62, cx + R * 0.26, hy + RY * 0.62, '#3a2a30', 0.6);
}

function founderPortrait(g, h, P) {
  const { x, y, w } = h;
  const hh = h.h;
  // a halogen spot over it, and its flat pool of light
  poly(g, [x + 10, y - 3, x + w - 10, y - 3, x + w + 6, y + hh * 0.55, x - 6, y + hh * 0.55], 'rgba(255,220,240,0.14)');
  line(g, x + w / 2 - 6, y - 8, x + w / 2 + 6, y - 8, P.chrome, 1.2);
  poly(g, [x + w / 2 - 2, y - 8, x + w / 2 + 2, y - 8, x + w / 2 + 3, y - 4, x + w / 2 - 3, y - 4], '#1b1a22', P.ink, 0.35);
  // a thin chrome frame, a white mat, the print
  box(g, x + 1.5, y + 2, w, hh, 'rgba(0,0,0,0.25)');
  box(g, x, y, w, hh, P.chrome, P.ink, LW);
  box(g, x + 2, y + 2, w - 4, hh - 4, '#ffffff', P.ink, LWF);
  const ix = x + 5;
  const iy = y + 5;
  const iw = w - 10;
  const ih = hh - 10;
  g.save();
  g.beginPath();
  g.rect(ix, iy, iw, ih);
  g.clip();
  box(g, ix, iy, iw, ih, '#ff7ab4');
  poly(g, [ix, iy + ih * 0.15, ix + iw * 0.55, iy, ix + iw * 0.3, iy, ix, iy], '#b39ae6');
  poly(g, [ix + iw * 0.6, iy + ih, ix + iw, iy + ih * 0.5, ix + iw, iy + ih], '#b39ae6');
  box(g, ix + iw - 6, iy, 3, ih * 0.6, '#141218');
  professor(g, ix + iw / 2, iy + ih * 0.44, 1.12, '#141218', PROF_NAGEL);
  g.restore();
  box(g, x + w / 2 - 17, y + hh + 4, 34, 13, P.chrome, P.ink, LWF);
  box(g, x + w / 2 - 15.6, y + hh + 5.4, 31.2, 10.2, null, P.brassDk, 0.4);
  letters(g, 'FOUNDER', x + w / 2, y + hh + 11.2, 4.2, { ink: '#1b1a22', lw: 0.6, align: 'center', slant: 0.12 });
  letters(g, 'DON K. EGGSHELL PH.D.', x + w / 2, y + hh + 14.6, 1.9, { ink: '#1b1a22', lw: 0.32, align: 'center', track: 0.9 });
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
  box(g, ix, iy, iw, ih, '#fde4f0', P.ink, LWF);
  box(g, ix, iy, iw, 3, '#f6c4dc');
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
        fs(g, kind === 'cup2' ? '#f2c94c' : P.brass, P.ink, 0.4);
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
  // VHS tapes in their black sleeves and paperbacks in muted pastel, so the case stays calm
  const spines = ['#2a2833', '#d9aac1', '#9fcfc8', '#ddd196', '#b9a9dc', '#e6e2ec', '#2a2833', '#8f9fd0'];
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
        // a boombox
        box(g, x + w * 0.72, y1 - 6, 11, 6, '#24222c', P.ink, 0.35);
        circ(g, x + w * 0.72 + 2.6, y1 - 3, 1.8, '#5a5868', P.ink, 0.3);
        circ(g, x + w * 0.72 + 8.4, y1 - 3, 1.8, '#5a5868', P.ink, 0.3);
        box(g, x + w * 0.72 + 4.6, y1 - 5, 1.8, 1.2, M89.pink);
        line(g, x + w * 0.72 + 1, y1 - 6, x + w * 0.72 + 10, y1 - 6, P.chrome, 0.8);
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

// Exec's abstract, 1989: a Memphis composition on white.
function abstractPainting(g, h, P) {
  const { x, y, w } = h;
  const hh = h.h;
  poly(g, [x + 6, y - 3, x + w - 6, y - 3, x + w + 6, y + hh * 0.6, x - 6, y + hh * 0.6], P.warm);
  box(g, x + 1.5, y + 2, w, hh, 'rgba(0,0,0,0.2)');
  box(g, x, y, w, hh, '#141218', P.ink, LW);
  const ix = x + 2.5;
  const iy = y + 2.5;
  const iw = w - 5;
  const ih = hh - 5;
  box(g, ix, iy, iw, ih, '#ffffff', P.ink, LWF);
  g.save();
  g.beginPath();
  g.rect(ix, iy, iw, ih);
  g.clip();
  grid(g, ix, iy + ih * 0.55, iw * 0.38, ih * 0.45, 3, '#ffffff', '#141218', 0.4);
  poly(g, [ix + iw * 0.45, iy + ih, ix + iw * 0.72, iy + ih * 0.3, ix + iw, iy + ih], M89.teal, P.ink, LWF);
  circ(g, ix + iw * 0.3, iy + ih * 0.32, ih * 0.2, M89.lemon, P.ink, LWF);
  box(g, ix + iw * 0.68, iy + ih * 0.1, iw * 0.22, ih * 0.22, M89.pink, P.ink, LWF);
  squiggle(g, ix + 2, ix + iw - 2, iy + ih * 0.5, 2.2, 7, '#141218', 0.9);
  confetti(g, ix, iy, iw, ih * 0.45, 9, 77, ['#141218', M89.cobalt, M89.pink], 1.6, 0.6);
  g.restore();
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
        // brushed steel leaves with a Memphis motif: a pink half-disc, a teal wedge, a squiggle
        box(ctx, ox, y, w / 2, hh, '#c6cbd6', P.ink, LWF);
        const sx = k === 0 ? ox + w / 2 : ox;
        ctx.beginPath();
        ctx.arc(sx, y + hh * 0.34, 7, k === 0 ? Math.PI * 0.5 : -Math.PI * 0.5, k === 0 ? Math.PI * 1.5 : Math.PI * 0.5);
        ctx.closePath();
        fs(ctx, '#f6a8c8', P.ink, 0.4);
        const tx = k === 0 ? ox + 3 : ox + w / 2 - 3;
        poly(ctx, [tx, y + hh * 0.62, tx + (k === 0 ? 10 : -10), y + hh * 0.62, tx, y + hh * 0.5], '#8fd8cf', P.ink, 0.4);
        squiggle(ctx, ox + 3, ox + w / 2 - 3, y + hh * 0.8, 1, 4.4, '#1f1d26', 0.5);
        line(ctx, ox + (k === 0 ? 1.2 : w / 2 - 1.2), y + 1, ox + (k === 0 ? 1.2 : w / 2 - 1.2), y + hh - 1, '#eef0f4', 0.6);
      } else if (f.floor === 'open') {
        box(ctx, ox, y, w / 2, hh, P.steel, P.ink, LWF);
        line(ctx, ox + (k === 0 ? 2 : w / 2 - 2), y + 2, ox + (k === 0 ? 2 : w / 2 - 2), y + hh - 2, P.steelLt, 0.8);
        box(ctx, ox + 3, y + hh * 0.45, w / 2 - 6, 1.2, M89.teal);
      } else {
        box(ctx, ox, y, w / 2, hh, '#25232e', P.ink, LWF);
        box(ctx, ox + 2.5, y + 4, w / 2 - 5, hh - 8, null, P.chrome, 0.5);
        line(ctx, ox + 3, y + hh * 0.5, ox + w / 2 - 3, y + hh * 0.5, M89.pink, 0.6);
      }
      ctx.restore();
      box(ctx, a, y, pw, hh, null, P.ink, LWF);
    });
    // the red LED floor number, and its arrow, bright while the car is here
    const cx = x + w / 2;
    const ly = f.floor === 'lobby' ? y - 6.4 : y - 6.8;
    letters(ctx, h.label, cx - 1, ly, 4.4, { ink: lit ? '#ff3b5a' : '#5a2a3a', lw: 0.75, align: 'center', slant: 0.1 });
    poly(ctx, [cx + 5.6, ly - 3, cx + 3.8, ly - 1, cx + 7.4, ly - 1], lit ? '#ff3b5a' : '#5a2a3a');
  }
}

function clockHands(ctx, f, P) {
  for (const h of f.wall.hangs) {
    if (h.kind !== 'clock') continue;
    const { cx, cy, r } = h;
    const hand = (a, l, wdt, c) => line(ctx, cx - Math.sin(a) * l * 0.18, cy + Math.cos(a) * l * 0.18, cx + Math.sin(a) * l, cy - Math.cos(a) * l, c, wdt);
    hand(f.clock.hourA, r * 0.52, 1.3, P.ink);
    hand(f.clock.minuteA, r * 0.8, 0.85, P.ink);
    hand(f.clock.secondA, r * 0.86, 0.45, '#ff4f9a');
    circ(ctx, cx, cy, 0.9, '#ff4f9a');
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
    poly(ctx, [l.x - 2.4, y - 7, l.x + 2.4, y - 7, l.x + 8, y + 1, l.x - 8, y + 1], '#ff8fc0', P.ink, LWF);
    poly(ctx, [l.x - 2.4, y - 7, l.x - 1, y - 7, l.x - 4.4, y + 1, l.x - 8, y + 1], '#ffc2dc');
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
  const T = id === 'lobby' ? 48 : 40;
  const A = id === 'lobby' ? P.floorA : P.carpetA;
  const B = id === 'lobby' ? P.floorB : P.carpetB;
  box(ctx, -2, top, W + 4, bot - top + 1, A);
  const rows = [];
  for (let D = 0; D < DWALL; D += T) rows.push(D);
  rows.push(DWALL);
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
      ctx.moveTo(xOf(m * T, S, fa), ya);
      ctx.lineTo(xOf(m * T + T, S, fa), ya);
      ctx.lineTo(xOf(m * T + T, S, fb), yb);
      ctx.lineTo(xOf(m * T, S, fb), yb);
      ctx.closePath();
    }
  }
  ctx.fillStyle = B;
  ctx.fill();
  if (id === 'lobby') chips(ctx, S, P.chips, 1);
  else if (id === 'open') chips(ctx, S, P.chips, 0.8);
  else memphisRug(ctx, f, P, S);
  if (id === 'lobby') {
    ctx.fillStyle = P.floorRefl;
    for (const c of f.wall.columns) { ctx.fillRect(c.x + wd, top, c.w, 16); ctx.fillRect(c.x + wd + 2, top + 16, c.w - 4, 6); }
  }
  if (id === 'lobby' || id === 'exec') sunPatches(ctx, f, P, wd);
  ctx.beginPath();
  for (let r = 1; r < rows.length; r++) {
    const y = yOfF(fOfD(rows[r]));
    ctx.moveTo(-2, y);
    ctx.lineTo(W + 2, y);
  }
  const uA = S + VPX + (-10 - VPX) / 0.24;
  const uB = S + VPX + (W + 10 - VPX) / 0.24;
  for (let m = Math.floor(uA / T); m * T < uB; m++) {
    ctx.moveTo(xOf(m * T, S, 1), bot);
    ctx.lineTo(xOf(m * T, S, 0.24), top);
  }
  pen(ctx, id === 'lobby' ? P.floorLine : P.carpetLine, 0.45);
  ctx.stroke();
  ctx.restore();
  line(ctx, -2, top + 0.2, W + 2, top + 0.2, P.ink, LW);
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

function slab(ctx, f, P) {
  const S = f.slab.shift;
  const top = LANE_TOP;
  const id = f.floor;
  box(ctx, -2, top, W + 4, 40, P.slab);
  if (id === 'lobby') {
    // chrome nosing, pink granite, a black plinth with a pink pinstripe
    box(ctx, -2, top, W + 4, 2.6, P.chrome);
    box(ctx, -2, top + 2.6, W + 4, 1.4, P.slabDk);
    ctx.fillStyle = P.fleck[0];
    for (let u = Math.floor(S / 7) * 7; u < S + W + 7; u += 7) {
      const h = hash(u * 0.37);
      ctx.fillRect(u - S + h * 5, top + 6 + hash(u * 0.71) * 18, 0.8, 0.8);
    }
    box(ctx, -2, top + 26, W + 4, 14, P.marble);
    line(ctx, -2, top + 28, W + 2, top + 28, M89.pink, 0.6);
    ctx.beginPath();
    for (let u = Math.floor(S / 96) * 96; u < S + W + 96; u += 96) {
      const x = u - S;
      ctx.moveTo(x, top + 4);
      ctx.lineTo(x, top + 26);
    }
    ctx.moveTo(-2, top + 26);
    ctx.lineTo(W + 2, top + 26);
  } else if (id === 'open') {
    box(ctx, -2, top, W + 4, 3, P.slabTop);
    box(ctx, -2, top + 3, W + 4, 1.4, P.slabDk);
    box(ctx, -2, top + 9, W + 4, 6, '#625f74');
    line(ctx, -2, top + 18, W + 2, top + 18, M89.teal, 0.6);
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
    // black lacquer under a chrome nosing, a pink neon pinstripe
    box(ctx, -2, top, W + 4, 2.6, P.slabTop);
    box(ctx, -2, top + 2.6, W + 4, 1.4, P.slabDk);
    const tube = new Path2D();
    tube.moveTo(-2, top + 7);
    tube.lineTo(W + 2, top + 7);
    neon(ctx, tube, P.neonA, 0.55);
    ctx.beginPath();
    for (let u = Math.floor(S / 64) * 64; u < S + W + 64; u += 64) {
      const x = u - S;
      ctx.moveTo(x, top + 10);
      ctx.lineTo(x, top + 40);
      ctx.rect(x + 6, top + 13, 52, 16);
    }
  }
  pen(ctx, P.slabLine, 0.5);
  ctx.stroke();
  line(ctx, -2, top + 0.2, W + 2, top + 0.2, P.ink, 0.7);
}

// Terrazzo and flecked carpet: chips laid once in floor space (U along the lane, D deep),
// repeating every CHIP_P lane px, drawn in perspective so they shear like the joints.
const CHIP_P = 480;

const CHIPS = Array.from({ length: 64 }, (_, i) => ({
  U: hash(i * 3.71 + 9) * CHIP_P, D: 6 + hash(i * 5.13 + 2) * (DWALL - 120), a: hash(i * 7.9) * Math.PI, k: i % 5, kind: i % 3,
}));

function chips(ctx, S, cols, scale) {
  const paths = cols.map(() => new Path2D());
  for (const c of CHIPS) {
    const f = fOfD(c.D);
    const y = yOfF(f);
    const uA = S + VPX + (-10 - VPX) / f;
    const uB = S + VPX + (W + 10 - VPX) / f;
    const r = 2.2 * f * scale;
    const p = paths[c.k % cols.length];
    for (let U = c.U + Math.floor((uA - c.U) / CHIP_P) * CHIP_P; U < uB; U += CHIP_P) {
      const x = xOf(U, S, f);
      const dx = Math.cos(c.a) * r;
      const dy = Math.sin(c.a) * r * 0.35;
      if (c.kind === 0) { p.moveTo(x - dx, y - dy); p.lineTo(x + dx, y + dy); p.lineTo(x + dx * 0.6, y + dy + 0.5); p.closePath(); }
      else if (c.kind === 1) { p.moveTo(x, y - r * 0.4); p.lineTo(x + r * 0.7, y + r * 0.25); p.lineTo(x - r * 0.7, y + r * 0.25); p.closePath(); }
      else p.rect(x - r * 0.4, y - r * 0.18, r * 0.8, r * 0.36);
    }
  }
  paths.forEach((p, k) => { ctx.fillStyle = cols[k]; ctx.fill(p); });
}

// A Memphis rug in perspective: lilac field, black edge, a teal zigzag and pink wedges.
function memphisRug(ctx, f, P, S) {
  const RP = 1600;
  const quad = (u0, u1, d0, d1) => {
    const fa = fOfD(d0);
    const fb = fOfD(d1);
    return [xOf(u0, S, fa), yOfF(fa), xOf(u1, S, fa), yOfF(fa), xOf(u1, S, fb), yOfF(fb), xOf(u0, S, fb), yOfF(fb)];
  };
  const pt = (u, d) => { const fv = fOfD(d); return [xOf(u, S, fv), yOfF(fv)]; };
  const base0 = Math.floor((S - 400) / RP) * RP + 260;
  for (const U0 of [base0, base0 + RP]) {
    const w = 300;
    const D0 = 90;
    const D1 = 330;
    const outer = quad(U0, U0 + w, D0, D1);
    if (Math.max(outer[0], outer[2], outer[4], outer[6]) < -10 || Math.min(outer[0], outer[2], outer[4], outer[6]) > W + 10) continue;
    poly(ctx, outer, P.rug, P.rugLine, 0.6);
    poly(ctx, quad(U0 + 12, U0 + w - 12, D0 + 14, D1 - 30), P.rugIn);
    ctx.beginPath();
    for (let k = 0; k <= 12; k++) {
      const [x, y] = pt(U0 + 16 + k * ((w - 32) / 12), k % 2 ? D0 + 40 : D0 + 80);
      if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    pen(ctx, '#5fbdb4', 0.8);
    ctx.stroke();
    for (let k = 0; k < 5; k++) {
      const u = U0 + 30 + k * 56;
      poly(ctx, [...pt(u, D0 + 110), ...pt(u + 22, D0 + 110), ...pt(u + 11, D0 + 170)], k % 2 ? '#e48ab8' : '#efe08a');
    }
  }
}

// Shoulder pads: a torso whose shoulders stand out square past the neck.
function padded(g, cx, y, w, h, fill, ink, lw) {
  g.beginPath();
  g.moveTo(cx - w / 2, y + h);
  g.lineTo(cx - w / 2, y + 2.2);
  g.lineTo(cx - w / 2 + 1.6, y);
  g.lineTo(cx + w / 2 - 1.6, y);
  g.lineTo(cx + w / 2, y + 2.2);
  g.lineTo(cx + w / 2, y + h);
  g.closePath();
  fs(g, fill, ink, lw);
}

// ==================================================================== MID
const SKINS = ['#f3cfae', '#e7b78e', '#c98e64', '#f6d9bf', '#93603f'];
const HAIRS = ['#3a2a20', '#6b4529', '#e2b45a', '#2a2a30', '#c9a07a', '#b8502a'];
const STYLES = ['short', 'perm', 'bald', 'perm', 'quiff', 'short', 'bob'];
const SHIRTS = ['#f6c2d6', '#bfe8e2', '#f4ecb0', '#d6c8f0', '#ffffff', '#a9c4f0'];

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

// 1989 heads: the perm is a cloud of curls drawn round the skull before it, outlined as one.
function head(g, x, y, r, p, face, ink, lw, closed = false) {
  if (p.style === 'perm') {
    const lobes = [[-0.9, -0.4, 0.62], [0.9, -0.4, 0.62], [-0.55, -0.95, 0.6], [0.55, -0.95, 0.6], [0, -1.15, 0.6], [-1.05, 0.3, 0.5], [1.05, 0.3, 0.5]];
    g.beginPath();
    for (const [dx, dy, rr] of lobes) { g.moveTo(x + dx * r + rr * r, y + dy * r); g.arc(x + dx * r, y + dy * r, rr * r, 0, TAU); }
    pen(g, ink, lw * 2);
    g.stroke();
    g.fillStyle = p.hair;
    g.fill();
  }
  const sideEar = face === 'left' ? 1 : face === 'right' ? -1 : 0;
  if (p.style !== 'perm') {
    if (sideEar) circ(g, x + sideEar * r * 0.25, y + r * 0.15, r * 0.3, p.skin, ink, lw);
    else { circ(g, x - r * 0.95, y + r * 0.15, r * 0.28, p.skin, ink, lw); circ(g, x + r * 0.95, y + r * 0.15, r * 0.28, p.skin, ink, lw); }
  }
  if (p.style === 'bun') circ(g, x - (sideEar || 0) * r * 0.7, y - r * (sideEar ? 0.6 : 0.95), r * 0.45, p.hair, ink, lw);
  circ(g, x, y, r, p.skin, ink, lw);
  if (face === 'left' || face === 'right') {
    const d = face === 'left' ? -1 : 1;
    circ(g, x + d * r * 0.98, y + r * 0.2, r * 0.24, p.skin, ink, lw * 0.9);
    circ(g, x + d * r * 0.5, y - r * 0.05, r * 0.11, ink);
  }
  g.save();
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.clip();
  g.fillStyle = p.hair;
  if (p.style === 'bald') {
    if (face === 'back') g.fillRect(x - r, y - r * 0.05, r * 2, r * 0.7);
    else { g.fillRect(x - r, y - r * 0.15, r * 0.45, r * 0.6); g.fillRect(x + r * 0.55, y - r * 0.15, r * 0.45, r * 0.6); }
  } else if (face === 'back') {
    g.fillRect(x - r, y - r, r * 2, r * (p.style === 'bob' || p.style === 'bun' || p.style === 'perm' ? 1.75 : 1.45));
  } else if (face === 'front') {
    g.beginPath();
    g.ellipse(x, y - r * 0.55, r * 1.1, r * 0.62, 0, 0, TAU);
    g.fill();
    if (p.style === 'bob' || p.style === 'perm') { g.fillRect(x - r, y - r * 0.4, r * 0.32, r * 1.2); g.fillRect(x + r * 0.68, y - r * 0.4, r * 0.32, r * 1.2); }
  } else {
    const d = face === 'left' ? -1 : 1;
    g.beginPath();
    g.ellipse(x - d * r * 0.25, y - r * 0.45, r * 1.05, r * 0.68, 0, 0, TAU);
    g.fill();
    if (p.style === 'bob' || p.style === 'bun' || p.style === 'perm') g.fillRect(d > 0 ? x - r : x + r * 0.1, y - r * 0.4, r * 0.9, r * 1.1);
  }
  g.restore();
  circ(g, x, y, r, null, ink, lw);
  if (p.style === 'quiff') {
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
    if (p.glasses) { box(g, x - r * 0.68, y - r * 0.22, r * 0.58, r * 0.44, null, ink, lw * 0.8); box(g, x + r * 0.1, y - r * 0.22, r * 0.58, r * 0.44, null, ink, lw * 0.8); }
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
    pot(g, cx, b, 11, 9, potC, potDk, ink);
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
  const top = b - 34;
  // on the desk: the terminal's beige back, a Rolodex, a phone, a vase of tulips
  box(g, x + w * 0.6, top - 11, 15, 10, '#d8d0bc', ink, LWM);
  box(g, x + w * 0.6 + 4, top - 1.5, 7, 1.5, '#bdb39c', ink, LWM);
  circ(g, x + w * 0.22, top - 3.4, 3.2, '#2a2833', ink, 0.4);
  box(g, x + w * 0.22 - 2.6, top - 6, 5.2, 2.2, '#ffffff', ink, 0.3);
  box(g, x + w * 0.22 - 3, top - 1, 6, 1, '#2a2833');
  box(g, x + w * 0.38, top - 3, 7, 3, '#e6dccb', ink, 0.35);
  line(g, x + w * 0.38 + 0.6, top - 3.6, x + w * 0.38 + 6.4, top - 3.6, '#e6dccb', 1.1);
  poly(g, [x + w * 0.86 - 2.5, top, x + w * 0.86 + 2.5, top, x + w * 0.86 + 1.8, top - 6, x + w * 0.86 - 1.8, top - 6], '#1f1d26', ink, 0.35);
  for (const [dx, dy, c] of [[-2, -10, M89.pink], [1.6, -11, M89.lemon], [0, -8, M89.pink], [2.6, -8.6, M89.lilac]]) circ(g, x + w * 0.86 + dx, top + dy, 1.5, c, ink, 0.3);
  lines(g, [x + w * 0.86, top - 6, x + w * 0.86 - 1.5, top - 9, x + w * 0.86, top - 6, x + w * 0.86 + 1.5, top - 9.5], '#4f8a4c', 0.5);
  // the desk: pink laminate bulging toward us, a teal top, a lemon drum at one end,
  // a grey grid panel at the other, a squiggle along the kick
  g.beginPath();
  g.moveTo(x, b);
  g.lineTo(x, top + 3);
  g.quadraticCurveTo(x + w / 2, top - 2.5, x + w, top + 3);
  g.lineTo(x + w, b);
  g.closePath();
  fs(g, '#f4b9cf', ink, LWM);
  g.beginPath();
  g.moveTo(x - 1.5, top + 4);
  g.lineTo(x - 1.5, top + 1);
  g.quadraticCurveTo(x + w / 2, top - 4.5, x + w + 1.5, top + 1);
  g.lineTo(x + w + 1.5, top + 4);
  g.quadraticCurveTo(x + w / 2, top - 1.5, x - 1.5, top + 4);
  fs(g, '#8fd3ca', ink, LWM);
  grid(g, x + 2, top + 6, 16, b - top - 10, 3.2, '#f4f2f6', '#b8b4c4', 0.35);
  rbox(g, x + w - 14, top + 4, 12, b - top - 4, 5, '#f2e28a', ink, LWM);
  box(g, x + w / 2 - 25, top + 10, 50, 9, '#1f1d26', ink, LWM);
  letters(g, 'RECEPTION', x + w / 2, top + 16.6, 4, { ink: '#ffffff', lw: 0.6, align: 'center', slant: 0.18 });
  squiggle(g, x + 20, x + w - 16, b - 6, 1, 6, '#c96a96', 0.6);
  box(g, x, b - 3, w, 3, '#1f1d26', ink, LWM);
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
    for (const [p0, p1] of [[a, m - 1], [m + 1, c]]) rbox(g, p0, b - 22, p1 - p0, 11, 2, 'rgba(160,215,225,0.22)', 'rgba(90,120,150,0.55)', 0.4);
  }
  for (let k = 0; k < n; k++) {
    const px = x + k * pitch;
    topRound(g, px - 3, b - 26, 6, 26, 2.6, '#9a9fae', ink, LWM);
    box(g, px - 3, b - 15, 6, 2, '#7fcfc6');
    box(g, px - 2.2, b - 25, 4.4, 2, '#1f1d26', ink, 0.3);
    circ(g, px + 1, b - 24, 0.55, M89.pink);
  }
}

function sofa(g, it, P, exec) {
  const { x, w } = it;
  const b = MID_BASE;
  const ink = P.inkM;
  shadowFoot(g, x, w, b);
  if (exec) {
    // grey leather in a chrome cage
    box(g, x + 2, b - 25, w - 4, 12, '#8e889a', ink, LWM);
    line(g, x + w / 3, b - 25, x + w / 3, b - 13, ink, 0.4);
    line(g, x + (2 * w) / 3, b - 25, x + (2 * w) / 3, b - 13, ink, 0.4);
    box(g, x + 1, b - 14, w - 2, 7, '#9b95a8', ink, LWM);
    box(g, x - 1, b - 22, 4, 15, '#8e889a', ink, LWM);
    box(g, x + w - 3, b - 22, 4, 15, '#8e889a', ink, LWM);
    lines(g, [x - 1.5, b - 7, x + w + 1.5, b - 7, x, b - 7, x, b, x + w, b - 7, x + w, b], P.chrome, 1);
    return;
  }
  // a Memphis settee: a teal slab back, a pink seat, lemon drum arms, a grid cushion
  box(g, x + 4, b - 26, w - 8, 12, '#86d2c8', ink, LWM);
  box(g, x + 2, b - 14, w - 4, 7, '#f2a9c6', ink, LWM);
  for (const ax of [x - 2, x + w - 6]) rbox(g, ax, b - 20, 8, 13, 3.6, '#f2e28a', ink, LWM);
  grid(g, x + w * 0.58, b - 23, 12, 8, 2.4, '#f4f2f6', '#9f9ab0', 0.3);
  poly(g, [x + 6, b - 7, x + 9, b - 7, x + 4, b], '#1f1d26', ink, 0.3);
  poly(g, [x + w - 6, b - 7, x + w - 9, b - 7, x + w - 4, b], '#1f1d26', ink, 0.3);
}

function sculpture(g, it, P) {
  const x = it.x;
  const b = MID_BASE;
  const ink = P.inkM;
  shadowFoot(g, x + 6, 28, b);
  grid(g, x + 8, b - 22, 24, 22, 4, '#f4f2f6', '#8f8aa0', 0.4);
  box(g, x + 6.5, b - 24, 27, 3, '#1f1d26', ink, LWM);
  box(g, x + 14, b - 12, 12, 4.4, P.chrome, ink, 0.35);
  letters(g, 'OVUM', x + 20, b - 8.6, 2.4, { ink: '#1f1d26', lw: 0.35, align: 'center' });
  g.beginPath();
  g.ellipse(x + 20, b - 25, 6, 1.6, 0, 0, TAU);
  fs(g, '#7fcfc6', ink, LWM);
  // a pink egg, decorated in the Memphis manner
  g.beginPath();
  eggPath(g, x + 20, b - 39, 10.5, 14);
  fs(g, '#f6a9c9', ink, LWM);
  g.save();
  g.beginPath();
  eggPath(g, x + 20, b - 39, 10.5, 14);
  g.clip();
  squiggle(g, x + 8, x + 32, b - 44, 1.6, 6, '#1f1d26', 0.7);
  squiggle(g, x + 8, x + 32, b - 34, 1.6, 6, '#1f1d26', 0.7);
  confetti(g, x + 10, b - 52, 20, 26, 9, 51, [M89.lemon, M89.teal, '#1f1d26'], 1.3, 0.6);
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
    // the terminal: a beige box, its green screen toward us, glowing with text
    const mx = x + 14 + h(1) * 10;
    box(g, mx - 7, b - 46, 14, 13, '#d9d1bc', ink, LWM);
    box(g, mx - 5.4, b - 44.4, 10.8, 9, '#1d3a2a', ink, 0.35);
    g.beginPath();
    for (let k = 0; k < 4; k++) { g.moveTo(mx - 4.2, b - 42.6 + k * 1.8); g.lineTo(mx - 4.2 + 3 + h(k + 3) * 5, b - 42.6 + k * 1.8); }
    pen(g, d.occupied ? '#5fd88a' : '#8affaa', 0.5);
    g.stroke();
    const kind = Math.floor(h(9) * 4);
    const ox = mx > x + 20 ? x + 6 : x + 30;
    if (kind === 0) {
      // a Rolodex
      circ(g, ox, b - 37.5, 3, '#2a2833', ink, 0.35);
      box(g, ox - 2.4, b - 40.4, 4.8, 2.4, '#ffffff', ink, 0.3);
    } else if (kind === 1) {
      for (let q = 0; q < 6; q++) leaf(g, ox, b - 36, 5, 1.6, -Math.PI / 2 + (q - 2.5) * 0.45, q % 2 ? '#5f9f5a' : '#3f7f47', '#2f5a35', 0.35);
    } else if (kind === 2) {
      const cols = [M89.pink, M89.teal, M89.lemon, M89.lilac, '#3f5fd8'];
      for (let q = 0; q < 5; q++) box(g, ox - 5 + q * 2.4, b - 41 + (q % 2), 2.2, 8, cols[(q + d.seed) % 5], ink, 0.3);
    } else {
      // a desk fan
      circ(g, ox, b - 40, 3.2, '#e8e4ec', ink, 0.35);
      line(g, ox - 2.4, b - 40, ox + 2.4, b - 40, '#9a96a8', 0.4);
      line(g, ox, b - 42.4, ox, b - 37.6, '#9a96a8', 0.4);
      line(g, ox, b - 36.8, ox, b - 34.5, ink, 0.6);
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
    // pinned up: Post-its, a 1989 calendar, a snapshot, a name card
    const pin = Math.floor(h(1) * 4);
    const px = x + 6 + h(2) * 22;
    if (pin === 0) { box(g, px, b - 28, 5.4, 5.4, '#f6ec8a', ink, 0.3); box(g, px + 3, b - 25, 5.4, 5.4, '#f7b6d0', ink, 0.3); }
    else if (pin === 1) { box(g, px, b - 29, 8, 10, '#f6f2f8', ink, 0.3); box(g, px, b - 29, 8, 2.4, M89.pink); letters(g, '89', px + 4, b - 20.6, 2.6, { ink: '#1f1d26', lw: 0.35, align: 'center' }); }
    else if (pin === 2) { box(g, px, b - 27, 6, 5, '#a9d4e8', ink, 0.3); box(g, px + 1, b - 25, 4, 2, '#7fcfc6'); }
    else box(g, px, b - 26, 9, 3.4, '#4a4658', ink, 0.3);
    const top = Math.floor(h(5) * 5);
    const tx = x + 6 + h(6) * 26;
    if (top === 0 || !d.occupied) { box(g, tx, b - 38.4, 3.4, 3.4, ['#ffffff', M89.pink, M89.teal][Math.floor(h(7) * 3)], ink, 0.35); g.beginPath(); g.arc(tx + 3.6, b - 36.6, 1, -Math.PI / 2, Math.PI / 2); pen(g, ink, 0.35); g.stroke(); }
    else if (top === 1) { box(g, tx, b - 37.4, 3.4, 2.4, '#ffffff', ink, 0.3); rbox(g, tx + 0.6, b - 41.4, 2.2, 4.2, 1, '#5f9a52', ink, 0.3); }
    else if (top === 2) { box(g, tx, b - 38.8, 8, 3.8, '#24222c', ink, 0.3); circ(g, tx + 1.8, b - 36.9, 1.2, '#9a96a8'); circ(g, tx + 6.2, b - 36.9, 1.2, '#9a96a8'); line(g, tx + 7, b - 38.8, tx + 9, b - 43, ink, 0.35); }
  }
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
  box(g, x, b - 30, 14, 30, '#c7c1d9', ink, LWM);
  box(g, x + 2, b - 13, 10, 2, '#9d97b0', ink, 0.35);
  circ(g, x + 4.6, b - 22, 1.2, M89.pink, ink, 0.3);
  circ(g, x + 9.4, b - 22, 1.2, M89.teal, ink, 0.3);
  box(g, x + 14, b - 29, 3, 11, '#f0ecf4', ink, 0.35);
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
  box(g, x, b - 28, w, 28, '#a89f8a', ink, LWM);
  box(g, x - 1, b - 31, w - 10, 3.4, '#4a4658', ink, LWM);
  box(g, x + w - 11, b - 31, 11, 3.4, '#8a826f', ink, LWM);
  circ(g, x + w - 8, b - 29.4, 0.6, '#6cd06a');
  circ(g, x + w - 5.6, b - 29.4, 0.6, M89.pink);
  box(g, x + w - 4, b - 30.2, 2.6, 1.4, '#8affaa');
  for (let k = 0; k < 3; k++) {
    box(g, x + 2, b - 22 + k * 6.4, w - 4, 5.4, '#b3aa95', ink, 0.35);
    box(g, x + w / 2 - 4, b - 20.6 + k * 6.4, 8, 1.2, '#6f6857');
  }
  line(g, x + 2, b - 23.5, x + w - 2, b - 23.5, M89.teal, 0.6);
  poly(g, [x, b - 24, x - 7, b - 26, x - 7, b - 23, x, b - 21], '#8a826f', ink, 0.35);
  poly(g, [x - 1, b - 25, x - 6, b - 26.4, x - 6, b - 25.4, x - 1, b - 24], '#e6e0cf', ink, 0.3);
}

function cabinet(g, it, P) {
  const x = it.x;
  const b = MID_BASE;
  const ink = P.inkM;
  shadowFoot(g, x, 20, b);
  box(g, x, b - 44, 20, 44, '#7fb3ad', ink, LWM);
  for (let k = 0; k < 4; k++) {
    const y = b - 43 + k * 10.6;
    box(g, x + 1.6, y, 16.8, 9.6, '#8cc0b9', ink, 0.35);
    box(g, x + 7, y + 2, 6, 2.2, '#ffffff', ink, 0.25);
    box(g, x + 6.4, y + 5.4, 7.2, 1.2, '#1f1d26');
  }
  const top = Math.floor(hash(it.i * 5.1) * 3);
  if (top === 0) {
    // the fax machine, a curl of paper coming out of it
    box(g, x + 1.5, b - 49, 17, 5, '#d6cdb8', ink, 0.35);
    box(g, x + 3, b - 50.4, 7, 1.4, '#3a3846', ink, 0.25);
    circ(g, x + 14, b - 47.4, 0.7, '#6cd06a');
    g.beginPath();
    g.moveTo(x + 5, b - 50.4);
    g.quadraticCurveTo(x + 4, b - 56, x + 9, b - 55);
    pen(g, '#f4f0e6', 1.4);
    g.stroke();
  } else if (top === 1) {
    circ(g, x + 10, b - 50, 4.4, '#e8e4ec', ink, 0.35);
    line(g, x + 10, b - 46, x + 10, b - 44, ink, 0.6);
    box(g, x + 7, b - 45, 6, 1.4, M89.pink, ink, 0.3);
  } else {
    pot(g, x + 10, b - 44, 7, 5, '#f2eff6', '#1f1d26', ink);
    for (let q = 0; q < 5; q++) leaf(g, x + 10, b - 50, 6, 1.6, -Math.PI / 2 + (q - 2) * 0.5, '#5f9f5a', '#2f5a35', 0.35);
  }
}

// ------------------------------------------------------------- exec furniture
function boardroomBack(g, it, P, chairs) {
  const b = MID_BASE;
  const ink = P.inkM;
  for (const c of chairs) {
    topRound(g, c.x - 8, b - 46, 16, 28, 5, '#2a2832', ink, LWM);
    topRound(g, c.x - 6, b - 44, 12, 22, 4, '#3a3844', null, 0);
    lines(g, [c.x - 6, b - 37, c.x + 6, b - 37, c.x - 6, b - 30, c.x + 6, b - 30], '#24222c', 0.5);
  }
}

function boardroomFront(g, it, P) {
  const b = MID_BASE;
  const ink = P.inkM;
  const { x0, x1 } = it;
  shadowFoot(g, x0, x1 - x0, b);
  for (let x = x0 + 18; x < x1 - 10; x += 35) {
    const k = Math.round((x - x0) / 35);
    if (k % 3 === 0) { poly(g, [x - 2, b - 27, x + 2, b - 27, x + 1.6, b - 33, x + 1, b - 34, x - 1, b - 34, x - 1.6, b - 33], '#cfe3ec', ink, 0.35); box(g, x - 1.8, b - 30, 3.6, 3, '#a9cfe2'); }
    else if (k % 3 === 1) { box(g, x - 5, b - 28.4, 9, 1.4, '#ffffff', ink, 0.3); circ(g, x + 7, b - 29, 1.8, '#2a2833', ink, 0.3); }
    else { box(g, x - 5, b - 34, 10, 7, '#d9d1bc', ink, 0.35); box(g, x - 3.6, b - 32.6, 7.2, 4.4, '#1d3a2a'); }
  }
  // black lacquer, a chrome edge, chrome drum legs
  box(g, x0, b - 27, x1 - x0, 4, '#25232e', ink, LWM);
  line(g, x0, b - 25.6, x1, b - 25.6, P.chrome, 0.6);
  box(g, x0 + 4, b - 23, x1 - x0 - 8, 3.2, '#1b1a22', ink, LWM);
  for (const px of [x0 + 18, (x0 + x1) / 2, x1 - 18]) {
    box(g, px - 3.4, b - 20, 6.8, 17, P.chrome, ink, LWM);
    line(g, px - 1.4, b - 19, px - 1.4, b - 4, '#f2f4f8', 0.6);
    box(g, px - 7, b - 3, 14, 3, '#1b1a22', ink, LWM);
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
  const cx = x + w / 2;
  topRound(g, cx - 11, b - 54, 22, 26, 7, '#2a2832', ink, LWM);
  lines(g, [cx - 9, b - 46, cx + 9, b - 46, cx - 9, b - 38, cx + 9, b - 38], '#24222c', 0.5);
  // the Tizio lamp: black arms, a counterweight, a little head throwing a pool of light
  const lx = x + w * 0.2;
  box(g, lx - 3, b - 33, 6, 1.6, '#1b1a22', ink, 0.35);
  lines(g, [lx, b - 33, lx + 2, b - 44, lx + 2, b - 44, lx + 12, b - 46, lx + 2, b - 44, lx - 4, b - 41], '#1b1a22', 0.7);
  circ(g, lx - 4, b - 41, 1.1, '#1b1a22');
  circ(g, lx + 2, b - 44, 0.6, M89.red);
  poly(g, [lx + 10.4, b - 46.4, lx + 14, b - 47.4, lx + 14, b - 44.6], '#1b1a22', ink, 0.3);
  poly(g, [lx + 11.4, b - 45.6, lx + 14, b - 45, lx + 18, b - 31, lx + 6, b - 31], 'rgba(255,240,220,0.3)');
  // a Rolodex, Newton's cradle, the cordless with its aerial
  circ(g, x + w * 0.62, b - 34.6, 2.8, '#1b1a22', ink, 0.35);
  box(g, x + w * 0.62 - 2.2, b - 37.2, 4.4, 2, '#ffffff', ink, 0.25);
  lines(g, [x + w * 0.74, b - 32, x + w * 0.74, b - 38, x + w * 0.74, b - 38, x + w * 0.74 + 10, b - 38, x + w * 0.74 + 10, b - 38, x + w * 0.74 + 10, b - 32], P.chrome, 0.6);
  for (let k = 0; k < 4; k++) {
    const bx = x + w * 0.74 + 2.6 + k * 1.6;
    line(g, bx, b - 38, bx, b - 34, '#8e95a4', 0.25);
    circ(g, bx, b - 33.6, 0.8, P.chrome, ink, 0.2);
  }
  box(g, x + w * 0.9, b - 34, 3.4, 2.6, '#e6dccb', ink, 0.3);
  line(g, x + w * 0.9 + 2.6, b - 34, x + w * 0.9 + 2.6, b - 39, ink, 0.4);
  // the desk itself: black lacquer slab, chrome edges, a pink pinstripe
  box(g, x - 2, b - 31.4, w + 4, 3.4, '#1b1a22', ink, LWM);
  line(g, x - 2, b - 30.2, x + w + 2, b - 30.2, P.chrome, 0.7);
  box(g, x, b - 28, w, 28, '#25232e', ink, LWM);
  box(g, x + 30, b - 26, w - 60, 20, '#16141c', ink, 0.4);
  for (const px of [x + 2, x + w - 28]) {
    for (let k = 0; k < 3; k++) {
      box(g, px, b - 26 + k * 8.4, 26, 7.4, '#2e2b38', ink, 0.4);
      box(g, px + 9, b - 23.4 + k * 8.4, 8, 1.2, P.chrome, ink, 0.25);
    }
  }
  line(g, x, b - 5, x + w, b - 5, M89.pink, 0.6);
  box(g, x - 1, b - 3, w + 2, 3, '#16141c', ink, LWM);
}

function libGlobe(g, it, P) {
  const x = it.x;
  const b = MID_BASE;
  const ink = P.inkM;
  shadowFoot(g, x, 18, b);
  lines(g, [x + 9, b - 14, x + 9, b - 2, x + 3, b - 1, x + 15, b - 1], P.chrome, 1.2);
  box(g, x + 1, b - 16, 16, 2, '#1b1a22', ink, 0.4);
  circ(g, x + 9, b - 25, 8, '#9fd6e8', ink, LWM);
  g.save();
  g.beginPath();
  g.arc(x + 9, b - 25, 8, 0, TAU);
  g.clip();
  for (const [dx, dy, rx, ry] of [[-3, -3, 3.5, 2.6], [3, 1, 2.6, 4], [-2, 4, 2, 1.6]]) ell(g, x + 9 + dx, b - 25 + dy, rx, ry, '#f6a9c9', '#c96a96', 0.3);
  g.restore();
  g.beginPath();
  g.arc(x + 9, b - 25, 10, Math.PI * 0.62, Math.PI * 2.38);
  pen(g, P.chrome, 1);
  g.stroke();
}

// A postmodern long-case clock: black lacquer, a pink pediment, a chrome pendulum.
function tallClock(g, it, P) {
  const x = it.x;
  const b = MID_BASE;
  const ink = P.inkM;
  shadowFoot(g, x, 20, b);
  box(g, x, b - 16, 20, 16, '#25232e', ink, LWM);
  box(g, x + 3, b - 13, 14, 10, '#3a3846', ink, 0.4);
  box(g, x + 3, b - 50, 14, 34, '#25232e', ink, LWM);
  box(g, x + 6, b - 47, 8, 27, '#141218', ink, 0.4);
  box(g, x + 1, b - 70, 18, 20, '#25232e', ink, LWM);
  poly(g, [x - 1, b - 70, x + 10, b - 80, x + 21, b - 70], '#f6a9c9', ink, LWM);
  circ(g, x + 10, b - 73.5, 1.6, '#7fcfc6', ink, 0.3);
  circ(g, x + 10, b - 60, 7, P.chrome, ink, 0.4);
  circ(g, x + 10, b - 60, 5.8, '#ffffff', ink, 0.35);
  g.beginPath();
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU;
    g.moveTo(x + 10 + Math.sin(a) * 4.2, b - 60 - Math.cos(a) * 4.2);
    g.lineTo(x + 10 + Math.sin(a) * 5.4, b - 60 - Math.cos(a) * 5.4);
  }
  pen(g, ink, 0.45);
  g.stroke();
}

function paintMid(g, F, P, u0, u1, layer) {
  const per = F.mid.period;
  // palms in white pots, every one of them, with a black lacquer rim
  const PP = { ...P, pot: '#edeaf2', potDk: '#1f1d26' };
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
        // shoulder pads, whoever you are
        padded(ctx, cx, y + 4.4, 17, 15, p.shirt, ink, LWM);
        if (d.pop > 0.5) {
          circ(ctx, cx - 9.5, b - 35.6, 1.7, p.skin, ink, 0.35);
          circ(ctx, cx + 9.5, b - 35.6, 1.7, p.skin, ink, 0.35);
        }
        head(ctx, cx, y, 5, p, d.pop > 0.15 ? (d.look > 0 ? 'right' : 'left') : 'back', ink, LWM);
      }
    } else if (m.kind === 'boardroom') {
      for (const c of m.chairs) {
        if (!c.sitter) continue;
        const p = personFor(c.seed + 400);
        const suit = ['#3d3a4e', '#5a5470', '#2f3346', '#6a6480'][c.seed % 4];
        const y = b - 40 + c.nod * 3.4;
        padded(ctx, c.x, b - 33.5, 18, 10.5, suit, ink, LWM);
        poly(ctx, [c.x - 2.2, b - 33.5, c.x + 2.2, b - 33.5, c.x, b - 28], '#ffffff', ink, 0.3);
        line(ctx, c.x, b - 32, c.x, b - 27, [M89.pink, M89.teal, M89.lemon, M89.lilac][c.seed % 4], 1.4);
        const pp = { ...p, style: p.style === 'bun' || p.style === 'quiff' ? 'short' : p.style, hair: c.seed % 3 === 0 ? '#c9c4ba' : p.hair };
        ctx.save();
        ctx.translate(c.x, y + 4);
        ctx.rotate(c.nod * 0.18 * (c.seed % 2 ? 1 : -1));
        head(ctx, 0, -4, 5, pp, 'front', ink, LWM, c.nod > 0.25);
        ctx.restore();
        if (c.nod > 0.55 && c.seed % 3 !== 1) {
          const k = (c.nod - 0.55) / 0.3;
          letters(ctx, 'Z', c.x + 6 + k * 2, y - 6 - k * 4, 2.6, { ink: '#b39ae6', lw: 0.45 });
          if (k > 0.5) letters(ctx, 'Z', c.x + 9 + k * 2, y - 10 - k * 4, 2, { ink: '#b39ae6', lw: 0.4 });
        }
      }
    } else if (m.kind === 'reception') {
      // big hair, bigger shoulders, a magenta power suit, lemon hoops, the headset
      const p = { skin: '#f2cfae', hair: '#c9703a', style: 'perm', glasses: false };
      const cx = m.x + m.w * 0.42;
      const y = b - 44 + m.dy;
      padded(ctx, cx, y + 4.6, 20, 12, '#d8408a', ink, LWM);
      poly(ctx, [cx - 2.4, y + 4.6, cx + 2.4, y + 4.6, cx, y + 9], '#ffffff', ink, 0.3);
      head(ctx, cx, y, 5, p, 'front', ink, LWM);
      circ(ctx, cx - 5, y + 2.6, 1.2, null, '#e8c840', 0.6);
      circ(ctx, cx + 5, y + 2.6, 1.2, null, '#e8c840', 0.6);
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
  id: 'ligne89',
  name: 'LIGNE ’89 — Nagel / Memphis',
  note: 'The same clear line as LIGNE CLAIRE, moved to 1989 and drawn the way Ever Meulen and Chaland drew the '
    + 'decade: glass block, pink granite, black lacquer and chrome, a neon EGGCORP over the lobby, Memphis squiggles, '
    + 'terrazzo confetti and pastel blocks in the Swatch palette. Nagel prints on the walls (the founder, the silver '
    + 'professor, hangs as one), vertical blinds, green-screen terminals, a fax, a Rolodex, shoulder pads and perms. '
    + 'Floor 88 is a pastel dusk with neon run up the towers. Tacky in the props, never sloppy in the line, and calm '
    + 'behind the lane.',
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
