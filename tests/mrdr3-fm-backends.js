/**
 * MRDR-3'S FM SOUNDS THE SAME ON BOTH BACKENDS (28 Oct 2026).
 *
 * The game plays the native path; the desk plays the worklet. An FM layer at a whole-number
 * ratio is the most phase-sensitive thing either can render — the carrier's phase against
 * its modulator IS the spectrum — so it is where they drifted, and this holds them to it:
 * the same preset through a real OfflineAudioContext and through the worklet core, the
 * first ten harmonics compared as a SHAPE (each spectrum normalised) and as a level.
 *
 * Covered: every modulator WAVE (the worklet's operator was sine-only until today), the
 * new FEEDBACK at two amounts, a held and a struck FM envelope, and three notes started at
 * different points of a 128-frame render quantum — the first quantum is where an
 * OscillatorNode misreads its pitch, and the core now plays that misread too.
 */
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { compileMrdr3, mrdr3Colours } from '../src/engine/mrdr3/compile.js';
import { renderMrdr3, frameAt } from '../src/engine/mrdr3/dsp.js';
import { mrdr3Tables, mrdr3SyncSet, mrdr3FmPartials } from '../src/engine/mrdr3/tables.js';
import { mrdr3PatchSyncTables } from '../src/engine/mrdr3/compile.js';
import { mrdr3NoiseSet } from '../src/engine/mrdr3/noise.js';
import { VOICES } from '../src/data/voices.js';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg));

// ---- the feedback series is the equation it claims to be ------------------------------
// y = sin(theta + b*y), solved by bisection on Kepler's E - b*sin(E) = theta.
for (const b of [0.3, 0.7]) {
  const { imag, harmonics } = mrdr3FmPartials('sine', b);
  let err = 0;
  for (let i = 0; i < 256; i++) {
    const th = (2 * Math.PI * (i + 0.5)) / 256;
    let lo = th - b - 1e-9, hi = th + b + 1e-9;
    for (let k = 0; k < 80; k++) { const m = (lo + hi) / 2; if (m - b * Math.sin(m) < th) lo = m; else hi = m; }
    let sum = 0; for (let n = 1; n <= harmonics; n++) sum += imag[n] * Math.sin(n * th);
    err = Math.max(err, Math.abs(sum - Math.sin((lo + hi) / 2)));
  }
  assert(err < 1e-4, `FEEDBACK ${b}: the series is sin(theta + b*y) to ${err.toExponential(1)}`);
}
assert(mrdr3FmPartials('square', 0.5) === null && mrdr3FmPartials('sine', 0) === null,
  'FEEDBACK is the sine\'s alone, and at 0 the sine is the plain built-in wave');

// ---- the two backends ---------------------------------------------------------------
const SR = 44100, DUR = 0.8, SECS = 1.2;
const preset = (fm) => ({ id: 'x', synth: 'MRDR-3', layer: { osc1: { type: 'sine', ratio: 1, gain: 1,
  attack: 0.002, decay: 0.01, sustain: 1, release: 0.1,
  fm: { type: 'sine', ratio: 1, index: 3, attack: 0.002, decay: 0.01, sustain: 1, ...fm } } } });
