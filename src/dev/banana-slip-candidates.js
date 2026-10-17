// Gallery-only: THE BANANA SLIP, a bake-off (17 Oct 2026).
//
// Peter: "can we improve our banana slip animation? its very basic... bakeoff". What the run
// does today (game/draw.js, `slipAngle`): the whole figure tips back 0.62 rad about his heels
// and returns, one sine over SLIP_T = 0.55s, the run cycle still going underneath. It is
// rig-independent and it is nothing else: no feet leaving the ground, no landing, no peel.
//
// These are PICTURES, the live wire's rule (sprites/zap.js, hitPictures.js): the run does not
// know. The hero keeps his speed, his spot and his hitbox, and the hit is the ordinary one
// (battery cell, shake, hitstop, i-frames, the slide whistle, BANANA. CLASSIC.). Each painter
// is `paint(ctx, heroId, cx, feetY, w, t, live)` — w seconds since the slip, t a running
// clock, `live` the run pose to hand back to — drawn instead of the running toon for `T`.
//
// Drawn the way the zap and the blast are: his own toon in an offscreen layer, turned
// about his hips and put back, so a pratfall is one move on every rig rather than an
// authored pose per hero. The only authored parts are the arms and legs in the air.
//
// DURATION. SLIP_T is also the stumble — slowed, no jump — so a picture longer than it is a
// longer penalty unless the stumble is decoupled. Each candidate says its length; a pick
// decides whether SLIP_T follows it. NOW is the shipped 0.55s.
import { drawToon } from '../sprites/toons.js';
import { HIT_KIT } from '../sprites/hitPictures.js';
import { layer, blit } from '../sprites/zap.js';
import { drawCabinetLane } from './obstacle-bakeoff-kit.js';
import { makeObstacle } from '../game/entities.js';
import { drawWorldEntity } from '../game/draw.js';
import { SLIP_T } from '../game/player.js';
import { GROUND_Y } from '../engine/camera.js';
import { drawSoftContactShadow } from '../engine/shadows.js';

const { U, SCROLL, hash, clamp01, lerp, easeOut, runPose, bigBox, star, lines } = HIT_KIT;
const blinkOff = (t) => Math.floor(t * 14) % 2 === 0;
const ease = (q) => q * q * (3 - 2 * q);                       // smoothstep
const easeIn = (q) => q * q;

// ------------------------------------------------------------------ the skin
// One strip of peel, the shipped peel's palette (props.js bananaPeel, RIPE): yellow outside,
// cream inside, a browned point. Flung off a foot, it is the proof the peel did it.
const PEEL = { main: '#f6c414', lit: '#ffd648', cream: '#fbe7ae', tip: '#4e3214', ink: 'rgba(122,80,10,0.8)' };
function skinScrap(c, x, y, rot, s = 1, flip = 1) {
  c.save();
  c.translate(x, y); c.rotate(rot); c.scale(s * flip, s);
  c.beginPath();
  c.moveTo(-3.2, 0.2);
  c.quadraticCurveTo(-1.2, -2.1, 3.3, -0.5);
  c.quadraticCurveTo(0.6, 0.2, -3.2, 0.2);
  c.closePath();
  c.fillStyle = PEEL.main; c.fill();
  c.beginPath();
  c.moveTo(-3.0, 0.15); c.quadraticCurveTo(0.2, -0.2, 3.0, -0.45); c.quadraticCurveTo(0.6, 0.2, -3.0, 0.15); c.closePath();
  c.fillStyle = PEEL.cream; c.fill();
  c.beginPath(); c.moveTo(3.3, -0.5); c.lineTo(2.1, -0.65); c.lineTo(2.3, -0.1); c.closePath();
  c.fillStyle = PEEL.tip; c.fill();
  c.beginPath();
  c.moveTo(-3.2, 0.2);
  c.quadraticCurveTo(-1.2, -2.1, 3.3, -0.5);
  c.quadraticCurveTo(0.6, 0.2, -3.2, 0.2);
  c.closePath();
  c.strokeStyle = PEEL.ink; c.lineWidth = 0.4; c.lineJoin = 'round'; c.stroke();
  c.restore();
}
// The scrap thrown from the foot, in the world: leaves at (x0, y0) with (vx, vy) relative to
// the road, which is itself going by at SCROLL. Lands, then rides the road back.
function flungSkin(c, w, x0, y0, vx, vy, spin, floor, delay = 0) {
  const e = w - delay;
  if (e < 0) return;
  const G = 300;
  let y = y0 + vy * e + 0.5 * G * e * e;
  let landed = false;
  if (y >= floor) {
    // when it comes down: solve y0 + vy e + G/2 e^2 = floor
    const disc = vy * vy + 2 * G * (floor - y0);
    const eL = (-vy + Math.sqrt(Math.max(0, disc))) / G;
    landed = true;
    y = floor;
    const x = x0 + vx * eL - SCROLL * e;
    skinScrap(c, x, y - 0.4, spin * eL + 0.25, 1, 1);
    return;
  }
  const x = x0 + vx * e - SCROLL * e * 0.55;
  skinScrap(c, x, y, spin * e, 1, 1);
  return landed;
}

