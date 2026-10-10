// Stage 1 of docs/WASM-audio-engine-plan.md: is MRDR-3's hot path cheaper in WebAssembly?
//
//   node tools/wasm-kernel-bench.js            Node, then headless Chromium and WebKit
//   node tools/wasm-kernel-bench.js --serve    the same bench as a page for the iPhone,
//                                              https://MBP14.local:8040/bench/
//
// The same kernel twice — tools/wasm-kernel-bench/kernel.c and kernel-js.js, the second
// built on the production MRDR-3 primitives — checked to agree sample for sample before
// any time is quoted, then timed:
//
//   node     direct calls, V8
//   worker   a dedicated Worker timing itself with performance.now — the cleanest timer a
//            browser offers, and the same JIT the audio thread gets
//   worklet  an OfflineAudioContext rendering through an AudioWorklet, wall time, minus
//            an empty processor's render so only the kernel is left
//
// Each is 10 s of audio, warm-up discarded, best of 5 round-robin (median beside it as the
// noise readout). The gate, frozen 10 Oct 2026 before the first run: WASM >= 1.5x faster
// than JS in WEBKIT. Offline and worker times are compute, not live audio-thread load —
// Stage 3 measures that.
//
// Also an anchor, Node only: the real Mrdr3Core rendering real presets, so the kernel's
// JS cost can be compared with what the shipping core pays.
import { createServer as createHttp } from 'node:http';
import { createServer as createHttps } from 'node:https';
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';
import { compileWasm } from './lib/wasm-cores.js';
import {
  KERNEL_JS_SOURCE, KERNEL_SHAPES, kernelPlan, kernelTable, loadWasmKernel,
} from './wasm-kernel-bench/kernel-js.js';

const require = createRequire(import.meta.url);
const esbuild = require('esbuild');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'work', 'local', 'wasm-kernel-bench.txt');
const SERVE = process.argv.includes('--serve');
const SECONDS = 10;
const REPS = 5;
const GATE = 1.5;

mkdirSync(dirname(OUT), { recursive: true });
const log = (line = '') => { console.log(line); appendFileSync(OUT, line + '\n'); };

const bytes = compileWasm(join(ROOT, 'tools/wasm-kernel-bench/kernel.c'));
const table = kernelTable();
const KernelJs = new Function(`${KERNEL_JS_SOURCE}\nreturn KernelJs;`)();

const best = (xs) => Math.min(...xs);
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const fmt = (ms) => ms.toFixed(1).padStart(7);

/** Render SECONDS through a kernel's render(128) and return ms per audio second. */
function timeKernel(make) {
  const k = make();
  const blocks = Math.ceil(SECONDS * 44100 / 128);
  const t0 = performance.now();
  for (let b = 0; b < blocks; b++) k.render(128);
  return (performance.now() - t0) / SECONDS;
}

const makeJs = (shape) => () => new KernelJs(kernelPlan(shape), table);
const makeWasm = (shape) => () => {
  const ex = new WebAssembly.Instance(new WebAssembly.Module(bytes), {}).exports;
  loadWasmKernel(ex, kernelPlan(shape), table);
  return ex;
};

/** The two kernels must agree before either is timed. */
function nullCheck(shape) {
  const js = makeJs(shape)();
  const ex = new WebAssembly.Instance(new WebAssembly.Module(bytes), {}).exports;
  const w = loadWasmKernel(ex, kernelPlan(shape), table);
  let worst = 0;
  for (let b = 0; b < Math.ceil(2 * 44100 / 128); b++) {
    js.render(128);
    ex.render(128);
    for (let i = 0; i < 128; i++) {
      worst = Math.max(worst, Math.abs(js.outL[i] - w.outL[i]), Math.abs(js.outR[i] - w.outR[i]));
    }
  }
  return worst;
}

