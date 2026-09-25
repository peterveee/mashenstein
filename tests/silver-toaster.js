// The silver toaster: a stage whose TOASTER plug is banked offers it in the gold
// one's place, and it pays coins and nothing else — no plug, no bank bonus, no
// TOASTERS FOUND tick. It does keep the toaster's rank point, or a banked stage
// could never rank S again.
import { installDom } from './dom-stub.js';
installDom();

const { RunState } = await import('../src/game/run.js');
const { save } = await import('../src/engine/save.js');
const { makePickup } = await import('../src/game/entities.js');
const { applyResult, computeRank } = await import('../src/game/progress.js');
const { propFrames, propSprite } = await import('../src/sprites/props.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

save.load();
save.newSlot(0, 0);

const stage = {
  id: 'test-silver', cabinet: 'plumber', index: 1,
  mission: { type: 'reach', desc: 'TEST' },
  challenge: { type: 'coins', n: 9999, desc: 'TEST' },
  durationSec: 40, applianceAt: 0.5, applianceHigh: false,
};
const newRun = () => {
  const run = new RunState({ stage, team: ['lorenzo', 'rusty', 'clara'], save, seed: 7, difficulty: 1, onEnd: () => {} });
  run.enter();
  return run;
};

let run = newRun();
assert(run.applianceType === 'appliance', 'an unbanked stage offers the gold toaster');

save.slot.campaign.plugs[stage.id] = [false, false, true];
run = newRun();
assert(run.applianceType === 'applianceSilver', 'a banked toaster plug swaps in the silver one');

const coins0 = run.coins, score0 = run.score;
run.onPickup(makePickup('applianceSilver', run.camX + 200, 44));
assert(run.coins > coins0, `the silver toaster pays coins (+${run.coins - coins0})`);
assert(run.score === score0, 'and no score');
assert(run.silverGot && !run.applianceGot, 'it is not the gold appliance');

const found0 = save.slot.stats.appliancesFound;
const result = { stage, success: false, challengeDone: false, applianceGot: false, silverGot: true, coins: 0, score: 0, damageTaken: 0 };
const gains = applyResult(save, result);
assert(gains.plugsNew === 0, 'no plug is banked');
assert(save.slot.stats.appliancesFound === found0, 'TOASTERS FOUND does not tick');
assert(computeRank({ success: true, challengeDone: true, silverGot: true, damageTaken: 0, coins: 1 }, 1) === 'S',
  'the silver toaster keeps the rank point, so a replay can still rank S');

assert(propFrames('applianceSilver') === propFrames('appliance'), 'it flies on the gold one\'s frames');
assert(propSprite('applianceSilver', 22, 18, 0), 'the silver sprite paints');

if (failed) { console.error('SILVER TOASTER: FAILED'); process.exit(1); }
console.log('SILVER TOASTER: PASSED');
