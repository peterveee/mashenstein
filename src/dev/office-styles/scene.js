// CORPORATE KOMBAT style bake-off — the card. A style paints the floor (backdrop and the
// slab under the lane), then real office hazards and the hero go on top exactly as the run
// draws them, then the style's optional front pass (a pillar sweeping past close to camera).
// The control is the shipped doodle pack: graph paper, its biro ground line and its biro
// underline under each hazard.
import { GROUND_Y, VIEW_W, ZOOM, applyWorld } from '../../engine/camera.js';
import { getStylePack } from '../../engine/stylePacks/index.js';
import { CABINETS } from '../../data/cabinets.js';
import { drawToon } from '../../sprites/toons.js';
import { HERO_DRAW_H, drawWorldEntity } from '../../game/draw.js';
import { PLAYER_X } from '../../game/player.js';
import { makeObstacle } from '../../game/entities.js';
import { officeFrame } from './plan.js';

// The camera runs at SCROLL world px/s from each screen's anchor and loops, so a paused
// card shows the anchor frame and an animated one shows the parallax working. 120 is
// three-quarters of the run's BASE_SPEED (160): close enough to judge the parallax at
// game pace, and in 12 s it covers most of each floor's wall and all of its furniture.
export const OFFICE_STYLE_LOOP = 12;
const SCROLL = 120;

// One screen per floor of the climb. Hazards are placed ahead of the hero in world px —
// each floor's own furniture since 12 Oct 2026 (data/cabinets.js OFFICE_FLOORS).
export const OFFICE_SCREENS = Object.freeze([
  { id: 'lobby', floor: 'lobby', name: '8-1 the lobby (G, morning)', camX: 0,
    hazards: [{ type: 'mopBucket', dx: 130 }, { type: 'ashUrnFire', dx: 300 }, { type: 'wetFloorSign', dx: 620 },
      { type: 'mopBucket', dx: 900 }, { type: 'velvetRope', dx: 1180 }, { type: 'ashUrnFire', dx: 1420 }] },
  { id: 'open', floor: 'open', name: '8-2 open plan (floor 23, noon)', camX: 0,
    hazards: [{ type: 'shredder', dx: 120 }, { type: 'birthdayBunting', dx: 220 }, { type: 'shredder', dx: 340 },
      { type: 'mailCart', dx: 640 }, { type: 'birthdayBunting', dx: 900 }, { type: 'binFire', dx: 1160 }, { type: 'shredder', dx: 1400 }] },
  { id: 'exec', floor: 'exec', name: '8-3 executive floor (88, dusk)', camX: 0,
    hazards: [{ type: 'drinksTrolley', dx: 130 }, { type: 'dogSnarler', dx: 280 }, { type: 'founderBust', dx: 640 },
      { type: 'chandelier', dx: 900 }, { type: 'drinksTrolley', dx: 1160 }, { type: 'dogSnarler', dx: 1420 }] },
]);

const HERO = 'lorenzo';
const HOP = 0.3; // half a hop, seconds
const HOP_H = 24; // world px

function heroPose(t, airborne) {
  return {
    kind: airborne ? 'jump' : 'run', phase: (t * 1.6) % 1, time: t,
    vy: airborne ? -160 : 0, grounded: !airborne, squash: 0, lean: 0,
    roll: false, float: false, stomp: false, headless: false, facing: 1,
  };
}

let doodle = null;
let office = null;
const hazardCache = new Map();
function hazardsFor(screen) {
  let list = hazardCache.get(screen.id);
  if (!list) {
    list = screen.hazards.map((h) => makeObstacle(h.type, screen.camX + PLAYER_X + h.dx));
    hazardCache.set(screen.id, list);
  }
  return list;
}

// `style` is a STYLE ({ paint, paintFront? }) or null for the shipped doodle backdrop.
export function drawOfficeStyleScene(ctx, t, style, screen) {
  if (!doodle) {
    doodle = getStylePack('doodle', {});
    office = CABINETS.find((cab) => cab.id === 'office');
  }
  const lt = ((t % OFFICE_STYLE_LOOP) + OFFICE_STYLE_LOOP) % OFFICE_STYLE_LOOP;
  const camX = screen.camX + lt * SCROLL;
  const frame = style ? officeFrame(screen.floor, camX, t) : null;
  ctx.save();
  if (style) style.paint(ctx, frame);
  else doodle.bg(ctx, t, camX, office, 1000, null);
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
  if (!style) doodle.ground(ctx, camX, office, [], [], t * 60, VIEW_W);
  for (const e of hazards) drawWorldEntity(ctx, e, camX, t, style ? null : doodle, {});
  drawToon(ctx, HERO, heroPose(t, lift > 0), PLAYER_X, GROUND_Y - lift, HERO_DRAW_H);
  ctx.restore();
  if (style && style.paintFront) {
    ctx.save();
    style.paintFront(ctx, frame);
    ctx.restore();
  }
}
