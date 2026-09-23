import assert from 'node:assert/strict';
import { installDom } from './dom-stub.js';
installDom();
const { GravityRunState } = await import('../src/dev/gravity/state.js');
const { RunState } = await import('../src/game/run.js');
const { save } = await import('../src/engine/save.js');
const { Input } = await import('../src/engine/input.js');
const { HEROES } = await import('../src/data/heroes.js');
const { GRAVITY_LEVEL: L } = await import('../src/dev/gravity/model.js');
save.load();
function create(hero = 'lorenzo') {
  save.newSlot(0, 0);
  const run = new GravityRunState({ save, initialHeroId: hero, difficulty: 1, seed: 42, onEnd: () => {} });
  run.enter(); return run;
}
for (const hero of HEROES) {
  const run = create(hero.id);
  for (let f = 0; f < 60 * 70 && !run.finishing && !run.finished; f++) {
    const px = run.playerWorldX();
    const ob = run.obstacles.filter(o => o.live && !o.gravityRail && o.x + o.w > px && !!o.gravityCeiling === !!run.gravityLane)
      .sort((a,b) => a.x-b.x)[0];
    const zone = run.gravityGates.filter(g => g.x - L.arrowLeftOffset <= px + 6).at(-1);
    const gate = zone && zone.lane !== run.gravityLane;
    if ((gate || (ob && ob.def.action === 'jump' && ob.x - px < 36)) && run.player.grounded && !run.gravityTransfer) Input.press('jump');
    else if (run.player.grounded) Input.release('jump');
    if (ob && ob.def.action === 'slide' && ob.x - px < 33 && run.player.grounded) Input.press('slide');
    else Input.release('slide');
    run.update(1/60); Input.endFrame();
  }
  assert.ok(run.finishing || run.finished, `${hero.id}: reaches normal finish`);
  assert.equal(save.slot.stats.deaths, 0, `${hero.id}: no hidden restart`);
  assert.equal(run.damageTaken, 0, `${hero.id}: clears without damage`);
  assert.equal(run.gravityGate, 10, `${hero.id}: takes every gate`);
  assert.ok(run.coins >= 30, `${hero.id}: collects ordinary coins on both surfaces (${run.coins})`);
  assert.ok(run instanceof RunState);
  assert.ok(run.usedHeroes.size >= 3, 'normal portals tag two new heroes');
  assert.ok(run.powerupsCollected > 0, 'normal powerups spawn and can be collected');
  assert.equal(run.draw, RunState.prototype.draw, 'shared HUD and draw path');
  run.updateCamera();
  const framing = [run.camZoom, run.camPan, run.camFloorY];
  for (const y of [0, 40, 80, 113, 90, 60, 90, 113]) {
    run.player.y = y; run.player.vy = y - 80; run.updateCamera(1/60);
    assert.deepEqual([run.camZoom, run.camPan, run.camFloorY], framing, 'corridor camera stays fixed through ceiling jump and landing');
  }
  assert.equal(run.updateDead, RunState.prototype.updateDead, 'shared automatic death recovery');
  run.exit();
}
// An arrow sets a persistent direction, not a short input window.
for (const [gateIndex, delay, source, target] of [[0, 0, 0, 1], [0, 170, 0, 1], [1, 170, 1, 0], [0, 170, 1, 1], [1, 170, 0, 0]]) {
  const r = create();
  const offset = r.playerWorldX() - r.camX + 6;
  r.camX = r.gravityGates[gateIndex].x - L.arrowLeftOffset + delay - offset;
  r.gravityLane = source; r.player.y = source ? L.corridor - 24 : 0;
  r.player.grounded = true;
  assert.equal(r.player.jumpPressed(), true);
  assert.equal(r.gravityLane, target, 'latest arrow governs late jumps in either direction');
  assert.equal(!!r.gravityTransfer, source !== target, 'jumping on the correct rail does not flip again');
  r.exit();
}
{
  const r = create();
  r.camX = r.gravityGates[0].x - L.arrowLeftOffset - (r.playerWorldX() - r.camX + 6) - 1;
  r.player.grounded = true; r.player.jumpPressed();
  assert.equal(r.gravityLane, 0, 'jump before first arrow stays local');
  assert.equal(r.gravityTransfer, null);
  r.exit();
}
// A jump begun before either marker flips on crossing its left edge, with
// no second press and without waiting to reach the middle of the arrows.
for (const source of [0, 1]) {
  const r = create();
  const g = r.gravityGates[source];
  const offset = r.playerWorldX() - r.camX + 6;
  r.gravityLane = source; r.player.y = source ? L.corridor - 24 : 0;
  r.player.grounded = true;
  r.camX = g.x - L.arrowLeftOffset - offset - 20;
  r.player.jumpPressed();
  const idle = { held: () => true, pressed: () => false };
  r.player.update(1/60, idle, { speed: 120, gravityScale: 1 });
  assert.equal(r.gravityLane, source, 'early jump waits until left marker');
  r.camX += 20;
  r.player.update(1/60, idle, { speed: 120, gravityScale: 1 });
  assert.equal(r.gravityLane, 1 - source, 'crossing mid-jump flips immediately at left edge');
  assert.ok(r.gravityTransfer);
  const transfer = r.gravityTransfer;
  r.player.update(1/60, idle, { speed: 120, gravityScale: 1 });
  assert.equal(r.gravityTransfer, transfer, 'transfer is not restarted every frame');
  r.exit();
}
// Missing a switch does not flip gravity. Real rail traps cause the damage,
// and only repeated fatal misses reveal the local sign, including start retries.
{
  const r = create();
  while (r.camX < 4) { r.update(1/60); Input.endFrame(); }
  const offset = r.playerWorldX() - r.camX;
  r.camX = r.gravityGates[0].x - offset + 2;
  r.player.update(1/60, { held: () => false, pressed: () => false }, { speed: 120, gravityScale: 1 });
  assert.equal(r.gravityLane, 0, 'running through does not flip');
  assert.equal(r.gravityTransfer, null);
  for (let attempt = 1; attempt <= 2; attempt++) {
    while (r.introFreeze > 0 || r.introRunning) { r.update(1/60); Input.endFrame(); }
    const trap = r.obstacles.find(o => o.gravityRail && !o.gravityCeiling && o.x > r.gravityGates[0].x);
    r.camX = trap.x - offset + 2; r.player.y = 0; r.player.vy = 0;
    r.player.grounded = true; r.player.iframes = 0;
    r.battery = 1; r.powerups.shieldStack = 0;
    r.collide();
    assert.equal(r.dead, true, 'wrong-surface trap causes ordinary death');
    assert.equal(r.gravityFailures.get(0), attempt);
    for (let i = 0; i < 120 && r.dead; i++) r.update(1/60);
    assert.equal(r.dead, false, 'normal automatic restart');
    assert.equal(r.gravityHints().has(0), attempt >= 2, 'sign only after second fatal miss');
  }
  r.exit();
}
// Exercise a real held ceiling jump, not just synthetic camera positions.
{
  const r = create();
  r.gravityLane = 1; r.player.y = L.corridor - 24; r.player.grounded = true;
  r.updateCamera();
  const framing = [r.camZoom, r.camPan, r.camFloorY];
  assert.equal(r.player.jumpPressed(), true);
  let lowest = r.player.y;
  for (let i = 0; i < 100; i++) {
    r.player.update(1/60, { held: () => true, pressed: () => false }, { speed: 120, gravityScale: 1 });
    r.updateCamera(1/60); lowest = Math.min(lowest, r.player.y);
    assert.deepEqual([r.camZoom, r.camPan, r.camFloorY], framing);
  }
  assert.ok(lowest < 60, 'jump crosses substantial corridor height');
  assert.equal(r.player.grounded, true, 'lands back on ceiling with fixed framing');
  r.exit();
}
const { bank, arrangement } = await import('../src/data/songs/gravity.js');
const { barPlan, songBars } = await import('../src/engine/lanes.js');
const { trackIdOf } = await import('../src/data/tracks.js');
const { GRAVITY_CABINET } = await import('../src/dev/gravity/model.js');
assert.equal(GRAVITY_CABINET.music, bank);
assert.equal(trackIdOf(bank), 'gravity');
assert.equal(barPlan(bank).length, 32);
assert.equal(arrangement.loop.toBar, 32);
for (const section of bank.sections) for (const [key, steps] of Object.entries(section)) {
  assert.equal(steps.length, 32, key);
  for (const v of steps.flat()) assert.ok(v == null || typeof v === 'boolean' || Number.isFinite(v), key);
}
assert.ok(new Set(songBars(bank).map(({ b, half }) => JSON.stringify(b.lead.slice(half * 16, half * 16 + 16)))).size >= 24,
  'theme varies its melodic phrases across the full form');
