// Regression coverage for terminal guards, input ordering, collisions, and mods.
import { installDom } from './dom-stub.js';
installDom();

const { Input } = await import('../src/engine/input.js');
const { Audio } = await import('../src/engine/audio.js');
const { setState, updateState } = await import('../src/engine/states.js');
const { RunState } = await import('../src/game/run.js');
const { BossState } = await import('../src/game/boss.js');
const { MinigameState } = await import('../src/game/minigames/index.js');
const { HubState } = await import('../src/game/hub/index.js');
const { TitleState, SettingsState } = await import('../src/game/menus.js');
const { makeObstacle, makePickup, PICKUPS } = await import('../src/game/entities.js');
const { DripSpawner } = await import('../src/game/spawner.js');
const { Rng } = await import('../src/engine/rng.js');
const { PLAYER_X } = await import('../src/game/player.js');
const { VIEW_W } = await import('../src/engine/camera.js');
const { wrapText, textWidth } = await import('../src/engine/sprites.js');
const { chrome } = await import('../src/engine/renderer.js');
const { save } = await import('../src/engine/save.js');
const { Save, defaultSlot, defaultSettings } = await import('../src/engine/save.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

save.load(); save.newSlot(0, 0);
const stage = { id: 'reliable-1', cabinet: 'plumber', index: 1, mission: { type: 'reach', desc: 'TEST' }, challenge: { type: 'coins', n: 99, desc: 'TEST' }, durationSec: 40, applianceAt: 0.5 };
const makeRun = (onEnd = () => {}) => new RunState({ stage, save, seed: 44, difficulty: 1, onEnd });

let completions = 0;
let run = makeRun(() => completions++); run.enter();
run.endRun(true); run.endRun(true); run.update(1 / 60);
assert(completions === 1, 'run completion callback is one-shot');

// Pausing borrows the menu mappings without leaving run context. Every route
// through the pause screen must swap those mappings and drop held gameplay
// input, then put the run mappings back cleanly on resume.
{
  const pausedRun = makeRun(); pausedRun.enter();
  Input.press('jump');
  Input.press('escape'); pausedRun.update(1 / 60);
  assert(pausedRun.paused && Input.menuKeys, 'pausing a run enables menu key meanings');
  assert(!Input.held('jump') && !Input.pressed('jump'), 'entering pause drops held and pending gameplay input');
  assert(Input.actionForKey('ArrowUp') === 'up' && Input.actionForKey('ArrowDown') === 'down',
    'paused arrows navigate the pause plates');
  assert(Input.padAction(0) === 'confirm' && Input.padAction(12) === 'up' && Input.padAction(13) === 'down',
    'paused gamepad buttons use the same menu actions');
  assert(Input.buttons.map((b) => `${b.id}:${b.action}`).join(',') === 'resume:pause,quit:escape',
    'touch pause plates dispatch the same continue and exit actions');

  Input.press('down'); pausedRun.update(1 / 60);
  assert(pausedRun.pauseIdx === 1, 'pause selection moves to EXIT');
  Input.press('up'); pausedRun.update(1 / 60);
  assert(pausedRun.pauseIdx === 0, 'pause selection moves back to CONTINUE');
  Input.press('confirm'); pausedRun.update(1 / 60);
  assert(!pausedRun.paused && !Input.menuKeys, 'confirming CONTINUE restores run key meanings');
  assert(Input.actionForKey('ArrowUp') === 'jump' && Input.actionForKey('ArrowRight') === 'ability',
    'resumed arrows drive the hero again');

  pausedRun.paused = true; pausedRun.pauseChanged();
  Input.press('up');
  pausedRun.paused = false; pausedRun.pauseChanged();
  assert(!Input.held('up'), 'leaving pause also drops an action held across the mapping change');

  let quitResult = null;
  const quitRun = makeRun((result) => { quitResult = result; }); quitRun.enter();
  Input.press('escape'); quitRun.update(1 / 60);
  Input.press('down'); quitRun.update(1 / 60);
  Input.press('confirm'); quitRun.update(1 / 60);
  assert(quitResult && !quitResult.success && quitResult.reason === 'QUIT',
    'confirming EXIT follows the normal quit result path');

  const resetRun = makeRun(); resetRun.enter();
  Input.press('escape'); resetRun.update(1 / 60);
  resetRun.pauseIdx = 1;
  Input.press('pause'); resetRun.update(1 / 60);
  Input.press('pause'); resetRun.update(1 / 60);
  assert(resetRun.paused && resetRun.pauseIdx === 0, 'pause always reopens with CONTINUE selected');
  Input.clearAll();
}

let airborneFinish = null;
run = makeRun((result) => { airborneFinish = result; }); run.enter();
run.player.y = 80;
run.player.grounded = false;
// Arm the finish where the run itself arms it. The trigger is tested every
// frame, so a real camera is never more than one frame past finishCameraX;
// skipping ahead to totalDist instead leaves the tape already level with the
// hero, and there is then no run-in left for them to make.
run.camX = run.finishCameraX();
run.update(1 / 60);
const finishCam = run.camX;
for (let i = 0; i < 30; i++) run.update(1 / 60);
assert(run.finishing && run.camX === finishCam && run.finishPlayerX > PLAYER_X && !airborneFinish,
  'finish locks the camera while the playable hero run-in crosses the screen');
for (let i = 0; i < 240 && !airborneFinish; i++) run.update(1 / 60);
assert(airborneFinish && airborneFinish.success, 'jumping cannot clear the stage finish plane');

run = makeRun(); run.enter();
const finalEnemy = makeObstacle('zombie', run.finishWorldX() - 24);
const postFinishEnemy = makeObstacle('zombie', run.finishWorldX() + 24);
run.obstacles = [finalEnemy, postFinishEnemy];
run.startFinishRun();
assert(run.obstacles.includes(finalEnemy) && !run.obstacles.includes(postFinishEnemy),
  'the final stretch keeps enemies before the finish but clears anything beyond it');

run.player.iframes = 0;
run.obstacles = [makeObstacle('zombie', run.playerWorldX())];
const cellsBeforeFinishHit = run.battery;
run.collide();
assert(run.battery === cellsBeforeFinishHit - 1,
  'hazards can still damage the player while the finish camera is locked');

// The final stretch keeps its hazards, so it has to be losable as well as
// survivable. Dying there used to hand every remaining frame to updateFinish,
// which bails on `dead` before the tape check: deadT never advanced, nothing
// ever ended the attempt, and the hero slid away off a frozen camera forever.
let deathOnLap = null;
const lapRun = makeRun((result) => { deathOnLap = result; }); lapRun.enter();
lapRun.camX = lapRun.finishCameraX();
lapRun.update(1 / 60);
assert(lapRun.finishing, 'finish run armed for the death-on-the-lap check');
lapRun.oneHit = true;           // no checkpoint to fall back to: this ends the attempt
lapRun.battery = 1;
lapRun.player.iframes = 0;
lapRun.obstacles = [makeObstacle('zombie', lapRun.playerWorldX())];
lapRun.update(1 / 60);
assert(lapRun.dead, 'a hazard on the final stretch can still be fatal');
const lapX = lapRun.finishPlayerX;
for (let i = 0; i < 60 * 5 && !deathOnLap; i++) lapRun.update(1 / 60);
assert(deathOnLap && !deathOnLap.success, 'dying on the finish run resolves the attempt as a loss');
assert(lapRun.deadT > 0, 'the death animation advances instead of the finish run holding the frame');
assert(lapRun.finishPlayerX === lapX, 'a dead hero stops where they fell rather than sliding off the frozen camera');

// A checkpoint death on the final stretch returns ownership to the scrolling
// camera. From there the same attempt can reach and finish the tape exactly
// once instead of resuming frozen in the victory lap.
let restoredFinishResult = null, restoredFinishEnds = 0;
const restoredFinish = makeRun((result) => { restoredFinishResult = result; restoredFinishEnds++; }); restoredFinish.enter();
restoredFinish.camX = restoredFinish.finishCameraX() - 120;
restoredFinish.snapshot = restoredFinish.makeSnapshot();
const checkpointX = restoredFinish.snapshot.camX;
restoredFinish.camX = restoredFinish.finishCameraX();
restoredFinish.startFinishRun();
restoredFinish.finishPlayerX += 20;
restoredFinish.battery = 0;
restoredFinish.die('TEST FINISH DEATH');
restoredFinish.updateDead(1.5);
assert(!restoredFinish.dead && !restoredFinish.finishing && restoredFinish.camX === checkpointX
  && restoredFinish.finishPlayerX === PLAYER_X,
  'checkpoint restore resets a death during the finish run');
restoredFinish.camX = restoredFinish.finishCameraX();
restoredFinish.obstacles = []; restoredFinish.pickups = [];
for (let i = 0; i < 300 && !restoredFinishResult; i++) restoredFinish.update(1 / 60);
assert(restoredFinishResult?.success, 'a restored finish attempt can complete normally');
restoredFinish.endRun(true);
assert(restoredFinishResult?.success && restoredFinishEnds === 1,
  'death, restore and finish still resolve through one completion');

// A resident picked up after the normal finish threshold counts immediately,
// and the already-visible tape stays where it was when the victory run begins.
const rescueStage = { ...stage, mission: { type: 'rescue', n: 1, count: 0, desc: 'TEST' } };
const rescueRun = new RunState({ stage: rescueStage, save, seed: 46, difficulty: 1, onEnd() {} });
rescueRun.enter();
rescueRun.camX = rescueRun.finishCameraX() + 18;
const follower = makePickup('resident', rescueRun.playerWorldX(), 0); follower.following = true;
rescueRun.pickups = [follower]; rescueRun.obstacles = [];
rescueRun.update(1 / 60);
assert(rescueRun.finishing && rescueRun.missionSatisfied(), 'a late following resident completes the rescue mission');
const visibleTapeX = rescueRun.finishScreenX();
rescueRun.update(1 / 60);
assert(rescueRun.finishScreenX() === visibleTapeX && visibleTapeX < VIEW_W - 32,
  'a late-completed mission starts a shortened finish run without moving the tape');

// Counted mission failures carry the exact counter tested by the win check.
const shortStage = { ...stage, mission: { type: 'cords', n: 4, count: 3, desc: 'TEST' } };
let shortResult = null;
const shortRun = new RunState({ stage: shortStage, save, seed: 47, difficulty: 1, onEnd: (result) => { shortResult = result; } });
shortRun.enter(); shortRun.mission.count = 3; shortRun.camX = shortRun.totalDist; shortRun.obstacles = []; shortRun.pickups = [];
shortRun.update(1 / 60);
assert(shortResult?.failDetail === 'CORDS 3/4', 'mission failure reports the exact objective shortfall');

// Objective replacements are capped to the last drawable spot before the
// breaker, and suppressed once that spot is no longer ahead of the viewport.
const objectiveRun = new RunState({ stage: shortStage, save, seed: 48, difficulty: 1, onEnd() {} });
objectiveRun.enter(); objectiveRun.pickups = [];
objectiveRun.camX = objectiveRun.finishCameraX() - VIEW_W;
const spawnedCord = objectiveRun.spawnObjective('cord', 30);
const lastCord = objectiveRun.pickups.at(-1);
assert(spawnedCord && lastCord.x >= objectiveRun.camX + VIEW_W
  && lastCord.x + PICKUPS.cord.w + 24 <= objectiveRun.finishWorldX(),
  'a late cord spawns ahead of view and before the finish');
objectiveRun.camX = objectiveRun.finishWorldX() - PICKUPS.resident.w - 24 - VIEW_W + 1;
const beforeResidents = objectiveRun.pickups.length;
assert(!objectiveRun.spawnObjective('resident', 0) && objectiveRun.pickups.length === beforeResidents,
  'an objective is not spawned when no reachable runway remains');
objectiveRun.mission = { type: 'rescue', n: 3, count: 1 };
const carriedA = makePickup('resident', 0, 0); carriedA.following = true;
const carriedB = makePickup('resident', 0, 0); carriedB.following = true;
objectiveRun.pickups = [carriedA, carriedB];
assert(objectiveRun.missionCount() === 3 && objectiveRun.missionSatisfied(),
  'rescue progress includes delivered and currently-following residents');

const fullDrip = new DripSpawner(new Rng(1), {});
fullDrip.batteryTimer = 0;
const fullPickups = [];
fullDrip.update(0, 0, fullPickups, false, true);
assert(!fullPickups.some((p) => p.type === 'battery'),
  'full health suppresses an unnecessary battery pickup');
const hurtDrip = new DripSpawner(new Rng(1), {});
hurtDrip.batteryTimer = 0;
const hurtPickups = [];
hurtDrip.update(0, 0, hurtPickups, false, false);
assert(hurtPickups.some((p) => p.type === 'battery'),
  'battery pickup still spawns when health is not full');

run.relay.current = 'b33p';
const shotTarget = makeObstacle('cactus', run.playerWorldX() + 52);
run.obstacles = [shotTarget];
run.player.abilityCd = 0;
run.useAbility();
run.updateProjectiles(0.12, run.speed);
assert(!shotTarget.live,
  'hero attacks still hit final-stretch obstacles while the finish camera is locked');

const targetStage = { ...stage, mission: { type: 'targets', n: 1, desc: 'TEST' } };
let incompleteFinish = null;
run = new RunState({ stage: targetStage, save, seed: 45, difficulty: 1, onEnd: (result) => { incompleteFinish = result; } });
run.enter();
run.player.y = 80;
run.player.grounded = false;
run.camX = run.totalDist;
run.update(1 / 60);
assert(incompleteFinish && !incompleteFinish.success && incompleteFinish.failMsg === 'MISSION INCOMPLETE',
  'the finish ends an attempt whose mission is incomplete');

let miniEnds = 0;
const mini = new MinigameState({ game: 'blocksurge', seed: 2, settings: save.settings, onEnd: () => miniEnds++ });
mini.enter(); mini.result = false;
for (let i = 0; i < 100; i++) mini.update(1 / 60);
assert(miniEnds === 1, 'minigame result callback is one-shot');
mini.exit();

// Global state polling exposes gamepad edge presses before state consumption.
let sawPadJump = false;
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => [{ buttons: [{ pressed: true }], axes: [0, 0] }] } });
Input.setContext('default');
setState({ enter() {}, update() { sawPadJump = Input.pressed('jump'); Input.endFrame(); }, draw() {} });
updateState(1 / 60);
assert(sawPadJump, 'gamepad edge press is available during state update');
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => [] } });
Input.clearAll();
Input.setContext('run');
assert(Input.actionForKey('Escape') === 'escape', 'Escape has an explicit run action');
Input.setContext('default');
assert(Input.actionForKey('Escape') === 'back', 'Escape remains Back outside runs');
Input.setContext('menu');
assert(Input.actionForKey('ArrowUp') === 'up' && Input.actionForKey('ArrowDown') === 'down', 'menu arrow keys have distinct up/down actions');
assert(Input.actionForKey('Space') === 'confirm', 'Space confirms instead of moving a menu row');
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => [{ buttons: [{ pressed: true }], axes: [0, 0] }] } });
Input.pollGamepad();
assert(Input.pressed('confirm'), 'gamepad primary face button confirms in menus');
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => [] } });
Input.clearAll();

