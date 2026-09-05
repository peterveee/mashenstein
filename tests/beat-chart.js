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
  LANE_RUNWAY_BEATS, PIT_LANE_RUNWAY_BEATS, COIN_DIV, OPENING_COIN_BEAT,
  BOX_LEAD_BEATS, BOX_BURST_BEATS, BOX_SHOT_MIN_SPEED, puntLeadSec, puntLeadRange,
  unwrapBeat,
} = await import('../src/game/beatchart.js');
const { worstAirtime, sweepCoinsAroundHole } = await import('../src/game/spawner.js');
const { randomPowerPickup } = await import('../src/game/powerups.js');
const { beatRibbonOffset, beatRibbonMarkerOffset, RIBBON_BEAT_PX } = await import('../src/game/hud.js');
const { RunState } = await import('../src/game/run.js');
const { W } = await import('../src/engine/renderer.js');
const { STAGES } = await import('../src/data/stages.js');
const { save } = await import('../src/engine/save.js');
const { HEROES, heroShoots } = await import('../src/data/heroes.js');
const { OBSTACLES, DRONE_COLUMN_ALTS, makeDroneColumn } = await import('../src/game/entities.js');
const { PLAYER_H, PLAYER_W, DUCK_IN_T, jumpHeightFor }
  = await import('../src/game/player.js');
const { PUNT, puntPower } = await import('../src/game/punt.js');

const speed = 232, bpm = 124, pxPerBeat = speed * 60 / bpm;
let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// A FIXTURE TRANSPORT THAT FOLLOWS THE LANE'S TEMPO.
//
// The real one does — Audio.songBeat divides by `bpm * tempo` — and a beat
// stage steps its tempo up at every checkpoint (run.js
// stages.js `bpmRamp`). So beats are ACCUMULATED at whatever the run is
// being played at rather than derived from an elapsed time and one constant: a
// fixture that does the latter hands the lane a clock the music is not playing,
// which is precisely the mismatch checkRhythmDrift exists to catch, invented by
// the harness. Returns the advance function; installing the stub is its job.
function installBeatClock(run, loopBeats, startBeat = 0) {
  let beats = startBeat;
  Audio.songBeat = () => (beats % loopBeats);
  return (dt) => { beats += dt * run.laneBpm() / 60; };
}

