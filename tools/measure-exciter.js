// Put the Exciter on the bench: what it adds, what it leaves alone, and what it costs.
//
// An exciter is the one effect you cannot judge by listening to a song through it. Its
// whole claim — harmonics ABOVE the corner, body untouched, no aliasing, no DC — is a
// claim about a spectrum, and a mix is far too busy a signal to read one off. So this
// drives the effect on its own, in an OfflineAudioContext, with tones instead of music,
// and measures the four ways it can be quietly wrong:
//
//   HARMONICS   a tone in, its 2nd/3rd/4th out. Which of them, and how far down.
//   BODY        a tone BELOW the corner should come back untouched — that is the claim
//               that separates this from the Distortion already in the catalogue.
//   ALIASING    the 3rd harmonic of 9kHz is 27kHz, which folds back to 17.1kHz as a
//               metallic ring sitting exactly where the effect is meant to sound like
//               air. This is what oversample: '4x' is buying, measured rather than
//               assumed. DC comes off the same render.
//   COST        render time against realtime, best of three, minus a bare-oscillator
//               baseline — the same hand method the other numbers in EFFECTS were
//               measured by (see effects.js's note above ENGINE_BASE_COST).
//
// It also proves the thing nothing else catches: that the effect renders offline AT ALL.
// A worklet-based effect renders silent here and sounds fine in the browser, which is
// why BitCrusher and friends are not in the catalogue.
//
// Usage: node tools/measure-exciter.js
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SR = 44100;

// Long enough for a 16k window to sit in steady state well clear of the oscillator's
// start, short enough that a dozen renders is a few seconds.
const SECONDS = 1;

const ENTRY = `
import { createEffect } from ${JSON.stringify(join(ROOT, 'src/engine/effects.js'))};

window.__bench = async ({ sampleRate, seconds, tones, level, id, params, reps }) => {
  const N = Math.ceil(seconds * sampleRate);
  const times = [];
  let data = null;
  for (let r = 0; r < reps; r++) {
    const ctx = new OfflineAudioContext(1, N, sampleRate);
    const sum = ctx.createGain();
    sum.gain.value = level / tones.length;
    for (const f of tones) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      osc.connect(sum);
      osc.start(0);
    }
    let tail = sum;
    if (id) {
      const fx = createEffect(id, params, ctx, 120);
      if (!fx) throw new Error('createEffect returned null for ' + id);
      sum.connect(fx.node.input || fx.node);
      tail = fx.node.output || fx.node;
    }
    tail.connect(ctx.destination);
    const t0 = performance.now();
    const buf = await ctx.startRendering();
    times.push(performance.now() - t0);
    if (r === reps - 1) data = Array.from(buf.getChannelData(0));
  }
  return { data, ms: Math.min(...times), seconds: N / sampleRate };
};
`;

// ---------------------------------------------------------------- analysis

// In-place iterative radix-2 FFT — the same one tools/render-video.js analyses with.
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < half; k++) {
        const ur = re[i + k];
        const ui = im[i + k];
        const xr = re[i + k + half];
        const xi = im[i + k + half];
        const vr = xr * cr - xi * ci;
        const vi = xr * ci + xi * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi;
        re[i + k + half] = ur - vr; im[i + k + half] = ui - vi;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

const FFT_SIZE = 16384;

/** Amplitude spectrum of a steady window taken from the middle of the render. */
function spectrum(data) {
  const start = Math.floor((data.length - FFT_SIZE) / 2);
  const re = new Float64Array(FFT_SIZE);
  const im = new Float64Array(FFT_SIZE);
  for (let i = 0; i < FFT_SIZE; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / FFT_SIZE);   // Hann
    re[i] = (data[start + i] || 0) * w;
  }
  fft(re, im);
  const mag = new Float64Array(FFT_SIZE / 2);
  // 2/N for the one-sided amplitude, /0.5 again for Hann's coherent gain.
  for (let k = 0; k < mag.length; k++) mag[k] = Math.hypot(re[k], im[k]) * (4 / FFT_SIZE);
  return mag;
}

const binOf = (f) => Math.round((f / SR) * FFT_SIZE);

/** The tallest bin within a few of where a component should be — windows spread. */
function peakAt(mag, f, spread = 3) {
  const c = binOf(f);
  let best = 0;
  for (let k = Math.max(0, c - spread); k <= Math.min(mag.length - 1, c + spread); k++) {
    if (mag[k] > best) best = mag[k];
  }
  return best;
}

/** Where a component above Nyquist actually lands once the sample rate has folded it. */
function fold(f) {
  let x = f % SR;
  if (x > SR / 2) x = SR - x;
  return x;
}

