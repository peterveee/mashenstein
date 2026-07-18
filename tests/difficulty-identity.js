// The joke is load-bearing: difficulty modes 1-4 MUST resolve to identical
// gameplay configs. A real tuning difference between them is a bug.
import { installDom } from './dom-stub.js';
installDom();

const { RunState } = await import('../src/game/run.js');
const { save } = await import('../src/engine/save.js');
const { STAGES } = await import('../src/data/stages.js');

save.load();
save.newSlot(0, 0);

function configFor(difficulty) {
  let cfg = null;
  const run = new RunState({
    stage: STAGES[0], team: ['lorenzo', 'gnash', 'mochi'], save,
    seed: 42, difficulty, onEnd: () => {},
  });
  run.enter();
  cfg = {
    oneHit: run.oneHit,
    battery: run.maxBattery(),
    react: run.spawner.react,
    checkpoints: run.checkpoints.length,
    baseSpeed: run.baseSpeed(),
    unplugged: run.unplugged,
  };
  return JSON.stringify(cfg);
}

let failed = false;
const base = configFor(1);
for (const d of [2, 3, 4]) {
  const c = configFor(d);
  if (c !== base) { console.error(`FAIL: difficulty ${d} differs from 1:\n  ${base}\n  ${c}`); failed = true; }
  else console.log(`ok: difficulty ${d} is byte-identical to 1`);
}
const unplugged = configFor(5);
if (unplugged === base) { console.error('FAIL: UNPLUGGED is identical to BREEZY — it must be real'); failed = true; }
else console.log('ok: UNPLUGGED differs (it is real)');

console.log(failed ? 'DIFFICULTY-IDENTITY: FAILED' : 'DIFFICULTY-IDENTITY: PASSED');
process.exit(failed ? 1 : 0);
