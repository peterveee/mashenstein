// Dropped-frame reporting: the loop counts callbacks that arrive a whole vsync
// late, separates those from outright stalls, and does not blame boot or a
// lifecycle resume for the gap it did not render across. Driven with a
// hand-stepped clock and a manual rAF queue, so every interval is exact.

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// One pending callback at a time is all the loop ever queues (it guards on
// `queued`), so a single slot models it exactly.
let pending = null;
let clock = 0;
globalThis.requestAnimationFrame = (cb) => { pending = cb; return 1; };
globalThis.performance = { now: () => clock };

const { startLoop, frameHealth } = await import('../src/engine/loop.js');

// Advance the clock by dtMs and deliver the frame the loop is waiting on.
function step(dtMs) {
  clock += dtMs;
  const cb = pending;
  pending = null;
  if (cb) cb(clock);
}

function run(n, dtMs) { for (let i = 0; i < n; i++) step(dtMs); }

const loop = startLoop({ update() {}, draw() {} });

// A clean 60 Hz display. The first callback is boot cost and must not count.
step(400);
run(120, 16.7);
let h = frameHealth();
assert(h.hitchTotal === 0, 'a steady 60 Hz stream reports no dropped frames');
assert(h.stallTotal === 0, 'and no stalls');
assert(h.hitches === 0 && h.worstMs === 0, 'the one-second window is clean too');

// A single missed vsync: 33ms between callbacks where 16.7 was due.
step(33.4);
run(70, 16.7);   // roll the window past the hitch so it lands in the readout
h = frameHealth();
assert(h.hitchTotal === 1, 'one late callback is one dropped frame');
assert(h.hitchEvents === 1, 'and one hitch event');
assert(h.stallTotal === 0, 'a dropped frame is not counted as a stall');

// Jitter either side of a tick is not a drop — a 60 Hz panel's rAF timestamps
// wobble, and counting that would make every machine look broken.
const before = frameHealth().hitchTotal;
run(40, 18.5);
assert(frameHealth().hitchTotal === before, 'ordinary vsync jitter is not a drop');

// The window reports the worst frame it saw, not the last one.
run(70, 16.7);            // start from a clean window boundary
step(20.5); step(41); step(20.5);
run(70, 16.7);
h = frameHealth();
assert(h.worstMs === 41, 'the window reports its worst frame time');
assert(h.sessionWorstMs === 41, 'and the session keeps the deepest hitch so far');

// The session worst outlives the window that saw it.
run(140, 16.7);
assert(frameHealth().worstMs === 0, 'a clean window reports no worst frame');
assert(frameHealth().sessionWorstMs === 41, 'the session worst survives the window rolling');

// A deep hitch cost more frames than a shallow one and must not tally the same.
// 159ms at 60Hz is ten refreshes, nine of which showed a stale image.
const deepBefore = frameHealth();
step(159);
run(70, 16.7);
h = frameHealth();
assert(h.hitchTotal === deepBefore.hitchTotal + 9, 'a 159ms frame costs nine lost frames');
assert(h.hitchEvents === deepBefore.hitchEvents + 1, 'but is still a single hitch event');
assert(h.sessionWorstMs === 159, 'and becomes the session worst');

// A stall is tallied apart from drops, so one long pause cannot read as a
// hundred missed frames.
const dropsBefore = frameHealth().hitchTotal;
step(600);
run(70, 16.7);
h = frameHealth();
assert(h.stallTotal === 1, 'a 600ms gap is one stall');
assert(h.hitchTotal === dropsBefore, 'and adds nothing to the dropped-frame count');

// Hidden time is not judder: the gap across a pause is time the game never
// drew, so resume must not charge it as a drop.
const across = frameHealth();
loop.pause();
clock += 5000;
loop.resume();
step(16.7);
run(70, 16.7);
h = frameHealth();
assert(h.hitchTotal === across.hitchTotal, 'the gap across a pause is not a dropped frame');
assert(h.stallTotal === across.stallTotal, 'nor a stall');
assert(h.hitches === 0, 'and resume clears the live window');

loop.stop();
console.log(failed ? 'FRAME HEALTH: FAILED' : 'FRAME HEALTH: PASSED');
process.exit(failed ? 1 : 0);
