// Entity + hero drawing (logic-free; style packs may decorate).
import { getSprite, buildSprite, scaled2x } from '../engine/sprites.js';
import { HERO_SPRITES } from '../sprites/heroes.js';
import { WORLD_SPRITES } from '../sprites/world.js';
import { GROUND_Y } from './run.js';
import { PLAYER_X } from './player.js';

let built = false;
export function buildAllSprites() {
  if (built) return;
  built = true;
  for (const [id, def] of Object.entries(HERO_SPRITES)) {
    for (const frame of ['run1', 'run2', 'jump', 'duck']) {
      if (def[frame]) buildSprite(`hero_${id}_${frame}`, def[frame], def.pal);
    }
    if (def.headless) buildSprite(`hero_${id}_headless`, def.headless, def.pal);
    // 12x9 face crop for HUD: rebuild from the first 9 rows.
    buildSprite(`hero_${id}_face`, def.run1.slice(0, 9).map((r) => r.slice(0, 12)), def.pal);
  }
  for (const [id, s] of Object.entries(WORLD_SPRITES)) buildSprite(id, s.grid, s.pal);
  // Zombie walker: reuse gary body tinted-ish (distinct palette).
  buildSprite('zombieWalk', HERO_SPRITES.gary.run1, { ...HERO_SPRITES.gary.pal, b: '#5a6a8a', a: '#8a8aa8' });
}

export function drawHeroSprite(ctx, player, heroId, t, camX, carryingFuse) {
  // Heroes render at 2x via Scale2x — bigger and smoother, same hitbox
  // (visual overhang beyond the hitbox is deliberate: it plays forgiving).
  let frame;
  if (player.headless > 0) frame = `hero_${heroId}_headless`;
  else if (player.ducking) frame = `hero_${heroId}_duck`;
  else if (!player.grounded) frame = `hero_${heroId}_jump`;
  else frame = `hero_${heroId}_${Math.floor(player.anim * 2) % 2 === 0 ? 'run1' : 'run2'}`;
  let spr = scaled2x(frame) || scaled2x(`hero_${heroId}_run1`);
  if (player.iframes > 0 && Math.floor(t * 14) % 2 === 0 && player.headless <= 0) return;
  const x = Math.round(PLAYER_X) - 6;                    // center 24px sprite on the 12px slot
  const y = Math.round(GROUND_Y - player.y - 32);        // feet stay planted
  if (spr) ctx.drawImage(spr, x, y);
  if (carryingFuse) {
    const f = getSprite('fuse');
    if (f) ctx.drawImage(f, x + 20, y - 4);
  }
  if (player.dashT > 0) {
    ctx.globalAlpha = 0.35;
    if (spr) { ctx.drawImage(spr, x - 10, y); ctx.drawImage(spr, x - 19, y); }
    ctx.globalAlpha = 1;
  }
}

export function drawWorldEntity(ctx, e, camX, t, style) {
  const x = Math.round(e.x - camX);
  if (x < -40 || x > 520) return;
  const bottom = GROUND_Y - e.alt;
  let y = Math.round(bottom - e.h);
  if (e.def && (e.def.bob || (e.def && e.def.power))) y += Math.round(Math.sin(t * 3 + e.bobPhase) * 2);
  if (e.kind === 'pickup' && e.def.power) y += Math.round(Math.sin(t * 3 + e.bobPhase) * 2);

  if (e.def && e.def.isGap) return; // drawn by ground renderer
  if (e.def && e.def.beatSync) {
    ctx.fillStyle = '#e04898';
    ctx.fillRect(x, Math.round(GROUND_Y - e.h), e.w, e.h);
    ctx.fillStyle = '#f890c8';
    ctx.fillRect(x, Math.round(GROUND_Y - e.h), e.w, 2);
    return;
  }
  if (e.def && e.def.paper) {
    ctx.fillStyle = '#f0f0f8';
    ctx.fillRect(x, y + Math.round(Math.sin(t * 8 + e.bobPhase) * 3), 8, 6);
    ctx.fillStyle = '#8a8a98';
    ctx.fillRect(x + 1, y + 2 + Math.round(Math.sin(t * 8 + e.bobPhase) * 3), 6, 1);
    return;
  }
  const sprName = e.def ? e.def.sprite : null;
  const spr = sprName ? getSprite(sprName) : null;
  if (!spr) { ctx.fillStyle = '#f0f'; ctx.fillRect(x, y, e.w, e.h); return; }

  if (e.def.stack && e.n > 1) {
    for (let i = 0; i < e.n; i++) ctx.drawImage(spr, x, Math.round(GROUND_Y - (i + 1) * 11));
  } else if (e.def.tall) {
    ctx.drawImage(spr, x, Math.round(GROUND_Y - 11));
    ctx.drawImage(spr, x, Math.round(GROUND_Y - 18));
  } else if (e.def.falls && !e.fell) {
    // telegraph: hang from "ceiling" with a warning shimmer
    ctx.drawImage(spr, x, Math.round(GROUND_Y - e.alt - e.h));
    if (Math.floor(t * 8) % 2 === 0) { ctx.fillStyle = 'rgba(246,211,60,0.6)'; ctx.fillRect(x + 2, GROUND_Y - 3, 4, 3); }
  } else if (e.roll || (e.def.roll)) {
    ctx.save();
    ctx.translate(x + e.w / 2, y + e.h / 2);
    ctx.rotate(-t * 6);
    ctx.drawImage(spr, -e.w / 2, -e.h / 2);
    ctx.restore();
  } else {
    ctx.drawImage(spr, x, y);
  }
  if (style && style.decorate) style.decorate(ctx, e, x, y);
}

export function drawPortal(ctx, portal, camX, t) {
  const x = Math.round(portal.x - camX);
  const spr = getSprite('portal');
  const pulse = Math.round(Math.sin(t * 5) * 2);
  if (spr) {
    ctx.drawImage(spr, x, GROUND_Y - 40 - pulse, 12, 40 + pulse);
  }
  const face = getSprite(`hero_${portal.hero}_face`);
  if (face) ctx.drawImage(face, x, GROUND_Y - 56 - pulse);
  ctx.fillStyle = '#48e0c8';
  ctx.fillRect(x + 4, GROUND_Y - 2, 4, 2);
}

export function drawCopter(ctx, copter, camX, t) {
  const x = Math.round(copter.x - camX);
  const y = Math.round(GROUND_Y - copter.alt - 16);
  const spr = getSprite('eggshell');
  if (spr) ctx.drawImage(spr, x - 12, y - 8);
  // rotor blur
  ctx.fillStyle = 'rgba(200,200,216,0.6)';
  ctx.fillRect(x - 10 + Math.round(Math.sin(t * 40) * 3), y - 10, 20, 1);
}
