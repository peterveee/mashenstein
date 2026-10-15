// M-A-S-H: Field Service 3's mission. Four letters at fixed spots, each on a road
// the player has to choose; you cannot run back for one, so a letter is banked the
// moment it is taken and kept across attempts, and the stage clears on the run that
// ends with all four banked. All four in ONE run is the gold MASH, a score bonus.
//
// Claims, over real headless runs:
//   - every letter stands on the road it was placed for, on every difficulty and
//     both corrupted speeds, and is never laid on top of a hazard
//   - a letter passed untaken is MISSED at once, and only a needed one says so
//   - letters bank on a FAILED run, come back as outlines, and still count
//   - the run that finishes with all four banked clears the stage
//   - the gold MASH pays once, and only for all four taken in the same run
//   - a death that goes back to a checkpoint offers the letters ahead again
//   - on a stage with no roads (Speed Zone 3) the letters anchor to the lane, the
//     scripted pit and the crossing, and the lane around a bare letter is clear
//   - the edge marker points only at letters the camera cannot show in time —
//     overhead or underfoot — never at one already in the picture's band
import { installDom } from './dom-stub.js';
installDom();

const { RunState } = await import('../src/game/run.js');
const { save } = await import('../src/engine/save.js');
const { Input } = await import('../src/engine/input.js');
const { DemoBot } = await import('../src/game/bot.js');
const { STAGE_BY_ID, MASH_LETTERS } = await import('../src/data/stages.js');
const { makePickup, PICKUPS } = await import('../src/game/entities.js');
const { applyResult } = await import('../src/game/progress.js');
const { propSprite, hasProp } = await import('../src/sprites/props.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const stage = STAGE_BY_ID['plumber-3'];
const speed3 = STAGE_BY_ID['speed-3'];
const TICK = 1 / 60;
const MAX_TICKS = 60 * 200;
// The road each letter was placed on, in letter order (see data/stages.js).
const ROADS = ['island', 'tunnel', 'island', 'fork'];

function freshSave() {
  save.load();
  save.newSlot(0, 0);
}

function newRun({ seed = 1, difficulty = 1, corrupted = [], onEnd = () => {}, on = stage } = {}) {
  const run = new RunState({ stage: on, team: ['lorenzo', 'rusty', 'clara'], save, seed, difficulty, corrupted, onEnd });
  run.enter();
  return run;
}

// Play a run out with the demo bot. `each` sees every frame.
function playOut(run, each = () => {}) {
  let result = null;
  run.o.onEnd = (r) => { result = r; };
  const bot = new DemoBot(run);
  for (let ticks = 0; !result && ticks < MAX_TICKS; ticks++) {
    bot.update(TICK);
    run.update(TICK);
    each(run);
  }
  bot.releaseAll();
  Input.endFrame();
  return result;
}

// ---------------------------------------------------------------- the data
assert(stage.mission.type === 'mash' && stage.mission.n === MASH_LETTERS.length,
  'Field Service 3 is the M-A-S-H mission, four letters to collect');
assert(stage.mission.at.length === MASH_LETTERS.length
  && stage.mission.at.every((f, i, a) => f > 0 && f < 1 && (i === 0 || f > a[i - 1])),
  'its four spots are fractions of the stage, in letter order');
for (const L of MASH_LETTERS) {
  assert(PICKUPS[`letter${L}`]?.mashLetter === L, `${L} is a pickup that knows its letter`);
  assert(hasProp(`letter${L}`) && hasProp(`letter${L}Banked`), `${L} has a gold and a banked painter`);
  assert(propSprite(`letter${L}`, 16, 19, 0) && propSprite(`letter${L}Banked`, 16, 19, 0), `and both paint`);
}

// ------------------------------------------------- every letter on its road
freshSave();
const CONFIGS = [
  { difficulty: 1, corrupted: [] }, { difficulty: 5, corrupted: [] },
  { difficulty: 1, corrupted: ['maxspeed'] }, { difficulty: 1, corrupted: ['randomswap'] },
];
for (const cfg of CONFIGS) {
  const run = newRun(cfg);
  const label = `d${cfg.difficulty}${cfg.corrupted.length ? ` ${cfg.corrupted[0]}` : ''}`;
  const kinds = run.mission.letters.map((l) => run.mashRoadAt(l.x)?.kind || 'lane');
  assert(kinds.join() === ROADS.join(), `${label}: each spot falls on its road (${kinds.join(', ')})`);
}

// Seeds move the lane and the tunnel's hazards; nothing may stand on a letter.
let laidOn = 0, spawns = 0;
for (let seed = 1; seed <= 6; seed++) {
  const run = newRun({ seed });
  const seen = new Set();
  playOut(run, (r) => {
    for (const p of r.pickups) {
      if (!p.live || !p.def.mashLetter || seen.has(p.def.mashLetter)) continue;
      seen.add(p.def.mashLetter);
      spawns++;
      const l = r.mission.letters.find((q) => q.letter === p.def.mashLetter);
      if (Math.abs(p.x + p.w / 2 - l.x) > 0.5) laidOn += 100;   // off its spot is worse
      if (r.obstacles.some((o) => o.live && !o.def.isGap && (o.route || null) === (p.road || null)
        && o.x < p.x + p.w + 4 && o.x + o.w > p.x - 4)) laidOn++;
    }
  });
}
assert(spawns === 6 * MASH_LETTERS.length, `every letter spawns once a run, exactly on its spot (${spawns})`);
assert(laidOn === 0, `no letter is laid on a hazard on its road (${laidOn} across 6 seeds)`);

// ---------------------------------------- missed at once, banked on a fail
freshSave();
let run = newRun();
const missedAt = {};
const first = playOut(run, (r) => {
  for (const l of r.mission.letters) if (l.missed && missedAt[l.letter] == null) missedAt[l.letter] = r.camX;
});
const got = first.mashGot || [];
const missed = run.mission.letters.filter((l) => l.missed).map((l) => l.letter);
assert(got.length > 0 && got.length < 4, `the bot takes some letters and not others (${got.join(' ')})`);
assert(missed.length === 4 - got.length && missed.every((L) => !got.includes(L)),
  `every letter it did not take is marked missed (${missed.join(' ')})`);
assert(missed.every((L) => missedAt[L] < run.mission.letters.find((l) => l.letter === L).x + 40),
  'and marked as it goes past, not at the end of the run');
assert(!first.success && first.failMsg === 'MISSION INCOMPLETE', 'missing letters fail the stage at the line');
assert(first.failDetail.startsWith(`MISSING ${missed.join(' ')}.`) && first.failDetail.includes('KEPT'),
  `the card names what is missing and says the rest are kept (${first.failDetail})`);

applyResult(save, first);
assert(save.slot.campaign.mash[stage.id].join() === got.join(), 'a failed run still banks its letters');
assert(!(save.slot.campaign.plugs[stage.id] || [])[0], 'but not the mission plug');

// -------------------------------- banked letters return as outlines, still count
run = newRun();
assert(run.mission.count === got.length, `the next attempt starts holding the banked letters (${run.mission.count}/4)`);
const second = playOut(run, (r) => {
  for (const p of r.pickups) {
    if (p.def.mashLetter && got.includes(p.def.mashLetter) && p.skin !== `letter${p.def.mashLetter}Banked`) {
      r.badSkin = true;
    }
  }
});
assert(!run.badSkin, 'a banked letter is offered again in its outline skin');
assert(!second.success && second.failDetail.startsWith(`MISSING ${missed.join(' ')}.`),
  'and missing the same letters again still fails, naming only those');
applyResult(save, second);

// ------------------------------------------ all four banked clears the stage
run = newRun();
for (const L of missed) run.onPickup(makePickup(`letter${L}`, run.camX + 100, 30));
assert(run.missionSatisfied(), 'taking the missing letters satisfies the mission');
assert(!run.mashGold, 'and is not a gold MASH: the others were taken on another run');
const third = playOut(run);
assert(third.success, 'the run that finishes with all four banked clears the stage');
applyResult(save, third);
assert(save.slot.campaign.mash[stage.id].join('') === 'MASH', 'all four are banked, in letter order');
assert((save.slot.campaign.plugs[stage.id] || [])[0], 'and the mission plug with them');

// ------------------------------------------------------------ the gold MASH
freshSave();
run = newRun();
const score0 = run.score;
for (const L of MASH_LETTERS) run.onPickup(makePickup(`letter${L}`, run.camX + 100, 30));
assert(run.mashGold, 'all four in one run is the gold MASH');
const once = run.score - score0;
run.onPickup(makePickup('letterH', run.camX + 100, 30));
assert(run.score - score0 === once, `it pays once (+${once}), and a letter cannot be taken twice`);

// ------------------------------------------- a checkpoint offers them again
freshSave();
run = newRun();
const S = run.mission.letters.find((l) => l.letter === 'S');
let restoredFresh = false, offeredAgain = false, died = false;
playOut(run, (r) => {
  // Kill him once S has gone past, between the checkpoint behind it and the next.
  if (!died && S.missed && r.snapshot && r.camX < r.totalDist * 0.6) {
    died = true;
    r.restoreSnapshot(r.snapshot);
    const s = r.mission.letters.find((l) => l.letter === 'S');
    restoredFresh = !s.spawned && !s.missed;
  }
  if (died && !offeredAgain && r.pickups.some((p) => p.live && p.def.mashLetter === 'S')) offeredAgain = true;
});
assert(died, 'the bot passed S with a checkpoint behind it');
assert(restoredFresh, 'a checkpoint restore re-arms a letter still ahead of it');
assert(offeredAgain, 'and the letter is offered again on the way back through');

// -------------------------------------------------------- the edge marker
// Which letters ever earn one, over a run the bot plays on the lane.
const markedOver = (run) => {
  const marked = new Set();
  playOut(run, (r) => {
    for (const l of r.mission.letters) {
      if (r.mashMarker(l, r.camZoom, r.camPan || 0, r.camFloorY, r.camX, r.portraitWorldXOffset())) marked.add(l.letter);
    }
  });
  return [...marked].sort().join('');
};
freshSave();
assert(markedOver(newRun()) === 'AHS',
  'Field Service 3 marks the tunnel, staircase and sky-road letters, never the island one in shot');

// ------------------------------------------------- a stage with no roads
const LANE = 30;
for (const cfg of CONFIGS) {
  const run = newRun({ ...cfg, on: speed3 });
  const label = `speed-3 d${cfg.difficulty}${cfg.corrupted.length ? ` ${cfg.corrupted[0]}` : ''}`;
  const [M, A, S3, H3] = run.mission.letters;
  const cr = run.pitPlan[1].crossing, stone = cr?.stones[3];
  assert(run.mashRoadAt(M.x)?.kind === 'island' && !run.mashRoadAt(M.x).crossing, `${label}: M is on top of the opening island`);
  const pit = run.pitPlan[0];
  assert(Math.abs(A.x - (pit.x + pit.w / 2)) < 0.5 && A.alt === 44 && !A.clear, `${label}: A hangs over the middle of the tar pit`);
  assert(stone && Math.abs(S3.x - (stone.x + stone.w / 2)) < 0.5 && run.mashRoadAt(S3.x)?.kind === 'island',
    `${label}: S stands on the crossing's last stone`);
  const isl = run.routes.find((rt) => rt.kind === 'island' && !rt.crossing && rt.x / run.totalDist > 0.8);
  assert(isl && Math.abs(H3.x - (isl.x + isl.w + 50)) < 0.5 && H3.alt === 81 && !run.mashRoadAt(H3.x),
    `${label}: H hangs 81 up just past the island's end`);
}
let crowded = 0, laneMarks = 0, botGot = new Set();
for (let seed = 1; seed <= 6; seed++) {
  freshSave();
  const run = newRun({ seed, on: speed3 });
  const checked = new Set();
  const result = playOut(run, (r) => {
    const clear = 120;
    for (const l of r.mission.letters) {
      if (!r.mashRoadAt(l.x) && r.mashMarker(l, r.camZoom, r.camPan || 0, r.camFloorY, r.camX, r.portraitWorldXOffset())) laneMarks++;
      if (!l.clear || r.mashRoadAt(l.x) || checked.has(l.letter) || l.x > r.viewRightX()) continue;
      checked.add(l.letter);
      crowded += r.obstacles.filter((o) => o.live && !o.route && !o.tunnel && !o.def.isGap
        && !o.def.isBoost && o.x < l.x + clear && o.x + o.w > l.x - clear).length;
    }
  });
  for (const L of result.mashGot || []) botGot.add(L);
}
assert(crowded === 0, `nothing stands within a reaction runway of a bare lane letter (${crowded} across 6 seeds)`);
assert(laneMarks === 0, 'no Speed Zone 3 lane letter ever gets an edge marker');
assert(botGot.has('A') && botGot.has('S'), `the jump that clears the pit takes A, a clean crossing S (${[...botGot].join(' ')})`);

// ------------------------------------- Frost 3: letters in switched pits
// Each letter lies IN a hole at deck height, behind a frozen switch: the bridge
// the switch lays carries you through it, and a jump over the hole misses it.
{
  const frost3 = STAGE_BY_ID['frost-3'];
  for (const cfg of CONFIGS) {
    const run = newRun({ ...cfg, on: frost3 });
    const ok4 = run.pitPlan.length === 4 && run.pitPlan.every((pp) => pp.switch);
    const inHoles = [[1, 1], [3, 3]].every(([li, pi]) => {
      const l = run.mission.letters[li], pp = run.pitPlan[pi];
      return Math.abs(l.x - (pp.x + pp.w / 2)) < 0.5 && l.alt === 8 && !run.mashRoadAt(l.x);
    });
    const sky = run.mashRoadAt(run.mission.letters[2].x);
    const top = run.mashRoadAt(run.mission.letters[0].x);
    assert(ok4 && inHoles && sky?.kind === 'fork' && sky.sky && top?.kind === 'island' && !top.crossing,
      `frost-3 d${cfg.difficulty}${cfg.corrupted[0] ? ` ${cfg.corrupted[0]}` : ''}: four switched pits; M on the opening island, A and H in pits at deck height, S on the sky road`);
  }
  // Played twice: once by the bot alone, once with every switch hit as it arrives.
  for (const hit of [false, true]) {
    freshSave();
    const run = newRun({ on: frost3, seed: 3 });
    let linked = 0, unearned = 0;
    const seenSwitch = new Set();
    const result = playOut(run, (r) => {
      for (const o of r.obstacles) {
        if (!o.live || !o.def.isSwitch || o.gateId == null || seenSwitch.has(o.id)) continue;
        const hole = r.gateRecord(o.gateId);
        if (hole && Math.abs(hole.x - o.x - 120) < 1) { linked++; seenSwitch.add(o.id); }
      }
      if (hit) for (const o of r.obstacles) if (o.live && o.def.isSwitch && !o.thrown && o.x - r.playerWorldX() < 20) r.throwSwitch(o);
      for (const l of r.mission.letters) {
        // Only the pit letters (A, H) live behind a switch; M is on the island and S on the sky road.
        if (!l.got || l._checked || (l.letter !== 'A' && l.letter !== 'H')) continue;
        l._checked = true;
        const hole = r.obstacles.find((o) => o.def.isGap && l.x > o.x && l.x < o.x + o.w);
        if (!hole || !hole.bridged) unearned++;
      }
    });
    if (hit) {
      assert(linked >= 4, `every scripted pit stands a switch 120px before its lip, tied to it (${linked})`);
      assert(['A', 'H'].every((L) => (result.mashGot || []).includes(L)), 'hitting every switch takes the two pit letters');
    }
    assert(unearned === 0, `${hit ? 'with' : 'without'} the switches, no letter is taken from an unbridged hole`);
  }
}

if (failed) { console.error('MASH LETTERS: FAILED'); process.exit(1); }
console.log('MASH LETTERS: PASSED');
process.exit(0);
