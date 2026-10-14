// Gallery-only: THE ASTRONAUT AT THE FINISH, pose bake-off (14 Oct 2026). Peter: "do a
// bakeoff for the spaceman outside.. would prefer to see both arms? he may also need
// to move left 1 window so he's not crowding the hero at the finish line". The move
// is made (space-life.js finishWalker); these are the poses, each in level 1's parked
// finish frame at in-run size, the hero on the pad. PICKED D, drifting (14 Oct), and
// the run now starts his turn at four o'clock as he comes into view.
import { SPACE_LOOKS, drawSpaceRoom } from './space-look-candidates.js';
import { setWalkerPose } from './space-life.js';
import { GROUND_Y, applyWorld, screenYFor } from '../engine/camera.js';
import { HERO_DRAW_H } from '../game/draw.js';
import { drawToon } from '../sprites/toons.js';

export const WALKER_CANDIDATES = [
  { pose: 'now', letter: 'NOW', name: 'one arm', note: 'As he is: welding with the near arm, now and then waving it; the far arm never shows.' },
  { pose: 'grip', letter: 'A', name: 'GRIP AND WELD', note: 'The far hand holds his tether, the near one welds — and waves at you between welds.' },
  { pose: 'wave2', letter: 'B', name: 'BOTH ARMS WAVE', note: 'No work: both arms up, waving out of step, the drone circling.' },
  { pose: 'thumbs', letter: 'C', name: 'THUMBS UP', note: 'Far hand on his hip, near hand a thumbs-up for the finish, now and then a wave.' },
  { pose: 'drift', letter: 'D', name: 'DRIFTING', note: 'Spread out, arms and legs apart, turning slowly on a slack tether.' },
];

const LOOK = SPACE_LOOKS['plateau-occasional'];
const Z = 1.6, LEN = 84 * 120, FINISH = LEN - 222;
export function drawWalkerTile(ctx, t, pose) {
  setWalkerPose(pose);
  const view = 480 / Z, floor = screenYFor(GROUND_Y, Z), line = (view - 60 + 60) * 0.73;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, 480, 270); ctx.clip();
  ctx.fillStyle = LOOK.bg; ctx.fillRect(0, 0, 480, 270);
  applyWorld(ctx, Z, 0);
  ctx.save(); ctx.translate(0, GROUND_Y);
  drawSpaceRoom(ctx, LOOK, { cam: FINISH, view: view + 60, top: -floor / Z - 20, bottom: (270 - floor) / Z + 20, time: t,
    gates: [], length: LEN, stage: 1, finishCam: FINISH, holdT: t % 10, speed: 120, finishLine: line });
  ctx.restore();
  drawToon(ctx, 'lorenzo', { kind: 'idle', phase: t % 1, time: t, grounded: true, facing: 1 }, line - 12, GROUND_Y, HERO_DRAW_H);
  ctx.restore();
  setWalkerPose('drift');
}
