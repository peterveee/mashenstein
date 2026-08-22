/*
 * The Tier-A claim, node by node — docs/MRDR-3-worklet-spec.md §3.1 and §11.
 *
 * The fidelity strategy rests on an assertion: most of MRDR-3's signal path is built from
 * Web Audio nodes whose behaviour is SPECIFIED, so porting them to per-sample code is a
 * transcription rather than a redesign, and only the unspecified parts need the ear. That
 * assertion is worth exactly as much as this file.
 *
 * Each primitive is run against the real node in a real OfflineAudioContext, on identical
 * input, and the MAXIMUM ERROR IS RECORDED — not asserted at a tolerance chosen to pass.
 * A tolerance nobody measured is a tolerance that hides the next mistake. Where a bound is
 * asserted it is stated with the reason it is that number.
 *
 * §13 names this suite as a phase gate rather than a footnote, for one reason: it is where
 * the a-rate coefficient question gets settled by measurement instead of by assumption.
 * 54 of the library's 80 filter instances are modulated, so being wrong about whether
 * Chromium rebuilds coefficients per sample or per block is not a tolerance — it is a
 * different filter, on two thirds of the catalogue.
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const ENTRY = `
import { MRDR3_PRIMITIVES_SOURCE } from ${JSON.stringify(join(ROOT, 'src/engine/mrdr3/primitives.js'))};

const P = new Function(MRDR3_PRIMITIVES_SOURCE
  + '; return { Mrdr3Biquad, mrdr3Shape, mrdr3PanGains, MRDR3_FILTER_KINDS };')();

const SR = 44100;
const N = 4096;

/**
 * The test signal: a deterministic broadband burst.
 *
 * Broadband because a filter is only tested where it has something to remove, and
 * deterministic because both halves of every comparison must be handed the SAME samples —
 * a seeded integer generator rather than Math.random, for the same reason the engine's
 * offline noise is seeded.
 */
const signal = () => {
  const d = new Float32Array(N);
  let s = 987654321;
  for (let i = 0; i < N; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    d[i] = ((s >>> 8) / 8388608) - 1;
  }
  return d;
};

const sourceOf = (ctx, data) => {
  const buf = ctx.createBuffer(1, data.length, SR);
  buf.getChannelData(0).set(data);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  return src;
};

/** A static biquad: no automation anywhere, so coefficients are built once. */
window.__biquadStatic = async ({ type, freq, Q, detune = 0 }) => {
  const data = signal();
  const ctx = new OfflineAudioContext(1, N, SR);
  const src = sourceOf(ctx, data);
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = Q;
  f.detune.value = detune;
  src.connect(f); f.connect(ctx.destination);
  src.start();
  const native = Array.from((await ctx.startRendering()).getChannelData(0));

  const b = new P.Mrdr3Biquad(SR);
  b.kind = P.MRDR3_FILTER_KINDS[type];
  b.setCoeffs(freq * Math.pow(2, detune / 1200), Q);
  const ported = new Array(N);
  for (let i = 0; i < N; i++) ported[i] = b.step(data[i], 0);
  return { native, ported };
};

/**
 * A MODULATED biquad — the phase gate.
 *
 * \`frequency\` is swept by an exponential ramp, which makes it an a-rate parameter with a
 * different value on every sample. Two ports are computed from identical input: one that
 * rebuilds coefficients EVERY SAMPLE and one that rebuilds them once per 128-frame render
 * quantum. Whichever tracks Chromium is what the core has to do.
 */
window.__biquadModulated = async ({ type, from, to, Q }) => {
  const data = signal();
  const ctx = new OfflineAudioContext(1, N, SR);
  const src = sourceOf(ctx, data);
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.Q.value = Q;
  f.frequency.setValueAtTime(from, 0);
  f.frequency.exponentialRampToValueAtTime(to, N / SR);
  src.connect(f); f.connect(ctx.destination);
  src.start();
  const native = Array.from((await ctx.startRendering()).getChannelData(0));

  // The exponential ramp, evaluated exactly as the spec states it.
  const at = (i) => from * Math.pow(to / from, (i / SR) / (N / SR));

  const perSample = new Array(N);
  const bs = new P.Mrdr3Biquad(SR);
  bs.kind = P.MRDR3_FILTER_KINDS[type];
  for (let i = 0; i < N; i++) {
    bs.setCoeffs(at(i), Q);
    perSample[i] = bs.step(data[i], 0);
  }

  const perBlock = new Array(N);
  const bb = new P.Mrdr3Biquad(SR);
  bb.kind = P.MRDR3_FILTER_KINDS[type];
  for (let i = 0; i < N; i++) {
    if (i % 128 === 0) bb.setCoeffs(at(i), Q);
    perBlock[i] = bb.step(data[i], 0);
  }
  return { native, perSample, perBlock };
};

