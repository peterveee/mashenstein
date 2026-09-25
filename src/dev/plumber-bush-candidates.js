// PLUMBER PANIC — THE BUSH (BAKE-OFF, not wired into the game). Peter, 24 Sep 2026:
// "Better looking bushes in plumbers cabinets".
//
// SETTLED 24 Sep 2026: B, E and F SHIP, mixed along the ridge (stylePacks/plumberBushes.js;
// the mix is plumberBushTypeForCell in stylePacks/index.js). Card A is the bush they
// replaced — three arcs and one lighter arc in the paper finish, 22x11 — kept here as a
// faithful reproduction (same path, palette and paper recipe) for comparison.
//
// Every candidate is a painter in the old sprite's own units — origin at the bush's
// base centre, y up is negative, one unit = one unit of the 22x11 sprite — the units the
// shipped bushes kept. In the scene every card, A included, is swapped in AT THE SHIPPED
// CALL: drawBushScene() sets the pack's ctx.__mashPlumberSceneryOverride seam, which
// drawPlumberScenery() calls for each bush in its own frame (at its placement and scale,
// under the crest clip) instead of painting the shipped bush. Nothing else changes.
//
// The finish is plumberLandmarks.js's cut-paper recipe (the barn, windmill and sheep):
// a short deep lift, a contact edge, the flat fill, the fibre grain and the white rim.
// Colours sit darker and bluer than the hill (#48a050) so a bush reads on the hill face
// it is painted over, which the shipped #4d8e54 does not.
//
// Painter: paint(ctx, t, seed) — t wall-clock seconds, seed a per-bush integer that is
// stable while the camera moves (so variants and animation phases hold per bush).
import { GROUND_Y, VIEW_W, ZOOM, applyWorld } from '../engine/camera.js';
import { paperTextureSource, paperPatternFor, PAPER_PATTERN_SCALE } from '../engine/paper-material.js';
import { drawToon } from '../sprites/toons.js';
import { HERO_DRAW_H } from '../game/draw.js';
import { PLAYER_X } from '../game/player.js';

