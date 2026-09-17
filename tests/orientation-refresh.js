// A settled mobile rotation must notify retained-art owners and refresh the
// game's canvas font metrics in both directions, without reloading the page.
import { installDom } from './dom-stub.js';

const dom = installDom({
  locationSearch: '?renderer=2d',
  innerWidth: 852,
  innerHeight: 393,
  devicePixelRatio: 3,
});
window.screen = { orientation: { angle: 90, type: 'landscape-primary' } };
window.orientation = 90;
const fontLoads = [];
document.fonts = {
  load(face) { fontLoads.push(face); return Promise.resolve(); },
  ready: Promise.resolve(),
  addEventListener() {},
};

const renderer = await import('../src/engine/renderer.js');
const sprites = await import('../src/engine/sprites.js');
let changed = 0;
sprites.onGameFontsChanged(() => { changed++; });
const refreshPhases = [];
renderer.onPresentationRefresh((detail) => refreshPhases.push(`${detail.phase}:${detail.active}`));

// Let the initial boot font requests settle before measuring the rotation pass.
await Promise.resolve();
await Promise.resolve();
fontLoads.length = 0;
changed = 0;

renderer.initRenderer({ isIphone: true });
if (renderer.chrome.landscapeSide !== 'left') {
  console.error('FAIL: landscape-primary keeps pause on the notch-left rail');
  process.exit(1);
}
renderer.setPresentationMode('portrait');
window.innerWidth = 390;
window.innerHeight = 844;
dom.fire('win:orientationchange');
if (!renderer.presentationRefreshState().active) {
  console.error('FAIL: orientation change enters a covered presentation refresh');
  process.exit(1);
}
for (let i = 0; i < 25; i++) dom.frame();
if (changed < 1 || fontLoads.length !== 4) {
  console.error('FAIL: portrait rotation refreshes fonts after the settled resize');
  process.exit(1);
}
if (renderer.screen.cssW !== 390 || renderer.screen.cssH !== 844) {
  console.error('FAIL: portrait rotation publishes the new renderer geometry');
  process.exit(1);
}
if (!renderer.presentationRefreshState().revealPending) {
  console.error('FAIL: settled orientation waits for a complete frame before reveal');
  process.exit(1);
}
renderer.revealPresentationRefresh();
const refreshCountAfterReveal = refreshPhases.length;
dom.fire('win:resize');
if (renderer.presentationRefreshState().active || refreshPhases.length !== refreshCountAfterReveal) {
  console.error('FAIL: a late duplicate resize does not reopen the blackout');
  process.exit(1);
}

await new Promise((resolve) => setImmediate(resolve));
if (changed < 2) {
  console.error('FAIL: portrait rotation clears font caches again after font confirmation');
  process.exit(1);
}

fontLoads.length = 0;
changed = 0;
window.innerWidth = 852;
window.innerHeight = 393;
window.screen.orientation.angle = 270;
window.screen.orientation.type = 'landscape-secondary';
window.orientation = 270;
dom.fire('win:orientationchange');
dom.fire('win:resize');
for (let i = 0; i < 25; i++) dom.frame();
if (changed !== 1 || fontLoads.length !== 4 || renderer.screen.cssW !== 699 || renderer.screen.cssH !== 393) {
  console.error('FAIL: landscape rotation refreshes fonts and geometry on the way back');
  process.exit(1);
}
if (renderer.chrome.landscapeSide !== 'right') {
  console.error('FAIL: landscape-secondary swaps the controls to the other rail');
  process.exit(1);
}
if (refreshPhases.filter((phase) => phase === 'settling:true').length !== 2
  || refreshPhases.filter((phase) => phase === 'ready:false').length !== 2) {
  console.error('FAIL: duplicate viewport events share one blackout');
  process.exit(1);
}

// TURNING THE PHONE END FOR END, STILL IN LANDSCAPE.
//
// Nothing about the picture moves — same width, same height, same density — so
// this must swap the rail on the spot, with no cover and no settle. The stub
// reports no safe-area insets at all, which is exactly the Safari case the
// angle fallback exists for: if the layout only listened to the insets, the
// controls would stay on the hand that is no longer there.
renderer.revealPresentationRefresh();
const phasesBeforeFlip = refreshPhases.length;
changed = 0;
window.screen.orientation.angle = 90;
window.screen.orientation.type = 'landscape-primary';
window.orientation = 90;
dom.fire('win:orientationchange');
// iOS announces the rotation before the viewport has caught up, so the watch
// takes one frame to see the box hold still — and one frame is the whole cost.
// It must NOT need the box to change, which is what a full 180 never does.
dom.frame();
if (renderer.chrome.landscapeSide !== 'left') {
  console.error('FAIL: a landscape flip swaps the rail within a frame, with no settle');
  process.exit(1);
}
if (renderer.presentationRefreshState().active || refreshPhases.length !== phasesBeforeFlip) {
  console.error('FAIL: a landscape flip costs no cover blackout');
  process.exit(1);
}
if (renderer.screen.cssW !== 699 || renderer.screen.cssH !== 393 || changed !== 0) {
  console.error('FAIL: a landscape flip leaves the presentation and its art alone');
  process.exit(1);
}
// The watch keeps looking for a few frames in case the insets land late; when
// they never do, it must fall quiet rather than relaying out every frame.
const genAfterFlip = renderer.chrome.gen;
for (let i = 0; i < 60; i++) dom.frame();
if (renderer.chrome.gen !== genAfterFlip) {
  console.error('FAIL: the orientation watch stops relaying out once nothing is moving');
  process.exit(1);
}
// And back again, this time announced only by the Screen Orientation API.
window.screen.orientation.angle = 270;
window.screen.orientation.type = 'landscape-secondary';
window.orientation = 270;
dom.fire('win:orientationchange');
dom.frame();
if (renderer.chrome.landscapeSide !== 'right') {
  console.error('FAIL: flipping back returns the rail to the other side');
  process.exit(1);
}
// A duplicate viewport event after the flip must not mistake the adopted
// insets for a fresh rotation and cover the screen.
const phasesAfterFlips = refreshPhases.length;
dom.fire('win:resize');
if (renderer.presentationRefreshState().active || refreshPhases.length !== phasesAfterFlips) {
  console.error('FAIL: a resize after a flip does not reopen the blackout');
  process.exit(1);
}

