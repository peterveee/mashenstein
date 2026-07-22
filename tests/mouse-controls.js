// Desktop mouse controls are gameplay-only: left jumps, right attacks.
import { installDom } from './dom-stub.js';
const dom = installDom();

const { Input } = await import('../src/engine/input.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const pointer = (button, pointerId = button + 1) => ({
  pointerType: 'mouse', pointerId, button, clientX: 240, clientY: 135,
  preventDefault() {},
});

Input.init();
Input.setContext('run');

const left = pointer(0);
dom.fire('canvas:pointerdown', left);
assert(Input.pressed('jump') && Input.held('jump'), 'left mouse press jumps during a level');
dom.fire('canvas:pointerup', left);
assert(Input.released('jump') && !Input.held('jump'), 'left mouse release ends the jump hold');

Input.endFrame();
const right = pointer(2);
dom.fire('canvas:pointerdown', right);
assert(Input.pressed('ability') && Input.held('ability'), 'right mouse press attacks during a level');
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
