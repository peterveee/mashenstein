// THE CHANNEL CARD (effects.js 'strip'; mixer.js applyStripFx; 23 Oct 2026). A Spot FX card
// that is not a node: for its section the lane's own EQ moves and its delay and reverb SENDS
// rise, then go back. Live in headless WebKit, silently: one lane, a note every bar —
//   bar 1  plain
//   bar 2  the card at bass, mid and treble −18 dB: the note comes out far quieter
//   bar 3  plain again: back to bar 1's level
//   bar 4  the card at reverb send 1 and level −24 dB: the note far quieter, and a tail after it
//          where bar 1 had none (the send is taken before the fader)
// — and the desk's own numbers for the lane never move (the card is an offset).
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = false;
const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); failed = true; } else console.log('ok:', msg); };

const ENTRY = `
import { Audio } from ${JSON.stringify(join(ROOT, 'src/engine/audio.js'))};
window.run = async () => {
  const conn = AudioNode.prototype.connect; let tap = null; const peaks = [];
  AudioNode.prototype.connect = function (d, ...r) {
    if (d instanceof AudioDestinationNode && !(d.context instanceof OfflineAudioContext)) {
      if (!tap) { const ctx = d.context; tap = ctx.createGain(); const an = ctx.createAnalyser(); an.fftSize = 2048; const z = ctx.createGain(); z.gain.value = 0;
        conn.call(tap, an); conn.call(an, z); conn.call(z, d); const buf = new Float32Array(2048);
        setInterval(() => { an.getFloatTimeDomainData(buf); let p = 0; for (const v of buf) p = Math.max(p, Math.abs(v)); peaks.push([ctx.currentTime, p]); }, 20); }
      return conn.call(this, tap, ...r);
    }
    return conn.call(this, d, ...r);
  };
  Audio.setMrdrQuality('phone'); Audio.setMixerMeteringEnabled(false); Audio.setCaptureEnabled(false);
  Audio.ensure(); await Audio.ctx.resume(); if (Audio.mixer) await Audio.mixer.ready;
  // A bank is two bars; four come from two sections in order (as the canary does). The note is
  // A2, under the low shelf, where the card's −18 dB is −18 dB.
  const two = () => { const lead = new Array(32).fill(null), leadLen = new Array(32).fill(null); for (const s of [0, 16]) { lead[s] = 110; leadLen[s] = 2; } return { lead, leadLen }; };
  const bank = { bpm: 120, ...two(), sections: [two(), two()], order: [0, 1] };
  const mix = { voice: { leadVoice: 'bestClassicMono' }, lanes: { lead: { gain: 0 } }, aux: { reverb: { decay: 2.5 } } };
  const arrangement = { automation: { lead: { fx: [
    { from: [2, 0], to: [3, 0], chain: [{ id: 'strip', params: { low: -18, mid: -18, high: -18 } }] },
    { from: [4, 0], to: [5, 0], chain: [{ id: 'strip', params: { reverb: 1, level: -24 } }] },
  ] } } };
  const t0 = Audio.ctx.currentTime;
  Audio.setBank(bank, mix, arrangement, { startAtBeginning: true });
  const trace = []; const calls = []; { const st = Audio.mixer.lane('lead'); const orig = st.scheduleBarEffects; st.scheduleBarEffects = (list, when, opts) => { const sig = JSON.stringify(list); if (calls.at(-1)?.[1] !== sig) calls.push([+(when - t0).toFixed(2), sig, JSON.stringify(opts)]); return orig(list, when, opts); }; } window.__calls = calls;
  const iv = setInterval(() => { const st = Audio.mixer.lane('lead'); trace.push([+(Audio.ctx.currentTime - t0).toFixed(1), JSON.stringify(st._stripFx), JSON.stringify(st._eqNow), (st._barFxSlots || []).length, +(st._sends.get('reverb')?.gain.value ?? -1).toFixed(2)]); }, 500);
  await new Promise((r) => setTimeout(r, 9000));
  clearInterval(iv); window.__trace = trace;
  const strip = Audio.mixer.lane('lead');
  return { t0, trace, calls, peaks: peaks.map(([t, p]) => [t - t0, p]), eq: { ...strip.state.eq }, send: { ...strip.state.send } };
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
  if (process.env.TRACE) { for (const r of out.calls) console.log('call', r.join('  ')); for (const r of out.trace) console.log(r.join('  ')); for (let t = 0; t < 9; t += 0.25) console.log(t.toFixed(2), Math.max(0, ...out.peaks.filter(([x]) => x >= t && x < t + 0.25).map(([, p]) => p)).toFixed(3)); }
  // The song starts half a second in (setBank's gap); a bar is 2 s. The note's first 0.4 s,
  // and the gap from 1.0 to 1.9 s after the bar line, where only a tail could be.
  const START = 0.5, BAR = 2;
  const hit = (b) => Math.max(0, ...out.peaks.filter(([t]) => t >= START + b * BAR - 0.05 && t < START + b * BAR + 0.4).map(([, p]) => p));
  const gap = (b) => Math.max(0, ...out.peaks.filter(([t]) => t >= START + b * BAR + 1.0 && t < START + b * BAR + 1.9).map(([, p]) => p));
  const [h0, h1, h2, h3] = [0, 1, 2, 3].map(hit);
  assert(h0 > 0.01, `bar 1: the note is heard (${h0.toFixed(3)})`);
  // −18 dB on each band is not −18 dB on a note with harmonics across all three; half is plenty to show the EQ moved.
  assert(h1 < 0.5 * h0, `bar 2: with the card at −18 dB on every band the note is far quieter (${h1.toFixed(3)} against ${h0.toFixed(3)})`);
  assert(h2 > 0.7 * h0, `bar 3: plain again, back to bar 1's level (${h2.toFixed(3)} against ${h0.toFixed(3)})`);
  assert(h3 > 0.002 && h3 < 0.2 * h0, `bar 4: the card's LEVEL at −24 dB takes the note down (${h3.toFixed(3)} against ${h0.toFixed(3)})`);
  assert(gap(3) > 2 * Math.max(gap(0), 1e-5), `bar 4: with the card's reverb send at 1 a tail follows the note (${gap(3).toExponential(2)} against ${gap(0).toExponential(2)} in bar 1)`);
  assert(out.eq.low === 0 && out.eq.mid === 0 && out.eq.high === 0 && !(out.send.reverb > 0), `the lane's own EQ and sends never moved (${JSON.stringify(out.eq)}, reverb send ${out.send.reverb ?? 0})`);
} finally {
  await browser.close();
}
console.log(failed ? 'CHANNEL CARD: FAILED' : 'CHANNEL CARD: PASSED');
if (failed) process.exitCode = 1;
