// Gallery-only: DYNAMITE IN THE FACE, a bake-off (16 Oct 2026). Peter, of Speed Zone's
// dynamite now going off when you run into it (run.js dynamiteBlast): "can we draw heroes
// differently when they get exploded in their face? like we do for the livewires?"
//
// The live wire's answer (sprites/zap.js, picked from src/dev/zap-candidates.js) is the
// model: for ZAP_T after contact the hero is drawn by a painter of his own instead of the
// running toon, and the i-frame blink waits for it. Every candidate here is that painter
// for the blast — `paint(ctx, heroId, cx, feetY, w, t)`, w = seconds since the hit
// (0..BLAST_T), t a running clock — over the same length, so the hit's shake, hitstop,
// mercy window and sound are untouched (the random-gag rule: only the look varies).
//
// Rig-independent by construction: each one draws the hero's OWN toon (drawToon) into an
// offscreen layer under the caller's transform (zap.js layer()) and works on that picture
// as a whole — sooted, greyed, rotated, cut into ash — so it carries to every hero in the
// cast. The white eyes in the soot are the hero's own: a threshold filter keeps whatever
// was near-white in his face and blacks out the rest, so nobody needs eyes laid out by
// hand. Where a candidate needs to know where the head is (frizz, stars, the cough), it is
// measured once per hero from that same face (faceOf).
//
// Nothing here is wired into the run.
import { drawToon } from '../sprites/toons.js';
import { drawBlastHero, BLAST_T as SHIPPED_BLAST_T } from '../sprites/blast.js';
import { ZAP_T, layer, tint, blit, heroBox, zapHash } from '../sprites/zap.js';
import { drawCabinetLane } from './obstacle-bakeoff-kit.js';
import { makeObstacle } from '../game/entities.js';
import { drawWorldEntity } from '../game/draw.js';
import { GROUND_Y } from '../engine/camera.js';

// Same length as the zap: the blink waits for it exactly as it waits for the jolt.
export const BLAST_T = ZAP_T;
// HERO_DRAW_H (game/draw.js), restated as zap.js does.
const U = 24;
const INK = '#2a2226';
const SOOT = '#2b2528';
const ASH = '#9a948e';
const SMOKE = '#dcd6cf', SMOKE_DK = '#a59d97';
const EMBER = '#f6962c', FLAME_Y = '#f6d33c';
const hash = zapHash;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, q) => a + (b - a) * q;
const easeOut = (q) => 1 - (1 - q) ** 3;

// ---------------------------------------------------------------- poses
// Side-on always (no turn to camera). Standing stiff, the face startled.
const standPose = (t) => ({ kind: 'stand', time: t, grounded: true, facing: 1, faceSurprised: true, browRaise: true });
// Blown back: arms flung behind and down, feet planted — the jolt's seam (dance) with the
// hands thrown the other way.
const blownPose = (t) => ({
  kind: 'jump', time: t, vy: 0, grounded: true, facing: 1, faceSurprised: true, browRaise: true,
  dance: { hands: [[0.75, 0.15], [0.85, 0.1]], feet: [[-0.12, 0], [0.16, 0]], ankles: [0, 0] },
});
// In the air, everything flung out — the jolt's own arms.
const flungPose = (t) => ({
  kind: 'jump', time: t, vy: 0, grounded: true, facing: 1, faceSurprised: true, browRaise: true,
  dance: { hands: [[0.85, -1.0], [0.85, -1.0]], feet: [[-0.22, -0.04], [0.22, -0.02]], ankles: [0.3, -0.3] },
});
const runPose = (t) => ({ kind: 'run', phase: (t * 1.7) % 1, time: t, grounded: true, facing: 1 });

// ---------------------------------------------------------------- where the face is
// Measured once per hero off his own standing toon: the centroid of the near-white ink
// above the shoulders is his eyes, the topmost ink is the top of his head. In U from the
// feet, x from the centre line.
const FACE = new Map();
export function faceOf(heroId) {
  if (FACE.has(heroId)) return FACE.get(heroId);
  let face = { ex: 0.01, ey: -0.77, top: -1.03 };
  if (typeof document !== 'undefined') {
    const S = 4, cv = document.createElement('canvas');
    cv.width = 60 * S; cv.height = 50 * S;
    const c = cv.getContext('2d');
    c.setTransform(S, 0, 0, S, 0, 0);
    drawToon(c, heroId, { kind: 'stand', time: 0, grounded: true, facing: 1 }, 30, 40, U);
    const d = c.getImageData(0, 0, cv.width, cv.height).data;
    let sx = 0, sy = 0, n = 0, top = Infinity;
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
      const k = (y * cv.width + x) * 4;
      if (d[k + 3] > 128 && y < top) top = y;
      if (d[k + 3] > 200 && d[k] > 235 && d[k + 1] > 235 && d[k + 2] > 235 && y < (40 - 0.5 * U) * S) { sx += x; sy += y; n++; }
    }
    if (Number.isFinite(top)) face.top = (top / S - 40) / U;
    if (n) { face.ex = (sx / n / S - 30) / U; face.ey = (sy / n / S - 40) / U; }
  }
  FACE.set(heroId, face);
  return face;
}

