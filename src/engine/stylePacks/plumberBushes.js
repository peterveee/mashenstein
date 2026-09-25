// PLUMBER PANIC — THE NEAR-RIDGE BUSHES. Shipped 24 Sep 2026 from the plumber bush
// bake-off (src/dev/plumber-bush-candidates.js, cards B, E and F): Peter picked three
// and asked for them mixed together along the ridge.
//
//   hedgerow  B · three scalloped cut-paper sheets, sunlit crowns, loose leaf ticks
//   gorse     E · spiky blue-green scrub lit up with yellow pea-flowers
//   robin     F · a round hedge; every eight seconds or so a robin pops out on top,
//                 looks about, hops twice and ducks back in, and the leaves shiver
//
// Every painter works in the old 22x11 bush sprite's units with the origin at the
// bush's BASE CENTRE (y up is negative), so the pack seats, scales and ridge-clips a
// bush exactly where the old sprite went. stylePacks/index.js owns placement, the
// B/E/F mix and the sprite cache; this file owns only the art.
//
// Hedgerow and gorse are static and bake whole. The robin hedge bakes as three
// sprites — the back sheet, the front sheet and the bird — and drawPlumberRobinHedge()
// composes them per frame (back, bird, front) with only the bird's motion, the
// front sheet's shiver and four loose leaves drawn live.
//
// Deliberately frozen in the bake: the gorse flowers' slow glint and the robin hedge's
// per-lobe gust lean. Their loose leaves still flutter live in the gusts.
//
// Finish: plumberLandmarks.js's cut-paper recipe (a short deep lift, a contact edge, the
// flat fill, the fibre grain and a thin white rim), coloured darker and bluer than the
// hill so a bush reads on the face it is sunk into.
import { paperTextureSource, PAPER_PATTERN_SCALE } from '../paper-material.js';

const TAU = Math.PI * 2;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (v) => { const k = clamp01(v); return k * k * (3 - 2 * k); };
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// The three shipped bushes, in mix order.
export const PLUMBER_BUSH_TYPES = Object.freeze(['hedgerow', 'gorse', 'robin']);

// Baked sprite boxes, in bush units: `width` centred on the origin, `height` above the
// base, `pad` all round (the base sits `pad` above the canvas bottom). A sprite is
// { canvas, width: width + 2 pad, height: height + 2 pad, pad } — the same shape the
// pack's other scenery sprites use, so its draw math carries over.
export const PLUMBER_BUSH_BOX = Object.freeze({ width: 36, height: 20, pad: 3 });
export const PLUMBER_ROBIN_BIRD_BOX = Object.freeze({ width: 10, height: 7, pad: 2 });

// The baked layers: hedgerow, gorse, the robin hedge's back and front sheets, the bird.
export const PLUMBER_BUSH_LAYERS = Object.freeze({
  hedgerow: PLUMBER_BUSH_BOX,
  gorse: PLUMBER_BUSH_BOX,
  robinBack: PLUMBER_BUSH_BOX,
  robinFront: PLUMBER_BUSH_BOX,
  robinBird: PLUMBER_ROBIN_BIRD_BOX,
});

// The art seed a baked variant (0..2) paints with. The hedgerow reads its width and
// twig from seed % 3, so seed % 3 is the variant.
export function plumberBushSeed(variant) {
  return 12 + (((Number(variant) | 0) % 3) + 3) % 3;
}

// Blit a baked bush sprite with its base centre at (dx, dy) in the current units.
export function blitPlumberBushSprite(ctx, sprite, dx = 0, dy = 0) {
  if (!sprite) return;
  ctx.drawImage(sprite.canvas, dx - sprite.width * 0.5, dy - (sprite.height - sprite.pad),
    sprite.width, sprite.height);
}