const volumeSave = new Save(); volumeSave.load();
const settings = new SettingsState({ save: volumeSave, onDone() {} });
settings.volumeOption('music', 'MUSIC VOLUME').adjust(-1);
settings.volumeOption('sfx', 'SFX VOLUME').adjust(-1);
assert(volumeSave.settings.volumes.music === 0.6 && volumeSave.settings.volumes.sfx === 0.8, 'music and SFX settings adjust independently');
assert(Audio.levels.music === 0.6 && Audio.levels.sfx === 0.8, 'volume changes apply to the audio buses immediately');

// Erasing a save requires choosing the slot and accepting two separate,
// default-NO confirmations. Nothing is removed after only the first warning.
const eraseSave = new Save(); eraseSave.load(); eraseSave.newSlot(1, 123);
const title = new TitleState({
  save: eraseSave,
  onSlotChosen() {}, onOvertime() {}, onSettings() {}, onHowTo() {},
  onGuide() {}, onSoundTest() {},
});
title.enter(); title.beginErase();
const tapTitle = (action) => {
  Input.press(action); title.update(0); Input.release(action); Input.endFrame();
};
tapTitle('down'); // select occupied FILE 2 if another occupied slot precedes it
tapTitle('confirm');
assert(title.erase?.step === 'confirm' && eraseSave.data.slots[1], 'erase flow selects a file without deleting it');
tapTitle('down'); tapTitle('confirm');
assert(title.erase?.step === 'final' && eraseSave.data.slots[1], 'first erase confirmation does not delete the file');
tapTitle('down'); tapTitle('confirm');
assert(!eraseSave.data.slots[1] && !title.erase, 'second erase confirmation deletes only the selected file');
Input.clearAll();

