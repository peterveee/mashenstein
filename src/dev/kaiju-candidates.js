// TERMINAL VELOCITY — a kaiju on the attack (mock-up, 16 Oct 2026).
//
// Peter: "Can we mockup a neon Godzilla on the attack for the neon levels? Laser eyes
// destroying a building maybe?" Round 2, after his reference (a cute neon-sign kaiju in
// a rainy Shibuya crossing, zigzag lightning out of its mouth): "it should be cute...
// does godzilla shoot lasers if not, fire i guess. He should be painted in front of the
// buildings." He doesn't — his move is the breath, with the plates up his back lighting
// from the tail first. So: a chubby kaiju drawn as a neon sign (a dark body, a mint tube
// outline, pink, yellow and cyan tubes for the scales, plates, claws and blush), a big
// round eye, stood in FRONT of the city on the road's edge, keeping pace with the run.
// On a 6.4s loop the plates charge tail to head, he breathes on a tower riding in from
// the right (behind the near row, in the pack's `neonBehindNear` seam), the top of it
// slides off and falls, and he gives a little roar.
//
// Round 3 (Peter: "actually maybe the laser eyes work better and he doesn't roar.. he
// looks neutral and then smirks as the lazers cut down a building"): back to beams from
// the eyes, mouth shut throughout, a straight face until the beams bite, then a smirk
// that holds while the top falls and fades back by the end of the loop. One kaiju,
// three beams: A red, B the city's magenta, C the reference's zigzag lightning. Not
// called Godzilla anywhere a player would see — that name is somebody else's.
import { GROUND_Y, applyWorld } from '../engine/camera.js';
import { getStylePack } from '../engine/stylePacks/index.js';
import { CABINET_BY_ID } from '../data/cabinets.js';
import { HERO_DRAW_H } from '../game/draw.js';
import { drawToon } from '../sprites/toons.js';
import { PLAYER_X } from '../game/player.js';
import { drawKaijuTower, drawKaijuFront, kaijuFlash, KAIJU_TIMELINE, KAIJU_SHAPE } from '../sprites/neonKaiju.js';

// The painter is the shipped one (src/sprites/neonKaiju.js); this sheet loops its
// attack over a scrolling neon street.
export const KAIJU_LOOP = 6.4;
const SCROLL = 110;            // the sheet's run speed (world u/s)
const TOWER_F = 0.3 * 2;       // the near row's parallax factor x ZOOM
const towerX = (ph) => 520 - SCROLL * TOWER_F * ph;

// Round 4 (16 Oct: "better but silhouette is a bit too child like can you do a few
// versions of it (we will go for laser red though)"): red lasers on every one, and the
// body re-proportioned. A shape is { sx, sy } the torso's width and height (about the
// hips), `lean` the upper body tipped forward (rad), `hs` the head's size, `off` where
// the head sits against the shoulders (+x forward, −y up: a longer neck), and `snout`
// the muzzle's length past the mouth's hinge. The face, arms, plates and timing are
// the same on all of them.
const RED = { id: 'red', glow: '#ff3a4a' };
export const KAIJU_CANDIDATES = Object.freeze([
  {
    ...RED, letter: 'A', name: 'AS IS',
    note: 'Round 3’s chibi: a pear of a body and a head nearly as wide as it.',
    shape: { sx: 1, sy: 1, lean: 0, hs: 1, off: [0, 0], snout: 1 },
  },
  {
    ...RED, letter: 'B', name: 'HALFWAY',
    note: 'The same character a few years older: a little taller, the head 12% smaller, a touch more muzzle.',
    shape: { sx: 1.05, sy: 1.14, lean: 0.02, hs: 0.88, off: [2, -2], snout: 1.12 },
  },
  {
    ...RED, letter: 'C', name: 'CLASSIC',
    note: 'Classic kaiju proportions: upright and tall, a broad chest, a head a fifth smaller on a short neck, a longer snout.',
    shape: { sx: 1, sy: 1.28, lean: -0.04, hs: 0.78, off: [4, -2], snout: 1.2 },
  },
  {
    ...RED, letter: 'D', name: 'BRUISER',
    note: 'Hunched and heavy: wide shoulders tipped forward, a small head carried low and out in front.',
    shape: { sx: 1.22, sy: 1.12, lean: 0.16, hs: 0.74, off: [10, 4], snout: 1.15 },
  },
  {
    ...RED, letter: 'E', name: 'LIZARD',
    note: 'SHIPPED on neon-3 (16 Oct, “actually do the lizard instead”). Lean and reptilian: a slimmer, taller body, a longer neck and the longest snout; the spikes one unbroken row from the tail tip over the head.',
    shape: KAIJU_SHAPE,
  },
  {
    ...RED, letter: 'F', name: 'THE SIGN', style: 'sign',
    note: 'Shipped for a moment on 16 Oct, then the lizard (E) instead. A neon sign come to life, after Peter’s sketch: one mint line round him, the sketch’s big rounded snout over a shorter jaw, mouth a little open; pink and cyan plates and yellow claws for embellishment, no scales, stripes or blush. On the lizard’s (E) lean body.',
    shape: { ...KAIJU_SHAPE, snout: 1.2 },
  },
]);


// --------------------------------------------------------------------- the tile
const packs = new Map();
export function drawKaijuScene(ctx, t, look, { stageIndex = 2 } = {}) {
  const cab = CABINET_BY_ID.neon;
  if (!packs.has(stageIndex)) packs.set(stageIndex, getStylePack(cab.style, { stageIndex }));
  const pack = packs.get(stageIndex);
  const ph = ((t % KAIJU_LOOP) + KAIJU_LOOP) % KAIJU_LOOP;
  const camX = 600 + t * SCROLL;
  const st = { t, ph, tx: towerX(ph), shape: look.shape, look, style: look.style || 'tube' };
  const { CUT } = KAIJU_TIMELINE;
  ctx.save();
  ctx.fillStyle = cab.sky?.[0] || '#000';
  ctx.fillRect(0, 0, 480, 270);
  // The blast shakes the picture a little.
  const shake = ph > CUT && ph < CUT + 0.35 ? (1 - (ph - CUT) / 0.35) * 2.5 : 0;
  if (shake) ctx.translate(Math.sin(t * 90) * shake, Math.cos(t * 77) * shake);
  // The tower in the city behind the near row; him in front of the buildings but
  // inside the smog ("i need him to be in the haze but in front of the buildings").
  pack.bg?.(ctx, t, camX, cab, 6000, null, 0, {
    stageIndex, progress: 0.4,
    neonBehindNear: (c) => drawKaijuTower(c, st),
    neonBeforeVeil: (c) => drawKaijuFront(c, st),
  });
  ctx.save();
  applyWorld(ctx, 2, 0);
  pack.ground?.(ctx, camX, cab, [], [], t);
  drawToon(ctx, 'lorenzo', { kind: 'run', phase: t * 1.6 % 1, time: t, grounded: true, facing: 1 }, PLAYER_X, GROUND_Y, HERO_DRAW_H);
  ctx.restore();
  pack.post?.(ctx, t);
  // The beams and the blast light the whole street.
  const flash = kaijuFlash(ph);
  if (flash > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = flash;
    ctx.fillStyle = ph > CUT && ph < CUT + 0.6 ? '#ffb060' : look.glow;
    ctx.fillRect(-10, -10, 500, 290);
  }
  ctx.restore();
}
