import { installDom } from './dom-stub.js';
installDom();

const { frameForViewport, defaultFrame } = await import('../src/engine/frame.js');
const renderer = await import('../src/engine/renderer.js');
const { setPresentationFrame } = renderer;
const { titleWeaponMotion, titleLayout } = await import('../src/game/menus.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

for (const [kind, outAt, holdAt, returnT] of [
  ['fist', 1.42, 1.77, 0.42],
  ['axe', 1.55, 2.0, 0.5],
]) {
  const shot = {
    kind, source: 0, dir: 1, x0: 100, tFired: 1,
    returnAt: holdAt, returnT,
  };
  const outgoing = titleWeaponMotion(shot, outAt - 0.01);
  const held = titleWeaponMotion(shot, holdAt - 0.05);
  const returning = titleWeaponMotion(shot, holdAt + returnT * 0.5);
  const caught = titleWeaponMotion(shot, holdAt + returnT + 0.01);
  assert(outgoing && !outgoing.returning && outgoing.x > shot.x0,
    `${kind} travels away from its hand before turning around`);
  assert(held && !held.returning && held.x > shot.x0,
    `${kind} holds at its far point instead of disappearing`);
  assert(returning && returning.returning && returning.x < held.x,
    `${kind} visibly travels back toward its owner`);
  assert(caught?.done === true,
    `${kind} completes its catch before another throw is allowed`);
}

setPresentationFrame(frameForViewport({
  mode: 'phone-portrait',
  viewportWidth: 390,
  viewportHeight: 844,
  safeInsets: { top: 59, right: 0, bottom: 34, left: 0 },
  revision: 1,
}));
const portraitLayout = titleLayout();
for (const [kind, outAt] of [['fist', 1.42], ['axe', 1.55]]) {
  const shot = { kind, source: 0, dir: 1, x0: 100, tFired: 1 };
  const outgoing = titleWeaponMotion(shot, outAt);
  assert(outgoing && outgoing.x - shot.x0 > portraitLayout.paradeGap,
    `portrait ${kind} reaches the next character at the landscape-equivalent range`);
}
setPresentationFrame(defaultFrame());

console.log(failed ? 'TITLE WEAPONS: FAILED' : 'TITLE WEAPONS: PASSED');
process.exit(failed ? 1 : 0);
