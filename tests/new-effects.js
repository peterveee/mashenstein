// Focused offline contract for the native Song Mixer effects. This deliberately
// renders the catalogue through a real Chromium OfflineAudioContext: a browserless
// AudioParam stub would miss the native delay, wave-shaper and oscillator behaviour
// this feature depends on.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EFFECT_BY_ID } from '../src/engine/effects.js';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = `
import * as Tone from 'tone';
import { createEffect } from ${JSON.stringify(join(ROOT, 'src/engine/effects.js'))};
window.__renderEffect = async ({ id, params = {}, seconds = 1.2, wet0 = false,
  gate = false, inputGain = 0.35, source = 'tone', swing = 50 }) => {
  const SR = 44100;
  const N = Math.ceil(seconds * SR);
  const ctx = new OfflineAudioContext(2, N, SR);
  Tone.setContext(ctx);
  const sum = ctx.createGain(); sum.gain.value = inputGain;
  let src = null;
  let harmonics = null;
  if (source === 'impulse') {
    const buffer = ctx.createBuffer(1, N, SR);
    buffer.getChannelData(0)[0] = 1;
    src = ctx.createBufferSource(); src.buffer = buffer; src.connect(sum);
  } else {
    src = ctx.createOscillator();
    src.type = 'sine'; src.frequency.value = 220;
    harmonics = ctx.createOscillator();
    harmonics.type = 'triangle'; harmonics.frequency.value = 440;
    src.connect(sum); harmonics.connect(sum);
  }
  let tail = sum;
  if (id) {
    const p = wet0
      ? (id === 'rhythmgate' ? { ...params, depth: 0 } : { ...params, wet: 0 })
      : params;
    const fx = createEffect(id, p, ctx, 120);
    if (!fx) throw new Error('unknown effect ' + id);
    Tone.connect(sum, fx.node.input || fx.node);
    tail = fx.node.output || fx.node;
    if ((gate || id === 'vowel') && fx.scheduleRhythm) {
      const spb = 60 / 120 / 4;
      for (let step = 0; step < Math.ceil(seconds / spb) + 2; step++) {
        fx.scheduleRhythm(step, step * spb, spb, 120, swing);
      }
    }
  }
  Tone.connect(tail, ctx.destination);
  src.start(0); if (harmonics) harmonics.start(0);
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

const ids = ['chorus2', 'bitcrusher', 'rhythmgate', 'flanger', 'ringmod', 'tape', 'vowel'];
const params = {
  chorus2: { rateSync: 0, frequency: 0.65 },
  bitcrusher: { bits: 8, drive: 6, tone: 12000 },
  rhythmgate: { division: 0.5, gateLength: 0.5, attack: 0.003, decay: 0.035, depth: 1 },
  flanger: { rateSync: 0, frequency: 0.25 },
  ringmod: { rateSync: 0, frequency: 30, waveform: 'sine' },
  tape: { drive: 6, bias: 0.1, tone: 10000, wow: 0.12, flutter: 0.05 },
  vowel: { voice: 'alto', stack: 'a e i o u', rateSync: 1, rateDivision: 0.25,
    frequency: 0.5, depth: 1, glide: 0.08, reso: 2, spread: 0.9, wet: 0.9 },
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
    for (let i = 0; i < Math.min(a[c].length, b[c].length); i++) {
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

function fftMagnitudes(samples, size = 32768) {
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  for (let i = 0; i < size; i++) re[i] = samples[i] || 0;
  for (let i = 1, j = 0; i < size; i++) {
    let bit = size >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { const t = re[i]; re[i] = re[j]; re[j] = t; }
  }
  for (let len = 2; len <= size; len <<= 1) {
    const half = len >> 1;
    const angle = -2 * Math.PI / len;
    for (let start = 0; start < size; start += len) {
      for (let i = 0; i < half; i++) {
        const c = Math.cos(angle * i), s = Math.sin(angle * i);
        const j = start + i + half;
        const tr = re[j] * c - im[j] * s;
        const ti = re[j] * s + im[j] * c;
        re[j] = re[start + i] - tr; im[j] = im[start + i] - ti;
        re[start + i] += tr; im[start + i] += ti;
      }
    }
  }
  return Array.from({ length: size / 2 }, (_, i) => Math.hypot(re[i], im[i]));
}
const peakNear = (magnitudes, hz, width, sr = 44100) => {
  const lo = Math.max(1, Math.floor((hz - width) * magnitudes.length * 2 / sr));
  const hi = Math.min(magnitudes.length - 1, Math.ceil((hz + width) * magnitudes.length * 2 / sr));
  let best = lo;
  for (let i = lo + 1; i <= hi; i++) if (magnitudes[i] > magnitudes[best]) best = i;
  return { hz: best * sr / (magnitudes.length * 2), value: magnitudes[best], bin: best };
};
const width3db = (magnitudes, peak, sr = 44100) => {
  const floor = peak.value / Math.SQRT2;
  let left = peak.bin, right = peak.bin;
  while (left > 1 && magnitudes[left - 1] >= floor) left--;
  while (right < magnitudes.length - 1 && magnitudes[right + 1] >= floor) right++;
  return (right - left) * sr / (magnitudes.length * 2);
};
const rms = (samples, start, end) => {
  let sum = 0, n = 0;
  for (let i = start; i < end && i < samples.length; i++) { sum += samples[i] ** 2; n++; }
  return Math.sqrt(sum / Math.max(1, n));
};
const maxAdjacentStep = (samples) => {
  let max = 0;
  for (let i = 1; i < samples.length; i++) max = Math.max(max, Math.abs(samples[i] - samples[i - 1]));
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
const wideVowel = await page.evaluate((x) => window.__renderEffect(x), {
  id: 'vowel', params: { ...params.vowel, spread: 1, wet: 1 }, seconds: 1.2,
});
assert(stereoDelta(wideVowel) > 1e-3, 'vowel spread separates the formants into stereo');
const centeredVowel = await page.evaluate((x) => window.__renderEffect(x), {
  id: 'vowel', params: { ...params.vowel, spread: 0, wet: 1 }, seconds: 1.2,
});
assert(stereoDelta(centeredVowel) < 1e-5, 'zero vowel spread remains centered');
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

const staticImpulse = await page.evaluate((x) => window.__renderEffect(x), {
  id: 'vowel', source: 'impulse', seconds: 1.2,
  params: { voice: 'alto', stack: 'a', rateSync: 1, rateDivision: 1, depth: 0, spread: 0, wet: 1 },
});
const staticSpectrum = fftMagnitudes(staticImpulse[0]);
for (const [hz, label] of [[800, 'F1'], [1150, 'F2'], [2800, 'F3']]) {
  const p = peakNear(staticSpectrum, hz, 180);
  assert(Math.abs(p.hz - hz) < 180, `vowel ${label} peak is near ${hz}Hz`);
}
// Thinness is measurable: with only three bands the response was ~35dB below the input
// above 3kHz, so every vowel arrived with no presence and no air. The singer's upper
// pair and the air tap have to keep the top within a usable window of F1.
const bandEnergy = (spectrum, lo, hi, sr = 44100) => {
  const a = Math.max(1, Math.floor(lo * spectrum.length * 2 / sr));
  const b = Math.min(spectrum.length - 1, Math.ceil(hi * spectrum.length * 2 / sr));
  let sum = 0;
  for (let i = a; i <= b; i++) sum += spectrum[i] * spectrum[i];
  return Math.sqrt(sum / (b - a + 1));
};
const f1Energy = bandEnergy(staticSpectrum, 700, 900);
assert(bandEnergy(staticSpectrum, 3300, 4800) > f1Energy * 0.03,
  'the singer\'s upper formant pair carries presence above F3');
assert(bandEnergy(staticSpectrum, 6000, 12000) > f1Energy * 0.01,
  'the air tap keeps the top octaves open instead of falling off a cliff at 3kHz');
const noAir = await page.evaluate((x) => window.__renderEffect(x), {
  id: 'vowel', source: 'impulse', seconds: 1.2,
  params: { voice: 'alto', stack: 'a', rateSync: 1, rateDivision: 1, depth: 0, spread: 0, wet: 1, air: 0, body: 0 },
});
const noAirSpectrum = fftMagnitudes(noAir[0]);
assert(bandEnergy(noAirSpectrum, 6000, 12000) < bandEnergy(staticSpectrum, 6000, 12000),
  'BODY and AIR at zero return the bare three-band bank');

const narrow = await page.evaluate((x) => window.__renderEffect(x), {
  id: 'vowel', source: 'impulse', seconds: 1.2,
  params: { voice: 'robotic', stack: 'a', depth: 0, reso: 0.5, spread: 0, wet: 1 },
});
const wide = await page.evaluate((x) => window.__renderEffect(x), {
  id: 'vowel', source: 'impulse', seconds: 1.2,
  params: { voice: 'robotic', stack: 'a', depth: 0, reso: 2, spread: 0, wet: 1 },
});
const narrowSpectrum = fftMagnitudes(narrow[0]);
const wideSpectrum = fftMagnitudes(wide[0]);
const narrowWidth = width3db(narrowSpectrum, peakNear(narrowSpectrum, 800, 180));
const wideWidth = width3db(wideSpectrum, peakNear(wideSpectrum, 800, 180));
assert(wideWidth < narrowWidth, 'higher RESO produces a narrower formant peak');

const staticTone = await page.evaluate((x) => window.__renderEffect(x), {
  id: 'vowel', seconds: 2, inputGain: 0.35,
  params: { voice: 'alto', stack: 'a', rateSync: 1, rateDivision: 1, depth: 0, spread: 0, wet: 1 },
});
const fullWetBody = rms(staticTone[0], 8000, 40000);
assert(fullWetBody > 0.02, 'full-wet vowel keeps a voiced low-frequency body');
const staticA = rms(staticTone[0], 18000, 26000);
const staticB = rms(staticTone[0], 36000, 44000);
assert(Math.abs(staticA - staticB) < Math.max(0.01, staticA * 0.08),
  'depth zero remains spectrally/static-level stable over time');

const walking = await page.evaluate((x) => window.__renderEffect(x), {
  id: 'vowel', seconds: 1.2,
  params: { voice: 'alto', stack: 'a e', rateSync: 1, rateDivision: 0.25, depth: 1, glide: 0, spread: 0, wet: 1 },
  swing: 50,
});
const swung = await page.evaluate((x) => window.__renderEffect(x), {
  id: 'vowel', seconds: 1.2,
  params: { voice: 'alto', stack: 'a e', rateSync: 1, rateDivision: 0.25, depth: 1, glide: 0, spread: 0, wet: 1 },
  swing: 66,
});
assert(diff(walking, staticTone) > 1e-4, 'vowel walker changes the rendered formant sequence');
assert(diff(walking, swung) > 1e-5, 'odd synced vowel divisions follow swing');
assert(maxAdjacentStep(walking[0]) < 0.12, 'glide zero vowel steps stay free of large sample discontinuities');

// Nothing is worse than a knob that does nothing. Every parameter the desk shows for the
// Vowel Filter gets swept end to end and has to move the render. Each is swept in the
// mode the panel actually shows it in — FREQUENCY is the unsynced rate, so a synced
// sweep of it correctly renders nothing and would be a false alarm.
const vowelDef = EFFECT_BY_ID.vowel;
const sweepEnds = (name) => {
  const range = (vowelDef.ranges || {})[name];
  if (range && range.options) return [range.options[0], range.options[range.options.length - 1]];
  if (range) return [range.min, range.max];
  if (name === 'rateSync') return [0, 1];
  if (name === 'rateDivision') return [0.25, 4];
  return [0, 1];
};
const rmsDiff = (a, b) => {
  let sum = 0, n = 0;
  for (let c = 0; c < a.length; c++) {
    for (let i = 0; i < Math.min(a[c].length, b[c].length); i++) { sum += (a[c][i] - b[c][i]) ** 2; n++; }
  }
  return Math.sqrt(sum / Math.max(1, n));
};
for (const name of vowelDef.params) {
  const [lo, hi] = sweepEnds(name);
  const mode = name === 'frequency' ? { rateSync: 0 } : {};
  const shared = { ...vowelDef.defaults, ...mode, seconds: undefined };
  delete shared.seconds;
  const a = await page.evaluate((x) => window.__renderEffect(x), {
    id: 'vowel', params: { ...shared, [name]: lo }, seconds: 1.5,
  });
  const b = await page.evaluate((x) => window.__renderEffect(x), {
    id: 'vowel', params: { ...shared, [name]: hi }, seconds: 1.5,
  });
  assert(rmsDiff(a, b) > 1e-4, `vowel ${name} is a live control, not a dead knob`);
}

await browser.close();
if (errors.length) throw new Error(`browser page errors: ${errors.join('; ')}`);
console.log('NEW EFFECTS: PASSED');