const hubFlow = { hubPosition: null };
const oldHub = new HubState({ save, flow: hubFlow });
oldHub.px = 438; oldHub.facing = -1; oldHub.exit();
const returnedHub = new HubState({ save, flow: hubFlow }); returnedHub.enter();
assert(returnedHub.px === 438 && returnedHub.facing === -1, 'food-court position and facing survive a state round trip');
assert(Input.context === 'hub' && Input.actionForKey('Space') === 'jump',
  'Space maps to jump in the food court');
assert(Input.actionForKey('ArrowUp') === 'up' && Input.actionForKey('ArrowDown') === 'down',
  'food-court chooser navigation stays on Up/Down');
Input.press('jump'); returnedHub.update(1 / 60); Input.release('jump'); Input.endFrame();
assert(returnedHub.jumpY > 0 && returnedHub.jumpVy > 0,
  'Space starts a physical food-court jump');
for (let i = 0; i < 60; i++) returnedHub.update(1 / 60);
assert(returnedHub.jumpY === 0 && returnedHub.jumpVy === 0,
  'the food-court jump lands cleanly');
chrome.mode = 'side';
chrome.jump = { x: 35, y: 220, r: 32, zone: { x: 0, y: 0, w: 70, h: 270 } };
chrome.ability = { x: 925, y: 220, r: 32, zone: { x: 890, y: 60, w: 70, h: 210 } };
Input.usingTouch = false;
returnedHub.setChromeWalkButtons();
assert(Input.chromeButtons.length === 0,
  'food court keeps second-canvas walking controls hidden outside touch mode');
