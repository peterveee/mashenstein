// Airborne hazards get a small deterministic lateral drift. The art and hitbox
// must travel together, and each instance must have its own phase.
import { installDom } from './dom-stub.js';
installDom();

const { RunState } = await import('../src/game/run.js');
const { makeObstacle } = await import('../src/game/entities.js');
const { save } = await import('../src/engine/save.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

save.load(); save.newSlot(0, 0);
const stage = {
  id: 'flyer-motion', cabinet: 'plumber', index: 1,
  mission: { type: 'reach', desc: 'TEST' },
  challenge: { type: 'coins', n: 99, desc: 'TEST' },
  durationSec: 40, applianceAt: 0.5,
};
const run = new RunState({ stage, save, seed: 93, difficulty: 1, skipRunIn: true, onEnd: () => {} });
run.enter();

for (const type of ['drone', 'buzzbird', 'shooterDrone', 'paperwork']) {
  const ob = makeObstacle(type, 500);
  run.obstacles = [ob];
  const samples = [];
  for (let i = 0; i <= 12 * 60; i++) {
    run.tRun = i / 60;
    run.updateEntities(1 / 60, 160);
    samples.push(ob.x);
  }
  const min = Math.min(...samples), max = Math.max(...samples);
  if (type === 'buzzbird') {
    assert(samples.at(-1) < samples[0] - 250, 'buzzbird approaches the player from right to left');
    assert(max - min > 250, 'buzzbird uses the faster approach distance');
    assert(!ob.def.airDrift && ob.def.airVx < 0, 'buzzbird has no side-to-side wobble');
  } else {
    assert(max - min > 4, `${type} drifts horizontally over time`);
    assert(min < 500 && max > 500, `${type} moves to both sides of its spawn point`);
    assert(max - min <= 12, `${type} keeps its lateral movement small`);
  }
}

const buzzbird = makeObstacle('buzzbird', 900);
run.obstacles = [buzzbird];
run.tRun = 0;
const buzzStart = buzzbird.x;
for (let i = 0; i < 10 * 60; i++) {
  run.tRun = (i + 1) / 60;
  run.updateEntities(1 / 60, 160);
}
assert(buzzbird.x < buzzStart - 250, 'buzzbird keeps moving toward the player while hovering');
assert(buzzbird.def.bob === true, 'buzzbird keeps its gentle vertical hover animation');

const a = makeObstacle('buzzbird', 700);
const b = makeObstacle('buzzbird', 811);
assert(a.bobPhase !== b.bobPhase, 'airborne instances receive independent motion phases');

console.log(failed ? 'FLYER MOTION: FAILED' : 'FLYER MOTION: PASSED');
process.exit(failed ? 1 : 0);
