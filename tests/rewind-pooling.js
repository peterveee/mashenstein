// Rewind recording recycles its snapshot records instead of allocating a fresh
// object graph 15 times a second. That is only safe if a recycled record is a
// faithful copy of the past and never a view onto the present, so this drives
// the real bundle into a real run and checks the properties that pooling could
// plausibly break:
//
//   - the ring caps at capacity and stops growing
//   - a recorded snapshot does not change when the live world moves on
//     (the aliasing bug pooling invites: sharing an object or a Set)
//   - a recycled record carries no leftover fields from its previous occupant
//   - rewinding actually walks the world backwards and restores coherently
//
// Booting the bundle rather than unit-testing the helpers is deliberate: the
// failure mode being guarded against is a live entity and a recorded one
// sharing memory, which only exists once real obstacles are streaming through.

import esbuild from 'esbuild';
import { installDom } from './dom-stub.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dom = installDom();

const { outputFiles } = await esbuild.build({
  entryPoints: [join(root, 'src/main.js')],
  bundle: true, format: 'iife', write: false, target: ['es2022'], logLevel: 'silent',
});

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

try {
  new Function(outputFiles[0].text)();
} catch (e) {
  console.error('BOOT THREW:', e);
  process.exit(1);
}

function frames(n, dt = 16.7) { for (let i = 0; i < n; i++) dom.frame(dt); }

// Same route into a stage the smoke test takes.
frames(5);
dom.key('Enter'); frames(30);
dom.key('Enter'); frames(30);
for (let i = 0; i < 9; i++) { dom.key('Enter'); frames(12); }
frames(40);
globalThis.window.__mash_cur.px = globalThis.window.__mash_cur.stations().find((s) => s.type === 'cabinet').x;
frames(2);
dom.key('Enter'); frames(40);
dom.key('Enter'); frames(40);
dom.key('Enter'); frames(30);
dom.key('Enter'); frames(30);

// Matched by suffix, not equality: the reported name is the bundled class's,
// and esbuild prefixes an underscore when it has to rename one — so this reads
// 'RunState' on most builds and '_RunState' on some. Asserting the exact string
// makes the suite fail on a bundling detail that says nothing about the game.
const inRun = () => /(^|_)RunState$/.test(globalThis.window.__mash_state || '');
const run = globalThis.window.__mash_cur;
if (!inRun()) {
  console.error('FAIL: could not reach a run; got', globalThis.window.__mash_state);
  process.exit(1);
}
assert(true, 'reached a live run');

// Play far enough to fill the ring several times over. At 15 captures a second
// and a 150-record ring, 30 seconds is three full laps — so every record has
// been recycled at least twice by the end of it.
for (let s = 0; s < 30; s++) { dom.key('Space'); frames(60); }

const ring = run.rewindFrames;
// The pool is what matters, not the live count: `length` drops back to zero
// whenever a death resets the ring, but the RECORDS survive that reset and are
// written into again, which is the entire point. Capacity is an upper bound the
// pool must never pass, however long the run goes on.
assert(ring.slots.length <= ring.capacity,
  `the record pool is bounded by capacity (${ring.slots.length}/${ring.capacity})`);
assert(ring.length <= ring.capacity,
  `and the live count never exceeds it (${ring.length})`);

// Recycling, proven by identity rather than inferred from a count: the same
// record objects must still be in place after enough further play to have
// written past every one of them several times over.
const identity = ring.slots.slice(0, 20);
const poolBefore = ring.slots.length;
for (let s = 0; s < 20; s++) { dom.key('Space'); frames(60); }
assert(ring.slots.every((r, i) => i >= 20 || r === identity[i]),
  'records are overwritten in place, never replaced');
assert(ring.slots.length <= Math.max(poolBefore, ring.capacity),
  `and the pool does not grow with playtime (${poolBefore} -> ${ring.slots.length})`);

