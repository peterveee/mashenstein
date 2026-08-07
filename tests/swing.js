// Changing the GROOVE of a song that is already playing — `Audio.setSwing`.
//
// The other half of the swing story. `tests/arrangement.js` covers the desk's
// `setSwing`, which writes a number into a draft; this covers the engine's, which
// moves the number under a running transport. They share a name and a clamp on
// purpose: one control, one meaning, both ends of the wire.
//
// Nothing here needs an AudioContext, and that is the point being made as much as it
// is a convenience. A groove change is three fields and some arithmetic — no node is
// built, disposed or reconnected, no gain is moved, and `nextTime` never budges — so
// the whole of it can be driven by hand against the prototype. Compare `setBank`,
// the other way to hear a song differently, which needs a browser and half a second
// of silence.
//
// Two properties are worth more than the rest and both have a test below:
//
//   · a bar line cannot be MISSED, because the boundary is an even step and even
//     steps never swing — landing on the downbeat and landing just after it are the
//     same sound;
//   · a ramp counts its OWN steps, because `this.step` is not monotonic. A loop wrap
//     or a queued seek moves it backwards, and a ramp measuring against a start step
//     would run backwards with it — the groove would un-swing itself every four bars.
import { installDom } from './dom-stub.js';

installDom();
const { Audio } = await import('../src/engine/audio.js');
const proto = Object.getPrototypeOf(Audio);

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

/** A stand-in carrying only the fields these three methods touch. */
const sys = (over = {}) => Object.assign(Object.create(proto), {
  swing: 0, step: 0, pendingSwing: null, loopStart: null, loopEnd: null, ...over,
});
/** Advance n steps, running the hook exactly where `scheduleStep` runs it. */
const run = (s, n) => { for (let i = 0; i < n; i++) { s._applyPendingSwing(); s.step++; } };

// ---- boundaries -------------------------------------------------------------
{
  const s = sys();
  assert(s._swingBoundary('bar', 0) && s._swingBoundary('bar', 16) && !s._swingBoundary('bar', 15),
    'a bar boundary is every sixteenth step');
  assert(s._swingBoundary('beat', 4) && !s._swingBoundary('beat', 5),
    'a beat boundary is every fourth');
  assert(s._swingBoundary('immediate', 7),
    'immediate takes whichever step it is handed');
  assert(s._swingBoundary(2, 32) && !s._swingBoundary(2, 16),
    'a number is that many bars');
}
{
  // Measured from the musical anchor, not from the top of the song. A loop over bars
  // 2-5 begins at step 16, and `16 % 64` is not zero — counting phrases from zero
  // steps over every boundary that loop has. Same reasoning as MusicDirector._boundary.
  const s = sys({ loopStart: 16, loopEnd: 80 });
  assert(s._swingBoundary('phrase', 16) && s._swingBoundary('phrase', 80)
    && !s._swingBoundary('phrase', 64),
  'a phrase is measured from loopStart, not from the start of the song');
  assert(s._swingBoundary(2, 48), 'and so is a bar count');
  assert(s._swingBoundary('phrase', -48),
    'a step before the anchor does not fall through a negative modulo');
}

// ---- waiting for the boundary -----------------------------------------------
{
  const s = sys({ step: 5 });
  s.setSwing(62);
  run(s, 10);                       // steps 5..14 — no bar line among them
  assert(s.swing === 0 && !!s.pendingSwing, 'a queued swing does not land early');
  run(s, 2);                        // step 15, then the bar line at 16
  assert(s.swing === 62 && !s.pendingSwing, 'it lands on the bar line');
}
{
  // The property that makes this safe: the hook runs at the TOP of scheduleStep, so
  // the downbeat's own notes are already committed by the time a bar boundary is
  // seen. It does not matter. Step 16 is even and even steps do not swing; the first
  // note the change can touch is step 17, and it gets it.
  const s = sys({ step: 16 });
  s.setSwing(62);
  s._applyPendingSwing();
  assert(s.swing === 62, 'arriving exactly on the downbeat still catches the first odd sixteenth');
}
{
  const s = sys({ step: 3 });
  s.setSwing(62, { quantize: 'immediate' });
  assert(s.swing === 62 && !s.pendingSwing, 'immediate with no ramp does not wait for a step');
}

// ---- the ramp ---------------------------------------------------------------
{
  const s = sys({ step: 0, swing: 0 });
  s.setSwing(62, { overBars: 2 });  // 32 steps
  s._applyPendingSwing();
  assert(near(s.swing, 50 + 12 / 32),
    'a ramp out of a straight song starts at 50, not by leaping from 0');
  s.step++;
  run(s, 30);
  assert(s.swing > 50 && s.swing < 62, 'mid-ramp it sits between the two');
  s._applyPendingSwing();
  assert(s.swing === 62 && !s.pendingSwing, 'and arrives exactly on the target');
}
{
  // `step` driven backwards over and over, as a one-bar loop drives it.
  const s = sys({ step: 0, swing: 55 });
  s.setSwing(75, { overBars: 4 });  // 64 steps
  s._applyPendingSwing(); s.step++;
  let last = s.swing;
  let backwards = 0;
  for (let i = 0; i < 63; i++) {
    s.step = i % 16;
    s._applyPendingSwing();
    if (s.swing < last) backwards++;
    last = s.swing;
  }
  assert(backwards === 0, 'a ramp never runs backwards when the transport wraps under it');
  assert(s.swing === 75 && !s.pendingSwing, 'and still lands on the target');
}
{
  const s = sys({ step: 0, swing: 66 });
  s.setSwing(0, { overBars: 1 });
  s._applyPendingSwing(); s.step++;
  assert(s.swing > 50 && s.swing < 66, 'ramping back to straight passes through the middle');
  run(s, 15);
  assert(s.swing === 0 && !s.pendingSwing,
    'and lands on exactly 0 — what a straight song is stored as, not 50');
}

// ---- the range, and who wins ------------------------------------------------
{
  // The same clamp as the desk's setSwing, asserted the same way tests/arrangement.js
  // asserts it. Below straight is a lane offset written in the wrong field; above the
  // dotted shuffle the odd sixteenth is nearer the next beat than its own.
  const s = sys();
  s.setSwing(200); assert(s.pendingSwing.to === 75, 'clamped down to SWING_MAX');
  s.setSwing(20); assert(s.pendingSwing.to === 50, 'clamped up to straight');
  s.setSwing(62.4); assert(s.pendingSwing.to === 62, 'rounded, as the desk rounds it');
  s.setSwing(0); assert(s.pendingSwing.to === 0, 'and 0 passes through as itself');
  s.setSwing(58, { overBars: 4 });
  s.setSwing(66, { overBars: 1 });
  assert(s.pendingSwing.to === 66 && s.pendingSwing.steps === 16,
    'the later request replaces the earlier one rather than queueing behind it');
}

// ---- inert when nothing asked -----------------------------------------------
{
  // tests/null-test.js compares renders sample for sample, and every one of them runs
  // this hook on every step. It has to be nothing at all.
  const s = sys({ step: 7, swing: 0 });
  const before = s.swing;
  run(s, 64);
  assert(s.swing === before && s.pendingSwing === null,
    'with nothing pending the hook does not touch the swing');
}

console.log(failed ? '\nSWING: FAILED' : '\nSWING: PASSED');
process.exit(failed ? 1 : 0);