// ------------------------------------------------------------------ dust
const DUST = '#d9c9a6', DUST_DK = '#a8966f';
function dust(c, x, y, r, a) {
  if (a <= 0 || r <= 0) return;
  c.save();
  c.globalAlpha *= a;
  c.fillStyle = DUST; c.strokeStyle = DUST_DK; c.lineWidth = 0.4;
  c.beginPath();
  for (const [dx, dy, s] of [[0, 0, 1], [-0.75, 0.25, 0.7], [0.7, 0.3, 0.72]]) {
    c.moveTo(x + dx * r + s * r, y + dy * r); c.arc(x + dx * r, y + dy * r, s * r, 0, Math.PI * 2);
  }
  c.stroke(); c.fill();
  c.restore();
}
// A burst of puffs off the floor at (x, fy): `dir` -1 throws them back, 1 forward, 0 both.
function dustBurst(c, x, fy, e, { dir = 0, n = 5, life = 0.34, size = 2.4, spread = 12 } = {}) {
  if (e < 0 || e > life) return;
  const q = e / life;
  for (let i = 0; i < n; i++) {
    const side = dir || (i % 2 ? 1 : -1);
    const k = 0.5 + 0.5 * hash(i * 3.1);
    dust(c, x + side * (3 + spread * k * easeOut(q)) - SCROLL * 0.3 * e, fy - 1.2 - 4 * k * easeOut(q) - 1.5 * q,
      size * (0.5 + 0.7 * k) * (0.5 + 0.8 * q), 0.9 * (1 - q) ** 1.2);
  }
}
// Dust kicked off a point that is dragging along the road, left behind by the scroll.
function dustTrail(c, x, fy, w, from, until, { every = 0.045, life = 0.4, size = 2.2 } = {}) {
  for (let k = 0; k < 40; k++) {
    const born = from + k * every;
    if (born > until) break;
    const age = w - born;
    if (age < 0 || age > life) continue;
    const q = age / life;
    dust(c, x - SCROLL * 0.9 * age - 2, fy - 1.2 - 5 * q - hash(k * 5.7) * 1.2, size * (0.6 + 0.9 * q) * (0.7 + 0.5 * hash(k)), 0.9 * (1 - q) ** 1.1);
  }
}

// ------------------------------------------------------------------ the body
// His own toon in a layer, turned `rot` (radians; negative = over backwards, positive =
// forwards) about his hips. `H` is the height of the hips above the road in U — 0.45 standing —
// and the feet are placed from it, so a lying figure can be set down with its back ON the road.
const HIP = { ox: -0.04, oy: -0.45 };
const STAND_H = 0.45;
function body(c, heroId, cx, fy, k, t) {
  const Px = cx + (k.dx || 0), Py = fy - k.H * U;
  const x = Px - HIP.ox * U, y = Py - HIP.oy * U;
  const L = layer(23, c, bigBox(cx, fy), (o) => {
    o.save(); o.translate(Px, Py); o.rotate(k.rot); o.scale(k.sx ?? 1, k.sy ?? 1); o.translate(-Px, -Py);
    drawToon(o, heroId, k.pose, x, y, U);
    o.restore();
  });
  blit(c, L);
  return { Px, Py };
}
// Where a point of his body (bx, by in U from his feet, standing) is on the canvas after the turn.
function bodyPoint(cx, fy, k, bx, by) {
  const Px = cx + (k.dx || 0), Py = fy - k.H * U;
  const x = Px - HIP.ox * U, y = Py - HIP.oy * U;
  const dx = x + bx * U - Px, dy = y + by * U - Py;
  const cs = Math.cos(k.rot), sn = Math.sin(k.rot);
  return [Px + dx * cs - dy * sn, Py + dx * sn + dy * cs];
}

// ------------------------------------------------------------------ poses
// The air: a jump kind with grounded set so the face can be startled and the body takes no
// stretch, and the arms and legs authored. hands: [[out, lift] front, [out, lift] back] in
// arm-lengths from the shoulder, out running BACKWARDS for the front hand and FORWARDS for the
// back one (hitPictures.js). feet: [[x, y] front, [x, y] back] in U from rest.
const POSE = { kind: 'jump', vy: 0, grounded: true, facing: 1 };
const SCARED = { faceSurprised: true, browRaise: true };
const OUCH = { faceGrim: true };
const mk = (t, dance, face = SCARED) => ({ ...POSE, time: t, ...face, dance });
// An arm swung round in the plane of the run at radius r (near full reach: no elbow to place).
const swing = (ang, r = 0.92) => [r * Math.sin(ang), -r * Math.cos(ang)];
// LEGS COME FROM THE RUN CYCLE, never authored in the air (Peter, 17 Oct: the scissoring and
// pedalling legs bent their knees the wrong way; "the forward motion is generally ok"). In the
// air he BACKPEDALS: his own run played backwards, fast, from the stride he slipped on — the
// gait's knees are right on every frame, backwards or forwards. `spun` is how many strides of
// backwards he has done by now; the live pose's own clock is taken back out (LIVE_RATE, the
// run's cycles per second near enough) so w = 0 is exactly the stride he was on.
const LIVE_RATE = 1.75;
const BACK_RATE = 4.5;
function backpedal(t, w, live, spun, hands = null, face = SCARED) {
  const p0 = (live?.phase ?? 0) - LIVE_RATE * w;
  const phase = (((p0 - spun) % 1) + 1) % 1;
  return { kind: 'run', phase, time: t, grounded: true, facing: 1, ...face, ...(hands ? { dance: { hands } } : {}) };
}
// Running feet hang STAND_H below his hips along his body; turned `rot`, they reach the road
// when the hips are lower than this. Below it the run's legs would go through the floor, so a
// fall swaps to its landing pose (seat, back or front on the road) the moment it gets there.
const feetClear = (H, rot) => H - STAND_H * Math.cos(rot) > 0.01;
// Getting up: his own run, forwards, as he rights himself — he comes up already running, his
// hips held high enough that the running feet never go through the road.
function getUp(q, from, t, live) {
  const up = ease(q);
  const rot = lerp(from.rot, 0, up) + Math.sign(from.rot) * -0.1 * Math.sin(q * Math.PI);
  const H = Math.max(lerp(from.H, STAND_H, up) + 0.08 * Math.sin(q * Math.PI), STAND_H * Math.cos(rot) + 0.01);
  return { rot, H, dx: lerp(from.dx, 0, up), pose: { ...runPose(t, live), faceGrim: true } };
}

