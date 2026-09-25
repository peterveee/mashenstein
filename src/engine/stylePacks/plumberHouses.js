// PLUMBER PANIC — THE HOUSES ON THE NEAR HILLS. Shipped 24 Sep 2026 from the plumber
// house bake-off (src/dev/plumber-house-candidates.js, cards B, C, E and F): Peter,
// "i like b c e and f for the houses in the plumbers levels".
//
//   rose  B · rose cottage: whitewash under a deep thatch, roses round the door;
//             chimney smoke and a cabbage white at the roses
//   farm  C · stone farmhouse under slate; a lamp going room to room upstairs,
//             smoke, and washing snapping on the line
//   hut   E · shepherd's hut on iron wheels; lamplight in the stable door,
//             stovepipe smoke, a lamb grazing
//   pink  F · pink-washed cottage behind a picket fence; the gate swings, a
//             Labrador wags outside it, two hens peck, sunflowers nod
//
// Each is a whole vignette — the house AND its garden — drawn in the barn's finish
// (plumberLandmarks.js): one baked cut-paper body, and only what moves drawn live.
// Painters work in local units with the vignette's foot centre at (0, 0), placed at
// scale 1 on the near ridge's face where the old house sat (stylePacks/index.js owns
// placement, which house goes where, and the bake cache; this file owns the art).
//
// One change from the bake-off: the pink cottage's picket runs are baked into its body
// (only the gate and its posts are live). Nothing live overlaps them, so it reads the same.
import { paperTextureSource, PAPER_PATTERN_SCALE } from '../paper-material.js';

const TAU = Math.PI * 2;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (v) => { const k = clamp01(v); return k * k * (3 - 2 * k); };
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ------------------------------------------------------------ the landmarks' finish
// A copy of plumberLandmarks.js's private cut()/tone() so the houses wear the barn's
// finish to the pixel (that module does not export them). With the paper finish off a
// sheet is a flat fill, as there.
let PAPER = true;
function withFinish(paper, fn) {
  const prev = PAPER;
  PAPER = paper !== false;
  try { fn(); } finally { PAPER = prev; }
}
const grainCache = new WeakMap();
function grain(ctx) {
  if (!PAPER) return null;
  let p = grainCache.get(ctx);
  if (p === undefined) {
    const src = paperTextureSource('cardstockClear');
    p = src && typeof ctx.createPattern === 'function' ? ctx.createPattern(src, 'repeat') || null : null;
    if (p && typeof p.setTransform === 'function' && typeof DOMMatrix === 'function') {
      p.setTransform(new DOMMatrix().scale(PAPER_PATTERN_SCALE));
    }
    grainCache.set(ctx, p);
  }
  return p;
}
const RIM = 'rgba(255,255,255,0.24)';
function pathOf(fn) { const p = new Path2D(); fn(p); return p; }
function cut(ctx, fn, fill, o = {}) {
  const p = typeof fn === 'function' ? pathOf(fn) : fn;
  if (!PAPER) { ctx.fillStyle = fill; ctx.fill(p); return p; }
  const lift = o.lift ?? 1;
  ctx.save();
  if (lift > 0) {
    const r = -(o.rot || 0), cs = Math.cos(r), sn = Math.sin(r), fx = o.fx || 1;
    const off = (ox, oy) => [(ox * fx * cs - oy * sn) * lift, (ox * fx * sn + oy * cs) * lift];
    const [dx, dy] = off(1, 2);
    const [cx, cy] = off(0.35, 0.75);
    ctx.fillStyle = o.deepColor || 'rgba(15,23,36,0.055)';
    ctx.translate(dx, dy); ctx.fill(p);
    ctx.fillStyle = 'rgba(0,0,0,0.018)';
    ctx.translate(cx - dx, cy - dy); ctx.fill(p);
    ctx.translate(-cx, -cy);
  }
  if (o.rimUnder && o.rim !== false) {
    ctx.strokeStyle = o.rimColor || RIM;
    ctx.lineWidth = 2 * (typeof o.rim === 'number' ? o.rim : 1.15);
    ctx.lineJoin = 'round';
    ctx.stroke(p);
  }
  ctx.fillStyle = fill;
  ctx.fill(p);
  const pat = o.grain === false ? null : grain(ctx);
  if (pat) { ctx.globalAlpha *= o.grainAlpha ?? 1; ctx.fillStyle = pat; ctx.fill(p); }
  ctx.restore();
  if (o.rim !== false && !o.rimUnder) {
    ctx.save();
    ctx.strokeStyle = o.rimColor || RIM;
    ctx.lineWidth = typeof o.rim === 'number' ? o.rim : 1.15;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.stroke(p);
    ctx.restore();
  }
  return p;
}
function tone(ctx, parent, fn, fill, grained = true) {
  const p = typeof fn === 'function' ? pathOf(fn) : fn;
  ctx.save();
  ctx.clip(parent);
  ctx.fillStyle = fill;
  ctx.fill(p);
  const pat = grained ? grain(ctx) : null;
  if (pat) { ctx.fillStyle = pat; ctx.fill(p); }
  ctx.restore();
}
function line(ctx, color, width, fn) {
  ctx.beginPath(); fn(ctx);
  ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.stroke();
}
// A line clipped inside a sheet (texture: courses, strands, planks).
function inked(ctx, parent, color, width, fn) {
  ctx.save(); ctx.clip(parent); line(ctx, color, width, fn); ctx.restore();
}
function flat(ctx, fill, fn) { ctx.beginPath(); fn(ctx); ctx.fillStyle = fill; ctx.fill(); }
function dot(ctx, x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.05, r), 0, TAU); ctx.fillStyle = fill; ctx.fill(); }

