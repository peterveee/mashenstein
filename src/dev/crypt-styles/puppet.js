// CRYPT style bake-off — SHADOW PUPPETRY. Lotte Reiniger's cut-paper silhouettes and
// backlit shadow theatre: every object is a flat, razor-edged cut-out with lacy pierced
// detail (tracery, scrolls, hooked thorns, star and crescent motifs), laid over glowing
// coloured paper. Depth is stacked screens: the far ridge is a hazy rose-plum cut-out,
// the graveyard hill a deeper plum, and only the near bank is true black. The light sits
// low behind the screen, so the strip over the lane glows and the lane reads against it.
//
// Each layer is cut on an offscreen "plate": its silhouettes are filled solid, the
// pierced detail is punched out with destination-out (so a window really shows the
// layer behind it), and the plate is then tinted with the layer's tone and laid down.

const TAU = Math.PI * 2;

function hash(i) {
  const x = Math.sin(i * 91.7 + 17.3) * 43758.5453;
  return x - Math.floor(x);
}

// ------------------------------------------------------------------ palette
const SKY_STOPS = [
  [-80, '#071522'],
  [0, '#0a1d2c'],
  [44, '#0f2240'],
  [90, '#211f4b'],
  [128, '#472a5b'],
  [158, '#83405f'],
  [184, '#c05a63'],
  [208, '#e5835f'],
  [232, '#f3a867'],
];
const BG_TONE = [[40, '#0c1226'], [100, '#1a1733'], [140, '#32203f'], [172, '#522848'], [205, '#72314e'], [250, '#8a3c50']];
const MID_TONE = [[120, '#0a0917'], [170, '#170d20'], [205, '#220f22'], [250, '#2e1426']];
const FG_TONE = '#060409';
// The gels between the screens, each one colour on an alpha ramp down the frame. HAZE
// lies over the far ridge only; FOOT, the low light behind the screen, over the far
// ridge and the hill. The sky is never seen below the far ridge (its crest never
// drops past y 196), so both are baked into the layer tones instead of painted.
const HAZE = { rgb: [240, 150, 122], ramp: [[150, 0], [196, 0.22], [236, 0.36]] };
const FOOT = { rgb: [255, 188, 144], ramp: [[198, 0], [212, 0.34], [224, 0.66], [236, 0.84]] };
const MOON = '#fff4df';
const STAR = '#fff0d6';
const CLOUD = 'rgba(22,16,48,0.46)';
const BAT = '#0b0710';
const PANE_HI = '#fff0b0';
const PANE_LO = '#ffb04a';

// ------------------------------------------------------------------ geometry
// Signed area, positive = clockwise on a y-down screen.
function area(pts) {
  let a = 0;
  const n = pts.length;
  for (let k = 0; k < n; k += 2) {
    const j = (k + 2) % n;
    a += pts[k] * pts[j + 1] - pts[j] * pts[k + 1];
  }
  return a;
}

// Every piece is wound the same way, so a union of overlapping pieces in one path never
// cancels itself out under the nonzero rule.
function poly(p, pts) {
  const n = pts.length;
  if (area(pts) >= 0) {
    p.moveTo(pts[0], pts[1]);
    for (let k = 2; k < n; k += 2) p.lineTo(pts[k], pts[k + 1]);
  } else {
    p.moveTo(pts[n - 2], pts[n - 1]);
    for (let k = n - 4; k >= 0; k -= 2) p.lineTo(pts[k], pts[k + 1]);
  }
  p.closePath();
}

function rect(p, x, y, w, h) { poly(p, [x, y, x + w, y, x + w, y + h, x, y + h]); }

function disc(p, x, y, r) {
  p.moveTo(x + r, y);
  p.arc(x, y, r, 0, TAU);
  p.closePath();
}

function oval(p, x, y, rx, ry) {
  p.moveTo(x + rx, y);
  p.ellipse(x, y, rx, ry, 0, 0, TAU);
  p.closePath();
}

// An annulus: the inner circle is wound backwards so it stays open.
function ring(p, x, y, r0, r1) {
  disc(p, x, y, r1);
  p.moveTo(x + r0, y);
  p.arc(x, y, r0, TAU, 0, true);
  p.closePath();
}

function star(p, x, y, R, r, n = 5, rot = -Math.PI / 2) {
  const pts = [];
  for (let k = 0; k < n * 2; k++) {
    const a = rot + (k * Math.PI) / n;
    const rr = k % 2 ? r : R;
    pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  poly(p, pts);
}

// Catmull-Rom through a flat point list.
function smooth(pts, sub = 4) {
  const n = pts.length / 2;
  if (n < 3) return pts.slice();
  const out = [];
  for (let i = 0; i < n - 1; i++) {
    const i0 = Math.max(i - 1, 0);
    const i3 = Math.min(i + 2, n - 1);
    const x0 = pts[i0 * 2], y0 = pts[i0 * 2 + 1];
    const x1 = pts[i * 2], y1 = pts[i * 2 + 1];
    const x2 = pts[i * 2 + 2], y2 = pts[i * 2 + 3];
    const x3 = pts[i3 * 2], y3 = pts[i3 * 2 + 1];
    for (let k = 0; k < sub; k++) {
      const t = k / sub, t2 = t * t, t3 = t2 * t;
      out.push(
        0.5 * (2 * x1 + (-x0 + x2) * t + (2 * x0 - 5 * x1 + 4 * x2 - x3) * t2 + (-x0 + 3 * x1 - 3 * x2 + x3) * t3),
        0.5 * (2 * y1 + (-y0 + y2) * t + (2 * y0 - 5 * y1 + 4 * y2 - y3) * t2 + (-y0 + 3 * y1 - 3 * y2 + y3) * t3),
      );
    }
  }
  out.push(pts[n * 2 - 2], pts[n * 2 - 1]);
  return out;
}

// Bounding box of whatever a builder is cutting, so a procedural tree can be sized.
let BB = null;

// A tapered cut stroke: a smooth polygon from width w0 to w1 along the points.
function taper(p, pts, w0, w1, sub = 4) {
  const q = smooth(pts, sub);
  const n = q.length / 2;
  const L = [0];
  for (let k = 1; k < n; k++) L.push(L[k - 1] + Math.hypot(q[k * 2] - q[k * 2 - 2], q[k * 2 + 1] - q[k * 2 - 1]));
  const total = L[n - 1] || 1;
  const left = [];
  const right = [];
  for (let k = 0; k < n; k++) {
    const a = Math.max(k - 1, 0);
    const b = Math.min(k + 1, n - 1);
    let dx = q[b * 2] - q[a * 2];
    let dy = q[b * 2 + 1] - q[a * 2 + 1];
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    const hw = (w0 + ((w1 - w0) * L[k]) / total) / 2;
    left.push(q[k * 2] - dy * hw, q[k * 2 + 1] + dx * hw);
    right.push(q[k * 2] + dy * hw, q[k * 2 + 1] - dx * hw);
    if (BB) {
      BB.x0 = Math.min(BB.x0, q[k * 2]); BB.x1 = Math.max(BB.x1, q[k * 2]);
      BB.y0 = Math.min(BB.y0, q[k * 2 + 1]);
    }
  }
  for (let k = n - 1; k >= 0; k--) left.push(right[k * 2], right[k * 2 + 1]);
  poly(p, left);
}

// A curl: heading `a`, turning a little harder each step (sign of `turn` = direction).
function spiral(x, y, a, len, turn, n = 7) {
  const pts = [x, y];
  let step = len / 4;
  for (let k = 0; k < n; k++) {
    a += turn * (1 + k * 0.22);
    x += Math.cos(a) * step;
    y += Math.sin(a) * step;
    step *= 0.8;
    pts.push(x, y);
  }
  return pts;
}

// A pointed (lancet) arch standing on y, as a point list.
function lancetPts(x, y, w, h, n = 6) {
  const hw = w / 2;
  const sy = y - h + w * 0.6;
  const cy = y - h;
  const ay = y - h - w * 0.3;
  const Lp = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
    Lp.push([(a + b) * (x - hw) + c * x, a * sy + b * cy + c * ay]);
  }
  const pts = [x - hw, y];
  for (const [px, py] of Lp) pts.push(px, py);
  for (let k = n - 1; k >= 0; k--) pts.push(2 * x - Lp[k][0], Lp[k][1]);
  pts.push(x + hw, y);
  return pts;
}

