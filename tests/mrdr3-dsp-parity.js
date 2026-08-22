/*
 * One synth, two hosts — docs/MRDR-3-worklet-spec.md §11.
 *
 * The spec forbids maintaining two approximate synths, because the moment the live path
 * and the render path compute anything differently, a stem stops matching the mix it came
 * from and every baseline in the project becomes a guess. That rule is only worth
 * something if something checks it, and this is the check: the same events, the same core,
 * rendered through a real AudioWorkletProcessor in Chromium and through the plain-JS
 * reference renderer in Node, compared sample by sample.
 *
 * They are not merely close. The core is ONE string of source, both hosts run it on the
 * same inputs, and IEEE arithmetic is deterministic — so the bar here is EXACT, and a
 * non-zero difference means the two hosts have started to diverge in a way no tolerance
 * should be allowed to hide.
 *
 * Also here because they belong to the same claim and cost nothing extra:
 *   · the PURITY scan — the core touches no worklet global, which is what lets the
 *     identical source run in Node at all
 *   · BLOCK-SIZE INVARIANCE — a block boundary is not a time
 *   · the STRAY BACKTICK guard, which is not pedantry: the core is a template literal, a
 *     backtick in a prose comment silently ends it, and that has broken this build three
 *     times during Phase 2 alone. Cheap to check, invisible to review.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderMrdr3, frameAt, MRDR3_DSP_SOURCE } from '../src/engine/mrdr3/dsp.js';
import { mrdr3Tables } from '../src/engine/mrdr3/tables.js';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg));

// ---- the purity scan, and the backtick guard ---------------------------------------
for (const global of ['currentFrame', 'sampleRate', 'currentTime', 'registerProcessor',
  'AudioWorkletProcessor', 'document', 'window', 'Tone']) {
  const re = new RegExp(`\\b${global}\\b`);
  assert(!re.test(MRDR3_DSP_SOURCE),
    `the core never touches \`${global}\` — it takes its rate as an argument and is handed its frame`);
}
assert(!/Math\.random|Date\.now|performance\.now/.test(MRDR3_DSP_SOURCE),
  'and reaches for no clock and no randomness, so two renders are one file');
for (const file of ['params.js', 'primitives.js', 'osc.js', 'dsp.js']) {
  const text = readFileSync(join(ROOT, 'src/engine/mrdr3', file), 'utf8');
  const literals = text.match(/= `[\s\S]*?\n`;/g) || [];
  // An ESCAPED backtick is legal and intended — several of these comments quote a
  // parameter name that way. What ends a template literal early is a bare one.
  const stray = literals.some((lit) => /(^|[^\\])`/.test(lit.slice(3, -2)));
  assert(!stray, `${file}: no stray backtick inside a DSP source literal`);
}

// ---- the fixture --------------------------------------------------------------------
// Everything the Phase 2 core has, at once: a chord so the group bus and the per-tone
// filters are exercised together, a second note so the allocator runs, and a resonant
// key-tracked filter with an envelope so coefficients move every sample.
// Everything the core has, at once. Three layers so the tone's summing is exercised,
// unison with spread and stereo on one of them so the channel discipline is (mono per
// oscillator, stereo from the placement on), a per-layer filter AND a global one so both
// run their coefficients per sample, a static pulse, and a 'len' so one layer dies inside
// another. A parity test only proves what it exercises.
const PATCH = {
  layers: [
    {
      kind: 'sawtooth', duty: null, ratio: 1, detune: 7, unison: 3, spread: 18,
      stereo: 0.8, gain: 0.7, len: 1, through: false,
      env: { attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.2 },
      filterStages: 1, filterKind: 2, filterFreq: 900, filterQ: 4, filterTrack: 0.3,
      filterOct: 0.8,
      filterEnvShape: { attack: 0.03, decay: 0.5, sustain: 0.5, release: 0.4 },
    },
    {
      kind: 'square', duty: '0.3000', ratio: 0.5, detune: -5, unison: 1, spread: 20,
      stereo: 0, gain: 0.45, len: 1.2, through: false,
      env: { attack: 0.004, decay: 0.3, sustain: 0.5, release: 0.3 },
      filterStages: 0, filterKind: 0, filterFreq: 1150, filterQ: 0.7, filterTrack: 0,
      filterOct: 0, filterEnvShape: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 },
    },
    {
      kind: 'triangle', duty: null, ratio: 2, detune: 0, unison: 2, spread: 9,
      stereo: 0.5, gain: 0.3, len: 0.6, through: false,
      env: { attack: 0.002, decay: 0.25, sustain: 0.3, release: 0.2 },
      filterStages: 0, filterKind: 0, filterFreq: 1150, filterQ: 0.7, filterTrack: 0,
      filterOct: 0, filterEnvShape: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 },
    },
  ],
  vca: { attack: 0.005, decay: 0.15, sustain: 0.8, release: 0.25 },
  filterStages: 2, filterKind: 0, filterFreq: 1800, filterQ: 3, filterOct: 1.5,
  filterTrack: 0.5, filterEnvShape: { attack: 0.02, decay: 0.4, sustain: 0.4, release: 0.3 },
};
const scoreAt = (rate) => [
  { type: 'noteOn', frame: frameAt(0.05, rate), eventId: 1, hz: [220, 277.18, 330], durFrames: [frameAt(0.5, rate)], velocity: 0.8 },
  { type: 'noteOn', frame: frameAt(0.30, rate), eventId: 2, hz: 440, durFrames: frameAt(0.3, rate), velocity: 0.6 },
  { type: 'noteOff', frame: frameAt(0.45, rate), eventId: 1 },
  { type: 'noteOn', frame: frameAt(0.60, rate), eventId: 3, hz: [110, 165], durFrames: [frameAt(0.4, rate)], velocity: 0.9 },
];
const TABLES = mrdr3Tables([0.3]);

const ENTRY = `
import { mrdr3WorkletSource, ensureMrdr3Dsp, createMrdr3Node }
  from ${JSON.stringify(join(ROOT, 'src/engine/mrdr3/worklet.js'))};
import { mrdr3Tables } from ${JSON.stringify(join(ROOT, 'src/engine/mrdr3/tables.js'))};

window.__renderWorklet = async ({ sampleRate, seconds, events, patch, maxGroups }) => {
  const N = Math.ceil(seconds * sampleRate);
  const ctx = new OfflineAudioContext(2, N, sampleRate);
  await ensureMrdr3Dsp(ctx);
  // Built HERE, on the main thread, and handed over finished — the processor never builds
  // a table. Also the second half of the parity claim: the browser expands the same
  // pyramid from the same series as Node does.
  const tables = mrdr3Tables([0.3]);
  const node = createMrdr3Node(ctx, { events, tables, patch, maxGroups });
  node.connect(ctx.destination);
  const r = await ctx.startRendering();
  return Array.from({ length: r.numberOfChannels }, (_, c) => Array.from(r.getChannelData(c)));
};
`;

const esbuild = require('esbuild');
const { chromium } = require('playwright');
const built = await esbuild.build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
  bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
});
const html = '<!doctype html><meta charset="utf-8">'
  + `<script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}<\/script>`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on('pageerror', (err) => fail(`page error: ${err.message}`));
await page.route('**/*', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: html }));
await page.goto('https://mrdr3-parity.test/', { waitUntil: 'load' });

