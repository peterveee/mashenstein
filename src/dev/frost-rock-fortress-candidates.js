// FROST FORTRESS — the ridge's rocks and fortresses, BAKE-OFF (Peter, 25 Sep 2026: "in frost
// leveo, i don't love the rocks/fortresses we have... they look super basic compar4ed to a
// lot of our new background stuff... can you do a bakeoff with new better options that we
// might replace and/or incorporate in").
//
// Gallery-only. Each candidate is a SHAPE for one scenery kind — 'landmark' (the fortress
// on the far ridge, a different building per stage) or 'ice-rock' (the rock on the near
// ridge) — and reaches the REAL backdrop through drawFrostSceneryFeature's `shapes` seam
// (stylePacks/index.js): same placement, footprint, lean, snow-line clip, skirt, paper
// shadow, grain and haze. So a candidate paints ONLY from the hazed palette's keys (far,
// near, snow, shadow, ice, iceShadow, landmark, warm) and mixes of them — the paper
// passes hand it a palette with every key one colour, which is how its shadow comes out
// a clean silhouette — and supplies a silhouette path for the skirt and the grain.
//
// Footprints are the shipped ones: a fortress within x ±23 (stage 2's width), up to
// about 46 tall; a rock within x ±13, base on y = 2.
import { FROST_PAPER } from '../engine/stylePacks/frostWildlife.js';
import { FROST_FORTRESS_SHAPES } from '../engine/stylePacks/frostFortresses.js';
import { GROUND_Y, VIEW_W, ZOOM, applyWorld } from '../engine/camera.js';
import { getStylePack } from '../engine/stylePacks/index.js';
import { FROST_COMBINED_SCENERY_FINISH } from '../engine/stylePacks/frostSceneryFinish.js';
import { CABINETS } from '../data/cabinets.js';
import { drawToon } from '../sprites/toons.js';
import { HERO_DRAW_H } from '../game/draw.js';
import { PLAYER_X } from '../game/player.js';

const { mix } = FROST_PAPER;
const TAU = Math.PI * 2;

function fill(ctx, color, path) { ctx.beginPath(); path(ctx); ctx.fillStyle = color; ctx.fill(); }
function line(ctx, color, w, path) {
  ctx.beginPath(); path(ctx);
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
}
const poly = (p) => (c) => { c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.closePath(); };
const tracePoly = (c, p) => { c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); };
const box = (x, y, w, h) => (c) => c.rect(x, y, w, h);

// The tones every candidate builds from. `lit` is the face turned to the sky, `mid` the
// face across it, `dark` the one in its own shade.
function tones(P) {
  return {
    lit: P.ice, mid: mix(P.ice, P.landmark, 0.5), dark: P.landmark, deep: P.shadow,
    snow: P.snow, snowShade: mix(P.snow, P.ice, 0.45), warm: P.warm,
    unlit: mix(P.warm, P.landmark, 0.78), rockLit: mix(P.near, P.ice, 0.45), rock: P.near,
  };
}

