// CORPORATE KOMBAT style bake-off — ART DECO, the 1930s tower. The climb painted as a
// Chrysler / Rockefeller Center skyscraper: black lacquer, gold-leaf linework, rouge and
// black marble with veining, macassar ebony, sunbursts, chevrons, stepped setbacks and
// fluted columns with gold capitals. The outside is a Cassandre poster by morning and
// noon (flat stone facades, streamline clouds, a rayed sun) and a Hugh Ferriss charcoal
// city at dusk with searchlights sweeping. The lift doors are the jewels: marquetry
// sunbursts and a brass semicircular dial whose needle swings as the car travels.
//
// Strict palette: black, gold/brass, cream, jade, oxblood, silver, a little sky blue by
// day. Legibility: everything behind the lane (mid furniture and the floor plane) is dark,
// low in contrast, and carries only thin dim gold; the slab is black stone under a gold
// nosing so the lane reads as a hard floor edge.
//
// Everything still is baked once per device scale: the sky (screen space), the far and
// near city and the back wall (u-space strips one period long plus a screen, tiled at
// 512 logical px), the ceiling (strip at the lights' rate), the slab (a 240 px tile) and
// every mid item and fixture (sprites). A frame is a handful of blits plus the moving
// parts, which are all read off the frame: lift doors and dial needles, clock hands, the
// revolving door, heads, the cooler, copier, flicker tube, cradle, nodders, pendulum,
// cars, clouds, the flyer and the searchlights.
import { OFFICE_FLOORS, FRAME_W, FRAME_H, WALL_BASE, LANE_TOP } from './plan.js';

const TAU = Math.PI * 2;
const PI = Math.PI;
const mod = (a, n) => ((a % n) + n) % n;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (t) => t * t * (3 - 2 * t);

// ------------------------------------------------------------------ palette
const INK = '#0c0a0f';
const LAQ = '#16131a';
const LAQ_HI = '#2c2733';
const GOLD = { hi: '#f6e09a', mid: '#c9a24a', lo: '#8a6826', dk: '#4f3a16' };
const CREAM = '#efe3c4';
const IVORY = '#ece2c9';
const JADE = { hi: '#6fb394', mid: '#2f7a64', lo: '#1b4c3f', dk: '#0f2e27' };
const OX = { hi: '#9c3a3d', mid: '#6e2228', lo: '#47151a', dk: '#290c10' };
const SILVER = { hi: '#eef0f2', mid: '#b9bec6', lo: '#7b818b', dk: '#454a52' };

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mixc(a, b, t) {
  const A = rgb(a), B = rgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `#${((1 << 24) | (c[0] << 16) | (c[1] << 8) | c[2]).toString(16).slice(1)}`;
}
function rgba(hex, a) {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// ------------------------------------------------------------------ utilities
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

function canvas(w, h) {
  w = Math.max(1, Math.ceil(w));
  h = Math.max(1, Math.ceil(h));
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function rect(g, x, y, w, h, c) {
  if (w <= 0 || h <= 0) return;
  g.fillStyle = c;
  g.fillRect(x, y, w, h);
}

function poly(g, pts) {
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath();
}

function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function line(g, x0, y0, x1, y1, c, w) {
  g.strokeStyle = c;
  g.lineWidth = w;
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.stroke();
}

function disc(g, x, y, r, c) {
  g.fillStyle = c;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}

// Metallic gold: a vertical (or horizontal) gradient with a hard bright band, the way gold
// leaf on a poster is painted — flat, with one sharp highlight.
function goldV(g, y0, y1, dim = 0) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  const d = (c) => (dim ? mixc(c, INK, dim) : c);
  gr.addColorStop(0, d(GOLD.lo));
  gr.addColorStop(0.3, d(GOLD.hi));
  gr.addColorStop(0.52, d(GOLD.mid));
  gr.addColorStop(0.85, d(GOLD.lo));
  gr.addColorStop(1, d(GOLD.dk));
  return gr;
}
function goldH(g, x0, x1, dim = 0) {
  const gr = g.createLinearGradient(x0, 0, x1, 0);
  const d = (c) => (dim ? mixc(c, INK, dim) : c);
  gr.addColorStop(0, d(GOLD.lo));
  gr.addColorStop(0.28, d(GOLD.hi));
  gr.addColorStop(0.5, d(GOLD.mid));
  gr.addColorStop(0.8, d(GOLD.lo));
  gr.addColorStop(1, d(GOLD.dk));
  return gr;
}
function lacquerV(g, y0, y1, base = LAQ, hi = LAQ_HI) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, hi);
  gr.addColorStop(0.18, base);
  gr.addColorStop(0.7, base);
  gr.addColorStop(1, mixc(base, '#000000', 0.4));
  return gr;
}
function lacquerH(g, x0, x1, base = LAQ, hi = LAQ_HI) {
  const gr = g.createLinearGradient(x0, 0, x1, 0);
  gr.addColorStop(0, mixc(base, '#000000', 0.3));
  gr.addColorStop(0.3, hi);
  gr.addColorStop(0.45, base);
  gr.addColorStop(1, mixc(base, '#000000', 0.35));
  return gr;
}

// A sunburst: alternate wedges between radii r0 and r1, from angle a0 to a1.
function sunburst(g, cx, cy, r0, r1, a0, a1, n, colA, colB) {
  const da = (a1 - a0) / n;
  for (let i = 0; i < n; i++) {
    const c = i % 2 ? colB : colA;
    if (!c) continue;
    const a = a0 + i * da;
    g.fillStyle = c;
    g.beginPath();
    g.arc(cx, cy, r1, a, a + da);
    g.arc(cx, cy, r0, a + da, a, true);
    g.closePath();
    g.fill();
  }
}

// Marble veining: long, slowly bending threads with a soft halo and the odd fork, seeded
// so a bay is always the same stone. `dir` is the stone's grain.
function veins(g, x0, y0, w, h, seed, col, n, wMax, aMax = 0.6, dir = 0.9) {
  const R = rng(seed);
  g.save();
  g.beginPath();
  g.rect(x0, y0, w, h);
  g.clip();
  g.strokeStyle = col;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const path = (pts) => {
    g.beginPath();
    g.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  };
  for (let i = 0; i < n; i++) {
    let x = x0 - 30 + R() * (w + 60);
    let y = y0 - 20 + R() * (h + 40);
    let a = dir + (R() - 0.5) * 0.7;
    let da = 0;
    const len = 50 + R() * 170;
    const pts = [x, y];
    const forks = [];
    for (let st = 0; st < len; st += 3) {
      da += (R() - 0.5) * 0.09;
      da *= 0.9;
      a += da;
      x += Math.cos(a) * 3;
      y += Math.sin(a) * 3;
      pts.push(x, y);
      if (R() < 0.025) forks.push([x, y, a + (R() < 0.5 ? 0.5 : -0.5)]);
    }
    const wv = 0.25 + R() * wMax;
    const al = 0.1 + R() * aMax;
    path(pts);
    g.globalAlpha = al * 0.22;
    g.lineWidth = wv * 4;
    g.stroke();
    g.globalAlpha = al;
    g.lineWidth = wv;
    g.stroke();
    for (const [fx, fy, fa0] of forks) {
      let bx = fx, by = fy, ba = fa0, bda = 0;
      const fp = [bx, by];
      for (let q = 0; q < 6 + R() * 12; q++) {
        bda += (R() - 0.5) * 0.12;
        ba += bda;
        bx += Math.cos(ba) * 2.6;
        by += Math.sin(ba) * 2.6;
        fp.push(bx, by);
      }
      path(fp);
      g.globalAlpha = al * 0.7;
      g.lineWidth = wv * 0.6;
      g.stroke();
    }
  }
  g.restore();
  g.globalAlpha = 1;
}

// Soft mottling: big faint blots, lighter and darker, the cloud in a slab of stone.
function mottle(g, x0, y0, w, h, seed, light, dark, density = 1) {
  const R = rng(seed);
  g.save();
  g.beginPath();
  g.rect(x0, y0, w, h);
  g.clip();
  const n = Math.round((w * h) / 500 * density);
  for (let i = 0; i < n; i++) {
    g.fillStyle = R() < 0.5 ? light : dark;
    g.globalAlpha = 0.04 + R() * 0.07;
    g.beginPath();
    const rx = 6 + R() * 26;
    g.ellipse(x0 + R() * w, y0 + R() * h, rx, rx * (0.3 + R() * 0.4), 0.9 + (R() - 0.5) * 0.6, 0, TAU);
    g.fill();
  }
  g.restore();
  g.globalAlpha = 1;
}

// ------------------------------------------------------------------ lettering
// A stroke alphabet drawn for this card: tall geometric capitals with the high waist of
// 1930s sign lettering (E, F, H, B, P, R break above the middle), circular O/C/G, a
// pointed M. Rendered as a stroke, optionally with an inline in a second colour.
const GLYPHS = (() => {
  const L = (...p) => {
    const o = [];
    for (let i = 0; i < p.length; i += 2) o.push([p[i], p[i + 1]]);
    return o;
  };
  const A = (cx, cy, rx, ry, a0, a1, n = 14) => {
    const o = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * (i / n);
      o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
    }
    return o;
  };
  const G = {
    A: [L(0, 10, 3, 0, 6, 10), L(1.05, 6.5, 4.95, 6.5)],
    B: [[...L(0, 10, 0, 0, 2.5, 0), ...A(2.5, 2.1, 2.0, 2.1, -PI / 2, PI / 2, 10), ...L(2.5, 4.2, 0, 4.2)],
      [...L(0, 4.2, 2.8, 4.2), ...A(2.8, 7.1, 2.4, 2.9, -PI / 2, PI / 2, 12), ...L(2.8, 10, 0, 10)]],
    C: [A(3, 5, 3, 5, -0.27 * PI, -1.73 * PI, 22)],
    D: [[...L(0, 10, 0, 0, 1.6, 0), ...A(1.6, 5, 3.6, 5, -PI / 2, PI / 2, 16), ...L(1.6, 10, 0, 10)]],
    E: [L(4.6, 0, 0, 0, 0, 10, 4.6, 10), L(0, 4.2, 3.6, 4.2)],
    F: [L(4.6, 0, 0, 0, 0, 10), L(0, 4.2, 3.6, 4.2)],
    G: [[...A(3, 5, 3, 5, -0.27 * PI, -2 * PI, 24), [3.3, 5]]],
    H: [L(0, 0, 0, 10), L(5, 0, 5, 10), L(0, 4.2, 5, 4.2)],
    I: [L(0, 0, 0, 10)],
    K: [L(0, 0, 0, 10), L(4.6, 0, 0, 6), L(1.7, 4, 4.8, 10)],
    M: [L(0, 10, 0, 0, 3.4, 8, 6.8, 0, 6.8, 10)],
    N: [L(0, 10, 0, 0, 5, 10, 5, 0)],
    O: [A(3, 5, 3, 5, 0, TAU, 28)],
    P: [[...L(0, 10, 0, 0, 2.6, 0), ...A(2.6, 2.3, 2.2, 2.3, -PI / 2, PI / 2, 10), ...L(2.6, 4.6, 0, 4.6)]],
    R: [[...L(0, 10, 0, 0, 2.6, 0), ...A(2.6, 2.3, 2.2, 2.3, -PI / 2, PI / 2, 10), ...L(2.6, 4.6, 0, 4.6)], L(2.2, 4.6, 4.9, 10)],
    S: [[...A(2.6, 2.45, 2.35, 2.45, -0.18 * PI, -1.5 * PI, 12), ...A(2.6, 7.4, 2.75, 2.6, -0.5 * PI, 0.82 * PI, 14)]],
    T: [L(0, 0, 5.2, 0), L(2.6, 0, 2.6, 10)],
    U: [[...L(0, 0, 0, 7.4), ...A(2.5, 7.4, 2.5, 2.6, PI, 0, 12), ...L(5, 7.4, 5, 0)]],
    W: [L(0, 0, 1.9, 10, 3.9, 3, 5.9, 10, 7.8, 0)],
    Y: [L(0, 0, 2.6, 5.2, 5.2, 0), L(2.6, 5.2, 2.6, 10)],
    2: [[...A(2.5, 2.6, 2.5, 2.6, -PI, 0.2 * PI, 14), [0, 10], [5.2, 10]]],
    3: [[...A(2.4, 2.5, 2.4, 2.5, -0.92 * PI, 0.5 * PI, 12), ...A(2.4, 7.4, 2.7, 2.6, -0.5 * PI, 0.92 * PI, 14)]],
    4: [L(3.8, 10, 3.8, 0, 0, 6.8, 5.2, 6.8)],
    8: [A(2.6, 2.4, 2.1, 2.4, 0, TAU, 18), A(2.6, 7.4, 2.6, 2.6, 0, TAU, 20)],
  };
  const out = {};
  for (const [ch, strokes] of Object.entries(G)) {
    let w = 0;
    for (const s of strokes) for (const [x] of s) w = Math.max(w, x);
    out[ch] = { w, strokes };
  }
  return out;
})();

function textW(str, track) {
  let w = 0;
  for (const ch of str) {
    const gl = GLYPHS[ch];
    w += (gl ? gl.w : 2.6) + track;
  }
  return w - track;
}

function textPath(g, str, x, y, h, track, align) {
  const s = h / 10;
  const W = textW(str, track) * s;
  let cx = align === 'left' ? x : align === 'right' ? x - W : x - W / 2;
  g.beginPath();
  for (const ch of str) {
    const gl = GLYPHS[ch];
    if (gl) {
      for (const st of gl.strokes) {
        for (let i = 0; i < st.length; i++) {
          const px = cx + st[i][0] * s;
          const py = y + st[i][1] * s;
          if (i) g.lineTo(px, py);
          else g.moveTo(px, py);
        }
      }
    }
    cx += ((gl ? gl.w : 2.6) + track) * s;
  }
  return W;
}

// y is the cap line (top of the letters).
function decoText(g, str, x, y, h, o = {}) {
  const track = o.track ?? 2.6;
  const align = o.align ?? 'center';
  const lw = o.lw ?? h * 0.13;
  g.lineCap = 'butt';
  g.lineJoin = 'miter';
  g.miterLimit = 3;
  if (o.shadow) {
    textPath(g, str, x + (o.sdx ?? lw * 0.7), y + (o.sdy ?? lw * 0.7), h, track, align);
    g.strokeStyle = o.shadow;
    g.lineWidth = lw;
    g.stroke();
  }
  const W = textPath(g, str, x, y, h, track, align);
  g.strokeStyle = o.color ?? GOLD.mid;
  g.lineWidth = lw;
  g.stroke();
  if (o.inline) {
    g.strokeStyle = o.inline;
    g.lineWidth = lw * (o.inlineW ?? 0.3);
    g.stroke();
  }
  return W;
}

// ------------------------------------------------------------------ strips & sprites
// A u-space strip one period long plus a screen of overscan, tiled at 512 logical px so
// no bake is wider than 2048 device px at 3x and 4x. `paint(g, ua, ub)` draws the layer's
// items in their own u; it is called once per copy (u - P, u, u + P) that reaches a tile.
// [ua, ub] is the part of [0, P) that copy owns inside the tile: anything filled along u
// (bands, hazes, friezes) fills only that, so no pixel is filled by two copies; items are
// drawn whole if they come near it, so an overhang still lands.
const TILE = 512;
const STRIP_PAD = 40;
function bakeStrip(k, P, y0, y1, paint) {
  const U0 = -STRIP_PAD;
  const U1 = P + FRAME_W + STRIP_PAD;
  const tiles = [];
  for (let a = U0; a < U1; a += TILE) {
    const w = Math.min(TILE, U1 - a);
    const c = canvas(w * k, (y1 - y0) * k);
    const g = c.getContext('2d');
    g.setTransform(k, 0, 0, k, -a * k, -y0 * k);
    for (const off of [-P, 0, P]) {
      const ua = Math.max(0, a - off);
      const ub = Math.min(P, a + w - off);
      if (ub < ua - 200) continue;
      g.save();
      g.translate(off, 0);
      paint(g, ua, ub);
      g.restore();
    }
    tiles.push({ a, w, c });
  }
  return { P, y0, h: y1 - y0, tiles };
}

// The strip is laid at whole device pixels; the return value is the sub-pixel offset the
// layer's live parts add so they stay locked to the bake.
function drawStrip(ctx, S, shift, k) {
  const s = mod(shift, S.P);
  const sx = Math.round(s * k) / k;
  for (const T of S.tiles) {
    const x = T.a - sx;
    if (x >= FRAME_W + 1 || x + T.w <= -1) continue;
    ctx.drawImage(T.c, x, S.y0, T.w, S.h);
  }
  return s - sx;
}

function snapOff(shift, P, k) {
  const s = mod(shift, P);
  return s - Math.round(s * k) / k;
}

function sprite(k, x0, y0, w, h, paint) {
  const c = canvas(w * k, h * k);
  const g = c.getContext('2d');
  g.setTransform(k, 0, 0, k, -x0 * k, -y0 * k);
  paint(g);
  return { c, x0, y0, w, h };
}

function blit(ctx, s, x, y) {
  ctx.drawImage(s.c, x + s.x0, y + s.y0, s.w, s.h);
}

const near = (u0, u1, ua, ub, m = 30) => u1 + m > ua && u0 - m < ub;

// ------------------------------------------------------------------ per-floor looks
const LOOK = {
  lobby: {
    sky: [[20, '#79a9c2'], [80, '#9fc2cd'], [140, '#d5d8c2'], [190, '#f2deb2']],
    far: { face: ['#aebdc2', '#a3b4bb', '#bcc6c3'], lit: '#e4e3d4', shade: '#8a9ea9', pier: '#d7dcd3' },
    near: { face: ['#ddcca8', '#b7b8b1', '#a9bbb0'], lit: '#f2e6c8', shade: '#8e8a7e', win: '#7f8a8e', spandrel: '#b5a98d' },
    cloud: { body: '#f6efdc', shade: '#d9d2c0', line: '#c9b98f' },
  },
  open: {
    sky: [[56, '#6a9cba'], [100, '#93bacb'], [152, '#d3ddd3']],
    far: { face: ['#a9bfca', '#9db4c1', '#b7c7cc'], lit: '#dfe6e2', shade: '#8aa2b1', pier: '#d2dcdc' },
    near: { face: ['#d9caa6', '#b4b8b4', '#a7b9b0'], lit: '#efe5c8', shade: '#888a84', win: '#78858c', spandrel: '#ada18a' },
    cloud: { body: '#f8f3e6', shade: '#dcd8cc', line: '#c4b894' },
  },
  exec: {
    sky: [[28, '#0c0e1c'], [70, '#1b1a36'], [112, '#3a2446'], [146, '#6c2b39'], [168, '#b4553a'], [186, '#df8a4b'], [204, '#eeaa62']],
    far: { face: ['#2b2236', '#30263a', '#271f31'], lit: '#46395a', shade: '#1c1626', pier: '#3c3150', win: '#f2c063' },
    near: { face: ['#221c2e', '#2a2236', '#1e1929'], lit: '#4a3f62', shade: '#120f1a', win: '#f0bd5c', rim: '#d27a4a' },
    cloud: { body: '#3a2440', shade: '#26182c', line: '#d0724a' },
  },
};

// ================================================================== OUTSIDE
function bakeSky(fl, k) {
  const F = OFFICE_FLOORS[fl];
  const H = F.glass.bottom + 2;
  const c = canvas(FRAME_W * k, H * k);
  const g = c.getContext('2d');
  g.setTransform(k, 0, 0, k, 0, 0);
  const L = LOOK[fl];
  const y0 = L.sky[0][0], y1 = L.sky[L.sky.length - 1][0];
  const gr = g.createLinearGradient(0, y0, 0, y1);
  for (const [y, col] of L.sky) gr.addColorStop((y - y0) / (y1 - y0), col);
  g.fillStyle = gr;
  g.fillRect(0, 0, FRAME_W, H);
  const sun = F.outside.sun;
  if (fl === 'lobby') {
    // The Cassandre morning: a rayed sun high left, rays across the whole sky.
    const rg = g.createRadialGradient(sun.x, sun.y, sun.r, sun.x, sun.y, 460);
    rg.addColorStop(0, 'rgba(255,249,228,0.34)');
    rg.addColorStop(0.35, 'rgba(255,249,228,0.13)');
    rg.addColorStop(1, 'rgba(255,249,228,0)');
    g.fillStyle = rg;
    const n = 44;
    for (let i = 0; i < n; i += 2) {
      g.beginPath();
      g.moveTo(sun.x, sun.y);
      g.arc(sun.x, sun.y, 560, (i / n) * TAU, ((i + 1) / n) * TAU);
      g.closePath();
      g.fill();
    }
    for (const [r, a] of [[36, 0.09], [29, 0.13], [22, 0.2]]) disc(g, sun.x, sun.y, r, `rgba(255,247,224,${a})`);
    const dg = g.createRadialGradient(sun.x - 4, sun.y - 4, 2, sun.x, sun.y, sun.r);
    dg.addColorStop(0, '#fffbef');
    dg.addColorStop(1, '#f5d88f');
    disc(g, sun.x, sun.y, sun.r, dg);
    g.strokeStyle = rgba(GOLD.mid, 0.6);
    g.lineWidth = 0.8;
    g.beginPath();
    g.arc(sun.x, sun.y, sun.r + 3, 0, TAU);
    g.stroke();
    // Streamline haze lines low over the street.
    for (const [y, a, w] of [[120, 0.12, 0.6], [132, 0.16, 0.7], [146, 0.2, 0.8], [158, 0.25, 1], [168, 0.3, 1.2]]) {
      rect(g, 0, y, FRAME_W, w, `rgba(255,249,232,${a})`);
    }
  } else if (fl === 'open') {
    // Noon: flat poster blue, a few streamline lines toward the horizon.
    for (const [y, a, w] of [[118, 0.1, 0.6], [128, 0.14, 0.7], [138, 0.18, 0.9], [145, 0.22, 1.1]]) {
      rect(g, 0, y, FRAME_W, w, `rgba(255,252,240,${a})`);
    }
    // A pale high glare at the top left, the sun overhead out of frame.
    const rg = g.createRadialGradient(40, 40, 10, 40, 40, 260);
    rg.addColorStop(0, 'rgba(255,252,236,0.28)');
    rg.addColorStop(1, 'rgba(255,252,236,0)');
    rect(g, 0, 0, FRAME_W, H, rg);
  } else {
    // Ferriss dusk: a rayed setting sun, striped across its lower half, haze bands
    // through it, charcoal grain, the zenith going to night.
    const rg = g.createRadialGradient(sun.x, sun.y, sun.r, sun.x, sun.y, 300);
    rg.addColorStop(0, 'rgba(255,196,120,0.30)');
    rg.addColorStop(0.4, 'rgba(255,170,100,0.10)');
    rg.addColorStop(1, 'rgba(255,170,100,0)');
    g.fillStyle = rg;
    const n = 30;
    for (let i = 0; i < n; i += 2) {
      g.beginPath();
      g.moveTo(sun.x, sun.y);
      g.arc(sun.x, sun.y, 420, PI + (i / n) * PI, PI + ((i + 1) / n) * PI);
      g.closePath();
      g.fill();
    }
    const glow = g.createRadialGradient(sun.x, sun.y, 4, sun.x, sun.y, 90);
    glow.addColorStop(0, 'rgba(255,214,150,0.55)');
    glow.addColorStop(1, 'rgba(255,170,100,0)');
    rect(g, 0, 0, FRAME_W, H, glow);
    const dg = g.createLinearGradient(0, sun.y - sun.r, 0, sun.y + sun.r);
    dg.addColorStop(0, '#ffe8a8');
    dg.addColorStop(1, '#f08a44');
    disc(g, sun.x, sun.y, sun.r, dg);
    for (let i = 0; i < 4; i++) {
      const y = sun.y + 2 + i * 3.4;
      rect(g, sun.x - sun.r - 1, y, sun.r * 2 + 2, 0.7 + i * 0.35, '#c4643c');
    }
    for (const [y, x0, x1, h, col] of [[156, 180, 470, 1.6, '#8e3b3a'], [161, 230, 420, 1.1, '#b5583e'], [174, 120, 400, 1.4, '#c46a40'], [150, 300, 480, 0.9, '#5f2a3c']]) {
      g.fillStyle = col;
      rr(g, x0, y, x1 - x0, h, h / 2);
      g.fill();
    }
    // charcoal: vertical grain, heavier toward the top
    const R = rng(77);
    for (let i = 0; i < 700; i++) {
      const x = R() * FRAME_W;
      const y = R() * 170;
      g.globalAlpha = 0.04 + 0.08 * R() * (1 - y / 190);
      rect(g, x, y, 0.5, 3 + R() * 10, R() < 0.5 ? '#000000' : '#8a6a9a');
    }
    g.globalAlpha = 1;
  }
  return { c, h: H };
}

