// Sound Test uses full-size scrolling rows and touch release arbitration.
import { installDom } from './dom-stub.js';
installDom();

const { Input } = await import('../src/engine/input.js');
const { Audio } = await import('../src/engine/audio.js');
const { TITLE_THEME, HUB_THEME } = await import('../src/data/cabinets.js');
const { COUNTER_DANCE_MIX_THEME } = await import('../src/data/shop-themes.js');
const { MEGAMIX_THEME } = await import('../src/data/megamix.js');
const { SoundTestState, JUKEBOX } = await import('../src/game/menus.js');
const { VISUALIZER_NAMES } = await import('../src/engine/visualizers.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

let returned = 0;
const sound = new SoundTestState({ onDone: () => { returned++; } });
sound.enter();
assert(sound.visibleRows === 6 && sound.rowH === 23 && sound.listStart === 0,
  'sound test opens with six finger-sized scrolling rows');
assert(sound.trackCounter(0) === '1.' && sound.trackCounter(13) === '14.',
  'every jukebox row has a simple track number');
assert(JUKEBOX.length === 14 && JUKEBOX[2].bank === COUNTER_DANCE_MIX_THEME,
  'jukebox includes the approved procedural Counter Dance Mix without a WAV asset');
assert(JUKEBOX.map((track) => track.bank.musicTrim).join(',')
  === '3.33,1.05,2.22,0.93,0.87,0.93,1.74,1.6,1.05,1.18,0.93,0.7,0.95,2.24',
  'every jukebox track carries its measured playback loudness trim');
assert(JUKEBOX.at(-1).name === 'MASHENSTEIN: THE MONSTER MIX'
  && JUKEBOX.at(-1).bank === MEGAMIX_THEME,
  'MASHENSTEIN: THE MONSTER MIX is the final jukebox entry');

Input.usingTouch = true;
function touchDown(y) {
  Input.pointer = { x: 120, y, down: true };
  Input.press('pointer');
  sound.update(1 / 60);
}
function touchMove(y) {
  Input.pointer.y = y;
  sound.update(1 / 60);
}
function touchUp() {
  Input.pointer.down = false;
  Input.release('pointer');
  sound.update(1 / 60);
}

const firstY = sound.listY + sound.rowH / 2;
touchDown(firstY); touchUp();
assert(sound.idx === 0 && sound.playing === 0 && Audio.bank === TITLE_THEME,
  'one stationary touch selects and plays a track');
assert(Audio.pendingStartDelay === 0.5,
  'starting a jukebox track inserts a half-second silence before bar one');
touchDown(firstY); touchUp();
assert(sound.idx === 0 && sound.playing === -1 && Audio.bank === null,
  'touching the playing track again stops it without losing selection');

const secondY = sound.listY + sound.rowH * 1.5;
touchDown(secondY); touchUp();
assert(sound.idx === 1 && sound.playing === 1 && Audio.bank === HUB_THEME,
  'touching another track switches directly to it');

const swipeY = sound.listY + sound.rowH * 4;
touchDown(swipeY);
touchMove(swipeY - sound.rowH * 3);
touchUp();
assert(sound.listStart === 3, 'an upward drag reveals three later tracks');
assert(sound.playing === 1 && Audio.bank === HUB_THEME,
  'dragging the list never changes or stops the playing track');

touchDown(sound.listY + sound.rowH / 2); touchUp();
assert(sound.idx === 3 && sound.playing === 3,
  'post-scroll hit-testing maps the first visible row to its real track');
Input.press('confirm'); sound.update(1 / 60); Input.release('confirm'); Input.endFrame();
assert(sound.playing === -1 && Audio.bank === null,
  'keyboard confirmation uses the same stop toggle');
Input.press('confirm'); sound.update(1 / 60); Input.release('confirm'); Input.endFrame();
assert(sound.playing === 3, 'keyboard confirmation starts the selected track again');

const ctx = document.createElement('canvas').getContext('2d');
sound.draw(ctx);
assert(true, 'the scrolled sound test renders safely');

touchDown(sound.backY + sound.backH / 2); touchUp();
assert(returned === 1 && Audio.bank === null, 'the fixed touch BACK target stops playback and exits');

Input.clearAll();
Input.usingTouch = false;
let keyboardReturned = 0;
const keyboard = new SoundTestState({ onDone: () => { keyboardReturned++; } });
keyboard.enter();
function down() {
  Input.press('down'); keyboard.update(1 / 60); Input.release('down'); Input.endFrame();
}
for (let i = 0; i < 14; i++) down();
assert(keyboard.idx === 14 && keyboard.listStart === 8,
  'keyboard navigation reaches fixed BACK while scrolling to the final page');
Input.press('confirm'); keyboard.update(1 / 60); Input.release('confirm'); Input.endFrame();
assert(keyboardReturned === 1, 'keyboard confirmation activates fixed BACK');

const preview = new SoundTestState({ onDone: () => {}, initialTrack: JUKEBOX.length - 1, startVisualizer: true });
preview.enter();
assert(preview.playing === JUKEBOX.length - 1 && preview.visualizer
  && VISUALIZER_NAMES.includes(preview.visualizer.name),
  'dev visualiser preview starts the Monster Mix with a random preset');
preview.exit();

Input.clearAll();
console.log(failed ? 'SOUND TEST MENU: FAILED' : 'SOUND TEST MENU: PASSED');
process.exit(failed ? 1 : 0);