// ------------------------------------------------------------ shared pieces
const HILL = '#48a050';
const G = {
  lawn: '#5aae5b', lawnShade: '#4d9f52', tuft: '#3f8a47', trim: '#efe7d6', pane: '#5d6a68',
  lit: '#f1cf7e', litDeep: '#e0b25e', smoke: '#f2f1ea', smokeShade: '#dcdcd4', brass: '#d9b35a',
  leaf: '#4f8650', leafLight: '#6d9c55', stone: '#c9bfae', stoneShade: '#aea38f', shadow: 'rgba(28,64,30,0.22)',
};
// The garden plot the house stands in: a low lighter-green sheet on the hill's face.
function lawn(ctx, x0, x1, fill = G.lawn) {
  const p = cut(ctx, (c) => {
    c.moveTo(x0, 3.4);
    c.bezierCurveTo(x0 + 1.5, 0, x0 + 4.5, -1, x0 + 8, -1);
    c.lineTo(x1 - 8, -1);
    c.bezierCurveTo(x1 - 4.5, -1, x1 - 1.5, 0, x1, 3.4);
    c.closePath();
  }, fill, { lift: 0.6, rim: 0.6 });
  tone(ctx, p, (c) => c.rect(x0, 1.6, x1 - x0, 3), G.lawnShade);
  return p;
}
function tufts(ctx, pts, color = G.tuft) {
  line(ctx, color, 0.35, (c) => {
    for (const [x, y] of pts) { c.moveTo(x - 0.6, y); c.lineTo(x - 0.9, y - 1.1); c.moveTo(x, y); c.lineTo(x + 0.1, y - 1.4); c.moveTo(x + 0.6, y); c.lineTo(x + 1, y - 1); }
  });
}
// A window: a pane cut into the wall with a painted frame and glazing bars.
function casement(ctx, x, y, w, h, { frame = G.trim, pane = G.pane, bars = 'cross', fw = 0.5, sill = true } = {}) {
  const p = cut(ctx, (c) => c.rect(x, y, w, h), pane, { lift: 0.25, rim: false });
  tone(ctx, p, (c) => { c.moveTo(x, y); c.lineTo(x + w * 0.55, y); c.lineTo(x, y + h * 0.6); c.closePath(); }, 'rgba(255,255,255,0.08)', false);
  line(ctx, frame, fw, (c) => {
    c.rect(x, y, w, h);
    if (bars === 'cross') { c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y + h); c.moveTo(x, y + h / 2); c.lineTo(x + w, y + h / 2); }
    if (bars === 'mullion') { c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y + h); }
  });
  if (bars === 'leaded') {
    inked(ctx, p, 'rgba(40,44,44,0.55)', 0.22, (c) => {
      for (let k = -h; k < w + h; k += 1.1) { c.moveTo(x + k, y); c.lineTo(x + k + h, y + h); c.moveTo(x + k, y + h); c.lineTo(x + k + h, y); }
    });
    line(ctx, frame, fw, (c) => { c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y + h); });
  }
  if (sill) cut(ctx, (c) => c.rect(x - 0.5, y + h, w + 1, 0.7), frame, { lift: 0.3, rim: false });
  return p;
}
// Smoke from a chimney pot at (x, y): paper puffs that rise, swell, lean downwind and fade.
function smoke(ctx, t, x, y, { n = 5, period = 5.2, rise = 17, drift = 9, r0 = 0.9, r1 = 3, seed = 0 } = {}) {
  for (let i = 0; i < n; i++) {
    const u = ((t / period + i / n + seed) % 1 + 1) % 1;
    const a = smooth(u / 0.1) * (1 - smooth((u - 0.4) / 0.6));
    if (a <= 0.02) continue;
    const px = x + drift * u * u + Math.sin(t * 1.3 + i * 2.1) * 0.7 * u;
    const py = y - rise * u;
    const r = lerp(r0, r1, Math.sqrt(u));
    ctx.save();
    ctx.globalAlpha *= a * 0.92;
    const puff = cut(ctx, (c) => {
      c.arc(px, py, r, 0, TAU);
      c.moveTo(px + r * 1.35, py + r * 0.3); c.arc(px + r * 0.7, py + r * 0.3, r * 0.65, 0, TAU);
    }, G.smoke, { lift: 0.5, rim: 0.5, rimUnder: true });
    tone(ctx, puff, (c) => c.ellipse(px + r * 0.4, py + r * 0.7, r * 1.2, r * 0.55, 0, 0, TAU), G.smokeShade);
    ctx.restore();
  }
}
// The barn's hen, for the yards that keep hens. (x, y) is its feet; peck 0..1.
function hen(ctx, x, y, s, dir, peck, brown) {
  const P = { hen: '#f3eee4', henShade: '#d9d1c2', henBrown: '#b87a4a', henBrownShade: '#98603a', comb: '#d8453a', beak: '#e8a33c' };
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * dir, s);
  const o = { fx: dir };
  flat(ctx, 'rgba(28,64,30,0.2)', (c) => c.ellipse(0, 0.2, 3, 0.6, 0, 0, TAU));
  line(ctx, P.beak, 0.5, (c) => { c.moveTo(-0.4, -1.9); c.lineTo(-0.6, 0); c.moveTo(0.7, -1.9); c.lineTo(0.9, 0); });
  const tilt = peck * 0.9;
  ctx.translate(0, -2);
  ctx.rotate(tilt);
  const col = brown ? P.henBrown : P.hen, sh = brown ? P.henBrownShade : P.henShade;
  const body = cut(ctx, (c) => { c.moveTo(-3.2, -1.6); c.quadraticCurveTo(-3.6, 1.6, 0, 1.6); c.quadraticCurveTo(3, 1.6, 3, -0.8); c.quadraticCurveTo(2.6, -2.6, 1.6, -3); c.quadraticCurveTo(-0.5, -1.6, -1.8, -2); c.lineTo(-3.4, -4.3); c.closePath(); }, col, { ...o, rot: tilt, lift: 0.4, rim: 0.5 });
  tone(ctx, body, (c) => c.ellipse(-0.4, 1.2, 3, 1.1, 0, 0, TAU), sh);
  cut(ctx, (c) => c.arc(2.3, -3.6, 1.2, 0, TAU), col, { ...o, rot: tilt, lift: 0.3, rim: 0.4 });
  flat(ctx, P.comb, (c) => { c.arc(2, -4.8, 0.45, 0, TAU); c.moveTo(3.05, -4.9); c.arc(2.6, -4.9, 0.45, 0, TAU); c.moveTo(3.4, -4.6); c.arc(3, -4.6, 0.4, 0, TAU); });
  flat(ctx, P.comb, (c) => c.ellipse(3, -2.7, 0.35, 0.55, 0, 0, TAU));
  flat(ctx, P.beak, (c) => { c.moveTo(3.3, -3.9); c.lineTo(4.3, -3.5); c.lineTo(3.3, -3.2); c.closePath(); });
  dot(ctx, 2.6, -3.9, 0.25, '#1a1410');
  ctx.restore();
}
const peckOf = (t, rate, seed) => { const p = (t * rate + seed) % 1; return p < 0.22 ? Math.sin(Math.PI * p / 0.22) : 0; };
// ====================================================================== B — rose cottage
const ROSE = {
  wall: '#f0e9d8', wallShade: '#d9cfb5', thatch: '#d6b064', thatchShade: '#b98f46', thatchDark: '#98712f',
  ridge: '#c79c50', strand: 'rgba(122,88,36,0.30)', brick: '#b0654f', brickShade: '#8f4f3e', pot: '#9a5238',
  door: '#5f7d5a', doorShade: '#4c6849', rose: '#d65d6c', rosePale: '#f0a6b0', holly: '#dc93b4', hollyDeep: '#b8628c',
};
const ROSE_ARCH = (() => {
  const pts = [];
  for (let k = 0; k <= 10; k++) { const a = Math.PI + (Math.PI * k) / 10; pts.push([5.2 + Math.cos(a) * 3.7, -6.2 + Math.sin(a) * 3.5, 1.2 + hash(k) * 0.5]); }
  for (let k = 0; k < 4; k++) { pts.push([1.3 + hash(k + 20) * 0.5, -1 - k * 1.5, 1.2 + hash(k + 30) * 0.4]); pts.push([9 + hash(k + 40) * 0.5, -1 - k * 1.5, 1.2 + hash(k + 50) * 0.4]); }
  return pts;
})();
function roseBody(ctx) {
  const P = ROSE;
  lawn(ctx, -24, 23);
  // A flagstone path from the door.
  flat(ctx, G.stone, (c) => { c.moveTo(3.2, 0); c.lineTo(7.2, 0); c.lineTo(8.6, 3.4); c.lineTo(2.2, 3.4); c.closePath(); });
  line(ctx, G.stoneShade, 0.3, (c) => { c.moveTo(2.7, 1.6); c.lineTo(7.9, 1.6); c.moveTo(5.3, 0); c.lineTo(5.5, 1.6); c.moveTo(4.4, 1.6); c.lineTo(4.2, 3.4); c.moveTo(6.6, 1.6); c.lineTo(7, 3.4); });
  // The chimney stack at the right end, behind the thatch.
  const ch = cut(ctx, (c) => c.rect(9, -34, 3.8, 12), P.brick, { lift: 0.8, rim: 0.6 });
  tone(ctx, ch, (c) => c.rect(11.3, -36, 2, 16), P.brickShade);
  inked(ctx, ch, 'rgba(80,36,28,0.35)', 0.3, (c) => { for (let y = -32.4; y < -24; y += 1.6) { c.moveTo(9, y); c.lineTo(12.8, y); } });
  cut(ctx, (c) => c.rect(8.5, -35, 4.8, 1.3), P.brickShade, { lift: 0.3, rim: 0.4 });
  cut(ctx, (c) => c.rect(10, -36.8, 1.8, 1.9), P.pot, { lift: 0.3, rim: 0.4 });
  // Whitewashed walls, low under the thatch.
  const wall = cut(ctx, (c) => c.rect(-15, -17, 30, 17), P.wall, { lift: 1.1 });
  tone(ctx, wall, (c) => c.rect(-15, -11.6, 30, 1.8), P.wallShade);
  tone(ctx, wall, (c) => c.rect(-15, -0.9, 30, 0.9), P.wallShade);
  // The thatch: a hipped hood with a rolled eave and an eyebrow over the attic window.
  const thatchPath = (c) => {
    c.moveTo(-18.5, -10.2);
    c.bezierCurveTo(-18.8, -17, -14, -26.6, -8, -28);
    c.lineTo(8, -28);
    c.bezierCurveTo(14, -26.6, 18.8, -17, 18.5, -10.2);
    c.lineTo(2.2, -10.2);
    c.bezierCurveTo(0.8, -10.2, 0.4, -17, -3, -17);
    c.bezierCurveTo(-6.4, -17, -6.8, -10.2, -8.2, -10.2);
    c.closePath();
  };
  // The attic window under the eyebrow goes in first, so the thatch frames it.
  casement(ctx, -4.6, -14.2, 3.2, 2.8, { bars: 'leaded', sill: false, fw: 0.45 });
  const th = cut(ctx, thatchPath, P.thatch, { lift: 1.3 });
  tone(ctx, th, (c) => { c.moveTo(8, -28.5); c.bezierCurveTo(14, -26.6, 18.8, -17, 18.5, -10); c.lineTo(12.2, -10); c.bezierCurveTo(12.8, -17, 11.4, -24, 8, -28.5); c.closePath(); }, P.thatchShade);
  // Strands raked down from the ridge.
  inked(ctx, th, P.strand, 0.3, (c) => {
    for (let k = -18; k <= 18; k += 1.15) { const top = k * 0.45; c.moveTo(top, -27.5); c.lineTo(k * 1.02, -10); }
  });
  // The rolled eave: a darker lip along the bottom edge of the hood.
  inked(ctx, th, P.thatchDark, 1.1, (c) => {
    c.moveTo(-18.5, -10.6); c.lineTo(-8.2, -10.6);
    c.bezierCurveTo(-6.8, -10.6, -6.4, -17.4, -3, -17.4); c.bezierCurveTo(0.4, -17.4, 0.8, -10.6, 2.2, -10.6);
    c.lineTo(18.5, -10.6);
  });
  // The ridge: a scalloped cap pinned with crossed spars.
  const ridge = cut(ctx, (c) => {
    c.moveTo(-9.6, -28.4); c.lineTo(9.6, -28.4); c.lineTo(10.6, -25.4);
    for (let x = 10.6; x >= -10.6; x -= 1.5) c.quadraticCurveTo(x - 0.75, -23.6, x - 1.5, -25.4);
    c.closePath();
  }, P.ridge, { lift: 0.6, rim: 0.5 });
  inked(ctx, ridge, 'rgba(110,78,32,0.6)', 0.28, (c) => {
    c.moveTo(-10, -27.3); c.lineTo(10, -27.3); c.moveTo(-10, -26.1); c.lineTo(10, -26.1);
    for (let x = -9; x <= 9; x += 1.8) { c.moveTo(x - 0.6, -27.9); c.lineTo(x + 0.6, -25.6); c.moveTo(x + 0.6, -27.9); c.lineTo(x - 0.6, -25.6); }
  });
  // Ground-floor windows, leaded, and the sage door under its rose arch.
  casement(ctx, -12.4, -8.2, 5.2, 4.2, { bars: 'leaded' });
  casement(ctx, 10.4, -8.2, 3.6, 4.2, { bars: 'leaded' });
  const door = cut(ctx, (c) => { c.moveTo(3.1, 0); c.lineTo(3.1, -6.3); c.arc(5.2, -6.3, 2.1, Math.PI, 0); c.lineTo(7.3, 0); c.closePath(); }, P.door, { lift: 0.35, rim: 0.5 });
  tone(ctx, door, (c) => c.rect(5.6, -9, 2, 9), P.doorShade);
  inked(ctx, door, 'rgba(40,58,38,0.5)', 0.25, (c) => { c.moveTo(4.1, -7); c.lineTo(4.1, 0); c.moveTo(6.3, -7); c.lineTo(6.3, 0); });
  dot(ctx, 6.6, -3.6, 0.35, G.brass);
  // The climbing rose round the door: one leafy sheet of lobes, the flowers pinned on.
  const bush = cut(ctx, (c) => { for (const [x, y, r] of ROSE_ARCH) { c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU); } }, G.leaf, { lift: 0.6, rim: 0.55, rimUnder: true });
  tone(ctx, bush, (c) => { for (const [x, y, r] of ROSE_ARCH) { c.moveTo(x - 0.2 + r * 0.6, y - 0.4); c.arc(x - 0.2, y - 0.4, r * 0.6, 0, TAU); } }, G.leafLight);
  ROSE_ARCH.forEach(([x, y], k) => {
    if (k % 2) return;
    dot(ctx, x + 0.3, y + 0.2, 0.62, k % 4 ? P.rose : P.rosePale);
    dot(ctx, x + 0.15, y + 0.05, 0.25, 'rgba(255,255,255,0.35)');
  });
  // Hollyhocks against the left gable, and a lavender edge along the front.
  for (const [hx, top, col] of [[-17.6, -14.5, P.holly], [-16.2, -12, P.hollyDeep], [-19.2, -10.5, P.holly]]) {
    line(ctx, G.leaf, 0.55, (c) => { c.moveTo(hx, 0.4); c.lineTo(hx + 0.2, top); });
    cut(ctx, (c) => { c.ellipse(hx - 0.5, -3, 1.1, 0.6, -0.5, 0, TAU); c.moveTo(hx + 1.8, -5.2); c.ellipse(hx + 0.8, -5.2, 1, 0.55, 0.5, 0, TAU); }, G.leafLight, { lift: 0.3, rim: false });
    for (let y = top; y < -5; y += 1.35) cut(ctx, (c) => c.arc(hx + 0.2 + ((y * 7) % 2 ? 0.2 : -0.2), y, 0.78 - (y - top) * -0.0, 0, TAU), col, { lift: 0.3, rim: 0.3 });
  }
  for (const lx of [-12.2, -8.4, -1.4]) {
    const clump = cut(ctx, (c) => { c.moveTo(lx - 1.7, 0.3); c.quadraticCurveTo(lx, -2.2, lx + 1.7, 0.3); c.closePath(); }, '#7d9a6a', { lift: 0.4, rim: 0.4 });
    void clump;
    line(ctx, '#8e7fc2', 0.5, (c) => { for (let k = -2; k <= 2; k++) { c.moveTo(lx + k * 0.55, -0.6); c.lineTo(lx + k * 0.95, -2.6 + Math.abs(k) * 0.35); } });
  }
  tufts(ctx, [[-21, 2.6], [15.5, 1.5], [19.5, 2.8], [11.8, 2.4]]);
}
function roseLive(ctx, t) {
  smoke(ctx, t, 10.9, -37.5, { seed: 0.1 });
  // A cabbage white working the roses.
  const bx = 5.2 + Math.sin(t * 0.8) * 7.5 + Math.sin(t * 2.3) * 1.2;
  const by = -11 + Math.sin(t * 1.4) * 2.6 + Math.sin(t * 5.1) * 0.5;
  const f = Math.abs(Math.sin(t * 15));
  flat(ctx, '#fbf8ef', (c) => { c.ellipse(bx - 0.55, by - 0.2, 0.7, 0.9 * f + 0.15, 0.4, 0, TAU); c.ellipse(bx + 0.55, by - 0.2, 0.7, 0.9 * f + 0.15, -0.4, 0, TAU); });
  dot(ctx, bx, by, 0.25, '#3a3430');
}

