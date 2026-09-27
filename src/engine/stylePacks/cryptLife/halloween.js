// The pumpkin patch and cauldron are the two selected paintings from
// src/dev/crypt-halloween-bakeoff.js. Keep the shipped painters here so they use the
// Crypt backdrop's mass-sprite kit and can be warmed with the other graveyard life.
import { GOUACHE_KIT as K } from '../cryptGouache.js';

const { massSprite, limb, css } = K;
const TAU = Math.PI * 2;

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
function path(g, pts) {
  g.beginPath();
  pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
  g.closePath();
}
function footAt(f, x, halfW) {
  let y = -Infinity;
  for (let d = -halfW; d <= halfW; d += 1.5) y = Math.max(y, f.ridgeY(x + d));
  return y + 1.5;
}

const PUMPKIN_STYLE = {
  body: [158, 72, 48], dark: [91, 38, 45], lit: [217, 132, 75],
  rim: 0.25, rimA: 0.5, dabs: 1.15, dab: 1.05, dabAng: -0.5, seed: 71, g0: 0.1,
};
const CAULDRON = {
  body: [39, 37, 62], dark: [20, 20, 39], lit: [95, 95, 133],
  rim: 0.25, rimA: 0.58, dabs: 0.9, dab: 1.15, dabAng: 0.1, seed: 115, g0: 0.08,
};

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
      g.fillStyle = css([63, 31, 42], 0.25);
      limb(g, [[-w * 0.48, -h * 0.66], [-w * 0.55, -h * 0.18], [-w * 0.42, h * 0.5]], 1.15 * size, 0.55 * size, seed + 1);
      limb(g, [[w * 0.48, -h * 0.64], [w * 0.54, -h * 0.1], [w * 0.4, h * 0.47]], 1.05 * size, 0.5 * size, seed + 2);
      g.fillStyle = css([47, 28, 39], face ? 0.84 : 0.38);
      if (face) {
        path(g, [[-w * 0.55, -h * 0.26], [-w * 0.16, -h * 0.4], [-w * 0.2, -h * 0.04]]); g.fill();
        path(g, [[w * 0.52, -h * 0.25], [w * 0.16, -h * 0.41], [w * 0.22, -h * 0.02]]); g.fill();
        g.beginPath(); g.moveTo(-w * 0.43, h * 0.16); g.quadraticCurveTo(0, h * 0.68, w * 0.44, h * 0.12);
        g.lineTo(w * 0.29, h * 0.38); g.quadraticCurveTo(0, h * 0.61, -w * 0.28, h * 0.39); g.closePath(); g.fill();
        g.fillStyle = css([242, 178, 91], 0.67);
        path(g, [[-w * 0.43, -h * 0.23], [-w * 0.25, -h * 0.29], [-w * 0.27, -h * 0.11]]); g.fill();
        path(g, [[w * 0.42, -h * 0.22], [w * 0.25, -h * 0.3], [w * 0.28, -h * 0.11]]); g.fill();
        g.fillRect(-w * 0.1, h * 0.31, w * 0.08, h * 0.08);
        g.fillRect(w * 0.07, h * 0.35, w * 0.08, h * 0.08);
      }
    });
  });
}

function stemSprite(k, seed = 0) {
  return memo(`halloween:stem:${k}:${seed}`, () => massSprite(k, [-2, -5, 5, 7], (g) => {
    g.beginPath(); g.moveTo(-1.5, 1); g.quadraticCurveTo(-3, -2, -1, -4);
    g.lineTo(1.8, -4.5); g.lineTo(2.2, -1); g.lineTo(3.1, 1); g.closePath();
    g.fill();
  }, {
    body: [82, 99, 64], dark: [42, 68, 57], lit: [136, 147, 91],
    rim: 0.12, rimA: 0.3, dabs: 0.6, dab: 0.65, seed: 181 + seed, g0: 0.1,
  }));
}

