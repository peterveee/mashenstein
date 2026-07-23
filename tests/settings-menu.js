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

assert(settings.options().length === 11, 'settings contains ten options and DONE');
assert(settings.visibleRows === 6 && settings.listStart === 0,
  'six full-size settings rows scroll above the fixed DONE row');

function down() {
  Input.press('down');
  settings.update(1 / 60);
  Input.release('down');
  Input.endFrame();
}
for (let i = 0; i < 9; i++) down();
assert(settings.idx === 9 && settings.listStart === 4,
  'keyboard navigation scrolls to the last setting');
down();
assert(settings.idx === 10 && settings.listStart === 4,
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
assert(settings.idx === 4, 'pointer selection maps to the first visible setting');

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
assert(touchSettings.idx === 10 && returned === 0,
  'the fixed DONE row selects with one touch');
touchDown(doneY);
touchUp();
assert(returned === 1 && persisted === 1,
  'a second touch on DONE saves and exits');

Input.clearAll();
console.log(failed ? 'SETTINGS MENU: FAILED' : 'SETTINGS MENU: PASSED');
process.exit(failed ? 1 : 0);
