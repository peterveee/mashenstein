// A WORKLET LANE BUILT TWICE, OR UNDER A SONG CHANGE, LEAVES NO NODE BEHIND
// (docs/AUDIO_SYNTH_AUDIT_PLAN.md, Stage G, 22 Oct 2026).
//
// A TNGR-2 lane is one persistent AudioWorkletNode per lane, built asynchronously — the DSP
// module has to load first. Two things can happen while it is loading: another build of the
// same lane starts (the Lab warms a lane on every style or mood change, the club on every
// DICE, and the scheduler queues its own), and the song changes, which releases every lane
// on the context. Either way exactly one node may survive, owned by the controller, and
// every other node built must have been stopped. Live in headless WebKit over https (a
// worklet needs a secure context), silently.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = false;
const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); failed = true; } else console.log('ok:', msg); };

const ENTRY = `
import { Audio } from ${JSON.stringify(join(ROOT, 'src/engine/audio.js'))};
import { VOICES } from ${JSON.stringify(join(ROOT, 'src/data/voices.js'))};
import { tngr2ControllerHealth } from ${JSON.stringify(join(ROOT, 'src/engine/tngr2/controller.js'))};
window.run = async () => {
  // Every worklet node made, and which have been told to stop.
  const made = [];
  const AW = window.AudioWorkletNode;
  // Only TNGR-2's own nodes: the engine's gate and rewind worklets come and go on their own.
  window.AudioWorkletNode = new Proxy(AW, { construct(t, a, nt) { const n = Reflect.construct(t, a, nt); if (a[1] === 'tngr2') made.push(n); return n; } });
  // A released lane is told to stop. Counted on the prototype: WebKit may hand out a fresh
  // MessagePort wrapper on each read of node.port, so a patch on one instance can miss.
  let stops = 0;
  const post = MessagePort.prototype.postMessage;
  MessagePort.prototype.postMessage = function (m, ...r) { if (m?.type === 'stop') stops++; return post.call(this, m, ...r); };
  const conn = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (d, ...r) {
    if (d instanceof AudioDestinationNode) { const g = d.context.createGain(); g.gain.value = 0; conn.call(g, d); return conn.call(this, g, ...r); }
    return conn.call(this, d, ...r);
  };
  Audio.ensure(); await Audio.ctx.resume(); if (Audio.mixer) await Audio.mixer.ready;
  const lanes = () => tngr2ControllerHealth(Audio.ctx)?.lanes ?? 0;
  const out = {};
  const settle = () => new Promise((r) => setTimeout(r, 600));
  const a = VOICES.tngrOrangeCurrent, b = VOICES.tngrGlassMotor;
  const base = made.length;

  // 1. Two builds of the same lane at once.
  Audio._ensureVoiceRack();
  await Promise.all([Audio.voices.warmWorkletLane(a, 'lead'), Audio.voices.warmWorkletLane(b, 'lead')]);
  await settle();
  out.concurrent = { made: made.length - base, live: made.length - base - stops, lanes: lanes() };

  // 2. A build under a song change: the rack (and every lane on the context) goes mid-build.
  const before2 = made.length;
  const song = { bpm: 120, lead: new Array(16).fill(null) };
  for (let i = 0; i < 6; i++) {
    Audio.setBank(song);
    Audio._ensureVoiceRack();
    const p = Audio.voices.warmWorkletLane(i % 2 ? a : b, 'chords');
    Audio.setBank(null);            // a song was playing: the rack goes, and every lane on the context
    await p;
  }
  await settle();
  out.underChange = { made: made.length - before2, live: made.length - base - stops, lanes: lanes() };
  return out;
};`;

const esbuild = require('esbuild');
const built = await esbuild.build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' }, bundle: true, format: 'iife', write: false, logLevel: 'silent' });
const html = `<!doctype html><meta charset="utf-8"><script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}</script>`;
const { webkit } = require('playwright');
const browser = await webkit.launch();
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('https://mashenstein.live/', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: html }));
  await page.goto('https://mashenstein.live/');
  const out = await page.evaluate(() => window.run());
  console.log(JSON.stringify(out));
  assert(errors.length === 0, `no page errors${errors.length ? `: ${errors[0]}` : ''}`);
  assert(out.concurrent.live === out.concurrent.lanes && out.concurrent.lanes === 1,
    `two builds of one lane at once leave one live node, the lane's own (${out.concurrent.made} built, ${out.concurrent.live} live, ${out.concurrent.lanes} lane)`);
  assert(out.underChange.live === out.underChange.lanes,
    `builds caught by a song change leave no node the controller does not own (${out.underChange.made} built, ${out.underChange.live} live, ${out.underChange.lanes} lanes)`);
} finally {
  await browser.close();
}
console.log(failed ? 'WORKLET LANE RACES: FAILED' : 'WORKLET LANE RACES: PASSED');
if (failed) process.exitCode = 1;
