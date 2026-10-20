// THE AUDIO AUDIT HARNESS — docs/AUDIO_SYNTH_AUDIT_PLAN.md, Stage 1 (20 Oct 2026).
//
// What one synth preset or one effect costs, measured the same way for every subject, over
// long enough for a leak to show: KNDO-5's dead notes were invisible for a bar and the whole
// of the iPad's budget by bar 40 of Rhythm Bankruptcy. Five numbers per subject:
//
//   per-note   the load while the phrase plays, above the lane's idle load, per note a second
//   idle       the load with the lane silent AFTER it has played (pools, leftovers, tails)
//   growth     load in the last 30 s minus the first 30 s, the same phrase throughout
//   live       sources started and not ended, 4 s after the lane went silent
//   wired+     nodes made during the phrase that are still connected, at the end of the phrase
//              minus at 30 s in — a pool fills and stops; a leak keeps climbing
//
// Growth and wired+ are the leak numbers. wired+ and live are COUNTS, true on a busy machine;
// per-note, idle and growth are LOAD, read by an in-thread burner worklet (the method of
// work/local/_live-headroom-webkit.mjs: load = 1 − burn / burn on an empty context) and want a
// quiet machine. `--counts` skips the burner.
//
// Headless WebKit (the iPad's engine), phone setup (latencyHint 0.05, no capture, metering
// off, MRDR-3 PHONE, muted lanes skipped as in a run), over https so worklets run. SILENT: a
// gain-0 sink sits in front of the speakers (memory headless-audio-must-be-silent).
//
//   node tools/audio-audit.js synth <presetId|family:<SYNTH>> [--limit=N]
//   node tools/audio-audit.js effect <effectId>            on a plain MRDR-3 phrase, vs absent
//   node tools/audio-audit.js leaks                        one preset per family, counts only
//   node tools/audio-audit.js songs [songId]               every lane sound of the game's songs, as each song sets it
//     --seconds=N     the phrase's length (150; `leaks` 60)
//     --counts        counts only, no burner (fast, any machine)
//     --copies=N      lanes playing the phrase at once (8)
//     --src=<dir>     bundle the engine from another tree (a before/after: a copy of src/)
//     --json          print the results as JSON (tests/audio-leaks.js reads it)
//     --params=<f>    synth: the preset with these settings (a song's voiceParams entry)
//     --stacks        print who started the sources still running at the end
//
// Writes work/audit/<date>/<subject>.json and appends work/audit/<date>/REPORT.md.
import { mkdirSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (k) => { const a = args.find((x) => x === `--${k}` || x.startsWith(`--${k}=`)); return a ? (a.includes('=') ? a.slice(a.indexOf('=') + 1) : true) : null; };
const words = args.filter((a) => !a.startsWith('--'));
const [command, target] = words;
const COUNTS = !!flag('counts') || command === 'leaks';
const SECONDS = Number(flag('seconds') || (command === 'leaks' ? 60 : 150));
const SRC = resolve(flag('src') || join(ROOT, 'src'));
const JSON_OUT = !!flag('json');
const log = (...a) => { if (!JSON_OUT) console.log(...a); };

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

// Before the page's own code: silence, and the node and source counts. Every connection is
// kept as an edge, so the census can walk back from the speakers and count what the browser
// actually pulls each quantum — a finished note still wired into a lane is pulled; a stopped
// oscillator whose gain has been unplugged is not, however many of its own outputs remain.
const INIT = `(() => {
  const edges = new Map();       // node -> Set of AudioNode destinations
  const ctxs = new Set();
  const orig = AudioNode.prototype.connect; const sinks = new WeakMap();
  AudioNode.prototype.connect = function (dest, ...rest) {
    if (dest instanceof AudioNode) { let e = edges.get(this); if (!e) edges.set(this, e = new Set()); e.add(dest); ctxs.add(dest.context); }
    if (dest instanceof AudioDestinationNode) { const ctx = dest.context; let s = sinks.get(ctx);
      if (!s) { s = ctx.createGain(); s.gain.value = 0; orig.call(s, dest); edges.set(s, new Set([dest])); sinks.set(ctx, s); }
      edges.get(this).delete(dest); edges.get(this).add(s);
      return orig.call(this, s, ...rest); }
    return orig.call(this, dest, ...rest); };
  const dis = AudioNode.prototype.disconnect;
  AudioNode.prototype.disconnect = function (...a) {
    if (a.length && a[0] instanceof AudioNode) edges.get(this)?.delete(a[0]); else edges.delete(this);
    return dis.apply(this, a); };
  const T = window.__track = { live: 0, born: new WeakMap(), mark: Infinity, made: 0 };
  const keep = (n, kind) => { if (performance.now() >= T.mark) { T.born.set(n, kind); T.made++; } return n; };
  const BP = BaseAudioContext.prototype;
  for (const m of Object.getOwnPropertyNames(BP)) if (m.startsWith('create') && m !== 'createBuffer' && m !== 'createPeriodicWave') {
    const f = BP[m]; BP[m] = function (...a) { return keep(f.apply(this, a), m.slice(6)); };
  }
  const AW = window.AudioWorkletNode;
  if (AW) window.AudioWorkletNode = class extends AW { constructor(...a) { super(...a); keep(this, 'Worklet'); } };
  const SP = AudioScheduledSourceNode.prototype; const st = SP.start;
  const open = new Set();
  SP.start = function (...a) {
    T.live++; open.add(this);
    if (window.__stacks) this.__stack = (new Error().stack || '').split(String.fromCharCode(10)).slice(1, 16).map((l) => l.split('@')[0]).join(' < ');
    this.addEventListener('ended', () => { T.live--; open.delete(this); }, { once: true }); return st.apply(this, a); };
  window.__openStacks = () => { const by = {}; for (const n of open) if (n.__stack) by[n.constructor.name + ' @ ' + n.__stack] = (by[n.constructor.name + ' @ ' + n.__stack] || 0) + 1;
    return Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 8); };
  // What the never-ended sources are: their class and their rate, which names most of them
  // (a 12.7 / 7.1 / 4.7 Hz oscillator is JMJR-4's flutter, a 0.05× buffer its jitter).
  window.__openSources = () => { const by = {};
    for (const n of open) { const k = n.constructor.name + (n.frequency ? ' ' + Math.round(n.frequency.value * 10) / 10 + 'Hz' : n.playbackRate ? ' x' + n.playbackRate.value : '');
      by[k] = (by[k] || 0) + 1; }
    return Object.fromEntries(Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 8)); };
  // Walk back from every destination over the recorded edges: the pulled graph.
  window.__census = () => {
    const back = new Map();
    for (const [src, dests] of edges) for (const d of dests) { let b = back.get(d); if (!b) back.set(d, b = []); b.push(src); }
    const seen = new Set(); const stack = [];
    for (const c of ctxs) if (c && c.destination) stack.push(c.destination);
    while (stack.length) { const n = stack.pop(); if (seen.has(n)) continue; seen.add(n); for (const s of back.get(n) || []) stack.push(s); }
    const by = {}; let wired = 0;
    for (const n of seen) { const k = T.born.get(n); if (!k) continue; wired++; by[k] = (by[k] || 0) + 1; }
    return { live: T.live, wired, by, made: T.made, pulled: seen.size };
  };
})();`;

const ENTRY = `import { Audio } from ${JSON.stringify(join(SRC, 'engine/audio.js'))};
window.__samples = [];
window.__setup = async ({ start, burn }) => {
  Audio.setMrdrQuality('phone');
  Audio.setMixerMeteringEnabled(false);
  Audio.setSilentLaneSkip(true);
  Audio.setCaptureEnabled(false);
  Audio.setLatencyHint(0.05);
  Audio.ensure(); try { await Audio.ctx.resume(); } catch (e) {}
  if (Audio.mixer) await Audio.mixer.ready;
  const ctx = Audio.ctx;
  if (burn) {
    await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([${JSON.stringify(BURN)}], { type: 'application/javascript' })));
    const node = new AudioWorkletNode(ctx, 'burn', { numberOfInputs: 0, outputChannelCount: [1], processorOptions: { start } });
    node.port.onmessage = (e) => window.__samples.push(e.data);
    const g = ctx.createGain(); g.gain.value = 0; node.connect(g); g.connect(ctx.destination);
  }
  return { state: ctx.state };
};
window.__play = (bank, mix) => { window.__track.mark = performance.now(); Audio.setBank(bank, mix); return Audio.ctx.currentTime; };
window.__now = () => Audio.ctx.currentTime;
window.__silence = (lanes, on) => { for (const l of lanes) Audio.mixer?.lane(l)?.setMute(on); return Audio.ctx.currentTime; };`;

const esbuild = require('esbuild');
const built = await esbuild.build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' }, bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent' });
const HTML = `<!doctype html><meta charset="utf-8"><script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}</script>`;
const { webkit } = require('playwright');
let browser = await webkit.launch({ headless: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };

async function openPage(burn, start) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  if (flag('stacks')) await page.addInitScript(() => { window.__stacks = true; });
  await page.addInitScript(INIT);
  await page.route('https://mashenstein.live/', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: HTML }));
  await page.goto('https://mashenstein.live/');
  const info = await page.evaluate((a) => window.__setup(a), { start, burn });
  if (info.state !== 'running') throw new Error(`context is ${info.state}`);
  return { page, errors };
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

