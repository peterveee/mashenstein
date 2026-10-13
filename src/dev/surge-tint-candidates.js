// Gallery-only SURGE TREATMENTS — ways to make THE SURGE's borrowed looks read as
// not-quite-the-levels-you-played (13 Oct 2026). Peter: "would we be able to shift
// the pallets of the underlying levels so they look different to the normal levels?
// or perhaps apply a tint over the entire backgrounds? … negative might work, or
// gray scale… what other options do we have?" — then "do it".
//
// Every treatment is one pass over the frame AFTER the look's backdrop and ground and
// BEFORE the cast, so hero, hazards and pickups keep their production colours. The
// cheap ones are a fill under a canvas blend mode (color, saturation, multiply,
// screen, difference — all in WebKit); thermal and posterise are per-pixel and would
// need a low-resolution pass in the run.
//
// Each tile is the look's home cabinet through its real pack (as the Surge now hands
// it), stage 1, scrolling, Lorenzo and a crate on the lane for the read.
import { getStylePack } from '../engine/stylePacks/index.js';
import { CABINETS } from '../data/cabinets.js';
import { GROUND_Y, applyWorld } from '../engine/camera.js';
import { makeObstacle } from '../game/entities.js';
import { drawWorldEntity, HERO_DRAW_H } from '../game/draw.js';
import { drawToon } from '../sprites/toons.js';
import { PLAYER_X } from '../game/player.js';

export const SURGE_LOOKS = [
  { style: 'pixel', name: 'FIELD SERVICE' },
  { style: 'mcm', name: 'SPEED ZONE' },
  { style: 'neon', name: 'TERMINAL VELOCITY' },
  { style: 'watercolor', name: 'FROST FORTRESS' },
  { style: 'gouache', name: 'CRYPT SHIFT' },
  { style: 'lcd', name: 'RHYTHM BANKRUPTCY' },
  { style: 'gravity', name: 'GRAVITY GRID' },
  { style: 'office', name: 'CORPORATE KOMBAT' },
];

