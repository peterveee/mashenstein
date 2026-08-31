// Authored RHYTHM BANKRUPTCY chart, placement, loop, and pickup contracts.
// Everything here is deterministic and DOM-free apart from the normal module
// bootstrap so a fake heard-beat clock can exercise the whole lane.
import { installDom } from './dom-stub.js';
installDom();

const { Audio } = await import('../src/engine/audio.js');
const { beatCharts } = await import('../src/data/songs/rhythm.js');
const {
  BeatSpawner, validateBeatChart, actionApproachPx, beatEventId,
  pitLayout, pitWindowBeats, laneRunwayBeats, PIT_BEATS, ON_BEAT_WINDOW,
  LANE_RUNWAY_BEATS, PIT_LANE_RUNWAY_BEATS, COIN_DIV,
} = await import('../src/game/beatchart.js');
const { worstAirtime } = await import('../src/game/spawner.js');
const { randomPowerPickup } = await import('../src/game/powerups.js');
const { RunState } = await import('../src/game/run.js');
const { STAGES } = await import('../src/data/stages.js');
const { save } = await import('../src/engine/save.js');

const speed = 232, bpm = 124, pxPerBeat = speed * 60 / bpm;
let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const expected = {
  1: 'jump,coin,jump,coin,coin,coin,jump,coin,coin,coin,pit,coin,pit,coin,coin,coin',
  2: 'coin,duck,jump,coin,pit,coin,pit,coin,coin,duck,jump,coin,pit,coin,pit,coin',
  3: 'jump,coin,duck,duck,jump,coin,duck,coin,pit,coin,pit,coin,pit,coin,pit,coin',
};
for (const [id, chart] of Object.entries(beatCharts)) {
  const valid = validateBeatChart(chart, { bpm });
  assert(valid.events.map((e) => e.action).join(',') === expected[id], `rhythm-${id} has its authored sequence`);
  assert(valid.events.every((e, i) => e.slot === i), `rhythm-${id} covers every integer beat exactly once`);
  // The holes ramp across the cabinet and never thin out.
  const pits = valid.events.filter((e) => e.action === 'pit').length;
  assert(pits >= (id === '1' ? 2 : 4), `rhythm-${id} cuts ${pits} holes in every loop`);
}

