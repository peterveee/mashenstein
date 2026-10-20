// The audio guard (engine/audio-guard.js): relief after two seconds under 0.95, a kick only
// after three very slow ones with relief on, and everything put back only when the level is
// left — never on a healthy stretch.
import assert from 'node:assert/strict';
const { createAudioGuard, GUARD } = await import('../src/engine/audio-guard.js');

const log = [];
let kicks = 0;
const state = { eightBit: false, relief: false, lookahead: null };
const g = createAudioGuard({
  eightBit: (on) => { state.eightBit = on; }, densityRelief: (on) => { state.relief = on; },
  lookahead: (s) => { state.lookahead = s; }, kick: async () => { kicks++; },
  note: (t) => log.push(t),
});
const levelA = {}, levelB = {};
const run = (clock, n, place = levelA) => { for (let i = 0; i < n; i++) g.tick(clock, true, place); };

run(1, 10);
assert.equal(g.level, 0, 'a healthy clock does nothing');
run(0.94, 1); run(1, 1);
assert.equal(g.level, 0, 'one slow second is not enough');
run(0.94, GUARD.reliefAfter);
assert.equal(g.level, 1, 'two seconds under 0.95 bring relief');
assert.deepEqual(state, { eightBit: true, relief: true, lookahead: GUARD.reliefLookahead }, 'every relief lever pulled');
run(0.5, GUARD.kickAfter);
await new Promise((r) => setTimeout(r, 0));
assert.equal(kicks, 1, 'three very slow seconds under relief kick the context');
run(1, 120);
assert.equal(g.level, 1, 'two healthy minutes on the same level do not swap back');
g.tick(1, true, null);
assert.equal(g.level, 0, 'leaving the level puts everything back');
assert.deepEqual(state, { eightBit: false, relief: false, lookahead: null }, 'every lever put back');
run(0.9, GUARD.reliefAfter, levelB);
assert.equal(g.level, 1, 'the next level can need relief again');
g.tick(1, false, levelA);
assert.equal(g.level, 0, 'and a different level is a level left, clock or no clock');
g.tick(0, true, levelA); g.tick(NaN, true, levelA);
assert.ok(log.every((l) => /^GUARD /.test(l)) && log.length === 5, 'every step is noted; a stopped clock is ignored');

// DEEP: relief that has not brought the clock back mutes all but drums, bass and lead, lifts
// once the clock has held, and a second DEEP in the level stays.
{
  const notes = [];
  const st = { eightBit: false, deep: false };
  const d = createAudioGuard({ eightBit: (on) => { st.eightBit = on; }, deep: (on) => { st.deep = on; }, note: (t) => notes.push(t) });
  const lvl = {};
  const go = (clock, n) => { for (let i = 0; i < n; i++) d.tick(clock, true, lvl); };
  go(0.9, GUARD.reliefAfter);
  assert.equal(d.level, 1, 'relief first');
  go(0.85, GUARD.deepAfter - 1);
  assert.equal(d.level, 1, 'relief gets its time before DEEP');
  go(0.85, 1);
  assert.ok(d.level === 2 && st.deep, 'still under 0.9 after it: DEEP');
  go(1, GUARD.liftAfter - 1); go(0.9, 1); go(1, GUARD.liftAfter - 1);
  assert.equal(d.level, 2, 'the lanes wait for an unbroken healthy stretch');
  go(1, 1);
  assert.ok(d.level === 1 && !st.deep && st.eightBit, 'held: the lanes come back, still in 8-bit');
  go(0.8, GUARD.deepAfter);
  assert.equal(d.level, 2, 'tipped again: DEEP again');
  go(1, 60);
  assert.ok(d.level === 2 && st.deep, 'a second DEEP stays for the rest of the level');
  d.tick(1, true, null);
  assert.ok(d.level === 0 && !st.deep && !st.eightBit, 'leaving the level lifts everything');
  assert.ok(notes.some((t) => /deep: .*rest of the level/.test(t)) && notes.some((t) => /lanes back/.test(t)), 'DEEP and its lift are noted');
}

// What DEEP keeps of Gravity Grid: its drums, its bass and its lead, nothing else.
{
  const { deepReliefMix } = await import('../src/game/results-chip.js');
  const song = await import('../src/data/songs/gravity.js');
  const { laneList } = await import('../src/engine/lanes.js');
  const deep = deepReliefMix(song.bank, song.mix);
  const heard = laneList(song.bank).map((l) => l.key).filter((k) => !deep.lanes[k]?.mute);
  for (const k of ['kick', 'snare', 'hats', 'bass', 'lead']) assert.ok(heard.includes(k), `DEEP keeps ${k}`);
  for (const k of ['lead2', 'lead4', 'chords', 'chords2', 'twinkle', 'bass2']) assert.ok(!heard.includes(k), `DEEP mutes ${k}`);
  assert.equal(song.mix.lanes.lead2?.mute, undefined, 'and leaves the song itself alone');
}
{
  const st = { deep: false };
  const m = createAudioGuard({ eightBit: () => {}, deep: (on) => { st.deep = on; } });
  for (let i = 0; i < 30; i++) m.tick(0.5, true, null);
  assert.ok(m.level === 1 && !st.deep, 'in a menu, relief but never DEEP');
}
console.log('AUDIO GUARD: PASSED');
