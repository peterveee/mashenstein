// Attract mode: rotation covers all 30 scenarios before repeating, demos run
// headlessly to a natural end or watchdog without touching the real save, and
// the first human input exits with the press consumed.
import { installDom } from './dom-stub.js';
const dom = installDom();

const { AttractState, nextScenario } = await import('../src/game/attract.js');
const { save } = await import('../src/engine/save.js');
const { Input } = await import('../src/engine/input.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

Input.init(); // real listeners so dom.key() counts as HUMAN activity
save.load();
save.newSlot(0, 0);
save.slot.coins = 777;
save.persist();

// 1) shuffled rotation: 30 unique entries before any repeat
const seen = new Set();
for (let i = 0; i < 30; i++) {
  const sc = nextScenario();
  seen.add(sc.kind + ':' + sc.id);
}
assert(seen.size === 30, `rotation covers ${seen.size}/30 unique scenarios before repeating`);

const ctx = globalThis.document.createElement('canvas').getContext('2d');
const TICK = 1 / 60;
const snapshotBefore = JSON.stringify(save.data);

// 2) demos (one stage-ish, one more from the fresh rotation) end on their own
for (let d = 0; d < 2; d++) {
  let exited = null;
  const st = new AttractState({ realSettings: save.settings, onExit: (auto) => { exited = auto; } });
  st.enter();
  const kind = st.scenario.kind;
  let ticks = 0;
  while (exited === null && ticks < 60 * 260) {
    st.update(TICK);
    st.draw(ctx);
    ticks++;
  }
  st.exit();
  assert(exited === true, `${kind} demo "${st.scenario.id}" ended naturally/via watchdog after ${(ticks / 60).toFixed(1)}s (auto=${exited})`);
}

// 3) the real save is byte-identical after demos
assert(JSON.stringify(save.data) === snapshotBefore, 'real save data untouched by demos');

// 4) first human input exits immediately and is consumed
let exited2 = null;
const st2 = new AttractState({ realSettings: save.settings, onExit: (auto) => { exited2 = auto; } });
st2.enter();
for (let i = 0; i < 30; i++) { st2.update(TICK); st2.draw(ctx); }
assert(exited2 === null, 'demo still running before human input');
dom.key('Enter'); // human presses the scariest possible key
st2.update(TICK);
st2.exit();
assert(exited2 === false, 'human input exits the demo (no interlude flag)');
assert(Input.down.size === 0 && Input.hit.size === 0, 'exit input consumed — cannot select a save slot');

console.log(failed ? 'ATTRACT: FAILED' : 'ATTRACT: PASSED');
process.exit(failed ? 1 : 0);
