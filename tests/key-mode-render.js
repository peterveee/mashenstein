/**
 * KEY MODE and GLIDE sound the same on every synth.
 *
 * tests/key-mode.js pins the vocabulary and tests/held-keys.js the keys still down; this
 * is the rest of the rule, rendered, on every pitched synth in the rack:
 *
 *   · MONO glides into a note that starts while the one before is still GATED — its
 *     drawn length not over, or its key still down — and strikes it in full;
 *   · LEGATO glides the same way and does NOT strike again;
 *   · after a rest neither glides, even with the last note's release still ringing,
 *     and a key coming up is a rest: its gate ends when the finger lifts.
 *
 * Every claim is a comparison between two renders that differ in one setting — GLIDE on
 * against GLIDE off, LEGATO against MONO — so it holds whatever each synth sounds like.
 * Different means audibly different in the window after the second note; the same means
 * the same samples.
 *
 * The pooled classes, MRDR-3 native, JMJR-4, KNDO-5 and WNDR-9 render through the real
 * VoiceRack in Chromium. TNGR-2 and MRDR-3 AW are worklets, so their cores render the
 * same events browserlessly — the string the worklet runs.
 *
 *   node tests/key-mode-render.js
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VOICES } from '../src/data/voices.js';
import { renderTngr2, frameAt as tngrFrame, TNGR2_DEFAULT_ENV } from '../src/engine/tngr2/dsp.js';
import { packTngr2Tables } from '../src/engine/tngr2/tables.js';
import { compileMrdr3, mrdr3Colours } from '../src/engine/mrdr3/compile.js';
import { renderMrdr3, frameAt as mrdrFrame } from '../src/engine/mrdr3/dsp.js';
import { mrdr3Tables } from '../src/engine/mrdr3/tables.js';
import { mrdr3NoiseSet } from '../src/engine/mrdr3/noise.js';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg));

const RATE = 44100;
const C = 261.63;
const E = 329.63;
const GLIDE = 0.3;
// A long attack, so a strike is unmistakable against a note taken over; a sustain under
// full, because the pooled classes restrike MONO from wherever the envelope stands (a
// patch AT full sustain has nothing to rise to there); a long release, so a rest still has
// the last note ringing through it — the case a glide must ignore.
const ENV = { attack: 0.15, decay: 0.1, sustain: 0.6, release: 0.5 };

const diff = (a, b, t0, t1) => {
  let s = 0; let n = 0;
  for (let i = Math.floor(t0 * RATE); i < Math.floor(t1 * RATE); i++) { s += (a[i] - b[i]) ** 2; n++; }
  return Math.sqrt(s / Math.max(1, n));
};
const rms = (a, t0, t1) => {
  let s = 0; let n = 0;
  for (let i = Math.floor(t0 * RATE); i < Math.floor(t1 * RATE); i++) { s += a[i] * a[i]; n++; }
  return Math.sqrt(s / Math.max(1, n));
};
const DIFFERENT = 1e-3;
const SAME = 1e-5;

/**
 * The claims, on one synth. `render(mode, glide, scenario)` returns channel 0.
 *
 *   overlap  C from 0.05 for 0.6 s, E from 0.5          — sequenced, gated
 *   rest     C from 0.05 for 0.3 s, E from 0.6          — sequenced, C ringing out
 *   held     C held from 0.05, E held from 0.5          — both keys down
 *   lifted   C held from 0.05 and let go at 0.35, E held from 0.6
 *   single   C from 0.05 for 0.6 s, and nothing after it
 */
