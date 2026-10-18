// THE BANANA PEEL'S SLIP (17 Oct 2026). Peter's pick from the lab bake-off (`banana-slip-
// bakeoff`, src/dev/banana-slip-candidates.js, which still holds the seven that didn't ship):
// a real hop, not a tip-back-and-return. The skin fires him up, his legs blur through a fast
// run cycle while he's airborne, and he lands already mid-stride — no fall, no sit, no stumble
// animation to wait out separately. "HOP, LANDS RUNNING" at a notch under the full "hang time"
// height (0.6 of it): Peter wanted the big air of a full launch but landing on his feet, then
// asked for less air twice over.
//
// A PICTURE, NOT A MOVE — the live wire's rule (zap.js): the run does not know. The hero keeps
// his speed, his spot and his hitbox; the hit is the ordinary one (battery cell, shake, i-
// frames, the slide whistle, BANANA. CLASSIC. — run.js `slip()`). Drawn the way the zap and the
// blast are: his own toon in an offscreen layer, turned about his hips and put back, so the
// pratfall is one move on every rig rather than an authored pose per hero.
//
// SLIP_T (player.js) is this picture's own length: the stumble it drives — slowed, no jump —
// ends exactly when he's back in stride, because by then he already is.
import { drawToon } from './toons.js';
import { layer, blit, zapHash } from './zap.js';
import { HIT_KIT } from './hitPictures.js';

const { U, bigBox } = HIT_KIT;
const hash = zapHash;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, q) => a + (b - a) * q;
const ease = (q) => q * q * (3 - 2 * q);           // smoothstep
const easeIn = (q) => q * q;
const easeOut = (q) => 1 - (1 - q) ** 3;
const SCROLL = 110;

// The arc: how high (APEX, in U above standing) and how long each leg of the launch takes.
// 0.6 of the full "hang time" height this was picked from, timed to match (apex time scales
// with the square root of the height a launch reaches) — see banana-slip-candidates.js's G/H,
// whose exact numbers these are (`keyHangRun`/`H_ARC`).
const APEX = 1.3 * 0.6;
const UP = 0.3 * 0.775, HANG = 0.52 * 0.775, DOWN = HANG + 0.18, T = HANG + 0.25;
export const SLIP_T = T;

const SPIN_RATE = 9.5;          // legs/second while he's up — a blur, not a count
const LAND_BLEND = 0.12;        // the last beat syncs the blur back to the live run phase
const SCARED = { faceSurprised: true, browRaise: true };

// ------------------------------------------------------------------ the skin
// One strip of peel, the shipped peel's own palette (props.js bananaPeel, RIPE): yellow
// outside, cream inside, a browned point. Flung off a foot, it is the proof the peel did it.
const PEEL = { main: '#f6c414', cream: '#fbe7ae', tip: '#4e3214', ink: 'rgba(122,80,10,0.8)' };
function skinScrap(c, x, y, rot) {
  c.save();
  c.translate(x, y); c.rotate(rot);
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
// The scrap thrown from his foot, in the world: leaves at (x0, y0) with (vx, vy) relative to
// the road, which is itself going by at SCROLL. Lands, then rides the road back with it.
function flungSkin(c, w, x0, y0, vx, vy, spin, floor) {
  if (w < 0) return;
  const G = 300;
  const y = y0 + vy * w + 0.5 * G * w * w;
  if (y >= floor) {
    const disc = vy * vy + 2 * G * (floor - y0);
    const eL = (-vy + Math.sqrt(Math.max(0, disc))) / G;
    const x = x0 + vx * eL - SCROLL * w;
    skinScrap(c, x, floor - 0.4, spin * eL + 0.25);
    return;
  }
  skinScrap(c, x0 + vx * w - SCROLL * w * 0.55, y, spin * w);
}

// ------------------------------------------------------------------ dust and the "!" beat
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
function dustBurst(c, x, fy, e, n = 5, life = 0.22, size = 2.2, spread = 11) {
  if (e < 0 || e > life) return;
  const q = e / life;
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1;
    const k = 0.5 + 0.5 * hash(i * 3.1);
    dust(c, x + side * (3 + spread * k * easeOut(q)) - SCROLL * 0.3 * e, fy - 1.2 - 4 * k * easeOut(q) - 1.5 * q,
      size * (0.5 + 0.7 * k) * (0.5 + 0.8 * q), 0.9 * (1 - q) ** 1.2);
  }
}
// A couple of speed lines off the heel on landing.
function lines(c, x, y, r0, r1, angs, a) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a; c.lineCap = 'round';
  for (const ang of angs) {
    const p0x = x + Math.cos(ang) * r0, p0y = y + Math.sin(ang) * r0;
    const p1x = x + Math.cos(ang) * r1, p1y = y + Math.sin(ang) * r1;
    c.strokeStyle = '#2a2226'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(p0x, p0y); c.lineTo(p1x, p1y); c.stroke();
    c.strokeStyle = '#ffffff'; c.lineWidth = 0.55; c.beginPath(); c.moveTo(p0x, p0y); c.lineTo(p1x, p1y); c.stroke();
  }
  c.restore();
}
// "!" over his head at the top of the launch, a sweat-drop beneath it.
function bangMark(c, hx, hy, a) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a;
  c.fillStyle = '#ffffff'; c.strokeStyle = '#2a2226'; c.lineWidth = 0.7; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(hx - 0.7, hy - 5.8); c.lineTo(hx + 0.7, hy - 5.8); c.lineTo(hx + 0.45, hy - 2.1); c.lineTo(hx - 0.45, hy - 2.1); c.closePath();
  c.fillStyle = '#e0483c'; c.fill(); c.stroke();
  c.beginPath(); c.arc(hx, hy - 0.8, 0.65, 0, Math.PI * 2); c.fill(); c.stroke();
  c.restore();
}