// ------------------------------------------------------------------ shapes
// A cut-out is three paths in its own coordinates: the solid card, the holes punched
// through it, and any fine work laid back into a hole (tracery, a door, a rivet).
function newShape() {
  return { solid: new Path2D(), holes: new Path2D(), over: new Path2D(), hasHoles: false, hasOver: false };
}

const SHAPES = new Map();
function shapeOf(key, build) {
  let s = SHAPES.get(key);
  if (!s) { s = build(); SHAPES.set(key, s); }
  return s;
}

function stamp(c, S, x, y, s, rot = 0, flip = 1) {
  c.save();
  c.translate(x, y);
  if (rot) c.rotate(rot);
  c.scale(s * flip, s);
  c.fill(S.solid);
  if (S.hasHoles) {
    c.globalCompositeOperation = 'destination-out';
    c.fill(S.holes);
    c.globalCompositeOperation = 'source-over';
  }
  if (S.hasOver) c.fill(S.over);
  c.restore();
}

// Procedural dead tree: forking tapered limbs, hooked thorns, curled tips. Built at
// a trial height, measured, then rebuilt so its top lands at `h`.
function growTree(seed, h, opts) {
  const { lean = 0, depth = 3, trunk = h * 0.09, curl = 0.75, thorn = 0.45, spread = 1, bole = 0.36 } = opts;
  const S = newShape();
  const p = S.solid;
  let n = 0;
  const R = () => hash(seed * 13.37 + (n++) * 7.1);
  const grow = (x, y, a, len, w, d) => {
    const bend = (R() - 0.5) * 0.7;
    const pts = [x, y];
    let cx = x, cy = y;
    for (let k = 0; k < 3; k++) {
      a += bend / 3 + (R() - 0.5) * 0.2;
      cx += (Math.cos(a) * len) / 3;
      cy += (Math.sin(a) * len) / 3;
      pts.push(cx, cy);
    }
    const tw = d === 0 ? Math.max(0.16, w * 0.3) : w * 0.68;
    taper(p, pts, w, tw);
    if (thorn && w > 0.7 && R() < thorn) {
      const k = 1 + Math.floor(R() * 2);
      const tx = pts[k * 2], ty = pts[k * 2 + 1];
      const side = R() < 0.5 ? -1 : 1;
      const ta = a + side * 1.05;
      const tl = 1 + w * 1.1;
      const ex = tx + Math.cos(ta) * tl, ey = ty + Math.sin(ta) * tl;
      const ha = ta + side * 1.3;
      taper(p, [tx, ty, ex, ey, ex + Math.cos(ha) * tl * 0.45, ey + Math.sin(ha) * tl * 0.45], w * 0.5, 0.1);
    }
    if (d === 0) {
      if (R() < curl) {
        const dir = R() < 0.5 ? -1 : 1;
        taper(p, spiral(cx, cy, a, len * 0.5, dir * 0.62, 7), tw, 0.1);
      }
      return;
    }
    const kids = d >= 2 && R() < 0.45 ? 3 : 2;
    for (let c = 0; c < kids; c++) {
      const side = kids === 2 ? (c ? 1 : -1) : c - 1;
      const na = a + side * (0.42 + R() * 0.3) * spread + (R() - 0.5) * 0.2;
      grow(cx, cy, na, len * (0.6 + R() * 0.2), tw * (side === 0 ? 0.95 : 0.86), d - 1);
    }
  };
  grow(0, 2, -Math.PI / 2 + lean, h * bole, trunk, depth);
  taper(p, [0, -h * 0.08, -trunk * 1.1, 0.4, -trunk * 2.1, 2.2], trunk * 0.8, 0.2);
  taper(p, [0, -h * 0.08, trunk * 1.0, 0.4, trunk * 2.0, 2.2], trunk * 0.8, 0.2);
  return S;
}

function buildTree(seed, h, opts) {
  BB = { x0: 0, x1: 0, y0: 0 };
  growTree(seed, h, opts);
  const top = -BB.y0;
  BB = null;
  const k = h / Math.max(1, top);
  return growTree(seed, h * k, { ...opts, trunk: (opts.trunk ?? h * 0.09) * k });
}

// ------------------------------------------------------------------ plate
// Each layer is cut on a plate covering only its own band of the frame.
const PX0 = -16, PW = 512;
const BAND = { bg: [48, 236], mid: [124, 236], fg: [86, 236] };
const PH = 190;
// Caches are kept per device scale, so a thumbnail and a full card drawn in the same
// frame don't rebuild each other's canvases.
const PLATES = new Map();

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

function hexRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

function ramp(stops, y) {
  if (y <= stops[0][0]) return stops[0][1];
  for (let k = 1; k < stops.length; k++) {
    if (y <= stops[k][0]) {
      const [y0, a] = stops[k - 1];
      const [y1, b] = stops[k];
      const t = (y - y0) / (y1 - y0);
      return Array.isArray(a) ? a.map((v, i) => v + (b[i] - v) * t) : a + (b - a) * t;
    }
  }
  return stops[stops.length - 1][1];
}

function bakeTone(c, stops, gels) {
  const rgb = stops.map(([y, h]) => [y, hexRgb(h)]);
  const g = c.createLinearGradient(0, 40, 0, 240);
  for (let y = 40; y <= 240; y += 4) {
    let col = ramp(rgb, y);
    for (const gl of gels) {
      const a = ramp(gl.ramp, y);
      col = col.map((v, i) => v + (gl.rgb[i] - v) * a);
    }
    g.addColorStop((y - 40) / 200, `rgb(${col.map(Math.round).join(',')})`);
  }
  return g;
}

function getPlate(scale) {
  let plate = PLATES.get(scale);
  if (plate) return plate;
  const w = Math.ceil(PW * scale);
  const h = Math.ceil(PH * scale);
  const canvas = makeCanvas(w, h);
  const c = canvas.getContext('2d');
  plate = {
    scale, canvas, c, w, h,
    tone: { bg: bakeTone(c, BG_TONE, [HAZE, FOOT]), mid: bakeTone(c, MID_TONE, [FOOT]), fg: FG_TONE },
  };
  PLATES.set(scale, plate);
  return plate;
}

