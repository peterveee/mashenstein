// CRYPT SHIFT — more life in the graveyard, bake-off (Peter, 25 Sep 2026: "can we add
// more objects (maybe animals) for the crypt levels? animated ideally, but still is o...
// do we hav layers that move at different rates … lets do a bakeoff"). The cards.
//
// An idea is { id, name, note, layer: 'bg'|'mid'|'fg', when: 'on'|'behind', u, reach?,
// focusUp?, zoom?, paint(ctx, f) } and is painted INSIDE the shipped gouache backdrop
// through its study seam (stylePacks/cryptGouache.js): on its depth layer, at layer-space
// `u`, so it parallaxes at that layer's rate and is covered by what stands in front. `f`
// is { x, y, t, camX, ridgeY(x), view, stageIndex, shift }: x is the idea's screen x, y
// the layer's crest there. Two cards per idea: the camera running at lane speed with the
// shipped lane and hero on top, and the camera held, zoomed on the idea.
import { GROUND_Y, VIEW_W, ZOOM, applyWorld } from '../../engine/camera.js';
import { getStylePack } from '../../engine/stylePacks/index.js';
import { GOUACHE_KIT } from '../../engine/stylePacks/cryptGouache.js';
import { CABINETS } from '../../data/cabinets.js';
import { drawToon } from '../../sprites/toons.js';
import { HERO_DRAW_H } from '../../game/draw.js';
import { PLAYER_X } from '../../game/player.js';

export const CRYPT_IDEA_LOOP = 8;
const SCROLL = 40;

let pack = null;
let crypt = null;
function ready() {
  if (!pack) {
    pack = getStylePack('gouache', {});
    crypt = CABINETS.find((cab) => cab.id === 'crypt');
  }
}

// The camera x at which the idea's layer-space u lands at screen x `at` (crypt-1 opens
// with no stage offset, so the layer's shift is camX * factor * ZOOM).
export function cryptIdeaCamX(idea, at) {
  const L = GOUACHE_KIT.SCENE[idea.layer];
  return (idea.u - at) / (L.factor * ZOOM);
}

function heroPose(t) {
  return {
    kind: 'run', phase: (t * 1.6) % 1, time: t, vy: 0, grounded: true, squash: 0, lean: 0,
    roll: false, float: false, stomp: false, headless: false, facing: 1,
  };
}

// The camera running: the idea crosses the middle of the frame over the loop.
export function drawCryptIdeaScene(ctx, t, idea) {
  ready();
  const L = GOUACHE_KIT.SCENE[idea.layer];
  const lt = ((t % CRYPT_IDEA_LOOP) + CRYPT_IDEA_LOOP) % CRYPT_IDEA_LOOP;
  const travel = SCROLL * CRYPT_IDEA_LOOP * L.factor * ZOOM;
  const camX = cryptIdeaCamX(idea, 250 + travel / 2) + lt * SCROLL;
  // The idea alone: the shipped life (cryptLife.js) is left out, so a card shows one thing.
  const bc = { stageIndex: 1, cryptStudy: idea, cryptLife: false };
  ctx.save();
  pack.bg(ctx, t, camX, crypt, 1000, null, 0, bc);
  ctx.restore();
  ctx.save();
  applyWorld(ctx, ZOOM, 0, GROUND_Y);
  pack.ground(ctx, camX, crypt, [], [], t * 60, VIEW_W);
  drawToon(ctx, 'lorenzo', heroPose(t), PLAYER_X, GROUND_Y, HERO_DRAW_H);
  ctx.restore();
}

// The camera held with the idea in the middle, magnified `idea.zoom` (default 3) about a
// point `idea.focusUp` px above its crest. No lane: this card is for looking at it.
export function drawCryptIdeaCloseUp(ctx, t, idea, w = 480, h = 270) {
  ready();
  const at = 240;
  const camX = cryptIdeaCamX(idea, at);
  const L = GOUACHE_KIT.SCENE[idea.layer];
  const shift = camX * L.factor * ZOOM;
  const crest = L.profile(at + shift, L.period);
  const z = idea.zoom ?? 3;
  ctx.save();
  ctx.translate(w / 2, h * 0.62);
  ctx.scale(z, z);
  ctx.translate(-at, -(crest - (idea.focusUp ?? 14)));
  pack.bg(ctx, t, camX, crypt, 1000, null, 0, { stageIndex: 1, cryptStudy: idea, cryptLife: false });
  ctx.restore();
}