const TAU = Math.PI * 2;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (v) => { const k = clamp01(v); return k * k * (3 - 2 * k); };
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ------------------------------------------------------------ the paper cutout
// plumberLandmarks.js's `cut` / `tone`, reproduced (they are module-private there).
const grainCache = new WeakMap();
function grain(ctx) {
  let p = grainCache.get(ctx);
  if (p === undefined) {
    const src = paperTextureSource('cardstockClear');
    p = src && typeof ctx.createPattern === 'function' ? ctx.createPattern(src, 'repeat') : null;
    if (p && typeof p.setTransform === 'function' && typeof DOMMatrix === 'function') {
      p.setTransform(new DOMMatrix().scale(PAPER_PATTERN_SCALE));
    }
    grainCache.set(ctx, p);
  }
  return p;
}
const RIM = 'rgba(255,255,255,0.24)';
// The bushes are small sheets: the landmarks' 1.15 rim would be a halo on them.
const BUSH_RIM = 0.7;
function pathOf(fn) { const p = new Path2D(); fn(p); return p; }
function cut(ctx, fn, fill, o = {}) {
  const p = typeof fn === 'function' ? pathOf(fn) : fn;
  const lift = o.lift ?? 1;
  ctx.save();
  if (lift > 0) {
    ctx.fillStyle = o.deepColor || 'rgba(15,23,36,0.10)';
    ctx.translate(1 * lift, 2 * lift); ctx.fill(p);
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    ctx.translate(-0.65 * lift, -1.25 * lift); ctx.fill(p);
    ctx.translate(-0.35 * lift, -0.75 * lift);
  }
  ctx.fillStyle = fill;
  ctx.fill(p);
  const pat = o.grain === false ? null : grain(ctx);
  if (pat) { ctx.fillStyle = pat; ctx.fill(p); }
  ctx.restore();
  if (o.rim !== false) {
    ctx.save();
    ctx.strokeStyle = o.rimColor || RIM;
    ctx.lineWidth = typeof o.rim === 'number' ? o.rim : BUSH_RIM;
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
  return p;
}
function line(ctx, color, width, fn) {
  ctx.beginPath(); fn(ctx);
  ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.stroke();
}
function dot(ctx, x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.05, r), 0, TAU); ctx.fillStyle = fill; ctx.fill(); }
// The soft dark where a bush meets the hill face.
function footShadow(ctx, rx, alpha = 0.22) {
  ctx.save();
  ctx.fillStyle = `rgba(22,56,30,${alpha})`;
  ctx.beginPath(); ctx.ellipse(0.8, 0.2, rx, 1.5, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

// A scalloped mound: the top half of an ellipse (centre cx, base y by, radii rx/ry)
// broken into `n` leafy lobes, each bulging out by its own amount. `wob(i)` can push a
// lobe for wind. The base is a straight line along y = by.
function scallop(c, cx, by, rx, ry, n, bulge, seed, wob = null) {
  const pt = (a, k) => [cx + rx * k * Math.cos(a), by + ry * k * Math.sin(a)];
  let [x0, y0] = pt(Math.PI, 1);
  c.moveTo(x0, by);
  c.lineTo(x0, y0);
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI + (i / n) * Math.PI;
    const a1 = Math.PI + ((i + 1) / n) * Math.PI;
    const am = (a0 + a1) / 2;
    const b = bulge * (0.7 + 0.6 * hash(seed * 13.7 + i * 3.1));
    const w = wob ? wob(i) : 0;
    const k1 = i === n - 1 ? 1 : 0.94 + 0.1 * hash(seed * 7.3 + i * 1.7);
    const [cx1, cy1] = pt(am + w * 0.06, 1 + b);
    const [x1, y1] = pt(a1, k1);
    c.quadraticCurveTo(cx1 + w * 0.5, cy1, x1, i === n - 1 ? Math.min(y1, by) : y1);
  }
  c.lineTo(cx + rx, by);
  c.closePath();
}

// A lit cap or shade patch inside a sheet: the scalloped top of `scallop`, closed by
// the smooth bottom half of the same ellipse, so no straight seam shows inside the bush.
function blob(c, cx, cy, rx, ry, n, bulge, seed, wob = null) {
  const pt = (a, k) => [cx + rx * k * Math.cos(a), cy + ry * k * Math.sin(a)];
  const [x0, y0] = pt(Math.PI, 1);
  c.moveTo(x0, y0);
  for (let i = 0; i < n; i++) {
    const a1 = Math.PI + ((i + 1) / n) * Math.PI;
    const am = Math.PI + ((i + 0.5) / n) * Math.PI;
    const b = bulge * (0.7 + 0.6 * hash(seed * 13.7 + i * 3.1));
    const w = wob ? wob(i) : 0;
    const [qx, qy] = pt(am + w * 0.06, 1 + b);
    const [x1, y1] = pt(a1, 1);
    c.quadraticCurveTo(qx + w * 0.5, qy, x1, y1);
  }
  c.ellipse(cx, cy, rx, ry * 0.55, 0, 0, Math.PI);
  c.closePath();
}

// ======================================================================= A · NOW
// The old shipped sprite, reproduced (the pack no longer draws it).
// Local sprite space is x 0..22, base at y = 11; shifted so its base centre is (0, 0).
const SHIP = { bush: '#4d8e54', bushLight: '#70a15b', petal: '#eee4bf', petalPink: '#cf8d9c' };
function paintNow(ctx, t, seed) {
  const variant = seed % 3;
  ctx.save();
  ctx.translate(-11, -11);
  const pat = paperPatternFor(ctx, 'cardstockClear');
  const paper = (src, color, rim = true) => {
    ctx.save();
    ctx.save(); ctx.translate(1, 2); ctx.fillStyle = 'rgba(15,23,36,0.055)'; src(); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(0.35, 0.75); ctx.fillStyle = 'rgba(0,0,0,0.018)'; src(); ctx.fill(); ctx.restore();
    ctx.fillStyle = color; src(); ctx.fill();
    if (pat) { ctx.fillStyle = pat; src(); ctx.fill(); }
    if (rim) { ctx.strokeStyle = RIM; ctx.lineWidth = 1.15; src(); ctx.stroke(); }
    ctx.restore();
  };
  const h = 11;
  paper(() => {
    ctx.beginPath(); ctx.moveTo(1, h); ctx.lineTo(1, 7);
    ctx.arc(5, 7, 4, Math.PI, TAU); ctx.arc(11, 5.5, 5.5, Math.PI, TAU);
    ctx.arc(17, 7, 4.5, Math.PI, TAU); ctx.lineTo(21, h); ctx.closePath();
  }, SHIP.bush);
  paper(() => { ctx.beginPath(); ctx.arc(11, 5.8, 3.5, Math.PI, TAU); ctx.closePath(); }, SHIP.bushLight, false);
  if (variant === 1) {
    paper(() => { ctx.beginPath(); ctx.ellipse(6, 5.1, 0.8, 0.55, 0, 0, TAU); }, SHIP.petalPink);
    paper(() => { ctx.beginPath(); ctx.ellipse(17, 6, 0.75, 0.5, 0, 0, TAU); }, SHIP.petal);
  }
  ctx.restore();
}

// ============================================================ B · HEDGEROW CLUMP
// Three sheets of leaf, back to front, each with its own scalloped edge; the sun
// catches the crowns of the front two, and a few loose leaves sit proud of the edge.
const HEDGE = { deep: '#2d5f3b', deeper: '#25513a', mid: '#3d7c46', leaf: '#56954f', light: '#79b05e', tip: '#a3cc72', twig: '#4a3a2a' };
function leafTick(ctx, x, y, a, len, fill) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.moveTo(-len, 0); ctx.quadraticCurveTo(0, -len * 0.55, len, 0); ctx.quadraticCurveTo(0, len * 0.55, -len, 0); ctx.fill();
  ctx.restore();
}
function paintHedgerow(ctx, t, seed) {
  const P = HEDGE;
  const v = seed % 3;
  const w = 1 + 0.07 * (v - 1);
  ctx.save();
  ctx.scale(w, 1);
  footShadow(ctx, 13);
  // Back sheet: the tallest, darkest mass, peeking over the others.
  const back = cut(ctx, (c) => scallop(c, 1.5, 0.5, 12.5, 12, 6, 0.3, seed + 1), P.deep, { lift: 1 });
  tone(ctx, back, (c) => c.ellipse(16, 1, 10, 14, -0.5, 0, TAU), P.deeper);
  // Middle sheet, lit on its left crown.
  const mid = cut(ctx, (c) => scallop(c, -1.5, 0.5, 11.5, 9.2, 6, 0.32, seed + 2), P.mid, { lift: 0.8 });
  tone(ctx, mid, (c) => blob(c, -3.6, -4.6, 7.4, 4.6, 4, 0.3, seed + 3), P.leaf);
  // Front sheet: two low clumps at the foot, the lit one on the left.
  const fl = cut(ctx, (c) => scallop(c, -6.8, 0.5, 6.8, 5.4, 4, 0.34, seed + 4), P.leaf, { lift: 0.6 });
  tone(ctx, fl, (c) => blob(c, -8, -2.6, 4.4, 2.6, 3, 0.3, seed + 5), P.light);
  const fr = cut(ctx, (c) => scallop(c, 6.8, 0.5, 6.2, 4.6, 4, 0.34, seed + 6), P.mid, { lift: 0.6 });
  tone(ctx, fr, (c) => blob(c, 5.8, -2.4, 3.8, 2.2, 3, 0.3, seed + 7), P.leaf);
  // Loose leaves on the sunlit crowns: little almond shapes, not noise.
  for (const [x, y, a] of [[-10.6, -4.4, -0.7], [-6.4, -5.7, -0.2], [-4.6, -9.3, -0.5], [-1, -10.2, 0.3],
    [3.6, -11.3, -0.2], [8.8, -4.3, 0.5], [-12.2, -1.8, -1.1]]) {
    leafTick(ctx, x, y, a, 0.9, P.tip);
  }
  if (v === 2) {
    // A dry twig pushing out of the back.
    line(ctx, P.twig, 0.5, (c) => { c.moveTo(9.5, -8.4); c.lineTo(11.4, -11.4); c.moveTo(10.6, -10.1); c.lineTo(12.2, -10.4); });
  }
  ctx.restore();
}

