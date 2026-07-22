// Touch-device boot: same flow as tests/smoke.js on a simulated coarse-pointer
// device. Arcade Corner shutters itself on touch (the breaker-box games want a
// keyboard), but the hub and cabinets must work exactly as they do on desktop.
import esbuild from 'esbuild';
import { installDom } from './dom-stub.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dom = installDom();
globalThis.window.matchMedia = (q) => ({ matches: q.includes('coarse') });

const { outputFiles } = await esbuild.build({
  entryPoints: [join(root, 'src/main.js')],
  bundle: true, format: 'iife', write: false, target: ['es2022'], logLevel: 'silent',
});

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

try {
  new Function(outputFiles[0].text)();
} catch (e) {
  console.error('BOOT THREW:', e);
  process.exit(1);
}

const frames = (n, dt = 16.7) => { for (let i = 0; i < n; i++) dom.frame(dt); };

frames(5);
dom.key('Enter'); frames(30);   // title -> difficulty
dom.key('Enter'); frames(30);   // difficulty -> intro
for (let i = 0; i < 9; i++) { dom.key('Enter'); frames(12); }
frames(40);
assert(globalThis.window.__mash_state === 'HubState', `in hub (got ${globalThis.window.__mash_state})`);

// Stand on the first cabinet and interact — see tests/smoke.js for why this
// reads the station list instead of walking for a fixed number of frames.
globalThis.window.__mash_cur.px = globalThis.window.__mash_cur.stations().find((s) => s.type === 'cabinet').x;
frames(2);
dom.key('Enter'); frames(40);
assert(globalThis.window.__mash_state === 'StageSelectState',
  `cabinet opens straight onto stage select (got ${globalThis.window.__mash_state})`);

console.log(failed ? 'TOUCH SMOKE: FAILED' : 'TOUCH SMOKE: PASSED');
process.exit(failed ? 1 : 0);
