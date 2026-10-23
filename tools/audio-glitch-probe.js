// THE GLITCH CLASSES, PROVEN APART (docs/AUDIO_SYNTH_AUDIT_PLAN.md, Stage S, 22 Oct 2026).
//
// The glitch log (engine/glitch-log.js) calls a second CRACKLE when the audio clock falls
// behind the wall clock, DIP when one quarter of it does, and HOLES when the sequencer's
// queue runs dry. The guard acts on those names — 8-bit and density for crackle, more
// lookahead for holes — so they had better mean what they say. This plays a game song
// silently in headless WebKit and makes each kind of trouble on purpose:
//
//   clean   nothing added: what a healthy second reads, and how noisy Q is
//   dsp     a burner worklet on the audio thread costing more than a quantum's budget
//   dspDip  the same, but only for 200 ms of every 2 s (a chord entry's spike)
//   main    the main thread busy for 400 ms of every second (a long task, a GC, a layout)
//   both    dsp and main together
//
// Each second it records what main.js records — C (1 s audio/wall), Q (worst 250 ms, from
// getOutputTimestamp), M (worst queue margin, ms) and late passes — and classifies it with
// the glitch log's own thresholds. Wants a quiet machine: the burner's cost is fixed, so
// whatever else is running moves where the overload starts.
//
//   node tools/audio-glitch-probe.js [song] [--seconds=30] [--lookahead=0.5]
// Writes work/audit/<date>/glitch-probe-<song>.json.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (k) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : null; };
const SONG = args.find((a) => !a.startsWith('--')) || 'gravity';
// --banger=<style>:<seed>: a generated Lab song instead of a cabinet song. --burn=<share>: a
// constant background load on the audio thread, that share of a quantum's budget, so a spike
// in the song (a Spot FX section starting, a chord entry) shows as a DIP or CRACKLE on a Mac
// with far more headroom than an iPad. Both together run one mode, `song`, and report the
// seconds around each Spot FX section's start apart from the rest.
const BANGER = flag('banger');
const BURN_SHARE = flag('burn') ? Number(flag('burn')) : null;
const SECONDS = Number(flag('seconds') || 30);
const LOOKAHEAD = flag('lookahead') ? Number(flag('lookahead')) : null;
const { GLITCH } = await import(join(ROOT, 'src/engine/glitch-log.js'));

const BURN = `
class Burn extends AudioWorkletProcessor {
  constructor() { super(); this.iters = 0; this.on = true; this.acc = 0.5;
    this.port.onmessage = (e) => { if ('iters' in e.data) this.iters = e.data.iters; if ('on' in e.data) this.on = e.data.on; }; }
  process() {
    if (!this.on) return true;
    let x = this.acc; for (let i = 0; i < this.iters; i++) x = Math.sqrt(x + 1.2345); this.acc = x;
    return true;
  }
}
registerProcessor('burn', Burn);
// How many iterations fill one quantum on this machine, measured on an otherwise empty thread.
class Measure extends AudioWorkletProcessor {
  constructor() { super(); this.iters = 2000; this.n = 0; this.t = 0; this.done = false; }
  process() {
    if (this.done) return true;
    const t0 = Date.now(); let x = 0.5; for (let i = 0; i < this.iters; i++) x = Math.sqrt(x + 1.2345);
    const ms = Date.now() - t0;
    if (ms < 20) { this.iters *= 2; return true; }
    // iterations per millisecond, against a quantum's budget
    this.port.postMessage({ perMs: this.iters / ms, quantumMs: 128 / sampleRate * 1000, x });
    this.done = true; return true;
  }
}
registerProcessor('measure', Measure);`;

