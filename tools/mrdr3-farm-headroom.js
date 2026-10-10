// Live audio-thread load with MRDR-3 rendered three ways — Stage 4 of
// docs/WASM-audio-engine-plan.md.
//
//   node tools/mrdr3-farm-headroom.js [--browser=webkit|chromium] [--backends=native,worklet,farm]
//        [--seconds=N] [--ahead=FRAMES] [--workers=N] [--desktop] <song id> …
//   node tools/mrdr3-farm-headroom.js --serve [--backends=…] [--seconds=N] <song id> …
//        the same, as a page for the iPhone: https://MBP14.local:8040/ — one tap per run
//        (a reload between runs gives each a fresh context, and iOS wants a tap to start
//        audio); results print here and go to work/local/mrdr3-farm-device.txt
//
//   native-phone  native at MRDR_QUALITY.PHONE — what a phone plays today, for reference
//
//   native   MRDR-3 as the game ships it: a node graph per note (`_playLayer`)
//   worklet  the JS core on the audio thread (MRDR-3 AW)
//   farm     the same core in workers, the audio thread only copying (src/engine/mrdr3/farm.js)
//
// Two methods for the audio thread, one per engine:
//
//   WebKit    work/local/_live-headroom-webkit.mjs's burner: a worklet INSIDE the audio thread
//             spins a counted loop each quantum and backs off whenever the thread falls
//             behind the wall clock, so the burn an empty context sustains against the burn a
//             song leaves room for is that song's load. It measures HEADROOM, so anything else
//             competing for the Mac's cores — other sessions, and the farm's own workers —
//             shows up in it. ±5–10 points.
//   Chromium  work/local/_live-headroom.mjs's trace: CDP's `webaudio` category, summing every
//             RealtimeAudioDestinationHandler::Render on the audio thread — the WORK the audio
//             thread does, per wall second. ±1 point, and blind to contention.
//
// Plus, for the farm, what neither can see:
//
//   underruns   blocks a ring reader found unwritten — each one is a dropout
//   lead        the tightest margin (frames) the workers kept ahead of the clock
//   workers     ms of rendering per audio second, summed over the farm's workers — the
//               CPU the farm moved off the audio thread, which still costs battery
//
// The game's phone setup by default (latencyHint 0.05, no capture, no metering) — WebKit
// is standing in for an iPhone. MRDR-3 quality is left at FULL for every backend so the
// three render the same patch; native's PHONE tier is a separate economy.
//
// Served from a real localhost server with the isolation headers, not page.route: WebKit
// leaves SharedArrayBuffer undefined on a routed page. Needs a quiet machine; the load
// average is printed so a busy run can be recognised.
import { createServer } from 'node:http';
import { createServer as createHttps } from 'node:https';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { hostname, loadavg } from 'node:os';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { songBars } from '../src/engine/lanes.js';
import { applyArrangement } from '../src/data/arrangements.js';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (k) => {
  const a = args.find((x) => x === `--${k}` || x.startsWith(`--${k}=`));
  return a ? (a.includes('=') ? a.split('=')[1] : true) : null;
};
const ids = args.filter((a) => !a.startsWith('--'));
const BROWSER = flag('browser') || 'webkit';
const BACKENDS = (flag('backends') || 'native,worklet,farm').split(',');
const PHONE = !flag('desktop');
const SECONDS = flag('seconds') ? Number(flag('seconds')) : 90;
const AHEAD = flag('ahead') ? Number(flag('ahead')) : null;
const WORKERS = flag('workers') ? Number(flag('workers')) : null;
const TRACE = BROWSER === 'chromium';
const SERVE = !!flag('serve');

if (!ids.length) {
  console.log('usage: node tools/mrdr3-farm-headroom.js [--browser=webkit|chromium] [--backends=native,worklet,farm] <song id> …');
  process.exit(1);
}