// Three windows at most, each on its own slow blink seeded off the fortress's world tile
// (the shipped rule, stylePacks/index.js frostWindows).
function windows(ctx, T, cells, o = {}) {
  const t = Number(o.t) || 0;
  const seed = Math.abs(Math.round(Number(o.seed) || 0));
  cells.forEach(([x, y, w, h, arch], i) => {
    const key = seed * 31 + i * 7;
    const period = 2.6 + (key % 8) * 0.3;
    const u = ((t / period) + ((key * 0.6180339887) % 1)) % 1;
    const blink = u < 0.06 || (key % 3 !== 0 && u > 0.1 && u < 0.15);
    const col = blink ? T.unlit : T.warm;
    if (arch) {
      fill(ctx, col, (c) => { c.moveTo(x, y + h); c.lineTo(x, y + w / 2); c.quadraticCurveTo(x, y, x + w / 2, y); c.quadraticCurveTo(x + w, y, x + w, y + w / 2); c.lineTo(x + w, y + h); c.closePath(); });
    } else fill(ctx, col, box(x, y, w, h));
  });
}
// A row of merlons along y from x0 to x1, each capped with snow.
function crenels(ctx, T, x0, x1, y, { w = 2.4, gap = 1.6, h = 2.2, color } = {}) {
  for (let x = x0; x + w <= x1 + 0.01; x += w + gap) {
    fill(ctx, color || T.dark, box(x, y - h, w, h));
    fill(ctx, T.snow, box(x - 0.2, y - h - 0.7, w + 0.4, 0.9));
  }
}
function crenelPath(c, x0, x1, y, { w = 2.4, gap = 1.6, h = 2.2 } = {}) {
  // Traced left to right along the top of a wall (for silhouettes).
  for (let x = x0; x + w <= x1 + 0.01; x += w + gap) {
    c.lineTo(x, y - h); c.lineTo(x + w, y - h); c.lineTo(x + w, y);
    if (x + w + gap <= x1) c.lineTo(x + w + gap, y);
  }
}
// A cone roof over [x0, x1] from eave y up to apex; lit on its left half, snow down the
// lit side, a little snow on the eave.
function cone(ctx, T, x0, x1, y, apex) {
  const cx = (x0 + x1) / 2;
  fill(ctx, T.dark, poly([x0 - 1, y, cx, apex, x1 + 1, y]));
  fill(ctx, T.mid, poly([x0 - 1, y, cx, apex, cx + 0.4, y]));
  fill(ctx, T.snow, poly([x0 - 0.6, y - 0.4, cx, apex, cx - 0.2, apex + (y - apex) * 0.55, x0 + (cx - x0) * 0.55, y - 1.2]));
  fill(ctx, T.snow, box(x0 - 1.2, y - 0.3, x1 - x0 + 2.4, 0.9));
}

