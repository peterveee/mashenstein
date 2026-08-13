// The detector against real music, with the answer known in advance.
//
// tests/beat-detect.js proves the algorithm's properties on synthetic drums, which
// is necessary and not sufficient: a synthetic fixture can be tuned until it
// passes, and the constants in tools/lib/beat-detect.js were chosen against real
// mixes. This suite renders the game's own songs through the real engine and
// checks that the tempo comes back out — bpmOf() is ground truth, so there is
// nothing to argue about.
//
// A browser suite because renderBankBrowser runs the engine under an
// OfflineAudioContext in headless Chromium. Excluded from the default `npm test`
// for that reason; run with `npm run test:all` or `npm run test:sound`.
import assert from 'node:assert/strict';
import { openRenderer } from '../tools/lib/render-bank-browser.js';
import { resolveOrExit } from '../tools/lib/tracks.js';
import { bpmOf } from '../src/data/arrangements.js';
import { detectRhythm } from '../tools/lib/beat-detect.js';
import { prepareSong, analyseSong } from '../tools/lib/song-analysis.js';

const ok = (message) => console.log(`ok: ${message}`);

// Full-length songs, deliberately: the cabinet jingles are six seconds long and a
// tempo fit over a dozen beats is imprecise for reasons that have nothing to do
// with the algorithm. The page's subject is a three-minute file.
const TRACKS = ['hub', 'shop', 'megamix', 'speed'];

const renderer = await openRenderer({ headless: true });
let failed = false;
try {
  for (const id of TRACKS) {
    const track = resolveOrExit(id);
    const truth = bpmOf(track.bank, track.id);
    const { outL, outR } = await renderer.render(track.bank, {
      repeat: 1, trackId: track.id, songLoop: true,
    });
    const prep = prepareSong({ channels: [outL, outR], sampleRate: 44100 });
    const r = detectRhythm(prep.mono, 44100);

    const err = Math.abs(r.bpm - truth);
    const note = `${track.title} (${truth} BPM) -> ${r.bpm.toFixed(2)}, `
      + `${(err / truth * 100).toFixed(2)}% out, grid match ${(r.confidence * 100).toFixed(0)}%, `
      + `${r.percussionAt.length} hits`;
    if (err > 1) {
      const octave = Math.abs(Math.log2(r.bpm / truth));
      console.error(`FAIL: ${note}${Math.abs(octave - 1) < 0.15 ? ' — an OCTAVE error' : ''}`);
      failed = true;
      continue;
    }
    ok(note);

    // A tempo that is right at the start and wrong at the end is worse than
    // useless, so check the grid where drift would have shown by now.
    const seconds = outL.length / 44100;
    const late = seconds - 5;
    const beatsApart = Math.abs(r.beatAt(late) - r.beatAt(late - 60)) - 60 * (truth / 60);
    assert.ok(Math.abs(beatsApart) < 1.5,
      `${track.title}: the grid slipped ${beatsApart.toFixed(2)} beats over the last minute`);

    // And the whole point: the analysis these feed must come out sane rather than
    // pinned or dead.
    const frames = analyseSong(prep.mono, r.bpm, r.percussionAt, {
      fps: 60, frames: Math.ceil(seconds * 60), sampleRate: 44100,
      gain: prep.gain, beatAt: r.beatAt,
    });
    const mean = (key) => frames.reduce((a, f) => a + f[key], 0) / frames.length;
    for (const key of ['bass', 'mid', 'treble', 'dynamics']) {
      const value = mean(key);
      assert.ok(value > 0.02 && value < 0.995,
        `${track.title}: mean ${key} is ${value.toFixed(3)} — pinned or dead, not a signal`);
    }
    assert.ok(frames.some((f) => f.hit === 1), `${track.title}: no onsets reached the table`);
  }
} finally {
  await renderer.close();
}

if (failed) process.exit(1);
console.log('beat-detect-audio: all checks passed');