// ---------------------------------------------------------------- passes
// Each in device pixels over the whole canvas.
function whole(ctx, fn) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  fn(ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}
function blend(ctx, op, color, alpha = 1) {
  whole(ctx, (w, h) => {
    ctx.globalCompositeOperation = op;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
  });
}
const gray = (ctx, alpha = 1) => blend(ctx, 'saturation', '#808080', alpha);
function pixels(ctx, fn) {
  whole(ctx, (w, h) => {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) fn(d, i);
    ctx.putImageData(img, 0, 0);
  });
}
const lum = (d, i) => (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
// Thermal: cold black-blue → violet → red → orange → yellow-white.
const THERMAL = [[0, [8, 6, 40]], [0.25, [70, 20, 140]], [0.5, [210, 30, 80]], [0.72, [255, 120, 20]], [0.9, [255, 220, 60]], [1, [255, 255, 220]]];
const THERMAL_LUT = (() => {
  const lut = new Uint8ClampedArray(256 * 3);
  for (let v = 0; v < 256; v++) {
    const x = v / 255;
    let k = 0; while (k < THERMAL.length - 2 && x > THERMAL[k + 1][0]) k++;
    const [a, ca] = THERMAL[k], [b, cb] = THERMAL[k + 1], u = (x - a) / (b - a);
    for (let j = 0; j < 3; j++) lut[v * 3 + j] = ca[j] + (cb[j] - ca[j]) * u;
  }
  return lut;
})();

// The other cabinet's colour each look wears in B.
const WRONG_INK = {
  pixel: ['#ff3fb4', 'Neon magenta'], mcm: ['#7a5cff', 'Crypt violet'], neon: ['#ff8a2a', 'desert orange'],
  watercolor: ['#8a4dff', 'Crypt violet'], gouache: ['#3fcf5a', 'Field Service green'], lcd: ['#4fb8ff', 'Frost ice blue'],
  gravity: ['#ff8a2a', 'desert orange'], office: ['#22e0ff', 'Neon cyan'],
};

export const SURGE_TREATMENTS = [
  { letter: 'NOW', id: 'none', name: 'as the Surge paints them today', note: 'The looks as they are on their own cabinets.', apply: () => {} },
  { letter: 'A', id: 'wash', name: 'COLOUR WASH (violet)', note: 'Every look recoloured toward one ink with its light and dark kept — a tinted photograph. One ink for the whole cabinet: the Surge\'s.',
    apply: (ctx) => blend(ctx, 'color', '#9a5cff', 0.85) },
  { letter: 'B', id: 'wrong', name: 'WRONG CABINET\'S COLOURS', note: 'The same wash, but each look in another cabinet\'s colour — the cabinets bleeding into each other. Caption names whose.',
    apply: (ctx, style) => blend(ctx, 'color', WRONG_INK[style]?.[0] || '#9a5cff', 0.85) },
  { letter: 'C', id: 'duotone', name: 'DUOTONE (indigo + amber)', note: 'Drained, then shadows to deep indigo and lights to amber — a two-ink print. One pair across every look.',
    apply: (ctx) => { gray(ctx); blend(ctx, 'multiply', '#ffc070'); blend(ctx, 'screen', '#2a1458'); } },
  { letter: 'D', id: 'drained', name: 'DRAINED (75% grey)', note: 'Three quarters of the colour gone, a hint of the original left — a re-run, a memory.',
    apply: (ctx) => gray(ctx, 0.75) },
  { letter: 'E', id: 'night', name: 'AFTER HOURS', note: 'Dimmed, cooled and half-drained, as if the cabinets were running with the lights off. The gentlest.',
    apply: (ctx) => { gray(ctx, 0.45); blend(ctx, 'multiply', '#4a5a9a', 0.75); } },
  { letter: 'F', id: 'negative', name: 'NEGATIVE', note: 'Colours inverted. The loudest "something is wrong" — perhaps better as a glitch than a whole level.',
    apply: (ctx) => blend(ctx, 'difference', '#ffffff') },
  { letter: 'G', id: 'thermal', name: 'THERMAL', note: 'Brightness mapped to a heat camera\'s colours: dark is cold blue, light is hot yellow. Per-pixel: the run would do it on a low-resolution copy.',
    apply: (ctx) => pixels(ctx, (d, i) => { const v = Math.round(lum(d, i) * 255) * 3; d[i] = THERMAL_LUT[v]; d[i + 1] = THERMAL_LUT[v + 1]; d[i + 2] = THERMAL_LUT[v + 2]; }) },
  { letter: 'H', id: 'posterise', name: 'POSTERISE', note: 'Every channel crushed to four steps — flat bands, a cheap copy of the real thing. Per-pixel, as G.',
    apply: (ctx) => pixels(ctx, (d, i) => { for (let j = 0; j < 3; j++) d[i + j] = Math.round(d[i + j] / 85) * 85; }) },
];

export const wrongInkName = (style) => WRONG_INK[style]?.[1] || '';

// ---------------------------------------------------------------- the tile
const packs = new Map();
function packFor(style) {
  if (!packs.has(style)) {
    const home = CABINETS.find((c) => c.id !== 'surge' && c.style === style);
    packs.set(style, { home, pack: getStylePack(style, { stageIndex: 1, paperCabinet: home?.id }) });
  }
  return packs.get(style);
}
const LEN = 9000;
let crate = null;
export function drawSurgeTreatment(ctx, t, style, treatment) {
  const { home, pack } = packFor(style);
  const camX = 1600 + (t * 110) % 4000;
  const bc = { stageIndex: 1, progress: camX / LEN, heroFrac: 0.3 };
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, 480, 270); ctx.clip();
  ctx.fillStyle = home?.sky?.[0] || '#000';
  ctx.fillRect(0, 0, 480, 270);
  pack.bg(ctx, t, camX, home, LEN, { stageIndex: 1, progress: camX / LEN }, 0, bc);
  ctx.save();
  applyWorld(ctx, 2, 0);
  pack.ground(ctx, camX, home, [], [], t, 240);
  ctx.restore();
  pack.post?.(ctx, t);
  treatment.apply(ctx, style);
  // The cast, untouched.
  ctx.save();
  applyWorld(ctx, 2, 0);
  crate ||= makeObstacle('crate', 150);
  drawWorldEntity(ctx, crate, 0, t, null);
  drawToon(ctx, 'lorenzo', { kind: 'run', phase: t * 1.6 % 1, time: t, grounded: true, facing: 1 }, PLAYER_X, GROUND_Y, HERO_DRAW_H);
  ctx.restore();
  ctx.restore();
}
