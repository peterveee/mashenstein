// RECORD BACKGROUND IS THE SCENERY AND ONE HERO, END TO END.
//
// The dev menu's RECORD BACKGROUND tapes a stage for its backdrop: the DemoBot
// runs it with `recordBackground` set, which strips the lane to its holes every
// frame, turns off the portal and the chatter, and at the tape lets the hero run
// on out of the right edge instead of stopping at the pole. Three claims, on
// every stage in the game, with the hero rotated through the cast:
//
//   it opens the way the stage does, the hero off the left edge and running in;
//
//   nothing but holes is ever in the lane, and nothing else that answers to the
//   run (pickups, shots, the portal, the copter, a speech bubble, a popup) is
//   ever up;
//
//   the bot jumps every hole — the take is invulnerable, so a mistimed pit is a
//   hero running over thin air rather than a death, and devHits is where that
//   would show;
//
//   the run ends, successfully, with the hero wholly past the right edge.
import { installDom } from './dom-stub.js';
installDom();

const { RunState } = await import('../src/game/run.js');
const { defaultSlot, defaultSettings } = await import('../src/engine/save.js');
const { Input } = await import('../src/engine/input.js');
const { DemoBot } = await import('../src/game/bot.js');
const { STAGES } = await import('../src/data/stages.js');
const { CABINET_BY_ID } = await import('../src/data/cabinets.js');
const { HEROES } = await import('../src/data/heroes.js');
const { Audio } = await import('../src/engine/audio.js');
const { bank: rhythmBank } = await import('../src/data/songs/rhythm.js');
const REAL_SONG_BEAT = Audio.songBeat;

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const TICK = 1 / 60;
const MAX_TICKS = 60 * 60 * 4;

// The throwaway save AttractState builds.
function demoSave() {
  const slot = defaultSlot();
  slot.tutor = { firstPortal: 1, firstSwitch: 1, firstAbility: 1 };
  const settings = defaultSettings();
  return { data: { version: 2, settings, slots: [slot] }, slot, settings, persist() {} };
}

function play(stage, heroId) {
  const cab = CABINET_BY_ID[stage.cabinet];
  const beat = cab.mechanic === 'beat';
  let t = 0;
  Audio.sourceBank = beat ? cab.music : null;
  Audio.songBeat = !beat ? REAL_SONG_BEAT : () => (t * rhythmBank.bpm) / 60;
  let result = null;
  // The options AttractState passes for `background`.
  const run = new RunState({
    stage, save: demoSave(), seed: 1337, difficulty: 1, demo: true,
    devInvuln: true, devForceMission: true, recordBackground: true,
    initialHeroId: heroId, onEnd: (r) => { result = r; },
  });
  run.enter();
  const bot = new DemoBot(run);
  const leaks = new Set();
  const heroes = new Set();
  const holes = new Set();
  const look = () => {
    for (const ob of run.obstacles) if (ob.def?.isGap) holes.add(ob);
    for (const ob of run.obstacles) if (!ob.def?.isGap) leaks.add(`obstacle:${ob.type || ob.def?.id || '?'}`);
    if (run.pickups.length) leaks.add('pickup');
    if (run.projectiles.length) leaks.add('projectile');
    if (run.portal) leaks.add('portal');
    if (run.copter) leaks.add('copter');
    if (run.speech) leaks.add('speech');
    if (run.floaties.length) leaks.add('floatie');
    if (run.goalToasts.length) leaks.add('goalToast');
    if (run.flip || run.finaleT != null) leaks.add('finish pole');
    heroes.add(run.relay.current);
  };
  look();
  const ranIn = run.introRunning && run.heroScreenX() < 0;
  let ticks = 0;
  let exitX = null;
  while (!result && ticks < MAX_TICKS) {
    ticks++;
    t += TICK;
    bot.update(TICK);
    run.update(TICK);
    look();
    if (result) exitX = run.heroScreenX() - run.viewRightDx();
  }
  bot.releaseAll();
  Input.endFrame();
  return {
    result, leaks: [...leaks], heroes: [...heroes], exitX, holes: holes.size, ranIn,
    pits: run.devHits.filter((h) => h.type === 'pit').length,
    hits: run.devHits.length,
  };
}

const heroIds = Object.values(HEROES).map((h) => h.id);
let holesTotal = 0;
STAGES.forEach((stage, i) => {
  const heroId = heroIds[i % heroIds.length];
  const r = play(stage, heroId);
  const tag = `${stage.id} as ${heroId}`;
  assert(r.ranIn, `${tag}: opens with the hero off the left edge, running in`);
  assert(r.leaks.length === 0, `${tag}: only holes and scenery (${r.leaks.join(', ') || 'clean'})`);
  assert(r.heroes.length === 1 && r.heroes[0] === heroId, `${tag}: the same hero the whole way (${r.heroes.join(', ')})`);
  assert(r.pits === 0 && r.hits === 0, `${tag}: every hole jumped (${r.holes} holes, ${r.pits} run over)`);
  holesTotal += r.holes;
  assert(r.result?.success === true && r.exitX > 0,
    `${tag}: ends clean with the hero past the right edge (${r.exitX == null ? 'never ended' : `${r.exitX.toFixed(1)} past`})`);
});

// Not vacuous: the stages above really do cut holes for the bot to meet.
assert(holesTotal > STAGES.length, `and there were holes to jump (${holesTotal} across ${STAGES.length} stages)`);

Audio.songBeat = REAL_SONG_BEAT;
if (failed) { console.error('RECORD BACKGROUND: FAILED'); process.exit(1); }
console.log('RECORD BACKGROUND: PASSED');
