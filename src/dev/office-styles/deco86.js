// CORPORATE KOMBAT style bake-off — DECO '86, POSTMODERN. The art deco card's hand moved to
// 1986, when corporate America built deco all over again: Philip Johnson's AT&T
// "Chippendale" top, Michael Graves's keystones and pastel Portland Building, the PPG glass
// castle, Trump Tower's pink marble and brass atrium. Same geometry, sunbursts, stepped forms
// and crisp planes as `deco`; the materials and props are the decade's: rose granite, peach
// marble and plaster, teal and seafoam, brass and chrome, glass block, vertical blinds,
// neon-tube lettering, LED floor counters, Successories posters, beige terminals and a fax,
// a Memphis confetti carpet. Tacky in what it is made of, still elegant in how it is drawn.
//
// Legibility: the pastels live up the walls; everything behind the lane (dado, furniture,
// floor) is mid-to-dark and low in contrast, so a pale printer, white paperwork and the dark
// dog all read. The slab is black granite under a brass nosing.
//
// Machinery as in deco.js: still things baked once per device scale into u-space strips
// (512 px tiles) and sprites; everything that moves is read off the frame.
import { OFFICE_FLOORS, FRAME_W, FRAME_H, WALL_BASE, LANE_TOP } from './plan.js';

const TAU = Math.PI * 2;
const PI = Math.PI;
const mod = (a, n) => ((a % n) + n) % n;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (t) => t * t * (3 - 2 * t);

// ------------------------------------------------------------------ palette
const INK = '#120e16';
const LAQ = '#1c1620';
const LAQ_HI = '#3c3244';
const GOLD = { hi: '#f7e6a8', mid: '#caa456', lo: '#8e6c30', dk: '#4f3a18' }; // brass, not leaf
const CREAM = '#f6e8dc';
const IVORY = '#f3e4d4';
const JADE = { hi: '#a8ecd8', mid: '#36a394', lo: '#1f6e68', dk: '#123e3e' }; // teal and seafoam
const OX = { hi: '#c95c84', mid: '#8e3058', lo: '#5c2040', dk: '#2e1022' }; // burgundy-mauve
const SILVER = { hi: '#f4f6f8', mid: '#c4cad2', lo: '#858c96', dk: '#4c525a' }; // chrome
const ROSE = { hi: '#f2c4b8', mid: '#d99a92', lo: '#a8686c', dk: '#6e3e48', deep: '#4a2630' };
const PEACH = { hi: '#fbe0c8', mid: '#f2c4a2', lo: '#d89a7a' };
const TERRA = '#c8785a';
const NEON = { pink: '#ff5aa8', cyan: '#5ff2ff', violet: '#b672ff', red: '#ff3b3b' };

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

function chromeV(g, y0, y1) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, SILVER.lo);
  gr.addColorStop(0.3, SILVER.hi);
  gr.addColorStop(0.55, SILVER.mid);
  gr.addColorStop(1, SILVER.dk);
  return gr;
}
function chromeH(g, x0, x1) {
  const gr = g.createLinearGradient(x0, 0, x1, 0);
  gr.addColorStop(0, SILVER.dk);
  gr.addColorStop(0.3, SILVER.hi);
  gr.addColorStop(0.55, SILVER.mid);
  gr.addColorStop(1, SILVER.dk);
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

// Granite: a fine speckle of light and dark grains, seeded.
function speckle(g, x0, y0, w, h, seed, cols, density = 1) {
  const R = rng(seed);
  const n = Math.round(w * h * 0.3 * density);
  for (let i = 0; i < n; i++) {
    g.globalAlpha = 0.2 + R() * 0.45;
    g.fillStyle = cols[(R() * cols.length) | 0];
    const sz = 0.3 + R() * 0.6;
    g.fillRect(x0 + R() * w, y0 + R() * h, sz, sz);
  }
  g.globalAlpha = 1;
}

// A neon tube: a wide soft glow, a tighter one, the tube, a hot core. Strokes the path.
function neonStroke(g, col, lw, cap = 'round') {
  g.lineCap = cap;
  g.lineJoin = 'round';
  g.strokeStyle = rgba(col, 0.12);
  g.lineWidth = lw * 6;
  g.stroke();
  g.strokeStyle = rgba(col, 0.28);
  g.lineWidth = lw * 3;
  g.stroke();
  g.strokeStyle = col;
  g.lineWidth = lw * 1.3;
  g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.75)';
  g.lineWidth = lw * 0.45;
  g.stroke();
}
function neonLine(g, x0, x1, y, col, lw = 0.8) {
  g.beginPath();
  g.moveTo(x0, y);
  g.lineTo(x1, y);
  neonStroke(g, col, lw, 'butt');
}
function neonText(g, str, x, y, h, col, o = {}) {
  textPath(g, str, x, y, h, o.track ?? 2.6, o.align ?? 'center');
  neonStroke(g, col, o.lw ?? h * 0.09);
}

// Glass block: a grid of pale cells, each with a soft bright centre.
function glassBlock(g, x, y, w, h, cell, tint = '#cfe8ea') {
  for (let yy = y; yy < y + h - 0.5; yy += cell) {
    for (let xx = x; xx < x + w - 0.5; xx += cell) {
      const cw = Math.min(cell, x + w - xx), ch = Math.min(cell, y + h - yy);
      const gr = g.createRadialGradient(xx + cw / 2, yy + ch / 2, 0.3, xx + cw / 2, yy + ch / 2, cell * 0.7);
      gr.addColorStop(0, 'rgba(255,255,255,0.5)');
      gr.addColorStop(1, rgba(tint, 0.3));
      g.fillStyle = gr;
      g.fillRect(xx + 0.4, yy + 0.4, cw - 0.8, ch - 0.8);
    }
  }
  g.strokeStyle = 'rgba(140,160,166,0.6)';
  g.lineWidth = 0.5;
  g.beginPath();
  for (let yy = y; yy <= y + h + 0.1; yy += cell) {
    g.moveTo(x, yy);
    g.lineTo(x + w, yy);
  }
  for (let xx = x; xx <= x + w + 0.1; xx += cell) {
    g.moveTo(xx, y);
    g.lineTo(xx, y + h);
  }
  g.stroke();
}

// The striped sunset of every record sleeve that year. `gap` fills the stripes (the sky).
function sunsetDisc(g, cx, cy, r, stripes, gap) {
  const sg = g.createLinearGradient(0, cy - r, 0, cy + r);
  sg.addColorStop(0, '#fff3a8');
  sg.addColorStop(0.45, '#ffb070');
  sg.addColorStop(0.75, '#ff6a8a');
  sg.addColorStop(1, '#d8408e');
  g.save();
  g.beginPath();
  g.arc(cx, cy, r, 0, TAU);
  g.clip();
  g.fillStyle = sg;
  g.fillRect(cx - r, cy - r, r * 2, r * 2);
  if (gap) {
    g.fillStyle = gap;
    for (let i = 0; i < stripes; i++) {
      const t = i / stripes;
      g.fillRect(cx - r, cy + r * 0.08 + t * r * 0.92, r * 2, 0.4 + t * r * 0.14);
    }
  }
  g.restore();
}

