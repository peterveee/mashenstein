// SPEED ZONE in MID-CENTURY MODERN — as shipped (28 Sep 2026). The run's own pack
// (stylePacks/index.js mcmPack) at the opening, halfway and finish of each stage, with
// the shipped road, and the hero in the pack's late light; and the Chuck Jones coyote
// playing each of the desert's shows up close, looped. Gallery-only.
import { GROUND_Y, VIEW_W, ZOOM, applyWorld } from '../../engine/camera.js';
import { getStylePack } from '../../engine/stylePacks/index.js';
import { CABINETS } from '../../data/cabinets.js';
import { STAGE_BY_ID } from '../../data/stages.js';
import { drawToon } from '../../sprites/toons.js';
import { HERO_DRAW_H } from '../../game/draw.js';
import { PLAYER_X } from '../../game/player.js';
import { drawTextVectorCentered, textYForMid } from '../../engine/sprites.js';
import { MCM_KIT, MCM_PAINT, arcPalette, actU } from '../../engine/stylePacks/speedMcm.js';
import { drawJonesCoyote } from '../../engine/stylePacks/speedMcmCoyote.js';

const LEN = 11340;
let pack = null;
let speed = null;
const POSE = (t) => ({
  kind: 'run', phase: (t * 1.6) % 1, time: t, vy: 0, grounded: true, squash: 0, lean: 0,
  roll: false, float: false, stomp: false, headless: false, facing: 1,
});

function caption(ctx, str, x = 8, y = 12) {
  const scale = 0.62;
  ctx.fillStyle = 'rgba(16,14,24,0.6)';
  ctx.fillRect(x - 4, y - 7, str.length * 5.1 + 8, 14);
  drawTextVectorCentered(ctx, str, x + str.length * 2.55, textYForMid(y, scale, 'bold'), '#fff6e0', scale, 'bold');
}

// The hero on a layer of his own, the pack's light laid over his pixels only (as run.js
// does on the overlay).
const layers = new WeakMap();
function heroLit(ctx, t, veil) {
  let c = layers.get(ctx);
  if (!c || c.width !== ctx.canvas.width || c.height !== ctx.canvas.height) {
    c = document.createElement('canvas');
    c.width = ctx.canvas.width;
    c.height = ctx.canvas.height;
    layers.set(ctx, c);
  }
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, c.width, c.height);
  g.setTransform(ctx.getTransform());
  applyWorld(g, ZOOM, 0, GROUND_Y);
  drawToon(g, 'lorenzo', POSE(t), PLAYER_X, GROUND_Y, HERO_DRAW_H);
  if (veil) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = veil;
    g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'source-over';
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(c, 0, 0);
  ctx.restore();
}

export const SHIPPED_STILLS = [1, 2, 3].flatMap((stage) => [
  { stage, p: 0.02, label: 'opening' },
  { stage, p: 0.5, label: 'halfway' },
  { stage, p: 0.97, label: 'the finish' },
]);
// The camera creeps from the still's spot at 40 world px/s over an 8 s loop, so the
// parallax and the wildlife move.
export function drawShippedStill(ctx, t, still) {
  if (!pack) {
    speed = CABINETS.find((cab) => cab.id === 'speed');
    pack = getStylePack(speed.style, { paperCabinet: 'speed', paperPreset: STAGE_BY_ID['speed-1'].paperPreset });
  }
  const loop = ((t % 8) + 8) % 8;
  const camX = still.p * LEN + loop * 40;
  pack.bg(ctx, t, camX, speed, LEN, null, 0, { stageIndex: still.stage, progress: camX / LEN, heroFrac: 0.3 });
  ctx.save();
  applyWorld(ctx, ZOOM, 0, GROUND_Y);
  pack.ground(ctx, camX, speed, [], [], t * 60, VIEW_W);
  ctx.restore();
  heroLit(ctx, t, pack.heroLight());
  caption(ctx, `SPEED-${still.stage}  ${still.label.toUpperCase()}`);
}

// The coyote's shows, each on its own clock. The wink-wait is the finish's: it only
// blinks until the hero is on the pad, then winks once; here the pad comes 3 s into a
// 9 s loop.
export const JONES_SHOWS = [
  { mode: 'howl', name: 'the howl (every 5 s)', u: 0.3 },
  { mode: 'yawn', name: 'the yawn and doze', u: 0.3 },
  { mode: 'chorus', name: 'the chorus with the pup', u: 0.62 },
  { mode: 'wink', name: 'the wink', u: 0.85 },
  { mode: 'winkWait', name: 'speed-3\'s finish: waits, then winks', u: 0.97 },
];
export function drawJonesShow(ctx, t, show, W = 480, H = 270) {
  const pal = arcPalette(show.u);
  const P = MCM_KIT.pats(ctx, pal);
  ctx.fillStyle = pal.sky[2];
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = pal.sky[4];
  ctx.fillRect(0, H * 0.45, W, H * 0.55);
  ctx.fillStyle = pal.near.fill;
  ctx.fillRect(0, H * 0.82, W, H * 0.18);
  ctx.save();
  ctx.translate(W / 2, H * 0.84);
  ctx.scale(3.6 * (W / 480), 3.6 * (W / 480));
  MCM_PAINT.ledge(ctx, 0, 0, pal, P);
  let since = null;
  if (show.mode === 'winkWait') {
    const k = ((t % 9) + 9) % 9;
    since = k < 3 ? null : k - 3;
  }
  drawJonesCoyote(ctx, t, 0, -12.4, 1, pal.coyote, { mode: show.mode, since, pace: 1 });
  ctx.restore();
  caption(ctx, show.name.toUpperCase());
}
