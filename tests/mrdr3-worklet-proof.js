/*
 * The MRDR-3 AudioWorklet proof gate — docs/MRDR-3-worklet-spec.md §11, Phase 1.
 *
 * The spec puts one question before all the synthesis work, and Phase 0 has already
 * answered the other one (is it worth it — work/local/mrdr3-phase0-verdict.md). This is
 * the mechanism question: can MRDR-3 host an AudioWorkletProcessor everywhere it needs
 * audio? Everything in Phases 2-6 is conditional on the answer, so it is measured here
 * rather than assumed, and this suite stays as a permanent regression once it passes.
 *
 * What is claimed, one assertion each:
 *
 *   1. a LIVE AudioContext registers the module, builds the node, and actually runs it
 *   2. a fresh OfflineAudioContext renders it non-silent and finite, at 44.1k AND 48k
 *   3. the first note starts strictly after time zero and is audible there
 *   4. rendering the same offline buffer twice matches EXACTLY
 *   5. a lane rendered alone equals its contribution to a mix
 *   6. panic silences sounding notes AND the events still queued behind them
 *   7. teardown: a closed context is replaced by a new one that registers cleanly
 *   8. the PRODUCTION bundle — minified, as shipped — does all of the above too
 *
 * And one MRDR-3 does not inherit from TNGR-2, because §5.1 calls it the structural
 * difference between the two engines:
 *
 *   9. a CHORD is one event that sounds several tones through one summing point, and
 *      that group survives as a unit — one note-off ends all of its tones, a panic takes
 *      the whole group, and a chord's tones do not start in phase with each other.
 *
 * A failure here is not a bug to work around. It stops Phase 2, and should be recorded
 * with browser, rate, build mode and which claim failed.
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const ENTRY = `
import {
  ensureMrdr3Proof, createMrdr3ProofNode, canHostMrdr3Proof, frameAt,
} from ${JSON.stringify(join(ROOT, 'src/engine/mrdr3/proof.js'))};

const chans = (buffer) => Array.from({ length: buffer.numberOfChannels },
  (_, c) => Array.from(buffer.getChannelData(c)));

// Seconds in, protocol events out — the conversion to integer frames happens here, at
// the controller boundary, exactly once. \`hz\` may be an array: a chord is ONE event.
const eventsFor = (notes, sampleRate, panicAt) => {
  const events = [];
  for (const note of notes) {
    events.push({
      type: 'noteOn', frame: frameAt(note.at, sampleRate),
      eventId: note.id, hz: note.hz, velocity: note.velocity ?? 1,
    });
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
  if (!canHostMrdr3Proof(ctx)) throw new Error('offline context cannot host a worklet');
  await ensureMrdr3Proof(ctx);
  // Handed over WITH the node. Port delivery is not ordered against startRendering()
  // and silently loses the schedule — see src/engine/mrdr3/proof.js.
  const node = createMrdr3ProofNode(ctx, { events: eventsFor(notes, sampleRate, panicAt) });
  node.connect(ctx.destination);
  return chans(await ctx.startRendering());
};

/** The same, with two independent nodes summed — a mix of two lanes. */
window.__proofMix = async ({ sampleRate = 44100, seconds = 1, lanes = [] }) => {
  const N = Math.ceil(seconds * sampleRate);
  const ctx = new OfflineAudioContext(2, N, sampleRate);
  await ensureMrdr3Proof(ctx);
  for (const notes of lanes) {
    createMrdr3ProofNode(ctx, { events: eventsFor(notes, sampleRate, null) })
      .connect(ctx.destination);
  }
  return chans(await ctx.startRendering());
};

/**
 * The live half. Headless Chromium has no speakers, so "did it play" is asked of the
 * processor itself: it is told to report, and the reply proves process() ran and the
 * frame counter advanced past where the note was scheduled.
 */