// --- buildings ---------------------------------------------------------------------
function facadeGrid(g, x0, x1, y0, y1, b, P, kind, fl) {
  const cols = b.cols;
  const cw = (x1 - x0) / cols;
  const fh = b.floorH;
  if (kind === 'far' && fl !== 'exec') {
    g.globalAlpha = 0.45;
    for (let c = 1; c < cols; c++) rect(g, x0 + c * cw - 0.3, y0 + 2, 0.6, y1 - y0 - 2, P.pier);
    g.globalAlpha = 1;
    return;
  }
  if (fl === 'exec') {
    // dusk: dark glass, some windows lit gold
    for (let r = 0, y = y0 + 3; y < y1 - 2; r++, y += fh * 0.8) {
      for (let c = 0; c < cols; c++) {
        const lit = hash(b.i * 131 + r * 17 + c * 7 + (kind === 'far' ? 5 : 0)) < b.lit;
        if (!lit && kind === 'far') continue;
        const wx = x0 + c * cw + cw * 0.25;
        rect(g, wx, y, Math.max(0.6, cw * 0.5), fh * 0.38, lit ? P.win : rgba('#000000', 0.25));
      }
    }
    return;
  }
  // day, near: deco verticals — recessed window bands run the full height between
  // unbroken piers, the spandrels only faint ticks, so a facade reads as fluted stone
  for (let c = 0; c < cols; c++) {
    const wx = x0 + c * cw + cw * 0.26;
    rect(g, wx, y0 + 2, cw * 0.48, y1 - y0 - 4, P.win);
    rect(g, wx, y0 + 2, cw * 0.12, y1 - y0 - 4, rgba('#000000', 0.12));
  }
  g.globalAlpha = 0.55;
  for (let y = y0 + 2 + fh * 0.7; y < y1 - 3; y += fh) rect(g, x0, y, x1 - x0, fh * 0.24, P.spandrel);
  g.globalAlpha = 0.45;
  for (let c = 0; c <= cols; c++) rect(g, x0 + c * cw - 0.3, y0, 0.6, y1 - y0, P.lit);
  g.globalAlpha = 1;
}

function building(g, b, fl, kind) {
  const L = LOOK[fl][kind];
  const x = b.u, w = b.w, top = b.top, base = b.base;
  const face = L.face[b.tone];
  const tiers = [];
  if (b.roof === 'stepped' || (fl === 'open' && kind === 'near' && b.roof === 'flat')) {
    const s1 = b.roof === 'flat' ? 6 : Math.max(6, Math.min(14, (base - top) * 0.1));
    tiers.push([x + w * 0.28, x + w * 0.72, top]);
    tiers.push([x + w * 0.14, x + w * 0.86, top + s1]);
    tiers.push([x, x + w, top + s1 * 2]);
  } else tiers.push([x, x + w, top]);
  // crowns behind the body
  const cx = x + w / 2;
  if (b.roof === 'spire') {
    // a Chrysler crown: stacked arches with sunburst windows, then the needle
    const cw0 = w * 0.62;
    for (let j = 0; j < 4; j++) {
      const ww = cw0 * (1 - j * 0.22);
      const yb = top - j * 6;
      g.fillStyle = j % 2 ? mixc(face, L.lit, 0.35) : face;
      g.beginPath();
      g.moveTo(cx - ww / 2, yb + 0.5);
      g.lineTo(cx - ww / 2, yb - 2);
      g.ellipse(cx, yb - 2, ww / 2, 6, 0, PI, TAU);
      g.lineTo(cx + ww / 2, yb + 0.5);
      g.closePath();
      g.fill();
      if (kind === 'near' || fl === 'exec') {
        g.fillStyle = fl === 'exec' ? rgba(GOLD.hi, 0.75) : rgba(L.shade, 0.7);
        for (let q = 0; q < 5; q++) {
          const a = PI + (q + 0.5) * (PI / 5);
          const r0 = ww * 0.18, r1 = ww * 0.42;
          g.beginPath();
          g.moveTo(cx + Math.cos(a - 0.12) * r0, yb - 2 + Math.sin(a - 0.12) * r0 * 0.9);
          g.lineTo(cx + Math.cos(a) * r1, yb - 2 + Math.sin(a) * Math.min(5.5, r1) * 0.9);
          g.lineTo(cx + Math.cos(a + 0.12) * r0, yb - 2 + Math.sin(a + 0.12) * r0 * 0.9);
          g.closePath();
          g.fill();
        }
      }
    }
    g.fillStyle = fl === 'exec' ? GOLD.mid : mixc(face, L.lit, 0.5);
    poly(g, [cx - 1.4, top - 24, cx, top - 40, cx + 1.4, top - 24]);
    g.fill();
  } else if (b.roof === 'antenna') {
    rect(g, cx - w * 0.2, top - 5, w * 0.4, 5, face);
    rect(g, cx - w * 0.12, top - 9, w * 0.24, 4, face);
    rect(g, cx - 0.7, top - 28, 1.4, 19, fl === 'exec' ? '#3a3048' : mixc(face, L.shade, 0.4));
    disc(g, cx, top - 28, 1.3, fl === 'exec' ? '#e04040' : mixc(face, L.shade, 0.4));
  } else if (b.roof === 'tank') {
    // a water tank as a deco form: banded drum on a stepped plinth, a stepped cone cap
    const tw = kind === 'near' ? 17 : 11;
    const th = kind === 'near' ? 13 : 9;
    const tx = x + w * 0.28;
    const tc = kind === 'near' ? mixc(OX.mid, face, 0.45) : face;
    rect(g, tx - 1.5, top - 3, tw + 3, 3, mixc(face, '#000000', 0.2));
    const legC = mixc(face, '#2a2a2a', 0.5);
    for (const lx of [tx + 2, tx + tw / 2, tx + tw - 2]) rect(g, lx - 0.4, top - 7, 0.8, 4, legC);
    rect(g, tx, top - 7 - th, tw, th, tc);
    rect(g, tx, top - 7 - th, tw * 0.25, th, mixc(tc, '#ffffff', 0.2));
    rect(g, tx + tw * 0.8, top - 7 - th, tw * 0.2, th, mixc(tc, '#000000', 0.2));
    for (let q = 1; q < 4; q++) rect(g, tx, top - 7 - th + (th * q) / 4, tw, 0.6, mixc(tc, CREAM, 0.5));
    g.fillStyle = mixc(tc, '#000000', 0.3);
    rect(g, tx - 1, top - 9 - th, tw + 2, 2, mixc(tc, '#000000', 0.3));
    rect(g, tx + 1.5, top - 11 - th, tw - 3, 2, mixc(tc, '#000000', 0.3));
    rect(g, tx + tw / 2 - 2.5, top - 13 - th, 5, 2, mixc(tc, '#000000', 0.3));
    rect(g, tx + tw / 2 - 0.4, top - 16 - th, 0.8, 3, mixc(tc, '#000000', 0.3));
  } else if (b.roof === 'billboard') {
    const bx = x + 8, bw = w - 16, by = top - 18;
    line(g, bx + 4, top, bx + 4, by + 12, '#4a4a4a', 0.8);
    line(g, bx + bw - 4, top, bx + bw - 4, by + 12, '#4a4a4a', 0.8);
    rect(g, bx, by, bw, 12, INK);
    rect(g, bx + 0.5, by + 0.5, bw - 1, 11, OX.mid);
    sunburst(g, bx + 10, by + 12, 1, 12, PI, TAU, 12, rgba(GOLD.hi, 0.7), null);
    g.fillStyle = CREAM;
    g.beginPath();
    g.ellipse(bx + 10, by + 6.5, 2.6, 3.4, 0, 0, TAU);
    g.fill();
    if (bw > 40) decoText(g, 'EGGCORP', bx + bw * 0.62, by + 3.8, 4.2, { color: CREAM, lw: 0.6, track: 2 });
  }
  for (const [x0, x1, yt] of tiers) {
    rect(g, x0, yt, x1 - x0, base - yt, face);
  }
  for (let ti = 0; ti < tiers.length; ti++) {
    const [x0, x1, yt] = tiers[ti];
    const yb = ti < tiers.length - 1 ? tiers[ti + 1][2] : base;
    const tw = x1 - x0;
    // facet light: left lit (sun from the left), right in shade
    if (fl === 'exec') {
      rect(g, x0, yt, Math.max(1, tw * 0.18), base - yt, rgba(L.lit, 0.5));
      rect(g, x1 - 0.8, yt, 0.8, base - yt, rgba(L.rim || L.lit, 0.55));
    } else {
      rect(g, x0, yt, tw * 0.2, base - yt, rgba(L.lit, 0.55));
      rect(g, x1 - tw * 0.16, yt, tw * 0.16, base - yt, rgba(L.shade, 0.35));
    }
    if (yb - yt > 4) facadeGrid(g, x0 + tw * 0.06, x1 - tw * 0.06, yt + 2, ti < tiers.length - 1 ? yb : base, b, L, kind, fl);
  }
  // parapets and cornices
  const [tx0, tx1, tyt] = tiers[0];
  if (b.roof === 'cornice') {
    rect(g, x - 1.5, top, w + 3, 2.5, mixc(face, '#000000', 0.18));
    rect(g, x - 1.5, top, w + 3, 0.7, mixc(face, '#ffffff', 0.3));
  } else if (b.roof === 'flat' && kind === 'near') {
    // a zigzag frieze under the parapet
    g.strokeStyle = fl === 'exec' ? rgba(GOLD.mid, 0.6) : rgba(L.shade, 0.6);
    g.lineWidth = 0.6;
    g.beginPath();
    for (let xx = tx0 + 1, j = 0; xx <= tx1 - 1; xx += 2.5, j++) {
      const yy = tyt + 2.5 + (j % 2 ? 1.6 : 0);
      if (j) g.lineTo(xx, yy);
      else g.moveTo(xx, yy);
    }
    g.stroke();
  }
  if (fl === 'exec' && kind === 'near' && (b.roof === 'stepped' || b.roof === 'spire')) {
    // floodlit crown: gold wash up the top tier
    const fg = g.createLinearGradient(0, tyt + 18, 0, tyt - 6);
    fg.addColorStop(0, 'rgba(255,200,110,0)');
    fg.addColorStop(1, 'rgba(255,200,110,0.35)');
    rect(g, tx0, tyt - 6, tx1 - tx0, 24, fg);
  }
  // street level: shops with awnings (lobby, the near facades)
  if (b.shop != null) {
    const aw = [OX.mid, JADE.lo, '#1c1820', GOLD.lo][b.shop];
    const sy = base - 16;
    rect(g, x + 2, sy + 5, w - 4, 11, '#3b3230');
    for (let q = 0, n = Math.max(2, Math.floor((w - 6) / 14)); q < n; q++) {
      const qw = (w - 6) / n;
      rect(g, x + 3 + q * qw + 1, sy + 6.5, qw - 2, 8.5, '#c9a46a');
      rect(g, x + 3 + q * qw + 1, sy + 6.5, qw - 2, 2.5, rgba('#000000', 0.25));
    }
    rect(g, x + 2, sy, w - 4, 4.5, aw);
    g.fillStyle = rgba(CREAM, 0.7);
    for (let xx = x + 3; xx < x + w - 3; xx += 4) g.fillRect(xx, sy, 1.6, 4.5);
    g.fillStyle = aw;
    for (let xx = x + 2; xx < x + w - 3; xx += 4) {
      g.beginPath();
      g.arc(xx + 2, sy + 4.5, 2, 0, PI);
      g.fill();
    }
  }
}

function tree(g, x, y, s) {
  // a clipped deco topiary in a black planter
  rect(g, x - 4 * s, y - 4 * s, 8 * s, 4 * s, '#1b181e');
  rect(g, x - 4 * s, y - 4 * s, 8 * s, 0.7, GOLD.mid);
  rect(g, x - 0.8, y - 18 * s, 1.6, 14 * s, '#3a2c22');
  const cy = y - 27 * s;
  g.fillStyle = JADE.lo;
  g.beginPath();
  g.ellipse(x, cy, 10 * s, 13 * s, 0, 0, TAU);
  g.fill();
  g.fillStyle = JADE.mid;
  g.beginPath();
  g.ellipse(x, cy, 10 * s, 13 * s, 0, PI / 2, PI * 1.5);
  g.fill();
  g.strokeStyle = rgba(JADE.hi, 0.7);
  g.lineWidth = 0.6;
  for (let j = -2; j <= 2; j++) {
    const yy = cy + j * 4.5 * s;
    g.beginPath();
    g.moveTo(x - 6 * s, yy + 2.5 * s);
    g.lineTo(x, yy - 1 * s);
    g.lineTo(x + 6 * s, yy + 2.5 * s);
    g.stroke();
  }
  line(g, x, cy - 12 * s, x, cy + 12 * s, rgba(JADE.dk, 0.8), 0.6);
}

function lampPost(g, x, y) {
  rect(g, x - 3, y - 3, 6, 3, '#1a1720');
  rect(g, x - 2, y - 5, 4, 2, '#1a1720');
  rect(g, x - 0.9, y - 36, 1.8, 31, '#1d1a22');
  rect(g, x - 0.3, y - 36, 0.5, 31, rgba(GOLD.mid, 0.5));
  rect(g, x - 3, y - 38, 6, 2, '#1d1a22');
  g.fillStyle = '#efe2bd';
  poly(g, [x - 2.6, y - 38, x - 3.2, y - 44, x + 3.2, y - 44, x + 2.6, y - 38]);
  g.fill();
  rect(g, x - 3.6, y - 45.5, 7.2, 1.6, '#1d1a22');
  rect(g, x - 2, y - 47, 4, 1.6, '#1d1a22');
  rect(g, x - 0.4, y - 49, 0.8, 2, GOLD.mid);
}

function paintFar(fl) {
  const O = OFFICE_FLOORS[fl].outside;
  return (g, ua, ub) => {
    for (const b of O.far) if (near(b.u, b.u + b.w, ua, ub, 20)) building(g, b, fl, 'far');
    if (fl === 'exec') {
      // the city carpet sinking into the horizon haze
      const hg = g.createLinearGradient(0, 160, 0, 202);
      hg.addColorStop(0, 'rgba(230,140,80,0.32)');
      hg.addColorStop(0.5, 'rgba(160,70,70,0.14)');
      hg.addColorStop(1, 'rgba(40,20,40,0)');
      rect(g, ua, 160, ub - ua, 42, hg);
    } else {
      const hg = g.createLinearGradient(0, O.horizon - 50, 0, O.horizon);
      hg.addColorStop(0, rgba(LOOK[fl].sky[LOOK[fl].sky.length - 1][1], 0));
      hg.addColorStop(1, rgba(LOOK[fl].sky[LOOK[fl].sky.length - 1][1], 0.4));
      g.globalCompositeOperation = 'source-atop';
      rect(g, ua, O.horizon - 50, ub - ua, 52, hg);
      g.globalCompositeOperation = 'source-over';
    }
  };
}

function paintNear(fl) {
  const O = OFFICE_FLOORS[fl].outside;
  return (g, ua, ub) => {
    if (O.street) {
      const S = O.street;
      rect(g, ua, S.far - 3, ub - ua, 3, '#cdbf9f');
      rect(g, ua, S.far, ub - ua, S.near - S.far, '#a19788');
      rect(g, ua, S.far, ub - ua, 1, '#7c7468');
      rect(g, ua, S.near, ub - ua, 4, '#d6c9a8');
      rect(g, ua, S.near, ub - ua, 0.8, '#8f8574');
      // lane dashes, in the near layer's u so they slide with it
      for (let u = Math.floor(ua / 24) * 24; u < ub; u += 24) rect(g, u, (S.far + S.near) / 2 - 0.4, 11, 0.8, rgba(CREAM, 0.7));
    }
    for (const b of O.near) if (near(b.u, b.u + b.w, ua, ub, 30)) building(g, b, fl, 'near');
    for (const t of O.trees) if (near(t.u, t.u, ua, ub, 20)) tree(g, t.u, O.street.far, t.s);
    for (const l of O.lamps) if (near(l.u, l.u, ua, ub, 10)) lampPost(g, l.u, O.street.far);
    if (fl !== 'exec') {
      g.globalCompositeOperation = 'source-atop';
      rect(g, ua, 0, ub - ua, 210, rgba(LOOK[fl].sky[LOOK[fl].sky.length - 1][1], 0.16));
      g.globalCompositeOperation = 'source-over';
    }
    if (fl === 'exec') {
      const hg = g.createLinearGradient(0, 150, 0, 205);
      hg.addColorStop(0, 'rgba(200,100,70,0)');
      hg.addColorStop(1, 'rgba(200,100,70,0.22)');
      g.globalCompositeOperation = 'source-atop';
      rect(g, ua, 150, ub - ua, 55, hg);
      g.globalCompositeOperation = 'source-over';
    }
  };
}

function cloudSprite(k, w, h, fl) {
  const L = LOOK[fl].cloud;
  const H = h * 1.7;
  return sprite(k, -2, -H, w + 4, H + h * 0.6 + 2, (g) => {
    // streamline lozenges, stacked and offset: flat poster clouds
    const base = h * 0.5;
    const caps = [[0, base - h * 0.55, w, h * 0.55], [w * 0.12, base - h * 1.0, w * 0.62, h * 0.5], [w * 0.3, base - h * 1.4, w * 0.34, h * 0.42]];
    for (const [cx, cy, cw, ch] of caps) {
      g.fillStyle = L.body;
      rr(g, cx, cy, cw, ch, ch / 2);
      g.fill();
      g.fillStyle = L.shade;
      rr(g, cx + ch * 0.3, cy + ch * 0.62, cw - ch * 0.6, ch * 0.38, ch * 0.19);
      g.fill();
    }
    g.strokeStyle = L.line;
    g.lineWidth = 0.6;
    for (const [cx, cy, cw, ch] of caps) {
      g.beginPath();
      g.moveTo(cx + ch / 2, cy + ch);
      g.lineTo(cx + cw - ch / 2, cy + ch);
      g.stroke();
    }
    if (fl === 'exec') {
      // dusk: the cloud's belly lit from the sun below
      g.globalCompositeOperation = 'source-atop';
      const lg = g.createLinearGradient(0, base - h * 0.3, 0, base);
      lg.addColorStop(0, 'rgba(220,110,70,0)');
      lg.addColorStop(1, 'rgba(240,140,80,0.7)');
      rect(g, -2, base - h * 1.5, w + 4, h * 1.5, lg);
      g.globalCompositeOperation = 'source-over';
    }
  });
}

// cars face right; a dir -1 car is the mirror
function carSprite(k, kind, dir) {
  const w = { cab: 30, car: 28, bus: 64 }[kind];
  const h = kind === 'bus' ? 23 : 13;
  return sprite(k, -1, -h, w + 2, h + 2, (g) => {
    if (dir < 0) {
      g.translate(w, 0);
      g.scale(-1, 1);
    }
    const wheel = (x, r) => {
      disc(g, x, -r + 0.2, r, '#121014');
      disc(g, x, -r + 0.2, r * 0.45, SILVER.mid);
    };
    if (kind === 'bus') {
      g.fillStyle = OX.mid;
      g.beginPath();
      g.moveTo(0, -2);
      g.lineTo(0, -19);
      g.quadraticCurveTo(0, -22, 4, -22);
      g.lineTo(50, -22);
      g.quadraticCurveTo(64, -21, 64, -9);
      g.lineTo(64, -2);
      g.closePath();
      g.fill();
      g.save();
      g.clip();
      rect(g, 0, -22, 64, 10, CREAM);
      rect(g, 2, -19.5, 52, 5, '#2a333b');
      for (let x = 9; x < 54; x += 7) rect(g, x, -19.5, 0.8, 5, CREAM);
      g.fillStyle = '#2a333b';
      poly(g, [55, -19.5, 60.5, -16, 60.5, -14.5, 55, -14.5]);
      g.fill();
      for (const y of [-9, -7, -5]) rect(g, 0, y, 52 - (y + 9) * 4, 0.7, CREAM);
      rect(g, 0, -12.3, 64, 0.8, GOLD.mid);
      g.restore();
      wheel(12, 3.2);
      wheel(50, 3.2);
      return;
    }
    const body = kind === 'cab' ? '#d9a530' : JADE.lo;
    const bodyHi = kind === 'cab' ? '#f0c858' : JADE.mid;
    g.fillStyle = body;
    g.beginPath();
    g.moveTo(1, -2.5);
    g.lineTo(1, -6);
    g.quadraticCurveTo(2, -7.8, 6.5, -8.2);
    g.lineTo(9.5, -11.6);
    g.lineTo(18.5, -11.6);
    g.quadraticCurveTo(21.5, -11.2, 23.5, -8.2);
    g.quadraticCurveTo(w - 0.5, -7.4, w, -4.6);
    g.lineTo(w, -2.5);
    g.closePath();
    g.fill();
    rect(g, 2, -7.6, w - 4, 1.2, bodyHi);
    g.fillStyle = '#26323a';
    poly(g, [10.4, -10.9, 18, -10.9, 21.2, -8.4, 9, -8.4]);
    g.fill();
    rect(g, 14.6, -10.9, 0.8, 2.5, body);
    // fender skirts
    g.fillStyle = mixc(body, '#000000', 0.45);
    g.beginPath();
    g.ellipse(7, -3, 4.6, 3.4, 0, PI, TAU);
    g.ellipse(w - 6.5, -3, 4.6, 3.4, 0, PI, TAU);
    g.fill();
    if (kind === 'cab') {
      for (let i = 0; i < 9; i++) rect(g, 5 + i * 2, -6.2, 1, 1, i % 2 ? INK : CREAM);
      rect(g, 12.5, -12.6, 4, 1, CREAM);
    }
    for (const y of [-5.2, -4.2]) rect(g, 1.5, y, 5, 0.5, SILVER.hi);
    wheel(7, 2.6);
    wheel(w - 6.5, 2.6);
  });
}

function blimpSprite(k, dir, label) {
  return sprite(k, -34, -14, 68, 30, (g) => {
    const s = dir < 0 ? 1 : -1; // nose toward travel
    const bg = g.createLinearGradient(0, -10, 0, 10);
    bg.addColorStop(0, SILVER.hi);
    bg.addColorStop(0.45, SILVER.mid);
    bg.addColorStop(1, SILVER.lo);
    // fins at the tail
    g.fillStyle = SILVER.lo;
    poly(g, [-s * 22, -3, -s * 31, -10, -s * 31, -2]);
    g.fill();
    poly(g, [-s * 22, 3, -s * 31, 10, -s * 31, 2]);
    g.fill();
    g.fillStyle = bg;
    g.beginPath();
    g.ellipse(0, 0, 29, 9.5, 0, 0, TAU);
    g.fill();
    // ribs and speed bands
    g.strokeStyle = rgba(SILVER.dk, 0.35);
    g.lineWidth = 0.4;
    for (let x = -20; x <= 20; x += 8) {
      g.beginPath();
      g.ellipse(x, 0, 1.6, 9.5 * Math.sqrt(1 - (x / 29) ** 2), 0, -PI / 2, PI / 2);
      g.stroke();
    }
    rect(g, -s * 28 + (s > 0 ? 0 : -12), 3.4, 12, 0.6, OX.mid);
    rect(g, -s * 28 + (s > 0 ? 0 : -9), 4.6, 9, 0.6, OX.mid);
    g.fillStyle = INK;
    rr(g, -6, 9, 12, 3.4, 1.5);
    g.fill();
    rect(g, -4.5, 10, 9, 1, rgba(GOLD.hi, 0.8));
    decoText(g, label, 0, -2.6, 5, { color: OX.lo, lw: 0.75, track: 2.2 });
  });
}

