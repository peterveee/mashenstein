/*
 * The lane controller — docs/MRDR-3-worklet-spec.md §6.
 *
 * One persistent node per {context, lane}, notes as messages, and the two delivery paths
 * that TNGR-2's proof gate showed are not interchangeable. What is asserted here is the
 * LIFECYCLE rather than the sound: the sound is held by mrdr3-dsp-parity.js and the oracle.
 *
 * The claims:
 *   1. a lane is built once per key and REUSED — not one node per note or per preset
 *   2. a patch edit reaches a standing lane as a message, without rebuilding the node
 *   3. a chord is ONE message with one event id, because its tones share a note group
 *   4. offline lanes take their whole schedule at construction and render non-silent
 *   5. panic clears what is sounding AND what is queued behind it
 *   6. teardown releases nodes and ports, per lane and per context
 *   7. a context that cannot host a worklet says so rather than throwing mid-schedule
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const ENTRY = `
import {
  mrdr3Lane, mrdr3LaneNow, mrdr3NoteOn, mrdr3NoteOff, mrdr3Panic, mrdr3Health,
  syncMrdr3Patch, releaseMrdr3Lane, releaseMrdr3Context, mrdr3ControllerHealth,
  renderMrdr3Lane, canHostMrdr3, frameAt,
} from ${JSON.stringify(join(ROOT, 'src/engine/mrdr3/controller.js'))};
import { setMrdrComparisonBackend, mrdrComparisonVoice } from ${JSON.stringify(join(ROOT, 'src/engine/mrdr3/identity.js'))};
import { VOICES } from ${JSON.stringify(join(ROOT, 'src/data/voices.js'))};

const SR = 44100;
const live = () => new (window.AudioContext || window.webkitAudioContext)();

/**
 * The path the DESK's switch actually takes.
 *
 * 'mrdr3.worklet()' substitutes the voice with one carrying the AW identity, and every
 * step after that has to accept it. It did not: the compile step demanded the native name,
 * so the lane came back null and every note was dropped — every MRDR-3 lane silent, with
 * nothing in the console to say why. The lifecycle test missed it because it hands the
 * controller a NATIVE voice directly, which is not what the switch does.
 */
window.__viaOverride = async () => {
  const ctx = new OfflineAudioContext(2, Math.ceil(0.8 * SR), SR);
  setMrdrComparisonBackend('worklet');
  const voice = mrdrComparisonVoice(VOICES.initSaw);
  const forced = voice.synth;
  const events = [{
    type: 'noteOn', frame: frameAt(0.05, SR), eventId: 1,
    hz: [220, 330], durFrames: frameAt(0.5, SR), velocity: 0.8,
  }];
  const node = await renderMrdr3Lane(ctx, {
    voice, voices: VOICES, events, destination: ctx.destination,
  });
  setMrdrComparisonBackend(null);
  if (!node) return { forced, built: false, rms: 0 };
  const r = await ctx.startRendering();
  const d = r.getChannelData(0);
  let s2 = 0;
  for (let i = Math.floor(0.1 * SR); i < Math.floor(0.4 * SR); i++) s2 += d[i] * d[i];
  return { forced, built: true, rms: Math.sqrt(s2 / (0.3 * SR)) };
};

window.__lifecycle = async () => {
  const ctx = live();
  const out = { hosted: canHostMrdr3(ctx) };
  try {
    await ctx.resume();
    const a = await mrdr3Lane(ctx, 'bass', { voice: VOICES.initSaw, voices: VOICES });
    const b = await mrdr3Lane(ctx, 'bass', { voice: VOICES.initSaw, voices: VOICES });
    out.reusedSameKey = a === b;
    const c = await mrdr3Lane(ctx, 'lead', { voice: VOICES.initSaw, voices: VOICES });
    out.separateKeys = c !== a;
    out.lanes = mrdr3ControllerHealth(ctx).lanes;
    // A patch EDIT is a message, and the node survives it.
    const before = a.node;
    const moved = syncMrdr3Patch(a, { ...VOICES.initSaw, drive: 0.4, shape: 'soft' });
    out.editReached = moved;
    out.nodeSurvivedEdit = a.node === before;
    out.editIsIdempotent = !syncMrdr3Patch(a, { ...VOICES.initSaw, drive: 0.4, shape: 'soft' });
    // A chord is ONE message with one id.
    const sink = ctx.createGain(); sink.gain.value = 0;
    a.node.connect(sink); sink.connect(ctx.destination);
    mrdr3NoteOn(a, { at: ctx.currentTime + 0.05, hz: [220, 277.18, 330], durSeconds: 0.6, velocity: 0.8, eventId: 7 });
    // POLL, do not snapshot. The note is scheduled ahead — that is the whole point of a
    // lookahead — so asking immediately reports what is sounding NOW, which is nothing.
    // Wait for the processor to reach the note rather than racing it.
    let h = null;
    for (let i = 0; i < 40; i++) {
      h = await mrdr3Health(a, 2000);
      if (h && h.groups > 0) break;
      await new Promise((r) => setTimeout(r, 25));
    }
    out.health = h;
    out.lookup = mrdr3LaneNow(ctx, 'bass') === a;
    out.released = releaseMrdr3Lane(ctx, 'bass');
    out.afterRelease = mrdr3LaneNow(ctx, 'bass') === null;
    out.contextReleased = releaseMrdr3Context(ctx);
  } catch (err) {
    out.error = String(err && err.message ? err.message : err);
  } finally {
    await ctx.close();
  }
  return out;
};

