// Entity + hero drawing (logic-free; style packs may decorate).
import { getSprite, buildSprite, scaled2x, tinted, drawTextCentered } from '../engine/sprites.js';
import { W, pushOverlayDraw } from '../engine/renderer.js';
import { ZOOM, applyWorld } from '../engine/camera.js';
import { HERO_SPRITES } from '../sprites/heroes.js';
import { WORLD_SPRITES } from '../sprites/world.js';
import { drawToon, poseFromPlayer, toonFaceSprite, toonEffectEllipse } from '../sprites/toons.js';
import { hasProp, propSprite, propTinted, propRimPair, propFrames, propTall, glowSprite, sparkSprite, drawProp } from '../sprites/props.js';

const POWER_GLOW = {
  capShield: 'rgba(72,168,240,0.5)', capMagnet: 'rgba(224,72,72,0.45)', capStar: 'rgba(246,211,60,0.5)',
  capAirJump: 'rgba(114,216,240,0.5)', capSpeed: 'rgba(248,144,72,0.5)', capLowGrav: 'rgba(184,136,240,0.5)',
};
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
function drawShieldOrb(c, heroId, cx, feetY, h, t, stack) {
  const fit = toonEffectEllipse(heroId);
  // The glass follows one measured envelope, not the current animation frame.
  // Motion belongs to the travelling highlight below; resizing the boundary
  // makes hands, ears and weapons appear to poke through on alternate beats.
  const rx = h * fit.rx, ry = h * fit.ry;
  const ox = h * fit.cx, cy = feetY + h * fit.cy;
  c.save();
  c.beginPath();
  c.ellipse(cx + ox, cy, rx, ry, 0, 0, Math.PI * 2);
  c.fillStyle = 'rgba(120,200,255,0.09)';
  c.fill();
  for (let i = 0; i < stack; i++) {
    c.beginPath();
    c.ellipse(cx + ox, cy, rx - i * 2.2, ry - i * 2.2, 0, 0, Math.PI * 2);
    c.strokeStyle = `rgba(168,230,255,${(0.34 - i * 0.09) + 0.09 * Math.sin(t * 5)})`;
    c.lineWidth = Math.max(0.6, h * 0.032);
    c.stroke();
  }
  // glass highlight + a travelling glint — barely-there, like real glass
  c.beginPath();
  c.ellipse(cx + ox - rx * 0.4, cy - ry * 0.42, rx * 0.26, ry * 0.14, -0.7, 0, Math.PI * 2);
  c.fillStyle = 'rgba(255,255,255,0.22)';
  c.fill();
  c.beginPath();
  c.arc(cx + ox, cy, rx * 0.86, t * 2.2, t * 2.2 + 0.5);
  c.strokeStyle = 'rgba(255,255,255,0.22)';
  c.lineWidth = Math.max(0.5, h * 0.025);
  c.stroke();
  c.restore();
}

// Star power: a hue-cycling aura behind the hero plus rainbow afterimages.
// `left` is the time remaining — under two seconds the whole thing strobes so
// you can hear AND see the clock running out.
function drawStarAura(c, cx, feetY, h, t, left, reduced) {
  const hue = (t * 420) % 360;
  const pulse = reduced ? 0.85 : 0.7 + 0.3 * Math.sin(t * 18);
  const fade = left < 2 ? (reduced ? 0.6 : 0.35 + 0.65 * (Math.floor(t * 10) % 2)) : 1;
  const cy = feetY - h * 0.5;
  c.save();
  c.globalCompositeOperation = 'lighter';
  const r = h * 0.95;
  const grad = c.createRadialGradient(cx, cy, h * 0.12, cx, cy, r);
  grad.addColorStop(0, `hsla(${hue},100%,72%,${0.5 * pulse * fade})`);
  grad.addColorStop(0.55, `hsla(${(hue + 60) % 360},100%,60%,${0.22 * pulse * fade})`);
  grad.addColorStop(1, 'hsla(0,0%,0%,0)');
  c.fillStyle = grad;
  c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
  // sparkle ring: four points chasing around the hero
  if (!reduced) {
    for (let i = 0; i < 4; i++) {
      const a = t * 3.4 + (i * Math.PI) / 2;
      const px = cx + Math.cos(a) * h * 0.5;
      const py = cy + Math.sin(a) * h * 0.42;
      const s = (1.1 + 0.5 * Math.sin(t * 12 + i)) * fade;
      c.fillStyle = `hsla(${(hue + i * 90) % 360},100%,80%,${0.9 * fade})`;
      c.beginPath();
      c.moveTo(px, py - s * 2); c.lineTo(px + s, py); c.lineTo(px, py + s * 2); c.lineTo(px - s, py);
      c.closePath(); c.fill();
    }
  }
  c.restore();
  return fade;
}