function drawBirds(ctx, fl) {
  const offs = [[0, 0], [8, 3], [15, 0.5], [-7, 4], [22, 4.5]];
  ctx.strokeStyle = 'rgba(38,36,48,0.85)';
  ctx.lineWidth = 0.9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  offs.forEach(([dx, dy], j) => {
    const f = Math.sin(fl.phase * TAU + j * 1.3);
    const x = fl.x + dx, y = fl.y + dy;
    ctx.moveTo(x - 3.2, y - 1 - f * 1.6);
    ctx.quadraticCurveTo(x - 1.4, y - 1.6 - f, x, y);
    ctx.quadraticCurveTo(x + 1.4, y - 1.6 - f, x + 3.2, y - 1 - f * 1.6);
  });
  ctx.stroke();
}

function drawHeli(ctx, fl, t) {
  const x = fl.x, y = fl.y, d = fl.dir;
  ctx.fillStyle = '#16121c';
  ctx.beginPath();
  ctx.ellipse(x, y, 8, 4.2, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - d * 5, y - 1);
  ctx.lineTo(x - d * 18, y - 2.4);
  ctx.lineTo(x - d * 18, y - 0.6);
  ctx.lineTo(x - d * 5, y + 1.6);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,200,120,0.55)';
  ctx.beginPath();
  ctx.ellipse(x + d * 4, y - 0.8, 2.6, 1.8, 0, 0, TAU);
  ctx.fill();
  line(ctx, x - 6, y + 6, x + 6, y + 6, '#16121c', 0.8);
  line(ctx, x - 3, y + 3.5, x - 4, y + 6, '#16121c', 0.6);
  line(ctx, x + 3, y + 3.5, x + 4, y + 6, '#16121c', 0.6);
  line(ctx, x, y - 4, x, y - 6, '#16121c', 0.8);
  const c = Math.cos(fl.phase * TAU);
  ctx.fillStyle = 'rgba(22,18,28,0.85)';
  ctx.fillRect(x - 14 * Math.abs(c), y - 6.6, 28 * Math.abs(c) + 0.6, 0.9);
  ctx.strokeStyle = 'rgba(22,18,28,0.7)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.arc(x - d * 18, y - 1.5, 2.6, 0, TAU);
  ctx.stroke();
  if (mod(t, 1.4) < 0.18) {
    disc(ctx, x, y + 4.4, 1.1, '#ff5a4a');
    disc(ctx, x, y + 4.4, 3, 'rgba(255,90,74,0.25)');
  }
}

function drawCradle(ctx, c) {
  const x = c.x, y = c.y, w = c.w;
  ctx.strokeStyle = 'rgba(30,28,34,0.9)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(x + 4, 0);
  ctx.lineTo(x + 4, y - 4);
  ctx.moveTo(x + w - 4, 0);
  ctx.lineTo(x + w - 4, y - 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 1, y);
  ctx.lineTo(x + 4, y - 4);
  ctx.lineTo(x + 7, y);
  ctx.moveTo(x + w - 7, y);
  ctx.lineTo(x + w - 4, y - 4);
  ctx.lineTo(x + w - 1, y);
  ctx.stroke();
  // the cleaner: jade overalls, a black cap, the squeegee on the glass
  const px = x + 18;
  ctx.fillStyle = JADE.lo;
  ctx.fillRect(px - 3.5, y - 10, 7, 10);
  ctx.fillStyle = '#d2a27a';
  disc(ctx, px, y - 13, 2.8, '#d2a27a');
  ctx.fillStyle = INK;
  ctx.fillRect(px - 3, y - 16, 6, 1.8);
  ctx.fillRect(px + 1, y - 14.8, 3.4, 0.8);
  const sx = x + 25 + c.swipe * 16;
  const sy = y - 17 + Math.sin(c.swipe * PI) * -2;
  line(ctx, px + 2.5, y - 8.5, sx, sy, JADE.lo, 1.6);
  line(ctx, sx, sy, sx + 1.5, sy - 2, SILVER.lo, 0.7);
  rect(ctx, sx + 1, sy - 6, 1.2, 8, SILVER.mid);
  // the gondola: a streamline tub in lacquer with a brass rail
  ctx.fillStyle = LAQ;
  rr(ctx, x, y, w, 9, 3);
  ctx.fill();
  rect(ctx, x + 1, y, w - 2, 1, GOLD.mid);
  rect(ctx, x + 4, y + 3.6, w - 8, 0.6, rgba(CREAM, 0.7));
  rect(ctx, x + 4, y + 5.4, w - 14, 0.6, rgba(CREAM, 0.7));
  rect(ctx, x + w - 12, y - 3, 5, 3, SILVER.lo);
}

function drawSearchlights(ctx, f, farShift) {
  const t = f.t;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  [180, 640, 1090].forEach((u, j) => {
    const x = mod(u - farShift + 200, 1400) - 200;
    if (x < -160 || x > FRAME_W + 160) return;
    const th = 0.55 * Math.sin(t * 0.32 + j * 2.1) + (j - 1) * 0.12;
    const dx = Math.sin(th), dy = -Math.cos(th);
    const nx = Math.cos(th), ny = Math.sin(th);
    const L = 300;
    const y = 202;
    const gr = ctx.createLinearGradient(x, y, x + dx * L, y + dy * L);
    gr.addColorStop(0, 'rgba(255,232,190,0.26)');
    gr.addColorStop(0.5, 'rgba(255,232,190,0.10)');
    gr.addColorStop(1, 'rgba(255,232,190,0)');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.moveTo(x - nx * 1.2, y - ny * 1.2);
    ctx.lineTo(x + dx * L - nx * 17, y + dy * L - ny * 17);
    ctx.lineTo(x + dx * L + nx * 17, y + dy * L + ny * 17);
    ctx.lineTo(x + nx * 1.2, y + ny * 1.2);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
}

function outside(ctx, f, B, k, dW) {
  const O = f.outside;
  ctx.drawImage(B.sky.c, 0, 0, FRAME_W, B.sky.h);
  const farShift = O.far.length ? O.far[0].u - O.far[0].x : 0;
  const nearShift = O.near.length ? O.near[0].u - O.near[0].x : 0;
  if (f.floor === 'exec') {
    for (const s of O.stars) {
      ctx.globalAlpha = 0.3 + 0.7 * s.twinkle;
      const d = 0.6 + s.s * 0.9;
      rect(ctx, s.x - d / 2, s.y - d / 2, d, d, '#fff4dc');
      if (s.s > 1.15) {
        ctx.globalAlpha = 0.35 * s.twinkle;
        rect(ctx, s.x - 2.5, s.y - 0.2, 5, 0.4, '#fff4dc');
        rect(ctx, s.x - 0.2, s.y - 2.5, 0.4, 5, '#fff4dc');
      }
    }
    ctx.globalAlpha = 1;
    drawSearchlights(ctx, f, farShift);
  }
  for (const c of O.clouds) blit(ctx, B.clouds[c.i], c.x, c.y);
  const dF = drawStrip(ctx, B.far, farShift, k);
  if (O.cityLights.length) {
    for (const l of O.cityLights) {
      ctx.globalAlpha = 0.25 + 0.6 * l.a;
      rect(ctx, l.x + dF, l.y, l.s, l.s * 0.8, '#ffd68a');
    }
    ctx.globalAlpha = 1;
  }
  drawStrip(ctx, B.near, nearShift, k);
  for (const c of O.cars) blit(ctx, B.car(c.kind, c.dir), c.x, c.y);
  const fl = O.flyer;
  if (fl) {
    if (fl.kind === 'birds') drawBirds(ctx, fl);
    else if (fl.kind === 'blimp') blit(ctx, B.blimp(fl.dir, fl.label), fl.x, fl.y);
    else if (fl.kind === 'heli') drawHeli(ctx, fl, f.t);
  }
  if (f.wall.cradle) drawCradle(ctx, { ...f.wall.cradle, x: f.wall.cradle.x + dW });
}

// ================================================================== THE WALL
const WALL = {
  lobby: { col: { body: '#141117', hi: '#35303c' } },
  open: { col: { body: '#173b33', hi: '#3d7564' } },
  exec: { col: { body: '#120f13', hi: '#3a3238' } },
};

// marble / lacquer / ebony field for a span of solid wall
function wallField(g, fl, x0, x1, y0, y1, seed) {
  const w = x1 - x0;
  if (fl === 'lobby') {
    // rouge flammé marble upper, black Portoro marble dado
    const gr = g.createLinearGradient(0, y0, 0, 150);
    gr.addColorStop(0, '#5a171c');
    gr.addColorStop(0.5, '#6e1f24');
    gr.addColorStop(1, '#5a181d');
    rect(g, x0, y0, w, 150 - y0, gr);
    mottle(g, x0, y0, w, 150 - y0, seed + 11, '#a8444a', '#3a0c10', 1.4);
    veins(g, x0, y0, w, 150 - y0, seed + 7, '#2a080c', Math.round(w * (150 - y0) / 1800), 1.4, 0.35, 1.0);
    veins(g, x0, y0, w, 150 - y0, seed, '#e2b3a2', Math.round(w * (150 - y0) / 1300), 0.7, 0.45, 1.0);
    // gold-framed panels
    const n = Math.max(1, Math.round(w / 58));
    const pw = w / n;
    g.strokeStyle = rgba(GOLD.mid, 0.75);
    g.lineWidth = 0.7;
    for (let i = 0; i < n; i++) {
      const px = x0 + i * pw;
      g.strokeRect(px + 4.5, y0 + 6.5, pw - 9, 150 - y0 - 13);
      g.strokeStyle = rgba(GOLD.mid, 0.35);
      g.strokeRect(px + 6.5, y0 + 8.5, pw - 13, 150 - y0 - 17);
      g.strokeStyle = rgba(GOLD.mid, 0.75);
    }
    const dg = g.createLinearGradient(0, 150, 0, y1);
    dg.addColorStop(0, '#1d1a1f');
    dg.addColorStop(1, '#0f0d11');
    rect(g, x0, 150, w, y1 - 150, dg);
    veins(g, x0, 150, w, y1 - 150, seed + 3, '#b08a4a', Math.round(w * (y1 - 150) / 1600), 0.5, 0.25, 0.5);
    rect(g, x0, 148.5, w, 3, goldV(g, 148.5, 151.5));
    rect(g, x0, y1 - 6, w, 6, '#0a090c');
    rect(g, x0, y1 - 6, w, 0.8, rgba(GOLD.mid, 0.7));
  } else if (fl === 'open') {
    // ivory lacquer with gold pinstripe pilasters; a black lacquer dado with speed lines
    const gr = g.createLinearGradient(0, y0, 0, 150);
    gr.addColorStop(0, '#d4c6a4');
    gr.addColorStop(0.4, '#e8dcbe');
    gr.addColorStop(1, '#d8caa8');
    rect(g, x0, y0, w, 150 - y0, gr);
    reeds(g, x0, x1, y0, 150);
    const n = Math.max(1, Math.round(w / 52));
    const pw = w / n;
    for (let i = 0; i <= n; i++) {
      const px = x0 + i * pw;
      rect(g, px - 2, y0, 4, 150 - y0, rgba('#b9ab88', 0.35));
      rect(g, px - 1.5, y0, 0.6, 150 - y0, rgba(GOLD.mid, 0.7));
      rect(g, px + 0.9, y0, 0.6, 150 - y0, rgba(GOLD.mid, 0.7));
      sunburst(g, px, y0 + 1, 1, 6, 0, PI, 7, rgba(GOLD.mid, 0.6), null);
    }
    for (let i = 0; i < n; i++) {
      // a stepped arch in low relief at the head of every panel
      const a = x0 + i * pw + 6, b = x0 + (i + 1) * pw - 6, m = (a + b) / 2;
      const yt = y0 + 25;
      g.strokeStyle = rgba('#9a845a', 0.8);
      g.lineWidth = 0.7;
      g.beginPath();
      g.moveTo(a, yt + 10);
      g.lineTo(a, yt + 6);
      g.lineTo(a + 4, yt + 6);
      g.lineTo(a + 4, yt + 3);
      g.lineTo(m - 6, yt + 3);
      g.lineTo(m - 6, yt);
      g.lineTo(m + 6, yt);
      g.lineTo(m + 6, yt + 3);
      g.lineTo(b - 4, yt + 3);
      g.lineTo(b - 4, yt + 6);
      g.lineTo(b, yt + 6);
      g.lineTo(b, yt + 10);
      g.stroke();
      sunburst(g, m, yt + 8, 1.2, 4.6, PI, TAU, 7, rgba(GOLD.mid, 0.6), null);
    }
    dado(g, x0, x1, y1, '#151318');
  } else {
    // macassar ebony panelling: striped figure, gold inlay between panels
    rect(g, x0, y0, w, y1 - y0, '#2e1c13');
    const R = rng(seed);
    for (let x = x0; x < x1; x += 0.8 + R() * 2.2) {
      const dark = R() < 0.5;
      g.globalAlpha = 0.18 + R() * 0.36;
      g.fillStyle = dark ? '#140a06' : '#5a3a22';
      const ww = 0.4 + R() * 1.6;
      g.beginPath();
      g.moveTo(x, y0);
      let xx = x;
      for (let y = y0; y <= y1; y += 8) {
        xx = x + Math.sin(y * 0.03 + seed + x * 0.1) * 1.4;
        g.lineTo(xx, y);
      }
      g.lineTo(xx + ww, y1);
      for (let y = y1; y >= y0; y -= 8) g.lineTo(x + ww + Math.sin(y * 0.03 + seed + x * 0.1) * 1.4, y);
      g.closePath();
      g.fill();
    }
    g.globalAlpha = 1;
    const sheen = g.createLinearGradient(0, y0, 0, y1);
    sheen.addColorStop(0, 'rgba(255,200,140,0.10)');
    sheen.addColorStop(0.35, 'rgba(255,200,140,0)');
    sheen.addColorStop(1, 'rgba(0,0,0,0.35)');
    rect(g, x0, y0, w, y1 - y0, sheen);
    const n = Math.max(1, Math.round(w / 50));
    const pw = w / n;
    for (let i = 0; i <= n; i++) rect(g, x0 + i * pw - 0.5, y0, 1, y1 - y0, rgba(GOLD.mid, 0.6));
    rect(g, x0, 148.5, w, 2.5, goldV(g, 148.5, 151));
    rect(g, x0, y1 - 6, w, 6, '#0d0907');
    rect(g, x0, y1 - 6, w, 0.8, rgba(GOLD.mid, 0.7));
  }
}

function dado(g, x0, x1, y1, base) {
  const w = x1 - x0;
  const dg = g.createLinearGradient(0, 150, 0, y1);
  dg.addColorStop(0, '#24202a');
  dg.addColorStop(0.15, base);
  dg.addColorStop(1, '#0b0a0d');
  rect(g, x0, 150, w, y1 - 150, dg);
  for (const [y, a] of [[158, 0.4], [161, 0.3], [164, 0.2]]) rect(g, x0, y, w, 0.6, rgba(GOLD.mid, a));
  rect(g, x0, 148.5, w, 3, goldV(g, 148.5, 151.5));
  rect(g, x0, y1 - 6, w, 0.8, rgba(GOLD.mid, 0.6));
}

// the cornice / frieze that runs over every bay just under the ceiling
function cornice(g, fl, ua, ub, F) {
  const y = F.ceilingY;
  if (fl === 'lobby') {
    rect(g, ua, y, ub - ua, 8, '#0f0d12');
    rect(g, ua, y, ub - ua, 1.2, goldV(g, y, y + 1.2));
    rect(g, ua, y + 7, ub - ua, 1, rgba(GOLD.mid, 0.8));
    g.strokeStyle = rgba(GOLD.mid, 0.8);
    g.lineWidth = 0.7;
    g.beginPath();
    const u0 = Math.floor(ua / 6) * 6;
    for (let u = u0, j = 0; u <= ub; u += 3, j++) {
      const yy = y + (j % 2 ? 5.6 : 2.4);
      if (j) g.lineTo(u, yy);
      else g.moveTo(u, yy);
    }
    g.stroke();
  } else if (fl === 'open') {
    rect(g, ua, y, ub - ua, 6, '#d2c6a8');
    rect(g, ua, y, ub - ua, 1, '#a8987a');
    rect(g, ua, y + 5, ub - ua, 1, GOLD.mid);
    // chevron frieze in jade and gold
    rect(g, ua, y + 6, ub - ua, 8, JADE.lo);
    g.fillStyle = rgba(GOLD.mid, 0.85);
    const u0 = Math.floor(ua / 12) * 12;
    for (let u = u0; u < ub; u += 12) {
      poly(g, [u, y + 13, u + 6, y + 7.5, u + 12, y + 13, u + 10, y + 13, u + 6, y + 9.6, u + 2, y + 13]);
      g.fill();
    }
    rect(g, ua, y + 13.5, ub - ua, 0.8, GOLD.mid);
    // a band of Lalique 'frozen fountains' in low relief, between gold rules
    rect(g, ua, y + 22.6, ub - ua, 0.6, rgba(GOLD.mid, 0.7));
    g.strokeStyle = rgba('#a08a5e', 0.75);
    g.lineWidth = 0.55;
    g.beginPath();
    const f0 = Math.floor(ua / 24) * 24;
    for (let u = f0; u < ub; u += 24) {
      const fx = u + 12, fy = y + 16;
      g.moveTo(fx, y + 22.4);
      g.lineTo(fx, fy);
      for (const s2 of [-1, 1]) {
        for (const r of [3, 5.5, 8]) {
          g.moveTo(fx, fy);
          g.quadraticCurveTo(fx + s2 * r * 0.7, fy - 1.6, fx + s2 * r, y + 22.4 - (8 - r) * 0.3);
        }
      }
    }
    g.stroke();
  } else {
    rect(g, ua, y, ub - ua, 6, '#0d0a0c');
    rect(g, ua, y, ub - ua, 1, goldV(g, y, y + 1));
    rect(g, ua, y + 5, ub - ua, 1, rgba(GOLD.mid, 0.85));
    g.fillStyle = rgba(GOLD.mid, 0.7);
    const u0 = Math.floor(ua / 10) * 10;
    for (let u = u0; u < ub; u += 10) {
      poly(g, [u + 2, y + 4.4, u + 5, y + 1.8, u + 8, y + 4.4]);
      g.fill();
    }
  }
}

function glassBayStatic(g, fl, F, b, idx) {
  const G = F.glass;
  const x0 = b.u, x1 = b.u1, w = x1 - x0;
  const top = G.top, bot = G.bottom;
  // tint and sheen on the glass itself (the outside shows through)
  g.fillStyle = fl === 'exec' ? 'rgba(40,30,60,0.10)' : 'rgba(200,226,232,0.07)';
  g.fillRect(x0, top, w, bot - top);
  const R = rng(idx * 41 + 9);
  g.save();
  g.beginPath();
  g.rect(x0, top, w, bot - top);
  g.clip();
  for (let i = 0; i < 4; i++) {
    const sx = x0 + R() * w;
    const sw = 6 + R() * 22;
    g.fillStyle = fl === 'exec' ? `rgba(255,200,150,${0.03 + R() * 0.04})` : `rgba(255,255,248,${0.05 + R() * 0.06})`;
    poly(g, [sx, top, sx + sw, top, sx + sw - 70, bot, sx - 70, bot]);
    g.fill();
  }
  g.restore();
  if (fl === 'open') {
    // wall above the ribbon, sill, and a radiator grille in streamline bars below
    wallStrip(g, fl, x0, x1, F.ceilingY + 14, top);
    if (b.blinds > 0) {
      const h = (bot - top) * b.blinds;
      for (let y = top; y < top + h; y += 2.4) {
        rect(g, x0, y, w, 1.8, '#e3d7b8');
        rect(g, x0, y + 1.4, w, 0.4, '#b7a985');
      }
      rect(g, x0, top + h - 1, w, 1.4, '#9a8a66');
      for (const xx of [x0 + w * 0.25, x0 + w * 0.75]) rect(g, xx, top, 0.4, h, rgba('#8a7a5a', 0.6));
    }
    rect(g, x0, bot, w, 3, goldV(g, bot, bot + 3));
    const dg = g.createLinearGradient(0, bot + 3, 0, WALL_BASE);
    dg.addColorStop(0, '#1e1b22');
    dg.addColorStop(1, '#0a090c');
    rect(g, x0, bot + 3, w, WALL_BASE - bot - 3, dg);
    for (let y = bot + 9; y < WALL_BASE - 8; y += 3.2) rect(g, x0 + 6, y, w - 12, 1, rgba(GOLD.mid, 0.16));
    for (let xx = x0 + 6; xx < x1 - 6; xx += 30) rect(g, xx, bot + 8, 0.8, WALL_BASE - bot - 16, rgba(GOLD.mid, 0.25));
    rect(g, x0, WALL_BASE - 6, w, 0.8, rgba(GOLD.mid, 0.6));
  } else if (fl === 'exec') {
    rect(g, x0, bot, w, WALL_BASE - bot, '#0d0a0b');
    rect(g, x0, bot, w, 1, goldV(g, bot, bot + 1));
  }
  // frame and mullions: black lacquer with a gold edge
  const mull = (x, wd) => {
    rect(g, x - wd / 2, top, wd, bot - top, '#121014');
    rect(g, x - wd / 2, top, 0.5, bot - top, rgba(GOLD.hi, 0.6));
  };
  const step = G.mullion;
  const n = Math.max(1, Math.round(w / step));
  for (let i = 1; i < n; i++) mull(x0 + (w * i) / n, fl === 'exec' ? 1.6 : 2);
  rect(g, x0, top - 1, w, 2.5, '#121014');
  rect(g, x0, top + 1, w, 0.5, rgba(GOLD.mid, 0.7));
  rect(g, x0, bot - 2, w, 2, '#121014');
  rect(g, x0, bot - 2, w, 0.5, rgba(GOLD.mid, 0.7));
  if (G.transom) {
    rect(g, x0, G.transom - 1.5, w, 3, '#121014');
    rect(g, x0, G.transom - 1.5, w, 0.6, rgba(GOLD.hi, 0.7));
    // the clerestory: a sunburst grille in each pane above the transom
    for (let i = 0; i < n; i++) {
      const px0 = x0 + (w * i) / n, px1 = x0 + (w * (i + 1)) / n;
      const pcx = (px0 + px1) / 2;
      g.save();
      g.beginPath();
      g.rect(px0, top, px1 - px0, G.transom - top);
      g.clip();
      g.strokeStyle = 'rgba(18,16,20,0.7)';
      g.lineWidth = 0.6;
      g.beginPath();
      for (let r = 0; r < 7; r++) {
        const a = PI + (r + 0.5) * (PI / 7);
        g.moveTo(pcx, G.transom - 1.5);
        g.lineTo(pcx + Math.cos(a) * 80, G.transom - 1.5 + Math.sin(a) * 80);
      }
      g.stroke();
      g.strokeStyle = rgba(GOLD.mid, 0.85);
      g.lineWidth = 0.8;
      g.beginPath();
      g.arc(pcx, G.transom - 1.5, (px1 - px0) * 0.36, PI, TAU);
      g.stroke();
      g.beginPath();
      g.arc(pcx, G.transom - 1.5, (px1 - px0) * 0.16, PI, TAU);
      g.stroke();
      g.restore();
    }
  }
  if (b.revolvingDoor != null) revolvingStatic(g, b.revolvingDoor, F);
}

// a band of the floor's wall material in a glass bay (above the open plan's ribbon)
function wallStrip(g, fl, x0, x1, y0, y1) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, '#d4c6a4');
  gr.addColorStop(1, '#e4d8b8');
  rect(g, x0, y0, x1 - x0, y1 - y0, gr);
  reeds(g, x0, x1, y0, y1);
}

// reeded plaster: a fine vertical flute, light on the left of each reed
function reeds(g, x0, x1, y0, y1) {
  for (let x = Math.ceil(x0 / 2.4) * 2.4; x < x1; x += 2.4) {
    rect(g, x, y0, 0.8, y1 - y0, 'rgba(255,250,235,0.18)');
    rect(g, x + 1.4, y0, 0.7, y1 - y0, 'rgba(120,100,70,0.12)');
  }
}