// ====================================================================== C — stone farmhouse
const FARM = {
  stone: '#c2b8a3', stoneShade: '#a69a83', quoin: '#ddd4c0', course: 'rgba(92,80,60,0.32)',
  slate: '#5f6b74', slateShade: '#4c5760', slateLine: 'rgba(28,36,42,0.4)', ridge: '#4a5359',
  door: '#4f6a55', doorShade: '#3f5745', post: '#8e7458', postShade: '#6f5a44', line: '#6f6a64',
  sheet: '#f5f1e7', sheetShade: '#dcd6c7', shirt: '#8fb3d6', shirtShade: '#6f93b8', denim: '#6c7ea5',
  denimShade: '#56678b', towel: '#f0e6d4', towelShade: '#d8ccb6', stripe: '#c9564c', sock: '#c9564c',
};
const FH = { x0: -24, x1: -1, top: -21.5 };
function farmBody(ctx) {
  const P = FARM;
  lawn(ctx, -28, 25);
  // Two gable-end chimneys, drawn first so the roof sits over their feet.
  for (const cx of [FH.x0 + 1.5, FH.x1 - 4.5]) {
    const ch = cut(ctx, (c) => c.rect(cx, -35.5, 3.2, 8), P.stone, { lift: 0.8, rim: 0.6 });
    tone(ctx, ch, (c) => c.rect(cx + 2, -37, 2, 10), P.stoneShade);
    inked(ctx, ch, P.course, 0.28, (c) => { for (let y = -34; y < -28; y += 1.5) { c.moveTo(cx, y); c.lineTo(cx + 3.2, y); } });
    cut(ctx, (c) => c.rect(cx - 0.4, -36.3, 4, 1.1), P.stoneShade, { lift: 0.3, rim: 0.4 });
    cut(ctx, (c) => { c.rect(cx + 0.3, -37.8, 1.1, 1.6); c.rect(cx + 1.8, -37.6, 1.1, 1.4); }, '#9a5238', { lift: 0.3, rim: 0.35 });
  }
  // Stone walls, two storeys, with dressed quoins and random coursing.
  const wall = cut(ctx, (c) => c.rect(FH.x0, FH.top, FH.x1 - FH.x0, -FH.top), P.stone, { lift: 1.2 });
  tone(ctx, wall, (c) => c.rect(FH.x1 - 5.5, FH.top, 6, 23), P.stoneShade);
  tone(ctx, wall, (c) => c.rect(FH.x0, FH.top, 30, 1.6), P.stoneShade);
  inked(ctx, wall, P.course, 0.28, (c) => {
    let row = 0;
    for (let y = FH.top + 2; y < 0; y += 1.9, row++) {
      c.moveTo(FH.x0, y); c.lineTo(FH.x1, y);
      for (let x = FH.x0 + 1 + hash(row) * 2.4; x < FH.x1; x += 2.2 + hash(row * 7 + x) * 1.8) { c.moveTo(x, y); c.lineTo(x, y + 1.9); }
    }
  });
  for (let k = 0; k < 11; k++) {
    const y = FH.top + 0.2 + k * 1.95, wide = k % 2 ? 1.4 : 2.4;
    tone(ctx, wall, (c) => { c.rect(FH.x0, y, wide, 1.75); c.rect(FH.x1 - wide, y, wide, 1.75); }, P.quoin);
  }
  // Slate roof: the front pitch between the chimneys, laid in courses.
  const roof = cut(ctx, (c) => { c.moveTo(FH.x0 - 1, FH.top + 0.4); c.lineTo(FH.x0 + 0.6, -30.2); c.lineTo(FH.x1 - 0.6, -30.2); c.lineTo(FH.x1 + 1, FH.top + 0.4); c.closePath(); }, P.slate, { lift: 1 });
  tone(ctx, roof, (c) => c.rect(FH.x1 - 6, -32, 8, 12), P.slateShade);
  tone(ctx, roof, (c) => c.rect(FH.x0 - 2, FH.top - 0.8, 30, 1.2), P.slateShade);
  inked(ctx, roof, P.slateLine, 0.3, (c) => {
    let row = 0;
    for (let y = -28.8; y < FH.top; y += 1.45, row++) {
      c.moveTo(FH.x0 - 2, y); c.lineTo(FH.x1 + 2, y);
      for (let x = FH.x0 + (row % 2 ? 0.3 : 1.3); x < FH.x1; x += 2) { c.moveTo(x, y); c.lineTo(x, y + 1.45); }
    }
  });
  cut(ctx, (c) => c.rect(FH.x0 + 0.2, -31, FH.x1 - FH.x0 - 0.4, 1.2), P.ridge, { lift: 0.4, rim: 0.5 });
  // Windows: two up, two down lit warm, and a small one over the porch.
  for (const wx of [FH.x0 + 3, FH.x1 - 7.2]) {
    casement(ctx, wx, -18.6, 4, 4.6, { bars: 'cross' });
    const lower = casement(ctx, wx, -10.2, 4.2, 5, { bars: 'cross', pane: G.lit });
    tone(ctx, lower, (c) => c.rect(wx, -10.2, 0.9, 5), '#c98f5b');
    tone(ctx, lower, (c) => c.rect(wx + 3.3, -10.2, 0.9, 5), '#c98f5b');
    tone(ctx, lower, (c) => c.rect(wx, -10.2, 4.2, 0.7), G.litDeep, false);
  }
  casement(ctx, -14.1, -18.2, 2.4, 3, { bars: 'mullion' });
  // Door with a fanlight under a slate porch hood.
  const dx = -14.8;
  const door = cut(ctx, (c) => c.rect(dx, -8.8, 4, 8.8), P.door, { lift: 0.35, rim: 0.5 });
  tone(ctx, door, (c) => c.rect(dx + 2.4, -9, 2, 9), P.doorShade);
  inked(ctx, door, 'rgba(26,40,30,0.45)', 0.25, (c) => { c.rect(dx + 0.7, -7.6, 1.1, 3); c.rect(dx + 2.2, -7.6, 1.1, 3); c.rect(dx + 0.7, -3.8, 1.1, 3); c.rect(dx + 2.2, -3.8, 1.1, 3); });
  dot(ctx, dx + 3.2, -4.2, 0.3, G.brass);
  const fan = cut(ctx, (c) => { c.moveTo(dx, -8.8); c.arc(dx + 2, -8.8, 2, Math.PI, 0); c.closePath(); }, G.lit, { lift: 0.2, rim: false });
  inked(ctx, fan, G.trim, 0.3, (c) => { for (const a of [0.25, 0.5, 0.75]) { c.moveTo(dx + 2, -8.8); c.lineTo(dx + 2 - Math.cos(a * Math.PI) * 2, -8.8 - Math.sin(a * Math.PI) * 2); } });
  const hood = cut(ctx, (c) => { c.moveTo(dx - 1.4, -10.4); c.lineTo(dx + 2, -12.6); c.lineTo(dx + 5.4, -10.4); c.closePath(); }, P.slate, { lift: 0.6, rim: 0.5 });
  tone(ctx, hood, (c) => c.rect(dx + 2, -13, 4, 3), P.slateShade);
  line(ctx, P.post, 0.45, (c) => { c.moveTo(dx - 1, -10.4); c.lineTo(dx - 1, 0); c.moveTo(dx + 5, -10.4); c.lineTo(dx + 5, 0); });
  // Stone step, a milk churn and a water butt.
  cut(ctx, (c) => c.rect(dx - 0.6, -0.8, 5.2, 1.2), G.stone, { lift: 0.3, rim: 0.4 });
  const churn = cut(ctx, (c) => { c.moveTo(-8.4, 0); c.lineTo(-8.4, -2.8); c.lineTo(-7.8, -3.4); c.lineTo(-7.8, -4.2); c.lineTo(-6.2, -4.2); c.lineTo(-6.2, -3.4); c.lineTo(-5.6, -2.8); c.lineTo(-5.6, 0); c.closePath(); }, '#b7c0c4', { lift: 0.4, rim: 0.45 });
  tone(ctx, churn, (c) => c.rect(-6.6, -5, 1.2, 5), '#939ea3');
  const butt = cut(ctx, (c) => { c.moveTo(FH.x0 - 3.2, 0); c.lineTo(FH.x0 - 3.4, -4.4); c.lineTo(FH.x0 + 0.4, -4.4); c.lineTo(FH.x0 + 0.2, 0); c.closePath(); }, '#6a7a5c', { lift: 0.5, rim: 0.5 });
  inked(ctx, butt, 'rgba(30,40,24,0.45)', 0.3, (c) => { c.moveTo(FH.x0 - 3.5, -3.3); c.lineTo(FH.x0 + 0.5, -3.3); c.moveTo(FH.x0 - 3.5, -1.1); c.lineTo(FH.x0 + 0.5, -1.1); });
  // The washing-line posts (the line and the washing are live).
  for (const px of [2.6, 22.4]) {
    const post = cut(ctx, (c) => c.rect(px - 0.55, -18, 1.1, 18.2), P.post, { lift: 0.5, rim: 0.45 });
    tone(ctx, post, (c) => c.rect(px + 0.1, -18.4, 0.6, 19), P.postShade);
    cut(ctx, (c) => c.rect(px - 1.6, -17.8, 3.2, 0.7), P.post, { lift: 0.3, rim: 0.35 });
  }
  const basket = cut(ctx, (c) => { c.moveTo(16, 0.6); c.lineTo(15.4, -1.8); c.lineTo(20.2, -1.8); c.lineTo(19.6, 0.6); c.closePath(); }, '#c9a66a', { lift: 0.4, rim: 0.45 });
  inked(ctx, basket, 'rgba(110,80,40,0.5)', 0.25, (c) => { for (let x = 15.6; x < 20.4; x += 0.8) { c.moveTo(x, -1.8); c.lineTo(x + 0.2, 0.6); } });
  tufts(ctx, [[-26, 2.8], [-2.5, 1.2], [8, 1.4], [23.5, 2.6], [12, 2.6]]);
}
const LINE_X0 = 3.2, LINE_X1 = 21.8, LINE_Y = -17.3;
const lineY = (x, t) => { const u = (x - (LINE_X0 + LINE_X1) / 2) / ((LINE_X1 - LINE_X0) / 2); return LINE_Y + (2.1 + Math.sin(t * 1.9) * 0.15) * (1 - u * u); };
// A garment pegged along the line from x0 to x1, `h` deep, blown downwind (+x). `shape`
// 'sheet' | 'shirt' | 'legs' | 'towel' | 'sock'. Folds that turn from the light take shade.
function garment(ctx, t, x0, x1, h, seed, fill, shade, shape) {
  const n = 6;
  const gust = 0.75 + 0.45 * Math.sin(t * 0.9 + seed) + 0.2 * Math.sin(t * 2.3 + seed * 2);
  const top = [], bot = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const x = lerp(x0, x1, u);
    const y = lineY(x, t);
    const ph = t * 5.2 - u * 2.6 + seed;
    const sway = gust * (1.3 + 0.55 * Math.sin(ph));
    const lift = gust * (0.8 + 0.6 * Math.sin(ph + 1.2));
    top.push([x, y]);
    bot.push([x + sway, y + h - lift + Math.sin(ph * 1.3) * 0.25]);
  }
  const outline = pathOf((c) => {
    c.moveTo(top[0][0], top[0][1]);
    for (const p of top) c.lineTo(p[0], p[1]);
    if (shape === 'legs') {
      const m = n / 2;
      c.lineTo(bot[n][0], bot[n][1]); c.lineTo(bot[m + 1][0], bot[m + 1][1]);
      c.lineTo(lerp(top[m][0], bot[m][0], 0.35), lerp(top[m][1], bot[m][1], 0.35));
      c.lineTo(bot[m - 1][0], bot[m - 1][1]); c.lineTo(bot[0][0], bot[0][1]);
    } else {
      for (let i = n; i >= 0; i--) c.lineTo(bot[i][0], bot[i][1]);
    }
    c.closePath();
    if (shape === 'shirt') {
      // Sleeves: pegged by the cuffs at the shoulders, flapping out sideways.
      const sw = gust * 0.8;
      c.moveTo(top[0][0], top[0][1] + 0.3); c.lineTo(top[0][0] - 1.6 + sw, top[0][1] + 2.6); c.lineTo(top[0][0] - 0.6 + sw, top[0][1] + 3.4); c.lineTo(top[1][0], top[1][1] + 2); c.closePath();
      c.moveTo(top[n][0], top[n][1] + 0.3); c.lineTo(top[n][0] + 1.8 + sw, top[n][1] + 2.2); c.lineTo(top[n][0] + 1.2 + sw, top[n][1] + 3.2); c.lineTo(top[n - 1][0], top[n - 1][1] + 2); c.closePath();
    }
  });
  cut(ctx, outline, fill, { lift: 0.6, rim: 0.5 });
  for (let i = 0; i < n; i++) {
    if (bot[i + 1][1] - bot[i][1] < 0.04) continue;
    tone(ctx, outline, (c) => { c.moveTo(top[i][0], top[i][1] - 1); c.lineTo(top[i + 1][0], top[i + 1][1] - 1); c.lineTo(bot[i + 1][0], bot[i + 1][1] + 1); c.lineTo(bot[i][0], bot[i][1] + 1); c.closePath(); }, shade);
  }
  if (shape === 'towel') {
    inked(ctx, outline, FARM.stripe, 0.45, (c) => { for (const k of [0.3, 0.72]) { c.moveTo(lerp(top[0][0], bot[0][0], k) - 1, lerp(top[0][1], bot[0][1], k)); for (let i = 1; i <= n; i++) c.lineTo(lerp(top[i][0], bot[i][0], k), lerp(top[i][1], bot[i][1], k)); } });
  }
  if (shape === 'shirt') line(ctx, FARM.shirtShade, 0.3, (c) => { const m = n / 2; c.moveTo(top[m][0], top[m][1] + 0.4); c.lineTo(bot[m][0], bot[m][1] - 0.2); });
  // Pegs.
  for (const i of [0, n]) cut(ctx, (c) => c.rect(top[i][0] - 0.25, top[i][1] - 0.7, 0.5, 1.3), '#b89a6a', { lift: 0.2, rim: false });
}
function farmLive(ctx, t) {
  // Someone going room to room upstairs: one window lit at a time, then neither.
  const phase = (t / 9) % 1;
  const lamp = phase < 0.4 ? 0 : phase < 0.75 ? 1 : -1;
  if (lamp >= 0) {
    const wx = lamp ? FH.x1 - 7.2 : FH.x0 + 3;
    const on = smooth((phase - (lamp ? 0.4 : 0)) / 0.03) * (1 - smooth((phase - (lamp ? 0.72 : 0.37)) / 0.03));
    ctx.save(); ctx.globalAlpha *= on;
    flat(ctx, G.lit, (c) => c.rect(wx + 0.25, -18.35, 3.5, 4.1));
    line(ctx, G.trim, 0.5, (c) => { c.rect(wx, -18.6, 4, 4.6); c.moveTo(wx + 2, -18.6); c.lineTo(wx + 2, -14); c.moveTo(wx, -16.3); c.lineTo(wx + 4, -16.3); });
    ctx.restore();
  }
  smoke(ctx, t, FH.x0 + 2.3, -38.2, { seed: 0.3, rise: 15, drift: 8 });
  // The line and the washing, snapping in the wind.
  line(ctx, FARM.line, 0.3, (c) => { c.moveTo(LINE_X0 - 0.6, -17.7); for (let x = LINE_X0; x <= LINE_X1; x += 1) c.lineTo(x, lineY(x, t)); c.lineTo(LINE_X1 + 0.6, -17.7); });
  garment(ctx, t, 3.8, 7.6, 5.6, 0.3, FARM.shirt, FARM.shirtShade, 'shirt');
  garment(ctx, t, 8.4, 14.4, 8.2, 1.7, FARM.sheet, FARM.sheetShade, 'sheet');
  garment(ctx, t, 15.1, 18.3, 7, 2.9, FARM.denim, FARM.denimShade, 'legs');
  garment(ctx, t, 19, 21.4, 4.4, 4.2, FARM.towel, FARM.towelShade, 'towel');
}
// ====================================================================== E — shepherd's hut
const HUT = {
  body: '#6f8f69', bodyShade: '#5a7856', rib: 'rgba(36,58,36,0.32)', roof: '#9aa7ab', roofShade: '#7e8c91',
  roofRib: 'rgba(52,62,68,0.45)', iron: '#3a3632', ironLight: '#5a544e', door: '#b5524a', doorShade: '#9a433c',
  step: '#b89a6a', stepShade: '#96794d', curtain: '#e6c9a0', crook: '#8e6c4c',
};
const HX = 2;   // the hut sits a little right of centre; the lamb grazes on the left
function hutBody(ctx) {
  const P = HUT;
  lawn(ctx, -25, 24);
  flat(ctx, G.shadow, (c) => c.ellipse(HX, 0.2, 13, 1.2, 0, 0, TAU));
  // The far wheels and the drawbar at the left end.
  for (const wx of [HX - 8.4, HX + 8.4]) {
    ctx.save(); ctx.globalAlpha *= 0.85;
    const w = cut(ctx, (c) => c.arc(wx + 0.9, -3.3, 3.2, 0, TAU), '#2a2622', { lift: 0.3, rim: false });
    ctx.restore();
    void w;
  }
  line(ctx, HUT.iron, 0.8, (c) => { c.moveTo(HX - 12.5, -5.6); c.lineTo(HX - 17.2, -1.4); });
  dot(ctx, HX - 17.4, -1.2, 0.7, HUT.iron);
  // The chassis and the body: corrugated sides under a curved tin roof.
  cut(ctx, (c) => c.rect(HX - 13, -6.6, 26, 1.3), HUT.iron, { lift: 0.5, rim: 0.4 });
  const body = cut(ctx, (c) => c.rect(HX - 12.2, -19, 24.4, 12.6), P.body, { lift: 1.2 });
  tone(ctx, body, (c) => c.rect(HX + 7.6, -20, 5, 14), P.bodyShade);
  tone(ctx, body, (c) => c.rect(HX - 12.2, -19, 24.4, 1.6), P.bodyShade);
  inked(ctx, body, P.rib, 0.3, (c) => { for (let x = HX - 11.6; x < HX + 12.2; x += 0.95) { c.moveTo(x, -19); c.lineTo(x, -6.4); } });
  const roof = cut(ctx, (c) => {
    c.moveTo(HX - 14, -18.2); c.quadraticCurveTo(HX, -27.6, HX + 14, -18.2);
    c.lineTo(HX + 13.6, -17.2); c.quadraticCurveTo(HX, -25.6, HX - 13.6, -17.2); c.closePath();
  }, P.roof, { lift: 1, rim: 0.7 });
  // The roof's whole curved face, seen from a little above.
  const face = cut(ctx, (c) => { c.moveTo(HX - 13.6, -17.4); c.quadraticCurveTo(HX, -26.2, HX + 13.6, -17.4); c.quadraticCurveTo(HX, -20, HX - 13.6, -17.4); c.closePath(); }, P.roof, { lift: 0, rim: false });
  tone(ctx, roof, (c) => c.rect(HX + 6, -30, 10, 14), P.roofShade);
  tone(ctx, face, (c) => c.rect(HX + 6, -30, 10, 14), P.roofShade);
  inked(ctx, face, P.roofRib, 0.3, (c) => { for (let x = HX - 12.6; x < HX + 13; x += 1.3) { c.moveTo(x, -26); c.lineTo(x, -17); } });
  // The stovepipe through the roof, with its coolie hat.
  const pipe = cut(ctx, (c) => c.rect(HX + 7.4, -30, 1.3, 8.4), HUT.iron, { lift: 0.5, rim: 0.4 });
  tone(ctx, pipe, (c) => c.rect(HX + 7.4, -30, 0.4, 9), HUT.ironLight);
  cut(ctx, (c) => { c.moveTo(HX + 6.2, -30); c.lineTo(HX + 8.05, -31.6); c.lineTo(HX + 9.9, -30); c.closePath(); }, HUT.iron, { lift: 0.4, rim: 0.4 });
  // A little four-pane window with a gingham curtain.
  const win = casement(ctx, HX - 9.2, -16, 4.6, 4, { bars: 'cross', frame: '#efe7d6' });
  tone(ctx, win, (c) => { c.moveTo(HX - 9.2, -16); c.lineTo(HX - 7.6, -16); c.quadraticCurveTo(HX - 8.2, -14, HX - 9.2, -12.4); c.closePath(); }, P.curtain, false);
  // The stable door, its top leaf swung open on a warm interior.
  const dx = HX + 1.8;
  cut(ctx, (c) => c.rect(dx, -16.6, 5, 10), '#4a3b2e', { lift: 0.3, rim: false });
  flat(ctx, '#e8c27a', (c) => c.rect(dx + 0.5, -16.1, 4, 4.6));
  flat(ctx, '#d6a45e', (c) => c.rect(dx + 0.5, -13.1, 4, 1.6));
  const lower = cut(ctx, (c) => c.rect(dx, -11.4, 5, 4.8), P.door, { lift: 0.4, rim: 0.45 });
  tone(ctx, lower, (c) => c.rect(dx + 3.4, -12, 2, 6), P.doorShade);
  inked(ctx, lower, 'rgba(90,30,26,0.4)', 0.25, (c) => { c.moveTo(dx + 1.25, -11.4); c.lineTo(dx + 1.25, -6.6); c.moveTo(dx + 2.5, -11.4); c.lineTo(dx + 2.5, -6.6); c.moveTo(dx + 3.75, -11.4); c.lineTo(dx + 3.75, -6.6); });
  // The upper leaf, open flat against the wall.
  const leaf = cut(ctx, (c) => c.rect(dx + 5.2, -16.6, 1.5, 5), P.door, { lift: 0.4, rim: 0.4 });
  tone(ctx, leaf, (c) => c.rect(dx + 6, -17, 1, 6), P.doorShade);
  // Wooden steps down from the door.
  for (let k = 0; k < 3; k++) {
    const sy = -5 + k * 1.8;
    cut(ctx, (c) => c.rect(dx - 0.2 + k * 0.5, sy, 5.4, 0.8), P.step, { lift: 0.35, rim: 0.4 });
  }
  line(ctx, P.stepShade, 0.55, (c) => { c.moveTo(dx - 0.1, -5.6); c.lineTo(dx + 1.6, 0.2); c.moveTo(dx + 5.3, -5.6); c.lineTo(dx + 6.6, 0.2); });
  // The near wheels: cast iron, six spokes.
  for (const wx of [HX - 8.4, HX + 8.4]) {
    line(ctx, HUT.iron, 0.95, (c) => c.arc(wx, -3.3, 2.9, 0, TAU));
    line(ctx, HUT.iron, 0.4, (c) => { for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + 0.2; c.moveTo(wx, -3.3); c.lineTo(wx + Math.cos(a) * 2.7, -3.3 + Math.sin(a) * 2.7); } });
    dot(ctx, wx, -3.3, 0.75, HUT.iron);
    dot(ctx, wx - 0.2, -3.5, 0.3, HUT.ironLight);
  }
  // The crook leaning on the far end, a water butt and a log pile.
  line(ctx, P.crook, 0.5, (c) => { c.moveTo(HX + 14.4, 0.2); c.lineTo(HX + 12.6, -17.4); c.arc(HX + 13.6, -17.6, 1, Math.PI, -0.2); });
  for (const [lx, ly] of [[HX + 15.2, -0.7], [HX + 17.2, -0.7], [HX + 19.2, -0.7], [HX + 16.2, -2.4], [HX + 18.2, -2.4], [HX + 17.2, -4.1]]) {
    const log = cut(ctx, (c) => c.arc(lx, ly, 0.95, 0, TAU), '#a07a52', { lift: 0.3, rim: 0.35 });
    tone(ctx, log, (c) => c.arc(lx, ly, 0.5, 0, TAU), '#d2b184');
  }
  tufts(ctx, [[-22.5, 2.6], [HX - 3.5, 1], [HX + 11.5, 1.2], [21.8, 2.6], [-12, 1.6]]);
}
// A lamb grazing on the left of the hut: head down pulling grass, then up chewing.
function hutLamb(ctx, t) {
  const F = { wool: '#f7f3ea', woolShade: '#ddd4c2', face: '#3f3731', leg: '#3b342e' };
  ctx.save();
  ctx.translate(-20.8, 1.4);
  ctx.scale(-1, 1);
  const cyc = (t * 0.33) % 1;
  const down = cyc < 0.62 ? smooth(cyc / 0.08) : 1 - smooth((cyc - 0.62) / 0.08);
  const tug = down * Math.max(0, Math.sin(t * 7)) * 0.35;
  flat(ctx, G.shadow, (c) => c.ellipse(0, 0.2, 3.4, 0.6, 0, 0, TAU));
  line(ctx, F.leg, 0.55, (c) => { c.moveTo(-1.6, -1.6); c.lineTo(-1.7, 0); c.moveTo(1.5, -1.6); c.lineTo(1.6, 0); c.moveTo(-0.8, -1.6); c.lineTo(-0.7, 0); c.moveTo(0.9, -1.6); c.lineTo(1, 0); });
  const wool = cut(ctx, (c) => {
    for (const [x, y, r] of [[-1.8, -2.6, 1.1], [-0.6, -3.2, 1.2], [0.8, -3.1, 1.15], [1.9, -2.5, 1], [-1, -2, 1.1], [0.8, -2, 1.1]]) { c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU); }
  }, F.wool, { lift: 0.4, rim: 0.5, rimUnder: true });
  tone(ctx, wool, (c) => c.rect(-3, -2.2, 6, 2), F.woolShade);
  // Tail wiggle.
  line(ctx, F.wool, 0.7, (c) => { c.moveTo(-2.8, -2.8); c.lineTo(-3.5, -2.3 + Math.sin(t * 9) * 0.3); });
  ctx.save();
  ctx.translate(2.2, -3.2);
  ctx.rotate(lerp(-0.25, 1.05, down) + tug);
  const head = cut(ctx, (c) => c.ellipse(1.4, 0, 1.3, 0.8, 0.15, 0, TAU), F.face, { lift: 0.3, rim: 0.4, rot: lerp(-0.25, 1.05, down) });
  void head;
  cut(ctx, (c) => c.ellipse(0.4, -0.6, 0.7, 0.3, -0.6, 0, TAU), F.face, { lift: 0.2, rim: 0.3 });
  dot(ctx, 1.5, -0.25, 0.18, '#f4efe6');
  ctx.restore();
  ctx.restore();
}
function hutLive(ctx, t) {
  // Lamplight flickering in the open top of the door.
  const f = 0.5 + 0.25 * Math.sin(t * 7.3) + 0.15 * Math.sin(t * 12.1 + 1) + 0.1 * Math.sin(t * 3.1);
  ctx.save();
  ctx.beginPath(); ctx.rect(HX + 2.3, -16.1, 4, 4.6); ctx.clip();
  const g = ctx.createRadialGradient(HX + 3.6, -14.2, 0, HX + 3.6, -14.2, 3.4);
  g.addColorStop(0, `rgba(255,236,170,${0.75 * f})`); g.addColorStop(1, 'rgba(255,220,140,0)');
  ctx.fillStyle = g; ctx.fillRect(HX + 2, -17, 5, 6);
  ctx.restore();
  dot(ctx, HX + 3.6, -14.4, 0.45, '#fff2c4');
  smoke(ctx, t, HX + 8.05, -32.2, { seed: 0.8, n: 5, r0: 0.6, r1: 2.3, rise: 14, drift: 7, period: 4.4 });
  hutLamb(ctx, t);
}

