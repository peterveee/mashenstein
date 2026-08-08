/** The MRDR-3 modulation LFO supports deterministic stepped random modulation. */
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { panelSpec } from '../tools/mixer-voice-editor.js';
import { VOICES } from '../src/data/voices.js';

const voice = { synth: 'MRDR-3', layer: { osc1: {} } };
const rows = panelSpec(voice).groups.find((g) => g.title === 'Mod LFO').rows;
const wave = rows.find((r) => r.path === '$layer.lfo.type');
const target = rows.find((r) => r.path === '$layer.lfo.target');
const sync = rows.find((r) => r.path === '$layer.lfo.sync');
const division = rows.find((r) => r.path === '$layer.lfo.division');
assert(wave.options.includes('samplehold'), 'MRDR Mod LFO offers sample-and-hold');
assert(target.options.includes('pitch'), 'MRDR Mod LFO can target pitch');
assert.deepEqual(sync.options, ['free', 'tempo'], 'MRDR Mod LFO offers free and tempo timing');
assert.deepEqual(division.options, ['1/64', '1/32', '1/16', '1/8', '1/4', '1/2'],
  'ordinary tempo LFOs retain the six fast divisions');
const sampleHoldTempo = { synth: 'MRDR-3', layer: { osc1: {}, lfo: { type: 'samplehold', depth: 1, sync: 'tempo' } } };
assert.deepEqual(division.optionsFor(sampleHoldTempo), ['1/64', '1/32', '1/16', '1/8', '1/4'],
  'S&H tempo LFOs omit the two-beat division');
for (const type of ['sine', 'square', 'sawtooth', 'triangle', 'samplehold']) {
  const tempoVoice = { synth: 'MRDR-3', layer: { osc1: {}, lfo: { type, depth: 1, sync: 'tempo' } } };
  const tempoRows = panelSpec(tempoVoice).groups.find((g) => g.title === 'Mod LFO').rows;
  assert(tempoRows.some((r) => r.path === '$layer.lfo.division' && r.when?.(tempoVoice)),
    `tempo sync exposes DIV for ${type}`);
  assert(!tempoRows.some((r) => r.path === '$layer.lfo.rate' && r.when?.(tempoVoice)),
    `tempo sync hides free RATE for ${type}`);
}
assert.equal(panelSpec(voice).pillLabels.samplehold, 'S&H', 'sample-and-hold has a compact pill label');
assert.equal(panelSpec(voice).pillLabels.pitch, 'PITCH', 'pitch has a clear compact pill label');
assert.equal(panelSpec(voice).pillLabels.tempo, 'TEMPO', 'tempo sync has a clear compact pill label');
const rate = rows.find((r) => r.path === '$layer.lfo.rate');
assert.equal(rate.scale({ layer: { lfo: { type: 'samplehold' } } }), 3,
  'sample-and-hold rate uses a cubic low-end taper');
assert.equal(rate.scale({ layer: { lfo: { type: 'sine' } } }), 1,
  'ordinary LFO rates keep their linear response');

const source = readFileSync(new URL('../src/engine/voices.js', import.meta.url), 'utf8');
assert(source.includes("lfoSpec.type === 'samplehold'"), 'the engine selects the S&H path');
assert(source.includes("'1/64': 0.25") && source.includes("'1/32': 0.5"),
  'S&H tempo divisions map 64th and 32nd notes to the sixteenth clock');
assert(source.includes('ctx.createConstantSource()'), 'S&H uses a native constant source');
assert(source.includes('lfoOsc.offset.setValueAtTime(hitRandom'),
  'S&H samples deterministic values at held-rate boundaries');
assert(source.includes('const LFO_FILTER_CENTS = 3600'),
  'the routable filter LFO has a clearly audible three-octave-per-side range');
assert(source.includes("const amount = lfoSpec.target === 'filter' ? depth * LFO_FILTER_CENTS")
  && source.includes(": lfoSpec.target === 'pitch' ? depth * LFO_PITCH_CENTS : depth;"),
  'filter and level LFO destinations receive the normalized depth');
assert(source.includes("lfoSpec.target === 'pitch' ? depth * LFO_PITCH_CENTS"),
  'pitch LFO depth is converted to cents');
assert(source.includes("lfoSpec?.target === 'pitch'"),
  'pitch LFO reaches every oscillator detune destination');
assert(source.includes('linearRampToValueAtTime(next, at + slew)'),
  'sample-and-hold transitions are smoothed instead of jumping');
assert(source.includes('1 / (spb * tempoSteps)'),
  'tempo-synced LFOs derive their rate from the active sixteenth clock');
assert(source.includes('trem.gain.setValueAtTime(1, t)'),
  'the level LFO is centered at unity for bipolar tremolo');

const sampleHoldPresets = [
  'bestSampleHoldCircuit', 'bestSampleHoldPulse', 'bestSampleHoldOrbit',
  'bestSampleHoldBass', 'bestSampleHoldVox',
];
for (const id of sampleHoldPresets) {
  const preset = VOICES[id];
  assert(preset, `${id} is registered`);
  assert.equal(preset.synth, 'MRDR-3', `${id} targets MRDR-3`);
  assert.equal(preset.layer.lfo.type, 'samplehold', `${id} uses S&H`);
  assert(preset.layer.lfo.depth > 0, `${id} has audible S&H depth`);
}

console.log('MRDR LFO: PASSED');
