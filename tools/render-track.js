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
// Usage: node tools/render-track.js [trackId] [repeats] [outPath] [--normalise]
// e.g.:  node tools/render-track.js plumber 2 work/tracks/plumber-panic.wav
import { writeFileSync } from 'fs';
import { renderBankBrowser } from './lib/render-bank-browser.js';
import { wavBuffer, rmsOf, dbfs } from './lib/wav.js';
import { resolveOrExit } from './lib/tracks.js';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const NORMALISE = process.argv.includes('--normalise');
const [trackId = 'plumber', repeatArg = '2', outArg = null] = args;
const REPEAT = Math.max(1, parseInt(repeatArg, 10) || 2);
const track = resolveOrExit(trackId);
const OUT = outArg || `work/tracks/${track.slug}.wav`;

const { outL, outR, seconds, blocks, peak } = await renderBankBrowser(track.bank, {
  repeat: REPEAT, trackId: track.id,
});
const gain = NORMALISE && peak > 0 ? 0.9 / peak : 1;
writeFileSync(OUT, wavBuffer([outL, outR], gain));
console.log(`${OUT}: ${seconds.toFixed(1)}s, peak ${dbfs(peak * gain)}, `
  + `rms ~${rmsOf(outL, gain).toFixed(3)}, ${REPEAT}x form (${blocks * 2} bars)`
  + (NORMALISE ? `  [normalised, ${(20 * Math.log10(gain)).toFixed(1)} dB applied]` : '')
  + (!NORMALISE && peak > 1 ? '  ** CLIPS — fix it on the desk, not here **' : ''));