async function claims(name, render) {
  const r = async (mode, glide, sc) => render(mode, glide, sc);
  for (const mode of ['mono', 'legato']) {
    const g = await r(mode, GLIDE, 'overlap');
    const n = await r(mode, 0, 'overlap');
    assert(diff(g, n, 0.05, 0.45) < SAME, `${name} ${mode}: the first note is the same with GLIDE on or off`);
    const d = diff(g, n, 0.52, 0.75);
    assert(d > DIFFERENT, `${name} ${mode}: GLIDE slides into an overlapping note (${d.toExponential(1)})`);
    const gr = await r(mode, GLIDE, 'rest');
    const nr = await r(mode, 0, 'rest');
    const dr = diff(gr, nr, 0.6, 0.9);
    assert(dr < SAME, `${name} ${mode}: no glide after a rest, with the last note still ringing out (${dr.toExponential(1)})`);
    if (render.held) {
      const gh = await r(mode, GLIDE, 'held');
      const nh = await r(mode, 0, 'held');
      const dh = diff(gh, nh, 0.52, 0.75);
      assert(dh > DIFFERENT, `${name} ${mode}: GLIDE slides between two keys held down (${dh.toExponential(1)})`);
      const gl = await r(mode, GLIDE, 'lifted');
      const nl = await r(mode, 0, 'lifted');
      const dl = diff(gl, nl, 0.6, 0.9);
      assert(dl < SAME, `${name} ${mode}: a key let go is a rest — no glide into the next (${dl.toExponential(1)})`);
    }
  }
  const lo = await r('legato', 0, 'overlap');
  const mo = await r('mono', 0, 'overlap');
  const dm = diff(lo, mo, 0.5, 0.7);
  assert(dm > DIFFERENT, `${name}: LEGATO takes the note over where MONO strikes it again (${dm.toExponential(1)})`);
  // The note BEFORE a handover is the note it was until the handover: a choke or a
  // legato handoff that faded it from its own onset is the failure this pins.
  const alone = await r('mono', 0, 'single');
  const dl = diff(lo, alone, 0.05, 0.49);
  const dmo = diff(mo, alone, 0.05, 0.49);
  assert(dl < SAME, `${name}: LEGATO leaves the note before it untouched until the handover (${dl.toExponential(1)})`);
  assert(dmo < SAME, `${name}: MONO leaves the note before it untouched until the choke (${dmo.toExponential(1)})`);
  // ...and LEGATO carries the level on: it does not fade the note it took over.
  const before = rms(lo, 0.35, 0.45);
  const after = rms(lo, 0.85, 0.95);
  assert(after > before * 0.4, `${name}: LEGATO holds its level across the handover (${before.toFixed(3)} → ${after.toFixed(3)})`);
}

// ---- TNGR-2, browserless ------------------------------------------------------------
{
  const tables = packTngr2Tables(['basic']);
  const on = (at, hz, id) => ({ type: 'noteOn', frame: tngrFrame(at, RATE), hz, velocity: 1, eventId: id });
  const off = (at, id) => ({ type: 'noteOff', frame: tngrFrame(at, RATE), eventId: id });
  const SCENES = {
    overlap: [on(0.05, C, 1), off(0.65, 1), on(0.5, E, 2), off(1.0, 2)],
    rest: [on(0.05, C, 1), off(0.35, 1), on(0.6, E, 2), off(1.1, 2)],
    held: [on(0.05, C, 1), on(0.5, E, 2)],
    lifted: [on(0.05, C, 1), off(0.35, 1), on(0.6, E, 2)],
    single: [on(0.05, C, 1), off(0.65, 1)],
  };
  const render = (mode, glide, sc) => renderTngr2({
    tables, sampleRate: RATE, seconds: 1.5,
    patch: { mode, glide, amp: { ...TNGR2_DEFAULT_ENV, ...ENV }, filter: { cutoff: 8000 },
      oscA: { table: 'basic', position: 0.25, level: 1, unison: 1 } },
    events: [...SCENES[sc]].sort((a, b) => a.frame - b.frame),
  }).channels[0];
  render.held = true;
  await claims('TNGR-2', render);
}

// ---- MRDR-3 AW, browserless ---------------------------------------------------------
{
  const tables = mrdr3Tables();
  const noise = mrdr3NoiseSet(RATE, mrdr3Colours(VOICES));
  const HOLD = 30;
  const on = (at, hz, id, secs) => ({
    type: 'noteOn', frame: mrdrFrame(at, RATE), eventId: id, hz: [hz],
    durFrames: mrdrFrame(secs, RATE), velocity: 1,
  });
  const off = (at, id) => ({ type: 'noteOff', frame: mrdrFrame(at, RATE), eventId: id });
  const SCENES = {
    overlap: [on(0.05, C, 1, 0.6), on(0.5, E, 2, 0.5)],
    rest: [on(0.05, C, 1, 0.3), on(0.6, E, 2, 0.5)],
    held: [on(0.05, C, 1, HOLD), on(0.5, E, 2, HOLD)],
    lifted: [on(0.05, C, 1, HOLD), off(0.35, 1), on(0.6, E, 2, HOLD)],
    single: [on(0.05, C, 1, 0.6)],
  };
  const render = (mode, glide, sc) => {
    const { patch } = compileMrdr3({
      id: 'kmAw', synth: 'MRDR-3', mode, portamento: glide,
      layer: { osc1: { type: 'square', ratio: 1, detune: 0, gain: 0.6, ...ENV } },
    });
    return renderMrdr3({
      events: [...SCENES[sc]].sort((a, b) => a.frame - b.frame),
      seconds: 1.5, sampleRate: RATE, channels: 2, patch, tables, noise,
    }).channels[0];
  };
  render.held = true;
  await claims('MRDR-3 AW', render);
}

