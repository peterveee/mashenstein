// THE AUDIO AUDIT HARNESS — docs/AUDIO_SYNTH_AUDIT_PLAN.md, Stage 1 (20 Oct 2026), corrected
// in Stage 1b (21 Oct 2026) after the review in §A.1 of the plan.
//
// What one synth preset or one effect costs, and whether it leaves anything behind, measured
// the same way for every subject over long enough for a leak to show: KNDO-5's dead notes were
// invisible for a bar and the whole of the iPad's budget by bar 40 of Rhythm Bankruptcy.
//
// The subject plays, goes silent (census A), plays again, goes silent (census B). A pool or a
// strip is the same size at A and B; a leak is bigger at B by everything played in between. If
// B is bigger, a third census (C) ten seconds later tells a long tail (back to A) from a leak
// (still bigger). Any confirmed growth is a leak: every clean lane of the game's songs reads
// exactly flat (259 of 259, 21 Oct), and the Stage 1 threshold of 20 nodes missed slow leaks.
//
// TWO INSTRUMENTATION MODES, never mixed:
//   graph   (default) every connection is recorded — node or AudioParam, output and input
//           index — so the census can walk back from the speakers over what the browser
//           actually pulls; sources started and not ended are counted. The records hold the
//           nodes they describe: right for counting a graph, useless for memory.
//   memory  (--memory) nothing is held: nodes, AudioBuffers (bytes) and PeriodicWaves are
//           counted through a FinalizationRegistry, after a forced collection. Chromium by
//           default — WebKit exposes no way to force one, and a count without it is noise.
//
// LOAD (`synth`, `effect`, `strip` without --counts) is read by an in-thread burner worklet
// against this page's own baseline (work/local/_live-headroom-webkit.mjs): an estimate of
// headroom, ±3 points on a quiet Mac, not a CPU percentage.
//
// Every subject's output is metered before the silent sink: one that made no sound is
// UNAVAILABLE (a worklet that failed to load, TNGR-2 on an insecure page), never cheap.
//
// Headless WebKit (the iPad's engine) unless --browser, phone setup (latencyHint 0.05, no
// capture, metering off, MRDR-3 PHONE, muted lanes skipped as in a run), over https so
// worklets run. SILENT: everything bound for the speakers goes through a gain-0 sink (memory
// headless-audio-must-be-silent); a gain at 0 still pulls its inputs, so the work is done.
//
//   node tools/audio-audit.js synth <presetId|family:<SYNTH>> [--limit=N] [--params=f.json]
//   node tools/audio-audit.js effect <effectId>            on a plain MRDR-3 phrase, vs absent
//   node tools/audio-audit.js strip <songId> [--without=effects,sends,eq,master,spotfx]   the song's whole mix, no notes: the standing cost
//   node tools/audio-audit.js leaks                        one preset per family, counts only
//   node tools/audio-audit.js song <songId>                a whole game song, its arrangement and mix, stopped and restarted
//   node tools/audio-audit.js songs [songId] [--only=song:lane,…]   every lane sound of the game's songs
//   node tools/audio-audit.js fixture <name|all>           the harness's own broken examples (tools/lib/audio-audit-fixtures.js)
//     --seconds=N     the phrase's length (150; `leaks` 60)
//     --counts        counts only, no burner (fast, any machine)
//     --memory        memory instrumentation (see above)
//     --browser=webkit|chromium
//     --copies=N      lanes playing the phrase at once (8)
//     --src=<dir>     bundle the engine from another tree (a before/after: a copy of src/ beside a tools symlink)
//     --json          print the results as JSON (tests/audio-leaks.js reads it)
//     --stacks        print who started the sources still running at the end (graph mode)
//
// Writes work/audit/<date>/<subject>.json — the result, its raw samples, every census and the
// run's metadata — and appends work/audit/<date>/REPORT.md.
import { mkdirSync, writeFileSync, appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import os from 'node:os';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (k) => { const a = args.find((x) => x === `--${k}` || x.startsWith(`--${k}=`)); return a ? (a.includes('=') ? a.slice(a.indexOf('=') + 1) : true) : null; };
const words = args.filter((a) => !a.startsWith('--'));
const [command, target] = words;
const MODE = flag('memory') ? 'memory' : 'graph';
const COUNTS = !!flag('counts') || command === 'leaks' || command === 'fixture';
const SECONDS = Number(flag('seconds') || (command === 'leaks' ? 60 : command === 'fixture' ? 24 : 150));
const SRC = resolve(flag('src') || join(ROOT, 'src'));
const JSON_OUT = !!flag('json');
// --only=song:lane,song:lane — `songs` measures just these (a recheck of what a sweep flagged).
const ONLY = flag('only') ? new Set(String(flag('only')).split(',')) : null;
const log = (...a) => { if (!JSON_OUT) console.log(...a); };
// Below this the subject made no sound (−80 dBFS peak over the whole time it played).
const SOUNDED = 1e-4;
// A confirming census this long after the second, when the second is bigger than the first.
const CONFIRM_MS = 10000;

// One preset per family for `leaks`: a plain sound of each synth, and two drums (a hit that
// sums partials into one node is the drum leak of 6 Oct).
const LEAK_PRESETS = ['toneSquare', 'bestClassicMono', 'simpleSawtooth', 'fmKeys', 'addDrawbar', 'jmjrChoirAah', 'tngrSoftStrings', 'kickEngine', 'crashEngine'];
const EFFECT_CARRIER = 'bestClassicMono';

// ---- the phrase ---------------------------------------------------------------
// Two bars at 120 BPM, looped: eighths over two octaves, a held four-note chord, eighths again.
// 16 note-ons every 4 s, on COPIES lanes at once (the lane and its duplicates, `mix.layers`):
// one lane of one preset is a percent or two of the thread, inside the burner's noise, and
// eight are not. The same for every subject, so the numbers compare.
const COPIES = Number(flag('copies') || 8);
const PHRASE = 'two bars at 120 BPM: eighths C3–C5, a held Cmaj7, eighths; 16 note-ons / 4 s per lane';
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
function phraseBank(lane, drum) {
  const one = phraseLane(lane, drum);
  const bank = { bpm: 120 };
  const keys = Array.from({ length: COPIES }, (_, i) => (i ? `${lane}${i + 1}` : lane));
  for (const k of keys) { bank[k] = one.notes; if (one.lens) bank[`${k}Len`] = one.lens; }
  return { bank, keys, layers: keys.slice(1).map((key) => ({ key, from: lane, independent: true })), notesPerSec: 4 * COPIES };
}
function phraseLane(lane, drum) {
  const notes = new Array(32).fill(null);
  const lens = new Array(32).fill(null);
  const run = [48, 52, 55, 60, 64, 67, 72, 67];
  if (drum) {
    for (let s = 0; s < 32; s += 2) notes[s] = true;
    return { notes };
  }
  run.forEach((m, i) => { notes[i * 2] = hz(m); lens[i * 2] = 2; });
  notes[16] = [48, 52, 55, 59].map(hz); lens[16] = 8;
  [24, 26, 28, 30].forEach((s, i) => { notes[s] = hz([60, 64, 67, 72][i]); lens[s] = 2; });
  return { notes, lens };
}

// ---- the page --------------------------------------------------------------------
const BURN = `
class Burn extends AudioWorkletProcessor {
  constructor(o) { super(); this.iters = o.processorOptions.start | 0; this.acc = 0.5; this.winFrame = -1; this.winWall = 0; this.cool = 0; }
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
      this.port.postMessage({ at: currentTime, iters: this.iters });
      this.winFrame = currentFrame; this.winWall = now;
    }
    return true;
  }
}
registerProcessor('burn', Burn);`;

/**
 * Before the page's own code (page.addInitScript, so it is a real function, serialised).
 *
 * Graph mode records every connection as (source, output) → (node or AudioParam, input),
 * AFTER the browser has accepted it, and removes exactly what each disconnect() overload
 * removes. An AudioParam is followed to the node that owns it, so a modulator into a pitch is
 * pulled exactly when its carrier is. Memory mode records no connection and holds nothing.
 *
 * Both: the speakers are reached through a tap (gain 1) → analyser → gain 0, so the output is
 * metered and nothing is heard.
 */
function initAudit(mode) {
  const GRAPH = mode === 'graph';
  const T = window.__track = { live: 0, born: new WeakMap(), mark: Infinity, made: 0 };
  const edges = new Map();        // graph: source node -> Map(key -> { dest, out, inp })
  const ctxs = new Set();         // graph: contexts whose destination the census walks from
  // AudioParam -> the node it belongs to. A Map, not a WeakMap: WebKit may drop an AudioParam's
  // JS wrapper and make a new one on the next read, and a weak key would go with it (every
  // param edge read as unowned until this was strong). Graph mode holds what it records anyway.
  const owner = new Map();
  const ids = new WeakMap(); let nextId = 1;
  const idOf = (o) => { let i = ids.get(o); if (!i) ids.set(o, i = nextId++); return i; };
  const conn = AudioNode.prototype.connect;
  const dis = AudioNode.prototype.disconnect;
  const record = (src, dest, out, inp) => {
    if (!GRAPH) return;
    let m = edges.get(src); if (!m) edges.set(src, m = new Map());
    m.set(`${idOf(dest)}|${out}|${inp}`, { dest, out, inp });
  };

  // Output meter: every 100 ms the last 2048 frames, folded into one row a second.
  const levels = window.__levels = [];
  const meters = [];
  let row = null;
  setInterval(() => {
    for (const { an, ctx, buf } of meters) {
      an.getFloatTimeDomainData(buf);
      let peak = 0, sum = 0, bad = 0;
      for (let i = 0; i < buf.length; i++) { const v = buf[i]; if (!Number.isFinite(v)) { bad++; continue; } const a = Math.abs(v); if (a > peak) peak = a; sum += v * v; }
      const sec = Math.floor(ctx.currentTime);
      if (!row || row.t !== sec) { row = { t: sec, peak: 0, ms: 0, n: 0, bad: 0 }; levels.push(row); }
      row.peak = Math.max(row.peak, peak); row.ms += sum / buf.length; row.n++; row.bad += bad;
    }
  }, 100);
  const taps = new WeakMap();
  let building = false;
  const tapFor = (ctx) => {
    let t = taps.get(ctx); if (t) return t;
    building = true;
    const tap = ctx.createGain(), an = ctx.createAnalyser(), mute = ctx.createGain();
    building = false;
    an.fftSize = 2048; mute.gain.value = 0;
    conn.call(tap, an); conn.call(an, mute); conn.call(mute, ctx.destination);
    record(tap, an, 0, 0); record(an, mute, 0, 0); record(mute, ctx.destination, 0, 0);
    if (GRAPH) ctxs.add(ctx);
    meters.push({ an, ctx, buf: new Float32Array(an.fftSize) });
    taps.set(ctx, t = { tap });
    return t;
  };

  AudioNode.prototype.connect = function (dest, out = 0, inp = 0) {
    const param = dest instanceof AudioParam;
    const real = dest instanceof AudioDestinationNode ? tapFor(dest.context).tap : dest;
    if (param) conn.call(this, real, out); else conn.call(this, real, out, inp);
    record(this, real, out, param ? 0 : inp);
    return param ? undefined : dest;
  };
  AudioNode.prototype.disconnect = function (...a) {
    if (a[0] instanceof AudioDestinationNode) a[0] = tapFor(a[0].context).tap;
    const r = dis.apply(this, a);
    const m = GRAPH && edges.get(this);
    if (m) {
      if (!a.length) m.clear();
      else if (typeof a[0] === 'number') { for (const [k, e] of m) if (e.out === a[0]) m.delete(k); }
      else for (const [k, e] of m) if (e.dest === a[0] && (a.length < 2 || e.out === a[1]) && (a.length < 3 || e.inp === a[2])) m.delete(k);
      if (!m.size) edges.delete(this);
    }
    return r;
  };

  // Which getters of a node class return AudioParams, found once per class.
  const paramNames = new Map();
  const params = (n) => {
    const proto = Object.getPrototypeOf(n);
    let names = paramNames.get(proto);
    if (!names) {
      names = [];
      for (let p = proto; p && p !== AudioNode.prototype; p = Object.getPrototypeOf(p)) {
        for (const [k, d] of Object.entries(Object.getOwnPropertyDescriptors(p))) {
          if (!d.get) continue;
          try { if (n[k] instanceof AudioParam) names.push(k); } catch { /* not readable here */ }
        }
      }
      paramNames.set(proto, names);
    }
    for (const k of names) owner.set(n[k], n);
    if (n.parameters?.forEach) n.parameters.forEach((v) => owner.set(v, n));
  };

  // Memory: what is still allocated, by kind, counted down as the collector frees it.
  const alive = {}; const bufs = { count: 0, bytes: 0 }; const waves = { count: 0 };
  const nodeReg = new FinalizationRegistry((k) => { alive[k]--; });
  const bufReg = new FinalizationRegistry((b) => { bufs.count--; bufs.bytes -= b; });
  const waveReg = new FinalizationRegistry(() => { waves.count--; });
  const trackBuffer = (b) => { if (b) { const bytes = b.length * b.numberOfChannels * 4; bufs.count++; bufs.bytes += bytes; bufReg.register(b, bytes); } return b; };
  const keep = (n, kind) => {
    if (building) return n;
    if (GRAPH) params(n);
    if (!GRAPH) { alive[kind] = (alive[kind] || 0) + 1; nodeReg.register(n, kind); }
    if (performance.now() >= T.mark) { T.born.set(n, kind); T.made++; }
    return n;
  };
  const BP = BaseAudioContext.prototype;
  for (const m of Object.getOwnPropertyNames(BP)) {
    if (!m.startsWith('create') || typeof BP[m] !== 'function') continue;
    const f = BP[m];
    if (m === 'createBuffer') BP[m] = function (...a) { return trackBuffer(f.apply(this, a)); };
    else if (m === 'createPeriodicWave') BP[m] = function (...a) { const w = f.apply(this, a); waves.count++; waveReg.register(w, 0); return w; };
    else BP[m] = function (...a) { return keep(f.apply(this, a), m.slice(6)); };
  }
  const decode = BP.decodeAudioData;
  BP.decodeAudioData = function (...a) { const p = decode.apply(this, a); p?.then?.(trackBuffer, () => {}); return p; };
  // Constructors too, as Proxies so `instanceof` still holds.
  const wrap = (name, after) => {
    const C = window[name]; if (!C) return;
    window[name] = new Proxy(C, { construct(t, a, nt) { return after(Reflect.construct(t, a, nt)); } });
  };
  wrap('AudioWorkletNode', (n) => keep(n, 'Worklet'));
  wrap('AudioBuffer', trackBuffer);
  for (const k of ['Gain', 'Oscillator', 'BiquadFilter', 'AudioBufferSource', 'ConstantSource', 'Convolver', 'Delay', 'DynamicsCompressor', 'WaveShaper', 'StereoPanner', 'Panner', 'ChannelSplitter', 'ChannelMerger', 'IIRFilter', 'Analyser']) {
    wrap(`${k}Node`, (n) => keep(n, k === 'AudioBufferSource' ? 'BufferSource' : k));
  }

  const SP = AudioScheduledSourceNode.prototype; const st = SP.start;
  const open = GRAPH ? new Set() : null;
  SP.start = function (...a) {
    const r = st.apply(this, a);
    T.live++; open?.add(this);
    if (open && window.__stacks) this.__stack = (new Error().stack || '').split(String.fromCharCode(10)).slice(1, 16).map((l) => l.split('@')[0]).join(' < ');
    this.addEventListener('ended', () => { T.live--; open?.delete(this); }, { once: true });
    return r;
  };
  window.__openStacks = () => { const by = {}; for (const n of open || []) if (n.__stack) by[n.constructor.name + ' @ ' + n.__stack] = (by[n.constructor.name + ' @ ' + n.__stack] || 0) + 1;
    return Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 8); };
  // What the never-ended sources are: their class and their rate, which names most of them
  // (a 12.7 / 7.1 / 4.7 Hz oscillator is JMJR-4's flutter, a 0.05× buffer its jitter).
  window.__openSources = () => { const by = {};
    for (const n of open || []) { const k = n.constructor.name + (n.frequency ? ' ' + Math.round(n.frequency.value * 10) / 10 + 'Hz' : n.playbackRate ? ' x' + n.playbackRate.value : '');
      by[k] = (by[k] || 0) + 1; }
    return Object.fromEntries(Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 8)); };

  const settle = (ms) => new Promise((r) => setTimeout(r, ms));
  window.__census = async () => {
    if (!GRAPH) {
      // Collect, let the registry's callbacks run, collect again.
      const forced = typeof window.gc === 'function';
      for (let i = 0; i < 3 && forced; i++) { window.gc(); await settle(300); }
      const nodes = Object.values(alive).reduce((s, n) => s + n, 0);
      return { mode, forced, live: T.live, nodes, alive: { ...alive }, buffers: bufs.count, bufferBytes: bufs.bytes, waves: waves.count };
    }
    // Walk back from every destination: the pulled graph. A param edge counts for its owner.
    const back = new Map(); let unowned = 0;
    for (const [src, m] of edges) for (const e of m.values()) {
      const to = e.dest instanceof AudioParam ? owner.get(e.dest) : e.dest;
      if (!to) { unowned++; continue; }
      let b = back.get(to); if (!b) back.set(to, b = []); b.push(src);
    }
    const seen = new Set(); const stack = [];
    for (const c of ctxs) stack.push(c.destination);
    // An AnalyserNode fed from upstream with nothing downstream is an AUTOMATIC PULL node:
    // the browser renders it, and what feeds it, every quantum (mixer.js, the effect sleeper).
    for (const to of back.keys()) if (to instanceof AnalyserNode && !edges.get(to)?.size) stack.push(to);
    while (stack.length) { const n = stack.pop(); if (seen.has(n)) continue; seen.add(n); for (const s of back.get(n) || []) stack.push(s); }
    const by = {}; let wired = 0;
    for (const n of seen) { const k = T.born.get(n); if (!k) continue; wired++; by[k] = (by[k] || 0) + 1; }
    return { mode, live: T.live, wired, by, made: T.made, pulled: seen.size, unownedParamEdges: unowned };
  };
}

