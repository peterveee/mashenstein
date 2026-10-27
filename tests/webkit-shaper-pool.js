// A WaveShaper back on the WebKit shelf has nothing wired into it.
//
// WebKit never frees a WaveShaperNode while its context lives, so effects.js pools them per
// context: every shaper an effect build makes is noted, and when the mixer disposes the effect
// the shapers go on a shelf that ctx.createWaveShaper hands out again — to the next effect, and
// to anything else that asks (the drum path's drive shaper). Disposing an effect cut a shaper's
// OUTPUTS and nothing else, and Tone's dispose leaves a Signal's constant source wired on into
// it (a CrossFade's fade into its GainToAudio shaper, the widener's WIDTH into madeSide's law).
// So a shaper came off the shelf with DC already on its input, and played it through its own
// curve from the moment it was connected (Peter, 26 Oct 2026: the jukebox from GRAVITY GRID to
// CORPORATE KOMBAT crackled for a second or two on iPhone and iPad — the driven shaker and conga
// took seven tainted shapers, every hit a slab at the curve's end, until the shelf ran out).
// releaseEffectShapers now cuts every connection into the shaper as well.
//
// WEBKIT, LIVE, because the pool exists only there (Playwright's WebKit, muted through a gain-0
// sink; an AudioWorklet reads each tap's peak per quantum).
//
//   1. THE CONTROL. A pooled shaper fed by a running constant source puts out its DC.
//   2. RELEASED, IT COMES BACK SILENT. The same shaper, released and taken from the shelf again
//      (the same node), is silent with that source still running.
//   3. REAL EFFECTS. Tremolo, widener (with its made side), auto panner, delay and ping-pong,
//      built and disposed: before release some of their shapers carry their Signals' DC; every
//      one of them taken back off the shelf is silent.
//   4. THE CASE HEARD. GRAVITY GRID into CORPORATE KOMBAT in the jukebox: the shaker lane has no
//      sample-level kink anywhere near a slab's in its first 1.5 s.
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const PEAK = `
class Peak extends AudioWorkletProcessor {
  constructor() { super(); this.on = false; this.port.onmessage = (e) => { this.on = e.data; }; this.prev = []; }
  process(inputs) {
    const peak = [], kink = [];
    inputs.forEach((inp, j) => {
      let p = 0, k = 0;
      const prev = this.prev[j] || (this.prev[j] = [0, 0]);
      if (inp && inp.length) {
        const c = inp[0];
        let a = prev[0], b = prev[1];
        for (let i = 0; i < c.length; i++) { const v = Math.abs(c[i]); if (v > p) p = v; const d = Math.abs(c[i] - 2 * b + a); if (d > k) k = d; a = b; b = c[i]; }
        prev[0] = a; prev[1] = b;
      }
      peak.push(p); kink.push(k);
    });
    if (this.on) this.port.postMessage({ f: currentFrame, peak, kink });
    return true;
  }
}
registerProcessor('peak', Peak);`;

