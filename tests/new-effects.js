// Focused offline contract for the native Song Mixer effects. This deliberately
// renders the catalogue through a real Chromium OfflineAudioContext: a browserless
// AudioParam stub would miss the native delay, wave-shaper and oscillator behaviour
// this feature depends on.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EFFECT_BY_ID, paramRange, peqResponse } from '../src/engine/effects.js';
import { EFFECT_PRESETS } from '../src/data/effect-presets.js';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = `
import * as Tone from 'tone';
import { createEffect } from ${JSON.stringify(join(ROOT, 'src/engine/effects.js'))};
window.__renderEffect = async ({ id, params = {}, seconds = 1.2, wet0 = false,
  gate = false, inputGain = 0.35, source = 'tone', swing = 50, impulseAt = 0 }) => {
  const SR = 44100;
  const N = Math.ceil(seconds * SR);
  const ctx = new OfflineAudioContext(2, N, SR);
  Tone.setContext(ctx);
  const sum = ctx.createGain(); sum.gain.value = inputGain;
  let src = null;
  let harmonics = null;
  if (source === 'impulse') {
    const buffer = ctx.createBuffer(1, N, SR);
    // impulseAt exists for the effects that RAMP to their settings. Every custom node
    // in the catalogue writes its parameters with setTargetAtTime and a 20ms constant, so
    // an impulse at sample zero is measuring the filter the constructor built rather than
    // the one the caller asked for — for the Channel EQ that came out 8.5dB from the
    // curve the desk draws, and the node was correct. Land it after the ramp instead.
    buffer.getChannelData(0)[Math.round(impulseAt * SR)] = 1;
    src = ctx.createBufferSource(); src.buffer = buffer; src.connect(sum);
  } else if (source === 'gate') {
    const buffer = ctx.createBuffer(1, N, SR);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < N; i++) {
      const t = i / SR;
      const loud = t < 0.25 || t >= 0.65;
      data[i] = (loud ? 0.35 : 0.001) * Math.sin(2 * Math.PI * 220 * t);
    }
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

const ids = ['chorus2', 'bitcrusher', 'rhythmgate', 'flanger', 'ringmod', 'tape', 'vowel', 'ambience', 'reverb'];
const params = {
  chorus2: { rateSync: 0, frequency: 0.65 },
  bitcrusher: { bits: 8, downsample: 4 },
  rhythmgate: { division: 0.5, gateLength: 0.5, attack: 0.003, decay: 0.035, depth: 1 },
  flanger: { rateSync: 0, frequency: 0.25 },
  ringmod: { rateSync: 0, frequency: 30, waveform: 'sine' },
  tape: { drive: 6, bias: 0.1, tone: 10000, wow: 0.12, flutter: 0.05 },
  vowel: { voice: 'alto', stack: 'a e i o u', rateSync: 1, rateDivision: 0.25,
    frequency: 0.5, waveform: 'step', depth: 1, glide: 0.08, articulation: 0,
    reso: 2, spread: 0.9, intensity: 0, excite: 0, breath: 0, wet: 0.9 },
  ambience: { space: 0.5, damping: 0.55, wet: 0.38 },
  reverb: { decay: 2, preDelay: 0.01, low: 0, mid: 0, high: 0, width: 1, wet: 0.4 },
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

// Ambience is a tail effect, not merely a stereo colour. An impulse must still be
// present after the first recirculating line, and the deliberately unequal left/right
// lines must separate a mono source without relying on a running LFO.
const ambienceImpulse = await page.evaluate((x) => window.__renderEffect(x), {
  id: 'ambience', source: 'impulse', seconds: 1.5,
  params: { space: 0.5, damping: 0.55, wet: 1 },
});
const tailStart = Math.floor(0.09 * 44100);
assert(Math.max(...ambienceImpulse[0].slice(tailStart)) > 1e-5
  && Math.max(...ambienceImpulse[1].slice(tailStart)) > 1e-5,
  'ambience leaves an audible post-input tail');
assert(stereoDelta(ambienceImpulse) > 1e-4, 'ambience decorrelates the stereo tail');
const reverbImpulse = await page.evaluate((x) => window.__renderEffect(x), {
  id: 'reverb', source: 'impulse', seconds: 2.5,
  params: { ...params.reverb, wet: 1 }, inputGain: 1,
});
const reverbTailStart = Math.floor(0.05 * 44100);
assert(Math.max(...reverbImpulse[0].slice(reverbTailStart)) > 1e-5
  && Math.max(...reverbImpulse[1].slice(reverbTailStart)) > 1e-5,
  'reverb leaves an audible wet tail after the dry impulse');
for (const values of [
  { space: 0, damping: 0, wet: 1 },
  { space: 0.5, damping: 0.55, wet: 0.38 },
  { space: 1, damping: 1, wet: 1 },
  { space: 0.82, damping: 2, wet: 1 },
]) {
  const extreme = await page.evaluate((x) => window.__renderEffect(x), {
    id: 'ambience', source: 'impulse', seconds: 1.5, params: values,
  });
  assert(extreme.every((ch) => ch.every(finite)) && peak(extreme) < 8,
    `ambience remains finite and bounded at space ${values.space}, damping ${values.damping}`);
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

const lowBits = await page.evaluate((x) => window.__renderEffect(x), { id: 'bitcrusher', params: { bits: 2, downsample: 1 } });
const highBits = await page.evaluate((x) => window.__renderEffect(x), { id: 'bitcrusher', params: { bits: 24, downsample: 1 } });
assert(diff(lowBits, highBits) > 1e-3, 'bit depth changes the quantized signal');
const fullRate = await page.evaluate((x) => window.__renderEffect(x), {
  id: 'bitcrusher', params: { bits: 24, downsample: 1 }, seconds: 1.2,
});
const reducedRate = await page.evaluate((x) => window.__renderEffect(x), {
  id: 'bitcrusher', params: { bits: 24, downsample: 12 }, seconds: 1.2,
});
assert(diff(fullRate, reducedRate) > 1e-3, 'sample-rate reduction changes the held signal');
const crushedSilence = await page.evaluate((x) => window.__renderEffect(x), {
  id: 'bitcrusher', params: { bits: 4, downsample: 12, wet: 1 }, inputGain: 0,
});
assert(peak(crushedSilence) < 1e-7, 'bit crusher keeps silence at zero instead of creating meter-only DC');
for (const [name, preset] of Object.entries(EFFECT_PRESETS.inserts.bitcrusher.presets)) {
  const rendered = await page.evaluate((x) => window.__renderEffect(x), {
    id: 'bitcrusher', params: preset, seconds: 1.2,
  });
  assert(rendered.every((ch) => ch.every(finite)) && peak(rendered) > 1e-5,
    `bit crusher preset ${name} renders finite audible output`);
}

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

const vowelExciteOff = await page.evaluate((x) => window.__renderEffect(x), {
  id: 'vowel', params: { ...params.vowel, stack: 'a', depth: 0, wet: 1, excite: 0 }, seconds: 1.2,
});
const vowelExciteOn = await page.evaluate((x) => window.__renderEffect(x), {
  id: 'vowel', params: { ...params.vowel, stack: 'a', depth: 0, wet: 1, excite: 1 }, seconds: 1.2,
});
assert(diff(vowelExciteOff, vowelExciteOn) > 1e-4, 'vowel EXCITE adds harmonic colour');

const vowelArticulateOff = await page.evaluate((x) => window.__renderEffect(x), {
  id: 'vowel', params: { ...params.vowel, stack: 'a e', articulation: 0, breath: 0, wet: 1 }, seconds: 1.2,
});
const vowelArticulateOn = await page.evaluate((x) => window.__renderEffect(x), {
  id: 'vowel', params: { ...params.vowel, stack: 'a e', articulation: 1, breath: 1, wet: 1 }, seconds: 1.2,
});
assert(diff(vowelArticulateOff, vowelArticulateOn) > 1e-4, 'vowel ARTICULATION changes the wet envelope');
assert(maxAdjacentStep(vowelArticulateOn[0]) < 0.12, 'vowel articulation remains click-safe');

for (const waveform of ['sine', 'triangle', 'saw up', 'saw down', 'square', 'random']) {
  const shaped = await page.evaluate((x) => window.__renderEffect(x), {
    id: 'vowel', params: { ...params.vowel, stack: 'a e i', waveform, glide: 0.2, wet: 1 }, seconds: 1.2,
  });
  assert(shaped.every((ch) => ch.every(finite)) && peak(shaped) > 1e-5,
    `vowel ${waveform} renders finite audible output`);
}
const sineShape = await page.evaluate((x) => window.__renderEffect(x), {
  id: 'vowel', params: { ...params.vowel, stack: 'a e i', waveform: 'sine', wet: 1 }, seconds: 1.2,
});
const sawShape = await page.evaluate((x) => window.__renderEffect(x), {
  id: 'vowel', params: { ...params.vowel, stack: 'a e i', waveform: 'saw up', wet: 1 }, seconds: 1.2,
});
assert(diff(sineShape, sawShape) > 1e-5, 'vowel wave shapes follow different trajectories');

const silentVowel = await page.evaluate((x) => window.__renderEffect(x), {
  id: 'vowel', inputGain: 0, seconds: 1.2,
  params: { ...params.vowel, waveform: 'random', articulation: 1, excite: 1, breath: 1,
    intensity: 1, wet: 1 },
});
assert(peak(silentVowel) < 1e-7, 'vowel excitation and breath keep silence at zero');

const presetNames = ['Talking Robot', 'Monster O-A', 'Breathy Choir', 'Chopped I-A', 'Hard Talkbox'];
for (const preset of presetNames) {
  const renderedPreset = await page.evaluate((x) => window.__renderEffect(x), {
    id: 'vowel', params: { ...params.vowel, ...EFFECT_PRESETS.inserts.vowel.presets[preset] }, seconds: 1.2,
  });
  assert(renderedPreset.every((ch) => ch.every(finite)) && peak(renderedPreset) < 8,
    `vowel preset ${preset} remains finite and bounded`);
}
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

const noiseGateParams = { threshold: -45, attack: 0.003, release: 0.04 };
const gatedBurst = await page.evaluate((x) => window.__renderEffect(x), {
  id: 'noisegate', source: 'gate', seconds: 1, inputGain: 1, params: noiseGateParams,
});
const gateOpenRms = rms(gatedBurst[0], 0.1 * 44100, 0.2 * 44100);
const gateClosedRms = rms(gatedBurst[0], 0.45 * 44100, 0.55 * 44100);
assert(gateOpenRms > 0.05, 'noise gate passes a signal above threshold');
assert(gateClosedRms < gateOpenRms * 0.02, 'noise gate cuts a signal below threshold after release');
const gateLoud = await page.evaluate((x) => window.__renderEffect(x), {
  id: 'noisegate', params: noiseGateParams, inputGain: 0.35, seconds: 0.8,
});
const gateQuiet = await page.evaluate((x) => window.__renderEffect(x), {
  id: 'noisegate', params: noiseGateParams, inputGain: 0.001, seconds: 0.8,
});
assert(peak(gateLoud) > 0.05 && peak(gateQuiet) < 1e-6,
  'noise gate threshold separates a full-level tone from low-level noise');
const zeroThreshold = await page.evaluate((x) => window.__renderEffect(x), {
  id: 'noisegate', params: { ...noiseGateParams, threshold: 0 }, inputGain: 0.35, seconds: 0.8,
});
assert(peak(zeroThreshold) < 1e-7, 'noise gate honours a 0dB threshold without defaulting');
const gateRepeat = await page.evaluate((x) => window.__renderEffect(x), {
  id: 'noisegate', params: noiseGateParams, inputGain: 0.35, seconds: 0.8,
});
assert(diff(gateLoud, gateRepeat) < 5e-6, 'noise gate renders deterministically');

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
for (const name of ['space', 'damping', 'wet']) {
  const range = EFFECT_BY_ID.ambience.ranges?.[name] || { min: 0, max: 1 };
  const lo = await page.evaluate((x) => window.__renderEffect(x), {
    id: 'ambience', params: { ...params.ambience, [name]: range.min }, seconds: 1.5,
  });
  const hi = await page.evaluate((x) => window.__renderEffect(x), {
    id: 'ambience', params: { ...params.ambience, [name]: range.max }, seconds: 1.5,
  });
  assert(rmsDiff(lo, hi) > 1e-4, `ambience ${name} is a live control, not a dead knob`);
}
for (const name of ['low', 'mid', 'high']) {
  const range = EFFECT_BY_ID.reverb.ranges[name];
  const lo = await page.evaluate((x) => window.__renderEffect(x), {
    id: 'reverb', params: { ...params.reverb, [name]: range.min }, seconds: 2.5,
  });
  const hi = await page.evaluate((x) => window.__renderEffect(x), {
    id: 'reverb', params: { ...params.reverb, [name]: range.max }, seconds: 2.5,
  });
  assert(rmsDiff(lo, hi) > 1e-4, `reverb ${name} is a live tail EQ control`);
}
{
  const lo = await page.evaluate((x) => window.__renderEffect(x), {
    id: 'reverb', source: 'impulse', params: { ...params.reverb, width: 0 }, seconds: 2.5,
  });
  const wide = await page.evaluate((x) => window.__renderEffect(x), {
    id: 'reverb', source: 'impulse', params: { ...params.reverb, width: 2 }, seconds: 2.5,
  });
  assert(stereoDelta(lo) < 1e-5, 'reverb width 0 collapses the wet tail to mono');
  assert(stereoDelta(wide) > 1e-4, 'reverb width 2 expands the wet tail stereo image');
}
// ---- THE CHANNEL EQ'S FIVE BANDS AGREE WITH THE CURVE THE DESK DRAWS ---------------
//
// The card grew a middle band, and `n` is an identity rather than a position: the new one
// is band 5 and it sits THIRD, because renumbering to put it third would have moved three
// bands' settings on every song already carrying a Channel EQ. Everything that touches a
// band therefore has to key off `b.n`, and `makeParametricEq` used to key off the array
// index — the same four numbers until the day they weren't.
//
// Nothing about that fails loudly. The graph would draw one curve and the filters would
// render another, and the only way to catch it is to measure what came out and hold it
// against what `peqResponse` promised. So: an impulse through the real nodes, its
// magnitude read at eight frequencies, against the desk's own prediction.
{
  const peqDef = EFFECT_BY_ID.peq;
  // One band up, one down, both away from their defaults, and Q's that are not 1 — a
  // setting where every band's identity matters and no two are interchangeable.
  const setting = { ...peqDef.defaults,
    g1: 6, f2: 300, g2: -5, q2: 2, f5: 1200, g5: 9, q5: 3,
    f3: 3000, g3: -4, q3: 1.5, f4: 9000, g4: 5 };
  const [impulse] = await page.evaluate((x) => window.__renderEffect(x), {
    id: 'peq', params: setting, seconds: 1.5, source: 'impulse', inputGain: 1,
    impulseAt: 0.25,
  });
  const [bare] = await page.evaluate((x) => window.__renderEffect(x), {
    id: null, seconds: 1.5, source: 'impulse', inputGain: 1, impulseAt: 0.25,
  });
  // A Goertzel at one frequency over the impulse response IS that frequency's magnitude.
  const mag = (samples, hz) => {
    const w = 2 * Math.PI * hz / 44100;
    const c = 2 * Math.cos(w);
    let s1 = 0, s2 = 0;
    for (let i = 0; i < samples.length; i++) { const t = samples[i] + c * s1 - s2; s2 = s1; s1 = t; }
    return Math.sqrt(Math.abs(s1 * s1 + s2 * s2 - c * s1 * s2));
  };
  const probe = [60, 120, 300, 700, 1200, 3000, 6000, 12000];
  const predicted = peqResponse(setting, probe, 44100);
  const rendered = probe.map((hz) => 20 * Math.log10(mag(impulse, hz) / mag(bare, hz)));
  const worst = Math.max(...rendered.map((db, i) => Math.abs(db - predicted[i])));
  assert(worst < 0.2,
    `the five rendered bands match the curve the desk draws, worst case ${worst.toFixed(3)}dB`);
  // And the middle band specifically, because it is the one whose number and position
  // differ: move ONLY band 5 and 1.2kHz has to move with it while 120Hz and 6kHz do not.
  const [midOnly] = await page.evaluate((x) => window.__renderEffect(x), {
    id: 'peq', params: { ...peqDef.defaults, f5: 1200, g5: 12, q5: 3 },
    seconds: 1.5, source: 'impulse', inputGain: 1, impulseAt: 0.25,
  });
  const at = (hz) => 20 * Math.log10(mag(midOnly, hz) / mag(bare, hz));
  assert(at(1200) > 11 && Math.abs(at(120)) < 0.3 && Math.abs(at(6000)) < 0.3,
    'a boost on band 5 alone lands at 1.2kHz and leaves the shelves where they were');
}

// The Bell EQ's three, swept the same way — with the WHOLE POINT that FREQ and Q are
// swept at a boost and not at the default. A peaking biquad at 0dB is exactly
// transparent, which is the property that lets one sit unused in a chain; it also means
// a sweep of frequency or Q against the flat default renders no difference at all and
// would report two live controls as dead. So the gain sweep runs from the card's own
// default and the other two run from a +12 bell, which is the state anybody who is
// touching FREQ is in.
{
  const bellDef = EFFECT_BY_ID.bell;
  const bellRange = (name) => bellDef.ranges?.[name] || paramRange(name, bellDef);
  for (const name of bellDef.params) {
    const range = bellRange(name);
    const base = name === 'gain' ? bellDef.defaults : { ...bellDef.defaults, gain: 12 };
    const a = await page.evaluate((x) => window.__renderEffect(x), {
      id: 'bell', params: { ...base, [name]: range.min }, seconds: 1.5,
    });
    const b = await page.evaluate((x) => window.__renderEffect(x), {
      id: 'bell', params: { ...base, [name]: range.max }, seconds: 1.5,
    });
    assert(rmsDiff(a, b) > 1e-4, `bell ${name} is a live control, not a dead knob`);
  }
  // And the claim the card is built on: at 0dB it is not merely quiet, it is the input.
  const flat = await page.evaluate((x) => window.__renderEffect(x), {
    id: 'bell', params: bellDef.defaults, seconds: 1.5,
  });
  // `id: null` is the harness's no-node-at-all render — the same reference the wet-0
  // transparency checks above use.
  const none = await page.evaluate((x) => window.__renderEffect(x), { id: null, seconds: 1.5 });
  assert(rmsDiff(flat, none) === 0,
    'a Bell EQ at 0dB is bit-for-bit the signal that went into it');
}

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