// ======================================================================== candidates
const TAU = Math.PI * 2;
const CLOCK = 28;     // the flail's rate

// ---- A — FEET OUT: the classic. Heel catches the skin, both feet go out from under him, he
// goes flat in the air, hangs, comes down on his back with a thump, lies stunned with stars
// and springs up.
const A = { air: 0.5, apex: 0.22, thump: 0.5, lie: 0.84, T: 0.98 };
// Arms reaching forward and up for something to grab.
const flailA = (t) => {
  const p = t * CLOCK;
  return [[-0.8 + 0.28 * Math.sin(p), -0.3 + 0.4 * Math.sin(p + 1.1)], [-0.7 + 0.3 * Math.sin(p + 2.4), -0.2 + 0.4 * Math.sin(p + 3.4)]];
};
const LIE = { hands: [[0.3, -0.95], [0.25, -0.92]], feet: [[0.22, -0.05], [0.07, -0.12]], ankles: [0.15, 0.5] };
function keyA(w, t, live) {
  let rot, H, dx = 0, sx = 1, sy = 1, pose;
  if (w < A.air) {
    // Past flat to feet-above-head at the top, then back down to flat as he lands.
    rot = w < A.apex ? -2.0 * easeOut(w / A.apex) : lerp(-2.0, -1.6, ease((w - A.apex) / (A.air - A.apex)));
    H = w < A.apex ? lerp(STAND_H, 1.0, Math.sin((w / A.apex) * Math.PI / 2)) : lerp(1.0, 0.17, easeIn((w - A.apex) / (A.air - A.apex)));
    dx = -0.3 * U * ease(w / A.air);
    pose = backpedal(t, w, live, BACK_RATE * w, flailA(t));
  } else if (w < A.lie) {
    const e = w - A.thump;
    rot = -1.6 + 0.05 * ease(clamp01(e / 0.08)) - 0.03 * clamp01((e - 0.2) / 0.1);
    H = 0.17;
    dx = -0.3 * U;
    if (e < 0.07) { const q = e / 0.07; sx = lerp(1, 1.12, Math.sin(q * Math.PI)); sy = lerp(1, 0.93, Math.sin(q * Math.PI)); }
    if (e >= 0.07 && e < 0.19) H += 0.13 * Math.sin(((e - 0.07) / 0.12) * Math.PI);
    pose = mk(t, LIE, OUCH);
  } else {
    return getUp(clamp01((w - A.lie) / (A.T - A.lie)), { rot: -1.63, H: 0.17, dx: -0.3 * U }, t, live);
  }
  return { rot, H, dx, sx, sy, pose };
}
function paintA(c, heroId, cx, fy, w, t, live) {
  const k = keyA(w, t, live);
  // the skin goes up off his foot
  flungSkin(c, w, cx + 0.3 * U, fy - 0.1 * U, 38, -150, 14, fy);
  const e = w - A.thump;
  if (e > 0) {
    dustBurst(c, cx - 0.35 * U, fy, e, { n: 6, size: 2.6, spread: 15 });
    lines(c, cx - 0.35 * U, fy - 0.3 * U, 5, 10, [-Math.PI * 0.95, -Math.PI * 0.72, -Math.PI * 0.5, -Math.PI * 0.28, -Math.PI * 0.05], 1 - clamp01(e / 0.2));
  }
  body(c, heroId, cx, fy, k, t);
  if (w >= A.thump + 0.22 && w < A.lie + 0.04) stunned(c, bodyPoint(cx, fy, k, 0.0, -0.95), t, clamp01((w - A.thump - 0.22) / 0.05) * (1 - clamp01((w - A.lie) / 0.04)));
}

// A ring of stars going round a point (his head) — the stunned beat.
function stunned(c, [hx, hy], t, a = 1, n = 3) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a;
  for (const front of [false, true]) {
    for (let i = 0; i < n; i++) {
      const ang = t * 9 + i * TAU / n;
      if ((Math.sin(ang) > 0) !== front) continue;
      star(c, hx + Math.cos(ang) * 0.4 * U, hy - 0.22 * U + Math.sin(ang) * 0.1 * U, front ? 3.0 : 2.3, t * 5 + i);
    }
  }
  c.restore();
}

