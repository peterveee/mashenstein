// The WebAssembly device probe — Stage 0 of docs/WASM-audio-engine-plan.md, for the
// browsers a headless test cannot stand in for: Mac Safari, iPhone Safari, and the game
// added to an iPhone Home Screen.
//
//   node tools/wasm-probe.js          https://MBP14.local:8040/
//
// Two pages, one question each:
//
//   /direct/  served WITH the cross-origin isolation headers — can this browser run a wasm
//             worklet, share memory with the audio thread, and run wasm in a worker that
//             sleeps on Atomics.wait? (Stage 4's whole mechanism.)
//   /sw/      served WITHOUT them, the way GitHub Pages serves the game; a service worker
//             adds the headers. Does isolation survive that — above all in the Home Screen
//             app? If not, multi-core on iOS needs a host that sends headers (§6.1).
//
// Each page posts its results back here; they are printed and appended to
// work/local/wasm-probe-results.jsonl. TLS from work/dev-cert/ (see build/build.js —
// mkcert, trusted on the phone once).
import { createServer } from 'node:https';
import { appendFileSync, readFileSync, mkdirSync } from 'node:fs';
import { hostname } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const esbuild = require('esbuild');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 8040;
const RESULTS = join(ROOT, 'work', 'local', 'wasm-probe-results.jsonl');
const CERT = join(ROOT, 'work', 'dev-cert');

const ISOLATION = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

