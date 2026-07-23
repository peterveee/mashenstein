// Title toasters cross in a single opening formation, then deterministic 2–4
// formations, so their cameos stay
// varied without changing shape halfway through a fly-by.
import { installDom } from './dom-stub.js';
installDom();

const {
  TITLE_TOASTER_MIN_COUNT, TITLE_TOASTER_MAX_COUNT, TitleState,
  titleToasterPass, titleToasterStagger, invaderPass,
} = await import('../src/game/menus.js');
const { save } = await import('../src/engine/save.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

assert(TITLE_TOASTER_MIN_COUNT === 1 && TITLE_TOASTER_MAX_COUNT === 4,
  'title toaster formations use the approved 1–4 range');
assert(titleToasterPass(0) === null, 'title toaster cameos leave the opening beat clear');
assert(titleToasterPass(35) === null, 'toasters wait until the first space ship clears');
assert(titleToasterPass(37)?.count === 1, 'startup toaster pass is exactly one appliance');
assert(titleToasterPass(37, false)?.count >= 2,
  'a returning title skips the one-toaster startup rule');

const counts = new Set();
for (let trip = 0; trip < 20; trip++) {
  const t = 37 + trip * 29 + 0.5;
  const pass = titleToasterPass(t, false);
  if (!pass) continue; // this cameo may be waiting for a ship to clear
  const validCount = pass?.count >= 2 && pass?.count <= TITLE_TOASTER_MAX_COUNT;
  assert(pass && validCount, `formation ${trip} has a valid count`);
  assert(pass && pass.dir === (trip % 2 === 0 ? 1 : -1), `formation ${trip} alternates direction`);
  counts.add(pass.count);
}
assert(counts.size >= 3, `formation count varies across cameos (${[...counts].sort().join(',')})`);
const animationPhases = [0, 1, 2, 3].map((i) => titleToasterStagger(0, i));
assert(new Set(animationPhases.map((phase) => Math.floor(phase * 24) % 96)).size === 4,
  'toaster animation clocks are independently phased within a formation');
assert(titleToasterPass(37 + 10) === null, 'a toaster pass clears before the next cameo window');
assert(titleToasterPass(83, false)?.trip === 1,
  'a toaster formation waits until the second spaceship clears, then crosses continuously');

// The independent toaster/ship schedules drift over time; the title must
// still expose at most one of those sky cameos on every frame.
let skyOverlap = null;
for (let t = 0; t < 240; t += 0.1) {
  const toaster = titleToasterPass(t, false);
  const ship = invaderPass(t);
  if (toaster && ship) { skyOverlap = t; break; }
}
assert(skyOverlap === null, skyOverlap === null
  ? 'toasters and spaceship never overlap across the title schedule'
  : `toasters and spaceship overlap at ${skyOverlap.toFixed(1)}s`);

// Exercise the maximum-size toaster painter, not just its count.
save.load();
const maxTrip = Array.from({ length: 20 }, (_, trip) => trip)
  .find((trip) => titleToasterPass(37 + trip * 29 + 0.5, false)?.count === TITLE_TOASTER_MAX_COUNT);
const title = new TitleState({
  save, onSlotChosen() {}, onSettings() {}, onHowTo() {}, onGuide() {}, onSoundTest() {},
  attractDelay: 1e9,
});
title.enter();
title.singleToasterOpening = false;
title.t = 37 + maxTrip * 29 + 0.5;
let maxRendered = true;
try {
  title.draw(document.getElementById('game').getContext('2d'));
} catch (error) {
  maxRendered = false;
}
assert(maxRendered, 'a maximum-size toaster formation renders without a missing lane');

console.log(failed ? 'TITLE TOASTERS: FAILED' : 'TITLE TOASTERS: PASSED');
process.exit(failed ? 1 : 0);
