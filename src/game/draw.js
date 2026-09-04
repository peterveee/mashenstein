// Entity + hero drawing (logic-free; style packs may decorate).
import { getSprite, buildSprite, scaled2x, tinted } from '../engine/sprites.js';
import { W, pushOverlayDraw } from '../engine/renderer.js';
import { ZOOM, applyWorld } from '../engine/camera.js';
import { HERO_SPRITES } from '../sprites/heroes.js';
import { WORLD_SPRITES } from '../sprites/world.js';
import { drawToon, poseFromPlayer, toonFaceSprite, toonEffectEllipse } from '../sprites/toons.js';
import { LOOP } from './loop.js';
import {
  eggshellCopterArt,
  hasProp, propSprite, propTinted, propRimPair, propFrames, propFps, propTall,
  propVisualScale, propHazardRim, propBoxCentred, glowSprite, sparkSprite, drawProp,
  BATTERY_FOCUS,
  PORTAL_SPRITE, PORTAL_ART_W, PORTAL_ART_H,
  PORTAL_SPENT_SPRITE, PORTAL_WILT_SPRITE,
  PORTAL_SPEND_FRAMES, PORTAL_SPEND_TIME, PORTAL_WILT_FRAMES, PORTAL_WILT_TIME,
} from '../sprites/props.js';

const POWER_GLOW = {
  capShield: 'rgba(72,168,240,0.5)', capMagnet: 'rgba(224,72,72,0.45)', capStar: 'rgba(246,211,60,0.5)',
  capAirJump: 'rgba(114,216,240,0.5)', capSpeed: 'rgba(248,144,72,0.5)', capLowGrav: 'rgba(184,136,240,0.5)',
};
// The battery's halo. Not an entry in POWER_GLOW because that table is keyed by
// capsule type and gated on def.power, and the battery is a heal. Green rather
// than the panel's #74c947 so it separates from the HUD cells it refills instead
// of reading as a stray one loose on the field.
const HEAL_GLOW = 'rgba(96,232,104,0.45)';
import { drawBoostFx } from './boostFx.js';
import { GROUND_Y } from '../engine/camera.js';
import { PLAYER_X, SLIP_T } from './player.js';

export const HERO_DRAW_W = 18;
export const HERO_DRAW_H = 24;
// A hero's screen x is the LEFT EDGE of his 12px collision slot; his drawing is
// centred half a slot further on. Anything lining the hero up with a fixed
// point in the world has to add this or it aims the wrong part of him at it —
// the finish snap did exactly that and parked him six pixels right of the
// plunger he was supposed to be standing in the middle of.
export const HERO_CENTER_OFF = 6;
// How long an incoming hero burns in for after a tag. Sits just inside the
// portal's own discharge (PORTAL_SPEND_TIME) on purpose: the hero should have
// finished arriving while the column is still visibly collapsing, so the two
// read as one event with the doorway outlasting the person who came through it.
export const TAG_FLASH_TIME = 0.16;

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

// The special belongs beside the hero rather than only in the HUD: each hero's
// result differs, but every hero shares one cooldown. Its colour steps through
// the charge so a quick peripheral glance says both "not yet" and "nearly".
export function specialMoveColor(fill, ready) {
  if (ready) return '#e874d6';
  if (fill >= 0.85) return '#b979df';
  if (fill >= 0.5) return '#72cb62';
  if (fill >= 0.18) return '#48d5c3';
  return '#4ca6c7';
}

// Crown height varies with ears, hats, and the heavy rig. The orb centres on
// that crown line so it reads as a companion beside the head, not a torso HUD.
const SPECIAL_FOLLOWER_CROWN = {
  lorenzo: 0.99, gnash: 1.08, fernwick: 1.05, b33p: 0.93,
  mochi: 0.84, chompo: 0.86, raymn: 0.9, grumpos: 1.18,
  // Just above Fernwick's: same slim build, but the buns sit on top of the skull
  // and the orb has to clear them.
  kiko: 1.06,
};

