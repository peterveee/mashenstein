// FZPP-6 against MRDR-3, in Node: the same note stream through both JS cores, in one
// process, round-robin. Gate A's numbers — compute, not live audio-thread load (Gate B
// measures that, through tools/audio-audit.js in WebKit and Chrome).
//
//   node tools/bench-fzpp6.js
//
// ms of render per audio second (10 ms/s ≈ 1% of a core). Best of REPS after three
// discarded warm-ups, median beside it as the noise readout. The first row runs one
// FZPP-6 case against itself: if that pair does not read ~1.00x, the harness is lying.
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { renderFzpp6 } from '../src/engine/fzpp6/dsp.js';
import { compileFzpp6 } from '../src/engine/fzpp6/tables.js';
import { FZPP6_CANDIDATES } from './lib/fzpp6-candidates.js';
import { VOICES } from '../src/data/voices.js';
import { compileMrdr3, mrdr3Colours } from '../src/engine/mrdr3/compile.js';
import { mrdr3NoiseSet } from '../src/engine/mrdr3/noise.js';
import { renderMrdr3 } from '../src/engine/mrdr3/dsp.js';
import { mrdr3Tables } from '../src/engine/mrdr3/tables.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'work', 'local', 'fzpp6-bench.txt');
mkdirSync(dirname(OUT), { recursive: true });
const log = (line = '') => { console.log(line); appendFileSync(OUT, line + '\n'); };

const SR = 44100;
const SECONDS = 10;
const REPS = 5;
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const CHORD = [40, 47, 52, 56, 59, 64].map(hz); // an open E major, six strings

/** A strum of `notes` strings every `every` seconds, each held `hold` seconds. */
function strums(notes, every, hold, vel = () => 1) {
  const events = [];
  let id = 1;
  for (let t = 0, k = 0; t < SECONDS - 0.01; t += every, k++) {
    events.push({ type: 'noteOn', frame: Math.round(t * SR), eventId: id++, hz: CHORD.slice(0, notes),
      durFrames: Math.round(hold * SR), velocity: vel(k) });
  }
  return events;
}

const mrdrTables = mrdr3Tables();
const mrdrNoise = mrdr3NoiseSet(SR, mrdr3Colours(VOICES));
const mrdrPatch = compileMrdr3(VOICES.mrdrAcousticGuitar).patch;
const fz = (id, over = {}) => compileFzpp6({ ...FZPP6_CANDIDATES[id], ...over }, SR);

const runFz = (patch, events) => () => renderFzpp6({ events, seconds: SECONDS, sampleRate: SR, patch });
const runMr = (events) => () => renderMrdr3({ events, seconds: SECONDS, sampleRate: SR, channels: 2,
  patch: mrdrPatch, tables: mrdrTables, noise: mrdrNoise });

const sixteenth = 60 / 110 / 4;
const funkVel = (k) => ([1, 0.3, 0.3, 0.9, 0.3, 0.3, 1, 0.3][k % 8]);
const steel = fz('steelAcoustic');
const CASES = [
  ['control: steel, 6 strings, x2', runFz(steel, strums(6, 0.5, 0.45)), runFz(steel, strums(6, 0.5, 0.45))],
  ['strum, 1 string', runFz(steel, strums(1, 0.5, 0.45)), runMr(strums(1, 0.5, 0.45))],
  ['strum, 3 strings', runFz(steel, strums(3, 0.5, 0.45)), runMr(strums(3, 0.5, 0.45))],
  ['strum, 6 strings', runFz(steel, strums(6, 0.5, 0.45)), runMr(strums(6, 0.5, 0.45))],
  ['held chord, 6 strings, 10 s', runFz(fz('steelAcoustic', { fzpp6: { amp: { release: 3 } } }), strums(6, SECONDS, SECONDS)),
    runMr(strums(6, SECONDS, SECONDS))],
  ['funk 16ths, 4 strings', runFz(fz('funkRhythm'), strums(4, sixteenth, sixteenth * 0.6, funkVel)),
    runMr(strums(4, sixteenth, sixteenth * 0.6, funkVel))],
  ['strum, 6, COURSE (12-string)', runFz(fz('twelveString'), strums(6, 0.5, 0.45)), runMr(strums(6, 0.5, 0.45))],
  ['strum, 6, vibrato (moving read)', runFz(fz('steelAcoustic', { vibrato: { depth: 0.1, rate: 5 } }), strums(6, 0.5, 0.45)),
    runMr(strums(6, 0.5, 0.45))],
  ['strum, 6, FILTER per string', runFz(fz('steelAcoustic', { fzpp6: { filter: { cutoff: 1500, resonance: 2 },
    filterEnv: { amount: 2, decay: 0.3 } } }), strums(6, 0.5, 0.45)), runMr(strums(6, 0.5, 0.45))],
];

const best = (xs) => Math.min(...xs);
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const time = (fn) => { const t0 = performance.now(); fn(); return (performance.now() - t0) / SECONDS; };

log(`\n=== bench-fzpp6 ${new Date().toISOString()} — Node ${process.version}, ${SR} Hz, ${SECONDS} s per run`);
log('ms of render per audio second; best of 5 (median), round-robin, 3 warm-ups');
log('case                               FZPP-6            MRDR-3 (mrdrAcousticGuitar)   FZPP-6 / MRDR-3');
for (const [name, a, b] of CASES) {
  for (let w = 0; w < 3; w++) { a(); b(); }
  const ta = [];
  const tb = [];
  for (let r = 0; r < REPS; r++) { ta.push(time(a)); tb.push(time(b)); }
  const f = (xs) => `${best(xs).toFixed(2).padStart(6)} (${median(xs).toFixed(2)})`;
  log(`${name.padEnd(34)} ${f(ta).padEnd(17)} ${f(tb).padEnd(29)} ${(best(ta) / best(tb)).toFixed(2)}x`);
}
