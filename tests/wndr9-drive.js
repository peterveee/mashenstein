/**
 * WNDR-9'S DRIVE, MEASURED OFF THE SAMPLES.
 *
 * The drive's knee sits at full scale, and a drawbar stack is nothing like full scale:
 * every bar is a sine at up to 1, so a registration peaks near its bars' total and a
 * chord near that times its notes. Fed raw, DRIVE 0.10 on WNDR-9 distorted the way 0.25
 * does on anything else, and a triad through the one shared shaper was intermodulation
 * mush by 0.2. `_playAdditive` now gives each note a shaper of its own and feeds it the
 * stack at 1/(sum of the bars), handing the sum back after. Four questions, rendered in a
 * real OfflineAudioContext in Chromium, because a WaveShaper curve is exactly the thing a
 * stub would fake:
 *
 *   1. a registration meets the knee no harder than one full-scale sine does;
 *   2. a chord distorts as its notes do — the triad is the SUM of its three notes;
 *   3. low DRIVE keeps the undriven level, so turning it up is not a fader;
 *   4. the note's level still sits after the shaper: half the gain, half the samples.
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
const C4 = 261.63;
const TRIAD = [C4, C4 * 2 ** (4 / 12), C4 * 2 ** (7 / 12)];
// A sustained organ: flat after a short attack, so the measuring window is steady state.
const ENV = { attack: 0.01, decay: 0.05, sustain: 1, release: 0.05 };
// Every drawbar out, the registration that sums highest: nine sines at 1.
const HEAVY = [1, 1, 1, 1, 1, 1, 1, 1, 1];
const SINE = [0, 0, 1];
const preset = (bars, drive) => ({
  synth: 'WNDR-9', kind: 'tone', additive: { bars, ...ENV },
  ...(drive > 0 ? { drive, shape: 'soft' } : {}),
});
const CASES = {
  sineClean: { voice: preset(SINE, 0), freq: C4 },
  sineDriven: { voice: preset(SINE, 0.1), freq: C4 },
  heavyClean: { voice: preset(HEAVY, 0), freq: C4 },
  heavyDriven: { voice: preset(HEAVY, 0.1), freq: C4 },
  heavyLight: { voice: preset(HEAVY, 0.03), freq: C4 },
  heavyHalf: { voice: preset(HEAVY, 0.1), freq: C4, gain: 0.25 },
  triad: { voice: preset(HEAVY, 0.3), freq: TRIAD },
  ...Object.fromEntries(TRIAD.map((f, i) => [`tone${i}`, { voice: preset(HEAVY, 0.3), freq: f }])),
};

const chromium = require('playwright').chromium;
const esbuild = require('esbuild');
const built = await esbuild.build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
  bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
});
const bundleJs = built.outputFiles[0].text;

const browser = await chromium.launch({ headless: true, args: ['--mute-audio'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.setContent(
  '<!doctype html><meta charset="utf-8">'
  + `<script>${bundleJs.replace(/<\/script>/gi, '<\\/script>')}<\/script>`,
  { waitUntil: 'load' },
);

const rendered = await page.evaluate(async ({ cases, rate }) => {
  const VoiceRack = window.__VoiceRack;
  const VOICES = window.__VOICES;
  const out = {};
  let seq = 0;
  for (const [name, spec] of Object.entries(cases)) {
    const ctx = new OfflineAudioContext(1, Math.round(rate * 0.6), rate);
    const rack = new VoiceRack(ctx);
    const id = `__w9${seq++}`;
    VOICES[id] = { ...JSON.parse(JSON.stringify(spec.voice)), id };
    const dry = ctx.createGain();
    dry.connect(ctx.destination);
    rack.play(`lane${seq}`, id, spec.freq, {
      time: 0.02, dur: 0.5, gain: spec.gain ?? 0.5, dry, wet: null, echo: false,
    });
    const buf = await ctx.startRendering();
    out[name] = [...buf.getChannelData(0)];
  }
  return out;
}, { cases: CASES, rate: RATE });

await browser.close();
for (const e of errors) fail(`page error: ${e}`);

const S = (name) => Float32Array.from(rendered[name]);
// Steady state only: past the attack and decay, before the note lets go.
const FROM = Math.round(0.15 * RATE);
const TO = Math.round(0.5 * RATE);
const rms = (a) => {
  let sum = 0;
  for (let i = FROM; i < TO; i++) sum += a[i] * a[i];
  return Math.sqrt(sum / (TO - FROM));
};
const db = (x) => 20 * Math.log10(x);
// What the drive ADDED: the driven render minus its best linear fit to the clean one,
// against the driven render's own level. A fader scores minus infinity.
const residual = (driven, clean) => {
  let dc = 0, cc = 0;
  for (let i = FROM; i < TO; i++) { dc += driven[i] * clean[i]; cc += clean[i] * clean[i]; }
  const g = dc / cc;
  let err = 0, pow = 0;
  for (let i = FROM; i < TO; i++) { err += (driven[i] - g * clean[i]) ** 2; pow += driven[i] ** 2; }
  return 10 * Math.log10(err / pow);
};
const maxDiff = (a, b, scale = 1) => {
  let worst = 0;
  for (let i = 0; i < a.length; i++) worst = Math.max(worst, Math.abs(a[i] - b[i] * scale));
  return worst;
};

assert(rms(S('heavyClean')) > 0.05, `the heavy registration sounds (rms ${rms(S('heavyClean')).toFixed(3)})`);

// 1. The pot reads the same on any registration as on one full-scale sine.
const sineRes = residual(S('sineDriven'), S('sineClean'));
const heavyRes = residual(S('heavyDriven'), S('heavyClean'));
assert(sineRes < -30, `DRIVE 0.10 is still gentle on a full-scale sine (${sineRes.toFixed(1)} dB of distortion)`);
// A couple of dB of slack: nine partials through a curve make more products than one
// does. Before the stack was scaled to its ceiling this one measured −12 dB: 34 dB over.
assert(heavyRes <= sineRes + 3,
  `DRIVE 0.10 with every drawbar out is about as gentle as on that sine `
  + `(${heavyRes.toFixed(1)} dB against ${sineRes.toFixed(1)} dB)`);

// 2. One shaper per note: the chord is the sum of its tones, intermodulation-free.
const sum = S('tone0').map((x, i) => x + S('tone1')[i] + S('tone2')[i]);
// Relative to the chord's peak: three float32 sums in a different order disagree in the
// last bits, and a chord through one shared shaper misses by a tenth of its height.
const chordPeak = S('triad').reduce((m, x) => Math.max(m, Math.abs(x)), 0);
const chordDiff = maxDiff(S('triad'), sum) / chordPeak;
assert(chordDiff < 1e-5,
  `a driven triad is exactly its three notes driven alone (max diff ${chordDiff.toExponential(2)} of its peak)`);

// 3. The level comes back after the shaper, so a touch of drive is not a fader.
const lift = db(rms(S('heavyLight')) / rms(S('heavyClean')));
assert(Math.abs(lift) < 0.5, `DRIVE 0.03 keeps the undriven level (${lift.toFixed(2)} dB)`);

// 4. Half the note gain is half the same samples.
// Relative to the note's own peak: float32 rounding through a ±32 table.
const heavyPeak = S('heavyDriven').reduce((m, x) => Math.max(m, Math.abs(x)), 0);
const linear = maxDiff(S('heavyDriven'), S('heavyHalf'), 2) / heavyPeak;
assert(linear < 1e-5,
  `the note's level sits after the shaper: gain 0.25 is half of gain 0.5 (max diff ${linear.toExponential(2)})`);

console.log(failed ? `WNDR-9 DRIVE: ${failed} FAILED` : 'WNDR-9 DRIVE: PASSED');
process.exit(failed ? 1 : 0);
