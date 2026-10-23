// The audio guard (engine/audio-guard.js): relief after two seconds under 0.95; a RESTART when
// relief has not brought the clock back — three seconds under 0.9, a second under 0.7, or a
// second of audio behind in all — never within eight seconds of the last; the lanes muted from
// the second restart in a level; and everything put back only when the level is left — never
// on a healthy stretch.
import assert from 'node:assert/strict';
const { createAudioGuard, GUARD } = await import('../src/engine/audio-guard.js');

const log = [];
const restarts = [];
const state = { eightBit: false, relief: false, lookahead: null, deep: false };
const g = createAudioGuard({
  eightBit: (on) => { state.eightBit = on; }, densityRelief: (on) => { state.relief = on; },
  lookahead: (s) => { state.lookahead = s; }, deep: (on) => { state.deep = on; },
  restart: (clock, debt) => restarts.push([clock, debt]),
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
assert.deepEqual(state, { eightBit: true, relief: true, lookahead: null, deep: false }, 'every relief lever pulled — and not the lookahead: crackle is not holes');
assert.equal(restarts.length, 0, 'relief alone is not a restart');
// 0.18 s behind already (three slow seconds); a second behind in all is fourteen more.
run(0.94, 13);
assert.equal(restarts.length, 0, 'a crackle relief holds at 0.94 is not a restart on time (it is not under 0.9)…');
run(0.94, 1);
assert.equal(restarts.length, 1, '…but seventeen seconds of it is a second of audio behind, and that is: the debt is the backlog WebKit will burst');
run(1, 120);
assert.equal(g.level, 1, 'two healthy minutes on the same level do not swap back');
g.tick(1, true, null);
assert.equal(g.level, 0, 'leaving the level puts everything back');
assert.deepEqual(state, { eightBit: false, relief: false, lookahead: null, deep: false }, 'every lever put back');
run(0.9, GUARD.reliefAfter, levelB);
assert.equal(g.level, 1, 'the next level can need relief again');
g.tick(1, false, levelA);
assert.equal(g.level, 0, 'and a different level is a level left, clock or no clock');
g.tick(0, true, levelA); g.tick(NaN, true, levelA);
assert.ok(log.every((l) => /^GUARD /.test(l)) && log.length === 5, 'every step is noted; a stopped clock is ignored');

// AHEAD: the lookahead is for HOLES — the sequencer's margin under zero, or late passes —
// whatever the clock says, and it goes back when the level is left.
{
  const notes = [];
  const st = { lookahead: null };
  const a = createAudioGuard({ lookahead: (s) => { st.lookahead = s; }, note: (t) => notes.push(t) });
  const lvl = {};
  a.tick(1, true, lvl, { margin: -20, late: 1 });
  assert.equal(st.lookahead, null, 'one second of holes is not enough');
  a.tick(1, true, lvl, { margin: 40, late: 0 });
  a.tick(1, true, lvl, { margin: -5, late: 0 });
  a.tick(1, true, lvl, { margin: 10, late: 2 });
  assert.ok(a.ahead && st.lookahead === GUARD.reliefLookahead, 'two seconds of holes queue further ahead, the clock healthy');
  assert.equal(a.level, 0, 'and that is not relief: nothing else changes');
  for (let i = 0; i < 30; i++) a.tick(0.9, true, lvl, { margin: 60, late: 0 });
  assert.ok(a.level >= 1 && a.ahead, 'crackle later brings relief and keeps the lookahead');
  a.tick(1, true, null, { margin: 60, late: 0 });
  assert.ok(!a.ahead && st.lookahead === null, 'leaving the level puts the lookahead back');
  const c = createAudioGuard({ lookahead: (s) => { st.lookahead = s; } });
  for (let i = 0; i < 10; i++) c.tick(0.5, true, lvl, { margin: 80, late: 0 });
  assert.ok(c.level === 1 && !c.ahead && st.lookahead === null, 'crackle alone never touches the lookahead');
  assert.ok(notes.some((t) => /^GUARD ahead/.test(t)), 'and the lookahead is noted');
}

// RESTART, three ways in: on time (under 0.9 for three seconds with relief on), at once on a
// hard fall (a second under 0.7), and on the debt (a second of audio behind in all) — then not
// again until it has settled. The second restart in a level mutes the lanes, and they stay muted.
{
  const notes = [];
  const rs = [];
  const st = { deep: false, eightBit: false };
  const lvl = {};
  const mk = () => createAudioGuard({ eightBit: (on) => { st.eightBit = on; }, deep: (on) => { st.deep = on; }, restart: (c, d) => rs.push([c, +d.toFixed(2)]), note: (t) => notes.push(t) });
  // On time.
  let r = mk(); const go = (clock, n) => { for (let i = 0; i < n; i++) r.tick(clock, true, lvl); };
  go(0.94, GUARD.reliefAfter);
  go(0.89, GUARD.restartAfter - 1);
  assert.equal(rs.length, 0, 'relief gets its time before a restart');
  go(0.89, 1);
  assert.equal(rs.length, 1, 'still under 0.9 after it: a restart');
  assert.ok(!st.deep && r.level === 1, 'the first restart leaves the lanes alone');
  go(0.85, GUARD.restartSettle - 1);
  assert.equal(rs.length, 1, 'not again while it settles');
  go(0.85, 4);
  assert.ok(rs.length === 2 && st.deep && r.level === 2, 'the second restart in the level mutes the lanes');
  assert.ok(/restart: .*muted from here/.test(notes[notes.length - 1]), 'and says so');
  go(0.5, 60);
  assert.equal(rs.length, GUARD.restartTimes, 'and no more than twice a level, however bad it stays');
  go(1, 60);
  assert.ok(r.level === 2 && st.deep, 'they stay muted however healthy the clock');
  r.tick(1, true, null);
  assert.ok(r.level === 0 && !st.deep && !st.eightBit, 'leaving the level lifts everything');
  // At once on a hard fall.
  rs.length = 0; r = mk();
  go(0.94, GUARD.reliefAfter); go(0.65, 1);
  assert.deepEqual(rs.map(([c]) => c), [0.65], 'a second under 0.7 with relief on: a restart at once');
  // On the debt (a clock over 0.9, so never on time) — and a catch-up second pays it off.
  rs.length = 0; r = mk();
  go(0.94, GUARD.reliefAfter);   // 0.12 s behind
  go(0.92, 10);                  // 0.92 s behind
  assert.equal(rs.length, 0, 'ten seconds at 0.92 (0.9 s behind in all) are not enough');
  go(0.92, 2);
  assert.equal(rs.length, 1, 'twelve are: a second behind, the restart comes before the backlog can hurt');
  assert.ok(rs[0][1] >= 1, `with the debt reported (${rs[0][1]} s)`);
  rs.length = 0; r = mk();
  go(0.94, GUARD.reliefAfter); go(0.92, 8); go(1.6, 1); go(0.92, 5);
  assert.equal(rs.length, 0, 'a catch-up second paid the debt off');
  go(1, GUARD.healthyClear); go(0.92, 9);
  assert.equal(rs.length, 0, 'and five healthy seconds cleared it: the debt is the trouble now');
  // Never without a restart lever.
  const bare = createAudioGuard({ eightBit: () => {} });
  for (let i = 0; i < 30; i++) bare.tick(0.5, true, lvl);
  assert.equal(bare.level, 1, 'with no restart lever, relief is all there is');
}

// The jukebox and the Lab restart as a level does.
{
  const rs = [];
  const m = createAudioGuard({ eightBit: () => {}, restart: (c) => rs.push(c) });
  for (let i = 0; i < 10; i++) m.tick(0.5, true, null);
  assert.ok(m.level === 1 && rs.length === 1, 'outside a level: relief, then a restart');
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
  // The mix's layers too (22 Oct 2026: the canary's load song is 31 of them, and DEEP muted one lane).
  const canary = await import('../src/data/audio-canary.js');
  const deepLoad = deepReliefMix(canary.load.bank, canary.load.mix);
  const layerKeys = canary.load.mix.layers.map((l) => l.key);
  assert.ok(layerKeys.length === 31 && layerKeys.every((k) => deepLoad.lanes[k]?.mute), 'DEEP mutes every layer of the mix');
  assert.ok(!deepLoad.lanes.kick?.mute, 'and keeps the kick');
}
console.log('AUDIO GUARD: PASSED');
