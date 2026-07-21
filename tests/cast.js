// Title cast roll call: introduces every hero by name, ends on its own after
// the whole cast, and the first human input exits with the press consumed.
import { installDom } from './dom-stub.js';
const dom = installDom();

const { CastState, CAST_HEROES } = await import('../src/game/cast.js');
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

const ctx = globalThis.document.createElement('canvas').getContext('2d');
const TICK = 1 / 60;

// 1) every hero is shown, in roster order, and the roll call ends by itself
let exited = null;
const st = new CastState({ realSettings: save.settings, onExit: (auto) => { exited = auto; } });
st.enter();
const shown = [];
let ticks = 0;
while (exited === null && ticks < 60 * 120) {
  st.update(TICK);
  if (exited === null) {
    st.draw(ctx);
    const id = CAST_HEROES[Math.min(st.i, CAST_HEROES.length - 1)].id;
    if (shown[shown.length - 1] !== id) shown.push(id);
  }
  ticks++;
}
st.exit();
assert(exited === true, `roll call ended on its own after ${(ticks / 60).toFixed(1)}s (auto=${exited})`);
assert(shown.length === CAST_HEROES.length, `showed ${shown.length}/${CAST_HEROES.length} cast members`);
assert(shown.join(',') === CAST_HEROES.map((h) => h.id).join(','), 'every cast member appeared once, in roster order');

// 2) every hero has the copy the screen renders
for (const h of CAST_HEROES) {
  assert(!!(h.short && h.tagline && h.ability && h.ability.label && h.abilityDesc),
    `${h.short} has name, tagline and ability copy`);
}

// 3) Right/D advances and Left/A retreats through the roll call
let exited3 = null;
const st3 = new CastState({ realSettings: save.settings, onExit: (auto) => { exited3 = auto; } });
st3.enter();
dom.key('ArrowRight');
st3.update(TICK);
assert(exited3 === null && st3.i === 1 && st3.slotT === 0,
  'Right advances the roll call without exiting');
dom.key('ArrowLeft');
st3.update(TICK);
assert(exited3 === null && st3.i === 0 && st3.slotT === 0,
  'Left retreats the roll call without exiting');
dom.key('ArrowLeft');
st3.update(TICK);
assert(exited3 === null && st3.i === 0,
  'Left at the first character stays in the roll call');
dom.fire('win:keydown', {
  code: 'KeyP', repeat: false, metaKey: true, shiftKey: true, preventDefault() {},
});
st3.update(TICK);
assert(exited3 === null && st3.i === 0,
  'screenshot shortcut does not exit the roll call');
st3.exit();

// 4) first other human input exits immediately and is consumed
let exited2 = null;
const st2 = new CastState({ realSettings: save.settings, onExit: (auto) => { exited2 = auto; } });
st2.enter();
for (let i = 0; i < 30; i++) { st2.update(TICK); st2.draw(ctx); }
assert(exited2 === null, 'roll call still running before human input');
dom.key('Enter');
st2.update(TICK);
st2.exit();
assert(exited2 === false, 'human input exits the roll call (no interlude flag)');
assert(Input.down.size === 0 && Input.hit.size === 0, 'exit input consumed — cannot select a save slot');

console.log(failed ? 'CAST: FAILED' : 'CAST: PASSED');
process.exit(failed ? 1 : 0);