const diff = (a, b) => {
  let m = 0;
  for (let c = 0; c < Math.min(a.length, b.length); c++) {
    for (let i = 0; i < Math.min(a[c].length, b[c].length); i++) {
      m = Math.max(m, Math.abs(a[c][i] - b[c][i]));
    }
  }
  return m;
};
const peakOf = (chs) => {
  let m = 0;
  for (const ch of chs) for (const s of ch) m = Math.max(m, Math.abs(s));
  return m;
};

// ---- worklet against the reference, at both rates -----------------------------------
for (const rate of [44100, 48000]) {
  const events = scoreAt(rate);
  const worklet = await page.evaluate((a) => window.__renderWorklet(a),
    { sampleRate: rate, seconds: 1.2, events, patch: PATCH, maxGroups: 12 });
  const node = renderMrdr3({
    events, seconds: 1.2, sampleRate: rate, tables: TABLES, patch: PATCH, maxGroups: 12,
  });
  const ref = node.channels.map((ch) => Array.from(ch));
  assert(peakOf(worklet) > 0.05, `${rate}: the worklet renders a non-silent tone (peak ${peakOf(worklet).toFixed(3)})`);
  const d = diff(worklet, ref);
  assert(d === 0, `${rate}: worklet and Node reference are SAMPLE-IDENTICAL (${d})`);
}

// ---- the allocator, pushed past its pool --------------------------------------------
// A lane asked for more groups than it has must steal in a stated order rather than
// dropping notes at random — and both hosts must steal identically, or a dense passage
// renders differently in a stem and in the mix.
{
  const rate = 44100;
  const events = [];
  for (let i = 0; i < 24; i++) {
    events.push({
      type: 'noteOn', frame: frameAt(0.02 + i * 0.03, rate), eventId: 100 + i,
      hz: [220 * (1 + (i % 5) * 0.12), 330], durFrames: [frameAt(0.5, rate)], velocity: 0.6,
    });
  }
  const worklet = await page.evaluate((a) => window.__renderWorklet(a),
    { sampleRate: rate, seconds: 1.5, events, patch: PATCH, maxGroups: 4 });
  const node = renderMrdr3({
    events, seconds: 1.5, sampleRate: rate, tables: TABLES, patch: PATCH, maxGroups: 4,
  });
  const d = diff(worklet, node.channels.map((ch) => Array.from(ch)));
  assert(d === 0, `a lane pushed past its pool steals identically in both hosts (${d})`);
  assert(node.health.steals > 0, `and did actually steal (${node.health.steals} times)`);
}

// ---- a block boundary is not a time --------------------------------------------------
{
  const rate = 44100;
  const events = scoreAt(rate);
  const base = renderMrdr3({ events, seconds: 1.2, sampleRate: rate, tables: TABLES, patch: PATCH, blockSize: 128 });
  for (const blockSize of [1, 512, 997]) {
    const other = renderMrdr3({ events, seconds: 1.2, sampleRate: rate, tables: TABLES, patch: PATCH, blockSize });
    const d = diff(base.channels, other.channels);
    assert(d === 0, `rendering at ${blockSize} frames per block is identical to 128 (${d})`);
  }
}

// ---- determinism ----------------------------------------------------------------------
{
  const events = scoreAt(44100);
  const a = renderMrdr3({ events, seconds: 1.2, sampleRate: 44100, tables: TABLES, patch: PATCH });
  const b = renderMrdr3({ events, seconds: 1.2, sampleRate: 44100, tables: TABLES, patch: PATCH });
  assert(diff(a.channels, b.channels) === 0, 'two renders of one score are one file');
}

await browser.close();
console.log(failed
  ? `\nMRDR-3 DSP PARITY: ${failed} FAILED`
  : '\nMRDR-3 DSP PARITY: OK');
process.exit(failed ? 1 : 0);
