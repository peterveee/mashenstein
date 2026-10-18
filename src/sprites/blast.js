// DYNAMITE IN THE FACE — the hero's picture for BLAST_T after a stick goes off on him
// (Peter, 16 Oct 2026, from the lab bake-off `blast-hero-bakeoff`, src/dev/blast-
// candidates.js: "i like f"). LAUNCHED: blown up and over backwards in one whole turn,
// sooted, smoke left along the arc, landing on his feet the right way round as it ends.
//
// A PICTURE, NOT A MOVE. The run does not know: the hero keeps his speed, his spot and
// his hitbox, and the hit is the ordinary one (shake, hitstop, i-frames, sound) — the
// live wire's rule (sprites/zap.js). Drawn the way the zap is: his own toon into an
// offscreen layer, turned and tinted there, blitted back.
import { drawToon } from './toons.js';
import { ZAP_T, layer, tint, blit } from './zap.js';

// The flip is the zap's length; then (Peter, 16 Oct: longer pictures, the last ~0.5s of
// the 1.4s i-frames left to the ordinary blink as the "about to wear off" warning) he
// stands a beat on landing, dazed. BLAST_T is the whole picture: the blink waits for it.
export const BLAST_FLIP_T = ZAP_T;
export const BLAST_DAZE_T = 0.4;
export const BLAST_T = BLAST_FLIP_T + BLAST_DAZE_T;
// The soot over him in the flip. `eyes` keeps his own eye whites white through it.
export const BLAST_SOOTS = Object.freeze({
  charred: { color: '#2b2528', amt: 0.85, eyes: true },
  smoky: { color: '#77717a', amt: 0.72, eyes: false },
});
export const BLAST_SOOT = 'charred';

const U = 24;   // HERO_DRAW_H, restated as zap.js does
const SMOKE = '#dcd6cf', SMOKE_DK = '#a59d97';
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut = (q) => 1 - (1 - q) ** 3;

// Standing side-on (no turn to camera): feet apart along the lane, arms hanging.
const standPose = (t) => ({
  kind: 'jump', time: t, vy: 0, grounded: true, facing: 1, faceSurprised: true, browRaise: true,
  dance: { hands: [[0.15, 0.95], [0.15, 0.95]], feet: [[-0.14, 0], [0.16, 0]], ankles: [0, 0] },
});
// Landed and already running it off — `live` is the run's own pose for this frame (the
// hitPictures.js rule: hand back to exactly what the ordinary draw would show).
const runPose = (t, live) => live || { kind: 'run', phase: (t * 1.7) % 1, time: t, grounded: true, facing: 1 };
// In the air, everything flung out — the jolt's own arms.
const flungPose = (t) => ({
  kind: 'jump', time: t, vy: 0, grounded: true, facing: 1, faceSurprised: true, browRaise: true,
  dance: { hands: [[0.85, -1.0], [0.85, -1.0]], feet: [[-0.22, -0.04], [0.22, -0.02]], ankles: [0.3, -0.3] },
});
// A layer the size of heroBox would clip a hero thrown up and turned over.
const bigBox = (cx, fy) => [cx - 1.4 * U, fy - 2.2 * U, cx + 1.4 * U, fy + 0.35 * U];

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
// Soot him by `amt`. With `eyes`, his own near-white ink (the eye whites) is kept: grey
// him, scale near-white to the threshold, contrast splits it, `lighten` lifts the rest to
// the soot colour, and his outline cuts it back out.
function soot(L, amt, { color, eyes }) {
  if (amt <= 0) return;
  const S = scratchFor(0, L);
  if (eyes) {
    S.o.filter = 'grayscale(1) brightness(0.54) contrast(40)';
    S.o.drawImage(L.cv, 0, 0, L.w, L.h, 0, 0, L.w, L.h);
    S.o.filter = 'none';
    S.o.globalCompositeOperation = 'lighten'; S.o.fillStyle = color; S.o.fillRect(0, 0, L.w, L.h);
    S.o.globalCompositeOperation = 'destination-in'; S.o.drawImage(L.cv, 0, 0, L.w, L.h, 0, 0, L.w, L.h);
  } else {
    S.o.drawImage(L.cv, 0, 0, L.w, L.h, 0, 0, L.w, L.h);
    S.o.globalCompositeOperation = 'source-atop'; S.o.fillStyle = color; S.o.fillRect(0, 0, L.w, L.h);
  }
  L.o.save(); L.o.globalAlpha = amt; L.o.drawImage(S.cv, 0, 0, L.w, L.h, 0, 0, L.w, L.h); L.o.restore();
}
// A flat cartoon puff: three lobes, light fill, a soft edge, fading out.
function puff(c, x, y, r, a) {
  if (a <= 0 || r <= 0) return;
  c.save();
  c.globalAlpha *= a;
  c.fillStyle = SMOKE; c.strokeStyle = SMOKE_DK; c.lineWidth = 0.45;
  c.beginPath();
  for (const [dx, dy, s] of [[0, 0, 1], [-0.7, 0.25, 0.7], [0.65, 0.3, 0.72]]) {
    c.moveTo(x + dx * r + s * r, y + dy * r); c.arc(x + dx * r, y + dy * r, s * r, 0, Math.PI * 2);
  }
  c.stroke(); c.fill();
  c.restore();
}