// ---- B — BUTT SKID: no air to speak of. The feet go out and he sits down hard on the road
// and skates on his seat, propped on his hands behind him, a plume of dust off his behind,
// until the road has had enough of him; then he pushes up.
const B = { sit: 0.16, push: 0.7, T: 0.95 };
// Legs quoted from the real held slide (toons.js drawSlideKick: footNearX ~0.30u extended
// forward near-straight, footRearX ~0.11u folded in behind with the knee dropped) — Peter,
// 17 Oct: the ground poses should match the kick's leg shape, with the torso back further.
const SIT = { hands: [[0.78, 0.55], [0.72, 0.5]], feet: [[0.40, -0.02], [0.13, -0.15]], ankles: [0.15, 0.55] };
const SIT_ROT = -0.64;
function keyB(w, t, live) {
  let rot, H, dx = 0, pose;
  if (w < B.sit) {
    const q = w / B.sit;
    rot = SIT_ROT * ease(q);
    H = lerp(STAND_H, 0.17, easeIn(q)) + 0.14 * Math.sin(q * Math.PI * 0.9);
    dx = -0.12 * U * q;
    pose = feetClear(H, rot) ? backpedal(t, w, live, BACK_RATE * w, [swing(0.4), swing(0.6)]) : mk(t, SIT);
  } else if (w < B.push) {
    const e = w - B.sit;
    rot = SIT_ROT + 0.06 * Math.sin(e * 6) - 0.04 * clamp01(e / 0.2);
    H = 0.17 + 0.09 * Math.max(0, Math.sin(clamp01(e / 0.12) * Math.PI)) * (e < 0.12 ? 1 : 0);
    dx = -0.12 * U;
    pose = mk(t, SIT, e > 0.34 ? OUCH : SCARED);
  } else {
    return getUp(clamp01((w - B.push) / (B.T - B.push)), { rot: SIT_ROT - 0.04, H: 0.17, dx: -0.12 * U }, t, live);
  }
  return { rot, H, dx, pose };
}
function paintB(c, heroId, cx, fy, w, t, live) {
  const k = keyB(w, t, live);
  flungSkin(c, w, cx + 0.3 * U, fy - 0.1 * U, 70, -70, 11, fy);
  const [sx] = bodyPoint(cx, fy, k, -0.2, -0.1);
  dustTrail(c, sx, fy, w, B.sit, B.push - 0.05, { every: 0.04, life: 0.42, size: 2.4 });
  if (w >= B.sit && w < B.sit + 0.2) dustBurst(c, cx - 0.3 * U, fy, w - B.sit, { n: 5, size: 2.5, spread: 12 });
  body(c, heroId, cx, fy, k, t);
}

// ---- C — PEEL SURF: he stays up. Both feet land on the skin and it carries him on, knees
// bent, leaning back, arms going round like a windmill, wobbling harder and harder; then it
// shoots out from under him and he sits down on the road.
const C = { surf: 0.58, sit: 0.7, up: 0.8, T: 0.95 };
const SURF = { feet: [[0.2, 0], [-0.2, 0]], ankles: [0.1, -0.1] };
function keyC(w, t, live) {
  let rot, H, dx = 0, pose;
  if (w < C.surf) {
    const g = w / C.surf;
    const wob = Math.sin(w * 15) * (0.14 + 0.2 * g) + Math.sin(w * 31) * 0.04;
    rot = -0.28 + wob;
    H = 0.4 + 0.02 * Math.sin(w * 30);
    dx = -0.1 * U + 0.08 * U * Math.sin(w * 15);
    const p = w * 20;
    pose = mk(t, { hands: [swing(p), swing(p + Math.PI * 0.8)], ...SURF });
  } else if (w < C.up) {
    const e = w - C.surf;
    const q = clamp01(e / (C.sit - C.surf));
    rot = lerp(-0.4, SIT_ROT, ease(q));
    H = lerp(0.4, 0.17, easeIn(q));
    dx = -0.12 * U;
    // backpedalling as the skin goes, then down on the seat
    pose = feetClear(H, rot) ? backpedal(t, w, live, BACK_RATE * e, [swing(1.2), swing(2.4)]) : mk(t, SIT, OUCH);
  } else {
    return getUp(clamp01((w - C.up) / (C.T - C.up)), { rot: SIT_ROT, H: 0.17, dx: -0.12 * U }, t, live);
  }
  return { rot, H, dx, pose };
}
function paintC(c, heroId, cx, fy, w, t, live) {
  const k = keyC(w, t, live);
  // the skin under his feet while he rides it, then shot out from under him
  if (w < C.surf) {
    skinSurf(c, cx - 0.05 * U + (k.dx || 0), fy, w);
    dustTrail(c, cx - 0.4 * U, fy, w, 0.02, C.surf, { every: 0.06, life: 0.3, size: 1.5 });
  } else {
    flungSkin(c, w, cx + 0.25 * U, fy - 0.15 * U, 95, -110, 12, fy, C.surf);
    if (w - C.surf < 0.22) dustBurst(c, cx - 0.2 * U, fy, w - C.surf, { n: 4, size: 2, spread: 8 });
  }
  body(c, heroId, cx, fy, k, t);
}
// The skin flat on the road under both feet: a ribbon of yellow and cream, tipped up at the front.
function skinSurf(c, x, fy, w) {
  c.save();
  c.translate(x, fy - 0.5);
  c.rotate(0.05 * Math.sin(w * 15));
  c.scale(1.9, 1.7);
  skinScrapFlat(c);
  c.restore();
}
function skinScrapFlat(c) {
  c.beginPath();
  c.moveTo(-3.2, 0); c.quadraticCurveTo(-0.5, -1.15, 3.4, -0.35); c.quadraticCurveTo(0.4, 0.2, -3.2, 0); c.closePath();
  c.fillStyle = PEEL.main; c.fill();
  c.beginPath();
  c.moveTo(-3.0, -0.02); c.quadraticCurveTo(0, -0.3, 3.0, -0.3); c.quadraticCurveTo(0.4, 0.18, -3.0, -0.02); c.closePath();
  c.fillStyle = PEEL.cream; c.fill();
  c.beginPath(); c.moveTo(3.4, -0.35); c.lineTo(2.4, -0.5); c.lineTo(2.5, -0.05); c.closePath();
  c.fillStyle = PEEL.tip; c.fill();
  c.beginPath();
  c.moveTo(-3.2, 0); c.quadraticCurveTo(-0.5, -1.15, 3.4, -0.35); c.quadraticCurveTo(0.4, 0.2, -3.2, 0); c.closePath();
  c.strokeStyle = PEEL.ink; c.lineWidth = 0.14; c.lineJoin = 'round'; c.stroke();
}

