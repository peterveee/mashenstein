// THE HUSH (Audio.hushMusic; docs/AUDIO_SYNTH_AUDIT_PLAN.md §9, 22 Oct 2026).
//
// The guard's STOP: a second of no music that keeps the song's clock, so a tipped iPad audio
// thread gets the near-zero load the LATCH TEST says it needs, and the song comes back where
// its own clock is. Live in headless WebKit, silently (a meter, then a gain of 0):
//
//   1. Nothing new starts once what was already booked has played out.
//   2. The output is silent through the hush, the music path is off the master and every strip
//      is asleep — so the browser renders none of it. The strips are the half that matters on
//      the iPad: each one's sleep probe pulls it whatever it feeds, and a hush that only took the
//      mix off the master left the clock at 0.38 (22 Oct 2026).
//   3. It comes back on a bar line, at least the hush's length later, and plays again.
//   4. The transport never stopped: the step the song is on afterwards is the step the elapsed
//      time says, so anything locked to the song's clock is still locked to it.
//   5. A second hush works the same, and a song change in the middle of one ends it cleanly.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = false;
const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); failed = true; } else console.log('ok:', msg); };

const ENTRY = `
import { Audio } from ${JSON.stringify(join(ROOT, 'src/engine/audio.js'))};
import { setDeepSleep } from ${JSON.stringify(join(ROOT, 'src/engine/mixer.js'))};
import * as GRAVITY from ${JSON.stringify(join(ROOT, 'src/data/songs/gravity.js'))};
window.run = async () => {
  const conn = AudioNode.prototype.connect;
  let tap = null; const peaks = [];
  AudioNode.prototype.connect = function (d, ...r) {
    if (d instanceof AudioDestinationNode) {
      if (!tap) {
        const ctx = d.context; tap = ctx.createGain(); const an = ctx.createAnalyser(); an.fftSize = 1024; const z = ctx.createGain(); z.gain.value = 0;
        conn.call(tap, an); conn.call(an, z); conn.call(z, d);
        const buf = new Float32Array(1024);
        setInterval(() => { an.getFloatTimeDomainData(buf); let p = 0; for (const v of buf) p = Math.max(p, Math.abs(v)); peaks.push([ctx.currentTime, p]); }, 25);
      }
      return conn.call(this, tap, ...r);
    }
    return conn.call(this, d, ...r);
  };
  const starts = [];
  const st = AudioScheduledSourceNode.prototype.start;
  // Notes, not modulators: a Spot FX branch is built when its section is selected (23 Oct 2026),
  // and its chorus and phaser LFOs start then — under a hush too, since the transport runs on.
  AudioScheduledSourceNode.prototype.start = function (when = 0, ...r) {
    const lfo = (this instanceof OscillatorNode && this.frequency.value < 20) || (typeof ConstantSourceNode !== 'undefined' && this instanceof ConstantSourceNode);
    if (!lfo) starts.push(when || Audio.ctx?.currentTime || 0);
    return st.call(this, when, ...r);
  };
  setDeepSleep(true);
  Audio.setMrdrQuality('phone'); Audio.setMixerMeteringEnabled(false); Audio.setCaptureEnabled(false);
  Audio.ensure(); await Audio.ctx.resume(); if (Audio.mixer) await Audio.mixer.ready;
  const ctx = Audio.ctx;
  Audio.setBank(GRAVITY.bank, GRAVITY.mix, GRAVITY.arrangement);
  await new Promise((r) => setTimeout(r, 6000));
  const hushes = [];
  for (let i = 0; i < 2; i++) {
    const at = ctx.currentTime, stepAt = Audio.step, spb = (60 / (Audio.bpm * Audio.tempo)) / 4;
    const until = Audio.hushMusic(1);
    const mid = until - 0.4;
    await new Promise((r) => setTimeout(r, (mid - ctx.currentTime) * 1000));
    const midHush = { unplugged: !!Audio._hush?.unplugged, awake: ['kick', 'bass', 'lead', 'chords'].filter((k) => Audio.mixer.lane(k) && !Audio.mixer.lane(k)._asleep) };
    await new Promise((r) => setTimeout(r, (until - ctx.currentTime) * 1000 + 2500));
    hushes.push({ at, until, stepAt, stepAfter: Audio.step, spb, timeAfter: ctx.currentTime, midHush, lookahead: Audio.sequencerLookahead });
    await new Promise((r) => setTimeout(r, 2000));
  }
  // A song change in the middle of one.
  const until3 = Audio.hushMusic(1);
  await new Promise((r) => setTimeout(r, 900));
  Audio.setBank(GRAVITY.bank, GRAVITY.mix, GRAVITY.arrangement);
  await new Promise((r) => setTimeout(r, 4000));
  const afterChange = { hush: !!Audio._hush, peak: Math.max(0, ...peaks.filter(([t]) => t > ctx.currentTime - 2).map(([, p]) => p)) };
  return { hushes, starts, peaks, afterChange, until3 };
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
  assert(errors.length === 0, `no page errors${errors.length ? `: ${errors[0]}` : ''}`);
  out.hushes.forEach((h, i) => {
    const n = i + 1;
    const lead = h.lookahead + 0.2;
    const quietFrom = h.at + lead + 0.1, quietTo = h.until - 0.15;
    const booked = out.starts.filter((t) => t > quietFrom && t < quietTo).length;
    assert(booked === 0, `hush ${n}: nothing starts once what was booked has played (${booked} sources between ${quietFrom.toFixed(2)} and ${quietTo.toFixed(2)})`);
    const loud = Math.max(0, ...out.peaks.filter(([t]) => t > quietFrom && t < quietTo).map(([, p]) => p));
    assert(loud < 1e-4, `hush ${n}: silent through it (peak ${loud.toExponential(1)})`);
    assert(h.midHush.unplugged, `hush ${n}: the music path is off the master in the middle of it`);
    assert(h.midHush.awake.length === 0, `hush ${n}: every strip asleep in the middle of it${h.midHush.awake.length ? ` (awake: ${h.midHush.awake.join(', ')})` : ''}`);
    const bar = h.spb * 16;
    const fromStart = (h.until - h.at);
    assert(fromStart >= 1 + lead - 0.01, `hush ${n}: back no sooner than its second, after what was booked (${fromStart.toFixed(2)} s)`);
    const back = Math.max(0, ...out.peaks.filter(([t]) => t > h.until + 0.1 && t < h.until + 2).map(([, p]) => p));
    assert(back > 0.01, `hush ${n}: the music is back after it (peak ${back.toFixed(3)})`);
    const expected = h.stepAt + Math.round((h.timeAfter - h.at) / h.spb);
    assert(Math.abs(h.stepAfter - expected) <= 4, `hush ${n}: the transport ran on through it (step ${h.stepAfter}, the clock says ~${expected})`);
    void bar;
  });
  assert(!out.afterChange.hush && out.afterChange.peak > 0.01, `a song change mid-hush ends it, and the new song plays (peak ${out.afterChange.peak.toFixed(3)})`);
} finally {
  await browser.close();
}
console.log(failed ? 'MUSIC HUSH: FAILED' : 'MUSIC HUSH: PASSED');
if (failed) process.exitCode = 1;