// ---- the browser page: worker and worklet benches ----------------------------------------
const PAGE = `
import { KERNEL_JS_SOURCE, KERNEL_SHAPES, kernelPlan, kernelTable } from ${JSON.stringify(join(ROOT, 'tools/wasm-kernel-bench/kernel-js.js'))};

const SECONDS = ${SECONDS};
const REPS = ${REPS};
const bytes = Uint8Array.from(atob(window.__KERNEL_WASM), (c) => c.charCodeAt(0));
const table = kernelTable();

// The wasm loader, inline, because neither a worker made from a Blob nor a worklet can
// import. Same steps as loadWasmKernel.
const LOADER = \`
function loadWasm(bytes, plan, table) {
  var ex = new WebAssembly.Instance(new WebAssembly.Module(bytes), {}).exports;
  new Float32Array(ex.memory.buffer, ex.tablePtr(), table.length).set(table);
  ex.setup(plan.groups.length, plan.unison, plan.rate);
  plan.groups.forEach(function (s, g) {
    ex.setGroup(g, s.vibDepth, s.lFreq, s.lQ, s.lOct, s.lEnvCoef, s.gFreq, s.gQ, s.gOct, s.gEnvCoef,
      s.ampCoef, s.ampSus, s.vcaCoef, s.vcaSus, s.gain);
    s.voices.forEach(function (v, u) {
      ex.setVoice(g, u, v.hzNow, v.levelNow, v.phase, v.gain, v.panL, v.panR, v.vibRate, v.vibPhase);
    });
  });
  // A new object: an Instance's exports are frozen, and assigning to them throws in a
  // worklet (a module, so strict) and in a worker silently does nothing.
  return {
    render: ex.render,
    outL: new Float32Array(ex.memory.buffer, ex.outLPtr(), 128),
    outR: new Float32Array(ex.memory.buffer, ex.outRPtr(), 128),
  };
}
\`;

const WORKER = KERNEL_JS_SOURCE + LOADER + \`
onmessage = function (e) {
  var d = e.data;
  var k = d.mode === 'wasm' ? loadWasm(d.bytes, d.plan, d.table) : new KernelJs(d.plan, d.table);
  var blocks = Math.ceil(d.seconds * d.plan.rate / 128);
  var t0 = performance.now();
  for (var b = 0; b < blocks; b++) k.render(128);
  postMessage((performance.now() - t0) / d.seconds);
};
\`;

const PROCESSOR = KERNEL_JS_SOURCE + LOADER + \`
class KBench extends AudioWorkletProcessor {
  constructor(options) {
    super();
    var o = options.processorOptions;
    this.mode = o.mode;
    if (o.mode === 'wasm') this.k = loadWasm(o.bytes, o.plan, o.table);
    else if (o.mode === 'js') this.k = new KernelJs(o.plan, o.table);
  }
  process(inputs, outputs) {
    var out = outputs[0];
    if (this.mode === 'empty') return true;
    var n = out[0].length;
    this.k.render(n);
    out[0].set(this.k.outL.subarray(0, n));
    out[1].set(this.k.outR.subarray(0, n));
    return true;
  }
}
registerProcessor('kbench', KBench);
\`;

const workerUrl = URL.createObjectURL(new Blob([WORKER], { type: 'application/javascript' }));
const processorUrl = URL.createObjectURL(new Blob([PROCESSOR], { type: 'application/javascript' }));

async function inWorker(mode, plan) {
  const w = new Worker(workerUrl);
  const ms = await new Promise((resolve, reject) => {
    w.onmessage = (e) => resolve(e.data);
    w.onerror = (e) => reject(new Error(e.message));
    w.postMessage({ mode, plan, table, bytes, seconds: SECONDS });
  });
  w.terminate();
  return ms;
}

async function inWorklet(mode, plan) {
  const ctx = new OfflineAudioContext(2, SECONDS * plan.rate, plan.rate);
  await ctx.audioWorklet.addModule(processorUrl);
  const node = new AudioWorkletNode(ctx, 'kbench', {
    numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2],
    processorOptions: { mode, plan, table, bytes },
  });
  node.connect(ctx.destination);
  const t0 = performance.now();
  const buf = await ctx.startRendering();
  const ms = (performance.now() - t0) / SECONDS;
  // A processor whose constructor threw renders silence as fast as an empty one, and
  // would read as a free kernel. Refuse to time one.
  if (mode !== 'empty') {
    const ch = buf.getChannelData(0);
    let peak = 0;
    for (let i = 0; i < ch.length; i += 97) peak = Math.max(peak, Math.abs(ch[i]));
    if (!(peak > 1e-3)) throw new Error(mode + ' worklet rendered silence — the processor did not run');
  }
  return ms;
}

window.__bench = async (onRow) => {
  const rows = [];
  for (const shape of KERNEL_SHAPES) {
    const plan = kernelPlan({ ...shape, rate: 44100 });
    const t = { worker: { js: [], wasm: [] }, worklet: { empty: [], js: [], wasm: [] } };
    // Warm-up, discarded.
    await inWorker('js', plan); await inWorker('wasm', plan);
    await inWorklet('js', plan); await inWorklet('wasm', plan);
    for (let r = 0; r < REPS; r++) {
      for (const m of ['js', 'wasm']) t.worker[m].push(await inWorker(m, plan));
      for (const m of ['empty', 'js', 'wasm']) t.worklet[m].push(await inWorklet(m, plan));
    }
    const row = { shape: shape.name, ...t };
    rows.push(row);
    if (onRow) onRow(row);
  }
  return rows;
};
`;

