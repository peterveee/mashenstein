// FROST — the sleigh flypast, round two (Peter, 25 Sep 2026: "can we do a bake off with new
// and improved santa and reindeer flying across the sky?"). Gallery-only scene; the
// candidates themselves live in src/sprites/sleigh.js with the first round, so each card
// flies a candidate through drawFrostFlypast and flypastAt — the code that would ship it.
//
// The card that matters is the finish: frost-3 at the tape, in the heaviest blizzard of the
// cabinet, the sleigh on the overlay IN FRONT of the snow at the shipped scale and glow,
// along the real arc (no mast on a card, so the arc takes its no-mast crest).
import { GROUND_Y, VIEW_W, ZOOM, applyWorld } from '../engine/camera.js';
import { getStylePack, frostFlypastArc } from '../engine/stylePacks/index.js';
import { CABINETS } from '../data/cabinets.js';
import { drawToon } from '../sprites/toons.js';
import { HERO_DRAW_H } from '../game/draw.js';
import { PLAYER_X } from '../game/player.js';
import {
  drawFrostFlypast, flypastAt, FROST_FLYPAST, FROST_FLYPAST_SPEED, FROST_FLYPAST_SPAN,
  FROST_FLYPAST_CLEAR, FROST_FLYPAST_SCALE,
} from '../sprites/sleigh.js';

export const FROST_SLEIGH_V2 = [
  { id: FROST_FLYPAST, label: 'H — what flies now' },
  { id: 'paper-santa', label: 'I — paper Santa, in colour' },
  { id: 'paper-santa-dust', label: 'J — I, with stardust' },
  { id: 'paper-santa-nine', label: 'K — the full team, Rudolph and eight' },
];

function heroPose(t) {
  return { kind: 'run', phase: (t * 1.6) % 1, time: t, vy: 0, grounded: true, squash: 0, lean: 0,
    roll: false, float: false, stomp: false, headless: false, facing: 1 };
}
const frost = () => CABINETS.find((c) => c.id === 'frost');
// One crossing and a breath, looped.
const LOOP = (480 + 2 * FROST_FLYPAST_SPAN) / FROST_FLYPAST_SPEED + 0.8;

export function drawSleighFinishScene(ctx, t, id, { weather = true } = {}) {
  const cab = frost();
  const pack = getStylePack(cab.style, {});
  const TD = 18144, camX = 0.985 * TD + t * 60;
  const bc = { stageIndex: 3, progress: camX / TD };
  pack.bg(ctx, t, camX, cab, TD, bc, 0, bc);
  ctx.save();
  applyWorld(ctx, ZOOM, 0, GROUND_Y);
  pack.ground(ctx, camX, cab, [], [], t * 60, VIEW_W);
  drawToon(ctx, 'lorenzo', heroPose(t), PLAYER_X, GROUND_Y, HERO_DRAW_H);
  ctx.restore();
  if (pack.post) pack.post(ctx, t);
  if (weather && pack.weather) pack.weather(ctx, t);
  const tt = t % LOOP;
  const arc = frostFlypastArc(null, null, FROST_FLYPAST_CLEAR);
  const p = flypastAt(tt, { left: 0, right: 480, poleX: 330, arc });
  if (p) drawFrostFlypast(ctx, p.x, p.y, t, { id, scale: FROST_FLYPAST_SCALE });
}
// Held in the frost-3 sky, `zoom` times the shipped size, flying in place.
export function drawSleighCloseUp(ctx, t, id, { zoom = 3.4, w = 480, h = 270 } = {}) {
  const cab = frost();
  const pack = getStylePack(cab.style, {});
  const bc = { stageIndex: 3, progress: 0.5 };
  pack.bg(ctx, t, 9000, cab, 18144, bc, 0, bc);
  drawFrostFlypast(ctx, w * 0.78, h * 0.42, t, { id, scale: zoom });
}