// ------------------------------------------------------------ the paper cutout
const grainCache = new WeakMap();
function grain(ctx) {
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
// The bushes are small sheets: the landmarks' 1.15 rim would be a halo on them.
const BUSH_RIM = 0.7;
function pathOf(fn) { const p = new Path2D(); fn(p); return p; }
// `paint.grained` is false when the pack's paper finish is off: the fibre grain goes,
// the cut-paper lift and rim (part of the silhouette) stay.
function cut(ctx, paint, fn, fill, o = {}) {
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
  const pat = paint.grained ? grain(ctx) : null;
  if (pat) { ctx.fillStyle = pat; ctx.fill(p); }
  ctx.restore();
  if (o.rim !== false) {
    ctx.save();
    ctx.strokeStyle = RIM;
    ctx.lineWidth = typeof o.rim === 'number' ? o.rim : BUSH_RIM;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.stroke(p);
    ctx.restore();
  }
  return p;
}
function tone(ctx, paint, parent, fn, fill) {
  const p = typeof fn === 'function' ? pathOf(fn) : fn;
  ctx.save();
  ctx.clip(parent);
  ctx.fillStyle = fill;
  ctx.fill(p);
  const pat = paint.grained ? grain(ctx) : null;
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
function leafTick(ctx, x, y, a, len, fill) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.moveTo(-len, 0); ctx.quadraticCurveTo(0, -len * 0.55, len, 0); ctx.quadraticCurveTo(0, len * 0.55, -len, 0); ctx.fill();
  ctx.restore();
}

// A scalloped mound: the top half of an ellipse (centre cx, base y by, radii rx/ry)
// broken into `n` leafy lobes, each bulging out by its own amount. The base is a
// straight line along y = by.
function scallop(c, cx, by, rx, ry, n, bulge, seed) {
  const pt = (a, k) => [cx + rx * k * Math.cos(a), by + ry * k * Math.sin(a)];
  const [x0, y0] = pt(Math.PI, 1);
  c.moveTo(x0, by);
  c.lineTo(x0, y0);
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI + (i / n) * Math.PI;
    const a1 = Math.PI + ((i + 1) / n) * Math.PI;
    const am = (a0 + a1) / 2;
    const b = bulge * (0.7 + 0.6 * hash(seed * 13.7 + i * 3.1));
    const k1 = i === n - 1 ? 1 : 0.94 + 0.1 * hash(seed * 7.3 + i * 1.7);
    const [cx1, cy1] = pt(am, 1 + b);
    const [x1, y1] = pt(a1, k1);
    c.quadraticCurveTo(cx1, cy1, x1, i === n - 1 ? Math.min(y1, by) : y1);
  }
  c.lineTo(cx + rx, by);
  c.closePath();
}

// A lit cap or shade patch inside a sheet: the scalloped top of `scallop`, closed by
// the smooth bottom half of the same ellipse, so no straight seam shows inside the bush.
function blob(c, cx, cy, rx, ry, n, bulge, seed) {
  const pt = (a, k) => [cx + rx * k * Math.cos(a), cy + ry * k * Math.sin(a)];
  const [x0, y0] = pt(Math.PI, 1);
  c.moveTo(x0, y0);
  for (let i = 0; i < n; i++) {
    const a1 = Math.PI + ((i + 1) / n) * Math.PI;
    const am = Math.PI + ((i + 0.5) / n) * Math.PI;
    const b = bulge * (0.7 + 0.6 * hash(seed * 13.7 + i * 3.1));
    const [qx, qy] = pt(am, 1 + b);
    const [x1, y1] = pt(a1, 1);
    c.quadraticCurveTo(qx, qy, x1, y1);
  }
  c.ellipse(cx, cy, rx, ry * 0.55, 0, 0, Math.PI);
  c.closePath();
}

