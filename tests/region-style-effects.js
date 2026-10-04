import assert from 'node:assert/strict';
import { regionStyleEffects } from '../tools/lib/region-style-effects.js';
import { sectionEffectPreset } from '../tools/lib/banger/section-effects.js';
import { SECTION_EFFECTS } from '../src/engine/effects.js';

const options = regionStyleEffects();
assert.deepEqual(options.find(p => p.id === 'generic:stack').chain, sectionEffectPreset('stack', true), 'region editor shares the generator arp-layer settings');
assert.ok(options.some(p => p.id.startsWith('style:big-room:')), 'saved style effects are available');
const allowed = new Map(SECTION_EFFECTS.map(e => [e.id, e]));
for (const p of options) {
  assert.ok(p.chain.length && p.chain.every(e => allowed.has(e.id)));
  for (const e of p.chain) assert.ok(Object.keys(e.params || {}).every(key => allowed.get(e.id).params.includes(key)), `${p.label} uses supported parameters`);
}
const chain = [{ id: 'pingpong', params: { sync: 1, division: 0.5, wet: 0.3 } }];
const channels = { custom: { sectionFx: { version: 1, rules: [
  { role: 'hook', section: 'intro', chain },
  { role: 'arp', section: 'drop', chain: [{ params: { wet: 0.3, division: 0.5, sync: 1 }, id: 'pingpong' }] },
  { role: 'pad', section: 'drop', chain: [{ id: 'unsupported' }] },
] } } };
const catalog = regionStyleEffects(channels, [{ id: 'custom', label: 'My Style' }]);
const saved = catalog.filter(p => p.id.startsWith('style:'));
assert.equal(saved.length, 1, 'repeated sections do not duplicate the same style chain');
assert.ok(saved[0].label.startsWith('My Style'));
assert.equal(saved[0].from, undefined, 'source timing does not constrain region placement');
saved[0].chain[0].params.wet = 0.8;
assert.equal(chain[0].params.wet, 0.3, 'editing the region cannot mutate its style');
console.log('REGION STYLE EFFECTS: passed (shared presets, saved styles, deduplication and independent copies)');
