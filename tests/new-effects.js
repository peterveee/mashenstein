// Focused offline contract for the six new Song Mixer effects. This deliberately
// renders the catalogue through a real Chromium OfflineAudioContext: a browserless
// AudioParam stub would miss the native delay, wave-shaper and oscillator behaviour
// this feature depends on.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = `
import * as Tone from 'tone';
import { createEffect } from ${JSON.stringify(join(ROOT, 'src/engine/effects.js'))};
window.__renderEffect = async ({ id, params = {}, seconds = 1.2, wet0 = false, gate = false, inputGain = 0.35 }) => {
  const SR = 44100;
  const N = Math.ceil(seconds * SR);
  const ctx = new OfflineAudioContext(2, N, SR);
  Tone.setContext(ctx);
  const src = ctx.createOscillator();
  src.type = 'sine'; src.frequency.value = 220;
  const harmonics = ctx.createOscillator();
  harmonics.type = 'triangle'; harmonics.frequency.value = 440;
  const sum = ctx.createGain(); sum.gain.value = inputGain;
  src.connect(sum); harmonics.connect(sum);
  let tail = sum;
  if (id) {
    const p = wet0
      ? (id === 'rhythmgate' ? { ...params, depth: 0 } : { ...params, wet: 0 })
      : params;
    const fx = createEffect(id, p, ctx, 120);
    if (!fx) throw new Error('unknown effect ' + id);
    Tone.connect(sum, fx.node.input || fx.node);
    tail = fx.node.output || fx.node;
    if (gate && fx.scheduleRhythm) {
      const spb = 60 / 120 / 4;
      for (let step = 0; step < Math.ceil(seconds / spb) + 2; step++) {
        fx.scheduleRhythm(step, step * spb, spb, 120);
      }
    }
  }
  Tone.connect(tail, ctx.destination);
  src.start(0); harmonics.start(0);
  const rendered = await ctx.startRendering();
  return Array.from({ length: rendered.numberOfChannels }, (_, c) => Array.from(rendered.getChannelData(c)));
};
`;

const { chromium } = require('playwright');
const esbuild = require('esbuild');
const built = await esbuild.build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
  bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
});
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.setContent('<!doctype html><meta charset="utf-8">'
  + `<script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}<\/script>`,
{ waitUntil: 'load' });

const ids = ['chorus2', 'bitcrusher', 'rhythmgate', 'flanger', 'ringmod', 'tape'];
const params = {
  chorus2: { rateSync: 0, frequency: 0.65 },
  bitcrusher: { bits: 8, drive: 6, tone: 12000 },
  rhythmgate: { division: 0.5, gateLength: 0.5, attack: 0.003, decay: 0.035, depth: 1 },
  flanger: { rateSync: 0, frequency: 0.25 },
  ringmod: { rateSync: 0, frequency: 30, waveform: 'sine' },
  tape: { drive: 6, bias: 0.1, tone: 10000, wow: 0.12, flutter: 0.05 },
};
const assert = (ok, msg) => { if (!ok) throw new Error(msg); console.log(`ok: ${msg}`); };
const finite = (x) => Number.isFinite(x);
const peak = (chs) => {
  let max = 0;
  for (const ch of chs) for (const sample of ch) max = Math.max(max, Math.abs(sample));
  return max;
};
const diff = (a, b) => {
  let max = 0;
  for (let c = 0; c < a.length; c++) {
    for (let i = 0; i < a[c].length; i++) {
      const d = Math.abs(a[c][i] - b[c][i]);
      if (d > max) max = d;
    }
  }
  return max;
};
const stereoDelta = (chs) => {
  let max = 0;
  for (let i = 0; i < Math.min(chs[0].length, chs[1].length); i++) {
    max = Math.max(max, Math.abs(chs[0][i] - chs[1][i]));
  }
  return max;
};

for (const id of ids) {
  const a = await page.evaluate((x) => window.__renderEffect(x), { id, params: params[id], gate: id === 'rhythmgate' });
  const b = await page.evaluate((x) => window.__renderEffect(x), { id, params: params[id], gate: id === 'rhythmgate' });
  assert(a.every((ch) => ch.every(finite)), `${id} renders finite samples`);
  assert(peak(a) > 1e-5, `${id} renders audible output`);
  assert(diff(a, b) < 5e-6, `${id} renders deterministically`);
  const dry = await page.evaluate((x) => window.__renderEffect(x), { id: null });
  const transparent = await page.evaluate((x) => window.__renderEffect(x), { id, params: params[id], wet0: true, gate: false });
  assert(diff(dry, transparent) < 5e-6, `${id} is transparent at wet 0`);
}

// The original Tone Chorus remains a supported saved effect; this covers the four
// newly exposed public Tone parameters without changing its id or old defaults.
const chorusParams = {
  rateSync: 0, frequency: 1.5, delayTime: 8, depth: 0.65,
  feedback: 0.35, spread: 90, type: 'triangle', wet: 0.7,
};
const originalChorus = await page.evaluate((x) => window.__renderEffect(x), {
  id: 'chorus', params: chorusParams,
});
assert(originalChorus.every((ch) => ch.every(finite)) && peak(originalChorus) > 1e-5,
  'original chorus renders with the expanded Tone controls');
const chorusVariant = await page.evaluate((x) => window.__renderEffect(x), {
  id: 'chorus', params: { ...chorusParams, type: 'square', feedback: 0 },
});
assert(diff(originalChorus, chorusVariant) > 1e-4,
  'original chorus waveform and feedback controls change the render');

const lowBits = await page.evaluate((x) => window.__renderEffect(x), { id: 'bitcrusher', params: { bits: 2, drive: 0, tone: 20000 } });
const highBits = await page.evaluate((x) => window.__renderEffect(x), { id: 'bitcrusher', params: { bits: 16, drive: 0, tone: 20000 } });
assert(diff(lowBits, highBits) > 1e-3, 'bit depth changes the quantized signal');
const crushedSilence = await page.evaluate((x) => window.__renderEffect(x), {
  id: 'bitcrusher', params: { bits: 4, drive: 4, tone: 3945.696, wet: 0.55 }, inputGain: 0,
});
assert(peak(crushedSilence) < 1e-7, 'bit crusher keeps silence at zero instead of creating meter-only DC');

const wideChorus = await page.evaluate((x) => window.__renderEffect(x), {
  id: 'chorus2', params: { rateSync: 0, frequency: 0.65, density: 1, width: 1, wet: 1 },
});
assert(stereoDelta(wideChorus) > 1e-4, 'chorus 2 decorrelates mono input into stereo');
for (const [id, fxParams] of [
  ['chorus2', { feedback: 0.6, density: 1, wet: 1 }],
  ['flanger', { feedback: 0.85, wet: 1 }],
  ['tape', { drive: 24, bias: 1, wow: 1, flutter: 1, wet: 1 }],
]) {
  const extreme = await page.evaluate((x) => window.__renderEffect(x), { id, params: fxParams, seconds: 1.5 });
  assert(extreme.every((ch) => ch.every(finite)) && peak(extreme) < 8,
    `${id} remains finite and bounded at its extreme drive/feedback setting`);
}

const gateOpen = await page.evaluate((x) => window.__renderEffect(x), { id: 'rhythmgate', params: { division: 0.5, gateLength: 0.5, attack: 0.003, decay: 0.035, depth: 1 }, gate: true });
const gatePeak = gateOpen[0].reduce((m, v) => Math.max(m, Math.abs(v)), 0);
assert(gatePeak > 0.05, 'rhythmic gate opens on the song grid');

await browser.close();
if (errors.length) throw new Error(`browser page errors: ${errors.join('; ')}`);
console.log('NEW EFFECTS: PASSED');