function column(g, fl, x, w, F) {
  const C = WALL[fl].col;
  const y0 = F.ceilingY, y1 = WALL_BASE;
  rect(g, x, y0, w, y1 - y0, lacquerH(g, x, x + w, C.body, C.hi));
  // flutes
  const n = w >= 16 ? 4 : 3;
  const fw = (w - 4) / n;
  for (let i = 0; i < n; i++) {
    const fx = x + 2 + i * fw;
    const fg = g.createLinearGradient(fx, 0, fx + fw, 0);
    fg.addColorStop(0, rgba('#000000', 0.45));
    fg.addColorStop(0.4, rgba(C.hi, 0.6));
    fg.addColorStop(1, rgba('#000000', 0.2));
    rect(g, fx + 0.3, y0 + 14, fw - 0.6, y1 - y0 - 24, fg);
  }
  // gold capital: stepped, with a little fan
  const cy = y0 + (fl === 'lobby' ? 8 : fl === 'open' ? 14 : 6);
  rect(g, x - 2, cy, w + 4, 2, goldV(g, cy, cy + 2));
  rect(g, x - 1, cy + 2, w + 2, 2, goldV(g, cy + 2, cy + 4, 0.15));
  rect(g, x, cy + 4, w, 1.6, goldV(g, cy + 4, cy + 5.6, 0.3));
  sunburst(g, x + w / 2, cy + 10, 1, 5, PI, TAU, 7, rgba(GOLD.mid, 0.9), null);
  // base
  rect(g, x - 2, y1 - 3, w + 4, 3, goldV(g, y1 - 3, y1, 0.2));
  rect(g, x - 1, y1 - 5, w + 2, 2, goldV(g, y1 - 5, y1 - 3, 0.35));
}

// --- lifts ---------------------------------------------------------------------------
const LIFTS = {
  lobby: { wood: '#3e2416', woodLo: '#26150c', ray: '#7a4f2c', line: GOLD.mid, hub: GOLD.mid, frame: 'gold' },
  open: { wood: '#18161b', woodLo: '#0c0b0e', ray: '#3b3d44', line: SILVER.mid, hub: SILVER.hi, frame: 'silver' },
  exec: { wood: '#1a120e', woodLo: '#0c0806', ray: '#3a2a1c', line: GOLD.mid, hub: JADE.mid, frame: 'gold' },
};

// one leaf, local box 0..w2 x 0..h; side 1 = left leaf (its inner edge on the right)
function leafPaint(g, fl, w2, h, side) {
  const L = LIFTS[fl];
  g.save();
  if (side < 0) {
    g.translate(w2, 0);
    g.scale(-1, 1);
  }
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, L.wood);
  gr.addColorStop(1, L.woodLo);
  rect(g, 0, 0, w2, h, gr);
  // nested chevrons above, rising to the seam
  g.save();
  g.beginPath();
  g.rect(1.2, 2, w2 - 1.2, h * 0.46);
  g.clip();
  g.strokeStyle = rgba(L.line, 0.55);
  g.lineWidth = 0.6;
  g.beginPath();
  for (let y = 4; y < h * 0.5 + w2; y += 4) {
    g.moveTo(w2, y);
    g.lineTo(0, y + w2 * 0.8);
  }
  g.stroke();
  g.restore();
  // the half sunburst rising from the foot of the seam: marquetry rays and gold rings
  const cy = h - 4;
  const R1 = Math.min(h * 0.44, w2 * 1.75);
  g.save();
  g.beginPath();
  g.rect(1.2, h * 0.5, w2 - 1.2, h * 0.5);
  g.clip();
  sunburst(g, w2, cy, 3, R1, PI, PI * 1.5, 9, L.ray, null);
  g.strokeStyle = rgba(L.line, 0.85);
  g.lineWidth = 0.6;
  for (const r of [R1, R1 * 0.62]) {
    g.beginPath();
    g.arc(w2, cy, r, PI, PI * 1.5);
    g.stroke();
  }
  g.restore();
  g.fillStyle = L.hub;
  g.beginPath();
  g.arc(w2, cy, 3.2, PI, PI * 1.5);
  g.lineTo(w2, cy);
  g.closePath();
  g.fill();
  rect(g, 0, h - 4, w2, 4, L.frame === 'gold' ? goldV(g, h - 4, h, 0.25) : mixc(SILVER.lo, INK, 0.2));
  rect(g, 0.6, 0.6, w2 - 1.2, 0.5, rgba(L.line, 0.6));
  rect(g, 0.6, 0.6, 0.5, h - 4.6, rgba(L.line, 0.6));
  rect(g, w2 - 0.4, 0, 0.4, h, rgba('#000000', 0.6));
  g.restore();
}

function carPaint(g, fl, w, h) {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#f0c470');
  gr.addColorStop(0.3, '#b07434');
  gr.addColorStop(0.7, '#5e3416');
  gr.addColorStop(1, '#2e180a');
  rect(g, 0, 0, w, h, gr);
  rect(g, 0, 0, w, 3, '#ffe8b0');
  rect(g, w * 0.2, 9, w * 0.6, h * 0.5, rgba('#ffe2a8', 0.12));
  g.strokeStyle = rgba(GOLD.lo, 0.6);
  g.lineWidth = 0.6;
  g.strokeRect(w * 0.2, 9, w * 0.6, h * 0.5);
  rect(g, 2, h * 0.6, w - 4, 1.2, GOLD.mid);
  rect(g, 0, h - 6, w, 6, '#3a2010');
}

function liftStatic(g, fl, h) {
  const x = h.x, y = h.y, w = h.w, ht = h.h;
  const cx = x + w / 2;
  const L = LIFTS[fl];
  const fr = (y0, y1) => (L.frame === 'gold' ? goldV(g, y0, y1) : (() => {
    const s = g.createLinearGradient(0, y0, 0, y1);
    s.addColorStop(0, SILVER.lo);
    s.addColorStop(0.3, SILVER.hi);
    s.addColorStop(1, SILVER.dk);
    return s;
  })());
  // the transom panel with the dial, and a stepped crown above it
  const py = y - 22;
  rect(g, x - 2.5, py - 6, w + 5, 3, fr(py - 6, py - 3));
  rect(g, x + 4, py - 9, w - 8, 3, fr(py - 9, py - 6));
  sunburst(g, cx, py - 9, 1, 6, PI, TAU, 9, L.frame === 'gold' ? GOLD.mid : SILVER.mid, null);
  rect(g, x - 2.5, py - 3, w + 5, 22, LAQ);
  rect(g, x - 2.5, py - 3, w + 5, 22, lacquerV(g, py - 3, py + 19));
  // dial face
  const dy = y - 8;
  g.fillStyle = CREAM;
  g.beginPath();
  g.arc(cx, dy, 9.5, PI, TAU);
  g.closePath();
  g.fill();
  sunburst(g, cx, dy, 2, 9.5, PI, TAU, 10, rgba(GOLD.mid, 0.25), null);
  g.strokeStyle = L.frame === 'gold' ? GOLD.mid : SILVER.mid;
  g.lineWidth = 1.2;
  g.beginPath();
  g.arc(cx, dy, 9.8, PI, TAU);
  g.stroke();
  g.strokeStyle = INK;
  g.lineWidth = 0.5;
  g.beginPath();
  for (let i = 0; i <= 8; i++) {
    const a = PI + (i / 8) * PI;
    g.moveTo(cx + Math.cos(a) * 9, dy + Math.sin(a) * 9);
    g.lineTo(cx + Math.cos(a) * (i % 4 === 0 ? 6.4 : 7.6), dy + Math.sin(a) * (i % 4 === 0 ? 6.4 : 7.6));
  }
  g.stroke();
  decoText(g, h.label, cx, dy + 1.4, 3.6, { color: L.frame === 'gold' ? GOLD.hi : SILVER.hi, lw: 0.6, track: 1.8 });
  // the door surround
  rect(g, x - 2.5, y - 3, w + 5, ht + 3, fr(y - 3, y + ht));
  rect(g, x - 1, y - 1.5, w + 2, ht + 1.5, INK);
  // closed doors, baked; the live pass draws them opening
  g.save();
  g.translate(x, y);
  leafPaint(g, fl, w / 2, ht, 1);
  g.translate(w / 2, 0);
  leafPaint(g, fl, w / 2, ht, -1);
  g.restore();
}

// needle position along the dial (0 = left end, 1 = right end): home is this floor; while
// the doors are shut the car is away and the needle swings in from, then out to, another
// floor (the lift's own 7 s cycle, the same one plan.js opens the doors on).
const DIAL_HOME = { lobby: 0.02, open: 0.27, exec: 0.88 };
function needleAt(fl, h, t) {
  const home = DIAL_HOME[fl];
  if (h.open > 0) return home;
  const away = fl === 'lobby' ? 0.45 + hash(h.i + 3) * 0.5 : fl === 'exec' ? 0.15 + hash(h.i + 5) * 0.4 : (hash(h.i + 7) < 0.5 ? 0.85 : 0.04);
  const c = mod(t + h.i * 2.3, 7);
  if (c < 3) return away + (home - away) * smooth(c / 3);
  if (c >= 6) return home + (away - home) * smooth(c - 6);
  return home;
}

function liftLive(ctx, B, fl, h, t) {
  const x = h.x, y = h.y, w = h.w, ht = h.h;
  if (h.open > 0) {
    const S = B.liftParts(w, ht);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, ht);
    ctx.clip();
    blit(ctx, S.car, x, y);
    const gap = smooth(h.open) * w / 2;
    blit(ctx, S.leafL, x - gap, y);
    blit(ctx, S.leafR, x + w / 2 + gap, y);
    ctx.restore();
    // arrival lamp
    disc(ctx, x + w + 4.5, y - 14, 1.3, '#ffcf6a');
    disc(ctx, x + w + 4.5, y - 14, 3.2, 'rgba(255,200,100,0.25)');
  }
  const p = needleAt(fl, h, t);
  const a = PI + p * PI;
  const cx = x + w / 2, dy = y - 8;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - Math.cos(a) * 1.5, dy - Math.sin(a) * 1.5);
  ctx.lineTo(cx + Math.cos(a) * 8.2, dy + Math.sin(a) * 8.2);
  ctx.stroke();
  disc(ctx, cx, dy, 1.3, LIFTS[fl].frame === 'gold' ? GOLD.mid : SILVER.mid);
}

// --- revolving door ----------------------------------------------------------------
const REV_R = 21;
const REV_RY = 3.6;
function revolvingStatic(g, cx, F) {
  const t0 = F.glass.transom + 2;
  const y1 = F.glass.bottom - 1;
  const R = REV_R;
  // the drum: smoked glass, curved walls left and right, a brass floor ring
  g.fillStyle = 'rgba(24,30,36,0.24)';
  g.fillRect(cx - R, t0 + 9, R * 2, y1 - t0 - 9);
  for (const s of [-1, 1]) {
    const wg = g.createLinearGradient(cx + s * R, 0, cx + s * R * 0.55, 0);
    wg.addColorStop(0, 'rgba(230,240,240,0.22)');
    wg.addColorStop(1, 'rgba(230,240,240,0)');
    g.fillStyle = wg;
    g.fillRect(Math.min(cx + s * R, cx + s * R * 0.55), t0 + 9, R * 0.45, y1 - t0 - 9);
  }
  g.fillStyle = goldV(g, y1 - REV_RY, y1 + REV_RY, 0.3);
  g.beginPath();
  g.ellipse(cx, y1, R + 1.5, REV_RY, 0, 0, TAU);
  g.fill();
  rect(g, cx - R - 2, t0 + 8, 2, y1 - t0 - 8, goldH(g, cx - R - 2, cx - R));
  rect(g, cx + R, t0 + 8, 2, y1 - t0 - 8, goldH(g, cx + R, cx + R + 2));
  // the canopy: a brass drum top with a lacquer speed band, its rim an ellipse
  g.fillStyle = goldV(g, t0, t0 + 11);
  g.beginPath();
  g.moveTo(cx - R - 4, t0);
  g.lineTo(cx + R + 4, t0);
  g.lineTo(cx + R + 4, t0 + 8);
  g.ellipse(cx, t0 + 8, R + 4, REV_RY, 0, 0, PI);
  g.closePath();
  g.fill();
  rect(g, cx - R - 4, t0 + 2.6, R * 2 + 8, 2.6, LAQ);
  for (let xx = -R; xx <= R; xx += 6) rect(g, cx + xx - 0.3, t0 + 2.6, 0.6, 2.6, GOLD.hi);
  sunburst(g, cx, t0, 1, 8, PI, TAU, 9, goldV(g, t0 - 8, t0), null);
}

function revolvingLive(ctx, cx, F, rev) {
  const t0 = F.glass.transom + 2 + 9;
  const y1 = F.glass.bottom - 1;
  const R = REV_R;
  const wings = [];
  for (let j = 0; j < 4; j++) {
    const a = rev * PI + (j * PI) / 2;
    wings.push({ c: Math.cos(a), s: Math.sin(a) });
  }
  wings.sort((p, q) => p.s - q.s);
  const mid = (t0 + y1) / 2 + 6;
  for (const wg of wings) {
    const ex = cx + wg.c * R;
    const oy = wg.s * REV_RY;
    const front = wg.s > 0;
    ctx.fillStyle = front ? `rgba(225,236,236,${0.16 + 0.16 * Math.abs(wg.c)})` : `rgba(20,26,30,${0.24 + 0.12 * Math.abs(wg.c)})`;
    ctx.beginPath();
    ctx.moveTo(cx, t0);
    ctx.lineTo(ex, t0 + oy);
    ctx.lineTo(ex, y1 + oy);
    ctx.lineTo(cx, y1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = front ? GOLD.mid : rgba(GOLD.lo, 0.8);
    ctx.lineWidth = front ? 1.2 : 0.7;
    ctx.stroke();
    line(ctx, cx + wg.c * R * 0.2, mid + oy * 0.2, cx + wg.c * R * 0.85, mid + oy * 0.85, front ? GOLD.hi : GOLD.lo, front ? 1 : 0.6);
  }
  rect(ctx, cx - 0.9, t0, 1.8, y1 - t0, goldH(ctx, cx - 0.9, cx + 0.9));
}

// --- hangs: logo, clocks, posters, boards, doors, art -----------------------------
function logo(g, h) {
  const x = h.x, y = h.y, w = h.w, ht = h.h;
  const cx = x + w / 2;
  // stepped black cartouche
  const pts = [x, y + 10, x + 26, y + 10, x + 26, y + 5, x + 48, y + 5, x + 48, y, x + w - 48, y, x + w - 48, y + 5, x + w - 26, y + 5, x + w - 26, y + 10, x + w, y + 10, x + w, y + ht, x, y + ht];
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.save();
  g.translate(1.5, 2);
  poly(g, pts);
  g.fill();
  g.restore();
  poly(g, pts);
  g.fillStyle = lacquerV(g, y, y + ht, '#141116', '#3a3440');
  g.fill();
  g.strokeStyle = goldV(g, y, y + ht);
  g.lineWidth = 1.4;
  g.stroke();
  // sunburst rising behind the egg
  g.save();
  poly(g, pts);
  g.clip();
  const sy = y + 38;
  sunburst(g, cx, sy, 10, 44, PI, TAU, 22, goldV(g, y, sy, 0.05), null);
  g.restore();
  // streamline wings either side of the egg
  for (const [yy, a] of [[y + 20, 0.9], [y + 24, 0.75], [y + 28, 0.6]]) {
    rect(g, x + 6, yy, 30 - (yy - y - 20) * 2, 1.1, rgba(GOLD.hi, a));
    rect(g, x + w - 36 + (yy - y - 20) * 2, yy, 30 - (yy - y - 20) * 2, 1.1, rgba(GOLD.hi, a));
  }
  // the egg
  g.fillStyle = INK;
  g.beginPath();
  g.ellipse(cx, y + 24, 10.5, 13, 0, 0, TAU);
  g.fill();
  const eg = g.createRadialGradient(cx - 3, y + 18, 1, cx, y + 24, 13);
  eg.addColorStop(0, GOLD.hi);
  eg.addColorStop(0.55, GOLD.mid);
  eg.addColorStop(1, GOLD.lo);
  g.fillStyle = eg;
  g.beginPath();
  g.ellipse(cx, y + 24, 8.6, 11, 0, 0, TAU);
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 0.7;
  g.beginPath();
  g.ellipse(cx, y + 24, 6.4, 8.6, 0, 0, TAU);
  g.stroke();
  g.fillStyle = 'rgba(255,255,240,0.6)';
  g.beginPath();
  g.ellipse(cx - 3.2, y + 18.5, 1.4, 3.2, -0.4, 0, TAU);
  g.fill();
  // the name band
  rect(g, x + 6, y + 39, w - 12, 15, INK);
  rect(g, x + 6, y + 39, w - 12, 0.8, GOLD.mid);
  rect(g, x + 6, y + 53.2, w - 12, 0.8, GOLD.mid);
  decoText(g, h.label, cx, y + 41.5, 10, { color: goldV(g, y + 41, y + 52), lw: 1.9, track: 4.2, inline: INK, inlineW: 0.3, shadow: 'rgba(0,0,0,0.6)' });
}

function clockFace(g, fl, cx, cy, r) {
  sunburst(g, cx, cy, r, r * 1.55, 0, TAU, 24, goldV(g, cy - r * 1.6, cy + r * 1.6), null);
  disc(g, cx, cy, r + 1.2, goldV(g, cy - r, cy + r));
  disc(g, cx, cy, r, fl === 'exec' ? '#1a1416' : CREAM);
  const mark = fl === 'exec' ? GOLD.mid : INK;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const r0 = i % 3 === 0 ? r * 0.62 : r * 0.78;
    line(g, cx + Math.sin(a) * r0, cy - Math.cos(a) * r0, cx + Math.sin(a) * r * 0.9, cy - Math.cos(a) * r * 0.9, mark, i % 3 === 0 ? 1 : 0.5);
  }
}

function clockHands(ctx, f, fl, cx, cy, r) {
  const col = fl === 'exec' ? GOLD.hi : INK;
  const hand = (a, l, w) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    const sx = Math.sin(a), sy = -Math.cos(a);
    ctx.moveTo(cx - sx * 1.2, cy - sy * 1.2);
    ctx.lineTo(cx + sy * w + sx * l * 0.3, cy - sx * w + sy * l * 0.3);
    ctx.lineTo(cx + sx * l, cy + sy * l);
    ctx.lineTo(cx - sy * w + sx * l * 0.3, cy + sx * w + sy * l * 0.3);
    ctx.closePath();
    ctx.fill();
  };
  hand(f.clock.hourA, r * 0.55, 1.1);
  hand(f.clock.minuteA, r * 0.85, 0.8);
  line(ctx, cx, cy, cx + Math.sin(f.clock.secondA) * r * 0.88, cy - Math.cos(f.clock.secondA) * r * 0.88, OX.hi, 0.4);
  disc(ctx, cx, cy, 0.9, GOLD.mid);
}

function giltFrame(g, x, y, w, h, b = 3) {
  rect(g, x - 1, y - 1, w + 2, h + 2, 'rgba(0,0,0,0.4)');
  g.fillStyle = goldV(g, y, y + h);
  g.fillRect(x, y, w, h);
  g.strokeStyle = GOLD.lo;
  g.lineWidth = 0.5;
  g.strokeRect(x + b - 0.5, y + b - 0.5, w - 2 * b + 1, h - 2 * b + 1);
  g.strokeStyle = rgba(GOLD.hi, 0.9);
  g.strokeRect(x + 0.8, y + 0.8, w - 1.6, h - 1.6);
}

function poster(g, h) {
  const x = h.x, y = h.y, w = h.w, ht = h.h;
  giltFrame(g, x - 2, y - 2, w + 4, ht + 4, 2);
  g.save();
  g.beginPath();
  g.rect(x, y, w, ht);
  g.clip();
  const ty = y + ht - 9;
  if (h.label === 'SYNERGY') {
    // Cassandre's liner: the black hull towering head-on over the water, gulls
    const sg = g.createLinearGradient(0, y, 0, y + ht);
    sg.addColorStop(0, '#86afc4');
    sg.addColorStop(1, '#efe0bc');
    rect(g, x, y, w, ht, sg);
    const dk = y + 12;
    rect(g, x + 5, dk - 6, w - 10, 6, CREAM);
    rect(g, x + 8, dk - 9, 4, 4, OX.mid);
    rect(g, x + 13, dk - 10, 4, 5, OX.mid);
    rect(g, x + 18, dk - 9, 4, 4, OX.mid);
    rect(g, x + 8, dk - 9, 4, 1, INK);
    rect(g, x + 13, dk - 10, 4, 1, INK);
    rect(g, x + 18, dk - 9, 4, 1, INK);
    g.fillStyle = INK;
    g.beginPath();
    g.moveTo(x - 1, dk);
    g.lineTo(x + w + 1, dk);
    g.quadraticCurveTo(x + w * 0.6, dk + 4, x + w * 0.55, ty - 3);
    g.lineTo(x + w * 0.45, ty - 3);
    g.quadraticCurveTo(x + w * 0.4, dk + 4, x - 1, dk);
    g.closePath();
    g.fill();
    g.save();
    g.clip();
    rect(g, x, ty - 7, w, 2.6, OX.mid);
    g.restore();
    line(g, x + w / 2, dk, x + w / 2, ty - 3, '#4a4a56', 0.5);
    disc(g, x + w / 2 - 3, dk + 3, 0.7, SILVER.mid);
    disc(g, x + w / 2 + 3, dk + 3, 0.7, SILVER.mid);
    rect(g, x, ty - 3, w, 3, '#2c5670');
    rect(g, x + w * 0.38, ty - 3.2, w * 0.24, 0.8, CREAM);
    g.strokeStyle = INK;
    g.lineWidth = 0.45;
    g.beginPath();
    for (const [gx, gy] of [[4, 4], [24, 2.6], [20, 5.6]]) {
      g.moveTo(x + gx - 1.6, y + gy);
      g.quadraticCurveTo(x + gx - 0.8, y + gy - 1, x + gx, y + gy);
      g.quadraticCurveTo(x + gx + 0.8, y + gy - 1, x + gx + 1.6, y + gy);
    }
    g.stroke();
  } else if (h.label === 'HANG IN THERE') {
    sunburst(g, x + w / 2, ty, 0, ht * 1.2, PI, TAU, 16, GOLD.mid, '#e9d9a8');
    line(g, x - 2, y + 9, x + w + 2, y + 5, '#2a1c14', 2.2);
    // the kitten: a black deco silhouette hanging by its front paws
    const kx = x + w * 0.52, ky = y + 8;
    g.fillStyle = INK;
    line(g, kx - 2, ky - 1, kx - 1.5, ky + 6, INK, 1.2);
    line(g, kx + 2, ky - 1.4, kx + 1.5, ky + 6, INK, 1.2);
    g.beginPath();
    g.ellipse(kx, ky + 9, 3.6, 5, 0, 0, TAU);
    g.fill();
    g.beginPath();
    g.arc(kx, ky + 3.4, 3, 0, TAU);
    g.fill();
    poly(g, [kx - 2.8, ky + 2.2, kx - 2.2, ky - 0.6, kx - 0.8, ky + 1.2]);
    g.fill();
    poly(g, [kx + 2.8, ky + 2.2, kx + 2.2, ky - 0.6, kx + 0.8, ky + 1.2]);
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(kx + 2, ky + 12.5);
    g.quadraticCurveTo(kx + 7, ky + 16, kx + 4, ky + 20);
    g.stroke();
    rect(g, kx - 1.6, ky + 3, 0.9, 0.6, GOLD.hi);
    rect(g, kx + 0.7, ky + 3, 0.9, 0.6, GOLD.hi);
  } else {
    // TEAMWORK: three machine-age gears turning together
    rect(g, x, y, w, ht, '#d9cba4');
    const gear = (gx, gy, r, n, c) => {
      g.fillStyle = c;
      g.beginPath();
      for (let i = 0; i < n * 2; i++) {
        const a = (i / (n * 2)) * TAU;
        const rr2 = i % 2 ? r : r * 1.28;
        const a0 = a - PI / (n * 2) * 0.6, a1 = a + PI / (n * 2) * 0.6;
        g.lineTo(gx + Math.cos(a0) * rr2, gy + Math.sin(a0) * rr2);
        g.lineTo(gx + Math.cos(a1) * rr2, gy + Math.sin(a1) * rr2);
      }
      g.closePath();
      g.fill();
      disc(g, gx, gy, r * 0.35, '#d9cba4');
    };
    gear(x + 10, y + 12, 6, 8, OX.mid);
    gear(x + 22, y + 17, 5, 7, INK);
    gear(x + 12, y + 25, 4.4, 6, JADE.lo);
  }
  rect(g, x, ty, w, 9, INK);
  g.restore();
  if (h.label === 'HANG IN THERE') {
    decoText(g, 'HANG IN', x + w / 2, ty + 1.2, 3, { color: CREAM, lw: 0.55, track: 1.6 });
    decoText(g, 'THERE', x + w / 2, ty + 5.2, 3, { color: GOLD.hi, lw: 0.55, track: 1.6 });
  } else {
    decoText(g, h.label, x + w / 2, ty + 2.3, 4.2, { color: h.label === 'SYNERGY' ? CREAM : GOLD.hi, lw: 0.7, track: h.label === 'TEAMWORK' ? 1.4 : 2 });
  }
}

