// THE AUDIO CANARY, PLAYED (src/data/audio-canary.js; 22 Oct 2026).
//
// The canary is a song built to walk the engine's sleep, trim and warm-up paths: every tested
// lane plays on its first step, falls silent for twelve seconds (strips and insert chains asleep,
// the chord pool trimmed), and comes back — then again under a Spot FX section. This plays it
// live in headless WebKit with the game's own settings (deep sleep, pool trim, song-change fade),
// silently, one lane at a time, from a cold start and again after another song, and checks that
// the lane is heard at the top of sections 1, 5 and 6 — and that the chord comes back as full as
// it started.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = false;
const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); failed = true; } else console.log('ok:', msg); };

const ENTRY = `
import { Audio } from ${JSON.stringify(join(ROOT, 'src/engine/audio.js'))};
import * as MIXER from ${JSON.stringify(join(ROOT, 'src/engine/mixer.js'))};
import * as VE from ${JSON.stringify(join(ROOT, 'src/engine/voices.js'))};
import * as CANARY from ${JSON.stringify(join(ROOT, 'src/data/audio-canary.js'))};
import * as NEON from ${JSON.stringify(join(ROOT, 'src/data/songs/neon.js'))};
window.run = async (lane) => {
  const conn = AudioNode.prototype.connect; let tap = null; const peaks = [];
  AudioNode.prototype.connect = function (d, ...r) {
    if (d instanceof AudioDestinationNode && !(d.context instanceof OfflineAudioContext)) {
      if (!tap) { const ctx = d.context; tap = ctx.createGain(); const an = ctx.createAnalyser(); an.fftSize = 1024; const z = ctx.createGain(); z.gain.value = 0;
        conn.call(tap, an); conn.call(an, z); conn.call(z, d); const buf = new Float32Array(1024);
        setInterval(() => { an.getFloatTimeDomainData(buf); let p = 0; for (const v of buf) p = Math.max(p, Math.abs(v)); peaks.push([ctx.currentTime, p]); }, 20); }
      return conn.call(this, tap, ...r);
    }
    return conn.call(this, d, ...r);
  };
  MIXER.setParkMutedEffects(true); MIXER.setDeepSleep(true); VE.setTrimIdleSlots(true);
  Audio.setMrdrQuality('phone'); Audio.setMixerMeteringEnabled(false); Audio.setCaptureEnabled(false); Audio.setSilentLaneSkip(true);
  Audio.fadeSongChanges = true;
  Audio.ensure(); await Audio.ctx.resume(); if (Audio.mixer) await Audio.mixer.ready;
  const lanes = ['kick', 'lead', 'bass', 'chords', 'twinkle', 'bass2', 'lead2'];
  const solo = { ...CANARY.mix, lanes: Object.fromEntries(lanes.map((k) => [k, { ...(CANARY.mix.lanes[k] || {}), mute: k !== lane }])) };
  const out = {};
  for (const mode of ['cold', 'after another song']) {
    if (mode !== 'cold') { Audio.setBank(NEON.bank, NEON.mix, NEON.arrangement); await new Promise((r) => setTimeout(r, 6000)); }
    peaks.length = 0;
    const t0 = Audio.ctx.currentTime;
    Audio.setBank(CANARY.bank, solo, CANARY.arrangement, { startAtBeginning: true });
    Audio.prepareRealtimeVoices?.({ startStep: 0, windowSteps: 256 }); Audio.warmWorkletLanes?.()?.catch?.(() => {});
    await new Promise((r) => setTimeout(r, 25500));
    out[mode] = { t0, peaks: peaks.map(([t, p]) => [t - t0, p]) };
    Audio.setBank(null); await new Promise((r) => setTimeout(r, 1500));
  }
  return out;
};`;

const esbuild = require('esbuild');
const built = await esbuild.build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' }, bundle: true, format: 'iife', write: false, logLevel: 'silent' });
const html = `<!doctype html><meta charset="utf-8"><script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}</script>`;
const { webkit } = require('playwright');
const browser = await webkit.launch();
// Section k starts 4k seconds after the song's own start, which is setBank's half-second gap in.
const START = 0.5, SECTION = 4;
try {
  for (const lane of ['lead', 'bass', 'chords', 'twinkle']) {
    const page = await browser.newPage();
    await page.route('https://mashenstein.live/', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: html }));
    await page.goto('https://mashenstein.live/');
    const out = await page.evaluate((l) => window.run(l), lane);
    await page.close();
    for (const [mode, { peaks }] of Object.entries(out)) {
      const at = (k) => Math.max(0, ...peaks.filter(([t]) => t >= START + k * SECTION - 0.05 && t < START + k * SECTION + 0.7).map(([, p]) => p));
      const [s1, s5, s6] = [at(0), at(4), at(5)];
      assert(s1 > 0.005 && s5 > 0.005 && s6 > 0.005,
        `${lane}, ${mode}: heard at the top of sections 1, 5 and 6 (${s1.toFixed(3)}, ${s5.toFixed(3)}, ${s6.toFixed(3)})`);
      if (lane === 'chords') assert(s5 > 0.7 * s1, `chords, ${mode}: the chord comes back as full as it started (${s5.toFixed(3)} against ${s1.toFixed(3)})`);
    }
  }
} finally {
  await browser.close();
}
console.log(failed ? 'AUDIO CANARY: FAILED' : 'AUDIO CANARY: PASSED');
if (failed) process.exitCode = 1;
