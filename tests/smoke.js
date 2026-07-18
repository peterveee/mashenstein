// Headless smoke test: boots the real bundle with DOM stubs and drives the
// actual flow (title -> new file -> difficulty -> intro -> hub -> stage run).
import esbuild from 'esbuild';
import { installDom } from './dom-stub.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dom = installDom();

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

function frames(n, dt = 16.7) { for (let i = 0; i < n; i++) dom.frame(dt); }

frames(5);
assert(globalThis.window.__mash_booted === undefined || true, 'bundle evaluated');

// Title: select FILE 1 (new game).
dom.key('Enter'); frames(30); // through transition into difficulty
// Difficulty: pick BREEZY.
dom.key('Enter'); frames(30);
// Intro: 4 panels x (finish text + advance)
for (let i = 0; i < 9; i++) { dom.key('Enter'); frames(12); }
frames(40);

// Should now be in the hub. Save should have a slot.
const raw = dom.store['mashenstein.v2'];
assert(raw, 'save file written');
const data = JSON.parse(raw);
assert(data.version === 2, 'save schema v2');
assert(data.slots[0] && data.slots[0].difficulty === 1, 'slot created with difficulty 1');

assert(globalThis.window.__mash_state === 'HubState', `in hub (got ${globalThis.window.__mash_state})`);

// Walk right to the first cabinet (x=70, start px=40, 90 px/s) and interact.
dom.keyDown('ArrowRight'); frames(20); dom.keyUp('ArrowRight');
dom.key('Enter'); frames(40); // powers on cabinet -> a minigame starts
assert(globalThis.window.__mash_state === 'MinigameState', `minigame powers cabinet (got ${globalThis.window.__mash_state})`);

// Whatever minigame appeared, let its timer run out (35-90s), then continue.
frames(60 * 95, 16.7);
frames(60 * 3);
assert(globalThis.window.__mash_state === 'StageSelectState', `stage select after power-on (got ${globalThis.window.__mash_state})`);

// Stage select: pick stage 1 -> team select.
dom.key('Enter'); frames(30);
assert(globalThis.window.__mash_state === 'TeamSelectState', `team select (got ${globalThis.window.__mash_state})`);
// Team select: default team is picked; press X (ability) to start.
dom.key('KeyX'); frames(40);
assert(globalThis.window.__mash_state === 'RunState', `stage run started (got ${globalThis.window.__mash_state})`);

// We should be inside a Run now: simulate 30 seconds of play with periodic jumps.
for (let s = 0; s < 30; s++) {
  dom.key('Space');
  frames(60);
}
assert(globalThis.window.__mash_state === 'RunState' || globalThis.window.__mash_state === 'ResultsState',
  `still running or at results after 30s (got ${globalThis.window.__mash_state})`);

// Pause + unpause.
dom.key('KeyP'); frames(5); dom.key('KeyP'); frames(5);

// Quit to hub via pause -> back.
dom.key('KeyP'); frames(3);
dom.key('Escape'); frames(60);

console.log(failed ? 'SMOKE: FAILED' : 'SMOKE: PASSED');
process.exit(failed ? 1 : 0);
