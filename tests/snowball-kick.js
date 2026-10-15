// The giant snowball is kicked like the barrel it stands in for, then bursts
// into powder where it lands (Peter, 16 Oct 2026) — not broken on the boot,
// and not rolled out of frame like the barrel.
import { installDom } from './dom-stub.js';
installDom();

const { RunState } = await import('../src/game/run.js');
const { makeObstacle } = await import('../src/game/entities.js');
const { startPunt, HEAVY_PUNT } = await import('../src/game/punt.js');
const { save } = await import('../src/engine/save.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

save.load();
save.newSlot(0, 0);
const stage = {
  id: 'snowball-kick', cabinet: 'plumber', index: 1,
  mission: { type: 'reach', desc: 'TEST' },
  challenge: { type: 'coins', n: 99, desc: 'TEST' },
  durationSec: 40, applianceAt: 0.5,
};
const run = new RunState({ stage, save, seed: 77, difficulty: 1, skipRunIn: true, onEnd: () => {} });
run.enter();

const ball = makeObstacle('giantSnowball', run.playerWorldX() + 20);
const barrel = makeObstacle('barrel', run.playerWorldX() + 20);
assert(!ball.def.puntBreaks && ball.def.punt === 'heavy', 'the snowball is a heavy punt, not a kick-apart');
run.obstacles = [ball, barrel];
startPunt(ball, run.speed, HEAVY_PUNT);
startPunt(barrel, run.speed, HEAVY_PUNT);

let airborneFrames = 0;
for (let i = 0; i < 600 && ball.live; i++) {
  if (ball.alt > 0) airborneFrames++;
  run.updateEntities(1 / 60, run.speed);
}
assert(airborneFrames > 20, 'the snowball flies before it bursts');
assert(!ball.live && ball.broken, 'the snowball bursts on its first touchdown');
assert(barrel.live && barrel.alt === 0, 'the barrel beside it lands and carries on rolling');
run.exit();

console.log(failed ? 'SNOWBALL KICK: FAILED' : 'SNOWBALL KICK: PASSED');
process.exit(failed ? 1 : 0);
