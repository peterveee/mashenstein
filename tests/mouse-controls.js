// A mouse gets one verb per button — left jump, right slide, middle attack — while
// touch gets the two halves it needs for two thumbs: left JUMP, right SLIDE,
// with the special on its own disc and on a swipe right. Every pointer lands
// on #chrome, the one surface; the discs and margin zones it registers fire on
// contact, the halves wait for the gesture to declare itself.
import { installDom } from './dom-stub.js';
const dom = installDom();

const { Input } = await import('../src/engine/input.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// x 120 is well inside the left (jump) half; the seam is the picture's centre, 240.
const pointer = (button, pointerId = button + 1, clientX = 120, pointerType = 'mouse') => ({
  pointerType, pointerId, button, clientX, clientY: 135,
  preventDefault() {},
});

// One frame of the real loop, in the order states.updateState runs it: clear
// last frame's edges, advance the clock, then let any held touch whose gesture
// has resolved make its press — before the state reads input.
const frame = (ms = 16) => { Input.endFrame(); dom.frame(ms); Input.resolveTouches(); };

Input.init();
Input.setContext('run');

// iOS runs native touch/gesture recognisers alongside Pointer Events. The one
// pointer surface (#chrome) must synchronously cancel those recognisers so a
// stationary thumb cannot raise the text/image magnifier or callout over the
// game. Exactly one listener: #game takes no pointer at all now.
for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel',
  'gesturestart', 'gesturechange', 'gestureend', 'dblclick']) {
  assert((dom.listeners[`canvas:${type}`] || []).length === 1,
    `the pointer surface blocks native ${type}, once`);
}
let nativePrevented = 0;
dom.fire('canvas:touchstart', { preventDefault() { nativePrevented++; } });
assert(nativePrevented === 1, 'native touch cancellation calls preventDefault on the pointer surface');
assert(dom.chromeCanvas.style.touchAction === 'none'
  && dom.chromeCanvas.style.webkitTouchCallout === 'none'
  && dom.chromeCanvas.style.webkitUserSelect === 'none'
  && dom.chromeCanvas.draggable === false,
  'the pointer surface carries direct iOS selection and drag opt-outs');

const left = pointer(0, 1, 240);
dom.fire('canvas:pointerdown', left);
assert(Input.pressed('jump') && Input.held('jump'), 'a left mouse click jumps during a level');
dom.fire('canvas:pointerup', left);
assert(Input.released('jump') && !Input.held('jump'), 'left mouse release ends the jump hold');

// The touch zones do not apply to a cursor: the special has its own button, so
// where the pointer happens to be resting never changes what a left click does.
Input.endFrame();
const leftFarSide = pointer(0, 2, 400);
dom.fire('canvas:pointerdown', leftFarSide);
assert(Input.pressed('jump') && Input.held('jump') && !Input.held('ability'),
  'a left click over the power zone still jumps — the split is thumbs only');
dom.fire('canvas:pointerup', leftFarSide);
assert(Input.released('jump') && !Input.held('jump'), 'that release ends the jump hold too');

// A touch on the playable canvas is held until the gesture declares itself: a
// finger landing is the same event for a tap and for the start of a swipe, and
// firing on contact is what used to make every swipe down hop first.
frame();
const touchLeft = pointer(0, 3, 120, 'touch');
dom.fire('canvas:pointerdown', touchLeft);
assert(!Input.pressed('jump') && !Input.held('jump'),
  'a touch does not jump on contact — the gesture has not resolved yet');
dom.frame(70);
dom.fire('canvas:pointerup', touchLeft);
assert(Input.pressed('jump') && Input.held('jump'),
  'lifting the finger resolves it as a tap: the left half of a touch jumps');
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
const quickTouch = pointer(0, 30, 120, 'touch');
dom.fire('canvas:pointerdown', quickTouch);
dom.frame(8);
dom.fire('canvas:pointerup', quickTouch);
assert(Input.pressed('jump') && Input.held('jump'), 'an ultra-quick tap resolves as a jump');
frame(80);
assert(Input.held('jump') && !Input.released('jump'), 'an ultra-quick tap gets a useful minimum jump hold');
frame(25);
assert(Input.released('jump') && !Input.held('jump'), 'the minimum quick-tap hold still releases promptly');

// The right half is SLIDE — the other frequent, held action — not the special.
frame();
const touchRight = pointer(0, 4, 400, 'touch');
dom.fire('canvas:pointerdown', touchRight);
dom.frame(70);
dom.fire('canvas:pointerup', touchRight);
assert(Input.pressed('duck') && Input.held('duck') && !Input.held('ability') && !Input.held('jump'),
  'the right half of a touch slides during a level, and spends no power');
