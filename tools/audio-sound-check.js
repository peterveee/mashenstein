// SOUND CHECKS FOR AN OPTIMISATION (docs/AUDIO_SYNTH_AUDIT_PLAN.md, Stage Q, 22 Oct 2026).
//
// A change made for cost can change the sound, and most of this audit's changes only exist
// live — chains and strips asleep, pool slots trimmed, sources drained — so an offline render
// cannot see them. This plays the same song LIVE, twice, in headless WebKit (the iPad's
// engine): once on a copy of the engine from before (--before=<src dir>) and once on this
// tree, records the master output with a worklet before the silent sink, and compares:
//
//   invalid     NaN / ±Infinity samples, and samples over full scale (after must have none
//               the before did not)
//   dropouts    50 ms windows where after is more than 6 dB under before while before is
//               above −50 dBFS — a note, a tail or an effect that went missing
//   bursts      the same the other way, more than 6 dB over — something that came back
//               louder or doubled
//   clicks      sample-to-sample steps larger than twice the biggest step before ever made
//   timing      the offset that best lines the two up, in each 2 s block: a drift between
//               blocks is notes moving in time
//
// Live runs are not sample-identical (each starts on its own clock, and the engine jitters
// note starts by design in places), so everything is compared on aligned 50 ms envelopes
// with tolerances, not as a null test. A clean report is evidence, not a listening approval.
//
//   node tools/audio-sound-check.js <song> --before=<dir of a src copy> [--seconds=40] [--deep]
//   (--deep: the game's WebKit deep sleep and pool trim on in the AFTER run, as the game has.
//    --mute=<lane>: mute a lane in the AFTER run — the check's own proof that it sees a part
//    go missing.)
// Writes work/audit/<date>/sound-check-<song>.json.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (k) => { const a = args.find((x) => x === `--${k}` || x.startsWith(`--${k}=`)); return a ? (a.includes('=') ? a.slice(a.indexOf('=') + 1) : true) : null; };
const SONG = args.find((a) => !a.startsWith('--'));
const BEFORE = flag('before') ? resolve(flag('before')) : null;
const SECONDS = Number(flag('seconds') || 40);
if (!SONG || !BEFORE) { console.error('usage: node tools/audio-sound-check.js <song> --before=<src dir> [--seconds=40]'); process.exit(1); }

const RECORDER = `
class Rec extends AudioWorkletProcessor {
  constructor() { super(); this.buf = []; this.n = 0; this.on = true; this.port.onmessage = (e) => { if (e.data === 'stop') this.on = false; }; }
  process(inputs) {
    const ch = inputs[0];
    if (this.on && ch && ch.length) {
      const l = ch[0], r = ch[1] || ch[0];
      const f = new Float32Array(l.length * 2);
      for (let i = 0; i < l.length; i++) { f[2 * i] = l[i]; f[2 * i + 1] = r[i]; }
      this.buf.push(f); this.n += l.length;
      if (this.buf.length >= 375) { this.port.postMessage(this.buf); this.buf = []; }
    }
    return true;
  }
}
registerProcessor('rec', Rec);`;

function entry(src) {
  return `
import { Audio } from ${JSON.stringify(join(src, 'engine/audio.js'))};
import * as MIXER from ${JSON.stringify(join(src, 'engine/mixer.js'))};
import * as VOICES_ENGINE from ${JSON.stringify(join(src, 'engine/voices.js'))};
window.run = async ({ song, seconds, deep }) => {
  // Everything bound for the speakers is recorded, then silenced.
  const conn = AudioNode.prototype.connect;
  let tap = null;
  AudioNode.prototype.connect = function (d, ...r) {
    if (d instanceof AudioDestinationNode) {
      if (!tap) { tap = d.context.createGain(); const z = d.context.createGain(); z.gain.value = 0; conn.call(tap, z); conn.call(z, d); }
      return conn.call(this, tap, ...r);
    }
    return conn.call(this, d, ...r);
  };
  Audio.setMrdrQuality('phone'); Audio.setMixerMeteringEnabled(false); Audio.setCaptureEnabled(false);
  Audio.setSilentLaneSkip(true); Audio.setLatencyHint(0.05);
  MIXER.setParkMutedEffects?.(true);
  if (deep) { MIXER.setDeepSleep?.(MIXER.deepSleepSuits?.()); VOICES_ENGINE.setTrimIdleSlots?.(true); }
  Audio.ensure(); await Audio.ctx.resume(); if (Audio.mixer) await Audio.mixer.ready;
  const ctx = Audio.ctx;
  await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([${JSON.stringify(RECORDER)}], { type: 'application/javascript' })));
  if (!tap) { tap = ctx.createGain(); const z = ctx.createGain(); z.gain.value = 0; conn.call(tap, z); conn.call(z, ctx.destination); }
  const rec = new AudioWorkletNode(ctx, 'rec', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit' });
  const chunks = [];
  rec.port.onmessage = (e) => { for (const f of e.data) chunks.push(f); };
  conn.call(tap, rec);
  const z2 = ctx.createGain(); z2.gain.value = 0; conn.call(rec, z2); conn.call(z2, ctx.destination);
  Audio.setBank(song.bank, song.mix, song.arrangement);
  await new Promise((r) => setTimeout(r, seconds * 1000 + 600));
  rec.port.postMessage('stop');
  await new Promise((r) => setTimeout(r, 400));
  // Interleaved stereo as base64 float32, so it crosses into node in one piece.
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const all = new Float32Array(total); let o = 0; for (const c of chunks) { all.set(c, o); o += c.length; }
  const bytes = new Uint8Array(all.buffer); let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return { sampleRate: ctx.sampleRate, data: btoa(bin) };
};`;
}