const CLIENT = `
import {
  prepareWasmHello, createWasmHelloNode, helloWasmBytes, helloStart, helloReference,
} from ${JSON.stringify(join(ROOT, 'src/engine/mrdr3wasm/host.js'))};

const results = {};
const row = (k, v) => {
  results[k] = v;
  const tr = document.createElement('tr');
  const good = v === true || (typeof v === 'string' && /^ok\\b/.test(v));
  const bad = v === false || (typeof v === 'string' && /^(FAIL|error|no\\b)/i.test(v));
  tr.innerHTML = '<td>' + k + '</td><td class="' + (good ? 'g' : bad ? 'b' : '') + '">' + v + '</td>';
  document.querySelector('tbody').appendChild(tr);
};

const firstMessage = (node) => new Promise((resolve) => {
  node.port.onmessage = (e) => resolve(e.data);
  setTimeout(() => resolve({ type: 'timeout' }), 3000);
});

// A worker that instantiates the same wasm, renders a second of the tone, then sleeps on
// Atomics.wait until the page wakes it — the voice farm's loop, in miniature.
const WORKER = \`
onmessage = (e) => {
  const { bytes, start, frames, sab } = e.data;
  const ex = new WebAssembly.Instance(new WebAssembly.Module(bytes), {}).exports;
  ex.start(start.cosW, start.sinW, start.re, start.im);
  const view = new Float32Array(ex.memory.buffer, ex.block(), 128);
  const out = new Float32Array(frames);
  for (let i = 0; i < frames; i += 128) {
    const n = Math.min(128, frames - i);
    ex.render(n);
    out.set(view.subarray(0, n), i);
  }
  let waited = 'no SharedArrayBuffer';
  if (sab) {
    const flag = new Int32Array(sab);
    postMessage({ type: 'waiting' });
    waited = Atomics.wait(flag, 0, 0, 3000);
  }
  postMessage({ type: 'done', out, waited });
};
\`;

async function run() {
  document.querySelector('button').disabled = true;
  row('page', location.pathname);
  row('user agent', navigator.userAgent);
  row('home screen app', !!navigator.standalone || matchMedia('(display-mode: standalone)').matches);
  row('cores reported', navigator.hardwareConcurrency);
  row('secure context', isSecureContext);
  row('cross-origin isolated', !!self.crossOriginIsolated);
  const hasSab = typeof SharedArrayBuffer === 'function';
  row('SharedArrayBuffer', hasSab);

  // Offline: the bit-exact claim, on this device.
  try {
    const ctx = new OfflineAudioContext(2, 44100, 44100);
    if (!(await prepareWasmHello(ctx))) throw new Error('addModule failed');
    const node = createWasmHelloNode(ctx, { hz: 440, phase: 0.3 });
    const msg = firstMessage(node);
    node.connect(ctx.destination);
    const buf = await ctx.startRendering();
    const m = await msg;
    if (m.type !== 'ready') throw new Error(m.message || m.type);
    const ref = helloReference(44100, 440, 44100, 0.3);
    const ch = buf.getChannelData(0);
    let bad = 0;
    for (let i = 0; i < ch.length; i++) if (ch[i] !== ref[i]) bad++;
    row('offline wasm worklet == JS', bad === 0 ? 'ok, bit for bit' : 'FAIL: ' + bad + ' samples differ');
  } catch (e) { row('offline wasm worklet == JS', 'error: ' + e.message); }

  // Live, both ways of getting the code in, with shared memory if there is any. Audible:
  // a quiet tone for half a second each.
  for (const via of ['bytes', 'module']) {
    try {
      const ctx = new AudioContext();
      await ctx.resume();
      await prepareWasmHello(ctx);
      const sab = hasSab ? new SharedArrayBuffer(4) : null;
      const node = createWasmHelloNode(ctx, { hz: via === 'bytes' ? 440 : 660, via, sab });
      const msg = firstMessage(node);
      const g = ctx.createGain();
      g.gain.value = 0.08;
      node.connect(g).connect(ctx.destination);
      const m = await msg;
      await new Promise((r) => setTimeout(r, 500));
      const ticks = sab ? Atomics.load(new Int32Array(sab), 0) : null;
      await ctx.close();
      row('live worklet, via ' + via, m.type === 'ready' ? 'ok' : 'error: ' + (m.message || m.type));
      if (via === 'bytes') row('audio thread writes shared memory', sab ? (ticks > 10 ? 'ok, ' + ticks + ' blocks' : 'FAIL: ' + ticks) : 'no SharedArrayBuffer');
    } catch (e) { row('live worklet, via ' + via, 'error: ' + e.message); }
  }

  // The worker.
  try {
    const url = URL.createObjectURL(new Blob([WORKER], { type: 'application/javascript' }));
    const w = new Worker(url);
    const sab = hasSab ? new SharedArrayBuffer(4) : null;
    const done = new Promise((resolve, reject) => {
      w.onerror = (e) => reject(new Error(e.message || 'worker error'));
      w.onmessage = (e) => {
        if (e.data.type === 'waiting') setTimeout(() => { Atomics.store(new Int32Array(sab), 0, 1); Atomics.notify(new Int32Array(sab), 0); }, 100);
        else resolve(e.data);
      };
    });
    w.postMessage({ bytes: helloWasmBytes(), start: helloStart(44100, 440, 0.3), frames: 44100, sab });
    const r = await done;
    w.terminate();
    const ref = helloReference(44100, 440, 44100, 0.3);
    let bad = 0;
    for (let i = 0; i < ref.length; i++) if (r.out[i] !== ref[i]) bad++;
    row('wasm in a worker == JS', bad === 0 ? 'ok, bit for bit' : 'FAIL: ' + bad + ' samples differ');
    row('worker Atomics.wait woken by page', r.waited === 'ok' ? 'ok' : (r.waited === 'timed-out' ? 'FAIL: timed out' : r.waited));
  } catch (e) { row('wasm in a worker', 'error: ' + e.message); }

  try {
    await fetch('/report', { method: 'POST', body: JSON.stringify({ at: new Date().toISOString(), ...results }) });
    row('reported to the Mac', 'ok');
  } catch (e) { row('reported to the Mac', 'error: ' + e.message); }
}

document.querySelector('button').onclick = () => run().catch((e) => row('probe', 'error: ' + e.message));
`;