// ---- D — FACEPLANT: the skin shoots out BACKWARDS and he goes the other way — pitched
// forward, arms out in front, flat on his front and sliding on his chest along the road in a
// spray of dust, chin up at the end, then pushing himself off.
const D = { fall: 0.2, push: 0.72, T: 0.98 };
const PRONE = { hands: [[-0.88, -0.28], [-0.82, -0.36]], feet: [[-0.26, -0.03], [0.12, -0.14]], ankles: [-0.15, -0.5] };
function keyD(w, t, live) {
  let rot, H, dx = 0, pose;
  if (w < D.fall) {
    const q = w / D.fall;
    rot = 1.57 * easeIn(q) ** 0.8;
    H = lerp(STAND_H, 0.17, easeIn(q)) + 0.2 * Math.sin(q * Math.PI);
    dx = 0.2 * U * q;
    pose = feetClear(H, rot) ? backpedal(t, w, live, BACK_RATE * w, [swing(5.0), swing(5.5)]) : mk(t, PRONE);
  } else if (w < D.push) {
    const e = w - D.fall;
    rot = 1.57 - 0.12 * ease(clamp01((e - 0.34) / 0.18));
    H = 0.17 + (e < 0.07 ? 0.08 * Math.sin((e / 0.07) * Math.PI) : 0);
    dx = lerp(0.2 * U, 0.7 * U, easeOut(clamp01(e / 0.4)));
    pose = mk(t, PRONE, e > 0.3 ? OUCH : SCARED);
  } else {
    return getUp(clamp01((w - D.push) / (D.T - D.push)), { rot: 1.45, H: 0.17, dx: 0.7 * U }, t, live);
  }
  return { rot, H, dx, pose };
}
function paintD(c, heroId, cx, fy, w, t, live) {
  const k = keyD(w, t, live);
  flungSkin(c, w, cx + 0.2 * U, fy - 0.1 * U, -55, -120, -13, fy);
  const [bx] = bodyPoint(cx, fy, k, 0.1, -0.5);
  dustTrail(c, cx + (k.dx || 0) + 0.7 * U, fy, w, D.fall, D.push - 0.12, { every: 0.04, life: 0.4, size: 2.4 });
  if (w >= D.fall && w < D.fall + 0.2) dustBurst(c, cx + 0.8 * U, fy, w - D.fall, { dir: 1, n: 5, size: 2.4, spread: 13 });
  body(c, heroId, cx, fy, k, t);
  void bx;
}