frame(90);
assert(!Input.held('duck'), 'the replayed slide hold ends one tap-length later');

// The seam is the picture's centre: a tap just left of it jumps, just right
// of it slides.
frame();
const nearLeft = pointer(0, 31, 239, 'touch');
dom.fire('canvas:pointerdown', nearLeft);
dom.frame(70);
dom.fire('canvas:pointerup', nearLeft);
assert(Input.pressed('jump') && !Input.held('duck'), 'x 239 is the jump half');
frame(120);
const nearRight = pointer(0, 32, 241, 'touch');
dom.fire('canvas:pointerdown', nearRight);
dom.frame(70);
dom.fire('canvas:pointerup', nearRight);
assert(Input.pressed('duck') && !Input.held('jump'), 'x 241 is the slide half');
frame(120);

// A finger that stays down commits on its own, without waiting for the lift —
// tap-and-hold is how the game buys jump height.
frame();
const touchHold = pointer(0, 9, 120, 'touch');
dom.fire('canvas:pointerdown', touchHold);
frame();
assert(!Input.held('jump'), 'a still finger is briefly held before it commits');
frame(80);
assert(Input.pressed('jump') && Input.held('jump'), 'a still finger commits to the jump and keeps holding it');
dom.fire('canvas:pointerup', touchHold);
assert(Input.released('jump') && !Input.held('jump'), 'the committed jump ends on release');

frame();
const touchSwipe = pointer(0, 5, 120, 'touch');
dom.fire('canvas:pointerdown', touchSwipe);
dom.fire('canvas:pointermove', { ...touchSwipe, clientY: 170 });
assert(Input.pressed('duck') && Input.held('duck') && !Input.held('jump'),
  'a left-zone down-swipe ducks and never fires the jump it landed on');
dom.fire('canvas:pointerup', touchSwipe);

// The slide half promotes the same way: a down-swipe from it is still one duck,
// not a tap-duck followed by a swipe-duck.
frame();
const touchSwipeRight = pointer(0, 7, 400, 'touch');
dom.fire('canvas:pointerdown', touchSwipeRight);
dom.fire('canvas:pointermove', { ...touchSwipeRight, clientY: 170 });
assert(Input.pressed('duck') && Input.held('duck') && !Input.held('ability'),
  'a right-half down-swipe ducks once and never spends the power');
dom.fire('canvas:pointerup', touchSwipeRight);
assert(Input.released('duck') && !Input.held('duck'), 'the right-half duck ends on release');

// A rightward drag from either half is the special — once, and without the
// slide the half would otherwise have meant. The swipe-right mapping releasing
// and re-pressing it would be one drag firing two specials off one cooldown.
frame();
const dragRight = pointer(0, 8, 400, 'touch');
dom.fire('canvas:pointerdown', dragRight);
dom.fire('canvas:pointermove', { ...dragRight, clientX: 440 });
assert(Input.pressed('ability') && Input.held('ability') && !Input.held('duck'),
  'a rightward drag from the slide half fires the power once and never slides');
frame();
dom.fire('canvas:pointermove', { ...dragRight, clientX: 470 });
assert(!Input.pressed('ability') && Input.held('ability'),
  'dragging further does not re-fire it');
dom.fire('canvas:pointerup', dragRight);

// The touch chrome: discs on the picture and zones in the margin, in viewport
// px, both firing on contact. A disc wins inside its slop; outside it a tap
// falls through to whichever half it is on.
frame();
Input.setChromeButtons([
  { id: 'pause', action: 'escape', x: 450, y: 58, r: 18 },
  { id: 'zone:left', action: 'jump', zone: { x: 0, y: 0, w: 40, h: 270 } },
]);
const onDisc = { ...pointer(0, 50, 450, 'touch'), clientY: 58 };
dom.fire('canvas:pointerdown', onDisc);
assert(Input.pressed('escape') && Input.held('escape') && !Input.held('duck'),
  'a tap on the PAUSE disc fires on contact and never reaches the slide half under it');
