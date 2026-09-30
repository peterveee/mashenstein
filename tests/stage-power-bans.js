// A STAGE CAN BAN A CAPSULE, AND A BAN MEANS NONE FROM ANY SOURCE.
//
// plumber-1 deals no SPEED (Peter, 30 Sep 2026). A speed capsule can reach a run
// by five roads — the drip, a !-box's toss, an authored route prize, the lane
// sweep letting one through, and the breaker box's starting power — and each is
// checked here, with plumber-2 as the control that still deals it, so the ban
// is the stage's and not the cabinet's.
import { installDom } from './dom-stub.js';
installDom();

const { save } = await import('../src/engine/save.js');
const { RunState } = await import('../src/game/run.js');
const { STAGES } = await import('../src/data/stages.js');
const { STAGE_LAYOUTS } = await import('../src/data/stage-layouts.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

save.load(); save.newSlot(0, 0);
const stage = (id) => STAGES.find((s) => s.id === id);
const p1 = stage('plumber-1'), p2 = stage('plumber-2');

// --- the data -------------------------------------------------------------
assert(p1.bannedPowers?.includes('capSpeed'), 'plumber-1 bans capSpeed (stages.js)');
assert(!p2.bannedPowers?.includes('capSpeed'), 'plumber-2 does not');
const authored = [];
for (const [kind, list] of Object.entries(STAGE_LAYOUTS['plumber-1'].routes || {})) {
  for (const d of list || []) {
    for (const k of ['prize', 'lowPrize', 'bonus', 'topPrize']) if (d[k] === 'capSpeed') authored.push(`${kind}@${d.at}.${k}`);
  }
}
assert(authored.length === 0, `no authored speed prize on plumber-1's routes (${authored.join(', ') || 'none'})`);

// --- the dice: a !-box's toss shares the drip's roll ------------------------
function tossTypes(st, n = 400) {
  const run = new RunState({ stage: st, save, seed: 777, difficulty: 1, skipRunIn: true, onEnd() {} });
  run.enter();
  const types = new Set();
  for (let i = 0; i < n; i++) {
    const before = run.pickups.length;
    run.tossPrize(run.camX + 300, 20, true);
    for (let j = before; j < run.pickups.length; j++) types.add(run.pickups[j].type);
    run.drip.lastPowerType = null;
  }
  return types;
}
assert(!tossTypes(p1).has('capSpeed'), 'plumber-1: 400 !-box tosses deal no capSpeed');
assert(tossTypes(p2).has('capSpeed'), 'plumber-2 (control): the same tosses do deal capSpeed');

// --- whole runs: nothing speed ever stands in the lane ----------------------
const seen = [];
for (const seed of [101, 202, 303]) {
  const run = new RunState({ stage: p1, save, seed, difficulty: 1, skipRunIn: true, onEnd() {} });
  run.enter();
  run.collide = () => {};
  for (let i = 0; i < 60 * 70 && !run.ended; i++) {
    run.update(1 / 60);
    for (const p of run.pickups) if (p.live && p.type === 'capSpeed') seen.push(`${seed}@${p.x.toFixed(0)}`);
  }
}
assert(seen.length === 0, `three full plumber-1 runs: no live capSpeed in the lane (${seen.slice(0, 3).join(', ') || 'none'})`);

// --- the breaker box's starting power ---------------------------------------
const start = (st) => {
  const run = new RunState({ stage: st, save, seed: 1, difficulty: 1, startingPowerup: 'speed', onEnd() {} });
  run.enter();
  return !!run.powerups.active.speed;
};
assert(!start(p1), 'plumber-1 refuses a SPEED starting power');
assert(start(p2), 'plumber-2 (control) grants it');

if (failed) { console.error('STAGE POWER BANS: FAILED'); process.exit(1); }
console.log('STAGE POWER BANS: PASSED');
