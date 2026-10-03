// MAKE A BANGER IN THE GAME — the spike. 3 Oct 2026.
//
// One question before any UI is built: can a phone make a banger and play it? This
// takes a fixed two-bar riff (the shape a jukebox piano roll would hand over), runs it
// through every style with the desk's own generator, and opens the jukebox with the
// results appended. Each row's title carries how long its generation took ON THIS
// DEVICE; a double tap on the visualiser puts up the audio-health readout.
//
// DEV MENU ONLY, and a spike: it pulls tools/lib/banger into the game bundle (about
// 390KB minified on top of what the game already ships). If the feature goes ahead, the
// generator moves under src/ and this file goes.
import { generateBanger } from '../../tools/lib/banger/index.js';
import { BANGER_STYLES } from '../../tools/lib/banger/styles/index.js';

/** Two bars of eighth-note-ish melody on one lane: what a simple piano roll would write. */
export const SPIKE_RIFF = Object.freeze({
  version: 1, source: { id: 'jukebox', title: 'MY RIFF', from: 0, to: 1, bpm: 120 }, bars: 2, grid: 16, stats: {},
  parts: [{
    key: 'lead', label: 'Lead', kind: 'melodic', role: 'hook', meanPitch: 70,
    voice: 'toneSquare', voiceParams: null, engineKeys: null, strip: null,
    bars: [
      'A4:2 . C5:2 . E5:2 . A4:2 . G4:4 . . . E4:2 . G4:2 .',
      'F4:2 . A4:2 . C5:4 . . . B4:2 . A4:2 . G4:4 . . .',
    ],
  }],
});

/** One jukebox row per style, each made fresh. Also logged, for a tethered device. */
export function spikeBangers(seed = 7) {
  const rows = [];
  for (const style of BANGER_STYLES) {
    const t0 = performance.now();
    const out = generateBanger({ riff: SPIKE_RIFF, options: { style: style.id }, seed });
    const ms = Math.round(performance.now() - t0);
    console.log(`[banger spike] ${style.id}: ${ms} ms`);
    rows.push({ name: `BANGER ${style.label.toUpperCase()} ${ms}MS`, bank: out.bank, mix: out.mix, arrangement: out.arrangement });
  }
  return rows;
}
