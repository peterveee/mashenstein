// Title toasters cross in a single opening formation, then deterministic 2–5
// formations, so their cameos stay
// varied without changing shape halfway through a fly-by.
import { installDom } from './dom-stub.js';
installDom();

const {
  TITLE_TOASTER_MIN_COUNT, TITLE_TOASTER_MAX_COUNT, titleToasterPass, titleToasterStagger,
} = await import('../src/game/menus.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

assert(TITLE_TOASTER_MIN_COUNT === 1 && TITLE_TOASTER_MAX_COUNT === 5,
  'title toaster formations use the approved 1–5 range');
assert(titleToasterPass(0) === null, 'title toaster cameos leave the opening beat clear');
assert(titleToasterPass(35) === null, 'toasters wait until the first space ship clears');
assert(titleToasterPass(37) !== null, 'toasters begin after the opening ship has gone');

const counts = new Set();
for (let trip = 0; trip < 20; trip++) {
  const t = 37 + trip * 29 + 0.5;
  const pass = titleToasterPass(t);
  const validCount = pass?.count >= 2 && pass?.count <= 5;
  assert(pass && validCount, `formation ${trip} has a valid count`);
  assert(pass && pass.dir === (trip % 2 === 0 ? 1 : -1), `formation ${trip} alternates direction`);
  counts.add(pass.count);
}
assert(counts.size >= 3, `formation count varies across cameos (${[...counts].sort().join(',')})`);
const animationPhases = [0, 1, 2, 3].map((i) => titleToasterStagger(0, i));
assert(new Set(animationPhases.map((phase) => Math.floor(phase * 24) % 96)).size === 4,
  'toaster animation clocks are independently phased within a formation');
assert(titleToasterPass(37 + 10) === null, 'a toaster pass clears before the next cameo window');

console.log(failed ? 'TITLE TOASTERS: FAILED' : 'TITLE TOASTERS: PASSED');
process.exit(failed ? 1 : 0);