const ENTRY = `import { Audio } from ${JSON.stringify(join(SRC, 'engine/audio.js'))};
import * as MIXER from ${JSON.stringify(join(SRC, 'engine/mixer.js'))};
import { FIXTURES } from ${JSON.stringify(join(ROOT, 'tools/lib/audio-audit-fixtures.js'))};
window.__samples = [];
window.__setup = async ({ start, burn }) => {
  Audio.setMrdrQuality('phone');
  Audio.setMixerMeteringEnabled(false);
  Audio.setSilentLaneSkip(true);
  Audio.setCaptureEnabled(false);
  Audio.setLatencyHint(0.05);
  // As main.js sets it for the game: a muted insert is taken out of the graph.
  MIXER.setParkMutedEffects(true);
  // And deep sleep where the game turns it on (WebKit), if this engine has it (--src copies
  // from before 22 Oct do not).
  MIXER.setDeepSleep?.(MIXER.deepSleepSuits?.());
  Audio.ensure(); try { await Audio.ctx.resume(); } catch (e) {}
  if (Audio.mixer) await Audio.mixer.ready;
  const ctx = Audio.ctx;
  if (burn) {
    await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([${JSON.stringify(BURN)}], { type: 'application/javascript' })));
    const node = new AudioWorkletNode(ctx, 'burn', { numberOfInputs: 0, outputChannelCount: [1], processorOptions: { start } });
    node.port.onmessage = (e) => window.__samples.push(e.data);
    const g = ctx.createGain(); g.gain.value = 0; node.connect(g); g.connect(ctx.destination);
  }
  return { state: ctx.state, sampleRate: ctx.sampleRate, baseLatency: ctx.baseLatency ?? null, outputLatency: ctx.outputLatency ?? null,
    worklet: !!ctx.audioWorklet, secure: window.isSecureContext, userAgent: navigator.userAgent };
};
window.__play = (bank, mix, arrangement) => { window.__track.mark = performance.now(); Audio.setBank(bank, mix, arrangement); return Audio.ctx.currentTime; };
window.__now = () => Audio.ctx.currentTime;
window.__stopSong = () => { Audio.setBank(null); return Audio.ctx.currentTime; };
window.__replay = (bank, mix, arrangement) => { Audio.setBank(bank, mix, arrangement); return Audio.ctx.currentTime; };
window.__probe = () => ({ lanes: (Audio.mixer?.lanes || []).length, mixer: !!Audio.mixer, skip: Audio.silentLaneSkip, silent: (Audio.mixer?.lanes || []).filter((l) => Audio.mixer.laneSilent(l)).length, hasSetMute: typeof Audio.mixer?.lane('bass')?.setMute });
window.__silenceAll = (on) => { for (const l of Audio.mixer?.lanes || []) Audio.mixer.lane(l)?.setMute(on); return Audio.ctx.currentTime; };
window.__silence = (lanes, on) => { for (const l of lanes) Audio.mixer?.lane(l)?.setMute(on); return Audio.ctx.currentTime; };
window.__fixtureStart = (name) => {
  window.__track.mark = performance.now();
  const ctx = Audio.ctx, f = FIXTURES[name];
  const out = ctx.createGain(); out.gain.value = 0.2; out.connect(ctx.destination);
  const st = window.__fx = { tick: 0, on: true };
  f.setup?.(ctx, out, st);
  setInterval(() => { if (!st.on) return; f.note(ctx, out, ctx.currentTime + 0.05, st); st.tick++; }, 250);
  return ctx.currentTime;
};
window.__fixtureSilence = (on) => { window.__fx.on = !on; return Audio.ctx.currentTime; };`;

