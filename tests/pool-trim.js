// A TONE POOL KEEPS ONLY THE SLOTS ITS RECENT NOTES ASKED FOR (engine/voices.js,
// setTrimIdleSlots; 22 Oct 2026).
//
// A pooled lane (CRLS-1, RMND-7) used to grow to its widest chord and keep every slot for the
// rest of the song, each one a synth rendered every quantum. With trimming on — the game — a
// slot nobody has needed for SLOT_KEEP_S seconds, and whose note and tail are over, goes. Live
// in headless WebKit, silently, one lane: a four-note chord, single notes for fourteen
// seconds, then the chord again.
//
//   1. The chord builds the pool out (five slots: the chord and one spare), trim or not.
//   2. With trimming on, the pool is back to two slots before the chord comes round …
//   3. … and the single notes after that sound as they do with trimming off.
//   4. The chord's return builds it out again, and is heard.
//   5. With trimming off the pool keeps all five, as it always has.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = false;
const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); failed = true; } else console.log('ok:', msg); };

const ENTRY = `
import { Audio } from ${JSON.stringify(join(ROOT, 'src/engine/audio.js'))};
import { setTrimIdleSlots } from ${JSON.stringify(join(ROOT, 'src/engine/voices.js'))};
window.run = async (trim) => {
  const conn = AudioNode.prototype.connect;
  let tap = null; const peaks = [];
  AudioNode.prototype.connect = function (dest, ...rest) {
    if (dest instanceof AudioDestinationNode) {
      if (!tap) {
        const ctx = dest.context;
        tap = ctx.createGain(); const an = ctx.createAnalyser(); an.fftSize = 2048; const mute = ctx.createGain(); mute.gain.value = 0;
        conn.call(tap, an); conn.call(an, mute); conn.call(mute, dest);
        const buf = new Float32Array(2048);
        setInterval(() => { an.getFloatTimeDomainData(buf); let p = 0; for (const v of buf) p = Math.max(p, Math.abs(v)); peaks.push([ctx.currentTime, p]); }, 40);
      }
      return conn.call(this, tap, ...rest);
    }
    return conn.call(this, dest, ...rest);
  };
  setTrimIdleSlots(trim);
  Audio.setMrdrQuality('phone'); Audio.setMixerMeteringEnabled(false); Audio.setCaptureEnabled(false);
  Audio.ensure(); await Audio.ctx.resume(); if (Audio.mixer) await Audio.mixer.ready;
  // Sixteen-step sections, four seconds each here: the chord in the first, single notes for
  // three, the chord again sixteen seconds in.
  const hz = (m) => 440 * 2 ** ((m - 69) / 12);
  const bar = (chord) => {
    const lead = new Array(16).fill(null), leadLen = new Array(16).fill(null);
    lead[0] = chord ? [60, 64, 67, 71].map(hz) : hz(72); leadLen[0] = chord ? 4 : 2;
    lead[8] = hz(72); leadLen[8] = 2;
    return { lead, leadLen };
  };
  Audio.setBank({ bpm: 120, ...bar(false), sections: [bar(true), bar(false)], order: [0, 1, 1, 1, 0, 1] },
    { voice: { leadVoice: 'fmKeys' } });
  const t0 = Audio.ctx.currentTime;
  const slots = [];
  const iv = setInterval(() => {
    const p = [...(Audio.voices?.pools?.values() || [])].find((x) => x.voiceId === 'fmKeys');
    slots.push([Audio.ctx.currentTime - t0, p ? p.slots.length : 0]);
  }, 250);
  await new Promise((r) => setTimeout(r, 21000));
  clearInterval(iv);
  return { slots, peaks: peaks.map(([t, p]) => [t - t0, p]) };
};`;

const esbuild = require('esbuild');
const built = await esbuild.build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' }, bundle: true, format: 'iife', write: false, logLevel: 'silent' });
const html = `<!doctype html><meta charset="utf-8"><script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}</script>`;
const { webkit } = require('playwright');
const browser = await webkit.launch();
try {
  const out = {};
  for (const trim of [true, false]) {
    const page = await browser.newPage();
    await page.route('https://mashenstein.live/', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: html }));
    await page.goto('https://mashenstein.live/');
    out[trim] = await page.evaluate((x) => window.run(x), trim);
    await page.close();
  }
  const on = out.true, off = out.false;
  const firstNote = (r) => r.peaks.find(([, p]) => p > 0.005)?.[0];
  const f1 = firstNote(on), f0 = firstNote(off);
  const at = (r, t) => r.slots.filter(([s]) => s <= t).pop()?.[1] ?? 0;
  assert(at(on, f1 + 1) === 5 && at(off, f0 + 1) === 5, `the chord builds the pool out to five slots (${at(on, f1 + 1)} with trimming, ${at(off, f0 + 1)} without)`);
  assert(at(on, f1 + 15) <= 2, `with trimming on it is back to ${at(on, f1 + 15)} slots before the chord comes round`);
  assert(at(off, f0 + 15) === 5, 'with trimming off it keeps all five');
  // The single notes in the second half of the loop, after the trim, against the same notes untrimmed.
  const loud = (r, f, a, b) => Math.max(0, ...r.peaks.filter(([t]) => t >= f + a && t < f + b).map(([, p]) => p));
  const notesOn = loud(on, f1, 10, 15.8), notesOff = loud(off, f0, 10, 15.8);
  assert(notesOn > 0.8 * notesOff, `the single notes after the trim sound as they do without it (${notesOn.toFixed(3)} against ${notesOff.toFixed(3)})`);
  const most = (r, f, a, b) => Math.max(0, ...r.slots.filter(([t]) => t >= f + a && t < f + b).map(([, n]) => n));
  assert(most(on, f1, 15.5, 18.5) === 5, `the chord's return builds it out again (${most(on, f1, 15.5, 18.5)} slots)`);
  // The chord's own moment: the first loud peak after the loop wraps.
  const wrap = (r, f) => r.slots.find(([t, n]) => t > f + 15.5 && n === 5)?.[0] ?? (f + 16);
  const chordOn = loud(on, f1, wrap(on, f1) - f1 - 0.2, wrap(on, f1) - f1 + 0.5), chordOff = loud(off, f0, 15.9, 16.6);
  assert(chordOn > 0.8 * chordOff, `and is heard (${chordOn.toFixed(3)} against ${chordOff.toFixed(3)})`);
} finally {
  await browser.close();
}
console.log(failed ? 'POOL TRIM: FAILED' : 'POOL TRIM: PASSED');
if (failed) process.exitCode = 1;
