// Spawn-ledger capture: one real headless run, reported as data.
//
// Child process, one run per invocation — the engine's singletons (save, Input,
// the DOM stubs) are module state, and eighteen runs through one process would
// be eighteen runs through one increasingly second-hand world. The parent
// (tools/capture-layout-baseline.js to write the fixture, tests/layout-parity.js
// to check against it) spawns this once per (stage, seed) and reads the JSON
// off stdout.
//
// What it records is everything the layout system is about to become
// responsible for: the enter()-time resolution (checkpoints, scripted pits,
// routes, the finish-dog roll, the loop) and the full spawn ledger — every
// obstacle and pickup the run creates, in creation order, at the position it
// was first seen. The bot from tests/run-complete.js drives; it reads only run
// state, so given one seed and one build it is deterministic, and the ledger
// is a fingerprint of generation, not of play.
//
// Usage: node tests/lib/capture-ledger.js <stageId> <seed>
import { installDom } from '../dom-stub.js';
installDom();

const stageId = process.argv[2];
const seed = Number(process.argv[3]);
if (!stageId || !Number.isFinite(seed)) {
  console.error('Usage: node tests/lib/capture-ledger.js <stageId> <seed>');
  process.exit(1);
}

const { RunState } = await import('../../src/game/run.js');
const { STAGE_BY_ID } = await import('../../src/data/stages.js');
const { save } = await import('../../src/engine/save.js');
const { Input } = await import('../../src/engine/input.js');
const { PLAYER_X } = await import('../../src/game/player.js');

const stage = STAGE_BY_ID[stageId];
if (!stage) { console.error(`no such stage: ${stageId}`); process.exit(1); }

save.load();
save.newSlot(0, 0);

let result = null;
const run = new RunState({
  stage,
  team: ['lorenzo', 'gnash', 'clara'],
  save,
  seed,
  difficulty: 1,
  announceBench: false,
  // Invulnerable so a missed jump never dies: a death re-enters the stage and
  // restores a snapshot, which is all deterministic but makes the ledger a
  // record of the bot's play instead of the stage's generation.
  devInvuln: true,
  // Objective missions (cords, chase, targets) can't be cleared by a bot that
  // only jumps and ducks; forcing the mission arms the finish so every stage
  // ends at the tape rather than at the clock.
  devForceMission: true,
  onEnd: (r) => { result = r; },
});
run.enter();

// enter()-time resolution, before a single frame runs.
const round1 = (v) => Math.round(v * 10) / 10;
const ledger = {
  stage: stageId,
  seed: run.seed,
  totalDist: round1(run.totalDist),
  duration: run.duration,
  checkpoints: run.checkpoints.map(round1),
  finishDogPlanned: run.finishDogPlanned,
  loopAt: run.loopAt == null ? null : round1(run.loopAt),
  pitPlan: run.pitPlan.map((p) => ({ x: round1(p.x), w: round1(p.w), crossing: !!p.crossing })),
  routes: run.routes.map((r) => ({ kind: r.kind, x: round1(r.x), w: round1(r.w) })),
  spawns: [],
};

// Every entity, at the tick it is first seen. Entity ids are one global
// increasing counter (entities.js), so sorting by id at the end recovers
// creation order even when obstacles and pickups arrive in the same frame.
//
// POSITION IS RECORDED ONLY FOR THINGS THAT STAY WHERE THEY WERE PUT.
//
// The ledger is meant to be a fingerprint of GENERATION, and a moving entity
// makes it a fingerprint of play instead: a coin drifting toward a magnet, a
// dog closing on the hero and a falling icicle are all somewhere slightly
// different depending on which frame first saw them, so one physics change
// three files away rewrites hundreds of rows that generation never touched.
// That is a test which cries wolf, and a test which cries wolf gets its
// baseline re-recorded until the day it was right.
//
// So a mover contributes its TYPE and its PLACE IN THE ORDER — which is the
// half of it the spawner decides, and the half a curated bag or a moved pit
// actually changes — and a static prop contributes its position too, because
// for those the position IS the decision.
const seen = new Set();
const spawns = [];
const moves = (def) => !!(def.coin || def.vx || def.airVx || def.falls || def.airDrift || def.bob);
function collect() {
  for (const ob of run.obstacles) {
    if (seen.has(ob.id)) continue;
    seen.add(ob.id);
    spawns.push(moves(ob.def)
      ? [ob.id, 'o', ob.type, null, round1(ob.w)]
      : [ob.id, 'o', ob.type, round1(ob.x), round1(ob.w)]);
  }
  for (const p of run.pickups) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    spawns.push(moves(p.def)
      ? [p.id, 'p', p.type, null, null]
      : [p.id, 'p', p.type, round1(p.x), round1(p.alt)]);
  }
}

const TICK = 1 / 60;
let duckHold = false;
let ticks = 0;
const MAX_TICKS = 60 * 60 * 6; // 6 minutes of sim time hard cap

collect();
while (!result && ticks < MAX_TICKS) {
  ticks++;
  // Bot: react to the nearest action obstacle ahead (tests/run-complete.js).
  const px = run.camX + PLAYER_X;
  let nearest = null;
  for (const ob of run.obstacles) {
    if (!ob.live || ob.def.action === 'none') continue;
    const front = ob.x + ob.w;
    if (front < px) continue;
    if (!nearest || ob.x < nearest.x) nearest = ob;
  }
  const sp = run.speed;
  if (!run.player.grounded) {
    // Hold the jump through the arc — releasing early cuts jump height.
  } else if (nearest && nearest.def.action === 'jump' && (nearest.x - px) < sp * 0.30 && (nearest.x - px) > -8) {
    Input.press('jump');
  } else {
    Input.release('jump');
  }
  if (nearest && nearest.def.action === 'duck' && (nearest.x - px) < sp * 0.4 && run.player.grounded) {
    if (!duckHold) { Input.press('duck'); duckHold = true; }
  } else if (duckHold) { Input.release('duck'); duckHold = false; }
  run.update(TICK);
  collect();
}

spawns.sort((a, b) => a[0] - b[0]);
ledger.spawns = spawns.map(([, kind, type, x, wOrAlt]) => [kind, type, x, wOrAlt]);
ledger.endDistance = round1(run.distance);
ledger.ended = !!result;
ledger.success = !!(result && result.success);

console.log(JSON.stringify(ledger));
process.exit(0);