// ================================================================ F-B: THE ICE KEEP
// A castle: curtain walls with snow on every merlon, round towers under conical spires,
// a keep with the tallest spire, a gate with the fire lit behind its portcullis. Frost-1
// is an outpost (a gatehouse and one tower), frost-2 a castle, frost-3 the great keep.
const KEEP = {
  1: {
    sil: (c) => { c.moveTo(-18, 2); c.lineTo(-18, -12); crenelPath(c, -18, -2, -12); c.lineTo(-11, -22); c.lineTo(-6, -34); c.lineTo(-1, -22); c.lineTo(-1, -12); crenelPath(c, -1, 18, -12); c.lineTo(18, 2); c.closePath(); },
    paint(ctx, T, o) {
      fill(ctx, T.dark, box(-18, -12, 36, 14 + o.depth));
      fill(ctx, T.lit, box(-18, -12, 9, 14 + o.depth));
      crenels(ctx, T, -18, -12, -12); crenels(ctx, T, -1, 18, -12);
      // The tower.
      fill(ctx, T.dark, box(-11, -22, 10, 24 + o.depth));
      fill(ctx, T.lit, box(-11, -22, 4.5, 24 + o.depth));
      cone(ctx, T, -11, -1, -22, -34);
      // Gate, lit behind the portcullis.
      fill(ctx, T.deep, (c) => { c.moveTo(4, 2); c.lineTo(4, -4); c.quadraticCurveTo(4, -7.5, 7.5, -7.5); c.quadraticCurveTo(11, -7.5, 11, -4); c.lineTo(11, 2); c.closePath(); });
      fill(ctx, T.warm, box(5, -3, 5, 5));
      line(ctx, T.deep, 0.5, (c) => { for (const gx of [6, 7.5, 9]) { c.moveTo(gx, -6.5); c.lineTo(gx, 2); } c.moveTo(4.5, -3); c.lineTo(10.5, -3); });
      windows(ctx, T, [[-7.4, -18, 2.2, 3.2, true], [13, -8.5, 2, 2.6, true], [-15, -8, 1.8, 2.4]], o);
      line(ctx, T.deep, 0.6, (c) => { c.moveTo(-4, -15); c.lineTo(-4, -12.5); });
    },
  },
  2: {
    sil: (c) => { c.moveTo(-22, 2); c.lineTo(-22, -24); c.lineTo(-18, -34); c.lineTo(-14, -24); c.lineTo(-14, -14); c.lineTo(-8, -14); c.lineTo(-8, -20); c.lineTo(-1, -27); c.lineTo(6, -20); c.lineTo(6, -28); c.lineTo(10.5, -41); c.lineTo(15, -28); c.lineTo(15, -12); crenelPath(c, 15, 23, -12); c.lineTo(23, 2); c.closePath(); },
    paint(ctx, T, o) {
      // Curtain wall first, the buildings in front of it.
      fill(ctx, T.dark, box(-22, -12, 45, 14 + o.depth));
      crenels(ctx, T, 15, 23, -12);
      // The hall: a pitched roof between the towers.
      fill(ctx, T.dark, box(-8, -20, 14, 22 + o.depth));
      fill(ctx, T.lit, box(-8, -20, 5, 22 + o.depth));
      fill(ctx, T.mid, poly([-9, -20, -1, -27, 7, -20]));
      fill(ctx, T.snow, poly([-9.5, -19.6, -1, -27.4, -1, -24.6, -7, -19.8]));
      // Left tower, round, conical roof.
      fill(ctx, T.dark, box(-22, -24, 8, 26 + o.depth));
      fill(ctx, T.lit, box(-22, -24, 4, 26 + o.depth));
      cone(ctx, T, -22, -14, -24, -34);
      // The tall tower right.
      fill(ctx, T.dark, box(6, -28, 9, 30 + o.depth));
      fill(ctx, T.lit, box(6, -28, 3.6, 30 + o.depth));
      cone(ctx, T, 6, 15, -28, -41);
      // Gate in the hall.
      fill(ctx, T.deep, (c) => { c.moveTo(-3.5, 2); c.lineTo(-3.5, -4); c.quadraticCurveTo(-3.5, -7.4, 0, -7.4); c.quadraticCurveTo(3.5, -7.4, 3.5, -4); c.lineTo(3.5, 2); c.closePath(); });
      fill(ctx, T.warm, box(-2.5, -3, 5, 5));
      line(ctx, T.deep, 0.5, (c) => { for (const gx of [-1.2, 0.2, 1.6]) { c.moveTo(gx, -6.5); c.lineTo(gx, 2); } });
      windows(ctx, T, [[-19.4, -19, 2, 3, true], [9.4, -23, 2.2, 3.2, true], [-6, -14.5, 1.8, 2.6]], o);
      line(ctx, T.deep, 0.6, (c) => { c.moveTo(12.4, -16); c.lineTo(12.4, -13); c.moveTo(-17, -10); c.lineTo(-17, -7.5); });
    },
  },
  3: {
    sil: (c) => { c.moveTo(-21, 2); c.lineTo(-21, -22); c.lineTo(-16, -31); c.lineTo(-11, -22); c.lineTo(-11, -14); c.lineTo(-7, -14); c.lineTo(-7, -30); c.lineTo(0, -46); c.lineTo(7, -30); c.lineTo(7, -14); c.lineTo(11, -14); c.lineTo(11, -22); c.lineTo(16, -31); c.lineTo(21, -22); c.lineTo(21, 2); c.closePath(); },
    paint(ctx, T, o) {
      fill(ctx, T.dark, box(-21, -12, 42, 14 + o.depth));
      fill(ctx, T.lit, box(-21, -12, 10, 14 + o.depth));
      crenels(ctx, T, -11, -7, -12); crenels(ctx, T, 7, 11, -12);
      // The flanking towers.
      for (const [x0, lit] of [[-21, true], [11, false]]) {
        fill(ctx, T.dark, box(x0, -22, 10, 24 + o.depth));
        fill(ctx, lit ? T.lit : T.mid, box(x0, -22, 4.2, 24 + o.depth));
        cone(ctx, T, x0, x0 + 10, -22, -31);
      }
      // The keep, and the tallest spire in the act.
      fill(ctx, T.dark, box(-7, -30, 14, 32 + o.depth));
      fill(ctx, T.lit, box(-7, -30, 5.5, 32 + o.depth));
      crenels(ctx, T, -7, 7, -30, { w: 2, gap: 1.4, h: 1.6 });
      cone(ctx, T, -5.5, 5.5, -31.6, -46);
      // The great gate, lit.
      fill(ctx, T.deep, (c) => { c.moveTo(-3.6, 2); c.lineTo(-3.6, -5); c.quadraticCurveTo(-3.6, -9, 0, -9); c.quadraticCurveTo(3.6, -9, 3.6, -5); c.lineTo(3.6, 2); c.closePath(); });
      fill(ctx, T.warm, box(-2.6, -4, 5.2, 6));
      line(ctx, T.deep, 0.5, (c) => { for (const gx of [-1.3, 0, 1.3]) { c.moveTo(gx, -8); c.lineTo(gx, 2); } c.moveTo(-3.2, -4); c.lineTo(3.2, -4); });
      windows(ctx, T, [[-1.2, -25, 2.4, 3.6, true], [-17.4, -17, 2, 3, true], [14.2, -11, 2, 2.8, true]], o);
      line(ctx, T.deep, 0.6, (c) => { c.moveTo(3.8, -20); c.lineTo(3.8, -17); c.moveTo(-3.6, -16); c.lineTo(-3.6, -13); });
    },
  },
};