const esbuild = require('esbuild');
const { webkit } = require('playwright');
const file = [join(ROOT, 'src/data/songs', `${SONG}.js`), join(ROOT, 'src/data/imported', `${SONG}.js`)].find(existsSync);
const g = await import(file);
const song = { bank: g.bank, mix: g.mix, arrangement: g.arrangement };

async function record(src, deep, songIn = song) {
  const built = await esbuild.build({ stdin: { contents: entry(src), resolveDir: ROOT, loader: 'js' }, bundle: true, format: 'iife', write: false, logLevel: 'silent' });
  const html = `<!doctype html><meta charset="utf-8"><script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}</script>`;
  const browser = await webkit.launch();
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route('https://mashenstein.live/', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: html }));
    await page.goto('https://mashenstein.live/');
    const out = await page.evaluate((a) => window.run(a), { song: songIn, seconds: SECONDS, deep });
    const buf = Buffer.from(out.data, 'base64');
    return { sr: out.sampleRate, x: new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4), errors };
  } finally {
    await browser.close();
  }
}

const A = await record(BEFORE, false);
const muted = flag('mute') ? { ...song, mix: { ...song.mix, lanes: { ...(song.mix?.lanes || {}), [flag('mute')]: { ...(song.mix?.lanes?.[flag('mute')] || {}), mute: true } } } } : song;
// --after=<dir>: compare against another copy instead of this tree (a copy against itself is
// the control: what two live runs of the same engine differ by).
const B = await record(flag('after') ? resolve(flag('after')) : join(ROOT, 'src'), !!flag('deep'), muted);
const sr = A.sr;
const frames = (x) => x.length / 2;

// ---- the checks ------------------------------------------------------------------------
function invalid(x) {
  let bad = 0, over = 0, peak = 0;
  for (let i = 0; i < x.length; i++) { const v = x[i]; if (!Number.isFinite(v)) { bad++; continue; } const a = Math.abs(v); if (a > 1) over++; if (a > peak) peak = a; }
  return { nonFinite: bad, overFullScale: over, peak };
}
const WIN = Math.round(sr * 0.05);
function envelope(x) {
  const n = Math.floor(frames(x) / WIN), env = new Float64Array(n);
  for (let w = 0; w < n; w++) { let s = 0; for (let i = w * WIN; i < (w + 1) * WIN; i++) { const l = x[2 * i], r = x[2 * i + 1]; s += (l * l + r * r) / 2; } env[w] = Math.sqrt(s / WIN); }
  return env;
}
const db = (v) => 20 * Math.log10(Math.max(v, 1e-9));
// The window offset (in 50 ms steps) that best lines B up with A over a stretch.
function align(ea, eb, from, len, max = 10) {
  let best = 0, bestScore = -Infinity;
  for (let k = -max; k <= max; k++) {
    let s = 0;
    for (let w = from; w < from + len; w++) { const j = w + k; if (j < 0 || j >= eb.length || w >= ea.length) continue; s += db(ea[w]) * 0 + Math.min(ea[w], eb[j]); }
    if (s > bestScore) { bestScore = s; best = k; }
  }
  return best;
}
function maxStep(x) { let m = 0; for (let i = 2; i < x.length; i++) { const d = Math.abs(x[i] - x[i - 2]); if (Number.isFinite(d) && d > m) m = d; } return m; }

