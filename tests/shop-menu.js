// Gary's shop can contain all six purchases, eight mastery sidegrades and BACK.
// The list must scroll instead of drawing through its description and controls.
import { installDom } from './dom-stub.js';
installDom();

const { Input } = await import('../src/engine/input.js');
const { Audio } = await import('../src/engine/audio.js');
const { defaultSlot } = await import('../src/engine/save.js');
const { HEROES } = await import('../src/data/heroes.js');
const { HUB_THEME } = await import('../src/data/cabinets.js');
const { COUNTER_DANCE_MIX_THEME } = await import('../src/data/shop-themes.js');
const { defaultFrame, frameForViewport } = await import('../src/engine/frame.js');
const { setPresentationFrame } = await import('../src/engine/renderer.js');
const { ArcadeState, BenchState, ShopState, StageSelectState } = await import('../src/game/hub/index.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const slot = defaultSlot();
for (const hero of HEROES) slot.mastery[hero.id] = { level: 2, xp: 0 };
const save = { slot, persist() {} };
let returned = 0;
const shop = new ShopState({ save, flow: { toHub: () => { returned++; } } });
shop.enter();
const benchLayout = new BenchState({ save, flow: { toHub() {} } });
benchLayout.enter();
assert(shop.listY === benchLayout.listY && shop.listBottom < benchLayout.listBottom,
  'landscape Gary uses a shorter list box than Dolores');
assert(shop.rowH < benchLayout.rowH, 'landscape Gary leaves a deeper description band');
assert(benchLayout.notice.length > 0, 'Dolores opens with a persistent counter message');
assert(StageSelectState.portraitMode === 'frame',
  'Stage Select advertises its dedicated portrait layout to the screen gallery');
// `sourceBank`, not `bank`: setBank keeps what it was HANDED, and publishes the bank
// the sequencer reads through applyMix — which returns a merged copy as soon as the
// song has a saved mix, so identity against the theme object only ever held while the
// shop had no mix. What is being asked here is which song was chosen, and that is the
// one setBank was given.
assert(Audio.sourceBank === COUNTER_DANCE_MIX_THEME,
  'Gary counter activation starts the approved procedural Dance Mix');

assert(shop.options().length === 15, 'the fullest shop contains fifteen rows');
assert(shop.visibleRows === 7 && shop.fixedLastRow && shop.listStart === 0,
  'the shop opens with seven scrolling items and a fixed final row');

const portraitFrame = frameForViewport({
  mode: 'phone-portrait', viewportWidth: 390, viewportHeight: 844, revision: 9,
});
setPresentationFrame(portraitFrame);
const portraitBench = new BenchState({ save, flow: { toHub() {} } });
const portraitShop = new ShopState({ save, flow: { toHub() {} } });
portraitBench.enter();
portraitShop.enter();
assert(portraitBench.listY === portraitShop.listY && portraitBench.listBottom === portraitShop.listBottom,
  'portrait counters share list anchors');
assert(portraitBench.portraitBackY === portraitShop.portraitBackY
  && portraitBench.portraitBackH === portraitShop.portraitBackH,
  'portrait counters share the staff back-row anchor');
assert(portraitShop.visibleRows === 4, 'portrait Gary keeps a four-row scroll window');
portraitBench.draw(document.createElement('canvas').getContext('2d'));
portraitShop.draw(document.createElement('canvas').getContext('2d'));
assert(true, 'both portrait counter templates render safely');
const maxedBenchSlot = defaultSlot();
maxedBenchSlot.bench.shield = 3;
const maxedBench = new BenchState({
  save: { slot: maxedBenchSlot, persist() {} },
  flow: { toHub() {} },
});
maxedBench.enter();
assert(maxedBench.options()[0].maxed, 'portrait Dolores exposes the sold-out price state after purchase');
Input.press('confirm');
maxedBench.update(1 / 60);
Input.release('confirm');
assert(maxedBench.notice.length > 0, 'portrait Dolores records the sold-out notice after purchase attempt');
maxedBench.draw(document.createElement('canvas').getContext('2d'));
assert(true, 'portrait Dolores renders the sold-out notice without text layout errors');
// Two maxed rows once fought over one shared notice field and re-rolled a new
// gag every frame, which read as flickering text. Each row keeps its own
// cached gag now, so repeated draws must not change either notice.
maxedBenchSlot.bench.magnet = 3;
maxedBench.layoutKey = '';
const maxedCtx = document.createElement('canvas').getContext('2d');
const noticeBefore = [0, 1].map((i) => maxedBench.soldOutNoticeFor(maxedBench.options()[i]));
maxedBench.draw(maxedCtx);
maxedBench.draw(maxedCtx);
const noticeAfter = [0, 1].map((i) => maxedBench.soldOutNoticeFor(maxedBench.options()[i]));
assert(noticeBefore[0] === noticeAfter[0] && noticeBefore[1] === noticeAfter[1],
  'sold-out notices stay fixed across repeated draws');
const portraitArcade = new ArcadeState({ save, flow: { toHub() {} } });
portraitArcade.enter();
const oldArcadeTop = portraitFrame.safeRect.top + 210 / portraitFrame.scale;
const oldArcadeBottom = portraitFrame.safeRect.bottom - 112 / portraitFrame.scale;
const arcadeBand = portraitArcade.listBottom - portraitArcade.listY;
assert(ArcadeState.portraitMode === 'frame', 'Arcade advertises its dedicated portrait layout');
assert(portraitArcade.listY < oldArcadeTop && portraitArcade.listBottom > oldArcadeBottom,
  'portrait Arcade uses more of the safe frame than its compact layout');
assert(Math.abs(arcadeBand - portraitArcade.rowH * portraitArcade.options().length) < 0.01,
  'portrait Arcade rows fill the available menu band');
portraitArcade.draw(document.createElement('canvas').getContext('2d'));
assert(true, 'portrait Arcade renders safely');
setPresentationFrame(defaultFrame());

function down() {
  Input.press('down'); shop.update(1 / 60); Input.release('down'); Input.endFrame();
}
for (let i = 0; i < 14; i++) down();
assert(shop.idx === 14, 'keyboard navigation reaches the final BACK row');
assert(shop.listStart === 7, 'the item window reaches its final page before BACK');

// The first visible pitch now represents option 7, not option 0.
Input.pointer.x = 60;
Input.pointer.y = shop.listY + shop.rowH / 2;
Input.press('pointer'); shop.update(1 / 60); Input.release('pointer'); Input.endFrame();
assert(shop.idx === 7, 'pointer hit-testing follows the scrolled window');

const ctx = document.createElement('canvas').getContext('2d');
shop.draw(ctx);
assert(true, 'the fullest scrolled shop renders safely');

// Return to the last row and confirm that it remains actionable.
for (let i = 0; i < 7; i++) down();
Input.press('confirm'); shop.update(1 / 60); Input.release('confirm'); Input.endFrame();
assert(returned === 1, 'the scrolled BACK row still returns to the food court');

// BACK occupies the fixed eighth pitch no matter which item page is visible.
const fixedBackShop = new ShopState({ save, flow: { toHub: () => { returned++; } } });
fixedBackShop.enter();
fixedBackShop.listStart = 5;
fixedBackShop.idx = 5;
Input.pointer = { x: 60, y: fixedBackShop.listY + fixedBackShop.rowH * 7.5, down: false };
Input.press('pointer'); fixedBackShop.update(1 / 60); Input.release('pointer'); Input.endFrame();
assert(returned === 2 && fixedBackShop.idx === 5 && fixedBackShop.listStart === 5,
  'one mouse click on fixed BACK returns without changing the item scroll position');

// Touch waits until release to distinguish a tap from a swipe. Pulling upward
// reveals later rows; pulling downward returns toward the start.
const touchShop = new ShopState({ save, flow: { toHub: () => { returned++; } } });
touchShop.enter();
Input.usingTouch = true;
function touchDown(y) {
  Input.pointer = { x: 60, y, down: true };
  Input.press('pointer'); touchShop.update(1 / 60);
}
function touchMove(y) {
  Input.pointer.y = y; touchShop.update(1 / 60);
}
function touchUp() {
  Input.pointer.down = false;
  Input.release('pointer'); touchShop.update(1 / 60);
}

const touchY = touchShop.listY + touchShop.rowH * 4;
touchDown(touchY);
touchMove(touchY - touchShop.rowH * 4);
touchUp();
assert(touchShop.listStart === 4, 'an upward touch swipe reveals four later rows');
assert(returned === 2, 'a swipe never confirms the row under the finger');

touchDown(touchY);
touchMove(touchY + touchShop.rowH * 2);
touchUp();
assert(touchShop.listStart === 2, 'a downward touch swipe returns toward earlier rows');

const tapY = touchShop.listY + touchShop.rowH * 3.5;
const beforeTap = touchShop.idx;
touchDown(tapY);
assert(touchShop.idx === beforeTap, 'touch selection waits for finger release');
touchUp();
assert(touchShop.idx === touchShop.listStart + 3, 'a stationary touch still selects its visible row');

const touchBackY = touchShop.listY + touchShop.rowH * 7.5;
touchDown(touchBackY); touchUp();
assert(returned === 3, 'one touch on fixed BACK exits the shop');

const benchAudio = new BenchState({ save, flow: { toHub() {} } });
benchAudio.enter();
assert(Audio.sourceBank === COUNTER_DANCE_MIX_THEME,
  'Dolores counter activation starts the approved procedural Dance Mix');
benchAudio.exit();
assert(Audio.sourceBank === HUB_THEME, 'leaving Dolores restores the Food Court theme');
shop.exit();
assert(Audio.sourceBank === HUB_THEME, 'leaving Gary restores the Food Court theme');

// Gary's counter uses the ordinary unprocessed counter mix.
//
// No ctx stub goes with the mixer stub here, unlike the Arcade Corner and the Trophy
// Room: a treatment is gated on the MIXER, not the context — enterWholeMixTreatment
// calls setTreatment either way, and leaveWholeMixTreatment ramps from `?? 0` — so a
// shop that wrongly treated the mix would still be caught. What a context would buy
// instead is a lie: leaving Gary primes the Food Court's realtime voices, and that
// walk reads `ctx` as proof of a live Tone graph. Node has none.
const oldMixer = Audio.mixer;
const oldSetBank = Audio.setBank;
const oldSourceBank = Audio.sourceBank;
const treatmentCalls = [];
Audio.mixer = {
  setTreatment(list, bpm) { treatmentCalls.push({ type: 'set', list, bpm }); },
  rampTreatment(wet, when, seconds) { treatmentCalls.push({ type: 'ramp', wet, when, seconds }); },
  clearTreatment() { treatmentCalls.push({ type: 'clear' }); },
};
Audio.setBank = (bank) => { treatmentCalls.push({ type: 'bank', bank }); };
const treatedShop = new ShopState({ save, flow: { toHub() {} } });
treatedShop.enter(); treatedShop.exit();
assert(!treatmentCalls.some((call) => call.type === 'set'
  || call.type === 'ramp' || call.type === 'clear')
  && treatmentCalls.filter((call) => call.type === 'bank').length === 2,
  'entering and exiting Gary leaves the counter mix unprocessed');
Audio.mixer = oldMixer;
Audio.setBank = oldSetBank;
Audio.sourceBank = oldSourceBank;

Input.clearAll();
console.log(failed ? 'SHOP MENU: FAILED' : 'SHOP MENU: PASSED');
process.exit(failed ? 1 : 0);
