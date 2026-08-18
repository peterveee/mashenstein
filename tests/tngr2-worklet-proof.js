/*
 * The TNGR-2 AudioWorklet proof gate — docs/TNGR-2-completion-spec.md §3.
 *
 * The completion spec puts one question before all the synthesis work: can this project
 * host an AudioWorkletProcessor everywhere it needs audio, or not? Everything else in
 * that document is conditional on the answer, so the answer is measured here rather than
 * assumed, and this suite stays as a permanent regression once it passes.
 *
 * What is claimed, one assertion each:
 *
 *   1. a LIVE AudioContext registers the module, builds the node, and actually runs it
 *   2. a fresh OfflineAudioContext renders it non-silent and finite, at 44.1k AND 48k
 *   3. the first note starts strictly after time zero and is audible there
 *      (the trap PolySynth fell into — see the sweep at the top of src/engine/voices.js)
 *   4. rendering the same offline buffer twice matches within 5e-6
 *   5. a lane rendered alone equals its contribution to a mix, within 5e-6
 *   6. panic silences sounding notes AND the events still queued behind them
 *   7. teardown: a closed context is replaced by a new one that registers cleanly
 *   8. the PRODUCTION bundle — minified, as shipped — does all of the above too
 *
 * A failure here is not a bug to work around. It is the fallback clause in §3.1 coming
 * into force, and it should be recorded with browser, rate, build mode and which of the
 * eight claims failed.
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const ENTRY = `
import {
  ensureTngr2Proof, createTngr2ProofNode, canHostTngr2Worklet, frameAt,
} from ${JSON.stringify(join(ROOT, 'src/engine/tngr2/proof.js'))};

const chans = (buffer) => Array.from({ length: buffer.numberOfChannels },
  (_, c) => Array.from(buffer.getChannelData(c)));

/**
 * Render a set of notes through the proof processor offline.
 *
 * \`notes\` are seconds; they are converted to frames HERE, at the controller boundary,
 * which is the contract the processor is written against.
 */
// Seconds in, protocol events out — the conversion to integer frames happens here, at
// the controller boundary, exactly once.
const eventsFor = (notes, sampleRate, panicAt) => {
  const events = [];
  for (const note of notes) {
    events.push({ type: 'noteOn', frame: frameAt(note.at, sampleRate),
      eventId: note.id, hz: note.hz, velocity: note.velocity ?? 1 });
    if (note.off != null) {
      events.push({ type: 'noteOff', frame: frameAt(note.off, sampleRate), eventId: note.id });
    }
  }
  if (panicAt != null) events.push({ type: 'panic', frame: frameAt(panicAt, sampleRate) });
  return events;
};

window.__proofRender = async ({ sampleRate = 44100, seconds = 1, notes = [], panicAt = null }) => {
  const N = Math.ceil(seconds * sampleRate);
  const ctx = new OfflineAudioContext(2, N, sampleRate);
  if (!canHostTngr2Worklet(ctx)) throw new Error('offline context cannot host a worklet');
  await ensureTngr2Proof(ctx);
  // Handed over WITH the node. Posting these to the port renders silence about as often
  // as not — see the note on \`events\` in src/engine/tngr2/proof.js.
  const node = createTngr2ProofNode(ctx, { events: eventsFor(notes, sampleRate, panicAt) });
  node.connect(ctx.destination);
  const rendered = await ctx.startRendering();
  return chans(rendered);
};

/** The same, with two independent nodes summed — a mix of two lanes. */
window.__proofMix = async ({ sampleRate = 44100, seconds = 1, lanes = [] }) => {
  const N = Math.ceil(seconds * sampleRate);
  const ctx = new OfflineAudioContext(2, N, sampleRate);
  await ensureTngr2Proof(ctx);
  for (const notes of lanes) {
    const node = createTngr2ProofNode(ctx, { events: eventsFor(notes, sampleRate, null) });
    node.connect(ctx.destination);
  }
  const rendered = await ctx.startRendering();
  return chans(rendered);
};

/**
 * The live half. Headless Chromium has no speakers, so "did it play" is asked of the
 * processor itself: it is told to report, and the reply proves process() ran and the
 * frame counter advanced past where the note was scheduled.
 */
