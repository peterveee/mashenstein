// Intro sequence: the opening is a timed film, not a stack of input-gated panels.
import { installDom } from './dom-stub.js';

installDom();

const { IntroState } = await import('../src/game/menus.js');
const { INTRO_BEATS } = await import('../src/data/jokes.js');
const { Audio } = await import('../src/engine/audio.js');
const { Input } = await import('../src/engine/input.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const TICK = 1 / 60;
const total = INTRO_BEATS.reduce((sum, beat) => sum + beat.duration, 0);

function spyIntro() {
  const calls = [];
  Audio.sfx = (name, options) => calls.push(['sfx', name, options]);
  Audio.startCrowdCheer = (options) => calls.push(['crowd-start', options]);
  Audio.stopCrowdCheer = () => calls.push(['crowd-stop']);
  return calls;
}

// --- The normal route plays without input, then waits to close ------------
{
  Input.clearAll();
  const calls = spyIntro();
  let done = 0;
  const state = new IntroState({ onDone: () => { done++; } });
  state.enter();
  const panels = new Set([state.panel]);
  let elapsed = 0;
  while (!state.awaitingClose && elapsed < total + 2) {
    state.update(TICK);
    elapsed += TICK;
    panels.add(state.panel);
  }
  assert(done === 0 && state.awaitingClose, 'autoplay waits for close input');
  assert(elapsed >= total - 0.001 && elapsed < total + 0.1, `autoplay lasts the authored ${total}s timeline`);
  assert([...panels].join(',') === '0,1,2,3,4', 'autoplay visits every scene panel');
  assert(calls.some(([kind, name]) => kind === 'sfx' && name === 'powerDown'), 'shutdown audio starts on the shutdown panel');
  assert(calls.some(([kind]) => kind === 'crowd-start'), 'crowd starts on the relay panel');
  assert(calls.at(-1)?.[0] !== 'crowd-stop', 'crowd remains active at the close prompt');
  Input.press('confirm');
  state.update(TICK);
  Input.clearAll();
  assert(done === 1, 'confirm closes the finished film');
  assert(calls.at(-1)?.[0] === 'crowd-stop', 'crowd is stopped when the film closes');
  state.update(TICK);
  assert(done === 1, 'completion callback fires only once');
}

// --- A tap advances the beat; only Back exits outright ---------------------
{
  Input.clearAll();
  let done = 0;
  const state = new IntroState({ onDone: () => { done++; } });
  state.enter();
  const startBeat = state.beatIndex;
  Input.press('confirm');
  state.update(TICK);
  Input.clearAll();
  assert(done === 0, 'confirm does not skip the film');
  assert(state.beatIndex === startBeat + 1, 'confirm advances to the next beat instead');

  Input.clearAll();
  const calls = spyIntro();
  let backed = 0;
  const backState = new IntroState({ onDone: () => { backed++; } });
  backState.enter();
  Input.press('back');
  backState.update(TICK);
  Input.clearAll();
  assert(backed === 1, 'Back exits the film');
  assert(calls.at(-1)?.[0] === 'crowd-stop', 'Back stops crowd audio safely');
}

// --- Tapping through every beat reaches the close prompt, then closes -----
{
  Input.clearAll();
  let done = 0;
  const state = new IntroState({ onDone: () => { done++; } });
  state.enter();
  for (let i = 0; i < INTRO_BEATS.length; i++) {
    Input.press('confirm');
    state.update(TICK);
    Input.clearAll();
  }
  assert(done === 0 && state.awaitingClose, 'tapping through every beat reaches the close prompt without exiting');
  Input.press('confirm');
  state.update(TICK);
  Input.clearAll();
  assert(done === 1, 'one more tap closes it once every beat has played');
}

process.exit(failed ? 1 : 0);