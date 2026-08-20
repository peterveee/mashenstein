// Put the Doubler on the bench: is it transparent when off, and wide when on.
//
// The effect used to be a varispeed pitch shifter, and this bench used to prove the
// shift was genuine rather than a modulated delay wearing its coat. That claim is gone:
// the Doubler is now two short delays, one panned left and one right, each with a slow
// wander on it, which is what widening a mono part actually needs. So the DETUNE and
// HANDOVER sections went with the machinery they measured — there is no slide to read
// and no crossfade to pump.
//
// What is left is what the effect still claims, and every one of these can still break
// quietly:
//
//   TRANSPARENCY  at WET 0 the effect has to be free, sample for sample. Two delay
//                 lines and two looping tables are running whether or not you can hear
//                 them, so "off" must mean exactly off.
//   STEREO        a MONO tone in has to come out as two different signals, or WIDTH is
//                 a label on nothing. This is now the effect's whole purpose rather
//                 than a side effect of it, so it is the headline measurement.
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

// Long enough that the analysis window sits well clear of the oscillator's start and
// the slowest wander has come round at least once.
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

// -- 2. mono in, stereo out --------------------------------------------------
console.log('\nSTEREO        — one mono tone in: how much of the two output channels is the same signal');
{
  for (const width of [0, 0.5, 1]) {
    const r = await bench({ tones: [440, 660, 990], params: { width, wet: 1 } });
    const c = correlation(r.data[0], r.data[1]);
    console.log(`  width ${width.toFixed(2)}   channel correlation ${c.toFixed(3)}`);
    if (width === 1) check(Math.abs(c) < 0.3, `hard width leaves the channels uncorrelated (${c.toFixed(3)})`);
  }
}

// -- 3. dry and wet go where they are put ------------------------------------
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

// -- 4. two renders are one file ---------------------------------------------
console.log('\nREPEATABLE    — the same settings rendered twice');
{
  // Split by mechanism, so a failure says WHICH part drifted rather than that
  // something did: the bare oscillator is the floor Chrome itself sets, the frozen
  // pass has the tables and delay lines running with nothing sliding, and the last is
  // the whole effect at its defaults.
  const cases = [
    ['bare oscillator     ', { id: null }],
    ['tables frozen       ', { params: { depth: 0 } }],
    ['drift only          ', { params: { depth: 0.6 } }],
    ['drift, wide         ', { params: { depth: 0.6, width: 1 } }],
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

// -- 5. cost -----------------------------------------------------------------
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
