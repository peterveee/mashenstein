// A song change EMPTIES what outlives the song: the last song's echoes and reverb do not come
// out over the next one.
//
// Delay 1 (audio.js: echoHp -> delay -> delayLp, delayFb back round) is one line for the life of
// the context, and the aux Reverb one room for the life of the mixer. setBank shuts songTrim over
// their returns, but the echo's feedback went on round behind it and the room went on ringing
// through the half-second gap, so when the trim opened for the new song the old song's repeats,
// a step quieter each beat, and the last of its reverb came out over the opening (Peter, 25 Oct
// 2026: "a little bit of delay from the previous song at the start of a new song" — up to -40 dB
// after the title theme in the jukebox). Until 24 Oct growDelayLine built a new, empty line on
// every song change by mistake, which hid the echo; fixing that brought it back. Now echoGate,
// inside the loop, is shut while the line empties (_shutEchoLine), and every room the mixer keeps
// is given its impulse again, which empties it (_emptyTails, mixer emptyTails, makeReverb empty).
// A reverb's convolver is reused through a pool (effects.js), so a parked one is emptied too.
//
// LIVE, because all of it is live-only: real jukebox tracks on a real-time context in Chromium,
// muted, with an AudioWorklet recording the master, the echo's return leg and the aux Reverb.
//
//   1. THE CONTROL. The title theme's echo and room are ringing when the song changes.
//   2. NOTHING OF THEM REACHES THE NEXT SONG. Switched to the hub theme with its notes silenced
//      (its mix built as usual), the echo and the room are silent once emptied, and the master
//      is silent once the trim opens.
//   3. THE NEXT SONG STILL HAS ITS OWN. The same switch with the hub theme playing: its repeats
//      and its room come back.
//   4. A REUSED CONVOLVER STARTS EMPTY. A reverb disposed while ringing, and a new one built on
//      the same room straight after (so on the same convolver): the new one is silent.
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const REC = `
class Rec extends AudioWorkletProcessor {
  constructor() { super(); this.on = false; this.port.onmessage = (e) => { this.on = e.data; }; }
  process(inputs) {
    const z = new Float32Array(128);
    const ch = (i, c) => (i && i.length ? (i[c] || i[0]).slice() : z);
    if (this.on) this.port.postMessage({ f: currentFrame, taps: inputs.map((i) => [ch(i, 0), ch(i, 1)]) });
    return true;
  }
}
registerProcessor('rec', Rec);`;

const ENTRY = `
import { Audio } from ${JSON.stringify(join(ROOT, 'src/engine/audio.js'))};
import { makeReverb } from ${JSON.stringify(join(ROOT, 'src/engine/effects.js'))};
import { JUKEBOX_TRACKS } from ${JSON.stringify(join(ROOT, 'src/data/megamix.js'))};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const REC = ${JSON.stringify(REC)};
async function recorder(ctx, inputs) {
  await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([REC], { type: 'application/javascript' })));
  const rec = new AudioWorkletNode(ctx, 'rec', { numberOfInputs: inputs, numberOfOutputs: 1, channelCount: 2, channelCountMode: 'explicit' });
  const blocks = [];
  rec.port.onmessage = (e) => blocks.push(e.data);
  const sink = ctx.createGain(); sink.gain.value = 0; rec.connect(sink); sink.connect(ctx.destination);
  return { rec, blocks };
}
// What the jukebox does (SoundTestState.openTrack).
const open = (tr) => {
  Audio.setBank(tr.bank, tr.mix, tr.arrangement, { startAtBeginning: true, once: { minBars: 16 } });
  Audio.prepareRealtimeVoices?.({ startStep: 0, windowSteps: 256 });
  Audio.warmWorkletLanes?.()?.catch?.(() => {});
};
window.__switch = async ({ from, to, silenceNext }) => {
  Audio.setMixerMeteringEnabled(false);
  Audio.setCaptureEnabled(false);
  Audio.fadeSongChanges = true;
  Audio.setListening(true);
  Audio.ensure();
  try { await Audio.ctx.resume(); } catch {}
  if (Audio.mixer) await Audio.mixer.ready;
  const ctx = Audio.ctx;
  const { rec, blocks } = await recorder(ctx, 3);
  Audio.master.connect(rec, 0, 0);
  // The echo's return leg, after the gate: what the feedback and the aux return both hear.
  Audio.delayLp.connect(rec, 0, 1);
  Audio._mixer.aux('reverb').reverb.output.connect(rec, 0, 2);
  open(JUKEBOX_TRACKS[from]);
  await sleep(8000);
  rec.port.postMessage(true);
  await sleep(300);
  const t0 = ctx.currentTime;
  open(JUKEBOX_TRACKS[to]);
  // Its mix is built, but it plays nothing: whatever comes out after its trim opens is the
  // last song's.
  if (silenceNext) Audio.scheduleStep = function () { this.nextTime += 0.125; };
  await sleep(3000);
  rec.port.postMessage(false);
  await sleep(50);
  return { t0Frame: Math.round(t0 * ctx.sampleRate), sr: ctx.sampleRate, blocks, names: [JUKEBOX_TRACKS[from].name, JUKEBOX_TRACKS[to].name] };
};
window.__pooled = async () => {
  const ctx = new AudioContext();
  try { await ctx.resume(); } catch {}
  const { rec, blocks } = await recorder(ctx, 1);
  const noise = ctx.createBuffer(2, ctx.sampleRate * 0.4, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = noise.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const a = makeReverb(ctx, { decay: 3, preDelay: 0.01, wet: 1 });
  const src = ctx.createBufferSource(); src.buffer = noise; src.connect(a.input);
  a.connect(rec);
  src.start();
  rec.port.postMessage(true);
  await sleep(600);
  const ringingTo = ctx.currentTime;
  a.dispose();
  const b = makeReverb(ctx, { decay: 3, preDelay: 0.01, wet: 1 });
  const from = ctx.currentTime;
  b.connect(rec);
  await sleep(1000);
  rec.port.postMessage(false);
  await sleep(50);
  return { sr: ctx.sampleRate, blocks, ringingTo: Math.round(ringingTo * ctx.sampleRate), from: Math.round(from * ctx.sampleRate) };
};`;

