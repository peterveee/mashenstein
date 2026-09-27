// CRYPT style bake-off — POP ART / COMIC PRINT. A 1960s horror-comic splash panel seen
// through Lichtenstein: four-colour process inks (cyan, magenta, yellow, black) on white
// stock, flat saturated fills, heavy black brush outlines that thicken on the underside,
// and every tone and gradient a Ben-Day dot screen.
//
// One screen for the whole print: a staggered dot lattice, 6 px pitch, rows every 3 px,
// the same grid on every layer (anchored to the layer, so the dots ride with it). A
// gradient is the dot SIZE changing row by row; each row is its own pattern fill, so
// no dot is ever cut in half. Cached tiles, cached sky; a frame is pattern fills.
//
// The punch lives up top: a navy-to-blue dotted sky, a yellow-tint moon (cyan screen on
// its shaded limb) in a burst of cream-dot rays, a magenta far ridge with a pale dotted
// abbey whose windows are holes to the sky. Every layer nearer is
// darker and quieter, and the bank just above the lane is black silhouette with a thin
// blue rim, so the lane's hazards and hero sit on a calm ground.
//
// Consumes cryptFrame() exactly as ink.js does: sky, then bg -> mid -> fg with the abbey
// behind its ridge, one fog band between mid and fg and one along the lane's back edge.
import { CRYPT_PLAN } from './plan.js';

const TAU = Math.PI * 2;
const K = '#0b0a14';
const PAPER = '#fffaee';
const YEL = '#ffdc1e';
const RED = '#e8302c';
const MAG = '#e0177c';
const CYAN = '#2aa8ec';
const BLUE = '#1f56cc';
const NAVY = '#0d1655';
const VIOLET = '#361e8c';
const STONE = '#3a5bc6';
const RIM = '#2b58cf';
const FOG_HI = '#7478e4';
const FOG_LO = '#3f47ad';

// The Ben-Day screen.
const SP = 6;
const RES = 4;

const mod = (a, n) => ((a % n) + n) % n;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

function seeded(i) {
  const x = Math.sin(i * 91.7 + 17.3) * 43758.5453;
  return x - Math.floor(x);
}

function mk(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// ------------------------------------------------------------ dot screens
// 'flat' tiles hold the whole lattice (centre + corners); 'row' tiles hold one row only
// (corners), so a 6 px band filled with one never picks up its neighbours' dots.
const tiles = new Map();
function tile(ctx, color, r, kind) {
  const rq = Math.round(r * 10) / 10;
  const key = `${kind}|${color}|${rq}`;
  let p = tiles.get(key);
  if (!p) {
    const n = SP * RES;
    const c = mk(n, n);
    const g = c.getContext('2d');
    g.fillStyle = color;
    g.beginPath();
    const R = rq * RES;
    const pts = [[0, 0], [n, 0], [0, n], [n, n]];
    if (kind === 'flat') pts.push([n / 2, n / 2]);
    for (const [x, y] of pts) { g.moveTo(x + R, y); g.arc(x, y, R, 0, TAU); }
    g.fill();
    p = ctx.createPattern(c, 'repeat');
    tiles.set(key, p);
  }
  return p;
}

// A flat tint of `color` dots, radius r, on the lattice anchored at x offset ox.
function flat(ctx, color, r, ox = 0) {
  const p = tile(ctx, color, r, 'flat');
  p.setTransform(new DOMMatrix([1 / RES, 0, 0, 1 / RES, mod(ox, SP), 0]));
  return p;
}

// A graded screen: row y gets dots of radius rOf(y). Fills x0..x1 over rows y0..y1;
// clip first to confine it to a shape.
function rows(ctx, color, rOf, x0, x1, y0, y1, ox = 0) {
  for (let k = Math.floor(y0 / 3); k * 3 <= y1; k++) {
    const y = k * 3;
    const r = Math.min(3, rOf(y));
    if (r < 0.15) continue;
    const odd = mod(k, 2);
    const p = tile(ctx, color, r, 'row');
    p.setTransform(new DOMMatrix([1 / RES, 0, 0, 1 / RES, mod(ox + odd * 3, SP), odd * 3]));
    ctx.fillStyle = p;
    ctx.fillRect(x0, y - 3, x1 - x0, 6);
  }
}

// Individually sized dots on the same lattice (or, with gap, on the holes between its
// dots — a second plate's screen), for radial grades: the moon, the rays, a lamp glow.
function dotField(ctx, color, x0, y0, x1, y1, rOf, ox = 0, gap = false) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let k = Math.floor(y0 / 3); k * 3 <= y1; k++) {
    const y = k * 3;
    const xo = mod(ox + ((mod(k, 2) ^ (gap ? 1 : 0)) ? 3 : 0), SP);
    for (let x = Math.floor((x0 - xo) / SP) * SP + xo; x <= x1; x += SP) {
      const r = rOf(x, y);
      if (r < 0.15) continue;
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, TAU);
    }
  }
  ctx.fill();
}

// ------------------------------------------------------------ ink
// The brush: a black copy of the shape dropped down-left, so the outline runs heavy on
// the underside and the shadow side, light on the moonlit top-right.
function drop(ctx, path, d = 1) {
  ctx.save();
  ctx.translate(-d * 0.55, d);
  ctx.fillStyle = K;
  ctx.fill(path);
  ctx.restore();
}

