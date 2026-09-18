// Portrait cast-roll composition contracts. The landscape cast interaction
// remains covered by tests/cast.js; this suite checks the frame-based phone
// layout and exercises the real portrait draw path through the DOM stub.
import assert from 'node:assert/strict';
import { installDom } from './dom-stub.js';

installDom({ innerWidth: 390, innerHeight: 844, devicePixelRatio: 3 });

const { frameForViewport, defaultFrame } = await import('../src/engine/frame.js');
const renderer = await import('../src/engine/renderer.js');
const { CastState, castLayout, CAST_HEROES } = await import('../src/game/cast.js');
const { textWidth } = await import('../src/engine/sprites.js');
const { save } = await import('../src/engine/save.js');
const { Input } = await import('../src/engine/input.js');

const portraitFrame = frameForViewport({
  mode: 'phone-portrait',
  viewportWidth: 390,
  viewportHeight: 844,
  safeInsets: { top: 59, right: 0, bottom: 34, left: 0 },
  revision: 1,
});
renderer.setPresentationFrame(portraitFrame);
save.load();

const st = new CastState({ realSettings: save.settings, onExit() {} });
st.enter();
const ctx = document.createElement('canvas').getContext('2d');

assert.equal(CastState.portraitMode, 'frame', 'cast roll opts into the full portrait frame');
assert.equal(renderer.H, portraitFrame.height, 'cast roll uses the derived tall logical frame');

for (const hero of CAST_HEROES.filter((candidate) => candidate.id !== 'chompo')) {
  const layout = castLayout(hero);
  assert.equal(layout.portrait, true, `${hero.short} resolves a portrait layout`);
  assert.equal(layout.heroStageX, 0, `${hero.short} performance stage starts at the screen edge`);
  assert.equal(layout.heroStageW, 480, `${hero.short} performance stage fills the logical width`);
  assert.ok(layout.panelBottom < layout.heroStageTop,
    `${hero.short} copy panel sits above the performance stage`);
  assert.ok(layout.copyBottom < layout.heroStageTop,
    `${hero.short} copy stays above the hero`);
  assert.ok(layout.heroFeetY < layout.floorY,
    `${hero.short} stands above the portrait reflection line`);
  assert.ok(layout.reflectionGap >= 10,
    `${hero.short} leaves enough floor to see the reflection`);
  assert.ok(layout.progressY > layout.floorY,
    `${hero.short} indicators sit below the floor`);
  assert.ok(layout.hintMid > layout.progressY,
    `${hero.short} return prompt sits below the indicators`);
  assert.ok(layout.progressW > 6 && layout.progressH > 4,
    `${hero.short} indicators are larger than the landscape marks`);
  assert.equal(layout.separatorX + layout.separatorW / 2, layout.center,
    `${hero.short} separator is centred in the copy column`);
  const textRows = layout.textRows.filter((row) => row.kind === 'text');
  const bodyRows = textRows.slice(1); // the hero short name is the one size exception
  assert.equal(new Set(bodyRows.map((row) => row.scale)).size, 1,
    `${hero.short} keeps one scale for all dossier copy below its name`);
  assert.equal(new Set(textRows.map((row) => row.gap)).size, 1,
    `${hero.short} keeps one line-height gap across the dossier copy`);
  assert.ok(layout.textRows.some((row) => row.kind === 'section-gap'),
    `${hero.short} keeps explicit separation between information sections`);
  assert.ok(textWidth('MEET THE CAST', layout.headerScale, 'bold') <= layout.width + 1,
    'MEET THE CAST heading fits the full copy width');
  assert.ok(layout.promptScale > 1.5, 'portrait return prompt uses the larger type scale');
  assert.ok(layout.heroH >= 150, `${hero.short} hero remains substantial after portrait resize`);
  assert.ok(layout.heroTileFloor > layout.heroTopReach,
    `${hero.short} CRT tile clears the full top reach of the toon`);
  assert.ok(layout.heroTile > layout.heroTileFloor,
    `${hero.short} CRT tile keeps a little floor-side breathing room`);
  assert.ok(layout.heroFeetY <= portraitFrame.safeRect.bottom,
    `${hero.short} feet stay above the home-indicator safe edge`);
  assert.ok(layout.textRows.length > 0, `${hero.short} has measured portrait copy rows`);
}

const compactFrame = frameForViewport({
  mode: 'phone-portrait',
  viewportWidth: 320,
  viewportHeight: 568,
  safeInsets: { top: 20, right: 0, bottom: 20, left: 0 },
  revision: 2,
});
renderer.setPresentationFrame(compactFrame);
for (const hero of st.roll) {
  const layout = castLayout(hero);
  assert.ok(layout.panelBottom < layout.heroStageTop,
    `${hero.short} compact portrait keeps copy above the hero`);
  assert.ok(layout.heroH >= 150,
    `${hero.short} compact portrait keeps a substantial hero`);
}
renderer.setPresentationFrame(portraitFrame);

assert.doesNotThrow(() => st.draw(ctx),
  'portrait cast paints through the real draw path without a stretched-frame error');

Input.usingTouch = true;
st.slotT = 1;
const first = castLayout(st.roll[st.i]);
Input.pointer = { x: first.center, y: first.heroStageTop + 20, down: false };
Input.activity++;
Input.press('pointer');
st.update(1 / 60);
assert.equal(st.i, 1, 'a tap in the full-width portrait performance floor advances the roll');
Input.usingTouch = false;
st.exit();
renderer.setPresentationFrame(defaultFrame());

console.log('CAST PORTRAIT: PASSED');