// The brief flourish overlaid on a hero the instant they use their ability —
// keyed off ability.type, not hero id, so it fires the same way no matter who
// is holding the baton. Not every type has one yet: dash/roll/fist/axe rely on
// the ability's own world-space effect (dash ghosts, the axe prop, etc.) to
// read as "something happened" and draw nothing here.
// scale lets a caller reuse the same tuned-for-24px-hero offsets at a bigger
// draw size (the gallery's toons are drawn far taller than the in-run sprite).
export function drawPowerPose(c, cx, feetY, type, alpha = 1, scale = 1) {
  c.save();
  c.translate(cx, feetY); c.scale(scale, scale);
  c.globalAlpha *= alpha; c.strokeStyle = '#f6d33c'; c.lineWidth = 1.5 / scale;
  if (type === 'stomp') {
    c.beginPath(); c.moveTo(1, -14); c.lineTo(14, -22); c.stroke();
    c.fillStyle = '#a8b0b8'; c.fillRect(11, -25, 7, 4);
  } else if (type === 'eat') {
    c.beginPath(); c.arc(10, -11, 9, -0.7, 0.7); c.stroke();
  } else if (type === 'compress') {
    c.strokeStyle = '#f8c0d8'; c.beginPath(); c.arc(0, -7, 11 + (1 - alpha) * 8, 0, Math.PI * 2); c.stroke();
  } else if (type === 'shoot') {
    c.strokeStyle = '#f6d33c'; c.beginPath(); c.moveTo(8, -11); c.lineTo(18, -11); c.stroke();
  }
  c.restore();
}

export function drawHeroSprite(ctx, player, heroId, t, camX, carryingFuse, opts = {}) {
  // Heroes are procedurally animated vector toons (sprites/toons.js).
  // During play they render ABOVE the low-res backbuffer at device resolution
  // (pushOverlayDraw) so curves stay smooth. The overlay callback recreates
  // scene transforms, and later overlay callbacks cover it for pause/death.
  // Star power outranks the i-frame blink: while it is up the hero is always
  // on screen (the aura, not a flicker, is what says "you can't be hurt").
  const starLeft = opts.invincible || 0;
  if (!starLeft && player.iframes > 0 && Math.floor(t * 14) % 2 === 0 && player.headless <= 0) return;
  const pose = poseFromPlayer(player, t);
  const cx = Math.round(opts.screenX ?? PLAYER_X) + 6; // center of the 12px slot
  const feetY = Math.round((opts.groundY ?? GROUND_Y) - player.y); // feet follow rolling terrain
  const ghosts = player.dashT > 0;
  const shield = opts.shield || 0;
  const reducedMotion = !!(opts.settings && opts.settings.reducedMotion);
  const paint = (c) => {
    let starFade = 1;
    if (starLeft > 0) starFade = drawStarAura(c, cx, feetY, HERO_DRAW_H, t, starLeft, reducedMotion);
    if (ghosts) {
      drawToon(c, heroId, pose, cx - 7, feetY, HERO_DRAW_H, { alpha: 0.35 });
      drawToon(c, heroId, pose, cx - 13, feetY, HERO_DRAW_H, { alpha: 0.35 });
    }
    // Afterimages: the hero smears like they are moving faster than they are.
    if (starLeft > 0 && !reducedMotion) {
      for (let i = 1; i <= 2; i++) {
        drawToon(c, heroId, pose, cx - i * 5, feetY, HERO_DRAW_H, { alpha: 0.2 * starFade / i });
      }
    }
    drawToon(c, heroId, pose, cx, feetY, HERO_DRAW_H);
    // ...and the hero themself burns brighter, in time with the aura pulse.
    if (starLeft > 0) {
      const pulse = reducedMotion ? 0.3 : 0.22 + 0.24 * Math.sin(t * 18);
      c.save();
      c.globalCompositeOperation = 'lighter';
      drawToon(c, heroId, pose, cx, feetY, HERO_DRAW_H, { alpha: pulse * starFade });
      c.restore();
    }
    if (shield > 0) drawShieldOrb(c, heroId, cx, feetY, HERO_DRAW_H, t, shield);
    if (player.deflectFlashT > 0) {
      c.strokeStyle = `rgba(168,230,255,${Math.min(1, player.deflectFlashT * 4)})`;
      c.lineWidth = 2; c.beginPath(); c.arc(cx + 4, feetY - 12, 14, -1.2, 1.2); c.stroke(); c.lineWidth = 1;
    }
    if (player.powerPoseT > 0) {
      const reduced = opts.settings && opts.settings.reducedMotion;
      drawPowerPose(c, cx, feetY, player.powerType, reduced ? 0.8 : Math.min(1, player.powerPoseT * 5));
    }
  };
  if (opts.flat) paint(ctx);
  else {
    // The overlay is a SEPARATE canvas with its own context, so it never sees
    // the camera the caller set up — the hero has to carry it across.
    const z = opts.zoom ?? ZOOM;
    const pan = opts.pan ?? 0;
    pushOverlayDraw((c) => {
      c.save();
      // Mirror belongs to the scene, not to the toon. The backbuffer receives
      // this transform in RunState.draw(); the full-resolution overlay has its
      // own context and must recreate it before applying the same world camera.
      if (opts.mirror) { c.translate(W, 0); c.scale(-1, 1); }
      applyWorld(c, z, pan);
      paint(c);
      c.restore();
    });
  }
  if (carryingFuse) drawProp(ctx, 'fuse', cx + 6, feetY - HERO_DRAW_H - 2, 8, 6);
}