function outline(ctx, path, lw) {
  ctx.strokeStyle = K;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke(path);
}

function place(local, M) {
  const p = new Path2D();
  p.addPath(local, M);
  return p;
}

function poly(p, pts, close = true) {
  p.moveTo(pts[0], pts[1]);
  for (let k = 2; k < pts.length; k += 2) p.lineTo(pts[k], pts[k + 1]);
  if (close) p.closePath();
  return p;
}

function lancet(p, x, y, w, h) {
  p.moveTo(x - w / 2, y);
  p.lineTo(x - w / 2, y - h + w * 0.6);
  p.quadraticCurveTo(x - w / 2, y - h, x, y - h - w * 0.3);
  p.quadraticCurveTo(x + w / 2, y - h, x + w / 2, y - h + w * 0.6);
  p.lineTo(x + w / 2, y);
  p.closePath();
  return p;
}

// Stroked limbs (trees, grass): optional rim colour offset toward the moon, then black.
function limbs(ctx, paths, w, rim = null) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const passes = rim ? [[rim, 0.8, -0.6, 0.9], [K, 0, 0, 1]] : [[K, 0, 0, 1]];
  for (const [col, dx, dy, k] of passes) {
    ctx.strokeStyle = col;
    for (const p of paths) {
      ctx.lineWidth = w * (p.w ?? 1) * k;
      ctx.beginPath();
      ctx.moveTo(p.pts[0] + dx, p.pts[1] + dy);
      for (let i = 2; i < p.pts.length; i += 2) ctx.lineTo(p.pts[i] + dx, p.pts[i + 1] + dy);
      ctx.stroke();
    }
  }
}

// ------------------------------------------------------------------ sky
// Gradient, rays and moon never move, so they are printed once per device scale.
let skyCache = null;
let skyScale = 0;
function skyCanvas(ctx, f) {
  const m = ctx.getTransform ? ctx.getTransform() : { a: 1, b: 0 };
  const sc = Math.min(4, Math.max(1, Math.ceil(Math.hypot(m.a, m.b) * 2) / 2));
  if (skyCache && skyScale === sc) return skyCache;
  const c = mk(Math.ceil(560 * sc), Math.ceil(430 * sc));
  const g = c.getContext('2d');
  g.setTransform(sc, 0, 0, sc, 40 * sc, 80 * sc);
  printSky(g, f.moon);
  skyCache = c;
  skyScale = sc;
  return c;
}

function printSky(g, m) {
  g.fillStyle = BLUE;
  g.fillRect(-40, -80, 560, 430);
  // Navy screen: near-solid at the top, dots shrinking to nothing toward the horizon.
  rows(g, NAVY, (y) => 3 * clamp01((178 - y) / 165) ** 0.8, -40, 520, -80, 350);
  // Cyan plate on the holes, lifting the horizon behind the hills.
  dotField(g, CYAN, -40, 90, 520, 240, (x, y) => 1.7 * clamp01((y - 110) / 90), 0, true);

  // POW: a ring of cream-dot rays round the moon, long and short in turn, printed on
  // the second plate's screen (the holes between the navy dots).
  const N = 24;
  dotField(g, '#fff3c4', m.x - 110, m.y - 110, m.x + 110, m.y + 110, (x, y) => {
    const dx = x - m.x;
    const dy = y - m.y;
    const d = Math.hypot(dx, dy);
    if (d < m.r + 3) return 0;
    const a = Math.atan2(dy, dx) + 0.13;
    const ray = Math.cos(a * N / 2);
    if (ray <= 0.2) return 0;
    const k = Math.floor(((a / TAU) * N / 2 + 0.25 + N) % N);
    const reach = k % 2 ? 34 : 64;
    const fall = clamp01(1 - (d - m.r - 3) / reach);
    return 2.2 * ((ray - 0.2) / 0.8) ** 0.7 * fall ** 0.9;
  }, 0, true);

  // The moon: a yellow tint (dots on white stock), a cyan screen greening its shaded
  // limb, cyan-dot craters with brush undersides, a heavy black rim.
  const disc = new Path2D();
  disc.arc(m.x, m.y, m.r, 0, TAU);
  drop(g, disc, 1.6);
  g.fillStyle = PAPER;
  g.fill(disc);
  g.fillStyle = flat(g, YEL, 2.2);
  g.fill(disc);
  g.save();
  g.clip(disc);
  dotField(g, CYAN, m.x - m.r - 4, m.y - m.r - 4, m.x + m.r + 4, m.y + m.r + 4, (x, y) =>
    2.3 * clamp01((Math.hypot(x - (m.x + 10), y - (m.y - 10)) - 15) / 22), 0, true);
  for (const [dx, dy, rx, ry] of [[-9, 4, 5.6, 4.6], [7, -11, 3.2, 2.6], [11, 9, 2.3, 1.9]]) {
    const cr = new Path2D();
    cr.ellipse(m.x + dx, m.y + dy, rx, ry, 0, 0, TAU);
    drop(g, cr, 0.9);
    g.fillStyle = '#c9e37a';
    g.fill(cr);
    g.fillStyle = flat(g, CYAN, 1.5);
    g.fill(cr);
    outline(g, cr, 0.6);
  }
  g.restore();
  outline(g, disc, 1.8);
  g.strokeStyle = PAPER;
  g.lineWidth = 1.6;
  g.lineCap = 'round';
  g.beginPath();
  g.arc(m.x, m.y, m.r - 4.5, -1.35, -0.55);
  g.stroke();
  g.beginPath();
  g.arc(m.x, m.y, m.r - 4.5, -0.35, -0.2);
  g.stroke();
}