const ENTRY = `
import { Audio } from ${JSON.stringify(join(ROOT, 'src/engine/audio.js'))};
import * as MIXER from ${JSON.stringify(join(ROOT, 'src/engine/mixer.js'))};
import * as VOICES_ENGINE from ${JSON.stringify(join(ROOT, 'src/engine/voices.js'))};
window.run = async ({ song, seconds, lookahead, modes, burnShare, deep }) => {
  MIXER.setParkMutedEffects?.(true);
  // --deep: the game's own settings on WebKit — chains and idle strips asleep, pools trimmed.
  if (deep) { MIXER.setDeepSleep?.(true); VOICES_ENGINE.setTrimIdleSlots?.(true); }
  const conn = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (d, ...r) {
    if (d instanceof AudioDestinationNode) { const g = d.context.createGain(); g.gain.value = 0; conn.call(g, d); return conn.call(this, g, ...r); }
    return conn.call(this, d, ...r);
  };
  Audio.setMrdrQuality('phone'); Audio.setMixerMeteringEnabled(false); Audio.setCaptureEnabled(false);
  Audio.setSilentLaneSkip(true); Audio.setLatencyHint(0.05);
  Audio.ensure(); await Audio.ctx.resume(); if (Audio.mixer) await Audio.mixer.ready;
  if (lookahead) Audio.setSequencerLookahead(lookahead);
  const ctx = Audio.ctx;
  await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([${JSON.stringify(BURN)}], { type: 'application/javascript' })));
  const measure = new AudioWorkletNode(ctx, 'measure', { numberOfInputs: 0, outputChannelCount: [1] });
  const cal = await new Promise((r) => { measure.port.onmessage = (e) => r(e.data); measure.connect(ctx.destination); });
  measure.disconnect();
  const burn = new AudioWorkletNode(ctx, 'burn', { numberOfInputs: 0, outputChannelCount: [1] });
  burn.connect(ctx.destination);
  Audio.setBank(song.bank, song.mix, song.arrangement);
  await new Promise((r) => setTimeout(r, 6000));
  // main.js's own sampling, on every animation frame.
  const stamp = () => { const t = ctx.getOutputTimestamp?.(); return t && t.performanceTime > 0 ? { c: t.contextTime, w: t.performanceTime / 1000 } : { c: ctx.currentTime, w: performance.now() / 1000 }; };
  const rows = [];
  let mode = 'clean';
  let sec = { at: performance.now() / 1000, ctxAt: ctx.currentTime };
  let q = { ...stamp(), min: Infinity };
  let stop = false;
  const frame = () => {
    if (stop) return;
    const now = performance.now() / 1000;
    const s = stamp();
    const qw = s.w - q.w;
    if (qw > 0.6 || qw < 0) q = { ...s, min: q.min };
    else if (qw >= 0.25) { q.min = Math.min(q.min, (s.c - q.c) / qw); q.c = s.c; q.w = s.w; }
    if (now - sec.at >= 1) {
      const wall = now - sec.at;
      const h = Audio.takeSchedulerHealth();
      rows.push({ mode, at: ctx.currentTime, step: Audio.step, clock: (ctx.currentTime - sec.ctxAt) / wall, clockMin: Number.isFinite(q.min) ? q.min : null,
        margin: Number.isFinite(h.marginMin) ? Math.round(h.marginMin * 1000) : null, late: h.late, wall });
      q.min = Infinity;
      sec = { at: now, ctxAt: ctx.currentTime };
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  const iterFor = (share) => Math.round(cal.perMs * cal.quantumMs * share);
  let busy = null, dip = null;
  for (const m of modes) {
    mode = m;
    burn.port.postMessage({ on: false, iters: 0 });
    if (m === 'dsp' || m === 'both') burn.port.postMessage({ on: true, iters: iterFor(1.15) });
    if (m === 'song' && burnShare) burn.port.postMessage({ on: true, iters: iterFor(burnShare) });
    if (m === 'dspDip') {
      dip = setInterval(() => {
        burn.port.postMessage({ on: true, iters: iterFor(1.6) });
        setTimeout(() => burn.port.postMessage({ on: false }), 200);
      }, 2000);
    }
    if (m === 'main' || m === 'both') busy = setInterval(() => { const t = performance.now(); while (performance.now() - t < 400) { /* busy */ } }, 1000);
    await new Promise((r) => setTimeout(r, seconds * 1000));
    if (busy) { clearInterval(busy); busy = null; }
    if (dip) { clearInterval(dip); dip = null; }
    burn.port.postMessage({ on: false });
    mode = 'settle';
    await new Promise((r) => setTimeout(r, 5000));
  }
  stop = true;
  return { cal, rows, lookahead: Audio.sequencerLookahead, ua: navigator.userAgent, sampleRate: ctx.sampleRate,
    stampSource: typeof ctx.getOutputTimestamp === 'function' && ctx.getOutputTimestamp().performanceTime > 0 ? 'getOutputTimestamp' : 'currentTime' };
};`;

const esbuild = require('esbuild');
const built = await esbuild.build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' }, bundle: true, format: 'iife', write: false, logLevel: 'silent' });
const html = `<!doctype html><meta charset="utf-8"><script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}</script>`;
let g;
if (BANGER) {
  await import(join(ROOT, 'src/game/banger/lazy.js'));
  const make = await import(join(ROOT, 'src/game/banger/make.js'));
  const { STARTERS, FIRST_STARTER } = await import(join(ROOT, 'src/game/banger/starters.js'));
  const [style, seed] = BANGER.split(':');
  const moods = make.MAKER_MOODS.map((m) => m.id);
  g = make.makeBanger({ ...STARTERS[FIRST_STARTER].recipe, style, mood: moods[Number(seed) % moods.length], seed: Number(seed) });
} else g = await import(join(ROOT, 'src/data/songs', `${SONG}.js`));
const { webkit } = require('playwright');
const browser = await webkit.launch();
let out;
try {
  const page = await browser.newPage();
  await page.route('https://mashenstein.live/', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: html }));
  await page.goto('https://mashenstein.live/');
  out = await page.evaluate((a) => window.run(a), { song: { bank: g.bank, mix: g.mix, arrangement: g.arrangement }, seconds: SECONDS, lookahead: LOOKAHEAD,
    modes: BANGER || BURN_SHARE ? ['song'] : ['clean', 'dsp', 'dspDip', 'main', 'both'], burnShare: BURN_SHARE, deep: !!args.includes('--deep') });
} finally {
  await browser.close();
}

