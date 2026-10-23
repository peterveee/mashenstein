// A SONG'S FIRST NOTE ON A LANE WHOSE EFFECTS HAD GONE TO SLEEP (engine/mixer.js, deep sleep;
// 22 Oct 2026).
//
// Peter, on the iPad: play Neon, then Crypt, then Neon in the jukebox and each loses its
// opening — Crypt's theremin, Neon's arpeggio. A lane's insert chain that slept through the
// last song is unplugged at both ends; the next song's mix rebuilds the chain and marked it
// awake, but only `wake` put the sleeper's input back, so the new chain played into nothing
// until its next sleep and wake. Live in headless WebKit with the game's deep sleep, silently:
// a lane with an insert plays one note, sleeps, then a new song with a different insert on
// that lane starts — and its first note must be heard.
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
window.run = async () => {
  const conn = AudioNode.prototype.connect; let tap = null; const peaks = [];
  AudioNode.prototype.connect = function (d, ...r) {
    if (d instanceof AudioDestinationNode) {
      if (!tap) { const ctx = d.context; tap = ctx.createGain(); const an = ctx.createAnalyser(); an.fftSize = 1024; const z = ctx.createGain(); z.gain.value = 0;
        conn.call(tap, an); conn.call(an, z); conn.call(z, d); const buf = new Float32Array(1024);
        setInterval(() => { an.getFloatTimeDomainData(buf); let p = 0; for (const v of buf) p = Math.max(p, Math.abs(v)); peaks.push([ctx.currentTime, p]); }, 20); }
      return conn.call(this, tap, ...r);
    }
    return conn.call(this, d, ...r);
  };
  setDeepSleep(true);
  Audio.setMrdrQuality('phone'); Audio.setMixerMeteringEnabled(false); Audio.setCaptureEnabled(false);
  Audio.fadeSongChanges = true;
  Audio.ensure(); await Audio.ctx.resume(); if (Audio.mixer) await Audio.mixer.ready;
  const one = () => { const lead = new Array(64).fill(null), leadLen = new Array(64).fill(null); lead[0] = 440; leadLen[0] = 4; return { bpm: 120, lead, leadLen }; };
  // Song A: one note, then eight silent seconds — its insert chain goes to sleep.
  Audio.setBank(one(), { voice: { leadVoice: 'bestClassicMono' }, lanes: { lead: { effects: [{ id: 'compressor' }] } } });
  await new Promise((r) => setTimeout(r, 8000));
  // Song B: a different insert on the same lane, and a note on its first step.
  const t0 = Audio.ctx.currentTime;
  Audio.setBank(one(), { voice: { leadVoice: 'bestClassicMono' }, lanes: { lead: { effects: [{ id: 'vibrato', params: { depth: 0.1 } }] } } }, undefined, { startAtBeginning: true });
  await new Promise((r) => setTimeout(r, 2000));
  return { first: Math.max(0, ...peaks.filter(([t]) => t > t0 && t < t0 + 1.5).map(([, p]) => p)) };
};`;

const esbuild = require('esbuild');
const built = await esbuild.build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' }, bundle: true, format: 'iife', write: false, logLevel: 'silent' });
const html = `<!doctype html><meta charset="utf-8"><script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}</script>`;
const { webkit } = require('playwright');
const browser = await webkit.launch();
try {
  const page = await browser.newPage();
  await page.route('https://mashenstein.live/', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: html }));
  await page.goto('https://mashenstein.live/');
  const out = await page.evaluate(() => window.run());
  assert(out.first > 0.01, `the next song's first note through a rebuilt, slept chain is heard (peak ${out.first.toFixed(3)})`);
} finally {
  await browser.close();
}
console.log(failed ? 'CHAIN SLEEP REBUILD: FAILED' : 'CHAIN SLEEP REBUILD: PASSED');
if (failed) process.exitCode = 1;
