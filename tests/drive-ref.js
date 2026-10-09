/**
 * WHERE DRIVE'S KNEE SITS, ON THE SYNTHS THAT STAGE IT PER PRESET.
 *
 * MRDR-3 and the drum kit put the knee at each preset's own measured peak (`driveRef` in
 * src/engine/drive-curve.js), so DRIVE bites the same on a shaker as on a kick. What has
 * to stay true for that to keep working, checked here:
 *
 *   1. the stage undoes the music level the peaks were measured through — the number in
 *      drive-curve.js and the engine's default in audio.js are the same number;
 *   2. CRUSH is not staged, a voice with no peak stages at 1, and the stage is bounded;
 *   3. rendered in a real OfflineAudioContext: the same drum body at 20 dB apart, each
 *      carrying its own measured peak, distorts the same at the same DRIVE — and as
 *      little as a full-scale sine does at DRIVE 0.1;
 *   4. the level still sits after the shaper: half the gain, half the samples.
 */
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { driveRef, PEAK_MEASURED_AT, DRIVE_REF_MIN, DRIVE_REF_MAX } from '../src/engine/drive-curve.js';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg));

// ---- 1 + 2: the rules ---------------------------------------------------------------
const audioSrc = readFileSync(join(ROOT, 'src/engine/audio.js'), 'utf8');
const music = Number(audioSrc.match(/this\.levels = \{[^}]*music: ([0-9.]+)/)?.[1]);
assert(music === PEAK_MEASURED_AT,
  `the stage undoes the music level peaks are measured at (audio.js ${music}, drive-curve.js ${PEAK_MEASURED_AT})`);
assert(driveRef({ peak: 0.35 }) === 0.35 / PEAK_MEASURED_AT, 'a preset stages at its stored peak over that level');
assert(driveRef({ peak: 0.35, shape: 'crush' }) === 1, 'CRUSH is not staged');
assert(driveRef({}) === 1 && driveRef({ peak: 0 }) === 1, 'a voice with no peak stages at 1, the old behaviour');
assert(driveRef({ peak: 1e-9 }) === DRIVE_REF_MIN && driveRef({ peak: 1e9 }) === DRIVE_REF_MAX,
  'the stage is bounded at both ends');

// ---- 3 + 4: rendered -------------------------------------------------------------------
const ENTRY = `
import { VoiceRack } from ${JSON.stringify(join(ROOT, 'src/engine/voices.js'))};
import { VOICES } from ${JSON.stringify(join(ROOT, 'src/data/voices.js'))};
window.__VoiceRack = VoiceRack;
window.__VOICES = VOICES;
`;
const RATE = 44100;
// A drum body that sustains for the window: a 220 Hz sine, flat, at a given gain. Its
// stored peak is what the level system would have measured — its gain, through the
// music level.
const body = (gain, drive) => ({
  kind: 'drum', dur: 1,
  osc: { type: 'sine', from: 220, to: 220, sweep: 0.001, attack: 0.002, hold: 0.6, decay: 0.05, gain },
  peak: gain * PEAK_MEASURED_AT,
  ...(drive > 0 ? { drive, shape: 'soft' } : {}),
});
const CASES = {
  quietClean: { voice: body(0.1, 0), gain: 0.5 },
  quietDriven: { voice: body(0.1, 0.1), gain: 0.5 },
  loudClean: { voice: body(1, 0), gain: 0.5 },
  loudDriven: { voice: body(1, 0.1), gain: 0.5 },
  loudHard: { voice: body(1, 0.5), gain: 0.5 },
  quietHard: { voice: body(0.1, 0.5), gain: 0.5 },
  loudHardHalf: { voice: body(1, 0.5), gain: 0.25 },
};

const chromium = require('playwright').chromium;
const esbuild = require('esbuild');
const built = await esbuild.build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
  bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
});
const browser = await chromium.launch({ headless: true, args: ['--mute-audio'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.setContent('<!doctype html><meta charset="utf-8">'
  + `<script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}<\/script>`, { waitUntil: 'load' });
const rendered = await page.evaluate(async ({ cases, rate }) => {
  const out = {};
  let seq = 0;
  for (const [name, spec] of Object.entries(cases)) {
    const ctx = new OfflineAudioContext(1, Math.round(rate * 0.8), rate);
    const rack = new window.__VoiceRack(ctx);
    const id = `__dr${seq++}`;
    window.__VOICES[id] = { ...spec.voice, id };
    const dry = ctx.createGain();
    dry.connect(ctx.destination);
    rack.play('kick', id, 220, { time: 0.02, dur: 0.6, gain: spec.gain, dry, wet: null, echo: false });
    out[name] = [...(await ctx.startRendering()).getChannelData(0)];
  }
  return out;
}, { cases: CASES, rate: RATE });
await browser.close();
for (const e of errors) fail(`page error: ${e}`);

const S = (n) => Float32Array.from(rendered[n]);
const FROM = Math.round(0.15 * RATE); const TO = Math.round(0.5 * RATE);
const residual = (d, c) => {
  let dc = 0, cc = 0;
  for (let i = FROM; i < TO; i++) { dc += d[i] * c[i]; cc += c[i] * c[i]; }
  const g = dc / cc; let e = 0, p = 0;
  for (let i = FROM; i < TO; i++) { e += (d[i] - g * c[i]) ** 2; p += d[i] ** 2; }
  return 10 * Math.log10(e / p);
};
const rms = (a) => { let s = 0; for (let i = FROM; i < TO; i++) s += a[i] * a[i]; return Math.sqrt(s / (TO - FROM)); };

const q1 = residual(S('quietDriven'), S('quietClean'));
const l1 = residual(S('loudDriven'), S('loudClean'));
assert(Math.abs(q1 - l1) < 1 && l1 < -40,
  `DRIVE 0.1 bites the same on a body 20 dB quieter (${q1.toFixed(1)} dB against ${l1.toFixed(1)} dB of distortion)`);
const q5 = residual(S('quietHard'), S('quietClean'));
const l5 = residual(S('loudHard'), S('loudClean'));
assert(Math.abs(q5 - l5) < 1, `...and DRIVE 0.5 too (${q5.toFixed(1)} dB against ${l5.toFixed(1)} dB)`);
const lift = (n, c) => 20 * Math.log10(rms(S(n)) / rms(S(c)));
assert(Math.abs(lift('quietHard', 'quietClean') - lift('loudHard', 'loudClean')) < 0.5,
  `turning DRIVE up raises a quiet body exactly as much as a loud one (${lift('quietHard', 'quietClean').toFixed(2)} dB against ${lift('loudHard', 'loudClean').toFixed(2)} dB)`);
let worst = 0; let pk = 0;
const a = S('loudHard'); const b = S('loudHardHalf');
for (let i = 0; i < a.length; i++) { worst = Math.max(worst, Math.abs(a[i] - 2 * b[i])); pk = Math.max(pk, Math.abs(a[i])); }
assert(worst / pk < 1e-5, `the level sits after the shaper: half the gain is half the samples (max diff ${(worst / pk).toExponential(2)} of the peak)`);

console.log(failed ? `DRIVE REF: ${failed} FAILED` : 'DRIVE REF: PASSED');
process.exit(failed ? 1 : 0);
