// CRYPT SHIFT — THE WITCH ON HER BROOMSTICK. Peter, 26 Sep 2026: "I would also like a
// witch on a broomstick to occasionally fly across the sky in silhouette... also towards
// the end of the level, the witch should fly across the moon".
//
// This file is only the painter; when she flies, and where, is the caller's. The classic
// side-on silhouette: pointed hat with a brim and a tip bent back by the wind, hooked nose
// and chin, hunched over the stick, cloak and hair streaming back, a bristle bundle at the
// tail and a small cat sitting on the back of the broom. Painted with the backdrop's own
// kit (GOUACHE_KIT): one opaque near-black violet mass with the moonlit rim on its upper
// right, so she belongs to the painting, and against the moon she is a crisp cut-out.
//
// The flutter (cloak, hair, bristles, the cat's tail) is FRAMES baked once per scale and
// per facing — facing left is its own bake, never a mirrored blit, so the rim stays on the
// moon side. The bob and pitch are applied at the blit. A frame is one drawImage.
import { GOUACHE_KIT as K } from '../cryptGouache.js';

const { massSprite, limb, dab, fillPoly, hash } = K;
const TAU = Math.PI * 2;

// Her box in unscaled units (the parts' own coords, broom along y ~ 2): about 26 px from
// the nose to the bristles' ends, plus the handle forward of her hands and the bent hat
// tip on top. drawWitch centres THIS box on (x, y).
const BOX = [-17.5, -16.5, 35, 26.5];
const MID_X = BOX[0] + BOX[2] / 2;
const MID_Y = BOX[1] + BOX[3] / 2;
export const WITCH_SIZE = Object.freeze({ w: BOX[2], h: BOX[3] });

const FRAMES = 6;
const FPS = 8;

// The ink: near-black violet, the rim a cool moonlight a touch brighter than the bank's
// creatures, so a 26 px figure still shows its moon side at game scale.
const STYLE = {
  body: [14, 13, 32], dark: [10, 10, 26], lit: [112, 116, 170],
  rim: 0.42, rimA: 0.8, dabs: 0.5, dab: 0.5, dabAng: 0, seed: 207, g0: 0.2,
};

// The broomstick: a straight handle, nose a little up, from the binding to the knob.
const STICK = { x0: -9.6, y0: 3.0, x1: 15.4, y1: 0.5 };
const stickY = (x) => STICK.y0 + (STICK.y1 - STICK.y0) * ((x - STICK.x0) / (STICK.x1 - STICK.x0));

