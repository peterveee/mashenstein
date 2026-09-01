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
  BOX_LEAD_BEATS, BOX_BURST_BEATS,
} = await import('../src/game/beatchart.js');
const { worstAirtime, sweepCoinsAroundHole } = await import('../src/game/spawner.js');
const { randomPowerPickup } = await import('../src/game/powerups.js');
const { beatRibbonOffset, beatRibbonMarkerOffset, RIBBON_BEAT_PX } = await import('../src/game/hud.js');
const { RunState } = await import('../src/game/run.js');
const { STAGES } = await import('../src/data/stages.js');
const { save } = await import('../src/engine/save.js');
const { HEROES, heroShoots } = await import('../src/data/heroes.js');
const { OBSTACLES, DRONE_COLUMN_ALTS, makeDroneColumn } = await import('../src/game/entities.js');
const { BASE_JUMP_V, GRAVITY, HEAVY_GRAVITY_MULT, PLAYER_H } = await import('../src/game/player.js');

const speed = 232, bpm = 124, pxPerBeat = speed * 60 / bpm;
let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const expected = {
  1: 'jump,coin,jump,coin,coin,coin,jump,ability,coin,coin,pit,coin,pit,coin,coin,coin',
  2: 'coin,duck,jump,ability,pit,coin,pit,coin,coin,duck,jump,coin,pit,coin,pit,coin',
  3: 'jump,coin,duck,duck,jump,coin,duck,ability,pit,coin,pit,coin,pit,coin,pit,coin',
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
assert(allFills.filter((e) => e.div === 8).every((e) => (e.every ?? 1) >= 4),
  'and a 32nd stays the rarest figure — no more than once every four loops');
let cadenceThrew = false;
try {
  validateBeatChart({ loopBeats: 2, events: [
    { slot: 0, action: 'jump', type: 'beatBar', every: 2 }, { slot: 1, action: 'coin' },
  ] }, { bpm });
} catch { cadenceThrew = true; }
assert(cadenceThrew, 'only a coin fill may skip loops — a skipped jump would desync the judge');

// ---- THE CARD BOX ----------------------------------------------------------
// The shootable prop, and the only entity in the game whose destruction is
// quantized. Everything here is arithmetic on the two constants, so it holds at
// any tempo and for every weapon in the cast.
{
  const boxes = [];
  for (const [id, chart] of Object.entries(beatCharts)) {
    const own = chart.events.filter((e) => e.action === 'ability' && e.type === 'cardBox');
    boxes.push(...own);
    assert(own.length === 1, `rhythm-${id} deals exactly one card box a loop (${own.length})`);
    // OCCASIONAL, and that is a design claim rather than a taste: a box every
    // loop would make the ability button part of the stage's baseline.
    assert(own.every((e) => (e.every ?? 1) >= 2),
      `rhythm-${id} keeps the box to at most every other loop`);
    // The burst lands BOX_BURST_BEATS on, and a hole on that line would put the
    // box in the void — the validator refuses it, and no authored chart tries.
    assert(own.every((e) =>
      chart.events[(e.slot + BOX_BURST_BEATS) % chart.loopBeats].action !== 'pit'),
    `rhythm-${id} opens its box over road, not over a hole`);
  }
  assert(boxes.length === 3, 'every stage in the cabinet deals the box');

  // THE FUSE IS LONG ENOUGH FOR THE SLOWEST GUN AND SHORT ENOUGH TO STAY A
  // FUSE. Flight time in beats is LEAD * speed / (speed + shot), which is why
  // the spread exists at all: the rounds are not the same speed. Checked
  // against both ends of the cast, at both ends of the speed range the cabinet
  // is ever run at, with a late press on top.
  const shots = [
    ['kiko + REASONABLE FORCE', 170 * 0.72],
    ['kiko', 170],
    ['grumpos (axe)', 220],
    ['b33p', 260],
    ['clara', 340],
    ['clara + SERIALIZED', 340 * 1.25],
  ];
  for (const sp of [208, 232]) {
    for (const [who, shot] of shots) {
      const flight = BOX_LEAD_BEATS * sp / (sp + shot);
      assert(flight + ON_BEAT_WINDOW < BOX_BURST_BEATS,
        `${who}'s round reaches the box before it opens at ${sp}px/s `
        + `(${flight.toFixed(2)} + ${ON_BEAT_WINDOW} < ${BOX_BURST_BEATS})`);
    }
  }
  // WHO IS DEALT ONE AT ALL. Four heroes, and the boundary is a range decision:
  // a thrown weapon parks after a fixed FLIGHT TIME, and the rocket fist's
  // 0.42s does not cover the box's lead at this cabinet's speed. See
  // RANGED_ABILITY_TYPES.
  for (const [id, can] of [['b33p', true], ['clara', true], ['kiko', true], ['grumpos', true],
    ['raymn', false], ['lorenzo', false], ['gnash', false], ['fernwick', false]]) {
    assert(heroShoots(id) === can,
      `${id} is ${can ? '' : 'not '}dealt a card box`);
  }
  // The cabinet's own lane speed: BASE_SPEED 160 times RHYTHM BANKRUPTCY's 1.3.
  // A thrown weapon parks after a fixed flight TIME, so its reach in pixels is
  // (lane + throw) times that time, against a box standing BOX_LEAD_BEATS out.
  {
    const sp = 208;
    const lead = BOX_LEAD_BEATS * (sp * 60 / bpm) - 12;   // muzzle sits 12px ahead of the hero
    assert((sp + 220) * 0.55 >= lead,
      `the axe reaches the box it is thrown at (${((sp + 220) * 0.55).toFixed(0)} >= ${lead.toFixed(0)}px)`);
    assert((sp + 210) * 0.42 < lead,
      `and the rocket fist would stop ${(lead - (sp + 210) * 0.42).toFixed(0)}px short, which is why it is excluded`);
  }
  // And the box is still IN FRONT of the hero when it goes, or the explosion
  // happens behind him.
  assert(BOX_LEAD_BEATS > BOX_BURST_BEATS,
    `the box stands ${(BOX_LEAD_BEATS - BOX_BURST_BEATS).toFixed(1)} of a beat past the hero when it opens`);
}
let boxTypeThrew = false;
try {
  validateBeatChart({ loopBeats: 2, events: [
    { slot: 0, action: 'ability', type: 'crate' }, { slot: 1, action: 'coin' },
  ] }, { bpm });
} catch { boxTypeThrew = true; }
assert(boxTypeThrew, 'an ability slot may only name a prop built to be shot on a grid');
let bareCadenceThrew = false;
try {
  validateBeatChart({ loopBeats: 2, events: [
    { slot: 0, action: 'ability', every: 2 }, { slot: 1, action: 'coin' },
  ] }, { bpm });
} catch { bareCadenceThrew = true; }
assert(bareCadenceThrew, 'a bare ability marker has no box to skip');
let boxOverPitThrew = false;
try {
  validateBeatChart({ loopBeats: 4, events: [
    { slot: 0, action: 'ability', type: 'cardBox' }, { slot: 1, action: 'coin' },
    { slot: 2, action: 'pit' }, { slot: 3, action: 'coin' },
  ] }, { bpm });
} catch { boxOverPitThrew = true; }
assert(boxOverPitThrew, 'the validator refuses a box that would open over a hole');
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
const firstAction = Math.min(...obstacles.map((o) => o.actionBeat));
const firstCoin = Math.min(...pickups.map((p) => p.actionBeat));
assert(firstAction >= PIT_LANE_RUNWAY_BEATS,
  'no input-asking event is laid inside the runway a hole-cutting chart is given');
assert(firstCoin === 1,
  'but the runway is not bare — its coin slots are laid from one beat out');
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
  const fillId = beatEventId(5, beatCharts[1].events[5]);
  const fill = pickups.filter((pk) => pk.formationId === fillId)
    .sort((a, b) => a.x - b.x);
  assert(fill.length === 4, `the slot-5 fill lays four coins (got ${fill.length})`);
  assert(fill.every((pk, i) => i === 0
    || Math.abs((pk.x - fill[i - 1].x) - pxPerBeat / COIN_DIV) < 1e-6),
    'and lays them exactly a sixteenth of a beat apart');
  assert(fill.every((pk, i) => i === 0
    || Math.abs((pk.actionBeat - fill[i - 1].actionBeat) - 1 / COIN_DIV) < 1e-9),
    'and exposes those same even subdivisions to the beat ribbon');
  const ribbonXs = fill.map((pk) => beatRibbonOffset(pk.actionBeat, 4.5));
  assert(ribbonXs.every((x, i) => i === 0
    || Math.abs((x - ribbonXs[i - 1]) - RIBBON_BEAT_PX / COIN_DIV) < 1e-9),
  'the ribbon keeps a coin fill evenly spaced in musical coordinates');
  // A hundredth of a beat is a fraction of a pixel at any scale the strip is
  // ever drawn at, so this stays a sub-pixel step whatever RIBBON_SCALE says.
  const step = beatRibbonOffset(5, 4.51) - beatRibbonOffset(5, 4.5);
  assert(Math.abs(step + RIBBON_BEAT_PX / 100) < 1e-9 && Math.abs(step) < 1,
    'the ribbon advances by fractional pixels instead of whole-pixel steps');
  const fillTiming = spawner.eventInstances.filter((e) => e.formationId === fillId)
    .sort((a, b) => a.actionBeat - b.actionBeat);
  assert(fillTiming.length === fill.length
    && fillTiming.every((e, i) => e.actionBeat === fill[i].actionBeat),
  'the ribbon owns a timing copy of every coin subdivision');
  // Collection is allowed to take several overlapping pickups in one physics
  // frame. It must not take their later clock ticks with them: immediately
  // after the first sixteenth, only the ticks whose own time has passed retire.
  for (const pk of fill) pk.live = false;
  const afterFirstTick = fillTiming.map((e) =>
    beatRibbonMarkerOffset('coin', e.actionBeat, fill[0].actionBeat + 0.07));
  assert(afterFirstTick.filter((x) => x != null).length === fill.length - 1,
    `a collected fill retires subdivision-by-subdivision instead of vanishing as a bunch `
    + `(got ${afterFirstTick.filter((x) => x != null).length}/${fill.length})`);
  assert(beatRibbonMarkerOffset('jump', 5, 5.1, false) != null
    && beatRibbonMarkerOffset('jump', 5, 5.1, true) == null,
  'mandatory markers keep their missed trail but still retire when judged');
  // A late-authored set piece sees the same formation identifier the chart
  // does. It preserves the whole run in view, and removes the whole run when
  // it can still do so invisibly.
  const visibleFill = fill.map((pk) => ({ ...pk, live: true }));
  sweepCoinsAroundHole(visibleFill, fill[1].x, 2, 0,
    { x: fill[0].x - 1, w: fill.at(-1).x - fill[0].x + 10 });
  assert(visibleFill.every((pk) => pk.live),
    'a late set piece cannot erase a visible chart fill');
  const hiddenFill = fill.map((pk) => ({ ...pk, live: true }));
  sweepCoinsAroundHole(hiddenFill, fill[1].x, 2, 0, { x: 0, w: 10 });
  assert(hiddenFill.every((pk) => !pk.live),
    'an off-screen set piece removes a chart fill whole');
  // ...and on an odd pass the same slot is one coin on the line. `every: 2`.
  const quiet = pickups.filter((pk) => pk.chartSlot === 5 && pk.actionBeat === 21);
  assert(quiet.length === 1, `the slot-5 fill rests on the odd pass (got ${quiet.length})`);
  const rareId = beatEventId(15, beatCharts[1].events[15]);
  const rare = pickups.filter((pk) => pk.formationId === rareId);
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
// The runway's own coins may stand short of the wall; nothing may straddle it,
// and no slot is admitted in part.
assert(blockedObs.length === 0 && blockedPickups.every((p) => p.x + 8 <= 300),
  'finish wall treats the next chart event as an all-or-nothing boundary');

// ---- THE LANE LAYS A BOX ONLY FOR A HERO WHO CAN ANSWER IT -----------------
// Both halves of the contract, on the same chart and the same clock: the box
// stands BOX_LEAD_BEATS down the road stamped with the beat the SHOT is asked
// on, and a lane running for a hero with no weapon lays neither the box nor the
// instance the judge reads its demand off (RunState.rhythmRequiredAt).
{
  const armedObs = [], armedPickups = [];
  const armed = new BeatSpawner({
    chart: beatCharts[1], bank: { bpm }, beatNow: () => 0,
    playerWorldX: (x) => x + 56, lookaheadBeats: 10, canShoot: () => true,
  });
  armed.fill(0, speed, armedObs, armedPickups, () => 50);
  const box = armedObs.find((o) => o.type === 'cardBox');
  assert(box && box.chartAction === 'ability' && box.chartSlot === 7,
    'a shooter gets the card box its chart slot promises');
  assert(box && box.actionBeat === 7,
    'and it carries the beat the SHOT is asked on, not the beat it stands on');
  assert(box && Math.abs(box.x - (box.actionX + BOX_LEAD_BEATS * pxPerBeat)) < 1e-6,
    `the box stands ${BOX_LEAD_BEATS} beats past the input, so its burst lands ahead of the hero`);
  assert(armed.eventInstances.some((e) => e.chartAction === 'ability' && e.actionBeat === 7),
    'and the lane records the slot it laid, which is what the judge scores against');

  const bareObs = [], barePickups = [];
  const bare = new BeatSpawner({
    chart: beatCharts[1], bank: { bpm }, beatNow: () => 0,
    playerWorldX: (x) => x + 56, lookaheadBeats: 10, canShoot: () => false,
  });
  bare.fill(0, speed, bareObs, barePickups, () => 50);
  assert(!bareObs.some((o) => o.type === 'cardBox'),
    'a hero with no weapon is never handed a box to shoot');
  assert(!bare.eventInstances.some((e) => e.chartAction === 'ability'),
    'and is owed nothing for the beat, so the combo survives a slot they cannot play');
  // Everything else about the loop is untouched — the box is an addition to the
  // lane, not a fork in it.
  assert(bareObs.filter((o) => o.type === 'beatBar').length
    === armedObs.filter((o) => o.type === 'beatBar').length,
  'and the rest of the chart is identical either way');
}

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
  assert(!retryRun.rhythmHeroVisible(),
    'the restored hero stays hidden during the rhythm settling hold');
  retryRun.rhythmSyncT = 0.12;
  assert(retryRun.rhythmHeroVisible(),
    'the restored hero appears in the final split-second before control returns');
  retryRun.rhythmSyncT = 1;
  for (let i = 0; i < 30; i++) retryRun.update(1 / 60);
  assert(retryRun.rhythmSyncPending && retryRun.distance === 0,
    'the retry hold keeps the world still while the song continues');
  for (let i = 0; i < 40; i++) retryRun.update(1 / 60);
  assert(!retryRun.rhythmSyncPending && retryRun.distance > 0,
    'the retry resumes only after an atomic beat re-anchor');
  Audio.songBeat = oldSongBeat;
  Audio.sourceBank = oldSourceBank;
}