// ====================================================================== F — the gate, the dog and a hen
const PINK = {
  wall: '#dfab9c', wallShade: '#c69181', tile: '#c27c55', tileShade: '#a3633f', tileLine: 'rgba(110,52,26,0.35)',
  door: '#5f7fa0', doorShade: '#4d6a88', picket: '#f1eadb', picketShade: '#d3c9b4', sun: '#eab93c',
  sunDeep: '#c98f2a', sunEye: '#6b4a2a', dog: '#d7ad68', dogShade: '#b98d4c', dogLight: '#efd3a0',
};
const FENCE_Y = 3.2, GATE_X0 = -9.4, GATE_W = 5;
function pinkBody(ctx) {
  const P = PINK;
  lawn(ctx, -25, 25);
  // The path from the door to the gate.
  flat(ctx, G.stone, (c) => { c.moveTo(-8.4, 0); c.lineTo(-5.4, 0); c.lineTo(-4.6, FENCE_Y); c.lineTo(-9.2, FENCE_Y); c.closePath(); });
  line(ctx, G.stoneShade, 0.3, (c) => { c.moveTo(-8.8, 1.1); c.lineTo(-5, 1.1); c.moveTo(-9, 2.2); c.lineTo(-4.8, 2.2); });
  // Chimney at the left gable.
  const ch = cut(ctx, (c) => c.rect(-17, -31.5, 3.4, 9), '#b0654f', { lift: 0.8, rim: 0.6 });
  tone(ctx, ch, (c) => c.rect(-15, -33, 2, 12), '#8f4f3e');
  inked(ctx, ch, 'rgba(80,36,28,0.35)', 0.28, (c) => { for (let y = -30; y < -23; y += 1.5) { c.moveTo(-17, y); c.lineTo(-13.6, y); } });
  cut(ctx, (c) => c.rect(-17.4, -32.4, 4.2, 1.1), '#8f4f3e', { lift: 0.3, rim: 0.4 });
  cut(ctx, (c) => c.rect(-16.2, -34, 1.6, 1.8), '#9a5238', { lift: 0.3, rim: 0.35 });
  // Colour-washed walls.
  const wall = cut(ctx, (c) => c.rect(-19, -15.4, 24, 15.4), P.wall, { lift: 1.1 });
  tone(ctx, wall, (c) => c.rect(0.2, -16, 5, 17), P.wallShade);
  tone(ctx, wall, (c) => c.rect(-19, -15.4, 24, 1.5), P.wallShade);
  // Pantile roof with two little dormers.
  const roof = cut(ctx, (c) => { c.moveTo(-20.6, -14.8); c.lineTo(-18.8, -26.4); c.lineTo(4.8, -26.4); c.lineTo(6.6, -14.8); c.closePath(); }, P.tile, { lift: 1.1 });
  tone(ctx, roof, (c) => c.rect(0.4, -28, 8, 14), P.tileShade);
  inked(ctx, roof, P.tileLine, 0.32, (c) => {
    for (let x = -20; x < 7; x += 1.25) { c.moveTo(x, -26.4); c.lineTo(x + 0.3 * ((x + 20) / 26 - 0.5) * 2, -14.8); }
    for (let y = -24.4; y < -15; y += 2.2) { c.moveTo(-21, y); c.lineTo(7, y); }
  });
  cut(ctx, (c) => c.rect(-19.2, -27.2, 24.4, 1.2), P.tileShade, { lift: 0.4, rim: 0.5 });
  for (const dx of [-13.6, -2.4]) {
    const dor = cut(ctx, (c) => c.rect(dx - 2.6, -22.4, 5.2, 5.2), P.wall, { lift: 0.7, rim: 0.6 });
    tone(ctx, dor, (c) => c.rect(dx + 1.4, -23, 1.4, 6), P.wallShade);
    casement(ctx, dx - 1.8, -21.2, 3.6, 3.4, { bars: 'cross', sill: false, fw: 0.45 });
    const cap = cut(ctx, (c) => { c.moveTo(dx - 3.4, -21.8); c.lineTo(dx, -25); c.lineTo(dx + 3.4, -21.8); c.closePath(); }, P.tile, { lift: 0.6, rim: 0.5 });
    tone(ctx, cap, (c) => c.rect(dx, -26, 4, 5), P.tileShade);
  }
  // Windows and the blue door under a gabled porch.
  casement(ctx, -17, -10.4, 4.6, 4.8, { bars: 'cross' });
  casement(ctx, -3.6, -10.4, 4.6, 4.8, { bars: 'cross' });
  const door = cut(ctx, (c) => c.rect(-8.6, -9.2, 3.6, 9.2), P.door, { lift: 0.35, rim: 0.5 });
  tone(ctx, door, (c) => c.rect(-6.4, -10, 1.6, 10), P.doorShade);
  inked(ctx, door, 'rgba(30,44,64,0.45)', 0.25, (c) => { c.rect(-8, -8.2, 2.4, 3.4); c.rect(-8, -4.2, 2.4, 3.4); });
  dot(ctx, -5.6, -4.6, 0.3, G.brass);
  const porch = cut(ctx, (c) => { c.moveTo(-10.4, -10.2); c.lineTo(-6.8, -13.4); c.lineTo(-3.2, -10.2); c.closePath(); }, P.tile, { lift: 0.6, rim: 0.5 });
  tone(ctx, porch, (c) => c.rect(-6.8, -14, 4, 4), P.tileShade);
  line(ctx, P.picket, 0.45, (c) => { c.moveTo(-9.8, -10.2); c.lineTo(-9.8, 0); c.moveTo(-3.8, -10.2); c.lineTo(-3.8, 0); });
  // Sunflowers against the right gable (their heads are live).
  for (const [sx, top] of [[7.2, -15], [9.4, -12.6], [11.2, -16.4]]) {
    line(ctx, G.leaf, 0.55, (c) => { c.moveTo(sx, 1); c.lineTo(sx, top + 1.2); });
    cut(ctx, (c) => { c.ellipse(sx - 1.1, top + 7, 1.3, 0.6, -0.5, 0, TAU); c.moveTo(sx + 2.3, top + 4.5); c.ellipse(sx + 1.1, top + 4.5, 1.2, 0.55, 0.5, 0, TAU); }, G.leafLight, { lift: 0.3, rim: false });
  }
  // A vegetable bed: cabbages in a row.
  for (let k = 0; k < 4; k++) {
    const cx = 14 + k * 2.3;
    const cab = cut(ctx, (c) => c.arc(cx, 0.6, 0.95, 0, TAU), '#8fb46c', { lift: 0.3, rim: 0.35 });
    tone(ctx, cab, (c) => c.arc(cx - 0.3, 0.3, 0.45, 0, TAU), '#b5cf8a');
  }
  tufts(ctx, [[-23, 2.8], [21, 2.6], [1.5, 1.4]]);
  pinkPickets(ctx);
}
// The picket fence along the front, either side of the gate (baked with the body).
function pinkPickets(ctx) {
  const P = PINK;
  const pick = (c, x, h) => { c.moveTo(x - 0.45, FENCE_Y); c.lineTo(x - 0.45, FENCE_Y - h + 0.5); c.lineTo(x, FENCE_Y - h); c.lineTo(x + 0.45, FENCE_Y - h + 0.5); c.lineTo(x + 0.45, FENCE_Y); c.closePath(); };
  const runs = [[-24, GATE_X0 - 0.3], [GATE_X0 + GATE_W + 0.3, 24]];
  line(ctx, P.picketShade, 0.55, (c) => { for (const [a, b] of runs) { c.moveTo(a, FENCE_Y - 1.1); c.lineTo(b, FENCE_Y - 1.1); c.moveTo(a, FENCE_Y - 3); c.lineTo(b, FENCE_Y - 3); } });
  cut(ctx, (c) => { for (const [a, b] of runs) for (let x = a + 0.5; x <= b; x += 1.45) pick(c, x, 4.3); }, P.picket, { lift: 0.4, rim: 0.4 });
}
function sunflowerHeads(ctx, t) {
  const P = PINK;
  for (const [sx, top, seed] of [[7.2, -15, 0], [9.4, -12.6, 1.3], [11.2, -16.4, 2.1]]) {
    const nod = Math.sin(t * 1.3 + seed) * 0.35;
    const hx = sx + nod, hy = top + Math.abs(nod) * 0.2;
    const petals = cut(ctx, (c) => { for (let k = 0; k < 10; k++) { const a = k * TAU / 10; c.moveTo(hx, hy); c.ellipse(hx + Math.cos(a) * 1.05, hy + Math.sin(a) * 1.05, 0.75, 0.38, a, 0, TAU); } }, P.sun, { lift: 0.35, rim: 0.4, rimUnder: true });
    tone(ctx, petals, (c) => c.rect(hx - 2, hy + 0.3, 4, 2), P.sunDeep);
    dot(ctx, hx, hy, 0.8, P.sunEye);
  }
}
// The gate, swinging on its hinge in the breeze, and its two posts.
function pinkGate(ctx, t) {
  const P = PINK;
  // Gate posts, then the gate: open angle narrows it towards its hinge (a swing
  // inward, into the garden), with a creak's-worth of wobble.
  const cyc = (t / 7) % 1;
  const open = smooth((cyc - 0.1) / 0.25) * (1 - smooth((cyc - 0.62) / 0.2));
  const ang = open * 1.25 + Math.sin(t * 2.4) * 0.05 * open;
  const w = GATE_W * Math.cos(ang);
  const rise = Math.sin(ang) * 0.9;   // the far end, receding, reads a touch higher
  const gx = (u) => GATE_X0 + 0.2 + u * (w - 0.4);
  const gy = (u, y) => y - u * rise;
  const gate = cut(ctx, (c) => {
    for (let k = 0; k < 4; k++) { const u = (k + 0.5) / 4; const x = gx(u); const hw = 0.45 * Math.cos(ang) + 0.05; c.moveTo(x - hw, gy(u, FENCE_Y - 0.3)); c.lineTo(x - hw, gy(u, FENCE_Y - 3.8)); c.lineTo(x, gy(u, FENCE_Y - 4.3)); c.lineTo(x + hw, gy(u, FENCE_Y - 3.8)); c.lineTo(x + hw, gy(u, FENCE_Y - 0.3)); c.closePath(); }
  }, P.picket, { lift: 0.4, rim: 0.4 });
  void gate;
  line(ctx, P.picketShade, 0.55, (c) => { c.moveTo(gx(0), gy(0, FENCE_Y - 1.2)); c.lineTo(gx(1), gy(1, FENCE_Y - 1.2)); c.moveTo(gx(0), gy(0, FENCE_Y - 3)); c.lineTo(gx(1), gy(1, FENCE_Y - 3)); c.moveTo(gx(0), gy(0, FENCE_Y - 1.2)); c.lineTo(gx(1), gy(1, FENCE_Y - 3)); });
  for (const px of [GATE_X0 - 0.2, GATE_X0 + GATE_W + 0.2]) {
    const post = cut(ctx, (c) => c.rect(px - 0.6, FENCE_Y - 5, 1.2, 5.2), P.picket, { lift: 0.4, rim: 0.4 });
    tone(ctx, post, (c) => c.rect(px + 0.1, FENCE_Y - 6, 0.6, 7), P.picketShade);
    dot(ctx, px, FENCE_Y - 5.2, 0.62, P.picket);
  }
}
// A golden Labrador sitting outside the gate: tail thumping, head cocking at the hen.
function pinkDog(ctx, t) {
  const P = PINK;
  ctx.save();
  ctx.translate(-1.2, FENCE_Y + 1.2);
  const o = {};
  flat(ctx, G.shadow, (c) => c.ellipse(0.4, 0.2, 3.2, 0.6, 0, 0, TAU));
  const wag = Math.sin(t * 11) * 0.9;
  line(ctx, P.dogShade, 0.75, (c) => { c.moveTo(-1.8, -0.6); c.quadraticCurveTo(-3.2, -0.4 + wag * 0.3, -3.6, -1.6 + wag); });
  const body = cut(ctx, (c) => { c.moveTo(-2.2, 0); c.bezierCurveTo(-2.6, -2.2, -1.2, -4, 0.6, -4.4); c.lineTo(1.6, -4.2); c.bezierCurveTo(1.8, -2.6, 1.6, -1, 1.9, 0); c.closePath(); }, P.dog, { ...o, lift: 0.45, rim: 0.5 });
  tone(ctx, body, (c) => c.ellipse(-1, -1, 1.5, 1.3, 0, 0, TAU), P.dogShade);
  line(ctx, P.dog, 0.7, (c) => { c.moveTo(1.1, -2.6); c.lineTo(1.2, -0.1); });
  line(ctx, P.dogLight, 0.55, (c) => { c.moveTo(1.2, -0.5); c.lineTo(1.9, -0.2); });
  const cock = Math.sin(t * 0.7) > 0.4 ? 0.28 : 0;
  ctx.save();
  ctx.translate(1.1, -4.6);
  ctx.rotate(cock);
  const head = cut(ctx, (c) => { c.moveTo(-1.2, 0.6); c.bezierCurveTo(-1.3, -1.2, 0.4, -1.6, 1, -0.9); c.lineTo(2.5, -0.5); c.quadraticCurveTo(2.9, 0.2, 2.4, 0.6); c.lineTo(0.6, 0.9); c.closePath(); }, P.dog, { lift: 0.35, rim: 0.45, rot: cock });
  tone(ctx, head, (c) => c.rect(1.2, -0.1, 2, 1.2), P.dogLight);
  cut(ctx, (c) => { c.moveTo(-0.5, -0.9); c.quadraticCurveTo(-1.4, -0.4, -1, 1.1); c.quadraticCurveTo(-0.2, 0.6, 0.2, -0.7); c.closePath(); }, P.dogShade, { lift: 0.25, rim: 0.3, rot: cock });
  dot(ctx, 0.8, -0.5, 0.22, '#2a2018');
  dot(ctx, 2.6, -0.3, 0.3, '#2a2018');
  if (Math.sin(t * 2.2) > -0.2) flat(ctx, '#e0707a', (c) => c.ellipse(1.9, 0.95, 0.35, 0.5, 0.2, 0, TAU));
  ctx.restore();
  ctx.restore();
}
function pinkLive(ctx, t) {
  sunflowerHeads(ctx, t);
  smoke(ctx, t, -15.4, -34.6, { seed: 0.65, rise: 15, drift: 8 });
  pinkGate(ctx, t);
  hen(ctx, 11.5, FENCE_Y + 1.6, 0.95, -1, peckOf(t, 0.8, 0.2), true);
  hen(ctx, 17, FENCE_Y + 1.1, 0.9, 1, peckOf(t, 0.65, 0.7), false);
  pinkDog(ctx, t);
}

