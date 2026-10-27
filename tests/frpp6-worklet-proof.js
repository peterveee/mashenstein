/*
 * The FRPP-6 AudioWorklet proof — TNGR-2's §3 gate (tests/tngr2-worklet-proof.js), run
 * through FRPP-6's REAL controller rather than a proof processor, and held to one claim
 * TNGR-2's does not make: the worklet renders the SAME SAMPLES as the Node reference
 * renderer the Stage 0 tests and auditions were measured on.
 *
 *   1. a live AudioContext registers the module, builds a lane, and runs it
 *   2. an OfflineAudioContext renders it non-silent and finite at 44.1k and 48k
 *   3. silence before the first note, which starts after time zero
 *   4. two renders of one buffer agree within 5e-6
 *   5. stems sum to the mix within 5e-6
 *   6. a panic silences what sounds and what is queued
 *   7. the worklet matches renderFrpp6 in Node within 5e-6
 *   8. all of it again from the minified production bundle, in Chromium and in WebKit
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderFrpp6 } from '../src/engine/frpp6/dsp.js';
import { compileFrpp6 } from '../src/engine/frpp6/tables.js';
import { FRPP6_CANDIDATES } from '../tools/lib/frpp6-candidates.js';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// With SUB on, so the worklet proves the sub's oscillator and its measured scale too.
const VOICE = { ...FRPP6_CANDIDATES.funkRhythm, vibrato: { depth: 0.1, rate: 5 },
  frpp6: { ...FRPP6_CANDIDATES.funkRhythm.frpp6,
    string: { ...FRPP6_CANDIDATES.funkRhythm.frpp6.string, sub: 0.4 } } };

const ENTRY = `
import { renderFrpp6Lane, frpp6Lane, frpp6NoteOn, canHostFrpp6, frameAt }
  from ${JSON.stringify(join(ROOT, 'src/engine/frpp6/controller.js'))};
const VOICE = ${JSON.stringify(VOICE)};
const chans = (b) => Array.from({ length: b.numberOfChannels }, (_, c) => Array.from(b.getChannelData(c)));
window.__render = async ({ sampleRate, seconds, lanes }) => {
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  if (!canHostFrpp6(ctx)) throw new Error('offline context cannot host a worklet');
  for (const events of lanes) await renderFrpp6Lane(ctx, { voice: VOICE, events });
  return chans(await ctx.startRendering());
};
window.__live = async () => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const out = { hosted: canHostFrpp6(ctx) };
  try {
    await ctx.resume();
    const lane = await frpp6Lane(ctx, 'chords', { voice: VOICE });
    const sink = ctx.createGain(); sink.gain.value = 0;
    lane.node.connect(sink); sink.connect(ctx.destination);
    frpp6NoteOn(lane, { at: ctx.currentTime + 0.02, hz: [196, 293.7, 370, 493.9], eventId: 1 });
    const health = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('the live processor never reported')), 4000);
      lane.node.port.onmessage = (e) => {
        if (!e.data || e.data.voices === undefined) return;
        if (e.data.voices === 0) { setTimeout(() => lane.node.port.postMessage({ type: 'report' }), 20); return; }
        clearTimeout(timer); resolve(e.data);
      };
      lane.node.port.postMessage({ type: 'report' });
    });
    out.running = ctx.state === 'running';
    out.voices = health.voices;
    lane.node.port.postMessage({ type: 'stop' });
  } catch (err) { out.error = String(err?.message || err); }
  finally { await ctx.close(); }
  return out;
};
`;

const { chromium, webkit } = require('playwright');
const esbuild = require('esbuild');

let failed = 0;
const assert = (cond, msg) => { if (cond) console.log(`ok: ${msg}`); else { failed++; console.log(`FAIL: ${msg}`); } };
const TOL = 5e-6;
const peak = (chs) => Math.max(...chs.map((ch) => ch.reduce((m, s) => Math.max(m, Math.abs(s)), 0)));
const diff = (a, b) => {
  let max = 0;
  for (let c = 0; c < a.length; c++) for (let i = 0; i < a[c].length; i++) max = Math.max(max, Math.abs(a[c][i] - b[c][i]));
  return max;
};
const rms = (chs, from, to, rate) => {
  let sum = 0;
  let n = 0;
  for (const ch of chs) for (let i = Math.floor(from * rate); i < Math.floor(to * rate); i++) { sum += ch[i] * ch[i]; n++; }
  return Math.sqrt(sum / n);
};
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const lane = (rate, notes, panicAt = null) => {
  const events = [];
  for (const n of notes) {
    events.push({ type: 'noteOn', frame: Math.round(n.at * rate), eventId: n.id, hz: n.hz, velocity: n.vel ?? 1 });
    events.push({ type: 'noteOff', frame: Math.round(n.off * rate), eventId: n.id });
  }
  if (panicAt != null) events.push({ type: 'panic', frame: Math.round(panicAt * rate) });
  return events;
};
const A = [{ id: 1, at: 0.1, off: 0.5, hz: [hz(55), hz(62), hz(66), hz(71)] },
  { id: 2, at: 0.25, off: 0.3, hz: [hz(55), hz(62), hz(66)], vel: 0.3 }, { id: 3, at: 0.55, off: 0.9, hz: hz(45) }];
const B = [{ id: 7, at: 0.2, off: 0.7, hz: hz(64) }];

async function prove(page, label) {
  for (const rate of [44100, 48000]) {
    const chs = await page.evaluate((a) => window.__render(a), { sampleRate: rate, seconds: 1, lanes: [lane(rate, A)] });
    assert(chs.every((ch) => ch.every(Number.isFinite)) && peak(chs) > 0.01,
      `${label}: ${rate} Hz renders finite, non-silent (peak ${peak(chs).toFixed(3)})`);
    // 7. The worklet is the reference renderer, sample for sample.
    const ref = renderFrpp6({ events: lane(rate, A), seconds: 1, sampleRate: rate, patch: compileFrpp6(VOICE, rate) }).channels;
    const d = diff(chs, ref.map((ch) => Array.from(ch)));
    assert(d < TOL, `${label}: ${rate} Hz worklet matches the Node reference (${d.toExponential(2)})`);
    if (rate === 44100) {
      assert(rms(chs, 0, 0.09, rate) < 1e-7 && rms(chs, 0.12, 0.3, rate) > 0.005,
        `${label}: silent before the first note, audible after it`);
    }
  }
  const once = await page.evaluate((a) => window.__render(a), { sampleRate: 44100, seconds: 1, lanes: [lane(44100, A)] });
  const twice = await page.evaluate((a) => window.__render(a), { sampleRate: 44100, seconds: 1, lanes: [lane(44100, A)] });
  assert(diff(once, twice) < TOL, `${label}: two renders agree within 5e-6`);
  const b = await page.evaluate((a) => window.__render(a), { sampleRate: 44100, seconds: 1, lanes: [lane(44100, B)] });
  const mix = await page.evaluate((a) => window.__render(a), { sampleRate: 44100, seconds: 1, lanes: [lane(44100, A), lane(44100, B)] });
  const summed = once.map((ch, c) => ch.map((s, i) => s + b[c][i]));
  assert(diff(summed, mix) < TOL, `${label}: stems sum to the mix within 5e-6 (${diff(summed, mix).toExponential(2)})`);
  const panicked = await page.evaluate((a) => window.__render(a), {
    sampleRate: 44100, seconds: 1,
    lanes: [lane(44100, [{ id: 1, at: 0.05, off: 0.95, hz: hz(52) }, { id: 2, at: 0.6, off: 0.95, hz: hz(57) }], 0.4)],
  });
  assert(rms(panicked, 0.1, 0.35, 44100) > 0.005 && rms(panicked, 0.45, 1, 44100) < 1e-6,
    `${label}: a panic silences the sounding note and the queued one`);
}

const build = async (minify) => (await esbuild.build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
  bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent', minify,
})).outputFiles[0].text;

for (const [name, type] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await type.launch({ headless: true,
    args: name === 'chromium' ? ['--mute-audio', '--autoplay-policy=no-user-gesture-required'] : [] });
  try {
    for (const minify of [false, true]) {
      const label = `${name} ${minify ? 'production' : 'dev'} build`;
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const html = `<!doctype html><meta charset="utf-8"><script>${(await build(minify)).replace(/<\/script>/gi, '<\\/script>')}<\/script>`;
      await page.route('https://frpp6-proof.test/', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: html }));
      await page.goto('https://frpp6-proof.test/', { waitUntil: 'load' });
      if (!minify && name === 'chromium') {
        const live = await page.evaluate(() => window.__live());
        assert(!live.error && live.hosted && live.running && live.voices > 0,
          `live AudioContext builds a lane and plays it (${live.error || `${live.voices} strings sounding`})`);
      }
      await prove(page, label);
      if (errors.length) assert(false, `${label}: page errors — ${errors.join(' | ')}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

console.log(failed ? `\nFRPP-6 WORKLET PROOF: ${failed} FAILED` : '\nFRPP-6 WORKLET PROOF: PASSED');
process.exit(failed ? 1 : 0);