/** Offline: the whole schedule at construction, which is the only delivery that works. */
window.__offline = async ({ panicAt = null } = {}) => {
  const ctx = new OfflineAudioContext(2, Math.ceil(1.2 * SR), SR);
  const events = [
    { type: 'noteOn', frame: frameAt(0.05, SR), eventId: 1, hz: [220, 277.18], durFrames: frameAt(0.9, SR), velocity: 0.8 },
    { type: 'noteOn', frame: frameAt(0.60, SR), eventId: 2, hz: 440, durFrames: frameAt(0.4, SR), velocity: 0.7 },
  ];
  if (panicAt != null) events.push({ type: 'panic', frame: frameAt(panicAt, SR) });
  await renderMrdr3Lane(ctx, {
    voice: VOICES.initSaw, voices: VOICES, events, destination: ctx.destination,
  });
  const r = await ctx.startRendering();
  const d = r.getChannelData(0);
  const rms = (from, to) => {
    let s = 0; let n = 0;
    for (let i = Math.floor(from * SR); i < Math.min(d.length, Math.floor(to * SR)); i++) { s += d[i] * d[i]; n++; }
    return Math.sqrt(s / Math.max(1, n));
  };
  return { before: rms(0, 0.04), during: rms(0.1, 0.3), after: rms(0.75, 1.2) };
};
`;

const { chromium } = require('playwright');
const esbuild = require('esbuild');

let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg));

const built = await esbuild.build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
  bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
});
const html = '<!doctype html><meta charset="utf-8">'
  + `<script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}<\/script>`;

const browser = await chromium.launch({
  headless: true, args: ['--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => fail(`page error: ${e.message}`));
await page.route('**/*', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: html }));
await page.goto('https://mrdr3-controller.test/', { waitUntil: 'load' });

const life = await page.evaluate(() => window.__lifecycle());
if (life.error) {
  fail(`live lifecycle: ${life.error}`);
} else {
  assert(life.hosted, 'a live AudioContext can host the lane');
  assert(life.reusedSameKey, 'one node per LANE — the same key returns the same lane');
  assert(life.separateKeys && life.lanes === 2, 'and a different lane is a different node');
  assert(life.editReached && life.nodeSurvivedEdit,
    'a patch edit reaches a standing lane as a MESSAGE, without rebuilding the node');
  assert(life.editIsIdempotent, 'and an edit that changes nothing sends nothing');
  assert(life.health && life.health.groups === 1,
    `a chord is ONE note group, not one per tone (${life.health?.groups})`);
  assert(life.lookup, 'a lane can be found again without awaiting, for a scheduler');
  assert(life.released && life.afterRelease, 'releasing a lane removes it');
  assert(life.contextReleased === 1, 'and releasing the context takes the rest');
}

const via = await page.evaluate(() => window.__viaOverride());
assert(via.forced === 'MRDR-3 AW', `the override really substitutes the identity (${via.forced})`);
assert(via.built, 'a voice carrying the AW identity builds a lane — one canonical payload, §9.1');
assert(via.rms > 0.01, `and it SOUNDS (${via.rms.toFixed(4)}) — the path the desk switch takes`);

const off = await page.evaluate(() => window.__offline());
assert(off.before < 1e-6, `silence before the first note (${off.before.toExponential(2)})`);
assert(off.during > 0.01, `an offline lane takes its schedule at construction and sounds (${off.during.toFixed(4)})`);

const panicked = await page.evaluate(() => window.__offline({ panicAt: 0.4 }));
assert(panicked.during > 0.01, 'the panic render was sounding beforehand');
assert(panicked.after < 1e-6,
  `panic clears the chord sounding AND the note still queued (${panicked.after.toExponential(2)})`);

await browser.close();
console.log(failed ? `\nMRDR-3 CONTROLLER: ${failed} FAILED` : '\nMRDR-3 CONTROLLER: OK');
process.exit(failed ? 1 : 0);