// ---- every other synth, through the rack, in Chromium -------------------------------
const PRESETS = {
  'CRLS-1': { synth: 'CRLS-1', options: { oscillator: { type: 'square' }, envelope: { ...ENV } } },
  'RMND-2': { synth: 'RMND-2', options: { harmonicity: 2, modulationIndex: 2,
    oscillator: { type: 'sine' }, modulation: { type: 'sine' }, envelope: { ...ENV },
    modulationEnvelope: { ...ENV } } },
  'MRDR-3': { synth: 'MRDR-3', layer: { osc1: { type: 'square', ratio: 1, detune: 0, gain: 0.6, ...ENV } } },
  'JMJR-4': { synth: 'JMJR-4', jmjr4: { voice: 'announcer', line: 'aah', unison: 1, jitter: 0, flutter: 0, amp: { ...ENV } } },
  'KNDO-5': { synth: 'KNDO-5', waveform: 'square', attack: ENV.attack, release: ENV.release },
  'WNDR-9': { synth: 'WNDR-9', additive: { bars: [0, 0, 1, 0.5], ...ENV } },
};

const ENTRY = `
import { VoiceRack } from ${JSON.stringify(join(ROOT, 'src/engine/voices.js'))};
import { VOICES } from ${JSON.stringify(join(ROOT, 'src/data/voices.js'))};
let seq = 0;
window.__render = async ({ preset, mode, glide, sc, rate, C, E }) => {
  const id = '__km' + (seq++);
  VOICES[id] = { ...JSON.parse(JSON.stringify(preset)), id, mode, portamento: glide, dur: 1 };
  const ctx = new OfflineAudioContext(1, Math.ceil(rate * 1.5), rate);
  const rack = new VoiceRack(ctx);
  const dry = ctx.createGain(); dry.connect(ctx.destination);
  const play = (hz, at, dur, hold) => rack.play('lead', id, hz, {
    time: at, dur, gain: 0.5, dry, wet: null, echo: false, preview: hold, hold, step: 0 });
  let lift = null;
  if (sc === 'overlap') { play(C, 0.05, 0.6, false); play(E, 0.5, 0.5, false); }
  else if (sc === 'rest') { play(C, 0.05, 0.3, false); play(E, 0.6, 0.5, false); }
  else if (sc === 'held') { play(C, 0.05, 2, true); play(E, 0.5, 2, true); }
  else if (sc === 'lifted') { play(C, 0.05, 2, true); lift = 0.35; }
  else if (sc === 'single') { play(C, 0.05, 0.6, false); }
  // A key comes up, and the next goes down, from inside the render — the only place a
  // note-off has a real currentTime. See tests/held-keys.js.
  const reached = lift != null ? ctx.suspend(lift) : null;
  const rendering = ctx.startRendering();
  if (reached) {
    await reached;
    rack.releasePreview('lead', C);
    play(E, 0.6, 2, true);
    ctx.resume();
  }
  return Array.from((await rendering).getChannelData(0));
};
`;

let chromium; let esbuild;
try { ({ chromium } = require('playwright')); esbuild = require('esbuild'); } catch {
  console.log('note: playwright or esbuild not installed, the rack half is skipped');
}
if (chromium) {
  const built = await esbuild.build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
    bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent' });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setContent('<!doctype html><meta charset="utf-8">'
      + `<script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}<\/script>`, { waitUntil: 'load' });
    for (const [name, preset] of Object.entries(PRESETS)) {
      const render = (mode, glide, sc) => page.evaluate((a) => window.__render(a),
        { preset, mode, glide, sc, rate: RATE, C, E });
      render.held = true;
      await claims(name, render);
    }
    assert(errors.length === 0, `no page errors (${errors.join(' | ')})`);
  } finally {
    await browser.close();
  }
}

console.log(failed ? `\nKEY MODE RENDER: ${failed} FAILED` : '\nKEY MODE RENDER: PASSED');
process.exit(failed ? 1 : 0);
