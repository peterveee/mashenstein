/*
 * The automation timeline against a real AudioParam — docs/MRDR-3-worklet-spec.md §3.2.
 *
 * §3.2 asks the engine's envelope builders to be reused rather than re-derived, so that
 * envelope SHAPE cannot be a source of A/B difference between the two backends. That is
 * only true if the thing they write into evaluates automation the way an AudioParam does.
 * This measures it, rather than assuming it.
 *
 * The comparison is direct and leaves nowhere to hide: a ConstantSource at 1 through a
 * GainNode whose gain carries the automation makes the rendered output BE the parameter's
 * value, one sample per frame. Any disagreement is a disagreement about the rules.
 *
 * The boundary cases are the list §3.2 names, and every one of them is a real situation in
 * this engine rather than a theoretical edge: two events on one frame is how "hold, then
 * ramp from here" is spelled; a ramp whose endpoints quantise together is a zero-length
 * attack at a high sample rate; cancel-mid-stage is the mono choke; an exponential to zero
 * is what the -120 dB sustain floor exists to prevent; and note-off on the note-on frame
 * is a zero-length note, which the sequencer can and does produce.
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const ENTRY = `
import { MRDR3_PARAMS_SOURCE } from ${JSON.stringify(join(ROOT, 'src/engine/mrdr3/params.js'))};
const Mrdr3Param = new Function(MRDR3_PARAMS_SOURCE + '; return Mrdr3Param;')();

const SR = 44100;
const N = 2048;

/**
 * Run one automation script through a real AudioParam and through the timeline.
 *
 * Ops carry SECONDS, because that is what the engine's builders write; the timeline gets
 * them converted to integer frames at what would be the controller boundary, once.
 */
window.__compare = async ({ initial, ops }) => {
  const ctx = new OfflineAudioContext(1, N, SR);
  const src = ctx.createConstantSource();
  src.offset.value = 1;
  const g = ctx.createGain();
  g.gain.value = initial;
  for (const op of ops) {
    if (op.k === 'set') g.gain.setValueAtTime(op.v, op.t);
    else if (op.k === 'lin') g.gain.linearRampToValueAtTime(op.v, op.t);
    else if (op.k === 'exp') g.gain.exponentialRampToValueAtTime(op.v, op.t);
    else if (op.k === 'target') g.gain.setTargetAtTime(op.v, op.t, op.tau);
    else if (op.k === 'cancel') g.gain.cancelScheduledValues(op.t);
    else if (op.k === 'hold') g.gain.cancelAndHoldAtTime(op.t);
  }
  src.connect(g); g.connect(ctx.destination);
  src.start();
  const native = Array.from((await ctx.startRendering()).getChannelData(0));

  const p = new Mrdr3Param(initial);
  // NOT rounded. An AudioParam schedules at exact times, and the timeline now keeps
  // float frames for exactly that reason (see src/engine/mrdr3/params.js). Rounding here
  // would re-introduce the half-sample error the timeline was fixed to avoid, and the
  // suite would be measuring the harness.
  const F = (t) => t * SR;
  for (const op of ops) {
    if (op.k === 'set') p.setValueAtTime(op.v, F(op.t));
    else if (op.k === 'lin') p.linearRampToValueAtTime(op.v, F(op.t));
    else if (op.k === 'exp') p.exponentialRampToValueAtTime(op.v, F(op.t));
    else if (op.k === 'target') p.setTargetAtTime(op.v, F(op.t), op.tau * SR);
    else if (op.k === 'cancel') p.cancelScheduledValues(F(op.t));
    else if (op.k === 'hold') p.cancelAndHoldAtTime(F(op.t));
  }
  const ported = new Array(N);
  for (let i = 0; i < N; i++) ported[i] = p.valueAt(i);
  return { native, ported };
};

/** The modulation-input rule: computed = automation + sum of inputs. */
window.__modulated = async ({ initial, ops, mod }) => {
  const ctx = new OfflineAudioContext(1, N, SR);
  const src = ctx.createConstantSource();
  src.offset.value = 1;
  const g = ctx.createGain();
  g.gain.value = initial;
  for (const op of ops) {
    if (op.k === 'set') g.gain.setValueAtTime(op.v, op.t);
    else if (op.k === 'lin') g.gain.linearRampToValueAtTime(op.v, op.t);
  }
  // A second ConstantSource wired INTO the param is what an LFO or a vibrato gain is.
  const into = ctx.createConstantSource();
  into.offset.value = mod;
  into.connect(g.gain);
  into.start();
  src.connect(g); g.connect(ctx.destination);
  src.start();
  const native = Array.from((await ctx.startRendering()).getChannelData(0));

  const p = new Mrdr3Param(initial);
  // NOT rounded. An AudioParam schedules at exact times, and the timeline now keeps
  // float frames for exactly that reason (see src/engine/mrdr3/params.js). Rounding here
  // would re-introduce the half-sample error the timeline was fixed to avoid, and the
  // suite would be measuring the harness.
  const F = (t) => t * SR;
  for (const op of ops) {
    if (op.k === 'set') p.setValueAtTime(op.v, F(op.t));
    else if (op.k === 'lin') p.linearRampToValueAtTime(op.v, F(op.t));
  }
  p.mod = mod;
  const ported = new Array(N);
  for (let i = 0; i < N; i++) ported[i] = p.computedAt(i);
  return { native, ported };
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
/**
 * WHERE the two disagree, not just by how much.
 *
 * A max error is a number you can stare at; the first divergent sample and the values on
 * either side of it name the rule being broken. Worth carrying permanently — every one of
 * this suite's real findings was diagnosed from this line rather than from the magnitude.
 */
const firstDiff = (a, b, tol) => {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (Math.abs(a[i] - b[i]) > tol) {
      return ` first at sample ${i} (t=${(i / 44100).toFixed(6)}s):`
        + ` native ${a[i].toFixed(6)} vs ported ${b[i].toFixed(6)}`;
    }
  }
  return '';
};
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
await page.goto('https://mrdr3-params.test/', { waitUntil: 'load' });