Input.usingTouch = true;
returnedHub.setChromeWalkButtons();
assert(Input.chromeButtons.map((b) => b.action).join(',') === 'left,right',
  'food court registers left/right walking controls on the second canvas in touch mode');
const hubWalkStart = returnedHub.px;
const npcStart = returnedHub.npcs()[1].x;
Input.press('right');
returnedHub.update(0.5); Input.endFrame();
const firstHubStep = returnedHub.px - hubWalkStart;
returnedHub.update(0.5);
const secondHubStep = returnedHub.px - hubWalkStart - firstHubStep;
Input.release('right'); Input.endFrame();
assert(firstHubStep === 60, 'food-court walking starts at the precise 120-unit pace');
assert(secondHubStep > firstHubStep, 'holding a food-court direction smoothly accelerates walking');
chrome.mode = 'none'; returnedHub.setChromeWalkButtons();
Input.usingTouch = false;
assert(returnedHub.npcs()[1].x !== npcStart, 'food-court heroes stroll during their loiter cycle');
returnedHub.px = hubWalkStart;
for (let i = 0; i < 200; i++) returnedHub.update(0.1);
// The old rule here was "never stray more than 17 from home", which kept the
// crowd in tiny fenced pens. Heroes now range widely — walking past a machine is
// what a concourse looks like — so the guarantees that actually matter are
// about where they STOP and how far they can get, not about a leash.
assert(returnedHub.npcs().every((n) => Math.abs(n.x - n.home) <= n.roam + 1.01),
  'wandering heroes stay within their own stretch of the concourse');
