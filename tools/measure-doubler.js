// Put the Doubler on the bench: does it actually detune, and by how much.
//
// A doubler is judged by ear and diagnosed by spectrum. Its whole claim is that the
// second voice is a genuine varispeed pitch shift rather than a modulated delay wearing
// one — and the two sound similar enough on a mix that only a measurement can tell them
// apart. Six ways it can be quietly wrong:
//
//   TRANSPARENCY  at WET 0 the effect has to be free, sample for sample. Two delay
//                 lines and six looping tables are running whether or not you can hear
//                 them, so "off" must mean exactly off.
//   DETUNE        a tone in, and where each side comes back. This is the number the
//                 whole effect exists for, and the one a modulated-delay fake cannot
//                 hold: an LFO's pitch shift averages to zero over its cycle, a real
//                 slide does not. Measured off an interpolated FFT peak, per channel.
//   HANDOVER      the two taps crossfade forever; if their gains do not sum to 1 the
//                 level pumps at the grain rate. Read as the envelope ripple of a
//                 steady tone over a whole window cycle.
//   STEREO        a MONO tone in has to come out as two different signals, or WIDTH is
//                 a label on nothing. Read as the correlation between the channels.
//   REPEATABLE    two renders of the same settings, sample for sample. Anything in the
//                 catalogue that generates a buffer has to be checked for this — see
//                 the note above makeReverb about what Tone.Reverb's Math.random did to
//                 the stems and the null test.
//   COST          render time against realtime, best of three, minus a bare-oscillator
//                 baseline — the same hand method every other number in EFFECTS was
//                 measured by (see effects.js's note above ENGINE_BASE_COST).
//
// It also proves the thing nothing else catches: that the effect renders offline AT ALL.
//
// Usage: node tools/measure-doubler.js
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SR = 44100;

// Long enough that the analysis window sits well clear of the oscillator's start and a
// slow grain cycle has come round at least once at the detunes measured below.
const SECONDS = 4;

const ENTRY = `
import { createEffect } from ${JSON.stringify(join(ROOT, 'src/engine/effects.js'))};

window.__bench = async ({ sampleRate, seconds, tones, level, id, params, reps, channels }) => {
  const N = Math.ceil(seconds * sampleRate);
  const times = [];
  let data = null;
  for (let r = 0; r < reps; r++) {
    const ctx = new OfflineAudioContext(channels, N, sampleRate);
    // Mono, always: a doubler's job is to make a stereo image out of a signal that has
    // none, so handing it one already spread would measure the wrong thing.
    const sum = ctx.createGain();
    sum.gain.value = level / tones.length;
    sum.channelCount = 1; sum.channelCountMode = 'explicit';
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
    if (r === reps - 1) {
      data = [];
      for (let c = 0; c < buf.numberOfChannels; c++) data.push(Array.from(buf.getChannelData(c)));
    }
  }
  return { data, ms: Math.min(...times), seconds: N / sampleRate };
};
`;

// ---------------------------------------------------------------- analysis

// In-place iterative radix-2 FFT — the same one tools/measure-exciter.js analyses with.
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

// 65536 bins is 0.67Hz of resolution before interpolation, which matters here: a 9-cent
// shift of a 1kHz tone moves it 5.2Hz, and the peak has to be resolved rather than
// inferred. 1.5 seconds of audio, so the render has to be longer than that.
const FFT_SIZE = 65536;

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
  for (let k = 0; k < mag.length; k++) mag[k] = Math.hypot(re[k], im[k]) * (4 / FFT_SIZE);
  return mag;
}

/**
 * The frequency of the tallest component, to a fraction of a bin.
 *
 * A bin is 0.67Hz and the shifts being measured are a few Hz, so the nearest bin is not
 * good enough. Quadratic interpolation over the peak and its neighbours in dB is the
 * standard fix and is accurate to a few hundredths of a bin on a Hann window.
 */
function peakHz(mag) {
  let k = 1;
  for (let i = 1; i < mag.length - 1; i++) if (mag[i] > mag[k]) k = i;
  const l = Math.log(Math.max(mag[k - 1], 1e-30));
  const c = Math.log(Math.max(mag[k], 1e-30));
  const r = Math.log(Math.max(mag[k + 1], 1e-30));
  const d = (0.5 * (l - r)) / (l - 2 * c + r || 1e-30);
  return ((k + d) / FFT_SIZE) * SR;
}

const cents = (f, ref) => 1200 * Math.log2(f / ref);

/**
 * Peak-to-peak swing of the level, in dB — a pump the crossfade let through.
 *
 * Block RMS rather than block peak, over 50ms: long enough that the beating between
 * the test tones averages out, short enough to resolve a handover that lasts about
 * 130ms at the detune this is measured at.
 */
function envelopeRipple(data) {
  const block = Math.round(SR * 0.05);
  const skip = Math.round(SR * 0.25);          // past the first fade-in
  let lo = Infinity;
  let hi = 0;
  for (let i = skip; i + block < data.length - skip; i += block) {
    let energy = 0;
    for (let j = 0; j < block; j++) energy += data[i + j] * data[i + j];
    const rms = Math.sqrt(energy / block);
    if (rms > hi) hi = rms;
    if (rms < lo) lo = rms;
  }
  return 20 * Math.log10(hi / Math.max(lo, 1e-12));
}