// A seven-segment LED digit (and a G for the ground floor).
const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', G: 'afedc' };
function sevenSeg(ctx, ch, x, y, w, h, on, off) {
  const t = Math.max(0.55, w * 0.2);
  const segs = {
    a: [x + t * 0.5, y, w - t, t], d: [x + t * 0.5, y + h - t, w - t, t], g: [x + t * 0.5, y + h / 2 - t / 2, w - t, t],
    f: [x, y + t * 0.5, t, h / 2 - t * 0.5], b: [x + w - t, y + t * 0.5, t, h / 2 - t * 0.5],
    e: [x, y + h / 2, t, h / 2 - t * 0.5], c: [x + w - t, y + h / 2, t, h / 2 - t * 0.5],
  };
  const lit = SEG[ch] || '';
  for (const key of 'abcdefg') {
    ctx.fillStyle = lit.includes(key) ? on : off;
    const [sx, sy, sw, sh] = segs[key];
    ctx.fillRect(sx, sy, sw, sh);
  }
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
    sky: [[20, '#8db8d8'], [80, '#b8cfe2'], [140, '#f0d0cc'], [190, '#f8d6b8']],
    far: { face: ['#c8b8cc', '#b6c0d4', '#d0c0c4'], lit: '#f4e8ea', shade: '#9aa0bc', pier: '#e8dee6' },
    near: { face: ['#e0b2a8', '#94c2c8', '#eecdb2'], lit: '#fbeee6', shade: '#9a8494', win: '#7f8ea6', spandrel: '#c6a4a2' },
    cloud: { body: '#fdf3f0', shade: '#f2d6d8', line: '#dcb0bc' },
  },
  open: {
    sky: [[56, '#76aad2'], [100, '#a6c8e2'], [152, '#e8dcd8']],
    far: { face: ['#b8c6de', '#aab8d4', '#c8cee0'], lit: '#eef0f8', shade: '#8e9cc0', pier: '#e0e4f0' },
    near: { face: ['#dcaea6', '#8cbec4', '#eacdb2'], lit: '#fbeee6', shade: '#94848e', win: '#7888a2', spandrel: '#c0a29e' },
    cloud: { body: '#fefaf6', shade: '#ecdcdc', line: '#d4b8c0' },
  },
  exec: {
    sky: [[28, '#170f34'], [70, '#311f58'], [112, '#682c72'], [146, '#b0447a'], [168, '#ee7a6c'], [186, '#f8a87a'], [204, '#fbc890']],
    far: { face: ['#2e2244', '#36284e', '#2a1f40'], lit: '#58447e', shade: '#1e1630', pier: '#48386c', win: '#ffd27a' },
    near: { face: ['#241b38', '#2c2244', '#201833'], lit: '#5c4a84', shade: '#140f22', win: '#ffcf7a', rim: '#ff7aa8' },
    cloud: { body: '#4a2a5c', shade: '#331f42', line: '#ff8a8a' },
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
    // an airbrushed morning: soft pink rays round a pearly sun
    const rg = g.createRadialGradient(sun.x, sun.y, sun.r, sun.x, sun.y, 460);
    rg.addColorStop(0, 'rgba(255,238,238,0.32)');
    rg.addColorStop(0.35, 'rgba(255,222,228,0.11)');
    rg.addColorStop(1, 'rgba(255,222,228,0)');
    g.fillStyle = rg;
    const n = 36;
    for (let i = 0; i < n; i += 2) {
      g.beginPath();
      g.moveTo(sun.x, sun.y);
      g.arc(sun.x, sun.y, 560, (i / n) * TAU, ((i + 1) / n) * TAU);
      g.closePath();
      g.fill();
    }
    const halo = g.createRadialGradient(sun.x, sun.y, sun.r * 0.6, sun.x, sun.y, sun.r * 3.2);
    halo.addColorStop(0, 'rgba(255,250,244,0.65)');
    halo.addColorStop(1, 'rgba(255,232,232,0)');
    rect(g, sun.x - sun.r * 3.2, sun.y - sun.r * 3.2, sun.r * 6.4, sun.r * 6.4, halo);
    const dg = g.createRadialGradient(sun.x - 4, sun.y - 4, 2, sun.x, sun.y, sun.r);
    dg.addColorStop(0, '#ffffff');
    dg.addColorStop(1, '#ffd6c6');
    disc(g, sun.x, sun.y, sun.r, dg);
    for (const [y, a, w] of [[120, 0.12, 0.6], [132, 0.16, 0.7], [146, 0.2, 0.8], [158, 0.24, 1], [168, 0.3, 1.2]]) {
      rect(g, 0, y, FRAME_W, w, `rgba(255,236,236,${a})`);
    }
  } else if (fl === 'open') {
    for (const [y, a, w] of [[118, 0.1, 0.6], [128, 0.14, 0.7], [138, 0.18, 0.9], [145, 0.22, 1.1]]) {
      rect(g, 0, y, FRAME_W, w, `rgba(255,244,240,${a})`);
    }
    const rg = g.createRadialGradient(40, 40, 10, 40, 40, 260);
    rg.addColorStop(0, 'rgba(255,250,244,0.3)');
    rg.addColorStop(1, 'rgba(255,250,244,0)');
    rect(g, 0, 0, FRAME_W, H, rg);
  } else {
    // peach to violet: a glow, then the striped sun, then haze bars drawn through it
    const glow = g.createRadialGradient(sun.x, sun.y, 4, sun.x, sun.y, 140);
    glow.addColorStop(0, 'rgba(255,206,150,0.6)');
    glow.addColorStop(0.5, 'rgba(255,120,160,0.18)');
    glow.addColorStop(1, 'rgba(255,120,160,0)');
    rect(g, 0, 0, FRAME_W, H, glow);
    const rg = g.createRadialGradient(sun.x, sun.y, sun.r, sun.x, sun.y, 300);
    rg.addColorStop(0, 'rgba(255,170,200,0.22)');
    rg.addColorStop(1, 'rgba(255,170,200,0)');
    g.fillStyle = rg;
    const n = 26;
    for (let i = 0; i < n; i += 2) {
      g.beginPath();
      g.moveTo(sun.x, sun.y);
      g.arc(sun.x, sun.y, 420, PI + (i / n) * PI, PI + ((i + 1) / n) * PI);
      g.closePath();
      g.fill();
    }
    sunsetDisc(g, sun.x, sun.y, sun.r * 1.15, 6, gr);
    for (const [y, x0, x1, h, col] of [[154, sun.x - 110, sun.x + 220, 1.4, '#c0508a'], [160, sun.x - 60, sun.x + 160, 1, '#ee6c8c'],
      [172, sun.x - 150, sun.x + 120, 1.3, '#f48c7c'], [148, sun.x + 40, sun.x + 300, 0.8, '#7a3a8c']]) {
      g.fillStyle = col;
      rr(g, x0, y, x1 - x0, h, h / 2);
      g.fill();
    }
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
  const day = fl !== 'exec';
  const cx = x + w / 2;
  const tiers = [];
  if (b.roof === 'stepped' || (fl === 'open' && kind === 'near' && b.roof === 'flat' && b.tone !== 1)) {
    const s1 = b.roof === 'flat' ? 6 : Math.max(6, Math.min(14, (base - top) * 0.1));
    tiers.push([x + w * 0.28, x + w * 0.72, top]);
    tiers.push([x + w * 0.14, x + w * 0.86, top + s1]);
    tiers.push([x, x + w, top + s1 * 2]);
  } else tiers.push([x, x + w, top]);
  const neon = !day && kind === 'near' ? [NEON.pink, NEON.cyan, NEON.violet][b.i % 3] : null;
  // roofs that stand above the body
  if (b.roof === 'spire') {
    // a PPG glass castle: a ridge of glass pinnacles, the tallest in the middle
    const n = Math.max(3, Math.round(w / 7));
    const pw = w / n;
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const hh = 7 + (1 - Math.abs(i - (n - 1) / 2) / (n / 2)) * 17;
      const px0 = x + i * pw;
      g.fillStyle = face;
      poly(g, [px0, top + 0.5, px0 + pw / 2, top - hh, px0 + pw, top + 0.5]);
      g.fill();
      g.fillStyle = rgba(day ? L.lit : L.lit, day ? 0.55 : 0.4);
      poly(g, [px0, top + 0.5, px0 + pw / 2, top - hh, px0 + pw / 2, top + 0.5]);
      g.fill();
      if (neon) {
        g.beginPath();
        g.moveTo(px0, top);
        g.lineTo(px0 + pw / 2, top - hh);
        g.lineTo(px0 + pw, top);
        neonStroke(g, neon, 0.35);
      }
    }
  } else if (b.roof === 'antenna') {
    rect(g, cx - w * 0.2, top - 5, w * 0.4, 5, face);
    rect(g, cx - w * 0.12, top - 9, w * 0.24, 4, face);
    rect(g, cx - 0.7, top - 28, 1.4, 19, day ? mixc(face, L.shade, 0.4) : '#3a3050');
    disc(g, cx, top - 28, 1.3, day ? mixc(face, L.shade, 0.4) : '#ff4a4a');
  } else if (b.roof === 'tank') {
    // the water tank stays — it is still New York — in a teal cap
    const tw = kind === 'near' ? 17 : 11;
    const th = kind === 'near' ? 13 : 9;
    const tx = x + w * 0.28;
    const tc = kind === 'near' ? '#a87a66' : face;
    rect(g, tx - 1.5, top - 3, tw + 3, 3, mixc(face, '#000000', 0.2));
    for (const lx of [tx + 2, tx + tw / 2, tx + tw - 2]) rect(g, lx - 0.4, top - 7, 0.8, 4, mixc(face, '#2a2a2a', 0.5));
    rect(g, tx, top - 7 - th, tw, th, tc);
    rect(g, tx, top - 7 - th, tw * 0.25, th, mixc(tc, '#ffffff', 0.2));
    rect(g, tx + tw * 0.8, top - 7 - th, tw * 0.2, th, mixc(tc, '#000000', 0.2));
    for (let q = 1; q < 4; q++) rect(g, tx, top - 7 - th + (th * q) / 4, tw, 0.6, mixc(tc, '#3a2a22', 0.4));
    g.fillStyle = JADE.lo;
    poly(g, [tx - 1, top - 7 - th, tx + tw / 2, top - 13 - th, tx + tw + 1, top - 7 - th]);
    g.fill();
  } else if (b.roof === 'billboard') {
    // an '86 billboard: a sunset, a chrome egg, the name in a pink stripe
    const bx = x + 8, bw = w - 16, by = top - 18;
    line(g, bx + 4, top, bx + 4, by + 12, '#4a4a4a', 0.8);
    line(g, bx + bw - 4, top, bx + bw - 4, by + 12, '#4a4a4a', 0.8);
    const bgr = g.createLinearGradient(0, by, 0, by + 12);
    bgr.addColorStop(0, '#3a2a6a');
    bgr.addColorStop(1, '#e86a9a');
    rect(g, bx, by, bw, 12, INK);
    rect(g, bx + 0.5, by + 0.5, bw - 1, 11, bgr);
    sunsetDisc(g, bx + 10, by + 9, 5.5, 3, bgr);
    g.fillStyle = SILVER.hi;
    g.beginPath();
    g.ellipse(bx + 10, by + 6, 2.2, 3, 0, 0, TAU);
    g.fill();
    if (bw > 40) decoText(g, 'EGGCORP', bx + bw * 0.62, by + 3.8, 4.2, { color: '#fff0f6', lw: 0.6, track: 2 });
  } else if (kind === 'near' && day && (b.roof === 'cornice' || (b.roof === 'flat' && b.tone === 0))) {
    // the Chippendale top: a broken pediment with a round notch at its apex
    const ph = Math.min(w * 0.3, 24);
    const nr = Math.max(2.4, w * 0.075);
    const slope = ph / (w / 2);
    const ny = top - ph + nr * slope;
    const pf = b.tone === 1 ? '#7ab4c0' : mixc(face, '#ffffff', 0.08);
    g.fillStyle = pf;
    g.beginPath();
    g.moveTo(x, top + 0.5);
    g.lineTo(cx - nr, ny);
    g.arc(cx, ny, nr, PI, 0, true);
    g.lineTo(x + w, top + 0.5);
    g.closePath();
    g.fill();
    // the left slope catches the morning light, the right falls into shade
    g.fillStyle = rgba(L.lit, 0.55);
    poly(g, [x, top + 0.5, cx - nr, ny, cx - nr, ny + 2.4, x + 4, top + 0.5]);
    g.fill();
    g.fillStyle = rgba(L.shade, 0.45);
    poly(g, [x + w, top + 0.5, cx + nr, ny, cx + nr, ny + 2.4, x + w - 4, top + 0.5]);
    g.fill();
    g.strokeStyle = rgba(L.shade, 0.8);
    g.lineWidth = 0.6;
    g.beginPath();
    g.moveTo(x, top + 0.3);
    g.lineTo(cx - nr, ny);
    g.arc(cx, ny, nr, PI, 0, true);
    g.lineTo(x + w, top + 0.3);
    g.stroke();
    // a round window under the notch, and the entablature
    disc(g, cx, top - ph * 0.3, Math.max(1.6, nr * 0.5), L.win);
    rect(g, x - 1.5, top, w + 3, 2.6, mixc(face, '#000000', 0.15));
    rect(g, x - 1.5, top, w + 3, 0.7, rgba(L.lit, 0.8));
  }
  for (const [x0, x1, yt] of tiers) rect(g, x0, yt, x1 - x0, base - yt, face);
  for (let ti = 0; ti < tiers.length; ti++) {
    const [x0, x1, yt] = tiers[ti];
    const yb = ti < tiers.length - 1 ? tiers[ti + 1][2] : base;
    const tw = x1 - x0;
    if (!day) {
      rect(g, x0, yt, Math.max(1, tw * 0.18), base - yt, rgba(L.lit, 0.5));
      rect(g, x1 - 0.8, yt, 0.8, base - yt, rgba(L.rim || L.lit, 0.55));
    } else if (kind === 'near' && b.tone === 1) {
      // mirror glass: the sky and its clouds slid down the face, ribbon mullions
      const mg = g.createLinearGradient(0, yt, 0, base);
      mg.addColorStop(0, '#b6dbe6');
      mg.addColorStop(0.5, '#6aa6b6');
      mg.addColorStop(1, '#3e7a8c');
      rect(g, x0, yt, tw, base - yt, mg);
      g.fillStyle = 'rgba(255,255,255,0.18)';
      for (let k2 = 0; k2 < 3; k2++) {
        const sx = x0 + ((b.i * 37 + k2 * 53) % 100) / 100 * tw;
        poly(g, [sx, yt, sx + 10, yt, sx - 30, base, sx - 40, base]);
        g.fill();
      }
      for (let y = yt + 3; y < base; y += b.floorH) rect(g, x0, y, tw, 0.6, 'rgba(30,60,70,0.45)');
      for (let c = 1; c < b.cols; c++) rect(g, x0 + (tw * c) / b.cols, yt, 0.4, base - yt, 'rgba(230,250,250,0.3)');
      continue;
    } else {
      rect(g, x0, yt, tw * 0.2, base - yt, rgba(L.lit, 0.55));
      rect(g, x1 - tw * 0.16, yt, tw * 0.16, base - yt, rgba(L.shade, 0.35));
    }
    if (yb - yt > 4) {
      if (day && kind === 'near' && b.tone === 0) {
        // pink granite, small punched square windows: Graves
        const cols = Math.max(2, Math.round(tw / 9));
        const cw = (tw - 4) / cols;
        for (let y = yt + 4; y < (ti < tiers.length - 1 ? yb : base) - 5; y += b.floorH) {
          for (let c = 0; c < cols; c++) rect(g, x0 + 2 + c * cw + cw * 0.3, y, cw * 0.4, Math.min(cw * 0.4, b.floorH * 0.5), L.win);
        }
      } else facadeGrid(g, x0 + tw * 0.06, x1 - tw * 0.06, yt + 2, ti < tiers.length - 1 ? yb : base, b, L, kind, fl);
    }
  }
  if (neon && (b.roof === 'stepped' || b.roof === 'spire')) {
    // neon picks out the crown
    for (let ti = 0; ti < Math.min(2, tiers.length); ti++) {
      const [x0, x1, yt] = tiers[ti];
      g.beginPath();
      g.moveTo(x0, yt + 22);
      g.lineTo(x0, yt);
      g.lineTo(x1, yt);
      g.lineTo(x1, yt + 22);
      neonStroke(g, neon, 0.35);
    }
  }
  if (!day && kind === 'near') {
    const [tx0, tx1, tyt] = tiers[0];
    const fg = g.createLinearGradient(0, tyt + 18, 0, tyt - 6);
    fg.addColorStop(0, 'rgba(255,140,190,0)');
    fg.addColorStop(1, 'rgba(255,140,190,0.25)');
    rect(g, tx0, tyt - 6, tx1 - tx0, 24, fg);
  }
  if (b.shop != null) {
    const aw = [OX.mid, JADE.lo, '#6a5a9a', TERRA][b.shop];
    const sy = base - 16;
    rect(g, x + 2, sy + 5, w - 4, 11, '#3b3036');
    for (let q = 0, n = Math.max(2, Math.floor((w - 6) / 14)); q < n; q++) {
      const qw = (w - 6) / n;
      rect(g, x + 3 + q * qw + 1, sy + 6.5, qw - 2, 8.5, '#d0a8a0');
      rect(g, x + 3 + q * qw + 1, sy + 6.5, qw - 2, 2.5, rgba('#000000', 0.25));
    }
    rect(g, x + 2, sy, w - 4, 4.5, aw);
    g.fillStyle = rgba(CREAM, 0.7);
    for (let xx = x + 3; xx < x + w - 3; xx += 4) g.fillRect(xx, sy, 1.6, 4.5);
    rect(g, x + 2, sy + 4.5, w - 4, 0.8, rgba('#000000', 0.3));
  }
}

function tree(g, x, y, s) {
  // a palm in a terrazzo planter: the Miami of the street
  rect(g, x - 4 * s, y - 4 * s, 8 * s, 4 * s, '#c49a96');
  rect(g, x - 4 * s, y - 4 * s, 8 * s, 0.8, JADE.mid);
  const tx = x + 3 * s, ty = y - 36 * s;
  g.strokeStyle = '#8a6450';
  g.lineWidth = 2.2 * s;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x, y - 4 * s);
  g.quadraticCurveTo(x - 1.5 * s, y - 20 * s, tx, ty);
  g.stroke();
  g.strokeStyle = 'rgba(70,46,34,0.6)';
  g.lineWidth = 0.45;
  g.beginPath();
  for (let i = 1; i < 9; i++) {
    const t = i / 9;
    const px = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * (x - 1.5 * s) + t * t * tx;
    const py = (1 - t) * (1 - t) * (y - 4 * s) + 2 * (1 - t) * t * (y - 20 * s) + t * t * ty;
    g.moveTo(px - 1.1 * s, py);
    g.lineTo(px + 1.1 * s, py + 0.6);
  }
  g.stroke();
  [[-2.9, 15], [-2.5, 17], [-2.0, 15], [-1.25, 14], [-0.75, 16], [-0.3, 15], [-1.6, 12]].forEach(([a, len], i) => {
    const ex = tx + Math.cos(a) * len * s, ey = ty + Math.sin(a) * len * s * 0.6 + 7 * s;
    const mx = tx + Math.cos(a) * len * s * 0.5, my = ty + Math.sin(a) * len * s * 0.9 - 2 * s;
    g.fillStyle = i % 2 ? JADE.lo : '#2f8a6a';
    g.beginPath();
    g.moveTo(tx, ty);
    g.quadraticCurveTo(mx, my - 2.2 * s, ex, ey);
    g.quadraticCurveTo(mx, my + 1.4 * s, tx, ty + 0.8);
    g.fill();
  });
  disc(g, tx - 1, ty + 1.5, 1.1 * s, '#5a3a22');
  disc(g, tx + 1.2, ty + 1.8, 1.1 * s, '#5a3a22');
}

