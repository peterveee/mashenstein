// THE STEREO WIDENER — ONE WIDTH, MEASURED OFF THE SAMPLES.
//
// The widener in src/engine/effects.js: midAtUnity leaves the middle alone, WIDTH scales the
// sides by 2·WIDTH, and past 0.5 madeSide adds a side made from the middle at 2·WIDTH − 1,
// so a mono sound, which has no sides to scale, widens too. Rendered in Chromium through an
// OfflineAudioContext; a mono sound arrives as two identical channels, which is what a mono
// patch is by the time it reaches an insert.
//
//   1. 0.5 IS THE SOUND AS IT IS, and at or under it the made side is not even built: a
//      widener that only narrows costs what it always did. Under it, sides narrow by 2·WIDTH.
//   2. PAST 0.5 A MONO SOUND COMES OUT WIDE, at 2·WIDTH − 1 of its middle, and SUMMED TO MONO
//      IT IS THE DRY SOUND, to float precision: the made side cancels in L + R.
//   3. THE BASS STAYS IN THE MIDDLE, under the made side's 300Hz low cut.
//   4. A STEREO SOUND'S OWN SIDES are scaled by 2·WIDTH either way.
//   5. THE DESK CAN REACH IT LIVE. WIDTH turned past 0.5 on a widener built at 0.5 — now, at
//      an audio time, or by a SWEEP across a section — builds it then, and the made side
//      follows WIDTH as it moves.
//   6. WET AND MONO SPREAD ARE RETIRED. Left in an old save, or sent live, they reach nothing.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = `
import * as Tone from 'tone';
import { createEffect } from ${JSON.stringify(join(ROOT, 'src/engine/effects.js'))};
window.__Tone = Tone;
window.__createEffect = createEffect;
`;

let failed = false;
const assert = (cond, msg) => {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
};

const { chromium } = require('playwright');
const esbuild = require('esbuild');
const built = await esbuild.build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
  bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
});
const html = '<!doctype html><meta charset="utf-8">'
  + `<script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}<\/script>`;
const browser = await chromium.launch({ headless: true, args: ['--mute-audio'] });
const errors = [];
const page = await browser.newPage();
page.on('pageerror', (e) => errors.push(e.message));
await page.route('**/*', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: html }));
await page.goto('https://mashenstein.render/', { waitUntil: 'load' });

const got = await page.evaluate(async () => {
  const SR = 44100;
  const SEC = 2;
  const Tone = window.__Tone;
  const rng = (seed) => () => (((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1);
  // A mono sound is one signal on both channels; a stereo one has an independent side too.
  const mono = (sig) => (i, t) => { const v = sig(i, t); return [v, v]; };
  const noise = () => { const r = rng(7); return () => 0.25 * r(); };
  const bass = () => (i, t) => 0.3 * Math.sin(2 * Math.PI * 80 * t);
  const stereo = () => { const m = rng(7); const sd = rng(11); return () => { const a = 0.2 * m(); const b = 0.1 * sd(); return [a + b, a - b]; }; };
  const run = async (make, params, after) => {
    const ctx = new OfflineAudioContext(2, SR * SEC, SR);
    Tone.setContext(ctx);
    const buf = ctx.createBuffer(2, SR * SEC, SR);
    const xl = buf.getChannelData(0);
    const xr = buf.getChannelData(1);
    const sig = make();
    for (let i = 0; i < xl.length; i++) [xl[i], xr[i]] = sig(i, i / SR);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const link = window.__createEffect('widener', params, ctx, 120);
    Tone.connect(src, link.node);
    Tone.connect(link.node, ctx.destination);
    // Asking for 0.5 builds nothing, so this only reports whether it already is.
    const builtAtStart = !!link.node._madeFor?.(0.5);
    if (after) after(link);
    src.start(0);
    const r = await ctx.startRendering();
    const L = r.getChannelData(0);
    const R = r.getChannelData(1);
    // Seconds [a, b), clear of the 12ms the made side takes to arrive. Side and middle in dB
    // against the dry middle; monoErr how far L + R is from the dry L + R.
    const win = (a, b) => {
      let side = 0; let mid = 0; let dryMid = 0; let drySide = 0; let monoErr = 0;
      for (let i = Math.floor(a * SR); i < Math.floor(b * SR); i++) {
        const s = (L[i] - R[i]) / 2;
        const m = (L[i] + R[i]) / 2;
        const dm = (xl[i] + xr[i]) / 2;
        const ds = (xl[i] - xr[i]) / 2;
        side += s * s; mid += m * m; dryMid += dm * dm; drySide += ds * ds;
        monoErr = Math.max(monoErr, Math.abs(m - dm));
      }
      const db = (v, ref) => (v > 0 ? 10 * Math.log10(v / ref) : -Infinity);
      return { sideDb: db(side, dryMid), sideMoveDb: db(side, drySide), midDb: db(mid, dryMid), monoErr };
    };
    return { builtAtStart, early: win(0.25, 0.95), late: win(1.25, 1.95), sweepEarly: win(0.2, 0.5), sweepLate: win(1.6, 1.95) };
  };
  return {
    half: await run(() => mono(noise()), { width: 0.5 }),
    narrow: await run(stereo, { width: 0.25 }),
    squeezed: await run(stereo, { width: 0 }),
    at06: await run(() => mono(noise()), { width: 0.6 }),
    at075: await run(() => mono(noise()), { width: 0.75 }),
    at1: await run(() => mono(noise()), { width: 1 }),
    bass: await run(() => mono(bass()), { width: 1 }),
    stereoDry: await run(stereo, { width: 0.5 }),
    stereoWide: await run(stereo, { width: 1 }),
    live: await run(() => mono(noise()), { width: 0.5 }, (l) => l.set({ width: 0.75 })),
    later: await run(() => mono(noise()), { width: 0.5 }, (l) => l.setAt({ width: 0.75 }, 1.0, 0)),
    swept: await run(() => mono(noise()), { width: 0.5, sweep: 1, widthTo: 1 }, (l) => l.engage(0, 0.125, 2.0, 0)),
    staleSave: await run(() => mono(noise()), { width: 0.5, wet: 0.5, monoSpread: 1 }),
    staleLive: await run(() => mono(noise()), { width: 0.75 }, (l) => { l.set({ wet: 0.5, monoSpread: 0 }); l.setAt({ wet: 0, monoSpread: 1 }, 1.0, 0); }),
  };
});
await browser.close();

const f = (v) => (Number.isFinite(v) ? v.toFixed(1) : String(v));
const EXACT = 1e-6;
// White noise loses 1.4% of itself under the 300Hz cut: -0.06dB.
const madeDb = (w) => 20 * Math.log10(2 * w - 1) - 0.06;

// 1.
assert(!got.half.builtAtStart && got.half.late.sideDb === -Infinity && got.half.late.monoErr < EXACT,
  `at 0.5 nothing is built and a mono sound comes through exact (err ${got.half.late.monoErr.toExponential(1)})`);
assert(!got.narrow.builtAtStart && Math.abs(got.narrow.late.sideMoveDb - 20 * Math.log10(0.5)) < 0.05
  && got.narrow.late.monoErr < EXACT,
  `under it a stereo sound's sides narrow by 2 × WIDTH (${got.narrow.late.sideMoveDb.toFixed(2)} dB at 0.25), the middle untouched`);