const pageJs = (await esbuild.build({
  stdin: { contents: PAGE, resolveDir: ROOT, loader: 'js' },
  bundle: true, format: 'iife', target: ['es2020', 'safari15'], write: false, logLevel: 'silent',
})).outputFiles[0].text;

const summarise = (row) => {
  const b = (xs) => best(xs);
  const empty = b(row.worklet.empty);
  const wjs = b(row.worker.js), wwasm = b(row.worker.wasm);
  const ljs = b(row.worklet.js) - empty, lwasm = b(row.worklet.wasm) - empty;
  return { wjs, wwasm, ljs, lwasm, empty, wRatio: wjs / wwasm, lRatio: ljs / lwasm,
    noise: Math.max(median(row.worker.js) / wjs, median(row.worker.wasm) / wwasm) - 1 };
};

const printBrowserRows = (label, rows) => {
  log(`\n${label} — ms of compute per audio second (best of ${REPS}; worklet minus an empty render)`);
  log('  shape            worker js  worker wasm  ratio   worklet js  worklet wasm  ratio   noise');
  const ratios = [];
  for (const row of rows) {
    const s = summarise(row);
    ratios.push(s.wRatio, s.lRatio);
    log(`  ${row.shape.padEnd(15)} ${fmt(s.wjs)}    ${fmt(s.wwasm)}  ${s.wRatio.toFixed(2).padStart(5)}x  `
      + `${fmt(s.ljs)}     ${fmt(s.lwasm)}  ${s.lRatio.toFixed(2).padStart(5)}x  ±${(s.noise * 100).toFixed(0)}%`);
  }
  const geo = Math.exp(ratios.reduce((a, r) => a + Math.log(r), 0) / ratios.length);
  log(`  geometric mean ${geo.toFixed(2)}x, worst ${Math.min(...ratios).toFixed(2)}x`);
  return geo;
};

const pageHtml = (button) => '<!doctype html><meta charset="utf-8">'
  + '<meta name="viewport" content="width=device-width, initial-scale=1">'
  + '<style>body{font:14px -apple-system,system-ui,sans-serif;margin:16px;background:#111;color:#eee}'
  + 'button{font-size:20px;padding:12px 24px}pre{white-space:pre-wrap}</style>'
  + `<script>window.__KERNEL_WASM=${JSON.stringify(bytes.toString('base64'))}</script>`
  + `<script>${pageJs.replace(/<\/script>/gi, '<\\/script>')}</script>`
  + (button ? `<h3>WASM kernel bench</h3><p>Takes a few minutes. Keep the screen on.</p><button>START</button><pre></pre>
<script>
document.querySelector('button').onclick = async () => {
  document.querySelector('button').disabled = true;
  const pre = document.querySelector('pre');
  pre.textContent = 'running…\\n';
  const rows = await window.__bench((r) => { pre.textContent += r.shape + ' done\\n'; });
  await fetch('/report', { method: 'POST', body: JSON.stringify({ ua: navigator.userAgent, rows }) });
  pre.textContent += 'sent to the Mac';
};
</script>` : '');

