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

// THE WORKLET's synced slave with a pitch envelope. The bend moves the slave/master RATIO
// — a crossfade through a grid of sync tables on mrdr3SyncBendKnots, the same plan the
// native path builds — and leaves the note's fundamental at Osc 1's pitch. The core once
// ran a per-sample reset whose master was derived from the slave's bent frequency, which
// bent the whole note an octave and held the timbre still: 412 Hz on a 220 Hz note at
// 10 ms. work/local/_sync-bend-compare.mjs measures native against worklet in Chromium.
{
  const { compileMrdr3 } = await import('../src/engine/mrdr3/compile.js');
  const { renderMrdr3, frameAt } = await import('../src/engine/mrdr3/dsp.js');
  const { mrdr3Tables } = await import('../src/engine/mrdr3/tables.js');
  const v = structuredClone(VOICES.syncRazorLead);
  delete v.global; delete v.drive; delete v.tone;
  v.portamento = 0;
  v.layer.osc1.gain = 0.0001;      // the master inaudible, so the slave is what is heard
  Object.assign(v.layer.osc2, { attack: 0.001, decay: 0, sustain: 1 });
  const rate = 44100;
  const hz = 220;
  const x = renderMrdr3({
    sampleRate: rate, seconds: 0.4, channels: 1, tables: mrdr3Tables([]),
    patch: compileMrdr3(v).patch,
    events: [{ type: 'noteOn', frame: 0, eventId: 1, hz, durFrames: frameAt(0.35, rate), velocity: 1 }],
  }).channels[0];
  const pitchAt = (t) => {
    const s = Math.round(t * rate);
    let best = 0;
    let lag0 = 0;
    for (let lag = 30; lag < 1100; lag++) {
      let c = 0; let e1 = 0; let e2 = 0;
      for (let i = 0; i < 1024; i++) {
        const a = x[s + i]; const b = x[s + i + lag];
        c += a * b; e1 += a * a; e2 += b * b;
      }
      const r = c / Math.sqrt(e1 * e2 + 1e-12);
      if (r > best + 0.02) { best = r; lag0 = lag; }
    }
    return rate / lag0;
  };
  for (const t of [0.01, 0.08, 0.15]) {
    const p = pitchAt(t);
    assert(Math.abs(1200 * Math.log2(p / hz)) < 30,
      `the synced note stays at its pitch while the slave bends (t=${t}: ${p.toFixed(1)} Hz)`);
  }
  ok('a worklet slave pitch envelope sweeps the sync ratio, not the note');
}
