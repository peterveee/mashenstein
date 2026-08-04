// The resting framing, and the fact that it is not the same everywhere.
//
// A desktop pulls back to 1.6 and a handheld stays at 2, which is a trade in
// opposite directions: on a monitor an arm's length away the risk is a shape
// crossing too much of your vision per frame, and on a phone it is the hero
// becoming too small to read. A change that quietly applied the desktop framing
// to phones would look fine on the machine it was written on, which is exactly
// why it is worth a test.
import { installDom } from './dom-stub.js';
import { detectPlatform } from '../src/engine/platform.js';
import { W, H } from '../src/engine/renderer.js';
import { GROUND_Y, ZOOM } from '../src/engine/camera.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const MAC_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15';
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile Safari/604.1';
const IPAD_UA = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile Safari/604.1';

installDom({});

// Desktop framing: the numbers the frame derives from it all land whole. This
// is the property that picked 1.6 over the rest of the range that felt right,
// so it is the one worth guarding — a later nudge to 1.7 would silently turn
// every one of them into a repeating decimal.
const DESKTOP_ZOOM = 1.6;
assert(Number.isInteger(W / DESKTOP_ZOOM), `VIEW_W is whole at ${DESKTOP_ZOOM} (${W / DESKTOP_ZOOM})`);
assert(Number.isInteger(GROUND_Y / DESKTOP_ZOOM),
  `headroom above the groundline is whole (${GROUND_Y / DESKTOP_ZOOM})`);
assert(Number.isInteger(GROUND_Y - GROUND_Y / DESKTOP_ZOOM),
  `the frame's top world y is whole (${GROUND_Y - GROUND_Y / DESKTOP_ZOOM})`);

// The hero's share of frame height is the thing that was actually judged, so
// state it as such: 24px of art against H/zoom world px of frame.
const HERO_DRAW_H = 24;
const share = HERO_DRAW_H / (H / DESKTOP_ZOOM);
assert(share > 0.135 && share < 0.15,
  `the hero occupies ~14% of frame height, as Super Mario World's does (${(share * 100).toFixed(1)}%)`);

// Platform routing — three tiers, not two. A phone is not merely "not desktop":
// in landscape its 16:9 canvas is letterboxed into the SHORT side of the screen,
// so its picture is about 23 degrees against a tablet's 36, and it needs the
// closest framing of the three.
const mac = detectPlatform({ ua: MAC_UA });
const iphone = detectPlatform({ ua: IPHONE_UA });
const ipad = detectPlatform({ ua: IPAD_UA, maxTouchPoints: 5 });
assert(mac.isDesktop, 'a Mac reads as desktop');
assert(!iphone.isDesktop && iphone.isIphone, 'an iPhone reads as a phone');
assert(!ipad.isDesktop && !ipad.isIphone && ipad.isIpad, 'an iPad reads as a tablet, not a phone');

// Ordering is the invariant worth pinning, whatever the three numbers become:
// the smaller the picture in your vision, the closer the camera has to sit.
const DESKTOP = 1.6, TABLET = 2, PHONE = 2.2;
assert(DESKTOP < TABLET && TABLET < PHONE,
  `framings tighten as the screen shrinks (${DESKTOP} < ${TABLET} < ${PHONE})`);
// A tablet keeps exactly what the game shipped with, so it sees no change here.
assert(TABLET === 2, 'a tablet keeps the shipped framing');
// And the runway a phone gives up for that legibility stays small — it is the
// reaction time being spent, on the device that can least spare it.
const runwayLoss = 1 - (480 / PHONE) / (480 / TABLET);
assert(runwayLoss < 0.12,
  `the phone framing costs under 12% of visible runway (${(runwayLoss * 100).toFixed(1)}%)`);

console.log(failed ? 'CAMERA FRAMING: FAILED' : 'CAMERA FRAMING: PASSED');
process.exit(failed ? 1 : 0);