function star(ctx, s) {
  const R = (1.1 + s.s * 1.5) * (0.55 + 0.45 * s.twinkle);
  const x = s.x;
  const y = s.y;
  ctx.moveTo(x, y - R);
  ctx.quadraticCurveTo(x + R * 0.12, y - R * 0.12, x + R, y);
  ctx.quadraticCurveTo(x + R * 0.12, y + R * 0.12, x, y + R);
  ctx.quadraticCurveTo(x - R * 0.12, y + R * 0.12, x - R, y);
  ctx.quadraticCurveTo(x - R * 0.12, y - R * 0.12, x, y - R);
  ctx.closePath();
}

// A comic cloud: a row of round puffs on a flat underside, violet from a magenta screen
// over blue ink, a white rim of moonlight on the tops of the puffs.
function cloudLobes(c) {
  const n = Math.max(3, Math.round(c.w / 26));
  const x0 = c.x + c.h * 0.3;
  const x1 = c.x + c.w - c.h * 0.3;
  // Puffs of uneven width: cumulative seeded weights across the span.
  const wts = [];
  for (let k = 0; k < n; k++) wts.push(0.65 + 0.7 * seeded(c.i * 29 + k * 3));
  const sum = wts.reduce((a, b) => a + b, 0);
  const out = [];
  let acc = 0;
  for (let k = 0; k < n; k++) {
    const a = x0 + (acc / sum) * (x1 - x0);
    acc += wts[k];
    const b = x0 + (acc / sum) * (x1 - x0);
    const edge = k === 0 || k === n - 1 ? 0.75 : 1;
    const wide = (b - a) / ((x1 - x0) / n);
    out.push({ a, b, lift: c.h * (0.42 + 0.3 * seeded(c.i * 17 + k) + 0.18 * wide) * edge });
  }
  return out;
}

function cloud(ctx, c) {
  const yb = c.y + c.h;
  const base = c.y + c.h * 0.62;
  const lobes = cloudLobes(c);
  const p = new Path2D();
  p.moveTo(c.x + c.h * 0.6, yb);
  p.quadraticCurveTo(c.x - c.h * 0.1, yb, lobes[0].a, base);
  for (const L of lobes) p.ellipse((L.a + L.b) / 2, base, (L.b - L.a) / 2, L.lift, 0, Math.PI, TAU);
  p.quadraticCurveTo(c.x + c.w + c.h * 0.1, yb, c.x + c.w - c.h * 0.6, yb);
  p.closePath();
  drop(ctx, p, 1.6);
  ctx.fillStyle = '#4a33b4';
  ctx.fill(p);
  ctx.save();
  ctx.clip(p);
  rows(ctx, MAG, (y) => 2.3 * clamp01((y - c.y + 2) / (c.h + 4)), c.x - 10, c.x + c.w + 10, c.y - 18, yb + 2);
  ctx.restore();
  outline(ctx, p, 1.3);
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  lobes.forEach((L, k) => {
    if (k % 2 === 0 && k !== lobes.length - 1) {
      const cx = (L.a + L.b) / 2;
      const rx = (L.b - L.a) / 2 - 2.2;
      const ry = L.lift - 2.2;
      ctx.moveTo(cx + rx * Math.cos(-1.35), base + ry * Math.sin(-1.35));
      ctx.ellipse(cx, base, rx, ry, 0, -1.35, -0.45);
    }
  });
  ctx.stroke();
}

function bat(ctx, b) {
  const up = Math.cos(b.flap * TAU);
  const M = new DOMMatrix().translateSelf(b.x, b.y).scaleSelf(b.s * 1.15, b.s * 1.15);
  const w = new Path2D();
  w.moveTo(0, -1);
  w.quadraticCurveTo(-5, -4 * up - 3, -11, -7 * up);
  w.lineTo(-9, -1.5 * up - 0.5);
  w.quadraticCurveTo(-7.5, 0.5, -6, 1);
  w.quadraticCurveTo(-4.5, 0, -3, 1.2);
  w.quadraticCurveTo(-1.5, 0.5, 0, 2.6);
  w.quadraticCurveTo(1.5, 0.5, 3, 1.2);
  w.quadraticCurveTo(4.5, 0, 6, 1);
  w.quadraticCurveTo(7.5, 0.5, 9, -1.5 * up - 0.5);
  w.lineTo(11, -7 * up);
  w.quadraticCurveTo(5, -4 * up - 3, 0, -1);
  w.moveTo(2, 0.5);
  w.ellipse(0, 0.6, 2, 2.6, 0, 0, TAU);
  w.moveTo(-1.8, -1.6); w.lineTo(-1.2, -3.2); w.lineTo(-0.5, -1.8);
  w.moveTo(0.5, -1.8); w.lineTo(1.2, -3.2); w.lineTo(1.8, -1.6);
  const p = place(w, M);
  ctx.fillStyle = K;
  ctx.fill(p);
  // A sheen line on the leading wing, and two red eyes.
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 0.7 * b.s;
  ctx.beginPath();
  ctx.moveTo(b.x + 2.5 * b.s, b.y - 1.2 * b.s);
  ctx.quadraticCurveTo(b.x + 6 * b.s, b.y + (-3.8 * up - 2) * b.s, b.x + 9.5 * b.s, b.y - 6.2 * up * b.s);
  ctx.stroke();
  ctx.fillStyle = RED;
  ctx.fillRect(b.x - 1.1 * b.s, b.y - 0.2 * b.s, 0.8 * b.s, 0.8 * b.s);
  ctx.fillRect(b.x + 0.4 * b.s, b.y - 0.2 * b.s, 0.8 * b.s, 0.8 * b.s);
}