function drawPumpkin(ctx, k, x, y, size, face, seed = 0) {
  const cy = y - 10 * size;
  if (face) {
    const g = ctx.createRadialGradient(x, cy - 4 * size, 0.2, x, cy - 4 * size, 15 * size);
    g.addColorStop(0, 'rgba(246,173,83,.22)'); g.addColorStop(1, 'rgba(246,173,83,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 15 * size, cy - 19 * size, 30 * size, 30 * size);
  }
  put(ctx, pumpkinSprite(k, size, face, seed), x, cy);
  put(ctx, stemSprite(k, seed), x, cy - 9.2 * size);
}

export function drawCryptPumpkinPatch(ctx, f) {
  const k = bakeScale(ctx), y = footAt(f, f.x, 21);
  const sway = Math.sin(f.t * 0.75) * 0.55;
  ctx.save(); ctx.translate(f.x, y); ctx.scale(0.5, 0.5); ctx.globalAlpha *= 0.84;
  const leaf = memo(`halloween:leaves:${k}`, () => massSprite(k, [-30, -7, 60, 9], (g) => {
    g.beginPath(); g.moveTo(-29, -1); g.quadraticCurveTo(-7, -10, 5, -1); g.quadraticCurveTo(-8, 8, -29, -1); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(3, 1); g.quadraticCurveTo(24, -8, 29, 0); g.quadraticCurveTo(18, 9, 3, 1); g.closePath(); g.fill();
  }, {
    body: [48, 70, 60], dark: [28, 45, 52], lit: [91, 111, 80],
    rim: 0.12, rimA: 0.2, dabs: 0.5, dab: 0.8, seed: 193, g0: 0.1,
  }));
  put(ctx, leaf, -7, -4 + sway); put(ctx, leaf, 17, -2 - sway * 0.5);
  drawPumpkin(ctx, k, -18, 1, 0.7, false, 4);
  drawPumpkin(ctx, k, -3, 0, 0.82, true, 8);
  drawPumpkin(ctx, k, 14, 1, 1.03, true, 12);
  drawPumpkin(ctx, k, 29, 1, 0.64, false, 16);
  ctx.fillStyle = css([47, 70, 57], 0.84);
  limb(ctx, [[-31, 0], [-25, -5], [-18, -4], [-16, -7]], 1, 0.2, 19);
  limb(ctx, [[7, 0], [8, -4], [5, -6], [8, -8]], 1, 0.2, 21);
  ctx.fillStyle = css([31, 31, 53], 0.72);
  for (let i = 0; i < 5; i++) limb(ctx, [[-26 + i * 12, 1], [-24 + i * 12, -2 - (i % 2) * 2], [-22 + i * 12, -4]], 1.4, 0.2, i + 9);
  ctx.restore();
}

function cauldronParts(k) {
  return memo(`halloween:cauldron:${k}`, () => {
    const pot = massSprite(k, [-17, -18, 34, 20], (g) => {
      g.beginPath(); g.moveTo(-16, -14); g.quadraticCurveTo(-14, -4, -10, 0);
      g.quadraticCurveTo(0, 5, 10, 0); g.quadraticCurveTo(15, -5, 16, -14);
      g.lineTo(11, -12); g.quadraticCurveTo(0, -8, -11, -12); g.closePath(); g.fill();
    }, CAULDRON, (g) => {
      g.fillStyle = css([123, 124, 159], 0.5);
      limb(g, [[-10, -5], [-8, -1], [-4, 0]], 1.1, 0.5, 2);
      limb(g, [[10, -7], [8, -3], [5, -2]], 0.8, 0.25, 5);
    });
    const rim = massSprite(k, [-18, -20, 36, 11], (g) => {
      g.beginPath(); g.ellipse(0, -15, 17, 4.5, 0, 0, TAU); g.fill();
    }, { ...CAULDRON, body: [76, 69, 89], dark: [28, 27, 48], lit: [133, 119, 145], seed: 119 });
    const brew = massSprite(k, [-13, -21, 26, 10], (g) => {
      g.beginPath(); g.ellipse(0, -16, 11.5, 2.5, 0, 0, TAU); g.fill();
    }, {
      body: [111, 129, 81], dark: [45, 80, 70], lit: [182, 194, 113],
      rim: 0.12, rimA: 0.3, dabs: 1, dab: 1, seed: 122,
    });
    const vapor = massSprite(k, [-19, -46, 38, 32], (g) => {
      limb(g, [[-7, -17], [-9, -23], [-3, -28], [-6, -36]], 4, 1.2, 12);
      limb(g, [[2, -16], [6, -24], [2, -29], [8, -39]], 3.2, 0.9, 15);
      limb(g, [[9, -17], [7, -21], [12, -26], [10, -31]], 2.4, 0.6, 18);
      limb(g, [[-15, -21], [-17, -26], [-13, -31]], 2, 0.5, 22);
    }, {
      body: [94, 131, 111], dark: [50, 88, 91], lit: [157, 177, 139],
      rim: 0.15, rimA: 0.28, dabs: 0.75, dab: 1.5, seed: 125, g0: 0.06,
    });
    return { pot, rim, brew, vapor };
  });
}

export function drawCryptCauldron(ctx, f) {
  const k = bakeScale(ctx), y = footAt(f, f.x, 10), p = cauldronParts(k);
  const boil = Math.sin(f.t * 2.8);
  ctx.save(); ctx.translate(f.x, y); ctx.scale(0.5, 0.5);
  const alpha = ctx.globalAlpha * 0.84;
  ctx.globalAlpha = alpha * 0.58;
  put(ctx, p.vapor, -2 + Math.sin(f.t * 0.7) * 1.2, 4 + boil * 1.2);
  ctx.globalAlpha = alpha;
  put(ctx, p.pot, 0, 0); put(ctx, p.rim, 0, 0); put(ctx, p.brew, 0, 0);
  for (let i = 0; i < 3; i++) {
    const bx = (i - 1) * 6 + Math.sin(f.t * 1.7 + i * 2) * 1.1;
    const by = -17 - ((f.t * 5 + i * 1.9) % 7);
    const gr = ctx.createRadialGradient(bx, by, 0.1, bx, by, 3.2);
    gr.addColorStop(0, 'rgba(213,220,132,.5)'); gr.addColorStop(1, 'rgba(120,161,110,0)');
    ctx.fillStyle = gr; ctx.fillRect(bx - 3.2, by - 3.2, 6.4, 6.4);
  }
  ctx.restore();
}

function onlyLateStage(stage, beginsAt, paint) {
  return (ctx, f) => {
    const progress = f.view?.progress;
    if (f.stageIndex !== stage || !Number.isFinite(progress) || progress < beginsAt) return;
    paint(ctx, f);
  };
}

export const CRYPT_HALLOWEEN_LIFE = Object.freeze([
  {
    id: 'pumpkin-patch', layer: 'mid', when: 'on', u: 2630, reach: 64,
    warmStageIndex: 2, warmProgress: 0.9,
    paint: onlyLateStage(2, 0.8, drawCryptPumpkinPatch),
  },
  {
    id: 'bubbling-cauldron', layer: 'mid', when: 'on', u: 750, reach: 48,
    warmStageIndex: 3, warmProgress: 0.9,
    paint: onlyLateStage(3, 0.8, drawCryptCauldron),
  },
]);