const esbuild = require('esbuild');
const built = await esbuild.build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' }, bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent' });
const HTML = `<!doctype html><meta charset="utf-8"><script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}</script>`;
const playwright = require('playwright');
const BROWSER = flag('browser') || (MODE === 'memory' ? 'chromium' : 'webkit');
const launch = () => playwright[BROWSER].launch({ headless: true,
  ...(BROWSER === 'chromium' ? { args: ['--js-flags=--expose-gc', '--autoplay-policy=no-user-gesture-required'] } : {}) });
let browser = await launch();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };

// What anyone re-reading a result needs to reproduce it.
const git = (...a) => { try { return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return null; } };
const RUN_META = {
  at: new Date().toISOString(), command: `node tools/audio-audit.js ${args.join(' ')}`,
  revision: git('rev-parse', 'HEAD'),
  dirty: (git('status', '--porcelain', '--', 'src', 'tools') || '').split('\n').filter(Boolean),
  src: SRC, browser: BROWSER, browserVersion: browser.version(),
  os: `${os.platform()} ${os.release()} ${os.arch()}`, cpu: os.cpus()[0]?.model, cores: os.cpus().length,
  mode: MODE, counts: COUNTS, seconds: SECONDS, copies: COPIES, phrase: PHRASE,
  setup: 'latencyHint 0.05, MRDR-3 phone, metering off, capture off, silent-lane skip on, muted inserts parked, deep sleep as the game sets it',
};