// --- the aliasing property, which is the whole reason pooling is risky -------
// Read the newest record, deep-copy what it claims, run the world on, and check
// the record still claims the same thing. A shared object or Set would have
// followed the live world forward.
//
// God mode from here on, and it is the aliasing that requires it rather than
// squeamishness about dying: a death re-enters the state, which RESETS the ring,
// which then legitimately writes over the very record being watched — so a run
// that dies inside the window fails this for a reason that has nothing to do
// with sharing. The RESET path is still exercised: the recycling checks above
// run before this and deliberately let the hero die twenty times.
//
// Switching god mode on is not enough on its own, and that was the residual
// one-in-twenty-five flake. The hero may be MID-DEATH at this point — the last
// of those twenty kills still playing out — and `updateDead` re-enters several
// frames later, long after `takeHit` has stopped being able to prevent
// anything. So the death in flight is flushed out first, and only then is the
// record read. (The seed is `Date.now()`-derived, so every run lays a different
// lane; that is why this reproduced roughly once in twenty-five rather than
// never or always.)
run.takeHit = () => {};
for (let i = 0; i < 240 && run.dead; i++) frames(1);
assert(!run.dead, 'the hero is alive and the world is running before the record is read');
// AND THE RING HAS SOMETHING IN IT.
//
// The death flushed above resets the ring, and the loop exits on the frame the hero
// revives — which can be before a single capture has run. `length` is then 0, and the
// newest-record index `(start + length - 1) % capacity` is `-1`: `slots[-1]` is
// undefined, and this died reading `camX` off it rather than failing an assertion. The
// engine's own `pop()` guards on an empty ring; this read did not. Measured at 4 failures
// in 40 runs before this, and the probe that found it printed `length=0 start=0 dead=false`.
for (let i = 0; i < 240 && !ring.length; i++) frames(1);
assert(ring.length > 0, `the ring holds a record to read (${ring.length})`);
// A reset during the window would silently invalidate everything below, so it
// is caught and named rather than left to surface as three confusing aliasing
// failures. If this ever fires, the assertions after it mean nothing.
let ringResets = 0;
const ringReset = ring.reset.bind(ring);
ring.reset = () => { ringResets++; return ringReset(); };
const newest = ring.slots[(ring.start + ring.length - 1) % ring.capacity];
const recorded = {
  camX: newest.camX,
  tRun: newest.tRun,
  obstacleCount: newest.obstacleCount,
  obstacleXs: newest.obstacles.slice(0, newest.obstacleCount).map((o) => o.x),
  playerY: newest.player.y,
  hitIdSizes: newest.obstacles.slice(0, newest.obstacleCount)
    .map((o) => (o.hitIds ? o.hitIds.size : -1)),
};
assert(recorded.obstacleCount > 0, `the record holds live obstacles (${recorded.obstacleCount})`);

frames(120); // two seconds of live play on top of the reading above

assert(ringResets === 0,
  `the ring was not reset under the reading (${ringResets} resets — if this fires, the three below are meaningless)`);
assert(newest.camX === recorded.camX, 'a recorded camera position does not drift with the live one');
assert(newest.tRun === recorded.tRun, 'nor does its clock');
assert(newest.player.y === recorded.playerY, 'nor the recorded player');
const xsNow = newest.obstacles.slice(0, recorded.obstacleCount).map((o) => o.x);
assert(xsNow.every((x, i) => x === recorded.obstacleXs[i]),
  'recorded obstacle positions are a copy, not a view on the live entities');
const sizesNow = newest.obstacles.slice(0, recorded.obstacleCount)
  .map((o) => (o.hitIds ? o.hitIds.size : -1));
assert(sizesNow.every((n, i) => n === recorded.hitIdSizes[i]),
  'recorded hit-id Sets are copied by value, not aliased');

// --- no stale fields on a recycled record -----------------------------------
// Every recorded entity must look like the kind of thing it is now, not a
// blend of that and whatever occupied the slot last time round the ring.
let strays = 0;
for (let i = 0; i < ring.length; i++) {
  const rec = ring.slots[(ring.start + i) % ring.capacity];
  for (let j = 0; j < rec.obstacleCount; j++) {
    const o = rec.obstacles[j];
    // `def` is the one field every obstacle carries and identifies its kind;
    // a record blended from two occupants shows up as a def whose own fields
    // disagree with the copy's geometry keys.
    if (!o.def) strays++;
  }
}
assert(strays === 0, 'no recycled obstacle record is missing its def');

// --- rewinding still works --------------------------------------------------
// Play on until the run is actually in a state that CAN rewind. Deaths reset
// the buffer and arm a lockout, and how often a bot-less run dies varies from
// one process to the next — so waiting on the precondition is what makes this
// deterministic, rather than assuming thirty seconds of play left a deep buffer.
let ready = false;
for (let i = 0; i < 240 && !ready; i++) {
  frames(15);
  ready = ring.length > 60 && !run.dead && run.rewindLockout <= 0
    && !run.introRunning && !run.zoneCard;
}
assert(ready, `the run reached a rewindable state (buffer ${ring.length})`);

const beforeX = run.camX;
const beforeLen = ring.length;
dom.keyDown('ArrowLeft');
frames(45);
dom.keyUp('ArrowLeft');
assert(inRun(), 'the run survives a rewind');
assert(run.camX < beforeX, `rewind walks the camera backwards (${beforeX} -> ${run.camX})`);
assert(ring.length < beforeLen, `and consumes records (${beforeLen} -> ${ring.length})`);
assert(Number.isFinite(run.camX) && Number.isFinite(run.tRun),
  'the restored world is numerically coherent');
assert(Array.isArray(run.obstacles) && run.obstacles.every((o) => o && o.def),
  'every restored obstacle came back with its def');

// Restored entities must be fresh objects, not the pooled records themselves —
// otherwise live play would scribble over the history behind it.
const stillPooled = run.obstacles.some((live) => {
  for (let i = 0; i < ring.length; i++) {
    const rec = ring.slots[(ring.start + i) % ring.capacity];
    for (let j = 0; j < rec.obstacleCount; j++) if (rec.obstacles[j] === live) return true;
  }
  return false;
});
assert(!stillPooled, 'restore hands the world fresh objects, never the pooled records');

// Recording resumes cleanly on the far side of a rewind.
const afterRewind = ring.length;
frames(120);
assert(ring.length > afterRewind, 'recording resumes after the rewind releases');

console.log(failed ? 'REWIND POOLING: FAILED' : 'REWIND POOLING: PASSED');
process.exit(failed ? 1 : 0);