const BURN = `
class Burn extends AudioWorkletProcessor {
  constructor(o) {
    super();
    this.iters = o.processorOptions.start | 0; this.acc = 0.5;
    this.winFrame = -1; this.winWall = 0; this.cool = 0;
  }
  process() {
    let x = this.acc;
    for (let i = 0; i < this.iters; i++) x = Math.sqrt(x + 1.2345);
    this.acc = x;
    const now = Date.now();
    if (this.winFrame < 0) { this.winFrame = currentFrame; this.winWall = now; return true; }
    const frames = currentFrame - this.winFrame;
    if (frames >= sampleRate / 2) {
      const ratio = (frames / sampleRate * 1000) / Math.max(1, now - this.winWall);
      const behind = ratio < 0.985;
      if (behind) { this.iters = Math.max(1, this.iters * 0.8); this.cool = 2; }
      else if (this.cool > 0) this.cool--;
      else this.iters = this.iters * 1.04;
      this.iters = Math.round(this.iters);
      this.port.postMessage({ at: currentTime, iters: this.iters, ratio, behind });
      this.winFrame = currentFrame; this.winWall = now;
    }
    return true;
  }
}
registerProcessor('burn', Burn);`;

// SILENT. A live context in headless WebKit or Chromium plays through the Mac's speakers,
// and these runs are minutes of music. Every connect() to the destination is redirected
// through one gain-0 node, installed before the page's own code runs: a gain at 0 still
// pulls and renders the whole graph, so the load numbers are unchanged — unlike muting the
// engine, which skips work (perf rules). The device page gets it too.
const SILENT_SINK = `(() => { const orig = AudioNode.prototype.connect; const sinks = new WeakMap();
  AudioNode.prototype.connect = function (dest, ...rest) {
    if (dest instanceof AudioDestinationNode) { const ctx = dest.context; let s = sinks.get(ctx);
      if (!s) { s = ctx.createGain(); s.gain.value = 0; orig.call(s, dest); sinks.set(ctx, s); }
      return orig.call(this, s, ...rest); }
    return orig.call(this, dest, ...rest); }; })();`;

const ENTRY = `
import { Audio } from ${JSON.stringify(join(ROOT, 'src/engine/audio.js'))};
import { setMrdrComparisonBackend } from ${JSON.stringify(join(ROOT, 'src/engine/mrdr3/identity.js'))};
import { setMrdrFarm, setMrdrFarmAhead, setMrdrFarmWorkers, mrdr3FarmCpu } from ${JSON.stringify(join(ROOT, 'src/engine/mrdr3/farm.js'))};
import { mrdr3FarmReport } from ${JSON.stringify(join(ROOT, 'src/engine/mrdr3/controller.js'))};
window.__samples = [];
window.__go = async ({ bank, mix, arrangement, phone, start, backend, ahead, workers, burn }) => {
  const native = backend === 'native' || backend === 'native-phone';
  if (backend === 'native-phone') Audio.setMrdrQuality('phone');
  setMrdrComparisonBackend(native ? 'native' : 'worklet');
  setMrdrFarm(backend === 'farm');
  if (ahead) setMrdrFarmAhead(ahead);
  if (workers) setMrdrFarmWorkers(workers);
  Audio.setMixerMeteringEnabled(false);
  Audio.setCaptureEnabled(!phone);
  if (phone) Audio.setLatencyHint(0.05);
  Audio.ensure(); try { await Audio.ctx.resume(); } catch (e) {}
  if (Audio.mixer) await Audio.mixer.ready;
  const ctx = Audio.ctx;
  if (burn) {
    await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([${JSON.stringify(BURN)}], { type: 'application/javascript' })));
    const node = new AudioWorkletNode(ctx, 'burn', { numberOfInputs: 0, outputChannelCount: [1], processorOptions: { start } });
    node.port.onmessage = (e) => window.__samples.push(e.data);
    const g = ctx.createGain(); g.gain.value = 0; node.connect(g); g.connect(ctx.destination);
  }
  // A second layer under the silent sink: the master fader nearly shut, which still renders.
  Audio.setVolumes?.({ master: 1e-5 });
  if (bank) { Audio.setBank(bank, mix ?? null); if (arrangement) Audio.setArrangement(arrangement); }
  return { state: ctx.state, sampleRate: ctx.sampleRate, isolated: !!self.crossOriginIsolated, cores: navigator.hardwareConcurrency };
};
window.__farm = () => {
  const ctx = Audio.ctx;
  return { ring: mrdr3FarmReport(ctx), cpu: mrdr3FarmCpu(ctx), t: ctx.currentTime };
};`;