assert(returnedHub.npcs().every((n) => n.x >= 69.99),
  'wandering heroes never drift back onto the exit');
// Pinned staff are exempt: the guarantee is that nobody WANDERS to a stop in
// front of a machine, and Dolores is stationed behind the serving counter on
// purpose — standing at her own station is the entire job. Asserting over her
// would be asserting that the counter has nobody behind it.
// `attending` is excluded for the same reason as `pinned`: the guarantee is
// about where a hero CHOOSES to stop, and one who has broken off to face the
// player stopped where the player walked up to them, which may well be in front
// of a machine. That is the correct behaviour, not a settle.
assert(returnedHub.npcs().filter((n) => n.state === 'idle' && !n.pinned && !n.attending)
  .every((n) => returnedHub.canLoiter(n.x)),
'wandering heroes settle clear of every station rather than in front of one');
// Staff shuffle along their own deck and come back, so the guarantee is a leash
// rather than a fixed x — but it has to be a SHORT one: they are drawn inside
// their counters, and any drift past the unit would paint them through its side.
assert(returnedHub.npcs().filter((n) => n.pinned).every((n) => Math.abs(n.x - n.home) <= n.roam + 0.01),
  'counter staff never drift off their own deck');

// A wandering hero crossing a service counter must yield to the customer
// instead of intercepting taps/confirm or standing over the counter art.
const repair = returnedHub.stations().find((s) => s.type === 'bench');
const obstruction = returnedHub.npcs().find((n) => !n.pinned);
returnedHub.px = repair.x;
obstruction.x = repair.x;
obstruction.state = 'idle';
returnedHub.addressing = obstruction.id;
returnedHub.focusNpc = obstruction;
returnedHub.updateNpcs(0.1);
assert(obstruction.state === 'walk' && obstruction.clearingStation && obstruction.x !== repair.x,
  'wandering NPC immediately moves aside at the repair counter');