// One frame of the silhouette, facing right, flutter phase `ph` (0..1 round the loop).
function witchParts(g, ph, i) {
  const a = ph * TAU;
  const wv = (k, amp) => Math.sin(a - k) * amp; // a travelling wave, later down the tail

  // Broom handle, with a knob.
  limb(g, [[STICK.x0, STICK.y0], [2, stickY(2)], [STICK.x1, STICK.y1]], 1.15, 0.95, 3);
  dab(g, STICK.x1, STICK.y1 - 0.05, 0.75, 0.65, 0);

  // Bristles: a tied bundle fanning back from the binding, each twig twitching.
  const bx = STICK.x0;
  const by = STICK.y0;
  fillPoly(g, [bx + 0.6, by - 1.1, bx - 2.5, by - 1.6, bx - 5.6, by - 1.4, bx - 6.6, by + 0.6,
    bx - 6, by + 2.8, bx - 2.6, by + 2.2, bx + 0.6, by + 1.1]);
  for (let k = 0; k < 7; k++) {
    const s = (k / 6) * 2 - 1; // -1 top .. 1 bottom
    const tw = (hash(i * 13.1 + k * 3.7) - 0.5) * 0.9;
    const ex = bx - 6.4 - (1 - Math.abs(s)) * 0.9 + (hash(k * 5.3) - 0.5) * 0.8;
    limb(g, [[bx - 1, by + s * 0.9], [bx - 4, by + s * 1.9 + tw * 0.4], [ex, by + s * 3.2 + 0.4 + tw]], 0.75, 0.3, 9 + k);
  }
  // The binding: a slightly proud collar.
  fillPoly(g, [bx - 0.3, by - 1.5, bx + 1.1, by - 1.4, bx + 1.1, by + 1.4, bx - 0.3, by + 1.5]);

  // The cat, sitting up on the back of the broom, facing forward, tail curled behind.
  const cx = -6.2;
  const cy = stickY(cx);
  g.beginPath();
  g.moveTo(cx - 1.9, cy + 0.3);
  g.quadraticCurveTo(cx - 2.2, cy - 2.2, cx - 0.4, cy - 3.5);
  g.lineTo(cx + 0.9, cy - 3.2);
  g.quadraticCurveTo(cx + 1.1, cy - 1.2, cx + 1.4, cy + 0.3);
  g.closePath();
  g.fill();
  dab(g, cx + 0.5, cy - 4.1, 1.25, 1.1, 0);
  fillPoly(g, [cx - 0.5, cy - 4.3, cx - 0.35, cy - 6.0, cx + 0.45, cy - 4.9]);
  fillPoly(g, [cx + 0.6, cy - 5.0, cx + 1.45, cy - 6.1, cx + 1.7, cy - 4.2]);
  const tf = Math.sin(a * 2 + 0.6) * 0.5;
  limb(g, [[cx - 1.6, cy], [cx - 3.2, cy - 0.6], [cx - 3.6, cy - 2.6 + tf], [cx - 2.7 + tf * 0.6, cy - 3.8 + tf]], 0.8, 0.5, 21);

  // The cloak, streaming back off her hunched shoulders below the hat, tapering to a
  // ragged, rippling tail that clears the cat's ears.
  fillPoly(g, [
    3.4, -6.0,
    0.6, -6.6,
    -3.0, -7.1 + wv(0.9, 0.3),
    -7.0, -7.2 + wv(1.7, 0.6),
    -10.6, -7.0 + wv(2.5, 0.85),
    -13.4, -7.5 + wv(3.1, 1.0),
    -11.4, -6.1 + wv(2.9, 0.9),
    -13.0, -5.4 + wv(3.4, 1.0),
    -10.6, -5.1 + wv(2.8, 0.8),
    -11.8, -4.2 + wv(3.3, 0.9),
    -8.0, -4.3 + wv(2.2, 0.55),
    -4.6, -3.5 + wv(1.4, 0.3),
    -2.2, -1.4 + wv(0.7, 0.12),
    -1.4, 1.2,
    2.0, -1.0,
  ]);

  // The skirt, bunched over the stick and blown back a little.
  fillPoly(g, [-1.6, 0.0, 3.2, 0.4, 5.6, 2.0, 5.1, 4.2, 1.8, 4.7 + wv(0.5, 0.25), -2.2, 3.6 + wv(1.2, 0.35), -3.2, 2.2]);
  // A dangling leg and a pointed boot, toe forward.
  limb(g, [[3.4, 3.2], [3.8, 5.6], [3.3, 7.4]], 1.25, 1.05, 5);
  fillPoly(g, [2.6, 6.9, 4.0, 6.8, 5.8, 7.6, 6.7, 7.1, 6.2, 8.1, 2.7, 8.2]);

  // Hunched body: a rounded back rising from the hip to a hump, the chest caved in under
  // the thrust-forward head, leaving daylight between the belly and the reaching arm.
  fillPoly(g, [
    -1.6, 1.6, -1.9, -1.2, -1.0, -3.7, 0.9, -5.5, 3.2, -6.3, 5.0, -6.0,
    4.8, -4.0, 4.0, -2.0, 4.2, 0.2, 5.4, 1.4,
  ]);
  // The arm in its sleeve, reaching forward and down to grip the stick.
  limb(g, [[3.4, -4.0], [6.4, -1.3], [9.6, 0.7]], 1.8, 1.05, 11);
  dab(g, 9.8, stickY(9.8) - 0.45, 0.95, 0.8, 0);

  // Head, a hooked nose pointing down and forward, and a chin jutting up to meet it.
  dab(g, 6.2, -6.3, 1.7, 1.9, 0);
  fillPoly(g, [7.2, -7.4, 8.4, -6.8, 9.8, -5.6, 10.4, -4.6, 9.8, -4.5, 9.0, -5.2, 7.6, -5.6]);
  fillPoly(g, [7.0, -5.0, 8.2, -4.3, 9.1, -3.4, 8.1, -3.1, 6.6, -3.6]);

  // Her hair: one hank streaming back off the cloak's top edge from under the brim,
  // breaking into two rippling ends.
  fillPoly(g, [
    5.0, -8.2, 1.6, -8.1 + wv(0.8, 0.2), -1.6, -8.0 + wv(1.5, 0.45), -4.6, -8.4 + wv(2.2, 0.7),
    -3.0, -7.3 + wv(2.0, 0.6), -5.8, -7.0 + wv(2.5, 0.8), -1.8, -6.2, 3.0, -6.0,
  ]);

  // The hat: a wide brim tipped down at the front, and a tall crown leaning back into the
  // wind, its tip bent over behind.
  g.save();
  g.translate(5.0, -8.6);
  g.rotate(0.1);
  dab(g, 0, 0, 4.5, 0.75, 0);
  g.restore();
  const hb = wv(1.2, 0.3);
  fillPoly(g, [
    3.5, -8.7,
    7.5, -8.3,
    6.5, -10.6,
    5.3, -12.8,
    3.9, -14.6 + hb * 0.3,
    2.4, -15.6 + hb * 0.7,
    0.4, -15.5 + hb,
    -1.4, -14.6 + hb,
    -0.6, -14.4 + hb,
    1.3, -14.4 + hb * 0.6,
    2.9, -12.9,
    3.5, -10.8,
  ]);
}

