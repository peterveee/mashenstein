// FROST FORTRESS's fortresses (Peter, 25 Sep 2026, from the rocks-and-fortresses bake-off,
// src/dev/frost-rock-fortress-candidates.js: "Ok, use Option E, but also add in an
// occaitional Crystal Citadel here and there (far away from the other ones) dont do the
// chevon in Frost 3... also keep Fortress A - FROST 2, that one isn't so bad... remember
// variety and far apart").
//
// The far ridge carries a fortress on every other tile (the glacier on the rest), so a
// fortress site is `tile >> 1` and every one is ~14 screens from the next. Which building
// stands there is FROST_FORTRESS_PLAN below. Each is a shape — paint + silhouette — that
// drawFrostSceneryFeature (stylePacks/index.js) takes in place of the shipped
// frostLandmarkShape, so placement, clip, skirt, paper shadow, grain and haze are all the
// pack's own; the painters use only the hazed palette's keys, which is what lets the
// paper passes flatten them to a silhouette.
//
// Nothing here imports stylePacks/index.js: that module imports this one.
import { FROST_PAPER } from './frostWildlife.js';

const { mix } = FROST_PAPER;

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

// ================================================================ F-C: THE CRYSTAL CITADEL
// The fortress grown rather than built: clusters of great hexagonal ice crystals, each
// with a lit facet, a mid facet and one in shade, and a warm light caught inside a few
// of them. More crystals, and taller, stage by stage.
// GROWING OUT OF THE GROUND (Peter, 25 Sep 2026: "can we extend these so they look like
// crystals growing directly out of the ground (no dark grey section) also the sides are
// jagged, why?"). The dark section was the pack's skirt — stepped copies of the outline
// swept down to the snow — showing under crystals that stopped at their base line, and
// its steps on the crystals' leaning sides were the jagged edges. So a crystal carries
// on down `d` (the feature's own foot depth) on its own lean, every facet with it, and
// this shape draws its own foot (`ownFoot`) instead of taking the skirt.
function crystal(ctx, T, x, w, h, tip, lean = 0, d = 0) {
  // A prism rising from y = 2 + d (below the snow), body to y = 2 - h, point `tip` above
  // that; `lean` tilts it, and the foot carries on down that same line.
  const top = 2 - h, apex = top - tip, cx = x + w / 2 + lean;
  const k = -lean * d / Math.max(1, h);
  const by = 2 + d;
  fill(ctx, T.dark, poly([x + k, by, x + lean, top, cx, apex, x + w + lean, top, x + w + k, by]));
  fill(ctx, T.lit, poly([x + k, by, x + lean, top, cx, apex, cx - w * 0.12, top + 1, x + w * 0.4 + k, by]));
  fill(ctx, T.snow, poly([x + lean, top, cx, apex, cx - w * 0.12, top + 1.2]));
  fill(ctx, T.mid, poly([x + w * 0.4 + k, by, cx - w * 0.12, top + 1, cx, apex, x + w * 0.72 + lean, top + 0.6, x + w * 0.72 + k, by]));
  line(ctx, mix(T.snow, T.lit, 0.3), 0.35, (c) => { c.moveTo(cx, apex); c.lineTo(cx - w * 0.12, top + 1); c.lineTo(x + w * 0.4 + k, by); });
}
function crystalSil(c, list, d = 0) {
  // Each crystal's outline in turn, foot and all (the paper shadow and grain need coverage).
  for (const [x, w, h, tip, lean = 0] of list) {
    const top = 2 - h, k = -lean * d / Math.max(1, h);
    tracePoly(c, [x + k, 2 + d, x + lean, top, x + w / 2 + lean, top - tip, x + w + lean, top, x + w + k, 2 + d]);
    c.closePath();
  }
}
// [x, width, height above the base line, point, lean]. Tall and thin: crystals, not towers
// (their heights carried the foot depth by mistake once, and that stature is the look).
const CITADEL_SETS = {
  1: [[-16, 7, 18, 5, -0.8], [-9, 9, 29, 7, 0], [1, 8, 22, 6, 0.8], [9, 6, 13, 4, 1]],
  2: [[-22, 7, 16, 5, -1], [-15, 8, 26, 7, -0.4], [-7, 10, 36, 9, 0], [3, 8, 28, 7, 0.5], [11, 7, 18, 6, 0.9], [17, 6, 11, 4, 1.2]],
  3: [[-19, 7, 17, 5, -1], [-12, 8, 28, 8, -0.5], [-5, 10, 38, 10, 0], [5, 8, 30, 8, 0.6], [13, 7, 18, 5, 1.1]],
};
const CITADEL = Object.fromEntries([1, 2, 3].map((st) => [st, {
  sil: (c, d) => crystalSil(c, CITADEL_SETS[st], d),
  paint(ctx, T, o) {
    const set = CITADEL_SETS[st];
    // Back crystals first (the outer ones), then inward, the tallest last.
    const order = [...set].sort((a, b) => a[2] - b[2]);
    for (const [x, w, h, tip, lean] of order) crystal(ctx, T, x, w, h, tip, lean, o.depth);
    // Light caught inside: tall slits in the biggest crystals, blinking like windows.
    const big = [...set].sort((a, b) => b[2] - a[2]).slice(0, 3);
    windows(ctx, T, big.map(([x, w, h], i) => [x + w * (0.45 + (i % 2) * 0.15), 2 - h * (0.5 + i * 0.1), 1.4, 3.4 + (2 - i) * 0.6]), o);
  },
}]));