const esbuild = require('esbuild');
const built = await esbuild.build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
  bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
});
const html = `<!doctype html><meta charset="utf-8"><script>${SILENT_SINK}</script><script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}</script>`;
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const pct = (v) => `${Math.round(v * 100)}%`.padStart(5);

if (SERVE) {
  // ---- the device page ----------------------------------------------------------------
  const OUT = join(ROOT, 'work', 'local', 'mrdr3-farm-device.txt');
  const songs = {};
  for (const id of ids) {
    const { song, seconds } = await loadSong(id);
    songs[id] = { bank: song.bank, mix: song.mix ?? null, arrangement: song.arrangement ?? null, seconds };
  }
  const runs = [{ id: null, backend: 'calibrate', seconds: 40 }];
  for (const id of ids) for (const backend of BACKENDS) runs.push({ id, backend, seconds: Math.min(songs[id].seconds, SECONDS) });
  let full = null;
  const DRIVER = `
const RUNS = ${JSON.stringify(runs)};
const SONGS = ${JSON.stringify(songs)};
const k = Number(new URLSearchParams(location.search).get('run') || 0);
const el = (t) => document.body.appendChild(Object.assign(document.createElement('p'), { textContent: t }));
if (k >= RUNS.length) { el('All runs done — results are on the Mac.'); }
else {
  const run = RUNS[k];
  el('Run ' + (k + 1) + ' of ' + RUNS.length + ': ' + (run.id || 'empty context') + ' — ' + run.backend + ', ' + Math.round(run.seconds) + ' s. Keep the screen on.');
  const b = document.body.appendChild(Object.assign(document.createElement('button'), { textContent: 'TAP TO RUN' }));
  // Fetched now, not in the tap: iOS only lets a tap start audio if nothing awaits first.
  let cal = {};
  fetch('/calibration').then((r) => r.json()).then((c) => { cal = c; });
  b.onclick = async () => {
    b.disabled = true;
    const song = run.id ? SONGS[run.id] : null;
    const info = await window.__go({ bank: song?.bank ?? null, mix: song?.mix, arrangement: song?.arrangement ?? null,
      phone: true, start: cal.full ? Math.round(cal.full * 0.5) : 200000, backend: run.backend === 'calibrate' ? 'native' : run.backend, burn: true });
    el('running… isolated ' + info.isolated + ', ' + info.cores + ' cores');
    await new Promise((r) => setTimeout(r, 6000));
    const f0 = window.__farm();
    await new Promise((r) => setTimeout(r, run.seconds * 1000 - 6000));
    const f1 = window.__farm();
    await fetch('/report', { method: 'POST', body: JSON.stringify({ k, run, info, f0, f1, samples: window.__samples, ua: navigator.userAgent }) });
    location.href = '?run=' + (k + 1);
  };
}`;
  const pageHtml = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{font:16px -apple-system,system-ui,sans-serif;margin:16px;background:#111;color:#eee}button{font-size:22px;padding:14px 28px}</style><body>
<script>${SILENT_SINK}</script><script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}</script><script>${DRIVER.replace(/<\/script>/gi, '<\\/script>')}</script>`;
  const CERT = join(ROOT, 'work', 'dev-cert');
  const dev = createHttps({ key: readFileSync(join(CERT, 'key.pem')), cert: readFileSync(join(CERT, 'cert.pem')) }, (req, res) => {
    const path = new URL(req.url, 'https://x').pathname;
    const iso = { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp', 'cache-control': 'no-store' };
    if (path === '/calibration') { res.writeHead(200, { 'content-type': 'application/json', ...iso }); res.end(JSON.stringify({ full })); return; }
    if (req.method === 'POST' && path === '/report') {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        const r = JSON.parse(body);
        const log = (line) => { console.log(line); appendFileSync(OUT, line + '\n'); };
        if (r.run.backend === 'calibrate') {
          const steady = r.samples.filter((x) => x.at > 15);
          full = median(steady.map((x) => x.iters));
          log(`\n=== ${r.ua}  ${new Date().toISOString()}\n  ${r.info.cores} cores, isolated ${r.info.isolated}; empty-context burn ${full}`);
        } else {
          const s = r.samples.filter((x) => x.at > 6);
          const med = 1 - median(s.map((x) => x.iters)) / full;
          let worst = -Infinity;
          for (let i = 7; i < s.length; i++) worst = Math.max(worst, 1 - median(s.slice(i - 7, i + 1).map((x) => x.iters)) / full);
          let farm = '';
          if (r.run.backend === 'farm') {
            const busy = (r.f1.cpu || []).reduce((a, w) => a + w.busyMs, 0) - (r.f0.cpu || []).reduce((a, w) => a + w.busyMs, 0);
            farm = `  underruns ${r.f1.ring.underruns}, min lead ${r.f1.ring.worstLead ?? '-'}, workers ${(busy / (r.f1.t - r.f0.t)).toFixed(0)} ms/s (${(r.f1.cpu || []).map((w) => w.lanes).join('+')} lanes)`;
          }
          log(`  ${r.run.id.padEnd(34)} ${r.run.backend.padEnd(12)} audio thread median ${pct(med)}  worst4s ${pct(worst)}${farm}`);
        }
        res.writeHead(200, iso); res.end('ok');
      });
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html', ...iso });
    res.end(pageHtml);
  });
  dev.listen(8040, '0.0.0.0', () => {
    const host = hostname().includes('.') ? hostname() : `${hostname()}.local`;
    console.log(`farm headroom page on https://${host}:8040/ — ${runs.length} runs, one tap each; results -> ${OUT}`);
  });
  await new Promise(() => {});
}