/** A biquad handed a STEREO signal: one node, one set of coefficients, two histories. */
window.__biquadStereo = async ({ type, freq, Q }) => {
  const left = signal();
  const right = signal().map((v, i) => v * (i % 3 === 0 ? -1 : 0.5));
  const ctx = new OfflineAudioContext(2, N, SR);
  const buf = ctx.createBuffer(2, N, SR);
  buf.getChannelData(0).set(left);
  buf.getChannelData(1).set(right);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = Q;
  src.connect(f); f.connect(ctx.destination);
  src.start();
  const out = await ctx.startRendering();
  const native = [Array.from(out.getChannelData(0)), Array.from(out.getChannelData(1))];

  const b = new P.Mrdr3Biquad(SR);
  b.kind = P.MRDR3_FILTER_KINDS[type];
  b.setCoeffs(freq, Q);
  const portedL = new Array(N);
  const portedR = new Array(N);
  for (let i = 0; i < N; i++) {
    portedL[i] = b.step(left[i], 0);
    portedR[i] = b.step(right[i], 1);
  }
  return { native, ported: [portedL, portedR] };
};

/** The drive shaper: MRDR-3's own 1025-point curve, at oversample 'none'. */
window.__shaper = async ({ amount }) => {
  const curve = new Float32Array(1025);
  const k = 1 + amount ** 2 * 24;
  const norm = Math.tanh(k);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(k * x) / norm;
  }
  const data = signal();
  const ctx = new OfflineAudioContext(1, N, SR);
  const src = sourceOf(ctx, data);
  const w = ctx.createWaveShaper();
  w.curve = curve;
  w.oversample = 'none';
  src.connect(w); w.connect(ctx.destination);
  src.start();
  const native = Array.from((await ctx.startRendering()).getChannelData(0));
  const ported = Array.from(data, (x) => P.mrdr3Shape(curve, x));
  return { native, ported };
};

