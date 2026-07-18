// Every minigame must run headlessly to timeout (losable) and accept input
// without throwing. Winnability is covered by design (and REWIRE/TURDLE by
// direct solves below where cheap).
import { installDom } from './dom-stub.js';
const dom = installDom();

const { MinigameState, MINIGAMES } = await import('../src/game/minigames/index.js');
const { Input } = await import('../src/engine/input.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const ctxStub = new Proxy({}, { get: (t, k) => (k === 'canvas' ? null : () => ctxStub), set: () => true });
// drawing uses a real-ish stub: reuse dom canvas ctx
const canvasCtx = globalThis.document.createElement('canvas').getContext('2d');

for (const game of MINIGAMES) {
  let ended = null;
  const st = new MinigameState({
    game, seed: 7, settings: {},
    onEnd: (success) => { ended = { success }; },
  });
  st.enter();
  const TICK = 1 / 60;
  let t = 0;
  const actions = ['left', 'right', 'jump', 'duck'];
  let i = 0;
  while (!ended && t < 60) {
    t += TICK;
    // mash some inputs to exercise logic
    if (Math.floor(t * 10) % 7 === 0) {
      const a = actions[i++ % actions.length];
      Input.press(a);
      st.update(TICK);
      Input.release(a);
    } else {
      st.update(TICK);
    }
    st.draw(canvasCtx);
  }
  st.exit();
  assert(ended, `${game}: ended (success=${ended && ended.success}) after ${t.toFixed(1)}s without throwing`);
}

console.log(failed ? 'MINIGAMES: FAILED' : 'MINIGAMES: PASSED');
process.exit(failed ? 1 : 0);