// F-C and F-E: SHIPPED 25 Sep 2026 — see stylePacks/frostFortresses.js.

// ================================================================ F-D: THE SNOW KREMLIN
// A walled citadel of onion domes: swallowtail merlons, round towers with bulbous domes
// in the ice tone under caps of snow, a tall tent-roofed tower at the heart with a small
// dome of its own, arched windows lit.
function onion(ctx, T, cx, y, r) {
  // A bulb sitting on y, radius r, a spike on top.
  const top = y - r * 2.1;
  const bulb = (c) => { c.moveTo(cx - r * 0.35, y); c.quadraticCurveTo(cx - r * 1.35, y - r * 0.8, cx - r * 0.2, top + r * 0.35); c.lineTo(cx, top); c.lineTo(cx + r * 0.2, top + r * 0.35); c.quadraticCurveTo(cx + r * 1.35, y - r * 0.8, cx + r * 0.35, y); c.closePath(); };
  fill(ctx, T.dark, bulb);
  ctx.save(); ctx.beginPath(); bulb(ctx); ctx.clip();
  fill(ctx, T.lit, box(cx - r * 1.5, top - 1, r * 1.35, r * 3));
  fill(ctx, T.snow, (c) => { c.moveTo(cx - r * 1.4, y - r * 1.05); c.quadraticCurveTo(cx - r * 0.4, y - r * 1.6, cx + r * 0.3, y - r * 1.25); c.lineTo(cx + r * 0.3, top - 2); c.lineTo(cx - r * 1.4, top - 2); c.closePath(); });
  ctx.restore();
  line(ctx, T.dark, 0.5, (c) => { c.moveTo(cx, top); c.lineTo(cx, top - r * 0.9); });
  fill(ctx, T.dark, box(cx - r * 0.5, y - 0.2, r, 1));
}
function onionSil(c, cx, y, r) {
  const top = y - r * 2.1;
  c.moveTo(cx - r * 0.35, y); c.quadraticCurveTo(cx - r * 1.35, y - r * 0.8, cx - r * 0.2, top + r * 0.35); c.lineTo(cx, top - r * 0.9); c.lineTo(cx + r * 0.2, top + r * 0.35); c.quadraticCurveTo(cx + r * 1.35, y - r * 0.8, cx + r * 0.35, y); c.closePath();
}
function swallowtails(ctx, T, x0, x1, y) {
  for (let x = x0; x + 2.4 <= x1 + 0.01; x += 3.6) {
    fill(ctx, T.dark, poly([x, y, x, y - 2.6, x + 1.2, y - 1.8, x + 2.4, y - 2.6, x + 2.4, y]));
    fill(ctx, T.snow, poly([x - 0.1, y - 2.5, x + 1.2, y - 1.7, x + 2.5, y - 2.5, x + 2.4, y - 2, x + 1.2, y - 1.2, x, y - 2]));
  }
}
const KREMLIN_TOWERS = {
  1: [[-15, 7, -16, 3.2], [8, 7, -14, 3]],
  2: [[-21, 6, -16, 2.8], [-11, 7, -22, 3.4], [7, 7, -20, 3.2], [16, 6, -14, 2.6]],
  3: [[-19, 7, -18, 3], [12, 7, -18, 3]],
};
const KREMLIN = Object.fromEntries([1, 2, 3].map((st) => [st, {
  sil(c) {
    c.moveTo(-22, 2); c.lineTo(-22, -10); c.lineTo(22, -10); c.lineTo(22, 2); c.closePath();
    for (const [x, w, y, r] of KREMLIN_TOWERS[st]) { c.rect(x, y, w, 2 - y); onionSil(c, x + w / 2, y, r); }
    if (st === 3) { c.rect(-6, -26, 12, 28); c.moveTo(-6.5, -26); c.lineTo(0, -38); c.lineTo(6.5, -26); c.closePath(); onionSil(c, 0, -37.5, 2.4); }
    if (st === 1) { c.rect(-5, -20, 9, 22); onionSil(c, -0.5, -20, 3.8); }
  },
  paint(ctx, T, o) {
    const d = o.depth;
    const wx = st === 1 ? [-18, 18] : [-22, 22];
    fill(ctx, T.dark, box(wx[0], -10, wx[1] - wx[0], 12 + d));
    fill(ctx, T.lit, box(wx[0], -10, 8, 12 + d));
    swallowtails(ctx, T, wx[0] + 0.5, wx[1] - 0.5, -10);
    for (const [x, w, y, r] of KREMLIN_TOWERS[st]) {
      fill(ctx, T.dark, box(x, y, w, 2 - y + d));
      fill(ctx, T.lit, box(x, y, w * 0.42, 2 - y + d));
      fill(ctx, T.snow, box(x - 0.4, y - 0.4, w + 0.8, 0.9));
      onion(ctx, T, x + w / 2, y - 0.3, r);
    }
    if (st === 1) {
      fill(ctx, T.dark, box(-5, -20, 9, 22 + d));
      fill(ctx, T.lit, box(-5, -20, 3.8, 22 + d));
      onion(ctx, T, -0.5, -20.3, 3.8);
      windows(ctx, T, [[-1.7, -15, 2.4, 3.4, true], [-12.6, -9, 2, 3, true], [10.4, -7, 2, 2.8, true]], o);
    }
    if (st === 2) {
      windows(ctx, T, [[-8.6, -17, 2.2, 3.2, true], [9.4, -15, 2.2, 3, true], [-1.2, -7, 2.2, 3, true]], o);
    }
    if (st === 3) {
      // The tent-roofed tower at the heart, a small dome on top.
      fill(ctx, T.dark, box(-6, -26, 12, 28 + d));
      fill(ctx, T.lit, box(-6, -26, 4.6, 28 + d));
      fill(ctx, T.dark, poly([-6.6, -26, 0, -38, 6.6, -26]));
      fill(ctx, T.mid, poly([-6.6, -26, 0, -38, 0.2, -26]));
      fill(ctx, T.snow, poly([-6.4, -26.3, 0, -38, -0.3, -33, -4.2, -27.2]));
      line(ctx, T.snow, 0.5, (c) => { c.moveTo(-4, -29.5); c.lineTo(3.8, -29.5); c.moveTo(-2.4, -33); c.lineTo(2.2, -33); });
      onion(ctx, T, 0, -37.8, 2.4);
      fill(ctx, T.deep, (c) => { c.moveTo(-2.6, 2); c.lineTo(-2.6, -3.6); c.quadraticCurveTo(-2.6, -6.4, 0, -6.4); c.quadraticCurveTo(2.6, -6.4, 2.6, -3.6); c.lineTo(2.6, 2); c.closePath(); });
      fill(ctx, T.warm, box(-1.8, -2.6, 3.6, 4.6));
      windows(ctx, T, [[-1.2, -21, 2.4, 3.6, true], [-16.4, -12, 2, 3, true], [14.6, -12.6, 2, 3, true]], o);
    }
  },
}]));

