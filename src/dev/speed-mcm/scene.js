// SPEED ZONE mid-century bake-off — the card. A style's backdrop (or the shipped faux3d
// one, for the control), then the SHIPPED lane on top: faux3d's road, real Speed
// hazards and the hero, exactly as the run draws them. Only the backdrop is on trial,
// as in the Crypt bake-off (src/dev/crypt-styles/scene.js).
//
// The pack is built with the settings speed-1..3 ship with (stages.js: paperPreset
// 'cardstockClear'), so the control is the cut-paper look the game shows and the lane
// keeps its paper finish in every card.
import { GROUND_Y, VIEW_W, ZOOM, applyWorld } from '../../engine/camera.js';
import { getStylePack } from '../../engine/stylePacks/index.js';
import { CABINETS } from '../../data/cabinets.js';
import { drawToon } from '../../sprites/toons.js';
import { HERO_DRAW_H, drawWorldEntity } from '../../game/draw.js';
import { PLAYER_X } from '../../game/player.js';
import { makeObstacle } from '../../game/entities.js';
import { speedFrame, SPEED_STAGE_LEN } from './plan.js';

// The camera runs at SCROLL world px/s from each screen's anchor and loops, so a paused
// card shows the anchor frame and an animated one shows the parallax working.
export const SPEED_MCM_LOOP = 8;
const SCROLL = 40;

// Two screens of speed-1. camX is chosen so the SHIPPED backdrop shows the same stretch
// the plan paints: the opening with the wind pump before the sun (camX 0 is the stage's
// first frame; the pump crosses 362 -> 285 over the loop), and near tile 11's coyote
// (on its ledge at x 431 -> 207 over the loop, howling at t 2.9-4.4) with the strata
// butte over the far mesa and a tumbleweed. Hazards are placed ahead of the hero in
// world px from the anchor.
export const SPEED_MCM_SCREENS = Object.freeze([
  { id: 's1', name: 'screen 1 — the wind pump', camX: 0,
    hazards: [{ type: 'cactus', dx: 118 }, { type: 'rattlesnake', dx: 178 }] },
  { id: 's2', name: 'screen 2 — the coyote', camX: 6900,
    hazards: [{ type: 'trafficCone', dx: 112 }, { type: 'cactusBig', dx: 174 }] },
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

let pack = null;
let speed = null;
const hazardCache = new Map();
function hazardsFor(screen) {
  let list = hazardCache.get(screen.id);
  if (!list) {
    list = screen.hazards.map((h) => makeObstacle(h.type, screen.camX + PLAYER_X + h.dx));
    hazardCache.set(screen.id, list);
  }
  return list;
}

// `paint(ctx, frame, opts)` is a style's backdrop painter, or null for the shipped faux3d
// one. `opts.coyote` swaps the MCM painters' coyote (the coyote bake-off); the shipped
// control ignores it.
export function drawSpeedMcmScene(ctx, t, paint, screen, opts = {}) {
  if (!pack) {
    pack = getStylePack('faux3d', { paperPreset: 'cardstockClear' });
    speed = CABINETS.find((cab) => cab.id === 'speed');
  }
  const lt = ((t % SPEED_MCM_LOOP) + SPEED_MCM_LOOP) % SPEED_MCM_LOOP;
  const camX = screen.camX + lt * SCROLL;
  ctx.save();
  if (paint) paint(ctx, speedFrame(camX, t), opts);
  else {
    const scene = { stageIndex: 1, progress: camX / SPEED_STAGE_LEN };
    pack.bg(ctx, t, camX, speed, SPEED_STAGE_LEN, scene, 0, scene);
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
  pack.ground(ctx, camX, speed, [], [], t * 60, VIEW_W);
  for (const e of hazards) drawWorldEntity(ctx, e, camX, t, pack, {});
  drawToon(ctx, HERO, heroPose(t, lift > 0), PLAYER_X, GROUND_Y - lift, HERO_DRAW_H);
  ctx.restore();
  // faux3d's whole-frame sheen goes over the control only, as the vhs tape did on the
  // Crypt cards: laid over a painting it would be judging the sheen.
  if (!paint && pack.post) pack.post(ctx, t);
}