// ---------------------------------------------------------------- the hero as a picture
// World y → the layer's pixel row (the gallery and the run never rotate the camera).
const rowOf = (L, m, wy) => m.d * wy + m.f - L.y;
const scratch = [];
function scratchFor(i, L) {
  let cv = scratch[i];
  if (!cv) cv = scratch[i] = document.createElement('canvas');
  if (cv.width < L.w || cv.height < L.h) { cv.width = Math.max(cv.width, L.w); cv.height = Math.max(cv.height, L.h); }
  const o = cv.getContext('2d');
  o.setTransform(1, 0, 0, 1, 0, 0);
  o.globalCompositeOperation = 'source-over'; o.globalAlpha = 1; o.filter = 'none';
  o.clearRect(0, 0, cv.width, cv.height);
  return { cv, o };
}
// Soot the hero by `amt`, keeping his own eye whites white. Whites below `whiteRow` (a
// layer pixel row: gloves, socks, cuffs) are sooted with the rest, so only the face shines
// out. The threshold: grey him, scale so near-white lands on 0.5, then contrast pushes
// everything to black or white.
function soot(L, amt, { whiteRow = Infinity, color = SOOT, eyes = true } = {}) {
  if (amt <= 0) return;
  const S = scratchFor(0, L);
  if (eyes) {
    S.o.filter = 'grayscale(1) brightness(0.54) contrast(40)';
    S.o.drawImage(L.cv, 0, 0, L.w, L.h, 0, 0, L.w, L.h);
    S.o.filter = 'none';
    if (whiteRow < L.h) { S.o.globalCompositeOperation = 'source-atop'; S.o.fillStyle = '#000'; S.o.fillRect(0, Math.max(0, whiteRow), L.w, L.h); }
    S.o.globalCompositeOperation = 'lighten'; S.o.fillStyle = color; S.o.fillRect(0, 0, L.w, L.h);
    S.o.globalCompositeOperation = 'destination-in'; S.o.drawImage(L.cv, 0, 0, L.w, L.h, 0, 0, L.w, L.h);
  } else {
    S.o.drawImage(L.cv, 0, 0, L.w, L.h, 0, 0, L.w, L.h);
    S.o.globalCompositeOperation = 'source-atop'; S.o.fillStyle = color; S.o.fillRect(0, 0, L.w, L.h);
  }
  L.o.save(); L.o.globalAlpha = amt; L.o.drawImage(S.cv, 0, 0, L.w, L.h, 0, 0, L.w, L.h); L.o.restore();
}
// The blink in the soot: a lid of soot drawn across the eye row for a couple of frames.
function lid(L, m, cx, fy, face) {
  const y0 = rowOf(L, m, fy + (face.ey - 0.07) * U), y1 = rowOf(L, m, fy + (face.ey + 0.07) * U);
  L.o.save(); L.o.globalCompositeOperation = 'source-atop'; L.o.fillStyle = SOOT;
  L.o.fillRect(0, y0, L.w, y1 - y0); L.o.restore();
}
// Heroes have a soft contact shadow under them in the run; the gallery lane has none, so
// nothing to do here — but a layer the size of heroBox clips anyone thrown up or tipped
// over, so the candidates that move him pass a bigger box.
const bigBox = (cx, fy) => [cx - 1.4 * U, fy - 2.2 * U, cx + 1.4 * U, fy + 0.35 * U];

