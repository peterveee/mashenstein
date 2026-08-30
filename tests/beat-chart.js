// Authored RHYTHM BANKRUPTCY chart, placement, loop, and pickup contracts.
// Everything here is deterministic and DOM-free apart from the normal module
// bootstrap so a fake heard-beat clock can exercise the whole lane.
import { installDom } from './dom-stub.js';
installDom();

const { Audio } = await import('../src/engine/audio.js');
const { beatCharts } = await import('../src/data/songs/rhythm.js');
const {
  BeatSpawner, validateBeatChart, actionApproachPx, beatEventId,
} = await import('../src/game/beatchart.js');
const { randomPowerPickup } = await import('../src/game/powerups.js');
const { RunState } = await import('../src/game/run.js');
const { STAGES } = await import('../src/data/stages.js');
const { save } = await import('../src/engine/save.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const expected = {
  1: 'jump,coin,jump,coin,jump,coin,jump,coin',
  2: 'coin,duck,jump,coin,coin,duck,jump,coin',
  3: 'jump,coin,duck,duck,jump,coin,duck,duck,coin,duck,jump,coin,duck,duck,jump,coin',
};
for (const [id, chart] of Object.entries(beatCharts)) {
  const valid = validateBeatChart(chart);
  assert(valid.events.map((e) => e.action).join(',') === expected[id], `rhythm-${id} has its authored sequence`);
  assert(valid.events.every((e, i) => e.slot === i), `rhythm-${id} covers every integer beat exactly once`);
}

for (const bad of [
  { loopBeats: 2, events: [{ slot: 0, action: 'jump', type: 'beatBar' }, { slot: 0, action: 'coin' }] },
  { loopBeats: 1, events: [{ slot: 1, action: 'coin' }] },
  { loopBeats: 1, events: [{ slot: 0, action: 'laser' }] },
]) {
  let threw = false;
  try { validateBeatChart(bad); } catch { threw = true; }
  assert(threw, 'validator rejects malformed charts');
}
const abilityChart = validateBeatChart({ loopBeats: 2, events: [
  { slot: 0, action: 'ability' }, { slot: 1, action: 'coin' },
] });
assert(abilityChart.events[0].action === 'ability', 'future ability events remain valid timing markers');

const speed = 232, bpm = 124, pxPerBeat = speed * 60 / bpm;
let heard = 0;
const obstacles = [], pickups = [];
const spawner = new BeatSpawner({
  chart: beatCharts[1], bank: { bpm }, beatNow: () => heard,
  playerWorldX: (x) => x + 56, lookaheadBeats: 7,
});
spawner.fill(0, speed, obstacles, pickups, () => 50);
assert(obstacles[0]?.actionBeat === 2, 'first mandatory event starts two beats ahead');
assert(Math.abs(obstacles[0].x - (obstacles[0].actionX
  + actionApproachPx('jump', 'beatBar', speed))) < 1e-6,
  'jump placement uses actionX plus the cached approach offset');
assert(pickups.every((p) => p.formationId && p.chartEventId === p.formationId),
  'coin accents carry event and formation metadata');

for (let i = 1; i <= 40; i++) {
  heard = i;
  const worldX = heard * pxPerBeat;
  spawner.fill(worldX, speed, obstacles, pickups, () => 50);
}
const ids = [...obstacles, ...pickups].map((e) => e.chartEventId);
assert(new Set(ids).size === ids.length, 'event IDs stay unique across repeated loop seams');
assert(beatEventId(8, beatCharts[1].events[0]) !== beatEventId(16, beatCharts[1].events[0]),
  'event IDs include the loop pass');

let blockedBeat = 0;
const blocked = new BeatSpawner({ chart: beatCharts[1], bank: { bpm }, beatNow: () => blockedBeat,
  playerWorldX: (x) => x + 56, lookaheadBeats: 7 });
const blockedObs = [], blockedPickups = [];
blocked.fill(0, speed, blockedObs, blockedPickups, () => 50, 300);
assert(blockedObs.length === 0 && blockedPickups.length === 0,
  'finish wall treats the next chart event as an all-or-nothing boundary');