function whiteboard(g, h) {
  const x = h.x, y = h.y, w = h.w, ht = h.h;
  rect(g, x - 2.5, y - 2.5, w + 5, ht + 5, SILVER.lo);
  rect(g, x - 2.5, y - 2.5, w + 5, 1, SILVER.hi);
  const bg = g.createLinearGradient(x, y, x + w, y + ht);
  bg.addColorStop(0, '#f2ead6');
  bg.addColorStop(1, '#d9ceb4');
  rect(g, x, y, w, ht, bg);
  // the rising chart, scrawled in oxblood, jade bars
  for (let i = 0; i < 6; i++) rect(g, x + 10 + i * 12, y + ht - 8 - (6 + i * 5.5), 6, 6 + i * 5.5, rgba(JADE.mid, 0.55));
  g.strokeStyle = OX.mid;
  g.lineWidth = 1.1;
  g.lineJoin = 'round';
  g.beginPath();
  const pts = [[8, 40], [20, 34], [30, 37], [44, 26], [56, 28], [70, 14], [82, 8]];
  pts.forEach(([px, py], i) => (i ? g.lineTo(x + px, y + py) : g.moveTo(x + px, y + py)));
  g.stroke();
  g.fillStyle = OX.mid;
  poly(g, [x + 85, y + 5, x + 79, y + 6.5, x + 83, y + 10.5]);
  g.fill();
  line(g, x + 6, y + ht - 7.5, x + w - 6, y + ht - 7.5, INK, 0.6);
  line(g, x + 6, y + 6, x + 6, y + ht - 7.5, INK, 0.6);
  rect(g, x + 4, y + ht + 2.5, w - 8, 2.5, SILVER.mid);
  [OX.mid, JADE.mid, INK].forEach((c, i) => rect(g, x + 12 + i * 9, y + ht + 1.4, 6, 1.4, c));
}

function painting(g, h) {
  const x = h.x, y = h.y, w = h.w, ht = h.h;
  giltFrame(g, x - 3, y - 3, w + 6, ht + 6, 2.5);
  g.save();
  g.beginPath();
  g.rect(x, y, w, ht);
  g.clip();
  if (h.variant === 1) {
    // a city view: one setback tower against a blue poster sky, a gold sun
    const sg = g.createLinearGradient(0, y, 0, y + ht);
    sg.addColorStop(0, '#5f8fae');
    sg.addColorStop(1, '#e6d4a8');
    rect(g, x, y, w, ht, sg);
    sunburst(g, x + w * 0.5, y + ht * 0.62, 2, ht, PI, TAU, 14, 'rgba(255,240,200,0.22)', null);
    g.fillStyle = '#b9b2a0';
    rect(g, x + 2, y + ht * 0.55, 8, ht * 0.45, '#9aa3a8');
    rect(g, x + w - 10, y + ht * 0.48, 9, ht * 0.52, '#9aa3a8');
    const tx = x + w / 2;
    for (const [hw, ty0] of [[8, 0.3], [6, 0.2], [4, 0.12], [2.2, 0.06]]) rect(g, tx - hw, y + ht * ty0, hw * 2, ht, CREAM);
    rect(g, tx - 0.4, y + 0.5, 0.8, ht * 0.06, CREAM);
    rect(g, tx - 8, y + ht * 0.3, 3, ht, '#d6c69a');
    for (let yy = y + ht * 0.34; yy < y + ht; yy += 2.4) rect(g, tx - 6, yy, 12, 0.6, rgba('#7a6e58', 0.5));
  } else {
    // abstract: Delaunay discs and a Cassandre diagonal
    rect(g, x, y, w, ht, '#1a1418');
    const cx = x + w * 0.36, cy = y + ht * 0.56;
    [[20, OX.mid], [15, CREAM], [11, JADE.mid], [7, GOLD.mid], [3.5, INK]].forEach(([r, c]) => disc(g, cx, cy, r, c));
    g.fillStyle = rgba(GOLD.hi, 0.85);
    poly(g, [x + w * 0.55, y, x + w * 0.66, y, x + w * 0.45, y + ht, x + w * 0.34, y + ht]);
    g.fill();
    g.fillStyle = OX.lo;
    poly(g, [x + w * 0.66, y, x + w, y, x + w, y + ht * 0.45]);
    g.fill();
    sunburst(g, x + w, y + ht, 2, 26, PI, PI * 1.5, 8, SILVER.mid, null);
  }
  g.restore();
}

function steppedSurround(g, x, y, w, ht, col) {
  rect(g, x - 3, y - 3, w + 6, ht + 3, col);
  rect(g, x + 1, y - 6, w - 2, 3, col);
  rect(g, x + 6, y - 8.5, w - 12, 2.5, col);
}

function door(g, fl, h) {
  const x = h.x, y = h.y, w = h.w, ht = h.h;
  steppedSurround(g, x, y, w, ht, goldV(g, y - 9, y + ht));
  if (h.label === 'CEO') {
    // tufted oxblood leather with a gold nailhead grid
    rect(g, x, y, w, ht, lacquerV(g, y, y + ht, OX.lo, OX.mid));
    g.fillStyle = rgba(GOLD.hi, 0.55);
    for (let yy = y + 5; yy < y + ht - 4; yy += 6) {
      for (let xx = x + 4 + ((yy - y) % 12 ? 3 : 0); xx < x + w - 3; xx += 6) {
        g.fillRect(xx - 0.4, yy - 0.4, 0.8, 0.8);
      }
    }
    rect(g, x + w / 2 - 0.4, y, 0.8, ht, rgba('#000000', 0.5));
    rect(g, x + w / 2 - 8, y + 16, 16, 7, INK);
    g.strokeStyle = GOLD.mid;
    g.lineWidth = 0.5;
    g.strokeRect(x + w / 2 - 7.5, y + 16.5, 15, 6);
    decoText(g, 'CEO', x + w / 2, y + 17.6, 3.8, { color: GOLD.hi, lw: 0.6, track: 2 });
    rect(g, x + w / 2 - 4, y + ht * 0.55, 1.5, 6, GOLD.mid);
    rect(g, x + w / 2 + 2.5, y + ht * 0.55, 1.5, 6, GOLD.mid);
    return;
  }
  // MEETING 4B: jade lacquer, a gold sunburst over the panel, the plate, the IN USE lamp
  rect(g, x, y, w, ht, lacquerV(g, y, y + ht, JADE.lo, JADE.mid));
  g.save();
  g.beginPath();
  g.rect(x + 3, y + 3, w - 6, ht * 0.45);
  g.clip();
  sunburst(g, x + w / 2, y + ht * 0.45 + 3, 3, ht * 0.5, PI, TAU, 14, rgba(GOLD.mid, 0.55), null);
  g.restore();
  g.strokeStyle = rgba(GOLD.mid, 0.8);
  g.lineWidth = 0.6;
  g.strokeRect(x + 3, y + 3, w - 6, ht * 0.45);
  g.strokeRect(x + 3, y + ht * 0.45 + 6, w - 6, ht * 0.5 - 9);
  rect(g, x + 3, y + ht * 0.62, w - 6, 11, INK);
  g.strokeStyle = GOLD.mid;
  g.strokeRect(x + 3.5, y + ht * 0.62 + 0.5, w - 7, 10);
  decoText(g, 'MEETING', x + w / 2, y + ht * 0.62 + 1.6, 3.4, { color: GOLD.hi, lw: 0.55, track: 1.5 });
  decoText(g, '4B', x + w / 2, y + ht * 0.62 + 6, 3.4, { color: GOLD.hi, lw: 0.55, track: 1.5 });
  disc(g, x + w - 6, y + ht * 0.55, 1.4, GOLD.mid);
  // IN USE lamp over the door
  rect(g, x + w / 2 - 11, y - 17, 22, 7, INK);
  rect(g, x + w / 2 - 10, y - 16, 20, 5, '#c8323a');
  const lg = g.createRadialGradient(x + w / 2, y - 13, 1, x + w / 2, y - 13, 16);
  lg.addColorStop(0, 'rgba(255,80,80,0.35)');
  lg.addColorStop(1, 'rgba(255,80,80,0)');
  rect(g, x + w / 2 - 16, y - 29, 32, 32, lg);
  decoText(g, 'IN USE', x + w / 2, y - 14.95, 2.9, { color: '#ffe8d8', lw: 0.5, track: 1.5 });
}

function extinguisher(g, h) {
  const x = h.x, y = h.y, w = h.w, ht = h.h;
  rect(g, x - 1, y + 3, w + 2, 2, GOLD.lo);
  g.fillStyle = '#8a1e24';
  rr(g, x, y + 3, w, ht - 3, 2.5);
  g.fill();
  rect(g, x + 1, y + 4, 1.4, ht - 6, 'rgba(255,170,160,0.35)');
  rect(g, x + 1.5, y, w - 3, 3.5, GOLD.mid);
  line(g, x + w - 1.5, y + 1, x + w + 2, y + 6, INK, 0.8);
  rect(g, x + 1, y + ht * 0.5, w - 2, 3, CREAM);
}

function trophyCase(g, h) {
  const x = h.x, y = h.y, w = h.w, ht = h.h;
  // stepped top
  rect(g, x - 2, y - 2, w + 4, 4, goldV(g, y - 2, y + 2));
  rect(g, x + 8, y - 6, w - 16, 4, LAQ);
  rect(g, x + 8, y - 6, w - 16, 0.8, GOLD.mid);
  rect(g, x, y + 2, w, ht - 2, lacquerV(g, y, y + ht));
  // lit interior
  const ix = x + 4, iy = y + 6, iw = w - 8, ih = ht - 24;
  const ig = g.createLinearGradient(0, iy, 0, iy + ih);
  ig.addColorStop(0, '#7a5530');
  ig.addColorStop(0.5, '#3e2a18');
  ig.addColorStop(1, '#1a120c');
  rect(g, ix, iy, iw, ih, ig);
  const shelves = [iy + ih * 0.33, iy + ih * 0.66, iy + ih];
  const cup = (cx, by, s) => {
    g.fillStyle = goldV(g, by - 10 * s, by);
    g.beginPath();
    g.moveTo(cx - 4 * s, by - 10 * s);
    g.quadraticCurveTo(cx - 4 * s, by - 4 * s, cx - 0.8 * s, by - 3.5 * s);
    g.lineTo(cx - 0.8 * s, by - 1.5 * s);
    g.lineTo(cx - 2.6 * s, by - 1.5 * s);
    g.lineTo(cx - 2.6 * s, by);
    g.lineTo(cx + 2.6 * s, by);
    g.lineTo(cx + 2.6 * s, by - 1.5 * s);
    g.lineTo(cx + 0.8 * s, by - 1.5 * s);
    g.lineTo(cx + 0.8 * s, by - 3.5 * s);
    g.quadraticCurveTo(cx + 4 * s, by - 4 * s, cx + 4 * s, by - 10 * s);
    g.closePath();
    g.fill();
    g.strokeStyle = GOLD.mid;
    g.lineWidth = 0.6 * s;
    g.beginPath();
    g.arc(cx - 4.4 * s, by - 7.5 * s, 1.6 * s, PI * 0.5, PI * 1.5);
    g.arc(cx + 4.4 * s, by - 7.5 * s, 1.6 * s, -PI * 0.5, PI * 0.5);
    g.stroke();
  };
  shelves.forEach((sy, i) => {
    rect(g, ix, sy - 1, iw, 1.2, GOLD.lo);
    const dim = i * 0.25;
    g.globalAlpha = 1 - dim;
    if (i === 0) {
      cup(ix + iw * 0.25, sy - 1, 1);
      cup(ix + iw * 0.72, sy - 1, 0.8);
      g.fillStyle = goldV(g, sy - 13, sy);
      g.beginPath();
      g.ellipse(ix + iw * 0.5, sy - 6, 3, 4, 0, 0, TAU);
      g.fill();
      rect(g, ix + iw * 0.5 - 2.5, sy - 2.5, 5, 1.5, INK);
    } else if (i === 1) {
      rect(g, ix + 4, sy - 9, 10, 8, '#2a1a10');
      rect(g, ix + 5, sy - 8, 8, 6, GOLD.lo);
      cup(ix + iw * 0.62, sy - 1, 0.9);
      rect(g, ix + iw - 12, sy - 7, 8, 6, '#2a1a10');
      rect(g, ix + iw - 11, sy - 6, 6, 4, GOLD.lo);
    } else {
      cup(ix + iw * 0.3, sy - 1, 0.7);
      cup(ix + iw * 0.7, sy - 1, 0.7);
    }
    g.globalAlpha = 1;
  });
  // glass: gold muntins and a sheen
  rect(g, x + w / 2 - 0.6, iy, 1.2, ih, GOLD.mid);
  g.strokeStyle = GOLD.mid;
  g.lineWidth = 1;
  g.strokeRect(ix, iy, iw, ih);
  g.fillStyle = 'rgba(255,240,210,0.07)';
  poly(g, [ix + 6, iy, ix + 16, iy, ix + 4, iy + ih, ix - 6, iy + ih]);
  g.fill();
  // closed cupboard below
  rect(g, x + 3, y + ht - 16, w - 6, 13, '#100d12');
  g.strokeStyle = rgba(GOLD.mid, 0.5);
  g.lineWidth = 0.5;
  g.strokeRect(x + 4.5, y + ht - 14.5, w / 2 - 6, 10);
  g.strokeRect(x + w / 2 + 1.5, y + ht - 14.5, w / 2 - 6, 10);
}

function bookshelf(g, h) {
  const x = h.x, y = h.y, w = h.w, ht = h.h;
  rect(g, x - 2, y - 2, w + 4, 4, goldV(g, y - 2, y + 2));
  rect(g, x + 10, y - 7, w - 20, 5, LAQ);
  rect(g, x + 10, y - 7, w - 20, 0.8, GOLD.mid);
  sunburst(g, x + w / 2, y - 7, 1, 6, PI, TAU, 9, GOLD.mid, null);
  rect(g, x, y + 2, w, ht - 2, '#1c120c');
  const R = rng(h.i * 13 + 5);
  const inner = 4;
  const rows = 4;
  const rh = (ht - 46) / rows;
  const spines = ['#5a1a1e', '#1e4a3c', '#1a1618', '#4a2e1c', '#6a2a24', '#2a3a30', '#3a2014'];
  for (let r = 0; r < rows; r++) {
    const sy = y + 6 + r * rh;
    const by = sy + rh;
    rect(g, x + inner, sy, w - inner * 2, rh, '#0e0907');
    let bx = x + inner + 1;
    while (bx < x + w - inner - 2) {
      if (R() < 0.08) {
        // an ornament: a little bronze bust or a gold sunburst clock
        if (R() < 0.5) {
          disc(g, bx + 3, by - 7, 2.2, '#7a5a30');
          rect(g, bx + 1, by - 4.5, 4, 3.5, '#5a4220');
        } else {
          sunburst(g, bx + 3.5, by - 4, 1, 4, PI, TAU, 7, GOLD.mid, null);
          rect(g, bx + 1, by - 1.5, 5, 1.5, GOLD.lo);
        }
        bx += 8;
        continue;
      }
      const bw = 2 + R() * 2.6;
      const bh = rh * (0.6 + R() * 0.35);
      const c = spines[Math.floor(R() * spines.length)];
      rect(g, bx, by - bh, bw - 0.4, bh, c);
      rect(g, bx, by - bh + 2, bw - 0.4, 0.6, rgba(GOLD.mid, 0.7));
      rect(g, bx, by - 3, bw - 0.4, 0.6, rgba(GOLD.mid, 0.5));
      bx += bw;
    }
    rect(g, x + inner, by - 0.5, w - inner * 2, 2, '#3a2416');
    rect(g, x + inner, by - 0.5, w - inner * 2, 0.5, rgba(GOLD.mid, 0.6));
  }
  // closed cabinet below, calm behind the lane
  const cy = y + ht - 40;
  rect(g, x + inner, cy, w - inner * 2, 36, '#140c08');
  g.strokeStyle = rgba(GOLD.mid, 0.45);
  g.lineWidth = 0.5;
  const dw = (w - inner * 2) / 3;
  for (let i = 0; i < 3; i++) {
    g.strokeRect(x + inner + i * dw + 2, cy + 3, dw - 4, 28);
    disc(g, x + inner + i * dw + dw / 2, cy + 15, 0.9, rgba(GOLD.mid, 0.6));
  }
  rect(g, x - 1, y + ht - 4, w + 2, 4, '#0b0705');
  rect(g, x + inner - 1, y + 2, 1, ht - 6, rgba(GOLD.mid, 0.4));
  rect(g, x + w - inner, y + 2, 1, ht - 6, rgba(GOLD.mid, 0.4));
}

// THE FOUNDER: Don K. Eggshell PhD as he ships since 4 Sep 2026 — the silver professor
// (src/sprites/props.js, "Don K. Eggshell, the professor"). The geometry is the shipped
// bust's, part for part, in its own 24x20 box (X, Y below take its fractions), so he is
// the same man; the hand is de Lempicka's: sculpted gradients, hard highlights, the mane
// as metallic silver strand by strand in three greys, a glossy black satin cape whose red
// lining stands up behind him like a Dracula collar.
const PRO = {
  skinLit: '#fbe2c8', skin: '#eec9a8', skinDk: '#cf9c76',
  tones: [['#eef0f5', '#c6cbd9'], ['#d9dee9', '#b1b9ca'], ['#c4cbda', '#a0a8bb']],
  stache: '#d3d8e4', stubble: '#c9ab93', rim: '#2e2e38', lens: '#c8e0f8',
  cape: '#23232e', capeIn: '#b8202a', shirt: '#eceef4',
};
// props.js PRO_HAIR.mane: [angle deg, length, spread, curl] per lock
const PRO_MANE = {
  back: [[-158, 0.85, 15, 14], [-172, 0.7, 13, 18], [166, 0.62, 14, 26], [148, 0.5, 15, 30],
    [-26, 0.8, 14, -16], [-8, 0.72, 13, -20], [12, 0.6, 14, -26], [32, 0.48, 15, -30]],
  front: [[-128, 1.05, 19, 22], [-104, 1.18, 18, 20], [-80, 1.0, 17, 16], [-58, 0.82, 17, 10],
    [-146, 0.62, 14, 26], [-38, 0.56, 14, 8]],
};
const PORTRAIT_BG = {
  a: '#33424f', b: '#0e131a',
  towers: [[0.02, 0.26, 0.16, '#5d6c78', '#9fb0bc'], [0.8, 0.14, 0.18, '#4e5c68', '#8e9eaa'], [0.13, 0.4, 0.14, '#3e4a56', '#6f7d89'], [0.66, 0.36, 0.14, '#43505c', '#7a8894']],
  varnish: 'rgba(255,250,230,0.10)',
};