if (SERVE) {
  const CERT = join(ROOT, 'work', 'dev-cert');
  const server = createHttps({
    key: readFileSync(join(CERT, 'key.pem')), cert: readFileSync(join(CERT, 'cert.pem')),
  }, (req, res) => {
    const path = new URL(req.url, 'https://x').pathname;
    if (req.method === 'POST' && path === '/report') {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        const r = JSON.parse(body);
        log(`\n=== device: ${r.ua}  (${new Date().toISOString()})`);
        printBrowserRows('device', r.rows);
        res.writeHead(200); res.end('ok');
      });
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'no-store' });
    res.end(pageHtml(true));
  });
  server.listen(8040, '0.0.0.0', () => {
    const host = hostname().includes('.') ? hostname() : `${hostname()}.local`;
    console.log(`kernel bench page on https://${host}:8040/bench/ — results -> ${OUT}`);
  });
} else {
  log(`\n######## WASM kernel bench ${new Date().toISOString()} — gate: WASM >= ${GATE}x JS in WebKit`);

  // ---- agreement first -------------------------------------------------------------------
  for (const shape of KERNEL_SHAPES) {
    const worst = nullCheck(shape);
    log(`null ${shape.name}: JS vs WASM max difference ${worst.toExponential(2)}`);
    if (worst > 1e-6) { log('  kernels disagree — no times quoted'); process.exit(1); }
  }

  // ---- Node --------------------------------------------------------------------------------
  log(`\nnode ${process.version} — ms per audio second (best of ${REPS}, round robin)`);
  log('  shape                js       wasm   ratio   noise');
  for (const shape of KERNEL_SHAPES) {
    timeKernel(makeJs(shape)); timeKernel(makeWasm(shape));
    const t = { js: [], wasm: [] };
    for (let r = 0; r < REPS; r++) {
      t.js.push(timeKernel(makeJs(shape)));
      t.wasm.push(timeKernel(makeWasm(shape)));
    }
    const noise = Math.max(median(t.js) / best(t.js), median(t.wasm) / best(t.wasm)) - 1;
    log(`  ${shape.name.padEnd(15)} ${fmt(best(t.js))}  ${fmt(best(t.wasm))}  ${(best(t.js) / best(t.wasm)).toFixed(2).padStart(5)}x  ±${(noise * 100).toFixed(0)}%`);
  }

  // ---- the anchor: the real JS core on real presets ----------------------------------------
  const { VOICES } = await import('../src/data/voices.js');
  const { compileMrdr3, mrdr3Colours } = await import('../src/engine/mrdr3/compile.js');
  const { mrdr3NoiseSet } = await import('../src/engine/mrdr3/noise.js');
  const { renderMrdr3, frameAt } = await import('../src/engine/mrdr3/dsp.js');
  const { mrdr3Tables } = await import('../src/engine/mrdr3/tables.js');
  const tables = mrdr3Tables();
  const noise = mrdr3NoiseSet(44100, mrdr3Colours(VOICES));
  log('\nanchor — the shipping JS core (Mrdr3Core) in Node, same note counts, ms per audio second');
  for (const [id, notes] of [['bestVowelPad', 6], ['mrdrViolinSection', 8], ['bestClassicMono', 1]]) {
    const { patch } = compileMrdr3(VOICES[id]);
    const hz = [110, 138.59, 164.81, 220, 277.18, 329.63, 440, 554.37].slice(0, notes);
    const events = [{ type: 'noteOn', frame: 0, eventId: 1, hz, durFrames: frameAt(SECONDS, 44100), velocity: 1 }];
    const run = () => {
      const t0 = performance.now();
      renderMrdr3({ events, seconds: SECONDS, sampleRate: 44100, channels: 2, patch, tables, noise });
      return (performance.now() - t0) / SECONDS;
    };
    run();
    const ts = [];
    for (let r = 0; r < 3; r++) ts.push(run());
    log(`  ${id.padEnd(20)} ${notes} notes  ${fmt(best(ts))}`);
  }

  // ---- headless browsers -------------------------------------------------------------------
  const { chromium, webkit } = require('playwright');
  const server = createHttp((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(pageHtml(false));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = `http://localhost:${server.address().port}/`;
  let webkitGeo = null;
  for (const [label, type] of [['chromium', chromium], ['webkit', webkit]]) {
    const browser = await type.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(url);
      const rows = await page.evaluate(() => window.__bench());
      const geo = printBrowserRows(`${label} ${browser.version()}`, rows);
      if (label === 'webkit') webkitGeo = geo;
    } finally {
      await browser.close();
    }
  }
  server.close();
  log(`\nGATE (WASM >= ${GATE}x JS in WebKit, geometric mean): ${webkitGeo >= GATE ? 'PASSED' : 'MISSED'} at ${webkitGeo.toFixed(2)}x`);
}
