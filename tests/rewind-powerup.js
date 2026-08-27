// The touch rewind power-up (docs/mobile-rewind-powerup.md): on a device with
// no free rewind, the snapshot ring is small, records ONLY while a capRewind
// charge is armed, plays back a fixed 3 seconds on the 'rewind' action, and the
// charge is single-shot — consumed after the final restore, never refunded by
// the snapshots it replays (which were recorded while armed and so still carry
// it). Boots the real bundle on a simulated coarse-pointer device, the same
// route tests/rewind-pooling.js and tests/touch-smoke.js take.

import esbuild from 'esbuild';
import { installDom } from './dom-stub.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STAGE_BY_ID } from '../src/data/stages.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dom = installDom();
globalThis.window.matchMedia = (q) => ({ matches: q.includes('coarse') });

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

const frames = (n, dt = 16.7) => { for (let i = 0; i < n; i++) dom.frame(dt); };

// The scripted introduction is stage data, checked without the bundle: the
// second PLUMBER PANIC stage guarantees the capsule, early (see stages.js).
assert(STAGE_BY_ID['plumber-2'].rewindAt === 0.15, 'plumber-2 scripts the capsule at 0.15');
assert(STAGE_BY_ID['plumber-1'].rewindAt == null, 'and no other Act I stage does');

// Same route into a stage the pooling test takes.
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

const inRun = () => /(^|_)RunState$/.test(globalThis.window.__mash_state || '');
const run = globalThis.window.__mash_cur;
if (!inRun()) {
  console.error('FAIL: could not reach a run; got', globalThis.window.__mash_state);
  process.exit(1);
}
assert(true, 'reached a live run on a coarse-pointer device');

// God mode, as in the pooling test: a death re-enters the state and resets the
// ring, which would fail every assertion below for reasons that have nothing
// to do with the power-up. The drip is also silenced so a lucky 6% capsule
// cannot arm recording during the stretches that assert it is off.
run.takeHit = () => {};
run.drip.capsuleTimer = 1e9;
// The settle also has to acknowledge the touch zone card — plumber-1 on a
// coarse-pointer device holds the world until the player taps, and 'confirm'
// is one of the presses it accepts.
const settle = () => {
  for (let i = 0; i < 900 && (run.dead || run.introRunning || run.zoneCard || run.introFreeze > 0); i++) {
    if (run.zoneCard && i % 30 === 0) dom.key('Enter');
    frames(1);
  }
};
settle();

const ring = run.rewindFrames;
// 3s at 15 captures/s, not the desktop 150: the whole cost story of the
// feature is that a touch run never carries the big ring.
assert(ring.capacity === 45, `the touch ring holds 3 seconds, not 10 (capacity ${ring.capacity})`);

// --- no charge, no tape ------------------------------------------------------
frames(300); // five seconds of ordinary play
assert(ring.length === 0, `the ring stays empty through normal play (${ring.length})`);

// --- the scripted spawn path -------------------------------------------------
// This run is plumber-1, which scripts no capsule; point its stage copy at a
// fraction just ahead and the spawner must deal exactly one capRewind.
run.stage = { ...run.stage, rewindAt: Math.min(0.9, (run.distance / run.totalDist) + 0.02) };
for (let i = 0; i < 600 && !run.pickups.some((p) => p.type === 'capRewind'); i++) frames(1);
assert(run.pickups.some((p) => p.type === 'capRewind'), 'a scripted rewindAt deals the capsule');
assert(run.rewindCapSpawned === true, 'and marks itself spent so it deals exactly one');

// --- arming rolls the tape ---------------------------------------------------
settle();
run.powerups.grab('rewind');
frames(60);
assert(ring.length > 0, `an armed charge starts recording (${ring.length})`);
frames(300);
assert(ring.length === 45, `and the tape caps at the 3-second window (${ring.length})`);

// --- firing is a 3-second rewind and a single shot ---------------------------
settle();
const beforeX = run.distance;
dom.key('KeyZ');
frames(46); // 45 playback ticks + the fall-through release frame
assert(inRun(), 'the run survives a power-up rewind');
assert(run.distance < beforeX, `firing walks the run backwards (${beforeX.toFixed(1)} -> ${run.distance.toFixed(1)})`);
frames(10);
assert(!run.powerups.active.rewind,
  'the charge is ABSENT once the rewind finishes — the replayed snapshots did not refund it');
// The lockout arms at the END of the 0.55s deceleration ramp, not at the
// moment of finish — ride the ramp out before asking.
frames(35);
assert(run.rewindLockout > 0, 'the ordinary lockout backstops the finish');
frames(120);
assert(ring.length === 0, `the spent tape stays drained with no charge armed (${ring.length})`);

// --- an unused window expires clean ------------------------------------------
settle();
run.powerups.grab('rewind');
frames(120);
const armedLen = ring.length;
assert(armedLen > 0, `a fresh capsule records again (${armedLen})`);
for (let i = 0; i < 1000 && run.powerups.active.rewind; i++) frames(1);
assert(!run.powerups.active.rewind, 'the arm window expires with the charge unused');
frames(60);
assert(ring.length === 0, `expiry stops recording and drops the stale tape (${ring.length})`);

console.log(failed ? 'REWIND POWERUP: FAILED' : 'REWIND POWERUP: PASSED');
process.exit(failed ? 1 : 0);
