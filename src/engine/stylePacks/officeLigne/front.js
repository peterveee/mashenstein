// Corporate Kombat: LIGNE ’89 front painter. Shared with the preserved bake-off.
import { rrPath } from './line.js';

function paintFront(ctx, f, P) {
  for (const it of f.front) {
    if (it.kind === 'pillar') {
      // A flat wall plane sliding past: keep the overlap cue, not a bevel or side face.
      const x = it.x;
      const w = it.w;
      ctx.fillStyle = P.front;
      ctx.fillRect(x, -2, w, 274);
      continue;
    }
    if (it.kind === 'plant') {
      const x = it.x;
      ctx.fillStyle = P.front;
      ctx.beginPath();
      for (let k = 0; k < 7; k++) {
        const a = -Math.PI / 2 + (k - 3) * 0.32;
        const L = 34 + (k % 3) * 8;
        const sx = x + (k - 3) * 2;
        const sy = 276;
        const ex = sx + Math.cos(a) * L;
        const ey = sy + Math.sin(a) * L;
        const nx = -Math.sin(a) * 5;
        const ny = Math.cos(a) * 5;
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo((sx + ex) / 2 + nx, (sy + ey) / 2 + ny, ex, ey);
        ctx.quadraticCurveTo((sx + ex) / 2 - nx, (sy + ey) / 2 - ny, sx, sy);
      }
      ctx.fill();
      continue;
    }
    if (it.kind === 'chair') {
      // an office chair's back and its arms, rising into the bottom of the frame
      ctx.fillStyle = P.front;
      ctx.beginPath();
      rrPath(ctx, it.x - 16, 240, 32, 26, 9);
      ctx.rect(it.x - 26, 258, 8, 16);
      ctx.rect(it.x + 18, 258, 8, 16);
      ctx.rect(it.x - 26, 256, 18, 4);
      ctx.rect(it.x + 8, 256, 18, 4);
      ctx.fill();
      ctx.fillStyle = P.frontLt;
      ctx.fillRect(it.x - 12, 243, 24, 2);
      continue;
    }
    if (it.kind === 'armchair') {
      ctx.fillStyle = P.front;
      ctx.beginPath();
      ctx.moveTo(it.x - 30, 272);
      ctx.lineTo(it.x - 30, 248);
      ctx.quadraticCurveTo(it.x - 30, 240, it.x - 22, 240);
      ctx.quadraticCurveTo(it.x - 20, 234, it.x - 12, 234);
      ctx.lineTo(it.x + 12, 234);
      ctx.quadraticCurveTo(it.x + 20, 234, it.x + 22, 240);
      ctx.quadraticCurveTo(it.x + 30, 240, it.x + 30, 248);
      ctx.lineTo(it.x + 30, 272);
      ctx.closePath();
      ctx.fill();
    }
  }
}

export { paintFront };