/**
 * One subject, in one page: 12 s of nothing (this page's own 0 %), the phrase, the lanes
 * silent for 5 s (census A: only what stays wired after the notes have ended), the phrase
 * again to SECONDS, silent again (census B). A pool or a strip is the same size at A and B;
 * a leak is bigger at B by everything played in between. Censuses are taken with no notes
 * sounding, so in-flight voices never count.
 */
async function measure(name, bank, mix, lanes, notesPerSec) {
  // The burner starts just under the empty context's edge and settles on this page's own
  // before anything plays: that is the page's 0 %.
  const { page, errors } = await openPage(!COUNTS, Math.round((EMPTY || 400000) * 0.95));
  if (!COUNTS) await sleep(22000);
  const t0 = await page.evaluate((a) => window.__play(a.bank, a.mix), { bank, mix });
  const at = async () => (await page.evaluate(() => window.__now())) - t0;
  const until = async (sec) => { for (;;) { const t = await at(); if (t >= sec) return; await sleep(Math.min(2000, (sec - t) * 1000 + 50)); } };
  const A = Math.min(24, Math.round(SECONDS / 3));
  await until(A);
  await page.evaluate((l) => window.__silence(l, true), lanes);
  await sleep(5000);
  const censusA = await page.evaluate(() => window.__census());
  const resumeAt = await at();
  await page.evaluate((l) => window.__silence(l, false), lanes);
  await until(resumeAt + (SECONDS - A));
  const endAt = await at();
  await page.evaluate((l) => window.__silence(l, true), lanes);
  await sleep(5000);
  const censusB = await page.evaluate(() => window.__census());
  const openSources = await page.evaluate(() => window.__openSources());
  if (flag('stacks')) for (const [k, n] of await page.evaluate(() => window.__openStacks())) log(`   ${String(n).padStart(5)}  ${k}`);
  if (!COUNTS) await sleep(14000);
  let samples = [];
  if (!COUNTS) {
    const raw = await page.evaluate(() => window.__samples);
    const base = median(raw.filter((x) => x.at < t0 - 1 && x.at > t0 - 13).map((x) => x.iters));
    samples = raw.map((x) => ({ t: x.at - t0, load: 1 - x.iters / base }));
  }
  await page.close();
  const win = (a, b) => median(samples.filter((x) => x.t >= a && x.t < b).map((x) => x.load));
  const r = { subject: name, lanes: lanes.length, seconds: SECONDS, notesPerSec, errors: errors.slice(0, 3),
    live: censusB.live, liveA: censusA.live, openSources, wiredA: censusA.wired, wiredB: censusB.wired,
    wiredGrowth: censusB.wired - censusA.wired, wiredByKind: censusB.by, made: censusB.made };
  if (!COUNTS) {
    const first = win(4, A);
    const last = win(endAt - Math.min(30, SECONDS - A - 4), endAt);
    const idle = win(endAt + 6, endAt + 18);
    const playing = median([first, last]);
    Object.assign(r, { playing, idle, growth: last - first, perNote: (playing - idle) / notesPerSec });
  }
  // The verdict is the COUNT: a node still pulled after its note is a leak on any machine. The
  // load growth is reported beside it, but the burner moves ±3 points on its own — the 20 Oct
  // proof run had the pre-fix KNDO-5 at +4,224 wired nodes and no load growth to show for it,
  // and a clean MRDR-3 preset at +3.6 %.
  r.leak = r.wiredGrowth > 20;
  return r;
}

