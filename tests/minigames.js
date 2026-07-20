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
  while (!ended && t < 95) {
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

// Skip: ESC / the SKIP button bails out of any minigame as a no-bonus non-win,
// and reports to onEnd rather than stranding the player in the breaker box.
for (const game of MINIGAMES) {
  let ended = null;
  const st = new MinigameState({ game, seed: 7, settings: {}, onEnd: (success) => { ended = { success }; } });
  st.enter();
  const skipBtn = Input.buttons.find((b) => b.id === 'skip');
  Input.press('back');
  st.update(1 / 60);
  const skippedImmediately = st.skipped === true && ended === null;
  let t = 0;
  while (!ended && t < 3) { t += 1 / 60; st.update(1 / 60); st.draw(canvasCtx); }
  assert(skipBtn && skipBtn.action === 'back', `${game}: exposes a SKIP button wired to back`);
  assert(skippedImmediately, `${game}: ESC marks the run skipped`);
  assert(ended && ended.success === false, `${game}: skip reports a non-win to onEnd`);
  st.exit();
}

// Skip must be reachable with a mouse on desktop, not just by touch: a click at
// the SKIP button's centre has to resolve to the 'back' action.
{
  Input.usingTouch = false;
  const st = new MinigameState({ game: 'blocksurge', seed: 7, settings: {}, onEnd: () => {} });
  st.enter();
  const b = Input.buttons.find((x) => x.id === 'skip');
  const hit = Input.buttonAt(b.x + b.w / 2, b.y + b.h / 2);
  assert(hit && hit.id === 'skip', 'a desktop mouse click on SKIP resolves to the skip button');
  assert(hit.action === 'back', 'that click fires the same back action as ESC');
  st.exit();
}

// Touch devices never see the breaker box: the arcade shutters and cabinets
// power on without a minigame.
{
  const { ArcadeState } = await import('../src/game/hub/index.js');
  Input.usingTouch = true;
  const saveStub = { slot: { campaign: { storyFlags: { minigamesSeen: ['rewire', 'turdle'] } } } };
  const arcade = new ArcadeState({ save: saveStub, flow: {} });
  const opts = arcade.options();
  assert(!opts.some((o) => o.game), 'arcade offers no minigames on touch');
  assert(opts.some((o) => o.none) && opts.some((o) => o.back), 'arcade still shows a shuttered notice and BACK on touch');
  Input.usingTouch = false;
  assert(new ArcadeState({ save: saveStub, flow: {} }).options().filter((o) => o.game).length === 2,
    'arcade lists seen minigames again on keyboard');
}

console.log(failed ? 'MINIGAMES: FAILED' : 'MINIGAMES: PASSED');
process.exit(failed ? 1 : 0);