function lampPost(g, x, y) {
  // a slim chrome pole with a frosted globe and a teal collar
  rect(g, x - 2.5, y - 3, 5, 3, '#2a2630');
  rect(g, x - 0.8, y - 38, 1.6, 35, '#8a909a');
  rect(g, x - 0.8, y - 38, 0.5, 35, 'rgba(255,255,255,0.5)');
  rect(g, x - 2, y - 40, 4, 2, JADE.mid);
  disc(g, x, y - 44, 4, '#f6eee8');
  disc(g, x - 1.2, y - 45.2, 1.4, '#ffffff');
  rect(g, x - 0.4, y - 49, 0.8, 1.4, '#8a909a');
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
      // a boxy city bus, white with teal and pink stripes
      rect(g, 0, -22, 64, 20, '#ece6e2');
      rect(g, 0, -22, 64, 1, '#ffffff');
      rect(g, 2, -19.5, 56, 6, '#26323c');
      for (let x = 10; x < 56; x += 8) rect(g, x, -19.5, 0.8, 6, '#ece6e2');
      rect(g, 58.5, -19.5, 4, 9, '#26323c');
      rect(g, 0, -12, 64, 1.6, JADE.mid);
      rect(g, 0, -9.6, 64, 1.2, NEON.pink);
      rect(g, 0, -4.5, 64, 2.5, '#2a2a30');
      wheel(12, 3.2);
      wheel(50, 3.2);
      return;
    }
    if (kind === 'cab') {
      // an '80s yellow cab: square-shouldered, a roof light
      g.fillStyle = '#e2b030';
      poly(g, [1, -2.5, 1, -7.2, 7, -7.6, 9.5, -11.4, 20.5, -11.4, 23, -7.6, 29.5, -7.2, 29.5, -2.5]);
      g.fill();
      rect(g, 2, -7.4, 27, 0.9, '#f4cc58');
      g.fillStyle = '#26323a';
      poly(g, [10.2, -10.8, 19.8, -10.8, 21.8, -7.9, 8.8, -7.9]);
      g.fill();
      rect(g, 14.6, -10.8, 0.8, 2.9, '#e2b030');
      rect(g, 13, -12.8, 4, 1.4, CREAM);
      rect(g, 0.5, -3.6, 29.5, 1.4, '#2a2a30');
      for (let i = 0; i < 9; i++) rect(g, 6 + i * 2, -6, 1, 1, i % 2 ? INK : CREAM);
      wheel(7, 2.6);
      wheel(23.5, 2.6);
      return;
    }
    // a stainless gull-wing wedge
    const bg = g.createLinearGradient(0, -11, 0, -2);
    bg.addColorStop(0, '#e8ecf0');
    bg.addColorStop(0.5, '#a8b0ba');
    bg.addColorStop(1, '#6a727c');
    g.fillStyle = bg;
    poly(g, [0.5, -2.5, 0.5, -5.8, 7.5, -7, 11, -10.4, 19, -10.4, 22.5, -7.4, 27.5, -6.2, 27.5, -2.5]);
    g.fill();
    g.fillStyle = '#20262c';
    poly(g, [11.6, -9.8, 18.6, -9.8, 21.4, -7.3, 10, -7.3]);
    g.fill();
    for (let i = 0; i < 4; i++) rect(g, 20 + i * 1.4, -9.2 + i * 0.5, 0.6, 1.6, '#20262c');
    rect(g, 0.5, -4, 27, 1.2, '#2a2a30');
    rect(g, 1, -5.6, 26, 0.4, 'rgba(255,255,255,0.6)');
    wheel(6.5, 2.5);
    wheel(22, 2.5);
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
    // teal and pink stripes along the envelope
    g.save();
    g.beginPath();
    g.ellipse(0, 0, 29, 9.5, 0, 0, TAU);
    g.clip();
    rect(g, -30, 3.2, 60, 1.2, JADE.mid);
    rect(g, -30, 5, 60, 0.9, NEON.pink);
    g.restore();
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
  // laser-ish: narrow beams in cyan, pink and violet, each with a hot core
  const t = f.t;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  [[180, NEON.cyan], [640, NEON.pink], [1090, NEON.violet]].forEach(([u, col], j) => {
    const x = mod(u - farShift + 200, 1400) - 200;
    if (x < -160 || x > FRAME_W + 160) return;
    const th = 0.6 * Math.sin(t * 0.5 + j * 2.1) + (j - 1) * 0.15;
    const dx = Math.sin(th), dy = -Math.cos(th);
    const nx = Math.cos(th), ny = Math.sin(th);
    const L = 320;
    const y = 202;
    const gr = ctx.createLinearGradient(x, y, x + dx * L, y + dy * L);
    gr.addColorStop(0, rgba(col, 0.34));
    gr.addColorStop(0.6, rgba(col, 0.1));
    gr.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.moveTo(x - nx * 0.6, y - ny * 0.6);
    ctx.lineTo(x + dx * L - nx * 5, y + dy * L - ny * 5);
    ctx.lineTo(x + dx * L + nx * 5, y + dy * L + ny * 5);
    ctx.lineTo(x + nx * 0.6, y + ny * 0.6);
    ctx.closePath();
    ctx.fill();
    const cg = ctx.createLinearGradient(x, y, x + dx * L * 0.8, y + dy * L * 0.8);
    cg.addColorStop(0, 'rgba(255,255,255,0.55)');
    cg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = cg;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx * L * 0.8, y + dy * L * 0.8);
    ctx.stroke();
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

// breccia / plaster / lacquer field for a span of solid wall
function wallField(g, fl, x0, x1, y0, y1, seed) {
  const w = x1 - x0;
  if (fl === 'lobby') {
    // Trump Tower's pink-peach breccia in brass-framed panels; a dark rose granite dado
    const gr = g.createLinearGradient(0, y0, 0, 150);
    gr.addColorStop(0, '#dca898');
    gr.addColorStop(0.5, '#ecbcaa');
    gr.addColorStop(1, '#d9a294');
    rect(g, x0, y0, w, 150 - y0, gr);
    mottle(g, x0, y0, w, 150 - y0, seed + 11, '#fbe2d6', '#b8726e', 1.6);
    veins(g, x0, y0, w, 150 - y0, seed + 7, '#9a5a64', Math.round(w * (150 - y0) / 1900), 1.1, 0.3, 1.0);
    veins(g, x0, y0, w, 150 - y0, seed, '#fff6f0', Math.round(w * (150 - y0) / 1300), 0.7, 0.5, 1.0);
    const n = Math.max(1, Math.round(w / 58));
    const pw = w / n;
    for (let i = 0; i < n; i++) {
      const px = x0 + i * pw;
      g.strokeStyle = rgba(GOLD.mid, 0.85);
      g.lineWidth = 0.8;
      g.strokeRect(px + 4.5, y0 + 6.5, pw - 9, 150 - y0 - 13);
      g.strokeStyle = 'rgba(120,60,60,0.35)';
      g.lineWidth = 0.5;
      g.strokeRect(px + 5.4, y0 + 7.4, pw - 10.8, 150 - y0 - 14.8);
      // a teal square at each panel's head
      rect(g, px + pw / 2 - 2.5, y0 + 12, 5, 5, JADE.mid);
      rect(g, px + pw / 2 - 2.5, y0 + 12, 5, 0.8, JADE.hi);
    }
    const dg = g.createLinearGradient(0, 150, 0, y1);
    dg.addColorStop(0, ROSE.dk);
    dg.addColorStop(1, ROSE.deep);
    rect(g, x0, 150, w, y1 - 150, dg);
    speckle(g, x0, 150, w, y1 - 150, seed + 3, ['#e8b8b0', '#2a1418', '#b0787e'], 0.8);
    rect(g, x0, 148.5, w, 3, goldV(g, 148.5, 151.5));
    rect(g, x0, y1 - 6, w, 6, '#2e161c');
    rect(g, x0, y1 - 6, w, 0.8, rgba(GOLD.mid, 0.7));
  } else if (fl === 'open') {
    // Graves's peach plaster with seafoam pilaster strips; a teal-grey dado
    const gr = g.createLinearGradient(0, y0, 0, 150);
    gr.addColorStop(0, '#e9bd9e');
    gr.addColorStop(0.45, '#f4d0b4');
    gr.addColorStop(1, '#e8ba9c');
    rect(g, x0, y0, w, 150 - y0, gr);
    const n = Math.max(1, Math.round(w / 52));
    const pw = w / n;
    for (let i = 0; i <= n; i++) {
      const px = x0 + i * pw;
      rect(g, px - 2.5, y0 + 14, 5, 150 - y0 - 14, '#a8d8c8');
      rect(g, px - 2.5, y0 + 14, 1, 150 - y0 - 14, '#cdeee2');
      rect(g, px + 1.8, y0 + 14, 0.7, 150 - y0 - 14, '#7ab8a6');
      rect(g, px - 4, y0 + 12, 8, 3, TERRA);
      rect(g, px - 4, y0 + 12, 8, 0.8, '#e0987a');
    }
    rect(g, x0, 128, w, 4, '#a8d8c8');
    rect(g, x0, 132, w, 0.8, TERRA);
    dado(g, x0, x1, y1);
  } else {
    // exec: high-gloss smoked-teal lacquer panels, brass reveals, a rose granite dado
    const gr = g.createLinearGradient(0, y0, 0, 150);
    gr.addColorStop(0, '#14302f');
    gr.addColorStop(0.4, '#1f4644');
    gr.addColorStop(1, '#132a2a');
    rect(g, x0, y0, w, 150 - y0, gr);
    const n = Math.max(1, Math.round(w / 50));
    const pw = w / n;
    const R = rng(seed);
    for (let i = 0; i < n; i++) {
      const px = x0 + i * pw;
      for (let q = 0; q < 2; q++) {
        const gx = px + 4 + R() * (pw - 14);
        const gw = 3 + R() * 7;
        const sg = g.createLinearGradient(gx, 0, gx + gw, 0);
        sg.addColorStop(0, 'rgba(200,255,240,0)');
        sg.addColorStop(0.5, `rgba(200,255,240,${0.05 + R() * 0.06})`);
        sg.addColorStop(1, 'rgba(200,255,240,0)');
        rect(g, gx, y0, gw, 150 - y0, sg);
      }
      rect(g, px - 0.5, y0, 1, 150 - y0, rgba(GOLD.mid, 0.7));
    }
    const dg = g.createLinearGradient(0, 150, 0, y1);
    dg.addColorStop(0, ROSE.dk);
    dg.addColorStop(1, ROSE.deep);
    rect(g, x0, 150, w, y1 - 150, dg);
    speckle(g, x0, 150, w, y1 - 150, seed + 3, ['#e8b8b0', '#2a1418', '#b0787e'], 0.8);
    rect(g, x0, 148.5, w, 2.5, goldV(g, 148.5, 151));
    rect(g, x0, y1 - 6, w, 6, '#2a1218');
    rect(g, x0, y1 - 6, w, 0.8, rgba(GOLD.mid, 0.7));
  }
}

function dado(g, x0, x1, y1) {
  const w = x1 - x0;
  const dg = g.createLinearGradient(0, 150, 0, y1);
  dg.addColorStop(0, '#4a6268');
  dg.addColorStop(0.15, '#3a5258');
  dg.addColorStop(1, '#1e2e32');
  rect(g, x0, 150, w, y1 - 150, dg);
  rect(g, x0, 158, w, 0.7, rgba('#ff8ab8', 0.45));
  rect(g, x0, 161, w, 0.7, rgba(JADE.hi, 0.4));
  rect(g, x0, 148.5, w, 3, chromeV(g, 148.5, 151.5));
  rect(g, x0, y1 - 6, w, 6, '#1a2428');
  rect(g, x0, y1 - 6, w, 0.8, rgba(SILVER.mid, 0.6));
}

// the cornice / frieze that runs over every bay just under the ceiling
function cornice(g, fl, ua, ub, F) {
  const y = F.ceilingY;
  if (fl === 'lobby') {
    // rose granite, brass rules, a row of little teal squares (Hoffmann's grid)
    rect(g, ua, y, ub - ua, 8, ROSE.deep);
    rect(g, ua, y, ub - ua, 1.2, goldV(g, y, y + 1.2));
    rect(g, ua, y + 7, ub - ua, 1, rgba(GOLD.mid, 0.8));
    for (let u = Math.floor(ua / 6) * 6; u < ub; u += 6) rect(g, u + 2, y + 3.2, 2, 2, JADE.mid);
  } else if (fl === 'open') {
    rect(g, ua, y, ub - ua, 6, '#e2b89a');
    rect(g, ua, y, ub - ua, 1, '#b88a70');
    rect(g, ua, y + 5, ub - ua, 1, TERRA);
    // a seafoam band of Memphis marks: dots, triangles, squiggles
    rect(g, ua, y + 6, ub - ua, 8, '#9ad4c4');
    for (let u = Math.floor(ua / 12) * 12; u < ub; u += 12) {
      const kind = Math.round(u / 12) % 3;
      if (kind === 0) disc(g, u + 6, y + 10, 1.8, '#e86a9a');
      else if (kind === 1) {
        g.fillStyle = '#2a6a7a';
        poly(g, [u + 3.5, y + 12.5, u + 6, y + 7.5, u + 8.5, y + 12.5]);
        g.fill();
      } else {
        g.strokeStyle = '#f2b84a';
        g.lineWidth = 0.8;
        g.beginPath();
        g.moveTo(u + 2.5, y + 10);
        for (let q = 0; q < 4; q++) g.lineTo(u + 4 + q * 1.8, y + (q % 2 ? 8.5 : 11.5));
        g.stroke();
      }
    }
    // a pink neon tube under the frieze
    neonLine(g, ua, ub, y + 15.5, NEON.pink, 0.6);
    rect(g, ua, y + 22.6, ub - ua, 0.6, rgba(TERRA, 0.8));
  } else {
    rect(g, ua, y, ub - ua, 6, '#140c16');
    rect(g, ua, y, ub - ua, 1, goldV(g, y, y + 1));
    rect(g, ua, y + 5, ub - ua, 1, rgba(GOLD.mid, 0.85));
    neonLine(g, ua, ub, y + 3, NEON.pink, 0.55);
  }
}

function glassBayStatic(g, fl, F, b, idx) {
  const G = F.glass;
  const x0 = b.u, x1 = b.u1, w = x1 - x0;
  const top = G.top, bot = G.bottom;
  g.fillStyle = fl === 'exec' ? 'rgba(70,30,80,0.10)' : 'rgba(210,236,240,0.07)';
  g.fillRect(x0, top, w, bot - top);
  const R = rng(idx * 41 + 9);
  g.save();
  g.beginPath();
  g.rect(x0, top, w, bot - top);
  g.clip();
  for (let i = 0; i < 4; i++) {
    const sx = x0 + R() * w;
    const sw = 6 + R() * 22;
    g.fillStyle = fl === 'exec' ? `rgba(255,180,220,${0.03 + R() * 0.04})` : `rgba(255,255,250,${0.05 + R() * 0.06})`;
    poly(g, [sx, top, sx + sw, top, sx + sw - 70, bot, sx - 70, bot]);
    g.fill();
  }
  g.restore();
  const mullC = fl === 'exec' ? '#120c14' : '#2a7c78';
  const mullHi = fl === 'exec' ? rgba(GOLD.hi, 0.6) : rgba(JADE.hi, 0.8);
  if (fl === 'open') {
    wallStrip(g, fl, x0, x1, F.ceilingY + 14, top);
    // a terracotta keystone over the window
    const kx = (x0 + x1) / 2;
    g.fillStyle = TERRA;
    poly(g, [kx - 5, top - 9, kx + 5, top - 9, kx + 3.2, top + 1, kx - 3.2, top + 1]);
    g.fill();
    rect(g, kx - 5, top - 9, 10, 1, '#e8a080');
    if (b.blinds > 0) {
      // vertical blinds, drawn across from the left
      const bw = w * b.blinds;
      for (let x = x0; x < x0 + bw; x += 3.4) {
        rect(g, x, top + 2, 2.8, bot - top - 2, '#ecdcc6');
        rect(g, x + 2, top + 2, 0.8, bot - top - 2, '#bfa98c');
      }
      rect(g, x0, top, bw, 2.4, '#d8c6ae');
    }
    rect(g, x0, bot, w, 3, chromeV(g, bot, bot + 3));
    const dg = g.createLinearGradient(0, bot + 3, 0, WALL_BASE);
    dg.addColorStop(0, '#3a5258');
    dg.addColorStop(1, '#1c2a2e');
    rect(g, x0, bot + 3, w, WALL_BASE - bot - 3, dg);
    for (let y = bot + 9; y < WALL_BASE - 8; y += 3.2) rect(g, x0 + 6, y, w - 12, 1, 'rgba(10,20,24,0.45)');
    for (let xx = x0 + 6; xx < x1 - 6; xx += 30) rect(g, xx, bot + 8, 0.8, WALL_BASE - bot - 16, rgba(SILVER.mid, 0.25));
    rect(g, x0, WALL_BASE - 6, w, 0.8, rgba(SILVER.mid, 0.6));
  } else if (fl === 'exec') {
    rect(g, x0, bot, w, WALL_BASE - bot, '#140c12');
    rect(g, x0, bot, w, 1, goldV(g, bot, bot + 1));
  }
  const mull = (x, wd) => {
    rect(g, x - wd / 2, top, wd, bot - top, mullC);
    rect(g, x - wd / 2, top, 0.5, bot - top, mullHi);
  };
  const n = Math.max(1, Math.round(w / G.mullion));
  for (let i = 1; i < n; i++) mull(x0 + (w * i) / n, fl === 'exec' ? 1.6 : 2);
  rect(g, x0, top - 1, w, 2.5, mullC);
  rect(g, x0, top + 1, w, 0.5, mullHi);
  rect(g, x0, bot - 2, w, 2, mullC);
  rect(g, x0, bot - 2, w, 0.5, mullHi);
  if (G.transom) {
    rect(g, x0, G.transom - 1.5, w, 3, mullC);
    rect(g, x0, G.transom - 1.5, w, 0.6, mullHi);
    // a Palladian fanlight in each pane above the transom, a peach keystone at its crown
    for (let i = 0; i < n; i++) {
      const px0 = x0 + (w * i) / n, px1 = x0 + (w * (i + 1)) / n;
      const pcx = (px0 + px1) / 2;
      const r = (px1 - px0) * 0.42;
      g.save();
      g.beginPath();
      g.rect(px0, top, px1 - px0, G.transom - top);
      g.clip();
      g.strokeStyle = mullC;
      g.lineWidth = 1;
      g.beginPath();
      g.arc(pcx, G.transom - 1.5, r, PI, TAU);
      for (let q = 1; q < 5; q++) {
        const a = PI + (q / 5) * PI;
        g.moveTo(pcx, G.transom - 1.5);
        g.lineTo(pcx + Math.cos(a) * r, G.transom - 1.5 + Math.sin(a) * r);
      }
      g.stroke();
      g.restore();
      g.fillStyle = PEACH.lo;
      poly(g, [pcx - 2.6, G.transom - 2 - r - 3, pcx + 2.6, G.transom - 2 - r - 3, pcx + 1.6, G.transom - 2 - r + 2, pcx - 1.6, G.transom - 2 - r + 2]);
      g.fill();
    }
  }
  if (b.revolvingDoor != null) revolvingStatic(g, b.revolvingDoor, F);
}

// a band of the floor's wall material in a glass bay (above the open plan's ribbon)
function wallStrip(g, fl, x0, x1, y0, y1) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, '#e6b898');
  gr.addColorStop(1, '#f2cdb0');
  rect(g, x0, y0, x1 - x0, y1 - y0, gr);
}