const db = (v, ref = 1) => (v > 0 && ref > 0 ? 20 * Math.log10(v / ref) : -Infinity);
const fmt = (v) => (Number.isFinite(v) ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}dB` : '  -inf');
const hz = (f) => (f >= 1000 ? `${(f / 1000).toFixed(1)}k` : `${Math.round(f)}`);

// ---------------------------------------------------------------- driver

const { chromium } = require('playwright');
const esbuild = require('esbuild');

const built = await esbuild.build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
  bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
});
const bundleJs = built.outputFiles[0].text;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.setContent(
  '<!doctype html><meta charset="utf-8">'
  + `<script>${bundleJs.replace(/<\/script>/gi, '<\\/script>')}<\/script>`,
  { waitUntil: 'load' },
);

async function bench({ tones, level = 0.2, id = 'exciter', params = {}, reps = 1 }) {
  try {
    return await page.evaluate(
      (a) => window.__bench(a),
      { sampleRate: SR, seconds: SECONDS, tones, level, id, params, reps },
    );
  } catch (err) {
    throw new Error(`offline render failed: ${err.message}`
      + (errors.length ? `\n  page errors: ${errors.join('; ')}` : ''));
  }
}

let failures = 0;
const check = (ok, line) => { if (!ok) failures++; console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${line}`); };

// -- 1. renders at all, and mix 0 is exactly transparent ---------------------
console.log('\nTRANSPARENCY  — the effect in circuit at mix 0 against no effect at all');
{
  const dry = await bench({ tones: [3000], id: null });
  const off = await bench({ tones: [3000], params: { mix: 0 } });
  let worst = 0;
  let energy = 0;
  for (let i = 0; i < dry.data.length; i++) {
    worst = Math.max(worst, Math.abs(dry.data[i] - off.data[i]));
    energy += off.data[i] * off.data[i];
  }
  const rms = Math.sqrt(energy / off.data.length);
  check(rms > 1e-4, `renders offline — output rms ${rms.toExponential(2)} (a silent render is the bug this catches)`);
  // The null test's own tolerance: an insert sitting at mix 0 has to be free.
  check(worst < 5e-6, `mix 0 is transparent — worst sample difference ${worst.toExponential(2)} (tolerance 5e-6)`);
}

// The signal the exciter ADDED, which is the only thing worth a spectrum: the dry leg
// passes through untouched, so subtracting a dry render leaves the wet leg on its own.
// Reading the sum instead buries a -40dB harmonic under the tone that made it.
async function added(params, { f = 4000, level = 0.2 } = {}) {
  const dry = await bench({ tones: [f], level, id: null });
  const out = await bench({ tones: [f], level, params });
  const w = new Float64Array(dry.data.length);
  for (let i = 0; i < w.length; i++) w[i] = out.data[i] - dry.data[i];
  let sum = 0;
  for (const v of w) sum += v * v;
  return { w, mag: spectrum(w), dry: spectrum(dry.data), rms: Math.sqrt(sum / w.length), out };
}

// -- 2. harmonics, and which ones TIMBRE picks -------------------------------
console.log('\nHARMONICS     — 4kHz in, tune 3k / drive 0.6 / mix 1, measured on the ADDED signal alone');
console.log('                levels are dB under the 4kHz tone that made them');
for (const timbre of [0, 0.5, 1]) {
  const f = 4000;
  const a = await added({ tune: 3000, drive: 0.6, timbre, mix: 1 }, { f });
  const ref = peakAt(a.dry, f);
  const h = [2, 3, 4, 5].map((n) => db(peakAt(a.mag, fold(f * n)), ref));
  console.log(`  timbre ${timbre.toFixed(2)}   2nd ${fmt(h[0])}   3rd ${fmt(h[1])}`
    + `   4th ${fmt(h[2])}   5th ${fmt(h[3])}`);
  if (timbre === 0) {
    check(h[1] - h[0] > 20, `tanh makes ODD — 3rd is ${(h[1] - h[0]).toFixed(1)}dB over the 2nd`);
  }
  if (timbre === 1) {
    check(h[0] - h[1] > 20, `rectified makes EVEN — 2nd is ${(h[0] - h[1]).toFixed(1)}dB over the 3rd`);
    check(h[2] - h[3] > 20, `and the 4th is ${(h[2] - h[3]).toFixed(1)}dB over the 5th`);
  }
}

// -- 3. the body is untouched -----------------------------------------------
console.log('\nBODY          — 300Hz in, well under the 3k corner, at full drive and mix');
{
  const f = 300;
  const dry = await bench({ tones: [f], id: null });
  const wet = await bench({ tones: [f], params: { tune: 3000, drive: 1, timbre: 1, mix: 1 } });
  let num = 0;
  let den = 0;
  for (let i = 0; i < dry.data.length; i++) {
    const d = wet.data[i] - dry.data[i];
    num += d * d; den += dry.data[i] * dry.data[i];
  }
  const leak = db(Math.sqrt(num / dry.data.length), Math.sqrt(den / dry.data.length));
  check(leak < -40, `what the exciter adds to a tone below the corner: ${fmt(leak)} relative (want under -40dB)`);
}