// ---- THE CHART PIT ----------------------------------------------------------
// A hole on a beat grid is only fair if the slack either side of the takeoff is
// wider than the window the same jump is SCORED in. Otherwise the cabinet can
// award an on-beat jump and drop the player in the hole it scored.
for (const [id, chart] of Object.entries(beatCharts)) {
  for (const e of chart.events.filter((x) => x.action === 'pit')) {
    const window = pitWindowBeats(e.beats ?? PIT_BEATS, bpm);
    assert(window > ON_BEAT_WINDOW,
      `rhythm-${id} slot ${e.slot}: ${window.toFixed(3)} beats of slack beats the `
      + `${ON_BEAT_WINDOW} the judge scores on`);
  }
}
{
  // Scale invariance: the break is a fraction of the flight at any lane speed,
  // so one arithmetic covers world 1 and UNPLUGGED alike.
  for (const sp of [180, 232, 400]) {
    const { w, approach } = pitLayout(sp, bpm);
    const travel = worstAirtime() * sp;
    assert(Math.abs((travel - w) / 2 - approach) < 1e-9,
      `at ${sp}px/s the break is centred in the least airborne hero's flight`);
    assert(w < travel, `at ${sp}px/s the break is jumpable at all (${w.toFixed(0)} < ${travel.toFixed(0)})`);
    assert(Math.abs(w / (sp * 60 / bpm) - PIT_BEATS) < 1e-9,
      `at ${sp}px/s the break is still ${PIT_BEATS} of a beat wide`);
  }
}
let wideThrew = false;
try {
  validateBeatChart({ loopBeats: 4, events: [
    { slot: 0, action: 'pit', beats: 2 }, { slot: 1, action: 'coin' },
    { slot: 2, action: 'coin' }, { slot: 3, action: 'coin' },
  ] }, { bpm });
} catch { wideThrew = true; }
assert(wideThrew, 'the validator refuses a hole wider than the on-beat window');
let tightThrew = false;
try {
  validateBeatChart({ loopBeats: 2, events: [
    { slot: 0, action: 'pit' }, { slot: 1, action: 'duck', type: 'drone' },
  ] }, { bpm });
} catch { tightThrew = true; }
assert(tightThrew, 'the validator refuses a duck one beat after a landing');
// ---- COIN FILLS ------------------------------------------------------------
const allFills = [];
for (const [id, chart] of Object.entries(beatCharts)) {
  const runs = chart.events.filter((e) => e.action === 'coin' && (e.run ?? 1) > 1);
  allFills.push(...runs);
  assert(runs.length >= 1, `rhythm-${id} plays ${runs.length} fill(s) a loop`);
  // A fill's last note is one subdivision short of the next slot line, so a
  // coin standing there is heard as the next note of the same run and the
  // figure stops being the burst it was authored as.
  assert(runs.every((e) => chart.events[(e.slot + 1) % chart.loopBeats].action !== 'coin'),
    `rhythm-${id} rests after every fill, so each figure is closed`);
  assert(runs.every((e) => (e.run - 1) / e.div < 1),
    `rhythm-${id} keeps every fill inside its own beat`);
}
// THE SHORTER THE NOTE, THE RARER IT IS — the whole shape of the set. Checked
// as an ordering rather than as a table of numbers so the charts can be
// retuned without rewriting the claim.
{
  const rarest = new Map();   // div -> the most frequent cadence at that div
  for (const e of allFills) {
    rarest.set(e.div, Math.min(rarest.get(e.div) ?? Infinity, e.every ?? 1));
  }
  const divs = [...rarest.keys()].sort((a, b) => a - b);
  const cadences = divs.map((d) => rarest.get(d));
  assert(cadences.every((c, i) => i === 0 || c >= cadences[i - 1]),
    'the shorter the note the rarer the fill ('
    + divs.map((d, i) => `1/${d} every ${cadences[i]}`).join(', ') + ')');
}
assert(allFills.some((e) => e.div === 2) && allFills.some((e) => e.div === 4)
  && allFills.some((e) => e.div === 8), 'the cabinet plays eighths, sixteenths and 32nds');
assert(allFills.filter((e) => e.div === 8).every((e) => (e.every ?? 1) >= 8),
  'and a 32nd is genuinely rare — no more than once every eight loops');
let cadenceThrew = false;
try {
  validateBeatChart({ loopBeats: 2, events: [
    { slot: 0, action: 'jump', type: 'beatBar', every: 2 }, { slot: 1, action: 'coin' },
  ] }, { bpm });
} catch { cadenceThrew = true; }
assert(cadenceThrew, 'only a coin fill may skip loops — a skipped jump would desync the judge');
let lureThrew = false;
try {
  // A four-coin fill on the beat before a hole: the tail stands well inside the
  // approach the hole owns, which is the lure the rule exists to refuse.
  validateBeatChart({ loopBeats: 4, events: [
    { slot: 0, action: 'coin', run: 4 }, { slot: 1, action: 'pit' },
    { slot: 2, action: 'coin' }, { slot: 3, action: 'coin' },
  ] }, { bpm });
} catch { lureThrew = true; }
assert(lureThrew, 'the validator refuses a coin fill running up to a hole');
let overrunThrew = false;
try {
  validateBeatChart({ loopBeats: 2, events: [
    { slot: 0, action: 'coin', run: 5 }, { slot: 1, action: 'coin' },
  ] }, { bpm });
} catch { overrunThrew = true; }
assert(overrunThrew, 'the validator refuses a fill that overruns its own beat');

assert(laneRunwayBeats(beatCharts[1]) === PIT_LANE_RUNWAY_BEATS
  && laneRunwayBeats({ events: [{ action: 'jump' }] }) === LANE_RUNWAY_BEATS,
  'a chart that cuts holes is given the longer runway after a resync');

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

