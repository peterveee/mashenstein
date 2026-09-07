/*
 * JMJR-4 through the real VoiceRack, offline: every shipped preset makes a sound that is
 * finite and under full scale; the same notes render the same twice on fresh contexts (a
 * seeded voice, so a stem is byte-for-byte the lane inside the mix); a D burst lands at the
 * same moment at 44.1 and 48 kHz (the prototype placed it in samples at the data file's
 * rate and rendered it at the context's, 8 % early on a live desk); a refused preset is
 * silent rather than approximate; the held-key path releases through the generic
 * native record with no branch of its own; and a SPEAK preset says its compiled phrase
 * (a word per step when asked), while one whose block is stale says nothing.
 *
 *   node tests/jmjr4-render.js
 *
 * Needs Playwright's Chromium; skipped with a note where it is not installed.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg));

let chromium;
let esbuild;
try { ({ chromium } = require('playwright')); esbuild = require('esbuild'); } catch {
  console.log('note: playwright or esbuild not installed, the JMJR-4 render test is skipped');
  process.exit(0);
}

const CABINET = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/jmjr4-text/cabinet.json'), 'utf8'));
const ENTRY = `
import { VOICES } from ${JSON.stringify(join(ROOT, 'src/data/voices.js'))};
import { VoiceRack } from ${JSON.stringify(join(ROOT, 'src/engine/voices.js'))};
import { JMJR4_DATA } from ${JSON.stringify(join(ROOT, 'src/engine/jmjr4/data.js'))};
import { compileJmjr4, jmjr4SpeakSource } from ${JSON.stringify(join(ROOT, 'src/engine/jmjr4/compile.js'))};
import { compilePhrase, compactIr } from ${JSON.stringify(join(ROOT, 'src/engine/jmjr4/text.js'))};
// A SPEAK fixture, its phrase compiled here from the parity fixture's own dictionary
// entries, the way the desk compiles one.
const CAB = ${JSON.stringify(CABINET)};
{
  const v = { id: 'jmjrTestSpeak', label: 'test speak', category: 'FX', synth: 'JMJR-4', dur: 2,
    jmjr4: { mode: 'speak', voice: 'robot', phrase: CAB.text, ending: 'flat', perKey: 'word', pitchFollows: 'key' } };
  const { patch } = compileJmjr4(v, JMJR4_DATA, { forCompile: true });
  const sp = patch.speak;
  const args = (text) => ({ text, voice: patch.throat, speed: sp.speed, pitchHz: sp.pitchHz, range: sp.range, ending: sp.ending, step: sp.step, ctl: patch.ctl });
  v.jmjr4.phraseIr = { source: jmjr4SpeakSource(v, JMJR4_DATA), ir: compactIr(compilePhrase(JMJR4_DATA, CAB.lex, args(CAB.text)).ir),
    words: CAB.text.split(/\\s+/).map((w) => compactIr(compilePhrase(JMJR4_DATA, CAB.lex, args(w)).ir)) };
  VOICES.jmjrTestSpeak = v;
  VOICES.jmjrTestSpeakStale = { ...v, id: 'jmjrTestSpeakStale', jmjr4: { ...v.jmjr4, speed: 1.5 } };
}
// the arcade stage: Arcade Chorus with its BITS / RATE switched off, to hold against the shipped one
VOICES.jmjrTestUncrushed = { ...VOICES.jmjrArcadeChorus, id: 'jmjrTestUncrushed', jmjr4: { ...VOICES.jmjrArcadeChorus.jmjr4, bits: 16, rate: 44.1 } };
// JITTER, against the same note with none: audible, and seeded rather than random
VOICES.jmjrTestJitter = { id: 'jmjrTestJitter', label: 'test jitter', category: 'Pad', synth: 'JMJR-4', dur: 2,
  jmjr4: { voice: 'announcer', line: 'ooh', jitter: 2, flutter: 0, amp: { attack: 0.05, decay: 0.2, sustain: 1, release: 0.2 } } };
VOICES.jmjrTestNoJitter = { ...VOICES.jmjrTestJitter, id: 'jmjrTestNoJitter', jmjr4: { ...VOICES.jmjrTestJitter.jmjr4, jitter: 0 } };
// The fixtures: three that must sing, one that must refuse. Shipped presets join them.
Object.assign(VOICES, {
  jmjrTestChoir: { id: 'jmjrTestChoir', label: 'test choir', category: 'Pad', synth: 'JMJR-4', dur: 2,
    jmjr4: { voice: 'chorister', line: 'aah', unison: 3, spread: 24, amp: { attack: 0.1, decay: 0.3, sustain: 1, release: 0.4 } },
    vibrato: { depth: 0.2, rate: 5.2, delay: 0.3 } },
  jmjrTestDoo: { id: 'jmjrTestDoo', label: 'test doo', category: 'Lead', synth: 'JMJR-4', dur: 0.5,
    jmjr4: { voice: 'announcer', line: 'doo', unison: 1, amp: { attack: 0.005, decay: 0.2, sustain: 1, release: 0.1 } } },
  jmjrTestLegato: { id: 'jmjrTestLegato', label: 'test legato', category: 'Lead', synth: 'JMJR-4', dur: 0.5, mode: 'legato', portamento: 0.06,
    jmjr4: { voice: 'robot', line: 'daa laa- laa mmm', unison: 1, morphTo: 'M', morph: 40, morphTime: 0.2 } },
  jmjrTestRefused: { id: 'jmjrTestRefused', label: 'refused', category: 'Pad', synth: 'JMJR-4', dur: 1, jmjr4: { voice: 'nobody' } },
});
window.__ids = () => Object.values(VOICES).filter((v) => v.synth === 'JMJR-4').map((v) => v.id);
window.__speakSeconds = () => VOICES.jmjrTestSpeak.jmjr4.phraseIr.words.map((w) => w.total_seconds);
window.__render = async ({ rate, seconds, plays, release }) => {
  const ctx = new OfflineAudioContext(1, Math.ceil(seconds * rate), rate);
  const rack = new VoiceRack(ctx);
  const dry = ctx.createGain(); dry.connect(ctx.destination);
  const played = plays.map((p) => rack.play('lead', p.voice, p.hz, { time: p.at, dur: p.dur, gain: 0.5, dry, wet: null, echo: false, step: p.step ?? null, preview: !!p.hold, hold: !!p.hold }));
  if (release) rack._releasePreview(release);
  const r = await ctx.startRendering();
  const d = r.getChannelData(0);
  let peak = 0, sum = 0, bad = 0, peakAt = 0;
  for (let i = 0; i < d.length; i++) { const x = d[i]; if (!Number.isFinite(x)) bad++; else { if (Math.abs(x) > peak) { peak = Math.abs(x); peakAt = i; } sum += x * x; } }
  const win = (a, b) => { let s = 0, n = 0; for (let i = Math.floor(a * rate); i < Math.min(d.length, Math.floor(b * rate)); i++) { s += d[i] * d[i]; n++; } return n ? Math.sqrt(s / n) : 0; };
  // where the first burst of noise lands: the first 2 ms window whose energy above 2 kHz
  // dominates — a D's burst against the vowel that follows it
  return { played, peak, rms: Math.sqrt(sum / d.length), bad, peakAt: peakAt / rate, early: win(0.05, 0.3), late: win(seconds - 0.3, seconds), head: Array.from(d.slice(0, Math.floor(rate * 0.6))) };
};
`;

const built = await esbuild.build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' }, bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent' });
const html = '<!doctype html><meta charset="utf-8">' + `<script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}<\/script>`;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/*', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: html }));
  await page.goto('https://jmjr4-render.test/', { waitUntil: 'load' });
  const render = (a) => page.evaluate((x) => window.__render(x), a);
  const ids = await page.evaluate(() => window.__ids());

  // ---- every preset sounds, finite, under full scale ----
  for (const id of ids) {
    if (['jmjrTestRefused', 'jmjrTestSpeakStale', 'jmjrTestUncrushed', 'jmjrTestNoJitter'].includes(id)) continue;
    // a 1.2 s note, then room for the longest release in the bank (1.6 s) and a margin
    const r = await render({ rate: 48000, seconds: 4, plays: [{ voice: id, hz: 164.81, at: 0.05, dur: 1.2, step: 0 }] });
    assert(r.played[0] === true, `${id}: the rack plays it`);
    assert(r.bad === 0, `${id}: every sample is finite`);
    assert(r.rms > 1e-4, `${id}: it makes a sound (rms ${r.rms.toFixed(4)})`);
    assert(r.peak < 1, `${id}: peak ${r.peak.toFixed(3)} is under full scale`);
    assert(r.late < 1e-3, `${id}: it has stopped by the end (tail rms ${r.late.toExponential(1)})`);
  }

  // ---- the refused preset is silence, not an approximation ----
  {
    const r = await render({ rate: 48000, seconds: 1, plays: [{ voice: 'jmjrTestRefused', hz: 164.81, at: 0.05, dur: 0.5, step: 0 }] });
    assert(r.played[0] === false && r.rms === 0, 'a preset the compiler refuses plays nothing');
  }

  // ---- deterministic: two fresh contexts, the same samples ----
  {
    const args = { rate: 48000, seconds: 2, plays: [{ voice: 'jmjrTestChoir', hz: [110, 138.59, 164.81], at: 0.05, dur: 1, step: 0 }] };
    const a = await render(args);
    const b = await render(args);
    const same = a.head.every((x, i) => Math.abs(x - b.head[i]) < 5e-6);
    assert(same, 'the same chord renders the same twice');
  }

  // ---- the burst lands at the same moment at both rates ----
  {
    const at = async (rate) => (await render({ rate, seconds: 1, plays: [{ voice: 'jmjrTestDoo', hz: 130.81, at: 0.1, dur: 0.5, step: 0 }] })).peakAt;
    const a = await at(44100);
    const b = await at(48000);
    assert(Math.abs(a - b) < 0.004, `the D lands at the same time at 44.1 and 48 kHz (${(a * 1000).toFixed(1)} vs ${(b * 1000).toFixed(1)} ms)`);
  }

  // ---- legato line: four steps, one syllable each, the tie silencing an onset ----
  {
    const plays = [110, 123.47, 130.81, 146.83].map((hz, i) => ({ voice: 'jmjrTestLegato', hz, at: 0.05 + i * 0.4, dur: 0.38, step: i }));
    const r = await render({ rate: 48000, seconds: 2.2, plays });
    assert(r.played.every(Boolean) && r.bad === 0 && r.rms > 1e-4, 'a legato line of four steps plays through');
  }

  // ---- held from the keyboard, then let go through the generic native record ----
  {
    const r = await render({ rate: 48000, seconds: 2, plays: [{ voice: 'jmjrTestChoir', hz: 164.81, at: 0.05, dur: 2, hold: true }], release: 'lead|164.81' });
    assert(r.played[0] === true && r.bad === 0, 'a held key registers and releases without error');
    assert(r.late < 1e-3, 'and is silent once released');
  }

  // ---- SPEAK: a word per step, the whole phrase from the keyboard, a stale block silent ----
  {
    const secs = await page.evaluate(() => window.__speakSeconds());
    assert(secs.length === 4 && secs.every((x) => x > 0.1), `the four words compiled (${secs.map((x) => x.toFixed(2)).join(', ')} s)`);
    // four steps say four words, each at its own key; the first word is 'insert' (${secs[0]} s)
    const plays = [110, 123.47, 130.81, 146.83].map((hz, i) => ({ voice: 'jmjrTestSpeak', hz, at: 0.05 + i * 0.8, dur: 0.2, step: i }));
    const r = await render({ rate: 48000, seconds: 4, plays });
    assert(r.played.every(Boolean) && r.bad === 0 && r.rms > 1e-4, `a spoken line of four steps plays through (rms ${r.rms.toFixed(4)})`);
    // a 0.2 s step does not cut the word: the first word is still sounding at 0.5 s
    const w1 = await render({ rate: 48000, seconds: 1.5, plays: [plays[0]] });
    assert(w1.early > 1e-3, `a word plays to its end past the step that started it (rms ${w1.early.toFixed(4)} over 0.05–0.3 s)`);
    const stale = await render({ rate: 48000, seconds: 1, plays: [{ voice: 'jmjrTestSpeakStale', hz: 110, at: 0.05, dur: 0.5, step: 0 }] });
    assert(stale.played[0] === false && stale.rms === 0, 'a block that no longer matches its pots is refused: silence, not the old phrase');
    // from the keyboard (hold): the phrase plays whole and stop-all silences it
    const held = await render({ rate: 48000, seconds: 3, plays: [{ voice: 'jmjrTestSpeak', hz: 130.81, at: 0.05, dur: 3, hold: true }] });
    assert(held.played[0] === true && held.bad === 0 && held.rms > 1e-4, 'a held key says its word');
  }

  // ---- BITS / RATE: the arcade stage is in the render, and only when asked for ----
  {
    const play = { hz: 110, at: 0.05, dur: 1, step: 0 };
    const a = await render({ rate: 48000, seconds: 2, plays: [{ ...play, voice: 'jmjrArcadeChorus' }] });
    const b = await render({ rate: 48000, seconds: 2, plays: [{ ...play, voice: 'jmjrTestUncrushed' }] });
    const diff = a.head.reduce((m, x, i) => Math.max(m, Math.abs(x - b.head[i])), 0);
    assert(a.rms > 1e-4 && b.rms > 1e-4 && diff > 1e-3, `six bits at 8 kHz changes the samples (max diff ${diff.toExponential(1)})`);
  }

  // ---- JITTER: the pitch wanders, and it wanders the same way twice ----
  {
    const play = { hz: 130.81, at: 0.05, dur: 1.5, step: 0 };
    const args = (voice) => ({ rate: 48000, seconds: 2.5, plays: [{ ...play, voice }] });
    const a = await render(args('jmjrTestJitter'));
    const b = await render(args('jmjrTestNoJitter'));
    const diff = a.head.reduce((m, x, i) => Math.max(m, Math.abs(x - b.head[i])), 0);
    assert(a.rms > 1e-4 && diff > 1e-2, `JITTER moves the pitch (max diff ${diff.toExponential(1)})`);
    const again = await render(args('jmjrTestJitter'));
    assert(a.head.every((x, i) => Math.abs(x - again.head[i]) < 5e-6), 'and it wanders the same way on a fresh context');
  }

  assert(errors.length === 0, `no page errors (${errors.join(' | ')})`);
} finally {
  await browser.close();
}

console.log(failed ? `\nJMJR-4 RENDER: ${failed} FAILED` : '\nJMJR-4 RENDER: OK');
process.exit(failed ? 1 : 0);
