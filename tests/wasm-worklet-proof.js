/*
 * The WebAssembly worklet proof — Stage 0 of docs/WASM-audio-engine-plan.md.
 *
 * Before any DSP is ported, prove the plumbing in both engines the game is judged in
 * (Chromium for the Mac, WebKit for the iPhone), with a core too small to be wrong
 * (src/engine/mrdr3wasm/hello.c):
 *
 *   1. the tracked .wasm bytes are current against their C source and flags
 *   2. in Node, wasm and the same recurrence in JS agree BIT FOR BIT
 *   3. offline, at 44.1k and 48k, a worklet compiling the bytes itself renders exactly
 *      the JS reference — the path the port will use
 *   4. a live AudioContext runs it, and a SharedArrayBuffer handed in is written by the
 *      audio thread (Stage 4's precondition), on a cross-origin-isolated page
 *
 * And one finding rather than a claim: whether a compiled WebAssembly.Module can be
 * structured-cloned into the worklet. Reported, not asserted — 'bytes' is the path.
 */
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WASM_CORES, wasmSourceHash } from '../tools/lib/wasm-cores.js';
import { HELLO_WASM_SOURCE_HASH } from '../src/engine/mrdr3wasm/hello.wasm.js';
import { helloWasmBytes, helloStart, helloReference } from '../src/engine/mrdr3wasm/host.js';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { chromium, webkit } = require('playwright');
const esbuild = require('esbuild');

let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg));

const HZ = 440;
const PHASE = 0.3;

// ---- 1. staleness -------------------------------------------------------------------
const hello = WASM_CORES.find((c) => c.name === 'hello');
assert(wasmSourceHash(readFileSync(join(ROOT, hello.source), 'utf8')) === HELLO_WASM_SOURCE_HASH,
  'hello.wasm.js is current against hello.c (else: node tools/build-wasm.js)');

// ---- 2. Node: wasm == JS, exactly ---------------------------------------------------
{
  const e = new WebAssembly.Instance(new WebAssembly.Module(helloWasmBytes()), {}).exports;
  const s = helloStart(44100, HZ, PHASE);
  e.start(s.cosW, s.sinW, s.re, s.im);
  const N = 44100;
  const out = new Float32Array(N);
  const view = new Float32Array(e.memory.buffer, e.block(), 128);
  for (let i = 0; i < N; i += 128) {
    const n = Math.min(128, N - i);
    e.render(n);
    out.set(view.subarray(0, n), i);
  }
  const ref = helloReference(44100, HZ, N, PHASE);
  let mismatched = 0;
  for (let i = 0; i < N; i++) if (out[i] !== ref[i]) mismatched++;
  assert(mismatched === 0, `Node: wasm equals the JS recurrence bit for bit (${mismatched} samples differ)`);
}

// ---- 3, 4. in the browsers ----------------------------------------------------------
const ENTRY = `
import {
  prepareWasmHello, createWasmHelloNode, helloReference,
} from ${JSON.stringify(join(ROOT, 'src/engine/mrdr3wasm/host.js'))};

const firstMessage = (node) => new Promise((resolve) => {
  node.port.onmessage = (e) => resolve(e.data);
  setTimeout(() => resolve({ type: 'timeout' }), 3000);
});

window.__offline = async ({ rate, via, hz, phase }) => {
  const N = rate;
  const ctx = new OfflineAudioContext(2, N, rate);
  if (!(await prepareWasmHello(ctx))) return { error: 'addModule failed' };
  let node;
  try { node = createWasmHelloNode(ctx, { hz, phase, via }); } catch (e) { return { error: String(e.message || e) }; }
  const msg = firstMessage(node);
  node.connect(ctx.destination);
  const buf = await ctx.startRendering();
  const m = await msg;
  if (m.type !== 'ready') return { error: m.message || m.type };
  const ref = helloReference(rate, hz, N, phase);
  let mismatched = 0;
  for (let c = 0; c < 2; c++) {
    const ch = buf.getChannelData(c);
    for (let i = 0; i < N; i++) if (ch[i] !== ref[i]) mismatched++;
  }
  return { mismatched };
};

window.__live = async () => {
  const isolated = !!self.crossOriginIsolated;
  if (typeof SharedArrayBuffer !== 'function') return { isolated, error: 'no SharedArrayBuffer' };
  const sab = new SharedArrayBuffer(4);
  const ticks = new Int32Array(sab);
  const ctx = new AudioContext();
  await prepareWasmHello(ctx);
  const sink = ctx.createGain();
  sink.gain.value = 0;
  sink.connect(ctx.destination);
  const node = createWasmHelloNode(ctx, { hz: 440, sab });
  const msg = firstMessage(node);
  node.connect(sink);
  await ctx.resume();
  const m = await msg;
  await new Promise((r) => setTimeout(r, 400));
  const n = Atomics.load(ticks, 0);
  const state = ctx.state;
  await ctx.close();
  return { isolated, ready: m.type === 'ready', error: m.message, state, ticks: n };
};
`;

const bundle = (await esbuild.build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
  bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
})).outputFiles[0].text;
const html = '<!doctype html><meta charset="utf-8">'
  + `<script>${bundle.replace(/<\/script>/gi, '<\\/script>')}<\/script>`;

// Served for real from localhost — a secure context, so worklets exist — with the two
// headers that make a page cross-origin isolated. Not `page.route`: WebKit leaves
// SharedArrayBuffer undefined on a routed page even when it reports itself isolated, and a
// catch-all route also swallows the blob: URL the processor is loaded from.
const server = createServer((req, res) => {
  res.writeHead(200, {
    'content-type': 'text/html',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  });
  res.end(html);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const pageUrl = `http://localhost:${server.address().port}/`;

for (const [label, type, args] of [
  ['chromium', chromium, ['--mute-audio', '--autoplay-policy=no-user-gesture-required']],
  ['webkit', webkit, []],
]) {
  const browser = await type.launch({ headless: true, args });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(pageUrl, { waitUntil: 'load' });

    for (const rate of [44100, 48000]) {
      const r = await page.evaluate((a) => window.__offline(a), { rate, via: 'bytes', hz: HZ, phase: PHASE });
      assert(!r.error && r.mismatched === 0,
        `${label} ${rate}: offline worklet compiling the bytes equals the JS reference exactly`
        + (r.error ? ` — ${r.error}` : ` (${r.mismatched} samples differ)`));
    }
    const viaModule = await page.evaluate((a) => window.__offline(a), { rate: 44100, via: 'module', hz: HZ, phase: PHASE });
    console.log(`info: ${label}: cloning a compiled WebAssembly.Module into the worklet — `
      + (viaModule.error ? `NOT supported (${viaModule.error})` : `works (${viaModule.mismatched} samples differ)`));

    const live = await page.evaluate(() => window.__live());
    assert(live.isolated, `${label}: the page is cross-origin isolated`);
    assert(!live.error && live.ready && live.state === 'running' && live.ticks > 10,
      `${label}: live context runs the wasm worklet and the audio thread writes shared memory`
      + (live.error ? ` — ${live.error}` : ` (${live.ticks} blocks counted)`));
    if (errors.length) fail(`${label}: page errors — ${errors.join(' | ')}`);
  } finally {
    await browser.close();
  }
}

server.close();
console.log(failed ? `\nWASM WORKLET PROOF: ${failed} FAILED` : '\nWASM WORKLET PROOF: PASSED');
process.exit(failed ? 1 : 0);
