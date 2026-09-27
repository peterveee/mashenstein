/**
 * MRDR-3 live layer controls reach notes already held by the AW core.
 *
 * Solo is a monitor operation, so it has to switch an active stack without restarting
 * its envelopes. WAVE edits arrive as a new patch and must update the active layer too.
 */
import { compileMrdr3 } from '../src/engine/mrdr3/compile.js';
import { Mrdr3Core } from '../src/engine/mrdr3/dsp.js';
import { mrdr3Tables } from '../src/engine/mrdr3/tables.js';

const RATE = 44100;
const FRAMES = RATE;
const tables = mrdr3Tables();
let failed = 0;
const assert = (condition, message) => {
  if (!condition) { failed++; console.log(`FAIL: ${message}`); }
  else console.log(`ok: ${message}`);
};

const voice = (type1 = 'square', type2 = 'sine') => ({
  id: 'live-control-check', synth: 'MRDR-3', mode: 'legato', portamento: 0.2,
  layer: {
    osc1: { type: type1, ratio: 1, gain: 0.6, attack: 0.01, sustain: 1, release: 0.2 },
    osc2: { type: type2, ratio: 2, gain: 0.6, attack: 0.01, sustain: 1, release: 0.2 },
  },
});

function makeCore(patch) {
  const core = new Mrdr3Core({ rate: RATE, maxGroups: 4, maxTones: 1 });
  core.installTables(tables);
  core.installPatch(patch);
  core.scheduleAll([{
    type: 'noteOn', frame: 0, eventId: 1, hz: [220], durFrames: RATE * 2, velocity: 1,
  }]);
  return core;
}

const processTo = (core, output, from, to) => {
  if (to > from) core.process(output, from, to - from, from);
};

function amplitude(samples, hz, fromSeconds, toSeconds) {
  const from = Math.floor(fromSeconds * RATE);
  const to = Math.floor(toSeconds * RATE);
  let re = 0; let im = 0;
  for (let i = from; i < to; i++) {
    const phase = 2 * Math.PI * hz * i / RATE;
    re += samples[i] * Math.cos(phase);
    im += samples[i] * Math.sin(phase);
  }
  return 2 * Math.hypot(re, im) / Math.max(1, to - from);
}

// Solo each oscillator on the same note. The transition has a 6ms click-safe fade.
{
  const { patch } = compileMrdr3(voice());
  const core = makeCore(patch);
  const output = [new Float32Array(FRAMES)];
  const firstSolo = Math.round(0.3 * RATE);
  const secondSolo = Math.round(0.6 * RATE);
  const clearSolo = Math.round(0.8 * RATE);
  processTo(core, output, 0, firstSolo);
  core.setLayerSolo(['osc2'], firstSolo);
  processTo(core, output, firstSolo, secondSolo);
  let low = amplitude(output[0], 220, 0.4, 0.5);
  let high = amplitude(output[0], 440, 0.4, 0.5);
  assert(high > 0.01 && low < high * 0.05,
    `live osc 2 solo suppresses osc 1 (${low.toExponential(1)} / ${high.toExponential(1)})`);
  core.setLayerSolo(['osc1'], secondSolo);
  processTo(core, output, secondSolo, clearSolo);
  low = amplitude(output[0], 220, 0.7, 0.8);
  high = amplitude(output[0], 440, 0.7, 0.8);
  assert(low > 0.01 && high < low * 0.05,
    `live osc 1 solo suppresses osc 2 (${low.toExponential(1)} / ${high.toExponential(1)})`);
  core.setLayerSolo([], clearSolo);
  processTo(core, output, clearSolo, FRAMES);
  low = amplitude(output[0], 220, 0.9, 1.0);
  high = amplitude(output[0], 440, 0.9, 1.0);
  assert(low > 0.01 && high > 0.01, 'clearing solo restores both active oscillators');
}

// The active note must adopt the new wave without a new note-on or envelope restart.
{
  const { patch: square } = compileMrdr3(voice('square', 'sine'));
  const { patch: sine } = compileMrdr3(voice('sine', 'sine'));
  const edited = makeCore(square);
  const reference = makeCore(sine);
  const output = [new Float32Array(FRAMES)];
  const expected = [new Float32Array(FRAMES)];
  const editAt = Math.round(0.3 * RATE);
  processTo(edited, output, 0, editAt);
  processTo(reference, expected, 0, FRAMES);
  edited.installPatch(sine);
  processTo(edited, output, editAt, FRAMES);
  let error = 0; let energy = 0; let count = 0;
  for (let i = Math.floor(0.4 * RATE); i < Math.floor(0.6 * RATE); i++) {
    error += (output[0][i] - expected[0][i]) ** 2;
    energy += expected[0][i] ** 2;
    count++;
  }
  const relativeError = Math.sqrt(error / Math.max(1, count))
    / Math.max(1e-9, Math.sqrt(energy / Math.max(1, count)));
  assert(relativeError < 0.08,
    `live waveform edit matches the same note rendered with the new wave (${relativeError.toFixed(3)})`);
}

console.log(failed ? `\nMRDR-3 LIVE CONTROLS: ${failed} FAILED` : '\nMRDR-3 LIVE CONTROLS: PASSED');
process.exit(failed ? 1 : 0);