function professorCanvas(g, px, py, pw, ph, bg) {
  g.save();
  g.beginPath();
  g.rect(px, py, pw, ph);
  g.clip();
  const gr = g.createLinearGradient(px, py, px + pw, py + ph);
  gr.addColorStop(0, bg.a);
  gr.addColorStop(1, bg.b);
  rect(g, px, py, pw, ph, gr);
  if (bg.under) bg.under(g, px, py, pw, ph);
  for (const [fx, fy, fw, c, hi] of bg.towers) {
    const tx = px + fx * pw, ty = py + fy * ph, tw = fw * pw;
    rect(g, tx, ty, tw, ph, c);
    rect(g, tx, ty, 1.2, ph, hi);
    g.fillStyle = c;
    poly(g, [tx, ty, tx + tw / 2, ty - 5, tx + tw, ty]);
    g.fill();
  }
  const cx = px + pw / 2;
  const S = 2.25, Sh = 2.6;
  const hc = py + 26.5, by0 = py + 17;
  const Xb = (f) => cx + (f - 0.5) * 24 * S, Yb = (f) => by0 + f * 20 * S;
  const Xh = (f) => cx + (f - 0.5) * 24 * Sh, Yh = (f) => hc + (f - 0.375) * 20 * Sh;
  const ux = 24 * Sh, uy = 20 * Sh;
  // the collar: red satin lining, the black outer edge standing up behind the head
  for (const sd of [-1, 1]) {
    const lg = g.createLinearGradient(Xb(0.5 + sd * 0.1), Yb(0.55), Xb(0.5 + sd * 0.4), Yb(0.22));
    lg.addColorStop(0, '#6a0c14');
    lg.addColorStop(0.55, PRO.capeIn);
    lg.addColorStop(0.8, '#e2525a');
    lg.addColorStop(1, '#8a121c');
    g.fillStyle = lg;
    g.beginPath();
    g.moveTo(Xb(0.5 + sd * 0.08), Yb(0.6));
    g.quadraticCurveTo(Xb(0.5 + sd * 0.42), Yb(0.5), Xb(0.5 + sd * 0.36), Yb(0.2));
    g.quadraticCurveTo(Xb(0.5 + sd * 0.3), Yb(0.36), Xb(0.5 + sd * 0.14), Yb(0.42));
    g.closePath();
    g.fill();
    const og = g.createLinearGradient(Xb(0.5 + sd * 0.36), 0, Xb(0.5 + sd * 0.44), 0);
    og.addColorStop(0, '#3a3a4a');
    og.addColorStop(1, '#0c0c12');
    g.fillStyle = og;
    g.beginPath();
    g.moveTo(Xb(0.5 + sd * 0.16), Yb(0.62));
    g.quadraticCurveTo(Xb(0.5 + sd * 0.44), Yb(0.52), Xb(0.5 + sd * 0.4), Yb(0.24));
    g.lineTo(Xb(0.5 + sd * 0.36), Yb(0.2));
    g.quadraticCurveTo(Xb(0.5 + sd * 0.42), Yb(0.5), Xb(0.5 + sd * 0.08), Yb(0.6));
    g.closePath();
    g.fill();
  }
  // shoulders and cape down to the frame: black satin with a cool sheen
  const sg = g.createLinearGradient(px, 0, px + pw, 0);
  sg.addColorStop(0, '#09090e');
  sg.addColorStop(0.22, '#3c3f4e');
  sg.addColorStop(0.34, PRO.cape);
  sg.addColorStop(0.66, '#15151c');
  sg.addColorStop(0.8, '#444858');
  sg.addColorStop(1, '#09090e');
  g.fillStyle = sg;
  g.beginPath();
  g.ellipse(Xb(0.5), Yb(0.6), 0.33 * 24 * S, 0.17 * 20 * S, 0, PI, TAU);
  g.lineTo(Xb(0.5) + 0.33 * 24 * S + 2, py + ph);
  g.lineTo(Xb(0.5) - 0.33 * 24 * S - 2, py + ph);
  g.closePath();
  g.fill();
  rect(g, cx - 0.4, Yb(0.62), 0.8, ph, 'rgba(0,0,0,0.45)');
  // the shirt collar's two points
  for (const sd of [-1, 1]) {
    const cg = g.createLinearGradient(Xb(0.5 + sd * 0.05), Yb(0.46), Xb(0.5 + sd * 0.18), Yb(0.6));
    cg.addColorStop(0, '#ffffff');
    cg.addColorStop(1, '#b4bccb');
    g.fillStyle = cg;
    poly(g, [Xb(0.5 + sd * 0.05), Yb(0.46), Xb(0.5 + sd * 0.21), Yb(0.5), Xb(0.5 + sd * 0.13), Yb(0.62)]);
    g.fill();
  }
  // the mane: locks rooted inside the skull, growing out through it, lit from the left
  const skx = Xh(0.5), sky = Yh(0.35), srx = 0.165 * ux, sry = 0.2 * uy;
  const R = PI / 180;
  const lock = ([deg, len, spread, curl], tone, shaded) => {
    const P = (d, k) => [skx + Math.cos(d * R) * srx * k, sky + Math.sin(d * R) * sry * k];
    const tip = deg + curl;
    const a = P(deg - spread, 0.86), c1 = P(deg - spread * 0.5, 1 + len * 0.55), t = P(tip, 1 + len);
    const c2 = P(deg + spread * 1.15, 1 + len * 0.3), b2 = P(deg + spread, 0.86), root = P(deg, 0.86);
    const right = Math.cos(deg * R) > 0.3;
    const [lit, shade] = PRO.tones[tone % 3];
    const lg = g.createLinearGradient(root[0], root[1], t[0], t[1]);
    lg.addColorStop(0, shaded ? mixc(shade, '#6c7488', 0.35) : shade);
    lg.addColorStop(0.65, right ? mixc(lit, '#8e96a8', 0.3) : lit);
    lg.addColorStop(1, right ? mixc(lit, '#8e96a8', 0.15) : '#ffffff');
    g.fillStyle = lg;
    g.beginPath();
    g.moveTo(a[0], a[1]);
    g.quadraticCurveTo(c1[0], c1[1], t[0], t[1]);
    g.quadraticCurveTo(c2[0], c2[1], b2[0], b2[1]);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(40,40,62,0.35)';
    g.lineWidth = 0.3;
    g.stroke();
    g.strokeStyle = right ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.6)';
    g.lineWidth = 0.35;
    g.beginPath();
    g.moveTo(a[0], a[1]);
    g.quadraticCurveTo(c1[0], c1[1], t[0], t[1]);
    g.stroke();
  };
  PRO_MANE.back.forEach((l, i) => lock(l, i, true));
  PRO_MANE.front.forEach((l, i) => lock(l, i, false));
  // ears
  for (const sd of [-1, 1]) {
    g.fillStyle = sd < 0 ? PRO.skin : PRO.skinDk;
    g.beginPath();
    g.ellipse(Xh(0.5 + sd * 0.16), Yh(0.378), 0.036 * ux, 0.052 * uy, sd * 0.28, 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(120,70,60,0.45)';
    g.lineWidth = 0.35;
    g.beginPath();
    g.ellipse(Xh(0.5 + sd * 0.166), Yh(0.378), 0.016 * ux, 0.026 * uy, sd * 0.28, -1.9, 1.5);
    g.stroke();
  }
  // the head: an egg on its end, sculpted from the upper left
  const hcx = Xh(0.5), hcy = Yh(0.375), hrx = 0.168 * ux, hry = 0.215 * uy;
  const headPath = () => {
    const wy = hcy + hry * -0.16, top = hcy - hry, bot = hcy + hry, k = 0.56, taper = 0.7;
    g.beginPath();
    g.moveTo(hcx, top);
    g.bezierCurveTo(hcx + hrx * k, top, hcx + hrx, wy - (wy - top) * k, hcx + hrx, wy);
    g.bezierCurveTo(hcx + hrx, wy + (bot - wy) * k * 0.92, hcx + hrx * taper * 0.9, bot - (bot - wy) * 0.1, hcx, bot);
    g.bezierCurveTo(hcx - hrx * taper * 0.9, bot - (bot - wy) * 0.1, hcx - hrx, wy + (bot - wy) * k * 0.92, hcx - hrx, wy);
    g.bezierCurveTo(hcx - hrx, wy - (wy - top) * k, hcx - hrx * k, top, hcx, top);
    g.closePath();
  };
  const fg = g.createRadialGradient(hcx - hrx * 0.4, hcy - hry * 0.45, 1, hcx, hcy, hrx * 1.3);
  fg.addColorStop(0, PRO.skinLit);
  fg.addColorStop(0.55, PRO.skin);
  fg.addColorStop(1, PRO.skinDk);
  headPath();
  g.fillStyle = fg;
  g.fill();
  g.save();
  headPath();
  g.clip();
  // the hard, cool shadow down the far side of the face
  g.fillStyle = 'rgba(110,70,80,0.28)';
  g.beginPath();
  g.ellipse(hcx + hrx * 0.95, hcy + hry * 0.1, hrx * 0.55, hry * 1.2, 0.12, 0, TAU);
  g.fill();
  // stubble: a warm field on the jaw, a silver patch under the lip
  g.fillStyle = rgba(PRO.stubble, 0.85);
  g.beginPath();
  g.moveTo(Xh(0.295), Yh(0.425));
  g.quadraticCurveTo(Xh(0.5), Yh(0.478), Xh(0.705), Yh(0.425));
  g.lineTo(Xh(0.705), Yh(0.72));
  g.lineTo(Xh(0.295), Yh(0.72));
  g.closePath();
  g.fill();
  const R2 = rng(611);
  for (let i = 0; i < 60; i++) {
    const sx = Xh(0.3 + R2() * 0.4), sy2 = Yh(0.44 + R2() * 0.16);
    rect(g, sx, sy2, 0.35, 0.35, 'rgba(90,70,60,0.35)');
  }
  g.fillStyle = 'rgba(232,236,244,0.75)';
  g.beginPath();
  g.moveTo(Xh(0.425), Yh(0.53));
  g.quadraticCurveTo(Xh(0.5), Yh(0.575), Xh(0.575), Yh(0.53));
  g.quadraticCurveTo(Xh(0.565), Yh(0.635), Xh(0.5), Yh(0.665));
  g.quadraticCurveTo(Xh(0.435), Yh(0.635), Xh(0.425), Yh(0.53));
  g.closePath();
  g.fill();
  g.restore();
  // nose: oblong, under the bridge, with a hard highlight
  g.fillStyle = PRO.skinDk;
  g.beginPath();
  g.ellipse(Xh(0.5), Yh(0.388), 0.025 * ux, 0.04 * uy, 0, 0, TAU);
  g.fill();
  g.fillStyle = 'rgba(255,240,224,0.7)';
  g.beginPath();
  g.ellipse(Xh(0.5) - 0.008 * ux, Yh(0.375), 0.007 * ux, 0.016 * uy, 0, 0, TAU);
  g.fill();
  // specs: fine, rectangular, a heavy bar along the top; pale-blue lenses
  const scy = Yh(0.346), shh = 0.036 * uy, shw = 0.067 * ux, soff = (0.067 + 0.005) * ux, stop = scy - shh;
  for (const sd of [-1, 1]) {
    const lx = Xh(0.5) + sd * soff;
    line(g, lx + sd * shw, stop + 0.3, Xh(0.5) + sd * 0.166 * ux, scy - 0.006 * uy, PRO.rim, 0.4);
    g.save();
    g.translate(lx, scy);
    g.scale(sd, 1);
    const W2 = shw * 2, H2 = shh * 2, bo = shw - 0.07 * W2, bi = -shw + 0.12 * W2, rr2 = 0.3 * H2;
    g.beginPath();
    g.moveTo(-shw, -shh);
    g.lineTo(shw, -shh);
    g.lineTo(bo, shh - rr2 * 0.4);
    g.quadraticCurveTo(bo, shh, bo - rr2, shh);
    g.lineTo(bi + rr2, shh);
    g.quadraticCurveTo(bi, shh, bi, shh - rr2 * 0.4);
    g.closePath();
    const lg2 = g.createLinearGradient(0, -shh, 0, shh);
    lg2.addColorStop(0, '#eef6ff');
    lg2.addColorStop(1, PRO.lens);
    g.fillStyle = lg2;
    g.fill();
    g.strokeStyle = PRO.rim;
    g.lineWidth = 0.4;
    g.stroke();
    g.restore();
    disc(g, lx + sd * -0.004 * ux, scy + 0.004 * uy, 0.017 * ux, '#141020');
    rect(g, lx - shw * 0.7, stop + 0.5, shw * 0.5, 0.45, 'rgba(255,255,255,0.9)');
  }
  rect(g, Xh(0.5) - soff - shw - 0.1, stop - 0.15, (soff + shw) * 2 + 0.2, 0.75, PRO.rim);
  // thick angry brows, inner ends down
  const bcy = Yh(0.25), bw = 0.044 * ux, bh = 0.024 * uy * 1.35;
  for (const sd of [-1, 1]) {
    g.save();
    g.translate(Xh(0.5) + sd * soff, bcy);
    g.scale(sd, 1);
    const drop = bh * 0.9;
    const bg2 = g.createLinearGradient(0, -bh, 0, bh * 1.5);
    bg2.addColorStop(0, '#ffffff');
    bg2.addColorStop(1, PRO.tones[1][1]);
    g.fillStyle = bg2;
    g.beginPath();
    g.moveTo(-bw, bh * 0.6 + drop);
    g.quadraticCurveTo(0, -bh * 1.1 + drop * 0.35, bw, bh * 0.4);
    g.quadraticCurveTo(0, bh * 1.4, -bw, bh * 1.5 + drop);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(40,40,62,0.4)';
    g.lineWidth = 0.3;
    g.stroke();
    g.restore();
  }
  // the flat frown, under the moustache
  const my = 0.458 + 0.038 * 1.25 * 0.85 + 0.014;
  g.strokeStyle = 'rgba(26,16,40,0.8)';
  g.lineWidth = 0.55;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(Xh(0.455), Yh(my) + 0.25);
  g.quadraticCurveTo(Xh(0.5), Yh(my) - 0.35, Xh(0.545), Yh(my) + 0.25);
  g.stroke();
  // the big drooping silver moustache
  const mcx = Xh(0.5), mcy = Yh(0.458), span = 0.118 * ux, drop2 = 0.038 * uy * 1.25;
  for (const sd of [-1, 1]) {
    const mg = g.createLinearGradient(mcx, mcy - drop2, mcx + sd * span, mcy + drop2);
    mg.addColorStop(0, '#ffffff');
    mg.addColorStop(0.45, PRO.stache);
    mg.addColorStop(1, sd < 0 ? '#a7aec0' : '#8f97a8');
    g.fillStyle = mg;
    g.beginPath();
    g.moveTo(mcx, mcy - drop2 * 0.3);
    g.quadraticCurveTo(mcx + sd * span * 0.45, mcy - drop2 * 0.95, mcx + sd * span, mcy - drop2 * 0.35 + drop2 * 0.9);
    g.quadraticCurveTo(mcx + sd * span * 0.82, mcy + drop2 * 0.9, mcx + sd * span * 0.42, mcy + drop2 * 0.6);
    g.quadraticCurveTo(mcx + sd * span * 0.16, mcy + drop2 * 0.8, mcx, mcy + drop2 * 0.55);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(40,40,62,0.35)';
    g.lineWidth = 0.3;
    g.stroke();
  }
  // varnish
  const vg = g.createLinearGradient(px, py, px + pw, py + ph);
  vg.addColorStop(0, bg.varnish);
  vg.addColorStop(0.4, 'rgba(255,250,230,0)');
  rect(g, px, py, pw, ph, vg);
  g.restore();
}

function portrait(g, h) {
  const x = h.x, y = h.y, w = h.w, ht = h.h;
  if (h.simple) {
    // The office poster: just the canvas, inside the poster's own plain frame; no gilt
    // crest, lamp or name plate.
    professorCanvas(g, x, y, w, ht, PORTRAIT_BG);
    return;
  }
  // picture light
  rect(g, x + w / 2 - 10, y - 9, 20, 2.5, goldV(g, y - 9, y - 6.5));
  rect(g, x + w / 2 - 0.6, y - 7, 1.2, 4, GOLD.lo);
  const pl = g.createLinearGradient(0, y - 6, 0, y + ht * 0.7);
  pl.addColorStop(0, 'rgba(255,214,150,0.30)');
  pl.addColorStop(1, 'rgba(255,214,150,0)');
  g.fillStyle = pl;
  poly(g, [x + w / 2 - 10, y - 6, x + w / 2 + 10, y - 6, x + w + 10, y + ht * 0.7, x - 10, y + ht * 0.7]);
  g.fill();
  // stepped gilt frame
  const b = 5;
  const fp = [x + 4, y, x + w - 4, y, x + w - 4, y + 2, x + w - 2, y + 2, x + w - 2, y + 4, x + w, y + 4,
    x + w, y + ht - 4, x + w - 2, y + ht - 4, x + w - 2, y + ht - 2, x + w - 4, y + ht - 2, x + w - 4, y + ht,
    x + 4, y + ht, x + 4, y + ht - 2, x + 2, y + ht - 2, x + 2, y + ht - 4, x, y + ht - 4,
    x, y + 4, x + 2, y + 4, x + 2, y + 2, x + 4, y + 2];
  g.fillStyle = 'rgba(0,0,0,0.45)';
  g.save();
  g.translate(1.5, 2);
  poly(g, fp);
  g.fill();
  g.restore();
  poly(g, fp);
  g.fillStyle = goldV(g, y, y + ht);
  g.fill();
  g.strokeStyle = GOLD.dk;
  g.lineWidth = 0.5;
  g.stroke();
  sunburst(g, x + w / 2, y + 1, 1, 7, PI, TAU, 9, goldV(g, y - 7, y), null);
  g.strokeStyle = rgba(GOLD.hi, 0.9);
  g.strokeRect(x + 3.2, y + 3.2, w - 6.4, ht - 6.4);
  // the canvas: the founder as a de Lempicka oil
  professorCanvas(g, x + b, y + b, w - 2 * b, ht - 2 * b, PORTRAIT_BG);
  // the brass plate under the frame
  const by = y + ht + 3;
  rect(g, x + w / 2 - 14, by, 28, 7, INK);
  g.strokeStyle = GOLD.mid;
  g.lineWidth = 0.6;
  g.strokeRect(x + w / 2 - 13.5, by + 0.5, 27, 6);
  decoText(g, h.label, x + w / 2, by + 1.7, 3.4, { color: GOLD.hi, lw: 0.55, track: 1.7 });
}

// Exact Art Deco portrait used by the office-style gallery, scaled to the
// Founder collection's framed poster footprint.
export function paintFounderGalleryPortrait(g, x, y, w, h) {
  portrait(g, { x, y, w, h, simple: true });
}

function paintWall(fl) {
  const F = OFFICE_FLOORS[fl];
  const W = F.wall;
  return (g, ua, ub) => {
    W.bays.forEach((b, i) => {
      if (!near(b.u, b.u1, ua, ub, 10)) return;
      if (b.type === 'wall') wallField(g, fl, b.u, b.u1, F.ceilingY, WALL_BASE, i * 19 + 3);
      else glassBayStatic(g, fl, F, b, i);
    });
    cornice(g, fl, ua, ub, F);
    for (const c of W.columns) if (near(c.u, c.u + c.w, ua, ub, 10)) column(g, fl, c.u, c.w, F);
    W.hangs.forEach((h0, i) => {
      const w = h0.w || h0.r * 2 || 40;
      if (!near(h0.u - 30, h0.u + w + 30, ua, ub, 10)) return;
      const h = { ...h0, i, x: h0.u, y: h0.y ?? WALL_BASE - h0.h, label: h0.label ?? '', variant: h0.variant ?? 0 };
      switch (h.kind) {
        case 'lift': liftStatic(g, fl, h); break;
        case 'logo': logo(g, h); break;
        case 'clock': clockFace(g, fl, h.u, h.y, h.r); break;
        case 'poster': poster(g, h); break;
        case 'whiteboard': whiteboard(g, h); break;
        case 'painting': painting(g, h); break;
        case 'portrait': portrait(g, h); break;
        case 'door': door(g, fl, h); break;
        case 'extinguisher': extinguisher(g, h); break;
        case 'trophyCase': trophyCase(g, h); break;
        case 'bookshelf': bookshelf(g, h); break;
        default: break;
      }
    });
  };
}

// ================================================================== CEILING + LIGHTS
function paintCeiling(fl) {
  const F = OFFICE_FLOORS[fl];
  const L = F.lights;
  const y1 = F.ceilingY;
  return (g, ua, ub) => {
    const base = { lobby: ['#1c1013', '#2c171b'], open: ['#bfb497', '#ddd2b6'], exec: ['#140c09', '#24160f'] }[fl];
    const gr = g.createLinearGradient(0, 0, 0, y1);
    gr.addColorStop(0, base[0]);
    gr.addColorStop(1, base[1]);
    rect(g, ua, 0, ub - ua, y1, gr);
    const lineC = fl === 'open' ? rgba('#9a8c6c', 0.6) : rgba(GOLD.mid, 0.35);
    // coffers
    for (let u = Math.floor(ua / 60) * 60; u < ub; u += 60) rect(g, u, 0, 0.8, y1, lineC);
    rect(g, ua, y1 * 0.5, ub - ua, 0.6, lineC);
    for (const u of L.us) {
      if (!near(u, u, ua, ub, 30)) continue;
      // a sunburst medallion over each fixture
      sunburst(g, u, y1, 2, Math.min(12, y1 * 0.8), PI, TAU, 12, fl === 'open' ? rgba('#a89a78', 0.6) : rgba(GOLD.mid, 0.5), null);
    }
  };
}

function lightSprite(k, variant, on) {
  if (variant === 'globe') {
    return sprite(k, -24, -40, 48, 64, (g) => {
      const hg = g.createRadialGradient(0, -7, 2, 0, -7, 22);
      hg.addColorStop(0, 'rgba(255,240,200,0.32)');
      hg.addColorStop(1, 'rgba(255,240,200,0)');
      rect(g, -24, -30, 48, 46, hg);
      // Saturn globe: frosted sphere, a gold ring round its equator
      g.strokeStyle = GOLD.lo;
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse(0, -7, 11, 2.6, 0, PI, TAU);
      g.stroke();
      const sg = g.createRadialGradient(-2, -9, 1, 0, -7, 7.5);
      sg.addColorStop(0, '#fffbee');
      sg.addColorStop(1, '#e6d2a2');
      disc(g, 0, -7, 7, sg);
      g.strokeStyle = goldH(g, -11, 11);
      g.lineWidth = 1.3;
      g.beginPath();
      g.ellipse(0, -7, 11, 2.6, 0, 0, PI);
      g.stroke();
      rect(g, -1.5, -15, 3, 2, GOLD.mid);
      g.fillStyle = GOLD.mid;
      poly(g, [-1.2, 0, 1.2, 0, 0, 2.6]);
      g.fill();
    });
  }
  if (variant === 'tube') {
    return sprite(k, -26, -6, 52, 30, (g) => {
      if (on) {
        const lg = g.createLinearGradient(0, 0, 0, 22);
        lg.addColorStop(0, 'rgba(255,250,228,0.20)');
        lg.addColorStop(1, 'rgba(255,250,228,0)');
        g.fillStyle = lg;
        poly(g, [-20, 0, 20, 0, 26, 22, -26, 22]);
        g.fill();
      }
      rect(g, -23, -5, 46, 5, goldV(g, -5, 0));
      rect(g, -20, -4, 40, 3.4, on ? '#fffaea' : '#9a9586');
      if (on) rect(g, -20, -4, 40, 1, '#ffffff');
      for (const s of [-1, 1]) {
        g.fillStyle = GOLD.lo;
        poly(g, [s * 20, -4.6, s * 23, -4.6, s * 23, -0.4, s * 20, -0.4, s * 21.5, -2.5]);
        g.fill();
      }
    });
  }
  // pendant: a tiered alabaster shade in gold rims, warm glow
  return sprite(k, -32, -30, 64, 90, (g) => {
    const hg = g.createRadialGradient(0, -2, 2, 0, -2, 30);
    hg.addColorStop(0, 'rgba(255,200,120,0.38)');
    hg.addColorStop(1, 'rgba(255,190,110,0)');
    rect(g, -32, -30, 64, 60, hg);
    const cone = g.createLinearGradient(0, 0, 0, 56);
    cone.addColorStop(0, 'rgba(255,200,130,0.12)');
    cone.addColorStop(1, 'rgba(255,200,130,0)');
    g.fillStyle = cone;
    poly(g, [-8, 0, 8, 0, 22, 58, -22, 58]);
    g.fill();
    for (const [w, y] of [[16, -12], [12, -8.5], [8, -5]]) {
      const tg = g.createLinearGradient(0, y, 0, y + 3.5);
      tg.addColorStop(0, '#f7dca0');
      tg.addColorStop(1, '#d89a50');
      g.fillStyle = tg;
      poly(g, [-w / 2, y, w / 2, y, w / 2 - 1.6, y + 3.5, -w / 2 + 1.6, y + 3.5]);
      g.fill();
      rect(g, -w / 2, y - 0.4, w, 0.9, GOLD.mid);
    }
    disc(g, 0, -1, 1.6, '#fff0c8');
    rect(g, -2, -14, 4, 2, GOLD.mid);
  });
}

function drawLights(ctx, f, B, dL) {
  const top = f.ceilingY;
  for (const l0 of f.lights) {
    const l = { ...l0, x: l0.x + dL };
    if (l.variant === 'tube') {
      blit(ctx, B.light(l.variant, l.on > 0.5), l.x, top);
      continue;
    }
    const y = l.y;
    const rodTo = l.variant === 'globe' ? y - 15 : y - 14;
    rect(ctx, l.x - 0.5, top, 1, rodTo - top, GOLD.lo);
    rect(ctx, l.x - 0.15, top, 0.4, rodTo - top, GOLD.hi);
    blit(ctx, B.light(l.variant, true), l.x, y);
  }
}

// ================================================================== FLOOR + SLAB
const FLOORS = {
  lobby: { top: '#2a2328', bot: '#0f0d11', joint: GOLD.mid, jointA: 0.3, every: 64, pool: 'rgba(250,238,210,', poolA: 0.2, reflect: 0.16, rows: true },
  open: { top: '#4a1c20', bot: '#24090d', joint: '#000000', jointA: 0.35, every: 40, pool: 'rgba(250,240,220,', poolA: 0.07, reflect: 0, rows: false },
  exec: { top: '#4e3020', bot: '#24140a', joint: '#000000', jointA: 0.45, every: 14, pool: 'rgba(250,150,80,', poolA: 0.28, reflect: 0.2, rows: false },
};
const FLOOR_CX = 240;
const HORIZON = 195;