// reeded plaster: a fine vertical flute, light on the left of each reed
function reeds(g, x0, x1, y0, y1) {
  for (let x = Math.ceil(x0 / 2.4) * 2.4; x < x1; x += 2.4) {
    rect(g, x, y0, 0.8, y1 - y0, 'rgba(255,250,235,0.18)');
    rect(g, x + 1.4, y0, 0.7, y1 - y0, 'rgba(120,100,70,0.12)');
  }
}

function column(g, fl, x, w, F) {
  const y0 = F.ceilingY, y1 = WALL_BASE;
  if (fl === 'lobby') {
    // a square pink granite shaft with brass reveals and an oversized teal capital
    rect(g, x, y0, w, y1 - y0, lacquerH(g, x, x + w, ROSE.lo, ROSE.hi));
    speckle(g, x, y0, w, y1 - y0, Math.round(x * 7) + 3, ['#fbe0d8', '#5a2a30'], 0.6);
    rect(g, x + 2.2, y0 + 18, 0.6, y1 - y0 - 28, rgba(GOLD.mid, 0.8));
    rect(g, x + w - 2.8, y0 + 18, 0.6, y1 - y0 - 28, rgba(GOLD.mid, 0.8));
    rect(g, x - 3, y0 + 8, w + 6, 4, JADE.mid);
    rect(g, x - 3, y0 + 8, w + 6, 0.8, JADE.hi);
    rect(g, x - 1.5, y0 + 12, w + 3, 2.4, goldV(g, y0 + 12, y0 + 14.4));
    g.fillStyle = PEACH.lo;
    poly(g, [x + w / 2 - 3, y0 + 14.4, x + w / 2 + 3, y0 + 14.4, x + w / 2 + 1.8, y0 + 19, x + w / 2 - 1.8, y0 + 19]);
    g.fill();
    rect(g, x - 2, y1 - 5, w + 4, 5, ROSE.deep);
    rect(g, x - 2, y1 - 5, w + 4, 0.8, rgba(GOLD.mid, 0.8));
  } else if (fl === 'open') {
    // a peach shaft banded in teal, a terracotta block capital with a keystone
    rect(g, x, y0, w, y1 - y0, lacquerH(g, x, x + w, PEACH.lo, PEACH.hi));
    rect(g, x, y0 + 26, w, 2, JADE.mid);
    rect(g, x, y0 + 30, w, 1, JADE.mid);
    rect(g, x - 3, y0 + 14, w + 6, 6, TERRA);
    rect(g, x - 3, y0 + 14, w + 6, 1, '#e8a080');
    g.fillStyle = '#a85a40';
    poly(g, [x + w / 2 - 3, y0 + 20, x + w / 2 + 3, y0 + 20, x + w / 2 + 2, y0 + 24, x + w / 2 - 2, y0 + 24]);
    g.fill();
    rect(g, x - 2, y1 - 5, w + 4, 5, '#2a3a40');
    rect(g, x - 2, y1 - 5, w + 4, 0.8, rgba(SILVER.mid, 0.7));
  } else {
    // black lacquer ringed in brass, a brass block capital
    rect(g, x, y0, w, y1 - y0, lacquerH(g, x, x + w, '#120e14', '#3a3240'));
    for (const yy of [y0 + 18, y0 + 21, y0 + 24, y1 - 16]) rect(g, x, yy, w, 1, goldV(g, yy, yy + 1));
    rect(g, x - 2, y0 + 6, w + 4, 4, goldV(g, y0 + 6, y0 + 10));
    rect(g, x - 2, y1 - 4, w + 4, 4, goldV(g, y1 - 4, y1, 0.2));
  }
}

// --- lifts ---------------------------------------------------------------------------
const LIFTS = {
  lobby: { door: ['#9aa0aa', '#5a606a'], etch: 'rgba(255,240,240,0.32)', frame: 'rose' },
  open: { door: ['#2e8680', '#164c48'], etch: 'rgba(200,255,240,0.32)', frame: 'chrome' },
  exec: { door: ['#2c2232', '#120e16'], etch: 'rgba(240,210,140,0.45)', frame: 'brass' },
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
  gr.addColorStop(0, L.door[0]);
  gr.addColorStop(1, L.door[1]);
  rect(g, 0, 0, w2, h, gr);
  for (let y = 1; y < h; y += 1.3) rect(g, 0, y, w2, 0.3, 'rgba(255,255,255,0.05)');
  // etched pinstripes above
  for (let x = 3; x < w2; x += 3) rect(g, x, 4, 0.35, h * 0.42, L.etch);
  // the etched sunset: a half disc at the foot of the seam, cut by bands
  const cy = h - 5, R1 = Math.min(h * 0.42, w2 * 1.75);
  g.save();
  g.beginPath();
  g.rect(0, 0, w2, h);
  g.clip();
  g.fillStyle = L.etch;
  g.beginPath();
  g.moveTo(w2, cy);
  g.arc(w2, cy, R1, PI, PI * 1.5);
  g.closePath();
  g.fill();
  g.fillStyle = gr;
  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    g.fillRect(0, cy - R1 * 0.75 + t * R1 * 0.75, w2, 0.5 + t * 2.2);
  }
  g.restore();
  rect(g, 0, h - 4, w2, 4, L.frame === 'brass' ? goldV(g, h - 4, h, 0.2) : chromeV(g, h - 4, h));
  rect(g, 0.6, 0.6, w2 - 1.2, 0.5, rgba('#ffffff', 0.25));
  rect(g, 0.6, 0.6, 0.5, h - 4.6, rgba('#ffffff', 0.2));
  rect(g, w2 - 0.4, 0, 0.4, h, rgba('#000000', 0.6));
  g.restore();
}

function carPaint(g, fl, w, h) {
  // mirrored walls in peach light, a brass rail
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#f8c8b4');
  gr.addColorStop(0.3, '#c27c80');
  gr.addColorStop(0.7, '#6a3a46');
  gr.addColorStop(1, '#2e1820');
  rect(g, 0, 0, w, h, gr);
  rect(g, 0, 0, w, 3, '#fff0e4');
  rect(g, w * 0.2, 9, w * 0.6, h * 0.5, 'rgba(255,230,230,0.14)');
  g.strokeStyle = rgba(SILVER.lo, 0.6);
  g.lineWidth = 0.6;
  g.strokeRect(w * 0.2, 9, w * 0.6, h * 0.5);
  rect(g, 2, h * 0.6, w - 4, 1.2, GOLD.mid);
  rect(g, 0, h - 6, w, 6, '#2a161c');
}

