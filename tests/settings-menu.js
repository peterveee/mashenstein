// Settings keeps readable rows by scrolling its options behind a fixed DONE row.
import { installDom } from './dom-stub.js';
installDom();

const { Input } = await import('../src/engine/input.js');
const { defaultSettings } = await import('../src/engine/save.js');
const { SettingsState } = await import('../src/game/menus.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

let persisted = 0;
let returned = 0;
const save = {
  settings: defaultSettings(),
  persist() { persisted++; },
};
const settings = new SettingsState({ save, onDone: () => { returned++; } });
settings.enter();

// Counted relative to the list rather than pinned to a number: this menu gains
// an option every so often, and a hard-coded 11 turns "we added a setting" into
// three unrelated-looking failures about scrolling and pointer hit-testing. What
// actually matters is that DONE is last and the window follows the cursor.
const N = settings.options().length;
assert(N >= 2, `settings has options and a DONE row (${N})`);
assert(/DONE|BACK/.test(settings.options()[N - 1].label),
  'the last row is the way out');
assert(settings.visibleRows === 6 && settings.listStart === 0,
  'six full-size settings rows scroll above the fixed DONE row');

function down() {
  Input.press('down');
  settings.update(1 / 60);
  Input.release('down');
  Input.endFrame();
}
const lastSetting = N - 2;              // everything but DONE
const restingStart = lastSetting - settings.visibleRows + 1;
for (let i = 0; i < lastSetting; i++) down();
assert(settings.idx === lastSetting && settings.listStart === restingStart,
  `keyboard navigation scrolls to the last setting (idx ${settings.idx}, start ${settings.listStart})`);
down();
assert(settings.idx === N - 1 && settings.listStart === restingStart,
  'DONE is reached without moving the settings window');

const ctx = document.createElement('canvas').getContext('2d');
settings.draw(ctx);
assert(true, 'the scrolled settings menu renders safely');

// Pointer hit-testing follows the visible page.
Input.usingTouch = false;
Input.pointer = { x: 60, y: settings.listY + settings.rowH / 2, down: true };
Input.press('pointer');
settings.update(1 / 60);
Input.pointer.down = false;
Input.release('pointer');
Input.endFrame();
assert(settings.idx === restingStart,
  `pointer selection maps to the first visible setting (${settings.idx})`);

// Touch waits for release, so a swipe cannot toggle the row beneath the finger.
const touchSettings = new SettingsState({ save, onDone: () => { returned++; } });
touchSettings.enter();
Input.usingTouch = true;
function touchDown(y) {
  Input.pointer = { x: 60, y, down: true };
  Input.press('pointer');
  touchSettings.update(1 / 60);
}
function touchMove(y) {
  Input.pointer.y = y;
  touchSettings.update(1 / 60);
}
function touchUp() {
  Input.pointer.down = false;
  Input.release('pointer');
  touchSettings.update(1 / 60);
}

const swipeY = touchSettings.listY + touchSettings.rowH * 4;
const mutedBeforeSwipe = save.settings.muted;
touchDown(swipeY);
touchMove(swipeY - touchSettings.rowH * 3);
touchUp();
assert(touchSettings.listStart === 3, 'an upward swipe reveals later settings');
assert(save.settings.muted === mutedBeforeSwipe, 'a swipe does not change a setting');

const doneY = touchSettings.doneY + touchSettings.doneH / 2;
touchDown(doneY);
touchUp();
assert(returned === 1 && persisted === 1,
  'one touch on BACK saves and exits');

// AUDIO SYNC: the row a wireless player needs, and the only settings row whose
// CONFIRM opens another screen rather than cycling a value — a touchscreen has
// no left and right, and a phone is exactly the device that needs the tap test.
const { Audio } = await import('../src/engine/audio.js');
const syncRow = () => settings.options().find((o) => /^AUDIO SYNC/.test(o.label));
assert(!!syncRow(), 'settings offers an AUDIO SYNC row');
assert(/AUDIO SYNC: 0 MS/.test(syncRow().label), 'which starts at no correction');
syncRow().adjust(1);
syncRow().adjust(1);
assert(save.settings.audioSyncMs === 20 && /\+20 MS/.test(syncRow().label),
  'right nudges it up in tens and signs the number');
assert(Math.abs(Audio.syncOffsetSec - 0.02) < 1e-9,
  'and the audio clock hears about it immediately, not on the way out of the menu');
for (let i = 0; i < 60; i++) syncRow().adjust(1);
assert(save.settings.audioSyncMs === 500, 'it clamps at the top rather than running away');
for (let i = 0; i < 200; i++) syncRow().adjust(-1);
assert(save.settings.audioSyncMs === -100, 'and at the bottom');
syncRow().adjust(10);
assert(save.settings.audioSyncMs === 0, 'back to nothing');

let calibrated = 0;
const withCal = new SettingsState({ save, onDone() {}, onCalibrate: () => { calibrated++; } });
withCal.enter();
withCal.options().find((o) => /^AUDIO SYNC/.test(o.label)).act();
assert(calibrated === 1, 'confirming the row opens the calibration screen');

Input.clearAll();
console.log(failed ? 'SETTINGS MENU: FAILED' : 'SETTINGS MENU: PASSED');
process.exit(failed ? 1 : 0);