async function openPage(burn, start) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  if (flag('stacks')) await page.addInitScript(() => { window.__stacks = true; });
  await page.addInitScript(initAudit, MODE);
  await page.route('https://mashenstein.live/', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: HTML }));
  await page.goto('https://mashenstein.live/');
  const info = await page.evaluate((a) => window.__setup(a), { start, burn });
  if (info.state !== 'running') throw new Error(`context is ${info.state}`);
  return { page, errors, info };
}

// The empty context's burn, once a run: what "0 % load" is on this machine right now.
let EMPTY = null;
async function calibrate() {
  if (COUNTS || EMPTY) return EMPTY;
  const { page } = await openPage(true, 200000);
  await sleep(20000);
  const s = await page.evaluate(() => window.__samples);
  await page.close();
  EMPTY = median(s.filter((x) => x.at > 10).map((x) => x.iters));
  log(`calibration: an empty context burns ${EMPTY} iterations a quantum`);
  return EMPTY;
}

// The numbers a census is judged on, per mode.
const KEYS = MODE === 'graph' ? ['wired', 'live'] : ['nodes', 'bufferBytes', 'live'];

/**
 * One subject, in one page. `play` starts it and returns the context time; `quiet(on)` silences
 * or resumes it. Censuses are taken with nothing sounding, so in-flight notes never count.
 */