function liftStatic(g, fl, h) {
  const x = h.x, y = h.y, w = h.w, ht = h.h;
  const cx = x + w / 2;
  const L = LIFTS[fl];
  const fr = (y0, y1) => (L.frame === 'rose' ? lacquerV(g, y0, y1, ROSE.lo, ROSE.hi) : L.frame === 'chrome' ? chromeV(g, y0, y1) : goldV(g, y0, y1));
  // the broken pediment, an orb in its notch
  const pb = y - 24;
  const pw2 = w / 2 + 6, ph = 11, nr = 3;
  const ny = pb - ph + (nr + 0.4) * (ph / pw2);
  g.fillStyle = fr(pb - ph, pb);
  g.beginPath();
  g.moveTo(cx - pw2, pb);
  g.lineTo(cx - nr, ny);
  g.arc(cx, ny, nr, PI, 0, true);
  g.lineTo(cx + pw2, pb);
  g.closePath();
  g.fill();
  g.strokeStyle = L.frame === 'chrome' ? SILVER.lo : GOLD.mid;
  g.lineWidth = 0.6;
  g.beginPath();
  g.moveTo(cx - pw2, pb);
  g.lineTo(cx - nr, ny);
  g.moveTo(cx + nr, ny);
  g.lineTo(cx + pw2, pb);
  g.stroke();
  disc(g, cx, ny + 0.4, 1.9, goldV(g, ny - 2, ny + 2));
  rect(g, cx - pw2, pb, pw2 * 2, 2.5, fr(pb, pb + 2.5));
  rect(g, cx - pw2, pb + 2.2, pw2 * 2, 0.5, GOLD.mid);
  // the indicator: black glass, an LED window and two arrows
  rect(g, x - 2.5, pb + 2.7, w + 5, 19.8, lacquerV(g, pb + 2.7, pb + 22.5, '#16121a', '#3a3242'));
  rect(g, cx - 7, y - 17.5, 14, 10, '#1a0608');
  g.strokeStyle = rgba(SILVER.mid, 0.6);
  g.lineWidth = 0.5;
  g.strokeRect(cx - 7, y - 17.5, 14, 10);
  for (const s2 of [-1, 1]) {
    g.fillStyle = 'rgba(120,40,30,0.6)';
    const ax = cx + s2 * 11;
    poly(g, s2 < 0 ? [ax - 2, y - 11.5, ax + 2, y - 11.5, ax, y - 14.5] : [ax - 2, y - 14.5, ax + 2, y - 14.5, ax, y - 11.5]);
    g.fill();
  }
  // the door surround
  rect(g, x - 3, y - 3, w + 6, ht + 3, fr(y - 3, y + ht));
  if (L.frame === 'rose') speckle(g, x - 3, y - 3, w + 6, ht + 3, Math.round(x) + 9, ['#fbe0d8', '#5a2a30'], 0.5);
  rect(g, x - 1, y - 1.5, w + 2, ht + 1.5, INK);
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
const DIAL_HOME = { lobby: 0, open: 0.23, exec: 0.88 };
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
  }
  // the LED counts the car in floor by floor; the arrow says which way it is going
  const p = needleAt(fl, h, t);
  const dir = Math.sign(needleAt(fl, h, t + 0.05) - p);
  const n = Math.round(p * 100);
  const str = h.open > 0 ? h.label : n <= 0 ? 'G' : String(Math.min(99, n));
  const cx = x + w / 2, ly = y - 16.2, dh = 7.4, dw = 4.2;
  const on = NEON.red, off = 'rgba(90,20,20,0.45)';
  rect(ctx, cx - 7, y - 17.5, 14, 10, 'rgba(255,60,60,0.08)');
  if (str.length === 1) sevenSeg(ctx, str, cx - dw / 2, ly, dw, dh, on, off);
  else {
    sevenSeg(ctx, str[0], cx - dw - 0.6, ly, dw, dh, on, off);
    sevenSeg(ctx, str[1], cx + 0.6, ly, dw, dh, on, off);
  }
  if (dir !== 0 && h.open <= 0) {
    const ax = cx + (dir > 0 ? -11 : 11);
    ctx.fillStyle = '#ffb04a';
    poly(ctx, dir > 0 ? [ax - 2, y - 11.5, ax + 2, y - 11.5, ax, y - 14.5] : [ax - 2, y - 14.5, ax + 2, y - 14.5, ax, y - 11.5]);
    ctx.fill();
    disc(ctx, ax, y - 13, 3.2, 'rgba(255,170,80,0.22)');
  }
  if (h.open > 0) {
    disc(ctx, x + w + 4.5, y - 14, 1.3, '#ffcf6a');
    disc(ctx, x + w + 4.5, y - 14, 3.2, 'rgba(255,200,100,0.25)');
  }
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
  const pts = [x, y + 10, x + 26, y + 10, x + 26, y + 5, x + 48, y + 5, x + 48, y, x + w - 48, y, x + w - 48, y + 5, x + w - 26, y + 5, x + w - 26, y + 10, x + w, y + 10, x + w, y + ht, x, y + ht];
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.save();
  g.translate(1.5, 2);
  poly(g, pts);
  g.fill();
  g.restore();
  // black glass in a brass frame
  poly(g, pts);
  const panel = '#1a1422';
  g.fillStyle = lacquerV(g, y, y + ht, panel, '#463c54');
  g.fill();
  g.strokeStyle = goldV(g, y, y + ht);
  g.lineWidth = 1.4;
  g.stroke();
  // the egg: chrome, against a striped sunset
  sunsetDisc(g, cx, y + 25, 15.5, 6, panel);
  g.fillStyle = INK;
  g.beginPath();
  g.ellipse(cx, y + 24, 8.6, 11, 0, 0, TAU);
  g.fill();
  const eg = g.createLinearGradient(cx - 8, y + 14, cx + 8, y + 34);
  eg.addColorStop(0, SILVER.hi);
  eg.addColorStop(0.4, SILVER.mid);
  eg.addColorStop(0.55, '#f6c8dc');
  eg.addColorStop(0.7, SILVER.lo);
  eg.addColorStop(1, SILVER.mid);
  g.fillStyle = eg;
  g.beginPath();
  g.ellipse(cx, y + 24, 7.4, 9.8, 0, 0, TAU);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.8)';
  g.beginPath();
  g.ellipse(cx - 3, y + 19, 1.2, 3, -0.4, 0, TAU);
  g.fill();
  // cyan neon stripes either side
  for (const [k2, yy] of [[0, y + 20], [1, y + 24], [2, y + 28]]) {
    neonLine(g, x + 8, x + 40 - k2 * 6, yy, NEON.cyan, 0.45);
    neonLine(g, x + w - 40 + k2 * 6, x + w - 8, yy, NEON.cyan, 0.45);
  }
  // the name in pink neon tube
  rect(g, x + 6, y + 39, w - 12, 15, '#100c16');
  rect(g, x + 6, y + 39, w - 12, 0.8, GOLD.mid);
  rect(g, x + 6, y + 53.2, w - 12, 0.8, GOLD.mid);
  neonText(g, h.label, cx, y + 41.5, 10, NEON.pink, { track: 4.2, lw: 0.75 });
}

function clockFace(g, fl, cx, cy, r) {
  // a Memphis clock: a black ring with a yellow slice, a teal face, pink triangles
  disc(g, cx, cy, r * 1.4, INK);
  g.fillStyle = '#f2c84a';
  g.beginPath();
  g.moveTo(cx, cy);
  g.arc(cx, cy, r * 1.4, -0.35, 0.95);
  g.closePath();
  g.fill();
  disc(g, cx, cy, r, fl === 'exec' ? '#2a2236' : '#86d4c6');
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const sx = Math.sin(a), sy = -Math.cos(a);
    if (i % 3 === 0) {
      g.fillStyle = '#ee5a96';
      poly(g, [cx + sx * r * 0.92 - sy * 1.6, cy + sy * r * 0.92 + sx * 1.6, cx + sx * r * 0.92 + sy * 1.6, cy + sy * r * 0.92 - sx * 1.6, cx + sx * r * 0.62, cy + sy * r * 0.62]);
      g.fill();
    } else disc(g, cx + sx * r * 0.8, cy + sy * r * 0.8, 0.5, fl === 'exec' ? CREAM : INK);
  }
  g.strokeStyle = rgba(INK, 0.5);
  g.lineWidth = 0.5;
  g.beginPath();
  for (let q = 0; q <= 6; q++) g.lineTo(cx - r * 0.45 + q * r * 0.15, cy + r * 0.42 + (q % 2 ? -1 : 0.6));
  g.stroke();
}