function sky(ctx, f) {
  const cache = skyCanvas(ctx, f);
  ctx.drawImage(cache, -40, -80, 560, 430);
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  for (const s of f.stars) star(ctx, s);
  ctx.fill();
  for (const c of f.clouds) cloud(ctx, c);
  for (const b of f.bats) bat(ctx, b);
  return cache;
}

// ------------------------------------------------------------------ land
function ridgePath(L) {
  const p = new Path2D();
  p.moveTo(L.crest[0].x, 300);
  for (const q of L.crest) p.lineTo(q.x, q.y);
  p.lineTo(L.crest[L.crest.length - 1].x, 300);
  p.closePath();
  return p;
}

function crestPath(L, dy = 0) {
  const p = new Path2D();
  L.crest.forEach((q, k) => (k ? p.lineTo(q.x, q.y + dy) : p.moveTo(q.x, q.y + dy)));
  return p;
}

// Far ridge: magenta, a blue screen deepening it toward the valley.
function bgRidge(ctx, L) {
  const p = ridgePath(L);
  ctx.fillStyle = MAG;
  ctx.fill(p);
  ctx.save();
  ctx.clip(p);
  rows(ctx, '#2a2aa8', (y) => 3 * clamp01((y - 148) / 60) ** 0.9, -20, 500, 140, 240, -L.shift);
  ctx.restore();
  outline(ctx, crestPath(L), 1.5);
  ctx.strokeStyle = '#ff7cbc';
  ctx.lineWidth = 0.8;
  ctx.stroke(crestPath(L, 1.6));
}

// Graveyard hill: deep violet with a magenta rim screen along its crest.
function midRidge(ctx, L) {
  const p = ridgePath(L);
  ctx.fillStyle = VIOLET;
  ctx.fill(p);
  ctx.save();
  ctx.clip(p);
  rows(ctx, MAG, (y) => 1.9 * clamp01((214 - y) / 16), -20, 500, 190, 222, -L.shift);
  ctx.restore();
  outline(ctx, crestPath(L), 1.8);
}

// Near bank: solid black, one thin blue rim of moonlight.
function fgRidge(ctx, L) {
  ctx.fillStyle = K;
  ctx.fill(ridgePath(L));
  ctx.strokeStyle = RIM;
  ctx.lineWidth = 1;
  ctx.stroke(crestPath(L, 1.2));
}

// ------------------------------------------------------------------ abbey
const ABBEY = (() => {
  const nave = poly(new Path2D(), [-54, 2, -54, -24, -48, -30, -40, -28, -34, -36, -22, -34, -16, -40,
    -8, -37, 2, -40, 2, 2]);
  const tower = new Path2D();
  tower.rect(2, -54, 16, 56);
  const spire = poly(new Path2D(), [0, -54, 10, -86, 20, -54]);
  const transept = poly(new Path2D(), [18, 2, 18, -26, 28, -34, 32, -30, 38, -36, 50, -24, 50, 2]);
  const wins = new Path2D();
  for (const x of [-42, -27, -12]) lancet(wins, x, -6, 8, 20);
  lancet(wins, 10, -38, 5, 10);
  wins.moveTo(38.5, -17);
  wins.arc(34, -17, 4.5, 0, TAU);
  // Solid black shadow shapes: the tower's and spire's dark sides, the window reveals,
  // and the transept wall under the tower's cast shadow.
  const shade = new Path2D();
  shade.rect(2, -54, 5, 56);
  poly(shade, [0, -54, 10, -86, 8.5, -54]);
  poly(shade, [18, -26, 22, -29.2, 22, -8, 18, -4]);
  poly(shade, [-54, -24, -48, -30, -49, -22, -54, -16]);
  const reveal = new Path2D();
  for (const x of [-42, -27, -12]) reveal.rect(x - 4, -32, 3, 28);
  reveal.rect(7.5, -46, 1.6, 10);
  reveal.moveTo(34, -17);
  reveal.arc(34, -17, 4.5, Math.PI * 0.5, Math.PI * 1.5);
  const sheen = new Path2D();
  poly(sheen, [16.2, -50, 16.2, -40], false);
  poly(sheen, [16.2, -36, 16.2, -33], false);
  poly(sheen, [11.5, -80, 17.5, -58], false);
  poly(sheen, [-20, -31, -12, -35], false);
  poly(sheen, [-17, -28, -13, -30], false);
  poly(sheen, [47.5, -22, 47.5, -10], false);
  poly(sheen, [-38, -24, -33, -30], false);
  return { nave, tower, spire, transept, wins, shade, reveal, sheen };
})();

