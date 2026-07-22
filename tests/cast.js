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

// No card idles: defaults move for 70%, then stay on the same shipped
// celebration path as the results curtain call. Character exceptions below
// retain their requested attack/special timing.
st.reduced = false;
for (const h of CAST_HEROES) {
  let foundIdle = false;
  for (let sample = 0; sample < 8; sample += 0.05) {
    st.slotT = sample;
    if (st.poseFor(h, false).pose.kind === 'idle') foundIdle = true;
  }
  assert(!foundIdle, `${h.short} never enters an idle pose`);
  if (h.id !== 'lorenzo') {
    const handoff = h.id === 'grumpos' ? 4 : 5.6;
    const gaitPhase = (offset) => {
      st.slotT = handoff + offset;
      return st.poseFor(h, false).pose.phase;
    };
    const p1 = gaitPhase(-0.3), p2 = gaitPhase(-0.2), p3 = gaitPhase(-0.1);
    const d1 = (p2 - p1 + 1) % 1, d2 = (p3 - p2 + 1) % 1;
    if (h.id === 'gnash') {
      assert(d2 > d1,
        'GNASH accelerates his gait continuously into the Spin Dash');
    } else {
      assert(Math.abs(d1 - d2) < 0.000001,
        `${h.short} keeps a constant gait speed through the handoff`);
    }
  }
  if (h.id === 'lorenzo') {
    st.slotT = 3.5;
    const walkingIn = st.poseFor(h, false).pose;
    st.slotT = 3.85;
    const attacking = st.poseFor(h, false).pose;
    st.slotT = 4.3;
    const walkingOut = st.poseFor(h, false).pose;
    assert(walkingIn.kind === 'run' && attacking.kind === 'run'
      && attacking.menuAction === 'smash' && attacking.actionTime > 0
      && walkingOut.kind === 'run' && !walkingOut.menuAction,
    'LORENZO keeps walking through one overlaid wrench attack');
    continue;
  }
  if (h.id === 'dolores') {
    st.slotT = 2;
    const early = st.poseFor(h, false).pose;
    st.slotT = 6;
    const late = st.poseFor(h, false).pose;
    st.slotT = 7.9;
    const finishing = st.poseFor(h, false).pose;
    assert(early.kind === 'run' && late.kind === 'run' && finishing.kind === 'run',
      'DOLORES keeps walking for her whole card and never celebrates');
    continue;
  }
  st.slotT = 4.7;
  const walking = st.poseFor(h, false).pose;
  st.slotT = 5.1;
  const middle = st.poseFor(h, false).pose;
  st.slotT = 5.7;
  const celebrating = st.poseFor(h, false).pose;
  st.slotT = 7.9;
  const finishing = st.poseFor(h, false).pose;
  if (h.id === 'gnash' || h.id === 'fernwick') {
    const special = h.id === 'gnash'
      ? celebrating.kind === 'run' && celebrating.lean > 0 && celebrating.castDash
        && finishing.kind === 'run' && finishing.castDash
      : celebrating.kind === 'duck' && celebrating.roll
        && finishing.kind === 'duck' && finishing.roll;
    assert(walking.kind === 'run' && middle.kind === 'run' && special,
      `${h.short} moves 70%, then enters the gameplay special directly`);
    st.slotT = 5.6 - 0.000001;
    assert(st.poseFor(h, false).pose.phase > 0.999,
      `${h.short} finishes the gait cycle before the special`);
  } else if (h.id === 'grumpos') {
    st.slotT = 3.9;
    const firstHalf = st.poseFor(h, false).pose;
    st.slotT = 4.1;
    const secondHalf = st.poseFor(h, false).pose;
    assert(firstHalf.kind === 'run' && secondHalf.kind === 'celebrate'
      && finishing.kind === 'celebrate',
    'GRUMPOS walks 50%, then celebrates through the final 50%');
    st.slotT = 4 - 0.000001;
    assert(st.poseFor(h, false).pose.phase > 0.999,
      'GRUMPOS finishes the gait cycle before celebrating');
  } else if (h.id === 'b33p') {
    assert(walking.kind === 'run' && middle.kind === 'run'
      && celebrating.kind === 'celebrate' && finishing.kind === 'celebrate',
    'B-33P walks 70%, then celebrates directly through the final 30%');
    st.slotT = 5.6 - 0.000001;
    assert(st.poseFor(h, false).pose.phase > 0.999,
      'B-33P finishes the gait cycle before celebrating');
  } else {
    assert(walking.kind === 'run' && middle.kind === 'run'
      && celebrating.kind === 'celebrate' && finishing.kind === 'celebrate',
    `${h.short} moves 70%, then celebrates directly through the end`);
    st.slotT = 5.6 - 0.000001;
    assert(st.poseFor(h, false).pose.phase > 0.999,
      `${h.short} finishes the gait cycle before celebrating`);
  }
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
