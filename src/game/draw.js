// Entity + hero drawing (logic-free; style packs may decorate).
import { getSprite, buildSprite, scaled2x, tinted } from '../engine/sprites.js';
import { pushOverlayDraw } from '../engine/renderer.js';
import { HERO_SPRITES } from '../sprites/heroes.js';
import { WORLD_SPRITES } from '../sprites/world.js';
import { drawToon, poseFromPlayer, toonFaceSprite } from '../sprites/toons.js';
import { GROUND_Y } from './run.js';
import { PLAYER_X } from './player.js';

export const HERO_DRAW_W = 18;
export const HERO_DRAW_H = 24;

let built = false;
export function buildAllSprites() {
  if (built) return;
  built = true;
  // Heroes are vector toons now (sprites/toons.js); pixel grids remain only
  // as the palette source and for the zombie walker below.
  for (const [id, s] of Object.entries(WORLD_SPRITES)) buildSprite(id, s.grid, s.pal);
  // Zombie walker: reuse gary body tinted-ish (distinct palette).
  buildSprite('zombieWalk', HERO_SPRITES.gary.run1, { ...HERO_SPRITES.gary.pal, b: '#5a6a8a', a: '#8a8aa8' });
}

export function drawHeroSprite(ctx, player, heroId, t, camX, carryingFuse, opts = {}) {
  // Heroes are procedurally animated vector toons (sprites/toons.js).
  // During normal play they render ABOVE the low-res backbuffer at device
  // resolution (pushOverlayDraw) so curves stay smooth; on paused/dead/
  // mirrored frames they bake into the backbuffer instead so dim overlays
  // and the mirror transform still apply to them.
  if (player.iframes > 0 && Math.floor(t * 14) % 2 === 0 && player.headless <= 0) return;
  const pose = poseFromPlayer(player, t);
  const cx = Math.round(PLAYER_X) + 6;                 // center of the 12px slot
  const feetY = Math.round(GROUND_Y - player.y);       // feet stay planted
  const ghosts = player.dashT > 0;
  if (opts.flat || opts.mirror) {
    if (ghosts) {
      drawToon(ctx, heroId, pose, cx - 7, feetY, HERO_DRAW_H, { alpha: 0.35 });
      drawToon(ctx, heroId, pose, cx - 13, feetY, HERO_DRAW_H, { alpha: 0.35 });
    }
    drawToon(ctx, heroId, pose, cx, feetY, HERO_DRAW_H);
  } else {
    pushOverlayDraw((d) => {
      if (ghosts) {
        drawToon(d, heroId, pose, cx - 7, feetY, HERO_DRAW_H, { alpha: 0.35 });
        drawToon(d, heroId, pose, cx - 13, feetY, HERO_DRAW_H, { alpha: 0.35 });
      }
      drawToon(d, heroId, pose, cx, feetY, HERO_DRAW_H);
    });
  }
  if (carryingFuse) {
    const f = getSprite('fuse');
    if (f) ctx.drawImage(f, cx + 6, feetY - HERO_DRAW_H - 2);
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
    ctx.imageSmoothingEnabled = true;
    if (danger) {
      ctx.globalAlpha = 0.12 + 0.08 * Math.sin(t * 5 + e.bobPhase);
      ctx.drawImage(rimLite, ox - 1, oy, w0, h0); ctx.drawImage(rimLite, ox + 1, oy, w0, h0);
      ctx.globalAlpha = 0.22;
      ctx.drawImage(rimDark, ox, oy - 1, w0, h0); ctx.drawImage(rimDark, ox, oy + 1, w0, h0);
      ctx.globalAlpha = 1;
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
  const face = toonFaceSprite(portal.hero, 12, 9);
  if (face) {
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(face, x, GROUND_Y - 56 - pulse, 12, 9);
    ctx.imageSmoothingEnabled = false;
  }
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