const expected = {
  1: 'jump,coin,jump,coin,coin,coin,jump,ability,coin,coin,pit,coin,pit,coin,coin,coin',
  2: 'duck,coin,jump,ability,coin,pit,coin,pit,coin,duck,jump,coin,pit,coin,pit,coin',
  3: 'coin,coin,duck,coin,duck,coin,duck,ability,coin,pit,coin,pit,coin,pit,coin,pit',
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
  assert(runs.every((e) => (e.run - 1) / e.div < 1),
    `rhythm-${id} keeps every fill inside its own beat`);
  // PAIRS ARE THE GROUND. A coin on its own is a tick rather than a figure, so
  // the only single ones left are the ones physics insists on: the slot on the
  // beat before a hole, where a pair's second coin would land inside the
  // clearance COIN_RUN_PIT_CLEAR_SEC keeps in front of a lip.
  const coins = chart.events.filter((e) => e.action === 'coin');
  const lone = coins.filter((e) => (e.run ?? 1) === 1);
  const nextOf = (e) => chart.events[(e.slot + 1) % chart.loopBeats];
  assert(lone.every((e) => nextOf(e).action === 'pit'),
    `rhythm-${id} plays coins in pairs or better, bar the ${lone.length} a hole forces single`);
  // ...AND SOMETHING COUNTS YOU IN: a sixteenth run closing on a beat you have
  // to answer is how a rhythm game says where the one is. At least one a loop,
  // and never every one of them — four coins a quarter-beat apart is a lot of
  // gold arriving at speed, and a lane that plays the flourish into every
  // hazard has made it the ground rather than the flourish.
  const leadIns = coins.filter((e) => ['jump', 'duck'].includes(nextOf(e).action));
  assert(leadIns.some((e) => (e.div ?? 1) >= 4),
    `rhythm-${id} counts you into an action with a sixteenth (${leadIns.length} lead-ins)`);
  const eighths = coins.filter((e) => e.div === 2).length;
  const sixteenths = coins.filter((e) => e.div === 4).length;
  assert(sixteenths <= eighths,
    `rhythm-${id} keeps pairs the ground and sixteenths the flourish (${eighths} to ${sixteenths})`);
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
assert(allFills.filter((e) => e.div === 8).every((e) => (e.every ?? 1) >= 2),
  'and a 32nd stays the rarest figure — never two loops running');

// ---- A PORTAL MAY NOT STAND ON A BEAT THE CHART HAS SPOKEN FOR ---------------
//
// The tag parks on the grid so its sound lands in the song rather than near it,
// and the grid is also where the hazards are. A doorway on the same beat as a
// bar asks the player to run through a line at ground level and leave the
// ground for a thing in the same stride — you cannot have both, so one of the
// two promises breaks and neither of them was the player's fault.
{
  for (const id of Object.keys(beatCharts)) {
    const stage = STAGES.find((st) => st.id === `rhythm-${id}`);
    save.load(); save.newSlot(0, 0);
    const run = new RunState({ stage, save, seed: 5, skipRunIn: true, onEnd: () => {} });
    run.enter();
    const chart = beatCharts[id];
    const slotOf = (n) => chart.events[((n % chart.loopBeats) + chart.loopBeats) % chart.loopBeats];
    let worst = 0;
    const busy = [];
    for (let wanted = 0; wanted < chart.loopBeats * 2; wanted++) {
      const parked = run.portalParkBeat(wanted);
      if (slotOf(parked).action !== 'coin') busy.push(`${wanted}->${parked}`);
      worst = Math.max(worst, parked - wanted);
    }
    assert(busy.length === 0,
      `rhythm-${id} never parks a portal on an action beat${busy.length ? ` (${busy.join(', ')})` : ''}`);
    // ...and it does not wander to find one. A portal is due every eighteen
    // seconds; a beat cabinet at 124 spends a third of a second a beat, so the
    // hunt has to be bounded or the tag drifts out of the phrase it was due in.
    assert(worst <= 4, `and never moves it more than a bar to do so (worst ${worst} beats)`);
  }
}

// ---- AND THE LANE PAYS ------------------------------------------------------
//
// A floor rather than a number, because the charts are tuned by ear and the
// stage lengths are not this file's business: what has to hold is that a stage
// of this cabinet is worth running for the coins as well as the combo. The old
// charts dealt about a hundred over ninety seconds — a coin every second, most
// of them alone — and the missions ask for thirty.
{
  const { STAGE_LAYOUTS } = await import('../src/data/stage-layouts.js');
  const { bank } = await import('../src/data/songs/rhythm.js');
  const FLOOR = 120;
  for (const [id, chart] of Object.entries(beatCharts)) {
    const loops = STAGE_LAYOUTS[`rhythm-${id}`].durationSec / (chart.loopBeats * 60 / bank.bpm);
    const paid = chart.events.filter((e) => e.action === 'coin')
      .reduce((n, e) => n + (e.run ?? 1) * loops / (e.every ?? 1), 0);
    assert(paid >= FLOOR, `rhythm-${id} lays ${Math.round(paid)} coins over its ${
      STAGE_LAYOUTS[`rhythm-${id}`].durationSec}s (floor ${FLOOR})`);
  }
}
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
    // The burst lands BOX_BURST_BEATS on with the box standing half a beat past
    // that line, which is inside a hole cut there — so no authored chart cuts
    // one, and the validator refuses a chart that does.
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
    ['raymn (fist)', 210],
    ['b33p', 260],
    ['clara', 340],
    ['clara + SERIALIZED', 340 * 1.25],
  ];
  for (const sp of [208, 232]) {
    for (const [who, shot] of shots) {
      // With a press at the late edge of the window on top. The beat cabinet
      // floors the round's speed (BOX_SHOT_MIN_SPEED, run.js useAbility) so
      // that Kiko's makes it too; the floor is the number under test here.
      const flight = BOX_LEAD_BEATS * sp / (sp + Math.max(shot, BOX_SHOT_MIN_SPEED));
      assert(flight + ON_BEAT_WINDOW < BOX_BURST_BEATS,
        `${who}'s round reaches the box before it opens at ${sp}px/s, pressed late `
        + `(${flight.toFixed(2)} + ${ON_BEAT_WINDOW} < ${BOX_BURST_BEATS})`);
    }
  }
  // WHO IS DEALT ONE AT ALL. Four heroes, and the boundary is a range decision:
  // a thrown weapon parks after a fixed FLIGHT TIME, and the rocket fist's
  // 0.42s does not cover the box's lead at this cabinet's speed. See
  // RANGED_ABILITY_TYPES.
  for (const [id, can] of [['b33p', true], ['clara', true], ['kiko', true], ['grumpos', true],
    ['raymn', true], ['lorenzo', false], ['gnash', false], ['fernwick', false]]) {
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
    // The rocket fist reaches it too now the box is a beat out, which is why
    // Ray M'N is dealt one (RANGED_ABILITY_TYPES).
    assert((sp + 210) * 0.42 >= lead,
      `and so does the rocket fist (${((sp + 210) * 0.42).toFixed(0)} >= ${lead.toFixed(0)}px)`);
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
// A HOLE ON THE BOX'S BURST LINE. The box stands BOX_LEAD_BEATS - BOX_BURST_BEATS
// past that line and the pit's lip is pitWindowBeats past it; the validator
// holds that arithmetic rather than a slot rule, so what it refuses follows
// from the constants. At today's numbers the box stands in the hole.
let boxOverPitThrew = false;
try {
  validateBeatChart({ loopBeats: 4, events: [
    { slot: 0, action: 'ability', type: 'cardBox' }, { slot: 1, action: 'pit' },
    { slot: 2, action: 'coin' }, { slot: 3, action: 'coin' },
  ] }, { bpm });
} catch { boxOverPitThrew = true; }
assert(boxOverPitThrew, 'the validator refuses a box that would stand in the hole on its burst line');
// And a beat later is fine: the box has gone before the hero reaches the lip.
let boxThenPitThrew = false;
try {
  validateBeatChart({ loopBeats: 4, events: [
    { slot: 0, action: 'ability', type: 'cardBox' }, { slot: 1, action: 'coin' },
    { slot: 2, action: 'pit' }, { slot: 3, action: 'coin' },
  ] }, { bpm });
} catch { boxThenPitThrew = true; }
assert(!boxThenPitThrew, 'a hole a beat after the burst line is allowed');
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

// The song's own repeat is much longer than the action phrase. One transport
// wrap crosses fifteen 16-beat chart passes; the unwrapped clock must bridge
// all fifteen rather than falling 224 beats backwards.
{
  const state = { loopBeats: beatCharts[1].loopBeats };
  const before = unwrapBeat(319.9, state);
  const after = unwrapBeat(80.1, state);
  assert(before === 319.9 && Math.abs(after - 320.1) < 1e-9,
    `the real 80..320 song wrap stays monotonic (${before} -> ${after})`);
}

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
assert(firstCoin >= OPENING_COIN_BEAT && firstCoin === 3,
  'the song\'s opening kick and snare play over an empty lane: the first coin is the first coin slot from beat 2');
{
  // Anchored before the downbeat (the song starting inside the level), the same
  // rule holds against the song, not against the anchor.
  const obs = [], pks = [];
  const early = new BeatSpawner({ chart: beatCharts[1], bank: { bpm }, beatNow: () => -1.03,
    playerWorldX: (x) => x + 56, lookaheadBeats: 7 });
  early.fill(0, speed, obs, pks, () => 50);
  assert(Math.min(...pks.map((p) => p.actionBeat)) >= OPENING_COIN_BEAT,
    'a lane anchored during the count-down lays no coin before the opening beat');
  // Mid-song the opening is long gone and coins still start one beat out.
  const obs2 = [], pks2 = [];
  const mid = new BeatSpawner({ chart: beatCharts[1], bank: { bpm }, beatNow: () => 40.2,
    playerWorldX: (x) => x + 56, lookaheadBeats: 7 });
  mid.fill(0, speed, obs2, pks2, () => 50);
  const firstMid = Math.min(...pks2.map((p) => p.actionBeat));
  assert(firstMid >= 42 && firstMid < 46,
    'a lane anchored mid-song lays its first coin slot from one beat out (got ' + firstMid + ')');
}
{
  // A cursor that has fallen inside the next beat re-anchors: the world stood
  // still through the stage entrance while the clock ran, and the first live
  // fill must not lay a coin nearer than a beat.
  let stale = 0;
  const obs = [], pks = [];
  const sp = new BeatSpawner({ chart: beatCharts[1], bank: { bpm }, beatNow: () => stale,
    playerWorldX: (x) => x + 56, lookaheadBeats: 7 });
  sp.fill(0, speed, obs, pks, () => 50);
  const cursorAfterFirst = sp.cursorBeat;
  stale = 6.5;               // cursor 8 still a beat and a half ahead: no reset
  sp.fill(0, speed, obs, pks, () => 50);
  assert(sp.cursorBeat >= cursorAfterFirst, 'a cursor still a beat or more ahead of the clock is left alone');
  stale = 7.3;               // cursor 8 now inside the next beat: re-anchored
  const before = pks.length;
  sp.fill(0, speed, obs, pks, () => 50);
  const laid = pks.slice(before);
  assert(laid.length > 0 && laid.every((p) => p.actionBeat >= stale + 1),
    'a cursor inside the next beat re-anchors, so no coin is laid nearer than a beat from the hero');
}
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
  // frame. It must not take their clock ticks with them at all: the marker's
  // life is geometric, so a collected fill goes on crossing the line and then
  // leaves off the back end one subdivision at a time.
  for (const pk of fill) pk.live = false;
  const afterFirstTick = fillTiming.map((e) =>
    beatRibbonMarkerOffset(e.actionBeat, fill[0].actionBeat + 0.07));
  assert(afterFirstTick.every((x) => x != null),
    `a collected fill keeps every subdivision until it has crossed the line `
    + `(got ${afterFirstTick.filter((x) => x != null).length}/${fill.length})`);
  const aBeatOn = fillTiming.map((e) =>
    beatRibbonMarkerOffset(e.actionBeat, fill[0].actionBeat + 1.07));
  assert(aBeatOn.filter((x) => x != null).length === fill.length - 1,
    `and then retires them subdivision-by-subdivision instead of vanishing as a bunch `
    + `(got ${aBeatOn.filter((x) => x != null).length}/${fill.length})`);
  assert(beatRibbonMarkerOffset(5, 5.1) != null && beatRibbonMarkerOffset(5, 6.1) == null,
  'every marker travels through the line and leaves on the far side, whatever became of it');
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

// ---- THE OPENING IS JUMPS-ONLY -----------------------------------------------
// While the rooftop sign is still saying what the marks mean, the lane lays
// nothing that asks for one — no duck, no box, and no hole — and the judge
// scores none of those beats. Bars and coins carry on. All three stages, from
// the top, on the real spawner against a perfect clock.
{
  const oldSourceBank = Audio.sourceBank;
  const oldSongBeat = Audio.songBeat;
  for (const stage of STAGES.filter((s) => s.cabinet === 'rhythm')) {
    save.load(); save.newSlot(0, 0);
    const run = new RunState({ stage, save, seed: 7, skipRunIn: true, devInvuln: true, onEnd: () => {} });
    run.enter();
    Audio.sourceBank = run.cabinet.music;
    const advance = installBeatClock(run, run.spawner.chart.loopBeats);
    run.relay.current = 'clara';
    const laid = new Map();
    let firstBeat = null;
    for (let i = 0; i < 60 * 30; i++) {
      advance(1 / 60);
      run.update(1 / 60);
      if (firstBeat == null) firstBeat = run.rhythmBeatForJudging();
      for (const ob of run.obstacles) {
        if (ob.chartAction && !laid.has(ob.id)) laid.set(ob.id, { type: ob.type, action: ob.chartAction, beat: ob.actionBeat });
      }
    }
    const gate = run.rhythmOpeningGate();
    const sched = run.rhythmSignSchedule();
    assert(Number.isFinite(gate) && gate - firstBeat >= sched.from + sched.hold * sched.roll.length - 1,
      `${stage.id}: the gate holds until the sign has finished (${(gate - firstBeat).toFixed(1)} beats, ${sched.roll.length} signs)`);
    const early = [...laid.values()].filter((e) => e.beat < gate);
    const asks = early.filter((e) => !(e.action === 'jump' && e.type === 'beatBar'));
    assert(early.some((e) => e.type === 'beatBar') || !run.spawner.chart.events.some((e) => e.type === 'beatBar'),
      `${stage.id}: bars still go down inside it`);
    assert(asks.length === 0,
      `${stage.id}: nothing but bars is laid before the sign is down (${asks.map((e) => `${e.type}@${e.beat}`).join(' ') || 'none'})`);
    const late = [...laid.values()].filter((e) => e.beat >= gate && e.action !== 'jump');
    assert(late.length > 0, `${stage.id}: and the rest of the chart arrives once it is (${late.length} asks after)`);
  }
  Audio.songBeat = oldSongBeat;
  Audio.sourceBank = oldSourceBank;
}

// ---- A SHOT FROM THE AIR COMES DOWN ON THE BOX ---------------------------------
// The beat that asks for the shot can land anywhere in a jump, and a round that
// kept the hero's height sailed over the box. It dives onto the first thing it
// can hit instead (RunState.homePellet); a straight round is the control.
{
  const oldSourceBank = Audio.sourceBank;
  const oldSongBeat = Audio.songBeat;
  const stage = STAGES.find((s) => s.id === 'rhythm-1');
  for (const homing of [false, true]) {
    save.load(); save.newSlot(0, 0);
    const run = new RunState({ stage, save, seed: 7, skipRunIn: true, devInvuln: true, onEnd: () => {} });
    run.enter();
    run.rhythmOpeningUntil = null;
    if (!homing) run.homePellet = () => {};
    Audio.sourceBank = run.cabinet.music;
    const advance = installBeatClock(run, run.spawner.chart.loopBeats);
    run.relay.current = 'clara';
    let box = null, fired = false, hit = false;
    const impact = run.projectileImpact.bind(run);
    run.projectileImpact = (pr, x, y) => {
      if (pr.type === 'pellet' && box && Math.abs(x - (box.x + box.w / 2)) < 14) hit = true;
      return impact(pr, x, y);
    };
    for (let i = 0; i < 60 * 20 && !(fired && !box.live); i++) {
      advance(1 / 60);
      run.update(1 / 60);
      const b = run.rhythmBeatForJudging();
      if (!box) box = run.obstacles.find((o) => o.type === 'cardBox' && o.live) || null;
      if (!fired && box && Math.abs(b - box.actionBeat) < 0.01) {
        // Off the top of a jump: 45px up, hanging.
        run.player.y = 45; run.player.vy = 0; run.player.grounded = false;
        run.player.abilityCd = 0;
        run.useAbility();
        fired = true;
      }
    }
    assert(fired && hit === homing,
      homing ? 'a round fired from the top of a jump dives onto the card box'
        : 'and the control: a round that keeps its height sails over it');
  }
  Audio.songBeat = oldSongBeat;
  Audio.sourceBank = oldSourceBank;
}

// ---- A MISSED ROUND DIES IN FRAME ------------------------------------------
// A shot that connects with nothing has to end where the player can see it end.
// The cull used to be camX + W + 60 — a literal from when the frame WAS W wide
// — which at the shipped zoom let a missed round carry four beats of road past
// the right edge and break something out there, so a shot at empty lane paid
// off as a bang from off screen. The frame is W / camZoom now, and the box the
// shot is aimed at stands BOX_LEAD_BEATS out, well inside it.
{
  const oldSourceBank = Audio.sourceBank;
  const oldSongBeat = Audio.songBeat;
  const stage = STAGES.find((s) => s.id === 'rhythm-1');
  save.load(); save.newSlot(0, 0);
  const run = new RunState({ stage, save, seed: 7, skipRunIn: true, devInvuln: true, onEnd: () => {} });
  run.enter();
  run.rhythmOpeningUntil = null;
  Audio.sourceBank = run.cabinet.music;
  const advance = installBeatClock(run, run.spawner.chart.loopBeats);
  run.relay.current = 'clara';
  let impacts = 0, worst = -Infinity;
  const impact = run.projectileImpact.bind(run);
  run.projectileImpact = (pr, x, y) => {
    if (pr.type === 'pellet') {
      impacts++;
      worst = Math.max(worst, x - (run.camX + W / run.camZoom));
    }
    return impact(pr, x, y);
  };
  // Fired on every recharge, on the beat and off it alike: what is asserted is
  // where a round may go off, not whether the press was any good.
  for (let i = 0; i < 60 * 25; i++) {
    advance(1 / 60);
    run.update(1 / 60);
    if (run.player.abilityCd <= 0) run.useAbility();
  }
  assert(impacts > 4, `spamming the trigger down a rhythm lane lands rounds on things (${impacts})`);
  // The pellet's own body, and nothing more: 8px wide, drawn from pr.x.
  assert(worst <= 16, `and every one of them goes off inside the frame (worst ${worst.toFixed(1)}px past the right edge)`);
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

  for (const [hero, mod] of [['b33p', null], ['clara', 'serial'], ['kiko', 'force'], ['grumpos', null], ['raymn', null]]) {
    save.load(); save.newSlot(0, 0);
    const run = new RunState({ stage, save, seed: 7, skipRunIn: true, devInvuln: true, onEnd: () => {} });
    run.enter();
    if (mod) run.modIds.push(mod);
    Audio.sourceBank = run.cabinet.music;
    const advance = installBeatClock(run, loopBeats);
    run.relay.current = hero;
    let box = null, fired = false, litAt = null, burstAt = null;
    for (let i = 0; i < 60 * 40; i++) {
      advance(1 / 60);
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
    // OPENED BY THE ROUND, on the grid: the first beat line after it lands,
    // which is a different line for a slug and an axe — and never later than
    // the ceiling the press set, which is the line the chart's spacing was laid
    // against.
    assert(Number.isInteger(box.burstBeat) && box.burstBeat > box.actionBeat
      && box.burstBeat <= box.actionBeat + BOX_BURST_BEATS,
      `${who}'s box goes on a beat line inside the fuse (${box.burstBeat} for slot ${box.actionBeat})`);
    assert(burstAt != null && Math.abs(burstAt - box.burstBeat) < 0.06,
      `${who}'s box opens on that beat and not a frame's drift off it (${burstAt?.toFixed(2)})`);
    assert(run.beatCombo === 1, `${who} is paid the on-beat credit for it`);
  }

  // And the other half of the contract: a hero with no ranged answer meets no
  // box, and the beat they cannot play does not cost them the combo they built.
  for (const hero of ['lorenzo', 'gnash']) {
    save.load(); save.newSlot(0, 0);
    const run = new RunState({ stage, save, seed: 7, skipRunIn: true, devInvuln: true, onEnd: () => {} });
    run.enter();
    Audio.sourceBank = run.cabinet.music;
    const advance = installBeatClock(run, loopBeats);
    run.relay.current = hero;
    let sawBox = false, broke = false;
    for (let i = 0; i < 60 * 12; i++) {
      advance(1 / 60);
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
  // The real arrangement loops beats 80..320, not at the chart's 16-beat
  // phrase. Start just before that seam so this exercises the production wrap.
  const songLoopStart = 80, songLoopEnd = 320;
  // Counted in BEATS at the lane's own tempo, for the reason installBeatClock
  // states; this one maps onto the song's loop rather than the chart's phrase,
  // so it keeps its own stub.
  let songBeats = 318;
  Audio.songBeat = () => {
    const span = songLoopEnd - songLoopStart;
    return songLoopStart + ((songBeats - songLoopStart) % span + span) % span;
  };
  let resyncs = 0;
  const origReset = run.resetRhythmLane.bind(run);
  run.resetRhythmLane = (...a) => { resyncs++; return origReset(...a); };
  const TICK = 1 / 60;
  // The audio clock advances by the callback's wall gap; the sim then catches
  // up in fixed steps inside that same callback, exactly as engine/loop.js runs.
  const frameOf = (gapSec, steps) => {
    songBeats += gapSec * run.laneBpm() / 60;
    for (let i = 0; i < steps; i++) run.update(TICK);
  };
  for (let i = 0; i < 1500; i++) frameOf(TICK, 1); // ~25s: the real song loop wraps
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
// in the cast reaches 51, so a duck slot could be answered with the jump button
// by every hero in the game. The full column takes that away from ALL of them —
// it used to split the cast at 50, and cannot any more, because compressing the
// jump band left no gap in the table wide enough to hold a decision. These
// assertions are the arithmetic that number rests on, checked against the real
// cast rather than restated as a constant.
{
  // Feet-height at the top of a full jump, per hero. jumpHeightFor is the whole
  // answer now: jumpMult buys height directly and `heavy` is paid for in
  // airtime, so there is no second arithmetic for this test to keep in step.
  const apex = jumpHeightFor;
  const drone = OBSTACLES.drone;
  const top = DRONE_COLUMN_ALTS[DRONE_COLUMN_ALTS.length - 1] + drone.h;
  const heroes = Object.values(HEROES);
  const denied = heroes.filter((h) => apex(h) < top);
  assert(top === 68, `the column tops out at 68 (got ${top})`);
  assert(denied.length === heroes.length,
    `no hero in the cast can jump the column (${heroes.filter((h) => apex(h) >= top)
      .map((h) => h.id).join() || 'none can'})`);
  // MARGIN, not a coincidence. A ceiling level with somebody's apex is a
  // coin-flip on a pixel rather than a decision, and the tightest gap in the
  // cast is now 6px — which is why the ceiling stands over the whole table
  // instead of inside it. See the rung note in entities.js.
  assert(denied.every((h) => top - apex(h) >= 3),
    'and it stands clear of every apex rather than level with the top one');
  // AND THE MIDDLE HEIGHT IS WHY THREE RUNGS ARE REFUSED. 52 lands inside a
  // pixel of B-33P's apex and clear of everyone else's — a wall for one hero by
  // less than a pixel. This is the arithmetic behind the validator's rule, not
  // a restatement of it.
  const threeTop = DRONE_COLUMN_ALTS[2] + drone.h;
  const split = heroes.filter((h) => Math.abs(apex(h) - threeTop) < 3);
  assert(split.length === 1 && split[0].id === 'b33p',
    `three rungs (${threeTop}) sits on B-33P's apex — the coin-flip the validator refuses`);

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
  // comment: a pair stops well short of every apex in the cast, so it reads as
  // a stack without taking the jump away. That is what makes it the teach.
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
  // THE FINALE'S DUCK BEATS ARE TWO OBJECTS, one button. A drone hangs still
  // and is slid under; a barrel rolls at you and is slid INTO. Both are duck
  // slots and everything downstream — judge, ribbon, spacing — treats them as
  // one kind, which is the whole reason the barrel is a flag on the def rather
  // than a new action.
  const ducks = obs.filter((o) => o.chartAction === 'duck');
  assert(ducks.length > 0 && ducks.every((o) => o.type === 'drone' || o.type === 'barrel'),
    'the finale lays drones and barrels on its duck beats');
  assert(ducks.some((o) => o.type === 'drone') && ducks.some((o) => o.type === 'barrel'),
    'and lays some of each');
  const byEvent = new Map();
  for (const o of ducks.filter((d) => d.type === 'drone')) {
    byEvent.set(o.chartEventId, [...(byEvent.get(o.chartEventId) || []), o]);
  }
  assert([...byEvent.values()].every((g) => g.length === DRONE_COLUMN_ALTS.length),
    'every DRONE slot on the finale reaches the lane as a full column');
  assert([...byEvent.values()].every((g) => g.every((o) =>
    o.x === g[0].x && o.actionBeat === g[0].actionBeat && o.chartSlot === g[0].chartSlot)),
    'and its rungs share one X, one beat and one slot');
  assert([...byEvent.values()].every((g) =>
    g.map((o) => o.alt).sort((a, b) => a - b).join() === DRONE_COLUMN_ALTS.join()),
    'stacked at the authored altitudes');
  // A barrel is ONE body per slot — there is no such thing as a stack of them.
  const barrelsByEvent = new Map();
  for (const o of ducks.filter((d) => d.type === 'barrel')) {
    barrelsByEvent.set(o.chartEventId, (barrelsByEvent.get(o.chartEventId) || 0) + 1);
  }
  assert([...barrelsByEvent.values()].every((n) => n === 1),
    'and a barrel slot lays exactly one barrel');

  // Stage 2 teaches the duck with a BARREL before it asks with a column. The
  // escape hatch on the first one the player ever meets is the point of it: a
  // barrel is 13 tall and can be hopped, so answering it with the jump button
  // costs the beat and not the run. The three-rung column a bar later is the
  // one that cannot be jumped at all.
  const teach = beatCharts[2].events.filter((e) => e.action === 'duck');
  assert(teach.length === 2 && teach[0].type === 'barrel' && teach[1].column === 4,
    'stage 2 teaches with a barrel and answers with the full column');
  // A HANDFUL, NOT A MECHANIC — on BOTH stages. Every loop was eleven barrels
  // across the finale, which made it read as the barrel stage rather than as
  // the stage where a barrel is one of three things being asked at once. Both
  // carry a cadence now, and the only thing the suite pins is the ordering:
  // the finale deals them oftener than the stage that teaches them, and neither
  // deals one every time round.
  const finaleBarrels = beatCharts[3].events
    .filter((e) => e.action === 'duck' && e.type === 'barrel');
  assert(teach[0].every > 1, `the teaching stage deals one every ${teach[0].every} loops`);
  assert(finaleBarrels.every((e) => (e.every ?? 1) > 1),
    'and the finale is on a cadence too, not one a loop');
  assert(finaleBarrels.every((e) => e.every < teach[0].every),
    `but a shorter one (${finaleBarrels.map((e) => e.every).join(',')} against ${teach[0].every})`);
  assert(beatCharts[3].events.filter((e) => e.action === 'duck')
    .every((e) => e.column === 4 || e.type === 'barrel'),
    'and the finale asks for the slide on every duck beat it has');
  // NO LONE DRONES ON THE CABINET. One drone is a duck beat that can be
  // answered with the jump button for free, which is the whole thing this
  // replaced — and a barrel is not that: the jump clears it and still loses the
  // beat, because the chart asked for the boot.
  for (const [id, chart] of Object.entries(beatCharts)) {
    assert(chart.events.filter((e) => e.action === 'duck' && e.type === 'drone')
      .every((e) => e.column >= 2),
      `rhythm-${id} lays no lone drone on a duck beat`);
  }
}
// ---- THE PUNT SLOT ----------------------------------------------------------
//
// A barrel is the only hazard on this cabinet that is MOVING when it is
// answered, and everything below is the arithmetic that makes that land on a
// grid. Three separate things have to be true at the instant of contact and
// they are owned by three different files, so this is where they are pinned
// together.
{
  const barrel = OBSTACLES.barrel;
  assert(barrel.beatPunt === true && barrel.action === 'jump',
    'a barrel answers to a duck on the grid and a jump off it');

  // 1. THE WINDOW EXISTS, and it is derived rather than declared. A beat barrel
  // is kicked on the INPUT rather than on the crouch blend (see the `sliding`
  // note in run.js), so the only thing bounding the contact at either end is
  // the judge's own slop: late enough that the LATEST legal press has started
  // its slide, early enough that the EARLIEST one is still inside the punt
  // window.
  const slop = ON_BEAT_WINDOW * 60 / bpm;
  const { lo, hi } = puntLeadRange(bpm);
  assert(Math.abs(lo - slop) < 1e-9,
    `the contact cannot come before the latest legal press has pressed (${lo.toFixed(3)}s)`);
  assert(Math.abs(hi - (PUNT.windowT - slop)) < 1e-9,
    `nor after the punt window shuts on the earliest one (${hi.toFixed(3)}s)`);
  assert(lo < hi, `and at ${bpm}bpm there is room between them (${(hi - lo).toFixed(3)}s)`);

  // THE LEAD SITS LOW IN THAT RANGE, NOT IN THE MIDDLE, and the reason is that
  // the two ends are not the same kind of wrong. Late costs a slightly relaxed
  // input; EARLY is time between the beat the player plays and the hit they
  // hear, and a kick whose impact lands half a beat behind the press does not
  // read as on the beat whatever the scoreboard says. The mechanic's whole feel
  // is this number, so it is asserted as an upper bound rather than as an
  // equality — retunable, but never back to half a beat.
  const lead = puntLeadSec(bpm);
  assert(lead >= lo && lead <= hi, `the lead is inside its own range (${lead.toFixed(3)}s)`);
  assert(lead * bpm / 60 < 0.25,
    `and the boot lands within a quarter beat of the press (${(lead * bpm / 60).toFixed(3)})`);
  assert(lead - slop > 1 / 60,
    `with a frame of slack over the latest legal press (${((lead - slop) * 1000).toFixed(0)}ms)`);

  // 2. IT HOLDS ACROSS THE WHOLE ON-BEAT RANGE. Walk every press the judge
  // would accept — a full window early to a full window late — and check that
  // the slide has STARTED and is still in its window when the barrel arrives.
  // This is the claim the mechanic actually rests on: an on-beat press punts.
  let punts = 0, presses = 0;
  for (let off = -slop; off <= slop + 1e-9; off += slop / 12) {
    presses++;
    const heldAtContact = lead - off;
    // Strictly greater than nothing: a contact on the very frame of the press
    // does land in the engine (the press is registered before collision
    // resolves) but it is not something to author against.
    if (heldAtContact > 0 && puntPower(heldAtContact) > 0) punts++;
  }
  assert(punts === presses,
    `every press the judge calls on-beat also punts (${punts}/${presses})`);
  // And the blend it no longer waits for: at the latest legal press the crouch
  // is only part-way down when the boot connects, which is exactly the 84ms the
  // old gate was charging for and this one is not.
  assert(Math.min(1, (lead - slop) / DUCK_IN_T) < 0.6,
    'a late press connects before the crouch blend would have allowed it');

  // 3. AND A LATE ONE DOES NOT. The window is a skill, not a formality: a press
  // far enough past the line that the judge has already refused it must miss
  // the punt too, or the two systems disagree about what "on the beat" bought.
  const late = lead - PUNT.windowT - 0.01;
  assert(puntPower(lead - late) === 0 || late < 0,
    'and a press outside the punt window does not');

  // 4. THE VALIDATOR REFUSES A TEMPO THAT CLOSES THE WINDOW. Same guard the pit
  // already carries: a cabinet that can score a beat it has made unplayable is
  // a cabinet arguing with itself. ON_BEAT_WINDOW is in BEATS, so a slow enough
  // song widens the slop in seconds until it eats the whole range.
  // Four beats, not two: puntPunt is 4, so a loop shorter than that can never
  // satisfy its own wrap — a barrel every other beat is exactly what the
  // spacing table exists to refuse.
  const puntChart = [
    { slot: 0, action: 'duck', type: 'barrel' }, { slot: 1, action: 'coin' },
    { slot: 2, action: 'coin' }, { slot: 3, action: 'coin' },
  ];
  const tooSlow = Math.floor(ON_BEAT_WINDOW * 60 / (PUNT.windowT / 2));
  assert(puntLeadRange(tooSlow).lo >= puntLeadRange(tooSlow).hi,
    `${tooSlow}bpm leaves no contact window at all`);
  let threw = false;
  try { validateBeatChart({ loopBeats: 4, events: puntChart }, { bpm: tooSlow }); } catch { threw = true; }
  assert(threw, 'and the validator refuses a punt slot at that tempo');
  assert(!!validateBeatChart({ loopBeats: 4, events: puntChart }, { bpm }),
    'while this cabinet\'s own tempo carries it through');

  // A BARREL IS A DUCK SLOT'S PROP AND NOTHING ELSE'S, even though its own def
  // says `action: 'jump'`. On a jump slot it would pass the def check and then
  // be laid with the static approach — the lead that assumes the hazard waits
  // where it is put — so it would arrive early and the beat would be
  // unplayable for a reason nothing in the chart could show.
  let jumpThrew = false;
  try {
    validateBeatChart({ loopBeats: 4, events: [
      { slot: 0, action: 'jump', type: 'barrel' }, { slot: 1, action: 'coin' },
      { slot: 2, action: 'coin' }, { slot: 3, action: 'coin' },
    ] }, { bpm });
  } catch { jumpThrew = true; }
  assert(jumpThrew, 'the validator refuses a barrel on a jump slot');
  let droneThrew = false;
  try {
    validateBeatChart({ loopBeats: 4, events: [
      { slot: 0, action: 'jump', type: 'drone' }, { slot: 1, action: 'coin' },
      { slot: 2, action: 'coin' }, { slot: 3, action: 'coin' },
    ] }, { bpm });
  } catch { droneThrew = true; }
  assert(droneThrew, 'and still refuses a drone on one, as it always has');

  // 4b. A KICK GETS ROOM ON BOTH SIDES, and it is its own kind in the spacing
  // table rather than a duck. Coming OUT of one the hero is still mid-slide
  // with a boot out, so a jump on the next line is asked of a body that is not
  // standing; coming INTO one he needs a FRESH duck press, and a player still
  // holding the slide that took the drone a beat ago has a hold time past the
  // punt window before the barrel is even there. Both were legal under the
  // duck's own one-beat spacing and neither was playable.
  const spacing = (a, b) => {
    let threw = false;
    try {
      validateBeatChart({ loopBeats: 4, events: [
        { slot: 0, ...a }, { slot: 1, action: 'coin' },
        { slot: 2, action: 'coin' }, { slot: 3, action: 'coin' },
      ].map((e, i) => (i === 1 ? { slot: 1, ...b } : e)) }, { bpm });
    } catch { threw = true; }
    return threw;
  };
  const BARREL = { action: 'duck', type: 'barrel' };
  const DRONE = { action: 'duck', type: 'drone', column: 4 };
  const BAR = { action: 'jump', type: 'beatBar' };
  assert(spacing(BARREL, BAR), 'a jump one beat after a kick is refused');
  assert(spacing(DRONE, BARREL), 'and a kick one beat after a slide is refused');
  assert(!spacing(DRONE, BAR), 'while a jump one beat after an ordinary slide is still allowed');

  // 4c. AND THE CADENCE. A barrel is the third slot allowed to skip loops, for
  // the card box's own two reasons: its demand is conditional, and the judge
  // already asks the lane what it laid rather than reading the chart.
  const cadence = (every) => validateBeatChart({ loopBeats: 4, events: [
    { slot: 0, action: 'duck', type: 'barrel', every }, { slot: 1, action: 'coin' },
    { slot: 2, action: 'coin' }, { slot: 3, action: 'coin' },
  ] }, { bpm });
  assert(cadence(3).events[0].every === 3, 'a barrel slot may name a cadence');
  assert(cadence(3).events[0].punt === true,
    'and is stamped as a punt so the judge can tell it from a drone');
  let dronesSkip = false;
  try {
    validateBeatChart({ loopBeats: 4, events: [
      { slot: 0, action: 'duck', type: 'drone', column: 4, every: 2 }, { slot: 1, action: 'coin' },
      { slot: 2, action: 'coin' }, { slot: 3, action: 'coin' },
    ] }, { bpm });
  } catch { dronesSkip = true; }
  assert(dronesSkip, 'while a drone slot still may not — the lane always lays one');

  // The lane end of the cadence: a quiet pass lays nothing AND records nothing,
  // which is what makes it a beat the scoreboard cannot demand.
  {
    let beat = 0;
    const obs = [], picks = [];
    const sp = new BeatSpawner({
      chart: { loopBeats: 4, events: [
        { slot: 0, action: 'duck', type: 'barrel', every: 3 }, { slot: 1, action: 'coin' },
        { slot: 2, action: 'coin' }, { slot: 3, action: 'coin' },
      ] },
      bank: { bpm }, beatNow: () => beat, playerWorldX: (x) => x + 56,
    });
    for (let i = 0; i <= 48; i++) { beat = i; sp.fill(beat * pxPerBeat, speed, obs, picks, () => 50); }
    const laidAt = obs.filter((o) => o.type === 'barrel').map((o) => o.actionBeat);
    assert(laidAt.every((b) => b % 12 === 0),
      `every: 3 on a 4-beat loop lays a barrel every twelfth beat (${laidAt.join(', ')})`);
    assert(sp.eventInstances.filter((e) => e.chartAction === 'duck').length === laidAt.length,
      'and records exactly the ones it laid, so the judge can ask');
  }

  // 5. THE APPROACH IS MEASURED AGAINST A CLOSING TARGET. Both bodies spend the
  // gap, so it is opened at the sum of their speeds; measured at the run speed
  // alone the contact lands early by the ratio between them.
  const approach = actionApproachPx('duck', 'barrel', speed, bpm);
  assert(Math.abs(approach - ((speed + Math.abs(barrel.vx)) * lead + PLAYER_W)) < 1e-6,
    'the barrel stands a closing-speed lead down the road');
  // AND THE HERO'S OWN WIDTH ON TOP, like every other physical hazard here. The
  // gap that closes runs from his front to the barrel's left edge while
  // `actionX` is his back foot, so leaving it out spends a body length of the
  // lead before the boxes are near each other and the boot lands two frames
  // early — measurable on a live run as a mean contact error of -0.065 beats.
  assert(approach > (speed + Math.abs(barrel.vx)) * lead,
    'measured from his front foot, not his back one');
  assert(approach > actionApproachPx('duck', 'drone', speed, bpm),
    'which is further out than a drone, because a drone waits and a barrel does not');

  // 6. AND THE DRIFT CORRECTION PUTS IT THERE ON ITS OWN BEAT. The lane lays
  // events up to the lookahead early and the barrel rolls the whole time, so
  // it goes down that much further along. Checked for every lead the lookahead
  // can produce: whatever beat it was laid on, it must arrive at the same
  // contact position.
  const beatSec = 60 / bpm;
  const contacts = new Set();
  for (let ahead = 1; ahead <= 7; ahead++) {
    let beat = 0;
    const obs = [], picks = [];
    const sp = new BeatSpawner({
      chart: { loopBeats: 4, events: [
        { slot: 0, action: 'duck', type: 'barrel' }, { slot: 1, action: 'coin' },
        { slot: 2, action: 'coin' }, { slot: 3, action: 'coin' },
      ] },
      bank: { bpm }, beatNow: () => beat, playerWorldX: (x) => x + 56,
      lookaheadBeats: ahead,
    });
    for (let i = 0; i <= 12; i++) { beat = i; sp.fill(beat * pxPerBeat, speed, obs, picks, () => 50); }
    const laid = obs.filter((o) => o.type === 'barrel' && o.actionBeat === 8)[0];
    if (!laid) continue;
    // Roll it forward the way updateEntities does, to the beat it is answered on.
    const flight = (laid.actionBeat - Math.ceil(laid.actionBeat - ahead)) * beatSec;
    contacts.add(Math.round((laid.x + barrel.vx * flight) * 10) / 10);
  }
  assert(contacts.size === 1,
    `a barrel arrives at one contact point however early it was laid (${[...contacts].join(', ')})`);
  assert(Math.abs([...contacts][0] - (8 * pxPerBeat + 56 + approach)) < 1.5,
    'and that point is the beat line plus its approach');
  // WHICH IS THE BOOT'S OWN POSITION ON THAT BEAT. The hero's front foot is at
  // his action x plus his width, and the barrel's left edge is the lead's worth
  // of closing beyond it — so the two meet `lead` seconds after the line, which
  // is the number the punt window was solved for and nothing else.
  const contactGap = [...contacts][0] - (8 * pxPerBeat + 56 + PLAYER_W);
  assert(Math.abs(contactGap / (speed + Math.abs(barrel.vx)) - lead) < 1e-3,
    `and the gap left in front of him is exactly the punt lead `
    + `(${(contactGap / (speed + Math.abs(barrel.vx))).toFixed(4)}s vs ${lead.toFixed(4)}s)`);
}

{
  // A column is the duck's and the drone's alone.
  const refuses = (events, why) => {
    let threw = false;
    try { validateBeatChart({ loopBeats: events.length, events }); } catch { threw = true; }
    assert(threw, why);
  };
  refuses([{ slot: 0, action: 'jump', type: 'beatBar', column: 4 }, { slot: 1, action: 'coin' }],
    'the validator refuses a column on a jump slot');
  refuses([{ slot: 0, action: 'duck', type: 'drone', column: 5 }, { slot: 1, action: 'coin' }],
    'and refuses a rung nobody measured a jump against');
  refuses([{ slot: 0, action: 'duck', type: 'drone', column: 3 }, { slot: 1, action: 'coin' }],
    'and refuses the three-rung coin-flip that used to be the gate');
  refuses([{ slot: 0, action: 'duck', type: 'drone', column: true }, { slot: 1, action: 'coin' }],
    'and refuses a column that will not say how tall it is');
  const ok = validateBeatChart({ loopBeats: 2, events: [
    { slot: 0, action: 'duck', type: 'drone', column: 4 }, { slot: 1, action: 'coin' },
  ] });
  assert(ok.events[0].column === 4, 'but carries an honest one through to the lane');
}

// A PAUSE BESIDE A PIT LEAVES THE PIT THERE.
//
// The song plays on while the pause menu is up, so resuming re-anchors the lane
// — and the rebuild used to delete every chart entity in front of the hero, the
// hole he was three strides into a run-up for included. It came back, four
// beats and a 760px lookahead later, somewhere else. A hole is geometry: it
// stays where it was cut, keeps its width, and only its beat is re-read.
{
  save.load(); save.newSlot(0, 0);
  const oldSourceBank = Audio.sourceBank;
  const oldSongBeat = Audio.songBeat;
  const stage = STAGES.find((s) => s.id === 'rhythm-3');
  const run = new RunState({ stage, save, seed: 31, skipRunIn: true, devInvuln: true, onEnd: () => {} });
  run.enter();
  Audio.sourceBank = run.cabinet.music;
  const loopBeats = run.spawner.chart.loopBeats;
  const advance = installBeatClock(run, loopBeats);
  const TICK = 1 / 60;
  const view = () => run.camX + 480 / run.camZoom;
  const inView = () => run.obstacles.filter((ob) => ob.live && ob.def.isGap && !ob.tunnel
    && ob.x > run.playerWorldX() - 20 && ob.x <= view());
  // Run on until one of the chart's own holes is actually on screen — that is
  // the moment the complaint is about.
  let holes = [];
  for (let i = 0; i < 3000 && !holes.length; i++) {
    advance(TICK); run.update(TICK); holes = inView();
  }
  assert(holes.length > 0, `the lane has cut holes the hero can see (${holes.length})`);
  const before = holes.map((ob) => ({ ob, x: ob.x, w: ob.w }));
  // The pause itself: the world holds still and the song runs on, which is
  // exactly the discontinuity resuming has to answer.
  advance(3.2);
  run.resetRhythmLane();
  assert(before.every((h) => h.ob.live), 'every hole in view survives the resume');
  assert(before.every((h) => h.ob.x === h.x && h.ob.w === h.w),
    'and stands where it was cut, the same width');
  const heard = run.rhythmBeatForJudging();
  assert(before.every((h) => Number.isFinite(h.ob.actionBeat)
    && Math.abs(h.ob.actionBeat - (heard + (h.ob.actionX - run.playerWorldX())
      / (run.speed * 60 / run.cabinet.music.bpm))) <= 0.5),
    'each one carries the beat its take-off mark now falls on');
  // Nothing the player must answer for is left demanding an input at a beat the
  // re-read put on a slot the chart wants something else on.
  const chart = run.spawner.chart;
  assert(before.every((h) => {
    const wants = chart.events[h.ob.chartSlot]?.action;
    return wants === 'jump' || wants === 'pit'
      || run.beatJudgeConsumed.has(`judge:${h.ob.actionBeat}:${h.ob.chartSlot}`);
  }), 'and never stands on a beat the chart demands a different input on');
  // The combo the hero built is not taken away by the resume itself.
  run.beatCombo = 4;
  for (let i = 0; i < 24; i++) { advance(TICK); run.update(TICK); }
  assert(run.beatCombo === 4, 'and the resume alone breaks no combo in the beats after it');
  Audio.songBeat = oldSongBeat;
  Audio.sourceBank = oldSourceBank;
}

// A CROSSING SURVIVES THE SAME PAUSE, stones and all: it is the widest piece of
// geometry on any lane and the one a player is most committed to when the menu
// goes up.
{
  save.load(); save.newSlot(0, 0);
  const oldSourceBank = Audio.sourceBank;
  const oldSongBeat = Audio.songBeat;
  const stage = STAGES.find((s) => s.id === 'rhythm-2');
  const run = new RunState({ stage, save, seed: 5, skipRunIn: true, devInvuln: true, onEnd: () => {} });
  run.enter();
  Audio.sourceBank = run.cabinet.music;
  const loopBeats = run.spawner.chart.loopBeats;
  const advance = installBeatClock(run, loopBeats);
  const TICK = 1 / 60;
  const plan = run.pitPlan.find((pp) => pp.crossing);
  assert(!!plan, 'rhythm-2 carries the act I crossing');
  // Walk the camera up to the piece rather than playing the whole stage.
  for (let i = 0; i < 400 && !plan.spawned; i++) {
    if (plan._beatAligned && run.camX + 900 < plan.x) {
      const step = Math.min(400, plan.x - 900 - run.camX);
      run.camX += step;
      run.player.x = (run.player.x ?? 0) + step;
    }
    advance(TICK);
    run.update(TICK);
  }
  assert(plan.spawned, 'the crossing is cut when the camera reaches it');
  const hole = run.obstacles.find((ob) => ob.live && ob.setPiece === plan);
  assert(!!hole, 'and stands in the lane as one break');
  const x = hole?.x, w = hole?.w;
  const stones = (plan.crossing.stones || []).map((st) => st.x);
  advance(2.7);
  run.resetRhythmLane();
  assert(!!hole && hole.live && hole.x === x && hole.w === w,
    'the resume leaves the break exactly where it was');
  assert(plan.spawned && !plan.passed, 'and does not re-arm the piece into a second one');
  assert((plan.crossing.stones || []).every((st, i) => st.x === stones[i]),
    'and every stone stays under the jump it was placed for');
  assert(run.obstacles.filter((ob) => ob.live && ob.setPiece === plan).length === 1,
    'exactly one break, not two');
  Audio.songBeat = oldSongBeat;
  Audio.sourceBank = oldSourceBank;
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

// ---- THE RAMP OUTLIVES THE RUN, NOT THE SONG ------------------------------
//
// The bpm ramp is a TRANSPORT WARP, and run.js deliberately leaves it in force on
// the way out so the celebration does not slow down. Nothing then took it off,
// so a rhythm 3-3 finished at 129 left the hub, the cabinet screen and every song
// after it running about 4% fast. A cabinet plays its song at the song's tempo:
// the reset belongs to the song change, which is the one event that means
// "whatever was performing the last one is over".
{
  const rampCab = { music: { bpm: 124 } };
  const leaving = Object.create(RunState.prototype);
  leaving.beatLock = true;
  leaving.cabinet = rampCab;
  leaving.stage = { bpmRamp: 1 };
  leaving.beatBpmSteps = 5;          // every checkpoint banked: 124 -> 129
  leaving.keepSongTempo();
  assert(Math.abs(Audio.tempo - 129 / 124) < 1e-9,
    'leaving a ramped stage keeps the tempo it was played at, for the celebration');
  // Back at the cabinet screen. Re-selecting the song already up is exactly the
  // case that was wrong, so it is the case asserted: the reset has to happen
  // before setBank's same-bank early return, not after it.
  const wasSource = Audio.sourceBank;
  Audio.sourceBank = rampCab.music;
  Audio.setBank(rampCab.music);
  assert(Audio.tempo === 1 && Audio.detune === 1,
    'and the next song change puts the transport back to the base tempo');
  Audio.sourceBank = wasSource;
}

console.log(failed ? 'BEAT-CHART: FAILED' : 'BEAT-CHART: PASSED');
process.exit(failed ? 1 : 0);
