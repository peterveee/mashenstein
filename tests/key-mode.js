/**
 * KEY MODE is a three-way musical control, not a boolean with a glide side effect.
 * Keep this browserless: the renderer suites cover the audio graph, while this pins the
 * saved vocabulary and the two distinct envelope paths in the source.
 */
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { panelSpec } from '../tools/mixer-voice-editor.js';

const row = panelSpec({ synth: 'MonoSynth' }).common.rows.find((r) => r.path === '$mode');
assert(row, 'the synth note card exposes KEY MODE');
assert.deepEqual(row.options, ['poly', 'legato', 'mono'],
  'KEY MODE offers POLY, LEGATO and MONO in that order');
assert.equal(panelSpec({ synth: 'MonoSynth' }).pillLabels.legato, 'LEGATO',
  'the LEGATO pill spells out the full mode name');

const mrdrRows = panelSpec({ synth: 'MRDR-3', layer: { osc1: { unison: 1 } } }).common.rows;
const rowFor = (path) => mrdrRows.find((r) => r.path === path);
assert.equal(rowFor('$vibrato.delay').when({ synth: 'MRDR-3', vibrato: { depth: 1 } }), true,
  'native vibrato delay follows the vibrato depth switch');
assert.equal(rowFor('$vibrato.spread').when({
  synth: 'MRDR-3', layer: { osc1: { unison: 1 } }, vibrato: { depth: 1 },
}), false, 'spread stays hidden when there is only one unison voice');
assert.equal(rowFor('$vibrato.spread').when({
  synth: 'MRDR-3', layer: { osc1: { unison: 2 } }, vibrato: { depth: 1 },
}), true, 'spread appears when unison gives it voices to separate');
assert.equal(row.read({ mono: true }), 'mono', 'old boolean presets still open as MONO');

const source = readFileSync(new URL('../src/engine/voices.js', import.meta.url), 'utf8');
assert(source.includes("const legato = mode === 'legato';"),
  'the engine has a distinct LEGATO path');
assert(source.includes("if (mode === 'mono' && prev && prev.stopAt > time)"),
  'MONO still chokes an overlapping old note');
assert(source.includes('slot.activeUntil') && source.includes('slot.synth.setNote'),
  'LEGATO keeps the pooled envelope and retargets its pitch');
assert(source.includes('_retargetLayerLegato'),
  'MRDR-3 has a native legato handoff rather than stacking a second note');

console.log('KEY MODE: PASSED');
