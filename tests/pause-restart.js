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

const makeRun = () => new RunState({
  stage, save, seed: 4242, difficulty: 1, skipRunIn: true, onEnd() {},
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

console.log(failed ? 'PAUSE-RESTART: FAILED' : 'PAUSE-RESTART: PASSED');
process.exit(failed ? 1 : 0);
