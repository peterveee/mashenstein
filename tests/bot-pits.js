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
import { installDom } from './dom-stub.js';
installDom();

const { RunState } = await import('../src/game/run.js');
const { save } = await import('../src/engine/save.js');
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

console.log(failed ? 'BOT PITS: FAILED' : 'BOT PITS: PASSED');
process.exit(failed ? 1 : 0);
