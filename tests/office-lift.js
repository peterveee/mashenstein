// Corporate Kombat's open lift cars (engine/stylePacks/officeLigne/liftCar.js): a poster per
// bank, mixed, never the same design twice on a floor; the call panel on the car's side wall
// at a person's height; and the Martian only once the save has been to Gravity Grid 3
// (Peter, 14 Oct 2026), always in a dev build.
import assert from 'node:assert/strict';
import { installDom } from './dom-stub.js';
installDom();
const { liftPosterFor, liftPanel, LIFT_POSTER_NAMES } = await import('../src/engine/stylePacks/officeLigne/liftCar.js');
const { liftMartianMet } = await import('../src/game/run.js');
const { defaultSlot } = await import('../src/engine/save.js');

const used = [];
for (const [floor, banks] of [['lobby', 1], ['open', 2], ['exec', 2]]) {
  const here = Array.from({ length: banks }, (_, b) => liftPosterFor(floor, b));
  assert.equal(new Set(here).size, here.length, `${floor}: no poster twice on a floor`);
  used.push(...here);
}
assert.equal(new Set(used).size, LIFT_POSTER_NAMES.length, 'every poster design hangs somewhere');
console.log('ok: one EGGCORP poster per lift bank, all five designs used, none twice on a floor');

const car = { x: 0, y: 0, w: 36, h: 82 };
for (const floor of ['lobby', 'open', 'exec']) {
  const p = liftPanel(car, floor);
  assert.ok(p.buttons.every((b) => b.x > car.x + car.w - 5 && b.x < car.x + car.w), `${floor}: buttons on the right-hand side wall`);
  // 24.7 wall units to the metre in the car; between half a metre and 1.75 m up the wall
  assert.ok(p.buttons.every((b) => b.y < car.y + car.h - 0.5 * 24.7 && b.y > car.y + car.h - 1.75 * 24.7 * 1.16), `${floor}: buttons at a person's height`);
  assert.ok(p.buttons.length >= 20, `${floor}: a big building's worth of buttons`);
  assert.ok(p.buttons.some((b) => b.label === p.here), `${floor}: this floor has a button to light`);
}
console.log('ok: the call panel sits on the side wall at a person\'s height');

const save = (campaign) => ({ slot: { ...defaultSlot(), campaign: { ...defaultSlot().campaign, ...campaign } } });
const was = globalThis.window?.__MASH_BUILD__;
if (globalThis.window) delete globalThis.window.__MASH_BUILD__;
assert.equal(liftMartianMet(save({})), false, 'a new save has not met the Martians');
assert.equal(liftMartianMet(save({ bestScore: { 'gravity-2': 900 } })), false, 'level 2 is not enough');
assert.equal(liftMartianMet(save({ bestScore: { 'gravity-3': 0 } })), true, 'any run of Gravity Grid 3 counts, even a failed one');
assert.equal(liftMartianMet(save({ plugs: { 'gravity-3': [true, false, false] } })), true, 'a plug on Gravity Grid 3 counts');
if (globalThis.window) {
  globalThis.window.__MASH_BUILD__ = 'dev';
  assert.equal(liftMartianMet(save({})), true, 'a dev build always has the Martian');
  if (was === undefined) delete globalThis.window.__MASH_BUILD__; else globalThis.window.__MASH_BUILD__ = was;
}
console.log('ok: the Martian rides the lobby lift only after Gravity Grid 3 (always in dev)');
console.log('OFFICE LIFT: PASSED');
