// Offline WAV render of a music bank, through THE GAME'S OWN ENGINE.
//
// This used to render tools/lib/render-bank.js, a hand-written JS mirror of the
// engine. The mirror generated naive waveforms where Web Audio's are band-limited,
// so every audition ever made from it was brighter and grittier than the game — and
// it knew nothing about src/data/mix.js, so it ignored the mix entirely. It now runs
// src/engine/audio.js in headless Chromium instead: what you hear is the game.
//
// Written at unity by default, not peak-normalised: the mix is the point, and
// normalising quietly undoes the trims the desk was used to set. Pass --normalise
// for the old behaviour when you need a loud reference file.
//
// A song that names its own start bar and loop (`arrangement.loop`) is rendered the way
// the game hears it: in at the start bar, the bars before the loop once, then `repeats`
// passes of the loop. `--no-loop` bounces the whole form instead, which is what every
// render did before those markers existed and what a reference render still wants.
//
// Usage: node tools/render-track.js [trackId] [repeats] [outPath] [--normalise] [--no-loop]
// e.g.:  node tools/render-track.js plumber 2 work/tracks/plumber-panic.wav
import { writeFileSync } from 'fs';
import { renderBankBrowser } from './lib/render-bank-browser.js';
import { wavBuffer, rmsOf, dbfs } from './lib/wav.js';
import { resolveOrExit } from './lib/tracks.js';
import { ARRANGEMENTS } from '../src/data/arrangements.js';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const NORMALISE = process.argv.includes('--normalise');
const SONG_LOOP = !process.argv.includes('--no-loop');
const [trackId = 'plumber', repeatArg = '2', outArg = null] = args;
const REPEAT = Math.max(1, parseInt(repeatArg, 10) || 2);
const track = resolveOrExit(trackId);
const OUT = outArg || `work/tracks/${track.slug}.wav`;

// The gap this render inherits and cannot close on its own: an offline render applies
// the arrangement's TEMPO but not its ORDER, so bar 8 here is bar 8 of the song as
// COMPOSED. For a song whose desk order differs, that is not the bar the game loops.
// Said out loud rather than rendered quietly wrong.
const arr = ARRANGEMENTS[track.id];
if (SONG_LOOP && arr?.loop && arr.order) {
  console.warn(`  ** ${track.id} has both a game loop and an arranged order. An offline render`);
  console.warn('     plays the COMPOSED order, so those bar numbers may not be the bars the');
  console.warn('     game loops. Use --no-loop for a straight bounce of the form.');
}

const { outL, outR, seconds, blocks, peak, loop } = await renderBankBrowser(track.bank, {
  repeat: REPEAT, trackId: track.id, songLoop: SONG_LOOP,
});
const gain = NORMALISE && peak > 0 ? 0.9 / peak : 1;
writeFileSync(OUT, wavBuffer([outL, outR], gain));
const shape = loop?.loop
  ? `in on bar ${loop.start / 16 + 1}, then ${REPEAT} × bars ${loop.loop.start / 16 + 1}-${loop.loop.end / 16}`
  : loop
    ? `from bar ${loop.start / 16 + 1} (${blocks * 2} bars)`
    : `${REPEAT}x form (${blocks * 2} bars)`;
console.log(`${OUT}: ${seconds.toFixed(1)}s, peak ${dbfs(peak * gain)}, `
  + `rms ~${rmsOf(outL, gain).toFixed(3)}, ${shape}`
  + (NORMALISE ? `  [normalised, ${(20 * Math.log10(gain)).toFixed(1)} dB applied]` : '')
  + (!NORMALISE && peak > 1 ? '  ** CLIPS — fix it on the desk, not here **' : ''));
