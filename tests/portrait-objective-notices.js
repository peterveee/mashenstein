// Portrait objective notices: counted progress is one replaceable card, not a
// queue of stale coin/beat updates, and completion gets its own read.
import assert from 'node:assert/strict';
import { installDom } from './dom-stub.js';

installDom({ innerWidth: 390, innerHeight: 844 });
window.__mash_platform = { isDesktop: false, isIphone: true };

const { frameForViewport } = await import('../src/engine/frame.js');
const renderer = await import('../src/engine/renderer.js');
const { RunState } = await import('../src/game/run.js');
const { drawHud } = await import('../src/game/hud.js');
const { PORTRAIT_OBJECTIVE_NOTICE_SEC } = await import('../src/game/portrait-layout.js');
const { save } = await import('../src/engine/save.js');

save.load(); save.newSlot(0, 0);
renderer.setPresentationFrame(frameForViewport({
  mode: 'phone-portrait', viewportWidth: 390, viewportHeight: 844,
}));

const run = new RunState({
  stage: {
    id: 'portrait-notices-1', cabinet: 'plumber', index: 1,
    mission: { type: 'chase', n: 3, desc: 'BONK THE COPTER' },
    challenge: { type: 'coins', n: 6, desc: 'GET BLOCKS' },
    durationSec: 40,
  },
  save, seed: 23, difficulty: 1, skipRunIn: true, onEnd() {},
});
run.enter();

run.copterBonks = 1;
run.challenge.count = 1;
run.updatePortraitObjectiveNotice(0, 0);
assert.equal(run.portraitObjectiveNotice.tag, 'BONUS',
  'one simultaneous tick chooses one notice instead of stacking goal and bonus');
assert.equal(run.portraitObjectiveNotice.text, '1/6',
  'bonus progress uses the live challenge count');
assert.equal(run.portraitObjectiveNotice.t0, PORTRAIT_OBJECTIVE_NOTICE_SEC,
  'portrait notices hold for the authored few-second reading budget');

run.copterBonks = 2;
run.updatePortraitObjectiveNotice(1, 1);
assert.equal(run.portraitObjectiveNotice.tag, 'GOAL',
  'a newer goal event replaces the active bonus notice');
assert.equal(run.portraitObjectiveNotice.text, '2/3',
  'goal progress uses the live mission count');

run.copterBonks = 3;
run.updatePortraitObjectiveNotice(2, 1);
assert.equal(run.portraitObjectiveNotice.text, 'COMPLETE',
  'goal completion gets a distinct notice');

run.challenge.count = 6;
run.updatePortraitObjectiveNotice(3, 1);
assert.equal(run.portraitObjectiveNotice.tag, 'BONUS',
  'bonus completion can replace the goal completion notice');
assert.equal(run.portraitObjectiveNotice.text, 'COMPLETE',
  'bonus completion gets a distinct notice');

run.stage.mission = { type: 'coins', n: 20, desc: 'COLLECT COINS' };
run.stage.challenge = { type: 'coins', n: 20, desc: 'COLLECT COINS' };
run.mission = run.stage.mission;
run.challenge = run.stage.challenge;
run.mission.count = 1;
run.challenge.count = 1;
run.portraitObjectiveNotice = null;
run.updatePortraitObjectiveNotice(0, 0);
assert.equal(run.portraitObjectiveNotice, null,
  'long objectives do not announce every single count');

run.challenge.count = 10;
run.updatePortraitObjectiveNotice(1, 1);
assert.equal(run.portraitObjectiveNotice.text, '10/20',
  'long objectives announce at the ten-count boundary');

run.challenge.count = 20;
run.updatePortraitObjectiveNotice(1, 10);
assert.equal(run.portraitObjectiveNotice.text, 'COMPLETE',
  'long objectives still announce completion');

const ctx = globalThis.document.createElement('canvas').getContext('2d');
assert.doesNotThrow(() => drawHud(ctx, run),
  'portrait HUD draws the active objective notice');

renderer.setPresentationFrame(frameForViewport({
  mode: 'landscape', viewportWidth: 844, viewportHeight: 390,
}));
run.portraitObjectiveNotice = null;
run.showPortraitObjectiveNotice('GOAL', '1/3');
assert.equal(run.portraitObjectiveNotice, null,
  'objective notices stay portrait-only');

console.log('PORTRAIT OBJECTIVE NOTICES: PASSED');