async function measure(name, { play, quiet }) {
  const { page, errors, info } = await openPage(!COUNTS, Math.round((EMPTY || 400000) * 0.95));
  // The burner starts just under the empty context's edge and settles on this page's own
  // before anything plays: that is the page's 0 %.
  if (!COUNTS) await sleep(22000);
  const t0 = await play(page);
  const at = async () => (await page.evaluate(() => window.__now())) - t0;
  const until = async (sec) => { for (;;) { const t = await at(); if (t >= sec) return; await sleep(Math.min(2000, (sec - t) * 1000 + 50)); } };
  const A = Math.min(24, Math.round(SECONDS / 3));
  await until(A);
  await quiet(page, true);
  await sleep(5000);
  const censusA = await page.evaluate(() => window.__census());
  const resumeAt = await at();
  await quiet(page, false);
  await until(resumeAt + (SECONDS - A));
  const endAt = await at();
  await quiet(page, true);
  await sleep(5000);
  const censusB = await page.evaluate(() => window.__census());
  let censusC = null;
  if (KEYS.some((k) => censusB[k] > censusA[k])) {
    await sleep(CONFIRM_MS);
    censusC = await page.evaluate(() => window.__census());
  }
  const openSources = await page.evaluate(() => window.__openSources());
  if (flag('stacks')) for (const [k, n] of await page.evaluate(() => window.__openStacks())) log(`   ${String(n).padStart(5)}  ${k}`);
  if (!COUNTS) await sleep(14000);
  const rawBurn = COUNTS ? [] : await page.evaluate(() => window.__samples);
  const levels = await page.evaluate(() => window.__levels);
  await page.close();

  const base = median(rawBurn.filter((x) => x.at < t0 - 1 && x.at > t0 - 13).map((x) => x.iters));
  const samples = rawBurn.map((x) => ({ t: x.at - t0, load: 1 - x.iters / base }));
  const win = (a, b) => median(samples.filter((x) => x.t >= a && x.t < b).map((x) => x.load));
  // Output while it played: the first window and the second, before each silence.
  const played = levels.filter((l) => (l.t - t0 >= 0 && l.t - t0 < A) || (l.t - t0 >= resumeAt && l.t - t0 < endAt));
  const output = {
    peak: Math.max(0, ...played.map((l) => l.peak)),
    rms: Math.sqrt(median(played.map((l) => l.ms / Math.max(1, l.n)))) || 0,
    nonFinite: levels.reduce((s, l) => s + l.bad, 0),
  };
  const growth = Object.fromEntries(KEYS.map((k) => [k, censusB[k] - censusA[k]]));
  const confirmed = Object.fromEntries(KEYS.map((k) => [k, growth[k] > 0 && (censusC ? censusC[k] - censusA[k] > 0 : false)]));
  const r = {
    subject: name, mode: MODE, seconds: SECONDS, errors: errors.slice(0, 3),
    censusA, censusB, censusC, growth, openSources, output,
    // The Stage 1 fields, which tests/audio-leaks.js and the sweeps' readers use.
    wiredA: censusA.wired ?? null, wiredB: censusB.wired ?? null, wiredC: censusC?.wired ?? null,
    wiredGrowth: growth.wired ?? null, liveA: censusA.live, live: censusB.live, made: censusB.made ?? null,
  };
  r.unavailable = output.peak < SOUNDED;
  r.leak = Object.values(confirmed).some(Boolean);
  r.leakIn = KEYS.filter((k) => confirmed[k]);
  r.tail = !r.leak && KEYS.some((k) => growth[k] > 0);
  r.status = r.unavailable ? 'UNAVAILABLE' : r.leak ? 'LEAK' : 'ok';
  if (!COUNTS) {
    const first = win(4, A);
    const last = win(endAt - Math.min(30, SECONDS - A - 4), endAt);
    const idle = win(endAt + 6, endAt + 18);
    const playing = median([first, last]);
    Object.assign(r, { playing, idle, growthLoad: last - first });
  }
  r.meta = { ...RUN_META, page: info };
  r.raw = { t0, A, resumeAt, endAt, burnBase: base, burn: rawBurn, levels };
  return r;
}

