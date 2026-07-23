// Gary's shop can contain all six purchases, eight mastery sidegrades and BACK.
// The list must scroll instead of drawing through its description and controls.
import { installDom } from './dom-stub.js';
installDom();

const { Input } = await import('../src/engine/input.js');
const { defaultSlot } = await import('../src/engine/save.js');
const { HEROES } = await import('../src/data/heroes.js');
const { ShopState } = await import('../src/game/hub/index.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const slot = defaultSlot();
for (const hero of HEROES) slot.mastery[hero.id] = { level: 2, xp: 0 };
const save = { slot, persist() {} };
let returned = 0;
const shop = new ShopState({ save, flow: { toHub: () => { returned++; } } });
shop.enter();

assert(shop.options().length === 15, 'the fullest shop contains fifteen rows');
assert(shop.visibleRows === 7 && shop.fixedLastRow && shop.listStart === 0,
  'the shop opens with seven scrolling items and a fixed final row');

function down() {
  Input.press('down'); shop.update(1 / 60); Input.release('down'); Input.endFrame();
}
for (let i = 0; i < 14; i++) down();
assert(shop.idx === 14, 'keyboard navigation reaches the final BACK row');
assert(shop.listStart === 7, 'the item window reaches its final page before BACK');

// The first visible pitch now represents option 7, not option 0.
Input.pointer.x = 60;
Input.pointer.y = shop.listY + shop.rowH / 2;
Input.press('pointer'); shop.update(1 / 60); Input.release('pointer'); Input.endFrame();
assert(shop.idx === 7, 'pointer hit-testing follows the scrolled window');

const ctx = document.createElement('canvas').getContext('2d');
shop.draw(ctx);
assert(true, 'the fullest scrolled shop renders safely');

// Return to the last row and confirm that it remains actionable.
for (let i = 0; i < 7; i++) down();
Input.press('confirm'); shop.update(1 / 60); Input.release('confirm'); Input.endFrame();
assert(returned === 1, 'the scrolled BACK row still returns to the food court');

// BACK occupies the fixed eighth pitch no matter which item page is visible.
const fixedBackShop = new ShopState({ save, flow: { toHub: () => { returned++; } } });
fixedBackShop.enter();
fixedBackShop.listStart = 5;
fixedBackShop.idx = 5;
Input.pointer = { x: 60, y: fixedBackShop.listY + fixedBackShop.rowH * 7.5, down: false };
Input.press('pointer'); fixedBackShop.update(1 / 60); Input.release('pointer'); Input.endFrame();
assert(fixedBackShop.idx === 14 && fixedBackShop.listStart === 5,
  'the fixed BACK row is selectable without changing the item scroll position');

// Touch waits until release to distinguish a tap from a swipe. Pulling upward
// reveals later rows; pulling downward returns toward the start.
const touchShop = new ShopState({ save, flow: { toHub: () => { returned++; } } });
touchShop.enter();
Input.usingTouch = true;
function touchDown(y) {
  Input.pointer = { x: 60, y, down: true };
  Input.press('pointer'); touchShop.update(1 / 60);
}
function touchMove(y) {
  Input.pointer.y = y; touchShop.update(1 / 60);
}
function touchUp() {
  Input.pointer.down = false;
  Input.release('pointer'); touchShop.update(1 / 60);
}

const touchY = touchShop.listY + touchShop.rowH * 4;
touchDown(touchY);
touchMove(touchY - touchShop.rowH * 4);
touchUp();
assert(touchShop.listStart === 4, 'an upward touch swipe reveals four later rows');
assert(returned === 1, 'a swipe never confirms the row under the finger');

touchDown(touchY);
touchMove(touchY + touchShop.rowH * 2);
touchUp();
assert(touchShop.listStart === 2, 'a downward touch swipe returns toward earlier rows');

const tapY = touchShop.listY + touchShop.rowH * 3.5;
const beforeTap = touchShop.idx;
touchDown(tapY);
assert(touchShop.idx === beforeTap, 'touch selection waits for finger release');
touchUp();
assert(touchShop.idx === touchShop.listStart + 3, 'a stationary touch still selects its visible row');

const touchBackY = touchShop.listY + touchShop.rowH * 7.5;
touchDown(touchBackY); touchUp();
assert(touchShop.idx === 14 && returned === 1, 'the fixed touch BACK row selects with one tap');
touchDown(touchBackY); touchUp();
assert(returned === 2, 'a second tap on fixed BACK exits the shop');

Input.clearAll();
console.log(failed ? 'SHOP MENU: FAILED' : 'SHOP MENU: PASSED');
process.exit(failed ? 1 : 0);