function bakeScale(ctx, scale) {
  const m = typeof ctx.getTransform === 'function' ? ctx.getTransform() : null;
  const k = (m && Number.isFinite(m.a) ? Math.hypot(m.a, m.b) : 1) * scale;
  return Math.min(3, Math.max(1, Math.ceil(k * 2 - 0.01) / 2));
}

// Frames per bake scale and facing, built the first time that pair is asked for.
const CACHE = new Map();
function frames(r, dir) {
  const key = `${r}:${dir}`;
  let v = CACHE.get(key);
  if (!v) {
    v = [];
    for (let i = 0; i < FRAMES; i++) {
      v.push(massSprite(r, BOX, (g) => {
        g.scale(dir, 1);
        witchParts(g, i / FRAMES, i);
      }, STYLE));
    }
    CACHE.set(key, v);
  }
  return v;
}

// Bake her ahead of time (for a warm-up job), at the scale a frame will ask for.
export function warmWitch(ctx, scale = 1) {
  const r = bakeScale(ctx, scale);
  frames(r, 1);
  frames(r, -1);
}

// Draw the witch centred at (x, y) in the current transform. `facing` 1 flies right,
// -1 left; `scale` 1 is about 26 px nose to bristles.
export function drawWitch(ctx, t, x, y, { scale = 1, facing = 1, alpha = 1 } = {}) {
  if (alpha <= 0.004) return;
  const dir = facing < 0 ? -1 : 1;
  const set = frames(bakeScale(ctx, scale), dir);
  const n = ((Math.floor(t * FPS) % FRAMES) + FRAMES) % FRAMES;
  const spr = set[n];
  // A slow bob, and the broom pitching with it: nose up as she rises.
  const bob = Math.sin(t * 2.3) * 0.9 + Math.sin(t * 5.1 + 1) * 0.25;
  const pitch = (Math.cos(t * 2.3) * 0.05 + Math.sin(t * 1.1) * 0.025) * dir;
  ctx.save();
  ctx.translate(x, y + bob * scale);
  ctx.rotate(pitch);
  if (alpha < 1) ctx.globalAlpha *= alpha;
  ctx.drawImage(spr.c, (spr.x - MID_X * dir) * scale, (spr.y - MID_Y) * scale, spr.w * scale, spr.h * scale);
  ctx.restore();
}
