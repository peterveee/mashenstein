/*
 * The MRDR-3 voice farm — Stage 4 of docs/WASM-audio-engine-plan.md.
 *
 * A farm lane renders the same core in a worker that a worklet lane renders on the audio
 * thread, from the same events stamped with the same frames. So, played live side by side
 * through the controller, the two must be SAMPLE-IDENTICAL — not similar — for as long as
 * the farm keeps ahead of the clock. That is the claim, in both engines:
 *
 *   1. a farm lane and a worklet lane, same preset, same notes, live: identical output
 *   2. no underruns while doing it
 *   3. the controller's health probe reaches the worker and reports the ring
 *   4. a released lane stops being rendered
 *
 * Served from a real localhost server with the isolation headers: SharedArrayBuffer
 * needs them, and a `page.route` page in WebKit leaves it undefined.
 */
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { chromium, webkit } = require('playwright');
const esbuild = require('esbuild');

let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg));

const ENTRY = `
import { VOICES } from ${JSON.stringify(join(ROOT, 'src/data/voices.js'))};
import {
  mrdr3Lane, mrdr3NoteOn, mrdr3Health, releaseMrdr3Lane,
} from ${JSON.stringify(join(ROOT, 'src/engine/mrdr3/controller.js'))};
import { setMrdrFarm, setMrdrFarmWorkers, canHostMrdr3Farm } from ${JSON.stringify(join(ROOT, 'src/engine/mrdr3/farm.js'))};

const RECORDER = \`
class Rec extends AudioWorkletProcessor {
  constructor(o) { super(); this.from = o.processorOptions.from; this.n = o.processorOptions.n;
    this.a = new Float32Array(this.n); this.b = new Float32Array(this.n); this.done = false; }
  process(inputs) {
    if (this.done) return false;
    var f = currentFrame;
    for (var k = 0; k < 2; k++) {
      var ch = inputs[k] && inputs[k][0];
      var dst = k ? this.b : this.a;
      for (var i = 0; i < 128; i++) {
        var j = f + i - this.from;
        if (j >= 0 && j < this.n) dst[j] = ch ? ch[i] : 0;
      }
    }
    if (f + 128 >= this.from + this.n) { this.done = true; this.port.postMessage({ a: this.a, b: this.b }); return false; }
    return true;
  }
}
registerProcessor('rec', Rec);\`;

window.__run = async ({ voiceId, seconds }) => {
  const ctx = new AudioContext();
  await ctx.resume();
  const sink = ctx.createGain();
  sink.gain.value = 0;
  sink.connect(ctx.destination);
  if (!canHostMrdr3Farm(ctx)) return { error: 'cannot host the farm (isolated: ' + self.crossOriginIsolated + ')' };
  const voice = VOICES[voiceId];
  setMrdrFarm(false);
  const aw = await mrdr3Lane(ctx, 'aw', { voice, voices: VOICES });
  setMrdrFarm(true);
  setMrdrFarmWorkers(2);
  const farm = await mrdr3Lane(ctx, 'farm', { voice, voices: VOICES });
  setMrdrFarm(false);
  if (!farm.farm) return { error: 'the farm lane is not on the farm' };
  await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([RECORDER], { type: 'application/javascript' })));
  const rate = ctx.sampleRate;
  const t0 = ctx.currentTime + 0.4;
  const from = Math.round(t0 * rate);
  const n = Math.round(seconds * rate);
  const rec = new AudioWorkletNode(ctx, 'rec', { numberOfInputs: 2, numberOfOutputs: 1, outputChannelCount: [1],
    processorOptions: { from, n } });
  aw.node.connect(rec, 0, 0);
  farm.node.connect(rec, 0, 1);
  rec.connect(sink);
  const got = new Promise((r) => { rec.port.onmessage = (e) => r(e.data); });
  // A chord, a line, overlapping — the same events to both lanes, same ids.
  const chords = [[220, 277.18, 329.63], [196, 246.94, 293.66], [174.61, 220, 261.63]];
  let id = 1;
  for (let i = 0; i < Math.floor(seconds / 0.5); i++) {
    const at = t0 + i * 0.5;
    const hz = i % 3 === 2 ? 440 * Math.pow(2, (i % 7) / 12) : chords[i % 3];
    for (const lane of [aw, farm]) mrdr3NoteOn(lane, { at, hz, durSeconds: 0.45, eventId: id });
    id++;
  }
  const { a, b } = await got;
  let diff = 0, peak = 0;
  for (let i = 0; i < n; i++) { diff = Math.max(diff, Math.abs(a[i] - b[i])); peak = Math.max(peak, Math.abs(a[i])); }
  const health = await mrdr3Health(farm, 1000);
  releaseMrdr3Lane(ctx, 'farm');
  // The stop is a message: give the worker a moment to read it, then watch.
  await new Promise((r) => setTimeout(r, 150));
  const before = farm.farm.header[0];
  await new Promise((r) => setTimeout(r, 300));
  const after = farm.farm.header[0];
  await ctx.close();
  return { diff, peak, health, stoppedAdvancing: after === before };
};
`;

const bundle = (await esbuild.build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
  bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
})).outputFiles[0].text;
const html = '<!doctype html><meta charset="utf-8">'
  + `<script>${bundle.replace(/<\/script>/gi, '<\\/script>')}<\/script>`;
const server = createServer((req, res) => {
  res.writeHead(200, {
    'content-type': 'text/html',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  });
  res.end(html);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://localhost:${server.address().port}/`;

for (const [label, type, args] of [
  ['chromium', chromium, ['--mute-audio', '--autoplay-policy=no-user-gesture-required']],
  ['webkit', webkit, []],
]) {
  const browser = await type.launch({ headless: true, args });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(url);
    for (const voiceId of ['bestVowelPad', 'bestClassicMono']) {
      const r = await page.evaluate((a) => window.__run(a), { voiceId, seconds: 3 });
      if (r.error) { fail(`${label} ${voiceId}: ${r.error}`); continue; }
      assert(r.peak > 0.01 && r.diff === 0,
        `${label} ${voiceId}: farm lane equals the worklet lane sample for sample, live (peak ${r.peak.toFixed(3)}, max diff ${r.diff})`);
      assert(r.health?.farm && r.health.farm.underruns === 0,
        `${label} ${voiceId}: no underruns (${JSON.stringify(r.health?.farm)})`);
      assert(r.health?.type === 'health' && r.health.groups >= 0,
        `${label} ${voiceId}: the health probe reaches the worker`);
      assert(r.stoppedAdvancing, `${label} ${voiceId}: a released lane stops being rendered`);
    }
    if (errors.length) fail(`${label}: page errors — ${errors.join(' | ')}`);
  } finally {
    await browser.close();
  }
}
server.close();

console.log(failed ? `\nMRDR-3 FARM: ${failed} FAILED` : '\nMRDR-3 FARM: PASSED');
process.exit(failed ? 1 : 0);