// -- 4. aliasing and DC ------------------------------------------------------
console.log('\nALIASING / DC — 9kHz in: its 3rd (27k) folds to 17.1k, its 4th (36k) to 8.1k');
{
  const f = 9000;
  const r = await bench({ tones: [f], params: { tune: 3000, drive: 1, timbre: 1, mix: 1 } });
  const mag = spectrum(r.data);
  const fund = peakAt(mag, f);
  const a3 = db(peakAt(mag, fold(f * 3)), fund);
  const a4 = db(peakAt(mag, fold(f * 4)), fund);
  console.log(`  folded 3rd at ${hz(fold(f * 3))}Hz ${fmt(a3)}   folded 4th at ${hz(fold(f * 4))}Hz ${fmt(a4)}`);
  check(a3 < -40 && a4 < -40, `folded harmonics stay under -40dB — this is what oversample '4x' buys`);
  let mean = 0;
  for (const v of r.data) mean += v;
  mean /= r.data.length;
  check(Math.abs(mean) < 1e-4, `no DC from the lopsided curve — mean offset ${mean.toExponential(2)}`);
}

// -- 5. DRIVE and TIMBRE are content knobs, not volume knobs -----------------
console.log('\nDRIVE         — 4kHz in at mix 1. DRIVE has to buy harmonics without buying level:');
console.log('                uncompensated it would be 36dB of volume with a tone side-effect.');
console.log('                Both columns are dB relative to that row\'s own drive 0.');
console.log('\n                Three band levels, because the make-up is exact at ONE of them');
console.log('                (EXCITER_NOMINAL) and approximate either side. The first two are');
console.log('                where the game\'s own material sits above 3kHz; the third is a');
console.log('                SUSTAINED tone at what real tracks only reach on a transient, and');
console.log('                is here to show where the effect saturates rather than to pass.');
for (const level of [0.01, 0.05, 0.25]) {
  const rows = [];
  for (const drive of [0, 0.25, 0.5, 0.75, 1]) {
    const a = await added({ tune: 3000, drive, timbre: 0.5, mix: 1 }, { level });
    rows.push({ drive, rms: a.rms, h3: peakAt(a.mag, 12000) });
  }
  const band = rows[0].rms * Math.SQRT2;   // at drive 0 the wet leg IS the band
  console.log(`\n  band ${band.toFixed(3)}`);
  for (const r of rows) {
    console.log(`    drive ${r.drive.toFixed(2)}   added level ${fmt(db(r.rms, rows[0].rms))}`
      + `   3rd harmonic ${fmt(db(r.h3, rows[0].h3))}`);
  }
  const rise = Math.max(...rows.map((r) => db(r.rms, rows[0].rms)));
  const fall = -Math.min(...rows.map((r) => db(r.rms, rows[0].rms)));
  // Up and down are not the same failure and do not share a bar. A RISE is the make-up
  // not working — the knob is a fader again — and there is no level of material at which
  // that is acceptable. A FALL is the wet leg's fundamental being traded for its
  // harmonics, which is what a saturator does; it only fails if the effect has been
  // buried, and a sustained tone at transient level is where that legitimately happens.
  check(rise < 8, `DRIVE never turns the effect up: worst rise ${rise.toFixed(1)}dB (bar 8dB)`);
  check(fall < 20, `and never buries it: worst fall ${fall.toFixed(1)}dB (bar 20dB)`);
  const climb = db(rows[4].h3, rows[0].h3);
  check(climb > 10, `harmonics climb ${climb.toFixed(1)}dB across the travel (bar 10dB)`);
}

console.log('\nTIMBRE        — the same, across the other knob: a shape change, not a level change');
{
  const rows = [];
  for (const timbre of [0, 0.25, 0.5, 0.75, 1]) {
    const a = await added({ tune: 3000, drive: 0.5, timbre, mix: 1 });
    rows.push({ timbre, rms: a.rms });
  }
  console.log(`  ${rows.map((r) => `${r.timbre.toFixed(2)}: ${fmt(db(r.rms, rows[0].rms))}`).join('   ')}`);
  const swing = Math.max(...rows.map((r) => Math.abs(db(r.rms, rows[0].rms))));
  check(swing < 6, `added level holds within ${swing.toFixed(1)}dB across the whole travel (want under 6dB)`);
}

// -- 6. cost -----------------------------------------------------------------
console.log('\nCOST          — render time as a percentage of realtime, best of three');
{
  const base = await bench({ tones: [4000], id: null, reps: 3 });
  const one = await bench({ tones: [4000], params: {}, reps: 3 });
  const pct = ((one.ms - base.ms) / (one.seconds * 1000)) * 100;
  console.log(`  bare oscillator ${base.ms.toFixed(1)}ms   with one Exciter ${one.ms.toFixed(1)}ms`
    + `   over ${one.seconds.toFixed(1)}s of audio`);
  console.log(`\n  cost: ${pct.toFixed(2)}   <- the number for the EFFECTS entry`);
}

await browser.close();
console.log(failures ? `\n${failures} check${failures === 1 ? '' : 's'} FAILED\n` : '\nall checks passed\n');
process.exit(failures ? 1 : 0);