function abbey(ctx, it, ox, skyImg) {
  const M = new DOMMatrix().translateSelf(it.x, it.y).scaleSelf(it.s, it.s);
  const parts = [ABBEY.nave, ABBEY.transept, ABBEY.tower, ABBEY.spire].map((p) => place(p, M));
  const all = new Path2D();
  for (const p of parts) all.addPath(p);
  drop(ctx, all, 1.4);
  ctx.fillStyle = PAPER;
  ctx.fill(all);
  ctx.fillStyle = flat(ctx, CYAN, 1.45, ox);
  ctx.fill(all);
  ctx.fillStyle = K;
  ctx.fill(place(ABBEY.shade, M));
  // The windows are holes: the sky shows through them.
  const wins = place(ABBEY.wins, M);
  ctx.save();
  ctx.clip(wins);
  ctx.drawImage(skyImg, -40, -80, 560, 430);
  ctx.fillStyle = K;
  ctx.fill(place(ABBEY.reveal, M));
  ctx.restore();
  for (const p of parts) outline(ctx, p, 1.3);
  outline(ctx, wins, 1.1);
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 0.9;
  ctx.stroke(place(ABBEY.sheen, M));
}

// ------------------------------------------------------------------ trees
function treeLimbs(x, y, s, L) {
  return [
    { pts: [x, y + 1, x + L * 4 * s, y - 26 * s, x + L * 8 * s, y - 50 * s], w: 1.3 },
    { pts: [x + L * 3 * s, y - 20 * s, x - 12 * s, y - 32 * s, x - 17 * s, y - 42 * s], w: 0.8 },
    { pts: [x - 12 * s, y - 32 * s, x - 21 * s, y - 34 * s], w: 0.55 },
    { pts: [x + L * 5 * s, y - 30 * s, x + 13 * s, y - 40 * s, x + 20 * s, y - 42 * s], w: 0.8 },
    { pts: [x + 13 * s, y - 40 * s, x + 15 * s, y - 49 * s], w: 0.55 },
    { pts: [x + L * 7 * s, y - 42 * s, x - 3 * s, y - 52 * s], w: 0.55 },
    { pts: [x - 2 * s, y + 1, x - 7 * s, y + 3], w: 0.7 },
    { pts: [x + 2 * s, y + 1, x + 7 * s, y + 3], w: 0.7 },
  ];
}

function grove(ctx, it) {
  const n = 3 + (it.i % 3);
  for (let k = 0; k < n; k++) {
    const dx = (k - (n - 1) / 2) * 12 * it.s + (seeded(it.i * 7 + k) - 0.5) * 6;
    const sc = (0.42 + seeded(it.i * 11 + k) * 0.24) * it.s;
    limbs(ctx, treeLimbs(it.x + dx, it.y + 2, sc, (seeded(k + it.i) - 0.5) * 0.6), 2.4 * sc);
  }
}

function deadTree(ctx, it) {
  limbs(ctx, treeLimbs(it.x, it.y, it.s, it.variant === 1 ? -0.8 : 0.2), 3.2 * it.s, RIM);
}

function gnarl(ctx, it) {
  const s = it.s;
  const x = it.x;
  const y = it.y + 2;
  const flip = it.variant === 1 ? -1 : 1;
  const X = (dx) => x + dx * s * flip;
  const Y = (dy) => y + dy * s;
  limbs(ctx, [
    { pts: [X(0), Y(0), X(-4), Y(-30), X(4), Y(-58), X(0), Y(-84)], w: 1.6 },
    { pts: [X(2), Y(-50), X(24), Y(-66), X(44), Y(-64), X(58), Y(-74)], w: 0.9 },
    { pts: [X(44), Y(-64), X(52), Y(-56), X(62), Y(-58)], w: 0.5 },
    { pts: [X(30), Y(-66), X(36), Y(-82), X(48), Y(-92)], w: 0.55 },
    { pts: [X(0), Y(-80), X(-14), Y(-100), X(-26), Y(-104)], w: 0.8 },
    { pts: [X(-14), Y(-100), X(-12), Y(-114)], w: 0.45 },
    { pts: [X(1), Y(-84), X(14), Y(-104), X(30), Y(-112), X(38), Y(-124)], w: 0.7 },
    { pts: [X(20), Y(-107), X(28), Y(-100), X(36), Y(-102)], w: 0.4 },
    { pts: [X(-2), Y(-36), X(-18), Y(-46), X(-26), Y(-44)], w: 0.6 },
    { pts: [X(-6), Y(0), X(-14), Y(3)], w: 0.9 },
    { pts: [X(5), Y(0), X(14), Y(3)], w: 0.9 },
  ], 8 * s, RIM);
}

