import assert from 'node:assert/strict';
import { installDom } from './dom-stub.js';
installDom();
const { GravityRunState } = await import('../src/game/gravity/state.js');
const { RunState, GROUND_Y } = await import('../src/game/run.js');
const { screenYFor } = await import('../src/engine/camera.js');
const { save } = await import('../src/engine/save.js');
const { Input } = await import('../src/engine/input.js');
const { HEROES } = await import('../src/data/heroes.js');
const { GRAVITY_LEVEL: L, GRAVITY_CABINET } = await import('../src/game/gravity/model.js');
const { STAGE_BY_ID } = await import('../src/data/stages.js');
const { isGateField } = await import('../src/data/gravity-stages.js');
const { VACUUM_PREP_SECONDS, VACUUM_SHOT_SPEED, vacuumAttackPhase } = await import('../src/game/gravity/encounters.js');
const { VACUUM_SHOT_AHEAD, vacuumRobotAheadForView, vacuumShotAheadForView } = await import('../src/sprites/gravity-encounters.js');
save.load();
function create(hero = 'lorenzo', stageId = 'gravity-1') {
  save.newSlot(0, 0);
  const run = new GravityRunState({ save, stage: STAGE_BY_ID[stageId], initialHeroId: hero, difficulty: 1, seed: 42, onEnd: () => {} });
  run.enter(); return run;
}
for (const hero of HEROES) {
  const run = create(hero.id);
  for (let f = 0; f < 60 * 100 && !run.finishing && !run.finished; f++) {
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
  const ceilingScreenY = screenYFor(GROUND_Y - run.corridor, run.camZoom, run.camPan, run.camFloorY);
  assert.ok(ceilingScreenY - run.railWorld() * run.camZoom >= 21.5, `ceiling rail clears the HUD's first row (${ceilingScreenY.toFixed(1)}px)`);
  const framing = [run.camZoom, run.camPan, run.camFloorY];
  for (const y of [0, 40, 80, 113, 90, 60, 90, 113]) {
    run.player.y = y; run.player.vy = y - 80; run.updateCamera(1/60);
    assert.deepEqual([run.camZoom, run.camPan, run.camFloorY], framing, 'corridor camera stays fixed through ceiling jump and landing');
  }
  assert.equal(run.updateDead, RunState.prototype.updateDead, 'shared automatic death recovery');
  run.exit();
}
{
  const r = create();
  assert.deepEqual(r.playerDustSurface(), { y: GROUND_Y, away: -1 }, 'floor dust lifts off the floor');
  r.introFreeze = 0; r.introRunning = false;
  r.gravityLane = 1;
  assert.deepEqual(r.playerDustSurface(), { y: GROUND_Y - r.corridor, away: 1 }, 'ceiling dust falls into the corridor');
  r.player.y = r.corridor - 24; r.player.grounded = true; r.player.vy = 0;
  const finishCameraX = r.finishCameraX();
  const speed = r.baseSpeed();
  r.distance = finishCameraX - speed * 2.9;
  r.camX = r.distance;
  Input.release('jump'); Input.endFrame();
  r.update(1 / 60);
  assert.equal(r.gravityLane, 0, 'finish approach automatically requests the floor rail');
  assert.ok(r.gravityTransfer, 'automatic return uses the ordinary gravity transfer');
  for (let f = 0; f < 60 * 4 && !r.finishing && !r.finished; f++) r.update(1 / 60);
  assert.ok(r.finishing || r.finished, 'automatic return still reaches the finish');
  assert.equal(r.gravityLane, 0, 'finish pad approach is on the floor');
  assert.equal(r.gravityTransfer, null, 'floor return lands before the finish sequence');
  assert.equal(r.player.grounded, true, 'finish sequence begins with feet on the pad rail');
  r.exit();
}
// An arrow sets a persistent direction, not a short input window.
for (const [gateIndex, delay, source, target] of [[0, 0, 0, 1], [0, 170, 0, 1], [1, 170, 1, 0], [0, 170, 1, 1], [1, 170, 0, 0]]) {
  const r = create();
  const offset = r.playerWorldX() - r.camX + 6;
  r.camX = r.gravityGates[gateIndex].x - L.arrowLeftOffset + delay - offset;
  r.gravityLane = source; r.player.y = source ? r.corridor - 24 : 0;
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
  r.gravityLane = source; r.player.y = source ? r.corridor - 24 : 0;
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
// Walking through an arrow never changes the active surface. Campaign stages
// author their hazards explicitly instead of filling every inactive rail with
// an invisible trap.
{
  const r = create();
  const offset = r.playerWorldX() - r.camX;
  r.camX = r.gravityGates[0].x - offset + 2;
  r.player.update(1/60, { held: () => false, pressed: () => false }, { speed: 120, gravityScale: 1 });
  assert.equal(r.gravityLane, 0, 'running through does not flip');
  assert.equal(r.gravityTransfer, null);
  assert.equal(r.obstacles.some(o => o.gravityRail), false, 'inactive surfaces are not blanket-trapped');
  r.exit();
}
// All three replacement layouts keep their rails flat, while each gravity gate
// places spikes on the rail the runner has just left.
for (const stageId of ['gravity-1', 'gravity-3', 'gravity-2']) {
  const r = create('lorenzo', stageId);
  const floor = r.groundYAt(0);
  for (const x of [120, 840, 2100, 4800, 9600]) assert.equal(r.groundYAt(x), floor, `${stageId}: flat lane`);
  assert.equal(r.layout.pits, null, `${stageId}: no lane gaps`);
  assert.equal(Object.keys(r.layout.routes || {}).length, 0, `${stageId}: no hill or route geometry`);
  assert.equal(r.gravityStageData.surfaceBreaks, undefined, `${stageId}: continuous rails`);
  assert.equal(r.cabinet.hills, undefined, `${stageId}: outside ridges do not come from lane terrain`);
  for (const gate of r.gravityStageData.gates) {
    assert.ok(r.gravityStageData.hazards.some((h) => (isGateField(h.type) || h.type === 'maintenanceRollers')
      && h.lane === 1 - gate.lane && Math.abs(h.at - (gate.at + 1.25)) < 0.001),
    `${stageId}: transfer ${gate.at}s leaves a spike field behind`);
  }
  r.exit();
}
// THE LIVE WIRE (15 Oct 2026). Nothing stands between a gate and the wire on the rail
// it leaves — the field is lifted off, so a missed arrow walks onto the wire — and the
// wire biting jolts the hero (sprites/zap.js) where any other hazard just hits him.
{
  const r = create('lorenzo', 'gravity-1');
  const speed = r.baseSpeed();
  for (const g of r.gravityGates) {
    const lane = 1 - g.lane;
    const ahead = r.gravityHazards.filter((h) => h.lane === lane && h.x > g.x && h.x < g.x + 300);
    assert.ok(!ahead.some((h) => isGateField(h.type)), `gate ${g.x}: no field in front of the wire`);
    const first = ahead.sort((a, b) => a.x - b.x)[0];
    if (first) assert.equal(first.type, 'railPulse', `gate ${g.x}: the wire is the first thing on the rail left`);
  }
  assert.ok(r.gravityHazards.filter((h) => h.type === 'railPulse' && !h.bed && h.lane === 0
    && Math.abs(h.span * speed - 0.3 * speed) < 0.01).length >= 4, 'short floor wires to jump');
  r.player.iframes = 0;
  r.takeHit(null, false, 'railPulse');
  assert.ok(r.player.zapT > 0, 'the wire jolts the hero');
  r.player.iframes = 0; r.player.zapT = 0;
  r.takeHit(null, false, 'foilCrate');
  assert.equal(r.player.zapT, 0, 'a crate does not');
  r.exit();
}
// Exercise a real held ceiling jump, not just synthetic camera positions.
{
  const r = create();
  r.gravityLane = 1; r.player.y = r.corridor - 24; r.player.grounded = true;
  r.updateCamera();
  const framing = [r.camZoom, r.camPan, r.camFloorY];
  assert.equal(r.player.jumpPressed(), true);
  let lowest = r.player.y;
  for (let i = 0; i < 100; i++) {
    r.player.update(1/60, { held: () => true, pressed: () => false }, { speed: 120, gravityScale: 1 });
    r.updateCamera(1/60); lowest = Math.min(lowest, r.player.y);
    assert.deepEqual([r.camZoom, r.camPan, r.camFloorY], framing);
  }
  assert.ok(r.corridor - lowest > L.corridor * 0.56, 'jump crosses substantial corridor height');   // jumps keep their height in a taller corridor
  assert.equal(r.player.grounded, true, 'lands back on ceiling with fixed framing');
  r.exit();
}
// Low gravity buys airtime without moving the lane or sending jumps into HUD.
{
  const arcs = [];
  for (const stageId of ['gravity-1', 'gravity-3']) {
    const r = create('lorenzo', stageId);
    r.player.jumpPressed();
    let apex = 0, frames = 0;
    do {
      r.player.update(1/120, { held: () => true, pressed: () => false }, { speed: 120, gravityScale: 1 });
      apex = Math.max(apex, r.player.y); frames++;
    } while (!r.player.grounded && frames < 600);
    arcs.push({ apex, duration: frames / 120, corridor: r.corridor });
    r.exit();
  }
  assert.ok(arcs[1].duration > arcs[0].duration * 1.5, 'low gravity has substantially longer hang time');
  // 1.65 at the 137 corridor; at 86 the held arc is capped by the ceiling.
  assert.ok(arcs[1].apex > arcs[0].apex * 1.45, 'held low-gravity jump is much higher');
  assert.ok(arcs[1].apex <= arcs[1].corridor - 24 - 4, 'held jump stays below the ceiling');
  assert.ok(arcs[1].duration > 2.4, 'held jump lasts more than 2.4 seconds');
}
// Hold duration controls the extended arc for every hero, including heroes
// whose ordinary jump is fixed-height. A tap cannot span the long laser beds.
for (const hero of HEROES) {
  const r = create(hero.id, 'gravity-3');
  const arcs = [];
  for (const hold of [0.1, 0.6, 10]) {
    r.player = r.createPlayer(hero.id, []);
    r.player.jumpPressed();
    let apex = 0, frames = 0;
    do {
      const held = frames / 120 < hold;
      const previousVy = r.player.vy;
      r.player.update(1/120, { held: a => a === 'jump' && held, pressed: () => false }, { speed: r.baseSpeed() });
      if (!held && previousVy > 0) assert.ok(previousVy - r.player.vy < 10, 'release brakes smoothly, without a velocity snap');
      apex = Math.max(apex, r.player.y); frames++;
    } while (!r.player.grounded && frames < 1000);
    arcs.push({ apex, duration: frames / 120 });
  }
  assert.ok(arcs[0].apex < arcs[2].apex * 0.45, `${hero.id}: tap is a short hop`);
  assert.ok(arcs[1].apex > arcs[0].apex && arcs[1].apex < arcs[2].apex, `${hero.id}: intermediate holds shape the arc`);
  assert.ok(arcs[2].apex >= L.corridor * 0.5 && arcs[2].apex <= r.corridor - 28, `${hero.id}: held jump climbs near ceiling safely`);
  assert.ok(arcs[0].duration < 1.85 && arcs[2].duration > 2.25, `${hero.id}: wide crossing requires a hold`);
  assert.ok(arcs[2].duration < 4, `${hero.id}: holding cannot hover indefinitely`);
  r.exit();
}
// Completed cycles are banked in the physical snapshot, without double credit.
{
  const r = create('lorenzo', 'gravity-2');
  const first = r.gravityStageData.sequences[0];
  r.distance = (first.end - 0.1) * r.baseSpeed(); r.updateGravityMission();
  assert.equal(r.mission.count, 0, 'cycle is not credited during its attacks');
  const before = r.gravitySnapshot();
  r.distance = first.end * r.baseSpeed(); r.updateGravityMission(); r.updateGravityMission();
  assert.equal(r.mission.count, 1, 'cycle is credited once after clearing its final rollers');
  r.restoreGravity(before);
  assert.equal(r.mission.count, 0, 'rewind restores cycle progress');
  r.updateGravityMission(); assert.equal(r.mission.count, 1);
  r.exit();
}
// Vacuum phase order, opposite-rail pickup, and mirrored lane placement.
{
  const r = create('lorenzo', 'gravity-2');
  const floorAttack = r.gravityVacuumAttacks.find(a => a.lane === 0);
  const ceilingAttack = r.gravityVacuumAttacks.find(a => a.lane === 1);
  assert.equal(vacuumRobotAheadForView(400), 128, 'desktop keeps the original robot position');
  const portraitRobotAhead = vacuumRobotAheadForView(480 / 2.2);
  assert.ok(portraitRobotAhead < 128, 'portrait brings the hover vacuum fully into the narrower view');
  assert.equal(vacuumShotAheadForView(480 / 2.2), portraitRobotAhead - 24,
    'portrait launch point remains aligned to the robot outlet');
  assert.equal(floorAttack.sourceLane, 1, 'floor shot pulls its canister from the ceiling');
  assert.equal(ceilingAttack.sourceLane, 0, 'ceiling shot lifts its canister from the floor');
  assert.equal(vacuumAttackPhase(ceilingAttack, ceilingAttack.at - VACUUM_PREP_SECONDS - 0.01).phase, 'waiting');
  assert.equal(vacuumAttackPhase(ceilingAttack, ceilingAttack.at - VACUUM_PREP_SECONDS).phase, 'suction');
  assert.equal(vacuumAttackPhase(ceilingAttack, ceilingAttack.at - 0.7).phase, 'loaded');
  assert.equal(vacuumAttackPhase(ceilingAttack, ceilingAttack.at - 0.2).phase, 'telegraph');
  assert.equal(vacuumAttackPhase(ceilingAttack, ceilingAttack.at).phase, 'launched');
  assert.equal(r.gravityVacuumShots.length, 0, 'future canisters are visual only until the authored launch');
  r.exit();
  for (const attack of [floorAttack, ceilingAttack]) {
    const run = create('lorenzo', 'gravity-2');
    const authored = run.gravityVacuumAttacks.find(a => a.id === attack.id);
    run.distance = authored.at * run.baseSpeed(); run.camX = run.distance; run.fillGravityEntities();
    const shot = run.obstacles.find(o => o.gravityAuthoredId === attack.id);
    assert.ok(shot?.live, `${attack.id}: collision starts at launch`);
    assert.equal(shot.gravityCeiling != null, !!attack.lane, `${attack.id}: art and hitbox use its selected rail`);
    assert.equal(shot.x, authored.x, `${attack.id}: shot starts at the robot outlet`);
    run.exit();
  }
}
// These are actual hazards, not a timer that permits a no-input victory.
for (const stageId of ['gravity-3', 'gravity-2']) {
  const r = create('lorenzo', stageId);
  r.introFreeze = 0; r.introRunning = false;
  Input.release('jump'); Input.release('slide'); Input.endFrame();
  for (let f = 0; f < 60 * 15 && !r.damageTaken; f++) { r.update(1/60); Input.endFrame(); }
  assert.ok(r.damageTaken > 0, `${stageId}: ignoring the first hazard costs health`);
  r.exit();
}
// The ceiling is jump-only (13 Oct 2026): nothing up there asks for a duck,
// and the wrong rail retains its stage-specific warning layout.
for (const stageId of ['gravity-1', 'gravity-3', 'gravity-2']) {
  const r = create('lorenzo', stageId);
  const ducks = r.obstacles.filter(o => o.gravityCeiling != null && o.def.action === 'slide');
  assert.equal(ducks.length, 0, `${stageId}: no duck hazards on the ceiling`);
  for (const p of r.pickups) assert.equal(p.gravityCeiling != null ? 1 : 0, r.activeLaneAt(p.x), `${stageId}: reward at ${Math.round(p.x)} is on the running rail`);
  // One live wire per unbroken run of bed since 14 Oct, so measure the length lined.
  if (r.gravityGates.length) {
    const lined = r.gravityHazards.filter(h => h.bed).reduce((n, h) => n + (h.span || 0) * r.baseSpeed(), 0);
    assert.ok(r.gravityStageData.debrisRail ? lined > 0 && lined <= (r.gravityGates.length + 1) * 72 : lined > 1500,
      `${stageId}: ${r.gravityStageData.debrisRail ? 'short warning wires leave room for rubbish' : 'the wrong rail is lined with live wire'} (${Math.round(lined)} units)`);
  }
  r.exit();
}
// A jump that crosses the arrow while falling must not sink through the floor
// before the flip carries it up (13 Oct 2026: it went 14 px under).
for (const hero of ['lorenzo', 'ramon']) for (let off = -70; off <= -45; off += 1) {
  const r = create(hero, 'gravity-2');
  r.introFreeze = 0; r.introRunning = false; r.player.iframes = 999;
  const g = r.gravityGates.find(g => g.lane === 1);
  r.distance += g.x - L.arrowLeftOffset + off - r.playerWorldX(); r.camX = r.distance;
  r.gravityLane = 0; r.gravityGate = r.gravityGates.indexOf(g); r.player.y = 0; r.player.vy = 0; r.player.grounded = true;
  r.obstacles = []; r.pickups = [];
  let minY = 0;
  for (let f = 0; f < 120; f++) {
    if (f === 2) Input.press('jump'); else Input.release('jump');
    r.update(1 / 60); Input.endFrame(); minY = Math.min(minY, r.player.y);
  }
  assert.ok(minY > -1, `${hero} jumping ${off} from the arrow never goes below the floor (${minY.toFixed(1)})`);
  r.exit();
}
// Launched canisters use the same floor/ceiling hitbox as their visible sprite.
for (const lane of [0, 1]) {
  const r = create('lorenzo', 'gravity-2');
  r.introRunning = false; r.introFreeze = 0;
  const attack = r.gravityVacuumAttacks.find(a => a.lane === lane);
  const impactAt = attack.at + VACUUM_SHOT_AHEAD / (r.baseSpeed() + VACUUM_SHOT_SPEED);
  r.distance = impactAt * r.baseSpeed(); r.camX = r.distance;
  r.gravityLane = lane; r.player.y = lane ? r.corridor - 24 : 0;
  r.player.grounded = true; r.player.iframes = 0;
  r.fillGravityEntities();
  const shot = r.obstacles.find(o => o.gravityAuthoredId === attack.id);
  r.positionGravityHazards(); r.obstacles = [shot]; r.pickups = [];
  r.collide();
  assert.ok(r.damageTaken > 0, `launched canister hits a standing runner on rail ${lane}`);
  r.exit();
}
// Checkpoint reconstruction keeps the rollers intact; vacuum flight follows
// route time and rewind restores its exact position and launch cue state.
{
  const r = create('lorenzo', 'gravity-2');
  r.introFreeze = 0; r.introRunning = false;
  r.distance = 20.5 * r.baseSpeed(); r.camX = r.distance;
  r.gravityLane = 1; r.player.y = r.corridor - 24; r.player.grounded = true;
  r.updateGravityMission();
  const checkpoint = r.makeSnapshot();
  r.restoreSnapshot(checkpoint);
  const rollers = r.obstacles.find(o => o.gravityAuthoredId === 'rollers-1');
  assert.ok(rollers && rollers.x < r.playerWorldX() && rollers.x + rollers.w > r.playerWorldX(),
    'restoring halfway over rollers keeps the entire dangerous floor');
  const attack = r.gravityVacuumAttacks.find(a => a.id === 'vacuum-4');
  r.distance = (attack.at + 0.2) * r.baseSpeed(); r.camX = r.distance; r.updateGravityMission(); r.fillGravityEntities();
  const shot = r.obstacles.find(o => o.gravityAuthoredId === attack.id);
  const px = shot.x, rewind = {}; r.writeRewindSnapshot(rewind);
  r.distance += r.baseSpeed() * 0.25; r.updateGravityMission();
  assert.ok(shot.x < px, 'launched canister moves back toward the runner');
  r.restoreRewindSnapshot(rewind);
  assert.equal(r.obstacles.find(o => o.gravityAuthoredId === attack.id).x, px, 'rewind restores projectile position');
  r.updateGravityMission();
  assert.equal(r.obstacles.find(o => o.gravityAuthoredId === attack.id).x, px, 'resuming rewind keeps projectile position stable');
  const midShotCheckpoint = r.makeSnapshot();
  r.distance += r.baseSpeed() * 0.1; r.updateGravityMission();
  r.restoreSnapshot(midShotCheckpoint);
  assert.equal(r.obstacles.find(o => o.gravityAuthoredId === attack.id).x, px, 'checkpoint restore rebuilds the active projectile at the same phase');
  r.exit();
}
// Drive the authored levels with only jump and duck for the full roster.
// No shoot input, objective interaction, or perfect-hit invulnerability is used.
for (const hero of HEROES) for (const stageId of ['gravity-3', 'gravity-2']) {
  const r = create(hero.id, stageId);
  for (let f = 0; f < 60 * 110 && !r.finishing && !r.finished; f++) {
    const px = r.playerWorldX();
    const ob = r.obstacles.filter(o => o.live && !o.gravityRail && o.x + o.w > px
      && !!o.gravityCeiling === !!r.gravityLane).sort((a,b) => a.x-b.x)[0];
    const zone = r.gravityGates.filter(g => g.x - L.arrowLeftOffset <= px + 6).at(-1);
    const gate = zone && zone.lane !== r.gravityLane;
    if ((gate || (ob && ob.def.action === 'jump' && ob.x - px < 36)) && r.player.grounded && !r.gravityTransfer) Input.press('jump');
    else if (r.player.grounded) Input.release('jump');
    if (ob && ob.def.action === 'slide' && ob.x - px < 33 && r.player.grounded) Input.press('slide');
    else Input.release('slide');
    r.update(1/60); Input.endFrame();
  }
  assert.ok(r.finishing || r.finished,
    `${hero.id}/${stageId}: exits after its objective (dead=${r.dead}, t=${(r.distance / r.baseSpeed()).toFixed(2)}, `
      + `mission=${r.mission.count}, bonus=${r.challenge.count}, failed=${r.challenge.failed}, `
      + `fail=${r.failMsg}, deaths=${save.slot.stats.deaths}, lane=${r.gravityLane}, `
      + `cycles=${JSON.stringify(r.gravityMissionState.completed)})`);
  assert.equal(save.slot.stats.deaths, 0, `${hero.id}/${stageId}: authored route is survivable`);
  assert.equal(r.damageTaken, 0, `${hero.id}/${stageId}: route clears without damage`);
  if (stageId === 'gravity-2') assert.equal(r.mission.count, 3, `${hero.id}: all three cleaning cycles resolve`);
  assert.equal(r.challenge.failed, false, `${hero.id}/${stageId}: correct route keeps the bonus eligible`);
  r.exit();
}
const { bank, arrangement } = await import('../src/data/songs/gravity.js');
const { barPlan } = await import('../src/engine/lanes.js');
const { trackIdOf } = await import('../src/data/tracks.js');
assert.equal(GRAVITY_CABINET.music, bank);
assert.equal(trackIdOf(bank), 'gravity');
// The song's length, steps and loop points are authoring choices and change with it;
// the one thing that has to hold is that the loop does not run past the end.
assert.ok(arrangement.loop.toBar <= barPlan(bank).length + 1, 'the loop does not extend past the end of the song');
const run = create();
while (run.camX < 4) { run.update(1/60); Input.endFrame(); }
run.camX = 1450; run.distance = 1450; run.gravityLane = 1; run.gravityGate = 3;
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
assert.ok(run.obstacles.find(o => o.gravityCeiling === run.corridor), 'restored hazards retain ceiling mounts');
const rewind = {}; run.writeRewindSnapshot(rewind);
run.gravityLane = 0; run.restoreRewindSnapshot(rewind);
assert.equal(run.gravityLane, 1, 'rewind restores polarity');
const box = run.player.box(run.camX, 232);
assert.equal(box.y, 232 - L.corridor, 'ceiling hitbox is anchored to its supporting surface');
run.exit();
console.log('Gravity Grid: all three campaign routes, full-cast damage-free clears, low-gravity airtime, vacuum-shot collisions, shared recovery, fixed corridor camera, theme loop, ceiling collisions, checkpoint and rewind persistence passed.');
