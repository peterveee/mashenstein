// LIGHT VERSIONS (results-chip.js lightReason, engine/device-bench.js): a song with a light
// version plays it on a device that needs one — a slow audio bench, or that song having made
// this device's audio fall behind before — and the full mix everywhere else. SOUNDTRACK: LIGHT
// is a dev build's; `?fullmix` beats everything.
import assert from 'node:assert/strict';
const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
globalThis.window = { __MASH_BUILD__: 'dev' };
const R = await import('../src/game/results-chip.js');
const { LIGHT_BENCH_MS } = await import('../src/engine/device-bench.js');
const g = await import('../src/data/songs/gravity.js');
const r = await import('../src/data/songs/rhythm.js');
const save = { settings: { soundtrack: 'original' }, persist() {} };
R.installSoundtrack(save);

assert.equal(R.lightReason(g.bank), null, 'no bench yet: full');
store.mash_audio_bench = JSON.stringify({ v: 1, ms: LIGHT_BENCH_MS + 120 });
assert.equal(R.lightReason(g.bank), 'bench', 'a slow bench: the light version');
assert.equal(R.lightReason(r.bank), null, 'a song with no light version stays full');
store.mash_audio_bench = JSON.stringify({ v: 1, ms: 527 });
assert.equal(R.lightReason(g.bank), null, "Peter's phone in Low Power Mode plays full");
store.mash_audio_bench = JSON.stringify({ v: 0, ms: 9999 });
assert.equal(R.lightReason(g.bank), null, 'a score from another bench version is not trusted');
assert.equal(R.learnLight('gravity'), true, 'a dip is learned');
assert.equal(R.learnLight('gravity'), false, 'once');
assert.equal(R.learnLight('rhythm'), false, 'not for a song with no light version');
assert.equal(R.lightReason(g.bank), 'learned', 'a learned song goes light');
R.setLightMixes(false);
assert.equal(R.lightReason(g.bank), null, '?fullmix beats a learned dip');
R.setLightMixes(null); R.forgetLearnedLight();
save.settings.soundtrack = 'light';
assert.equal(R.lightReason(g.bank), 'setting', 'dev SOUNDTRACK: LIGHT');
R.cycleSoundtrack(); assert.equal(save.settings.soundtrack, '8bit', 'dev cycle: LIGHT → 8-BIT');
R.cycleSoundtrack(); assert.equal(save.settings.soundtrack, 'original', '8-BIT → ORIGINAL');
R.cycleSoundtrack(); assert.equal(save.settings.soundtrack, 'light', 'ORIGINAL → LIGHT in a dev build');
globalThis.window.__MASH_BUILD__ = '';
assert.equal(R.lightReason(g.bank), null, 'a release reads a saved LIGHT as ORIGINAL');
save.settings.soundtrack = 'original';
R.cycleSoundtrack(); assert.equal(save.settings.soundtrack, '8bit', 'release cycle: ORIGINAL → 8-BIT');
console.log('LIGHT VERSIONS: PASSED');
