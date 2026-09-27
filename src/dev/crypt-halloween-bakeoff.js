// CRYPT SHIFT — Halloween props (review-only bake-off, 26 Sep 2026).
// Background candidates use the Crypt backdrop's gouache mass painter and its depth-layer
// study seam. Lane candidates use the clean, outlined game art style at actual lane scale.
// Nothing in this file changes obstacle definitions, hitboxes, or spawn tables.
import { GROUND_Y, VIEW_W, ZOOM, applyWorld } from '../engine/camera.js';
import { getStylePack } from '../engine/stylePacks/index.js';
import { GOUACHE_KIT as K } from '../engine/stylePacks/cryptGouache.js';
import { CABINETS } from '../data/cabinets.js';
import { drawToon } from '../sprites/toons.js';
import { HERO_DRAW_H } from '../game/draw.js';
import { PLAYER_X } from '../game/player.js';
import { drawCryptIdeaScene, drawCryptIdeaCloseUp } from './crypt-ideas/scene.js';

const { massSprite, limb, dab, fillPoly, css } = K;
const TAU = Math.PI * 2;
const INK = '#242333';
const CREAM = '#f0e5c9';
const wrap = (x, n) => ((x % n) + n) % n;

function bakeScale(ctx) {
  const m = typeof ctx.getTransform === 'function' ? ctx.getTransform() : null;
  const s = m && Number.isFinite(m.a) ? Math.hypot(m.a, m.b) : 1;
  return Math.min(3, Math.max(1, Math.ceil(s * 2 - 0.01) / 2));
}
const CACHE = new Map();
function memo(key, build) {
  if (!CACHE.has(key)) CACHE.set(key, build());
  return CACHE.get(key);
}
function put(ctx, spr, x, y, scale = 1) {
  ctx.drawImage(spr.c, x + spr.x * scale, y + spr.y * scale, spr.w * scale, spr.h * scale);
}
function oval(g, x, y, rx, ry, rot = 0) {
  g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); g.fill();
}
function path(g, pts) {
  g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath();
}
function footAt(f, x, halfW) {
  let y = -Infinity;
  for (let d = -halfW; d <= halfW; d += 1.5) y = Math.max(y, f.ridgeY(x + d));
  return y + 1.5;
}

// ---------------------------------------------------------------- background gouache
// Each main form is a massSprite: the same broken moonlit rim and soft, dabbed paint used
// by the backdrop. The few marks on top are small painted masses inside those silhouettes,
// never ink outlines.
const PUMPKIN_STYLE = { body: [158, 72, 48], dark: [91, 38, 45], lit: [217, 132, 75], rim: 0.25, rimA: 0.5, dabs: 1.15, dab: 1.05, dabAng: -0.5, seed: 71, g0: 0.1 };
const BURLAP = { body: [123, 82, 70], dark: [66, 52, 69], lit: [173, 119, 80], rim: 0.26, rimA: 0.55, dabs: 0.9, dab: 1.1, dabAng: -0.7, seed: 93, g0: 0.1 };
const HAT = { body: [38, 34, 62], dark: [23, 22, 46], lit: [91, 91, 131], rim: 0.25, rimA: 0.55, dabs: 0.65, dab: 1, dabAng: 0, seed: 94, g0: 0.08 };
const CAULDRON = { body: [39, 37, 62], dark: [20, 20, 39], lit: [95, 95, 133], rim: 0.25, rimA: 0.58, dabs: 0.9, dab: 1.15, dabAng: 0.1, seed: 115, g0: 0.08 };
const BONE = { body: [159, 160, 143], dark: [82, 91, 118], lit: [212, 206, 173], rim: 0.34, rimA: 0.65, dabs: 0.8, dab: 0.9, dabAng: -0.45, seed: 139, g0: 0.12 };
const STONE_PAINT = { body: [72, 78, 109], dark: [38, 42, 74], lit: [130, 137, 163], rim: 0.3, rimA: 0.52, dabs: 0.95, dab: 1.15, dabAng: -0.55, seed: 241, g0: 0.08 };
const IRON_PAINT = { body: [39, 42, 70], dark: [19, 21, 42], lit: [96, 111, 150], rim: 0.36, rimA: 0.6, dabs: 0.75, dab: 0.9, dabAng: -0.3, seed: 251, g0: 0.08 };
const WOOD_PAINT = { body: [83, 62, 62], dark: [40, 37, 54], lit: [139, 101, 80], rim: 0.26, rimA: 0.48, dabs: 0.8, dab: 1, dabAng: -0.55, seed: 263, g0: 0.08 };
const STATUE_PAINT = { body: [90, 96, 121], dark: [45, 50, 83], lit: [151, 158, 174], rim: 0.32, rimA: 0.6, dabs: 1, dab: 1.1, dabAng: -0.4, seed: 277, g0: 0.08 };
const BRONZE_PAINT = { body: [108, 91, 77], dark: [51, 52, 74], lit: [176, 149, 103], rim: 0.3, rimA: 0.52, dabs: 0.85, dab: 1, dabAng: -0.45, seed: 283, g0: 0.08 };

function pumpkinSprite(k, size = 1, face = true, seed = 0) {
  return memo(`halloween:pumpkin:${k}:${size}:${face}:${seed}`, () => {
    const w = 15 * size, h = 11 * size;
    return massSprite(k, [-w, -h, 2 * w, h + 1], (g) => {
      g.beginPath();
      g.moveTo(-w * 0.08, -h * 0.91);
      g.bezierCurveTo(-w * 0.56, -h * 1.08, -w * 1.02, -h * 0.58, -w * 0.92, -h * 0.08);
      g.bezierCurveTo(-w * 0.86, h * 0.65, -w * 0.44, h * 0.98, 0, h * 0.9);
      g.bezierCurveTo(w * 0.51, h * 1.08, w * 0.95, h * 0.55, w * 0.94, -h * 0.04);
      g.bezierCurveTo(w * 0.92, -h * 0.63, w * 0.44, -h * 1.08, w * 0.08, -h * 0.9);
      g.closePath();
      g.fill();
    }, { ...PUMPKIN_STYLE, seed: PUMPKIN_STYLE.seed + seed }, (g) => {
      // Soft lobe shading, using brush-filled strokes clipped to the fruit.
      g.fillStyle = css([63, 31, 42], 0.25);
      limb(g, [[-w * 0.48, -h * 0.66], [-w * 0.55, -h * 0.18], [-w * 0.42, h * 0.5]], 1.15 * size, 0.55 * size, seed + 1);
      limb(g, [[w * 0.48, -h * 0.64], [w * 0.54, -h * 0.1], [w * 0.4, h * 0.47]], 1.05 * size, 0.5 * size, seed + 2);
      g.fillStyle = css([47, 28, 39], face ? 0.84 : 0.38);
      if (face) {
        path(g, [[-w * 0.55, -h * 0.26], [-w * 0.16, -h * 0.4], [-w * 0.2, -h * 0.04]]); g.fill();
        path(g, [[w * 0.52, -h * 0.25], [w * 0.16, -h * 0.41], [w * 0.22, -h * 0.02]]); g.fill();
        g.beginPath(); g.moveTo(-w * 0.43, h * 0.16); g.quadraticCurveTo(0, h * 0.68, w * 0.44, h * 0.12); g.lineTo(w * 0.29, h * 0.38); g.quadraticCurveTo(0, h * 0.61, -w * 0.28, h * 0.39); g.closePath(); g.fill();
        g.fillStyle = css([242, 178, 91], 0.67);
        path(g, [[-w * 0.43, -h * 0.23], [-w * 0.25, -h * 0.29], [-w * 0.27, -h * 0.11]]); g.fill();
        path(g, [[w * 0.42, -h * 0.22], [w * 0.25, -h * 0.3], [w * 0.28, -h * 0.11]]); g.fill();
        g.fillRect(-w * 0.1, h * 0.31, w * 0.08, h * 0.08); g.fillRect(w * 0.07, h * 0.35, w * 0.08, h * 0.08);
      }
    });
  });
}