dom.fire('canvas:pointerup', onDisc);
assert(Input.released('escape'), 'and releases on the lift');
frame();
const nearDisc = { ...pointer(0, 51, 478, 'touch'), clientY: 58 };
dom.fire('canvas:pointerdown', nearDisc);
assert(!Input.held('escape') && !Input.held('duck'), 'a tap past the disc\'s slop is a pending gesture, not a press');
dom.frame(70);
dom.fire('canvas:pointerup', nearDisc);
assert(Input.pressed('duck') && !Input.held('escape'), 'and resolves to the half it landed on');
frame(120);
const inZone = { ...pointer(0, 52, 20, 'touch'), clientY: 200 };
dom.fire('canvas:pointerdown', inZone);
assert(Input.pressed('jump') && Input.held('jump'), 'a tap in a margin zone fires its action on contact');
dom.fire('canvas:pointerup', inZone);
assert(Input.released('jump'), 'and releases on the lift');
Input.setChromeButtons([]);

frame();
const right = pointer(2, 6, 240);
dom.fire('canvas:pointerdown', right);
assert(Input.pressed('duck') && Input.held('duck'),
  'right mouse press slides — the same held duck/kick action as Down Arrow');
dom.fire('canvas:pointerup', right);
assert(Input.released('duck') && !Input.held('duck'), 'right mouse release ends the duck/kick hold');

frame();
const middle = pointer(1, 15, 240);
dom.fire('canvas:pointerdown', middle);
assert(Input.pressed('ability') && Input.held('ability'), 'middle mouse press attacks during a level');
dom.fire('canvas:pointerup', middle);
assert(Input.released('ability') && !Input.held('ability'), 'middle mouse release ends the attack hold');

Input.setContext('menu');
dom.fire('canvas:pointerdown', pointer(0, 10));
dom.fire('canvas:pointerdown', pointer(2, 11));
dom.fire('canvas:pointerdown', pointer(1, 16));
assert(!Input.pressed('jump') && !Input.pressed('ability') && !Input.pressed('duck'),
  'mouse gameplay controls stay inactive outside levels');
Input.endFrame();
const menuSwipe = pointer(0, 14, 240, 'touch');
dom.fire('canvas:pointerdown', menuSwipe);
dom.fire('canvas:pointermove', { ...menuSwipe, clientX: 200 });
assert(Input.pressed('back') && Input.held('back'), 'a left touch swipe in a menu maps to Back');
dom.fire('canvas:pointerup', menuSwipe);
assert(Input.released('back') && !Input.held('back'), 'menu swipe Back releases cleanly');

Input.setContext('run');
Input.setMenuKeys(true);
dom.fire('canvas:pointerdown', pointer(0, 12));
dom.fire('canvas:pointerdown', pointer(2, 13));
dom.fire('canvas:pointerdown', pointer(1, 17));
assert(!Input.pressed('jump') && !Input.pressed('ability') && !Input.pressed('duck'),
  'mouse gameplay controls stay inactive while paused');

Input.setContext('workshop');
const workshopMiddle = pointer(1, 20);
dom.fire('canvas:pointerdown', workshopMiddle);
assert(Input.pressed('ability'), 'middle mouse press attacks in the Trophy Workshop');
dom.fire('canvas:pointerup', workshopMiddle);

// Press timestamps, for the audio calibration only. A tap rounded to the frame
// it was noticed in throws away up to 16ms of the very thing being measured.
Input.setContext('menu');
Input.endFrame();
const stamped = { ...pointer(0, 40), timeStamp: dom.now() - 5 };
dom.fire('canvas:pointerdown', stamped);
assert(Input.pressTime('pointer') === stamped.timeStamp,
  'a press carries the originating event\'s own timestamp, not the frame it landed in');
dom.fire('canvas:pointerup', stamped);
Input.endFrame();
assert(Input.pressTime('pointer') === undefined, 'and the stamp expires with the frame');

dom.fire('canvas:pointerdown', { ...pointer(0, 41) });
assert(Math.abs(Input.pressTime('pointer') - dom.now()) < 1e-9,
  'an event with no usable timestamp falls back to the clock');
dom.fire('canvas:pointerup', pointer(0, 41));
Input.endFrame();

// A WebKit build old enough to stamp epoch milliseconds must not be believed:
// the number is on the wrong timebase and would read as a tap days late.
dom.fire('canvas:pointerdown', { ...pointer(0, 42), timeStamp: Date.now() });
assert(Math.abs(Input.pressTime('pointer') - dom.now()) < 1e-9,
  'an absurd timestamp is discarded for the frame clock');
dom.fire('canvas:pointerup', pointer(0, 42));
Input.endFrame();

console.log(failed ? 'MOUSE CONTROLS: FAILED' : 'MOUSE CONTROLS: PASSED');
process.exit(failed ? 1 : 0);