// Classified exactly as the glitch log classifies a second.
const classify = (r) => {
  const crackle = r.clock > 0 && r.clock < GLITCH.clock;
  const dip = !crackle && Number.isFinite(r.clockMin) && r.clockMin > 0 && r.clockMin < GLITCH.clockQuarter;
  const holes = r.late > 0 || (Number.isFinite(r.margin) && r.margin < 0);
  return { crackle, dip, holes };
};
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const summary = {};
for (const m of BANGER || BURN_SHARE ? ['song'] : ['clean', 'dsp', 'dspDip', 'main', 'both']) {
  const rows = out.rows.filter((r) => r.mode === m).slice(2);   // the first two seconds are the switch
  const c = rows.map(classify);
  const pct = (k) => Math.round(100 * c.filter((x) => x[k]).length / Math.max(1, c.length));
  summary[m] = { seconds: rows.length, crackle: pct('crackle'), dip: pct('dip'), holes: pct('holes'),
    clock: +median(rows.map((r) => r.clock)).toFixed(3), clockMin: +median(rows.map((r) => r.clockMin).filter(Number.isFinite)).toFixed(3),
    qLowest: +Math.min(...rows.map((r) => r.clockMin).filter(Number.isFinite)).toFixed(3),
    margin: median(rows.map((r) => r.margin).filter(Number.isFinite)), late: rows.reduce((s, r) => s + r.late, 0) };
}
console.log(`glitch probe: ${SONG}, lookahead ${out.lookahead} s, ${out.stampSource}, ${out.sampleRate} Hz`);
for (const [m, s] of Object.entries(summary)) {
  console.log(`  ${m.padEnd(7)} CRACKLE ${String(s.crackle).padStart(3)}%  DIP ${String(s.dip).padStart(3)}%  HOLES ${String(s.holes).padStart(3)}%`
    + `   C ${s.clock}  Q ${s.clockMin} (lowest ${s.qLowest})  M ${s.margin} ms  late ${s.late}`);
}
// The Spot FX sections' starts, in steps, against the seconds that dipped.
if (BANGER || BURN_SHARE) {
  const starts = [];
  for (const [lane, v] of Object.entries(g.arrangement?.automation || g.bank?.automation || {})) {
    for (const f of v?.fx || []) if (Array.isArray(f.from)) starts.push({ lane, step: f.from[0] * 16 + (f.from[1] || 0), chain: (f.chain || []).map((c) => c.id).join('+') });
  }
  const rows = out.rows.filter((r) => r.mode === 'song').slice(2);
  // A row covers the second BEFORE it; the scheduler's step runs a lookahead ahead of the sound.
  const near = (r) => starts.filter((x) => x.step <= r.step && x.step > r.step - 10);
  const bad = (r) => { const c = classify(r); return c.crackle || c.dip; };
  const at = rows.filter((r) => near(r).length), away = rows.filter((r) => !near(r).length);
  const share = (rs) => rs.length ? Math.round(100 * rs.filter(bad).length / rs.length) : 0;
  const q = (rs) => +median(rs.map((r) => r.clockMin).filter(Number.isFinite)).toFixed(3);
  console.log(`  Spot FX sections: ${starts.length}; seconds at a section's start ${at.length} — ${share(at)} % bad, Q median ${q(at)}; elsewhere ${away.length} — ${share(away)} % bad, Q median ${q(away)}`);
  for (const r of rows.filter(bad).slice(0, 12)) console.log(`    bar ${Math.floor(r.step / 16)}: C ${r.clock.toFixed(2)} Q ${r.clockMin?.toFixed(2)}${near(r).length ? `  ← ${near(r).map((x) => `${x.lane} ${x.chain}`).join(', ')}` : ''}`);
}
const git = (...a) => { try { return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return null; } };
const dir = join(ROOT, 'work', 'audit', new Date().toISOString().slice(0, 10));
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, `glitch-probe-${SONG}${LOOKAHEAD ? `-la${LOOKAHEAD}` : ''}.json`), JSON.stringify({
  song: SONG, seconds: SECONDS, summary, ...out,
  meta: { at: new Date().toISOString(), revision: git('rev-parse', 'HEAD'), dirty: (git('status', '--porcelain', '--', 'src', 'tools') || '').split('\n').filter(Boolean), command: `node tools/audio-glitch-probe.js ${args.join(' ')}` },
}));
