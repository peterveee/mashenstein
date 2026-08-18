/*
 * One synth, two hosts — docs/TNGR-2-completion-spec.md §2 and §12.2.
 *
 * The completion spec forbids maintaining "two approximate synths", because the moment
 * the live path and the render path compute anything differently, a stem stops matching
 * the mix it came from and every baseline in the project becomes a guess. That rule is
 * only worth anything if something checks it, and this is the check: the same events, the
 * same core, rendered through a real AudioWorkletProcessor in Chromium and through the
 * plain-JS reference renderer in Node, compared sample by sample.
 *
 * They are not merely close. The core is one string of source (see src/engine/tngr2/dsp.js),
 * both hosts run it on the same inputs, and IEEE arithmetic is deterministic — so the bar
 * here is EXACT, and a non-zero difference means the two hosts have started to diverge in
 * a way no tolerance should be allowed to hide.
 *
 * The worklet half also proves the DSP core survives the trip that broke the naive
 * approach twice already: it must render from a secure origin (§3 finding a) and take its
 * schedule at construction rather than over the port (§3 finding b).
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderTngr2, frameAt, TNGR2_DEFAULT_ENV } from '../src/engine/tngr2/dsp.js';
import { packTngr2Tables } from '../src/engine/tngr2/tables.js';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const ENTRY = `
import { tngr2WorkletSource, ensureTngr2Dsp, createTngr2Node }
  from ${JSON.stringify(join(ROOT, 'src/engine/tngr2/worklet.js'))};
import { packTngr2Tables } from ${JSON.stringify(join(ROOT, 'src/engine/tngr2/tables.js'))};

window.__renderWorklet = async ({ sampleRate, seconds, events, maxVoices, families, patch }) => {
  const N = Math.ceil(seconds * sampleRate);
  const ctx = new OfflineAudioContext(2, N, sampleRate);
  await ensureTngr2Dsp(ctx);
  // Expanded HERE, on the main thread, and handed over finished — the processor never
  // builds a table. This is also the second half of the parity claim: the browser
  // expands the same packed payload from the same spectra as Node does.
  const tables = packTngr2Tables(families);
  const node = createTngr2Node(ctx, { events, maxVoices, tables, patch });
  node.connect(ctx.destination);
  const rendered = await ctx.startRendering();
  return Array.from({ length: rendered.numberOfChannels },
    (_, c) => Array.from(rendered.getChannelData(c)));
};
window.__workletSourceLength = () => tngr2WorkletSource().length;
`;

let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg));

const diff = (a, b) => {
  let max = 0;
  for (let c = 0; c < Math.min(a.length, b.length); c++) {
    for (let i = 0; i < Math.min(a[c].length, b[c].length); i++) {
      max = Math.max(max, Math.abs(a[c][i] - b[c][i]));
    }
  }
  return max;
};
const peak = (chs) => {
  let max = 0;
  for (const ch of chs) for (const s of ch) max = Math.max(max, Math.abs(s));
  return max;
};

const env = TNGR2_DEFAULT_ENV;
// Four families across the span of the catalogue, and pitches from C2 to C6 so the mip
// pyramid is exercised on both sides of a level boundary rather than sitting on level 0.
const FAMILIES = ['basic', 'vowelGlass', 'sawForm', 'crystal'];
const TABLES = packTngr2Tables(FAMILIES);
// Everything at once, on purpose. A parity test only proves what it exercises, so this
// patch turns on both oscillators, unison, stereo spread, the position ADHSR, the LFO
// onto position, vibrato onto pitch, and a resonant filter with key tracking and drive.
const PATCH = {
  mode: 'poly', glide: 0, seed: 4242,
  amp: { attack: 0.01, decay: 0.18, sustain: 0.65, release: 0.25 },
  positionEnv: { attack: 0.08, decay: 0.3, sustain: 0.35, release: 0.2 },
  filterEnv: { attack: 0.02, decay: 0.25, sustain: 0.4, release: 0.2, amount: 2.5 },
  filter: { type: 'lowpass', cutoff: 900, resonance: 6, keyTrack: 0.6, drive: 0.4 },
  lfo1: { shape: 'triangle', rate: 4.5, phase: 0.2 },
  // Vibrato rides beside the patch rather than in it — a shared control, its own path.
  vibrato: { depth: 0.4, rate: 5.5, delay: 0.02 },
  oscA: { table: 'vowelGlass', position: 0.33, level: 0.9, unison: 3, spread: 17,
    stereo: 0.8, octave: 0, semitone: 0, fine: -6,
    envAmount: 0.45, lfoAmount: 0.2 },
  oscB: { table: 'sawForm', position: 0.72, level: 0.55, unison: 2, spread: 9,
    stereo: 0.5, octave: -1, semitone: 7, fine: 4,
    envAmount: -0.3, lfoAmount: 0.15 },
};
const scoreFor = (rate) => {
  const events = [];
  // Staggered entries and releases across pitches far enough apart to land on different
  // mip levels — C2 up to C6.
  const notes = [
    [1, 0.05, 0.60, 65.41], [2, 0.08, 0.55, 164.81], [3, 0.12, 0.70, 220],
    [4, 0.30, 0.45, 659.26], [5, 0.35, 0.90, 1046.5],
  ];
  for (const [id, at, off, hz] of notes) {
    events.push({ type: 'noteOn', frame: frameAt(at, rate), eventId: id, hz,
      velocity: 0.4 + (id % 3) * 0.3 });
    events.push({ type: 'noteOff', frame: frameAt(off, rate), eventId: id });
  }
  return events;
};

const { chromium } = require('playwright');
const esbuild = require('esbuild');
const built = await esbuild.build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
  bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
});
const html = '<!doctype html><meta charset="utf-8">'
  + `<script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}<\/script>`;

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // https, not setContent: on an opaque origin Chromium does not expose `audioWorklet`
  // at all. See docs/TNGR-2-completion-spec.md §3 finding (a).
  await page.route('**/*', (route) => route.fulfill({
    status: 200, contentType: 'text/html', body: html,
  }));
  await page.goto('https://tngr2-parity.test/', { waitUntil: 'load' });

  for (const sampleRate of [44100, 48000]) {
    const events = scoreFor(sampleRate);
    const seconds = 1.2;
    const worklet = await page.evaluate((a) => window.__renderWorklet(a),
      { sampleRate, seconds, events, maxVoices: 16, families: FAMILIES, patch: PATCH });
    const node = renderTngr2({ events, seconds, sampleRate, maxVoices: 16, tables: TABLES,
      patch: PATCH });
    const reference = node.channels.map((ch) => Array.from(ch));

    assert(peak(worklet) > 0.1, `${sampleRate}: the worklet render is audible (peak ${peak(worklet).toFixed(3)})`);
    assert(peak(reference) > 0.1, `${sampleRate}: the reference render is audible (peak ${peak(reference).toFixed(3)})`);
    assert(worklet[0].length === reference[0].length,
      `${sampleRate}: both hosts render ${reference[0].length} frames`);
    const d = diff(worklet, reference);
    assert(d === 0,
      `${sampleRate}: the worklet and the reference renderer agree EXACTLY (diff ${d})`);
  }

  // The two hosts must also agree about a lane pushed past its voice pool, where the
  // allocator — not the oscillator — decides what is heard.
  const rate = 44100;
  const crowded = [];
  for (let i = 0; i < 26; i++) {
    crowded.push({ type: 'noteOn', frame: frameAt(0.01 + i * 0.004, rate), eventId: 200 + i,
      hz: 150 + i * 25, velocity: 0.7,
    });
  }
  const wCrowd = await page.evaluate((a) => window.__renderWorklet(a),
    { sampleRate: rate, seconds: 1, events: crowded, maxVoices: 16, families: FAMILIES,
      patch: PATCH });
  const rCrowd = renderTngr2({ events: crowded, seconds: 1, sampleRate: rate, maxVoices: 16,
    tables: TABLES, patch: PATCH }).channels.map((ch) => Array.from(ch));
  assert(diff(wCrowd, rCrowd) === 0,
    `voice stealing is identical in both hosts (diff ${diff(wCrowd, rCrowd)})`);

  // Mono with glide: the path that is NOT a pure note-on, and the one most likely to be
  // computed on a block boundary in one host and a sample boundary in the other.
  const glidePatch = { ...PATCH, mode: 'mono', glide: 0.18 };
  const glideEvents = [
    { type: 'noteOn', frame: frameAt(0.05, rate), eventId: 1, hz: 110, velocity: 0.9 },
    { type: 'noteOn', frame: frameAt(0.35, rate), eventId: 2, hz: 220, velocity: 0.7 },
    { type: 'noteOn', frame: frameAt(0.62, rate), eventId: 3, hz: 146.83, velocity: 0.8 },
    { type: 'noteOff', frame: frameAt(0.9, rate), eventId: 3 },
  ];
  const wGlide = await page.evaluate((a) => window.__renderWorklet(a),
    { sampleRate: rate, seconds: 1.3, events: glideEvents, maxVoices: 16, families: FAMILIES,
      patch: glidePatch });
  const rGlide = renderTngr2({ events: glideEvents, seconds: 1.3, sampleRate: rate,
    maxVoices: 16, tables: TABLES, patch: glidePatch }).channels.map((ch) => Array.from(ch));
  assert(peak(wGlide) > 0.05, `the glide render is audible (peak ${peak(wGlide).toFixed(3)})`);
  assert(diff(wGlide, rGlide) === 0,
    `mono glide agrees EXACTLY in both hosts (diff ${diff(wGlide, rGlide)})`);

  const sourceLength = await page.evaluate(() => window.__workletSourceLength());
  assert(sourceLength > 1000, `the worklet is built from the shared core (${sourceLength} chars)`);
  if (errors.length) fail(`page errors — ${errors.join(' | ')}`);
  await page.close();
} finally {
  await browser.close();
}

console.log(failed ? `\nTNGR-2 DSP PARITY: ${failed} FAILED` : '\nTNGR-2 DSP PARITY: PASSED');
process.exit(failed ? 1 : 0);
