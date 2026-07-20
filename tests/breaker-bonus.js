// Breaker-box bonus: winning a cabinet's first power-on minigame queues a
// starting powerup (with a 30s floor) for the next stage run, exactly once.
import { installDom } from './dom-stub.js';
installDom();

const { Powerups, POWER_DEFS } = await import('../src/game/powerups.js');
const { RunState } = await import('../src/game/run.js');
const { save } = await import('../src/engine/save.js');
const { DripSpawner } = await import('../src/game/spawner.js');
const { PICKUPS } = await import('../src/game/entities.js');
const { Player } = await import('../src/game/player.js');
const { Rng } = await import('../src/engine/rng.js');
const { hasProp } = await import('../src/sprites/props.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// --- Powerups unit checks -------------------------------------------------
const bench = { shield: 1, magnet: 1, star: 1 };

let p = new Powerups(bench);
p.grab('magnet');
assert(p.active.magnet.t === 8, `plain magnet grab uses normal duration (${p.active.magnet.t})`);
p = new Powerups(bench);
assert(!POWER_DEFS.slowmo && !p.timescale, 'SLOW-MO is gone: no def, no timescale hook');
p.grab('magnet', { minDuration: 30 });
assert(p.active.magnet.t === 30, `minDuration floors magnet to 30 (${p.active.magnet.t})`);

assert(POWER_DEFS.unpeel && POWER_DEFS.unpeel.name === 'UNPEELABLE', 'unpeel is defined in POWER_DEFS');
p = new Powerups(bench);
p.grab('unpeel');
assert(p.active.unpeel.t === 12, `capsule unpeel lasts 12s (${p.active.unpeel.t})`);

for (const [id, name] of [['airjump', 'AIR JUMP'], ['speed', 'SPEED BURST'], ['lowgrav', 'LOW GRAVITY']]) {
  assert(POWER_DEFS[id] && POWER_DEFS[id].name === name, `${name} is defined as a power-up`);
}
p = new Powerups(bench);
p.grab('airjump');
assert(p.bonusJumps() === 1 && p.active.airjump.t === 14, 'Air Jump grants one jump for 14 seconds');
p.grab('airjump');
assert(p.bonusJumps() === 1 && p.active.airjump.level === 2 && p.active.airjump.t === 20, 'Air Jump overcharge refreshes without granting another jump');
p.grab('speed');
assert(p.speedMultiplier() === 1.25, 'Speed Burst increases run speed by 25%');
p.grab('speed');
assert(p.speedMultiplier() === 1.4 && p.active.speed.t === 13, 'overcharged Speed Burst increases run speed by 40%');
p.grab('lowgrav');
assert(p.gravityMultiplier() === 0.65, 'Low Gravity reduces gravity to 65%');
p.grab('lowgrav');
assert(p.gravityMultiplier() === 0.5 && p.active.lowgrav.t === 16, 'overcharged Low Gravity reduces gravity to 50%');

const normalJumper = new Player('lorenzo');
const mochiJumper = new Player('mochi');
const capeJumper = new Player('lorenzo', ['cape']);
const fullJumper = new Player('mochi', ['cape']);
for (const jumper of [normalJumper, mochiJumper, capeJumper, fullJumper]) jumper.powerJumpBonus = 1;
assert(normalJumper.maxJumps === 2 && mochiJumper.maxJumps === 3 && capeJumper.maxJumps === 3 && fullJumper.maxJumps === 4,
  'Air Jump stacks once with Mochi and the Cape');
normalJumper.grounded = false; normalJumper.y = 30; normalJumper.vy = 0; normalJumper.jumps = 2; normalJumper.powerJumpBonus = 0;
normalJumper.update(1 / 60, { held: () => false }, { speed: 160 });
assert(normalJumper.y > 0 && !normalJumper.grounded, 'Air Jump expiry never interrupts an airborne player');
const lowGravityJumper = new Player('lorenzo');
lowGravityJumper.grounded = false; lowGravityJumper.y = 30; lowGravityJumper.vy = 0;
lowGravityJumper.update(0.1, { held: () => false }, { speed: 160, gravityScale: 0.65 });
assert(lowGravityJumper.vy === -58.5, 'Low Gravity scales player physics after hero gravity');

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

run = makeRun('lowgrav');
run.enter();
assert(run.powerups.active.lowgrav && run.powerups.active.lowgrav.t === 30, 'starting Low Gravity lasts at least 30 seconds');

run = makeRun(null);
run.enter();
assert(Object.keys(run.powerups.active).length === 0, 'no starting powerup → nothing active');
const baseRunSpeed = run.speed;
run.powerups.grab('speed');
assert(Math.abs(run.speed - baseRunSpeed * 1.25) < 0.001, 'Speed Burst feeds the shared run speed used by spawning');
run.powerups.grab('airjump');
run.relay.current = 'mochi'; run.player.setHero('mochi');
run.player.powerJumpBonus = run.powerups.bonusJumps();
assert(run.player.maxJumps === 3, 'active Air Jump survives a hero portal swap');

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
for (const [pickup, power] of [['capAirJump', 'airjump'], ['capSpeed', 'speed'], ['capLowGrav', 'lowgrav']]) {
  assert(PICKUPS[pickup] && PICKUPS[pickup].power === power, `${pickup} grants ${power}`);
  assert(hasProp(pickup), `${pickup} has capsule art`);
}

const counts = {};
const drip = new DripSpawner(new Rng(4242), bench);
const drops = [];
for (let i = 0; i < 60000; i++) drip.update(1, i * 240, drops, false); // 1s steps: ~4000 capsules
// The relay charge banks an ability instead of running a timer, so it has no
// `power` — count it by its own flag or it vanishes from the denominator and
// every other share reads high.
for (const d of drops) {
  const key = d.def.power || (d.def.relayCharge ? 'relayCharge' : null);
  if (key) counts[key] = (counts[key] || 0) + 1;
}
const total = Object.values(counts).reduce((a, b) => a + b, 0);
const unpeelShare = (counts.unpeel || 0) / total;
const relayShare = (counts.relayCharge || 0) / total;
const staples = ['shield', 'magnet', 'star'].map((k) => (counts[k] || 0) / total);
assert(!counts.slowmo, 'SLOW-MO never drips');
const traits = ['airjump', 'speed', 'lowgrav'].map((k) => (counts[k] || 0) / total);
assert(unpeelShare > 0.05 && unpeelShare < 0.2, `unpeel drops sometimes (${(unpeelShare * 100).toFixed(1)}% of ${total})`);
assert(PICKUPS.capRelay && PICKUPS.capRelay.relayCharge === true, 'capRelay pickup banks a relay charge');
assert(hasProp('capRelay'), 'capRelay has capsule art');
// The rarest thing in the table, and rarer than unpeel: it is a free power.
assert(relayShare > 0.04 && relayShare < unpeelShare, `relay charge is the rarest drop (${(relayShare * 100).toFixed(1)}%)`);
assert(staples.every((s) => s > unpeelShare), `every staple is more common than unpeel (${staples.map((s) => (s * 100).toFixed(1)).join('/')}%)`);
assert(traits.every((s) => s > 0.07 && s < 0.13), `each borrowed trait gets its 10% share (${traits.map((s) => (s * 100).toFixed(1)).join('/')}%)`);
assert(Math.abs(traits.reduce((a, b) => a + b, 0) - 0.30) < 0.04, 'borrowed traits occupy 30% of capsule drops');

console.log(failed ? 'BREAKER-BONUS: FAILED' : 'BREAKER-BONUS: PASSED');
process.exit(failed ? 1 : 0);
