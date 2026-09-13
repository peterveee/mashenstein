// Portrait title composition contracts. The layout is a full-frame presentation
// choice, so keep it separate from the landscape interaction tests.
import assert from 'node:assert/strict';
import { installDom } from './dom-stub.js';

installDom({ innerWidth: 390, innerHeight: 844, devicePixelRatio: 3 });

const { frameForViewport, defaultFrame } = await import('../src/engine/frame.js');
const renderer = await import('../src/engine/renderer.js');
const { setPresentationFrame } = renderer;
const { Input } = await import('../src/engine/input.js');
const { TitleState, titleLayout, titleToasterPass, invaderPass } = await import('../src/game/menus.js');
const { save } = await import('../src/engine/save.js');
save.load();

const portraitFrame = frameForViewport({
  mode: 'phone-portrait',
  viewportWidth: 390,
  viewportHeight: 844,
  safeInsets: { top: 59, right: 0, bottom: 34, left: 0 },
  revision: 1,
});
setPresentationFrame(portraitFrame);

const layout = titleLayout();
assert.equal(layout.portrait, true, 'title opts into the frame-based portrait presentation');
assert.equal(renderer.H, portraitFrame.height, 'portrait title uses the full logical frame height');
assert.ok(layout.logoScale > 4.4, 'portrait logo is larger than the landscape logo');
assert.ok(layout.marqueeY > layout.safeTop + 26, 'portrait title sits below the safe-area breathing room');
assert.ok(layout.logoScale * 6 * 10 < 480, 'portrait logo remains inside the logical screen width');
assert.ok(layout.cardW >= 180, 'portrait title cards retain a readable minimum width');
assert.ok(layout.cardW < 230, 'portrait title cards sit inside the subtitle width');
assert.ok(layout.cardH > 70, 'portrait title cards have a finger-sized height');
assert.ok(layout.cardGap > 0, 'portrait cards are visibly stacked with gaps');
assert.ok(layout.menuTextS > 2.6, 'portrait card labels use the larger type scale');
assert.ok(layout.statusTextS > 2.3, 'portrait plug counts use the larger type scale');
assert.ok(layout.subtitleTextS > 2.2, 'portrait subtitle uses the larger display type scale');
assert.ok(layout.footerTextS > 2.2, 'portrait pre-parade caption uses the larger display type scale');
assert.ok(layout.controlsTextS > 2, 'portrait keyboard hint uses a much larger display type scale');
assert.ok(layout.footerY < layout.floorY - 70, 'portrait pre-parade caption sits higher above the cast');
assert.ok(layout.paradeGap > 84, 'portrait cast keeps landscape-equivalent breathing room');
assert.ok(layout.paradeTop > layout.panelY + layout.cardH * 4,
  'portrait cast is given its own lower stage below the menu stack');
assert.ok(layout.castH >= 100, 'portrait cast is enlarged');
assert.ok(layout.castFeetY <= portraitFrame.safeRect.bottom,
  'portrait cast stays above the home-indicator safe edge');
assert.equal(layout.backgroundBottom, renderer.H,
  'portrait star field fills the full logical frame');
assert.equal(invaderPass(24), null,
  'portrait title suppresses the space invader fly-by');
const portraitToaster = titleToasterPass(37);
const cardsBottom = layout.panelY + layout.cardH * 4 + layout.cardGap * 3;
assert.ok(portraitToaster && portraitToaster.centerY >= layout.panelY + 32
  && portraitToaster.centerY <= cardsBottom - 32,
  'portrait toaster cameo crosses the button stack above the heroes');

let chosen = -1;
const title = new TitleState({
  save,
  onSlotChosen(i) { chosen = i; },
  onSettings() {}, onHowTo() {}, onGuide() {}, onSoundTest() {},
  attractDelay: 1e9,
});
Input.usingTouch = true;
title.enter();
assert.equal(title.titleShooters.size, 3,
  'each title visit assigns exactly three randomized shooters');
const probe = document.createElement('canvas');
assert.doesNotThrow(() => title.draw(probe.getContext('2d')),
  'portrait title paints through the real renderer without a stretched-frame error');
Input.pointer = { x: 240, y: layout.panelY + layout.cardH / 2, down: false };
Input.press('pointer');
title.update(0);
Input.release('pointer');
Input.endFrame();
assert.equal(title.touchPress?.i, 0, 'portrait first card receives a tap in its visible bounds');
title.update(0.1);
assert.equal(chosen, 0, 'portrait card activation follows the same delayed touch feedback');
Input.pointer = {
  x: 240,
  y: layout.panelY + 2 * (layout.cardH + layout.cardGap) + layout.cardH / 2,
  down: false,
};
Input.press('pointer');
title.update(0);
Input.release('pointer');
Input.endFrame();
assert.equal(title.touchPress?.i, 2, 'portrait third card is reached by the vertical stack');
title.update(0.1);
assert.equal(chosen, 2, 'portrait stacked card activation follows its visible row');
title.shots.push({
  id: 'portrait-runtime-probe', kind: 'pellet', tFired: title.t,
  x0: 0, y: 0, dir: 1, source: null, sounded: true,
});
assert.doesNotThrow(() => title.update(0),
  'portrait title advances a live projectile through its collision loop');
title.exit();
Input.usingTouch = false;
setPresentationFrame(defaultFrame());

console.log('TITLE PORTRAIT: PASSED');