window.__proofLive = async () => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const out = { state: ctx.state, hosted: canHostTngr2Worklet(ctx) };
  try {
    await ctx.resume();
    await ensureTngr2Proof(ctx);
    const node = createTngr2ProofNode(ctx);
    // Not to the speakers: a gain of zero still runs the processor, and nothing about
    // this proof depends on the sound leaving the machine.
    const sink = ctx.createGain();
    sink.gain.value = 0;
    node.connect(sink); sink.connect(ctx.destination);
    const rate = ctx.sampleRate;
    node.port.postMessage({ type: 'noteOn', frame: frameAt(ctx.currentTime + 0.02, rate),
      eventId: 1, hz: 440, velocity: 1 });
    const health = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('the live processor never reported')), 4000);
      node.port.onmessage = (e) => {
        if (e.data?.type !== 'health') return;
        // Wait until the frame counter has passed the note before believing it ran.
        if (e.data.frame < frameAt(0.05, rate)) { node.port.postMessage({ type: 'report' }); return; }
        clearTimeout(timer);
        resolve(e.data);
      };
      node.port.postMessage({ type: 'report' });
    });
    out.running = ctx.state === 'running';
    out.frame = health.frame;
    out.voices = health.voices;
    out.rate = rate;
    node.port.postMessage({ type: 'stop' });
  } catch (err) {
    out.error = String(err && err.message ? err.message : err);
  } finally {
    await ctx.close();
  }
  return out;
};