// ------------------------------------------------------------------ graves
const MAUS = (() => {
  const steps = new Path2D();
  steps.rect(-24, -4, 48, 6);
  steps.rect(-20, -8, 40, 4);
  const body = new Path2D();
  body.rect(-18, -32, 36, 24);
  const cols = new Path2D();
  cols.rect(-15, -31, 4, 23);
  cols.rect(11, -31, 4, 23);
  const door = lancet(new Path2D(), 0, -8, 12, 16);
  const pediment = poly(new Path2D(), [-22, -32, 0, -44, 22, -32]);
  const dome = new Path2D();
  dome.rect(-20, -36, 40, 4);
  dome.moveTo(14, -36);
  dome.arc(0, -36, 14, 0, Math.PI, true);
  dome.closePath();
  const domeShade = new Path2D();
  domeShade.moveTo(-14, -36);
  domeShade.arc(0, -36, 14, Math.PI, Math.PI * 1.32);
  domeShade.quadraticCurveTo(-8, -40, -8, -36);
  domeShade.closePath();
  const cast = new Path2D();
  cast.rect(-18, -32, 36, 3.2);
  cast.rect(-11, -29, 1.6, 21);
  const colSheen = new Path2D();
  poly(colSheen, [-12.2, -28, -12.2, -12], false);
  poly(colSheen, [13.8, -28, 13.8, -12], false);
  poly(colSheen, [14, -42.5, 16.5, -39], false);
  const topCross = new Path2D();
  poly(topCross, [0, -50, 0, -56], false);
  poly(topCross, [-3, -53, 3, -53], false);
  return { steps, body, cols, door, pediment, dome, domeShade, cast, colSheen, topCross };
})();

function mausoleum(ctx, it, ox) {
  const M = new DOMMatrix().translateSelf(it.x, it.y).scaleSelf(it.s, it.s);
  const steps = place(MAUS.steps, M);
  const body = place(MAUS.body, M);
  const cols = place(MAUS.cols, M);
  const roof = place(it.variant === 1 ? MAUS.dome : MAUS.pediment, M);
  const all = new Path2D();
  for (const p of [steps, body, roof]) all.addPath(p);
  drop(ctx, all, 1.3);
  const lw = 1.3;
  // Steps: dark stone, quiet (they sit in the band above the lane).
  ctx.fillStyle = STONE;
  ctx.fill(steps);
  outline(ctx, steps, lw);
  ctx.fillStyle = STONE;
  ctx.fill(body);
  ctx.fillStyle = flat(ctx, NAVY, 1.5, ox);
  ctx.fill(body);
  ctx.fillStyle = K;
  ctx.fill(place(MAUS.cast, M));
  ctx.fillStyle = K;
  ctx.fill(place(MAUS.door, M));
  outline(ctx, body, lw);
  ctx.fillStyle = STONE;
  ctx.fill(cols);
  ctx.fillStyle = flat(ctx, CYAN, 1.3, ox);
  ctx.fill(cols);
  outline(ctx, cols, 1.1);
  ctx.fillStyle = STONE;
  ctx.fill(roof);
  ctx.fillStyle = flat(ctx, CYAN, 1.5, ox);
  ctx.fill(roof);
  if (it.variant === 1) {
    ctx.fillStyle = K;
    ctx.fill(place(MAUS.domeShade, M));
  }
  outline(ctx, roof, lw);
  if (it.variant === 1) outline(ctx, place(MAUS.topCross, M), 1.4);
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 0.8;
  ctx.stroke(place(MAUS.colSheen, M));
}

const STONES = (() => {
  const v = [new Path2D(), new Path2D(), new Path2D()];
  v[0].moveTo(-4.5, 0); v[0].lineTo(-4.5, -9); v[0].arc(0, -9, 4.5, Math.PI, 0); v[0].lineTo(4.5, 0);
  v[0].closePath();
  poly(v[1], [-5, 0, -5, -12, -1.5, -12, 0, -14, 1.5, -12, 5, -12, 5, 0]);
  v[2].rect(-4, -3, 8, 3);
  poly(v[2], [-2.6, -3, -1.8, -18, 0, -21, 1.8, -18, 2.6, -3]);
  const shade = [new Path2D(), new Path2D(), new Path2D()];
  shade[0].rect(-5, -14, 2.6, 15);
  shade[1].rect(-5.5, -15, 2.8, 16);
  poly(shade[2], [-2.6, -3, -1.8, -18, 0, -21, -0.6, -3]);
  shade[2].rect(-4, -3, 2.2, 3);
  const sheen = [new Path2D(), new Path2D(), new Path2D()];
  poly(sheen[0], [2.6, -10.5, 2.6, -6], false);
  poly(sheen[1], [3.2, -10, 3.2, -6], false);
  poly(sheen[2], [1.2, -16, 1.6, -9], false);
  return { v, shade, sheen };
})();

function stone(ctx, it) {
  const M = new DOMMatrix().translateSelf(it.x, it.y + 1)
    .rotateSelf(((seeded(it.i * 3.3) - 0.5) * 0.26 * 180) / Math.PI).scaleSelf(it.s, it.s);
  const v = it.variant ?? 0;
  const p = place(STONES.v[v], M);
  drop(ctx, p, 0.9);
  ctx.fillStyle = STONE;
  ctx.fill(p);
  ctx.save();
  ctx.clip(p);
  ctx.fillStyle = K;
  ctx.fill(place(STONES.shade[v], M));
  ctx.restore();
  outline(ctx, p, 1.1);
  ctx.strokeStyle = '#7ec6f2';
  ctx.lineWidth = 0.7;
  ctx.stroke(place(STONES.sheen[v], M));
}