let failed = false;
const assert = (cond, msg) => {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
};

// Peak 50 ms RMS of one recorder input between two frames.
function meter(blocks) {
  blocks.sort((a, b) => a.f - b.f);
  const start = blocks[0].f;
  const n = blocks[blocks.length - 1].f + 128 - start;
  const taps = blocks[0].taps.map(() => [new Float32Array(n), new Float32Array(n)]);
  for (const b of blocks) b.taps.forEach(([l, r], j) => { taps[j][0].set(l, b.f - start); taps[j][1].set(r, b.f - start); });
  return (j, fromFrame, toFrame, sr) => {
    const [L, R] = taps[j];
    const win = Math.round(sr * 0.05);
    let m = 0;
    for (let a = Math.max(0, fromFrame - start); a + win <= Math.min(n, toFrame - start); a += win) {
      let e = 0;
      for (let i = a; i < a + win; i++) e += L[i] * L[i] + R[i] * R[i];
      m = Math.max(m, Math.sqrt(e / (2 * win)));
    }
    return m;
  };
}
const db = (x) => (x > 0 ? `${(20 * Math.log10(x)).toFixed(0)} dB` : 'silence');

async function main() {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch {
    console.error('FAIL: playwright is required: npm install');
    process.exit(1);
  }
  const esbuild = require('esbuild');
  const built = await esbuild.build({
    stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
    bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
  });
  const html = '<!doctype html><meta charset="utf-8">'
    + `<script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}<\/script>`;
  const browser = await chromium.launch({
    headless: true, args: ['--mute-audio', '--autoplay-policy=no-user-gesture-required'],
  });
  const errors = [];
  // A fresh page per run: Audio is a singleton bound to one context. An https origin,
  // because an AudioWorklet will not load anywhere else.
  const run = async (fn, cfg) => {
    const page = await browser.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route('https://mashenstein.test/', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: html }));
    await page.goto('https://mashenstein.test/');
    const out = await page.evaluate(([f, c]) => window[f](c), [fn, cfg]);
    await page.close();
    return out;
  };
  const MASTER = 0, ECHO = 1, ROOM = 2;

  try {
    // The title theme into the hub theme: the pair Peter heard it on, and the loudest of it.
    const silent = await run('__switch', { from: 0, to: 1, silenceNext: true });
    const s = meter(silent.blocks);
    const at = (secs) => silent.t0Frame + Math.round(secs * silent.sr);
    const span = (j, a, b) => s(j, at(a), at(b), silent.sr);
    const [a, b] = silent.names;
    assert(span(ECHO, -0.3, 0) > 1e-3 && span(ROOM, -0.3, 0) > 1e-3,
      `the control: ${a}'s echo and room are ringing at the change (${db(span(ECHO, -0.3, 0))}, ${db(span(ROOM, -0.3, 0))})`);
    // The line is a second at most here; its time plus the margin is well inside 1.2 s.
    assert(span(ECHO, 1.2, 3) < 1e-6, `nothing of the echo is left in the line after the change (${db(span(ECHO, 1.2, 3))})`);
    // Emptied once the 12 ms fade is down, as soon as the new mix is on.
    assert(span(ROOM, 0.15, 3) < 1e-6, `nor of the room (${db(span(ROOM, 0.15, 3))})`);
    // The trim opens at +0.5 s.
    assert(span(MASTER, 0.55, 3) < 1e-5, `and nothing of the old song is heard over ${b}'s opening (${db(span(MASTER, 0.55, 3))})`);

    const playing = await run('__switch', { from: 0, to: 1, silenceNext: false });
    const p = meter(playing.blocks);
    const pat = (secs) => playing.t0Frame + Math.round(secs * playing.sr);
    const own = (j) => p(j, pat(1), pat(3), playing.sr);
    assert(own(ECHO) > 1e-3, `${b}'s own echo comes back once the line is empty (${db(own(ECHO))})`);
    assert(own(ROOM) > 1e-3, `and its own room (${db(own(ROOM))})`);

    const pooled = await run('__pooled');
    const q = meter(pooled.blocks);
    const ringing = q(0, pooled.ringingTo - Math.round(0.15 * pooled.sr), pooled.ringingTo, pooled.sr);
    const after = q(0, pooled.from + Math.round(0.05 * pooled.sr), pooled.from + Math.round(0.9 * pooled.sr), pooled.sr);
    assert(ringing > 1e-3 && after < 1e-6,
      `a reverb built on a ringing reverb's convolver starts empty (${db(ringing)} disposed, ${db(after)} after)`);
  } finally {
    await browser.close();
  }
  if (errors.length) { console.error('FAIL: page errors:', errors); failed = true; }
  console.log(failed ? 'SONG CHANGE TAILS: FAILED' : 'SONG CHANGE TAILS: PASSED');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
