// Frost Fortress's selected E finish: B's broken paper-hill seams with D's
// deeper snow on the planted rocks, pines, glacier and drifts. The style pack
// supplies the live ridge sampler and calls these after the real hill/feature
// painters, so placement, lighting, clipping and gameplay geometry stay shared.

function fill(ctx, color, path) {
  ctx.fillStyle = color;
  ctx.beginPath();
  path(ctx);
  ctx.closePath();
  ctx.fill();
}

function line(ctx, color, width, path) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  path(ctx);
  ctx.stroke();
}

function ridgeLine(ctx, info, offset, color, width, span) {
  const left = Math.max(info.coverage.left, span[0]);
  const right = Math.min(info.coverage.right, span[1]);
  if (right <= left) return;
  line(ctx, color, width, (c) => {
    for (let x = left, i = 0; x <= right + 3; x += 3, i++) {
      const y = info.ridgeY(x) + offset;
      if (!i) c.moveTo(x, y); else c.lineTo(x, y);
    }
  });
}

export function frostPaperHillFinish(ctx, info) {
  const period = Math.round(Math.PI * info.wl);
  const travel = info.travel;
  for (let k = Math.floor(travel / period) - 2;
    k < Math.ceil((travel + info.coverage.right) / period) + 2; k++) {
    const x = info.coverage.left + k * period - travel;
    ridgeLine(ctx, info, 5, 'rgba(239,247,251,0.40)', 1.25,
      [x + period * 0.17, x + period * 0.39]);
    ridgeLine(ctx, info, 15, 'rgba(47,84,111,0.22)', 0.9,
      [x + period * 0.53, x + period * 0.79]);
    ridgeLine(ctx, info, 24, 'rgba(51,87,114,0.13)', 0.75,
      [x + period * 0.07, x + period * 0.23]);
  }
}

export function frostDeepSnowFeature(ctx, feature) {
  switch (feature.kind) {
    case 'ice-rock':
      fill(ctx, 'rgba(247,252,253,0.83)', (c) => {
        c.moveTo(-11, -6); c.quadraticCurveTo(-6, -12, -4, -10);
        c.lineTo(2, -8); c.quadraticCurveTo(6, -7, 9, -4);
        c.quadraticCurveTo(5, -6, 1, -5); c.lineTo(-5, -7);
      });
      break;
    case 'glacier':
      fill(ctx, 'rgba(248,252,254,0.65)', (c) => {
        c.moveTo(-14, -31); c.lineTo(-10, -25); c.lineTo(-7, -28);
        c.lineTo(1, -47); c.lineTo(6, -34); c.lineTo(4, -31);
        c.lineTo(0, -34); c.lineTo(-5, -21); c.lineTo(-10, -18);
      });
      line(ctx, 'rgba(229,244,250,0.52)', 1.1, (c) => {
        c.moveTo(-19, -8); c.quadraticCurveTo(-11, -15, -6, -5);
        c.moveTo(11, -13); c.quadraticCurveTo(18, -21, 22, -11);
      });
      break;
    case 'pine':
      for (const [y, w] of [[-11, 4.1], [-5, 5.9], [-3, 7.6]]) {
        fill(ctx, 'rgba(248,252,255,0.88)', (c) => {
          c.moveTo(-w, y); c.quadraticCurveTo(-w * 0.2, y + 2.5, 0, y + 1.3);
          c.quadraticCurveTo(w * 0.5, y + 2.7, w, y);
          c.quadraticCurveTo(0, y + 1.2, -w, y);
        });
      }
      break;
    case 'snowbank':
      line(ctx, 'rgba(250,253,255,0.85)', 1.6, (c) => {
        c.moveTo(-15, -1); c.quadraticCurveTo(-10, -5, -5, -3);
        c.quadraticCurveTo(1, -8, 7, -4); c.quadraticCurveTo(11, -5, 15, -1);
      });
      break;
  }
}

export const FROST_COMBINED_SCENERY_FINISH = Object.freeze({
  hill: frostPaperHillFinish,
  feature: frostDeepSnowFeature,
});