function stemSprite(k, seed = 0) {
  return memo(`halloween:stem:${k}:${seed}`, () => massSprite(k, [-2, -5, 5, 7], (g) => {
    g.beginPath(); g.moveTo(-1.5, 1); g.quadraticCurveTo(-3, -2, -1, -4); g.lineTo(1.8, -4.5); g.lineTo(2.2, -1); g.lineTo(3.1, 1); g.closePath();
    g.fill();
  }, { body: [82, 99, 64], dark: [42, 68, 57], lit: [136, 147, 91], rim: 0.12, rimA: 0.3, dabs: 0.6, dab: 0.65, seed: 181 + seed, g0: 0.1 }));
}

function drawPumpkin(ctx, k, x, y, size, face, seed = 0) {
  const s = size;
  const cy = y - 10 * s;
  // A little warm wash lets the carved face read at game scale without making the fruit neon.
  if (face) {
    const g = ctx.createRadialGradient(x, cy - 4 * s, 0.2, x, cy - 4 * s, 15 * s);
    g.addColorStop(0, 'rgba(246,173,83,.22)'); g.addColorStop(1, 'rgba(246,173,83,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 15 * s, cy - 19 * s, 30 * s, 30 * s);
  }
  put(ctx, pumpkinSprite(k, s, face, seed), x, cy);
  put(ctx, stemSprite(k, seed), x, cy - 9.2 * s);
}

function drawPatch(ctx, f) {
  const k = bakeScale(ctx), w = 42;
  const y = footAt(f, f.x, w);
  const sway = Math.sin(f.t * 0.75) * 0.55;
  // The stems and leaves are painterly tapered strokes in the same ink and palette.
  ctx.save(); ctx.translate(f.x, y);
  const leaf = memo(`halloween:leaves:${k}`, () => massSprite(k, [-30, -7, 60, 9], (g) => {
    g.beginPath(); g.moveTo(-29, -1); g.quadraticCurveTo(-7, -10, 5, -1); g.quadraticCurveTo(-8, 8, -29, -1); g.closePath();
    g.fill();
    g.beginPath(); g.moveTo(3, 1); g.quadraticCurveTo(24, -8, 29, 0); g.quadraticCurveTo(18, 9, 3, 1); g.closePath();
    g.fill();
  }, { body: [48, 70, 60], dark: [28, 45, 52], lit: [91, 111, 80], rim: 0.12, rimA: 0.2, dabs: 0.5, dab: 0.8, seed: 193, g0: 0.1 }));
  put(ctx, leaf, -7, -4 + sway); put(ctx, leaf, 17, -2 - sway * 0.5);
  drawPumpkin(ctx, k, -18, 1, 0.7, false, 4);
  drawPumpkin(ctx, k, -3, 0, 0.82, true, 8);
  drawPumpkin(ctx, k, 14, 1, 1.03, true, 12);
  drawPumpkin(ctx, k, 29, 1, 0.64, false, 16);
  // Tendrils curl along the hill and break up the line of fruit.
  ctx.fillStyle = css([47, 70, 57], 0.84);
  limb(ctx, [[-31, 0], [-25, -5], [-18, -4], [-16, -7]], 1, 0.2, 19);
  limb(ctx, [[7, 0], [8, -4], [5, -6], [8, -8]], 1, 0.2, 21);
  // Low grasses melt the fruit into the hill, rather than adding a hard display base.
  ctx.fillStyle = css([31, 31, 53], 0.72);
  for (let i = 0; i < 5; i++) limb(ctx, [[-26 + i * 12, 1], [-24 + i * 12, -2 - (i % 2) * 2], [-22 + i * 12, -4]], 1.4, 0.2, i + 9);
  ctx.restore();
}

function scarecrowParts(k) {
  return memo(`halloween:scarecrow:${k}`, () => {
    const post = massSprite(k, [-2.8, -34, 6, 37], (g) => { g.beginPath(); g.moveTo(-1.4, 1); g.lineTo(-1.2, -32); g.lineTo(1.2, -34); g.lineTo(2.2, 1); g.closePath(); g.fill(); }, { body: [64, 52, 57], dark: [35, 33, 49], lit: [111, 92, 80], rim: 0.3, rimA: 0.5, dabs: 0.65, dab: 0.8, seed: 224 });
    const crossbar = massSprite(k, [-25, -23, 50, 14], (g) => {
      limb(g, [[-24, -17], [-4, -20], [19, -16], [25, -18]], 3.6, 2.4, 223);
    }, { body: [75, 59, 55], dark: [39, 37, 52], lit: [127, 99, 75], rim: 0.24, rimA: 0.42, dabs: 0.6, dab: 0.85, seed: 223 });
    const coat = massSprite(k, [-13, -27, 26, 30], (g) => {
      g.beginPath(); g.moveTo(-4, -26); g.lineTo(4, -27); g.lineTo(8, -19); g.lineTo(13, -12); g.lineTo(10, 1); g.lineTo(5, -2); g.lineTo(1, 2); g.lineTo(-4, -1); g.lineTo(-9, 2); g.lineTo(-12, -12); g.lineTo(-7, -19); g.closePath();
      g.fill();
    }, BURLAP, (g) => {
      g.fillStyle = css([56, 38, 53], 0.6);
      limb(g, [[-7, -18], [-3, -14], [2, -16], [8, -12]], 0.7, 0.4, 12);
      g.fillStyle = css([202, 162, 107], 0.7);
      fillPoly(g, [-3, -21, 3, -22, 5, -14, -1, -12], 0, 9);
      g.fillStyle = css([42, 29, 42], 0.5); g.fillRect(-7, -7, 3, 1.2); g.fillRect(2, -8, 3, 1.2);
    });
    const head = massSprite(k, [-6.5, -38, 13, 13], (g) => {
      g.beginPath(); g.moveTo(-6, -31); g.quadraticCurveTo(-7, -37, -2, -38); g.lineTo(4, -37); g.quadraticCurveTo(7, -34, 5, -29); g.lineTo(1, -26); g.lineTo(-4, -27); g.closePath();
      g.fill();
    }, { ...BURLAP, body: [151, 111, 72], dark: [81, 62, 61], lit: [187, 142, 84], seed: 235 }, (g) => {
      g.fillStyle = css([39, 29, 43], 0.64);
      path(g, [[-4.8, -33], [-2.2, -34], [-2.7, -31]]); g.fill();
      path(g, [[1.2, -33], [4, -34], [3, -31]]); g.fill();
      g.fillStyle = css([42, 28, 40], 0.52); g.fillRect(-2.5, -29, 5.5, 1.1);
    });
    const hat = massSprite(k, [-13, -44, 27, 9], (g) => {
      g.beginPath(); g.moveTo(-13, -37); g.quadraticCurveTo(-8, -40, -4, -40); g.lineTo(-2, -43); g.lineTo(3, -44); g.lineTo(6, -39); g.quadraticCurveTo(10, -38, 13, -37); g.quadraticCurveTo(2, -34, -12, -36); g.closePath();
      g.fill();
    }, HAT, (g) => { g.fillStyle = css([140, 93, 51], 0.75); g.fillRect(-2, -39, 7, 1.5); });
    return { post, crossbar, coat, head, hat };
  });
}
function drawScarecrow(ctx, f) {
  const k = bakeScale(ctx), y = footAt(f, f.x, 9), p = scarecrowParts(k);
  ctx.save(); ctx.translate(f.x, y); ctx.rotate(Math.sin(f.t * 1.1) * 0.018);
  put(ctx, p.post, 0, 0); put(ctx, p.crossbar, 0, 0); put(ctx, p.coat, 0, 0); put(ctx, p.head, 0, 0); put(ctx, p.hat, 0, 0);
  ctx.fillStyle = css([198, 148, 83], 0.8);
  for (let i = -3; i <= 3; i++) limb(ctx, [[i * 3, -18], [i * 4 + 3, -20], [i * 4 + 6, -18]], 0.9, 0.16, i + 4);
  ctx.restore();
}

function cauldronParts(k) {
  return memo(`halloween:cauldron:${k}`, () => {
    const pot = massSprite(k, [-17, -18, 34, 20], (g) => {
      g.beginPath(); g.moveTo(-16, -14); g.quadraticCurveTo(-14, -4, -10, 0); g.quadraticCurveTo(0, 5, 10, 0); g.quadraticCurveTo(15, -5, 16, -14); g.lineTo(11, -12); g.quadraticCurveTo(0, -8, -11, -12); g.closePath();
      g.fill();
    }, CAULDRON, (g) => {
      g.fillStyle = css([123, 124, 159], 0.5);
      limb(g, [[-10, -5], [-8, -1], [-4, 0]], 1.1, 0.5, 2);
      limb(g, [[10, -7], [8, -3], [5, -2]], 0.8, 0.25, 5);
    });
    const rim = massSprite(k, [-18, -20, 36, 11], (g) => { g.beginPath(); g.ellipse(0, -15, 17, 4.5, 0, 0, TAU); g.fill(); }, { ...CAULDRON, body: [76, 69, 89], dark: [28, 27, 48], lit: [133, 119, 145], seed: 119 });
    const brew = massSprite(k, [-13, -21, 26, 10], (g) => { g.beginPath(); g.ellipse(0, -16, 11.5, 2.5, 0, 0, TAU); g.fill(); }, { body: [111, 129, 81], dark: [45, 80, 70], lit: [182, 194, 113], rim: 0.12, rimA: 0.3, dabs: 1, dab: 1, seed: 122 });
  const vapor = massSprite(k, [-19, -46, 38, 32], (g) => {
      limb(g, [[-7, -17], [-9, -23], [-3, -28], [-6, -36]], 4, 1.2, 12);
      limb(g, [[2, -16], [6, -24], [2, -29], [8, -39]], 3.2, 0.9, 15);
      limb(g, [[9, -17], [7, -21], [12, -26], [10, -31]], 2.4, 0.6, 18);
      limb(g, [[-15, -21], [-17, -26], [-13, -31]], 2, 0.5, 22);
    }, { body: [94, 131, 111], dark: [50, 88, 91], lit: [157, 177, 139], rim: 0.15, rimA: 0.28, dabs: 0.75, dab: 1.5, seed: 125, g0: 0.06 });
    return { pot, rim, brew, vapor };
  });
}
function drawCauldron(ctx, f) {
  const k = bakeScale(ctx), y = footAt(f, f.x, 20), p = cauldronParts(k);
  const boil = Math.sin(f.t * 2.8);
  ctx.save(); ctx.translate(f.x, y);
  ctx.globalAlpha = 0.58;
  put(ctx, p.vapor, -2 + Math.sin(f.t * 0.7) * 1.2, 4 + boil * 1.2);
  ctx.globalAlpha = 1;
  put(ctx, p.pot, 0, 0); put(ctx, p.rim, 0, 0); put(ctx, p.brew, 0, 0);
  // Three irregular bubbles, warm in the reflected light and quiet in the night.
  for (let i = 0; i < 3; i++) {
    const bx = (i - 1) * 6 + Math.sin(f.t * 1.7 + i * 2) * 1.1;
    const by = -17 - ((f.t * 5 + i * 1.9) % 7);
    const gr = ctx.createRadialGradient(bx, by, 0.1, bx, by, 3.2);
    gr.addColorStop(0, 'rgba(213,220,132,.5)'); gr.addColorStop(1, 'rgba(120,161,110,0)');
    ctx.fillStyle = gr; ctx.fillRect(bx - 3.2, by - 3.2, 6.4, 6.4);
  }
  ctx.restore();
}

function skeletalHand(k) {
  return memo(`halloween:hand:${k}`, () => {
    const palm = massSprite(k, [-14, -31, 29, 34], (g) => {
      // One connected, bone-like silhouette with fingers curled above the ridge.
      g.beginPath(); g.moveTo(-12, 2); g.quadraticCurveTo(-17, -5, -12, -11);
      g.lineTo(-11, -24); g.quadraticCurveTo(-10, -29, -7, -26); g.lineTo(-6, -15);
      g.lineTo(-4, -30); g.quadraticCurveTo(-3, -34, 0, -30); g.lineTo(1, -15);
      g.lineTo(4, -28); g.quadraticCurveTo(6, -32, 8, -28); g.lineTo(8, -13);
      g.lineTo(12, -23); g.quadraticCurveTo(16, -26, 16, -21); g.lineTo(12, -7);
      g.quadraticCurveTo(13, 1, 8, 3); g.closePath();
      g.fill();
    }, BONE, (g) => {
      g.fillStyle = css([54, 62, 87], 0.64);
      for (const [x, y] of [[-8, -23], [-2, -26], [5, -24], [12, -19]]) oval(g, x, y, 1.35, 1.6);
      g.fillStyle = css([216, 204, 164], 0.68);
      limb(g, [[-7, -12], [-2, -16], [4, -14], [9, -10]], 1.05, 0.55, 71);
      limb(g, [[-7, -22], [-4, -24]], 0.7, 0.4, 74);
      limb(g, [[-1, -24], [2, -25]], 0.7, 0.4, 75);
      for (let i = 0; i < 3; i++) limb(g, [[-9 + i * 6, -6], [-8 + i * 6, -2]], 0.6, 0.3, 73 + i);
    });
    return palm;
  });
}
function drawHand(ctx, f) {
  const k = bakeScale(ctx), y = footAt(f, f.x, 11);
  ctx.save(); ctx.translate(f.x, y + Math.sin(f.t * 1.2) * 0.4);
  // A low wash at the wrist makes it look as if the hand is pushing through the painted hill.
  ctx.fillStyle = css([22, 22, 40], 0.58);
  ctx.beginPath(); ctx.ellipse(0, -1, 11, 3.2, 0, 0, TAU); ctx.fill();
  put(ctx, skeletalHand(k), 0, 0); ctx.restore();
}

// ================================================================= skeleton dance
// Each beat is a gouache mass sprite, so the bones keep the backdrop's broken edge and
// paper tooth while the joints swing. Sixteen poses give the two-step a clear, lively beat.
function skeletonDanceSprite(k, frame) {
  return memo(`halloween:skeleton-dance:${k}:${frame}`, () => {
    const a = (frame / 16) * TAU;
    const sway = Math.sin(a) * 2.2;
    const bounce = Math.sin(a * 2) * 1.5;
    const le = [-12 - Math.cos(a) * 2, -30 + Math.sin(a) * 3];
    const lh = [-18 - Math.cos(a) * 3, -37 - Math.sin(a) * 5];
    const re = [12 - Math.cos(a + Math.PI) * 2, -30 + Math.sin(a + Math.PI) * 3];
    const rh = [18 - Math.cos(a + Math.PI) * 3, -37 - Math.sin(a + Math.PI) * 5];
    const lk = [-7 + Math.sin(a) * 2, -9 + bounce];
    const la = [-9 + Math.sin(a + Math.PI / 2) * 3, -1 - Math.max(0, Math.sin(a * 2)) * 2];
    const rk = [7 - Math.sin(a) * 2, -9 - bounce];
    const ra = [9 + Math.sin(a + Math.PI / 2) * 3, -1 - Math.max(0, -Math.sin(a * 2)) * 2];
    const hx = sway * 0.8, hy = -46 + bounce;
    return massSprite(k, [-25, -58, 50, 61], (g) => {
      g.fillStyle = '#000';
      // Lower legs and hips, then the ribs and shoulders.
      limb(g, [[0, -14], lk, la], 3.2, 2.2, 301 + frame);
      limb(g, [[0, -14], rk, ra], 3.2, 2.2, 311 + frame);
      oval(g, 0, -14, 8.5, 3.8);
      limb(g, [[hx, -34 + bounce], [sway, -26 + bounce], [0, -15]], 3.6, 3.0, 321 + frame);
      // Articulated shoulder, elbow and wrist bones; broad ends make them hold up at distance.
      limb(g, [[sway - 5, -33 + bounce], le, lh], 3.4, 2.3, 331 + frame);
      limb(g, [[sway + 5, -33 + bounce], re, rh], 3.4, 2.3, 341 + frame);
      for (const [x, y] of [[sway - 5, -33 + bounce], le, [sway + 5, -33 + bounce], re, lk, rk]) oval(g, x, y, 2.8, 2.6);
      oval(g, hx, hy, 7.2, 8.1);
      oval(g, hx, hy + 5.3, 5.3, 3.1);
      // The ribcage stays separated from the pelvis: an open silhouette, never a white blob.
      for (let i = 0; i < 4; i++) {
        const y = -32 + i * 3.7 + bounce * 0.35;
        limb(g, [[sway - 5.8 + i * 0.35, y], [sway, y + 1.7], [sway + 5.8 - i * 0.35, y]], 2.2, 1.4, 351 + i + frame);
      }
    }, BONE, (g) => {
      // Deep painted sockets and hairline cuts read as a skull and ribs at close range.
      g.fillStyle = css([47, 49, 73], 0.82);
      oval(g, hx - 2.7, hy - 1.2, 1.65, 2.15);
      oval(g, hx + 2.7, hy - 1.2, 1.65, 2.15);
      fillPoly(g, [hx - 0.5, hy + 1, hx + 0.55, hy + 1, hx, hy + 3.2]);
      g.fillStyle = css([54, 59, 82], 0.6);
      for (let i = 0; i < 3; i++) {
        const y = -31 + i * 3.7 + bounce * 0.35;
        limb(g, [[sway - 4.8, y], [sway + 4.8, y]], 0.55, 0.35, 361 + i);
      }
      g.fillStyle = css([221, 211, 177], 0.64);
      limb(g, [[hx - 3, hy + 5.5], [hx, hy + 6.2], [hx + 3, hy + 5.5]], 0.55, 0.3, 366);
    });
  });
}
function drawSkeletonDance(ctx, f) {
  const k = bakeScale(ctx), y = footAt(f, f.x, 19);
  const phase = wrap(f.t, 3.2) / 3.2;
  const frame = Math.floor(phase * 16) % 16;
  const bob = Math.sin(f.t * TAU / 0.8) * 1.1;
  ctx.save(); ctx.translate(f.x, y + bob); ctx.rotate(Math.sin(f.t * 2.1) * 0.045);
  // A painted contact wash keeps both feet seated even when one kicks out.
  ctx.fillStyle = css([20, 18, 38], 0.7);
  ctx.beginPath(); ctx.ellipse(0, 0.5, 16, 3.6, 0, 0, TAU); ctx.fill();
  put(ctx, skeletonDanceSprite(k, frame), 0, 0);
  ctx.restore();
}

// ================================================================= crooked cemetery gate
function gatePostSprite(k) {
  return memo(`halloween:gate-post:${k}`, () => massSprite(k, [-8, -43, 17, 45], (g) => {
    g.fillStyle = '#000';
    fillPoly(g, [-6, 1, -7, -32, -5, -38, 0, -43, 5, -38, 7, -32, 6, 1]);
    fillPoly(g, [-8, -31, 8, -31, 7, -27, -7, -27]);
    fillPoly(g, [-7, -5, 7, -5, 8, 1, -8, 1]);
  }, STONE_PAINT, (g) => {
    g.fillStyle = css([34, 38, 69], 0.6);
    limb(g, [[-4, -28], [-1, -22], [-3, -13]], 0.8, 0.35, 371);
    g.fillStyle = css([178, 165, 127], 0.58);
    dab(g, 0, -40, 1.4, 1.4, 0);
  }));
}
function gateWingSprite(k, mirror = false) {
  return memo(`halloween:gate-wing:${k}:${mirror}`, () => massSprite(k, [-29, -39, 30, 42], (g) => {
    g.save(); if (mirror) g.scale(-1, 1);
    g.fillStyle = '#000';
    limb(g, [[0, 1], [0, -28], [8, -36], [24, -30], [27, 1]], 3.4, 2.8, 381);
    limb(g, [[0, -12], [13, -13], [26, -12]], 2.6, 1.9, 382);
    limb(g, [[0, -28], [13, -29], [25, -27]], 2.6, 1.9, 383);
    for (let i = 0; i < 5; i++) {
      const x = 3 + i * 5;
      limb(g, [[x, 0], [x, -24 - (i === 2 ? 9 : 0)]], 1.8, 1.2, 390 + i);
      fillPoly(g, [x - 1.3, -26 - (i === 2 ? 9 : 0), x, -32 - (i === 2 ? 9 : 0), x + 1.3, -26 - (i === 2 ? 9 : 0)]);
    }
    g.restore();
  }, IRON_PAINT, (g) => {
    g.fillStyle = css([143, 151, 172], 0.56);
    limb(g, [[4, -10], [4, -26]], 0.45, 0.3, 396);
    limb(g, [[14, -15], [14, -26]], 0.4, 0.25, 397);
  }));
}
function drawGate(ctx, f) {
  const k = bakeScale(ctx), y = footAt(f, f.x, 38), angle = Math.sin(f.t * 0.68) * 0.075;
  const post = gatePostSprite(k), left = gateWingSprite(k), right = gateWingSprite(k, true);
  ctx.save(); ctx.translate(f.x, y);
  ctx.save(); ctx.translate(-30, 0); ctx.rotate(angle); put(ctx, left, 0, 0); ctx.restore();
  ctx.save(); ctx.translate(30, 0); ctx.rotate(-angle); put(ctx, right, 0, 0); ctx.restore();
  ctx.save(); ctx.translate(-30, 0); put(ctx, post, 0, 0); ctx.restore();
  ctx.save(); ctx.translate(30, 0); put(ctx, post, 0, 0); ctx.restore();
  ctx.fillStyle = css([21, 22, 41], 0.42);
  ctx.beginPath(); ctx.ellipse(0, 0, 35, 3.2, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

// ================================================================= old well with a drifting veil of mist
function wellParts(k) {
  return memo(`halloween:well:${k}`, () => {
    const body = massSprite(k, [-23, -25, 46, 28], (g) => {
      g.fillStyle = '#000';
      g.beginPath(); g.moveTo(-22, -18); g.quadraticCurveTo(-18, -6, -14, 0); g.lineTo(14, 0); g.quadraticCurveTo(20, -9, 22, -18); g.closePath(); g.fill();
    }, STONE_PAINT, (g) => {
      g.fillStyle = css([38, 42, 72], 0.63);
      for (let i = 0; i < 4; i++) limb(g, [[-16 + i * 9, -13 + (i % 2) * 5], [-11 + i * 9, -13 + (i % 2) * 5]], 1, 0.6, 401 + i);
    });
    const rim = massSprite(k, [-25, -29, 50, 14], (g) => {
      g.beginPath(); g.ellipse(0, -23, 23, 6.1, 0, 0, TAU); g.fill();
    }, { ...STONE_PAINT, body: [101, 107, 132], dark: [46, 51, 83], seed: 244 });
    const roof = massSprite(k, [-25, -57, 50, 32], (g) => {
      g.fillStyle = '#000';
      limb(g, [[-23, -27], [0, -53], [23, -27]], 3.6, 2.5, 405);
      limb(g, [[-20, -29], [20, -29]], 2.8, 2, 406);
      limb(g, [[-17, -28], [-17, -4]], 2.5, 1.9, 407);
      limb(g, [[17, -28], [17, -4]], 2.5, 1.9, 408);
    }, WOOD_PAINT, (g) => {
      g.fillStyle = css([169, 134, 99], 0.65);
      limb(g, [[-20, -29], [0, -51], [17, -30]], 0.65, 0.4, 409);
    });
    const bucket = massSprite(k, [-5, -21, 12, 13], (g) => {
      g.fillStyle = '#000';
      fillPoly(g, [-4, -18, 4, -18, 5, -7, -5, -7]);
      limb(g, [[-4, -18], [0, -21], [4, -18]], 1.1, 0.8, 410);
    }, WOOD_PAINT, (g) => {
      g.fillStyle = css([163, 139, 102], 0.7); limb(g, [[-3, -12], [3, -12]], 0.7, 0.4, 411);
    });
    return { body, rim, roof, bucket };
  });
}
function drawWell(ctx, f) {
  const k = bakeScale(ctx), y = footAt(f, f.x, 24), p = wellParts(k), bob = Math.sin(f.t * 0.7);
  ctx.save(); ctx.translate(f.x, y);
  put(ctx, p.body, 0, 0); put(ctx, p.rim, 0, 0);
  ctx.fillStyle = css([20, 22, 42], 0.9);
  ctx.beginPath(); ctx.ellipse(0, -23, 15.5, 3.7, 0, 0, TAU); ctx.fill();
  put(ctx, p.roof, 0, 0);
  ctx.fillStyle = css([86, 97, 126], 0.84);
  limb(ctx, [[0, -48], [0.5 + bob, -33], [0, -24]], 0.8, 0.45, 415);
  put(ctx, p.bucket, bob * 0.6, -4 + bob * 0.6);
  ctx.globalAlpha = 0.28;
  const mist = ctx.createRadialGradient(-2, -17, 1, -2, -17, 19);
  mist.addColorStop(0, 'rgba(171,190,199,.6)'); mist.addColorStop(1, 'rgba(113,143,166,0)');
  ctx.fillStyle = mist; ctx.fillRect(-21, -38, 38, 25);
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ================================================================= harvest wheelbarrow
function wheelbarrowParts(k) {
  return memo(`halloween:wheelbarrow:${k}`, () => {
    const frame = massSprite(k, [-31, -18, 64, 20], (g) => {
      g.fillStyle = '#000';
      limb(g, [[-23, -8], [0, -14], [22, -10], [31, -17]], 2.8, 1.8, 421);
      limb(g, [[-22, -7], [-31, -2]], 2.1, 1.4, 422);
      limb(g, [[22, -10], [31, -2]], 2.1, 1.4, 423);
    }, WOOD_PAINT);
    const tray = massSprite(k, [-21, -24, 44, 27], (g) => {
      g.fillStyle = '#000';
      g.beginPath(); g.moveTo(-20, -22); g.lineTo(19, -22); g.lineTo(13, -4); g.quadraticCurveTo(0, 2, -15, -4); g.closePath(); g.fill();
    }, WOOD_PAINT, (g) => {
      g.fillStyle = css([50, 41, 55], 0.6);
      for (let i = -1; i <= 1; i++) limb(g, [[i * 8, -19], [i * 7, -6]], 0.7, 0.4, 424 + i);
    });
    const wheel = massSprite(k, [-7, -10, 14, 15], (g) => {
      g.beginPath(); g.ellipse(0, -4, 6.3, 6.3, 0, 0, TAU); g.fill();
    }, { ...IRON_PAINT, body: [64, 66, 89], dark: [30, 34, 61], seed: 256 }, (g) => {
      g.fillStyle = css([175, 168, 146], 0.75); oval(g, 0, -4, 1.6, 1.6);
    });
    return { frame, tray, wheel };
  });
}
function drawWheelbarrow(ctx, f) {
  const k = bakeScale(ctx), y = footAt(f, f.x, 36), p = wheelbarrowParts(k);
  ctx.save(); ctx.translate(f.x, y);
  put(ctx, p.frame, 0, 0); put(ctx, p.wheel, -24, 0); put(ctx, p.tray, -1, 0);
  drawPumpkin(ctx, k, -10, -22, 0.58, false, 26);
  drawPumpkin(ctx, k, 2, -22, 0.67, true, 29);
  drawPumpkin(ctx, k, 14, -22, 0.52, true, 32);
  ctx.fillStyle = css([48, 67, 57], 0.9);
  limb(ctx, [[-18, -20], [-14, -27], [-11, -29]], 1.1, 0.2, 433);
  ctx.restore();
}

// ================================================================= broken graveyard angel
function angelParts(k) {
  return memo(`halloween:angel:${k}`, () => {
    const plinth = massSprite(k, [-17, -10, 34, 12], (g) => {
      g.fillStyle = '#000'; fillPoly(g, [-15, 1, -17, -7, -12, -10, 12, -10, 17, -6, 15, 1]);
    }, STONE_PAINT);
    const figure = massSprite(k, [-25, -51, 50, 43], (g) => {
      g.fillStyle = '#000';
      // Back wing spreads clearly on the left; the right wing ends in a chipped stump.
      fillPoly(g, [-2, -32, -15, -42, -22, -37, -18, -28, -24, -23, -17, -19, -21, -12, -10, -16]);
      fillPoly(g, [3, -32, 14, -39, 20, -35, 16, -29, 19, -25, 13, -22, 14, -17, 6, -19]);
      limb(g, [[0, -34], [0, -20], [0, -6]], 6.4, 4.6, 441);
      // Robe, bowed head and hands held in a quiet prayer.
      fillPoly(g, [-6, -25, 6, -25, 12, -8, 15, 0, -15, 0, -11, -9]);
      oval(g, 0, -40, 5.7, 6.5);
      limb(g, [[-5, -22], [-8, -16], [-3, -12]], 2.1, 1.6, 442);
      limb(g, [[5, -22], [8, -16], [3, -12]], 2.1, 1.6, 443);
    }, STATUE_PAINT, (g) => {
      g.fillStyle = css([44, 49, 79], 0.66);
      limb(g, [[-2, -10], [0, -23], [3, -31]], 1, 0.5, 444);
      limb(g, [[-4, -18], [1, -15], [5, -18]], 0.7, 0.4, 445);
      g.fillStyle = css([29, 32, 59], 0.66);
      oval(g, -2, -41, 0.9, 1.4); oval(g, 2, -41, 0.9, 1.4);
      limb(g, [[15, -31], [17, -27]], 0.85, 0.4, 446);
    });
    const feather = massSprite(k, [-4, -9, 8, 11], (g) => {
      g.fillStyle = '#000'; limb(g, [[-3, 0], [0, -5], [3, -9]], 1.7, 0.2, 447);
    }, STATUE_PAINT);
    return { plinth, figure, feather };
  });
}
function drawAngel(ctx, f) {
  const k = bakeScale(ctx), y = footAt(f, f.x, 20), p = angelParts(k), fall = wrap(f.t + 0.2, 4.5);
  ctx.save(); ctx.translate(f.x, y);
  put(ctx, p.plinth, 0, 0); put(ctx, p.figure, 0, -7);
  for (let i = 0; i < 3; i++) {
    const t = wrap(fall + i * 1.5, 4.5) / 4.5;
    const x = 15 + t * 12 + i * 2;
    const yy = -35 + t * 28;
    ctx.save(); ctx.globalAlpha = 0.82 - t * 0.45; ctx.rotate(0.5 + t * 1.2); put(ctx, p.feather, x, yy); ctx.restore();
  }
  ctx.restore();
}

// ================================================================= crooked bell frame
function bellParts(k) {
  return memo(`halloween:bell:${k}`, () => {
    const frame = massSprite(k, [-23, -45, 46, 47], (g) => {
      g.fillStyle = '#000';
      limb(g, [[-19, 1], [-16, -36], [0, -44], [17, -36], [20, 1]], 3.2, 2.2, 451);
      limb(g, [[-17, -34], [0, -39], [17, -34]], 3.2, 2.4, 452);
      limb(g, [[-18, -37], [19, -37]], 3.1, 2.4, 453);
    }, WOOD_PAINT, (g) => {
      g.fillStyle = css([171, 128, 99], 0.6);
      limb(g, [[-15, -33], [0, -38], [15, -33]], 0.55, 0.3, 454);
      g.fillStyle = css([46, 40, 54], 0.7);
      limb(g, [[-16, -4], [-18, 0]], 1.2, 0.5, 455);
    });
    const bell = massSprite(k, [-10, -28, 21, 30], (g) => {
      g.fillStyle = '#000';
      g.beginPath(); g.moveTo(-3, -27); g.quadraticCurveTo(-5, -19, -7, -11); g.lineTo(-10, -3); g.quadraticCurveTo(0, 1, 10, -3); g.lineTo(7, -11); g.quadraticCurveTo(5, -19, 3, -27); g.closePath(); g.fill();
    }, BRONZE_PAINT, (g) => {
      g.fillStyle = css([49, 47, 65], 0.7);
      limb(g, [[-8, -5], [0, -3], [8, -5]], 1.4, 0.8, 456);
      g.fillStyle = css([202, 166, 112], 0.7); oval(g, 0, -2, 1.8, 2.4);
    });
    return { frame, bell };
  });
}
function drawBell(ctx, f) {
  const k = bakeScale(ctx), y = footAt(f, f.x, 22), p = bellParts(k), swing = Math.sin(f.t * 1.4) * 0.08;
  ctx.save(); ctx.translate(f.x, y); put(ctx, p.frame, 0, 0);
  ctx.save(); ctx.translate(0, -34); ctx.rotate(swing); put(ctx, p.bell, 0, 0); ctx.restore();
  if (Math.sin(f.t * 1.4) > 0.94) {
    ctx.globalAlpha = 0.24;
    ctx.strokeStyle = css([168, 169, 186], 0.6); ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.ellipse(0, -37, 17, 7, 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function idea(id, name, note, u, paint, focusUp = 16, zoom = 3.5, layer = 'mid') {
  return { id, name, note, layer, when: 'on', u, reach: 80, focusUp, zoom,
    paint(ctx, f) { paint(ctx, f); } };
}

export const CRYPT_HALLOWEEN_BACKGROUNDS = [
  idea('pumpkin-patch', 'Moonlit pumpkin patch', 'Four differently sized fruit, curled vines and restrained carved light, painted into the hill.', 1740, drawPatch, 10, 3.4),
  idea('hill-scarecrow', 'Ragged scarecrow', 'A sturdier crossbar, frayed straw sleeves, patched burlap and a crooked hat in soft gouache.', 1990, drawScarecrow, 25, 3.4),
  idea('bubbling-cauldron', 'Hillside cauldron', 'Textured iron, visible green brew, softened steam and a low warm reflection. The lane stays clear.', 1740, drawCauldron, 23, 3.4),
  idea('skeletal-hand', 'Bony hand in the hill', 'Finger joints and bone ridges break the graveyard crest, with a cool painted rim.', 1990, drawHand, 17, 3.4),
  idea('hill-skeleton-dance', 'Skeleton dance', 'A loose, looping two-step: lifted arms, one kicking foot and a bobbing skull, all in gouache.', 1635, drawSkeletonDance, 20, 3.5),
  idea('crooked-grave-gate', 'Crooked cemetery gate', 'Moonlit iron leaves swing between weathered stone posts on the far rise.', 970, drawGate, 26, 3.25, 'bg'),
  idea('misty-wishing-well', 'Old wishing well', 'A bucket rocks above a dark opening while a veil of painted mist drifts across the stones.', 1260, drawWell, 31, 3.3),
  idea('pumpkin-wheelbarrow', 'Pumpkin wheelbarrow', 'A battered harvest barrow holds small gourds and a touch of vine on the near bank.', 2045, drawWheelbarrow, 24, 3.4, 'fg'),
  idea('broken-angel', 'Broken graveyard angel', 'A chipped stone figure with one damaged wing; a few feathers loosen in the breeze.', 2290, drawAngel, 31, 3.3, 'bg'),
  idea('crooked-bell', 'Crooked graveyard bell', 'A weathered timber frame and a softly swinging bronze bell on the far ridge.', 1535, drawBell, 29, 3.3, 'bg'),
];

export function drawCryptHalloweenBackground(ctx, t, item, close = false, w = 480, h = 270) {
  if (close) return drawCryptIdeaCloseUp(ctx, t, item, w, h);
  return drawCryptIdeaScene(ctx, t, item);
}

// ---------------------------------------------------------------- lane art: clean, outlined, readable at gameplay size
function line(c, pts, color = INK, width = 4) {
  c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
}
function shape(c, pts, fill, stroke = INK, width = 5) {
  path(c, pts); c.fillStyle = fill; c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }
}
function ellipse(c, x, y, rx, ry, fill, stroke = INK, width = 5) {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fillStyle = fill; c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
}

function lanePumpkin(c, t) {
  const r = Math.sin(t * 3.8) * 0.13;
  c.save(); c.rotate(r);
  ellipse(c, 0, -30, 40, 32, '#d77a31', INK, 5);
  ellipse(c, 0, -31, 27, 31, '#ed9a39', '#a84f39', 2.5);
  line(c, [[-23, -51], [-20, -34], [-21, -12]], '#a84f39', 3);
  line(c, [[22, -51], [20, -32], [19, -13]], '#a84f39', 3);
  shape(c, [[-25, -43], [-12, -49], [-17, -30]], '#302d3b', null);
  shape(c, [[25, -42], [12, -50], [17, -30]], '#302d3b', null);
  shape(c, [[-20, -17], [-12, -12], [-4, -17], [4, -11], [12, -17], [21, -15], [13, -5], [-12, -5]], '#302d3b', null);
  c.fillStyle = '#f8d28c'; c.fillRect(-13, -42, 4, 7); c.fillRect(10, -42, 4, 7);
  shape(c, [[-8, -11], [-3, -11], [-2, -7], [-7, -7]], '#fff0ad', null);
  shape(c, [[3, -11], [8, -11], [7, -7], [2, -7]], '#fff0ad', null);
  shape(c, [[-5, -64], [-1, -76], [7, -75], [10, -62], [3, -57]], '#54714d', INK, 4);
  line(c, [[-37, -7], [-26, -2], [-10, 0], [8, 0], [26, -2], [37, -8]], '#9a4b3a', 3);
  c.restore();
}

function laneScarecrow(c, t) {
  const sway = Math.sin(t * 3.2) * 2.4;
  c.save(); c.translate(sway, 0);
  line(c, [[0, -3], [0, -87]], '#5f4139', 8);
  line(c, [[-37, -60], [36, -58]], '#6e4b3d', 8);
  shape(c, [[-17, -61], [17, -62], [24, -52], [21, -22], [13, -16], [6, -23], [-1, -17], [-8, -23], [-18, -19], [-24, -48]], '#596e59', INK, 5);
  shape(c, [[-16, -58], [-8, -61], [-5, -31], [-15, -27]], '#8d674c', INK, 3);
  shape(c, [[7, -58], [16, -58], [18, -28], [9, -24]], '#7f5546', INK, 3);
  // Patch, straw collar and loose sleeve straw.
  shape(c, [[-5, -46], [6, -47], [4, -35], [-6, -34]], '#d8b86d', '#4f3b39', 2.5);
  for (let i = 0; i < 5; i++) line(c, [[-34 + i * 3, -59], [-40 + i * 4, -52]], '#d8b86d', 3);
  for (let i = 0; i < 5; i++) line(c, [[25 + i * 3, -58], [34 + i * 3, -50]], '#d8b86d', 3);
  ellipse(c, 0, -75, 15, 14, '#bd8b55', INK, 4);
  ellipse(c, -5, -77, 2.6, 2.6, '#292735', null); ellipse(c, 5, -77, 2.6, 2.6, '#292735', null);
  line(c, [[-5, -69], [0, -66], [6, -69]], '#4a343b', 2.5);
  shape(c, [[-22, -83], [-17, -90], [-4, -94], [10, -90], [20, -82], [9, -79], [-6, -81]], '#363448', INK, 4);
  line(c, [[-16, -83], [13, -84]], '#876454', 2.5);
  c.restore();
}

function laneCauldron(c, t) {
  const simmer = Math.sin(t * 6);
  c.save();
  // Feet, round belly, dark rim, and bright contents survive at the 13 x 12 hazard scale.
  line(c, [[-22, -5], [-27, 0]], INK, 7); line(c, [[22, -5], [27, 0]], INK, 7);
  ellipse(c, 0, -26, 31, 26, '#4e4c68', INK, 5);
  ellipse(c, 0, -44, 31, 9, '#343248', INK, 5);
  ellipse(c, 0, -43, 23, 5, '#87a34d', '#272738', 2.5);
  ellipse(c, -8 + simmer, -52 - Math.max(0, simmer) * 2, 5, 5, '#bad46c', '#343a42', 2);
  ellipse(c, 11 - simmer * 0.5, -49, 3.5, 3.5, '#e7d476', '#343a42', 1.5);
  line(c, [[-18, -31], [-12, -20], [-5, -16]], '#9da2b5', 3);
  line(c, [[-37, -36], [-46, -40], [-50, -34]], '#576d61', 4);
  line(c, [[36, -39], [45, -47], [43, -55]], '#576d61', 3.2);
  ellipse(c, -48, -42, 3.4, 3, '#95ad69', '#353544', 2);
  c.restore();
}

function laneWeb(c, t) {
  const twitch = Math.sin(t * 5.3) * 1.4;
  // Low hanging strands make the correct slide read; the spider body stays above Lorenzo.
  line(c, [[-47, -94], [-37, -53], [-26, -32]], '#b8b7bd', 5);
  line(c, [[0, -101], [-4, -57], [-5, -38]], '#d6d4d6', 4);
  line(c, [[47, -94], [32, -54], [20, -34]], '#aaa9b3', 4);
  for (let i = -2; i <= 2; i++) line(c, [[i * 12, -82], [i * 7, -61]], '#858698', 2.2);
  ellipse(c, twitch, -31, 15, 13, '#514967', INK, 4);
  ellipse(c, -5 + twitch, -34, 5, 6, '#d9d1b4', '#292738', 2.5);
  ellipse(c, 6 + twitch, -34, 5, 6, '#d9d1b4', '#292738', 2.5);
  ellipse(c, -4 + twitch, -34, 2, 3, '#dd7148', null); ellipse(c, 7 + twitch, -34, 2, 3, '#dd7148', null);
  for (const s of [-1, 1]) {
    line(c, [[s * 9 + twitch, -24], [s * 23 + twitch, -17], [s * 31 + twitch, -23]], '#393747', 4.5);
    line(c, [[s * 12 + twitch, -30], [s * 25 + twitch, -36], [s * 29 + twitch, -44]], '#393747', 4.2);
  }
  line(c, [[-54, -36], [54, -36]], '#77798e', 2.4);
}

function laneArt(c, t, type) {
  c.save();
  if (type === 'pumpkin') lanePumpkin(c, t);
  else if (type === 'scarecrow') laneScarecrow(c, t);
  else if (type === 'cauldron') laneCauldron(c, t);
  else laneWeb(c, t);
  c.restore();
}

export const CRYPT_HALLOWEEN_LANE = [
  { id: 'H01', name: 'Jack-o’-lantern roller', action: 'JUMP', note: 'A round carved pumpkin with a readable face and a clear jump silhouette.', type: 'pumpkin', scale: 0.3, alt: 0 },
  { id: 'H02', name: 'Patchwork scarecrow', action: 'JUMP', note: 'A compact, crooked figure built from large costume shapes and a straw collar.', type: 'scarecrow', scale: 0.28, alt: 0 },
  { id: 'H03', name: 'Bubbling cauldron', action: 'JUMP', note: 'A broad pot with bright brew and moving bubbles; grounded, not floating.', type: 'cauldron', scale: 0.31, alt: 0 },
  { id: 'H04', name: 'Low spider web', action: 'SLIDE', note: 'The web reaches into the runner’s headroom so the slide read is immediate.', type: 'web', scale: 0.32, alt: 13 },
];

let pack, crypt;
function ready() {
  if (!pack) { crypt = CABINETS.find((cab) => cab.id === 'crypt'); pack = getStylePack(crypt.style, {}); }
}
const pose = (t) => ({ kind: 'run', phase: (t * 1.6) % 1, time: t, vy: 0, grounded: true, squash: 0, lean: 0, facing: 1 });

function paintLaneScene(c, t, item) {
  ready();
  const camX = 970 + t * 30;
  c.save(); pack.bg(c, t, camX, crypt, 1000, null, 0, { stageIndex: 2, progress: 0.22, cryptLife: false });
  c.save(); applyWorld(c, ZOOM, 0, GROUND_Y); pack.ground(c, camX, crypt, [], [], t * 60, VIEW_W);
  drawToon(c, 'lorenzo', pose(t), PLAYER_X, GROUND_Y, HERO_DRAW_H);
  c.save(); c.translate(149, GROUND_Y - item.alt); c.scale(item.scale, item.scale); laneArt(c, t, item.type); c.restore();
  c.restore(); c.restore();
}

function paintLaneClose(c, t, item) {
  c.fillStyle = '#303341'; c.fillRect(0, 0, 480, 270);
  c.fillStyle = '#3b3e50'; c.fillRect(0, 215, 480, 55);
  c.strokeStyle = '#7c7882'; c.lineWidth = 1; c.beginPath(); c.moveTo(12, 215); c.lineTo(468, 215); c.stroke();
  c.save(); c.translate(73, 215); c.scale(3.4, 3.4); drawToon(c, 'lorenzo', pose(t), 0, 0, HERO_DRAW_H); c.restore();
  c.save(); c.translate(240, 215 - item.alt * 2.6); c.scale(0.86, 0.86); laneArt(c, t, item.type); c.restore();
  c.save(); c.translate(407, 215); c.scale(3.4, 3.4); drawToon(c, 'gary', pose(t), 0, 0, HERO_DRAW_H); c.restore();
  c.fillStyle = CREAM; c.font = 'bold 10px system-ui'; c.textAlign = 'center';
  c.fillText('LORENZO', 73, 250); c.fillText(`${item.id} · ${item.action}`, 240, 250); c.fillText('GARY', 407, 250);
}

export function drawCryptHalloweenLane(ctx, t, item, close = false) {
  if (close) return paintLaneClose(ctx, t, item);
  return paintLaneScene(ctx, t, item);
}