const ia = invalid(A.x), ib = invalid(B.x);
const ea = envelope(A.x), eb = envelope(B.x);
// Line the runs up by the offset (up to ±2 s) whose envelopes agree best over the whole run —
// not by the first loud window, which a stray transient moves by a beat and which then reads
// every beat after it as a dropout — then measure drift per 2 s block.
const firstLoud = (e) => e.findIndex((v) => db(v) > -40);
const corr = (k) => {
  let s = 0, n = 0;
  for (let w = 0; w < ea.length; w++) { const j = w + k; if (j < 0 || j >= eb.length) continue; s += -Math.abs(Math.max(-80, db(ea[w])) - Math.max(-80, db(eb[j]))); n++; }
  return n ? s / n : -Infinity;
};
let shift = 0, bestCorr = -Infinity;
for (let k = -40; k <= 40; k++) { const c = corr(k); if (c > bestCorr) { bestCorr = c; shift = k; } }
const BLOCK = 40;   // 2 s in 50 ms windows
const blocks = [];
for (let w = Math.max(0, firstLoud(ea)); w + BLOCK < ea.length && w + shift + BLOCK < eb.length; w += BLOCK) blocks.push(shift + align(ea, eb.map((v, i) => v), w, BLOCK, 4));
const drift = blocks.length ? Math.max(...blocks) - Math.min(...blocks) : 0;
const dropouts = [], bursts = [];
for (let w = Math.max(0, firstLoud(ea)); w < ea.length; w++) {
  const j = w + shift;
  if (j < 0 || j >= eb.length) continue;
  const a = db(ea[w]), b = db(eb[j]);
  if (a > -50 && b < a - 6) dropouts.push([+(w * 0.05).toFixed(2), +a.toFixed(1), +b.toFixed(1)]);
  if (b > -50 && b > a + 6) bursts.push([+(w * 0.05).toFixed(2), +a.toFixed(1), +b.toFixed(1)]);
}
const stepA = maxStep(A.x);
let clicks = 0;
for (let i = 2; i < B.x.length; i++) if (Math.abs(B.x[i] - B.x[i - 2]) > 2 * stepA) clicks++;
const compared = Math.min(ea.length, eb.length - Math.max(0, shift)) - Math.max(0, firstLoud(ea));
const result = {
  song: SONG, seconds: SECONDS, before: BEFORE, deep: !!flag('deep'),
  errors: { before: A.errors.slice(0, 3), after: B.errors.slice(0, 3) },
  invalid: { before: ia, after: ib },
  windowsCompared: compared,
  dropouts: { count: dropouts.length, share: +(dropouts.length / Math.max(1, compared)).toFixed(4), first: dropouts.slice(0, 10) },
  bursts: { count: bursts.length, share: +(bursts.length / Math.max(1, compared)).toFixed(4), first: bursts.slice(0, 10) },
  clicks: { after: clicks, threshold: +(2 * stepA).toFixed(4) },
  timing: { startShiftMs: shift * 50, blockOffsetsMs: blocks.map((k) => k * 50), driftMs: drift * 50 },
};
const ok = ib.nonFinite === 0 && ib.overFullScale <= ia.overFullScale && result.dropouts.share < 0.01
  && result.bursts.share < 0.01 && clicks === 0 && result.timing.driftMs <= 50 && !B.errors.length;
result.verdict = ok ? 'ok' : 'LOOK';
console.log(`sound check ${SONG}${result.deep ? ' (deep sleep + trim)' : ''}: ${result.verdict}`
  + ` — invalid ${ib.nonFinite}/${ib.overFullScale} (before ${ia.nonFinite}/${ia.overFullScale}), peak ${ib.peak.toFixed(2)} vs ${ia.peak.toFixed(2)};`
  + ` dropouts ${dropouts.length}/${compared} windows, bursts ${bursts.length}; clicks ${clicks}; drift ${result.timing.driftMs} ms`
  + (B.errors.length ? `; ERRORS ${B.errors[0]}` : ''));
if (dropouts.length) console.log(`  first dropouts (s, before dB, after dB): ${JSON.stringify(dropouts.slice(0, 6))}`);
if (bursts.length) console.log(`  first bursts: ${JSON.stringify(bursts.slice(0, 6))}`);
const dir = join(ROOT, 'work', 'audit', new Date().toISOString().slice(0, 10));
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, `sound-check-${SONG}${result.deep ? '-deep' : ''}.json`), JSON.stringify(result));
