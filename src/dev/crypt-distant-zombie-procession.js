// Crypt gallery preview of the shipped Z1-Z3 far-hill procession. The gameplay
// card uses the production life list; the close-up isolates the same painter.
import { GROUND_Y, VIEW_W, ZOOM, applyWorld } from '../engine/camera.js';
import { getStylePack } from '../engine/stylePacks/index.js';
import { GOUACHE_KIT } from '../engine/stylePacks/cryptGouache.js';
import { CABINETS } from '../data/cabinets.js';
import { drawToon } from '../sprites/toons.js';
import { HERO_DRAW_H } from '../game/draw.js';
import { PLAYER_X } from '../game/player.js';
import { CRYPT_ZOMBIE_PROCESSION, CRYPT_ZOMBIE_PROCESSION_DURATION } from '../engine/stylePacks/cryptLife/procession.js';

const STAGE = 3;
const ANCHOR = 260;
const SCENE = GOUACHE_KIT.SCENE.bg;
const STUDY = {
  ...CRYPT_ZOMBIE_PROCESSION,
  id: 'lab-distant-zombie-procession',
  paint(ctx, f) {
    const t = ((f.t % CRYPT_ZOMBIE_PROCESSION_DURATION) + CRYPT_ZOMBIE_PROCESSION_DURATION)
      % CRYPT_ZOMBIE_PROCESSION_DURATION;
    CRYPT_ZOMBIE_PROCESSION.paint(ctx, { ...f, t });
  }
};

let pack, crypt;
function ready() {
  if (pack) return;
  pack = getStylePack('gouache', {});
  crypt = CABINETS.find((cab) => cab.id === 'crypt');
}
function cameraAt(x) {
  const stageOpen = 0.71 * SCENE.period;
  return (STUDY.u - stageOpen - x) / (SCENE.factor * ZOOM);
}
function pose(t) {
  return { kind: 'run', phase: (t * 1.6) % 1, time: t, vy: 0,
    grounded: true, squash: 0, lean: 0, facing: 1 };
}

export function drawCryptDistantZombieScene(ctx, t, close = false) {
  ready();
  const camX = cameraAt(ANCHOR);
  const bc = close
    ? { stageIndex: STAGE, progress: 0.28, cryptStudy: STUDY, cryptLife: false }
    : { stageIndex: STAGE, progress: 0.28 };
  if (close) {
    const shift = camX * SCENE.factor * ZOOM + 0.71 * SCENE.period;
    const crest = SCENE.profile(ANCHOR + shift, SCENE.period);
    ctx.save();
    ctx.translate(240, 171);
    ctx.scale(2.25, 2.25);
    ctx.translate(-ANCHOR, -(crest - 27));
    pack.bg(ctx, t, camX, crypt, 1000, null, 0, bc);
    ctx.restore();
    return;
  }
  ctx.save();
  pack.bg(ctx, ((t % CRYPT_ZOMBIE_PROCESSION_DURATION) + CRYPT_ZOMBIE_PROCESSION_DURATION)
    % CRYPT_ZOMBIE_PROCESSION_DURATION, camX, crypt, 1000, null, 0, bc);
  ctx.save();
  applyWorld(ctx, ZOOM, 0, GROUND_Y);
  pack.ground(ctx, camX, crypt, [], [], t * 60, VIEW_W);
  drawToon(ctx, 'lorenzo', pose(t), PLAYER_X, GROUND_Y, HERO_DRAW_H);
  ctx.restore();
  ctx.restore();
}

export const CRYPT_DISTANT_ZOMBIE_LOOP = CRYPT_ZOMBIE_PROCESSION_DURATION;