const run = create();
while (run.camX < 4) { run.update(1/60); Input.endFrame(); }
run.camX = 1422; run.distance = 1422; run.gravityLane = 1; run.gravityGate = 3;
run.player.y = L.corridor - 24; run.checkCheckpoints();
const checkpoint = run.snapshot;
assert.ok(checkpoint);
run.camX += 140; run.distance = run.camX;
run.battery = 0; run.die('TEST', false);
for (let f = 0; f < 32; f++) run.update(1/60);
assert.equal(run.dead, false, 'death recovers automatically without retry input');
assert.ok(Math.abs(run.camX - checkpoint.camX) <= 4, 'returns to checkpoint');
assert.equal(run.gravityLane, 1, 'checkpoint restores ceiling polarity');
assert.equal(run.player.y, L.corridor - 24, 'checkpoint restores ceiling footing');
assert.equal(run.battery, run.maxBattery());
assert.ok(run.obstacles.find(o => o.gravityCeiling === L.corridor), 'restored hazards retain ceiling mounts');
const rewind = {}; run.writeRewindSnapshot(rewind);
run.gravityLane = 0; run.restoreRewindSnapshot(rewind);
assert.equal(run.gravityLane, 1, 'rewind restores polarity');
const box = run.player.box(run.camX, 232);
assert.equal(box.y, 232 - L.corridor, 'ceiling hitbox is anchored to its supporting surface');
run.exit();
console.log('Gravity RunState: full-cast clean clears, shared renderer/death, fixed corridor camera, 32-bar theme, ceiling collisions, checkpoint recovery and rewind passed.');