const pct = (v) => (Number.isFinite(v) ? `${(v * 100).toFixed(1)}%` : '-');
const counts = (r) => KEYS.map((k) => `${k} ${r.censusA[k]} → ${r.censusB[k]}${r.censusC ? ` → ${r.censusC[k]}` : ''}`).join('; ');
function report(r) {
  log(`${r.subject.padEnd(30)} ${r.status.padEnd(11)} ${counts(r)}${r.tail ? ' (a tail: back by the third census)' : ''}`
    + `; output peak ${r.output.peak.toExponential(1)}${r.output.nonFinite ? `, ${r.output.nonFinite} NON-FINITE` : ''}`
    + (r.playing != null ? `; playing ${pct(r.playing)}, idle ${pct(r.idle)}, growth ${pct(r.growthLoad)}` : '')
    + (r.live - r.liveA > 0 ? `  STILL RUNNING: ${JSON.stringify(r.openSources)}` : '')
    + (r.errors.length ? `  ERRORS: ${r.errors[0]}` : ''));
}

function save(results) {
  const dir = join(ROOT, 'work', 'audit', new Date().toISOString().slice(0, 10));
  mkdirSync(dir, { recursive: true });
  const fresh = !existsSync(join(dir, 'REPORT.md'));
  if (fresh) appendFileSync(join(dir, 'REPORT.md'), '| subject | mode | verdict | counts, first → second (→ third) silence | output peak | playing | idle after |\n| --- | --- | --- | --- | --- | --- | --- |\n');
  for (const r of results) {
    writeFileSync(join(dir, `${r.subject.replace(/[^\w.:-]+/g, '_')}${r.mode === 'memory' ? '.memory' : ''}.json`), JSON.stringify(r));
    if (!r.censusA) continue;
    appendFileSync(join(dir, 'REPORT.md'), `| ${r.subject}${SRC !== join(ROOT, 'src') ? ` (src ${SRC})` : ''} | ${r.mode} | ${r.status} | ${counts(r)} | ${r.output.peak.toExponential(1)} | ${pct(r.playing)} | ${pct(r.idle)} |\n`);
  }
}

