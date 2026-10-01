// A STAGE CAN BAN OR SWAP A CAPSULE, AND EITHER MEANS NONE FROM ANY SOURCE.
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
const { makePickup } = await import('../src/game/entities.js');
const { POWER_MIN_GAP } = await import('../src/game/spawner.js');

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
// Each toss is taken back out of the lane before the next, so what is measured
// is the box's own deal and not the one-of-each-on-a-screen rule (tested below).
// `battery` sets the meter before every toss.
function tossTypes(st, n = 400, { battery = 1, difficulty = 1 } = {}) {
  const run = new RunState({ stage: st, save, seed: 777, difficulty, skipRunIn: true, onEnd() {} });
  run.enter();
  const types = new Set();
  for (let i = 0; i < n; i++) {
    const before = run.pickups.length;
    run.battery = battery;
    run.tossPrize(run.camX + 300, 20, true);
    for (let j = before; j < run.pickups.length; j++) types.add(run.pickups[j].type);
    run.pickups.length = before;
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

// --- a SWAP: plumber-1's invincibility comes up a battery (Peter, 1 Oct) -------
assert(p1.powerSwaps?.capUnpeel === 'battery', 'plumber-1 swaps capUnpeel for a battery (stages.js)');
assert(!p2.powerSwaps, 'plumber-2 swaps nothing');
const authoredUnpeel = [];
for (const [kind, list] of Object.entries(STAGE_LAYOUTS['plumber-1'].routes || {})) {
  for (const d of list || []) {
    for (const k of ['prize', 'lowPrize', 'bonus', 'topPrize']) {
      if (d[k] === 'capUnpeel' || d[k] === 'capStar') authoredUnpeel.push(`${kind}@${d.at}.${k}`);
    }
  }
}
assert(authoredUnpeel.length === 0, `no authored invincibility prize on plumber-1's routes (${authoredUnpeel.join(', ') || 'none'})`);
const t1 = tossTypes(p1), t2 = tossTypes(p2);
assert(!t1.has('capUnpeel') && !t1.has('capStar'), 'plumber-1: 400 !-box tosses deal no invincibility');
assert(t1.has('battery'), 'plumber-1: ...and the invincibility rolls come out as batteries');
assert(t2.has('capUnpeel') && !t2.has('battery'), 'plumber-2 (control): the same tosses deal UNPEELABLE, no batteries');
// No extras (Peter, 1 Oct): a cell the meter has no room for is a SHIELD instead.
const tFull = tossTypes(p1, 400, { battery: 4 });
assert(!tFull.has('battery') && !tFull.has('capUnpeel') && tFull.has('capShield'),
  'plumber-1, full meter: the swapped slot comes out as a shield, never a battery');
// One-hit runs (overtime, top difficulty, corruption) carry one cell that is
// always full, so there the swap is always the shield.
{
  const t5 = tossTypes(p1, 400, { battery: 1, difficulty: 5 });
  assert(!t5.has('battery') && !t5.has('capUnpeel'), 'plumber-1 one-hit: no battery and no invincibility from the !-box');
}
// The swap happens after the roll: the !-box stream is the same draw for draw,
// only the invincibility slots read differently.
const tossSeq = (st) => {
  const run = new RunState({ stage: st, save, seed: 777, difficulty: 1, skipRunIn: true, onEnd() {} });
  run.enter();
  const out = [];
  for (let i = 0; i < 200; i++) {
    const before = run.pickups.length;
    run.battery = 1;
    run.tossPrize(run.camX + 300, 20, true);
    out.push(run.pickups.slice(before).map((p) => p.type).join('+'));
    run.pickups.length = before;
  }
  return out;
};
{
  const a = tossSeq(p1), b = tossSeq({ ...p1, powerSwaps: null });
  const diff = a.filter((t, i) => t !== b[i] && !(t === 'battery' && ['capUnpeel', 'capStar'].includes(b[i])));
  assert(diff.length === 0 && a.some((t, i) => t !== b[i]), 'the swap rewrites only the invincibility slots of the seeded toss stream');
}

// --- ONE OF EACH ON A SCREEN (Peter, 1 Oct) ---------------------------------
// A box beside a battery already in the lane: the swapped slot is a shield,
// and beside a shield too it pays coins (tossPrize declines).
{
  const run = new RunState({ stage: p1, save, seed: 777, difficulty: 1, skipRunIn: true, onEnd() {} });
  run.enter();
  run.battery = 1;
  const x = run.camX + 300;
  const land = x + run.speed * 1.45 * 0.85;
  run.pickups.push(makePickup('battery', land + 100, 10));
  assert(run.dealtPickupType('capUnpeel', land) === 'capShield', 'a swapped cell beside another cell is a shield');
  run.pickups.push(makePickup('capShield', land - 200, 34));
  assert(run.dealtPickupType('capUnpeel', land) === null, '...and beside a shield as well, nothing');
  assert(run.dealtPickupType('capMagnet', land) === 'capMagnet', 'a different kind still deals');
  assert(run.dealtPickupType('capMagnet', land + POWER_MIN_GAP + 120) === 'capMagnet'
    && run.dealtPickupType('capShield', land + POWER_MIN_GAP + 120) === 'capShield', 'and the same kind deals a screen away');
}

// Whole runs on every stage, with the meter held low so the drip lays its
// cells and a !-box opened every second and a half: no two of the same
// power-up ever stand within a screen of each other, and plumber-1 never shows
// an invincibility capsule.
const pairs = [], swapSeen = [];
let swapBatteries = 0, swapShields = 0;
for (const st of STAGES) {
  for (const seed of [101, 202]) {
    const run = new RunState({ stage: st, save, seed, difficulty: 1, skipRunIn: true, onEnd() {} });
    run.enter();
    run.collide = () => {};
    const counted = new Set();
    for (let i = 0; i < 60 * 130 && !run.ended; i++) {
      run.battery = 1;
      if (i % 90 === 45) {
        const cx = run.playerWorldX() + 40;
        if (run.drip.canPlacePower(cx)) run.tossPrize(cx, 20, true);
      }
      run.update(1 / 60);
      const live = run.pickups.filter((p) => p.live && (p.def.power || p.def.heal));
      for (let a = 0; a < live.length; a++) {
        const A = live[a];
        if (st === p1 && (A.type === 'capUnpeel' || A.type === 'capStar') && A.x < run.camX + 480) swapSeen.push(`${seed}@${A.x.toFixed(0)}`);
        if (A.swappedFrom && !counted.has(A.id)) {
          counted.add(A.id);
          if (A.type === 'battery') swapBatteries++; else swapShields++;
        }
        for (let b = a + 1; b < live.length; b++) {
          const B = live[b];
          if (A.type === B.type && Math.abs(A.x - B.x) < POWER_MIN_GAP) pairs.push(`${st.id}/${seed} ${A.type} ${Math.abs(A.x - B.x).toFixed(0)}px`);
        }
      }
    }
  }
}
assert(pairs.length === 0, `every stage, boxes opening: never two of the same power-up within a screen (${[...new Set(pairs)].slice(0, 3).join(', ') || 'none'})`);
assert(swapSeen.length === 0, `plumber-1: no invincibility capsule ever on screen (${swapSeen.slice(0, 3).join(', ') || 'none'})`);
assert(swapBatteries > 0, `plumber-1: the swap did deal batteries in those runs (${swapBatteries} cells, ${swapShields} shields)`);

const startUnpeel = (st, id) => {
  const run = new RunState({ stage: st, save, seed: 1, difficulty: 1, startingPowerup: id, onEnd() {} });
  run.enter();
  return !!run.powerups.active[id];
};
assert(!startUnpeel(p1, 'unpeel'), 'plumber-1 refuses an UNPEELABLE starting power');
assert(startUnpeel(p2, 'unpeel'), 'plumber-2 (control) grants it');

if (failed) { console.error('STAGE POWER BANS: FAILED'); process.exit(1); }
console.log('STAGE POWER BANS: PASSED');