// ---- E — HANG TIME: straight up. The skin fires him into the air backpedalling, his legs
// running down to a stop at the top, a beat there with a "!" while he works it out, then
// gravity: down onto his seat with a squash, a bounce and a stunned sit.
const E = { up: 0.3, hang: 0.52, land: 0.7, push: 0.84, T: 0.98 };
const TOP = 1.3;
// Strides of backwards by w: full speed on the way up, running down to nothing over the hang.
function spunE(w) {
  if (w < E.up) return BACK_RATE * w;
  const D_ = E.hang - E.up, e = Math.min(w - E.up, D_);
  return BACK_RATE * (E.up + e - e * e / (2 * D_));
}
function keyE(w, t, live) {
  let rot, H, dx = 0, sx = 1, sy = 1, pose;
  if (w < E.up) {
    const q = w / E.up;
    H = lerp(STAND_H, TOP, Math.sin(q * Math.PI / 2));
    rot = -0.5 * ease(q);
    dx = -0.15 * U * q;
    const p = t * 34;
    pose = backpedal(t, w, live, spunE(w), [swing(0.5 + 0.4 * Math.sin(p * 0.6)), swing(0.8 + 0.4 * Math.sin(p * 0.6 + 2))]);
  } else if (w < E.hang) {
    const e = w - E.up;
    H = TOP + 0.05 * Math.sin(e * 14);
    rot = -0.5 + 0.06 * Math.sin(e * 11);
    dx = -0.15 * U;
    pose = backpedal(t, w, live, spunE(w), [swing(0.3), swing(0.6)]);
  } else if (w < E.land) {
    const q = (w - E.hang) / (E.land - E.hang);
    H = lerp(TOP, 0.17, easeIn(q));
    rot = lerp(-0.5, SIT_ROT, easeIn(q));
    dx = -0.15 * U;
    // legs held where they stopped; down onto the seat
    pose = feetClear(H, rot) ? backpedal(t, w, live, spunE(w), [swing(0.3), swing(0.6)]) : mk(t, SIT);
  } else if (w < E.push) {
    const e = w - E.land;
    rot = SIT_ROT;
    H = 0.17;
    dx = -0.15 * U;
    if (e < 0.08) { const q = e / 0.08; sx = lerp(1, 1.1, Math.sin(q * Math.PI)); sy = lerp(1, 0.9, Math.sin(q * Math.PI)); }
    if (e >= 0.08 && e < 0.2) H += 0.18 * Math.sin(((e - 0.08) / 0.12) * Math.PI);
    pose = mk(t, SIT, OUCH);
  } else {
    return getUp(clamp01((w - E.push) / (E.T - E.push)), { rot: SIT_ROT, H: 0.17, dx: -0.15 * U }, t, live);
  }
  return { rot, H, dx, sx, sy, pose };
}
// "!" over his head at the top of a launch, a sweat-drop beneath it — shared by E and G.
function bangMark(c, hx, hy, a) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a;
  c.fillStyle = '#ffffff'; c.strokeStyle = '#2a2226'; c.lineWidth = 0.7; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(hx - 0.7, hy - 5.8); c.lineTo(hx + 0.7, hy - 5.8); c.lineTo(hx + 0.45, hy - 2.1); c.lineTo(hx - 0.45, hy - 2.1); c.closePath();
  c.fillStyle = '#e0483c'; c.fill(); c.stroke();
  c.beginPath(); c.arc(hx, hy - 0.8, 0.65, 0, TAU); c.fill(); c.stroke();
  c.restore();
}
function paintE(c, heroId, cx, fy, w, t, live) {
  const k = keyE(w, t, live);
  flungSkin(c, w, cx + 0.2 * U, fy - 0.1 * U, 20, -210, 16, fy);
  body(c, heroId, cx, fy, k, t);
  if (w >= E.up + 0.02 && w < E.hang + 0.04) {
    const [hx, hy] = bodyPoint(cx, fy, k, 0.0, -1.1);
    bangMark(c, hx, hy, clamp01((w - E.up - 0.02) / 0.04) * (1 - clamp01((w - E.hang) / 0.04)));
  }
  const e = w - E.land;
  if (e > 0) {
    dustBurst(c, cx - 0.3 * U, fy, e, { n: 6, size: 2.6, spread: 15 });
    lines(c, cx - 0.3 * U, fy - 0.2 * U, 5, 10, [-Math.PI * 0.95, -Math.PI * 0.7, -Math.PI * 0.45, -Math.PI * 0.2], 1 - clamp01(e / 0.2));
  }
  if (w >= E.land + 0.1 && w < E.push) stunned(c, bodyPoint(cx, fy, k, 0.0, -1.0), t, clamp01((w - E.land - 0.1) / 0.04) * (1 - clamp01((w - E.push + 0.06) / 0.06)));
}

// ---- G — HANG TIME, LANDS RUNNING, and H — the same shape with LESS of it (Peter, 17 Oct:
// "do one with slightly less air time"). Same big launch and the "!" at the top, but instead
// of coming down onto his seat, his legs blur into a fast run on the way down (F's trick) and
// he lands already mid-stride. One shape (`keyHangRun`/`paintHangRun`), parameterized by how
// high he goes and how long each leg of the arc takes — G at E's own height, H a notch under.
function keyHangRun(w, t, live, cfg) {
  let H, rot, dx;
  if (w < cfg.up) {
    const q = w / cfg.up;
    H = lerp(STAND_H, cfg.top, Math.sin(q * Math.PI / 2));
    rot = -0.5 * ease(q);
    dx = -0.15 * U * q;
  } else if (w < cfg.hang) {
    const e = w - cfg.up;
    H = cfg.top + 0.05 * Math.sin(e * 14);
    rot = -0.5 + 0.06 * Math.sin(e * 11);
    dx = -0.15 * U;
  } else {
    const q = clamp01((w - cfg.hang) / (cfg.down - cfg.hang));
    const up = ease(q);
    H = lerp(cfg.top, STAND_H, easeIn(q));
    rot = lerp(-0.5, 0, up);
    dx = lerp(-0.15 * U, 0, up);
  }
  const spin = (w * SPIN_RATE) % 1;
  const livePhase = live?.phase ?? spin;
  const bq = clamp01((w - (cfg.T - LAND_BLEND)) / LAND_BLEND);
  const phase = bq > 0 ? blendPhase(spin, livePhase, bq) : spin;
  const pose = { kind: 'run', phase, time: t, grounded: true, facing: 1, ...(w < cfg.hang + 0.02 ? SCARED : {}) };
  return { rot, H, dx, pose };
}
function paintHangRun(c, heroId, cx, fy, w, t, live, cfg) {
  const k = keyHangRun(w, t, live, cfg);
  flungSkin(c, w, cx + 0.2 * U, fy - 0.1 * U, 20, -210 * (cfg.top / TOP), 16, fy);
  body(c, heroId, cx, fy, k, t);
  if (w >= cfg.up + 0.02 && w < cfg.hang + 0.04) {
    const [hx, hy] = bodyPoint(cx, fy, k, 0.0, -1.1);
    bangMark(c, hx, hy, clamp01((w - cfg.up - 0.02) / 0.04) * (1 - clamp01((w - cfg.hang) / 0.04)));
  }
  const e = w - cfg.down;
  if (e > -0.03 && e < 0.15) {
    dustBurst(c, cx - 0.15 * U, fy, Math.max(0, e), { n: 5, size: 2.2, spread: 11, life: 0.22 });
    lines(c, cx - 0.15 * U, fy - 0.2 * U, 4, 8, [-Math.PI * 0.9, -Math.PI * 0.65, -Math.PI * 0.4, -Math.PI * 0.15], 1 - clamp01(Math.max(0, e) / 0.15));
  }
}
const G = { top: TOP, up: E.up, hang: E.hang, down: E.hang + 0.22, T: E.hang + 0.3 };
function paintG(c, heroId, cx, fy, w, t, live) { paintHangRun(c, heroId, cx, fy, w, t, live, G); }
// A notch under G: about three quarters of the height, timed to match (apex time scales with
// the square root of the height a launch reaches).
const H_ARC = { top: TOP * 0.6, up: E.up * 0.775, hang: E.hang * 0.775, down: E.hang * 0.775 + 0.18, T: E.hang * 0.775 + 0.25 };
function paintH(c, heroId, cx, fy, w, t, live) { paintHangRun(c, heroId, cx, fy, w, t, live, H_ARC); }