function floorPass(ctx, f, B, k, dW) {
  const FP = f.floorPlane;
  const top = FP.top, bot = FP.bottom;
  const P = FLOORS[f.floor];
  const kk = FP.shiftBottom ? FP.shiftTop / FP.shiftBottom : 0.24;
  const S = FP.shiftBottom;
  const gr = ctx.createLinearGradient(0, top, 0, bot);
  gr.addColorStop(0, P.top);
  gr.addColorStop(1, P.bot);
  rect(ctx, 0, top, FRAME_W, bot - top, gr);
  // carpet / plank / slab figure, perspective-mapped so it shears with the camera
  const X = (u, y) => FLOOR_CX + ((y - HORIZON) / 37) * (u - S - FLOOR_CX);
  if (f.floor === 'exec') {
    // ebony and walnut planks running toward you, alternate planks a shade lighter
    ctx.fillStyle = 'rgba(120,70,40,0.16)';
    ctx.beginPath();
    const ev = P.every;
    const u0 = Math.floor((S + FLOOR_CX - 260 / kk) / (ev * 2)) * ev * 2;
    for (let u = u0; u - S < FLOOR_CX + 260 / kk; u += ev * 2) {
      ctx.moveTo(X(u, top), top);
      ctx.lineTo(X(u + ev, top), top);
      ctx.lineTo(X(u + ev, bot), bot);
      ctx.lineTo(X(u, bot), bot);
      ctx.closePath();
    }
    ctx.fill();
  }
  if (f.floor === 'open') {
    // an oxblood carpet with a dim gold zigzag border in two rows
    const zr = (ya, yb, ev, a) => {
      ctx.strokeStyle = rgba(GOLD.mid, a);
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      const u0 = Math.floor((S + FLOOR_CX - 300 / kk) / ev) * ev;
      let j = 0;
      for (let u = u0; u - S < FLOOR_CX + 300 / kk; u += ev / 2, j++) {
        const y = j % 2 ? yb : ya;
        if (j) ctx.lineTo(X(u, y), y);
        else ctx.moveTo(X(u, y), y);
      }
      ctx.stroke();
    };
    zr(208.2, 210.6, 16, 0.28);
    ctx.fillStyle = rgba(GOLD.mid, 0.2);
    ctx.fillRect(0, 207, FRAME_W, 0.5);
    ctx.fillRect(0, 211.8, FRAME_W, 0.5);
  }
  // light from the glass on the floor
  for (const b of f.wall.bays) {
    if (b.type !== 'glass') continue;
    const pg = ctx.createLinearGradient(0, top, 0, bot);
    pg.addColorStop(0, P.pool + P.poolA + ')');
    pg.addColorStop(1, P.pool + '0)');
    ctx.fillStyle = pg;
    const x0 = b.x0 + dW, x1 = b.x1 + dW;
    ctx.beginPath();
    ctx.moveTo(x0, top);
    ctx.lineTo(x1, top);
    ctx.lineTo(x1 + (x1 - FLOOR_CX) * 0.15, bot);
    ctx.lineTo(x0 + (x0 - FLOOR_CX) * 0.15, bot);
    ctx.closePath();
    ctx.fill();
  }
  // polished: the wall's foot reflected
  if (P.reflect) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, top, FRAME_W, bot - top);
    ctx.clip();
    ctx.globalAlpha = P.reflect;
    ctx.translate(0, top * 2);
    ctx.scale(1, -1);
    drawStrip(ctx, B.wall, f.wall.shift, k);
    ctx.restore();
    const fade = ctx.createLinearGradient(0, top, 0, bot);
    fade.addColorStop(0, rgba(P.top, 0));
    fade.addColorStop(1, rgba(P.bot, 0.85));
    rect(ctx, 0, top, FRAME_W, bot - top, fade);
  }
  // shearing joints
  ctx.strokeStyle = rgba(P.joint, P.jointA);
  ctx.lineWidth = f.floor === 'lobby' ? 0.6 : 0.5;
  ctx.beginPath();
  const ev = P.every;
  const u0 = Math.floor((S + FLOOR_CX - 260 / kk) / ev) * ev;
  for (let u = u0; u - S < FLOOR_CX + 260 / kk; u += ev) {
    ctx.moveTo(X(u, top), top);
    ctx.lineTo(X(u, bot), bot);
  }
  ctx.stroke();
  if (P.rows) {
    ctx.fillStyle = rgba(GOLD.mid, 0.22);
    const D = 300;
    for (let i = 1; i < 12; i++) {
      const y = HORIZON + 37 * (D / (D + ev * i));
      if (y < top + 1) break;
      ctx.fillRect(0, y, FRAME_W, 0.5);
    }
  }
  // the lit car spills across the floor when a lift is open
  for (const h of f.wall.hangs) {
    if (h.kind !== 'lift' || !(h.open > 0)) continue;
    const x0 = h.x + dW, x1 = x0 + h.w;
    const sg = ctx.createLinearGradient(0, top, 0, bot);
    sg.addColorStop(0, `rgba(255,200,120,${0.3 * h.open})`);
    sg.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(x0 + 2, top);
    ctx.lineTo(x1 - 2, top);
    ctx.lineTo(x1 + (x1 - FLOOR_CX) * 0.2 + 6, bot);
    ctx.lineTo(x0 + (x0 - FLOOR_CX) * 0.2 - 6, bot);
    ctx.closePath();
    ctx.fill();
  }
  // a dark line where the floor meets the wall
  rect(ctx, 0, top, FRAME_W, 1, 'rgba(0,0,0,0.45)');
}

const SLAB_P = 240;
function bakeSlab(fl, k) {
  const H = FRAME_H - LANE_TOP;
  const c = canvas(SLAB_P * k, H * k);
  const g = c.getContext('2d');
  g.setTransform(k, 0, 0, k, 0, -LANE_TOP * k);
  const y0 = LANE_TOP;
  const body = { lobby: ['#1b171c', '#0b090c'], open: ['#1a1519', '#0a080b'], exec: ['#1d130e', '#0b0705'] }[fl];
  const gr = g.createLinearGradient(0, y0, 0, FRAME_H);
  gr.addColorStop(0, body[0]);
  gr.addColorStop(1, body[1]);
  rect(g, 0, y0, SLAB_P, H, gr);
  for (const off of [-SLAB_P, 0, SLAB_P]) {
    g.save();
    g.translate(off, 0);
    veins(g, -20, y0 + 6, SLAB_P + 40, H - 6, fl === 'lobby' ? 501 : fl === 'open' ? 502 : 503, fl === 'exec' ? '#6a4628' : '#8a7a68', 7, 0.5, 0.2, 0.25);
    g.restore();
  }
  // inlay band
  const ia = y0 + 9, ib = y0 + 19;
  rect(g, 0, ia, SLAB_P, 0.7, rgba(GOLD.mid, 0.55));
  rect(g, 0, ib, SLAB_P, 0.7, rgba(GOLD.mid, 0.55));
  if (fl === 'lobby') {
    g.strokeStyle = rgba(GOLD.mid, 0.4);
    g.lineWidth = 0.7;
    g.beginPath();
    for (let x = -12; x <= SLAB_P + 12; x += 12) {
      g.moveTo(x, ia + 2);
      g.lineTo(x + 6, ib - 2);
      g.lineTo(x + 12, ia + 2);
    }
    g.stroke();
  } else if (fl === 'open') {
    for (let x = 0; x < SLAB_P; x += 12) {
      g.fillStyle = rgba(JADE.mid, 0.45);
      poly(g, [x + 1, ia + 2, x + 6, ib - 2, x + 11, ia + 2]);
      g.fill();
    }
  } else {
    g.fillStyle = rgba(OX.mid, 0.4);
    g.fillRect(0, ia + 2.5, SLAB_P, ib - ia - 5);
    g.strokeStyle = rgba(GOLD.mid, 0.38);
    g.lineWidth = 0.6;
    g.beginPath();
    for (let x = 0, j = 0; x <= SLAB_P; x += 4, j++) {
      const y = j % 2 ? ib - 2.5 : ia + 2.5;
      if (j) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.stroke();
  }
  // the gold nosing: the lane's hard edge
  rect(g, 0, y0, SLAB_P, 2.6, goldV(g, y0, y0 + 2.6));
  rect(g, 0, y0 + 0.3, SLAB_P, 0.5, GOLD.hi);
  rect(g, 0, y0 + 2.6, SLAB_P, 1.6, 'rgba(0,0,0,0.6)');
  const sh = g.createLinearGradient(0, y0 + 4, 0, y0 + 12);
  sh.addColorStop(0, 'rgba(0,0,0,0.35)');
  sh.addColorStop(1, 'rgba(0,0,0,0)');
  rect(g, 0, y0 + 4, SLAB_P, 8, sh);
  return c;
}

function slabPass(ctx, f, B, k) {
  const s = mod(f.slab.shift, SLAB_P);
  const sx = Math.round(s * k) / k;
  for (let x = -sx; x < FRAME_W; x += SLAB_P) ctx.drawImage(B.slab, x, LANE_TOP, SLAB_P, FRAME_H - LANE_TOP);
}

// ================================================================== MID FURNITURE
// All of it dark lacquer, oxblood leather, walnut and jade-black, with gold kept to thin
// trims, so nothing behind the lane reads as an obstacle.
const URN = (g, cx, w, h) => {
  g.fillStyle = lacquerH(g, cx - w / 2, cx + w / 2, '#141117', '#3a3440');
  poly(g, [cx - w / 2 - 1, -h, cx + w / 2 + 1, -h, cx + w / 2 - 1, -h + 2, cx + w / 2 - 2, -2, cx + w / 2, 0, cx - w / 2, 0, cx - w / 2 + 2, -2, cx - w / 2 + 1, -h + 2]);
  g.fill();
  rect(g, cx - w / 2 - 1, -h, w + 2, 0.8, rgba(GOLD.mid, 0.8));
  rect(g, cx - w / 2 + 1.5, -h * 0.45, w - 3, 0.6, rgba(GOLD.mid, 0.6));
  rect(g, cx - w / 2 + 1.5, -h * 0.45 + 1.4, w - 3, 0.6, rgba(GOLD.mid, 0.4));
};

function leaf(g, x, y, len, ang, wd, c, vein) {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.fillStyle = c;
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(len * 0.5, -wd, len, 0);
  g.quadraticCurveTo(len * 0.5, wd, 0, 0);
  g.fill();
  if (vein) {
    g.strokeStyle = vein;
    g.lineWidth = 0.35;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(len * 0.92, 0);
    g.stroke();
  }
  g.restore();
}

const PLANT_C = { a: '#173a2e', b: '#22503f', vein: 'rgba(110,170,140,0.5)' };

function plantPaint(g, variant) {
  if (variant === 'palm') {
    URN(g, 20, 12, 14);
    rect(g, 19, -44, 2, 30, '#2a1e16');
    for (let y = -42; y < -14; y += 3) rect(g, 18.6, y, 2.8, 0.6, rgba(GOLD.mid, 0.3));
    const fr = [[-2.6, 24], [-2.2, 26], [-1.8, 24], [-1.35, 22], [-0.75, 24], [-0.4, 26], [-1.57, 20]];
    fr.forEach(([a, len], i) => {
      const c = i % 2 ? PLANT_C.a : PLANT_C.b;
      g.save();
      g.translate(20, -44);
      g.rotate(a);
      g.fillStyle = c;
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(len * 0.5, -5, len, 2.5);
      g.quadraticCurveTo(len * 0.5, 2.6, 0, 0);
      g.fill();
      g.strokeStyle = rgba('#0a1a14', 0.8);
      g.lineWidth = 0.4;
      g.beginPath();
      for (let s = 4; s < len - 2; s += 3) {
        g.moveTo(s, -1.4 * Math.sin((s / len) * PI) - 0.4);
        g.lineTo(s + 2, 1.4);
      }
      g.stroke();
      g.restore();
    });
    return;
  }
  if (variant === 'snake') {
    URN(g, 8, 10, 9);
    [[-0.22, 22], [-0.08, 26], [0.06, 24], [0.2, 19], [-0.35, 16]].forEach(([a, len], i) => {
      g.save();
      g.translate(8 + (i - 2) * 1.2, -9);
      g.rotate(a);
      g.fillStyle = i % 2 ? PLANT_C.b : PLANT_C.a;
      poly(g, [-2, 0, 0, -len, 2, 0]);
      g.fill();
      g.fillStyle = rgba(GOLD.mid, 0.25);
      for (let y = -4; y > -len + 4; y -= 4) g.fillRect(-1.4 * (1 + y / len), y, 2.8 * (1 + y / len), 0.6);
      g.restore();
    });
    return;
  }
  if (variant === 'bonsai') {
    // a lacquer stand, a shallow pot, a twisted tree in cloud pads
    rect(g, 1, -19, 16, 2, LAQ_HI);
    rect(g, 1, -19, 16, 0.5, rgba(GOLD.mid, 0.7));
    rect(g, 3, -17, 1.6, 17, LAQ);
    rect(g, 13.4, -17, 1.6, 17, LAQ);
    rect(g, 3, -6, 12, 1, LAQ);
    rect(g, 4, -22, 10, 3, OX.lo);
    rect(g, 4, -22, 10, 0.5, rgba(GOLD.mid, 0.6));
    g.strokeStyle = '#3a2a1e';
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(9, -22);
    g.bezierCurveTo(6, -26, 13, -29, 9, -34);
    g.stroke();
    for (const [x, y, r] of [[5, -31, 4], [12, -33, 3.6], [9, -37, 3.4]]) {
      g.fillStyle = PLANT_C.b;
      g.beginPath();
      g.ellipse(x, y, r, r * 0.55, 0, 0, TAU);
      g.fill();
      g.fillStyle = PLANT_C.a;
      g.beginPath();
      g.ellipse(x, y + 0.6, r, r * 0.35, 0, 0, PI);
      g.fill();
    }
    return;
  }
  // ficus: geometric tiers of almond leaves on a central stem
  URN(g, 15, 13, 13);
  rect(g, 14.4, -50, 1.2, 37, '#2a1e16');
  const tiers = [[-52, 5, 7], [-45, 7, 9], [-37, 8, 10], [-29, 7, 10], [-22, 5, 8]];
  tiers.forEach(([y, n, len], ti) => {
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const a = -PI + 0.25 + t * (PI - 0.5);
      leaf(g, 15, y, len, a, 2.4, (i + ti) % 2 ? PLANT_C.a : PLANT_C.b, PLANT_C.vein);
    }
  });
  leaf(g, 15, -50, 8, -PI / 2, 2.4, PLANT_C.b, PLANT_C.vein);
}

function receptionPaint(g, w) {
  // a monitor (a bakelite cabinet with a dim jade face) and the bell, on the desk
  rect(g, 16, -44, 13, 10, '#2a1a12');
  rect(g, 18, -42.5, 9, 6.5, '#2c5a4a');
  rect(g, 18, -42.5, 9, 1.5, 'rgba(160,230,200,0.35)');
  rect(g, 21, -34.5, 3, 1, '#2a1a12');
  disc(g, w - 22, -35.5, 2.2, GOLD.mid);
  rect(g, w - 25, -34.6, 6, 0.8, GOLD.lo);
  // the streamline desk
  g.fillStyle = lacquerV(g, -34, 0, '#16131a', '#3a3440');
  rr(g, 0, -34, w, 34, 15);
  g.fill();
  rect(g, 8, -34, w - 16, 1.4, goldV(g, -34, -32.6, 0.1));
  for (const [y, a] of [[-23, 0.55], [-20, 0.45], [-17, 0.35]]) rect(g, 6, y, w - 12, 0.7, rgba(GOLD.mid, a));
  // EGGCORP egg emblem, small and dim
  g.fillStyle = rgba(GOLD.mid, 0.75);
  g.beginPath();
  g.ellipse(w / 2, -20, 3.2, 4.2, 0, 0, TAU);
  g.fill();
  rect(g, 4, -2, w - 8, 2, '#0a090c');
}

function receptionist(ctx, x, base, dy) {
  const cx = x + 62, y = base - 41 + dy;
  ctx.fillStyle = '#3a2a3a';
  rr(ctx, cx - 8, y + 4, 16, 9, 3);
  ctx.fill();
  disc(ctx, cx, y, 4.6, '#e2b48e');
  // finger-waved bob
  ctx.fillStyle = '#141014';
  ctx.beginPath();
  ctx.ellipse(cx, y - 1.6, 5.4, 3.8, 0, PI, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx - 4.4, y + 0.6, 1.8, 3.4, 0, 0, TAU);
  ctx.ellipse(cx + 4.4, y + 0.6, 1.8, 3.4, 0, 0, TAU);
  ctx.fill();
  rect(ctx, cx - 1.8, y + 0.2, 1, 0.8, INK);
  rect(ctx, cx + 0.8, y + 0.2, 1, 0.8, INK);
  rect(ctx, cx - 0.9, y + 2.4, 1.8, 0.7, OX.hi);
  for (let i = -3; i <= 3; i++) disc(ctx, cx + i * 1.4, y + 5.6 + Math.abs(i) * -0.3, 0.45, '#e9dfc8');
}

function turnstilesPaint(g, w) {
  const n = 4;
  for (let i = 0; i < n; i++) {
    const px = (i / (n - 1)) * (w - 6);
    if (i < n - 1) {
      // smoky glass flaps meeting in the gap
      const gx0 = px + 6, gx1 = (i + 1) / (n - 1) * (w - 6);
      const mid = (gx0 + gx1) / 2;
      for (const [a, b] of [[gx0, mid - 1], [mid + 1, gx1]]) {
        g.fillStyle = 'rgba(120,150,150,0.22)';
        rr(g, a, -20, b - a, 10, 2);
        g.fill();
        rect(g, a, -20, b - a, 0.5, rgba(GOLD.mid, 0.5));
      }
    }
    g.fillStyle = lacquerH(g, px, px + 6, '#141117', '#3a3440');
    rr(g, px, -24, 6, 24, 1.5);
    g.fill();
    rect(g, px - 0.5, -26, 7, 2.4, goldV(g, -26, -23.6, 0.1));
    rect(g, px + 1.6, -21, 2.8, 1.4, i % 2 ? '#2f7a64' : '#5a1e22');
  }
}

function sofaPaint(g, w) {
  const body = '#321014', hi = '#4c1b20';
  rect(g, 4, -2, w - 8, 2, GOLD.lo);
  g.fillStyle = lacquerV(g, -26, -10, body, hi);
  rr(g, 5, -26, w - 10, 16, 6);
  g.fill();
  g.strokeStyle = rgba('#1a0608', 0.7);
  g.lineWidth = 0.5;
  g.beginPath();
  for (let x = 12; x < w - 10; x += 6) {
    g.moveTo(x, -24);
    g.lineTo(x, -12);
  }
  g.stroke();
  g.fillStyle = lacquerV(g, -14, -2, body, hi);
  rr(g, 2, -14, w - 4, 12, 4);
  g.fill();
  for (const ax of [0, w - 12]) {
    g.fillStyle = lacquerV(g, -18, -2, body, hi);
    rr(g, ax, -18, 12, 16, 6);
    g.fill();
    rect(g, ax + 2, -15, 8, 0.5, rgba(GOLD.mid, 0.35));
  }
}

function sculpturePaint(g) {
  rect(g, 4, -18, 32, 18, lacquerV(g, -18, 0, '#141117', '#3a3440'));
  rect(g, 8, -22, 24, 4, lacquerV(g, -22, -18, '#141117', '#3a3440'));
  rect(g, 4, -18, 32, 0.7, rgba(GOLD.mid, 0.7));
  rect(g, 8, -22, 24, 0.7, rgba(GOLD.mid, 0.7));
  const cx = 20, cy = -36;
  g.strokeStyle = rgba(GOLD.lo, 0.8);
  g.lineWidth = 1;
  g.beginPath();
  g.ellipse(cx, cy, 15, 4, -0.35, PI, TAU);
  g.stroke();
  const eg = g.createRadialGradient(cx - 3, cy - 5, 1, cx, cy, 12);
  eg.addColorStop(0, '#b08a46');
  eg.addColorStop(0.6, '#6a4f26');
  eg.addColorStop(1, '#2e2210');
  g.fillStyle = eg;
  g.beginPath();
  g.ellipse(cx, cy, 8, 11, 0, 0, TAU);
  g.fill();
  rect(g, cx - 1.2, -25, 2.4, 3, '#4a3818');
  g.strokeStyle = rgba(GOLD.mid, 0.85);
  g.beginPath();
  g.ellipse(cx, cy, 15, 4, -0.35, 0, PI);
  g.stroke();
}

function coolerPaint(g) {
  g.fillStyle = lacquerH(g, 0, 14, '#2a2d34', '#6a707a');
  rr(g, 0, -28, 14, 28, 2);
  g.fill();
  for (const y of [-20, -12]) rect(g, 1, y, 12, 0.5, rgba(SILVER.hi, 0.35));
  rect(g, 3, -25, 2, 2, GOLD.mid);
  rect(g, 9, -25, 2, 2, OX.hi);
  g.fillStyle = 'rgba(80,140,140,0.5)';
  rr(g, 1.5, -44, 11, 16, 4);
  g.fill();
  rect(g, 1.5, -40, 11, 0.5, 'rgba(200,240,240,0.4)');
  rect(g, 3, -42, 1.4, 12, 'rgba(220,250,250,0.35)');
  rect(g, 5, -46, 4, 2.5, '#5a8a8a');
}

function copierPaint(g, w) {
  g.fillStyle = lacquerV(g, -26, 0, '#16131a', '#3a3440');
  rr(g, 0, -26, w, 26, 2.5);
  g.fill();
  rect(g, 1, -14, w - 2, 0.8, rgba(SILVER.mid, 0.55));
  rect(g, 1, -6, w - 2, 0.8, rgba(SILVER.mid, 0.4));
  rect(g, 1, -30, w - 2, 4, '#3a3c44');
  rect(g, 1, -30, w - 2, 0.6, rgba(SILVER.hi, 0.5));
  rect(g, w - 9, -23, 6, 4, '#0c0b0e');
  disc(g, w - 7.5, -21, 0.7, '#3fbf8a');
  disc(g, w - 4.6, -21, 0.7, '#d9a530');
  rect(g, w - 1, -18, 5, 1.4, '#2a2c32');
}

function cabinetPaint(g) {
  g.fillStyle = lacquerH(g, 0, 20, '#1e2b25', '#3e5248');
  g.fillRect(0, -44, 20, 44);
  rect(g, 0, -44, 20, 0.8, rgba(GOLD.mid, 0.6));
  for (let i = 0; i < 4; i++) {
    const y = -43 + i * 10.6;
    rect(g, 1.2, y + 1, 17.6, 9.2, rgba('#000000', 0.18));
    rect(g, 1.2, y + 10, 17.6, 0.5, rgba('#000000', 0.5));
    rect(g, 7, y + 3, 6, 1.6, rgba('#cfc2a0', 0.45));
    rect(g, 7.5, y + 6, 5, 1.1, GOLD.lo);
  }
}

function cubiclesPaint(g, m) {
  const W = m.x1 - m.x0;
  // monitors peeking over the empty desks (a dim jade glow) and a mug
  for (const d of m.desks) {
    if (d.occupied) continue;
    const dx = d.x - m.x0;
    rect(g, dx + 14, -43, 13, 10, '#2a1a12');
    rect(g, dx + 15.5, -41.5, 10, 6.5, '#264c40');
    rect(g, dx + 15.5, -41.5, 10, 1.2, 'rgba(160,230,200,0.3)');
    rect(g, dx + 29, -36.5, 3, 2.6, OX.mid);
  }
  for (let d = 0; d < m.desks.length; d++) {
    const dx = d * 40;
    // reeded smoky glass on top, walnut below
    rect(g, dx, -34, 40, 8, 'rgba(70,90,88,0.35)');
    for (let x = dx + 1; x < dx + 40; x += 1.6) rect(g, x, -34, 0.5, 8, 'rgba(200,220,215,0.12)');
    rect(g, dx, -26.6, 40, 0.8, goldV(g, -26.6, -25.8, 0.3));
    const pg = g.createLinearGradient(0, -26, 0, 0);
    pg.addColorStop(0, '#3a281c');
    pg.addColorStop(0.2, '#2a1c14');
    pg.addColorStop(1, '#160e0a');
    rect(g, dx, -26, 40, 26, pg);
    g.strokeStyle = rgba('#000000', 0.35);
    g.lineWidth = 0.4;
    g.beginPath();
    for (let x = dx + 4; x < dx + 38; x += 3) {
      g.moveTo(x, -23);
      g.lineTo(x, -3);
    }
    g.stroke();
    rect(g, dx + 4, -18, 32, 0.5, rgba(GOLD.mid, 0.25));
  }
  // posts and the brass cap
  for (let d = 0; d <= m.desks.length; d++) {
    const px = Math.min(W - 2, d * 40) - 1;
    rect(g, px, -36, 3, 36, '#0e0b0d');
    rect(g, px - 0.4, -37, 3.8, 1.6, goldV(g, -37, -35.4, 0.2));
  }
  rect(g, 0, -35, W, 1.2, goldV(g, -35, -33.8, 0.3));
}