const CASES = [
  ['sine, struck', preset({ decay: 0.15, sustain: 0 })],
  ['sine, held 0.6', preset({ decay: 0.15, sustain: 0.6, release: 0.2 })],
  ['square', preset({ type: 'square' })],
  ['sawtooth', preset({ type: 'sawtooth' })],
  ['triangle', preset({ type: 'triangle' })],
  ['pulse', preset({ type: 'pulse' })],
  ['FEEDBACK 0.5', preset({ feedback: 0.5 })],
  ['FEEDBACK 1', preset({ feedback: 1 })],
  ['FEEDBACK 1, ratio 2', preset({ feedback: 1, ratio: 2, index: 1 })],
];
// Three notes, each starting at a different offset into its render quantum.
const NOTES = [[220, 0.05], [55, 0.0731], [880, 0.1234]];
const TABLES = mrdr3Tables();
const NOISE = mrdr3NoiseSet(SR, mrdr3Colours(VOICES));
const core = (v, hz, at) => {
  const patch = compileMrdr3(v).patch;
  const tables = { ...TABLES, syncs: mrdr3SyncSet(mrdr3PatchSyncTables(patch)) };
  const r = renderMrdr3({ events: [{ type: 'noteOn', frame: frameAt(at, SR), eventId: 1, hz: [hz], durFrames: frameAt(DUR, SR), velocity: 1 }],
    seconds: SECS, sampleRate: SR, channels: 1, patch, tables, noise: NOISE });
  return r.channels ? r.channels[0] : r.outL || r[0];
};
const harmonics = (x, hz, from, to) => {
  const a = Math.round(from * SR), N = Math.round((to - from) * SR);
  return Array.from({ length: 10 }, (_, k) => {
    let re = 0, im = 0;
    for (let i = 0; i < N; i++) { const ph = (2 * Math.PI * hz * (k + 1) * i) / SR; re += x[a + i] * Math.cos(ph); im -= x[a + i] * Math.sin(ph); }
    return Math.hypot(re, im) / N;
  });
};

const esbuild = require('esbuild');
const { chromium } = require('playwright');
const js = (await esbuild.build({
  stdin: { contents: `import { VoiceRack } from ${JSON.stringify(join(ROOT, 'src/engine/voices.js'))}; import { VOICES } from ${JSON.stringify(join(ROOT, 'src/data/voices.js'))}; window.__VR = VoiceRack; window.__V = VOICES;`, resolveDir: ROOT, loader: 'js' },
  bundle: true, format: 'iife', write: false, logLevel: 'silent',
})).outputFiles[0].text;
const browser = await chromium.launch({ headless: true, args: ['--mute-audio'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.setContent(`<!doctype html><meta charset=utf-8><script>${js.replace(/<\/script>/gi, '<\\/script>')}</scr` + 'ipt>');
for (const [hz, at] of NOTES) {
  const natives = await page.evaluate(async ({ presets, hz, at, DUR, SECS }) => {
    const out = [];
    for (const p of presets) {
      const ctx = new OfflineAudioContext(1, Math.round(SECS * 44100), 44100);
      const dry = ctx.createGain(); dry.connect(ctx.destination);
      const rack = new window.__VR(ctx); window.__V.__fb = { ...p, id: '__fb', kind: 'tone' };
      // gain 1: the rack's level is the core's level.
      rack.play('bass', '__fb', hz, { time: at, dur: DUR, gain: 1, dry, wet: null, echo: false });
      out.push(Array.from((await ctx.startRendering()).getChannelData(0)));
    }
    return out;
  }, { presets: CASES.map((c) => c[1]), hz, at, DUR, SECS });
  let worstShape = 0, worstDb = 0, worstName = '';
  CASES.forEach(([name, v], i) => {
    const c = core(v, hz, at);
    for (const [a, b] of [[at + 0.1, at + 0.3], [at + 0.4, at + 0.7]]) {
      const sn = harmonics(natives[i], hz, a, b), sc = harmonics(c, hz, a, b);
      const tn = Math.hypot(...sn), tc = Math.hypot(...sc);
      let d = 0; for (let k = 0; k < 10; k++) d += (sn[k] / tn - sc[k] / tc) ** 2;
      const shape = Math.sqrt(d), db = Math.abs(20 * Math.log10(tc / tn));
      if (shape > worstShape) { worstShape = shape; worstName = name; }
      worstDb = Math.max(worstDb, db);
    }
  });
  assert(worstShape < 0.02 && worstDb < 0.2,
    `${hz} Hz, starting ${Math.round(at * SR) % 128} frames into its quantum: every wave and FEEDBACK matches (worst shape ${worstShape.toFixed(3)} on ${worstName}, worst level ${worstDb.toFixed(2)} dB)`);
}
await browser.close();
for (const e of errors) fail(`page error: ${e}`);
console.log(failed ? `MRDR-3 FM BACKENDS: ${failed} FAILED` : 'MRDR-3 FM BACKENDS: PASSED');
process.exit(failed ? 1 : 0);