// ---- F — SCRAMBLE RECOVERY: the skin fires him up same as E, but he never goes down. His own
// legs blur through a fast forward cycle while he's airborne — "running on air" — and he comes
// down already mid-stride, straight back into the live run with no stumble, no sit, no fall.
// Peter, 17 Oct: "a variant of E where the legs spin but they never actually fall but land on
// their feet and keep running". Reuses the real run gait throughout (toons.js's own knees),
// not an authored dance — the one candidate that never needs `backpedal`/`getUp` at all.
const F = { peak: 0.18, land: 0.4, T: 0.46 };
const SPIN_RATE = 9.5;          // legs/second while he's up — a blur, not a count
const LAND_BLEND = 0.12;        // the last beat syncs the blur back to the live phase
// Shortest-arc blend between two 0..1 phases (never spins the long way round for a close pick).
function blendPhase(a, b, q) {
  const d = ((((b - a) % 1) + 1.5) % 1) - 0.5;
  return (((a + d * q) % 1) + 1) % 1;
}
function keyF(w, t, live) {
  const arc = clamp01(w / F.land);
  const H = STAND_H + 0.42 * Math.sin(arc * Math.PI);
  const rot = -0.16 * Math.sin(arc * Math.PI);
  const dx = -0.08 * U * Math.sin(arc * Math.PI);
  const spin = (w * SPIN_RATE) % 1;
  const livePhase = live?.phase ?? spin;
  const bq = clamp01((w - (F.T - LAND_BLEND)) / LAND_BLEND);
  const phase = bq > 0 ? blendPhase(spin, livePhase, bq) : spin;
  const face = w < F.peak ? SCARED : {};
  const pose = { kind: 'run', phase, time: t, grounded: true, facing: 1, ...face };
  return { rot, H, dx, pose };
}
function paintF(c, heroId, cx, fy, w, t, live) {
  const k = keyF(w, t, live);
  flungSkin(c, w, cx + 0.2 * U, fy - 0.1 * U, 20, -200, 16, fy);
  // a couple of swirl marks behind the blurring feet, selling the spin
  if (w < F.land) {
    const [bx, by] = bodyPoint(cx, fy, k, -0.05, -0.05);
    const a = 1 - clamp01((w - F.land + 0.1) / 0.1);
    c.save(); c.globalAlpha *= 0.7 * a;
    c.strokeStyle = '#efe9da'; c.lineWidth = 0.8; c.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      const ang0 = t * 40 + i * Math.PI;
      c.beginPath(); c.arc(bx, by, 5 + i * 1.6, ang0, ang0 + 1.6); c.stroke();
    }
    c.restore();
  }
  body(c, heroId, cx, fy, k, t);
  const e = w - F.land;
  if (e > -0.03 && e < 0.12) {
    dustBurst(c, cx - 0.1 * U, fy, Math.max(0, e), { n: 3, size: 1.8, spread: 7, life: 0.2 });
  }
}

// ---- NOW: the shipped slip, restated from game/draw.js (`slipAngle`): the figure tipped back
// about his heels, one sine over SLIP_T, the run cycle going on underneath. Keep in step.
function paintNow(c, heroId, cx, fy, w, t, live) {
  const ang = Math.sin(clamp01(w / SLIP_T) * Math.PI) * 0.62;
  c.save();
  c.translate(cx, fy); c.rotate(-ang); c.translate(-cx, -fy);
  drawToon(c, heroId, live || runPose(t), cx, fy, U);
  c.restore();
}

export const SLIP_NOW = { letter: 'NOW', id: 'now', name: 'the shipped slip', T: SLIP_T, holdBlink: false, paint: paintNow,
  note: `What the slip is today: the whole figure tips back 0.62 rad about his heels and returns, one sine over ${SLIP_T}s, the run cycle still going underneath, and the i-frame blink flickers through it. Rig-independent and nothing else.` };