/** The unison panner: mono in, equal power out. */
window.__panner = async ({ pan }) => {
  const data = signal();
  const ctx = new OfflineAudioContext(2, N, SR);
  const src = sourceOf(ctx, data);
  const p = ctx.createStereoPanner();
  p.pan.value = pan;
  src.connect(p); p.connect(ctx.destination);
  src.start();
  const out = await ctx.startRendering();
  const native = [Array.from(out.getChannelData(0)), Array.from(out.getChannelData(1))];
  const g = P.mrdr3PanGains(pan, new Float64Array(2));
  return { native, ported: [Array.from(data, (x) => x * g[0]), Array.from(data, (x) => x * g[1])] };
};
`;

const { chromium } = require('playwright');
const esbuild = require('esbuild');

let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg));

const maxErr = (a, b) => {
  let m = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) m = Math.max(m, Math.abs(a[i] - b[i]));
  return m;
};
const maxErr2 = (a, b) => Math.max(maxErr(a[0], b[0]), maxErr(a[1], b[1]));
const e = (x) => x.toExponential(2);

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
await page.goto('https://mrdr3-primitives.test/', { waitUntil: 'load' });

console.log('Measured against the real node, 4096 samples of seeded broadband at 44.1k.\n');

// ---- the biquad, static ------------------------------------------------------------
// Every type the panel offers, at corners and Qs the library actually uses. The lowpass
// Q values are in DECIBELS and the bandpass ones are linear — that asymmetry is the spec's
// and is the single likeliest thing for a port to get wrong.
const CASES = [
  { type: 'lowpass', freq: 1150, Q: 0.7 },
  { type: 'lowpass', freq: 1900, Q: 1.1 },
  { type: 'lowpass', freq: 3600, Q: 0.6, detune: 700 },
  { type: 'lowpass', freq: 400, Q: 12 },
  { type: 'highpass', freq: 800, Q: 0.7 },
  { type: 'bandpass', freq: 520, Q: 5 },
  { type: 'bandpass', freq: 1080, Q: 7 },
  { type: 'bandpass', freq: 2600, Q: 1.2 },
  { type: 'notch', freq: 1000, Q: 2 },
];
let worstStatic = 0;
for (const c of CASES) {
  const { native, ported } = await page.evaluate((a) => window.__biquadStatic(a), c);
  const err = maxErr(native, ported);
  worstStatic = Math.max(worstStatic, err);
  const label = `${c.type} ${c.freq}Hz Q=${c.Q}${c.detune ? ` detune ${c.detune}` : ''}`;
  assert(err < 1e-6, `${label}: max error ${e(err)}`);
}
console.log(`  worst static biquad error across ${CASES.length} cases: ${e(worstStatic)}`);

// ---- the biquad, MODULATED — the phase gate ---------------------------------------
console.log('\nThe a-rate question: does Chromium rebuild coefficients per sample?');
for (const c of [
  { type: 'lowpass', from: 400, to: 6000, Q: 3 },
  { type: 'bandpass', from: 300, to: 4000, Q: 5 },
]) {
  const r = await page.evaluate((a) => window.__biquadModulated(a), c);
  const perSample = maxErr(r.native, r.perSample);
  const perBlock = maxErr(r.native, r.perBlock);
  console.log(`  ${c.type} ${c.from}->${c.to}Hz:  per-sample ${e(perSample)}   per-block ${e(perBlock)}`);
  assert(perSample < perBlock,
    `${c.type} swept: per-sample coefficients track the node more closely than per-block`);
  assert(perSample < 1e-6,
    `${c.type} swept: rebuilding coefficients EVERY SAMPLE matches the node (${e(perSample)})`);
}

// ---- and what that costs at MUSICAL modulation rates --------------------------------
//
// The sweep above is deliberately violent — four octaves in 93ms — and it answers the
// question it was asked: Chromium is per-sample. But it does NOT answer the question the
// Phase 0 bench depends on, which is what a control-rate approximation costs on the
// modulation this library actually contains. Every filter envelope in the catalogue is
// an attack of 0.2s or slower over 0.75 to 2.8 octaves, so about one octave per 93ms
// window at the very fastest. That is the case measured here, because
// work/local/mrdr3-worklet-bench.mjs bought its margin with a 32-sample control period
// and the honest cost of that decision belongs beside the decision.
console.log('\nWhat a control-rate approximation costs, at the rates the library uses:');
for (const c of [
  { type: 'lowpass', from: 400, to: 800, Q: 3, label: 'one octave / 93ms — the fastest envelope in the library' },
  { type: 'lowpass', from: 1000, to: 1100, Q: 3, label: 'a sixth of an octave — a typical envelope' },
]) {
  const r = await page.evaluate((a2) => window.__biquadModulated(a2), c);
  const perSample = maxErr(r.native, r.perSample);
  const perBlock = maxErr(r.native, r.perBlock);
  console.log(`  ${c.label}`);
  console.log(`    per-sample ${e(perSample)}   per-block(128) ${e(perBlock)}   ratio ${(perBlock / perSample).toFixed(0)}x`);
}

// ---- one node, two channels --------------------------------------------------------
const st = await page.evaluate((a) => window.__biquadStereo(a), { type: 'lowpass', freq: 1200, Q: 2 });
const stErr = maxErr2(st.native, st.ported);
assert(stErr < 1e-6,
  `a biquad on a stereo signal is one filter with two histories (${e(stErr)})`);

// ---- the shaper ---------------------------------------------------------------------
for (const amount of [0.04, 0.1, 0.5]) {
  const r = await page.evaluate((a) => window.__shaper(a), { amount });
  const err = maxErr(r.native, r.ported);
  assert(err < 1e-6, `drive shaper at ${amount}: max error ${e(err)}`);
}

// ---- the panner ---------------------------------------------------------------------
let worstPan = 0;
for (const pan of [-1, -0.5, 0, 0.35, 1]) {
  const r = await page.evaluate((a) => window.__panner(a), { pan });
  worstPan = Math.max(worstPan, maxErr2(r.native, r.ported));
}
assert(worstPan < 1e-6, `unison panner, five positions: worst error ${e(worstPan)}`);

await browser.close();
console.log(failed
  ? `\nMRDR-3 PRIMITIVES: ${failed} FAILED — Tier A is not a transcription after all`
  : '\nMRDR-3 PRIMITIVES: OK');
process.exit(failed ? 1 : 0);