assert(returnedHub.addressing === null && returnedHub.focusNpc === null,
  'an NPC clearing a service counter cannot steal station focus');
for (let i = 0; i < 30; i++) returnedHub.updateNpcs(0.1);
assert(Math.abs(obstruction.x - repair.x) >= returnedHub.loiterClear(repair) - 0.01,
  'wandering NPC clears the full repair-counter interaction area');
const pawn = returnedHub.stations().find((s) => s.type === 'shop');
returnedHub.px = pawn.x;
obstruction.x = pawn.x;
obstruction.state = 'idle';
returnedHub.updateNpcs(0.1);
assert(obstruction.state === 'walk' && obstruction.clearingStation && obstruction.x !== pawn.x,
  'wandering NPC immediately moves aside at the pawn shop');
for (let i = 0; i < 30; i++) returnedHub.updateNpcs(0.1);
assert(Math.abs(obstruction.x - pawn.x) >= returnedHub.loiterClear(pawn) - 0.01,
  'wandering NPC clears the full pawn-shop interaction area');
for (const door of returnedHub.stations().filter((s) =>
  s.type === 'exit' || s.type === 'arcade' || s.type === 'shelf' || s.type === 'backroom')) {
  returnedHub.px = door.x;
  obstruction.x = door.x;
  obstruction.state = 'idle';
  returnedHub.updateNpcs(0.1);
  assert(obstruction.state === 'walk' && obstruction.clearingStation,
    `wandering NPC immediately makes way at the ${door.type} door`);
  for (let i = 0; i < 30; i++) returnedHub.updateNpcs(0.1);
  assert(Math.abs(obstruction.x - door.x) >= returnedHub.loiterClear(door) - 0.01,
    `wandering NPC clears the full ${door.type} doorway`);
}
assert(returnedHub.npcs().filter((n) => n.pinned)
  .every((n) => !n.clearingStation && Math.abs(n.x - n.home) <= n.roam + 0.01),
  'Gary and Dolores stay behind their counters while other NPCs make way');
returnedHub.exit();

