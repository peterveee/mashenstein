// AN IDLE STRIP SLEEPS, AND WAKES FOR ITS NEXT NOTE (engine/mixer.js, deepSleep; 22 Oct 2026).
//
// On WebKit the game unplugs a channel strip that has been silent for a couple of seconds, and
// an effect chain that has gone quiet, so the browser renders none of it — half a song's
// standing cost was its bare strips. The danger is a note arriving at a strip still asleep:
// silence where the music should be. So, live in headless WebKit (the iPad's engine), silently
// (a gain-0 sink after a meter):
//
//   1. A lane that never plays is asleep within a few seconds.
//   2. A lane that plays one short note every four seconds goes to sleep between its notes …
//   3. … and every one of those notes is heard at full level — the wake comes first.
//   4. With deep sleep off (the desk, Chromium) nothing sleeps.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let failed = false;
const assert = (cond, msg) => {
  if (!cond) { console.error('FAIL:', msg); failed = true; } else console.log('ok:', msg);
};

const ENTRY = `
import { Audio } from ${JSON.stringify(join(ROOT, 'src/engine/audio.js'))};
import { setDeepSleep } from ${JSON.stringify(join(ROOT, 'src/engine/mixer.js'))};
window.run = async (deep) => {
  // Silent: the speakers are reached through a meter and a gain of 0.
  const conn = AudioNode.prototype.connect;
  let tap = null;
  const peaks = [];
  AudioNode.prototype.connect = function (dest, ...rest) {
    if (dest instanceof AudioDestinationNode) {
      if (!tap) {
        const ctx = dest.context;
        tap = ctx.createGain();
        const an = ctx.createAnalyser(); an.fftSize = 2048;
        const mute = ctx.createGain(); mute.gain.value = 0;
        conn.call(tap, an); conn.call(an, mute); conn.call(mute, dest);
        const buf = new Float32Array(2048);
        setInterval(() => { an.getFloatTimeDomainData(buf); let p = 0; for (const v of buf) p = Math.max(p, Math.abs(v)); peaks.push([ctx.currentTime, p]); }, 40);
      }
      return conn.call(this, tap, ...rest);
    }
    return conn.call(this, dest, ...rest);
  };
  setDeepSleep(deep);
  Audio.setMrdrQuality('phone');
  Audio.setMixerMeteringEnabled(false);
  Audio.setCaptureEnabled(false);
  Audio.ensure(); await Audio.ctx.resume();
  if (Audio.mixer) await Audio.mixer.ready;
  const lead = new Array(32).fill(null); lead[0] = 261.63;
  const leadLen = new Array(32).fill(null); leadLen[0] = 2;
  const bank = { bpm: 120, lead, leadLen, bass: new Array(32).fill(null) };
  Audio.setBank(bank, { voice: { leadVoice: 'bestClassicMono', bassVoice: 'bestClassicMono' } });
  const t0 = Audio.ctx.currentTime;
  const states = [];
  const iv = setInterval(() => states.push([Audio.ctx.currentTime - t0, !!Audio.mixer.lane('lead')._asleep, !!Audio.mixer.lane('bass')._asleep]), 100);
  await new Promise((r) => setTimeout(r, 13500));
  clearInterval(iv);
  return { t0, states, peaks: peaks.map(([t, p]) => [t - t0, p]) };
};`;

const esbuild = require('esbuild');
const built = await esbuild.build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' }, bundle: true, format: 'iife', write: false, logLevel: 'silent' });
const html = `<!doctype html><meta charset="utf-8"><script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}</script>`;
const { webkit } = require('playwright');
const browser = await webkit.launch();
try {
  const out = {};
  for (const deep of [true, false]) {
    const page = await browser.newPage();
    await page.route('https://mashenstein.live/', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: html }));
    await page.goto('https://mashenstein.live/');
    out[deep] = await page.evaluate((d) => window.run(d), deep);
    await page.close();
  }
  const on = out.true;
  const bassAsleep = on.states.filter(([t]) => t > 4).every(([, , b]) => b);
  assert(bassAsleep, 'a lane that never plays is asleep from four seconds on');
  const leadSlept = on.states.some(([t, l]) => t > 1 && l);
  assert(leadSlept, 'a lane with one note every four seconds sleeps between its notes');
  // Each loop's note: the loudest moment in each four-second window after the first note.
  const firstNote = on.peaks.find(([, p]) => p > 0.01)?.[0];
  assert(firstNote != null, 'the first note is heard');
  const windows = [0, 1, 2].map((k) => Math.max(0, ...on.peaks.filter(([t]) => t >= firstNote - 0.2 + k * 4 && t < firstNote - 0.2 + (k + 1) * 4).map(([, p]) => p)));
  const off = out.false;
  const offFirst = off.peaks.find(([, p]) => p > 0.01)?.[0];
  const offWindows = [0, 1, 2].map((k) => Math.max(0, ...off.peaks.filter(([t]) => t >= offFirst - 0.2 + k * 4 && t < offFirst - 0.2 + (k + 1) * 4).map(([, p]) => p)));
  for (let k = 0; k < 3; k++) {
    assert(windows[k] > 0.7 * offWindows[k],
      `note ${k + 1} after a sleep is heard at full level (${windows[k].toFixed(3)} against ${offWindows[k].toFixed(3)} awake throughout)`);
  }
  assert(off.states.every(([, l, b]) => !l && !b), 'with deep sleep off nothing sleeps');
} finally {
  await browser.close();
}
console.log(failed ? 'STRIP SLEEP: FAILED' : 'STRIP SLEEP: PASSED');
if (failed) process.exitCode = 1;
