// CRYPT style bake-off — RISOGRAPH PRINT. A three-drum riso print on cream stock: Medium
// Blue, Fluorescent Pink and Yellow, each plate drawn as its own layer of black-on-white
// "ink", knocked back through a baked grain, coloured, then multiplied over the paper.
// Where blue and pink overprint the night goes violet; the moon, the stars and the lamp
// are the only places the yellow drum prints.
//
// Tone is never a smooth gradient: every fill is a halftone at one of a few densities,
// each drum screened at its own angle (lattice vectors chosen so a screen tiles exactly,
// so the dots stay crisp), and each drum is printed a hair off register. Fog and glow
// are traps: the blue knocked out through the pink screen and the pink printed there.
//
// Consumes cryptFrame() exactly as ink.js does: sky, then bg -> mid -> fg with the abbey
// behind its ridge, fog between mid and fg and along the lane's back edge.

const TAU = Math.PI * 2;
const PAPER = '#f4eddc';
const INKS = { B: '#3255a4', P: '#ff48b0', Y: '#ffe800' };
const PLATES = ['B', 'P', 'Y'];
// Each drum's fixed misregistration (screen px) and halftone screen angle (degrees).
const REG = { B: [-0.5, 0.5], P: [1, -0.5], Y: [-1, 1] };
const SCREEN = { B: 18, P: 72, Y: 45 };
const PITCH = 3; // halftone cell, screen px
// Plates cover the frame plus overscan on every side.
const OX = 44;
const OY = 84;
const PW = 480 + OX * 2;
const PH = 270 + OY * 2;
const GRAIN_T = 512;

// Tones: a density per drum, 0 = paper, 1 = solid.
// Most areas print one drum solid and screen at most one other, so the dots stay clean.
const T = {
  bgRidge: { B: 0.86, P: 1 },
  bgLit: { B: 0.6, P: 1 },
  bgShade: { B: 0.94, P: 1 },
  grove: { B: 1, P: 1 },
  midRidge: { B: 1, P: 0.4 },
  midLit: { B: 0.62, P: 1 },
  midBody: { B: 1, P: 0.78 },
  midDark: { B: 1, P: 1 },
  stoneLit: { B: 0.5, P: 1 },
  fg: { B: 1, P: 1 },
  fgLit: { B: 0.45, P: 1 },
  cloud: { B: 0.74, P: 1 },
  cloudShade: { B: 1, P: 1 },
};

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
function seeded(i) {
  const x = Math.sin(i * 91.7 + 17.3) * 43758.5453;
  return x - Math.floor(x);
}
function ihash(x, y, s) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
// Tileable value noise: `cell` px lattice wrapping every `size` px.
function vnoise(x, y, cell, size, seed) {
  const n = size / cell;
  const gx = x / cell;
  const gy = y / cell;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  let fx = gx - x0;
  let fy = gy - y0;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const w = (v) => ((v % n) + n) % n;
  const a = ihash(w(x0), w(y0), seed);
  const b = ihash(w(x0 + 1), w(y0), seed);
  const c = ihash(w(x0), w(y0 + 1), seed);
  const d = ihash(w(x0 + 1), w(y0 + 1), seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// ------------------------------------------------------------------ screens
// Cosine spot function: round dots, a checkerboard at 50%, round holes above it. THR maps
// an ink fraction to the spot threshold that prints exactly that much of a cell.
const THR = (() => {
  const N = 96;
  const vals = [];
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const fx = ((i + 0.5) / N) * 2 - 1;
      const fy = ((j + 0.5) / N) * 2 - 1;
      vals.push((Math.cos(Math.PI * fx) + Math.cos(Math.PI * fy)) / 2);
    }
  }
  vals.sort((a, b) => a - b);
  const out = new Float32Array(257);
  for (let k = 0; k <= 256; k++) {
    const idx = Math.min(vals.length - 1, Math.round((1 - k / 256) * vals.length));
    out[k] = vals[idx];
  }
  return out;
})();