const pct = (v) => (Number.isFinite(v) ? `${(v * 100).toFixed(1)}%` : '-');
function report(r) {
  log(`${r.subject.padEnd(30)} ${r.leak ? 'LEAK ' : 'ok   '} left wired ${String(r.wiredA).padStart(5)} → ${String(r.wiredB).padStart(5)} (${r.wiredGrowth >= 0 ? '+' : ''}${r.wiredGrowth}); live ${r.liveA} → ${r.live}`
    + (r.playing != null ? `; playing ${pct(r.playing)}, idle ${pct(r.idle)}, growth ${pct(r.growth)}, per note/s ${pct(r.perNote)}` : '')
    + (r.live - r.liveA > 20 ? `  STILL RUNNING: ${JSON.stringify(r.openSources)}` : '')
    + (r.errors.length ? `  ERRORS: ${r.errors[0]}` : ''));
}

function save(results) {
  const dir = join(ROOT, 'work', 'audit', new Date().toISOString().slice(0, 10));
  mkdirSync(dir, { recursive: true });
  const fresh = !existsSync(join(dir, 'REPORT.md'));
  if (fresh) appendFileSync(join(dir, 'REPORT.md'), '| subject | verdict | left wired, first → second silence | live sources, first → second | playing | idle after | growth | per note/s |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n');
  for (const r of results) {
    writeFileSync(join(dir, `${r.subject.replace(/[^\w.:-]+/g, '_')}.json`), JSON.stringify(r, null, 1));
    appendFileSync(join(dir, 'REPORT.md'), `| ${r.subject}${SRC !== join(ROOT, 'src') ? ` (src ${SRC})` : ''} | ${r.leak ? 'LEAK' : 'ok'} | ${r.wiredA} → ${r.wiredB} (${r.wiredGrowth >= 0 ? '+' : ''}${r.wiredGrowth}) | ${r.liveA} → ${r.live} | ${pct(r.playing)} | ${pct(r.idle)} | ${pct(r.growth)} | ${pct(r.perNote)} |\n`);
  }
}

