// CRYPT SHIFT style bake-off — the card. A style's backdrop (or the shipped vhs one,
// for the control), then the SHIPPED lane on top of it: the vhs pack's ground, real
// crypt hazards and the hero, exactly as the run draws them. Only the backdrop is on
// trial (Peter, 25 Sep 2026: "only the background will change our game lane remains
// as is").
//
// The vhs pack's post pass (scanlines, chroma fringe, tracking band) is a whole-frame
// treatment, so it goes over the control only: laid over a riso print or a gouache it
// would be judging the tape, not the painting. It can go back over any winner.
import { GROUND_Y, VIEW_W, ZOOM, applyWorld } from '../../engine/camera.js';
import { getStylePack } from '../../engine/stylePacks/index.js';
import { CABINETS } from '../../data/cabinets.js';
import { drawToon } from '../../sprites/toons.js';
import { HERO_DRAW_H, drawWorldEntity } from '../../game/draw.js';
import { PLAYER_X } from '../../game/player.js';
import { makeObstacle } from '../../game/entities.js';
import { cryptFrame } from './plan.js';

// The camera runs at SCROLL world px/s from each screen's anchor and loops, so a paused
// card shows the anchor frame and an animated one shows the parallax working.
export const CRYPT_STYLE_LOOP = 8;
const SCROLL = 40;

// Two screens: the abbey against the moon over the first graveyard hill, then a stretch
// four screens on — the second mausoleum, the lamp, the far groves. Hazards are placed
// ahead of the hero in world px from the anchor.
export const CRYPT_SCREENS = Object.freeze([
  { id: 's1', name: 'screen 1 — the abbey', camX: 0,
    hazards: [{ type: 'tombstone', dx: 118 }, { type: 'zombie', dx: 172 }] },
  { id: 's2', name: 'screen 2 — the second tomb', camX: 1600,
    hazards: [{ type: 'brazier', dx: 110 }, { type: 'tombstone', dx: 176 }] },
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
let crypt = null;
const hazardCache = new Map();
function hazardsFor(screen) {
  let list = hazardCache.get(screen.id);
  if (!list) {
    list = screen.hazards.map((h) => makeObstacle(h.type, screen.camX + PLAYER_X + h.dx));
    hazardCache.set(screen.id, list);
  }
  return list;
}

// `paint(ctx, frame)` is a style's backdrop painter, or null for the shipped vhs one.
export function drawCryptStyleScene(ctx, t, paint, screen) {
  if (!pack) {
    pack = getStylePack('vhs', {});
    crypt = CABINETS.find((cab) => cab.id === 'crypt');
  }
  const lt = ((t % CRYPT_STYLE_LOOP) + CRYPT_STYLE_LOOP) % CRYPT_STYLE_LOOP;
  const camX = screen.camX + lt * SCROLL;
  ctx.save();
  if (paint) paint(ctx, cryptFrame(camX, t));
  else pack.bg(ctx, t, camX, crypt, 1000, null);
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
  pack.ground(ctx, camX, crypt, [], [], t * 60, VIEW_W);
  for (const e of hazards) drawWorldEntity(ctx, e, camX, t, pack, {});
  drawToon(ctx, HERO, heroPose(t, lift > 0), PLAYER_X, GROUND_Y - lift, HERO_DRAW_H);
  ctx.restore();
  if (!paint && pack.post) pack.post(ctx, t);
}