const server = createServer((req, res) => {
  res.writeHead(200, {
    'content-type': 'text/html',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  });
  res.end(html);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const URL_ = `http://localhost:${server.address().port}/`;

const pw = require('playwright');
const launch = () => pw[BROWSER].launch({
  headless: true,
  args: BROWSER === 'chromium' ? ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] : [],
});
let browser = await launch();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function loadSong(id) {
  const file = ['src/data/songs', 'src/data/imported'].map((d) => join(ROOT, d, `${id}.js`)).find(existsSync);
  if (!file) throw new Error(`no song ${id}`);
  const song = await import(pathToFileURL(file).href);
  const bank = applyArrangement(song.bank, id, song.arrangement ? { [id]: song.arrangement } : {});
  return { song, seconds: songBars(bank).length * 240 / (song.arrangement?.bpm || song.bank.bpm) };
}

async function run(song, seconds, start, backend) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(SILENT_SINK);
  await page.goto(URL_);
  let cdp = null;
  const events = [];
  let traced = null;
  if (TRACE) {
    cdp = await page.context().newCDPSession(page);
    cdp.on('Tracing.dataCollected', (e) => { for (const ev of e.value) if (ev.ph === 'X' || ev.name === 'thread_name') events.push(ev); });
    traced = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
    await cdp.send('Tracing.start', { traceConfig: { includedCategories: ['webaudio', 'audio'] }, transferMode: 'ReportEvents' });
  }
  const info = await page.evaluate((a) => window.__go(a), {
    bank: song?.bank ?? null, mix: song?.mix, arrangement: song?.arrangement ?? null,
    phone: PHONE, start, backend, ahead: AHEAD, workers: WORKERS, burn: !TRACE,
  });
  if (info.state !== 'running') throw new Error(`context is ${info.state}`);
  // Farm CPU is read across the measured stretch only, as the burner's samples are.
  await sleep(6000);
  const f0 = await page.evaluate(() => window.__farm());
  await sleep(Math.max(0, seconds * 1000 - 6000));
  const f1 = await page.evaluate(() => window.__farm());
  const samples = await page.evaluate(() => window.__samples);
  let loads = null;
  if (TRACE) {
    await cdp.send('Tracing.end');
    await traced;
    const threads = new Map();
    for (const e of events) if (e.name === 'thread_name') threads.set(`${e.pid}:${e.tid}`, e.args.name);
    const renders = events.filter((e) => e.name === 'RealtimeAudioDestinationHandler::Render'
      && /Realtime AudioWorklet/.test(threads.get(`${e.pid}:${e.tid}`) || ''));
    if (!renders.length) throw new Error('no render events traced');
    const t0 = renders[0].ts;
    const win = new Map();
    for (const e of renders) { const k = Math.floor((e.ts - t0) / 1e6); win.set(k, (win.get(k) || 0) + e.dur); }
    loads = [...win].filter(([k]) => k >= 6 && k < Math.floor(seconds) - 1).map(([, us]) => us / 1e6);
  }
  await page.close();
  return { samples, errors, info, f0, f1, loads };
}