let heard = 0;
const obstacles = [], pickups = [];
const spawner = new BeatSpawner({
  chart: beatCharts[1], bank: { bpm }, beatNow: () => heard,
  playerWorldX: (x) => x + 56, lookaheadBeats: 7,
});
spawner.fill(0, speed, obstacles, pickups, () => 50);
const firstBeat = Math.min(...[...obstacles, ...pickups].map((e) => e.actionBeat));
assert(firstBeat === PIT_LANE_RUNWAY_BEATS,
  'nothing at all is laid inside the runway a hole-cutting chart is given');
const firstBar = obstacles.find((o) => o.chartSlot === 6);
assert(firstBar && firstBar.actionBeat === 6, 'the first mandatory event is the chart\'s own next one');
assert(Math.abs(firstBar.x - (firstBar.actionX
  + actionApproachPx('jump', 'beatBar', speed))) < 1e-6,
  'jump placement uses actionX plus the cached approach offset');
assert(pickups.every((p) => p.formationId && p.chartAction === 'coin'),
  'coin accents carry event and formation metadata');
assert(pickups.filter((p) => (beatCharts[1].events[p.chartSlot].run ?? 1) === 1)
  .every((p) => p.chartEventId === p.formationId),
  'a coin on the line is its own formation');

for (let i = 1; i <= 40; i++) {
  heard = i;
  const worldX = heard * pxPerBeat;
  spawner.fill(worldX, speed, obstacles, pickups, () => 50);
}
const firstHole = obstacles.find((o) => o.def.isGap);
assert(firstHole && firstHole.chartSlot === 10 && firstHole.chartAction === 'jump',
  'a chart pit reaches the lane as a gap that asks for a jump');
assert(Math.abs(firstHole.w - pitLayout(speed, bpm).w) < 1e-9
  && Math.abs(firstHole.x - (firstHole.actionX + pitLayout(speed, bpm).approach)) < 1e-9,
  'and it is the width and the offset pitLayout derives');
{
  // No coin may stand on a lip. The spacing table is what guarantees it, so
  // check the lane rather than the table.
  const holes = obstacles.filter((o) => o.def.isGap);
  const lipped = pickups.filter((pk) => holes.some((h) =>
    pk.x + 8 > h.x - 4 && pk.x < h.x + h.w + 4));
  assert(lipped.length === 0, 'no coin is laid over a chart pit or on either lip');
  // A fill reaches the lane as four coins a sixteenth apart, sharing one
  // formation so a sweep can only ever take the whole figure.
  const fill = pickups.filter((pk) => pk.chartSlot === 5 && pk.actionBeat === 5)
    .sort((a, b) => a.x - b.x);
  assert(fill.length === 4, `the slot-5 fill lays four coins (got ${fill.length})`);
  assert(fill.every((pk, i) => i === 0
    || Math.abs((pk.x - fill[i - 1].x) - pxPerBeat / COIN_DIV) < 1e-6),
    'and lays them exactly a sixteenth of a beat apart');
  // ...and on an odd pass the same slot is one coin on the line. `every: 2`.
  const quiet = pickups.filter((pk) => pk.chartSlot === 5 && pk.actionBeat === 21);
  assert(quiet.length === 1, `the slot-5 fill rests on the odd pass (got ${quiet.length})`);
  const rare = pickups.filter((pk) => pk.chartSlot === 15 && pk.actionBeat === 15);
  assert(rare.length === 8, `the 32nd fill lays eight coins on its pass (got ${rare.length})`);
  assert(pickups.filter((pk) => pk.chartSlot === 15 && pk.actionBeat === 31).length === 1,
    'and nothing but a quarter on the seven passes between');
  assert(new Set(fill.map((pk) => pk.formationId)).size === 1,
    'and they are one formation, so a hole sweeps the figure whole');
  assert(new Set(fill.map((pk) => pk.chartEventId)).size === 4,
    'while each coin keeps an identity of its own');
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
