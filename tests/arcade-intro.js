// FIELD SERVICE OPENS INSIDE THE ARCADE CABINET — the timing, and who gets it.
//
// The picture keeps time with the song: an arcade backdrop through bars 1-4, the tube
// switching off across bar 4's last beat (the POWER DOWN), paper from bar 5's downbeat.
// src/engine/arcadeIntro.js draws it; run.js asks arcadeIntroResolve() each frame.
import { installDom } from './dom-stub.js';
installDom();

const { arcadeIntroResolve, ARCADE_INTRO_POWER_DOWN_BEAT, arcadeLandingDrop, ARCADE_LANDING_SECS } = await import('../src/engine/arcadeIntro.js');
const { STAGES } = await import('../src/data/stages.js');
const { save } = await import('../src/engine/save.js');
const { RunState } = await import('../src/game/run.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

assert(ARCADE_INTRO_POWER_DOWN_BEAT === 15, 'the power-down is bar 4\'s last beat (beat 15, counting from 0)');
assert(arcadeIntroResolve(-0.5) === 0, 'before the song\'s first beat: the arcade picture');
assert(arcadeIntroResolve(0) === 0 && arcadeIntroResolve(14.99) === 0, 'bars 1-4: held');
assert(Math.abs(arcadeIntroResolve(15.5) - 0.5) < 1e-9, 'across the power-down: the switch-off, 0..1');
assert(arcadeIntroResolve(16) === null, 'bar 5\'s downbeat: paper');
assert(arcadeIntroResolve(100) === null, 'and every bar after it (the song loops 5-48)');
assert(arcadeIntroResolve(null) === null && arcadeIntroResolve(NaN) === null, 'no clock: paper');

// The landing on 5.1: the paper sheet drops in from above and settles, and only then.
assert(arcadeLandingDrop(0) === -8, 'the paper lands from 8px above on the downbeat');
assert(arcadeLandingDrop(0.05) < 0 && arcadeLandingDrop(0.05) > -8, 'and falls');
assert(arcadeLandingDrop(0.15) > 0 && arcadeLandingDrop(0.15) < 1.6, 'one small bounce');
assert(arcadeLandingDrop(ARCADE_LANDING_SECS) === 0 && arcadeLandingDrop(-0.01) === 0 && arcadeLandingDrop(5) === 0,
  'still before the downbeat and settled after');

const flagged = STAGES.filter((s) => s.arcadeIntro).map((s) => s.id);
assert(flagged.length === 1 && flagged[0] === 'plumber-1', `only plumber-1 opens in the cabinet (${flagged.join(', ')})`);

// Headless there is no audio clock, so a run is plain paper — the same answer a player
// gets with a remix playing, or on a retry long past bar 5.
save.load(); save.newSlot(0, 0);
const run = new RunState({ stage: STAGES.find((s) => s.id === 'plumber-1'), save, seed: 1, difficulty: 1, onEnd() {} });
run.enter();
assert(run.arcadeIntroResolve() === null, 'no song playing: the ordinary backdrop');

if (failed) { console.error('ARCADE INTRO: FAILED'); process.exit(1); }
console.log('ARCADE INTRO: PASSED');
