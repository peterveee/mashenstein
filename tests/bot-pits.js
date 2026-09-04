// THE DEMO BOT DOES NOT FALL DOWN HOLES.
//
// Every watch mode in the game — the arcade attract loop, the dev menu's
// BOT-PLAY — is the DemoBot playing a real stage against a real RunState. A hit
// costs it a moment and the demo carries on; a PIT costs it the run, and a run
// that ends two thirds of the way through a level is a watch mode that never
// shows you the level. That is the whole claim of this suite, and it is checked
// where it is made: twenty-seven real stages, played end to end.
//
// The second claim is narrower and stronger. A beat cabinet MARKS what it wants
// — every piece the chart lays carries `actionX`, the world x its beat falls at
// (beatchart.js) — so on those three stages the bot has no excuse for reading
// the lane at all. It plays the marks, and it takes no damage doing it, for
// every hero in the relay bag.
//
// The third is about the run the watch modes ACTUALLY play, which is not the
// one above: `demo: true` ends the level on the first death rather than
// recovering at a checkpoint (see updateDead), and a demo's clock is the song's
// rather than the sim's, so the phase between the chart and everything driven
// by wall time is different on every launch. Played that way, at several
// phases: no holes anywhere, and on the three chase stages the VILLAIN never
// costs the demo the level. A bonk stops the rise dead (the clonk in run.js's
// bonk branch), which is a flight ending half a stride early — the bot solves
// for that flight rather than the one on paper, and the level it is meant to be
// showing off runs to the end.
import { installDom } from './dom-stub.js';
installDom();