const SKINS = ['#e2b48e', '#c68e64', '#8d5a3c', '#efc8a2'];
const HAIRS = ['#141014', '#4a2c18', '#c9a46a', '#8a8a8a'];
function head(ctx, x, y, seed, look, opts = {}) {
  const skin = SKINS[Math.floor(hash(seed * 3.1) * 4)];
  const hair = opts.grey ? (hash(seed) < 0.5 ? '#9a9a9a' : '#cfcfcf') : HAIRS[Math.floor(hash(seed * 5.7) * 4)];
  const style = Math.floor(hash(seed * 9.3) * 4);
  disc(ctx, x, y, 4.6, skin);
  ctx.fillStyle = hair;
  if (style === 0 || opts.grey) {
    ctx.beginPath();
    ctx.ellipse(x, y - 1.6, 4.9, 3.4, 0, PI, TAU);
    ctx.fill();
    if (opts.grey && hash(seed * 2) < 0.5) disc(ctx, x, y - 3, 2.6, skin);
  } else if (style === 1) {
    ctx.beginPath();
    ctx.ellipse(x, y - 1.4, 5.3, 3.8, 0, PI, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x - 4.2, y + 0.8, 1.7, 3.2, 0, 0, TAU);
    ctx.ellipse(x + 4.2, y + 0.8, 1.7, 3.2, 0, 0, TAU);
    ctx.fill();
  } else if (style === 2) {
    ctx.fillRect(x - 4.6, y - 1, 1.6, 2.6);
    ctx.fillRect(x + 3, y - 1, 1.6, 2.6);
  } else {
    // the green eyeshade
    ctx.beginPath();
    ctx.ellipse(x, y - 2.2, 4.8, 2.4, 0, PI, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(60,150,110,0.85)';
    ctx.beginPath();
    ctx.moveTo(x - 5.4, y - 2);
    ctx.lineTo(x + 5.4, y - 2);
    ctx.lineTo(x + 3.6 * look + 2, y + 0.2);
    ctx.lineTo(x + 3.6 * look - 2, y + 0.2);
    ctx.closePath();
    ctx.fill();
  }
  if (opts.asleep) {
    rect(ctx, x - 2.4, y + 0.6, 1.6, 0.5, INK);
    rect(ctx, x + 0.8, y + 0.6, 1.6, 0.5, INK);
  } else {
    rect(ctx, x - 2 + look * 1.1, y + 0.1, 1, 1, INK);
    rect(ctx, x + 1 + look * 1.1, y + 0.1, 1, 1, INK);
  }
}

function boardChairsPaint(g, m) {
  for (const c of m.chairs) {
    const cx = c.x - m.x0;
    const pts = [cx - 7, -18, cx - 7, -42, cx - 5, -42, cx - 5, -44.5, cx - 2.5, -44.5, cx - 2.5, -46, cx + 2.5, -46, cx + 2.5, -44.5, cx + 5, -44.5, cx + 5, -42, cx + 7, -42, cx + 7, -18];
    poly(g, pts);
    g.fillStyle = lacquerV(g, -46, -18, '#3a1216', '#5e2228');
    g.fill();
    g.fillStyle = rgba(GOLD.mid, 0.6);
    for (let y = -40; y < -20; y += 2.6) {
      g.fillRect(cx - 6.2, y, 0.6, 0.6);
      g.fillRect(cx + 5.6, y, 0.6, 0.6);
    }
    rect(g, cx - 0.3, -44, 0.6, 24, rgba('#000000', 0.4));
  }
}

function boardTablePaint(g, m) {
  const W = m.x1 - m.x0;
  for (const px of [W * 0.2, W * 0.8]) {
    rect(g, px - 5, -19, 10, 19, lacquerH(g, px - 5, px + 5, '#141117', '#3a3440'));
    rect(g, px - 8, -4, 16, 4, LAQ);
    rect(g, px - 8, -4, 16, 0.6, rgba(GOLD.mid, 0.6));
    rect(g, px - 5, -19, 0.6, 15, rgba(GOLD.mid, 0.4));
  }
  rect(g, -3, -27, W + 6, 6, lacquerV(g, -27, -21, '#1a161c', '#4e4654'));
  rect(g, -3, -27, W + 6, 0.8, rgba(GOLD.hi, 0.6));
  rect(g, -3, -22, W + 6, 1, goldV(g, -22, -21, 0.25));
  rect(g, 6, -21, W - 12, 4, '#0e0c10');
  sunburst(g, W / 2, -17, 1, 5, PI, TAU, 9, rgba(GOLD.mid, 0.55), null);
  for (const px of [W * 0.25, W * 0.75]) rect(g, px - 10, -20, 20, 0.6, rgba(GOLD.mid, 0.4));
  if (m.easel) {
    const ex = W + 6;
    line(g, ex + 12, -54, ex + 2, 0, '#2a1c14', 1.2);
    line(g, ex + 12, -54, ex + 22, 0, '#2a1c14', 1.2);
    line(g, ex + 12, -54, ex + 12, 0, '#1a120c', 0.8);
    rect(g, ex, -50, 24, 30, '#9c8e72');
    rect(g, ex, -50, 24, 2, '#3a2a1e');
    g.strokeStyle = OX.mid;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(ex + 3, -44);
    g.lineTo(ex + 9, -38);
    g.lineTo(ex + 13, -28);
    g.lineTo(ex + 17, -36);
    g.lineTo(ex + 21, -45);
    g.stroke();
    line(g, ex + 3, -24, ex + 21, -24, rgba(INK, 0.6), 0.5);
  }
}

function sitter(ctx, x, base, c) {
  const y = base - 40 + c.nod * 4;
  ctx.fillStyle = '#1e1f26';
  rr(ctx, x - 6.5, base - 36 + c.nod * 1.5, 13, 12, 3);
  ctx.fill();
  ctx.fillStyle = '#e8e0cc';
  poly(ctx, [x - 1.6, base - 35 + c.nod * 1.5, x + 1.6, base - 35 + c.nod * 1.5, x, base - 31 + c.nod * 1.5]);
  ctx.fill();
  head(ctx, x, y, c.seed + 11, 0, { grey: hash(c.seed * 1.7) < 0.7, asleep: c.nod > 0.55 });
}

function deskPaint(g, w) {
  // the high-back leather chair behind
  const cx = w * 0.55;
  g.fillStyle = lacquerV(g, -54, -20, '#3a1216', '#5e2228');
  rr(g, cx - 10, -54, 20, 34, 5);
  g.fill();
  g.strokeStyle = rgba('#1a0608', 0.7);
  g.lineWidth = 0.5;
  g.beginPath();
  for (let x = cx - 6; x <= cx + 6; x += 4) {
    g.moveTo(x, -51);
    g.lineTo(x, -30);
  }
  g.stroke();
  rect(g, cx - 10, -54, 20, 0.7, rgba(GOLD.mid, 0.5));
  // the desk: lacquer waterfall front with gold streamline lines
  g.fillStyle = lacquerV(g, -30, 0, '#5a301c', '#8a5232');
  rr(g, 0, -30, w, 30, 6);
  g.fill();
  g.save();
  rr(g, 0, -30, w, 30, 6);
  g.clip();
  const R = rng(91);
  for (let x = 0; x < w; x += 1 + R() * 2.5) {
    g.globalAlpha = 0.15 + R() * 0.25;
    rect(g, x, -30, 0.4 + R() * 1.2, 30, R() < 0.5 ? '#2a140a' : '#9a6038');
  }
  g.globalAlpha = 1;
  g.restore();
  rect(g, 0, -4, w, 4, '#1a0d08');
  rect(g, 2, -30, w - 4, 1.2, goldV(g, -30, -28.8, 0.1));
  for (const [y, a] of [[-22, 0.5], [-19.5, 0.4], [-17, 0.3]]) rect(g, 6, y, w - 12, 0.6, rgba(GOLD.mid, a));
  rect(g, w * 0.35, -14, w * 0.3, 10, '#2a160c');
  rect(g, w * 0.35, -14, w * 0.3, 0.6, rgba(GOLD.mid, 0.4));
  // the green banker's lamp and its warm pool
  const lx = 20;
  const pool = g.createRadialGradient(lx, -31, 1, lx, -31, 22);
  pool.addColorStop(0, 'rgba(255,210,130,0.45)');
  pool.addColorStop(1, 'rgba(255,210,130,0)');
  rect(g, lx - 24, -50, 48, 22, pool);
  rect(g, lx - 3, -31.5, 6, 1.5, GOLD.mid);
  rect(g, lx - 0.5, -38, 1, 7, GOLD.mid);
  g.fillStyle = '#2f7a4a';
  g.beginPath();
  g.ellipse(lx, -38, 7, 3.6, 0, PI, TAU);
  g.fill();
  rect(g, lx - 7, -38.4, 14, 1, '#ffe7a8');
  rect(g, lx - 5, -41, 3, 0.8, 'rgba(180,255,200,0.4)');
  disc(g, w - 26, -32, 2, GOLD.lo);
}

function globePaint(g) {
  rect(g, 2, -2, 14, 2, '#2a1c14');
  line(g, 9, -16, 3, -2, '#2a1c14', 1.2);
  line(g, 9, -16, 15, -2, '#2a1c14', 1.2);
  line(g, 9, -16, 9, -2, '#2a1c14', 1);
  const cx = 9, cy = -24;
  const sg = g.createRadialGradient(cx - 2.5, cy - 2.5, 1, cx, cy, 7.5);
  sg.addColorStop(0, '#3e6a5a');
  sg.addColorStop(1, '#14302a');
  disc(g, cx, cy, 7, sg);
  g.fillStyle = 'rgba(190,160,100,0.55)';
  for (const [x, y, rx, ry] of [[-2, -2, 2.8, 2], [2.6, 1.8, 2, 2.6], [-3, 3, 1.4, 1]]) {
    g.beginPath();
    g.ellipse(cx + x, cy + y, rx, ry, 0.5, 0, TAU);
    g.fill();
  }
  g.strokeStyle = GOLD.lo;
  g.lineWidth = 0.9;
  g.beginPath();
  g.arc(cx, cy, 8.6, -PI * 0.9, PI * 0.9 - PI);
  g.stroke();
  g.beginPath();
  g.arc(cx, cy, 8.6, PI * 0.1, PI * 0.9);
  g.stroke();
}

function tallclockPaint(g) {
  rect(g, 0, -16, 20, 16, lacquerV(g, -16, 0, '#141117', '#3a3440'));
  rect(g, -1, -2, 22, 2, LAQ);
  rect(g, 3, -50, 14, 34, lacquerH(g, 3, 17, '#141117', '#3a3440'));
  rect(g, 6, -46, 8, 26, '#0a080b');
  g.strokeStyle = rgba(GOLD.mid, 0.6);
  g.lineWidth = 0.5;
  g.strokeRect(6, -46, 8, 26);
  rect(g, 1, -66, 18, 16, lacquerV(g, -66, -50, '#141117', '#3a3440'));
  rect(g, 4, -69, 12, 3, goldV(g, -69, -66, 0.1));
  rect(g, 7, -71, 6, 2, goldV(g, -71, -69, 0.2));
  sunburst(g, 10, -58, 5.4, 7.8, 0, TAU, 16, rgba(GOLD.mid, 0.8), null);
  disc(g, 10, -58, 5.2, '#1a1416');
  line(g, 10, -58, 10, -61.8, GOLD.hi, 0.6);
  line(g, 10, -58, 12.6, -58, GOLD.hi, 0.6);
  rect(g, 1, -50.5, 18, 0.6, rgba(GOLD.mid, 0.6));
  rect(g, 0, -16, 20, 0.6, rgba(GOLD.mid, 0.6));
}

const MID_BOX = {
  plant: (m) => ({ palm: [-6, -74, 52, 76], snake: [-4, -38, 24, 40], bonsai: [-2, -42, 22, 44] }[m.variant] || [-4, -64, 38, 66]),
  reception: (m) => [-2, -50, m.w + 4, 52],
  turnstiles: (m) => [-2, -28, m.w + 4, 30],
  sofa: (m) => [-2, -28, m.w + 4, 30],
  sculpture: () => [-2, -56, 44, 58],
  cooler: () => [-2, -48, 18, 50],
  copier: (m) => [-2, -32, m.w + 8, 34],
  cabinet: () => [-2, -46, 24, 48],
  desk: (m) => [-6, -58, m.w + 12, 60],
  globe: () => [-2, -36, 22, 38],
  tallclock: () => [-3, -74, 26, 76],
};
const MID_PAINT = {
  plant: (g, m) => plantPaint(g, m.variant),
  reception: (g, m) => receptionPaint(g, m.w),
  turnstiles: (g, m) => turnstilesPaint(g, m.w),
  sofa: (g, m) => sofaPaint(g, m.w),
  sculpture: (g) => sculpturePaint(g),
  cooler: (g) => coolerPaint(g),
  copier: (g, m) => copierPaint(g, m.w),
  cabinet: (g) => cabinetPaint(g),
  desk: (g, m) => deskPaint(g, m.w),
  globe: (g) => globePaint(g),
  tallclock: (g) => tallclockPaint(g),
};

function midPass(ctx, f, B, k) {
  for (const m of f.mid.items) {
    const base = m.base;
    if (m.kind === 'cubicles') {
      const x0 = Math.round(m.x0 * k) / k;
      for (const d of m.desks) {
        if (!d.occupied) continue;
        const hx = x0 + (d.x - m.x0) + 20;
        const hy = base - 34 - 7 + d.dy - d.pop * 12;
        if (d.pop > 0) {
          ctx.fillStyle = '#2b2a33';
          rr(ctx, hx - 7, hy + 4, 14, 12, 3);
          ctx.fill();
          ctx.fillStyle = '#d8d0bc';
          poly(ctx, [hx - 2, hy + 4, hx + 2, hy + 4, hx, hy + 8]);
          ctx.fill();
          rect(ctx, hx - 0.6, hy + 5.5, 1.2, 5, OX.mid);
        }
        head(ctx, hx, hy, d.seed, d.pop > 0 ? d.look : 0);
      }
      blit(ctx, B.midSprite(`cub${m.i}`, () => [-4, -48, m.x1 - m.x0 + 8, 50], (g) => cubiclesPaint(g, m)), x0, base);
      continue;
    }
    if (m.kind === 'boardroom') {
      const x0 = Math.round(m.x0 * k) / k;
      const W = m.x1 - m.x0;
      blit(ctx, B.midSprite(`brc${m.i}`, () => [-4, -48, W + 8, 50], (g) => boardChairsPaint(g, m)), x0, base);
      for (const c of m.chairs) if (c.sitter) sitter(ctx, x0 + (c.x - m.x0), base, c);
      blit(ctx, B.midSprite(`brt${m.i}`, () => [-4, -58, W + 40, 60], (g) => boardTablePaint(g, m)), x0, base);
      continue;
    }
    const x = Math.round(m.x * k) / k;
    const key = `${m.kind}|${m.variant}|${m.w}`;
    const box = MID_BOX[m.kind];
    const paint = MID_PAINT[m.kind];
    if (!box || !paint) continue;
    blit(ctx, B.midSprite(key, () => box(m), (g) => paint(g, m)), x, base);
    if (m.kind === 'reception') receptionist(ctx, x, base, m.dy || 0);
    else if (m.kind === 'cooler' && m.bubble >= 0) {
      disc(ctx, x + 7 + Math.sin(m.bubble * 9) * 1.2, base - 30 - m.bubble * 12, 1.4 + m.bubble * 0.6, 'rgba(220,250,245,0.75)');
    } else if (m.kind === 'copier' && m.scan >= 0) {
      const sx = x + 2 + m.scan * (m.w - 6);
      const gl = ctx.createRadialGradient(sx + 1, base - 27, 0.5, sx + 1, base - 27, 7);
      gl.addColorStop(0, 'rgba(120,255,200,0.55)');
      gl.addColorStop(1, 'rgba(120,255,200,0)');
      rect(ctx, sx - 6, base - 33, 14, 12, gl);
      rect(ctx, sx, base - 27, 2, 1.4, '#bfffe4');
    } else if (m.kind === 'tallclock') {
      const a = m.swing * 0.22;
      const px = x + 10, py = base - 45;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 6, base - 46, 8, 26);
      ctx.clip();
      line(ctx, px, py, px + Math.sin(a) * 20, py + Math.cos(a) * 20, GOLD.lo, 0.6);
      disc(ctx, px + Math.sin(a) * 21, py + Math.cos(a) * 21, 2.2, goldV(ctx, py + 18, py + 24));
      ctx.restore();
    }
  }
}

// ================================================================== FRONT
function paintFront(ctx, f) {
  for (const it of f.front) {
    if (it.kind === 'pillar') {
      const x = it.x, w = it.w;
      ctx.save();
      const gr = ctx.createLinearGradient(x - 5, 0, x + w + 5, 0);
      gr.addColorStop(0, 'rgba(5,4,7,0)');
      gr.addColorStop(0.1, 'rgba(5,4,7,0.62)');
      gr.addColorStop(0.24, 'rgba(34,30,38,0.64)');
      gr.addColorStop(0.42, 'rgba(8,7,11,0.66)');
      gr.addColorStop(0.9, 'rgba(4,3,6,0.68)');
      gr.addColorStop(1, 'rgba(4,3,6,0)');
      rect(ctx, x - 5, 0, w + 10, FRAME_H, gr);
      for (let i = 1; i < 6; i++) {
        const fx = x + (w * i) / 6;
        rect(ctx, fx - 0.5, 26, 1, 220, 'rgba(0,0,0,0.35)');
        rect(ctx, fx + 0.5, 26, 0.6, 220, i < 3 ? 'rgba(201,162,74,0.16)' : 'rgba(201,162,74,0.07)');
      }
      ctx.globalAlpha = 0.55;
      rect(ctx, x - 4, 8, w + 8, 4, goldV(ctx, 8, 12, 0.2));
      rect(ctx, x - 2, 12, w + 4, 3, goldV(ctx, 12, 15, 0.35));
      rect(ctx, x, 15, w, 2.5, goldV(ctx, 15, 17.5, 0.5));
      rect(ctx, x - 2, 248, w + 4, 3, goldV(ctx, 248, 251, 0.4));
      rect(ctx, x - 4, 251, w + 8, 5, goldV(ctx, 251, 256, 0.3));
      ctx.restore();
    } else if (it.kind === 'plant') {
      const x = it.x;
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#07120e';
      for (const [a, len, wd] of [[-2.2, 40, 5], [-1.9, 46, 5], [-1.57, 40, 4.5], [-1.25, 46, 5], [-0.95, 40, 5], [-2.5, 30, 4], [-0.65, 30, 4]]) {
        ctx.save();
        ctx.translate(x, FRAME_H + 8);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(len * 0.5, -wd, len, 0);
        ctx.quadraticCurveTo(len * 0.5, wd, 0, 0);
        ctx.fill();
        ctx.restore();
      }
      ctx.strokeStyle = 'rgba(201,162,74,0.25)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(x - 30, FRAME_H - 4);
      ctx.lineTo(x + 30, FRAME_H - 4);
      ctx.stroke();
      ctx.restore();
    } else {
      // a chair back rising from the bottom edge: an office swivel back, or a club chair
      const x = it.x;
      const club = it.kind === 'armchair';
      const w = club ? 56 : 36;
      const top = club ? 240 : 242;
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = club ? '#16060a' : '#0d0b10';
      rr(ctx, x - w / 2, top, w, FRAME_H - top + 20, club ? 14 : 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(201,162,74,0.35)';
      ctx.lineWidth = 0.7;
      rr(ctx, x - w / 2 + 3, top + 3, w - 6, FRAME_H - top + 20, club ? 11 : 6);
      ctx.stroke();
      if (club) {
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        for (let xx = x - w / 2 + 10; xx < x + w / 2 - 6; xx += 7) {
          ctx.moveTo(xx, top + 6);
          ctx.lineTo(xx, FRAME_H);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

// ================================================================== cache
const CACHE = new Map();
function bake(fl, k) {
  const key = `${fl}|${k}`;
  let B = CACHE.get(key);
  if (B) return B;
  const F = OFFICE_FLOORS[fl];
  const G = F.glass;
  const skyTop = Math.max(0, G.top - 4);
  const outBot = G.bottom + 2;
  const sprites = new Map();
  const cars = new Map();
  const blimps = new Map();
  const lights = new Map();
  const lifts = new Map();
  B = {
    sky: bakeSky(fl, k),
    far: bakeStrip(k, 1400, skyTop, outBot, paintFar(fl)),
    near: bakeStrip(k, 1200, skyTop, outBot, paintNear(fl)),
    wall: bakeStrip(k, F.wall.period, F.ceilingY - 1, WALL_BASE, paintWall(fl)),
    ceiling: bakeStrip(k, F.lights.period, 0, F.ceilingY, paintCeiling(fl)),
    slab: bakeSlab(fl, k),
    clouds: F.outside.clouds.map((c) => cloudSprite(k, c.w, c.h, fl)),
    car: (kind, dir) => {
      const ck = `${kind}${dir}`;
      if (!cars.has(ck)) cars.set(ck, carSprite(k, kind, dir));
      return cars.get(ck);
    },
    blimp: (dir, label) => {
      if (!blimps.has(dir)) blimps.set(dir, blimpSprite(k, dir, label));
      return blimps.get(dir);
    },
    light: (variant, on) => {
      const lk = `${variant}${on}`;
      if (!lights.has(lk)) lights.set(lk, lightSprite(k, variant, on));
      return lights.get(lk);
    },
    liftParts: (w, h) => {
      const lk = `${w}x${h}`;
      if (!lifts.has(lk)) {
        lifts.set(lk, {
          car: sprite(k, 0, 0, w, h, (g) => carPaint(g, fl, w, h)),
          leafL: sprite(k, 0, 0, w / 2, h, (g) => leafPaint(g, fl, w / 2, h, 1)),
          leafR: sprite(k, 0, 0, w / 2, h, (g) => leafPaint(g, fl, w / 2, h, -1)),
        });
      }
      return lifts.get(lk);
    },
    midSprite: (mk, box, paint) => {
      let s = sprites.get(mk);
      if (!s) {
        const [x0, y0, w, h] = box();
        s = sprite(k, x0, y0, w, h, paint);
        sprites.set(mk, s);
      }
      return s;
    },
  };
  CACHE.set(key, B);
  return B;
}

function scaleOf(ctx) {
  const m = ctx.getTransform ? ctx.getTransform() : null;
  const k = m ? Math.hypot(m.a, m.b) : 1;
  return Math.min(4, Math.max(1, Math.ceil(k * 2 - 0.01) / 2));
}

export const STYLE = {
  id: 'deco',
  name: 'ART DECO — the 1930s tower',
  note: 'The climb as a 1930s skyscraper: black lacquer and gold-leaf line, rouge and black marble, macassar ebony, '
    + 'fluted columns with stepped gold capitals and sunbursts everywhere. The lift doors are the jewels — marquetry '
    + 'sunbursts under a brass dial whose needle swings in as the car arrives. Outside is a Cassandre poster by '
    + 'morning and noon and a Ferriss charcoal city at dusk with searchlights sweeping; the founder, the silver professor, '
    + 'hangs in a stepped gilt frame as a de Lempicka oil. Everything behind the lane is dark and low in contrast, over black stone with a gold nosing.',
  paint(ctx, f) {
    const k = scaleOf(ctx);
    const B = bake(f.floor, k);
    const F = OFFICE_FLOORS[f.floor];
    const dW = snapOff(f.wall.shift, f.wall.period, k);
    // 1. outside, seen only through the glass
    ctx.save();
    ctx.beginPath();
    let any = false;
    for (const b of f.wall.bays) {
      if (b.type !== 'glass') continue;
      ctx.rect(b.x0 + dW - 1, f.glass.top - 1, b.x1 - b.x0 + 2, f.glass.bottom - f.glass.top + 2);
      any = true;
    }
    if (any) {
      ctx.clip();
      outside(ctx, f, B, k, dW);
    }
    ctx.restore();
    // 2. the wall and its live parts
    drawStrip(ctx, B.wall, f.wall.shift, k);
    ctx.save();
    ctx.translate(dW, 0);
    for (const h of f.wall.hangs) {
      if (h.kind === 'lift') liftLive(ctx, B, f.floor, h, f.t);
      else if (h.kind === 'clock') clockHands(ctx, f, f.floor, h.cx, h.cy, h.r);
    }
    for (const b of f.wall.bays) if (b.revolvingDoor != null) revolvingLive(ctx, b.revolvingDoor, F, f.revolving);
    ctx.restore();
    // 3. ceiling and fixtures
    const lightShift = f.lights.length ? (() => {
      const l = f.lights[0];
      return F.lights.us[l.i] - l.x;
    })() : 0;
    const dL = drawStrip(ctx, B.ceiling, lightShift, k);
    drawLights(ctx, f, B, dL);
    // 4. the floor plane, the slab, then the furniture on the floor
    floorPass(ctx, f, B, k, dW);
    slabPass(ctx, f, B, k);
    midPass(ctx, f, B, k);
  },
  paintFront(ctx, f) {
    paintFront(ctx, f);
  },
};