export const SLIP_CANDIDATES = [
  { letter: 'A', id: 'feet-out', name: 'FEET OUT', T: A.T, paint: paintA,
    note: 'The classic. The heel catches the skin, both feet go out from under him and he goes flat in the air — arms and legs flailing, the skin thrown off his foot — hangs a beat, then comes down on his back with a thump, a dust puff and a bounce. He lies stunned with stars round his head, then springs up. Longest; the most complete pratfall.' },
  { letter: 'B', id: 'butt-skid', name: 'BUTT SKID', T: B.T, paint: paintB,
    note: 'Barely leaves the ground. The feet go out and he sits down hard and skates on his seat, propped on his hands, legs out in front, a plume of dust off his behind, the skin skittering off ahead of him; a wince as it runs out, then he pushes up.' },
  { letter: 'C', id: 'peel-surf', name: 'PEEL SURF', T: C.T, paint: paintC,
    note: 'He stays on his feet. Both land on the skin and it carries him on — knees bent, leaning back, arms going round like windmills, wobbling harder and harder — until it shoots out from under him and he sits down on the road.' },
  { letter: 'D', id: 'faceplant', name: 'FACEPLANT', T: D.T, paint: paintD,
    note: 'The skin goes out backwards and he goes the other way: pitched forward, arms out in front, flat on his chest and sliding along the road in a spray of dust, chin up at the end, then pushing himself off. The only one that falls forward.' },
  { letter: 'E', id: 'hang-time', name: 'HANG TIME', T: E.T, paint: paintE,
    note: 'Straight up. The skin fires him into the air with his legs going like a bicycle, he hangs at the top with a “!” while he works it out, then gravity: down onto his seat with a squash, a bounce and a stunned sit with stars.' },
  { letter: 'F', id: 'scramble-recovery', name: 'SCRAMBLE RECOVERY', T: F.T, paint: paintF,
    note: 'The one that never goes down. Same launch as E, but his legs blur through a fast run cycle while he’s up in the air — running on nothing — and he comes down already mid-stride, straight back into the run with no stumble, no sit, no fall. The whole thing is under half a second.' },
  { letter: 'G', id: 'hang-lands-running', name: 'HANG TIME, LANDS RUNNING', T: G.T, paint: paintG,
    note: 'E’s full airtime — the same launch, the same height, the same “!” at the top — but coming down his legs blur into a run instead of landing on his seat, and he touches down already mid-stride. The height of E with the no-fall recovery of F.' },
  { letter: 'H', id: 'hop-lands-running', name: 'HOP, LANDS RUNNING', T: H_ARC.T, paint: paintH,
    note: 'G with slightly less air under it — about three quarters the height, same shape and timing scaled to match. Still a real hop with a “!” at the top, lands running the same way.' },
];

// ---------------------------------------------------------------- the tile
// The hit-pictures tile (hit-effect-candidates.js) with the real peel: one cabinet at in-run
// size, two strips, two heroes each, every hero running into his own peel at the same moment,
// on a loop. Around him the run's ordinary hit — the red knock burst, the shake, the 0.08s
// hitstop, the i-frame blink — identical on every tile.
const P = 2.8;
const T_HIT = 0.7;
const IFRAMES = 1.4, HITSTOP = 0.08;
const HERO_XS = [60, 172];
function knock(c, x, y, e) {
  for (let i = 0; i < 16; i++) {
    const life = 0.6 * (0.6 + 0.6 * hash(i * 4.1 + 9));
    if (e > life) continue;
    const a = hash(i * 1.3 + 9) * Math.PI * 2, s = 90 * (0.4 + 0.6 * hash(i * 2.9 + 9));
    const px = x + Math.cos(a) * s * e - SCROLL * e, py = y + (Math.sin(a) * s - 27) * e + 70 * e * e;
    c.fillStyle = `rgba(224,72,72,${1 - e / life})`; c.fillRect(px - 1, py - 1, 2, 2);
  }
}
let PEEL_OB = null;
const peelOb = () => PEEL_OB || (PEEL_OB = makeObstacle('bananaPeel', 0));

export function drawSlipTile(ctx, t, candId, cabinet, strips, heroes) {
  const cand = candId === 'now' ? SLIP_NOW : SLIP_CANDIDATES.find((x) => x.id === candId);
  const base = peelOb();
  const tl = ((t % P) + P) % P, loop = Math.floor(t / P);
  const frozen = Math.min(Math.max(tl - T_HIT, 0), HITSTOP);
  const g = tl - frozen;
  const w = tl - T_HIT;
  const e = Math.max(0, g - T_HIT);
  let sx = 0, sy = 0;
  if (w >= 0 && w < 0.3) {
    const p = 5 * Math.min(1, (0.3 - w) * 4), n = Math.floor(t * 60);
    sx = (hash(n) * 2 - 1) * p; sy = (hash(n + 0.5) * 2 - 1) * p;
  }
  ctx.save();
  ctx.translate(sx, sy);
  let lane = 0;
  drawCabinetLane(ctx, loop * (P - HITSTOP) + g, cabinet, strips, (c, tt) => {
    const pair = heroes.slice(lane * 2, lane * 2 + 2);
    lane++;
    pair.forEach((heroId, i) => {
      const hx = HERO_XS[i];
      const ob = { ...base, x: hx + 4 + SCROLL * (T_HIT - g) };
      drawSoftContactShadow(c, hx, GROUND_Y + 0.5, U * 0.3, U * 0.07, { alpha: 0.34 });
      if (ob.x > -40) drawWorldEntity(c, ob, 0, tt, null, {});
      if (w >= 0) knock(c, hx + 6, GROUND_Y - 8, e);
      const blink = w >= 0 && e < IFRAMES && blinkOff(t);
      const inPic = w >= 0 && w < cand.T;
      if (inPic) {
        // The shipped slip lets the blink flicker through it; a picture holds the blink back.
        if (cand.holdBlink === false && blink) { /* hidden this frame, as in the run */ } else cand.paint(c, heroId, hx, GROUND_Y, w, t, runPose(g));
      } else if (!(blink && w >= 0)) drawToon(c, heroId, runPose(g), hx, GROUND_Y, U);
    });
  }, { hero: null });
  ctx.restore();
}
