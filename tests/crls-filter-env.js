/**
 * CRLS-1'S FILTER ENVELOPE IS THE ONE EVERY OTHER SYNTH HAS.
 *
 * It used to be Tone's FrequencyEnvelope: linear in hertz on the envelope squared, with a
 * decay that was half done in a fraction of its stated time — so ENV AMOUNT and DECAY read
 * one way on this card and meant another. It now draws the native envelope on the filter's
 * detune (`crlsFilterEnv` in src/engine/voices.js). Rendered in a real OfflineAudioContext:
 *
 *   1. CRLS-1 and KNDO-5, same CUTOFF / ENV AMOUNT / times / curves, sweep the same —
 *      brightness per 20 ms within a few cents, for both stage curves;
 *   2. STYLE: CLASSIC is still Tone's own envelope, which sweeps differently;
 *   3. the STYLE key never reaches Tone (a stray option would throw on `set`).
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

const { VoiceRack } = await import('../src/engine/voices.js');
const spec = VoiceRack.buildSpec({ synth: 'CRLS-1', options: { filter: { type: 'lowpass' },
  filterEnvelope: { baseFrequency: 300, octaves: 2, style: 'classic' } } });
assert(!('style' in spec.opts.filterEnvelope) && spec.fenv === null,
  'CLASSIC is the engine\'s key: it never reaches Tone, and no native envelope is built');
const std = VoiceRack.buildSpec({ synth: 'CRLS-1', options: { filter: { type: 'lowpass' },
  filterEnvelope: { baseFrequency: 300, octaves: 2 } } });
assert(std.opts.filterEnvelope.octaves === 0 && std.fenv?.octaves === 2,
  'STANDARD parks Tone\'s envelope at zero octaves and moves the cutoff itself');

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

const env = (curve) => ({ attack: 0.001, decay: 0.3, sustain: 0.25, release: 0.05, attackCurve: 'linear', decayCurve: curve, releaseCurve: 'linear' });
const presets = {};
for (const c of ['linear', 'exponential']) {
  presets[`crls-${c}`] = { synth: 'CRLS-1', kind: 'tone', options: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.001, decay: 0.01, sustain: 1, release: 0.05 }, filter: { type: 'lowpass', Q: 0.5, rolloff: -12 }, filterEnvelope: { baseFrequency: 300, octaves: 3, ...env(c) } } };
  presets[`kndo-${c}`] = { synth: 'KNDO-5', kind: 'tone', waveform: 'sawtooth', attack: 0.001, release: 0.05, filter: { type: 'lowpass', freq: 300, Q: 0.5, slope: -12, env: { octaves: 3, ...env(c), decayCurve: c === 'linear' ? 'lin' : 'exp', attackCurve: 'lin', releaseCurve: 'lin' } } };
}
presets['crls-classic'] = { ...presets['crls-exponential'], options: { ...presets['crls-exponential'].options, filterEnvelope: { ...presets['crls-exponential'].options.filterEnvelope, style: 'classic' } } };
const res = await page.evaluate(async (presets) => {
  const out = {};
  for (const [name, p] of Object.entries(presets)) {
    const RATE = 44100; const ctx = new OfflineAudioContext(1, RATE, RATE);
    const dry = ctx.createGain(); dry.connect(ctx.destination);
    const rack = new window.__VR(ctx); window.__V.__fe = { ...p, id: '__fe' };
    rack.play('bass', '__fe', 55, { time: 0.02, dur: 0.8, gain: 0.5, dry, wet: null, echo: false });
    const x = (await ctx.startRendering()).getChannelData(0);
    const F = 882; const c = [];
    for (let s = Math.round(0.02 * RATE); s + F < Math.round(0.8 * RATE); s += F) {
      let num = 0, den = 0;
      for (let f = 55; f < 6000; f += 55) { let re = 0, im = 0; for (let i = 0; i < F; i++) { const ph = 2 * Math.PI * f * i / RATE; re += x[s + i] * Math.cos(ph); im -= x[s + i] * Math.sin(ph); } const m = re * re + im * im; num += Math.log2(f) * m; den += m; }
      c.push(num / den);
    }
    out[name] = c;
  }
  return out;
}, presets);
await browser.close();
for (const e of errors) fail(`page error: ${e}`);
const worst = (a, b) => Math.max(...a.map((x, i) => Math.abs(x - b[i]) * 1200));
for (const c of ['linear', 'exponential']) {
  const w = worst(res[`crls-${c}`], res[`kndo-${c}`]);
  assert(w < 25, `CRLS-1 sweeps like KNDO-5 on a ${c} decay (brightness within ${w.toFixed(1)} cents every 20 ms)`);
}
const cw = worst(res['crls-classic'], res['crls-exponential']);
assert(cw > 25, `STYLE: CLASSIC is still Tone's own envelope, which sweeps differently (${cw.toFixed(0)} cents apart)`);
console.log(failed ? `CRLS FILTER ENV: ${failed} FAILED` : 'CRLS FILTER ENV: PASSED');
process.exit(failed ? 1 : 0);