const ENTRY = `
import { Audio } from ${JSON.stringify(join(ROOT, 'src/engine/audio.js'))};
import { createEffect, releaseEffectShapers } from ${JSON.stringify(join(ROOT, 'src/engine/effects.js'))};
import { JUKEBOX_TRACKS } from ${JSON.stringify(join(ROOT, 'src/data/megamix.js'))};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PEAK = ${JSON.stringify(PEAK)};
async function start() {
  Audio.setMixerMeteringEnabled(false);
  Audio.setCaptureEnabled(false);
  Audio.fadeSongChanges = true;
  Audio.ensure();
  try { await Audio.ctx.resume(); } catch {}
  if (Audio.mixer) await Audio.mixer.ready;
  const ctx = Audio.ctx;
  await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([PEAK], { type: 'application/javascript' })));
  return ctx;
}
function meter(ctx, inputs) {
  const node = new AudioWorkletNode(ctx, 'peak', { numberOfInputs: inputs, numberOfOutputs: 1 });
  const blocks = [];
  node.port.onmessage = (e) => blocks.push(e.data);
  const sink = ctx.createGain(); sink.gain.value = 0; node.connect(sink); sink.connect(ctx.destination);
  return { node, blocks };
}
// The loudest each input got over ms of audio.
async function listen(ctx, nodes, ms = 150) {
  const m = meter(ctx, Math.max(1, nodes.length));
  nodes.forEach((n, i) => n.connect(m.node, 0, i));
  await sleep(40);
  m.node.port.postMessage(true);
  await sleep(ms);
  m.node.port.postMessage(false);
  nodes.forEach((n) => { try { n.disconnect(m.node); } catch {} });
  const out = nodes.map(() => 0);
  for (const b of m.blocks) b.peak.forEach((v, i) => { if (i < out.length) out[i] = Math.max(out[i], v); });
  return out;
}
window.__pool = async () => {
  const ctx = await start();
  // The shelf is set up by the first effect built on the context.
  const first = createEffect('delay', {}, ctx, 120);
  try { first.node.dispose(); } catch {}
  releaseEffectShapers(ctx, first);
  // 1–2: one shaper, one constant source.
  const s = ctx.createWaveShaper();
  s.curve = new Float32Array([-1, 0, 1]);
  const dc = ctx.createConstantSource(); dc.offset.value = 0.5; dc.connect(s); dc.start();
  const [fed] = await listen(ctx, [s]);
  // Released and taken straight back, in one task: the shelf is the live engine's too.
  releaseEffectShapers(ctx, { shapers: [s] });
  const again = ctx.createWaveShaper();
  again.curve = new Float32Array([-1, 0, 1]);
  const [back] = await listen(ctx, [again]);
  // 3: real effects.
  const ids = [['tremolo', {}], ['widener', { width: 0.9 }], ['autopanner', {}], ['delay', {}], ['pingpong', {}]];
  const shelved = [];
  for (const [id, params] of ids) {
    const link = createEffect(id, params, ctx, 120);
    if (link) shelved.push({ id, link, mine: [...(link.shapers || [])] });
  }
  for (const e of shelved) { try { e.link.node.dispose(); } catch {} }
  // What each shaper puts out once its effect is disposed and before the shelf takes it.
  // Disposing cut its outputs, so wire them to the meter again to read it.
  const all = shelved.flatMap((e) => e.mine);
  const before = await listen(ctx, all);
  let k = 0;
  for (const e of shelved) e.before = e.mine.map(() => before[k++]);
  for (const e of shelved) releaseEffectShapers(ctx, e.link);
  const taken = all.map(() => ctx.createWaveShaper());
  taken.forEach((n) => { n.curve = new Float32Array([-1, 0, 1]); });
  const after = await listen(ctx, taken);
  return {
    same: again === s, fed, back,
    effects: shelved.map((e) => ({ id: e.id, n: e.mine.length, loud: e.before.filter((v) => v > 1e-3).length })),
    shelvedCount: all.length, takenFromShelf: taken.filter((n) => all.includes(n)).length, after,
  };
};
// 4: the jukebox switch heard, the shaker lane's dry input.
const open = (tr) => {
  Audio.setBank(tr.bank, tr.mix, tr.arrangement, { startAtBeginning: true, once: { minBars: 16 } });
  Audio.prepareRealtimeVoices?.({ startStep: 0, windowSteps: 256 });
  Audio.warmWorkletLanes?.()?.catch?.(() => {});
};
window.__switch = async ({ from, to, lane, secs }) => {
  const ctx = await start();
  const names = [JUKEBOX_TRACKS[from].name, JUKEBOX_TRACKS[to].name];
  open(JUKEBOX_TRACKS[from]);
  await sleep(6000);
  open(JUKEBOX_TRACKS[to]);
  let m;
  await new Promise((res) => Audio.afterMix(() => {
    m = meter(ctx, 1);
    Audio._mixer.lane(lane).dry.connect(m.node, 0, 0);
    m.node.port.postMessage(true);
    res();
  }));
  await sleep(secs * 1000);
  m.node.port.postMessage(false);
  let peak = 0, kink = 0;
  for (const b of m.blocks) { peak = Math.max(peak, b.peak[0]); kink = Math.max(kink, b.kink[0]); }
  return { names, peak, kink, blocks: m.blocks.length };
};`;

const SILENT_SINK = `(() => { const orig = AudioNode.prototype.connect; const sinks = new WeakMap();
  AudioNode.prototype.connect = function (dest, ...rest) {
    if (dest instanceof AudioDestinationNode) { const ctx = dest.context; let s = sinks.get(ctx);
      if (!s) { s = ctx.createGain(); s.gain.value = 0; orig.call(s, dest); sinks.set(ctx, s); }
      return orig.call(this, s, ...rest); }
    return orig.call(this, dest, ...rest); }; })();`;

let failed = false;
const assert = (cond, msg) => {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
};

async function main() {
  let webkit;
  try {
    ({ webkit } = require('playwright'));
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
  const browser = await webkit.launch({ headless: true });
  const errors = [];
  const run = async (fn, cfg) => {
    const page = await browser.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(SILENT_SINK);
    await page.route('https://mashenstein.test/', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: html }));
    await page.goto('https://mashenstein.test/');
    const out = await page.evaluate(([f, c]) => window[f](c), [fn, cfg]);
    await page.close();
    return out;
  };

  try {
    const p = await run('__pool');
    assert(p.fed > 0.4, `the control: a pooled shaper fed by a constant source puts it out (peak ${p.fed.toFixed(3)})`);
    assert(p.same && p.back < 1e-6,
      `released and taken off the shelf again (${p.same ? 'the same node' : 'NOT the same node'}), it is silent with the source still running (peak ${p.back.toExponential(1)})`);
    const loud = p.effects.reduce((s, e) => s + e.loud, 0);
    assert(loud > 0, `the control: disposed effects leave their Signals wired into ${loud} of their ${p.shelvedCount} shapers (${p.effects.map((e) => `${e.id} ${e.loud}/${e.n}`).join(', ')})`);
    const worst = Math.max(0, ...p.after);
    assert(p.takenFromShelf === p.shelvedCount && worst < 1e-6,
      `all ${p.takenFromShelf} of them come back off the shelf silent (worst peak ${worst.toExponential(1)})`);

    const s = await run('__switch', { from: 9, to: 10, lane: 'hats2', secs: 1.5 });
    // A clean shaker's worst kink is ~0.2; a tainted shaper's slab steps by its full height, 0.85+.
    assert(s.blocks > 100 && s.kink < 0.5,
      `${s.names[0]} into ${s.names[1]}: the shaker lane has no slab in its first 1.5 s (worst kink ${s.kink.toFixed(3)}, peak ${s.peak.toFixed(3)})`);
  } finally {
    await browser.close();
  }
  if (errors.length) { console.error('FAIL: page errors:', errors); failed = true; }
  console.log(failed ? 'WEBKIT SHAPER POOL: FAILED' : 'WEBKIT SHAPER POOL: PASSED');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
