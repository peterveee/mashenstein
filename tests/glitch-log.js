// The glitch log (engine/glitch-log.js): only bad seconds are kept, each says which half
// went wrong and where, the first of a run reaches the crash trail, and it survives a
// reload through localStorage.
import assert from 'node:assert/strict';

const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)) };
const { startGlitchSession, noteSecond, glitchReport, flushGlitches, GLITCH, __glitchTesting } = await import('../src/engine/glitch-log.js');

const firsts = [];
startGlitchSession({ build: 'test', where: () => 'crypt-2 bar41 D2.5', first: (l) => firsts.push(l) });
noteSecond({ clock: 1.0, margin: 40, late: 0, framesLost: 0, frameMs: 17 });
assert.equal(glitchReport().split('\n').length, 1, 'a clean second is not logged');
noteSecond({ clock: 0.82, margin: 30, late: 0, framesLost: 0, frameMs: 17 });
noteSecond({ clock: 1.0, margin: -20, late: 2, framesLost: 0, frameMs: 17 });
noteSecond({ clock: 1.0, margin: 30, late: 0, framesLost: GLITCH.framesLost, frameMs: 40 });
const lines = glitchReport().split('\n');
assert.equal(lines.length, 4, 'three bad seconds, one header');
assert.match(lines[1], /C0\.82 .*CRACKLE.*crypt-2 bar41 D2\.5/, 'a slow audio clock is crackle, with where it happened');
assert.match(lines[2], /M-20\/2 .*HOLES/, 'a starved queue is holes');
assert.match(lines[3], /F6\/40 .*FRAMES/, 'dropped frames are frames');
assert.equal(firsts.length, 1, 'only the first of a run goes on the crash trail');
assert.match(lines[0], /3 bad of 4 seconds/, 'the header counts bad seconds against all of them');
noteSecond({ clock: 0, margin: null, late: 0, framesLost: 0, frameMs: 0 });
assert.equal(glitchReport().split('\n').length, 4, 'a stopped audio clock (nothing playing) is not crackle');

// A reload reads the stored sessions back (pagehide flushes them).
flushGlitches();
__glitchTesting.reset();
startGlitchSession({ build: 'next' });
const after = glitchReport();
assert.match(after, /== GLITCHES .* test — 3 bad of 5 seconds/, 'the earlier session survived the reload');
assert.match(after, /== GLITCHES .* next — 0 bad of 0 seconds/, 'and a new one has begun');
console.log('GLITCH LOG: PASSED');
