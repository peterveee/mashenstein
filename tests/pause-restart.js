// RESTART FROM THE PAUSE SCREEN IS THE SAME LEVEL, NOT ANOTHER ONE.
//
// The plate's whole promise is that the road you just lost to is the road you
// come back to: same obstacles, same coins, same capsules, same relay. That
// holds only because the seed lives on the run's opts and enter() re-reads it
// rather than rolling a fresh one — which is exactly one `??` away from being
// silently untrue, and untrue in a way nobody would notice for a week (the
// stage would simply be a different stage, and stages are different every time
// you look at them anyway).
//
// So the check is a replay: run seventy seconds, restart, run the same seventy
// seconds again, and compare what the two roads laid down frame by frame.
//
// It also pins the plate itself — three plates, CONTINUE first and RESTART
// LAST — because pauseIdx addresses that list BY INDEX from two places, and the
// portrait row has to answer with the same ids in the same order. RESTART is at
// the far end on purpose: it is the only plate here that destroys a run with no
// confirmation, so it does not sit where a thumb reaching for CONTINUE lands.
import { installDom } from './dom-stub.js';
installDom();

const { save } = await import('../src/engine/save.js');
const { RunState } = await import('../src/game/run.js');
const { Input } = await import('../src/engine/input.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

save.load(); save.newSlot(0, 0);

// A stage with no ACT card and no authored intro: those are once-per-visit
// openers that a restart deliberately skips, so a stage carrying one would
// freeze the first attempt's clock and not the second's — a difference in the
// test rather than in the game.
const stage = {
  id: 'test-1', cabinet: 'plumber', index: 1,
  mission: { type: 'reach', desc: 'TEST' },
  durationSec: 60, applianceAt: 0.5, applianceHigh: false,
};

const makeRun = (onEnd = () => {}) => new RunState({
  stage, save, seed: 4242, difficulty: 1, skipRunIn: true, onEnd,
});

// What the road put down, in the order it put it down. Obstacles and pickups
// both: the capsule ladder draws from its own stream and is the half a seed
// bug would be likeliest to move.
function signature(run, frames) {
  const seen = new Set();
  const out = [];
  for (let i = 0; i < frames && !run.ended; i++) {
    run.update(1 / 60);
    for (const ob of run.obstacles) {
      if (seen.has(`o${ob.id}`)) continue;
      seen.add(`o${ob.id}`);
      out.push(`o:${ob.type}:${Math.round(ob.x)}:${Math.round(ob.y || 0)}`);
    }
    for (const p of run.pickups) {
      if (seen.has(`p${p.id}`)) continue;
      seen.add(`p${p.id}`);
      out.push(`p:${p.type}:${Math.round(p.x)}`);
    }
  }
  return out;
}

const FRAMES = 60 * 70;

const run = makeRun();
run.enter();
// Keep the probe on the placement branch — a death restarts the lane on its
// own, which is the other half of this feature and not the half under test.
run.collide = () => {};
const first = signature(run, FRAMES);
assert(first.length > 20, `the road laid something down to compare (${first.length} entries)`);

// PAUSE, and read the plates the way the screen does.
run.paused = true;
run.pauseChanged();
const plates = Input.buttons.filter((b) => ['resume', 'quit', 'restart'].includes(b.id));
assert(plates.length === 3, `three plates on the pause screen (${plates.length})`);
assert(plates.map((b) => b.id).join(',') === 'resume,quit,restart',
  `CONTINUE, EXIT, RESTART in that order (${plates.map((b) => b.id).join(',')})`);
assert(plates[2].action === 'restart', 'the last plate fires its own action');
assert(run.pauseIdx === 0, 'the cursor opens on CONTINUE, not on the plate that ends the run');
// No two plates may share pixels — the third one is new and the row was laid
// out for a pair.
for (let i = 1; i < plates.length; i++) {
  assert(plates[i].x >= plates[i - 1].x + plates[i - 1].w,
    `plate ${i} clears the one before it (${plates[i - 1].x + plates[i - 1].w} -> ${plates[i].x})`);
}
assert(plates[0].x >= 0 && plates[2].x + plates[2].w <= 480, 'the row fits the screen');

const seedBefore = run.seed;
run.score = 999;
run.snapshot = { fake: true };
run.restartStage();

assert(!run.paused, 'restart leaves the pause screen');
assert(run.seed === seedBefore, `restart keeps the seed (${run.seed})`);
assert(run.score === 0 && run.camX === 0 && run.tRun === 0, 'restart starts the stage over');
assert(run.snapshot === null,
  'restart drops the checkpoint of the attempt it abandoned');

const second = signature(run, FRAMES);
assert(second.length === first.length,
  `the replay laid down the same number of things (${first.length} vs ${second.length})`);
const diff = first.findIndex((v, i) => v !== second[i]);
assert(diff === -1,
  diff === -1 ? 'the restarted stage is the identical road, obstacle for obstacle'
    : `entry ${diff} differs: ${first[diff]} vs ${second[diff]}`);

// EVERY PLATE'S ACTION HAS TO BE READ BY SOMETHING.
//
// A plate is a hit box plus an action name, and a thumb pressing it does
// nothing more than fire that name. Nothing in the button list says whether
// anyone is listening for it, so renaming an action — which is exactly what
// gave the EXIT plate 'quit' instead of 'escape' — can leave a plate that looks
// live, highlights, and goes nowhere. Only the keyboard was safe, because the
// confirm path dispatches on the action rather than pressing it.
//
// So press each plate's action the way a tap does and drive a real frame with
// it: what is under test is the wiring from the name to the behaviour, and
// there is no way to check that without going through update().
function pausedRun(onEnd) {
  const r = makeRun(onEnd);
  r.enter();
  r.collide = () => {};
  r.paused = true;
  r.pauseChanged();
  return r;
}

function tapPlate(r, action) {
  Input.clearAll();
  Input.press(action);
  r.update(1 / 60);
  Input.clearAll();
}

{
  let ended = null;
  const r = pausedRun((result) => { ended = result; });
  tapPlate(r, 'quit');
  assert(!!ended, 'tapping EXIT ends the run');
  assert(ended && ended.success === false && ended.reason === 'QUIT',
    `EXIT ends it as a quit (${ended && ended.reason})`);
}

{
  const r = pausedRun();
  tapPlate(r, 'pause');
  assert(!r.paused, 'tapping CONTINUE leaves the pause screen');
}

{
  const r = pausedRun();
  r.score = 999;
  tapPlate(r, 'restart');
  assert(!r.paused && r.score === 0 && r.tRun === 0,
    'tapping RESTART starts the stage over');
}

console.log(failed ? 'PAUSE-RESTART: FAILED' : 'PAUSE-RESTART: PASSED');
process.exit(failed ? 1 : 0);
