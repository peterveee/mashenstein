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

// One frame of the real loop, in the order states.updateState runs it: clear
// last frame's edges, advance the clock, then let any held touch whose gesture
// has resolved make its press — before the state reads input.
const frame = (ms = 16) => { Input.endFrame(); dom.frame(ms); Input.resolveTouches(); };

Input.init();
Input.setContext('run');

// iOS runs native touch/gesture recognisers alongside Pointer Events. Both
// visible canvases must synchronously cancel those recognisers so a stationary
// thumb cannot raise the text/image magnifier or callout over the game.
for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel',
  'gesturestart', 'gesturechange', 'gestureend', 'dblclick']) {
  assert((dom.listeners[`canvas:${type}`] || []).length === 2,
    `both canvases block native ${type}`);
}
let nativePrevented = 0;
dom.fire('canvas:touchstart', { preventDefault() { nativePrevented++; } });
assert(nativePrevented === 2, 'native touch cancellation calls preventDefault on both canvases');
assert(dom.canvas.style.touchAction === 'none'
  && dom.canvas.style.webkitTouchCallout === 'none'
  && dom.canvas.style.webkitUserSelect === 'none'
  && dom.canvas.draggable === false,
  'the playable canvas carries direct iOS selection and drag opt-outs');

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

// A touch on the playable canvas is held until the gesture declares itself: a
// finger landing is the same event for a tap and for the start of a swipe, and
// firing on contact is what used to make every swipe down hop first.
frame();
const touchLeft = pointer(0, 3, 240, 'touch');
dom.fire('canvas:pointerdown', touchLeft);
assert(!Input.pressed('jump') && !Input.held('jump'),
  'a touch does not jump on contact — the gesture has not resolved yet');
dom.frame(70);
dom.fire('canvas:pointerup', touchLeft);
assert(Input.pressed('jump') && Input.held('jump'),
  'lifting the finger resolves it as a tap: left 70% of a touch jumps');
// The hold the player performed is replayed rather than collapsed: a press and
// a release in the same frame would cut the jump on the frame it started.
frame();
assert(Input.held('jump') && !Input.released('jump'), 'the tap keeps its hold after the finger lifts');
frame(90);
assert(Input.released('jump') && !Input.held('jump'), 'the replayed hold ends one tap-length later');

// A very fast tap used to replay its literal few milliseconds after pointerup.
// Variable jump then cut it almost immediately, producing a tiny accidental-
// looking hop. It should remain the shortest jump, but survive long enough for
// several gameplay frames.
frame();
const quickTouch = pointer(0, 30, 240, 'touch');
dom.fire('canvas:pointerdown', quickTouch);
dom.frame(8);
dom.fire('canvas:pointerup', quickTouch);
assert(Input.pressed('jump') && Input.held('jump'), 'an ultra-quick tap resolves as a jump');
frame(80);
assert(Input.held('jump') && !Input.released('jump'), 'an ultra-quick tap gets a useful minimum jump hold');
frame(25);
assert(Input.released('jump') && !Input.held('jump'), 'the minimum quick-tap hold still releases promptly');

frame();
const touchRight = pointer(0, 4, 400, 'touch');
dom.fire('canvas:pointerdown', touchRight);
dom.frame(70);
dom.fire('canvas:pointerup', touchRight);
assert(Input.pressed('ability'), 'right 30% of a touch attacks during a level');
frame(90);

// A finger that stays down commits on its own, without waiting for the lift —
// tap-and-hold is how the game buys jump height.
frame();
const touchHold = pointer(0, 9, 240, 'touch');
dom.fire('canvas:pointerdown', touchHold);
frame();
assert(!Input.held('jump'), 'a still finger is briefly held before it commits');
frame(80);
assert(Input.pressed('jump') && Input.held('jump'), 'a still finger commits to the jump and keeps holding it');
dom.fire('canvas:pointerup', touchHold);
assert(Input.released('jump') && !Input.held('jump'), 'the committed jump ends on release');

frame();
const touchSwipe = pointer(0, 5, 240, 'touch');
dom.fire('canvas:pointerdown', touchSwipe);
dom.fire('canvas:pointermove', { ...touchSwipe, clientY: 170 });
assert(Input.pressed('duck') && Input.held('duck') && !Input.held('jump'),
  'a left-zone down-swipe ducks and never fires the jump it landed on');
dom.fire('canvas:pointerup', touchSwipe);

// The power side promotes the same way. Ducking is a defensive move and has to
// be available under whichever thumb is already down — a one-handed player's
// thumb lives over the right zone, and for a long time that thumb could not
// duck at all.
frame();
const touchSwipeRight = pointer(0, 7, 400, 'touch');
dom.fire('canvas:pointerdown', touchSwipeRight);
dom.fire('canvas:pointermove', { ...touchSwipeRight, clientY: 170 });
assert(Input.pressed('duck') && Input.held('duck') && !Input.held('ability'),
  'a right-zone down-swipe ducks and never spends the power it landed on');
dom.fire('canvas:pointerup', touchSwipeRight);
assert(Input.released('duck') && !Input.held('duck'), 'the right-zone duck ends on release');

// A rightward drag that starts in the RIGHT zone resolves to the power the zone
// already meant — once. The swipe-right mapping releasing and re-pressing it
// would be one drag firing two specials off one cooldown.
frame();
const dragRight = pointer(0, 8, 400, 'touch');
dom.fire('canvas:pointerdown', dragRight);
dom.fire('canvas:pointermove', { ...dragRight, clientX: 440 });
assert(Input.pressed('ability') && Input.held('ability'),
  'a rightward drag inside the power zone fires the power once');
frame();
dom.fire('canvas:pointermove', { ...dragRight, clientX: 470 });
assert(!Input.pressed('ability') && Input.held('ability'),
  'dragging further does not re-fire it');
dom.fire('canvas:pointerup', dragRight);

frame();
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
