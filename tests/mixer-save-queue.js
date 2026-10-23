import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSaveQueue } from '../tools/mixer-save-queue.js';

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const tick = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const source = readFileSync(new URL('../tools/mixer-entry.js', import.meta.url), 'utf8');
// Exercise the actual save functions with an isolated desk and deferred transport;
// loading the full entry module would start the audio engine and browser UI.
const code = source.slice(source.indexOf('function saveMix(id) {'), source.indexOf('// ---- restore a previous save'));
const pinCode = source.slice(source.indexOf('async function pinPresetInSongs('), source.indexOf('\n/**', source.indexOf('async function pinPresetInSongs(')));
const requests = [];
const draft = { a: { gain: 1 }, b: { gain: 2 } };
const arrDraft = { a: { bars: 4 } };
const variantDraft = { a: { variant: 1 } };
const createDesk = new Function('env', `
  let { draft, arrDraft, variantDraft, fetchMixerAction, enqueueMixSave } = env;
  let saved = { a: { gain: 0 }, b: { gain: 0 } }, savedArr = {}, variantSaved = {};
  const STATIC = !!env.STATIC, ARRANGE_KEY = 'arr';
  const draftPersistence = { flush() {} }, localStorage = { setItem() {} };
  const mixChanged = (a,b) => JSON.stringify(a) !== JSON.stringify(b);
  const freezeVoices = () => {}, persistDraftNow = () => {}, persistLocalSave = () => {}, updateStatus = () => {};
  const tell = async () => {}, escapeHtml = x => x;
  const voiceKeysUsing = () => ['leadVoice'];
  const mixFor = id => draft[id] ?? saved[id];
  ${code}
  ${pinCode}
  return { saveMix, pinPresetInSongs, state: () => ({ saved, savedArr, variantSaved }) };
`);
const desk = createDesk({ draft, arrDraft, variantDraft, enqueueMixSave: createSaveQueue(),
  fetchMixerAction: async (url, options) => {
    const wait = deferred(); requests.push({ ...wait, body: JSON.parse(options.body) });
    return wait.promise;
  },
});
const respond = (index, mix, arrangements = {}) => requests[index].resolve({
  ok: true, text: async () => JSON.stringify({ mix, arrangements }),
});
const first = desk.saveMix('a');
const second = desk.saveMix('b');
await tick();
assert.equal(requests.length, 1, 'different songs share a queue');
draft.a = { gain: 3 }; arrDraft.a = { bars: 8 }; variantDraft.a = { variant: 2 };
draft.b = { gain: 9 };
respond(0, { a: { gain: 1 }, b: { gain: 0 } }, { a: { bars: 4 } });
await first; await tick();
assert.equal(requests.length, 2);
assert.equal(requests[1].body.patch.mix.gain, 2, 'queued save captures click-time values');
assert.equal(draft.a.gain, 3); assert.equal(arrDraft.a.bars, 8); assert.equal(variantDraft.a.variant, 2);
respond(1, { a: { gain: 1 }, b: { gain: 2 } }); await second;
assert.equal(draft.b.gain, 9, 'new edits survive acknowledgements');

// A revert to the old baseline must still be sent after an earlier queued save.
draft.a = { gain: 4 }; const third = desk.saveMix('a');
draft.a = { gain: 1 }; const fourth = desk.saveMix('a');
await tick(); respond(2, { a: { gain: 4 }, b: { gain: 2 } }); await third; await tick();
assert.equal(requests[3].body.patch.mix.gain, 1);
respond(3, { a: { gain: 1 }, b: { gain: 2 } }); await fourth;
assert.equal(draft.a, undefined);
assert.equal(desk.state().saved.a.gain, 1);

// Transport rejection does not poison the queue or erase the pending draft.
draft.a = { gain: 5 }; const failed = desk.saveMix('a');
const rejection = assert.rejects(failed, /offline/);
draft.b = { gain: 6 }; const after = desk.saveMix('b');
await tick(); requests[4].reject(new Error('offline')); await rejection; await tick();
assert.equal(draft.a.gain, 5); assert.equal(requests.length, 6);
respond(5, { a: { gain: 1 }, b: { gain: 6 } }); await after;
assert.equal(draft.b, undefined);
console.log('MIXER SAVE QUEUE: PASSED');

// Preset pinning participates in the same queue and retains edits made in flight.
draft.a = { gain: 7 };
const normal = desk.saveMix('a');
const pin = desk.pinPresetInSongs('lead', { tone: 2 }, ['b']);
await tick(); assert.equal(requests.length, 7);
respond(6, { a: { gain: 7 }, b: { gain: 6 } }); await normal; await tick();
assert.equal(requests.length, 8);
assert.equal(requests[7].body.entries.b.voiceParams.leadVoice.tone, 2);
draft.b.gain = 10;
requests[7].resolve({ ok: true, text: async () => 'ok' }); await pin;
assert.equal(draft.b.gain, 10);
assert.equal(desk.state().saved.b.gain, 6, 'legacy acknowledgement uses immutable pin snapshot');
console.log('MIXER PRESET SAVE ORDER: PASSED');

// The browser-only Desk uses the same queue without a server. Its saved copy is
// the click-time value, while a later edit remains in the local draft.
const localDraft = { a: { gain: 1 } };
const localArr = { a: { bars: 4 } };
const localVariants = { a: { variant: 1 } };
const local = createDesk({ STATIC: true, draft: localDraft, arrDraft: localArr,
  variantDraft: localVariants, enqueueMixSave: createSaveQueue(),
  fetchMixerAction: () => { throw Error('static Desk must not fetch'); },
});
const keep = local.saveMix('a');
localDraft.a = { gain: 2 }; localArr.a = { bars: 8 }; localVariants.a = { variant: 2 };
await keep;
assert.deepEqual(local.state().saved.a, { gain: 1 });
assert.deepEqual(local.state().savedArr.a, { bars: 4 });
assert.deepEqual(local.state().variantSaved.a, { variant: 1 });
assert.deepEqual(localDraft.a, { gain: 2 });
assert.deepEqual(localArr.a, { bars: 8 });
assert.deepEqual(localVariants.a, { variant: 2 });
await local.saveMix('a');
assert.deepEqual(local.state().saved.a, { gain: 2 });
assert.equal(localDraft.a, undefined);
assert.equal(localArr.a, undefined);
assert.equal(localVariants.a, undefined);
console.log('MIXER BROWSER-ONLY SAVE: PASSED');