// ================================================================ ROCKS
// R-B: a cluster of snow-capped boulders — faceted, lit to the sky, a crevice between,
// pillows of snow on top and a drift at the foot.
const BOULDERS = {
  sil: (c) => { tracePoly(c, [-13, 2, -13.4, -4, -10, -9.6, -3.6, -11.8, 2, -8.6, 4.4, -6.2, 8.4, -7.2, 12.2, -4, 13, 2]); c.closePath(); },
  paint(ctx, T) {
    // The small boulder behind, right.
    fill(ctx, T.deep, poly([2, 2, 3.2, -5.4, 8.4, -7.2, 12.2, -4, 13, 2]));
    fill(ctx, T.rock, poly([3.2, -5.4, 8.4, -7.2, 9.6, -3, 5, -1.4]));
    // The big one.
    fill(ctx, T.deep, poly([-13, 2, -13.4, -4, -10, -9.6, -3.6, -11.8, 2, -8.6, 4.4, -4, 4, 2]));
    fill(ctx, T.rockLit, poly([-13.4, -4, -10, -9.6, -3.6, -11.8, -4.6, -5.2, -9, -2]));
    fill(ctx, T.rock, poly([-4.6, -5.2, -3.6, -11.8, 2, -8.6, 4.4, -4, 0.6, -1]));
    line(ctx, T.deep, 0.5, (c) => { c.moveTo(-4.6, -5.2); c.lineTo(-6.4, 1.6); c.moveTo(0.6, -1); c.lineTo(2.6, 2); });
    // Snow pillows, with their shaded undersides.
    fill(ctx, T.snowShade, (c) => { c.moveTo(-11.4, -7.6); c.quadraticCurveTo(-7, -14.4, -1.6, -10.6); c.quadraticCurveTo(1.6, -9.4, 2.4, -8); c.lineTo(-11, -6.4); c.closePath(); });
    fill(ctx, T.snow, (c) => { c.moveTo(-11.6, -8.4); c.quadraticCurveTo(-7, -14.8, -1.8, -11.4); c.quadraticCurveTo(1.4, -10.2, 2.4, -8.6); c.quadraticCurveTo(-3, -9.6, -6, -8.6); c.quadraticCurveTo(-9, -7.8, -11.6, -8.4); c.closePath(); });
    fill(ctx, T.snow, (c) => { c.moveTo(4, -6.2); c.quadraticCurveTo(7.4, -9.4, 11.4, -5.4); c.quadraticCurveTo(8, -6.4, 4, -6.2); c.closePath(); });
    // The drift at the foot.
    fill(ctx, T.snow, (c) => { c.moveTo(-14, 2.4); c.quadraticCurveTo(-9, -1.6, -3, 0.8); c.quadraticCurveTo(3, -0.8, 8, 1); c.quadraticCurveTo(11, -0.2, 14, 2.4); c.closePath(); });
  },
};
// R-C: ice shards — angular crystals jutting from the snow at angles, each with a lit face
// and a dark one, a glint travelling up the tallest.
const SHARDS = [[-10, 2, -12, -9, 4.2], [-4.5, 2, -3, -14.6, 4.8], [2, 2, 5.4, -11, 4.4], [7.6, 2, 11.8, -6, 3.6]];
const ICE_SHARDS = {
  sil: (c) => { for (const [bx, by, tx, ty, w] of SHARDS) { tracePoly(c, [bx - w / 2, by, tx, ty, bx + w / 2, by]); c.closePath(); } },
  paint(ctx, T, o) {
    for (const [bx, by, tx, ty, w] of SHARDS) {
      fill(ctx, T.dark, poly([bx - w / 2, by, tx, ty, bx + w / 2, by]));
      fill(ctx, T.lit, poly([bx - w / 2, by, tx, ty, bx, by]));
      line(ctx, T.snow, 0.45, (c) => { c.moveTo(bx - w / 2 + 0.4, by); c.lineTo(tx, ty); });
    }
    // A glint riding up the tallest shard's lit edge.
    const u = ((Number(o.t) || 0) * 0.35) % 1.6;
    if (u < 1) {
      const [bx, by, tx, ty, w] = SHARDS[1];
      const gx = bx - w / 2 + (tx - (bx - w / 2)) * u, gy = by + (ty - by) * u;
      fill(ctx, T.snow, poly([gx, gy - 1.4, gx + 0.5, gy, gx, gy + 1.4, gx - 0.5, gy]));
    }
    fill(ctx, T.snow, (c) => { c.moveTo(-14, 2.4); c.quadraticCurveTo(-8, -1.4, -2, 0.6); c.quadraticCurveTo(5, -1.2, 10, 0.8); c.quadraticCurveTo(12.4, 0.2, 14, 2.4); c.closePath(); });
  },
};
// R-D: a layered ledge — two strata of rock under a thick slab of snow, an overhang on the
// right with icicles hanging off it, snow on the step and a drift at the foot.
const LEDGE = {
  sil: (c) => { tracePoly(c, [-13, 2, -12.6, -5, -9, -8.4, -1, -10, 8, -9.4, 13.4, -7.8, 13, -5.6, 10.4, -4.6, 11, 2]); c.closePath(); },
  paint(ctx, T) {
    fill(ctx, T.deep, poly([-13, 2, -12.6, -5, -9, -8.4, -1, -10, 8, -9.4, 13.4, -7.8, 13, -5.6, 10.4, -4.6, 11, 2]));
    fill(ctx, T.rock, poly([-12.6, -5, -9, -8.4, -1, -10, 8, -9.4, 13.4, -7.8, 13, -5.6, 2, -5.2, -8, -4.2]));
    fill(ctx, T.rockLit, poly([-12.6, -5, -9, -8.4, -6, -8.8, -8.4, -4.4]));
    fill(ctx, T.rock, poly([-12.8, -1.6, -3, -2.4, 10.6, -1.8, 10.8, -0.6, -12.8, 0]));
    line(ctx, T.deep, 0.45, (c) => { c.moveTo(-12.4, -3); c.lineTo(10.4, -3.6); });
    // The snow slab on top, thick at the lip.
    fill(ctx, T.snowShade, (c) => { c.moveTo(-10, -8.2); c.quadraticCurveTo(0, -11.8, 13.8, -8); c.lineTo(13.4, -6.8); c.quadraticCurveTo(2, -8.6, -10, -7.4); c.closePath(); });
    fill(ctx, T.snow, (c) => { c.moveTo(-10.2, -8.6); c.quadraticCurveTo(0, -12.6, 14, -8.6); c.quadraticCurveTo(12, -8, 8, -8.2); c.quadraticCurveTo(0, -9.2, -10.2, -8.6); c.closePath(); });
    // Icicles off the overhang.
    for (const [ix, il] of [[10.6, 2.6], [11.8, 1.6], [12.8, 2.2]]) fill(ctx, T.snow, poly([ix - 0.45, -5.5, ix + 0.45, -5.5, ix, -5.5 + il]));
    fill(ctx, T.snow, (c) => { c.moveTo(-14, 2.4); c.quadraticCurveTo(-8, -0.8, -2, 1); c.quadraticCurveTo(6, -0.4, 12, 2.4); c.closePath(); });
  },
};

