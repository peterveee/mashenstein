/**
 * THE GAME SYNTH'S NEW EFFECTS CARD, MEASURED OFF THE SAMPLES.
 *
 * `_playGame` learned MRDR-3's DRIVE (SHAPE / PLACE / DRIVE / TONE) and the lane CHORUS
 * that MRDR-3, TNGR-2 and the drawbar organ already share. Five questions, all of them
 * answered by rendering the same preset several ways in a real Web Audio graph:
 *
 *   1. a preset that names none of it renders EXACTLY what it rendered before;
 *   2. so does one that names them at zero — no shaper, no wet leg, nothing built;
 *   3. DRIVE changes the waveform, not merely its level;
 *   4. a POST drive is LEVEL-INDEPENDENT: half the note gain is half the same samples,
 *      which is the whole reason the note's level is applied after the shaper;
 *   5. PRE and POST are different sounds, and CHORUS is a third.
 *
 * Chromium and a real OfflineAudioContext, like tests/held-keys.js and
 * tests/pitch-curve.js: a WaveShaper curve and a delay-line chorus are exactly the
 * things a stub would fake.
 */
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg));

const ENTRY = `
import { VoiceRack } from ${JSON.stringify(join(ROOT, 'src/engine/voices.js'))};
import { VOICES } from ${JSON.stringify(join(ROOT, 'src/data/voices.js'))};
window.__VoiceRack = VoiceRack;
window.__VOICES = VOICES;
`;

const RATE = 44100;
const BASE = {
  synth: 'KNDO-5', kind: 'tone', waveform: 'square',
  attack: 0.005, release: 0.06,
};
// One case per row: the preset keys added on top of BASE, and the note gain it plays at.
const CASES = {
  plain: { keys: {}, gain: 0.5 },
  zeroed: { keys: { drive: 0, shape: 'soft', chorus: { mix: 0 } }, gain: 0.5 },
  post: { keys: { drive: 0.85, shape: 'soft', tone: { freq: 4000 } }, gain: 0.5 },
  postHalf: { keys: { drive: 0.85, shape: 'soft', tone: { freq: 4000 } }, gain: 0.25 },
  pre: { keys: { drive: 0.85, shape: 'soft', tone: { freq: 4000 }, drivePlace: 'pre' }, gain: 0.5 },
  chorus: { keys: { chorus: { mix: 0.7, rate: 1.2, depth: 0.6, width: 1 } }, gain: 0.5 },
};

const chromium = require('playwright').chromium;
const esbuild = require('esbuild');
const built = await esbuild.build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
  bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
});
const bundleJs = built.outputFiles[0].text;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.setContent(
  '<!doctype html><meta charset="utf-8">'
  + `<script>${bundleJs.replace(/<\/script>/gi, '<\\/script>')}<\/script>`,
  { waitUntil: 'load' },
);

const rendered = await page.evaluate(async ({ base, cases, rate }) => {
  const VoiceRack = window.__VoiceRack;
  const VOICES = window.__VOICES;
  const out = {};
  let seq = 0;
  for (const [name, spec] of Object.entries(cases)) {
    const ctx = new OfflineAudioContext(2, Math.round(rate * 1.2), rate);
    const rack = new VoiceRack(ctx);
    const id = `__gs${seq++}`;
    VOICES[id] = { ...JSON.parse(JSON.stringify(base)), ...JSON.parse(JSON.stringify(spec.keys)), id };
    const dry = ctx.createGain();
    dry.gain.value = 1;
    dry.connect(ctx.destination);
    rack.play(`lane${seq}`, id, 220, {
      time: 0.05, dur: 0.4, gain: spec.gain, dry, wet: null, echo: false,
    });
    const buf = await ctx.startRendering();
    out[name] = { L: [...buf.getChannelData(0)], R: [...buf.getChannelData(1)] };
  }
  return out;
}, { base: BASE, cases: CASES, rate: RATE });

await browser.close();
for (const e of errors) fail(`page error: ${e}`);

const L = (name) => Float32Array.from(rendered[name].L);
const R = (name) => Float32Array.from(rendered[name].R);
const maxDiff = (a, b, scale = 1) => {
  let worst = 0;
  for (let i = 0; i < a.length; i++) worst = Math.max(worst, Math.abs(a[i] - b[i] * scale));
  return worst;
};
const rms = (a, from = 0, to = a.length) => {
  let sum = 0;
  for (let i = from; i < to; i++) sum += a[i] * a[i];
  return Math.sqrt(sum / Math.max(1, to - from));
};
const peak = (a) => a.reduce((m, x) => Math.max(m, Math.abs(x)), 0);
// The two waveforms with their levels taken out — "is this the same sound louder, or a
// different sound", which is the only question a drive control is asked.
const shapeDiff = (a, b) => {
  const pa = peak(a), pb = peak(b);
  if (!(pa > 0) || !(pb > 0)) return Infinity;
  let worst = 0;
  for (let i = 0; i < a.length; i++) worst = Math.max(worst, Math.abs(a[i] / pa - b[i] / pb));
  return worst;
};

assert(peak(L('plain')) > 0.05, `the plain preset sounds (peak ${peak(L('plain')).toFixed(3)})`);

// 1 + 2. Nothing built means nothing changed.
assert(maxDiff(L('plain'), L('zeroed')) === 0,
  'DRIVE 0 and CHORUS 0 render the preset bit-for-bit as it rendered before the card existed');

// 3. A shaper is not a fader.
const driveShape = shapeDiff(L('plain'), L('post'));
assert(driveShape > 0.05,
  `DRIVE changes the waveform rather than its level (normalised difference ${driveShape.toFixed(3)})`);

// 4. Half the note gain is half the same samples — the level split around the shaper.
const linear = maxDiff(L('post'), L('postHalf'), 2);
assert(linear < 1e-6,
  `a POST drive is level-independent: gain 0.25 is exactly half of gain 0.5 (max diff ${linear.toExponential(2)})`);

// 5. PRE is a different sound from POST, and the chorus is a third.
const placeShape = shapeDiff(L('post'), L('pre'));
assert(placeShape > 0.02,
  `PLACE pre and post are different sounds (normalised difference ${placeShape.toFixed(3)})`);
const chorusDiff = maxDiff(L('plain'), L('chorus'));
assert(chorusDiff > 0.01, `CHORUS moves the signal (max diff ${chorusDiff.toFixed(3)})`);
// A Juno chorus is two delay lines in antiphase panned apart: the two channels stop
// being the same samples, which is the whole point of it.
const width = maxDiff(L('chorus'), R('chorus'));
assert(width > 0.01, `CHORUS renders in stereo (channel difference ${width.toFixed(3)})`);
assert(maxDiff(L('plain'), R('plain')) === 0, 'the dry preset is still mono');
// It also rings on after the note. The dry signal is over at 0.515s — note-off at 0.45,
// the 60 ms release, and the 5 ms linear finish — while the wet leg is still draining a
// delay line of five and a half milliseconds plus its swing.
const tail = rms(L('chorus'), Math.round(0.516 * RATE), Math.round(0.525 * RATE));
const dryTail = rms(L('plain'), Math.round(0.516 * RATE), Math.round(0.525 * RATE));
// The dry render is EXACTLY silent there — the envelope's last linear ramp reached zero
// — so any signal at all in that window came out of the delay line.
assert(dryTail === 0 && tail > 1e-6,
  `the chorus rings past the note (${tail.toExponential(2)} where the dry preset is silent)`);

console.log(failed ? `GAME SYNTH EFFECTS: ${failed} FAILED` : 'GAME SYNTH EFFECTS: PASSED');
process.exit(failed ? 1 : 0);