// One exact tile of a drum's halftone at density d: black ink on white (or, inverted,
// white dots on black — a knock-out screen for 'screen' compositing).
function bakeScreen(lat, d, invert = false) {
  const { a, b, N } = lat;
  const cv = makeCanvas(N, N);
  const g = cv.getContext('2d');
  const img = g.createImageData(N, N);
  const thr = THR[Math.round(clamp01(d) * 256)];
  const ppc = Math.sqrt(N);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const px = i + 0.5;
      const py = j + 0.5;
      const u = (px * a + py * b) / N;
      const v = (-px * b + py * a) / N;
      const fx = (u - Math.floor(u)) * 2 - 1;
      const fy = (v - Math.floor(v)) * 2 - 1;
      const spot = (Math.cos(Math.PI * fx) + Math.cos(Math.PI * fy)) / 2;
      const fw = Math.max(0.03, (Math.PI / ppc) * Math.hypot(Math.sin(Math.PI * fx), Math.sin(Math.PI * fy)));
      const cov = clamp01((spot - thr) / fw + 0.5);
      const o = (j * N + i) * 4;
      const val = Math.round(255 * (invert ? cov : 1 - cov));
      img.data[o] = img.data[o + 1] = img.data[o + 2] = val;
      img.data[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return cv;
}

// The drum's grain: white = ink that didn't take. Blotchy under-inking, pinholes, a
// faint roller streak. Screened over each plate before it is coloured.
function bakeGrain(seed) {
  const cv = makeCanvas(GRAIN_T, GRAIN_T);
  const g = cv.getContext('2d');
  const img = g.createImageData(GRAIN_T, GRAIN_T);
  for (let y = 0; y < GRAIN_T; y++) {
    const streak = vnoise(0, y, 16, GRAIN_T, seed + 5);
    for (let x = 0; x < GRAIN_T; x++) {
      const blot = 0.55 * vnoise(x, y, 128, GRAIN_T, seed) + 0.45 * vnoise(x, y, 32, GRAIN_T, seed + 1);
      const n = ihash(x, y, seed + 2);
      const clump = ihash(x >> 1, y >> 1, seed + 3);
      const fine = 0.45 * n + 0.55 * clump;
      const starve = clamp01((blot - 0.45) / 0.45);
      const mott = vnoise(x, y, 4, GRAIN_T, seed + 4);
      let k = 0.015 + 0.18 * starve * starve + 0.03 * streak + 0.11 * mott * mott + 0.035 * n;
      if (clump > 0.996 - 0.008 * starve) k = 0.4 + 0.45 * fine;
      const v = Math.round(255 * clamp01(k));
      const o = (y * GRAIN_T + x) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = v;
      img.data[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return cv;
}

// ------------------------------------------------------------------ plates
// One set of plates, screens and grain per device scale, so cards drawn at different
// sizes never force a rebake.
let S = null;
const STATES = new Map();

function ensure(sc) {
  S = STATES.get(sc);
  if (S) return;
  const w = Math.ceil(PW * sc);
  const h = Math.ceil(PH * sc);
  const cv = {};
  const cx = {};
  const lat = {};
  const grain = {};
  PLATES.forEach((k, i) => {
    cv[k] = makeCanvas(w, h);
    cx[k] = cv[k].getContext('2d');
    const pd = PITCH * sc;
    const th = (SCREEN[k] * Math.PI) / 180;
    const a = Math.max(1, Math.round(pd * Math.cos(th)));
    const b = Math.max(1, Math.round(pd * Math.sin(th)));
    lat[k] = { a, b, N: a * a + b * b };
    grain[k] = cx[k].createPattern(bakeGrain(11 + i * 29), 'repeat');
    grain[k].setTransform(new DOMMatrix([1, 0, 0, 1, 137 * i, 211 * i]));
  });
  S = { sc, w, h, cv, cx, lat, grain, pats: new Map(), anchor: 0 };
  STATES.set(sc, S);
  if (STATES.size > 3) STATES.delete(STATES.keys().next().value);
}

function anchored(pat) {
  if (pat.ax !== S.anchor) {
    pat.pat.setTransform(new DOMMatrix([1 / S.sc, 0, 0, 1 / S.sc, S.anchor, 0]));
    pat.ax = S.anchor;
  }
  return pat.pat;
}

// Opaque halftone of drum k at density d.
function tone(k, d) {
  if (d <= 0.004) return '#fff';
  if (d >= 0.996) return '#000';
  const q = Math.round(d * 100);
  const key = k + q;
  let p = S.pats.get(key);
  if (!p) {
    p = { pat: S.cx[k].createPattern(bakeScreen(S.lat[k], q / 100), 'repeat'), ax: NaN };
    S.pats.set(key, p);
  }
  return anchored(p);
}

// Knock-out screen at fraction kk on drum k, cut on drum `via`'s screen: white dots on
// black, for 'screen'.
function knock(k, kk, via = k) {
  const q = Math.round(kk * 100);
  const key = 'x' + k + via + q;
  let p = S.pats.get(key);
  if (!p) {
    p = { pat: S.cx[k].createPattern(bakeScreen(S.lat[via], q / 100, true), 'repeat'), ax: NaN };
    S.pats.set(key, p);
  }
  return anchored(p);
}

function draw(k, op, style, path, sw) {
  const c = S.cx[k];
  c.globalCompositeOperation = op;
  if (sw) {
    c.strokeStyle = style;
    c.lineWidth = sw;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.stroke(path);
  } else {
    c.fillStyle = style;
    c.fill(path);
  }
}

// An opaque shape: every drum prints exactly its density here (missing = paper).
function set(path, spec, sw) {
  for (const k of PLATES) draw(k, 'source-over', tone(k, spec[k] ?? 0), path, sw);
}
// Only the named drums change.
function tint(path, spec, sw) {
  for (const k of PLATES) if (spec[k] !== undefined) draw(k, 'source-over', tone(k, spec[k]), path, sw);
}
// Overprint more ink on the named drums.
function add(path, spec) {
  for (const k of PLATES) if (spec[k]) draw(k, 'multiply', tone(k, spec[k]), path);
}
// A trap: knock the blue out exactly where the pink screen prints its dots, and print
// them, so a haze lightens to pink instead of to bare paper.
function trap(path, kk) {
  draw('B', 'screen', knock('B', kk, 'P'), path);
  draw('P', 'multiply', tone('P', kk), path);
}

// ------------------------------------------------------------------ shape helpers
function place(local, x, y, s = 1, rot = 0) {
  const p = new Path2D();
  p.addPath(local, new DOMMatrix().translate(x, y).rotate((rot * 180) / Math.PI).scale(s, s));
  return p;
}

function poly(path, pts) {
  // Always wound clockwise, so overlapping pieces union under nonzero fill.
  let area = 0;
  const n = pts.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += pts[2 * i] * pts[2 * j + 1] - pts[2 * j] * pts[2 * i + 1];
  }
  if (area >= 0) {
    path.moveTo(pts[0], pts[1]);
    for (let i = 1; i < n; i++) path.lineTo(pts[2 * i], pts[2 * i + 1]);
  } else {
    path.moveTo(pts[2 * n - 2], pts[2 * n - 1]);
    for (let i = n - 2; i >= 0; i--) path.lineTo(pts[2 * i], pts[2 * i + 1]);
  }
  path.closePath();
}

function circle(path, x, y, r) {
  path.moveTo(x + r, y);
  path.arc(x, y, r, 0, TAU);
  path.closePath();
}

function rect(path, x, y, w, h) {
  poly(path, [x, y, x + w, y, x + w, y + h, x, y + h]);
}

function chaikin(pts, iters) {
  let p = pts;
  for (let it = 0; it < iters; it++) {
    const q = [p[0], p[1]];
    for (let i = 0; i < p.length - 2; i += 2) {
      const x0 = p[i];
      const y0 = p[i + 1];
      const x1 = p[i + 2];
      const y1 = p[i + 3];
      q.push(0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1, 0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1);
    }
    q.push(p[p.length - 2], p[p.length - 1]);
    p = q;
  }
  return p;
}

// A tapered limb along a polyline, w0 wide at its root to w1 at its tip.
function limb(path, pts, w0, w1, smooth = 1) {
  const p = smooth ? chaikin(pts, smooth) : pts;
  const n = p.length / 2;
  const L = [0];
  for (let i = 1; i < n; i++) L.push(L[i - 1] + Math.hypot(p[2 * i] - p[2 * i - 2], p[2 * i + 1] - p[2 * i - 1]));
  const total = L[n - 1] || 1;
  const left = [];
  const right = [];
  for (let i = 0; i < n; i++) {
    const i0 = Math.max(0, i - 1);
    const i1 = Math.min(n - 1, i + 1);
    let tx = p[2 * i1] - p[2 * i0];
    let ty = p[2 * i1 + 1] - p[2 * i0 + 1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    const w = (w0 + (w1 - w0) * (L[i] / total)) / 2;
    left.push(p[2 * i] - ty * w, p[2 * i + 1] + tx * w);
    right.push(p[2 * i] + ty * w, p[2 * i + 1] - tx * w);
  }
  const out = left.slice();
  for (let i = n - 1; i >= 0; i--) out.push(right[2 * i], right[2 * i + 1]);
  poly(path, out);
  circle(path, p[0], p[1], w0 / 2);
}

function lancet(path, x, y, w, h) {
  const pts = [x - w / 2, y, x - w / 2, y - h + w * 0.6];
  for (let k = 1; k <= 6; k++) {
    const a = k / 6;
    pts.push(x - w / 2 + (w / 2) * a, y - h + w * 0.6 - (w * 0.9) * Math.sin((a * Math.PI) / 2));
  }
  for (let k = 5; k >= 0; k--) {
    const a = k / 6;
    pts.push(x + w / 2 - (w / 2) * a, y - h + w * 0.6 - (w * 0.9) * Math.sin((a * Math.PI) / 2));
  }
  pts.push(x + w / 2, y);
  poly(path, pts);
}

// ------------------------------------------------------------------ fixed shapes
const SHAPES = (() => {
  const P = () => new Path2D();
  // Abbey, base at 0, as ink.js lays it out.
  const nave = P();
  poly(nave, [-54, 2, -54, -24, -48, -30, -40, -28, -34, -36, -22, -34, -16, -40, -8, -37, 2, -40, 2, 2]);
  const naveLit = P();
  poly(naveLit, [-54, -22, -48, -28, -40, -26, -34, -34, -22, -32, -16, -38, -8, -35, 2, -38, 2, -34, -8, -32, -16, -35, -22, -29, -34, -31, -40, -23, -48, -25, -54, -19]);
  const naveWin = P();
  for (const x of [-42, -27, -12]) lancet(naveWin, x, -6, 8, 20);
  const tower = P();
  rect(tower, 2, -54, 16, 56);
  const towerLit = P();
  rect(towerLit, 10, -54, 8, 56);
  const spire = P();
  poly(spire, [0, -54, 10, -86, 20, -54]);
  const spireLit = P();
  poly(spireLit, [10, -86, 20, -54, 10, -54]);
  const towerWin = P();
  lancet(towerWin, 10, -38, 5, 10);
  const transept = P();
  poly(transept, [18, 2, 18, -26, 28, -34, 32, -30, 38, -36, 50, -24, 50, 2]);
  const transeptLit = P();
  poly(transeptLit, [42, 2, 42, -32, 50, -24, 50, 2]);
  const rose = P();
  circle(rose, 34, -17, 4.5);
  const rubble = P();
  rect(rubble, -60, -3, 5, 5);
  rect(rubble, -64, -1, 4, 3);
  rect(rubble, 52, -4, 6, 6);

  // Mausolea, base at 0.
  const mSteps = P();
  rect(mSteps, -24, -4, 48, 6);
  rect(mSteps, -20, -8, 40, 4);
  const mBody = P();
  rect(mBody, -18, -32, 36, 24);
  const mCols = P();
  rect(mCols, -15, -31, 4, 23);
  rect(mCols, 11, -31, 4, 23);
  const mDoor = P();
  lancet(mDoor, 0, -8, 12, 16);
  const mPed = P();
  poly(mPed, [-22, -32, 0, -44, 22, -32]);
  const mPedShade = P();
  poly(mPedShade, [-22, -32, 0, -44, 0, -32]);
  const mCornice = P();
  rect(mCornice, -20, -36, 40, 4);
  const mDome = P();
  mDome.moveTo(-14, -36);
  mDome.arc(0, -36, 14, Math.PI, 0);
  mDome.closePath();
  const mDomeShade = P();
  mDomeShade.moveTo(-14, -36);
  mDomeShade.arc(0, -36, 14, Math.PI, Math.PI * 1.5);
  mDomeShade.lineTo(-3, -36);
  mDomeShade.closePath();
  const mFinial = P();
  rect(mFinial, -0.8, -57, 1.6, 8);
  rect(mFinial, -3, -54, 6, 1.6);

  // Headstones, base at 0: 0 round-top, 1 notched square, 2 obelisk.
  const st0 = P();
  st0.moveTo(-4.5, 0);
  st0.lineTo(-4.5, -9);
  st0.arc(0, -9, 4.5, Math.PI, 0);
  st0.lineTo(4.5, 0);
  st0.closePath();
  const st1 = P();
  poly(st1, [-5, 0, -5, -12, -1.5, -12, 0, -14, 1.5, -12, 5, -12, 5, 0]);
  const st2 = P();
  rect(st2, -4, -3, 8, 3);
  poly(st2, [-2.6, -3, -1.8, -18, 0, -21, 1.8, -18, 2.6, -3]);

  const cross = P();
  poly(cross, [-1.6, 0, -1.6, -11, -6, -11, -6, -14.5, -1.6, -14.5, -1.6, -20, 1.6, -20, 1.6, -14.5, 6, -14.5, 6, -11, 1.6, -11, 1.6, 0]);
  const ring = P();
  ring.moveTo(4.2, -15);
  ring.arc(0, -15, 4.2, 0, TAU);

  return {
    abbey: { nave, naveLit, naveWin, tower, towerLit, spire, spireLit, towerWin, transept, transeptLit, rose, rubble },
    maus: { mSteps, mBody, mCols, mDoor, mPed, mPedShade, mCornice, mDome, mDomeShade, mFinial },
    stones: [st0, st1, st2],
    cross,
    ring,
  };
})();

// ------------------------------------------------------------------ sky
// Stepped halftone bands, each edge a gentle wave, so the sky reads as cut screens.
const SKY_BANDS = [
  { y: 40, B: 1, P: 0.36 },
  { y: 84, B: 1, P: 0.29 },
  { y: 122, B: 1, P: 0.22 },
  { y: 158, B: 1, P: 0.13 },
  { y: 400, B: 1, P: 0.06 },
];

function skyBase(f) {
  S.anchor = 0;
  // Deepest band last-to-first: fill the whole plate with the horizon, then lay each
  // higher band from the top down to its wavy lower edge.
  const all = new Path2D();
  all.rect(-OX, -OY, PW, PH);
  const low = SKY_BANDS[SKY_BANDS.length - 1];
  set(all, { B: low.B, P: low.P });
  for (let i = SKY_BANDS.length - 2; i >= 0; i--) {
    const band = SKY_BANDS[i];
    const p = new Path2D();
    p.moveTo(-OX, -OY);
    for (let x = -OX; x <= 480 + OX; x += 8) p.lineTo(x, band.y + 2.5 * Math.sin(x / 41 + i * 1.7) + 1.5 * Math.sin(x / 13 + i));
    p.lineTo(480 + OX, -OY);
    p.closePath();
    set(p, { B: band.B, P: band.P });
  }
  // Moon: halo rings knocked back in the blue only, then the yellow disc.
  const m = f.moon;
  for (const [dr, b] of [[26, 0.86], [16, 0.68], [8, 0.45]]) {
    const p = new Path2D();
    circle(p, m.x, m.y, m.r + dr);
    tint(p, { B: b });
  }
  const disc = new Path2D();
  circle(disc, m.x, m.y, m.r);
  tint(disc, { B: 0, P: 0.1, Y: 1 });
  const craters = new Path2D();
  for (const [dx, dy, r] of [[-8, -5, 5], [6, 7, 4], [9, -9, 2.5], [-3, 10, 2], [-13, 6, 1.6]]) circle(craters, m.x + dx, m.y + dy, r);
  tint(craters, { P: 0.42 });
  // A pink crescent shadow on the side away from the light.
  const shade = new Path2D();
  shade.moveTo(m.x, m.y - m.r);
  shade.arc(m.x, m.y, m.r, -Math.PI / 2, Math.PI / 2, true);
  shade.arc(m.x + 7, m.y, Math.sqrt(m.r * m.r + 49), Math.PI / 2 + 0.28, -Math.PI / 2 - 0.28, false);
  shade.closePath();
  add(shade, { P: 0.3 });
}

function stars(f) {
  for (const s of f.stars) {
    const tw = s.twinkle;
    if (s.s > 1.3) {
      const L = s.s * (1.6 + 1.2 * tw);
      const p = new Path2D();
      p.moveTo(s.x, s.y - L);
      p.quadraticCurveTo(s.x, s.y, s.x + L * 0.8, s.y);
      p.quadraticCurveTo(s.x, s.y, s.x, s.y + L);
      p.quadraticCurveTo(s.x, s.y, s.x - L * 0.8, s.y);
      p.quadraticCurveTo(s.x, s.y, s.x, s.y - L);
      p.closePath();
      tint(p, { B: 0, P: 0 });
      tint(p, { Y: 0.4 + 0.6 * tw });
    } else {
      const r = s.s * (0.45 + 0.4 * tw);
      const hole = new Path2D();
      circle(hole, s.x, s.y, r + 0.35);
      tint(hole, { B: 0, P: 0 });
      if (tw > 0.55) {
        const dot = new Path2D();
        circle(dot, s.x, s.y, r * 0.8);
        tint(dot, { Y: 1 });
      }
    }
  }
}

function capsule(path, x0, x1, y, r) {
  path.moveTo(x0, y - r);
  path.lineTo(x1, y - r);
  path.arc(x1, y, r, -Math.PI / 2, Math.PI / 2);
  path.lineTo(x0, y + r);
  path.arc(x0, y, r, Math.PI / 2, Math.PI * 1.5);
  path.closePath();
}

function cloud(c) {
  S.anchor = c.x;
  const lobes = [[0.18, 0.55, 0.22], [0.4, 0.35, 0.3], [0.64, 0.5, 0.24], [0.84, 0.62, 0.16]];
  const shade = new Path2D();
  const body = new Path2D();
  for (const [u, v, r] of lobes) {
    const cx = c.x + u * c.w;
    const half = r * c.w * 0.6;
    const rr = r * c.h;
    capsule(shade, cx - half, cx + half, c.y + v * c.h + 1.6, rr);
    capsule(body, cx - half, cx + half, c.y + v * c.h, rr);
  }
  set(shade, T.cloudShade);
  set(body, T.cloud);
}

function bat(b) {
  const up = Math.cos(b.flap * TAU);
  const wings = new Path2D();
  wings.moveTo(0, 0);
  wings.quadraticCurveTo(-5, -4 * up - 2, -10, -6 * up);
  wings.quadraticCurveTo(-7, -1, -6, 1);
  wings.quadraticCurveTo(-3, 0, 0, 2);
  wings.quadraticCurveTo(3, 0, 6, 1);
  wings.quadraticCurveTo(7, -1, 10, -6 * up);
  wings.quadraticCurveTo(5, -4 * up - 2, 0, 0);
  wings.closePath();
  const body = new Path2D();
  body.ellipse(0, 0.5, 1.6, 2.2, 0, 0, TAU);
  body.moveTo(-1.4, -1);
  body.lineTo(-1.2, -3.2);
  body.lineTo(-0.3, -1.6);
  body.moveTo(1.4, -1);
  body.lineTo(1.2, -3.2);
  body.lineTo(0.3, -1.6);
  // A pink offset print under the dark one, so a bat reads against the night.
  set(place(wings, b.x + 1, b.y + 0.8, b.s), { B: 0.3, P: 1 });
  set(place(wings, b.x, b.y, b.s), T.fg);
  set(place(body, b.x, b.y, b.s), T.fg);
}

function sky(f) {
  skyBase(f);
  stars(f);
  for (const c of f.clouds) cloud(c);
  S.anchor = 0;
  for (const b of f.bats) bat(b);
}

// Window holes in a ruin show the sky behind it.
function hole(path, f) {
  const keep = S.anchor;
  for (const k of PLATES) {
    S.cx[k].save();
    S.cx[k].clip(path);
  }
  skyBase(f);
  for (const k of PLATES) S.cx[k].restore();
  S.anchor = keep;
}

// ------------------------------------------------------------------ land
function ridge(L, spec, rim) {
  const p = new Path2D();
  p.moveTo(L.crest[0].x, 360);
  for (const q of L.crest) p.lineTo(q.x, q.y);
  p.lineTo(L.crest[L.crest.length - 1].x, 360);
  p.closePath();
  set(p, spec);
  if (rim) {
    // A single-drum print line along the crest: the blue drum lifts off it.
    const line = new Path2D();
    L.crest.forEach((q, k) => (k ? line.lineTo(q.x, q.y + 0.8) : line.moveTo(q.x, q.y + 0.8)));
    tint(line, rim, 1.2);
  }
}

function abbey(it, f) {
  const A = SHAPES.abbey;
  const at = (p) => place(p, it.x, it.y, it.s);
  set(at(A.rubble), T.bgShade);
  set(at(A.nave), T.bgRidge);
  tint(at(A.naveLit), { B: T.bgLit.B });
  hole(at(A.naveWin), f);
  set(at(A.tower), T.bgShade);
  set(at(A.towerLit), T.bgLit);
  set(at(A.spire), T.bgShade);
  set(at(A.spireLit), T.bgLit);
  hole(at(A.towerWin), f);
  set(at(A.transept), T.bgRidge);
  set(at(A.transeptLit), T.bgLit);
  hole(at(A.rose), f);
}

// The dead tree of ink.js, as tapered limbs.
function deadTree(path, x, y, s, lean, w = 1) {
  const L = lean;
  const W = 3.6 * s * w;
  limb(path, [x, y + 1, x + L * 4 * s, y - 26 * s, x + L * 8 * s, y - 50 * s], W, W * 0.25);
  limb(path, [x + L * 3 * s, y - 20 * s, x - 12 * s, y - 32 * s, x - 17 * s, y - 42 * s], W * 0.6, W * 0.15);
  limb(path, [x - 12 * s, y - 32 * s, x - 21 * s, y - 34 * s], W * 0.35, W * 0.1, 0);
  limb(path, [x + L * 5 * s, y - 30 * s, x + 13 * s, y - 40 * s, x + 20 * s, y - 42 * s], W * 0.6, W * 0.15);
  limb(path, [x + 13 * s, y - 40 * s, x + 15 * s, y - 49 * s], W * 0.35, W * 0.1, 0);
  limb(path, [x + L * 7 * s, y - 42 * s, x - 3 * s, y - 52 * s], W * 0.35, W * 0.1, 0);
  // Root flare.
  limb(path, [x - 1.5 * s, y + 1, x - 5 * s, y + 3], W * 0.6, W * 0.2, 0);
  limb(path, [x + 1.5 * s, y + 1, x + 5 * s, y + 3], W * 0.6, W * 0.2, 0);
}

function grove(it) {
  const p = new Path2D();
  const n = 3 + (it.i % 3);
  for (let k = 0; k < n; k++) {
    const dx = (k - (n - 1) / 2) * 12 * it.s + (seeded(it.i * 7 + k) - 0.5) * 6;
    const sc = (0.42 + seeded(it.i * 11 + k) * 0.24) * it.s;
    deadTree(p, it.x + dx, it.y + 2, sc, (seeded(k + it.i) - 0.5) * 0.6, 0.85);
  }
  set(p, T.grove);
}

function mausoleum(it) {
  const M = SHAPES.maus;
  const at = (p) => place(p, it.x, it.y, it.s);
  set(at(M.mSteps), T.midLit);
  set(at(M.mBody), T.midBody);
  set(at(M.mCols), T.midLit);
  set(at(M.mDoor), T.midDark);
  if (it.variant === 1) {
    set(at(M.mCornice), T.midLit);
    set(at(M.mDome), T.midLit);
    set(at(M.mDomeShade), T.midBody);
    set(at(M.mFinial), T.midDark);
  } else {
    set(at(M.mPed), T.midLit);
    set(at(M.mPedShade), T.midBody);
  }
}

function stone(it) {
  const rot = (seeded(it.i * 3.3) - 0.5) * 0.26;
  const shape = SHAPES.stones[it.variant] ?? SHAPES.stones[0];
  // Offset print: the lit copy sits a hair toward the moon, the dark one over it.
  set(place(shape, it.x + 1.1, it.y + 0.6, it.s, rot), T.stoneLit);
  set(place(shape, it.x, it.y + 1, it.s, rot), T.midDark);
}

function cross(it) {
  const rot = (seeded(it.i * 5.1) - 0.5) * 0.18;
  const celtic = it.i % 2 === 0;
  for (const [dx, dy, spec] of [[1.1, 0.6, T.stoneLit], [0, 1, T.midDark]]) {
    if (celtic) set(place(SHAPES.ring, it.x + dx, it.y + dy, it.s, rot), spec, 1.5 * it.s);
    set(place(SHAPES.cross, it.x + dx, it.y + dy, it.s, rot), spec);
  }
}

function gnarlPath(it, ox) {
  const s = it.s;
  const x = it.x + ox;
  const y = it.y + 2;
  const flip = it.variant === 1 ? -1 : 1;
  const X = (dx) => x + dx * s * flip;
  const Y = (dy) => y + dy * s;
  const p = new Path2D();
  const W = 7 * s;
  limb(p, [X(0), Y(2), X(-5), Y(-30), X(5), Y(-58), X(0), Y(-86)], W * 1.8, W * 0.7);
  limb(p, [X(2), Y(-50), X(24), Y(-66), X(44), Y(-64), X(58), Y(-74)], W * 0.95, W * 0.12);
  limb(p, [X(44), Y(-64), X(52), Y(-56), X(62), Y(-58)], W * 0.45, W * 0.08);
  limb(p, [X(30), Y(-66), X(36), Y(-82), X(48), Y(-92)], W * 0.55, W * 0.08);
  limb(p, [X(0), Y(-80), X(-14), Y(-100), X(-26), Y(-104)], W * 0.8, W * 0.1);
  limb(p, [X(-14), Y(-100), X(-12), Y(-114)], W * 0.4, W * 0.06, 0);
  limb(p, [X(1), Y(-84), X(14), Y(-104), X(30), Y(-112), X(38), Y(-124)], W * 0.75, W * 0.08);
  limb(p, [X(20), Y(-107), X(28), Y(-100), X(36), Y(-102)], W * 0.4, W * 0.06);
  limb(p, [X(-2), Y(-36), X(-18), Y(-46), X(-26), Y(-44)], W * 0.6, W * 0.08);
  limb(p, [X(-4), Y(0), X(-12), Y(2), X(-17), Y(5)], W * 0.9, W * 0.2);
  limb(p, [X(4), Y(0), X(12), Y(2), X(17), Y(5)], W * 0.9, W * 0.2);
  return p;
}

function gnarl(it) {
  // Moonlit edge first, a shade toward the moon; the tree over it.
  set(gnarlPath(it, 1.4), T.fgLit);
  set(gnarlPath(it, 0), T.fg);
}

function fence(it, L) {
  const gateHalf = 15;
  const iron = new Path2D();
  for (let x = it.x0; x <= it.x1; x += 7) {
    if (it.gate != null && Math.abs(x - it.gate) < gateHalf + 2) continue;
    const b = L.ridge(x);
    rect(iron, x - 0.75, b - 20, 1.5, 21);
    poly(iron, [x - 2, b - 19.5, x, b - 25, x + 2, b - 19.5]);
  }
  set(iron, T.fg);
  const rails = new Path2D();
  const runs = it.gate == null ? [[it.x0, it.x1]] : [[it.x0, it.gate - gateHalf], [it.gate + gateHalf, it.x1]];
  for (const [a, b] of runs) {
    for (const h of [5, 16]) {
      for (let x = a; x <= b; x += 4) {
        const y = L.ridge(x) - h;
        x === a ? rails.moveTo(x, y) : rails.lineTo(x, y);
      }
      rails.lineTo(b, L.ridge(b) - h);
    }
  }
  set(rails, T.fg, 1.5);
  if (it.gate != null) {
    const g = it.gate;
    const b = L.foot(g, gateHalf);
    const posts = new Path2D();
    rect(posts, g - gateHalf - 1.5, b - 32, 3, 33);
    rect(posts, g + gateHalf - 1.5, b - 32, 3, 33);
    circle(posts, g - gateHalf, b - 34, 2.6);
    circle(posts, g + gateHalf, b - 34, 2.6);
    set(posts, T.fg);
    const work = new Path2D();
    work.moveTo(g - gateHalf, b - 26);
    work.quadraticCurveTo(g, b - 40, g + gateHalf, b - 26);
    for (let x = g - gateHalf + 5; x < g + gateHalf - 2; x += 5) {
      work.moveTo(x, b);
      work.lineTo(x, b - 26 - 6 * Math.cos(((x - g) / gateHalf) * 1.4));
    }
    work.moveTo(g - gateHalf, b - 12);
    work.lineTo(g + gateHalf, b - 12);
    set(work, T.fg, 1.4);
    // A pink print of the gate's scroll, the one ornament the moon catches.
    const scroll = new Path2D();
    circle(scroll, g, b - 19, 3.2);
    tint(scroll, { B: 0.45 }, 1);
  }
}

function lamp(it, t) {
  const x = it.x;
  const y = it.y + 1;
  const s = it.s;
  const flicker = 0.92 + 0.08 * Math.sin(t * 11 + it.i) * Math.sin(t * 7.3);
  const hy = y - 40 * s;
  S.anchor = x;
  // Glow: stepped rings. The blue drum is knocked back so the pink carries the light
  // out, and only the core, where the blue is gone, takes yellow.
  for (const [r, k] of [[30, 0.3], [20, 0.6]]) {
    const p = new Path2D();
    circle(p, x, hy, r * s * flicker);
    trap(p, k);
  }
  const core = new Path2D();
  circle(core, x, hy, 11 * s * flicker);
  tint(core, { B: 0 });
  add(core, { P: 0.25, Y: 0.55 });
  const post = new Path2D();
  rect(post, x - 1.4 * s, y - 34 * s, 2.8 * s, 34 * s);
  rect(post, x - 3.5 * s, y - 3 * s, 7 * s, 3 * s);
  poly(post, [x - 6 * s, hy - 5 * s, x, hy - 10 * s, x + 6 * s, hy - 5 * s]);
  rect(post, x - 5 * s, hy + 3.5 * s, 10 * s, 1.5 * s);
  set(post, T.fg);
  const glass = new Path2D();
  poly(glass, [x - 5 * s, hy + 4 * s, x + 5 * s, hy + 4 * s, x + 4 * s, hy - 5 * s, x - 4 * s, hy - 5 * s]);
  set(glass, { B: 0, P: 0.18 * flicker, Y: 1 });
  const bar = new Path2D();
  rect(bar, x - 0.5 * s, hy - 5 * s, 1 * s, 9 * s);
  set(bar, T.fg);
}

function grass(it) {
  const p = new Path2D();
  for (let k = 0; k < 7; k++) {
    const dx = (k - 3) * 2.2 * it.s;
    const h = (7 + seeded(it.i * 13 + k) * 7) * it.s;
    const bend = (seeded(it.i + k * 5) - 0.4) * 6 * it.s;
    limb(p, [it.x + dx, it.y + 2, it.x + dx + bend * 0.4, it.y - h * 0.6, it.x + dx + bend, it.y - h], 1.8 * it.s, 0.3, 0);
    if (k % 3 === 1) circle(p, it.x + dx + bend, it.y - h, 1.3 * it.s);
  }
  set(p, T.fg);
}

function fogBand(band, strength) {
  for (const q of band.puffs) {
    S.anchor = q.x;
    const outer = new Path2D();
    outer.ellipse(q.x, q.y, q.rx, q.ry, 0, 0, TAU);
    trap(outer, 0.12 * strength);
    const inner = new Path2D();
    inner.ellipse(q.x + q.rx * 0.08, q.y + q.ry * 0.1, q.rx * 0.62, q.ry * 0.6, 0, 0, TAU);
    trap(inner, 0.26 * strength);
  }
}

function layer(f, name) {
  const L = f.layers[name];
  S.anchor = -L.shift;
  for (const it of L.items) if (it.kind === 'abbey') abbey(it, f);
  if (name === 'bg') ridge(L, T.bgRidge, { B: 0.22 });
  else if (name === 'mid') ridge(L, T.midRidge, { B: 0.55 });
  else ridge(L, T.fg);
  for (const it of L.items) {
    S.anchor = -L.shift;
    if (it.kind === 'grove') grove(it);
    else if (it.kind === 'mausoleum') mausoleum(it);
    else if (it.kind === 'tree') {
      const lean = it.variant === 1 ? -0.8 : 0.2;
      for (const [dx, spec] of [[1.1, T.stoneLit], [0, T.midDark]]) {
        const p = new Path2D();
        deadTree(p, it.x + dx, it.y, it.s, lean);
        set(p, spec);
      }
    } else if (it.kind === 'stone') stone(it);
    else if (it.kind === 'cross') cross(it);
    else if (it.kind === 'gnarl') gnarl(it);
    else if (it.kind === 'fence') fence(it, L);
    else if (it.kind === 'lamp') lamp(it, f.t);
    else if (it.kind === 'grass') grass(it);
  }
}

// ------------------------------------------------------------------ print
function print(ctx) {
  for (const k of PLATES) {
    const c = S.cx[k];
    c.setTransform(1, 0, 0, 1, 0, 0);
    // Under-inking and pinholes, then the drum's colour: white stays paper.
    c.globalCompositeOperation = 'screen';
    c.fillStyle = S.grain[k];
    c.fillRect(0, 0, S.w, S.h);
    c.fillStyle = INKS[k];
    c.fillRect(0, 0, S.w, S.h);
    c.globalCompositeOperation = 'source-over';
  }
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = PAPER;
  ctx.fillRect(-OX, -OY, PW, PH);
  ctx.globalCompositeOperation = 'multiply';
  const snap = (v) => Math.round(v * S.sc) / S.sc;
  for (const k of PLATES) {
    ctx.drawImage(S.cv[k], -OX + snap(REG[k][0]), -OY + snap(REG[k][1]), PW, PH);
  }
  ctx.restore();
}

export const STYLE = {
  id: 'riso',
  name: 'RISO PRINT',
  note: 'Three spot-ink drums on cream stock: medium blue and fluorescent pink overprint into a violet night, '
    + 'yellow prints only the moon, stars and lamp. Halftone screens at their own angles, grainy under-inked '
    + 'coverage and every plate a hair off register.',
  paint(ctx, f) {
    const m = ctx.getTransform();
    const sc = Math.min(3, Math.max(1, Math.round(Math.hypot(m.a, m.b) * 4) / 4));
    ensure(sc);
    for (const k of PLATES) {
      const c = S.cx[k];
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = '#fff';
      c.fillRect(0, 0, S.w, S.h);
      c.setTransform(sc, 0, 0, sc, OX * sc, OY * sc);
    }
    sky(f);
    layer(f, 'bg');
    layer(f, 'mid');
    fogBand(f.fog[0], 1);
    layer(f, 'fg');
    fogBand(f.fog[1], 0.7);
    print(ctx);
  },
};
