// The engine's own worklets (src/engine/engine-worklets.js): the Noise Gate insert and the
// rewind recorder's tap, both moved off main-thread ScriptProcessorNodes.
//
//   1. The worklet gate does what the gate always did — opens above threshold, closes
//      below it, honours 0dB, renders the same twice — and is ON TIME: what goes in comes
//      out on the same sample, where the ScriptProcessor delayed the lane by its buffer.
//   2. It is the same gate: aligned for that delay, the fallback renders the same samples.
//   3. Every render that awaits `mixer.ready` builds its gates on the worklet.
//   4. A live context that builds a gate before the worklet is registered starts on the
//      fallback and hands over to the worklet once it is.
//   5. The capture tap records the master, downmixed to mono, chunk for chunk; and the
//      engine builds it as a worklet on a context that can host one.
//
// A real Chromium on an https origin: a worklet needs a secure context, and a `setContent`
// page is not one — which is also why tests/new-effects.js keeps exercising the fallback.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = `
import * as Tone from 'tone';
import { Audio } from ${JSON.stringify(join(ROOT, 'src/engine/audio.js'))};
import { createEffect } from ${JSON.stringify(join(ROOT, 'src/engine/effects.js'))};
import * as W from ${JSON.stringify(join(ROOT, 'src/engine/engine-worklets.js'))};
window.__Audio = Audio;
window.__Tone = Tone;
window.__createEffect = createEffect;
window.__W = W;

const SR = 44100;
// A 220Hz tone, loud for the first quarter-second and after 0.65s, near-silent between.
const burst = (N) => {
  const x = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    x[i] = ((t < 0.25 || t >= 0.65) ? 0.35 : 0.001) * Math.sin(2 * Math.PI * 220 * t);
  }
  return x;
};

