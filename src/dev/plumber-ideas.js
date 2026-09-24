// PLUMBER PANIC — the green hills it runs through (BAKE-OFF IDEAS, not wired into the
// game). Peter, 24 Sep 2026: "Create more ideas for the first 3 cabinets as well…
// background items, lane items, more animated background items would be nice… Be
// thorough and as detailed as possible for all items." And then, of the first round:
// "Instead of 'plumber' related items, since they're mostly super Mario ish, let's add
// countryside related stuff. We are running past nice green hills so how about stuff
// appropriate to that location."
//
// Same contract as src/dev/frost-ideas.js and neon-japan-ideas.js (see
// src/dev/idea-scene.js), one step further on: these are candidates that could ship,
// not sketches.
//
//   bg   — screen space over the shipped backdrop, and they WEAR THE BACKDROP'S
//          FINISH: every shape is a paper cutout (deep lift, contact edge, flat fill,
//          fibre grain, white rim), in the scenery's muted palette. A bright flat
//          shape on this cabinet's paper sky reads as a sticker on the glass.
//   lane — world space, the props language of src/sprites/props.js: flat fills,
//          a soft hue-matched contour, the shared soft contact shadow.
//   air  — as lane, at a flyer's height.
//
// Everything that is scenery is SEATED: planted on the near ridge with ridgeYAt (and
// clipped to the sky side of it, the way the baked trees are), sunk behind the near
// hills (clipped above the ridge line), filling a dip in the ridge, or flying — and
// parallaxed by its depth. The near ridge already carries trees, flowers, grass,
// bushes, fences and a house; these add farm life to that rather than repeat it.
import { W } from '../engine/renderer.js';
import { GROUND_Y, ZOOM } from '../engine/camera.js';
import { ridgeYAt, __testing as SCENERY } from '../engine/stylePacks/index.js';
import { paperTextureSource, PAPER_PATTERN_SCALE } from '../engine/paper-material.js';
import { rr } from '../sprites/props.js';
import { drawSoftContactShadow } from '../engine/shadows.js';
import {
  drawPlumberBarn, drawPlumberPatchwork, drawPlumberBalloon, drawPlumberWindmill, drawPlumberSheep,
} from '../engine/stylePacks/plumberLandmarks.js';


const TAU = Math.PI * 2;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (v) => { const k = clamp01(v); return k * k * (3 - 2 * k); };
// Deterministic 0..1 from an integer-ish seed — never Math.random at draw time.
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ------------------------------------------------------------ the backdrop's geometry
// Landscape composition, as the pixel pack draws it with no portrait context: the
// whole country layer is lifted 34px (PLUMBER_LANDSCAPE_SCENERY_LIFT), the near ridge
// is |sin| hills of amp 34 / wavelength 50 at parallax 0.35, the far range is the
// peaked profile of amp 96 / wavelength 200 at 0.15. Reading the ridge through
// ridgeYAt is what keeps a planted thing on the pixel the tile actually put there.
const LIFT = -34;
const NEAR_F = 0.35;
const NEAR_PERIOD = Math.round(Math.PI * 50);   // 157: the near ridge's tile
const nearY = (x, camX) => ridgeYAt(x, camX, GROUND_Y, 34, 50, NEAR_F) + LIFT;
// Screen travel of a layer at parallax `f` — the pack scales every factor by ZOOM.
const travel = (camX, f) => camX * f * ZOOM;
// Wrap into [-pad, span - pad). With `span` a multiple of NEAR_PERIOD a near-ridge
// prop always lands on the same phase of the ridge, so a hilltop prop stays on a top.
function wrapX(base, camX, f, span = 628, pad = 80) {
  const v = base - travel(camX, f) + pad;
  return ((v % span) + span) % span - pad;
}
// The near ridge's crest x for a planted prop: a top of the |sin| hill sits at
// phase 78.5 of the 157px tile, so a base of 78.5 + k*157 is always a summit, and
// k*157 is always the bottom of a valley.
const summit = (k) => NEAR_PERIOD * 0.5 + k * NEAR_PERIOD; // 78.5 + k*157
const valley = (k) => k * NEAR_PERIOD;

// Clip to the SKY side of the near ridge between x0 and x1, `bite` px into the hill,
// so a planted foot is cut by the ground line itself at every x (the tree trick).
function clipAboveNear(ctx, camX, x0, x1, bite = 1, top = -400) {
  ctx.beginPath();
  ctx.moveTo(x0, top);
  ctx.lineTo(x1, top);
  for (let x = x1; x >= x0 - 0.01; x -= 2) ctx.lineTo(x, nearY(x, camX) + bite);
  ctx.closePath();
  ctx.clip();
}
// ------------------------------------------------------------ the near ridge, again
// A bg idea is painted after the whole backdrop, so anything FAR — behind the near
// hills — would cover the trees and flowers the near ridge carries above its crest.
// Clipping to the sky side of the ridge keeps the hill body in front; this puts the
// ridge's own standing things back in front too, redrawn from the same recipes the
// pack bakes them with (ridgeTreeSamples' trees; the flower and grass sprites of
// plumberScenerySprite, at the placements the pack exports for its tests). A far idea
// that shipped would be drawn inside the pack, before the near layer, and not need it.
const NEAR_TREE = { leaf: '#3c8c4c', trunk: '#6b4a30', scale: 1.45 };
const NEAR_TREES = (() => {
  const n = Math.max(2, Math.round(NEAR_PERIOD / 38));
  const out = [];
  for (let i = 0; i < n; i++) {
    const j = Math.sin(i * 12.9898) * 43758.5453, f = j - Math.floor(j);
    const k = Math.sin(i * 78.233 + 1.7) * 24634.6345, g = k - Math.floor(k);
    out.push({ tx: ((i + 0.2 + g * 0.6) / n) * NEAR_PERIOD, th: (9 + f * 5) * NEAR_TREE.scale, broadleaf: g >= 0.45 });
  }
  return out;
})();
const RIDGE_PROP = { stem: '#4f8650', leaf: '#6d9c55', petal: '#eee4bf', petalPink: '#cf8d9c', pollen: '#bd9546' };
function nearRidgeOverlay(ctx, camX, xa, xb) {
  const off = ((travel(camX, NEAR_F) % NEAR_PERIOD) + NEAR_PERIOD) % NEAR_PERIOD;
  ctx.save();
  for (let k = Math.floor((xa + off) / NEAR_PERIOD) - 1; k <= Math.ceil((xb + off) / NEAR_PERIOD) + 1; k++) {
    for (const { tx, th, broadleaf } of NEAR_TREES) {
      const cx = -off + k * NEAR_PERIOD + tx;
      if (cx < xa - 14 || cx > xb + 14) continue;
      const by = nearY(cx, camX) + 1;
      ctx.save();
      clipAboveNear(ctx, camX, cx - th * 0.1 - 2, cx + th * 0.1 + 2, 0);
      ctx.fillStyle = NEAR_TREE.trunk;
      ctx.fillRect(cx - th * 0.07, by - th * 0.55, th * 0.14, th * 0.55 + 4);
      ctx.restore();
      ctx.fillStyle = NEAR_TREE.leaf;
      if (!broadleaf) {
        const w = th * 0.34;
        ctx.beginPath(); ctx.moveTo(cx, by - th); ctx.lineTo(cx + w * 0.72, by - th * 0.52); ctx.lineTo(cx - w * 0.72, by - th * 0.52); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx, by - th * 0.78); ctx.lineTo(cx + w, by - th * 0.22); ctx.lineTo(cx - w, by - th * 0.22); ctx.closePath(); ctx.fill();
      } else {
        const r = th * 0.3;
        // Five lobes, each its own path, exactly as the tile bakes them.
        for (const [px, py, rx, ry] of [[0, -0.72, 1, 1], [-0.85, -0.52, 0.78, 0.78], [0.85, -0.52, 0.78, 0.78], [-0.58, -0.64, 0.82, 0.58], [0.58, -0.64, 0.82, 0.58]]) {
          ctx.beginPath(); ctx.ellipse(cx + px * r, by + py * th, rx * r, ry * r, 0, 0, TAU); ctx.fill();
        }
      }
    }
  }
  // The flowers and grass the pack plants on the crest (its fences, bushes and houses
  // are embedded in the hill face, below the crest, and are never covered) — baked
  // once per variant like the pack's own sprites.
  const P = RIDGE_PROP;
  for (const p of SCENERY.plumberSceneryPlacements(ctx, camX, GROUND_Y)) {
    if ((p.kind !== 'flower' && p.kind !== 'grass') || p.x < xa - 12 || p.x > xb + 12) continue;
    const [w, h] = p.kind === 'flower' ? [20, 12] : [14, 9];
    const pink = p.kind === 'flower' && (p.variant % 3) === 2;
    ctx.save();
    ctx.translate(p.x - (w / 2) * p.scale, p.baseY + LIFT - h * p.scale);
    ctx.scale(p.scale, p.scale);
    baked(ctx, `ridge${p.kind}${pink ? 1 : 0}`, -3, -3, w + 6, h + 6, (g) => {
      if (p.kind === 'grass') {
        for (const [gx, lean, c] of [[3, -2, P.stem], [7, 1, P.leaf], [11, -1, P.stem]]) flat(g, c, (q) => { q.moveTo(gx, h); q.lineTo(gx + lean, 1); q.lineTo(gx + 2.2, h); q.closePath(); });
        return;
      }
      for (const [fx, top] of [[4, 6], [10, 3.5], [16, 5.2]]) {
        line(g, P.stem, 0.8, (q) => { q.moveTo(fx, h); q.lineTo(fx + (fx % 3) - 1, top + 2); });
        flat(g, fx === 10 ? P.leaf : P.stem, (q) => { q.moveTo(fx + 0.1, top + 4.8); q.lineTo(fx + 3.2, top + 3.4); q.lineTo(fx + 1.1, top + 6.1); q.closePath(); });
      }
      for (const [fx, fy, r] of [[4, 4, 1.6], [10, 1.8, 1.9], [16, 3.2, 1.6]]) {
        const c = pink && fx === 16 ? P.petalPink : P.petal;
        for (const [ex, ey, rx, ry] of [[fx - r, fy, r * 0.95, r * 0.58], [fx + r, fy, r * 0.95, r * 0.58], [fx, fy - r * 0.78, r * 0.58, r * 0.95], [fx, fy + r * 0.78, r * 0.58, r * 0.95]]) {
          cut(g, (q) => q.ellipse(ex, ey, rx, ry, 0, 0, TAU), c);
        }
        cut(g, (q) => q.ellipse(fx, fy, r * 0.62, r * 0.62, 0, 0, TAU), P.pollen);
      }
    });
    ctx.restore();
  }
  ctx.restore();
}

// ------------------------------------------------------------ baking
// The static body of a big prop is painted once into a canvas at the context's
// device scale and blitted after that — the way plumberScenerySprite bakes the
// ridge props — so only what moves is drawn live. Keyed by that scale, so a density
// change (the renderer's ladder, a gallery at 2x) re-bakes instead of blurring.
// `draw` paints in the prop's local space; the box is that space's extent.
const bakes = new Map();
function deviceScale(ctx) {
  const m = typeof ctx.getTransform === 'function' ? ctx.getTransform() : null;
  const s = m ? Math.hypot(m.a, m.b) : 1;
  return Math.max(1, Math.min(6, Math.round(s * 4) / 4));
}
function baked(ctx, key, x0, y0, w, h, draw) {
  const s = deviceScale(ctx);
  const id = `${key}@${s}`;
  let c = bakes.get(id);
  if (c === undefined) {
    c = null;
    if (typeof document !== 'undefined') {
      const cv = document.createElement('canvas');
      cv.width = Math.ceil(w * s); cv.height = Math.ceil(h * s);
      const g = cv.getContext('2d');
      if (g) { g.setTransform(s, 0, 0, s, -x0 * s, -y0 * s); draw(g); c = cv; }
    }
    bakes.set(id, c);
  }
  if (c) ctx.drawImage(c, x0, y0, w, h);
  else draw(ctx);
}