// ========================================================== C · HAWTHORN IN MAY
// A ragged, twiggy mound in deeper green, foamed with blossom in clumps. Now and then
// one petal lets go and falls.
const HAW = { deep: '#2b5a3a', mid: '#3c7543', leaf: '#4f8a4a', light: '#6aa257', twig: '#5a4331',
  bloom: '#f4eedb', bloomShade: '#d8ceb2', eye: '#c8a24a', pink: '#eab7c0', pinkShade: '#c98f9b' };
function paintHawthorn(ctx, t, seed) {
  const P = HAW;
  const v = seed % 3;
  const pink = v === 2;
  const bloom = pink ? P.pink : P.bloom;
  const bloomShade = pink ? P.pinkShade : P.bloomShade;
  ctx.save();
  footShadow(ctx, 12.5);
  // Twigs that escape the mass, drawn first so the leaves sit over their roots.
  line(ctx, P.twig, 0.5, (c) => {
    c.moveTo(-9, -6); c.lineTo(-12.2, -9.2); c.moveTo(-11, -8); c.lineTo(-11.4, -10.2);
    c.moveTo(7.5, -8.6); c.lineTo(9.8, -12.2); c.moveTo(8.9, -10.8); c.lineTo(10.9, -11.1);
  });
  // The ragged mound: many uneven lobes, higher on the left, a notch in the crown.
  const body = cut(ctx, (c) => {
    c.moveTo(-12.5, 0.5);
    c.quadraticCurveTo(-14, -3, -11.6, -5.2); c.quadraticCurveTo(-12, -8.4, -8.4, -8.4);
    c.quadraticCurveTo(-7.4, -11.4, -3.8, -10.8); c.quadraticCurveTo(-1.6, -13, 1.2, -11);
    c.quadraticCurveTo(2.6, -9.6, 3.6, -10.2); c.quadraticCurveTo(6.8, -11.8, 8, -8.8);
    c.quadraticCurveTo(11.4, -8.6, 10.8, -5.4); c.quadraticCurveTo(13.8, -3.6, 12.5, 0.5);
    c.closePath();
  }, P.mid, { lift: 1 });
  tone(ctx, body, (c) => c.ellipse(15, 1, 10, 13, -0.5, 0, TAU), P.deep);
  tone(ctx, body, (c) => blob(c, -4.5, -5, 6.6, 5.4, 5, 0.36, seed + 11), P.leaf);
  tone(ctx, body, (c) => blob(c, -6, -6.8, 3.8, 2.6, 3, 0.36, seed + 12), P.light);
  // Blossom clumps: each a knot of flowers with a shaded underside and a gold eye.
  const clumps = [[-8.6, -6], [-4.4, -8.8], [0.2, -8], [4.8, -8.2], [8.2, -5.2], [-1.8, -4.4], [5, -3.4], [-9.4, -2.2]];
  clumps.forEach(([x, y], i) => {
    const n = 3 + Math.floor(hash(seed * 3.3 + i) * 3);
    for (let k = 0; k < n; k++) {
      const a = hash(seed + i * 9.1 + k * 2.3) * TAU;
      const r = 0.4 + 1.1 * hash(seed + i * 4.7 + k * 5.9);
      const fx = x + Math.cos(a) * r * 1.3, fy = y + Math.sin(a) * r;
      dot(ctx, fx + 0.12, fy + 0.22, 0.58, bloomShade);
      dot(ctx, fx, fy, 0.5, bloom);
      if (k === 0) dot(ctx, fx, fy, 0.17, P.eye);
    }
  });
  // One petal, every ~7 s per bush, drifting down and across the face.
  const period = 7;
  const ph = ((t + hash(seed) * period) % period) / 2.6;
  if (ph < 1) {
    const x = 4.8 + Math.sin(ph * 7) * 1.2 + ph * 3;
    const y = -8.2 + ph * 9;
    ctx.save();
    ctx.globalAlpha = 1 - smooth((ph - 0.8) / 0.2);
    ctx.translate(x, y); ctx.rotate(ph * 6);
    ctx.fillStyle = bloom;
    ctx.beginPath(); ctx.ellipse(0, 0, 0.55, 0.32, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// ============================================================= D · CLIPPED HEDGE
// A cottage-garden box hedge: a sheared block with a rounded shoulder, a topiary ball
// on top (or two), and the regular stipple of fresh shearing.
const BOX = { top: '#7cb262', face: '#468547', shade: '#2f6a3c', foot: '#285a35', tick: 'rgba(28,66,36,0.55)', tickLit: 'rgba(170,210,120,0.7)' };
function shearTexture(ctx, parent, x0, y0, x1, y1, lit) {
  ctx.save();
  ctx.clip(parent);
  ctx.lineWidth = 0.35; ctx.lineCap = 'round';
  let row = 0;
  for (let y = y0; y < y1; y += 1.5, row++) {
    for (let x = x0 + (row % 2) * 0.9; x < x1; x += 1.8) {
      ctx.strokeStyle = lit && y < y0 + 2.2 ? BOX.tickLit : BOX.tick;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.5, y - 0.45); ctx.stroke();
    }
  }
  ctx.restore();
}
function paintClipped(ctx, t, seed) {
  const P = BOX;
  const v = seed % 3;
  ctx.save();
  footShadow(ctx, 13, 0.26);
  // The block: flat sheared top, rounded shoulders, a slight flare at the foot.
  const bw = 11.5, bh = 7;
  const block = cut(ctx, (c) => {
    c.moveTo(-bw - 0.5, 0.5); c.lineTo(-bw, -bh + 2);
    c.quadraticCurveTo(-bw, -bh, -bw + 2, -bh);
    c.lineTo(bw - 2, -bh); c.quadraticCurveTo(bw, -bh, bw, -bh + 2);
    c.lineTo(bw + 0.5, 0.5); c.closePath();
  }, P.face, { lift: 1 });
  tone(ctx, block, (c) => c.rect(-bw - 1, -bh - 1, bw * 2 + 2, 2.4), P.top);
  tone(ctx, block, (c) => c.rect(bw - 3.4, -bh + 1.4, 5, bh + 1), P.shade);
  tone(ctx, block, (c) => c.rect(-bw - 1, -1.6, bw * 2 + 2, 3), P.foot);
  shearTexture(ctx, block, -bw, -bh + 0.6, bw, 0.5, true);
  // The ball(s) on top, each on a short clear stem.
  const balls = v === 0 ? [[-4.6, 3]] : v === 1 ? [[-5.2, 2.7], [5.2, 2.4]] : [[0.4, 3.3]];
  for (const [bx, r] of balls) {
    const cy = -bh - r - 0.6;
    line(ctx, '#4a3a2a', 0.5, (c) => { c.moveTo(bx, -bh + 0.2); c.lineTo(bx, cy + r * 0.6); });
    const ball = cut(ctx, (c) => c.arc(bx, cy, r, 0, TAU), P.face, { lift: 0.8 });
    tone(ctx, ball, (c) => c.arc(bx + r * 0.45, cy + r * 0.35, r * 0.95, 0, TAU), P.shade);
    tone(ctx, ball, (c) => c.arc(bx - r * 0.35, cy - r * 0.4, r * 0.55, 0, TAU), P.top);
    shearTexture(ctx, ball, bx - r, cy - r, bx + r, cy + r, false);
  }
  ctx.restore();
}

// ================================================================== E · GORSE
// Spiky blue-green scrub lit up with yellow flowers — the one bush that reads as a
// colour from across the valley. The flowers glint slowly as the light moves.
const GORSE = { deep: '#2c5840', mid: '#3d6d48', spine: '#557f4f', light: '#6f9a5a',
  flower: '#f3c531', flowerLit: '#fde58a', flowerShade: '#c98f1c' };
// A dome fringed with fine spines: short, uneven, many.
function spiky(c, cx, by, rx, ry, n, spike, seed) {
  c.moveTo(cx - rx, by);
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI;
    const k = 0.94 + 0.1 * Math.sin(i * 0.9 + seed) * hash(seed + i * 2.9);
    const x = cx + rx * k * Math.cos(a), y = by + ry * k * Math.sin(a);
    if (i === 0) { c.lineTo(x, Math.min(y, by)); continue; }
    const am = a - Math.PI / n / 2 + (hash(seed + i * 7.1) - 0.5) * 0.08;
    const s = spike * (0.5 + 0.9 * hash(seed + i * 5.3));
    c.lineTo(cx + (rx * k + s) * Math.cos(am), by + (ry * k + s) * Math.sin(am));
    c.lineTo(x, Math.min(y, by));
  }
  c.lineTo(cx + rx, by);
  c.closePath();
}
function paintGorse(ctx, t, seed) {
  const P = GORSE;
  ctx.save();
  footShadow(ctx, 12.5);
  const back = cut(ctx, (c) => spiky(c, 1.2, 0.5, 11.4, 10.2, 46, 0.9, seed + 1), P.deep, { lift: 1, rim: 0.45 });
  tone(ctx, back, (c) => c.ellipse(15, 1, 9, 13, -0.5, 0, TAU), '#25503a');
  const front = cut(ctx, (c) => spiky(c, -1.6, 0.5, 10.2, 7.6, 36, 0.8, seed + 2), P.mid, { lift: 0.6, rim: 0.4 });
  tone(ctx, front, (c) => blob(c, -4, -3.6, 6.4, 4.2, 5, 0.2, seed + 3), P.spine);
  tone(ctx, front, (c) => c.ellipse(13, 1, 9, 11, -0.5, 0, TAU), P.deep);
  // Spines: fine dark hatching across the face, inside it.
  ctx.save();
  ctx.clip(front);
  line(ctx, 'rgba(26,52,34,0.45)', 0.28, (c) => {
    for (let i = 0; i < 20; i++) {
      const x = -10 + hash(seed + i * 1.9) * 17, y = -0.8 - hash(seed + i * 3.7) * 6.5;
      c.moveTo(x, y); c.lineTo(x + 0.8, y - 1);
    }
  });
  ctx.restore();
  // The flowers, weighted to the sunlit crown: a pea-flower with a shaded keel.
  const n = 30;
  for (let i = 0; i < n; i++) {
    const a = Math.PI + (0.06 + 0.8 * hash(seed * 1.1 + i * 7.7)) * Math.PI;
    const k = 0.3 + 0.66 * Math.sqrt(hash(seed * 2.3 + i * 3.3));
    const x = -1 + 10.4 * k * Math.cos(a), y = 0.5 + 9.4 * k * Math.sin(a);
    if (y > -1.2) continue;
    const r = 0.45 + 0.3 * hash(seed + i * 11.1);
    dot(ctx, x + 0.14, y + 0.2, r, P.flowerShade);
    dot(ctx, x, y, r, P.flower);
    const tw = 0.5 + 0.5 * Math.sin(t * 1.4 + i * 1.7 + seed);
    if (hash(seed + i) < 0.5) dot(ctx, x - r * 0.3, y - r * 0.35, r * 0.45 * (0.5 + 0.5 * tw), P.flowerLit);
  }
  ctx.restore();
}

// ====================================================== F · HEDGE WITH A ROBIN
// A round hedge whose crown lobes lean in the wind, gust by gust; now and then a robin
// pops out on top, looks about, hops, and ducks back in — and the leaves shiver when
// it goes through them.
const ROBIN = { back: '#7a5a3c', backShade: '#5f4530', breast: '#e0662e', belly: '#efe3cc', eye: '#161210', leg: '#5a4433' };
const RH = { deep: '#2e613c', deeper: '#28553a', mid: '#3f7f47', leaf: '#5a9a52', light: '#80b562' };
const ROBIN_PERIOD = 8;
function robinPhase(t, seed) { return (t + hash(seed * 1.7) * ROBIN_PERIOD) % ROBIN_PERIOD; }
function robinState(t, seed) {
  const ph = robinPhase(t, seed);
  // 0-3.4 hidden; 3.4-3.7 up; 3.7-6.2 on top (two hops); 6.2-6.5 down.
  if (ph < 3.4 || ph > 6.5) return { up: 0, x: -2, hop: 0, look: 1, rustle: ph > 6.5 && ph < 7.2 ? 1 - (ph - 6.5) / 0.7 : 0 };
  const up = ph < 3.7 ? smooth((ph - 3.4) / 0.3) : ph > 6.2 ? 1 - smooth((ph - 6.2) / 0.3) : 1;
  const on = ph - 3.7;
  const hopAt = (s) => (on > s && on < s + 0.25 ? Math.sin(((on - s) / 0.25) * Math.PI) : 0);
  const x = -2 + 2.2 * smooth((on - 0.8) / 0.25) + 1.8 * smooth((on - 1.7) / 0.25);
  const look = (on > 1.2 && on < 1.6) || on > 2.1 ? -1 : 1;
  const rustle = ph < 3.9 ? 1 - Math.abs(ph - 3.55) / 0.35 : ph > 6.0 ? 1 - Math.abs(ph - 6.35) / 0.35 : 0;
  return { up, x, hop: (hopAt(0.8) + hopAt(1.7)) * 1.2, look, rustle: clamp01(rustle) };
}
function robin(ctx, x, y, dir) {
  const P = ROBIN;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  const o = { lift: 0.35, rim: 0.4, deepColor: 'rgba(15,23,36,0.14)' };
  cut(ctx, (c) => { c.moveTo(-1.6, -1.6); c.lineTo(-3.4, -3.2); c.lineTo(-3.8, -2.5); c.lineTo(-1.8, -0.9); c.closePath(); }, P.backShade, { ...o, rim: false });
  const body = cut(ctx, (c) => c.ellipse(0, -1.9, 2.2, 1.9, -0.15, 0, TAU), P.back, o);
  tone(ctx, body, (c) => c.ellipse(1.1, -1.2, 1.7, 1.6, 0, 0, TAU), P.belly);
  tone(ctx, body, (c) => c.ellipse(1.5, -2.2, 1.4, 1.35, 0, 0, TAU), P.breast);
  const head = cut(ctx, (c) => c.arc(1.5, -3.7, 1.25, 0, TAU), P.back, o);
  tone(ctx, head, (c) => c.ellipse(2.2, -3.2, 1, 0.9, 0, 0, TAU), P.breast);
  ctx.fillStyle = P.leg;
  ctx.beginPath(); ctx.moveTo(2.6, -3.9); ctx.lineTo(3.6, -3.6); ctx.lineTo(2.6, -3.4); ctx.closePath(); ctx.fill();
  dot(ctx, 1.9, -4, 0.28, P.eye);
  line(ctx, P.leg, 0.3, (c) => { c.moveTo(-0.2, -0.2); c.lineTo(-0.3, 0.4); c.moveTo(0.6, -0.2); c.lineTo(0.7, 0.4); });
  ctx.restore();
}
function paintRobinHedge(ctx, t, seed) {
  const P = RH;
  const st = robinState(t, seed);
  // Wind: a slow gust envelope over a quicker flutter, plus the robin's shiver.
  const gust = 0.5 + 0.5 * Math.sin(t * 0.55 + seed * 0.37);
  const wob = (layer) => (i) => (0.35 + gust * 0.9) * Math.sin(t * 2.3 + i * 1.3 + layer)
    + st.rustle * 1.3 * Math.sin(t * 22 + i * 2.1);
  ctx.save();
  footShadow(ctx, 12.5);
  const back = cut(ctx, (c) => scallop(c, 0, 0.5, 11.6, 10, 8, 0.26, seed + 1, wob(0)), P.deep, { lift: 1 });
  tone(ctx, back, (c) => c.ellipse(15, 1, 9, 12, -0.5, 0, TAU), P.deeper);
  // The robin, between the back and front sheets: it rises out of the crown.
  if (st.up > 0) robin(ctx, st.x, -9.4 - st.hop + (1 - st.up) * 5.5, st.look);
  const mid = cut(ctx, (c) => scallop(c, 0.4, 0.5, 10.6, 7.8, 7, 0.28, seed + 2, wob(1)), P.mid, { lift: 0.8 });
  tone(ctx, mid, (c) => blob(c, -2.4, -4.2, 6.6, 3.8, 5, 0.3, seed + 3, wob(2)), P.leaf);
  tone(ctx, mid, (c) => blob(c, -4, -5.4, 3.4, 1.8, 3, 0.3, seed + 4, wob(3)), P.light);
  // Loose leaves on the windward edge, the flutter at its plainest.
  const f = wob(4);
  leafTick(ctx, -11, -4, -0.9 + f(0) * 0.5, 0.9, P.light);
  leafTick(ctx, -8.8, -7.4, -0.5 + f(1) * 0.5, 0.9, P.light);
  leafTick(ctx, 10.2, -6.4, 0.6 + f(2) * 0.5, 0.9, P.light);
  leafTick(ctx, 4.2, -9.6, 0.2 + f(3) * 0.5, 0.8, P.light);
  ctx.restore();
}

// ------------------------------------------------------------------ the list
export const PLUMBER_BUSH_CANDIDATES = [
  { id: 'now', letter: 'A', name: 'WAS — the old bush', paint: paintNow,
    note: 'What shipped before 24 Sep: three arcs and one lighter arc, 22x11, in almost exactly the hill\'s own green. A faithful reproduction; the pack no longer draws it.' },
  { id: 'hedgerow', letter: 'B', name: 'Hedgerow clump · SHIPS', paint: paintHedgerow, ships: true,
    note: 'Three cut-paper sheets back to front, each with a scalloped leafy edge, darker and bluer than the hill so it reads on it. Sunlit crowns, leaf ticks and a few shade seams make it leaves rather than a blob.' },
  { id: 'hawthorn', letter: 'C', name: 'Hawthorn in blossom', paint: paintHawthorn,
    showT: (seed) => ((0.35 * 2.6 - hash(seed) * 7) % 7 + 7) % 7,
    note: 'A ragged, twiggy mound foamed with cream blossom (one in three pink), the hedgerow in May. Every few seconds a single petal lets go and drifts down its face.' },
  { id: 'clipped', letter: 'D', name: 'Clipped box hedge', paint: paintClipped,
    note: 'A cottage-garden box hedge: a sheared block with a lit top, a shaded end and a shearing stipple, crowned with one or two topiary balls. The only silhouette with straight lines — reads as tended, near the farms.' },
  { id: 'gorse', letter: 'E', name: 'Gorse · SHIPS', paint: paintGorse, ships: true,
    note: 'Spiky blue-green scrub covered in yellow pea-flowers that glint slowly as the light moves. The one bush that reads as a colour, not a darker green, from across the valley.' },
  { id: 'robin', letter: 'F', name: 'Hedge with a robin · SHIPS', paint: paintRobinHedge, ships: true,
    showT: (seed) => ((4.3 - hash(seed * 1.7) * ROBIN_PERIOD) % ROBIN_PERIOD + ROBIN_PERIOD) % ROBIN_PERIOD,
    note: 'A round hedge whose crown lobes lean in slow gusts. Every eight seconds or so a robin pops out on top, looks about, hops twice and ducks back in, and the leaves shiver as it goes through.' },
];

// ------------------------------------------------------------------ the scene
// Camera positions where the near ridge carries a bush clear of the hero: a lone bush,
// the house cluster (house + bush + fence) and the fence cluster (fence + bush + flowers).
export const PLUMBER_BUSH_CAMERAS = [
  { camX: 620, label: 'a lone bush' },
  { camX: 4500, label: 'by the cottage' },
  { camX: 20850, label: 'by the fence' },
];

// The backdrop at camera `camX` with every bush the pack plants painted by `cand` (no
// candidate leaves the shipped mix), then the lane and the running hero. The swap goes
// through the pack's ctx.__mashPlumberSceneryOverride seam: drawPlumberScenery calls it
// in each bush's own frame, placed, scaled and crest-clipped. Returns how many bushes
// were swapped, so a harness can prove the swap happened.
export function drawBushScene(ctx, t, cand, { cab, pack, camX, totalDist = Infinity }) {
  let swapped = 0;
  if (cand) {
    const prev = ctx.__mashPlumberSceneryOverride;
    ctx.__mashPlumberSceneryOverride = (g, prop, tt) => {
      if (prop.kind !== 'bush') return false;
      cand.paint(g, tt, Math.abs(prop.cell * 7 + 3));
      swapped++;
      return true;
    };
    try { pack.bg(ctx, t, camX, cab, totalDist, null); } finally {
      if (prev === undefined) delete ctx.__mashPlumberSceneryOverride;
      else ctx.__mashPlumberSceneryOverride = prev;
    }
  } else {
    pack.bg(ctx, t, camX, cab, totalDist, null);
  }
  ctx.save();
  applyWorld(ctx, ZOOM, 0, GROUND_Y);
  pack.ground(ctx, camX, cab, [], [], camX, VIEW_W);
  drawToon(ctx, 'lorenzo', {
    kind: 'run', phase: (t * 1.6) % 1, time: t, vy: 0, grounded: true, squash: 0, lean: 0,
    roll: false, float: false, stomp: false, headless: false, facing: 1,
  }, PLAYER_X, GROUND_Y, HERO_DRAW_H);
  ctx.restore();
  if (pack.post) pack.post(ctx, t);
  if (pack.weather) pack.weather(ctx, t);
  return swapped;
}

// A close-up: the bush `zoom` frame pixels per sprite unit, sunk into a slab of the
// near hill exactly as the ridge sinks it (base 13 units under the crest at the 0.9
// placement scale, clipped to the crest), on the cabinet's sky.
export function drawBushCloseUp(ctx, t, cand, w, h, { zoom = 6, seed = 7, hills = '#48a050', sky = '#a8e0f8' } = {}) {
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const s = zoom * 0.9;
  const baseY = h - 8;
  // The ridge sinks a bush's base 13 FRAME px under the crest (1 + the cluster's 12).
  const crest = baseY - 13 * zoom;
  const crestAt = (x) => crest + 0.012 * (x - w / 2) * (x - w / 2) / zoom;
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 4) ctx.lineTo(x, crestAt(x));
  ctx.lineTo(w, h); ctx.closePath();
  ctx.fillStyle = hills;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.translate(w / 2, baseY);
  ctx.scale(s, s);
  cand.paint(ctx, t, seed);
  ctx.restore();
}