window.__renderGate = async ({ params = {}, seconds = 1, worklet = true, gain = 1, signal = 'burst' }) => {
  const N = Math.ceil(seconds * SR);
  const ctx = new OfflineAudioContext(2, N, SR);
  Tone.setContext(ctx);
  if (worklet) await W.prepareEngineWorklets(ctx);
  const buffer = ctx.createBuffer(1, N, SR);
  const x = buffer.getChannelData(0);
  if (signal === 'burst') x.set(burst(N));
  else for (let i = 0; i < N; i++) x[i] = 0.35 * Math.sin(2 * Math.PI * 220 * i / SR);
  const src = ctx.createBufferSource(); src.buffer = buffer;
  const trim = ctx.createGain(); trim.gain.value = gain;
  src.connect(trim);
  const fx = createEffect('noisegate', params, ctx, 120);
  trim.connect(fx.node.input);
  fx.node.output.connect(ctx.destination);
  src.start(0);
  const r = await ctx.startRendering();
  return { engine: fx.node.engine, input: Array.from(x), L: Array.from(r.getChannelData(0)),
    R: Array.from(r.getChannelData(1)) };
};
`;

let failed = false;
const assert = (cond, msg) => {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
};
const SR = 44100;
const rms = (a, from, to) => {
  let s = 0;
  for (let i = from; i < to; i++) s += a[i] * a[i];
  return Math.sqrt(s / Math.max(1, to - from));
};
const peak = (a) => a.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const maxDiff = (a, b, from = 0, to = Math.min(a.length, b.length), lag = 0) => {
  let m = 0;
  for (let i = from; i < to; i++) m = Math.max(m, Math.abs(a[i] - b[i + lag]));
  return m;
};

const { chromium } = require('playwright');
const esbuild = require('esbuild');
const built = await esbuild.build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
  bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
});
const html = '<!doctype html><meta charset="utf-8">'
  + `<script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}<\/script>`;
const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const errors = [];

async function freshPage(label) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  await page.route('**/*', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: html }));
  await page.goto('https://mashenstein.render/', { waitUntil: 'load' });
  return page;
}

try {
  // ---- 1. the gate, on the worklet ---------------------------------------------------------
  {
    const page = await freshPage('gate');
    const gateParams = { threshold: -45, attack: 0.003, release: 0.04 };
    const burst = await page.evaluate((x) => window.__renderGate(x), { params: gateParams });
    assert(burst.engine === 'worklet', `a gate built after registration runs on the worklet (${burst.engine})`);
    const open = rms(burst.L, 0.1 * SR, 0.2 * SR);
    const closed = rms(burst.L, 0.45 * SR, 0.55 * SR);
    assert(open > 0.05, `it passes a signal above threshold (${open.toFixed(3)})`);
    assert(closed < open * 0.02, `and cuts one below it after the release (${closed.toExponential(1)})`);
    assert(maxDiff(burst.L, burst.R) === 0, 'stereo in, the same gate on both sides');
    // On time: with the gate fully open, out IS in, sample for sample.
    const onTime = maxDiff(burst.input, burst.L, 0.1 * SR, 0.2 * SR);
    assert(onTime < 1e-4, `and adds no latency — open, the output is the input on the same sample (max diff ${onTime.toExponential(1)})`);

    const loud = await page.evaluate((x) => window.__renderGate(x), { params: gateParams, signal: 'tone', gain: 1, seconds: 0.8 });
    const quiet = await page.evaluate((x) => window.__renderGate(x), { params: gateParams, signal: 'tone', gain: 0.001 / 0.35, seconds: 0.8 });
    assert(peak(loud.L) > 0.05 && peak(quiet.L) < 1e-6, 'threshold separates a full-level tone from low-level noise');
    const zero = await page.evaluate((x) => window.__renderGate(x), { params: { ...gateParams, threshold: 0 }, signal: 'tone', seconds: 0.8 });
    assert(peak(zero.L) < 1e-7, 'a 0dB threshold is honoured, not defaulted');
    const again = await page.evaluate((x) => window.__renderGate(x), { params: gateParams, signal: 'tone', seconds: 0.8 });
    assert(maxDiff(loud.L, again.L) === 0, 'it renders the same samples twice');

    // ---- 2. the same gate as the fallback ---------------------------------------------------
    const script = await page.evaluate((x) => window.__renderGate(x), { params: gateParams, worklet: false });
    assert(script.engine === 'script', `without registration it falls back to the ScriptProcessor (${script.engine})`);
    let lag = 0; let best = Infinity;
    for (let l = 0; l <= 4096; l++) {
      const d = maxDiff(burst.L, script.L, 0.05 * SR, 0.9 * SR, l);
      if (d < best) { best = d; lag = l; }
    }
    assert(best < 1e-4, `aligned for its ${lag}-sample delay (${(lag / SR * 1000).toFixed(1)}ms), the fallback renders the same gate (max diff ${best.toExponential(1)})`);
    await page.close();
  }

  // ---- 3. a render that awaits mixer.ready gets the worklet ----------------------------------
  {
    const page = await freshPage('mixer-ready');
    const r = await page.evaluate(async () => {
      const Audio = window.__Audio;
      const ctx = new OfflineAudioContext(2, 44100, 44100);
      Audio.setCaptureEnabled(false);
      Audio.ensure(ctx);
      const before = window.__W.engineWorkletsReady(ctx);
      await Audio.mixer.ready;
      const fx = window.__createEffect('noisegate', {}, ctx, 120);
      return { before, after: window.__W.engineWorkletsReady(ctx), engine: fx.node.engine };
    });
    assert(r.after && r.engine === 'worklet',
      `mixer.ready registers the engine worklets, so a bounce's gates run on them (ready ${r.before} → ${r.after}, gate ${r.engine})`);
    await page.close();
  }

  // ---- 4. a live gate built early hands over ------------------------------------------------
  {
    const page = await freshPage('swap');
    const r = await page.evaluate(async () => {
      const W = window.__W;
      const ctx = new AudioContext();
      const early = window.__createEffect('noisegate', { threshold: -30 }, ctx, 120);
      const gone = window.__createEffect('noisegate', {}, ctx, 120);
      const first = early.node.engine;
      gone.node.dispose();
      await W.prepareEngineWorklets(ctx);
      await new Promise((res) => setTimeout(res, 0));
      early.set({ threshold: -20 });
      const out = { first, later: early.node.engine, disposed: gone.node.engine };
      await ctx.close();
      return out;
    });
    assert(r.first === 'script' && r.later === 'worklet',
      `a live gate built before registration starts on the fallback and hands over (${r.first} → ${r.later})`);
    assert(r.disposed === 'script', 'one disposed before then is left alone');
    await page.close();
  }

  // ---- 5. the capture tap ----------------------------------------------------------------
  {
    const page = await freshPage('capture');
    const r = await page.evaluate(async () => {
      const W = window.__W;
      const N = W.CAPTURE_CHUNK * 10 + 300;
      const ctx = new OfflineAudioContext(2, N, 44100);
      await W.prepareEngineWorklets(ctx);
      const buffer = ctx.createBuffer(2, N, 44100);
      const L = buffer.getChannelData(0); const R = buffer.getChannelData(1);
      for (let i = 0; i < N; i++) { L[i] = Math.sin(i * 0.01); R[i] = 0.5 * Math.cos(i * 0.037); }
      const src = ctx.createBufferSource(); src.buffer = buffer;
      const tap = W.createCaptureNode(ctx);
      const chunks = [];
      tap.port.onmessage = (e) => chunks.push(e.data);
      const sink = ctx.createGain(); sink.gain.value = 0;
      src.connect(tap); tap.connect(sink); sink.connect(ctx.destination);
      src.start(0);
      await ctx.startRendering();
      for (let i = 0; i < 50 && chunks.length < 10; i++) await new Promise((res) => setTimeout(res, 10));
      let diff = 0; let n = 0;
      for (const c of chunks) {
        for (let i = 0; i < c.length; i++, n++) diff = Math.max(diff, Math.abs(c[i] - (L[n] + R[n]) / 2));
      }
      return { count: chunks.length, sizes: [...new Set(chunks.map((c) => c.length))], diff };
    });
    assert(r.count === 10 && r.sizes.length === 1 && r.sizes[0] === 2048,
      `the tap posts one 2048-sample chunk per 2048 samples (${r.count} × ${r.sizes.join('/')})`);
    assert(r.diff < 1e-6, `and each is the master downmixed to mono, in order (max diff ${r.diff.toExponential(1)})`);

    const live = await page.evaluate(async () => {
      const Audio = window.__Audio;
      Audio.setCaptureEnabled(true);
      Audio.ensure();
      for (let i = 0; i < 100 && !Audio._capNode; i++) await new Promise((res) => setTimeout(res, 10));
      const kind = Audio._capNode?.constructor?.name;
      Audio.setCaptureEnabled(false);
      const cleared = Audio._capNode === null && Audio._capBuf === null;
      return { kind, cleared };
    });
    assert(live.kind === 'AudioWorkletNode', `the engine's rewind tap is a worklet on a secure page (${live.kind})`);
    assert(live.cleared, 'and turning capture off takes it down');
    await page.close();
  }
} finally {
  await browser.close();
}

if (errors.length) { console.error('FAIL: page errors:', errors.join('; ')); failed = true; }
if (failed) process.exit(1);
console.log('ENGINE WORKLETS: PASSED');