const { RunState } = await import('../src/game/run.js');
const { save, defaultSlot, defaultSettings } = await import('../src/engine/save.js');
const { Input } = await import('../src/engine/input.js');
const { DemoBot } = await import('../src/game/bot.js');
const { STAGES } = await import('../src/data/stages.js');
const { CABINET_BY_ID } = await import('../src/data/cabinets.js');
const { HEROES } = await import('../src/data/heroes.js');
const { Audio } = await import('../src/engine/audio.js');
const { bank: rhythmBank } = await import('../src/data/songs/rhythm.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

save.load();
save.newSlot(0, 0);

const TICK = 1 / 60;
const MAX_TICKS = 60 * 60 * 4;

/**
 * One headless run, with the tally the two claims are made against.
 *
 * A beat cabinet needs a heard clock or the chart lays nothing at all — the
 * spawner asks for `Audio.songBeat()` and gives up when it is not finite (see
 * rhythmBeatNow) — so the sim supplies a perfect one off its own tick count.
 * That is the same clock the cabinet has when the song is playing cleanly,
 * which is the case the bot is being held to.
 */
function play(stage, team) {
  const cab = CABINET_BY_ID[stage.cabinet];
  const beat = cab.mechanic === 'beat';
  let t = 0;
  Audio.sourceBank = beat ? cab.music : null;
  if (beat) Audio.songBeat = () => (t * rhythmBank.bpm) / 60;
  let result = null;
  const run = new RunState({
    stage, team, save, seed: 1337, difficulty: 1, onEnd: (r) => { result = r; },
  });
  run.enter();
  const bot = new DemoBot(run);
  const tally = { hits: 0, pits: 0 };
  const takeHit = run.takeHit.bind(run);
  // The fourth argument is the hole itself, and it is the only caller that
  // passes one — see the isGap branch in RunState.collide.
  run.takeHit = (msg, isPit, src, pit) => {
    tally.hits++;
    if (pit) tally.pits++;
    return takeHit(msg, isPit, src, pit);
  };
  let ticks = 0;
  while (!result && ticks < MAX_TICKS) {
    ticks++;
    t += TICK;
    bot.update(TICK);
    run.update(TICK);
  }
  bot.releaseAll();
  Input.endFrame();
  tally.result = result;
  tally.secs = ticks / 60;
  tally.pitFails = run.pitFails;
  return tally;
}

// ---- every stage in the game, played to the end ------------------------------
//
// The team is the ordinary three-hero bag rather than one hero, because a relay
// swap changes the arc mid-run and the arc is what the hole is aimed with.
const TEAM = ['lorenzo', 'gnash', 'clara'];
let unfinished = 0;
for (const stage of STAGES) {
  const r = play(stage, TEAM);
  assert(r.pits === 0 && r.pitFails === 0,
    `${stage.id}: the bot never goes down a hole (${r.pits} falls, ${r.secs.toFixed(0)}s)`);
  if (!r.result) unfinished++;
}
assert(unfinished === 0,
  `and every stage reaches its own ending rather than the sim's cap (${unfinished} did not)`);

// ---- the beat cabinet, hero by hero ------------------------------------------
//
// Zero damage, not merely zero deaths. The chart says what to press and where,
// so anything the bot walks into here is the bot failing to read a mark it was
// handed — and it has to hold for the whole bag, since a relay can put any of
// the eight in the lane.
for (const stage of STAGES.filter((s) => CABINET_BY_ID[s.cabinet].mechanic === 'beat')) {
  for (const hero of Object.values(HEROES)) {
    const r = play(stage, [hero.id]);
    assert(r.hits === 0,
      `${stage.id}: ${hero.id} plays the marks clean (${r.hits} hits, ${r.pits} falls)`);
  }
}

// ---- the run a watch mode actually plays -------------------------------------
//
// A throwaway save, exactly as AttractState builds one: the demo's progress,
// coins and deaths go nowhere, and its hero bag is the default rather than
// whatever this machine has unlocked.
function demoSave() {
  const slot = defaultSlot();
  slot.tutor = { firstPortal: 1, firstSwitch: 1, firstAbility: 1 };
  const settings = defaultSettings();
  return { data: { version: 2, settings, slots: [slot] }, slot, settings, persist() {} };
}

/**
 * One demo run at a given phase between the song's clock and the run's own.
 *
 * The phase is the whole point of the parameter. A demo's beat comes from the
 * music, and the music does not restart with the level — so the chart and
 * everything the copter does off `tRun` line up differently every time the
 * attract loop comes round. Sweeping it is the only way a fixed seed sees more
 * than one of the runs a player will actually watch.
 */
function playDemo(stage, seed, phase) {
  const cab = CABINET_BY_ID[stage.cabinet];
  const beat = cab.mechanic === 'beat';
  let t = 0;
  Audio.sourceBank = beat ? cab.music : null;
  if (beat) Audio.songBeat = () => ((t + phase) * rhythmBank.bpm) / 60;
  let result = null;
  const run = new RunState({
    stage, save: demoSave(), seed, difficulty: 1, demo: true, onEnd: (r) => { result = r; },
  });
  run.enter();
  const bot = new DemoBot(run);
  const tally = { pits: 0, bonks: 0, bonkCost: 0, died: false };
  const takeHit = run.takeHit.bind(run);
  // A hit taken in a flight the villain interrupted is the bug this is here
  // for: the bonk shortens the arc, and the arc was clearing something.
  let bonkedInFlight = false;
  run.takeHit = (msg, isPit, src, pit) => {
    if (pit) tally.pits++;
    if (bonkedInFlight) tally.bonkCost++;
    return takeHit(msg, isPit, src, pit);
  };
  let ticks = 0;
  let wasGrounded = true;
  let bonks = 0;
  while (!result && ticks < MAX_TICKS) {
    ticks++;
    t += TICK;
    bot.update(TICK);
    run.update(TICK);
    if (run.copterBonks > bonks) { bonks = run.copterBonks; bonkedInFlight = true; }
    if (!wasGrounded && run.player.grounded) bonkedInFlight = false;
    wasGrounded = run.player.grounded;
  }
  bot.releaseAll();
  Input.endFrame();
  tally.bonks = bonks;
  tally.died = run.dead;
  tally.finished = !!result;
  return tally;
}

const PHASES = [0, 0.37, 1.31];
let demoPits = 0;
let demoStuck = 0;
let demoDeaths = [];
for (const stage of STAGES) {
  for (let i = 0; i < PHASES.length; i++) {
    const r = playDemo(stage, (0x1234 + i * 7919) >>> 0, PHASES[i]);
    demoPits += r.pits;
    if (r.died) demoDeaths.push(stage.id);
    if (!r.finished) demoStuck++;
  }
}
const RUNS = STAGES.length * PHASES.length;
assert(demoPits === 0, `a demo run never goes down a hole either (${demoPits} falls across ${RUNS} runs)`);
// THE WHOLE POINT OF A WATCH MODE. A demo ends on its first death — there is no
// checkpoint recovery in one (see updateDead) — so a death two thirds of the way
// through is an attract clip that never shows the level it picked.
assert(demoDeaths.length === 0,
  `and a demo run never dies at all (${demoDeaths.length} of ${RUNS}${demoDeaths.length ? `: ${[...new Set(demoDeaths)].join(', ')}` : ''})`);
assert(demoStuck === 0, `and every demo run reaches an ending (${demoStuck} hit the sim's cap)`);

// ---- the villain does not cost the demo the level ----------------------------
const CHASE = STAGES.filter((s) => s.mission.type === 'chase');
assert(CHASE.length === 3, `all three chase stages are in play (${CHASE.map((s) => s.id).join(', ')})`);
for (const stage of CHASE) {
  let bonks = 0;
  let deaths = 0;
  let cost = 0;
  for (let i = 0; i < 6; i++) {
    const r = playDemo(stage, (0x1234 + i * 7919) >>> 0, (i * 0.37) % 4);
    bonks += r.bonks;
    cost += r.bonkCost;
    if (r.died) deaths++;
  }
  // The mission is three bonks; six runs that never reached it would mean the
  // bot had simply stopped jumping at him, which is not the fix.
  assert(bonks >= 18, `${stage.id}: the demo still bonks the villain (${bonks} across 6 runs)`);
  assert(deaths === 0, `${stage.id}: and the chase never ends the demo (${deaths} deaths, ${cost} hits inside a bonked flight)`);
}

console.log(failed ? 'BOT PITS: FAILED' : 'BOT PITS: PASSED');
process.exit(failed ? 1 : 0);