// ================================================================ F-E: THE SAME ONES, REDRAWN
// Peter, 25 Sep 2026: "could we improve the design of the current fortresses?" Today's three
// buildings — frost-1's crown keep, frost-2's broken ruin, frost-3's lone tower — on their
// exact silhouettes (stylePacks/index.js frostLandmarkPath), brought up to the new art: lit
// faces and stone courses, snow on the ledges rather than filling the crown, icicles,
// arched windows with snow sills, and something that says who lives there.
const NOW_SIL = {
  1: [-18, 2, -16, -17, -11, -17, -11, -26, -5, -22, 0, -29, 6, -22, 11, -26, 11, -17, 16, -17, 18, 2],
  2: [-22, 2, -20, -11, -13, -16, -8, -10, -5, -25, 1, -31, 7, -22, 9, -13, 16, -18, 22, -10, 23, 2],
  3: [-13, 2, -11, -24, -5, -28, -4, -37, 0, -41, 4, -37, 5, -28, 11, -24, 13, 2],
};
// A silhouette with its foot carried straight down `d` from its two ends.
function withFoot(p, d = 0) {
  const n = p.length;
  return [...p, p[n - 2], p[n - 1] + d, p[0], p[1] + d];
}
function icicles(ctx, T, list) {
  for (const [x, y, l] of list) fill(ctx, T.snow, poly([x - 0.45, y, x + 0.45, y, x, y + l]));
}
function courses(ctx, T, ys, x0, x1) {
  line(ctx, mix(T.dark, T.deep, 0.6), 0.35, (c) => { for (const y of ys) { c.moveTo(x0, y); c.lineTo(x1, y); } });
}
function sill(ctx, T, x, y, w) { fill(ctx, T.snow, box(x - 0.4, y, w + 0.8, 0.7)); }
function banner(ctx, T, x, y, w, h, t) {
  const sway = Math.sin((Number(t) || 0) * 2.2) * 0.4;
  fill(ctx, mix(T.warm, T.deep, 0.5), (c) => { c.moveTo(x, y); c.lineTo(x + w, y); c.lineTo(x + w + sway, y + h); c.lineTo(x + w / 2 + sway, y + h - w * 0.5); c.lineTo(x + sway, y + h); c.closePath(); });
  fill(ctx, mix(T.warm, T.snow, 0.35), poly([x + w / 2, y + 1.6, x + w / 2 + 1, y + 3.2, x + w / 2, y + 4.8, x + w / 2 - 1, y + 3.2]));
}
const REDRAWN = {
  1: {
    sil: (c, d) => { tracePoly(c, withFoot(NOW_SIL[1], d)); c.closePath(); },
    paint(ctx, T, o) {
      const d = o.depth;
      fill(ctx, T.dark, poly([...NOW_SIL[1].slice(0, -2), 18, 2 + d, -18, 2 + d]));
      ctx.save(); ctx.beginPath(); tracePoly(ctx, [...NOW_SIL[1].slice(0, -2), 18, 2 + d, -18, 2 + d]); ctx.closePath(); ctx.clip();
      // The lit west wall and tower, the mid face of the crown's middle.
      fill(ctx, T.lit, poly([-18, 2 + d, -16, -17, -11, -17, -11, -26, -8.2, -24, -8.2, 2 + d]));
      fill(ctx, T.mid, poly([-5, -22, 0, -29, 0.4, -29, 0.4, 2 + d, -5, 2 + d]));
      courses(ctx, T, [-3, -8, -13], -18, 18);
      courses(ctx, T, [-20, -24], -11, 11);
      ctx.restore();
      // Snow lying on the ledges and in the crown's two dips, shade under it.
      for (const [x0, y0, x1, y1] of [[-16.6, -17, -10.6, -17], [10.6, -17, 16.6, -17]]) {
        fill(ctx, T.snowShade, box(x0, y0 - 0.2, x1 - x0, 0.9));
        fill(ctx, T.snow, (c) => { c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2, y0 - 1.8, x1, y1); c.closePath(); });
      }
      fill(ctx, T.snow, poly([-8.6, -24.2, -5, -22, -1.2, -27.2, -2.2, -25.2, -5, -23.2, -8.2, -23.3]));
      fill(ctx, T.snow, poly([8.6, -24.2, 6, -22, 1.2, -27.2, 2.2, -25.2, 6, -23.2, 8.2, -23.3]));
      for (const [x, y] of [[-11, -26], [0, -29], [11, -26]]) fill(ctx, T.snow, poly([x - 1.6, y + 1.6, x, y - 0.4, x + 1.6, y + 1.6, x, y + 0.9]));
      icicles(ctx, T, [[-15.4, -16.4, 1.8], [-13.6, -16.4, 1.1], [-12, -16.4, 2.2], [12.2, -16.4, 1.6], [14, -16.4, 2.2], [15.6, -16.4, 1.2]]);
      // Buttresses at the corners.
      fill(ctx, T.mid, poly([-18.6, 2, -17.4, -6, -15.2, -6, -14.6, 2]));
      fill(ctx, T.deep, poly([18.6, 2, 17.4, -6, 15.2, -6, 14.6, 2]));
      fill(ctx, T.snow, box(-17.6, -6.5, 2.6, 0.7)); fill(ctx, T.snow, box(15, -6.5, 2.6, 0.7));
      // The gate, lit.
      fill(ctx, T.deep, (c) => { c.moveTo(-2.4, 2); c.lineTo(-2.4, -3); c.quadraticCurveTo(-2.4, -5.8, 0, -5.8); c.quadraticCurveTo(2.4, -5.8, 2.4, -3); c.lineTo(2.4, 2); c.closePath(); });
      fill(ctx, T.warm, box(-1.6, -2.4, 3.2, 4.4));
      // Arched windows with snow sills, and the banner on the crown.
      windows(ctx, T, [[-12, -12.5, 2.4, 3.4, true], [7.8, -12.5, 2.4, 3.4, true], [-1.2, -18.6, 2.4, 3.2, true]], o);
      sill(ctx, T, -12, -9.1, 2.4); sill(ctx, T, 7.8, -9.1, 2.4); sill(ctx, T, -1.2, -15.4, 2.4);
      line(ctx, T.deep, 0.5, (c) => { c.moveTo(0, -29); c.lineTo(0, -36); });
      const fl = (Number(o.t) || 0) * 6;
      fill(ctx, mix(T.warm, T.deep, 0.5), (c) => { c.moveTo(0.2, -36); for (let k = 1; k <= 4; k++) c.lineTo(0.2 + k * 1.6, -36 + k * 0.3 + Math.sin(fl - k) * 0.4 * (k / 4)); for (let k = 4; k >= 1; k--) c.lineTo(0.2 + k * 1.6, -33.8 + k * 0.05 + Math.sin(fl - k) * 0.4 * (k / 4)); c.lineTo(0.2, -33.6); c.closePath(); });
    },
  },
  2: {
    sil: (c, d) => { tracePoly(c, withFoot(NOW_SIL[2], d)); c.closePath(); },
    paint(ctx, T, o) {
      const d = o.depth;
      const body = [...NOW_SIL[2].slice(0, -2), 23, 2 + d, -22, 2 + d];
      fill(ctx, T.dark, poly(body));
      ctx.save(); ctx.beginPath(); tracePoly(ctx, body); ctx.closePath(); ctx.clip();
      fill(ctx, T.lit, poly([-20, -11, -13, -16, -10.5, -13, -12, 2 + d, -22, 2 + d]));
      fill(ctx, T.mid, poly([-5, -25, 1, -31, 1.4, -30, 0.4, 2 + d, -6, 2 + d, -6.6, -12]));
      fill(ctx, T.mid, poly([9, -13, 16, -18, 16.4, -17, 15.6, 2 + d, 10, 2 + d]));
      courses(ctx, T, [-2.5, -7.5], -22, 23);
      courses(ctx, T, [-14, -19.5], -6, 7);
      // Dark broken window openings, one still lit.
      for (const [x, y, w, h] of [[-3.4, -20, 2.2, 3.6], [-17, -7.5, 2.2, 3], [17.4, -8, 2, 2.8]]) {
        fill(ctx, T.deep, (c) => { c.moveTo(x, y + h); c.lineTo(x, y + w / 2); c.quadraticCurveTo(x, y, x + w / 2, y); c.quadraticCurveTo(x + w, y, x + w, y + w / 2); c.lineTo(x + w, y + h); c.closePath(); });
      }
      ctx.restore();
      windows(ctx, T, [[2.2, -14, 2.2, 3.2, true], [-12.6, -3.6, 2, 2.8, true], [12.4, -4.6, 2, 2.6, true]], o);
      // Snow on every broken top, following the jagged edges.
      fill(ctx, T.snow, poly([-20.4, -10.6, -13, -16.4, -8.6, -10.4, -10.4, -10.8, -13, -14.4, -18.4, -10.2]));
      fill(ctx, T.snow, poly([-5.4, -24.6, 1, -31.4, 7.3, -22.2, 5.4, -22.4, 1, -28.4, -2.4, -24, -4.4, -23.2]));
      fill(ctx, T.snow, poly([9.2, -12.8, 16, -18.4, 22.4, -9.8, 20.6, -10.2, 16, -16.2, 11, -12.2]));
      // The frozen waterfall spilling through the break between the towers.
      fill(ctx, T.lit, poly([7.8, -13, 9.8, -13.4, 11, -6, 10.6, 2, 7.6, 2, 8.2, -6]));
      line(ctx, T.snow, 0.4, (c) => { c.moveTo(8.6, -12.6); c.lineTo(9, 1.4); c.moveTo(9.9, -12.8); c.lineTo(10.2, -2); });
      icicles(ctx, T, [[-16, -13.2, 1.6], [-14.6, -14.2, 2.2], [3.6, -26.4, 1.8], [18, -15.4, 1.6], [19.6, -13.6, 2]]);
      // Rubble at the foot, snow on it.
      for (const [x, w, h] of [[-23.6, 3.4, 2.4], [-20.6, 2.4, 1.6], [20.4, 3, 2], [22.6, 2.4, 1.4]]) {
        fill(ctx, T.mid, box(x, 2 - h, w, h + d));
        fill(ctx, T.snow, box(x - 0.2, 1.6 - h, w + 0.4, 0.7));
      }
    },
  },
  3: {
    sil: (c, d) => { tracePoly(c, withFoot(NOW_SIL[3], d)); c.closePath(); },
    paint(ctx, T, o) {
      const d = o.depth;
      const body = [...NOW_SIL[3].slice(0, -2), 13, 2 + d, -13, 2 + d];
      fill(ctx, T.dark, poly(body));
      ctx.save(); ctx.beginPath(); tracePoly(ctx, body); ctx.closePath(); ctx.clip();
      fill(ctx, T.lit, poly([-10, -23, -4, -27, -4, 2 + d, -10, 2 + d]));
      fill(ctx, T.lit, poly([-4, -37, 0, -41, -0.6, -28, -4, -28]));
      fill(ctx, T.mid, poly([5, -28, 11, -24, 13, 2 + d, 8.4, 2 + d, 8.4, -24.6]));
      courses(ctx, T, [-4, -10, -16, -22], -13, 13);
      courses(ctx, T, [-32], -5, 5);
      ctx.restore();
      // Snow on the shoulders and the spire.
      fill(ctx, T.snow, poly([-11.3, -23.4, -5, -28.4, -4.6, -27, -10.6, -22.6]));
      fill(ctx, T.snowShade, poly([5, -28.4, 11.3, -23.4, 10.6, -22.6, 4.6, -27]));
      fill(ctx, T.snow, poly([-4.2, -36.6, 0, -41.4, 4.2, -36.6, 2.6, -36.4, 0, -39, -2.8, -35.8]));
      icicles(ctx, T, [[-9.8, -22.6, 1.8], [-8.2, -23.8, 1.2], [7.4, -24.6, 1.6], [9.4, -23.2, 2]]);
      // No chevron (Peter, 25 Sep 2026: "dont do the chevon in Frost 3"): a lit slit where it
      // was, high on the spire.
      windows(ctx, T, [[-0.8, -35.2, 1.6, 2.8, true]], { t: o.t, seed: (Number(o.seed) || 0) + 5 });
      // A banner hanging down the front.
      banner(ctx, T, -1.8, -26.6, 3.6, 8.6, o.t);
      windows(ctx, T, [[-6.6, -13.6, 2.2, 3.2, true], [3.8, -8.2, 2.2, 3.2, true], [-1.2, -5.4, 2.4, 3.4, true]], o);
      sill(ctx, T, -6.6, -10.4, 2.2); sill(ctx, T, 3.8, -5, 2.2);
      // Buttresses at the foot.
      fill(ctx, T.mid, poly([-13.6, 2, -12.6, -7, -10.6, -7, -10.2, 2]));
      fill(ctx, T.deep, poly([13.6, 2, 12.6, -7, 10.6, -7, 10.2, 2]));
      fill(ctx, T.snow, box(-12.8, -7.5, 2.4, 0.7)); fill(ctx, T.snow, box(10.4, -7.5, 2.4, 0.7));
    },
  },
};

