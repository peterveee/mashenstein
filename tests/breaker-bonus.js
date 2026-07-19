// Breaker-box bonus: winning a cabinet's first power-on minigame queues a
// starting powerup (with a 30s floor) for the next stage run, exactly once.
import { installDom } from './dom-stub.js';
installDom();

const { Powerups, POWER_DEFS } = await import('../src/game/powerups.js');
const { RunState } = await import('../src/game/run.js');
const { save } = await import('../src/engine/save.js');
const { DripSpawner } = await import('../src/game/spawner.js');
const { PICKUPS } = await import('../src/game/entities.js');
const { Rng } = await import('../src/engine/rng.js');
const { hasProp } = await import('../src/sprites/props.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// --- Powerups unit checks -------------------------------------------------
const bench = { shield: 1, magnet: 1, star: 1, slowmo: 1 };

let p = new Powerups(bench);
p.grab('slowmo');
assert(p.active.slowmo.t === 6, `plain slowmo grab uses normal duration (${p.active.slowmo.t})`);
p = new Powerups(bench);
p.grab('slowmo', { minDuration: 30 });
assert(p.active.slowmo.t === 30, `minDuration floors slowmo to 30 (${p.active.slowmo.t})`);
p.grab('magnet', { minDuration: 30 });
assert(p.active.magnet.t === 30, `minDuration floors magnet to 30 (${p.active.magnet.t})`);

assert(POWER_DEFS.unpeel && POWER_DEFS.unpeel.name === 'UNPEELABLE', 'unpeel is defined in POWER_DEFS');
p = new Powerups(bench);
p.grab('unpeel');
assert(p.active.unpeel.t === 12, `capsule unpeel lasts 12s (${p.active.unpeel.t})`);

p = new Powerups(bench);
assert(!p.isInvincible(), 'not invincible before grabbing unpeel');
p.grab('unpeel', { minDuration: 30 });
assert(p.isInvincible(), 'unpeel grants invincibility');
p.update(30.1);
assert(!p.isInvincible(), 'unpeel expires after its timer');

p = new Powerups(bench);
p.grab('shield');
assert(p.shieldStack === 1, 'shield grab stacks a shield');
p.grab('shield'); p.grab('shield');
assert(p.shieldStack === p.shieldCap(), `shield stack caps at shieldCap (${p.shieldStack})`);

// --- RunState integration -------------------------------------------------
save.load();
save.newSlot(0, 0);

const stage = {
  id: 'test-1', cabinet: 'plumber', index: 1,
  mission: { type: 'reach', desc: 'TEST' },
  challenge: { type: 'coins', n: 9999, desc: 'TEST' },
  durationSec: 40, applianceAt: 0.5, applianceHigh: false,
};
function makeRun(startingPowerup) {
  return new RunState({ stage, save, seed: 12345, difficulty: 1, startingPowerup, onEnd: () => {} });
}

let run = makeRun('magnet');
run.enter();
assert(run.powerups.active.magnet && run.powerups.active.magnet.t === 30, 'starting magnet active for 30s after enter()');
run.enter(); // death-retry path re-enters the same instance
assert(!run.powerups.active.magnet, 'retry enter() does not re-grant the bonus');

run = makeRun('shield');
run.enter();
assert(run.powerups.shieldStack >= 1 && run.powerups.shieldStack <= run.powerups.shieldCap(),
  `starting shield stacks within cap (${run.powerups.shieldStack})`);

run = makeRun(null);
run.enter();
assert(Object.keys(run.powerups.active).length === 0, 'no starting powerup → nothing active');

// UNPEELABLE deflects hits but not pits.
run = makeRun('unpeel');
run.enter();
const cells = run.battery;
run.takeHit('TEST HIT');
assert(run.battery === cells, 'unpeel deflects a normal hit (no battery loss)');
run.player.iframes = 0;
run.powerups.shieldStack = 0; // isolate the pit hit from shield absorbs
run.takeHit('TEST PIT', true);
assert(run.battery === cells - 1, `pit still costs a cell under unpeel (${run.battery}/${cells})`);

// --- UNPEELABLE also drips mid-stage, rarer than the staples ---------------
assert(PICKUPS.capUnpeel && PICKUPS.capUnpeel.power === 'unpeel', 'capUnpeel pickup grants unpeel');
assert(hasProp('capUnpeel'), 'capUnpeel has capsule art');

const counts = {};
const drip = new DripSpawner(new Rng(4242), bench);
const drops = [];
for (let i = 0; i < 60000; i++) drip.update(1, i * 240, drops, false); // 1s steps: ~4000 capsules
for (const d of drops) if (d.def.power) counts[d.def.power] = (counts[d.def.power] || 0) + 1;
const total = Object.values(counts).reduce((a, b) => a + b, 0);
const unpeelShare = (counts.unpeel || 0) / total;
const staples = ['shield', 'magnet', 'star', 'slowmo'].map((k) => (counts[k] || 0) / total);
assert(unpeelShare > 0.05 && unpeelShare < 0.2, `unpeel drops sometimes (${(unpeelShare * 100).toFixed(1)}% of ${total})`);
assert(staples.every((s) => s > unpeelShare), `every staple is more common than unpeel (${staples.map((s) => (s * 100).toFixed(1)).join('/')}%)`);

console.log(failed ? 'BREAKER-BONUS: FAILED' : 'BREAKER-BONUS: PASSED');
process.exit(failed ? 1 : 0);
