import { installDom } from './dom-stub.js';
installDom();

const { RunState } = await import('../src/game/run.js');
const { STAGES } = await import('../src/data/stages.js');
const { save } = await import('../src/engine/save.js');
const { makeObstacle, PICKUPS } = await import('../src/game/entities.js');
const { propSprite } = await import('../src/sprites/props.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

save.load();
save.newSlot(0, 0);

const stage = STAGES.find((entry) => entry.id === 'office-3');
const payoff = stage?.challenge?.payoff;
assert(!!payoff?.pickups?.length, '8-3 defines a collectible payoff at the money pile');
assert(!!propSprite('moneyPile', payoff?.w || 64, payoff?.h || 35), 'the improved money pile paints');
assert(PICKUPS.banknote?.coinValue === 5, 'a collected banknote pays five coins');

if (stage && payoff?.pickups?.length) {
  const run = new RunState({
    stage, team: ['lorenzo', 'rusty', 'clara'], save,
    seed: 8173, difficulty: 1, devInvuln: true, onEnd() {},
  });
  run.enter();
  const pileX = run.finishWorldX() + payoff.dx;
  const pilePickups = () => run.pickups.filter((item) => item.x >= pileX && item.x < pileX + payoff.w);

  for (let i = 0; i < 2; i++) run.crackSafe(makeObstacle('vaultSafe', 300 + i * 250));
  assert(pilePickups().length === 0, 'the cash pile waits until the safe challenge is met');

  run.crackSafe(makeObstacle('vaultSafe', 800));
  const reward = pilePickups();
  assert(reward.length === payoff.pickups.length, `the challenge lays every pile pickup (${reward.length})`);
  assert(reward.filter((item) => item.type === 'coin').length === 8
    && reward.filter((item) => item.type === 'banknote').length === 4,
  'the pile is a mix of real coins and banknotes');
  assert(reward.every((item) => item.live && item.def.coin), 'all pile items use the normal collectible currency path');

  const beforeExtraSafe = reward.length;
  run.crackSafe(makeObstacle('vaultSafe', 1100));
  assert(pilePickups().length === beforeExtraSafe, 'an extra safe does not duplicate the payout');

  run.obstacles = [];
  run.projectiles = [];
  run.player.grounded = true;
  run.player.y = 0;
  for (const item of [reward.find((pickup) => pickup.type === 'coin' && pickup.alt <= 9),
    reward.find((pickup) => pickup.type === 'banknote' && pickup.alt <= 9)]) {
    run.pickups = [item];
    const box = run.playerBox();
    run.camX += item.x + item.w / 2 - (box.x + box.w / 2);
    const coinsBefore = run.coins;
    run.collide();
    assert(!item.live && run.coins === coinsBefore + (item.def.coinValue || 1),
      `running into a ${item.type} collects it`);
  }
}

console.log(failed ? 'OFFICE-MONEY-PILE: FAILED' : 'OFFICE-MONEY-PILE: PASSED');
process.exit(failed ? 1 : 0);