// ================================================================ which, where
const byStage = (table) => ({
  // Draws its own foot to the snow (index.js skips the stepped skirt for it).
  ownFoot: true,
  silhouette: (c, feature, st, depth) => table[st].sil(c, depth || 0),
  paint: (ctx, P, st, o) => table[st].paint(ctx, tones(P), o),
});
export const FROST_FORTRESS_SHAPES = Object.freeze({ redrawn: byStage(REDRAWN), citadel: byStage(CITADEL) });
// A citadel every fifth site, offset per stage so each stage meets one at a different
// point (frost-1 at site 3, frost-2 at 2, frost-3 at 1) and never two near each other;
// frost-2's other sites alternate the redrawn ruin with the one it has always had (A).
const CITADEL_EVERY = 5;
const CITADEL_OFFSET = { 1: 2, 2: 3, 3: 4 };
export function frostFortressVariant(stageIndex, tile) {
  const n = Math.floor((Number(tile) || 0) / 2);
  if (n >= 1 && (n + (CITADEL_OFFSET[stageIndex] ?? 0)) % CITADEL_EVERY === 0) return 'citadel';
  if (stageIndex === 2 && Math.abs(n) % 2 === 1) return 'now';
  return 'redrawn';
}
/** The shape for the fortress on `tile`, or null for the shipped painter (A). */
export function frostFortressShape(stageIndex, tile) {
  const v = frostFortressVariant(stageIndex, tile);
  return v === 'now' ? null : FROST_FORTRESS_SHAPES[v];
}