window.__proofLive = async () => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const out = { state: ctx.state, hosted: canHostMrdr3Proof(ctx) };
  try {
    await ctx.resume();
    await ensureMrdr3Proof(ctx);
    const node = createMrdr3ProofNode(ctx);
    // Not to the speakers: a gain of zero still runs the processor, and nothing about
    // this proof depends on the sound leaving the machine.
    const sink = ctx.createGain();
    sink.gain.value = 0;
    node.connect(sink); sink.connect(ctx.destination);
    const rate = ctx.sampleRate;
    node.port.postMessage({
      type: 'noteOn', frame: frameAt(ctx.currentTime + 0.02, rate),
      eventId: 1, hz: [220, 330], velocity: 1,
    });
    const health = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('the live processor never reported')), 4000);
      node.port.onmessage = (e) => {
        if (e.data?.type !== 'health') return;
        if (e.data.frame < frameAt(0.05, rate)) { node.port.postMessage({ type: 'report' }); return; }
        clearTimeout(timer);
        resolve(e.data);
      };
      node.port.postMessage({ type: 'report' });
    });
    out.running = ctx.state === 'running';
    out.frame = health.frame;
    out.groups = health.groups;
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
  await ensureMrdr3Proof(first);
  createMrdr3ProofNode(first).connect(first.destination);
  await first.startRendering();
  const live = new (window.AudioContext || window.webkitAudioContext)();
  await ensureMrdr3Proof(live);
  const node = createMrdr3ProofNode(live);
  node.connect(live.destination);
  node.port.postMessage({ type: 'stop' });
  await live.close();
  // A THIRD context, after one was closed: registration is per context, so a stale
  // module cache keyed on anything else would show up right here.
  const third = new OfflineAudioContext(2, 4410, 48000);
  await ensureMrdr3Proof(third);
  createMrdr3ProofNode(third).connect(third.destination);
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

// Two lanes that never share an event id — ids seed the phase, so a collision would make
// the stem/mix comparison pass for the wrong reason.
const LANE_A = [{ id: 11, at: 0.10, off: 0.40, hz: 220 }, { id: 12, at: 0.50, off: 0.80, hz: 330 }];
const LANE_B = [{ id: 21, at: 0.20, off: 0.60, hz: 440 }];

async function runProof(page, label) {
  // ---- 2. offline, at both rates ---------------------------------------------
  const rendered = {};
  for (const rate of [44100, 48000]) {
    const chs = await page.evaluate((a) => window.__proofRender(a),
      { sampleRate: rate, seconds: 1, notes: LANE_A });
    rendered[rate] = chs;
    assert(finite(chs), `${label}: ${rate} renders finite samples`);
    assert(peak(chs) > 0.01, `${label}: ${rate} renders a non-silent tone (peak ${peak(chs).toFixed(4)})`);
  }

  // ---- 3. the first note starts after zero, and is heard there ----------------
  const chs = rendered[44100];
  const before = rms(chs, 0, 0.09, 44100);
  const after = rms(chs, 0.15, 0.35, 44100);
  assert(before < 1e-9, `${label}: silence before the first note (rms ${before.toExponential(2)})`);
  assert(after > 0.01, `${label}: a note scheduled at t>0 is audible (rms ${after.toFixed(4)})`);

  // ---- 4. determinism, at ZERO tolerance --------------------------------------
  // The bar is EXACT rather than TNGR-2's 5e-6: one processor, one set of events, IEEE
  // arithmetic. Anything non-zero here means state is leaking between renders.
  const again = await page.evaluate((a) => window.__proofRender(a),
    { sampleRate: 44100, seconds: 1, notes: LANE_A });
  const repeat = diff(chs, again);
  assert(repeat === 0, `${label}: two renders of one buffer are sample-identical (${repeat})`);

  // ---- 5. a stem equals its contribution to the mix ---------------------------
  const stemA = await page.evaluate((a) => window.__proofRender(a),
    { sampleRate: 44100, seconds: 1, notes: LANE_A });
  const stemB = await page.evaluate((a) => window.__proofRender(a),
    { sampleRate: 44100, seconds: 1, notes: LANE_B });
  const mix = await page.evaluate((a) => window.__proofMix(a),
    { sampleRate: 44100, seconds: 1, lanes: [LANE_A, LANE_B] });
  const summed = stemA.map((ch, c) => ch.map((s, i) => s + stemB[c][i]));
  const parity = diff(summed, mix);
  assert(parity < 5e-7, `${label}: stems sum to the mix (${parity.toExponential(2)})`);

  // ---- 6. panic ---------------------------------------------------------------
  const panicked = await page.evaluate((a) => window.__proofRender(a), {
    sampleRate: 44100,
    seconds: 1,
    // One note sounding across the panic, one booked for after it, and a CHORD — a panic
    // that took tones one at a time would leave part of a chord ringing.
    notes: [{ id: 31, at: 0.05, off: 0.9, hz: [220, 277] }, { id: 32, at: 0.6, off: 0.9, hz: 440 }],
    panicAt: 0.4,
  });
  const live = rms(panicked, 0.1, 0.35, 44100);
  const dead = rms(panicked, 0.45, 1.0, 44100);
  assert(live > 0.01, `${label}: the panic render was sounding beforehand (rms ${live.toFixed(4)})`);
  assert(dead < 1e-9,
    `${label}: panic silences the chord sounding AND the note still queued (rms ${dead.toExponential(2)})`);

  // ---- 9. the note GROUP, which is MRDR-3's own structural claim ---------------
  //
  // §5.1: a chord is one event whose tones sum into one shaper. Three things follow, and
  // none of them is true of a per-note allocator: one note-off ends every tone; the group
  // is louder than one tone but not three times as loud (the tones share the event's
  // level); and the tones do not start in phase, because the seed carries the tone index.
  const chordId = 41;
  const chord = await page.evaluate((a) => window.__proofRender(a), {
    sampleRate: 44100, seconds: 1, notes: [{ id: chordId, at: 0.1, off: 0.5, hz: [220, 277.18, 330] }],
  });
  const single = await page.evaluate((a) => window.__proofRender(a), {
    sampleRate: 44100, seconds: 1, notes: [{ id: chordId, at: 0.1, off: 0.5, hz: 220 }],
  });
  const chordOn = rms(chord, 0.15, 0.45, 44100);
  const chordOff = rms(chord, 0.55, 1.0, 44100);
  assert(chordOn > 0.01 && chordOff < 1e-9,
    `${label}: ONE note-off ends every tone of a chord (on ${chordOn.toFixed(4)}, after ${chordOff.toExponential(2)})`);
  const oneOn = rms(single, 0.15, 0.45, 44100);
  // Three incoherent tones at one level sum to about sqrt(3) times one of them. The
  // bracket is deliberately wide: what is being proved is that a chord is LOUDER than one
  // note and not three times louder — i.e. that the tones are summing, not replacing each
  // other and not being attenuated by chord width, which `_playLayer` does not do.
  assert(chordOn > oneOn * 1.3 && chordOn < oneOn * 2.5,
    `${label}: a chord's tones sum at one point (${oneOn.toFixed(4)} -> ${chordOn.toFixed(4)}, ~sqrt(3)x)`);
  // Three tones summed at one point, all starting at phase 0, would peak at exactly the
  // sum of their amplitudes on the first sample. Seeding on the tone index is what stops
  // a chord being one loud click.
  const firstSample = Math.abs(chord[0][Math.round(0.1 * 44100)]);
  assert(firstSample < 0.2,
    `${label}: a chord's tones do not start in phase with each other (${firstSample.toFixed(4)})`);

  // ---- 7. teardown and context replacement ------------------------------------
  const teardown = await page.evaluate(() => window.__proofTeardown());
  assert(teardown.closed === 'closed' && teardown.frames === 4410,
    `${label}: a closed context is replaced and the new one registers cleanly`);
}

