import assert from 'node:assert/strict';
import { installDom } from './dom-stub.js';
installDom();
const { cryptNight, CRYPT_WEATHER_TIMING: T } = await import('../src/engine/stylePacks/cryptGouache.js');
const { RunState } = await import('../src/game/run.js');
const { Audio } = await import('../src/engine/audio.js');
const at = (beat, clear = null, held = null) => cryptNight(0, beat, 1, clear, held);
assert.equal(at(56).dim, 0);
assert.equal(at(61).dim, 0);
assert(at(64).dim < .4, 'arrival envelope delayed until choir entry');
assert.equal(at(69).dim, 1);
assert.equal(at(96).dispersal, 1);
assert(at(100).dispersal < 1 && at(100).dispersal > 0);
assert.equal(at(108).dispersal, 0);
const speedBefore = at(96).p - at(95.99).p;
const speedAfter = at(96.01).p - at(96).p;
assert(Math.abs(speedBefore - speedAfter) < 1e-12, 'no speed break at choir exit');
for (const beat of [0, 60, 64, 96, 108, 191, 192, 256]) {
 assert.deepEqual(cryptNight(0, beat), cryptNight(1, beat), 'distance independent');
 assert.deepEqual(at(beat), at(beat + 192), 'normal song repeats');
}
for (const retry of [64, 68, 80, 95.99]) {
 const clear = retry + T.retryHoldBeats;
 const held = at(retry).p;
 for (const elapsed of [0, 4, 12, 15.99]) assert(Math.abs(at(retry + elapsed, clear).p - held) < 1e-12, 'four-bar hold');
 for (const elapsed of [1, 4, 8, 12, 15]) {
  assert(at(clear + elapsed, clear).p > held);
  assert(at(clear + elapsed, clear).dispersal < 1, 'release starts immediately after four-bar hold');
  assert(at(clear + elapsed, clear).dispersal > 0);
 }
 assert.equal(at(clear + 16, clear).dispersal, 0);
}
const cabinet = { id: 'crypt', music: {} };
Audio.sourceBank = cabinet.music;
let beat = 68;
Audio.songBeat = () => beat;
const run = { cabinet, introDone: true };
RunState.prototype.armCryptWeatherClearDelay.call(run);
assert.equal(run.cryptWeatherClearBeat, 84);
const held = run.cryptWeatherHeldProgress;
beat = 76;
RunState.prototype.armCryptWeatherClearDelay.call(run);
assert.equal(run.cryptWeatherHeldProgress, held, 'second retry preserves the held cloud position');
assert.equal(run.cryptWeatherClearBeat, 92);
beat = 96;
RunState.prototype.armCryptWeatherClearDelay.call(run);
assert.equal(run.cryptWeatherClearBeat, null, 'retry outside choir uses normal schedule');
for (const fade of [0, .25, .5, 1]) {
 const night = cryptNight(0, 70, fade);
 assert.equal(night.p, at(70).p, 'lifecycle opacity never moves clouds');
 assert.equal(night.dim, fade);
}
console.log('CRYPT WEATHER: timing, retry hold/release, repeat retries, distance independence and lifecycle passed');