// Post-game OVERTIME sits one whole cabinet bay beyond the preceding room.
// That empty bay must be part of the concourse itself so NPC homes and movement
// bounds expand into it rather than treating it as decorative tail padding.
const overtimeSlot = defaultSlot();
for (let i = 0; i < 9; i++) overtimeSlot.campaign.plugs[`test-${i}`] = [true, true, true];
overtimeSlot.campaign.storyFlags.sawEnding = true;
const overtimeHub = new HubState({ save: { slot: overtimeSlot }, flow: { hubPosition: null } });
const overtimeStations = overtimeHub.stations();
const overtime = overtimeStations.find((s) => s.type === 'overtime');
const beforeOvertime = overtimeStations[overtimeStations.indexOf(overtime) - 1];
assert(overtime.x - beforeOvertime.x === 176,
  'OVERTIME leaves one full cabinet bay open after the trophy/back-room end');
overtimeHub.enter();
const overtimeHomes = overtimeHub.npcHomes();
assert(overtimeHomes.every((x) => x >= 90 && x <= overtimeHub.npcFarX() && overtimeHub.canLoiter(x)),
  'expanded food-court NPC homes follow the longer concourse and remain on free floor');
overtimeHub.exit();

run = makeRun(); run.enter();
run.relay.current = 'lorenzo'; run.player.setHero('lorenzo');
run.player.grounded = false; run.player.vy = 0;
run.player.update(1 / 60, { held: (a) => a === 'duck' }, { speed: 160 });
assert(!run.player.stomping, 'Down no longer triggers Lorenzo air stomp');

// Gravity bypasses dash and power-up invulnerability.
run.player.grounded = true; run.player.y = 0; run.player.dashT = 0.4; run.player.iframes = 0;
run.powerups.shieldStack = 0; run.powerups.active.unpeel = { t: 10, t0: 10, level: 1 };
run.obstacles = [makeObstacle('gap', run.camX + PLAYER_X - 10)];
const pitCells = run.battery; run.collide();
assert(run.battery === pitCells - 1, 'pit damages through dash and UNPEELABLE');

// Crates are hazards from the side, but a clean descending top contact is safe.
run = makeRun(); run.enter();
const sideCrate = makeObstacle('crate', run.camX + PLAYER_X);
run.obstacles = [sideCrate]; run.player.grounded = true; run.player.y = 0; run.player.vy = 0; run.player.iframes = 0;
const sideCells = run.battery; run.collide();
assert(run.battery === sideCells - 1, 'walking into a crate still damages the player');

run = makeRun(); run.enter();
const topCrate = makeObstacle('crate', run.camX + PLAYER_X);
run.obstacles = [topCrate]; run.player.grounded = false; run.player.y = topCrate.h - 1; run.player.vy = -120; run.player.iframes = 0;
const topCells = run.battery; run.collide(); run.collide();
assert(run.battery === topCells && topCrate.landedOn, 'landing on a crate is safe for the full contact');

// Unbreakables reject every player projectile family.
for (const type of ['pellet', 'axe', 'fist']) {
  const pipe = makeObstacle('pipe', run.camX + PLAYER_X + 20);
  run.obstacles = [pipe];
  run.projectiles = [{ type, x: pipe.x, alt: type === 'pellet' ? 8 : 10, vx: 0, t: 0, live: true, returning: false, hits: 1, pierce: type === 'pellet', hitIds: new Set() }];
  run.updateProjectiles(0, 160);
  assert(pipe.live, `${type} cannot destroy an unbreakable pipe`);
}

// Fernwick consumes one enemy shot per roll, without becoming invincible.
run.relay.current = 'fernwick'; run.player.setHero('fernwick'); run.player.grounded = true; run.player.y = 0; run.player.vy = 0; run.player.abilityCd = 0; run.useAbility();
run.projectiles = [{ type: 'enemyShot', x: run.camX + PLAYER_X + 2, alt: 4, vx: 0, live: true, telegraph: 0 }];
run.updateProjectiles(0, 160);
assert(!run.projectiles.length && run.player.rollDeflectUsed, 'Fernwick roll deflects one enemy shot');

// OSHA improves checkpoint restoration by exactly one cell.
run.checkpoints = [0]; run.battery = 1; run.modIds = [];
run.checkCheckpoints(); const baseRestore = run.battery;
run.checkpoints = [0]; run.battery = 1; run.modIds = ['osha'];
run.checkCheckpoints();
assert(baseRestore === 2 && run.battery === 3, 'OSHA adds one cell beyond base checkpoint restoration');

