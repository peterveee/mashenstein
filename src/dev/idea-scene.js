// THE SCENE A CABINET-IDEAS BAKE-OFF IS DRAWN INTO. Shared by the gallery's
// `*-ideas` lab sections and the work/local ideas harness, so what an idea is judged
// against in review is exactly what the gallery shows.
//
// An idea module (src/dev/<cabinet>-ideas.js) exports a list of
//   { id, name, note, place, paint, zoom?, cx?, x?, alt? }
// and `place` says where its painter runs:
//   'bg'   — screen space, after the cabinet's own backdrop and before the lane:
//            paint(ctx, t, camX, info)
//   'lane' — world space (the ZOOM camera applied), standing on the road in front of
//            the hero: paint(ctx, t, x, groundY, info), x = PLAYER_X + (idea.x ?? 70)
//   'air'  — world space at a flyer's height: paint(ctx, t, x, y, info),
//            y = GROUND_Y - (idea.alt ?? 20)
// `info` carries { cab, pack, camX, beat, bpm, scene } — beat-stepped art (the LCD
// cabinet animates on the heard beat, never on wall time) reads `info.beat`.
import { GROUND_Y, VIEW_W, ZOOM, applyWorld } from '../engine/camera.js';
import { drawToon } from '../sprites/toons.js';
import { HERO_DRAW_H, drawWorldEntity } from '../game/draw.js';
import { PLAYER_X } from '../game/player.js';
import { makeObstacle } from '../game/entities.js';

// The close-up backing per cabinet: its own lit ground colour, so a prop is judged
// on the tone it will actually stand against.
const CLOSE_BACK = {
  plumber: ['#a8e0f8', '#3a9c48'],
  speed: ['#f8c060', '#806b64'],
  rhythm: ['#dce49a', '#3c3f45'],
};

function heroPose(t) {
  return {
    kind: 'run', phase: (t * 1.6) % 1, time: t, vy: 0, grounded: true, squash: 0, lean: 0,
    roll: false, float: false, stomp: false, headless: false, facing: 1,
  };
}

export function ideaInfo(cab, pack, t) {
  const bpm = cab.music?.bpm || 120;
  const beat = t * bpm / 60;
  const camX = t * 60;
  const scene = cab.id === 'rhythm' ? { stageIndex: 1, beat } : null;
  return { cab, pack, camX, beat, bpm, scene };
}

// The backdrop, the lane and the hero, with `idea` painted at its place. `ref` is an
// obstacle type from the cabinet's own bag, drawn instead of an idea for scale.
// `totalDist` is the stage length the backdrop is told; Infinity (an overtime run) leaves
// out a stage's pinned landmarks, so an idea is not judged beside a shipped one.
export function drawIdeaScene(ctx, t, cab, pack, idea = null, { ref = null, hero = 'lorenzo', totalDist = 1000 } = {}) {
  const info = ideaInfo(cab, pack, t);
  const { camX, scene } = info;
  pack.bg(ctx, t, camX, cab, totalDist, scene);
  if (idea?.place === 'bg') idea.paint(ctx, t, camX, info);
  ctx.save();
  applyWorld(ctx, ZOOM, 0, GROUND_Y);
  pack.ground(ctx, camX, cab, [], [], t * 60, VIEW_W);
  drawToon(ctx, hero, heroPose(t), PLAYER_X, GROUND_Y, HERO_DRAW_H);
  if (ref) {
    const e = makeObstacle(ref, camX + PLAYER_X + 70);
    drawWorldEntity(ctx, e, camX, t, pack, {});
  }
  if (idea?.place === 'lane') idea.paint(ctx, t, PLAYER_X + (idea.x ?? 70), GROUND_Y, info);
  if (idea?.place === 'air') idea.paint(ctx, t, PLAYER_X + (idea.x ?? 80), GROUND_Y - (idea.alt ?? 20), info);
  ctx.restore();
  if (pack.post) pack.post(ctx, t);
  if (pack.weather) pack.weather(ctx, t);
}

// A lane or air idea on its own, `idea.zoom` times over (default 5), feet on a
// ground line near the bottom of a w-by-h box. `idea.cx` shifts the painter's origin
// in world units for a prop that is not centred on its x.
export function drawIdeaCloseUp(ctx, t, cab, pack, idea, w, h) {
  const [back, ground] = CLOSE_BACK[cab.id] || ['#dcecf8', '#98b8d8'];
  const floor = h - 10;
  ctx.fillStyle = back;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = ground;
  ctx.fillRect(0, floor, w, h - floor);
  const z = idea.zoom ?? 5;
  ctx.save();
  ctx.translate(w / 2, floor);
  ctx.scale(z, z);
  const info = ideaInfo(cab, pack, t);
  idea.paint(ctx, t, idea.cx ?? 0, idea.place === 'air' ? -(idea.closeAlt ?? 16) : 0, info);
  ctx.restore();
}