// ============================================================ B · HEDGEROW CLUMP
// Three sheets of leaf, back to front, each with its own scalloped edge; the sun
// catches the crowns of the front two, and a few loose leaves sit proud of the edge.
const HEDGE = { deep: '#2d5f3b', deeper: '#25513a', mid: '#3d7c46', leaf: '#56954f', light: '#79b05e', tip: '#a3cc72', twig: '#4a3a2a' };
function paintHedgerow(ctx, paint, seed) {
  const P = HEDGE;
  const v = seed % 3;
  const w = 1 + 0.07 * (v - 1);
  ctx.save();
  ctx.scale(w, 1);
  footShadow(ctx, 13);
  const back = cut(ctx, paint, (c) => scallop(c, 1.5, 0.5, 12.5, 12, 6, 0.3, seed + 1), P.deep, { lift: 1 });
  tone(ctx, paint, back, (c) => c.ellipse(16, 1, 10, 14, -0.5, 0, TAU), P.deeper);
  const mid = cut(ctx, paint, (c) => scallop(c, -1.5, 0.5, 11.5, 9.2, 6, 0.32, seed + 2), P.mid, { lift: 0.8 });
  tone(ctx, paint, mid, (c) => blob(c, -3.6, -4.6, 7.4, 4.6, 4, 0.3, seed + 3), P.leaf);
  const fl = cut(ctx, paint, (c) => scallop(c, -6.8, 0.5, 6.8, 5.4, 4, 0.34, seed + 4), P.leaf, { lift: 0.6 });
  tone(ctx, paint, fl, (c) => blob(c, -8, -2.6, 4.4, 2.6, 3, 0.3, seed + 5), P.light);
  const fr = cut(ctx, paint, (c) => scallop(c, 6.8, 0.5, 6.2, 4.6, 4, 0.34, seed + 6), P.mid, { lift: 0.6 });
  tone(ctx, paint, fr, (c) => blob(c, 5.8, -2.4, 3.8, 2.2, 3, 0.3, seed + 7), P.leaf);
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

// ================================================================== E · GORSE
// Spiky blue-green scrub lit up with yellow flowers — the one bush that reads as a
// colour from across the valley. Baked with the glint frozen at t = 0.
const GORSE = { deep: '#2c5840', deepest: '#25503a', mid: '#3d6d48', spine: '#557f4f',
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
function paintGorse(ctx, paint, seed) {
  const P = GORSE;
  const t = 0;
  ctx.save();
  footShadow(ctx, 12.5);
  const back = cut(ctx, paint, (c) => spiky(c, 1.2, 0.5, 11.4, 10.2, 46, 0.9, seed + 1), P.deep, { lift: 1, rim: 0.45 });
  tone(ctx, paint, back, (c) => c.ellipse(15, 1, 9, 13, -0.5, 0, TAU), P.deepest);
  const front = cut(ctx, paint, (c) => spiky(c, -1.6, 0.5, 10.2, 7.6, 36, 0.8, seed + 2), P.mid, { lift: 0.6, rim: 0.4 });
  tone(ctx, paint, front, (c) => blob(c, -4, -3.6, 6.4, 4.2, 5, 0.2, seed + 3), P.spine);
  tone(ctx, paint, front, (c) => c.ellipse(13, 1, 9, 11, -0.5, 0, TAU), P.deep);
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
  for (let i = 0; i < 30; i++) {
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
// A time at which the robin of hedge `seed` stands on top, for a still (gallery) view.
export function plumberRobinShowT(seed) {
  return ((4.3 - hash(seed * 1.7) * ROBIN_PERIOD) % ROBIN_PERIOD + ROBIN_PERIOD) % ROBIN_PERIOD;
}
// The bird, facing right, feet at the origin.
function paintRobinBird(ctx, paint) {
  const P = ROBIN;
  const o = { lift: 0.35, rim: 0.4, deepColor: 'rgba(15,23,36,0.14)' };
  cut(ctx, paint, (c) => { c.moveTo(-1.6, -1.6); c.lineTo(-3.4, -3.2); c.lineTo(-3.8, -2.5); c.lineTo(-1.8, -0.9); c.closePath(); }, P.backShade, { ...o, rim: false });
  const body = cut(ctx, paint, (c) => c.ellipse(0, -1.9, 2.2, 1.9, -0.15, 0, TAU), P.back, o);
  tone(ctx, paint, body, (c) => c.ellipse(1.1, -1.2, 1.7, 1.6, 0, 0, TAU), P.belly);
  tone(ctx, paint, body, (c) => c.ellipse(1.5, -2.2, 1.4, 1.35, 0, 0, TAU), P.breast);
  const head = cut(ctx, paint, (c) => c.arc(1.5, -3.7, 1.25, 0, TAU), P.back, o);
  tone(ctx, paint, head, (c) => c.ellipse(2.2, -3.2, 1, 0.9, 0, 0, TAU), P.breast);
  ctx.fillStyle = P.leg;
  ctx.beginPath(); ctx.moveTo(2.6, -3.9); ctx.lineTo(3.6, -3.6); ctx.lineTo(2.6, -3.4); ctx.closePath(); ctx.fill();
  dot(ctx, 1.9, -4, 0.28, P.eye);
  line(ctx, P.leg, 0.3, (c) => { c.moveTo(-0.2, -0.2); c.lineTo(-0.3, 0.4); c.moveTo(0.6, -0.2); c.lineTo(0.7, 0.4); });
}
// The back sheet: the robin rises between it and the front sheet.
function paintRobinBack(ctx, paint, seed) {
  const P = RH;
  footShadow(ctx, 12.5);
  const back = cut(ctx, paint, (c) => scallop(c, 0, 0.5, 11.6, 10, 8, 0.26, seed + 1), P.deep, { lift: 1 });
  tone(ctx, paint, back, (c) => c.ellipse(15, 1, 9, 12, -0.5, 0, TAU), P.deeper);
}
function paintRobinFront(ctx, paint, seed) {
  const P = RH;
  const mid = cut(ctx, paint, (c) => scallop(c, 0.4, 0.5, 10.6, 7.8, 7, 0.28, seed + 2), P.mid, { lift: 0.8 });
  tone(ctx, paint, mid, (c) => blob(c, -2.4, -4.2, 6.6, 3.8, 5, 0.3, seed + 3), P.leaf);
  tone(ctx, paint, mid, (c) => blob(c, -4, -5.4, 3.4, 1.8, 3, 0.3, seed + 4), P.light);
}

// Compose one robin hedge in bush units (origin at its base centre): the baked back
// sheet, the bird, the baked front sheet, then the loose leaves. `seed` is per placement
// so neighbouring robins keep their own time; `back`, `front` and `bird` are the baked
// robinBack / robinFront / robinBird sprites (bird may be null: the hedge still draws).
export function drawPlumberRobinHedge(ctx, t, seed, back, front, bird) {
  const st = robinState(t, seed);
  // Wind: a slow gust envelope over a quicker flutter, plus the robin's shiver.
  const gust = 0.5 + 0.5 * Math.sin(t * 0.55 + seed * 0.37);
  const flutter = (i) => (0.35 + gust * 0.9) * Math.sin(t * 2.3 + i * 1.3 + 4)
    + st.rustle * 1.3 * Math.sin(t * 22 + i * 2.1);
  blitPlumberBushSprite(ctx, back);
  if (st.up > 0 && bird) {
    ctx.save();
    ctx.translate(st.x, -9.4 - st.hop + (1 - st.up) * 5.5);
    ctx.scale(st.look, 1);
    blitPlumberBushSprite(ctx, bird);
    ctx.restore();
  }
  // The front sheet shivers sideways as the robin pushes through it.
  blitPlumberBushSprite(ctx, front, st.rustle > 0 ? st.rustle * 0.3 * Math.sin(t * 22) : 0, 0);
  // Loose leaves on the windward edge, the flutter at its plainest.
  leafTick(ctx, -11, -4, -0.9 + flutter(0) * 0.5, 0.9, RH.light);
  leafTick(ctx, -8.8, -7.4, -0.5 + flutter(1) * 0.5, 0.9, RH.light);
  leafTick(ctx, 10.2, -6.4, 0.6 + flutter(2) * 0.5, 0.9, RH.light);
  leafTick(ctx, 4.2, -9.6, 0.2 + flutter(3) * 0.5, 0.8, RH.light);
}

// Paint one baked layer in bush units, origin at its base centre. `layer` is a key of
// PLUMBER_BUSH_LAYERS; `seed` comes from plumberBushSeed(variant).
export function paintPlumberBushLayer(ctx, layer, seed, { grained = true } = {}) {
  const paint = { grained };
  ctx.save();
  if (layer === 'hedgerow') paintHedgerow(ctx, paint, seed);
  else if (layer === 'gorse') paintGorse(ctx, paint, seed);
  else if (layer === 'robinBack') paintRobinBack(ctx, paint, seed);
  else if (layer === 'robinFront') paintRobinFront(ctx, paint, seed);
  else if (layer === 'robinBird') paintRobinBird(ctx, paint);
  ctx.restore();
}
