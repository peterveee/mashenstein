// FROST FORTRESS crayon bake-off — the card. A style's backdrop (or the shipped watercolor
// one, for the control), then the SHIPPED lane on top: the watercolor pack's ground in the
// stage's light, real Frost hazards and the hero, exactly as the run draws them. Only the
// backdrop is on trial, as in the Crypt and Speed bake-offs (src/dev/crypt-styles/scene.js,
// src/dev/speed-mcm/scene.js).
//
// The pack is built with the settings frost-1..3 ship with (stages.js: paperPreset
// 'cardstockClear'), so the control is the cut-paper look the game shows. The blizzard is
// weather the run lays over the finished frame (the pack's weather() hook, on the overlay
// above the hero), so it is left off every card, the control included: frost-1 is clear
// here anyway, and on frost-3 it would be judging the snow, not the painting.
import { GROUND_Y, VIEW_W, ZOOM, applyWorld } from '../../engine/camera.js';
import { getStylePack } from '../../engine/stylePacks/index.js';
import { CABINETS } from '../../data/cabinets.js';
import { drawToon } from '../../sprites/toons.js';
import { HERO_DRAW_H, drawWorldEntity } from '../../game/draw.js';
import { PLAYER_X } from '../../game/player.js';
import { makeObstacle } from '../../game/entities.js';
import { frostFrame, FROST_STAGE_LEN } from './plan.js';

// The camera runs at SCROLL world px/s from each screen's anchor and loops, so a paused
// card shows the anchor frame and an animated one shows the parallax working.
export const FROST_CRAYON_LOOP = 8;
const SCROLL = 40;

// Two screens. camX is chosen so the SHIPPED backdrop shows the stretch the plan paints:
//   frost-1, 44% in: the polar bears (x 252 -> 60 over the loop) under frost-1's crown
//   keep on the far ridge (x ~445 -> ~368);
//   frost-3, 7% in: frost-3's lone tower (x ~395 -> ~318) beside the aurora curtain that
//   stretch has, the glacier arriving at the right as the loop ends.
// Hazards stand ahead of the hero in world px from the anchor: the pale ones (a snowman,
// ice crystals, a big snowman) are the legibility test; the bear trap is the dark one.
export const FROST_CRAYON_SCREENS = Object.freeze([
  { id: 's1', name: 'screen 1 — frost-1 by day, the bears and the keep', camX: 8000, stageIndex: 1,
    hazards: [{ type: 'snowman', dx: 108 }, { type: 'iceCrystals', dx: 170 }, { type: 'bearTrap', dx: 232 }] },
  { id: 's2', name: 'screen 2 — frost-3 at dusk, the aurora and the tower', camX: 1300, stageIndex: 3,
    hazards: [{ type: 'snowmanBig', dx: 110 }, { type: 'iceCrystals', dx: 172 }, { type: 'snowman', dx: 232 }] },
]);

const HERO = 'lorenzo';
const HOP = 0.36; // half a hop, seconds
const HOP_H = 22; // world px

function heroPose(t, airborne) {
  return {
    kind: airborne ? 'jump' : 'run', phase: (t * 1.6) % 1, time: t,
    vy: airborne ? -160 : 0, grounded: !airborne, squash: 0, lean: 0,
    roll: false, float: false, stomp: false, headless: false, facing: 1,
  };
}

// One pack per stage. The pack's ground() takes its light from what its own bg() last
// latched, so a card that paints its own backdrop first runs the shipped bg() once into a
// scrap canvas to set the stage's light for the lane (a frost-3 lane is the dusk lane).
const packs = new Map();
let frost = null;
function packFor(stage) {
  let pack = packs.get(stage);
  if (!pack) {
    frost = frost || CABINETS.find((cab) => cab.id === 'frost');
    pack = getStylePack('watercolor', { paperPreset: 'cardstockClear' });
    const scrap = document.createElement('canvas');
    scrap.width = 2;
    scrap.height = 2;
    const scene = { stageIndex: stage, progress: 0 };
    pack.bg(scrap.getContext('2d'), 0, 0, frost, FROST_STAGE_LEN, scene, 0, scene);
    packs.set(stage, pack);
  }
  return pack;
}

const hazardCache = new Map();
function hazardsFor(screen) {
  let list = hazardCache.get(screen.id);
  if (!list) {
    list = screen.hazards.map((h) => makeObstacle(h.type, screen.camX + PLAYER_X + h.dx));
    hazardCache.set(screen.id, list);
  }
  return list;
}

// `paint(ctx, frame)` is a style's backdrop painter, or null for the shipped watercolor one,
// or `{ sky(ctx, s) }`: the shipped watercolor backdrop with its sky pass handed to that
// painter through the pack's gallery seam (backgroundContext.frostSkyPainter).
// `options.snow`, a blizzard strength (0..1.5, the pack's ladder), lays the shipped
// blizzard over the finished card as the run lays it over the hero: haze and flakes.
// Only with the shipped or sky-only backdrops, whose bg() latched this frame's weather.
export function drawFrostCrayonScene(ctx, t, paint, screen, options = {}) {
  const skyOnly = paint && typeof paint === 'object' && typeof paint.sky === 'function' ? paint.sky : null;
  const stage = screen.stageIndex;
  const pack = packFor(stage);
  const lt = ((t % FROST_CRAYON_LOOP) + FROST_CRAYON_LOOP) % FROST_CRAYON_LOOP;
  const camX = screen.camX + lt * SCROLL;
  ctx.save();
  if (paint && !skyOnly) paint(ctx, frostFrame(camX, t, stage));
  else {
    const scene = { stageIndex: stage, progress: camX / FROST_STAGE_LEN };
    // The control is the cut-paper sky these rounds were judged against (Frost's sky until
    // it shipped in crayon, 29 Sep 2026), so it asks for it by name.
    scene.frostSkyPainter = skyOnly || null;
    if (options.snow > 0) scene.blizzard = options.snow;
    pack.bg(ctx, t, camX, frost, FROST_STAGE_LEN, scene, 0, scene);
  }
  ctx.restore();

  // The hero hops each hazard as it arrives, so the card reads as a run.
  let lift = 0;
  const hazards = hazardsFor(screen);
  for (const e of hazards) {
    const arrive = (e.x + e.w * 0.5 - PLAYER_X - screen.camX) / SCROLL;
    const d = (lt - arrive) / HOP;
    if (Math.abs(d) < 1) lift = Math.max(lift, HOP_H * (1 - d * d));
  }
  ctx.save();
  applyWorld(ctx, ZOOM, 0, GROUND_Y);
  pack.ground(ctx, camX, frost, [], [], t * 60, VIEW_W);
  for (const e of hazards) drawWorldEntity(ctx, e, camX, t, pack, {});
  drawToon(ctx, HERO, heroPose(t, lift > 0), PLAYER_X, GROUND_Y - lift, HERO_DRAW_H);
  ctx.restore();
  // The watercolor pack's post() is a paper-grain veil used only when the paper preview
  // is off; with cardstockClear it returns at once. Kept for parity with the other cards.
  if ((!paint || skyOnly) && pack.post) pack.post(ctx, t);
  if (options.snow > 0 && (!paint || skyOnly)) pack.weather(ctx, t);
}