// ---- THE CARD BOX, PLAYED --------------------------------------------------
// The two guarantees the mechanic actually makes, exercised on a real run: a
// slot played on the beat opens its box on the beat, whichever of the four
// weapons is in the lane; and a hero who owns none of them is never asked.
{
  const oldSourceBank = Audio.sourceBank;
  const oldSongBeat = Audio.songBeat;
  const stage = STAGES.find((s) => s.id === 'rhythm-1');
  const loopBeats = beatCharts[1].loopBeats;

  for (const [hero, mod] of [['b33p', null], ['clara', 'serial'], ['kiko', 'force'], ['grumpos', null]]) {
    save.load(); save.newSlot(0, 0);
    const run = new RunState({ stage, save, seed: 7, skipRunIn: true, devInvuln: true, onEnd: () => {} });
    run.enter();
    if (mod) run.modIds.push(mod);
    Audio.sourceBank = run.cabinet.music;
    let songTime = 0;
    Audio.songBeat = () => ((songTime * bpm / 60) % loopBeats);
    run.relay.current = hero;
    let box = null, fired = false, litAt = null, burstAt = null;
    for (let i = 0; i < 60 * 40; i++) {
      songTime += 1 / 60;
      run.update(1 / 60);
      const b = run.rhythmBeatForJudging();
      if (!box) box = run.obstacles.find((o) => o.type === 'cardBox' && o.live) || null;
      if (!fired && box && Math.abs(b - box.actionBeat) < 0.01) {
        run.player.abilityCd = 0;
        if (run.useAbility() && run.checkOnBeat('ability')) run.lightChartBoxOnBeat();
        fired = true;
      }
      if (box && litAt == null && box.burstBeat != null) litAt = b;
      if (box && !box.live && burstAt == null) { burstAt = b; break; }
    }
    const who = mod ? `${hero} + ${mod.toUpperCase()}` : hero;
    assert(box && fired, `${who} is dealt a card box and can play its slot`);
    // ARMED BY THE PRESS, not by the arrival: the fastest and slowest weapons in
    // the cast light the box on the same beat as each other.
    assert(litAt != null && Math.abs(litAt - box.actionBeat) < 0.06,
      `${who} lights the box on the beat they pressed (${litAt?.toFixed(2)} vs ${box.actionBeat})`);
    assert(box.burstBeat === box.actionBeat + BOX_BURST_BEATS,
      `${who}'s box is owed beat ${box.actionBeat + BOX_BURST_BEATS}`);
    assert(burstAt != null && Math.abs(burstAt - box.burstBeat) < 0.06,
      `${who}'s box opens on that beat and not a frame's drift off it (${burstAt?.toFixed(2)})`);
    assert(run.beatCombo === 1, `${who} is paid the on-beat credit for it`);
  }

  // And the other half of the contract: a hero with no ranged answer meets no
  // box, and the beat they cannot play does not cost them the combo they built.
  for (const hero of ['lorenzo', 'raymn']) {
    save.load(); save.newSlot(0, 0);
    const run = new RunState({ stage, save, seed: 7, skipRunIn: true, devInvuln: true, onEnd: () => {} });
    run.enter();
    Audio.sourceBank = run.cabinet.music;
    let songTime = 0;
    Audio.songBeat = () => ((songTime * bpm / 60) % loopBeats);
    run.relay.current = hero;
    let sawBox = false, broke = false;
    for (let i = 0; i < 60 * 12; i++) {
      songTime += 1 / 60;
      run.update(1 / 60);
      const b = run.rhythmBeatForJudging();
      if (run.obstacles.some((o) => o.type === 'cardBox' && o.live)) sawBox = true;
      // Held across the box's own beat only; every other slot on this chart is
      // a jump this harness never makes.
      if (b > 6.5 && b < 7.9) { if (run.beatCombo < 5) broke = true; } else run.beatCombo = 5;
      if (b > 9) break;
    }
    assert(!sawBox, `${hero} is never handed a box they cannot open`);
    assert(!broke, `and keeps their combo through the slot the chart wrote for someone else`);
  }
  Audio.songBeat = oldSongBeat;
  Audio.sourceBank = oldSourceBank;
}

