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
const { makeObstacle } = await import('../src/game/entities.js');
const { PLAYER_X } = await import('../src/game/player.js');
const { wrapText, textWidth } = await import('../src/engine/sprites.js');
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
returnedHub.exit();

run = makeRun(); run.enter();
run.relay.current = 'lorenzo'; run.player.setHero('lorenzo');
run.player.grounded = false; run.player.vy = 0;
run.player.update(1 / 60, { held: (a) => a === 'duck' }, { speed: 160 });
assert(!run.player.stomping, 'Down no longer triggers Lorenzo air stomp');

// Gravity bypasses dash and power-up invulnerability.
run.player.grounded = true; run.player.y = 0; run.player.dashT = 0.4; run.player.iframes = 0;
run.powerups.shieldStack = 0; run.powerups.active.unpeel = { t: 10, level: 1 };
run.obstacles = [makeObstacle('gap', run.camX + PLAYER_X - 10)];
const pitCells = run.battery; run.collide();
assert(run.battery === pitCells - 1, 'pit damages through dash and UNPEELABLE');

// Unbreakables reject every player projectile family.
for (const type of ['pellet', 'axe', 'fist']) {
  const pipe = makeObstacle('pipe', run.camX + PLAYER_X + 20);
  run.obstacles = [pipe];
  run.projectiles = [{ type, x: pipe.x, alt: type === 'pellet' ? 8 : 10, vx: 0, t: 0, live: true, returning: false, hits: 1, pierce: type === 'pellet', hitIds: new Set() }];
  run.updateProjectiles(0, 160);
  assert(pipe.live, `${type} cannot destroy an unbreakable pipe`);
}

// Fernwick consumes one enemy shot per roll, without becoming invincible.
run.relay.current = 'fernwick'; run.player.setHero('fernwick'); run.player.grounded = true; run.player.abilityCd = 0; run.useAbility();
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
boss.projectiles = [{ type: 'pellet', x: boss.camX + 303, alt: 10, vx: 0, live: true, pierce: true, hitIds: new Set() }];
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

console.log(failed ? 'RELIABILITY: FAILED' : 'RELIABILITY: PASSED');
process.exit(failed ? 1 : 0);
