// THE CLOCK: every mission is the finish line (17 Oct 2026), and the clock is
// what a stage can be failed on: one of three limits (TIME_TIERS) picked by the
// stage's length, in seconds of live running. What is left at the tape is paid
// out as coins and earns the rank's TIME point.
//
// Claims, over real headless runs:
//   - every campaign stage has one, from its tier; overtime and ?noclock runs
//     have none
//   - every mission is reach, and every stage has exactly one bonus
//   - it runs only while the run is live: a pause and a death do not spend it
//   - a death before the first checkpoint (which re-enters the stage) does not
//     hand the time back
//   - the hurry-up arms at HURRY_SEC left and pushes the song's tempo
//   - running out ends the run as TIME'S UP
//   - the seconds left at the tape walk into the coin count, and a quarter of
//     the clock left is the rank's fifth point
import { installDom } from './dom-stub.js';
installDom();

const { RunState, HURRY_SEC } = await import('../src/game/run.js');
const { save } = await import('../src/engine/save.js');
const { Input } = await import('../src/engine/input.js');
const { Audio } = await import('../src/engine/audio.js');
const { STAGES, STAGE_BY_ID, TIME_TIERS } = await import('../src/data/stages.js');
const { computeRank } = await import('../src/game/progress.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

save.load();
save.newSlot(0, 0);
const TICK = 1 / 60;
const newRun = (opts = {}) => {
  const run = new RunState({ stage: STAGE_BY_ID['plumber-1'], team: ['lorenzo', 'rusty', 'clara'], save, seed: 1, difficulty: 1, corrupted: [], onEnd: () => {}, ...opts });
  run.enter();
  return run;
};
// Step until the run is live (cards and the run-in done).
const toLive = (run) => {
  for (let i = 0; i < 60 * 20 && (run.zoneCard || run.introRunning || run.tRun === 0); i++) {
    run.update(TICK); Input.endFrame();
  }
};

// ------------------------------------------------------------------ the data
assert(STAGES.every((s) => s.mission.type === 'reach'), 'every mission is the finish line');
assert(STAGES.every((s) => s.challenge && s.challenge.type), 'every stage has one bonus');
assert(!STAGES.some((s) => s.challenge.type === 'rescue'), 'the escort is gone');
assert(STAGE_BY_ID['crypt-1'].blackout && STAGE_BY_ID['crypt-3'].blackout && !STAGE_BY_ID['crypt-2'].blackout,
  'the brown-out stays on crypt-1 and crypt-3');

// ----------------------------------------------------------------- the limit
const LIMITS = new Set(TIME_TIERS.map((t) => t.limit));
for (const [id, want] of [['plumber-1', 100], ['rhythm-2', 150], ['gravity-1', 150], ['gravity-2', 200], ['surge-3', 200]]) {
  const run = newRun({ stage: STAGE_BY_ID[id] });
  assert(run.timeLimit === want, `${id}: ${run.duration}s stage, ${run.timeLimit}s on the clock`);
}
for (const s of STAGES) {
  const run = newRun({ stage: s });
  if (!LIMITS.has(run.timeLimit) || run.timeLimit < run.duration * 1.5) {
    assert(false, `${s.id}: limit ${run.timeLimit}s is a tier value and leaves room for replays over its ${run.duration}s`);
  }
}
assert(true, 'every stage is on a tier and has at least half its length again for replays');
assert(newRun({ noClock: true }).timeLimit === null, 'noClock runs have no clock');
assert(newRun({ stage: null, overtime: true }).timeLimit === null, 'overtime has no clock');

// ------------------------------------------------- live time only, kept on death
{
  const run = newRun();
  toLive(run);
  const t0 = run.clockT;
  for (let i = 0; i < 60; i++) { run.update(TICK); Input.endFrame(); }
  assert(Math.abs(run.clockT - t0 - 1) < 0.05, `a second of running spends a second (${(run.clockT - t0).toFixed(3)})`);
  run.paused = true;
  const tp = run.clockT;
  for (let i = 0; i < 60; i++) { run.update(TICK); Input.endFrame(); }
  assert(run.clockT === tp, 'a pause spends nothing');
  run.paused = false;
  run.pauseChanged?.();
  for (let i = 0; i < 5; i++) { run.update(TICK); Input.endFrame(); }
  const td = run.clockT;
  run.die?.('TEST') ?? run.takeHit?.('TEST');
  let deadTicks = 0;
  for (let i = 0; i < 60 * 3 && run.dead; i++) { run.update(TICK); Input.endFrame(); deadTicks++; }
  if (deadTicks > 0) assert(run.clockT - td < 0.2, `the death and the respawn spend nothing (${(run.clockT - td).toFixed(3)} over ${deadTicks} ticks)`);
  const before = run.clockT;
  run.enter();
  assert(run.clockT === before, 're-entering the stage after an early death keeps the time spent');
}

// --------------------------------------------------------- hurry and time up
{
  let result = null;
  const run = newRun({ onEnd: (r) => { result = r; } });
  toLive(run);
  run.devInvuln = true;
  run.clockT = run.timeLimit - HURRY_SEC - 0.5;
  for (let i = 0; i < 60 && !run.hurried; i++) { run.update(TICK); Input.endFrame(); }
  assert(run.hurried, `the hurry-up arms at ${HURRY_SEC}s left`);
  for (let i = 0; i < 3; i++) { run.update(TICK); Input.endFrame(); }
  assert(Audio.tempo > 1.05, `and the song is pushed (tempo x${Number(Audio.tempo).toFixed(2)})`);
  run.clockT = run.timeLimit - 0.1;
  for (let i = 0; i < 30 && !result; i++) { run.update(TICK); Input.endFrame(); }
  assert(result && !result.success && result.failMsg === "TIME'S UP", `running out ends the run as TIME'S UP (${result?.failMsg})`);
}

// ---------------------------------------------------- the payout and the rank
{
  let result = null;
  const run = newRun({ onEnd: (r) => { result = r; } });
  toLive(run);
  run.devInvuln = true;
  for (let i = 0; i < 60 * 200 && !result; i++) { run.update(TICK); Input.endFrame(); }
  assert(result && result.success, 'an untouched run finishes');
  const left = Math.floor(result.timeLeft);
  assert(left > 0 && result.timeLimit === 100, `it reaches the tape with time left (${result.timeLeft?.toFixed(1)} of ${result.timeLimit})`);
  assert(run.timeCoins && run.timeCoins.left === 0 && run.timeCoins.total === left,
    `every second left is paid out as a coin before the results (${run.timeCoins?.total - run.timeCoins?.left}/${left})`);
  assert(run.timeLeft() === 0, 'and the pill clock has counted down to 0');
  const base = { success: true, challengeDone: true, applianceGot: true, damageTaken: 0, coins: 10, timeLimit: 100 };
  assert(computeRank({ ...base, timeLeft: 40 }, 1) === 'S', 'all five points, a quarter of the clock left included, is an S');
  assert(computeRank({ ...base, timeLeft: 10 }, 1) === 'A', 'the same run with the clock nearly gone is an A');
  assert(computeRank({ ...base, timeLimit: null, timeLeft: null }, 1) === 'S', 'a run with no clock is graded out of four');
}

console.log(failed ? 'STAGE CLOCK: FAILED' : 'STAGE CLOCK: PASSED');
process.exit(failed ? 1 : 0);