// w: seconds since the hit, 0..BLAST_T. `live`: the run's own pose for this frame, so the
// landing resumes it instead of freezing. `sootName` picks from BLAST_SOOTS (the lab shows both).
export function drawBlastHero(c, heroId, cx, fy, w, t, sootName = BLAST_SOOT, live = null) {
  const S = BLAST_SOOTS[sootName] || BLAST_SOOTS[BLAST_SOOT];
  if (w >= BLAST_FLIP_T) { drawDazed(c, heroId, cx, fy, w - BLAST_FLIP_T, t, S, live); return; }
  const q = clamp01(w / BLAST_FLIP_T);
  const up = 4 * 15 * q * (1 - q);                       // peak 15 units at mid-flight
  const back = -5 * Math.sin(q * Math.PI);               // blown back a little, then caught up
  const spin = -Math.PI * 2 * (q < 0.9 ? easeOut(q / 0.9) : 1);
  const mid = -0.45 * U;                                  // turns about his middle
  const x = cx + back, y = fy - up;
  const L = layer(10, c, bigBox(cx, fy), (o) => {
    o.save(); o.translate(x, y + mid); o.rotate(spin); o.translate(-x, -(y + mid));
    drawToon(o, heroId, q < 0.85 ? flungPose(t) : standPose(t), x, y, U);
    o.restore();
  });
  // The flash: a frame or two of him white-hot.
  if (w < 0.035) { tint(L, '#fffbe8'); blit(c, L, { glow: '#ffd27a', blur: 6 }); return; }
  soot(L, S.amt * (1 - clamp01((q - 0.85) / 0.15) * 0.5), S);
  // Smoke left along the arc where he was.
  for (let k = 0; k < 6; k++) {
    const qb = 0.06 + k * 0.1;
    if (q < qb) continue;
    const age = (q - qb) * BLAST_FLIP_T, life = 0.3;
    if (age > life) continue;
    const ux = cx - 5 * Math.sin(qb * Math.PI) - 6 * age * 8, uy = fy - 60 * qb * (1 - qb) + mid;
    puff(c, ux, uy, 1.4 + 2.5 * age / life, 0.85 * (1 - age / life));
  }
  blit(c, L);
}
// THE DAZE: landed already running it off, side-on, still lightly sooted, swaying on his
// heels over the stride as it wears off, a thin curl of smoke off the top of him.
// d: 0..BLAST_DAZE_T.
function drawDazed(c, heroId, cx, fy, d, t, S, live) {
  const q = clamp01(d / BLAST_DAZE_T);
  const sway = 0.09 * Math.sin(d * 17) * (1 - q * 0.6);
  const L = layer(10, c, bigBox(cx, fy), (o) => {
    o.save(); o.translate(cx, fy); o.rotate(sway); o.translate(-cx, -fy);
    drawToon(o, heroId, runPose(t, live), cx, fy, U);
    o.restore();
  });
  // the soot he landed with (half of the flip's), fading as he comes round
  soot(L, S.amt * 0.5 * (1 - 0.6 * q), S);
  blit(c, L);
  // a curl of smoke off the top of him, drifting back
  for (let k = 0; k < 3; k++) {
    const age = d - k * 0.12;
    if (age < 0 || age > 0.3) continue;
    const a = age / 0.3, hx = cx + Math.sin(sway) * U - 4 * a, hy = fy - 1.05 * U - 7 * a;
    puff(c, hx, hy, 0.9 + 1.6 * a, 0.75 * (1 - a));
  }
}