// ================================================================ the table
const byStage = (table) => ({
  silhouette: (c, feature, st) => table[st].sil(c),
  paint: (ctx, P, st, o) => table[st].paint(ctx, tones(P), o),
});
const same = (shape) => ({
  silhouette: (c) => shape.sil(c),
  paint: (ctx, P, st, o) => shape.paint(ctx, tones(P), o),
});
export const FROST_FORTRESS_CANDIDATES = [
  { letter: 'A', id: 'now', name: 'THE FORTRESSES AS THEY WERE (frost-2\'s stays, alternating)', shape: null,
    note: 'What the far ridge carries today: a crown (frost-1), a jagged ruin (frost-2), a lone tower with a lit mark (frost-3).' },
  { letter: 'B', id: 'keep', name: 'ICE KEEP — a proper castle', shape: byStage(KEEP),
    note: 'Curtain walls with snow on every merlon, round towers under conical spires, a keep with the tallest spire, '
      + 'a gate with the fire lit behind its portcullis, three windows blinking. frost-1 an outpost (gatehouse and one '
      + 'tower), frost-2 a castle, frost-3 the great keep.' },
  { letter: 'C', id: 'citadel', name: 'CRYSTAL CITADEL — grown, not built (SHIPS, now and then)', shape: FROST_FORTRESS_SHAPES.citadel,
    note: 'Clusters of great hexagonal ice crystals, each with a lit facet, a mid facet and one in shade, snow on their '
      + 'points, a warm light caught inside the biggest. More, and taller, stage by stage.' },
  { letter: 'D', id: 'kremlin', name: 'SNOW KREMLIN — onion domes', shape: byStage(KREMLIN),
    note: 'A walled citadel of onion domes under caps of snow: swallowtail merlons, round towers with bulbous domes, '
      + 'arched windows lit; frost-3 has a tall tent-roofed tower at the heart with a small dome of its own.' },
];
FROST_FORTRESS_CANDIDATES.push({
  letter: 'E', id: 'redrawn', name: 'THE SAME ONES, REDRAWN (SHIPS)', shape: FROST_FORTRESS_SHAPES.redrawn,
  note: '"Could we improve the design of the current fortresses?" A\'s three buildings on their exact silhouettes, brought '
    + 'up to the new art: lit faces and stone courses, snow on the ledges instead of filling the crown, icicles, arched '
    + 'windows with snow sills, buttresses. frost-1\'s crown keeps a lit gate and a banner on its point; frost-2\'s ruin '
    + 'gets snow on every broken top, a frozen waterfall through the break and rubble at the foot; frost-3\'s tower '
    + 'loses its chevron for a lit slit high on the spire, with a banner down the front.',
});
export const FROST_ROCK_CANDIDATES = [
  { letter: 'A', id: 'now', name: 'THE ROCK NOW', shape: null,
    note: 'What the near ridge carries today: a two-tone ice rock with a snow cap.' },
  { letter: 'B', id: 'boulders', name: 'SNOW-CAPPED BOULDERS', shape: same(BOULDERS),
    note: 'A cluster of faceted boulders, lit to the sky, a crevice between, pillows of snow with shaded undersides on '
      + 'top and a drift at the foot.' },
  { letter: 'C', id: 'shards', name: 'ICE SHARDS', shape: same(ICE_SHARDS),
    note: 'Angular ice crystals jutting from the snow at angles, a lit face and a dark one each, a pale edge, and a glint '
      + 'riding up the tallest now and then.' },
  { letter: 'D', id: 'ledge', name: 'LEDGE WITH ICICLES', shape: same(LEDGE),
    note: 'Two strata of rock under a thick slab of snow, an overhang on the right with icicles hanging off it, a drift '
      + 'at the foot.' },
];