// ------------------------------------------------------------------ the body
// His own toon in a layer, turned `rot` about his hips (negative = tipped back). `H` is the
// height of his hips above the road in U — 0.45 standing. See zap.js's `layer`/`blit`: the
// same offscreen-layer trick the live wire and the dynamite use, so this carries to every rig.
const HIP = { ox: -0.04, oy: -0.45 };
const STAND_H = 0.45;
function body(c, heroId, cx, fy, k) {
  const Px = cx + (k.dx || 0), Py = fy - k.H * U;
  const x = Px - HIP.ox * U, y = Py - HIP.oy * U;
  const paint = (o) => {
    o.save(); o.translate(Px, Py); o.rotate(k.rot); o.translate(-Px, -Py);
    drawToon(o, heroId, k.pose, x, y, U);
    o.restore();
  };
  // A context with no real transform to read (a test stub's getTransform exists
  // but returns nothing usable, so check the result rather than the method) or
  // no DOM gets the plain pose (see zap.js's drawZapHero, the same offscreen-
  // layer trick).
  const m = typeof document !== 'undefined' && c.getTransform && c.getTransform();
  const L = m && Number.isFinite(m.a) ? layer(23, c, bigBox(cx, fy), paint) : null;
  if (!L) paint(c);
  else blit(c, L);
}
function bodyPoint(cx, fy, k, bx, by) {
  const Px = cx + (k.dx || 0), Py = fy - k.H * U;
  const x = Px - HIP.ox * U, y = Py - HIP.oy * U;
  const dx = x + bx * U - Px, dy = y + by * U - Py;
  const cs = Math.cos(k.rot), sn = Math.sin(k.rot);
  return [Px + dx * cs - dy * sn, Py + dx * sn + dy * cs];
}

// Shortest-arc blend between two 0..1 phases (never spins the long way round for a close pick).
function blendPhase(a, b, q) {
  const d = ((((b - a) % 1) + 1.5) % 1) - 0.5;
  return (((a + d * q) % 1) + 1) % 1;
}

// w: seconds since the slip, 0..SLIP_T. `t`: a running clock (the gait and the dust need one
// independent of w). `live`: the run's own pose for this frame, so the moment control is handed
// back the leg phase is already where the real gait wants it.
function keyAt(w, t, live) {
  let H, rot, dx;
  if (w < UP) {
    const q = w / UP;
    H = lerp(STAND_H, APEX, Math.sin(q * Math.PI / 2));
    rot = -0.5 * ease(q);
    dx = -0.15 * U * q;
  } else if (w < HANG) {
    const e = w - UP;
    H = APEX + 0.05 * Math.sin(e * 14);
    rot = -0.5 + 0.06 * Math.sin(e * 11);
    dx = -0.15 * U;
  } else {
    const q = clamp01((w - HANG) / (DOWN - HANG));
    const up = ease(q);
    H = lerp(APEX, STAND_H, easeIn(q));
    rot = lerp(-0.5, 0, up);
    dx = lerp(-0.15 * U, 0, up);
  }
  const spin = (w * SPIN_RATE) % 1;
  const livePhase = live?.phase ?? spin;
  const bq = clamp01((w - (T - LAND_BLEND)) / LAND_BLEND);
  const phase = bq > 0 ? blendPhase(spin, livePhase, bq) : spin;
  const face = w < UP + 0.02 ? SCARED : {};
  const pose = { kind: 'run', phase, time: t, grounded: true, facing: 1, ...face };
  return { rot, H, dx, pose };
}

export function drawBananaSlip(c, heroId, cx, fy, w, t, live) {
  const k = keyAt(w, t, live);
  flungSkin(c, w, cx + 0.2 * U, fy - 0.1 * U, 20, -210 * 0.6, 16, fy);
  body(c, heroId, cx, fy, k);
  if (w >= UP + 0.02 && w < HANG + 0.04) {
    const [hx, hy] = bodyPoint(cx, fy, k, 0.0, -1.1);
    bangMark(c, hx, hy, clamp01((w - UP - 0.02) / 0.04) * (1 - clamp01((w - HANG) / 0.04)));
  }
  const e = w - DOWN;
  if (e > -0.03 && e < 0.15) {
    dustBurst(c, cx - 0.15 * U, fy, Math.max(0, e));
    lines(c, cx - 0.15 * U, fy - 0.2 * U, 4, 8,
      [-Math.PI * 0.9, -Math.PI * 0.65, -Math.PI * 0.4, -Math.PI * 0.15], 1 - clamp01(Math.max(0, e) / 0.15));
  }
}