const S = 1 / 44100;
const CASES = [
  ['a plain ADSR, the shape every layer gain draws', {
    initial: 1e-4,
    ops: [
      { k: 'set', v: 1e-4, t: 0 },
      { k: 'exp', v: 0.8, t: 0.005 },
      { k: 'exp', v: 0.4, t: 0.03 },
      { k: 'exp', v: 1e-4, t: 0.06 },
    ],
  }],
  ['a linear attack — `attackCurve: lin`', {
    initial: 0,
    ops: [{ k: 'set', v: 0, t: 0 }, { k: 'lin', v: 1, t: 0.01 }, { k: 'lin', v: 0.2, t: 0.03 }],
  }],
  ['TWO EVENTS ON ONE FRAME — how "hold, then ramp from here" is spelled', {
    initial: 0.5,
    ops: [
      { k: 'set', v: 0.5, t: 0.01 },
      { k: 'set', v: 0.9, t: 0.01 },
      { k: 'lin', v: 0.1, t: 0.03 },
    ],
  }],
  ['a ramp whose endpoints QUANTISE TO ONE FRAME — a zero-length attack', {
    initial: 0.25,
    ops: [{ k: 'set', v: 0.25, t: 0.01 }, { k: 'lin', v: 0.75, t: 0.01 + S * 0.4 }],
  }],
  ['setTarget — the 8ms filter slew a live pot drag writes', {
    initial: 0.2,
    ops: [{ k: 'set', v: 0.2, t: 0.005 }, { k: 'target', v: 0.9, t: 0.01, tau: 0.008 }],
  }],
  ['cancel DURING the attack — the mono choke at its worst moment', {
    initial: 1e-4,
    ops: [
      { k: 'set', v: 1e-4, t: 0 }, { k: 'exp', v: 1, t: 0.04 },
      { k: 'hold', t: 0.02 }, { k: 'lin', v: 0, t: 0.025 },
    ],
  }],
  ['cancel during the DECAY', {
    initial: 1e-4,
    ops: [
      { k: 'set', v: 1e-4, t: 0 }, { k: 'exp', v: 1, t: 0.005 }, { k: 'exp', v: 0.3, t: 0.05 },
      { k: 'hold', t: 0.02 }, { k: 'lin', v: 0, t: 0.03 },
    ],
  }],
  ['cancel during SUSTAIN', {
    initial: 0.5,
    ops: [{ k: 'set', v: 0.5, t: 0.005 }, { k: 'hold', t: 0.02 }, { k: 'lin', v: 0, t: 0.026 }],
  }],
  ['cancelScheduledValues, which drops the future outright', {
    initial: 0.4,
    ops: [
      { k: 'set', v: 0.4, t: 0.005 }, { k: 'lin', v: 1, t: 0.04 },
      { k: 'cancel', t: 0.02 },
    ],
  }],
  ['an exponential toward the -120dB floor, which is why the floor exists', {
    initial: 1,
    ops: [{ k: 'set', v: 1, t: 0 }, { k: 'exp', v: 1e-6, t: 0.04 }],
  }],
  ['a note-off ON the note-on frame — a zero-length note', {
    initial: 1e-4,
    ops: [
      { k: 'set', v: 1e-4, t: 0.01 }, { k: 'exp', v: 0.9, t: 0.01 },
      { k: 'exp', v: 1e-4, t: 0.02 },
    ],
  }],
  ['a LEGATO retarget, then a release from wherever it got to', {
    initial: 1e-4,
    ops: [
      { k: 'set', v: 1e-4, t: 0 }, { k: 'exp', v: 0.8, t: 0.01 },
      { k: 'hold', t: 0.015 }, { k: 'exp', v: 0.55, t: 0.03 },
      { k: 'hold', t: 0.04 }, { k: 'exp', v: 1e-4, t: 0.06 },
    ],
  }],
];

console.log('The timeline against a real AudioParam — 2048 frames at 44.1k.\n');
let worst = 0;
for (const [label, script] of CASES) {
  const { native, ported } = await page.evaluate((a) => window.__compare(a), script);
  const err = maxErr(native, ported);
  worst = Math.max(worst, err);
  // Float32 output holds about 6e-8 near unity, so that is the floor any correct port can
  // reach. Anything above it is a rule the two do not agree on.
  assert(err < 1e-6, `${label} — max error ${e(err)}${err >= 1e-6 ? firstDiff(native, ported, 1e-6) : ''}`);
}
console.log(`\n  worst across ${CASES.length} scripts: ${e(worst)}`);

const mod = await page.evaluate((a) => window.__modulated(a), {
  initial: 0.2,
  ops: [{ k: 'set', v: 0.2, t: 0.005 }, { k: 'lin', v: 0.6, t: 0.03 }],
  mod: 0.25,
});
const modErr = maxErr(mod.native, mod.ported);
assert(modErr < 1e-6,
  `computed = automation + summed input, the rule vibrato and the LFO rely on (${e(modErr)})`
  + `${modErr >= 1e-6 ? firstDiff(mod.native, mod.ported, 1e-6) : ''}`);

await browser.close();
console.log(failed
  ? `\nMRDR-3 PARAMS: ${failed} FAILED — the envelope builders cannot be shared after all`
  : '\nMRDR-3 PARAMS: OK');
process.exit(failed ? 1 : 0);
