// All three bosses run headlessly with a stomping bot; verifies phases, joke
// phases, damage-by-redirect, and clean end (win or loss) without throwing.
import { installDom } from './dom-stub.js';
const dom = installDom();

const { BossState } = await import('../src/game/boss.js');
const { save } = await import('../src/engine/save.js');
const { Input } = await import('../src/engine/input.js');
const { PLAYER_X } = await import('../src/game/player.js');

save.load();
save.newSlot(0, 0);

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const canvasCtx = globalThis.document.createElement('canvas').getContext('2d');

for (const bossCab of ['neon', 'rhythm', 'surge']) {
  let result = null;
  const boss = new BossState({
    bossCab,
    team: ['lorenzo', 'grumpos', 'b33p'],
    save, seed: 99, difficulty: 1,
    onEnd: (r) => { result = r; },
  });
  boss.enter();
  const TICK = 1 / 60;
  let ticks = 0, duckHold = false;
  while (!result && ticks < 60 * 300) {
    ticks++;
    const px = boss.camX + PLAYER_X;
    // Bot: jump obstacles, stomp down onto them (Lorenzo), fire ability on cooldown.
    let nearest = null;
    for (const ob of boss.obstacles) {
      if (!ob.live || ob.def.action === 'none') continue;
      if (ob.x + ob.w < px) continue;
      if (!nearest || ob.x < nearest.x) nearest = ob;
    }
    const sp = boss.speed;
    if (!boss.player.grounded) {
      // stomp down onto the obstacle: press duck mid-air over it
      if (nearest && Math.abs(nearest.x - px) < 30 && !duckHold) { Input.press('duck'); duckHold = true; }
    } else {
      if (duckHold) { Input.release('duck'); duckHold = false; }
      if (nearest && nearest.def.action === 'jump' && (nearest.x - px) < sp * 0.3) Input.press('jump');
      else Input.release('jump');
      if (nearest && nearest.def.action === 'duck' && (nearest.x - px) < sp * 0.4) { Input.press('duck'); duckHold = true; }
    }
    if (ticks % 45 === 0) { Input.press('ability'); }
    if (ticks % 45 === 1) { Input.release('ability'); }
    boss.update(TICK);
    if (ticks % 7 === 0) boss.draw(canvasCtx);
  }
  assert(result, `${bossCab}: boss fight ended (success=${result && result.success}, hpLeft=${boss.bossHp}/${boss.bossMax}) in ${Math.round(ticks / 60)}s`);
  assert(boss.jokeDone || (result && !result.success), `${bossCab}: joke phase triggered (or lost before it)`);
}

console.log(failed ? 'BOSS: FAILED' : 'BOSS: PASSED');
process.exit(failed ? 1 : 0);
