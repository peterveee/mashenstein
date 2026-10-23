import assert from 'node:assert/strict';
import { VOICES, VOICE_LANES, voicesFor, isKitVoice, registerSongVoice } from '../src/data/voices.js';
import { PRESET_TAXONOMY, presetClassification } from '../src/data/preset-browsing.js';
import { FACTORY_PRESET_BROWSING } from '../src/data/preset-browsing-catalog.js';
import { emptyPresetFilters, presetBrowserModel, presetEngine } from '../tools/lib/preset-browser-model.js';
import { emitEntry } from '../tools/lib/voices-source.js';
import { registerPresetWindow, bringPresetWindowToFront } from '../tools/lib/preset-window-stack.js';

const before = JSON.stringify(VOICES);
const all = Object.values(VOICES);
for (const voice of all) {
  const classification = presetClassification(voice);
  assert.ok(PRESET_TAXONOMY[classification.category]?.includes(classification.subcategory), voice.id);
  assert.ok(presetEngine(voice) && presetEngine(voice) !== 'Unknown', voice.id);
  if (voice.factory && !voice.starter) assert.ok(FACTORY_PRESET_BROWSING[voice.id], `File new factory preset: ${voice.id}`);
}
for (const id of Object.keys(FACTORY_PRESET_BROWSING)) assert.ok(VOICES[id], `Stale filing: ${id}`);
for (const lane of Object.keys(VOICE_LANES)) {
  const offered = voicesFor(lane);
  const model = presetBrowserModel(offered, emptyPresetFilters());
  assert.deepEqual(new Set(model.results.map((r) => r.voice.id)), new Set(offered.map((v) => v.id)));
  for (const category of model.facets.category.slice(1)) {
    const filtered = presetBrowserModel(offered, { category: category.value });
    assert.equal(filtered.results.length, category.count);
    assert.ok(filtered.results.every((r) => r.category === category.value));
  }
}
assert.equal(JSON.stringify(VOICES), before, 'Browsing cannot mutate playback data');
assert.deepEqual(presetClassification(VOICES.mrdrSaxophone), { category: 'Winds', subcategory: 'Saxophone' });
assert.deepEqual(presetClassification(VOICES.mrdrFunkGuitarMuted), { category: 'Guitars', subcategory: 'Muted' });
assert.deepEqual(presetClassification(VOICES.mrdrGrand), { category: 'Keys', subcategory: 'Piano' });
assert.equal(presetEngine(VOICES.dsKick), 'KLNG-8');
assert.equal(presetEngine(VOICES.engSquare), 'Built-in');

const filtered = presetBrowserModel(all, { category: 'Keys', subcategory: 'Electric Piano', engine: 'RMND-7' });
assert.ok(filtered.results.length > 1);
assert.ok(filtered.results.every((r) => r.engine === 'RMND-7' && r.subcategory === 'Electric Piano'));
const impossible = presetBrowserModel(all, filtered.filters, 'no-such-preset-qwerty');
assert.equal(impossible.results.length, 0);
assert.deepEqual(impossible.filters, filtered.filters, 'Search must not broaden selected filters');
assert.equal(impossible.facets.engine.find((o) => o.value === 'RMND-7').count, 0);
const change = presetBrowserModel(all, { ...filtered.filters, category: 'Guitars' }, '', { reconcile: true });
assert.equal(change.filters.subcategory, 'all');
assert.equal(change.filters.engine, 'RMND-7', 'Retain a still-valid engine');
const incompatible = presetBrowserModel(all, { ...filtered.filters, category: 'Drums & Percussion', subcategory: 'Kick' }, '', { reconcile: true });
assert.equal(incompatible.filters.engine, 'all');
assert.equal(incompatible.filters.subcategory, 'Kick');
const search = presetBrowserModel(all, {}, 'winds saxophone MRDR-3');
assert.ok(search.results.some((r) => r.voice.id === 'mrdrSaxophone'));
assert.equal(presetBrowserModel([], {}).results.length, 0);

// New user metadata overrides a factory/source identity and survives source and song saves.
const custom = { ...VOICES.mrdrGrand, browse: { category: 'Pads', subcategory: 'Warm' } };
assert.deepEqual(presetClassification(custom), custom.browse);
const source = emitEntry('testBrowse', custom);
const roundTrip = Function(`return ({${source}}).testBrowse`)();
assert.deepEqual(roundTrip.browse, custom.browse);
assert.equal(roundTrip.category, custom.category, 'Filing never changes playback category');
const songId = registerSongVoice('leadVoice', 'preset-browser-test', { ...custom, label: 'My renamed sound' });
assert.deepEqual(presetClassification(VOICES[songId]), custom.browse);
delete VOICES[songId];
const oldSongId = registerSongVoice('leadVoice', 'preset-browser-old-test', {
  ...VOICES.mrdrFunkGuitarMuted, id: undefined, browse: undefined,
});
assert.deepEqual(presetClassification(VOICES[oldSongId]), { category: 'Guitars', subcategory: 'Muted' });
delete VOICES[oldSongId];
const drum = VOICES.syn3PewDeep;
assert.equal(presetClassification(drum).category, 'Effects');
assert.ok(isKitVoice(drum), 'An Effects filing must not change percussion compatibility');
// A third open window must not restore DOM order behind the front one. Repeated
// activation stays below modal dialogs, and registering after a repaint is idempotent.
const peers = [];
const ownerDocument = { querySelectorAll: () => peers };
const makeWindow = () => {
  const events = {};
  const el = { ownerDocument, dataset: {}, style: {}, events,
    addEventListener: (name, listener) => { assert.ok(!events[name]); events[name] = listener; } };
  peers.push(el); registerPresetWindow(el); registerPresetWindow(el); return el;
};
const library = makeWindow(), selector = makeWindow(), advanced = makeWindow();
bringPresetWindowToFront(library);
bringPresetWindowToFront(selector);
advanced.events.pointerdown();
assert.ok(+advanced.style.zIndex > +selector.style.zIndex);
assert.ok(+selector.style.zIndex > +library.style.zIndex);
selector.events.pointerdown();
assert.ok(+selector.style.zIndex > +advanced.style.zIndex);
for (let i = 0; i < 50; i++) { advanced.events.focusin(); library.events.pointerdown(); }
assert.ok(peers.every((el) => +el.style.zIndex < 71 && +el.style.zIndex > 60));
// Library names are plain words (Peter, 24 Oct 2026): no `·` or dash separators, no `NEW`
// tag, and no two presets under one name. A leading `=` is a marker, not a separator.
const presets = all.filter((v) => !v.songLocal);
const separated = presets.filter((v) => /·| [—–-] |^NEW\b/.test(v.label || '')).map((v) => `${v.id} "${v.label}"`);
assert.deepEqual(separated, [], 'preset names carry no separators');
const named = new Map();
for (const v of presets) {
  const key = String(v.label || '').toLowerCase();
  assert.ok(!named.has(key), `"${v.label}" names both ${named.get(key)} and ${v.id}`);
  named.set(key, v.id);
}

console.log(`PRESET BROWSER: PASSED (${all.length} presets; filtering, compatibility, and save round-trips)`);