const CROSS = (() => {
  const body = poly(new Path2D(), [-1.6, 0, -1.6, -11, -6, -11, -6, -14.5, -1.6, -14.5, -1.6, -20, 1.6, -20,
    1.6, -14.5, 6, -14.5, 6, -11, 1.6, -11, 1.6, 0]);
  const ring = new Path2D();
  ring.arc(0, -12.75, 4.2, 0, TAU);
  const shade = new Path2D();
  shade.rect(-1.6, -11, 1.4, 11);
  shade.rect(-6, -12, 4.4, 1);
  return { body, ring, shade };
})();

function cross(ctx, it) {
  const M = new DOMMatrix().translateSelf(it.x, it.y + 1)
    .rotateSelf(((seeded(it.i * 5.1) - 0.5) * 0.18 * 180) / Math.PI).scaleSelf(it.s, it.s);
  const celtic = it.i % 2 === 0;
  const p = place(CROSS.body, M);
  if (celtic) {
    const ring = place(CROSS.ring, M);
    ctx.strokeStyle = K;
    ctx.lineWidth = 3.3 * it.s;
    ctx.stroke(ring);
    ctx.strokeStyle = STONE;
    ctx.lineWidth = 1.3 * it.s;
    ctx.stroke(ring);
  }
  drop(ctx, p, 0.9);
  ctx.fillStyle = STONE;
  ctx.fill(p);
  ctx.save();
  ctx.clip(p);
  ctx.fillStyle = K;
  ctx.fill(place(CROSS.shade, M));
  ctx.restore();
  outline(ctx, p, 1.1);
}

// ------------------------------------------------------------------ near bank
function fence(ctx, it, L) {
  const gateHalf = 15;
  const bars = [];
  for (let x = it.x0; x <= it.x1; x += 7) {
    if (it.gate != null && Math.abs(x - it.gate) < gateHalf + 2) continue;
    bars.push(x);
  }
  ctx.strokeStyle = K;
  ctx.fillStyle = K;
  ctx.lineCap = 'butt';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (const x of bars) {
    const b = L.ridge(x);
    ctx.moveTo(x, b + 1);
    ctx.lineTo(x, b - 20);
  }
  ctx.stroke();
  ctx.beginPath();
  for (const x of bars) {
    const b = L.ridge(x);
    ctx.moveTo(x - 2.2, b - 20);
    ctx.lineTo(x, b - 26);
    ctx.lineTo(x + 2.2, b - 20);
    ctx.closePath();
  }
  ctx.fill();
  const runs = it.gate == null ? [[it.x0, it.x1]] : [[it.x0, it.gate - gateHalf], [it.gate + gateHalf, it.x1]];
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  for (const [a, b] of runs) {
    for (const h of [5, 16]) {
      for (let x = a; x <= b; x += 4) {
        const y = L.ridge(x) - h;
        x === a ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
    }
  }
  ctx.stroke();
  if (it.gate != null) {
    const g = it.gate;
    const b = L.foot(g, gateHalf);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(g - gateHalf, b + 1); ctx.lineTo(g - gateHalf, b - 32);
    ctx.moveTo(g + gateHalf, b + 1); ctx.lineTo(g + gateHalf, b - 32);
    ctx.stroke();
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(g - gateHalf, b - 26);
    ctx.quadraticCurveTo(g, b - 40, g + gateHalf, b - 26);
    for (let x = g - gateHalf + 5; x < g + gateHalf - 2; x += 5) {
      ctx.moveTo(x, b);
      ctx.lineTo(x, b - 26 - 6 * Math.cos(((x - g) / gateHalf) * 1.4));
    }
    ctx.moveTo(g - gateHalf, b - 12); ctx.lineTo(g + gateHalf, b - 12);
    ctx.stroke();
    for (const x of [g - gateHalf, g + gateHalf]) {
      ctx.beginPath();
      ctx.arc(x, b - 34, 2.6, 0, TAU);
      ctx.fill();
    }
    // Moonlight catching the gate's arch.
    ctx.strokeStyle = RIM;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(g - gateHalf * 0.4, b - 33.6);
    ctx.quadraticCurveTo(g + gateHalf * 0.3, b - 34.4, g + gateHalf * 0.8, b - 30.5);
    ctx.stroke();
  }
}

const LAMP = (() => {
  const post = new Path2D();
  post.rect(-1.5, -35, 3, 35);
  post.rect(-3.8, -3.5, 7.6, 3.5);
  poly(post, [-6.5, -45, 0, -51, 6.5, -45]);
  post.rect(-4.2, -36.5, 8.4, 2);
  const glass = poly(new Path2D(), [-5, -35, 5, -35, 4, -45, -4, -45]);
  const frame = new Path2D();
  poly(frame, [0, -35, 0, -45], false);
  return { post, glass, frame };
})();

function lamp(ctx, it, t, ox) {
  const x = it.x;
  const y = it.y + 1;
  const s = it.s;
  const flicker = 0.9 + 0.1 * Math.sin(t * 11 + it.i) * Math.sin(t * 7.3);
  const cy = y - 40 * s;
  const R = 30 * s * (0.94 + 0.06 * flicker);
  // The glow is a yellow screen, dots swelling toward the flame.
  dotField(ctx, YEL, x - R, cy - R, x + R, cy + R, (px, py) => {
    const d = Math.hypot(px - x, py - cy) / R;
    return d >= 1 ? 0 : 2.2 * flicker * (1 - d) ** 1.1;
  }, ox);
  const M = new DOMMatrix().translateSelf(x, y).scaleSelf(s, s);
  const glass = place(LAMP.glass, M);
  const post = place(LAMP.post, M);
  ctx.fillStyle = K;
  ctx.fill(post);
  ctx.fillStyle = YEL;
  ctx.fill(glass);
  ctx.fillStyle = flat(ctx, RED, 0.9 + 0.3 * (1 - flicker) * 5, ox);
  ctx.save();
  ctx.clip(glass);
  ctx.fillRect(x - 6 * s, y - 38 * s, 12 * s, 4 * s);
  ctx.restore();
  outline(ctx, glass, 1.2);
  outline(ctx, place(LAMP.frame, M), 0.9);
  ctx.strokeStyle = RIM;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x + 1.1 * s, y - 33 * s);
  ctx.lineTo(x + 1.1 * s, y - 6 * s);
  ctx.stroke();
}

