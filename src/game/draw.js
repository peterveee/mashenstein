// Entity + hero drawing (logic-free; style packs may decorate).
import { getSprite, buildSprite, scaled2x, tinted, drawTextCentered } from '../engine/sprites.js';
import { pushOverlayDraw } from '../engine/renderer.js';
import { HERO_SPRITES } from '../sprites/heroes.js';
import { WORLD_SPRITES } from '../sprites/world.js';
import { drawToon, poseFromPlayer, toonFaceSprite } from '../sprites/toons.js';
import { hasProp, propSprite, propTinted, propRimPair, glowSprite, sparkSprite, drawProp } from '../sprites/props.js';

const POWER_GLOW = { capShield: 'rgba(72,168,240,0.5)', capMagnet: 'rgba(224,72,72,0.45)', capStar: 'rgba(246,211,60,0.5)', capSlow: 'rgba(200,184,232,0.5)' };
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

// Glass orb around the hero while a shield is banked — one ring per stack.
function drawShieldOrb(c, cx, feetY, h, t, stack) {
  const wob = 1 + 0.035 * Math.sin(t * 5);
  const rx = h * 0.55 * wob, ry = h * 0.6 / wob;
  const cy = feetY - h * 0.5;
  c.save();
  c.beginPath();
  c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  c.fillStyle = 'rgba(120,200,255,0.09)';
  c.fill();
  for (let i = 0; i < stack; i++) {
    c.beginPath();
    c.ellipse(cx, cy, rx - i * 2.2, ry - i * 2.2, 0, 0, Math.PI * 2);
    c.strokeStyle = `rgba(168,230,255,${(0.34 - i * 0.09) + 0.09 * Math.sin(t * 5)})`;
    c.lineWidth = Math.max(0.6, h * 0.032);
    c.stroke();
  }
  // glass highlight + a travelling glint — barely-there, like real glass
  c.beginPath();
  c.ellipse(cx - rx * 0.4, cy - ry * 0.42, rx * 0.26, ry * 0.14, -0.7, 0, Math.PI * 2);
  c.fillStyle = 'rgba(255,255,255,0.22)';
  c.fill();
  c.beginPath();
  c.arc(cx, cy, rx * 0.86, t * 2.2, t * 2.2 + 0.5);
  c.strokeStyle = 'rgba(255,255,255,0.22)';
  c.lineWidth = Math.max(0.5, h * 0.025);
  c.stroke();
  c.restore();
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
  const feetY = Math.round((opts.groundY ?? GROUND_Y) - player.y); // feet follow rolling terrain
  const ghosts = player.dashT > 0;
  const shield = opts.shield || 0;
  const paint = (c) => {
    if (ghosts) {
      drawToon(c, heroId, pose, cx - 7, feetY, HERO_DRAW_H, { alpha: 0.35 });
      drawToon(c, heroId, pose, cx - 13, feetY, HERO_DRAW_H, { alpha: 0.35 });
    }
    drawToon(c, heroId, pose, cx, feetY, HERO_DRAW_H);
    if (shield > 0) drawShieldOrb(c, cx, feetY, HERO_DRAW_H, t, shield);
  };
  if (opts.flat || opts.mirror) paint(ctx);
  else pushOverlayDraw(paint);
  if (carryingFuse) drawProp(ctx, 'fuse', cx + 6, feetY - HERO_DRAW_H - 2, 8, 6);
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
    drawProp(ctx, 'beatBar', x, Math.round(GROUND_Y - e.h), e.w, e.h);
    return;
  }
  if (e.def && e.def.paper) {
    const py = y + Math.round(Math.sin(t * 8 + e.bobPhase) * 3);
    drawProp(ctx, 'paperwork', x - 1, py - 1, 10, 8);
    return;
  }
  // Coins spin like coins and some of them twinkle: the width oscillates as
  // if rotating on its vertical axis, with a white glint as it catches the
  // light (the WebGL bloom pass makes the glint genuinely gleam).
  if (e.kind === 'pickup' && e.type === 'coin') {
    const spr2 = propSprite('coin', 8, 8);
    const phase = e.bobPhase || 0;
    const spin = Math.cos(t * 3.4 + phase * 5);
    const cw = e.w * (0.25 + 0.75 * Math.abs(spin));
    const ccx = x + e.w / 2;
    ctx.imageSmoothingEnabled = true;
    const halo = glowSprite('rgba(246,211,60,0.4)', 8);
    ctx.drawImage(halo, ccx - 7, y + e.h / 2 - 7, 14, 14);
    if (spr2) ctx.drawImage(spr2, ccx - cw / 2, y, cw, e.h);
    const sparkly = (Math.floor(phase * 100) % 3) === 0; // only some coins
    if (sparkly && Math.abs(spin) > 0.84) {
      const sa = (Math.abs(spin) - 0.84) / 0.16;
      const sp = sparkSprite('#ffffff');
      const sr = 4 + sa * 4;
      ctx.globalAlpha = sa;
      ctx.drawImage(sp, ccx + 2 - sr / 2, y + 1 - sr / 2, sr, sr);
      ctx.globalAlpha = 1;
    }
    ctx.imageSmoothingEnabled = false;
    return;
  }
  const sprName = e.def ? e.def.sprite : null;
  // Vector art first, keyed by entity TYPE so ?-crates, targets, pipes and
  // switches get their own look instead of borrowing another prop's sprite.
  const propName = hasProp(e.type) ? e.type : (hasProp(sprName) ? sprName : null);
  const spr = propName ? null : (sprName ? getSprite(sprName) : null);
  if (!propName && !spr) { ctx.fillStyle = '#f0f'; ctx.fillRect(x, y, e.w, e.h); return; }

  // Hazards render ~1.33x bigger than their (unchanged) hitboxes — generous,
  // never unfair — ringed by a dark inner outline plus a pulsing light outer
  // one so they pop against both light and dark terrain. Things you WANT
  // (targets/pads/switches) stay clean.
  const danger = e.kind === 'obstacle' && !e.def.isTarget && !e.def.isBoost && !e.def.isSwitch;
  const bw = propName ? e.def.w : spr.width;
  const bh = propName ? e.def.h : spr.height;
  const src = propName ? null : (danger ? (scaled2x(sprName) || spr) : spr);
  const rimDark = danger ? (propName ? null : tinted(sprName, '#101018')) : null;
  const rimLite = danger ? (propName ? null : tinted(sprName, '#f0f0f8')) : null;
  const prevSmooth = ctx.imageSmoothingEnabled;
  // plain: natural size (stacked crates / pipes tile edge-to-edge);
  // anchor 'center' for rotating rollers, 'bottom' otherwise.
  const draw1 = (dx, dy, anchor = 'bottom', natural = false, sw = bw, sh = bh) => {
    const w0 = natural ? sw : Math.round(sw * 4 / 3);
    const h0 = natural ? sh : Math.round(sh * 4 / 3);
    const ox = dx - Math.floor((w0 - sw) / 2);
    const oy = anchor === 'center' ? dy - Math.floor((h0 - sh) / 2) : dy - (h0 - sh);
    ctx.imageSmoothingEnabled = true;
    if (danger && propName) {
      // precomposed rim rings: one draw per color instead of two
      const rl = propRimPair(propName, sw, sh, '#f0f0f8', 'x');
      const rd = propRimPair(propName, sw, sh, '#101018', 'y');
      ctx.globalAlpha = 0.12 + 0.08 * Math.sin(t * 5 + e.bobPhase);
      if (rl) ctx.drawImage(rl, ox - 1, oy - 1, w0 + 2, h0 + 2);
      ctx.globalAlpha = 0.22;
      if (rd) ctx.drawImage(rd, ox - 1, oy - 1, w0 + 2, h0 + 2);
      ctx.globalAlpha = 1;
    } else if (danger) {
      ctx.globalAlpha = 0.12 + 0.08 * Math.sin(t * 5 + e.bobPhase);
      ctx.drawImage(rimLite, ox - 1, oy, w0, h0); ctx.drawImage(rimLite, ox + 1, oy, w0, h0);
      ctx.globalAlpha = 0.22;
      ctx.drawImage(rimDark, ox, oy - 1, w0, h0); ctx.drawImage(rimDark, ox, oy + 1, w0, h0);
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(propName ? propSprite(propName, sw, sh) : (natural ? spr : src), ox, oy, w0, h0);
    ctx.imageSmoothingEnabled = prevSmooth;
  };
  if (danger) {
    // anchors flyers to the lane and marks where falling hazards land
    ctx.fillStyle = 'rgba(8,8,16,0.4)';
    ctx.fillRect(x, GROUND_Y - 2, e.w, 2);
  }
  if (e.kind === 'pickup' && e.def.power && POWER_GLOW[e.type]) {
    // pulsing halo so power capsules read as prizes from across the screen
    const glow = glowSprite(POWER_GLOW[e.type], 10);
    const gr = 11 + Math.sin(t * 4 + e.bobPhase) * 2;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(glow, x + e.w / 2 - gr, y + e.h / 2 - gr, gr * 2, gr * 2);
    ctx.imageSmoothingEnabled = false;
  }

  if (e.def.stack && e.n > 1) {
    for (let i = 0; i < e.n; i++) draw1(x, Math.round(GROUND_Y - (i + 1) * 11), 'bottom', true, bw, 11);
  } else if (e.def.tall) {
    // one tall piece of art rather than two stacked tiles
    if (propName) draw1(x, Math.round(GROUND_Y), 'bottom', true, bw, 18);
    else { draw1(x, Math.round(GROUND_Y - 11), 'bottom', true); draw1(x, Math.round(GROUND_Y - 18), 'bottom', true); }
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
  const pulse = Math.round(Math.sin(t * 5) * 2);
  drawProp(ctx, 'portal', x, GROUND_Y - 40 - pulse, 12, 40 + pulse);
  const face = toonFaceSprite(portal.hero, 12, 9);
  if (face) {
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(face, x, GROUND_Y - 56 - pulse, 12, 9);
    ctx.imageSmoothingEnabled = false;
  }
  ctx.fillStyle = '#48e0c8';
  ctx.fillRect(x + 4, GROUND_Y - 2, 4, 2);
  // who you are about to become, and what they do
  if (portal.label) drawTextCentered(ctx, portal.label, x + 6, GROUND_Y - 68 - pulse, '#c8e0ff');
}

export function drawCopter(ctx, copter, camX, t) {
  const x = Math.round(copter.x - camX);
  const y = Math.round(GROUND_Y - copter.alt - 16);
  drawProp(ctx, 'eggshell', x - 12, y - 8, 24, 20);
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
