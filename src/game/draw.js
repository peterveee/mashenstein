// Entity + hero drawing (logic-free; style packs may decorate).
import { getSprite, buildSprite, scaled2x, smoothed, tinted } from '../engine/sprites.js';
import { pushOverlaySprite } from '../engine/renderer.js';
import { HERO_SPRITES } from '../sprites/heroes.js';
import { WORLD_SPRITES } from '../sprites/world.js';
import { GROUND_Y } from './run.js';
import { PLAYER_X } from './player.js';

export const HERO_DRAW_W = 18;
export const HERO_DRAW_H = 24;

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

export function drawHeroSprite(ctx, player, heroId, t, camX, carryingFuse, opts = {}) {
  // Heroes draw from a 4x EPX-smoothed sprite at 1.5x world scale (18x24).
  // During normal play the sprite renders ABOVE the low-res backbuffer at
  // device resolution (pushOverlaySprite) so its edges stay smooth; on
  // paused/dead/mirrored frames it bakes into the backbuffer instead so
  // dim overlays and the mirror transform still apply to it.
  let frame;
  if (player.headless > 0) frame = `hero_${heroId}_headless`;
  else if (player.ducking) frame = `hero_${heroId}_duck`;
  else if (!player.grounded) frame = `hero_${heroId}_jump`;
  else frame = `hero_${heroId}_${Math.floor(player.anim * 2) % 2 === 0 ? 'run1' : 'run2'}`;
  const spr = smoothed(frame) || smoothed(`hero_${heroId}_run1`);
  if (player.iframes > 0 && Math.floor(t * 14) % 2 === 0 && player.headless <= 0) return;
  const x = Math.round(PLAYER_X) - 3;                    // center 18px draw on the 12px slot
  const y = Math.round(GROUND_Y - player.y - HERO_DRAW_H); // feet stay planted
  if (spr) {
    if (opts.flat || opts.mirror) {
      const prev = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(spr, x, y, HERO_DRAW_W, HERO_DRAW_H);
      ctx.imageSmoothingEnabled = prev;
    } else {
      pushOverlaySprite(spr, x, y, HERO_DRAW_W, HERO_DRAW_H);
    }
  }
  if (carryingFuse) {
    const f = getSprite('fuse');
    if (f) ctx.drawImage(f, x + 15, y - 2);
  }
  if (player.dashT > 0 && spr) {
    const prev = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = 0.35;
    ctx.drawImage(spr, x - 7, y, HERO_DRAW_W, HERO_DRAW_H);
    ctx.drawImage(spr, x - 13, y, HERO_DRAW_W, HERO_DRAW_H);
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = prev;
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
    const py = y + Math.round(Math.sin(t * 8 + e.bobPhase) * 3);
    ctx.fillStyle = '#101018';
    ctx.fillRect(x - 1, py - 1, 10, 8);
    ctx.fillStyle = '#f0f0f8';
    ctx.fillRect(x, py, 8, 6);
    ctx.fillStyle = '#8a8a98';
    ctx.fillRect(x + 1, py + 2, 6, 1);
    return;
  }
  const sprName = e.def ? e.def.sprite : null;
  const spr = sprName ? getSprite(sprName) : null;
  if (!spr) { ctx.fillStyle = '#f0f'; ctx.fillRect(x, y, e.w, e.h); return; }

  // Hazards render ~1.33x bigger than their (unchanged) hitboxes — generous,
  // never unfair — from the EPX 2x source with smoothing, ringed by a dark
  // inner outline plus a pulsing light outer outline so they pop against both
  // light and dark terrain. Things you WANT (targets/pads/switches) stay clean.
  const danger = e.kind === 'obstacle' && !e.def.isTarget && !e.def.isBoost && !e.def.isSwitch;
  const src = danger ? (scaled2x(sprName) || spr) : spr;
  const rimDark = danger ? tinted(sprName, '#101018') : null;
  const rimLite = danger ? tinted(sprName, '#f0f0f8') : null;
  const bw = spr.width, bh = spr.height;
  const prevSmooth = ctx.imageSmoothingEnabled;
  // plain: natural size (stacked crates / pipes tile edge-to-edge);
  // anchor 'center' for rotating rollers, 'bottom' otherwise.
  const draw1 = (dx, dy, anchor = 'bottom', plain = false) => {
    const w0 = plain ? bw : Math.round(bw * 4 / 3);
    const h0 = plain ? bh : Math.round(bh * 4 / 3);
    const ox = dx - Math.floor((w0 - bw) / 2);
    const oy = anchor === 'center' ? dy - Math.floor((h0 - bh) / 2) : dy - (h0 - bh);
    if (danger) {
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = 0.4 + 0.25 * Math.sin(t * 5 + e.bobPhase);
      ctx.drawImage(rimLite, ox - 2, oy, w0, h0); ctx.drawImage(rimLite, ox + 2, oy, w0, h0);
      ctx.drawImage(rimLite, ox, oy - 2, w0, h0); ctx.drawImage(rimLite, ox, oy + 2, w0, h0);
      ctx.globalAlpha = 1;
      ctx.drawImage(rimDark, ox - 1, oy, w0, h0); ctx.drawImage(rimDark, ox + 1, oy, w0, h0);
      ctx.drawImage(rimDark, ox, oy - 1, w0, h0); ctx.drawImage(rimDark, ox, oy + 1, w0, h0);
    }
    ctx.drawImage(plain ? spr : src, ox, oy, w0, h0);
    ctx.imageSmoothingEnabled = prevSmooth;
  };
  if (danger) {
    // anchors flyers to the lane and marks where falling hazards land
    ctx.fillStyle = 'rgba(8,8,16,0.4)';
    ctx.fillRect(x, GROUND_Y - 2, e.w, 2);
  }

  if (e.def.stack && e.n > 1) {
    for (let i = 0; i < e.n; i++) draw1(x, Math.round(GROUND_Y - (i + 1) * 11), 'bottom', true);
  } else if (e.def.tall) {
    draw1(x, Math.round(GROUND_Y - 11), 'bottom', true);
    draw1(x, Math.round(GROUND_Y - 18), 'bottom', true);
  } else if (e.def.falls && !e.fell) {
    // telegraph: hang from "ceiling" with a warning shimmer
    draw1(x, Math.round(GROUND_Y - e.alt - e.h));
    if (Math.floor(t * 8) % 2 === 0) { ctx.fillStyle = 'rgba(246,211,60,0.6)'; ctx.fillRect(x + 2, GROUND_Y - 3, 4, 3); }
  } else if (e.roll || (e.def.roll)) {
    ctx.save();
    ctx.translate(x + e.w / 2, y + e.h / 2);
    ctx.rotate(-t * 6);
    draw1(-bw / 2, -bh / 2, 'center');
    ctx.restore();
  } else {
    draw1(x, y);
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
  // chase mission: flash the catch window while the copter swoops in
  if (copter.inRange && Math.floor(t * 6) % 2 === 0) {
    ctx.fillStyle = '#f6d33c';
    ctx.fillRect(x - 1, y - 18, 3, 5);
    ctx.fillRect(x - 1, y - 12, 3, 2);
  }
}