// ------------------------------------------------------------ the paper cutout
// plumberSceneryFill with paper on, reproduced locally: a deep lift (x+1, y+2), a
// contact edge (x+.35, y+.75), the flat colour, the fibre sheet and a white rim. The
// grain pattern is built once per context from the shared fibre tile and anchored in
// the painter's LOCAL space, so it travels with a moving cutout instead of swimming
// through it.
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
function pathOf(fn) { const p = new Path2D(); fn(p); return p; }
// One paper sheet. `o.lift` scales the drop (0 = glued flat to the sheet beneath it,
// for a panel that is part of the same card), `o.rim` false or a width.
// `o.rot` is the rotation already on the context (a turning sail) and `o.fx` a
// mirror (-1): the drop is un-rotated and un-mirrored, so every sheet still lifts
// down and to the right of the page. `o.rimUnder` strokes the rim BEFORE the fill, at
// twice the width, for a shape built of overlapping lobes (a tree crown): the fill
// then covers every arc buried inside the union and only the silhouette keeps a rim.
function cut(ctx, fn, fill, o = {}) {
  const p = fn instanceof Path2D ? fn : pathOf(fn);
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
// A flat tone laid INSIDE a sheet (shade side, light edge, a band): clipped to the
// parent so it can never spill, no lift and no rim — it is ink on the card, so the
// fibre sheet goes back over it and the card's texture runs straight through.
function tone(ctx, parent, fn, fill, grained = true) {
  const p = fn instanceof Path2D ? fn : pathOf(fn);
  ctx.save();
  ctx.clip(parent);
  ctx.fillStyle = fill;
  ctx.fill(p);
  const pat = grained ? grain(ctx) : null;
  if (pat) { ctx.fillStyle = pat; ctx.fill(p); }
  ctx.restore();
}
// A puff of smoke or mist: three lobes whose layout comes from the seed.
function puffShape(c, cx, cy, r, seed) {
  c.moveTo(cx + r, cy); c.arc(cx, cy, r, 0, TAU);
  for (let k = 0; k < 3; k++) {
    const a = seed * 1.9 + k * 2.1;
    const lx = cx + Math.cos(a) * r * 0.75, ly = cy + Math.sin(a) * r * 0.5, lr = r * 0.66;
    c.moveTo(lx + lr, ly); c.arc(lx, ly, lr, 0, TAU);
  }
}
// A smoke puff as ONE sheet: baked opaque at a reference radius (the lobes are
// self-similar in r) and faded at the blit, so a fading puff never shows its own
// shadow and rim through its body the way a translucent live cutout does.
const PUFF_R = 7;
function puff(ctx, x, y, r, seed, alpha, fill = '#f2f1ec') {
  if (alpha <= 0 || r <= 0) return;
  const k = r / PUFF_R;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(k, k);
  baked(ctx, `puff${((seed % 5) + 5) % 5}${fill}`, -PUFF_R * 2, -PUFF_R * 1.7, PUFF_R * 4.2, PUFF_R * 3.7,
    (g) => cut(g, (c) => puffShape(c, 0, 0, PUFF_R, ((seed % 5) + 5) % 5), fill, { lift: 0.9, rim: 0.9 }));
  ctx.restore();
}
function line(ctx, color, width, fn) {
  ctx.beginPath(); fn(ctx);
  ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.stroke();
}
function glow(ctx, x, y, r, rgb, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(0.45, `rgba(${rgb},${a * 0.45})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

// ------------------------------------------------------------ the props language
// Lane and air ideas: a flat fill under a hue-matched contour, at the weight the
// standing hazards in props.js draw theirs (about 0.6 world px round the silhouette,
// thinner inside).
function ink(ctx, fill, stroke, width, fn) {
  ctx.beginPath(); fn(ctx);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) {
    ctx.strokeStyle = stroke; ctx.lineWidth = width;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.stroke();
  }
}
function flat(ctx, fill, fn) { ctx.beginPath(); fn(ctx); ctx.fillStyle = fill; ctx.fill(); }
function dot(ctx, x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.05, r), 0, TAU); ctx.fillStyle = fill; ctx.fill(); }
// The contact shadow drawWorldEntity puts under every grounded hazard.
function contact(ctx, x, g, rx, alpha = 0.34) {
  drawSoftContactShadow(ctx, x, g - 1, Math.max(5, rx), 2.4, { alpha });
}

// ====================================================================== background

// ---- THE PRODUCTION LANDMARKS --------------------------------------------------
// Peter picked the barn, the patchwork, the balloon, the windmill and the flock for the
// game, so their art now lives in src/engine/stylePacks/plumberLandmarks.js and these
// cards are only the gallery's placement round it: the harness's own wrapping, its
// landscape lift and the ridge seat. The windmill is the production one, 0.75 of the
// size it was bid at, on its mound.
const seatAt = (camX) => ({
  near: (x) => nearY(x, camX),
  far: (x) => ridgeYAt(x, camX, GROUND_Y, 96, 200, 0.15, { peak: true }) + LIFT,
});
function windmill(ctx, t, camX) {
  drawPlumberWindmill(ctx, t, wrapX(summit(2), camX, NEAR_F), seatAt(camX), true);
}
function balloon(ctx, t, camX) {
  const x = wrapX(252 - t * 4.5, camX, 0.12, 900, 60);
  drawPlumberBalloon(ctx, t, x, 76 + Math.sin(t * 0.45) * 4 - 26);
}
function sheepFlock(ctx, t, camX) {
  drawPlumberSheep(ctx, t, wrapX(summit(2) + 4, camX, NEAR_F), seatAt(camX), true);
}
function barn(ctx, t, camX) {
  drawPlumberBarn(ctx, t, wrapX(summit(1) + 2, camX, NEAR_F), seatAt(camX), true);
}
function patchworkFields(ctx, t, camX) {
  drawPlumberPatchwork(ctx, t, camX, seatAt(camX), true, 1, { nearTop: GROUND_Y + LIFT - 34 });
  // A bg idea paints after the whole backdrop, so the near crest's trees and flowers
  // go back on top; in the game the bands are drawn under the near layer instead.
  nearRidgeOverlay(ctx, camX, -20, W + 20);
}

// ---- THE WATERFALL ------------------------------------------------------------
// A sandstone bluff between the range and the near hills with a river pouring off a
// notch in its top. The plunge pool is behind the near ridge: what shows is the
// churn cresting the hill line, the mist rolling off it, and a faint bow in the mist.
const FALLS = {
  rock: '#ad9a7f', rockShade: '#937f66', rockLight: '#c3b193', strata: 'rgba(110,88,64,0.2)',
  crack: 'rgba(92,74,54,0.45)', grass: '#5fac57', grassLight: '#78bd66', water: '#8ed1ef',
  waterMid: '#b6e3f6', streak: '#e9f8fd', lip: '#d8f2fb',
};
const RAINBOW = ['#ff6a5a', '#ffae47', '#ffe56a', '#7fd67b', '#67b6f0', '#9a86e0'];
function waterfall(ctx, t, camX) {
  const P = FALLS;
  const x = wrapX(236, camX, 0.25, 760, 120);
  const top = 98;
  ctx.save();
  clipAboveNear(ctx, camX, x - 120, x + 120, 0);
  ctx.translate(x, top);
  const TOP = [[-48, 2.5], [-31, -1.2], [-13, 0], [-10.5, 4.2], [10.5, 4.2], [13, -0.5], [28, -2.8], [43, 0.6]];
  const edgeY = (xx) => {
    for (let i = 0; i < TOP.length - 1; i++) {
      const [ax, ay] = TOP[i], [bx, by] = TOP[i + 1];
      if (xx >= ax && xx <= bx) return lerp(ay, by, (xx - ax) / (bx - ax));
    }
    return xx < 0 ? TOP[0][1] : TOP[TOP.length - 1][1];
  };
  baked(ctx, 'bluff', -74, -18, 146, 172, (ctx) => {
    const cliff = cut(ctx, (c) => {
      c.moveTo(-68, 150); c.lineTo(-63, 72); c.lineTo(-59, 36); c.lineTo(-54, 13);
      for (const [px, py] of TOP) c.lineTo(px, py);
      c.lineTo(50.5, 11); c.lineTo(55.5, 38); c.lineTo(60.5, 78); c.lineTo(65, 150);
      c.closePath();
    }, P.rock, { lift: 1.5 });
    tone(ctx, cliff, (c) => { c.moveTo(-70, 150); c.lineTo(-65, 72); c.lineTo(-61, 36); c.lineTo(-56, 13); c.lineTo(-50, 1); c.lineTo(-44, 3); c.lineTo(-49, 16); c.lineTo(-53, 40); c.lineTo(-56, 76); c.lineTo(-59, 150); c.closePath(); }, P.rockLight);
    tone(ctx, cliff, (c) => { c.moveTo(29, 150); c.lineTo(33, 62); c.lineTo(35, 22); c.lineTo(39, -4); c.lineTo(70, -4); c.lineTo(70, 150); c.closePath(); }, P.rockShade);
    for (const [sy, amp, ph] of [[17, 1.2, 0.3], [33, 1.6, 1.9], [52, 1.3, 3.1], [73, 1.8, 4.4], [97, 1.4, 0.9]]) {
      tone(ctx, cliff, (c) => {
        c.moveTo(-80, sy);
        for (let xx = -80; xx <= 80; xx += 6) c.lineTo(xx, sy + Math.sin(xx * 0.09 + ph) * amp);
        for (let xx = 80; xx >= -80; xx -= 6) c.lineTo(xx, sy + 3.4 + Math.sin(xx * 0.12 + ph + 1) * amp);
        c.closePath();
      }, P.strata, false);
    }
    line(ctx, P.crack, 0.55, (c) => {
      c.moveTo(-36, 6); c.lineTo(-38, 14); c.lineTo(-35, 21); c.lineTo(-37, 30);
      c.moveTo(24, 8); c.lineTo(26, 17); c.lineTo(23, 25);
      c.moveTo(-27, 58); c.lineTo(-25, 68); c.lineTo(-28, 79);
      c.moveTo(39, 44); c.lineTo(37, 56); c.lineTo(40, 63);
    });
    // The turf on top, overhanging the rock in little scallops.
    for (const [a, b] of [[-49, -11.5], [11.5, 44]]) {
      const turf = cut(ctx, (c) => {
        c.moveTo(a, edgeY(a) - 1.4);
        for (let xx = a; xx <= b; xx += 1) c.lineTo(xx, edgeY(xx) - 1.4);
        for (let xx = b; xx >= a; xx -= 1) c.lineTo(xx, edgeY(xx) + 2.4 + Math.abs(Math.sin(xx * 0.55)) * 1.6);
        c.closePath();
      }, P.grass, { lift: 0.6, rim: 0.7 });
      tone(ctx, turf, (c) => { for (let xx = a; xx <= b; xx += 1) c.lineTo(xx, edgeY(xx) - 2); for (let xx = b; xx >= a; xx -= 1) c.lineTo(xx, edgeY(xx) - 0.1); c.closePath(); }, P.grassLight);
    }
    // Trees on the shoulders: two firs and a round crown.
    for (const [tx, s, kind] of [[-40, 1, 'fir'], [-34, 0.75, 'fir'], [-22, 1, 'round'], [34, 0.9, 'fir'], [23, 0.8, 'round']]) {
      const ty = edgeY(tx) - 0.5;
      cut(ctx, (c) => c.rect(tx - 0.7 * s, ty - 4 * s, 1.4 * s, 4.4 * s), '#6b4a30', { rim: false, lift: 0.4 });
      if (kind === 'fir') {
        cut(ctx, (c) => { c.moveTo(tx - 3.6 * s, ty - 3 * s); c.lineTo(tx, ty - 13 * s); c.lineTo(tx + 3.6 * s, ty - 3 * s); c.closePath(); }, '#3c8a4a', { rim: 0.7, lift: 0.7 });
      } else {
        const crown = cut(ctx, (c) => { c.arc(tx - 2.2 * s, ty - 6 * s, 2.8 * s, 0, TAU); c.moveTo(tx + 4.2 * s, ty - 6 * s); c.arc(tx + 2.2 * s, ty - 6 * s, 2.8 * s, 0, TAU); c.moveTo(tx + 3.4 * s, ty - 9 * s); c.arc(tx, ty - 9 * s, 3.4 * s, 0, TAU); }, '#3f914c', { rim: 0.7, lift: 0.7 });
        tone(ctx, crown, (c) => c.arc(tx - 1.2 * s, ty - 10.2 * s, 2 * s, 0, TAU), '#57a65a');
      }
    }
    // The river in its notch (the fall down the face is live, below).
    cut(ctx, (c) => { c.moveTo(-12.6, 1.4); c.quadraticCurveTo(0, -0.6, 12.6, 1.4); c.lineTo(10.6, 4.6); c.lineTo(-10.6, 4.6); c.closePath(); }, P.water, { lift: 0.4, rim: 0.7 });
  });
  const fy = nearY(x, camX) - top;
  const fall = pathOf((c) => {
    c.moveTo(-10.6, 3);
    for (let y = 3; y <= fy + 12; y += 3) c.lineTo(-10.6 - Math.min(1.3, y * 0.14) + (y > 14 ? 0.5 : 0) + Math.sin(y * 0.35 - t * 9) * 0.35, y);
    for (let y = fy + 12; y >= 3; y -= 3) c.lineTo(10.6 + Math.min(1.3, y * 0.14) - (y > 14 ? 0.5 : 0) + Math.sin(y * 0.31 - t * 8 + 2) * 0.35, y);
    c.closePath();
  });
  cut(ctx, fall, P.water, { lift: 1.1 });
  ctx.save();
  ctx.clip(fall);
  for (let i = 0; i < 7; i++) {
    const lx = -8.6 + i * 2.85 + Math.sin(i * 2.3) * 0.5;
    const speed = 64 + hash(i + 3) * 28;
    const per = 24 + hash(i + 9) * 14;
    const len = 8 + hash(i + 5) * 9;
    const off = (t * speed + hash(i) * per) % per;
    line(ctx, i % 3 === 1 ? P.waterMid : P.streak, i % 2 ? 1.15 : 0.8, (c) => {
      for (let y0 = off - per; y0 < fy + 16; y0 += per) { c.moveTo(lx, y0); c.lineTo(lx, y0 + len); }
    });
  }
  flat(ctx, P.lip, (c) => { c.moveTo(-12, 2.4); c.quadraticCurveTo(0, 0.6, 12, 2.4); c.lineTo(12, 7.4); c.quadraticCurveTo(0, 5.6, -12, 7.4); c.closePath(); });
  line(ctx, '#ffffff', 0.7, (c) => { c.moveTo(-9, 3.6); c.quadraticCurveTo(0, 2.2, 9, 3.6); });
  ctx.restore();
  // Mist off the plunge pool behind the ridge: soft, not paper — it is the one thing
  // here that is not a solid — rolling up and out from the churn, a bow standing in it.
  ctx.save();
  ctx.globalAlpha = 0.2 + 0.08 * Math.sin(t * 0.7);
  RAINBOW.forEach((col, i) => line(ctx, col, 1.35, (c) => c.arc(-4, fy + 12, 33 - i * 1.35, Math.PI * 1.1, Math.PI * 1.5)));
  ctx.restore();
  for (let i = 0; i < 8; i++) {
    const k = (t * 0.33 + i / 8) % 1;
    const side = i % 2 ? 1 : -1;
    const mx = side * (4 + k * (14 + hash(i) * 14));
    const my = fy - 3 - k * (16 + hash(i + 4) * 14);
    glow(ctx, mx, my, 7 + k * 10, '255,255,255', 0.55 * Math.sin(Math.PI * k));
  }
  // The churn: one foaming crest where the fall meets the pool, heads rolling.
  const churn = pathOf((c) => {
    for (let i = 0; i < 7; i++) {
      const cx = -13 + i * 4.3 + Math.sin(t * 3.1 + i * 2.3) * 0.6;
      const r = 2.6 + (i === 0 || i === 6 ? 0 : 1.1) + Math.sin(t * 5.3 + i * 1.9) * 0.8;
      c.moveTo(cx + r, fy); c.arc(cx, fy - 0.5 + Math.sin(t * 4.1 + i * 2.2) * 0.7, r, 0, TAU);
    }
  });
  cut(ctx, churn, '#f5fcff', { lift: 0.4, rim: 0.6 });
  tone(ctx, churn, (c) => c.rect(-20, fy + 0.3, 40, 8), '#d4eef9');
  for (let i = 0; i < 6; i++) {
    const k = (t * 1.3 + i / 6) % 1;
    const a = -Math.PI / 2 + (i - 2.5) * 0.42;
    const px = Math.cos(a) * 16 * k + (i - 2.5) * 2.2;
    const py = fy - 2 + Math.sin(a) * 13 * k + 22 * k * k;
    dot(ctx, px, py, 0.8 * (1 - k * 0.5), `rgba(255,255,255,${0.9 * (1 - k)})`);
  }
  ctx.restore();
  // The near crest's trees and flowers stand in front of the bluff, as they do for the
  // viaduct and the patchwork.
  nearRidgeOverlay(ctx, camX, x - 120, x + 120);
}

// ---- THE TRACTOR ------------------------------------------------------------------
// A red tractor with a trailer of hay bales, driving the ridge. Every wheel stands on
// the crest line where it is, so the rig climbs, tips over the top and noses down the
// far side of each hill; its tyres turn by the distance driven, its stack puffs, and
// the farmer in his cap rides it all out.
const TRAC = {
  body: '#c8473b', bodyShade: '#a3372e', bodyLight: '#e2705c', grille: '#3f3834', tyre: '#34302c',
  tread: '#4d4741', hub: '#e8b84a', hubShade: '#c29232', frame: '#3a3634', seat: '#2e2a28',
  stack: '#5a544e', farmer: '#3f6aa0', farmerShade: '#2f5280', skin: '#f0c49a', cap: '#6b5a3c',
  bed: '#a57d52', bedShade: '#83613f', bale: '#e2c46a', baleShade: '#c4a24c', twine: '#c8553a',
};
function farmWheel(ctx, cx, cy, r, rot, hubR, o) {
  const P = TRAC;
  const tyre = cut(ctx, (c) => c.arc(cx, cy, r, 0, TAU), P.tyre, { ...o, lift: 0.5, rim: 0.5 });
  ctx.save();
  ctx.clip(tyre);
  const n = Math.max(8, Math.round(r * 2.6));
  for (let i = 0; i < n; i++) {
    const a = rot + (i * TAU) / n;
    flat(ctx, P.tread, (c) => {
      c.moveTo(cx + Math.cos(a) * r * 0.76, cy + Math.sin(a) * r * 0.76);
      c.lineTo(cx + Math.cos(a + 0.1) * r * 1.05, cy + Math.sin(a + 0.1) * r * 1.05);
      c.lineTo(cx + Math.cos(a + 0.26) * r * 1.05, cy + Math.sin(a + 0.26) * r * 1.05);
      c.lineTo(cx + Math.cos(a + 0.16) * r * 0.76, cy + Math.sin(a + 0.16) * r * 0.76);
      c.closePath();
    });
  }
  ctx.restore();
  const hub = cut(ctx, (c) => c.arc(cx, cy, hubR, 0, TAU), P.hub, { ...o, lift: 0.3, rim: 0.4 });
  tone(ctx, hub, (c) => c.arc(cx + hubR * 0.35, cy + hubR * 0.35, hubR * 0.85, 0, TAU), P.hubShade);
  for (let i = 0; i < 5; i++) {
    const a = rot + (i * TAU) / 5;
    dot(ctx, cx + Math.cos(a) * hubR * 0.58, cy + Math.sin(a) * hubR * 0.58, hubR * 0.15, '#6a5020');
  }
  dot(ctx, cx, cy, hubR * 0.26, P.hubShade);
}
function tractorRig(ctx, t, camX) {
  const P = TRAC;
  const speed = 13;
  const drive = t * speed;
  const xr = wrapX(318 + drive, camX, NEAR_F, 900, 110);
  const rR = 5.4, rF = 3.4, base = 13.5;
  const xf = xr + base;
  const yr = nearY(xr, camX), yf = nearY(xf, camX);
  const th = Math.atan2(yf - yr, xf - xr);
  const L = Math.hypot(xf - xr, yf - yr);
  const cs = Math.cos(th), sn = Math.sin(th);
  const toWorld = (lx, ly) => [xr + lx * cs - ly * sn, yr + lx * sn + ly * cs];
  const [hx, hy] = toWorld(-7.4, -3.4);
  const rT = 3.1;
  const xt = xr - 22.5;
  const ax = xt, ay = nearY(xt, camX) - rT;
  const ph = Math.atan2(hy - ay, hx - ax);
  const dl = Math.hypot(hx - ax, hy - ay);
  const [sx, sy] = toWorld(L - 2.6, -18.2);
  ctx.save();
  // Exhaust first, so the rig drives out from in front of its own smoke.
  for (let j = 0; j < 7; j++) {
    const age = ((t * 1.6 + j / 7) % 1) * 1.5;
    puff(ctx, sx - age * (speed + 5), sy - age * 9, 0.9 + age * 2.6, j, 0.65 * (1 - age / 1.5) * Math.min(1, age * 5), '#ebe8e2');
  }
  ctx.save();
  clipAboveNear(ctx, camX, xt - 20, xf + 16, 1.2);
  // The trailer: axle on the ridge behind, drawbar up to the tractor's hitch.
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(ph);
  const to = { rot: ph };
  line(ctx, P.frame, 1, (c) => { c.moveTo(6.5, -1.2); c.lineTo(dl, 0); });
  const bed = cut(ctx, (c) => { c.rect(-9.5, -4.6, 17, 2.8); }, P.bed, { ...to, lift: 0.6, rim: 0.6 });
  tone(ctx, bed, (c) => c.rect(-10, -3, 18, 2), P.bedShade);
  for (const [bx, by, bw] of [[-9, -10.4, 7.8], [-0.6, -10.4, 7.8], [-5, -16, 8]]) {
    const bale = cut(ctx, (c) => rr(c, bx, by, bw, 5.8, 1), P.bale, { ...to, lift: 0.6, rim: 0.6 });
    tone(ctx, bale, (c) => c.rect(bx, by + 4.2, bw + 1, 2), P.baleShade);
    line(ctx, P.twine, 0.45, (c) => { c.moveTo(bx + bw * 0.28, by); c.lineTo(bx + bw * 0.28, by + 5.8); c.moveTo(bx + bw * 0.72, by); c.lineTo(bx + bw * 0.72, by + 5.8); });
  }
  farmWheel(ctx, 0, 0, rT, drive / rT, 1.4, to);
  ctx.restore();
  // The tractor, in the frame of the line between its two wheel contacts.
  ctx.save();
  ctx.translate(xr, yr);
  ctx.rotate(th);
  const o = { rot: th };
  line(ctx, P.frame, 1.1, (c) => { c.moveTo(-7.4, -3.4); c.lineTo(-2, -4.2); });
  // Roll frame and canopy over the seat.
  line(ctx, P.frame, 0.9, (c) => { c.moveTo(-4.2, -11.2); c.lineTo(-4.6, -20); c.moveTo(3, -11.4); c.lineTo(3.4, -20); });
  cut(ctx, (c) => rr(c, -5.8, -21.4, 10.4, 1.7, 0.6), P.body, { ...o, lift: 0.5, rim: 0.5 });
  // The farmer: overalls, flat cap, a hand on the wheel.
  const bob = Math.sin(t * 7) * 0.25;
  cut(ctx, (c) => rr(c, -3.2, -13.2, 3.1, 2.1, 0.5), P.seat, { ...o, lift: 0.3, rim: false });
  const torso = cut(ctx, (c) => rr(c, -2.4, -17.6 + bob, 3, 5.4, 1.2), P.farmer, { ...o, lift: 0.4, rim: 0.5 });
  tone(ctx, torso, (c) => c.rect(-0.2, -18 + bob, 2, 6), P.farmerShade);
  cut(ctx, (c) => c.arc(-0.8, -18.6 + bob, 1.45, 0, TAU), P.skin, { ...o, lift: 0.3, rim: 0.4 });
  cut(ctx, (c) => { c.moveTo(-2.4, -19.2 + bob); c.quadraticCurveTo(-1.4, -21 + bob, 0.4, -19.9 + bob); c.lineTo(1.6, -19.4 + bob); c.lineTo(0.4, -19.1 + bob); c.closePath(); }, P.cap, { ...o, lift: 0.3, rim: 0.4 });
  line(ctx, P.farmer, 0.9, (c) => { c.moveTo(0, -16.2 + bob); c.lineTo(2.7, -14.6); });
  line(ctx, P.frame, 0.6, (c) => { c.moveTo(1.6, -11.6); c.lineTo(3, -14.4); });
  line(ctx, P.frame, 0.7, (c) => c.ellipse(3, -14.6, 0.45, 1.3, 0.35, 0, TAU));
  // Engine block, bonnet, grille and lamp.
  cut(ctx, (c) => c.rect(2.5, -6.8, L - 3.2, 3.4), P.grille, { ...o, lift: 0.4, rim: false });
  const hood = cut(ctx, (c) => { c.moveTo(1, -6.2); c.lineTo(1, -11.8); c.lineTo(L + 1.6, -11.2); c.quadraticCurveTo(L + 3.4, -11, L + 3.4, -9.4); c.lineTo(L + 3.4, -6.2); c.closePath(); }, P.body, { ...o, lift: 0.8 });
  tone(ctx, hood, (c) => c.rect(0, -8, L + 5, 2.2), P.bodyShade);
  tone(ctx, hood, (c) => c.rect(0, -11.9, L + 5, 1.1), P.bodyLight);
  line(ctx, P.grille, 0.4, (c) => { for (let yy = -10.2; yy < -6.6; yy += 1.1) { c.moveTo(L + 2.4, yy); c.lineTo(L + 3.3, yy); } });
  dot(ctx, L + 2.6, -10.6, 0.6, '#ffe48a');
  // Exhaust stack, with a rain flap that flutters on its hinge.
  line(ctx, P.stack, 1.1, (c) => { c.moveTo(L - 2.6, -11.6); c.lineTo(L - 2.6, -17.6); });
  const flap = 0.35 + Math.abs(Math.sin(t * 11)) * 0.5;
  line(ctx, P.stack, 0.55, (c) => { c.moveTo(L - 3.2, -17.8); c.lineTo(L - 3.2 + Math.cos(flap) * 1.5, -17.8 - Math.sin(flap) * 1.5); });
  // Rear mudguard over the big wheel, then the wheels.
  cut(ctx, (c) => { c.arc(0, -rR, rR + 1.9, Math.PI * 1.02, Math.PI * 1.98); c.arc(0, -rR, rR + 0.8, Math.PI * 1.98, Math.PI * 1.02, true); c.closePath(); }, P.body, { ...o, lift: 0.5, rim: 0.5 });
  farmWheel(ctx, 0, -rR, rR, drive / rR, 2.6, o);
  farmWheel(ctx, L, -rF, rF, drive / rF, 1.6, o);
  ctx.restore();
  ctx.restore();
  // A little dust kicked up behind the big wheel.
  for (let j = 0; j < 3; j++) {
    const age = ((t * 2.3 + j / 3) % 1) * 0.8;
    ctx.save();
    ctx.globalAlpha = 0.45 * (1 - age / 0.8);
    cut(ctx, (c) => c.arc(xr - 4 - age * 10, yr - 1 - age * 3, 0.9 + age * 2, 0, TAU), '#c9b48a', { lift: 0, rim: false });
    ctx.restore();
  }
  ctx.restore();
}

// ---- THE BRANCH LINE -----------------------------------------------------------------
// A stone viaduct across a valley between two green knolls, a tunnel mouth in each.
// A little tank engine and two carriages come out of one tunnel, puff across the arches
// and go into the other; the smoke is born where the chimney was, so it trails. The
// whole piece sits behind the near hills at parallax 0.2.
const RAIL = {
  hill: '#62ad5c', hillLight: '#7cbf6c', stone: '#c5bba7', stoneShade: '#a89e8b', stoneDark: '#918876',
  portal: '#2e2a27', ring: '#b3a893', engine: '#3d6a4c', engineShade: '#2d5039', engineLight: '#5c8c68',
  brass: '#d7b35f', red: '#b8463a', black: '#2a2624', coach: '#8e3b36', coachShade: '#72302c',
  cream: '#ece0c4', roof: '#6f6a66', lit: '#ffd46e', rail: '#5e5750',
};
const VIADUCT_ARCHES = [-43.2, -21.6, 0, 21.6, 43.2];
function viaductBody(ctx) {
  const P = RAIL;
  // The knolls either side, each with a tunnel mouth set into its flank at deck level.
  const SEGS = [[[128, 110], [124, 30], [112, -24], [94, -27]], [[94, -27], [80, -29], [70, -18], [64, -8]], [[64, -8], [58, 2], [55, 20], [54, 110]]];
  const knoll = (c, s) => {
    c.moveTo(s * 128, 110);
    for (const [, a, b, e] of SEGS) c.bezierCurveTo(s * a[0], a[1], s * b[0], b[1], s * e[0], e[1]);
    c.closePath();
  };
  // The knoll's top at a given |x|, from its own curves, so a tree can stand on it.
  const top = [];
  for (const [p0, a, b, e] of SEGS) {
    for (let i = 0; i <= 24; i++) {
      const u = i / 24, v = 1 - u;
      top.push([v * v * v * p0[0] + 3 * v * v * u * a[0] + 3 * v * u * u * b[0] + u * u * u * e[0],
        v * v * v * p0[1] + 3 * v * v * u * a[1] + 3 * v * u * u * b[1] + u * u * u * e[1]]);
    }
  }
  const knollTop = (ax) => {
    let best = 1e9;
    for (let i = 0; i < top.length - 1; i++) {
      const [x0, y0] = top[i], [x1, y1] = top[i + 1];
      if ((ax - x0) * (ax - x1) <= 0 && x0 !== x1) best = Math.min(best, lerp(y0, y1, (ax - x0) / (x1 - x0)));
    }
    return best;
  };
  for (const s of [-1, 1]) {
    const kp = pathOf((c) => knoll(c, s));
    const k = cut(ctx, kp, P.hill, { lift: 1.3 });
    tone(ctx, k, (c) => c.ellipse(s * 96, -20, 22, 6, s * 0.08, 0, TAU), P.hillLight);
    // A few round trees on the knolls, the scenery's own recipe, trunks cut by the
    // ground line.
    for (const [ax, sc] of [[104, 0.9], [86, 0.75], [116, 0.8]]) {
      const tx = s * ax, ty = knollTop(ax) + 1;
      ctx.save();
      ctx.beginPath(); ctx.rect(tx - 4, ty - 20, 8, 20.5); ctx.clip();
      cut(ctx, (c) => c.rect(tx - 0.7 * sc, ty - 4.5 * sc, 1.4 * sc, 7 * sc), '#6b4a30', { rim: false, lift: 0.4 });
      ctx.restore();
      ctx.save(); ctx.clip(kp); tone(ctx, kp, (c) => c.ellipse(tx, ty + 0.6, 2.4 * sc, 0.7 * sc, 0, 0, TAU), '#4f9a4f'); ctx.restore();
      const crown = cut(ctx, (c) => { c.arc(tx - 2.6 * sc, ty - 6.2 * sc, 3 * sc, 0, TAU); c.moveTo(tx + 5.6 * sc, ty - 6.2 * sc); c.arc(tx + 2.6 * sc, ty - 6.2 * sc, 3 * sc, 0, TAU); c.moveTo(tx + 3.8 * sc, ty - 9.2 * sc); c.arc(tx, ty - 9.2 * sc, 3.8 * sc, 0, TAU); }, '#3f914c', { rim: 0.7, lift: 0.7, rimUnder: true });
      tone(ctx, crown, (c) => c.arc(tx - 1.2 * sc, ty - 10.4 * sc, 2.2 * sc, 0, TAU), '#57a65a');
    }
  }
  // The viaduct: a stone sheet with the arches cut out of it (they wind the other way,
  // so the sky shows through), a parapet along its top and the rails on it.
  const via = cut(ctx, (c) => {
    c.moveTo(-60, -2.6); c.lineTo(60, -2.6); c.lineTo(60, 110); c.lineTo(-60, 110); c.closePath();
    for (const ax of VIADUCT_ARCHES) {
      c.moveTo(ax - 8.4, 110); c.lineTo(ax + 8.4, 110); c.lineTo(ax + 8.4, 15.5);
      c.arc(ax, 15.5, 8.4, 0, Math.PI, true); c.lineTo(ax - 8.4, 110); c.closePath();
    }
  }, P.stone, { lift: 1.1 });
  for (const ax of VIADUCT_ARCHES) {
    tone(ctx, via, (c) => { c.moveTo(ax - 11, 110); c.lineTo(ax - 11, 15.5); c.arc(ax, 15.5, 11, Math.PI, 0); c.lineTo(ax + 11, 110); c.lineTo(ax + 8.4, 110); c.lineTo(ax + 8.4, 15.5); c.arc(ax, 15.5, 8.4, 0, Math.PI, true); c.lineTo(ax - 8.4, 110); c.closePath(); }, P.stoneShade);
    line(ctx, P.stoneDark, 0.5, (c) => { for (let k = 0; k <= 8; k++) { const a = Math.PI + (k / 8) * Math.PI; c.moveTo(ax + Math.cos(a) * 8.4, 15.5 + Math.sin(a) * 8.4); c.lineTo(ax + Math.cos(a) * 11, 15.5 + Math.sin(a) * 11); } });
  }
  tone(ctx, via, (c) => c.rect(-62, -3, 124, 2.4), P.stoneDark);
  line(ctx, 'rgba(120,110,94,0.35)', 0.4, (c) => { for (let y = 6; y < 60; y += 5) { c.moveTo(-60, y); c.lineTo(60, y); } });
  // Tunnel mouths: a dressed stone ring round a dark bore.
  for (const s of [-1, 1]) {
    const px = s * 63.5;
    cut(ctx, (c) => { c.moveTo(px - 8.2, 0.4); c.lineTo(px - 8.2, -8.6); c.arc(px, -8.6, 8.2, Math.PI, 0); c.lineTo(px + 8.2, 0.4); c.closePath(); }, P.ring, { lift: 0.7, rim: 0.7 });
    cut(ctx, (c) => { c.moveTo(px - 6, 0.4); c.lineTo(px - 6, -8.2); c.arc(px, -8.2, 6, Math.PI, 0); c.lineTo(px + 6, 0.4); c.closePath(); }, P.portal, { lift: 0, rim: false, grain: false });
    line(ctx, 'rgba(90,82,70,0.55)', 0.4, (c) => { for (let k = 0; k <= 6; k++) { const a = Math.PI + (k / 6) * Math.PI; c.moveTo(px + Math.cos(a) * 6, -8.6 + Math.sin(a) * 6); c.lineTo(px + Math.cos(a) * 8.2, -8.6 + Math.sin(a) * 8.2); } });
  }
  // The line itself, sleepers and rail.
  line(ctx, P.rail, 0.5, (c) => { for (let px = -58; px <= 58; px += 2.2) { c.moveTo(px, -2.2); c.lineTo(px + 1.2, -2.2); } });
  line(ctx, '#8a847c', 0.45, (c) => { c.moveTo(-66, -2.8); c.lineTo(66, -2.8); });
}
function trainWheel(ctx, cx, cy, r, rot, col) {
  dot(ctx, cx, cy, r, '#221e1c');
  dot(ctx, cx, cy, r * 0.78, col);
  line(ctx, '#221e1c', 0.3, (c) => { for (let k = 0; k < 3; k++) { const a = rot + (k * Math.PI) / 3; c.moveTo(cx - Math.cos(a) * r * 0.7, cy - Math.sin(a) * r * 0.7); c.lineTo(cx + Math.cos(a) * r * 0.7, cy + Math.sin(a) * r * 0.7); } });
}
// The train, its front at `f` along the deck, facing right.
function drawTrain(ctx, f, t) {
  const P = RAIL;
  const rot = f / 2.1;
  const coach = (x0) => {
    const body = cut(ctx, (c) => rr(c, x0, -10.2, 16, 7, 0.9), P.coach, { lift: 0.6, rim: 0.6 });
    tone(ctx, body, (c) => c.rect(x0, -9.2, 16, 2.8), P.cream);
    tone(ctx, body, (c) => c.rect(x0, -4.8, 16, 2), P.coachShade);
    for (let k = 0; k < 3; k++) flat(ctx, P.lit, (c) => rr(c, x0 + 1.6 + k * 4.8, -8.9, 3, 2.2, 0.5));
    cut(ctx, (c) => { c.moveTo(x0 - 0.4, -10); c.quadraticCurveTo(x0 + 8, -12.6, x0 + 16.4, -10); c.closePath(); }, P.roof, { lift: 0.4, rim: 0.5 });
    for (const wx of [x0 + 2.6, x0 + 5.4, x0 + 10.6, x0 + 13.4]) trainWheel(ctx, wx, -1.5, 1.35, rot * 1.5, '#4a4440');
    line(ctx, P.black, 0.7, (c) => { c.moveTo(x0 - 1, -4); c.lineTo(x0, -4); });
  };
  coach(f - 58);
  coach(f - 40.5);
  // Tender, coal heaped in it.
  const tender = cut(ctx, (c) => rr(c, f - 23.5, -8.6, 7.5, 6, 0.6), P.engine, { lift: 0.6, rim: 0.6 });
  tone(ctx, tender, (c) => c.rect(f - 24, -4.5, 9, 2), P.engineShade);
  flat(ctx, P.black, (c) => { c.moveTo(f - 23, -8.4); c.quadraticCurveTo(f - 20, -10.6, f - 16.6, -8.4); c.closePath(); });
  trainWheel(ctx, f - 21.6, -1.5, 1.4, rot * 1.5, P.red);
  trainWheel(ctx, f - 18, -1.5, 1.4, rot * 1.5, P.red);
  // Engine: cab, boiler, dome, chimney, buffer beam, three coupled drivers.
  const cab = cut(ctx, (c) => { c.rect(f - 15.8, -12, 5, 8.6); }, P.engine, { lift: 0.7, rim: 0.6 });
  tone(ctx, cab, (c) => c.rect(f - 12.6, -12.5, 2, 9.4), P.engineShade);
  flat(ctx, P.lit, (c) => rr(c, f - 14.8, -10.8, 2.4, 2.4, 0.4));
  cut(ctx, (c) => rr(c, f - 16.6, -13.2, 6.6, 1.4, 0.5), P.black, { lift: 0.4, rim: 0.4 });
  const boiler = cut(ctx, (c) => { c.moveTo(f - 11, -3.6); c.lineTo(f - 11, -8.8); c.lineTo(f - 1.6, -8.8); c.quadraticCurveTo(f - 0.2, -8.8, f - 0.2, -6.2); c.quadraticCurveTo(f - 0.2, -3.6, f - 1.6, -3.6); c.closePath(); }, P.engine, { lift: 0.7 });
  tone(ctx, boiler, (c) => c.rect(f - 12, -5.6, 13, 2.2), P.engineShade);
  tone(ctx, boiler, (c) => c.rect(f - 12, -8.8, 13, 1), P.engineLight);
  tone(ctx, boiler, (c) => { c.rect(f - 8.6, -9, 0.7, 6); c.rect(f - 4.6, -9, 0.7, 6); }, P.brass);
  cut(ctx, (c) => { c.moveTo(f - 7.4, -8.6); c.quadraticCurveTo(f - 6.4, -11.4, f - 5.2, -8.6); c.closePath(); }, P.brass, { lift: 0.4, rim: 0.4 });
  cut(ctx, (c) => { c.moveTo(f - 3.6, -8.6); c.lineTo(f - 3.5, -12.2); c.lineTo(f - 4.1, -12.9); c.lineTo(f - 1.5, -12.9); c.lineTo(f - 2.1, -12.2); c.lineTo(f - 2, -8.6); c.closePath(); }, P.black, { lift: 0.4, rim: 0.4 });
  cut(ctx, (c) => c.rect(f - 0.6, -4.4, 1.6, 1.8), P.red, { lift: 0.3, rim: 0.4 });
  dot(ctx, f + 1.4, -3.5, 0.55, '#8a847c');
  for (const wx of [f - 9.6, f - 6.4, f - 3.2]) trainWheel(ctx, wx, -1.7, 1.6, rot * 1.3, P.red);
  const ca = rot * 1.3;
  line(ctx, '#d9d4cc', 0.5, (c) => { c.moveTo(f - 9.6 + Math.cos(ca) * 0.9, -1.7 + Math.sin(ca) * 0.9); c.lineTo(f - 3.2 + Math.cos(ca) * 0.9, -1.7 + Math.sin(ca) * 0.9); });
}
const TRAIN_SPEED = 30, TRAIN_RUN = 200, TRAIN_LEN = 60;
const trainFront = (t) => -66 + ((t * TRAIN_SPEED + 39) % TRAIN_RUN + TRAIN_RUN) % TRAIN_RUN;
function steamTrain(ctx, t, camX) {
  const P = RAIL;
  const x = wrapX(248, camX, 0.2, 800, 140);
  const deck = 139;
  ctx.save();
  clipAboveNear(ctx, camX, x - 140, x + 140, 0);
  ctx.translate(x, deck);
  baked(ctx, 'viaduct', -134, -40, 268, 152, viaductBody);
  // The train, clipped between the two tunnel mouths so it comes out of one bore and
  // goes into the other.
  const f = trainFront(t);
  ctx.save();
  ctx.beginPath();
  ctx.rect(-63.5, -20, 127, 22);
  ctx.clip();
  drawTrain(ctx, f, t);
  ctx.restore();
  // Smoke, born where the chimney was: every puff remembers the train's position at
  // the moment it left the stack. A tunnel mouth breathes out the smoke of a train
  // that has just gone in.
  for (let j = 0; j < 14; j++) {
    const tb = (Math.floor(t / 0.15) - j) * 0.15;
    const age = t - tb;
    if (age < 0 || age > 2) continue;
    const cx = trainFront(tb) - 2.8;
    let px, py;
    if (cx > -63.5 && cx < 63.5) { px = cx - age * 4; py = -13.6 - age * 9 - age * age * 2; }
    else if (cx >= 63.5 && cx < 63.5 + 40) { px = 63.5 - 2 + age * 3; py = -14 - age * 7; }
    else continue;
    puff(ctx, px, py, 1.1 + age * 3.1, j + Math.floor(tb * 7), 0.75 * (1 - age / 2) * Math.min(1, age * 6));
  }
  ctx.restore();
  nearRidgeOverlay(ctx, camX, x - 140, x + 140);
}

// ---- THE DUCK POND ------------------------------------------------------------------
// A pond filling the dip between two near hills up to a level water line, a jetty on
// its far bank. A mother duck swims it end to end with four ducklings in a line behind
// her, each leaving its own little V; at the far side the line turns round a duckling
// at a time. A dragonfly darts and hovers over the water.
const POND = {
  water: '#7fc8ea', waterTop: '#c3e9f8', waterDeep: '#5eafdb', duck: '#9a7a58', duckDark: '#6e5238',
  duckLight: '#c2a27e', speculum: '#3f6fb0', bill: '#e3a33c', duckling: '#f2d45a',
  ducklingShade: '#d8b43a', reed: '#4f8650', reedLight: '#6d9c55', tail: '#7a5236', pad: '#5fa850',
  padShade: '#4c8f43', bloom: '#f2a6b8', plank: '#9a764f', plankShade: '#7a5a3c', dragon: '#3f8fd0',
};
function pondDuck(ctx, x, y, dir, s, duckling, t, seed) {
  const P = POND;
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 2.3 + seed) * 0.25 * s);
  ctx.scale(dir * s, s);
  const o = { fx: dir };
  ctx.save();
  ctx.beginPath(); ctx.rect(-12, -20, 24, 20.8); ctx.clip();
  if (duckling) {
    const b = cut(ctx, (c) => { c.ellipse(0, -1.4, 4.2, 2.8, 0, 0, TAU); }, P.duckling, { ...o, lift: 0.5, rim: 0.6 });
    tone(ctx, b, (c) => c.rect(-5, -0.8, 10, 3), P.ducklingShade);
    cut(ctx, (c) => c.arc(2.6, -4.6, 2.2, 0, TAU), P.duckling, { ...o, lift: 0.5, rim: 0.6 });
    cut(ctx, (c) => { c.moveTo(4.5, -4.9); c.lineTo(6.2, -4.3); c.lineTo(4.5, -3.8); c.closePath(); }, P.bill, { ...o, lift: 0.3, rim: 0.4 });
    dot(ctx, 3.3, -5.2, 0.42, '#2a2218');
  } else {
    const b = cut(ctx, (c) => { c.moveTo(-5.6, -3.2); c.lineTo(-7.4, -4.4); c.quadraticCurveTo(-6.4, -1.2, -4.6, 0.6); c.quadraticCurveTo(0.8, 1.6, 4.6, 0.2); c.quadraticCurveTo(5.8, -2.2, 3.6, -3.4); c.quadraticCurveTo(-0.8, -4.4, -5.6, -3.2); c.closePath(); }, P.duck, { ...o, lift: 0.6, rim: 0.6 });
    tone(ctx, b, (c) => c.rect(-8, -0.4, 16, 3), P.duckDark);
    tone(ctx, b, (c) => { c.moveTo(-3.8, -2.6); c.quadraticCurveTo(0, -4, 3, -2.4); c.quadraticCurveTo(0.4, -1.4, -3.8, -1.6); c.closePath(); }, P.duckDark);
    tone(ctx, b, (c) => rr(c, -1.6, -2.7, 2.8, 0.9, 0.4), P.speculum);
    line(ctx, 'rgba(60,40,24,0.35)', 0.35, (c) => { c.moveTo(-4.4, -2.4); c.quadraticCurveTo(-5.2, -1.6, -4.6, -0.8); c.moveTo(-2.6, -2.9); c.quadraticCurveTo(-3.4, -2, -2.8, -1.1); });
    const h = cut(ctx, (c) => { c.moveTo(2.6, -3); c.quadraticCurveTo(2.6, -6.6, 4.6, -7.2); c.quadraticCurveTo(6.6, -7.2, 6.4, -5.4); c.quadraticCurveTo(5.4, -4.2, 4.6, -3); c.closePath(); }, P.duck, { ...o, lift: 0.5, rim: 0.5 });
    tone(ctx, h, (c) => { c.moveTo(3.2, -6); c.lineTo(6.8, -6.3); c.lineTo(6.8, -5.7); c.lineTo(3.2, -5.4); c.closePath(); }, P.duckDark);
    cut(ctx, (c) => { c.moveTo(6.1, -6.3); c.quadraticCurveTo(8.2, -6.4, 8.6, -5.6); c.quadraticCurveTo(7.8, -5, 6.2, -5.4); c.closePath(); }, P.bill, { ...o, lift: 0.3, rim: 0.4 });
    dot(ctx, 5.3, -6.3, 0.4, '#1f1812');
  }
  ctx.restore();
  ctx.restore();
}
function duckPond(ctx, t, camX) {
  const P = POND;
  const vx = wrapX(valley(2), camX, NEAR_F);
  const WL = 171;
  let x0 = vx, x1 = vx;
  while (nearY(x0 - 0.5, camX) > WL && x0 > vx - 80) x0 -= 0.5;
  while (nearY(x1 + 0.5, camX) > WL && x1 < vx + 80) x1 += 0.5;
  ctx.save();
  ctx.translate(vx, WL);
  // The pond and the jetty never change, and the valley is the same shape under them
  // wherever it scrolls, so they bake once.
  baked(ctx, 'duckpond', -56, -16, 112, 50, (ctx) => {
    ctx.save();
    ctx.translate(-vx, -WL);
    const pond = cut(ctx, (c) => {
      c.moveTo(x0, WL); c.lineTo(x1, WL);
      for (let xx = x1; xx >= x0; xx -= 1) c.lineTo(xx, nearY(xx, camX) + 0.6);
      c.closePath();
    }, P.water, { lift: 0.5, rim: 0.9 });
    // Depth as level bands — the water darkens with depth, not with the valley's V.
    tone(ctx, pond, (c) => c.rect(x0 - 1, WL + 9, x1 - x0 + 2, 60), '#6cbbe3');
    tone(ctx, pond, (c) => c.rect(x0 - 1, WL + 17, x1 - x0 + 2, 60), P.waterDeep);
    tone(ctx, pond, (c) => c.rect(x0 - 1, WL - 1, x1 - x0 + 2, 2.8), P.waterTop);
    ctx.restore();
    // A little jetty off the right bank: two posts in the water, a plank deck.
    const jx = x1 - vx;
    for (const px of [jx - 12, jx - 4]) {
      const post = cut(ctx, (c) => c.rect(px - 0.8, -4.2, 1.6, 9), P.plankShade, { lift: 0.4, rim: 0.4 });
      tone(ctx, post, (c) => c.rect(px - 0.8, 1, 1.6, 4), P.waterDeep);
    }
    const deck = cut(ctx, (c) => c.rect(jx - 14, -4.8, 16, 1.8), P.plank, { lift: 0.6, rim: 0.6 });
    tone(ctx, deck, (c) => c.rect(jx - 15, -3.6, 18, 0.8), P.plankShade);
    line(ctx, 'rgba(70,50,30,0.5)', 0.35, (c) => { for (let px = jx - 12; px < jx + 2; px += 3) { c.moveTo(px, -4.8); c.lineTo(px, -3); } });
  });
  // Glints drifting on the surface.
  for (let i = 0; i < 4; i++) {
    const gx = x0 - vx + 5 + ((t * 3.1 + i * 15) % (x1 - x0 - 14));
    line(ctx, 'rgba(255,255,255,0.8)', 0.6, (c) => { c.moveTo(gx, 0.7 + (i % 2) * 3.2); c.lineTo(gx + 2.6, 0.7 + (i % 2) * 3.2); });
  }
  // Lily pads, one in flower.
  for (const [px, pr, ph] of [[-17, 4.6, 0], [-9.5, 3.2, 1.4]]) {
    const bob = Math.sin(t * 1.9 + ph) * 0.25;
    const pad = cut(ctx, (c) => { c.ellipse(px, 0.9 + bob, pr, pr * 0.27, 0, 0.35, TAU - 0.05); c.lineTo(px, 0.9 + bob); c.closePath(); }, P.pad, { lift: 0.3, rim: 0.5 });
    tone(ctx, pad, (c) => c.rect(px - pr - 1, 1 + bob, pr * 2 + 2, 2), P.padShade);
    if (!ph) cut(ctx, (c) => { c.moveTo(px - 1.6, 0.4 + bob); c.lineTo(px - 0.8, -1.7 + bob); c.lineTo(px, -0.4 + bob); c.lineTo(px + 0.8, -1.9 + bob); c.lineTo(px + 1.5, 0.4 + bob); c.closePath(); }, P.bloom, { lift: 0.3, rim: 0.4 });
  }
  // The family: the mother swims bank to bank, four ducklings trailing; each one turns
  // at the end of the pond on its own schedule, so the line curls round.
  const left = x0 - vx + 15, right = x1 - vx - 24;
  const T = 14;
  const pos = (tt) => { const p = (((tt / T) % 1) + 1) % 1; return p < 0.5 ? lerp(left, right, smooth(p * 2)) : lerp(right, left, smooth((p - 0.5) * 2)); };
  const dirAt = (tt) => (pos(tt + 0.05) >= pos(tt - 0.05) ? 1 : -1);
  for (let i = 4; i >= 0; i--) {
    const tt = t - i * 0.95;
    const dx = pos(tt), dir = dirAt(tt);
    const s = i ? 1.02 : 1.75;
    // A V of ripples behind each swimmer.
    ctx.save();
    ctx.globalAlpha = 0.7;
    line(ctx, '#e8f7fd', 0.45, (c) => {
      const tx = dx - dir * (i ? 4.3 : 9.8);
      c.moveTo(tx, 0.6); c.lineTo(tx - dir * 6 * s, 1.6);
      c.moveTo(tx, 0.4); c.lineTo(tx - dir * 5 * s, -0.1);
    });
    ctx.restore();
    pondDuck(ctx, dx, 0, dir, s, i > 0, t, i * 1.7);
  }
  ctx.restore();
  // Reeds on the left bank, swaying, cut by the hillside.
  ctx.save();
  clipAboveNear(ctx, camX, x0 - 18, x0 + 4, 0.8);
  for (let i = 0; i < 5; i++) {
    const bx = x0 - 1 - i * 2.7;
    const by = nearY(bx, camX) + 1;
    const hgt = 13 + (i % 2) * 5 - (i === 4 ? 4 : 0);
    const sw = Math.sin(t * 1.6 + i * 1.3) * 1.4;
    line(ctx, i % 2 ? P.reed : P.reedLight, 0.9, (c) => { c.moveTo(bx, by); c.quadraticCurveTo(bx + sw * 0.3, by - hgt * 0.6, bx + sw, by - hgt); });
    if (i !== 2) cut(ctx, (c) => rr(c, bx + sw * 0.85 - 1, by - hgt - 1.2, 2, 5, 1), P.tail, { lift: 0.4, rim: 0.4 });
  }
  ctx.restore();
  // The dragonfly: darts between hover points, wings a blur.
  const n = Math.floor(t / 0.8), k = (t % 0.8) / 0.8;
  const wp = (m) => [vx - 20 + hash(m * 3.3) * 40, WL - 10 - hash(m * 5.1 + 2) * 12];
  const [ax, ay] = wp(n), [bx2, by2] = wp(n + 1);
  const e = smooth(clamp01((k - 0.7) / 0.3));
  const fx = lerp(ax, bx2, e), fy = lerp(ay, by2, e) + Math.sin(t * 13) * 0.4;
  const fd = bx2 >= ax ? 1 : -1;
  ctx.save();
  ctx.globalAlpha = 0.55;
  for (const s of [-1, 1]) flat(ctx, '#f4fbff', (c) => c.ellipse(fx - fd * 0.4, fy - 0.9 - Math.abs(Math.sin(t * 40 + s)) * 0.6, 2.6, 0.7, s * 0.35, 0, TAU));
  ctx.restore();
  line(ctx, P.dragon, 0.9, (c) => { c.moveTo(fx - fd * 3.2, fy); c.lineTo(fx + fd * 1.4, fy); });
  dot(ctx, fx + fd * 1.8, fy, 0.7, '#2f6fae');
}

// ---- THE SCARECROW IN THE WHEAT ----------------------------------------------------------
// A field of ripe wheat over a near summit with poppies along its front edge. The wind
// runs through it in waves — the ears bow and the pale undersides flash — and the
// scarecrow in the middle flaps its sleeves and holds its hat on. Three crows keep
// testing it: one on each arm and one on the hat, taking off, wheeling and landing
// again, each on its own clock.
const SCARE = {
  wheat: '#d8b95e', wheatLight: '#efd690', wheatShade: '#b99a44', ear: '#e6c870', earDark: '#b4923c',
  poppy: '#d8453a', poppyDark: '#2e2420', stem: '#5f8f4a', pole: '#8a6a48', shirt: '#5a7fb0',
  shirtShade: '#46668f', patch: '#d8533f', sack: '#dcc79c', sackShade: '#c4ad7e', hat: '#c9a45a',
  hatShade: '#a8853e', band: '#8a3a34', straw: '#e8cf7a', stitch: '#5a4632', crow: '#2e2c33',
  crowLight: '#4a4852', crowBeak: '#8f8a80',
};
// A crow facing `dir`: perched (`flap` null) or flying with its wings at `flap` (-1..1).
function crowBird(ctx, x, y, s, dir, flap, caw) {
  const P = SCARE;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * dir, s);
  const o = { fx: dir };
  const wing = (up, far) => (c) => {
    const a = -0.3 - up * 1.1;
    const tx = -1 + Math.cos(a) * 6.4, ty = -2.4 + Math.sin(a) * 6.4;
    c.moveTo(1.4, -2.6);
    c.quadraticCurveTo(tx + 3, ty - 0.5, tx, ty);
    c.lineTo(tx - 0.8, ty + 1.3); c.lineTo(tx + 0.4, ty + 1.2); c.lineTo(tx - 0.4, ty + 2.3);
    c.quadraticCurveTo(-1.4, -1.2 + (far ? -0.4 : 0), -1.6, -1.6);
    c.closePath();
  };
  if (flap !== null) cut(ctx, wing(flap * 0.9, true), '#1f1d24', { ...o, lift: 0.3, rim: 0.4 });
  const body = cut(ctx, (c) => {
    c.moveTo(3.6, -3.4); c.quadraticCurveTo(1.6, -4.2, -1.6, -3.2);
    c.lineTo(-5.6, -3.2 + (flap === null ? 1.6 : 0.4)); c.lineTo(-5.8, -1.6 + (flap === null ? 1.8 : 0)); c.lineTo(-1.8, -1);
    c.quadraticCurveTo(1.8, -0.4, 3.4, -1.6); c.closePath();
  }, P.crow, { ...o, lift: 0.4, rim: 0.5 });
  tone(ctx, body, (c) => c.ellipse(-0.6, -3.2, 3, 0.7, 0, 0, TAU), P.crowLight);
  cut(ctx, (c) => c.arc(3.6, -3.4, 1.55, 0, TAU), P.crow, { ...o, lift: 0.3, rim: 0.4 });
  const gape = caw ? 0.5 : 0;
  flat(ctx, P.crowBeak, (c) => { c.moveTo(4.8, -3.9); c.lineTo(7, -3.3 - gape); c.lineTo(4.9, -3.1); c.closePath(); c.moveTo(4.9, -3.1); c.lineTo(6.6, -2.8 + gape); c.lineTo(4.8, -2.7); c.closePath(); });
  dot(ctx, 4, -3.8, 0.3, '#e8e2d6');
  if (flap === null) line(ctx, P.crowBeak, 0.35, (c) => { c.moveTo(0, -0.8); c.lineTo(-0.2, 0.4); c.moveTo(1.2, -0.9); c.lineTo(1.1, 0.4); });
  else cut(ctx, wing(flap, false), P.crow, { ...o, lift: 0.3, rim: 0.4 });
  ctx.restore();
}
function scarecrowField(ctx, t, camX) {
  const P = SCARE;
  const x = wrapX(summit(1) - 2, camX, NEAR_F);
  const wind = (xx) => Math.sin(xx * 0.09 - t * 2.6) + 0.45 * Math.sin(xx * 0.21 - t * 4.1 + 1);
  // The field is a patch of the hill itself: from the crest down the face and out of
  // sight behind the lane, between two hedgerows that run down the slope at an angle.
  // It always stands on the same phase of the ridge, so everything that holds still
  // (the field, its rows, the hedges and their trees) bakes once; the wind, the ears,
  // the poppies, the scarecrow and the crows are live.
  const hedgeL = (y) => x - 44 - (y - 160) * 0.55, hedgeR = (y) => x + 46 + (y - 160) * 0.5;
  const crest = (xx) => nearY(xx, camX);
  const bottom = 246;
  const field = pathOf((c) => {
    c.moveTo(hedgeL(bottom), bottom);
    for (let xx = x - 70; xx <= x + 70; xx += 2) {
      const y = crest(xx) - 0.2;
      if (xx >= hedgeL(y) && xx <= hedgeR(y)) c.lineTo(xx, y);
    }
    c.lineTo(hedgeR(bottom), bottom);
    c.closePath();
  });
  const hedgeTop = (hf, s) => crest(hf(crest(x + s * 45))) - 1;
  ctx.save();
  ctx.save();
  ctx.translate(x, 0);
  baked(ctx, 'wheatfield', -120, 118, 240, 132, (g) => {
    g.translate(-x, 0);
    cut(g, field, P.wheat, { lift: 0, rim: false });
    // Crop rows: faint lines following the hill's own curve down its face, so the
    // gold lies on the hill instead of over it.
    g.save();
    g.clip(field);
    for (let d = 5; d < 80; d += 5.5) {
      line(g, d % 11 < 5.5 ? 'rgba(170,132,52,0.35)' : 'rgba(250,232,170,0.35)', 0.6, (c) => { c.moveTo(x - 90, crest(x - 90) + d); for (let xx = x - 90; xx <= x + 90; xx += 3) c.lineTo(xx, crest(xx) + d + d * 0.02 * Math.sin(xx * 0.05)); });
    }
    flat(g, 'rgba(160,120,40,0.18)', (c) => { for (let xx = x - 90; xx <= x + 90; xx += 3) c.lineTo(xx, crest(xx) + 22); c.lineTo(x + 90, 250); c.lineTo(x - 90, 250); c.closePath(); });
    g.restore();
    // Hedgerows down both sides: a dark green bank with a bumpy top, a tree in each.
    for (const [hf, s] of [[hedgeL, -1], [hedgeR, 1]]) {
      const y0 = hedgeTop(hf, s);
      const hedge = cut(g, (c) => {
        const pts = [];
        for (let y = y0; y <= bottom; y += 3) pts.push([hf(y), y]);
        c.moveTo(pts[0][0] - 2, pts[0][1]);
        for (const [px, py] of pts) c.lineTo(px - 2.6 - Math.abs(Math.sin(py * 0.7)) * 1.2, py);
        for (let i = pts.length - 1; i >= 0; i--) c.lineTo(pts[i][0] + 2.6 + Math.abs(Math.sin(pts[i][1] * 0.9 + 1)) * 1.2, pts[i][1]);
        c.closePath();
      }, '#4d8e54', { lift: 0.8, rim: 0.7 });
      tone(g, hedge, (c) => { for (let y = y0; y <= bottom; y += 3) c.lineTo(hf(y) + 0.8, y); for (let y = bottom; y >= y0; y -= 3) c.lineTo(hf(y) + 4, y); c.closePath(); }, '#3f7d48');
      const ty = y0 + 3, tx = hf(ty);
      cut(g, (c) => c.rect(tx - 0.8, ty - 6, 1.6, 6.5), '#6b4a30', { rim: false, lift: 0.4 });
      const crown = cut(g, (c) => { c.arc(tx - 3, ty - 8, 3.6, 0, TAU); c.moveTo(tx + 6.6, ty - 8); c.arc(tx + 3, ty - 8, 3.6, 0, TAU); c.moveTo(tx + 4.4, ty - 11.6); c.arc(tx, ty - 11.6, 4.4, 0, TAU); }, '#357b42', { rim: 0.8, lift: 0.9, rimUnder: true });
      tone(g, crown, (c) => c.arc(tx - 1.4, ty - 13, 2.4, 0, TAU), '#4b9352');
    }
  });
  ctx.restore();
  // Wind waves: the pale flash where a gust flattens the stalks, running downwind —
  // gathered into three strengths so a gust is three fills, not ninety.
  ctx.save();
  ctx.clip(field);
  for (let level = 0; level < 3; level++) {
    ctx.beginPath();
    for (let xx = x - 90; xx < x + 90; xx += 2) {
      const w = wind(xx);
      if (w < 0.5 + level * 0.3 || w >= 0.8 + level * 0.3 + (level === 2 ? 9 : 0)) continue;
      ctx.rect(xx - 0.2, crest(xx) - 2, 2.4, 90);
    }
    ctx.globalAlpha = 0.25 + level * 0.2;
    ctx.fillStyle = P.wheatLight;
    ctx.fill();
  }
  ctx.restore();
  // The ears along the crest, standing against the sky and bowing with each gust:
  // every stalk in one stroke, every head in one of two fills.
  const stalks = new Path2D(), headsA = new Path2D(), headsB = new Path2D();
  for (let xx = x - 60; xx <= x + 60; xx += 1.6) {
    const cy = crest(xx);
    if (xx < hedgeL(cy) + 2 || xx > hedgeR(cy) - 2) continue;
    const lean = wind(xx) * 1.6;
    const y0 = cy + 1.5;
    const tx = xx + lean, ty = y0 - 6.2 + Math.abs(lean) * 0.35;
    stalks.moveTo(xx, y0); stalks.quadraticCurveTo(xx + lean * 0.3, y0 - 3, tx, ty);
    const a = Math.atan2(ty - y0, tx - xx);
    const h = hash(xx * 1.3) > 0.5 ? headsA : headsB;
    h.moveTo(tx + Math.cos(a) * 1.6, ty + Math.sin(a) * 1.6);
    h.ellipse(tx, ty, 1.6, 0.66, a, 0, TAU);
  }
  ctx.strokeStyle = P.earDark; ctx.lineWidth = 0.45; ctx.lineCap = 'round'; ctx.stroke(stalks);
  ctx.fillStyle = P.ear; ctx.fill(headsA);
  ctx.fillStyle = P.wheatLight; ctx.fill(headsB);
  // Poppies along the hedge feet, nodding.
  for (const [hf, s] of [[hedgeL, -1], [hedgeR, 1]]) {
    const y0 = hedgeTop(hf, s);
    for (let i = 0; i < 4; i++) {
      const py = crest(hf(y0)) + 7 + i * 7;
      const px = hf(py) - s * (4 + (i % 2) * 2.4);
      const sw = Math.sin(t * 2.2 + i + s) * 0.8;
      line(ctx, P.stem, 0.5, (c) => { c.moveTo(px, py + 2); c.quadraticCurveTo(px, py - 1.5, px + sw, py - 3.6); });
      cut(ctx, (c) => c.arc(px + sw, py - 4, 1.4, 0, TAU), P.poppy, { lift: 0.3, rim: 0.4 });
      dot(ctx, px + sw, py - 4, 0.45, P.poppyDark);
    }
  }
  const g = crest(x) + 3;
  // The scarecrow and its crows, a size up from the field's own scale.
  ctx.translate(x, g);
  ctx.scale(1.2, 1.2);
  ctx.translate(-x, -g);
  // The scarecrow: pole, crossbar, shirt with flapping sleeves, sack head, straw hat.
  const gust = wind(x) * 0.5;
  line(ctx, P.pole, 1.4, (c) => { c.moveTo(x, g + 4); c.lineTo(x, g - 30); });
  line(ctx, P.pole, 1.2, (c) => { c.moveTo(x - 12.5, g - 22.5); c.lineTo(x + 12.5, g - 22.5); });
  for (const s of [-1, 1]) {
    const flapY = Math.sin(t * 5.2 + s * 1.7) * 0.9 + gust * 0.8;
    const sleeve = cut(ctx, (c) => { c.moveTo(x + s * 2.5, g - 24.6); c.lineTo(x + s * 11.5, g - 24.3 + flapY * 0.3); c.lineTo(x + s * 12, g - 20.2 + flapY); c.lineTo(x + s * 2.5, g - 19.4); c.closePath(); }, P.shirt, { lift: 0.6, rim: 0.6 });
    if (s > 0) tone(ctx, sleeve, (c) => c.rect(x, g - 22, 14, 4), P.shirtShade);
    for (let k = 0; k < 3; k++) line(ctx, P.straw, 0.45, (c) => { const cy = g - 23.4 + k * 1.3 + flapY * 0.6; c.moveTo(x + s * 11.8, cy); c.lineTo(x + s * (13.4 + (k % 2) * 0.8), cy + 0.6 + Math.sin(t * 7 + k) * 0.4); });
  }
  const torso = cut(ctx, (c) => { c.moveTo(x - 3.6, g - 24.8); c.lineTo(x + 3.6, g - 24.8); c.lineTo(x + 4.4, g - 13 + gust * 0.4); c.lineTo(x - 4.2, g - 13 - gust * 0.2); c.closePath(); }, P.shirt, { lift: 0.8 });
  tone(ctx, torso, (c) => c.rect(x + 1.2, g - 26, 4, 14), P.shirtShade);
  tone(ctx, torso, (c) => c.rect(x - 2.6, g - 20.4, 2.6, 2.6), P.patch);
  line(ctx, P.stitch, 0.3, (c) => { c.moveTo(x - 2.6, g - 20.4); c.lineTo(x - 2.2, g - 20); c.moveTo(x - 0.4, g - 18.2); c.lineTo(x, g - 17.8); });
  line(ctx, '#8a6a3a', 0.7, (c) => { c.moveTo(x - 4, g - 15.4); c.lineTo(x + 4.2, g - 15.2); });
  line(ctx, P.straw, 0.45, (c) => { for (let k = 0; k < 4; k++) { c.moveTo(x - 3 + k * 2, g - 13); c.lineTo(x - 3.4 + k * 2.2 + gust * 0.5, g - 11.2); } });
  const head = cut(ctx, (c) => c.arc(x, g - 28, 3.6, 0, TAU), P.sack, { lift: 0.6, rim: 0.6 });
  tone(ctx, head, (c) => c.arc(x + 1.6, g - 27, 3.2, 0, TAU), P.sackShade);
  dot(ctx, x - 1.2, g - 28.6, 0.5, P.stitch); dot(ctx, x + 1.3, g - 28.6, 0.5, P.stitch);
  line(ctx, P.stitch, 0.35, (c) => { c.moveTo(x - 1.8, g - 26.6); c.quadraticCurveTo(x, g - 25.4, x + 1.8, g - 26.6); for (let k = -1.2; k <= 1.3; k += 0.8) { c.moveTo(x + k, g - 26.5); c.lineTo(x + k, g - 25.8); } });
  const tilt = gust * 0.06 + Math.sin(t * 3.3) * 0.03;
  ctx.save();
  ctx.translate(x, g - 31);
  ctx.rotate(tilt);
  const ho = { rot: tilt };
  const hat = cut(ctx, (c) => { c.ellipse(0, 0.4, 6.4, 1.3, 0, 0, TAU); c.moveTo(-3.2, 0.4); c.quadraticCurveTo(-3.2, -3.8, 0, -3.9); c.quadraticCurveTo(3.2, -3.8, 3.2, 0.4); c.closePath(); }, P.hat, { ...ho, lift: 0.6, rim: 0.6 });
  tone(ctx, hat, (c) => c.rect(1, -5, 7, 7), P.hatShade);
  tone(ctx, hat, (c) => c.rect(-3.4, -1.3, 6.8, 1.1), P.band);
  line(ctx, P.straw, 0.4, (c) => { for (let k = -1; k <= 1; k++) { c.moveTo(-3 + k * 1.2, 1.2); c.lineTo(-3.4 + k * 1.3, 2.6); } });
  ctx.restore();
  // The crows: perched, then off on a wheel round the field, then gliding back in.
  const CROWS = [[x + 9.5, g - 24.6, 1, 0], [x + 0.2, g - 35.2, -1, 2.2], [x - 10, g - 24.6, -1, 4.4]];
  for (const [px, py, side, off] of CROWS) {
    const per = 6.6, p = ((t + off) % per + per) % per;
    if (p < 2.8) {
      const caw = (p % 1.4) > 1.1;
      const hop = Math.abs(Math.sin(p * 1.7)) < 0.08 ? -0.6 : 0;
      crowBird(ctx, px, py + hop, 1, (Math.floor(p / 1.3) % 2 ? -side : side), null, caw);
    } else {
      const k = (p - 2.8) / (per - 2.8);
      const cx = px + side * 22 * Math.sin(k * TAU);
      const cy = py - 18 * Math.sin(k * Math.PI) - 5 * (1 - Math.cos(k * TAU));
      const vx = side * Math.cos(k * TAU);
      const gliding = k > 0.78;
      const flap = gliding ? -0.25 : Math.sin(t * 17 + off);
      crowBird(ctx, cx, cy, 1, vx >= 0 ? 1 : -1, flap, false);
    }
  }
  ctx.restore();
}

// ---- KITES ON THE HILL ------------------------------------------------------------------
// Two children on a near summit flying kites: a diamond with a tail of bows and a
// delta with streamers, each swinging figure-eights on the wind at the top of a long
// sagging string. The bigger child leans back into the pull.
const KITES = {
  kidA: '#d8533f', kidAShade: '#b43f30', kidB: '#3f78c0', kidBShade: '#2f5f9a', legs: '#4a4e6a',
  skin: '#f0c49a', hairA: '#6b4a2e', hairB: '#e8c060', kiteA1: '#f2c43c', kiteA2: '#d8453a',
  kiteB1: '#4a8fd8', kiteB2: '#f4f0e6', spar: 'rgba(70,50,30,0.7)', string: 'rgba(255,255,255,0.9)', bow: '#d8453a', bow2: '#f2c43c',
};
function kid(ctx, x, y, s, shirt, shade, hair, lean, handX, handY) {
  const P = KITES;
  flat(ctx, 'rgba(28,64,30,0.2)', (c) => c.ellipse(x, y + 0.3, 3.4 * s, 0.7 * s, 0, 0, TAU));
  line(ctx, P.legs, 1.2 * s, (c) => { c.moveTo(x - 1 * s, y); c.lineTo(x - 0.6 * s + lean * 2, y - 4.6 * s); c.moveTo(x + 1.2 * s, y); c.lineTo(x + 0.6 * s + lean * 2, y - 4.6 * s); });
  const bx = x + lean * 3.4, by = y - 4.4 * s;
  const body = cut(ctx, (c) => rr(c, bx - 1.9 * s, by - 5.4 * s, 3.8 * s, 5.8 * s, 1.4 * s), shirt, { lift: 0.5, rim: 0.5 });
  tone(ctx, body, (c) => c.rect(bx + 0.4 * s, by - 6 * s, 3 * s, 7 * s), shade);
  line(ctx, shirt, 1.1 * s, (c) => { c.moveTo(bx + 0.6 * s, by - 4.4 * s); c.lineTo(handX, handY); });
  dot(ctx, handX, handY, 0.6 * s, P.skin);
  const hx = bx + lean * 1.2, hy = by - 7.4 * s;
  cut(ctx, (c) => c.arc(hx, hy, 1.9 * s, 0, TAU), P.skin, { lift: 0.4, rim: 0.5 });
  cut(ctx, (c) => { c.arc(hx - 0.2 * s, hy - 0.5 * s, 1.95 * s, Math.PI * 1.05, Math.PI * 2.05); c.closePath(); }, hair, { lift: 0.2, rim: false });
}
function kiteHill(ctx, t, camX) {
  const P = KITES;
  const x = wrapX(summit(2) - 2, camX, NEAR_F);
  const ga = nearY(x - 9, camX) + 1, gb = nearY(x + 10, camX) + 1;
  // Kite A: a diamond high up and right; kite B: a delta lower and nearer.
  const ka = [x + 72 + 22 * Math.sin(t * 0.7), 56 + 9 * Math.sin(t * 1.4)];
  const kb = [x + 36 + 14 * Math.sin(t * 0.9 + 1), 94 + 7 * Math.sin(t * 1.8 + 1)];
  const tiltA = 0.3 * Math.cos(t * 0.7), tiltB = 0.35 * Math.cos(t * 0.9 + 1);
  const pull = Math.sin(t * 1.4) * 0.12;
  const handA = [x - 9 + 3.4 * (-0.18 + pull) + 4.2, ga - 4.4 * 1.7 - 8.2];
  const handB = [x + 10 + 3.6, gb - 4.4 * 1.35 - 7];
  // Strings: long sagging curves from the hands up to the bridles.
  for (const [h, k] of [[handA, ka], [handB, kb]]) {
    line(ctx, P.string, 0.5, (c) => { c.moveTo(h[0], h[1]); c.quadraticCurveTo((h[0] + k[0]) / 2 + 5, (h[1] + k[1]) / 2 + 12, k[0], k[1] + 2.5); });
  }
  // The diamond: two-tone sail on cross spars, a tail of bows waving under it.
  ctx.save();
  ctx.translate(ka[0], ka[1]);
  ctx.rotate(tiltA);
  ctx.scale(1.45, 1.45);
  const ko = { rot: tiltA };
  cut(ctx, (c) => { c.moveTo(0, -8); c.lineTo(5.4, -1.6); c.lineTo(0, 7.4); c.lineTo(-5.4, -1.6); c.closePath(); }, P.kiteA1, { ...ko, lift: 0.8, rim: 0.7 });
  cut(ctx, (c) => { c.moveTo(0, -8); c.lineTo(5.4, -1.6); c.lineTo(0, -1.6); c.closePath(); c.moveTo(0, -1.6); c.lineTo(-5.4, -1.6); c.lineTo(0, 7.4); c.closePath(); }, P.kiteA2, { ...ko, lift: 0, rim: false });
  line(ctx, P.spar, 0.45, (c) => { c.moveTo(0, -8); c.lineTo(0, 7.4); c.moveTo(-5.4, -1.6); c.lineTo(5.4, -1.6); });
  ctx.restore();
  const tx = ka[0] - Math.sin(tiltA) * 10.7, ty = ka[1] + Math.cos(tiltA) * 10.7;
  const tail = [[tx, ty]];
  for (let i = 1; i <= 8; i++) tail.push([tx - i * 1.5 + Math.sin(t * 4 - i * 0.7) * 1.8 * (i / 8), ty + i * 3]);
  line(ctx, P.string, 0.5, (c) => { c.moveTo(tail[0][0], tail[0][1]); for (const p of tail) c.lineTo(p[0], p[1]); });
  for (let i = 2; i <= 8; i += 2) {
    const [bx, by] = tail[i];
    flat(ctx, i % 4 ? P.bow2 : P.bow, (c) => { c.moveTo(bx - 2.2, by - 1.1); c.lineTo(bx + 2.2, by + 1.1); c.lineTo(bx + 2.2, by - 1.1); c.lineTo(bx - 2.2, by + 1.1); c.closePath(); });
  }
  // The delta: a triangle sail with a keel, streamers off its trailing corners.
  ctx.save();
  ctx.translate(kb[0], kb[1]);
  ctx.rotate(tiltB);
  ctx.scale(1.4, 1.4);
  const kbo = { rot: tiltB };
  const sail = cut(ctx, (c) => { c.moveTo(0, -5); c.lineTo(6.4, 3.4); c.lineTo(-6.4, 3.4); c.closePath(); }, P.kiteB1, { ...kbo, lift: 0.8, rim: 0.7 });
  tone(ctx, sail, (c) => { c.moveTo(0, -5); c.lineTo(2.4, 3.4); c.lineTo(-2.4, 3.4); c.closePath(); }, P.kiteB2);
  for (const s of [-1, 1]) line(ctx, s < 0 ? P.kiteB1 : P.kiteB2, 0.8, (c) => { c.moveTo(s * 6.2, 3.4); for (let i = 1; i <= 6; i++) c.lineTo(s * 6.2 - i * 0.5, 3.4 + i * 1.8 + Math.sin(t * 5 + i * 0.9 + s) * 0.9); });
  ctx.restore();
  // The children: the older one leaning back into the pull.
  kid(ctx, x - 9, ga, 1.7, P.kidA, P.kidAShade, P.hairA, -0.18 + pull, handA[0], handA[1]);
  kid(ctx, x + 10, gb, 1.35, P.kidB, P.kidBShade, P.hairB, -0.05, handB[0], handB[1]);
}

// ====================================================================== the lane

// ---- SQUARE HAY BALE --------------------------------------------------------------------
// A small square bale dropped in the lane: two red twines round it, straw texture,
// stray straws stirring in the breeze and a little chaff blowing off downwind. Break
// it (it bursts into straw) or jump it — the countryside's crate.
const HAY = {
  straw: '#e2c46a', strawLight: '#f2dc8e', strawShade: '#c4a24c', strawDark: '#a8863a', ink: '#6a4a1a',
  twine: '#c8553a', twineDark: '#8e3622',
};
function hayBale(ctx, t, x, g) {
  const P = HAY;
  const w = 16, h = 11;
  const x0 = x - w / 2, top = g - h;
  contact(ctx, x, g, 10);
  // Stray straws poking out of the top and the ends, stirring in the breeze.
  for (const [sx, sy, a, len] of [[x0 + 2.4, top, -0.4, 3.2], [x0 + 6, top, 0.25, 3.8], [x0 + 11.4, top, 0.5, 3], [x0 + 14.4, top + 0.4, 0.9, 2.6], [x0, top + 3.6, -1.35, 2.4], [x0 + w, top + 6, 1.3, 2.6]]) {
    const wv = Math.sin(t * 3.1 + sx * 0.7) * 0.28;
    ink(ctx, null, P.strawDark, 0.45, (c) => { c.moveTo(sx, sy + 1.2); c.lineTo(sx + Math.sin(a + wv) * len, sy + 1.2 - Math.cos(a + wv) * len); });
  }
  const bale = (c) => rr(c, x0, top, w, h, 1.6);
  ink(ctx, P.straw, P.ink, 0.6, bale);
  ctx.save();
  ctx.beginPath(); bale(ctx); ctx.clip();
  flat(ctx, P.strawShade, (c) => c.rect(x0, g - 3, w, 4));
  flat(ctx, P.strawShade, (c) => c.rect(x0 + w - 3, top, 4, h));
  flat(ctx, P.strawLight, (c) => c.rect(x0, top, w, 1.7));
  for (let i = 0; i < 28; i++) {
    const px = x0 + 1 + hash(i * 3.1) * (w - 2), py = top + 1.6 + hash(i * 5.7 + 1) * (h - 3);
    const a = (hash(i * 7.3 + 2) - 0.5) * 1.2;
    ink(ctx, null, i % 3 ? 'rgba(160,126,50,0.75)' : 'rgba(252,238,186,0.85)', 0.35, (c) => { c.moveTo(px, py); c.lineTo(px + Math.cos(a) * 2.3, py + Math.sin(a) * 2.3); });
  }
  ctx.restore();
  for (const bx of [x0 + 4.2, x0 + w - 4.2]) ink(ctx, P.twine, P.twineDark, 0.3, (c) => rr(c, bx - 0.6, top - 0.25, 1.2, h + 0.5, 0.45));
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.6 + i / 3) % 1;
    dot(ctx, x0 + w + k * 11, top + 2 + i * 2.6 - Math.sin(k * 6 + i) * 1.6, 0.4 * (1 - k), P.strawDark);
  }
}

// ---- ROUND BALE, ROLLING ---------------------------------------------------------------
// A big round bale loose at the top of the hill and rolling down the lane at you, its
// hay spiral turning as it goes, straw flicking off behind and a bump every so often.
// Jump it — the barrel's job, in straw.
function roundBale(ctx, t, x, g) {
  const P = HAY;
  const r = 7.8;
  const roll = -t * 5.1;
  const bump = Math.abs(Math.sin(roll * 1.5)) * 0.35;
  const cx = x, cy = g - r - bump;
  contact(ctx, cx, g, 8.5);
  // Speed lines and the dust it raises behind it.
  for (const [dy, len, ph] of [[-3.5, 6, 0], [0.5, 8, 1.3], [4, 5, 2.1]]) {
    const k = (t * 3 + ph) % 1;
    ctx.save(); ctx.globalAlpha = 0.6 * (1 - k);
    ink(ctx, null, 'rgba(255,255,255,0.9)', 0.5, (c) => { c.moveTo(cx + r + 2 + k * 3, cy + dy); c.lineTo(cx + r + 2 + k * 3 + len, cy + dy); });
    ctx.restore();
  }
  for (let i = 0; i < 3; i++) {
    const k = (t * 2.2 + i / 3) % 1;
    ctx.save(); ctx.globalAlpha = 0.45 * (1 - k);
    dot(ctx, cx + 3 + k * 9, g - 1 - k * 3, 1 + k * 1.8, '#c9b48a');
    ctx.restore();
  }
  const disc = (c) => c.arc(cx, cy, r, 0, TAU);
  ink(ctx, P.straw, P.ink, 0.6, disc);
  ctx.save();
  ctx.beginPath(); disc(ctx); ctx.clip();
  flat(ctx, P.strawShade, (c) => c.arc(cx + 2.2, cy + 2.2, r, 0, TAU));
  flat(ctx, P.straw, (c) => c.arc(cx + 0.5, cy + 0.5, r * 0.84, 0, TAU));
  ctx.translate(cx, cy);
  ctx.rotate(roll);
  const spiral = (c, off) => {
    for (let a = 0; a <= TAU * 3.2; a += 0.15) {
      const rad = 0.5 + (a / (TAU * 3.2)) * (r - 1.1);
      const px = Math.cos(a + off) * rad, py = Math.sin(a + off) * rad;
      if (a) c.lineTo(px, py); else c.moveTo(px, py);
    }
  };
  ink(ctx, null, P.strawDark, 0.6, (c) => spiral(c, 0));
  ink(ctx, null, 'rgba(252,238,186,0.85)', 0.35, (c) => spiral(c, 0.5));
  ctx.restore();
  ink(ctx, null, 'rgba(255,246,206,0.8)', 0.55, (c) => c.arc(cx, cy, r - 0.9, Math.PI * 1.1, Math.PI * 1.55));
  // Straw flicked up off the back of it.
  for (let i = 0; i < 4; i++) {
    const k = (t * 1.7 + i / 4) % 1;
    const bx = cx + r * 0.6 + k * 8, by = cy - r * 0.3 - k * 6 + k * k * 10;
    const a = t * 9 + i;
    ink(ctx, null, P.strawDark, 0.4, (c) => { c.moveTo(bx - Math.cos(a) * 1.1, by - Math.sin(a) * 1.1); c.lineTo(bx + Math.cos(a) * 1.1, by + Math.sin(a) * 1.1); });
  }
}

// ---- FIELD GATE ----------------------------------------------------------------------------
// A five-bar field gate across the lane, swinging on a timer: shut, it is a fence to jump;
// it swings away from you on its hinge post (the far end drawing in and shrinking with
// distance), stands open while you run through, then slams back and rattles on its latch.
const GATE = {
  wood: '#b8966a', woodShade: '#8e7250', woodLight: '#d6b88a', ink: '#4a3420', post: '#8a6a48',
  postShade: '#6e5238', metal: '#8e979f', metalDark: '#5e666e',
};
function gateSwing(t) {
  const per = 3.4, p = ((t + 0.4) % per + per) % per;
  const OPEN = 1.12;
  if (p < 1.3) return 0;
  if (p < 1.75) return OPEN * smooth((p - 1.3) / 0.45);
  if (p < 2.9) return OPEN + Math.sin((p - 1.75) * 3) * 0.04;
  const k = (p - 2.9) / 0.5;
  if (k < 0.55) return OPEN * (1 - (k / 0.55) ** 2);
  const b = (k - 0.55) / 0.45;
  return -Math.sin(b * Math.PI) * 0.12 * (1 - b);
}
function fieldGate(ctx, t, x, g) {
  const P = GATE;
  const a = gateSwing(t);
  const hx = x - 9.5, W = 18.5;
  const cs = Math.cos(a), sn = Math.max(0, Math.sin(a));
  // A point on the gate `d` along from the hinge and `h` up: as it swings away its depth
  // lifts it a little up the screen and shrinks it.
  const pt = (d, h) => {
    const z = d * sn;
    const f = 1 / (1 + z * 0.014);
    return [hx + d * cs * f, g - z * 0.22 - h * f];
  };
  const bar = (d0, h0, d1, h1, wdt, col) => {
    const [ax, ay] = pt(d0, h0), [bx, by] = pt(d1, h1);
    ink(ctx, col, P.ink, 0.45, (c) => {
      const nx = -(by - ay), ny = bx - ax, nl = Math.hypot(nx, ny) || 1;
      const ox = (nx / nl) * wdt / 2, oy = (ny / nl) * wdt / 2;
      c.moveTo(ax + ox, ay + oy); c.lineTo(bx + ox, by + oy); c.lineTo(bx - ox, by - oy); c.lineTo(ax - ox, ay - oy); c.closePath();
    });
  };
  const shade = sn > 0.5 ? P.woodShade : P.wood;
  contact(ctx, hx, g, 3.4, 0.3);
  contact(ctx, x + 9.5, g, 3.4, 0.3);
  // The gate: two stiles, five rails and the brace, with strap hinges.
  for (const h of [2.2, 4.9, 7.6, 10.3, 13]) bar(0.8, h, W, h, 1.15, shade);
  bar(0.8, 1.2, W, 13, 1, shade);
  bar(W - 0.6, 0.6, W - 0.6, 13.8, 1.4, shade);
  bar(1, 0.6, 1, 13.8, 1.6, shade);
  for (const h of [3.6, 11.6]) bar(0, h, 4.2, h, 0.8, P.metalDark);
  // Posts: the hinge post, and the latch post the gate shuts against.
  const post = (px, top) => {
    ink(ctx, P.post, P.ink, 0.55, (c) => { c.moveTo(px - 1.4, g + 0.3); c.lineTo(px - 1.4, g - top + 0.8); c.lineTo(px, g - top - 0.6); c.lineTo(px + 1.4, g - top + 0.8); c.lineTo(px + 1.4, g + 0.3); c.closePath(); });
    flat(ctx, P.postShade, (c) => c.rect(px + 0.2, g - top + 0.8, 1.2, top - 0.6));
  };
  post(hx, 16.2);
  post(x + 9.5, 15);
  flat(ctx, P.metal, (c) => rr(c, x + 7.4, g - 11.6, 2.4, 1.2, 0.4));
  // A rattle on the latch as it slams home.
  if (a < -0.01) {
    ink(ctx, null, 'rgba(255,255,255,0.85)', 0.45, (c) => { c.arc(x + 9.5, g - 11, 3.4, -0.9, -0.2); c.moveTo(x + 13.4, g - 8.2); c.arc(x + 9.5, g - 11, 4.6, -0.5, 0.3); });
  }
}

// ---- CHARGING GOOSE ----------------------------------------------------------------------
// A farmyard goose that has decided the lane is hers: neck stretched out low, beak wide
// open honking, wings half up and beating, orange feet paddling flat out at the runner.
// It comes fast — jump it or bop it.
const GOOSE = {
  body: '#f4f1ea', bodyShade: '#d6d0c4', wingShade: '#c9c1b2', ink: '#4a4640', beak: '#f08a2c',
  beakDark: '#c4611a', mouth: '#8a2a1e', leg: '#f08a2c', legDark: '#c4611a',
};
function chargingGoose(ctx, t, x, g) {
  const P = GOOSE;
  const ph = t * 4.2 * TAU;
  const bob = Math.abs(Math.sin(ph / 2)) * 0.8;
  contact(ctx, x, g, 8);
  for (const s of [0, 1]) {
    const k = ph / 2 + s * Math.PI;
    const fx = x - 0.5 + Math.cos(k) * 2.8 + (s ? 1.4 : -1.2);
    const lift = Math.max(0, Math.sin(k)) * 1.7;
    ink(ctx, null, s ? P.leg : P.legDark, 0.7, (c) => { c.moveTo(x + (s ? 0.8 : -0.6), g - 5.4 - bob); c.lineTo(fx, g - 0.8 - lift); });
    ink(ctx, s ? P.leg : P.legDark, P.beakDark, 0.3, (c) => { c.moveTo(fx + 0.6, g - 0.9 - lift); c.lineTo(fx - 2.2, g - 0.5 - lift); c.lineTo(fx + 0.4, g + 0.1 - lift); c.closePath(); });
  }
  ctx.save();
  ctx.translate(x, g - 6.2 - bob);
  // Far wing up behind the body.
  const flap = Math.sin(t * 15);
  const wing = (lift, far) => (c) => {
    const a = -0.9 - lift * 0.5 - (far ? 0.25 : 0);
    const tx = 1 + Math.cos(a) * 8, ty = -2 + Math.sin(a) * 8;
    c.moveTo(-2, -2.2);
    c.quadraticCurveTo(tx - 4, ty - 1.5, tx, ty);
    c.lineTo(tx + 1.6, ty + 1.4); c.lineTo(tx - 0.2, ty + 1.8); c.lineTo(tx + 1, ty + 3.2); c.lineTo(tx - 1, ty + 3.2);
    c.quadraticCurveTo(3, -1, 3.6, -1.2); c.closePath();
  };
  ink(ctx, P.wingShade, P.ink, 0.45, wing(flap, true));
  const body = (c) => { c.moveTo(-4, -2.6); c.quadraticCurveTo(-5.4, 2.8, 0.8, 3); c.quadraticCurveTo(5.8, 3, 7.2, -1); c.lineTo(9.2, -4.8); c.lineTo(6.4, -3.6); c.quadraticCurveTo(2, -4.4, -4, -2.6); c.closePath(); };
  ink(ctx, P.body, P.ink, 0.55, body);
  ctx.save(); ctx.beginPath(); body(ctx); ctx.clip();
  flat(ctx, P.bodyShade, (c) => c.ellipse(1.6, 2.8, 7.4, 2.2, 0, 0, TAU));
  ctx.restore();
  // Neck thrust out low and forward, the head at the end of it, beak open.
  const nb = Math.sin(ph) * 0.5;
  ink(ctx, P.body, P.ink, 0.55, (c) => { c.moveTo(-3.4, -2.6); c.quadraticCurveTo(-6.6, -5.2 + nb, -10.4, -3.2 + nb); c.lineTo(-10.6, -1.2 + nb); c.quadraticCurveTo(-6.4, -2.6 + nb, -3.2, 0.2); c.closePath(); });
  ink(ctx, P.body, P.ink, 0.5, (c) => c.ellipse(-11.2, -2.4 + nb, 2.1, 1.6, -0.1, 0, TAU));
  const gape = 0.5 + Math.abs(Math.sin(t * 6)) * 0.8;
  ink(ctx, P.mouth, null, 0, (c) => { c.moveTo(-12.6, -2.6 + nb); c.lineTo(-15.4, -2.8 - gape * 0.4 + nb); c.lineTo(-15.2, -1 + gape * 0.5 + nb); c.closePath(); });
  ink(ctx, P.beak, P.beakDark, 0.35, (c) => { c.moveTo(-12.4, -3.3 + nb); c.lineTo(-15.8, -2.9 - gape * 0.5 + nb); c.lineTo(-12.4, -2.1 + nb); c.closePath(); });
  ink(ctx, P.beak, P.beakDark, 0.35, (c) => { c.moveTo(-12.4, -2 + nb); c.lineTo(-15.4, -1 + gape * 0.6 + nb); c.lineTo(-12.2, -1.3 + nb); c.closePath(); });
  dot(ctx, -11.4, -3 + nb, 0.45, '#1a1816');
  ink(ctx, null, P.ink, 0.5, (c) => { c.moveTo(-12.4, -4.4 + nb); c.lineTo(-10.4, -3.8 + nb); });
  ink(ctx, P.body, P.ink, 0.45, wing(flap * 0.8, false));
  ctx.restore();
  // Honks: curved marks ahead of the beak, pulsing with the gape.
  const hk = (t * 3) % 1;
  ctx.save(); ctx.globalAlpha = 1 - hk;
  for (let i = 0; i < 3; i++) ink(ctx, null, '#ffffff', 0.55, (c) => c.arc(x - 16, g - 8.6 - bob, 2 + i * 1.6 + hk * 2, Math.PI * 0.8, Math.PI * 1.2));
  ctx.restore();
  // A loose feather or two drifting behind.
  for (let i = 0; i < 2; i++) {
    const k = (t * 0.8 + i * 0.5) % 1;
    const fx = x + 8 + k * 9, fy = g - 12 + k * 9 + Math.sin(k * 9 + i) * 1.5;
    const fa = Math.sin(t * 5 + i) * 0.8;
    ink(ctx, '#ffffff', P.ink, 0.25, (c) => c.ellipse(fx, fy, 1.5, 0.55, fa, 0, TAU));
  }
}

// ---- CURLED HEDGEHOG -------------------------------------------------------------------------
// A hedgehog rolled into a ball of spines in the lane. Now and then it uncurls enough
// to sniff — a pointed snout, a bead of an eye — then shivers and tucks back in. Never
// stomp it: the green hills' spiked shell.
const HOG = {
  spine: '#6b5038', spineDark: '#4a3626', spineTip: '#e3d4b2', body: '#8a6a4a', belly: '#b89572',
  face: '#caa57a', faceShade: '#a8845a', nose: '#1f1714', ink: '#2e2016',
};
function hedgehog(ctx, t, x, g) {
  const P = HOG;
  const per = 3.6, p = ((t + 0.9) % per + per) % per;
  const peek = p < 2.2 ? 0 : p < 2.5 ? smooth((p - 2.2) / 0.3) : p < 3.1 ? 1 : 1 - smooth((p - 3.1) / 0.3);
  const shiver = p > 3.1 && p < 3.5 ? Math.sin(t * 60) * 0.25 : 0;
  const breathe = 1 + 0.035 * Math.sin(t * 2.4);
  const cx = x + shiver, cy = g - 5.3;
  const R = 6.3 * breathe;
  contact(ctx, x, g, 7.5);
  // The body under the spines, and the face that peeks out of it on the runner's side.
  ink(ctx, P.body, P.ink, 0.5, (c) => c.ellipse(cx, cy + 0.6, R * 1.02, R * 0.84, 0, 0, TAU));
  flat(ctx, P.belly, (c) => c.ellipse(cx - 0.6, cy + R * 0.62, R * 0.7, R * 0.2, 0, 0, TAU));
  if (peek > 0.02) {
    const sx = cx - R * 0.72, sy = cy + 1.8;
    const len = 3.4 * peek;
    ink(ctx, P.face, P.ink, 0.45, (c) => { c.moveTo(sx + 1.6, sy - 1.8); c.quadraticCurveTo(sx - len * 0.6, sy - 1.6, sx - len, sy + 0.2); c.quadraticCurveTo(sx - len * 0.5, sy + 1.4, sx + 1.8, sy + 1.4); c.closePath(); });
    flat(ctx, P.faceShade, (c) => c.ellipse(sx - len * 0.2, sy + 0.9, len * 0.6 + 0.4, 0.5, 0, 0, TAU));
    dot(ctx, sx - len - 0.2, sy + 0.1, 0.62, P.nose);
    if (peek > 0.5) { dot(ctx, sx - len * 0.3, sy - 0.9, 0.45, P.nose); dot(ctx, sx - len * 0.3 - 0.15, sy - 1.1, 0.14, '#ffffff'); }
    for (const fx of [sx + 1, sx + 3.4]) ink(ctx, P.faceShade, P.ink, 0.3, (c) => c.ellipse(fx, g - 0.6, 1, 0.55, 0, 0, TAU));
  }
  // Spines: three rows fanned over the top, the back row longest and darkest, each
  // spine tipped pale — they quiver when it shivers.
  for (let row = 0; row < 3; row++) {
    const n = 12 - row * 2;
    for (let i = 0; i < n; i++) {
      const a = Math.PI + 0.12 + (i / (n - 1)) * (Math.PI - 0.24) + (row % 2 ? 0.08 : 0);
      const base = R * (0.72 - row * 0.2);
      const len = R * (0.62 - row * 0.1) + hash(i + row * 17) * 1.1 + shiver * 2;
      const qa = a + Math.sin(t * 40 + i) * 0.04 * (shiver ? 1 : 0);
      const bx = cx + Math.cos(qa) * base, by = cy + Math.sin(qa) * base * 0.9;
      const tx = cx + Math.cos(qa) * (base + len), ty = cy + Math.sin(qa) * (base + len) * 0.9;
      const nx = -Math.sin(qa) * 1.15, ny = Math.cos(qa) * 1.15;
      const col = row === 0 ? P.spineDark : P.spine;
      ink(ctx, col, P.ink, 0.3, (c) => { c.moveTo(bx - nx, by - ny); c.lineTo(tx, ty); c.lineTo(bx + nx, by + ny); c.closePath(); });
      flat(ctx, P.spineTip, (c) => { c.moveTo(lerp(bx - nx, tx, 0.62), lerp(by - ny, ty, 0.62)); c.lineTo(tx, ty); c.lineTo(lerp(bx + nx, tx, 0.62), lerp(by + ny, ty, 0.62)); c.closePath(); });
    }
  }
}

// ---- MUD PUDDLE --------------------------------------------------------------------------------
// A wide brown wallow in the lane, glossy on top, bubbles swelling and popping out of
// it, slide marks across it and splashes on the grass round the edge. Step in it and
// you skate — the banana peel's country cousin.
const MUD = {
  mud: '#6b4a2e', mudDark: '#4a311c', mudLight: '#8f6a45', gloss: 'rgba(255,240,215,0.6)', ink: '#3a2616',
};
function mudPuddle(ctx, t, x, g) {
  const P = MUD;
  const blob = (c, grow = 0) => {
    c.ellipse(x - 4, g - 0.2, 8.6 + grow, 2.4 + grow * 0.3, 0, 0, TAU);
    c.moveTo(x + 13 + grow, g - 0.1); c.ellipse(x + 5.5, g - 0.1, 7.5 + grow, 2 + grow * 0.3, 0.04, 0, TAU);
    c.moveTo(x + 6.4 + grow, g - 0.9); c.ellipse(x + 0.6, g - 0.9, 5.8 + grow, 1.6 + grow * 0.3, 0, 0, TAU);
  };
  ink(ctx, P.mudDark, P.ink, 0.5, (c) => blob(c, 0.8));
  ink(ctx, P.mud, null, 0, (c) => blob(c, 0));
  flat(ctx, P.mudLight, (c) => c.ellipse(x - 1, g - 1, 9, 0.9, 0, 0, TAU));
  // Slide marks across it, and gloss.
  ink(ctx, null, 'rgba(160,122,82,0.8)', 0.4, (c) => { c.moveTo(x - 10, g + 0.4); c.quadraticCurveTo(x - 2, g - 1.2, x + 8, g + 0.6); c.moveTo(x - 7, g + 1.1); c.quadraticCurveTo(x + 1, g - 0.4, x + 10, g + 1.2); });
  ink(ctx, null, P.gloss, 0.45, (c) => { c.moveTo(x - 8, g - 1.4); c.quadraticCurveTo(x - 4, g - 2.1, x, g - 1.8); c.moveTo(x + 4, g - 1.3); c.lineTo(x + 7, g - 1.2); });
  // Bubbles: each swells into a dome, then pops into droplets.
  for (const [bx, per, off, br] of [[x - 6, 1.5, 0, 1.4], [x + 3, 1.9, 0.7, 1.1], [x + 9, 1.3, 1.1, 0.9]]) {
    const p = ((t + off) % per) / per;
    if (p < 0.72) {
      const r = br * smooth(p / 0.72);
      ink(ctx, P.mudLight, P.ink, 0.3, (c) => { c.moveTo(bx - r, g - 0.7); c.arc(bx, g - 0.7, r, Math.PI, 0); c.closePath(); });
      dot(ctx, bx - r * 0.35, g - 0.7 - r * 0.55, r * 0.22, 'rgba(255,245,225,0.8)');
    } else {
      const k = (p - 0.72) / 0.28;
      for (const d of [-1, 0, 1]) dot(ctx, bx + d * k * 2.6, g - 0.8 - Math.sin(Math.PI * k) * (2 + (d ? 0 : 1.2)), 0.4 * (1 - k * 0.5), P.mud);
      ctx.save(); ctx.globalAlpha = 1 - k;
      ink(ctx, null, P.mudLight, 0.35, (c) => c.ellipse(bx, g - 0.7, br * (1 + k * 1.4), 0.4 + k * 0.3, 0, 0, TAU));
      ctx.restore();
    }
  }
  // Splashes on the grass round the edge.
  for (const [sx, sy, sr] of [[x - 14.6, g - 1.6, 0.8], [x - 16.4, g - 0.6, 0.5], [x + 14.4, g - 2, 0.7], [x + 16.6, g - 0.9, 0.55], [x - 12.8, g - 3.4, 0.45]]) dot(ctx, sx, sy, sr, P.mud);
}

// ---- THE RAKE -------------------------------------------------------------------------------------
// A garden rake left lying in the grass, tines up. Tread on the tines and the handle
// comes up to meet your face — THWACK — then quivers and topples back. Jump the tines;
// the stage can let it spring on a timer so the player sees the joke coming.
const RAKE = {
  wood: '#c1935a', woodShade: '#946a3a', ink: '#4a3218', metal: '#8e979f', metalDark: '#5e666e',
  metalLight: '#c6ccd2', star: '#fff3b0', starEdge: '#f2b33c',
};
function rakeAngle(t) {
  const per = 3.0, p = ((t + 1.2) % per + per) % per;
  if (p < 1.7) return 0;
  if (p < 1.82) return ((p - 1.7) / 0.12) * 1.62;
  if (p < 2.4) return 1.5 + Math.exp(-(p - 1.82) * 7) * Math.sin((p - 1.82) * 30) * 0.18;
  if (p < 2.72) return 1.5 * (1 - ((p - 2.4) / 0.32) ** 2);
  const b = (p - 2.72) / 0.28;
  return Math.abs(Math.sin(b * Math.PI)) * 0.12 * (1 - b);
}
function rakeTrap(ctx, t, x, g) {
  const P = RAKE;
  const a = rakeAngle(t);
  const hx = x + 7;
  const L = 24;
  contact(ctx, x - 2, g, 12, 0.22);
  // The handle, pivoting on the head: lying back toward you, or swung up.
  const ex = hx - Math.cos(a) * L, ey = g - 1.4 - Math.sin(a) * L;
  ink(ctx, P.wood, P.ink, 0.5, (c) => {
    const nx = -(ey - (g - 1.4)), ny = ex - hx, nl = Math.hypot(nx, ny) || 1;
    const ox = (nx / nl) * 0.8, oy = (ny / nl) * 0.8;
    c.moveTo(hx + ox, g - 1.4 + oy); c.lineTo(ex + ox, ey + oy); c.lineTo(ex - ox, ey - oy); c.lineTo(hx - ox, g - 1.4 - oy); c.closePath();
  });
  ink(ctx, null, P.woodShade, 0.4, (c) => { c.moveTo(hx - Math.cos(a) * 2, g - 1.2 - Math.sin(a) * 2); c.lineTo(ex, ey + 0.3); });
  // The head: a steel bar with its teeth pointing up.
  ink(ctx, P.metal, P.metalDark, 0.4, (c) => rr(c, hx - 4.8, g - 2.2, 9.6, 1.6, 0.5));
  flat(ctx, P.metalLight, (c) => c.rect(hx - 4.4, g - 2.1, 8.8, 0.5));
  for (let i = 0; i < 7; i++) {
    const tx = hx - 4.2 + i * 1.4;
    ink(ctx, P.metal, P.metalDark, 0.25, (c) => { c.moveTo(tx - 0.45, g - 2); c.lineTo(tx, g - 5.4); c.lineTo(tx + 0.45, g - 2); c.closePath(); });
  }
  ink(ctx, P.metalDark, null, 0, (c) => rr(c, hx - 1, g - 2.6, 2, 1.2, 0.3));
  // THWACK, at the top of the swing.
  const p = ((t + 1.2) % 3 + 3) % 3;
  if (p > 1.76 && p < 2.05) {
    const k = (p - 1.76) / 0.29;
    ctx.save();
    ctx.globalAlpha = 1 - k * 0.6;
    const sr = 3.4 + k * 2.4;
    ink(ctx, P.star, P.starEdge, 0.45, (c) => {
      for (let i = 0; i < 16; i++) {
        const aa = (i / 16) * TAU + 0.2, rr_ = i % 2 ? sr * 0.45 : sr;
        const px = ex - 3.5 + Math.cos(aa) * rr_, py = ey + 1 + Math.sin(aa) * rr_;
        if (i) c.lineTo(px, py); else c.moveTo(px, py);
      }
      c.closePath();
    });
    ctx.restore();
  }
  // Wobble arcs while it quivers.
  if (a > 1.2) {
    ctx.save(); ctx.globalAlpha = 0.8;
    for (const s of [-1, 1]) ink(ctx, null, '#ffffff', 0.45, (c) => c.arc(hx, g - 1.4, L * 0.92, -Math.PI / 2 - 0.12 * s - 0.05, -Math.PI / 2 - 0.12 * s + 0.05));
    ctx.restore();
  }
}

// ---- ELECTRIC FENCE --------------------------------------------------------------------------------
// A single live wire across the lane on two posts with yellow insulators, a warning sign
// swinging from it, sparks walking the wire and the whole line flashing each time the
// energiser ticks. The wire is 14.6 up: slide under it or jump it — never through it.
const EFENCE = {
  post: '#9a7a52', postShade: '#7a5e3c', ink: '#3e2c18', insulator: '#f2c43c', insulatorDark: '#c89a24',
  wire: '#d4d9de', wireDark: '#7f878f', sign: '#f6d33c', signInk: '#1a1a1a',
};
function electricFence(ctx, t, x, g) {
  const P = EFENCE;
  const lx = x - 11, rx = x + 11, wy = g - 14.6;
  const wireY = (u) => wy + 3.4 * u * (1 - u) + Math.sin(t * 47) * 0.05;
  for (const px of [lx, rx]) {
    contact(ctx, px, g, 3.2, 0.3);
    ink(ctx, P.post, P.ink, 0.5, (c) => { c.moveTo(px - 1.1, g + 0.3); c.lineTo(px - 1.1, g - 16.4); c.lineTo(px, g - 17.4); c.lineTo(px + 1.1, g - 16.4); c.lineTo(px + 1.1, g + 0.3); c.closePath(); });
    flat(ctx, P.postShade, (c) => c.rect(px + 0.1, g - 16.4, 1, 16.6));
    ink(ctx, P.insulator, P.insulatorDark, 0.3, (c) => rr(c, px - (px < x ? -0.6 : 2.6), wy - 1.1, 2, 2.2, 0.6));
  }
  const tick = t % 1.1;
  const flash = tick < 0.12 ? 1 - tick / 0.12 : 0;
  if (flash > 0) {
    ctx.save(); ctx.globalAlpha = flash * 0.6;
    ink(ctx, null, 'rgba(160,215,255,0.9)', 2.4, (c) => { c.moveTo(lx, wireY(0)); for (let u = 0; u <= 1.001; u += 0.1) c.lineTo(lerp(lx, rx, u), wireY(u)); });
    ctx.restore();
  }
  ink(ctx, null, P.wireDark, 0.7, (c) => { c.moveTo(lx, wireY(0)); for (let u = 0; u <= 1.001; u += 0.1) c.lineTo(lerp(lx, rx, u), wireY(u)); });
  ink(ctx, null, flash > 0 ? '#ffffff' : P.wire, 0.35, (c) => { c.moveTo(lx, wireY(0) - 0.15); for (let u = 0; u <= 1.001; u += 0.1) c.lineTo(lerp(lx, rx, u), wireY(u) - 0.15); });
  // Sparks crawling along the wire.
  for (let i = 0; i < 2; i++) {
    const k = (t * 0.9 + i * 0.5) % 1;
    const sx = lerp(lx, rx, k), sy = wireY(k);
    const seed = Math.floor(t * 18) + i * 7;
    glow(ctx, sx, sy, 3.2, '150,210,255', 0.65);
    ink(ctx, null, '#ffffff', 0.4, (c) => {
      c.moveTo(sx, sy);
      for (let s = 1; s <= 3; s++) c.lineTo(sx + (hash(seed + s) - 0.5) * 3.4, sy + (hash(seed + s * 3.3) - 0.5) * 3.4);
    });
  }
  // The warning sign, swinging on the wire.
  const mx = x, my = wireY(0.5);
  const sw = Math.sin(t * 2.3) * 0.12;
  ctx.save();
  ctx.translate(mx, my);
  ctx.rotate(sw);
  ink(ctx, null, P.wireDark, 0.3, (c) => { c.moveTo(-1.2, 0); c.lineTo(-1.4, 1.4); c.moveTo(1.2, 0); c.lineTo(1.4, 1.4); });
  ink(ctx, P.sign, P.signInk, 0.4, (c) => { c.moveTo(0, 1.2); c.lineTo(2.9, 6.2); c.lineTo(-2.9, 6.2); c.closePath(); });
  flat(ctx, P.signInk, (c) => { c.moveTo(0.4, 2.5); c.lineTo(-0.9, 4.4); c.lineTo(0, 4.4); c.lineTo(-0.5, 5.7); c.lineTo(1, 3.7); c.lineTo(0.1, 3.7); c.closePath(); });
  ctx.restore();
}

// ====================================================================== the air

// ---- WINGED LADYBIRD ----------------------------------------------------------------------
// A ladybird the size of a crate, hopping down the lane on buzzing wings: down to the
// road, up past head height, down again. Stomp it at the top of a hop, or slip under
// while it is up.
const LADY_ALT = 12;
const LADY = {
  shell: '#d8342e', shellLight: '#f26a55', shellDark: '#a4221f', ink: '#2a0a08', spot: '#1f1b20',
  head: '#232026', wing: 'rgba(232,244,255,0.72)', wingInk: 'rgba(110,140,170,0.85)',
};
function ladybird(ctx, t, x, y) {
  const P = LADY;
  const ground = y + LADY_ALT;
  const per = 1.05, p = ((t % per) + per) % per / per;
  const hop = Math.sin(Math.PI * p);
  const squash = p < 0.06 ? 1 - p / 0.06 : p > 0.94 ? (p - 0.94) / 0.06 : 0;
  const by = ground - 5.2 - hop * 20;
  if (hop < 0.35) drawSoftContactShadow(ctx, x, ground - 1, 6 * (1 - hop), 1.8, { alpha: 0.3 * (1 - hop / 0.35) });
  ctx.save();
  ctx.translate(x, by);
  ctx.scale(1 + squash * 0.12, 1 - squash * 0.14);
  const flap = Math.sin(t * 34);
  // A membrane wing: a long leaf-shaped blade from the shoulder, `a` its angle.
  const wing = (a, len, wid) => (c) => {
    const ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca;
    const ox = 1.5, oy = -4.5;
    c.moveTo(ox, oy);
    c.bezierCurveTo(ox + ca * len * 0.3 + nx * wid, oy + sa * len * 0.3 + ny * wid, ox + ca * len * 0.85 + nx * wid * 0.9, oy + sa * len * 0.85 + ny * wid * 0.9, ox + ca * len, oy + sa * len);
    c.bezierCurveTo(ox + ca * len * 0.8 - nx * wid * 0.35, oy + sa * len * 0.8 - ny * wid * 0.35, ox + ca * len * 0.3 - nx * wid * 0.3, oy + sa * len * 0.3 - ny * wid * 0.3, ox, oy);
    c.closePath();
  };
  const veins = (a, len) => (c) => { const ca = Math.cos(a), sa = Math.sin(a); c.moveTo(1.5, -4.5); c.lineTo(1.5 + ca * len * 0.92, -4.5 + sa * len * 0.92); };
  const aFar = -1.95 + flap * 0.5, aNear = -1.55 + flap * 0.62;
  // Motion ghosts either side of the beat, then the far wing behind the shell.
  ctx.save(); ctx.globalAlpha = 0.25;
  for (const a of [-2.5, -1.0]) ink(ctx, P.wing, null, 0, wing(a, 12, 4));
  ctx.restore();
  ink(ctx, P.wing, P.wingInk, 0.35, wing(aFar, 11, 3.8));
  ink(ctx, null, P.wingInk, 0.3, veins(aFar, 11));
  // Legs, tucked in flight and reaching as it comes down.
  const reach = 1 - hop;
  ink(ctx, null, P.head, 0.45, (c) => { for (const lx of [-3, 0, 3]) { c.moveTo(lx, 2); c.lineTo(lx - 0.8, 2.6 + reach * 2.2); c.lineTo(lx - 1.8, 3 + reach * 2.4); } });
  // Head, antennae, the white cheek dots.
  ink(ctx, P.head, '#000000', 0.45, (c) => c.ellipse(-6.4, 0.2, 3.1, 2.7, 0, 0, TAU));
  ink(ctx, null, P.head, 0.4, (c) => { c.moveTo(-7.4, -2); c.quadraticCurveTo(-9, -5, -10.6, -4.6); c.moveTo(-6.4, -2.2); c.quadraticCurveTo(-7.2, -5.6, -8.6, -6.2); });
  dot(ctx, -10.6, -4.6, 0.5, P.head); dot(ctx, -8.6, -6.2, 0.5, P.head);
  ink(ctx, '#ffffff', null, 0, (c) => c.ellipse(-7.4, -0.4, 1.05, 1.25, 0, 0, TAU));
  dot(ctx, -7.8, -0.3, 0.55, '#0b0b0e');
  dot(ctx, -7.6, -0.8, 0.2, '#ffffff');
  flat(ctx, 'rgba(255,255,255,0.85)', (c) => c.ellipse(-5.4, 1.6, 0.8, 0.5, 0, 0, TAU));
  // The shell: a dome with the seam down its back and seven spots.
  const dome = (c) => { c.moveTo(-5.2, 2.4); c.bezierCurveTo(-6.4, -5.6, -1.4, -7.4, 1.6, -7.4); c.bezierCurveTo(5.4, -7.4, 8.6, -4.4, 7.8, 2.4); c.quadraticCurveTo(1.3, 3.8, -5.2, 2.4); c.closePath(); };
  ink(ctx, P.shell, P.ink, 0.6, dome);
  ctx.save(); ctx.beginPath(); dome(ctx); ctx.clip();
  flat(ctx, P.shellDark, (c) => c.ellipse(6, 1, 5, 6.6, 0.3, 0, TAU));
  for (const [sx, sy, r] of [[-2.6, -3, 1.4], [1.4, -5.4, 1.2], [4.6, -3.2, 1.5], [-0.6, 0.2, 1.3], [3.8, 0.6, 1.2], [-4, 0.6, 0.9]]) flat(ctx, P.spot, (c) => c.ellipse(sx, sy, r, r * 0.9, 0, 0, TAU));
  flat(ctx, P.shellLight, (c) => c.ellipse(-1.6, -5.6, 2.6, 1.1, -0.3, 0, TAU));
  flat(ctx, 'rgba(255,236,230,0.75)', (c) => c.ellipse(-2.4, -6, 1, 0.45, -0.3, 0, TAU));
  ctx.restore();
  ink(ctx, null, 'rgba(42,10,8,0.8)', 0.45, (c) => { c.moveTo(-3.8, -4.2); c.quadraticCurveTo(0.6, -2.6, 3.4, 3); });
  // Near wing, over the shell.
  ink(ctx, P.wing, P.wingInk, 0.35, wing(aNear, 12.5, 4.4));
  ink(ctx, null, P.wingInk, 0.3, veins(aNear, 12.5));
  ctx.restore();
}

// ---- FLUSHED PHEASANT --------------------------------------------------------------------------
// A cock pheasant sitting tight in a tussock at the lane's edge. The grass shivers, a
// head comes up — and it bursts out, rising steeply across the runner's path in a
// clatter of wings, feathers left spinning behind. A RISING air hazard: it crosses
// head height on the way up, so the timing is the whole of it.
const PHEAS_ALT = 18;
const PHEAS = {
  body: '#c77a3c', bodyShade: '#a55e28', scallop: 'rgba(70,36,14,0.55)', head: '#2f5e52', headShine: '#4f8f7a',
  ring: '#f4f0e6', face: '#d8453a', beak: '#d8c8a0', wing: '#b58a52', wingBar: '#8a6030', tail: '#b58a52',
  tailBar: '#5a3a1e', ink: '#3a220e', grass: '#4f8a3e', grassLight: '#6aa04e', grassInk: '#2c5424',
};
function pheasantBird(ctx, x, y, s, flap, pitch) {
  const P = PHEAS;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(pitch);
  ctx.scale(s, s);
  // Facing left: tail streaming back to the right, wings clattering.
  const wing = (lift, far) => (c) => {
    const a = -1.6 + lift * 1.3 + (far ? -0.2 : 0);
    const tx = 0.5 + Math.cos(a) * 7, ty = -1.5 + Math.sin(a) * 7;
    c.moveTo(-1.8, -1.8);
    c.quadraticCurveTo(tx - 3, ty + 0.5, tx, ty);
    c.quadraticCurveTo(tx + 2.6, ty + 1.6, 2.6, -0.8);
    c.closePath();
  };
  ink(ctx, P.wingBar, P.ink, 0.4, wing(flap, true));
  ink(ctx, P.tail, P.ink, 0.45, (c) => { c.moveTo(3.2, -1.2); c.quadraticCurveTo(9, -0.6, 14.2, 2.4); c.lineTo(13.8, 3.2); c.quadraticCurveTo(8.6, 1.2, 3, 1); c.closePath(); });
  ink(ctx, null, P.tailBar, 0.35, (c) => { for (let k = 5; k < 14; k += 2.1) { c.moveTo(k, -0.5 + k * 0.2); c.lineTo(k - 0.3, 1.1 + k * 0.17); } });
  const body = (c) => c.ellipse(0, 0, 5, 3, 0, 0, TAU);
  ink(ctx, P.body, P.ink, 0.55, body);
  ctx.save(); ctx.beginPath(); body(ctx); ctx.clip();
  flat(ctx, P.bodyShade, (c) => c.ellipse(1, 2.4, 5, 2, 0, 0, TAU));
  for (let i = 0; i < 9; i++) dot(ctx, -3 + (i % 3) * 2.6 + (i > 2 ? 0.8 : 0), -1.4 + Math.floor(i / 3) * 1.3, 0.35, P.scallop);
  ctx.restore();
  // Neck ring, iridescent head, the red face wattle, beak.
  ink(ctx, P.ring, null, 0, (c) => c.ellipse(-4.4, -1.4, 1.2, 1.6, 0.4, 0, TAU));
  ink(ctx, P.head, P.ink, 0.45, (c) => { c.moveTo(-4.2, -1.8); c.quadraticCurveTo(-5.4, -4.4, -7.4, -4.6); c.quadraticCurveTo(-8.6, -3.6, -7.2, -2.6); c.quadraticCurveTo(-6, -2.2, -5, -0.8); c.closePath(); });
  flat(ctx, P.headShine, (c) => c.ellipse(-5.6, -3.6, 1, 0.4, -0.4, 0, TAU));
  flat(ctx, P.face, (c) => c.ellipse(-7.2, -3.6, 0.9, 0.7, 0, 0, TAU));
  ink(ctx, P.beak, P.ink, 0.25, (c) => { c.moveTo(-8.2, -3.8); c.lineTo(-9.4, -3.3); c.lineTo(-8.1, -3); c.closePath(); });
  dot(ctx, -7.4, -3.9, 0.3, '#1a1410');
  ink(ctx, P.wing, P.ink, 0.45, wing(flap * 0.85, false));
  ctx.restore();
}
function tussock(ctx, x, g, rustle) {
  const P = PHEAS;
  for (let i = 0; i < 9; i++) {
    const bx = x - 7 + i * 1.7;
    const h = 7 + hash(i * 3.3) * 5;
    const lean = (i - 4) * 0.35 + Math.sin(i * 1.3 + rustle * 40) * rustle * 1.6;
    ink(ctx, i % 2 ? P.grass : P.grassLight, P.grassInk, 0.3, (c) => { c.moveTo(bx - 0.8, g); c.quadraticCurveTo(bx + lean * 0.4, g - h * 0.6, bx + lean, g - h); c.quadraticCurveTo(bx + lean * 0.3 + 0.6, g - h * 0.5, bx + 0.8, g); c.closePath(); });
  }
}
function flushedPheasant(ctx, t, x, y) {
  const P = PHEAS;
  const ground = y + PHEAS_ALT;
  const per = 2.0, p = ((t + 0.35) % per + per) % per;
  const tx = x + 6;
  if (p < 0.9) {
    // Sitting tight: the grass shivers, then the head comes up to look.
    const rustle = smooth(p / 0.9) * (0.5 + 0.5 * Math.sin(t * 30));
    const look = smooth((p - 0.55) / 0.3);
    if (look > 0) {
      ink(ctx, P.head, P.ink, 0.4, (c) => { c.moveTo(tx - 1, ground - 5); c.quadraticCurveTo(tx - 1.6, ground - 5 - look * 4, tx - 3.4, ground - 5.6 - look * 4.2); c.quadraticCurveTo(tx - 4.4, ground - 4.8 - look * 4, tx - 2.8, ground - 4.4 - look * 3.4); c.lineTo(tx + 0.6, ground - 4.4); c.closePath(); });
      flat(ctx, P.face, (c) => c.ellipse(tx - 3.2, ground - 5 - look * 4, 0.7, 0.55, 0, 0, TAU));
      flat(ctx, P.ring, (c) => c.ellipse(tx - 1.2, ground - 5 - look * 1.6, 0.8, 0.4, 0, 0, TAU));
    }
    tussock(ctx, tx, ground, rustle);
    return;
  }
  // The flush: up and out across the lane toward the runner, wings a blur.
  const k = (p - 0.9) / 1.1;
  const bx = tx - 22 * k - 6 * k * k, by = ground - 5 - 42 * (1 - (1 - k) * (1 - k));
  tussock(ctx, tx, ground, Math.max(0, 1 - k * 3));
  for (let i = 0; i < 4; i++) {
    const fk = clamp01(k * 1.6 - i * 0.12);
    if (fk <= 0 || fk >= 1) continue;
    const fx = tx - 2 + (i - 1.5) * 3 * fk, fy = ground - 6 - fk * 10 + fk * fk * 12;
    const fa = t * 6 + i * 1.7;
    ink(ctx, i % 2 ? P.body : P.wing, P.ink, 0.25, (c) => c.ellipse(fx, fy, 1.6, 0.6, fa, 0, TAU));
  }
  const flap = Math.sin(t * 38);
  // Nose up along its climb (it faces left), eased so the art never stands on its tail.
  const pitch = 0.55 * Math.atan2(84 * (1 - k), 22 + 12 * k);
  ctx.save();
  ctx.globalAlpha = 0.25;
  pheasantBird(ctx, bx + 1, by + 1.2, 1, -flap, pitch);
  ctx.restore();
  pheasantBird(ctx, bx, by, 1, flap, pitch);
}

// ---- SWOOPING MAGPIE --------------------------------------------------------------------------
// A magpie comes down out of the sky in a long swoop to head height and back up, and
// on the way through takes the coin that was hanging there. Slide under the bottom of
// the swoop — or catch it on the way up and the coin comes back.
const MAG_ALT = 16;
const MAG = {
  black: '#1f2128', blackShine: '#34405a', white: '#f4f2ec', whiteShade: '#d6d2c8', wingBlue: '#2c4a6a',
  tail: '#1f2a32', tailShine: '#2f5a5a', ink: '#0e0f13', coin: '#f6d33c', coinShade: '#d2a42a', coinLight: '#fff4a8',
};
function magpieBird(ctx, x, y, dir, pitch, flap) {
  const P = MAG;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir * 1.2, 1.2);
  ctx.rotate(pitch);
  // Facing +x (mirrored to face the way it flies).
  const wing = (up, far) => (c) => {
    const a = -0.35 - up * 1.05 - (far ? 0.15 : 0);
    const tx = -1.5 + Math.cos(Math.PI - a) * 8.4, ty = -1.6 - Math.sin(-a) * 8.4 * 0.9;
    c.moveTo(1.8, -1.8);
    c.quadraticCurveTo(tx + 3, ty - 1.2, tx, ty);
    c.lineTo(tx - 0.6, ty + 1.2); c.lineTo(tx + 0.8, ty + 1.3); c.lineTo(tx + 0.2, ty + 2.4);
    c.quadraticCurveTo(-1.4, -0.4, -2.2, -1);
    c.closePath();
  };
  ink(ctx, '#15171c', P.ink, 0.35, wing(flap, true));
  // The long wedge tail, green-blue in the light.
  ink(ctx, P.tail, P.ink, 0.4, (c) => { c.moveTo(-3.2, -1.4); c.lineTo(-11.6, -2.4); c.lineTo(-12, -0.9); c.lineTo(-3.2, 0.4); c.closePath(); });
  ink(ctx, null, P.tailShine, 0.5, (c) => { c.moveTo(-4.4, -0.8); c.lineTo(-10.8, -1.5); });
  const body = (c) => { c.moveTo(4.4, -2.4); c.quadraticCurveTo(1, -3.6, -3.6, -1.6); c.quadraticCurveTo(-1.4, 1.4, 2.6, 1); c.quadraticCurveTo(4.6, 0.2, 4.4, -2.4); c.closePath(); };
  ink(ctx, P.black, P.ink, 0.45, body);
  ctx.save(); ctx.beginPath(); body(ctx); ctx.clip();
  flat(ctx, P.white, (c) => c.ellipse(0.4, 0.6, 3.2, 1.5, -0.1, 0, TAU));
  flat(ctx, P.whiteShade, (c) => c.ellipse(1, 1.4, 2.6, 0.8, 0, 0, TAU));
  ctx.restore();
  ink(ctx, P.black, P.ink, 0.4, (c) => c.arc(4.6, -2.6, 1.55, 0, TAU));
  flat(ctx, P.blackShine, (c) => c.ellipse(4.4, -3.4, 0.8, 0.35, -0.3, 0, TAU));
  ink(ctx, '#2a2b30', P.ink, 0.25, (c) => { c.moveTo(5.8, -3); c.lineTo(8, -2.4); c.lineTo(5.9, -2); c.closePath(); });
  dot(ctx, 5, -3, 0.32, '#e8e6e0');
  const w = wing(flap * 0.9, false);
  ink(ctx, P.black, P.ink, 0.4, w);
  ctx.save(); ctx.beginPath(); w(ctx); ctx.clip();
  flat(ctx, P.white, (c) => c.ellipse(-0.4, -2.2 - flap * 2, 2.2, 1, -0.4 - flap * 0.6, 0, TAU));
  flat(ctx, P.wingBlue, (c) => c.ellipse(-5, -4 - flap * 4, 3.4, 1.6, -0.6 - flap * 0.8, 0, TAU));
  ctx.restore();
  ctx.restore();
}
function coinArt(ctx, cx, cy, t, s = 1) {
  const P = MAG;
  const w = Math.max(0.2, Math.abs(Math.cos(t * 7))) * 2.4 * s, h = 3 * s;
  ink(ctx, P.coin, '#8a6410', 0.35, (c) => c.ellipse(cx, cy, w, h, 0, 0, TAU));
  flat(ctx, P.coinShade, (c) => c.ellipse(cx + w * 0.3, cy + h * 0.15, w * 0.6, h * 0.75, 0, 0, TAU));
  flat(ctx, P.coinLight, (c) => rr(c, cx - w * 0.2, cy - h * 0.5, Math.max(0.2, w * 0.3), h, w * 0.15));
}
function swoopingMagpie(ctx, t, x, y) {
  const ground = y + MAG_ALT;
  const per = 2.6, p = ((t + 0.25) % per + per) % per, k = p / per;
  // The swoop: a parabola from high on the right, down to head height, up and away left.
  const sx = x + 34 - 68 * k;
  const sy = ground - 15 - 30 * (2 * k - 1) ** 2;
  // The flight path's angle for a bird flying left: dy/dk over the leftward speed.
  const pitch = Math.atan2(-120 * (2 * k - 1), 68);
  const took = k > 0.5;
  // A point in the bird's own frame, on screen — for the coin in its beak.
  const onBird = (lx, ly) => {
    const c = Math.cos(pitch), s = Math.sin(pitch);
    return [sx - 1.2 * (lx * c - ly * s), sy + 1.2 * (lx * s + ly * c)];
  };
  if (!took) {
    const bob = Math.sin(t * 3) * 0.8;
    glow(ctx, x, ground - 13 + bob, 5, '255,230,120', 0.35);
    coinArt(ctx, x, ground - 13 + bob, t);
  }
  const flap = k < 0.42 ? -0.3 + Math.sin(t * 3) * 0.1 : Math.sin(t * 16);
  magpieBird(ctx, sx, sy, -1, pitch, flap);
  if (took) {
    const [cx, cy] = onBird(7.6, -0.6);
    coinArt(ctx, cx, cy + 1.6, t * 0.3, 0.8);
    if (k < 0.62) glow(ctx, cx, cy + 1.6, 4, '255,240,160', 0.5 * (1 - (k - 0.5) / 0.12));
  }
}

// Every painter runs inside its own save/restore — even when it throws — so nothing
// it sets (styles, transforms, clips) can leak into whatever draws after it.
const sealed = (fn) => (ctx, ...args) => {
  ctx.save();
  try { fn(ctx, ...args); } finally { ctx.restore(); }
};

export const PLUMBER_IDEAS = [
  // ---- background (paper cutouts, all animated)
  { id: 'windmill', place: 'bg', name: 'SHIPS (level 3) — Windmill on its mound', paint: sealed(windmill),
    note: 'A whitewashed tower mill on a summit of the near ridge — the production one, 0.75 of the size it was bid at, standing on a grassy mound built up on the crest so its footing is level. Four lattice sails turn slowly, each canvas breathing on its own phase; a weathervane pennant on the cap, flour sacks at the door. Near parallax (0.35). Level 3\'s landmark.' },
  { id: 'barn', place: 'bg', name: 'SHIPS (level 1) — Red barn, silo and rooster vane', paint: sealed(barn),
    note: 'A gambrel-roofed red barn on a near summit with a steel silo beside it, hay at the door and a hayloft hoist. The rooster weathervane swings round with the wind (it turns in depth rather than sliding), the hoist rope sways and three hens peck about the yard on the hill face below. Once a stage — the farm the whole country around it belongs to.' },
  { id: 'sheep', place: 'bg', name: 'SHIPS (all levels) — Sheep and a working collie', paint: sealed(sheepFlock),
    note: 'A flock grazing over a near summit — some on the crest, some down the face, a lamb at its mother\'s side — heads down in the grass and up to chew, each on its own clock. A collie runs the crest behind them, crouching at each turn, and the sheep it passes lift their heads and shy away. The life the empty green slopes were missing; one or two flocks a stage.' },
  { id: 'tractor', place: 'bg', name: 'Tractor hauling hay', paint: sealed(tractorRig),
    note: 'A red tractor towing a trailer of bales along the ridge. Every wheel stands on the crest where it is, so the rig climbs each hill, tips over the top and noses down the far side; tyres turn by the distance driven, the stack puffs, the farmer rides it in his cap. It drives the same way you run, slower, so you overtake it: once a stage, mid-way.' },
  { id: 'scarecrow', place: 'bg', name: 'Scarecrow in the wheat', paint: sealed(scarecrowField),
    note: 'A field of ripe wheat running down the face of a near summit between two hedgerows, poppies nodding at their feet. The wind runs through it in waves — the ears along the crest bow and pale bands roll downwind — and the scarecrow on top flaps its sleeves and holds on to its hat while three crows keep testing it: perched, off on a wheel round the field, gliding back in. Late-summer stages, once each.' },
  { id: 'duckpond', place: 'bg', name: 'Duck pond in the valley', paint: sealed(duckPond),
    note: 'The dip between two near hills has filled with water up to a level line, with a jetty on the far bank. A mother duck swims it end to end with four ducklings in a line, each with its own V of ripples; at the bank the line turns a duckling at a time. Reeds sway, lily pads bob, a dragonfly darts and hovers. Once a stage, in a valley — the hills\' own water.' },
  { id: 'kites', place: 'bg', name: 'Kites on the hilltop', paint: sealed(kiteHill),
    note: 'Two children on a near summit flying kites: a diamond with a tail of bows and a delta with streamers, each swinging figure-eights on the wind at the top of a long sagging string, the older child leaning back into the pull. It fills the sky over the hills with something that belongs to them. A windy stage; the kites could dip when the stage\'s music drops.' },
  { id: 'train', place: 'bg', name: 'Branch line over a viaduct', paint: sealed(steamTrain),
    note: 'A stone viaduct across a valley between two knolls, a tunnel mouth in each. A tank engine and two coaches come out of one tunnel, puff across the arches and go into the other, and a tunnel breathes out smoke after it. The smoke is born where the chimney was, so it trails. Mid distance (parallax 0.2), behind the near hills; once a world.' },
  { id: 'patchwork', place: 'bg', name: 'SHIPS (level 1, near the end) — Patchwork fields', paint: sealed(patchworkFields),
    note: 'The farmland under the far range: two rolling bands of foothills (parallax 0.18 and 0.24, between the range and the near hills) quilted into fields of greens, straw and ploughed brown, stitched by hedgerows with trees along them, a farmstead in one field. Cloud shadows slide across on the wind and a tiny tractor ploughs one field a furrow at a time, gulls wheeling after it. It shows over every near crest and down every valley, so it could run under whole stages.' },
  { id: 'waterfall', place: 'bg', name: 'Waterfall off a bluff', paint: sealed(waterfall),
    note: 'A sandstone bluff between the range and the near hills, a river pouring off a notch in its top. The plunge pool is hidden behind the near ridge, so what shows is the churn cresting the hill line, mist rolling off it and a faint bow standing in the mist; streaks race down the fall. Parallax 0.25. Once a stage, mid-way — the landmark for a stage with water in its lane.' },
  { id: 'balloon', place: 'bg', name: 'SHIPS (level 2, twice) — Hot-air balloon', paint: sealed(balloon),
    note: 'A red-and-cream balloon drifting across the sky. Every 3.4s the burner roars — a tongue of flame at the throat, the envelope lit warm from inside — and the balloon lifts before it settles; someone in the basket waves. Parallax 0.12 plus its own drift, so it takes most of a stage to cross: sky life for the stages without a landmark.' },
  // ---- the lane (props language: flat fills, hue-matched contour, contact shadow)
  { id: 'haybale', place: 'lane', name: 'Square hay bale (break)', paint: sealed(hayBale),
    note: 'A small square bale dropped in the lane: two red twines, straw texture, stray straws stirring and chaff blowing off downwind. Break it and it bursts into straw (a coin or two inside), or jump it — the countryside\'s crate, the same size and job.' },
  { id: 'roundbale', place: 'lane', name: 'Round bale rolling (jump)', paint: sealed(roundBale),
    note: 'A big round bale come loose at the top of the hill and rolling down the lane at you, its hay spiral turning as it goes, straw flicking off the back, dust behind, a bump now and then. Jump it — the rolling barrel\'s job, in straw.' },
  { id: 'gate', place: 'lane', name: 'Field gate on a timer', paint: sealed(fieldGate), zoom: 4.4,
    note: 'A five-bar field gate across the lane on a 3.4s swing: shut, it is a fence to jump; then it swings away on its hinge post (the far end drawing in and shrinking with distance), stands open while you run through, and slams back rattling on its latch. A timing hazard with a safe window you can see coming.' },
  { id: 'goose', place: 'lane', name: 'Charging goose (fast mover)', paint: sealed(chargingGoose),
    note: 'A farmyard goose that has decided the lane is hers: neck out low, beak wide open honking, wings half up and beating, orange feet paddling flat out at the runner, a feather or two left behind. A fast mover — jump it, or bop it and it flaps off.' },
  { id: 'hedgehog', place: 'lane', name: 'Curled hedgehog (jump, never stomp)', paint: sealed(hedgehog),
    note: 'A hedgehog rolled into a ball of pale-tipped spines. Every few seconds it uncurls enough to sniff — a pointed snout, a bead of an eye — then shivers and tucks back in. Jump it, never stomp it: the green hills\' answer to the spiked shell.' },
  { id: 'mud', place: 'lane', name: 'Mud puddle (slip)', paint: sealed(mudPuddle), zoom: 4.6,
    note: 'A wide brown wallow in the lane, glossy on top, bubbles swelling and popping out of it, slide marks across it and splashes on the grass round its edge. Run through and you skate, losing control for a beat — the banana peel\'s country cousin; jump it to stay clean.' },
  { id: 'rake', place: 'lane', name: 'Rake in the grass (slapstick)', paint: sealed(rakeTrap), zoom: 3.8,
    note: 'A garden rake lying in the grass, tines up. Tread on them and the handle swings up to meet your face — THWACK — quivers and topples back. Jump the tines; the stage can spring it on a timer the first time so the joke is seen before it is felt.' },
  { id: 'efence', place: 'lane', name: 'Electric fence (slide or jump)', paint: sealed(electricFence), zoom: 4.4,
    note: 'One live wire across the lane on two posts with yellow insulators, a warning sign swinging from it, sparks crawling along it and the whole line flashing each time the energiser ticks. The wire is 14.6 world px up: slide under it or jump it, never through it — a two-answer hazard.' },
  // ---- the air
  { id: 'ladybird', place: 'air', name: 'Winged ladybird (bouncing)', paint: sealed(ladybird), alt: LADY_ALT, closeAlt: LADY_ALT, zoom: 4,
    note: 'A crate-sized ladybird hopping down the lane on buzzing wings — down to the road, up past head height, down again, a squash and a reach of its legs at each landing (1.05s hop). Stomp it at the top of a hop or slip under while it is up. Red and spotted, it reads against the sky and the turf alike.' },
  { id: 'pheasant', place: 'air', name: 'Flushed pheasant (rising)', paint: sealed(flushedPheasant), alt: PHEAS_ALT, closeAlt: PHEAS_ALT, zoom: 2.6,
    note: 'A cock pheasant sitting tight in a tussock at the lane\'s edge: the grass shivers, a head comes up to look — and it bursts out, rising steeply across your path in a clatter of wings, feathers left spinning. A rising air hazard on a 2s cycle: it crosses head height on the way up, so go before it flushes or after it has gone over.' },
  { id: 'magpie', place: 'air', name: 'Swooping magpie (steals a coin)', paint: sealed(swoopingMagpie), alt: MAG_ALT, closeAlt: MAG_ALT, zoom: 2.6,
    note: 'A magpie drops out of the sky in a long swoop to head height and back up, snatching the coin that was hanging at the bottom of it. Slide under the swoop — or catch it on the way up and it drops the coin. A thief is something the lane does not have yet, and the bird is the countryside\'s.' },
];
