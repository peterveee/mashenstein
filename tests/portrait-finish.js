// Portrait finish regression: the narrow phone view must still arm the finish
// before the run reaches totalDist, or a reach-only mission fails at the flag.
import assert from 'node:assert/strict';
import { installDom } from './dom-stub.js';

installDom({ innerWidth: 390, innerHeight: 844 });
window.__mash_platform = { isDesktop: false, isIphone: true };

const { frameForViewport } = await import('../src/engine/frame.js');
const { setPresentationFrame } = await import('../src/engine/renderer.js');
const { RunState } = await import('../src/game/run.js');
const { save } = await import('../src/engine/save.js');

save.load(); save.newSlot(0, 0);
setPresentationFrame(frameForViewport({
  mode: 'phone-portrait', viewportWidth: 390, viewportHeight: 844,
}));

const stage = {
  id: 'portrait-finish-1', cabinet: 'plumber', index: 1,
  mission: { type: 'reach', desc: 'REACH THE FLAG' },
  challenge: { type: 'coins', n: 99, desc: 'TEST' },
  durationSec: 40,
};
let result = null;
const run = new RunState({ stage, save, seed: 17, difficulty: 1, skipRunIn: true,
  onEnd: (next) => { result = next; } });
run.enter();

assert.ok(run.finishCameraX() < run.totalDist,
  `portrait finish trigger leaves runway (${run.totalDist - run.finishCameraX()}px)`);
run.camX = run.finishCameraX();
run.distance = run.camX;
run.obstacles = [];
run.pickups = [];
run.update(1 / 60);
assert.equal(run.finishing, true, 'a portrait reach mission arms at the finish trigger');
assert.equal(result, null, 'arming the portrait finish does not fail the mission');

console.log('PORTRAIT FINISH: PASSED');