const build = async (minify) => (await esbuild.build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
  bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent', minify,
})).outputFiles[0].text;

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
    // Served from an https ORIGIN rather than handed over with `setContent`: on a page
    // that is not a secure context Chromium does not put `audioWorklet` on an
    // AudioContext AT ALL. Not a failing worklet — no worklet. Nothing is served over the
    // network; the route fulfils locally and only the URL is https.
    const html = '<!doctype html><meta charset="utf-8">'
      + `<script>${(await build(minify)).replace(/<\/script>/gi, '<\\/script>')}<\/script>`;
    await page.route('**/*', (route) => route.fulfill({
      status: 200, contentType: 'text/html', body: html,
    }));
    await page.goto('https://mrdr3-proof.test/', { waitUntil: 'load' });

    // ---- 1. the live context ---------------------------------------------------
    // Only worth asking once: the same processor, the same loader, and a live context in
    // headless Chromium is the slowest thing in this suite.
    if (!minify) {
      const liveResult = await page.evaluate(() => window.__proofLive());
      if (liveResult.error) {
        fail(`live AudioContext: ${liveResult.error}`);
      } else {
        assert(liveResult.hosted && liveResult.running,
          `live AudioContext hosts the worklet and runs (state running, ${liveResult.rate} Hz)`);
        assert(liveResult.frame > 0,
          `the live processor's own frame counter advanced (${liveResult.frame} frames)`);
        assert(liveResult.groups === 1,
          `a live chord posted to the port became ONE sounding group (${liveResult.groups})`);
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
  ? `\nMRDR-3 WORKLET PROOF: ${failed} FAILED — Phase 2 does not start (docs/MRDR-3-worklet-spec.md §12)`
  : '\nMRDR-3 WORKLET PROOF: PASSED');
process.exit(failed ? 1 : 0);