/** Pearson correlation between two channels — 1 is the same signal, 0 is two of them. */
function correlation(a, b) {
  let sa = 0;
  let sb = 0;
  let sab = 0;
  for (let i = 0; i < a.length; i++) { sa += a[i] * a[i]; sb += b[i] * b[i]; sab += a[i] * b[i]; }
  return sab / Math.max(1e-12, Math.sqrt(sa * sb));
}

const fmt = (v) => (Number.isFinite(v) ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}` : ' -inf');

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

async function bench({ tones, level = 0.5, id = 'doubler', params = {}, reps = 1, channels = 2 }) {
  try {
    return await page.evaluate(
      (a) => window.__bench(a),
      { sampleRate: SR, seconds: SECONDS, tones, level, id, params, reps, channels },
    );
  } catch (err) {
    throw new Error(`offline render failed: ${err.message}`
      + (errors.length ? `\n  page errors: ${errors.join('; ')}` : ''));
  }
}

let failures = 0;
const check = (ok, line) => { if (!ok) failures++; console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${line}`); };

// -- 1. renders at all, and WET 0 is exactly transparent ----------------------
console.log('\nTRANSPARENCY  — the effect in circuit at wet 0 against no effect at all');
{
  const dry = await bench({ tones: [1000], id: null, channels: 1 });
  const off = await bench({ tones: [1000], params: { wet: 0 }, channels: 1 });
  let worst = 0;
  let energy = 0;
  for (let i = 0; i < dry.data[0].length; i++) {
    worst = Math.max(worst, Math.abs(dry.data[0][i] - off.data[0][i]));
    energy += off.data[0][i] * off.data[0][i];
  }
  const rms = Math.sqrt(energy / off.data[0].length);
  check(rms > 1e-4, `renders offline — output rms ${rms.toExponential(2)} (a silent render is the bug this catches)`);
  // The null test's own tolerance: an insert sitting at wet 0 has to be free.
  check(worst < 5e-6, `wet 0 is transparent — worst sample difference ${worst.toExponential(2)} (tolerance 5e-6)`);
}

// -- 2. the detune, per side -------------------------------------------------
console.log('\nDETUNE        — 960Hz in, wet 1, hard width, no modulation. Left is the down voice, right the up');
{
  // 960 and not a round 1000, for a reason about the measurement rather than the
  // effect: the two taps sit exactly half a window — 12.5ms — apart, so they comb with
  // nulls every 80Hz, and a tone sitting in one comes back amplitude-modulated at the
  // grain rate. The sidebands that puts either side of the peak are a fraction of a bin
  // away at these detunes and drag an interpolated peak off with them. 960 is a multiple
  // of 80, so the taps are in phase, the level is flat, and what is left to read is the
  // pitch. (The same run on 1000Hz reads 2 cents out at 50ct — the tone is wrong there,
  // not the detune.)
  const f = 960;
  for (const want of [0, 5, 9, 20, 50]) {
    const r = await bench({
      tones: [f],
      params: { detune: want, width: 1, depth: 0, wet: 1, delayMs: 18 },
    });
    const lo = cents(peakHz(spectrum(r.data[0])), f);
    const hi = cents(peakHz(spectrum(r.data[1])), f);
    const err = Math.max(Math.abs(lo + want), Math.abs(hi - want));
    console.log(`  detune ${String(want).padStart(2)}ct   left ${fmt(lo)}ct   right ${fmt(hi)}ct`
      + `   worst error ${err.toFixed(2)}ct`);
    // A cent is the resolution of the control itself; half of one is under the
    // just-noticeable difference for a held tone, let alone a mix.
    check(err < 0.5, `both voices land within ${err.toFixed(2)} cents of the dial`);
  }
}

// -- 3. the crossfade hands over without pumping -----------------------------
console.log('\nHANDOVER      — a spread of tones through several grain cycles at full detune, one voice only');
{
  // Broadband on purpose, and worth being explicit about why: where the two taps
  // overlap they are the same signal half a window apart, so they COMB — and a single
  // held tone can sit exactly in a notch and read as a total null that says nothing
  // about the level. Every time-domain shifter does this, including Tone.PitchShift.
  // Across a spread of inharmonic tones the notches land in different places at
  // different moments and the SUM is the thing a listener hears.
  //
  // Width 1 puts the up voice alone in the right channel, so this reads ONE detuner's
  // crossfade rather than two voices beating against each other. 50 cents brings the
  // grain round about once a second, so a 4s render covers several handovers.
  const tones = [311, 440, 587, 831, 1109, 1523, 2093, 2794];
  const r = await bench({ tones, params: { detune: 50, width: 1, depth: 0, wet: 1 } });
  const ripple = envelopeRipple(r.data[1]);
  console.log(`  level moves ${ripple.toFixed(2)}dB peak to peak across the render`);
  check(ripple < 1.5, 'the two taps sum flat through the handover (want under 1.5dB)');
}