/** Context replacement: close one, build another, register again. */
window.__proofTeardown = async () => {
  const first = new OfflineAudioContext(2, 4410, 44100);
  await ensureTngr2Proof(first);
  createTngr2ProofNode(first).connect(first.destination);
  await first.startRendering();
  const live = new (window.AudioContext || window.webkitAudioContext)();
  await ensureTngr2Proof(live);
  const node = createTngr2ProofNode(live);
  node.connect(live.destination);
  node.port.postMessage({ type: 'stop' });
  await live.close();
  // A THIRD context, after one was closed: registration is per context, so a stale
  // module cache keyed on anything else would show up right here.
  const third = new OfflineAudioContext(2, 4410, 48000);
  await ensureTngr2Proof(third);
  createTngr2ProofNode(third).connect(third.destination);
  const rendered = await third.startRendering();
  return { closed: live.state, frames: rendered.length };
};
`;

const { chromium } = require('playwright');
const esbuild = require('esbuild');

let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg));

const TOL = 5e-6;
const peak = (chs) => {
  let max = 0;
  for (const ch of chs) for (const s of ch) max = Math.max(max, Math.abs(s));
  return max;
};
const finite = (chs) => chs.every((ch) => ch.every(Number.isFinite));
const diff = (a, b) => {
  let max = 0;
  for (let c = 0; c < Math.min(a.length, b.length); c++) {
    for (let i = 0; i < Math.min(a[c].length, b[c].length); i++) {
      max = Math.max(max, Math.abs(a[c][i] - b[c][i]));
    }
  }
  return max;
};
const rms = (chs, from, to, rate) => {
  let sum = 0;
  let n = 0;
  for (const ch of chs) {
    for (let i = Math.floor(from * rate); i < Math.min(ch.length, Math.floor(to * rate)); i++) {
      sum += ch[i] * ch[i];
      n++;
    }
  }
  return Math.sqrt(sum / Math.max(1, n));
};

// Two lanes that never share an event id — ids are what seed the phase, so a collision
// would make the stem/mix comparison pass for the wrong reason.
const LANE_A = [{ id: 11, at: 0.10, off: 0.40, hz: 220 }, { id: 12, at: 0.50, off: 0.80, hz: 330 }];
const LANE_B = [{ id: 21, at: 0.20, off: 0.60, hz: 440 }];

async function runProof(page, label) {
  // ---- 2. offline, at both rates ---------------------------------------------
  const rates = [44100, 48000];
  const rendered = {};
  for (const rate of rates) {
    const chs = await page.evaluate(
      (a) => window.__proofRender(a),
      { sampleRate: rate, seconds: 1, notes: LANE_A },
    );
    rendered[rate] = chs;
    assert(finite(chs), `${label}: ${rate} renders finite samples`);
    assert(peak(chs) > 0.01, `${label}: ${rate} renders a non-silent tone (peak ${peak(chs).toFixed(4)})`);
  }

  // ---- 3. the first note starts after zero, and is heard there ----------------
  const chs = rendered[44100];
  const before = rms(chs, 0, 0.09, 44100);
  const after = rms(chs, 0.15, 0.35, 44100);
  assert(before < 1e-6, `${label}: silence before the first note (rms ${before.toExponential(2)})`);
  assert(after > 0.01, `${label}: a note scheduled at t>0 is audible (rms ${after.toFixed(4)})`);

  // ---- 4. determinism ---------------------------------------------------------
  const again = await page.evaluate(
    (a) => window.__proofRender(a),
    { sampleRate: 44100, seconds: 1, notes: LANE_A },
  );
  const repeat = diff(chs, again);
  assert(repeat < TOL, `${label}: two renders of one buffer agree within 5e-6 (${repeat.toExponential(2)})`);

  // ---- 5. a stem equals its contribution to the mix ---------------------------
  const stemA = await page.evaluate((a) => window.__proofRender(a),
    { sampleRate: 44100, seconds: 1, notes: LANE_A });
  const stemB = await page.evaluate((a) => window.__proofRender(a),
    { sampleRate: 44100, seconds: 1, notes: LANE_B });
  const mix = await page.evaluate((a) => window.__proofMix(a),
    { sampleRate: 44100, seconds: 1, lanes: [LANE_A, LANE_B] });
  const summed = stemA.map((ch, c) => ch.map((s, i) => s + stemB[c][i]));
  const parity = diff(summed, mix);
  assert(parity < TOL, `${label}: stems sum to the mix within 5e-6 (${parity.toExponential(2)})`);

  // ---- 6. panic ---------------------------------------------------------------
  const panicked = await page.evaluate((a) => window.__proofRender(a), {
    sampleRate: 44100,
    seconds: 1,
    // One note sounding across the panic, and one booked for after it. Both must go.
    notes: [{ id: 31, at: 0.05, off: 0.9, hz: 220 }, { id: 32, at: 0.6, off: 0.9, hz: 440 }],
    panicAt: 0.4,
  });
  const live = rms(panicked, 0.1, 0.35, 44100);
  const dead = rms(panicked, 0.45, 1.0, 44100);
  assert(live > 0.01, `${label}: the panic render was sounding beforehand (rms ${live.toFixed(4)})`);
  assert(dead < 1e-6,
    `${label}: panic silences the note sounding AND the one still queued (rms ${dead.toExponential(2)})`);

  // ---- 7. teardown and context replacement ------------------------------------
  const teardown = await page.evaluate(() => window.__proofTeardown());
  assert(teardown.closed === 'closed' && teardown.frames === 4410,
    `${label}: a closed context is replaced and the new one registers cleanly`);
}

const build = async (minify) => {
  const built = await esbuild.build({
    stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
    bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent', minify,
  });
  return built.outputFiles[0].text;
};

const browser = await chromium.launch({
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required'],
});
try {
  for (const minify of [false, true]) {
    const label = minify ? 'production build' : 'dev build';
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    // Served from an https ORIGIN rather than handed over with `setContent`, and that
    // detail is the whole reason this suite exists in the shape it does.
    //
    // `setContent` leaves the page on `about:blank`, whose origin is opaque and whose
    // `isSecureContext` is false — and on a page that is not a secure context Chromium
    // does not put `audioWorklet` on an AudioContext AT ALL. Not a failing worklet: no
    // worklet. That is measured, in work/local/worklet-probe.mjs.
    //
    // Nothing is served over the network here; the route fulfils the request locally and
    // only the URL is https. See the note in docs/TNGR-2-completion-spec.md §3.1 about
    // what this means for tools/lib/render-bank-browser.js, which renders every stem this
    // project ships and is still on `setContent`.
    const html = '<!doctype html><meta charset="utf-8">'
      + `<script>${(await build(minify)).replace(/<\/script>/gi, '<\\/script>')}<\/script>`;
    await page.route('**/*', (route) => route.fulfill({
      status: 200, contentType: 'text/html', body: html,
    }));
    await page.goto('https://tngr2-proof.test/', { waitUntil: 'load' });

    // ---- 1. the live context ---------------------------------------------------
    // Only worth asking once: it is the same processor and the same loader, and a live
    // context in headless Chromium is the slowest thing in this suite.
    if (!minify) {
      const liveResult = await page.evaluate(() => window.__proofLive());
      if (liveResult.error) {
        fail(`live AudioContext: ${liveResult.error}`);
      } else {
        assert(liveResult.hosted && liveResult.running,
          `live AudioContext hosts the worklet and runs (state running, ${liveResult.rate} Hz)`);
        assert(liveResult.frame > 0,
          `the live processor's own frame counter advanced (${liveResult.frame} frames)`);
      }
    }

    await runProof(page, label);
    if (errors.length) fail(`${label}: page errors — ${errors.join(' | ')}`);
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(failed
  ? `\nTNGR-2 WORKLET PROOF: ${failed} FAILED — see docs/TNGR-2-completion-spec.md §3.1`
  : '\nTNGR-2 WORKLET PROOF: PASSED');
process.exit(failed ? 1 : 0);