// ====================================================================== the houses
// The four shipped houses in their cycle order (stylePacks/index.js deals them out).
export const PLUMBER_HOUSE_TYPES = Object.freeze(['rose', 'pink', 'farm', 'hut']);

// Each house's baked body: its box in local units (x0, y0, width, height; the foot
// centre is the origin) — the bake-off's own boxes — its painter and its live layer.
const HOUSES = {
  rose: { box: [-26, -40, 52, 46], body: roseBody, live: roseLive },
  farm: { box: [-30, -40, 57, 46], body: farmBody, live: farmLive },
  hut: { box: [-27, -34, 54, 40], body: hutBody, live: hutLive },
  pink: { box: [-27, -36, 54, 42], body: pinkBody, live: pinkLive },
};
export const PLUMBER_HOUSE_BODIES = Object.freeze(Object.fromEntries(
  Object.entries(HOUSES).map(([id, h]) => [id, Object.freeze([...h.box])])));

// Paint house `type`'s static body, origin at its foot centre.
export function paintPlumberHouseBody(ctx, type, paper = true) {
  const house = HOUSES[type];
  if (!house) return;
  ctx.save();
  withFinish(paper, () => house.body(ctx));
  ctx.restore();
}

// Draw house `type`'s moving parts at time `t` over its (already drawn) body.
export function drawPlumberHouseLive(ctx, type, t, paper = true) {
  const house = HOUSES[type];
  if (!house) return;
  ctx.save();
  withFinish(paper, () => house.live(ctx, t));
  ctx.restore();
}