// -- 4. mono in, stereo out --------------------------------------------------
console.log('\nSTEREO        — one mono tone in: how much of the two output channels is the same signal');
{
  for (const width of [0, 0.5, 1]) {
    const r = await bench({ tones: [440, 660, 990], params: { width, wet: 1 } });
    const c = correlation(r.data[0], r.data[1]);
    console.log(`  width ${width.toFixed(2)}   channel correlation ${c.toFixed(3)}`);
    if (width === 1) check(Math.abs(c) < 0.3, `hard width leaves the channels uncorrelated (${c.toFixed(3)})`);
  }
}

// -- 5. dry and wet go where they are put ------------------------------------
console.log('\nPLACEMENT     — dry hard left against the doubles hard right: the oldest trick in the book');
{
  const params = { dryPan: -1, wetPan: 1, width: 0, wet: 0.5 };
  const r = await bench({ tones: [440, 660, 990], params });
  const bare = await bench({ tones: [440, 660, 990], id: null, channels: 1 });
  // Left should be the dry alone, at the crossfade's dry gain and nothing else on it.
  const gain = Math.cos((0.5 * Math.PI) / 2);
  let worst = 0;
  let wetEnergy = 0;
  let dryEnergy = 0;
  for (let i = 0; i < bare.data[0].length; i++) {
    worst = Math.max(worst, Math.abs(r.data[0][i] - bare.data[0][i] * gain));
    wetEnergy += r.data[1][i] * r.data[1][i];
    dryEnergy += r.data[0][i] * r.data[0][i];
  }
  console.log(`  left rms ${Math.sqrt(dryEnergy / bare.data[0].length).toFixed(4)}`
    + `   right rms ${Math.sqrt(wetEnergy / bare.data[0].length).toFixed(4)}`);
  check(worst < 5e-6, `nothing but the dry in the left channel — worst leak ${worst.toExponential(2)}`);
  check(Math.sqrt(wetEnergy / bare.data[0].length) > 0.05, 'and the doubles are all in the right');
}

// -- 6. two renders are one file ---------------------------------------------
console.log('\nREPEATABLE    — the same settings rendered twice');
{
  // Split by mechanism, so a failure says WHICH part drifted rather than that
  // something did: the bare oscillator is the floor Chrome itself sets, the frozen
  // pass has the tables and delay lines running with nothing sliding, and the last is
  // the whole effect at its defaults.
  const cases = [
    ['bare oscillator     ', { id: null }],
    ['tables frozen       ', { params: { detune: 0, depth: 0 } }],
    ['detune only         ', { params: { depth: 0 } }],
    ['drift only          ', { params: { detune: 0 } }],
    ['everything moving   ', { params: {} }],
  ];
  for (const [label, opts] of cases) {
    const a = await bench({ tones: [440, 660], ...opts });
    const b = await bench({ tones: [440, 660], ...opts });
    let worst = 0;
    let at = 0;
    for (let c = 0; c < a.data.length; c++) {
      for (let i = 0; i < a.data[c].length; i++) {
        const d = Math.abs(a.data[c][i] - b.data[c][i]);
        if (d > worst) { worst = d; at = i; }
      }
    }
    check(worst < 5e-6, `${label} worst difference ${worst.toExponential(2)}`
      + ` at ${(at / SR).toFixed(2)}s`);
  }
  // Four renders of the defaults against the first, so a failure above can say whether
  // Chrome settles after a warm-up render or genuinely differs every time.
  const first = await bench({ tones: [440, 660], params: {} });
  const spread = [];
  for (let k = 0; k < 3; k++) {
    const next = await bench({ tones: [440, 660], params: {} });
    let worst = 0;
    for (let c = 0; c < first.data.length; c++) {
      for (let i = 0; i < first.data[c].length; i++) {
        worst = Math.max(worst, Math.abs(first.data[c][i] - next.data[c][i]));
      }
    }
    spread.push(worst.toExponential(2));
  }
  console.log(`  renders 2-4 against render 1: ${spread.join('  ')}`);
}

// -- 7. cost -----------------------------------------------------------------
console.log('\nCOST          — render time as a percentage of realtime, best of three');
{
  const base = await bench({ tones: [1000], id: null, reps: 3 });
  const one = await bench({ tones: [1000], params: {}, reps: 3 });
  const pct = ((one.ms - base.ms) / (one.seconds * 1000)) * 100;
  console.log(`  bare oscillator ${base.ms.toFixed(1)}ms   with one Doubler ${one.ms.toFixed(1)}ms`
    + `   over ${one.seconds.toFixed(1)}s of audio`);
  console.log(`\n  cost: ${pct.toFixed(2)}   <- the number for the EFFECTS entry`);
}

await browser.close();
console.log(failures ? `\n${failures} check${failures === 1 ? '' : 's'} FAILED\n` : '\nall checks passed\n');
process.exit(failures ? 1 : 0);