function beginPlate(P, name) {
  const c = P.c;
  const y0 = BAND[name][0];
  P.y0 = y0;
  P.rows = Math.min(P.h, Math.ceil((BAND[name][1] - y0) * P.scale));
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
  c.clearRect(0, 0, P.w, P.rows);
  c.setTransform(P.scale, 0, 0, P.scale, -PX0 * P.scale, -y0 * P.scale);
  // The near bank is cut straight in its black; the others are tinted afterwards.
  const ink = name === 'fg' ? FG_TONE : '#000';
  c.fillStyle = ink;
  c.strokeStyle = ink;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  return c;
}

function endPlate(ctx, P, name) {
  const c = P.c;
  const h = P.rows / P.scale;
  if (name !== 'fg') {
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = P.tone[name];
    c.fillRect(PX0, P.y0, PW, h);
    c.globalCompositeOperation = 'source-over';
  }
  ctx.drawImage(P.canvas, 0, 0, P.w, P.rows, PX0, P.y0, P.w / P.scale, h);
}

// ------------------------------------------------------------------ sky
function skyGradient(ctx) {
  const g = ctx.createLinearGradient(0, -80, 0, 232);
  for (const [y, col] of SKY_STOPS) g.addColorStop((y + 80) / 312, col);
  return g;
}

// The screen itself never moves: gradient, vignette, the moon's bloom, paper grain and
// the moon hole are cut once per scale and laid down as one image.
const SX0 = -40, SY0 = -80, SW = 560, SH = 430;
const SCREENS = new Map();