/** The engine playing a bank on `lanes`. */
const bankSubject = (bank, mix, lanes, arrangement) => ({
  play: (page) => page.evaluate((a) => window.__play(a.bank, a.mix, a.arrangement), { bank, mix, arrangement }),
  quiet: (page, on) => page.evaluate((a) => window.__silence(a.lanes, a.on), { lanes, on }),
});

/** A library preset, or — `params` — a song's own copy of one, as that song plays it. */
async function synthSubject(id, { params = null, name = null } = {}) {
  const { VOICES } = await import(join(SRC, 'data/voices.js'));
  const v = VOICES[id];
  if (!v) throw new Error(`no preset ${id}`);
  const drum = (params?.kind ?? v.kind) === 'drum';
  const p = phraseBank(drum ? 'tom' : 'lead', drum);
  const voice = Object.fromEntries(p.keys.map((k) => [`${k}Voice`, id]));
  const voiceParams = params ? Object.fromEntries(p.keys.map((k) => [`${k}Voice`, params])) : undefined;
  const r = await measure(name || `${id} (${v.synth || v.kind})`, bankSubject(p.bank, { voice, ...(voiceParams ? { voiceParams } : {}), layers: p.layers }, p.keys));
  r.notesPerSec = p.notesPerSec;
  return r;
}

/** Every lane sound of the game's songs (src/data/songs), with each song's own settings. */
async function songSubjects(only = null) {
  const { readdirSync } = await import('node:fs');
  const { VOICES } = await import(join(SRC, 'data/voices.js'));
  const out = [];
  for (const f of readdirSync(join(SRC, 'data/songs')).filter((x) => x.endsWith('.js') && !['index.js', 'shared.js'].includes(x)).sort()) {
    const song = f.slice(0, -3);
    if (only && only !== song) continue;
    const g = await import(join(SRC, 'data/songs', f));
    for (const [vk, id] of Object.entries(g.mix?.voice || {})) {
      if (!VOICES[id]) continue;
      const v = VOICES[id];
      const key = `${song}:${vk.replace(/Voice$/, '')}`;
      if (ONLY && !ONLY.has(key)) continue;
      out.push({ id, params: g.mix.voiceParams?.[vk] || null, name: `${key} ${id} (${v.synth || v.kind})` });
    }
  }
  return out;
}

async function fresh() { try { await browser.close(); } catch { /* gone */ } browser = await launch(); }