// ---------------------------------------------------------------- dressing
// A flat cartoon puff: three lobes, light fill, a soft ink edge, fading out.
function puff(c, x, y, r, a, dark = false) {
  if (a <= 0 || r <= 0) return;
  c.save();
  c.globalAlpha *= a;
  c.fillStyle = dark ? '#4a4246' : SMOKE; c.strokeStyle = dark ? '#1c171a' : SMOKE_DK; c.lineWidth = 0.45;
  const lobes = [[0, 0, 1], [-0.7, 0.25, 0.7], [0.65, 0.3, 0.72]];
  c.beginPath();
  for (const [dx, dy, s] of lobes) { c.moveTo(x + dx * r + s * r, y + dy * r); c.arc(x + dx * r, y + dy * r, s * r, 0, Math.PI * 2); }
  c.stroke(); c.fill();
  c.restore();
}
// Smoke curling off the top of him: puffs born on a clock, rising, drifting back.
function wisps(c, cx, topY, w, { from = 0.05, until = 0.5, every = 0.07, dark = false, k0 = 0 } = {}) {
  for (let k = 0; k < 12; k++) {
    const born = from + k * every;
    if (born > until || w < born) continue;
    const age = w - born, life = 0.45;
    if (age > life) continue;
    const q = age / life;
    const x = cx + (hash(k + k0) - 0.5) * 0.35 * U - 7 * q;
    const y = topY - 2 - 11 * q;
    puff(c, x, y, 1.1 + 2.2 * q, 0.9 * (1 - q) ** 1.2, dark);
  }
}
// A five-point star, mustard, inked.
function star(c, x, y, r, rot) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
  c.fillStyle = FLAME_Y; c.fill();
  c.strokeStyle = INK; c.lineWidth = 0.4; c.lineJoin = 'round'; c.stroke();
}
// Dazed: three stars running round an ellipse over his head, the far side behind it.
function haloStars(c, x, y, t, a, front) {
  c.save(); c.globalAlpha *= a;
  for (let i = 0; i < 3; i++) {
    const ang = t * 7 + i * Math.PI * 2 / 3;
    const isFront = Math.sin(ang) > 0;
    if (isFront !== front) continue;
    star(c, x + Math.cos(ang) * 0.32 * U, y + Math.sin(ang) * 0.09 * U, 2.1 + (isFront ? 0.4 : 0), t * 5 + i);
  }
  c.restore();
}
// Hair blown on end: charcoal spikes radiating from behind the head, ember tips.
function frazzle(c, hx, hy, rad, amt, t) {
  if (amt <= 0) return;
  c.save(); c.lineJoin = 'round';
  const n = 11;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI * (0.02 + 0.96 * i / (n - 1)) + (hash(i + Math.floor(t * 24)) - 0.5) * 0.14;
    const r0 = rad * 0.75, r1 = (rad * 1.55 + 0.1 * U * hash(i * 3.3)) * amt + r0 * (1 - amt);
    const half = 0.17;
    c.beginPath();
    c.moveTo(hx + Math.cos(a - half) * r0, hy + Math.sin(a - half) * r0);
    c.lineTo(hx + Math.cos(a) * r1, hy + Math.sin(a) * r1);
    c.lineTo(hx + Math.cos(a + half) * r0, hy + Math.sin(a + half) * r0);
    c.closePath();
    c.fillStyle = '#3a3034'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.4; c.stroke();
    if (hash(i * 7.7) < 0.45) {
      c.fillStyle = hash(i + Math.floor(t * 18)) < 0.5 ? EMBER : FLAME_Y;
      c.beginPath(); c.arc(hx + Math.cos(a) * r1, hy + Math.sin(a) * r1, 0.55, 0, Math.PI * 2); c.fill();
    }
  }
  c.restore();
}
// A smoke ring rising off the scalp.
function ring(c, x, y, q) {
  if (q <= 0 || q >= 1) return;
  c.save();
  c.globalAlpha *= (1 - q) ** 0.8;
  c.strokeStyle = SMOKE_DK; c.lineWidth = 1.5;
  c.beginPath(); c.ellipse(x - 2 * q, y - 9 * q, 1.6 + 3 * q, 0.6 + 1 * q, 0, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = SMOKE; c.lineWidth = 0.8; c.stroke();
  c.restore();
}

// ---------------------------------------------------------------- the candidates
// Every painter: (c, heroId, cx, fy, w, t). w runs 0..BLAST_T; after that the run draws
// him running again and blinks as it does for any hit. `after` (optional) is anything
// the candidate leaves hanging over the blink — C's stars.

// A — THE CLASSIC. Stood there charred black, two white eyes blink once, smoke off the top.
function paintCharred(c, heroId, cx, fy, w, t) {
  const face = faceOf(heroId);
  const m = c.getTransform();
  const L = layer(10, c, heroBox(cx, fy), (o) => drawToon(o, heroId, standPose(t), cx, fy, U));
  if (w < 0.04) { tint(L, '#fffbe8'); blit(c, L, { glow: '#ffd27a', blur: 6 }); return; }
  // The soot drops off him at the end, top first, in the last 0.08s.
  const off = clamp01((w - 0.42) / 0.08);
  soot(L, 0.96, { whiteRow: rowOf(L, m, fy + (face.ey + 0.12) * U) });
  if (w > 0.26 && w < 0.31) lid(L, m, cx, fy, face);
  if (off > 0) {
    // what he looked like before, uncovered from the head down
    const R = layer(11, c, heroBox(cx, fy), (o) => drawToon(o, heroId, standPose(t), cx, fy, U));
    const y = rowOf(L, m, fy + (face.top - 0.05) * U) + (L.h - rowOf(L, m, fy + (face.top - 0.05) * U)) * off;
    L.o.save(); L.o.globalCompositeOperation = 'source-over';
    L.o.drawImage(R.cv, 0, 0, L.w, Math.max(1, y), 0, 0, L.w, Math.max(1, y));
    L.o.restore();
  }
  blit(c, L);
  wisps(c, cx + face.ex * U, fy + face.top * U, w, { from: 0.05, until: 0.4, every: 0.06 });
  // the soot that came off, dropping
  if (off > 0) for (let k = 0; k < 10; k++) {
    const x = cx + (hash(k * 2.7) - 0.5) * 0.55 * U, y0 = fy - (0.15 + 0.75 * hash(k * 5.1)) * U;
    const y = Math.min(fy - 0.4, y0 + 40 * off * off);
    c.fillStyle = SOOT; c.fillRect(x - 0.5, y - 0.5, 1.1, 1.1);
  }
}

// B — FRAZZLED. Rocked back on his heels, hair blown on end with embers in it, the face
// blacked (eyes white), soot smudged over the clothes, a smoke ring off the scalp.
function paintFrazzled(c, heroId, cx, fy, w, t) {
  const face = faceOf(heroId);
  const m = c.getTransform();
  const q = w / BLAST_T;
  const lean = -0.2 * easeOut(clamp01(w / 0.06)) * (1 - clamp01((q - 0.75) / 0.25)) + 0.04 * Math.sin(w * 40) * (1 - q);
  const hx = cx + face.ex * U - 0.03 * U, hy = fy + (face.ey + face.top) * 0.5 * U;
  const rad = (face.ey - face.top) * U * 1.05;
  const L = layer(10, c, bigBox(cx, fy), (o) => {
    o.save();
    o.translate(cx, fy); o.rotate(lean); o.translate(-cx, -fy);
    frazzle(o, hx, hy, rad, Math.min(1, w / 0.05), t);
    drawToon(o, heroId, blownPose(t), cx, fy, U);
    o.restore();
  });
  if (w < 0.035) { tint(L, '#fffbe8'); blit(c, L, { glow: '#ffd27a', blur: 6 }); return; }
  // Face black, clothes smudged: the soot heavier at the top, where the blast hit.
  const S = scratchFor(1, L);
  S.o.drawImage(L.cv, 0, 0, L.w, L.h, 0, 0, L.w, L.h);
  soot(L, 0.92, { whiteRow: rowOf(L, m, fy + (face.ey + 0.12) * U) });
  // put the body's own colours back below the chin, then smudge them
  const chin = rowOf(L, m, fy + (face.ey + 0.16) * U);
  L.o.save();
  L.o.drawImage(S.cv, 0, chin, L.w, L.h - chin, 0, chin, L.w, L.h - chin);
  L.o.globalCompositeOperation = 'source-atop';
  L.o.globalAlpha = 0.55; L.o.fillStyle = SOOT;
  for (let k = 0; k < 6; k++) {
    const x = (0.3 + 0.4 * hash(k * 3.1)) * L.w, y = chin + (0.05 + 0.6 * hash(k * 4.3)) * (L.h - chin) * 0.8;
    L.o.beginPath(); L.o.ellipse(x, y, (0.03 + 0.03 * hash(k)) * L.w, (0.02 + 0.02 * hash(k + 1)) * L.h, 0, 0, Math.PI * 2); L.o.fill();
  }
  L.o.restore();
  blit(c, L);
  ring(c, hx, fy + face.top * U - 1, clamp01((w - 0.08) / 0.4));
  wisps(c, hx, fy + face.top * U, w, { from: 0.06, until: 0.3, every: 0.08, k0: 5 });
}

// C — FLAT ON HIS BACK. The blast lays him out (heels the pivot, as the pratfall is), he
// lies a beat, springs up dazed with stars going round his head — the stars stay up over
// the blink.
const KO_DOWN = 0.07, KO_UP = 0.3, KO_STAND = 0.4;
function koAngle(w) {
  if (w < KO_DOWN) return -Math.PI / 2 * easeOut(w / KO_DOWN);
  if (w < KO_UP) return -Math.PI / 2 + 0.12 * Math.sin((w - KO_DOWN) / (KO_UP - KO_DOWN) * Math.PI * 3) * (1 - (w - KO_DOWN) / (KO_UP - KO_DOWN));
  if (w < KO_STAND) { const q = (w - KO_UP) / (KO_STAND - KO_UP); return -Math.PI / 2 * (1 - q) + 0.25 * Math.sin(q * Math.PI); }
  return 0.06 * Math.sin((w - KO_STAND) * 30) * (1 - clamp01((w - KO_STAND) / 0.1));
}
function paintFlat(c, heroId, cx, fy, w, t) {
  const face = faceOf(heroId);
  const a = koAngle(w);
  // lying, the body's thickness has to sit on the road, not half in it
  const lift = Math.min(1, -a / (Math.PI / 2)) * 0.14 * U;
  const px = cx - 0.12 * U;  // his heels
  const pose = w < KO_STAND ? flungPose(t) : standPose(t);
  const L = layer(10, c, bigBox(cx, fy), (o) => {
    o.save(); o.translate(px, fy - lift); o.rotate(a); o.translate(-px, -fy);
    drawToon(o, heroId, pose, cx, fy, U);
    o.restore();
  });
  if (w < 0.035) { tint(L, '#fffbe8'); blit(c, L, { glow: '#ffd27a', blur: 6 }); return; }
  soot(L, 0.55);
  blit(c, L);
  if (w > KO_DOWN && w < KO_UP + 0.05) {
    // the head is on the road behind him: a little puff where it landed
    const dx = cx + face.ex * U - px, dy = face.ey * U;
    const hx = px + dx * Math.cos(a) - dy * Math.sin(a), hy = fy - lift + dx * Math.sin(a) + dy * Math.cos(a) + 2;
    const q = clamp01((w - KO_DOWN) / 0.2);
    puff(c, hx - 3, hy - 3 * q, 1.5 + 2.5 * q, 0.8 * (1 - q));
  }
  if (w >= KO_STAND - 0.02) blastStarsAfter(c, heroId, cx, fy, w, t);
}
function blastStarsAfter(c, heroId, cx, fy, w, t) {
  if (w > 1.05) return;
  const face = faceOf(heroId);
  const a = clamp01((w - KO_STAND + 0.02) / 0.06) * (1 - clamp01((w - 0.85) / 0.2));
  const x = cx + face.ex * U, y = fy + (face.top - 0.06) * U;
  haloStars(c, x, y, t, a, true);
  haloStars(c, x, y, t, a * 0.85, false);
}

// D — THE COUGH. Charred, still alight on top; he stands a beat, then one cough doubles
// him over, a puff pops out of his mouth and the flame on his head goes out.
function paintCough(c, heroId, cx, fy, w, t) {
  const face = faceOf(heroId);
  const m = c.getTransform();
  const cough = clamp01((w - 0.22) / 0.06) * (1 - clamp01((w - 0.34) / 0.1));
  const L = layer(10, c, bigBox(cx, fy), (o) => {
    o.save();
    o.translate(cx, fy); o.rotate(0.22 * cough); o.scale(1, 1 - 0.07 * cough); o.translate(-cx, -fy);
    drawToon(o, heroId, standPose(t), cx, fy, U);
    o.restore();
  });
  if (w < 0.04) { tint(L, '#fffbe8'); blit(c, L, { glow: '#ffd27a', blur: 6 }); return; }
  soot(L, 0.9, { whiteRow: rowOf(L, m, fy + (face.ey + 0.12) * U) });
  if (cough > 0.3) lid(L, m, cx, fy, face);
  blit(c, L);
  // Where his head is now, through the cough's bend (about the feet).
  const bend = (x, y) => {
    const a = 0.22 * cough, dx = x - cx, dy = (y - fy) * (1 - 0.07 * cough);
    return [cx + dx * Math.cos(a) - dy * Math.sin(a), fy + dx * Math.sin(a) + dy * Math.cos(a)];
  };
  // Still alight on top until the cough puts it out — then one thin curl of smoke.
  const [tx, ty] = bend(cx + face.ex * U, fy + (face.top + 0.03) * U);
  if (w < 0.25) {
    const fl = 1 + 0.18 * Math.sin(t * 60) + 0.1 * Math.sin(t * 97);
    const grow = easeOut(clamp01((w - 0.04) / 0.05));
    flame(c, tx, ty, 2.2 * grow, 5.2 * fl * grow);
  } else {
    const q = clamp01((w - 0.25) / 0.25);
    c.save(); c.globalAlpha *= 1 - q; c.strokeStyle = SMOKE_DK; c.lineWidth = 0.8; c.lineCap = 'round';
    c.beginPath(); c.moveTo(tx, ty);
    c.bezierCurveTo(tx - 2, ty - 3 - 4 * q, tx + 2, ty - 5 - 6 * q, tx - 1, ty - 8 - 8 * q); c.stroke();
    c.restore();
  }
  // The cough: a puff out of the mouth, rolling forward and up.
  if (w > 0.24) {
    const q = clamp01((w - 0.24) / 0.26);
    const [mx, my] = bend(cx + (face.ex + 0.24) * U, fy + (face.ey + 0.12) * U);
    puff(c, mx + 7 * q, my - 5 * q, 1.6 + 2.8 * easeOut(q), 1 - q * q);
  }
}
// A little flame: ember outside, yellow in, inked, its tip licking.
function flame(c, x, y, w, h) {
  if (h <= 0) return;
  for (const [s, col] of [[1, EMBER], [0.55, FLAME_Y]]) {
    c.beginPath();
    c.moveTo(x - w * s, y);
    c.quadraticCurveTo(x - w * s, y - h * s * 0.55, x + w * 0.2, y - h * s);
    c.quadraticCurveTo(x + w * s * 0.9, y - h * s * 0.5, x + w * s, y);
    c.quadraticCurveTo(x, y + w * s * 0.6, x - w * s, y);
    c.fillStyle = col; c.fill();
    if (s === 1) { c.strokeStyle = INK; c.lineWidth = 0.45; c.lineJoin = 'round'; c.stroke(); }
  }
}

// E — ASH. Turned to a grey ash statue, he crumbles into a heap on the road — two white
// eyes blink out of the heap — and the heap rewinds back into him.
const CELL = 1.6;
function paintAsh(c, heroId, cx, fy, w, t) {
  const face = faceOf(heroId);
  const m = c.getTransform();
  const L = layer(10, c, heroBox(cx, fy), (o) => drawToon(o, heroId, standPose(0), cx, fy, U));
  if (w < 0.04) { tint(L, '#fffbe8'); blit(c, L, { glow: '#ffd27a', blur: 6 }); return; }
  // Ash: grey him, flatten the contrast, keep his eyes.
  const S = scratchFor(1, L);
  S.o.filter = 'grayscale(1) brightness(1.05) contrast(0.55)';
  S.o.drawImage(L.cv, 0, 0, L.w, L.h, 0, 0, L.w, L.h);
  S.o.filter = 'none';
  const eyesRow = rowOf(L, m, fy + (face.ey + 0.12) * U);
  const E = scratchFor(2, L);
  E.o.drawImage(L.cv, 0, 0, L.w, L.h, 0, 0, L.w, L.h);
  L.o.save(); L.o.globalCompositeOperation = 'copy'; L.o.drawImage(S.cv, 0, 0, L.w, L.h, 0, 0, L.w, L.h); L.o.restore();
  L.o.save(); L.o.globalCompositeOperation = 'source-atop'; L.o.globalAlpha = 0.35; L.o.fillStyle = ASH; L.o.fillRect(0, 0, L.w, L.h); L.o.restore();
  // Crumble 0.08–0.22, a heap 0.22–0.36, rewind 0.36–0.46, colour back by 0.5.
  let fall;
  if (w < 0.08) fall = 0;
  else if (w < 0.22) fall = (w - 0.08) / 0.14;
  else if (w < 0.36) fall = 1;
  else fall = 1 - easeOut(clamp01((w - 0.36) / 0.1));
  if (fall <= 0) {
    const back = clamp01((w - 0.46) / 0.04);
    if (back > 0) { L.o.save(); L.o.globalAlpha = back; L.o.drawImage(E.cv, 0, 0, L.w, L.h, 0, 0, L.w, L.h); L.o.restore(); }
    blit(c, L);
    if (w > 0.05 && w < 0.075) return;
    if (back < 1) eyesFrom(c, E, L, m, eyesRow);
    return;
  }
  // The statue in cells; only the ones with ash in them fall. Bottom cells first into a
  // mound at his feet, filling it row by row from the middle out.
  const px = CELL * L.scale, cols = Math.ceil(L.w / px), rows = Math.ceil(L.h / px);
  const alpha = L.o.getImageData(0, 0, L.w, L.h).data;
  const solid = (i, j) => {
    for (const [fx, fy2] of [[0.5, 0.5], [0.2, 0.2], [0.8, 0.8], [0.2, 0.8], [0.8, 0.2]]) {
      const x = Math.min(L.w - 1, Math.floor((i + fx) * px)), y = Math.min(L.h - 1, Math.floor((j + fy2) * px));
      if (alpha[(y * L.w + x) * 4 + 3] > 100) return true;
    }
    return false;
  };
  const cells = [];
  for (let j = rows - 1; j >= 0; j--) for (let i = 0; i < cols; i++) if (solid(i, j)) cells.push([i, j]);
  const floorRow = rowOf(L, m, fy), midX = (m.a * (cx + face.ex * 0.3 * U) + m.e - L.x);
  const step = px * 0.5;                      // packed tighter than they stood: a heap, not a wall
  let row = 0, inRow = 0, width = Math.max(4, Math.ceil(Math.sqrt(2 * cells.length))), topRow = 0;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  for (let n = 0; n < cells.length; n++) {
    if (inRow >= width) { row++; inRow = 0; width = Math.max(2, width - 1); }
    const side = inRow % 2 ? 1 : -1, k = Math.ceil(inRow / 2);
    const restX = midX + side * k * step - px / 2 + (row % 2) * step * 0.5;
    const restY = floorRow - px * 0.9 - row * step * 0.8;
    topRow = restY; inRow++;
    const [i, j] = cells[n];
    const sx = i * px, sy = j * px;
    const delay = 0.35 * (1 - j / rows) * (0.4 + 0.6 * hash(i * 1.7 + j * 3.1));
    const q = clamp01((fall - delay * (fall < 1 && w < 0.3 ? 1 : 0)) / (1 - delay * (w < 0.3 ? 1 : 0)));
    const x = lerp(sx, restX, q), y = lerp(sy, restY, q * q);
    c.drawImage(L.cv, sx, sy, px, px, L.x + x, L.y + y, px + 0.6, px + 0.6);
  }
  c.restore();
  // Two white eyes blink out of the top of the heap.
  if (fall > 0.97 && !(w > 0.29 && w < 0.32)) {
    const hy = (topRow + L.y - m.f) / m.d + 0.5 * CELL, hx = cx + face.ex * 0.3 * U;
    for (const dx of [-0.065, 0.065]) {
      c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 0.3;
      c.beginPath(); c.ellipse(hx + dx * U, hy, 0.05 * U, 0.065 * U, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = INK; c.beginPath(); c.arc(hx + dx * U + 0.015 * U, hy + 0.012 * U, 0.025 * U, 0, Math.PI * 2); c.fill();
    }
  }
  if (w > 0.1 && w < 0.36) wisps(c, cx, fy - 0.5 * U, w, { from: 0.12, until: 0.3, every: 0.05, k0: 3 });
}
// His own eye whites (and pupils) lifted out of the un-greyed copy, on the ash.
function eyesFrom(c, E, L, m, eyesRow) {
  const T = scratchFor(3, L);
  T.o.filter = 'grayscale(1) brightness(0.54) contrast(40)';
  T.o.drawImage(E.cv, 0, 0, L.w, L.h, 0, 0, L.w, L.h);
  T.o.filter = 'none';
  T.o.globalCompositeOperation = 'destination-out'; T.o.fillRect(0, eyesRow, L.w, L.h);
  // keep only the whites: multiply drops the black, screen keeps the white
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'screen';
  c.drawImage(T.cv, 0, 0, L.w, L.h, L.x, L.y, L.w, L.h);
  c.restore();
}

// F — LAUNCHED, SHIPPED 16 Oct 2026 (sprites/blast.js). The sheet paints the shipped
// painter in both soots so the colour can be chosen beside the rest.
function paintLaunched(c, heroId, cx, fy, w, t) { drawBlastHero(c, heroId, cx, fy, w, t, 'charred'); }
function paintLaunchedSmoky(c, heroId, cx, fy, w, t) { drawBlastHero(c, heroId, cx, fy, w, t, 'smoky'); }

export const BLAST_CANDIDATES = [
  { letter: 'A', id: 'charred', name: 'CHARRED',
    note: 'The classic: one white flash, then he stands there burnt black — only his own eye whites showing — blinks once, smoke curling off the top. In the last beat the soot drops off him, head first, and he runs on. Works on any hero as drawn.',
    paint: paintCharred },
  { letter: 'B', id: 'frazzled', name: 'FRAZZLED',
    note: 'Rocked back on his heels, arms flung back: his hair blown on end into charcoal spikes with embers in the tips, his face blacked out to two white eyes, soot smudged over his clothes, a smoke ring rising off his scalp.',
    paint: paintFrazzled },
  { letter: 'C', id: 'flat', name: 'FLAT ON HIS BACK',
    note: 'The blast lays him out flat, heels the pivot (as the pratfall), a puff where his head hits the road; he springs back up half-sooted and dazed, stars going round his head — the stars stay up through the blink.',
    paint: paintFlat, after: blastStarsAfter },
  { letter: 'D', id: 'cough', name: 'THE COUGH',
    note: 'Charred like A, with a little flame still burning on top of his head. He stands a beat, then one cough doubles him over: a puff of smoke pops out of his mouth, his eyes screw shut, and the flame goes out in a thin curl of smoke.',
    paint: paintCough },
  { letter: 'E', id: 'ash', name: 'ASH',
    note: 'Turned to a grey ash statue of himself, he crumbles into a heap on the road — two white eyes blink out of the heap — and then the heap rewinds back up into him and he runs on.',
    paint: paintAsh },
  { letter: 'F', id: 'launched', name: 'LAUNCHED',
    note: 'Blown up and over backwards: one whole turn in the air, charred, flailing, smoke left along the arc; he lands on his feet, the right way round, as it ends. The only one that moves him off his spot.',
    paint: paintLaunched, T: SHIPPED_BLAST_T },
  { letter: 'G', id: 'launchedSmoky', name: 'LAUNCHED — SMOKY GREY',
    note: 'F, SHIPPED, with the soot a smoky grey over his own colours instead of near-black: the same flip and smoke, his features and clothes still showing through.',
    paint: paintLaunchedSmoky, T: SHIPPED_BLAST_T },
];

// ---------------------------------------------------------------- the tile
// Speed Zone at in-run size (the obstacle bake-off kit's lane, zoom 2), two strips, two
// heroes each, every hero running into his own stick of the production dynamite at the
// same moment, on a loop. Around the hero, the hit the run already plays: the stick's own
// blast (dynamiteBlast's fire and smoke), the 5px shake, the 0.08s hitstop and the 1.4s
// mercy blink — identical for every candidate. NOW is that hit with no painter at all.

export const BLAST_NOW = { letter: 'NOW', id: 'now', name: 'the generic hit',
  note: 'What the dynamite does today: the stick goes off (fire, smoke, the boom, a bigger shake), the red knock burst, the 0.08s hitstop and the 1.4s blink. He runs on through it.' };
const SCROLL = 110;           // the kit's own scroll, world px/s (obstacle-bakeoff-kit.js)
const P = 2.6;                // one loop: run in, hit, the effect, the blink, run clear
const T_HIT = 0.7;
const IFRAMES = 1.4, HITSTOP = 0.08;
const HERO_XS = [60, 172];    // two heroes to a strip, far enough apart that no stick passes the other
const STICK = makeObstacle('dynamite', 0);

// The stick's own blast, in the world: a flat starburst for a beat, then the four bursts of
// run.js dynamiteBlast (white, orange, red sparks; grey smoke rising), left behind by the scroll.
function stickBlast(c, x, y, e, flashOnly = false) {
  if (e < 0) return;
  if (e < 0.1) {
    const q = e / 0.1, R = 6 + 7 * easeOut(Math.min(1, q * 1.6));
    c.save(); c.globalAlpha = 1 - q * q;
    for (const [r, col] of [[1, '#e8452c'], [0.78, EMBER], [0.5, FLAME_Y], [0.26, '#fffbe8']]) {
      c.beginPath();
      for (let i = 0; i < 24; i++) {
        const a = i * Math.PI / 12 + q * 0.6, rr = R * r * (i % 2 ? 0.62 : 1) * (0.85 + 0.3 * hash(i * 1.9));
        c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.9);
      }
      c.closePath(); c.fillStyle = col; c.fill();
      if (r === 1) { c.strokeStyle = INK; c.lineWidth = 0.5; c.stroke(); }
    }
    c.restore();
  }
  if (flashOnly) return;
  const sets = [[16, 120, 0.5, '#fff6d6', 2, 90], [18, 95, 0.6, EMBER, 2, 110], [12, 70, 0.75, '#e8452c', 1, 130]];
  sets.forEach(([n, sp, life0, col, size, grav], si) => {
    for (let i = 0; i < n; i++) {
      const s = si * 50 + i;
      const life = life0 * (0.6 + 0.6 * hash(s * 4.1));
      if (e > life) continue;
      const a = hash(s * 1.3) * Math.PI * 2, v = sp * (0.4 + 0.6 * hash(s * 2.9));
      const px = x + Math.cos(a) * v * e - SCROLL * e, py = y + (Math.sin(a) * v - sp * 0.3) * e + 0.5 * grav * e * e;
      c.globalAlpha = 1 - e / life; c.fillStyle = col;
      c.fillRect(px - size / 2, py - size / 2, size, size);
    }
  });
  c.globalAlpha = 1;
  for (let i = 0; i < 6; i++) {
    const life = 1.0 * (0.6 + 0.6 * hash(i * 7.3));
    if (e > life) continue;
    const q = e / life;
    puff(c, x + (hash(i * 3.3) - 0.5) * 10 - SCROLL * e, y - 4 - 30 * q * (0.6 + 0.4 * hash(i)), 1.5 + 3 * q, 0.85 * (1 - q), i % 3 === 0);
  }
}
// The knock every hit throws (takeHit's red burst), left behind by the scroll.
function knock(c, x, y, e) {
  for (let i = 0; i < 16; i++) {
    const life = 0.6 * (0.6 + 0.6 * hash(i * 4.1 + 9));
    if (e > life) continue;
    const a = hash(i * 1.3 + 9) * Math.PI * 2, s = 90 * (0.4 + 0.6 * hash(i * 2.9 + 9));
    const px = x + Math.cos(a) * s * e - SCROLL * e, py = y + (Math.sin(a) * s - 27) * e + 70 * e * e;
    c.fillStyle = `rgba(224,72,72,${1 - e / life})`; c.fillRect(px - 1, py - 1, 2, 2);
  }
}

export function drawBlastTile(ctx, t, candId, strips, heroes) {
  const cand = BLAST_CANDIDATES.find((x) => x.id === candId) || null;
  const tl = ((t % P) + P) % P, loop = Math.floor(t / P);
  const frozen = Math.min(Math.max(tl - T_HIT, 0), HITSTOP);
  const g = tl - frozen;                         // the game's clock this loop
  const w = tl - T_HIT;                          // wall time since contact
  const e = Math.max(0, g - T_HIT);              // game time since contact
  // The run's shake(5, 0.3) (takeHit; dynamiteBlast's 2.2 is under it).
  let sx = 0, sy = 0;
  if (w >= 0 && w < 0.3) {
    const p = 5 * Math.min(1, (0.3 - w) * 4), n = Math.floor(t * 60);
    sx = (hash(n) * 2 - 1) * p; sy = (hash(n + 0.5) * 2 - 1) * p;
  }
  ctx.save();
  ctx.translate(sx, sy);
  let lane = 0;
  drawCabinetLane(ctx, loop * (P - HITSTOP) + g, 'speed', strips, (c, tt) => {
    const pair = heroes.slice(lane * 2, lane * 2 + 2);
    lane++;
    pair.forEach((heroId, i) => {
      const hx = HERO_XS[i];
      // the stick, scrolling in until his boot finds it
      if (w < 0) {
        const ob = { ...STICK, x: hx + 4 + SCROLL * (T_HIT - g) };
        drawWorldEntity(c, ob, 0, tt, null, {});
      }
      const by = GROUND_Y - 7, bx = hx + 10;
      if (w >= 0) { stickBlast(c, bx, by, e); if (!cand) knock(c, hx + 6, GROUND_Y - 8, e); }
      // the hero
      const blink = w >= 0 && e < IFRAMES && Math.floor(t * 14) % 2 === 0;
      // The shipped flip now holds a dazed beat after it (sprites/blast.js BLAST_T).
      const T = cand?.T ?? BLAST_T;
      if (cand && w >= 0 && w < T) cand.paint(c, heroId, hx, GROUND_Y, w, t);
      else if (!(blink && (!cand || w >= T))) drawToon(c, heroId, runPose(g), hx, GROUND_Y, U);
      if (cand?.after && w >= T) cand.after(c, heroId, hx, GROUND_Y, w, t);
      // the flash over the front of him for the first beat
      if (w >= 0 && e < 0.06) stickBlast(c, bx, by, e, true);
    });
  }, { hero: null });
  ctx.restore();
}