function buildScreen(scale, m) {
  const w = Math.ceil(SW * scale);
  const h = Math.ceil(SH * scale);
  const canvas = makeCanvas(w, h);
  const c = canvas.getContext('2d');
  c.setTransform(scale, 0, 0, scale, -SX0 * scale, -SY0 * scale);
  c.fillStyle = skyGradient(c);
  c.fillRect(SX0, SY0, SW, SH);
  const vig = c.createRadialGradient(240, 170, 160, 240, 170, 440);
  vig.addColorStop(0, 'rgba(2,4,14,0)');
  vig.addColorStop(1, 'rgba(2,4,14,0.6)');
  c.fillStyle = vig;
  c.fillRect(SX0, SY0, SW, SH);
  // The lamp behind the screen: a wide warm bloom round the moon hole.
  const glow = c.createRadialGradient(m.x, m.y, m.r * 0.8, m.x, m.y, 170);
  glow.addColorStop(0, 'rgba(255,226,176,0.62)');
  glow.addColorStop(0.18, 'rgba(255,198,150,0.32)');
  glow.addColorStop(0.5, 'rgba(236,150,130,0.12)');
  glow.addColorStop(1, 'rgba(236,150,130,0)');
  c.fillStyle = glow;
  c.fillRect(m.x - 170, m.y - 170, 340, 340);
  // Paper grain: thick fibres and cloudy formation hold back a little of the light.
  c.globalCompositeOperation = 'multiply';
  let n = 0;
  const R = () => hash(5000 + (n++) * 1.618);
  for (let k = 0; k < 70; k++) {
    const x = SX0 + R() * SW, y = SY0 + R() * SH, r = 8 + R() * 26;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(150,108,112,0.1)');
    g.addColorStop(1, 'rgba(150,108,112,0)');
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  c.lineCap = 'round';
  for (let k = 0; k < 1500; k++) {
    let x = SX0 + R() * SW, y = SY0 + R() * SH, a = R() * TAU;
    const len = 3 + R() * 9;
    c.strokeStyle = `rgba(120,76,86,${0.06 + R() * 0.12})`;
    c.lineWidth = 0.25 + R() * 0.35;
    c.beginPath();
    c.moveTo(x, y);
    for (let j = 0; j < 4; j++) {
      a += (R() - 0.5) * 0.9;
      x += (Math.cos(a) * len) / 4;
      y += (Math.sin(a) * len) / 4;
      c.lineTo(x, y);
    }
    c.stroke();
  }
  c.globalCompositeOperation = 'source-over';
  // The moon: a clean hole cut through the screen.
  const halo = c.createRadialGradient(m.x, m.y, m.r, m.x, m.y, m.r + 16);
  halo.addColorStop(0, 'rgba(255,240,210,0.55)');
  halo.addColorStop(1, 'rgba(255,240,210,0)');
  c.fillStyle = halo;
  c.fillRect(m.x - m.r - 16, m.y - m.r - 16, (m.r + 16) * 2, (m.r + 16) * 2);
  const face = c.createRadialGradient(m.x - 5, m.y - 6, 2, m.x, m.y, m.r);
  face.addColorStop(0, '#fffcf2');
  face.addColorStop(1, MOON);
  c.fillStyle = face;
  c.beginPath();
  disc(c, m.x, m.y, m.r);
  c.fill();
  return { scale, canvas, w, h };
}

function sky(ctx, f, scale) {
  let screen = SCREENS.get(scale);
  if (!screen) { screen = buildScreen(scale, f.moon); SCREENS.set(scale, screen); }
  ctx.drawImage(screen.canvas, SX0, SY0, screen.w / scale, screen.h / scale);
  // Pinholes, and a few cut stars.
  for (const s of f.stars) {
    const a = s.twinkle;
    ctx.fillStyle = 'rgba(255,214,170,1)';
    ctx.globalAlpha = 0.09 * a;
    ctx.beginPath();
    disc(ctx, s.x, s.y, s.s * 1.6);
    ctx.fill();
    ctx.globalAlpha = 0.5 + 0.5 * a;
    ctx.fillStyle = STAR;
    ctx.beginPath();
    if (s.s > 1.5) star(ctx, s.x, s.y, s.s * 1.9, s.s * 0.45, 4, (s.phase % 1) * 0.4 - Math.PI / 2);
    else disc(ctx, s.x, s.y, s.s * 0.42);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const c of f.clouds) cloud(ctx, c);
  for (const b of f.bats) bat(ctx, b);
}

const LOBES = [[0.17, 0.5, 0.16], [0.37, 0.18, 0.23], [0.6, 0.34, 0.2], [0.8, 0.56, 0.14]];

function cloud(ctx, c) {
  const x0 = c.x + c.w * 0.07;
  const x1 = c.x + c.w * 0.93;
  const base = c.y + c.h * 0.92;
  const topAt = (x) => {
    let y = base - 1.2;
    for (const [u, v, r] of LOBES) {
      const d = (x - (c.x + u * c.w)) / (r * c.w);
      if (d > -1 && d < 1) y = Math.min(y, base - (base - (c.y + v * c.h)) * Math.sqrt(1 - d * d));
    }
    return y;
  };
  ctx.fillStyle = CLOUD;
  ctx.beginPath();
  ctx.moveTo(x0, base);
  for (let x = x0; x <= x1; x += 1.5) ctx.lineTo(x, topAt(x));
  ctx.lineTo(x1, base);
  const n = Math.max(3, Math.round((x1 - x0) / 9));
  for (let k = n; k > 0; k--) {
    const xa = x0 + ((x1 - x0) * k) / n;
    const xb = x0 + ((x1 - x0) * (k - 1)) / n;
    ctx.quadraticCurveTo((xa + xb) / 2, base - c.h * 0.3, xb, base);
  }
  ctx.closePath();
  // Lace: a row of pierced holes along the belly.
  for (let k = 1; k < n; k++) {
    const hx = x0 + ((x1 - x0) * (k - 0.5)) / n;
    const hy = base - c.h * 0.44;
    if (topAt(hx) < hy - 2.4) {
      ctx.moveTo(hx + 1.1, hy);
      ctx.arc(hx, hy, 1.1, 0, TAU);
      ctx.closePath();
    }
  }
  ctx.fill('evenodd');
  ctx.beginPath();
  taper(ctx, spiral(x0 + 1.5, base - 0.6, Math.PI + 0.25, c.h * 1.1, 0.72, 7), 1.8, 0.2);
  taper(ctx, spiral(x1 - 1.5, base - 0.6, -0.25, c.h * 0.95, -0.72, 7), 1.8, 0.2);
  ctx.fill();
}

function bat(ctx, b) {
  const up = Math.cos(b.flap * TAU);
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.scale(b.s, b.s);
  ctx.fillStyle = BAT;
  for (const sg of [-1, 1]) {
    const wx = sg * 6, wy = -4.6 * up - 1.4;
    const tx = sg * 11.5, ty = -6.6 * up + 0.4;
    const f1x = sg * 8.4, f1y = ty * 0.45 + 3.2;
    const f2x = sg * 4.9, f2y = wy * 0.2 + 3.4;
    const bx = sg * 1, by = 1.8;
    const scal = (ax, ay, bx2, by2) => {
      const mx = (ax + bx2) / 2, my = (ay + by2) / 2;
      ctx.quadraticCurveTo(mx + (wx - mx) * 0.38, my + (wy - my) * 0.38, bx2, by2);
    };
    ctx.beginPath();
    ctx.moveTo(sg * 0.8, -1.2);
    ctx.quadraticCurveTo(sg * 3.4, wy - 1.4, wx, wy);
    ctx.lineTo(tx, ty);
    scal(tx, ty, f1x, f1y);
    scal(f1x, f1y, f2x, f2y);
    scal(f2x, f2y, bx, by);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  oval(ctx, 0, 0.6, 1.8, 2.7);
  disc(ctx, 0, -2.2, 1.45);
  ctx.fill();
  ctx.beginPath();
  poly(ctx, [-1.3, -2.8, -1.0, -5.2, -0.2, -3.3]);
  ctx.fill();
  ctx.beginPath();
  poly(ctx, [1.3, -2.8, 1.0, -5.2, 0.2, -3.3]);
  ctx.fill();
  // Hinge pins at the wrists, where the wing panels are jointed.
  const wy = -4.6 * up - 1.4;
  ctx.fillStyle = 'rgba(255,214,170,0.8)';
  ctx.beginPath();
  disc(ctx, -5.6, wy + 0.9, 0.45);
  disc(ctx, 5.6, wy + 0.9, 0.45);
  ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------------ ridges
function ridge(c, L, fringe) {
  c.beginPath();
  c.moveTo(L.crest[0].x, 240);
  for (const p of L.crest) c.lineTo(p.x, p.y);
  c.lineTo(L.crest[L.crest.length - 1].x, 240);
  c.closePath();
  c.fill();
  // A cut fringe of grass along the crest, fixed to the layer so it scrolls with it.
  const { step, h0, h1, w } = fringe;
  const k0 = Math.floor((-14 + L.shift) / step);
  const k1 = Math.ceil((FRAME_R + L.shift) / step);
  c.beginPath();
  for (let k = k0; k <= k1; k++) {
    const x = k * step - L.shift;
    const y = L.ridge(x) + 0.8;
    const r = hash(k * 1.37 + fringe.seed);
    const h = h0 + r * (h1 - h0) * (hash(k * 0.61 + 9) < 0.7 ? 1 : 0.35);
    const lean = (hash(k * 2.9 + fringe.seed) - 0.5) * h * 0.9;
    c.moveTo(x + w, y);
    c.lineTo(x - w, y);
    c.quadraticCurveTo(x - w * 0.5 + lean * 0.3, y - h * 0.6, x + lean, y - h);
    c.closePath();
  }
  c.fill();
}
const FRAME_R = 494;

// ------------------------------------------------------------------ bg
function buildAbbey() {
  const S = newShape();
  const p = S.solid, H = S.holes, O = S.over;
  S.hasHoles = S.hasOver = true;
  // Nave, its top broken off in steps.
  poly(p, [-54, 4, -54, -24, -51, -26, -48, -30, -45, -28, -40, -28, -37, -33, -34, -36, -30, -34.5,
    -25, -35, -22, -34, -19, -38, -16, -40, -12, -38, -8, -37, -5, -39.5, 2, -41, 2, 4]);
  poly(p, [-58, 4, -58, -13, -56.5, -18, -54, -20, -54, 4]);
  // Tower, corner pinnacles, a crocketed spire with a cross.
  rect(p, 2, -54, 16, 58);
  rect(p, 1, -56, 18, 2.4);
  for (const x of [5, 9, 13]) rect(p, x - 1, -58, 2, 2.5);
  taper(p, [2.8, -55, 2.8, -63], 2.4, 0.2);
  taper(p, [17.2, -55, 17.2, -63], 2.4, 0.2);
  poly(p, [0.8, -55, 10, -86, 19.2, -55]);
  for (const t of [0.22, 0.42, 0.62, 0.8]) {
    for (const sg of [-1, 1]) {
      const bx = 10 + sg * 9.2 * (1 - t);
      const by = -55 - 31 * t;
      taper(p, [bx - sg * 0.6, by + 0.4, bx + sg * 1.8, by - 0.4, bx + sg * 2.2, by - 2.2, bx + sg * 1.4, by - 2.8], 1.3, 0.2);
    }
  }
  rect(p, 9.55, -93, 0.9, 8);
  rect(p, 8.1, -90.6, 3.8, 0.9);
  // Roofless transept.
  poly(p, [18, 4, 18, -26, 22, -29, 25, -33, 28, -34, 30, -31, 32, -30, 35, -34, 38, -36, 41, -33, 44, -30, 47, -27, 50, -24, 50, 4]);
  // Ivy tendrils curling off the broken tops.
  taper(p, spiral(-48, -29.5, -2.1, 7, -0.55, 7), 1.1, 0.12);
  taper(p, spiral(-16, -39.5, -1.7, 8, 0.6, 7), 1.1, 0.12);
  taper(p, spiral(-34, -35.5, -1.3, 5, 0.6, 6), 0.9, 0.12);
  taper(p, spiral(38, -35.5, -1.1, 7, 0.55, 7), 1.1, 0.12);
  taper(p, spiral(50, -24, -0.6, 6, -0.6, 6), 1, 0.12);
  // Three broken lancets through the nave, with Y-tracery and a ring at the head.
  for (const [x, h] of [[-42, 18], [-27, 21], [-12, 22]]) {
    const y = -6, w = 8, sy = y - h + w * 0.6;
    poly(H, lancetPts(x, y, w, h));
    rect(O, x - 0.45, sy + 0.8, 0.9, y - sy - 0.8);
    taper(O, [x, sy + 1.2, x - 1.9, sy - 1.6, x - 3.7, sy + 0.4], 0.8, 0.8);
    taper(O, [x, sy + 1.2, x + 1.9, sy - 1.6, x + 3.7, sy + 0.4], 0.8, 0.8);
    ring(O, x, sy - 3.1, 0.75, 1.35);
    rect(O, x - 4, y - 7.5, 8, 0.8);
  }
  // Tower: a lancet, a quatrefoil belfry, a lucarne on the spire.
  poly(H, lancetPts(10, -30, 5.5, 13));
  rect(O, 9.6, -38, 0.8, 8);
  for (const [dx, dy] of [[-1.3, 0], [1.3, 0], [0, -1.3], [0, 1.3]]) disc(H, 10 + dx, -46.5 + dy, 1.25);
  disc(O, 10, -46.5, 0.45);
  poly(H, lancetPts(10, -66, 2.6, 5));
  // Rose window: spokes and a hub laid back into a round hole.
  disc(H, 34, -17, 5.4);
  ring(O, 34, -17, 4.2, 4.8);
  for (let k = 0; k < 8; k++) {
    const a = (k * TAU) / 8;
    taper(O, [34, -17, 34 + Math.cos(a) * 4.5, -17 + Math.sin(a) * 4.5], 0.75, 0.75, 1);
  }
  disc(O, 34, -17, 1.4);
  poly(H, lancetPts(26, -3, 3.4, 9));
  poly(H, lancetPts(42, -3, 3.4, 9));
  return S;
}

function grove(c, it) {
  const n = 3 + (it.i % 3);
  for (let k = 0; k < n; k++) {
    const dx = (k - (n - 1) / 2) * 12 * it.s + (hash(it.i * 7 + k) - 0.5) * 6;
    const h = 20 + hash(it.i * 11 + k) * 14;
    const S = shapeOf(`grove:${it.i}:${k}`, () => buildTree(it.i * 17 + k * 3 + 1, h, {
      lean: (hash(k + it.i) - 0.5) * 0.24, depth: 3, trunk: 2.4, curl: 0.8, thorn: 0.3, spread: 0.8, bole: 0.46,
    }));
    stamp(c, S, it.x + dx, it.y + 2, it.s);
  }
}

// ------------------------------------------------------------------ mid
function buildMausoleum(variant) {
  const S = newShape();
  const p = S.solid, H = S.holes, O = S.over;
  S.hasHoles = S.hasOver = true;
  rect(p, -24, -4, 48, 5);
  rect(p, -21, -8.2, 42, 4.4);
  rect(p, -18, -32.2, 36, 24.2);
  rect(p, -21, -35.4, 42, 3.4);
  // Fine cuts: step lines, the cornice, a row of dentils, column slits, a door outline.
  rect(H, -24, -4.5, 48, 0.6);
  rect(H, -21, -8.6, 42, 0.6);
  rect(H, -21, -32.6, 42, 0.6);
  for (let x = -19.5; x < 19; x += 2.6) rect(H, x, -31.6, 1.1, 1.3);
  for (const cx of [-13, 13]) {
    rect(H, cx - 2.9, -29.6, 0.75, 21.2);
    rect(H, cx + 2.15, -29.6, 0.75, 21.2);
    rect(H, cx - 2.9, -27.6, 5.8, 0.55);
  }
  poly(H, lancetPts(0, -8, 13.8, 17));
  poly(O, lancetPts(0, -8, 12.2, 15.8));
  if (variant === 1) {
    rect(p, -17, -38.6, 34, 3.4);
    p.moveTo(-13, -38);
    p.arc(0, -38, 13, Math.PI, 0);
    p.closePath();
    rect(p, -2.2, -54.4, 4.4, 3.8);
    rect(p, -0.55, -60, 1.1, 6);
    rect(p, -2.4, -58.2, 4.8, 1.1);
    for (let x = -14; x <= 14; x += 4) disc(H, x, -37, 0.8);
    disc(H, 0, -45, 2.6);
    disc(O, 1.1, -45.8, 2.2);
    star(H, -6.5, -42.5, 1.4, 0.6, 5);
    star(H, 6.5, -42.5, 1.4, 0.6, 5);
  } else {
    poly(p, [-22.5, -35, 0, -46.8, 22.5, -35]);
    for (const k of [-1, 0, 1]) taper(p, [0, -46, k * 1.6, -49.5, k * 2.4, -51.4], 1.2, 0.2);
    taper(p, spiral(-22.5, -35.2, -2.2, 5, 0.75, 6), 1.1, 0.15);
    taper(p, spiral(22.5, -35.2, -0.95, 5, -0.75, 6), 1.1, 0.15);
    star(H, 0, -39.6, 2.9, 1.2, 5);
    rect(H, -17, -36.2, 34, 0.55);
  }
  return S;
}

function buildStone(variant, k) {
  const S = newShape();
  const p = S.solid, H = S.holes, O = S.over;
  S.hasHoles = true;
  if (variant === 2) {
    rect(p, -4.2, -3.2, 8.4, 3.6);
    poly(p, [-2.7, -3, -1.8, -17.6, 0, -21, 1.8, -17.6, 2.7, -3]);
    rect(H, -4.2, -3.6, 8.4, 0.5);
    star(H, 0, -13.5, 1.5, 0.45, 4, 0);
    poly(H, [-0.35, -9.5, 0.35, -9.5, 0.3, -5, -0.3, -5]);
  } else if (variant === 1) {
    poly(p, [-5, 1, -5, -11.5, -1.6, -11.5, 0, -14, 1.6, -11.5, 5, -11.5, 5, 1]);
    taper(p, spiral(-5, -11.3, -2.4, 3, 0.8, 5), 0.8, 0.12);
    taper(p, spiral(5, -11.3, -0.75, 3, -0.8, 5), 0.8, 0.12);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) disc(H, dx, -6.8 + dy, 0.9);
    rect(H, -3.6, -2.4, 7.2, 0.5);
  } else {
    poly(p, [-4.5, 1, -4.5, -8.6, -3.7, -11.5, -1.8, -13.1, 0, -13.5, 1.8, -13.1, 3.7, -11.5, 4.5, -8.6, 4.5, 1]);
    if (k % 2) {
      disc(H, 0, -8, 2);
      disc(O, 0.95, -8.7, 1.7);
      S.hasOver = true;
    } else {
      rect(H, -0.45, -11, 0.9, 6);
      rect(H, -2, -9.3, 4, 0.9);
    }
    rect(H, -3.2, -2.3, 6.4, 0.5);
  }
  return S;
}

function buildCross(celtic) {
  const S = newShape();
  const p = S.solid, H = S.holes;
  rect(p, -3.4, -1.8, 6.8, 2.8);
  if (celtic) {
    rect(p, -1.5, -20, 3, 19);
    rect(p, -6.2, -14.6, 12.4, 3.2);
    ring(p, 0, -13, 3.3, 4.6);
    disc(p, 0, -13, 1.9);
    S.hasHoles = true;
    disc(H, 0, -13, 0.7);
    for (let y = -9; y > -11; y -= 1.4) rect(H, -0.4, y, 0.8, 0.6);
  } else {
    rect(p, -1.3, -18.5, 2.6, 18);
    rect(p, -5.8, -13.8, 11.6, 2.6);
    for (const [x, y] of [[0, -18.8], [-6, -12.5], [6, -12.5]]) {
      disc(p, x, y, 1.2);
      const a = Math.atan2(y + 12.5, x);
      const nx = -Math.sin(a), ny = Math.cos(a);
      disc(p, x + nx * 1.3 + Math.cos(a) * -0.4, y + ny * 1.3 + Math.sin(a) * -0.4, 0.95);
      disc(p, x - nx * 1.3 + Math.cos(a) * -0.4, y - ny * 1.3 + Math.sin(a) * -0.4, 0.95);
    }
  }
  return S;
}

// ------------------------------------------------------------------ fg
function claw(p, x, y, a, len, w) {
  const hook = Math.cos(a) >= 0 ? 1 : -1;
  for (const [da, l] of [[-0.6, 0.75], [-0.05, 1], [0.5, 0.8]]) {
    taper(p, spiral(x, y, a + da, len * l * 1.3, hook * 0.28, 5), w, 0.1);
  }
}

function buildGnarl(i) {
  const S = newShape();
  const p = S.solid, H = S.holes, O = S.over;
  S.hasHoles = S.hasOver = true;
  // Twisted trunk and spread roots.
  taper(p, [0, 3, -4, -18, 1, -38, 4, -58, 0, -86], 16, 6);
  taper(p, [-3, -5, -10, -0.5, -20, 3], 7, 0.4);
  taper(p, [3, -5, 10, -0.5, 19, 3], 7, 0.4);
  taper(p, [-1, -3, -6, 1, -9, 4], 5, 1);
  taper(p, spiral(-19, 2.8, Math.PI - 0.1, 5, -0.5, 5), 1.2, 0.12);
  // Limbs: the claw hand reaching right, and the crown.
  const limbs = [
    [[2, -50, 14, -60, 24, -66, 34, -66, 44, -64, 52, -68, 58, -74], 6.6, 1.8, 7],
    [[44, -64, 52, -57, 62, -58], 2.6, 1, 5],
    [[30, -66, 36, -82, 48, -92], 3, 1.1, 6],
    [[0, -80, -8, -92, -14, -100, -26, -104], 5.2, 1.6, 6],
    [[-14, -100, -12, -114], 2.4, 0.9, 4],
    [[1, -84, 8, -96, 14, -104, 30, -112, 38, -124], 5, 1.4, 7],
    [[20, -107, 28, -100, 36, -102], 2.2, 0.9, 4.5],
    [[-2, -36, -10, -42, -18, -46, -26, -44], 4.2, 1.3, 5.5],
  ];
  for (const [pts, w0, w1, cl] of limbs) {
    taper(p, pts, w0, w1);
    const n = pts.length;
    const a = Math.atan2(pts[n - 1] - pts[n - 3], pts[n - 2] - pts[n - 4]);
    claw(p, pts[n - 2], pts[n - 1], a, cl, w1);
  }
  // Hooked thorns along the big limbs.
  const thorns = [[18, -63, -1.9], [40, -65, -1.2], [50, -66, 1.9], [-10, -94, -2.2], [24, -109, -1.9], [8, -97, -0.4], [-14, -45, -2.1], [33, -76, 0.2]];
  for (const [x, y, a] of thorns) {
    const ex = x + Math.cos(a) * 3.4, ey = y + Math.sin(a) * 3.4;
    taper(p, [x, y, ex, ey, ex + Math.cos(a + 1.3) * 1.5, ey + Math.sin(a + 1.3) * 1.5], 1.3, 0.1);
  }
  // Bark: twist lines cut clean through, and a knot hole.
  taper(H, [-5, -4, -2, -12, 3, -21], 1.1, 0.2);
  taper(H, [-5, -26, -1, -33, 4, -39], 1.1, 0.2);
  taper(H, [-2.5, -60, 1.5, -66, 3, -73], 0.9, 0.2);
  taper(H, [3.5, -8, 5, -15], 0.8, 0.15);
  oval(H, -1, -47.5, 1.7, 2.8);
  // Hinge pins where the limbs are pinned to the trunk.
  disc(H, 3.2, -51.5, 1.5);
  disc(O, 3.2, -51.5, 0.6);
  disc(H, 0.5, -81, 1.35);
  disc(O, 0.5, -81, 0.55);
  void i;
  return S;
}

function buildGrass(i) {
  const S = newShape();
  const p = S.solid;
  const n = 8;
  for (let k = 0; k < n; k++) {
    const dx = (k - (n - 1) / 2) * 1.9;
    const h = 6 + hash(i * 13 + k) * 7;
    const bend = (hash(i + k * 5) - 0.45) * 7;
    const pts = [dx, 2, dx + bend * 0.2, -h * 0.5, dx + bend * 0.65, -h * 0.85, dx + bend, -h];
    taper(p, pts, 1.3, 0.14);
    if (hash(i * 3 + k * 11) < 0.3) {
      const a = Math.atan2(-h * 0.15, bend * 0.35);
      taper(p, spiral(dx + bend, -h, a, 3, bend > 0 ? 0.8 : -0.8, 5), 0.3, 0.1);
    }
  }
  // A thistle: stem, spiky leaf, bulb, crown.
  const tx = (hash(i * 7 + 1) - 0.5) * 7;
  const th = 12 + hash(i * 9 + 2) * 2.5;
  taper(p, [tx, 2, tx + 0.6, -th * 0.5, tx + 1.2, -th], 0.95, 0.65);
  const lx = tx + 0.4, ly = -th * 0.45;
  taper(p, [lx, ly, lx + 2, ly - 1.2, lx + 3.4, ly - 0.6, lx + 4.6, ly - 1.8], 1.2, 0.1);
  taper(p, [lx + 2, ly - 1.1, lx + 2.4, ly - 2.8], 0.6, 0.1);
  oval(p, tx + 1.2, -th - 1.5, 1.6, 1.9);
  for (let k = -2; k <= 2; k++) {
    const a = -Math.PI / 2 + k * 0.33;
    taper(p, [tx + 1.2, -th - 2.8, tx + 1.2 + Math.cos(a) * 3.4, -th - 2.8 + Math.sin(a) * 3.4], 0.6, 0.1, 1);
  }
  for (const sg of [-1, 1]) taper(p, [tx + 1.2, -th - 0.8, tx + 1.2 + sg * 2.3, -th + 0.2, tx + 1.2 + sg * 2.8, -th - 0.9], 0.6, 0.1);
  return S;
}

function buildLamp() {
  const S = newShape();
  const p = S.solid, H = S.holes, O = S.over;
  S.hasHoles = S.hasOver = true;
  poly(p, [-4.4, 1, 4.4, 1, 3.4, -1.2, 2.2, -2.3, 1.5, -4.6, -1.5, -4.6, -2.2, -2.3, -3.4, -1.2]);
  rect(p, -1.15, -34, 2.3, 30);
  rect(p, -1.9, -14.2, 3.8, 1.5);
  rect(p, -1.8, -30.6, 3.6, 1.3);
  rect(p, -5.6, -32.7, 11.2, 0.95);
  disc(p, -5.7, -32.2, 0.9);
  disc(p, 5.7, -32.2, 0.9);
  taper(p, spiral(1, -33.6, 0.1, 5, 0.75, 6), 0.9, 0.15);
  taper(p, spiral(-1, -33.6, Math.PI - 0.1, 5, -0.75, 6), 0.9, 0.15);
  poly(p, [-3.3, -35.6, 3.3, -35.6, 1.6, -33.8, -1.6, -33.8]);
  poly(p, [-5, -36, 5, -36, 4.2, -45, -4.2, -45]);
  poly(p, [-6.3, -44.6, 6.3, -44.6, 0, -50.6]);
  taper(p, [0, -50, 0, -53.4], 1, 0.4, 1);
  disc(p, 0, -54, 0.95);
  taper(p, spiral(-6.2, -44.8, -1.9, 2.8, -0.9, 5), 0.7, 0.12);
  taper(p, spiral(6.2, -44.8, -1.25, 2.8, 0.9, 5), 0.7, 0.12);
  // Glazing: two panes cut out, a glazing bar laid back across them.
  poly(H, [-4, -36.9, -0.55, -36.9, -0.55, -44.1, -3.35, -44.1]);
  poly(H, [0.55, -36.9, 4, -36.9, 3.35, -44.1, 0.55, -44.1]);
  rect(O, -4, -40.9, 8, 0.6);
  return S;
}

// The pane colour and glow sit on the screen behind the black cut-out, so they show
// through its glazing and bloom round it.
function flickerOf(it, t) {
  return 0.88 + 0.12 * Math.sin(t * 11 + it.i) * Math.sin(t * 7.3 + it.i * 0.7);
}

// The lamp's bloom is light on the screen, so it goes down before the hill: the graves
// and trees beside the lamp stand dark against it instead of being lit from the front.
function lampGlow(ctx, it, t) {
  const s = it.s;
  const flicker = flickerOf(it, t);
  const x = it.x, cy = it.y + 1 - 40.5 * s;
  const g = ctx.createRadialGradient(x, cy, 1, x, cy, 42 * s);
  g.addColorStop(0, `rgba(255,220,130,${0.85 * flicker})`);
  g.addColorStop(0.3, `rgba(255,180,96,${0.4 * flicker})`);
  g.addColorStop(1, 'rgba(255,160,90,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 44 * s, cy - 44 * s, 88 * s, 88 * s);
}

// The glazing's gel sits right behind the black lantern, seen through its cut panes.
function lampPanes(ctx, it, t) {
  const s = it.s;
  const x = it.x, y = it.y + 1;
  const pane = ctx.createLinearGradient(0, y - 44 * s, 0, y - 36 * s);
  pane.addColorStop(0, PANE_HI);
  pane.addColorStop(1, PANE_LO);
  ctx.fillStyle = pane;
  ctx.globalAlpha = 0.8 + 0.2 * flickerOf(it, t);
  ctx.beginPath();
  poly(ctx, [x - 5 * s, y - 36 * s, x + 5 * s, y - 36 * s, x + 4.2 * s, y - 45 * s, x - 4.2 * s, y - 45 * s]);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// Built on first use, so the module still imports where there is no Path2D (node).
const finial = () => shapeOf('finial', () => {
  const p = new Path2D();
  poly(p, [0, -6.2, 1.5, -2.6, 0.6, -1.7, 0.6, 0.4, -0.6, 0.4, -0.6, -1.7, -1.5, -2.6]);
  taper(p, spiral(0.4, -1.4, 0.35, 3, 0.95, 5), 0.6, 0.12);
  taper(p, spiral(-0.4, -1.4, Math.PI - 0.35, 3, -0.95, 5), 0.6, 0.12);
  rect(p, -1.1, 0.3, 2.2, 0.8);
  return p;
});

const postFinial = () => shapeOf('post-finial', () => {
  const p = new Path2D();
  disc(p, 0, -2.2, 1.9);
  rect(p, -1.5, -0.6, 3, 1.2);
  taper(p, [0, -3.8, 0, -7.4], 1.2, 0.15, 1);
  return p;
});

function fence(c, it, L) {
  const gateHalf = 15;
  const bars = [];
  for (let x = it.x0, k = 0; x <= it.x1 + 0.01; x += 7, k++) {
    if (it.gate != null && Math.abs(x - it.gate) < gateHalf + 2) continue;
    bars.push([x, k]);
  }
  c.beginPath();
  for (const [x, k] of bars) {
    const b = L.ridge(x);
    const post = k % 5 === 0;
    if (post) rect(c, x - 1.2, b - 22, 2.4, 23.5);
    else rect(c, x - 0.7, b - 20, 1.4, 21.5);
  }
  c.fill();
  for (const [x, k] of bars) {
    const b = L.ridge(x);
    const post = k % 5 === 0;
    c.save();
    c.translate(x, b - (post ? 22 : 20));
    c.fill(post ? postFinial() : finial());
    c.restore();
  }
  const runs = it.gate == null ? [[it.x0, it.x1]] : [[it.x0, it.gate - gateHalf], [it.gate + gateHalf, it.x1]];
  c.lineWidth = 1.3;
  c.beginPath();
  for (const [a, b] of runs) {
    for (const h of [4.5, 16]) {
      for (let x = a; x <= b + 0.01; x += 3.5) {
        const y = L.ridge(x) - h;
        x === a ? c.moveTo(x, y) : c.lineTo(x, y);
      }
    }
  }
  c.stroke();
  // Lace along the top rail: a ring in every bay, a scroll pair under it.
  c.beginPath();
  for (let i = 0; i < bars.length - 1; i++) {
    const [x, k] = bars[i];
    if (bars[i + 1][1] !== k + 1) continue;
    const mx = x + 3.5;
    const b = L.ridge(mx);
    ring(c, mx, b - 18.1, 1.0, 1.75);
  }
  c.fill();
  c.lineWidth = 0.6;
  c.beginPath();
  for (let i = 0; i < bars.length - 1; i++) {
    const [x, k] = bars[i];
    if (bars[i + 1][1] !== k + 1) continue;
    const mx = x + 3.5;
    const b = L.ridge(mx);
    c.moveTo(mx - 2.6, b - 16);
    c.quadraticCurveTo(mx - 1.2, b - 12, mx, b - 14.2);
    c.quadraticCurveTo(mx + 1.2, b - 12, mx + 2.6, b - 16);
    c.moveTo(mx - 2.6, b - 4.5);
    c.quadraticCurveTo(mx, b - 8.5, mx + 2.6, b - 4.5);
  }
  c.stroke();
  if (it.gate != null) gate(c, it.gate, L.foot(it.gate, gateHalf));
}

function gate(c, g, b) {
  c.beginPath();
  for (const sg of [-1, 1]) {
    const px = g + sg * 15;
    rect(c, px - 1.5, b - 34, 3, 35);
    rect(c, px - 2.3, b - 35.4, 4.6, 1.5);
    disc(c, px, b - 37.6, 2.2);
    taper(c, [px, b - 39.4, px, b - 44], 1.3, 0.15, 1);
  }
  c.fill();
  const archY = (x) => {
    const u = (x - g) / 13.5;
    return b - 24 - 10 * (1 - u * u);
  };
  c.lineWidth = 1.3;
  c.beginPath();
  for (const h of [2, 12, 24]) { c.moveTo(g - 13.5, b - h); c.lineTo(g + 13.5, b - h); }
  for (let x = g - 13.5; x <= g + 13.6; x += 1.5) x === g - 13.5 ? c.moveTo(x, archY(x)) : c.lineTo(x, archY(x));
  c.stroke();
  c.lineWidth = 1;
  c.beginPath();
  const gx = [];
  for (let x = g - 10.5; x <= g + 10.6; x += 3.5) gx.push(x);
  for (const x of gx) { c.moveTo(x, b - 2); c.lineTo(x, archY(x) - 1); }
  c.stroke();
  for (const x of gx) {
    c.save();
    c.translate(x, archY(x) - 1);
    c.scale(0.75, 0.75);
    c.fill(finial());
    c.restore();
  }
  // Scrolls in the arch, rings in the lower panel, a crescent crowning it.
  c.beginPath();
  for (const sg of [-1, 1]) {
    taper(c, spiral(g + sg * 1.5, b - 24.5, sg > 0 ? -0.2 : Math.PI + 0.2, 11, sg * -0.62, 8), 1, 0.2);
    taper(c, spiral(g + sg * 12.5, b - 24.5, sg > 0 ? Math.PI + 0.3 : -0.3, 7, sg * 0.7, 7), 0.9, 0.2);
  }
  for (let x = g - 8.75; x <= g + 8.8; x += 3.5) ring(c, x, b - 7, 0.8, 1.45);
  disc(c, g, b - 38.5, 3);
  c.fill();
  c.globalCompositeOperation = 'destination-out';
  c.beginPath();
  disc(c, g + 1.3, b - 39.4, 2.5);
  for (const y of [7, 19]) disc(c, g - 15, b - y, 0.7);
  c.fill();
  c.globalCompositeOperation = 'source-over';
  c.beginPath();
  star(c, g + 4.6, b - 42.6, 1.5, 0.6, 5);
  rect(c, g + 4.3, b - 41.2, 0.6, 2.8);
  c.fill();
}

// ------------------------------------------------------------------ fog
// Translucent paper strips, their top edges cut into billows round the puffs.
function fogStrips(ctx, band, front) {
  const strips = front
    ? [[-3, 0.9, 'rgba(255,214,186,0.24)'], [2, 0.75, 'rgba(255,230,208,0.3)']]
    : [[-3, 0.9, 'rgba(255,206,178,0.13)'], [1.5, 0.75, 'rgba(255,226,200,0.17)']];
  const bottom = front ? 242 : band.y + band.h + 3;
  for (const [dy, amp, col] of strips) {
    const top = [];
    for (let x = -40; x <= 520; x += 3) {
      let y = band.y + band.h * 0.8 + dy;
      for (const p of band.puffs) {
        const d = (x - p.x - dy * 3) / p.rx;
        if (d > -1 && d < 1) y = Math.min(y, band.y + band.h * 0.8 + dy - (p.ry * amp + p.y - band.y - band.h * 0.8 + 2) * (1 - d * d) ** 1.3);
      }
      top.push(x, y);
    }
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-40, bottom);
    for (let k = 0; k < top.length; k += 2) ctx.lineTo(top[k], top[k + 1]);
    ctx.lineTo(520, bottom);
    if (!front) {
      for (let x = 520; x >= -40; x -= 6) ctx.lineTo(x, bottom + 1.2 * Math.sin(x * 0.19 + dy + band.puffs.length));
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,238,214,0.34)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let k = 0; k < top.length; k += 2) (k ? ctx.lineTo(top[k], top[k + 1]) : ctx.moveTo(top[k], top[k + 1]));
    ctx.stroke();
  }
}

// ------------------------------------------------------------------ layers
function paintLayer(ctx, P, f, name) {
  const L = f.layers[name];
  const c = beginPlate(P, name);
  for (const it of L.items) if (it.kind === 'abbey') stamp(c, shapeOf('abbey', buildAbbey), it.x, it.y, it.s);
  ridge(c, L, name === 'bg'
    ? { step: 2.5, h0: 0.6, h1: 2.2, w: 0.45, seed: 3 }
    : name === 'mid'
      ? { step: 2.5, h0: 0.8, h1: 3.2, w: 0.5, seed: 7 }
      : { step: 2.5, h0: 1.4, h1: 4.6, w: 0.6, seed: 11 });
  for (const it of L.items) {
    switch (it.kind) {
      case 'grove': grove(c, it); break;
      case 'mausoleum': stamp(c, shapeOf(`maus:${it.variant}`, () => buildMausoleum(it.variant)), it.x, it.y, it.s); break;
      case 'tree': stamp(c, shapeOf(`tree:${it.i}`, () => buildTree(40 + it.i * 3, 52, {
        lean: it.variant === 1 ? -0.34 : 0.06, depth: 4, trunk: 4.2, curl: 0.7, thorn: 0.5, spread: 0.95,
      })), it.x, it.y + 1, it.s); break;
      case 'stone': stamp(c, shapeOf(`stone:${it.variant}:${it.i % 4}`, () => buildStone(it.variant, it.i)),
        it.x, it.y + 1, it.s, (hash(it.i * 3.3) - 0.5) * 0.26); break;
      case 'cross': stamp(c, shapeOf(`cross:${it.i % 2}`, () => buildCross(it.i % 2 === 0)),
        it.x, it.y + 1, it.s, (hash(it.i * 5.1) - 0.5) * 0.18); break;
      case 'gnarl': stamp(c, shapeOf(`gnarl:${it.i}`, () => buildGnarl(it.i)), it.x, it.y + 2, it.s, 0, it.variant === 1 ? -1 : 1); break;
      case 'fence': fence(c, it, L); break;
      case 'lamp': stamp(c, shapeOf('lamp', buildLamp), it.x, it.y + 1, it.s); break;
      case 'grass': stamp(c, shapeOf(`grass:${it.i}`, () => buildGrass(it.i)), it.x, it.y + 1, it.s); break;
      default: break;
    }
  }
  if (name === 'fg') {
    // The low light floods the foot of the near bank: its silhouettes melt into the
    // glow over the last few px above the lane instead of standing on a black shelf.
    const g = c.createLinearGradient(0, 220, 0, 233);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.9)');
    c.globalCompositeOperation = 'destination-out';
    c.fillStyle = g;
    c.fillRect(PX0, 220, PW, 20);
    c.globalCompositeOperation = 'source-over';
  }
  endPlate(ctx, P, name);
}

function plateScale(ctx) {
  const m = ctx.getTransform();
  const s = Math.max(Math.hypot(m.a, m.b), Math.hypot(m.c, m.d));
  return Math.min(4, Math.max(1, Math.round(s * 100) / 100));
}

export const STYLE = {
  id: 'puppet',
  name: 'SHADOW PUPPETRY',
  note: 'Reiniger-style cut-paper silhouettes with pierced tracery, hooked thorns and scrollwork, laid over '
    + 'glowing teal-to-amber paper. Stacked screens give the depth: the far ridge a hazy rose cut-out, only the '
    + 'near bank true black, lit from low behind so the lane reads against a glow.',
  paint(ctx, f) {
    const scale = plateScale(ctx);
    const P = getPlate(scale);
    sky(ctx, f, scale);
    paintLayer(ctx, P, f, 'bg');
    for (const it of f.layers.fg.items) if (it.kind === 'lamp') lampGlow(ctx, it, f.t);
    paintLayer(ctx, P, f, 'mid');
    fogStrips(ctx, f.fog[0], false);
    for (const it of f.layers.fg.items) if (it.kind === 'lamp') lampPanes(ctx, it, f.t);
    paintLayer(ctx, P, f, 'fg');
    fogStrips(ctx, f.fog[1], true);
  },
};
