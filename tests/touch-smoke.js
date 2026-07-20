// Touch-device boot: same flow as tests/smoke.js, but on a simulated
// coarse-pointer device the breaker-box minigame must be bypassed entirely —
// opening a cabinet goes straight to stage select.
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

// Walk right to the first cabinet and interact.
dom.keyDown('ArrowRight'); frames(20); dom.keyUp('ArrowRight');
dom.key('Enter'); frames(40);
assert(globalThis.window.__mash_state === 'StageSelectState',
  `touch skips the breaker box straight to stage select (got ${globalThis.window.__mash_state})`);

// The bypass must persist, so returning to the cabinet never re-prompts.
const flags = JSON.parse(dom.store['mashenstein.v2']).slots[0].campaign.storyFlags;
assert(Object.keys(flags).some((k) => k.startsWith('powered_')), 'cabinet recorded as powered on in the save');

console.log(failed ? 'TOUCH SMOKE: FAILED' : 'TOUCH SMOKE: PASSED');
process.exit(failed ? 1 : 0);