const results = [];
try {
  await calibrate();
  let ids = [];
  if (command === 'synth' && target?.startsWith('family:')) {
    const { VOICES } = await import(join(SRC, 'data/voices.js'));
    const fam = target.slice(7);
    ids = Object.entries(VOICES).filter(([, v]) => (v.synth || v.kind) === fam).map(([id]) => id);
    if (flag('limit')) ids = ids.slice(0, Number(flag('limit')));
  } else if (command === 'synth' && target) {
    // --params=<file.json>: the preset with a song's own settings, to bisect a leak.
    const pf = flag('params');
    ids = [pf ? { id: target, params: JSON.parse(readFileSync(pf, 'utf8')), name: `${target} with ${pf.split('/').pop()}` } : target];
  }
  else if (command === 'leaks') ids = LEAK_PRESETS;
  else if (command === 'songs') ids = await songSubjects(target || null);
  if (ids.length) {
    for (const one of ids) {
      const id = typeof one === 'string' ? one : one.id;
      try { const r = await synthSubject(id, typeof one === 'string' ? {} : one); results.push(r); report(r); save([r]); }
      catch (e) {
        log(`${(one.name || id).padEnd(30)} FAILED: ${String(e.message).split('\n')[0]}`);
        results.push({ subject: one.name || id, status: 'FAILED', error: String(e.message).split('\n')[0], meta: RUN_META });
        await fresh();
      }
    }
  } else if (command === 'fixture' && target) {
    const { FIXTURES } = await import(join(ROOT, 'tools/lib/audio-audit-fixtures.js'));
    const names = target === 'all' ? Object.keys(FIXTURES).filter((n) => (FIXTURES[n].mode || 'graph') === MODE) : [target];
    for (const n of names) {
      if (!FIXTURES[n]) throw new Error(`no fixture ${n}`);
      const r = await measure(`fixture ${n}`, {
        play: (page) => page.evaluate((x) => window.__fixtureStart(x), n),
        quiet: (page, on) => page.evaluate((x) => window.__fixtureSilence(x), on),
      });
      r.expect = FIXTURES[n].expect;
      results.push(r); report(r); save([r]);
    }
  } else if (command === 'song' && target) {
    // A whole game song, as the game plays it — its arrangement, automation and mix — stopped
    // twice (`setBank(null)`, as the menus stop music) and started again from the top in
    // between: what a stop leaves standing must be the same each time (Stage L, the first
    // whole-song check). Muting every lane does not silence a song: its arrangement sets
    // lane levels and mutes of its own as it goes.
    const file = [join(SRC, 'data/songs', `${target}.js`), join(SRC, 'data/imported', `${target}.js`)].find(existsSync);
    const g = await import(file);
    const song = { bank: g.bank, mix: g.mix, arrangement: g.arrangement };
    const r = await measure(`song ${target}`, {
      play: (page) => page.evaluate((a) => window.__play(a.bank, a.mix, a.arrangement), song),
      quiet: (page, on) => page.evaluate((a) => (a.on ? window.__stopSong() : window.__replay(a.bank, a.mix, a.arrangement)), { ...song, on }),
    });
    results.push(r); report(r);
  } else if (command === 'strip' && target) {
    // STANDING COST (Stage 4): song `target`'s whole mix — every strip, insert, send and aux —
    // with not one note in it, for SECONDS, against this page's own baseline. Every lane kept,
    // as rests, so the mix builds the strips it builds for the song; the arrangement
    // (`sections`, `order`) kept as it is — the order is section NUMBERS, and a section is a
    // partial bank whose own lanes are emptied the same way.
    const file = [join(SRC, 'data/songs', `${target}.js`), join(SRC, 'data/imported', `${target}.js`)].find(existsSync);
    const g = await import(file);
    const rests = (block) => Object.fromEntries(Object.entries(block).map(([k, v]) => {
      if (k === 'order' || !Array.isArray(v)) return [k, v];
      if (k === 'sections') return [k, v.map((s) => (s && typeof s === 'object' ? rests(s) : s))];
      return [k, v.map((x) => (typeof x === 'boolean' ? false : null))];
    }));
    const empty = rests(g.bank);
    // --without=effects,sends,eq,master: the same mix with those parts taken out, to see
    // which of them the standing cost is.
    const without = new Set(String(flag('without') || '').split(',').filter(Boolean));
    const mix = { ...g.mix, lanes: Object.fromEntries(Object.entries(g.mix?.lanes || {}).map(([k, v]) => {
      const lane = { ...v };
      if (without.has('effects')) delete lane.effects;
      if (without.has('sends')) delete lane.send;
      if (without.has('eq')) delete lane.eq;
      return [k, lane];
    })) };
    if (without.has('master')) delete mix.masterEffects;
    // spotfx: the bank's automation (Spot FX sections and level moves), built for the whole
    // song when it starts.
    if (without.has('spotfx')) { delete empty.automation; for (const sec of empty.sections || []) if (sec && typeof sec === 'object') delete sec.automation; }
    const { page, errors, info } = await openPage(!COUNTS, Math.round((EMPTY || 400000) * 0.95));
    if (!COUNTS) await sleep(22000);
    // Before the song: the engine as booted. Its strips for the standard lanes are built
    // already, so the song's own count is the difference — and the standing load is the
    // song's over the booted engine's, not over nothing.
    const before = await page.evaluate(() => window.__census());
    const t0 = await page.evaluate((a) => window.__play(a.bank, a.mix, a.arrangement), { bank: empty, mix, arrangement: g.arrangement });
    await sleep(SECONDS * 1000);
    const census = await page.evaluate(() => window.__census());
    const raw = COUNTS ? [] : await page.evaluate(() => window.__samples);
    await page.close();
    const base = median(raw.filter((x) => x.at < t0 - 1 && x.at > t0 - 13).map((x) => x.iters));
    const load = (a, b) => median(raw.filter((x) => x.at - t0 >= a && x.at - t0 < b).map((x) => 1 - x.iters / base));
    const r = { subject: `strip ${target}${without.size ? ` without ${[...without].join('+')}` : ''}`, mode: MODE, errors: errors.slice(0, 3), first: load(2, 12), standing: load(12, SECONDS),
      pulledBefore: before.pulled, pulled: census.pulled, songNodes: census.wired, by: census.by, live: census.live,
      meta: { ...RUN_META, page: info }, raw: { t0, burnBase: base, burn: raw, before, census } };
    log(`${r.subject}: standing ${pct(r.standing)} (first 10 s ${pct(r.first)}, before the effects sleep); pulled ${r.pulledBefore} → ${r.pulled} nodes (${r.songNodes} built by the song)`
      + (r.errors.length ? `  ERRORS: ${r.errors[0]}` : ''));
    results.push(r);
  } else if (command === 'effect' && target) {
    const p = phraseBank('lead', false);
    const voice = Object.fromEntries(p.keys.map((k) => [`${k}Voice`, EFFECT_CARRIER]));
    for (const [label, effects] of [['absent', []], [target, [{ id: target }]], [`${target} muted`, [{ id: target, mute: true }]]]) {
      const lanes = Object.fromEntries(p.keys.map((k) => [k, { effects }]));
      const r = await measure(`effect ${label} on ${EFFECT_CARRIER}`, bankSubject(p.bank, { voice, layers: p.layers, lanes }, p.keys));
      results.push(r); report(r);
    }
  } else {
    console.error('usage: node tools/audio-audit.js synth <id|family:SYNTH> | songs [id] | effect <id> | strip <song> | leaks | fixture <name|all>  [--seconds=N] [--counts] [--memory] [--browser=…] [--src=dir] [--json]');
    process.exitCode = 1;
  }
  if (results.length && !ids.length && command !== 'fixture') save(results);
  if (JSON_OUT) console.log(JSON.stringify(results.map(({ raw, ...r }) => r)));
} finally {
  await browser.close();
}