// A FLIP THAT ANNOUNCES ITSELF WITH A VIEWPORT THAT IS STILL MOVING.
//
// Turned end for end in one movement, iOS reports the new angle while the
// dimensions are still mid-animation — the same lag the settle loop above
// exists for. The rotation must survive that: a transient reading is allowed
// to delay the swap, never to swallow it.
window.screen.orientation.angle = 90;
window.screen.orientation.type = 'landscape-primary';
window.orientation = 90;
window.innerWidth = 480;
window.innerHeight = 480;
dom.fire('win:orientationchange');
window.innerWidth = 852;
window.innerHeight = 393;
for (let i = 0; i < 40; i++) dom.frame();
if (renderer.chrome.landscapeSide !== 'left') {
  console.error('FAIL: a transient mid-rotation viewport does not swallow the flip');
  process.exit(1);
}
renderer.revealPresentationRefresh();
if (renderer.screen.cssW !== 699 || renderer.screen.cssH !== 393) {
  console.error('FAIL: the flip settles back on the real landscape geometry');
  process.exit(1);
}

// AND A FLIP THAT PRODUCES NO VIEWPORT EVENT AT ALL.
//
// The events are the fast path, not the contract, so the frame loop looks too.
window.screen.orientation.angle = 270;
window.screen.orientation.type = 'landscape-secondary';
window.orientation = 270;
const phasesBeforeSilentFlip = refreshPhases.length;
renderer.beginChromeFrame();
dom.frame();
if (renderer.chrome.landscapeSide !== 'right') {
  console.error('FAIL: the frame loop catches a flip that fired no event');
  process.exit(1);
}
if (renderer.presentationRefreshState().active
  || refreshPhases.length !== phasesBeforeSilentFlip) {
  console.error('FAIL: the frame loop catches it without a cover blackout');
  process.exit(1);
}
// Steady state: nothing is turning, so the frame loop must cost no relayouts.
const genAfterSilentFlip = renderer.chrome.gen;
for (let i = 0; i < 60; i++) { renderer.beginChromeFrame(); dom.frame(); }
if (renderer.chrome.gen !== genAfterSilentFlip) {
  console.error('FAIL: a still phone costs the frame loop no relayouts');
  process.exit(1);
}

// THE WALK ARROWS AFTER AN UPRIGHT ROTATION, wherever the frame happens to be.
//
// The food court's arrows fall back to the authored landscape coordinate (cy
// 240 of 270) whenever they are not placed from the portrait control geometry.
// Scaled into a landscape picture letterboxed inside an upright phone, that y
// lands more than half way UP the screen — which is how they came to be found
// floating in mid-air after a rotation that settled before the screen had asked
// for its portrait frame. Nothing re-fits afterwards, because the presentation
// mode only changes on a state transition, so they stay there until you change
// screen. Upright, they belong at the bottom whichever frame is up.
renderer.setPresentationMode('landscape');
window.screen.orientation.angle = 0;
window.screen.orientation.type = 'portrait-primary';
window.orientation = 0;
window.innerWidth = 390;
window.innerHeight = 844;
dom.fire('win:orientationchange');
for (let i = 0; i < 40; i++) dom.frame();
renderer.revealPresentationRefresh();
for (let i = 0; i < 5; i++) { renderer.beginChromeFrame(); dom.frame(); }
const uprightArrows = (renderer.chrome.hub || []).filter((b) => b.r != null);
if (uprightArrows.length !== 2) {
  console.error('FAIL: the food court declares two walk arrows upright');
  process.exit(1);
}
if (!uprightArrows.every((b) => b.y > window.innerHeight * 0.75)) {
  console.error('FAIL: upright walk arrows sit in the bottom quarter, not mid-air'
    + ` (got ${uprightArrows.map((b) => `${b.id} y${Math.round(b.y)}`).join(', ')} of ${window.innerHeight})`);
  process.exit(1);
}
// ...and the portrait frame itself still puts them on the picture's own corners.
renderer.setPresentationMode('portrait');
for (let i = 0; i < 5; i++) { renderer.beginChromeFrame(); dom.frame(); }
const portraitArrows = (renderer.chrome.hub || []).filter((b) => b.r != null);
if (!portraitArrows.every((b) => b.y > window.innerHeight * 0.75)) {
  console.error('FAIL: portrait walk arrows sit in the bottom quarter');
  process.exit(1);
}

console.log('ORIENTATION REFRESH: PASSED');