// ================================================================ the scene
// The real frost backdrop at a camera where the far ridge carries a fortress and the near
// ridge a rock, with the candidate swapped in for its kind and the shipped snow finish
// (E) on everything else. `crop` zooms onto that feature. A no-op landmark study keeps
// the near ridge's wildlife out of the picture.

const CAM = 8600;
const TD = 10000;
const found = new Map();
function heroPose(t) {
  return { kind: 'run', phase: (t * 1.6) % 1, time: t, vy: 0, grounded: true, squash: 0, lean: 0,
    roll: false, float: false, stomp: false, headless: false, facing: 1 };
}
function studyFor(kind, cand) {
  // A (no shape) names the kind with null: the painter as it was, not today's plan.
  return { ...FROST_COMBINED_SCENERY_FINISH, shapes: { [kind]: cand?.shape || null } };
}
export function drawFrostRockFortressScene(ctx, t, { stage = 1, kind = 'landmark', cand = null, crop = 0, hero = true, weather = true } = {}) {
  const frost = CABINETS.find((c) => c.id === 'frost');
  const pack = getStylePack(frost.style, {});
  const key = `${stage}:${kind}`;
  const draw = (g, tt, withHero, withWeather) => {
    const bc = {
      stageIndex: stage, progress: 0.35, blizzard: 0.25, frostSceneryStudy: studyFor(kind, cand),
      frostLandmarkStudy: (c, fr) => {
        if (fr.when !== 'on' || found.has(key)) return;
        if ((kind === 'landmark') !== (fr.depth === 'far')) return;
        const p = fr.scenery().filter((q) => q.kind === kind)
          .sort((a, b) => Math.abs(a.x - 240) - Math.abs(b.x - 240))[0];
        if (p) found.set(key, { x: p.x, y: p.baseY });
      },
    };
    pack.bg(g, tt, CAM, frost, TD, bc, 0, bc);
    g.save();
    applyWorld(g, ZOOM, 0, GROUND_Y);
    pack.ground(g, CAM, frost, [], [], tt * 60, VIEW_W);
    if (withHero) drawToon(g, 'lorenzo', heroPose(tt), PLAYER_X, GROUND_Y, HERO_DRAW_H);
    g.restore();
    if (pack.post) pack.post(g, tt);
    if (withWeather && pack.weather) pack.weather(g, tt);
  };
  if (!crop) { draw(ctx, t, hero, weather); return; }
  if (!found.has(key)) {
    const s = document.createElement('canvas'); s.width = 480; s.height = 270;
    draw(s.getContext('2d'), 0, false, false);
  }
  const f = found.get(key) || { x: 240, y: 150 };
  const up = kind === 'landmark' ? 20 : 6;
  ctx.save();
  ctx.scale(crop, crop);
  ctx.translate(-(f.x - 240 / crop), -(f.y - up - 135 / crop));
  draw(ctx, t, false, false);
  ctx.restore();
}
