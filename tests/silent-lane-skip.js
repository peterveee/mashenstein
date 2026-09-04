// WHEN THE RUN LETS THE SCHEDULER SKIP SILENCED LANES, and — the half that matters —
// when it must not. A cabinet screen plays the song with the tune muted and ramps it
// back in at a bar line; a skipped note cannot be un-skipped, so the skip has to wait
// for that boundary to be scheduled. See run.js enter()/update() and audio.js
// setSilentLaneSkip.
import { installDom } from './dom-stub.js';
installDom();

const { RunState } = await import('../src/game/run.js');
const { save } = await import('../src/engine/save.js');
const { Audio } = await import('../src/engine/audio.js');
const { MusicDirector } = await import('../src/engine/music-director.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const skipCalls = [];
Audio.setSilentLaneSkip = (on) => { skipCalls.push(!!on); };
const last = () => (skipCalls.length ? skipCalls[skipCalls.length - 1] : null);

save.load();
save.newSlot(0, 0);

const stage = {
  id: 'test-1', cabinet: 'plumber', index: 1,
  mission: { type: 'reach', desc: 'TEST' },
  challenge: { type: 'coins', n: 9999, desc: 'TEST' },
  durationSec: 40, applianceAt: 0.5, applianceHigh: false,
};
const makeRun = () => new RunState({
  stage, team: ['lorenzo', 'gnash', 'clara'], save, seed: 12345, difficulty: 1, onEnd: () => {},
});

// ---- the handover path: a treatment is still waiting for its bar line ----------
// Stubbed rather than staged, because what is being pinned is the RUN's reading of
// `pending` — the director's own boundary logic is tests/music-variant.js's subject.
const realEnterStage = MusicDirector.enterStage;
MusicDirector.enterStage = function stubEnterStage(...args) {
  realEnterStage.apply(this, args);
  this.pending = { variantId: 'level' };
  return true;
};

skipCalls.length = 0;
const handover = makeRun();
handover.enter();
assert(last() === false && !handover.silentSkipArmed,
  'a run entered with a handover pending leaves the skip off');

handover.update(1 / 60);
assert(last() === false && !handover.silentSkipArmed,
  'and keeps it off for as long as the boundary has not been scheduled');

// _fire clears `pending` the moment the boundary is scheduled — at least a lookahead
// before it is heard, and with the ramp's mute states committed at its audio time.
MusicDirector.pending = null;
handover.update(1 / 60);
assert(last() === true && handover.silentSkipArmed,
  'the first tick after the handover is scheduled arms the skip');

const armedAt = skipCalls.length;
handover.update(1 / 60);
handover.update(1 / 60);
assert(skipCalls.length === armedAt, 'and it is set once, not re-set every tick');

handover.exit();
assert(last() === false, 'leaving the run hands every other screen back the old behaviour');

// ---- the setBank path: a dev ?stage= URL or a retry from the results screen ----
MusicDirector.enterStage = function stubImmediate(...args) {
  realEnterStage.apply(this, args);
  this.pending = null;
  return false;
};
skipCalls.length = 0;
const direct = makeRun();
direct.enter();
assert(last() === true && direct.silentSkipArmed,
  'with nothing to hand over, the skip is on from the first note of the run');
direct.exit();
assert(last() === false, 'and off again at exit');

MusicDirector.enterStage = realEnterStage;
console.log(failed ? '\nFAILED' : '\nPASSED');
process.exit(failed ? 1 : 0);