// The /sw/ page's worker: re-serve same-origin responses with the isolation headers.
const COI_SW = `
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(fetch(e.request).then((r) => {
    if (r.status === 0) return r;
    const h = new Headers(r.headers);
    h.set('Cross-Origin-Opener-Policy', 'same-origin');
    h.set('Cross-Origin-Embedder-Policy', 'require-corp');
    return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h });
  }));
});
`;

// Register, then reload once the worker controls the page — the first visit is never
// isolated. sessionStorage stops a loop where isolation never arrives.
const SW_BOOT = `
if (!self.crossOriginIsolated && navigator.serviceWorker) {
  const tries = Number(sessionStorage.getItem('coi-reloads') || 0);
  navigator.serviceWorker.register('./coi-sw.js', { scope: './' }).then(() => {
    if (tries < 2 && !navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(() => { sessionStorage.setItem('coi-reloads', tries + 1); location.reload(); });
    } else if (tries < 2) {
      sessionStorage.setItem('coi-reloads', tries + 1); location.reload();
    }
  });
}
`;

const page = (title, boot) => `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="WASM probe">
<title>${title}</title>
<style>
body{font:15px -apple-system,system-ui,sans-serif;margin:16px;background:#111;color:#eee}
button{font-size:20px;padding:12px 24px;margin:8px 0 16px}
table{border-collapse:collapse;width:100%}td{padding:6px 4px;border-bottom:1px solid #333;vertical-align:top;word-break:break-word}
td:first-child{color:#999;width:40%}.g{color:#6d6}.b{color:#f66}
a{color:#8cf}
</style>
${boot ? `<script>${boot}</script>` : ''}
</head><body>
<h2>${title}</h2>
<p><a href="/direct/">/direct/</a> (headers from the server) · <a href="/sw/">/sw/</a> (headers from a service worker, like GitHub Pages)</p>
<button>START</button>
<table><tbody></tbody></table>
<script src="../probe.js"></script>
</body></html>`;

const clientJs = (await esbuild.build({
  stdin: { contents: CLIENT, resolveDir: ROOT, loader: 'js' },
  bundle: true, format: 'iife', target: ['es2020', 'safari15'], write: false, logLevel: 'silent',
})).outputFiles[0].text;

mkdirSync(dirname(RESULTS), { recursive: true });

const server = createServer({
  key: readFileSync(join(CERT, 'key.pem')),
  cert: readFileSync(join(CERT, 'cert.pem')),
}, (req, res) => {
  const path = new URL(req.url, 'https://x').pathname;
  // Everything a page loads is same-origin, so CORP same-origin satisfies require-corp.
  const send = (type, body, extra = {}) => {
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store', 'Cross-Origin-Resource-Policy': 'same-origin', ...extra });
    res.end(body);
  };
  if (req.method === 'POST' && path === '/report') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      appendFileSync(RESULTS, body.replace(/\n/g, ' ') + '\n');
      const r = JSON.parse(body);
      console.log(`\n--- ${r.at} ${r.page} ${r['home screen app'] ? '(HOME SCREEN)' : ''}`);
      for (const [k, v] of Object.entries(r)) if (k !== 'at') console.log(`  ${k.padEnd(36)} ${v}`);
      send('text/plain', 'ok');
    });
    return;
  }
  if (path === '/probe.js') return send('application/javascript', clientJs);
  if (path === '/direct/') return send('text/html', page('WASM probe — direct', ''), ISOLATION);
  if (path === '/sw/') return send('text/html', page('WASM probe — service worker', SW_BOOT));
  if (path === '/sw/coi-sw.js') return send('application/javascript', COI_SW);
  if (path === '/') { res.writeHead(302, { location: '/direct/' }); return res.end(); }
  res.writeHead(404); res.end();
});

server.listen(PORT, '0.0.0.0', () => {
  const host = hostname().includes('.') ? hostname() : `${hostname()}.local`;
  console.log(`WASM probe on https://${host}:${PORT}/direct/ and https://${host}:${PORT}/sw/`);
  console.log(`results -> ${RESULTS}`);
});