function grass(ctx, it) {
  const blades = [];
  for (let k = 0; k < 7; k++) {
    const dx = (k - 3) * 1.4 * it.s;
    const h = (7 + seeded(it.i * 13 + k) * 7) * it.s;
    const bend = ((k - 3) * 1.5 + (seeded(it.i + k * 5) - 0.4) * 4) * it.s;
    blades.push({ pts: [it.x + dx * 0.5, it.y + 2, it.x + dx + bend * 0.35, it.y - h * 0.55, it.x + dx + bend, it.y - h], w: 0.6 });
  }
  // A thistle head on the tallest stem.
  const k = Math.floor(seeded(it.i * 7) * 7);
  const tip = blades[k].pts;
  blades.push({ pts: [tip[4] - 1.2, tip[5] - 1, tip[4] + 1.2, tip[5] - 1], w: 1.3 });
  limbs(ctx, blades, 2, RIM);
}

// ------------------------------------------------------------------ fog
// Mist is a tint: a light dot screen with no ink between the dots, heavier in the heart
// of each puff. The screen rides with the fog.
function fogBand(ctx, band, b, color, rOuter, rInner) {
  const P = CRYPT_PLAN.fog;
  const first = band.puffs[0];
  const ox = first ? first.x - (P.puffs[first.i] + b * 47) : 0;
  const outer = new Path2D();
  const inner = new Path2D();
  for (const p of band.puffs) {
    outer.moveTo(p.x + p.rx, p.y);
    outer.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, TAU);
    inner.moveTo(p.x + p.rx * 0.62, p.y + p.ry * 0.1);
    inner.ellipse(p.x, p.y + p.ry * 0.1, p.rx * 0.62, p.ry * 0.55, 0, 0, TAU);
  }
  ctx.fillStyle = flat(ctx, color, rOuter, ox);
  ctx.fill(outer);
  ctx.fillStyle = flat(ctx, color, rInner, ox);
  ctx.fill(inner);
}

// ------------------------------------------------------------------ layers
function layer(ctx, f, name, skyImg) {
  const L = f.layers[name];
  const ox = -L.shift;
  for (const it of L.items) if (it.kind === 'abbey') abbey(ctx, it, ox, skyImg);
  if (name === 'bg') bgRidge(ctx, L);
  else if (name === 'mid') midRidge(ctx, L);
  else fgRidge(ctx, L);
  for (const it of L.items) {
    if (it.kind === 'grove') grove(ctx, it);
    else if (it.kind === 'mausoleum') mausoleum(ctx, it, ox);
    else if (it.kind === 'tree') deadTree(ctx, it);
    else if (it.kind === 'stone') stone(ctx, it);
    else if (it.kind === 'cross') cross(ctx, it);
    else if (it.kind === 'gnarl') gnarl(ctx, it);
    else if (it.kind === 'fence') fence(ctx, it, L);
    else if (it.kind === 'lamp') lamp(ctx, it, f.t, ox);
    else if (it.kind === 'grass') grass(ctx, it);
  }
}

export const STYLE = {
  id: 'popart',
  name: 'POP ART COMIC',
  note: 'A horror-comic splash panel through Lichtenstein: four-colour process inks, heavy black brush '
    + 'outlines and Ben-Day dot screens for every tone. The sky and far ridge carry the punch; the bank '
    + 'above the lane drops to black silhouette.',
  paint(ctx, f) {
    const skyImg = sky(ctx, f);
    layer(ctx, f, 'bg', skyImg);
    layer(ctx, f, 'mid', skyImg);
    fogBand(ctx, f.fog[0], 0, FOG_HI, 0.8, 1.35);
    layer(ctx, f, 'fg', skyImg);
    fogBand(ctx, f.fog[1], 1, FOG_LO, 0.8, 1.3);
  },
};
