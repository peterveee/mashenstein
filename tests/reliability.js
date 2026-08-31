// Regression coverage for terminal guards, input ordering, collisions, and mods.
import { installDom } from './dom-stub.js';
installDom();

const { Input } = await import('../src/engine/input.js');
const { Audio } = await import('../src/engine/audio.js');
const { setState, updateState } = await import('../src/engine/states.js');
const { RunState, FINISH_CLEAR, PIT_SURFACE_Y } = await import('../src/game/run.js');
const { BossState } = await import('../src/game/boss.js');
const { MinigameState } = await import('../src/game/minigames/index.js');
const { HubState } = await import('../src/game/hub/index.js');
const { TitleState, SettingsState } = await import('../src/game/menus.js');
const { makeObstacle, makePickup, PICKUPS } = await import('../src/game/entities.js');
const { Spawner, DripSpawner } = await import('../src/game/spawner.js');
const { Rng } = await import('../src/engine/rng.js');
const { PLAYER_X } = await import('../src/game/player.js');
const { VIEW_W } = await import('../src/engine/camera.js');
const { wrapText, textWidth } = await import('../src/engine/sprites.js');
const { chrome } = await import('../src/engine/renderer.js');
const { glfx } = await import('../src/engine/glfx.js');
const { poseFromPlayer } = await import('../src/sprites/toons.js');
const { save } = await import('../src/engine/save.js');
const { Save, defaultSlot, defaultSettings } = await import('../src/engine/save.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

save.load(); save.newSlot(0, 0);
const stage = { id: 'reliable-1', cabinet: 'plumber', index: 1, mission: { type: 'reach', desc: 'TEST' }, challenge: { type: 'coins', n: 99, desc: 'TEST' }, durationSec: 40, applianceAt: 0.5 };
// skipRunIn: these cases drive live gameplay from the first frames — collisions,
// the finish dash, pauses — so they skip the cinematic run-in (covered in
// story-beats) that would otherwise gate the world for ~0.9s after enter().
const makeRun = (onEnd = () => {}) => new RunState({ stage, save, seed: 44, difficulty: 1, skipRunIn: true, onEnd });

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
// Damage mercy remains meaningful across the hazardous final approach, but it
// must not make the winner keep flashing once the tape is reached.
run.player.iframes = 60;
for (let i = 0; i < 900 && run.finaleT == null; i++) run.update(1 / 60);
assert(run.finaleT != null && run.player.iframes === 0,
  'reaching the finish clears the injury flash before the celebration');
// Long enough for the whole finale, whatever length it currently is: the dash,
// the pole ride, the payoff chain and the band's hold. This is a test that the
// run RESOLVES, not a test of how long that takes — pinned at 240 ticks it
// failed the moment the slide was slowed down, which is a timing change the
// assertion has no opinion about.
for (let i = 0; i < 900 && !airborneFinish; i++) run.update(1 / 60);
assert(airborneFinish && airborneFinish.success, 'jumping cannot clear the stage finish plane');

run = makeRun(); run.enter();
// The final stretch keeps everything this side of the tape and sweeps only what
// is past it. The clear lane is a PLACEMENT rule — where the spawners may stop
// laying track — and enforcing it retroactively here deleted things that were
// already drawn and already in front of the player, which reads as the last few
// metres of the level evaporating as you reach the pole. So the in-lane enemy
// and the in-lane pickup both survive, and only the one past the pole goes:
// that one the draw gate never painted, so nothing visibly disappears.
const finalEnemy = makeObstacle('zombie', run.finishWorldX() - 400);
const laneEnemy = makeObstacle('zombie', run.finishWorldX() - 24);
const postFinishEnemy = makeObstacle('zombie', run.finishWorldX() + 24);
run.obstacles = [finalEnemy, laneEnemy, postFinishEnemy];
const lanePickup = makePickup('battery', run.finishWorldX() - 100, 10);
const postFinishPickup = makePickup('battery', run.finishWorldX() + 40, 10);
run.pickups = [lanePickup, postFinishPickup];
run.startFinishRun();
assert(run.obstacles.includes(finalEnemy) && run.obstacles.includes(laneEnemy)
  && !run.obstacles.includes(postFinishEnemy),
  'the final stretch keeps every enemy this side of the tape and clears only past it');
assert(run.pickups.includes(lanePickup) && !run.pickups.includes(postFinishPickup),
  'a pickup that scrolled into the marker lane is not deleted out from under the player');

run.player.iframes = 0;
run.obstacles = [makeObstacle('zombie', run.playerWorldX())];
const cellsBeforeFinishHit = run.battery;
run.collide();
assert(run.battery === cellsBeforeFinishHit - 1,
  'hazards can still damage the player while the finish camera is locked');

// A source-specific failure line must describe the thing that actually landed.
// In particular, the barrel joke must not leak out of the generic pool onto a
// zombie, cactus, or any other ordinary hit.
const wrongSourceDeath = makeRun(); wrongSourceDeath.enter();
wrongSourceDeath.battery = 1;
wrongSourceDeath.takeHit(null, false, 'zombie');
assert(wrongSourceDeath.failMsg !== 'A BARREL HAS WON THE ARGUMENT',
  'a non-barrel death never claims a barrel won the argument');
const barrelDeath = makeRun(); barrelDeath.enter();
barrelDeath.battery = 1;
barrelDeath.takeHit(null, false, 'barrel');
assert(barrelDeath.failMsg === 'A BARREL HAS WON THE ARGUMENT',
  'the barrel joke remains available for an actual barrel hit');

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
// Same reasoning as the airborne finish above: this asserts the attempt
// RESOLVES, so the budget has to outlast whatever the finale currently costs
// rather than pin a tick count that every retiming breaks.
for (let i = 0; i < 900 && !restoredFinishResult; i++) restoredFinish.update(1 / 60);
assert(restoredFinishResult?.success, 'a restored finish attempt can complete normally');
restoredFinish.endRun(true);
assert(restoredFinishResult?.success && restoredFinishEnds === 1,
  'death, restore and finish still resolve through one completion');

// A resident picked up after the normal finish threshold counts immediately,
// and the already-visible tape stays where it was when the victory run begins.
const rescueStage = { ...stage, mission: { type: 'rescue', n: 1, count: 0, desc: 'TEST' } };
const rescueRun = new RunState({ stage: rescueStage, save, seed: 46, difficulty: 1, skipRunIn: true, onEnd() {} });
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
const shortRun = new RunState({ stage: shortStage, save, seed: 47, difficulty: 1, skipRunIn: true, onEnd: (result) => { shortResult = result; } });
shortRun.enter(); shortRun.mission.count = 3; shortRun.camX = shortRun.totalDist; shortRun.obstacles = []; shortRun.pickups = [];
shortRun.update(1 / 60);
assert(shortResult?.failDetail === 'CORDS 3/4', 'mission failure reports the exact objective shortfall');

// Objective replacements are capped to the last drawable spot before the
// breaker — which is FINISH_CLEAR back from it, the same wall the pattern lane
// and the drip stop at, not a token gap that leaves a cord standing on the
// plunger — and suppressed once that spot is no longer ahead of the viewport.
// The camera is parked so the cap, not the screen edge, is the binding limit —
// with room for the hazard nudge to move the piece and still land inside it.
const objectiveRun = new RunState({ stage: shortStage, save, seed: 48, difficulty: 1, skipRunIn: true, onEnd() {} });
objectiveRun.enter(); objectiveRun.pickups = [];
objectiveRun.camX = objectiveRun.finishWorldX() - FINISH_CLEAR - PICKUPS.cord.w - VIEW_W - 130;
const spawnedCord = objectiveRun.spawnObjective('cord', 30);
const lastCord = objectiveRun.pickups.at(-1);
assert(spawnedCord && lastCord.x >= objectiveRun.camX + VIEW_W
  && lastCord.x + PICKUPS.cord.w + FINISH_CLEAR <= objectiveRun.finishWorldX(),
  'a late cord spawns ahead of view and clear of the finish approach');
objectiveRun.camX = objectiveRun.finishWorldX() - PICKUPS.resident.w - FINISH_CLEAR - VIEW_W + 1;
const beforeResidents = objectiveRun.pickups.length;
assert(!objectiveRun.spawnObjective('resident', 0) && objectiveRun.pickups.length === beforeResidents,
  'an objective is not spawned when no reachable runway remains');
objectiveRun.mission = { type: 'rescue', n: 3, count: 1 };
const carriedA = makePickup('resident', 0, 0); carriedA.following = true;
const carriedB = makePickup('resident', 0, 0); carriedB.following = true;
objectiveRun.pickups = [carriedA, carriedB];
assert(objectiveRun.missionCount() === 3 && objectiveRun.missionSatisfied(),
  'rescue progress includes delivered and currently-following residents');

// ?startAt / ?finish drop the camera mid-stage and pre-fill the lane in one
// pass. That pass used to fill to infinity, which at ?finish=3 — inside the
// spawner's own lookahead of the tape — parked a crate stack at the foot of the
// pole. The shortcut for LOOKING at the marker was the only thing that ever put
// clutter beside it, so the wall is checked at the tightest lead a warp can ask
// for, across seeds, rather than at a comfortable one.
for (const seed of [11, 12, 13, 14, 15]) {
  const warpStage = { ...stage, durationSec: 60 };
  const warped = new RunState({ stage: warpStage, save, seed, difficulty: 1, skipRunIn: true,
    devStartPercent: 0.99, onEnd() {} });
  warped.enter();
  const wall = warped.finishWorldX() - FINISH_CLEAR;
  const intruder = [...warped.obstacles, ...warped.pickups].find((e) => e.x + e.w > wall);
  assert(!intruder, `a warped-in start leaves the finish approach clear (seed ${seed}`
    + (intruder ? `, ${intruder.type} ${Math.round(intruder.x + intruder.w - wall)}px past the wall)` : ')'));
}

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
run = new RunState({ stage: targetStage, save, seed: 45, difficulty: 1, skipRunIn: true, onEnd: (result) => { incompleteFinish = result; } });
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
const fpsOption = settings.options().find((option) => option.label.startsWith('SHOW FPS:'));
fpsOption.act();
assert(volumeSave.settings.showFps === true, 'settings exposes a saved FPS display toggle');

// Erasing a save requires choosing the shift and accepting two separate,
// default-NO confirmations. Nothing is removed after only the first warning.
const eraseSave = new Save(); eraseSave.load(); eraseSave.newSlot(1, 123);
const title = new TitleState({
  save: eraseSave,
  onSlotChosen() {}, onSettings() {}, onHowTo() {},
  onGuide() {}, onSoundTest() {},
});
const emptyTitle = new TitleState({
  save: { data: { slots: [null, null, null] } },
  onSlotChosen() {}, onSettings() {}, onHowTo() {},
  onGuide() {}, onSoundTest() {},
});
const emptyTitleOptions = emptyTitle.options();
assert(emptyTitleOptions.slice(0, 3).every((option, i) => option.label === `SHIFT ${i + 1}` && option.status === 'CLOCK IN'),
  'empty title slots are presented as shifts ready to clock in');
assert(emptyTitleOptions[3].label === 'STAFF ONLY',
  'the fourth title card opens the staff-only menu');
const occupiedShift = title.options()[1];
assert(occupiedShift.status.endsWith('PLUGS') && occupiedShift.progress >= 0 && occupiedShift.progress <= 1 && !('detail' in occupiedShift),
  'an occupied shift exposes bounded plug progression without duplicating the in-game coin balance');
let pointerShift = -1;
const pointerTitle = new TitleState({
  save: eraseSave,
  onSlotChosen(i) { pointerShift = i; },
  onSettings() {}, onHowTo() {}, onGuide() {}, onSoundTest() {},
});
pointerTitle.enter();
assert(glfx.glow === 1,
  'the title enables selective WebGL bloom for the marquee');
const horizontalCardCenters = [96, 192, 288, 384];
for (let i = 0; i < 3; i++) {
  Input.pointer = { x: horizontalCardCenters[i], y: 140, down: false };
  Input.press('pointer'); pointerTitle.update(0); Input.release('pointer'); Input.endFrame();
  assert(pointerShift === i, `horizontal title card ${i + 1} selects shift ${i + 1}`);
}
Input.pointer = { x: horizontalCardCenters[3], y: 140, down: false };
Input.press('pointer'); pointerTitle.update(0); Input.release('pointer'); Input.endFrame();
assert(pointerTitle.extras, 'horizontal fourth title card opens STAFF ONLY');
let touchShift = -1;
const touchTitle = new TitleState({
  save: eraseSave,
  onSlotChosen(i) { touchShift = i; },
  onSettings() {}, onHowTo() {}, onGuide() {}, onSoundTest() {},
});
Input.usingTouch = true;
touchTitle.enter();
Input.pointer = { x: horizontalCardCenters[0], y: 140, down: true };
Input.press('pointer'); touchTitle.update(0); Input.release('pointer'); Input.endFrame();
assert(touchShift === -1 && touchTitle.touchPress?.i === 0,
  'touch title card holds a visible pressed state before activation');
touchTitle.update(0.05);
assert(touchShift === -1, 'touch title card remains pressed for a readable beat');
touchTitle.update(0.05);
assert(touchShift === 0 && !touchTitle.touchPress,
  'touch title card activates after its press-down feedback');
Input.usingTouch = false;

const fpsTitleSave = new Save(); fpsTitleSave.load();
fpsTitleSave.settings.showFps = false;
const fpsTitle = new TitleState({
  save: fpsTitleSave,
  onSlotChosen() {}, onSettings() {}, onHowTo() {},
  onGuide() {}, onSoundTest() {}, attractDelay: 1e9,
});
fpsTitle.enter();
for (let i = 0; i < 2; i++) {
  Input.pointer = { x: 240, y: 42, down: false };
  Input.press('pointer'); fpsTitle.update(0.1); Input.release('pointer'); Input.endFrame();
}
assert(fpsTitleSave.settings.showFps === true,
  'double-tapping the title marquee toggles the FPS display on');
for (let i = 0; i < 2; i++) {
  Input.pointer = { x: 240, y: 42, down: false };
  Input.press('pointer'); fpsTitle.update(0.1); Input.release('pointer'); Input.endFrame();
}
assert(fpsTitleSave.settings.showFps === false,
  'double-tapping the title marquee toggles the FPS display off');

// Landscape iPad has no portrait pause card to host the hidden tools, so its
// title marquee remains the five-tap diagnostics anchor.
const ipadDiagTitle = new TitleState({
  save: fpsTitleSave,
  onSlotChosen() {}, onSettings() {}, onHowTo() {},
  onGuide() {}, onSoundTest() {}, attractDelay: 1e9,
});
ipadDiagTitle.enter();
const priorPlatform = window.__mash_platform;
const priorDispatch = window.dispatchEvent;
const priorCustomEvent = globalThis.CustomEvent;
const diagEvents = [];
window.__mash_platform = { isIpad: true };
window.dispatchEvent = (event) => { diagEvents.push(event.type); };
if (typeof globalThis.CustomEvent === 'undefined') {
  globalThis.CustomEvent = class CustomEvent { constructor(type) { this.type = type; } };
}
Input.usingTouch = true;
for (let i = 0; i < 5; i++) ipadDiagTitle.handleTitleFpsTap(240, 42);
assert(diagEvents.includes('mashdiagopen'),
  'five title taps open the landscape iPad diagnostics panel');
Input.usingTouch = false;
window.__mash_platform = priorPlatform;
window.dispatchEvent = priorDispatch;
if (priorCustomEvent === undefined) delete globalThis.CustomEvent;
else globalThis.CustomEvent = priorCustomEvent;

// Eating a title wisp removes it from this visit's procession. The transient
// eye/scatter maps are only animation records; pruning them must not recreate
// the visitor (or its invisible hitbox) on the next modulo lap.
const wispTitle = new TitleState({
  save: eraseSave,
  onSlotChosen() {}, onSettings() {}, onHowTo() {},
  onGuide() {}, onSoundTest() {},
  attractDelay: 1e9,
});
wispTitle.enter();
wispTitle.t = 21.5; // first visitor is at x=14 on the opening wisp crossing
wispTitle.hitWisp({ key: '0:0', x: 14 });
wispTitle.hitWisp({ key: '0:0', x: 14 });
assert(wispTitle.wispsDismissed && wispTitle.eaten.has('0:0'),
  'eating a title wisp permanently dismisses its procession for this title visit');
wispTitle.eaten.clear(); // mirror the fleeing eyes being pruned off screen
wispTitle.t = 43.5; // the old formula places a replacement at x=14 one lap later
const originalFrightStart = wispTitle.frightStart;
Input.pointer = { x: 14, y: 250, down: false };
Input.press('pointer'); wispTitle.update(0); Input.release('pointer'); Input.endFrame();
assert(wispTitle.frightStart === originalFrightStart && wispTitle.scatter.size === 0,
  'a dismissed title wisp neither returns nor leaves an invisible hitbox next lap');

eraseSave.slot.campaign.storyFlags.sawEnding = true;
assert(!title.options().some((option) => option.id === 'overtime'),
  'the title menu does not expose Overtime after the ending');
title.enter(); title.beginErase();
const tapTitle = (action) => {
  Input.press(action); title.update(0); Input.release(action); Input.endFrame();
};
tapTitle('down'); // select occupied SHIFT 2 if another occupied shift precedes it
tapTitle('confirm');
assert(title.erase?.step === 'confirm' && eraseSave.data.slots[1], 'erase flow selects a shift without deleting it');
tapTitle('down'); tapTitle('confirm');
assert(title.erase?.step === 'final' && eraseSave.data.slots[1], 'first erase confirmation does not delete the shift');
tapTitle('down'); tapTitle('confirm');
assert(!eraseSave.data.slots[1] && !title.erase, 'second erase confirmation deletes only the selected shift');

// Staff Only is the parent of its utilities. Returning from one reopens that
// list on the route the player just used; erasing keeps the same parent modal
// in place when Back cancels it.
const returnToExtras = new TitleState({
  save: eraseSave, openExtras: true, extrasFocus: 'settings',
  onSlotChosen() {}, onSettings() {}, onHowTo() {}, onGuide() {}, onSoundTest() {},
});
returnToExtras.enter();
assert(returnToExtras.extrasChoices()[returnToExtras.extras.idx].id === 'settings',
  'a Staff Only utility returns to its selected Staff Only row');
returnToExtras.beginErase();
Input.press('back'); returnToExtras.update(0); Input.release('back'); Input.endFrame();
assert(!returnToExtras.erase && returnToExtras.extras,
  'Back from erase returns to Staff Only instead of the title');
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
const npcStarts = returnedHub.npcs().map((n) => n.x);
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
for (let i = 0; i < 10; i++) returnedHub.update(0.1);
assert(returnedHub.npcs().some((n, i) => n.x !== npcStarts[i]),
  'food-court heroes stroll during their loiter cycle');
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

let foodCourtWalkExits = 0;
const walkExitHub = new HubState({
  save,
  flow: { hubPosition: null, toTitle: () => { foodCourtWalkExits++; } },
});
walkExitHub.enter();
walkExitHub.px = 24;
Input.press('left'); walkExitHub.update(0.1); Input.release('left'); Input.endFrame();
assert(foodCourtWalkExits === 1,
  'walking through the Food Court EXIT returns to the title without an interaction');
walkExitHub.exit();

let trophyRoomWalkEntries = 0;
const trophyGateSlot = defaultSlot();
const trophyGateSave = { slot: trophyGateSlot, settings: defaultSettings() };
const lockedTrophyHub = new HubState({
  save: trophyGateSave,
  flow: { hubPosition: null, openTrophyRoom: () => { trophyRoomWalkEntries++; } },
});
lockedTrophyHub.enter();
const lockedTrophyDoor = lockedTrophyHub.stations().find((s) => s.type === 'shelf');
assert(lockedTrophyDoor && !lockedTrophyDoor.unlocked,
  'the Trophy Room door starts locked before any level is cleared');
lockedTrophyHub.px = lockedTrophyDoor.x - 4;
Input.press('right'); lockedTrophyHub.update(0.1); Input.release('right'); Input.endFrame();
assert(trophyRoomWalkEntries === 0 && lockedTrophyHub.px < lockedTrophyDoor.x,
  'the locked Trophy Room door blocks walk-through entry');
lockedTrophyHub.exit();

trophyGateSlot.campaign.ranks['plumber-1'] = 'B';
const walkTrophyHub = new HubState({
  save: trophyGateSave,
  flow: { hubPosition: null, openTrophyRoom: () => { trophyRoomWalkEntries++; } },
});
walkTrophyHub.enter();
const farTrophyStations = walkTrophyHub.stations();
const farTrophyDoor = farTrophyStations.find((s) => s.type === 'shelf');
assert(farTrophyStations.at(-1) === farTrophyDoor,
  'the Trophy Room is the final station at the far end of the Food Court');
assert(farTrophyDoor.unlocked,
  'clearing one level unlocks the Trophy Room door');
assert(farTrophyStations[0].x === 22 && walkTrophyHub.width - farTrophyDoor.x === 22,
  'the Food Court boundary door frames sit flush with the left and right room edges');
walkTrophyHub.px = farTrophyDoor.x - 4;
Input.press('right'); walkTrophyHub.update(0.1); Input.release('right'); Input.endFrame();
assert(trophyRoomWalkEntries === 1,
  'walking through the far Food Court door enters the Trophy Room without an interaction');
walkTrophyHub.exit();

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

// Gravity bypasses dash and power-up invulnerability — and a pit is fatal, so
// what it bypasses them for is a death rather than a cell. Full battery on the
// way in, so this only passes if the fall skipped the battery entirely.
run.player.grounded = true; run.player.y = 0; run.player.dashT = 0.4; run.player.iframes = 0;
run.powerups.shieldStack = 0; run.powerups.active.unpeel = { t: 10, t0: 10, level: 1 };
run.obstacles = [makeObstacle('gap', run.camX + PLAYER_X - 10)];
const pitCells = run.battery; run.collide();
assert(pitCells > 1 && run.dead && run.battery === 0,
  `pit is fatal through dash and UNPEELABLE (dead=${run.dead}, ${run.battery}/${pitCells})`);

// ...and the death lands the run back at the last checkpoint rather than ending
// it. The snapshot is the only thing standing between a fatal pit and a restart
// from the top, so it is worth an assertion of its own.
run = makeRun(); run.enter();
run.camX = run.checkpoints[0] + 1;
run.distance = run.camX;
run.pickups = [];
run.player.grounded = false;
run.player.y = 24;
run.checkCheckpoints();
const pitSnap = run.snapshot;
assert(pitSnap,
  'crossing a checkpoint banks it by world position, without touching a point or standing on the ground');
const firstCheckpointMarker = run.checkpointMarkers[0];
run.camX = run.checkpoints[0] + 1;
run.distance = run.camX;
run.checkCheckpoints();
const activePitSnap = run.snapshot;
assert(run.checkpointMarkers.length === 2 && run.checkpointMarkers[0] === firstCheckpointMarker,
  'reaching checkpoint two keeps checkpoint one in the visible checkpoint history');
// Rewind is live-history playback, not a way to un-bank a checkpoint. The
// pending checkpoint was shifted out when it was crossed, so erasing this
// snapshot would make the next death restart the stage with no way to earn the
// same checkpoint again.
const rewindRec = run.rewindFrames.slotForWrite();
run.writeRewindSnapshot(rewindRec);
run.restoreRewindSnapshot(rewindRec);
assert(run.snapshot === activePitSnap,
  'rewinding after a checkpoint preserves the banked death restore');
run.player.grounded = true; run.player.y = 0; run.player.iframes = 0;
run.powerups.shieldStack = 0;
run.obstacles = [makeObstacle('gap', run.camX + PLAYER_X - 10)];
run.collide();
assert(run.dead, 'falling in kills the run');
// The sink is a beat, not a frame: fall, go under, then an empty hole. Long
// enough that a fixed frame count would either miss the restore or overshoot
// it, so stop on the frame it lands — the run resumes immediately and the
// camera starts moving again.
let pitFrames = 0;
for (; pitFrames < 240 && run.dead; pitFrames++) run.update(1 / 60);
assert(pitFrames / 60 > 2,
  `the death holds long enough to watch (${(pitFrames / 60).toFixed(2)}s)`);
assert(!run.dead && Math.abs(run.camX - activePitSnap.camX) < 8 && run.battery === activePitSnap.battery,
  `a pit death restores the last checkpoint (camX ${run.camX}/${activePitSnap.camX}, cells ${run.battery})`);
assert(run.checkpointMarkers.length === 2 && run.checkpointMarkers[0] === firstCheckpointMarker,
  'dying after checkpoint two leaves both checkpoint timeline markers visible');

// ...and what happens during that beat: he goes over the edge with the fall
// face on, stops at the material rather than falling through the world, and
// keeps sinking from there.
run = makeRun(); run.enter();
run.player.grounded = true; run.player.y = 0; run.player.iframes = 0;
// Leave a landing squash active to prove pit contact clears the previous
// grounded pose instead of carrying it into the death hold.
run.player.landedT = 0.12;
run.powerups.shieldStack = 0;
run.obstacles = [makeObstacle('gap', run.camX + PLAYER_X - 10)];
run.collide();
assert(run.pitDeath && run.player.fallFace, 'the fall into a pit wears the surprised face');
const pitFace = poseFromPlayer(run.player, 0);
assert(pitFace.faceSurprised && pitFace.browRaise,
  'the pit fall promotes surprise to the full startled face');
// He carries forward into it. The world stops scrolling the frame he dies, so
// without this he drops down the near wall like a lift.
for (let i = 0; i < 8; i++) run.update(1 / 60);
assert(run.pitDeath.dx > 4 && run.heroScreenX() > PLAYER_X,
  `momentum carries him out over the hole (${run.pitDeath.dx.toFixed(1)}px)`);
for (let i = 0; i < 40 && !run.pitDeath.in; i++) run.update(1 / 60);
assert(run.pitDeath.in && run.player.y === PIT_SURFACE_Y,
  `he stops at the material rather than falling through it (y ${run.player.y})`);
const pitSettledPose = poseFromPlayer(run.player, 0);
assert(pitSettledPose.grounded && pitSettledPose.kind === 'run' && pitSettledPose.squash === 0,
  'the pit landing settles into an upright pose instead of a mid-jump squash');
const sunkFrom = run.player.y;
for (let i = 0; i < 20; i++) run.update(1 / 60);
assert(run.player.y < sunkFrom, `and keeps going under (${run.player.y} < ${sunkFrom})`);

// SCRIPTED PITS. Plumber 3 guarantees a plan of them at fixed fractions, which
// a pattern list cannot do — the spawner shuffles patterns, so a gap added
// there turns up wherever the dice fall and might not turn up at all. The plan
// is the LAYOUT's — the level editor owns the pits now — so it is read the way
// the run reads it, through the resolver.
{
  const { STAGES } = await import('../src/data/stages.js');
  const { CABINET_BY_ID } = await import('../src/data/cabinets.js');
  const { resolveLayout } = await import('../src/game/layout.js');
  const plumber3 = STAGES.find((st) => st.id === 'plumber-3');
  const pits = resolveLayout(plumber3, CABINET_BY_ID[plumber3.cabinet]).pits;
  assert(pits && pits.length >= 3, 'plumber 3 carries a multi-pit plan');
  assert(pits[0].at < 0.2, 'the first one lands early, while the run is still being learned');
  const pitRun = new RunState({ stage: plumber3, save, seed: 7, difficulty: 1, skipRunIn: true, onEnd: () => {} });
  pitRun.enter();
  assert(pitRun.pitPlan.length === pits.length, 'the plan resolves to world positions on enter');
  // Walk the camera up to the first one and let the lazy placer run. The
  // opening cluster sits closer together than the placer's horizon, so more
  // than one may go down — the first must be among them, exactly where asked.
  const first = pitRun.pitPlan[0];
  pitRun.camX = first.x - 400;
  pitRun.distance = pitRun.camX;
  pitRun.spawnScriptedPits();
  const planted = pitRun.obstacles.filter((o) => o.live && o.def.isGap);
  assert(planted.length >= 1 && Math.abs(planted[0].x - first.x) < 1,
    `the first pit is planted where the stage asked for it (${planted.length})`);
  assert(planted[0].w === pits[0].w, 'at the width the stage asked for');
  // Its approach and its landing are swept: a hole the spawner never budgeted
  // for has to clear its own run-up or it is a death nobody could avoid.
  const crowd = pitRun.obstacles.filter((o) => o.live && !o.def.isGap
    && o.x + o.w > first.x - 100 && o.x < first.x + first.w + 100);
  assert(crowd.length === 0, `the pit clears its own approach and landing (${crowd.length} left)`);
  pitRun.spawnScriptedPits();
  assert(pitRun.obstacles.filter((o) => o.live && o.def.isGap).length === planted.length,
    'and it is planted once, however often the placer runs');
  // ...and it is planted far enough out that its own hint still fits off
  // screen. A scripted pit that appears 520px away can never be signed: the
  // sign stands 65 short of the lip, which is already inside the frame.
  {
    const signRun = new RunState({ stage: plumber3, save, seed: 9, difficulty: 1, skipRunIn: true, onEnd: () => {} });
    signRun.enter();
    signRun.pitFails = 1;
    const target = signRun.pitPlan[1];
    signRun.camX = target.x - 780;
    signRun.distance = signRun.camX;
    for (let i = 0; i < 40 && !signRun.obstacles.some((o) => o.type === 'jumpSign'); i++) {
      signRun.camX += 8;
      signRun.spawnScriptedPits();
      signRun.signPits();
    }
    assert(signRun.obstacles.some((o) => o.type === 'jumpSign'),
      'a scripted pit gets its JUMP sign like any other');
  }
  // The plan rides the checkpoint snapshot, or a death in the last pit comes
  // back to a stage that no longer has one.
  const snap = pitRun.makeSnapshot();
  assert(snap.pitsDone && snap.pitsDone.length === pits.length, 'the snapshot records which pits are down');
}

// NO COIN OVER A HOLE, AND NONE ON EITHER LIP.
//
// A pit's lips are the two places the player chooses nothing — the near one is
// where the jump has to leave and the far one is where it comes down — so a
// coin standing on either is a lure toward a hole, and a coin over the break
// is one hanging in mid air. Both used to happen, from two different
// directions: the lane's own `boostPad + gap + arc` pattern drew its arc
// straight across the break, and a scripted pit cut the middle out of an arc
// that was already laid, leaving the tail of it floating at the lip.
//
// Driven through whole stages rather than asserted on the pattern table: the
// second case only exists because `spawnScriptedPits` runs against a lane the
// spawner has already filled.
{
  const { STAGES } = await import('../src/data/stages.js');
  const offenders = [];
  for (const st of STAGES) {
    for (let seed = 1; seed <= 6; seed++) {
      let r;
      try {
        r = new RunState({ stage: st, save, seed, difficulty: 1, skipRunIn: true, onEnd: () => {} });
        r.enter();
      } catch { continue; }
      for (let f = 0; f < 60 * 70 && !r.dead && !r.finished; f++) {
        r.update(1 / 60);
        // On screen only. A tunnel's mouths are cut about 40px before the
        // sweep that clears them is allowed to run, so for a fifth of a second
        // a hole exists with a coin run still standing on it — 200px past the
        // right-hand edge of the frame, where nobody can see either.
        const viewRight = r.camX + 480 / r.camZoom;
        for (const g of r.obstacles) {
          if (!g.live || !g.def.isGap) continue;
          if (g.x > viewRight || g.x + g.w < r.camX) continue;
          // The FLOOR of the window, not the window this frame: the clearance
          // is bought at the speed the lane was laid at and the run keeps
          // accelerating, so a coin placed exactly on the lip of a slower
          // stage's window would fail a check made later at a faster one.
          // 120 is the number every stage is guaranteed, and it is where the
          // fragments used to sit. Half a pixel of slack because a run pushed
          // to exactly the far edge of the window is on the right side of it.
          const pad = 120 - 0.5;
          for (const pk of r.pickups) {
            if (!pk.live || pk.following || !pk.def.coin) continue;
            // A ROUTE's own coins stay. The line diving into a mouth and the run
            // along the road below are the only thing on the surface that says
            // the hole is a way in, and they carry no formation id — which is
            // exactly what tells the sweep they are the road's, not the lane's.
            if (pk.formation == null) continue;
            if (pk.x + pk.w > g.x - pad && pk.x < g.x + g.w + pad) {
              offenders.push(`${st.id}/${seed}: lane coin ${Math.round(pk.x - g.x)}px into a ${g.w}px ${g.tunnel ? 'tunnel mouth' : 'pit'} at alt ${Math.round(pk.alt)}`);
            }
          }
        }
        if (offenders.length) break;
      }
      if (offenders.length) break;
    }
    if (offenders.length) break;
  }
  assert(offenders.length === 0,
    `no lane coin is left over a hole or on its lips (${offenders[0] || 'clean'})`);
}

// And the formation goes WHOLE. Clearing by position alone is what left the
// fragments: an arc is 84px wide against a window measured from the lip, so the
// far end of the run survived with the rest of its shape gone.
{
  const arc = [];
  const spawner = new Spawner({ cabinet: { patterns: [] }, rng: new Rng(3) });
  spawner.spawnCoins(1000, { shape: 'arc', n: 7 }, arc, () => 45);
  assert(arc.length === 7 && new Set(arc.map((c) => c.formation)).size === 1,
    'every coin in a run is stamped with the run it belongs to');
  const other = [];
  spawner.spawnCoins(2000, { shape: 'arc', n: 7 }, other, () => 45);
  assert(other[0].formation !== arc[0].formation, 'and two runs are two stamps');
}

// NOTHING SAVES YOU FROM A HOLE. Three separate defences used to, and each one
// taught the player that the floor is optional.
{
  // i-frames: a hit grants 1.4s of mercy, which was a licence to walk on air.
  const hurtRun = makeRun(); hurtRun.enter();
  hurtRun.player.grounded = true; hurtRun.player.y = 0;
  hurtRun.player.iframes = 1.2;
  hurtRun.powerups.shieldStack = 0;
  hurtRun.obstacles = [makeObstacle('gap', hurtRun.camX + PLAYER_X - 10)];
  hurtRun.collide();
  assert(hurtRun.dead, 'a hero mid-mercy-window still falls in');

  // The shield: not spent, and not a ladder.
  const shieldRun = makeRun(); shieldRun.enter();
  shieldRun.player.grounded = true; shieldRun.player.y = 0; shieldRun.player.iframes = 0;
  shieldRun.powerups.shieldStack = 2;
  shieldRun.obstacles = [makeObstacle('gap', shieldRun.camX + PLAYER_X - 10)];
  shieldRun.collide();
  assert(shieldRun.dead, 'a shield does not stop a fall');
  assert(shieldRun.powerups.shieldStack === 2,
    `and is not consumed by one either (${shieldRun.powerups.shieldStack})`);

  // Ray M'N's reassembly grace goes the same way: it is a defence against a
  // fatal HIT, and a hole is not a hit.
  const rayRun = makeRun(); rayRun.enter();
  rayRun.relay.current = 'raymn'; rayRun.player.setHero('raymn');
  rayRun.player.grounded = true; rayRun.player.y = 0; rayRun.player.iframes = 0;
  rayRun.powerups.shieldStack = 0;
  rayRun.battery = 1;
  rayRun.obstacles = [makeObstacle('gap', rayRun.camX + PLAYER_X - 10)];
  rayRun.collide();
  assert(rayRun.dead, "Ray M'N does not reassemble out of a pit");
}

// THE JUMP SIGN. Two failures, not one: one is a mistimed jump, two is a
// pattern. Below the threshold nothing appears, however many pits go past.
run = makeRun(); run.enter();
run.pitFails = 0;
run.obstacles = [makeObstacle('gap', run.camX + 900)];
run.signPits();
assert(!run.obstacles.some((o) => o.type === 'jumpSign'), 'a clean run earns no hint');
run.pitFails = 1;
run.signPits();
const sign = run.obstacles.find((o) => o.type === 'jumpSign');
assert(sign, 'the first failure puts a JUMP sign in the lane');
// The hint has to reach the player who needs it, and that player is the one
// dying in a pit BEFORE the first checkpoint — whose every death restarts the
// stage through enter(). A counter zeroed there can never reach two.
{
  const restarted = makeRun(); restarted.enter();
  restarted.pitFails = 1;
  restarted.enter();
  assert(restarted.pitFails === 1, 'the failure count survives a stage restart');
}
const signedGap = run.obstacles.find((o) => o.def.isGap);
assert(sign.x + sign.w < signedGap.x && signedGap.x - (sign.x + sign.w) <= 4,
  `the sign stands right at the lip, so one jump clears both (${signedGap.x - (sign.x + sign.w)}px short)`);
// ONE per attempt, not one per hole: a hint in front of every pit is a handrail.
run.obstacles.push(makeObstacle('gap', run.camX + 2600));
run.signPits();
assert(run.obstacles.filter((o) => o.type === 'jumpSign').length === 1,
  'and it is said once, not in front of every pit in the level');

// It is a word, not a wall: walking into it costs nothing and knocks it over.
run = makeRun(); run.enter();
const lonelySign = makeObstacle('jumpSign', run.camX + PLAYER_X);
run.obstacles = [lonelySign];
run.player.grounded = true; run.player.y = 0; run.player.iframes = 0;
const signCells = run.battery;
run.collide();
assert(!lonelySign.live && run.battery === signCells && !run.dead,
  `running through the sign breaks it for free (${run.battery}/${signCells})`);

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

// Objective !-crates remain usable during the post-hit invulnerability window.
run = makeRun(); run.enter();
const qcrate = makeObstacle('qcrate', run.camX + PLAYER_X);
run.obstacles = [qcrate]; run.player.grounded = false; run.player.y = 32; run.player.vy = 0; run.player.iframes = 1;
run.collide();
assert(!qcrate.live, '! crate breaks during post-hit invulnerability');
run.player.iframes = 0; run.player.grounded = true; run.player.y = 0;

// Unbreakables reject every player projectile family, but every weapon contact
// uses its weapon-specific WAV rather than the old generic crash.
const originalSfx = Audio.sfx;
let projectileContacts = 0;
let projectileImpacts = 0;
let weaponLaunches = 0;
Audio.sfx = function(name, ...args) {
  if (name === 'contact') projectileContacts++;
  if (name === 'impact') projectileImpacts++;
  if (name === 'launch') weaponLaunches++;
  return originalSfx.call(this, name, ...args);
};
for (const type of ['pellet', 'axe', 'fist']) {
  const pipe = makeObstacle('pipe', run.camX + PLAYER_X + 20);
  run.obstacles = [pipe];
  run.projectiles = [{ type, x: pipe.x, alt: type === 'pellet' ? 8 : 10, vx: 0, t: 0, live: true, returning: false, hits: 1, pierce: type === 'pellet', hitIds: new Set() }];
  run.updateProjectiles(0, 160);
  assert(pipe.live, `${type} cannot destroy an unbreakable pipe`);
}
run.relay.current = 'lorenzo';
run.player.setHero('lorenzo');
run.player.grounded = true;
run.player.abilityCd = 0;
const spannerTarget = makeObstacle('crate', run.camX + PLAYER_X + 20);
run.obstacles = [spannerTarget];
run.useAbility();
assert(!spannerTarget.live, 'Lorenzo spanner still breaks its direct target');
run.relay.current = 'fernwick';
run.player.setHero('fernwick');
run.player.grounded = true;
run.player.abilityCd = 0;
run.player.relayCharge = true;
const shieldTarget = makeObstacle('cactus', run.camX + PLAYER_X);
run.obstacles = [shieldTarget];
run.useAbility();
run.collide();
assert(!shieldTarget.live, 'Fernwick shield contact still breaks its charged target');
// Miss Chomp's contact bite, and only while she is SELECTABLE. She has left
// the playable roster — she is still a toon, the way Gary and Dolores are, but
// HERO_BY_ID no longer has a row for her, so useAbility() reads `ability` off
// undefined and the suite dies on a hero the game can no longer hand you.
// Asserting on an unreachable hero tests nothing; skipping quietly would lose
// the coverage if she ever comes back, so it is a guard rather than a deletion.
const { HERO_BY_ID: ROSTER } = await import('../src/data/heroes.js');
if (ROSTER.chompo) {
  run.relay.current = 'chompo';
  run.player.setHero('chompo');
  run.player.grounded = true;
  run.player.abilityCd = 0;
  const chompTarget = makeObstacle('crate', run.camX + PLAYER_X + 20);
  run.obstacles = [chompTarget];
  run.useAbility();
  assert(!chompTarget.live, 'Miss Chomp contact still breaks its direct target');
}
// Kiko fires a projectile too, and the assertion below already counts her —
// the loop simply had not been given her id, so it expected four launches from
// three heroes.
for (const id of ['b33p', 'raymn', 'grumpos', 'kiko']) {
  run.relay.current = id;
  run.player.setHero(id);
  run.player.grounded = true;
  run.player.abilityCd = 0;
  run.projectiles = [];
  run.useAbility();
}
Audio.sfx = originalSfx;
assert(projectileContacts === 5, 'every reachable weapon contact family plays its specific WAV cue');
assert(projectileImpacts === 0, 'weapon contacts no longer use the generic impact crash');
assert(weaponLaunches === 4, 'B-33P, Ray M\'N, Grumpos and Kiko play distinct launch cues');

// Both shooters fire a `pellet`, so the thing that has to keep them apart is
// contactHero — without it Kiko's warning shot would land with B-33P's orb pop.
let contactHeroSeen = null;
Audio.sfx = function(name, opts, ...rest) {
  if (name === 'contact') contactHeroSeen = opts && opts.hero;
  return originalSfx.call(this, name, opts, ...rest);
};
run.projectileImpact({ type: 'pellet', contactHero: 'kiko' }, run.camX + PLAYER_X, 0);
assert(contactHeroSeen === 'kiko', "the warning shot's impact plays Kiko's cue, not B-33P's");
run.projectileImpact({ type: 'pellet' }, run.camX + PLAYER_X, 0);
assert(contactHeroSeen === 'b33p', 'a pellet with no owner still falls back to B-33P');

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