function clockHands(ctx, f, fl, cx, cy, r) {
  const col = fl === 'exec' ? CREAM : INK;
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
  line(ctx, cx, cy, cx + Math.sin(f.clock.secondA) * r * 0.88, cy - Math.cos(f.clock.secondA) * r * 0.88, NEON.pink, 0.45);
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
  // the motivational poster as sold that decade: black frame and mat, a photograph,
  // the virtue in capitals underneath
  const x = h.x, y = h.y, w = h.w, ht = h.h;
  rect(g, x - 2.5, y - 2.5, w + 5, ht + 5, '#0c0a0e');
  rect(g, x - 2.5, y - 2.5, w + 5, 0.8, '#4a4250');
  rect(g, x, y, w, ht, '#141016');
  const ix = x + 2, iy = y + 2, iw = w - 4, ih = ht - 13;
  g.save();
  g.beginPath();
  g.rect(ix, iy, iw, ih);
  g.clip();
  if (h.label === 'SYNERGY') {
    // a rowing eight at sunset
    const sg = g.createLinearGradient(0, iy, 0, iy + ih);
    sg.addColorStop(0, '#5a3a8a');
    sg.addColorStop(0.55, '#f08a8a');
    sg.addColorStop(0.62, '#f8c08a');
    sg.addColorStop(0.63, '#6a4a8a');
    sg.addColorStop(1, '#2a2050');
    rect(g, ix, iy, iw, ih, sg);
    sunsetDisc(g, ix + iw * 0.5, iy + ih * 0.6, 6, 4, null);
    rect(g, ix, iy + ih * 0.62, iw, ih, '#3a2c6a');
    for (let k2 = 0; k2 < 5; k2++) rect(g, ix + iw * 0.3 + k2 * 2, iy + ih * 0.7 + k2 * 1.6, 6 - k2, 0.4, 'rgba(255,190,150,0.7)');
    const by = iy + ih * 0.66;
    rect(g, ix + 3, by, iw - 6, 0.9, INK);
    for (let k2 = 0; k2 < 4; k2++) {
      const rx = ix + 6 + k2 * 4.6;
      disc(g, rx, by - 2.2, 0.8, INK);
      rect(g, rx - 0.5, by - 1.6, 1, 1.6, INK);
      line(g, rx, by - 0.6, rx + 3, by + 2.4, INK, 0.35);
    }
  } else if (h.label === 'HANG IN THERE') {
    const sg = g.createLinearGradient(0, iy, 0, iy + ih);
    sg.addColorStop(0, '#9cc8e8');
    sg.addColorStop(1, '#f4d8e4');
    rect(g, ix, iy, iw, ih, sg);
    line(g, ix - 2, iy + 6, ix + iw + 2, iy + 3, '#5a3a28', 2);
    const kx = ix + iw * 0.52, ky = iy + 5;
    line(g, kx - 2, ky - 1, kx - 1.5, ky + 5, '#3a3038', 1.1);
    line(g, kx + 2, ky - 1.4, kx + 1.5, ky + 5, '#3a3038', 1.1);
    g.fillStyle = '#4a4048';
    g.beginPath();
    g.ellipse(kx, ky + 8.5, 3.4, 4.6, 0, 0, TAU);
    g.fill();
    g.beginPath();
    g.arc(kx, ky + 3.2, 2.8, 0, TAU);
    g.fill();
    poly(g, [kx - 2.6, ky + 2, kx - 2, ky - 0.6, kx - 0.7, ky + 1.1]);
    g.fill();
    poly(g, [kx + 2.6, ky + 2, kx + 2, ky - 0.6, kx + 0.7, ky + 1.1]);
    g.fill();
    g.strokeStyle = '#4a4048';
    g.lineWidth = 0.9;
    g.beginPath();
    g.moveTo(kx + 2, ky + 12);
    g.quadraticCurveTo(kx + 6, ky + 15, kx + 3.6, ky + 18);
    g.stroke();
    rect(g, kx - 1.5, ky + 2.8, 0.8, 0.6, '#9fe0a0');
    rect(g, kx + 0.7, ky + 2.8, 0.8, 0.6, '#9fe0a0');
  } else {
    // geese in a V across a peach sky, violet hills
    const sg = g.createLinearGradient(0, iy, 0, iy + ih);
    sg.addColorStop(0, '#f8b08a');
    sg.addColorStop(1, '#fbe0b8');
    rect(g, ix, iy, iw, ih, sg);
    g.fillStyle = '#6a4a8a';
    poly(g, [ix, iy + ih, ix, iy + ih * 0.7, ix + iw * 0.35, iy + ih * 0.55, ix + iw * 0.7, iy + ih * 0.72, ix + iw, iy + ih * 0.6, ix + iw, iy + ih]);
    g.fill();
    g.strokeStyle = '#2a2030';
    g.lineWidth = 0.5;
    g.beginPath();
    for (const [gx, gy] of [[14, 8], [10, 11], [18, 11], [6, 14], [22, 14]]) {
      g.moveTo(ix + gx - 1.6, iy + gy + 0.6);
      g.lineTo(ix + gx, iy + gy);
      g.lineTo(ix + gx + 1.6, iy + gy + 0.6);
    }
    g.stroke();
  }
  g.restore();
  g.strokeStyle = 'rgba(240,230,220,0.55)';
  g.lineWidth = 0.4;
  g.strokeRect(ix + 0.2, iy + 0.2, iw - 0.4, ih - 0.4);
  const ty = y + ht - 10;
  if (h.label === 'HANG IN THERE') {
    decoText(g, 'HANG IN', x + w / 2, ty + 1, 3, { color: CREAM, lw: 0.55, track: 1.6 });
    decoText(g, 'THERE', x + w / 2, ty + 5, 3, { color: CREAM, lw: 0.55, track: 1.6 });
  } else {
    decoText(g, h.label, x + w / 2, ty + 2, 4, { color: CREAM, lw: 0.65, track: h.label === 'TEAMWORK' ? 1.4 : 2 });
    rect(g, x + w / 2 - 6, ty + 7.6, 12, 0.4, rgba(CREAM, 0.6));
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
  // a thin chrome frame
  rect(g, x - 3, y - 3, w + 6, ht + 6, 'rgba(0,0,0,0.4)');
  rect(g, x - 2.5, y - 2.5, w + 5, ht + 5, chromeV(g, y - 2.5, y + ht + 2.5));
  g.save();
  g.beginPath();
  g.rect(x, y, w, ht);
  g.clip();
  if (h.variant === 1) {
    // an airbrushed pastel skyline at sundown, a Chippendale top among the towers
    const sg = g.createLinearGradient(0, y, 0, y + ht);
    sg.addColorStop(0, '#6a5aa8');
    sg.addColorStop(0.55, '#f294a8');
    sg.addColorStop(1, '#fbd2a8');
    rect(g, x, y, w, ht, sg);
    sunsetDisc(g, x + w * 0.5, y + ht * 0.62, ht * 0.22, 4, null);
    g.fillStyle = '#3a6a7a';
    rect(g, x + 1, y + ht * 0.55, 8, ht, '#3a6a7a');
    rect(g, x + w - 10, y + ht * 0.48, 9, ht, '#2e5a6a');
    const tx = x + w / 2;
    rect(g, tx - 6, y + ht * 0.3, 12, ht, '#e6a8a0');
    g.fillStyle = '#e6a8a0';
    g.beginPath();
    g.moveTo(tx - 6, y + ht * 0.3);
    g.lineTo(tx - 1.6, y + ht * 0.16);
    g.arc(tx, y + ht * 0.16 + 0.8, 1.6, PI, 0, true);
    g.lineTo(tx + 6, y + ht * 0.3);
    g.fill();
    for (let yy = y + ht * 0.34; yy < y + ht; yy += 2.4) rect(g, tx - 4, yy, 8, 0.6, 'rgba(120,60,70,0.4)');
  } else {
    // Memphis: a squiggle, a triangle, a disc, a grid and confetti on black
    rect(g, x, y, w, ht, '#18141c');
    disc(g, x + w * 0.3, y + ht * 0.6, ht * 0.28, '#4ac0b0');
    g.fillStyle = '#f2c84a';
    poly(g, [x + w * 0.55, y + ht * 0.85, x + w * 0.78, y + ht * 0.2, x + w * 0.95, y + ht * 0.85]);
    g.fill();
    g.strokeStyle = '#f05a9a';
    g.lineWidth = 2.2;
    g.beginPath();
    for (let q = 0; q <= 8; q++) g.lineTo(x + 4 + q * (w - 8) / 8, y + ht * 0.3 + (q % 2 ? -4 : 4));
    g.stroke();
    g.strokeStyle = 'rgba(240,236,230,0.6)';
    g.lineWidth = 0.4;
    g.beginPath();
    for (let q = 0; q < 5; q++) {
      g.moveTo(x + w * 0.05 + q * 2.4, y + ht * 0.7);
      g.lineTo(x + w * 0.05 + q * 2.4, y + ht * 0.95);
      g.moveTo(x + w * 0.05, y + ht * 0.7 + q * 2.4);
      g.lineTo(x + w * 0.05 + 9.6, y + ht * 0.7 + q * 2.4);
    }
    g.stroke();
    const R = rng(77);
    for (let q = 0; q < 14; q++) rect(g, x + R() * w, y + R() * ht, 1.2, 0.6, ['#f05a9a', '#4ac0b0', '#f2c84a', '#ffffff'][q % 4]);
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
  steppedSurround(g, x, y, w, ht, fl === 'exec' ? goldV(g, y - 9, y + ht) : chromeV(g, y - 9, y + ht));
  if (h.label === 'CEO') {
    // tufted burgundy leather with a brass nailhead grid
    rect(g, x, y, w, ht, lacquerV(g, y, y + ht, OX.lo, OX.mid));
    g.fillStyle = rgba(GOLD.hi, 0.55);
    for (let yy = y + 5; yy < y + ht - 4; yy += 6) {
      for (let xx = x + 4 + ((yy - y) % 12 ? 3 : 0); xx < x + w - 3; xx += 6) g.fillRect(xx - 0.4, yy - 0.4, 0.8, 0.8);
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
  // MEETING 4B: a teal door, a glass-block sidelight, a brass lever, a red LED sign
  const dw = w - 9;
  rect(g, x, y, dw, ht, lacquerV(g, y, y + ht, JADE.lo, JADE.mid));
  glassBlock(g, x + dw, y, 9, ht, 4.5);
  rect(g, x + dw - 0.5, y, 1, ht, chromeV(g, y, y + ht));
  g.fillStyle = 'rgba(220,240,236,0.25)';
  g.fillRect(x + 4, y + 6, dw - 8, ht * 0.38);
  for (let yy = y + 8; yy < y + 6 + ht * 0.38; yy += 2.4) rect(g, x + 4, yy, dw - 8, 0.4, 'rgba(255,255,255,0.3)');
  rect(g, x + 3, y + ht * 0.6, dw - 6, 11, INK);
  g.strokeStyle = GOLD.mid;
  g.lineWidth = 0.5;
  g.strokeRect(x + 3.5, y + ht * 0.6 + 0.5, dw - 7, 10);
  decoText(g, 'MEETING', x + dw / 2, y + ht * 0.6 + 1.6, 3.1, { color: GOLD.hi, lw: 0.55, track: 1.2 });
  decoText(g, '4B', x + dw / 2, y + ht * 0.6 + 6, 3.4, { color: GOLD.hi, lw: 0.55, track: 1.5 });
  rect(g, x + dw - 7, y + ht * 0.53, 4, 1.2, GOLD.mid);
  rect(g, x + w / 2 - 11, y - 17, 22, 7, INK);
  rect(g, x + w / 2 - 10, y - 16, 20, 5, '#2a0808');
  const lg = g.createRadialGradient(x + w / 2, y - 13, 1, x + w / 2, y - 13, 16);
  lg.addColorStop(0, 'rgba(255,60,60,0.3)');
  lg.addColorStop(1, 'rgba(255,60,60,0)');
  rect(g, x + w / 2 - 16, y - 29, 32, 32, lg);
  decoText(g, 'IN USE', x + w / 2, y - 14.95, 2.9, { color: NEON.red, lw: 0.6, track: 1.5 });
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
  rect(g, x - 2, y - 2, w + 4, 4, chromeV(g, y - 2, y + 2));
  rect(g, x, y + 2, w, ht - 2, lacquerV(g, y, y + ht));
  const ix = x + 4, iy = y + 6, iw = w - 8, ih = ht - 24;
  const ig = g.createLinearGradient(0, iy, 0, iy + ih);
  ig.addColorStop(0, '#6a3a5a');
  ig.addColorStop(0.5, '#3a2236');
  ig.addColorStop(1, '#180e18');
  rect(g, ix, iy, iw, ih, ig);
  neonLine(g, ix + 2, ix + iw - 2, iy + 1.5, NEON.pink, 0.45);
  const cup = (cx, by, sc) => {
    g.fillStyle = goldV(g, by - 10 * sc, by);
    g.beginPath();
    g.moveTo(cx - 4 * sc, by - 10 * sc);
    g.quadraticCurveTo(cx - 4 * sc, by - 4 * sc, cx - 0.8 * sc, by - 3.5 * sc);
    g.lineTo(cx - 0.8 * sc, by - 1.5 * sc);
    g.lineTo(cx - 2.6 * sc, by - 1.5 * sc);
    g.lineTo(cx - 2.6 * sc, by);
    g.lineTo(cx + 2.6 * sc, by);
    g.lineTo(cx + 2.6 * sc, by - 1.5 * sc);
    g.lineTo(cx + 0.8 * sc, by - 1.5 * sc);
    g.lineTo(cx + 0.8 * sc, by - 3.5 * sc);
    g.quadraticCurveTo(cx + 4 * sc, by - 4 * sc, cx + 4 * sc, by - 10 * sc);
    g.closePath();
    g.fill();
  };
  const shelves = [iy + ih * 0.33, iy + ih * 0.66, iy + ih];
  shelves.forEach((sy, i) => {
    rect(g, ix, sy - 1, iw, 1.2, SILVER.lo);
    g.globalAlpha = 1 - i * 0.25;
    if (i === 0) {
      cup(ix + iw * 0.25, sy - 1, 1);
      cup(ix + iw * 0.72, sy - 1, 0.8);
      g.fillStyle = chromeV(g, sy - 13, sy);
      g.beginPath();
      g.ellipse(ix + iw * 0.5, sy - 6, 3, 4, 0, 0, TAU);
      g.fill();
    } else if (i === 1) {
      rect(g, ix + 4, sy - 9, 10, 8, '#2a1a20');
      rect(g, ix + 5, sy - 8, 8, 6, GOLD.lo);
      cup(ix + iw * 0.62, sy - 1, 0.9);
    } else {
      cup(ix + iw * 0.3, sy - 1, 0.7);
      cup(ix + iw * 0.7, sy - 1, 0.7);
    }
    g.globalAlpha = 1;
  });
  rect(g, x + w / 2 - 0.6, iy, 1.2, ih, chromeH(g, x + w / 2 - 0.6, x + w / 2 + 0.6));
  g.strokeStyle = SILVER.mid;
  g.lineWidth = 1;
  g.strokeRect(ix, iy, iw, ih);
  g.fillStyle = 'rgba(255,230,240,0.07)';
  poly(g, [ix + 6, iy, ix + 16, iy, ix + 4, iy + ih, ix - 6, iy + ih]);
  g.fill();
  rect(g, x + 3, y + ht - 16, w - 6, 13, '#120c14');
  g.strokeStyle = rgba(SILVER.mid, 0.4);
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
  const spines = ['#2a7c76', '#b0507a', '#5e4e8e', '#1e2a44', '#c88a7a', '#3a3040', '#7a2a4a'];
  for (let r = 0; r < rows; r++) {
    const sy = y + 6 + r * rh;
    const by = sy + rh;
    rect(g, x + inner, sy, w - inner * 2, rh, '#0e0907');
    let bx = x + inner + 1;
    while (bx < x + w - inner - 2) {
      if (R() < 0.08) {
        // an ornament: a little bronze bust or a gold sunburst clock
        if (R() < 0.5) {
          // a Memphis vase
          rect(g, bx + 1, by - 8, 4, 8, '#e86a9a');
          g.strokeStyle = INK;
          g.lineWidth = 0.4;
          g.beginPath();
          g.moveTo(bx + 1, by - 5);
          g.lineTo(bx + 2, by - 6);
          g.lineTo(bx + 3, by - 4.6);
          g.lineTo(bx + 4, by - 6);
          g.lineTo(bx + 5, by - 5);
          g.stroke();
          disc(g, bx + 3, by - 8.8, 1.2, '#f2c84a');
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
  a: '#c86a90', b: '#2a2858',
  under: (g, px, py, pw, ph) => sunsetDisc(g, px + pw * 0.78, py + ph * 0.3, pw * 0.26, 5, null),
  towers: [[0.02, 0.3, 0.16, '#3a7a8a', '#8ad8d8'], [0.82, 0.18, 0.16, '#2e5a7a', '#7ac0d8'], [0.13, 0.44, 0.14, '#2a4a6a', '#5a9ab8'], [0.68, 0.4, 0.14, '#3a4a7a', '#7a8ac8']],
  varnish: 'rgba(255,236,246,0.12)',
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
    const base = { lobby: ['#3a2430', '#5a3846'], open: ['#d4cbc0', '#ebe2d6'], exec: ['#1c1222', '#34203c'] }[fl];
    const gr = g.createLinearGradient(0, 0, 0, y1);
    gr.addColorStop(0, base[0]);
    gr.addColorStop(1, base[1]);
    rect(g, ua, 0, ub - ua, y1, gr);
    if (fl === 'open') {
      // the drop ceiling: acoustic tiles on a white grid
      for (let u = Math.floor(ua / 30) * 30; u < ub; u += 30) rect(g, u, 0, 0.7, y1, '#b4aa9c');
      rect(g, ua, y1 * 0.45, ub - ua, 0.7, '#b4aa9c');
    } else {
      for (let u = Math.floor(ua / 60) * 60; u < ub; u += 60) rect(g, u, 0, 0.8, y1, rgba(GOLD.mid, 0.35));
      rect(g, ua, y1 * 0.5, ub - ua, 0.6, rgba(GOLD.mid, 0.35));
      for (const u of L.us) {
        if (!near(u, u, ua, ub, 20)) continue;
        g.fillStyle = chromeV(g, y1 - 2, y1);
        g.beginPath();
        g.ellipse(u, y1, 6, 1.8, 0, PI, TAU);
        g.fill();
      }
    }
  };
}

function lightSprite(k, variant, on) {
  if (variant === 'globe') {
    return sprite(k, -24, -40, 48, 64, (g) => {
      const hg = g.createRadialGradient(0, -7, 2, 0, -7, 22);
      hg.addColorStop(0, 'rgba(255,230,220,0.32)');
      hg.addColorStop(1, 'rgba(255,230,220,0)');
      rect(g, -24, -30, 48, 46, hg);
      g.strokeStyle = SILVER.lo;
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse(0, -7, 11, 2.6, 0, PI, TAU);
      g.stroke();
      const sg = g.createRadialGradient(-2, -9, 1, 0, -7, 7.5);
      sg.addColorStop(0, '#ffffff');
      sg.addColorStop(1, '#f2d8d0');
      disc(g, 0, -7, 7, sg);
      g.strokeStyle = chromeH(g, -11, 11);
      g.lineWidth = 1.3;
      g.beginPath();
      g.ellipse(0, -7, 11, 2.6, 0, 0, PI);
      g.stroke();
      rect(g, -1.5, -15, 3, 2, SILVER.mid);
    });
  }
  if (variant === 'tube') {
    // a parabolic troffer: chrome egg-crate louvres
    return sprite(k, -26, -6, 52, 30, (g) => {
      if (on) {
        const lg = g.createLinearGradient(0, 0, 0, 22);
        lg.addColorStop(0, 'rgba(255,250,240,0.2)');
        lg.addColorStop(1, 'rgba(255,250,240,0)');
        g.fillStyle = lg;
        poly(g, [-20, 0, 20, 0, 26, 22, -26, 22]);
        g.fill();
      }
      rect(g, -23, -5, 46, 5, chromeV(g, -5, 0));
      rect(g, -21, -4.2, 42, 3.6, on ? '#fffaf0' : '#8a8680');
      for (let x = -21; x <= 21; x += 4.2) rect(g, x - 0.3, -4.2, 0.6, 3.6, on ? 'rgba(150,150,160,0.7)' : '#5a5650');
      rect(g, -21, -2.6, 42, 0.5, on ? 'rgba(150,150,160,0.7)' : '#5a5650');
    });
  }
  // pendant: a chrome cone, a halogen glow tinted pink
  return sprite(k, -32, -30, 64, 90, (g) => {
    const hg = g.createRadialGradient(0, -2, 2, 0, -2, 30);
    hg.addColorStop(0, 'rgba(255,200,170,0.38)');
    hg.addColorStop(1, 'rgba(255,170,190,0)');
    rect(g, -32, -30, 64, 60, hg);
    const cone = g.createLinearGradient(0, 0, 0, 56);
    cone.addColorStop(0, 'rgba(255,200,190,0.12)');
    cone.addColorStop(1, 'rgba(255,200,190,0)');
    g.fillStyle = cone;
    poly(g, [-8, 0, 8, 0, 22, 58, -22, 58]);
    g.fill();
    g.fillStyle = chromeH(g, -8, 8);
    poly(g, [-2, -13, 2, -13, 8, -2, -8, -2]);
    g.fill();
    rect(g, -8, -2.5, 16, 1, GOLD.mid);
    disc(g, 0, -1, 1.8, '#fff6e8');
    rect(g, -1.5, -14, 3, 2, SILVER.mid);
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
    rect(ctx, l.x - 0.5, top, 1, rodTo - top, SILVER.lo);
    rect(ctx, l.x - 0.15, top, 0.4, rodTo - top, SILVER.hi);
    blit(ctx, B.light(l.variant, true), l.x, y);
  }
}

// ================================================================== FLOOR + SLAB
const FLOORS = {
  lobby: { top: '#7a4a56', bot: '#3c222e', joint: GOLD.mid, jointA: 0.32, every: 64, pool: 'rgba(255,228,216,', poolA: 0.2, reflect: 0.17, rows: true },
  open: { top: '#2c3c46', bot: '#18242c', joint: '#000000', jointA: 0.32, every: 40, pool: 'rgba(250,240,230,', poolA: 0.06, reflect: 0, rows: false },
  exec: { top: '#86593c', bot: '#46291a', joint: '#000000', jointA: 0.4, every: 14, pool: 'rgba(255,140,160,', poolA: 0.26, reflect: 0.2, rows: false },
};
// The Memphis carpet's confetti, laid out once in floor space: u along the lane (repeating
// every CONFETTI_P lane px) and k, the depth (1 at the lane, 0.24 at the wall). Uniform in
// distance, so it bunches toward the wall the way a real carpet does.
const CONFETTI_P = 360;
const CONFETTI = (() => {
  const R = rng(4242);
  const cols = ['#e86aa0', '#5fd0c0', '#e8c860', '#a88ad8'];
  return Array.from({ length: 64 }, (_, i) => ({
    u: R() * CONFETTI_P, k: 1 / (1 + R() * 3.1), type: i % 4, col: cols[Math.floor(R() * 4)], rot: R() * PI,
  }));
})();
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
    // honey parquet planks running toward you, alternate planks a shade lighter
    ctx.fillStyle = 'rgba(255,200,150,0.08)';
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
    // Memphis confetti on a charcoal-teal carpet, each piece where it lies on the floor
    for (const c of CONFETTI) {
      const y = HORIZON + 37 * c.k;
      if (y < top + 0.6 || y > bot - 0.6) continue;
      const uMin = S + FLOOR_CX + (-14 - FLOOR_CX) / c.k;
      const uMax = S + FLOOR_CX + (494 - FLOOR_CX) / c.k;
      const sc = 2.4 * c.k;
      ctx.fillStyle = rgba(c.col, 0.42);
      ctx.strokeStyle = rgba(c.col, 0.42);
      ctx.lineWidth = 0.7 * c.k + 0.2;
      for (let u = c.u + Math.ceil((uMin - c.u) / CONFETTI_P) * CONFETTI_P; u < uMax; u += CONFETTI_P) {
        const x = X(u, y);
        const ca = Math.cos(c.rot) * sc, sa = Math.sin(c.rot) * sc * 0.4;
        if (c.type === 0) {
          ctx.beginPath();
          ctx.ellipse(x, y, sc * 0.8, sc * 0.32, 0, 0, TAU);
          ctx.fill();
        } else if (c.type === 1) {
          poly(ctx, [x - ca, y - sa, x + ca, y + sa, x + sa * 2, y - sc * 0.5]);
          ctx.fill();
        } else if (c.type === 2) {
          ctx.beginPath();
          ctx.moveTo(x - ca, y - sa);
          ctx.lineTo(x + ca, y + sa);
          ctx.stroke();
        } else {
          ctx.beginPath();
          for (let q = 0; q <= 4; q++) {
            const t2 = q / 4 - 0.5;
            ctx.lineTo(x + ca * t2 * 2, y + sa * t2 * 2 + (q % 2 ? -0.35 : 0.35) * sc * 0.6);
          }
          ctx.stroke();
        }
      }
    }
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
  // black granite, a brass nosing, a neon tube along the face
  const gr = g.createLinearGradient(0, y0, 0, FRAME_H);
  gr.addColorStop(0, '#221c24');
  gr.addColorStop(1, '#0e0b10');
  rect(g, 0, y0, SLAB_P, H, gr);
  for (const off of [-SLAB_P, 0, SLAB_P]) {
    g.save();
    g.translate(off, 0);
    speckle(g, 0, y0 + 4, SLAB_P, H - 4, fl === 'lobby' ? 501 : fl === 'open' ? 502 : 503, ['#5a4e58', '#8a7480', '#000000'], 0.18);
    g.restore();
  }
  g.globalAlpha = 0.75;
  neonLine(g, -2, SLAB_P + 2, y0 + 14, fl === 'open' ? NEON.cyan : NEON.pink, 0.45);
  g.globalAlpha = 1;
  rect(g, 0, y0 + 22, SLAB_P, 0.6, rgba(GOLD.mid, 0.45));
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
  // a terrazzo pot, a teal rim
  const tg = g.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
  tg.addColorStop(0, '#7a525a');
  tg.addColorStop(0.35, '#b08a8a');
  tg.addColorStop(1, '#6a464e');
  g.fillStyle = tg;
  poly(g, [cx - w / 2, -h, cx + w / 2, -h, cx + w / 2 - 1.5, 0, cx - w / 2 + 1.5, 0]);
  g.fill();
  speckle(g, cx - w / 2 + 1, -h + 2, w - 2, h - 2, Math.round(cx * 13 + h), ['#2a6a66', '#1a1418', '#f0d0c0'], 1.4);
  rect(g, cx - w / 2 - 1, -h, w + 2, 1.6, JADE.mid);
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

const PLANT_C = { a: '#18463a', b: '#266650', vein: 'rgba(150,230,200,0.5)' };

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
  // a beige terminal with a green screen, a phone
  rect(g, 15, -47, 15, 12, '#a89c80');
  rect(g, 15, -47, 15, 1, '#c8bc9e');
  rect(g, 16.5, -45.5, 12, 8, '#163828');
  for (let q = 0; q < 3; q++) rect(g, 18, -44 + q * 2.2, 6 + (q % 2) * 3, 0.6, 'rgba(120,255,160,0.75)');
  rect(g, 20, -35, 5, 1, '#8a7e64');
  rect(g, w - 26, -37, 8, 2.6, '#a89c80');
  rect(g, w - 25, -38.4, 6, 1.4, '#8a7e64');
  // the curved desk in rose granite, a teal band, a chrome rail, a pink neon lip
  g.save();
  rr(g, 0, -34, w, 34, 15);
  g.clip();
  rect(g, 0, -34, w, 34, lacquerV(g, -34, 0, ROSE.dk, '#9a6070'));
  speckle(g, 0, -34, w, 34, 919, ['#e8b8b0', '#2a1418'], 0.7);
  rect(g, 0, -22, w, 4, JADE.lo);
  rect(g, 0, -22, w, 0.6, JADE.mid);
  rect(g, 0, -4, w, 4, ROSE.deep);
  g.restore();
  rect(g, 8, -34.5, w - 16, 1.6, chromeV(g, -34.5, -32.9));
  neonLine(g, 14, w - 14, -31.4, NEON.pink, 0.32);
  g.fillStyle = chromeV(g, -24, -16);
  g.beginPath();
  g.ellipse(w / 2, -20, 2.6, 3.4, 0, 0, TAU);
  g.fill();
}

function receptionist(ctx, x, base, dy) {
  // big hair, shoulder pads, gold hoops
  const cx = x + 62, y = base - 41 + dy;
  ctx.fillStyle = '#7a2a5a';
  poly(ctx, [cx - 11, y + 13, cx - 10, y + 5.5, cx - 4, y + 4, cx + 4, y + 4, cx + 10, y + 5.5, cx + 11, y + 13]);
  ctx.fill();
  ctx.fillStyle = '#f2e6dc';
  poly(ctx, [cx - 2, y + 4, cx + 2, y + 4, cx, y + 8]);
  ctx.fill();
  ctx.fillStyle = '#6a3a22';
  for (const [hx, hy, r] of [[-5, -3, 3.4], [5, -3, 3.4], [0, -5, 3.8], [-6.5, 1, 2.8], [6.5, 1, 2.8], [-3, -6, 2.6], [3, -6, 2.6]]) disc(ctx, cx + hx, y + hy, r, '#6a3a22');
  disc(ctx, cx, y, 4.4, '#e6b892');
  ctx.fillStyle = '#6a3a22';
  ctx.beginPath();
  ctx.ellipse(cx, y - 2.6, 4.6, 2.4, 0, PI, TAU);
  ctx.fill();
  rect(ctx, cx - 1.8, y + 0.2, 1, 0.8, INK);
  rect(ctx, cx + 0.8, y + 0.2, 1, 0.8, INK);
  rect(ctx, cx - 0.9, y + 2.4, 1.8, 0.7, '#e0407a');
  ctx.strokeStyle = GOLD.hi;
  ctx.lineWidth = 0.5;
  for (const s2 of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx + s2 * 4.4, y + 2.4, 1.1, 0, TAU);
    ctx.stroke();
  }
}

function turnstilesPaint(g, w) {
  const n = 4;
  for (let i = 0; i < n; i++) {
    const px = (i / (n - 1)) * (w - 6);
    if (i < n - 1) {
      const gx0 = px + 6, gx1 = (i + 1) / (n - 1) * (w - 6);
      const mid = (gx0 + gx1) / 2;
      for (const [a, b] of [[gx0, mid - 1], [mid + 1, gx1]]) {
        g.fillStyle = 'rgba(80,200,190,0.26)';
        rr(g, a, -20, b - a, 10, 2);
        g.fill();
        rect(g, a, -20, b - a, 0.5, rgba(JADE.hi, 0.6));
      }
    }
    g.fillStyle = lacquerH(g, px, px + 6, '#4a4e58', '#a8b0ba');
    rr(g, px, -24, 6, 24, 1.5);
    g.fill();
    rect(g, px - 0.5, -26, 7, 2.4, '#1c1820');
    rect(g, px + 1.6, -21, 2.8, 1.4, i % 2 ? '#3fbf8a' : NEON.red);
  }
}

function sofaPaint(g, w) {
  const body = '#1c4646', hi = '#2e6262';
  rect(g, 4, -2, w - 8, 2, SILVER.lo);
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
  // a Memphis plinth, a chrome egg in a pink ring
  rect(g, 4, -18, 32, 18, '#26202c');
  g.strokeStyle = 'rgba(232,106,160,0.6)';
  g.lineWidth = 0.9;
  g.beginPath();
  for (let q = 0; q <= 8; q++) g.lineTo(6 + q * 3.5, -10 + (q % 2 ? -3 : 3));
  g.stroke();
  g.fillStyle = 'rgba(232,200,96,0.7)';
  poly(g, [30, -18, 36, -18, 36, -12]);
  g.fill();
  rect(g, 8, -22, 24, 4, '#2a6a66');
  rect(g, 8, -22, 24, 0.7, JADE.mid);
  const cx = 20, cy = -36;
  g.strokeStyle = rgba(OX.hi, 0.7);
  g.lineWidth = 1.2;
  g.beginPath();
  g.ellipse(cx, cy, 15, 4, -0.35, PI, TAU);
  g.stroke();
  const eg = g.createLinearGradient(cx - 8, cy - 11, cx + 8, cy + 11);
  eg.addColorStop(0, '#c8ced6');
  eg.addColorStop(0.45, '#7a828c');
  eg.addColorStop(0.6, '#b8a0b0');
  eg.addColorStop(1, '#3e444c');
  g.fillStyle = eg;
  g.beginPath();
  g.ellipse(cx, cy, 8, 11, 0, 0, TAU);
  g.fill();
  rect(g, cx - 1.2, -25, 2.4, 3, '#4a4e58');
  g.strokeStyle = rgba(OX.hi, 0.85);
  g.beginPath();
  g.ellipse(cx, cy, 15, 4, -0.35, 0, PI);
  g.stroke();
}

function coolerPaint(g) {
  g.fillStyle = lacquerH(g, 0, 14, '#6e6656', '#a49a84');
  rr(g, 0, -28, 14, 28, 2);
  g.fill();
  for (const y of [-20, -12]) rect(g, 1, y, 12, 0.5, 'rgba(255,250,235,0.3)');
  rect(g, 3, -25, 2, 2, '#3a7ad8');
  rect(g, 9, -25, 2, 2, NEON.red);
  g.fillStyle = 'rgba(110,160,220,0.5)';
  rr(g, 1.5, -44, 11, 16, 4);
  g.fill();
  rect(g, 1.5, -40, 11, 0.5, 'rgba(210,235,255,0.4)');
  rect(g, 3, -42, 1.4, 12, 'rgba(230,245,255,0.35)');
  rect(g, 5, -46, 4, 2.5, '#5a7aa8');
}

function copierPaint(g, w) {
  // a big putty-grey copier, a charcoal lid, a green LED panel and an orange start key
  g.fillStyle = lacquerV(g, -26, 0, '#5e584c', '#8e8676');
  rr(g, 0, -26, w, 26, 2.5);
  g.fill();
  rect(g, 1, -14, w - 2, 0.8, 'rgba(30,28,24,0.5)');
  rect(g, 1, -6, w - 2, 0.8, 'rgba(30,28,24,0.4)');
  rect(g, 1, -30, w - 2, 4, '#2e2c30');
  rect(g, 1, -30, w - 2, 0.6, 'rgba(200,200,210,0.4)');
  rect(g, w - 12, -23, 9, 4, '#1a1a1c');
  rect(g, w - 11, -22, 4, 2, '#3fbf8a');
  disc(g, w - 5, -21, 0.9, '#ff8a2a');
  rect(g, w - 1, -18, 5, 1.4, '#6e685a');
}

function cabinetPaint(g, m) {
  g.fillStyle = lacquerH(g, 0, 20, '#4e4a40', '#7a7464');
  g.fillRect(0, -44, 20, 44);
  rect(g, 0, -44, 20, 0.8, rgba(SILVER.mid, 0.5));
  for (let i = 0; i < 4; i++) {
    const y = -43 + i * 10.6;
    rect(g, 1.2, y + 1, 17.6, 9.2, rgba('#000000', 0.15));
    rect(g, 1.2, y + 10, 17.6, 0.5, rgba('#000000', 0.5));
    rect(g, 7, y + 3, 6, 1.6, rgba('#e8dcc4', 0.4));
    rect(g, 7.5, y + 6, 5, 1.1, SILVER.mid);
  }
  if (m && m.i % 2 === 1) {
    // a fax on top, a curl of paper out of the back
    rect(g, 2, -49, 16, 5, '#9a8e74');
    rect(g, 2, -49, 16, 0.8, '#b8ac90');
    rect(g, 12, -48, 4, 1.4, '#163828');
    g.strokeStyle = 'rgba(230,224,210,0.7)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(4, -49);
    g.quadraticCurveTo(2, -54, 6, -54);
    g.stroke();
  }
}

function cubiclesPaint(g, m) {
  const W = m.x1 - m.x0;
  // beige terminals peeking over the empty desks, green text on the screen, a mug
  for (const d of m.desks) {
    if (d.occupied) continue;
    const dx = d.x - m.x0;
    rect(g, dx + 13, -45, 15, 11, '#a89c80');
    rect(g, dx + 13, -45, 15, 0.8, '#c4b898');
    rect(g, dx + 14.5, -43.5, 12, 7.5, '#14342a');
    for (let q = 0; q < 2; q++) rect(g, dx + 16, -42 + q * 2.4, 5 + q * 3, 0.6, 'rgba(120,255,160,0.7)');
    rect(g, dx + 30, -36.5, 3, 2.6, d.seed % 2 ? '#d85a8a' : JADE.mid);
  }
  for (let d = 0; d < m.desks.length; d++) {
    const dx = d * 40;
    // fabric panels in dusty mauve, a putty plastic cap
    const pg = g.createLinearGradient(0, -34, 0, 0);
    pg.addColorStop(0, '#5e5868');
    pg.addColorStop(1, '#3a3644');
    rect(g, dx, -34, 40, 34, pg);
    for (let y = -32; y < -2; y += 1.4) rect(g, dx + 1, y, 38, 0.3, 'rgba(255,255,255,0.05)');
    rect(g, dx + 3, -16, 34, 0.5, 'rgba(255,170,200,0.25)');
  }
  for (let d = 0; d <= m.desks.length; d++) {
    const px = Math.min(W - 2, d * 40) - 1;
    rect(g, px, -36, 3, 36, '#2a2830');
    rect(g, px - 0.4, -37, 3.8, 1.6, '#9a8e76');
  }
  rect(g, 0, -35.5, W, 1.6, '#8e836c');
  rect(g, 0, -35.5, W, 0.5, '#b4a88e');
}

const SKINS = ['#e2b48e', '#c68e64', '#8d5a3c', '#efc8a2'];
const HAIRS = ['#141014', '#4a2c18', '#c9a46a', '#8a8a8a'];
function head(ctx, x, y, seed, look, opts = {}) {
  const skin = SKINS[Math.floor(hash(seed * 3.1) * 4)];
  const hair = opts.grey ? (hash(seed) < 0.5 ? '#9a9a9a' : '#cfcfcf') : HAIRS[Math.floor(hash(seed * 5.7) * 4)];
  const style = Math.floor(hash(seed * 9.3) * 4);
  if (!opts.grey && style === 1) {
    // a big perm
    for (const [hx, hy, r] of [[-4, -2.6, 3], [4, -2.6, 3], [0, -4.4, 3.4], [-5.2, 1.2, 2.4], [5.2, 1.2, 2.4]]) disc(ctx, x + hx, y + hy, r, hair);
  }
  disc(ctx, x, y, 4.6, skin);
  ctx.fillStyle = hair;
  if (style === 0 || opts.grey) {
    ctx.beginPath();
    ctx.ellipse(x, y - 1.6, 4.9, 3.4, 0, PI, TAU);
    ctx.fill();
    if (!opts.grey) ctx.fillRect(x - 4.8, y - 1, 1.6, 4.4);
    if (!opts.grey) ctx.fillRect(x + 3.2, y - 1, 1.6, 4.4);
    if (opts.grey && hash(seed * 2) < 0.5) disc(ctx, x, y - 3, 2.6, skin);
  } else if (style === 1) {
    ctx.beginPath();
    ctx.ellipse(x, y - 2, 4.6, 2.6, 0, PI, TAU);
    ctx.fill();
  } else if (style === 2) {
    ctx.fillRect(x - 4.6, y - 1, 1.6, 2.6);
    ctx.fillRect(x + 3, y - 1, 1.6, 2.6);
  } else {
    // a Walkman: headphones over a side part
    ctx.beginPath();
    ctx.ellipse(x, y - 1.8, 4.8, 3, 0, PI, TAU);
    ctx.fill();
    ctx.strokeStyle = '#2a2a30';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(x, y - 0.5, 5.2, PI * 1.05, PI * 1.95);
    ctx.stroke();
    disc(ctx, x - 5, y + 0.6, 1.5, '#ff8a2a');
    disc(ctx, x + 5, y + 0.6, 1.5, '#ff8a2a');
  }
  if (opts.specs) {
    ctx.strokeStyle = 'rgba(30,24,30,0.85)';
    ctx.lineWidth = 0.45;
    ctx.strokeRect(x - 3.4, y - 0.8, 2.8, 2.2);
    ctx.strokeRect(x + 0.6, y - 0.8, 2.8, 2.2);
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
  // tall burgundy executive chairs, chrome piping
  for (const c of m.chairs) {
    const cx = c.x - m.x0;
    g.fillStyle = lacquerV(g, -46, -18, '#4a1a34', '#7a3050');
    rr(g, cx - 7, -46, 14, 28, 5);
    g.fill();
    g.strokeStyle = rgba(SILVER.mid, 0.5);
    g.lineWidth = 0.5;
    rr(g, cx - 6, -45, 12, 26, 4.4);
    g.stroke();
    for (let y = -42; y < -22; y += 5) rect(g, cx - 5, y, 10, 0.4, 'rgba(0,0,0,0.35)');
  }
}

function boardTablePaint(g, m) {
  const W = m.x1 - m.x0;
  for (const px of [W * 0.2, W * 0.8]) {
    rect(g, px - 4, -19, 8, 19, chromeH(g, px - 4, px + 4));
    rect(g, px - 8, -3, 16, 3, '#1c1820');
  }
  // black granite top, a chrome edge, a pink reflection along it
  rect(g, -3, -27, W + 6, 6, lacquerV(g, -27, -21, '#16121a', '#4a4252'));
  speckle(g, -3, -27, W + 6, 6, 77, ['#8a7a86', '#000000'], 0.6);
  rect(g, -3, -27, W + 6, 0.8, rgba('#ffb0d0', 0.55));
  rect(g, -3, -22, W + 6, 1, chromeV(g, -22, -21));
  rect(g, 6, -21, W - 12, 3, '#100c12');
  if (m.easel) {
    const ex = W + 6;
    line(g, ex + 12, -54, ex + 2, 0, '#5a5e68', 1.1);
    line(g, ex + 12, -54, ex + 22, 0, '#5a5e68', 1.1);
    line(g, ex + 12, -54, ex + 12, 0, '#3a3e48', 0.8);
    rect(g, ex, -50, 24, 30, '#9c9284');
    rect(g, ex, -50, 24, 2, '#3a3440');
    g.strokeStyle = '#c03a6a';
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
  // shoulder pads and a power tie
  ctx.fillStyle = '#2a2c36';
  poly(ctx, [x - 8, base - 24, x - 7.5, base - 34 + c.nod * 1.5, x + 7.5, base - 34 + c.nod * 1.5, x + 8, base - 24]);
  ctx.fill();
  ctx.fillStyle = '#e8e0cc';
  poly(ctx, [x - 1.6, base - 34 + c.nod * 1.5, x + 1.6, base - 34 + c.nod * 1.5, x, base - 30 + c.nod * 1.5]);
  ctx.fill();
  rect(ctx, x - 0.6, base - 32.4 + c.nod * 1.5, 1.2, 6, ['#d84a7a', JADE.mid, '#e8c860'][c.seed % 3]);
  head(ctx, x, y, c.seed + 11, 0, { grey: hash(c.seed * 1.7) < 0.7, asleep: c.nod > 0.55, specs: hash(c.seed * 3.3) < 0.4 });
}

function deskPaint(g, w) {
  const cx = w * 0.55;
  g.fillStyle = lacquerV(g, -54, -20, '#4a1a34', '#7a3050');
  rr(g, cx - 10, -54, 20, 34, 6);
  g.fill();
  g.strokeStyle = rgba(SILVER.mid, 0.5);
  g.lineWidth = 0.5;
  rr(g, cx - 9, -53, 18, 32, 5);
  g.stroke();
  // a desk in peach-rose lacquer under a glass top on chrome
  g.fillStyle = lacquerV(g, -27, 0, '#7a4650', '#a8686e');
  rr(g, 4, -27, w - 8, 27, 3);
  g.fill();
  rect(g, 4, -4, w - 8, 4, '#3a1e26');
  for (const [y, a] of [[-19, 0.5], [-16.5, 0.4]]) rect(g, 8, y, w - 16, 0.6, rgba(JADE.hi, a));
  rect(g, w * 0.35, -14, w * 0.3, 10, '#4a2830');
  rect(g, 0, -31, w, 3, 'rgba(150,220,214,0.45)');
  rect(g, 0, -31, w, 0.6, 'rgba(230,255,250,0.7)');
  rect(g, 0, -28.2, w, 0.6, chromeV(g, -28.2, -27.6));
  // the green banker's lamp and its pool; a beige computer
  const lx = 20;
  const pool = g.createRadialGradient(lx, -32, 1, lx, -32, 22);
  pool.addColorStop(0, 'rgba(255,210,150,0.45)');
  pool.addColorStop(1, 'rgba(255,210,150,0)');
  rect(g, lx - 24, -50, 48, 22, pool);
  rect(g, lx - 3, -32.5, 6, 1.5, GOLD.mid);
  rect(g, lx - 0.5, -39, 1, 7, GOLD.mid);
  g.fillStyle = '#2f7a4a';
  g.beginPath();
  g.ellipse(lx, -39, 7, 3.6, 0, PI, TAU);
  g.fill();
  rect(g, lx - 7, -39.4, 14, 1, '#ffe7a8');
  rect(g, w - 36, -44, 14, 12, '#a89c80');
  rect(g, w - 34.5, -42.5, 11, 7.5, '#14342a');
  rect(g, w - 33, -41, 6, 0.6, 'rgba(120,255,160,0.7)');
  rect(g, w - 33, -38.6, 8, 0.6, 'rgba(120,255,160,0.7)');
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
  // a Graves tall clock: peach case, teal stripes, a pediment, a round face
  rect(g, 0, -16, 20, 16, lacquerV(g, -16, 0, '#8a5a50', '#c08a78'));
  rect(g, -1, -2, 22, 2, '#3a2a2e');
  rect(g, 3, -50, 14, 34, lacquerH(g, 3, 17, '#9a6a5a', '#d8a890'));
  rect(g, 3, -36, 14, 1.4, JADE.mid);
  rect(g, 3, -33, 14, 0.8, JADE.mid);
  rect(g, 6, -46, 8, 26, '#1a1418');
  g.strokeStyle = rgba(SILVER.mid, 0.6);
  g.lineWidth = 0.5;
  g.strokeRect(6, -46, 8, 26);
  rect(g, 1, -66, 18, 16, lacquerV(g, -66, -50, '#8a5a50', '#c08a78'));
  g.fillStyle = JADE.lo;
  poly(g, [0, -66, 10, -73, 20, -66]);
  g.fill();
  disc(g, 10, -58, 6, '#f2e6d8');
  disc(g, 10, -58, 6.4, 'rgba(0,0,0,0)');
  g.strokeStyle = JADE.lo;
  g.lineWidth = 0.8;
  g.beginPath();
  g.arc(10, -58, 6, 0, TAU);
  g.stroke();
  line(g, 10, -58, 10, -61.8, INK, 0.6);
  line(g, 10, -58, 12.6, -58, INK, 0.6);
  rect(g, 0, -16, 20, 0.6, rgba(JADE.hi, 0.6));
}

const MID_BOX = {
  plant: (m) => ({ palm: [-6, -74, 52, 76], snake: [-4, -38, 24, 40], bonsai: [-2, -42, 22, 44] }[m.variant] || [-4, -64, 38, 66]),
  reception: (m) => [-2, -50, m.w + 4, 52],
  turnstiles: (m) => [-2, -28, m.w + 4, 30],
  sofa: (m) => [-2, -28, m.w + 4, 30],
  sculpture: () => [-2, -56, 44, 58],
  cooler: () => [-2, -48, 18, 50],
  copier: (m) => [-2, -32, m.w + 8, 34],
  cabinet: () => [-2, -58, 24, 60],
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
  cabinet: (g, m) => cabinetPaint(g, m),
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
          ctx.fillStyle = '#b8507a';
          rr(ctx, hx - 7, hy + 4, 14, 12, 3);
          ctx.fill();
          ctx.fillStyle = '#e8dccc';
          poly(ctx, [hx - 2, hy + 4, hx + 2, hy + 4, hx, hy + 7.5]);
          ctx.fill();
          rect(ctx, hx - 0.5, hy + 5.5, 1, 6, JADE.lo);
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
    const key = `${m.kind}|${m.variant}|${m.w}|${m.kind === 'cabinet' ? m.i % 2 : 0}`;
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
      rect(ctx, x + w * 0.2, 26, 0.8, 220, 'rgba(255,190,200,0.12)');
      for (const yy of [40, 44, 48, 230]) rect(ctx, x, yy, w, 1, 'rgba(202,164,86,0.3)');
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
      ctx.fillStyle = '#081814';
      for (const [a, len, wd] of [[-2.4, 46, 4], [-2.0, 50, 4], [-1.57, 40, 3.5], [-1.15, 50, 4], [-0.75, 46, 4], [-2.75, 34, 3.5], [-0.4, 34, 3.5]]) {
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
      ctx.fillStyle = club ? '#1a0814' : '#0d0b10';
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
  id: 'deco86',
  name: 'DECO ’86 — Postmodern',
  note: 'The deco tower rebuilt in 1986, when corporate America did deco all over again: Trump Tower pink marble and '
    + 'brass, Graves keystones and peach plaster, a Chippendale top across the street. Rose granite, seafoam and '
    + 'chrome, glass block and vertical blinds, neon-tube lettering on the EGGCORP sign, LED counters over '
    + 'broken-pediment lifts, Successories posters, beige terminals, a fax and a Memphis confetti carpet. A pastel '
    + 'morning, a noon of mirror glass, then a peach-to-violet dusk with a striped sun, neon crowns and laser '
    + 'searchlights; the silver professor hangs in brass. Everything behind the lane stays mid-dark and quiet.',
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