assert(got.squeezed.late.sideDb === -Infinity && got.squeezed.late.monoErr < EXACT, 'and 0 is mono, at unity');

// 2.
const widths = [[0.6, got.at06], [0.75, got.at075], [1, got.at1]];
assert(widths.every(([w, r]) => r.builtAtStart && Math.abs(r.late.sideDb - madeDb(w)) < 0.3),
  `past 0.5 a mono sound comes out wide at 2 × WIDTH − 1 of its middle (side ${widths.map(([, r]) => f(r.late.sideDb)).join(', ')} dB at 0.6, 0.75, 1; want ${widths.map(([w]) => f(madeDb(w))).join(', ')})`);
const worst = Math.max(...widths.map(([, r]) => r.late.monoErr));
assert(worst < EXACT, `and summed to mono it is the dry sound (worst err ${worst.toExponential(1)})`);

// 3.
assert(got.bass.late.sideDb < -15 && got.bass.late.monoErr < EXACT,
  `an 80Hz sine stays in the middle at 1 (side ${f(got.bass.late.sideDb)} dB)`);

// 4.
const own = got.stereoWide.late.sideMoveDb;
const wantOwn = 10 * Math.log10(4 + 10 ** (madeDb(1) / 10) * (10 ** (-got.stereoDry.late.sideDb / 10)));
assert(Math.abs(got.stereoDry.late.sideMoveDb) < 0.01 && Math.abs(own - wantOwn) < 0.3,
  `a stereo sound's sides are doubled at 1, with the made side on top (${own.toFixed(2)} dB, want ${wantOwn.toFixed(2)})`);

// 5.
assert(!got.live.builtAtStart && Math.abs(got.live.late.sideDb - got.at075.late.sideDb) < 0.3,
  `WIDTH turned past 0.5 live builds the made side (${f(got.live.late.sideDb)} dB at 0.75, as saved: ${f(got.at075.late.sideDb)})`);
assert(got.later.early.sideDb === -Infinity && Math.abs(got.later.late.sideDb - got.at075.late.sideDb) < 0.3,
  `scheduled for 1.0s, it is the sound as it was before and wide after (${f(got.later.late.sideDb)} dB)`);
assert(got.swept.builtAtStart && got.swept.sweepLate.sideDb > got.swept.sweepEarly.sideDb + 10
  && got.swept.sweepLate.monoErr < EXACT,
  `a SWEEP from 0.5 to 1 opens a mono sound out across its section (${f(got.swept.sweepEarly.sideDb)} → ${f(got.swept.sweepLate.sideDb)} dB)`);

// 6.
assert(got.staleSave.late.sideDb === -Infinity && got.staleSave.late.monoErr < EXACT,
  'a WET 0.5 and a MONO SPREAD 1 left in a save do nothing at WIDTH 0.5');
assert(Math.abs(got.staleLive.early.sideDb - got.at075.early.sideDb) < 0.05
  && Math.abs(got.staleLive.late.sideDb - got.at075.late.sideDb) < 0.05,
  `and sent live, now or at an audio time, change nothing (${f(got.staleLive.late.sideDb)} against ${f(got.at075.late.sideDb)} dB)`);

assert(!errors.length, `no page errors${errors.length ? `: ${errors.join('; ')}` : ''}`);
console.log(failed ? '\nSTEREO WIDENER: FAILED' : '\nSTEREO WIDENER: PASSED');
process.exit(failed ? 1 : 0);
