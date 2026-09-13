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
for (let i = 0; i < 10; i++) dom.frame();
if (changed !== 1 || fontLoads.length !== 4) {
  console.error('FAIL: portrait rotation refreshes fonts after the settled resize');
  process.exit(1);
}
if (renderer.screen.cssW !== 390 || renderer.screen.cssH !== 844) {
  console.error('FAIL: portrait rotation publishes the new renderer geometry');
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
for (let i = 0; i < 10; i++) dom.frame();
if (changed !== 1 || fontLoads.length !== 4 || renderer.screen.cssW !== 699 || renderer.screen.cssH !== 393) {
  console.error('FAIL: landscape rotation refreshes fonts and geometry on the way back');
  process.exit(1);
}
if (renderer.chrome.landscapeSide !== 'right') {
  console.error('FAIL: landscape-secondary swaps the controls to the other rail');
  process.exit(1);
}

console.log('ORIENTATION REFRESH: PASSED');
