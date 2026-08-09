// Measure the native Song Mixer effects against a bare oscillator. Usage:
//   node tools/measure-new-effects.js
// The reported percentages are the catalogue's rough realtime CPU estimates, using
// the same best-of-three method as the existing effect benches.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = `
import { createEffect } from ${JSON.stringify(join(ROOT, 'src/engine/effects.js'))};
window.__bench = async ({ id, params, seconds, reps }) => {
  const SR = 44100, N = Math.ceil(seconds * SR), times = [];
  for (let r = 0; r < reps; r++) {
    const ctx = new OfflineAudioContext(2, N, SR);
    const osc = ctx.createOscillator(); osc.frequency.value = 220;
    const sum = ctx.createGain(); sum.gain.value = 0.2;
    osc.connect(sum);
    let tail = sum;
    if (id) {
      const fx = createEffect(id, params, ctx, 120);
      sum.connect(fx.node.input || fx.node); tail = fx.node.output || fx.node;
      if (fx.scheduleRhythm && (id === 'vowel' || id === 'rhythmgate')) {
        const sixteenth = 60 / 120 / 4;
        for (let step = 0; step < Math.ceil(seconds / sixteenth) + 2; step++) {
          fx.scheduleRhythm(step, step * sixteenth, sixteenth, 120, 50);
        }
      }
    }
    tail.connect(ctx.destination); osc.start(0);
    const t0 = performance.now(); await ctx.startRendering();
    times.push(performance.now() - t0);
  }
  return { ms: Math.min(...times), seconds: N / SR };
};
`;
const { chromium } = require('playwright');
const esbuild = require('esbuild');
const built = await esbuild.build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
  bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent' });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent('<!doctype html><meta charset="utf-8">'
  + `<script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}<\/script>`,
{ waitUntil: 'load' });
const effects = [
  ['chorus2', { rateSync: 0, frequency: 0.65 }],
  ['bitcrusher', { bits: 8, drive: 6, tone: 12000 }],
  ['rhythmgate', { division: 0.5, gateLength: 0.5, attack: 0.003, decay: 0.035, depth: 1 }],
  ['flanger', { rateSync: 0, frequency: 0.25 }],
  ['ringmod', { rateSync: 0, frequency: 30, waveform: 'sine' }],
  ['tape', { drive: 6, bias: 0.1, tone: 10000, wow: 0.12, flutter: 0.05 }],
  ['vowel', { voice: 'alto', stack: 'a e i o u', rateSync: 1, rateDivision: 0.25,
    frequency: 0.5, waveform: 'step', depth: 1, glide: 0.08, articulation: 0,
    reso: 2, spread: 0.9, intensity: 0, excite: 0, breath: 0, wet: 0.9 }],
  ['vowel dramatic', 'vowel', { voice: 'robotic', stack: 'a e i o u', rateSync: 1,
    rateDivision: 0.25, frequency: 0.5, waveform: 'sine', depth: 1, glide: 0.35,
    articulation: 0.7, reso: 2.8, spread: 0.8, intensity: 1, excite: 1,
    breath: 0.5, body: 0.35, air: 0.12, wet: 1 }],
];
const base = await page.evaluate((x) => window.__bench(x), { id: null, params: {}, seconds: 1, reps: 3 });
console.log(`bare oscillator: ${base.ms.toFixed(2)}ms over ${base.seconds.toFixed(2)}s`);
for (const entry of effects) {
  const [labelOrId, maybeId, maybeParams] = entry;
  const id = maybeParams ? maybeId : labelOrId;
  const params = maybeParams || maybeId;
  const one = await page.evaluate((x) => window.__bench(x), { id, params, seconds: 1, reps: 3 });
  const cost = ((one.ms - base.ms) / (one.seconds * 1000)) * 100;
  console.log(`${maybeParams ? labelOrId : id}: ${one.ms.toFixed(2)}ms, cost ${cost.toFixed(2)}%`);
}
await browser.close();
