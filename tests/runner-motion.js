// Runner presentation keeps the fixed-step simulation but draws ordinary
// world motion at fractional screen positions.
import { installDom } from './dom-stub.js';
installDom();

const { RunState } = await import('../src/game/run.js');
const { drawWorldEntity } = await import('../src/game/draw.js');
const { makeObstacle } = await import('../src/game/entities.js');
const { save } = await import('../src/engine/save.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

save.load(); save.newSlot(0, 0);
const stage = {
  id: 'runner-motion', cabinet: 'plumber', index: 1,
  mission: { type: 'reach', desc: 'TEST' },
  challenge: { type: 'coins', n: 99, desc: 'TEST' },
  durationSec: 40, applianceAt: 0.5,
};
const run = new RunState({ stage, save, seed: 94, difficulty: 1, skipRunIn: true, onEnd: () => {} });
run.enter();

assert(run.renderSettings.smoothMotion === true,
  'runner opts ordinary world entities into fractional presentation');

const motionCalls = [];
const motionCtx = new Proxy({ imageSmoothingEnabled: false }, {
  get: (target, key) => key === 'drawImage'
    ? (...args) => motionCalls.push(args)
    : (key in target ? target[key] : () => {}),
  set: (target, key, value) => { target[key] = value; return true; },
});
drawWorldEntity(motionCtx, makeObstacle('crate', 200), 100.25, 0,
  run.style, run.renderSettings);
assert(motionCalls.some((args) => Number.isFinite(args[1]) && args[1] % 1 !== 0),
  'runner world props retain fractional horizontal positions');

const bollardCalls = [];
const bollardCtx = new Proxy({ imageSmoothingEnabled: false }, {
  get: (target, key) => key === 'drawImage'
    ? (...args) => bollardCalls.push(args)
    : (key in target ? target[key] : () => {}),
  set: (target, key, value) => { target[key] = value; return true; },
});
drawWorldEntity(bollardCtx, makeObstacle('pipe', 200), 100.25, 0,
  run.style, run.renderSettings);
assert(bollardCalls.some((args) => args[4] === 24),
  'hydraulic bollard art rises to 24px without enlarging its 18px collision box');

console.log(failed ? 'RUNNER MOTION: FAILED' : 'RUNNER MOTION: PASSED');
process.exit(failed ? 1 : 0);
