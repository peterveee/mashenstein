import assert from 'node:assert/strict';
import { installDom } from './dom-stub.js';

installDom({ innerWidth: 390, innerHeight: 844 });
const { frameForViewport, PHONE_PORTRAIT } = await import('../src/engine/frame.js');
const renderer = await import('../src/engine/renderer.js');
renderer.setPresentationFrame(frameForViewport({
  mode: PHONE_PORTRAIT, viewportWidth: 390, viewportHeight: 844,
}));
const { GravityRunState } = await import('../src/game/gravity/state.js');
const { save } = await import('../src/engine/save.js');
const { STAGE_BY_ID } = await import('../src/data/stages.js');
const { OUTSIDE_TRACE } = await import('../src/dev/space-life.js');

save.load();
save.newSlot(0, 0);
const run = new GravityRunState({
  save, stage: STAGE_BY_ID['gravity-1'], initialHeroId: 'lorenzo', difficulty: 1, seed: 42, onEnd: () => {},
});
run.enter();
run.updateCamera();

const k = run.corridor / 137, sceneScale = 1.3;
const view = (renderer.W / run.camZoom + 60) / (k * sceneScale);
const finishCam = run.finishCameraX();
const ctx = document.getElementById('game').getContext('2d');
function drawAt(cam, time, held = false) {
  run.camX = cam;
  run.distance = cam;
  run.finishing = held;
  run.backgroundT = time;
  if (held) run._finishBgT = 0;
  OUTSIDE_TRACE.frame = [];
  run.style.ground(ctx, cam, run.cabinet, run.obstacles, [], run.tRun, renderer.W / run.camZoom);
  return OUTSIDE_TRACE.frame.find((item) => item.name === 'astronaut')?.x;
}

const worldAnchors = [];
OUTSIDE_TRACE.on = true;
try {
  for (const [offset, time] of [[120, 0.1], [90, 0.2], [60, 0.3], [30, 0.4], [0, 0.5]]) {
    const cam = finishCam - offset;
    const x = drawAt(cam, time, offset === 0);
    assert(Number.isFinite(x), `astronaut stays drawn ${offset}px before the finish`);
    worldAnchors.push(x + cam / (k * sceneScale));
    if (offset === 0) {
      assert(x > view * 0.3 && x < view * 0.7,
        `astronaut finishes in a fully visible interior window (${x.toFixed(1)} of ${view.toFixed(1)})`);
    }
  }
  const holdX = drawAt(finishCam, 1.5, true);
  assert(Number.isFinite(holdX), 'astronaut remains drawn during the finish hold');
  assert(Math.abs(holdX - worldAnchors.at(-1) + finishCam / (k * sceneScale)) < 1e-6,
    'finish hold keeps the astronaut on the same station window');
  assert(Math.max(...worldAnchors) - Math.min(...worldAnchors) < 1e-6,
    'astronaut scrolls with one fixed station window during the approach');
} finally {
  OUTSIDE_TRACE.on = false;
  run.exit();
}

console.log('ok: Gravity Grid 1 portrait keeps its finish astronaut in one visible window through the finish');