const crossingPit = { x: 4000, w: 200, crossing: { jumps: 5, stones: [] }, done: false };
let crossingBeat = 0;
const crossingSpawner = new BeatSpawner({ chart: beatCharts[2], bank: { bpm }, beatNow: () => crossingBeat,
  pitPlan: [crossingPit], playerWorldX: (x) => x + 56 });
crossingSpawner.fill(0, speed, [], [], () => 50);
assert(crossingPit.actionBeats?.length === 5
  && crossingPit.actionBeats.every((v, i, a) => i === 0 || v - a[i - 1] === 2),
  'crossing actions are authored five jumps exactly two beats apart');

const oldSongBeat = Audio.songBeat;
Audio.songBeat = () => 0.75;
assert(Math.abs(Audio.beatPhase() - 0.75) < 1e-9, 'beatPhase is derived from songBeat');
Audio.songBeat = () => Infinity;
assert(Audio.beatPhase() === 0, 'beatPhase is silent when songBeat is unavailable');
Audio.songBeat = oldSongBeat;

// A death retry keeps the song running, so it must settle against the current
// heard beat before the world starts moving again.  This is deliberately a
// real RunState check rather than a timer-only unit: the source-bank gate and
// the two-beat lane reset both need to be exercised together.
{
  save.load(); save.newSlot(0, 0);
  const oldSourceBank = Audio.sourceBank;
  const stage = STAGES.find((s) => s.id === 'rhythm-2');
  const retryRun = new RunState({ stage, save, seed: 19, skipRunIn: true, onEnd: () => {} });
  retryRun.enter();
  Audio.sourceBank = retryRun.cabinet.music;
  let retryBeat = 4.25;
  Audio.songBeat = () => retryBeat;
  retryRun.enter();
  assert(retryRun.rhythmSyncPending && retryRun.rhythmSyncT === 1,
    'a beat-stage death retry enters the audio settling hold');
  for (let i = 0; i < 30; i++) retryRun.update(1 / 60);
  assert(retryRun.rhythmSyncPending && retryRun.distance === 0,
    'the retry hold keeps the world still while the song continues');
  for (let i = 0; i < 40; i++) retryRun.update(1 / 60);
  assert(!retryRun.rhythmSyncPending && retryRun.distance > 0,
    'the retry resumes only after an atomic beat re-anchor');
  Audio.songBeat = oldSongBeat;
  Audio.sourceBank = oldSourceBank;
}

// onBeat mirrors onLoop: a run-scoped listener must be able to detach itself.
const beforeBeatListeners = Audio.beatListeners.length;
const offBeat = Audio.onBeat(() => {});
assert(Audio.beatListeners.length === beforeBeatListeners + 1, 'onBeat registers its listener');
assert(typeof offBeat === 'function' && (offBeat(), Audio.beatListeners.length === beforeBeatListeners),
  'onBeat returns an unsubscribe that detaches the listener');
assert(typeof Audio.onBeat(null) === 'function' && Audio.beatListeners.length === beforeBeatListeners,
  'onBeat ignores a non-function and still returns a no-op unsubscribe');

let reads = 0;
const fakeRng = { float: () => { reads++; return 0.45; }, pick: (xs) => { reads++; return xs[0]; } };
const banned = randomPowerPickup(fakeRng, null, { allowRewind: false,
  banned: new Set(['capSpeed', 'capLowGrav', 'capRewind']) });
assert(banned === 'capShield' || banned === 'capMagnet', 'banned power bands map deterministically to safe powers');
assert(reads === 1, 'pickup banning preserves the single normal RNG read');
let rewindBandReads = 0;
const rewindBand = randomPowerPickup({ float: () => { rewindBandReads++; return 0.2; } }, null,
  { allowRewind: true, banned: new Set(['capRewind']) });
assert(rewindBand === 'capShield' || rewindBand === 'capMagnet', 'the banned rewind band maps to a safe power');
assert(rewindBandReads === 1, 'rewind-band mapping does not add an RNG read');

console.log(failed ? 'BEAT-CHART: FAILED' : 'BEAT-CHART: PASSED');
process.exit(failed ? 1 : 0);
