// Primary canvas input uses the same 70/30 jump/special split for mouse and touch.
import { installDom } from './dom-stub.js';
const dom = installDom();

const { Input } = await import('../src/engine/input.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const pointer = (button, pointerId = button + 1, clientX = 240, pointerType = 'mouse') => ({
  pointerType, pointerId, button, clientX, clientY: 135,
  preventDefault() {},
});

Input.init();
Input.setContext('run');

const left = pointer(0, 1, 240);
dom.fire('canvas:pointerdown', left);
assert(Input.pressed('jump') && Input.held('jump'), 'left 70% of a mouse click jumps during a level');
dom.fire('canvas:pointerup', left);
assert(Input.released('jump') && !Input.held('jump'), 'left mouse release ends the jump hold');

Input.endFrame();
const primaryRight = pointer(0, 2, 400);
dom.fire('canvas:pointerdown', primaryRight);
assert(Input.pressed('ability') && Input.held('ability'), 'right 30% of a mouse click attacks during a level');
dom.fire('canvas:pointerup', primaryRight);
assert(Input.released('ability') && !Input.held('ability'), 'right-zone mouse release ends the attack hold');

Input.endFrame();
const touchLeft = pointer(0, 3, 240, 'touch');
dom.fire('canvas:pointerdown', touchLeft);
assert(Input.pressed('jump') && Input.held('jump'), 'left 70% of a touch jumps during a level');
dom.fire('canvas:pointerup', touchLeft);

Input.endFrame();
const touchRight = pointer(0, 4, 400, 'touch');
dom.fire('canvas:pointerdown', touchRight);
assert(Input.pressed('ability') && Input.held('ability'), 'right 30% of a touch attacks during a level');
dom.fire('canvas:pointerup', touchRight);

Input.endFrame();
const touchSwipe = pointer(0, 5, 240, 'touch');
dom.fire('canvas:pointerdown', touchSwipe);
dom.fire('canvas:pointermove', { ...touchSwipe, clientY: 170 });
assert(Input.pressed('duck') && Input.held('duck') && !Input.held('jump'),
  'a left-zone touch still promotes from jump to a down-swipe duck');
dom.fire('canvas:pointerup', touchSwipe);

Input.endFrame();
const right = pointer(2, 6, 240);
dom.fire('canvas:pointerdown', right);
assert(Input.pressed('ability') && Input.held('ability'), 'right mouse press remains an attack shortcut during a level');
dom.fire('canvas:pointerup', right);
assert(Input.released('ability') && !Input.held('ability'), 'right mouse release ends the attack hold');

Input.setContext('menu');
dom.fire('canvas:pointerdown', pointer(0, 10));
dom.fire('canvas:pointerdown', pointer(2, 11));
assert(!Input.pressed('jump') && !Input.pressed('ability'), 'mouse gameplay controls stay inactive outside levels');

Input.setContext('run');
Input.setMenuKeys(true);
dom.fire('canvas:pointerdown', pointer(0, 12));
dom.fire('canvas:pointerdown', pointer(2, 13));
assert(!Input.pressed('jump') && !Input.pressed('ability'), 'mouse gameplay controls stay inactive while paused');

Input.setContext('workshop');
const workshopRight = pointer(2, 20);
dom.fire('canvas:pointerdown', workshopRight);
assert(Input.pressed('ability'), 'right mouse press attacks in the Trophy Workshop');
dom.fire('canvas:pointerup', workshopRight);

console.log(failed ? 'MOUSE CONTROLS: FAILED' : 'MOUSE CONTROLS: PASSED');
process.exit(failed ? 1 : 0);