/** A library preset, or — `params` — a song's own copy of one, as that song plays it. */
async function synthSubject(id, { params = null, name = null } = {}) {
  const { VOICES } = await import(join(SRC, 'data/voices.js'));
  const v = VOICES[id];
  if (!v) throw new Error(`no preset ${id}`);
  const drum = (params?.kind ?? v.kind) === 'drum';
  const p = phraseBank(drum ? 'tom' : 'lead', drum);
  const voice = Object.fromEntries(p.keys.map((k) => [`${k}Voice`, id]));
  const voiceParams = params ? Object.fromEntries(p.keys.map((k) => [`${k}Voice`, params])) : undefined;
  return measure(name || `${id} (${v.synth || v.kind})`, p.bank, { voice, ...(voiceParams ? { voiceParams } : {}), layers: p.layers }, p.keys, p.notesPerSec);
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
      out.push({ id, params: g.mix.voiceParams?.[vk] || null, name: `${song}:${vk.replace(/Voice$/, '')} ${id} (${v.synth || v.kind})` });
    }
  }
  return out;
}

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
    ids = [pf ? { id: target, params: JSON.parse((await import('node:fs')).readFileSync(pf, 'utf8')), name: `${target} with ${pf.split('/').pop()}` } : target];
  }
  else if (command === 'leaks') ids = LEAK_PRESETS;
  else if (command === 'songs') ids = await songSubjects(target || null);
  if (ids.length) {
    for (const one of ids) {
      const id = typeof one === 'string' ? one : one.id;
      try { const r = await synthSubject(id, typeof one === 'string' ? {} : one); results.push(r); report(r); save([r]); }
      catch (e) {
        log(`${(one.name || id).padEnd(30)} FAILED: ${String(e.message).split('\n')[0]}`);
        try { await browser.close(); } catch { /* gone */ }
        browser = await webkit.launch({ headless: true });
      }
    }
  } else if (command === 'effect' && target) {
    const p = phraseBank('lead', false);
    const voice = Object.fromEntries(p.keys.map((k) => [`${k}Voice`, EFFECT_CARRIER]));
    for (const [label, effects] of [['absent', []], [target, [{ id: target }]], [`${target} muted`, [{ id: target, mute: true }]]]) {
      const lanes = Object.fromEntries(p.keys.map((k) => [k, { effects }]));
      const r = await measure(`effect ${label} on ${EFFECT_CARRIER}`, p.bank, { voice, layers: p.layers, lanes }, p.keys, p.notesPerSec);
      results.push(r); report(r);
    }
  } else {
    console.error('usage: node tools/audio-audit.js synth <id|family:SYNTH> | songs [id] | effect <id> | leaks  [--seconds=N] [--counts] [--src=dir] [--json]');
    process.exitCode = 1;
  }
  if (results.length && !ids.length) save(results);
  if (JSON_OUT) console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