// Haunted Coupon no longer grants the unavailable Prophecy Coupon effect.
run.modIds = ['coupon']; run.coins = 0; run.powerups.shieldStack = 1; run.player.iframes = 0;
run.takeHit('TEST');
assert(run.coins === 0, 'Haunted Coupon does not award shield-break coins');

// A piercing projectile can damage a boss only once.
let bossEnds = 0;
const boss = new BossState({ bossCab: 'neon', save, seed: 8, difficulty: 1, onEnd: () => bossEnds++ });
boss.enter(); boss.obstacles = [];
// One tick to let the boss take up its framed position, then park the pellet on
// it — where that is depends on the camera, so read it rather than assume it.
boss.update(1 / 60);
boss.obstacles = [];
boss.projectiles = [{ type: 'pellet', x: boss.bossX + 3, alt: 10, vx: 0, live: true, pierce: true, hitIds: new Set() }];
const hp0 = boss.bossHp; boss.update(1 / 60); const hp1 = boss.bossHp; boss.update(1 / 60);
assert(hp1 === hp0 - 1 && boss.bossHp === hp1, 'piercing shot damages the same boss only once');
boss.endRun(false); boss.endRun(false);
assert(bossEnds === 1, 'boss completion callback is one-shot');

const wrapped = wrapText('THIS IS A DELIBERATELY LONG MESSAGE THAT MUST STAY INSIDE THE SAFE WIDTH', 120);
assert(wrapped.length <= 2 && wrapped.every((line) => textWidth(line) <= 120), 'long UI messages wrap to two screen-safe lines');

const legacySlot = defaultSlot();
legacySlot.mastery.gary = { xp: 345, level: 2, equipped: ['head'] };
localStorage.setItem('mashenstein.v2', JSON.stringify({ version: 2, settings: defaultSettings(), slots: [legacySlot, null, null] }));
const migratedSave = new Save(); migratedSave.load(); migratedSave.selectSlot(0);
assert(migratedSave.slot.mastery.raymn?.xp === 345 && !migratedSave.slot.mastery.gary, "playable Gary mastery migrates to Ray M'N");

// Rolling terrain seating: an obstacle's draw translate must seat it on the
// LOWEST ground under its drawn footprint (the art is wider than the hitbox,
// so single-point sampling floats one side on any slope), plus its sink.
{
  const run = makeRun(); run.enter();
  const { terrainGroundY } = await import('../src/game/terrain.js');
  const { GROUND_Y } = await import('../src/game/run.js');
  // pick a world x on a slope: ground at left and right of a 13px-wide box differ
  let wx = 400;
  for (; wx < 2000; wx += 10) {
    if (Math.abs(terrainGroundY(run.cabinet, wx, GROUND_Y) - terrainGroundY(run.cabinet, wx + 17, GROUND_Y)) > 1.5) break;
  }
  const w = 13, sink = 1.5;
  const over = w * (4 / 3) / 2, cx = wx + w / 2;
  const lowest = Math.max(
    terrainGroundY(run.cabinet, cx, GROUND_Y),
    terrainGroundY(run.cabinet, cx - over, GROUND_Y),
    terrainGroundY(run.cabinet, cx + over, GROUND_Y));
  let ty = null;
  const ctx = { save() {}, restore() {}, translate(_, y) { ty = y; } };
  run.drawAtGround(ctx, wx, () => {}, w, sink);
  assert(ty !== null && Math.abs(ty - (lowest - GROUND_Y + sink)) < 1e-9,
    `sloped ground seats the sprite on the lowest footprint point (${ty})`);
  ctx.translate(0, 0);
  run.drawAtGround(ctx, wx, () => {});
  assert(Math.abs(ty - (terrainGroundY(run.cabinet, wx, GROUND_Y) - GROUND_Y)) < 1e-9,
    'width-less callers (portal, copter) keep single-point seating');
}

console.log(failed ? 'RELIABILITY: FAILED' : 'RELIABILITY: PASSED');
process.exit(failed ? 1 : 0);
