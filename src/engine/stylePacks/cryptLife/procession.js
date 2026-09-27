// Three unselected Z1-Z3 zombies, promoted from the Crypt lab to the far ridge
// of level 3. This is scenery only; none has a lane entity or collision shape.
import { drawCryptBackgroundZombie } from '../../../sprites/crypt-background-zombies.js';

export const CRYPT_ZOMBIE_PROCESSION_DURATION = 32;
const KINDS = ['usher', 'gardener', 'clerk'];
const SPEED = 25;
const POSE_RATE = 12;
const SPRITE_DENSITY = 2;
const SPRITES = KINDS.map(() => null);

function zombieSprite(index, stepTime, kind) {
  if (typeof document === 'undefined') return null;
  let sprite = SPRITES[index];
  if (!sprite) {
    const canvas = document.createElement('canvas');
    canvas.width = 168;
    canvas.height = 244;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    sprite = SPRITES[index] = { canvas, ctx, frame: -1 };
  }
  const frame = Math.round(stepTime * POSE_RATE);
  if (sprite.frame !== frame) {
    sprite.ctx.setTransform(1, 0, 0, 1, 0, 0);
    sprite.ctx.clearRect(0, 0, sprite.canvas.width, sprite.canvas.height);
    // Keep the zombie's authored 118-unit silhouette sharp when the game scales
    // the far ridge up to the display.
    sprite.ctx.setTransform(SPRITE_DENSITY, 0, 0, SPRITE_DENSITY, 40, 236);
    drawCryptBackgroundZombie(sprite.ctx, stepTime, kind);
    sprite.frame = frame;
  }
  return sprite.canvas;
}

export const CRYPT_ZOMBIE_PROCESSION = {
  id: 'crypt-3-far-zombie-procession', layer: 'bg', when: 'on',
  // Stage 3 opens at 0.71 of the far strip (2045). This hill starts just off
  // its right edge; the group enters naturally in the opening stretch.
  u: 2590, reach: 530,
  paint(ctx, f) {
    if (f.stageIndex !== 3 || f.t < 0 || f.t > CRYPT_ZOMBIE_PROCESSION_DURATION) return;
    KINDS.forEach((kind, i) => {
      const stepTime = f.t * 1.05 + i * 0.46;
      const stride = stepTime * 4;
      const lurch = 3 * (Math.sin(stride) - Math.sin(i * 0.46 * 4));
      const x = f.x + 270 + i * 36 - SPEED * f.t + lurch;
      if (x < f.view.left - 30 || x > f.view.right + 30) return;
      const scale = 0.19 + i * 0.005;
      const sprite = zombieSprite(i, stepTime, kind);
      ctx.save();
      ctx.globalAlpha = 0.67;
      ctx.filter = 'saturate(0.55) contrast(0.88) blur(0.4px)';
      ctx.translate(x, f.ridgeY(x) + 2 + 0.6 * Math.sin(stride));
      ctx.rotate(-0.035 - 0.085 * Math.max(0, Math.sin(stride - 0.7)));
      ctx.scale(scale, scale);
      ctx.translate(-24, 0);
      if (sprite) ctx.drawImage(sprite, -20, -118, 84, 122);
      else drawCryptBackgroundZombie(ctx, stepTime, kind);
      ctx.restore();
    });
  },
};