// A STALLED FRAME IS NOT DRIFT. The fixed-step loop repays a long callback with
// catch-up steps against a frozen audio clock, so the drift check must sum the
// mismatch across them rather than judge the first step alone — judging one
// step latched a full lane rebuild (visible coins and bars blinking out, then a
// four-beat empty runway) on every GC pause and every checkpoint's own
// snapshot-and-sfx work. And when a REAL discontinuity does resync the lane,
// the re-anchored beat numbering repeats numbers the judge has already
// consumed, so the stale ids must go with it — they were hiding the ribbon's
// jump arrows and refusing combo credit for whole loops after every resync.
{
  save.load(); save.newSlot(0, 0);
  const oldSourceBank = Audio.sourceBank;
  const stage = STAGES.find((s) => s.id === 'rhythm-2');
  const run = new RunState({ stage, save, seed: 19, skipRunIn: true, devInvuln: true, onEnd: () => {} });
  run.enter();
  Audio.sourceBank = run.cabinet.music;
  const loopBeats = run.spawner.chart.loopBeats;
  let songTime = 0;
  Audio.songBeat = () => ((songTime * 124 / 60) % loopBeats);
  let resyncs = 0;
  const origReset = run.resetRhythmLane.bind(run);
  run.resetRhythmLane = (...a) => { resyncs++; return origReset(...a); };
  const TICK = 1 / 60;
  // The audio clock advances by the callback's wall gap; the sim then catches
  // up in fixed steps inside that same callback, exactly as engine/loop.js runs.
  const frameOf = (gapSec, steps) => {
    songTime += gapSec;
    for (let i = 0; i < steps; i++) run.update(TICK);
  };
  for (let i = 0; i < 1500; i++) frameOf(TICK, 1); // ~25s: the loop wraps, epochs grow
  const tracked = run.pickups.filter((p) => p.live && p.chartAction === 'coin'
    && p.x > run.playerWorldX() + 120);
  frameOf(0.1, 6);  // a 100ms stall, fully repaid in-callback
  frameOf(0.05, 3); // a 50ms stall
  assert(resyncs === 0, 'stalled frames with catch-up never rebuild the beat lane');
  assert(tracked.length > 0 && tracked.every((p) => p.live),
    `every chart coin ahead of the hero survives a stalled frame (${tracked.length} tracked)`);
  // Genuinely dropped time — the loop's 8-step cap leaves the world behind the
  // song for good — must still be confirmed and resynced, exactly once.
  frameOf(0.5, 8);
  for (let i = 0; i < 30; i++) frameOf(TICK, 1);
  assert(resyncs === 1, `dropped time is confirmed and resynced once (${resyncs})`);
  for (let i = 0; i < 400; i++) frameOf(TICK, 1); // relay the lane past the runway
  const heard = run.rhythmBeatForJudging();
  const upcoming = run.obstacles.filter((ob) => ob.live && ob.chartAction
    && Number.isFinite(ob.actionBeat) && ob.actionBeat > heard);
  assert(upcoming.length > 0, 'the lane is relaid past the resync runway');
  assert(upcoming.every((ob) => !run.beatJudgeConsumed.has(`judge:${Math.round(ob.actionBeat)}:${ob.chartSlot}`)),
    'no upcoming ribbon arrow is hidden by a consumed id from before the resync');
  run.beatCombo = 5;
  for (let i = 0; i < 300; i++) frameOf(TICK, 1);
  assert(run.beatCombo === 0, 'missed beats after a resync still reset the combo');

  // A PORTAL ON A BEAT LANE. The sweep deletes what shares the portal's pixels,
  // and on a beat lane two of those deletions used to lie: a swept BAR left the
  // judge demanding a jump with no bar and no arrow (an unavoidable combo
  // break), and the narrow column bit two coins out of the middle of a fill.
  // The sweep now consumes the swept bar's beat and takes coin runs whole,
  // ribbon ticks included.
  {
    const view = () => run.camX + 480 / run.camZoom;
    const bar = run.obstacles.find((ob) => ob.live && ob.chartAction
      && ob.def.action !== 'none' && ob.x > view() + 60);
    assert(!!bar, 'a live chart bar stands off-view for the portal to sweep');
    if (bar) {
      run.clearPortalLane(bar.x + 20);
      assert(!bar.live, 'the portal sweeps the bar that shares its approach');
      assert(run.beatJudgeConsumed.has(`judge:${Math.round(bar.actionBeat)}:${bar.chartSlot}`),
        'and consumes its beat so the judge never demands the bar it deleted');
    }
    // A multi-coin fill is laid on its slot's cadence, so walk forward until
    // one stands off-view.
    let fillCoin = null;
    for (let i = 0; i < 1200 && !fillCoin; i++) {
      frameOf(TICK, 1);
      fillCoin = run.pickups.find((p) => p.live && p.chartAction === 'coin'
        && p.x > view() + 60
        && run.pickups.filter((q) => q.live && q.formationId === p.formationId).length > 1);
    }
    assert(!!fillCoin, 'a live off-view coin fill stands for the portal to sweep');
    if (fillCoin) {
      const members = run.pickups.filter((q) => q.formationId === fillCoin.formationId);
      run.clearPortalLane(fillCoin.x);
      assert(members.every((q) => !q.live),
        `the portal takes the whole fill, never a bite out of it (${members.length} coins)`);
      assert(run.spawner.eventInstances.every((e) => e.formationId !== fillCoin.formationId || !e.live),
        'and retires the fill\'s ribbon ticks with it');
    }
  }
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

// ---- THE DUCK COLUMN --------------------------------------------------------
// A lone drone was never a duck. Its box tops out at 20 and the shortest jump
// in the cast reaches 46, so a duck slot could be answered with the jump button
// by every hero in the game. A column of three reaches 50 and takes that away
// from the two heaviest. These assertions are the arithmetic that number rests
// on, checked against the real cast rather than restated as a constant.
{
  // Feet-height at the top of a full jump, per hero. `heavy` is a GRAVITY
  // multiplier rather than a jump one, which is why jumpHeightFor (which does
  // not know about it) cannot be used here: Grumpos jumps at mult 1.0 and still
  // only reaches 46.
  const apex = (hero) => (BASE_JUMP_V * hero.jumpMult) ** 2
    / (2 * GRAVITY * (hero.heavy ? HEAVY_GRAVITY_MULT : 1));
  const drone = OBSTACLES.drone;
  const top = DRONE_COLUMN_ALTS[DRONE_COLUMN_ALTS.length - 1] + drone.h;
  const heroes = Object.values(HEROES);
  const denied = heroes.filter((h) => apex(h) < top);
  const cleared = heroes.filter((h) => apex(h) >= top);
  assert(top === 50, `the column tops out at 50 (got ${top})`);
  assert(denied.length === 2 && denied.every((h) => h.id === 'b33p' || h.id === 'grumpos'),
    `exactly B-33P and Grumpos cannot jump the column (got ${denied.map((h) => h.id).join()})`);
  // MARGIN, not a coincidence. A ceiling level with somebody's apex is a
  // coin-flip on a pixel rather than a decision, so the column has to stand
  // clear of the table in BOTH directions — see the rung note in entities.js
  // for why that leaves 50 and nothing else.
  assert(denied.every((h) => top - apex(h) >= 3),
    'and it stands clear of their apex rather than level with it');
  assert(cleared.every((h) => apex(h) - top >= 3),
    'while everyone who clears it clears it by a real margin');

  // THE GAPS ARE NOT DOORS. An airborne hero is PLAYER_H tall — jumpPressed
  // clears `ducking` and mid-air Down is a slide-slam, so the box never shrinks
  // in the air — and every gap here is smaller than that. Nothing can be
  // threaded between the rungs, which is what makes the height honest.
  const gaps = DRONE_COLUMN_ALTS.slice(1)
    .map((alt, i) => alt - (DRONE_COLUMN_ALTS[i] + drone.h));
  assert(gaps.every((g) => g > 0), 'the rungs are spaced rather than touching');
  assert(gaps.every((g) => g < PLAYER_H),
    `no rung gap is a hole an airborne hero fits through (${gaps.join()} < ${PLAYER_H})`);
  // The bottom rung IS the duck contract: it has to sit where a slide clears it
  // and a stand does not, which is the drone's own authored altitude and not a
  // number this ladder gets to choose.
  assert(DRONE_COLUMN_ALTS[0] === drone.alt,
    'the bottom rung keeps the drone\'s own altitude');

  const column = makeDroneColumn(400);
  assert(column.length === DRONE_COLUMN_ALTS.length
    && column.every((ob, i) => ob.alt === DRONE_COLUMN_ALTS[i]),
    'makeDroneColumn stacks one body per rung');
  // TWO RUNGS IS THE FORGIVING ONE, and the arithmetic says so rather than the
  // comment: a pair stops short of every apex in the cast, so it reads as a
  // stack without taking the jump away. That is what makes it the teach.
  const pair = makeDroneColumn(400, 2);
  const pairTop = DRONE_COLUMN_ALTS[1] + drone.h;
  assert(pair.length === 2 && pair[0].alt === DRONE_COLUMN_ALTS[0],
    'a two-rung column is the bottom of the same ladder');
  assert(heroes.every((h) => apex(h) > pairTop),
    `and every hero in the cast can still jump it (top ${pairTop})`);
  assert(column.every((ob) => ob.x === 400 && ob.w === drone.w && ob.def.action === 'duck'),
    'every rung shares the column\'s X and asks for the same input');
  assert(column.every((ob) => ob.bobPhase === column[0].bobPhase && ob.skin === column[0].skin),
    'and shares its bob phase and body, so the stack moves as one machine');
  assert(column.filter((ob) => !ob.columnRung).length === 1,
    'exactly one rung marks the lane, so the shadow is not painted three times');
}
{
  // The lane end of it: a `column: true` slot arrives as three boxes carrying
  // ONE event, which is what lets the judge, the ribbon and the portal sweep go
  // on treating a duck beat as a single thing.
  let beat = 0;
  const obs = [], picks = [];
  const columnSpawner = new BeatSpawner({
    chart: beatCharts[3], bank: { bpm }, beatNow: () => beat,
    playerWorldX: (x) => x + 56, lookaheadBeats: 7,
  });
  for (let i = 0; i <= 40; i++) {
    beat = i;
    columnSpawner.fill(beat * pxPerBeat, speed, obs, picks, () => 50);
  }
  const ducks = obs.filter((o) => o.chartAction === 'duck');
  assert(ducks.length > 0 && ducks.every((o) => o.type === 'drone'),
    'the finale lays drones on its duck beats');
  const byEvent = new Map();
  for (const o of ducks) byEvent.set(o.chartEventId, [...(byEvent.get(o.chartEventId) || []), o]);
  assert([...byEvent.values()].every((g) => g.length === DRONE_COLUMN_ALTS.length),
    'every duck slot on the finale reaches the lane as a full column');
  assert([...byEvent.values()].every((g) => g.every((o) =>
    o.x === g[0].x && o.actionBeat === g[0].actionBeat && o.chartSlot === g[0].chartSlot)),
    'and its rungs share one X, one beat and one slot');
  assert([...byEvent.values()].every((g) =>
    g.map((o) => o.alt).sort((a, b) => a - b).join() === DRONE_COLUMN_ALTS.join()),
    'stacked at the authored altitudes');

  // Stage 2 teaches with a LONE drone before it asks with a column. The escape
  // hatch on the first one the player ever meets is the point of it.
  const teach = beatCharts[2].events.filter((e) => e.action === 'duck');
  assert(teach.length === 2 && teach[0].column === 2 && teach[1].column === 3,
    'stage 2 teaches with two rungs and answers with three');
  assert(beatCharts[3].events.filter((e) => e.action === 'duck').every((e) => e.column === 3),
    'and the finale asks for the slide on every duck beat it has');
  // NO LONE DRONES ON THE CABINET. One drone is a duck beat that can be
  // answered with the jump button, which is the whole thing this replaced.
  for (const [id, chart] of Object.entries(beatCharts)) {
    assert(chart.events.filter((e) => e.action === 'duck').every((e) => e.column >= 2),
      `rhythm-${id} lays no lone drone on a duck beat`);
  }
}
{
  // A column is the duck's and the drone's alone.
  const refuses = (events, why) => {
    let threw = false;
    try { validateBeatChart({ loopBeats: events.length, events }); } catch { threw = true; }
    assert(threw, why);
  };
  refuses([{ slot: 0, action: 'jump', type: 'beatBar', column: 3 }, { slot: 1, action: 'coin' }],
    'the validator refuses a column on a jump slot');
  refuses([{ slot: 0, action: 'duck', type: 'drone', column: 4 }, { slot: 1, action: 'coin' }],
    'and refuses a rung nobody measured a jump against');
  refuses([{ slot: 0, action: 'duck', type: 'drone', column: true }, { slot: 1, action: 'coin' }],
    'and refuses a column that will not say how tall it is');
  const ok = validateBeatChart({ loopBeats: 2, events: [
    { slot: 0, action: 'duck', type: 'drone', column: 3 }, { slot: 1, action: 'coin' },
  ] });
  assert(ok.events[0].column === 3, 'but carries an honest one through to the lane');
}

let reads = 0;
const fakeRng = { float: () => { reads++; return 0.45; }, pick: (xs) => { reads++; return xs[0]; } };
const banned = randomPowerPickup(fakeRng, null, { allowRewind: false,
  banned: new Set(['capSpeed', 'capLowGrav', 'capRewind', 'capUnpeel']) });
assert(banned === 'capShield' || banned === 'capMagnet', 'banned power bands map deterministically to safe powers');
assert(reads === 1, 'pickup banning preserves the single normal RNG read');
let invincibilityBandReads = 0;
const invincibilityBand = randomPowerPickup({ float: () => { invincibilityBandReads++; return 0.12; } }, null,
  { allowRewind: false, banned: new Set(['capUnpeel']) });
assert(invincibilityBand === 'capShield' || invincibilityBand === 'capMagnet',
  'the UNPEELABLE invincibility band maps to a safe power on rhythm stages');
assert(invincibilityBandReads === 1, 'invincibility banning does not add an RNG read');
const rhythmBannedDrops = new Set([
  'capSpeed', 'capLowGrav', 'capRewind', 'capMagnet', 'capUnpeel', 'capStar',
]);
const rhythmDrops = Array.from({ length: 1000 }, (_, i) => randomPowerPickup({
  float: () => (i + 0.5) / 1000,
  pick: (xs) => xs[i % xs.length],
}, null, { allowRewind: false, banned: rhythmBannedDrops }));
assert(rhythmDrops.every((type) => !rhythmBannedDrops.has(type)),
  'every random-power roll is free of invincibility and all other rhythm-banned capsules');
let rewindBandReads = 0;
const rewindBand = randomPowerPickup({ float: () => { rewindBandReads++; return 0.2; } }, null,
  { allowRewind: true, banned: new Set(['capRewind']) });
assert(rewindBand === 'capShield' || rewindBand === 'capMagnet', 'the banned rewind band maps to a safe power');
assert(rewindBandReads === 1, 'rewind-band mapping does not add an RNG read');

console.log(failed ? 'BEAT-CHART: FAILED' : 'BEAT-CHART: PASSED');
process.exit(failed ? 1 : 0);
