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

// ---- what a floating island costs the frame ---------------------------------
//
// A hero standing on a slab is already `rise` up before they jump at all, so
// the island is the first thing in the game to ask the camera for meaningfully
// more headroom than rolling terrain's 9-18px. The groundline is pinned to its
// screen y at every zoom, so the frame pays for that height by craning (to
// PAN_MAX) and then, only for what the crane could not buy, by opening the
// zoom. Both are cheap here and it is worth keeping them cheap: the numbers
// below are what stop a future `rise` bump from quietly pulling the picture
// back every time somebody hops onto a slab.
const { framingFor, setRestingZoom, PAN_MAX } = await import('../src/engine/camera.js');
const { MAX_ISLAND_RISE } = await import('../src/game/routes.js');
const RISE = MAX_ISLAND_RISE;
const JUMP = 57;          // an ordinary hero's apex
const DOUBLE = 98;        // Kiko, or anyone wearing the cape
// The highest anyone in the cast reaches: the top jumpMult with two air jumps
// stacked on it (capsule plus cape). Was 168 — Lorenzo's 1.10 — until Clara's
// cliffhanger jump took the top slot at 1.15, which scales the whole stack by
// (1.15/1.10)^2: her measured stack is 184.0px.
const TALLEST = 185;

setRestingZoom(TABLET);
const standing = framingFor(0, RISE);
const hop = framingFor(JUMP, RISE);
assert(standing.zoom === TABLET && standing.pan === 0,
  'standing on a slab costs the frame nothing at all');
assert(hop.zoom === TABLET,
  `and an ordinary jump from one still does not open the zoom (pan ${hop.pan})`);
assert(hop.pan > 0 && hop.pan <= PAN_MAX,
  `it is paid for out of the crane instead (${hop.pan}px of pan)`);

// THE ZOOM DOES NOT MOVE. Not for a double jump off a slab, and not for the
// tallest thing anybody in the game can do.
//
// It used to: the crane was the ground apron, 38px, and everything past 135px
// of altitude came out of the zoom — so the biggest jumps changed the scale of
// the world on the way up and changed it back on the way down, which is the one
// camera move that reads as the picture lurching. The crane is sized off the
// jump now and the zoom is a backstop nothing reaches. These two are what stop
// it quietly coming back.
const dbl = framingFor(DOUBLE, RISE);
assert(dbl.zoom === TABLET,
  `a double jump from a slab still costs no zoom (pan ${dbl.pan.toFixed(0)})`);
const top = framingFor(TALLEST);
assert(top.zoom === TABLET,
  `nor does the tallest jump in the cast (${TALLEST}px, pan ${top.pan.toFixed(0)}/${PAN_MAX})`);

// Desktop has the headroom to not care at all.
setRestingZoom(DESKTOP);
assert(framingFor(DOUBLE, RISE).zoom === DESKTOP,
  'on desktop even a double jump from a slab leaves the zoom alone');
setRestingZoom(TABLET);

// ---- stepping off a sky road ------------------------------------------------
//
// The fall the camera used to lose. A hero who walks off the 168px sky road is
// falling at 30px/s on the frame he leaves and reaches 520 half a second later;
// the anchor's ease, written for a floor he is STANDING on, took the whole
// 168px at 1650px/s and had the lane framed and waiting while he was still
// thirty pixels above the top edge of the picture.
//
// This drives the same four lines updateCamera runs — the anchor's target, its
// ease, fallLimit and the framing — so what it measures is the policy rather
// than a copy of it.
const { fallLead, fallLimit, easeFloor, easePan, screenYFor } = await import('../src/engine/camera.js');
const SKY_ROAD = 168;         // cabinets.js: the sky fork's peak
const TERMINAL_VY = -520, GRAVITY = 900, CAM_FOOTROOM = 6, DT = 1 / 60;

// One fall, from a fully re-pinned anchor on the road down to the lane, with
// `limited` choosing between the ease alone and the ease under fallLimit.
function fall(zoom, limited) {
  setRestingZoom(zoom);
  let camFloorY = GROUND_Y - SKY_ROAD, camPan = 0, camZoom = zoom;
  let y = SKY_ROAD, vy = 0, prevFeet = GROUND_Y - SKY_ROAD;
  const frames = [];
  for (let i = 0; i < 240; i++) {
    vy = Math.max(TERMINAL_VY, vy - GRAVITY * DT);
    y = Math.max(0, y + vy * DT);
    const feetY = GROUND_Y - y, airborne = y > 0;
    const falling = limited && airborne && GROUND_Y > camFloorY + 0.5;
    const target = falling ? Math.min(GROUND_Y, feetY + fallLead(camZoom)) : GROUND_Y;
    const eased = easeFloor(camFloorY, target, DT);
    const next = falling && eased > camFloorY
      ? Math.min(eased, fallLimit(camFloorY, feetY - prevFeet, camZoom, DT)) : eased;
    const camV = (next - camFloorY) / DT;
    camFloorY = Math.max(next, Math.abs(next - GROUND_Y) > 0.5 ? feetY - CAM_FOOTROOM : -Infinity);
    prevFeet = feetY;
    const want = framingFor(y, camFloorY - GROUND_Y);
    camPan = easePan(camPan, want.pan, DT);
    const feet = screenYFor(feetY, camZoom, camPan, camFloorY);
    frames.push({ head: feet - HERO_DRAW_H * camZoom, feet, camV, heroV: -vy });
    if (!airborne && Math.abs(camFloorY - GROUND_Y) < 0.5 && camPan < 0.5) break;
  }
  return frames;
}

for (const z of [DESKTOP, TABLET, PHONE]) {
  const before = fall(z, false), after = fall(z, true);
  // The bug, stated as the test that would have caught it.
  assert(Math.min(...before.map((f) => f.head)) < 0,
    `at ${z} the unlimited ease loses him off the top (head ${Math.min(...before.map((f) => f.head)).toFixed(0)})`);
  // What the fall has to promise: he is IN the frame, all of him, all the way
  // down. Head above the top edge, feet above the bottom one.
  const head = Math.min(...after.map((f) => f.head));
  const feet = Math.max(...after.map((f) => f.feet));
  assert(head > 0 && feet < H,
    `at ${z} he stays whole in the frame the entire fall (head ${head.toFixed(0)}, feet ${feet.toFixed(0)})`);
  // And the second half of the promise: the camera is travelling WITH him, not
  // ahead of him. Whatever it is doing, it is doing it at his own speed plus a
  // small allowance — never the 1600px/s the old ease reached over a hero who
  // had barely started moving.
  const over = Math.max(...after.map((f) => f.camV - f.heroV));
  assert(over < 340,
    `at ${z} the anchor never outruns him by more than the catch-up (${over.toFixed(0)}px/s)`);
  const wasOver = Math.max(...before.map((f) => f.camV - f.heroV));
  assert(wasOver > 1000, `where it used to outrun him by ${wasOver.toFixed(0)}px/s`);
  // He is not merely on screen but somewhere worth being: the ground he is
  // dropping onto has to be in shot for most of the drop, which is what the
  // lead buys over simply gluing him to the groundline.
  const air = after.filter((f) => f.feet < H);
  const seen = Math.max(...air.map((f) => (H - f.feet) / z));
  assert(seen > 40, `at ${z} he can see ${seen.toFixed(0)}px of world below his feet on the way down`);
}
setRestingZoom(TABLET);

console.log(failed ? 'CAMERA FRAMING: FAILED' : 'CAMERA FRAMING: PASSED');
process.exit(failed ? 1 : 0);
