/** Audible TNGR-2 regressions on the game's real OfflineAudioContext path. */
import assert from 'node:assert/strict';
import { openRenderer, SR } from '../tools/lib/render-bank-browser.js';

const bank = {
  bpm: 120,
  chordsVoice: 'tngrBurntHorizon',
  chords: [[110, 138.59, 164.81], ...Array(31).fill(null)],
};

const rms = (render, from, to) => {
  let sum = 0;
  let samples = 0;
  for (let i = Math.floor(from * SR); i < Math.min(render.outL.length, Math.floor(to * SR)); i++) {
    sum += render.outL[i] ** 2 + render.outR[i] ** 2;
    samples += 2;
  }
  return Math.sqrt(sum / Math.max(1, samples));
};

const renderer = await openRenderer();
try {
  const render = await renderer.render(bank, { repeat: 1, tail: 5, mix: null, trackId: null });
  const body = rms(render, 0.45, 0.9);
  const release = rms(render, 1.2, 2.2);
  const ended = rms(render, 4.5, 5.5);
  assert(body > 1e-5,
    `a three-note TNGR-2 pad chord sustains instead of collapsing to a 1 ms array gate (${body})`);
  assert(release > body * 0.01,
    `moving wavetable frames remain alive through the authored amp release (${release} vs ${body})`);
  assert(ended < release * 0.08,
    `the bounded final frame still stops after the release (${ended} vs ${release})`);
  console.log(`TNGR-2 AUDIO: PASSED (body ${body.toFixed(6)}, release ${release.toFixed(6)})`);
} finally {
  await renderer.close();
}