try {
  const cal = await run(null, TRACE ? 15 : 40, 200000, 'native');
  let full = null;
  console.log(`${BROWSER} ${browser.version()}${PHONE ? ' (phone setup)' : ' (desktop setup)'}, ${cal.info.cores} cores, isolated ${cal.info.isolated}, load average ${loadavg()[0].toFixed(1)}`);
  if (TRACE) {
    console.log(`  method: trace of the audio thread's own render time; empty context ${pct(median(cal.loads))}`);
  } else {
    const calSteady = cal.samples.filter((s) => s.at > 15);
    full = median(calSteady.map((s) => s.iters));
    const behindShare = calSteady.filter((s) => s.behind).length / Math.max(1, calSteady.length);
    console.log(`  method: burner; empty-context burn ${full} iters/quantum, behind in ${(behindShare * 100).toFixed(0)}% of windows`
      + `${behindShare < 0.1 ? '  <- calibration may not have found the edge' : ''}`);
  }
  console.log(`  ${'song'.padEnd(36)} ${'backend'.padEnd(8)} audio thread: median  worst4s   underruns  min lead  workers ms/s`);
  for (const id of ids) {
    const { song, seconds } = await loadSong(id);
    for (const backend of BACKENDS) {
      let r;
      try {
        r = await run(song, Math.min(seconds, SECONDS), Math.round((full || 0) * 0.5), backend);
      } catch (e) {
        console.log(`  ${id.padEnd(36)} ${backend.padEnd(8)} CRASHED: ${String(e.message).split('\n')[0]}`);
        try { await browser.close(); } catch { /* gone */ }
        browser = await launch();
        continue;
      }
      let med;
      let worst = -Infinity;
      if (TRACE) {
        med = median(r.loads);
        // The worst 4 s, as the burner reports it: the highest 4-second mean.
        for (let i = 3; i < r.loads.length; i++) worst = Math.max(worst, (r.loads[i] + r.loads[i - 1] + r.loads[i - 2] + r.loads[i - 3]) / 4);
      } else {
        const s = r.samples.filter((x) => x.at > 6);
        med = 1 - median(s.map((x) => x.iters)) / full;
        for (let i = 7; i < s.length; i++) worst = Math.max(worst, 1 - median(s.slice(i - 7, i + 1).map((x) => x.iters)) / full);
      }
      let farm = '';
      if (backend === 'farm') {
        const ring = r.f1.ring;
        const dt = r.f1.t - r.f0.t;
        const busy = (r.f1.cpu || []).reduce((a, w) => a + w.busyMs, 0) - (r.f0.cpu || []).reduce((a, w) => a + w.busyMs, 0);
        const lanes = (r.f1.cpu || []).map((w) => w.lanes).join('+');
        farm = `${String(ring.underruns).padStart(9)}  ${String(ring.worstLead ?? '-').padStart(8)}  ${(busy / dt).toFixed(0).padStart(6)} (${lanes} lanes)`;
        if (!ring.lanes) farm += '  <- NO FARM LANES';
        const rate = r.info.sampleRate;
        for (const l of ring.perLane || []) {
          farm += `\n      ${l.key}: ${l.underruns} underruns, first at ${(l.first / rate).toFixed(2)} s, last at ${(l.last / rate).toFixed(2)} s (lane began ${(l.start / rate).toFixed(2)} s); slowest block ${l.slowestBlockMs.toFixed(1)} ms at ${(l.slowestAt / rate).toFixed(2)} s, longest gap between fills ${l.longestGapMs.toFixed(1)} ms`;
        }
      }
      console.log(`  ${id.padEnd(36)} ${backend.padEnd(8)}               ${pct(med)}    ${pct(worst)}   ${farm}`
        + `${r.errors.length ? `   errors: ${r.errors[0].slice(0, 120)}` : ''}`);
    }
  }
} finally {
  await browser.close();
  server.close();
}