function drawSpecialMoveFollower(c, heroId, cx, feetY, h, t, cooldown, cooldownMax, reducedMotion, alpha = 1) {
  const ready = cooldown <= 0;
  const fill = ready ? 1 : Math.max(0, Math.min(1, 1 - cooldown / cooldownMax));
  const r = h * 0.09;
  const x = cx - h * 0.72;
  const crown = SPECIAL_FOLLOWER_CROWN[heroId] || 0.99;
  const y = feetY - h * crown + (reducedMotion ? 0 : Math.sin(t * 4.5) * h * 0.025);
  const energy = specialMoveColor(fill, ready);

  c.save();
  // `alpha` scales every pass, so a caller can FADE the orb rather than only
  // hide it. The internal alphas are absolute assignments, which is why this
  // multiplies inside the function instead of wrapping the call site — a
  // wrapped globalAlpha would be clobbered by the pulse ring's own `= 0.3`.
  c.globalAlpha = alpha;
  if (ready && !reducedMotion) {
    const pulse = 1 + 0.11 * (0.5 + 0.5 * Math.sin(t * 5.5));
    c.globalAlpha = 0.3 * alpha;
    c.strokeStyle = energy;
    c.lineWidth = Math.max(0.75, h * 0.055);
    c.beginPath();
    c.arc(x, y, (r + h * 0.065) * pulse, 0, Math.PI * 2);
    c.stroke();
    c.globalAlpha = alpha;
  }

  // A dark shell keeps an empty orb visible on every world palette.
  c.fillStyle = '#111722';
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
  if (fill > 0) {
    c.save();
    c.beginPath();
    c.arc(x, y, r - h * 0.04, 0, Math.PI * 2);
    c.clip();
    const level = y + r - r * 2 * fill;
    c.fillStyle = energy;
    c.fillRect(x - r, level, r * 2, r * 2);
    if (fill < 1) {
      c.fillStyle = '#d7fff6';
      c.fillRect(x - r, level, r * 2, Math.max(0.5, h * 0.035));
    }
    c.restore();
  }
  c.strokeStyle = ready ? energy : '#596273';
  c.lineWidth = Math.max(0.75, h * (ready ? 0.075 : 0.055));
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
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
    // The wrench now belongs to Lorenzo's hand and swing in drawHumanoid.
    // Leave impact feedback to the broken obstacle, shake and CLANG floatie;
    // a detached streak here was the yellow line that obscured the action.
  } else if (type === 'eat') {
    c.beginPath(); c.arc(10, -11, 9, -0.7, 0.7); c.stroke();
  } else if (type === 'compress') {
    c.strokeStyle = '#f8c0d8'; c.beginPath(); c.arc(0, -7, 11 + (1 - alpha) * 8, 0, Math.PI * 2); c.stroke();
  } else if (type === 'shoot') {
    // B-33P's flash is drawn from the articulated cannon's computed muzzle.
    // A fixed streak here detached whenever the arm changed pose.
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
  // opts.pose patches the derived pose. The controller only ever reports run /
  // jump / duck, because those are the only things a hero does while a stage is
  // moving — a scene that has STOPPED the world (training's epilogue) has to be
  // able to say "stand there and wave", or the hero holds whatever stride frame
  // the treadmill died on.
  const pose = opts.pose ? { ...poseFromPlayer(player, t), ...opts.pose } : poseFromPlayer(player, t);
  const cx = Math.round(opts.screenX ?? PLAYER_X) + HERO_CENTER_OFF; // center of the 12px slot
  const feetY = Math.round((opts.groundY ?? GROUND_Y) - player.y); // feet follow rolling terrain
  const ghosts = player.dashT > 0;
  const shield = opts.shield || 0;
  const reducedMotion = !!(opts.settings && opts.settings.reducedMotion);
  // THE PRATFALL, and why it lives here rather than in a pose.
  //
  // Every hero in this game is a different rig — humanoid, ray, blob, pika,
  // disc — and a "feet fly out" pose would have to be authored five times and
  // then judged five times. A rotation of the whole figure about his heels is
  // rig-independent by construction: whatever the toon is, it goes over
  // backwards, and the run cycle carrying on underneath is exactly the picture
  // of legs still going while the rest of him is no longer above them.
  //
  // Rotated about the FEET, not the middle: a pivot at the waist swings the
  // boots up through the floor, and the floor is the one thing in the shot the
  // player is using to read where he is.
  //
  // The curve is a single arc out and back — sin over the whole clock — so he
  // is upright again on the frame control returns. A tumble that was still
  // unwinding after the stumble cleared read as lag rather than as a fall.
  const slipQ = SLIP_T > 0 ? Math.max(0, Math.min(1, (player.slipT || 0) / SLIP_T)) : 0;
  // Backwards, and not all the way over: at a full quarter turn he is lying on
  // the floor and the whole silhouette stops reading as the hero. This is the
  // moment his heels went out, held long enough to be seen.
  // Reduced motion keeps a lean rather than losing the beat entirely — the
  // damage flash and the floatie are still saying what happened, and a hero
  // who does not react at all to a hazard named after falling over is worse
  // than a small one.
  const slipAngle = slipQ > 0
    ? Math.sin(slipQ * Math.PI) * (reducedMotion ? 0.16 : 0.62)
    : 0;
  const paintFigure = (c) => {
    let starFade = 1;
    // A boost variant paints the hero itself (ordering is the whole point of
    // the effect), so the ordinary draw below stands down when one is running.
    let boostPainted = false;
    if (starLeft > 0) starFade = drawStarAura(c, cx, feetY, HERO_DRAW_H, t, starLeft, reducedMotion);
    if (ghosts) {
      drawToon(c, heroId, pose, cx - 7, feetY, HERO_DRAW_H, { alpha: 0.35 });
      drawToon(c, heroId, pose, cx - 13, feetY, HERO_DRAW_H, { alpha: 0.35 });
    }
    // Boost pad kick — whichever treatment game/boostFx.js currently ships.
    // The hero is painted BY the variant, because the difference between an
    // afterimage and a foreground streak is entirely what order they land in.
    if (player.boostT > 0 && !reducedMotion) {
      boostPainted = true;
      drawBoostFx(c, {
        x: cx, groundY: feetY, t, q: Math.min(1, player.boostT / 0.5), w: W, h: 270,
        groundDelta: opts.groundDelta || (() => 0),
        drawHero: () => drawToon(c, heroId, pose, cx, feetY, HERO_DRAW_H),
        drawHeroAt: (gx, gy, alpha) => drawToon(c, heroId, pose, gx, gy, HERO_DRAW_H, { alpha }),
      });
    }
    // Afterimages: the hero smears like they are moving faster than they are.
    if (starLeft > 0 && !reducedMotion) {
      for (let i = 1; i <= 2; i++) {
        drawToon(c, heroId, pose, cx - i * 5, feetY, HERO_DRAW_H, { alpha: 0.2 * starFade / i });
      }
    }
    if (!boostPainted) drawToon(c, heroId, pose, cx, feetY, HERO_DRAW_H);
    // opts.specialOrb false hides the readiness orb. A run always wants it —
    // every hero there has a power and the orb is how you know it is back — but
    // a scene that has not handed the player a power yet is showing a meter for
    // a control they do not have, which is a question rather than a readout.
    // opts.specialOrbAlpha (0..1) fades it instead: the finish uses this to
    // dissolve the orb at the flag, where the readout's question — "can I
    // attack yet?" — has stopped existing.
    const cooldownMax = player.hero?.ability?.cooldown || 1;
    const orbAlpha = opts.specialOrbAlpha == null ? 1 : Math.max(0, Math.min(1, opts.specialOrbAlpha));
    if (opts.specialOrb !== false && orbAlpha > 0) {
      drawSpecialMoveFollower(c, heroId, cx, feetY, HERO_DRAW_H, t, player.abilityCd,
        cooldownMax, reducedMotion, orbAlpha);
    }
    // ...and the hero themself burns brighter, in time with the aura pulse.
    if (starLeft > 0) {
      const pulse = reducedMotion ? 0.3 : 0.22 + 0.24 * Math.sin(t * 18);
      c.save();
      c.globalCompositeOperation = 'lighter';
      drawToon(c, heroId, pose, cx, feetY, HERO_DRAW_H, { alpha: pulse * starFade });
      c.restore();
    }
    // ARRIVAL. The relay swaps the hero on the frame they touch the portal, so
    // before this the new one simply appeared, fully lit, standing in front of
    // a portal that was still discharging — two things happening at once that
    // did not look like one thing. This burns them in over the same beat the
    // column blows out on: an additive pass of the hero over themself, brightest
    // on the contact frame and gone a sixth of a second later. Same treatment
    // star power uses to make the hero glow, and for the same reason — it is the
    // hero's own silhouette, so nothing about the pose or the read changes.
    if (player.tagFlashT > 0) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      // Squared falloff, and a peak short of white. At a linear 0.85 the hero
      // was a white cut-out for the first two frames — which announces the
      // arrival and then hides WHO arrived, and who arrived is the entire point
      // of a tag. This keeps the palette and the yellow arm readable through
      // the brightest frame and is gone twice as fast on the way out.
      const q = Math.min(1, player.tagFlashT / TAG_FLASH_TIME);
      drawToon(c, heroId, pose, cx, feetY, HERO_DRAW_H,
        { alpha: q * q * (reducedMotion ? 0.3 : 0.62) });
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
  // No slip, no transform at all: the ordinary frame pays nothing for this.
  const paint = slipAngle === 0 ? paintFigure : (c) => {
    c.save();
    c.translate(cx, feetY);
    c.rotate(-slipAngle);
    c.translate(-cx, -feetY);
    paintFigure(c);
    c.restore();
  };
  if (opts.flat) paint(ctx);
  else {
    // The overlay is a SEPARATE canvas with its own context, so it never sees
    // the camera the caller set up — the hero has to carry it across.
    const z = opts.zoom ?? ZOOM;
    const pan = opts.pan ?? 0;
    const paintOverlay = (c) => {
      c.save();
      // Mirror belongs to the scene, not to the toon. The backbuffer receives
      // this transform in RunState.draw(); the full-resolution overlay has its
      // own context and must recreate it before applying the same world camera.
      if (opts.mirror) { c.translate(W, 0); c.scale(-1, 1); }
      applyWorld(c, z, pan, opts.floorY ?? GROUND_Y);
      paint(c);
      c.restore();
    };
    // WHERE IN THE OVERLAY QUEUE HE LANDS is the caller's business, not the
    // sprite's. The queue is ordered, so the only way to put the hero over the
    // popup cards is to enqueue him after they are enqueued — and only the run
    // knows when that is wanted (see the jump lift in RunState.draw). Default
    // stays exactly as it was: straight into the queue, under the whole overlay.
    (opts.queueOverlay || pushOverlayDraw)(paintOverlay);
  }
  if (carryingFuse) drawProp(ctx, 'fuse', cx + 6, feetY - HERO_DRAW_H - 2, 8, 6);
}

// How far a `bedded` plate's ART sinks below the ground line (the box never
// moves) — and the sunk part is CLIPPED away at the line (see the bedded
// branch below draw1), which is what makes the sink a burial: entities draw
// after the ground, so an unclipped plate just paints its bottom on top of
// the road band and reads as overlapping the road, not set into it.
//
// 4 was picked off a 2/4/6 sweep. At 4 the whole plate face, chevron stripe
// included, is under the road: the saw is a half-buried blade, the spikes are
// teeth rising from a low base — the same grammar as the boost pad's trench.
// At 2 the plate is still a slab wearing a stripe; at 6 the teeth float free
// of any base. The danger read the stripe carried moves to the teeth, the
// shared rim pulse and the red ground tick.
//
// Berms and dirt mounds were tried here and rejected: anything drawn around
// the plate against the backdrop reads as a pit or as foliage, not as the
// lane closing over it.
const BED_SINK = 4;

export function drawWorldEntity(ctx, e, camX, t, style, settings = {}) {
  const smoothMotion = !!(style && style.smoothMotion) || !!(settings && settings.smoothMotion);
  const x = smoothMotion ? e.x - camX : Math.round(e.x - camX);
  // The loop pad's ring stands a radius clear of its box on both sides, so it is
  // still putting ink on screen long after the pad itself has left. Everything
  // else draws inside a few px of its own box.
  const reach = e.def && e.def.isLoop ? LOOP.r + 8 : 40;
  if (x < -reach || x > 480 + reach) return;
  const bottom = GROUND_Y - e.alt;
  // `artLift` raises the DRAWING without touching the box, for the case where a
  // hazard's legal altitude and its readable altitude are not the same number.
  // A flier's box has to stay low enough to catch a hero who does not duck, and
  // the hero's crouched ART is taller than his crouched box — so at the highest
  // legal altitude a clean duck can still look like it grazed the underside.
  //
  // Only ever positive, and only by a few pixels: this is art drawn ABOVE what
  // can hit you, so it errs toward "that should have missed me". It stays
  // believable because the standing hero's art is 24px against a box of 14 — far
  // taller than any lift here — so a hero who fails to duck still visibly runs
  // into the thing that hits him.
  let y = Math.round(bottom - e.h) - (e.artLift || 0);
  if (e.def && (e.def.bob || (e.def && e.def.power))) y += Math.round(Math.sin(t * 3 + e.bobPhase) * 2);
  if (e.kind === 'pickup' && e.def.power) y += Math.round(Math.sin(t * 3 + e.bobPhase) * 2);
  // The golden appliance gets a more pronounced hover so it reads as its own
  // thing — a deliberate prize, not scenery you run past.
  if (e.kind === 'pickup' && e.def.appliance) y += Math.round(Math.sin(t * 2.4 + e.bobPhase) * 3);

  if (e.def && e.def.isGap) return; // drawn by ground renderer
  // The boost pad opts out: it is a hole in the floor, and a hole casts no
  // contact shadow and takes no red danger tick. That ellipse under it was the
  // one mark left saying "object sitting on the ground".
  //
  // `bedded` props opt out of the ELLIPSE for the same reason and keep the tick,
  // which they still need — they are lethal, the pad is not. Their painters run
  // the plate past the bottom of the box for the ground line to cut, and the
  // art sinks BED_SINK into the road band (see draw1's call below), so the
  // ellipse would sit as a grey smear in front of a plate that is supposed to
  // be set into the road.
  if (e.kind === 'obstacle' && e.def.ground && !e.def.isBoost && !e.def.isLoop && !e.def.bedded) {
    if (e.def.splitFeet) {
      // An open hurdle has two contacts, not a plinth. A full-width shadow and
      // red road mark join its uprights into a false bottom rail.
      ctx.fillStyle = 'rgba(8,6,12,0.28)';
      for (const px of [x + 2, x + e.w - 2]) {
        ctx.beginPath(); ctx.ellipse(px, GROUND_Y - 1, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(224,72,72,0.32)';
      ctx.fillRect(x, GROUND_Y - 1, 4, 1);
      ctx.fillRect(x + e.w - 4, GROUND_Y - 1, 4, 1);
    } else {
      ctx.fillStyle = 'rgba(8,6,12,0.28)';
      ctx.beginPath(); ctx.ellipse(x + e.w / 2, GROUND_Y - 1, Math.max(4, e.w * 0.55), 2, 0, 0, Math.PI * 2); ctx.fill();
      // The red road mark says AVOID, and the card box is the one ground prop
      // in the lane that is neither a hazard nor optional scenery — it is a
      // thing to shoot. It keeps its contact shadow (it is standing on the
      // road) and gives up the warning, the same bargain the targets and pads
      // strike further down in `danger`.
      if (!e.def.beatShoot) {
        ctx.fillStyle = 'rgba(224,72,72,0.32)';
        ctx.fillRect(x, GROUND_Y - 1, e.w, 1);
      }
    }
  } else if (e.kind === 'obstacle' && e.def.bedded) {
    ctx.fillStyle = 'rgba(224,72,72,0.32)';
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
    // Render twice the logical pickup size and downsample in the scene. The
    // footprint stays 8x8, but the fine embossed rim survives the spin.
    const spr2 = propSprite('coin', 16, 16);
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
  // Vector art first, keyed by entity TYPE so !-crates, targets, pipes and
  // switches get their own look instead of borrowing another prop's sprite.
  // A per-instance skin overrides the type's own art (drones wear one of two
  // bodies). Everything else — hitbox, debris, behaviour — still keys on type.
  const propName = (e.skin && hasProp(e.skin)) ? e.skin
    : (hasProp(e.type) ? e.type : (hasProp(sprName) ? sprName : null));
  const spr = propName ? null : (sprName ? getSprite(sprName) : null);
  if (!propName && !spr) { ctx.fillStyle = '#f0f'; ctx.fillRect(x, y, e.w, e.h); return; }

  // Hazards render ~1.33x bigger than their (unchanged) hitboxes — generous,
  // never unfair — ringed by a dark inner outline plus a pulsing light outer
  // one so they pop against both light and dark terrain. Things you WANT
  // (targets/pads/switches) stay clean.
  const danger = e.kind === 'obstacle' && !e.def.isTarget && !e.def.isBoost && !e.def.isLoop && !e.def.isSwitch && !e.def.beatShoot;
  const bw = propName ? e.def.w : spr.width;
  const bh = propName ? e.def.h : spr.height;
  const src = propName ? null : (danger ? (scaled2x(sprName) || spr) : spr);
  // Animated props cycle cached frames. bobPhase offsets each instance so a row
  // of fires licks independently instead of flickering in lockstep; reduced
  // motion holds frame 0. ~11fps is fast enough to read as fire and slow enough
  // to stay a flicker rather than a strobe.
  const frameCount = propName ? propFrames(propName) : 1;
  // A boost pad chases faster the nearer the hero gets — up to 2.6x by the
  // time they are on it. It is the same eight frames either way, so the whole
  // reaction costs one multiply and no extra cache.
  const fps = propName ? propFps(propName) * (e.def && (e.def.isBoost || e.def.isLoop) ? 1 + 1.6 * (e.arm || 0) : 1) : 0;
  const frame = frameCount > 1 && !settings.reducedMotion
    ? Math.floor(t * fps + e.bobPhase * 4) % frameCount
    : 0;
  const rimDark = danger ? (propName ? null : tinted(sprName, '#101018')) : null;
  const rimLite = danger ? (propName ? null : tinted(sprName, '#f0f0f8')) : null;
  const prevSmooth = ctx.imageSmoothingEnabled;
  const healGlow = e.kind === 'pickup' && e.def.heal;
  // plain: natural size (stacked crates / pipes tile edge-to-edge);
  // anchor 'center' for rotating rollers, 'bottom' otherwise.
  const draw1 = (dx, dy, anchor = 'bottom', natural = false, sw = bw, sh = bh) => {
    // propTall stretches the ART above the def box (bottom-anchored), leaving
    // the hitbox alone — the rasters are painted at the stretched height so
    // nothing is distorted, just drawn with more stature.
    const tall = propName ? propTall(propName) : 1;
    const visualScale = propName ? propVisualScale(propName) : 1;
    const shT = sh * tall;
    const w0 = Math.round((natural ? sw : sw * 4 / 3) * visualScale);
    const h0 = Math.round((natural ? sh : sh * 4 / 3 * tall) * visualScale);
    const ox = dx - Math.floor((w0 - sw) / 2);
    const oy = anchor === 'center' ? dy - Math.floor((h0 - sh) / 2) : dy - (h0 - sh);
    ctx.imageSmoothingEnabled = true;
    if (healGlow) {
      // Drawn from in here rather than alongside the call so it reads the very
      // same ox/oy/w0/h0 the art does — a halo computed from the def box drifts
      // out of register the moment a scale or an anchor changes, which is
      // exactly how it ended up radiating from beside the battery. BATTERY_FOCUS
      // then moves it off the box centre and onto the cell itself.
      const gr = 11 + Math.sin(t * 7 + e.bobPhase) * 3;
      ctx.drawImage(glowSprite(HEAL_GLOW, 10),
        ox + BATTERY_FOCUS.x * w0 - gr, oy + BATTERY_FOCUS.y * h0 - gr, gr * 2, gr * 2);
    }
    if (danger && propName && propHazardRim(propName)) {
      // precomposed rim rings: one draw per color instead of two
      const rl = propRimPair(propName, sw, shT, '#f0f0f8', 'x', frame);
      const rd = propRimPair(propName, sw, shT, '#101018', 'y', frame);
      ctx.globalAlpha = 0.12 + 0.08 * Math.sin(t * 5 + e.bobPhase);
      if (rl) ctx.drawImage(rl, ox - 1, oy - 1, w0 + 2, h0 + 2);
      ctx.globalAlpha = 0.22;
      if (rd) ctx.drawImage(rd, ox - 1, oy - 1, w0 + 2, h0 + 2);
      ctx.globalAlpha = 1;
    } else if (danger && !propName) {
      ctx.globalAlpha = 0.12 + 0.08 * Math.sin(t * 5 + e.bobPhase);
      ctx.drawImage(rimLite, ox - 1, oy, w0, h0); ctx.drawImage(rimLite, ox + 1, oy, w0, h0);
      ctx.globalAlpha = 0.22;
      ctx.drawImage(rimDark, ox, oy - 1, w0, h0); ctx.drawImage(rimDark, ox, oy + 1, w0, h0);
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(propName ? propSprite(propName, sw, shT, frame) : (natural ? spr : src), ox, oy, w0, h0);
    ctx.imageSmoothingEnabled = prevSmooth;
  };
  if (danger && !e.def.splitFeet && !e.columnRung) {
    // anchors flyers to the lane and marks where falling hazards land
    //
    // ONE MARK PER COLUMN. A drone column is three entities sharing an X
    // (makeDroneColumn), and this bar is drawn per entity — three coats of the
    // same translucent smear stacked into a near-black bar under it, which read
    // as a hazard of its own. Rung 0 draws for the whole stack; a lone drone
    // has no `columnRung` at all and is unaffected.
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
  // The heal halo is drawn inside draw1 (see healGlow there), not here: it has to
  // sit on the art's own box to stay in register with it.

  if (e.def.stack && e.n > 1) {
    // Each box gets the same 4/3 inflation a lone crate does, so a stack reads
    // as two of the SAME crate. The painter leaves a fine inset around each
    // face, so overlapping the drawn boxes by 2px makes their visible edges
    // meet instead of leaving a background seam. The art then stands taller
    // than the n*11 hitbox — the same direction of slack a lone crate already
    // has, i.e. erring toward letting the player through.
    // dy is the nominal 11px box top; the inflated art hangs 4px above it and
    // ends at dy + 11, so the reduced step stacks bottom-to-top without a seam.
    const step = Math.round(11 * 4 / 3) - 2;
    for (let i = 0; i < e.n; i++) draw1(x, Math.round(GROUND_Y - 11 - i * step), 'bottom', false, bw, 11);
  } else if (e.def.tall) {
    // one tall piece of art rather than two stacked tiles
    //
    // `dy` is the TOP of the sh-tall box, not its bottom — draw1 seats the art
    // so that its base lands at `dy + sh` (see the oy it computes for a bottom
    // anchor). The stack branch above has always passed `GROUND_Y - 11` for its
    // 11px tiles; this one passed a bare GROUND_Y for an 18px box, which put
    // every pipe in the game exactly its own height underground. Only its cap
    // was ever above the floor, which is why it read as a stub rather than as
    // a pipe, and why it looked "sunk" the moment tunnels started spawning them.
    const artH = e.def.artH || 18;
    if (propName) draw1(x, Math.round(GROUND_Y - artH), 'bottom', true, bw, artH);
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
    // ARRIVING OUT OF THE BACKDROP. On RHYTHM BANKRUPTCY's finale a lane barrel
    // is one the gorilla just dropped down his chute, so for the couple of beats
    // between the foot of that chute and the road it is drawn coming forward —
    // lifted to the chute's own street level and scaled toward it. ART ONLY, as
    // the shambler's lurch above is: the box never leaves the road, and both
    // numbers are home a whole beat before anything can touch it (run.js
    // updateBarrelArrivals). Absent on every other barrel in the game, which is
    // what the fallbacks are for.
    const scale = e.artScale || 1;
    ctx.translate(x + e.w / 2, y + e.h / 2 - (e.artRise || 0));
    if (scale !== 1) ctx.scale(scale, scale);
    // A barrel has been rolling since the level loaded, so it takes its angle
    // from the world clock and every barrel on screen spins in step — which is
    // fine, because they all started the same way.
    //
    // A punted prop did not. It began tumbling on one exact frame, and reading
    // the shared clock would snap it to whatever phase that clock happened to
    // be at — a cone that jumps a third of a turn on the frame it is kicked.
    // `e.spin` is its own angle, carried by whatever launched it.
    ctx.rotate(e.spin != null ? -e.spin : -t * 6);
    draw1(-bw / 2, -bh / 2, 'center');
    ctx.restore();
  } else if (e.def.bedded) {
    // Bedded plates draw BED_SINK low — art only, the box never moves — and
    // CLIPPED at the ground line, because entities draw after the ground:
    // without the clip the sunk part just paints itself on top of the road
    // band and the plate reads as overlapping the road, not buried in it.
    // With it, the road genuinely swallows the bottom of the plate, which is
    // the same picture the boost pad's trench draws for itself.
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 20, GROUND_Y - 200, e.w + 40, 200);
    ctx.clip();
    draw1(x, y + BED_SINK);
    ctx.restore();
  } else {
    draw1(x, y, propName && propBoxCentred(propName) ? 'center' : 'bottom');
  }
  // The pad's payout, drawn over the pad itself: the trench fills with light
  // and throws a short bar forward along the floor. It reads as the pad DOING
  // something rather than as a particle burst that happens to be nearby, which
  // is the difference between a confirmation and a decoration. Reduced motion
  // keeps the fill and drops the throw.
  if (e.def.isBoost && !settings.reducedMotion) drawBoostReaction(ctx, e, x, t, propName);
  if (e.def.isLoop) drawLoopRing(ctx, e, x, t, settings);
  // A CARD BOX THAT HAS TAKEN ITS ROUND. Between the hit and the beat it is
  // owed to there is a fraction of a beat (see BOX_BURST_BEATS), and a box that
  // just stood there through it would read as a shot that missed. A GLOW, and
  // nothing else: it swells as the fuse burns, so the wait has a direction and
  // the burst is the end of something rather than a surprise.
  //
  // NO RIM AND NO STROBE. Both were here while the fuse ran up to two beats,
  // and a near-white outline flashing from six times a second to twenty was
  // legible over that long. At today's fuse it is two hard white flashes on the
  // frame before the box goes, which reads as the box glitching rather than as
  // a fuse burning — and a rectangle of light around a cardboard box was
  // drawing attention away from the box itself, which was the same complaint
  // that took the earlier white WASH out of here.
  if (e.def.beatShoot && e.burstBeat != null) {
    const ft = e.fuseT || 0;
    const cx = x + e.w / 2;
    const cy = y + e.h / 2;
    const gr = 8 + ft * 4;
    ctx.imageSmoothingEnabled = true;
    // Swelling with the fuse rather than flat, which is the direction the
    // strobe used to carry. Reduced motion takes the middle of that range and
    // holds it: the message is the box being lit, and that survives still.
    ctx.globalAlpha = settings.reducedMotion ? 0.4 : Math.min(0.55, 0.3 + ft * 0.5);
    ctx.drawImage(glowSprite('rgba(248,144,184,0.75)', 9), cx - gr, cy - gr, gr * 2, gr * 2);
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = false;
  }
  if (style && style.decorate) style.decorate(ctx, e, x, y);
}

// Art is 14x44 (see PORTAL_ART_W/H) over the unchanged 12x40 pass-through box:
// a pixel proud on each side and four tall, so the portal is very slightly
// easier to hit than it looks, which is the direction to err in on the one
// prop you are trying to run INTO. Which drawing that is lives in one place,
// props.js's PORTAL_SPRITE, because four surfaces paint a portal.

// Everything the boost pad does about the hero, before and after. It is the
// only prop in the lane that GIVES you something, so it is the one prop worth
// spending frames on acknowledging you — and both halves have to read with a
// hero standing directly on top of the thing doing the acknowledging, which is
// why almost nothing here is drawn inside the pad's own footprint.
//
// BEFORE: nothing drawn. The approach is told entirely by the pad's own
// chevrons chasing faster, which lives in the frame index.
// AFTER: the trench floods and the chevrons that were queued in the pad launch
// out of it and spread. Everything else that used to be here — a forward gold
// bar, an outward shockwave, a pre-glow on approach — has been deleted rather
// than tuned. All three were loose rectangles a few pixels across, and at
// gameplay size a loose rectangle is a dot or a square, not an effect.
function drawBoostReaction(ctx, e, x, t, propName) {
  const bw = Math.round(e.w * 4 / 3);
  const bx = x - Math.floor((bw - e.w) / 2);
  const bh = Math.round(e.h * propTall(propName) * 4 / 3);
  const arm = e.arm || 0;
  const fired = e.firedT || 0;

  // NO PRE-GLOW. The approach used to paint a translucent gold rectangle over
  // the floor around the pad, which is the single artefact that kept getting
  // flagged: a yellow square sitting ahead of the hero, attached to nothing,
  // reading as a UI element someone left on the field. The pad already
  // telegraphs itself — its chevrons chase faster the nearer you get, and that
  // is a mark that belongs to the pad rather than a wash laid over the ground.
  // `arm` still drives the frame rate; it no longer draws anything of its own.
  if (fired <= 0) return;

  const q = Math.max(0, Math.min(1, fired / 0.3));   // 1 at the instant it fires
  const age = 1 - q;
  ctx.save();
  // The trench floods. Not opaque: at full strength a solid fill whited the
  // chevrons out and the pad read as a blank box for a tenth of a second.
  ctx.globalAlpha = q * 0.7;
  ctx.fillStyle = '#fff6d0';
  ctx.fillRect(bx, GROUND_Y - bh, bw, bh);
  // The gold bar that used to be thrown forward along the floor is gone. It
  // was a rectangle, it was the same colour as the pad, and it was saying the
  // same thing the hero-side treatment says — so it read as a stray HUD
  // element parked on the floor. Speed is the runner's job now (game/boostFx.js);
  // the pad's job is only to look like it fired.
  // The queued chevrons launch. Three of them, leaving the lip together and
  // spreading as they fade — the pad emptying itself into the hero. Cream, not
  // the pad's gold: gold on the desert pack is gold on tan, and they blurred
  // into the ground exactly where they most needed to be read.
  ctx.fillStyle = '#fff6d0';
  for (let i = 0; i < 3; i++) {
    const lead = age * (30 + i * 9);
    const cx = bx + bw * 0.6 + lead;
    const cy = GROUND_Y - bh * 0.6 - i * 2 - age * 5;
    const s = 3.6 - i * 0.5;
    ctx.globalAlpha = q * (0.9 - i * 0.18);
    ctx.beginPath();
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx + s * 1.6, cy);
    ctx.lineTo(cx, cy + s);
    ctx.lineTo(cx - s * 0.7, cy + s);
    ctx.lineTo(cx + s * 0.9, cy);
    ctx.lineTo(cx - s * 0.7, cy - s);
    ctx.closePath();
    ctx.fill();
  }
  // Ends flicking up.
  const tick = Math.round(age * 7) + 2;
  ctx.globalAlpha = q * 0.9;
  ctx.fillStyle = '#fff6d0';
  ctx.fillRect(bx, GROUND_Y - bh - tick, 1, tick);
  ctx.fillRect(bx + bw - 1, GROUND_Y - bh - tick, 1, tick);
  ctx.restore();
}

// The loop-de-loop's ring, drawn from its pad.
//
// It is scenery with no box and no state — the ride is entirely the pad's doing
// (see game/loop.js) — which is exactly why it has to look like structure rather
// than like a marking. What sells it as a piece of road standing on its end is
// the section: a dark under-side, a lit running surface a couple of pixels
// inside it, and the same gold rail the faux3d ground already paints along the
// top of the lane. The SPEED ZONE's backdrop has been drawing little brown loops
// on the horizon since it was written; this is that shape brought down onto the
// road at full size.
//
// Drawn behind the hero for free: obstacles paint to the backbuffer and the hero
// queues to the full-resolution overlay, so he rides in front of the whole ring.
// A near wall passing over him would want a second pass ordered after his, which
// is more machinery than the read is short of.
function drawLoopRing(ctx, e, x, t, settings = {}) {
  const r = LOOP.r;
  // Centred on the line the hero VISUALLY travels, not on the pad's box. The
  // ride pins his sprite's left edge to the circle, so the middle of him — and
  // the ring of coins, which is placed to meet the middle of him — runs half a
  // sprite to the right of it. Drawing the track on the box instead leaves the
  // art six pixels adrift of the hero and the coins riding its right-hand rim.
  // Same offset, same reason, as the finish seat: see HERO_CENTER_OFF.
  const cx = x + e.w / 2 + HERO_CENTER_OFF;
  const cy = GROUND_Y - r;
  const arm = e.arm || 0;
  const fired = e.firedT || 0;
  ctx.save();

  // THE TRACK LIES OUTSIDE THE RIDE LINE.
  //
  // `r` is the circle the hero's FEET travel — the ride drives him along it
  // exactly (game/loop.js) — so it is the running surface, not the middle of the
  // structure. Centring the band on it instead buries his feet up to the ankle
  // in the track and leaves half the boot sticking out through the far side,
  // which is what the first cut did: at the top of the ring he was threaded
  // through the rail rather than standing on it. The body of the track hangs
  // OFF the surface, outward, the way the underside of a road hangs below it.
  const T = 7;                 // how thick the track reads
  // A hair of daylight between the running line and the structure. `r` is where
  // the hero's feet are PLANTED, but a drawn boot is a few pixels of art around
  // that point and some of the cast wear loose ones — Ray M'N's are detached
  // ellipses that float. Butting the band straight up against `r` put those
  // through the rail. Clearance here rather than a nudge in the toon painter,
  // which is shared by the whole cast and would be a one-hero fix applied to
  // eight of them.
  const CLEAR = 2;
  const inner = r + CLEAR;     // the face he runs on
  const mid = inner + T / 2;   // so the band spans inner .. inner + T
  // The track is OPEN at the bottom, and that is not decoration. A closed circle
  // lays a rail straight across the lane at ankle height: it reads as a barrier
  // the hero is about to run into, and it hides the pad — the one thing he has
  // to actually hit — underneath itself. Real loops flare into the road at both
  // ends, so the ring does too, and the gap is where the ride begins and ends.
  const gap = 0.34;
  const a0 = Math.PI / 2 + gap;
  const a1 = Math.PI / 2 - gap + Math.PI * 2;
  const band = (rad, width, color) => {
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.arc(cx, cy, rad, a0, a1); ctx.stroke();
  };

  // Where the two ends of the track meet the road, and the fairing that takes
  // them into it. Without this the track stops dead at the ground line: two cut
  // ends resting on a surface they have no relationship with. A loop is BUILT
  // there, so each end swells into a haunch that spreads along the road, and the
  // road takes a shadow off it.
  const foot = (sign) => {
    const a = sign < 0 ? a0 : a1;
    const ex = cx + Math.cos(a) * mid;
    const ey = cy + Math.sin(a) * mid;
    // Pooled shade first, wider than the haunch, so the road looks pressed on.
    ctx.fillStyle = 'rgba(8,6,12,0.20)';
    ctx.beginPath();
    ctx.ellipse(ex + sign * 6, GROUND_Y - 0.5, 22, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // The haunch: from the outer face of the track end, curving out and down to
    // die into the road a couple of dozen pixels away.
    ctx.fillStyle = '#6a4420';
    ctx.beginPath();
    ctx.moveTo(ex + sign * (T / 2), ey - 6);
    ctx.quadraticCurveTo(ex + sign * (T / 2 + 6), GROUND_Y - 6, ex + sign * 30, GROUND_Y);
    ctx.lineTo(ex - sign * 2, GROUND_Y);
    ctx.closePath();
    ctx.fill();
    // A lighter face on it, inset, so the haunch has a top and a side rather
    // than reading as a flat brown triangle.
    ctx.fillStyle = '#a06830';
    ctx.beginPath();
    ctx.moveTo(ex + sign * (T / 2 - 1), ey - 5);
    ctx.quadraticCurveTo(ex + sign * (T / 2 + 4), GROUND_Y - 5, ex + sign * 24, GROUND_Y - 1.5);
    ctx.lineTo(ex - sign * 1, GROUND_Y - 1.5);
    ctx.closePath();
    ctx.fill();
  };
  foot(-1);
  foot(1);

  ctx.lineCap = 'round';
  // Under-side first, a fraction wide of the running surface, so the surface
  // sits on top of a dark edge the whole way round rather than being outlined.
  band(mid, T + 2, '#6a4420');
  band(mid, T, '#a06830');
  // The running surface: the face the hero actually travels on, so it is the one
  // that catches the light.
  band(inner + 1.5, 2, '#c88848');
  // The lane's own gold rail, carried up and round, right on the running line.
  // This is what ties the ring to the road it is standing on.
  band(inner + 0.5, 1, '#f6d33c');

  // Chevrons chasing along the track's own face, at the pad's own rate — `arm`
  // drives both, so the ring winds up as the hero closes and falls away with the
  // pad when the chance is missed. Reduced motion keeps them and stops them
  // moving. On the band rather than floating inside it: they are markings on the
  // road surface, and the pad at the bottom wears the same ones.
  const n = 12;
  const chase = settings.reducedMotion ? 0 : t * (0.9 + 2.6 * arm);
  ctx.fillStyle = '#fff6d0';
  for (let i = 0; i < n; i++) {
    const a = chase + (i / n) * Math.PI * 2;
    // Nothing in the mouth: a chevron floating in the gap belongs to no surface.
    const fromBottom = Math.abs(((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI);
    if (fromBottom < gap + 0.12) continue;
    const rr = mid;
    const px = cx + Math.sin(a) * rr;
    const py = cy - Math.cos(a) * rr;
    // Alpha falls away behind the leader so the run reads as travelling rather
    // than as a ring of dots that happens to rotate.
    ctx.globalAlpha = (0.18 + 0.5 * arm) * (0.35 + 0.65 * ((i / n + 0.5) % 1));
    ctx.save();
    ctx.translate(px, py);
    // Pointing the way the ride goes: the tangent, which is the angle itself.
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, -2.2);
    ctx.lineTo(1.8, 0);
    ctx.lineTo(0, 2.2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // THE ROAD CLOSES OVER THE FEET.
  //
  // Drawn last, over the finished track, because burying is what it does: a low
  // berm of the lane's own material swells at each foot and takes the cut end of
  // the tube under it. Without it the ring sits ON the road — two sawn-off ends
  // resting on a surface they have nothing to do with — and no amount of shadow
  // underneath fixes that, because the problem is not that they float, it is
  // that you can see where they stop.
  //
  // Only the OUTER side of each foot. The mouth between them is where the pad
  // lives and where the ride begins, and filling that in would hide the one
  // thing the player actually has to run over.
  const berm = (sign) => {
    const a = sign < 0 ? a0 : a1;
    const ex = cx + Math.cos(a) * mid;
    ctx.fillStyle = e.groundCol || '#c88848';
    ctx.beginPath();
    ctx.moveTo(ex - sign * 3, GROUND_Y + 5);
    ctx.quadraticCurveTo(ex + sign * 4, GROUND_Y - 7, ex + sign * 17, GROUND_Y - 3.5);
    ctx.quadraticCurveTo(ex + sign * 30, GROUND_Y - 1, ex + sign * 40, GROUND_Y + 5);
    ctx.closePath();
    ctx.fill();
    // A darker lip along its crest — the same line the lane wears where its
    // surface meets its side — so the berm reads as road rather than as a blob.
    ctx.strokeStyle = e.groundDark || '#a06830';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ex - sign * 3, GROUND_Y + 4);
    ctx.quadraticCurveTo(ex + sign * 4, GROUND_Y - 8, ex + sign * 17, GROUND_Y - 4.5);
    ctx.quadraticCurveTo(ex + sign * 30, GROUND_Y - 2, ex + sign * 40, GROUND_Y + 4);
    ctx.stroke();
  };
  berm(-1);
  berm(1);

  // Contact: the whole ring lights, once, and fades. It is the same beat the pad
  // plays in its trench, said at the scale of the thing the pad just handed you.
  if (fired > 0 && !settings.reducedMotion) {
    const q = Math.max(0, Math.min(1, fired / 0.3));
    ctx.globalAlpha = q * 0.85;
    ctx.strokeStyle = '#fff6d0';
    ctx.lineWidth = 2 + q * 2;
    ctx.beginPath(); ctx.arc(cx, cy, mid, a0, a1); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

export function drawPortal(ctx, portal, camX, t, zoom = ZOOM, smoothMotion = false, settings = {}) {
  const x = smoothMotion ? portal.x - camX : Math.round(portal.x - camX);
  // The old art was three static ellipses, so drawPortal breathed it 2px on a
  // sine to give it any life at all. This art cuts its own edges every frame,
  // and the pulse is no longer free: the raster cache keys on drawn size, so a
  // height that varies would cache the whole twelve-frame set once per pixel
  // of pulse. The motion moved inside the drawing.
  const top = GROUND_Y - PORTAL_ART_H;
  // A portal that has been used or missed stops being a loop and becomes a
  // STRIP: `spent`/`wilt` are seconds since the event, and the frame is clamped
  // to the end so the last frame — a dark plinth, a slumped column — is what
  // rests on screen for the rest of the ride off the back of the frame.
  //
  // Reduced motion gets the LAST frame of the strip rather than the first. The
  // first frame of a spend is the discharge, and holding a white blowout static
  // for half a second is exactly the thing the setting exists to prevent; the
  // last frame is the state, which is the part carrying the information.
  const strip = portal.spent != null
    ? { name: PORTAL_SPENT_SPRITE, t: portal.spent / PORTAL_SPEND_TIME, n: PORTAL_SPEND_FRAMES }
    : portal.wilt != null
      ? { name: PORTAL_WILT_SPRITE, t: portal.wilt / PORTAL_WILT_TIME, n: PORTAL_WILT_FRAMES }
      : null;
  if (strip) {
    const f = settings.reducedMotion ? strip.n - 1
      : Math.min(strip.n - 1, Math.max(0, Math.floor(strip.t * strip.n)));
    drawProp(ctx, strip.name, x - 1, top, PORTAL_ART_W, PORTAL_ART_H, f);
    // The floor glow goes out with the column. It is the portal's light on the
    // ground, so it cannot outlive the light.
    const lit = 1 - Math.min(1, strip.t);
    if (lit > 0.02 && !settings.reducedMotion) {
      ctx.globalAlpha = lit;
      ctx.fillStyle = '#48e0c8';
      ctx.fillRect(x + 4, GROUND_Y - 2, 4, 2);
      ctx.globalAlpha = 1;
    }
    // No signage on a spent portal: that hero is now the player. A wilted one
    // keeps its face for as long as the column lasts, fading with it — the
    // whole point of the wilt is that the player can see what they went past.
    if (portal.spent == null) drawPortalFace(ctx, portal, x, top, zoom, lit);
    return;
  }
  const frame = settings.reducedMotion ? 0
    : Math.floor(t * propFps(PORTAL_SPRITE)) % propFrames(PORTAL_SPRITE);
  drawProp(ctx, PORTAL_SPRITE, x - 1, top, PORTAL_ART_W, PORTAL_ART_H, frame);
  ctx.fillStyle = '#48e0c8';
  ctx.fillRect(x + 4, GROUND_Y - 2, 4, 2);
  drawPortalFace(ctx, portal, x, top, zoom, 1);
}

// Who you are about to become. The face alone is the signage — no name, no
// callout — hung off the top of the arch and drawn unscaled, so its size and
// the gap above the arch stay as authored instead of being magnified with
// the world.
function drawPortalFace(ctx, portal, x, top, zoom, alpha) {
  if (alpha <= 0.02) return;
  const face = toonFaceSprite(portal.hero, 24, 18);
  if (!face) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x + 6, top);
  ctx.scale(1 / zoom, 1 / zoom);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(face, -12, -25, 24, 18);
  ctx.imageSmoothingEnabled = false;
  ctx.restore();
}

// The copter's box in world units. 36 is 1.5x the hero's height: he is the
// boss, and at the old 24 the tub's stripes were two units wide. boss.js's
// BOSS_ART quotes this so the Act I boss and the chase copter are one size.
export const COPTER_BOX = 36;

// The machine's INK inside that box, which is what everything collides with.
// Read off the painting rather than guessed: eggshellCopterArt authors in a 28u
// box scaled to COPTER_BOX, the tub's rim spans twelve units either side of
// centre, and the rotor's ink stops short of the box top. The rest is blade
// sweep and sky, and a head that passes under a blade tip has missed.
export const COPTER_HULL = { w: 24, h: 30, floor: 4 };
// How long the bonk's recoil runs, and — because the same field is the lockout
// — how long nothing else may count as a hit.
export const COPTER_HIT_T = 1.1;
// How long the forcefield stays visible after it turns a shot away.
export const COPTER_SHIELD_T = 0.3;

// Which rotor frame to show. The strip is HALF a turn (the blade pair repeats
// every half turn), and the rotor makes ONE FULL TURN PER BEAT when a song is
// playing — the chase mission's own line is "IT IS SOMEHOW ON BEAT". With no
// song clock it turns twice a second, which is the same thing at 120 BPM.
// `beatPhase` is 0..1 inside the current beat, or null when there is no song.
export function copterFrame(t, beatPhase, reducedMotion = false) {
  if (reducedMotion) return 0;
  const frames = propFrames('eggshellCopter');
  const turns = Number.isFinite(beatPhase) ? beatPhase : t * 2;
  return Math.floor(turns * frames * 2) % frames;
}

export function drawCopter(ctx, copter, camX, t, smoothMotion = false, reducedMotion = false, beatPhase = null) {
  // Rounding follows the smoothMotion rule on BOTH axes. y used to round
  // unconditionally, and his bob is ~34u/s, so at desktop scale he climbed
  // in 6px steps every other frame.
  const x = smoothMotion ? copter.x - camX : Math.round(copter.x - camX);
  const rawY = GROUND_Y - copter.alt - 16;
  const y = smoothMotion ? rawY : Math.round(rawY);
  // The tub keeps the floor the old 24x20 box had (y + 12); the rotor takes
  // the headroom the old blur line used to float in. The rotor turns in the
  // painter's frames, so there is no separate blur to draw.
  const frame = copterFrame(t, beatPhase, reducedMotion);
  const B = COPTER_BOX;
  // HIS FACE IS LIVE, so he is drawn from the painter rather than the raster
  // cache: a cached sprite has one expression per frame index, and the whole
  // point here is that the expression changes. One small vector sprite a
  // frame, which is what the bonk already paid for.
  //
  // HE WATCHES THE HERO. `look` is which side the hero is on, softened so it
  // is a glance rather than a lock; the pupils ride inside the lenses.
  // `mood` comes from the pass (run.js sets it): pleased on the way in,
  // working while he hunts, sour after he has been hit.
  // WHERE HE IS LOOKING. Three things can own his eyes, in order: the gorilla
  // he is passing, the hero he is hunting, and — when neither is close — a
  // slow idle drift, because eyes that hold one position are the thing that
  // read as a sticker in the first place.
  const heroDx = (camX + PLAYER_X + HERO_CENTER_OFF) - copter.x;
  const idle = Math.sin(t * 0.9) * 0.55 + Math.sin(t * 0.37 + 1.2) * 0.3;
  const hunting = copter.mode === 'enter' || copter.mode === 'hover' || copter.mode === 'leave';
  const look = copter.nearKong ? 1                       // the gorilla is always to his right
    : hunting ? Math.max(-1, Math.min(1, heroDx / 46))   // the hero, while the pass is on
      : idle;
  const face = {
    look,
    mood: copter.mood || 'flat',
    // A blink every few seconds, off a clock of his own so it never lands on
    // the beat with everything else. Two frames of shut eye is enough.
    blink: reducedMotion ? 0 : (t % 3.4 < 0.11 ? 1 : 0),
    // A TWITCH EACH, ON THEIR OWN CLOCKS. Periods that share no factor, so the
    // two never land together; each is a short hop rather than a hold.
    twitch: reducedMotion ? [0, 0] : [
      t % 5.3 < 0.22 ? 1 : 0,
      t % 3.9 < 0.18 ? 1 : 0,
    ],
  };
  // THE BONK, 1.1s: a kick upward, then a decaying vibration — a fast rattle
  // in x and y with a tilt, shaken off as it fades. Drawn, not simulated: the
  // flight path is a plain climb, so the rattle can never move where the next
  // bonk lands.
  const hit = copter.hitT > 0 ? Math.min(1, copter.hitT / COPTER_HIT_T) : 0;
  if (hit > 0) {
    const age = 1 - hit;                        // 0 at the moment of contact
    const kick = Math.sin(Math.PI * Math.min(1, age * 1.6)) * 13;
    const buzz = hit * hit;                     // the rattle dies faster than the arc
    const jx = Math.sin(age * 78) * 2.4 * buzz;
    const jy = Math.sin(age * 103 + 1.1) * 1.7 * buzz;
    const rot = Math.sin(age * 41) * 0.3 * buzz;
    // KNOCKED OUT OF HIS SEAT: he leaves the tub for a moment and comes down
    // into it, shocked, while the whole machine rattles. The pop is a quick
    // rise and a settle, shorter than the rattle, so he is seated again before
    // the shaking stops.
    const pop = Math.max(0, Math.sin(Math.PI * Math.min(1, age * 2.2)) * (1 - age * 0.35));
    ctx.save();
    ctx.translate(x + jx, y + 12 - B / 2 - kick + jy);
    ctx.rotate(rot);
    // Drawn straight from the painter rather than the raster cache: `pop` is
    // continuous, and a cache key per value would be a new canvas every frame.
    // It is one small sprite for a second.
    ctx.save();
    ctx.translate(-B / 2, -B / 2);
    eggshellCopterArt(ctx, B, B, frame, { pop, face });
    ctx.restore();
    ctx.restore();
  } else {
    ctx.save();
    ctx.translate(x - B / 2, y + 12 - B);
    eggshellCopterArt(ctx, B, B, frame, { face });
    ctx.restore();
  }
  // THE FIELD, ONLY WHEN IT IS STRUCK. A permanent bubble would say "you
  // cannot hurt this" for the whole level, which is the opposite of the truth:
  // a head bonks him and a barrel goes straight through. So it is an answer,
  // not a state — two rings on the hull, brightest on the frame of the hit and
  // gone in a third of a second. Cyan because that is already the game's ink
  // for a deflect. Drawn, not simulated, like the rattle above.
  if (copter.shieldT > 0) {
    const a = Math.min(1, copter.shieldT / COPTER_SHIELD_T);
    const cy = y + 12 - COPTER_HULL.h / 2;
    ctx.save();
    ctx.lineWidth = 1;
    for (let i = 0; i < 2; i++) {
      ctx.strokeStyle = `rgba(168,230,255,${(a * (0.55 - i * 0.22)).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(x, cy, COPTER_HULL.w * 0.62 + i * 3, COPTER_HULL.h * 0.58 + i * 3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  // chase mission: flash the catch window while the copter swoops in
  if (copter.inRange && Math.floor(t * 6) % 2 === 0) {
    ctx.fillStyle = '#f6d33c';
    ctx.fillRect(x - 1, y + 4 - B, 3, 5);
    ctx.fillRect(x - 1, y + 10 - B, 3, 2);
  }
}