export function drawWorldEntity(ctx, e, camX, t, style, settings = {}) {
  const x = Math.round(e.x - camX);
  if (x < -40 || x > 520) return;
  const bottom = GROUND_Y - e.alt;
  let y = Math.round(bottom - e.h);
  if (e.def && (e.def.bob || (e.def && e.def.power))) y += Math.round(Math.sin(t * 3 + e.bobPhase) * 2);
  if (e.kind === 'pickup' && e.def.power) y += Math.round(Math.sin(t * 3 + e.bobPhase) * 2);

  if (e.def && e.def.isGap) return; // drawn by ground renderer
  if (e.kind === 'obstacle' && e.def.ground) {
    ctx.fillStyle = 'rgba(8,6,12,0.28)';
    ctx.beginPath(); ctx.ellipse(x + e.w / 2, GROUND_Y - 1, Math.max(4, e.w * 0.55), 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = settings.highContrast ? 'rgba(224,72,72,0.85)' : 'rgba(224,72,72,0.32)';
    ctx.fillRect(x, GROUND_Y - 1, e.w, 1);
  }
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
  // Animated props cycle cached frames. bobPhase offsets each instance so a row
  // of fires licks independently instead of flickering in lockstep; reduced
  // motion holds frame 0. ~11fps is fast enough to read as fire and slow enough
  // to stay a flicker rather than a strobe.
  const frameCount = propName ? propFrames(propName) : 1;
  const frame = frameCount > 1 && !settings.reducedMotion
    ? Math.floor(t * 11 + e.bobPhase * 4) % frameCount
    : 0;
  const rimDark = danger ? (propName ? null : tinted(sprName, '#101018')) : null;
  const rimLite = danger ? (propName ? null : tinted(sprName, '#f0f0f8')) : null;
  const prevSmooth = ctx.imageSmoothingEnabled;
  // plain: natural size (stacked crates / pipes tile edge-to-edge);
  // anchor 'center' for rotating rollers, 'bottom' otherwise.
  const draw1 = (dx, dy, anchor = 'bottom', natural = false, sw = bw, sh = bh) => {
    // propTall stretches the ART above the def box (bottom-anchored), leaving
    // the hitbox alone — the rasters are painted at the stretched height so
    // nothing is distorted, just drawn with more stature.
    const tall = propName ? propTall(propName) : 1;
    const shT = sh * tall;
    const w0 = natural ? sw : Math.round(sw * 4 / 3);
    const h0 = natural ? sh : Math.round(sh * 4 / 3 * tall);
    const ox = dx - Math.floor((w0 - sw) / 2);
    const oy = anchor === 'center' ? dy - Math.floor((h0 - sh) / 2) : dy - (h0 - sh);
    ctx.imageSmoothingEnabled = true;
    if (danger && propName) {
      // precomposed rim rings: one draw per color instead of two
      const rl = propRimPair(propName, sw, shT, '#f0f0f8', 'x', frame);
      const rd = propRimPair(propName, sw, shT, '#101018', 'y', frame);
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
    ctx.drawImage(propName ? propSprite(propName, sw, shT, frame) : (natural ? spr : src), ox, oy, w0, h0);
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
    // Each box gets the same 4/3 inflation a lone crate does, so a stack reads
    // as two of the SAME crate, and they're stepped by that DRAWN height so
    // they sit edge-to-edge instead of overlapping. The art then stands taller
    // than the n*11 hitbox — the same direction of slack a lone crate already
    // has, i.e. erring toward letting the player through.
    // dy is the nominal 11px box top; the inflated art hangs 4px above it and
    // ends at dy + 11, so stepping dy by the drawn height stacks bottom-to-top.
    const step = Math.round(11 * 4 / 3);
    for (let i = 0; i < e.n; i++) draw1(x, Math.round(GROUND_Y - 11 - i * step), 'bottom', false, bw, 11);
  } else if (e.def.tall) {
    // one tall piece of art rather than two stacked tiles
    if (propName) draw1(x, Math.round(GROUND_Y), 'bottom', true, bw, 18);
    else { draw1(x, Math.round(GROUND_Y - 11), 'bottom', true); draw1(x, Math.round(GROUND_Y - 18), 'bottom', true); }
  } else if (e.def.falls && !e.fell) {
    // telegraph: hang from "ceiling" with a warning shimmer
    draw1(x, Math.round(GROUND_Y - e.alt - e.h));
    if (Math.floor(t * 8) % 2 === 0) { ctx.fillStyle = 'rgba(246,211,60,0.6)'; ctx.fillRect(x + 2, GROUND_Y - 3, 4, 3); }
  } else if (e.def.shamble && !settings.reducedMotion) {
    // Shuffling gait: weight rocks side to side, the torso lists after it, and
    // the body lifts on each step. Pivot is the feet so they stay planted.
    // Art only — the hitbox never leaves e.x.
    const ph = (e.gait ?? e.bobPhase);
    ctx.save();
    ctx.translate(x + bw / 2 + Math.sin(ph) * 1.5, y + bh - Math.abs(Math.cos(ph)) * 1.5);
    ctx.rotate(Math.sin(ph) * 0.09);
    draw1(-bw / 2, -bh);
    ctx.restore();
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

export function drawPortal(ctx, portal, camX, t, zoom = ZOOM) {
  const x = Math.round(portal.x - camX);
  const pulse = Math.round(Math.sin(t * 5) * 2);
  drawProp(ctx, 'portal', x, GROUND_Y - 40 - pulse, 12, 40 + pulse);
  ctx.fillStyle = '#48e0c8';
  ctx.fillRect(x + 4, GROUND_Y - 2, 4, 2);
  // Who you are about to become, and what they do. Signage, not scenery: hung
  // off the top of the arch and then drawn unscaled, so both the type size and
  // the gap above the arch stay as authored instead of being magnified with the
  // world — magnified, the callout alone was wider than the frame.
  ctx.save();
  ctx.translate(x + 6, GROUND_Y - 40 - pulse);
  ctx.scale(1 / zoom, 1 / zoom);
  const face = toonFaceSprite(portal.hero, 12, 9);
  if (face) {
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(face, -6, -16, 12, 9);
    ctx.imageSmoothingEnabled = false;
  }
  if (portal.label) drawTextCentered(ctx, portal.label, 0, -28, '#9db8d2');
  ctx.restore();
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
