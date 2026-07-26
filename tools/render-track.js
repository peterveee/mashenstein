// Offline WAV render of a music bank. The DSP lives in tools/lib/render-bank.js
// (shared with render-stems.js) so a stem and the mix it came from can never
// drift; this file is just the CLI around it.
// Usage: node tools/render-track.js [trackId|hub|title|finale|megamix|shop|shop-candidate-id] [repeats] [outPath]
// e.g.:  node tools/render-track.js plumber 2 dist/plumber-panic.wav
import { writeFileSync } from 'fs';
import { renderBank, wavBuffer, rmsOf } from './lib/render-bank.js';
import { resolveOrExit } from './lib/tracks.js';

const [, , trackId = 'plumber', repeatArg = '2', outArg = null] = process.argv;
const REPEAT = Math.max(1, parseInt(repeatArg, 10) || 2);
const track = resolveOrExit(trackId);
const OUT = outArg || `dist/${track.slug}.wav`;

const { out, seconds, blocks, peak } = renderBank(track.bank, { repeat: REPEAT });
const norm = peak > 0 ? 0.9 / peak : 1; // normalize to -1 dBFS-ish either direction
writeFileSync(OUT, wavBuffer(out, norm));
console.log(`${OUT}: ${seconds.toFixed(1)}s, peak ${peak.toFixed(3)}, rms ~${rmsOf(out).toFixed(3)}, ${REPEAT}x form (${blocks * 2} bars)`);
