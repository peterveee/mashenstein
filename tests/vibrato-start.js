/**
 * A VIBRATO STARTS AT THE SAME PLACE IN ITS WOBBLE ON EVERY NOTE.
 *
 * The native paths build an LFO per note-on. Its rate used to be set only as an
 * automation event at the note's time, so an oscillator starting part-way into a
 * 128-frame render quantum ran at the 440 Hz default up to that event, and the note's
 * wobble began wherever the block boundary left it. Each LFO now has its rate as its
 * intrinsic value too. Rendered: the same note started at four offsets inside a quantum
 * is the same samples once aligned, on KNDO-5, MRDR-3 and WNDR-9.
 */
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);

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
const env = { attack: 0.005, decay: 0.1, sustain: 1, release: 0.05 };
const vibrato = { depth: 1, rate: 6 };
const presets = {
  'KNDO-5': { synth: 'KNDO-5', kind: 'tone', waveform: 'sine', attack: 0.005, release: 0.05, vibrato },
  'MRDR-3': { synth: 'MRDR-3', kind: 'tone', vibrato, layer: { osc1: { type: 'sine', ratio: 1, gain: 1, ...env } } },
  'WNDR-9': { synth: 'WNDR-9', kind: 'tone', vibrato, additive: { bars: [0, 0, 1], attack: 0.005, decay: 4, sustain: 1, release: 0.05 } },
};
const res = await page.evaluate(async (presets) => {
  const out = {};
  for (const [name, p] of Object.entries(presets)) {
    const takes = [];
    for (const off of [0, 29, 64, 101]) {
      const RATE = 44100; const ctx = new OfflineAudioContext(1, RATE, RATE);
      const dry = ctx.createGain(); dry.connect(ctx.destination);
      const rack = new window.__VR(ctx); window.__V.__vs = { ...p, id: '__vs' };
      rack.play('lead', '__vs', 440, { time: (2048 + off) / RATE, dur: 0.5, gain: 0.5, dry, wet: null, echo: false });
      const x = (await ctx.startRendering()).getChannelData(0);
      takes.push(Array.from(x.slice(2048 + off, 2048 + off + 8820)));
    }
    let worst = 0;
    for (let k = 1; k < takes.length; k++) for (let i = 0; i < takes[0].length; i++) worst = Math.max(worst, Math.abs(takes[k][i] - takes[0][i]));
    out[name] = worst;
  }
  return out;
}, presets);
await browser.close();
for (const e of errors) fail(`page error: ${e}`);
// Before the fix these differed by up to 1.0 — the whole swing. What remains is the
// note's own sub-quantum bookkeeping, three orders of magnitude down.
for (const [name, worst] of Object.entries(res)) {
  if (worst < 0.01) ok(`${name}: a vibrato note is the same wherever in a quantum it starts (max diff ${worst.toExponential(2)})`);
  else fail(`${name}: a vibrato note's wobble depends on where in a quantum it starts (max diff ${worst.toExponential(2)})`);
}
console.log(failed ? `VIBRATO START: ${failed} FAILED` : 'VIBRATO START: PASSED');
process.exit(failed ? 1 : 0);
