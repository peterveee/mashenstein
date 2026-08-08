import assert from 'node:assert/strict';
import { hardSyncTable } from '../src/engine/voices.js';
import { VOICES } from '../src/data/voices.js';
import { panelSpec } from '../tools/mixer-voice-editor.js';

const ok = (message) => console.log(`ok: ${message}`);
const ctx = {
  createPeriodicWave(real, imag, options) {
    return { real: [...real], imag: [...imag], options };
  },
};

const octave = hardSyncTable(ctx, 'sine', 2);
assert(Math.abs(octave.imag[2]) > 0.98 && Math.abs(octave.imag[1]) < 0.01,
  'an integer 2:1 reset should collapse to the slave at the second harmonic');
ok('an integer-ratio slave lands on the expected master harmonic');

const torn = hardSyncTable(ctx, 'sawtooth', 2.37);
const audibleBins = torn.real.slice(1).filter((x) => Math.abs(x) > 0.02).length
  + torn.imag.slice(1).filter((x) => Math.abs(x) > 0.02).length;
assert(audibleBins > 6,
  'a non-integer hard reset should spread energy across several master harmonics');
assert.equal(hardSyncTable(ctx, 'sawtooth', 2.37), torn,
  'the same authored sync shape should reuse its context-local table');
ok('non-integer hard sync creates and caches the reset spectrum');

const syncPresets = Object.values(VOICES).filter((v) => v.id?.startsWith('sync'));
assert.equal(syncPresets.length, 5, 'the library should carry five sync demonstrations');
assert.deepEqual(new Set(syncPresets.map((v) => v.sync)), new Set(['1+2', '1+3', '1+2+3']),
  'the demonstrations should cover every active routing mode');
assert(syncPresets.every((v) => v.level > 0 && v.peak > 0 && v.peak !== 1),
  'every sync preset should carry offline-measured level and peak data');
ok('five calibrated presets cover every active oscillator-sync routing');
assert.equal(VOICES.syncRazorLead.layer.osc2.pitch.semitones, 12,
  'the lead demonstration uses a real synced-slave pitch envelope');
ok('a factory preset demonstrates an animated synced-slave pitch envelope');

const syncPanel = panelSpec({ synth: 'MRDR-3', sync: '1+2', layer: { osc1: {}, osc2: {} } });
const pitch = syncPanel.groups.find((g) => g.key === 'osc2.pitch');
assert(pitch?.when?.({ synth: 'MRDR-3', sync: '1+2', layer: { osc1: {}, osc2: {} } }),
  'a synced slave keeps its Pitch Env card available');
ok('synced slaves retain Pitch Env for animated ratio sweeps');
